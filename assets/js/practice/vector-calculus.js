/*
 * practice/vector-calculus.js — Vector Calculus practice problems (chapter 11), one generator per concept key.
 *
 * Each generator(r, level) draws hand-solvable numbers for the level (1 easy, 2 medium, 3 hard): polynomial
 * fields, unit-ish circles and spheres, boxes and rectangles, Pythagorean segments. Every number it shows is
 * built from values it computes and reports in `vals` (polynomials as sorted term lists [i, j, k, coef]);
 * tools/practice/verifiers/vector_calculus.py recomputes each of them independently with SymPy, and checks
 * both sides of every theorem used. See practice/core.js for the API.
 *
 * Skipped concepts: none. Every concept in chapter 11 has a computation to practice.
 */
(function (P) {
  "use strict";
  const { Frac, M, graph } = P;
  const n = (v) => M.n(v);
  const np = (v) => M.n(v, { paren: true });
  const F = (a, b = 1) => new Frac(a, b);
  const fv = (q) => { q = Frac.of(q); return { n: q.n, d: q.d }; };
  const typed = (q) => { q = Frac.of(q); return q.d === 1 ? String(q.n) : `${q.n}/${q.d}`; };
  const fp = (q) => M.f(q, { paren: true });
  /** A fraction squared, in parentheses when it is negative or not whole: (3/4)², (−2)², 5². */
  const sq = (q) => { q = Frac.of(q); return q.isInt() ? M.sup(np(q.n), 2) : M.sup(`(${M.f(q)})`, 2); };
  const bold = (s) => `<b>${s}</b>`;
  const vF = bold("F"), vr = bold("r"), vn = bold("n"), vk = bold("k"), vN = bold("N"), vv = bold("v"), v0 = bold("0");
  const x = M.v("x"), y = M.v("y"), z = M.v("z"), t = M.v("t"), u = M.v("u"), v = M.v("v");
  const XY = ["x", "y"], XYZ = ["x", "y", "z"], T = ["t"], UV = ["u", "v"], RR = ["r"];
  const nab = "∇";
  const phi = "φ", th = "θ";
  /** A partial derivative written as a subscript: P_y. */
  const pd = (f, w) => `${M.v(f)}<sub>${M.v(w)}</sub>`;
  const intg = (lo, hi) => `∫<sub>${lo}</sub><sup>${hi}</sup>`;
  const brk = (body, lo, hi) => `[${body}]<sub>${lo}</sub><sup>${hi}</sup>`;
  const vec = (...cs) => `(${cs.join(", ")})`;
  const vecQ = (arr) => vec(...arr.map((q) => M.f(q)));
  const cosT = `cos ${t}`, sinT = `sin ${t}`, cos2T = `cos<sup>2</sup> ${t}`, sin2T = `sin<sup>2</sup> ${t}`, scT = `sin ${t} cos ${t}`;
  const cosP = `cos ${phi}`, sinP = `sin ${phi}`;
  const piFrac2 = M.frac("π", "2");
  const hemi = `0 ≤ ${phi} ≤ ${piFrac2}, 0 ≤ ${th} ≤ 2π`;

  /** A sum of terms [coef, html]: coefficient 1 dropped, signs joined: 3 cos t − sin t. */
  function lin(terms, sep = " ") {
    let out = "";
    for (const [c, h] of terms) {
      const q = Frac.of(c);
      if (q.n === 0) continue;
      const mag = q.abs();
      const body = mag.eq(1) ? h : `${M.f(mag)}${sep}${h}`;
      out += out === "" ? (q.n < 0 ? "−" : "") + body : ` ${q.n < 0 ? "−" : "+"} ${body}`;
    }
    return out || "0";
  }
  /** k·(inner) as a signed term, k = 1 shown as (inner). */
  function times(k, inner, first = false) {
    const q = Frac.of(k);
    if (q.n === 0) return "";
    const mag = q.abs();
    const body = mag.eq(1) ? `(${inner})` : `${M.f(mag)}(${inner})`;
    return first ? (q.n < 0 ? "−" : "") + body : ` ${q.n < 0 ? "−" : "+"} ${body}`;
  }
  /** k times a polynomial in t as a signed term: 3(2t − 1), or 3 · (−2) when it is a constant. */
  function coefTimes(k, p, first = false) {
    if (!isConst(p)) return times(k, ph(p, T), first);
    const q = Frac.of(k), body = `${M.f(q.abs())} · ${fp(pconst(p))}`;
    return first ? (q.n < 0 ? "−" : "") + body : ` ${q.n < 0 ? "−" : "+"} ${body}`;
  }
  /** A rational multiple of π: 3π, −π, 3π/2 (stacked). */
  function piH(q) {
    q = Frac.of(q);
    if (q.n === 0) return "0";
    const a = Math.abs(q.n), top = a === 1 ? "π" : `${a}π`;
    return (q.n < 0 ? "−" : "") + (q.d === 1 ? top : M.frac(top, String(q.d)));
  }
  const piIn = (q) => { q = Frac.of(q); if (q.n === 0) return "0"; return `${q.n === 1 ? "" : q.n === -1 ? "-" : q.n}pi${q.d === 1 ? "" : "/" + q.d}`; };
  /** k·R written for a parametrization: cos t, 2 cos t. */
  const kc = (k, h) => (k === 1 ? h : k === -1 ? `−${h}` : `${n(k)} ${h}`);

  // ---- Polynomials in up to three variables, exact (Frac) coefficients ------------------------------
  // { nv, t: [{ e: [i, j, k], c: Frac }] }, terms sorted by exponent tuple, descending.
  const cmpLex = (a, c) => { for (let i = 0; i < a.length; i++) if (a[i] !== c[i]) return a[i] - c[i]; return 0; };
  function Pl(nv, terms) {
    const m = new Map();
    for (const { e, c } of terms) { const k = e.join(","); m.set(k, (m.get(k) || new Frac(0)).add(c)); }
    const out = [];
    for (const [k, c] of m) if (c.n !== 0) out.push({ e: k.split(",").map(Number), c });
    out.sort((a, c) => cmpLex(c.e, a.e));
    return { nv, t: out };
  }
  const mono = (nv, c, e) => Pl(nv, [{ e, c: Frac.of(c) }]);
  const cst = (nv, c) => mono(nv, c, Array(nv).fill(0));
  const P2 = (ts) => Pl(2, ts.map(([c, i, j]) => ({ e: [i, j], c: Frac.of(c) })));
  const P3 = (ts) => Pl(3, ts.map(([c, i, j, k]) => ({ e: [i, j, k], c: Frac.of(c) })));
  /** c0 + c1 t + c2 t² + … */
  const T1 = (...cs) => Pl(1, cs.map((c, i) => ({ e: [i], c: Frac.of(c) })));
  const tm = (k, c = 1) => mono(1, c, [k]);
  const padd = (...ps) => Pl(ps[0].nv, ps.flatMap((p) => p.t));
  const pscale = (p, k) => Pl(p.nv, p.t.map(({ e, c }) => ({ e, c: c.mul(k) })));
  const psub = (a, c) => padd(a, pscale(c, -1));
  const pmul = (a, c) => Pl(a.nv, a.t.flatMap((p) => c.t.map((q) => ({ e: p.e.map((w, i) => w + q.e[i]), c: p.c.mul(q.c) }))));
  const ppow = (a, k) => { let out = cst(a.nv, 1); for (let i = 0; i < k; i++) out = pmul(out, a); return out; };
  const pdiff = (p, i) => Pl(p.nv, p.t.filter((q) => q.e[i] > 0).map((q) => ({ e: q.e.map((w, j) => (j === i ? w - 1 : w)), c: q.c.mul(q.e[i]) })));
  const panti = (p, i) => Pl(p.nv, p.t.map((q) => ({ e: q.e.map((w, j) => (j === i ? w + 1 : w)), c: q.c.div(q.e[i] + 1) })));
  /** Put variable i = value (keeps the variable count). */
  const pat = (p, i, val) => Pl(p.nv, p.t.map((q) => ({ e: q.e.map((w, j) => (j === i ? 0 : w)), c: q.c.mul(Frac.of(val).pow(q.e[i])) })));
  const pdef = (p, i, lo, hi) => { const A = panti(p, i); return psub(pat(A, i, hi), pat(A, i, lo)); };
  const pval = (p, pt) => p.t.reduce((s, q) => s.add(q.c.mul(q.e.reduce((m, w, j) => m.mul(Frac.of(pt[j]).pow(w)), new Frac(1)))), new Frac(0));
  const pf = (p, pt) => p.t.reduce((s, q) => s + q.c.value * q.e.reduce((m, w, j) => m * Math.pow(pt[j], w), 1), 0);
  /** Substitute polynomials (all in the same new variables) for the variables. */
  function pcomp(p, comps) {
    const nv = comps[0].nv;
    let out = cst(nv, 0);
    for (const q of p.t) {
      let m = cst(nv, q.c);
      q.e.forEach((w, j) => { m = pmul(m, ppow(comps[j], w)); });
      out = padd(out, m);
    }
    return out;
  }
  const isZero = (p) => p.t.length === 0;
  const pconst = (p) => pval(p, Array(p.nv).fill(0));
  const isConst = (p) => p.t.every((q) => q.e.every((w) => w === 0));
  const dependsOn = (p, i) => p.t.some((q) => q.e[i] > 0);
  const pv = (p) => p.t.map((q) => [...q.e, fv(q.c)]);
  const degSum = (e) => e.reduce((a, c) => a + c, 0);
  const dispOrder = (p) => p.t.slice().sort((a, c) => (degSum(c.e) - degSum(a.e)) || cmpLex(c.e, a.e));
  /** A polynomial as HTML: 3x²y − ½z + 4. */
  function ph(p, names) {
    if (isZero(p)) return "0";
    let out = "";
    dispOrder(p).forEach((q, k) => {
      const vars = q.e.map((w, j) => (w === 0 ? "" : w === 1 ? M.v(names[j]) : M.sup(M.v(names[j]), w))).join("");
      const mag = q.c.abs();
      const body = vars ? (mag.eq(1) ? vars : `${M.f(mag)}${vars}`) : M.f(mag);
      out += k === 0 ? (q.c.n < 0 ? "−" : "") + body : ` ${q.c.n < 0 ? "−" : "+"} ${body}`;
    });
    return out;
  }
  /** In parentheses when it has several terms or a leading minus (for products and differences). */
  const pp = (p, names) => (p.t.length > 1 || (p.t.length === 1 && p.t[0].c.n < 0) ? `(${ph(p, names)})` : ph(p, names));
  /** In parentheses when it has several terms (for an integrand). */
  const pw = (p, names) => (p.t.length > 1 ? `(${ph(p, names)})` : ph(p, names));
  /** As a person would type it: 3x^2y - (1/2)z + 4. */
  function ptyped(p, names) {
    if (isZero(p)) return "0";
    return dispOrder(p).map((q, k) => {
      // explicit * between letters: the parser reads xy^2 as (xy)^2
      const vars = q.e.map((w, j) => (w === 0 ? "" : w === 1 ? names[j] : `${names[j]}^${w}`)).filter(Boolean).join("*");
      const mag = q.c.abs();
      let coef = mag.d === 1 ? String(mag.n) : `(${mag.n}/${mag.d})`;
      if (vars && mag.eq(1)) coef = "";
      return k === 0 ? (q.c.n < 0 ? "-" : "") + coef + vars : ` ${q.c.n < 0 ? "-" : "+"} ${coef}${vars}`;
    }).join("");
  }
  /** The parser form of a polynomial (for answer.expr). */
  const pexpr = (p, names) => (isZero(p) ? "0" : p.t.map((q) => `(${typed(q.c)})` + q.e.map((w, j) => (w ? `*${names[j]}^${w}` : "")).join("")).join(" + "));
  /** Substitution shown term by term: 3 · 2² · (−1) + (−1)³. */
  function substH(p, pt) {
    if (isZero(p)) return "0";
    return dispOrder(p).map((q, k) => {
      const factors = q.e.map((w, j) => (w === 0 ? null : w === 1 ? np(pt[j]) : M.sup(np(pt[j]), w))).filter(Boolean);
      const mag = q.c.abs();
      const parts = (mag.eq(1) && factors.length ? [] : [M.f(mag)]).concat(factors);
      const body = parts.join(" · ");
      return k === 0 ? (q.c.n < 0 ? "−" : "") + body : ` ${q.c.n < 0 ? "−" : "+"} ${body}`;
    }).join("");
  }
  /** "3 · 2² + 1 = " before a value, or nothing when the substitution would just repeat the value. */
  const subEq = (p, pt, val) => (isConst(p) || substH(p, pt) === M.f(val) ? "" : `${substH(p, pt)} = `);
  /** Exponent tuples of total degree d in nv variables. */
  const expsOf = (nv, d) => { if (nv === 1) return [[d]]; const out = []; for (let i = d; i >= 0; i--) for (const rest of expsOf(nv - 1, d - i)) out.push([i, ...rest]); return out; };
  /** A random polynomial with k terms of degree dmin..dmax, coefficients ±1..cmax (or 1..cmax when pos). */
  function rpoly(r, nv, k, dmin, dmax, cmax, ok = () => true, pos = false) {
    const pool = [];
    for (let d = dmin; d <= dmax; d++) pool.push(...expsOf(nv, d).filter(ok));
    return Pl(nv, r.sample(pool, k).map((e) => ({ e, c: new Frac(pos ? r.int(1, cmax) : r.nonzero(-cmax, cmax)) })));
  }
  const fieldH = (comps, names) => vec(...comps.map((c) => ph(c, names)));
  function curlOf(Pf, Qf, Rf) {
    const Ry = pdiff(Rf, 1), Qz = pdiff(Qf, 2), Pz = pdiff(Pf, 2), Rx = pdiff(Rf, 0), Qx = pdiff(Qf, 0), Py = pdiff(Pf, 1);
    return { Ry, Qz, Pz, Rx, Qx, Py, c: [psub(Ry, Qz), psub(Pz, Rx), psub(Qx, Py)] };
  }
  const curlH = (cu) =>
    `${nab} × ${vF} = (${pd("R", "y")} − ${pd("Q", "z")}, ${pd("P", "z")} − ${pd("R", "x")}, ${pd("Q", "x")} − ${pd("P", "y")}) = ` +
    `(${ph(cu.Ry, XYZ)} − ${pp(cu.Qz, XYZ)}, ${ph(cu.Pz, XYZ)} − ${pp(cu.Rx, XYZ)}, ${ph(cu.Qx, XYZ)} − ${pp(cu.Py, XYZ)}) = ${fieldH(cu.c, XYZ)}`;
  const crossH = (a, c) =>
    `(${np(a[1])} · ${np(c[2])} − ${np(a[2])} · ${np(c[1])}, ${np(a[2])} · ${np(c[0])} − ${np(a[0])} · ${np(c[2])}, ${np(a[0])} · ${np(c[1])} − ${np(a[1])} · ${np(c[0])})`;
  const cross = (a, c) => [a[1].mul(c[2]).sub(a[2].mul(c[1])), a[2].mul(c[0]).sub(a[0].mul(c[2])), a[0].mul(c[1]).sub(a[1].mul(c[0]))];

  // ---- Graph helpers -----------------------------------------------------------------------------------
  /** Field arrows at the given points, scaled so the longest has length len. */
  function arrows(fn, pts, len) {
    const vs = pts.map(([a, c]) => fn(a, c));
    const m = Math.max(...vs.map(([a, c]) => Math.hypot(a, c)));
    const out = [];
    pts.forEach(([a, c], k) => {
      const [p, q] = vs[k];
      if (m < 1e-12 || Math.hypot(p, q) < 1e-9) return;
      out.push({ t: "vec", a: [a, c], b: [a + (p * len) / m, c + (q * len) / m], role: "muted" });
    });
    return out;
  }
  const field2 = (Pf, Qf) => (a, c) => [pf(Pf, [a, c]), pf(Qf, [a, c])];
  function curve(fx, fy, t0, t1, k = 24, role = "primary") {
    const out = [];
    for (let i = 0; i < k; i++) {
      const a = t0 + ((t1 - t0) * i) / k, c = t0 + ((t1 - t0) * (i + 1)) / k;
      out.push({ t: "seg", a: [fx(a), fy(a)], b: [fx(c), fy(c)], role });
    }
    return out;
  }
  const gridPts = (xs, ys) => xs.flatMap((a) => ys.map((c) => [a, c]));
  const range = (lo, hi, step = 1) => { const out = []; for (let s = lo; s <= hi + 1e-9; s += step) out.push(s); return out; };
  /** A bent path from A to B (a quadratic Bézier curve), to show that the path does not matter. */
  function bentPath(A, B, bend) {
    const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2, dx = B[0] - A[0], dy = B[1] - A[1];
    const C = [mx - dy * bend, my + dx * bend];
    const bz = (i) => (s) => (1 - s) * (1 - s) * A[i] + 2 * s * (1 - s) * C[i] + s * s * B[i];
    return { items: curve(bz(0), bz(1), 0, 1, 20), C };
  }
  function viewAround(pts, pad = 1.5) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
  }

  // ---- Potentials (integrate one variable at a time) ------------------------------------------------------
  function potential2(Pf, Qf) {
    const I = panti(Pf, 0), Iy = pdiff(I, 1), gp = psub(Qf, Iy), g = panti(gp, 1), f = padd(I, g);
    return { I, Iy, gp, g, f };
  }
  const potential2Steps = (Pf, Qf, pot) => [
    `Integrate ${M.v("P")} in ${x}, holding ${y} fixed: ${phi} = ∫ ${pw(Pf, XY)} d${x} = ${ph(pot.I, XY)} + ${M.v("g")}(${y}), where ${M.v("g")}(${y}) is the unknown “constant”.`,
    `Differentiate in ${y} and match ${M.v("Q")}: ${phi}<sub>${y}</sub> = ${isZero(pot.Iy) ? "" : `${ph(pot.Iy, XY)} + `}${M.v("g")}′(${y}) = ${ph(Qf, XY)}, so ${M.v("g")}′(${y}) = ${ph(pot.gp, XY)}` +
      (isZero(pot.gp) ? ` and ${M.v("g")} is a constant; take it to be 0.` : ` and ${M.v("g")}(${y}) = ${ph(pot.g, XY)} (constant 0).`),
    `So ${phi}(${x}, ${y}) = ${ph(pot.f, XY)}. Check: its partials are ${M.v("P")} and ${M.v("Q")}.`,
  ];
  const pot2Vals = (pot) => ({ I: pv(pot.I), Iy: pv(pot.Iy), gp: pv(pot.gp), g: pv(pot.g), phi: pv(pot.f) });

  // Plane pieces z = ax + by + c with a whole or simple √(1 + a² + b²).
  const PLANES = [[2, 2, 3], [4, 8, 9], [8, 4, 9], [F(3, 4), 0, F(5, 4)], [0, F(3, 4), F(5, 4)], [F(4, 3), 0, F(5, 3)], [0, F(4, 3), F(5, 3)], [F(2, 3), 2, F(7, 3)], [2, F(2, 3), F(7, 3)]];
  function pickPlane(r) {
    const [a0, b0, s] = r.pick(PLANES);
    return { a: Frac.of(a0).mul(r.sign()), b: Frac.of(b0).mul(r.sign()), s: Frac.of(s) };
  }

  P.define("vector-calculus", {
    // ---- V.8 Vector fields & line integrals ---------------------------------------------------------------
    "V.8": {
      title: "Line integrals along a curve",
      generate(r, level) {
        if (level === 1) {
          const pool = [[1, 0], [0, 1], [1, 1], [2, 0], [0, 2]];
          const Pf = P2([[r.int(1, 4), ...r.pick(pool)]]), Qf = P2([[r.int(1, 4), ...r.pick(pool)]]);
          const swap = r.chance(0.5);
          const X = swap ? tm(2) : tm(1), Y = swap ? tm(1) : tm(2);
          const Pt = pcomp(Pf, [X, Y]), Qt = pcomp(Qf, [X, Y]), dX = pdiff(X, 0), dY = pdiff(Y, 0);
          const ig = padd(pmul(Pt, dX), pmul(Qt, dY)), an = panti(ig, 0), ans = pval(an, [1]);
          const fx = (s) => (swap ? s * s : s), fy = (s) => (swap ? s : s * s);
          return {
            prompt: `Let ${vF}(${x}, ${y}) = ${fieldH([Pf, Qf], XY)} and let ${M.v("C")} be the curve ${vr}(${t}) = (${ph(X, T)}, ${ph(Y, T)}), 0 ≤ ${t} ≤ 1, from (0, 0) to (1, 1). Evaluate ${M.eq(`∫<sub>${M.v("C")}</sub> ${vF} · d${vr}`)}`,
            graph: graph({ view: [-0.5, 1.5, -0.5, 1.5], equal: true, items: [
              ...arrows(field2(Pf, Qf), gridPts([0, 0.5, 1], [0, 0.5, 1]), 0.35), ...curve(fx, fy, 0, 1),
              { t: "pt", x: 0, y: 0, label: "start" }, { t: "pt", x: 1, y: 1, label: "end" }] }),
            steps: [
              `Differentiate the parametrization: ${vr}′(${t}) = (${ph(dX, T)}, ${ph(dY, T)}).`,
              `Substitute ${x} = ${ph(X, T)} and ${y} = ${ph(Y, T)} into ${vF}: ${vF}(${vr}(${t})) = (${ph(Pt, T)}, ${ph(Qt, T)}).`,
              `Dot with ${vr}′(${t}): ${vF}(${vr}(${t})) · ${vr}′(${t}) = ${pp(Pt, T)} · ${pp(dX, T)} + ${pp(Qt, T)} · ${pp(dY, T)} = ${ph(ig, T)}.`,
              `Integrate from 0 to 1: ${intg(0, 1)} ${pw(ig, T)} d${t} = ${brk(ph(an, T), 0, 1)} = ${M.f(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: typed(ans),
            vals: { dX: pv(dX), dY: pv(dY), Pt: pv(Pt), Qt: pv(Qt), ig: pv(ig), an: pv(an), ans: fv(ans) },
            params: { P: pv(Pf), Q: pv(Qf), swap: swap ? 1 : 0 },
          };
        }
        if (level === 2) {
          // scalar line integral of f = ax + by + c along a segment of whole-number length
          const dirs = [[3, 4], [4, 3], [6, 8], [8, 6], [0, 5], [5, 0], [0, 4], [4, 0]];
          for (;;) {
            const [p0, q0] = r.pick(dirs);
            const dx = p0 === 0 ? 0 : p0 * r.sign(), dy = q0 === 0 ? 0 : q0 * r.sign();
            const x0 = r.int(-4, 4), y0 = r.int(-4, 4), x1 = x0 + dx, y1 = y0 + dy;
            if (Math.abs(x1) > 8 || Math.abs(y1) > 8) continue;
            const a = r.nonzero(-3, 3), c = r.nonzero(-3, 3), k = r.int(-5, 5);
            const f = P2([[a, 1, 0], [c, 0, 1], [k, 0, 0]]);
            const X = T1(x0, dx), Y = T1(y0, dy), sqs = dx * dx + dy * dy, L = Math.round(Math.sqrt(sqs));
            const ft = pcomp(f, [X, Y]), an = panti(ft, 0), I1 = pval(an, [1]), ans = I1.mul(L);
            if (ans.n === 0) continue;
            const sv = M.v("s");
            return {
              prompt: `Evaluate ${M.eq(`∫<sub>${M.v("C")}</sub> ${M.v("f")} d${sv}`)} for ${M.v("f")}(${x}, ${y}) = ${ph(f, XY)}, where ${M.v("C")} is the line segment from ${M.v("A")}(${n(x0)}, ${n(y0)}) to ${M.v("B")}(${n(x1)}, ${n(y1)}).`,
              graph: graph({ view: viewAround([[x0, y0], [x1, y1]]), equal: true, items: [
                { t: "vec", a: [x0, y0], b: [x1, y1], role: "primary" }, { t: "pt", x: x0, y: y0, label: "A" }, { t: "pt", x: x1, y: y1, label: "B" }] }),
              steps: [
                `Parametrize the segment: ${vr}(${t}) = ${M.v("A")} + ${t}(${M.v("B")} − ${M.v("A")}) = (${ph(X, T)}, ${ph(Y, T)}), 0 ≤ ${t} ≤ 1.`,
                `${vr}′(${t}) = (${n(dx)}, ${n(dy)}), so d${sv} = ‖${vr}′(${t})‖ d${t} = ${M.sqrt(`${M.sup(np(dx), 2)} + ${M.sup(np(dy), 2)}`)} d${t} = ${M.sqrt(n(sqs))} d${t} = ${n(L)} d${t}.`,
                `On the segment, ${M.v("f")}(${vr}(${t})) = ${coefTimes(a, X, true)}${coefTimes(c, Y)}${M.term(k, "")} = ${ph(ft, T)}.`,
                `${intg(0, 1)} ${pw(ft, T)} · ${n(L)} d${t} = ${n(L)} · ${brk(ph(an, T), 0, 1)} = ${n(L)} · ${fp(I1)} = ${M.f(ans)}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: typed(ans),
              vals: { dx, dy, sqs, L, ft: pv(ft), an: pv(an), I1: fv(I1), ans: fv(ans) },
              params: { x0, y0, x1, y1, f: pv(f) },
            };
          }
        }
        // level 3: work along a two-segment path (additivity, component form)
        for (;;) {
          const Pf = rpoly(r, 2, 2, 1, 2, 3), Qf = rpoly(r, 2, 2, 1, 2, 3);
          const a = r.int(1, 3), c = r.int(1, 3), xFirst = r.chance(0.5);
          const tt = tm(1);
          // xFirst: (0,0) → (a,0) → (a,c); else (0,0) → (0,c) → (a,c)
          const g1 = xFirst ? pcomp(Pf, [tt, T1(0)]) : pcomp(Qf, [T1(0), tt]);
          const g2 = xFirst ? pcomp(Qf, [T1(a), tt]) : pcomp(Pf, [tt, T1(c)]);
          if (isZero(g1) || isZero(g2)) continue;
          const hi1 = xFirst ? a : c, hi2 = xFirst ? c : a;
          const A1 = panti(g1, 0), A2 = panti(g2, 0), w1 = pval(A1, [hi1]), w2 = pval(A2, [hi2]), ans = w1.add(w2);
          if (w1.n === 0 || w2.n === 0 || ans.n === 0) continue;
          const corner = xFirst ? [a, 0] : [0, c];
          const C1 = `${M.v("C")}<sub>1</sub>`, C2 = `${M.v("C")}<sub>2</sub>`;
          const seg1 = xFirst
            ? `${C1} runs from (0, 0) to (${n(a)}, 0): ${vr}(${t}) = (${t}, 0), 0 ≤ ${t} ≤ ${n(a)}. There d${y} = 0 and d${x} = d${t}, so only ${M.v("P")} d${x} counts: ${intg(0, n(a))} ${M.v("P")}(${t}, 0) d${t}`
            : `${C1} runs from (0, 0) to (0, ${n(c)}): ${vr}(${t}) = (0, ${t}), 0 ≤ ${t} ≤ ${n(c)}. There d${x} = 0 and d${y} = d${t}, so only ${M.v("Q")} d${y} counts: ${intg(0, n(c))} ${M.v("Q")}(0, ${t}) d${t}`;
          const seg2 = xFirst
            ? `${C2} runs from (${n(a)}, 0) to (${n(a)}, ${n(c)}): ${vr}(${t}) = (${n(a)}, ${t}), 0 ≤ ${t} ≤ ${n(c)}. There d${x} = 0, so ${intg(0, n(c))} ${M.v("Q")}(${n(a)}, ${t}) d${t}`
            : `${C2} runs from (0, ${n(c)}) to (${n(a)}, ${n(c)}): ${vr}(${t}) = (${t}, ${n(c)}), 0 ≤ ${t} ≤ ${n(a)}. There d${y} = 0, so ${intg(0, n(a))} ${M.v("P")}(${t}, ${n(c)}) d${t}`;
          return {
            prompt: `A particle moves through the force field ${vF}(${x}, ${y}) = ${fieldH([Pf, Qf], XY)} (newtons, with ${x} and ${y} in meters) along the path shown: straight from (0, 0) to (${n(corner[0])}, ${n(corner[1])}), then straight to (${n(a)}, ${n(c)}). Find the work ${M.eq(`${M.v("W")} = ∫<sub>${M.v("C")}</sub> ${M.v("P")} d${x} + ${M.v("Q")} d${y}`)} in joules.`,
            graph: graph({ view: [-0.8, a + 0.8, -0.8, c + 0.8], equal: true, items: [
              ...arrows(field2(Pf, Qf), gridPts(range(0, a, 0.5), range(0, c, 0.5)), 0.4),
              { t: "vec", a: [0, 0], b: corner, role: "primary" }, { t: "vec", a: corner, b: [a, c], role: "primary" },
              { t: "pt", x: 0, y: 0, label: "start" }, { t: "pt", x: a, y: c, label: "end" }] }),
            steps: [
              `The path is two segments, so ${M.v("W")} = ∫<sub>${C1}</sub> + ∫<sub>${C2}</sub>. On a straight horizontal or vertical piece only one of d${x}, d${y} is nonzero.`,
              `${seg1} = ${intg(0, n(hi1))} ${pw(g1, T)} d${t} = ${brk(ph(A1, T), 0, n(hi1))} = ${M.f(w1)}.`,
              `${seg2} = ${intg(0, n(hi2))} ${pw(g2, T)} d${t} = ${brk(ph(A2, T), 0, n(hi2))} = ${M.f(w2)}.`,
              `Add the pieces: ${M.v("W")} = ${M.f(w1)} + ${fp(w2)} = ${M.f(ans)} J.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: `${M.f(ans)} J`, answerInput: typed(ans),
            vals: { g1: pv(g1), g2: pv(g2), A1: pv(A1), A2: pv(A2), w1: fv(w1), w2: fv(w2), ans: fv(ans) },
            params: { P: pv(Pf), Q: pv(Qf), a, c, xFirst: xFirst ? 1 : 0 },
          };
        }
      },
    },

    // ---- V.line-flux Work, circulation & flux across a curve ------------------------------------------------
    "V.line-flux": {
      title: "Work, circulation, flux and wire mass",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const flux = r.chance(0.5);
            const a = r.int(-6, 6), c = r.int(-6, 6), x0 = r.int(-5, 5), y0 = r.int(-5, 5), x1 = r.int(-5, 5), y1 = r.int(-5, 5);
            if ((a === 0 && c === 0) || (x0 === x1 && y0 === y1)) continue;
            const dx = x1 - x0, dy = y1 - y0;
            const ans = flux ? a * dy - c * dx : a * dx + c * dy;
            if (ans === 0) continue;
            const A = `${M.v("A")}(${n(x0)}, ${n(y0)})`, B = `${M.v("B")}(${n(x1)}, ${n(y1)})`;
            const s = 2 / Math.hypot(a, c);
            const g = graph({ view: viewAround([[x0, y0], [x1, y1], [x0 + a * s, y0 + c * s]]), equal: true, items: [
              { t: "vec", a: [x0, y0], b: [x1, y1], role: "primary" }, { t: "vec", a: [x0, y0], b: [x0 + a * s, y0 + c * s], role: "highlight", label: flux ? "v" : "F" },
              { t: "pt", x: x0, y: y0, label: "A" }, { t: "pt", x: x1, y: y1, label: "B" }] });
            const param = `Parametrize the segment: ${vr}(${t}) = ${M.v("A")} + ${t}(${M.v("B")} − ${M.v("A")}), 0 ≤ ${t} ≤ 1, so ${vr}′(${t}) = ${M.v("B")} − ${M.v("A")} = (${n(dx)}, ${n(dy)}).`;
            if (!flux) {
              return {
                prompt: `A constant force ${vF} = (${n(a)}, ${n(c)}) newtons pushes an object in a straight line from ${A} to ${B} (meters). How much work does it do, in joules?`,
                graph: g,
                steps: [
                  param,
                  `${vF} · ${vr}′(${t}) = ${n(a)} · ${np(dx)} + ${np(c)} · ${np(dy)} = ${n(ans)}, the same for every ${t}.`,
                  `${M.v("W")} = ${intg(0, 1)} ${vF} · ${vr}′(${t}) d${t} = ${intg(0, 1)} ${n(ans)} d${t} = ${n(ans)} J.`,
                ],
                answer: { kind: "number", value: ans }, answerText: `${n(ans)} J`, answerInput: String(ans),
                vals: { dx, dy, ans }, params: { a, c, x0, y0, x1, y1, flux: 0 },
              };
            }
            return {
              prompt: `A thin sheet of water flows over flat ground with constant velocity ${vv} = (${n(a)}, ${n(c)}) m/s. Find the flux of ${vv} across the straight line from ${A} to ${B} (meters), counted positive from left to right as you walk from ${M.v("A")} to ${M.v("B")}. Give it in m²/s (volume per second per meter of depth).`,
              graph: g,
              steps: [
                param,
                `The normal pointing to the right of the direction of travel is ${vn} ‖${vr}′‖ = (${M.v("y")}′, −${M.v("x")}′), so the flux integrand is ${M.v("P")} ${M.v("y")}′ − ${M.v("Q")} ${M.v("x")}′ = ${n(a)} · ${np(dy)} − ${np(c)} · ${np(dx)} = ${n(ans)}.`,
                `Flux = ${intg(0, 1)} ${n(ans)} d${t} = ${n(ans)} m²/s.`,
              ],
              answer: { kind: "number", value: ans }, answerText: `${n(ans)} m²/s`, answerInput: String(ans),
              vals: { dx, dy, ans }, params: { a, c, x0, y0, x1, y1, flux: 1 },
            };
          }
        }
        if (level === 2) {
          // circulation or outward flux of a linear field around the circle of radius R
          for (;;) {
            const R = r.int(1, 3), a = r.int(-3, 3), b = r.int(-3, 3), c = r.int(-3, 3), d = r.int(-3, 3);
            if ((a === 0 && b === 0) || (c === 0 && d === 0)) continue;
            const flux = r.chance(0.5), RR2 = R * R;
            const coef = F(flux ? (a + d) * RR2 : (c - b) * RR2);
            if (coef.n === 0) continue;
            const Pf = P2([[a, 1, 0], [b, 0, 1]]), Qf = P2([[c, 1, 0], [d, 0, 1]]);
            const aR = a * R, bR = b * R, cR = c * R, dR = d * R;
            const Pc = lin([[aR, cosT], [bR, sinT]]), Qc = lin([[cR, cosT], [dR, sinT]]);
            const k1 = flux ? a * RR2 : (d - a) * RR2, k2 = flux ? (b + c) * RR2 : c * RR2, k3 = flux ? d * RR2 : -b * RR2;
            // flux: k1 cos² + k2 sin cos + k3 sin²;  circulation: k1 sin cos + k2 cos² + k3 sin²
            const expanded = flux ? lin([[k1, cos2T], [k2, scT], [k3, sin2T]]) : lin([[k1, scT], [k2, cos2T], [k3, sin2T]]);
            const piA = flux ? k1 : k2, piB = k3;
            const circle = R === 1 ? `${M.sup(x, 2)} + ${M.sup(y, 2)} = 1` : `${M.sup(x, 2)} + ${M.sup(y, 2)} = ${n(RR2)}`;
            const pts = range(0, 7).map((k) => [R * Math.cos((k * Math.PI) / 4), R * Math.sin((k * Math.PI) / 4)]);
            const L = R + 1.5;
            return {
              prompt: `Let ${vF}(${x}, ${y}) = ${fieldH([Pf, Qf], XY)}. Find the ${flux ? "outward flux of " + vF + " across" : "circulation of " + vF + " counterclockwise around"} the circle ${circle} by parametrizing the circle.`,
              graph: graph({ view: [-L, L, -L, L], equal: true, items: [
                { t: "circle", c: [0, 0], r: R, role: "primary" }, ...arrows(field2(Pf, Qf), pts, 0.6),
                { t: "vec", a: [R, -0.35], b: [R, 0.35], role: "highlight" }] }),
              steps: [
                `Parametrize counterclockwise: ${vr}(${t}) = (${kc(R, cosT)}, ${kc(R, sinT)}), 0 ≤ ${t} ≤ 2π, so ${M.v("x")}′ = −${kc(R, sinT)} and ${M.v("y")}′ = ${kc(R, cosT)}.`,
                `On the circle, ${M.v("P")} = ${Pc} and ${M.v("Q")} = ${Qc}.`,
                flux
                  ? `Outward flux integrand: ${M.v("P")} ${M.v("y")}′ − ${M.v("Q")} ${M.v("x")}′ = (${Pc})(${kc(R, cosT)}) + (${Qc})(${kc(R, sinT)}) = ${expanded}.`
                  : `Circulation integrand: ${M.v("P")} ${M.v("x")}′ + ${M.v("Q")} ${M.v("y")}′ = (${Pc})(−${kc(R, sinT)}) + (${Qc})(${kc(R, cosT)}) = ${expanded}.`,
                `Over a full turn, ${intg(0, "2π")} ${scT} d${t} = 0 and ${intg(0, "2π")} ${cos2T} d${t} = ${intg(0, "2π")} ${sin2T} d${t} = π.`,
                `So the ${flux ? "flux" : "circulation"} is ${piA !== 0 && piB !== 0 ? `${lin([[piA, "π"], [piB, "π"]], "")} = ` : ""}${piH(coef)}.`,
              ],
              answer: { kind: "number", value: coef.value * Math.PI }, answerText: piH(coef), answerInput: piIn(coef),
              vals: { RR2, aR, bR, cR, dR, k1, k2, k3, coef: fv(coef) },
              params: { R, a, b, c, d, flux: flux ? 1 : 0 },
            };
          }
        }
        // level 3: center of mass of a straight wire with linear density
        const dirs = [[3, 4], [4, 3], [6, 8], [8, 6], [0, 5], [5, 0]];
        for (;;) {
          const [p0, q0] = r.pick(dirs);
          const dx = p0 === 0 ? 0 : p0 * r.sign(), dy = q0 === 0 ? 0 : q0 * r.sign();
          const x0 = r.int(-3, 3), y0 = r.int(-3, 3), x1 = x0 + dx, y1 = y0 + dy;
          if (Math.abs(x1) > 8 || Math.abs(y1) > 8) continue;
          const a = r.int(-2, 2), c = r.int(-2, 2), k = r.int(1, 12);
          if (a === 0 && c === 0) continue;
          const rho = P2([[a, 1, 0], [c, 0, 1], [k, 0, 0]]);
          if (pval(rho, [x0, y0]).cmp(1) < 0 || pval(rho, [x1, y1]).cmp(1) < 0) continue;
          const useX = r.chance(0.5);
          if ((useX && dx === 0) || (!useX && dy === 0)) continue;   // the coordinate must vary along the wire
          const X = T1(x0, dx), Y = T1(y0, dy), L = Math.round(Math.hypot(dx, dy));
          const rt = pcomp(rho, [X, Y]), an0 = panti(rt, 0), I0 = pval(an0, [1]), mass = I0.mul(L);
          const W = useX ? X : Y, prod = pmul(W, rt), an1 = panti(prod, 0), I1 = pval(an1, [1]), mom = I1.mul(L);
          const ans = mom.div(mass);
          const cv = useX ? "x" : "y", bar = M.v(useX ? "x̄" : "ȳ"), sv = M.v("s"), rh = "ρ";
          return {
            prompt: `A thin straight wire runs from ${M.v("A")}(${n(x0)}, ${n(y0)}) to ${M.v("B")}(${n(x1)}, ${n(y1)}) (meters). Its linear density is ${rh}(${x}, ${y}) = ${ph(rho, XY)} kg/m. Find ${bar}, the ${M.v(cv)}-coordinate of its center of mass, in meters.`,
            graph: graph({ view: viewAround([[x0, y0], [x1, y1]]), equal: true, items: [
              { t: "seg", a: [x0, y0], b: [x1, y1], role: "primary" }, { t: "pt", x: x0, y: y0, label: "A" }, { t: "pt", x: x1, y: y1, label: "B" }] }),
            steps: [
              `Parametrize: ${vr}(${t}) = (${ph(X, T)}, ${ph(Y, T)}), 0 ≤ ${t} ≤ 1. The speed is ${M.sqrt(`${M.sup(np(dx), 2)} + ${M.sup(np(dy), 2)}`)} = ${n(L)}, so d${sv} = ${n(L)} d${t}.`,
              `Along the wire, ${rh}(${vr}(${t})) = ${ph(rt, T)}.`,
              `Mass: ${M.v("m")} = ∫<sub>${M.v("C")}</sub> ${rh} d${sv} = ${n(L)} ${intg(0, 1)} ${pw(rt, T)} d${t} = ${n(L)} · ${brk(ph(an0, T), 0, 1)} = ${n(L)} · ${fp(I0)} = ${M.f(mass)} kg.`,
              `Moment: ∫<sub>${M.v("C")}</sub> ${M.v(cv)} ${rh} d${sv} = ${n(L)} ${intg(0, 1)} ${pp(W, T)}${pp(rt, T)} d${t} = ${n(L)} ${intg(0, 1)} ${pw(prod, T)} d${t} = ${n(L)} · ${brk(ph(an1, T), 0, 1)} = ${n(L)} · ${fp(I1)} = ${M.f(mom)}.`,
              `${bar} = moment ÷ mass = ${M.f(mom)} ÷ ${M.f(mass)} = ${M.f(ans)} m.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: `${M.f(ans)} m`, answerInput: typed(ans),
            vals: { dx, dy, L, rt: pv(rt), an0: pv(an0), I0: fv(I0), mass: fv(mass), prod: pv(prod), an1: pv(an1), I1: fv(I1), mom: fv(mom), ans: fv(ans) },
            params: { x0, y0, x1, y1, rho: pv(rho), useX: useX ? 1 : 0 },
          };
        }
      },
    },

    // ---- V.ftli Fundamental theorem for line integrals -----------------------------------------------------
    "V.ftli": {
      title: "Fundamental theorem for line integrals",
      generate(r, level) {
        for (;;) {
          const A = [r.int(-3, 3), r.int(-3, 3)], B = [r.int(-3, 3), r.int(-3, 3)];
          if (A[0] === B[0] && A[1] === B[1]) continue;
          const fpot = level === 1 ? rpoly(r, 2, 2, 1, 3, 3) : rpoly(r, 2, r.int(2, 3), 2, 3, 3);
          const Pf = pdiff(fpot, 0), Qf = pdiff(fpot, 1);
          if (isZero(Pf) || isZero(Qf)) continue;
          const fA = pval(fpot, A), fB = pval(fpot, B), work = fB.sub(fA);
          if (work.n === 0) continue;
          const path = bentPath(A, B, r.pick([-0.45, 0.45]));
          const g = graph({ view: viewAround([A, B, path.C], 1.2), equal: true, items: [
            ...path.items, { t: "pt", x: A[0], y: A[1], label: "A" }, { t: "pt", x: B[0], y: B[1], label: "B" }] });
          const Ah = `${M.v("A")}(${n(A[0])}, ${n(A[1])})`, Bh = `${M.v("B")}(${n(B[0])}, ${n(B[1])})`;
          const evalSteps = (name) => [
            `${name}(${M.v("B")}) = ${name}(${n(B[0])}, ${n(B[1])}) = ${substH(fpot, B)} = ${M.f(fB)}.`,
            `${name}(${M.v("A")}) = ${name}(${n(A[0])}, ${n(A[1])}) = ${substH(fpot, A)} = ${M.f(fA)}.`,
          ];
          if (level === 1) {
            return {
              prompt: `Let ${M.v("f")}(${x}, ${y}) = ${ph(fpot, XY)} and ${vF} = ${nab}${M.v("f")}. Evaluate ${M.eq(`∫<sub>${M.v("C")}</sub> ${vF} · d${vr}`)} where ${M.v("C")} is the curve shown, from ${Ah} to ${Bh}.`,
              graph: g,
              steps: [
                `${vF} is a gradient, so the fundamental theorem for line integrals applies: the path does not matter and ∫<sub>${M.v("C")}</sub> ${nab}${M.v("f")} · d${vr} = ${M.v("f")}(${M.v("B")}) − ${M.v("f")}(${M.v("A")}).`,
                ...evalSteps(M.v("f")),
                `∫<sub>${M.v("C")}</sub> ${vF} · d${vr} = ${M.f(fB)} − ${fp(fA)} = ${M.f(work)}.`,
              ],
              answer: { kind: "number", value: work.value }, answerText: M.f(work), answerInput: typed(work),
              vals: { fA: fv(fA), fB: fv(fB), work: fv(work) }, params: { f: pv(fpot), A, B },
            };
          }
          const pot = potential2(Pf, Qf);
          const Py = pdiff(Pf, 1), Qx = pdiff(Qf, 0);
          const test = `${pd("P", "y")} = ${ph(Py, XY)} and ${pd("Q", "x")} = ${ph(Qx, XY)} agree, and ${vF} is a polynomial field on the whole plane (no holes), so ${vF} is conservative: ${vF} = ${nab}${phi} for some ${phi}.`;
          if (level === 2) {
            return {
              prompt: `Let ${vF}(${x}, ${y}) = ${fieldH([Pf, Qf], XY)}. Evaluate ${M.eq(`∫<sub>${M.v("C")}</sub> ${vF} · d${vr}`)} where ${M.v("C")} is the curve shown, from ${Ah} to ${Bh}.`,
              graph: g,
              steps: [
                test,
                ...potential2Steps(Pf, Qf, pot),
                `By the fundamental theorem for line integrals, the integral is ${phi}(${M.v("B")}) − ${phi}(${M.v("A")}), whatever the path.`,
                ...evalSteps(phi),
                `∫<sub>${M.v("C")}</sub> ${vF} · d${vr} = ${M.f(fB)} − ${fp(fA)} = ${M.f(work)}.`,
              ],
              answer: { kind: "number", value: work.value }, answerText: M.f(work), answerInput: typed(work),
              vals: { Py: pv(Py), Qx: pv(Qx), ...pot2Vals(pot), fA: fv(fA), fB: fv(fB), work: fv(work) },
              params: { P: pv(Pf), Q: pv(Qf), A, B },
            };
          }
          // level 3: kinetic energy from the work–energy theorem
          const KA = r.int(5, 40), KB = work.add(KA);
          if (KB.cmp(0) <= 0) continue;
          const K = (s) => `${M.v("K")}<sub>${s}</sub>`;
          return {
            prompt: `A particle moves through the force field ${vF}(${x}, ${y}) = ${fieldH([Pf, Qf], XY)} (newtons, with ${x} and ${y} in meters) along the curved path shown, from ${Ah} to ${Bh}. No other force does work on it. Its kinetic energy at ${M.v("A")} is ${n(KA)} J. What is its kinetic energy at ${M.v("B")}, in joules?`,
            graph: g,
            steps: [
              `Work–energy theorem: ${K("B")} = ${K("A")} + ${M.v("W")}, with ${M.v("W")} = ∫<sub>${M.v("C")}</sub> ${vF} · d${vr}.`,
              test,
              ...potential2Steps(Pf, Qf, pot),
              `${M.v("W")} = ${phi}(${M.v("B")}) − ${phi}(${M.v("A")}), by the fundamental theorem for line integrals.`,
              ...evalSteps(phi),
              `${M.v("W")} = ${M.f(fB)} − ${fp(fA)} = ${M.f(work)} J, so ${K("B")} = ${n(KA)} + ${fp(work)} = ${M.f(KB)} J.`,
            ],
            answer: { kind: "number", value: KB.value }, answerText: `${M.f(KB)} J`, answerInput: typed(KB),
            vals: { Py: pv(Py), Qx: pv(Qx), ...pot2Vals(pot), fA: fv(fA), fB: fv(fB), work: fv(work), KB: fv(KB) },
            params: { P: pv(Pf), Q: pv(Qf), A, B, KA },
          };
        }
      },
    },

    // ---- V.9 Conservative fields & potentials ---------------------------------------------------------------
    "V.9": {
      title: "Conservative fields and potentials",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const fpot = rpoly(r, 2, 2, 2, 3, 4);
            let Pf = pdiff(fpot, 0), Qf = pdiff(fpot, 1);
            if (isZero(Pf) || isZero(Qf)) continue;
            const cons = r.chance(0.5);
            if (!cons) {
              // add a term with an x in it to Q: Q_x changes, P_y does not
              const e = r.pick([[1, 0], [1, 1], [2, 0], [1, 2], [2, 1]]);
              Qf = padd(Qf, P2([[r.nonzero(-3, 3), ...e]]));
            }
            const Py = pdiff(Pf, 1), Qx = pdiff(Qf, 0), same = isZero(psub(Py, Qx));
            if (same !== cons) continue;
            const options = ["Conservative", "Not conservative"], index = cons ? 0 : 1;
            return {
              prompt: `Is the field ${vF}(${x}, ${y}) = ${fieldH([Pf, Qf], XY)} conservative on the whole plane?`,
              steps: [
                `The plane has no holes, so a smooth field ${vF} = (${M.v("P")}, ${M.v("Q")}) is conservative exactly when ${pd("P", "y")} = ${pd("Q", "x")} everywhere.`,
                `Differentiate ${M.v("P")} in ${y}: ${pd("P", "y")} = ${ph(Py, XY)}.`,
                `Differentiate ${M.v("Q")} in ${x}: ${pd("Q", "x")} = ${ph(Qx, XY)}.`,
                cons
                  ? `They agree, so ${vF} is conservative. (Indeed ${vF} = ${nab}${phi} with ${phi} = ${ph(fpot, XY)}.)`
                  : `They differ, so ${vF} is not conservative: its circulation around some closed loops is not 0.`,
              ],
              answer: { kind: "choice", options, index }, answerText: options[index],
              vals: { Py: pv(Py), Qx: pv(Qx), ...(cons ? { phi: pv(fpot) } : {}) },
              params: { P: pv(Pf), Q: pv(Qf), cons: cons ? 1 : 0 },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const fpot = rpoly(r, 2, r.int(2, 3), 2, 3, 4);
            const Pf = pdiff(fpot, 0), Qf = pdiff(fpot, 1);
            if (isZero(Pf) || isZero(Qf) || !dependsOn(fpot, 0) || !dependsOn(fpot, 1)) continue;
            const pot = potential2(Pf, Qf), Py = pdiff(Pf, 1), Qx = pdiff(Qf, 0);
            return {
              prompt: `The field ${vF}(${x}, ${y}) = ${fieldH([Pf, Qf], XY)} is conservative. Find the potential ${phi}(${x}, ${y}) with ${nab}${phi} = ${vF} and ${phi}(0, 0) = 0.`,
              steps: [
                `Check first: ${pd("P", "y")} = ${ph(Py, XY)} and ${pd("Q", "x")} = ${ph(Qx, XY)} agree.`,
                ...potential2Steps(Pf, Qf, pot),
                `It has no constant term, so ${phi}(0, 0) = 0 as required.`,
              ],
              answer: { kind: "expr", expr: pexpr(pot.f, XY), vars: XY }, answerText: `${phi}(${x}, ${y}) = ${ph(pot.f, XY)}`, answerInput: ptyped(pot.f, XY),
              vals: { Py: pv(Py), Qx: pv(Qx), ...pot2Vals(pot) }, params: { P: pv(Pf), Q: pv(Qf) },
            };
          }
        }
        // level 3: a potential in three dimensions
        for (;;) {
          const fpot = rpoly(r, 3, 3, 2, 3, 3);
          const Pf = pdiff(fpot, 0), Qf = pdiff(fpot, 1), Rf = pdiff(fpot, 2);
          if (isZero(Pf) || isZero(Qf) || isZero(Rf)) continue;
          const cu = curlOf(Pf, Qf, Rf);
          const I = panti(Pf, 0), Iy = pdiff(I, 1), h1 = psub(Qf, Iy), H1 = panti(h1, 1), S = padd(I, H1), Sz = pdiff(S, 2), h2 = psub(Rf, Sz), H2 = panti(h2, 2), f = padd(S, H2);
          const g = M.v("g"), k = M.v("k");
          return {
            prompt: `Show that ${vF}(${x}, ${y}, ${z}) = ${fieldH([Pf, Qf, Rf], XYZ)} is conservative, and find its potential ${phi}(${x}, ${y}, ${z}) with ${phi}(0, 0, 0) = 0.`,
            steps: [
              `Test the three cross-partial pairs: ${pd("R", "y")} = ${ph(cu.Ry, XYZ)} and ${pd("Q", "z")} = ${ph(cu.Qz, XYZ)}; ${pd("P", "z")} = ${ph(cu.Pz, XYZ)} and ${pd("R", "x")} = ${ph(cu.Rx, XYZ)}; ${pd("Q", "x")} = ${ph(cu.Qx, XYZ)} and ${pd("P", "y")} = ${ph(cu.Py, XYZ)}. Each pair agrees, so ${nab} × ${vF} = ${v0} on all of space and ${vF} is conservative.`,
              `Integrate ${M.v("P")} in ${x}: ${phi} = ∫ ${pw(Pf, XYZ)} d${x} = ${ph(I, XYZ)} + ${g}(${y}, ${z}).`,
              `Match ${M.v("Q")}: ${phi}<sub>${y}</sub> = ${isZero(Iy) ? "" : `${ph(Iy, XYZ)} + `}${g}<sub>${y}</sub> = ${ph(Qf, XYZ)}, so ${g}<sub>${y}</sub> = ${ph(h1, XYZ)}` +
                (isZero(h1) ? ` and ${g} = ${k}(${z}).` : ` and ${g} = ${ph(H1, XYZ)} + ${k}(${z}).`),
              `Match ${M.v("R")}: ${phi}<sub>${z}</sub> = ${isZero(Sz) ? "" : `${ph(Sz, XYZ)} + `}${k}′(${z}) = ${ph(Rf, XYZ)}, so ${k}′(${z}) = ${ph(h2, XYZ)}` +
                (isZero(h2) ? ` and ${k} is a constant, 0.` : ` and ${k}(${z}) = ${ph(H2, XYZ)}.`),
              `${phi}(${x}, ${y}, ${z}) = ${ph(f, XYZ)}, which is 0 at the origin.`,
            ],
            answer: { kind: "expr", expr: pexpr(f, XYZ), vars: XYZ }, answerText: `${phi}(${x}, ${y}, ${z}) = ${ph(f, XYZ)}`, answerInput: ptyped(f, XYZ),
            vals: { Ry: pv(cu.Ry), Qz: pv(cu.Qz), Pz: pv(cu.Pz), Rx: pv(cu.Rx), Qx: pv(cu.Qx), Py: pv(cu.Py), I: pv(I), Iy: pv(Iy), h1: pv(h1), H1: pv(H1), Sz: pv(Sz), h2: pv(h2), H2: pv(H2), phi: pv(f) },
            params: { P: pv(Pf), Q: pv(Qf), R: pv(Rf) },
          };
        }
      },
    },

    // ---- V.10 Divergence & curl -----------------------------------------------------------------------------
    "V.10": {
      title: "Divergence and curl",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const comps = [0, 1, 2].map(() => rpoly(r, 3, r.int(1, 2), 1, 3, 4));
            const [Px, Qy, Rz] = [pdiff(comps[0], 0), pdiff(comps[1], 1), pdiff(comps[2], 2)];
            const div = padd(Px, Qy, Rz);
            if (isZero(div) || [Px, Qy, Rz].filter(isZero).length > 1) continue;
            return {
              prompt: `Find the divergence of ${M.eq(`${vF}(${x}, ${y}, ${z}) = ${fieldH(comps, XYZ)}`)}`,
              steps: [
                `${nab} · ${vF} = ${pd("P", "x")} + ${pd("Q", "y")} + ${pd("R", "z")}: differentiate each component in its own variable, holding the others fixed.`,
                `${pd("P", "x")} = ${ph(Px, XYZ)}, ${pd("Q", "y")} = ${ph(Qy, XYZ)}, ${pd("R", "z")} = ${ph(Rz, XYZ)}.`,
                `Add: ${nab} · ${vF} = ${ph(div, XYZ)}.`,
              ],
              answer: { kind: "expr", expr: pexpr(div, XYZ), vars: XYZ }, answerText: `${nab} · ${vF} = ${ph(div, XYZ)}`, answerInput: ptyped(div, XYZ),
              vals: { Px: pv(Px), Qy: pv(Qy), Rz: pv(Rz), div: pv(div) }, params: { P: pv(comps[0]), Q: pv(comps[1]), R: pv(comps[2]) },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const comps = [0, 1, 2].map(() => rpoly(r, 3, 2, 1, 2, 3));
            const p0 = [r.int(-2, 2), r.int(-2, 2), r.int(-2, 2)];
            const cu = curlOf(...comps), at = cu.c.map((c) => pval(c, p0));
            if (at.every((q) => q.n === 0) || cu.c.some(isZero)) continue;
            const ph3 = `(${n(p0[0])}, ${n(p0[1])}, ${n(p0[2])})`;
            return {
              prompt: `Let ${vF}(${x}, ${y}, ${z}) = ${fieldH(comps, XYZ)}. Find ${nab} × ${vF} at the point ${ph3}.`,
              steps: [
                `Expand the determinant with rows (${bold("i")}, ${bold("j")}, ${bold("k")}), (∂<sub>${x}</sub>, ∂<sub>${y}</sub>, ∂<sub>${z}</sub>), (${M.v("P")}, ${M.v("Q")}, ${M.v("R")}): ${curlH(cu)}.`,
                `Substitute ${ph3}: first ${subEq(cu.c[0], p0, at[0])}${M.f(at[0])}, second ${subEq(cu.c[1], p0, at[1])}${M.f(at[1])}, third ${subEq(cu.c[2], p0, at[2])}${M.f(at[2])}.`,
                `${nab} × ${vF}${ph3} = ${vecQ(at)}.`,
              ],
              answer: { kind: "point", value: at.map((q) => q.value) }, answerText: vecQ(at), answerInput: `(${at.map(typed).join(", ")})`,
              vals: { Ry: pv(cu.Ry), Qz: pv(cu.Qz), Pz: pv(cu.Pz), Rx: pv(cu.Rx), Qx: pv(cu.Qx), Py: pv(cu.Py), c1: pv(cu.c[0]), c2: pv(cu.c[1]), c3: pv(cu.c[2]), at: at.map(fv) },
              params: { P: pv(comps[0]), Q: pv(comps[1]), R: pv(comps[2]), p: p0 },
            };
          }
        }
        if (r.chance(0.5)) {
          // level 3a: the constant that makes a field incompressible
          for (;;) {
            const perm = r.shuffle([0, 1, 2]);   // perm[j]: the variable playing role j
            const a = r.nonzero(-3, 3), c = r.nonzero(-3, 3), s = 2 * a + c;
            if (s === 0) continue;
            const e = (pairs) => { const out = [0, 0, 0]; for (const [role, w] of pairs) out[perm[role]] += w; return out; };
            const not = (role) => (ex) => ex[perm[role]] === 0;
            const extra = [0, 1, 2].map((role) => (r.chance(0.8) ? rpoly(r, 3, 1, 1, 2, 3, not(role)) : cst(3, 0)));
            const comps = [null, null, null], kMono = mono(3, 1, e([[0, 1], [1, 1]]));
            comps[perm[0]] = padd(mono(3, a, e([[0, 2]])), extra[0]);
            comps[perm[1]] = extra[1];   // plus k · v0 v1, shown separately
            comps[perm[2]] = padd(mono(3, c, e([[0, 1], [2, 1]])), extra[2]);
            const kname = M.v("k");
            const withK = (p) => `${kname}${ph(kMono, XYZ)}${isZero(p) ? "" : ph(p, XYZ).startsWith("−") ? ` − ${ph(pscale(p, -1), XYZ)}` : ` + ${ph(p, XYZ)}`}`;
            const shown = comps.map((p, i) => (i === perm[1] ? withK(p) : ph(p, XYZ)));
            const names = ["P", "Q", "R"], vnames = XYZ;
            const d0 = pdiff(comps[perm[0]], perm[0]), d2 = pdiff(comps[perm[2]], perm[2]);
            const v0n = M.v(vnames[perm[0]]);
            const k = -s;
            const partials = [perm[0], perm[1], perm[2]].map((i, role) => `${pd(names[i], vnames[i])} = ${role === 0 ? ph(d0, XYZ) : role === 1 ? `${kname}${v0n}` : ph(d2, XYZ)}`);
            return {
              prompt: `For which constant ${kname} is ${M.eq(`${vF}(${x}, ${y}, ${z}) = (${shown.join(", ")})`)} incompressible, that is, ${nab} · ${vF} = 0 at every point?`,
              steps: [
                `${nab} · ${vF} = ${pd("P", "x")} + ${pd("Q", "y")} + ${pd("R", "z")}. Each component is differentiated only in its own variable, so the other terms drop out.`,
                `${partials.join(", ")}.`,
                `${nab} · ${vF} = ${ph(d0, XYZ)} + ${kname}${v0n}${ph(d2, XYZ).startsWith("−") ? ` − ${ph(pscale(d2, -1), XYZ)}` : ` + ${ph(d2, XYZ)}`} = (${kname}${M.term(s, "")})${v0n}.`,
                `This is 0 for every ${v0n} only when ${kname}${M.term(s, "")} = 0, so ${kname} = ${n(k)}.`,
              ],
              answer: { kind: "number", value: k }, answerText: `${kname} = ${n(k)}`, answerInput: String(k),
              vals: { d0: pv(d0), d2: pv(d2), s, k },
              params: { P: pv(comps[0]), Q: pv(comps[1]), R: pv(comps[2]), kMono: pv(kMono), kComp: perm[1] },
            };
          }
        }
        // level 3b: paddle-wheel spin rate from the 2-D curl
        for (;;) {
          const Pf = rpoly(r, 2, 2, 1, 2, 3), Qf = rpoly(r, 2, 2, 1, 2, 3);
          const p0 = [r.int(-2, 2), r.int(-2, 2)];
          const Qx = pdiff(Qf, 0), Py = pdiff(Pf, 1), cz = psub(Qx, Py), cv = pval(cz, p0), w = cv.div(2);
          if (cv.n === 0 || isConst(cz)) continue;
          return {
            prompt: `Water in a shallow pond moves with velocity ${vv}(${x}, ${y}) = ${fieldH([Pf, Qf], XY)} m/s (${x}, ${y} in meters). A small paddle wheel with a vertical axle is placed at (${n(p0[0])}, ${n(p0[1])}). Find its angular velocity in rad/s (positive means counterclockwise).`,
            graph: graph({ view: [p0[0] - 2, p0[0] + 2, p0[1] - 2, p0[1] + 2], equal: true, items: [
              ...arrows(field2(Pf, Qf), gridPts(range(p0[0] - 1.5, p0[0] + 1.5, 0.75), range(p0[1] - 1.5, p0[1] + 1.5, 0.75)), 0.55),
              { t: "pt", x: p0[0], y: p0[1], label: "wheel" }] }),
            steps: [
              `A paddle wheel spins at half the local curl: ω = ${M.frac("1", "2")}(${nab} × ${vv}) · ${vk} = ${M.frac("1", "2")}(${pd("Q", "x")} − ${pd("P", "y")}).`,
              `${pd("Q", "x")} = ${ph(Qx, XY)} and ${pd("P", "y")} = ${ph(Py, XY)}, so ${pd("Q", "x")} − ${pd("P", "y")} = ${ph(cz, XY)}.`,
              `At (${n(p0[0])}, ${n(p0[1])}): ${substH(cz, p0)} = ${M.f(cv)}.`,
              `ω = ${M.f(cv)} ÷ 2 = ${M.f(w)} rad/s, so the wheel turns ${w.n > 0 ? "counterclockwise" : "clockwise"}.`,
            ],
            answer: { kind: "number", value: w.value }, answerText: `${M.f(w)} rad/s`, answerInput: typed(w),
            vals: { Qx: pv(Qx), Py: pv(Py), cz: pv(cz), cv: fv(cv), w: fv(w) }, params: { P: pv(Pf), Q: pv(Qf), p: p0 },
          };
        }
      },
    },

    // ---- V.identities Product rules, curl of gradient, divergence of curl ---------------------------------------
    "V.identities": {
      title: "Vector identities",
      generate(r, level) {
        if (level <= 2) {
          for (;;) {
            const f = rpoly(r, 3, 2, 1, 2, 3);
            const comps = [0, 1, 2].map(() => rpoly(r, 3, 1, 1, 2, 3));
            const p0 = [r.int(-2, 2), r.int(-2, 2), r.int(-2, 2)];
            const fp0 = pval(f, p0);
            const grad = [0, 1, 2].map((i) => pdiff(f, i)), gp = grad.map((g) => pval(g, p0));
            const Fp = comps.map((c) => pval(c, p0));
            const ph3 = `(${n(p0[0])}, ${n(p0[1])}, ${n(p0[2])})`, fn = M.v("f");
            if (fp0.n === 0 || gp.every((q) => q.n === 0) || Fp.every((q) => q.n === 0)) continue;
            const shared = [
              `${fn}${ph3} = ${substH(f, p0)} = ${M.f(fp0)}.`,
              `${nab}${fn} = ${fieldH(grad, XYZ)}, so ${nab}${fn}${ph3} = ${vecQ(gp)}; and ${vF}${ph3} = ${vecQ(Fp)}.`,
            ];
            if (level === 1) {
              const div = padd(pdiff(comps[0], 0), pdiff(comps[1], 1), pdiff(comps[2], 2)), dv = pval(div, p0);
              const dot = gp[0].mul(Fp[0]).add(gp[1].mul(Fp[1])).add(gp[2].mul(Fp[2])), fd = fp0.mul(dv), ans = fd.add(dot);
              if (ans.n === 0) continue;
              return {
                prompt: `Let ${fn}(${x}, ${y}, ${z}) = ${ph(f, XYZ)} and ${vF} = ${fieldH(comps, XYZ)}. Use the product rule to find ${nab} · (${fn}${vF}) at ${ph3}.`,
                steps: [
                  `Product rule: ${nab} · (${fn}${vF}) = ${fn} (${nab} · ${vF}) + ${nab}${fn} · ${vF}.`,
                  ...shared,
                  `${nab} · ${vF} = ${pd("P", "x")} + ${pd("Q", "y")} + ${pd("R", "z")} = ${ph(div, XYZ)}, which is ${M.f(dv)} at ${ph3}.`,
                  `${nab}${fn} · ${vF} = ${M.f(gp[0])} · ${fp(Fp[0])} + ${fp(gp[1])} · ${fp(Fp[1])} + ${fp(gp[2])} · ${fp(Fp[2])} = ${M.f(dot)}.`,
                  `${nab} · (${fn}${vF}) = ${M.f(fp0)} · ${fp(dv)} + ${fp(dot)} = ${M.f(fd)} + ${fp(dot)} = ${M.f(ans)}.`,
                ],
                answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: typed(ans),
                vals: { fp0: fv(fp0), grad: grad.map(pv), gp: gp.map(fv), Fp: Fp.map(fv), div: pv(div), dv: fv(dv), dot: fv(dot), fd: fv(fd), ans: fv(ans) },
                params: { f: pv(f), P: pv(comps[0]), Q: pv(comps[1]), R: pv(comps[2]), p: p0 },
              };
            }
            const cu = curlOf(...comps), cp = cu.c.map((c) => pval(c, p0));
            const fc = cp.map((q) => fp0.mul(q)), cr = cross(gp, Fp), ans = fc.map((q, i) => q.add(cr[i]));
            if (ans.every((q) => q.n === 0) || cp.every((q) => q.n === 0) || cr.every((q) => q.n === 0)) continue;
            return {
              prompt: `Let ${fn}(${x}, ${y}, ${z}) = ${ph(f, XYZ)} and ${vF} = ${fieldH(comps, XYZ)}. Use the product rule to find ${nab} × (${fn}${vF}) at ${ph3}.`,
              steps: [
                `Product rule: ${nab} × (${fn}${vF}) = ${fn} (${nab} × ${vF}) + ${nab}${fn} × ${vF} (keep the order in the cross product).`,
                ...shared,
                `${curlH(cu)}; at ${ph3} this is ${vecQ(cp)}.`,
                `${nab}${fn} × ${vF} = ${crossH(gp, Fp)} = ${vecQ(cr)}.`,
                `${nab} × (${fn}${vF}) = ${M.f(fp0)} · ${vecQ(cp)} + ${vecQ(cr)} = ${vecQ(fc)} + ${vecQ(cr)} = ${vecQ(ans)}.`,
              ],
              answer: { kind: "point", value: ans.map((q) => q.value) }, answerText: vecQ(ans), answerInput: `(${ans.map(typed).join(", ")})`,
              vals: { fp0: fv(fp0), grad: grad.map(pv), gp: gp.map(fv), Fp: Fp.map(fv), Ry: pv(cu.Ry), Qz: pv(cu.Qz), Pz: pv(cu.Pz), Rx: pv(cu.Rx), Qx: pv(cu.Qx), Py: pv(cu.Py), curl: cu.c.map(pv), cp: cp.map(fv), fc: fc.map(fv), cr: cr.map(fv), ans: ans.map(fv) },
              params: { f: pv(f), P: pv(comps[0]), Q: pv(comps[1]), R: pv(comps[2]), p: p0 },
            };
          }
        }
        // level 3: which field cannot be a curl (div ≠ 0) / a gradient (curl ≠ 0)?
        const curlKind = r.chance(0.5);
        for (;;) {
          const good = [];
          for (let i = 0; i < 3; i++) {
            if (curlKind) {
              const A = [0, 1, 2].map(() => rpoly(r, 3, 1, 2, 2, 2));
              good.push(curlOf(...A).c);
            } else {
              const g = rpoly(r, 3, 2, 2, 3, 2);
              good.push([0, 1, 2].map((j) => pdiff(g, j)));
            }
          }
          const bad = [0, 1, 2].map(() => rpoly(r, 3, 1, 1, 2, 3));
          const idx = r.int(0, 3), fields = good.slice();
          fields.splice(idx, 0, bad);
          if (fields.some((fl) => fl.filter(isZero).length > 1)) continue;
          const divs = fields.map((fl) => padd(pdiff(fl[0], 0), pdiff(fl[1], 1), pdiff(fl[2], 2)));
          const curls = fields.map((fl) => curlOf(...fl).c);
          const fails = curlKind ? divs.map((d) => !isZero(d)) : curls.map((c) => c.some((q) => !isZero(q)));
          if (fails.filter(Boolean).length !== 1 || !fails[idx]) continue;
          const options = fields.map((fl) => fieldH(fl, XYZ));
          if (new Set(options).size !== 4) continue;
          const L = ["A", "B", "C", "D"];
          const steps = curlKind
            ? [
              `A curl field always has zero divergence, ${nab} · (${nab} × ${bold("G")}) = 0, so a field with nonzero divergence cannot be a curl. Compute ${nab} · ${vF} = ${pd("P", "x")} + ${pd("Q", "y")} + ${pd("R", "z")} for each.`,
              ...fields.map((fl, i) => `${L[i]}: ${ph(pdiff(fl[0], 0), XYZ)} + ${pp(pdiff(fl[1], 1), XYZ)} + ${pp(pdiff(fl[2], 2), XYZ)} = ${ph(divs[i], XYZ)}.`),
              `Only ${L[idx]} has nonzero divergence, so ${L[idx]} cannot be the curl of any field.`,
            ]
            : [
              `A gradient field always has zero curl, ${nab} × (${nab}${M.v("f")}) = ${v0}, so a field with nonzero curl cannot be a gradient. Compute ${nab} × ${vF} = (${pd("R", "y")} − ${pd("Q", "z")}, ${pd("P", "z")} − ${pd("R", "x")}, ${pd("Q", "x")} − ${pd("P", "y")}) for each.`,
              ...fields.map((fl, i) => `${L[i]}: ${curlH(curlOf(...fl))}.`),
              `Only ${L[idx]} has nonzero curl, so ${L[idx]} is not a gradient field.`,
            ];
          return {
            prompt: curlKind
              ? `Which of these fields cannot be the curl of any vector field, ${vF} = ${nab} × ${bold("G")}?`
              : `Which of these fields cannot be written as ${vF} = ${nab}${M.v("f")} for any scalar ${M.v("f")}?`,
            steps,
            answer: { kind: "choice", options, index: idx }, answerText: options[idx],
            vals: curlKind ? { divs: divs.map(pv), dparts: fields.map((fl) => fl.map((c, i) => pv(pdiff(c, i)))) }
              : { curls: curls.map((c) => c.map(pv)), cparts: fields.map((fl) => { const cu = curlOf(...fl); return [cu.Ry, cu.Qz, cu.Pz, cu.Rx, cu.Qx, cu.Py].map(pv); }) },
            params: { fields: fields.map((fl) => fl.map(pv)), curlKind: curlKind ? 1 : 0 },
          };
        }
      },
    },

    // ---- V.11 Green's theorem --------------------------------------------------------------------------------
    "V.11": {
      title: "Green’s theorem",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.35)) {
            // area of an ellipse from the line integral
            const a = r.int(1, 6), c = r.intExcept(1, 6, a), ab = a * c;
            return {
              prompt: `Use Green’s theorem to find the area enclosed by the ellipse ${x} = ${kc(a, cosT)}, ${y} = ${kc(c, sinT)}, 0 ≤ ${t} ≤ 2π.`,
              graph: graph({ view: [-7, 7, -7, 7], equal: true, items: [...curve((s) => a * Math.cos(s), (s) => c * Math.sin(s), 0, 2 * Math.PI, 48)] }),
              steps: [
                `With ${M.v("P")} = −${M.frac(y, "2")} and ${M.v("Q")} = ${M.frac(x, "2")}, ${pd("Q", "x")} − ${pd("P", "y")} = 1, so Green’s theorem gives Area = ${M.frac("1", "2")}∮ (${x} d${y} − ${y} d${x}).`,
                `d${x} = −${kc(a, sinT)} d${t} and d${y} = ${kc(c, cosT)} d${t}.`,
                `${x} d${y} − ${y} d${x} = (${kc(a, cosT)})(${kc(c, cosT)}) d${t} + (${kc(c, sinT)})(${kc(a, sinT)}) d${t} = ${n(ab)}(${cos2T} + ${sin2T}) d${t} = ${n(ab)} d${t}.`,
                `Area = ${M.frac("1", "2")} ${intg(0, "2π")} ${n(ab)} d${t} = ${M.frac("1", "2")} · ${n(ab)} · 2π = ${piH(ab)}.`,
              ],
              answer: { kind: "number", value: ab * Math.PI }, answerText: piH(ab), answerInput: piIn(ab),
              vals: { ab }, params: { a, c, ellipse: 1 },
            };
          }
          for (;;) {
            const al = r.int(-4, 4), be = r.int(-4, 4), k = be - al;
            if (k === 0) continue;
            const w = r.int(1, 5), h = r.int(1, 5), x0 = r.int(-2, 2), y0 = r.int(-2, 2), area = w * h, ans = k * area;
            const Pf = padd(P2([[al, 0, 1]]), r.chance(0.7) ? P2([[r.nonzero(-3, 3), r.int(2, 3), 0]]) : cst(2, 0));
            const Qf = padd(P2([[be, 1, 0]]), r.chance(0.7) ? P2([[r.nonzero(-3, 3), 0, r.int(2, 3)]]) : cst(2, 0));
            const Qx = pdiff(Qf, 0), Py = pdiff(Pf, 1);
            return {
              prompt: `Use Green’s theorem to evaluate ${M.eq(`∮<sub>${M.v("C")}</sub> (${ph(Pf, XY)}) d${x} + (${ph(Qf, XY)}) d${y}`)} where ${M.v("C")} is the boundary of the rectangle ${n(x0)} ≤ ${x} ≤ ${n(x0 + w)}, ${n(y0)} ≤ ${y} ≤ ${n(y0 + h)}, traversed counterclockwise.`,
              graph: graph({ view: [x0 - 1.5, x0 + w + 1.5, y0 - 1.5, y0 + h + 1.5], equal: true, items: [
                { t: "poly", p: [[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]], role: "primary" },
                { t: "vec", a: [x0 + w / 2 - 0.4, y0], b: [x0 + w / 2 + 0.4, y0], role: "highlight" }] }),
              steps: [
                `${M.v("C")} is closed, counterclockwise, and the field is a polynomial, so ∮ ${M.v("P")} d${x} + ${M.v("Q")} d${y} = ∬<sub>${M.v("D")}</sub> (${pd("Q", "x")} − ${pd("P", "y")}) d${M.v("A")}.`,
                `${pd("Q", "x")} = ${ph(Qx, XY)} and ${pd("P", "y")} = ${ph(Py, XY)}, so ${pd("Q", "x")} − ${pd("P", "y")} = ${n(be)} − ${np(al)} = ${n(k)}, a constant.`,
                `∬<sub>${M.v("D")}</sub> ${n(k)} d${M.v("A")} = ${n(k)} × area = ${n(k)} · (${n(w)} · ${n(h)}) = ${n(ans)}.`,
              ],
              answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
              vals: { x1: x0 + w, y1: y0 + h, w, h, k, area, ans }, params: { P: pv(Pf), Q: pv(Qf), x0, y0, x1: x0 + w, y1: y0 + h, ellipse: 0 },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const Pf = rpoly(r, 2, 2, 1, 3, 3), Qf = rpoly(r, 2, 2, 1, 3, 3);
            const flux = r.chance(0.5), a = r.int(1, 3), c = r.int(1, 3);
            const d1 = flux ? pdiff(Pf, 0) : pdiff(Qf, 0), d2 = flux ? pdiff(Qf, 1) : pdiff(Pf, 1);
            const g = flux ? padd(d1, d2) : psub(d1, d2);
            if (isZero(g) || isConst(g)) continue;
            const inner = pdef(g, 1, 0, c), A2 = panti(inner, 0), ans = pval(A2, [a, 0]);
            if (ans.n === 0) continue;
            return {
              prompt: `Let ${vF}(${x}, ${y}) = ${fieldH([Pf, Qf], XY)} and let ${M.v("C")} be the boundary of the rectangle 0 ≤ ${x} ≤ ${n(a)}, 0 ≤ ${y} ≤ ${n(c)}, counterclockwise. Use Green’s theorem to find the ${flux ? `outward flux ∮<sub>${M.v("C")}</sub> ${vF} · ${vn} d${M.v("s")}` : `circulation ∮<sub>${M.v("C")}</sub> ${vF} · d${vr}`}.`,
              graph: graph({ view: [-1, a + 1, -1, c + 1], equal: true, items: [
                { t: "poly", p: [[0, 0], [a, 0], [a, c], [0, c]], role: "primary" }, ...arrows(field2(Pf, Qf), gridPts(range(0, a, 0.5), range(0, c, 0.5)), 0.4)] }),
              steps: [
                flux
                  ? `Flux form of Green’s theorem: ∮ ${vF} · ${vn} d${M.v("s")} = ∬<sub>${M.v("D")}</sub> (${pd("P", "x")} + ${pd("Q", "y")}) d${M.v("A")}, the total divergence.`
                  : `Circulation form of Green’s theorem: ∮ ${vF} · d${vr} = ∬<sub>${M.v("D")}</sub> (${pd("Q", "x")} − ${pd("P", "y")}) d${M.v("A")}, the total curl.`,
                flux
                  ? `${pd("P", "x")} = ${ph(d1, XY)} and ${pd("Q", "y")} = ${ph(d2, XY)}, so the integrand is ${ph(g, XY)}.`
                  : `${pd("Q", "x")} = ${ph(d1, XY)} and ${pd("P", "y")} = ${ph(d2, XY)}, so the integrand is ${ph(d1, XY)} − ${pp(d2, XY)} = ${ph(g, XY)}.`,
                `Inner integral in ${y}: ${intg(0, n(c))} ${pw(g, XY)} d${y} = ${ph(inner, XY)}.`,
                `Outer integral in ${x}: ${intg(0, n(a))} ${pw(inner, XY)} d${x} = ${brk(ph(A2, XY), 0, n(a))} = ${M.f(ans)}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: typed(ans),
              vals: { d1: pv(d1), d2: pv(d2), g: pv(g), inner: pv(inner), A2: pv(A2), ans: fv(ans) },
              params: { P: pv(Pf), Q: pv(Qf), a, c, flux: flux ? 1 : 0 },
            };
          }
        }
        // level 3: work around a circle, Green's theorem in polar coordinates
        for (;;) {
          const m = r.int(1, 2), b1 = r.int(-3, 3), b2 = r.int(-3, 3), R = r.int(1, 3);
          const Pf = padd(P2([[-m, 0, 3], [-b1, 0, 1]]), r.chance(0.6) ? P2([[r.nonzero(-3, 3), r.int(1, 2), 0]]) : cst(2, 0));
          const Qf = padd(P2([[m, 3, 0], [b2, 1, 0]]), r.chance(0.6) ? P2([[r.nonzero(-3, 3), 0, r.int(1, 2)]]) : cst(2, 0));
          const Qx = pdiff(Qf, 0), Py = pdiff(Pf, 1), cz = psub(Qx, Py), beta = b1 + b2, s = 3 * m;
          const polar = Pl(1, [{ e: [2], c: F(s) }, { e: [0], c: F(beta) }]);
          const ig = pmul(polar, tm(1)), an = panti(ig, 0), inner = pval(an, [R]), coef = inner.mul(2);
          if (coef.n === 0) continue;
          const rv = M.v("r");
          return {
            prompt: `A particle moves once counterclockwise around the circle ${M.sup(x, 2)} + ${M.sup(y, 2)} = ${n(R * R)} (meters) in the force field ${vF}(${x}, ${y}) = ${fieldH([Pf, Qf], XY)} newtons. Use Green’s theorem to find the work done by ${vF}, in joules.`,
            graph: graph({ view: [-R - 1.2, R + 1.2, -R - 1.2, R + 1.2], equal: true, items: [
              { t: "circle", c: [0, 0], r: R, role: "primary" }, { t: "vec", a: [R, -0.3], b: [R, 0.3], role: "highlight" },
              ...arrows(field2(Pf, Qf), range(0, 7).map((k) => [R * Math.cos((k * Math.PI) / 4), R * Math.sin((k * Math.PI) / 4)]), 0.6)] }),
            steps: [
              `${M.v("W")} = ∮<sub>${M.v("C")}</sub> ${M.v("P")} d${x} + ${M.v("Q")} d${y} = ∬<sub>${M.v("D")}</sub> (${pd("Q", "x")} − ${pd("P", "y")}) d${M.v("A")}, with ${M.v("D")} the disk of radius ${n(R)}.`,
              `${pd("Q", "x")} = ${ph(Qx, XY)} and ${pd("P", "y")} = ${ph(Py, XY)}, so ${pd("Q", "x")} − ${pd("P", "y")} = ${ph(cz, XY)}.`,
              `In polar coordinates ${M.sup(x, 2)} + ${M.sup(y, 2)} = ${M.sup(rv, 2)} and d${M.v("A")} = ${rv} d${rv} d${th}, so the integrand becomes ${ph(polar, RR)}.`,
              `${M.v("W")} = ${intg(0, "2π")} ${intg(0, n(R))} ${pw(polar, RR)} ${rv} d${rv} d${th} = 2π ${brk(ph(an, RR), 0, n(R))} = 2π · ${fp(inner)} = ${piH(coef)} J.`,
            ],
            answer: { kind: "number", value: coef.value * Math.PI }, answerText: `${piH(coef)} J`, answerInput: piIn(coef),
            vals: { RR2: R * R, Qx: pv(Qx), Py: pv(Py), cz: pv(cz), polar: pv(polar), an: pv(an), inner: fv(inner), coef: fv(coef) },
            params: { P: pv(Pf), Q: pv(Qf), R },
          };
        }
      },
    },

    // ---- V.param-surf Parametrized surfaces & surface area ----------------------------------------------------
    "V.param-surf": {
      title: "Normals and surface area",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const g = rpoly(r, 2, 2, 1, 3, 3), slot = r.int(0, 2), p0 = [r.int(-2, 2), r.int(-2, 2)];
            const gu = pdiff(g, 0), gv = pdiff(g, 1), A = pval(gu, p0), Bv = pval(gv, p0);
            if (A.n === 0 && Bv.n === 0) continue;
            // r(u, v): the coordinates other than `slot` are u, v in order; the slot holds g(u, v)
            const others = [0, 1, 2].filter((i) => i !== slot);
            const comps = [], ru = [], rv = [], ruH = [], rvH = [];
            for (let i = 0; i < 3; i++) {
              if (i === slot) { comps.push(ph(g, UV)); ru.push(A); rv.push(Bv); ruH.push(ph(gu, UV)); rvH.push(ph(gv, UV)); }
              else {
                const isU = others[0] === i;
                comps.push(isU ? u : v); ru.push(F(isU ? 1 : 0)); rv.push(F(isU ? 0 : 1)); ruH.push(isU ? "1" : "0"); rvH.push(isU ? "0" : "1");
              }
            }
            const N = cross(ru, rv);
            return {
              prompt: `The surface ${vr}(${u}, ${v}) = (${comps.join(", ")}) passes through the point with ${u} = ${n(p0[0])}, ${v} = ${n(p0[1])}. Find the normal vector ${vr}<sub>${u}</sub> × ${vr}<sub>${v}</sub> there.`,
              steps: [
                `Differentiate each coordinate: ${vr}<sub>${u}</sub> = (${ruH.join(", ")}) and ${vr}<sub>${v}</sub> = (${rvH.join(", ")}).`,
                `At (${u}, ${v}) = (${n(p0[0])}, ${n(p0[1])}): ${M.v("g")}<sub>${u}</sub> = ${subEq(gu, p0, A)}${M.f(A)} and ${M.v("g")}<sub>${v}</sub> = ${subEq(gv, p0, Bv)}${M.f(Bv)}, where ${M.v("g")}(${u}, ${v}) = ${ph(g, UV)}. So ${vr}<sub>${u}</sub> = ${vecQ(ru)} and ${vr}<sub>${v}</sub> = ${vecQ(rv)}.`,
                `Cross product: ${vr}<sub>${u}</sub> × ${vr}<sub>${v}</sub> = ${crossH(ru, rv)} = ${vecQ(N)}.`,
              ],
              answer: { kind: "point", value: N.map((q) => q.value) }, answerText: vecQ(N), answerInput: `(${N.map(typed).join(", ")})`,
              vals: { gu: pv(gu), gv: pv(gv), A: fv(A), Bv: fv(Bv), N: N.map(fv) }, params: { g: pv(g), slot, p: p0 },
            };
          }
        }
        if (level === 2) {
          const { a, b, s } = pickPlane(r), c = r.int(1, 6), p = r.int(2, 8), q = r.int(2, 8);
          const g = P2([[a, 1, 0], [b, 0, 1], [c, 0, 0]]);
          const a2 = a.mul(a), b2 = b.mul(b), tot = a2.add(b2).add(1), pq = p * q, ans = s.mul(pq);
          return {
            prompt: `A flat roof panel lies in the plane ${z} = ${ph(g, XY)}, directly above the rectangle 0 ≤ ${x} ≤ ${n(p)}, 0 ≤ ${y} ≤ ${n(q)} (meters). Find the panel’s area in square meters.`,
            steps: [
              `Parametrize by ${x} and ${y}: ${vr}(${x}, ${y}) = (${x}, ${y}, ${ph(g, XY)}). Then ${vr}<sub>${x}</sub> × ${vr}<sub>${y}</sub> = (−${M.v("g")}<sub>${x}</sub>, −${M.v("g")}<sub>${y}</sub>, 1) = ${vecQ([a.neg(), b.neg(), F(1)])}.`,
              `Its length: ${M.sqrt(`1 + ${sq(a)} + ${sq(b)}`)} = ${M.sqrt(`1 + ${M.f(a2)} + ${M.f(b2)}`)} = ${M.sqrt(M.f(tot))} = ${M.f(s)}, the same everywhere on the plane.`,
              `Area = ∬<sub>${M.v("D")}</sub> ${M.f(s)} d${M.v("A")} = ${M.f(s)} · (${n(p)} · ${n(q)}) = ${M.f(s)} · ${n(pq)} = ${M.f(ans)} m².`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: `${M.f(ans)} m²`, answerInput: typed(ans),
            vals: { a2: fv(a2), b2: fv(b2), tot: fv(tot), s: fv(s), pq, ans: fv(ans) }, params: { g: pv(g), p, q },
          };
        }
        if (r.chance(0.5)) {
          // level 3a: area of a spherical cap, from the parametrization's area element a² sin φ
          const a = r.int(2, 6), c = r.int(0, a - 1), a2 = a * a, ratio = F(c, a), one = F(1).sub(ratio), coef = one.mul(2 * a2);
          return {
            prompt: `A radar dome is the part of the sphere ${M.sup(x, 2)} + ${M.sup(y, 2)} + ${M.sup(z, 2)} = ${n(a2)} that lies above the plane ${z} = ${n(c)} (meters). Using the parametrization by spherical angles, find its area in m².`,
            steps: [
              `${vr}(${phi}, ${th}) = (${n(a)} ${sinP} cos ${th}, ${n(a)} ${sinP} sin ${th}, ${kc(a, cosP)}), and ‖${vr}<sub>${phi}</sub> × ${vr}<sub>${th}</sub>‖ = ${n(a2)} ${sinP}.`,
              `${z} ≥ ${n(c)} means ${kc(a, cosP)} ≥ ${n(c)}, that is 0 ≤ ${phi} ≤ ${phi}<sub>0</sub> with cos ${phi}<sub>0</sub> = ${M.f(ratio)}; ${th} runs from 0 to 2π.`,
              `Area = ${intg(0, "2π")} ${intg(0, `${phi}<sub>0</sub>`)} ${n(a2)} ${sinP} d${phi} d${th} = 2π · ${n(a2)} ${brk(`−${cosP}`, 0, `${phi}<sub>0</sub>`)} = 2π · ${n(a2)} · (1 − ${M.f(ratio)}) = 2π · ${n(a2)} · ${M.f(one)}.`,
              `Area = ${piH(coef)} m².`,
            ],
            answer: { kind: "number", value: coef.value * Math.PI }, answerText: `${piH(coef)} m²`, answerInput: piIn(coef),
            vals: { a2, ratio: fv(ratio), one: fv(one), coef: fv(coef) }, params: { a, c, cap: 1 },
          };
        }
        // level 3b: area of a paraboloid cap, by polar coordinates and a substitution
        const h = r.pick([2, 6, 12, 20]), Wt = 1 + 4 * h, S = Math.round(Math.sqrt(Wt)), S3 = S * S * S, inner = F(S3 - 1, 12), coef = inner.mul(2);
        const dome = r.chance(0.5), rv = M.v("r"), wv = M.v("w");
        return {
          prompt: dome
            ? `Find the area of the dome ${z} = ${n(h)} − ${M.sup(x, 2)} − ${M.sup(y, 2)}, ${z} ≥ 0.`
            : `Find the area of the part of the paraboloid ${z} = ${M.sup(x, 2)} + ${M.sup(y, 2)} that lies below the plane ${z} = ${n(h)}.`,
          steps: [
            `The surface is a graph over the disk ${M.sup(x, 2)} + ${M.sup(y, 2)} ≤ ${n(h)} (where ${dome ? `${z} = 0` : `${z} = ${n(h)}`}). With ${M.v("g")}<sub>${x}</sub> = ${dome ? "−" : ""}2${x} and ${M.v("g")}<sub>${y}</sub> = ${dome ? "−" : ""}2${y}, d${M.v("S")} = ${M.sqrt(`1 + 4${M.sup(x, 2)} + 4${M.sup(y, 2)}`)} d${M.v("A")}.`,
            `In polar coordinates: Area = ${intg(0, "2π")} ${intg(0, M.sqrt(n(h)))} ${M.sqrt(`1 + 4${M.sup(rv, 2)}`)} ${rv} d${rv} d${th}.`,
            `Substitute ${wv} = 1 + 4${M.sup(rv, 2)}, d${wv} = 8${rv} d${rv}; ${rv} = ${M.sqrt(n(h))} gives ${wv} = ${n(Wt)}. The inner integral is ${M.frac("1", "8")} ${intg(1, n(Wt))} ${M.sqrt(wv)} d${wv} = ${M.frac("1", "8")} · ${M.frac("2", "3")} ${brk(M.sup(wv, "3/2"), 1, n(Wt))} = ${M.frac("1", "12")}(${M.sup(n(Wt), "3/2")} − 1) = ${M.frac("1", "12")}(${n(S3)} − 1) = ${M.f(inner)}, since ${M.sqrt(n(Wt))} = ${n(S)}.`,
            `Area = 2π · ${M.f(inner)} = ${piH(coef)}.`,
          ],
          answer: { kind: "number", value: coef.value * Math.PI }, answerText: piH(coef), answerInput: piIn(coef),
          vals: { Wt, S, S3, inner: fv(inner), coef: fv(coef) }, params: { h, dome: dome ? 1 : 0, cap: 0 }, consts: [3, 4, 8, 12],
        };
      },
    },

    // ---- V.surf-scalar Surface integrals of scalar functions ---------------------------------------------------
    "V.surf-scalar": {
      title: "Surface integrals of scalar functions",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const { a, b, s } = pickPlane(r), c = r.int(0, 4), p = r.int(1, 3), q = r.int(1, 3);
            const g = P2([[a, 1, 0], [b, 0, 1], [c, 0, 0]]);
            const f = P2([[r.int(-3, 3), 1, 0], [r.int(-3, 3), 0, 1], [r.int(-4, 6), 0, 0]]);
            if (f.t.length < 2) continue;
            const a2 = a.mul(a), b2 = b.mul(b), tot = a2.add(b2).add(1);
            const inner = pdef(f, 1, 0, q), A2 = panti(inner, 0), I = pval(A2, [p, 0]), ans = I.mul(s);
            if (ans.n === 0) continue;
            return {
              prompt: `Evaluate ${M.eq(`∬<sub>${M.v("S")}</sub> (${ph(f, XY)}) d${M.v("S")}`)} where ${M.v("S")} is the part of the plane ${z} = ${ph(g, XY)} above the rectangle 0 ≤ ${x} ≤ ${n(p)}, 0 ≤ ${y} ≤ ${n(q)}.`,
              steps: [
                `For a graph ${z} = ${M.v("g")}(${x}, ${y}): d${M.v("S")} = ${M.sqrt(`1 + ${M.sup(M.v("g") + `<sub>${x}</sub>`, 2)} + ${M.sup(M.v("g") + `<sub>${y}</sub>`, 2)}`)} d${M.v("A")} = ${M.sqrt(`1 + ${sq(a)} + ${sq(b)}`)} d${M.v("A")} = ${M.sqrt(M.f(tot))} d${M.v("A")} = ${M.f(s)} d${M.v("A")}.`,
                `The integrand has no ${z}, so nothing to substitute: ∬<sub>${M.v("S")}</sub> = ${M.f(s)} ${intg(0, n(p))} ${intg(0, n(q))} ${pw(f, XY)} d${y} d${x}.`,
                `Inner integral: ${intg(0, n(q))} ${pw(f, XY)} d${y} = ${ph(inner, XY)}.`,
                `Outer integral: ${intg(0, n(p))} ${pw(inner, XY)} d${x} = ${brk(ph(A2, XY), 0, n(p))} = ${M.f(I)}.`,
                `Multiply by the area factor: ${M.f(s)} · ${fp(I)} = ${M.f(ans)}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: typed(ans),
              vals: { a2: fv(a2), b2: fv(b2), tot: fv(tot), s: fv(s), inner: pv(inner), A2: pv(A2), I: fv(I), ans: fv(ans) },
              params: { g: pv(g), f: pv(f), p, q },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const a = r.int(1, 3), k = r.int(1, 2), al = r.int(-3, 4), be = r.nonzero(-3, 4);
            const a2 = a * a, ak2 = Math.pow(a, k + 2), kp1 = k + 1;
            const t1 = F(al * a2), t2 = F(be * ak2, kp1), inner = t1.add(t2), coef = inner.mul(2);
            if (coef.n === 0) continue;
            const zk = k === 1 ? z : M.sup(z, k), ak = Math.pow(a, k), bak = be * ak;
            const cosk = k === 1 ? cosP : `cos<sup>${k}</sup> ${phi}`;
            const fS = al === 0 ? lin([[be, zk]], "") : `${n(al)}${M.term(be, zk)}`;
            const fPhi = al === 0 ? lin([[bak, cosk]]) : `${n(al)} ${bak > 0 ? "+" : "−"} ${lin([[Math.abs(bak), cosk]])}`;
            const zSub = k === 1 ? `${z} = ${kc(a, cosP)}` : `${zk} = ${M.sup(n(a), k)} ${cosk} = ${kc(ak, cosk)}`;
            const sumParts = (al === 0 ? "" : `${n(al)} · ${n(a2)} · 1 + `) + `${al === 0 ? n(bak) : np(bak)} · ${n(a2)} · ${M.frac("1", n(kp1))}`;
            const sumVals = al === 0 ? M.f(t2) : `${M.f(t1)} + ${fp(t2)}`;
            return {
              prompt: `Evaluate ${M.eq(`∬<sub>${M.v("S")}</sub> (${fS}) d${M.v("S")}`)} over the upper hemisphere ${M.v("S")}: ${M.sup(x, 2)} + ${M.sup(y, 2)} + ${M.sup(z, 2)} = ${n(a2)}, ${z} ≥ 0.`,
              steps: [
                `Use spherical angles on the sphere of radius ${n(a)}: ${z} = ${kc(a, cosP)} and d${M.v("S")} = ${n(a2)} ${sinP} d${phi} d${th}, with ${hemi}.`,
                `${zSub}, so the integral is ${intg(0, "2π")} ${intg(0, piFrac2)} (${fPhi}) · ${n(a2)} ${sinP} d${phi} d${th}.`,
                `${intg(0, piFrac2)} ${sinP} d${phi} = 1 and, with ${M.v("w")} = ${cosP}, ${intg(0, piFrac2)} ${cosk} ${sinP} d${phi} = ${intg(0, 1)} ${k === 1 ? M.v("w") : M.sup(M.v("w"), k)} d${M.v("w")} = ${M.frac("1", n(kp1))}.`,
                `The ${phi}-integral: ${sumParts} = ${sumVals}${al === 0 ? "" : ` = ${M.f(inner)}`}.`,
                `Multiply by ${intg(0, "2π")} d${th} = 2π: 2π · ${fp(inner)} = ${piH(coef)}.`,
              ],
              answer: { kind: "number", value: coef.value * Math.PI }, answerText: piH(coef), answerInput: piIn(coef),
              vals: { a2, ak, bak, kp1, t1: fv(t1), t2: fv(t2), inner: fv(inner), coef: fv(coef) },
              params: { a, k, al, be },
            };
          }
        }
        // level 3: center of mass of a hemispherical shell with height-dependent density
        const a = r.int(1, 3), c = r.int(1, 6), k = r.int(1, 4), a2 = a * a;
        const m1 = F(c * a2), m2 = F(k * a * a2, 2), mI = m1.add(m2);
        const z1 = F(c * a * a2, 2), z2 = F(k * a2 * a2, 3), zI = z1.add(z2), ans = zI.div(mI);
        const rho = "ρ";
        return {
          prompt: `A thin hemispherical dome ${M.sup(x, 2)} + ${M.sup(y, 2)} + ${M.sup(z, 2)} = ${n(a2)}, ${z} ≥ 0 (meters) has surface density ${rho} = ${n(c)} + ${k === 1 ? z : `${n(k)}${z}`} kg/m², heavier toward the top. How high is its center of mass, in meters?`,
          steps: [
            `By symmetry the center of mass is on the ${z}-axis, at height ${M.v("z̄")} = ${M.frac(`∬ ${z}${rho} d${M.v("S")}`, `∬ ${rho} d${M.v("S")}`)}.`,
            `On the sphere of radius ${n(a)}: ${z} = ${kc(a, cosP)}, d${M.v("S")} = ${n(a2)} ${sinP} d${phi} d${th}, ${hemi}. Useful values: ${intg(0, piFrac2)} ${sinP} d${phi} = 1, ${intg(0, piFrac2)} ${cosP} ${sinP} d${phi} = ${M.frac("1", "2")}, ${intg(0, piFrac2)} cos<sup>2</sup> ${phi} ${sinP} d${phi} = ${M.frac("1", "3")}.`,
            `Mass: ∬ (${n(c)} + ${k === 1 ? "" : n(k)}${z}) d${M.v("S")} = 2π(${n(c)} · ${n(a2)} · 1 + ${n(k)} · ${n(a)} · ${n(a2)} · ${M.frac("1", "2")}) = 2π(${M.f(m1)} + ${M.f(m2)}) = 2π · ${M.f(mI)} kg.`,
            `Moment: ∬ ${z}(${n(c)} + ${k === 1 ? "" : n(k)}${z}) d${M.v("S")} = 2π(${n(c)} · ${n(a)} · ${n(a2)} · ${M.frac("1", "2")} + ${n(k)} · ${n(a2)} · ${n(a2)} · ${M.frac("1", "3")}) = 2π(${M.f(z1)} + ${M.f(z2)}) = 2π · ${M.f(zI)}.`,
            `${M.v("z̄")} = ${M.f(zI)} ÷ ${M.f(mI)} = ${M.f(ans)} m (the 2π cancels).`,
          ],
          answer: { kind: "number", value: ans.value }, answerText: `${M.f(ans)} m`, answerInput: typed(ans),
          vals: { a2, m1: fv(m1), m2: fv(m2), mI: fv(mI), z1: fv(z1), z2: fv(z2), zI: fv(zI), ans: fv(ans) }, params: { a, c, k }, consts: [3],
        };
      },
    },

    // ---- V.surf-flux Flux through a surface -------------------------------------------------------------------
    "V.surf-flux": {
      title: "Flux through a surface",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const a = r.int(-2, 2), b = r.int(-2, 2), c = r.int(0, 5), p = r.int(1, 5), q = r.int(1, 5);
            const v1 = r.int(-3, 3), v2 = r.int(-3, 3), v3 = r.int(-4, 4);
            const k = -v1 * a - v2 * b + v3, area = p * q, ans = k * area;
            if (k === 0 || (a === 0 && b === 0)) continue;
            const g = P2([[a, 1, 0], [b, 0, 1], [c, 0, 0]]);
            return {
              prompt: `Water flows with constant velocity ${vv} = (${n(v1)}, ${n(v2)}, ${n(v3)}) m/s through a flat screen lying in the plane ${z} = ${ph(g, XY)} above the rectangle 0 ≤ ${x} ≤ ${n(p)}, 0 ≤ ${y} ≤ ${n(q)} (meters). Find the flow rate upward through the screen, ∬ ${vv} · d${bold("S")}, in m³/s.`,
              steps: [
                `For a graph ${z} = ${M.v("g")}(${x}, ${y}) with upward normal, d${bold("S")} = (−${M.v("g")}<sub>${x}</sub>, −${M.v("g")}<sub>${y}</sub>, 1) d${M.v("A")} = ${vec(n(-a), n(-b), "1")} d${M.v("A")}.`,
                `${vv} · (${n(-a)}, ${n(-b)}, 1) = ${n(v1)} · ${np(-a)} + ${np(v2)} · ${np(-b)} + ${np(v3)} = ${n(k)}, constant over the screen.`,
                `Flow rate = ∬<sub>${M.v("D")}</sub> ${n(k)} d${M.v("A")} = ${n(k)} · (${n(p)} · ${n(q)}) = ${n(ans)} m³/s.`,
              ],
              answer: { kind: "number", value: ans }, answerText: `${n(ans)} m³/s`, answerInput: String(ans),
              vals: { na: -a, nb: -b, k, area, ans }, params: { v1, v2, v3, g: pv(g), p, q },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const g = padd(rpoly(r, 2, r.int(1, 2), 1, 2, 2, () => true, true), cst(2, r.int(0, 2)));
            const comps = [0, 1, 2].map(() => rpoly(r, 3, 1, 0, 1, 3));
            const p = r.int(1, 2), q = r.int(1, 2);
            const X = mono(2, 1, [1, 0]), Y = mono(2, 1, [0, 1]);
            const sub = comps.map((c) => pcomp(c, [X, Y, g]));
            const ngx = pscale(pdiff(g, 0), -1), ngy = pscale(pdiff(g, 1), -1);
            const h = padd(pmul(sub[0], ngx), pmul(sub[1], ngy), sub[2]);
            if (isZero(h)) continue;
            const inner = pdef(h, 1, 0, q), A2 = panti(inner, 0), ans = pval(A2, [p, 0]);
            if (ans.n === 0) continue;
            return {
              prompt: `Find the upward flux of ${vF}(${x}, ${y}, ${z}) = ${fieldH(comps, XYZ)} through the surface ${z} = ${ph(g, XY)}, 0 ≤ ${x} ≤ ${n(p)}, 0 ≤ ${y} ≤ ${n(q)}.`,
              steps: [
                `Upward normal for a graph: ${vN} = (−${M.v("g")}<sub>${x}</sub>, −${M.v("g")}<sub>${y}</sub>, 1) = (${ph(ngx, XY)}, ${ph(ngy, XY)}, 1), and flux = ∬<sub>${M.v("D")}</sub> ${vF} · ${vN} d${M.v("A")}.`,
                `On the surface, replace ${z} by ${ph(g, XY)}: ${vF} = ${fieldH(sub, XY)}.`,
                `${vF} · ${vN} = ${pp(sub[0], XY)} · ${pp(ngx, XY)} + ${pp(sub[1], XY)} · ${pp(ngy, XY)} + ${pp(sub[2], XY)} = ${ph(h, XY)}.`,
                `Inner integral: ${intg(0, n(q))} ${pw(h, XY)} d${y} = ${ph(inner, XY)}.`,
                `Outer integral: ${intg(0, n(p))} ${pw(inner, XY)} d${x} = ${brk(ph(A2, XY), 0, n(p))} = ${M.f(ans)}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: typed(ans),
              vals: { ngx: pv(ngx), ngy: pv(ngy), sub: sub.map(pv), h: pv(h), inner: pv(inner), A2: pv(A2), ans: fv(ans) },
              params: { P: pv(comps[0]), Q: pv(comps[1]), R: pv(comps[2]), g: pv(g), p, q },
            };
          }
        }
        // level 3: flux out through a hemisphere, with spherical angles
        const a = r.int(1, 3), a2 = a * a, a3 = a2 * a;
        if (r.chance(0.5)) {
          const w = r.int(1, 4), rho = 1000, vol = F(w * a2), coef = vol.mul(rho);
          return {
            prompt: `Water (density ${n(rho)} kg/m³) flows straight up with velocity ${vv} = (0, 0, ${n(w)}) m/s. A hemispherical net ${M.sup(x, 2)} + ${M.sup(y, 2)} + ${M.sup(z, 2)} = ${n(a2)}, ${z} ≥ 0 (meters) sits in the flow. Find the mass flow rate out through the net, ${M.v("ṁ")} = ∬ ρ ${vv} · ${vn} d${M.v("S")}, in kg/s.`,
            steps: [
              `On a sphere centered at the origin the outward unit normal is ${vn} = ${M.frac(vr, n(a))} = ${M.frac(`(${x}, ${y}, ${z})`, n(a))}, and d${M.v("S")} = ${n(a2)} ${sinP} d${phi} d${th}, ${hemi}.`,
              `${vv} · ${vn} = ${M.frac(w === 1 ? z : `${n(w)}${z}`, n(a))} = ${kc(w, cosP)}, since ${z} = ${kc(a, cosP)}.`,
              `Volume flow: ${intg(0, "2π")} ${intg(0, piFrac2)} ${kc(w, cosP)} · ${n(a2)} ${sinP} d${phi} d${th} = ${n(w)} · ${n(a2)} · 2π · ${M.frac("1", "2")} = ${piH(vol)} m³/s, using ${intg(0, piFrac2)} ${cosP} ${sinP} d${phi} = ${M.frac("1", "2")}.`,
              `${M.v("ṁ")} = ${n(rho)} · ${piH(vol)} = ${piH(coef)} kg/s.`,
            ],
            answer: { kind: "number", value: coef.value * Math.PI }, answerText: `${piH(coef)} kg/s`, answerInput: piIn(coef),
            vals: { a2, vol: fv(vol), coef: fv(coef) }, params: { a, w, rho, kind: 0 },
          };
        }
        for (;;) {
          const al = r.int(-3, 3), be = r.int(-3, 3);
          if (al === 0) continue;
          const t1 = F(2 * al, 3), t2 = F(be, 3), inner = t1.add(t2), coef = inner.mul(2 * a3);
          if (coef.n === 0) continue;
          const Fh = vec(al === 1 ? x : al === -1 ? `−${x}` : `${n(al)}${x}`, al === 1 ? y : al === -1 ? `−${y}` : `${n(al)}${y}`, be === 0 ? "0" : be === 1 ? z : be === -1 ? `−${z}` : `${n(be)}${z}`);
          return {
            prompt: `Find the outward flux of ${vF} = ${Fh} through the upper hemisphere ${M.sup(x, 2)} + ${M.sup(y, 2)} + ${M.sup(z, 2)} = ${n(a2)}, ${z} ≥ 0 (the curved surface only).`,
            steps: [
              `Outward unit normal ${vn} = ${M.frac(`(${x}, ${y}, ${z})`, n(a))} and d${M.v("S")} = ${n(a2)} ${sinP} d${phi} d${th}, ${hemi}.`,
              `${vF} · ${vn} = ${M.frac(`${lin([[al, `(${M.sup(x, 2)} + ${M.sup(y, 2)})`]], "")}${be === 0 ? "" : M.term(be, M.sup(z, 2))}`, n(a))}. With ${M.sup(x, 2)} + ${M.sup(y, 2)} = ${n(a2)} sin<sup>2</sup> ${phi} and ${M.sup(z, 2)} = ${n(a2)} cos<sup>2</sup> ${phi}, this is ${times(a, lin([[al, `sin<sup>2</sup> ${phi}`], [be, `cos<sup>2</sup> ${phi}`]]), true)}.`,
              `Flux = ${n(a)} · ${n(a2)} · 2π ${intg(0, piFrac2)} (${lin([[al, `sin<sup>2</sup> ${phi}`], [be, `cos<sup>2</sup> ${phi}`]])}) ${sinP} d${phi}.`,
              `${intg(0, piFrac2)} sin<sup>3</sup> ${phi} d${phi} = ${M.frac("2", "3")} and ${intg(0, piFrac2)} cos<sup>2</sup> ${phi} ${sinP} d${phi} = ${M.frac("1", "3")}, so the ${phi}-integral is ${n(al)} · ${M.frac("2", "3")} + ${np(be)} · ${M.frac("1", "3")} = ${M.f(inner)}.`,
              `Flux = 2π · ${n(a3)} · ${fp(inner)} = ${piH(coef)}.`,
            ],
            answer: { kind: "number", value: coef.value * Math.PI }, answerText: piH(coef), answerInput: piIn(coef),
            vals: { a2, a3, t1: fv(t1), t2: fv(t2), inner: fv(inner), coef: fv(coef) }, params: { a, al, be, kind: 1 }, consts: [3],
          };
        }
      },
    },

    // ---- V.12 Divergence theorem --------------------------------------------------------------------------------
    "V.12": {
      title: "The divergence theorem",
      generate(r, level) {
        const theorem = `The surface is closed and oriented outward and ${vF} is smooth inside, so by the divergence theorem the flux equals ∭<sub>${M.v("E")}</sub> ${nab} · ${vF} d${M.v("V")}.`;
        if (level === 1) {
          for (;;) {
            const al = r.int(-3, 4), be = r.int(-3, 4), ga = r.int(-3, 4), k = al + be + ga;
            if (k === 0 || [al, be, ga].filter((q) => q === 0).length > 1) continue;
            const comps = [al, be, ga].map((c, i) => {
              const e = [0, 0, 0]; e[i] = 1;
              const extra = r.chance(0.7) ? rpoly(r, 3, 1, 1, 2, 3, (ex) => ex[i] === 0) : cst(3, 0);
              return padd(mono(3, c, e), extra);
            });
            const ball = r.chance(0.5);
            const parts = comps.map((c, i) => pdiff(c, i));
            const divLine = `${nab} · ${vF} = ${pd("P", "x")} + ${pd("Q", "y")} + ${pd("R", "z")} = ${n(al)} + ${np(be)} + ${np(ga)} = ${n(k)}.`;
            if (ball) {
              const R = r.int(1, 3), R3 = R * R * R, coef = F(4 * k * R3, 3);
              return {
                prompt: `Use the divergence theorem to find the outward flux of ${vF} = ${fieldH(comps, XYZ)} through the sphere ${M.sup(x, 2)} + ${M.sup(y, 2)} + ${M.sup(z, 2)} = ${n(R * R)}.`,
                steps: [
                  theorem, divLine,
                  `The divergence is constant, so the flux is ${n(k)} × volume = ${n(k)} · ${M.frac("4", "3")}π · ${M.sup(n(R), 3)}${R === 1 ? "" : ` = ${n(k)} · ${M.frac("4", "3")}π · ${n(R3)}`} = ${piH(coef)}.`,
                ],
                answer: { kind: "number", value: coef.value * Math.PI }, answerText: piH(coef), answerInput: piIn(coef),
                vals: { parts: parts.map(pv), k, RR2: R * R, R3, coef: fv(coef) }, params: { P: pv(comps[0]), Q: pv(comps[1]), R: pv(comps[2]), ball: 1, rad: R }, consts: [3, 4],
              };
            }
            const a = r.int(1, 4), b = r.int(1, 4), c = r.int(1, 4), vol = a * b * c, ans = k * vol;
            return {
              prompt: `Use the divergence theorem to find the outward flux of ${vF} = ${fieldH(comps, XYZ)} through the surface of the box 0 ≤ ${x} ≤ ${n(a)}, 0 ≤ ${y} ≤ ${n(b)}, 0 ≤ ${z} ≤ ${n(c)}.`,
              steps: [
                theorem, divLine,
                `The divergence is constant, so the flux is ${n(k)} × volume = ${n(k)} · (${n(a)} · ${n(b)} · ${n(c)}) = ${n(k)} · ${n(vol)} = ${n(ans)}.`,
              ],
              answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
              vals: { parts: parts.map(pv), k, vol, ans }, params: { P: pv(comps[0]), Q: pv(comps[1]), R: pv(comps[2]), ball: 0, a, b, c },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const comps = [0, 1, 2].map(() => rpoly(r, 3, 2, 1, 2, 3));
            const a = r.int(1, 2), b = r.int(1, 3), c = r.int(1, 2);
            const parts = comps.map((p, i) => pdiff(p, i)), div = padd(...parts);
            if (isZero(div) || isConst(div)) continue;
            const h1 = pdef(div, 2, 0, c), h2 = pdef(h1, 1, 0, b), H = panti(h2, 0), ans = pval(H, [a, 0, 0]);
            if (ans.n === 0) continue;
            return {
              prompt: `Let ${vF}(${x}, ${y}, ${z}) = ${fieldH(comps, XYZ)}. Use the divergence theorem to find the outward flux of ${vF} through the surface of the box 0 ≤ ${x} ≤ ${n(a)}, 0 ≤ ${y} ≤ ${n(b)}, 0 ≤ ${z} ≤ ${n(c)}.`,
              steps: [
                theorem,
                `${nab} · ${vF} = ${pd("P", "x")} + ${pd("Q", "y")} + ${pd("R", "z")} = ${pw(parts[0], XYZ)} + ${pp(parts[1], XYZ)} + ${pp(parts[2], XYZ)} = ${ph(div, XYZ)}.`,
                `Integrate in ${z} from 0 to ${n(c)}: ${intg(0, n(c))} ${pw(div, XYZ)} d${z} = ${ph(h1, XYZ)}.`,
                `Then in ${y} from 0 to ${n(b)}: ${intg(0, n(b))} ${pw(h1, XYZ)} d${y} = ${ph(h2, XYZ)}.`,
                `Then in ${x} from 0 to ${n(a)}: ${intg(0, n(a))} ${pw(h2, XYZ)} d${x} = ${brk(ph(H, XYZ), 0, n(a))} = ${M.f(ans)}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: typed(ans),
              vals: { parts: parts.map(pv), div: pv(div), h1: pv(h1), h2: pv(h2), H: pv(H), ans: fv(ans) },
              params: { P: pv(comps[0]), Q: pv(comps[1]), R: pv(comps[2]), a, b, c },
            };
          }
        }
        // level 3: a ball or spherical shell, divergence 3m(x² + y² + z²) + k, spherical coordinates
        for (;;) {
          const m = r.int(1, 2), lins = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)], k = lins[0] + lins[1] + lins[2];
          const shell = r.chance(0.5), R1 = shell ? 1 : 0, R2 = shell ? r.int(2, 3) : r.int(1, 3);
          const comps = [0, 1, 2].map((i) => {
            const e3 = [0, 0, 0], e1 = [0, 0, 0]; e3[i] = 3; e1[i] = 1;
            const extra = r.chance(0.6) ? rpoly(r, 3, 1, 1, 2, 2, (ex) => ex[i] === 0) : cst(3, 0);
            return padd(mono(3, m, e3), mono(3, lins[i], e1), extra);
          });
          const parts = comps.map((p, i) => pdiff(p, i)), div = padd(...parts), s = 3 * m;
          const rad = Pl(1, [{ e: [2], c: F(s) }, { e: [0], c: F(k) }]);
          const ig = pmul(rad, tm(2)), an = panti(ig, 0), inner = pval(an, [R2]).sub(pval(an, [R1])), coef = inner.mul(4);
          if (coef.n === 0) continue;
          const solid = shell
            ? `the solid shell between the spheres of radius ${n(R1)} and ${n(R2)} centered at the origin (its boundary is both spheres, normals pointing out of the solid)`
            : `the ball ${M.sup(x, 2)} + ${M.sup(y, 2)} + ${M.sup(z, 2)} ≤ ${n(R2 * R2)}`;
          return {
            prompt: `Let ${vF}(${x}, ${y}, ${z}) = ${fieldH(comps, XYZ)}. Find the net outward flux of ${vF} through the boundary of ${solid}.`,
            steps: [
              theorem,
              `${nab} · ${vF} = ${pw(parts[0], XYZ)} + ${pp(parts[1], XYZ)} + ${pp(parts[2], XYZ)} = ${ph(div, XYZ)}, which is ${ph(rad, ["ρ"])} in spherical coordinates (${M.sup(x, 2)} + ${M.sup(y, 2)} + ${M.sup(z, 2)} = ρ<sup>2</sup>).`,
              `d${M.v("V")} = ρ<sup>2</sup> ${sinP} dρ d${phi} d${th}, and ${intg(0, "2π")} ${intg(0, "π")} ${sinP} d${phi} d${th} = 2π · 2 = 4π.`,
              `Radial integral: ${intg(n(R1), n(R2))} ${pw(rad, ["ρ"])} ρ<sup>2</sup> dρ = ${brk(ph(an, ["ρ"]), n(R1), n(R2))} = ${M.f(inner)}.`,
              `Flux = 4π · ${fp(inner)} = ${piH(coef)}.`,
            ],
            answer: { kind: "number", value: coef.value * Math.PI }, answerText: piH(coef), answerInput: piIn(coef),
            vals: { parts: parts.map(pv), div: pv(div), rad: pv(rad), an: pv(an), inner: fv(inner), coef: fv(coef), RR2: R2 * R2 },
            params: { P: pv(comps[0]), Q: pv(comps[1]), R: pv(comps[2]), R1, R2 }, consts: [4],
          };
        }
      },
    },

    // ---- V.13 Stokes' theorem ------------------------------------------------------------------------------------
    "V.13": {
      title: "Stokes’ theorem",
      generate(r, level) {
        const stokes = `Stokes’ theorem: ∮<sub>${M.v("C")}</sub> ${vF} · d${vr} = ∬<sub>${M.v("S")}</sub> (${nab} × ${vF}) · d${bold("S")} for any surface ${M.v("S")} bounded by ${M.v("C")}, with ${vn} by the right-hand rule (counterclockwise seen from above ↔ ${vn} pointing up).`;
        if (level <= 2) {
          for (;;) {
            const comps = [0, 1, 2].map(() => rpoly(r, 3, 2, 1, 1, 3));
            const cu = curlOf(...comps), cv = cu.c.map(pconst);
            const R = r.int(1, 3), RR2 = R * R;
            if (level === 1) {
              const h = r.int(0, 3), coef = cv[2].mul(RR2);
              if (coef.n === 0) continue;
              return {
                prompt: `Let ${vF}(${x}, ${y}, ${z}) = ${fieldH(comps, XYZ)}. Use Stokes’ theorem to find the circulation ∮<sub>${M.v("C")}</sub> ${vF} · d${vr} around the circle ${M.sup(x, 2)} + ${M.sup(y, 2)} = ${n(RR2)} in the plane ${z} = ${n(h)}, counterclockwise as seen from above.`,
                steps: [
                  stokes,
                  `${curlH(cu)}, a constant vector.`,
                  `Take ${M.v("S")} to be the flat disk the circle bounds; its upward unit normal is ${vk} = (0, 0, 1), so (${nab} × ${vF}) · ${vk} = ${M.f(cv[2])}.`,
                  `∬<sub>${M.v("S")}</sub> ${M.f(cv[2])} d${M.v("S")} = ${M.f(cv[2])} × (area of the disk) = ${M.f(cv[2])} · π · ${M.sup(n(R), 2)} = ${piH(coef)}.`,
                ],
                answer: { kind: "number", value: coef.value * Math.PI }, answerText: piH(coef), answerInput: piIn(coef),
                vals: { Ry: pv(cu.Ry), Qz: pv(cu.Qz), Pz: pv(cu.Pz), Rx: pv(cu.Rx), Qx: pv(cu.Qx), Py: pv(cu.Py), curl: cv.map(fv), RR2, coef: fv(coef) },
                params: { P: pv(comps[0]), Q: pv(comps[1]), R: pv(comps[2]), rad: R, h },
              };
            }
            const al = r.int(-2, 2), be = r.int(-2, 2), c0 = r.int(-3, 3);
            if (al === 0 && be === 0) continue;
            const K = cv[0].mul(-al).add(cv[1].mul(-be)).add(cv[2]), coef = K.mul(RR2);
            if (coef.n === 0 || cv[0].n === 0 && cv[1].n === 0) continue;
            const g = P2([[al, 1, 0], [be, 0, 1], [c0, 0, 0]]);
            return {
              prompt: `Let ${vF}(${x}, ${y}, ${z}) = ${fieldH(comps, XYZ)}, and let ${M.v("C")} be the ellipse where the plane ${z} = ${ph(g, XY)} cuts the cylinder ${M.sup(x, 2)} + ${M.sup(y, 2)} = ${n(RR2)}, counterclockwise as seen from above. Use Stokes’ theorem to find ∮<sub>${M.v("C")}</sub> ${vF} · d${vr}.`,
              steps: [
                stokes,
                `${curlH(cu)}, a constant vector.`,
                `Take ${M.v("S")} to be the flat piece of the plane inside the cylinder, a graph over the disk ${M.v("D")}: ${M.sup(x, 2)} + ${M.sup(y, 2)} ≤ ${n(RR2)}. Its upward normal is d${bold("S")} = (−${M.v("g")}<sub>${x}</sub>, −${M.v("g")}<sub>${y}</sub>, 1) d${M.v("A")} = ${vec(n(-al), n(-be), "1")} d${M.v("A")}.`,
                `(${nab} × ${vF}) · ${vec(n(-al), n(-be), "1")} = ${M.f(cv[0])} · ${np(-al)} + ${fp(cv[1])} · ${np(-be)} + ${fp(cv[2])} = ${M.f(K)}.`,
                `∬<sub>${M.v("D")}</sub> ${M.f(K)} d${M.v("A")} = ${M.f(K)} · π · ${M.sup(n(R), 2)} = ${piH(coef)}.`,
              ],
              answer: { kind: "number", value: coef.value * Math.PI }, answerText: piH(coef), answerInput: piIn(coef),
              vals: { Ry: pv(cu.Ry), Qz: pv(cu.Qz), Pz: pv(cu.Pz), Rx: pv(cu.Rx), Qx: pv(cu.Qx), Py: pv(cu.Py), curl: cv.map(fv), na: -al, nb: -be, K: fv(K), RR2, coef: fv(coef) },
              params: { P: pv(comps[0]), Q: pv(comps[1]), R: pv(comps[2]), g: pv(g), rad: R },
            };
          }
        }
        // level 3: flux of a curl through a paraboloid cap = flux through the flat disk (surface independence)
        for (;;) {
          const m = r.int(1, 2), b1 = r.int(-3, 3), b2 = r.int(-3, 3), R = r.int(1, 3), h = R * R;
          const Pf = padd(P3([[-m, 0, 3, 0], [-b1, 0, 1, 0]]), r.chance(0.7) ? P3([[r.nonzero(-2, 2), 1, 0, 1]]) : cst(3, 0));
          const Qf = padd(P3([[m, 3, 0, 0], [b2, 1, 0, 0]]), r.chance(0.7) ? P3([[r.nonzero(-2, 2), 0, 1, 1]]) : cst(3, 0));
          const Rf = rpoly(r, 3, 1, 1, 2, 3);
          const Qx = pdiff(Qf, 0), Py = pdiff(Pf, 1), cz = psub(Qx, Py), beta = b1 + b2, s = 3 * m;
          const polar = Pl(1, [{ e: [2], c: F(s) }, { e: [0], c: F(beta) }]);
          const ig = pmul(polar, tm(1)), an = panti(ig, 0), inner = pval(an, [R]), coef = inner.mul(2);
          if (coef.n === 0) continue;
          const rv = M.v("r");
          return {
            prompt: `Let ${vF}(${x}, ${y}, ${z}) = ${fieldH([Pf, Qf, Rf], XYZ)}. Find the upward flux of ${nab} × ${vF} through the paraboloid cap ${M.v("S")}: ${z} = ${n(h)} − ${M.sup(x, 2)} − ${M.sup(y, 2)}, ${z} ≥ 0.`,
            steps: [
              `${M.v("S")} meets the plane ${z} = 0 where ${M.sup(x, 2)} + ${M.sup(y, 2)} = ${n(h)}: its boundary ${M.v("C")} is the circle of radius ${n(R)}, counterclockwise from above for the upward normal.`,
              `By Stokes’ theorem the flux of a curl depends only on the boundary curve, so replace ${M.v("S")} by the flat disk ${M.v("D")}: ${M.sup(x, 2)} + ${M.sup(y, 2)} ≤ ${n(h)}, ${z} = 0, with upward normal ${vk}.`,
              `(${nab} × ${vF}) · ${vk} = ${pd("Q", "x")} − ${pd("P", "y")} = ${ph(Qx, XYZ)} − ${pp(Py, XYZ)} = ${ph(cz, XYZ)}, which is ${ph(polar, RR)} in polar coordinates.`,
              `Flux = ${intg(0, "2π")} ${intg(0, n(R))} ${pw(polar, RR)} ${rv} d${rv} d${th} = 2π ${brk(ph(an, RR), 0, n(R))} = 2π · ${fp(inner)} = ${piH(coef)}.`,
            ],
            answer: { kind: "number", value: coef.value * Math.PI }, answerText: piH(coef), answerInput: piIn(coef),
            vals: { Qx: pv(Qx), Py: pv(Py), cz: pv(cz), polar: pv(polar), an: pv(an), inner: fv(inner), coef: fv(coef) },
            params: { P: pv(Pf), Q: pv(Qf), R: pv(Rf), h, rad: R },
          };
        }
      },
    },

    // ---- V.14 The Laplacian & classic PDEs -------------------------------------------------------------------
    "V.14": {
      title: "The Laplacian, harmonic functions and the heat equation",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const f = rpoly(r, 3, 3, 2, 4, 4);
            const sec = [0, 1, 2].map((i) => pdiff(pdiff(f, i), i)), lap = padd(...sec);
            if (isZero(lap) || sec.filter(isZero).length > 1) continue;
            return {
              prompt: `Find the Laplacian ${M.sup(nab, 2)}${M.v("f")} of ${M.eq(`${M.v("f")}(${x}, ${y}, ${z}) = ${ph(f, XYZ)}`)}`,
              steps: [
                `${M.sup(nab, 2)}${M.v("f")} = ${M.v("f")}<sub>${x}${x}</sub> + ${M.v("f")}<sub>${y}${y}</sub> + ${M.v("f")}<sub>${z}${z}</sub>: differentiate twice in each variable.`,
                `${M.v("f")}<sub>${x}${x}</sub> = ${ph(sec[0], XYZ)}, ${M.v("f")}<sub>${y}${y}</sub> = ${ph(sec[1], XYZ)}, ${M.v("f")}<sub>${z}${z}</sub> = ${ph(sec[2], XYZ)}.`,
                `Add: ${M.sup(nab, 2)}${M.v("f")} = ${ph(lap, XYZ)}.`,
              ],
              answer: { kind: "expr", expr: pexpr(lap, XYZ), vars: XYZ }, answerText: `${M.sup(nab, 2)}${M.v("f")} = ${ph(lap, XYZ)}`, answerInput: ptyped(lap, XYZ),
              vals: { fxx: pv(sec[0]), fyy: pv(sec[1]), fzz: pv(sec[2]), lap: pv(lap) }, params: { f: pv(f) },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const a = r.nonzero(-3, 3), tpl = r.int(0, 4);
            let base, m, nv = 3;
            if (tpl === 0) { base = P3([[a, 3, 0, 0]]); m = P3([[1, 1, 2, 0]]); }
            else if (tpl === 1) { base = P3([[a, 0, 3, 0]]); m = P3([[1, 2, 1, 0]]); }
            else if (tpl === 2) { const b = r.nonzero(-3, 3); if (a + b === 0) continue; base = P3([[a, 2, 0, 0], [b, 0, 2, 0]]); m = P3([[1, 0, 0, 2]]); }
            else if (tpl === 3) { base = P3([[a, 4, 0, 0], [a, 0, 4, 0]]); m = P3([[1, 2, 2, 0]]); }
            else { base = P3([[a, 2, 1, 0]]); m = P3([[1, 0, 3, 0]]); }
            const extra = r.pick([P3([[r.nonzero(-4, 4), 1, 1, 0]]), P3([[r.nonzero(-4, 4), 0, 1, 1]]), P3([[r.nonzero(-5, 5), 1, 0, 0]]), cst(3, 0)]);
            const u0 = padd(base, extra);
            const uses = [0, 1, 2].filter((i) => dependsOn(u0, i) || dependsOn(m, i));
            const vars = uses.map((i) => XYZ[i]);
            const lap = (p) => padd(...uses.map((i) => pdiff(pdiff(p, i), i)));
            const Lb = lap(u0), Lm = lap(m);
            const lead = Lm.t[0], match = Lb.t.find((q) => cmpLex(q.e, lead.e) === 0);
            if (!match) continue;
            const lam = match.c.div(lead.c);
            if (!isZero(psub(Lb, pscale(Lm, lam)))) continue;
            const k = lam.neg(), kname = M.v("k");
            const uH = `${ph(u0, XYZ)} + ${kname}${ph(m, XYZ)}`;
            const args = vars.map(M.v).join(", ");
            const uii = (i) => `${M.v("u")}<sub>${M.v(XYZ[i])}${M.v(XYZ[i])}</sub>`;
            const usecs = uses.map((i) => pdiff(pdiff(u0, i), i)), msecs = uses.map((i) => pdiff(pdiff(m, i), i));
            const kL = isConst(Lm) ? `${M.f(pconst(Lm))}${kname}` : `${kname}(${ph(Lm, XYZ)})`;
            const factor = `(${kname}${M.term(lam, "")})`;
            const combined = isConst(Lm) ? `${M.f(pconst(Lm))}${factor}` : `${factor}(${ph(Lm, XYZ)})`;
            return {
              prompt: `For which constant ${kname} is ${M.eq(`${M.v("u")}(${args}) = ${uH}`)} harmonic, that is, a solution of Laplace’s equation ${M.sup(nab, 2)}${M.v("u")} = 0?`,
              steps: [
                `${M.sup(nab, 2)}${M.v("u")} = ${uses.map(uii).join(" + ")}, and it is linear, so treat the terms without ${kname} and the ${kname}-term separately.`,
                `Without ${kname}, ${ph(u0, XYZ)} has second partials ${usecs.map((p) => ph(p, XYZ)).join(", ")} (in ${vars.map(M.v).join(", ")}), which add to ${ph(Lb, XYZ)}.`,
                `The term ${kname}${ph(m, XYZ)} has second partials ${msecs.map((p) => (isZero(p) ? "0" : isConst(p) ? `${M.f(pconst(p))}${kname}` : `${kname}(${ph(p, XYZ)})`)).join(", ")}, which add to ${kL}.`,
                `So ${M.sup(nab, 2)}${M.v("u")} = ${ph(Lb, XYZ)} + ${kL} = ${combined}.`,
                `This vanishes everywhere only when ${kname}${M.term(lam, "")} = 0, so ${kname} = ${M.f(k)}.`,
              ],
              answer: { kind: "number", value: k.value }, answerText: `${kname} = ${M.f(k)}`, answerInput: typed(k),
              vals: { Lb: pv(Lb), Lm: pv(Lm), msecs: msecs.map(pv), usecs: usecs.map(pv), lam: fv(lam), k: fv(k) },
              params: { u0: pv(u0), m: pv(m), uses },
            };
          }
        }
        if (r.chance(0.5)) {
          // level 3a: heat equation, one Fourier mode
          for (;;) {
            const A = r.int(2, 9) * 5, nn = r.int(1, 3), al = r.int(1, 3), lam = al * nn * nn;
            const divs = [1, 2, 3, 4, 6, 8, 9, 12].filter((d) => lam % d === 0 && lam / d <= 6);
            const d = r.pick(divs), t0 = F(1, d), E = lam / d;
            const val = A * Math.exp(-E), twoN = 2 * nn;
            const nx = nn === 1 ? x : `${n(nn)}${x}`;
            const tv = M.v("t");
            return {
              prompt: `A rod 0 ≤ ${x} ≤ π has its ends held at 0 °C, and its temperature obeys the heat equation ${M.v("u")}<sub>${tv}</sub> = ${n(al)}${M.v("u")}<sub>${x}${x}</sub>. Initially ${M.v("u")}(${x}, 0) = ${n(A)} sin ${nx}. Try ${M.v("u")}(${x}, ${tv}) = ${n(A)}${M.sup(M.v("e"), `−λ${tv}`)} sin ${nx}: find the decay rate λ, then the temperature at ${x} = ${M.frac("π", n(twoN))} when ${tv} = ${M.f(t0)}. Give the exact value.`,
              steps: [
                `Differentiate the trial solution: ${M.v("u")}<sub>${tv}</sub> = −λ${M.v("u")} and ${M.v("u")}<sub>${x}${x}</sub> = ${nn === 1 ? "" : `−${M.sup(n(nn), 2)}${M.v("u")} = `}−${nn === 1 ? "" : n(nn * nn)}${M.v("u")}.`,
                `Substitute into ${M.v("u")}<sub>${tv}</sub> = ${n(al)}${M.v("u")}<sub>${x}${x}</sub>: −λ${M.v("u")} = −${nn === 1 ? `${n(al)}` : `${n(al)} · ${n(nn * nn)}`}${M.v("u")}, so λ = ${n(lam)}. (The ends stay at 0 because sin 0 = sin ${nn === 1 ? "π" : `${n(nn)}π`} = 0.)`,
                `At ${x} = ${M.frac("π", n(twoN))}: ${nn === 1 ? "" : `sin(${n(nn)} · ${M.frac("π", n(twoN))}) = `}sin ${piFrac2} = 1.`,
                `${M.v("u")} = ${n(A)}${M.sup(M.v("e"), `−${n(lam)} · ${M.f(t0)}`)} = ${n(A)}${M.sup(M.v("e"), `−${n(E)}`)} ≈ ${M.n(val, { dp: 3 })} °C.`,
              ],
              answer: { kind: "number", value: val }, answerText: `${n(A)}${M.sup(M.v("e"), `−${n(E)}`)} °C`, answerInput: `${A}e^(-${E})`,
              vals: { lam, E, twoN, nn2: nn * nn, val }, params: { A, n: nn, al, t0: fv(t0) },
            };
          }
        }
        // level 3b: five-point stencil for the Laplacian from grid temperatures
        const h = r.pick([F(1, 2), F(1, 5), F(1, 10)]), hv = h.value, h2 = h.mul(h);
        const C = r.int(20, 40), nb = [0, 1, 2, 3].map(() => C + r.int(-6, 6));
        const sum = nb[0] + nb[1] + nb[2] + nb[3], diff = sum - 4 * C, ans = F(diff).div(h2);
        const lbl = ["east", "west", "north", "south"];
        return {
          prompt: `A metal plate’s temperatures (°C) are measured on a square grid with spacing ${M.v("h")} = ${P.fmt(hv)} cm. At one point the reading is ${n(C)}; its four neighbors read ${lbl.map((s, i) => `${n(nb[i])} (${s})`).join(", ")}. Estimate ${M.sup(nab, 2)}${M.v("u")} at that point with the five-point stencil, in °C/cm².`,
          graph: graph({ view: [-1.8, 1.8, -1.8, 1.8], equal: true, axes: false, grid: false, items: [
            { t: "seg", a: [-1, 0], b: [1, 0], role: "muted" }, { t: "seg", a: [0, -1], b: [0, 1], role: "muted" },
            { t: "pt", x: 0, y: 0, label: String(C) }, { t: "pt", x: 1, y: 0, label: String(nb[0]) }, { t: "pt", x: -1, y: 0, label: String(nb[1]) },
            { t: "pt", x: 0, y: 1, label: String(nb[2]) }, { t: "pt", x: 0, y: -1, label: String(nb[3]) }] }),
          steps: [
            `Five-point stencil: ${M.sup(nab, 2)}${M.v("u")} ≈ ${M.frac(`${M.v("u")}<sub>E</sub> + ${M.v("u")}<sub>W</sub> + ${M.v("u")}<sub>N</sub> + ${M.v("u")}<sub>S</sub> − 4${M.v("u")}<sub>C</sub>`, M.sup(M.v("h"), 2))}.`,
            `Neighbors: ${nb.map(n).join(" + ")} = ${n(sum)}. Subtract 4 · ${n(C)} = ${n(4 * C)}: ${n(sum)} − ${n(4 * C)} = ${n(diff)}.`,
            `${M.sup(M.v("h"), 2)} = ${M.sup(`(${P.fmt(hv)})`, 2)} = ${P.fmt(h2.value)}, so ${M.sup(nab, 2)}${M.v("u")} ≈ ${n(diff)} ÷ ${P.fmt(h2.value)} = ${M.f(ans)} °C/cm².`,
            diff < 0 ? `It is negative: the point is warmer than the average of its neighbors, so under the heat equation it is cooling.`
              : diff > 0 ? `It is positive: the point is cooler than the average of its neighbors, so under the heat equation it is warming.`
                : `It is 0: the point equals the average of its neighbors, as harmonic functions do.`,
          ],
          answer: { kind: "number", value: ans.value }, answerText: `${M.f(ans)} °C/cm²`, answerInput: typed(ans),
          vals: { sum, C4: 4 * C, diff, h2: h2.value, ans: fv(ans) }, params: { C, nb, h: hv }, consts: [4],
        };
      },
    },
  });
})(Practice);
