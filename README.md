# 🎨 Topic-to-Image Generation & Dispatch Pipeline

> **Automated end-to-end AI pipeline** that takes a topic, enhances it with LLM prompt engineering, generates a high-resolution image, and delivers it directly to **Telegram** or **Email** — fully automated.

<div align="center">

![Pipeline Flow](https://image.pollinations.ai/prompt/Futuristic%20AI%20pipeline%20dashboard%20with%20neon%20lights%20and%20glowing%20data%20streams%2C%20dark%20mode%2C%20cinematic?width=1200&height=400&nologo=true)

[![Node.js](https://img.shields.io/badge/Node.js-24.x-brightgreen?logo=node.js)](https://nodejs.org)
[![Express](https://img.shields.io/badge/Express-4.x-black?logo=express)](https://expressjs.com)
[![OpenRouter](https://img.shields.io/badge/LLM-OpenRouter-blueviolet)](https://openrouter.ai)
[![Telegram](https://img.shields.io/badge/Telegram-Bot%20API-blue?logo=telegram)](https://core.telegram.org/bots/api)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## ✨ Features

- 🧠 **LLM Prompt Optimizer** — Expands raw topics using OpenRouter (Gemini 2.5 Flash) with style presets, lighting, and composition cues
- 🖼️ **AI Image Synthesis** — Generates high-fidelity visuals via Pollinations.ai (FLUX / Stable Diffusion) with aspect ratio support
- ✈️ **Telegram Dispatch** — Sends photo preview + uncompressed high-res document via Telegram Bot API
- ✉️ **Email Dispatch** — Responsive HTML email with embedded preview and PNG attachment via Nodemailer
- 🛡️ **Content Safety** — Keyword guardrails blocking disallowed content before generation
- 🔄 **Retry Logic** — Exponential backoff (3 attempts) with fallback notification on failure
- 🚦 **Rate Limiting** — 5 requests per 10 minutes per IP in production
- 📊 **Live Telemetry Dashboard** — Glassmorphic Web UI at `localhost:3000`
- ⚙️ **n8n Workflow Blueprint** — Ready-to-import automation workflow JSON

---

## 🏗️ Architecture

```
[User Input: Topic + Style + Aspect Ratio + Channel]
                      │
                      ▼
          [Input Validation & Sanitization]
                      │
                      ▼
      [LLM Prompt Optimizer (OpenRouter / Gemini)]
                      │
                      ▼
    [AI Image Generation (Pollinations FLUX / SDXL)]
                      │
             ┌────────┴────────┐
             ▼                 ▼
    [Telegram sendPhoto]   [Email SMTP/Resend]
     + sendDocument         HTML Template + PNG
```

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org) v18+ (tested on v24)
- A Telegram Bot Token from [@BotFather](https://t.me/BotFather)
- An [OpenRouter](https://openrouter.ai) API Key (free tier works)

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/topic-to-image-pipeline.git
cd topic-to-image-pipeline
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000

# Telegram Bot (Get from @BotFather on Telegram)
TELEGRAM_BOT_TOKEN=your_bot_token_here

# OpenRouter API Key (https://openrouter.ai)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx

# Optional: Gemini API Key for additional LLM fallback
GEMINI_API_KEY=your_gemini_key_here

# Optional: Email via Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_gmail_app_password
```

### 4. Get Your Telegram Chat ID

1. Start a conversation with your bot on Telegram
2. Send any message to the bot
3. Run this command to get your Chat ID:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates"
```

Look for `"chat":{"id": 123456789}` — that's your Chat ID.

### 5. Start the Server

```bash
npm start
```

Open your browser: **[http://localhost:3000](http://localhost:3000)**

---

## 📡 API Reference

### `POST /api/generate-and-dispatch` — Main Pipeline Trigger

```json
{
  "topic": "Cyberpunk cafe in neon Tokyo during rain",
  "style_preset": "Cinematic",
  "aspect_ratio": "16:9",
  "delivery": {
    "channel": "telegram",
    "recipient": "123456789"
  }
}
```

**Parameters:**

| Field | Type | Required | Values |
|-------|------|----------|--------|
| `topic` | string | ✅ | Any descriptive text |
| `style_preset` | string | ❌ | `Photorealistic`, `Cinematic`, `Anime`, `Digital Art`, `Minimalist` |
| `aspect_ratio` | string | ❌ | `1:1`, `16:9`, `9:16` |
| `delivery.channel` | string | ✅ | `telegram` or `email` |
| `delivery.recipient` | string | ✅ | Telegram Chat ID / email address |

**cURL Example:**

```bash
curl -X POST http://localhost:3000/api/generate-and-dispatch \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Futuristic cricket stadium at sunset",
    "style_preset": "Photorealistic",
    "aspect_ratio": "16:9",
    "delivery": {
      "channel": "telegram",
      "recipient": "YOUR_TELEGRAM_CHAT_ID"
    }
  }'
```

### Other Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `GET /api/health` | GET | Server health check |
| `GET /api/history` | GET | Execution telemetry log |
| `POST /api/optimize-prompt` | POST | Standalone prompt refinement |
| `POST /api/generate-image` | POST | Standalone image generation |

---

## 🖥️ Dashboard

The web dashboard at `http://localhost:3000` provides:

- 🚀 **Pipeline Trigger Sandbox** — Submit topics and track generation in real time
- 🔍 **Prompt Inspector** — Compare raw vs LLM-expanded prompts
- 🖼️ **Live Preview** — View generated images with Telegram & Email card simulators
- ⚙️ **n8n Blueprint Exporter** — Download ready-to-import n8n automation workflow
- 📜 **Telemetry Logs** — Full execution audit table with latency metrics

---

## ⚙️ n8n Integration

Import the pre-built workflow from [`n8n/topic_to_image_pipeline.json`](n8n/topic_to_image_pipeline.json) into your n8n instance for no-code automation.

**Workflow nodes:**
1. Webhook Trigger
2. Prompt Refinement (Gemini LLM)
3. AI Image Synthesis (Pollinations FLUX)
4. Channel Router (Telegram / Email)
5. Telegram Bot Dispatch
6. Email SMTP Dispatch

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| LLM Prompt Engine | OpenRouter (google/gemini-2.5-flash) |
| Image Generation | Pollinations.ai (FLUX / SDXL) |
| Telegram Dispatch | Telegram Bot API (`sendPhoto` + `sendDocument`) |
| Email Dispatch | Nodemailer (SMTP / Gmail) |
| Dashboard UI | Vanilla HTML/CSS/JS (Glassmorphic Dark Mode) |
| Rate Limiting | express-rate-limit |
| Workflow | n8n Blueprint (JSON import) |

---

## 📁 Project Structure

```
topic-to-image-pipeline/
├── server.js                      # Express server & middleware
├── routes/
│   └── pipelineRoutes.js          # API endpoint handlers
├── services/
│   ├── promptOptimizer.js         # LLM prompt expansion engine
│   ├── imageGenerator.js          # Image synthesis client
│   └── deliveryEngine.js          # Telegram & Email dispatch
├── public/
│   ├── index.html                 # Dashboard SPA
│   ├── css/styles.css             # Dark glassmorphic design
│   └── js/app.js                  # Frontend reactive logic
├── n8n/
│   └── topic_to_image_pipeline.json  # n8n workflow blueprint
├── test_pipeline.js               # Automated test suite
├── .env.example                   # Environment variable template
└── package.json
```

---

## 🧪 Running Tests

```bash
npm test
```

Expected output: **18 tests, 0 failures**

---

## 🌐 Deploying to Production

### Option A: Render (Free)
1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your repo, set `npm start` as start command
4. Add environment variables in Render dashboard

### Option B: Fly.io (Free)
```bash
fly launch
fly secrets set TELEGRAM_BOT_TOKEN=xxx OPENROUTER_API_KEY=xxx
fly deploy
```

### Option C: Quick Public URL (Dev/Testing)
```bash
npx ngrok http 3000
```

---

## 🔒 Security Notes

- **Never commit your `.env` file** — it's in `.gitignore`
- Rotate your bot token if accidentally exposed
- Set `NODE_ENV=production` to enforce strict 5 req/10min rate limit

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

<div align="center">

**Built with ❤️ using OpenRouter, Pollinations.ai, and Telegram Bot API**

</div>
