const { VertexAI } = require("@google-cloud/vertexai");

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID,
  location: "us-central1",
});

const generativeModel = vertexAI.getGenerativeModel({
  model: "gemini-2.5-pro",
});

async function parseOrderText(text) {
  try {
    console.log("Parsing text:", text); // Debug log
    const prompt = `
      Extract the restaurant name and a list of all food items with their quantities from the following text.
      Return the data in the specified JSON format.

      Text: "${text}"
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
      // Removed generationConfig to test natural function calling
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

async function resolveMenuItems(parsedOrder, menuItems) {
  try {
    console.log("Resolving menu items for:", JSON.stringify(parsedOrder));
    const prompt = `
You are a food ordering assistant that matches customer requests to exact menu items. Your goal is to be helpful but not presumptuous.

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
- Ignore size descriptors if all options are the same price
- Match common food terms intelligently (e.g., "nuggets" = "Chicken McNuggets")

CONFIDENCE RULES:
- Confident: Customer says "Big Mac" and only one Big Mac exists
- Clarification: Customer says "Big Mac" but both "Big Mac" and "Big Mac Meal" exist
- Clarification: Customer says "Coke" but multiple Coke types exist
- Not Found: Customer requests something not on the menu

Return matches in the specified JSON format, focusing on what the customer actually said vs what's available.
`;

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

    console.log("Request:", JSON.stringify(request));
    const result = await generativeModel.generateContent(request);
    console.log("Raw result:", JSON.stringify(result.response, null, 2));

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
