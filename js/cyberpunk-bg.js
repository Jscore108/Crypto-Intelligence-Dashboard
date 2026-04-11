// ============================================================
// cyberpunk-bg.js — Realistic Cyberpunk Cityscape Canvas
// Procedural buildings, neon, rain, reflections, fog
// ============================================================

(function () {
  const canvas = document.createElement('canvas');
  canvas.id = 'cyberpunk-canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  let W, H, buildings = [], raindrops = [], particles = [];
  let frame = 0;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    generateCity();
  }

  // --- Color Palette ---
  const NEON = {
    cyan: [0, 240, 255],
    purple: [180, 90, 255],
    pink: [255, 40, 120],
    orange: [255, 140, 40],
    green: [0, 255, 140],
    yellow: [255, 220, 60],
    blue: [60, 120, 255],
  };
  const NEON_KEYS = Object.keys(NEON);

  function neonRGB(name, a) {
    const c = NEON[name] || NEON.cyan;
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  }

  // --- Generate Buildings ---
  function generateCity() {
    buildings = [];
    const minW = 25, maxW = 70;
    let x = -10;

    while (x < W + 50) {
      const w = minW + Math.random() * (maxW - minW);
      const h = H * (0.15 + Math.random() * 0.45);
      const neon = NEON_KEYS[Math.floor(Math.random() * NEON_KEYS.length)];
      const windowRows = Math.floor(h / 14);
      const windowCols = Math.floor(w / 12);
      const hasSpire = Math.random() > 0.7;
      const spireH = hasSpire ? 15 + Math.random() * 40 : 0;
      const hasAntenna = !hasSpire && Math.random() > 0.6;
      const antennaH = hasAntenna ? 20 + Math.random() * 30 : 0;
      const hasNeonSign = Math.random() > 0.5;
      const signY = 0.2 + Math.random() * 0.4;
      const brightness = 0.3 + Math.random() * 0.4;
      const depth = Math.random(); // 0=far, 1=near

      // Window pattern: some on, some off, some colored
      const windows = [];
      for (let r = 0; r < windowRows; r++) {
        for (let c = 0; c < windowCols; c++) {
          const lit = Math.random() > 0.35;
          const color = lit ? (Math.random() > 0.7 ? NEON_KEYS[Math.floor(Math.random() * NEON_KEYS.length)] : 'warm') : 'off';
          windows.push({ r, c, color, flicker: Math.random() * 6.28 });
        }
      }

      buildings.push({ x, w, h, neon, windowRows, windowCols, windows, hasSpire, spireH, hasAntenna, antennaH, hasNeonSign, signY, brightness, depth });
      x += w + 1 + Math.random() * 4;
    }

    // Sort by depth (far buildings drawn first)
    buildings.sort((a, b) => a.depth - b.depth);

    // Generate rain
    raindrops = [];
    for (let i = 0; i < 200; i++) {
      raindrops.push({
        x: Math.random() * W,
        y: Math.random() * H,
        speed: 4 + Math.random() * 8,
        len: 8 + Math.random() * 18,
        opacity: 0.05 + Math.random() * 0.15,
      });
    }

    // Generate floating particles
    particles = [];
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2 - Math.random() * 0.5,
        size: 1 + Math.random() * 2,
        color: NEON_KEYS[Math.floor(Math.random() * NEON_KEYS.length)],
        opacity: 0.2 + Math.random() * 0.5,
      });
    }
  }

  // --- Draw Sky ---
  function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#020010');
    grad.addColorStop(0.2, '#06041a');
    grad.addColorStop(0.4, '#0c0828');
    grad.addColorStop(0.55, '#120a22');
    grad.addColorStop(0.7, '#1a0e2a');
    grad.addColorStop(0.85, '#140820');
    grad.addColorStop(1, '#0a0414');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Stars
    const t = frame * 0.01;
    for (let i = 0; i < 120; i++) {
      const sx = (i * 137.508 + 50) % W;
      const sy = (i * 71.137 + 20) % (H * 0.45);
      const twinkle = 0.3 + 0.7 * Math.abs(Math.sin(t + i * 0.7));
      const size = (i % 5 === 0) ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, 6.28);
      ctx.fillStyle = `rgba(200,210,255,${twinkle * 0.6})`;
      ctx.fill();
    }

    // Nebula glow
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.3);
    const nebula = ctx.createRadialGradient(W * 0.3, H * 0.15, 0, W * 0.3, H * 0.15, W * 0.35);
    nebula.addColorStop(0, `rgba(100, 40, 180, ${0.03 * pulse})`);
    nebula.addColorStop(1, 'transparent');
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, W, H);

    const nebula2 = ctx.createRadialGradient(W * 0.75, H * 0.1, 0, W * 0.75, H * 0.1, W * 0.25);
    nebula2.addColorStop(0, `rgba(0, 200, 255, ${0.02 * pulse})`);
    nebula2.addColorStop(1, 'transparent');
    ctx.fillStyle = nebula2;
    ctx.fillRect(0, 0, W, H);
  }

  // --- Draw a Building ---
  function drawBuilding(b) {
    const baseY = H - b.h;
    const t = frame * 0.02;
    const depthDarken = 0.4 + b.depth * 0.6;

    // Building body
    const bodyGrad = ctx.createLinearGradient(b.x, baseY, b.x + b.w, baseY + b.h);
    const br = Math.floor(12 * b.brightness * depthDarken);
    const bg = Math.floor(14 * b.brightness * depthDarken);
    const bb = Math.floor(24 * b.brightness * depthDarken);
    bodyGrad.addColorStop(0, `rgb(${br + 4},${bg + 4},${bb + 6})`);
    bodyGrad.addColorStop(0.5, `rgb(${br},${bg},${bb})`);
    bodyGrad.addColorStop(1, `rgb(${Math.floor(br * 0.7)},${Math.floor(bg * 0.7)},${Math.floor(bb * 0.7)})`);
    ctx.fillStyle = bodyGrad;
    ctx.fillRect(b.x, baseY, b.w, b.h);

    // Edge highlights
    ctx.strokeStyle = `rgba(100, 130, 200, ${0.06 * depthDarken})`;
    ctx.lineWidth = 0.5;
    ctx.strokeRect(b.x, baseY, b.w, b.h);

    // Left edge highlight (metallic)
    ctx.fillStyle = `rgba(150, 170, 220, ${0.04 * depthDarken})`;
    ctx.fillRect(b.x, baseY, 2, b.h);

    // Spire
    if (b.hasSpire) {
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.4, baseY);
      ctx.lineTo(b.x + b.w * 0.5, baseY - b.spireH);
      ctx.lineTo(b.x + b.w * 0.6, baseY);
      ctx.fillStyle = `rgb(${br + 2},${bg + 2},${bb + 4})`;
      ctx.fill();
      // Spire light
      ctx.beginPath();
      ctx.arc(b.x + b.w * 0.5, baseY - b.spireH, 2, 0, 6.28);
      const spireFlicker = 0.5 + 0.5 * Math.sin(t * 3 + b.x);
      ctx.fillStyle = neonRGB('cyan', 0.8 * spireFlicker);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x + b.w * 0.5, baseY - b.spireH, 6, 0, 6.28);
      ctx.fillStyle = neonRGB('cyan', 0.15 * spireFlicker);
      ctx.fill();
    }

    // Antenna
    if (b.hasAntenna) {
      ctx.strokeStyle = `rgba(100, 120, 180, ${0.3 * depthDarken})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.5, baseY);
      ctx.lineTo(b.x + b.w * 0.5, baseY - b.antennaH);
      ctx.stroke();
      const blink = Math.sin(t * 4 + b.x) > 0.3 ? 0.9 : 0.1;
      ctx.beginPath();
      ctx.arc(b.x + b.w * 0.5, baseY - b.antennaH, 1.5, 0, 6.28);
      ctx.fillStyle = neonRGB('pink', blink);
      ctx.fill();
    }

    // Windows
    const cellW = b.w / b.windowCols;
    const cellH = b.h / b.windowRows;
    const winW = cellW * 0.55;
    const winH = cellH * 0.4;

    b.windows.forEach(win => {
      if (win.color === 'off') return;
      const wx = b.x + win.c * cellW + (cellW - winW) / 2;
      const wy = baseY + win.r * cellH + (cellH - winH) / 2;

      if (win.color === 'warm') {
        const flicker = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.5 + win.flicker));
        ctx.fillStyle = `rgba(255, 220, 140, ${0.35 * flicker * depthDarken})`;
        ctx.fillRect(wx, wy, winW, winH);
        // Glow
        ctx.fillStyle = `rgba(255, 200, 100, ${0.06 * flicker * depthDarken})`;
        ctx.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);
      } else {
        const nc = NEON[win.color] || NEON.cyan;
        const flicker = 0.5 + 0.5 * Math.abs(Math.sin(t * 0.8 + win.flicker));
        ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${0.4 * flicker * depthDarken})`;
        ctx.fillRect(wx, wy, winW, winH);
        ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${0.08 * flicker * depthDarken})`;
        ctx.fillRect(wx - 2, wy - 1, winW + 4, winH + 2);
      }
    });

    // Neon sign strip
    if (b.hasNeonSign && b.depth > 0.3) {
      const signY2 = baseY + b.h * b.signY;
      const nc = NEON[b.neon];
      const pulse2 = 0.5 + 0.5 * Math.sin(t * 1.5 + b.x * 0.1);
      ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${0.25 * pulse2})`;
      ctx.fillRect(b.x + 3, signY2, b.w - 6, 2.5);
      // Glow around sign
      ctx.shadowColor = `rgba(${nc[0]},${nc[1]},${nc[2]},${0.4 * pulse2})`;
      ctx.shadowBlur = 12;
      ctx.fillRect(b.x + 3, signY2, b.w - 6, 2.5);
      ctx.shadowBlur = 0;
    }
  }

  // --- Draw Reflections on ground ---
  function drawReflections() {
    const reflH = H * 0.08;
    const reflY = H - reflH;

    // Wet ground base
    ctx.fillStyle = 'rgba(3, 4, 12, 0.9)';
    ctx.fillRect(0, reflY, W, reflH);

    // Reflected building glow
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.scale(1, -0.15);
    ctx.translate(0, -H / 0.15 + reflH * 2);
    buildings.forEach(b => {
      if (b.depth < 0.4) return;
      const nc = NEON[b.neon];
      const baseY2 = H - b.h;
      ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},0.3)`;
      ctx.fillRect(b.x, baseY2, b.w, b.h * 0.3);
    });
    ctx.restore();

    // Horizontal shimmer lines
    const t = frame * 0.015;
    for (let i = 0; i < 6; i++) {
      const ly = reflY + 4 + i * (reflH / 6);
      const shimmer = 0.3 + 0.7 * Math.abs(Math.sin(t + i * 1.2));
      ctx.fillStyle = `rgba(0, 240, 255, ${0.015 * shimmer})`;
      ctx.fillRect(0, ly, W, 1);
    }
  }

  // --- Draw Rain ---
  function drawRain() {
    ctx.strokeStyle = 'rgba(150, 180, 255, 0.08)';
    ctx.lineWidth = 0.5;
    raindrops.forEach(r => {
      ctx.globalAlpha = r.opacity;
      ctx.beginPath();
      ctx.moveTo(r.x, r.y);
      ctx.lineTo(r.x - 0.5, r.y + r.len);
      ctx.stroke();
      r.y += r.speed;
      r.x -= 0.3;
      if (r.y > H) {
        r.y = -r.len;
        r.x = Math.random() * W;
      }
    });
    ctx.globalAlpha = 1;
  }

  // --- Draw Floating Particles ---
  function drawParticles() {
    particles.forEach(p => {
      const nc = NEON[p.color];
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, 6.28);
      ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${p.opacity})`;
      ctx.fill();
      // Glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, 6.28);
      ctx.fillStyle = `rgba(${nc[0]},${nc[1]},${nc[2]},${p.opacity * 0.15})`;
      ctx.fill();

      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
    });
  }

  // --- Draw Atmospheric Fog ---
  function drawFog() {
    const t = frame * 0.005;
    const fogGrad = ctx.createLinearGradient(0, H * 0.5, 0, H);
    const pulse = 0.5 + 0.5 * Math.sin(t);
    fogGrad.addColorStop(0, 'transparent');
    fogGrad.addColorStop(0.4, `rgba(10, 8, 30, ${0.1 * pulse})`);
    fogGrad.addColorStop(0.7, `rgba(20, 10, 40, ${0.2 * pulse})`);
    fogGrad.addColorStop(1, `rgba(10, 5, 25, ${0.4})`);
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, H * 0.5, W, H * 0.5);

    // Colored fog wisps
    const fogX = W * (0.3 + 0.4 * Math.sin(t * 0.7));
    const fog1 = ctx.createRadialGradient(fogX, H * 0.85, 0, fogX, H * 0.85, W * 0.3);
    fog1.addColorStop(0, `rgba(0, 240, 255, ${0.012 * pulse})`);
    fog1.addColorStop(1, 'transparent');
    ctx.fillStyle = fog1;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);

    const fogX2 = W * (0.7 + 0.2 * Math.cos(t * 0.5));
    const fog2 = ctx.createRadialGradient(fogX2, H * 0.8, 0, fogX2, H * 0.8, W * 0.2);
    fog2.addColorStop(0, `rgba(180, 90, 255, ${0.01 * pulse})`);
    fog2.addColorStop(1, 'transparent');
    ctx.fillStyle = fog2;
    ctx.fillRect(0, H * 0.6, W, H * 0.4);
  }

  // --- Draw Light Beams ---
  function drawBeams() {
    const t = frame * 0.008;
    buildings.forEach(b => {
      if (!b.hasSpire || b.depth < 0.5) return;
      const nc = NEON[b.neon];
      const pulse = 0.3 + 0.7 * Math.abs(Math.sin(t + b.x * 0.05));
      const beamX = b.x + b.w * 0.5;
      const beamY = H - b.h - b.spireH;
      const grad = ctx.createLinearGradient(beamX, beamY, beamX, 0);
      grad.addColorStop(0, `rgba(${nc[0]},${nc[1]},${nc[2]},${0.06 * pulse})`);
      grad.addColorStop(0.5, `rgba(${nc[0]},${nc[1]},${nc[2]},${0.02 * pulse})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(beamX - 1, beamY);
      ctx.lineTo(beamX - 15, 0);
      ctx.lineTo(beamX + 15, 0);
      ctx.lineTo(beamX + 1, beamY);
      ctx.fill();
    });
  }

  // --- Main Loop ---
  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawBeams();
    buildings.forEach(drawBuilding);
    drawFog();
    drawReflections();
    drawRain();
    drawParticles();
    frame++;
    requestAnimationFrame(draw);
  }

  // --- Init ---
  window.addEventListener('resize', () => { resize(); });
  resize();
  draw();
})();
