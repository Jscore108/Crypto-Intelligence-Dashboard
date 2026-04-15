// ============================================================
// marquee.js — Top 20 coin ticker (no stablecoins)
// ============================================================

(function() {
  const STABLES = ['tether', 'usd-coin', 'dai', 'ethena-usde', 'first-digital-usd', 'binance-peg-busd', 'true-usd', 'pax-dollar', 'usds'];

  async function loadMarquee() {
    const container = document.getElementById('coin-marquee-track');
    if (!container) return;

    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1&sparkline=false');
      if (!res.ok) return;
      const coins = await res.json();
      if (!Array.isArray(coins)) return;

      const filtered = coins.filter(c => !STABLES.includes(c.id)).slice(0, 20);

      const html = filtered.map(c => {
        const change = c.price_change_percentage_24h || 0;
        const sign = change >= 0 ? '+' : '';
        const dir = change >= 0 ? 'up' : 'down';
        const price = c.current_price >= 1
          ? '$' + c.current_price.toLocaleString(undefined, {maximumFractionDigits: 2})
          : '$' + c.current_price.toFixed(6);
        const logo = c.image ? `<img class="coin-marquee__logo" src="${c.image}" alt="">` : '';

        return `<div class="coin-marquee__item">
          ${logo}
          <span class="coin-marquee__symbol">${c.symbol.toUpperCase()}</span>
          <span class="coin-marquee__price">${price}</span>
          <span class="coin-marquee__change coin-marquee__change--${dir}">${sign}${change.toFixed(1)}%</span>
        </div>`;
      }).join('');

      // Duplicate for seamless loop
      container.innerHTML = html + html;
    } catch (_) {}
  }

  // Load after a delay to avoid rate limiting
  setTimeout(loadMarquee, 3000);
  // Refresh every 60 seconds
  setInterval(loadMarquee, 60000);
})();
