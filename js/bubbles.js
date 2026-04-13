// ============================================================
// bubbles.js — Crypto Bubble Chart
// Static layout, coin logos, draggable, no drifting
// ============================================================

const BubbleChart = (() => {
  let canvas, ctx, W, H;
  let bubbles = [];
  let animId = null;
  let timeframe = '24h';
  let hoveredBubble = null;
  let dragBubble = null, dragOffX = 0, dragOffY = 0, didDrag = false;
  let logoCache = {};

  const WATCHLIST = ['bitcoin', 'ethereum', 'solana', 'chainlink', 'brett-based', 'popcat', 'dogwifcoin'];
  const EXTRA_COINS = 'brett-based,popcat,dogwifcoin';

  const COLORS = {
    positive: { r: 0, g: 200, b: 120 },
    negative: { r: 220, g: 50, b: 80 },
    watchlist: { r: 255, g: 200, b: 0 },
  };

  function init(canvasId) {
    canvas = document.getElementById(canvasId);
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mouseleave', () => { hoveredBubble = null; dragBubble = null; });
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', () => { dragBubble = null; });
    window.addEventListener('resize', () => { resize(); layoutBubbles(); });
    loadData();
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = canvas.width = rect.width;
    H = canvas.height = rect.height;
  }

  function loadLogo(url, id) {
    if (logoCache[id]) return logoCache[id];
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => { logoCache[id] = img; };
    logoCache[id] = null; // mark as loading
    return null;
  }

  async function loadData() {
    if (ctx) {
      ctx.fillStyle = 'rgba(168,180,212,0.5)';
      ctx.font = "600 14px 'Orbitron', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('Loading bubbles...', W / 2, H / 2);
    }

    let coins = null;
    // Try 100 first, fall back to 50
    for (const count of [100, 50]) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt));
          const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${count}&page=1&sparkline=false&price_change_percentage=1h,24h,7d`);
          if (res.status === 429) continue;
          if (!res.ok) continue;
          const data = await res.json();
          if (Array.isArray(data) && data.length > 10) { coins = data; break; }
        } catch (_) { continue; }
      }
      if (coins) break;
    }

    if (!coins) {
      if (ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(168,180,212,0.4)';
        ctx.font = "600 12px 'Orbitron', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('Retrying in 30s...', W / 2, H / 2);
      }
      setTimeout(loadData, 30000);
      return;
    }

    // Fetch extra watchlist coins
    try {
      await new Promise(r => setTimeout(r, 2000));
      const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${EXTRA_COINS}&sparkline=false&price_change_percentage=1h,24h,7d`);
      if (res.ok) {
        const extras = await res.json();
        if (Array.isArray(extras)) {
          const allIds = new Set(coins.map(c => c.id));
          extras.forEach(c => { if (!allIds.has(c.id)) coins.push(c); });
        }
      }
    } catch (_) {}

    // Preload logos
    coins.forEach(c => { if (c.image) loadLogo(c.image, c.id); });

    createBubbles(coins);
    if (!animId) animate();
  }

  function getChange(coin) {
    if (timeframe === '1h') return coin.price_change_percentage_1h_in_currency || 0;
    if (timeframe === '7d') return coin.price_change_percentage_7d_in_currency || 0;
    return coin.price_change_percentage_24h || 0;
  }

  function createBubbles(coins) {
    bubbles = coins.map((coin, i) => {
      const change = getChange(coin);
      const absChange = Math.abs(change);
      const minR = 32, maxR = 72;
      const radius = Math.max(minR, Math.min(maxR, minR + absChange * 3.5));
      const isWatch = WATCHLIST.includes(coin.id);

      return {
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change: change,
        marketCap: coin.market_cap,
        radius: radius,
        baseRadius: radius,
        x: 0, y: 0,
        breathPhase: Math.random() * Math.PI * 2,
        breathSpeed: 0.01 + Math.random() * 0.01,
        isWatchlist: isWatch,
        image: coin.image,
        coin: coin,
      };
    });

    bubbles.sort((a, b) => (a.isWatchlist ? 1 : 0) - (b.isWatchlist ? 1 : 0));
    layoutBubbles();
  }

  function layoutBubbles() {
    if (bubbles.length === 0) return;
    const cols = Math.ceil(Math.sqrt(bubbles.length * (W / H)));
    const rows = Math.ceil(bubbles.length / cols);
    const cellW = W / cols, cellH = H / rows;
    bubbles.forEach((b, i) => {
      if (b === dragBubble) return;
      b.x = (i % cols) * cellW + cellW / 2;
      b.y = Math.floor(i / cols) * cellH + cellH / 2;
    });
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);

    // Breathing scale (no position change)
    bubbles.forEach(b => {
      b.breathPhase += b.breathSpeed;
      b.radius = b.baseRadius + Math.sin(b.breathPhase) * 1.5;
    });

    // Soft collision push (keeps bubbles from overlapping after drag)
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const a = bubbles[i], bub = bubbles[j];
        const dx = bub.x - a.x, dy = bub.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + bub.radius + 1;
        if (dist < minDist && dist > 0) {
          const nx = dx / dist, ny = dy / dist;
          const push = (minDist - dist) * 0.1;
          if (a !== dragBubble) { a.x -= nx * push; a.y -= ny * push; }
          if (bub !== dragBubble) { bub.x += nx * push; bub.y += ny * push; }
        }
      }
    }

    // Draw
    bubbles.forEach(b => {
      const isH = hoveredBubble === b;
      const isD = dragBubble === b;
      const c = b.isWatchlist ? COLORS.watchlist : (b.change >= 0 ? COLORS.positive : COLORS.negative);
      const alpha = isH || isD ? 0.35 : 0.18;

      // Glow
      if (isH || b.isWatchlist || isD) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.05)`;
        ctx.fill();
      }

      // Body
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${isH || isD ? 0.9 : 0.45})`;
      ctx.lineWidth = isD ? 2.5 : (isH ? 2 : 0.8);
      ctx.stroke();

      // Coin logo
      const logo = logoCache[b.id];
      if (logo) {
        const logoSize = b.radius * 0.55;
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y - b.radius * 0.15, logoSize / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(logo, b.x - logoSize / 2, b.y - b.radius * 0.15 - logoSize / 2, logoSize, logoSize);
        ctx.restore();
      }

      // Symbol
      const fs = Math.max(9, b.radius * 0.35);
      ctx.font = `bold ${fs}px 'Orbitron', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      const textY = logo ? b.y + b.radius * 0.28 : b.y - 2;
      ctx.fillText(b.symbol, b.x, textY);

      // Change %
      const cfs = Math.max(8, b.radius * 0.3);
      ctx.font = `700 ${cfs}px 'JetBrains Mono', monospace`;
      const sign = b.change >= 0 ? '+' : '';
      ctx.fillStyle = b.change >= 0 ? 'rgba(0,255,163,0.9)' : 'rgba(255,60,80,0.9)';
      ctx.fillText(`${sign}${b.change.toFixed(1)}%`, b.x, textY + fs * 0.7);
    });

    // Tooltip
    if (hoveredBubble && !dragBubble) {
      const b = hoveredBubble;
      const tw = 175, th = 65;
      const tx = Math.min(b.x + b.radius + 8, W - tw - 5);
      const ty = Math.max(b.y - th / 2, 5);
      ctx.fillStyle = 'rgba(5,5,15,0.93)';
      ctx.strokeStyle = 'rgba(0,229,255,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(tx, ty, tw, th, 8); ctx.fill(); ctx.stroke();
      ctx.font = "bold 11px 'Orbitron', sans-serif";
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
      ctx.fillText(b.name, tx + 10, ty + 18);
      ctx.font = "600 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#a8b4d4';
      ctx.fillText('$' + (b.price >= 1 ? b.price.toLocaleString(undefined, {maximumFractionDigits: 2}) : b.price.toFixed(6)), tx + 10, ty + 34);
      const mcap = b.marketCap >= 1e9 ? (b.marketCap / 1e9).toFixed(1) + 'B' : (b.marketCap / 1e6).toFixed(0) + 'M';
      ctx.fillText('MCap: $' + mcap, tx + 10, ty + 50);
    }

    animId = requestAnimationFrame(animate);
  }

  function findAt(mx, my) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if ((mx - b.x) ** 2 + (my - b.y) ** 2 < b.radius ** 2) return b;
    }
    return null;
  }

  function onMouseMove(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    if (dragBubble) { dragBubble.x = mx - dragOffX; dragBubble.y = my - dragOffY; didDrag = true; return; }
    hoveredBubble = findAt(mx, my);
    canvas.style.cursor = hoveredBubble ? 'grab' : 'default';
  }

  function onMouseDown(e) {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const b = findAt(mx, my);
    if (b) { dragBubble = b; dragOffX = mx - b.x; dragOffY = my - b.y; didDrag = false; canvas.style.cursor = 'grabbing'; e.preventDefault(); }
  }

  function onMouseUp() { dragBubble = null; canvas.style.cursor = hoveredBubble ? 'grab' : 'default'; }

  function onClick() {
    if (!didDrag && hoveredBubble) window.open(`https://www.coingecko.com/en/coins/${hoveredBubble.id}`, '_blank');
    didDrag = false;
  }

  function onTouchStart(e) {
    const r = canvas.getBoundingClientRect(), t = e.touches[0];
    const mx = t.clientX - r.left, my = t.clientY - r.top;
    const b = findAt(mx, my);
    if (b) { dragBubble = b; dragOffX = mx - b.x; dragOffY = my - b.y; didDrag = false; e.preventDefault(); }
  }

  function onTouchMove(e) {
    if (dragBubble) {
      const r = canvas.getBoundingClientRect(), t = e.touches[0];
      dragBubble.x = t.clientX - r.left - dragOffX;
      dragBubble.y = t.clientY - r.top - dragOffY;
      didDrag = true; e.preventDefault();
    }
  }

  function setTimeframe(tf) {
    timeframe = tf;
    bubbles.forEach(b => {
      b.change = getChange(b.coin);
      b.baseRadius = Math.max(32, Math.min(72, 32 + Math.abs(b.change) * 3.5));
      b.radius = b.baseRadius;
    });
  }

  return { init, setTimeframe, loadData };
})();
