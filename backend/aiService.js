const { VertexAI } = require("@google-cloud/vertexai");

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID,
  location: "us-central1",
});

const generativeModel = vertexAI.getGenerativeModel({
  model: "gemini-2.5-pro",
});

async function parseOrderText(text, restaurant = null) {
  try {
    console.log("Parsing text:", text); // Debug log\
    if (restaurant) {
      restaurantInstruction = `The restaurant is ${restaurant}`;
    } else {
      restaurantInstruction = `If the restuarant is not mentioned use "Not Specified"`;
    }

    const prompt = `
      You MUST use the extract_order_details function to extract data from this text.
      Do NOT respond with questions or explanations.
      ${restaurantInstruction}

      CRITICAL PARSING RULES:
      1. If "X piece" or "X pc" appears, include it in item name, quantity = 1
        - "20 piece nuggets" → {item: "20 piece nuggets", quantity: 1}
        - "6 pc nuggets" → {item: "6 pc nuggets", quantity: 1}

      2. If number appears as part of official menu item name, include it in name
        - "2 Cheeseburger Meal" → {item: "2 Cheeseburger Meal", quantity: 1}
        - "2 Ranch Snack Wrap Meal" → {item: "2 Ranch Snack Wrap Meal", quantity: 1}

      3. If customer says "X orders of" or "X of the", use as quantity
        - "3 orders of Big Mac" → {item: "Big Mac", quantity: 3}
        - "2 of the 2 Cheeseburger Meal" → {item: "2 Cheeseburger Meal", quantity: 2}

      4. For standalone items with numbers, treat as quantity
        - "2 Big Macs" → {item: "Big Mac", quantity: 2}
        - "3 fries" → {item: "fries", quantity: 3}

      Text: "${text}"

      Use the extract_order_details function now.
      `;

    const jsonSchema = {
      type: "object",
      properties: {
        restaurant: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item: { type: "string" },
              quantity: { type: "number" },
            },
            required: ["item", "quantity"],
          },
        },
      },
      required: ["restaurant", "items"],
    };

    const request = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Add this section
        topP: 0.8,
        candidateCount: 1,
        maxOutputTokens: 1000,
      },
      tools: [
        {
          functionDeclarations: [
            {
              name: "extract_order_details",
              description:
                "Extracts restaurant and a list of item details from a text order.",
              parameters: jsonSchema,
            },
          ],
        },
      ],
    };

    console.log("Request:", JSON.stringify(request)); // Debug log
    const result = await generativeModel.generateContent(request);
    console.log("Raw result:", JSON.stringify(result.response, null, 2)); // Debug full response

    const candidate = result.response.candidates[0];
    if (candidate && candidate.content && candidate.content.parts) {
      const part = candidate.content.parts[0];
      if (
        part.functionCall &&
        part.functionCall.name === "extract_order_details"
      ) {
        console.log("Successfully parsed by AI:", part.functionCall.args);
        return part.functionCall.args;
      } else if (part.text) {
        try {
          const parsedData = JSON.parse(part.text);
          console.log("Parsed JSON from text:", parsedData);
          return parsedData;
        } catch (parseError) {
          console.error("Failed to parse JSON from text:", parseError);
          return { restaurant: null, items: [] };
        }
      }
    }
    console.error(
      "AI did not return the expected JSON structure:",
      result.response
    );
    return { restaurant: null, items: [] };
  } catch (error) {
    console.error("AI parsing error:", error);
    return { restaurant: null, items: [] };
  }
}

