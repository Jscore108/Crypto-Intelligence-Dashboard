// ============================================================
// news.js — Crypto + Macro News Feeds
// Uses CryptoCompare + RSS feeds with multiple fallbacks
// ============================================================

const News = (() => {

  const CRYPTOCOMPARE = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
  const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';

  // RSS feeds for crypto news
  const CRYPTO_FEEDS = [
    { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph' },
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk' },
    { url: 'https://decrypt.co/feed', name: 'Decrypt' },
  ];

  // RSS feeds for macro/world news
  const MACRO_FEEDS = [
    { url: 'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^DJI,^GSPC,^IXIC&region=US&lang=en-US', name: 'Yahoo Finance' },
    { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC' },
    { url: 'https://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch' },
  ];

  /**
   * Fetch JSON with timeout
   */
  async function fetchJSON(url, timeoutMs = 12000) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
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

  /**
   * Fetch RSS feed via rss2json
   */
  async function fetchRSS(feedUrl, feedName) {
    const data = await fetchJSON(
      RSS2JSON + encodeURIComponent(feedUrl) + '&count=10',
      10000
    );
    if (!data || data.status !== 'ok' || !data.items) return [];
    return data.items.map(item => ({
      title: item.title || '',
      url: item.link || '#',
      source: feedName,
      date: item.pubDate || '',
      description: stripHtml(item.description || '').slice(0, 160),
      image: item.thumbnail || item.enclosure?.link || extractImage(item.content || item.description) || null,
    }));
  }

  /**
   * Fetch crypto news — tries CryptoCompare first, then RSS feeds
   */
  async function fetchCryptoNews() {
    let articles = [];

    // Strategy 1: CryptoCompare (aggregates from 30+ outlets)
    try {
      const data = await fetchJSON(CRYPTOCOMPARE);
      if (data?.Data?.length > 0) {
        articles = data.Data.slice(0, 20).map(item => ({
          title: item.title,
          url: item.url || item.guid,
          source: item.source_info?.name || item.source || 'Crypto News',
          date: item.published_on ? new Date(item.published_on * 1000).toISOString() : '',
          description: (item.body || '').slice(0, 160),
          image: item.imageurl || null,
        }));
        if (articles.length > 0) return articles;
      }
    } catch (e) {
      console.warn('[News] CryptoCompare failed:', e.message);
    }

    // Strategy 2: RSS feeds in parallel
    try {
      const results = await Promise.allSettled(
        CRYPTO_FEEDS.map(f => fetchRSS(f.url, f.name))
      );
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.length > 0) {
          articles.push(...r.value);
        }
      });
      // Sort by date
      articles.sort((a, b) => new Date(b.date) - new Date(a.date));
      if (articles.length > 0) return articles.slice(0, 20);
    } catch (e) {
      console.warn('[News] RSS feeds failed:', e.message);
    }

    return null;
  }

  /**
   * Fetch macro/world news from financial RSS feeds
   */
  async function fetchMacroNews() {
    let articles = [];

    try {
      const results = await Promise.allSettled(
        MACRO_FEEDS.map(f => fetchRSS(f.url, f.name))
      );
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.length > 0) {
          articles.push(...r.value);
        }
      });
      articles.sort((a, b) => new Date(b.date) - new Date(a.date));
      if (articles.length > 0) return articles.slice(0, 20);
    } catch (e) {
      console.warn('[News] Macro feeds failed:', e.message);
    }

    return null;
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
    const bullish = ['surge', 'soar', 'rally', 'gain', 'gains', 'rise', 'rises', 'bull', 'record', 'high', 'breakout', 'pump', 'moon', 'adoption', 'approve', 'bullish', 'growth', 'launch', 'partner', 'etf', 'up '];
    const bearish = ['crash', 'plunge', 'drop', 'drops', 'fall', 'falls', 'bear', 'sell', 'dump', 'fear', 'risk', 'warn', 'decline', 'low', 'hack', 'scam', 'fraud', 'ban', 'bearish', 'lawsuit', 'sec ', 'fine', 'down '];
    let score = 0;
    bullish.forEach(w => { if (lower.includes(w)) score++; });
    bearish.forEach(w => { if (lower.includes(w)) score--; });
    if (score > 0) return 'bullish';
    if (score < 0) return 'bearish';
    return 'neutral';
  }

  /**
   * Render news articles with images
   */
  function renderNews(containerId, articles) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!articles || articles.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__text">No articles available. Will retry in 15 minutes.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = articles.slice(0, 20).map(article => {
      const sentiment = detectSentiment(article.title);
      const hasImage = article.image && article.image.length > 10 && !article.image.includes('default');

      const imgHtml = hasImage
        ? `<div class="news-card__image"><img src="${escapeHtml(article.image)}" alt="" loading="lazy" onerror="this.parentElement.style.display='none';this.closest('.news-card').classList.remove('news-card--with-image')"></div>`
        : '';

      return `
        <a href="${escapeHtml(article.url)}" target="_blank" rel="noopener" class="news-card ${hasImage ? 'news-card--with-image' : ''}">
          ${imgHtml}
          <div class="news-card__content">
            <div class="news-card__source">${escapeHtml(article.source)}</div>
            <div class="news-card__title">${escapeHtml(article.title)}</div>
            ${article.description ? `<div class="news-card__desc">${escapeHtml(article.description)}...</div>` : ''}
            <div class="news-card__meta">
              <span>${article.date ? timeAgo(article.date) : ''}</span>
              <span class="news-card__sentiment news-card__sentiment--${sentiment}">${sentiment}</span>
            </div>
          </div>
        </a>
      `;
    }).join('');
  }

  // Aliases for backward compat
  function renderCryptoNews(id, articles) { renderNews(id, articles); }
  function renderMacroNews(id, articles) {
    if (articles) {
      renderNews(id, articles);
    } else {
      const container = document.getElementById(id);
      if (container) container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__text">Loading macro news...</div>
        </div>`;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  return {
    fetchCryptoNews,
    fetchMacroNews,
    renderCryptoNews,
    renderMacroNews,
    renderNews,
    timeAgo,
    detectSentiment,
  };
})();
