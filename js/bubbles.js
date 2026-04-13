// ============================================================
// bubbles.js — Interactive Crypto Bubble Chart
// Top 100 + watchlist coins, sized by % change, floating
// ============================================================

const BubbleChart = (() => {
  let canvas, ctx, W, H;
  let bubbles = [];
  let animId = null;
  let timeframe = '24h'; // '1h', '24h', '7d'
  let hoveredBubble = null;

  // Watchlist coins (highlighted in gold)
  const WATCHLIST = ['bitcoin', 'ethereum', 'solana', 'chainlink', 'brett-based', 'popcat', 'dogwifcoin'];
  const EXTRA_COINS = 'brett-based,popcat,dogwifcoin'; // not in top 100

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
    canvas.addEventListener('mouseleave', () => { hoveredBubble = null; });
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('resize', resize);
    loadData();
  }

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    W = canvas.width = rect.width;
    H = canvas.height = rect.height;
  }

  async function loadData() {
    // Show loading state
    if (ctx) {
      ctx.fillStyle = 'rgba(168,180,212,0.5)';
      ctx.font = "600 14px 'Orbitron', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('Loading bubbles...', W / 2, H / 2);
    }

    // Try fetching with retries
    let coins = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 3000 * attempt));
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=1h,24h,7d`;
        const res = await fetch(url);
        if (res.status === 429) { continue; } // rate limited, retry
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) { coins = data; break; }
      } catch (_) { continue; }
    }

    if (!coins) {
      // Show error
      if (ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(168,180,212,0.4)';
        ctx.font = "600 12px 'Orbitron', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText('Bubbles loading... retrying in 30s', W / 2, H / 2);
      }
      setTimeout(loadData, 30000);
      return;
    }

    // Fetch extra watchlist coins
    try {
      await new Promise(r => setTimeout(r, 2000)); // delay to avoid rate limit
      const extraUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${EXTRA_COINS}&sparkline=false&price_change_percentage=1h,24h,7d`;
      const res = await fetch(extraUrl);
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
    bubbles = coins.map(coin => {
      const change = getChange(coin);
      const absChange = Math.abs(change);
      const minR = 18, maxR = 60;
      const radius = Math.max(minR, Math.min(maxR, minR + absChange * 3));
      const isWatch = WATCHLIST.includes(coin.id);

      return {
        id: coin.id,
        symbol: coin.symbol.toUpperCase(),
        name: coin.name,
        price: coin.current_price,
        change: change,
        marketCap: coin.market_cap,
        radius: radius,
        x: Math.random() * (W - radius * 2) + radius,
        y: Math.random() * (H - radius * 2) + radius,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        isWatchlist: isWatch,
        image: coin.image,
        coin: coin,
      };
    });

    // Sort so watchlist renders on top
    bubbles.sort((a, b) => (a.isWatchlist ? 1 : 0) - (b.isWatchlist ? 1 : 0));
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);

    // Physics
    bubbles.forEach(b => {
      b.x += b.vx;
      b.y += b.vy;

      // Bounce off walls
      if (b.x - b.radius < 0) { b.x = b.radius; b.vx *= -0.8; }
      if (b.x + b.radius > W) { b.x = W - b.radius; b.vx *= -0.8; }
      if (b.y - b.radius < 0) { b.y = b.radius; b.vy *= -0.8; }
      if (b.y + b.radius > H) { b.y = H - b.radius; b.vy *= -0.8; }

      // Damping
      b.vx *= 0.999;
      b.vy *= 0.999;

      // Gentle random drift
      b.vx += (Math.random() - 0.5) * 0.02;
      b.vy += (Math.random() - 0.5) * 0.02;
    });

    // Collision between bubbles
    for (let i = 0; i < bubbles.length; i++) {
      for (let j = i + 1; j < bubbles.length; j++) {
        const a = bubbles[i], b = bubbles[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = a.radius + b.radius;
        if (dist < minDist && dist > 0) {
          const nx = dx / dist, ny = dy / dist;
          const overlap = (minDist - dist) / 2;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
          // Swap velocities slightly
          const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
          a.vx -= nx * dvx * 0.3;
          a.vy -= ny * dvy * 0.3;
          b.vx += nx * dvx * 0.3;
          b.vy += ny * dvy * 0.3;
        }
      }
    }

    // Draw bubbles
    bubbles.forEach(b => {
      const isHovered = hoveredBubble === b;
      const c = b.isWatchlist ? COLORS.watchlist : (b.change >= 0 ? COLORS.positive : COLORS.negative);
      const alpha = isHovered ? 0.35 : 0.2;
      const strokeAlpha = isHovered ? 0.9 : 0.5;

      // Glow
      if (isHovered || b.isWatchlist) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 1.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.06)`;
        ctx.fill();
      }

      // Body
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${alpha})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${c.r},${c.g},${c.b},${strokeAlpha})`;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();

      // Symbol text
      const fontSize = Math.max(8, b.radius * 0.38);
      ctx.font = `bold ${fontSize}px 'Orbitron', sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255,255,255,${isHovered ? 1 : 0.9})`;
      ctx.fillText(b.symbol, b.x, b.y - 2);

      // Change %
      const changeFontSize = Math.max(7, b.radius * 0.28);
      ctx.font = `600 ${changeFontSize}px 'JetBrains Mono', monospace`;
      const sign = b.change >= 0 ? '+' : '';
      ctx.fillStyle = b.change >= 0 ? 'rgba(0,255,163,0.9)' : 'rgba(255,60,80,0.9)';
      ctx.fillText(`${sign}${b.change.toFixed(1)}%`, b.x, b.y + fontSize * 0.6);
    });

    // Tooltip for hovered bubble
    if (hoveredBubble) {
      const b = hoveredBubble;
      const tx = Math.min(b.x + b.radius + 10, W - 180);
      const ty = Math.max(b.y - 40, 10);

      ctx.fillStyle = 'rgba(5,5,15,0.92)';
      ctx.strokeStyle = 'rgba(0,229,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tx, ty, 170, 65, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = "bold 11px 'Orbitron', sans-serif";
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText(b.name, tx + 10, ty + 18);

      ctx.font = "600 10px 'JetBrains Mono', monospace";
      ctx.fillStyle = '#a8b4d4';
      ctx.fillText('$' + (b.price >= 1 ? b.price.toLocaleString(undefined, {maximumFractionDigits: 2}) : b.price.toFixed(6)), tx + 10, ty + 34);

      const mcap = b.marketCap >= 1e9 ? (b.marketCap / 1e9).toFixed(1) + 'B' : (b.marketCap / 1e6).toFixed(0) + 'M';
      ctx.fillText('MCap: $' + mcap, tx + 10, ty + 50);
    }

    animId = requestAnimationFrame(animate);
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    hoveredBubble = null;
    // Check in reverse (top-most first)
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      const dx = mx - b.x, dy = my - b.y;
      if (dx * dx + dy * dy < b.radius * b.radius) {
        hoveredBubble = b;
        canvas.style.cursor = 'pointer';
        return;
      }
    }
    canvas.style.cursor = 'default';
  }

  function onClick(e) {
    if (hoveredBubble) {
      window.open(`https://www.coingecko.com/en/coins/${hoveredBubble.id}`, '_blank');
    }
  }

  function onTouch(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    const mx = t.clientX - rect.left, my = t.clientY - rect.top;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      if ((mx - b.x) ** 2 + (my - b.y) ** 2 < b.radius ** 2) {
        window.open(`https://www.coingecko.com/en/coins/${b.id}`, '_blank');
        return;
      }
    }
  }

  function setTimeframe(tf) {
    timeframe = tf;
    if (bubbles.length > 0) {
      bubbles.forEach(b => {
        b.change = getChange(b.coin);
        const absChange = Math.abs(b.change);
        b.radius = Math.max(18, Math.min(60, 18 + absChange * 3));
      });
    }
  }

  return { init, setTimeframe, loadData };
})();
