// ============================================================
// news.js — News Feed from CoinDesk + CryptoNews via RSS
// ============================================================

const News = (() => {

  const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';

  const FEEDS = {
    coindesk: {
      url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
      name: 'CoinDesk',
      icon: 'https://www.coindesk.com/resizer/fk6MJUVy3VsmKSxKcj6EkxmkI7k=/144x32/downloads.coindesk.com/arc/failsafe/feeds/coindesk-feed-logo.png',
    },
    cryptonews: {
      url: 'https://cryptonews.net/rss/',
      name: 'CryptoNews',
      icon: null,
    },
  };

  /**
   * Fetch RSS feed via rss2json proxy
   */
  async function fetchFeed(feedKey) {
    const feed = FEEDS[feedKey];
    if (!feed) return null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        RSS2JSON + encodeURIComponent(feed.url) + '&count=15',
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.status !== 'ok' || !data.items) return null;

      return data.items.map(item => ({
        title: item.title || 'Untitled',
        url: item.link || '#',
        source: feed.name,
        date: item.pubDate || '',
        description: stripHtml(item.description || '').slice(0, 150),
        image: item.thumbnail || item.enclosure?.link || extractImage(item.description) || null,
      }));
    } catch (err) {
      console.error(`[News] ${feed.name} fetch failed:`, err);
      return null;
    }
  }

  /**
   * Fetch all crypto news from multiple sources
   */
  async function fetchCryptoNews() {
    const [coindesk, cryptonews] = await Promise.all([
      fetchFeed('coindesk'),
      fetchFeed('cryptonews'),
    ]);

    // Merge and interleave articles from both sources
    const articles = [];
    const cd = coindesk || [];
    const cn = cryptonews || [];
    const maxLen = Math.max(cd.length, cn.length);

    for (let i = 0; i < maxLen; i++) {
      if (i < cd.length) articles.push(cd[i]);
      if (i < cn.length) articles.push(cn[i]);
    }

    // Also try CoinGecko trending as fallback if both feeds fail
    if (articles.length === 0) {
      try {
        const trending = await fetch('https://api.coingecko.com/api/v3/search/trending').then(r => r.json());
        if (trending?.coins) {
          trending.coins.slice(0, 10).forEach(item => {
            const coin = item.item;
            const change = coin.data?.price_change_percentage_24h?.usd;
            articles.push({
              title: `${coin.name} (${coin.symbol.toUpperCase()}) is trending${change ? ` — ${change >= 0 ? '+' : ''}${change.toFixed(1)}%` : ''}`,
              source: 'CoinGecko Trending',
              url: `https://www.coingecko.com/en/coins/${coin.id}`,
              date: new Date().toISOString(),
              image: coin.thumb || coin.small || null,
              description: '',
            });
          });
        }
      } catch (_) {}
    }

    return articles.length > 0 ? articles : null;
  }

  /**
   * Strip HTML tags from string
   */
  function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }

  /**
   * Extract first image URL from HTML content
   */
  function extractImage(html) {
    if (!html) return null;
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match ? match[1] : null;
  }

  /**
   * Format time ago string
   */
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

  /**
   * Simple sentiment detection from headline
   */
  function detectSentiment(title) {
    const lower = title.toLowerCase();
    const bullish = ['surge', 'soar', 'rally', 'gain', 'gains', 'rise', 'rises', 'bull', 'record', 'high', 'breakout', 'pump', 'moon', 'adoption', 'approve', 'bullish', 'growth', 'launch', 'partner'];
    const bearish = ['crash', 'plunge', 'drop', 'drops', 'fall', 'falls', 'bear', 'sell', 'dump', 'fear', 'risk', 'warn', 'decline', 'low', 'hack', 'scam', 'fraud', 'ban', 'bearish', 'lawsuit', 'sec ', 'fine'];

    let score = 0;
    bullish.forEach(w => { if (lower.includes(w)) score++; });
    bearish.forEach(w => { if (lower.includes(w)) score--; });

    if (score > 0) return 'bullish';
    if (score < 0) return 'bearish';
    return 'neutral';
  }

  /**
   * Render crypto news with images
   */
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
      const imgHtml = article.image
        ? `<div class="news-card__image"><img src="${escapeHtml(article.image)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`
        : '';

      return `
        <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener" class="news-card news-card--with-image">
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
