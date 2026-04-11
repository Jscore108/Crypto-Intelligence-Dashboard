// ============================================================
// news.js — News Feed Logic
// Uses multiple free sources with fallbacks
// ============================================================

const News = (() => {

  /**
   * Fetch crypto news — tries multiple free sources
   */
  async function fetchCryptoNews() {
    // Try CoinGecko trending + top gainers as "market news"
    try {
      const [trending, markets] = await Promise.all([
        fetchJSON('https://api.coingecko.com/api/v3/search/trending'),
        fetchJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h'),
      ]);

      const articles = [];

      // Trending coins as news items
      if (trending?.coins) {
        trending.coins.slice(0, 7).forEach(item => {
          const coin = item.item;
          const priceChange = coin.data?.price_change_percentage_24h?.usd;
          const changeStr = priceChange ? `${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(1)}%` : '';
          articles.push({
            title: `${coin.name} (${coin.symbol.toUpperCase()}) is trending — ${changeStr} in 24h`,
            source: 'CoinGecko Trending',
            url: `https://www.coingecko.com/en/coins/${coin.id}`,
            date: new Date().toISOString(),
            type: 'trending',
          });
        });
      }

      // Big movers as news
      if (markets && markets.length > 0) {
        const sorted = [...markets].sort((a, b) =>
          Math.abs(b.price_change_percentage_24h || 0) - Math.abs(a.price_change_percentage_24h || 0)
        );
        sorted.slice(0, 8).forEach(coin => {
          const change = coin.price_change_percentage_24h || 0;
          const direction = change >= 0 ? 'up' : 'down';
          const verb = change >= 0 ? 'gains' : 'drops';
          articles.push({
            title: `${coin.name} ${verb} ${Math.abs(change).toFixed(1)}% — now $${coin.current_price.toLocaleString()}`,
            source: `Market ${direction === 'up' ? 'Gainer' : 'Mover'}`,
            url: `https://www.coingecko.com/en/coins/${coin.id}`,
            date: new Date().toISOString(),
            type: 'market',
            sentiment: change > 3 ? 'bullish' : change < -3 ? 'bearish' : 'neutral',
          });
        });
      }

      if (articles.length > 0) return articles;
    } catch (err) {
      console.error('[News] Trending/markets fetch failed:', err);
    }

    return null;
  }

  /**
   * Helper to fetch JSON with timeout
   */
  async function fetchJSON(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Format time ago string
   */
  function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  /**
   * Simple sentiment detection from headline
   */
  function detectSentiment(title) {
    const lower = title.toLowerCase();
    const bullish = ['surge', 'soar', 'rally', 'gain', 'gains', 'rise', 'bull', 'record', 'high', 'breakout', 'pump', 'moon', 'adoption', 'approve', 'bullish', 'growth', 'up '];
    const bearish = ['crash', 'plunge', 'drop', 'drops', 'fall', 'bear', 'sell', 'dump', 'fear', 'risk', 'warn', 'decline', 'low', 'hack', 'scam', 'fraud', 'ban', 'bearish', 'down '];

    let score = 0;
    bullish.forEach(w => { if (lower.includes(w)) score++; });
    bearish.forEach(w => { if (lower.includes(w)) score--; });

    if (score > 0) return 'bullish';
    if (score < 0) return 'bearish';
    return 'neutral';
  }

  /**
   * Render crypto news into container
   */
  function renderCryptoNews(containerId, articles) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!articles || articles.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__text">No news available. API may be rate limited — will retry in 15 minutes.</div>
        </div>
      `;
      return;
    }

    const items = articles.slice(0, 20);
    container.innerHTML = items.map(article => {
      const title = article.title || 'Untitled';
      const source = article.source || 'Market Data';
      const url = article.url || '#';
      const date = article.date || article.updated_at || article.created_at || '';
      const sentiment = article.sentiment || detectSentiment(title);
      const typeIcon = article.type === 'trending' ? '&#x1F525;' : '&#x1F4C8;';

      return `
        <div class="news-card">
          <div class="news-card__source">${typeIcon} ${escapeHtml(source)}</div>
          <div class="news-card__title">
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(title)}</a>
          </div>
          <div class="news-card__meta">
            <span>${date ? timeAgo(date) : 'Live'}</span>
            <span class="news-card__sentiment news-card__sentiment--${sentiment}">${sentiment}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render macro/world news placeholder
   */
  function renderMacroNews(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon" style="font-size:2rem;">&#x1F30D;</div>
        <div class="empty-state__text" style="margin-top:12px;">
          <strong>Macro News</strong><br>
          <span style="color:var(--text-muted);font-size:0.82rem;">
            To enable world/macro news, add your NewsAPI.org key to the configuration.<br>
            Get a free key at <a href="https://newsapi.org" target="_blank" rel="noopener">newsapi.org</a>
          </span>
        </div>
      </div>
    `;
  }

  /**
   * Escape HTML to prevent XSS
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return {
    fetchCryptoNews,
    renderCryptoNews,
    renderMacroNews,
    timeAgo,
    detectSentiment,
  };
})();
