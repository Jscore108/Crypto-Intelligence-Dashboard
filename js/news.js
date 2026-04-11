// ============================================================
// news.js — News Feed Logic
// ============================================================

const News = (() => {

  const CRYPTOPANIC_BASE = 'https://cryptopanic.com/api/free/v1/posts/';
  const COINGECKO_NEWS = 'https://api.coingecko.com/api/v3/news';

  /**
   * Fetch crypto news from CoinGecko (free, no key needed)
   */
  async function fetchCryptoNews() {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(COINGECKO_NEWS, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.data || data;
    } catch (err) {
      console.error('[News] Crypto news fetch failed:', err);
      return null;
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
    const bullish = ['surge', 'soar', 'rally', 'gain', 'rise', 'bull', 'record', 'high', 'breakout', 'pump', 'moon', 'adoption', 'approve', 'bullish', 'growth', 'up '];
    const bearish = ['crash', 'plunge', 'drop', 'fall', 'bear', 'sell', 'dump', 'fear', 'risk', 'warn', 'decline', 'low', 'hack', 'scam', 'fraud', 'ban', 'bearish', 'down '];

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
          <div class="empty-state__text">No news available. API may be rate limited.</div>
        </div>
      `;
      return;
    }

    const items = articles.slice(0, 20);
    container.innerHTML = items.map(article => {
      const title = article.title || 'Untitled';
      const source = article.author || article.source || 'Unknown';
      const url = article.url || '#';
      const date = article.updated_at || article.created_at || '';
      const sentiment = detectSentiment(title);

      return `
        <div class="news-card">
          <div class="news-card__source">${escapeHtml(source)}</div>
          <div class="news-card__title">
            <a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(title)}</a>
          </div>
          <div class="news-card__meta">
            <span>${date ? timeAgo(date) : ''}</span>
            <span class="news-card__sentiment news-card__sentiment--${sentiment}">${sentiment}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Render macro/world news placeholder
   * (NewsAPI requires a key - show setup instructions)
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
