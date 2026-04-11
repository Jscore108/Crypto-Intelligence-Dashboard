// ============================================================
// api.js — Crypto Intelligence Dashboard Data Layer
// All API fetch functions, caching, and error handling
// ============================================================

const API = (() => {
  // --- Cache ---
  const cache = {};
  const CACHE_TTL = {
    prices: 60 * 1000,        // 60s
    fng: 5 * 60 * 1000,       // 5min
    global: 5 * 60 * 1000,    // 5min
    markets: 5 * 60 * 1000,   // 5min
    historical: 30 * 60 * 1000, // 30min
    news: 15 * 60 * 1000,     // 15min
  };

  function getCached(key) {
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > (CACHE_TTL[entry.type] || 60000)) {
      return null; // expired
    }
    return entry.data;
  }

  function setCache(key, data, type = 'prices') {
    cache[key] = { data, timestamp: Date.now(), type };
  }

  // --- Fetch with timeout and retry on rate limit ---
  async function rateLimitedFetch(url, options = {}, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeout);
        if (response.status === 429 && attempt < retries) {
          // Rate limited — wait and retry
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        return await response.json();
      } catch (err) {
        clearTimeout(timeout);
        if (attempt < retries && err.name !== 'AbortError') {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw err;
      }
    }
  }

  // --- Endpoints ---
  const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';
  const FNG_BASE = 'https://api.alternative.me/fng';

  // Coin IDs for CoinGecko
  const COIN_IDS = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    LINK: 'chainlink',
    BRETT: 'brett-based',
    POPCAT: 'popcat',
    WIF: 'dogwifcoin',
  };

  const ALL_IDS = Object.values(COIN_IDS).join(',');

  // ============================================================
  // Public API Methods
  // ============================================================

  /**
   * Fetch current prices for all tracked coins
   * Returns: { bitcoin: { usd, usd_24h_change, usd_market_cap }, ... }
   */
  async function getPrices() {
    const cacheKey = 'prices_all';
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      const data = await rateLimitedFetch(
        `${COINGECKO_BASE}/simple/price?ids=${ALL_IDS}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`
      );
      setCache(cacheKey, data, 'prices');
      return data;
    } catch (err) {
      console.error('[API] getPrices failed:', err);
      const stale = cache[cacheKey];
      if (stale) return stale.data;
      return null;
    }
  }

  /**
   * Fetch Fear & Greed Index (current + historical)
   * Returns: { value, value_classification, timestamp }
   */
  async function getFearGreed(limit = 1) {
    const cacheKey = `fng_${limit}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      const data = await rateLimitedFetch(`${FNG_BASE}/?limit=${limit}&format=json`);
      const result = data.data;
      setCache(cacheKey, result, 'fng');
      return result;
    } catch (err) {
      console.error('[API] getFearGreed failed:', err);
      const stale = cache[cacheKey];
      if (stale) return stale.data;
      return null;
    }
  }

  /**
   * Fetch global market data (BTC dominance, total market cap, etc.)
   */
  async function getGlobalData() {
    const cacheKey = 'global';
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      const data = await rateLimitedFetch(`${COINGECKO_BASE}/global`);
      setCache(cacheKey, data.data, 'global');
      return data.data;
    } catch (err) {
      console.error('[API] getGlobalData failed:', err);
      const stale = cache[cacheKey];
      if (stale) return stale.data;
      return null;
    }
  }

  /**
   * Fetch top N coins by market cap (for alt season calc, gainers/losers)
   */
  async function getTopCoins(count = 50) {
    const cacheKey = `markets_top${count}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      const data = await rateLimitedFetch(
        `${COINGECKO_BASE}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${count}&page=1&sparkline=false&price_change_percentage=24h,7d`
      );
      setCache(cacheKey, data, 'markets');
      return data;
    } catch (err) {
      console.error('[API] getTopCoins failed:', err);
      const stale = cache[cacheKey];
      if (stale) return stale.data;
      return null;
    }
  }

  /**
   * Fetch historical price data for a coin (for charts)
   * days: 1, 7, 30, 90, 365, max
   */
  async function getHistoricalPrices(coinId, days = 365) {
    const cacheKey = `history_${coinId}_${days}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      const data = await rateLimitedFetch(
        `${COINGECKO_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
      );
      setCache(cacheKey, data, 'historical');
      return data;
    } catch (err) {
      console.error('[API] getHistoricalPrices failed:', err);
      const stale = cache[cacheKey];
      if (stale) return stale.data;
      return null;
    }
  }

  /**
   * Fetch BTC historical data for indicator calculations (MVRV, Pi Cycle)
   */
  async function getBTCHistory(days = 'max') {
    return getHistoricalPrices('bitcoin', days);
  }

  /**
   * Fetch Fear & Greed historical (30 days for chart)
   */
  async function getFearGreedHistory() {
    return getFearGreed(30);
  }

  /**
   * Calculate Alt Season Index from top 50 coins
   * Alt Season = % of top 50 altcoins outperforming BTC over 90d
   */
  async function getAltSeasonIndex() {
    const cacheKey = 'alt_season';
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      const coins = await getTopCoins(50);
      if (!coins || coins.length === 0) return null;

      const btc = coins.find(c => c.id === 'bitcoin');
      if (!btc) return null;

      const btcChange = btc.price_change_percentage_24h || 0;
      let outperformCount = 0;
      const alts = coins.filter(c => c.id !== 'bitcoin');

      alts.forEach(coin => {
        if ((coin.price_change_percentage_24h || 0) > btcChange) {
          outperformCount++;
        }
      });

      const index = Math.round((outperformCount / alts.length) * 100);
      const result = {
        value: index,
        outperforming: outperformCount,
        total: alts.length,
        label: index > 75 ? 'Alt Season' : index < 25 ? 'Bitcoin Season' : 'Neutral',
      };

      setCache(cacheKey, result, 'markets');
      return result;
    } catch (err) {
      console.error('[API] getAltSeasonIndex failed:', err);
      return null;
    }
  }

  /**
   * Get ETH/BTC ratio
   */
  async function getETHBTCRatio() {
    const cacheKey = 'eth_btc';
    const cached = getCached(cacheKey);
    if (cached) return cached;

    try {
      const data = await rateLimitedFetch(
        `${COINGECKO_BASE}/simple/price?ids=ethereum&vs_currencies=btc`
      );
      const ratio = data.ethereum.btc;
      setCache(cacheKey, ratio, 'prices');
      return ratio;
    } catch (err) {
      console.error('[API] getETHBTCRatio failed:', err);
      const stale = cache[cacheKey];
      if (stale) return stale.data;
      return null;
    }
  }

  /**
   * Fetch all dashboard data in parallel for speed
   */
  async function fetchAllDashboardData() {
    const [prices, fearGreed, global, ethBtcRatio, topCoins] = await Promise.all([
      getPrices().catch(() => null),
      getFearGreed().catch(() => null),
      getGlobalData().catch(() => null),
      getETHBTCRatio().catch(() => null),
      getTopCoins(50).catch(() => null),
    ]);

    // Alt season derived from topCoins (no extra fetch)
    let altSeason = null;
    if (topCoins && topCoins.length > 0) {
      try {
        const btc = topCoins.find(c => c.id === 'bitcoin');
        if (btc) {
          const btcChange = btc.price_change_percentage_24h || 0;
          const alts = topCoins.filter(c => c.id !== 'bitcoin');
          let outperformCount = 0;
          alts.forEach(coin => {
            if ((coin.price_change_percentage_24h || 0) > btcChange) outperformCount++;
          });
          const index = Math.round((outperformCount / alts.length) * 100);
          altSeason = {
            value: index,
            outperforming: outperformCount,
            total: alts.length,
            label: index > 75 ? 'Alt Season' : index < 25 ? 'Bitcoin Season' : 'Neutral',
          };
        }
      } catch (e) { /* skip */ }
    }

    return { prices, fearGreed, global, ethBtcRatio, altSeason, topCoins, timestamp: Date.now() };
  }

  /**
   * Get last update timestamp for a cache entry
   */
  function getLastUpdate(key) {
    const entry = cache[key] || cache[`prices_all`];
    return entry ? entry.timestamp : null;
  }

  // --- Public Interface ---
  return {
    getPrices,
    getFearGreed,
    getFearGreedHistory,
    getGlobalData,
    getTopCoins,
    getHistoricalPrices,
    getBTCHistory,
    getAltSeasonIndex,
    getETHBTCRatio,
    fetchAllDashboardData,
    getLastUpdate,
    COIN_IDS,
  };
})();
