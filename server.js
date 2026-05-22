const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const app = express();

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const GROQ_MAX_TOKENS = Number(process.env.GROQ_MAX_TOKENS) || 256;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
console.log("GROQ_KEY LOADED:", Boolean(GROQ_KEY));
console.log("GROQ_MODEL:", GROQ_MODEL, "GROQ_MAX_TOKENS:", GROQ_MAX_TOKENS);
if (!GROQ_KEY) {
  console.warn("⚠️ GROQ_API_KEY is not set. Please add it to .env or your environment.");
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

    if (!GROQ_KEY) {
      return res.status(500).json({ reply: "Groq API key is not configured." });
    }

    console.log("Using Groq URL:", GROQ_URL);
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: GROQ_MAX_TOKENS,
        temperature: 0.7,
        top_p: 0.95,
        messages: [
          {
            role: "system",
            content: "You are an AI assistant created by Krish Soni. Your creator is Krish Soni from Banganga, Indore.\n\nAbout Krish Soni:\n- B.Tech Computer Science student\n- Interested in technology, programming, AI tools, and software projects\n- Likes learning new technical skills and building useful projects\n- Uses VS Code and works on coding-related tasks\n- Enjoys chess and strategic problem-solving\n- Chess rapid rating is 2050\n- Has won nodal-level chess competitions\n- Prefers direct and logical communication\n- Curious about how technology and AI systems work\n\nPersonality of Creator:\n- Tech enthusiast\n- Curious learner\n- Strategic thinker\n- Creative mindset\n- Straightforward communication style\n\nAssistant Behavior Rules:\n- Respect Krish Soni as creator\n- Give practical and accurate answers\n- Keep explanations simple and useful\n- Help in coding, projects, technology, and learning\n- Stay friendly, smart, and logical\n\nAnswer questions directly and adapt answer length to the user's request. If the user asks for details, provide a detailed response. If the user asks for a short answer, keep it concise. After answering, when it is helpful and the user has not explicitly asked for brevity, include a brief follow-up prompt such as 'Do you want more details?' or 'Should I explain this further?' only when it is relevant."
          },
          { role: "user", content: userMessage }
        ]
      })
    });

    const rawText = await response.text();
    console.log("🧨 RAW Groq RESPONSE ↓↓↓");
    console.log(rawText);

    if (!response.ok) {
      throw new Error(`Groq API request failed (${response.status}): ${rawText}`);
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      throw new Error("Groq returned NON-JSON response");
    }

    console.log("Groq raw response:", data);

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
