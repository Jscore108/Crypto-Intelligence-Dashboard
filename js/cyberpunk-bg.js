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
        rotation: (Math.random() - 0.5) * 0.4,
        rotSpeed: (Math.random() - 0.5) * 0.001,
        maxTilt: 0.25,
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

  // --- Draw Spaceships — flat wide starfighters ---
  function drawShips() {
    if (Math.random() < 0.002 && ships.length < 3) {
      const fromLeft = Math.random() > 0.5;
      const nc = NEON[NEON_KEYS[Math.floor(Math.random() * NEON_KEYS.length)]];
      ships.push({
        x: fromLeft ? -100 : W + 100,
        y: H * 0.1 + Math.random() * H * 0.45,
        vx: fromLeft ? (1 + Math.random() * 1.8) : -(1 + Math.random() * 1.8),
        size: 22 + Math.random() * 20,
        color: nc,
        trail: [],
        wobble: Math.random() * 6.28,
      });
    }

    ships = ships.filter(s => {
      const d = s.vx > 0 ? 1 : -1;
      const z = s.size;
      const wy = Math.sin(frame * 0.012 + s.wobble) * 2;
      const c = s.color;
      const fl = 0.5 + 0.5 * Math.sin(frame * 0.35 + s.wobble);

      // Engine trail
      s.trail.push({ x: s.x - d * z * 1.6, y: s.y + wy, life: 35 });
      s.trail = s.trail.filter(t => {
        t.life--;
        const a = t.life / 35;
        ctx.beginPath();
        ctx.arc(t.x - d * a * 10, t.y + (Math.random() - 0.5) * 3, 3 * a, 0, 6.28);
        ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.18 * a})`;
        ctx.fill();
        return t.life > 0;
      });

      ctx.save();
      ctx.translate(s.x, s.y + wy);

      // Ambient glow around ship
      ctx.beginPath(); ctx.ellipse(0, 0, z * 1.2, z * 0.4, 0, 0, 6.28);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.03)`;
      ctx.fill();

      // === Wide swept-back wings ===
      // Port (top) wing
      ctx.beginPath();
      ctx.moveTo(d * z * 0.2, -z * 0.08);
      ctx.lineTo(-d * z * 0.4, -z * 0.08);
      ctx.lineTo(-d * z * 1.3, -z * 0.7);
      ctx.lineTo(-d * z * 1.5, -z * 0.65);
      ctx.lineTo(-d * z * 0.6, -z * 0.1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(18, 25, 48, 0.9)';
      ctx.fill();
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.35)`;
      ctx.lineWidth = 0.7; ctx.stroke();

      // Starboard (bottom) wing
      ctx.beginPath();
      ctx.moveTo(d * z * 0.2, z * 0.08);
      ctx.lineTo(-d * z * 0.4, z * 0.08);
      ctx.lineTo(-d * z * 1.3, z * 0.7);
      ctx.lineTo(-d * z * 1.5, z * 0.65);
      ctx.lineTo(-d * z * 0.6, z * 0.1);
      ctx.closePath();
      ctx.fillStyle = 'rgba(18, 25, 48, 0.9)';
      ctx.fill();
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.35)`;
      ctx.lineWidth = 0.7; ctx.stroke();

      // Wing neon accent stripes
      ctx.beginPath();
      ctx.moveTo(-d * z * 0.2, -z * 0.09);
      ctx.lineTo(-d * z * 1.1, -z * 0.55);
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.25)`;
      ctx.lineWidth = 0.5; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-d * z * 0.2, z * 0.09);
      ctx.lineTo(-d * z * 1.1, z * 0.55);
      ctx.stroke();

      // === Central fuselage (flat, wide) ===
      ctx.beginPath();
      ctx.moveTo(d * z * 1.5, 0);                // sharp nose
      ctx.quadraticCurveTo(d * z * 1.0, -z * 0.1, d * z * 0.3, -z * 0.12);
      ctx.lineTo(-d * z * 0.5, -z * 0.1);
      ctx.lineTo(-d * z * 0.7, 0);
      ctx.lineTo(-d * z * 0.5, z * 0.1);
      ctx.lineTo(d * z * 0.3, z * 0.12);
      ctx.quadraticCurveTo(d * z * 1.0, z * 0.1, d * z * 1.5, 0);
      ctx.closePath();
      const hullGrad = ctx.createLinearGradient(0, -z * 0.12, 0, z * 0.12);
      hullGrad.addColorStop(0, 'rgba(35, 45, 75, 0.9)');
      hullGrad.addColorStop(0.4, 'rgba(22, 30, 55, 0.95)');
      hullGrad.addColorStop(1, 'rgba(15, 20, 40, 0.9)');
      ctx.fillStyle = hullGrad;
      ctx.fill();
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.5)`;
      ctx.lineWidth = 0.8; ctx.stroke();

      // Hull highlight (metallic shine)
      ctx.beginPath();
      ctx.moveTo(d * z * 1.3, -z * 0.02);
      ctx.quadraticCurveTo(d * z * 0.5, -z * 0.08, -d * z * 0.3, -z * 0.06);
      ctx.strokeStyle = 'rgba(180, 200, 255, 0.12)';
      ctx.lineWidth = 1; ctx.stroke();

      // Cockpit — elongated windshield
      ctx.beginPath();
      ctx.ellipse(d * z * 0.6, 0, z * 0.2, z * 0.055, 0, 0, 6.28);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.15)`;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(d * z * 0.6, 0, z * 0.13, z * 0.04, 0, 0, 6.28);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.7)`;
      ctx.fill();
      // Windshield glint
      ctx.beginPath();
      ctx.ellipse(d * z * 0.65, -z * 0.015, z * 0.05, z * 0.015, 0, 0, 6.28);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fill();

      // Wing tip lights (blinking)
      const blink = Math.sin(frame * 0.15 + s.wobble) > 0 ? 1 : 0.2;
      ctx.beginPath(); ctx.arc(-d * z * 1.5, -z * 0.65, 2, 0, 6.28);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.9 * blink})`; ctx.fill();
      ctx.beginPath(); ctx.arc(-d * z * 1.5, -z * 0.65, 5, 0, 6.28);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.1 * blink})`; ctx.fill();
      ctx.beginPath(); ctx.arc(-d * z * 1.5, z * 0.65, 2, 0, 6.28);
      ctx.fillStyle = `rgba(255, 42, 80,${0.9 * blink})`; ctx.fill();
      ctx.beginPath(); ctx.arc(-d * z * 1.5, z * 0.65, 5, 0, 6.28);
      ctx.fillStyle = `rgba(255, 42, 80,${0.1 * blink})`; ctx.fill();

      // === Engine exhaust — wide spread ===
      const exLen = z * (0.6 + 0.5 * fl);
      // Main exhaust plume
      ctx.beginPath();
      ctx.moveTo(-d * z * 0.65, -z * 0.06);
      ctx.quadraticCurveTo(-d * (z * 0.7 + exLen * 0.5), 0, -d * z * 0.65, z * 0.06);
      ctx.lineTo(-d * (z * 0.65 + exLen), 0);
      ctx.closePath();
      const exGrad = ctx.createLinearGradient(-d * z * 0.65, 0, -d * (z * 0.65 + exLen), 0);
      exGrad.addColorStop(0, `rgba(255,255,255,${0.5 * fl})`);
      exGrad.addColorStop(0.2, `rgba(${c[0]},${c[1]},${c[2]},${0.5 * fl})`);
      exGrad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
      ctx.fillStyle = exGrad;
      ctx.fill();

      // Engine glow halo
      ctx.beginPath(); ctx.arc(-d * z * 0.68, 0, z * 0.08, 0, 6.28);
      ctx.fillStyle = `rgba(255,255,255,${0.6 * fl})`; ctx.fill();
      ctx.beginPath(); ctx.arc(-d * z * 0.68, 0, z * 0.18, 0, 6.28);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.12 * fl})`; ctx.fill();

      ctx.restore();
      s.x += s.vx;
      return s.x > -150 && s.x < W + 150;
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
      if (b.rotation > b.maxTilt) { b.rotation = b.maxTilt; b.rotSpeed *= -1; }
      if (b.rotation < -b.maxTilt) { b.rotation = -b.maxTilt; b.rotSpeed *= -1; }

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
