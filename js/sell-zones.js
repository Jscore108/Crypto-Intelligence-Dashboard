// ============================================================
// sell-zones.js — Sell Zone Tracker Logic
// ============================================================

const SellZones = (() => {

  const ZONES = {
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
      { label: "1.618 Fib", price: 38 },
      { label: "ATH", price: 53 },
      { label: "2.618 Fib", price: 60 },
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
      { label: "0.382 Fib", price: 0.82 },
      { label: "0.5 Fib", price: 1.04 },
      { label: "0.618 Fib", price: 1.28 },
      { label: "0.786 Fib", price: 1.55 },
    ],
    WIF: [
      { label: "T1", price: 0.90 },
      { label: "T2", price: 1.50 },
      { label: "T3", price: 2.08 },
      { label: "T4", price: 3.20 },
    ],
  };

  /**
   * Calculate zone data for a coin
   */
  function calculateZoneData(coin, currentPrice) {
    const zones = ZONES[coin];
    if (!zones || currentPrice === undefined || currentPrice === null) return [];

    return zones.map(zone => {
      const pctAway = ((zone.price - currentPrice) / currentPrice) * 100;
      const multiple = zone.price / currentPrice;
      const progress = Math.min(100, (currentPrice / zone.price) * 100);
      const inZone = Math.abs(pctAway) <= 2;
      const reached = currentPrice >= zone.price;

      let progressColor;
      if (reached || inZone) progressColor = 'red';
      else if (pctAway <= 10) progressColor = 'orange';
      else if (pctAway <= 20) progressColor = 'yellow';
      else progressColor = 'green';

      return {
        coin,
        label: zone.label,
        target: zone.price,
        current: currentPrice,
        pctAway,
        multiple,
        progress,
        progressColor,
        inZone,
        reached,
      };
    });
  }

  /**
   * Format price appropriately
   */
  function formatPrice(val) {
    if (val === null || val === undefined) return '--';
    if (val >= 1000) return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (val >= 1) return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 });
    return '$' + Number(val).toFixed(6);
  }

  /**
   * Render all zones into a container
   */
  function render(containerId, prices) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let html = '';

    for (const [coin, zones] of Object.entries(ZONES)) {
      const coinId = API.COIN_IDS[coin];
      const priceData = prices?.[coinId];
      const currentPrice = priceData?.usd;

      // Coin header
      html += `
        <div style="margin-bottom: 24px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
            <span class="font-mono" style="font-size:1.1rem;font-weight:700;color:var(--accent-gold)">${coin}</span>
            <span class="font-mono" style="font-size:0.9rem;color:var(--text-primary)">${currentPrice ? formatPrice(currentPrice) : 'Loading...'}</span>
            ${priceData?.usd_24h_change !== undefined ? `
              <span class="top-bar__change top-bar__change--${priceData.usd_24h_change >= 0 ? 'up' : 'down'}">
                ${priceData.usd_24h_change >= 0 ? '+' : ''}${priceData.usd_24h_change.toFixed(2)}%
              </span>
            ` : ''}
          </div>
      `;

      if (!currentPrice) {
        html += `<div class="text-muted" style="padding:12px;font-size:0.85rem;">Price data unavailable</div></div>`;
        continue;
      }

      const zoneData = calculateZoneData(coin, currentPrice);
      for (const z of zoneData) {
        html += `
          <div class="sell-zone-row">
            <div class="sell-zone-row__coin">${z.coin}</div>
            <div class="sell-zone-row__label">${z.label}</div>
            <div style="flex:1;min-width:0;">
              <div class="progress-bar">
                <div class="progress-bar__fill progress-bar__fill--${z.progressColor}"
                     style="width:${z.progress}%"></div>
              </div>
            </div>
            <div class="sell-zone-row__price">${formatPrice(z.target)}</div>
            <div class="sell-zone-row__multiple">${z.multiple.toFixed(2)}x</div>
            <div class="sell-zone-row__pct" style="color:${z.reached ? 'var(--accent-green)' : z.pctAway < 10 ? 'var(--accent-red)' : 'var(--text-muted)'}">
              ${z.reached ? 'REACHED' : z.pctAway.toFixed(1) + '% away'}
            </div>
          </div>
          ${z.inZone ? '<div style="text-align:right;margin-top:-4px;margin-bottom:8px;"><span class="in-zone-badge">IN ZONE</span></div>' : ''}
        `;
      }

      html += '</div>';
    }

    container.innerHTML = html;
  }

  return {
    ZONES,
    calculateZoneData,
    render,
    formatPrice,
  };
})();
