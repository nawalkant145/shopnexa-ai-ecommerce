export async function getAIRecommendation(userPrompt, products) {
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    return {
      success: false,
      message: "GEMINI_API_KEY is not configured in server config environment.",
      products: [],
    };
  }

  // Verified working 200 OK Flash models
  const candidateModels = [
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-3.5-flash",
    "gemini-3.6-flash",
  ];

  const geminiPrompt = `
You are an e-commerce assistant.
Here is a JSON list of available products in the store:
${JSON.stringify(
  products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    price: p.price,
  })),
  null,
  2
)}

User request: "${userPrompt}"

Task: Filter and select the products that best match the user's request.
Requirements:
1. Return ONLY a valid JSON array of matching product objects (or product IDs).
2. Do not include markdown formatting or extra text outside the JSON array.
  `;

  let lastError = null;

  for (const modelName of candidateModels) {
    const URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${API_KEY}`;
    try {
      const response = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }],
        }),
      });

      const data = await response.json();

      if (data.error) {
        lastError = data.error;
        console.warn(`Gemini Model [${modelName}] failed:`, data.error.message);
        if (data.error.status === "PERMISSION_DENIED" || data.error.code === 403) {
          return {
            success: false,
            message: "Gemini API key is invalid or has been revoked. Please update GEMINI_API_KEY in config.env.",
            products: [],
          };
        }
        continue;
      }

      const aiResponseText =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      const cleanedText = aiResponseText.replace(/```json|```/g, "").trim();

      if (!cleanedText) {
        continue;
      }

      let parsedData;
      try {
        parsedData = JSON.parse(cleanedText);
      } catch (error) {
        console.error("Failed to parse AI response JSON:", cleanedText);
        continue;
      }

      let recommendedProducts = [];
      if (Array.isArray(parsedData)) {
        recommendedProducts = parsedData;
      } else if (parsedData && Array.isArray(parsedData.products)) {
        recommendedProducts = parsedData.products;
      }

      const finalProducts = recommendedProducts.map((item) => {
        const targetId =
          typeof item === "string" || typeof item === "number" ? item : item.id;
        const original = products.find((p) => String(p.id) === String(targetId));
        return original || item;
      });

      return { success: true, products: finalProducts };
    } catch (err) {
      lastError = err;
      console.error(`Gemini fetch error on model [${modelName}]:`, err.message);
    }
  }

  return {
    success: false,
    message:
      lastError?.message ||
      "Unable to fetch AI recommendations. Please check GEMINI_API_KEY.",
    products: [],
  };
}