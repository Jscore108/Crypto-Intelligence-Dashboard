// ============================================================
// bubbles.js — Interactive Crypto Bubble Chart
// Top 50 + watchlist, sized by % change, calm floating, draggable
// ============================================================

const BubbleChart = (() => {
  let canvas, ctx, W, H;
  let bubbles = [];
  let animId = null;
  let timeframe = '24h';
  let hoveredBubble = null;
  let dragBubble = null, dragOffX = 0, dragOffY = 0;

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
    window.addEventListener('resize', resize);
    loadData();
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = canvas.width = rect.width;
    H = canvas.height = rect.height;
  }

  async function loadData() {
    if (ctx) {
      ctx.fillStyle = 'rgba(168,180,212,0.5)';
      ctx.font = "600 14px 'Orbitron', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('Loading bubbles...', W / 2, H / 2);
    }

    let coins = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 3000 * attempt));
        const res = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=1h,24h,7d`);
        if (res.status === 429) continue;
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) { coins = data; break; }
      } catch (_) { continue; }
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

    createBubbles(coins);
    if (!animId) animate();
  }

  function getChange(coin) {
    if (timeframe === '1h') return coin.price_change_percentage_1h_in_currency || 0;
    if (timeframe === '7d') return coin.price_change_percentage_7d_in_currency || 0;
    return coin.price_change_percentage_24h || 0;
  }

  function createBubbles(coins) {
    // Grid layout so they start organized, not random
    const cols = Math.ceil(Math.sqrt(coins.length * (W / H)));
    const rows = Math.ceil(coins.length / cols);
    const cellW = W / cols, cellH = H / rows;

    bubbles = coins.map((coin, i) => {
      const change = getChange(coin);
      const absChange = Math.abs(change);
      const minR = 20, maxR = 55;
      const radius = Math.max(minR, Math.min(maxR, minR + absChange * 2.5));
      const isWatch = WATCHLIST.includes(coin.id);
      const col = i % cols, row = Math.floor(i / cols);

      return {
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change: change,
        marketCap: coin.market_cap,
        radius: radius,
        x: cellW * col + cellW / 2,
        y: cellH * row + cellH / 2,
        vx: 0,
        vy: 0,
        floatPhase: Math.random() * Math.PI * 2,
        floatSpeed: 0.003 + Math.random() * 0.004,
        floatAmpX: 0.3 + Math.random() * 0.4,
        floatAmpY: 0.2 + Math.random() * 0.3,
        isWatchlist: isWatch,
        coin: coin,
      };
    });

    bubbles.sort((a, b) => (a.isWatchlist ? 1 : 0) - (b.isWatchlist ? 1 : 0));
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);

    bubbles.forEach(b => {
      if (b === dragBubble) return; // don't move dragged bubble

      // Gentle floating — sine wave drift only
      b.floatPhase += b.floatSpeed;
      b.x += Math.sin(b.floatPhase) * b.floatAmpX;
      b.y += Math.cos(b.floatPhase * 0.7) * b.floatAmpY;

      // Keep in bounds
      b.x = Math.max(b.radius, Math.min(W - b.radius, b.x));
      b.y = Math.max(b.radius, Math.min(H - b.radius, b.y));
    });

    // Soft collision — just push apart, no bouncing
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const a = bubbles[i], b = bubbles[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius + 2;
        if (dist < minDist && dist > 0) {
          const nx = dx / dist, ny = dy / dist;
          const push = (minDist - dist) * 0.15;
          if (a !== dragBubble) { a.x -= nx * push; a.y -= ny * push; }
          if (b !== dragBubble) { b.x += nx * push; b.y += ny * push; }
        }
      }
    }

    // Draw
    bubbles.forEach(b => {
      const isHovered = hoveredBubble === b;
      const isDragged = dragBubble === b;
      const c = b.isWatchlist ? COLORS.watchlist : (b.change >= 0 ? COLORS.positive : COLORS.negative);
      const alpha = isHovered || isDragged ? 0.35 : 0.2;
      const strokeAlpha = isHovered || isDragged ? 0.9 : 0.5;

      // Glow for watchlist/hovered
      if (isHovered || b.isWatchlist || isDragged) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 1.25, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.06)`;
        ctx.fill();
      }

      // Body
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${strokeAlpha})`;
      ctx.lineWidth = isDragged ? 2.5 : (isHovered ? 2 : 1);
      ctx.stroke();

      // Symbol
      const fs = Math.max(8, b.radius * 0.36);
      ctx.font = `bold ${fs}px 'Orbitron', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,255,255,0.9)`;
      ctx.fillText(b.symbol, b.x, b.y - 2);

      // Change %
      const cfs = Math.max(7, b.radius * 0.26);
      ctx.font = `600 ${cfs}px 'JetBrains Mono', monospace`;
      const sign = b.change >= 0 ? '+' : '';
      ctx.fillStyle = b.change >= 0 ? 'rgba(0,255,163,0.9)' : 'rgba(255,60,80,0.9)';
      ctx.fillText(`${sign}${b.change.toFixed(1)}%`, b.x, b.y + fs * 0.55);
    });

    // Tooltip
    if (hoveredBubble && !dragBubble) {
      const b = hoveredBubble;
      const tx = Math.min(b.x + b.radius + 10, W - 175);
      const ty = Math.max(b.y - 40, 10);
      ctx.fillStyle = 'rgba(5,5,15,0.92)';
      ctx.strokeStyle = 'rgba(0,229,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, 170, 65, 8);
      ctx.fill(); ctx.stroke();
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

  function findBubbleAt(mx, my) {
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if ((mx - b.x) ** 2 + (my - b.y) ** 2 < b.radius ** 2) return b;
    }
    return null;
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (dragBubble) {
      dragBubble.x = mx - dragOffX;
      dragBubble.y = my - dragOffY;
      return;
    }
    hoveredBubble = findBubbleAt(mx, my);
    canvas.style.cursor = hoveredBubble ? 'grab' : 'default';
  }

  function onMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const b = findBubbleAt(mx, my);
    if (b) {
      dragBubble = b;
      dragOffX = mx - b.x;
      dragOffY = my - b.y;
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }

  function onMouseUp() {
    if (dragBubble) {
      canvas.style.cursor = 'grab';
      dragBubble = null;
    }
  }

  function onClick(e) {
    if (!dragBubble && hoveredBubble) {
      window.open(`https://www.coingecko.com/en/coins/${hoveredBubble.id}`, '_blank');
    }
  }

  function onTouchStart(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    const mx = t.clientX - rect.left, my = t.clientY - rect.top;
    const b = findBubbleAt(mx, my);
    if (b) {
      dragBubble = b;
      dragOffX = mx - b.x;
      dragOffY = my - b.y;
      e.preventDefault();
    }
  }

  function onTouchMove(e) {
    if (dragBubble) {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      dragBubble.x = t.clientX - rect.left - dragOffX;
      dragBubble.y = t.clientY - rect.top - dragOffY;
      e.preventDefault();
    }
  }

  function setTimeframe(tf) {
    timeframe = tf;
    bubbles.forEach(b => {
      b.change = getChange(b.coin);
      b.radius = Math.max(20, Math.min(55, 20 + Math.abs(b.change) * 2.5));
    });
  }

  return { init, setTimeframe, loadData };
})();
