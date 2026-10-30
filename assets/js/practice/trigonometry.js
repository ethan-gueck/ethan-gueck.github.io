/*
 * practice/trigonometry.js — Trigonometry practice problems (chapter 06), one generator per concept key.
 *
 * Each generator(r, level) draws hand-solvable numbers for the level (1 easy, 2 medium, 3 hard): special
 * angles, Pythagorean-triple triangles and exact values such as √3/2. Where an arbitrary angle is unavoidable
 * (measured angles in word problems) the prompt asks to round and the answer carries `dp`. Every number shown
 * is built from a value reported in `vals`; tools/practice/verifiers/trigonometry.py recomputes each of them
 * from `params` alone with SymPy's exact trigonometry. See practice/core.js for the API.
 *
 * Exact values are `Rad`s: sums c₁√r₁ + c₂√r₂ + … with rational c and square-free r. In `vals` a Rad is the
 * list [L, a₁, r₁, a₂, r₂, …] (common denominator L, integer numerators a, rational term first, then larger
 * radicands first), which the verifier rebuilds from SymPy.
 *
 * Concepts skipped: none. Every concept of the chapter has problems. Within T.triangle-area, the law of
 * tangents and Mollweide's check are not drilled: they are a pre-calculator route and a consistency check for
 * triangles the other formulas (law of cosines, Heron, the area formulas) already solve more directly.
 */
