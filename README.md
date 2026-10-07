<div align="center">

# AI Personal Assistant

Chat with an AI assistant, check current weather, and look up currency exchange rates from a simple browser interface.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Vanilla JavaScript](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?logo=vercel&logoColor=white)

[Features](#-features) · [Quick start](#-quick-start) · [Architecture](#-how-it-works) · [Deployment](#-deployment)

</div>

## ✨ Features

- **AI chat** — Sends general prompts to Groq's chat-completions API.
- **Current weather** — Looks up a place with Open-Meteo Geocoding, then fetches current conditions from Open-Meteo Forecast. Defaults to Indore when no location is extracted.
- **Currency rates** — Retrieves exchange rates from ExchangeRate.host. Defaults to USD to INR when no pair is extracted.
- **Chat history** — Saves messages in browser local storage; view or clear the saved history in the interface.
- **Light and dark themes** — Remembers the selected theme in browser local storage.
- **Owner verification** — An explicit owner claim starts a challenge. Passing it confirms identity only; it does not grant access to personal information.

Weather and currency requests are selected by message keywords. Other messages are sent to Groq.

## 🧰 Tech stack

| Area | Technology |
| --- | --- |
| Runtime and local server | Node.js 18+, Express 5 |
| Browser interface | HTML, CSS, vanilla JavaScript |
| General chat | Groq chat-completions API |
| Weather | Open-Meteo Geocoding and Forecast APIs |
| Exchange rates | ExchangeRate.host |
| Deployment configuration | Vercel Node functions and static assets |

## 🗂️ Project structure

```text
.
├── api/
│   └── chat.js                    # Vercel chat endpoint
├── public/
│   ├── index.html                 # Chat interface
│   ├── script.js                  # Browser interactions and API requests
│   └── style.css                  # Interface styles
├── test/
│   └── owner-verification.test.js # Owner verification and privacy tests
├── assistant-policy.js            # Shared verification and privacy policy
├── server.js                      # Local Express server and /chat endpoint
├── package.json                   # Dependencies and npm scripts
├── package-lock.json              # Locked dependency versions
└── vercel.json                    # Vercel builds and routes
```

## 🚀 Quick start

### Requirements

- Node.js 18 or newer (the server uses the built-in `fetch` API)
- A Groq API key for chat and for the backend endpoints

Install dependencies:

```sh
npm install
```

### Configure environment

Provide the Groq key as an environment variable, or create a `.env` file in the project root:

```dotenv
GROQ_API_KEY=your_groq_api_key
```

Optional configuration:

| Variable | Default | Description |
| --- | --- | --- |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Model used for general chat |
| `GROQ_MAX_TOKENS` | `256` | Maximum generated tokens for general chat |

Keep credentials private. `.gitignore` excludes `.env` and `node_modules/`; do not commit real keys or secret values.

### Start the local server

```sh
npm start
```

The Express server listens at `http://localhost:3000` and serves the static files from `public/`. Its chat endpoint is `POST /chat`, with a JSON body containing `message`. For example, in PowerShell:

```powershell
Invoke-RestMethod -Uri http://localhost:3000/chat `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"message":"Hello"}'
```

> **Local interface note:** The browser currently sends messages to `/api/chat`, while the standalone Express server implements `/chat`. Vercel provides the `/api/*` route through its serverless handler; local API requests can be sent directly to `/chat`.

## 🧭 How it works

1. The browser sends a message to the configured chat endpoint. Chat history and theme preference are stored locally in the browser.
2. The backend checks for an explicit owner claim or an active verification challenge, then blocks recognized requests for personal information.
3. Weather and currency queries are routed to their respective external APIs. Other messages are sent to Groq.
4. The local Express server and Vercel handler use the same `assistant-policy.js` module for owner verification and privacy rules.

### Owner verification and privacy

An explicit first-person claim to be Krish Soni or the owner prompts an identity challenge. Only the configured response passes; incorrect responses fail without revealing it. The response accepts harmless whitespace and capitalization differences.

Successful verification confirms identity only. It is tracked in a signed, `HttpOnly`, `SameSite=Strict` cookie for the browser session. Verification does not authorize disclosure of personal details, private context, or stored information; requests for such information are refused whether or not the session is verified. Mentioning Krish in an ordinary question does not by itself start verification.

## 🔌 API

The Vercel serverless endpoint is `POST /api/chat`. Send JSON such as:

```json
{
  "message": "What is the weather in Mumbai?"
}
```

A successful response contains a `reply` string. The endpoint returns JSON errors for unsupported methods, missing messages, or a missing Groq API key. Weather and exchange-rate lookup failures normally return a fallback reply; other upstream or parsing failures may return an error.

The local Express endpoint is `POST /chat` and accepts the same message body.

## 🧪 Tests

Run the Node.js test suite:

```sh
npm test
```

The tests cover explicit owner claims, correct and incorrect challenge responses, ordinary Krish mentions, signed verification state, privacy refusals, and the Vercel chat handler flow.

## ☁️ Deployment

`vercel.json` configures JavaScript files under `api/` as Vercel Node functions, serves assets from `public/`, routes `/api/*` to the API handler, and falls back to `public/index.html`.

Set `GROQ_API_KEY` in the Vercel project environment settings. `GROQ_MODEL` and `GROQ_MAX_TOKENS` are optional overrides. No deployed demo URL is configured in this repository.

## 👤 Author

**Krish Soni**

## 🔗 Repository

[sonikrish920-rgb/Personal-Assistant](https://github.com/sonikrish920-rgb/Personal-Assistant)
