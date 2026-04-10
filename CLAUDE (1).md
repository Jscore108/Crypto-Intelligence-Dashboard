# CLAUDE.md — Crypto Intelligence Dashboard

## Project Vision

Build a **futuristic, public crypto intelligence dashboard** — a single-page web app (HTML/CSS/JS) accessible via URL that serves as a real-time market command center. No login required, no portfolio dollar values stored. This is a read-only market health monitor and sell-zone tracker.

The aesthetic goal: dark, cinematic, data-dense but readable. Think Bloomberg Terminal meets Minority Report. Every element earns its place. Nothing generic.

---

## Tech Stack

- **Frontend**: Pure HTML + CSS + JavaScript (no framework needed)
- **Hosting**: Deploy to **Vercel** (free tier, instant URL, zero config)
  - `vercel --prod` from the project folder deploys it
  - Alternatively: Netlify drag-and-drop deploy
- **Data APIs** (all free tier to start):
  - `https://api.alternative.me/fng/` — Fear & Greed Index
  - `https://api.coingecko.com/api/v3/` — Prices, market data, BTC dominance, ETH/BTC ratio
  - `https://api.coinmarketcap.com/v1/` — Supplemental price data (requires free API key)
  - TradingView lightweight charts library — for Rainbow Chart, Pi Cycle visual
  - `https://api.glassnode.com/v1/metrics/` — MVRV Z-Score, Puell Multiple (requires free API key)
- **Alerts**: See Alert System section below
- **Email**: See Intelligence Briefing section below

---

## Pages / Sections

### 1. 🏠 Main Dashboard — Market Health Hub

The primary view. Split into panels. Auto-refreshes every 60 seconds.

#### Top Bar
- Live BTC price | ETH price | Fear & Greed score (color coded)
- Composite Score (0–100) — see Composite Indicator section
- Last updated timestamp

#### Indicator Panel Grid

Display each indicator as a card with:
- Current value
- Status label (e.g. "Overheated", "Neutral", "Accumulation Zone")
- Mini sparkline or gauge visual
- Color: green (safe) → yellow (caution) → red (sell territory)

**Indicators to include:**
| Indicator | Source | Signal |
|---|---|---|
| Fear & Greed Index | alternative.me | <25 = buy, >75 = sell |
| BTC Dominance (BTC.D) | CoinGecko | Rising = risk-off, Falling = alt season |
| ETH/BTC Ratio | CoinGecko | Rising = ETH outperforming |
| Alt Season Index | CoinGecko (calculate from top 50 vs BTC) | >75 = alt season |
| Puell Multiple | Glassnode | >2 = sell zone, <0.5 = buy zone |
| Pi Cycle Indicator | Glassnode or calculate: 111DMA vs 2x350DMA | Crossover = top signal |
| MVRV Z-Score | Glassnode | >7 = sell zone, <0 = buy zone |
| BTC Key Levels | Hardcoded + CoinGecko price | See sell zones below |
| ETH Key Levels | Hardcoded + CoinGecko price | See sell zones below |

#### Composite Score (0–100)

Formula (weighted average):
```
Composite = (
  Fear_Greed_normalized * 0.25 +
  MVRV_normalized * 0.30 +
  PiCycle_signal * 0.25 +
  RSI_14_BTC_normalized * 0.20
)
```
- Display as a large arc gauge (0–100)
- Color: 0–40 green, 40–70 yellow, 70–100 red
- Label zones: "Accumulate" / "Hold" / "Distribute" / "SELL"

---

### 2. 📈 Charts Page

Full-width interactive charts. Use TradingView Lightweight Charts library.

**Charts to build:**
- BTC Rainbow Chart (log regression bands, color coded)
- Pi Cycle Top Indicator (111DMA crossing 2x350DMA)
- MVRV Z-Score over time
- Fear & Greed Index over time (area chart)
- BTC Dominance over time
- ETH/BTC ratio over time

Each chart has:
- Sell zone lines drawn horizontally at target prices
- Tooltip on hover with date + value
- Toggle between 1Y / 2Y / All Time

---

### 3. 🎯 Sell Zone Tracker

The most actionable page. Shows every target with distance to go.

**Format per coin:**
```
[COIN]  Current: $X,XXX   |  Target: $X,XXX  |  Multiple: X.Xx  |  % Away: XX%
```

**Hardcoded sell zones:**

