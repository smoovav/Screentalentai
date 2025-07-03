// netlify/functions/generate-image.js

// Import node-fetch for making HTTP requests in Node.js environment
// Note: @google/generative-ai SDK is not directly used for imagen-3.0-generate-002:predict
// as a direct fetch call is more appropriate for its specific API structure.
import fetch from 'node-fetch'; // Ensure node-fetch is imported for server-side fetch

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
        // Construct the API URL for Imagen 3.0
        const imagenApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${API_KEY}`;

        // Prepare the payload for the Imagen 3.0 API
        const payload = {
            instances: { prompt: prompt },
            parameters: { "sampleCount": 1 } // Request one image
        };

        // Make the direct fetch call to the Imagen 3.0 API
        const response = await fetch(imagenApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Imagen API Error Response:", JSON.stringify(errorData, null, 2));
            throw new Error(`Imagen API error: ${response.status} - ${errorData.error.message || 'Unknown error'}`);
        }

        const result = await response.json();

        // Correctly extract the base64 image data for imagen-3.0-generate-002
        // It's typically found in result.predictions[0].bytesBase64Encoded
        const imageData = result.predictions?.[0]?.bytesBase64Encoded;

        if (!imageData) {
            console.error("No image data received from Imagen API:", JSON.stringify(result, null, 2));
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "Failed to generate image: No image data returned from Imagen API." }),
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
        console.error("Error in Netlify function calling Imagen API:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: `Server error generating image: ${error.message}` }),
        };
    }
};
