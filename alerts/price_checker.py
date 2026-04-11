#!/usr/bin/env python3
"""
price_checker.py — Crypto Sell Zone Alert System
Checks prices against sell zone thresholds and sends email alerts.

Usage:
  python price_checker.py          # Run once
  python price_checker.py --daemon  # Run continuously (every 5 min)

Setup:
  1. Copy .env.example to .env and fill in your credentials
  2. pip install requests python-dotenv
  3. Run manually or set up as a cron job / GitHub Action
"""

import json
import os
import sys
import time
import logging
from datetime import datetime, timedelta
from pathlib import Path

try:
    import requests
except ImportError:
    print("Error: 'requests' package required. Run: pip install requests")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # .env loading is optional

# --- Configuration ---
SCRIPT_DIR = Path(__file__).parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
ALERT_LOG_PATH = SCRIPT_DIR / "alert_log.json"

COINGECKO_API = "https://api.coingecko.com/api/v3/simple/price"

COIN_IDS = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "SOL": "solana",
    "LINK": "chainlink",
    "BRETT": "brett-base",
    "POPCAT": "popcat",
    "WIF": "dogwifcoin",
}

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("price_checker")


def load_config():
    """Load sell zone thresholds from config.json"""
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)


def load_alert_log():
    """Load alert history to avoid duplicate sends"""
    if ALERT_LOG_PATH.exists():
        with open(ALERT_LOG_PATH, "r") as f:
            return json.load(f)
    return {}


def save_alert_log(log_data):
    """Save alert history"""
    with open(ALERT_LOG_PATH, "w") as f:
        json.dump(log_data, f, indent=2)


def fetch_prices():
    """Fetch current prices from CoinGecko"""
    ids = ",".join(COIN_IDS.values())
    try:
        resp = requests.get(
            COINGECKO_API,
            params={"ids": ids, "vs_currencies": "usd", "include_24hr_change": "true"},
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as e:
        log.error(f"Price fetch failed: {e}")
        return None


def check_alerts(prices, config):
    """Check prices against sell zones and return triggered alerts"""
    alerts = []
    alert_log = load_alert_log()
    cooldown = timedelta(hours=config.get("cooldown_hours", 4))

    for coin, zones in config.get("sell_zones", {}).items():
        coin_id = COIN_IDS.get(coin)
        if not coin_id or coin_id not in prices:
            continue

        current_price = prices[coin_id]["usd"]
        change_24h = prices[coin_id].get("usd_24h_change", 0)

        for zone in zones:
            target = zone["price"]
            label = zone["label"]
            threshold_pct = zone.get("alert_threshold_pct", 2)

            pct_away = ((target - current_price) / current_price) * 100

            if abs(pct_away) <= threshold_pct:
                alert_key = f"{coin}_{label}_{target}"

                # Check cooldown
                last_sent = alert_log.get(alert_key)
                if last_sent:
                    last_time = datetime.fromisoformat(last_sent)
                    if datetime.now() - last_time < cooldown:
                        continue

                alerts.append({
                    "coin": coin,
                    "label": label,
                    "target": target,
                    "current": current_price,
                    "pct_away": round(pct_away, 2),
                    "change_24h": round(change_24h, 2),
                })

                alert_log[alert_key] = datetime.now().isoformat()

    save_alert_log(alert_log)
    return alerts


def send_email_sendgrid(alerts, config):
    """Send alert email via SendGrid"""
    api_key = os.environ.get("SENDGRID_API_KEY")
    if not api_key:
        log.warning("SENDGRID_API_KEY not set, skipping email")
        return False

    to_email = config.get("email_to", os.environ.get("ALERT_EMAIL"))
    from_email = config.get("email_from", "alerts@cryptointel.io")

    if not to_email:
        log.warning("No destination email configured")
        return False

    subject = f"Crypto Alert: {len(alerts)} sell zone(s) triggered"
    body = format_alert_email(alerts)

    try:
        resp = requests.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": from_email, "name": "Crypto Intel Alerts"},
                "subject": subject,
                "content": [
                    {"type": "text/plain", "value": body},
                    {"type": "text/html", "value": format_alert_email_html(alerts)},
                ],
            },
            timeout=15,
        )
        resp.raise_for_status()
        log.info(f"Alert email sent to {to_email}")
        return True
    except requests.RequestException as e:
        log.error(f"SendGrid email failed: {e}")
        return False


