// ============================================================
// cyberpunk-bg.js — Stars, rain, particles, shooting stars,
//                   spaceships, floating Bitcoin logos
// ============================================================

(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'cyberpunk-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W, H, stars = [], raindrops = [], particles = [], shootingStars = [], ships = [], btcLogos = [];
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
        x: Math.random() * W, y: Math.random() * H,
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
        x: Math.random() * W, y: Math.random() * H,
        speed: 3 + Math.random() * 6, len: 8 + Math.random() * 18,
        opacity: 0.02 + Math.random() * 0.06,
      });
    }

    // Particles
    particles = [];
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3, vy: -0.08 - Math.random() * 0.25,
        size: 0.6 + Math.random() * 2,
        color: NEON_KEYS[Math.floor(Math.random() * NEON_KEYS.length)],
        opacity: 0.1 + Math.random() * 0.35,
      });
    }

    // Shooting stars
    shootingStars = [];

    // Spaceships
    ships = [];

    // Floating Bitcoin logos
    btcLogos = [];
    for (let i = 0; i < 8; i++) {
      btcLogos.push({
        x: Math.random() * W,
        y: H * 0.3 + Math.random() * H * 0.6,
        size: 14 + Math.random() * 22,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.12,
        glowPhase: Math.random() * 6.28,
        glowSpeed: 0.3 + Math.random() * 0.8,
        rotation: Math.random() * 6.28,
        rotSpeed: (Math.random() - 0.5) * 0.003,
      });
    }
  }

  // --- Draw Stars ---
  function drawStars() {
    const t = frame * 0.02;
    stars.forEach(s => {
      const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(t * s.twinkleSpeed + s.twinkleOffset));
      if (s.color) {
        const nc = NEON[s.color];
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size * 2.5, 0, 6.28);
        ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${0.06 * twinkle})`; ctx.fill();
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, 6.28);
        ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${0.6 * twinkle})`; ctx.fill();
      } else {
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, 6.28);
        ctx.fillStyle = `rgba(220,225,255,${0.4 * twinkle})`; ctx.fill();
      }
    });
  }

  // --- Draw Rain ---
  function drawRain() {
    ctx.lineWidth = 0.5;
    raindrops.forEach(r => {
      ctx.strokeStyle = `rgba(100, 180, 255, ${r.opacity})`;
      ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 0.3, r.y + r.len); ctx.stroke();
      r.y += r.speed; r.x -= 0.15;
      if (r.y > H) { r.y = -r.len; r.x = Math.random() * W; }
    });
  }

  // --- Draw Particles ---
  function drawParticles() {
    particles.forEach(p => {
      const nc = NEON[p.color];
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4, 0, 6.28);
      ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${p.opacity * 0.06})`; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.28);
      ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${p.opacity})`; ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
    });
  }

  // --- Draw Shooting Stars ---
  function drawShootingStars() {
    if (Math.random() < 0.004) {
      const nc = NEON[NEON_KEYS[Math.floor(Math.random() * NEON_KEYS.length)]];
      shootingStars.push({
        x: Math.random() * W * 0.8, y: Math.random() * H * 0.4,
        vx: 4 + Math.random() * 6, vy: 2 + Math.random() * 3,
        life: 40 + Math.random() * 30, maxLife: 40 + Math.random() * 30, color: nc,
      });
    }
    shootingStars = shootingStars.filter(s => {
      const alpha = s.life / s.maxLife;
      ctx.beginPath(); ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 5 * alpha, s.y - s.vy * 5 * alpha);
      ctx.strokeStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${0.4 * alpha})`;
      ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, 6.28);
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${0.8 * alpha})`; ctx.fill();
      s.x += s.vx; s.y += s.vy; s.life--;
      return s.life > 0;
    });
  }

  // --- Draw Spaceships ---
  function drawShips() {
    if (Math.random() < 0.002 && ships.length < 3) {
      const fromLeft = Math.random() > 0.5;
      const nc = NEON[NEON_KEYS[Math.floor(Math.random() * NEON_KEYS.length)]];
      ships.push({
        x: fromLeft ? -80 : W + 80,
        y: H * 0.12 + Math.random() * H * 0.45,
        vx: fromLeft ? (1.2 + Math.random() * 2) : -(1.2 + Math.random() * 2),
        size: 18 + Math.random() * 18,
        color: nc,
        trail: [],
        wobble: Math.random() * 6.28,
      });
    }

    ships = ships.filter(s => {
      const dir = s.vx > 0 ? 1 : -1;
      const sz = s.size;
      const wobbleY = Math.sin(frame * 0.015 + s.wobble) * 1.5;

      // Engine trail particles
      s.trail.push({ x: s.x - dir * sz * 1.1, y: s.y + wobbleY, life: 30 });
      s.trail = s.trail.filter(t => {
        t.life--;
        const a = t.life / 30;
        ctx.beginPath(); ctx.arc(t.x - dir * a * 8, t.y + (Math.random() - 0.5) * 2, 2.5 * a, 0, 6.28);
        ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${0.25 * a})`;
        ctx.fill();
        return t.life > 0;
      });

      ctx.save();
      ctx.translate(s.x, s.y + wobbleY);

      // Ambient engine glow
      ctx.beginPath(); ctx.arc(-dir * sz * 0.9, 0, sz * 0.7, 0, 6.28);
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0.06)`;
      ctx.fill();

      // Main hull — elongated fuselage
      ctx.beginPath();
      ctx.moveTo(dir * sz * 1.3, 0);                     // nose
      ctx.lineTo(dir * sz * 0.6, -sz * 0.12);            // upper nose taper
      ctx.lineTo(-dir * sz * 0.3, -sz * 0.18);           // upper body
      ctx.lineTo(-dir * sz * 0.9, -sz * 0.15);           // rear upper
      ctx.lineTo(-dir * sz * 1.0, 0);                    // rear center
      ctx.lineTo(-dir * sz * 0.9, sz * 0.15);            // rear lower
      ctx.lineTo(-dir * sz * 0.3, sz * 0.18);            // lower body
      ctx.lineTo(dir * sz * 0.6, sz * 0.12);             // lower nose taper
      ctx.closePath();
      ctx.fillStyle = `rgba(20, 28, 50, 0.8)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0.5)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Top wing
      ctx.beginPath();
      ctx.moveTo(-dir * sz * 0.1, -sz * 0.18);
      ctx.lineTo(-dir * sz * 0.5, -sz * 0.55);
      ctx.lineTo(-dir * sz * 0.8, -sz * 0.5);
      ctx.lineTo(-dir * sz * 0.7, -sz * 0.15);
      ctx.closePath();
      ctx.fillStyle = `rgba(15, 22, 42, 0.85)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0.4)`;
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Bottom wing
      ctx.beginPath();
      ctx.moveTo(-dir * sz * 0.1, sz * 0.18);
      ctx.lineTo(-dir * sz * 0.5, sz * 0.55);
      ctx.lineTo(-dir * sz * 0.8, sz * 0.5);
      ctx.lineTo(-dir * sz * 0.7, sz * 0.15);
      ctx.closePath();
      ctx.fillStyle = `rgba(15, 22, 42, 0.85)`;
      ctx.fill();
      ctx.strokeStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0.4)`;
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Wing tip lights
      ctx.beginPath(); ctx.arc(-dir * sz * 0.5, -sz * 0.55, 1.5, 0, 6.28);
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0.9)`; ctx.fill();
      ctx.beginPath(); ctx.arc(-dir * sz * 0.5, sz * 0.55, 1.5, 0, 6.28);
      ctx.fillStyle = `rgba(255, 42, 109, 0.9)`; ctx.fill();

      // Hull panel line
      ctx.beginPath();
      ctx.moveTo(dir * sz * 0.5, 0);
      ctx.lineTo(-dir * sz * 0.8, 0);
      ctx.strokeStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0.15)`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Cockpit window
      ctx.beginPath();
      ctx.ellipse(dir * sz * 0.7, 0, sz * 0.12, sz * 0.06, 0, 0, 6.28);
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0.85)`;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(dir * sz * 0.7, 0, sz * 0.18, sz * 0.09, 0, 0, 6.28);
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},0.12)`;
      ctx.fill();

      // Engine exhaust — dual flames
      const exFlicker = 0.6 + 0.4 * Math.sin(frame * 0.4 + s.wobble);
      const exLen = sz * (0.5 + 0.4 * exFlicker);
      // Top engine
      ctx.beginPath();
      ctx.moveTo(-dir * sz * 0.9, -sz * 0.08);
      ctx.lineTo(-dir * (sz * 0.9 + exLen * 0.8), -sz * 0.02);
      ctx.lineTo(-dir * sz * 0.9, sz * 0.02);
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${0.35 * exFlicker})`;
      ctx.fill();
      // Bottom engine
      ctx.beginPath();
      ctx.moveTo(-dir * sz * 0.9, sz * 0.02);
      ctx.lineTo(-dir * (sz * 0.9 + exLen), sz * 0.05);
      ctx.lineTo(-dir * sz * 0.9, sz * 0.12);
      ctx.fillStyle = `rgba(${s.color[0]},${s.color[1]},${s.color[2]},${0.4 * exFlicker})`;
      ctx.fill();
      // Core bright center
      ctx.beginPath(); ctx.arc(-dir * sz * 0.95, sz * 0.02, sz * 0.05, 0, 6.28);
      ctx.fillStyle = `rgba(255,255,255,${0.4 * exFlicker})`; ctx.fill();

      ctx.restore();

      s.x += s.vx;
      return s.x > -120 && s.x < W + 120;
    });
  }

  // --- Draw Floating Bitcoin Logos ---
  function drawBtcLogos() {
    const t = frame * 0.01;

    btcLogos.forEach(b => {
      const glow = 0.15 + 0.15 * Math.sin(t * b.glowSpeed * 3 + b.glowPhase);
      const breathe = 1 + 0.04 * Math.sin(t * b.glowSpeed * 2 + b.glowPhase);

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation);
      ctx.scale(breathe, breathe);

      const s = b.size;

      // Outer glow
      ctx.beginPath(); ctx.arc(0, 0, s * 1.8, 0, 6.28);
      ctx.fillStyle = `rgba(255, 100, 50, ${glow * 0.15})`;
      ctx.fill();

      // Circle
      ctx.beginPath(); ctx.arc(0, 0, s, 0, 6.28);
      ctx.strokeStyle = `rgba(255, 120, 50, ${glow * 2})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // B symbol
      ctx.font = `bold ${s * 1.1}px 'JetBrains Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(255, 120, 50, ${glow * 2.2})`;
      ctx.fillText('₿', 0, 1);

      ctx.restore();

      // Move like bubble
      b.x += b.vx + Math.sin(t * 0.5 + b.glowPhase) * 0.15;
      b.y += b.vy + Math.cos(t * 0.4 + b.glowPhase) * 0.12;
      b.rotation += b.rotSpeed;

      // Wrap around
      if (b.x < -40) b.x = W + 40;
      if (b.x > W + 40) b.x = -40;
      if (b.y < -40) b.y = H + 40;
      if (b.y > H + 40) b.y = -40;
    });
  }

  // --- Main Loop ---
  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawStars();
    drawBtcLogos();
    drawShips();
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
