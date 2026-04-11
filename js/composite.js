// ============================================================
// composite.js — Composite Score (0–100)
// Weighted average of key indicators
// ============================================================

const Composite = (() => {

  /**
   * Calculate composite score from indicator values
   * Formula:
   *   Fear_Greed_normalized * 0.25 +
   *   MVRV_normalized * 0.30 +
   *   PiCycle_signal * 0.25 +
   *   RSI_14_BTC_normalized * 0.20
   *
   * Returns 0-100 where:
   *   0-40 = Accumulate (green)
   *   40-60 = Hold (yellow)
   *   60-80 = Distribute (orange)
   *   80-100 = SELL (red)
   */
  function calculate(fearGreed, mvrvNormalized, piCycleValue, rsi14) {
    // Normalize all inputs to 0-100
    const fng = clamp(Number(fearGreed) || 50, 0, 100);
    const mvrv = clamp(Number(mvrvNormalized) || 50, 0, 100);
    const piCycle = clamp(Number(piCycleValue) || 20, 0, 100);
    const rsi = clamp(Number(rsi14) || 50, 0, 100);

    // RSI normalize: map 30-70 to 0-100
    const rsiNorm = clamp(((rsi - 30) / 40) * 100, 0, 100);

    const score = (
      fng * 0.25 +
      mvrv * 0.30 +
      piCycle * 0.25 +
      rsiNorm * 0.20
    );

    return Math.round(clamp(score, 0, 100));
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Get zone info from composite score
   */
  function getZone(score) {
    if (score <= 40) return { label: 'Accumulate', color: '#00ff88', cssClass: 'green' };
    if (score <= 60) return { label: 'Hold', color: '#f0b429', cssClass: 'yellow' };
    if (score <= 80) return { label: 'Distribute', color: '#ff8c00', cssClass: 'orange' };
    return { label: 'SELL', color: '#ff4444', cssClass: 'red' };
  }

  /**
   * Get the stroke color for the gauge arc
   */
  function getGaugeColor(score) {
    if (score <= 40) return '#00ff88';
    if (score <= 60) return '#f0b429';
    if (score <= 80) return '#ff8c00';
    return '#ff4444';
  }

  /**
   * Render the SVG gauge
   * @param {HTMLElement} container - Element to render into
   * @param {number} score - Composite score 0-100
   */
  function renderGauge(container, score) {
    const zone = getZone(score);
    const color = getGaugeColor(score);

    // Arc parameters
    const cx = 110, cy = 100, r = 80;
    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;
    const totalArc = endAngle - startAngle;

    // Background arc path
    const bgX1 = cx + r * Math.cos(startAngle);
    const bgY1 = cy + r * Math.sin(startAngle);
    const bgX2 = cx + r * Math.cos(endAngle);
    const bgY2 = cy + r * Math.sin(endAngle);

    // Score arc
    const scoreAngle = startAngle + (score / 100) * totalArc;
    const scoreX = cx + r * Math.cos(scoreAngle);
    const scoreY = cy + r * Math.sin(scoreAngle);
    const largeArc = (score / 100) > 0.5 ? 1 : 0;

    const circumference = Math.PI * r; // half circle

    container.innerHTML = `
      <svg class="gauge-svg" viewBox="0 0 220 130">
        <!-- Background arc -->
        <path d="M ${bgX1} ${bgY1} A ${r} ${r} 0 1 1 ${bgX2} ${bgY2}"
              fill="none" stroke="#1e1e2e" stroke-width="14" stroke-linecap="round"/>
        <!-- Score arc -->
        <path d="M ${bgX1} ${bgY1} A ${r} ${r} 0 ${largeArc} 1 ${scoreX} ${scoreY}"
              fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"
              class="gauge-arc-animated"/>
        <!-- Score text -->
        <text x="${cx}" y="${cy - 8}" class="gauge-value" style="fill:${color}">${score}</text>
        <text x="${cx}" y="${cy + 14}" class="gauge-label">/100</text>
      </svg>
      <div class="gauge-zone-label" style="color:${color}">${zone.label}</div>
    `;
  }

  return {
    calculate,
    getZone,
    getGaugeColor,
    renderGauge,
  };
})();
