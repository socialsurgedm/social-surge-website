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

  /* ---------- Animated multi-line chart (SVG path draw, per-series dot + counting value) ---------- */
  function drawChart(el) {
    const svg = el.querySelector('svg');
    if (!svg) return;
    const area = svg.querySelector('.area');
    const markersGroup = svg.querySelector('.chart-markers');
    const NS = 'http://www.w3.org/2000/svg';
    const MONTH_X = [116, 212, 308, 404]; // Feb–May data-point x positions
    const SERIES = [
      { sel: '.line-rev',  color: '#8a7f82', main: true, fmt: (v) => '\u00a3' + Math.round(v) + 'K', valFromY: (y) => 450 + (130 - y) / 0.225 },
      { sel: '.line-roas', color: '#7fa88f', fmt: (v) => v.toFixed(1) + 'x',                          valFromY: (y) => 10 + (160 - y) * 0.3 },
      { sel: '.line-cost', color: '#c98d7a', fmt: (v) => '\u00a3' + Math.round(v) + 'K',              valFromY: (y) => 25 + (215 - y) / 1.4 }
    ];

    const items = SERIES.map((s) => {
      const path = svg.querySelector(s.sel);
      if (!path) return null;
      const len = path.getTotalLength();
      // fraction along the path where each month's x is crossed (arc lengths differ per line)
      const fracs = MONTH_X.map((mx) => {
        let lo = 0, hi = len;
        for (let i = 0; i < 20; i++) { const mid = (lo + hi) / 2; if (path.getPointAtLength(mid).x < mx) lo = mid; else hi = mid; }
        return lo / len;
      });
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('r', s.main ? 6 : 4.5);
      dot.setAttribute('fill', s.color);
      dot.style.opacity = 0;
      if (s.main) dot.setAttribute('filter', 'drop-shadow(0 0 8px rgba(138,127,130,0.7))');
      const label = document.createElementNS(NS, 'text');
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('fill', s.color);
      label.setAttribute('font-size', s.main ? 15 : 12.5);
      label.setAttribute('font-weight', 700);
      label.style.opacity = 0;
      svg.appendChild(dot); svg.appendChild(label);
      let ring = null;
      if (s.main) {
        ring = document.createElementNS(NS, 'circle');
        ring.setAttribute('class', 'chart-ring'); ring.setAttribute('r', 6);
        ring.setAttribute('fill', 'none'); ring.setAttribute('stroke', s.color); ring.setAttribute('stroke-width', 2);
        ring.style.opacity = 0;
        svg.appendChild(ring);
      }
      return Object.assign({}, s, { path, len, fracs, dot, label, ring, dropped: [] });
    }).filter(Boolean);
    if (!items.length) return;

    function setDot(it, pt) { it.dot.setAttribute('cx', pt.x); it.dot.setAttribute('cy', pt.y); it.dot.style.opacity = 1; }
    function setLabel(it, pt) {
      it.label.textContent = it.fmt(it.valFromY(pt.y));
      it.label.setAttribute('x', Math.max(pt.x - 10, 74));
      it.label.setAttribute('y', Math.max(pt.y - 10, 16));
      it.label.style.opacity = 1;
    }
    function dropMarker(it, frac) {
      if (!markersGroup) return;
      const pt = it.path.getPointAtLength(it.len * frac);
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', pt.x); c.setAttribute('cy', pt.y); c.setAttribute('r', it.main ? 3.5 : 3);
      c.setAttribute('fill', '#ffffff'); c.setAttribute('stroke', it.color); c.setAttribute('stroke-width', '2');
      c.style.opacity = 0; c.style.transition = 'opacity 0.4s ease';
      markersGroup.appendChild(c);
      requestAnimationFrame(() => { c.style.opacity = 1; });
    }
    function finish() {
      items.forEach((it) => {
        const pt = it.path.getPointAtLength(it.len);
        setDot(it, pt); setLabel(it, pt);
        if (it.ring) { it.ring.setAttribute('cx', pt.x); it.ring.setAttribute('cy', pt.y); it.ring.classList.add('pulsing'); }
      });
    }

    items.forEach((it) => {
      it.path.style.strokeDasharray = it.len;
      it.path.style.strokeDashoffset = reduced ? 0 : it.len;
    });
    if (area) { area.style.opacity = reduced ? 0.3 : 0; }
    if (!reduced) {
      items[0].path.getBoundingClientRect();
      items.forEach((it) => { it.path.style.transition = 'stroke-dashoffset 2.2s ease-out'; it.path.style.strokeDashoffset = 0; });
      if (area) { area.style.transition = 'opacity 1.2s ease 1.2s'; area.style.opacity = 0.3; }
      let start = null;
      (function move(ts) {
        if (!start) start = ts;
        const p = Math.min((ts - start) / 2200, 1);
        const eased = 1 - Math.pow(1 - p, 2.5);
        items.forEach((it) => {
          const pt = it.path.getPointAtLength(it.len * eased);
          setDot(it, pt); setLabel(it, pt);
          it.fracs.forEach((f, i) => { if (eased >= f && !it.dropped[i]) { it.dropped[i] = true; dropMarker(it, f); } });
        });
        if (p < 1) requestAnimationFrame(move); else finish();
      })(performance.now());
    } else {
      items.forEach((it) => { it.fracs.forEach((f) => dropMarker(it, f)); });
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
