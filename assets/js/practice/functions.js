/*
 * practice/functions.js — Functions & probability distributions (the graph gallery, chapter 18):
 * one generator per gallery tile, F.1–F.36 (functions) and D.1–D.21 (distributions).
 *
 * Graphs carry the domain: "which equation is this graph?" (choices whose graphs differ visibly),
 * reading intercepts, asymptotes, periods and peaks, evaluating at friendly inputs, and for the
 * distributions probabilities, means and variances with friendly parameters (exact fractions where
 * the arithmetic allows, otherwise rounded with answer.dp and the intermediate values shown).
 *
 * Every number shown is computed and reported in `vals`; tools/practice/verifiers/functions.py
 * recomputes each one from `params` alone. Where steps show rounded intermediate values, the
 * generator redraws until those rounded values lead to the same rounded answer as the exact value,
 * and never asks to round a value that sits near a rounding tie.
 *
 * Skipped tiles: none. Every tile has something to compute, solve or read from its graph.
 */
(function (P) {
  "use strict";
  const { Frac, M, fmt, graph } = P;
  const n = (v) => M.n(v);
  const np = (v) => M.n(v, { paren: true });
  const x = M.v("x"), y = M.v("y");
  const V = (s) => M.v(s);
  const F = (a, b = 1) => new Frac(a, b);
  const fv = (q) => { q = Frac.of(q); return { n: q.n, d: q.d }; };
  const typed = (v) => (v instanceof Frac ? (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`) : fmt(v, 10)).replace(/−/g, "-");
  /** A coefficient written before a symbol: x, −x, 3x (never 1x). */
  const co = (a) => { const q = Frac.of(a); return q.eq(1) ? "" : q.eq(-1) ? "−" : M.f(q); };
  /** (x − h), or just x when h = 0. */
  const sh = (h, v = "x") => (Frac.of(h).n === 0 ? M.v(v) : `(${M.poly([1, Frac.of(h).neg()], v)})`);
  /** A power of a number, with parentheses around negatives and fractions: (−2)³, (3/4)². */
  const pw = (q, e) => { q = Frac.of(q); const b = q.isInt() && q.n >= 0 ? n(q.n) : `(${M.f(q)})`; return M.sup(b, e); };
  /** "= 0.5" when the shown digits are exact, "≈ 0.1353" when they are rounded. */
  const eqa = (v, dp = 4) => (Math.abs(P.round(v, dp) - v) < 1e-12 ? `= ${fmt(v, dp)}` : `≈ ${fmt(v, dp)}`);
  const rd = (v, dp) => P.round(v, dp);
  /** The reader's route (rounded intermediates) gives the same rounded answer, and the answer is not near a tie. */
  const agrees = (exact, route, dp) => {
    const s = Math.abs(exact) * Math.pow(10, dp), fr = s - Math.floor(s);
    return rd(exact, dp) === rd(route, dp) && Math.abs(fr - 0.5) > 0.02;
  };
  const exact = (q, unit = "") => { q = Frac.of(q); return { answer: { kind: "number", value: q.value }, answerText: `${M.f(q)}${unit}`, answerInput: typed(q) }; };
  const exactDec = (v, unit = "") => ({ answer: { kind: "number", value: v }, answerText: `${fmt(v, 8)}${unit}`, answerInput: fmt(v, 8).replace(/−/g, "-") });
  const rounded = (v, dp, unit = "") => ({ answer: { kind: "number", value: v, dp }, answerText: `${fmt(v, dp)}${unit}`, answerInput: fmt(v, dp).replace(/−/g, "-") });
  const money = (v) => P.money(v);
  /** q·π as text: π, −π, 2π, π/3 (stacked), 5π/6. */
  const piq = (q) => {
    q = Frac.of(q);
    if (q.n === 0) return "0";
    const a = Math.abs(q.n), top = a === 1 ? "π" : `${a}π`, body = q.d === 1 ? top : M.frac(top, String(q.d));
    return q.n < 0 ? `−${body}` : body;
  };
  const piTyped = (q) => (q.n === 0 ? "0" : `${q.n}pi/${q.d}`);
  /** A multiple-choice answer: items[0] is correct; the order is shuffled. */
  function choose(r, items, render) {
    const order = r.shuffle(items.map((_, i) => i));
    const opts = order.map((i) => items[i]);
    const options = opts.map(render);
    const index = order.indexOf(0);
    return { opts, out: { answer: { kind: "choice", options, index }, answerText: options[index] } };
  }
  /** Up to k distractors from a pool, distinct from the truth and from each other. */
  function distract(r, truth, pool, k = 3) {
    const seen = new Set([JSON.stringify(truth)]), out = [];
    for (const c of r.shuffle(pool)) {
      const s = JSON.stringify(c);
      if (seen.has(s)) continue;
      seen.add(s); out.push(c);
      if (out.length === k) break;
    }
    return out;
  }
  const C = (nn, k) => { if (k < 0 || k > nn) return 0; let c = 1; for (let i = 1; i <= k; i++) c = (c * (nn - k + i)) / i; return Math.round(c); };
  const fact = (k) => { let f = 1; for (let i = 2; i <= k; i++) f *= i; return f; };
  /** erf by its Taylor series (|z| < 3) or the continued fraction for erfc. */
  function erf(z) {
    const s = Math.sign(z), a = Math.abs(z);
    if (a < 3) {
      let sum = a, term = a;
      for (let k = 1; k < 200; k++) { term *= (-a * a) / k; const add = term / (2 * k + 1); sum += add; if (Math.abs(add) < 1e-17) break; }
      return s * (2 / Math.sqrt(Math.PI)) * sum;
    }
    let f = 0;
    for (let k = 60; k >= 1; k--) f = (k / 2) / (a + f);
    return s * (1 - Math.exp(-a * a) / Math.sqrt(Math.PI) / (a + f));
  }
  const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

  // ---- Exact trigonometric values at multiples of 30° and 45° -----------------------------------
  // Reference-angle magnitudes as [num, den, rad]: num/den · √rad.
  const RT = {
    sin: { 0: [0, 1, 1], 30: [1, 2, 1], 45: [1, 2, 2], 60: [1, 2, 3], 90: [1, 1, 1] },
    cos: { 0: [1, 1, 1], 30: [1, 2, 3], 45: [1, 2, 2], 60: [1, 2, 1], 90: [0, 1, 1] },
    tan: { 0: [0, 1, 1], 30: [1, 3, 3], 45: [1, 1, 1], 60: [1, 1, 3] },
    sec: { 0: [1, 1, 1], 30: [2, 3, 3], 45: [1, 1, 2], 60: [2, 1, 1] },
  };
  const mod360 = (d) => ((d % 360) + 360) % 360;
  function where(deg) {
    const d = mod360(deg);
    if (d % 90 === 0) return { d, quad: 0, ref: d % 180 === 0 ? 0 : 90 };
    if (d < 90) return { d, quad: 1, ref: d };
    if (d < 180) return { d, quad: 2, ref: 180 - d };
    if (d < 270) return { d, quad: 3, ref: d - 180 };
    return { d, quad: 4, ref: 360 - d };
  }
  const cosSign = (d) => (d === 90 || d === 270 ? 0 : d < 90 || d > 270 ? 1 : -1);
  const sinSign = (d) => (d === 0 || d === 180 ? 0 : d < 180 ? 1 : -1);
  const fnSign = (fn, d) => ({ sin: sinSign(d), cos: cosSign(d), tan: sinSign(d) * cosSign(d), sec: cosSign(d) })[fn];
  /** Exact value {c: Frac, rad} of fn at deg degrees, or null where undefined. */
  function trig(fn, deg) {
    const w = where(deg), t = RT[fn][w.ref];
    if (!t) return null;
    const s = t[0] === 0 ? 1 : fnSign(fn, w.d);
    return { c: F(s * t[0], t[1]), rad: t[0] === 0 ? 1 : t[2] };
  }
  const rxv = (e) => e.c.value * Math.sqrt(e.rad);
  const rxV = (e) => [e.c.n, e.c.d, e.rad];
  const rxMul = (e, k) => ({ c: e.c.mul(k), rad: e.rad });
  const rxAbs = (e) => ({ c: e.c.abs(), rad: e.rad });
  /** c·√rad as HTML: √3/2 stacked, −√2, 2√3/3. */
  function rx(e) {
    if (e.rad === 1 || e.c.n === 0) return M.f(e.c);
    const a = Math.abs(e.c.n), top = `${a === 1 ? "" : n(a)}${M.sqrt(n(e.rad))}`;
    const body = e.c.d === 1 ? top : M.frac(top, n(e.c.d));
    return e.c.n < 0 ? `−${body}` : body;
  }
  const rxTyped = (e) => {
    if (e.rad === 1 || e.c.n === 0) return typed(e.c);
    const a = Math.abs(e.c.n);
    return `${e.c.n < 0 ? "-" : ""}${a === 1 ? "" : a}sqrt(${e.rad})${e.c.d === 1 ? "" : `/${e.c.d}`}`;
  };
  const QN = ["", "I", "II", "III", "IV"];
  const END = ["falls on the left, rises on the right", "rises on the left, falls on the right", "rises on both sides", "falls on both sides"];
  const FNAME = { sin: "sin", cos: "cos", tan: "tan", sec: "sec" };
  const AXIS = { 0: "positive x-axis", 90: "positive y-axis", 180: "negative x-axis", 270: "negative y-axis" };
  const SIGN_WHY = {
    sin: "sine is the y-coordinate on the unit circle, positive above the x-axis (quadrants I and II)",
    cos: "cosine is the x-coordinate on the unit circle, positive right of the y-axis (quadrants I and IV)",
    tan: "tangent is y ÷ x, positive where x and y share a sign (quadrants I and III)",
    sec: "secant is 1 ÷ x, so it has the sign of cosine (positive in quadrants I and IV)",
  };
  /** Reference angle ρ of θ (degrees) shown as a π computation. */
  function refText(w, th) {
    const rho = F(w.ref, 180);
    if (w.quad === 1) return `θ is acute, so the reference angle is θ itself: ${piq(rho)}`;
    if (w.quad === 2) return `the reference angle is π − ${piq(th)} = ${piq(rho)}`;
    if (w.quad === 3) return `the reference angle is ${piq(th)} − π = ${piq(rho)}`;
    return `the reference angle is 2π − ${piq(th)} = ${piq(rho)}`;
  }
  /** Steps that evaluate fn(θ) by hand, θ = deg° written in radians. */
  function trigSteps(fn, deg) {
    const th = F(deg, 180), w = where(deg), e = trig(fn, deg), name = FNAME[fn];
    if (w.quad === 0) {
      const cx = trig("cos", deg).c.n, sy = trig("sin", deg).c.n;
      const last = { sin: `${name} θ is the y-coordinate: ${n(sy)}.`, cos: `${name} θ is the x-coordinate: ${n(cx)}.`,
        tan: `tan θ = y ÷ x = ${n(sy)} ÷ ${np(cx)} = ${rx(e)}.`, sec: `sec θ = 1 ÷ x = 1 ÷ ${np(cx)} = ${rx(e)}.` }[fn];
      return { e, steps: [`θ = ${piq(th)} ends on the ${AXIS[w.d]}, at the unit-circle point (${n(cx)}, ${n(sy)}).`, last], vals: { pt: [cx, sy] } };
    }
    const mag = rxAbs(e), rho = F(w.ref, 180);
    return {
      e,
      steps: [
        `θ = ${piq(th)} lies in quadrant ${QN[w.quad]}; ${refText(w, th)}.`,
        `${name}(${piq(rho)}) = ${rx(mag)}.`,
        `The sign: ${SIGN_WHY[fn]}. In quadrant ${QN[w.quad]} it is ${e.c.n > 0 ? "positive" : "negative"}, so ${name}(${piq(th)}) = ${rx(e)}.`,
      ],
      vals: { rho: fv(rho), mag: rxV(mag) },
    };
  }
  /** Text labels π/2, π, … along the x-axis of a trig graph, with faint guide lines. */
  function piLabels(xmax, step, yLab) {
    const out = [];
    for (let k = -8; k <= 8; k++) {
      if (k === 0) continue;
      const q = step.mul(k), xv = q.value * Math.PI;
      if (Math.abs(xv) > xmax - 0.2) continue;
      const a = Math.abs(q.n), s = `${q.n < 0 ? "−" : ""}${a === 1 ? "" : a}π${q.d === 1 ? "" : `/${q.d}`}`;
      out.push({ t: "text", x: xv, y: yLab, s, role: "muted" });
      out.push({ t: "vline", x: xv, dash: true, role: "muted" });
    }
    return out;
  }
  /** Solutions of fn(x) = value in [0, 2π) for sin or cos, from the reference angle α (degrees). */
  function solveTrig(fn, positive, alpha) {
    if (fn === "sin") return positive ? [alpha, 180 - alpha] : [180 + alpha, 360 - alpha];
    return positive ? [alpha, 360 - alpha] : [180 - alpha, 180 + alpha];
  }
  const ANG = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
  /** Bx as text: x, 2x, x/2 (stacked). */
  const argB = (bn, bd) => (bd === 1 ? (bn === 1 ? x : `${n(bn)}${x}`) : M.frac(bn === 1 ? x : `${n(bn)}${x}`, n(bd)));
  /** a·sin(Bx) (T = 0) or a·cos(Bx) (T = 1). */
  const wave = (T, a, bn, bd) => {
    const f = T ? "cos" : "sin", body = bn === 1 && bd === 1 ? `${f} ${x}` : `${f}(${argB(bn, bd)})`;
    return a === 1 ? body : a === -1 ? `−${body}` : `${n(a)} ${body}`;
  };
  /** Level-1 problem: the exact value of fn at a special angle. */
  function evalTrig(r, fn) {
    for (;;) {
      const deg = r.pick(ANG), e = trig(fn, deg);
      if (!e) continue;
      const th = F(deg, 180), st = trigSteps(fn, deg);
      return {
        prompt: `Find the exact value of ${M.eq(`${fn}(${piq(th)})`)}`, steps: st.steps,
        answer: { kind: "number", value: rxv(e) }, answerText: rx(e), answerInput: rxTyped(e),
        vals: { th: fv(th), v: rxV(e), ...st.vals }, params: { deg },
      };
    }
  }
  /** Solve sin x = v or sec x = v on [0, 2π), v a special value. */
  function solveTrigProblem(r, fn) {
    const alpha = r.pick([30, 45, 60]), pos = r.chance(0.5), base = fn === "sin" ? "sin" : "cos";
    const mag = trig(base, alpha), w = pos ? mag : rxMul(mag, -1), aF = F(alpha, 180);
    const sols = solveTrig(base, pos, alpha).map((d) => F(d, 180));
    const v = fn === "sin" ? w : pos ? trig("sec", alpha) : rxMul(trig("sec", alpha), -1);
    const steps = [];
    if (fn === "sec") steps.push(`sec ${x} = ${M.frac("1", `cos ${x}`)}, so cos ${x} = ${M.frac("1", rx(v))}${M.frac("1", rx(v)) === rx(w) ? "" : ` = ${rx(w)}`}.`);
    steps.push(`Reference angle: ${base} α = ${rx(mag)} for α = ${piq(aF)}.`);
    steps.push(base === "sin" ? `Sine is the y-coordinate on the unit circle, so it is ${pos ? "positive in quadrants I and II" : "negative in quadrants III and IV"}.`
      : `Cosine is the x-coordinate on the unit circle, so it is ${pos ? "positive in quadrants I and IV" : "negative in quadrants II and III"}.`);
    const lab = base === "sin" ? (pos ? ["α", "π − α"] : ["π + α", "2π − α"]) : pos ? ["α", "2π − α"] : ["π − α", "π + α"];
    const show = (l, s) => (l === "α" ? `${x} = ${piq(s)}` : `${x} = ${l.replace("α", piq(aF))} = ${piq(s)}`);
    steps.push(`${show(lab[0], sols[0])} and ${show(lab[1], sols[1])}.`);
    return {
      prompt: `Solve ${M.eq(`${fn} ${x} = ${rx(v)}`)} for 0 ≤ ${x} &lt; 2π.`, steps,
      answer: { kind: "numbers", values: sols.map((s) => s.value * Math.PI) }, answerText: `${x} = ${piq(sols[0])} or ${x} = ${piq(sols[1])}`,
      answerInput: sols.map(piTyped).join(", "),
      vals: { v: rxV(v), w: rxV(w), alpha: fv(aF), mag: rxV(mag), s1: fv(sols[0]), s2: fv(sols[1]) }, params: { alpha, pos: pos ? 1 : 0, fn: fn === "sin" ? 0 : 1 },
    };
  }

  P.define("functions", {
    // ---- F.1 Linear ---------------------------------------------------------------------------------------
    "F.1": {
      title: "Linear functions",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const m = r.nonzero(-3, 3), b = r.nonzero(-5, 5);
            if (Math.abs(b) === Math.abs(m)) continue;
            const render = ([mm, bb]) => `${y} = ${M.poly([mm, bb])}`;
            const ch = choose(r, [[m, b], [-m, b], [m, -b], [b, m]], render);
            return {
              prompt: `Which equation does the graphed line have?`,
              graph: graph({ view: [-8, 8, -8, 8], items: [{ t: "fn", e: `${m}*x + (${b})` }, { t: "pt", x: 0, y: b }, { t: "pt", x: 1, y: b + m }] }),
              steps: [
                `The line crosses the ${y}-axis at (0, ${n(b)}), so the intercept is ${V("b")} = ${n(b)}.`,
                `One step to the right of that point, the line is at (1, ${n(b + m)}): it ${m > 0 ? "rises" : "falls"} ${n(Math.abs(m))}, so the slope is ${V("m")} = ${n(m)}.`,
                `So ${render([m, b])}.`,
              ],
              ...ch.out, vals: { y1: b + m }, params: { m, b, opts: ch.opts },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const b = r.nonzero(-5, 5), d = r.int(2, 4), c = r.nonzero(-6, 6);
            if (P.gcd(Math.abs(c), d) !== 1 || Math.abs(b + c) > 8) continue;
            const m = F(c, d), xint = F(-b * d, c);
            if (Math.abs(xint.value) > 8) continue;
            return {
              prompt: `The graphed line passes through the two marked points, which sit on grid corners. Find its ${x}-intercept.`,
              graph: graph({ view: [-9, 9, -9, 9], items: [{ t: "fn", e: `${c}/${d}*x + (${b})` }, { t: "pt", x: 0, y: b }, { t: "pt", x: d, y: b + c }] }),
              steps: [
                `Read the points: (0, ${n(b)}) and (${n(d)}, ${n(b + c)}).`,
                `Slope: ${V("m")} = ${M.frac(`${n(b + c)} − ${np(b)}`, `${n(d)} − 0`)} = ${M.frac(n(c), n(d))}. The point (0, ${n(b)}) gives the intercept ${V("b")} = ${n(b)}, so ${y} = ${M.poly([m, b])}.`,
                `At the ${x}-intercept ${y} = 0: ${M.f(m)}${x} = ${n(-b)}, so ${x} = ${n(-b)} ÷ ${M.f(m, { paren: true })} = ${M.f(xint)}.`,
              ],
              ...exact(xint), vals: { y2: b + c, m: fv(m), nb: -b, xint: fv(xint) }, params: { b, d, c },
            };
          }
        }
        // level 3: a two-part tariff from two bills
        const Fee = 5 * r.int(6, 19), R = 5 * r.int(9, 24), h1 = r.int(1, 3), h2 = r.int(h1 + 1, 6), h3 = r.int(7, 10);
        const C1 = Fee + R * h1, C2 = Fee + R * h2;
        const dC = C2 - C1, dH = h2 - h1, Rh1 = R * h1, Rh3 = R * h3, cost = Fee + Rh3;
        return {
          prompt: `An electrician charges a fixed call-out fee plus an hourly rate. A ${n(h1)}-hour job cost $${n(C1)} and a ${n(h2)}-hour job cost $${n(C2)}. What would a ${n(h3)}-hour job cost, in dollars?`,
          steps: [
            `The cost is linear in the hours: ${V("C")} = ${V("r")}${V("h")} + ${V("f")}, with hourly rate ${V("r")} (the slope) and fee ${V("f")} (the intercept).`,
            `Slope: ${V("r")} = ${M.frac(`${n(C2)} − ${n(C1)}`, `${n(h2)} − ${n(h1)}`)} = ${M.frac(n(dC), n(dH))} = ${n(R)} dollars per hour.`,
            `Intercept: ${V("f")} = ${n(C1)} − ${n(R)} · ${n(h1)} = ${n(C1)} − ${n(Rh1)} = ${n(Fee)} dollars.`,
            `For ${n(h3)} hours: ${V("C")} = ${n(R)} · ${n(h3)} + ${n(Fee)} = ${n(Rh3)} + ${n(Fee)} = ${n(cost)} dollars.`,
          ],
          answer: { kind: "number", value: cost }, answerText: `$${n(cost)}`, answerInput: String(cost),
          vals: { dC, dH, R, Rh1, Fee, Rh3, cost }, params: { h1, h2, h3, C1, C2 },
        };
      },
    },

    // ---- F.2 Quadratic --------------------------------------------------------------------------------------
    "F.2": {
      title: "Quadratic functions",
      generate(r, level) {
        if (level === 1) {
          const a = r.pick([1, -1]), h = r.nonzero(-4, 4), k = r.nonzero(-5, 5);
          const render = ([aa, hh, kk]) => `${y} = ${aa < 0 ? "−" : ""}${M.sup(sh(hh), 2)}${M.term(kk, "")}`;
          const ch = choose(r, [[a, h, k], [a, -h, k], [a, h, -k], [-a, h, k]], render);
          return {
            prompt: `Which equation does the graphed parabola have?`,
            graph: graph({ view: [-8, 8, -8, 8], items: [{ t: "fn", e: `${a}*(x - (${h}))^2 + (${k})` }, { t: "pt", x: h, y: k }] }),
            steps: [
              `The vertex (the turning point) is at (${n(h)}, ${n(k)}).`,
              `A parabola with vertex (${V("h")}, ${V("k")}) is ${y} = ${V("a")}${M.sup(`(${x} − ${V("h")})`, 2)} + ${V("k")}. Here ${x} − ${np(h)} = ${M.poly([1, -h])}.`,
              `It opens ${a > 0 ? "upward" : "downward"}, and one step either side of the vertex it is 1 unit ${a > 0 ? "higher" : "lower"}, so ${V("a")} = ${n(a)}.`,
              `So ${render([a, h, k])}.`,
            ],
            ...ch.out, vals: {}, params: { a, h, k, opts: ch.opts },
          };
        }
        if (level === 2) {
          for (;;) {
            const a = r.nonzero(-3, 3), b = r.int(-8, 8), c = r.int(-6, 6);
            if (b === 0) continue;
            const h = F(-b, 2 * a);
            if (h.d > 2) continue;
            const hh = h.mul(h), ah = hh.mul(a), bh = h.mul(b), k = ah.add(bh).add(c);
            return {
              prompt: `Find the vertex of the parabola ${M.eq(`${y} = ${M.poly([a, b, c])}`)}`,
              steps: [
                `The vertex is where ${x} = −${M.frac(V("b"), `2${V("a")}`)} = −${M.frac(np(b), `2 · ${np(a)}`)} = ${M.f(h)}.`,
                `Substitute to get ${y}: ${n(a)} · ${pw(h, 2)} ${b < 0 ? "−" : "+"} ${n(Math.abs(b))} · ${M.f(h, { paren: true })}${M.term(c, "")} = ${M.f(ah)}${M.term(bh, "")}${M.term(c, "")} = ${M.f(k)}.`,
                `The vertex is (${M.f(h)}, ${M.f(k)}).`,
              ],
              answer: { kind: "point", value: [h.value, k.value] }, answerText: `(${M.f(h)}, ${M.f(k)})`, answerInput: `(${typed(h)}, ${typed(k)})`,
              vals: { h: fv(h), hh: fv(hh), ah: fv(ah), bh: fv(bh), k: fv(k) }, params: { a, b, c },
            };
          }
        }
        // level 3: maximum height of a thrown ball
        const v = 5 * r.int(2, 8), h0 = r.int(0, 30);
        const tm = v / 10, tt = tm * tm, m5 = -5 * tt, vt = v * tm, H = m5 + vt + h0;
        return {
          prompt: `A ball is thrown straight up from ${h0 === 0 ? "the ground" : `a height of ${n(h0)} m`} at ${n(v)} m/s. Taking ${V("g")} ≈ 10 m/s², its height after ${V("t")} seconds is ${M.eq(`${V("h")}(${V("t")}) = ${M.poly([-5, v, h0], "t")}`)} How high does it go, in meters?`,
          steps: [
            `The highest point is the vertex: ${V("t")} = −${M.frac(n(v), `2 · (−5)`)} = ${M.frac(n(v), "10")} = ${n(tm)} s.`,
            `${V("h")}(${n(tm)}) = −5 · ${M.sup(n(tm), 2)} + ${n(v)} · ${n(tm)}${h0 ? ` + ${n(h0)}` : ""} = ${n(m5)} + ${n(vt)}${h0 ? ` + ${n(h0)}` : ""} = ${n(H)}.`,
            `The ball rises to ${n(H)} m.`,
          ],
          ...exactDec(H, " m"), vals: { tm, tt, m5, vt, H }, params: { v, h0 }, consts: [5, 10],
        };
      },
    },

    // ---- F.3 Cubic ---------------------------------------------------------------------------------------------
    "F.3": {
      title: "Cubic functions",
      generate(r, level) {
        const facs = (roots) => roots.slice().sort((a, b) => (a === 0 ? -1 : b === 0 ? 1 : a - b)).map((p) => (p === 0 ? x : `(${M.poly([1, -p])})`)).join("");
        if (level === 1) {
          const a = r.nonzero(-4, 4), b = r.int(-6, 6), c = r.int(-6, 6), d = r.int(-6, 6);
          const index = a > 0 ? 0 : 1;
          return {
            prompt: `Describe the end behavior of the graph of ${M.eq(`${y} = ${M.poly([a, b, c, d])}`)}`,
            steps: [
              `For large |${x}| the leading term ${co(a)}${M.sup(x, 3)} outgrows all the others, so it decides the ends.`,
              `As ${x} → +∞, ${M.sup(x, 3)} → +∞, ${a === 1 ? "" : `so ${co(a)}${M.sup(x, 3)} → ${a > 0 ? "+∞" : "−∞"}`}: the right end goes ${a > 0 ? "up" : "down"}.`,
              `As ${x} → −∞, ${M.sup(x, 3)} → −∞, ${a === 1 ? "" : `so ${co(a)}${M.sup(x, 3)} → ${a > 0 ? "−∞" : "+∞"}`}: the left end goes ${a > 0 ? "down" : "up"}.`,
            ],
            answer: { kind: "choice", options: END, index }, answerText: END[index], vals: {}, params: { a, b, c, d }, consts: [3],
          };
        }
        if (level === 2) {
          for (;;) {
            const a = r.pick([1, -1]), roots = r.sample([-3, -2, -1, 0, 1, 2, 3], 3).sort((p, q) => p - q);
            const i = r.int(0, 2), moved = roots.slice();
            moved[i] += r.pick([-1, 1]);
            const neg = roots.map((p) => -p).sort((p, q) => p - q);
            const key = (o) => JSON.stringify([o[0], o.slice(1).sort((p, q) => p - q)]);
            if (new Set(moved).size !== 3 || moved.some((p) => Math.abs(p) > 4)) continue;
            const items = [[a, ...roots], [a, ...neg], [-a, ...roots], [a, ...moved.slice().sort((p, q) => p - q)]];
            if (new Set(items.map(key)).size !== 4) continue;
            const render = (o) => `${y} = ${o[0] < 0 ? "−" : ""}${facs(o.slice(1))}`;
            const ch = choose(r, items, render);
            const [p, q, s] = roots;
            return {
              prompt: `Which equation does the graphed cubic have?`,
              graph: graph({ view: [-5, 5, -10, 10], items: [{ t: "fn", e: `${a}*(x-(${p}))*(x-(${q}))*(x-(${s}))` }, ...roots.map((z) => ({ t: "pt", x: z, y: 0 }))] }),
              steps: [
                `The graph crosses the ${x}-axis at ${x} = ${n(p)}, ${n(q)} and ${n(s)}. Each zero ${V("r")} gives a factor (${x} − ${V("r")}): ${facs(roots)}.`,
                `On the far right the graph ${a > 0 ? "rises" : "falls"}, so the leading coefficient is ${a > 0 ? "positive" : "negative"}.`,
                `So ${render([a, ...roots])}.`,
              ],
              ...ch.out, vals: {}, params: { a, roots, opts: ch.opts },
            };
          }
        }
        for (;;) {
          const [p, q, s] = r.sample([-4, -3, -2, -1, 1, 2, 3, 4], 3).sort((u, v) => u - v);
          const a = r.pick([F(1, 2), F(-1, 2), F(1), F(-1), F(2), F(-2)]);
          const Pr = -p * q * s, d = a.mul(Pr);
          if (!d.isInt() || d.n === 0 || Math.abs(d.n) > 10) continue;
          return {
            prompt: `The cubic below crosses the ${x}-axis at the three marked points and the ${y}-axis at the fourth; all four sit on grid corners. Writing it as ${M.eq(`${y} = ${V("a")}(${x} − ${V("p")})(${x} − ${V("q")})(${x} − ${V("s")})`)} find ${V("a")}.`,
            graph: graph({ view: [-5, 5, -12, 12], items: [{ t: "fn", e: `${a.n}/${a.d}*(x-(${p}))*(x-(${q}))*(x-(${s}))` }, ...[p, q, s].map((z) => ({ t: "pt", x: z, y: 0 })), { t: "pt", x: 0, y: d.n }] }),
            steps: [
              `The zeros are ${x} = ${n(p)}, ${n(q)} and ${n(s)}, so ${y} = ${V("a")}${facs([p, q, s])}.`,
              `The ${y}-intercept is (0, ${n(d.n)}). Put ${x} = 0: ${n(d.n)} = ${V("a")}(0 − ${np(p)})(0 − ${np(q)})(0 − ${np(s)}) = ${V("a")} · ${np(-p)} · ${np(-q)} · ${np(-s)} = ${n(Pr)}${V("a")}.`,
              `So ${V("a")} = ${M.frac(n(d.n), n(Pr))} = ${M.f(a)}.`,
            ],
            ...exact(a), vals: { d: d.n, mp: -p, mq: -q, ms: -s, Pr, a: fv(a) }, params: { p, q, s, an: a.n, ad: a.d },
          };
        }
      },
    },

    // ---- F.4 Absolute value --------------------------------------------------------------------------------------
    "F.4": {
      title: "Absolute value functions",
      generate(r, level) {
        const av = (h) => `|${h === 0 ? x : M.poly([1, -h])}|`;
        if (level === 1) {
          const a = r.pick([1, -1]), h = r.nonzero(-4, 4), k = r.nonzero(-5, 5);
          const render = ([aa, hh, kk]) => `${y} = ${aa < 0 ? "−" : ""}${av(hh)}${M.term(kk, "")}`;
          const ch = choose(r, [[a, h, k], [a, -h, k], [a, h, -k], [-a, h, k]], render);
          return {
            prompt: `Which equation does the graphed V have?`,
            graph: graph({ view: [-8, 8, -8, 8], items: [{ t: "fn", e: `${a}*abs(x - (${h})) + (${k})` }, { t: "pt", x: h, y: k }] }),
            steps: [
              `The vertex (the corner of the V) is at (${n(h)}, ${n(k)}).`,
              `${y} = ${V("a")}|${x} − ${V("h")}| + ${V("k")} has its vertex at (${V("h")}, ${V("k")}). Here ${x} − ${np(h)} = ${M.poly([1, -h])}.`,
              `The V opens ${a > 0 ? "upward" : "downward"} with arms of slope ±1, so ${V("a")} = ${n(a)}.`,
              `So ${render([a, h, k])}.`,
            ],
            ...ch.out, vals: {}, params: { a, h, k, opts: ch.opts },
          };
        }
        if (level === 2) {
          const a = r.pick([2, 3, -2, -3, 1]), m = r.int(1, 5), h = r.int(-5, 5), k = r.int(-6, 6);
          const c = a * m + k, ck = c - k, x1 = h + m, x2 = h - m;
          return {
            prompt: `Solve ${M.eq(`${co(a)}${av(h)}${M.term(k, "")} = ${n(c)}`)}`,
            steps: [
              k === 0 ? `The absolute value is already alone on the left: ${co(a)}${av(h)} = ${n(ck)}.` : `Isolate the absolute value: ${co(a)}${av(h)} = ${n(c)} − ${np(k)} = ${n(ck)}.`,
              a === 1 ? `So ${av(h)} = ${n(m)}.` : `Divide by ${n(a)}: ${av(h)} = ${n(m)}.`,
              h === 0 ? `So ${x} = ${n(m)} or ${x} = −${n(m)}.` : `Two cases: ${M.poly([1, -h])} = ${n(m)} gives ${x} = ${n(x1)}; ${M.poly([1, -h])} = −${n(m)} gives ${x} = ${n(x2)}.`,
            ],
            answer: { kind: "numbers", values: [x1, x2] }, answerText: `${x} = ${n(x1)} or ${x} = ${n(x2)}`, answerInput: `${x1}, ${x2}`,
            vals: { ck, m, x1, x2 }, params: { a, h, k, c },
          };
        }
        for (;;) {
          const s = r.pick([1, -1]), a = r.int(1, 3) * s, w = r.int(1, 4), h = r.int(-4, 4);
          const k = -a * w, absk = Math.abs(k), x1 = h - w, x2 = h + w, base = 2 * w, area = w * absk;
          if (absk > 8) continue;
          return {
            prompt: `Find the area of the triangle enclosed by the ${x}-axis and the graph of ${M.eq(`${y} = ${co(a)}${av(h)}${M.term(k, "")}`)}`,
            graph: graph({ view: [-9, 9, -9, 9], items: [{ t: "fn", e: `${a}*abs(x - (${h})) + (${k})` }] }),
            steps: [
              `The vertex is (${n(h)}, ${n(k)}), the triangle's apex, so its height is |${n(k)}| = ${n(absk)}.`,
              `The ${x}-intercepts: ${co(a)}${av(h)} = ${n(-k)}, so ${av(h)} = ${n(w)} and ${x} = ${n(x1)} or ${x} = ${n(x2)}.`,
              `The base runs from ${n(x1)} to ${n(x2)}: ${n(x2)} − ${np(x1)} = ${n(base)}.`,
              `Area = ${M.frac("1", "2")} · base · height = ${M.frac("1", "2")} · ${n(base)} · ${n(absk)} = ${n(area)}.`,
            ],
            ...exact(area, " square units"), vals: { nk: -k, absk, w, x1, x2, base, area }, params: { a, h, k },
          };
        }
      },
    },

    // ---- F.5 Square root ----------------------------------------------------------------------------------------
    "F.5": {
      title: "Square root functions",
      generate(r, level) {
        const rt = (h) => M.sqrt(h === 0 ? x : M.poly([1, -h]));
        if (level === 1) {
          const a = r.pick([1, 2, 3, -1, -2]), h = r.int(-5, 5), k = r.int(-6, 6), s = r.int(1, 5), x0 = h + s * s;
          const as = a * s, ans = as + k;
          return {
            prompt: `For ${M.eq(`${V("f")}(${x}) = ${co(a)}${rt(h)}${M.term(k, "")}`)} find ${V("f")}(${n(x0)}).`,
            steps: [
              `Inside the root: ${n(x0)} − ${np(h)} = ${n(s * s)}, and ${M.sqrt(n(s * s))} = ${n(s)}.`,
              `${V("f")}(${n(x0)}) = ${a === 1 ? "" : a === -1 ? "−" : `${n(a)} · `}${n(s)}${M.term(k, "")}${k === 0 && Math.abs(a) === 1 ? "" : ` = ${n(ans)}`}.`,
            ],
            ...exact(ans), vals: { x0, s2: s * s, s, as, ans }, params: { a, h, k, x0 },
          };
        }
        if (level === 2) {
          for (;;) {
            const a = r.nonzero(-5, 5), b = r.nonzero(-12, 12);
            const c = F(-b, a);
            const ge = a > 0;
            const render = ([g, q]) => `${x} ${g ? "≥" : "≤"} ${M.f(F(q[0], q[1]))}`;
            const items = [[ge ? 1 : 0, [c.n, c.d]], [ge ? 0 : 1, [c.n, c.d]], [ge ? 1 : 0, [-c.n, c.d]], [ge ? 0 : 1, [-c.n, c.d]]];
            const ch = choose(r, items, render);
            return {
              prompt: `What is the domain of ${M.eq(`${y} = ${M.sqrt(M.poly([a, b]))}`)}?`,
              steps: [
                `A square root needs a nonnegative input: ${M.poly([a, b])} ≥ 0.`,
                `${b > 0 ? "Subtract" : "Add"} ${n(Math.abs(b))}: ${co(a)}${x} ≥ ${n(-b)}.`,
                a === 1 ? `So the domain is ${x} ≥ ${M.f(c)}.` : a > 0 ? `Divide by ${n(a)} (positive, so the inequality stays): ${x} ≥ ${M.f(c)}.`
                  : `Divide by ${n(a)}, a negative number, so the inequality reverses: ${x} ≤ ${M.f(c)}.`,
              ],
              ...ch.out, vals: { nb: -b, c: fv(c) }, params: { a, b, opts: ch.opts },
            };
          }
        }
        for (;;) {
          const a = r.pick([1, 2, 3, -1, -2]), s = r.int(1, 4), h = r.int(-4, 4), k = r.int(-4, 4);
          const c = a * s + k, ck = c - k, x0 = h + s * s;
          const lo = Math.min(k, c), hi = Math.max(k, c);
          return {
            prompt: `Solve ${M.eq(`${co(a)}${rt(h)}${M.term(k, "")} = ${n(c)}`)} The graph shows the left side and the line ${y} = ${n(c)}.`,
            graph: graph({ view: [h - 2, h + 19, lo - 4, hi + 4], items: [{ t: "fn", e: `${a}*sqrt(x - (${h})) + (${k})` }, { t: "hline", y: c, dash: true, role: "secondary" }] }),
            steps: [
              k === 0 ? `The root is already alone: ${co(a)}${rt(h)} = ${n(ck)}.` : `Isolate the root: ${co(a)}${rt(h)} = ${n(c)} − ${np(k)} = ${n(ck)}.`,
              a === 1 ? `So ${rt(h)} = ${n(s)}, which is positive, so a solution exists.` : `Divide by ${n(a)}: ${rt(h)} = ${n(s)}, which is positive, so a solution exists.`,
              h === 0 ? `Square both sides: ${x} = ${n(s * s)}.` : `Square both sides: ${M.poly([1, -h])} = ${n(s * s)}, so ${x} = ${n(s * s)}${M.term(h, "")} = ${n(x0)}.`,
            ],
            ...exact(x0), vals: { ck, s, s2: s * s, x0 }, params: { a, h, k, c },
          };
        }
      },
    },

    // ---- F.6 Reciprocal ---------------------------------------------------------------------------------------
    "F.6": {
      title: "Reciprocal functions and asymptotes",
      generate(r, level) {
        const recip = (a, h) => `${a < 0 ? "−" : ""}${M.frac(n(Math.abs(a)), h === 0 ? x : M.poly([1, -h]))}`;
        if (level === 1) {
          const a = r.pick([1, -1]), h = r.nonzero(-4, 4), k = r.nonzero(-4, 4);
          const render = ([aa, hh, kk]) => `${y} = ${recip(aa, hh)}${M.term(kk, "")}`;
          const ch = choose(r, [[a, h, k], [a, -h, k], [a, h, -k], [-a, h, k]], render);
          return {
            prompt: `Which equation does the graph have? The dashed lines are its asymptotes.`,
            graph: graph({ view: [-8, 8, -8, 8], items: [{ t: "fn", e: `${a}/(x - (${h})) + (${k})` }, { t: "vline", x: h, dash: true, role: "muted" }, { t: "hline", y: k, dash: true, role: "muted" }] }),
            steps: [
              `The vertical asymptote is ${x} = ${n(h)}, where the denominator is zero: the denominator is ${M.poly([1, -h])}.`,
              `The horizontal asymptote is ${y} = ${n(k)}: the curve levels off at ${n(k)} instead of 0, so ${n(k)} is added.`,
              `The branches sit ${a > 0 ? "upper right and lower left" : "upper left and lower right"} of where the asymptotes cross, ${a > 0 ? "like" : "the mirror image of"} ${y} = ${M.frac("1", x)}, so the numerator is ${n(a)}.`,
              `So ${render([a, h, k])}.`,
            ],
            ...ch.out, vals: {}, params: { a, h, k, opts: ch.opts },
          };
        }
        if (level === 2) {
          const a = r.nonzero(-6, 6), h = r.int(-5, 5), k = r.nonzero(-4, 4);
          const q = F(a, -k), xint = q.add(h);
          const den = h === 0 ? x : M.poly([1, -h]);
          return {
            prompt: `Find the ${x}-intercept of ${M.eq(`${y} = ${recip(a, h)}${M.term(k, "")}`)}`,
            steps: [
              `Set ${y} = 0: ${M.frac(n(a), den)} = ${n(-k)}.`,
              `Multiply by ${h === 0 ? x : `(${den})`} and divide by ${np(-k)}: ${den} = ${M.frac(n(a), n(-k))}${q.n === a && q.d === -k ? "" : ` = ${M.f(q)}`}.`,
              h === 0 ? `So ${x} = ${M.f(xint)}.` : `So ${x} = ${M.f(q)}${M.term(h, "")} = ${M.f(xint)}.`,
            ],
            ...exact(xint), vals: { nk: -k, q: fv(q), xint: fv(xint) }, params: { a, h, k },
          };
        }
        const nn = r.pick([200, 250, 400, 500, 600, 800, 1000, 1200, 1500, 2000]), d = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4]), v = r.pick([1, 1.5, 2, 2.5, 3]);
        const Fx = nn * d, c = v + d;
        return {
          prompt: `A bakery spends ${money(Fx)} a month on rent and equipment, plus ${money(v)} in ingredients per loaf, so its average cost per loaf when it bakes ${V("n")} loaves is ${M.eq(`${V("A")}(${V("n")}) = ${M.frac(n(Fx), V("n"))} + ${fmt(v)}`)} How many loaves must it bake for the average cost to fall to ${money(c)}?`,
          steps: [
            `Set ${V("A")}(${V("n")}) = ${fmt(c)}: ${M.frac(n(Fx), V("n"))} + ${fmt(v)} = ${fmt(c)}, so ${M.frac(n(Fx), V("n"))} = ${fmt(c)} − ${fmt(v)} = ${fmt(d)}.`,
            `${V("n")} = ${n(Fx)} ÷ ${fmt(d)} = ${n(nn)} loaves.`,
            `As ${V("n")} grows the average cost approaches its horizontal asymptote, ${money(v)} (the ingredients), but never reaches it.`,
          ],
          ...exact(nn, " loaves"), vals: { d, nn }, params: { Fx, v, c },
        };
      },
    },

    // ---- F.7 Exponential growth -----------------------------------------------------------------------------------
    "F.7": {
      title: "Exponential growth",
      generate(r, level) {
        if (level === 1) {
          const a = r.int(1, 6), b = r.pick([2, 3, 4, 5]), x0 = r.int(1, b === 2 ? 5 : b === 3 ? 4 : 3);
          const bx = Math.pow(b, x0), ans = a * bx;
          return {
            prompt: `For ${M.eq(`${V("f")}(${x}) = ${a === 1 ? "" : `${n(a)} · `}${M.sup(n(b), x)}`)} find ${V("f")}(${n(x0)}).`,
            steps: [`${M.sup(n(b), n(x0))} = ${n(bx)}.`, a === 1 ? `So ${V("f")}(${n(x0)}) = ${n(ans)}.` : `${n(a)} · ${n(bx)} = ${n(ans)}.`],
            ...exact(ans), vals: { bx, ans }, params: { a, b, x0 },
          };
        }
        if (level === 2) {
          const a = r.int(1, 3), b = r.pick([2, 3]);
          const pool = [[a, b === 2 ? 3 : 2, 1], [a === 1 ? 2 : a - 1, b, 1], [a + 1, b, 1], [a, 1, b]];
          const items = [[a, b, 1], ...distract(r, [a, b, 1], pool)];
          const render = ([aa, bn, bd]) => `${y} = ${aa === 1 ? "" : `${n(aa)} · `}${M.sup(bd === 1 ? n(bn) : `(${M.frac("1", n(bd))})`, x)}`;
          const ch = choose(r, items, render);
          return {
            prompt: `Which equation does the graph have? The marked points sit on grid corners.`,
            graph: graph({ view: [-3, 3, -2, 12], items: [{ t: "fn", e: `${a}*${b}^x` }, { t: "pt", x: 0, y: a }, { t: "pt", x: 1, y: a * b }, { t: "hline", y: 0, dash: true, role: "muted" }] }),
            steps: [
              `At ${x} = 0 every ${M.sup(V("b"), x)} equals 1, so the ${y}-intercept is the coefficient: the graph passes through (0, ${n(a)}).`,
              `From ${x} = 0 to ${x} = 1 the value goes from ${n(a)} to ${n(a * b)}: it multiplies by ${n(a * b)} ÷ ${n(a)} = ${n(b)}, so the base is ${n(b)}.`,
              `The curve rises to the right (growth, base above 1) and approaches the asymptote ${y} = 0 on the left: ${render([a, b, 1])}.`,
            ],
            ...ch.out, vals: { ab: a * b }, params: { a, b, opts: ch.opts },
          };
        }
        if (r.chance(0.5)) {
          const N0 = r.pick([100, 200, 250, 300, 500, 1000]), d = r.int(2, 6), m = r.int(3, 6), tH = m * d, pm = Math.pow(2, m), N = N0 * pm;
          return {
            prompt: `A culture starts with ${n(N0)} bacteria and doubles every ${n(d)} hours. How many bacteria are there after ${n(tH)} hours?`,
            steps: [
              `The population is ${V("N")} = ${n(N0)} · ${M.sup("2", `${V("t")}/${n(d)}`)}: one doubling every ${n(d)} hours.`,
              `In ${n(tH)} hours there are ${n(tH)} ÷ ${n(d)} = ${n(m)} doublings, and ${M.sup("2", n(m))} = ${n(pm)}.`,
              `${V("N")} = ${n(N0)} · ${n(pm)} = ${P.grouped(N)} bacteria.`,
            ],
            ...exact(N, " bacteria"), vals: { m, pm, N }, params: { N0, d, tH },
          };
        }
        for (;;) {
          const Pr = r.pick([1000, 2500, 4000, 5000]), rp = r.pick([2, 3, 4, 5, 6, 8]), tY = r.pick([5, 8, 10, 12, 15, 20]);
          const rate = rp / 100, rt = (rp * tY) / 100, ert = Math.exp(rt), A = Pr * ert;
          if (!agrees(A, Pr * rd(ert, 8), 2)) continue;
          return {
            prompt: `${money(Pr)} is invested at ${n(rp)}% a year compounded continuously, so ${M.eq(`${V("A")}(${V("t")}) = ${n(Pr)}${M.sup("e", `${fmt(rate)}${V("t")}`)}`)} How much is it worth after ${n(tY)} years? Round to the nearest cent.`,
            steps: [
              `The exponent: ${fmt(rate)} × ${n(tY)} = ${fmt(rt)}.`,
              `${M.sup("e", fmt(rt))} ${eqa(ert, 8)}.`,
              `${V("A")} = ${n(Pr)} × ${fmt(ert, 8)} ${eqa(A, 2)}, so ${money(A)}.`,
            ],
            ...rounded(A, 2), answerText: money(A), vals: { rate, rt, ert, A }, params: { Pr, rp, tY },
          };
        }
      },
    },

    // ---- F.8 Exponential decay ------------------------------------------------------------------------------------
    "F.8": {
      title: "Exponential decay and half-life",
      generate(r, level) {
        if (level === 1) {
          const b = r.pick([2, 3]), x0 = r.int(2, b === 2 ? 4 : 3), a = r.int(1, 24);
          const bx = Math.pow(b, x0), ans = F(a, bx);
          return {
            prompt: `For ${M.eq(`${V("f")}(${x}) = ${a === 1 ? "" : `${n(a)} · `}${M.sup(`(${M.frac("1", n(b))})`, x)}`)} find ${V("f")}(${n(x0)}).`,
            steps: [
              `${M.sup(`(${M.frac("1", n(b))})`, n(x0))} = ${M.frac("1", M.sup(n(b), n(x0)))} = ${M.frac("1", n(bx))}.`,
              a === 1 ? `So ${V("f")}(${n(x0)}) = ${M.f(ans)}.` : `${n(a)} · ${M.frac("1", n(bx))} = ${M.frac(n(a), n(bx))}${ans.d !== bx ? ` = ${M.f(ans)}` : ""}.`,
            ],
            ...exact(ans), vals: { bx, ans: fv(ans) }, params: { a, b, x0 },
          };
        }
        if (level === 2) {
          for (;;) {
            const ln2 = Math.LN2;
            if (r.chance(0.5)) {
              const k = r.pick([0.01, 0.02, 0.025, 0.04, 0.05, 0.08, 0.1, 0.12, 0.15, 0.2]), T = ln2 / k;
              if (!agrees(T, rd(ln2, 6) / k, 2)) continue;
              return {
                prompt: `A substance decays as ${M.eq(`${V("A")}(${V("t")}) = ${M.sub(V("A"), "0")}${M.sup("e", `−${fmt(k)}${V("t")}`)}`)} with ${V("t")} in years. Find its half-life, rounded to 2 decimal places.`,
                steps: [
                  `At the half-life ${V("T")}, half remains: ${M.sup("e", `−${fmt(k)}${V("T")}`)} = ${M.frac("1", "2")}.`,
                  `Take ln of both sides: −${fmt(k)}${V("T")} = ln ${M.frac("1", "2")} = −ln 2, so ${V("T")} = ${M.frac("ln 2", fmt(k))}.`,
                  `${V("T")} ${eqa(ln2, 6)} ÷ ${fmt(k)} ${eqa(T, 2)} years.`,
                ],
                ...rounded(T, 2, " years"), vals: { ln2, T }, params: { k },
              };
            }
            const T = r.pick([5, 8, 10, 12, 20, 25, 30, 50, 100]), k = ln2 / T;
            if (!agrees(k, rd(ln2, 6) / T, 4)) continue;
            return {
              prompt: `A drug's amount in the body falls as ${M.eq(`${V("A")}(${V("t")}) = ${M.sub(V("A"), "0")}${M.sup("e", `−${V("k")}${V("t")}`)}`)} with a half-life of ${n(T)} hours. Find the decay rate ${V("k")} per hour, rounded to 4 decimal places.`,
              steps: [
                `After one half-life half remains: ${M.sup("e", `−${V("k")} · ${n(T)}`)} = ${M.frac("1", "2")}.`,
                `Take ln: −${n(T)}${V("k")} = −ln 2, so ${V("k")} = ${M.frac("ln 2", n(T))}.`,
                `${V("k")} ${eqa(ln2, 6)} ÷ ${n(T)} ${eqa(k, 4)} per hour.`,
              ],
              ...rounded(k, 4, " per hour"), vals: { ln2, k }, params: { T }, consts: [4],
            };
          }
        }
        if (r.chance(0.5)) {
          const D = r.pick([100, 200, 250, 400, 500, 800]), h = r.pick([2, 3, 4, 6, 8]), m = r.int(2, 4), tH = m * h, pm = Math.pow(2, m), rem = D / pm;
          return {
            prompt: `A patient takes ${n(D)} mg of a drug with a half-life of ${n(h)} hours. How much remains after ${n(tH)} hours, in mg?`,
            steps: [
              `${n(tH)} hours is ${n(tH)} ÷ ${n(h)} = ${n(m)} half-lives.`,
              `Each half-life halves the amount: ${M.sup(`(${M.frac("1", "2")})`, n(m))} = ${M.frac("1", n(pm))}.`,
              `${n(D)} × ${M.frac("1", n(pm))} = ${fmt(rem)} mg.`,
            ],
            ...exactDec(rem, " mg"), vals: { m, pm, rem }, params: { D, h, tH },
          };
        }
        const m = r.int(2, 4), pm = Math.pow(2, m), hl = 5730, age = m * hl;
        return {
          prompt: `Carbon-14 has a half-life of ${n(hl)} years. A bone holds ${M.frac("1", n(pm))} of the carbon-14 it held when the animal died. How old is it, in years?`,
          steps: [
            `${M.frac("1", n(pm))} = ${M.sup(`(${M.frac("1", "2")})`, n(m))}, so the amount has halved ${n(m)} time${m === 1 ? "" : "s"}.`,
            `${n(m)} half-li${m === 1 ? "fe" : "ves"}: ${n(m)} × ${n(hl)} = ${P.grouped(age)} years.`,
          ],
          ...exact(age, " years"), vals: { m, age }, params: { pm, hl }, consts: [14],
        };
      },
    },

    // ---- F.9 Natural logarithm ------------------------------------------------------------------------------------
    "F.9": {
      title: "The natural logarithm",
      generate(r, level) {
        const lnArg = (h) => (h === 0 ? ` ${x}` : `(${M.poly([1, -h])})`);
        if (level === 1) {
          const h = r.nonzero(-6, 6);
          if (r.chance(0.5)) {
            const ans = h + 1;
            return {
              prompt: `Find the ${x}-intercept of ${M.eq(`${y} = ln${lnArg(h)}`)}`,
              steps: [`ln ${V("u")} = 0 exactly when ${V("u")} = 1, because ${M.sup("e", "0")} = 1.`, `${M.poly([1, -h])} = 1, so ${x} = 1${M.term(h, "")} = ${n(ans)}.`],
              ...exact(ans), vals: { ans }, params: { h, ask: 0 },
            };
          }
          return {
            prompt: `Find the vertical asymptote of ${M.eq(`${y} = ln${lnArg(h)}`)} Give its ${x}-value.`,
            steps: [
              `ln ${V("u")} is defined only for ${V("u")} &gt; 0, and it plunges toward −∞ as ${V("u")} → 0 from above.`,
              `${M.poly([1, -h])} = 0 at ${x} = ${n(h)}: the asymptote is ${x} = ${n(h)}, and the domain is ${x} &gt; ${n(h)}.`,
            ],
            ...exact(h), vals: {}, params: { h, ask: 1 },
          };
        }
        if (level === 2) {
          for (;;) {
            const a = r.pick([1, 2, -1]), h = r.int(-3, 3), k = r.nonzero(-3, 3);
            const u = F(-k, a);
            if (u.value < -3 || u.value > 2) continue;
            const ev = Math.exp(u.value), xi = h + ev;
            if (!agrees(xi, h + rd(ev, 4), 2)) continue;
            return {
              prompt: `Find the ${x}-intercept of ${M.eq(`${y} = ${a === 1 ? "" : a === -1 ? "−" : `${n(a)} `}ln${lnArg(h)}${M.term(k, "")}`)} Round to 2 decimal places.`,
              graph: graph({ view: [h - 1, h + 9, -6, 6], items: [{ t: "fn", e: `${a}*ln(x - (${h})) + (${k})` }, { t: "vline", x: h, dash: true, role: "muted" }] }),
              steps: [
                `Set ${y} = 0: ${a === 1 ? "" : a === -1 ? "−" : `${n(a)} `}ln${lnArg(h)} = ${n(-k)}${a === 1 ? "" : `, so ln${lnArg(h)} = ${M.f(u)}`}.`,
                `Exponentiate both sides: ${h === 0 ? x : M.poly([1, -h])} = ${M.sup("e", M.f(u))} ${eqa(ev, 4)}.`,
                h === 0 ? `So ${x} ${eqa(xi, 2)}.` : `${x} = ${n(h)} + ${fmt(ev, 4)} ${eqa(xi, 2)}.`,
              ],
              ...rounded(xi, 2), vals: { nk: -k, u: fv(u), ev, xi }, params: { a, h, k },
            };
          }
        }
        for (;;) {
          const Pr = r.pick([1000, 2000, 4000]), ratio = r.pick([1.5, 2.5, 3, 4, 5, 10]), rp = r.int(3, 8);
          const A = Pr * ratio, rate = rp / 100, L = Math.log(ratio), tY = L / rate;
          if (!agrees(tY, rd(L, 6) / rate, 2)) continue;
          return {
            prompt: `${money(Pr)} earns ${n(rp)}% a year compounded continuously: ${V("A")}(${V("t")}) = ${n(Pr)}${M.sup("e", `${fmt(rate)}${V("t")}`)}. How many years until it is worth ${money(A)}? Round to 2 decimal places.`,
            steps: [
              `${n(Pr)}${M.sup("e", `${fmt(rate)}${V("t")}`)} = ${n(A)}, so ${M.sup("e", `${fmt(rate)}${V("t")}`)} = ${n(A)} ÷ ${n(Pr)} = ${fmt(ratio)}.`,
              `Take ln of both sides: ${fmt(rate)}${V("t")} = ln ${fmt(ratio)} ${eqa(L, 6)}.`,
              `${V("t")} = ${fmt(L, 6)} ÷ ${fmt(rate)} ${eqa(tY, 2)} years.`,
            ],
            ...rounded(tY, 2, " years"), vals: { ratio, rate, L, tY }, params: { Pr, A, rp },
          };
        }
      },
    },
    // ---- F.10 Sine ---------------------------------------------------------------------------------------------
    "F.10": {
      title: "The sine function",
      generate(r, level) {
        if (level === 1) return evalTrig(r, "sin");
        if (level === 2) {
          const A = r.int(1, 3), B = r.pick([[1, 1], [2, 1], [1, 2]]);
          const pool = [[0, A, 2, 1], [0, A, 1, 1], [0, A, 1, 2], [0, A === 1 ? 2 : 1, ...B], [0, A === 3 ? 2 : 3, ...B], [1, A, ...B], [0, -A, ...B]];
          const truth = [0, A, ...B], items = [truth, ...distract(r, truth, pool)];
          const ch = choose(r, items, ([T, a, bn, bd]) => `${y} = ${wave(T, a, bn, bd)}`);
          const per = F(2 * B[1], B[0]);
          return {
            prompt: `Which equation does the graph have? The marked point is a peak.`,
            graph: graph({ view: [-7, 7, -4, 4], items: [{ t: "fn", e: `${A}*sin(${B[0]}/${B[1]}*x)` }, { t: "pt", x: (B[1] * Math.PI) / (2 * B[0]), y: A }, ...piLabels(7, F(1, 2), -0.45)] }),
            steps: [
              `The graph runs between ${y} = −${n(A)} and ${y} = ${n(A)}, so the amplitude is ${n(A)}.`,
              `At ${x} = 0 the graph is at 0 and rising: that is how a sine wave starts (a cosine wave starts at its maximum).`,
              `One full cycle (up, down and back to 0 rising) takes ${piq(per)}: that is the period. The period of sin(${V("b")}${x}) is ${M.frac("2π", V("b"))}, so ${V("b")} = 2π ÷ ${piq(per)} = ${M.f(F(B[0], B[1]))}.`,
              `So ${y} = ${wave(0, A, ...B)}.`,
            ],
            ...ch.out, vals: { per: fv(per) }, params: { A, Bn: B[0], Bd: B[1], opts: ch.opts },
          };
        }
        return solveTrigProblem(r, "sin");
      },
    },

    // ---- F.11 Cosine -------------------------------------------------------------------------------------------
    "F.11": {
      title: "The cosine function",
      generate(r, level) {
        if (level === 1) return evalTrig(r, "cos");
        if (level === 2) {
          const A = r.pick([1, 2, 3, -1, -2, -3]), B = r.pick([[1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [1, 3]]), D = r.int(-3, 3);
          const u = A > 0 ? F(1) : F(2), xm = u.mul(F(B[1], B[0])), absA = Math.abs(A), ymin = D - absA;
          const arg = argB(B[0], B[1]);
          return {
            prompt: `Find the smallest positive ${x} at which ${M.eq(`${y} = ${wave(1, A, ...B)}${M.term(D, "")}`)} reaches its minimum.`,
            steps: [
              A > 0 ? `${y} is smallest when cos(${arg}) is smallest, since its coefficient ${n(A)} is positive: when cos(${arg}) = −1.`
                : `Its coefficient ${n(A)} is negative, so ${y} is smallest when cos(${arg}) is largest: when cos(${arg}) = 1.`,
              A > 0 ? `cos ${V("u")} = −1 first at ${V("u")} = π.` : `cos ${V("u")} = 1 at ${V("u")} = 0, 2π, 4π, …; the first positive one is ${V("u")} = 2π.`,
              `${B[0] === 1 && B[1] === 1 ? `So ${x} = ${piq(xm)}` : `${arg} = ${piq(u)}, so ${x} = ${piq(xm)}`}. The minimum value there is ${n(D)} − ${n(absA)} = ${n(ymin)}.`,
            ],
            answer: { kind: "number", value: xm.value * Math.PI }, answerText: `${x} = ${piq(xm)}`, answerInput: piTyped(xm),
            vals: { xm: fv(xm), absA, ymin }, params: { A, Bn: B[0], Bd: B[1], D }, consts: [4],
          };
        }
        for (;;) {
          const A = r.pick([4, 5, 6, 8, 10, 12]), T = r.pick([2, 3, 4, 6, 8, 12]), deg = r.pick(ANG.filter((d) => d > 0));
          if ((T * deg * 100) % 360 !== 0) continue;
          const tt = (T * deg) / 360, th = F(deg, 180), cv = trig("cos", deg), pos = rxMul(cv, A), posv = rxv(pos);
          if (pos.rad !== 1 && !agrees(posv, posv, 2)) continue;
          const st = trigSteps("cos", deg);
          const side = pos.c.n > 0 ? "right of the rest position" : pos.c.n < 0 ? "left of the rest position" : "at the rest position";
          return {
            prompt: `A mass on a spring is pulled ${n(A)} cm to the right and released. Its position is ${M.eq(`${V("s")}(${V("t")}) = ${n(A)} cos${M.frac(`2π${V("t")}`, n(T))}`)} cm (right is positive), with ${V("t")} in seconds. Where is it at ${V("t")} = ${fmt(tt)} s? Round to 2 decimal places.`,
            steps: [
              `The angle: θ = ${M.frac(`2π · ${fmt(tt)}`, n(T))} = ${piq(th)}.`,
              ...st.steps,
              `${V("s")} = ${n(A)} · ${cv.c.n < 0 ? `(${rx(cv)})` : rx(cv)} = ${rx(pos)}${pos.rad === 1 ? "" : ` ${eqa(posv, 2)}`} cm: ${side}.`,
            ],
            ...rounded(posv, 2, " cm"), vals: { th: fv(th), v: rxV(cv), pos: rxV(pos), posv, ...st.vals }, params: { A, T, tt, deg },
          };
        }
      },
    },

    // ---- F.12 Tangent ------------------------------------------------------------------------------------------
    "F.12": {
      title: "The tangent function",
      generate(r, level) {
        if (level === 1) return evalTrig(r, "tan");
        if (level === 2) {
          const B = r.pick([[2, 1], [3, 1], [4, 1], [1, 2], [1, 3], [3, 2]]), arg = argB(B[0], B[1]);
          if (r.chance(0.5)) {
            const ans = F(B[1], 2 * B[0]);
            return {
              prompt: `Find the first vertical asymptote of ${M.eq(`${y} = tan(${arg})`)} to the right of ${x} = 0.`,
              steps: [
                `tan ${V("u")} = ${M.frac(`sin ${V("u")}`, `cos ${V("u")}`)} has a vertical asymptote wherever cos ${V("u")} = 0; the first one right of 0 is ${V("u")} = ${piq(F(1, 2))}.`,
                `${arg} = ${piq(F(1, 2))}, so ${x} = ${piq(ans)}.`,
              ],
              answer: { kind: "number", value: ans.value * Math.PI }, answerText: `${x} = ${piq(ans)}`, answerInput: piTyped(ans),
              vals: { ans: fv(ans) }, params: { Bn: B[0], Bd: B[1], ask: 0 },
            };
          }
          const ans = F(B[1], B[0]);
          return {
            prompt: `Find the period of ${M.eq(`${y} = tan(${arg})`)}`,
            steps: [
              `tan ${V("u")} repeats every π (half the period of sine and cosine).`,
              `${arg} grows by π when ${x} grows by ${piq(ans)}, so the period is ${piq(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value * Math.PI }, answerText: piq(ans), answerInput: piTyped(ans),
            vals: { ans: fv(ans) }, params: { Bn: B[0], Bd: B[1], ask: 1 },
          };
        }
        for (;;) {
          const d = r.pick([10, 12, 15, 20, 25, 30, 40, 50]), deg = r.pick([30, 45, 60]), eye = r.pick([1.5, 1.6, 1.7, 1.8]);
          const obj = r.pick(["tree", "flagpole", "building"]);
          const tv = trig("tan", deg), top = rxMul(tv, d), topv = rxv(top), h = eye + topv;
          if (!agrees(h, eye + rd(topv, 4), 2)) continue;
          return {
            prompt: `You stand ${n(d)} m from the base of a ${obj} on level ground. Your eyes are ${fmt(eye)} m above the ground, and the angle of elevation to the top is ${n(deg)}°. How tall is the ${obj}, in meters? Round to 2 decimal places.`,
            steps: [
              `In the right triangle from your eye to the top, tan θ = ${M.frac("opposite", "adjacent")}, so the height above eye level is ${n(d)} · tan ${n(deg)}°.`,
              `tan ${n(deg)}° = ${rx(tv)}, so ${n(d)} · ${rx(tv)} = ${rx(top)}${top.rad === 1 ? "" : ` ${eqa(topv, 4)}`} m.`,
              `Add your eye height: ${fmt(eye)} + ${fmt(topv, 4)} ${eqa(h, 2)} m.`,
            ],
            ...rounded(h, 2, " m"), vals: { tv: rxV(tv), top: rxV(top), topv, h }, params: { d, deg, eye },
          };
        }
      },
    },

    // ---- F.13 Arctangent -----------------------------------------------------------------------------------
    "F.13": {
      title: "The arctangent function",
      generate(r, level) {
        if (level === 1) {
          const deg = r.pick([-60, -45, -30, 0, 30, 45, 60]), v = trig("tan", deg), ang = F(deg, 180);
          const av = rxAbs(v), aang = ang.abs();
          const steps = [`arctan ${V("v")} is the angle in (−${piq(F(1, 2))}, ${piq(F(1, 2))}) whose tangent is ${V("v")}.`];
          if (deg >= 0) steps.push(`tan(${piq(ang)}) = ${rx(v)}, and ${piq(ang)} lies in that interval, so arctan(${rx(v)}) = ${piq(ang)}.`);
          else steps.push(`tan(${piq(aang)}) = ${rx(av)}. Arctangent is odd (arctan(−${V("v")}) = −arctan ${V("v")}), so arctan(${rx(v)}) = ${piq(ang)}.`);
          return {
            prompt: `Find the exact value of ${M.eq(`arctan(${rx(v)})`)}`,
            steps, answer: { kind: "number", value: ang.value * Math.PI }, answerText: piq(ang), answerInput: piTyped(ang),
            vals: { ang: fv(ang), aang: fv(aang), v: rxV(v), av: rxV(av) }, params: { deg },
          };
        }
        if (level === 2) {
          const A = r.int(1, 4), D = r.int(-3, 3), q = F(A, 2), up = D + q.value * Math.PI, lo = D - q.value * Math.PI;
          const hz = (s) => (D === 0 ? `${s < 0 ? "−" : ""}${piq(q)}` : `${n(D)} ${s < 0 ? "−" : "+"} ${piq(q)}`);
          const hzT = (s) => `${D} ${s < 0 ? "-" : "+"} ${q.n}pi/${q.d}`;
          return {
            prompt: `Find both horizontal asymptotes of ${M.eq(`${y} = ${A === 1 ? "" : `${n(A)} `}arctan ${x}${M.term(D, "")}`)}`,
            steps: [
              `As ${x} → +∞, arctan ${x} → ${piq(F(1, 2))}; as ${x} → −∞, arctan ${x} → −${piq(F(1, 2))}. It approaches these but never reaches them.`,
              `${A === 1 ? "" : `Multiply by ${n(A)}: ${n(A)} · ${piq(F(1, 2))} = ${piq(q)}. `}${D === 0 ? "No shift is added." : D > 0 ? `Then add ${n(D)}.` : `Then subtract ${n(-D)}.`}`,
              `The asymptotes are ${y} = ${hz(1)} ${eqa(up, 4)} and ${y} = ${hz(-1)} ${eqa(lo, 4)}.`,
            ],
            answer: { kind: "numbers", values: [up, lo] }, answerText: `${y} = ${hz(1)} and ${y} = ${hz(-1)}`, answerInput: `${hzT(1)}, ${hzT(-1)}`,
            vals: { q: fv(q), up, lo }, params: { A, D },
          };
        }
        for (;;) {
          const rise = r.pick([0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 0.9, 1.2]), run = r.pick([3, 4, 5, 6, 8, 10, 12]);
          const ratio = rise / run, rad = Math.atan(ratio), deg = (rad * 180) / Math.PI;
          if (!agrees(deg, (rd(rad, 6) * 180) / Math.PI, 2)) continue;
          return {
            prompt: `A ramp rises ${fmt(rise)} m over a horizontal run of ${n(run)} m. At what angle does it rise, in degrees? Round to 2 decimal places.`,
            steps: [
              `tan θ = ${M.frac("rise", "run")} = ${M.frac(fmt(rise), n(run))} ${eqa(ratio, 6)}.`,
              `θ = arctan(${fmt(ratio, 6)}) ${eqa(rad, 6)} radians.`,
              `In degrees: ${fmt(rad, 6)} × ${M.frac("180", "π")} ${eqa(deg, 2)}°.`,
            ],
            ...rounded(deg, 2, "°"), deg: true, vals: { ratio, rad, deg }, params: { rise, run }, consts: [180],
          };
        }
      },
    },

    // ---- F.14 Logistic sigmoid ---------------------------------------------------------------------------
    "F.14": {
      title: "The logistic sigmoid",
      generate(r, level) {
        const sig = (z) => `${M.frac("1", `1 + ${M.sup("e", `−${z}`)}`)}`;
        if (level === 1) {
          const k = r.int(1, 9), s = k === 1 ? 1 : r.pick([1, -1]);
          const xs = k === 1 ? "0" : `${s < 0 ? "−" : ""}ln ${n(k)}`;
          const ans = k === 1 ? F(1, 2) : s > 0 ? F(k, k + 1) : F(1, k + 1);
          const steps = k === 1
            ? [`${M.sup("e", "0")} = 1, so σ(0) = ${M.frac("1", "1 + 1")} = ${M.f(ans)}: the midpoint of the S.`]
            : s > 0
              ? [`${M.sup("e", `−ln ${n(k)}`)} = ${M.frac("1", n(k))}, because ${M.sup("e", `ln ${V("k")}`)} = ${V("k")}.`,
                `σ(ln ${n(k)}) = ${M.frac("1", `1 + ${M.frac("1", n(k))}`)}. Multiply the top and bottom by ${n(k)}: ${M.frac(n(k), `${n(k)} + 1`)} = ${M.f(ans)}.`]
              : [`${M.sup("e", `−(−ln ${n(k)})`)} = ${M.sup("e", `ln ${n(k)}`)} = ${n(k)}.`, `σ(−ln ${n(k)}) = ${M.frac("1", `1 + ${n(k)}`)} = ${M.f(ans)}.`];
          return {
            prompt: `Evaluate the sigmoid ${M.eq(`σ(${x}) = ${sig(x)}`)} at ${x} = ${xs}. Give an exact fraction.`,
            steps, ...exact(ans), vals: { k1: k + 1, ans: fv(ans) }, params: { k, s },
          };
        }
        if (level === 2) {
          for (;;) {
            const p = r.pick([F(1, 10), F(1, 5), F(1, 4), F(2, 5), F(3, 5), F(3, 4), F(4, 5), F(9, 10), F(19, 20)]);
            const inv = F(1).div(p), em = inv.sub(1), odds = p.div(F(1).sub(p)), xv = Math.log(odds.value);
            if (!agrees(xv, xv, 4)) continue;
            return {
              prompt: `For which ${x} is σ(${x}) = ${sig(x)} equal to ${fmt(p.value)}? Round to 4 decimal places.`,
              steps: [
                `${sig(x)} = ${fmt(p.value)}, so 1 + ${M.sup("e", `−${x}`)} = ${M.frac("1", fmt(p.value))} = ${M.f(inv)}.`,
                `${M.sup("e", `−${x}`)} = ${M.f(inv)} − 1 = ${M.f(em)}.`,
                `Take ln: −${x} = ln ${M.f(em)}, so ${x} = ln ${M.f(odds)} ${eqa(xv, 4)}. (This inverse of σ is the log-odds, or logit.)`,
              ],
              ...rounded(xv, 4), vals: { p: p.value, inv: fv(inv), em: fv(em), odds: fv(odds), xv }, params: { pn: p.n, pd: p.d }, consts: [4],
            };
          }
        }
        for (;;) {
          const b0t = -r.int(20, 60), b1t = r.pick([5, 6, 8, 10, 12, 15]), h = r.int(1, 8);
          const zt = b0t + b1t * h;
          if (zt === 0 || Math.abs(zt) > 30) continue;
          const b0 = b0t / 10, b1 = b1t / 10, b1h = (b1t * h) / 10, z = zt / 10, em = Math.exp(-z), p = 1 / (1 + em);
          if (!agrees(p, 1 / (1 + rd(em, 4)), 3)) continue;
          return {
            prompt: `A logistic-regression model predicts the probability that a student passes an exam after studying ${V("h")} hours: ${M.eq(`${V("p")} = σ(${fmt(b0)} + ${fmt(b1)}${V("h")}) = ${M.frac("1", `1 + ${M.sup("e", `−(${fmt(b0)} + ${fmt(b1)}${V("h")})`)}`)}`)} What does it predict for a student who studies ${n(h)} hours? Round to 3 decimal places.`,
            steps: [
              `The input: ${V("z")} = ${fmt(b0)} + ${fmt(b1)} · ${n(h)} = ${fmt(b0)} + ${fmt(b1h)} = ${fmt(z)}.`,
              `${M.sup("e", `−${V("z")}`)} = ${M.sup("e", fmt(-z))} ${eqa(em, 4)}.`,
              `${V("p")} = ${M.frac("1", `1 + ${fmt(em, 4)}`)} ${eqa(p, 3)}.`,
            ],
            ...rounded(p, 3), vals: { b0, b1, b1h, z, nz: -z, em, p }, params: { b0t, b1t, h }, consts: [3],
          };
        }
      },
    },

    // ---- F.15 Hyperbolic tangent -------------------------------------------------------------------------
    "F.15": {
      title: "The hyperbolic tangent",
      generate(r, level) {
        const tdef = M.frac(`${M.sup("e", x)} − ${M.sup("e", `−${x}`)}`, `${M.sup("e", x)} + ${M.sup("e", `−${x}`)}`);
        if (level === 1) {
          const k = r.int(2, 5), s = r.pick([1, -1]), kk = k * k, num = kk - 1, den = kk + 1, pos = F(num, den), ans = pos.mul(s);
          const steps = [
            `${M.sup("e", `ln ${n(k)}`)} = ${n(k)} and ${M.sup("e", `−ln ${n(k)}`)} = ${M.frac("1", n(k))}.`,
            `tanh(ln ${n(k)}) = ${M.frac(`${n(k)} − ${M.frac("1", n(k))}`, `${n(k)} + ${M.frac("1", n(k))}`)}. Multiply the top and bottom by ${n(k)}: ${M.frac(`${n(kk)} − 1`, `${n(kk)} + 1`)} = ${M.frac(n(num), n(den))}${pos.d !== den ? ` = ${M.f(pos)}` : ""}.`,
          ];
          if (s < 0) steps.push(`tanh is odd, so tanh(−ln ${n(k)}) = −tanh(ln ${n(k)}) = ${M.f(ans)}.`);
          return {
            prompt: `Find the exact value of ${M.eq(`tanh(${s < 0 ? "−" : ""}ln ${n(k)})`)} using ${M.eq(`tanh ${x} = ${tdef}`)}`,
            steps, ...exact(ans), vals: { kk, num, den, pos: fv(pos), ans: fv(ans) }, params: { k, s },
          };
        }
        if (level === 2) {
          for (;;) {
            const v = r.pick([F(3, 5), F(4, 5), F(1, 2), F(1, 5), F(1, 4), F(3, 4), F(9, 10), F(-3, 5), F(-4, 5), F(-1, 2)]);
            const onep = F(1).add(v), onem = F(1).sub(v), u = onep.div(onem), L = Math.log(u.value), xv = L / 2;
            if (!agrees(xv, rd(L, 6) / 2, 4)) continue;
            return {
              prompt: `Solve ${M.eq(`tanh ${x} = ${fmt(v.value)}`)} Round to 4 decimal places.`,
              steps: [
                `Multiply the top and bottom of tanh ${x} = ${tdef} by ${M.sup("e", x)}: tanh ${x} = ${M.frac(`${V("u")} − 1`, `${V("u")} + 1`)} with ${V("u")} = ${M.sup("e", `2${x}`)}.`,
                `${M.frac(`${V("u")} − 1`, `${V("u")} + 1`)} = ${fmt(v.value)} gives ${V("u")} − 1 = ${fmt(v.value)}(${V("u")} + 1), so ${V("u")} = ${M.frac(`1 + ${np(v.value)}`, `1 − ${np(v.value)}`)} = ${M.frac(fmt(onep.value), fmt(onem.value))} = ${M.f(u)}.`,
                `2${x} = ln ${M.f(u)} ${eqa(L, 6)}, so ${x} ${eqa(xv, 4)}.`,
              ],
              ...rounded(xv, 4), vals: { v: v.value, onep: onep.value, onem: onem.value, u: fv(u), L, xv }, params: { vn: v.n, vd: v.d }, consts: [4],
            };
          }
        }
        const ph = r.chance(0.5) ? r.int(55, 95) : r.int(5, 45), neg = r.chance(0.5);
        const p = ph / 100, tp = ph / 50, t = (2 * ph - 100) / 100, ans = neg ? -t : t;
        const steps = [
          `Why it holds: 2σ(2${x}) − 1 = ${M.frac("2", `1 + ${M.sup("e", `−2${x}`)}`)} − 1 = ${M.frac(`1 − ${M.sup("e", `−2${x}`)}`, `1 + ${M.sup("e", `−2${x}`)}`)}; multiplying the top and bottom by ${M.sup("e", x)} gives ${tdef} = tanh ${x}.`,
          `So tanh ${V("a")} = 2 · ${fmt(p)} − 1 = ${fmt(tp)} − 1 = ${fmt(t)}.`,
        ];
        if (neg) steps.push(`tanh is odd, so tanh(−${V("a")}) = −tanh ${V("a")} = ${fmt(ans)}.`);
        return {
          prompt: `The identity ${M.eq(`tanh ${x} = 2σ(2${x}) − 1`)} links two common activation functions (σ is the logistic sigmoid). A network computes σ(2${V("a")}) = ${fmt(p)} for some input ${V("a")}. Find tanh(${neg ? "−" : ""}${V("a")}).`,
          steps, ...exactDec(ans), vals: { p, tp, t, ans }, params: { ph, neg: neg ? 1 : 0 },
        };
      },
    },

    // ---- F.16 ReLU ----------------------------------------------------------------------------------------------
    "F.16": {
      title: "The ReLU function",
      generate(r, level) {
        const relu = (inner) => `ReLU(${inner})`;
        if (level === 1) {
          for (;;) {
            const us = r.sample([-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
            if (!us.some((u) => u < 0) || !us.some((u) => u > 0)) continue;
            const rel = us.map((u) => Math.max(0, u)), sum = rel.reduce((a, b) => a + b, 0);
            return {
              prompt: `Evaluate ${M.eq(us.map((u) => relu(n(u))).join(" + "))} where ReLU(${x}) = max(0, ${x}).`,
              steps: [
                ...us.map((u, i) => `${relu(n(u))} = max(0, ${n(u)}) = ${n(rel[i])}${u < 0 ? ": a negative input is cut to 0" : u === 0 ? "" : ": a positive input passes through"}.`),
                `Sum: ${rel.map((v) => n(v)).join(" + ")} = ${n(sum)}.`,
              ],
              ...exact(sum), vals: { rel, sum }, params: { us },
            };
          }
        }
        if (level === 2) {
          const wantNeg = r.chance(0.4);
          for (;;) {
            const w1 = r.nonzero(-3, 3), w2 = r.nonzero(-3, 3), x1 = r.nonzero(-4, 4), x2 = r.nonzero(-4, 4), b = r.int(-5, 5);
            const p1 = w1 * x1, p2 = w2 * x2, z = p1 + p2 + b, out = Math.max(0, z);
            if (z === 0 || (z < 0) !== wantNeg) continue;
            return {
              prompt: `A neuron with weights ${M.sub(V("w"), "1")} = ${n(w1)}, ${M.sub(V("w"), "2")} = ${n(w2)} and bias ${V("b")} = ${n(b)} uses a ReLU activation: output = ReLU(${M.sub(V("w"), "1")}${M.sub(x, "1")} + ${M.sub(V("w"), "2")}${M.sub(x, "2")} + ${V("b")}). Find its output for the input (${M.sub(x, "1")}, ${M.sub(x, "2")}) = (${n(x1)}, ${n(x2)}).`,
              steps: [
                `Weighted sum: ${V("z")} = ${n(w1)} · ${np(x1)} + ${np(w2)} · ${np(x2)} + ${np(b)} = ${n(p1)} + ${np(p2)} + ${np(b)} = ${n(z)}.`,
                `ReLU(${n(z)}) = max(0, ${n(z)}) = ${n(out)}${z < 0 ? ": the neuron is inactive for this input" : ""}.`,
              ],
              ...exact(out), vals: { p1, p2, z, out }, params: { w1, w2, x1, x2, b },
            };
          }
        }
        for (;;) {
          const a = r.int(-4, 3), b = r.int(a + 1, Math.min(a + 4, 4));
          const truth = [-1, a, b];
          const pool = [[-1, b, a], [1, a, b], [-1, -b, -a], [-1, a, b + 1], [-1, a - 1, b]];
          const items = [truth, ...distract(r, truth, pool)];
          if (items.length < 4) continue;
          const rl = (p) => relu(p === 0 ? x : M.poly([1, -p]));
          const render = ([s, p, q]) => `${V("f")}(${x}) = ${rl(p)} ${s < 0 ? "−" : "+"} ${rl(q)}`;
          const ch = choose(r, items, render);
          const R = (p) => `((x-(${p}))+abs(x-(${p})))/2`;
          return {
            prompt: `Which function has this graph? (ReLU(${x}) = max(0, ${x}).)`,
            graph: graph({ view: [-6, 6, -6, 6], items: [{ t: "fn", e: `${R(a)} - ${R(b)}` }, { t: "pt", x: a, y: 0 }, { t: "pt", x: b, y: b - a }] }),
            steps: [
              `Left of ${x} = ${n(a)} the graph is flat at 0; at ${x} = ${n(a)} it starts to climb with slope 1. That is ${rl(a)}, which switches on at ${x} = ${n(a)}.`,
              `At ${x} = ${n(b)} it levels off at height ${n(b)} − ${np(a)} = ${n(b - a)}: subtracting ${rl(b)} cancels the slope from ${x} = ${n(b)} on.`,
              `So ${render(truth)}.`,
            ],
            ...ch.out, vals: { hgt: b - a }, params: { a, b, opts: ch.opts },
          };
        }
      },
    },

    // ---- F.17 Gaussian ---------------------------------------------------------------------------------------
    "F.17": {
      title: "The Gaussian bell curve",
      generate(r, level) {
        if (level === 1) {
          const A = r.int(1, 6), mu = r.nonzero(-5, 5);
          return {
            prompt: `Find the highest point of the graph of ${M.eq(`${y} = ${A === 1 ? "" : n(A)}${M.sup("e", `−${M.sup(sh(mu), 2)}`)}`)}`,
            steps: [
              `${M.sup(sh(mu), 2)} ≥ 0, and it is 0 only at ${x} = ${n(mu)}. So the exponent −${M.sup(sh(mu), 2)} is at most 0, largest at ${x} = ${n(mu)}.`,
              `There ${M.sup("e", "0")} = 1, so ${y} = ${A === 1 ? "1" : `${n(A)} · 1 = ${n(A)}`}. Everywhere else ${y} is smaller.`,
              `The peak is (${n(mu)}, ${n(A)}).`,
            ],
            answer: { kind: "point", value: [mu, A] }, answerText: `(${n(mu)}, ${n(A)})`, answerInput: `(${mu}, ${A})`, vals: {}, params: { A, mu },
          };
        }
        if (level === 2) {
          for (;;) {
            const mu = r.int(-3, 3), c = r.pick([1, 2, 4, 8]), d = r.pick([-3, -2, -1, 1, 2, 3]), x0 = mu + d;
            const ex = F(-d * d, c), yv = Math.exp(ex.value);
            if (!agrees(yv, yv, 4)) continue;
            const expo = c === 1 ? `−${M.sup(sh(mu), 2)}` : `−${M.sup(sh(mu), 2)}/${n(c)}`;
            return {
              prompt: `Evaluate ${M.eq(`${y} = ${M.sup("e", expo)}`)} at ${x} = ${n(x0)}. Round to 4 decimal places.`,
              steps: [
                `${n(x0)} − ${np(mu)} = ${n(d)}, and ${pw(d, 2)} = ${n(d * d)}.`,
                c === 1 ? `The exponent is ${M.f(ex)}.` : `The exponent is −${M.frac(n(d * d), n(c))} = ${M.f(ex)}.`,
                `${M.sup("e", M.f(ex))} ${eqa(yv, 4)}.`,
              ],
              ...rounded(yv, 4), vals: { x0, d, dd: d * d, ex: fv(ex), yv }, params: { mu, c, x0 }, consts: [4],
            };
          }
        }
        for (;;) {
          const s = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5]), ss2 = 2 * s * s, x2 = ss2 * Math.LN2, xh = Math.sqrt(x2), W = 2 * xh, kc = 2 * Math.sqrt(2 * Math.LN2);
          if (!agrees(W, 2 * rd(xh, 4), 2)) continue;
          return {
            prompt: `How wide is the bell curve ${M.eq(`${y} = ${M.sup("e", `−${M.frac(M.sup(x, 2), `2 · ${M.sup(fmt(s), 2)}`)}`)}`)} at half its maximum height (the full width at half maximum)? Round to 2 decimal places.`,
            graph: graph({ view: [-4 * s, 4 * s, -0.2, 1.2], items: [{ t: "fn", e: `exp(-x^2/(2*${s}^2))` }, { t: "hline", y: 0.5, dash: true, role: "muted" }] }),
            steps: [
              `The maximum is 1, at ${x} = 0. Half of it: ${M.sup("e", `−${M.frac(M.sup(x, 2), fmt(ss2))}`)} = ${M.frac("1", "2")}.`,
              `Take ln: ${M.frac(M.sup(x, 2), fmt(ss2))} = ln 2, so ${M.sup(x, 2)} = ${fmt(ss2)} ln 2 ${eqa(x2, 4)}.`,
              `${x} = ±${M.sqrt(fmt(x2, 4))} ${eqa(xh, 4).replace(/^([=≈]) /, "$1 ±")}.`,
              `The width is 2 × ${fmt(xh, 4)} ${eqa(W, 2)}. (In general it is 2${M.sqrt("2 ln 2")} · ${V("s")} ${eqa(kc, 4)}${V("s")}.)`,
            ],
            ...rounded(W, 2), vals: { ss2, x2, xh, W, kc }, params: { s },
          };
        }
      },
    },

    // ---- F.18 Floor ---------------------------------------------------------------------------------------------
    "F.18": {
      title: "The floor function",
      generate(r, level) {
        const fl = (s) => `⌊${s}⌋`;
        const tenth = () => { let A; do A = r.int(11, 99); while (A % 10 === 0); return A; };
        if (level === 1) {
          const A = tenth(), B = tenth(), a = A / 10, b = B / 10, fa = Math.floor(a), fb = Math.floor(b), ans = fa + fb;
          return {
            prompt: `Evaluate ${M.eq(`${fl(fmt(a))} + ${fl(fmt(b))}`)} where ⌊${x}⌋ is the greatest integer less than or equal to ${x}.`,
            steps: [
              `${fmt(a)} lies between ${n(fa)} and ${n(fa + 1)}, so ${fl(fmt(a))} = ${n(fa)}.`,
              `${fmt(b)} lies between ${n(fb)} and ${n(fb + 1)}, so ${fl(fmt(b))} = ${n(fb)}.`,
              `${n(fa)} + ${n(fb)} = ${n(ans)}.`,
            ],
            ...exact(ans), vals: { fa, fa1: fa + 1, fb, fb1: fb + 1, ans }, params: { a, b },
          };
        }
        if (level === 2) {
          for (;;) {
            const A = tenth(), a = A / 10, q = r.int(2, 7), p = r.int(q + 1, 5 * q);
            if (p % q === 0) continue;
            const fneg = Math.floor(-a), w = Math.floor(p / q), rem = p - w * q, ans = fneg + w;
            return {
              prompt: `Evaluate ${M.eq(`${fl(`−${fmt(a)}`)} + ${fl(M.frac(n(p), n(q)))}`)}`,
              steps: [
                `−${fmt(a)} lies between ${n(fneg)} and ${n(fneg + 1)}. The floor rounds down, toward −∞, so ${fl(`−${fmt(a)}`)} = ${n(fneg)} (not ${n(fneg + 1)}).`,
                `${n(p)} = ${n(w)} · ${n(q)} + ${n(rem)}, so ${M.frac(n(p), n(q))} = ${n(w)}${M.frac(n(rem), n(q))} and ${fl(M.frac(n(p), n(q)))} = ${n(w)}.`,
                `${n(fneg)} + ${n(w)} = ${n(ans)}.`,
              ],
              ...exact(ans), vals: { fneg, fneg1: fneg + 1, w, rem, ans }, params: { a, p, q },
            };
          }
        }
        for (;;) {
          const h1 = r.int(7, 9), m1 = r.int(0, 59), T = r.int(90, 300), rate = r.pick([4, 5, 6, 7, 8]);
          if (T % 15 === 0) continue;
          const t1 = h1 * 60 + m1, t2 = t1 + T, h2 = Math.floor(t2 / 60), m2 = t2 % 60, nb = Math.floor(T / 15), rem = T - 15 * nb, pay = nb * rate;
          const clock = (h, m) => `${h}:${String(m).padStart(2, "0")}`;
          return {
            prompt: `A temp agency pays $${n(rate)} for each completed 15-minute block of work; a partial block pays nothing. A worker clocks in at ${clock(h1, m1)} and out at ${clock(h2, m2)} (24-hour clock). How much does the shift pay, in dollars?`,
            steps: [
              `Minutes worked: (${n(h2)} · 60 + ${n(m2)}) − (${n(h1)} · 60 + ${n(m1)}) = ${n(t2)} − ${n(t1)} = ${n(T)}.`,
              `Completed blocks: ${fl(M.frac(n(T), "15"))}. Since ${n(T)} = 15 · ${n(nb)} + ${n(rem)}, that is ${n(nb)}.`,
              `Pay: ${n(nb)} × $${n(rate)} = $${n(pay)}.`,
            ],
            answer: { kind: "number", value: pay }, answerText: `$${n(pay)}`, answerInput: String(pay),
            vals: { t1, t2, T, nb, rem, pay }, params: { h1, m1, h2, m2, rate }, consts: [15, 24, 60],
          };
        }
      },
    },

    // ---- F.19 Cube root --------------------------------------------------------------------------------------
    "F.19": {
      title: "The cube root function",
      generate(r, level) {
        const cr = (inner) => M.sqrt(inner, "3");
        const crx = (h) => cr(h === 0 ? x : M.poly([1, -h]));
        if (level === 1) {
          const s1 = r.nonzero(-6, 6), s2b = r.int(1, 6) * (s1 > 0 ? -1 : 1), N1 = s1 ** 3, N2 = s2b ** 3, ans = s1 + s2b;
          return {
            prompt: `Evaluate ${M.eq(`${cr(n(N1))} + ${cr(n(N2))}`)}`,
            steps: [
              `${pw(s1, 3)} = ${n(N1)}, so ${cr(n(N1))} = ${n(s1)}.`,
              `${pw(s2b, 3)} = ${n(N2)}, so ${cr(n(N2))} = ${n(s2b)}. (Unlike a square root, the cube root of a negative number is a real number.)`,
              `${n(s1)} + ${np(s2b)} = ${n(ans)}.`,
            ],
            ...exact(ans), vals: { s1, s2: s2b, ans }, params: { N1, N2 }, consts: [3],
          };
        }
        if (level === 2) {
          const a = r.pick([1, 2, 3, -1, -2]), h = r.int(-5, 5), k = r.int(-6, 6), s = r.nonzero(-4, 4), x0 = h + s ** 3;
          const as = a * s, ans = as + k;
          return {
            prompt: `For ${M.eq(`${V("f")}(${x}) = ${co(a)}${crx(h)}${M.term(k, "")}`)} find ${V("f")}(${n(x0)}).`,
            steps: [
              `Inside the root: ${n(x0)} − ${np(h)} = ${n(s ** 3)}, and ${cr(n(s ** 3))} = ${n(s)} because ${pw(s, 3)} = ${n(s ** 3)}.`,
              `${V("f")}(${n(x0)}) = ${a === 1 ? n(s) : `${n(a)} · ${np(s)}`}${M.term(k, "")}${k === 0 && a === 1 ? "" : ` = ${n(ans)}`}.`,
            ],
            ...exact(ans), vals: { x0, s3: s ** 3, s, as, ans }, params: { a, h, k, x0 }, consts: [3],
          };
        }
        const a = r.pick([1, 2, 3, -1, -2]), s = r.nonzero(-3, 3), h = r.int(-4, 4), k = r.int(-4, 4);
        const c = a * s + k, ck = c - k, x0 = h + s ** 3;
        return {
          prompt: `Solve ${M.eq(`${co(a)}${crx(h)}${M.term(k, "")} = ${n(c)}`)} The graph shows the left side and the line ${y} = ${n(c)}.`,
          graph: graph({ view: [h - 30, h + 30, -10, 10], items: [{ t: "fn", e: `${a}*cbrt(x - (${h})) + (${k})` }, { t: "hline", y: c, dash: true, role: "secondary" }] }),
          steps: [
            k === 0 ? `The root is already alone: ${co(a)}${crx(h)} = ${n(ck)}.` : `Isolate the root: ${co(a)}${crx(h)} = ${n(c)} − ${np(k)} = ${n(ck)}.`,
            a === 1 ? `So ${crx(h)} = ${n(s)}.` : `Divide by ${n(a)}: ${crx(h)} = ${n(s)}.${s < 0 ? " A negative value is fine for a cube root." : ""}`,
            h === 0 ? `Cube both sides: ${x} = ${pw(s, 3)} = ${n(s ** 3)}.` : `Cube both sides: ${M.poly([1, -h])} = ${pw(s, 3)} = ${n(s ** 3)}, so ${x} = ${n(s ** 3)}${M.term(h, "")} = ${n(x0)}.`,
          ],
          ...exact(x0), vals: { ck, s, s3: s ** 3, x0 }, params: { a, h, k, c }, consts: [3],
        };
      },
    },

    // ---- F.20 Even vs. odd powers ------------------------------------------------------------------------------
    "F.20": {
      title: "Even and odd powers",
      generate(r, level) {
        const xp = (e) => (e === 0 ? "" : e === 1 ? x : M.sup(x, e));
        const polyT = (terms) => terms.map(([c, e], i) => M.term(c, xp(e), { first: i === 0 })).join("");
        if (level === 1) {
          const nn = r.int(2, 7), a = r.nonzero(-4, 4), m = r.int(0, nn - 1), b = r.nonzero(-5, 5);
          const index = nn % 2 === 0 ? (a > 0 ? 2 : 3) : a > 0 ? 0 : 1;
          const even = nn % 2 === 0;
          return {
            prompt: `Describe the end behavior of the graph of ${M.eq(`${y} = ${polyT([[a, nn], [b, m]])}`)}`,
            steps: [
              `For large |${x}| the leading term ${co(a)}${xp(nn)} outgrows the other term, so it decides the ends.`,
              even ? `The power ${n(nn)} is even, so ${xp(nn)} → +∞ as ${x} → +∞ and as ${x} → −∞: both ends point the same way.`
                : `The power ${n(nn)} is odd, so ${xp(nn)} has the sign of ${x}: → +∞ on the right, → −∞ on the left. The ends point opposite ways.`,
              `The coefficient ${n(a)} is ${a > 0 ? "positive, so it keeps those directions" : "negative, so it flips them"}: the graph ${END[index]}.`,
            ],
            answer: { kind: "choice", options: END, index }, answerText: END[index], vals: {}, params: { nn, a, m, b },
          };
        }
        if (level === 2) {
          for (;;) {
            const kind = r.int(0, 2), a = r.nonzero(-5, 5), b = r.nonzero(-6, 6);
            let m, k;
            if (kind === 0) { m = r.pick([2, 4, 6]); k = r.pick([0, 2, 4].filter((e) => e < m)); }
            else if (kind === 1) { m = r.pick([3, 5, 7]); k = r.pick([1, 3, 5].filter((e) => e < m)); }
            else { m = r.int(2, 7); k = r.int(0, m - 1); if ((m - k) % 2 === 0) continue; }
            const sm = m % 2 === 0 ? 1 : -1, sk = k % 2 === 0 ? 1 : -1;
            const opts = ["even", "odd", "neither"], index = kind;
            const fx = polyT([[a, m], [b, k]]), fmx = polyT([[a * sm, m], [b * sk, k]]);
            const neg = (e) => (e === 1 ? `(−${x})` : M.sup(`(−${x})`, e));
            return {
              prompt: `Is ${M.eq(`${V("f")}(${x}) = ${fx}`)} even, odd, or neither?`,
              steps: [
                `Replace ${x} by −${x}. An even power hides the sign, an odd power keeps it: ${neg(m)} = ${sm < 0 ? "−" : ""}${xp(m)}${k === 0 ? " (the constant does not change)" : `, ${neg(k)} = ${sk < 0 ? "−" : ""}${xp(k)}`}.`,
                `${V("f")}(−${x}) = ${fmx}.`,
                kind === 0 ? `That is ${V("f")}(${x}) again, so ${V("f")} is even (its graph is symmetric about the ${y}-axis).`
                  : kind === 1 ? `That is −${V("f")}(${x}), so ${V("f")} is odd (its graph is symmetric about the origin).`
                    : `That is neither ${V("f")}(${x}) nor −${V("f")}(${x}) (one term changed sign and the other did not), so ${V("f")} is neither.`,
              ],
              answer: { kind: "choice", options: opts, index }, answerText: opts[index], vals: { asm: a * sm, bsk: b * sk }, params: { a, b, m, k },
            };
          }
        }
        const a = r.pick([F(1), F(-1), F(1, 2), F(-1, 2)]), nn = r.int(2, 5);
        const Y = a.mul(Math.pow(2, nn)), Yl = a.mul(Math.pow(-2, nn));
        const truth = [a.n, a.d, nn];
        const pool = [[a.n, a.d, nn + 1], [a.n, a.d, nn - 1], [-a.n, a.d, nn], [a.n, a.d, nn + 2]];
        const items = [truth, ...distract(r, truth, pool)];
        const render = ([an, ad, e]) => `${y} = ${co(F(an, ad))}${xp(e)}`;
        const ch = choose(r, items, render);
        const Ylim = Math.max(5, Math.abs(Y.value) * 1.25);
        const even = nn % 2 === 0, pow = Math.pow(2, nn);
        return {
          prompt: `Which equation does the graph have? The marked points are labeled with their coordinates.`,
          graph: graph({ view: [-2.5, 2.5, -Ylim, Ylim], items: [{ t: "fn", e: `${a.n}/${a.d}*x^${nn}` }, { t: "pt", x: 2, y: Y.value, label: `(2, ${fmt(Y.value)})` }, { t: "pt", x: -2, y: Yl.value, label: `(−2, ${fmt(Yl.value)})` }] }),
          steps: [
            `The two ends point ${even ? "the same way" : "opposite ways"}, so the power is ${even ? "even" : "odd"}; the right end goes ${a.n > 0 ? "up" : "down"}, so the coefficient is ${a.n > 0 ? "positive" : "negative"}.`,
            `At ${x} = 2 the curve is at ${fmt(Y.value)}: ${M.f(a)} · ${M.sup("2", V("n"))} = ${fmt(Y.value)}, so ${M.sup("2", V("n"))} = ${n(pow)} and ${V("n")} = ${n(nn)}.`,
            `So ${render(truth)}.`,
          ],
          ...ch.out, vals: { Y: Y.value, Yl: Yl.value, pow }, params: { an: a.n, ad: a.d, nn, opts: ch.opts },
        };
      },
    },

    // ---- F.21 Exponential family -----------------------------------------------------------------------------
    "F.21": {
      title: "Comparing exponential bases",
      generate(r, level) {
        if (level === 1) {
          const x0 = r.pick([-3, -2, -1, 1, 2, 3]), largest = r.chance(0.5);
          const vals4 = [F(2).pow(-x0), F(2).pow(x0), Math.exp(x0), F(10).pow(x0)];
          const names = [M.sup(`(${M.frac("1", "2")})`, x), M.sup("2", x), M.sup("e", x), M.sup("10", x)];
          const truthIdx = (x0 > 0) === largest ? 3 : 0;
          const ch = choose(r, [truthIdx, ...[0, 1, 2, 3].filter((i) => i !== truthIdx)], (i) => `${y} = ${names[i]}`);
          const show = (i) => (i === 2 ? `${M.sup("e", n(x0))} ${eqa(vals4[2], 4)}` : `${(i === 0 ? M.sup(`(${M.frac("1", "2")})`, n(x0)) : M.sup(i === 1 ? "2" : "10", n(x0)))} = ${M.f(vals4[i])}`);
          return {
            prompt: `At ${x} = ${n(x0)}, which of these functions has the ${largest ? "largest" : "smallest"} value?`,
            steps: [
              `Evaluate each: ${[0, 1, 2, 3].map(show).join("; ")}.`,
              x0 > 0 ? `For ${x} &gt; 0 a larger base gives a larger value, and a base below 1 gives a value below 1.` : `For ${x} &lt; 0 the order reverses: a larger base gives a smaller value, and the base below 1 gives the largest.`,
              `The ${largest ? "largest" : "smallest"} is ${y} = ${names[truthIdx]}.`,
            ],
            ...ch.out, vals: { v0: fv(vals4[0]), v1: fv(vals4[1]), v2: vals4[2], v3: fv(vals4[3]) }, params: { x0, largest: largest ? 1 : 0, opts: ch.opts }, consts: [10],
          };
        }
        if (level === 2) {
          for (;;) {
            const r0 = r.int(2, 5), q = r.pick([2, 3]), p = r.pick([-3, -2, -1, 1, 2, 3]);
            const b = Math.pow(r0, q);
            if (b > 125 || P.gcd(Math.abs(p), q) !== 1) continue;
            const ans = F(r0).pow(p);
            const ex = `${p < 0 ? "−" : ""}${Math.abs(p)}/${q}`;
            const root = M.sqrt(n(b), q === 2 ? "" : "3");
            return {
              prompt: `Evaluate ${M.eq(M.sup(n(b), ex))} exactly.`,
              steps: [
                p === 1 ? `The power 1/${q} is a ${q === 2 ? "square" : "cube"} root: ${M.sup(n(b), ex)} = ${root}.` : `A fractional power is a root and a power: ${M.sup(n(b), ex)} = ${M.sup(`(${root})`, n(p))}.`,
                `${root} = ${n(r0)}, because ${M.sup(n(r0), n(q))} = ${n(b)}.`,
                p === 1 ? `So ${M.sup(n(b), ex)} = ${n(r0)}.` : p > 0 ? `${M.sup(n(r0), n(p))} = ${M.f(ans)}.` : `${M.sup(n(r0), n(p))} = ${M.frac("1", M.sup(n(r0), n(-p)))} = ${M.f(ans)}.`,
              ],
              ...exact(ans), vals: { r0, ans: fv(ans) }, params: { b, p, q },
            };
          }
        }
        for (;;) {
          const g = r.pick([2, 3, 5]), u = g === 2 ? r.int(2, 4) : g === 3 ? r.int(2, 3) : 2, v = r.nonzero(-6, 6);
          if (Math.pow(g, Math.abs(v)) > 729 || v % u === 0) continue;
          const b = Math.pow(g, u), cq = F(g).pow(v), xs = F(v, u);
          return {
            prompt: `Solve ${M.eq(`${M.sup(n(b), x)} = ${M.f(cq)}`)} exactly.`,
            steps: [
              `Write both sides as powers of ${n(g)}: ${n(b)} = ${M.sup(n(g), n(u))} and ${M.f(cq)} = ${M.sup(n(g), n(v))}.`,
              `${M.sup(`(${M.sup(n(g), n(u))})`, x)} = ${M.sup(n(g), `${n(u)}${x}`)}, so ${M.sup(n(g), `${n(u)}${x}`)} = ${M.sup(n(g), n(v))}.`,
              `Equal powers of the same base have equal exponents: ${n(u)}${x} = ${n(v)}, so ${x} = ${M.f(xs)}.`,
            ],
            ...exact(xs), vals: { g, u, v, cq: fv(cq), xs: fv(xs) }, params: { b, cn: cq.n, cd: cq.d },
          };
        }
      },
    },

    // ---- F.22 Logarithm bases -----------------------------------------------------------------------------
    "F.22": {
      title: "Logarithms in different bases",
      generate(r, level) {
        const lg = (b) => M.sub("log", n(b));
        if (level === 1) {
          for (;;) {
            const b = r.pick([2, 3, 5, 10]), k = r.int(-3, 4);
            if (Math.pow(b, Math.abs(k)) > 1000) continue;
            const c = F(b).pow(k);
            return {
              prompt: `Evaluate ${M.eq(`${lg(b)} ${M.f(c)}`)}`,
              steps: [
                `${lg(b)} ${M.f(c)} asks: ${n(b)} to what power gives ${M.f(c)}?`,
                k === 0 ? `${M.sup(n(b), "0")} = 1, so the answer is 0.` : k > 0 ? `${M.sup(n(b), n(k))} = ${M.f(c)}, so the answer is ${n(k)}.`
                  : `${M.f(c)} = ${M.frac("1", M.sup(n(b), n(-k)))} = ${M.sup(n(b), n(k))}, so the answer is ${n(k)}.`,
              ],
              ...exact(k), vals: { c: fv(c) }, params: { b, k },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const b = r.pick([2, 3, 5, 7]), xv = r.int(3, 60);
            const k = Math.floor(Math.log(xv) / Math.log(b) + 1e-12);
            if (Math.pow(b, k) === xv) continue;
            const lx = Math.log(xv), lb = Math.log(b), ans = lx / lb;
            if (!agrees(ans, rd(lx, 6) / rd(lb, 6), 4)) continue;
            return {
              prompt: `Evaluate ${M.eq(`${lg(b)} ${n(xv)}`)} Round to 4 decimal places.`,
              steps: [
                `Change of base: ${lg(b)} ${n(xv)} = ${M.frac(`ln ${n(xv)}`, `ln ${n(b)}`)}.`,
                `ln ${n(xv)} ${eqa(lx, 6)} and ln ${n(b)} ${eqa(lb, 6)}.`,
                `${M.frac(fmt(lx, 6), fmt(lb, 6))} ${eqa(ans, 4)}. Check: ${M.sup(n(b), n(k))} = ${n(Math.pow(b, k))} &lt; ${n(xv)} &lt; ${n(Math.pow(b, k + 1))} = ${M.sup(n(b), n(k + 1))}, so the answer lies between ${n(k)} and ${n(k + 1)}.`,
              ],
              ...rounded(ans, 4), vals: { lx, lb, ans, k, k1: k + 1, bk: Math.pow(b, k), bk1: Math.pow(b, k + 1) }, params: { b, xv }, consts: [4],
            };
          }
        }
        for (;;) {
          const m = r.pick([1.5, 2, 2.5, 3, 3.2, 4, 5, 6.3, 7, 8]), k = r.int(3, 9), L = Math.log10(m);
          if (r.chance(0.5)) {
            const pH = k - L;
            if (!agrees(pH, k - rd(L, 6), 2)) continue;
            return {
              prompt: `A solution has hydrogen-ion concentration [H⁺] = ${fmt(m)} × ${M.sup("10", `−${n(k)}`)} mol/L. Find its pH = −${lg(10)}[H⁺]. Round to 2 decimal places.`,
              steps: [
                `${lg(10)}(${fmt(m)} × ${M.sup("10", `−${n(k)}`)}) = ${lg(10)} ${fmt(m)} + ${lg(10)} ${M.sup("10", `−${n(k)}`)} = ${lg(10)} ${fmt(m)} − ${n(k)}.`,
                `${lg(10)} ${fmt(m)} ${eqa(L, 6)}.`,
                `pH = −(${fmt(L, 6)} − ${n(k)}) = ${n(k)} − ${fmt(L, 6)} ${eqa(pH, 2)}.`,
              ],
              ...rounded(pH, 2), vals: { L, pH }, params: { m, k, kind: 0 }, consts: [10],
            };
          }
          const e = 12 - k, dB = 10 * (L + e);
          if (!agrees(dB, 10 * (rd(L, 6) + e), 1)) continue;
          return {
            prompt: `A sound has intensity ${V("I")} = ${fmt(m)} × ${M.sup("10", `−${n(k)}`)} W/m². Its loudness is ${V("L")} = 10 ${lg(10)}(${V("I")}/${M.sub(V("I"), "0")}) decibels, with ${M.sub(V("I"), "0")} = ${M.sup("10", "−12")} W/m². Find ${V("L")}, rounded to 1 decimal place.`,
            steps: [
              `${M.frac(V("I"), M.sub(V("I"), "0"))} = ${M.frac(`${fmt(m)} × ${M.sup("10", `−${n(k)}`)}`, M.sup("10", "−12"))} = ${fmt(m)} × ${M.sup("10", n(e))}.`,
              `${lg(10)} ${fmt(m)} ${eqa(L, 6)}, so ${lg(10)}(${fmt(m)} × ${M.sup("10", n(e))}) = ${lg(10)} ${fmt(m)} + ${n(e)} ${eqa(L + e, 6)}.`,
              `${V("L")} = 10 × ${fmt(L + e, 6)} ${eqa(dB, 1)} dB.`,
            ],
            ...rounded(dB, 1, " dB"), vals: { e, L, Le: L + e, dB }, params: { m, k, kind: 1 }, consts: [10, 12],
          };
        }
      },
    },
    // ---- F.23 Sinusoid with phase shift ---------------------------------------------------------------------
    "F.23": {
      title: "Sinusoids: amplitude, period, shift, midline",
      generate(r, level) {
        if (level === 1) {
          const A = r.pick([1, 2, 3, 4, 5, -1, -2, -3]), B = r.pick([[1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [1, 3]]);
          const Cq = r.pick([F(1, 4), F(-1, 4), F(1, 3), F(-1, 3), F(1, 6), F(-1, 6), F(1, 2), F(-1, 2), F(1), F(-1)]), D = r.nonzero(-5, 5);
          const inner = `${x} ${Cq.n < 0 ? "+" : "−"} ${piq(Cq.abs())}`;
          const Bc = B[1] === 1 ? (B[0] === 1 ? "" : n(B[0])) : M.frac(n(B[0]), n(B[1]));
          const arg = B[0] === 1 && B[1] === 1 ? inner : `${Bc}(${inner})`;
          const Atxt = A === 1 ? "" : A === -1 ? "−" : `${n(A)} `;
          const eqn = `${y} = ${Atxt}sin(${arg})${M.term(D, "")}`;
          const form = `${y} = ${V("A")} sin(${V("B")}(${x} − ${V("C")})) + ${V("D")}`;
          const f = r.int(0, 3), absA = Math.abs(A), per = F(2 * B[1], B[0]);
          const what = ["the amplitude", "the period", `the phase shift ${V("C")}`, `the midline (the value ${V("D")} in ${y} = ${V("D")})`][f];
          let steps, out;
          if (f === 0) {
            steps = [`Compare with ${form}: ${V("A")} = ${n(A)}.`, `The amplitude is |${V("A")}| = |${n(A)}| = ${n(absA)}: the wave rises and falls ${n(absA)} from its midline${A < 0 ? " (the minus sign only flips it upside down)" : ""}.`];
            out = exact(absA);
          } else if (f === 1) {
            steps = [`Compare with ${form}: ${V("B")} = ${M.f(F(B[0], B[1]))}.`, `The period is ${M.frac("2π", `|${V("B")}|`)} = ${M.frac("2π", M.f(F(B[0], B[1])))} = ${piq(per)}.`];
            out = { answer: { kind: "number", value: per.value * Math.PI }, answerText: piq(per), answerInput: piTyped(per) };
          } else if (f === 2) {
            steps = [Cq.n < 0 ? `Write the inside as ${x} − ${V("C")}: ${inner} = ${x} − (${piq(Cq)}).` : `The inside is already of the form ${x} − ${V("C")}: ${inner}.`,
              `So ${V("C")} = ${piq(Cq)}: the graph of ${Atxt}sin(${B[0] === 1 && B[1] === 1 ? x : `${Bc}${x}`}) moved ${piq(Cq.abs())} to the ${Cq.n > 0 ? "right" : "left"}.`];
            out = { answer: { kind: "number", value: Cq.value * Math.PI }, answerText: piq(Cq), answerInput: piTyped(Cq) };
          } else {
            steps = [`Compare with ${form}: ${V("D")} = ${n(D)}.`, `The wave oscillates about its midline ${y} = ${n(D)}.`];
            out = exact(D);
          }
          return {
            prompt: `For ${M.eq(eqn)} find ${what}.`,
            steps, ...out, vals: { absA, per: fv(per), C: fv(Cq) }, params: { A, Bn: B[0], Bd: B[1], Cn: Cq.n, Cd: Cq.d, D, f },
          };
        }
        if (level === 2) {
          for (;;) {
            const A = r.int(1, 3), B = r.pick([[1, 1], [2, 1], [1, 2]]), D = r.nonzero(-4, 4);
            if (Math.abs(D) + A > 6) continue;
            const truth = [A, ...B, D];
            const pool = [[A, 2, 1, D], [A, 1, 1, D], [A, 1, 2, D], [A, ...B, -D], [-A, ...B, D], [A + 1, ...B, D]];
            if (D > 0 && D !== A) pool.push([D, ...B, A]);
            const items = [truth, ...distract(r, truth, pool)];
            const render = ([a, bn, bd, d]) => `${y} = ${wave(0, a, bn, bd)}${M.term(d, "")}`;
            const ch = choose(r, items, render);
            const Mx = D + A, mn = D - A, half = F(B[1], B[0]), per = F(2 * B[1], B[0]), qf = F(B[1], 2 * B[0]);
            const qx = qf.value * Math.PI;
            return {
              prompt: `Which equation does the graph have? The marked points are a peak and a trough.`,
              graph: graph({ view: [-7, 7, -7, 7], items: [{ t: "fn", e: `${A}*sin(${B[0]}/${B[1]}*x) + (${D})` }, { t: "pt", x: qx, y: Mx }, { t: "pt", x: -qx, y: mn }, ...piLabels(7, F(1, 2), -6.5)] }),
              steps: [
                `The highest value is ${n(Mx)} and the lowest is ${n(mn)}.`,
                `Midline: ${M.frac(`${n(Mx)} + ${np(mn)}`, "2")} = ${n(D)}. Amplitude: ${M.frac(`${n(Mx)} − ${np(mn)}`, "2")} = ${n(A)}.`,
                `The trough at ${x} = −${piq(qf)} and the peak at ${x} = ${piq(qf)} are half a period apart, ${piq(half)}, so the period is ${piq(per)} and ${V("B")} = 2π ÷ ${piq(per)} = ${M.f(F(B[0], B[1]))}.`,
                `At ${x} = 0 the graph crosses its midline going up, as a sine does: ${render(truth)}.`,
              ],
              ...ch.out, vals: { Mx, mn, half: fv(half), qx: fv(qf), per: fv(per) }, params: { A, Bn: B[0], Bd: B[1], D, opts: ch.opts },
            };
          }
        }
        for (;;) {
          const R = r.pick([10, 15, 20, 25, 30]), pl = r.int(1, 3), T = r.pick([8, 10, 12, 16, 20, 24, 30]), deg = r.pick(ANG.filter((d) => d > 0));
          if ((T * deg * 10) % 360 !== 0) continue;
          const H = R + pl, tt = (T * deg) / 360, th = F(deg, 180), cv = trig("cos", deg), prod = rxMul(cv, R), hv = H - rxv(prod);
          if (prod.rad !== 1 && !agrees(hv, hv, 2)) continue;
          const st = trigSteps("cos", deg);
          const hx = prod.rad === 1 ? fmt(F(H).sub(prod.c).value) : `${n(H)} ${prod.c.n > 0 ? "−" : "+"} ${rx(rxAbs(prod))}`;
          return {
            prompt: `A Ferris wheel ${n(2 * R)} m across turns once every ${n(T)} minutes, and its lowest seat passes ${n(pl)} m above the ground. A rider boards at the bottom at ${V("t")} = 0. How high is the rider after ${fmt(tt)} minutes? Round to 2 decimal places.`,
            steps: [
              `The radius is ${n(R)} m and the center is ${n(R)} + ${n(pl)} = ${n(H)} m up. Starting at the bottom: ${V("h")}(${V("t")}) = ${n(H)} − ${n(R)} cos${M.frac(`2π${V("t")}`, n(T))}, which gives ${n(pl)} at ${V("t")} = 0.`,
              `At ${V("t")} = ${fmt(tt)}: θ = ${M.frac(`2π · ${fmt(tt)}`, n(T))} = ${piq(th)}.`,
              ...st.steps,
              `${V("h")} = ${n(H)} − ${n(R)} · ${cv.c.n < 0 ? `(${rx(cv)})` : rx(cv)} = ${hx}${prod.rad === 1 ? "" : ` ${eqa(hv, 2)}`} m.`,
            ],
            ...rounded(hv, 2, " m"), vals: { D2: 2 * R, H, th: fv(th), v: rxV(cv), prod: rxV(prod), hv, ...st.vals }, params: { R, pl, T, tt, deg },
          };
        }
      },
    },

    // ---- F.24 Secant -----------------------------------------------------------------------------------------------
    "F.24": {
      title: "The secant function",
      generate(r, level) {
        if (level === 1) return evalTrig(r, "sec");
        if (level === 2) {
          const A = r.int(1, 5), D = r.int(-5, 5), lo = D - A, hi = D + A;
          return {
            prompt: `The range of ${M.eq(`${y} = ${A === 1 ? "" : `${n(A)} `}sec ${x}${M.term(D, "")}`)} is ${y} ≤ ${V("p")} or ${y} ≥ ${V("q")}. Find ${V("p")} and ${V("q")}.`,
            steps: [
              `|cos ${x}| ≤ 1, so |sec ${x}| = ${M.frac("1", `|cos ${x}|`)} ≥ 1: either sec ${x} ≤ −1 or sec ${x} ≥ 1.`,
              A === 1 ? `The coefficient is 1, so nothing is stretched.` : `Multiply by ${n(A)} (positive): ${n(A)} sec ${x} ≤ −${n(A)} or ${n(A)} sec ${x} ≥ ${n(A)}.`,
              `${D === 0 ? "No shift" : `Add ${n(D)}`}: ${y} ≤ ${n(lo)} or ${y} ≥ ${n(hi)}. The graph never enters the band between them.`,
            ],
            answer: { kind: "numbers", values: [lo, hi], ordered: true }, answerText: `${V("p")} = ${n(lo)}, ${V("q")} = ${n(hi)}`, answerInput: `${lo}, ${hi}`,
            vals: { lo, hi }, params: { A, D },
          };
        }
        return solveTrigProblem(r, "sec");
      },
    },

    // ---- F.25 Hyperbolic sine and cosine ----------------------------------------------------------------------
    "F.25": {
      title: "Hyperbolic sine and cosine",
      generate(r, level) {
        if (level === 1) {
          const k = r.int(2, 5), f = r.pick(["cosh", "sinh"]), s = r.pick([1, -1]);
          const kk = k * k, num = f === "cosh" ? kk + 1 : kk - 1, den = 2 * k, pos = F(num, den), ans = f === "sinh" ? pos.mul(s) : pos;
          const op = f === "cosh" ? "+" : "−";
          const steps = [
            `${M.sup("e", `ln ${n(k)}`)} = ${n(k)} and ${M.sup("e", `−ln ${n(k)}`)} = ${M.frac("1", n(k))}.`,
            `${f}(ln ${n(k)}) = ${M.frac(`${n(k)} ${op} ${M.frac("1", n(k))}`, "2")}. Multiply the top and bottom by ${n(k)}: ${M.frac(`${n(kk)} ${op} 1`, `2 · ${n(k)}`)} = ${M.frac(n(num), n(den))}${pos.d !== den ? ` = ${M.f(pos)}` : ""}.`,
          ];
          if (s < 0) steps.push(f === "cosh" ? `cosh is even, so cosh(−ln ${n(k)}) = cosh(ln ${n(k)}) = ${M.f(ans)}.` : `sinh is odd, so sinh(−ln ${n(k)}) = −sinh(ln ${n(k)}) = ${M.f(ans)}.`);
          const def = f === "cosh" ? `cosh ${x} = ${M.frac(`${M.sup("e", x)} + ${M.sup("e", `−${x}`)}`, "2")}` : `sinh ${x} = ${M.frac(`${M.sup("e", x)} − ${M.sup("e", `−${x}`)}`, "2")}`;
          return {
            prompt: `Find the exact value of ${M.eq(`${f}(${s < 0 ? "−" : ""}ln ${n(k)})`)} using ${M.eq(def)}`,
            steps, ...exact(ans), vals: { kk, num, den, pos: fv(pos), ans: fv(ans) }, params: { k, s, f: f === "cosh" ? 0 : 1 },
          };
        }
        if (level === 2) {
          const [p, q, rr] = r.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [7, 24, 25]]), s = r.pick([1, -1]);
          const sv = F(s * p, q), s2 = sv.mul(sv), c2 = s2.add(1), c = F(rr, q);
          return {
            prompt: `If ${M.eq(`sinh ${x} = ${M.f(sv)}`)} what is cosh ${x}?`,
            steps: [
              `The identity ${M.sup("cosh", "2")}${x} − ${M.sup("sinh", "2")}${x} = 1 gives ${M.sup("cosh", "2")}${x} = 1 + ${M.sup("sinh", "2")}${x} = 1 + ${pw(sv, 2)} = 1 + ${M.f(s2)} = ${M.f(c2)}.`,
              `cosh ${x} ≥ 1 for every ${x}, so take the positive root${s < 0 ? " (the sign of sinh does not matter)" : ""}: cosh ${x} = ${M.sqrt(M.f(c2))} = ${M.f(c)}.`,
            ],
            ...exact(c), vals: { s2: fv(s2), c2: fv(c2), c: fv(c) }, params: { sn: sv.n, sd: sv.d },
          };
        }
        for (;;) {
          const a = r.pick([10, 20, 25, 40, 50]), w = r.pick([10, 15, 20, 25, 30]), u = w / a;
          if (u < 0.2 || u > 1.5) continue;
          const ch = Math.cosh(u), sag = a * (ch - 1);
          if (!agrees(sag, a * (rd(ch, 6) - 1), 2)) continue;
          return {
            prompt: `A cable hangs between two poles ${n(2 * w)} m apart in the shape ${M.eq(`${y} = ${n(a)} cosh${M.frac(x, n(a))}`)} (meters, with ${x} measured from the midpoint). How far below the tops of the poles is the lowest point of the cable? Round to 2 decimal places.`,
            steps: [
              `The lowest point is at ${x} = 0: ${y} = ${n(a)} cosh 0 = ${n(a)}. The poles are at ${x} = ±${n(w)}, where ${y} = ${n(a)} cosh${M.frac(n(w), n(a))}.`,
              `${M.frac(n(w), n(a))} = ${fmt(u)}, and cosh ${fmt(u)} = ${M.frac(`${M.sup("e", fmt(u))} + ${M.sup("e", `−${fmt(u)}`)}`, "2")} ${eqa(ch, 6)}.`,
              `The sag is ${n(a)} · ${fmt(ch, 6)} − ${n(a)} = ${n(a)}(${fmt(ch, 6)} − 1) ${eqa(sag, 2)} m.`,
            ],
            ...rounded(sag, 2, " m"), vals: { w2: 2 * w, u, ch, sag }, params: { a, w },
          };
        }
      },
    },

    // ---- F.26 Softplus ---------------------------------------------------------------------------------------------
    "F.26": {
      title: "The softplus function",
      generate(r, level) {
        const def = `softplus(${x}) = ln(1 + ${M.sup("e", x)})`;
        if (level === 1) {
          for (;;) {
            const k = r.int(1, 9), xs = k === 1 ? "0" : `ln ${n(k)}`, ans = Math.log(1 + k);
            if (!agrees(ans, ans, 4)) continue;
            return {
              prompt: `Evaluate ${M.eq(def)} at ${x} = ${xs}. Round to 4 decimal places.`,
              steps: [
                k === 1 ? `${M.sup("e", "0")} = 1.` : `${M.sup("e", `ln ${n(k)}`)} = ${n(k)}.`,
                `softplus(${xs}) = ln(1 + ${n(k)}) = ln ${n(k + 1)} ${eqa(ans, 4)}.`,
              ],
              ...rounded(ans, 4), vals: { k1: k + 1, ans }, params: { k }, consts: [4],
            };
          }
        }
        if (level === 2) {
          const k = r.int(2, 9), s = r.pick([1, -1]), ans = s > 0 ? F(k, k + 1) : F(1, k + 1);
          return {
            prompt: `Find the slope of the graph of ${M.eq(def)} at ${x} = ${s < 0 ? "−" : ""}ln ${n(k)}. Give an exact fraction.`,
            steps: [
              `By the chain rule, ${M.frac("d", `d${x}`)} ln(1 + ${M.sup("e", x)}) = ${M.frac(M.sup("e", x), `1 + ${M.sup("e", x)}`)} = σ(${x}): softplus's derivative is the logistic sigmoid.`,
              `At this ${x}, ${M.sup("e", x)} = ${s > 0 ? n(k) : M.frac("1", n(k))}.`,
              s > 0 ? `Slope = ${M.frac(n(k), `1 + ${n(k)}`)} = ${M.f(ans)}.`
                : `Slope = ${M.frac(M.frac("1", n(k)), `1 + ${M.frac("1", n(k))}`)}; multiply the top and bottom by ${n(k)}: ${M.frac("1", `1 + ${n(k)}`)} = ${M.f(ans)}.`,
            ],
            ...exact(ans), vals: { k1: k + 1, ans: fv(ans) }, params: { k, s },
          };
        }
        for (;;) {
          const a = r.pick([-3, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 3]);
          const ea = Math.exp(a), sp = Math.log(1 + ea), relu = Math.max(0, a), gap = sp - relu;
          if (!agrees(gap, rd(sp, 6) - relu, 4)) continue;
          return {
            prompt: `Softplus, ${M.eq(def)} is a smooth version of ReLU(${x}) = max(0, ${x}). How far above ReLU is softplus at ${x} = ${fmt(a)}? Round to 4 decimal places.`,
            steps: [
              `${M.sup("e", fmt(a))} ${eqa(ea, 6)}, so softplus(${fmt(a)}) = ln(1 + ${fmt(ea, 6)}) ${eqa(sp, 6)}.`,
              `ReLU(${fmt(a)}) = max(0, ${fmt(a)}) = ${fmt(relu)}.`,
              `The gap is ${fmt(sp, 6)} − ${fmt(relu)} ${eqa(gap, 4)}. (It equals ln(1 + ${M.sup("e", `−|${x}|`)}): largest, ln 2, at ${x} = 0, and it shrinks fast either side.)`,
            ],
            ...rounded(gap, 4), vals: { ea, sp, relu, gap }, params: { a }, consts: [4],
          };
        }
      },
    },

    // ---- F.27 Heaviside step ---------------------------------------------------------------------------------------
    "F.27": {
      title: "The Heaviside step function",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const us = r.sample([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], 3);
            if (!us.some((u) => u < 0) || !us.some((u) => u >= 0)) continue;
            const hs = us.map((u) => (u >= 0 ? 1 : 0)), sum = hs.reduce((a, b) => a + b, 0);
            return {
              prompt: `With ${V("H")}(${x}) = 0 for ${x} &lt; 0 and ${V("H")}(${x}) = 1 for ${x} ≥ 0, evaluate ${M.eq(us.map((u) => `${V("H")}(${n(u)})`).join(" + "))}`,
              steps: [
                ...us.map((u, i) => `${V("H")}(${n(u)}) = ${n(hs[i])}, since ${n(u)} ${u >= 0 ? "≥" : "&lt;"} 0${u === 0 ? ` (the convention ${V("H")}(0) = 1 decides this one)` : ""}.`),
                `Sum: ${hs.map((v) => n(v)).join(" + ")} = ${n(sum)}.`,
              ],
              ...exact(sum), vals: { hs, sum }, params: { us },
            };
          }
        }
        if (level === 2) {
          const a = r.pick([500, 800, 1000, 1200]), b = r.pick([500, 1000, 1500]), c = r.int(2, 10), t0 = r.chance(0.2) ? c : r.int(0, 12);
          const d = t0 - c, Hd = d >= 0 ? 1 : 0, Pw = a + b * Hd;
          return {
            prompt: `A heater draws ${n(a)} W. At ${V("t")} = ${n(c)} minutes a second element switches on and adds ${n(b)} W, so its power is ${M.eq(`${V("P")}(${V("t")}) = ${n(a)} + ${n(b)}${V("H")}(${V("t")} − ${n(c)})`)} with ${V("H")}(0) = 1. Find the power at ${V("t")} = ${n(t0)} minutes, in watts.`,
            steps: [
              `${V("t")} − ${n(c)} = ${n(t0)} − ${n(c)} = ${n(d)}.`,
              `${V("H")}(${n(d)}) = ${n(Hd)}, since ${n(d)} ${d >= 0 ? "≥" : "&lt;"} 0: the second element is ${Hd ? "on" : "still off"}.`,
              `${V("P")} = ${n(a)} + ${n(b)} · ${n(Hd)} = ${n(Pw)} W.`,
            ],
            ...exact(Pw, " W"), vals: { d, Hd, Pw }, params: { a, b, c, t0 },
          };
        }
        for (;;) {
          const Vh = r.int(1, 3), p = r.int(-4, 3), q = r.int(p + 1, Math.min(p + 4, 4));
          const truth = [Vh, p, q];
          const pool = [[Vh, q, p], [Vh, p, q + 1], [Vh, p - 1, q], [Vh + 1, p, q], [Vh, -q, -p]];
          const items = [truth, ...distract(r, truth, pool)];
          if (items.length < 4) continue;
          const Hx = (z) => `${V("H")}(${z === 0 ? x : M.poly([1, -z])})`;
          const render = ([v, a, b]) => `${V("f")}(${x}) = ${v === 1 ? `${Hx(a)} − ${Hx(b)}` : `${n(v)}[${Hx(a)} − ${Hx(b)}]`}`;
          const ch = choose(r, items, render);
          return {
            prompt: `Which function has this graph? (${V("H")} is the Heaviside step with ${V("H")}(0) = 1; the dots mark the value at each jump.)`,
            graph: graph({ view: [-6, 6, -2, 5], items: [{ t: "seg", a: [-6, 0], b: [p, 0] }, { t: "seg", a: [p, Vh], b: [q, Vh] }, { t: "seg", a: [q, 0], b: [6, 0] }, { t: "pt", x: p, y: Vh }, { t: "pt", x: q, y: 0 }] }),
            steps: [
              `The graph jumps up by ${n(Vh)} at ${x} = ${n(p)}: that is ${Vh === 1 ? "" : n(Vh)}${Hx(p)} switching on (0 before ${x} = ${n(p)}, then ${n(Vh)}).`,
              `It drops back to 0 at ${x} = ${n(q)}: subtracting ${Vh === 1 ? "" : n(Vh)}${Hx(q)} cancels the first step from there on.`,
              `So ${render(truth)}, a rectangular pulse of height ${n(Vh)} and width ${n(q - p)}.`,
            ],
            ...ch.out, vals: { width: q - p }, params: { Vh, p, q, opts: ch.opts },
          };
        }
      },
    },

    // ---- F.28 Sign function ---------------------------------------------------------------------------------------
    "F.28": {
      title: "The sign function",
      generate(r, level) {
        const sg = (s) => `sgn(${s})`;
        const sumText = (ss) => ss.map((v, i) => (i === 0 ? n(v) : v < 0 ? `− ${n(-v)}` : `+ ${n(v)}`)).join(" ");
        if (level === 1) {
          for (;;) {
            const us = r.sample([-7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7], 3);
            if (!us.some((u) => u < 0) || !us.some((u) => u > 0)) continue;
            const ss = us.map((u) => Math.sign(u)), sum = ss.reduce((a, b) => a + b, 0);
            return {
              prompt: `Evaluate ${M.eq(us.map((u) => sg(n(u))).join(" + "))} where sgn ${x} is 1 for ${x} &gt; 0, −1 for ${x} &lt; 0, and 0 at 0.`,
              steps: [
                ...us.map((u, i) => `${sg(n(u))} = ${n(ss[i])}${u === 0 ? ", by definition" : `, since ${n(u)} is ${u > 0 ? "positive" : "negative"}`}.`),
                `Sum: ${sumText(ss)} = ${n(sum)}.`,
              ],
              ...exact(sum), vals: { ss, sum }, params: { us },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const a = r.nonzero(-3, 3), h = r.int(-3, 3), x0 = r.int(-6, 6), d = x0 - h;
            if (d === 0 || Math.abs(d) > 4) continue;
            const s = Math.sign(d), slope = a * s, y0 = a * Math.abs(d), inner = h === 0 ? x : M.poly([1, -h]);
            return {
              prompt: `Find the slope of ${M.eq(`${y} = ${co(a)}|${inner}|`)} at ${x} = ${n(x0)}.`,
              graph: graph({ view: [-8, 8, -13, 13], items: [{ t: "fn", e: `${a}*abs(x - (${h}))` }, { t: "pt", x: x0, y: y0 }] }),
              steps: [
                `For ${V("u")} ≠ 0, ${M.frac("d", `d${V("u")}`)}|${V("u")}| = sgn ${V("u")}, so ${M.frac("d", `d${x}`)} ${co(a)}|${inner}| = ${a === 1 ? "" : `${n(a)} · `}${sg(inner)}.`,
                `At ${x} = ${n(x0)}: ${n(x0)} − ${np(h)} = ${n(d)}, and ${sg(n(d))} = ${n(s)}.`,
                `Slope = ${a === 1 ? n(s) : `${n(a)} · ${np(s)} = ${n(slope)}`}. (On this side of the corner the graph is a straight line of that slope.)`,
              ],
              ...exact(slope), vals: { d, s, slope, y0 }, params: { a, h, x0 },
            };
          }
        }
        for (;;) {
          const p = r.int(-5, 4), q = r.int(p + 1, 5), xs = r.sample([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6], 3);
          const kinds = xs.map((v) => (v < p || v > q ? 1 : v === p || v === q ? 0 : -1));
          if (!kinds.includes(1) || !kinds.includes(-1)) continue;
          const f1 = xs.map((v) => v - p), f2 = xs.map((v) => v - q), prods = xs.map((v, i) => f1[i] * f2[i]), ss = prods.map(Math.sign), sum = ss.reduce((a, b) => a + b, 0);
          return {
            prompt: `For ${M.eq(`${V("f")}(${x}) = ${sg(`${sh(p)}${sh(q)}`)}`)} find ${xs.map((v) => `${V("f")}(${n(v)})`).join(" + ")}.`,
            steps: [
              ...xs.map((v, i) => `${V("f")}(${n(v)}) = ${sg(`${np(f1[i])} · ${np(f2[i])}`)} = ${sg(n(prods[i]))} = ${n(ss[i])}.`),
              `Sum: ${sumText(ss)} = ${n(sum)}. (The product is negative between ${n(p)} and ${n(q)}, positive outside, and 0 at those two zeros.)`,
            ],
            ...exact(sum), vals: { f1, f2, prods, ss, sum }, params: { p, q, xs },
          };
        }
      },
    },

    // ---- F.29 Sawtooth (fractional part) ------------------------------------------------------------------------
    "F.29": {
      title: "The fractional part (sawtooth)",
      generate(r, level) {
        const fl = (s) => `⌊${s}⌋`;
        const draw = () => { let X; do X = r.chance(0.5) ? 10 * r.int(11, 99) : r.int(101, 999); while (X % 100 === 0); return X; };
        if (level === 1) {
          const X = draw(), xv = X / 100, w = Math.floor(X / 100), fr = (X % 100) / 100;
          return {
            prompt: `Evaluate the sawtooth ${M.eq(`${y} = ${x} − ${fl(x)}`)} at ${x} = ${fmt(xv)}.`,
            steps: [`${fl(fmt(xv))} = ${n(w)}, the greatest integer not above ${fmt(xv)}.`, `${fmt(xv)} − ${n(w)} = ${fmt(fr)}: the part after the decimal point.`],
            ...exactDec(fr), vals: { w, fr }, params: { xv },
          };
        }
        if (level === 2) {
          const X = draw(), xv = -X / 100, fl0 = -Math.floor(X / 100) - 1, fr = (100 - (X % 100)) / 100;
          return {
            prompt: `Evaluate ${M.eq(`${y} = ${x} − ${fl(x)}`)} at ${x} = ${fmt(xv)}.`,
            steps: [
              `${fmt(xv)} lies between ${n(fl0)} and ${n(fl0 + 1)}; the floor rounds down, toward −∞, so ${fl(fmt(xv))} = ${n(fl0)}.`,
              `${fmt(xv)} − ${np(fl0)} = ${fmt(xv)} + ${n(-fl0)} = ${fmt(fr)}. The result always lies in [0, 1): for a negative number it is not just the digits after the point.`,
            ],
            ...exactDec(fr), vals: { fl0, fl1: fl0 + 1, nfl: -fl0, fr }, params: { xv },
          };
        }
        for (;;) {
          const A = r.pick([5, 10, 12, 20, 24]), T = r.pick([4, 5, 8, 10, 20]), t = r.int(T + 1, 5 * T);
          if (t % T === 0) continue;
          const cyc = t / T, w = Math.floor(cyc), fr = (t % T) / T, v = A * fr;
          return {
            prompt: `A sweep generator's voltage climbs steadily from 0 to ${n(A)} V over ${n(T)} ms, then drops back to 0 and repeats: ${M.eq(`${V("v")}(${V("t")}) = ${n(A)}(${M.frac(V("t"), n(T))} − ${fl(M.frac(V("t"), n(T)))})`)} What is the voltage at ${V("t")} = ${n(t)} ms?`,
            steps: [
              `${M.frac(n(t), n(T))} = ${fmt(cyc)}: ${n(w)} full sweep${w === 1 ? "" : "s"} and part of the next.`,
              `Fractional part: ${fmt(cyc)} − ${n(w)} = ${fmt(fr)} of the way up the current sweep.`,
              `${V("v")} = ${n(A)} × ${fmt(fr)} = ${fmt(v)} V.`,
            ],
            ...exactDec(v, " V"), vals: { cyc, w, fr, v }, params: { A, T, t },
          };
        }
      },
    },

    // ---- F.30 Logistic growth ----------------------------------------------------------------------------------
    "F.30": {
      title: "Logistic growth",
      generate(r, level) {
        const model = (K, A, rr) => `${V("P")}(${V("t")}) = ${M.frac(n(K), `1 + ${A === null ? V("A") : n(A)}${M.sup("e", `−${rr === null ? V("r") : fmt(rr)}${V("t")}`)}`)}`;
        if (level === 1) {
          for (;;) {
            const K = r.pick([500, 1000, 1200, 2000, 5000, 10000]), P0 = r.pick([20, 40, 50, 100, 150, 200, 250, 300, 400]);
            if (P0 * 2 > K) continue;
            const ratio = F(K, P0), A = ratio.sub(1);
            return {
              prompt: `A lake can support ${P.grouped(K)} fish (its carrying capacity). It is stocked with ${n(P0)} fish, and the population follows ${M.eq(model(K, null, null))} Find ${V("A")}.`,
              steps: [
                `At ${V("t")} = 0, ${M.sup("e", "0")} = 1, so ${n(P0)} = ${M.frac(n(K), `1 + ${V("A")}`)}.`,
                `1 + ${V("A")} = ${M.frac(n(K), n(P0))} = ${M.f(ratio)}.`,
                `${V("A")} = ${M.f(ratio)} − 1 = ${M.f(A)}. (In general ${V("A")} = ${M.frac(`${V("K")} − ${M.sub(V("P"), "0")}`, M.sub(V("P"), "0"))}.)`,
              ],
              ...exact(A), vals: { ratio: fv(ratio), A: fv(A) }, params: { K, P0 },
            };
          }
        }
        for (;;) {
          const K = r.pick([500, 1000, 2000, 5000]), P0 = r.pick([10, 20, 25, 50, 100]), rr = r.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5]);
          if (K % P0 !== 0) continue;
          const A = K / P0 - 1;
          if (A < 4) continue;
          if (level === 2) {
            const tY = r.int(2, 12), rt = rr * tY, e = Math.exp(-rt), den = 1 + A * e, Pv = K / den;
            if (!agrees(Pv, K / (1 + A * rd(e, 6)), 0)) continue;
            return {
              prompt: `A population follows ${M.eq(model(K, A, rr))} with ${V("t")} in years. What is it after ${n(tY)} years? Round to the nearest whole number.`,
              steps: [
                `The exponent: ${fmt(rr)} × ${n(tY)} = ${fmt(rt)}, and ${M.sup("e", `−${fmt(rt)}`)} ${eqa(e, 6)}.`,
                `Denominator: 1 + ${n(A)} × ${fmt(e, 6)} ${eqa(den, 6)}.`,
                `${V("P")} = ${n(K)} ÷ ${fmt(den, 6)} ${eqa(Pv, 2)}, so about ${fmt(Pv, 0)}.`,
              ],
              ...rounded(Pv, 0), vals: { rt, e, den, Pv }, params: { K, A, rr, tY },
            };
          }
          const lnA = Math.log(A), ts = lnA / rr, half = K / 2;
          if (!agrees(ts, rd(lnA, 6) / rr, 2)) continue;
          return {
            prompt: `A population follows ${M.eq(model(K, A, rr))} with ${V("t")} in years. It grows fastest when it reaches half its carrying capacity. When is that? Round to 2 decimal places.`,
            steps: [
              `Half the capacity is ${n(K)} ÷ 2 = ${n(half)}: ${M.frac(n(K), `1 + ${n(A)}${M.sup("e", `−${fmt(rr)}${V("t")}`)}`)} = ${M.frac(n(K), "2")} means 1 + ${n(A)}${M.sup("e", `−${fmt(rr)}${V("t")}`)} = 2.`,
              `So ${n(A)}${M.sup("e", `−${fmt(rr)}${V("t")}`)} = 1, that is ${M.sup("e", `${fmt(rr)}${V("t")}`)} = ${n(A)}, and ${fmt(rr)}${V("t")} = ln ${n(A)} ${eqa(lnA, 6)}.`,
              `${V("t")} = ${fmt(lnA, 6)} ÷ ${fmt(rr)} ${eqa(ts, 2)} years.`,
            ],
            ...rounded(ts, 2, " years"), vals: { half, lnA, ts }, params: { K, A, rr },
          };
        }
      },
    },

    // ---- F.31 Power law ------------------------------------------------------------------------------------------
    "F.31": {
      title: "Power laws",
      generate(r, level) {
        const exTxt = (p, q) => `${p < 0 ? "−" : ""}${Math.abs(p)}${q === 1 ? "" : `/${q}`}`;
        if (level === 1) {
          for (;;) {
            const [p, q] = r.pick([[1, 2], [3, 2], [-1, 2], [1, 3], [2, 3], [-2, 3], [-1, 1], [-2, 1], [2, 1]]);
            const r0 = r.int(2, q === 1 ? 6 : 5), xv = Math.pow(r0, q), Cc = r.int(1, 5);
            if (xv > 125) continue;
            const pv = F(r0).pow(p), ans = pv.mul(Cc);
            const root = q === 1 ? "" : `${M.sqrt(n(xv), q === 2 ? "" : "3")} = ${n(r0)}, so `;
            return {
              prompt: `For the power law ${M.eq(`${y} = ${Cc === 1 ? "" : n(Cc)}${M.sup(x, exTxt(p, q))}`)} find ${y} when ${x} = ${n(xv)}.`,
              steps: [
                q === 1 ? `${M.sup(n(xv), exTxt(p, q))} = ${M.f(pv)}.` : `${root}${M.sup(n(xv), exTxt(p, q))} = ${M.sup(n(r0), n(p))} = ${M.f(pv)}.`,
                Cc === 1 ? `So ${y} = ${M.f(ans)}.` : `${y} = ${n(Cc)} · ${M.f(pv)} = ${M.f(ans)}.`,
              ],
              ...exact(ans), vals: { r0, pv: fv(pv), ans: fv(ans) }, params: { Cc, p, q, xv },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const g = r.pick([2, 3]), u = r.int(2, 3), v = r.nonzero(-4, 6), x1 = r.int(1, 5), x2 = x1 * Math.pow(g, u);
            if (x2 > 200 || v === u || (v % u === 0 && r.chance(0.6))) continue;
            const yb = v < 0 ? Math.pow(g, -v) : 1, y1 = yb * r.int(1, 4), y2q = F(y1).mul(F(g).pow(v));
            if (!y2q.isInt() || y2q.n > 3000) continue;
            const y2 = y2q.n, xr = x2 / x1, yr = F(y2, y1), k = F(v, u);
            return {
              prompt: `A quantity follows a power law ${y} = ${V("C")}${M.sup(x, V("k"))} and passes through (${n(x1)}, ${n(y1)}) and (${n(x2)}, ${n(y2)}). Find the exponent ${V("k")}.`,
              steps: [
                `Divide the two equations to cancel ${V("C")}: ${M.frac(n(y2), n(y1))} = ${M.sup(`(${M.frac(n(x2), n(x1))})`, V("k"))}, that is ${M.f(yr)} = ${M.sup(n(xr), V("k"))}.`,
                `Both are powers of ${n(g)}: ${n(xr)} = ${M.sup(n(g), n(u))} and ${M.f(yr)} = ${M.sup(n(g), n(v))}, so ${M.sup(n(g), n(v))} = ${M.sup(n(g), `${n(u)}${V("k")}`)}.`,
                `${n(u)}${V("k")} = ${n(v)}, so ${V("k")} = ${M.f(k)}. (On log–log axes this is the slope of the straight line.)`,
              ],
              ...exact(k), vals: { xr, yr: fv(yr), g, u, v, k: fv(k) }, params: { x1, y1, x2, y2 },
            };
          }
        }
        if (r.chance(0.5)) {
          const s = r.pick([2, 3]), M1 = r.pick([2, 3, 5, 10, 20]), ratio = Math.pow(s, 4), M2 = M1 * ratio, B1 = r.int(3, 20), mult = Math.pow(s, 3), B2 = B1 * mult;
          return {
            prompt: `Kleiber's law: an animal's resting metabolic rate grows as its mass to the power ${M.frac("3", "4")}. A ${n(M1)} kg animal burns ${n(B1)} W at rest. What does a similar ${P.grouped(M2)} kg animal burn, in watts?`,
            steps: [
              `${M.frac(M.sub(V("B"), "2"), M.sub(V("B"), "1"))} = ${M.sup(`(${M.frac(M.sub(V("M"), "2"), M.sub(V("M"), "1"))})`, "3/4")}, and the mass ratio is ${M.frac(n(M2), n(M1))} = ${n(ratio)} = ${M.sup(n(s), "4")}.`,
              `${M.sup(n(ratio), "3/4")} = ${M.sup(`(${M.sup(n(s), "4")})`, "3/4")} = ${M.sup(n(s), "3")} = ${n(mult)}.`,
              `${M.sub(V("B"), "2")} = ${n(B1)} × ${n(mult)} = ${n(B2)} W. A ${n(ratio)}-fold mass needs only ${n(mult)} times the energy.`,
            ],
            ...exact(B2, " W"), vals: { ratio, mult, B2 }, params: { s, M1, M2, B1 }, consts: [3, 4],
          };
        }
        const s = r.pick([2, 3, 4]), M1 = r.pick([2, 5, 10]), ratio = Math.pow(s, 3), M2 = M1 * ratio, A1 = r.pick([0.1, 0.2, 0.3, 0.5]), mult = s * s, A2 = A1 * mult;
        return {
          prompt: `For animals of the same shape, skin area grows as mass to the power ${M.frac("2", "3")}. A ${n(M1)} kg animal has ${fmt(A1)} m² of skin. How much skin does a similar ${n(M2)} kg animal have, in m²?`,
          steps: [
            `${M.frac(M.sub(V("S"), "2"), M.sub(V("S"), "1"))} = ${M.sup(`(${M.frac(M.sub(V("M"), "2"), M.sub(V("M"), "1"))})`, "2/3")}, and the mass ratio is ${M.frac(n(M2), n(M1))} = ${n(ratio)} = ${M.sup(n(s), "3")}.`,
            `${M.sup(n(ratio), "2/3")} = ${M.sup(`(${M.sup(n(s), "3")})`, "2/3")} = ${M.sup(n(s), "2")} = ${n(mult)}.`,
            `${M.sub(V("S"), "2")} = ${fmt(A1)} × ${n(mult)} = ${fmt(A2)} m².`,
          ],
          ...exactDec(A2, " m²"), vals: { ratio, mult, A2 }, params: { s, M1, M2, A1 }, consts: [3],
        };
      },
    },

    // ---- F.32 Piecewise ------------------------------------------------------------------------------------------
    "F.32": {
      title: "Piecewise functions",
      generate(r, level) {
        const def = (p, q, s, t, c) => `${V("f")}(${x}) = ${M.poly([p, 0, q])} for ${x} &lt; ${n(c)}, and ${V("f")}(${x}) = ${M.poly([s, t])} for ${x} ≥ ${n(c)}`;
        const gr = (p, q, s, t, c, extra = []) => graph({ view: [-6, 6, -12, 12], items: [{ t: "fn", e: `(${p}*x^2 + (${q})) + 0*sqrt((${c}) - x)` }, { t: "fn", e: `(${s}*x + (${t})) + 0*sqrt(x - (${c}))` }, { t: "pt", x: c, y: s * c + t }, ...extra] });
        const lin = (s, xv, t) => `${s === 1 ? "" : s === -1 ? "−" : `${n(s)} · `}${np(xv)}${M.term(t, "")}`;
        const quad = (p, xv, q) => `${p < 0 ? "−" : ""}${pw(xv, 2)}${M.term(q, "")}`;
        if (level === 1) {
          const p = r.pick([1, -1]), q = r.int(-3, 3), c = r.int(-2, 2), s = r.nonzero(-3, 3), t = r.int(-4, 4);
          let x0;
          do x0 = r.int(-4, 4); while (x0 === c);
          const left = x0 < c, val = left ? p * x0 * x0 + q : s * x0 + t;
          return {
            prompt: `Let ${M.eq(def(p, q, s, t, c))} Find ${V("f")}(${n(x0)}).`,
            steps: [
              `${n(x0)} ${left ? "&lt;" : "≥"} ${n(c)}, so use the ${left ? "first" : "second"} piece, ${left ? M.poly([p, 0, q]) : M.poly([s, t])}.`,
              `${V("f")}(${n(x0)}) = ${left ? quad(p, x0, q) : lin(s, x0, t)} = ${n(val)}.`,
            ],
            ...exact(val), vals: { x0sq: x0 * x0, val }, params: { p, q, s, t, c, x0 },
          };
        }
        if (level === 2) {
          const p = r.pick([1, -1]), q = r.int(-3, 3), c = r.int(-2, 2), s = r.nonzero(-3, 3), t = r.int(-4, 4);
          const Lc = p * c * c + q, Rc = s * c + t, jump = Rc - Lc;
          return {
            prompt: `Let ${M.eq(def(p, q, s, t, c))} How big is the jump at ${x} = ${n(c)}: the value from the right minus the value approached from the left? (0 means the graph is continuous there.)`,
            graph: gr(p, q, s, t, c),
            steps: [
              `From the left (${x} &lt; ${n(c)}) the first piece approaches ${quad(p, c, q)} = ${n(Lc)}.`,
              `At ${x} = ${n(c)} and to its right the second piece applies: ${V("f")}(${n(c)}) = ${lin(s, c, t)} = ${n(Rc)}. That is the filled dot.`,
              `Jump: ${n(Rc)} − ${np(Lc)} = ${n(jump)}${jump === 0 ? ", so the pieces meet and the graph is continuous" : ""}.`,
            ],
            ...exact(jump), vals: { csq: c * c, Lc, Rc, jump }, params: { p, q, s, t, c },
          };
        }
        for (;;) {
          const p = r.pick([1, -1]), q = r.int(-3, 3), c = r.int(-2, 2), s = r.nonzero(-3, 3), t = r.int(-4, 4), v = r.int(-6, 9);
          const S = (v - q) * p;
          if (S < 0) continue;
          const rt = Math.round(Math.sqrt(S));
          if (rt * rt !== S || (v - t) % s !== 0) continue;
          const cand = rt === 0 ? [0] : [-rt, rt], keepL = cand.filter((z) => z < c), xr = (v - t) / s, keepR = xr >= c;
          const sols = [...keepL, ...(keepR ? [xr] : [])].sort((a, b) => a - b);
          const rejected = cand.length - keepL.length + (keepR ? 0 : 1);
          if (!sols.length || !rejected || new Set(sols).size !== sols.length) continue;
          const lst = (a) => a.map((z) => n(z)).join(" and ");
          const bad = cand.filter((z) => z >= c);
          const leftNote = keepL.length === cand.length ? `${cand.length === 1 ? "It lies" : "Both lie"} below ${n(c)}: keep ${lst(keepL)}.`
            : keepL.length ? `Keep ${lst(keepL)}; ${lst(bad)} is not below ${n(c)}, so it is rejected.` : `${cand.length === 1 ? "It is" : "Neither is"} below ${n(c)}, so ${cand.length === 1 ? "it is" : "both are"} rejected.`;
          return {
            prompt: `Let ${M.eq(def(p, q, s, t, c))} Find every ${x} with ${V("f")}(${x}) = ${n(v)}.`,
            graph: gr(p, q, s, t, c, [{ t: "hline", y: v, dash: true, role: "secondary" }]),
            steps: [
              `First piece (${x} &lt; ${n(c)}): ${M.poly([p, 0, q])} = ${n(v)} gives ${M.sup(x, 2)} = ${n(S)}, so ${x} = ${rt === 0 ? "0" : `±${n(rt)}`}. ${leftNote}`,
              `Second piece (${x} ≥ ${n(c)}): ${M.poly([s, t])} = ${n(v)} gives ${x} = ${M.frac(`${n(v)} − ${np(t)}`, n(s))} = ${n(xr)}, which ${keepR ? "is" : "is not"} ≥ ${n(c)}, so it is ${keepR ? "kept" : "rejected"}.`,
              `${sols.length === 1 ? "The only solution is" : "The solutions are"} ${x} = ${lst(sols)}.`,
            ],
            answer: { kind: "numbers", values: sols }, answerText: `${x} = ${sols.map((z) => n(z)).join(" or ")}`, answerInput: sols.join(", "),
            vals: { S, rt, xr, sols }, params: { p, q, s, t, c, v },
          };
        }
      },
    },

    // ---- F.33 Circle -------------------------------------------------------------------------------------------------
    "F.33": {
      title: "Circles",
      generate(r, level) {
        const circ = (h, k, R2) => `${M.sup(sh(h), 2)} + ${M.sup(sh(k, "y"), 2)} = ${n(R2)}`;
        if (level === 1) {
          const h = r.nonzero(-6, 6), k = r.nonzero(-6, 6), rr = r.int(1, 7), R2 = rr * rr;
          if (r.chance(0.5)) {
            return {
              prompt: `Find the center of the circle ${M.eq(circ(h, k, R2))}`,
              steps: [
                `The circle with center (${V("h")}, ${V("k")}) and radius ${V("r")} is ${M.sup(`(${x} − ${V("h")})`, 2)} + ${M.sup(`(${y} − ${V("k")})`, 2)} = ${M.sup(V("r"), 2)}.`,
                `${M.poly([1, -h])} = ${x} − ${np(h)} and ${M.poly([1, -k], "y")} = ${y} − ${np(k)}, so the center is (${n(h)}, ${n(k)}).`,
              ],
              answer: { kind: "point", value: [h, k] }, answerText: `(${n(h)}, ${n(k)})`, answerInput: `(${h}, ${k})`, vals: {}, params: { h, k, R2, ask: 0 },
            };
          }
          return {
            prompt: `Find the radius of the circle ${M.eq(circ(h, k, R2))}`,
            steps: [`The right side is the radius squared: ${M.sup(V("r"), 2)} = ${n(R2)}.`, `${V("r")} = ${M.sqrt(n(R2))} = ${n(rr)}.`],
            ...exact(rr), vals: { rr }, params: { h, k, R2, ask: 1 },
          };
        }
        if (level === 2) {
          const h = r.nonzero(-5, 5), k = r.nonzero(-5, 5), rr = r.int(1, 7), R2 = rr * rr, D = -2 * h, E = -2 * k, Fc = h * h + k * k - R2;
          return {
            prompt: `Find the radius of the circle ${M.eq(`${M.sup(x, 2)} + ${M.sup(y, 2)}${M.term(D, x)}${M.term(E, y)}${M.term(Fc, "")} = 0`)}`,
            steps: [
              `Complete the square in each variable: ${M.sup(x, 2)}${M.term(D, x)} = ${M.sup(sh(h), 2)} − ${n(h * h)} and ${M.sup(y, 2)}${M.term(E, y)} = ${M.sup(sh(k, "y"), 2)} − ${n(k * k)}.`,
              `So ${M.sup(sh(h), 2)} + ${M.sup(sh(k, "y"), 2)} = ${n(h * h)} + ${n(k * k)} − ${np(Fc)} = ${n(R2)}.`,
              `The center is (${n(h)}, ${n(k)}) and the radius is ${M.sqrt(n(R2))} = ${n(rr)}.`,
            ],
            ...exact(rr), vals: { hh: h * h, kk: k * k, R2, h, k, rr }, params: { D, E, Fc },
          };
        }
        for (;;) {
          const [a0, b0] = r.pick([[1, 2], [2, 1], [1, 3], [3, 1], [2, 3], [3, 2], [3, 4], [4, 3], [2, 2], [1, 4], [4, 1]]);
          const a = a0 * r.pick([1, -1]), b = b0 * r.pick([1, -1]), h = r.int(-3, 3), k = r.int(-3, 3);
          if (h === 0 && k === 0) continue;
          const R2 = a * a + b * b, taxi = (a0 + b0) ** 2;
          const truth = [h, k, R2];
          const pool = [[-h, -k, R2], [h, k, taxi]];
          if (h !== k) pool.push([k, h, R2]);
          const sq = Math.round(Math.sqrt(R2));
          pool.push(sq * sq === R2 ? [h, k, sq] : [h, k, a0 + b0]);
          const items = [truth, ...distract(r, truth, pool)];
          if (items.length < 4) continue;
          const ch = choose(r, items, ([hh, kk, rr2]) => circ(hh, kk, rr2));
          return {
            prompt: `The circle's center and one point on it are marked; both sit on grid corners. Which equation does the circle have?`,
            graph: graph({ view: [-9, 9, -9, 9], equal: true, items: [{ t: "circle", c: [h, k], r: Math.sqrt(R2) }, { t: "pt", x: h, y: k }, { t: "pt", x: h + a, y: k + b }] }),
            steps: [
              `Center: (${n(h)}, ${n(k)}). Point on the circle: (${n(h + a)}, ${n(k + b)}).`,
              `The radius squared is the squared distance between them: ${M.sup(`(${n(h + a)} − ${np(h)})`, 2)} + ${M.sup(`(${n(k + b)} − ${np(k)})`, 2)} = ${pw(a, 2)} + ${pw(b, 2)} = ${n(a * a)} + ${n(b * b)} = ${n(R2)}.`,
              `So ${circ(h, k, R2)}.`,
            ],
            ...ch.out, vals: { px: h + a, py: k + b, aa: a * a, bb: b * b, R2 }, params: { h, k, a, b, opts: ch.opts },
          };
        }
      },
    },

    // ---- F.34 Ellipse --------------------------------------------------------------------------------------------------
    "F.34": {
      title: "Ellipses",
      generate(r, level) {
        const ell = (A, B) => `${A === 1 ? M.sup(x, 2) : M.frac(M.sup(x, 2), n(A))} + ${B === 1 ? M.sup(y, 2) : M.frac(M.sup(y, 2), n(B))} = 1`;
        const TRI = [[5, 4, 3], [5, 3, 4], [10, 8, 6], [10, 6, 8], [13, 12, 5], [13, 5, 12], [17, 15, 8], [17, 8, 15], [25, 24, 7], [25, 7, 24]];
        if (level === 1) {
          const [a, b] = r.sample([2, 3, 4, 5, 6, 7], 2), A = a * a, B = b * b, ask = r.int(0, 1);
          const big = Math.max(a, b), along = a > b ? x : y;
          const steps = [`Under ${M.sup(x, 2)}: ${n(A)} = ${M.sup(n(a), 2)}, so the ellipse meets the ${x}-axis at ±${n(a)}. Under ${M.sup(y, 2)}: ${n(B)} = ${M.sup(n(b), 2)}, so it meets the ${y}-axis at ±${n(b)}.`];
          if (ask === 0) {
            steps.push(`The longer (major) axis lies along the ${along}-axis, from −${n(big)} to ${n(big)}: its length is 2 · ${n(big)} = ${n(2 * big)}.`);
            return { prompt: `Find the length of the major axis of ${M.eq(ell(A, B))}`, steps, ...exact(2 * big), vals: { a, b, L: 2 * big }, params: { A, B, ask } };
          }
          return {
            prompt: `Find the ${x}-intercepts of ${M.eq(ell(A, B))}`, steps,
            answer: { kind: "numbers", values: [a, -a] }, answerText: `${x} = ${n(a)} and ${x} = −${n(a)}`, answerInput: `${a}, -${a}`, vals: { a, b }, params: { A, B, ask },
          };
        }
        const [a, b, c] = r.pick(TRI), A = a * a, B = b * b;
        if (level === 2) {
          const vert = r.chance(0.5), eqn = vert ? ell(B, A) : ell(A, B);
          return {
            prompt: `Find ${V("c")}, the distance from the center to each focus, for ${M.eq(eqn)}`,
            steps: [
              `The larger denominator is ${M.sup(V("a"), 2)} = ${n(A)}, under ${vert ? M.sup(y, 2) : M.sup(x, 2)}, so the major axis and the foci lie on the ${vert ? y : x}-axis. The smaller is ${M.sup(V("b"), 2)} = ${n(B)}.`,
              `For an ellipse ${M.sup(V("c"), 2)} = ${M.sup(V("a"), 2)} − ${M.sup(V("b"), 2)} = ${n(A)} − ${n(B)} = ${n(c * c)}.`,
              `${V("c")} = ${M.sqrt(n(c * c))} = ${n(c)}: the foci are at ${vert ? `(0, ±${n(c)})` : `(±${n(c)}, 0)`}.`,
            ],
            ...exact(c), vals: { c2: c * c, c }, params: { A, B, vert: vert ? 1 : 0 },
          };
        }
        if (r.chance(0.5)) {
          const far = r.chance(0.5), ans = far ? a + c : a - c;
          return {
            prompt: `A comet's orbit is the ellipse ${M.eq(ell(A, B))} (distances in AU), with the Sun at the focus on the positive ${x}-axis. What is the comet's ${far ? "greatest" : "least"} distance from the Sun, in AU?`,
            steps: [
              `${V("a")} = ${M.sqrt(n(A))} = ${n(a)} and ${V("b")} = ${M.sqrt(n(B))} = ${n(b)}.`,
              `${V("c")} = ${M.sqrt(`${n(A)} − ${n(B)}`)} = ${M.sqrt(n(c * c))} = ${n(c)}, so the Sun is at (${n(c)}, 0).`,
              far ? `The farthest point is the vertex at (−${n(a)}, 0): ${n(a)} + ${n(c)} = ${n(ans)} AU.` : `The nearest point is the vertex at (${n(a)}, 0): ${n(a)} − ${n(c)} = ${n(ans)} AU.`,
            ],
            ...exact(ans, " AU"), vals: { a, b, c2: c * c, c, ans }, params: { A, B, far: far ? 1 : 0, kind: 0 },
          };
        }
        const d1 = r.int(a - c + 1, a + c - 1), d2 = 2 * a - d1;
        return {
          prompt: `A point ${V("P")} on the ellipse ${M.eq(ell(A, B))} is ${n(d1)} units from one focus. How far is it from the other focus?`,
          steps: [
            `${M.sup(V("a"), 2)} = ${n(A)}, so ${V("a")} = ${n(a)}.`,
            `Every point on an ellipse has distances to the two foci that add up to the major axis: ${M.sub(V("d"), "1")} + ${M.sub(V("d"), "2")} = 2${V("a")} = ${n(2 * a)}.`,
            `${M.sub(V("d"), "2")} = ${n(2 * a)} − ${n(d1)} = ${n(d2)}.`,
          ],
          ...exact(d2), vals: { a, a2: 2 * a, d2 }, params: { A, B, d1, kind: 1 },
        };
      },
    },

    // ---- F.35 Hyperbola -----------------------------------------------------------------------------------------------
    "F.35": {
      title: "Hyperbolas",
      generate(r, level) {
        const hyp = (A, B, vert = false) => {
          const tx = A === 1 ? M.sup(x, 2) : M.frac(M.sup(x, 2), n(A)), ty = B === 1 ? M.sup(y, 2) : M.frac(M.sup(y, 2), n(B));
          return vert ? `${ty} − ${tx} = 1` : `${tx} − ${ty} = 1`;
        };
        const TRI = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10], [8, 15, 17], [15, 8, 17]];
        if (level === 1) {
          const a = r.int(1, 8), b = r.int(1, 8), A = a * a, B = b * b, m = F(b, a);
          return {
            prompt: `Find the slope of the asymptote of ${M.eq(hyp(A, B))} that rises to the right.`,
            steps: [
              `${M.sup(V("a"), 2)} = ${n(A)} and ${M.sup(V("b"), 2)} = ${n(B)}, so ${V("a")} = ${n(a)} and ${V("b")} = ${n(b)}.`,
              `For large ${x} the 1 is negligible: ${M.frac(M.sup(x, 2), M.sup(V("a"), 2))} ≈ ${M.frac(M.sup(y, 2), M.sup(V("b"), 2))}, so ${y} ≈ ±${M.frac(V("b"), V("a"))}${x}.`,
              `The rising asymptote has slope ${M.frac(n(b), n(a))}${m.d !== a ? ` = ${M.f(m)}` : ""}.`,
            ],
            ...exact(m), vals: { a, b, m: fv(m) }, params: { A, B },
          };
        }
        const [a, b, c] = r.pick(TRI), A = a * a, B = b * b;
        if (level === 2) {
          const vert = r.chance(0.5);
          return {
            prompt: `Find ${V("c")}, the distance from the center to each focus, for ${M.eq(hyp(A, B, vert))}`,
            steps: [
              `The positive term is ${vert ? M.sup(y, 2) : M.sup(x, 2)}, so the hyperbola opens ${vert ? "up and down" : "left and right"} and its foci lie on the ${vert ? y : x}-axis. ${M.sup(V("a"), 2)} = ${n(A)} (under the positive term) and ${M.sup(V("b"), 2)} = ${n(B)}.`,
              `For a hyperbola ${M.sup(V("c"), 2)} = ${M.sup(V("a"), 2)} + ${M.sup(V("b"), 2)} = ${n(A)} + ${n(B)} = ${n(c * c)}.`,
              `${V("c")} = ${M.sqrt(n(c * c))} = ${n(c)}: the foci are at ${vert ? `(0, ±${n(c)})` : `(±${n(c)}, 0)`}.`,
            ],
            ...exact(c), vals: { c2: c * c, c }, params: { A, B, vert: vert ? 1 : 0 },
          };
        }
        const d1 = r.int(c + a, c + 3 * a), d2 = d1 - 2 * a;
        return {
          prompt: `Two radio stations sit at the foci (−${n(c)}, 0) and (${n(c)}, 0) of the hyperbola ${M.eq(hyp(A, B))} (in km). A ship on the right branch is ${n(d1)} km from the station at (−${n(c)}, 0). How far is it from the station at (${n(c)}, 0)?`,
          steps: [
            `${M.sup(V("a"), 2)} = ${n(A)}, so ${V("a")} = ${n(a)}.`,
            `On a hyperbola the distances to the two foci differ by 2${V("a")}: |${M.sub(V("d"), "1")} − ${M.sub(V("d"), "2")}| = ${n(2 * a)}.`,
            `On the right branch the ship is nearer the right station, so its distance is ${n(d1)} − ${n(2 * a)} = ${n(d2)} km.`,
          ],
          ...exact(d2, " km"), vals: { a, a2: 2 * a, d2 }, params: { A, B, c, d1 },
        };
      },
    },

    // ---- F.36 Polar rose -------------------------------------------------------------------------------------------
    "F.36": {
      title: "Polar roses",
      generate(r, level) {
        const th = M.v("θ"), rr = M.v("r");
        const petals = (k) => (k % 2 ? k : 2 * k);
        const rose = (k, f = "cos", a = 1) => `${rr} = ${a === 1 ? "" : `${n(a)} `}${f}(${k === 1 ? "" : n(k)}${th})`;
        if (level === 1) {
          const k = r.int(2, 9), f = r.pick(["cos", "sin"]), a = r.int(1, 5), P_ = petals(k);
          return {
            prompt: `How many petals does the rose ${M.eq(rose(k, f, a))} have?`,
            steps: [
              `${V("n")} = ${n(k)} is ${k % 2 ? "odd" : "even"}.`,
              k % 2 ? `With odd ${V("n")} the rose has ${V("n")} petals: as θ runs from 0 to 2π, each petal is traced twice.` : `With even ${V("n")} the rose has 2${V("n")} petals: 2 · ${n(k)} = ${n(P_)}.`,
              `So ${n(P_)} petals, each of length ${n(a)}.`,
            ],
            ...exact(P_, " petals"), vals: { P: P_ }, params: { k, a, f: f === "cos" ? 0 : 1 },
          };
        }
        if (level === 2) {
          const k = r.int(2, 6), others = r.sample([2, 3, 4, 5, 6, 7].filter((j) => j !== k), 3);
          const ch = choose(r, [k, ...others], (j) => rose(j));
          const pts = [];
          for (let i = 0; i <= 720; i++) { const t = (i * Math.PI) / 360, rv = Math.cos(k * t); pts.push([rd(rv * Math.cos(t), 4), rd(rv * Math.sin(t), 4)]); }
          const P_ = petals(k), all = [k, ...others].sort((u, v) => u - v);
          return {
            prompt: `Which equation draws this rose?`,
            graph: graph({ view: [-1.3, 1.3, -1.3, 1.3], equal: true, grid: false, items: [{ t: "poly", p: pts, fill: false }] }),
            steps: [
              `Count the petals: ${n(P_)}.`,
              `${rr} = cos(${V("n")}${th}) has ${V("n")} petals for odd ${V("n")} and 2${V("n")} for even ${V("n")}. The options give ${all.map((j) => `${n(petals(j))} (${V("n")} = ${n(j)})`).join(", ")}.`,
              `Only ${V("n")} = ${n(k)} gives ${n(P_)}: ${rose(k)}.`,
            ],
            ...ch.out, vals: { P: P_, counts: all.map(petals) }, params: { k, opts: ch.opts },
          };
        }
        const k = r.int(2, 9), f = r.pick(["cos", "sin"]), a = r.int(1, 5), P_ = petals(k), ang = F(2, P_);
        return {
          prompt: `The petal tips of ${M.eq(rose(k, f, a))} are evenly spaced around the origin. What angle separates neighboring tips? Answer in radians.`,
          steps: [
            `${V("n")} = ${n(k)} is ${k % 2 ? "odd" : "even"}, so the rose has ${k % 2 ? n(P_) : `2 · ${n(k)} = ${n(P_)}`} petals.`,
            `${n(P_)} tips share the full turn of 2π equally: ${M.frac("2π", n(P_))}${ang.n === 2 && ang.d === P_ ? "" : ` = ${piq(ang)}`}.`,
          ],
          answer: { kind: "number", value: ang.value * Math.PI }, answerText: piq(ang), answerInput: piTyped(ang),
          vals: { P: P_, ang: fv(ang) }, params: { k, a, f: f === "cos" ? 0 : 1 },
        };
      },
    },
    // ================================ Distributions ================================================

    // ---- D.1 Bernoulli -------------------------------------------------------------------------------------------
    "D.1": {
      title: "The Bernoulli distribution",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const b = r.int(2, 10), a = r.int(1, b - 1);
            if (P.gcd(a, b) !== 1) continue;
            const p = F(a, b), q = F(b - a, b), v = p.mul(q);
            return {
              prompt: `${V("X")} is 1 with probability ${M.f(p)} and 0 otherwise. Find Var(${V("X")}).`,
              steps: [
                `For a Bernoulli variable, E[${V("X")}] = ${V("p")} = ${M.f(p)} and Var(${V("X")}) = ${V("p")}(1 − ${V("p")}).`,
                `1 − ${M.f(p)} = ${M.f(q)}, so Var(${V("X")}) = ${M.f(p)} · ${M.f(q)} = ${M.f(v)}.`,
              ],
              ...exact(v), vals: { q: fv(q), v: fv(v) }, params: { pn: a, pd: b },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const ph = 5 * r.int(11, 19), p = ph / 100, q = (100 - ph) / 100, v = (ph * (100 - ph)) / 10000, sd = Math.sqrt(v);
            if (!agrees(sd, sd, 4)) continue;
            return {
              prompt: `A basketball player makes each free throw with probability ${fmt(p)}. Let ${V("X")} = 1 if she makes her next shot and 0 if not. Find the standard deviation of ${V("X")}, rounded to 4 decimal places.`,
              steps: [
                `Var(${V("X")}) = ${V("p")}(1 − ${V("p")}) = ${fmt(p)} × ${fmt(q)} = ${fmt(v)}.`,
                `SD = ${M.sqrt(fmt(v))} ${eqa(sd, 4)}.`,
              ],
              ...rounded(sd, 4), vals: { q, v, sd }, params: { p }, consts: [4],
            };
          }
        }
        const p = r.pick([F(1, 2), F(1, 4), F(1, 5), F(1, 10), F(2, 5), F(3, 10), F(3, 4)]), W = r.int(2, 20), L = r.int(1, 10), askVar = r.chance(0.4);
        const q = F(1).sub(p), WL = W + L;
        if (!askVar) {
          const pW = p.mul(W), qL = q.mul(L), E = pW.sub(qL);
          return {
            prompt: `A game costs nothing to enter. You win $${n(W)} with probability ${fmt(p.value)} and otherwise lose $${n(L)}. What is your expected profit per game, in dollars?`,
            steps: [
              `The profit is ${n(W)} with probability ${fmt(p.value)} and −${n(L)} with probability 1 − ${fmt(p.value)} = ${fmt(q.value)}: a Bernoulli outcome mapped to two dollar amounts.`,
              `E = ${n(W)} × ${fmt(p.value)} + (−${n(L)}) × ${fmt(q.value)} = ${fmt(pW.value)} − ${fmt(qL.value)} = ${fmt(E.value)}.`,
              E.n === 0 ? `On average you break even.` : `On average you ${E.n > 0 ? "gain" : "lose"} ${money(Math.abs(E.value))} per game.`,
            ],
            answer: { kind: "number", value: E.value }, answerText: money(E.value), answerInput: fmt(E.value, 8).replace(/−/g, "-"),
            vals: { q: q.value, pW: pW.value, qL: qL.value, E: E.value }, params: { p: p.value, W, L, askVar: 0 },
          };
        }
        const pq = p.mul(q), WL2 = WL * WL, Var = pq.mul(WL2);
        return {
          prompt: `A game pays $${n(W)} with probability ${fmt(p.value)} and otherwise costs you $${n(L)}. Find the variance of your profit per game, in dollars squared.`,
          steps: [
            `Write the profit as −${n(L)} + ${n(WL)}${V("X")}, where ${V("X")} = 1 on a win: a Bernoulli(${fmt(p.value)}) variable. (Check: a win gives −${n(L)} + ${n(WL)} = ${n(W)}.)`,
            `Var(${V("X")}) = ${fmt(p.value)} × ${fmt(q.value)} = ${fmt(pq.value)}. Adding a constant changes nothing; multiplying by ${n(WL)} multiplies the variance by ${M.sup(n(WL), 2)} = ${n(WL2)}.`,
            `Var = ${n(WL2)} × ${fmt(pq.value)} = ${fmt(Var.value)}.`,
          ],
          ...exactDec(Var.value), vals: { q: q.value, WL, pq: pq.value, WL2, Var: Var.value }, params: { p: p.value, W, L, askVar: 1 },
        };
      },
    },

    // ---- D.2 Binomial ------------------------------------------------------------------------------------------------
    "D.2": {
      title: "The binomial distribution",
      generate(r, level) {
        const story = (p, nn) => {
          if (p.eq(F(1, 2))) return [`A fair coin is tossed ${n(nn)} times.`, "heads", "heads"];
          if (p.eq(F(1, 6))) return [`A fair die is rolled ${n(nn)} times.`, "six", "sixes"];
          if (p.eq(F(1, 4))) return [`A student guesses on ${n(nn)} multiple-choice questions, each with four options.`, "correct answer", "correct answers"];
          if (p.eq(F(1, 3))) return [`A spinner with three equal sectors, one of them red, is spun ${n(nn)} times.`, "red", "reds"];
          return [`${n(nn)} seeds are planted, and each sprouts with probability ${M.f(p)}, independently.`, "sprouted seed", "sprouted seeds"];
        };
        if (level === 1) {
          const p = r.pick([F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4), F(1, 5), F(2, 5), F(1, 6)]), nn = p.eq(F(1, 6)) ? r.int(3, 4) : r.int(3, 5), k = r.int(0, nn);
          const q = F(1).sub(p), c = C(nn, k), pk = p.pow(k), qk = q.pow(nn - k), ans = pk.mul(qk).mul(c);
          const [s, one, many] = story(p, nn);
          return {
            prompt: `${s} What is the probability of exactly ${n(k)} ${k === 1 ? one : many}? Give an exact fraction.`,
            steps: [
              `Binomial with ${V("n")} = ${n(nn)}, ${V("p")} = ${M.f(p)}: P(${V("X")} = ${n(k)}) = C(${n(nn)}, ${n(k)}) ${M.sup(V("p"), n(k))}${M.sup(`(1 − ${V("p")})`, n(nn - k))}.`,
              `C(${n(nn)}, ${n(k)}) = ${n(c)}: the number of ways to choose which ${n(k)} trial${k === 1 ? "" : "s"} succeed${k === 1 ? "s" : ""}.`,
              `${pw(p, n(k))} = ${M.f(pk)} and ${pw(q, n(nn - k))} = ${M.f(qk)}.`,
              `P = ${n(c)} · ${M.f(pk)} · ${M.f(qk)} = ${M.f(ans)}.`,
            ],
            ...exact(ans), vals: { q: fv(q), c, pk: fv(pk), qk: fv(qk), ans: fv(ans), nk: nn - k }, params: { pn: p.n, pd: p.d, nn, k },
          };
        }
        if (level === 2) {
          const p = r.pick([F(1, 2), F(1, 3), F(1, 4), F(2, 5), F(1, 5), F(1, 6)]), nn = r.int(4, 6), q = F(1).sub(p), atLeast = r.chance(0.5);
          if (atLeast) {
            const q0 = q.pow(nn), ans = F(1).sub(q0);
            return {
              prompt: `Each of ${n(nn)} independent trials succeeds with probability ${M.f(p)}. What is the probability of at least one success? Give an exact fraction.`,
              steps: [
                `"At least one" is the complement of "none": P(${V("X")} ≥ 1) = 1 − P(${V("X")} = 0).`,
                `P(${V("X")} = 0) = ${pw(q, n(nn))} = ${M.f(q0)}: every trial fails.`,
                `1 − ${M.f(q0)} = ${M.f(ans)}.`,
              ],
              ...exact(ans), vals: { q: fv(q), q0: fv(q0), ans: fv(ans) }, params: { pn: p.n, pd: p.d, nn, ask: 0 },
            };
          }
          const p0 = q.pow(nn), q1 = q.pow(nn - 1), p1 = q1.mul(p).mul(nn), ans = p0.add(p1);
          return {
            prompt: `Each of ${n(nn)} independent trials succeeds with probability ${M.f(p)}. What is the probability of at most one success? Give an exact fraction.`,
            steps: [
              `P(${V("X")} ≤ 1) = P(${V("X")} = 0) + P(${V("X")} = 1).`,
              `P(${V("X")} = 0) = ${pw(q, n(nn))} = ${M.f(p0)}.`,
              `P(${V("X")} = 1) = C(${n(nn)}, 1) · ${M.f(p)} · ${pw(q, n(nn - 1))} = ${n(nn)} · ${M.f(p)} · ${M.f(q1)} = ${M.f(p1)}.`,
              `Sum: ${M.f(p0)} + ${M.f(p1)} = ${M.f(ans)}.`,
            ],
            ...exact(ans), vals: { q: fv(q), p0: fv(p0), q1: fv(q1), p1: fv(p1), ans: fv(ans), n1: nn - 1 }, params: { pn: p.n, pd: p.d, nn, ask: 1 },
          };
        }
        for (;;) {
          const nn = r.pick([10, 12, 15, 20, 25]), p = r.pick([0.02, 0.03, 0.05, 0.08, 0.1]), q = 1 - p, mean = nn * p, pct = Math.round(p * 100), ask = r.int(0, 1);
          const intro = `A machine makes defective parts ${n(pct)}% of the time, independently. In a box of ${n(nn)} parts, what is the probability that`;
          if (ask === 0) {
            const p0 = Math.pow(q, nn), p1 = nn * p * Math.pow(q, nn - 1), ans = p0 + p1;
            if (!agrees(ans, rd(p0, 6) + rd(p1, 6), 4)) continue;
            return {
              prompt: `${intro} at most one is defective? Round to 4 decimal places.`,
              steps: [
                `${V("X")} ~ Binomial(${n(nn)}, ${fmt(p)}); on average ${n(nn)} × ${fmt(p)} = ${fmt(mean)} defects per box.`,
                `P(${V("X")} = 0) = ${M.sup(fmt(q), n(nn))} ${eqa(p0, 6)}.`,
                `P(${V("X")} = 1) = ${n(nn)} × ${fmt(p)} × ${M.sup(fmt(q), n(nn - 1))} ${eqa(p1, 6)}.`,
                `P(${V("X")} ≤ 1) = ${fmt(p0, 6)} + ${fmt(p1, 6)} ${eqa(ans, 4)}.`,
              ],
              ...rounded(ans, 4), vals: { pct, q, mean, p0, p1, ans, n1: nn - 1 }, params: { nn, p, ask }, consts: [4],
            };
          }
          const c = C(nn, 2), pp = p * p, qq = Math.pow(q, nn - 2), ans = c * pp * qq;
          if (!agrees(ans, c * pp * rd(qq, 6), 4)) continue;
          return {
            prompt: `${intro} exactly 2 are defective? Round to 4 decimal places.`,
            steps: [
              `${V("X")} ~ Binomial(${n(nn)}, ${fmt(p)}); on average ${n(nn)} × ${fmt(p)} = ${fmt(mean)} defects per box.`,
              `C(${n(nn)}, 2) = ${n(c)}, ${M.sup(fmt(p), "2")} = ${fmt(pp, 8)}, and ${M.sup(fmt(q), n(nn - 2))} ${eqa(qq, 6)}.`,
              `P(${V("X")} = 2) = ${n(c)} × ${fmt(pp, 8)} × ${fmt(qq, 6)} ${eqa(ans, 4)}.`,
            ],
            ...rounded(ans, 4), vals: { pct, q, mean, c, pp, qq, ans, n2: nn - 2 }, params: { nn, p, ask }, consts: [4],
          };
        }
      },
    },

    // ---- D.3 Geometric -------------------------------------------------------------------------------------------
    "D.3": {
      title: "The geometric distribution",
      generate(r, level) {
        const ps = [F(1, 2), F(1, 3), F(1, 4), F(1, 5), F(1, 6), F(2, 5), F(2, 3)];
        if (level === 1) {
          const p = r.pick(ps), k = r.int(1, 5), q = F(1).sub(p), qk = q.pow(k - 1), ans = qk.mul(p);
          return {
            prompt: `Each attempt succeeds with probability ${M.f(p)}, independently. What is the probability that the first success comes on attempt ${n(k)}? Give an exact fraction.`,
            steps: k === 1 ? [`The very first attempt must succeed: P = ${M.f(p)}.`] : [
              k === 2 ? `The first attempt must fail and attempt 2 must succeed: P = (1 − ${V("p")})${V("p")}.` : `The first ${n(k - 1)} attempts must fail and attempt ${n(k)} must succeed: P = ${M.sup(`(1 − ${V("p")})`, n(k - 1))}${V("p")}.`,
              k === 2 ? `1 − ${M.f(p)} = ${M.f(q)}.` : `1 − ${M.f(p)} = ${M.f(q)}, and ${pw(q, n(k - 1))} = ${M.f(qk)}.`,
              `P = ${M.f(qk)} · ${M.f(p)} = ${M.f(ans)}.`,
            ],
            ...exact(ans), vals: { q: fv(q), k1: k - 1, qk: fv(qk), ans: fv(ans) }, params: { pn: p.n, pd: p.d, k },
          };
        }
        if (level === 2) {
          const p = r.pick(ps), q = F(1).sub(p);
          if (r.chance(0.5)) {
            const k = r.int(2, 5), ans = q.pow(k);
            return {
              prompt: `Each attempt succeeds with probability ${M.f(p)}. What is the probability that more than ${n(k)} attempts are needed for the first success? Give an exact fraction.`,
              steps: [
                `Needing more than ${n(k)} attempts means the first ${n(k)} all fail; what happens after does not matter.`,
                `P(${V("X")} &gt; ${n(k)}) = ${M.sup(`(1 − ${V("p")})`, n(k))} = ${pw(q, n(k))} = ${M.f(ans)}.`,
              ],
              ...exact(ans), vals: { q: fv(q), ans: fv(ans) }, params: { pn: p.n, pd: p.d, k, ask: 0 },
            };
          }
          const p2 = p.mul(p), ans = q.div(p2), mean = F(1).div(p);
          return {
            prompt: `Each attempt succeeds with probability ${M.f(p)}. ${V("X")} counts the attempts up to and including the first success. Find Var(${V("X")}).`,
            steps: [
              `For a geometric variable, E[${V("X")}] = ${M.frac("1", V("p"))} = ${M.f(mean)} and Var(${V("X")}) = ${M.frac(`1 − ${V("p")}`, M.sup(V("p"), 2))}.`,
              `1 − ${V("p")} = ${M.f(q)} and ${M.sup(V("p"), 2)} = ${M.f(p2)}.`,
              `Var(${V("X")}) = ${M.f(q)} ÷ ${M.f(p2)} = ${M.f(ans)}.`,
            ],
            ...exact(ans), vals: { q: fv(q), p2: fv(p2), mean: fv(mean), ans: fv(ans) }, params: { pn: p.n, pd: p.d, ask: 1 },
          };
        }
        for (;;) {
          const ph = r.pick([10, 15, 20, 25, 30, 40]), p = ph / 100, q = 1 - p, s = r.int(3, 10), m = r.int(2, 6), ans = Math.pow(q, m);
          if (!agrees(ans, ans, 4)) continue;
          return {
            prompt: `A telemarketer makes a sale on each call with probability ${fmt(p)}, independently. She has made ${n(s)} calls without a sale. What is the probability that she needs more than ${n(m)} further calls for her first sale? Round to 4 decimal places.`,
            steps: [
              `With ${V("X")} the number of the call that brings the first sale, P(${V("X")} &gt; ${V("k")}) = ${M.sup(`(1 − ${V("p")})`, V("k"))}: the first ${V("k")} calls all fail.`,
              `P(${V("X")} &gt; ${n(s + m)} | ${V("X")} &gt; ${n(s)}) = ${M.frac(M.sup(fmt(q), n(s + m)), M.sup(fmt(q), n(s)))} = ${M.sup(fmt(q), n(m))}: the ${n(s)} failed calls change nothing (the geometric distribution is memoryless).`,
              `${M.sup(fmt(q), n(m))} ${eqa(ans, 4)}.`,
            ],
            ...rounded(ans, 4), vals: { q, sm: s + m, ans }, params: { p, s, m }, consts: [4],
          };
        }
      },
    },

    // ---- D.4 Poisson -----------------------------------------------------------------------------------------------
    "D.4": {
      title: "The Poisson distribution",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const lam = r.int(1, 4), k = r.int(0, 3), lk = Math.pow(lam, k), kf = fact(k), e = Math.exp(-lam), ans = (lk / kf) * e;
            if (!agrees(ans, (lk / kf) * rd(e, 6), 4)) continue;
            return {
              prompt: `A help desk gets an average of ${n(lam)} call${lam === 1 ? "" : "s"} per hour. Modeling the count as Poisson, what is the probability of exactly ${n(k)} call${k === 1 ? "" : "s"} in an hour? Round to 4 decimal places.`,
              steps: [
                `P(${V("X")} = ${V("k")}) = ${M.frac(`${M.sup("λ", V("k"))}${M.sup("e", "−λ")}`, `${V("k")}!`)} with λ = ${n(lam)}, ${V("k")} = ${n(k)}.`,
                `${M.sup(n(lam), n(k))} = ${n(lk)}, ${n(k)}! = ${n(kf)}, and ${M.sup("e", `−${n(lam)}`)} ${eqa(e, 6)}.`,
                `P = ${M.frac(`${n(lk)} × ${fmt(e, 6)}`, n(kf))} ${eqa(ans, 4)}.`,
              ],
              ...rounded(ans, 4), vals: { lk, kf, e, ans }, params: { lam, k }, consts: [4],
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const lam = r.pick([0.5, 1, 1.5, 2, 2.5, 3]), s = 1 + lam + (lam * lam) / 2, e = Math.exp(-lam), ans = e * s;
            if (!agrees(ans, rd(e, 6) * s, 4)) continue;
            return {
              prompt: `Typos occur at an average rate of ${fmt(lam)} per page, as a Poisson process. What is the probability that a page has at most 2 typos? Round to 4 decimal places.`,
              steps: [
                `P(${V("X")} ≤ 2) = ${M.sup("e", "−λ")}(1 + λ + ${M.frac(M.sup("λ", "2"), "2")}), adding the terms for 0, 1 and 2.`,
                `1 + ${fmt(lam)} + ${M.frac(M.sup(fmt(lam), "2"), "2")} = ${fmt(s)}, and ${M.sup("e", `−${fmt(lam)}`)} ${eqa(e, 6)}.`,
                `P = ${fmt(e, 6)} × ${fmt(s)} ${eqa(ans, 4)}.`,
              ],
              ...rounded(ans, 4), vals: { s, e, ans }, params: { lam }, consts: [4],
            };
          }
        }
        for (;;) {
          const lh = r.pick([6, 9, 12, 15, 18, 20, 24, 30]), mins = r.pick([5, 10, 15, 20, 30]), lam = (lh * mins) / 60;
          if (lam > 6 || Math.abs(lam * 100 - Math.round(lam * 100)) > 1e-9) continue;
          const e = Math.exp(-lam);
          if (r.chance(0.5)) {
            const ans = 1 - e;
            if (!agrees(ans, 1 - rd(e, 6), 4)) continue;
            return {
              prompt: `Customers arrive at a café at ${n(lh)} per hour on average (a Poisson process). What is the probability that at least one arrives in a ${n(mins)}-minute window? Round to 4 decimal places.`,
              steps: [
                `Scale the rate to the window: λ = ${n(lh)} × ${M.frac(n(mins), "60")} = ${fmt(lam)} expected arrivals.`,
                `P(none) = ${M.sup("e", `−${fmt(lam)}`)} ${eqa(e, 6)}.`,
                `P(at least one) = 1 − ${fmt(e, 6)} ${eqa(ans, 4)}.`,
              ],
              ...rounded(ans, 4), vals: { lam, e, ans }, params: { lh, mins, ask: 0 }, consts: [4, 60],
            };
          }
          const k = r.int(1, 3), lk = Math.pow(lam, k), kf = fact(k), ans = (lk / kf) * e;
          if (!agrees(ans, (rd(lk, 6) / kf) * rd(e, 6), 4)) continue;
          return {
            prompt: `Customers arrive at a café at ${n(lh)} per hour on average (a Poisson process). What is the probability that exactly ${n(k)} arrive${k === 1 ? "s" : ""} in a ${n(mins)}-minute window? Round to 4 decimal places.`,
            steps: [
              `Scale the rate to the window: λ = ${n(lh)} × ${M.frac(n(mins), "60")} = ${fmt(lam)} expected arrivals.`,
              `${M.sup(fmt(lam), n(k))} ${eqa(lk, 6)}, ${n(k)}! = ${n(kf)}, and ${M.sup("e", `−${fmt(lam)}`)} ${eqa(e, 6)}.`,
              `P = ${M.frac(`${fmt(lk, 6)} × ${fmt(e, 6)}`, n(kf))} ${eqa(ans, 4)}.`,
            ],
            ...rounded(ans, 4), vals: { lam, lk, kf, e, ans }, params: { lh, mins, k, ask: 1 }, consts: [4, 60],
          };
        }
      },
    },

    // ---- D.5 Continuous uniform ------------------------------------------------------------------------------------
    "D.5": {
      title: "The continuous uniform distribution",
      generate(r, level) {
        const rect = (a, b, extra = []) => {
          const h = 1 / (b - a);
          return graph({ view: [a - 2, b + 2, -0.3 * h, 1.5 * h], grid: false, items: [{ t: "poly", p: [[a, 0], [a, h], [b, h], [b, 0]], role: "muted" }, ...extra] });
        };
        if (level === 1) {
          const a = r.int(-5, 5), w = r.int(2, 12), b = a + w, ask = r.int(0, 2);
          if (ask === 0) {
            const mu = F(a + b, 2);
            return {
              prompt: `${V("X")} is uniform on [${n(a)}, ${n(b)}]. Find its mean.`, graph: rect(a, b),
              steps: [`The density is flat, so the mean is the midpoint: ${M.frac(`${n(a)} + ${n(b)}`, "2")} = ${M.f(mu)}.`],
              ...exact(mu), vals: { mu: fv(mu) }, params: { a, b, ask },
            };
          }
          if (ask === 1) {
            const h = F(1, w);
            return {
              prompt: `${V("X")} is uniform on [${n(a)}, ${n(b)}]. What is the height of its density?`, graph: rect(a, b),
              steps: [`The total area under a density is 1. The rectangle is ${n(b)} − ${np(a)} = ${n(w)} wide, so its height is ${M.frac("1", n(w))}.`],
              ...exact(h), vals: { w, h: fv(h) }, params: { a, b, ask },
            };
          }
          const v = F(w * w, 12);
          return {
            prompt: `${V("X")} is uniform on [${n(a)}, ${n(b)}]. Find Var(${V("X")}).`, graph: rect(a, b),
            steps: [`Var(${V("X")}) = ${M.frac(M.sup(`(${V("b")} − ${V("a")})`, "2"), "12")}.`, `${V("b")} − ${V("a")} = ${n(b)} − ${np(a)} = ${n(w)}, so Var = ${M.frac(n(w * w), "12")}${v.d !== 12 ? ` = ${M.f(v)}` : ""}.`],
            ...exact(v), vals: { w, ww: w * w, v: fv(v) }, params: { a, b, ask }, consts: [12],
          };
        }
        if (level === 2) {
          for (;;) {
            const a = r.int(-4, 4), w = r.int(4, 12), b = a + w, c = r.int(a - 3, b - 1), d = r.int(c + 1, b + 3);
            const lo = Math.max(a, c), hi = Math.min(b, d), len = hi - lo;
            if (len <= 0 || len === w || (c >= a && d <= b && r.chance(0.5))) continue;
            const ans = F(len, w), h = 1 / w;
            return {
              prompt: `${V("X")} is uniform on [${n(a)}, ${n(b)}]. Find P(${n(c)} &lt; ${V("X")} &lt; ${n(d)}).`,
              graph: rect(a, b, [{ t: "poly", p: [[lo, 0], [lo, h], [hi, h], [hi, 0]], role: "highlight" }]),
              steps: [
                `The density is ${M.frac("1", `${n(b)} − ${np(a)}`)} = ${M.frac("1", n(w))} on [${n(a)}, ${n(b)}] and 0 outside.`,
                `Only the part of (${n(c)}, ${n(d)}) inside [${n(a)}, ${n(b)}] counts: from ${n(lo)} to ${n(hi)}, a length of ${n(len)}.`,
                `P = ${n(len)} × ${M.frac("1", n(w))} = ${M.f(ans)}.`,
              ],
              ...exact(ans), vals: { w, lo, hi, len, ans: fv(ans) }, params: { a, b, c, d },
            };
          }
        }
        const T = r.pick([10, 12, 15, 20, 30]), s = r.int(1, T - 4), w = r.int(s + 2, T - 1);
        const pS = F(T - s, T), pW = F(T - w, T), ans = F(T - w, T - s);
        return {
          prompt: `A bus comes every ${n(T)} minutes, and you arrive at a random time, so your wait ${V("W")} is uniform on [0, ${n(T)}]. You have already waited ${n(s)} minute${s === 1 ? "" : "s"}. What is the probability that your total wait exceeds ${n(w)} minutes?`,
          steps: [
            `P(${V("W")} &gt; ${n(s)}) = ${M.frac(`${n(T)} − ${n(s)}`, n(T))} = ${M.f(pS)} and P(${V("W")} &gt; ${n(w)}) = ${M.frac(`${n(T)} − ${n(w)}`, n(T))} = ${M.f(pW)}.`,
            `P(${V("W")} &gt; ${n(w)} | ${V("W")} &gt; ${n(s)}) = ${M.frac(M.f(pW), M.f(pS))} = ${M.frac(n(T - w), n(T - s))}${ans.d !== T - s ? ` = ${M.f(ans)}` : ""}: given the wait so far, the bus is equally likely to come at any moment of the remaining [${n(s)}, ${n(T)}].`,
            `Unlike an exponential wait, the time already spent matters: before you started waiting, the chance was only ${M.f(pW)}.`,
          ],
          ...exact(ans), vals: { Ts: T - s, Tw: T - w, pS: fv(pS), pW: fv(pW), ans: fv(ans) }, params: { T, s, w },
        };
      },
    },

    // ---- D.6 Normal -------------------------------------------------------------------------------------------------
    "D.6": {
      title: "The normal distribution",
      generate(r, level) {
        const SC = [["IQ scores", 100, 15, ""], ["Adult heights", 170, 8, " cm"], ["Exam scores", 70, 10, ""], ["Battery lifetimes", 500, 40, " hours"], ["Coffee fills", 250, 5, " mL"]];
        const curve = (mu, sg) => `exp(-(x-(${mu}))^2/(2*${sg}^2))/(${sg}*sqrt(2*pi))`;
        const gview = (mu, sg) => [mu - 4 * sg, mu + 4 * sg, -0.05 / sg, 0.5 / sg];
        if (level === 1) {
          const [what, mu, sg, u] = r.pick(SC), kind = r.int(0, 4), k = r.int(1, 3);
          const W = [68, 95, 99.7][k - 1];
          const sd = (j) => `${n(mu)} ${j < 0 ? "−" : "+"} ${Math.abs(j) === 1 ? "" : `${n(Math.abs(j))} × `}${n(sg)} = ${n(mu + j * sg)}`;
          let bnd, ans, steps, ask;
          if (kind === 0) {
            bnd = [mu - k * sg, mu + k * sg]; ans = W; ask = `between ${n(bnd[0])}${u} and ${n(bnd[1])}${u}`;
            steps = [`${n(bnd[0])} and ${n(bnd[1])} are ${n(k)} standard deviation${k === 1 ? "" : "s"} either side of the mean: ${sd(-k)} and ${sd(k)}.`, `The 68–95–99.7 rule: ${fmt(W)}% lies within ${n(k)} SD of the mean.`];
          } else if (kind <= 2) {
            const above = kind === 1;
            bnd = [above ? mu + k * sg : mu - k * sg]; ans = (100 - W) / 2; ask = `${above ? "above" : "below"} ${n(bnd[0])}${u}`;
            steps = [`${n(bnd[0])} is ${n(k)} SD ${above ? "above" : "below"} the mean: ${sd(above ? k : -k)}.`, `${fmt(W)}% lies within ${n(k)} SD, so 100 − ${fmt(W)} = ${fmt(100 - W)}% lies outside, split equally between the two tails by symmetry.`, `${M.frac(fmt(100 - W), "2")} = ${fmt(ans)}%.`];
          } else if (kind === 3) {
            bnd = [mu, mu + k * sg]; ans = W / 2; ask = `between ${n(bnd[0])}${u} and ${n(bnd[1])}${u}`;
            steps = [`${n(bnd[0])} is the mean and ${n(bnd[1])} is ${n(k)} SD above it: ${sd(k)}.`, `${fmt(W)}% lies within ${n(k)} SD on both sides; by symmetry half of that lies between the mean and ${n(k)} SD above: ${M.frac(fmt(W), "2")} = ${fmt(ans)}%.`];
          } else {
            bnd = [mu - sg, mu + 2 * sg]; ans = 81.5; ask = `between ${n(bnd[0])}${u} and ${n(bnd[1])}${u}`;
            steps = [`${n(bnd[0])} is 1 SD below the mean (${sd(-1)}) and ${n(bnd[1])} is 2 SD above (${sd(2)}).`, `From 1 SD below up to the mean: ${M.frac("68", "2")} = 34%. From the mean up to 2 SD above: ${M.frac("95", "2")} = 47.5%.`, `Total: 34 + 47.5 = ${fmt(ans)}%.`];
          }
          return {
            prompt: `${what} are roughly normal with mean ${n(mu)}${u} and standard deviation ${n(sg)}${u}. Using the 68–95–99.7 rule, what percentage fall ${ask}?`,
            graph: graph({ view: gview(mu, sg), grid: false, items: [{ t: "fn", e: curve(mu, sg) }] }),
            steps, ...exactDec(ans, "%"), vals: { bnd, W, ans, rest: 100 - W }, params: { mu, sg, kind, k }, consts: [68, 95, 99.7, 34, 47.5, 100, 3],
          };
        }
        if (level === 2) {
          for (;;) {
            const [what, mu, sg, u] = r.pick(SC), xv = mu + r.int(-Math.round(2.5 * sg), Math.round(2.5 * sg));
            const zh = (100 * (xv - mu)) / sg;
            if (xv === mu || !Number.isInteger(zh)) continue;
            const z = zh / 100, ph = Phi(z), below = r.chance(0.5), ans = below ? ph : 1 - ph;
            if (!agrees(ans, below ? rd(ph, 4) : 1 - rd(ph, 4), 4)) continue;
            return {
              prompt: `${what} are normal with mean ${n(mu)}${u} and standard deviation ${n(sg)}${u}. What fraction are ${below ? "below" : "above"} ${n(xv)}${u}? Round to 4 decimal places.`,
              graph: graph({ view: gview(mu, sg), grid: false, items: [{ t: "fn", e: curve(mu, sg) }, { t: "vline", x: xv, dash: true, role: "secondary" }] }),
              steps: [
                `Standardize: ${V("z")} = ${M.frac(`${n(xv)} − ${n(mu)}`, n(sg))} = ${fmt(z)}.`,
                `From a standard normal table (or a calculator), Φ(${fmt(z)}) ${eqa(ph, 4)}.`,
                below ? `P(${V("X")} &lt; ${n(xv)}) = Φ(${fmt(z)}) ${eqa(ans, 4)}.` : `P(${V("X")} &gt; ${n(xv)}) = 1 − Φ(${fmt(z)}) = 1 − ${fmt(ph, 4)} ${eqa(ans, 4)}.`,
              ],
              ...rounded(ans, 4), vals: { z, ph, ans }, params: { mu, sg, xv, below: below ? 1 : 0 }, consts: [4],
            };
          }
        }
        for (;;) {
          const [what, mu, sg, u] = r.pick(SC), a = mu + r.int(-Math.round(2.5 * sg), Math.round(1.5 * sg)), b = r.int(a + 1, mu + Math.round(2.5 * sg));
          const z1h = (100 * (a - mu)) / sg, z2h = (100 * (b - mu)) / sg;
          if (!Number.isInteger(z1h) || !Number.isInteger(z2h)) continue;
          const z1 = z1h / 100, z2 = z2h / 100, p1 = Phi(z1), p2 = Phi(z2), ans = p2 - p1, route = rd(p2, 4) - rd(p1, 4);
          if (ans < 0.05 || !agrees(ans, route, 3)) continue;
          return {
            prompt: `${what} are normal with mean ${n(mu)}${u} and standard deviation ${n(sg)}${u}. What fraction lie between ${n(a)}${u} and ${n(b)}${u}? Round to 3 decimal places.`,
            graph: graph({ view: gview(mu, sg), grid: false, items: [{ t: "fn", e: curve(mu, sg) }, { t: "vline", x: a, dash: true, role: "secondary" }, { t: "vline", x: b, dash: true, role: "secondary" }] }),
            steps: [
              `Standardize both ends: ${M.sub(V("z"), "1")} = ${M.frac(`${n(a)} − ${n(mu)}`, n(sg))} = ${fmt(z1)} and ${M.sub(V("z"), "2")} = ${M.frac(`${n(b)} − ${n(mu)}`, n(sg))} = ${fmt(z2)}.`,
              `From a table: Φ(${fmt(z2)}) ${eqa(p2, 4)} and Φ(${fmt(z1)}) ${eqa(p1, 4)}.`,
              `P = Φ(${fmt(z2)}) − Φ(${fmt(z1)}) ≈ ${fmt(p2, 4)} − ${fmt(p1, 4)} = ${fmt(route, 4)}, which rounds to ${fmt(ans, 3)}.`,
            ],
            ...rounded(ans, 3), vals: { z1, z2, p1, p2, route, ans }, params: { mu, sg, a, b }, consts: [3],
          };
        }
      },
    },

    // ---- D.7 Student's t ---------------------------------------------------------------------------------------------
    "D.7": {
      title: "Student's t distribution",
      generate(r, level) {
        if (level === 1) {
          const nu = r.int(3, 30), v = F(nu, nu - 2);
          return {
            prompt: `Find the variance of a ${V("t")} distribution with ν = ${n(nu)} degrees of freedom.`,
            steps: [
              `For ν &gt; 2, Var(${V("T")}) = ${M.frac("ν", "ν − 2")}.`,
              `${M.frac(n(nu), `${n(nu)} − 2`)} = ${M.frac(n(nu), n(nu - 2))}${v.d !== nu - 2 ? ` = ${M.f(v)}` : ""}. It exceeds 1, the standard normal's variance: the heavier tails spread the distribution out.`,
            ],
            ...exact(v), vals: { nu2: nu - 2, v: fv(v) }, params: { nu },
          };
        }
        if (level === 2) {
          for (;;) {
            const rn = r.int(2, 8), nn = rn * rn, s = r.int(2, 12), dt = r.nonzero(-30, 30), mu0 = r.int(10, 100);
            const t = F(dt * rn, 10 * s);
            if (Math.abs(t.value * 100 - Math.round(t.value * 100)) > 1e-9 || Math.abs(t.value) > 6) continue;
            const diff = dt / 10, xbar = (10 * mu0 + dt) / 10;
            return {
              prompt: `A sample of ${n(nn)} light bulbs has mean lifetime ${fmt(xbar)} hundred hours and standard deviation ${V("s")} = ${n(s)} hundred hours. Compute the ${V("t")} statistic for testing whether the true mean is ${n(mu0)} hundred hours.`,
              steps: [
                `${V("t")} = ${M.frac(`${M.v("x̄")} − ${M.sub("μ", "0")}`, `${V("s")}/${M.sqrt(V("n"))}`)} = ${M.frac(`(${M.v("x̄")} − ${M.sub("μ", "0")})${M.sqrt(V("n"))}`, V("s"))}.`,
                `${fmt(xbar)} − ${n(mu0)} = ${fmt(diff)} and ${M.sqrt(n(nn))} = ${n(rn)}.`,
                `${V("t")} = ${M.frac(`${np(diff)} × ${n(rn)}`, n(s))} = ${fmt(t.value)}, on ${n(nn)} − 1 = ${n(nn - 1)} degrees of freedom.`,
              ],
              ...exactDec(t.value), vals: { diff, rn, t: t.value, df: nn - 1 }, params: { nn, s, xbar, mu0 },
            };
          }
        }
        const m = r.pick([2, 4, 5, 10, 20, 25, 50]), Vv = 1 + 1 / m, num = 2 * Vv, den = 1 / m, nu = 2 * m + 2;
        return {
          prompt: `A ${V("t")} distribution with ν degrees of freedom has variance ${M.frac("ν", "ν − 2")}, more than the normal's 1. What is the smallest ν for which the variance is at most ${fmt(Vv)}?`,
          steps: [
            `${M.frac("ν", "ν − 2")} ≤ ${fmt(Vv)}. Multiply by ν − 2 (positive): ν ≤ ${fmt(Vv)}ν − ${fmt(num)}.`,
            `Rearrange: ${fmt(num)} ≤ ${fmt(den)}ν, so ν ≥ ${M.frac(fmt(num), fmt(den))} = ${n(nu)}.`,
            `The smallest such ν is ${n(nu)}. (Check: ${M.frac(n(nu), n(nu - 2))} = ${fmt(Vv)}.)`,
          ],
          ...exact(nu), vals: { Vv, num, den, nu, nu2: nu - 2 }, params: { m },
        };
      },
    },

    // ---- D.8 Exponential -------------------------------------------------------------------------------------------
    "D.8": {
      title: "The exponential distribution",
      generate(r, level) {
        if (level === 1) {
          const lam = r.pick([2, 3, 4, 5, 6, 10, 12, 15, 20, 30]), mins = 60 / lam;
          return {
            prompt: `Calls reach a switchboard at a rate of λ = ${n(lam)} per hour, so the time between calls is exponential. What is the mean time between calls, in minutes?`,
            steps: [`For an exponential distribution E[${V("X")}] = ${M.frac("1", "λ")} = ${M.frac("1", n(lam))} hour.`, `${M.frac("1", n(lam))} × 60 = ${n(mins)} minutes.`],
            ...exact(mins, " minutes"), vals: { mins }, params: { lam }, consts: [60],
          };
        }
        if (level === 2) {
          for (;;) {
            const mean = r.int(2, 10), xm = r.int(1, 15), u = F(xm, mean), e = Math.exp(-u.value), ans = 1 - e;
            if (xm === mean || !agrees(ans, 1 - rd(e, 6), 4)) continue;
            return {
              prompt: `At a quiet shop the time until the next customer is exponential with mean ${n(mean)} minutes. What is the probability that a customer arrives within ${n(xm)} minute${xm === 1 ? "" : "s"}? Round to 4 decimal places.`,
              steps: [
                `The rate is λ = ${M.frac("1", "mean")} = ${M.frac("1", n(mean))} per minute, and P(${V("X")} ≤ ${V("x")}) = 1 − ${M.sup("e", `−λ${V("x")}`)}.`,
                `λ${V("x")} = ${M.frac(n(xm), n(mean))}${u.d !== mean ? ` = ${M.f(u)}` : ""}, and ${M.sup("e", `−${M.f(u)}`)} ${eqa(e, 6)}.`,
                `P = 1 − ${fmt(e, 6)} ${eqa(ans, 4)}.`,
              ],
              ...rounded(ans, 4), vals: { u: fv(u), e, ans }, params: { mean, xm }, consts: [4],
            };
          }
        }
        for (;;) {
          const mean = r.pick([1000, 1500, 2000, 2500, 4000, 5000]), s = r.pick([500, 1000, 2000, 3000]), t = r.pick([200, 500, 800, 1000, 1500, 2000]);
          const u = t / mean, ans = Math.exp(-u);
          if (!agrees(ans, ans, 4)) continue;
          return {
            prompt: `An LED's lifetime is exponential with mean ${P.grouped(mean)} hours. One has already run ${P.grouped(s)} hours. What is the probability that it is still working at ${P.grouped(s + t)} hours? Round to 4 decimal places.`,
            steps: [
              `P(${V("X")} &gt; ${P.grouped(s + t)} | ${V("X")} &gt; ${P.grouped(s)}) = ${M.frac(M.sup("e", `−λ · ${n(s + t)}`), M.sup("e", `−λ · ${n(s)}`))} = ${M.sup("e", `−λ · ${n(t)}`)}: the exponential is memoryless, so the ${P.grouped(s)} hours already run do not matter.`,
              `λ = ${M.frac("1", n(mean))} per hour, so λ · ${n(t)} = ${M.frac(n(t), n(mean))} = ${fmt(u)}.`,
              `${M.sup("e", `−${fmt(u)}`)} ${eqa(ans, 4)}.`,
            ],
            ...rounded(ans, 4), vals: { st: s + t, u, ans }, params: { mean, s, t }, consts: [4],
          };
        }
      },
    },

    // ---- D.9 Gamma ------------------------------------------------------------------------------------------------
    "D.9": {
      title: "The gamma distribution",
      generate(r, level) {
        if (level === 1) {
          const k = r.int(1, 8), th = r.pick([0.5, 1, 2, 3, 4, 5]), askVar = r.chance(0.5);
          const mean = k * th, th2 = th * th, v = k * th2;
          return {
            prompt: `${V("X")} ~ Gamma(${V("k")} = ${n(k)}, θ = ${fmt(th)}). Find ${askVar ? `Var(${V("X")})` : `E[${V("X")}]`}.`,
            steps: askVar ? [`Var(${V("X")}) = ${V("k")}${M.sup("θ", "2")}.`, `${n(k)} × ${M.sup(fmt(th), "2")} = ${n(k)} × ${fmt(th2)} = ${fmt(v)}.`]
              : [`E[${V("X")}] = ${V("k")}θ.`, `${n(k)} × ${fmt(th)} = ${fmt(mean)}.`],
            ...exactDec(askVar ? v : mean), vals: { mean, th2, v }, params: { k, th, askVar: askVar ? 1 : 0 },
          };
        }
        if (level === 2) {
          const k = r.int(2, 9), th = r.pick([F(1, 2), F(2), F(3), F(4), F(5), F(3, 2)]), mean = th.mul(k), v = th.mul(th).mul(k), askK = r.chance(0.5);
          return {
            prompt: `A gamma distribution has mean ${fmt(mean.value)} and variance ${fmt(v.value)}. Find ${askK ? `its shape ${V("k")}` : "its scale θ"}.`,
            steps: [
              `The mean is ${V("k")}θ = ${fmt(mean.value)} and the variance is ${V("k")}${M.sup("θ", "2")} = ${fmt(v.value)}.`,
              `Divide the variance by the mean: θ = ${M.frac(fmt(v.value), fmt(mean.value))} = ${fmt(th.value)}.`,
              `Then ${V("k")} = ${M.frac(fmt(mean.value), fmt(th.value))} = ${n(k)}.`,
            ],
            ...exactDec(askK ? k : th.value), vals: { th: th.value, k }, params: { mean: mean.value, v: v.value, askK: askK ? 1 : 0 },
          };
        }
        for (;;) {
          const lam = r.pick([2, 3, 4, 5, 6, 10, 12, 15, 20, 30]), k = r.int(2, 10), th = 60 / lam, mean = k * th, rk = Math.sqrt(k), sd = th * rk;
          if (Number.isInteger(rk) && r.chance(0.5)) continue;
          if (!agrees(sd, th * rd(rk, 6), 2)) continue;
          return {
            prompt: `A server waits until ${n(k)} requests have arrived, then processes them as a batch. Requests arrive as a Poisson process at ${n(lam)} per hour, so the wait is Gamma(${V("k")} = ${n(k)}, θ = ${M.frac("1", "λ")}). Find the standard deviation of the wait, in minutes. Round to 2 decimal places.`,
            steps: [
              `θ = ${M.frac("1", n(lam))} hour = ${n(th)} minutes, the mean gap between arrivals. The mean wait is ${V("k")}θ = ${n(k)} × ${n(th)} = ${n(mean)} minutes.`,
              `Var = ${V("k")}${M.sup("θ", "2")}, so SD = θ${M.sqrt(V("k"))} = ${n(th)}${M.sqrt(n(k))}.`,
              Number.isInteger(rk) ? `${M.sqrt(n(k))} = ${n(rk)}, so SD = ${n(th)} × ${n(rk)} = ${n(sd)} minutes.` : `${M.sqrt(n(k))} ${eqa(rk, 6)}, so SD ≈ ${n(th)} × ${fmt(rk, 6)} ${eqa(sd, 2)} minutes.`,
            ],
            ...rounded(sd, 2, " minutes"), vals: { th, mean, rk, sd }, params: { lam, k }, consts: [60],
          };
        }
      },
    },

    // ---- D.10 Beta ------------------------------------------------------------------------------------------------------
    "D.10": {
      title: "The beta distribution",
      generate(r, level) {
        if (level === 1) {
          const a = r.int(1, 9), b = r.int(1, 9), mu = F(a, a + b);
          return {
            prompt: `Find the mean of Beta(α = ${n(a)}, β = ${n(b)}).`,
            steps: [`E[${V("X")}] = ${M.frac("α", "α + β")} = ${M.frac(n(a), `${n(a)} + ${n(b)}`)} = ${M.frac(n(a), n(a + b))}${mu.d !== a + b ? ` = ${M.f(mu)}` : ""}.`],
            ...exact(mu), vals: { s: a + b, mu: fv(mu) }, params: { a, b },
          };
        }
        if (level === 2) {
          const a = r.int(1, 6), b = r.int(1, 6), s = a + b, ab = a * b, s2 = s * s, s1 = s + 1, v = F(ab, s2 * s1);
          return {
            prompt: `Find the variance of Beta(α = ${n(a)}, β = ${n(b)}), using ${M.eq(`Var = ${M.frac("αβ", `${M.sup("(α + β)", "2")}(α + β + 1)`)}`)}`,
            steps: [
              `α + β = ${n(s)}, so ${M.sup("(α + β)", "2")} = ${n(s2)} and α + β + 1 = ${n(s1)}.`,
              `Var = ${M.frac(`${n(a)} · ${n(b)}`, `${n(s2)} · ${n(s1)}`)} = ${M.frac(n(ab), n(s2 * s1))}${v.d !== s2 * s1 ? ` = ${M.f(v)}` : ""}.`,
            ],
            ...exact(v), vals: { s, s2, s1, ab, den: s2 * s1, v: fv(v) }, params: { a, b },
          };
        }
        for (;;) {
          const a = r.int(1, 5), b = r.int(1, 5), nn = r.int(5, 30), k = r.int(0, nn), A = a + k, B = b + nn - k, post = F(A, A + B), prior = F(a, a + b);
          if (post.eq(prior)) continue;
          return {
            prompt: `Your prior belief about a new button's click-through rate is Beta(${n(a)}, ${n(b)}). Of ${n(nn)} visitors, ${n(k)} click it. What is the posterior mean of the click-through rate?`,
            steps: [
              `The prior mean was ${M.frac(n(a), `${n(a)} + ${n(b)}`)} = ${M.f(prior)}.`,
              `A beta prior with binomial data gives a beta posterior: add the successes to α and the failures to β. Beta(${n(a)} + ${n(k)}, ${n(b)} + ${n(nn - k)}) = Beta(${n(A)}, ${n(B)}).`,
              `Posterior mean: ${M.frac(n(A), `${n(A)} + ${n(B)}`)} = ${M.frac(n(A), n(A + B))}${post.d !== A + B ? ` = ${M.f(post)}` : ""}.`,
            ],
            ...exact(post), vals: { prior: fv(prior), fails: nn - k, A, B, AB: A + B, post: fv(post) }, params: { a, b, nn, k },
          };
        }
      },
    },

    // ---- D.11 Chi-square ---------------------------------------------------------------------------------------------
    "D.11": {
      title: "The chi-square distribution",
      generate(r, level) {
        const chi2 = M.sup("χ", "2");
        if (level === 1) {
          if (r.chance(0.5)) {
            const k = r.int(1, 30), v = 2 * k;
            return {
              prompt: `Find the variance of a chi-square distribution with ${n(k)} degree${k === 1 ? "" : "s"} of freedom.`,
              steps: [`${chi2} with ${V("k")} degrees of freedom is a sum of ${V("k")} independent squared standard normals; each ${M.sup(V("Z"), "2")} has mean 1 and variance 2.`, `Variances of independent terms add: 2 × ${n(k)} = ${n(v)}.`],
              ...exact(v), vals: { v }, params: { k, ask: 0 },
            };
          }
          const m = r.int(1, 5), k = 2 * m * m, v = 2 * k, sd = 2 * m;
          return {
            prompt: `Find the standard deviation of a chi-square distribution with ${n(k)} degrees of freedom.`,
            steps: [`Var = 2${V("k")} = 2 × ${n(k)} = ${n(v)}.`, `SD = ${M.sqrt(n(v))} = ${n(sd)}.`],
            ...exact(sd), vals: { v, sd }, params: { k, ask: 1 },
          };
        }
        if (level === 2) {
          for (;;) {
            const xv = r.pick([1, 2, 3, 4, 5, 6, 8, 5.99, 4.61, 9.21, 2.5]), half = xv / 2, ans = Math.exp(-half);
            if (!agrees(ans, ans, 4)) continue;
            return {
              prompt: `For a chi-square variable with 2 degrees of freedom, find P(${chi2} &gt; ${fmt(xv)}). Round to 4 decimal places.`,
              steps: [
                `With 2 degrees of freedom the density is ${M.frac("1", "2")}${M.sup("e", `−${x}/2`)} for ${x} ≥ 0: an exponential distribution with mean 2.`,
                `So P(${chi2} &gt; ${V("x")}) = ${M.sup("e", `−${V("x")}/2`)} = ${M.sup("e", `−${fmt(half)}`)} ${eqa(ans, 4)}.`,
              ],
              ...rounded(ans, 4), vals: { half, ans }, params: { xv }, consts: [4],
            };
          }
        }
        for (;;) {
          const k = r.pick([4, 5, 6]), E = r.pick([10, 20, 25, 50]), N = k * E;
          const d = Array.from({ length: k }, () => r.int(-Math.floor(E / 2), Math.floor(E / 2)));
          d[k - 1] -= d.reduce((a, b) => a + b, 0);
          if (Math.abs(d[k - 1]) > E / 2 || d.every((z) => z === 0)) continue;
          const O = d.map((z) => E + z), sq = d.map((z) => z * z), ss = sq.reduce((a, b) => a + b, 0), chi = ss / E;
          const label = k === 6 ? `A die is rolled ${n(N)} times.` : k === 4 ? `A spinner with four equal colors is spun ${n(N)} times.` : `A courier logs ${n(N)} deliveries over the five weekdays.`;
          const cats = k === 6 ? ["one", "two", "three", "four", "five", "six"] : k === 4 ? ["red", "blue", "green", "yellow"] : ["Mon", "Tue", "Wed", "Thu", "Fri"];
          return {
            prompt: `${label} To test whether all outcomes are equally likely, compute the chi-square statistic for these counts.${M.table(cats, [O.map((o) => n(o))])}`,
            steps: [
              `Expected count in each of the ${n(k)} categories: ${M.frac(n(N), n(k))} = ${n(E)}.`,
              `Differences ${V("O")} − ${V("E")}: ${d.map((z) => n(z)).join(", ")}. Squared: ${sq.map((v) => n(v)).join(", ")}; their sum is ${n(ss)}.`,
              `${chi2} = Σ${M.frac(M.sup(`(${V("O")} − ${V("E")})`, "2"), V("E"))} = ${M.frac(n(ss), n(E))} = ${fmt(chi)}, on ${n(k)} − 1 = ${n(k - 1)} degrees of freedom.`,
            ],
            ...exactDec(chi), vals: { E, d, sq, ss, chi, df: k - 1 }, params: { N, k, O },
          };
        }
      },
    },

    // ---- D.12 Log-normal ------------------------------------------------------------------------------------------------
    "D.12": {
      title: "The log-normal distribution",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const mu = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]), sg = r.pick([0.25, 0.5, 1]), med = Math.exp(mu);
            if (!agrees(med, med, 2)) continue;
            return {
              prompt: `ln ${V("X")} is normal with mean μ = ${fmt(mu)} and standard deviation σ = ${fmt(sg)}. Find the median of ${V("X")}, rounded to 2 decimal places.`,
              steps: [
                `The median of ln ${V("X")} is μ = ${fmt(mu)} (a normal is symmetric). Since ln is increasing, the median of ${V("X")} is ${M.sup("e", "μ")}; σ does not enter.`,
                `${M.sup("e", fmt(mu))} ${eqa(med, 2)}.`,
              ],
              ...rounded(med, 2), vals: { med }, params: { mu, sg },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const mu = r.pick([0.5, 1, 1.5, 2, 2.5, 3]), sg = r.pick([0.2, 0.4, 0.5, 0.6, 0.8, 1]), s2 = sg * sg, h = s2 / 2, ex = mu + h, mean = Math.exp(ex), med = Math.exp(mu);
            if (!agrees(mean, mean, 2)) continue;
            return {
              prompt: `ln ${V("X")} is normal with μ = ${fmt(mu)} and σ = ${fmt(sg)}. Find the mean of ${V("X")}, ${M.sup("e", `μ + ${M.sup("σ", "2")}/2`)}, rounded to 2 decimal places.`,
              steps: [
                `${M.frac(M.sup("σ", "2"), "2")} = ${M.frac(fmt(s2), "2")} = ${fmt(h)}, so the exponent is ${fmt(mu)} + ${fmt(h)} = ${fmt(ex)}.`,
                `${M.sup("e", fmt(ex))} ${eqa(mean, 2)}.`,
                `This exceeds the median ${M.sup("e", fmt(mu))} ${eqa(med, 2)}: the long right tail pulls the mean up.`,
              ],
              ...rounded(mean, 2), vals: { s2, h, ex, mean, med }, params: { mu, sg },
            };
          }
        }
        for (;;) {
          const m = r.pick([40, 50, 60]), sg = r.pick([0.4, 0.5, 0.6, 0.8]), ratio = r.pick([1.5, 2, 3, 0.5]), xv = m * ratio;
          const L = Math.log(ratio), z = L / sg, z2 = rd(z, 2), tab = 1 - Phi(z2), ans = 1 - Phi(z);
          if (ans < 0.01 || !agrees(ans, tab, 3) || !agrees(tab, tab, 4)) continue;
          return {
            prompt: `Household incomes in a town are log-normal: the median is $${n(m)} thousand and ln(income) has standard deviation σ = ${fmt(sg)}. What fraction of households earn more than $${fmt(xv)} thousand? Round to 3 decimal places.`,
            steps: [
              `The median is ${M.sup("e", "μ")}, so μ = ln ${n(m)}. Then P(${V("X")} &gt; ${fmt(xv)}) = P(ln ${V("X")} &gt; ln ${fmt(xv)}) = 1 − Φ(${V("z")}) with ${V("z")} = ${M.frac(`ln ${fmt(xv)} − ln ${n(m)}`, "σ")} = ${M.frac(`ln ${fmt(ratio)}`, fmt(sg))}.`,
              `ln ${fmt(ratio)} ${eqa(L, 4)}, so ${V("z")} ${eqa(z, 4)}, about ${fmt(z2, 2)} for the table.`,
              `1 − Φ(${fmt(z2, 2)}) ${eqa(tab, 4)}, which rounds to ${fmt(ans, 3)}.`,
            ],
            ...rounded(ans, 3), vals: { xv, L, z, z2, tab, ans }, params: { m, sg, ratio }, consts: [3],
          };
        }
      },
    },

    // ---- D.13 Pareto ----------------------------------------------------------------------------------------------
    "D.13": {
      title: "The Pareto distribution",
      generate(r, level) {
        const xm_ = M.sub(V("x"), "m");
        if (level === 1) {
          const al = r.int(1, 3), xm = r.pick([1, 2, 5, 10, 20]), k = r.int(2, 5), xv = xm * k, ans = F(1, k).pow(al);
          return {
            prompt: `${V("X")} is Pareto with minimum ${xm_} = ${n(xm)} and α = ${n(al)}, so P(${V("X")} &gt; ${V("x")}) = ${M.sup(`(${M.frac(xm_, V("x"))})`, "α")}. Find P(${V("X")} &gt; ${n(xv)}).`,
            steps: [`P(${V("X")} &gt; ${n(xv)}) = ${M.sup(`(${M.frac(n(xm), n(xv))})`, n(al))}${xm === 1 ? "" : ` = ${M.sup(`(${M.frac("1", n(k))})`, n(al))}`}.`, `${M.sup(`(${M.frac("1", n(k))})`, n(al))} = ${M.f(ans)}.`],
            ...exact(ans), vals: { k, ans: fv(ans) }, params: { al, xm, xv },
          };
        }
        if (level === 2) {
          const al = r.pick([F(3, 2), F(2), F(5, 2), F(3), F(4), F(5)]), xm = r.int(1, 10), num = al.mul(xm), den = al.sub(1), mean = num.div(den);
          return {
            prompt: `Find the mean of a Pareto distribution with ${xm_} = ${n(xm)} and α = ${fmt(al.value)}, using ${M.eq(`E[${V("X")}] = ${M.frac(`α${xm_}`, "α − 1")} (α &gt; 1)`)}`,
            steps: [
              `α${xm_} = ${fmt(al.value)} × ${n(xm)} = ${fmt(num.value)} and α − 1 = ${fmt(den.value)}.`,
              `E[${V("X")}] = ${M.frac(fmt(num.value), fmt(den.value))}${M.frac(fmt(num.value), fmt(den.value)) === M.f(mean) ? "" : ` = ${M.f(mean)}`}${mean.isInt() ? "" : ` ${eqa(mean.value, 4)}`}. (For α ≤ 1 the tail is so heavy that the mean is infinite.)`,
            ],
            ...exact(mean), vals: { num: num.value, den: den.value, mean: fv(mean) }, params: { al: al.value, xm },
          };
        }
        const [al, rat] = r.pick([[1, 2], [1, 4], [1, 5], [2, 2], [2, 3], [2, 4], [3, 2], [1.5, 4], [1.5, 9]]), a = r.pick([2, 4, 5, 10]), b = a * rat;
        const ans = al === 1.5 ? F(1, Math.round(Math.pow(rat, 1.5))) : F(1, rat).pow(al);
        return {
          prompt: `File sizes on a server follow a Pareto distribution with ${xm_} = 1 MB and α = ${fmt(al)}. Among files larger than ${n(a)} MB, what fraction are larger than ${n(b)} MB?`,
          steps: [
            `P(${V("X")} &gt; ${n(b)} | ${V("X")} &gt; ${n(a)}) = ${M.frac(`P(${V("X")} &gt; ${n(b)})`, `P(${V("X")} &gt; ${n(a)})`)} = ${M.frac(M.sup(`(1/${n(b)})`, "α"), M.sup(`(1/${n(a)})`, "α"))} = ${M.sup(`(${M.frac(n(a), n(b))})`, "α")}.`,
            `${M.frac(n(a), n(b))} = ${M.frac("1", n(rat))}, and ${M.sup(`(${M.frac("1", n(rat))})`, fmt(al))} = ${M.f(ans)}${al === 1.5 ? ` (take the square root of ${M.frac("1", n(rat))}, then cube it)` : ""}.`,
            `Only the ratio ${n(b)}/${n(a)} matters: a Pareto tail looks the same at every scale.`,
          ],
          ...exact(ans), vals: { rat, ans: fv(ans) }, params: { al, a, b },
        };
      },
    },

    // ---- D.14 Negative binomial ----------------------------------------------------------------------------------
    "D.14": {
      title: "The negative binomial distribution",
      generate(r, level) {
        const ord = (k) => `${n(k)}${k % 10 === 1 && k !== 11 ? "st" : k % 10 === 2 && k !== 12 ? "nd" : k % 10 === 3 && k !== 13 ? "rd" : "th"}`;
        if (level === 1) {
          const rr = r.int(2, 6), p = r.pick([F(1, 2), F(1, 3), F(1, 4), F(2, 3), F(2, 5), F(3, 4)]), inv = F(1).div(p), mean = F(rr).div(p);
          return {
            prompt: `Each trial succeeds with probability ${M.f(p)}. On average, how many trials does it take to get ${n(rr)} successes?`,
            steps: [`Each success takes ${M.frac("1", V("p"))} = ${M.f(inv)} trials on average (a geometric wait), and the waits for the ${n(rr)} successes add up.`, `E[${V("X")}] = ${M.frac(V("r"), V("p"))} = ${n(rr)} ÷ ${M.f(p)} = ${M.f(mean)}.`],
            ...exact(mean), vals: { inv: fv(inv), mean: fv(mean) }, params: { rr, pn: p.n, pd: p.d },
          };
        }
        if (level === 2) {
          const rr = r.int(2, 3), k = r.int(rr + 1, rr + 3), p = r.pick([F(1, 2), F(1, 3), F(2, 3), F(1, 4)]), q = F(1).sub(p);
          const c = C(k - 1, rr - 1), pr = p.pow(rr), qk = q.pow(k - rr), ans = pr.mul(qk).mul(c);
          return {
            prompt: `Each trial succeeds with probability ${M.f(p)}. What is the probability that the ${ord(rr)} success comes on trial ${n(k)}? Give an exact fraction.`,
            steps: [
              `Trial ${n(k)} must succeed, and the first ${n(k - 1)} trials must hold exactly ${n(rr - 1)} success${rr === 2 ? "" : "es"}: C(${n(k - 1)}, ${n(rr - 1)}) = ${n(c)} arrangements.`,
              `${pw(p, n(rr))} = ${M.f(pr)} for the successes and ${pw(q, n(k - rr))} = ${M.f(qk)} for the ${n(k - rr)} failure${k - rr === 1 ? "" : "s"}.`,
              `P = ${n(c)} · ${M.f(pr)} · ${M.f(qk)} = ${M.f(ans)}.`,
            ],
            ...exact(ans), vals: { k1: k - 1, r1: rr - 1, c, pr: fv(pr), qk: fv(qk), kr: k - rr, ans: fv(ans), q: fv(q) }, params: { rr, k, pn: p.n, pd: p.d },
          };
        }
        for (;;) {
          const p = r.pick([0.6, 0.7, 0.75, 0.8, 0.9]), q = 1 - p, rr = r.int(2, 4), k = r.int(rr + 1, rr + 4);
          const c = C(k - 1, rr - 1), pr = Math.pow(p, rr), qk = Math.pow(q, k - rr), ans = c * pr * qk;
          if (!agrees(ans, c * rd(pr, 6) * rd(qk, 6), 4)) continue;
          return {
            prompt: `A basketball player makes each free throw with probability ${fmt(p)}, independently. What is the probability that her ${ord(rr)} make comes on her ${ord(k)} attempt? Round to 4 decimal places.`,
            steps: [
              `Attempt ${n(k)} is a make, and the first ${n(k - 1)} attempts hold exactly ${n(rr - 1)} make${rr === 2 ? "" : "s"}: C(${n(k - 1)}, ${n(rr - 1)}) = ${n(c)} arrangements.`,
              `${M.sup(fmt(p), n(rr))} ${eqa(pr, 6)} and ${M.sup(fmt(q), n(k - rr))} ${eqa(qk, 6)}.`,
              `P = ${n(c)} × ${fmt(pr, 6)} × ${fmt(qk, 6)} ${eqa(ans, 4)}.`,
            ],
            ...rounded(ans, 4), vals: { q, k1: k - 1, r1: rr - 1, kr: k - rr, c, pr, qk, ans }, params: { p, rr, k }, consts: [4],
          };
        }
      },
    },

    // ---- D.15 Hypergeometric ---------------------------------------------------------------------------------------
    "D.15": {
      title: "The hypergeometric distribution",
      generate(r, level) {
        if (level === 1) {
          const N = r.int(10, 60), K = r.int(2, N - 2), nn = r.int(2, Math.min(15, N - 1)), mean = F(nn * K, N);
          return {
            prompt: `An urn holds ${n(N)} balls, ${n(K)} of them red. You draw ${n(nn)} without replacement. What is the expected number of red balls?`,
            steps: [`Each draw, taken on its own, is red with probability ${M.frac(n(K), n(N))}; expectations add even without independence.`, `E[${V("X")}] = ${n(nn)} · ${M.frac(n(K), n(N))} = ${M.frac(n(nn * K), n(N))}${mean.d !== N ? ` = ${M.f(mean)}` : ""}.`],
            ...exact(mean), vals: { nK: nn * K, mean: fv(mean) }, params: { N, K, nn },
          };
        }
        if (level === 2) {
          const N = r.int(8, 15), K = r.int(3, N - 3), nn = r.int(3, 5), k = r.int(Math.max(1, nn - (N - K)), Math.min(nn, K));
          const a = C(K, k), b = C(N - K, nn - k), t = C(N, nn), ans = F(a * b, t);
          return {
            prompt: `A box of ${n(N)} bulbs contains ${n(K)} defective ones. You pick ${n(nn)} at random without replacement. What is the probability that exactly ${n(k)} ${k === 1 ? "is" : "are"} defective? Give an exact fraction.`,
            steps: [
              `Ways to choose ${n(k)} of the ${n(K)} defective: C(${n(K)}, ${n(k)}) = ${n(a)}. Ways to choose the other ${n(nn - k)} from the ${n(N - K)} good: C(${n(N - K)}, ${n(nn - k)}) = ${n(b)}.`,
              `All possible samples: C(${n(N)}, ${n(nn)}) = ${n(t)}.`,
              `P = ${M.frac(`${n(a)} · ${n(b)}`, n(t))} = ${M.frac(n(a * b), n(t))}${ans.d !== t ? ` = ${M.f(ans)}` : ""}.`,
            ],
            ...exact(ans), vals: { NK: N - K, nk: nn - k, a, b, t, ab: a * b, ans: fv(ans) }, params: { N, K, nn, k },
          };
        }
        const N = r.int(10, 30), K = r.int(1, 4), nn = r.int(3, 6), g = C(N - K, nn), t = C(N, nn), none = F(g, t), ans = F(1).sub(none);
        return {
          prompt: `A shipment of ${n(N)} laptops contains ${n(K)} with a hidden defect. An inspector tests ${n(nn)} chosen at random. What is the probability that she finds at least one defective laptop? Give an exact fraction.`,
          steps: [
            `Use the complement: P(at least one) = 1 − P(none).`,
            `P(none) = ${M.frac(`C(${n(N - K)}, ${n(nn)})`, `C(${n(N)}, ${n(nn)})`)} = ${M.frac(n(g), n(t))}${none.d !== t ? ` = ${M.f(none)}` : ""}: all ${n(nn)} come from the ${n(N - K)} good ones.`,
            `1 − ${M.f(none)} = ${M.f(ans)} ${eqa(ans.value, 4)}.`,
          ],
          ...exact(ans), vals: { NK: N - K, g, t, none: fv(none), ans: fv(ans) }, params: { N, K, nn },
        };
      },
    },

    // ---- D.16 Discrete uniform -------------------------------------------------------------------------------------
    "D.16": {
      title: "The discrete uniform distribution",
      generate(r, level) {
        const nn = r.pick([4, 6, 8, 10, 12, 20]);
        if (level === 1) {
          const mu = F(nn + 1, 2);
          return {
            prompt: `A fair ${n(nn)}-sided die shows 1 to ${n(nn)}. What is the expected value of a roll?`,
            steps: [`Each face has probability ${M.frac("1", n(nn))}, so the mean is the average of 1, …, ${n(nn)}: ${M.frac(`${V("n")} + 1`, "2")} = ${M.frac(n(nn + 1), "2")}${mu.d === 2 ? "" : ` = ${M.f(mu)}`}.`],
            ...exact(mu), vals: { n1: nn + 1, mu: fv(mu) }, params: { nn },
          };
        }
        if (level === 2) {
          const sq = nn * nn, v = F(sq - 1, 12);
          return {
            prompt: `A fair ${n(nn)}-sided die shows 1 to ${n(nn)}. Find the variance of a roll.`,
            steps: [`Var = ${M.frac(`${M.sup(V("n"), "2")} − 1`, "12")}.`, `${M.sup(n(nn), "2")} − 1 = ${n(sq - 1)}, so Var = ${M.frac(n(sq - 1), "12")}${v.d !== 12 ? ` = ${M.f(v)}` : ""}.`],
            ...exact(v), vals: { sq1: sq - 1, v: fv(v) }, params: { nn }, consts: [12],
          };
        }
        const m = r.pick([4, 6, 8]), s = r.int(2, 2 * m), sq = m * m;
        const pairs = [];
        for (let i = 1; i <= m; i++) { const j = s - i; if (j >= 1 && j <= m) pairs.push([i, j]); }
        const cnt = pairs.length, ans = F(cnt, sq);
        return {
          prompt: `Two fair ${n(m)}-sided dice are rolled. What is the probability that they sum to ${n(s)}?`,
          steps: [
            `There are ${n(m)} × ${n(m)} = ${n(sq)} equally likely ordered pairs.`,
            `Pairs summing to ${n(s)}: ${pairs.map(([i, j]) => `(${i}, ${j})`).join(", ")}: ${n(cnt)} of them.`,
            `P = ${M.frac(n(cnt), n(sq))}${ans.d !== sq ? ` = ${M.f(ans)}` : ""}.`,
          ],
          ...exact(ans), vals: { sq, pairs, cnt, ans: fv(ans) }, params: { m, s },
        };
      },
    },

    // ---- D.17 Weibull ------------------------------------------------------------------------------------------------
    "D.17": {
      title: "The Weibull distribution",
      generate(r, level) {
        const surv = `P(${V("X")} &gt; ${V("t")}) = ${M.sup("e", `−${M.sup(`(${V("t")}/λ)`, V("k"))}`)}`;
        if (level === 1) {
          const k = r.pick([0.5, 0.7, 0.8, 1, 1.5, 2, 3, 3.5]), lam = r.pick([2, 5, 10]), km1 = k - 1;
          const opts = ["decreasing failure rate (early, “infant mortality” failures)", "constant failure rate (random failures, like the exponential)", "increasing failure rate (wear-out)"];
          const index = k < 1 ? 0 : k === 1 ? 1 : 2;
          return {
            prompt: `Part lifetimes (in thousands of hours) follow a Weibull distribution with shape ${V("k")} = ${fmt(k)} and scale λ = ${n(lam)}. What kind of failures does it describe?`,
            steps: [
              `The Weibull failure (hazard) rate is ${V("h")}(${x}) = ${M.frac(V("k"), "λ")}${M.sup(`(${x}/λ)`, `${V("k")} − 1`)}.`,
              `${V("k")} − 1 = ${fmt(km1)}: ${k < 1 ? "a negative power, so the rate falls with age" : k === 1 ? "the power is 0, so the rate is constant" : "a positive power, so the rate rises with age"}.`,
              `So it describes a${index === 2 ? "n" : ""} ${opts[index]}.`,
            ],
            answer: { kind: "choice", options: opts, index }, answerText: opts[index], vals: { km1 }, params: { k, lam },
          };
        }
        if (level === 2) {
          for (;;) {
            const lam = r.pick([2, 4, 5, 10]), uu = r.pick([0.5, 0.8, 1.2, 1.5, 2]), k = r.pick([0.5, 1.5, 2, 3]), t = rd(lam * uu, 6);
            const uk = Math.pow(uu, k), ans = Math.exp(-uk);
            if (!agrees(ans, Math.exp(-rd(uk, 6)), 4)) continue;
            return {
              prompt: `Bearing lifetimes (thousands of hours) are Weibull with shape ${V("k")} = ${fmt(k)} and scale λ = ${n(lam)}, so ${surv}. What fraction survive past ${fmt(t)} thousand hours? Round to 4 decimal places.`,
              steps: [
                `${V("t")}/λ = ${fmt(t)}/${n(lam)} = ${fmt(uu)}.`,
                `${M.sup(fmt(uu), fmt(k))} ${eqa(uk, 6)}.`,
                `${M.sup("e", `−${fmt(uk, 6)}`)} ${eqa(ans, 4)}.`,
              ],
              ...rounded(ans, 4), vals: { uu, uk, ans }, params: { lam, k, t }, consts: [4],
            };
          }
        }
        for (;;) {
          const lam = r.pick([2, 5, 8, 10, 20]), k = r.pick([0.5, 1.5, 2, 3, 4]), inv = F(2, Math.round(2 * k)), base = Math.pow(Math.LN2, 1 / k), med = lam * base;
          const invT = inv.d === 1 ? n(inv.n) : `${inv.n}/${inv.d}`;
          if (!agrees(med, lam * rd(base, 6), 2)) continue;
          return {
            prompt: `Pump lifetimes (thousands of hours) are Weibull with shape ${V("k")} = ${fmt(k)} and scale λ = ${n(lam)}: ${surv}. Find the median lifetime. Round to 2 decimal places.`,
            steps: [
              `At the median ${V("m")} half survive: ${M.sup("e", `−${M.sup(`(${V("m")}/λ)`, V("k"))}`)} = ${M.frac("1", "2")}, so ${M.sup(`(${V("m")}/λ)`, V("k"))} = ln 2.`,
              `${V("m")} = λ${M.sup("(ln 2)", `1/${V("k")}`)}, and 1/${V("k")} = ${invT}, so ${M.sup("(ln 2)", invT)} ${eqa(base, 6)}.`,
              `${V("m")} = ${n(lam)} × ${fmt(base, 6)} ${eqa(med, 2)} thousand hours.`,
            ],
            ...rounded(med, 2, " thousand hours"), vals: { inv: fv(inv), base, med }, params: { lam, k },
          };
        }
      },
    },

    // ---- D.18 Laplace ---------------------------------------------------------------------------------------------
    "D.18": {
      title: "The Laplace distribution",
      generate(r, level) {
        if (level === 1) {
          const b = r.pick([0.5, 1, 1.5, 2, 3, 4, 5]), bb = b * b, v = 2 * bb;
          return {
            prompt: `Find the variance of a Laplace distribution with scale ${V("b")} = ${fmt(b)}.`,
            steps: [`Var = 2${M.sup(V("b"), "2")}.`, `2 × ${M.sup(fmt(b), "2")} = 2 × ${fmt(bb)} = ${fmt(v)}.`],
            ...exactDec(v), vals: { bb, v }, params: { b },
          };
        }
        if (level === 2) {
          for (;;) {
            const mu = r.int(-3, 3), b = r.pick([0.5, 1, 2, 4]), xv = r.int(-6, 6), d = Math.abs(xv - mu), u = d / b, e = Math.exp(-u), c = 1 / (2 * b), ans = c * e;
            if (!agrees(ans, c * rd(e, 6), 4)) continue;
            return {
              prompt: `Evaluate the Laplace density ${M.eq(`${V("f")}(${x}) = ${M.frac("1", `2${V("b")}`)}${M.sup("e", `−|${x} − μ|/${V("b")}`)}`)} with μ = ${n(mu)} and ${V("b")} = ${fmt(b)} at ${x} = ${n(xv)}. Round to 4 decimal places.`,
              steps: [
                `|${n(xv)} − ${np(mu)}| = ${n(d)}, and ${n(d)}/${fmt(b)} = ${fmt(u)}.`,
                `${M.frac("1", `2 × ${fmt(b)}`)} = ${fmt(c)} and ${M.sup("e", `−${fmt(u)}`)} ${eqa(e, 6)}.`,
                `${V("f")}(${n(xv)}) = ${fmt(c)} × ${fmt(e, 6)} ${eqa(ans, 4)}.`,
              ],
              ...rounded(ans, 4), vals: { d, u, c, e, ans }, params: { mu, b, xv }, consts: [4],
            };
          }
        }
        for (;;) {
          const b = r.pick([1, 2, 2.5, 4, 5]), t = r.int(1, 10), two = r.chance(0.5), u = t / b, e = Math.exp(-u), ans = two ? e : e / 2;
          if (!agrees(ans, two ? rd(e, 6) : rd(e, 6) / 2, 4)) continue;
          const tb = M.sup("e", `−${V("t")}/${V("b")}`);
          return {
            prompt: `A forecast's errors follow a Laplace distribution centered at 0 with scale ${V("b")} = ${fmt(b)} °C. What is the probability that an error is ${two ? `more than ${n(t)} °C in either direction` : `more than ${n(t)} °C too high`}? Round to 4 decimal places.`,
            steps: [
              `One tail: P(${V("X")} &gt; ${V("t")}) = ${M.frac("1", "2")}${tb}, half the mass decaying exponentially.${two ? ` Both tails together: P(|${V("X")}| &gt; ${V("t")}) = ${tb}.` : ""}`,
              `${n(t)}/${fmt(b)} = ${fmt(u)}, and ${M.sup("e", `−${fmt(u)}`)} ${eqa(e, 6)}.`,
              two ? `P ${eqa(ans, 4)}.` : `P = ${fmt(e, 6)} ÷ 2 ${eqa(ans, 4)}.`,
            ],
            ...rounded(ans, 4), vals: { u, e, ans }, params: { b, t, two: two ? 1 : 0 }, consts: [4],
          };
        }
      },
    },

    // ---- D.19 Cauchy -------------------------------------------------------------------------------------------------
    "D.19": {
      title: "The Cauchy distribution",
      generate(r, level) {
        const x0_ = M.sub(x, "0");
        const cdf = `${M.frac("1", "2")} + ${M.frac("1", "π")}arctan${M.frac(`${x} − ${x0_}`, "γ")}`;
        if (level === 1) {
          for (;;) {
            const g = r.pick([0.5, 1, 2, 2.5, 4, 5]), x0 = r.int(-5, 5), pg = Math.PI * g, ans = 1 / pg;
            if (!agrees(ans, 1 / rd(pg, 6), 4)) continue;
            return {
              prompt: `How tall is the peak of the Cauchy density with center ${x0_} = ${n(x0)} and scale γ = ${fmt(g)}? ${M.eq(`${V("f")}(${x}) = ${M.frac("1", `πγ[1 + ${M.sup(`((${x} − ${x0_})/γ)`, "2")}]`)}`)} Round to 4 decimal places.`,
              steps: [
                `The peak is at ${x} = ${n(x0)}, where the bracket is 1 + 0 = 1.`,
                `π × ${fmt(g)} ${eqa(pg, 6)}, so ${V("f")}(${n(x0)}) = ${M.frac("1", `π × ${fmt(g)}`)} ${eqa(ans, 4)}.`,
              ],
              ...rounded(ans, 4), vals: { pg, ans }, params: { g, x0 }, consts: [4],
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const g = r.pick([1, 2, 3, 4]), x0 = r.int(-5, 5), u = r.pick([-3, -2, -1, -0.5, 0.5, 1, 2, 3]), xv = x0 + u * g;
            if (!Number.isInteger(xv)) continue;
            const at = Math.atan(u), ans = 0.5 + at / Math.PI;
            if (!agrees(ans, 0.5 + rd(at, 6) / Math.PI, 4)) continue;
            return {
              prompt: `For a Cauchy distribution with center ${n(x0)} and scale ${n(g)}, find P(${V("X")} ≤ ${n(xv)}) = ${cdf}. Round to 4 decimal places.`,
              steps: [
                `${M.frac(`${n(xv)} − ${np(x0)}`, n(g))} = ${fmt(u)}.`,
                `arctan(${fmt(u)}) ${eqa(at, 6)}${Math.abs(u) === 1 ? `, which is ${u < 0 ? "−" : ""}${M.frac("π", "4")}` : ""}.`,
                `P = ${M.frac("1", "2")} + ${M.frac(fmt(at, 6), "π")} ${eqa(ans, 4)}.`,
              ],
              ...rounded(ans, 4), vals: { u, at, ans }, params: { g, x0, xv }, consts: [4],
            };
          }
        }
        for (;;) {
          const x0 = r.int(-5, 5), g = r.int(1, 4), q1 = x0 - g, q3 = x0 + g, c = r.int(q3 + 1, q3 + 8), u = F(c - x0, g);
          const at = Math.atan(u.value), ans = 0.5 - at / Math.PI;
          if (!agrees(ans, 0.5 - rd(at, 6) / Math.PI, 4)) continue;
          return {
            prompt: `Measurements follow a Cauchy distribution. Half of them fall between ${n(q1)} and ${n(q3)} (these are the quartiles). What fraction exceed ${n(c)}? Round to 4 decimal places.`,
            steps: [
              `A Cauchy CDF is ${cdf}, and arctan(±1) = ±${M.frac("π", "4")}, so the quartiles are ${x0_} ± γ.`,
              `${x0_} = ${M.frac(`${n(q1)} + ${np(q3)}`, "2")} = ${n(x0)} and γ = ${M.frac(`${n(q3)} − ${np(q1)}`, "2")} = ${n(g)}.`,
              `${M.frac(`${n(c)} − ${np(x0)}`, n(g))} = ${M.f(u)}, and arctan(${M.f(u)}) ${eqa(at, 6)}.`,
              `P(${V("X")} &gt; ${n(c)}) = ${M.frac("1", "2")} − ${M.frac(fmt(at, 6), "π")} ${eqa(ans, 4)}. (A normal tail this far out would be far thinner.)`,
            ],
            ...rounded(ans, 4), vals: { x0, g, u: fv(u), at, ans }, params: { q1, q3, c }, consts: [4],
          };
        }
      },
    },

    // ---- D.20 F-distribution ---------------------------------------------------------------------------------------
    "D.20": {
      title: "The F distribution",
      generate(r, level) {
        const d1_ = M.sub(V("d"), "1"), d2_ = M.sub(V("d"), "2");
        if (level === 1) {
          const d1 = r.int(2, 20), d2 = r.int(3, 40), mu = F(d2, d2 - 2);
          return {
            prompt: `Find the mean of an ${V("F")} distribution with ${d1_} = ${n(d1)} and ${d2_} = ${n(d2)} degrees of freedom.`,
            steps: [`E[${V("F")}] = ${M.frac(d2_, `${d2_} − 2`)} for ${d2_} &gt; 2; it does not depend on ${d1_}.`, `${M.frac(n(d2), `${n(d2)} − 2`)} = ${M.frac(n(d2), n(d2 - 2))}${mu.n !== d2 || mu.d !== d2 - 2 ? ` = ${M.f(mu)}` : ""}.`],
            ...exact(mu), vals: { d22: d2 - 2, mu: fv(mu) }, params: { d1, d2 },
          };
        }
        if (level === 2) {
          const s1 = r.int(3, 12), s2 = r.int(2, s1 - 1), n1 = r.int(5, 30), n2 = r.int(5, 30), v1 = s1 * s1, v2 = s2 * s2, Fv = F(v1, v2);
          return {
            prompt: `Two machines fill bottles. A sample of ${n(n1)} from machine A has standard deviation ${n(s1)} mL; a sample of ${n(n2)} from machine B has ${n(s2)} mL. Compute the ${V("F")} statistic comparing their variances (A over B).`,
            steps: [
              `${V("F")} compares variances, not standard deviations: ${M.sup(n(s1), "2")} = ${n(v1)} and ${M.sup(n(s2), "2")} = ${n(v2)}.`,
              `${V("F")} = ${M.frac(n(v1), n(v2))}${Fv.d !== v2 ? ` = ${M.f(Fv)}` : ""}${Fv.isInt() ? "" : ` ${eqa(Fv.value, 4)}`}, on (${n(n1 - 1)}, ${n(n2 - 1)}) degrees of freedom.`,
            ],
            ...exact(Fv), vals: { v1, v2, F: fv(Fv), df1: n1 - 1, df2: n2 - 1 }, params: { s1, s2, n1, n2 },
          };
        }
        const k = r.int(3, 5), per = r.int(4, 10), N = k * per, msb = r.int(10, 80), msw = r.int(4, 25), SSB = msb * (k - 1), SSW = msw * (N - k), Fv = F(msb, msw);
        return {
          prompt: `A one-way ANOVA compares ${n(k)} teaching methods with ${n(per)} students each (${n(N)} in all). The between-group sum of squares is ${P.grouped(SSB)} and the within-group sum of squares is ${P.grouped(SSW)}. Compute the ${V("F")} statistic.`,
          steps: [
            `Degrees of freedom: between groups ${n(k)} − 1 = ${n(k - 1)}, within groups ${n(N)} − ${n(k)} = ${n(N - k)}.`,
            `Mean squares: MSB = ${M.frac(n(SSB), n(k - 1))} = ${n(msb)} and MSW = ${M.frac(n(SSW), n(N - k))} = ${n(msw)}.`,
            `${V("F")} = ${M.frac("MSB", "MSW")} = ${M.frac(n(msb), n(msw))}${Fv.d !== msw ? ` = ${M.f(Fv)}` : ""}${Fv.isInt() ? "" : ` ${eqa(Fv.value, 4)}`}, on (${n(k - 1)}, ${n(N - k)}) degrees of freedom.`,
          ],
          ...exact(Fv), vals: { N, dfb: k - 1, dfw: N - k, msb, msw, F: fv(Fv) }, params: { k, per, SSB, SSW },
        };
      },
    },

    // ---- D.21 Beta shapes ------------------------------------------------------------------------------------------
    "D.21": {
      title: "Shapes of the beta distribution",
      generate(r, level) {
        if (level === 1) {
          const opts = ["U-shaped, piled up at both ends", "flat (uniform)", "a symmetric hump", "skewed right (peak near 0, long tail toward 1)", "skewed left (peak near 1, long tail toward 0)"];
          const kind = r.int(0, 4);
          let a, b;
          if (kind === 0) { a = r.pick([0.3, 0.5, 0.8]); b = r.pick([0.3, 0.5, 0.8]); }
          else if (kind === 1) { a = 1; b = 1; }
          else if (kind === 2) { a = r.int(2, 8); b = a; }
          else if (kind === 3) { a = r.int(1, 4); b = r.int(a + 1, 9); }
          else { b = r.int(1, 4); a = r.int(b + 1, 9); }
          const mean = kind >= 3 ? F(a, a + b) : F(1, 2);
          const why = [
            `Both α = ${fmt(a)} and β = ${fmt(b)} are below 1, so the powers α − 1 and β − 1 are negative and the density blows up at both ends.`,
            `α = β = 1 makes both powers 0, so the density is the constant 1.`,
            `α = β = ${n(a)} &gt; 1: the density is 0 at both ends and symmetric about ${M.frac("1", "2")}.`,
            `α = ${n(a)} &lt; β = ${n(b)}: the mean ${M.frac("α", "α + β")} = ${M.f(mean)} is below ${M.frac("1", "2")}; the mass sits toward 0 with a tail toward 1.`,
            `α = ${n(a)} &gt; β = ${n(b)}: the mean ${M.frac("α", "α + β")} = ${M.f(mean)} is above ${M.frac("1", "2")}; the mass sits toward 1 with a tail toward 0.`,
          ][kind];
          return {
            prompt: `What shape is the density of Beta(α = ${fmt(a)}, β = ${fmt(b)})?`,
            steps: [`The density is proportional to ${M.sup(x, "α − 1")}${M.sup(`(1 − ${x})`, "β − 1")} on [0, 1].`, why, `So it is ${opts[kind]}.`],
            answer: { kind: "choice", options: opts, index: kind }, answerText: opts[kind], vals: { mean: fv(mean) }, params: { a, b },
          };
        }
        if (level === 2) {
          const a = r.int(2, 9), b = r.int(2, 9), mo = F(a - 1, a + b - 2);
          return {
            prompt: `Find the mode (the peak) of Beta(α = ${n(a)}, β = ${n(b)}).`,
            steps: [`For α, β &gt; 1 the mode is ${M.frac("α − 1", "α + β − 2")}.`, `${M.frac(`${n(a)} − 1`, `${n(a)} + ${n(b)} − 2`)} = ${M.frac(n(a - 1), n(a + b - 2))}${mo.d !== a + b - 2 ? ` = ${M.f(mo)}` : ""}.`],
            ...exact(mo), vals: { a1: a - 1, s2: a + b - 2, mo: fv(mo) }, params: { a, b },
          };
        }
        const all = [];
        for (let a = 2; a <= 6; a++) for (let b = 2; b <= 6; b++) all.push([a, b]);
        const mode = ([a, b]) => (a - 1) / (a + b - 2);
        for (;;) {
          const picked = [];
          for (const c of r.shuffle(all)) if (picked.every((p) => Math.abs(mode(p) - mode(c)) >= 0.12)) { picked.push(c); if (picked.length === 4) break; }
          if (picked.length < 4) continue;
          const [a, b] = picked[0], cst = fact(a + b - 1) / (fact(a - 1) * fact(b - 1)), m0 = mode(picked[0]);
          const peak = cst * Math.pow(m0, a - 1) * Math.pow(1 - m0, b - 1);
          const ch = choose(r, picked, ([p, q]) => `Beta(${n(p)}, ${n(q)})`);
          const modes = picked.map(([p, q]) => F(p - 1, p + q - 2));
          return {
            prompt: `Which beta distribution has this density? The marked point is its peak; the dashed lines are at ${x} = 0.25, 0.5 and 0.75.`,
            graph: graph({ view: [0, 1, 0, peak * 1.25], grid: false, items: [{ t: "fn", e: `${cst}*x^${a - 1}*(1-x)^${b - 1}` }, { t: "pt", x: m0, y: peak }, ...[0.25, 0.5, 0.75].map((v) => ({ t: "vline", x: v, dash: true, role: "muted" }))] }),
            steps: [
              `Read the peak: it is at ${x} ${eqa(m0, 3)}.`,
              `The mode of Beta(α, β) is ${M.frac("α − 1", "α + β − 2")}. For the options: ${picked.slice().sort((u, v) => mode(u) - mode(v)).map(([p, q]) => `Beta(${n(p)}, ${n(q)}) → ${M.f(F(p - 1, p + q - 2))}`).join("; ")}.`,
              `Only Beta(${n(a)}, ${n(b)}) peaks at ${M.f(modes[0])} ${eqa(m0, 3)}.`,
            ],
            ...ch.out, vals: { m0, modes: ch.opts.map(([p, q]) => fv(F(p - 1, p + q - 2))) }, params: { a, b, opts: ch.opts }, consts: [0.25, 0.5, 0.75],
          };
        }
      },
    },
  });
})(Practice);
