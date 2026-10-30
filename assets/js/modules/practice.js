/**
 * Practice problems (The Margins → In-page references). Pick a domain, a concept (or any) and a level;
 * get a generated problem, answer it with a keypad or a calculator, take hints one step at a time,
 * and see the worked solution after a wrong answer.
 *
 * Problems are generated in the browser by practice/<domain>.js (loaded on first use; see
 * practice/core.js), so the site stores code, not problems. practice/index.js lists which concept
 * keys have generators; every one of them passed tools/practice/verify.py.
 *
 * Links: #margins/practice/<key>[/<level>[/<seed>]] opens a problem; flashcard popups link here
 * (Site.practiceLink). Remembered in this browser: the last domain and level.
 */
(function (Site) {
'use strict';

var BASE = 'assets/js/practice/';
var DOMAINS = [
  ['algebra1', 'Algebra I'], ['algebra2', 'Algebra II'], ['geometry', 'Geometry'], ['trigonometry', 'Trigonometry'],
  ['calculus1', 'Calculus I'], ['calculus2', 'Calculus II'], ['linear-algebra', 'Linear Algebra'], ['calculus3', 'Calculus III'],
  ['vector-calculus', 'Vector Calculus'], ['physics', 'Physics'], ['statistics', 'Statistics & Probability'],
  ['optimization', 'Optimization & Simulation'], ['machine-learning', 'Machine Learning'], ['electrical', 'Electrical Engineering'],
  ['finance', 'Finance'], ['functions', 'Functions & Distributions'],
];
var LEVELS = ['Easy', 'Medium', 'Hard'];
var loaded = {};

function load(src) {
  if (!loaded[src]) {
    loaded[src] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = BASE + src;
      s.onload = resolve;
      s.onerror = function () { loaded[src] = null; reject(new Error('Could not load ' + src)); };
      document.head.appendChild(s);
    });
  }
  return loaded[src];
}
var loadDomain = function (d) { return load('core.js').then(function () { return load(d + '.js'); }); };

function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/** Flashcard info by concept key (cards carry `key`; gallery and glossary cards are their own key). */
function cardInfo() {
  var out = {};
  (Site.flashcards || []).forEach(function (deck) {
    deck.cards.forEach(function (c) {
      var key = c.key || (c.concept ? null : c.id);
      if (key && !out[key]) out[key] = { id: c.concept || c.id, title: c.keytopic ? '' : c.title, deck: deck.name };
    });
  });
  return out;
}

/** "#margins/practice/<key>" for a flashcard's concept, or null when it has no problems. */
Site.practiceLink = function (card) {
  var index = (window.Practice || {}).index || {};
  var key = card.key || card.concept || card.id;
  for (var d in index) if (index[d].indexOf(key) >= 0) return '#margins/practice/' + encodeURIComponent(key);
  return null;
};

