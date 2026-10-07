# AI Personal Assistant

A browser-based personal assistant with an AI chat interface, live weather lookups, and currency exchange-rate lookups.

## Features

- Sends general questions to the Groq chat-completions API.
- Returns current weather for a location using Open-Meteo geocoding and forecast services. If no location is extracted from the message, it defaults to Indore.
- Returns exchange rates using ExchangeRate.host. If no currency pair is extracted, it defaults to USD to INR.
- Saves chat messages in the browser's local storage, with controls to view and clear the saved history.
- Provides light and dark themes and remembers the selected theme in local storage.

Weather and currency requests are selected by matching keywords in the message; other messages are sent to Groq.

## Technology

- Node.js and Express
- Plain HTML, CSS, and browser JavaScript
- Groq API (OpenAI-compatible chat-completions endpoint)
- Open-Meteo Geocoding and Forecast APIs
- ExchangeRate.host
- Vercel configuration for deployment

## Project structure

```text
.
├── api/
│   └── chat.js          # Vercel serverless chat endpoint
├── public/
│   ├── index.html       # Chat interface
│   ├── script.js        # Browser interactions and API calls
│   └── style.css        # Interface styles
├── server.js            # Local Express server and /chat endpoint
├── package.json         # Dependencies and npm scripts
├── package-lock.json    # Locked dependency versions
└── vercel.json          # Vercel build and route configuration
```

## Requirements and configuration

Install a Node.js version that supports the built-in `fetch` API (Node.js 18 or newer), then install the project dependencies:

```sh
npm install
```

The server requires a Groq API key. Set `GROQ_API_KEY` in the environment before starting the server or add it to a local `.env` file in the project root:

```dotenv
GROQ_API_KEY=your_groq_api_key
```

Optional settings:

| Variable | Default | Purpose |
| --- | --- | --- |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Model sent to Groq for general chat |
| `GROQ_MAX_TOKENS` | `256` | Maximum generated tokens for a general chat response |

Do not commit `.env` or real credentials. `.gitignore` excludes `.env` and `node_modules/`.

## Run locally

Start the Express server:

```sh
npm start
```

The server listens at `http://localhost:3000` and serves the static files from `public/`. Its chat endpoint is `POST /chat`, accepting a JSON body with a `message` field. For example, in PowerShell:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/chat `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"message":"Hello"}'
```

**Local interface limitation:** the browser code sends chat requests to `/api/chat`, whereas the Express server implements `/chat`. The Vercel configuration routes `/api/*` to the serverless handler in `api/chat.js`; the standalone Express server does not define that route. As currently implemented, the browser chat flow is wired to the Vercel route, while local requests can be made directly to `/chat`.

## API

The deployed serverless endpoint is `POST /api/chat`. Send JSON in this shape:

```json
{
  "message": "What is the weather in Mumbai?"
}
```

A successful response contains a `reply` string. The endpoint returns JSON errors for unsupported methods, missing messages, or a missing Groq API key. Weather and exchange-rate fetch failures normally produce a fallback reply; other upstream or parsing failures may be returned as errors. A Groq API key is required by the handler, including for weather and exchange-rate requests.

## Deployment

`vercel.json` configures the `api/` JavaScript handlers as Vercel Node functions, serves assets from `public/`, routes `/api/*` requests to the API handler, and falls back to `public/index.html` for other paths.

When deploying to Vercel, configure `GROQ_API_KEY` in the project's environment settings. `GROQ_MODEL` and `GROQ_MAX_TOKENS` can also be set there to override their defaults. No deployed URL is included because one is not specified in the repository.

## Author

Krish Soni

## Repository

[sonikrish920-rgb/Personal-Assistant](https://github.com/sonikrish920-rgb/Personal-Assistant)
