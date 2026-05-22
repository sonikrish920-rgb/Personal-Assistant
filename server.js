const express = require("express");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

const app = express();

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const GROQ_MAX_TOKENS = Number(process.env.GROQ_MAX_TOKENS) || 256;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const WEATHER_GEO_URL = "https://geocode.maps.co/search";
const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";
const EXCHANGE_API_URL = "https://api.exchangerate.host/latest";

function extractLocationFromMessage(message) {
  const match = message.match(/(?:in|at|for|near)\s+([A-Za-z ]+)/i);
  if (!match) return null;
  return match[1].trim().replace(/[\.\?!,]*$/g, "");
}

function extractCurrencyPair(message) {
  const pairMatch = message.match(/([A-Z]{3})\s*(?:to|in|->)\s*([A-Z]{3})/i);
  if (pairMatch) {
    return { from: pairMatch[1].toUpperCase(), to: pairMatch[2].toUpperCase() };
  }

  const namedMatch = message.match(/(usd|inr|eur|gbp|jpy|aud|cad|cny|sgd|chf)\s*(?:to|in|->)\s*(usd|inr|eur|gbp|jpy|aud|cad|cny|sgd|chf)/i);
  if (namedMatch) {
    return { from: namedMatch[1].toUpperCase(), to: namedMatch[2].toUpperCase() };
  }

  return null;
}

async function findLocation(location) {
  const url = `${WEATHER_GEO_URL}?q=${encodeURIComponent(location)}&limit=1`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return { name: data[0].display_name, lat: data[0].lat, lon: data[0].lon };
}

function weatherCodeDescription(code) {
  const map = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "depositing rime fog",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    61: "slight rain",
    63: "moderate rain",
    65: "heavy rain",
    71: "light snow",
    73: "moderate snow",
    75: "heavy snow",
    80: "rain showers",
    81: "strong rain showers",
    82: "violent rain showers",
    95: "thunderstorm",
    96: "thunderstorm with hail"
  };
  return map[code] || "moderate weather";
}

async function getWeatherForLocation(location) {
  const geo = await findLocation(location);
  if (!geo) return null;
  const url = `${WEATHER_API_URL}?latitude=${geo.lat}&longitude=${geo.lon}&current_weather=true&timezone=auto`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  if (!data?.current_weather) return null;
  const weather = data.current_weather;
  const description = weatherCodeDescription(weather.weathercode);
  return `Weather in ${geo.name}: ${weather.temperature}°C, ${description}, wind ${weather.windspeed} km/h.`;
}

async function getExchangeRate(from, to) {
  const url = `${EXCHANGE_API_URL}?base=${from}&symbols=${to}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  const rate = data?.rates?.[to];
  if (!rate) return null;
  return `1 ${from} equals ${rate.toFixed(4)} ${to} (latest exchange rate).`;
}

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

    const lowerMessage = userMessage.toLowerCase();
    const isWeather = /weather|mosam|temperature|climate/.test(lowerMessage);
    const isMarket = /market|rate|exchange|dollar|rupee|currency/.test(lowerMessage);

    if (isWeather) {
      const location = extractLocationFromMessage(userMessage) || "Indore";
      const weatherReply = await getWeatherForLocation(location);
      if (weatherReply) {
        return res.json({ reply: `${weatherReply} Would you like more details about the weather?` });
      }
      return res.json({ reply: "I couldn't fetch weather data right now. Please try again with a location like 'weather in Mumbai'." });
    }

    if (isMarket) {
      const pair = extractCurrencyPair(userMessage) || { from: "USD", to: "INR" };
      const marketReply = await getExchangeRate(pair.from, pair.to);
      if (marketReply) {
        return res.json({ reply: `${marketReply} Do you want the rate for another currency pair?` });
      }
      return res.json({ reply: "I couldn't fetch the market rate right now. Please ask again with a currency pair like 'USD to INR'." });
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
            content: "You are an AI assistant created by Krish Soni. Your creator is Krish Soni from Banganga, Indore.\n\nAbout Krish Soni:\n- B.Tech Computer Science student\n- Interested in technology, programming, AI tools, and software projects\n- Likes learning new technical skills and building useful projects\n- Uses VS Code and works on coding-related tasks\n- Enjoys chess and strategic problem-solving\n- Chess rapid rating is 2050\n- Has won nodal-level chess competitions\n- Prefers direct and logical communication\n- Curious about how technology and AI systems work\n\nPersonality of Creator:\n- Tech enthusiast\n- Curious learner\n- Strategic thinker\n- Creative mindset\n- Straightforward communication style\n\nAssistant Behavior Rules:\n- Respect Krish Soni as creator\n- Give practical and accurate answers\n- Keep explanations simple and useful\n- Help in coding, projects, technology, and learning\n- Stay friendly, smart, and logical\n\nAnswer questions directly and adapt answer length to the user's request. If the user asks for details, provide a detailed response. If the user asks for a short answer, keep it concise. Unless the user explicitly requests a short answer, always finish your response with a brief follow-up question such as 'Would you like more details?' or 'Should I explain this further?'. If the user explicitly asks you not to continue, do not add a follow-up question."
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
