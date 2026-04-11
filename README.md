# Crypto Intelligence Dashboard

A futuristic, real-time crypto market intelligence dashboard. Dark cinematic aesthetic. No login required. Read-only market health monitor and sell-zone tracker.

## Features

- **Market Dashboard** — Live BTC/ETH prices, Fear & Greed, composite score gauge, indicator cards
- **Sell Zone Tracker** — Progress bars for every target across BTC, ETH, SOL, LINK, BRETT, POPCAT, WIF
- **Interactive Charts** — TradingView Lightweight Charts with sell zone overlays (1Y/2Y/All)
- **News Feed** — Crypto news with sentiment tagging + macro news tab
- **AI Briefing** — Claude-powered daily intelligence reports
- **Email Alerts** — Python-based price checker with SendGrid/SMTP support

## Tech Stack

- Pure HTML + CSS + JavaScript (no framework)
- CoinGecko API (free tier) for market data
- Alternative.me API for Fear & Greed Index
- TradingView Lightweight Charts for interactive charting
- Anthropic Claude API for intelligence briefings
- Deployable to Vercel (zero config)

## Quick Start

1. Clone the repo
2. Open `index.html` in a browser, or deploy to Vercel:
   ```
   vercel --prod
   ```
3. For alerts: `cd alerts && cp .env.example .env` — fill in credentials and run `python price_checker.py`

## File Structure

```
├── index.html          Main dashboard
├── sell-zones.html     Sell zone tracker
├── charts.html         Interactive charts
├── news.html           News feeds
├── briefing.html       AI intelligence briefing
├── css/                Stylesheets
├── js/                 JavaScript modules
├── alerts/             Python alert system
├── prompts/            AI prompt templates
└── vercel.json         Deploy config
```
