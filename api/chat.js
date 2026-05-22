const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!OPENROUTER_KEY) {
    return res.status(500).json({ error: "OpenRouter API key is not configured." });
  }

  const userMessage = req.body?.message;
  if (!userMessage) {
    return res.status(400).json({ error: "Missing message in request body." });
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-v4-flash:free",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant created by Krish Soni. If anyone asks who made you, who your owner is, or who invented you, say that Krish Soni created you. Reply in the same language that the user writes in."
          },
          { role: "user", content: userMessage }
        ]
      })
    });

    const rawText = await response.text();
    if (!response.ok) {
      return res.status(response.status).json({ error: rawText });
    }

    const data = JSON.parse(rawText);
    const reply = data?.choices?.[0]?.message?.content || "No response from AI";
    return res.status(200).json({ reply });
  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
};
