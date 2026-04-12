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

  // --- Draw Spaceships — sleek sci-fi cruisers ---
  function drawShips() {
    if (Math.random() < 0.002 && ships.length < 3) {
      const fromLeft = Math.random() > 0.5;
      const nc = NEON[NEON_KEYS[Math.floor(Math.random() * NEON_KEYS.length)]];
      ships.push({
        x: fromLeft ? -80 : W + 80,
        y: H * 0.1 + Math.random() * H * 0.5,
        vx: fromLeft ? (1.2 + Math.random() * 2) : -(1.2 + Math.random() * 2),
        size: 20 + Math.random() * 16,
        color: nc,
        trail: [],
        wobble: Math.random() * 6.28,
      });
    }

    ships = ships.filter(s => {
      const d = s.vx > 0 ? 1 : -1;
      const z = s.size;
      const wy = Math.sin(frame * 0.012 + s.wobble) * 1.5;
      const c = s.color;
      const fl = 0.5 + 0.5 * Math.sin(frame * 0.35 + s.wobble);

      // Engine trail
      s.trail.push({ x: s.x - d * z * 0.9, y: s.y + wy, life: 25 });
      s.trail = s.trail.filter(t => {
        t.life--;
        const a = t.life / 25;
        ctx.globalAlpha = 0.15 * a;
        ctx.beginPath();
        ctx.arc(t.x - d * a * 6, t.y + (Math.random()-0.5)*1.5, 2 * a, 0, 6.28);
        ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        ctx.fill();
        ctx.globalAlpha = 1;
        return t.life > 0;
      });

      ctx.save();
      ctx.translate(s.x, s.y + wy);

      // --- Hull: sleek elongated diamond shape ---
      ctx.beginPath();
      ctx.moveTo(d * z * 1.4, 0);              // nose tip
      ctx.lineTo(d * z * 0.2, -z * 0.18);      // upper forward
      ctx.lineTo(-d * z * 0.6, -z * 0.14);     // upper rear
      ctx.lineTo(-d * z * 0.85, 0);             // tail
      ctx.lineTo(-d * z * 0.6, z * 0.14);      // lower rear
      ctx.lineTo(d * z * 0.2, z * 0.18);       // lower forward
      ctx.closePath();
      const hg = ctx.createLinearGradient(0, -z*0.18, 0, z*0.18);
      hg.addColorStop(0, 'rgba(40,50,80,0.85)');
      hg.addColorStop(0.3, 'rgba(25,32,58,0.9)');
      hg.addColorStop(1, 'rgba(15,20,40,0.85)');
      ctx.fillStyle = hg;
      ctx.fill();
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.45)`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Hull top highlight
      ctx.beginPath();
      ctx.moveTo(d * z * 1.2, -z * 0.01);
      ctx.quadraticCurveTo(d * z * 0.3, -z * 0.13, -d * z * 0.4, -z * 0.09);
      ctx.strokeStyle = 'rgba(160,180,240,0.1)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // --- Neon hull stripes ---
      ctx.beginPath();
      ctx.moveTo(d * z * 0.8, -z * 0.1);
      ctx.lineTo(-d * z * 0.5, -z * 0.1);
      ctx.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},0.2)`;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(d * z * 0.8, z * 0.1);
      ctx.lineTo(-d * z * 0.5, z * 0.1);
      ctx.stroke();

      // --- Cockpit ---
      ctx.beginPath();
      ctx.ellipse(d * z * 0.55, 0, z * 0.14, z * 0.05, 0, 0, 6.28);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},0.6)`;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(d * z * 0.58, -z * 0.012, z * 0.06, z * 0.018, 0, 0, 6.28);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();

      // --- Blinking nav lights ---
      const blink = Math.sin(frame * 0.12 + s.wobble) > 0 ? 0.9 : 0.15;
      // Nose
      ctx.beginPath(); ctx.arc(d * z * 1.35, 0, 1.5, 0, 6.28);
      ctx.fillStyle = `rgba(255,255,255,${blink})`; ctx.fill();
      // Tail
      ctx.beginPath(); ctx.arc(-d * z * 0.8, 0, 1.5, 0, 6.28);
      ctx.fillStyle = `rgba(255,42,80,${blink})`; ctx.fill();
      ctx.beginPath(); ctx.arc(-d * z * 0.8, 0, 4, 0, 6.28);
      ctx.fillStyle = `rgba(255,42,80,${0.06 * blink})`; ctx.fill();

      // --- Engine exhaust ---
      const exLen = z * (0.4 + 0.35 * fl);
      ctx.beginPath();
      ctx.moveTo(-d * z * 0.85, -z * 0.05);
      ctx.lineTo(-d * (z * 0.85 + exLen), 0);
      ctx.lineTo(-d * z * 0.85, z * 0.05);
      ctx.closePath();
      const eg = ctx.createLinearGradient(-d * z * 0.85, 0, -d * (z * 0.85 + exLen), 0);
      eg.addColorStop(0, `rgba(255,255,255,${0.6 * fl})`);
      eg.addColorStop(0.3, `rgba(${c[0]},${c[1]},${c[2]},${0.45 * fl})`);
      eg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = eg;
      ctx.fill();

      // Engine core glow
      ctx.beginPath(); ctx.arc(-d * z * 0.85, 0, z * 0.06, 0, 6.28);
      ctx.fillStyle = `rgba(255,255,255,${0.5 * fl})`; ctx.fill();
      ctx.beginPath(); ctx.arc(-d * z * 0.85, 0, z * 0.14, 0, 6.28);
      ctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${0.08 * fl})`; ctx.fill();

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
