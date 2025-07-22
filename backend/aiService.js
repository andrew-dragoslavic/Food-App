const { VertexAI } = require("@google-cloud/vertexai")

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID,
  location: 'us-central1',
});

const generativeModel = vertexAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
  generationConfig: {
    // Ensure the model returns only JSON
    responseMimeType: 'application/json',
  }
});

async function parseOrderText(text) {
  try {
    const prompt = `
      Extract the restaurant name and a list of all food items with their quantities from the following text.
      Return the data in the specified JSON format.

      Text: "${text}"
    `;
    
    // This new schema supports an array of items
    const jsonSchema = {
      type: 'object',
      properties: {
        restaurant: {
          type: 'string',
          description: 'The name of the restaurant.',
        },
        items: {
          type: 'array',
          description: 'A list of all food items ordered.',
          items: {
            type: 'object',
            properties: {
              item: {
                type: 'string',
                description: 'The name of the food item.',
              },
              quantity: {
                type: 'number',
                description: 'The quantity of the food item.',
              },
            },
            required: ['item', 'quantity'],
          },
        },
      },
      required: ['restaurant', 'items'],
    };

    const request = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{
        functionDeclarations: [{
          name: 'extract_order_details',
          description: 'Extracts restaurant and a list of item details from a text order.',
          parameters: jsonSchema,
        }]
      }]
    };

    const result = await generativeModel.generateContent(request);
    const functionCall = result.response.candidates[0].content.parts[0].functionCall;
    
    if (functionCall && functionCall.name === 'extract_order_details') {
      console.log('Successfully parsed by AI:', functionCall.args);
      return functionCall.args;
    } else {
      console.error('AI did not return the expected JSON structure.');
      return { restaurant: null, items: [] };
    }

  } catch (error) {
    console.error('AI parsing error:', error);
    return { restaurant: null, items: [] };
  }
}

module.exports = { parseOrderText };