```javascript
const SELL_ZONES = {
  BTC: [
    { label: "ATH Target", price: 126000 },
    { label: "1.618 Fib", price: 167000 },
  ],
  ETH: [
    { label: "Resistance 1", price: 4300 },
    { label: "Resistance 2", price: 5000 },
    { label: "1.618 Fib", price: 6900 },
  ],
  LINK: [
    { label: "0.786 Fib", price: 24 },
    { label: "52W High", price: 28 },
    { label: "~1.618 Fib", price: 38 },
    { label: "2.618 Fib", price: 62 },
  ],
  SOL: [
    { label: "Target", price: 418 },
  ],
  BRETT: [
    { label: "T1", price: 0.075 },
    { label: "T2", price: 0.09 },
    { label: "T3", price: 0.12 },
    { label: "T4", price: 0.18 },
  ],
  POPCAT: [
    { label: "T1", price: 0.35 },
    { label: "T2", price: 0.55 },
    { label: "T3", price: 0.85 },
    { label: "T4", price: 1.258 },
  ],
  WIF: [
    { label: "T1", price: 0.90 },
    { label: "T2", price: 1.50 },
    { label: "T3", price: 2.08 },
    { label: "T4", price: 3.20 },
  ],
};
```

Visual treatment:
- Progress bar per zone (how close current price is)
- Color: gray (far) → yellow (within 20%) → orange (within 10%) → red/flashing (at zone)
- Show "🎯 IN ZONE" badge when price is within 2% of target

---

### 4. 📰 News Page (Two Tabs)

**Tab A — Crypto News**
- Pull from: CoinGecko `/news` endpoint or CryptoPanic API (free tier)
- Show: headline, source, time ago, sentiment tag (bullish/bearish/neutral)

**Tab B — World & Macro News**
- Pull from: NewsAPI.org (free tier) — categories: finance, economy, markets
- Show: headline, source, publication time

Refresh every 15 minutes. No paywalled content. Show top 20 stories per tab.

---

### 5. 🧠 Intelligence Briefing Page

A daily AI-generated market report. Powered by Claude API call (or manually triggered).

**Report sections:**
1. **Macro Overview** — what's driving markets today (rates, DXY, global risk)
2. **BTC Deep Dive** — on-chain signals, price action, key levels
3. **Top Gainers / Losers** (top 10 crypto, 24h)
4. **Upcoming Catalysts** — token unlocks, ETF decisions, Fed meetings, earnings
5. **Alt Season Pulse** — where are we in the cycle?
6. **Actionable Trade Ideas** — based on indicator readings
7. **Claude's Take** — plain English: what does all this mean right now?

**Trigger options:**
- Button on page: "Generate Today's Briefing"
- Automated daily email (see below)

**Prompt template to use (store in `/prompts/daily_briefing.txt`):**
```
You are a professional crypto and macro market analyst. Today is {DATE}.

Using the following live data:
- BTC Price: {BTC_PRICE}
- ETH Price: {ETH_PRICE}
- Fear & Greed: {FNG_SCORE} ({FNG_LABEL})
- BTC Dominance: {BTC_D}%
- MVRV Z-Score: {MVRV}
- Composite Score: {COMPOSITE}/100

Write a structured daily intelligence briefing with these sections:
1. Macro Overview (3–4 sentences)
2. BTC Deep Dive (key levels, signals, what to watch)
3. Top Gainers / Losers (use live data if available)
4. Upcoming Catalysts (next 7 days)
5. Alt Season Pulse
6. Actionable Trade Ideas (be specific, include risk notes)
7. Claude's Take (plain English summary, 2–3 sentences)

Be direct. No fluff. Institutional tone but readable.
```

---

## Alert System

### Option A — Simplest: Python Script (Recommended for Beginners)

```
/alerts/
  price_checker.py   ← runs every 5 min via cron or GitHub Actions
  config.json        ← stores alert thresholds
  .env               ← SMTP credentials (never commit this)
```

**How it works:**
- Script fetches prices from CoinGecko every 5 min
- Compares against your sell zone thresholds
- Sends email via SMTP (Gmail app password or ProtonMail Bridge)
- Logs alerts to avoid duplicate sends

**Email options:**
| Method | Cost | Setup Difficulty |
|---|---|---|
| Gmail SMTP (app password) | Free | Easy |
| ProtonMail Bridge (SMTP) | Free (desktop app required) | Medium |
| SendGrid API | Free up to 100/day | Easy |
| Mailgun | Free up to 1000/month | Easy |

**Recommended**: SendGrid free tier — most reliable, no desktop app needed.

### Option B — No-Code: n8n (Self-hosted or cloud)

- Visual workflow builder
- Trigger: Schedule (every 5 min) → HTTP Request (CoinGecko) → IF price >= target → Send Email
- Free self-hosted version available
- Cloud version: $20/mo

### Option C — No-Code: Make.com (Formerly Integromat)

