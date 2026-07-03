// Analyzes a food photo via the Anthropic API.
// The API key lives only in Netlify's environment variables — never sent to the browser.
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY is not set in Netlify environment variables." })
    };
  }

  try {
    const { imageBase64, mediaType } = JSON.parse(event.body);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            {
              type: "text",
              text: "Identify the food/meal in this photo and estimate its nutrition. Reply with ONLY raw JSON, no markdown fences, no preamble, in this exact shape: {\"food\":\"short name of the dish/meal\",\"calories\":number,\"protein_g\":number,\"carbs_g\":number,\"fat_g\":number}. Base the estimate on a typical single serving as shown in the photo."
            }
          ]
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: data }) };
    }

    const textBlock = (data.content || []).find(b => b.type === "text");
    let raw = textBlock ? textBlock.text : "{}";
    raw = raw.replace(/```json|```/g, "").trim();

    // Validate it parses before returning
    JSON.parse(raw);

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: raw };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