def send_email_smtp(alerts, config):
    """Send alert email via SMTP (Gmail/ProtonMail)"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER")
    smtp_pass = os.environ.get("SMTP_PASS")
    to_email = config.get("email_to", os.environ.get("ALERT_EMAIL"))

    if not all([smtp_user, smtp_pass, to_email]):
        log.warning("SMTP credentials not fully configured")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"Crypto Alert: {len(alerts)} sell zone(s) triggered"
    msg["From"] = smtp_user
    msg["To"] = to_email

    msg.attach(MIMEText(format_alert_email(alerts), "plain"))
    msg.attach(MIMEText(format_alert_email_html(alerts), "html"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        log.info(f"SMTP alert email sent to {to_email}")
        return True
    except Exception as e:
        log.error(f"SMTP email failed: {e}")
        return False


def format_alert_email(alerts):
    """Format alert as plain text"""
    lines = [
        "=== CRYPTO SELL ZONE ALERT ===",
        f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M UTC')}",
        "",
    ]
    for a in alerts:
        lines.append(
            f"{a['coin']} | {a['label']} | "
            f"Current: ${a['current']:,.2f} | "
            f"Target: ${a['target']:,.2f} | "
            f"{a['pct_away']:+.1f}% away | "
            f"24h: {a['change_24h']:+.1f}%"
        )
    lines.append("")
    lines.append("— Crypto Intelligence Dashboard")
    return "\n".join(lines)


def format_alert_email_html(alerts):
    """Format alert as HTML"""
    rows = ""
    for a in alerts:
        color = "#ff4444" if abs(a["pct_away"]) <= 1 else "#f0b429"
        rows += f"""
        <tr>
          <td style="padding:8px;border-bottom:1px solid #222;color:{color};font-weight:bold">{a['coin']}</td>
          <td style="padding:8px;border-bottom:1px solid #222">{a['label']}</td>
          <td style="padding:8px;border-bottom:1px solid #222;font-family:monospace">${a['current']:,.2f}</td>
          <td style="padding:8px;border-bottom:1px solid #222;font-family:monospace">${a['target']:,.2f}</td>
          <td style="padding:8px;border-bottom:1px solid #222;color:{color}">{a['pct_away']:+.1f}%</td>
        </tr>
        """

    return f"""
    <div style="font-family:Arial,sans-serif;background:#0d0d14;color:#e8e8f0;padding:24px;border-radius:8px;max-width:600px">
      <h2 style="color:#f0b429;margin-bottom:4px;">Sell Zone Alert</h2>
      <p style="color:#666680;font-size:13px;margin-bottom:16px">{datetime.now().strftime('%Y-%m-%d %H:%M UTC')}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr style="color:#666680;font-size:12px;text-transform:uppercase">
          <th style="text-align:left;padding:8px;border-bottom:1px solid #333">Coin</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #333">Zone</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #333">Current</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #333">Target</th>
          <th style="text-align:left;padding:8px;border-bottom:1px solid #333">Away</th>
        </tr>
        {rows}
      </table>
      <p style="color:#666680;font-size:12px;margin-top:16px;">— Crypto Intelligence Dashboard</p>
    </div>
    """


def run_check():
    """Run a single price check cycle"""
    config = load_config()
    prices = fetch_prices()

    if not prices:
        log.error("Could not fetch prices, skipping cycle")
        return

    alerts = check_alerts(prices, config)

    if not alerts:
        log.info("No sell zones triggered")
        return

    log.info(f"{len(alerts)} sell zone(s) triggered!")
    for a in alerts:
        log.info(f"  {a['coin']} {a['label']}: ${a['current']:,.2f} -> ${a['target']:,.2f} ({a['pct_away']:+.1f}%)")

    # Try SendGrid first, fall back to SMTP
    email_method = config.get("email_method", "sendgrid")
    if email_method == "sendgrid":
        if not send_email_sendgrid(alerts, config):
            send_email_smtp(alerts, config)
    else:
        if not send_email_smtp(alerts, config):
            send_email_sendgrid(alerts, config)


def main():
    if "--daemon" in sys.argv:
        interval = 300  # 5 minutes
        log.info(f"Starting daemon mode (checking every {interval}s)")
        while True:
            run_check()
            time.sleep(interval)
    else:
        run_check()


if __name__ == "__main__":
    main()
