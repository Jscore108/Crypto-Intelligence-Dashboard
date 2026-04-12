// ============================================================
// cyberpunk-bg.js — Stars, rain, particles, shooting stars
// ============================================================

(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'cyberpunk-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W, H, stars = [], raindrops = [], particles = [], shootingStars = [];
  let frame = 0;

  const NEON = {
    cyan: [0, 240, 255],
    red: [255, 60, 80],
    pink: [255, 40, 120],
    purple: [180, 90, 255],
    green: [0, 255, 163],
    gold: [255, 204, 0],
  };
  const NEON_KEYS = Object.keys(NEON);

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    generateElements();
  }

  function generateElements() {
    // Stars
    stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        size: 0.3 + Math.random() * 1.8,
        twinkleSpeed: 0.5 + Math.random() * 3,
        twinkleOffset: Math.random() * 6.28,
        color: Math.random() > 0.85 ? NEON_KEYS[Math.floor(Math.random() * NEON_KEYS.length)] : null,
      });
    }

    // Rain
    raindrops = [];
    for (let i = 0; i < 120; i++) {
      raindrops.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 3 + Math.random() * 6,
        len: 8 + Math.random() * 18,
        opacity: 0.02 + Math.random() * 0.06,
      });
    }

    // Floating particles
    particles = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.08 - Math.random() * 0.25,
        size: 0.6 + Math.random() * 2,
        color: NEON_KEYS[Math.floor(Math.random() * NEON_KEYS.length)],
        opacity: 0.1 + Math.random() * 0.35,
      });
    }

    // Shooting stars
    shootingStars = [];
  }

  function drawStars() {
    const t = frame * 0.02;
    stars.forEach(s => {
      const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(t * s.twinkleSpeed + s.twinkleOffset));
      if (s.color) {
        const nc = NEON[s.color];
        // Colored star with glow
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * 2.5, 0, 6.28);
        ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${0.06 * twinkle})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, 6.28);
        ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${0.6 * twinkle})`;
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size, 0, 6.28);
        ctx.fillStyle = `rgba(220,225,255,${0.4 * twinkle})`;
        ctx.fill();
      }
    });
  }

  function drawRain() {
    ctx.lineWidth = 0.5;
    raindrops.forEach(r => {
      ctx.strokeStyle = `rgba(100, 180, 255, ${r.opacity})`;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 0.3, r.y + r.len);
      ctx.stroke();
      r.y += r.speed;
      r.x -= 0.15;
      if (r.y > H) { r.y = -r.len; r.x = Math.random() * W; }
    });
  }

  function drawParticles() {
    particles.forEach(p => {
      const nc = NEON[p.color];
      // Outer glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 4, 0, 6.28);
      ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${p.opacity * 0.06})`;
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

  function drawShootingStars() {
    // Occasionally spawn a new one
    if (Math.random() < 0.004) {
      const nc = NEON[NEON_KEYS[Math.floor(Math.random() * NEON_KEYS.length)]];
      shootingStars.push({
        x: Math.random() * W * 0.8,
        y: Math.random() * H * 0.4,
        vx: 4 + Math.random() * 6,
        vy: 2 + Math.random() * 3,
        life: 40 + Math.random() * 30,
        maxLife: 40 + Math.random() * 30,
        color: nc,
      });
    }

    shootingStars = shootingStars.filter(s => {
      const alpha = s.life / s.maxLife;
      const tailLen = 30 * alpha;

      // Trail
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * tailLen / s.vx, s.y - s.vy * tailLen / s.vy);
      ctx.strokeStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${0.4 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Head glow
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2, 0, 6.28);
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${0.8 * alpha})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x, s.y, 6, 0, 6.28);
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${0.15 * alpha})`;
      ctx.fill();

      s.x += s.vx;
      s.y += s.vy;
      s.life--;
      return s.life > 0;
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawStars();
    drawRain();
    drawParticles();
    drawShootingStars();
    frame++;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();
