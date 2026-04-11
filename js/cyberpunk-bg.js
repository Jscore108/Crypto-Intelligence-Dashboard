// ============================================================
// cyberpunk-bg.js — Sci-Fi Background Canvas
// Stars, nebula, rain, floating particles, fog — no buildings
// ============================================================

(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'cyberpunk-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W, H, raindrops = [], particles = [];
  let frame = 0;

  const NEON = {
    cyan: [0, 240, 255],
    purple: [180, 90, 255],
    pink: [255, 40, 120],
    green: [0, 255, 140],
    blue: [60, 120, 255],
  };
  const NEON_KEYS = Object.keys(NEON);

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    generateElements();
  }

  function generateElements() {
    raindrops = [];
    for (let i = 0; i < 150; i++) {
      raindrops.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 3 + Math.random() * 6,
        len: 8 + Math.random() * 16,
        opacity: 0.03 + Math.random() * 0.08,
      });
    }

    particles = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.15 - Math.random() * 0.4,
        size: 1 + Math.random() * 2,
        color: NEON_KEYS[Math.floor(Math.random() * NEON_KEYS.length)],
        opacity: 0.15 + Math.random() * 0.4,
      });
    }
  }

  function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#020010');
    grad.addColorStop(0.3, '#06041a');
    grad.addColorStop(0.6, '#0c0828');
    grad.addColorStop(0.8, '#0a0620');
    grad.addColorStop(1, '#050312');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    const t = frame * 0.008;
    for (let i = 0; i < 160; i++) {
      const sx = (i * 137.508 + 50) % W;
      const sy = (i * 71.137 + 20) % (H * 0.7);
      const twinkle = 0.2 + 0.8 * Math.abs(Math.sin(t + i * 0.7));
      const size = (i % 7 === 0) ? 1.5 : (i % 3 === 0) ? 1 : 0.6;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, 6.28);
      ctx.fillStyle = `rgba(200,210,255,${twinkle * 0.5})`;
      ctx.fill();
    }

    // Nebula glows
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.3);

    const n1 = ctx.createRadialGradient(W * 0.25, H * 0.2, 0, W * 0.25, H * 0.2, W * 0.35);
    n1.addColorStop(0, `rgba(100, 40, 180, ${0.035 * pulse})`);
    n1.addColorStop(1, 'transparent');
    ctx.fillStyle = n1;
    ctx.fillRect(0, 0, W, H);

    const n2 = ctx.createRadialGradient(W * 0.75, H * 0.15, 0, W * 0.75, H * 0.15, W * 0.3);
    n2.addColorStop(0, `rgba(0, 200, 255, ${0.025 * pulse})`);
    n2.addColorStop(1, 'transparent');
    ctx.fillStyle = n2;
    ctx.fillRect(0, 0, W, H);

    const n3 = ctx.createRadialGradient(W * 0.5, H * 0.6, 0, W * 0.5, H * 0.6, W * 0.4);
    n3.addColorStop(0, `rgba(0, 255, 140, ${0.015 * pulse})`);
    n3.addColorStop(1, 'transparent');
    ctx.fillStyle = n3;
    ctx.fillRect(0, 0, W, H);
  }

  function drawRain() {
    ctx.lineWidth = 0.5;
    raindrops.forEach(r => {
      ctx.strokeStyle = `rgba(150, 180, 255, ${r.opacity})`;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 0.3, r.y + r.len);
      ctx.stroke();
      r.y += r.speed;
      r.x -= 0.2;
      if (r.y > H) { r.y = -r.len; r.x = Math.random() * W; }
    });
  }

  function drawParticles() {
    particles.forEach(p => {
      const nc = NEON[p.color];
      // Glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 4, 0, 6.28);
      ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${p.opacity * 0.1})`;
      ctx.fill();
      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 6.28);
      ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${p.opacity})`;
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
    });
  }

  function drawFog() {
    const t = frame * 0.004;
    const pulse = 0.5 + 0.5 * Math.sin(t);

    const fogX = W * (0.3 + 0.4 * Math.sin(t * 0.7));
    const f1 = ctx.createRadialGradient(fogX, H * 0.8, 0, fogX, H * 0.8, W * 0.35);
    f1.addColorStop(0, `rgba(0, 240, 255, ${0.012 * pulse})`);
    f1.addColorStop(1, 'transparent');
    ctx.fillStyle = f1;
    ctx.fillRect(0, H * 0.5, W, H * 0.5);

    const fogX2 = W * (0.7 + 0.2 * Math.cos(t * 0.5));
    const f2 = ctx.createRadialGradient(fogX2, H * 0.75, 0, fogX2, H * 0.75, W * 0.25);
    f2.addColorStop(0, `rgba(180, 90, 255, ${0.01 * pulse})`);
    f2.addColorStop(1, 'transparent');
    ctx.fillStyle = f2;
    ctx.fillRect(0, H * 0.5, W, H * 0.5);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawFog();
    drawRain();
    drawParticles();
    frame++;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();
