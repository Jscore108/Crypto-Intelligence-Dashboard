// ============================================================
// marquee.js — Top 20 coin ticker (no stablecoins)
// Uses cached data from localStorage or fetches independently
// ============================================================

(function() {
  const STABLES = ['tether', 'usd-coin', 'dai', 'ethena-usde', 'first-digital-usd', 'binance-peg-busd', 'true-usd', 'pax-dollar', 'usds', 'staked-ether'];

  function renderMarquee(coins) {
    const container = document.getElementById('coin-marquee-track');
    if (!container || !coins || coins.length === 0) return;

    const filtered = coins.filter(c => !STABLES.includes(c.id)).slice(0, 20);
    if (filtered.length === 0) return;

    const html = filtered.map(c => {
      const change = c.price_change_percentage_24h || 0;
      const sign = change >= 0 ? '+' : '';
      const dir = change >= 0 ? 'up' : 'down';
      const price = c.current_price >= 1
        ? '$' + c.current_price.toLocaleString(undefined, {maximumFractionDigits: 2})
        : '$' + c.current_price.toFixed(4);
      const logo = c.image ? `<img class="coin-marquee__logo" src="${c.image}" alt="" loading="lazy">` : '';

      return `<div class="coin-marquee__item">
        ${logo}
        <span class="coin-marquee__symbol">${c.symbol.toUpperCase()}</span>
        <span class="coin-marquee__price">${price}</span>
        <span class="coin-marquee__change coin-marquee__change--${dir}">${sign}${change.toFixed(1)}%</span>
      </div>`;
    }).join('');

    container.innerHTML = html + html; // duplicate for seamless loop
  }

  function tryLoadFromCache() {
    try {
      const cached = localStorage.getItem('ci_api_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        const marketsKey = Object.keys(parsed).find(k => k.startsWith('markets_top'));
        if (marketsKey && parsed[marketsKey]?.data) {
          renderMarquee(parsed[marketsKey].data);
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  async function fetchAndRender() {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=25&page=1&sparkline=false');
      if (!res.ok) return;
      const coins = await res.json();
      if (Array.isArray(coins)) renderMarquee(coins);
    } catch (_) {}
  }

  // Try cache immediately, then fetch fresh data after delay
  if (!tryLoadFromCache()) {
    // No cache — fetch after short delay
    setTimeout(fetchAndRender, 2000);
  }

  // Refresh every 60 seconds
  setInterval(() => {
    if (!tryLoadFromCache()) fetchAndRender();
  }, 60000);
})();
