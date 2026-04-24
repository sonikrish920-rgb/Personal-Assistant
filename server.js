const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const app = express();

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
console.log("OPENROUTER_KEY LOADED:", Boolean(OPENROUTER_KEY));
if (!OPENROUTER_KEY) {
  console.warn("⚠️ OPENROUTER_API_KEY is not set. Please add it to .env or your environment.");
}

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/chat", async (req, res) => {
  try {
    console.log("🔥 /chat HIT");

    const userMessage = req.body.message;
    if (!userMessage) {
      return res.json({ reply: "Empty message" });
    }

    if (!OPENROUTER_KEY) {
      return res.status(500).json({ reply: "OpenRouter API key is not configured." });
    }

    console.log("Using OpenRouter URL:", OPENROUTER_URL);
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "tencent/hy3-preview:free",
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
    console.log("🧨 RAW OpenRouter RESPONSE ↓↓↓");
    console.log(rawText);

    if (!response.ok) {
      throw new Error(`OpenRouter API request failed (${response.status}): ${rawText}`);
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      throw new Error("OpenAI returned NON-JSON response");
    }

    console.log("OpenRouter raw response:", data);

    const reply = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : "No response from AI";

    res.json({ reply });

  } catch (err) {
    console.error("❌ REAL ERROR ↓↓↓");
    console.error(err);
    console.error("❌ ERROR MESSAGE:", err.message);
    res.status(500).json({
      reply: "Server error",
      error: err.message
    });
  }

});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
