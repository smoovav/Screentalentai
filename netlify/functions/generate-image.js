// netlify/functions/generate-image.js

// Import the Google Generative AI SDK
import { GoogleGenerativeAI } from "@google/generative-ai";

// This is your serverless function handler
exports.handler = async function(event, context) {
    // Only allow POST requests for image generation
    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: "Method Not Allowed. Only POST requests are accepted." }),
        };
    }

    let requestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (e) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Invalid JSON in request body." }),
        };
    }

    const prompt = requestBody.prompt;

    if (!prompt) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "Prompt is required." }),
        };
    }

    // Retrieve the API Key securely from Netlify Environment Variables
    // IMPORTANT: This API_KEY must be set in your Netlify site settings!
    const API_KEY = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!API_KEY) {
        console.error("API Key is not set in Netlify environment variables!");
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Server configuration error: API Key missing." }),
        };
    }

    try {
        // Initialize the Generative AI client with your API Key
        const genAI = new GoogleGenerativeAI(API_KEY);

        // Access the Imagen 3.0 model
        // Note: The model name for image generation is typically 'imagen-3.0-generate-002'
        // or a similar image-specific model, not a text model like 'gemini-2.0-flash'.
        // We'll use the correct image generation model here.
        const model = genAI.getGenerativeModel({ model: "imagen-3.0-generate-002" });

        // Send the prompt to the AI model
        const result = await model.generateContent({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
                // You can add generation configuration here if needed,
                // e.g., safety settings, number of images, etc.
                // For image generation, 'sampleCount' is often used.
                // However, for simplicity and to avoid complex parsing, we'll request one image.
                // The prompt itself will guide the image generation.
            }
        });

        // Extract the image data (base64 encoded)
        // The structure for image generation results might differ slightly from text
        // Ensure you're accessing the correct part of the response for the image bytes
        const responseData = await result.response;
        const imageData = responseData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!imageData) {
            console.error("No image data received from API:", JSON.stringify(responseData, null, 2));
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Failed to generate image: No image data returned." }),
            };
        }

        // Return the base64 image data to your frontend
        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json", // Indicate JSON response
            },
            body: JSON.stringify({ imageData: imageData }),
        };

    } catch (error) {
        console.error("Error calling Google AI API:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Failed to generate image: ${error.message}` }),
        };
    }
};