- Similar to n8n, cloud-based
- Free tier: 1,000 operations/month
- Easiest to set up with no coding

### CMC (CoinMarketCap) Native Alerts

CoinMarketCap has built-in price alerts:
1. Go to coinmarketcap.com → any coin page
2. Click the bell icon (🔔) next to the price
3. Set a price target → email or push notification
4. Free, no code required

**Use CMC alerts as your backup layer** alongside the Python/n8n system.

---

## File Structure

```
crypto-dashboard/
├── index.html              ← Main dashboard
├── charts.html             ← Charts page
├── sell-zones.html         ← Sell zone tracker
├── news.html               ← News (crypto + macro tabs)
├── briefing.html           ← Intelligence briefing
├── css/
│   ├── main.css            ← Global styles, design system
│   ├── charts.css
│   └── components.css
├── js/
│   ├── api.js              ← All API fetch functions
│   ├── indicators.js       ← Indicator calculations
│   ├── composite.js        ← Composite score formula
│   ├── sell-zones.js       ← Sell zone logic + multiples
│   ├── charts.js           ← TradingView chart configs
│   └── news.js             ← News feed logic
├── alerts/
│   ├── price_checker.py    ← Alert script
│   ├── config.json         ← Thresholds config
│   └── .env.example        ← Template (never commit .env)
├── prompts/
│   └── daily_briefing.txt  ← Claude briefing prompt
├── vercel.json             ← Deploy config
└── CLAUDE.md               ← This file
```

---

## Design System

**Aesthetic Direction**: Dark cinematic terminal. Not purple-gradient-AI. Not Bootstrap. Think: obsidian black backgrounds, electric amber + cyan accents, monospaced data readouts, geometric panel borders, subtle scan-line texture on headers.

**Colors (CSS variables):**
```css
--bg-primary: #050508;
--bg-panel: #0d0d14;
--bg-card: #111118;
--accent-gold: #f0b429;
--accent-cyan: #00d4d4;
--accent-red: #ff4444;
--accent-green: #00ff88;
--text-primary: #e8e8f0;
--text-muted: #666680;
--border: #1e1e2e;
```

**Typography:**
- Display/numbers: `'JetBrains Mono'` or `'Space Mono'` (Google Fonts)
- Body/labels: `'DM Sans'` or `'Sora'`
- Avoid: Inter, Roboto, Arial

**Animation rules:**
- Data values: count-up animation on load
- Alert zones: pulse glow when near target
- Cards: subtle scanline sweep on hover
- Composite gauge: animated arc fill on load

---

## Development Order (Build in This Sequence)

1. `api.js` — get all data flowing first, test in console
2. `index.html` + indicator cards — the core dashboard
3. `sell-zones.html` — your most-used page
4. `composite.js` — composite score gauge
5. `charts.html` — TradingView integrations
6. `news.html` — news feeds
7. `briefing.html` — Claude AI briefing
8. `alerts/price_checker.py` — email alert system
9. Deploy to Vercel

---

## API Keys Needed

Store all keys in a `.env` file locally. Never commit to GitHub.

```
COINGECKO_API_KEY=        # Free at coingecko.com/api
CMC_API_KEY=              # Free at coinmarketcap.com/api
GLASSNODE_API_KEY=        # Free at glassnode.com (limited endpoints)
NEWSAPI_KEY=              # Free at newsapi.org
SENDGRID_API_KEY=         # Free at sendgrid.com
ANTHROPIC_API_KEY=        # For briefing page — claude.ai/api
PROTON_EMAIL=             # Your ProtonMail address
```

---

## Key Constraints / Rules for Claude Code

- **No user authentication** — this is a public read-only dashboard
- **No real portfolio values** — only coin targets and indicator data
- **No backend server required** — all API calls from frontend JS (use CORS-friendly endpoints)
- **Mobile-friendly** — must work on phone for quick checks
- **Auto-refresh** — prices every 60s, news every 15min, indicators every 5min
- **Graceful degradation** — if an API fails, show last cached value + timestamp, never break the page
- **Free tier APIs only** to start — design so paid upgrades (Glassnode pro, CMC paid) are easy to add later
- Always use the sell zone constants defined above — never hardcode prices inline
- Composite score formula is fixed — do not change weights without user confirmation

---

## Claude Code Session Starter Prompt

When opening a new Claude Code session on this project, paste this:

> "I'm building a public crypto intelligence dashboard. Read CLAUDE.md for full context. The project uses HTML/CSS/JS deployed to Vercel. Start by building [SPECIFIC TASK]. Use the design system and sell zones defined in CLAUDE.md. All API calls go in api.js. Keep the dark cinematic aesthetic throughout."
