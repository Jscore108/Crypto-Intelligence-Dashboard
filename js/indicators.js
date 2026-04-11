// ============================================================
// indicators.js — Indicator calculations and normalization
// ============================================================

const Indicators = (() => {

  /**
   * Calculate Simple Moving Average from price data
   * @param {number[]} prices - Array of closing prices
   * @param {number} period - SMA period
   */
  function SMA(prices, period) {
    if (prices.length < period) return null;
    const slice = prices.slice(-period);
    return slice.reduce((sum, p) => sum + p, 0) / period;
  }

  /**
   * Calculate RSI (Relative Strength Index)
   * @param {number[]} prices - Array of closing prices
   * @param {number} period - RSI period (default 14)
   */
  function RSI(prices, period = 14) {
    if (prices.length < period + 1) return null;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - period; i < prices.length; i++) {
      const diff = prices[i] - prices[i - 1];
      if (diff > 0) gains += diff;
      else losses -= diff;
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * Pi Cycle Top Indicator
   * Signal: 111-day MA crosses above 2x 350-day MA
   * @param {number[]} prices - Daily closing prices (need 350+ days)
   */
  function piCycleSignal(prices) {
    if (prices.length < 350) return { signal: 'N/A', value: 0, ma111: null, ma350x2: null };

    const ma111 = SMA(prices, 111);
    const ma350x2 = SMA(prices, 350) * 2;

    if (ma111 === null || ma350x2 === null) return { signal: 'N/A', value: 0, ma111, ma350x2 };

    const ratio = ma111 / ma350x2;
    let signal, value;

    if (ratio >= 1.0) {
      signal = 'CROSSED — TOP SIGNAL';
      value = 100;
    } else if (ratio >= 0.95) {
      signal = 'Approaching Cross';
      value = 80;
    } else if (ratio >= 0.85) {
      signal = 'Warming Up';
      value = 50;
    } else {
      signal = 'No Signal';
      value = 20;
    }

    return { signal, value, ratio, ma111, ma350x2 };
  }

  /**
   * Normalize Fear & Greed (already 0-100 scale)
   */
  function normalizeFearGreed(value) {
    return Math.max(0, Math.min(100, Number(value)));
  }

  /**
   * Get Fear & Greed zone label + color
   */
  function fearGreedZone(value) {
    const v = Number(value);
    if (v <= 25) return { label: 'Extreme Fear', color: 'green', zone: 'buy' };
    if (v <= 45) return { label: 'Fear', color: 'green', zone: 'buy' };
    if (v <= 55) return { label: 'Neutral', color: 'yellow', zone: 'neutral' };
    if (v <= 75) return { label: 'Greed', color: 'yellow', zone: 'caution' };
    return { label: 'Extreme Greed', color: 'red', zone: 'sell' };
  }

  /**
   * MVRV Z-Score interpretation
   * >7 = sell zone, <0 = buy zone
   * Since we may not always have on-chain data, this also estimates
   */
  function mvrvZone(zScore) {
    if (zScore === null || zScore === undefined) {
      return { label: 'No Data', color: 'yellow', normalized: 50 };
    }
    const z = Number(zScore);
    // Normalize to 0-100 where 0=buy, 100=sell
    // Map range [-2, 10] to [0, 100]
    const normalized = Math.max(0, Math.min(100, ((z + 2) / 12) * 100));

    let label, color;
    if (z >= 7) { label = 'Sell Zone'; color = 'red'; }
    else if (z >= 5) { label = 'Overheated'; color = 'red'; }
    else if (z >= 3) { label = 'Caution'; color = 'yellow'; }
    else if (z >= 1) { label = 'Neutral'; color = 'yellow'; }
    else if (z >= 0) { label = 'Accumulation'; color = 'green'; }
    else { label = 'Deep Value'; color = 'green'; }

    return { label, color, normalized };
  }

  /**
   * Puell Multiple interpretation
   * >2 = sell zone, <0.5 = buy zone
   */
  function puellZone(value) {
    if (value === null || value === undefined) {
      return { label: 'No Data', color: 'yellow', normalized: 50 };
    }
    const v = Number(value);
    // Normalize to 0-100: map [0, 4] to [0, 100]
    const normalized = Math.max(0, Math.min(100, (v / 4) * 100));

    let label, color;
    if (v >= 2) { label: 'Sell Zone'; color = 'red'; }
    else if (v >= 1.5) { label = 'Overheated'; color = 'red'; }
    else if (v >= 1) { label = 'Neutral'; color = 'yellow'; }
    else if (v >= 0.5) { label = 'Accumulation'; color = 'green'; }
    else { label = 'Deep Value'; color = 'green'; }

    return { label: label || 'Sell Zone', color, normalized };
  }

  /**
   * BTC Dominance interpretation
   * Rising = risk-off, Falling = alt season
   */
  function btcDominanceZone(dominance) {
    const d = Number(dominance);
    let label, color;
    if (d >= 60) { label = 'BTC Dominant'; color = 'yellow'; }
    else if (d >= 50) { label = 'Neutral'; color = 'yellow'; }
    else if (d >= 40) { label = 'Alts Gaining'; color = 'cyan'; }
    else { label = 'Alt Season'; color = 'green'; }
    return { label, color, value: d };
  }

  /**
   * ETH/BTC ratio interpretation
   */
  function ethBtcZone(ratio) {
    const r = Number(ratio);
    let label, color;
    if (r >= 0.08) { label = 'ETH Dominant'; color = 'green'; }
    else if (r >= 0.05) { label = 'Neutral'; color = 'yellow'; }
    else if (r >= 0.03) { label = 'BTC Favored'; color = 'yellow'; }
    else { label = 'ETH Weak'; color = 'red'; }
    return { label, color, value: r };
  }

  /**
   * Alt Season Index interpretation
   */
  function altSeasonZone(index) {
    const v = Number(index);
    let label, color;
    if (v >= 75) { label = 'Alt Season'; color = 'green'; }
    else if (v >= 50) { label = 'Warming Up'; color = 'yellow'; }
    else if (v >= 25) { label = 'BTC Favored'; color = 'yellow'; }
    else { label = 'Bitcoin Season'; color = 'red'; }
    return { label, color, value: v };
  }

  /**
   * Estimate MVRV Z-Score from price data when on-chain data unavailable
   * Uses a simplified model based on deviation from long-term average
   */
  function estimateMVRV(prices) {
    if (!prices || prices.length < 200) return null;
    const longTermAvg = SMA(prices, 200);
    const currentPrice = prices[prices.length - 1];
    if (!longTermAvg || longTermAvg === 0) return null;
    // Simplified: ratio of current price to 200 SMA, scaled
    const ratio = currentPrice / longTermAvg;
    // Map ratio [0.5, 3.0] to z-score [-2, 8]
    const estimated = ((ratio - 0.5) / 2.5) * 10 - 2;
    return Math.round(estimated * 100) / 100;
  }

  return {
    SMA,
    RSI,
    piCycleSignal,
    normalizeFearGreed,
    fearGreedZone,
    mvrvZone,
    puellZone,
    btcDominanceZone,
    ethBtcZone,
    altSeasonZone,
    estimateMVRV,
  };
})();
