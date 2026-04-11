// ============================================================
// news.js — Crypto News from CryptoCompare (free, includes images)
// Aggregates from CoinDesk, CryptoNews, Cointelegraph, etc.
// ============================================================

const News = (() => {

  // CryptoCompare free news API — aggregates from all major sources
  // including CoinDesk, CoinTelegraph, CryptoNews, etc.
  const CRYPTOCOMPARE_NEWS = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';

  /**
   * Fetch crypto news from CryptoCompare
   * Returns articles from CoinDesk, CryptoNews.net, Cointelegraph, etc.
   */
  async function fetchCryptoNews() {
    // Try CryptoCompare first (best source — has images + multiple outlets)
    try {
      const data = await fetchJSON(CRYPTOCOMPARE_NEWS);
      if (data && data.Data && data.Data.length > 0) {
        return data.Data.map(item => ({
          title: item.title,
          url: item.url || item.guid,
          source: item.source_info?.name || item.source || 'Crypto News',
          date: item.published_on ? new Date(item.published_on * 1000).toISOString() : '',
          description: (item.body || '').slice(0, 160),
          image: item.imageurl || null,
          categories: item.categories || '',
        }));
      }
    } catch (err) {
      console.error('[News] CryptoCompare failed:', err);
    }

    // Fallback: rss2json with CoinDesk RSS
    try {
      const rssData = await fetchJSON(
        'https://api.rss2json.com/v1/api.json?rss_url=' +
        encodeURIComponent('https://www.coindesk.com/arc/outboundfeeds/rss/') +
        '&count=20'
      );
      if (rssData && rssData.status === 'ok' && rssData.items) {
        return rssData.items.map(item => ({
          title: item.title,
          url: item.link,
          source: 'CoinDesk',
          date: item.pubDate || '',
          description: stripHtml(item.description || '').slice(0, 160),
          image: item.thumbnail || item.enclosure?.link || extractImage(item.description) || null,
          categories: '',
        }));
      }
    } catch (err) {
      console.error('[News] CoinDesk RSS fallback failed:', err);
    }

    // Last fallback: CoinGecko trending
    try {
      const trending = await fetchJSON('https://api.coingecko.com/api/v3/search/trending');
      if (trending?.coins) {
        return trending.coins.slice(0, 10).map(item => {
          const coin = item.item;
          const change = coin.data?.price_change_percentage_24h?.usd;
          return {
            title: `${coin.name} (${coin.symbol.toUpperCase()}) is trending${change ? ` — ${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : ''}`,
            source: 'CoinGecko Trending',
            url: `https://www.coingecko.com/en/coins/${coin.id}`,
            date: new Date().toISOString(),
            image: coin.large || coin.small || coin.thumb || null,
            description: '',
            categories: '',
          };
        });
      }
    } catch (_) {}

    return null;
  }

  async function fetchJSON(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || '';
  }

  function extractImage(html) {
    if (!html) return null;
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : null;
  }

  function timeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (isNaN(diff) || diff < 0) return '';
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  }

  function detectSentiment(title) {
    const lower = title.toLowerCase();
    const bullish = ['surge', 'soar', 'rally', 'gain', 'gains', 'rise', 'rises', 'bull', 'record', 'high', 'breakout', 'pump', 'moon', 'adoption', 'approve', 'bullish', 'growth', 'launch', 'partner', 'etf'];
    const bearish = ['crash', 'plunge', 'drop', 'drops', 'fall', 'falls', 'bear', 'sell', 'dump', 'fear', 'risk', 'warn', 'decline', 'low', 'hack', 'scam', 'fraud', 'ban', 'bearish', 'lawsuit', 'sec ', 'fine', 'investigation'];
    let score = 0;
    bullish.forEach(w => { if (lower.includes(w)) score++; });
    bearish.forEach(w => { if (lower.includes(w)) score--; });
    if (score > 0) return 'bullish';
    if (score < 0) return 'bearish';
    return 'neutral';
  }

  function renderCryptoNews(containerId, articles) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!articles || articles.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__text">No news available. Will retry in 15 minutes.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = articles.slice(0, 20).map(article => {
      const sentiment = detectSentiment(article.title);
      const hasImage = article.image && !article.image.includes('default');

      const imgHtml = hasImage
        ? `<div class="news-card__image"><img src="${escapeHtml(article.image)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
        : '';

      return `
        <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener" class="news-card ${hasImage ? 'news-card--with-image' : ''}">
          ${imgHtml}
          <div class="news-card__content">
            <div class="news-card__source">${escapeHtml(article.source)}</div>
            <div class="news-card__title">${escapeHtml(article.title)}</div>
            ${article.description ? `<div class="news-card__desc">${escapeHtml(article.description)}...</div>` : ''}
            <div class="news-card__meta">
              <span>${article.date ? timeAgo(article.date) : 'Live'}</span>
              <span class="news-card__sentiment news-card__sentiment--${sentiment}">${sentiment}</span>
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  function renderMacroNews(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon" style="font-size:2rem;">&#x1F30D;</div>
        <div class="empty-state__text" style="margin-top:12px;">
          <strong>Macro News</strong><br>
          <span style="color:var(--text-muted);font-size:0.82rem;">
            To enable world/macro news, add your NewsAPI.org key.<br>
            Get a free key at <a href="https://newsapi.org" target="_blank" rel="noopener">newsapi.org</a>
          </span>
        </div>
      </div>
    `;
  }

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
