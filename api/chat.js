const {
  ASSISTANT_SYSTEM_PROMPT,
  getSafeProfileReply,
  isIdentityQuestion,
  PRIVATE_INFO_REPLY,
  UNKNOWN_IDENTITY_REPLY,
  handleOwnerVerification,
  isPrivateInfoRequest
} = require("../assistant-policy");

const GROQ_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const GROQ_MAX_TOKENS = Number(process.env.GROQ_MAX_TOKENS) || 256;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const WEATHER_GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
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
  const url = `${WEATHER_GEO_URL}?name=${encodeURIComponent(location)}&count=1`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = await response.json();
  if (!data?.results?.length) return null;
  return {
    name: `${data.results[0].name}, ${data.results[0].country}`,
    lat: data.results[0].latitude,
    lon: data.results[0].longitude
  };
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
  return `1 ${from} equals ${rate.toFixed(4)} ${to} (based on latest exchange rates).`;
}

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

  const ownerResult = handleOwnerVerification(userMessage, req, res, GROQ_KEY);
  if (ownerResult) {
    return res.status(200).json({ reply: ownerResult.reply });
  }

  if (isPrivateInfoRequest(userMessage)) {
    return res.status(200).json({ reply: PRIVATE_INFO_REPLY });
  }

  if (isIdentityQuestion(userMessage)) {
    return res.status(200).json({ reply: UNKNOWN_IDENTITY_REPLY });
  }

  const profileReply = getSafeProfileReply(userMessage);
  if (profileReply) {
    return res.status(200).json({ reply: profileReply });
  }

  const lowerMessage = userMessage.toLowerCase();
  const isWeather = /weather|mosam|temperature|climate/.test(lowerMessage);
  const isMarket = /market|rate|exchange|dollar|rupee|currency/.test(lowerMessage);

  if (isWeather) {
    const location = extractLocationFromMessage(userMessage) || "Indore";
    const weatherReply = await getWeatherForLocation(location);
    if (weatherReply) {
      return res.status(200).json({ reply: `${weatherReply} Would you like more details about the weather?` });
    }
    return res.status(200).json({ reply: "I couldn't fetch weather data right now. Please try again with a location like 'weather in Mumbai'." });
  }

  if (isMarket) {
    const pair = extractCurrencyPair(userMessage) || { from: "USD", to: "INR" };
    const marketReply = await getExchangeRate(pair.from, pair.to);
    if (marketReply) {
      return res.status(200).json({ reply: `${marketReply} Do you want the rate for another currency pair?` });
    }
    return res.status(200).json({ reply: "I couldn't fetch the market rate right now. Please ask again with a currency pair like 'USD to INR'." });
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
            content: ASSISTANT_SYSTEM_PROMPT
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
