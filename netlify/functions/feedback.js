// This file runs on NETLIFY'S SERVER — not in the browser.
// The API key is safe here.
 
export const handler = async function(event) {
 
  // ── 1. Handle the browser's preflight "can I send data?" check ──
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
      body: "",
    };
  }
 
  // ── 2. Reject anything that is not a POST request ──────────────
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }
 
  // ── 3. Unpack the data sent from the frontend ──────────────────
  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }
 
  const { systemPrompt, userMessage, max_tokens = 350 } = body;
 
  if (!systemPrompt || !userMessage) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing systemPrompt or userMessage" }),
    };
  }
 
  // ── 4. Call the AI — API key comes from the environment ─────────
  //    process.env.GROQ_API_KEY reads the value you set in
  //    Netlify's dashboard (or .env locally). Never hardcode it here.
  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          model:      process.env.AI_MODEL || "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user",   content: userMessage  },
          ],
          max_tokens,
          temperature: 0.75,
        }),
      }
    );
 
    // ── 5. If the AI service returned an error, pass it back ──────
    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: "AI service error", detail: errText }),
      };
    }
 
    // ── 6. Send the AI reply back to the browser ──────────────────
    const data = await response.json();
    return {
      statusCode: 200,
      headers: {
        "Content-Type":                "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
 
  } catch (err) {
    console.error("feedback.js error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
