/**
 * COBYLA convergence demo (Fun and Games tab).
 *
 * The reader sets current, air temperature, wind, atmosphere, date, and time. The solver iterates
 * conductor temperature until the amperage residual (current supported by the IEEE 738 heat balance at that
 * temperature minus the recorded current) is minimized, then a looping canvas animation
 * replays the search in the style of a Manim scene: axes draw in, each evaluation lands on the
 * residual curve while the view zooms toward the solution, the converged point is circled, and the
 * result travels to the panel on the right, filling in temperature, RMSE, iterations, and solve time.
 *
 * A small SVG scene above the plot reacts to each input (sun along its arc from the date and time, clouds for an
 * industrial atmosphere, wind streak speed, conductor color by temperature).
 */
(function (Site) {
'use strict';

var SETTINGS = { rhobeg: 0.09, xtol: 1e-6, ftol: 1e-7, x0: 0.5, sigma: 1000 };
var T_MIN = -75, T_MAX = 750;            // search space, °C
var SITE = { lat: 37.54, lon: -77.44, stdMeridian: -75 };   // Richmond, Virginia (Eastern time)

var COLORS = {
  axis: 'rgba(243,238,230,0.45)', grid: 'rgba(243,238,230,0.08)', text: '#F3EEE6', dim: 'rgba(243,238,230,0.65)',
  curve: '#D8C3A5', accepted: '#FFFFFF', rejected: '#8FC7B1', band: 'rgba(143,199,177,0.16)',
  step: 'rgba(216,195,165,0.55)', ring: '#F2C14E', panel: 'rgba(7,42,32,0.55)', panelEdge: 'rgba(216,195,165,0.35)',
};

// Manim's default "smooth" rate function.
function smooth(t) { t = Math.min(1, Math.max(0, t)); return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + (b - a) * t; }

function todayISO() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

Site.initConvergence = function initConvergence(root) {
  if (!root) return { setActive: function () {} };
  var E = Site.ieee738;
  var canvas = root.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var live = root.querySelector('[data-live]');
  var toggle = root.querySelector('.solver__pause');
  var runBtn = root.querySelector('.solver__run');
  var reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var el = {
    current: root.querySelector('[name="current"]'),
    ta: root.querySelector('[name="air"]'),
    time: root.querySelector('[name="time"]'),
    vw: root.querySelector('[name="wind"]'),
    date: root.querySelector('[name="date"]'),
    atmos: root.querySelectorAll('[name="atmosphere"]'),
  };
  el.date.value = todayISO();

  var scene = {
    sun: root.querySelector('[data-scene="sun"]'),
    clouds: root.querySelector('[data-scene="clouds"]'),
    wind: root.querySelector('[data-scene="wind"]'),
    line: root.querySelector('[data-scene="line"]'),
    alt: root.querySelector('[data-scene="alt"]'),
    night: root.querySelector('[data-scene="night"]'),
  };

  var model = null;      // current problem + solution
  var anim = null;       // timeline for the current solution
  var active = false, visible = true, paused = false, raf = null, clock = 0, last = 0, finished = false;
  var started = false;   // the animation waits for the Run button

  // ---------- Problem and solve ----------
  function readInputs() {
    var atmosphere = 'clear';
    el.atmos.forEach(function (r) { if (r.checked) atmosphere = r.value; });
    var date = el.date.value || todayISO();
    var clock = Number(el.time.value);
    var solar = E.solarHour(date, clock, SITE.lon, SITE.stdMeridian);
    var alt = E.solarAltitude(date, SITE.lat, solar);
    return {
      current: Number(el.current.value), ta: Number(el.ta.value), vw: Number(el.vw.value),
      clock: clock, solarHour: solar,
      atmosphere: atmosphere, altitude: alt, qs: E.solarGain(E.solarFlux(alt, atmosphere)),
    };
  }

  function solve(p) {
    var lo = T_MIN, hi = T_MAX;
    var tcOf = function (x) { return lo + x * (hi - lo); };
    // Amperage residual: the current the heat balance supports at a candidate temperature, minus the
    // recorded current. The search iterates temperature until this residual is driven to zero.
    var r = function (x) { return E.signedCurrentAt(tcOf(x), p) - p.current; };
    // Only the search-space bounds are constraints; leaving [0, 1] is penalized in the merit.
    var opts = { x0: SETTINGS.x0, rhobeg: SETTINGS.rhobeg, xtol: SETTINGS.xtol, ftol: SETTINGS.ftol,
                 sigma: SETTINGS.sigma };
    var res = Site.cobyla1d(r, opts);
    // Time the solve; repeat until the total is long enough for the browser's timer to resolve.
    var reps = 0, t0 = performance.now(), elapsed = 0;
    do { Site.cobyla1d(r, opts); reps++; elapsed = performance.now() - t0; } while (elapsed < 4 && reps < 5000);
    var tc = tcOf(res.x);
    return {
      p: p, lo: lo, hi: hi, r: r, res: res, phi: res.merit,
      tc: tc, ok: res.rmse < 0.5,
      resistance: E.resistance(tc), r25: E.resistance(25), conv: E.convectionTerms(tc, p.ta, p.vw),
      ms: elapsed / reps,
    };
  }

  // ---------- Timeline ----------
  function buildTimeline(m) {
    var h = m.res.history, t = 0, steps = [];
    var INTRO = 1400;
    t += INTRO;
    for (var i = 0; i < h.length; i++) {
      var dur = i < 2 ? 950 : 1100;
      steps.push({ start: t, dur: dur, pt: h[i] });
      t += dur;
    }
    var ringStart = t + 400, travelStart = ringStart + 1100, fillStart = travelStart + 1300;
    var hold = fillStart + 1500 + 3500, fadeEnd = hold + 900;
    var REPLAY_DELAY = 2500;   // blank pause after the fade, before the search replays
    return { intro: INTRO, steps: steps, ringStart: ringStart, travelStart: travelStart, fillStart: fillStart, hold: hold, fadeEnd: fadeEnd, end: fadeEnd + REPLAY_DELAY };
  }

  // Camera: view window in normalized x, targeted around the best point after each evaluation.
  function viewAt(tl, time, m) {
    var view = { x0: 0, x1: 1 };
    var steps = tl.steps;
    for (var i = 0; i < steps.length; i++) {
      var s = steps[i];
      if (time < s.start) break;
      var k = smooth((time - s.start) / s.dur);
      var target = targetView(m, i);
      view = { x0: lerp(view.x0, target.x0, k), x1: lerp(view.x1, target.x1, k) };
    }
    return view;
  }

  function targetView(m, i) {
    var h = m.res.history, best = h[i].best;
    var spread = 0;
    for (var j = Math.max(0, i - 1); j <= i; j++) spread = Math.max(spread, Math.abs(h[j].x - best));
    var w = Math.min(1, Math.max(0.012, spread * 3.2, i < 2 ? 1 : 0));
    var x0 = best - w / 2, x1 = best + w / 2;
    if (x0 < 0) { x1 -= x0; x0 = 0; }
    if (x1 > 1) { x0 -= x1 - 1; x1 = 1; }
    return { x0: Math.max(0, x0), x1: Math.min(1, x1) };
  }

  // ---------- Layout ----------
  var W = 0, H = 0, L = null;
  function layout() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var narrow = W < 620;
    if (narrow) {
      L = { plot: { x: 60, y: 42, w: W - 76, h: H - 330 }, panel: { x: 16, y: H - 238, w: W - 32, h: 222 }, narrow: true };
    } else {
      var pw = Math.min(280, W * 0.32);
      L = { plot: { x: 60, y: 46, w: W - pw - 100, h: H - 100 }, panel: { x: W - pw - 20, y: 46, w: pw, h: H - 100 }, narrow: false };
    }
  }

  // ---------- Drawing ----------
  function toPx(x, y, view, ymax) {
    var P = L.plot;
    return {
      x: P.x + ((x - view.x0) / (view.x1 - view.x0)) * P.w,
      y: P.y + P.h - (y / ymax) * P.h,
    };
  }

  function fmtTemp(tc, width) {
    var span = width * (model.hi - model.lo);
    var d = span > 60 ? 0 : span > 8 ? 1 : span > 1 ? 2 : 3;
    return tc.toFixed(d);
  }

  function drawFrame(time) {
    var m = model, tl = anim;
    ctx.clearRect(0, 0, W, H);
    var fade = time > tl.hold ? 1 - smooth((time - tl.hold) / (tl.fadeEnd - tl.hold)) : 1;
    ctx.globalAlpha = fade;

    var intro = smooth(time / tl.intro);
    var view = viewAt(tl, time, m);
    var P = L.plot;

    // Visible points so far.
    var shown = [], current = -1;
    tl.steps.forEach(function (s, i) { if (time >= s.start) { shown.push(i); current = i; } });

    // y scale from the curve inside the view, with a floor so the zoomed V stays readable.
    var ymax = 0, N = 220, samples = [];
    for (var n = 0; n <= N; n++) {
      var x = view.x0 + (n / N) * (view.x1 - view.x0);
      var y = m.phi(x);
      samples.push([x, y]);
      if (y > ymax) ymax = y;
    }
    ymax = Math.max(ymax * 1.12, 1e-6);

    // Grid and axes
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.grid;
    for (var g = 1; g <= 4; g++) {
      var gy = P.y + P.h - (g / 4) * P.h * intro;
      ctx.beginPath(); ctx.moveTo(P.x, gy); ctx.lineTo(P.x + P.w * intro, gy); ctx.stroke();
    }
    ctx.strokeStyle = COLORS.axis;
    ctx.beginPath();
    ctx.moveTo(P.x, P.y + P.h); ctx.lineTo(P.x + P.w * intro, P.y + P.h);
    ctx.moveTo(P.x, P.y + P.h); ctx.lineTo(P.x, P.y + P.h - P.h * intro);
    ctx.stroke();

    // Ticks
    ctx.fillStyle = COLORS.dim;
    ctx.font = '11px "IBM Plex Sans", system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (var k = 0; k <= 4; k++) {
      var fx = view.x0 + (k / 4) * (view.x1 - view.x0);
      var px = P.x + (k / 4) * P.w;
      ctx.globalAlpha = fade * intro;
      ctx.fillText(fmtTemp(m.lo + fx * (m.hi - m.lo), view.x1 - view.x0), px, P.y + P.h + 6);
    }
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (var q = 0; q <= 4; q++) {
      var val = (q / 4) * ymax;
      ctx.fillText(val >= 100 ? val.toFixed(0) : val >= 1 ? val.toFixed(1) : val.toPrecision(2), P.x - 6, P.y + P.h - (q / 4) * P.h);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText('Conductor temperature (°C)', P.x + P.w / 2, P.y + P.h + 34);
    ctx.save();
    ctx.translate(P.x - 44, P.y + P.h / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText('Penalized merit φ (A)', 0, 0);
    ctx.restore();

    // Clip to plot area for data layers.
    ctx.save();
    ctx.beginPath(); ctx.rect(P.x, P.y - 8, P.w, P.h + 8); ctx.clip();

    // Trust region band for the current iterate.
    if (current >= 0) {
      var hp = m.res.history[current];
      var b0 = toPx(hp.best - hp.rho, 0, view, ymax).x, b1 = toPx(hp.best + hp.rho, 0, view, ymax).x;
      ctx.globalAlpha = fade;
      ctx.fillStyle = COLORS.band;
      ctx.fillRect(b0, P.y, Math.max(1, b1 - b0), P.h);
    }

    // Curve, drawn on progressively during the intro.
    ctx.globalAlpha = fade;
    ctx.strokeStyle = COLORS.curve; ctx.lineWidth = 2.2;
    ctx.beginPath();
    var upto = Math.floor(samples.length * intro);
    for (var c = 0; c < upto; c++) {
      var sp = toPx(samples[c][0], samples[c][1], view, ymax);
      if (c === 0) ctx.moveTo(sp.x, sp.y); else ctx.lineTo(sp.x, sp.y);
    }
    ctx.stroke();

    // Steps and evaluations
    shown.forEach(function (i) {
      var s = tl.steps[i], pt = s.pt;
      var k2 = smooth((time - s.start) / (s.dur * 0.6));
      var p = toPx(pt.x, Math.min(pt.phi, ymax * 1.5), view, ymax);
      if (i > 0) {
        var prevBest = m.res.history[i - 1].best;
        var pb = toPx(prevBest, Math.min(m.phi(prevBest), ymax * 1.5), view, ymax);
        if (i === current && k2 < 1) {
          ctx.strokeStyle = COLORS.step; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(pb.x, pb.y); ctx.lineTo(lerp(pb.x, p.x, k2), lerp(pb.y, p.y, k2)); ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      var age = current - i;
      ctx.globalAlpha = fade * (age > 3 ? 0.35 : 1);
      var rad = 5 * (i === current ? k2 : 1);
      ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, rad), 0, Math.PI * 2);
      if (pt.accepted) { ctx.fillStyle = COLORS.accepted; ctx.fill(); }
      else { ctx.strokeStyle = COLORS.rejected; ctx.lineWidth = 1.8; ctx.stroke(); }
      ctx.globalAlpha = fade;
    });
    ctx.restore();

    // Header readout
    ctx.globalAlpha = fade * intro;
    ctx.fillStyle = COLORS.text; ctx.textAlign = 'left';
    ctx.font = '600 13px "IBM Plex Sans", system-ui, sans-serif';
    var iterText = current >= 0 ? 'Iteration ' + (current + 1) + ' of ' + tl.steps.length : 'COBYLA search';
    ctx.fillText(iterText, P.x, L.narrow ? P.y - 24 : P.y - 22);
    if (current >= 0) {
      ctx.font = '12px "IBM Plex Sans", system-ui, sans-serif'; ctx.fillStyle = COLORS.dim;
      ctx.fillText('ρ = ' + m.res.history[current].rho.toExponential(2), L.narrow ? P.x + 130 : P.x + 170, L.narrow ? P.y - 8 : P.y - 22);
    }

    drawPanel(time, view, ymax, fade);
    ctx.globalAlpha = 1;
  }

  function drawPanel(time, view, ymax, fade) {
    var m = model, tl = anim, B = L.panel;
    // Panel frame fades in with the intro.
    ctx.globalAlpha = fade * smooth(time / tl.intro);
    roundRect(B.x, B.y, B.w, B.h, 10);
    ctx.fillStyle = COLORS.panel; ctx.fill();
    ctx.strokeStyle = COLORS.panelEdge; ctx.lineWidth = 1; ctx.stroke();

    ctx.fillStyle = COLORS.dim; ctx.textAlign = 'left';
    ctx.font = '600 12px "IBM Plex Sans", system-ui, sans-serif';
    ctx.fillText('Converged value', B.x + 16, B.y + 24);

    var slot = L.narrow ? { x: B.x + 16, y: B.y + 58 } : { x: B.x + 16, y: B.y + 66 };
    var rows = [
      ['RMSE (amperage)', m.res.rmse < 1e-12 ? '< 1e-12 A' : m.ok ? m.res.rmse.toExponential(2) + ' A' : m.res.rmse.toFixed(2) + ' A'],
      ['Iterations', String(m.res.iterations) + ' (' + m.res.reason + ')'],
      ['Time to solve', m.ms < 0.1 ? (m.ms * 1000).toFixed(1) + ' µs' : m.ms.toFixed(3) + ' ms'],
      ['Resistance', (m.resistance * 1e6).toFixed(2) + ' µΩ/m'],
      ['Convection', (m.conv.governs === 'natural' ? 'N' : 'F') + ', ' + m.conv.qc.toFixed(1) + ' W/m'],
    ];

    // Ring around the converged point, then the value travels to the panel.
    var best = m.res.x;
    var target = toPx(best, Math.min(m.res.phi, ymax * 1.5), view, ymax);
    var label = m.tc.toFixed(2) + ' °C' + (m.ok ? '' : ' (limit)');
    if (time >= tl.ringStart) {
      var kr = smooth((time - tl.ringStart) / 700);
      var kt = time >= tl.travelStart ? smooth((time - tl.travelStart) / 1000) : 0;
      var cx = lerp(target.x, slot.x + 12, kt), cy = lerp(target.y, slot.y - 6, kt);
      var r = lerp(16, 10, kt);
      ctx.globalAlpha = fade;
      ctx.strokeStyle = COLORS.ring; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * kr); ctx.stroke();
      if (kt > 0) {
        ctx.fillStyle = COLORS.ring; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = COLORS.text;
      ctx.font = '600 ' + Math.round(lerp(13, L.narrow ? 20 : 22, kt)) + 'px "Newsreader", Georgia, serif';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = fade * kr;
      ctx.fillText(label, cx + r + 8, cy);
      ctx.textBaseline = 'alphabetic';
    }

    if (time >= tl.fillStart) {
      ctx.font = '12px "IBM Plex Sans", system-ui, sans-serif';
      rows.forEach(function (row, i) {
        var k = smooth((time - tl.fillStart - i * 160) / 450);
        if (k <= 0) return;
        ctx.globalAlpha = fade * k;
        if (L.narrow) {
          // one row per value: label on the left, value on the right, shrunk to fit the panel
          var y = B.y + 92 + i * 26;
          var avail = B.w - 32;
          ctx.font = '12px "IBM Plex Sans", system-ui, sans-serif';
          var lw = ctx.measureText(row[0]).width;
          var size = 14;
          ctx.font = '600 ' + size + 'px "IBM Plex Sans", system-ui, sans-serif';
          while (size > 9 && lw + 12 + ctx.measureText(row[1]).width > avail) {
            size -= 0.5; ctx.font = '600 ' + size + 'px "IBM Plex Sans", system-ui, sans-serif';
          }
          ctx.fillStyle = COLORS.text; ctx.textAlign = 'right'; ctx.fillText(row[1], B.x + B.w - 16, y);
          ctx.textAlign = 'left'; ctx.font = '12px "IBM Plex Sans", system-ui, sans-serif';
          ctx.fillStyle = COLORS.dim; ctx.fillText(row[0], B.x + 16, y);
        } else {
          var x = B.x + 16;
          var y2 = B.y + 108 + i * 38 + (1 - k) * 8;
          ctx.textAlign = 'left';
          ctx.font = '12px "IBM Plex Sans", system-ui, sans-serif';
          ctx.fillStyle = COLORS.dim; ctx.fillText(row[0], x, y2);
          ctx.font = '600 14px "IBM Plex Sans", system-ui, sans-serif';
          var sz = 14; while (sz > 9 && ctx.measureText(row[1]).width > B.w - 32) { sz -= 0.5; ctx.font = '600 ' + sz + 'px "IBM Plex Sans", system-ui, sans-serif'; }
          ctx.fillStyle = COLORS.text; ctx.fillText(row[1], x, y2 + 18);
        }
      });
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ---------- Loop ----------
  function running() { return started && !finished && active && visible && !paused && !document.hidden; }

  function tick(now) {
    raf = null;
    var dt = last ? Math.min(now - last, 50) : 16;
    last = now;
    clock += dt;
    // Play once and hold on the result; the replay button starts it again.
    if (clock >= anim.hold) { clock = anim.hold; drawFrame(clock); finished = true; kick(); return; }
    drawFrame(clock);
    if (running()) raf = requestAnimationFrame(tick);
  }

  function kick() {
    if (running() && !raf) { last = 0; raf = requestAnimationFrame(tick); }
    if (!running() && !raf) drawFrame(started || shownResult ? clock : anim.intro - 1);   // idle: axes and curve only
    root.classList.toggle('is-idle', !started);
    toggle.setAttribute('aria-label', 'Replay animation');
  }

  var shownResult = false;
  function run() {
    paused = false;
    if (reduceMotion) {
      // Reduced motion: show the finished result instead of animating.
      clock = anim.hold - 1; shownResult = true; runBtn.textContent = 'Run again';
      root.classList.add('is-static');
      drawFrame(clock); return;
    }
    started = true; finished = false; clock = anim.intro - 1;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    kick();
  }

  // ---------- Inputs and scene ----------
  function clockLabel(h) {
    h = Number(h);
    var hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    var ampm = hh >= 12 ? 'PM' : 'AM', h12 = ((hh + 11) % 12) + 1;
    return h12 + ':' + String(mm).padStart(2, '0') + ' ' + ampm;
  }
  var outputs = {
    current: function (v) { return v + ' A'; },
    time: clockLabel,
    air: function (v) { return v + ' °C'; },
    wind: function (v) { return Number(v).toFixed(1) + ' m/s'; },
  };

  // Sun position is animated in angle, so every frame lies on the dotted ellipse
  // (center 320,190; radii 250 x 150), however fast the time slider moves.
  var sunAngle = Math.PI / 2, sunTarget = Math.PI / 2, sunRaf = null;
  function placeSun(a) {
    var x = 320 + Math.cos(a) * 250, y = 190 - Math.sin(a) * 150;
    scene.sun.setAttribute('transform', 'translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')');
  }
  function sunStep() {
    sunRaf = null;
    sunAngle += (sunTarget - sunAngle) * 0.12;
    if (Math.abs(sunTarget - sunAngle) < 1e-3) sunAngle = sunTarget;
    placeSun(sunAngle);
    if (sunAngle !== sunTarget) sunRaf = requestAnimationFrame(sunStep);
  }
  function sunTo(a) {
    sunTarget = a;
    if (reduceMotion) { sunAngle = a; placeSun(a); return; }
    if (!sunRaf) sunRaf = requestAnimationFrame(sunStep);
  }

  // Wind streaks move by position each frame; speed eases toward the slider value, so dragging it
  // changes the pace smoothly instead of restarting or jumping the streaks.
  var streaks = Array.prototype.slice.call(scene.wind.querySelectorAll('line'));
  var windX = streaks.map(function (_, i) { return i * 170; });
  var windSpeed = 0, windTarget = 0, windRaf = null, windLast = 0, sceneVisible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      sceneVisible = entries[0].isIntersecting; if (sceneVisible) startWind();
    }, { threshold: 0 }).observe(root.querySelector('.solver__scene'));
  }
  function windStep(now) {
    windRaf = null;
    var dt = windLast ? Math.min(now - windLast, 50) / 1000 : 0; windLast = now;
    windSpeed += (windTarget - windSpeed) * Math.min(1, dt * 3);
    streaks.forEach(function (l, i) {
      windX[i] = (windX[i] + windSpeed * dt) % 720;
      l.setAttribute('transform', 'translate(' + (windX[i] - 60).toFixed(1) + ' 0)');
    });
    if (active && sceneVisible && !document.hidden && (windSpeed > 0.5 || windTarget > 0)) windRaf = requestAnimationFrame(windStep);
  }
  function startWind() {
    if (reduceMotion) return;
    if (!windRaf) { windLast = 0; windRaf = requestAnimationFrame(windStep); }
  }

  function pulse(node) {
    if (!node || reduceMotion) return;
    node.classList.remove('is-changed'); void node.offsetWidth; node.classList.add('is-changed');
  }

  function updateScene(m) {
    var p = m.p;
    // Sun travels along an arc: 0° altitude at the horizon, 90° overhead.
    // Sun: rides the dotted arc from sunrise (left end) to sunset (right end) in solar time.
    var day = E.sunriseSunset(el.date.value || todayISO(), SITE.lat);
    var across = Math.max(0, Math.min(1, (p.solarHour - day.rise) / Math.max(day.set - day.rise, 1e-6)));
    sunTo(Math.PI * (1 - across));                          // pi at sunrise, 0 at sunset
    scene.sun.style.opacity = p.altitude > 0 ? '1' : '0';
    scene.night.style.opacity = p.altitude > 0 ? String(Math.max(0, 0.35 - p.altitude / 60)) : '0.65';
    root.classList.toggle('is-industrial', p.atmosphere === 'industrial');   // clouds slide in from both sides
    var speed = p.vw;
    scene.wind.style.opacity = speed < 0.05 ? '0' : String(Math.min(1, 0.35 + speed / 8));
    windTarget = speed < 0.05 ? 0 : 75 + speed * 75;          // px per second in scene units
    startWind();
    // Conductor color from cool teal to hot orange across 25–150 °C.
    var t = Math.max(0, Math.min(1, ((m.ok ? m.tc : 200) - 25) / 125));
    var cool = [143, 199, 177], hot = [233, 120, 60];
    var rgb = cool.map(function (c, i) { return Math.round(lerp(c, hot[i], t)); });
    scene.line.style.stroke = 'rgb(' + rgb.join(',') + ')';
    scene.alt.textContent = p.altitude > 0 ? 'Sun ' + Math.round(p.altitude) + '° above the horizon' : 'Sun below the horizon';
  }

  function announce(m) {
    live.textContent = !m.ok
      ? 'No heat balance within the search space. The best point found was ' + m.tc.toFixed(1) + ' degrees Celsius.'
      : 'Converged at ' + m.tc.toFixed(2) + ' degrees Celsius in ' + m.res.iterations + ' iterations, amperage RMSE ' + m.res.rmse.toExponential(2) + ' amps.';
  }

  var pending = null;
  function recompute() {
    model = solve(readInputs());
    anim = buildTimeline(model);
    // New conditions: stop and wait for Run.
    started = false; shownResult = false; finished = false; clock = 0;
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    runBtn.textContent = 'Run COBYLA';
    root.classList.remove('is-static');
    updateScene(model);
    announce(model);
    kick();
  }

  function onInput(e) {
    var name = e.target.name;
    var out = root.querySelector('[data-out="' + name + '"]');
    if (out && outputs[name]) { out.textContent = outputs[name](e.target.value); pulse(out); }
    // Update the scene right away; restart the animation once the reader pauses.
    var p = readInputs();
    updateScene({ p: p, ok: model ? model.ok : true, tc: model ? model.tc : 60 });
    clearTimeout(pending);
    pending = setTimeout(recompute, 220);
  }

  root.querySelectorAll('input').forEach(function (i) {
    i.addEventListener('input', onInput);
    i.addEventListener('change', onInput);
  });
  Object.keys(outputs).forEach(function (n) {
    var o = root.querySelector('[data-out="' + n + '"]');
    if (o) o.textContent = outputs[n](root.querySelector('[name="' + n + '"]').value);
  });

  toggle.addEventListener('click', function () { run(); });
  runBtn.addEventListener('click', run);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; kick(); startWind(); }).observe(canvas);
  }
  document.addEventListener('visibilitychange', kick);
  if ('ResizeObserver' in window) new ResizeObserver(function () { layout(); if (model) drawFrame(clock); }).observe(canvas);

  layout();
  recompute();

  return {
    setActive: function (isActive) { active = isActive; if (isActive) { layout(); startWind(); } kick(); },
  };
};

})(window.Site = window.Site || {});
