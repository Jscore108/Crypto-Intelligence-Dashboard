// ============================================================
// composite.js — Composite Score (0–100)
// Weighted average of key indicators
// ============================================================

const Composite = (() => {

  /**
   * Calculate composite score from indicator values
   *
   * Inputs (all pre-normalized to 0-100):
   *   fearGreed: Fear & Greed Index (0-100 direct, 100 = extreme greed = sell)
   *   mvrvScore: MVRV Z-Score mapped to 0-100 (0 = 0, 100 = 6 cycle top)
   *   piCycleScore: Pi Cycle % toward cross (0 = no signal, 100 = crossed)
   *   btcDScore: BTC.D mapped to 0-100 (0 = 70%+, 100 = 40% alt season sell)
   *
   * Weights: F&G 25%, MVRV 30%, Pi Cycle 25%, BTC.D 20%
   *
   * Returns 0-100 where:
   *   0-40 = Accumulate (green)
   *   40-60 = Hold (yellow)
   *   60-80 = Distribute (orange)
   *   80-100 = SELL (red)
   */
  function calculate(fearGreed, mvrvScore, piCycleScore, btcDScore) {
    const fng = clamp(Number(fearGreed) || 0, 0, 100);
    const mvrv = clamp(Number(mvrvScore) || 0, 0, 100);
    const piCycle = clamp(Number(piCycleScore) || 0, 0, 100);
    const btcD = clamp(Number(btcDScore) || 0, 0, 100);

    const score = (
      fng * 0.25 +
      mvrv * 0.30 +
      piCycle * 0.25 +
      btcD * 0.20
    );

    return Math.round(clamp(score, 0, 100));
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function getZone(score) {
    if (score <= 40) return { label: 'Accumulate', color: '#00ff88', cssClass: 'green' };
    if (score <= 60) return { label: 'Hold', color: '#f0b429', cssClass: 'yellow' };
    if (score <= 80) return { label: 'Distribute', color: '#ff8c00', cssClass: 'orange' };
    return { label: 'SELL', color: '#ff4444', cssClass: 'red' };
  }

  function getGaugeColor(score) {
    if (score <= 40) return '#00ff88';
    if (score <= 60) return '#f0b429';
    if (score <= 80) return '#ff8c00';
    return '#ff4444';
  }

  function renderGauge(container, score) {
    const zone = getZone(score);
    const color = getGaugeColor(score);
    const cx = 110, cy = 100, r = 80;
    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;
    const bgX1 = cx + r * Math.cos(startAngle);
    const bgY1 = cy + r * Math.sin(startAngle);
    const bgX2 = cx + r * Math.cos(endAngle);
    const bgY2 = cy + r * Math.sin(endAngle);
    const scoreAngle = startAngle + (score / 100) * (endAngle - startAngle);
    const scoreX = cx + r * Math.cos(scoreAngle);
    const scoreY = cy + r * Math.sin(scoreAngle);
    const largeArc = (score / 100) > 0.5 ? 1 : 0;

    container.innerHTML = `
      <svg class="gauge-svg" viewBox="0 0 220 130">
        <path d="M ${bgX1} ${bgY1} A ${r} ${r} 0 1 1 ${bgX2} ${bgY2}"
              fill="none" stroke="#1e1e2e" stroke-width="14" stroke-linecap="round"/>
        <path d="M ${bgX1} ${bgY1} A ${r} ${r} 0 ${largeArc} 1 ${scoreX} ${scoreY}"
              fill="none" stroke="${color}" stroke-width="14" stroke-linecap="round"/>
        <text x="${cx}" y="${cy - 8}" class="gauge-value" style="fill:${color}">${score}</text>
        <text x="${cx}" y="${cy + 14}" class="gauge-label">/100</text>
      </svg>
      <div class="gauge-zone-label" style="color:${color}">${zone.label}</div>
    `;
  }

  return { calculate, getZone, getGaugeColor, renderGauge };
})();
