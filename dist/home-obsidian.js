/* No dependencies or remote data calls. All preview interactions stay local. */
(() => {
  'use strict';
  const root = document.getElementById('trimeverse-obsidian');
  if (!root || root.dataset.initialized) return;
  root.dataset.initialized = 'true';
  const $ = (selector) => root.querySelector(selector);
  const $$ = (selector) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  // Compact navigation and local section links; external lab links remain real links.
  const menu = $('.tv-menu');
  const navLinks = $('#tv-nav-links');
  function closeMenu() {
    menu.setAttribute('aria-expanded', 'false');
    navLinks.classList.remove('tv-nav-open');
  }
  menu.addEventListener('click', () => {
    const open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    navLinks.classList.toggle('tv-nav-open', open);
  });
  root.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
      closeMenu();
      menu.focus();
    }
  });
  $$('a[href^="#tv-"]:not(.tv-skip)').forEach((link) => link.addEventListener('click', (event) => {
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();
    closeMenu();
    target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  }));

  // One motion control owns the video, ambient field and moving diagram views.
  const cinema = $('#tv-cinema');
  const spaceVideo = $('.tv-cinema-video');
  let sceneFrame = 0;
  let sceneTime = 0;
  let previousSceneFrame = 0;
  let inView = true;
  let heroInView = true;
  let cinemaPlaying = false;
  function setCinema(playing) {
    cinemaPlaying = playing && !reducedMotion.matches;
    cinema.classList.toggle('tv-playing', cinemaPlaying);
    root.dataset.motion = cinemaPlaying ? 'on' : 'off';
    root.dataset.visible = String(!document.hidden && inView);
    $$('[data-cinema]').forEach((button) => button.setAttribute('aria-pressed', String(cinemaPlaying)));
    $('[data-cinema-label]').textContent = cinemaPlaying ? 'Pause all motion' : 'Play space motion';
    $('.tv-play-symbol').textContent = cinemaPlaying ? 'Ⅱ' : '▶';
    $('[data-motion-label]').textContent = reducedMotion.matches ? 'Reduced motion' : cinemaPlaying ? 'Motion on' : 'Motion off';
    cancelAnimationFrame(sceneFrame); sceneFrame = 0; previousSceneFrame = 0;
    syncVideo();
    if (cinemaPlaying && !document.hidden && inView) sceneFrame = requestAnimationFrame(sceneTick);
  }
  function syncVideo() {
    if (cinemaPlaying && !document.hidden && inView && heroInView) {
      spaceVideo.muted = true;
      const play = spaceVideo.play();
      if (play) play.catch(() => {
        // Browsers may require a gesture; the visible motion control can retry.
        if (spaceVideo.paused && cinemaPlaying && !document.hidden && heroInView) setCinema(false);
      });
    } else spaceVideo.pause();
  }
  $$('[data-cinema]').forEach((button) => button.addEventListener('click', () => setCinema(!cinemaPlaying)));

  // Ring supplements the native pointer. It never replaces or hides it.
  const cursor = $('.tv-cursor');
  let pointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let pointerIsActive = false;
  root.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || reducedMotion.matches || event.pointerType === 'touch') return;
    const bounds = root.getBoundingClientRect();
    pointerX = event.clientX - bounds.left;
    pointerY = event.clientY - bounds.top;
    pointerIsActive = Boolean(event.target.closest('a,button,summary'));
    if (!pointerFrame) pointerFrame = requestAnimationFrame(() => {
      const radius = pointerIsActive ? 21 : 14;
      cursor.style.transform = `translate3d(${pointerX - radius}px,${pointerY - radius}px,0)`;
      cursor.classList.toggle('tv-cursor-active', pointerIsActive);
      cursor.style.opacity = '1';
      pointerFrame = 0;
    });
  });
  root.addEventListener('pointerleave', () => {
    cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
    cursor.style.opacity = '0';
  });
  $$('.tv-module').forEach((card) => card.addEventListener('pointermove', (event) => {
    if (reducedMotion.matches || !finePointer.matches) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--tv-x', `${event.clientX - rect.left}px`);
    card.style.setProperty('--tv-y', `${event.clientY - rect.top}px`);
  }));
  $$('.tv-button').forEach((button) => button.addEventListener('click', (event) => {
    if (reducedMotion.matches) return;
    const bounds = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'tv-ripple';
    ripple.setAttribute('aria-hidden', 'true');
    ripple.style.left = `${event.detail ? event.clientX - bounds.left : bounds.width / 2}px`;
    ripple.style.top = `${event.detail ? event.clientY - bounds.top : bounds.height / 2}px`;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  }));

  // Deterministic samples keep both previews stable across resizes.
  function seededRandom(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function fitCanvas(canvas, maximumRatio = 2) {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const ratio = Math.min(window.devicePixelRatio || 1, maximumRatio);
    if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio);
    if (canvas.height !== Math.round(height * ratio)) canvas.height = Math.round(height * ratio);
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    return { context, width, height };
  }

  // Hydrogen stationary-state measurement samples, not orbiting electrons.
  // x = r/a0. P_1s(x) = 4*x²*exp(-2*x); P_2s(x) = x²*(2-x)²*exp(-x)/8.
  // Sample the 3D radial density with isotropic angles, then project onto x/y.
  // r <= 24 a0 omits a tiny tail; the view extent differs and is explicitly labeled.
  function sampleHydrogen(state) {
    const random = seededRandom(state === '1s' ? 109 : 209);
    const probability = state === '1s'
      ? (r) => 4 * r * r * Math.exp(-2 * r)
      : (r) => r * r * (2 - r) ** 2 * Math.exp(-r) / 8;
    const maximum = state === '1s' ? 0.55 : 0.20;
    const samples = [];
    while (samples.length < 2400) {
      const radius = random() * 24;
      if (random() * maximum > probability(radius)) continue;
      const cosine = 2 * random() - 1;
      const sine = Math.sqrt(1 - cosine * cosine);
      const phi = random() * Math.PI * 2;
      samples.push({ x: radius * sine * Math.cos(phi), y: radius * cosine, z: radius * sine * Math.sin(phi), opacity: .22 + random() * .58 });
    }
    return samples;
  }
  const hydrogen = { '1s': sampleHydrogen('1s'), '2s': sampleHydrogen('2s') };
  const quantumCanvas = $('#tv-quantum-canvas');
  let quantumState = '1s';
  function drawQuantum() {
    const fitted = fitCanvas(quantumCanvas);
    if (!fitted) return;
    const { context: ctx, width: w, height: h } = fitted;
    const cx = w / 2; const cy = h / 2 - 5;
    const extent = quantumState === '1s' ? 6 : 18;
    const scale = Math.min(w / 2 - 12, h / 2 - 7) / extent;
    const cameraAngle = sceneTime * .23;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * .48);
    glow.addColorStop(0, 'rgba(138,43,226,.12)');
    glow.addColorStop(1, 'rgba(138,43,226,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(193,179,236,.08)'; ctx.lineWidth = .75;
    ctx.beginPath(); ctx.moveTo(18, cy); ctx.lineTo(w - 18, cy); ctx.moveTo(cx, 8); ctx.lineTo(cx, h - 23); ctx.stroke();
    for (const point of hydrogen[quantumState]) {
      const x = cx + (point.x * Math.cos(cameraAngle) + point.z * Math.sin(cameraAngle)) * scale;
      const y = cy + point.y * scale;
      if (x < 3 || x > w - 3 || y < 3 || y > h - 12) continue;
      ctx.fillStyle = `rgba(185,137,255,${point.opacity})`;
      ctx.beginPath(); ctx.arc(x, y, .65, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#e2ceff'; ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, Math.PI * 2); ctx.fill();
  }
  $$('[data-state]').forEach((button) => button.addEventListener('click', () => {
    quantumState = button.dataset.state;
    $$('[data-state]').forEach((choice) => choice.setAttribute('aria-pressed', String(choice === button)));
    $('#tv-quantum-status').textContent = `Hydrogen · ${quantumState} state`;
    $('#tv-quantum-view').textContent = `View: ±${quantumState === '1s' ? 6 : 18} a₀`;
    quantumCanvas.setAttribute('aria-label', `A projected probability cloud of the hydrogen ${quantumState} state. Dots represent possible electron measurements, not electron paths.`);
    drawQuantum();
    if (!reducedMotion.matches && quantumCanvas.animate) quantumCanvas.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
  }));

  // Interface-only synthetic sky: no constellation names or live-source claims.
  const skyCanvas = $('#tv-sky-canvas');
  const skyRandom = seededRandom(787);
  const skyPoints = Array.from({ length: 128 }, () => ({ x: skyRandom(), y: skyRandom(), size: .5 + skyRandom() * 1.05 }));
  const scanButton = $('#tv-scan');
  let sourceCount = 48;
  let scanFraction = null;
  let scanFrame = 0;
  let scanStart = 0;
  let scanPausedAt = 0;
  function drawSky() {
    const fitted = fitCanvas(skyCanvas);
    if (!fitted) return;
    const { context: ctx, width: w, height: h } = fitted;
    const bottom = h - 26;
    ctx.strokeStyle = 'rgba(151,168,194,.1)'; ctx.lineWidth = .65;
    for (let x = 20; x < w; x += 35) { ctx.beginPath(); ctx.moveTo(x, 8); ctx.lineTo(x, bottom); ctx.stroke(); }
    for (let y = 15; y < bottom; y += 29) { ctx.beginPath(); ctx.moveTo(12, y); ctx.lineTo(w - 12, y); ctx.stroke(); }
    skyPoints.forEach((point, index) => {
      const detected = index < sourceCount;
      ctx.fillStyle = detected ? 'rgba(152,235,246,.86)' : 'rgba(104,125,155,.32)';
      ctx.beginPath(); ctx.arc(18 + point.x * (w - 36), 13 + point.y * (bottom - 19), point.size * (detected ? 1 : .65), 0, Math.PI * 2); ctx.fill();
    });
    // A reticle highlights one sample source, not a real celestial coordinate.
    const selected = skyPoints[Math.max(0, Math.min(sourceCount - 1, 127))];
    const sx = 18 + selected.x * (w - 36); const sy = 13 + selected.y * (bottom - 19);
    ctx.strokeStyle = 'rgba(0,240,255,.6)'; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.stroke();
    const displayedScan = scanFraction !== null ? scanFraction : (sceneTime % 7) / 7;
    if (cinemaPlaying || scanFraction !== null) {
      const scanX = 12 + displayedScan * (w - 24);
      const gradient = ctx.createLinearGradient(Math.max(0, scanX - 40), 0, scanX, 0);
      gradient.addColorStop(0, 'rgba(0,240,255,0)'); gradient.addColorStop(1, 'rgba(0,240,255,.14)');
      ctx.fillStyle = gradient; ctx.fillRect(Math.max(12, scanX - 40), 8, Math.min(40, scanX - 12), bottom - 8);
      ctx.strokeStyle = 'rgba(0,240,255,.75)'; ctx.beginPath(); ctx.moveTo(scanX, 8); ctx.lineTo(scanX, bottom); ctx.stroke();
    }
  }
  function updateCount() {
    $('#tv-source-count').replaceChildren(document.createTextNode(String(sourceCount)), Object.assign(document.createElement('span'), { textContent: ' / 128' }));
  }
  function completeScan() {
    cancelAnimationFrame(scanFrame); scanFrame = 0;
    sourceCount = 128; scanFraction = null;
    scanButton.disabled = false;
    scanButton.setAttribute('aria-label', 'Rescan simulated sky');
    $('#tv-scan-status').textContent = '128 simulated sources detected';
    updateCount(); drawSky();
  }
  function scanTick(now) {
    scanFrame = 0;
    if (document.hidden || scanPausedAt) return;
    scanFraction = Math.min(1, (now - scanStart) / 2400);
    sourceCount = Math.floor(scanFraction * 128);
    if (scanFraction >= 1) { completeScan(); return; }
    updateCount(); drawSky();
    scanFrame = requestAnimationFrame(scanTick);
  }
  scanButton.addEventListener('click', () => {
    if (reducedMotion.matches) { completeScan(); return; }
    sourceCount = 0; scanFraction = 0; scanStart = performance.now(); scanPausedAt = 0;
    scanButton.disabled = true;
    $('#tv-scan-status').textContent = 'Scanning simulated sky…';
    updateCount(); drawSky();
    scanFrame = requestAnimationFrame(scanTick);
  });

  // Decorative star field. Positions and twinkle are art direction, not sky data.
  const backgroundCanvas = $('#tv-background-canvas');
  const orbitCanvas = $('#tv-orbit-canvas');
  const backgroundRandom = seededRandom(11923);
  const backgroundStars = Array.from({ length: 240 }, () => ({
    x: backgroundRandom(), y: backgroundRandom(), depth: .2 + backgroundRandom() * .8,
    phase: backgroundRandom() * Math.PI * 2, tone: backgroundRandom(),
  }));
  const pointer = { x: 0, y: 0 };
  root.addEventListener('pointermove', (event) => {
    if (!finePointer.matches || !cinemaPlaying || reducedMotion.matches) return;
    const box = root.getBoundingClientRect();
    pointer.x = ((event.clientX - box.left) / box.width - .5) * 16;
    pointer.y = ((event.clientY - box.top) / Math.min(box.height, 900) - .5) * 12;
  });
  root.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; });
  function drawBackground() {
    const fitted = fitCanvas(backgroundCanvas, 1);
    if (!fitted) return;
    const { context: ctx, width: w, height: h } = fitted;
    for (const star of backgroundStars) {
      const x = ((star.x * w + sceneTime * (1 + star.depth * 2) + pointer.x * star.depth) % w + w) % w;
      const y = ((star.y * h - sceneTime * (1 + star.depth * 4) + pointer.y * star.depth) % h + h) % h;
      const brightness = (.22 + star.depth * .48) * (.72 + .28 * Math.sin(sceneTime * .9 + star.phase));
      const rgb = star.tone < .17 ? '166,141,243' : star.tone < .4 ? '117,213,233' : '210,221,245';
      ctx.fillStyle = `rgba(${rgb},${brightness})`;
      ctx.beginPath(); ctx.arc(x, y, .45 + star.depth * .95, 0, Math.PI * 2); ctx.fill();
      if (star.depth > .94) {
        ctx.strokeStyle = `rgba(${rgb},${brightness * .32})`; ctx.lineWidth = .6;
        ctx.beginPath(); ctx.moveTo(x - 3.6, y); ctx.lineTo(x + 3.6, y); ctx.moveTo(x, y - 3.6); ctx.lineTo(x, y + 3.6); ctx.stroke();
      }
    }
    const phase = sceneTime % 11;
    if (phase > 1 && phase < 2.35) {
      const progress = (phase - 1) / 1.35;
      const x = w * (.95 - progress * .38), y = 110 + progress * 180;
      const gradient = ctx.createLinearGradient(x + 65, y - 38, x, y);
      gradient.addColorStop(0, 'rgba(107,204,235,0)'); gradient.addColorStop(1, `rgba(181,234,255,${Math.sin(progress * Math.PI) * .7})`);
      ctx.strokeStyle = gradient; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x + 65, y - 38); ctx.lineTo(x, y); ctx.stroke();
    }
  }

  // A circular Keplerian-orbit diagram. Radii share a scale; bodies are enlarged.
  // Normalized mu gives T proportional to a^(3/2). No mutual perturbations modeled.
  const planets = [
    { a: .55, phase: .5, color: '#bd9aff', radius: 4 },
    { a: 1, phase: 2.8, color: '#72e2f0', radius: 6 },
    { a: 1.52, phase: 4.8, color: '#e6bb98', radius: 5 },
  ];
  function drawOrbits() {
    const fitted = fitCanvas(orbitCanvas);
    if (!fitted) return;
    const { context: ctx, width: w, height: h } = fitted;
    const unit = Math.min(w * .275, h * .57);
    ctx.save(); ctx.translate(w * .53, h * .49); ctx.rotate(-.22);
    ctx.strokeStyle = 'rgba(163,179,207,.19)'; ctx.lineWidth = .75;
    planets.forEach((planet) => {
      ctx.beginPath(); ctx.ellipse(0, 0, unit * planet.a, unit * planet.a * .43, 0, 0, Math.PI * 2); ctx.stroke();
    });
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 44);
    glow.addColorStop(0, 'rgba(255,207,137,.5)'); glow.addColorStop(.2, 'rgba(255,166,73,.18)'); glow.addColorStop(1, 'rgba(255,151,61,0)');
    ctx.fillStyle = glow; ctx.fillRect(-44, -44, 88, 88);
    ctx.fillStyle = '#ffe2b6'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
    planets.forEach((planet) => {
      const angle = planet.phase + sceneTime * (Math.PI * 2 / 18) / planet.a ** 1.5;
      for (let trail = 18; trail >= 1; trail--) {
        const tail = angle - trail * .018;
        ctx.globalAlpha = (1 - trail / 19) * .2;
        ctx.fillStyle = planet.color; ctx.beginPath(); ctx.arc(Math.cos(tail) * unit * planet.a, Math.sin(tail) * unit * planet.a * .43, 1.3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const px = Math.cos(angle) * unit * planet.a, py = Math.sin(angle) * unit * planet.a * .43;
      const light = ctx.createRadialGradient(px - Math.sign(px) * planet.radius * .35, py - Math.sign(py) * planet.radius * .35, .5, px, py, planet.radius);
      light.addColorStop(0, '#f2faff'); light.addColorStop(.3, planet.color); light.addColorStop(1, '#202d49');
      ctx.fillStyle = light; ctx.beginPath(); ctx.arc(px, py, planet.radius, 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();
  }

  // One capped render loop; time stops while paused, hidden or outside the viewport.
  const visibleCanvases = new Set([quantumCanvas, skyCanvas, orbitCanvas, backgroundCanvas]);
  function sceneTick(now) {
    sceneFrame = 0;
    if (!root.isConnected || !cinemaPlaying || document.hidden || !inView) return;
    if (!previousSceneFrame) previousSceneFrame = now;
    const elapsed = now - previousSceneFrame;
    if (elapsed >= 1000 / 30) {
      sceneTime += Math.min(elapsed, 100) / 1000; previousSceneFrame = now;
      if (visibleCanvases.has(backgroundCanvas)) drawBackground();
      if (visibleCanvases.has(orbitCanvas)) drawOrbits();
      if (visibleCanvases.has(quantumCanvas)) drawQuantum();
      if (visibleCanvases.has(skyCanvas) && scanFraction === null) drawSky();
    }
    sceneFrame = requestAnimationFrame(sceneTick);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.target === root) { inView = entry.isIntersecting; setCinema(cinemaPlaying); }
      else if (entry.target === cinema) { heroInView = entry.isIntersecting; syncVideo(); }
      else if (entry.isIntersecting) visibleCanvases.add(entry.target);
      else visibleCanvases.delete(entry.target);
    }), { threshold: 0 });
    [root, cinema, ...visibleCanvases].forEach((element) => observer.observe(element));
  }
  document.addEventListener('visibilitychange', () => {
    cinema.style.animationPlayState = document.hidden ? 'paused' : '';
    $('.tv-cinema-image').style.animationPlayState = document.hidden ? 'paused' : '';
    setCinema(cinemaPlaying);
    if (document.hidden) {
      cursor.style.opacity = '0';
      if (scanButton.disabled && !scanPausedAt) { scanPausedAt = performance.now(); cancelAnimationFrame(scanFrame); scanFrame = 0; }
    } else if (scanPausedAt) {
      scanStart += performance.now() - scanPausedAt; scanPausedAt = 0;
      scanFrame = requestAnimationFrame(scanTick);
    }
  });
  reducedMotion.addEventListener('change', () => {
    setCinema(false);
    if (reducedMotion.matches && scanButton.disabled) completeScan();
    cursor.style.opacity = '0';
  });
  const redraw = () => { drawQuantum(); drawSky(); drawBackground(); drawOrbits(); };
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(redraw);
    observer.observe(quantumCanvas); observer.observe(skyCanvas);
    observer.observe(orbitCanvas); observer.observe(backgroundCanvas);
  } else {
    window.addEventListener('resize', redraw, { passive: true });
  }
  setCinema(true);
  redraw();
})();