(function (P) {
  "use strict";
  const { Frac, M, graph } = P;
  const n = (v) => M.n(v);
  const np = (v) => M.n(v, { paren: true });
  const fv = (q) => { q = Frac.of(q); return { n: q.n, d: q.d }; };
  const tf = (q) => { q = Frac.of(q); return q.d === 1 ? String(q.n) : `${q.n}/${q.d}`; };
  const fp = (q) => M.f(q, { paren: true });
  /** An unreduced fraction a/b with the sign in front: −(24)/(7) rather than (−24)/(7). */
  const rawF = (a, b) => `${a * b < 0 ? "−" : ""}${M.frac(n(Math.abs(a)), n(Math.abs(b)))}`;
  const th = M.v("θ"), X = M.v("x");
  const dg = (d) => `${n(d)}°`;
  /** A rounded number as shown (keeps trailing zeros: 4.40), with a true minus sign. */
  const fixed = (v, dp) => { let s = v.toFixed(dp); if (/^-0(\.0+)?$/.test(s)) s = s.slice(1); return s; };
  const fx = (v, dp) => fixed(v, dp).replace("-", "−");
  const mod = (a, m) => ((a % m) + m) % m;
  const ROMAN = ["", "I", "II", "III", "IV"];
  const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29]];
  const FN6 = ["sin", "cos", "tan", "csc", "sec", "cot"];

  // ---- Exact values c₁√r₁ + c₂√r₂ + … ------------------------------------------------------
  function sqf(m) { let k = 1, s = m; for (let f = 2; f * f <= s; f++) while (s % (f * f) === 0) { s /= f * f; k *= f; } return [k, s]; }
  class Rad {
    constructor(pairs = []) {
      this.t = new Map();
      for (const [r, c] of pairs) {
        const v = (this.t.get(r) || new Frac(0)).add(c);
        if (v.n === 0) this.t.delete(r); else this.t.set(r, v);
      }
    }
    static of(c, r = 1) { const [k, s] = sqf(r); return new Rad([[s, Frac.of(c).mul(k)]]); }
    terms() { return [...this.t.entries()].sort((a, b) => (a[0] === 1 ? -1 : b[0] === 1 ? 1 : b[0] - a[0])); }
    add(o) { o = R(o); return new Rad([...this.t, ...o.t]); }
    neg() { return new Rad([...this.t].map(([r, c]) => [r, c.neg()])); }
    sub(o) { return this.add(R(o).neg()); }
    mul(o) {
      o = R(o);
      const out = [];
      for (const [r1, c1] of this.t) for (const [r2, c2] of o.t) { const [k, s] = sqf(r1 * r2); out.push([s, c1.mul(c2).mul(k)]); }
      return new Rad(out);
    }
    /** Negate the radical terms: a + b√s → a − b√s. */
    conj() { return new Rad([...this.t].map(([r, c]) => [r, r === 1 ? c : c.neg()])); }
    inv() {
      const ts = this.terms();
      if (!ts.length) throw new Error("divide by zero");
      if (ts.length === 1) { const [r, c] = ts[0]; return Rad.of(new Frac(1).div(c.mul(r)), r); }
      const cj = this.conj(), den = this.mul(cj);
      if (!den.isRational()) throw new Error("cannot rationalize");
      return cj.mul(new Frac(1).div(den.rat()));
    }
    div(o) { return this.mul(R(o).inv()); }
    isZero() { return this.t.size === 0; }
    isRational() { return [...this.t.keys()].every((r) => r === 1); }
    rat() { return this.t.get(1) || new Frac(0); }
    eq(o) { return this.sub(o).isZero(); }
    get value() { let s = 0; for (const [r, c] of this.t) s += c.value * Math.sqrt(r); return s; }
  }
  const R = (x) => (x instanceof Rad ? x : Rad.of(x));
  function radParts(x) {
    const ts = x.terms();
    const L = ts.reduce((a, [, c]) => P.lcm(a, c.d), 1);
    return { L, items: ts.map(([r, c]) => ({ r, a: (c.n * L) / c.d })) };
  }
  const surd = (a, r) => (r === 1 ? n(a) : `${a === 1 ? "" : n(a)}${M.sqrt(n(r))}`);
  /** An exact value as HTML: 3, −√3/2, (√6 − √2)/4, 2 + √3. paren: wrap a negative or compound value. */
  function rh(x, { paren = false } = {}) {
    x = R(x);
    if (x.isZero()) return "0";
    let { L, items } = radParts(x);
    let neg = false;
    if (items.every((i) => i.a < 0)) { neg = true; items = items.map((i) => ({ r: i.r, a: -i.a })); }
    else if (items[0].a < 0) { const k = items.findIndex((i) => i.a > 0); items = [items[k], ...items.filter((_, j) => j !== k)]; }
    const top = items.map((i, j) => (j === 0 ? surd(i.a, i.r) : ` ${i.a < 0 ? "−" : "+"} ${surd(Math.abs(i.a), i.r)}`)).join("");
    let body;
    if (L === 1) body = neg ? (items.length > 1 ? `−(${top})` : `−${top}`) : top;
    else body = `${neg ? "−" : ""}${M.frac(top, n(L))}`;
    const compound = items.length > 1 && L === 1;
    return paren && (neg || compound) ? `(${body})` : body;
  }
  /** The same value as a reader types it: -sqrt(3)/2, (sqrt(6)-sqrt(2))/4. */
  function rt(x) {
    x = R(x);
    if (x.isZero()) return "0";
    const { L, items } = radParts(x);
    const one = (i) => (i.r === 1 ? String(i.a) : i.a === 1 ? `sqrt(${i.r})` : i.a === -1 ? `-sqrt(${i.r})` : `${i.a}*sqrt(${i.r})`);
    const top = items.map(one).join("+").replace(/\+-/g, "-");
    return L === 1 ? top : items.length > 1 ? `(${top})/${L}` : `${top}/${L}`;
  }
  /** A Rad for `vals`: [L, a₁, r₁, a₂, r₂, …]. */
  function rv(x) { x = R(x); const { L, items } = radParts(x); return [L, ...items.flatMap((i) => [i.a, i.r])]; }
  const irr = (x) => !R(x).isRational();
  /** x² written safely: 3², (−3)², (2√3)², (√3/2)². */
  const sq2 = (x) => { x = R(x); const plain = x.isRational() && x.rat().d === 1 && x.value >= 0; return M.sup(plain ? rh(x) : `(${rh(x)})`, 2); };
  /** √s followed by "= r" only when the simplified root looks different. */
  const rootEq = (s, r0) => (M.sqrt(rh(s)) === rh(r0) ? M.sqrt(rh(s)) : `${M.sqrt(rh(s))} = ${rh(r0)}`);
  /** A value followed by a unit: compound values in parentheses, (12 − 5√3) m. */
  const ru = (x) => { const h = rh(x); return R(x).t.size > 1 ? `(${h})` : h; };
  /** "= 5√3 m ≈ 8.66 m" style tail: the approximation only when the value is irrational. */
  const approx = (x, dp, unit = "") => (irr(x) ? ` ≈ ${fx(R(x).value, dp)}${unit}` : "");

  // ---- Angles ----------------------------------------------------------------------------
  /** q·π as HTML: π/6, 3π/4, −2π. */
  function pih(q) {
    q = Frac.of(q);
    if (q.n === 0) return "0";
    const a = Math.abs(q.n), top = `${a === 1 ? "" : n(a)}π`;
    return `${q.n < 0 ? "−" : ""}${q.d === 1 ? top : M.frac(top, n(q.d))}`;
  }
  /** q·π as typed: 3pi/4. */
  function pit(q) {
    q = Frac.of(q);
    if (q.n === 0) return "0";
    const a = q.n === 1 ? "pi" : q.n === -1 ? "-pi" : `${q.n}pi`;
    return q.d === 1 ? a : `${a}/${q.d}`;
  }
  const dq = (d) => new Frac(d, 180);  // degrees as a multiple of π
  const ang = (d, rad) => (rad ? pih(dq(d)) : dg(d));
  const angText = (d, rad) => (rad ? pit(dq(d)) : String(d));
  const angVal = (d, rad) => (rad ? dq(d).value * Math.PI : d);

  // ---- Exact trig values at multiples of 30° and 45° -----------------------------------------
  const SB = { 0: [0, 1], 30: [new Frac(1, 2), 1], 45: [new Frac(1, 2), 2], 60: [new Frac(1, 2), 3], 90: [1, 1] };
  const sbase = (d) => Rad.of(SB[d][0], SB[d][1]);
  function sinD(d) {
    d = mod(d, 360);
    if (d <= 90) return sbase(d);
    if (d <= 180) return sbase(180 - d);
    if (d <= 270) return sbase(d - 180).neg();
    return sbase(360 - d).neg();
  }
  const cosD = (d) => sinD(d + 90);
  /** f(d°) exactly, or null where it is undefined. */
  function trigD(f, d) {
    const s = sinD(d), c = cosD(d);
    switch (f) {
      case "sin": return s;
      case "cos": return c;
      case "tan": return c.isZero() ? null : s.div(c);
      case "cot": return s.isZero() ? null : c.div(s);
      case "sec": return c.isZero() ? null : Rad.of(1).div(c);
      case "csc": return s.isZero() ? null : Rad.of(1).div(s);
    }
    throw new Error(f);
  }
  const quad = (d) => 1 + Math.floor(mod(d, 360) / 90);      // d not a multiple of 90
  function refD(d) { d = mod(d, 360); const q = quad(d); return q === 1 ? d : q === 2 ? 180 - d : q === 3 ? d - 180 : 360 - d; }
  const SPECIAL = [0, 30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330];
  const NONAXIS = SPECIAL.filter((d) => d % 90 !== 0);
  const POS = { 1: "all six functions are positive", 2: "only sin and csc are positive", 3: "only tan and cot are positive", 4: "only cos and sec are positive" };
  /** How f(d) follows from the unit-circle point: one sentence. */
  /** f applied to an angle: sin 30°, sin(5π/4). */
  const app = (f, a, rad) => (rad ? `${f}(${a})` : `${f} ${a}`);
  function fromPoint(f, d, rad) {
    const s = sinD(d), c = cosD(d), v = trigD(f, d), a = app(f, ang(d, rad), rad);
    switch (f) {
      case "sin": return `${a} is the y-coordinate: ${rh(v)}.`;
      case "cos": return `${a} is the x-coordinate: ${rh(v)}.`;
      case "tan": return `${a} = ${M.frac("<i>y</i>", "<i>x</i>")} = ${M.frac(rh(s), rh(c))} = ${rh(v)}.`;
      case "cot": return `${a} = ${M.frac("<i>x</i>", "<i>y</i>")} = ${M.frac(rh(c), rh(s))} = ${rh(v)}.`;
      case "sec": return `${a} = ${M.frac("1", "<i>x</i>")} = ${M.frac("1", rh(c))} = ${rh(v)}.`;
      case "csc": return `${a} = ${M.frac("1", "<i>y</i>")} = ${M.frac("1", rh(s))} = ${rh(v)}.`;
    }
  }
  /** f at d degrees (a multiple of 30° or 45°) with the reference-angle reasoning; vals ref/vref when used. */
  function valueStep(f, d, rad) {
    const v = trigD(f, d), a = ang(d, rad);
    if (mod(d, 360) % 90 === 0 || quad(d) === 1) return { text: `${app(f, a, rad)} = ${rh(v)}.`, vals: {} };
    const ref = refD(d), vref = trigD(f, ref), qd = quad(d);
    return {
      text: `${a} is in quadrant ${ROMAN[qd]} with reference angle ${ang(ref, rad)}; ${app(f, ang(ref, rad), rad)} = ${rh(vref)}, and in quadrant ${ROMAN[qd]} ${POS[qd]}, so ${app(f, a, rad)} = ${rh(v)}.`,
      vals: { ref: rad ? fv(dq(ref)) : ref, vref: rv(vref) },
    };
  }
  /** Rationalize N / D (D a binomial a + b√s): steps, the value, and the values shown. */
  function rationalize(N, D) {
    const L = [...N.t.values(), ...D.t.values()].reduce((a, c) => P.lcm(a, c.d), 1);
    const N1 = N.mul(L), D1 = D.mul(L), Dc = D1.conj(), num2 = N1.mul(Dc), den2 = D1.mul(Dc).rat(), ans = N.div(D);
    const steps = [];
    if (L > 1) steps.push(`Multiply the top and bottom by ${n(L)} to clear the small fractions: ${M.frac(rh(N1), rh(D1))}.`);
    steps.push(`Multiply the top and bottom by ${rh(Dc)}, the conjugate of the denominator. The bottom becomes ${rh(D1, { paren: true })}${rh(Dc, { paren: true })} = ${n(den2.value)} and the top ${rh(N1, { paren: true })}${rh(Dc, { paren: true })} = ${rh(num2)}.`);
    steps.push(den2.value === 1 ? `So the value is ${rh(ans)}.` : `So the value is ${M.frac(rh(num2), n(den2.value))} = ${rh(ans)}.`);
    return { steps, ans, vals: { L, N1: rv(N1), D1: rv(D1), Dc: rv(Dc), num2: rv(num2), den2: den2.value } };
  }
  /** Quadrant of an angle as an inequality in radians. */
  const QR = { 1: `0 &lt; ${"%"} &lt; ${M.frac("π", "2")}`, 2: `${M.frac("π", "2")} &lt; ${"%"} &lt; π`, 3: `π &lt; ${"%"} &lt; ${M.frac("3π", "2")}`, 4: `${M.frac("3π", "2")} &lt; ${"%"} &lt; 2π` };
  const qr = (q, v) => QR[q].replace("%", v);
  /** The point (cos d, sin d), with the reasoning. */
  function pointStep(d, rad) {
    const a = ang(d, rad), c = cosD(d), s = sinD(d);
    if (d % 90 === 0) return `${a} points along an axis, so P(${a}) = (${rh(c)}, ${rh(s)}).`;
    const q = quad(d), ref = refD(d);
    return `${a} is in quadrant ${ROMAN[q]} with reference angle ${ang(ref, rad)}, where cos = ${rh(cosD(ref))} and sin = ${rh(sinD(ref))}. In quadrant ${ROMAN[q]} the x-coordinate is ${c.value > 0 ? "positive" : "negative"} and the y-coordinate is ${s.value > 0 ? "positive" : "negative"}, so P(${a}) = (${rh(c)}, ${rh(s)}).`;
  }

  // ---- Figures ---------------------------------------------------------------------------
  /** A figure of named points scaled to about 10 units; build(W) returns the items in scaled coordinates. */
  function figure(pts, build, pad = 1.6) {
    const all = Object.values(pts), xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
    const x0 = Math.min(...xs), y0 = Math.min(...ys);
    const k = 10 / Math.max(Math.max(...xs) - x0, Math.max(...ys) - y0);
    const W = {};
    for (const [key, [x, y]] of Object.entries(pts)) W[key] = [(x - x0) * k, (y - y0) * k];
    const ws = Object.values(W), wx = ws.map((p) => p[0]), wy = ws.map((p) => p[1]);
    return graph({ view: [Math.min(...wx) - pad, Math.max(...wx) + pad, Math.min(...wy) - pad, Math.max(...wy) + pad], items: build(W), equal: true, axes: false, grid: false });
  }
  /** A label inside the angle at V, toward G. */
  function inside(V, G, s, dist = 1.7) {
    const dx = G[0] - V[0], dy = G[1] - V[1], L = Math.hypot(dx, dy) || 1, t = Math.min(dist, L * 0.45);
    return { t: "text", x: V[0] + (dx / L) * t, y: V[1] + (dy / L) * t, s };
  }
  function rightMark(V, U1, U2, s = 0.6) {
    const u = (U) => { const dx = U[0] - V[0], dy = U[1] - V[1], L = Math.hypot(dx, dy); return [(dx / L) * s, (dy / L) * s]; };
    const e1 = u(U1), e2 = u(U2), A = [V[0] + e1[0], V[1] + e1[1]], B = [V[0] + e2[0], V[1] + e2[1]], C = [A[0] + e2[0], A[1] + e2[1]];
    return [{ t: "seg", a: A, b: C, role: "muted" }, { t: "seg", a: C, b: B, role: "muted" }];
  }
  /** A triangle A, B, C: sides [{i, j, label}], angles [{i, s}] (labels inside), right: index of a right angle. */
  function triFig(V, { sides = [], angles = [], right = -1, verts = null } = {}) {
    return figure({ 0: V[0], 1: V[1], 2: V[2] }, (W) => {
      const G = [(W[0][0] + W[1][0] + W[2][0]) / 3, (W[0][1] + W[1][1] + W[2][1]) / 3];
      const items = [{ t: "poly", p: [W[0], W[1], W[2]], role: "muted" }];
      for (const s of sides) items.push({ t: "seg", a: W[s.i], b: W[s.j], label: s.label, role: "primary" });
      for (const a of angles) items.push(inside(W[a.i], G, a.s));
      if (right >= 0) items.push(...rightMark(W[right], W[(right + 1) % 3], W[(right + 2) % 3]));
      if (verts) verts.forEach((v, i) => { const dx = W[i][0] - G[0], dy = W[i][1] - G[1], L = Math.hypot(dx, dy); items.push({ t: "text", x: W[i][0] + (dx / L) * 0.8, y: W[i][1] + (dy / L) * 0.8, s: v }); });
      return items;
    });
  }
  /** Triangle vertices from two sides and the included angle at the origin vertex (degrees). */
  const sasPts = (b, c, A) => [[0, 0], [c, 0], [b * Math.cos(A * Math.PI / 180), b * Math.sin(A * Math.PI / 180)]];
  /** The unit circle with the terminal ray of d degrees and its point. */
  function circleFig(d, label = "P", r0 = 1) {
    const t = d * Math.PI / 180, x = r0 * Math.cos(t), y = r0 * Math.sin(t), v = 1.5 * r0;
    return graph({
      view: [-v, v, -v, v], equal: true,
      items: [{ t: "circle", c: [0, 0], r: r0, role: "muted" }, { t: "seg", a: [0, 0], b: [x, y], role: "primary" }, { t: "pt", x, y, label }],
    });
  }

  P.define("trigonometry", {
    // ---- T.1 Right-triangle ratios ---------------------------------------------------------------
    "T.1": {
      title: "Right-triangle trigonometric ratios",
      generate(r, level) {
        const RATIO = { sin: ["opp", "hyp"], cos: ["adj", "hyp"], tan: ["opp", "adj"], csc: ["hyp", "opp"], sec: ["hyp", "adj"], cot: ["adj", "opp"] };
        const WORD = { opp: "opposite", adj: "adjacent", hyp: "hypotenuse" };
        if (level <= 2) {
          const [p0, q0, h0] = r.pick(level === 1 ? TRIPLES.slice(0, 3) : TRIPLES);
          const k = level === 1 ? r.int(1, 2) : r.int(1, 3), swap = r.chance(0.5);
          const adj = (swap ? q0 : p0) * k, opp = (swap ? p0 : q0) * k, hyp = h0 * k;
          const f = level === 1 ? r.pick(["sin", "cos", "tan"]) : r.pick(["csc", "sec", "cot", "csc", "sec", "cot", "sin", "cos", "tan"]);
          const side = { opp, adj, hyp };
          const [tk, bk] = RATIO[f];
          const ans = new Frac(side[tk], side[bk]);
          const unknown = level === 2 ? r.pick(["opp", "adj", "hyp"]) : null;
          const lab = (s) => (s === unknown ? "?" : n(side[s]));
          const fig = triFig([[0, 0], [adj, 0], [adj, opp]], {
            sides: [{ i: 0, j: 1, label: lab("adj") }, { i: 1, j: 2, label: lab("opp") }, { i: 0, j: 2, label: lab("hyp") }],
            angles: [{ i: 0, s: "θ" }], right: 1,
          });
          const steps = [], vals = { ans: fv(ans) };
          if (unknown === "hyp") {
            const aa = adj * adj, bb = opp * opp, ss = aa + bb;
            steps.push(`Find the missing side with the Pythagorean theorem: (hypotenuse)${M.sup("", 2)} = ${M.sup(n(adj), 2)} + ${M.sup(n(opp), 2)} = ${n(aa)} + ${n(bb)} = ${n(ss)}, so the hypotenuse is ${M.sqrt(n(ss))} = ${n(hyp)}.`);
            Object.assign(vals, { aa, bb, ss, side: hyp });
          } else if (unknown) {
            const known = unknown === "opp" ? adj : opp, hh = hyp * hyp, kk = known * known, ss = hh - kk;
            steps.push(`Find the missing leg with the Pythagorean theorem: ${M.sup(n(hyp), 2)} − ${M.sup(n(known), 2)} = ${n(hh)} − ${n(kk)} = ${n(ss)}, so the ${WORD[unknown]} side is ${M.sqrt(n(ss))} = ${n(side[unknown])}.`);
            Object.assign(vals, { hh, kk, ss, side: side[unknown] });
          }
          steps.push(`Label the sides as seen from ${th}: opposite ${n(opp)}, adjacent ${n(adj)}, hypotenuse ${n(hyp)} (the side across from the right angle).`);
          const raw = M.frac(n(side[tk]), n(side[bk]));
          steps.push(`${f} ${th} = ${M.frac(WORD[tk], WORD[bk])} = ${raw}${ans.n === side[tk] ? ", already in lowest terms" : ` = ${M.f(ans)}`}.`);
          return {
            prompt: level === 1
              ? `In the right triangle shown, find ${f} ${th}. Give the answer as a fraction in lowest terms.`
              : `In the right triangle shown, one side length is missing. Find ${f} ${th} as a fraction in lowest terms.`,
            graph: fig, steps,
            answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
            vals, params: { adj, opp, hyp, f: FN6.indexOf(f), unk: unknown ? ["opp", "adj", "hyp"].indexOf(unknown) : -1 },
          };
        }
        // level 3: word problems with special angles
        const kind = r.int(0, 3);
        const al = r.pick([30, 45, 60]);
        if (kind === 0) {
          const obj = r.pick(["tree", "flagpole", "building", "radio mast"]), d = r.int(8, 60);
          const t = trigD("tan", al), H = Rad.of(d).mul(t);
          return {
            prompt: `From a point on level ground ${n(d)} m from the base of a ${obj}, the angle of elevation to the top of the ${obj} is ${dg(al)}. How tall is the ${obj}, in meters? Give the exact value or round to 2 decimal places.`,
            graph: triFig([[0, 0], [d, 0], [d, H.value]], { sides: [{ i: 0, j: 1, label: `${n(d)} m` }, { i: 1, j: 2, label: "h" }], angles: [{ i: 0, s: dg(al) }], right: 1 }),
            steps: [
              `The height ${M.v("h")} is opposite the ${dg(al)} angle and the ${n(d)} m along the ground is adjacent to it, so use tangent: tan ${dg(al)} = ${M.frac(M.v("h"), n(d))}.`,
              `tan ${dg(al)} = ${rh(t)}.`,
              `${M.v("h")} = ${n(d)} · tan ${dg(al)} = ${n(d)} · ${rh(t, { paren: true })} = ${ru(H)} m${approx(H, 2, " m")}.`,
            ],
            answer: { kind: "number", value: H.value, dp: 2 }, answerText: `${ru(H)} m${approx(H, 2, " m")}`, answerInput: rt(H),
            vals: { t: rv(t), H: rv(H), Hn: H.value }, params: { kind, al, d },
          };
        }
        if (kind === 1) {
          const d = r.int(20, 80), t = trigD("tan", al), H = Rad.of(d).div(t);
          const how = al === 45 ? `tan 45° = 1, so ${M.v("x")} = ${n(d)}`
            : al === 60 ? `tan 60° = ${M.sqrt("3")}, so ${M.v("x")} = ${M.frac(n(d), M.sqrt("3"))} = ${rh(H)} (multiply the top and bottom by ${M.sqrt("3")})`
              : `tan 30° = ${M.frac(M.sqrt("3"), "3")}, and dividing by ${M.frac(M.sqrt("3"), "3")} is multiplying by ${M.frac("3", M.sqrt("3"))} = ${M.sqrt("3")}, so ${M.v("x")} = ${rh(H)}`;
          return {
            prompt: `From the top of a ${n(d)} m lighthouse, the angle of depression to a boat is ${dg(al)}. How far is the boat from the base of the lighthouse, in meters? Give the exact value or round to 2 decimal places.`,
            graph: triFig([[0, d], [0, 0], [H.value, 0]], { sides: [{ i: 0, j: 1, label: `${n(d)} m` }, { i: 1, j: 2, label: "x" }], angles: [{ i: 2, s: dg(al) }], right: 1 }),
            steps: [
              `The angle of depression from the top equals the angle of elevation from the boat (alternate angles between the two horizontal lines), so the angle at the boat is ${dg(al)}.`,
              `The ${n(d)} m height is opposite that angle and the distance ${M.v("x")} is adjacent: tan ${dg(al)} = ${M.frac(n(d), M.v("x"))}, so ${M.v("x")} = ${M.frac(n(d), `tan ${dg(al)}`)}.`,
              `${how} m${approx(H, 2, " m")}.`,
            ],
            answer: { kind: "number", value: H.value, dp: 2 }, answerText: `${ru(H)} m${approx(H, 2, " m")}`, answerInput: rt(H),
            vals: { t: rv(t), H: rv(H), Hn: H.value }, params: { kind, al, d }, consts: [3],
          };
        }
        if (kind === 2) {
          const d = r.int(20, 120), t = trigD("sin", al), H = Rad.of(d).mul(t);
          return {
            prompt: `A kite flies on a straight, taut string ${n(d)} m long that makes an angle of ${dg(al)} with the level ground. Ignoring the height of the hand holding it, how high is the kite, in meters? Give the exact value or round to 2 decimal places.`,
            graph: triFig([[0, 0], [d * cosD(al).value, 0], [d * cosD(al).value, H.value]], { sides: [{ i: 0, j: 2, label: `${n(d)} m` }, { i: 1, j: 2, label: "h" }], angles: [{ i: 0, s: dg(al) }], right: 1 }),
            steps: [
              `The string is the hypotenuse and the height ${M.v("h")} is opposite the ${dg(al)} angle, so use sine: sin ${dg(al)} = ${M.frac(M.v("h"), n(d))}.`,
              `sin ${dg(al)} = ${rh(t)}.`,
              `${M.v("h")} = ${n(d)} · sin ${dg(al)} = ${n(d)} · ${rh(t, { paren: true })} = ${ru(H)} m${approx(H, 2, " m")}.`,
            ],
            answer: { kind: "number", value: H.value, dp: 2 }, answerText: `${ru(H)} m${approx(H, 2, " m")}`, answerInput: rt(H),
            vals: { t: rv(t), H: rv(H), Hn: H.value }, params: { kind, al, d },
          };
        }
        // two sightings, 30° and 60°
        const d = r.int(10, 60), H = Rad.of(new Frac(d, 2), 3), x = H.value / Math.sqrt(3);
        return {
          prompt: `Points ${M.v("A")} and ${M.v("B")} lie on level ground in a straight line with the base of a tower, ${M.v("B")} being closer, and ${M.v("A")}${M.v("B")} = ${n(d)} m. The angle of elevation of the top of the tower is 30° from ${M.v("A")} and 60° from ${M.v("B")}. How tall is the tower, in meters? Give the exact value or round to 2 decimal places.`,
          graph: figure({ A: [0, 0], B: [d, 0], F: [d + x, 0], T: [d + x, H.value] }, (W) => [
            { t: "poly", p: [W.A, W.F, W.T], role: "muted" }, { t: "seg", a: W.B, b: W.T, role: "primary" },
            { t: "seg", a: W.A, b: W.B, label: `${n(d)} m`, role: "primary" }, { t: "seg", a: W.F, b: W.T, label: "h", role: "primary" },
            inside(W.A, W.T, "30°", 1.4), inside(W.B, W.T, "60°", 1.0), ...rightMark(W.F, W.B, W.T),
            { t: "text", x: W.A[0], y: W.A[1] - 0.8, s: "A" }, { t: "text", x: W.B[0], y: W.B[1] - 0.8, s: "B" },
          ]),
          steps: [
            `Let ${M.v("h")} be the height and ${M.v("x")} the distance from ${M.v("B")} to the base. From ${M.v("B")}: tan 60° = ${M.frac(M.v("h"), M.v("x"))} and tan 60° = ${M.sqrt("3")}, so ${M.v("x")} = ${M.frac(M.v("h"), M.sqrt("3"))}.`,
            `From ${M.v("A")}: tan 30° = ${M.frac(M.v("h"), `${M.v("x")} + ${n(d)}`)} and tan 30° = ${M.frac("1", M.sqrt("3"))}, so ${M.v("x")} + ${n(d)} = ${M.v("h")}${M.sqrt("3")}.`,
            `Subtract the first equation from the second: ${n(d)} = ${M.v("h")}${M.sqrt("3")} − ${M.frac(M.v("h"), M.sqrt("3"))} = ${M.frac(`3${M.v("h")} − ${M.v("h")}`, M.sqrt("3"))} = ${M.frac(`2${M.v("h")}`, M.sqrt("3"))}.`,
            `So ${M.v("h")} = ${ru(H)} m${approx(H, 2, " m")}.`,
          ],
          answer: { kind: "number", value: H.value, dp: 2 }, answerText: `${ru(H)} m${approx(H, 2, " m")}`, answerInput: rt(H),
          vals: { H: rv(H), Hn: H.value }, params: { kind, d }, consts: [30, 60, 3],
        };
      },
    },

    // ---- T.2 Radians, arc length and angular speed ---------------------------------------------
    "T.2": {
      title: "Radians, arc length and angular speed",
      generate(r, level) {
        if (level === 1) {
          const d = r.pick([30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330, 360]), q = dq(d);
          if (r.chance(0.5)) {
            const g = P.gcd(d, 180);
            return {
              prompt: `Convert ${dg(d)} to radians. Give an exact answer in terms of π.`,
              steps: [
                `Since π rad = 180°, multiply by ${M.frac("π", "180°")}: ${dg(d)} · ${M.frac("π", "180°")} = ${M.frac(`${n(d)}π`, "180")}.`,
                `Simplify ${M.frac(n(d), "180")} by dividing the top and bottom by ${n(g)}: ${pih(q)}.`,
              ],
              answer: { kind: "number", value: q.value * Math.PI }, answerText: pih(q), answerInput: pit(q),
              vals: { g, q: fv(q), d }, params: { q: fv(q), dir: 0 }, consts: [180],
            };
          }
          const top = q.n * 180;
          return {
            prompt: `Convert ${pih(q)} radians to degrees.`,
            steps: [
              q.d === 1
                ? `Since π rad = 180°, multiply by ${M.frac("180°", "π")}: ${pih(q)} · ${M.frac("180°", "π")} = ${q.n === 1 ? "" : `${n(q.n)} · `}180° = ${dg(d)}.`
                : `Since π rad = 180°, multiply by ${M.frac("180°", "π")}: ${pih(q)} · ${M.frac("180°", "π")} = ${M.frac(`${q.n === 1 ? "" : `${n(q.n)} · `}180°`, n(q.d))}.`,
              ...(q.d === 1 ? [] : [`${M.frac(`${n(top)}°`, n(q.d))} = ${dg(d)}.`]),
            ],
            answer: { kind: "number", value: d }, answerText: dg(d), answerInput: String(d), deg: true,
            vals: { top, d }, params: { q: fv(q), dir: 1 }, consts: [180],
          };
        }
        if (level === 2) {
          const R0 = r.int(2, 12), d = r.pick([30, 40, 45, 60, 72, 90, 120, 135, 150, 210, 240, 270, 300]), q = dq(d);
          const arc = r.chance(0.5), inDeg = r.chance(0.6);
          const given = inDeg ? dg(d) : pih(q);
          const conv = inDeg ? [`Convert the angle to radians (the formula needs radians): ${dg(d)} · ${M.frac("π", "180°")} = ${pih(q)}.`] : [];
          if (arc) {
            const s = q.mul(R0);
            return {
              prompt: `A pendulum ${n(R0)} cm long swings through an angle of ${given}. How long is the arc its tip travels, in centimeters? Give an exact answer in terms of π.`,
              steps: [...conv, `Arc length: ${M.v("s")} = ${M.v("r")}${th} = ${n(R0)} · ${pih(q)} = ${pih(s)} cm.`],
              answer: { kind: "number", value: s.value * Math.PI }, answerText: `${pih(s)} cm`, answerInput: pit(s),
              vals: { q: fv(q), s: fv(s) }, params: { R: R0, d, inDeg: inDeg ? 1 : 0, arc: 1 }, consts: [180],
            };
          }
          const rr = R0 * R0, A = q.mul(rr).div(2);
          return {
            prompt: `A lawn sprinkler sprays water ${n(R0)} m out and turns through an angle of ${given}. What area of lawn does it water, in square meters? Give an exact answer in terms of π.`,
            steps: [...conv, `Sector area: ${M.v("A")} = ${M.frac("1", "2")}${M.sup(M.v("r"), 2)}${th} = ${M.frac("1", "2")} · ${M.sup(n(R0), 2)} · ${pih(q)} = ${M.frac("1", "2")} · ${n(rr)} · ${pih(q)} = ${pih(A)} m${M.sup("", 2)}.`],
            answer: { kind: "number", value: A.value * Math.PI }, answerText: `${pih(A)} m${M.sup("", 2)}`, answerInput: pit(A),
            vals: { q: fv(q), rr, A: fv(A) }, params: { R: R0, d, inDeg: inDeg ? 1 : 0, arc: 0 }, consts: [180],
          };
        }
        // level 3: linear speed from a rotation rate
        const sc = r.pick([
          { what: "A bicycle wheel has radius", lo: 30, hi: 36, rpm: [60, 90, 120, 150, 180, 210, 240], ask: "How fast is the bicycle moving" },
          { what: "A ceiling fan has blades of length", lo: 40, hi: 70, rpm: [60, 90, 120, 150, 180], ask: "How fast is the tip of a blade moving" },
          { what: "A car tire has radius", lo: 28, hi: 34, rpm: [300, 450, 600, 750, 900], ask: "How fast is the car moving" },
        ]);
        const rc = r.int(sc.lo, sc.hi), N = r.pick(sc.rpm), q = N / 30, rm = rc / 100, c = (rc * q) / 100, v = c * Math.PI;
        return {
          prompt: `${sc.what} ${n(rc)} cm and turns at ${n(N)} revolutions per minute. ${sc.ask}, in meters per second? Round to 2 decimal places.`,
          steps: [
            `Turn the rotation rate into an angular speed. One revolution is 2π rad and one minute is 60 s, so ${M.v("ω")} = 2π · ${M.frac(n(N), "60")} = ${n(q)}π rad/s.`,
            `Convert the radius to meters: ${n(rc)} cm = ${n(rm)} m.`,
            `Linear speed: ${M.v("v")} = ${M.v("r")}${M.v("ω")} = ${n(rm)} · ${n(q)}π = ${n(c)}π ≈ ${fx(v, 2)} m/s.`,
          ],
          answer: { kind: "number", value: v, dp: 2 }, answerText: `${n(c)}π ≈ ${fx(v, 2)} m/s`, answerInput: fixed(v, 2),
          vals: { q, rm, c, v }, params: { rc, N }, consts: [60],
        };
      },
    },

    // ---- T.3 Coterminal and reference angles ------------------------------------------------------
    "T.angles": {
      title: "Coterminal and reference angles",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.6)) {
            const base = r.int(1, 359), k = r.pick([-2, -1, 1, 2]), a = base + 360 * k, K = Math.abs(k), kk = 360 * K;
            const turns = K === 1 ? "360°" : `${n(K)} · 360°`;
            return {
              prompt: `Find the angle ${th} with 0° ≤ ${th} &lt; 360° that is coterminal with ${dg(a)}.`,
              graph: circleFig(base, ""),
              steps: [
                `Coterminal angles differ by whole turns of 360°. ${k > 0 ? `${dg(a)} is more than 360°, so subtract` : `${dg(a)} is negative, so add`} ${K === 1 ? "one turn" : `${n(K)} turns`}.`,
                `${dg(a)} ${k > 0 ? "−" : "+"} ${turns} = ${n(a)}° ${k > 0 ? "−" : "+"} ${n(kk)}° = ${dg(base)}, which is between 0° and 360°.`,
              ],
              answer: { kind: "number", value: base }, answerText: dg(base), answerInput: String(base), deg: true,
              vals: { K, kk, base }, params: { a, rad: 0 }, consts: [360],
            };
          }
          const den = r.pick([3, 4, 6]);
          let q, k, base;
          for (;;) { base = new Frac(r.int(1, 2 * den - 1), den); k = r.pick([-2, -1, 1, 2]); q = base.add(2 * k); if (base.d === den) break; }
          const K = Math.abs(k), twoK = new Frac(2 * K), inDen = twoK.mul(den);
          return {
            prompt: `Find the angle ${th} with 0 ≤ ${th} &lt; 2π that is coterminal with ${pih(q)}.`,
            graph: circleFig(base.value * 180, ""),
            steps: [
              `Coterminal angles differ by whole turns of 2π. ${k > 0 ? `${pih(q)} is more than 2π, so subtract` : `${pih(q)} is negative, so add`} ${n(2 * K)}π.`,
              `Write ${n(2 * K)}π over ${n(den)}: ${n(2 * K)}π = ${M.frac(`${n(inDen.n)}π`, n(den))}. Then ${pih(q)} ${k > 0 ? "−" : "+"} ${M.frac(`${n(inDen.n)}π`, n(den))} = ${pih(base)}.`,
            ],
            answer: { kind: "number", value: base.value * Math.PI }, answerText: pih(base), answerInput: pit(base),
            vals: { twoK: 2 * K, inDen: inDen.n, base: fv(base) }, params: { q: fv(q), rad: 1, den },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            let base;
            do base = r.int(1, 359); while (base % 90 === 0);
            const k = r.pick([-1, 0, 0, 1]), a = base + 360 * k, qd = quad(base), ref = refD(base);
            const steps = [];
            if (k !== 0) steps.push(`First find the coterminal angle between 0° and 360°: ${dg(a)} ${k > 0 ? "−" : "+"} 360° = ${dg(base)}.`);
            const how = qd === 1 ? `In quadrant I the angle is its own reference angle: ${dg(ref)}.`
              : qd === 2 ? `In quadrant II, ${th}′ = 180° − ${th} = 180° − ${dg(base)} = ${dg(ref)}.`
                : qd === 3 ? `In quadrant III, ${th}′ = ${th} − 180° = ${dg(base)} − 180° = ${dg(ref)}.`
                  : `In quadrant IV, ${th}′ = 360° − ${th} = 360° − ${dg(base)} = ${dg(ref)}.`;
            steps.push(`${dg(base)} lies in quadrant ${ROMAN[qd]}. The reference angle is the acute angle between the terminal side and the x-axis.`, how);
            return {
              prompt: `Find the reference angle of ${dg(a)}.`,
              graph: circleFig(base, ""), steps,
              answer: { kind: "number", value: ref }, answerText: dg(ref), answerInput: String(ref), deg: true,
              vals: { base, ref }, params: { a, rad: 0 }, consts: [180, 360],
            };
          }
          const den = r.pick([3, 4, 6]);
          let base;
          do base = new Frac(r.int(1, 2 * den - 1), den); while (base.d !== den || (base.n * 2) % base.d === 0);
          const k = r.pick([-1, 0, 0, 1]), q = base.add(2 * k), d = base.value * 180, qd = quad(Math.round(d));
          const ref = qd === 1 ? base : qd === 2 ? new Frac(1).sub(base) : qd === 3 ? base.sub(1) : new Frac(2).sub(base);
          const steps = [];
          if (k !== 0) steps.push(`First find the coterminal angle between 0 and 2π: ${pih(q)} ${k > 0 ? "−" : "+"} 2π = ${pih(base)}.`);
          const how = qd === 1 ? `In quadrant I the angle is its own reference angle: ${pih(ref)}.`
            : qd === 2 ? `In quadrant II, ${th}′ = π − ${th} = π − ${pih(base)} = ${pih(ref)}.`
              : qd === 3 ? `In quadrant III, ${th}′ = ${th} − π = ${pih(base)} − π = ${pih(ref)}.`
                : `In quadrant IV, ${th}′ = 2π − ${th} = 2π − ${pih(base)} = ${pih(ref)}.`;
          steps.push(`${pih(base)} lies in quadrant ${ROMAN[qd]} (between ${pih(new Frac(qd - 1, 2))} and ${pih(new Frac(qd, 2))}).`, how);
          return {
            prompt: `Find the reference angle of ${pih(q)}. Give an exact answer in terms of π.`,
            graph: circleFig(d, ""), steps,
            answer: { kind: "number", value: ref.value * Math.PI }, answerText: pih(ref), answerInput: pit(ref),
            vals: { base: fv(base), ref: fv(ref), lo: fv(new Frac(qd - 1, 2)), hi: fv(new Frac(qd, 2)) }, params: { q: fv(q), rad: 1 },
          };
        }
        // level 3: an exact value through coterminal angle, reference angle and sign
        const rad = r.chance(0.5), f = r.pick(FN6), base = r.pick(NONAXIS), k = r.pick([-2, -1, 1, 2]);
        const a = base + 360 * k, qd = quad(base), ref = refD(base), vref = trigD(f, ref), v = trigD(f, base);
        const pos = v.value > 0;
        const turn = rad ? `${n(2 * Math.abs(k))}π` : `${n(360 * Math.abs(k))}°`;
        return {
          prompt: `Find the exact value of ${f}(${ang(a, rad)}).`,
          steps: [
            `Remove whole turns: ${ang(a, rad)} ${k > 0 ? "−" : "+"} ${turn} = ${ang(base, rad)}, which has the same terminal side.`,
            `${ang(base, rad)} is in quadrant ${ROMAN[qd]}, with reference angle ${ang(ref, rad)}.`,
            `${f} ${ang(ref, rad)} = ${rh(vref)}.`,
            `In quadrant ${ROMAN[qd]} ${POS[qd]}, so ${f} is ${pos ? "positive" : "negative"} there: ${f}(${ang(a, rad)}) = ${rh(v)}.`,
          ],
          answer: { kind: "number", value: v.value }, answerText: rh(v), answerInput: rt(v),
          vals: { turn: rad ? 2 * Math.abs(k) : 360 * Math.abs(k), base: rad ? fv(dq(base)) : base, ref: rad ? fv(dq(ref)) : ref, vref: rv(vref), v: rv(v) },
          params: { a: rad ? fv(dq(a)) : a, f: FN6.indexOf(f), rad: rad ? 1 : 0 },
        };
      },
    },

    // ---- T.4 Unit circle and exact values ------------------------------------------------------------
    "T.3": {
      title: "Unit circle and exact values",
      generate(r, level) {
        if (level === 1) {
          const d = r.pick(SPECIAL), c = cosD(d), s = sinD(d);
          const steps = [`On the unit circle, P(${th}) = (cos ${th}, sin ${th}).`, pointStep(d, false)];
          return {
            prompt: `Find the exact coordinates of the point P where the terminal side of ${dg(d)} meets the unit circle.`,
            graph: circleFig(d), steps,
            answer: { kind: "point", value: [c.value, s.value] }, answerText: `(${rh(c)}, ${rh(s)})`, answerInput: `(${rt(c)}, ${rt(s)})`,
            vals: { c: rv(c), s: rv(s), ...(d % 90 ? { cr: rv(cosD(refD(d))), sr: rv(sinD(refD(d))), ref: refD(d) } : {}) },
            params: { d },
          };
        }
        if (level === 2) {
          let d, f, v;
          do { d = r.pick(SPECIAL); f = r.pick(FN6); v = trigD(f, d); } while (!v);
          const c = cosD(d), s = sinD(d);
          return {
            prompt: `Use the unit circle to find the exact value of ${f}(${pih(dq(d))}).`,
            graph: circleFig(d),
            steps: [`On the unit circle, P(${th}) = (cos ${th}, sin ${th}).`, pointStep(d, true), fromPoint(f, d, true)],
            answer: { kind: "number", value: v.value }, answerText: rh(v), answerInput: rt(v),
            vals: { q: fv(dq(d)), c: rv(c), s: rv(s), v: rv(v), ...(d % 90 ? { cr: rv(cosD(refD(d))), sr: rv(sinD(refD(d))), ref: fv(dq(refD(d))) } : {}) },
            params: { d, f: FN6.indexOf(f) },
          };
        }
        // level 3: a point on the terminal side, read from the grid
        const [a0, b0, h0] = r.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10]]);
        const k = h0 <= 5 && r.chance(0.4) ? 2 : 1;
        const x = a0 * k * r.sign(), y = b0 * k * r.sign(), rr = x * x + y * y, h = h0 * k, f = r.pick(FN6);
        const side = { x, y, r: h };
        const RAT = { sin: ["y", "r"], cos: ["x", "r"], tan: ["y", "x"], csc: ["r", "y"], sec: ["r", "x"], cot: ["x", "y"] };
        const [tk, bk] = RAT[f], ans = new Frac(side[tk], side[bk]);
        const lim = Math.max(Math.abs(x), Math.abs(y)) + 2;
        return {
          prompt: `The terminal side of ${th} in standard position passes through the marked point P, which sits on grid corners. Find ${f} ${th} as a fraction in lowest terms.`,
          graph: graph({ view: [-lim, lim, -lim, lim], equal: true, items: [{ t: "seg", a: [0, 0], b: [x, y], role: "primary" }, { t: "pt", x, y, label: "P" }] }),
          steps: [
            `Read the point from the grid: P = (${n(x)}, ${n(y)}).`,
            `Its distance from the origin: ${M.v("r")} = ${M.sqrt(`${M.sup(np(x), 2)} + ${M.sup(np(y), 2)}`)} = ${M.sqrt(`${n(x * x)} + ${n(y * y)}`)} = ${M.sqrt(n(rr))} = ${n(h)}.`,
            `${f} ${th} = ${M.frac(M.v(tk), M.v(bk))} = ${rawF(side[tk], side[bk])}${ans.n === side[tk] && ans.d === side[bk] ? "" : ` = ${M.f(ans)}`}.`,
          ],
          answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
          vals: { xx: x * x, yy: y * y, rr, h, ans: fv(ans) }, params: { x, y, f: FN6.indexOf(f) },
        };
      },
    },

    // ---- T.5 Graphs of the six functions -------------------------------------------------------------
    "T.basic-graphs": {
      title: "Graphs of the six trigonometric functions",
      generate(r, level) {
        const EXPR = { sin: "sin(x)", cos: "cos(x)", tan: "tan(x)", csc: "1/sin(x)", sec: "1/cos(x)", cot: "cos(x)/sin(x)" };
        const PI = Math.PI;
        const marks = (lo, hi) => {
          const items = [];
          for (let k = Math.ceil(lo / PI); k <= Math.floor(hi / PI); k++) {
            if (k === 0) continue;
            items.push({ t: "vline", x: k * PI, dash: true, role: "muted" });
            items.push({ t: "text", x: k * PI, y: -0.45, s: k === 1 ? "π" : k === -1 ? "−π" : `${k < 0 ? "−" : ""}${Math.abs(k)}π` });
          }
          return items;
        };
        if (level === 1) {
          const fi = r.int(0, 5), f = FN6[fi];
          const opts = r.shuffle([fi, ...r.sample([0, 1, 2, 3, 4, 5].filter((i) => i !== fi), 3)]);
          const options = opts.map((i) => `${M.v("y")} = ${FN6[i]} ${X}`);
          const FEAT = {
            sin: `The curve is a smooth wave between −1 and 1. It passes through the origin going up and reaches its maximum 1 at ${X} = ${M.frac("π", "2")}.`,
            cos: `The curve is a smooth wave between −1 and 1 with its maximum 1 on the y-axis (at ${X} = 0); it crosses zero at ${X} = ±${M.frac("π", "2")}.`,
            tan: `The curve has vertical asymptotes at ${X} = ±${M.frac("π", "2")}, passes through the origin and rises from left to right on each piece; the pattern repeats every π.`,
            cot: `The curve has vertical asymptotes at ${X} = 0 and ${X} = ±π, falls from left to right on each piece and crosses zero at ${X} = ±${M.frac("π", "2")}.`,
            sec: `The curve is made of U-shaped branches that never take values between −1 and 1. A branch opens upward from its low point (0, 1) on the y-axis, with asymptotes at ${X} = ±${M.frac("π", "2")}.`,
            csc: `The curve is made of U-shaped branches that never take values between −1 and 1, with asymptotes at ${X} = 0 and ±π. The branch just right of the y-axis opens upward from its low point (${M.frac("π", "2")}, 1).`,
          };
          return {
            prompt: `Which equation does the graph show? The dashed lines mark whole multiples of π.`,
            graph: graph({ view: [-6.6, 6.6, -4, 4], items: [...marks(-6.6, 6.6), { t: "fn", e: EXPR[f], role: "primary" }] }),
            steps: [FEAT[f], `These features belong to ${M.v("y")} = ${f} ${X}.`],
            answer: { kind: "choice", options, index: opts.indexOf(fi) }, answerText: options[opts.indexOf(fi)],
            vals: {}, params: { fi, opts },
          };
        }
        if (level === 2) {
          const zeros = r.chance(0.5);
          const f = zeros ? r.pick(["sin", "cos", "tan", "cot"]) : r.pick(["tan", "cot", "sec", "csc"]);
          const lo = r.pick([0, -1, -2]), hi = lo + 2;
          const half = zeros ? f === "cos" || f === "cot" : f === "tan" || f === "sec";
          const off = new Frac(half ? 1 : 0, 2);
          const sols = [];
          for (let k = -4; k <= 4; k++) { const v = off.add(k); if (v.cmp(lo) >= 0 && v.cmp(hi) < 0) sols.push(v); }
          const WHY = zeros
            ? { sin: `sin ${X} = 0 where the unit-circle point lies on the x-axis.`, cos: `cos ${X} = 0 where the unit-circle point lies on the y-axis.`,
              tan: `tan ${X} = ${M.frac(`sin ${X}`, `cos ${X}`)} is zero where its numerator sin ${X} = 0.`, cot: `cot ${X} = ${M.frac(`cos ${X}`, `sin ${X}`)} is zero where its numerator cos ${X} = 0.` }
            : { tan: `tan ${X} = ${M.frac(`sin ${X}`, `cos ${X}`)} has a vertical asymptote where its denominator cos ${X} = 0.`, sec: `sec ${X} = ${M.frac("1", `cos ${X}`)} has a vertical asymptote where its denominator cos ${X} = 0.`,
              cot: `cot ${X} = ${M.frac(`cos ${X}`, `sin ${X}`)} has a vertical asymptote where its denominator sin ${X} = 0.`, csc: `csc ${X} = ${M.frac("1", `sin ${X}`)} has a vertical asymptote where its denominator sin ${X} = 0.` };
          const iv = `[${pih(lo)}, ${pih(hi)})`;
          return {
            prompt: `Find all ${zeros ? "zeros" : "vertical asymptotes"} of ${M.v("y")} = ${f} ${X} in the interval ${iv}. ${zeros ? "Give the x-values." : "Give the x-values of the asymptotes."}`,
            graph: graph({ view: [lo * Math.PI - 0.3, hi * Math.PI + 0.3, -4, 4], items: [{ t: "fn", e: EXPR[f], role: "primary" }] }),
            steps: [
              WHY[f],
              `That happens at ${X} = ${half ? `${M.frac("π", "2")} + ${M.v("k")}π` : `${M.v("k")}π`} for every whole number ${M.v("k")}.`,
              `The values in ${iv} are ${sols.map(pih).join(", ")}.`,
            ],
            answer: { kind: "numbers", values: sols.map((v) => v.value * Math.PI) }, answerText: sols.map(pih).join(", "), answerInput: sols.map(pit).join(", "),
            vals: { sols: sols.map(fv) }, params: { f: FN6.indexOf(f), zeros: zeros ? 1 : 0, lo },
          };
        }
        // level 3: use the period to evaluate
        let f, per, d0, v, k;
        for (;;) {
          f = r.pick(["tan", "cot", "tan", "cot", "sin", "cos", "sec", "csc"]);
          per = f === "tan" || f === "cot" ? 1 : 2;
          d0 = r.pick(SPECIAL.filter((d) => d > 0 && d < per * 180));
          v = trigD(f, d0);
          k = r.pick([2, 3, 4, 5, -1, -2, -3]);
          if (v) break;
        }
        const q0 = dq(d0), q = q0.add(k * per), kp = Math.abs(k) * per;
        const steps = [
          `${f} repeats every ${per === 1 ? "π" : "2π"}: ${f}(${X} ${per === 1 ? "+ π" : "+ 2π"}) = ${f} ${X}. Adding or removing whole periods does not change the value.`,
          `${pih(q)} ${k > 0 ? "−" : "+"} ${n(kp)}π = ${pih(q0)}, so ${f}(${pih(q)}) = ${f}(${pih(q0)}).`,
        ];
        const vals = { kp, q0: fv(q0), v: rv(v) };
        if (d0 % 90 === 0 || quad(d0) === 1) steps.push(`From the unit circle, ${f}(${pih(q0)}) = ${rh(v)}.`);
        else {
          const ref = refD(d0), vref = trigD(f, ref);
          steps.push(`${pih(q0)} is in quadrant ${ROMAN[quad(d0)]} with reference angle ${pih(dq(ref))}; ${f}(${pih(dq(ref))}) = ${rh(vref)}, and in quadrant ${ROMAN[quad(d0)]} ${POS[quad(d0)]}, so ${f}(${pih(q0)}) = ${rh(v)}.`);
          Object.assign(vals, { ref: fv(dq(ref)), vref: rv(vref) });
        }
        return {
          prompt: `Use the period of ${f} to find the exact value of ${f}(${pih(q)}).`,
          steps, answer: { kind: "number", value: v.value }, answerText: rh(v), answerInput: rt(v),
          vals, params: { f: FN6.indexOf(f), q: fv(q) },
        };
      },
    },

    // ---- T.6 Pythagorean and symmetry identities -------------------------------------------------------
    "T.4": {
      title: "Pythagorean and symmetry identities",
      generate(r, level) {
        const sq = (f) => `${M.sup(f, 2)}${th}`;
        const fsq = (q) => M.sup(`(${M.f(q)})`, 2);
        if (level === 1) {
          const [a0, b0, h] = r.pick(TRIPLES), swap = r.chance(0.5);
          const p = swap ? b0 : a0, qv = swap ? a0 : b0;
          const given = r.pick(["sin", "cos"]), other = given === "sin" ? "cos" : "sin";
          const v = new Frac(p, h), ans = new Frac(qv, h), pp = p * p, hh = h * h, qq = hh - pp;
          return {
            prompt: `If ${given} ${th} = ${M.f(v)} and ${th} is acute (0° &lt; ${th} &lt; 90°), find ${other} ${th}.`,
            steps: [
              `Use ${sq("sin")} + ${sq("cos")} = 1: ${sq(other)} = 1 − ${fsq(v)} = 1 − ${M.frac(n(pp), n(hh))} = ${M.frac(n(qq), n(hh))}.`,
              `${th} is acute, so ${other} ${th} is positive: ${other} ${th} = ${M.sqrt(M.frac(n(qq), n(hh)))} = ${M.f(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
            vals: { pp, hh, qq, ans: fv(ans) }, params: { v: fv(v), given: given === "sin" ? 0 : 1 }, consts: [90],
          };
        }
        if (level === 2) {
          const [a0, b0, h] = r.pick(TRIPLES), swap = r.chance(0.5);
          const ax = swap ? b0 : a0, by = swap ? a0 : b0, qd = r.pick([2, 3, 4]);
          const x = (qd === 2 || qd === 3 ? -1 : 1) * ax, y = (qd >= 3 ? -1 : 1) * by;
          const sinv = new Frac(y, h), cosv = new Frac(x, h), tanv = new Frac(y, x);
          const given = r.pick(["sin", "cos", "tan"]);
          const RECIP = { sin: "csc", cos: "sec", tan: "cot" };
          const asked = r.pick(FN6.filter((f) => f !== given && f !== RECIP[given]));
          const xx = x * x, yy = y * y, hh = h * h;
          const VAL = { sin: sinv, cos: cosv, tan: tanv };
          const sgn = (v) => (v > 0 ? "positive" : "negative");
          const steps = [`In quadrant ${ROMAN[qd]}, sin ${th} is ${sgn(y)} and cos ${th} is ${sgn(x)}.`];
          if (given === "sin") steps.push(`${sq("cos")} = 1 − ${sq("sin")} = 1 − ${fsq(sinv)} = 1 − ${M.frac(n(yy), n(hh))} = ${M.frac(n(xx), n(hh))}, so cos ${th} = ±${M.frac(n(ax), n(h))}. Cosine is ${sgn(x)} here: cos ${th} = ${M.f(cosv)}.`);
          else if (given === "cos") steps.push(`${sq("sin")} = 1 − ${sq("cos")} = 1 − ${fsq(cosv)} = 1 − ${M.frac(n(xx), n(hh))} = ${M.frac(n(yy), n(hh))}, so sin ${th} = ±${M.frac(n(by), n(h))}. Sine is ${sgn(y)} here: sin ${th} = ${M.f(sinv)}.`);
          else {
            steps.push(`${sq("sec")} = 1 + ${sq("tan")} = 1 + ${fsq(tanv)} = 1 + ${M.frac(n(yy), n(xx))} = ${M.frac(n(hh), n(xx))}, so sec ${th} = ±${M.frac(n(h), n(ax))} and cos ${th} = ±${M.frac(n(ax), n(h))}. Cosine is ${sgn(x)} here: cos ${th} = ${M.f(cosv)}.`);
            steps.push(`sin ${th} = tan ${th} · cos ${th} = ${fp(tanv)} · ${fp(cosv)} = ${M.f(sinv)}.`);
          }
          const known = given === "tan" ? ["sin", "cos", "tan"] : [given, given === "sin" ? "cos" : "sin"];
          let ans;
          if (known.includes(asked)) ans = VAL[asked];
          else if (asked === "tan") { ans = tanv; steps.push(`tan ${th} = ${M.frac(`sin ${th}`, `cos ${th}`)} = ${fp(sinv)} ÷ ${fp(cosv)} = ${M.f(tanv)}.`); }
          else if (asked === "sec") { ans = new Frac(1).div(cosv); steps.push(`sec ${th} = ${M.frac("1", `cos ${th}`)} = ${M.f(ans)}.`); }
          else if (asked === "csc") { ans = new Frac(1).div(sinv); steps.push(`csc ${th} = ${M.frac("1", `sin ${th}`)} = ${M.f(ans)}.`); }
          else { ans = new Frac(1).div(tanv); steps.push(`cot ${th} = ${M.frac(`cos ${th}`, `sin ${th}`)} = ${fp(cosv)} ÷ ${fp(sinv)} = ${M.f(ans)}.`); }
          if (known.includes(asked)) steps.push(`So ${asked} ${th} = ${M.f(ans)}.`);
          return {
            prompt: `If ${given} ${th} = ${M.f(VAL[given])} and ${qr(qd, th)}, find ${asked} ${th}.`,
            steps, answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
            vals: { xx, yy, hh, ax, by, h, sinv: fv(sinv), cosv: fv(cosv), tanv: fv(tanv), ans: fv(ans) },
            params: { v: fv(VAL[given]), given: ["sin", "cos", "tan"].indexOf(given), qd, asked: FN6.indexOf(asked) }, consts: [3],
          };
        }
        // level 3: symmetry identities, then the Pythagorean identity
        const TR = [
          { s: `−${th}`, g: { sin: -1, cos: 1, tan: -1 }, why: "a reflection across the x-axis flips only y" },
          { s: `π − ${th}`, g: { sin: 1, cos: -1, tan: -1 }, why: "a reflection across the y-axis flips only x" },
          { s: `${th} + π`, g: { sin: -1, cos: -1, tan: 1 }, why: "a half turn flips both coordinates" },
          { s: `${th} + 2π`, g: { sin: 1, cos: 1, tan: 1 }, why: "a full turn returns to the same point" },
        ];
        const [a0, b0, h] = r.pick(TRIPLES), swap = r.chance(0.5);
        const p = swap ? b0 : a0, qv = swap ? a0 : b0;
        const given = r.pick(["sin", "cos"]);
        const sinv = new Frac(given === "sin" ? p : qv, h), cosv = new Frac(given === "sin" ? qv : p, h), tanv = sinv.div(cosv);
        const VAL = { sin: sinv, cos: cosv, tan: tanv };
        const [f1, f2] = r.sample(["sin", "cos", "tan"], 2), [i1, i2] = r.sample([0, 1, 2, 3], 2), plus = r.chance(0.5);
        const s1 = TR[i1].g[f1], s2 = TR[i2].g[f2];
        const t1 = VAL[f1].mul(s1), t2 = VAL[f2].mul(s2), ans = plus ? t1.add(t2) : t1.sub(t2);
        const op = plus ? "+" : "−";
        const ident = (f, i, s) => `${f}(${TR[i].s}) = ${s < 0 ? "−" : ""}${f} ${th} (${TR[i].why})`;
        const other = given === "sin" ? "cos" : "sin";
        const vv = VAL[given], pp = vv.n * vv.n, hh = h * h;
        const steps = [
          `Rewrite each term with a symmetry identity: ${ident(f1, i1, s1)}, and ${ident(f2, i2, s2)}.`,
          `Find ${other} ${th} from ${sq("sin")} + ${sq("cos")} = 1: ${sq(other)} = 1 − ${M.frac(n(pp), n(hh))} = ${M.frac(n(hh - pp), n(hh))}, and ${th} is acute, so ${other} ${th} = ${M.f(VAL[other])}.`,
        ];
        if (f1 === "tan" || f2 === "tan") steps.push(`tan ${th} = ${M.frac(`sin ${th}`, `cos ${th}`)} = ${M.f(sinv)} ÷ ${M.f(cosv)} = ${M.f(tanv)}.`);
        steps.push(`Substitute: ${fp(t1)} ${op} ${fp(t2)} = ${M.f(ans)}.`);
        return {
          prompt: `If ${given} ${th} = ${M.f(vv)} and ${th} is acute, find the exact value of ${M.eq(`${f1}(${TR[i1].s}) ${op} ${f2}(${TR[i2].s})`)}`,
          steps, answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
          vals: { pp, hh, qq: hh - pp, other: fv(VAL[other]), tanv: fv(tanv), t1: fv(t1), t2: fv(t2), ans: fv(ans) },
          params: { v: fv(vv), given: given === "sin" ? 0 : 1, f1: FN6.indexOf(f1), f2: FN6.indexOf(f2), i1, i2, plus: plus ? 1 : 0 },
        };
      },
    },

    // ---- T.7 Reciprocal, quotient and cofunction identities ---------------------------------------------
    "T.cofunction": {
      title: "Reciprocal, quotient and cofunction identities",
      generate(r, level) {
        const PAIRS = [["sin", "cos"], ["cos", "sin"], ["tan", "cot"], ["cot", "tan"], ["sec", "csc"], ["csc", "sec"]];
        if (level === 1) {
          const pair = r.int(0, 5), [f, g] = PAIRS[pair];
          if (r.chance(0.65)) {
            const al = r.intExcept(5, 85, 45), ans = 90 - al;
            return {
              prompt: `Find the acute angle ${th} for which ${f} ${th} = ${g} ${dg(al)}.`,
              steps: [
                `Cofunctions of complementary angles are equal: ${g} α = ${f}(90° − α) for every angle α.`,
                `So ${g} ${dg(al)} = ${f}(90° − ${dg(al)}) = ${f} ${dg(ans)}, which gives ${th} = ${dg(ans)}.`,
              ],
              answer: { kind: "number", value: ans }, answerText: dg(ans), answerInput: String(ans), deg: true,
              vals: { ans }, params: { pair, al, rad: 0 }, consts: [90],
            };
          }
          const q = r.pick([new Frac(1, 5), new Frac(1, 8), new Frac(1, 10), new Frac(1, 12), new Frac(3, 8), new Frac(3, 10), new Frac(5, 12), new Frac(1, 9), new Frac(2, 9), new Frac(4, 9), new Frac(1, 7), new Frac(2, 7), new Frac(3, 7)]);
          const ans = new Frac(1, 2).sub(q), L = P.lcm(2, q.d), hN = L / 2, qN = (q.n * L) / q.d;
          const piN = (k) => M.frac(`${k === 1 ? "" : n(k)}π`, n(L));
          return {
            prompt: `Find the acute angle ${th} (in radians) for which ${f} ${th} = ${g}(${pih(q)}). Give an exact answer in terms of π.`,
            steps: [
              `Cofunctions of complementary angles are equal: ${g} α = ${f}(${M.frac("π", "2")} − α) for every angle α.`,
              `So ${th} = ${M.frac("π", "2")} − ${pih(q)} = ${piN(hN)} − ${piN(qN)} = ${pih(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value * Math.PI }, answerText: pih(ans), answerInput: pit(ans),
            vals: { L, hN, qN, ans: fv(ans) }, params: { pair, q: fv(q), rad: 1 },
          };
        }
        if (level === 2) {
          const fx_ = (f) => `${f} ${X}`, s2 = (f) => `${M.sup(f, 2)} ${X}`, F = M.frac;
          const E = [
            [`${fx_("sin")} · ${fx_("sec")}`, 2, [`Write sec ${X} = ${F("1", fx_("cos"))}: ${fx_("sin")} · ${F("1", fx_("cos"))} = ${F(fx_("sin"), fx_("cos"))}.`]],
            [`${fx_("cos")} · ${fx_("csc")}`, 5, [`Write csc ${X} = ${F("1", fx_("sin"))}: ${fx_("cos")} · ${F("1", fx_("sin"))} = ${F(fx_("cos"), fx_("sin"))}.`]],
            [`${fx_("tan")} · ${fx_("cos")}`, 0, [`Write tan ${X} = ${F(fx_("sin"), fx_("cos"))}: ${F(fx_("sin"), fx_("cos"))} · ${fx_("cos")}; the cosines cancel.`]],
            [`${fx_("cot")} · ${fx_("sin")}`, 1, [`Write cot ${X} = ${F(fx_("cos"), fx_("sin"))}: ${F(fx_("cos"), fx_("sin"))} · ${fx_("sin")}; the sines cancel.`]],
            [`${fx_("sec")} · ${fx_("cot")}`, 3, [`Write both in sine and cosine: ${F("1", fx_("cos"))} · ${F(fx_("cos"), fx_("sin"))} = ${F("1", fx_("sin"))}.`]],
            [`${fx_("csc")} · ${fx_("tan")}`, 4, [`Write both in sine and cosine: ${F("1", fx_("sin"))} · ${F(fx_("sin"), fx_("cos"))} = ${F("1", fx_("cos"))}.`]],
            [F(fx_("sin"), fx_("tan")), 1, [`Dividing by tan ${X} = ${F(fx_("sin"), fx_("cos"))} is multiplying by ${F(fx_("cos"), fx_("sin"))}: ${fx_("sin")} · ${F(fx_("cos"), fx_("sin"))}; the sines cancel.`]],
            [F(fx_("cos"), fx_("cot")), 0, [`Dividing by cot ${X} = ${F(fx_("cos"), fx_("sin"))} is multiplying by ${F(fx_("sin"), fx_("cos"))}: ${fx_("cos")} · ${F(fx_("sin"), fx_("cos"))}; the cosines cancel.`]],
            [F(fx_("tan"), fx_("sin")), 4, [`${F(fx_("tan"), fx_("sin"))} = ${F(fx_("sin"), fx_("cos"))} · ${F("1", fx_("sin"))} = ${F("1", fx_("cos"))}.`]],
            [F(fx_("cot"), fx_("cos")), 3, [`${F(fx_("cot"), fx_("cos"))} = ${F(fx_("cos"), fx_("sin"))} · ${F("1", fx_("cos"))} = ${F("1", fx_("sin"))}.`]],
            [`(1 − ${s2("sin")}) · ${fx_("sec")}`, 1, [`By the Pythagorean identity, 1 − ${s2("sin")} = ${s2("cos")}.`, `${s2("cos")} · ${F("1", fx_("cos"))} = ${fx_("cos")}.`]],
            [`(1 − ${s2("cos")}) · ${fx_("csc")}`, 0, [`By the Pythagorean identity, 1 − ${s2("cos")} = ${s2("sin")}.`, `${s2("sin")} · ${F("1", fx_("sin"))} = ${fx_("sin")}.`]],
            [`(${s2("sec")} − 1) · ${fx_("cot")}`, 2, [`From 1 + ${s2("tan")} = ${s2("sec")}: ${s2("sec")} − 1 = ${s2("tan")}.`, `${s2("tan")} · ${F("1", fx_("tan"))} = ${fx_("tan")}.`]],
            [`(1 + ${s2("cot")}) · ${fx_("sin")}`, 3, [`From 1 + ${s2("cot")} = ${s2("csc")}: the expression is ${s2("csc")} · ${fx_("sin")}.`, `${F("1", s2("sin"))} · ${fx_("sin")} = ${F("1", fx_("sin"))}.`]],
            [`${fx_("sec")} − ${fx_("tan")} · ${fx_("sin")}`, 1, [`Write in sine and cosine: ${F("1", fx_("cos"))} − ${F(s2("sin"), fx_("cos"))} = ${F(`1 − ${s2("sin")}`, fx_("cos"))}.`, `1 − ${s2("sin")} = ${s2("cos")}, so this is ${F(s2("cos"), fx_("cos"))}.`]],
            [`${fx_("csc")} − ${fx_("cot")} · ${fx_("cos")}`, 0, [`Write in sine and cosine: ${F("1", fx_("sin"))} − ${F(s2("cos"), fx_("sin"))} = ${F(`1 − ${s2("cos")}`, fx_("sin"))}.`, `1 − ${s2("cos")} = ${s2("sin")}, so this is ${F(s2("sin"), fx_("sin"))}.`]],
          ];
          const ei = r.int(0, E.length - 1), [expr, ai, st] = E[ei];
          const opts = r.shuffle([ai, ...r.sample([0, 1, 2, 3, 4, 5].filter((i) => i !== ai), 3)]);
          const options = opts.map((i) => `${FN6[i]} ${X}`);
          return {
            prompt: `Simplify to a single trigonometric ratio of ${X}: ${M.eq(expr)}`,
            steps: [...st, `The expression simplifies to ${FN6[ai]} ${X}.`],
            answer: { kind: "choice", options, index: opts.indexOf(ai) }, answerText: options[opts.indexOf(ai)],
            vals: {}, params: { ei, opts },
          };
        }
        // level 3: cofunction equation with linear arguments, in degrees
        for (;;) {
          const pair = r.int(0, 5), [f, g] = PAIRS[pair];
          const x0 = r.int(5, 25), a = r.int(1, 4), c = r.int(1, 4), A1 = r.int(12, 78), A2 = 90 - A1;
          const b = A1 - a * x0, d = A2 - c * x0;
          if (b === 0 || d === 0 || Math.abs(b) > 50 || Math.abs(d) > 50) continue;
          const s1 = a + c, s2 = b + d, Rt = 90 - s2;
          const arg = (k, m) => `${k === 1 ? "" : n(k)}${X}${m < 0 ? " − " : " + "}${dg(Math.abs(m))}`;
          return {
            prompt: `Solve ${M.eq(`${f}(${arg(a, b)}) = ${g}(${arg(c, d)})`)} for ${X} (in degrees), taking the solution for which both angles are acute.`,
            steps: [
              `${f} and ${g} are cofunctions, and cofunctions of complementary angles are equal. So the two angles add to 90°: (${arg(a, b)}) + (${arg(c, d)}) = 90°.`,
              `Combine like terms: ${n(s1)}${X} ${s2 < 0 ? "−" : "+"} ${dg(Math.abs(s2))} = 90°, so ${n(s1)}${X} = 90° ${s2 < 0 ? "+" : "−"} ${dg(Math.abs(s2))} = ${dg(Rt)}.`,
              `${X} = ${dg(Rt)} ÷ ${n(s1)} = ${dg(x0)}. Check: the angles are ${dg(A1)} and ${dg(A2)}, both acute, and they add to 90°.`,
            ],
            answer: { kind: "number", value: x0 }, answerText: dg(x0), answerInput: String(x0), deg: true,
            vals: { s1, s2, Rt, x0, A1, A2 }, params: { pair, a, b, c, d }, consts: [90],
          };
        }
      },
    },

    // ---- T.8 Sum and difference formulas ----------------------------------------------------------------
    "T.5": {
      title: "Sum and difference formulas",
      generate(r, level) {
        if (level <= 2) {
          const rad = level === 2;
          const T = rad ? r.pick([15, 75, 105, 165, 195, 255, 285, 345]) : r.pick([15, 75, 105, 165]);
          const f = rad ? r.pick(["sin", "cos", "tan", "tan"]) : r.pick(["sin", "cos"]);
          const [A, B, sg] = T === 15 ? [45, 30, -1] : [T - 45, 45, 1];
          const a = (d) => ang(d, rad), op = sg > 0 ? "+" : "−";
          const steps = [`Write ${a(T)} = ${a(A)} ${op} ${a(B)}, a ${sg > 0 ? "sum" : "difference"} of special angles.`];
          const vals = { A: rad ? fv(dq(A)) : A, B: rad ? fv(dq(B)) : B };
          let ans;
          if (f === "tan") {
            const ta = trigD("tan", A), tb = trigD("tan", B);
            const N = sg > 0 ? ta.add(tb) : ta.sub(tb), D = sg > 0 ? Rad.of(1).sub(ta.mul(tb)) : Rad.of(1).add(ta.mul(tb));
            steps.push(`tan(α ${op} β) = ${M.frac(`tan α ${op} tan β`, `1 ${sg > 0 ? "−" : "+"} tan α tan β`)}, with tan ${a(A)} = ${rh(ta)} and tan ${a(B)} = ${rh(tb)}.`);
            steps.push(`${app("tan", a(T), rad)} = ${M.frac(`${rh(ta)} ${op} ${rh(tb, { paren: true })}`, `1 ${sg > 0 ? "−" : "+"} ${rh(ta, { paren: true })} · ${rh(tb, { paren: true })}`)} = ${M.frac(rh(N), rh(D))}.`);
            const rz = rationalize(N, D);
            steps.push(...rz.steps);
            ans = rz.ans;
            Object.assign(vals, { ta: rv(ta), tb: rv(tb), N: rv(N), D: rv(D), ...rz.vals });
          } else {
            const sa = sinD(A), ca = cosD(A), sb = sinD(B), cb = cosD(B);
            let p1, p2, line, form, op2;
            if (f === "sin") {
              p1 = sa.mul(cb); p2 = ca.mul(sb); op2 = op;
              form = `sin(α ${op} β) = sin α cos β ${op} cos α sin β`;
              line = `${rh(sa, { paren: true })} · ${rh(cb, { paren: true })} ${op2} ${rh(ca, { paren: true })} · ${rh(sb, { paren: true })}`;
            } else {
              p1 = ca.mul(cb); p2 = sa.mul(sb); op2 = sg > 0 ? "−" : "+";
              form = `cos(α ${op} β) = cos α cos β ${op2} sin α sin β`;
              line = `${rh(ca, { paren: true })} · ${rh(cb, { paren: true })} ${op2} ${rh(sa, { paren: true })} · ${rh(sb, { paren: true })}`;
            }
            ans = op2 === "+" ? p1.add(p2) : p1.sub(p2);
            steps.push(`Use ${form} with α = ${a(A)} and β = ${a(B)}.`);
            steps.push(`${app(f, a(T), rad)} = ${line} = ${rh(p1)} ${op2} ${rh(p2, { paren: true })}.`);
            steps.push(`Combine over the common denominator: ${rh(ans)}.`);
            Object.assign(vals, { sa: rv(sa), ca: rv(ca), sb: rv(sb), cb: rv(cb), p1: rv(p1), p2: rv(p2) });
          }
          vals.ans = rv(ans);
          return {
            prompt: `Use a ${T === 15 ? "difference" : "sum"} formula to find the exact value of ${app(f, a(T), rad)}.`,
            steps, answer: { kind: "number", value: ans.value }, answerText: rh(ans), answerInput: rt(ans),
            vals, params: { T: rad ? fv(dq(T)) : T, f: FN6.indexOf(f), rad: rad ? 1 : 0 },
          };
        }
        // level 3: angles given by one ratio and a quadrant
        for (;;) {
          const t1 = r.pick(TRIPLES.slice(0, 3)), t2 = r.pick(TRIPLES.slice(0, 3)), sw1 = r.chance(0.5), sw2 = r.chance(0.5);
          const qa = r.int(1, 4), qb = r.int(1, 4);
          const sx = (q) => (q === 2 || q === 3 ? -1 : 1), sy = (q) => (q >= 3 ? -1 : 1);
          const h1 = t1[2], h2 = t2[2];
          const x1 = sx(qa) * (sw1 ? t1[1] : t1[0]), y1 = sy(qa) * (sw1 ? t1[0] : t1[1]);
          const x2 = sx(qb) * (sw2 ? t2[1] : t2[0]), y2 = sy(qb) * (sw2 ? t2[0] : t2[1]);
          const sa = new Frac(y1, h1), ca = new Frac(x1, h1), sb = new Frac(y2, h2), cb = new Frac(x2, h2);
          const f = r.pick(["sin", "cos"]), plus = r.chance(0.5), op = plus ? "+" : "−";
          let p1, p2, op2, form;
          if (f === "sin") { p1 = sa.mul(cb); p2 = ca.mul(sb); op2 = op; form = `sin α cos β ${op} cos α sin β`; }
          else { p1 = ca.mul(cb); p2 = sa.mul(sb); op2 = plus ? "−" : "+"; form = `cos α cos β ${op2} sin α sin β`; }
          const ans = op2 === "+" ? p1.add(p2) : p1.sub(p2);
          if (ans.n === 0) continue;
          const sgnTxt = (v) => (v < 0 ? "negative" : "positive");
          const al = M.v("α"), be = M.v("β");
          return {
            prompt: `Given sin ${al} = ${M.f(sa)} with ${qr(qa, al)}, and cos ${be} = ${M.f(cb)} with ${qr(qb, be)}, find the exact value of ${f}(${al} ${op} ${be}).`,
            steps: [
              `cos ${al}: in quadrant ${ROMAN[qa]} cosine is ${sgnTxt(x1)}, so cos ${al} = ${x1 < 0 ? "−" : ""}${M.sqrt(`1 − ${M.frac(n(y1 * y1), n(h1 * h1))}`)} = ${x1 < 0 ? "−" : ""}${M.sqrt(M.frac(n(x1 * x1), n(h1 * h1)))} = ${M.f(ca)}.`,
              `sin ${be}: in quadrant ${ROMAN[qb]} sine is ${sgnTxt(y2)}, so sin ${be} = ${y2 < 0 ? "−" : ""}${M.sqrt(`1 − ${M.frac(n(x2 * x2), n(h2 * h2))}`)} = ${y2 < 0 ? "−" : ""}${M.sqrt(M.frac(n(y2 * y2), n(h2 * h2)))} = ${M.f(sb)}.`,
              `${f}(${al} ${op} ${be}) = ${form.replace(/α/g, al).replace(/β/g, be)}.`,
              f === "sin"
                ? `= ${fp(sa)} · ${fp(cb)} ${op2} ${fp(ca)} · ${fp(sb)} = ${M.f(p1)} ${op2} ${fp(p2)} = ${M.f(ans)}.`
                : `= ${fp(ca)} · ${fp(cb)} ${op2} ${fp(sa)} · ${fp(sb)} = ${M.f(p1)} ${op2} ${fp(p2)} = ${M.f(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
            vals: { yy1: y1 * y1, xx1: x1 * x1, hh1: h1 * h1, xx2: x2 * x2, yy2: y2 * y2, hh2: h2 * h2, ca: fv(ca), sb: fv(sb), p1: fv(p1), p2: fv(p2), ans: fv(ans) },
            params: { sa: fv(sa), qa, cb: fv(cb), qb, f: f === "sin" ? 0 : 1, plus: plus ? 1 : 0 }, consts: [3],
          };
        }
      },
    },

    // ---- T.9 Double- and half-angle formulas --------------------------------------------------------------
    "T.6": {
      title: "Double- and half-angle formulas",
      generate(r, level) {
        const sq = (f) => `${M.sup(f, 2)}${th}`;
        if (level === 1) {
          const [a0, b0, h] = r.pick(TRIPLES), swap = r.chance(0.5);
          const p = swap ? b0 : a0, qv = swap ? a0 : b0;   // sin θ = p/h, cos θ = qv/h
          const given = r.pick(["sin", "cos"]), ask = r.pick(["sin", "cos"]);
          const sinv = new Frac(p, h), cosv = new Frac(qv, h), pp = p * p, qq = qv * qv, hh = h * h;
          const gv = given === "sin" ? sinv : cosv, other = given === "sin" ? "cos" : "sin", ov = given === "sin" ? cosv : sinv;
          const steps = [], vals = { pp, qq, hh };
          let ans;
          if (ask === "sin") {
            steps.push(`Find ${other} ${th}: ${sq(other)} = 1 − ${M.sup(`(${M.f(gv)})`, 2)} = ${M.frac(n(given === "sin" ? qq : pp), n(hh))}, and ${th} is acute, so ${other} ${th} = ${M.f(ov)}.`);
            ans = sinv.mul(cosv).mul(2);
            steps.push(`sin 2${th} = 2 sin ${th} cos ${th} = 2 · ${M.f(sinv)} · ${M.f(cosv)} = ${M.frac(n(2 * p * qv), n(hh))}${ans.d === hh ? "" : ` = ${M.f(ans)}`}.`);
            Object.assign(vals, { ov: fv(ov), top: 2 * p * qv });
          } else if (given === "sin") {
            ans = new Frac(hh - 2 * pp, hh);
            steps.push(`Use the form with sine only: cos 2${th} = 1 − 2${sq("sin")}.`);
            steps.push(`cos 2${th} = 1 − 2 · ${M.sup(`(${M.f(sinv)})`, 2)} = 1 − ${M.frac(n(2 * pp), n(hh))} = ${M.f(ans)}.`);
            Object.assign(vals, { twoS: 2 * pp, top: hh - 2 * pp });
          } else {
            ans = new Frac(2 * qq - hh, hh);
            steps.push(`Use the form with cosine only: cos 2${th} = 2${sq("cos")} − 1.`);
            steps.push(`cos 2${th} = 2 · ${M.sup(`(${M.f(cosv)})`, 2)} − 1 = ${M.frac(n(2 * qq), n(hh))} − 1 = ${M.f(ans)}.`);
            Object.assign(vals, { twoS: 2 * qq, top: 2 * qq - hh });
          }
          vals.ans = fv(ans);
          return {
            prompt: `If ${given} ${th} = ${M.f(gv)} and ${th} is acute, find the exact value of ${ask} 2${th}.`,
            steps, answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
            vals, params: { v: fv(gv), given: given === "sin" ? 0 : 1, ask: ask === "sin" ? 0 : 1 },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            // a double-angle formula read backwards
            const A2 = r.pick([30, 150, 210, 330, 45, 135, 225, 315]), rad = r.chance(0.5), form = r.int(0, 4);
            const Ah = rad ? pih(new Frac(A2, 360)) : dg(A2 / 2);
            const fa = (f, p2 = false) => (rad ? `${p2 ? M.sup(f, 2) : f}(${Ah})` : `${p2 ? M.sup(f, 2) : f} ${Ah}`);
            const FORMS = [
              ["sin", `2 ${fa("sin")} ${fa("cos")}`, `sin 2${th} = 2 sin ${th} cos ${th}`],
              ["cos", `${fa("cos", true)} − ${fa("sin", true)}`, `cos 2${th} = ${sq("cos")} − ${sq("sin")}`],
              ["cos", `2 ${fa("cos", true)} − 1`, `cos 2${th} = 2${sq("cos")} − 1`],
              ["cos", `1 − 2 ${fa("sin", true)}`, `cos 2${th} = 1 − 2${sq("sin")}`],
              ["tan", M.frac(`2 ${fa("tan")}`, `1 − ${fa("tan", true)}`), `tan 2${th} = ${M.frac(`2 tan ${th}`, `1 − ${sq("tan")}`)}`],
            ];
            const [f, expr, name] = FORMS[form];
            const vs = valueStep(f, A2, rad), v = trigD(f, A2);
            return {
              prompt: `Find the exact value of ${M.eq(expr)}`,
              steps: [
                `This is the double-angle formula ${name}, read from right to left, with ${th} = ${Ah}.`,
                `So the expression equals ${app(f, `2 · ${Ah}`, true)} = ${app(f, ang(A2, rad), rad)}.`,
                vs.text,
              ],
              answer: { kind: "number", value: v.value }, answerText: rh(v), answerInput: rt(v),
              vals: { A: rad ? fv(new Frac(A2, 360)) : A2 / 2, A2: rad ? fv(dq(A2)) : A2, v: rv(v), ...vs.vals },
              params: { A2, rad: rad ? 1 : 0, form },
            };
          }
          // the quadrant decides the sign
          const [a0, b0, h] = r.pick(TRIPLES.slice(0, 4)), swap = r.chance(0.5);
          const ax = swap ? b0 : a0, by = swap ? a0 : b0, qd = r.pick([2, 3, 4]);
          const x = (qd === 2 || qd === 3 ? -1 : 1) * ax, y = (qd >= 3 ? -1 : 1) * by;
          const sinv = new Frac(y, h), cosv = new Frac(x, h), tanv = new Frac(y, x);
          const given = r.pick(["sin", "cos"]), ask = r.pick(["sin", "tan"]);
          const gv = given === "sin" ? sinv : cosv, other = given === "sin" ? "cos" : "sin", ov = given === "sin" ? cosv : sinv;
          const steps = [
            `In quadrant ${ROMAN[qd]}, ${other} ${th} is ${ov.n > 0 ? "positive" : "negative"}: ${other} ${th} = ${ov.n > 0 ? "" : "−"}${M.sqrt(`1 − ${M.frac(n(gv.n * gv.n), n(h * h))}`)} = ${ov.n > 0 ? "" : "−"}${M.sqrt(M.frac(n(ov.n * ov.n), n(h * h)))} = ${M.f(ov)}.`,
          ];
          const vals = { gg: gv.n * gv.n, oo: ov.n * ov.n, hh: h * h, ov: fv(ov) };
          let ans;
          if (ask === "sin") {
            ans = sinv.mul(cosv).mul(2);
            steps.push(`sin 2${th} = 2 sin ${th} cos ${th} = 2 · ${fp(sinv)} · ${fp(cosv)} = ${M.f(ans)}.`);
          } else {
            const t2 = tanv.mul(tanv), den = new Frac(1).sub(t2), top = tanv.mul(2);
            ans = top.div(den);
            steps.push(`tan ${th} = ${M.frac(`sin ${th}`, `cos ${th}`)} = ${fp(sinv)} ÷ ${fp(cosv)} = ${M.f(tanv)}.`);
            steps.push(`tan 2${th} = ${M.frac(`2 tan ${th}`, `1 − ${sq("tan")}`)}: the top is 2 · ${fp(tanv)} = ${M.f(top)} and the bottom is 1 − ${M.f(t2)} = ${M.f(den)}.`);
            steps.push(`tan 2${th} = ${fp(top)} ÷ ${fp(den)} = ${M.f(ans)}.`);
            Object.assign(vals, { tanv: fv(tanv), t2: fv(t2), den: fv(den), top: fv(top) });
          }
          vals.ans = fv(ans);
          return {
            prompt: `If ${given} ${th} = ${M.f(gv)} and ${qr(qd, th)}, find the exact value of ${ask} 2${th}.`,
            steps, answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
            vals, params: { v: fv(gv), given: given === "sin" ? 0 : 1, qd, ask: ask === "sin" ? 0 : 2 }, consts: [3],
          };
        }
        // level 3: half-angle with the quadrant of θ/2, or a triple-angle formula
        if (r.chance(0.7)) {
          const [l1, l2, h] = r.pick(TRIPLES.slice(0, 4)), k = r.int(0, 3);
          const big = Math.max(l1, l2), small = Math.min(l1, l2);
          const C = k === 0 || k === 3 ? big : small, Sn = k === 0 || k === 3 ? small : big;   // |cos θ/2| = C/h, sin θ/2 = Sn/h
          const c = new Frac(C * C - Sn * Sn, h * h);
          const halfQ = k <= 1 ? 1 : 2, g = r.pick(["sin", "cos", "tan"]);
          const sH = new Frac(Sn, h), cH = new Frac(halfQ === 1 ? C : -C, h), tH = sH.div(cH);
          const half = M.frac(th, "2");
          const oneM = new Frac(1).sub(c), oneP = new Frac(1).add(c);
          const sinLine = `sin ${half} = ${M.sqrt(M.frac(`1 − cos ${th}`, "2"))} = ${M.sqrt(M.frac(`1 − ${fp(c)}`, "2"))} = ${M.sqrt(M.frac(M.f(oneM), "2"))} = ${M.sqrt(M.f(oneM.div(2)))} = ${M.f(sH)}`;
          const cosLine = `cos ${half} = ${halfQ === 1 ? "" : "−"}${M.sqrt(M.frac(`1 + cos ${th}`, "2"))} = ${halfQ === 1 ? "" : "−"}${M.sqrt(M.frac(`1 + ${fp(c)}`, "2"))} = ${halfQ === 1 ? "" : "−"}${M.sqrt(M.f(oneP.div(2)))} = ${M.f(cH)}`;
          const steps = [
            `Divide the inequality ${pih(new Frac(k, 2))} &lt; ${th} &lt; ${pih(new Frac(k + 1, 2))} by 2: ${pih(new Frac(k, 4))} &lt; ${half} &lt; ${pih(new Frac(k + 1, 4))}, so ${half} is in quadrant ${ROMAN[halfQ]}, where sine is positive and cosine is ${halfQ === 1 ? "positive" : "negative"}.`,
          ];
          let ans;
          if (g === "sin") { ans = sH; steps.push(`${sinLine}.`); }
          else if (g === "cos") { ans = cH; steps.push(`${cosLine}.`); }
          else { ans = tH; steps.push(`${sinLine}.`, `${cosLine}.`, `tan ${half} = ${M.frac(`sin ${half}`, `cos ${half}`)} = ${M.f(sH)} ÷ ${fp(cH)} = ${M.f(tH)}.`); }
          return {
            prompt: `If cos ${th} = ${M.f(c)} and ${pih(new Frac(k, 2))} &lt; ${th} &lt; ${pih(new Frac(k + 1, 2))}, find the exact value of ${g} ${half}.`,
            steps, answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
            vals: { oneM: fv(oneM), oneP: fv(oneP), sH2: fv(oneM.div(2)), cH2: fv(oneP.div(2)), sH: fv(sH), cH: fv(cH), tH: fv(tH), lo: fv(new Frac(k, 2)), hi: fv(new Frac(k + 1, 2)), q0: fv(new Frac(k, 4)), q1: fv(new Frac(k + 1, 4)) },
            params: { c: fv(c), k, g: FN6.indexOf(g) },
          };
        }
        const [a0, b0, h] = r.pick(TRIPLES.slice(0, 2)), swap = r.chance(0.5), useSin = r.chance(0.5);
        const p = swap ? b0 : a0, v = new Frac(p, h), v3 = v.pow(3);
        const ans = useSin ? v.mul(3).sub(v3.mul(4)) : v3.mul(4).sub(v.mul(3));
        const f = useSin ? "sin" : "cos";
        return {
          prompt: `If ${f} ${th} = ${M.f(v)}, find the exact value of ${f} 3${th}.`,
          steps: [
            useSin ? `Triple-angle formula: sin 3${th} = 3 sin ${th} − 4 ${M.sup("sin", 3)}${th}.` : `Triple-angle formula: cos 3${th} = 4 ${M.sup("cos", 3)}${th} − 3 cos ${th}.`,
            `${M.sup(`(${M.f(v)})`, 3)} = ${M.f(v3)}, so 4 ${M.sup(f, 3)}${th} = ${M.f(v3.mul(4))} and 3 ${f} ${th} = ${M.f(v.mul(3))}.`,
            useSin ? `sin 3${th} = ${M.f(v.mul(3))} − ${M.f(v3.mul(4))} = ${M.f(ans)}.` : `cos 3${th} = ${M.f(v3.mul(4))} − ${M.f(v.mul(3))} = ${M.f(ans)}.`,
          ],
          answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
          vals: { v3: fv(v3), v34: fv(v3.mul(4)), v3x: fv(v.mul(3)), ans: fv(ans) }, params: { v: fv(v), f: useSin ? 0 : 1 }, consts: [3, 4],
        };
      },
    },

    // ---- T.10 Power reduction ----------------------------------------------------------------------------------
    "T.power-reduction": {
      title: "Power-reduction formulas",
      generate(r, level) {
        const sq = (f) => `${M.sup(f, 2)}${th}`;
        if (level === 1) {
          const A2 = r.pick([30, 150, 45, 135, 210, 225, 315, 330]), rad = r.chance(0.5), f = r.pick(["sin", "cos", "sin", "cos", "tan"]);
          const Ah = rad ? pih(new Frac(A2, 360)) : dg(A2 / 2);
          const c2 = cosD(A2), vs = valueStep("cos", A2, rad);
          const fa = rad ? `${M.sup(f, 2)}(${Ah})` : `${M.sup(f, 2)} ${Ah}`;
          const FORM = { sin: `${sq("sin")} = ${M.frac(`1 − cos 2${th}`, "2")}`, cos: `${sq("cos")} = ${M.frac(`1 + cos 2${th}`, "2")}`, tan: `${sq("tan")} = ${M.frac(`1 − cos 2${th}`, `1 + cos 2${th}`)}` };
          const steps = [`Use ${FORM[f]} with ${th} = ${Ah}, so 2${th} = ${ang(A2, rad)}.`, vs.text];
          const vals = { A: rad ? fv(new Frac(A2, 360)) : A2 / 2, A2: rad ? fv(dq(A2)) : A2, c2: rv(c2), ...vs.vals };
          let ans;
          if (f === "tan") {
            const N = Rad.of(1).sub(c2), D = Rad.of(1).add(c2);
            steps.push(`${fa} = ${M.frac(`1 − ${rh(c2, { paren: true })}`, `1 + ${rh(c2, { paren: true })}`)} = ${M.frac(rh(N), rh(D))}.`);
            const rz = rationalize(N, D);
            steps.push(...rz.steps);
            ans = rz.ans;
            Object.assign(vals, { N: rv(N), D: rv(D), ...rz.vals });
          } else {
            ans = (f === "sin" ? Rad.of(1).sub(c2) : Rad.of(1).add(c2)).mul(new Frac(1, 2));
            steps.push(`${fa} = ${M.frac(`1 ${f === "sin" ? "−" : "+"} ${rh(c2, { paren: true })}`, "2")}. Multiply the top and bottom by 2 to clear the inner fraction: ${rh(ans)}.`);
          }
          vals.ans = rv(ans);
          return {
            prompt: `Use a power-reduction formula to find the exact value of ${M.eq(fa)}`,
            steps, answer: { kind: "number", value: ans.value }, answerText: rh(ans), answerInput: rt(ans),
            vals, params: { A2, rad: rad ? 1 : 0, f: FN6.indexOf(f) },
          };
        }
        if (level === 2) {
          const h = r.int(1, 5), k = 2 * h, m = r.int(1, 5), f = r.pick(["sin", "cos"]);
          const arg = (c) => `${c === 1 ? "" : n(c)}${X}`;
          const cosT = (coef, c) => `${coef === 1 ? "" : n(coef)} cos ${arg(c)}`.trim();
          const opt = (a, sgn, b, c) => `${n(a)} ${sgn} ${cosT(b, c)}`;
          const right = f === "sin" ? "−" : "+", wrong = f === "sin" ? "+" : "−";
          const cand = [
            [0, opt(h, right, h, 2 * m)], [1, opt(h, wrong, h, 2 * m)], [2, opt(h, right, h, m)], [3, opt(k, right, k, 2 * m)],
          ];
          const order = r.shuffle([0, 1, 2, 3]);
          const options = order.map((i) => cand[i][1]);
          const lhs = `${n(k)} ${M.sup(f, 2)} ${m === 1 ? X : `(${arg(m)})`}`;
          return {
            prompt: `Which expression equals ${M.eq(lhs)} with no powers of trigonometric ratios?`,
            steps: [
              `Power reduction: ${M.sup(f, 2)}${th} = ${M.frac(`1 ${right} cos 2${th}`, "2")}. Here ${th} = ${arg(m)}, so 2${th} = ${arg(2 * m)}.`,
              `${lhs} = ${n(k)} · ${M.frac(`1 ${right} cos ${arg(2 * m)}`, "2")} = ${opt(h, right, h, 2 * m)}.`,
            ],
            answer: { kind: "choice", options, index: order.indexOf(0) }, answerText: options[order.indexOf(0)],
            vals: { h, m2: 2 * m }, params: { k, m, f: f === "sin" ? 0 : 1, order },
          };
        }
        // level 3: fourth powers and products, reduced twice
        const kind = r.int(0, 2), k = 8 * r.int(1, 3);
        const NAME = [`${M.sup("cos", 4)}${X}`, `${M.sup("sin", 4)}${X}`, `${M.sup("sin", 2)}${X} ${M.sup("cos", 2)}${X}`];
        const base = [[new Frac(3, 8), new Frac(1, 2), new Frac(1, 8)], [new Frac(3, 8), new Frac(-1, 2), new Frac(1, 8)], [new Frac(1, 8), new Frac(0), new Frac(-1, 8)]][kind];
        const [a, b, c] = base.map((v) => v.mul(k));
        const c2 = `cos 2${X}`, c4 = `cos 4${X}`, sq2 = `${M.sup("cos", 2)} 2${X}`;
        const steps = kind === 2
          ? [
            `sin ${X} cos ${X} = ${M.frac(`sin 2${X}`, "2")}, so ${NAME[2]} = ${M.frac(`${M.sup("sin", 2)} 2${X}`, "4")}.`,
            `Reduce again: ${M.sup("sin", 2)} 2${X} = ${M.frac(`1 − ${c4}`, "2")}, so ${NAME[2]} = ${M.frac(`1 − ${c4}`, "8")} = ${M.frac("1", "8")} − ${M.frac("1", "8")} ${c4}.`,
          ]
          : [
            `Square the reduction formula: ${NAME[kind]} = ${M.sup(`(${M.frac(`1 ${kind === 0 ? "+" : "−"} ${c2}`, "2")})`, 2)} = ${M.frac(`1 ${kind === 0 ? "+" : "−"} 2 ${c2} + ${sq2}`, "4")}.`,
            `Reduce the new square: ${sq2} = ${M.frac(`1 + ${c4}`, "2")}.`,
            `So ${NAME[kind]} = ${M.frac(`${M.frac("3", "2")} ${kind === 0 ? "+" : "−"} 2 ${c2} + ${M.frac("1", "2")} ${c4}`, "4")} = ${M.frac("3", "8")} ${kind === 0 ? "+" : "−"} ${M.frac("1", "2")} ${c2} + ${M.frac("1", "8")} ${c4}.`,
          ];
        steps.push(`Multiply by ${n(k)}: ${M.v("a")} = ${M.f(a)}, ${M.v("b")} = ${M.f(b)}, ${M.v("c")} = ${M.f(c)}.`);
        return {
          prompt: `Write ${M.eq(`${n(k)} ${NAME[kind]}`)} in the form ${M.v("a")} + ${M.v("b")} cos 2${X} + ${M.v("c")} cos 4${X}. Enter ${M.v("a")}, ${M.v("b")}, ${M.v("c")}.`,
          steps, answer: { kind: "numbers", values: [a.value, b.value, c.value], ordered: true },
          answerText: `${M.v("a")} = ${M.f(a)}, ${M.v("b")} = ${M.f(b)}, ${M.v("c")} = ${M.f(c)}`, answerInput: `${tf(a)}, ${tf(b)}, ${tf(c)}`,
          vals: { a: fv(a), b: fv(b), c: fv(c) }, params: { kind, k }, consts: [3, 4, 8],
        };
      },
    },

    // ---- T.11 Product-to-sum and sum-to-product ----------------------------------------------------------------
    "T.product-sum": {
      title: "Product-to-sum and sum-to-product",
      generate(r, level) {
        const SP = [30, 45, 60, 90, 120, 135, 150, 180];
        const special = (d) => d % 30 === 0 || d % 45 === 0;
        const half = M.frac("1", "2");
        if (level === 1) {
          let S, D, A, B;
          for (;;) {
            S = r.pick(SP); D = r.pick(SP);
            if (S <= D || (S + D) % 2) continue;
            A = (S + D) / 2; B = (S - D) / 2;
            if (special(A) && special(B)) continue;
            break;
          }
          const type = r.int(0, 2);
          const sS = sinD(S), sD = sinD(D), cS = cosD(S), cD = cosD(D);
          let lhs, form, inner, sum;
          if (type === 0) { lhs = `sin ${dg(A)} cos ${dg(B)}`; form = `sin A cos B = ${half}[sin(A + B) + sin(A − B)]`; inner = `sin ${dg(S)} + sin ${dg(D)}`; sum = sS.add(sD); }
          else if (type === 1) { lhs = `cos ${dg(A)} cos ${dg(B)}`; form = `cos A cos B = ${half}[cos(A − B) + cos(A + B)]`; inner = `cos ${dg(D)} + cos ${dg(S)}`; sum = cD.add(cS); }
          else { lhs = `sin ${dg(A)} sin ${dg(B)}`; form = `sin A sin B = ${half}[cos(A − B) − cos(A + B)]`; inner = `cos ${dg(D)} − cos ${dg(S)}`; sum = cD.sub(cS); }
          const vals1 = type === 0 ? [sS, sD] : type === 1 ? [cD, cS] : [cD, cS];
          const ans = sum.mul(new Frac(1, 2));
          return {
            prompt: `Use a product-to-sum formula to find the exact value of ${M.eq(lhs)}`,
            steps: [
              `${form}, with A = ${dg(A)} and B = ${dg(B)}: A + B = ${dg(S)} and A − B = ${dg(D)}.`,
              `${lhs} = ${half}[${inner}] = ${half}[${rh(vals1[0])} ${type === 2 ? "−" : "+"} ${rh(vals1[1], { paren: true })}] = ${half} · ${rh(sum, { paren: true })}.`,
              `= ${rh(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: rh(ans), answerInput: rt(ans),
            vals: { S, D, v1: rv(vals1[0]), v2: rv(vals1[1]), sum: rv(sum), ans: rv(ans) }, params: { A, B, type },
          };
        }
        if (level === 2) {
          let M1, M2, A, B;
          for (;;) {
            M1 = r.pick([45, 60, 90, 120, 135, 150]); M2 = r.pick([30, 45, 60]);
            A = M1 + M2; B = M1 - M2;
            if (B <= 0 || (special(A) && special(B))) continue;
            break;
          }
          const type = r.int(0, 3);
          const L = [`sin ${dg(A)} + sin ${dg(B)}`, `sin ${dg(A)} − sin ${dg(B)}`, `cos ${dg(A)} + cos ${dg(B)}`, `cos ${dg(A)} − cos ${dg(B)}`][type];
          const FORM = [
            `sin A + sin B = 2 sin ${M.frac("A + B", "2")} cos ${M.frac("A − B", "2")}`, `sin A − sin B = 2 cos ${M.frac("A + B", "2")} sin ${M.frac("A − B", "2")}`,
            `cos A + cos B = 2 cos ${M.frac("A + B", "2")} cos ${M.frac("A − B", "2")}`, `cos A − cos B = −2 sin ${M.frac("A + B", "2")} sin ${M.frac("A − B", "2")}`,
          ][type];
          const [f1, f2, sg] = [["sin", "cos", 1], ["cos", "sin", 1], ["cos", "cos", 1], ["sin", "sin", -1]][type];
          const v1 = trigD(f1, M1), v2 = trigD(f2, M2), prod = v1.mul(v2), ans = prod.mul(2 * sg);
          return {
            prompt: `Use a sum-to-product formula to find the exact value of ${M.eq(L)}`,
            steps: [
              `${FORM}. Here ${M.frac("A + B", "2")} = ${M.frac(dg(A + B), "2")} = ${dg(M1)} and ${M.frac("A − B", "2")} = ${M.frac(dg(A - B), "2")} = ${dg(M2)}.`,
              `${L} = ${sg < 0 ? "−" : ""}2 ${f1} ${dg(M1)} ${f2} ${dg(M2)} = ${sg < 0 ? "−" : ""}2 · ${rh(v1, { paren: true })} · ${rh(v2, { paren: true })}.`,
              `= ${rh(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: rh(ans), answerInput: rt(ans),
            vals: { M1, M2, sAB: A + B, dAB: A - B, v1: rv(v1), v2: rv(v2), ans: rv(ans) }, params: { A, B, type },
          };
        }
        // level 3: symbolic, pick the equivalent expression
        let p, q;
        do { p = r.int(2, 9); q = r.int(1, p - 1); } while ((p + q) % 2);
        const s = (p + q) / 2, d = (p - q) / 2, ax = (c) => `${c === 1 ? "" : n(c)}${X}`;
        const type = r.int(0, 4);
        const prod = (c, f1, a1, f2, a2) => `${c < 0 ? "−" : ""}${Math.abs(c) === 1 ? "" : `${n(Math.abs(c))} `}${f1} ${ax(a1)} ${f2} ${ax(a2)}`;
        const sumE = (f1, a1, sgn, f2, a2) => `${f1} ${ax(a1)} ${sgn} ${f2} ${ax(a2)}`;
        let lhs, cands, why;
        if (type === 0) { lhs = sumE("sin", p, "+", "sin", q); cands = [prod(2, "sin", s, "cos", d), prod(2, "cos", s, "sin", d), prod(2, "sin", p + q, "cos", p - q), prod(-2, "sin", s, "cos", d)]; why = `sin A + sin B = 2 sin ${M.frac("A + B", "2")} cos ${M.frac("A − B", "2")}`; }
        else if (type === 1) { lhs = sumE("sin", p, "−", "sin", q); cands = [prod(2, "cos", s, "sin", d), prod(2, "sin", s, "cos", d), prod(2, "cos", p + q, "sin", p - q), prod(-2, "cos", s, "sin", d)]; why = `sin A − sin B = 2 cos ${M.frac("A + B", "2")} sin ${M.frac("A − B", "2")}`; }
        else if (type === 2) { lhs = sumE("cos", p, "+", "cos", q); cands = [prod(2, "cos", s, "cos", d), prod(2, "sin", s, "sin", d), prod(2, "cos", p + q, "cos", p - q), prod(-2, "cos", s, "cos", d)]; why = `cos A + cos B = 2 cos ${M.frac("A + B", "2")} cos ${M.frac("A − B", "2")}`; }
        else if (type === 3) { lhs = sumE("cos", p, "−", "cos", q); cands = [prod(-2, "sin", s, "sin", d), prod(2, "sin", s, "sin", d), prod(-2, "cos", s, "cos", d), prod(-2, "sin", p + q, "sin", p - q)]; why = `cos A − cos B = −2 sin ${M.frac("A + B", "2")} sin ${M.frac("A − B", "2")}`; }
        else { lhs = prod(2, "sin", p, "cos", q); cands = [sumE("sin", p + q, "+", "sin", p - q), sumE("sin", p + q, "−", "sin", p - q), sumE("cos", p + q, "+", "cos", p - q), sumE("sin", s, "+", "sin", d)]; why = `2 sin A cos B = sin(A + B) + sin(A − B)`; }
        const order = r.shuffle([0, 1, 2, 3]), options = order.map((i) => cands[i]);
        const steps = type === 4
          ? [`${why}, with A = ${ax(p)} and B = ${ax(q)}.`, `A + B = ${ax(p + q)} and A − B = ${ax(p - q)}, so ${lhs} = ${cands[0]}.`]
          : [`${why}, with A = ${ax(p)} and B = ${ax(q)}.`, `${M.frac("A + B", "2")} = ${M.frac(ax(p + q), "2")} = ${ax(s)} and ${M.frac("A − B", "2")} = ${M.frac(ax(p - q), "2")} = ${ax(d)}, so ${lhs} = ${cands[0]}.`];
        return {
          prompt: `Which expression is identically equal to ${M.eq(lhs)}`,
          steps, answer: { kind: "choice", options, index: order.indexOf(0) }, answerText: options[order.indexOf(0)],
          vals: { s, d, pq: p + q, pmq: p - q }, params: { p, q, type, order },
        };
      },
    },

    // ---- T.12 Sinusoids ------------------------------------------------------------------------------------------
    "T.9": {
      title: "Graphs of sinusoids",
      generate(r, level) {
        const Y = M.v("y");
        /** The argument Bx with B a multiple of π (graph problems) or a plain number. */
        const bx = (B, withPi) => {
          B = Frac.of(B);
          const top = `${B.n === 1 ? "" : n(B.n)}${withPi ? "π" : ""}${X}`;
          return B.d === 1 ? top : M.frac(top, n(B.d));
        };
        const eqn = (A, f, B, D, withPi) => `${Y} = ${A === 1 ? "" : A === -1 ? "−" : `${n(A)} `}${f}(${bx(B, withPi)})${D === 0 ? "" : ` ${D < 0 ? "−" : "+"} ${n(Math.abs(D))}`}`;
        if (level === 1) {
          const A = r.nonzero(-5, 5), D = r.int(-4, 4), B = r.pick([new Frac(1), new Frac(2), new Frac(3), new Frac(4), new Frac(1, 2), new Frac(1, 3), new Frac(2, 3)]);
          const f = r.pick(["sin", "cos"]), ask = r.pick(["amplitude", "period", "midline", "maximum", "minimum"]);
          const amp = Math.abs(A), per = new Frac(2).div(B);
          const read = `In ${M.v("y")} = ${M.v("A")} ${f}(${M.v("B")}${X}) + ${M.v("D")}: ${M.v("A")} = ${n(A)}, ${M.v("B")} = ${M.f(B)}, ${M.v("D")} = ${n(D)}.`;
          let ans, ansText, ansIn, step;
          if (ask === "amplitude") { ans = amp; step = `The amplitude is |${M.v("A")}| = |${n(A)}| = ${n(amp)}.`; }
          else if (ask === "period") { ans = per.value * Math.PI; step = `The period is ${M.frac("2π", `|${M.v("B")}|`)} = ${M.frac("2π", M.f(B))} = ${pih(per)}.`; }
          else if (ask === "midline") { ans = D; step = `The midline is ${Y} = ${M.v("D")} = ${n(D)}.`; }
          else if (ask === "maximum") { ans = D + amp; step = `The maximum is ${M.v("D")} + |${M.v("A")}| = ${n(D)} + ${n(amp)} = ${n(D + amp)}.`; }
          else { ans = D - amp; step = `The minimum is ${M.v("D")} − |${M.v("A")}| = ${n(D)} − ${n(amp)} = ${n(D - amp)}.`; }
          if (ask === "period") { ansText = pih(per); ansIn = pit(per); } else { ansText = n(ans); ansIn = String(ans); }
          return {
            prompt: `For ${M.eq(eqn(A, f, B, D, false))} find the ${ask === "midline" ? `midline (the value ${M.v("D")} in ${Y} = ${M.v("D")})` : ask === "maximum" ? "maximum value" : ask === "minimum" ? "minimum value" : ask}.${ask === "period" ? " Give an exact answer in terms of π." : ""}`,
            steps: [read, step],
            answer: { kind: "number", value: ans }, answerText: ask === "midline" ? `${Y} = ${ansText}` : ansText, answerInput: ansIn,
            vals: { amp, per: fv(per), ans: ask === "period" ? fv(per) : ans }, params: { A, B: fv(B), D, f: f === "sin" ? 0 : 1, ask: ["amplitude", "period", "midline", "maximum", "minimum"].indexOf(ask) },
          };
        }
        if (level === 2) {
          const A = r.nonzero(-4, 4), Pd = r.pick([2, 4, 6, 8]), D = r.int(-2, 3), f = r.pick(["sin", "cos"]);
          const amp = Math.abs(A), mx = D + amp, mn = D - amp, B = new Frac(2, Pd);
          const e = `${A}*${f}(2*pi*x/${Pd}) + (${D})`;
          // x of the first two peaks and the trough between them
          const p0 = f === "cos" ? (A > 0 ? 0 : Pd / 2) : (A > 0 ? Pd / 4 : (3 * Pd) / 4);
          const peaks = [p0, p0 + Pd], trough = p0 + Pd / 2;
          const lab = (xv, yv) => `(${P.fmt(xv)}, ${P.fmt(yv)})`;
          const g = graph({ view: [-0.5, 2 * Pd + 0.5, mn - 1.5, mx + 1.5], items: [
            { t: "fn", e, role: "primary" },
            ...peaks.map((xv) => ({ t: "pt", x: xv, y: mx, label: lab(xv, mx) })), { t: "pt", x: trough, y: mn, label: lab(trough, mn) },
          ] });
          const start = f === "cos"
            ? `At ${X} = 0 the curve is at its ${A > 0 ? "maximum" : "minimum"}, so it is a ${A > 0 ? "cosine" : "negative cosine"}: ${M.v("A")} = ${n(A)}.`
            : `At ${X} = 0 the curve is on the midline and ${A > 0 ? "rising" : "falling"}, so it is a ${A > 0 ? "sine" : "negative sine"}: ${M.v("A")} = ${n(A)}.`;
          const steps = [
            `Read the marked points: the peaks are at ${Y} = ${n(mx)} and the trough at ${Y} = ${n(mn)}.`,
            `Amplitude = ${M.frac(`${n(mx)} − ${np(mn)}`, "2")} = ${n(amp)}; midline ${Y} = ${M.frac(`${n(mx)} + ${np(mn)}`, "2")} = ${n(D)}.`,
            `One full cycle runs from a peak to the next: ${n(p0 + Pd)} − ${n(p0)} = ${n(Pd)}, so the period is ${n(Pd)} and ${M.v("B")} = ${M.frac("2π", n(Pd))} = ${pih(B)}.`,
          ];
          if (r.chance(0.5)) {
            const other = f === "sin" ? "cos" : "sin";
            const cands = [eqn(A, f, B, D, true), eqn(A, other, B, D, true), eqn(A, f, B.mul(2), D, true), D !== A && D !== 0 ? eqn(D, f, B, A, true) : eqn(-A, f, B, D, true)];
            const order = r.shuffle([0, 1, 2, 3]), options = order.map((i) => cands[i]);
            steps.push(start, `The equation is ${cands[0]}.`);
            return {
              prompt: `Which equation matches the graph? The marked points are two neighboring peaks and the trough between them.`,
              graph: g, steps, answer: { kind: "choice", options, index: order.indexOf(0) }, answerText: options[order.indexOf(0)],
              vals: { mx, mn, amp, D, Pd, B: fv(B), B2: fv(B.mul(2)), p0, p1: p0 + Pd, tr: trough }, params: { A, Pd, D, f: f === "sin" ? 0 : 1, order },
            };
          }
          const ask = r.pick(["amplitude", "period", "midline"]);
          const ans = ask === "amplitude" ? amp : ask === "period" ? Pd : D;
          return {
            prompt: `The graph shows a sinusoid; the marked points are two neighboring peaks and the trough between them. What is its ${ask === "midline" ? `midline (the value ${M.v("D")} in ${Y} = ${M.v("D")})` : ask}?`,
            graph: g, steps: steps.slice(0, ask === "period" ? 3 : 2),
            answer: { kind: "number", value: ans }, answerText: ask === "midline" ? `${Y} = ${n(ans)}` : n(ans), answerInput: String(ans),
            vals: { mx, mn, amp, D, Pd, B: fv(B), p0, p1: p0 + Pd, tr: trough }, params: { A, Pd, D, f: f === "sin" ? 0 : 1, ask: ["amplitude", "period", "midline"].indexOf(ask) },
          };
        }
        // level 3: phase shift, or a Ferris wheel
        const kind = r.int(0, 2);
        if (kind === 0) {
          const Bv = r.int(2, 4), phi = r.pick([new Frac(1, 2), new Frac(1, 3), new Frac(1, 4), new Frac(1, 6), new Frac(2, 3), new Frac(3, 4), new Frac(1)]).mul(r.sign());
          const A = r.int(1, 4), D = r.int(-3, 3), f = r.pick(["sin", "cos"]);
          const C = phi.div(Bv);
          const argTxt = `${n(Bv)}${X} ${phi.n > 0 ? "−" : "+"} ${pih(phi.abs())}`;
          const Ytxt = `${Y} = ${A === 1 ? "" : `${n(A)} `}${f}(${argTxt})${D === 0 ? "" : ` ${D < 0 ? "−" : "+"} ${n(Math.abs(D))}`}`;
          return {
            prompt: `Find the phase shift of ${M.eq(Ytxt)} Give a signed answer (positive for a shift to the right) in terms of π.`,
            steps: [
              `Factor ${M.v("B")} = ${n(Bv)} out of the argument: ${argTxt} = ${n(Bv)}(${X} ${C.n > 0 ? "−" : "+"} ${pih(C.abs())}).`,
              `The form is ${M.v("A")} ${f}(${M.v("B")}(${X} − ${M.v("C")})) + ${M.v("D")}, so ${M.v("C")} = ${M.frac(pih(phi), n(Bv)) === pih(C) ? "" : `${M.frac(pih(phi), n(Bv))} = `}${pih(C)}: the graph shifts ${pih(C.abs())} to the ${C.n > 0 ? "right" : "left"}.`,
            ],
            answer: { kind: "number", value: C.value * Math.PI }, answerText: pih(C), answerInput: pit(C),
            vals: { C: fv(C) }, params: { A, Bv, phi: fv(phi), D, f: f === "sin" ? 0 : 1, kind },
          };
        }
        const Am = r.pick([10, 15, 20, 25, 30]), c0 = r.int(1, 3), Dm = Am + c0, Pm = r.pick([6, 12, 30]);
        const intro = `A Ferris wheel has diameter ${n(2 * Am)} m, and its lowest point is ${n(c0)} m above the ground. It turns once every ${n(Pm)} minutes, and a rider boards at the lowest point at ${M.v("t")} = 0.`;
        const model = `The center is ${n(Am)} + ${n(c0)} = ${n(Dm)} m high (the midline) and the radius ${n(Am)} m is the amplitude. Starting at the bottom means a negative cosine: ${M.v("h")}(${M.v("t")}) = ${n(Dm)} − ${n(Am)} cos(${M.frac(`2π${M.v("t")}`, n(Pm))}).`;
        if (kind === 1) {
          const j = r.pick([1, 2, 3, 4, 5, 7, 8, 10, 11]), t = (Pm * j) / 12, angD = 30 * j, cv = cosD(angD);
          const H = Rad.of(Dm).sub(cv.mul(Am)), vs = valueStep("cos", angD, true);
          return {
            prompt: `${intro} How high is the rider ${n(t)} minutes later, in meters? Give the exact value or round to 2 decimal places.`,
            steps: [
              model,
              `At ${M.v("t")} = ${n(t)}: ${M.frac(`2π · ${n(t)}`, n(Pm))} = ${pih(dq(angD))}.`,
              vs.text,
              `${M.v("h")} = ${n(Dm)} − ${n(Am)} · ${rh(cv, { paren: true })} = ${ru(H)} m${approx(H, 2, " m")}.`,
            ],
            answer: { kind: "number", value: H.value, dp: 2 }, answerText: `${ru(H)} m${approx(H, 2, " m")}`, answerInput: rt(H),
            vals: { Dm, d2: 2 * Am, t, q: fv(dq(angD)), cv: rv(cv), H: rv(H), Hn: H.value, ...vs.vals }, params: { Am, c0, Pm, j, kind },
          };
        }
        let kq;
        do kq = r.pick([new Frac(-1, 2), new Frac(0), new Frac(1, 2), new Frac(1)]); while (kq.d === 2 && Am % 2);
        const H = kq.mul(Am).add(Dm), cval = kq.neg(), angQ = new Frac([60, 90, 120, 180][[new Frac(-1, 2), new Frac(0), new Frac(1, 2), new Frac(1)].findIndex((v) => v.eq(kq))], 180);
        const t = angQ.mul(Pm).div(2);
        return {
          prompt: `${intro} How many minutes after boarding does the rider first reach a height of ${n(H.value)} m?`,
          steps: [
            model,
            `Set ${n(Dm)} − ${n(Am)} cos(${M.frac(`2π${M.v("t")}`, n(Pm))}) = ${n(H.value)}: cos(${M.frac(`2π${M.v("t")}`, n(Pm))}) = ${M.frac(`${n(Dm)} − ${n(H.value)}`, n(Am))} = ${M.f(cval)}.`,
            `The first time is the smallest angle with that cosine, which lies in [0, π]: ${M.frac(`2π${M.v("t")}`, n(Pm))} = arccos(${M.f(cval)}) = ${pih(angQ)}.`,
            `${M.v("t")} = ${pih(angQ)} · ${M.frac(n(Pm), "2π")} = ${n(t.value)} minutes.`,
          ],
          answer: { kind: "number", value: t.value }, answerText: `${n(t.value)} min`, answerInput: String(t.value),
          vals: { Dm, d2: 2 * Am, H: H.value, cval: fv(cval), angQ: fv(angQ), t: t.value }, params: { Am, c0, Pm, kq: fv(kq), kind },
        };
      },
    },

    // ---- T.13 Harmonic addition -------------------------------------------------------------------------------
    "T.harmonic": {
      title: "Harmonic addition",
      generate(r, level) {
        /** c·rest with c an exact value, as the first or a later term of a sum. */
        const term = (c, rest, first) => {
          c = R(c);
          const neg = c.value < 0, mag = neg ? c.neg() : c;
          const body = mag.eq(1) ? rest : `${rh(mag)} ${rest}`;
          return first ? `${neg ? "−" : ""}${body}` : ` ${neg ? "−" : "+"} ${body}`;
        };
        const lin = (a, b, v = X) => `${term(a, `sin ${v}`, true)}${term(b, `cos ${v}`, false)}`;
        if (level === 1) {
          const [p0, q0, h] = r.pick(TRIPLES), swap = r.chance(0.5), word = r.chance(0.4);
          const a = (swap ? q0 : p0) * (word ? 1 : r.sign()), b = (swap ? p0 : q0) * (word ? 1 : r.sign());
          const ask = word ? "amplitude" : r.pick(["maximum", "minimum"]), aa = a * a, bb = b * b, ss = aa + bb;
          const ans = ask === "minimum" ? -h : h, t = M.v("t");
          return {
            prompt: word
              ? `Two sound waves of the same frequency, ${n(a)} sin ${t} and ${n(b)} cos ${t} (pressure in millipascals), combine into one wave. What is the amplitude of the combined wave, in millipascals?`
              : `What is the ${ask} value of ${M.eq(`${M.v("f")}(${X}) = ${lin(a, b)}`)}`,
            steps: [
              `A sine and a cosine of the same frequency add to one sinusoid: ${M.v("a")} sin ${word ? t : X} + ${M.v("b")} cos ${word ? t : X} = ${M.v("R")} sin(${word ? t : X} + φ) with ${M.v("R")} = ${M.sqrt(`${M.sup(M.v("a"), 2)} + ${M.sup(M.v("b"), 2)}`)}.`,
              `${M.v("R")} = ${M.sqrt(`${M.sup(np(a), 2)} + ${M.sup(np(b), 2)}`)} = ${M.sqrt(`${n(aa)} + ${n(bb)}`)} = ${M.sqrt(n(ss))} = ${n(h)}.`,
              word ? `The amplitude of the combined wave is ${M.v("R")} = ${n(h)} millipascals.` : `sin(${X} + φ) runs between −1 and 1, so the ${ask} is ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: word ? `${n(h)} mPa` : n(ans), answerInput: String(ans),
            vals: { aa, bb, ss, h }, params: { a, b, ask: ["amplitude", "maximum", "minimum"].indexOf(ask) },
          };
        }
        // R sin(x + φ) with a special φ
        const phi = r.pick([30, 45, 60, 120, 135, 150]) * r.sign(), k = r.int(1, 4);
        const Rr = phi % 45 === 0 ? Rad.of(k, 2) : Rad.of(2 * k);
        const a = Rr.mul(cosD(phi)), b = Rr.mul(sinD(phi)), aa = a.mul(a), bb = b.mul(b), ss = aa.add(bb);
        const cph = a.div(Rr), sph = b.div(Rr), qd = quad(phi), ref = refD(phi), phq = dq(phi);
        const RSteps = [
          `${M.v("R")} = ${M.sqrt(`${sq2(a)} + ${sq2(b)}`)} = ${M.sqrt(`${rh(aa)} + ${rh(bb)}`)} = ${rootEq(ss, Rr)}.`,
          `cos φ = ${M.frac(M.v("a"), M.v("R"))} = ${rh(cph)} and sin φ = ${M.frac(M.v("b"), M.v("R"))} = ${rh(sph)}. Cosine is ${cph.value > 0 ? "positive" : "negative"} and sine ${sph.value > 0 ? "positive" : "negative"}, so φ is in quadrant ${ROMAN[qd]} with reference angle ${pih(dq(ref))}; in (−π, π] that is φ = ${pih(phq)}.`,
        ];
        const baseVals = { aa: rv(aa), bb: rv(bb), ss: rv(ss), R: rv(Rr), cph: rv(cph), sph: rv(sph), ref: fv(dq(ref)), phi: fv(phq) };
        if (level === 2) {
          return {
            prompt: `Write ${M.eq(`${lin(a, b)}`)} in the form ${M.v("R")} sin(${X} + φ) with ${M.v("R")} &gt; 0 and −π &lt; φ ≤ π. Enter ${M.v("R")}, φ.`,
            steps: [...RSteps, `So ${lin(a, b)} = ${rh(Rr)} sin(${X} ${phq.n < 0 ? "−" : "+"} ${pih(phq.abs())}).`],
            answer: { kind: "numbers", values: [Rr.value, phq.value * Math.PI], ordered: true },
            answerText: `${M.v("R")} = ${rh(Rr)}, φ = ${pih(phq)}`, answerInput: `${rt(Rr)}, ${pit(phq)}`,
            vals: baseVals, params: { a: rv(a), b: rv(b) },
          };
        }
        // level 3: solve a sin x + b cos x = c on [0, 2π)
        const S = phi % 45 === 0 ? r.pick([Rad.of(new Frac(1, 2), 2), Rad.of(new Frac(-1, 2), 2), Rad.of(0), Rad.of(1), Rad.of(-1)])
          : r.pick([Rad.of(new Frac(1, 2)), Rad.of(new Frac(-1, 2)), Rad.of(0), Rad.of(1), Rad.of(-1), Rad.of(new Frac(1, 2), 3), Rad.of(new Frac(-1, 2), 3)]);
        const c = Rr.mul(S);
        const us = SPECIAL.filter((d) => sinD(d).eq(S));
        const xs = us.map((u) => mod(u - phi, 360)).sort((p, q) => p - q);
        const phTxt = phq.n < 0 ? `+ ${pih(phq.abs())}` : `− ${pih(phq)}`;
        return {
          prompt: `Solve ${M.eq(`${lin(a, b)} = ${rh(c)}`)} for 0 ≤ ${X} &lt; 2π.`,
          steps: [
            ...RSteps,
            `So the equation is ${rh(Rr)} sin(${X} ${phq.n < 0 ? "−" : "+"} ${pih(phq.abs())}) = ${rh(c)}, that is sin(${X} ${phq.n < 0 ? "−" : "+"} ${pih(phq.abs())}) = ${rh(S)}.`,
            `Let ${M.v("u")} = ${X} ${phq.n < 0 ? "−" : "+"} ${pih(phq.abs())}. In one turn, sin ${M.v("u")} = ${rh(S)} at ${M.v("u")} = ${us.map((u) => pih(dq(u))).join(" and ")}.`,
            `${X} = ${M.v("u")} ${phTxt}, adding 2π where needed to land in [0, 2π): ${X} = ${xs.map((d) => pih(dq(d))).join(", ")}.`,
          ],
          answer: { kind: "numbers", values: xs.map((d) => dq(d).value * Math.PI) }, answerText: xs.map((d) => pih(dq(d))).join(", "), answerInput: xs.map((d) => pit(dq(d))).join(", "),
          vals: { ...baseVals, S: rv(S), us: us.map((u) => fv(dq(u))), xs: xs.map((d) => fv(dq(d))) }, params: { a: rv(a), b: rv(b), c: rv(c) },
        };
      },
    },

    // ---- T.14 Inverse trigonometric functions ---------------------------------------------------------------------
    "T.10": {
      title: "Inverse trigonometric functions",
      generate(r, level) {
        const RANGE = { asin: [-90, 90], acos: [0, 180], atan: [-89, 89] };
        const RTXT = { asin: `[−${M.frac("π", "2")}, ${M.frac("π", "2")}]`, acos: "[0, π]", atan: `(−${M.frac("π", "2")}, ${M.frac("π", "2")})` };
        const NAME = { asin: "arcsin", acos: "arccos", atan: "arctan" }, BASE = { asin: "sin", acos: "cos", atan: "tan" };
        const CANDS = [-90, -60, -45, -30, 0, 30, 45, 60, 90, 120, 135, 150, 180];
        const principal = (g, v) => CANDS.find((d) => d >= RANGE[g][0] && d <= RANGE[g][1] && trigD(BASE[g], d) && trigD(BASE[g], d).eq(v));
        if (level === 1) {
          const g = r.pick(["asin", "acos", "atan"]);
          const d = r.pick(CANDS.filter((x) => x >= RANGE[g][0] && x <= RANGE[g][1]));
          const v = trigD(BASE[g], d), f = BASE[g];
          return {
            prompt: `Find the exact value of ${NAME[g]}(${rh(v)}) in radians.`,
            steps: [
              `${NAME[g]} ${M.v("v")} is the one angle in ${RTXT[g]} whose ${f} is ${M.v("v")}.`,
              `${f}(${pih(dq(d))}) = ${rh(v)}, and ${pih(dq(d))} lies in ${RTXT[g]}, so ${NAME[g]}(${rh(v)}) = ${pih(dq(d))}.`,
            ],
            answer: { kind: "number", value: dq(d).value * Math.PI }, answerText: pih(dq(d)), answerInput: pit(dq(d)),
            vals: { q: fv(dq(d)) }, params: { g: ["asin", "acos", "atan"].indexOf(g), v: rv(v) },
          };
        }
        if (level === 2) {
          const g = r.pick(["asin", "acos", "atan"]), [p0, q0, h] = r.pick(TRIPLES), swap = r.chance(0.5), sg = r.sign();
          const p = swap ? q0 : p0, q = swap ? p0 : q0;
          let x, y, v;
          if (g === "asin") { y = sg * p; x = q; v = new Frac(y, h); }
          else if (g === "acos") { x = sg * p; y = q; v = new Frac(x, h); }
          else { y = sg * p; x = q; v = new Frac(y, x); }
          const f = r.pick(["sin", "cos", "tan"].filter((t) => t !== BASE[g]));
          const qd = x > 0 && y > 0 ? 1 : x < 0 ? 2 : 4;
          const val = { sin: new Frac(y, h), cos: new Frac(x, h), tan: new Frac(y, x) }[f];
          const known = g === "atan" ? `opposite ${n(p)} and adjacent ${n(q)}` : g === "asin" ? `opposite ${n(p)} and hypotenuse ${n(h)}` : `adjacent ${n(p)} and hypotenuse ${n(h)}`;
          const third = g === "atan" ? `hypotenuse ${M.sqrt(`${M.sup(n(p), 2)} + ${M.sup(n(q), 2)}`)} = ${n(h)}` : `${g === "asin" ? "adjacent" : "opposite"} side ${M.sqrt(`${M.sup(n(h), 2)} − ${M.sup(n(p), 2)}`)} = ${n(q)}`;
          const RAT = { sin: ["y", "r"], cos: ["x", "r"], tan: ["y", "x"] }[f], side = { x, y, r: h };
          return {
            prompt: `Find the exact value of ${M.eq(`${f}(${NAME[g]}(${M.f(v)}))`)}`,
            steps: [
              `Let ${th} = ${NAME[g]}(${M.f(v)}), so ${BASE[g]} ${th} = ${M.f(v)} with ${th} in ${RTXT[g]}. ${sg > 0 ? `The value is positive, so ${th} is in quadrant I.` : `The value is negative, so ${th} is in quadrant ${ROMAN[qd]}.`}`,
              `Draw the reference triangle with ${known}; the ${third}.`,
              `In quadrant ${ROMAN[qd]} the point on the terminal side is (${M.v("x")}, ${M.v("y")}) = (${n(x)}, ${n(y)}) with ${M.v("r")} = ${n(h)}.`,
              `${f} ${th} = ${M.frac(M.v(RAT[0]), M.v(RAT[1]))} = ${rawF(side[RAT[0]], side[RAT[1]])}${val.n === side[RAT[0]] && val.d === side[RAT[1]] ? "" : ` = ${M.f(val)}`}.`,
            ],
            answer: { kind: "number", value: val.value }, answerText: M.f(val), answerInput: tf(val),
            vals: { x, y, h, p, q, ans: fv(val) }, params: { g: ["asin", "acos", "atan"].indexOf(g), v: fv(v), f: FN6.indexOf(f) },
          };
        }
        if (r.chance(0.55)) {
          let g, d, v, ans;
          for (;;) {
            g = r.pick(["asin", "acos", "atan"]);
            d = r.pick([...NONAXIS, ...NONAXIS.map((x) => x - 360)]);
            if (d >= RANGE[g][0] && d <= RANGE[g][1]) continue;
            v = trigD(BASE[g], d);
            ans = principal(g, v);
            break;
          }
          const f = BASE[g];
          return {
            prompt: `Find the exact value of ${M.eq(`${NAME[g]}(${f}(${pih(dq(d))}))`)}`,
            steps: [
              `Evaluate the inside first: ${f}(${pih(dq(d))}) = ${rh(v)}.`,
              `${NAME[g]} returns an angle in ${RTXT[g]}, and ${pih(dq(d))} is not in that range. The angle there with ${f} equal to ${rh(v)} is ${pih(dq(ans))}.`,
              `So ${NAME[g]}(${f}(${pih(dq(d))})) = ${pih(dq(ans))}, not ${pih(dq(d))}.`,
            ],
            answer: { kind: "number", value: dq(ans).value * Math.PI }, answerText: pih(dq(ans)), answerInput: pit(dq(ans)),
            vals: { v: rv(v), ans: fv(dq(ans)) }, params: { g: ["asin", "acos", "atan"].indexOf(g), d: fv(dq(d)) },
          };
        }
        // word problem with a measured ratio
        if (r.chance(0.5)) {
          const h = r.int(6, 20) * 5 / 100, L = r.int(4, 12), ratio = h / L, A = Math.atan(ratio) * 180 / Math.PI;
          return {
            prompt: `A wheelchair ramp rises ${n(h)} m over a horizontal distance of ${n(L)} m. What angle does the ramp make with the ground, in degrees? Round to 1 decimal place.`,
            steps: [
              `The rise is opposite the angle and the horizontal run is adjacent, so tan ${th} = ${M.frac(n(h), n(L))} ≈ ${fx(ratio, 4)}.`,
              `${th} = arctan(${M.frac(n(h), n(L))}) ≈ ${fx(A, 1)}° (calculator in degree mode).`,
            ],
            answer: { kind: "number", value: A, dp: 1 }, answerText: `${fx(A, 1)}°`, answerInput: fixed(A, 1), deg: true,
            vals: { ratio, A }, params: { h, L, kind: 0 },
          };
        }
        const L = r.int(4, 8), H = Math.round((L * r.int(70, 95)) / 10) / 10, ratio = H / L, A = Math.asin(ratio) * 180 / Math.PI;
        return {
          prompt: `A ${n(L)} m ladder leans against a wall, and its top reaches ${n(H)} m up the wall. What angle does the ladder make with the ground, in degrees? Round to 1 decimal place.`,
          steps: [
            `The ladder is the hypotenuse and the height is opposite the angle at the ground, so sin ${th} = ${M.frac(n(H), n(L))} ≈ ${fx(ratio, 4)}.`,
            `${th} = arcsin(${M.frac(n(H), n(L))}) ≈ ${fx(A, 1)}° (calculator in degree mode).`,
          ],
          answer: { kind: "number", value: A, dp: 1 }, answerText: `${fx(A, 1)}°`, answerInput: fixed(A, 1), deg: true,
          vals: { ratio, A }, params: { h: H, L, kind: 1 },
        };
      },
    },

    // ---- T.15 Solving trigonometric equations -----------------------------------------------------------------------
    "T.solve-equations": {
      title: "Solving trigonometric equations",
      generate(r, level) {
        const QPOS = { sin: [1, 2], cos: [1, 4], tan: [1, 3] }, QNEG = { sin: [3, 4], cos: [2, 3], tan: [2, 4] };
        const sols = (f, v) => SPECIAL.filter((d) => { const t = trigD(f, d); return t && t.eq(v); });
        /** Why f(u) = v at these angles in one turn. */
        const why = (f, v, rad, u = X) => {
          const s = sols(f, v), list = s.map((d) => ang(d, rad)).join(" and ");
          if (s.every((d) => d % 90 === 0) || v.isZero()) return { text: `On the unit circle, ${f} ${u} = ${rh(v)} at ${u} = ${list}.`, s, vals: {} };
          const ref = refD(s[0]), qs = (v.value > 0 ? QPOS : QNEG)[f];
          return {
            text: `The reference angle is ${ang(ref, rad)}, since ${app(f, ang(ref, rad), rad)} = ${rh(trigD(f, ref))}. ${f} is ${v.value > 0 ? "positive" : "negative"} in quadrants ${ROMAN[qs[0]]} and ${ROMAN[qs[1]]}, so ${u} = ${list}.`,
            s, vals: { ref: rad ? fv(dq(ref)) : ref, vref: rv(trigD(f, ref)) },
          };
        };
        const pickVal = (f) => { let d, v; do { d = r.pick(SPECIAL); v = trigD(f, d); } while (!v); return v; };
        if (level === 1) {
          const f = r.pick(["sin", "cos", "tan"]), v = pickVal(f), rad = r.chance(0.6);
          const w = why(f, v, rad);
          return {
            prompt: `Solve ${M.eq(`${f} ${X} = ${rh(v)}`)} for ${rad ? `0 ≤ ${X} &lt; 2π` : `0° ≤ ${X} &lt; 360°`}.`,
            steps: [w.text],
            answer: { kind: "numbers", values: w.s.map((d) => angVal(d, rad)) }, answerText: w.s.map((d) => ang(d, rad)).join(", "),
            answerInput: w.s.map((d) => angText(d, rad)).join(", "), deg: !rad,
            vals: { xs: w.s.map((d) => (rad ? fv(dq(d)) : d)), ...w.vals }, params: { f: FN6.indexOf(f), v: rv(v), rad: rad ? 1 : 0 }, consts: [360],
          };
        }
        if (level === 2) {
          const f = r.pick(["sin", "cos", "tan"]), v = pickVal(f), m = r.pick([2, 3]);
          const { L } = radParts(v), top = v.mul(L);
          const mx = `${n(m)}${X}`, u = M.v("u");
          const lhs = `${L === 1 ? "" : n(L)}${L === 1 ? "" : " "}${f} ${mx}`;
          const eqH = top.isZero() ? `${f} ${mx} = 0` : `${lhs} ${top.value > 0 ? "−" : "+"} ${rh(top.value > 0 ? top : top.neg())} = 0`;
          const w = why(f, v, true, u);
          const us = [];
          for (let j = 0; j < m; j++) for (const d of w.s) us.push(d + 360 * j);
          us.sort((p, q) => p - q);
          const xs = us.map((d) => new Frac(d, 180 * m));
          return {
            prompt: `Solve ${M.eq(eqH)} for 0 ≤ ${X} &lt; 2π.`,
            steps: [
              `Isolate the ratio: ${f} ${mx} = ${rh(v)}.`,
              `Let ${u} = ${mx}. As ${X} runs over [0, 2π), ${u} runs over [0, ${n(2 * m)}π), which is ${n(m)} full turns.`,
              `${w.text}`,
              `Add 2π to get the solutions in the other turn${m > 2 ? "s" : ""}: ${u} = ${us.map((d) => pih(dq(d))).join(", ")}.`,
              `Divide by ${n(m)}: ${X} = ${xs.map(pih).join(", ")}.`,
            ],
            answer: { kind: "numbers", values: xs.map((q) => q.value * Math.PI) }, answerText: xs.map(pih).join(", "), answerInput: xs.map(pit).join(", "),
            vals: { L, top: rv(top), v: rv(v), m2: 2 * m, us: us.map((d) => fv(dq(d))), xs: xs.map(fv), ...w.vals }, params: { f: FN6.indexOf(f), v: rv(v), m },
          };
        }
        // level 3: quadratic in sin x or cos x
        const ROOTS = [new Frac(-1), new Frac(-1, 2), new Frac(0), new Frac(1, 2), new Frac(1), new Frac(2), new Frac(-2), new Frac(3, 2)];
        let r1, r2;
        do { [r1, r2] = r.sample(ROOTS, 2); } while (Math.abs(r1.value) > 1 && Math.abs(r2.value) > 1);
        const f = r.pick(["sin", "cos"]), u = M.v("u");
        const A = r1.d * r2.d, Bc = -(r1.d * r2.n + r2.d * r1.n), Cc = r1.n * r2.n;
        const fx2 = `${M.sup(f, 2)} ${X}`, fx1 = `${f} ${X}`;
        const eqH = `${M.term(A, fx2, { first: true })}${M.term(Bc, fx1)}${M.term(Cc, "")} = 0`;
        const fac = (q) => (q.n === 0 ? u : `(${M.poly([q.d, -q.n], "u")})`);
        const all = [], parts = [];
        for (const q of [r1, r2]) {
          if (Math.abs(q.value) > 1) { parts.push(`${fx1} = ${M.f(q)} has no solution, since ${f} never exceeds 1 in size.`); continue; }
          const v = Rad.of(q), w = why(f, v, true);
          all.push(...w.s);
          parts.push(`${fx1} = ${M.f(q)}: ${w.text}`);
        }
        all.sort((p, q) => p - q);
        return {
          prompt: `Solve ${M.eq(eqH)} for 0 ≤ ${X} &lt; 2π.`,
          steps: [
            `Let ${u} = ${fx1}: ${M.poly([A, Bc, Cc], "u")} = 0.`,
            `Factor: ${fac(r1)}${fac(r2)} = 0, so ${u} = ${M.f(r1)} or ${u} = ${M.f(r2)}.`,
            ...parts,
            `All solutions: ${X} = ${all.map((d) => pih(dq(d))).join(", ")}.`,
          ],
          answer: { kind: "numbers", values: all.map((d) => dq(d).value * Math.PI) }, answerText: all.map((d) => pih(dq(d))).join(", "), answerInput: all.map((d) => pit(dq(d))).join(", "),
          vals: { r1: fv(r1), r2: fv(r2), xs: all.map((d) => fv(dq(d))) }, params: { f: FN6.indexOf(f), A, B: Bc, C: Cc },
        };
      },
    },

    // ---- T.16 Law of sines and triangle area ---------------------------------------------------------------------------
    "T.7": {
      title: "Law of sines and the SAS area",
      generate(r, level) {
        if (level === 1) {
          const a = r.int(3, 15), b = r.int(3, 15), C = r.pick([30, 45, 60, 90, 120, 135, 150]), sC = sinD(C);
          const K = Rad.of(new Frac(a * b, 2)).mul(sC), word = r.chance(0.5);
          const pts = [[0, 0], [a, 0], [b * Math.cos(C * Math.PI / 180), b * Math.sin(C * Math.PI / 180)]];
          return {
            prompt: word
              ? `A triangular garden bed has two sides of ${n(a)} m and ${n(b)} m that meet at an angle of ${dg(C)}. What is its area, in square meters? Give the exact value or round to 2 decimal places.`
              : `In triangle ${M.v("ABC")}, ${M.v("a")} = ${n(a)}, ${M.v("b")} = ${n(b)} and ${M.v("C")} = ${dg(C)}. Find the area. Give the exact value or round to 2 decimal places.`,
            graph: triFig(pts, { sides: [{ i: 0, j: 1, label: n(a) }, { i: 0, j: 2, label: n(b) }], angles: [{ i: 0, s: dg(C) }], right: C === 90 ? 0 : -1 }),
            steps: [
              `The angle ${dg(C)} is between the two known sides, so use ${M.v("K")} = ${M.frac("1", "2")}${M.v("ab")} sin ${M.v("C")}.`,
              `${M.v("K")} = ${M.frac("1", "2")} · ${n(a)} · ${n(b)} · sin ${dg(C)} = ${M.f(new Frac(a * b, 2))} · ${rh(sC, { paren: true })} = ${rh(K)}${word ? " m²" : ""}${approx(K, 2, word ? " m²" : "")}.`,
            ],
            answer: { kind: "number", value: K.value, dp: 2 }, answerText: `${word ? ru(K) : rh(K)}${word ? " m²" : ""}${approx(K, 2, word ? " m²" : "")}`, answerInput: rt(K),
            vals: { ab2: fv(new Frac(a * b, 2)), sC: rv(sC), K: rv(K), Kn: K.value }, params: { a, b, C },
          };
        }
        if (level === 2) {
          let A, B;
          do { A = r.pick([30, 45, 60, 120, 135]); B = r.pick([30, 45, 60, 120, 135]); } while (A === B || A + B >= 180);
          const a = r.int(2, 12), sA = sinD(A), sB = sinD(B), aSB = Rad.of(a).mul(sB), b = aSB.div(sA), C = 180 - A - B;
          const c = a * Math.sin(C * Math.PI / 180) / sA.value;
          return {
            prompt: `In triangle ${M.v("ABC")}, ${M.v("A")} = ${dg(A)}, ${M.v("B")} = ${dg(B)} and ${M.v("a")} = ${n(a)}. Find ${M.v("b")}. Give the exact value or round to 2 decimal places.`,
            graph: triFig([[0, 0], [c, 0], [b.value * Math.cos(A * Math.PI / 180), b.value * Math.sin(A * Math.PI / 180)]], {
              sides: [{ i: 1, j: 2, label: `a = ${n(a)}` }, { i: 0, j: 2, label: "b = ?" }], angles: [{ i: 0, s: dg(A) }, { i: 1, s: dg(B) }], verts: ["A", "B", "C"],
            }),
            steps: [
              `Side ${M.v("a")} is opposite ${M.v("A")} and side ${M.v("b")} is opposite ${M.v("B")}, so the law of sines gives ${M.frac(M.v("b"), `sin ${M.v("B")}`)} = ${M.frac(M.v("a"), `sin ${M.v("A")}`)}.`,
              `${M.v("b")} = ${M.frac(`${M.v("a")} sin ${M.v("B")}`, `sin ${M.v("A")}`)} = (${n(a)} · ${rh(sB)}) ÷ ${rh(sA, { paren: true })} = ${rh(aSB)} ÷ ${rh(sA, { paren: true })}.`,
              `Simplify: ${M.v("b")} = ${rh(b)}${approx(b, 2)}.`,
            ],
            answer: { kind: "number", value: b.value, dp: 2 }, answerText: `${rh(b)}${approx(b, 2)}`, answerInput: rt(b),
            vals: { sA: rv(sA), sB: rv(sB), aSB: rv(aSB), b: rv(b), bn: b.value }, params: { A, B, a },
          };
        }
        if (r.chance(0.5)) {
          // the ambiguous case
          const obtuse = r.chance(0.25), A = obtuse ? 150 : 30, b = 2 * r.int(3, 10), h = b / 2;
          let a, count, why;
          if (obtuse) {
            if (r.chance(0.5)) { a = r.int(b + 1, b + 8); count = 1; why = `${M.v("A")} is obtuse, so the side opposite it must be the longest: ${M.v("a")} = ${n(a)} &gt; ${M.v("b")} = ${n(b)}, and exactly one triangle exists.`; }
            else { a = r.int(Math.max(2, h), b); count = 0; why = `${M.v("A")} is obtuse, so the side opposite it must be the longest; but ${M.v("a")} = ${n(a)} ≤ ${M.v("b")} = ${n(b)}, so no triangle exists.`; }
          } else {
            const c = r.int(0, 3);
            if (c === 0) { a = r.int(2, h - 1); count = 0; why = `${M.v("a")} = ${n(a)} &lt; ${M.v("h")} = ${n(h)}: side ${M.v("a")} is too short to reach the base, so no triangle exists.`; }
            else if (c === 1) { a = h; count = 1; why = `${M.v("a")} = ${M.v("h")} = ${n(h)}: side ${M.v("a")} just touches the base, making one right triangle.`; }
            else if (c === 2) { a = r.int(h + 1, b - 1); count = 2; why = `${M.v("h")} = ${n(h)} &lt; ${M.v("a")} = ${n(a)} &lt; ${M.v("b")} = ${n(b)}: side ${M.v("a")} can swing to two positions, so two triangles exist.`; }
            else { a = r.int(b, b + 6); count = 1; why = `${M.v("a")} = ${n(a)} ≥ ${M.v("b")} = ${n(b)}: side ${M.v("a")} reaches the base on one side only, so exactly one triangle exists.`; }
          }
          return {
            prompt: `In triangle ${M.v("ABC")}, ${M.v("A")} = ${dg(A)}, ${M.v("b")} = ${n(b)} and ${M.v("a")} = ${n(a)}. How many different triangles have these measurements?`,
            steps: [
              obtuse ? `Two sides and a non-included angle (SSA) can give zero, one or two triangles. Here the given angle is obtuse.`
                : `Two sides and a non-included angle (SSA) can give zero, one or two triangles. Compare ${M.v("a")} with the height ${M.v("h")} = ${M.v("b")} sin ${M.v("A")} = ${n(b)} · ${M.frac("1", "2")} = ${n(h)}.`,
              why,
            ],
            answer: { kind: "number", value: count }, answerText: n(count), answerInput: String(count),
            vals: { h, count }, params: { A, a, b, kind: 0 },
          };
        }
        // ranger towers
        const d = r.int(5, 20), al = r.int(35, 75), be = r.int(35, 75), F = 180 - al - be;
        const sb = Math.sin(be * Math.PI / 180), sF = Math.sin(F * Math.PI / 180), AF = d * sb / sF;
        const ax = AF * Math.cos(al * Math.PI / 180), ay = AF * Math.sin(al * Math.PI / 180);
        return {
          prompt: `Ranger towers ${M.v("A")} and ${M.v("B")} are ${n(d)} km apart. A ranger at ${M.v("A")} sees a fire at an angle of ${dg(al)} from the line ${M.v("AB")}, and a ranger at ${M.v("B")} sees it at ${dg(be)} from the line ${M.v("BA")}. How far is the fire from tower ${M.v("A")}, in kilometers? Round to 2 decimal places.`,
          graph: triFig([[0, 0], [d, 0], [ax, ay]], { sides: [{ i: 0, j: 1, label: `${n(d)} km` }, { i: 0, j: 2, label: "?" }], angles: [{ i: 0, s: dg(al) }, { i: 1, s: dg(be) }], verts: ["A", "B", "F"] }),
          steps: [
            `The angle at the fire is 180° − ${dg(al)} − ${dg(be)} = ${dg(F)}.`,
            `The distance ${M.v("AF")} is opposite the ${dg(be)} angle at ${M.v("B")}, and the ${n(d)} km side is opposite the ${dg(F)} angle at the fire. Law of sines: ${M.frac(M.v("AF"), `sin ${dg(be)}`)} = ${M.frac(n(d), `sin ${dg(F)}`)}.`,
            `${M.v("AF")} = ${M.frac(`${n(d)} sin ${dg(be)}`, `sin ${dg(F)}`)} ≈ ${M.frac(`${n(d)} · ${fx(sb, 4)}`, fx(sF, 4))} ≈ ${fx(AF, 2)} km (keep full calculator precision).`,
          ],
          answer: { kind: "number", value: AF, dp: 2 }, answerText: `${fx(AF, 2)} km`, answerInput: fixed(AF, 2),
          vals: { F, sb, sF, AF }, params: { d, al, be, kind: 1 }, consts: [180],
        };
      },
    },

    // ---- T.17 Law of cosines ------------------------------------------------------------------------------------------
    "T.8": {
      title: "Law of cosines",
      generate(r, level) {
        const intTri = () => {
          for (;;) {
            const C = r.pick([60, 120, 60, 120, 90]), a = r.int(3, 16), b = r.int(3, 16);
            if (a === b) continue;
            const cc = a * a + b * b + (C === 60 ? -a * b : C === 120 ? a * b : 0), c = Math.round(Math.sqrt(cc));
            if (c * c === cc) return { a, b, c, C, cc };
          }
        };
        const pts = (a, b, C) => [[0, 0], [a, 0], [b * Math.cos(C * Math.PI / 180), b * Math.sin(C * Math.PI / 180)]];
        if (level === 1) {
          const { a, b, c, C, cc } = (() => { for (;;) { const t = intTri(); if (t.C !== 90) return t; } })();
          const cosC = cosD(C), aa = a * a, bb = b * b, ab2 = 2 * a * b, ab = a * b;
          return {
            prompt: `In triangle ${M.v("ABC")}, ${M.v("a")} = ${n(a)}, ${M.v("b")} = ${n(b)} and ${M.v("C")} = ${dg(C)}. Find ${M.v("c")}.`,
            graph: triFig(pts(a, b, C), { sides: [{ i: 0, j: 1, label: `a = ${n(a)}` }, { i: 0, j: 2, label: `b = ${n(b)}` }, { i: 1, j: 2, label: "c = ?" }], angles: [{ i: 0, s: dg(C) }] }),
            steps: [
              `Two sides and the included angle: use ${M.sup(M.v("c"), 2)} = ${M.sup(M.v("a"), 2)} + ${M.sup(M.v("b"), 2)} − 2${M.v("ab")} cos ${M.v("C")}.`,
              `${M.sup(M.v("c"), 2)} = ${n(aa)} + ${n(bb)} − ${n(ab2)} · ${rh(cosC, { paren: true })} = ${n(aa)} + ${n(bb)} ${C === 60 ? "−" : "+"} ${n(ab)} = ${n(cc)}.`,
              `${M.v("c")} = ${M.sqrt(n(cc))} = ${n(c)}.`,
            ],
            answer: { kind: "number", value: c }, answerText: n(c), answerInput: String(c),
            vals: { aa, bb, ab2, ab, cc, c, cosC: rv(cosC) }, params: { a, b, C },
          };
        }
        if (level === 2) {
          const { a, b, c } = intTri();
          const aa = a * a, bb = b * b, cc = c * c, top = aa + bb - cc, ab2 = 2 * a * b, cosC = new Frac(top, ab2);
          const C = cosC.eq(new Frac(1, 2)) ? 60 : cosC.eq(new Frac(-1, 2)) ? 120 : 90;
          return {
            prompt: `A triangle has sides ${M.v("a")} = ${n(a)}, ${M.v("b")} = ${n(b)} and ${M.v("c")} = ${n(c)}. Find the angle ${M.v("C")} opposite side ${M.v("c")}, in degrees.`,
            graph: triFig(pts(a, b, C), { sides: [{ i: 0, j: 1, label: n(a) }, { i: 0, j: 2, label: n(b) }, { i: 1, j: 2, label: n(c) }], angles: [{ i: 0, s: "C" }] }),
            steps: [
              `Three sides known: use cos ${M.v("C")} = ${M.frac(`${M.sup(M.v("a"), 2)} + ${M.sup(M.v("b"), 2)} − ${M.sup(M.v("c"), 2)}`, `2${M.v("ab")}`)}.`,
              `cos ${M.v("C")} = ${M.frac(`${n(aa)} + ${n(bb)} − ${n(cc)}`, `2 · ${n(a)} · ${n(b)}`)} = ${rawF(top, ab2)} = ${M.f(cosC)}.`,
              `The angle between 0° and 180° with cosine ${M.f(cosC)} is ${dg(C)}.`,
            ],
            answer: { kind: "number", value: C }, answerText: dg(C), answerInput: String(C), deg: true,
            vals: { aa, bb, cc, top, ab2, cosC: fv(cosC), C }, params: { a, b, c }, consts: [180],
          };
        }
        const pad = (b) => `${String(b).padStart(3, "0")}°`;
        if (r.chance(0.5)) {
          let b1, b2;
          do { b1 = r.int(10, 80); b2 = b1 + r.int(40, 150); } while (b2 - b1 === 90 || b2 - b1 === 60 || b2 - b1 === 120);
          const v1 = r.int(10, 30), v2 = r.int(10, 30), t = r.pick([2, 3, 1.5]), d1 = v1 * t, d2 = v2 * t, th0 = b2 - b1;
          const cs = Math.cos(th0 * Math.PI / 180), c2 = d1 * d1 + d2 * d2 - 2 * d1 * d2 * cs, c = Math.sqrt(c2);
          return {
            prompt: `Two ships leave a port at the same time. One sails on a bearing of ${pad(b1)} at ${n(v1)} km/h and the other on a bearing of ${pad(b2)} at ${n(v2)} km/h. How far apart are they after ${n(t)} hours, in kilometers? Round to 2 decimal places.`,
            steps: [
              `Distances from port: ${n(v1)} · ${n(t)} = ${n(d1)} km and ${n(v2)} · ${n(t)} = ${n(d2)} km.`,
              `Bearings are measured from north, so the angle between the two courses is ${dg(b2)} − ${dg(b1)} = ${dg(th0)}.`,
              `Law of cosines: ${M.sup(M.v("d"), 2)} = ${M.sup(n(d1), 2)} + ${M.sup(n(d2), 2)} − 2 · ${n(d1)} · ${n(d2)} · cos ${dg(th0)} ≈ ${fx(c2, 2)}.`,
              `${M.v("d")} ≈ ${M.sqrt(fx(c2, 2))} ≈ ${fx(c, 2)} km.`,
            ],
            answer: { kind: "number", value: c, dp: 2 }, answerText: `${fx(c, 2)} km`, answerInput: fixed(c, 2),
            vals: { d1, d2, th0, c2, c }, params: { b1, b2, v1, v2, t, kind: 0 },
          };
        }
        let a, b, c;
        for (;;) {
          [a, b, c] = [r.int(20, 90), r.int(20, 90), r.int(20, 90)].sort((p, q) => p - q);
          if (a + b > c + 5 && c > b && Math.abs(a * a + b * b - c * c) > 0.03 * 2 * a * b) break;
        }
        const top = a * a + b * b - c * c, ab2 = 2 * a * b, cs = top / ab2, C = Math.acos(cs) * 180 / Math.PI;
        return {
          prompt: `A triangular park has sides of ${n(a)} m, ${n(b)} m and ${n(c)} m. Find its largest angle, in degrees. Round to 1 decimal place.`,
          graph: triFig(pts(a, b, C), { sides: [{ i: 0, j: 1, label: `${n(a)} m` }, { i: 0, j: 2, label: `${n(b)} m` }, { i: 1, j: 2, label: `${n(c)} m` }], angles: [{ i: 0, s: "?" }] }),
          steps: [
            `The largest angle is opposite the longest side, ${n(c)} m.`,
            `cos ${M.v("C")} = ${M.frac(`${M.sup(n(a), 2)} + ${M.sup(n(b), 2)} − ${M.sup(n(c), 2)}`, `2 · ${n(a)} · ${n(b)}`)} = ${rawF(top, ab2)} ≈ ${fx(cs, 4)}.`,
            `${M.v("C")} = arccos(${rawF(top, ab2)}) ≈ ${fx(C, 1)}°.`,
          ],
          answer: { kind: "number", value: C, dp: 1 }, answerText: `${fx(C, 1)}°`, answerInput: fixed(C, 1), deg: true,
          vals: { top, ab2, cs, C }, params: { a, b, c, kind: 1 },
        };
      },
    },

    // ---- T.18 Triangle area, inradius and circumradius ------------------------------------------------------------
    "T.triangle-area": {
      title: "Heron's formula, inradius and circumradius",
      generate(r, level) {
        const HERON = [[5, 5, 6], [5, 5, 8], [13, 14, 15], [9, 10, 17], [6, 25, 29], [7, 15, 20], [10, 13, 13], [13, 20, 21], [11, 13, 20], [3, 4, 5], [5, 12, 13], [8, 15, 17], [12, 17, 25], [10, 17, 21]];
        const fig = (a, b, c, labels) => {
          const C = Math.acos((a * a + b * b - c * c) / (2 * a * b));
          return triFig([[0, 0], [a, 0], [b * Math.cos(C), b * Math.sin(C)]], { sides: [{ i: 0, j: 1, label: labels[0] }, { i: 0, j: 2, label: labels[1] }, { i: 1, j: 2, label: labels[2] }] });
        };
        if (level <= 2) {
          const t = r.pick(HERON), k = level === 1 && Math.max(...t) <= 13 ? r.int(1, 2) : 1;
          const [a, b, c] = r.shuffle(t).map((v) => v * k), s = (a + b + c) / 2, sa = s - a, sb = s - b, sc = s - c;
          const prod = s * sa * sb * sc, K = Math.round(Math.sqrt(prod));
          const heron = [
            `Semiperimeter: ${M.v("s")} = ${M.frac(`${n(a)} + ${n(b)} + ${n(c)}`, "2")} = ${n(s)}.`,
            `${M.v("s")} − ${M.v("a")} = ${n(sa)}, ${M.v("s")} − ${M.v("b")} = ${n(sb)}, ${M.v("s")} − ${M.v("c")} = ${n(sc)}.`,
            `Heron's formula: ${M.v("K")} = ${M.sqrt(`${n(s)} · ${n(sa)} · ${n(sb)} · ${n(sc)}`)} = ${M.sqrt(n(prod))} = ${n(K)}.`,
          ];
          const vals = { s, sa, sb, sc, prod, K };
          if (level === 1) {
            const word = r.chance(0.5);
            return {
              prompt: word
                ? `A triangular sail has sides of ${n(a)} m, ${n(b)} m and ${n(c)} m. What is its area, in square meters?`
                : `Find the area of a triangle with sides ${n(a)}, ${n(b)} and ${n(c)}.`,
              graph: fig(a, b, c, [n(a), n(b), n(c)]), steps: heron,
              answer: { kind: "number", value: K }, answerText: `${n(K)}${word ? " m²" : ""}`, answerInput: String(K),
              vals, params: { a, b, c },
            };
          }
          const inr = r.chance(0.5);
          const ans = inr ? new Frac(K, s) : new Frac(a * b * c, 4 * K);
          const last = inr
            ? `Inradius: ${M.v("r")} = ${M.frac(M.v("K"), M.v("s"))} = ${M.frac(n(K), n(s))}${ans.d === s ? "" : ` = ${M.f(ans)}`}.`
            : `Circumradius: ${M.v("R")} = ${M.frac(M.v("abc"), `4${M.v("K")}`)} = ${M.frac(`${n(a)} · ${n(b)} · ${n(c)}`, `4 · ${n(K)}`)} = ${M.frac(n(a * b * c), n(4 * K))}${ans.d === 4 * K ? "" : ` = ${M.f(ans)}`}.`;
          return {
            prompt: `A triangle has sides ${n(a)}, ${n(b)} and ${n(c)}. Find the radius of its ${inr ? "inscribed circle (the inradius)" : "circumscribed circle (the circumradius)"}, as a fraction in lowest terms.`,
            graph: fig(a, b, c, [n(a), n(b), n(c)]), steps: [...heron, last],
            answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
            vals: { ...vals, abc: a * b * c, K4: 4 * K, ans: fv(ans) }, params: { a, b, c, inr: inr ? 1 : 0 }, consts: [4],
          };
        }
        // level 3: one side and two angles (ASA), measured
        const a = r.int(20, 90), B = r.int(35, 80), C = r.int(35, 80), A = 180 - B - C;
        const sB = Math.sin(B * Math.PI / 180), sC = Math.sin(C * Math.PI / 180), sA = Math.sin(A * Math.PI / 180), K = (a * a * sB * sC) / (2 * sA);
        const b = a * sB / sA;
        return {
          prompt: `A surveyor measures one side of a triangular plot as ${n(a)} m; the angles at its two ends are ${dg(B)} and ${dg(C)}. What is the area of the plot, in square meters? Round to 2 decimal places.`,
          graph: triFig([[0, 0], [a, 0], [a - b * Math.cos(C * Math.PI / 180), b * Math.sin(C * Math.PI / 180)]], { sides: [{ i: 0, j: 1, label: `${n(a)} m` }], angles: [{ i: 0, s: dg(B) }, { i: 1, s: dg(C) }] }),
          steps: [
            `The third angle, opposite the measured side, is 180° − ${dg(B)} − ${dg(C)} = ${dg(A)}.`,
            `With one side ${M.v("a")} and all three angles: ${M.v("K")} = ${M.frac(`${M.sup(M.v("a"), 2)} sin ${M.v("B")} sin ${M.v("C")}`, `2 sin ${M.v("A")}`)}.`,
            `${M.v("K")} = ${M.frac(`${M.sup(n(a), 2)} · sin ${dg(B)} · sin ${dg(C)}`, `2 · sin ${dg(A)}`)} ≈ ${M.frac(`${n(a * a)} · ${fx(sB, 4)} · ${fx(sC, 4)}`, `2 · ${fx(sA, 4)}`)} ≈ ${fx(K, 2)} m² (keep full calculator precision).`,
          ],
          answer: { kind: "number", value: K, dp: 2 }, answerText: `${fx(K, 2)} m²`, answerInput: fixed(K, 2),
          vals: { A, aa: a * a, sA, sB, sC, K }, params: { a, B, C }, consts: [180],
        };
      },
    },

    // ---- T.19 Polar coordinates -------------------------------------------------------------------------------------
    "T.11": {
      title: "Polar coordinates",
      generate(r, level) {
        if (level === 1) {
          const rr = r.int(2, 8), d = r.pick(SPECIAL.filter((x) => x > 0)), c = cosD(d), s = sinD(d), x = c.mul(rr), y = s.mul(rr);
          return {
            prompt: `Convert the polar point (${M.v("r")}, ${th}) = (${n(rr)}, ${pih(dq(d))}) to Cartesian coordinates (${M.v("x")}, ${M.v("y")}).`,
            steps: [
              `${M.v("x")} = ${M.v("r")} cos ${th} and ${M.v("y")} = ${M.v("r")} sin ${th}, with cos(${pih(dq(d))}) = ${rh(c)} and sin(${pih(dq(d))}) = ${rh(s)}.`,
              `${M.v("x")} = ${n(rr)} · ${rh(c, { paren: true })} = ${rh(x)} and ${M.v("y")} = ${n(rr)} · ${rh(s, { paren: true })} = ${rh(y)}.`,
            ],
            answer: { kind: "point", value: [x.value, y.value] }, answerText: `(${rh(x)}, ${rh(y)})`, answerInput: `(${rt(x)}, ${rt(y)})`,
            vals: { c: rv(c), s: rv(s), x: rv(x), y: rv(y) }, params: { r: rr, q: fv(dq(d)) },
          };
        }
        if (level === 2) {
          const d = r.pick(NONAXIS), k = r.int(1, 4), r0 = d % 45 === 0 ? Rad.of(k, 2) : Rad.of(2 * k);
          const x = r0.mul(cosD(d)), y = r0.mul(sinD(d)), xx = x.mul(x), yy = y.mul(y), ss = xx.add(yy), t = y.div(x), ref = refD(d), qd = quad(d);
          return {
            prompt: `Convert the Cartesian point P = (${rh(x)}, ${rh(y)}) to polar coordinates (${M.v("r")}, ${th}) with ${M.v("r")} &gt; 0 and 0 ≤ ${th} &lt; 2π.`,
            graph: graph({ view: [-8, 8, -8, 8], equal: true, items: [{ t: "seg", a: [0, 0], b: [x.value, y.value], role: "muted" }, { t: "pt", x: x.value, y: y.value, label: "P" }] }),
            steps: [
              `${M.v("r")} = ${M.sqrt(`${M.sup(M.v("x"), 2)} + ${M.sup(M.v("y"), 2)}`)} = ${M.sqrt(`${rh(xx)} + ${rh(yy)}`)} = ${rootEq(ss, r0)}.`,
              `tan ${th} = ${M.frac(M.v("y"), M.v("x"))} = ${rh(t)}, so the reference angle is ${pih(dq(ref))} (where tan = ${rh(trigD("tan", ref))}).`,
              `P is in quadrant ${ROMAN[qd]} (${M.v("x")} ${x.value > 0 ? "&gt;" : "&lt;"} 0, ${M.v("y")} ${y.value > 0 ? "&gt;" : "&lt;"} 0), so ${th} = ${pih(dq(d))}.`,
            ],
            answer: { kind: "point", value: [r0.value, dq(d).value * Math.PI] }, answerText: `(${rh(r0)}, ${pih(dq(d))})`, answerInput: `(${rt(r0)}, ${pit(dq(d))})`,
            vals: { xx: rv(xx), yy: rv(yy), ss: rv(ss), r: rv(r0), t: rv(t), ref: fv(dq(ref)), tr: rv(trigD("tan", ref)), q: fv(dq(d)) }, params: { x: rv(x), y: rv(y) },
          };
        }
        // level 3: the polar circle r = a cos θ + b sin θ
        let a, b;
        if (r.chance(0.4)) { const k = 2 * r.int(1, 5) * r.sign(); [a, b] = r.chance(0.5) ? [k, 0] : [0, k]; }
        else { const [p, q] = r.pick([[6, 8], [8, 6], [10, 24], [24, 10]]); a = p * r.sign(); b = q * r.sign(); }
        const h = a / 2, k2 = b / 2, S = h * h + k2 * k2, rad = Math.round(Math.sqrt(S)), askC = r.chance(0.5);
        const lin2 = (u, w) => `${a ? `${n(a)}${u}` : ""}${b ? `${a ? (b < 0 ? " − " : " + ") : b < 0 ? "−" : ""}${n(Math.abs(b))}${w}` : ""}`;
        const rhs = lin2(` cos ${th}`, ` sin ${th}`), rhsR = lin2(`${M.v("r")} cos ${th}`, `${M.v("r")} sin ${th}`), rhsXY = lin2(M.v("x"), M.v("y"));
        const sqT = (c, v) => (c === 0 ? M.sup(M.v(v), 2) : M.sup(`(${M.v(v)} ${c > 0 ? "−" : "+"} ${n(Math.abs(c))})`, 2));
        return {
          prompt: `The polar curve ${M.eq(`${M.v("r")} = ${rhs}`)} is a circle. Find its ${askC ? "center, in Cartesian coordinates" : "radius"}.`,
          steps: [
            `Multiply both sides by ${M.v("r")}: ${M.sup(M.v("r"), 2)} = ${rhsR}.`,
            `Substitute ${M.sup(M.v("r"), 2)} = ${M.sup(M.v("x"), 2)} + ${M.sup(M.v("y"), 2)}, ${M.v("r")} cos ${th} = ${M.v("x")}, ${M.v("r")} sin ${th} = ${M.v("y")}: ${M.sup(M.v("x"), 2)} + ${M.sup(M.v("y"), 2)} = ${rhsXY}.`,
            `Complete the squares: ${sqT(h, "x")} + ${sqT(k2, "y")} = ${M.sup(np(h), 2)} + ${M.sup(np(k2), 2)} = ${n(S)}.`,
            `Center (${n(h)}, ${n(k2)}), radius ${M.sqrt(n(S))} = ${n(rad)}.`,
          ],
          answer: askC ? { kind: "point", value: [h, k2] } : { kind: "number", value: rad },
          answerText: askC ? `(${n(h)}, ${n(k2)})` : n(rad), answerInput: askC ? `(${h}, ${k2})` : String(rad),
          vals: { h, k2, S, rad }, params: { a, b, askC: askC ? 1 : 0 },
        };
      },
    },

    // ---- T.20 Vectors: components, magnitude and direction -----------------------------------------------------------
    "T.vectors-polar": {
      title: "Vector components, magnitude and direction",
      generate(r, level) {
        const ccw = "measured counterclockwise from the positive x-axis";
        if (level === 1) {
          const d = r.pick(NONAXIS), m = 2 * r.int(2, 25), c = cosD(d), s = sinD(d), vx = c.mul(m), vy = s.mul(m);
          const L = m * 1.25;
          return {
            prompt: `A force of ${n(m)} N acts in the direction ${dg(d)} (${ccw}). Find its components ⟨${M.sub(M.v("F"), "x")}, ${M.sub(M.v("F"), "y")}⟩ exactly, in newtons. Enter them as (x, y).`,
            graph: graph({ view: [-L, L, -L, L], equal: true, items: [{ t: "vec", a: [0, 0], b: [vx.value, vy.value], label: "F", role: "primary" }] }),
            steps: [
              `Components from magnitude and direction: ⟨${n(m)} cos ${dg(d)}, ${n(m)} sin ${dg(d)}⟩.`,
              `cos ${dg(d)} = ${rh(c)} and sin ${dg(d)} = ${rh(s)}, so the components are ${n(m)} · ${rh(c, { paren: true })} = ${rh(vx)} N and ${n(m)} · ${rh(s, { paren: true })} = ${rh(vy)} N.`,
            ],
            answer: { kind: "point", value: [vx.value, vy.value] }, answerText: `⟨${rh(vx)}, ${rh(vy)}⟩ N`, answerInput: `(${rt(vx)}, ${rt(vy)})`,
            vals: { c: rv(c), s: rv(s), vx: rv(vx), vy: rv(vy) }, params: { m, d },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const [p0, q0, h0] = r.pick(TRIPLES), k = r.int(1, 2), swap = r.chance(0.5);
            const vx = (swap ? q0 : p0) * k * r.sign(), vy = (swap ? p0 : q0) * k * r.sign(), m = h0 * k;
            const refA = Math.atan(Math.abs(vy) / Math.abs(vx)) * 180 / Math.PI, dir = mod(Math.atan2(vy, vx) * 180 / Math.PI, 360), qd = quad(dir);
            const how = qd === 1 ? `it is in quadrant I, so the direction is the reference angle` : qd === 2 ? `it is in quadrant II, so the direction is 180° − ${fx(refA, 2)}°` : qd === 3 ? `it is in quadrant III, so the direction is 180° + ${fx(refA, 2)}°` : `it is in quadrant IV, so the direction is 360° − ${fx(refA, 2)}°`;
            const L = Math.max(Math.abs(vx), Math.abs(vy)) + 2;
            return {
              prompt: `Find the magnitude and the direction angle (0° ≤ ${th} &lt; 360°, ${ccw}) of ${M.v("v")} = ⟨${n(vx)}, ${n(vy)}⟩. Round the angle to 1 decimal place. Enter magnitude, angle.`,
              graph: graph({ view: [-L, L, -L, L], equal: true, items: [{ t: "vec", a: [0, 0], b: [vx, vy], label: "v", role: "primary" }] }),
              steps: [
                `‖${M.v("v")}‖ = ${M.sqrt(`${M.sup(np(vx), 2)} + ${M.sup(np(vy), 2)}`)} = ${M.sqrt(`${n(vx * vx)} + ${n(vy * vy)}`)} = ${M.sqrt(n(m * m))} = ${n(m)}.`,
                `Reference angle: arctan ${M.frac(n(Math.abs(vy)), n(Math.abs(vx)))} ≈ ${fx(refA, 2)}°.`,
                `The vector points ${vx > 0 ? "right" : "left"} and ${vy > 0 ? "up" : "down"}: ${how}, ${th} ≈ ${fx(dir, 1)}°.`,
              ],
              answer: { kind: "numbers", values: [m, dir], ordered: true, dp: 1 }, answerText: `${n(m)}, ${fx(dir, 1)}°`, answerInput: `${m}, ${fixed(dir, 1)}`, deg: true,
              vals: { vxx: vx * vx, vyy: vy * vy, mm: m * m, m, refA, dir }, params: { vx, vy, kind: 0 }, consts: [180, 360],
            };
          }
          const x = r.nonzero(-5, 5), y = r.nonzero(-5, 5), al = r.pick([30, 45, 60, 90, 120, 135, 150]);
          const c = cosD(al), s = sinD(al), xr = Rad.of(x).mul(c).sub(Rad.of(y).mul(s)), yr = Rad.of(x).mul(s).add(Rad.of(y).mul(c));
          return {
            prompt: `Rotate the point (${n(x)}, ${n(y)}) counterclockwise about the origin by ${dg(al)}. Find the exact coordinates of the image. Enter ${M.v("x")}′, ${M.v("y")}′.`,
            steps: [
              `Rotation by α: ${M.v("x")}′ = ${M.v("x")} cos α − ${M.v("y")} sin α and ${M.v("y")}′ = ${M.v("x")} sin α + ${M.v("y")} cos α, with cos ${dg(al)} = ${rh(c)} and sin ${dg(al)} = ${rh(s)}.`,
              `${M.v("x")}′ = ${n(x)} · ${rh(c, { paren: true })} − ${np(y)} · ${rh(s, { paren: true })} = ${rh(xr)}.`,
              `${M.v("y")}′ = ${n(x)} · ${rh(s, { paren: true })} + ${np(y)} · ${rh(c, { paren: true })} = ${rh(yr)}.`,
            ],
            answer: { kind: "numbers", values: [xr.value, yr.value], ordered: true }, answerText: `(${rh(xr)}, ${rh(yr)})`, answerInput: `${rt(xr)}, ${rt(yr)}`,
            vals: { c: rv(c), s: rv(s), xr: rv(xr), yr: rv(yr) }, params: { x, y, al, kind: 1 },
          };
        }
        // level 3: resultant of two forces
        let a1, a2;
        do { a1 = r.int(0, 170); a2 = r.int(a1 + 30, a1 + 160); } while (a1 % 15 === 0 || a2 % 15 === 0);
        const F1 = 10 * r.int(2, 8), F2 = 10 * r.int(2, 8);
        const c1 = F1 * Math.cos(a1 * Math.PI / 180), s1 = F1 * Math.sin(a1 * Math.PI / 180), c2 = F2 * Math.cos(a2 * Math.PI / 180), s2 = F2 * Math.sin(a2 * Math.PI / 180);
        const Rx = c1 + c2, Ry = s1 + s2, mag = Math.hypot(Rx, Ry), dir = mod(Math.atan2(Ry, Rx) * 180 / Math.PI, 360);
        return {
          prompt: `Two ropes pull on a post: one with ${n(F1)} N in the direction ${dg(a1)} and the other with ${n(F2)} N in the direction ${dg(a2)} (both ${ccw}). Find the magnitude of the resultant force, in newtons, and its direction angle (0° to 360°). Round both to 1 decimal place. Enter magnitude, angle.`,
          steps: [
            `Components of the first force: ⟨${n(F1)} cos ${dg(a1)}, ${n(F1)} sin ${dg(a1)}⟩ ≈ ⟨${fx(c1, 2)}, ${fx(s1, 2)}⟩.`,
            `Components of the second: ⟨${n(F2)} cos ${dg(a2)}, ${n(F2)} sin ${dg(a2)}⟩ ≈ ⟨${fx(c2, 2)}, ${fx(s2, 2)}⟩.`,
            `Add the components: ${M.v("R")} ≈ ⟨${fx(Rx, 2)}, ${fx(Ry, 2)}⟩.`,
            `Magnitude: ${M.sqrt(`${M.sup(`(${fx(Rx, 2)})`, 2)} + ${M.sup(`(${fx(Ry, 2)})`, 2)}`)} ≈ ${fx(mag, 1)} N. Direction: the vector is in quadrant ${ROMAN[quad(dir)]}, and the angle with tangent ${M.frac(M.sub(M.v("R"), "y"), M.sub(M.v("R"), "x"))} there is ≈ ${fx(dir, 1)}° (keep full calculator precision).`,
          ],
          answer: { kind: "numbers", values: [mag, dir], ordered: true, dp: 1 }, answerText: `${fx(mag, 1)} N at ${fx(dir, 1)}°`, answerInput: `${fixed(mag, 1)}, ${fixed(dir, 1)}`, deg: true,
          vals: { c1, s1, c2, s2, Rx, Ry, mag, dir }, params: { F1, a1, F2, a2 }, consts: [360],
        };
      },
    },

    // ---- T.21 Dot product -----------------------------------------------------------------------------------------------
    "T.12": {
      title: "Dot product, angles and projections",
      generate(r, level) {
        const vec = (v) => `⟨${v.map(n).join(", ")}⟩`, u = M.v("u"), v = M.v("v");
        const bold = (s) => `<b>${s}</b>`;
        if (level === 1) {
          if (r.chance(0.65)) {
            const dim = r.pick([2, 3]), A = Array.from({ length: dim }, () => r.int(-6, 6)), B = Array.from({ length: dim }, () => r.int(-6, 6));
            const prods = A.map((x, i) => x * B[i]), dot = prods.reduce((p, q) => p + q, 0);
            return {
              prompt: `Find the dot product of ${bold(u)} = ${vec(A)} and ${bold(v)} = ${vec(B)}.`,
              steps: [
                `Multiply matching components: ${A.map((x, i) => `${np(x)} · ${np(B[i])}`).join(" + ")}.`,
                `= ${prods.map((p, i) => (i === 0 ? n(p) : `${p < 0 ? " − " : " + "}${n(Math.abs(p))}`)).join("")} = ${n(dot)}.`,
              ],
              answer: { kind: "number", value: dot }, answerText: n(dot), answerInput: String(dot),
              vals: { prods, dot }, params: { A, B, kind: 0 },
            };
          }
          let a, b, c, k;
          do { a = r.nonzero(-6, 6); b = r.nonzero(-6, 6); c = r.nonzero(-6, 6); k = -(b * c) / a; } while (!Number.isInteger(k) || k === 0);
          return {
            prompt: `Find ${M.v("k")} so that ${bold(u)} = ${vec([a, b])} and ${bold(v)} = ⟨${M.v("k")}, ${n(c)}⟩ are orthogonal.`,
            steps: [
              `Orthogonal vectors have dot product 0: ${n(a)}${M.v("k")} + ${np(b)} · ${np(c)} = 0, that is ${n(a)}${M.v("k")} ${b * c < 0 ? "−" : "+"} ${n(Math.abs(b * c))} = 0.`,
              `${n(a)}${M.v("k")} = ${n(-b * c)}, so ${M.v("k")} = ${n(k)}.`,
            ],
            answer: { kind: "number", value: k }, answerText: n(k), answerInput: String(k),
            vals: { bc: b * c, nbc: -b * c, k }, params: { a, b, c, kind: 1 },
          };
        }
        if (level === 2) {
          let A, B, dot, N1, N2;
          for (;;) {
            const dim = r.pick([2, 3]);
            A = Array.from({ length: dim }, () => r.int(-3, 3)); B = Array.from({ length: dim }, () => r.int(-3, 3));
            N1 = A.reduce((p, x) => p + x * x, 0); N2 = B.reduce((p, x) => p + x * x, 0);
            if (!N1 || !N2) continue;
            dot = A.reduce((p, x, i) => p + x * B[i], 0);
            const c2 = new Frac(dot * dot, N1 * N2);
            if (c2.eq(1)) continue;
            if ([new Frac(0), new Frac(1, 4), new Frac(1, 2), new Frac(3, 4)].some((t) => t.eq(c2))) break;
          }
          const cos = Rad.of(dot).div(Rad.of(1, N1 * N2)), ang0 = [0, 30, 45, 60, 90, 120, 135, 150, 180].find((d) => cosD(d).eq(cos));
          return {
            prompt: `Find the angle between ${bold(u)} = ${vec(A)} and ${bold(v)} = ${vec(B)}, in degrees.`,
            steps: [
              `${bold(u)} · ${bold(v)} = ${A.map((x, i) => `${np(x)} · ${np(B[i])}`).join(" + ")} = ${n(dot)}.`,
              `‖${bold(u)}‖ = ${rootEq(Rad.of(N1), Rad.of(1, N1))} and ‖${bold(v)}‖ = ${rootEq(Rad.of(N2), Rad.of(1, N2))}.`,
              `cos ${th} = ${M.frac(n(dot), `${M.sqrt(n(N1))} · ${M.sqrt(n(N2))}`)} = ${M.frac(n(dot), M.sqrt(n(N1 * N2)))} = ${rh(cos)}.`,
              `The angle between 0° and 180° with that cosine is ${dg(ang0)}.`,
            ],
            answer: { kind: "number", value: ang0 }, answerText: dg(ang0), answerInput: String(ang0), deg: true,
            vals: { dot, N1, N2, N12: N1 * N2, nu: rv(Rad.of(1, N1)), nv: rv(Rad.of(1, N2)), cos: rv(cos), ang: ang0 }, params: { A, B }, consts: [180],
          };
        }
        if (r.chance(0.5)) {
          let A, B, dot, NB;
          do { A = [r.int(-6, 6), r.int(-6, 6)]; B = [r.nonzero(-5, 5), r.nonzero(-5, 5)]; dot = A[0] * B[0] + A[1] * B[1]; NB = B[0] * B[0] + B[1] * B[1]; } while (dot === 0 || dot === NB);
          const k = new Frac(dot, NB), p1 = k.mul(B[0]), p2 = k.mul(B[1]);
          return {
            prompt: `Find the vector projection of ${bold(u)} = ${vec(A)} onto ${bold(v)} = ${vec(B)}. Enter it as (x, y).`,
            steps: [
              `${bold(u)} · ${bold(v)} = ${np(A[0])} · ${np(B[0])} + ${np(A[1])} · ${np(B[1])} = ${n(dot)} and ‖${bold(v)}‖${M.sup("", 2)} = ${M.sup(np(B[0]), 2)} + ${M.sup(np(B[1]), 2)} = ${n(NB)}.`,
              `proj = ${M.frac(`${bold(u)} · ${bold(v)}`, `‖${bold(v)}‖${M.sup("", 2)}`)} ${bold(v)} = ${k.n === dot && k.d === NB ? M.f(k) : `${rawF(dot, NB)} ${vec(B)} = ${M.f(k)}`} ${vec(B)}.`,
              `= ⟨${M.f(p1)}, ${M.f(p2)}⟩.`,
            ],
            answer: { kind: "point", value: [p1.value, p2.value] }, answerText: `⟨${M.f(p1)}, ${M.f(p2)}⟩`, answerInput: `(${tf(p1)}, ${tf(p2)})`,
            vals: { dot, NB, k: fv(k), p1: fv(p1), p2: fv(p2) }, params: { A, B, kind: 0 },
          };
        }
        const F = 10 * r.int(3, 15), d = 5 * r.int(2, 20), al = r.pick([30, 45, 60]), c = cosD(al), W = c.mul(F * d);
        return {
          prompt: `A sled is pulled ${n(d)} m across level snow by a rope with tension ${n(F)} N at an angle of ${dg(al)} above the horizontal. How much work does the rope do, in joules? Give the exact value or round to 2 decimal places.`,
          steps: [
            `Work is the dot product of force and displacement: ${M.v("W")} = ‖${bold("F")}‖ ‖${bold("d")}‖ cos ${th}, where ${th} is the angle between them.`,
            `${M.v("W")} = ${n(F)} · ${n(d)} · cos ${dg(al)} = ${n(F * d)} · ${rh(c)} = ${rh(W)} J${approx(W, 2, " J")}.`,
          ],
          answer: { kind: "number", value: W.value, dp: 2 }, answerText: `${ru(W)} J${approx(W, 2, " J")}`, answerInput: rt(W),
          vals: { Fd: F * d, c: rv(c), W: rv(W), Wn: W.value }, params: { F, d, al, kind: 1 },
        };
      },
    },

    // ---- T.22 Polar form of complex numbers ---------------------------------------------------------------------------
    "T.complex-polar": {
      title: "Polar form of complex numbers",
      generate(r, level) {
        const I = M.v("i");
        const cpx = (a, b) => {
          a = R(a); b = R(b);
          const neg = b.value < 0, mag = neg ? b.neg() : b;
          const bi = mag.eq(1) ? I : `${rh(mag)}${I}`;
          if (b.isZero()) return rh(a);
          if (a.isZero()) return `${neg ? "−" : ""}${bi}`;
          return `${rh(a)} ${neg ? "−" : "+"} ${bi}`;
        };
        const cis = (rr, d) => `${rr}(cos ${dg(d)} + ${I} sin ${dg(d)})`;
        const make = (kmax) => {
          const d = r.pick([30, 45, 60, 120, 135, 150]) * r.sign(), k = r.int(1, kmax), r0 = d % 45 === 0 ? Rad.of(k, 2) : Rad.of(2 * k);
          return { d, r0, a: r0.mul(cosD(d)), b: r0.mul(sinD(d)) };
        };
        const polarSteps = (z, name) => {
          const aa = z.a.mul(z.a), bb = z.b.mul(z.b), ref = refD(z.d), qd = quad(z.d);
          return {
            text: `${name}: |${name}| = ${M.sqrt(`${sq2(z.a)} + ${sq2(z.b)}`)} = ${rootEq(aa.add(bb), z.r0)}; the point (${rh(z.a)}, ${rh(z.b)}) is in quadrant ${ROMAN[qd]} with reference angle ${pih(dq(ref))}, so arg ${name} = ${pih(dq(z.d))}.`,
            vals: [rv(aa.add(bb)), rv(z.r0), fv(dq(ref)), fv(dq(z.d))],
          };
        };
        if (level === 1) {
          const z = make(4), ps = polarSteps(z, M.v("z"));
          return {
            prompt: `Write ${M.v("z")} = ${cpx(z.a, z.b)} in polar form: find the modulus ${M.v("r")} and the argument ${th} with −π &lt; ${th} ≤ π. Enter ${M.v("r")}, ${th}.`,
            graph: graph({ view: [-8, 8, -8, 8], equal: true, items: [{ t: "seg", a: [0, 0], b: [z.a.value, z.b.value], role: "muted" }, { t: "pt", x: z.a.value, y: z.b.value, label: "z" }] }),
            steps: [`Plot ${M.v("z")} as the point (${rh(z.a)}, ${rh(z.b)}).`, ps.text, `${M.v("z")} = ${rh(z.r0)}(cos(${pih(dq(z.d))}) + ${I} sin(${pih(dq(z.d))})).`],
            answer: { kind: "numbers", values: [z.r0.value, dq(z.d).value * Math.PI], ordered: true }, answerText: `${M.v("r")} = ${rh(z.r0)}, ${th} = ${pih(dq(z.d))}`,
            answerInput: `${rt(z.r0)}, ${pit(dq(z.d))}`, vals: { p: ps.vals }, params: { a: rv(z.a), b: rv(z.b) },
          };
        }
        if (level === 2) {
          let t1, t2, tot, div;
          for (;;) {
            t1 = 15 * r.int(1, 11); t2 = 15 * r.int(1, 11); div = r.chance(0.4);
            tot = div ? t1 - t2 : t1 + t2;
            const m = mod(tot, 360);
            if (t1 !== t2 && (m % 30 === 0 || m % 45 === 0)) break;
          }
          const r2 = r.int(2, 5), r1 = div ? r2 * r.int(1, 4) : r.int(2, 6), rr = div ? new Frac(r1, r2) : new Frac(r1 * r2);
          const m = mod(tot, 360), c = cosD(m), s = sinD(m), a = c.mul(rr), b = s.mul(rr);
          return {
            prompt: `${div ? "Divide" : "Multiply"} and write the result as ${M.v("a")} + ${M.v("b")}${I}: ${M.eq(div ? M.frac(cis(n(r1), t1), cis(n(r2), t2)) : `${cis(n(r1), t1)} · ${cis(n(r2), t2)}`)} Enter ${M.v("a")}, ${M.v("b")}.`,
            steps: [
              div ? `Divide the moduli and subtract the angles: ${M.frac(n(r1), n(r2))} = ${M.f(rr)} and ${dg(t1)} − ${dg(t2)} = ${dg(tot)}.` : `Multiply the moduli and add the angles: ${n(r1)} · ${n(r2)} = ${n(rr.value)} and ${dg(t1)} + ${dg(t2)} = ${dg(tot)}.`,
              ...(m !== tot ? [`${dg(tot)} has the same terminal side as ${dg(m)}.`] : []),
              `cos ${dg(m)} = ${rh(c)} and sin ${dg(m)} = ${rh(s)}, so the result is ${M.f(rr)}(${rh(c)} + ${I} · ${rh(s, { paren: true })}) = ${cpx(a, b)}.`,
            ],
            answer: { kind: "numbers", values: [a.value, b.value], ordered: true }, answerText: cpx(a, b), answerInput: `${rt(a)}, ${rt(b)}`,
            vals: { rr: fv(rr), tot, m, c: rv(c), s: rv(s), a: rv(a), b: rv(b) }, params: { r1, t1, r2, t2, div: div ? 1 : 0 }, consts: [360],
          };
        }
        // level 3: from rectangular, combine in polar form
        const z1 = make(2), z2 = make(2), div = r.chance(0.5), Z1 = M.sub(M.v("z"), "1"), Z2 = M.sub(M.v("z"), "2");
        const p1 = polarSteps(z1, Z1), p2 = polarSteps(z2, Z2);
        const rr = div ? z1.r0.div(z2.r0) : z1.r0.mul(z2.r0), tot = div ? z1.d - z2.d : z1.d + z2.d;
        let fin = mod(tot, 360); if (fin > 180) fin -= 360;
        return {
          prompt: `For ${Z1} = ${cpx(z1.a, z1.b)} and ${Z2} = ${cpx(z2.a, z2.b)}, find the modulus and the argument (in (−π, π]) of ${div ? M.frac(Z1, Z2) : `${Z1}${Z2}`}. Enter modulus, argument.`,
          steps: [
            p1.text, p2.text,
            div ? `Divide the moduli and subtract the arguments: ${rh(z1.r0)} ÷ ${rh(z2.r0)} = ${rh(rr)}, and ${pih(dq(z1.d))} − ${z2.d < 0 ? `(${pih(dq(z2.d))})` : pih(dq(z2.d))} = ${pih(dq(tot))}.`
              : `Multiply the moduli and add the arguments: ${rh(z1.r0)} · ${rh(z2.r0)} = ${rh(rr)}, and ${pih(dq(z1.d))} + ${z2.d < 0 ? `(${pih(dq(z2.d))})` : pih(dq(z2.d))} = ${pih(dq(tot))}.`,
            fin === tot ? `${pih(dq(tot))} is already in (−π, π].` : `Bring the angle into (−π, π] by ${fin < tot ? "subtracting" : "adding"} 2π: ${pih(dq(fin))}.`,
          ],
          answer: { kind: "numbers", values: [rr.value, dq(fin).value * Math.PI], ordered: true }, answerText: `modulus ${rh(rr)}, argument ${pih(dq(fin))}`,
          answerInput: `${rt(rr)}, ${pit(dq(fin))}`,
          vals: { p1: p1.vals, p2: p2.vals, rr: rv(rr), tot: fv(dq(tot)), fin: fv(dq(fin)) }, params: { a1: rv(z1.a), b1: rv(z1.b), a2: rv(z2.a), b2: rv(z2.b), div: div ? 1 : 0 },
        };
      },
    },

    // ---- T.23 Euler's formula and De Moivre's theorem --------------------------------------------------------------------
    "T.13": {
      title: "Euler's formula and De Moivre's theorem",
      generate(r, level) {
        const I = M.v("i");
        const cpx = (a, b) => {
          a = R(a); b = R(b);
          const neg = b.value < 0, mag = neg ? b.neg() : b, bi = mag.eq(1) ? I : `${rh(mag)}${I}`;
          if (b.isZero()) return rh(a);
          if (a.isZero()) return `${neg ? "−" : ""}${bi}`;
          return `${rh(a)} ${neg ? "−" : "+"} ${bi}`;
        };
        if (level === 1) {
          const rr = r.int(1, 4), d = r.pick(SPECIAL.filter((x) => x > 0)), q = dq(d), c = cosD(d), s = sinD(d), a = c.mul(rr), b = s.mul(rr);
          return {
            prompt: `Write ${M.eq(`${rr === 1 ? "" : n(rr)}${M.sup(M.v("e"), `${I}${q.d === 1 ? pih(q) : `${q.n === 1 ? "" : n(q.n)}π/${n(q.d)}`}`)}`)} in the form ${M.v("a")} + ${M.v("b")}${I}. Enter ${M.v("a")}, ${M.v("b")}.`,
            steps: [
              `Euler's formula: ${M.sup(M.v("e"), `${I}${th}`)} = cos ${th} + ${I} sin ${th}, with ${th} = ${pih(q)}.`,
              `cos(${pih(q)}) = ${rh(c)} and sin(${pih(q)}) = ${rh(s)}${rr === 1 ? "" : `; multiply by ${n(rr)}`}: ${cpx(a, b)}.`,
            ],
            answer: { kind: "numbers", values: [a.value, b.value], ordered: true }, answerText: cpx(a, b), answerInput: `${rt(a)}, ${rt(b)}`,
            vals: { c: rv(c), s: rv(s), a: rv(a), b: rv(b) }, params: { r: rr, q: fv(q) },
          };
        }
        if (level === 2) {
          const BASES = [[1, 1, 2, 45], [1, -1, 2, -45], [-1, 1, 2, 135], ["s3", 1, 4, 30], [1, "s3", 4, 60], [-1, "s3", 4, 120], ["s3", -1, 4, -30]];
          const [ar, br, R2, d] = r.pick(BASES), nn = R2 === 2 ? r.int(3, 8) : r.int(3, 6);
          const toR = (v) => (v === "s3" ? Rad.of(1, 3) : Rad.of(v));
          const a0 = toR(ar), b0 = toR(br), r0 = Rad.of(1, R2);
          let rn = Rad.of(1); for (let i = 0; i < nn; i++) rn = rn.mul(r0);
          const tot = nn * d, m = mod(tot, 360), c = cosD(m), s = sinD(m), a = rn.mul(c), b = rn.mul(s);
          return {
            prompt: `Use De Moivre's theorem to compute ${M.eq(M.sup(`(${cpx(a0, b0)})`, nn))} Write the result as ${M.v("a")} + ${M.v("b")}${I} and enter ${M.v("a")}, ${M.v("b")}.`,
            steps: [
              `Polar form: |${cpx(a0, b0)}| = ${rootEq(Rad.of(R2), r0)} and the argument is ${pih(dq(d))}.`,
              `De Moivre: raise the modulus to the power ${n(nn)} and multiply the angle by ${n(nn)}: ${R2 === 4 ? M.sup(rh(r0), nn) : M.sup(`(${rh(r0)})`, nn)} = ${rh(rn)} and ${n(nn)} · ${d < 0 ? `(${pih(dq(d))})` : pih(dq(d))} = ${pih(dq(tot))}${m !== tot ? `, which has the same terminal side as ${pih(dq(m))}` : ""}.`,
              `cos(${pih(dq(m))}) = ${rh(c)} and sin(${pih(dq(m))}) = ${rh(s)}, so the result is ${rh(rn)}(${rh(c)} + ${I} · ${rh(s, { paren: true })}) = ${cpx(a, b)}.`,
            ],
            answer: { kind: "numbers", values: [a.value, b.value], ordered: true }, answerText: cpx(a, b), answerInput: `${rt(a)}, ${rt(b)}`,
            vals: { R2, r0: rv(r0), rn: rv(rn), tot: fv(dq(tot)), m: fv(dq(m)), c: rv(c), s: rv(s), a: rv(a), b: rv(b), d: fv(dq(d)) }, params: { a0: rv(a0), b0: rv(b0), n: nn },
          };
        }
        // level 3: all n-th roots
        const nn = r.pick([2, 3, 4]), rho = nn === 4 ? r.int(1, 2) : r.int(1, 3), Rw = Math.pow(rho, nn), Th = r.pick([0, 90, 180, 270, 60, 120, 240, 300]);
        const wa = cosD(Th).mul(Rw), wb = sinD(Th).mul(Rw), args = Array.from({ length: nn }, (_, k) => new Frac(Th + 360 * k, 180 * nn));
        return {
          prompt: `Find the arguments, in [0, 2π), of all ${["", "", "square", "cube", "fourth"][nn]} roots of ${M.eq(`${M.v("w")} = ${cpx(wa, wb)}`)}`,
          steps: [
            `Polar form of ${M.v("w")}: modulus ${n(Rw)} and argument ${pih(dq(Th))}.`,
            `The ${n(nn)} roots have modulus ${M.sqrt(n(Rw), nn === 2 ? "" : String(nn))} = ${n(rho)} and arguments ${M.frac(`${pih(dq(Th))} + 2π${M.v("k")}`, n(nn))} for ${M.v("k")} = 0${nn > 1 ? ", …, " + n(nn - 1) : ""}, spaced ${pih(new Frac(2, nn))} apart.`,
            `The arguments are ${args.map(pih).join(", ")}.`,
          ],
          answer: { kind: "numbers", values: args.map((q) => q.value * Math.PI) }, answerText: args.map(pih).join(", "), answerInput: args.map(pit).join(", "),
          vals: { Rw, rho, th: fv(dq(Th)), sp: fv(new Frac(2, nn)), nm1: nn - 1, args: args.map(fv) }, params: { a: rv(wa), b: rv(wb), n: nn },
        };
      },
    },

    // ---- T.24 Hyperbolic functions -----------------------------------------------------------------------------------------
    "T.hyperbolic": {
      title: "Hyperbolic functions",
      generate(r, level) {
        const e = M.v("e");
        if (level === 1) {
          const a = r.pick([new Frac(2), new Frac(3), new Frac(4), new Frac(5), new Frac(1, 2), new Frac(1, 3), new Frac(3, 2), new Frac(2, 3)]);
          const f = r.pick(["sinh", "cosh", "tanh"]), ia = new Frac(1).div(a);
          const ans = f === "sinh" ? a.sub(ia).div(2) : f === "cosh" ? a.add(ia).div(2) : a.sub(ia).div(a.add(ia));
          const lnA = `ln ${a.d === 1 ? n(a.n) : `(${M.f(a)})`}`;
          const form = f === "sinh" ? M.frac(`${M.sup(e, M.v("x"))} − ${M.sup(e, `−${M.v("x")}`)}`, "2") : f === "cosh" ? M.frac(`${M.sup(e, M.v("x"))} + ${M.sup(e, `−${M.v("x")}`)}`, "2") : M.frac(`${M.sup(e, M.v("x"))} − ${M.sup(e, `−${M.v("x")}`)}`, `${M.sup(e, M.v("x"))} + ${M.sup(e, `−${M.v("x")}`)}`);
          const sub = f === "tanh" ? M.frac(`${M.f(a)} − ${M.f(ia)}`, `${M.f(a)} + ${M.f(ia)}`) : M.frac(`${M.f(a)} ${f === "sinh" ? "−" : "+"} ${M.f(ia)}`, "2");
          return {
            prompt: `Find the exact value of ${M.eq(`${f}(${lnA})`)}`,
            steps: [
              `${f} ${M.v("x")} = ${form}.`,
              `With ${M.v("x")} = ${lnA}: ${M.sup(e, M.v("x"))} = ${M.f(a)} and ${M.sup(e, `−${M.v("x")}`)} = ${a.d === 1 ? "" : `${M.frac("1", M.f(a))} = `}${M.f(ia)}.`,
              `${f}(${lnA}) = ${sub} = ${M.f(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
            vals: { ia: fv(ia), ans: fv(ans) }, params: { a: fv(a), f: ["sinh", "cosh", "tanh"].indexOf(f) },
          };
        }
        const [p0, q0, h] = r.pick(TRIPLES), swap = r.chance(0.5), p = swap ? q0 : p0, q = swap ? p0 : q0;
        if (level === 2) {
          const sg = r.sign();
          if (r.chance(0.5)) {
            const sv = new Frac(sg * p, q), cv = new Frac(h, q), ask = r.pick(["cosh", "tanh"]), ans = ask === "cosh" ? cv : sv.div(cv);
            return {
              prompt: `If sinh ${X} = ${M.f(sv)}, find the exact value of ${ask} ${X}.`,
              steps: [
                `${M.sup("cosh", 2)} ${X} − ${M.sup("sinh", 2)} ${X} = 1, so ${M.sup("cosh", 2)} ${X} = 1 + ${M.frac(n(p * p), n(q * q))} = ${M.frac(n(h * h), n(q * q))}.`,
                `cosh is always positive, so cosh ${X} = ${M.f(cv)}.`,
                ...(ask === "tanh" ? [`tanh ${X} = ${M.frac(`sinh ${X}`, `cosh ${X}`)} = ${M.f(sv)} ÷ ${M.f(cv)} = ${M.f(ans)}.`] : []),
              ],
              answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
              vals: { pp: p * p, qq: q * q, hh: h * h, cv: fv(cv), ans: fv(ans) }, params: { v: fv(sv), given: 0, ask: ask === "cosh" ? 1 : 2 },
            };
          }
          const cv = new Frac(h, q), sv = new Frac(sg * p, q), ask = r.pick(["sinh", "tanh"]), ans = ask === "sinh" ? sv : sv.div(cv);
          return {
            prompt: `If cosh ${X} = ${M.f(cv)} and ${X} ${sg > 0 ? "&gt;" : "&lt;"} 0, find the exact value of ${ask} ${X}.`,
            steps: [
              `${M.sup("sinh", 2)} ${X} = ${M.sup("cosh", 2)} ${X} − 1 = ${M.frac(n(h * h), n(q * q))} − 1 = ${M.frac(n(p * p), n(q * q))}, so sinh ${X} = ±${M.frac(n(p), n(q))}.`,
              `sinh has the sign of ${X}, so sinh ${X} = ${M.f(sv)}.`,
              ...(ask === "tanh" ? [`tanh ${X} = ${M.frac(`sinh ${X}`, `cosh ${X}`)} = ${fp(sv)} ÷ ${M.f(cv)} = ${M.f(ans)}.`] : []),
            ],
            answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: tf(ans),
            vals: { pp: p * p, qq: q * q, hh: h * h, sv: fv(sv), ans: fv(ans), p, q }, params: { v: fv(cv), given: 1, sg, ask: ask === "sinh" ? 0 : 2 },
          };
        }
        if (r.chance(0.65)) {
          const tanh = r.chance(0.4), v = tanh ? new Frac(p, h) : new Frac(p, q), Fv = new Frac(p + h, q);
          const lnT = Fv.d === 1 ? `ln ${n(Fv.n)}` : `ln(${M.f(Fv)})`;
          const steps = tanh
            ? [
              `artanh ${M.v("x")} = ${M.frac("1", "2")} ln ${M.frac(`1 + ${M.v("x")}`, `1 − ${M.v("x")}`)}.`,
              `${M.frac(`1 + ${M.f(v)}`, `1 − ${M.f(v)}`)} = ${M.f(new Frac(h + p, h))} ÷ ${M.f(new Frac(h - p, h))} = ${M.f(new Frac(h + p, h - p))}.`,
              `${M.f(new Frac(h + p, h - p))} = ${M.sup(`(${M.f(Fv)})`, 2)}, so ${M.frac("1", "2")} ln ${M.sup(`(${M.f(Fv)})`, 2)} = ${lnT}.`,
            ]
            : [
              `arsinh ${M.v("x")} = ln(${M.v("x")} + ${M.sqrt(`${M.sup(M.v("x"), 2)} + 1`)}).`,
              `${M.sqrt(`${M.sup(`(${M.f(v)})`, 2)} + 1`)} = ${M.sqrt(M.frac(`${n(p * p)} + ${n(q * q)}`, n(q * q)))} = ${M.sqrt(M.frac(n(h * h), n(q * q)))} = ${M.frac(n(h), n(q))}.`,
              `arsinh(${M.f(v)}) = ln(${M.f(v)} + ${M.frac(n(h), n(q))}) = ln ${M.frac(n(p + h), n(q))} = ${lnT}.`,
            ];
          return {
            prompt: `Find the exact value of ${M.eq(`${tanh ? "artanh" : "arsinh"}(${M.f(v)})`)} as a single logarithm.`,
            steps, answer: { kind: "number", value: Math.log(Fv.value) }, answerText: lnT, answerInput: `ln(${tf(Fv)})`,
            vals: tanh ? { t1: fv(new Frac(h + p, h)), t2: fv(new Frac(h - p, h)), t3: fv(new Frac(h + p, h - p)), F: fv(Fv) } : { pp: p * p, qq: q * q, hh: h * h, h, q, ph: p + h, F: fv(Fv) },
            params: { v: fv(v), tanh: tanh ? 1 : 0 },
          };
        }
        const a = 5 * r.int(2, 6), w = r.int(5, 30), ch = Math.cosh(w / a), sag = a * (ch - 1);
        return {
          prompt: `A power line hangs between two poles in the shape ${M.v("y")} = ${n(a)} cosh(${M.frac(X, n(a))}) (in meters), with the poles at ${X} = −${n(w)} and ${X} = ${n(w)}. How far above its lowest point are the ends of the line attached? Round to 2 decimal places.`,
          steps: [
            `cosh is smallest at 0, so the lowest point is at ${X} = 0, where ${M.v("y")} = ${n(a)} cosh 0 = ${n(a)}.`,
            `At a pole: ${M.v("y")} = ${n(a)} cosh(${M.frac(n(w), n(a))}) ≈ ${n(a)} · ${fx(ch, 4)} ≈ ${fx(a * ch, 2)}.`,
            `The difference is ${n(a)}(cosh(${M.frac(n(w), n(a))}) − 1) ≈ ${fx(sag, 2)} m (keep full calculator precision).`,
          ],
          answer: { kind: "number", value: sag, dp: 2 }, answerText: `${fx(sag, 2)} m`, answerInput: fixed(sag, 2),
          vals: { ch, y1: a * ch, sag }, params: { a, w, kind: 1 },
        };
      },
    },
// @@MORE@@
  });
})(Practice);