async function resolveMenuItems(
  parsedOrder,
  menuItems,
  previousPrediction = null
) {
  try {
    let prompt;

    if (previousPrediction) {
      // This is a clarification request
      prompt = `
    You are a food ordering assistant resolving clarifications for a previous order.

    PREVIOUS ORDER STATE:
    Confirmed items: ${JSON.stringify(
      previousPrediction.confident_matches || [],
      null,
      2
    )}
    Items needing clarification: ${JSON.stringify(
      previousPrediction.clarification_needed || [],
      null,
      2
    )}
    Items not found: ${JSON.stringify(
      previousPrediction.not_found || [],
      null,
      2
    )}

    CUSTOMER CLARIFICATION:
    ${JSON.stringify(parsedOrder, null, 2)}

    AVAILABLE MENU:
    ${menuItems
      .map((item, index) => `${index + 1}. ${item.name} - ${item.price}`)
      .join("\n")}

    CLARIFICATION RESOLUTION RULES:
    - Keep ALL confident_matches from the previous order unchanged
    - For each item in clarification_needed, check if the customer's new input resolves it
    - When customer specifies an exact menu item name and price, that resolves the clarification
    - When customer says "X instead of Y" or "X not Y", choose X and move to confident_matches
    - If customer mentions new items not in the original order, add them as new items
    - Only keep items in clarification_needed if they are still truly unclear

    SPECIFIC MATCHING:
    - If customer provides specific price that matches a menu item, use that exact match
    - Be aggressive about resolving clarifications when customer gives specific choices

    Return the updated order state with resolved items moved to confident_matches.`;
    } else {
      // This is a new order - use your existing prompt
      prompt = `
        You are a food ordering assistant that matches customer requests to exact menu items...
        CUSTOMER ORDER:
        ${JSON.stringify(parsedOrder, null, 2)}

        AVAILABLE MENU:
        ${menuItems
          .map((item, index) => `${index + 1}. ${item.name} - ${item.price}`)
          .join("\n")}

        MATCHING PRINCIPLES:
        - Only be confident when there's one clear, obvious match
        - When in doubt, ask for clarification rather than assuming
        - If multiple similar items exist (individual vs meal, different flavors, etc.), always clarify
        - EXCEPTION: If customer explicitly excludes an option, respect that exclusion
        - Ignore size descriptors if all options are the same price
        - Match common food terms intelligently

        CONFIDENCE RULES:
        - Confident: Customer requests item and only one match exists
        - Confident: Customer says "item X not the meal" - match the individual item, not the meal
        - Confident: Customer says "I want X not Y" - match X, exclude Y
        - Clarification: Customer requests item but multiple similar items exist
        - Clarification: Multiple options available without clear preference
        - Not Found: Customer requests something not on the menu

        EXCLUSION HANDLING:
        - Look for words like "not", "not the", "don't want", "without", "exclude"
        - When exclusions are present, remove excluded items from consideration
        - Be confident in matches when exclusions clearly indicate preference
        - If customer says "X not Y", confidently match X and exclude Y from consideration

        Return matches in the specified JSON format, focusing on what the customer actually said vs what's available.`;
    }

    const jsonSchema = {
      type: "object",
      properties: {
        confident_matches: {
          type: "array",
          items: {
            type: "object",
            properties: {
              requested_item: { type: "string" },
              quantity: { type: "number" },
              matched_menu_item: { type: "string" },
              price: { type: "string" },
              confidence_reason: { type: "string" },
            },
            required: [
              "requested_item",
              "quantity",
              "matched_menu_item",
              "price",
            ],
          },
        },
        clarification_needed: {
          type: "array",
          items: {
            type: "object",
            properties: {
              requested_item: { type: "string" },
              quantity: { type: "number" },
              possible_matches: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    menu_item: { type: "string" },
                    price: { type: "string" },
                  },
                },
              },
              clarification_question: { type: "string" },
            },
            required: [
              "requested_item",
              "quantity",
              "possible_matches",
              "clarification_question",
            ],
          },
        },
        not_found: {
          type: "array",
          items: {
            type: "object",
            properties: {
              requested_item: { type: "string" },
              quantity: { type: "number" },
              suggestion: { type: "string" },
            },
          },
        },
      },
      required: ["confident_matches", "clarification_needed", "not_found"],
    };

    const request = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Add this section
        topP: 0.8,
        candidateCount: 1,
        maxOutputTokens: 4000,
      },
      tools: [
        {
          functionDeclarations: [
            {
              name: "resolve_menu_items",
              description: "Matches customer order items to exact menu items",
              parameters: jsonSchema,
            },
          ],
        },
      ],
    };

    // console.log("Request:", JSON.stringify(request));
    const result = await generativeModel.generateContent(request);
    // console.log("Raw result:", JSON.stringify(result.response, null, 2));

    const candidate = result.response.candidates[0];
    if (candidate && candidate.content && candidate.content.parts) {
      const part = candidate.content.parts[0];
      if (
        part.functionCall &&
        part.functionCall.name === "resolve_menu_items"
      ) {
        console.log(
          "Menu resolution result:",
          JSON.stringify(part.functionCall.args, null, 2)
        );
        return part.functionCall.args;
      } else if (part.text) {
        try {
          const parsedData = JSON.parse(part.text);
          console.log("Parsed JSON from text:", parsedData);
          return parsedData;
        } catch (parseError) {
          console.error("Failed to parse JSON from text:", parseError);
          return {
            confident_matches: [],
            clarification_needed: [],
            not_found: [],
          };
        }
      }
    }
    console.error(
      "AI did not return expected menu resolution structure:",
      result.response
    );
    return { confident_matches: [], clarification_needed: [], not_found: [] };
  } catch (error) {
    console.error("Menu resolution error:", error);
    return { confident_matches: [], clarification_needed: [], not_found: [] };
  }
}

module.exports = { parseOrderText, resolveMenuItems };
