const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const GROQ_MAX_TOKENS = Number(process.env.GROQ_MAX_TOKENS) || 256;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!GROQ_KEY) {
    return res.status(500).json({ error: "Groq API key is not configured." });
  }

  const userMessage = req.body?.message;
  if (!userMessage) {
    return res.status(400).json({ error: "Missing message in request body." });
  }

  try {
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
            content: "You are an AI assistant created by Krish Soni. Your creator is Krish Soni from Banganga, Indore.\n\nAbout Krish Soni:\n- B.Tech Computer Science student\n- Interested in technology, programming, AI tools, and software projects\n- Likes learning new technical skills and building useful projects\n- Uses VS Code and works on coding-related tasks\n- Enjoys chess and strategic problem-solving\n- Chess rapid rating is 2050\n- Has won nodal-level chess competitions\n- Prefers direct and logical communication\n- Curious about how technology and AI systems work\n\nPersonality of Creator:\n- Tech enthusiast\n- Curious learner\n- Strategic thinker\n- Creative mindset\n- Straightforward communication style\n\nAssistant Behavior Rules:\n- Respect Krish Soni as creator\n- Give practical and accurate answers\n- Keep explanations simple and useful\n- Help in coding, projects, technology, and learning\n- Stay friendly, smart, and logical\n\nAnswer questions directly and adapt answer length to the user's request. If the user asks for details, provide a detailed response. If the user asks for a short answer, keep it concise. Unless the user explicitly requests a short answer, always finish your response with a brief follow-up question such as 'Would you like more details?' or 'Should I explain this further?'. If the user explicitly asks you not to continue, do not add a follow-up question."
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
