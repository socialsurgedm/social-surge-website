/* ============================================================
   SOCIAL SURGE — Signal Animation Engine
   Animated signal waves, traveling pulses, counters, reveals.
   ============================================================ */
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile nav ---------- */
  const burger = document.querySelector('.hamburger');
  const links = document.querySelector('.nav-links');
  if (burger && links) {
    burger.addEventListener('click', () => links.classList.toggle('open'));
  }

  /* ---------- Scroll reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        if (e.target.dataset.count) runCounter(e.target);
        if (e.target.classList.contains('js-chart')) drawChart(e.target);
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.18 });
  document.querySelectorAll('.reveal, [data-count], .js-chart').forEach((el) => io.observe(el));

  /* ---------- Animated counters ---------- */
  function runCounter(el) {
    const target = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const dur = 1600;
    if (reduced) { el.textContent = prefix + target.toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix; return; }
    const start = performance.now();
    (function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + (target * eased).toLocaleString('en-GB', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }

  /* ---------- Signal field canvas (hero backdrop) ---------- */
  document.querySelectorAll('canvas.signal-canvas').forEach((canvas) => {
    if (reduced) return;
    const ctx = canvas.getContext('2d');
    let w, h, t = 0;
    const waves = [
      { amp: 26, freq: 0.010, speed: 0.016, y: 0.42, color: 'rgba(142,183,215,0.9)', lw: 1.6 },
      { amp: 18, freq: 0.014, speed: 0.022, y: 0.55, color: 'rgba(180,170,172,0.8)', lw: 1.3 },
      { amp: 34, freq: 0.007, speed: 0.011, y: 0.68, color: 'rgba(142,183,215,0.55)', lw: 1.1 },
      { amp: 12, freq: 0.02,  speed: 0.03,  y: 0.32, color: 'rgba(180,170,172,0.5)', lw: 1.0 }
    ];
    const pulses = waves.map((_, i) => ({ x: Math.random(), speed: 0.0016 + i * 0.0007 }));
    function resize() {
      const r = canvas.parentElement.getBoundingClientRect();
      w = canvas.width = r.width * devicePixelRatio;
      h = canvas.height = r.height * devicePixelRatio;
    }
    resize();
    window.addEventListener('resize', resize);
    function waveY(wv, x) {
      return h * wv.y
        + Math.sin(x * wv.freq / devicePixelRatio + t * wv.speed * 60) * wv.amp * devicePixelRatio * 0.5
        + Math.sin(x * wv.freq * 0.37 / devicePixelRatio + t * wv.speed * 100) * wv.amp * devicePixelRatio * 0.5;
    }
    (function frame() {
      if (!canvas.isConnected) return;
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      waves.forEach((wv, i) => {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 6) {
          const y = waveY(wv, x);
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = wv.color;
        ctx.lineWidth = wv.lw * devicePixelRatio;
        ctx.stroke();
        // traveling pulse dot with glow
        const p = pulses[i];
        p.x += p.speed; if (p.x > 1.05) p.x = -0.05;
        const px = p.x * w, py = waveY(wv, px);
        const grad = ctx.createRadialGradient(px, py, 0, px, py, 14 * devicePixelRatio);
        grad.addColorStop(0, 'rgba(142,183,215,0.55)');
        grad.addColorStop(1, 'rgba(142,183,215,0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(px, py, 14 * devicePixelRatio, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(108,156,196,0.85)';
        ctx.beginPath(); ctx.arc(px, py, 2.4 * devicePixelRatio, 0, Math.PI * 2); ctx.fill();
      });
      requestAnimationFrame(frame);
    })();
  });

  /* ---------- Animated line chart (SVG path draw + area fill) ---------- */
  function drawChart(el) {
    const svg = el.querySelector('svg');
    if (!svg) return;
    const path = svg.querySelector('.line');
    const area = svg.querySelector('.area');
    const dot = svg.querySelector('.chart-dot');
    const ring = svg.querySelector('.chart-ring');
    const valueLabel = svg.querySelector('.chart-value');
    const markersGroup = svg.querySelector('.chart-markers');
    if (!path) return;
    const len = path.getTotalLength();
    // Value scale matches SVG y-axis: £450K at y=200, £850K at y=40 (2.5£K per px)
    const valFromY = (y) => 450 + (200 - y) * 2.5;
    const MARKERS = [0.25, 0.45, 0.63, 0.82]; // Feb–May data points along the line
    const dropped = [];
    const fmt = (v) => '\u00a3' + Math.round(v) + 'K';

    function placeValue(pt, v) {
      if (!valueLabel) return;
      valueLabel.textContent = fmt(v);
      valueLabel.setAttribute('x', Math.min(Math.max(pt.x - 24, 14), 448));
      valueLabel.setAttribute('y', Math.max(pt.y - 16, 18));
      valueLabel.style.opacity = 1;
    }
    function dropMarker(frac) {
      if (!markersGroup) return;
      const pt = path.getPointAtLength(len * frac);
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.setAttribute('r', 3.5);
      c.setAttribute('fill', '#ffffff'); c.setAttribute('stroke', '#8a7f82'); c.setAttribute('stroke-width', '2');
      c.style.opacity = 0; c.style.transition = 'opacity 0.4s ease';
      markersGroup.appendChild(c);
      requestAnimationFrame(() => { c.style.opacity = 1; });
    }
    function finish() {
      const pt = path.getPointAtLength(len);
      dot && (dot.setAttribute('cx', pt.x), dot.setAttribute('cy', pt.y), dot.style.opacity = 1);
      if (ring) { ring.setAttribute('cx', pt.x); ring.setAttribute('cy', pt.y); ring.classList.add('pulsing'); }
      placeValue(pt, valFromY(pt.y));
    }

    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = reduced ? 0 : len;
    if (area) { area.style.opacity = reduced ? 0.3 : 0; }
    if (!reduced) {
      path.getBoundingClientRect();
      path.style.transition = 'stroke-dashoffset 2.2s ease-out';
      path.style.strokeDashoffset = 0;
      if (area) { area.style.transition = 'opacity 1.2s ease 1.2s'; area.style.opacity = 0.3; }
      let start = null;
      (function move(ts) {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 2200, 1);
        const eased = 1 - Math.pow(1 - p, 2.5);
        const pt = path.getPointAtLength(len * eased);
        if (dot) { dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y); dot.style.opacity = 1; }
        placeValue(pt, valFromY(pt.y));
        MARKERS.forEach((m, i) => { if (eased >= m && !dropped[i]) { dropped[i] = true; dropMarker(m); } });
        if (p < 1) requestAnimationFrame(move); else finish();
      })(performance.now());
    } else {
      MARKERS.forEach(dropMarker);
      finish();
    }
  }

  /* ---------- Signal divider pulse travel ---------- */
  document.querySelectorAll('.signal-divider').forEach((div) => {
    if (reduced) return;
    const wavePath = div.querySelector('.wave');
    const dot = div.querySelector('.pulse-dot-svg');
    if (!wavePath || !dot) return;
    const len = wavePath.getTotalLength();
    let prog = Math.random();
    (function move() {
      if (!div.isConnected) return;
      prog += 0.0025; if (prog > 1) prog = 0;
      const pt = wavePath.getPointAtLength(len * prog);
      dot.setAttribute('cx', pt.x); dot.setAttribute('cy', pt.y);
      requestAnimationFrame(move);
    })();
  });

  /* ---------- Ticker duplication for seamless loop ---------- */
  document.querySelectorAll('.ticker').forEach((tk) => {
    tk.innerHTML += tk.innerHTML;
  });
})();