// ---- Graphs (SVG) ----------------------------------------------------------------------------
var NS = 'http://www.w3.org/2000/svg';
function niceStep(span) {
  var raw = span / 8, mag = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 5, 10].map(function (m) { return m * mag; }).filter(function (s) { return raw <= s; })[0] || 10 * mag;
}
function svgEl(tag, attrs, parent) {
  var e = document.createElementNS(NS, tag);
  for (var k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

function drawGraph(spec) {
  var v = spec.view, x0 = v[0], x1 = v[1], y0 = v[2], y1 = v[3];
  var W = 480, H = spec.equal ? Math.min(480, Math.max(200, W * (y1 - y0) / (x1 - x0))) : 320;
  var pad = 8;
  var sx = function (x) { return pad + (x - x0) / (x1 - x0) * (W - 2 * pad); };
  var sy = function (y) { return H - pad - (y - y0) / (y1 - y0) * (H - 2 * pad); };
  var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'pg', role: 'img', 'aria-label': 'Graph for this problem' });
  var stepX = niceStep(x1 - x0), stepY = niceStep(y1 - y0);
  if (spec.grid !== false) {
    var g = svgEl('g', { class: 'pg__grid' }, svg);
    for (var gx = Math.ceil(x0 / stepX) * stepX; gx <= x1 + 1e-9; gx += stepX) svgEl('line', { x1: sx(gx), x2: sx(gx), y1: pad, y2: H - pad }, g);
    for (var gy = Math.ceil(y0 / stepY) * stepY; gy <= y1 + 1e-9; gy += stepY) svgEl('line', { y1: sy(gy), y2: sy(gy), x1: pad, x2: W - pad }, g);
  }
  if (spec.axes !== false) {
    var a = svgEl('g', { class: 'pg__axes' }, svg);
    if (y0 <= 0 && y1 >= 0) svgEl('line', { x1: pad, x2: W - pad, y1: sy(0), y2: sy(0) }, a);
    if (x0 <= 0 && x1 >= 0) svgEl('line', { y1: pad, y2: H - pad, x1: sx(0), x2: sx(0) }, a);
    var t = svgEl('g', { class: 'pg__ticks' }, svg);
    var ay = Math.min(Math.max(sy(0), pad + 12), H - pad - 4), axx = Math.min(Math.max(sx(0), pad + 4), W - pad - 24);
    var lab = function (v) { return Practice.fmt(v, 2); };
    for (var tx = Math.ceil(x0 / stepX) * stepX; tx <= x1 + 1e-9; tx += stepX) {
      if (Math.abs(tx) < 1e-9) continue;
      svgEl('text', { x: sx(tx), y: ay + 13, 'text-anchor': 'middle' }, t).textContent = lab(tx);
    }
    for (var ty = Math.ceil(y0 / stepY) * stepY; ty <= y1 + 1e-9; ty += stepY) {
      if (Math.abs(ty) < 1e-9) continue;
      svgEl('text', { x: axx - 4, y: sy(ty) + 4, 'text-anchor': 'end' }, t).textContent = lab(ty);
    }
  }
  var layer = svgEl('g', {}, svg);
  // the figure's center (mean of its drawn points), so side labels go outside a shape rather than on or in it
  var fpts = [];
  (spec.items || []).forEach(function (it) {
    if (it.a && it.b) fpts.push(it.a, it.b);
    if (it.p) fpts = fpts.concat(it.p);
    if (it.c) fpts.push(it.c);
  });
  var fcx = fpts.length ? fpts.reduce(function (s, q) { return s + sx(q[0]); }, 0) / fpts.length : W / 2;
  var fcy = fpts.length ? fpts.reduce(function (s, q) { return s + sy(q[1]); }, 0) / fpts.length : H / 2;
  var cls = function (it, base) { return base + ' pg--' + (it.role || 'primary'); };
  (spec.items || []).forEach(function (it) {
    if (it.t === 'fn') {
      var tree;
      try { tree = Practice.parse(it.e, ['x']); } catch (e) { return; }
      var d = '', pen = false, prev = null, prevStep = null, N = 400;
      for (var i = 0; i <= N; i++) {
        var x = x0 + (x1 - x0) * i / N, y;
        try { y = Practice.evaluate(tree, { x: x }); } catch (e) { y = NaN; }
        var ok = isFinite(y) && Math.abs(y - (y0 + y1) / 2) < 50 * (y1 - y0);
        // a jump across the whole view (an asymptote) lifts the pen
        if (ok && prev !== null && Math.abs(y - prev) > 3 * (y1 - y0)) pen = false;
        // a step (floor, Heaviside, sgn): one sample jumps far more than the one before, so no riser is drawn
        var step = ok && prev !== null ? Math.abs(y - prev) : null;
        if (step !== null && prevStep !== null && step > 0.02 * (y1 - y0) && step > 20 * prevStep) pen = false;
        if (ok) { d += (pen ? 'L' : 'M') + sx(x).toFixed(1) + ' ' + sy(y).toFixed(1); pen = true; prev = y; prevStep = step; }
        else { pen = false; prev = null; prevStep = null; }
      }
      svgEl('path', { d: d, class: cls(it, 'pg__fn') + (it.dash ? ' pg--dash' : '') }, layer);
    } else if (it.t === 'pt') {
      svgEl('circle', { cx: sx(it.x), cy: sy(it.y), r: 4.5, class: cls(it, 'pg__pt') }, layer);
      if (it.label) svgEl('text', { x: sx(it.x) + 7, y: sy(it.y) - 7, class: 'pg__label' }, layer).textContent = it.label;
    } else if (it.t === 'seg' || it.t === 'vec') {
      var l = svgEl('line', { x1: sx(it.a[0]), y1: sy(it.a[1]), x2: sx(it.b[0]), y2: sy(it.b[1]), class: cls(it, 'pg__seg') + (it.dash ? ' pg--dash' : '') + (it.t === 'vec' ? ' pg__vec' : '') }, layer);
      if (it.t === 'vec') l.setAttribute('marker-end', 'url(#pg-arrow-' + (it.role || 'primary') + ')');
      if (it.label) {
        // beside the segment's midpoint, on the side away from the figure's center (outside a triangle, not on its side)
        var mx = (sx(it.a[0]) + sx(it.b[0])) / 2, my = (sy(it.a[1]) + sy(it.b[1])) / 2;
        var ddx = sx(it.b[0]) - sx(it.a[0]), ddy = sy(it.b[1]) - sy(it.a[1]), len = Math.hypot(ddx, ddy) || 1;
        var nx = -ddy / len, ny = ddx / len;
        if (nx * (mx - fcx) + ny * (my - fcy) < 0) { nx = -nx; ny = -ny; }
        svgEl('text', { x: mx + 10 * nx, y: my + 10 * ny + 4, 'text-anchor': nx > 0.35 ? 'start' : nx < -0.35 ? 'end' : 'middle', class: 'pg__label' }, layer).textContent = it.label;
      }
    } else if (it.t === 'poly') {
      svgEl('polygon', { points: it.p.map(function (q) { return sx(q[0]) + ',' + sy(q[1]); }).join(' '), class: cls(it, 'pg__poly') + (it.fill === false ? ' pg--nofill' : '') }, layer);
      if (it.label) {
        var cx = it.p.reduce(function (s, q) { return s + q[0]; }, 0) / it.p.length, cy = it.p.reduce(function (s, q) { return s + q[1]; }, 0) / it.p.length;
        svgEl('text', { x: sx(cx), y: sy(cy), 'text-anchor': 'middle', class: 'pg__label' }, layer).textContent = it.label;
      }
    } else if (it.t === 'circle') {
      svgEl('ellipse', { cx: sx(it.c[0]), cy: sy(it.c[1]), rx: Math.abs(sx(it.r) - sx(0)), ry: Math.abs(sy(it.r) - sy(0)), class: cls(it, 'pg__circle') }, layer);
    } else if (it.t === 'text') {
      svgEl('text', { x: sx(it.x), y: sy(it.y), 'text-anchor': it.anchor || 'middle', class: 'pg__label' }, layer).textContent = it.s;
    } else if (it.t === 'vline') {
      svgEl('line', { x1: sx(it.x), x2: sx(it.x), y1: pad, y2: H - pad, class: cls(it, 'pg__seg') + (it.dash !== false ? ' pg--dash' : '') }, layer);
    } else if (it.t === 'hline') {
      svgEl('line', { y1: sy(it.y), y2: sy(it.y), x1: pad, x2: W - pad, class: cls(it, 'pg__seg') + (it.dash !== false ? ' pg--dash' : '') }, layer);
    }
  });
  // arrowheads for vectors, one per role so they take the role's colour
  var defs = svgEl('defs', {}, svg);
  ['primary', 'secondary', 'highlight', 'muted'].forEach(function (role) {
    var m = svgEl('marker', { id: 'pg-arrow-' + role, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
    svgEl('path', { d: 'M0 0L10 5L0 10z', class: 'pg__arrow pg--' + role }, m);
  });
  return svg;
}

Site.practiceGraph = drawGraph;   // also used by tools/practice/review.html

// ---- The view --------------------------------------------------------------------------------
Site.initPractice = function initPractice() {
  var view = document.getElementById('ref-practice');
  if (!view) return;
  var $ = function (sel) { return view.querySelector(sel); };
  var el = {
    domain: $('[data-pr-domain]'), concept: $('[data-pr-concept]'), levels: view.querySelectorAll('input[name="pr-level"]'),
    next: $('[data-pr-next]'), card: $('[data-pr-card]'), meta: $('[data-pr-meta]'), prompt: $('[data-pr-prompt]'), graph: $('[data-pr-graph]'),
    form: $('[data-pr-form]'), input: $('[data-pr-input]'), preview: $('[data-pr-preview]'), choices: $('[data-pr-choices]'),
    keypad: $('[data-pr-keypad]'), check: $('[data-pr-check]'), hint: $('[data-pr-hint]'), reveal: $('[data-pr-reveal]'),
    feedback: $('[data-pr-feedback]'), hints: $('[data-pr-hints]'), solution: $('[data-pr-solution]'), tally: $('[data-pr-tally]'),
    status: $('[data-pr-status]'), link: $('[data-pr-link]'),
  };
  var info = null, state = { domain: null, key: '', level: 1, seed: 0, problem: null, hintsShown: 0, done: false, right: 0, tried: 0 };
  try {
    var saved = JSON.parse(localStorage.getItem('practice') || '{}');
    if (saved.domain) state.domain = saved.domain;
    if (saved.level) state.level = saved.level;
  } catch (e) { /* storage blocked */ }
  var remember = function () { try { localStorage.setItem('practice', JSON.stringify({ domain: state.domain, level: state.level })); } catch (e) { /* ignore */ } };

  function available() {
    var index = (window.Practice || {}).index || {};
    return DOMAINS.filter(function (d) { return (index[d[0]] || []).length; });
  }

  function fillDomains() {
    var list = available();
    el.domain.innerHTML = list.map(function (d) { return '<option value="' + d[0] + '">' + esc(d[1]) + '</option>'; }).join('');
    if (!list.some(function (d) { return d[0] === state.domain; })) state.domain = list.length ? list[0][0] : null;
    el.domain.value = state.domain || '';
  }

  function fillConcepts() {
    info = info || cardInfo();
    var keys = (window.Practice.index || {})[state.domain] || [];
    var opts = keys.map(function (k) {
      var c = info[k] || { id: k, title: '' };
      return { key: k, id: c.id, label: c.id + (c.title ? ' ' + c.title : '') };
    });
    el.concept.innerHTML = '<option value="">Any concept</option>' + opts.map(function (o) {
      return '<option value="' + esc(o.key) + '">' + esc(o.label) + '</option>';
    }).join('');
    el.concept.value = keys.indexOf(state.key) >= 0 ? state.key : '';
  }

  function setLevel(level) {
    state.level = level;
    el.levels.forEach(function (r) { r.checked = Number(r.value) === level; });
  }

  function newSeed() { return Math.floor(Math.random() * 2147483647) + 1; }

  function generate(seed) {
    var keys = (window.Practice.index || {})[state.domain] || [];
    if (!keys.length) return;
    var key = state.key || keys[Math.floor(Math.random() * keys.length)];
    state.seed = seed || newSeed();
    el.status.textContent = '';
    loadDomain(state.domain).then(function () {
      var p;
      try { p = Practice.generate(key, state.level, state.seed); }
      catch (err) { el.status.textContent = 'This problem could not be made: ' + err.message; return; }
      show(p);
      try { history.replaceState(null, '', '#margins/practice/' + encodeURIComponent(key) + '/' + state.level + '/' + state.seed); } catch (e) { /* sandboxed */ }
    }).catch(function (err) { el.status.textContent = err.message; });
  }

  function show(p) {
    state.problem = p; state.hintsShown = 0; state.done = false;
    info = info || cardInfo();
    var c = info[p.key] || { id: p.key, title: '' };
    el.meta.innerHTML = '<span class="pr__id">' + esc(c.id) + '</span> ' + esc(c.title || p.title || '') +
      ' <span class="pr__level">' + LEVELS[p.level - 1] + '</span>';
    el.link.href = '#flashcards/' + encodeURIComponent(c.id);
    el.prompt.innerHTML = p.prompt;   // generated by practice/<domain>.js (trusted)
    el.graph.replaceChildren();
    if (p.graph) el.graph.appendChild(drawGraph(p.graph));
    el.graph.hidden = !p.graph;
    var choice = p.answer.kind === 'choice';
    el.form.hidden = choice; el.choices.hidden = !choice;
    el.input.value = ''; el.preview.textContent = '';
    if (choice) {
      el.choices.innerHTML = p.answer.options.map(function (o, i) {
        return '<label class="pr__choice"><input type="radio" name="pr-choice" value="' + i + '"><span>' + o + '</span></label>';
      }).join('');
    }
    el.input.placeholder = { number: 'Your answer, e.g. 3/4 or 2√3', numbers: 'Values separated by commas', point: '(x, y)', expr: 'An expression, e.g. 3x^2 − 2x + 1', text: 'Your answer' }[p.answer.kind] || '';
    el.feedback.hidden = true; el.feedback.className = 'pr__feedback';
    el.hints.innerHTML = ''; el.hints.hidden = true;
    el.solution.innerHTML = ''; el.solution.hidden = true;
    el.check.disabled = false;
    updateHintButton();
    el.card.hidden = false;
  }

  function updateHintButton() {
    var p = state.problem, n = p ? p.steps.length : 0;
    el.hint.disabled = !p || state.hintsShown >= n || state.done;
    el.hint.textContent = state.hintsShown ? 'Next hint (' + state.hintsShown + ' of ' + n + ')' : 'Hint (' + n + ' step' + (n === 1 ? '' : 's') + ')';
  }

  function steps(list) { return list.map(function (s) { return '<li>' + s + '</li>'; }).join(''); }

  function answer() {
    var p = state.problem;
    if (p.answer.kind === 'choice') {
      var picked = el.choices.querySelector('input:checked');
      return picked ? picked.value : null;
    }
    return el.input.value;
  }

  function check() {
    var p = state.problem, given = answer();
    if (!p || state.done) return;
    if (given === null || String(given).trim() === '') { el.status.textContent = 'Enter an answer first.'; return; }
    var res = Practice.check(p.answer, given, { deg: !!p.deg });
    el.status.textContent = '';
    if (res.invalid) { el.status.textContent = res.note; return; }
    state.done = true; state.tried += 1;
    if (res.ok) state.right += 1;
    el.feedback.hidden = false;
    el.feedback.className = 'pr__feedback ' + (res.ok ? 'is-right' : 'is-wrong');
    el.feedback.innerHTML = res.ok
      ? '<strong>Correct.</strong> ' + (state.hintsShown ? 'You used ' + state.hintsShown + ' hint' + (state.hintsShown === 1 ? '' : 's') + '. ' : '') + 'The answer is ' + p.answerText + '.'
      : '<strong>Not quite.</strong> ' + (res.note ? esc(res.note) + ' ' : '') + 'The answer is ' + p.answerText + '. Here is how to get it:';
    if (!res.ok) { el.solution.innerHTML = steps(p.steps); el.solution.hidden = false; el.hints.hidden = true; }
    el.check.disabled = true;
    updateHintButton();
    el.tally.textContent = state.right + ' of ' + state.tried + ' correct this session';
    el.next.focus();
  }

  function hint() {
    var p = state.problem;
    if (!p || state.hintsShown >= p.steps.length) return;
    state.hintsShown += 1;
    el.hints.innerHTML = steps(p.steps.slice(0, state.hintsShown));
    el.hints.hidden = false;
    updateHintButton();
  }

  function reveal() {
    var p = state.problem;
    if (!p) return;
    state.done = true;
    el.feedback.hidden = false; el.feedback.className = 'pr__feedback is-shown';
    el.feedback.innerHTML = 'The answer is ' + p.answerText + '.';
    el.solution.innerHTML = steps(p.steps); el.solution.hidden = false; el.hints.hidden = true;
    el.check.disabled = true; updateHintButton();
  }

  // live reading of what was typed
  el.input.addEventListener('input', function () {
    var t = el.input.value.trim();
    if (!t || !window.Practice) { el.preview.textContent = ''; return; }
    var k = state.problem && state.problem.answer.kind;
    if (k === 'expr' || k === 'text') { el.preview.textContent = ''; return; }
    try {
      var parts = k === 'numbers' || k === 'point' ? t.replace(/[()]/g, '').split(',') : [t];
      var vals = parts.map(function (s) { return Practice.fmt(Practice.value(s.replace(/^\s*[a-zA-Z]\w*\s*=\s*/, '').replace(/[$%]/g, ''), {}, { deg: !!(state.problem && state.problem.deg) }), 6); });
      el.preview.textContent = 'Reads as ' + (k === 'point' ? '(' + vals.join(', ') + ')' : vals.join(', '));
    } catch (e) { el.preview.textContent = ''; }
  });
  el.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); state.done ? generate() : check(); } });

  // keypad: insert at the cursor
  el.keypad.addEventListener('click', function (e) {
    var b = e.target.closest('[data-key]');
    if (!b) return;
    var ins = b.dataset.key, s = el.input.selectionStart, t = el.input.value;
    el.input.value = t.slice(0, s) + ins + t.slice(el.input.selectionEnd);
    var at = s + ins.length - (ins.endsWith('()') ? 1 : 0);
    el.input.focus(); el.input.setSelectionRange(at, at);
    el.input.dispatchEvent(new Event('input'));
  });

  el.check.addEventListener('click', check);
  el.hint.addEventListener('click', hint);
  el.reveal.addEventListener('click', reveal);
  el.next.addEventListener('click', function () { generate(); });
  el.domain.addEventListener('change', function () { state.domain = el.domain.value; state.key = ''; remember(); fillConcepts(); generate(); });
  el.concept.addEventListener('change', function () { state.key = el.concept.value; generate(); });
  el.levels.forEach(function (r) { r.addEventListener('change', function () { if (r.checked) { setLevel(Number(r.value)); remember(); generate(); } }); });

  // ---- Calculator ----
  var calc = document.getElementById('practice-calculator');
  if (calc) {
    var screen = calc.querySelector('[data-calc-screen]'), out = calc.querySelector('[data-calc-out]'), degBox = calc.querySelector('[data-calc-deg]');
    var last = null;
    var run = function () {
      try { last = Practice.value(screen.value, {}, { deg: degBox.checked }); out.textContent = '= ' + Practice.fmt(last, 10); }
      catch (e) { last = null; out.textContent = e.message; }
    };
    $('[data-pr-calc]').addEventListener('click', function () { load('core.js').then(function () { calc.showModal(); screen.focus(); }); });
    calc.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]');
      if (!b) return;
      var k = b.dataset.c;
      if (k === 'clear') { screen.value = ''; out.textContent = ''; }
      else if (k === 'back') screen.value = screen.value.slice(0, -1);
      else if (k === 'eval') { run(); return; }
      else if (k === 'use') { if (last !== null) { el.input.value = Practice.fmt(last, 10).replace('−', '-'); el.input.dispatchEvent(new Event('input')); calc.close(); el.input.focus(); } return; }
      else { var s = screen.selectionStart ?? screen.value.length; screen.value = screen.value.slice(0, s) + k + screen.value.slice(screen.selectionEnd ?? s); }
      screen.focus();
    });
    screen.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); run(); } });
  }

  // ---- Opening -----
  function open(key, level, seed) {
    load('index.js').then(function () {
      fillDomains();
      if (key) {
        var idx = window.Practice.index || {};
        for (var d in idx) if (idx[d].indexOf(key) >= 0) state.domain = d;
        state.key = key;
        el.domain.value = state.domain;
      }
      if (level) setLevel(level); else setLevel(state.level);
      fillConcepts();
      generate(seed);
    });
  }
  Site.openPractice = function (key, level, seed) {
    var toggle = document.querySelector('[data-ref-toggle="ref-practice"]');
    if (view.hidden && toggle) toggle.click();
    open(key, level, seed);
  };
  document.querySelector('[data-ref-toggle="ref-practice"]').addEventListener('click', function () {
    if (!view.hidden && !state.problem) open();
  });
  document.addEventListener('site:detail', function (e) {
    if (e.detail.tab !== 'margins' || e.detail.id.indexOf('practice') !== 0) return;
    var parts = e.detail.id.split('/').slice(1).map(decodeURIComponent);
    requestAnimationFrame(function () { Site.openPractice(parts[0] || '', Number(parts[1]) || 0, Number(parts[2]) || 0); });
  });
};

})(window.Site = window.Site || {});
