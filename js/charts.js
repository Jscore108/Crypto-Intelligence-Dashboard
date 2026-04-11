// ============================================================
// charts.js — Chart rendering using TradingView Lightweight Charts
// ============================================================

const Charts = (() => {
  let chartInstances = {};

  const CHART_COLORS = {
    bg: '#111118',
    grid: '#1e1e2e',
    text: '#666680',
    crosshair: '#444460',
    gold: '#f0b429',
    cyan: '#00d4d4',
    red: '#ff4444',
    green: '#00ff88',
    orange: '#ff8c00',
  };

  /**
   * Default chart options
   */
  function getDefaultOptions() {
    return {
      layout: {
        background: { type: 'solid', color: CHART_COLORS.bg },
        textColor: CHART_COLORS.text,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: CHART_COLORS.grid },
        horzLines: { color: CHART_COLORS.grid },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: CHART_COLORS.crosshair, width: 1, style: 2 },
        horzLine: { color: CHART_COLORS.crosshair, width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: CHART_COLORS.grid,
      },
      timeScale: {
        borderColor: CHART_COLORS.grid,
        timeVisible: true,
      },
      handleScroll: true,
      handleScale: true,
    };
  }

  /**
   * Convert CoinGecko price data to chart format
   * CoinGecko returns: [[timestamp_ms, price], ...]
   */
  function toLineData(cgPrices) {
    if (!cgPrices || !Array.isArray(cgPrices)) return [];
    return cgPrices.map(([ts, val]) => ({
      time: Math.floor(ts / 1000),
      value: val,
    }));
  }

  /**
   * Create BTC Price Chart with sell zone lines
   */
  async function renderBTCPrice(containerId, days = 365) {
    const container = document.getElementById(containerId);
    if (!container || typeof LightweightCharts === 'undefined') return;

    container.innerHTML = '';
    const chart = LightweightCharts.createChart(container, {
      ...getDefaultOptions(),
      width: container.clientWidth,
      height: 300,
    });

    try {
      const data = await API.getHistoricalPrices('bitcoin', days);
      if (!data?.prices) throw new Error('No data');

      const lineData = toLineData(data.prices);

      const series = chart.addLineSeries({
        color: CHART_COLORS.gold,
        lineWidth: 2,
        crosshairMarkerRadius: 4,
        priceFormat: { type: 'price', precision: 0, minMove: 1 },
      });
      series.setData(lineData);

      // Draw sell zone lines
      const sellPrices = [126000, 167000];
      sellPrices.forEach(price => {
        series.createPriceLine({
          price: price,
          color: CHART_COLORS.red,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `$${(price / 1000).toFixed(0)}K`,
        });
      });

      chart.timeScale().fitContent();
      chartInstances[containerId] = chart;
    } catch (err) {
      container.innerHTML = `<div class="chart-loading">Failed to load chart data</div>`;
      console.error('[Charts] BTC Price error:', err);
    }
  }

  /**
   * Create ETH/BTC Ratio Chart
   */
  async function renderETHBTC(containerId, days = 365) {
    const container = document.getElementById(containerId);
    if (!container || typeof LightweightCharts === 'undefined') return;

    container.innerHTML = '';
    const chart = LightweightCharts.createChart(container, {
      ...getDefaultOptions(),
      width: container.clientWidth,
      height: 300,
    });

    try {
      // Fetch ETH prices in BTC
      const data = await API.getHistoricalPrices('ethereum', days);
      const btcData = await API.getHistoricalPrices('bitcoin', days);
      if (!data?.prices || !btcData?.prices) throw new Error('No data');

      // Calculate ETH/BTC ratio
      const ethPrices = new Map(data.prices.map(([ts, p]) => [Math.floor(ts / 86400000), p]));
      const ratioData = btcData.prices.map(([ts, btcP]) => {
        const day = Math.floor(ts / 86400000);
        const ethP = ethPrices.get(day);
        return ethP ? { time: Math.floor(ts / 1000), value: ethP / btcP } : null;
      }).filter(Boolean);

      const series = chart.addLineSeries({
        color: CHART_COLORS.cyan,
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      });
      series.setData(ratioData);
      chart.timeScale().fitContent();
      chartInstances[containerId] = chart;
    } catch (err) {
      container.innerHTML = `<div class="chart-loading">Failed to load chart data</div>`;
      console.error('[Charts] ETH/BTC error:', err);
    }
  }

  /**
   * Create Fear & Greed Index area chart
   */
  async function renderFearGreed(containerId) {
    const container = document.getElementById(containerId);
    if (!container || typeof LightweightCharts === 'undefined') return;

    container.innerHTML = '';
    const chart = LightweightCharts.createChart(container, {
      ...getDefaultOptions(),
      width: container.clientWidth,
      height: 300,
    });

    try {
      const data = await API.getFearGreedHistory();
      if (!data || data.length === 0) throw new Error('No data');

      const lineData = data.map(item => ({
        time: Number(item.timestamp),
        value: Number(item.value),
      })).sort((a, b) => a.time - b.time);

      const series = chart.addAreaSeries({
        lineColor: CHART_COLORS.orange,
        topColor: 'rgba(255, 140, 0, 0.3)',
        bottomColor: 'rgba(255, 140, 0, 0.02)',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 0, minMove: 1 },
      });
      series.setData(lineData);

      // Zone lines
      [25, 75].forEach(val => {
        series.createPriceLine({
          price: val,
          color: val === 25 ? CHART_COLORS.green : CHART_COLORS.red,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: val === 25 ? 'Fear' : 'Greed',
        });
      });

      chart.timeScale().fitContent();
      chartInstances[containerId] = chart;
    } catch (err) {
      container.innerHTML = `<div class="chart-loading">Failed to load chart data</div>`;
      console.error('[Charts] F&G error:', err);
    }
  }

  /**
   * Create BTC Dominance chart
   */
  async function renderBTCDominance(containerId, days = 365) {
    const container = document.getElementById(containerId);
    if (!container || typeof LightweightCharts === 'undefined') return;

    container.innerHTML = '';
    const chart = LightweightCharts.createChart(container, {
      ...getDefaultOptions(),
      width: container.clientWidth,
      height: 300,
    });

    try {
      // Use BTC market cap vs total as proxy
      const btcData = await API.getHistoricalPrices('bitcoin', days);
      if (!btcData?.market_caps) throw new Error('No data');

      // BTC dominance: use total_volumes as a proxy for activity
      // Since CoinGecko doesn't have dominance history on free tier,
      // we show BTC market cap trend
      const lineData = btcData.market_caps.map(([ts, val]) => ({
        time: Math.floor(ts / 1000),
        value: val / 1e9, // In billions
      }));

      const series = chart.addAreaSeries({
        lineColor: CHART_COLORS.gold,
        topColor: 'rgba(240, 180, 41, 0.2)',
        bottomColor: 'rgba(240, 180, 41, 0.02)',
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: 0,
          minMove: 1,
        },
      });
      series.setData(lineData);
      chart.timeScale().fitContent();
      chartInstances[containerId] = chart;
    } catch (err) {
      container.innerHTML = `<div class="chart-loading">Failed to load chart data</div>`;
      console.error('[Charts] BTC Dominance error:', err);
    }
  }

  /**
   * Create SOL price chart
   */
  async function renderSOLPrice(containerId, days = 365) {
    const container = document.getElementById(containerId);
    if (!container || typeof LightweightCharts === 'undefined') return;

    container.innerHTML = '';
    const chart = LightweightCharts.createChart(container, {
      ...getDefaultOptions(),
      width: container.clientWidth,
      height: 300,
    });

    try {
      const data = await API.getHistoricalPrices('solana', days);
      if (!data?.prices) throw new Error('No data');

      const lineData = toLineData(data.prices);
      const series = chart.addLineSeries({
        color: '#9945ff',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
      });
      series.setData(lineData);

      // SOL sell zone
      series.createPriceLine({
        price: 418,
        color: CHART_COLORS.red,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: 'Target $418',
      });

      chart.timeScale().fitContent();
      chartInstances[containerId] = chart;
    } catch (err) {
      container.innerHTML = `<div class="chart-loading">Failed to load chart data</div>`;
      console.error('[Charts] SOL error:', err);
    }
  }

  /**
   * Create ETH price chart with sell zones
   */
  async function renderETHPrice(containerId, days = 365) {
    const container = document.getElementById(containerId);
    if (!container || typeof LightweightCharts === 'undefined') return;

    container.innerHTML = '';
    const chart = LightweightCharts.createChart(container, {
      ...getDefaultOptions(),
      width: container.clientWidth,
      height: 300,
    });

    try {
      const data = await API.getHistoricalPrices('ethereum', days);
      if (!data?.prices) throw new Error('No data');

      const lineData = toLineData(data.prices);
      const series = chart.addLineSeries({
        color: CHART_COLORS.cyan,
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 0, minMove: 1 },
      });
      series.setData(lineData);

      [4300, 5000, 6900].forEach(price => {
        series.createPriceLine({
          price: price,
          color: CHART_COLORS.red,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `$${(price / 1000).toFixed(1)}K`,
        });
      });

      chart.timeScale().fitContent();
      chartInstances[containerId] = chart;
    } catch (err) {
      container.innerHTML = `<div class="chart-loading">Failed to load chart data</div>`;
      console.error('[Charts] ETH Price error:', err);
    }
  }

  /**
   * Handle window resize for all charts
   */
  function handleResize() {
    for (const [id, chart] of Object.entries(chartInstances)) {
      const container = document.getElementById(id);
      if (container && chart) {
        chart.applyOptions({ width: container.clientWidth });
      }
    }
  }

  // Listen for resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(handleResize, 150);
  });

  /**
   * BTC Rainbow Chart — log regression bands
   */
  async function renderRainbow(containerId) {
    const container = document.getElementById(containerId);
    if (!container || typeof LightweightCharts === 'undefined') return;

    container.innerHTML = '';
    const chart = LightweightCharts.createChart(container, {
      ...getDefaultOptions(),
      width: container.clientWidth,
      height: 400,
    });

    try {
      const data = await API.getHistoricalPrices('bitcoin', 'max');
      if (!data?.prices || data.prices.length < 100) throw new Error('No data');

      // Calculate log regression
      const genesisDate = new Date('2009-01-03').getTime();
      const points = data.prices.map(([ts, price]) => {
        const days = Math.max(1, (ts - genesisDate) / 86400000);
        return { logDays: Math.log10(days), logPrice: Math.log10(price), ts };
      });

      const n = points.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      points.forEach(p => { sumX += p.logDays; sumY += p.logPrice; sumXY += p.logDays * p.logPrice; sumX2 += p.logDays * p.logDays; });
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;

      // Sample to ~daily (one point per day)
      const dayMs = 86400000;
      const sampled = [];
      let lastDay = 0;
      points.forEach(p => {
        const day = Math.floor(p.ts / dayMs);
        if (day !== lastDay) { sampled.push(p); lastDay = day; }
      });

      // Rainbow band offsets (top to bottom)
      const bands = [
        { offset: 2.2,  topColor: 'rgba(200, 0, 0, 0.18)',    bottomColor: 'rgba(200, 0, 0, 0.02)' },
        { offset: 1.7,  topColor: 'rgba(255, 80, 0, 0.16)',   bottomColor: 'rgba(255, 80, 0, 0.02)' },
        { offset: 1.2,  topColor: 'rgba(255, 160, 0, 0.14)',  bottomColor: 'rgba(255, 160, 0, 0.02)' },
        { offset: 0.7,  topColor: 'rgba(255, 230, 0, 0.12)',  bottomColor: 'rgba(255, 230, 0, 0.02)' },
        { offset: 0.2,  topColor: 'rgba(100, 255, 0, 0.12)',  bottomColor: 'rgba(100, 255, 0, 0.02)' },
        { offset: -0.3, topColor: 'rgba(0, 200, 100, 0.12)',  bottomColor: 'rgba(0, 200, 100, 0.02)' },
        { offset: -0.8, topColor: 'rgba(0, 140, 255, 0.14)',  bottomColor: 'rgba(0, 140, 255, 0.02)' },
        { offset: -1.3, topColor: 'rgba(60, 0, 255, 0.16)',   bottomColor: 'rgba(60, 0, 255, 0.02)' },
      ];

      // Draw bands as area series (top to bottom so they layer correctly)
      for (const band of bands) {
        const bandData = sampled.map(p => {
          const val = Math.pow(10, slope * p.logDays + intercept + band.offset);
          return { time: Math.floor(p.ts / 1000), value: val };
        });

        const series = chart.addAreaSeries({
          lineColor: band.topColor.replace(/[\d.]+\)$/, '0.6)'),
          topColor: band.topColor,
          bottomColor: band.bottomColor,
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
          priceFormat: { type: 'price', precision: 0, minMove: 1 },
        });
        series.setData(bandData);
      }

      // Price line on top
      const priceData = sampled.map(p => ({
        time: Math.floor(p.ts / 1000),
        value: Math.pow(10, p.logPrice),
      }));

      const priceSeries = chart.addLineSeries({
        color: CHART_COLORS.gold,
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 0, minMove: 1 },
        lastValueVisible: true,
      });
      priceSeries.setData(priceData);

      chart.timeScale().fitContent();
      chartInstances[containerId] = chart;
    } catch (err) {
      container.innerHTML = `<div class="chart-loading">Failed to load rainbow chart</div>`;
      console.error('[Charts] Rainbow error:', err);
    }
  }

  return {
    renderBTCPrice,
    renderRainbow,
    renderETHPrice,
    renderETHBTC,
    renderFearGreed,
    renderBTCDominance,
    renderSOLPrice,
    handleResize,
  };
})();
