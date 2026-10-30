/*
 * practice/calculus2.js — Calculus II practice problems (chapter 08), one generator per concept key.
 *
 * Each generator(r, level) draws hand-solvable numbers for the level (1 easy, 2 medium, 3 hard) and
 * builds every number it shows from values it computes and reports in `vals`; tools/practice/
 * verifiers/calculus2.py recomputes each of them independently with SymPy (integrate, series,
 * summation, dsolve, limit) and exact fractions. See practice/core.js for the API.
 *
 * Skipped concepts: none. Every concept of the chapter has something to compute or decide.
 *
 * Exact answers that mix constants (e, π, logarithms, roots) are kept as a list of terms
 * Σ cᵢ·(basis)ᵢ with rational cᵢ (see `ex`), so the text, the typed answer and the value all come
 * from the same numbers.
 */
(function (P) {
  "use strict";
  const { Frac, M, fmt, graph } = P;
  const F = (a, b = 1) => new Frac(a, b);
  const n = (v) => M.n(v);
  const np = (v) => M.n(v, { paren: true });   // (−3) in substitutions
  const f = (q) => M.f(q);
  const fp = (q) => M.f(q, { paren: true });
  const fv = (q) => { q = Frac.of(q); return { n: q.n, d: q.d }; };
  const typed = (q) => { q = Frac.of(q); return q.d === 1 ? String(q.n) : `${q.n}/${q.d}`; };
  const V = (s) => M.v(s);
  const x = V("x"), t = V("t"), y = V("y"), u = V("u"), sv = V("s"), th = V("θ");
  const dif = (v) => `d${v}`;
  /** k times a variable or expression: x, −x, 3x, ½x (never 1x). */
  const kv = (k, v = x) => { const q = Frac.of(k); return q.eq(1) ? v : q.eq(-1) ? `−${v}` : `${f(q)}${v}`; };
  /** k times a named function, with a space: 3 ln x, −sin x, ½ cos 2x. */
  const kf = (k, body) => { const q = Frac.of(k); return q.eq(1) ? body : q.eq(-1) ? `−${body}` : `${f(q)} ${body}`; };
  /** A signed term with a named function: ' + 3 ln x', ' − ln x'; '' for 0. */
  const tf = (k, body) => { const q = Frac.of(k); if (q.n === 0) return ""; const mag = q.abs(); return ` ${q.n < 0 ? "−" : "+"} ${mag.eq(1) ? body : `${f(mag)} ${body}`}`; };
  /** x^k, with x¹ written x. */
  const xp = (k, v = x) => (k === 1 ? v : M.sup(v, k));
  /** e^(k·v): e^{2x}, e^{−x}. */
  const ek = (k, v = x) => M.sup("e", kv(k, v));
  /** An integral sign with limits. */
  const integ = (lo, hi) => `∫<sub>${lo}</sub><sup>${hi}</sup>`;
  /** Evaluation bars after a bracket: [ … ] from lo to hi. */
  const bar = (lo, hi) => `<sub>${lo}</sub><sup>${hi}</sup>`;
  /** q·π for a fraction q: π/4, 3π/2, 2π. */
  const piq = (q) => {
    q = Frac.of(q);
    if (q.n === 0) return "0";
    const top = `${Math.abs(q.n) === 1 ? "" : n(Math.abs(q.n))}π`;
    const body = q.d === 1 ? top : M.frac(top, n(q.d));
    return q.n < 0 ? `−${body}` : body;
  };
  /** A decimal when the fraction terminates (within 8 places), otherwise a stacked fraction. */
  const dec = (q) => {
    q = Frac.of(q);
    let dd = q.d;
    while (dd % 2 === 0) dd /= 2;
    while (dd % 5 === 0) dd /= 5;
    return dd === 1 && q.d <= 100000000 ? M.n(q.value, { dp: 8 }) : f(q);
  };
  const decp = (q) => { const h = dec(q); return h.startsWith("−") ? `(${h})` : h; };

  // ---- exact values Σ c·basis ------------------------------------------------------------------
  const ONE = { h: "", s: "1", v: 1 };
  const PI = { h: "π", s: "pi", v: Math.PI };
  const PI2 = { h: M.sup("π", 2), s: "pi^2", v: Math.PI * Math.PI };
  const EXP = (k) => ({ h: k === 1 ? "e" : M.sup("e", n(k)), s: `e^(${k})`, v: Math.exp(k) });
  const EPI = (a) => ({ h: M.sup("e", `${a === 1 ? "" : a === -1 ? "−" : n(a)}π`), s: `e^(${a}*pi)`, v: Math.exp(a * Math.PI) });
  const LN = (k) => ({ h: `ln ${n(k)}`, s: `ln(${k})`, v: Math.log(k), sp: true, k });
  const SQ = (k) => ({ h: M.sqrt(n(k)), s: `sqrt(${k})`, v: Math.sqrt(k) });
  /** Σ c·basis as { h: html, s: typed, v: value }; zero terms are dropped. */
  function ex(terms) {
    const ts = terms.map(([c, b]) => [Frac.of(c), b]).filter(([c]) => c.n !== 0);
    if (!ts.length) return { h: "0", s: "0", v: 0 };
    let h = "", v = 0;
    const parts = [];
    ts.forEach(([c, b], i) => {
      const mag = c.abs();
      let body;
      if (b === ONE) body = f(mag);
      else {
        const top = mag.n === 1 ? b.h : `${n(mag.n)}${b.sp ? " " : ""}${b.h}`;
        body = mag.d === 1 ? top : M.frac(top, n(mag.d));
      }
      h += i === 0 ? `${c.n < 0 ? "−" : ""}${body}` : ` ${c.n < 0 ? "−" : "+"} ${body}`;
      parts.push(b === ONE ? `(${typed(c)})` : `(${typed(c)})*${b.s}`);
      v += c.value * b.v;
    });
    return { h, s: parts.join(" + "), v };
  }
  const PRIMES = [2, 3, 5, 7, 11, 13];
  function factorInt(m) {
    const out = {};
    for (const p of PRIMES) while (m % p === 0) { out[p] = (out[p] || 0) + 1; m /= p; }
    if (m !== 1) throw new Error("factorInt: prime too large");
    return out;
  }
  /** Σ c·ln(m) for whole m ≥ 1, regrouped by primes: [[c, LN(p)], …]. */
  function lnCombine(list) {
    const acc = {};
    for (const [c, m] of list) {
      const fz = factorInt(m);
      for (const p in fz) acc[p] = (acc[p] || F(0)).add(Frac.of(c).mul(fz[p]));
    }
    return PRIMES.filter((p) => acc[p] && acc[p].n !== 0).map((p) => [acc[p], LN(p)]);
  }
  /** ln m written as a sum over primes, for the step that regroups: ln 12 = 2 ln 2 + ln 3. */
  const lnPrimes = (m) => ex(lnCombine([[1, m]])).h;

  // ---- polynomials: Frac coefficients, lowest power first --------------------------------------
  const ptrim = (a) => { a = a.map(Frac.of); while (a.length > 1 && a[a.length - 1].n === 0) a.pop(); return a; };
  const padd = (a, b) => ptrim(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => Frac.of(a[i] || 0).add(Frac.of(b[i] || 0))));
  const pscale = (a, c) => ptrim(a.map((v) => Frac.of(v).mul(c)));
  const psub = (a, b) => padd(a, pscale(b, -1));
  const pmul = (a, b) => {
    const out = Array.from({ length: a.length + b.length - 1 }, () => F(0));
    a.forEach((p, i) => b.forEach((q, j) => { out[i + j] = out[i + j].add(Frac.of(p).mul(q)); }));
    return ptrim(out);
  };
  const pint = (a) => ptrim([F(0), ...a.map((c, i) => Frac.of(c).div(i + 1))]);
  const pder = (a) => ptrim(a.length > 1 ? a.slice(1).map((c, i) => Frac.of(c).mul(i + 1)) : [0]);
  const peval = (a, x0) => a.reduce((acc, c, i) => acc.add(Frac.of(c).mul(Frac.of(x0).pow(i))), F(0));
  const pdef = (a, lo, hi) => { const A = pint(a); return peval(A, hi).sub(peval(A, lo)); };
  const ph = (a, v = "x") => M.poly(a.slice().reverse(), v);
  const ps = (a, v = "x") => a.map((c, i) => `(${typed(c)})*${v}^${i}`).join(" + ");
  /** Powers above 2 that a polynomial shows (structural constants for the number audit). */
  const pows = (a) => a.map((c, i) => (Frac.of(c).n !== 0 && i > 2 ? i : 0)).filter(Boolean);
  const fvs = (a) => a.map(fv);

  // ---- graphs ----------------------------------------------------------------------------------
  const curvePts = (fx, fy, t0, t1, N = 90) => Array.from({ length: N + 1 }, (_, i) => { const tt = t0 + ((t1 - t0) * i) / N; return [fx(tt), fy(tt)]; });
  const polyline = (pts, role = "primary") => pts.slice(1).map((p, i) => ({ t: "seg", a: pts[i], b: p, role }));
  /** The region between two curves (functions of x) on [lo, hi], as a filled polygon. */
  const region = (top, bot, lo, hi, N = 40) => {
    const up = curvePts((tt) => tt, top, lo, hi, N), dn = curvePts((tt) => tt, bot, hi, lo, N);
    return { t: "poly", p: up.concat(dn), fill: true, role: "highlight" };
  };
  const nice = (v) => Math.ceil(v + 0.5);

  // ==== Techniques of integration ================================================================
  const trigP = (fn, k, v = x) => `${k === 1 ? fn : M.sup(fn, k)} ${v}`;            // sin³ x
  const trigA = (fn, b, v = x) => `${fn}(${kv(b, v)})`;                                // sin(2x)
  const upow = (k) => (k === 0 ? "1" : xp(k, u));
  const uOver = (k) => (k === 1 ? u : M.frac(xp(k, u), n(k)));
  const dn = (r) => M.poly([1, -r]);                                                   // x − r
  const fac = (r) => (r === 0 ? x : `(${dn(r)})`);
  const lim = (to, v = V("b"), side = "") => `${M.sub("lim", `${v} → ${to}${side ? `<sup>${side}</sup>` : ""}`)} `;

  P.define("calculus2", {
    // ---- C2.1 Integration by parts ---------------------------------------------------------------
    "C2.1": {
      title: "Integration by parts",
      generate(r, level) {
        if (level === 1) {
          const k = r.pick([-2, -1, 1, 2, 3]), b = r.pick([1, 2]);
          const kb = k * b, k2 = k * k, ik = F(1, k), bk = F(b, k), c0 = F(1, k2), c1 = bk.sub(c0);
          const E = ek(k), Eb = EXP(kb).h, B = n(b);
          const ans = ex([[c1, EXP(kb)], [c0, ONE]]);
          return {
            prompt: `Evaluate ${M.eq(`${integ(0, B)} ${x}${E} ${dif(x)}`)} Give the exact value.`,
            steps: [
              `Choose ${u} = ${x} (differentiating makes it 1) and ${dif(V("v"))} = ${E} ${dif(x)}. Then ${dif(u)} = ${dif(x)} and ${V("v")} = ${kv(ik, E)}.`,
              `By parts, ${integ(0, B)} ${x}${E} ${dif(x)} = [${kv(ik, `${x}${E}`)}]${bar(0, B)}${M.term(ik.neg(), `${integ(0, B)} ${E} ${dif(x)}`)}.`,
              `The boundary term: at ${x} = ${B} it is ${kv(bk, Eb)}; at ${x} = 0 it is 0.`,
              `The integral left: ${integ(0, B)} ${E} ${dif(x)} = [${kv(ik, E)}]${bar(0, B)} = ${kv(ik, `(${Eb} − 1)`)}. With the factor ${f(ik.neg())} in front, this part is ${kv(c0.neg(), `(${Eb} − 1)`)}.`,
              `Add: ${kv(bk, Eb)} − ${kv(c0, `(${Eb} − 1)`)} = ${ans.h}.`,
            ],
            answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
            vals: { kb, k2, ik: fv(ik), bk: fv(bk), c0: fv(c0), c1: fv(c1), nik: fv(ik.neg()) }, params: { k, b },
          };
        }
        if (level === 2) {
          const kind = r.pick(["exp", "trig", "log"]);
          if (kind === "exp") {
            const k = r.pick([-1, 1, 2]), b = r.pick([1, 2]);
            const kb = k * b, bb = b * b, d1 = F(1, k), d2 = F(2, k * k), d3 = F(2, k * k * k), i2 = F(1, k * k), i3 = F(1, k * k * k);
            const A = d1.mul(bb).sub(d2.mul(b)).add(d3);
            const ans = ex([[A, EXP(kb)], [d3.neg(), ONE]]);
            const E = ek(k), Eb = EXP(kb).h, B = n(b), G = V("G");
            const table = M.table(["sign", `${u} and its derivatives`, `${dif(V("v"))} and its integrals`],
              [["+", M.sup(x, 2), E], ["−", `2${x}`, kv(d1, E)], ["+", "2", kv(i2, E)], ["", "0", kv(i3, E)]]);
            return {
              prompt: `Evaluate ${M.eq(`${integ(0, B)} ${M.sup(x, 2)}${E} ${dif(x)}`)} Give the exact value.`,
              steps: [
                `Use the tabular method: differentiate ${M.sup(x, 2)} down to 0 and integrate ${E} repeatedly. ${table}`,
                `Multiply each entry of the left column by the entry one row lower on the right, with signs +, −, +: ${G}(${x}) = ${E}(${ph([d3, d2.neg(), d1])}) is an antiderivative.`,
                `At ${x} = ${B}: ${G}(${B}) = ${Eb}(${fp(d1)} · ${n(bb)} − ${fp(d2)} · ${B} + ${fp(d3)}) = ${kv(A, Eb)}.`,
                `At ${x} = 0: ${G}(0) = 1 · ${fp(d3)} = ${f(d3)}.`,
                `${G}(${B}) − ${G}(0) = ${kv(A, Eb)} − ${fp(d3)} = ${ans.h}.`,
              ],
              answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
              vals: { kb, bb, d1: fv(d1), d2: fv(d2), d3: fv(d3), i2: fv(i2), i3: fv(i3), A: fv(A) }, params: { kind, k, b },
            };
          }
          if (kind === "trig") {
            const g = r.pick(["sin", "cos"]), q = r.pick([F(1, 2), F(1)]);
            const cb = q.eq(1) ? -1 : 0, sb = q.eq(1) ? 0 : 1, qq = q.mul(q);
            let c2, c1, c0, g0, Ghtml, I;
            if (g === "sin") {
              c2 = qq.mul(-cb); c1 = q.mul(2 * sb); c0 = F(2 * cb); g0 = F(2);
              Ghtml = `−${M.sup(x, 2)} cos ${x} + 2${x} sin ${x} + 2 cos ${x}`;
              I = [`sin ${x}`, `−cos ${x}`, `−sin ${x}`, `cos ${x}`];
            } else {
              c2 = qq.mul(sb); c1 = q.mul(2 * cb); c0 = F(-2 * sb); g0 = F(0);
              Ghtml = `${M.sup(x, 2)} sin ${x} + 2${x} cos ${x} − 2 sin ${x}`;
              I = [`cos ${x}`, `sin ${x}`, `−cos ${x}`, `−sin ${x}`];
            }
            const Gb = ex([[c2, PI2], [c1, PI], [c0, ONE]]), c0f = c0.sub(g0);
            const ans = ex([[c2, PI2], [c1, PI], [c0f, ONE]]);
            const beta = piq(q), G = V("G");
            const table = M.table(["sign", `${u} and its derivatives`, `${dif(V("v"))} and its integrals`],
              [["+", M.sup(x, 2), I[0]], ["−", `2${x}`, I[1]], ["+", "2", I[2]], ["", "0", I[3]]]);
            const bp = `(${beta})`;
            const sub = g === "sin"
              ? `−${M.sup(bp, 2)} · ${np(cb)} + 2 · ${beta} · ${n(sb)} + 2 · ${np(cb)}`
              : `${M.sup(bp, 2)} · ${n(sb)} + 2 · ${beta} · ${np(cb)} − 2 · ${n(sb)}`;
            return {
              prompt: `Evaluate ${M.eq(`${integ(0, beta)} ${M.sup(x, 2)} ${g} ${x} ${dif(x)}`)} Give the exact value.`,
              steps: [
                `Use the tabular method: differentiate ${M.sup(x, 2)} down to 0 and integrate ${g} ${x} repeatedly. ${table}`,
                `Multiply along the diagonals with signs +, −, +: ${G}(${x}) = ${Ghtml}.`,
                `At ${x} = ${beta}, cos ${beta} = ${n(cb)} and sin ${beta} = ${n(sb)}: ${G}(${beta}) = ${sub} = ${Gb.h}.`,
                `At ${x} = 0: ${G}(0) = ${n(g0)}.`,
                `${G}(${beta}) − ${G}(0) = ${ans.h}.`,
              ],
              answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
              vals: { c2: fv(c2), c1: fv(c1), c0: fv(c0), g0: fv(g0), c0f: fv(c0f), cb, sb }, params: { kind, g, q: fv(q) },
            };
          }
          // ∫₁ᵉ xᵐ ln x dx
          const m = r.pick([0, 1, 2, 3]), m1 = m + 1, mm = m1 * m1, im = F(1, m1), c0 = F(1, mm), ce = F(m, mm);
          const ans = ex([[ce, EXP(m1)], [c0, ONE]]);
          const vh = kv(im, xp(m1)), Em = EXP(m1).h;
          const integrand = m === 0 ? `ln ${x}` : `${xp(m)} ln ${x}`;
          return {
            prompt: `Evaluate ${M.eq(`${integ(1, "e")} ${integrand} ${dif(x)}`)} Give the exact value.`,
            steps: [
              `The logarithm comes first in LIATE: ${u} = ln ${x} and ${dif(V("v"))} = ${m === 0 ? `${dif(x)} (the hidden factor 1)` : `${xp(m)} ${dif(x)}`}. Then ${dif(u)} = ${M.frac(dif(x), x)} and ${V("v")} = ${vh}.`,
              `By parts: ${integ(1, "e")} ${integrand} ${dif(x)} = [${vh} ln ${x}]${bar(1, "e")} − ${integ(1, "e")} ${m === 0 ? "1" : kv(im, xp(m))} ${dif(x)}, since ${vh} · ${M.frac("1", x)} = ${m === 0 ? "1" : kv(im, xp(m))}.`,
              `The boundary term: ln e = 1 and ln 1 = 0, so it is ${kv(im, Em)} − 0 = ${kv(im, Em)}.`,
              `The integral left: [${kv(c0, xp(m1))}]${bar(1, "e")} = ${kv(c0, `(${Em} − 1)`)}.`,
              `Subtract: ${kv(im, Em)} − ${kv(c0, `(${Em} − 1)`)} = ${ans.h}.`,
            ],
            answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
            vals: { m1, mm, im: fv(im), c0: fv(c0), ce: fv(ce) }, params: { kind: "log", m },
          };
        }
        // level 3: the cyclic case, ∫₀^π e^{ax} sin(bx) dx or cos(bx)
        const a = r.pick([1, 2, -1]), b = r.pick([1, 2, 3]), g = r.pick(["sin", "cos"]);
        const D = a * a + b * b, aa = a * a, sg = b % 2 === 0 ? 1 : -1;
        const ia = F(1, a), ba = F(b, a), ba2 = F(b, aa), bba2 = F(b * b, aa);
        const E = ek(a), sn = trigA("sin", b), cs = trigA("cos", b), I = V("I"), Ep = EPI(a).h;
        const bp = kv(b, "π");
        let cE, c0, at0, steps;
        if (g === "sin") {
          cE = F(-b * sg, D); at0 = F(-b, D); c0 = at0.neg();
          steps = [
            `Call the integral ${I} = ∫ ${E} ${sn} ${dif(x)}. First round: ${u} = ${sn}, ${dif(V("v"))} = ${E} ${dif(x)}, so ${dif(u)} = ${kv(b, cs)} ${dif(x)} and ${V("v")} = ${kv(ia, E)}: ${I} = ${kv(ia, `${E} ${sn}`)}${M.term(ba.neg(), `∫ ${E} ${cs} ${dif(x)}`)}.`,
            `Second round, on ∫ ${E} ${cs} ${dif(x)}: ${u} = ${cs}, ${dif(u)} = ${kv(-b, sn)} ${dif(x)}. It equals ${kv(ia, `${E} ${cs}`)}${M.term(ba, I)}.`,
            `Substitute: ${I} = ${kv(ia, `${E} ${sn}`)}${M.term(ba2.neg(), `${E} ${cs}`)}${M.term(bba2.neg(), I)}. The original integral has come back.`,
            `Move it to the left: (1 + ${f(bba2)})${I} = ${kv(ia, `${E} ${sn}`)}${M.term(ba2.neg(), `${E} ${cs}`)}. Since 1 + ${f(bba2)} = ${f(F(D, aa))}, multiply by ${f(F(aa, D))}: ${I} = ${M.frac(`${E}(${kv(a, sn)}${M.term(-b, cs)})`, n(D))}.`,
            `From 0 to π, with sin(${bp}) = 0 and cos(${bp}) = ${n(sg)}: at π the antiderivative is ${M.frac(`${Ep} · (0 − ${n(b)} · ${np(sg)})`, n(D))} = ${kv(cE, Ep)}; at 0 it is ${M.frac(`0 − ${n(b)}`, n(D))} = ${f(at0)}.`,
            `Subtract: ${kv(cE, Ep)} − ${fp(at0)} = ${ex([[cE, EPI(a)], [c0, ONE]]).h}.`,
          ];
        } else {
          cE = F(a * sg, D); at0 = F(a, D); c0 = at0.neg();
          steps = [
            `Call the integral ${I} = ∫ ${E} ${cs} ${dif(x)}. First round: ${u} = ${cs}, ${dif(V("v"))} = ${E} ${dif(x)}, so ${dif(u)} = ${kv(-b, sn)} ${dif(x)} and ${V("v")} = ${kv(ia, E)}: ${I} = ${kv(ia, `${E} ${cs}`)}${M.term(ba, `∫ ${E} ${sn} ${dif(x)}`)}.`,
            `Second round, on ∫ ${E} ${sn} ${dif(x)}: ${u} = ${sn}, ${dif(u)} = ${kv(b, cs)} ${dif(x)}. It equals ${kv(ia, `${E} ${sn}`)}${M.term(ba.neg(), I)}.`,
            `Substitute: ${I} = ${kv(ia, `${E} ${cs}`)}${M.term(ba2, `${E} ${sn}`)}${M.term(bba2.neg(), I)}. The original integral has come back.`,
            `Move it to the left: (1 + ${f(bba2)})${I} = ${kv(ia, `${E} ${cs}`)}${M.term(ba2, `${E} ${sn}`)}. Since 1 + ${f(bba2)} = ${f(F(D, aa))}, multiply by ${f(F(aa, D))}: ${I} = ${M.frac(`${E}(${kv(a, cs)}${M.term(b, sn)})`, n(D))}.`,
            `From 0 to π, with sin(${bp}) = 0 and cos(${bp}) = ${n(sg)}: at π the antiderivative is ${M.frac(`${Ep} · (${n(a)} · ${np(sg)} + 0)`, n(D))} = ${kv(cE, Ep)}; at 0 it is ${M.frac(`${n(a)} + 0`, n(D))} = ${f(at0)}.`,
            `Subtract: ${kv(cE, Ep)} − ${fp(at0)} = ${ex([[cE, EPI(a)], [c0, ONE]]).h}.`,
          ];
        }
        const ans = ex([[cE, EPI(a)], [c0, ONE]]);
        return {
          prompt: `Evaluate ${M.eq(`${integ(0, "π")} ${E} ${g === "sin" ? sn : cs} ${dif(x)}`)} Give the exact value.`,
          steps, answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
          vals: { D, aa, sg, ia: fv(ia), ba: fv(ba), ba2: fv(ba2), bba2: fv(bba2), Da: fv(F(D, aa)), aD: fv(F(aa, D)), cE: fv(cE), at0: fv(at0), c0: fv(c0) },
          params: { a, b, g },
        };
      },
    },

    // ---- C2.2 Trigonometric integrals ------------------------------------------------------------
    "C2.2": {
      title: "Trigonometric integrals",
      generate(r, level) {
        const oddPower = (m, nn) => {
          // ∫₀^{π/2} (odd one)^m (other)^nn dx with m = 3 or 5
          const odd = r.pick(["sin", "cos"]), other = odd === "sin" ? "cos" : "sin";
          const half = (m - 1) / 2;
          const coefs = half === 1 ? [[1, nn], [-1, nn + 2]] : [[1, nn], [-2, nn + 2], [1, nn + 4]];
          const ans = coefs.reduce((acc, [c, k]) => acc.add(F(c, k + 1)), F(0));
          const integrand = nn === 0 ? trigP(odd, m) : `${trigP(odd, m)} ${trigP(other, nn)}`;
          const conv = half === 1 ? `(1 − ${M.sup(u, 2)})` : `${M.sup(`(1 − ${M.sup(u, 2)})`, 2)}`;
          const poly = coefs.map(([c, k], i) => (i === 0 ? upow(k) : M.term(c, upow(k)))).join("");
          const anti = coefs.map(([c, k], i) => (i === 0 ? uOver(k + 1) : M.term(c, uOver(k + 1)))).join("");
          const atOne = coefs.map(([c, k], i) => (i === 0 ? f(F(c, k + 1)) : M.term(F(c, k + 1)))).join("");
          const sub = odd === "sin"
            ? `Let ${u} = cos ${x}, so ${dif(u)} = −sin ${x} ${dif(x)}. The limits ${x} = 0 and ${x} = ${piq(F(1, 2))} become ${u} = 1 and ${u} = 0, and the minus sign flips them back: ${integ(0, 1)} ${conv}${nn ? ` ${upow(nn)}` : ""} ${dif(u)}`
            : `Let ${u} = sin ${x}, so ${dif(u)} = cos ${x} ${dif(x)}. The limits ${x} = 0 and ${x} = ${piq(F(1, 2))} become ${u} = 0 and ${u} = 1: ${integ(0, 1)} ${conv}${nn ? ` ${upow(nn)}` : ""} ${dif(u)}`;
          return {
            prompt: `Evaluate ${M.eq(`${integ(0, piq(F(1, 2)))} ${integrand} ${dif(x)}`)}`,
            steps: [
              `The power of ${odd} is odd: save one factor ${odd} ${x} and turn the rest into ${other} with ${M.sup(odd, 2)} ${x} = 1 − ${M.sup(other, 2)} ${x}: the integrand is ${half === 1 ? `(1 − ${M.sup(other, 2)} ${x})` : M.sup(`(1 − ${M.sup(other, 2)} ${x})`, 2)}${nn ? ` ${trigP(other, nn)}` : ""} · ${odd} ${x}.`,
              `${sub}.`,
              `Expand: ${integ(0, 1)} (${poly}) ${dif(u)} = [${anti}]${bar(0, 1)}.`,
              `At ${u} = 1 this is ${atOne} = ${f(ans)}; at ${u} = 0 it is 0. The integral is ${f(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { ks: coefs.map(([, k]) => k), ks1: coefs.map(([, k]) => k + 1), terms: coefs.map(([c, k]) => fv(F(c, k + 1))), ans: fv(ans) },
            params: { kind: m === 3 ? "three" : "five", m, nn, odd }, consts: [m, 4],
          };
        };
        if (level === 1) return oddPower(3, r.pick([0, 1, 2, 4]));
        if (level === 2) {
          const kind = r.pick(["reduce", "five", "tan"]);
          if (kind === "five") return oddPower(5, r.pick([0, 1, 2, 3]));
          const q = r.pick(kind === "tan" ? [F(1, 4), F(1, 3), F(1, 6)] : [F(1, 4), F(1, 3), F(1, 6), F(1, 2)]);
          const beta = piq(q);
          if (kind === "tan") {
            // tan β: 1, √3, √3/3
            const tq1 = q.eq(F(1, 4)) ? F(1) : F(0), tq3 = q.eq(F(1, 3)) ? F(1) : q.eq(F(1, 6)) ? F(1, 3) : F(0);
            const tanB = ex([[tq1, ONE], [tq3, SQ(3)]]), ans = ex([[tq1, ONE], [tq3, SQ(3)], [q.neg(), PI]]);
            return {
              prompt: `Evaluate ${M.eq(`${integ(0, beta)} ${M.sup("tan", 2)} ${x} ${dif(x)}`)} Give the exact value.`,
              steps: [
                `Use the identity ${M.sup("tan", 2)} ${x} = ${M.sup("sec", 2)} ${x} − 1, since ${M.sup("sec", 2)} ${x} has the antiderivative tan ${x}.`,
                `${integ(0, beta)} (${M.sup("sec", 2)} ${x} − 1) ${dif(x)} = [tan ${x} − ${x}]${bar(0, beta)}.`,
                `tan ${beta} = ${tanB.h} and tan 0 = 0, so the value is ${ans.h}.`,
              ],
              answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
              vals: { tq1: fv(tq1), tq3: fv(tq3), q: fv(q) }, params: { kind, q: fv(q) }, consts: [3],
            };
          }
          const g = r.pick(["sin", "cos"]), sgn = g === "sin" ? -1 : 1;
          // sin 2β: 1 (π/4), √3/2 (π/3, π/6), 0 (π/2)
          const s1 = q.eq(F(1, 4)) ? F(1) : F(0), s3 = q.eq(F(1, 3)) || q.eq(F(1, 6)) ? F(1, 2) : F(0);
          const sin2b = ex([[s1, ONE], [s3, SQ(3)]]);
          const q2 = q.div(2), ans = ex([[q2, PI], [s1.mul(sgn).div(4), ONE], [s3.mul(sgn).div(4), SQ(3)]]);
          const pm = sgn < 0 ? "−" : "+";
          return {
            prompt: `Evaluate ${M.eq(`${integ(0, beta)} ${M.sup(g, 2)} ${x} ${dif(x)}`)} Give the exact value.`,
            steps: [
              `An even power: use the power-reduction identity ${M.sup(g, 2)} ${x} = ${M.frac(`1 ${pm} cos 2${x}`, "2")}.`,
              `${integ(0, beta)} ${M.frac(`1 ${pm} cos 2${x}`, "2")} ${dif(x)} = [${M.frac(x, "2")} ${pm} ${M.frac(`sin 2${x}`, "4")}]${bar(0, beta)}.`,
              `At ${x} = ${beta}: ${M.frac(x, "2")} = ${piq(q2)} and sin 2${x} = sin ${piq(q.mul(2))} = ${sin2b.h}. At ${x} = 0 the bracket is 0.`,
              `The value is ${piq(q2)} ${pm} ${M.frac("1", "4")} · ${sin2b.h === "0" ? "0" : `(${sin2b.h})`} = ${ans.h}.`,
            ],
            answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
            vals: { q: fv(q), q2: fv(q2), s1: fv(s1), s3: fv(s3), twoq: fv(q.mul(2)), c1: fv(s1.mul(sgn).div(4)), c3: fv(s3.mul(sgn).div(4)) },
            params: { kind, g, q: fv(q) }, consts: [3, 4],
          };
        }
        // level 3: product to sum, ∫₀^π sin(ax) cos(bx) dx with a + b odd
        let a, b;
        do { a = r.int(1, 6); b = r.int(1, 6); } while (a === b || (a + b) % 2 === 0);
        const sum = a + b, diff = Math.abs(a - b), sgn = a > b ? 1 : -1;
        const ans = F(1, sum).add(F(sgn, diff));
        const split = sgn > 0
          ? `½[${trigA("sin", diff)} + ${trigA("sin", sum)}]`
          : `½[${trigA("sin", sum)} − ${trigA("sin", diff)}]`;
        const half = M.frac("1", "2");
        return {
          prompt: `Evaluate ${M.eq(`${integ(0, "π")} ${trigA("sin", a)} ${trigA("cos", b)} ${dif(x)}`)}`,
          graph: graph({ view: [-0.3, 3.5, -1.2, 1.2], items: [{ t: "fn", e: `sin(${a}x)*cos(${b}x)` }, region((xx) => Math.sin(a * xx) * Math.cos(b * xx), () => 0, 0, Math.PI, 80)] }),
          steps: [
            `Product to sum: sin ${V("A")} cos ${V("B")} = ${half}[sin(${V("A")} − ${V("B")}) + sin(${V("A")} + ${V("B")})]. Here ${V("A")} − ${V("B")} = ${kv(a - b, x)}${sgn < 0 ? `, and ${trigA("sin", a - b)} = −${trigA("sin", diff)}` : ""}, so the integrand is ${split.replace("½", half)}.`,
            `For a whole number ${V("k")}, ${integ(0, "π")} sin(${V("k")}${x}) ${dif(x)} = [${M.frac(`−cos(${V("k")}${x})`, V("k"))}]${bar(0, "π")} = ${M.frac(`1 − cos(${V("k")}π)`, V("k"))}, which is ${M.frac("2", V("k"))} when ${V("k")} is odd. Both ${n(sum)} and ${n(diff)} are odd.`,
            `So the integral is ${half}(${M.frac("2", n(sum))} ${sgn > 0 ? "+" : "−"} ${M.frac("2", n(diff))}) = ${M.frac("1", n(sum))} ${sgn > 0 ? "+" : "−"} ${M.frac("1", n(diff))} = ${f(ans)}.`,
          ],
          answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
          vals: { sum, diff, amb: a - b, ans: fv(ans) }, params: { a, b },
        };
      },
    },

    // ---- C2.3 Trigonometric substitution ------------------------------------------------------------
    "C2.trig-sub": {
      title: "Trigonometric substitution",
      generate(r, level) {
        if (level === 1) {
          const a = r.int(2, 7), full = r.chance(0.5), aa = a * a, A = n(a);
          const coef = F(aa, full ? 2 : 4), ans = ex([[coef, PI]]);
          const lo = full ? -a : 0;
          return {
            prompt: `Evaluate ${M.eq(`${integ(n(lo), A)} ${M.sqrt(`${n(aa)} − ${M.sup(x, 2)}`)} ${dif(x)}`)} with a trigonometric substitution. Give the exact value.`,
            graph: graph({ view: [-a - 1, a + 1, -1, a + 1], equal: true, items: [{ t: "fn", e: `sqrt(${aa} - x^2)` }, region((xx) => Math.sqrt(Math.max(0, aa - xx * xx)), () => 0, lo, a, 60)] }),
            steps: [
              `The root ${M.sqrt(`${M.sup(V("a"), 2)} − ${M.sup(x, 2)}`)} with ${V("a")} = ${A} calls for ${x} = ${A} sin ${th}: then ${dif(x)} = ${A} cos ${th} ${dif(th)} and ${M.sqrt(`${n(aa)} − ${n(aa)} ${M.sup("sin", 2)} ${th}`)} = ${A} cos ${th} (cos ${th} ≥ 0 here).`,
              `Limits: ${x} = ${n(lo)} gives ${th} = ${full ? `−${piq(F(1, 2))}` : "0"}, and ${x} = ${A} gives ${th} = ${piq(F(1, 2))}.`,
              `The integral becomes ${integ(full ? `−${piq(F(1, 2))}` : "0", piq(F(1, 2)))} ${n(aa)} ${M.sup("cos", 2)} ${th} ${dif(th)} = ${n(aa)}[${M.frac(th, "2")} + ${M.frac(`sin 2${th}`, "4")}]${bar(full ? `−${piq(F(1, 2))}` : "0", piq(F(1, 2)))}, using ${M.sup("cos", 2)} ${th} = ${M.frac(`1 + cos 2${th}`, "2")}.`,
              `sin 2${th} is 0 at both limits, so the bracket equals ${piq(F(1, full ? 2 : 4))} and the value is ${n(aa)} · ${piq(F(1, full ? 2 : 4))} = ${ans.h}: the area of ${full ? "half" : "a quarter"} of a circle of radius ${A}.`,
            ],
            answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
            vals: { aa, lo, coef: fv(coef) }, params: { a, full: full ? 1 : 0 }, consts: [4],
          };
        }
        if (level === 2) {
          const kind = r.pick(["tan", "sec", "sin"]);
          if (kind === "tan") {
            const a = r.int(2, 5), aa = a * a, a3 = aa * a, A = n(a), coef = F(1, 2 * aa), ans = ex([[coef, SQ(2)]]);
            return {
              prompt: `Evaluate ${M.eq(`${integ(0, A)} ${M.frac(dif(x), M.sup(`(${M.sup(x, 2)} + ${n(aa)})`, `3/2`))}`)} Give the exact value.`,
              steps: [
                `The sum ${M.sup(x, 2)} + ${M.sup(A, 2)} calls for ${x} = ${A} tan ${th}: ${dif(x)} = ${A} ${M.sup("sec", 2)} ${th} ${dif(th)} and ${M.sup(x, 2)} + ${n(aa)} = ${n(aa)}(${M.sup("tan", 2)} ${th} + 1) = ${n(aa)} ${M.sup("sec", 2)} ${th}, so ${M.sup(`(${M.sup(x, 2)} + ${n(aa)})`, "3/2")} = ${n(a3)} ${M.sup("sec", 3)} ${th}.`,
                `Limits: ${x} = 0 gives ${th} = 0; ${x} = ${A} gives tan ${th} = 1, so ${th} = ${piq(F(1, 4))}.`,
                `The integrand becomes ${M.frac(`${A} ${M.sup("sec", 2)} ${th}`, `${n(a3)} ${M.sup("sec", 3)} ${th}`)} = ${M.frac("1", n(aa))} cos ${th}.`,
                `${M.frac("1", n(aa))}[sin ${th}]${bar("0", piq(F(1, 4)))} = ${M.frac("1", n(aa))} · ${M.frac(M.sqrt("2"), "2")} = ${ans.h}.`,
              ],
              answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
              vals: { aa, a3, coef: fv(coef) }, params: { kind, a }, consts: [3, 4],
            };
          }
          if (kind === "sec") {
            const a = r.int(2, 5), aa = a * a, A = n(a), a2 = 2 * a, coef = F(1, 2 * aa), ans = ex([[coef, SQ(3)]]);
            return {
              prompt: `Evaluate ${M.eq(`${integ(A, n(a2))} ${M.frac(dif(x), `${M.sup(x, 2)}${M.sqrt(`${M.sup(x, 2)} − ${n(aa)}`)}`)}`)} Give the exact value.`,
              steps: [
                `The difference ${M.sup(x, 2)} − ${M.sup(A, 2)} calls for ${x} = ${A} sec ${th}: ${dif(x)} = ${A} sec ${th} tan ${th} ${dif(th)}, ${M.sqrt(`${M.sup(x, 2)} − ${n(aa)}`)} = ${A} tan ${th} (tan ${th} ≥ 0 here) and ${M.sup(x, 2)} = ${n(aa)} ${M.sup("sec", 2)} ${th}.`,
                `Limits: ${x} = ${A} gives sec ${th} = 1, ${th} = 0; ${x} = ${n(a2)} gives sec ${th} = 2, so cos ${th} = ${M.frac("1", "2")} and ${th} = ${piq(F(1, 3))}.`,
                `The integrand becomes ${M.frac(`${A} sec ${th} tan ${th}`, `${n(aa)} ${M.sup("sec", 2)} ${th} · ${A} tan ${th}`)} = ${M.frac("1", n(aa))} cos ${th}.`,
                `${M.frac("1", n(aa))}[sin ${th}]${bar("0", piq(F(1, 3)))} = ${M.frac("1", n(aa))} · ${M.frac(M.sqrt("3"), "2")} = ${ans.h}.`,
              ],
              answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
              vals: { aa, a2, coef: fv(coef) }, params: { kind, a }, consts: [3],
            };
          }
          const a = r.pick([2, 4, 6]), aa = a * a, a3 = aa * a, A = n(a), ha = a / 2, coef = F(1, 3 * aa), ans = ex([[coef, SQ(3)]]);
          return {
            prompt: `Evaluate ${M.eq(`${integ(0, n(ha))} ${M.frac(dif(x), M.sup(`(${n(aa)} − ${M.sup(x, 2)})`, "3/2"))}`)} Give the exact value.`,
            steps: [
              `The difference ${M.sup(A, 2)} − ${M.sup(x, 2)} calls for ${x} = ${A} sin ${th}: ${dif(x)} = ${A} cos ${th} ${dif(th)} and ${n(aa)} − ${M.sup(x, 2)} = ${n(aa)} ${M.sup("cos", 2)} ${th}, so ${M.sup(`(${n(aa)} − ${M.sup(x, 2)})`, "3/2")} = ${n(a3)} ${M.sup("cos", 3)} ${th}.`,
              `Limits: ${x} = 0 gives ${th} = 0; ${x} = ${n(ha)} gives sin ${th} = ${M.frac("1", "2")}, so ${th} = ${piq(F(1, 6))}.`,
              `The integrand becomes ${M.frac(`${A} cos ${th}`, `${n(a3)} ${M.sup("cos", 3)} ${th}`)} = ${M.frac("1", n(aa))} ${M.sup("sec", 2)} ${th}.`,
              `${M.frac("1", n(aa))}[tan ${th}]${bar("0", piq(F(1, 6)))} = ${M.frac("1", n(aa))} · ${M.frac("1", M.sqrt("3"))} = ${M.frac("1", n(aa))} · ${M.frac(M.sqrt("3"), "3")} = ${ans.h}.`,
            ],
            answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
            vals: { aa, a3, ha, coef: fv(coef) }, params: { kind, a }, consts: [3, 6],
          };
        }
        // level 3: complete the square first
        const h = r.nonzero(-4, 4), a = r.int(2, 4), aa = a * a, c = h * h + aa, hh = h * h;
        const sym = r.chance(0.5), pw = r.pick([1, 3]);   // denominator power 1 or 3/2
        const lo = sym ? -h - a : -h, hi = -h + a;
        const thLo = sym ? `−${piq(F(1, 4))}` : "0", thHi = piq(F(1, 4));
        const den = M.poly([1, 2 * h, c]);
        let ans, last, integrandTh, cf;
        if (pw === 1) {
          const coef = F(sym ? 1 : 1, (sym ? 2 : 4) * a);
          ans = ex([[coef, PI]]); cf = coef;
          integrandTh = `${M.frac(`${n(a)} ${M.sup("sec", 2)} ${th}`, `${n(aa)} ${M.sup("sec", 2)} ${th}`)} = ${M.frac("1", n(a))}`;
          last = `${M.frac("1", n(a))}[${th}]${bar(thLo, thHi)} = ${M.frac("1", n(a))} · ${piq(F(1, sym ? 2 : 4))} = ${ans.h}.`;
        } else {
          const coef = F(1, (sym ? 1 : 2) * aa);
          ans = ex([[coef, SQ(2)]]); cf = coef;
          integrandTh = `${M.frac(`${n(a)} ${M.sup("sec", 2)} ${th}`, `${n(aa * a)} ${M.sup("sec", 3)} ${th}`)} = ${M.frac("1", n(aa))} cos ${th}`;
          last = `${M.frac("1", n(aa))}[sin ${th}]${bar(thLo, thHi)} = ${M.frac("1", n(aa))} · ${sym ? `(${M.frac(M.sqrt("2"), "2")} + ${M.frac(M.sqrt("2"), "2")})` : M.frac(M.sqrt("2"), "2")} = ${ans.h}.`;
        }
        const denP = pw === 1 ? den : M.sup(`(${den})`, "3/2");
        const w = V("w");
        const topf = (xx) => 1 / Math.pow((xx + h) * (xx + h) + aa, pw === 1 ? 1 : 1.5);
        const ymax = 1 / Math.pow(aa, pw === 1 ? 1 : 1.5);
        return {
          prompt: `Evaluate ${M.eq(`${integ(n(lo), n(hi))} ${M.frac(dif(x), denP)}`)} Give the exact value.`,
          graph: graph({ view: [Math.min(lo, -h - a) - 2, hi + 2, -0.15 * ymax, 1.3 * ymax], items: [{ t: "fn", e: `1/((x + (${h}))^2 + ${aa})^${pw === 1 ? 1 : 1.5}` }, region(topf, () => 0, lo, hi)] }),
          steps: [
            `Complete the square: ${den} = ${M.sup(`(${M.poly([1, h])})`, 2)} + ${n(c)} − ${n(hh)} = ${M.sup(`(${M.poly([1, h])})`, 2)} + ${n(aa)}.`,
            `Let ${w} = ${M.poly([1, h])}, ${dif(w)} = ${dif(x)}. The limits become ${w} = ${n(lo + h)} and ${w} = ${n(a)}.`,
            `Now ${M.sup(w, 2)} + ${M.sup(n(a), 2)} calls for ${w} = ${kf(a, `tan ${th}`)}: ${dif(w)} = ${kf(a, `${M.sup("sec", 2)} ${th}`)} ${dif(th)} and ${M.sup(w, 2)} + ${n(aa)} = ${n(aa)} ${M.sup("sec", 2)} ${th}. The limits are ${th} = ${thLo} and ${th} = ${thHi}.`,
            `The integrand becomes ${integrandTh}${pw === 1 ? ` (a constant)` : ""}.`,
            last,
          ],
          answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
          vals: { c, hh, aa, a3: aa * a, lo, hi, wlo: lo + h, twoh: 2 * h, coef: fv(cf) }, params: { h, a, sym: sym ? 1 : 0, pw }, consts: [3, 4],
        };
      },
    },

    // ---- C2.4 Partial fractions --------------------------------------------------------------------
    "C2.3": {
      title: "Partial fractions",
      generate(r, level) {
        if (level === 1) {
          let r1, r2;
          do { r1 = r.int(-5, 5); r2 = r.int(-5, 5); } while (r1 === r2);
          const A = r.nonzero(-5, 5), B = r.nonzero(-5, 5), p = A + B, q = -A * r2 - B * r1;
          const N1 = p * r1 + q, N2 = p * r2 + q, d12 = r1 - r2, d21 = r2 - r1;
          const num = M.poly([p, q]), Av = V("A"), Bv = V("B");
          return {
            prompt: `Find ${Av} and ${Bv} so that ${M.eq(`${M.frac(num, `${fac(r1)}${fac(r2)}`)} = ${M.frac(Av, dn(r1))} + ${M.frac(Bv, dn(r2))}`)} Enter ${Av}, ${Bv}.`,
            steps: [
              `Multiply both sides by ${fac(r1)}${fac(r2)}: ${num} = ${Av}${fac(r2)} + ${Bv}${fac(r1)}.`,
              `Cover-up at ${x} = ${n(r1)} (the ${Bv}-term vanishes): ${n(p)} · ${np(r1)} + ${np(q)} = ${Av}(${n(r1)} − ${np(r2)}), so ${n(N1)} = ${n(d12)}${Av} and ${Av} = ${n(A)}.`,
              `Cover-up at ${x} = ${n(r2)}: ${n(p)} · ${np(r2)} + ${np(q)} = ${Bv}(${n(r2)} − ${np(r1)}), so ${n(N2)} = ${n(d21)}${Bv} and ${Bv} = ${n(B)}.`,
            ],
            answer: { kind: "numbers", values: [A, B], ordered: true }, answerText: `${Av} = ${n(A)}, ${Bv} = ${n(B)}`, answerInput: `${A}, ${B}`,
            vals: { N1, N2, d12, d21, A, B }, params: { p, q, r1, r2 },
          };
        }
        if (level === 2) {
          for (;;) {
            const r1 = r.int(-4, 0), r2 = r.int(-4, 0), lo = r.int(1, 3), hi = r.int(lo + 1, lo + 3);
            if (r1 >= r2) continue;
            const facs = r2 === 0 ? `${x}${fac(r1)}` : `${fac(r1)}${fac(r2)}`;
            const A = r.nonzero(-4, 4), B = r.nonzero(-4, 4), p = A + B, q = -A * r2 - B * r1;
            const bco = -(r1 + r2), cco = r1 * r2;
            const m = [hi - r1, lo - r1, hi - r2, lo - r2];
            const terms = lnCombine([[A, m[0]], [-A, m[1]], [B, m[2]], [-B, m[3]]]);
            if (!terms.length) continue;
            const ans = ex(terms);
            const N1 = p * r1 + q, N2 = p * r2 + q, d12 = r1 - r2;
            const fx = (xx) => (p * xx + q) / ((xx - r1) * (xx - r2));
            const ys = [lo, hi, (lo + hi) / 2].map(fx);
            const yl = Math.min(0, ...ys), yh = Math.max(0, ...ys);
            const lnList = [...new Set(m)].filter((v) => v > 1);
            const comp = lnList.filter((v) => !PRIMES.includes(v));
            return {
              prompt: `Evaluate ${M.eq(`${integ(n(lo), n(hi))} ${M.frac(M.poly([p, q]), M.poly([1, bco, cco]))} ${dif(x)}`)} Give the exact value in terms of logarithms of primes.`,
              graph: graph({ view: [lo - 1, hi + 1, yl - 0.4 * (yh - yl) - 0.2, yh + 0.4 * (yh - yl) + 0.2], items: [{ t: "fn", e: `(${p}x + (${q}))/((x - (${r1}))*(x - (${r2})))` }, region(fx, () => 0, lo, hi)] }),
              steps: [
                `Factor the denominator: ${M.poly([1, bco, cco])} = ${facs}. Write ${M.frac(M.poly([p, q]), facs)} = ${M.frac(V("A"), dn(r1))} + ${M.frac(V("B"), dn(r2))}.`,
                `Cover-up: ${V("A")} = ${M.frac(`${n(p)} · ${np(r1)} + ${np(q)}`, `${n(r1)} − ${np(r2)}`)} = ${M.frac(n(N1), n(d12))} = ${n(A)} and ${V("B")} = ${M.frac(`${n(p)} · ${np(r2)} + ${np(q)}`, `${n(r2)} − ${np(r1)}`)} = ${M.frac(n(N2), n(-d12))} = ${n(B)}.`,
                `Each piece integrates to a logarithm: ${kf(A, `ln|${dn(r1)}|`)}${tf(B, `ln|${dn(r2)}|`)}.`,
                `Evaluate from ${n(lo)} to ${n(hi)}: ${kv(A, `(ln ${n(m[0])} − ln ${n(m[1])})`)}${M.term(B, `(ln ${n(m[2])} − ln ${n(m[3])})`)}.`,
                `${comp.length ? `Write each logarithm with primes (${comp.map((v) => `ln ${n(v)} = ${lnPrimes(v)}`).join(", ")}) and collect` : "Collect like logarithms"}${m.includes(1) ? ", using ln 1 = 0" : ""}: ${ans.h}.`,
              ],
              answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
              vals: { r1, r2, N1, N2, d12, nd12: -d12, A, B, m, coefs: terms.map(([c]) => fv(c)), primes: terms.map(([, b]) => b.k), facNums: lnList.flatMap((v) => Object.entries(factorInt(v)).flatMap(([pp, e]) => [Number(pp), e])) },
              params: { p, q, bco, cco, lo, hi },
            };
          }
        }
        // level 3: an irreducible quadratic factor on [0, 1], or a repeated linear factor
        if (r.chance(0.5)) {
          const rr = r.pick([-1, -2, -3]), A = r.nonzero(-3, 3), B = r.nonzero(-3, 3), C = r.nonzero(-3, 3);
          const n2 = A + B, n1 = C - B * rr, n0 = A - C * rr, Nr = n2 * rr * rr + n1 * rr + n0, rr1 = rr * rr + 1;
          const m1 = 1 - rr, m0 = -rr, B2 = F(B, 2), C4 = F(C, 4);
          const terms = lnCombine([[A, m1], [-A, m0], [B2, 2]]).concat([[C4, PI]]);
          const ans = ex(terms);
          const num = M.poly([n2, n1, n0]), den = `(${dn(rr)})(${M.sup(x, 2)} + 1)`;
          const [Av, Bv, Cv] = ["A", "B", "C"].map(V);
          return {
            prompt: `Evaluate ${M.eq(`${integ(0, 1)} ${M.frac(num, den)} ${dif(x)}`)} Give the exact value.`,
            steps: [
              `The quadratic ${M.sup(x, 2)} + 1 has no real roots, so it gets a linear numerator: ${M.frac(num, den)} = ${M.frac(Av, dn(rr))} + ${M.frac(`${Bv}${x} + ${Cv}`, `${M.sup(x, 2)} + 1`)}, that is ${num} = ${Av}(${M.sup(x, 2)} + 1) + (${Bv}${x} + ${Cv})(${dn(rr)}).`,
              `Cover-up at ${x} = ${n(rr)}: ${n(Nr)} = ${Av} · ${n(rr1)}, so ${Av} = ${n(A)}.`,
              `Match the ${M.sup(x, 2)} terms: ${Av} + ${Bv} = ${n(n2)}, so ${Bv} = ${n(B)}. Match the constants: ${Av} + ${n(m0)}${Cv} = ${n(n0)}, so ${Cv} = ${n(C)}.`,
              `Integrate each piece from 0 to 1: ${integ(0, 1)} ${M.frac(n(A), dn(rr))} ${dif(x)} = ${kv(A, `(ln ${n(m1)} − ln ${n(m0)})`)}; ${integ(0, 1)} ${M.frac(kv(B, x), `${M.sup(x, 2)} + 1`)} ${dif(x)} = ${f(B2)}[ln(${M.sup(x, 2)} + 1)]${bar(0, 1)} = ${kf(B2, "ln 2")}; ${integ(0, 1)} ${M.frac(n(C), `${M.sup(x, 2)} + 1`)} ${dif(x)} = ${n(C)}[arctan ${x}]${bar(0, 1)} = ${n(C)} · ${piq(F(1, 4))}.`,
              `Collect the logarithms by primes: ${ans.h}.`,
            ],
            answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
            vals: { A, B, C, Nr, rr1, m1, m0, B2: fv(B2), C4: fv(C4), coefs: terms.map(([c]) => fv(c)), primes: terms.filter(([, b]) => b.k).map(([, b]) => b.k) },
            params: { kind: "quad", r: rr, n2, n1, n0 }, consts: [4],
          };
        }
        for (;;) {
          const rr = r.pick([-1, -2, -3]), A = r.nonzero(-3, 3), B = r.nonzero(-3, 3), C = r.nonzero(-3, 3);
          const lo = r.pick([1, 2]), hi = r.int(lo + 1, 4);
          const n2 = A + C, n1 = B - A * rr, n0 = -B * rr, Nr = n2 * rr * rr + n1 * rr + n0, rsq = rr * rr;
          if (n2 === 0) continue;
          const rat = F(B, lo).sub(F(B, hi));
          const terms = lnCombine([[A, hi], [-A, lo], [C, hi - rr], [-C, lo - rr]]);
          const ans = ex(terms.concat([[rat, ONE]]));
          const num = M.poly([n2, n1, n0]), den = `${M.sup(x, 2)}(${dn(rr)})`;
          const [Av, Bv, Cv] = ["A", "B", "C"].map(V);
          return {
            prompt: `Evaluate ${M.eq(`${integ(n(lo), n(hi))} ${M.frac(num, den)} ${dif(x)}`)} Give the exact value.`,
            steps: [
              `The factor ${M.sup(x, 2)} is repeated, so it needs a term for each power: ${M.frac(num, den)} = ${M.frac(Av, x)} + ${M.frac(Bv, M.sup(x, 2))} + ${M.frac(Cv, dn(rr))}, that is ${num} = ${Av}${x}(${dn(rr)}) + ${Bv}(${dn(rr)}) + ${Cv}${M.sup(x, 2)}.`,
              `At ${x} = 0 only the ${Bv}-term survives: ${n(n0)} = ${Bv}(0 − ${np(rr)}) = ${kv(-rr, Bv)}, so ${Bv} = ${n(B)}. At ${x} = ${n(rr)} only the ${Cv}-term survives: ${n(Nr)} = ${Cv} · ${M.sup(np(rr), 2)} = ${kv(rsq, Cv)}, so ${Cv} = ${n(C)}.`,
              `Match the ${M.sup(x, 2)} terms: ${Av} + ${Cv} = ${n(n2)}, so ${Av} = ${n(A)}.`,
              `Antiderivative: ${kf(A, `ln ${x}`)} ${B > 0 ? "−" : "+"} ${M.frac(n(Math.abs(B)), x)}${tf(C, `ln(${dn(rr)})`)} (the arguments are positive on [${n(lo)}, ${n(hi)}]); the middle term is ∫ ${M.frac(n(B), M.sup(x, 2))} ${dif(x)} = ${M.frac(n(-B), x)}.`,
              `Evaluate: ${kv(A, `(ln ${n(hi)} − ln ${n(lo)})`)}${M.term(B, `(${M.frac("1", n(lo))} − ${M.frac("1", n(hi))})`)}${M.term(C, `(ln ${n(hi - rr)} − ln ${n(lo - rr)})`)} = ${ans.h}.`,
            ],
            answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
            vals: { A, B, C, Nr, rsq, hr: hi - rr, lr: lo - rr, rat: fv(rat), coefs: terms.map(([c]) => fv(c)), primes: terms.map(([, b]) => b.k) },
            params: { kind: "rep", r: rr, n2, n1, n0, lo, hi },
          };
        }
      },
    },

    // ---- C2.5 Numerical integration --------------------------------------------------------------------
    "C2.18": {
      title: "Trapezoid and Simpson's rules",
      generate(r, level) {
        if (level === 1) {
          const al = r.nonzero(-2, 2), be = r.int(-3, 3), ga = r.int(0, 6), a = r.int(0, 1), h = r.pick([F(1), F(1, 2)]);
          const fpoly = [ga, be, al], b = h.mul(4).add(a);
          const xs = [0, 1, 2, 3, 4].map((i) => h.mul(i).add(a)), fs = xs.map((xx) => peval(fpoly, xx));
          const S = fs.reduce((acc, v, i) => acc.add(v.mul(i === 0 || i === 4 ? 1 : 2)), F(0)), h2 = h.div(2), T = h2.mul(S);
          const vals = fs.map((q) => q.value), ylo = Math.min(0, ...vals), yhi = Math.max(0, ...vals), pad = Math.max(1, 0.2 * (yhi - ylo));
          const traps = xs.slice(0, 4).map((xx, i) => ({ t: "poly", p: [[xx.value, 0], [xx.value, vals[i]], [xs[i + 1].value, vals[i + 1]], [xs[i + 1].value, 0]], fill: true, role: "highlight" }));
          return {
            prompt: `Use the trapezoid rule with ${V("n")} = 4 to approximate ${M.eq(`${integ(n(a), dec(b))} (${ph(fpoly)}) ${dif(x)}`)}`,
            graph: graph({ view: [a - 0.5, b.value + 0.5, ylo - pad, yhi + pad], items: [...traps, { t: "fn", e: ps(fpoly) }] }),
            steps: [
              `Step size: ${V("h")} = ${M.frac(`${dec(b)} − ${n(a)}`, "4")} = ${dec(h)}, so the nodes are ${xs.map(dec).join(", ")}.`,
              `Values of the integrand: ${M.table([x, ...xs.map(dec)], [[`${V("f")}(${x})`, ...fs.map(dec)]])}`,
              `Weights 1, 2, 2, 2, 1: ${decp(fs[0])} + 2 · ${decp(fs[1])} + 2 · ${decp(fs[2])} + 2 · ${decp(fs[3])} + ${decp(fs[4])} = ${dec(S)}.`,
              `${M.sub(V("T"), "4")} = ${M.frac(V("h"), "2")} · ${dec(S)} = ${dec(h2)} · ${decp(S)} = ${dec(T)}.`,
            ],
            answer: { kind: "number", value: T.value }, answerText: dec(T), answerInput: typed(T),
            vals: { b: fv(b), h: fv(h), h2: fv(h2), xs: fvs(xs), fs: fvs(fs), S: fv(S), T: fv(T) }, params: { al, be, ga, a, hh: fv(h) }, consts: [4],
          };
        }
        if (level === 2) {
          const scen = r.pick(["car", "flow"]), nn = r.pick([4, 6]), h = r.pick(scen === "car" ? [2, 3, 5] : [5, 10, 15]);
          const base = r.int(scen === "car" ? 4 : 20, scen === "car" ? 12 : 40), slope = r.int(1, 4);
          const data = Array.from({ length: nn + 1 }, (_, i) => base + slope * i + r.int(-1, 2));
          const wts = data.map((_, i) => (i === 0 || i === nn ? 1 : i % 2 ? 4 : 2));
          const W = data.reduce((acc, v, i) => acc + v * wts[i], 0), Sv = F(h * W, 3);
          const tv = scen === "car" ? t : t, unitT = scen === "car" ? "s" : "min", unitF = scen === "car" ? "m/s" : "m³/min", unitA = scen === "car" ? "m" : "m³";
          const what = scen === "car"
            ? `A car's speedometer is read every ${n(h)} seconds: ${M.table([`${tv} (s)`, ...data.map((_, i) => n(h * i))], [["speed (m/s)", ...data.map(n)]])} Estimate the distance it travels in these ${n(h * nn)} seconds with Simpson's rule, in meters.`
            : `Water flows into a reservoir; the inflow rate is measured every ${n(h)} minutes: ${M.table([`${tv} (min)`, ...data.map((_, i) => n(h * i))], [["rate (m³/min)", ...data.map(n)]])} Estimate the volume that flows in over these ${n(h * nn)} minutes with Simpson's rule, in cubic meters.`;
          const approx = Sv.d === 1 ? "" : ` ≈ ${M.n(Sv.value, { dp: 2 })}`;
          const sumTxt = data.map((v, i) => (wts[i] === 1 ? n(v) : `${n(wts[i])} · ${n(v)}`)).join(" + ");
          return {
            prompt: what,
            steps: [
              `${scen === "car" ? "Distance is the integral of speed" : "Volume is the integral of the flow rate"} over time. There are ${V("n")} = ${n(nn)} intervals (even, as Simpson's rule needs), each ${V("h")} = ${n(h)} ${unitT} wide.`,
              `Simpson's weights are 1, 4, 2, 4, …, 4, 1: ${sumTxt} = ${n(W)}.`,
              `${M.sub(V("S"), n(nn))} = ${M.frac(V("h"), "3")} · ${n(W)} = ${M.frac(n(h), "3")} · ${n(W)} = ${f(Sv)}${approx} ${unitA}.`,
            ],
            answer: { kind: "number", value: Sv.value }, answerText: `${f(Sv)}${approx} ${unitA}`, answerInput: typed(Sv),
            vals: { W, Sv: fv(Sv), approx: Sv.value, times: data.map((_, i) => h * i), total: h * nn }, params: { scen, nn, h, data }, consts: [3, 4],
          };
        }
        // level 3: how many subintervals guarantee the error bound
        for (;;) {
          const fcase = r.pick(["inv", "inv", "sin", "quart"]), method = r.pick(["trap", "simp"]);
          const E = r.pick([0.01, 0.001, 0.0001, 0.0005, 0.005]);
          let a, b, K, fh, d2h, why, len, lenH, lenV;
          if (fcase === "inv") {
            a = 1; b = r.pick([2, 3]); fh = M.frac("1", x);
            K = method === "trap" ? 2 : 24;
            d2h = method === "trap" ? `${V("f")}″(${x}) = ${M.frac("2", M.sup(x, 3))}` : `${M.sup(V("f"), "(4)")}(${x}) = ${M.frac("24", M.sup(x, 5))}`;
            why = `which is largest at ${x} = 1`;
            len = b - a; lenH = n(len); lenV = len;
          } else if (fcase === "sin") {
            a = 0; b = Math.PI; fh = `sin ${x}`; K = 1;
            d2h = method === "trap" ? `${V("f")}″(${x}) = −sin ${x}` : `${M.sup(V("f"), "(4)")}(${x}) = sin ${x}`;
            why = `whose size is at most 1 (reached at ${x} = ${piq(F(1, 2))})`;
            lenH = "π"; lenV = Math.PI;
          } else {
            a = 0; b = r.pick([1, 2]); fh = M.sup(x, 4);
            K = method === "trap" ? 12 * b * b : 24;
            d2h = method === "trap" ? `${V("f")}″(${x}) = 12${M.sup(x, 2)}` : `${M.sup(V("f"), "(4)")}(${x}) = 24`;
            why = method === "trap" ? `which is largest at ${x} = ${n(b)}` : "a constant";
            len = b; lenH = n(len); lenV = len;
          }
          const pw = method === "trap" ? 3 : 5, cst = method === "trap" ? 12 : 180, root = method === "trap" ? 2 : 4;
          const X = (K * Math.pow(lenV, pw)) / (cst * E), rt = Math.pow(X, 1 / root);
          let N = Math.ceil(rt);
          if (method === "simp" && N % 2) N += 1;
          if (Math.abs(rt - Math.round(rt)) < 0.02 || N < 3 || N > 2000) continue;
          const Ktxt = n(K), bound = method === "trap" ? `${M.frac(`${V("K")}${M.sup(`(${V("b")} − ${V("a")})`, 3)}`, `12${M.sup(V("n"), 2)}`)}` : `${M.frac(`${V("K")}${M.sup(`(${V("b")} − ${V("a")})`, 5)}`, `180${M.sup(V("n"), 4)}`)}`;
          const bh = fcase === "sin" ? "π" : n(b);
          return {
            prompt: `How many subintervals ${V("n")} guarantee that ${method === "trap" ? "the trapezoid rule" : "Simpson's rule"} approximates ${M.eq(`${integ(n(a), bh)} ${fh} ${dif(x)}`)} with error at most ${fmt(E)}? Use the error bound ${bound}${method === "simp" ? ` (and remember ${V("n")} must be even)` : ""}.`,
            steps: [
              `${V("K")} bounds |${method === "trap" ? `${V("f")}″` : M.sup(V("f"), "(4)")}| on [${n(a)}, ${bh}]: ${d2h}, ${why}, so ${V("K")} = ${Ktxt}.`,
              `Require ${M.frac(`${Ktxt} · ${M.sup(lenH, pw)}`, `${n(cst)}${M.sup(V("n"), root)}`)} ≤ ${fmt(E)}, that is ${M.sup(V("n"), root)} ≥ ${M.frac(`${Ktxt} · ${M.sup(lenH, pw)}`, `${n(cst)} · ${fmt(E)}`)} ≈ ${M.n(X, { dp: 2 })}.`,
              `${root === 2 ? `${V("n")} ≥ ${M.sqrt(M.n(X, { dp: 2 }))}` : `${V("n")} ≥ ${M.sqrt(M.n(X, { dp: 2 }), "4")}`} ≈ ${M.n(rt, { dp: 2 })}, so the smallest ${method === "simp" ? "even " : ""}whole number is ${V("n")} = ${n(N)}.`,
            ],
            answer: { kind: "number", value: N }, answerText: `${V("n")} = ${n(N)}`, answerInput: String(N),
            vals: { K, X, rt, N }, params: { fcase, method, a, b: fcase === "sin" ? 0 : b, E }, consts: [pw, cst, root, 4, 12, 24],
          };
        }
      },
    },

    // ---- C2.6 Improper integrals ------------------------------------------------------------------------
    "C2.4": {
      title: "Improper integrals",
      generate(r, level) {
        const bv = V("b"), tv = V("t");
        if (level === 1) {
          const c = r.int(1, 8);
          if (r.chance(0.5)) {
            const k = r.int(1, 5), ans = F(c, k);
            return {
              prompt: `Evaluate ${M.eq(`${integ(0, "∞")} ${c === 1 ? "" : n(c)}${ek(-k)} ${dif(x)}`)} or say why it diverges.`,
              graph: graph({ view: [-0.5, 5, -0.3 * c, 1.2 * c], items: [{ t: "fn", e: `${c}*exp(-${k}x)` }, region((xx) => c * Math.exp(-k * xx), () => 0, 0, 5)] }),
              steps: [
                `Replace ∞ by ${bv} and take a limit: ${lim("∞")}${integ(0, bv)} ${c === 1 ? "" : n(c)}${ek(-k)} ${dif(x)}.`,
                `Antiderivative: ${kv(F(-c, k), ek(-k))}. From 0 to ${bv}: ${f(ans)} − ${kv(F(c, k), ek(-k, bv))}.`,
                `As ${bv} → ∞, ${ek(-k, bv)} → 0, so the integral converges to ${f(ans)}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
              vals: { ans: fv(ans) }, params: { kind: "exp", c, k },
            };
          }
          const p = r.pick([2, 3]), L = r.pick([1, 2]), p1 = p - 1, Lp = Math.pow(L, p1), den = p1 * Lp, ans = F(c, den);
          return {
            prompt: `Evaluate ${M.eq(`${integ(n(L), "∞")} ${M.frac(n(c), M.sup(x, p))} ${dif(x)}`)} or say why it diverges.`,
            graph: graph({ view: [-0.3, 6, -0.3, c / Math.pow(L, p) * 1.3 + 0.3], items: [{ t: "fn", e: `${c}/x^${p}` }, region((xx) => c / Math.pow(xx, p), () => 0, L, 6)] }),
            steps: [
              `Replace ∞ by ${bv} and take a limit: ${lim("∞")}${integ(n(L), bv)} ${n(c)}${M.sup(x, n(-p))} ${dif(x)}.`,
              `Power rule: the antiderivative is ${M.frac(`${n(c)}${M.sup(x, n(-p1))}`, n(-p1))} = −${M.frac(n(c), `${p1 === 1 ? "" : n(p1)}${xp(p1)}`)}.`,
              `From ${n(L)} to ${bv}: ${M.frac(n(c), `${p1 === 1 ? "" : `${n(p1)} · `}${xp(p1, n(L))}`)} − ${M.frac(n(c), `${p1 === 1 ? "" : n(p1)}${xp(p1, bv)}`)}, and the second term → 0 as ${bv} → ∞.`,
              `The integral converges to ${M.frac(n(c), n(den))}${ans.d !== den ? ` = ${f(ans)}` : ""}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { p1, Lp, den, ans: fv(ans) }, params: { kind: "pow", c, p, L },
          };
        }
        if (level === 2) {
          const kind = r.pick(["half", "cbrt", "cbrt2"]), k = r.int(2, 4), c = r.int(1, 6);
          // c/√x: antiderivative 2c√x; c/∛x: (3c/2)∛(x²); c/∛(x²): 3c∛x
          const B = kind === "half" ? k * k : k * k * k;
          const rootB = kind === "cbrt" ? k * k : k;
          const coef = kind === "half" ? F(2 * c) : kind === "cbrt" ? F(3 * c, 2) : F(3 * c);
          const ans = coef.mul(rootB);
          const integrand = kind === "half" ? M.frac(n(c), M.sqrt(x)) : kind === "cbrt" ? M.frac(n(c), M.sqrt(x, "3")) : M.frac(n(c), M.sqrt(M.sup(x, 2), "3"));
          const pw = kind === "half" ? M.sup(x, "−1/2") : kind === "cbrt" ? M.sup(x, "−1/3") : M.sup(x, "−2/3");
          const anti = kind === "half" ? `${n(2 * c)}${M.sqrt(x)}` : kind === "cbrt" ? kv(F(3 * c, 2), M.sqrt(M.sup(x, 2), "3")) : kv(F(3 * c), M.sqrt(x, "3"));
          const atB = kind === "half" ? `${M.sqrt(n(B))} = ${n(k)}` : kind === "cbrt" ? `${M.sqrt(M.sup(n(B), 2), "3")} = ${M.sup(n(k), 2)} = ${n(k * k)}` : `${M.sqrt(n(B), "3")} = ${n(k)}`;
          const fx = (xx) => (kind === "half" ? c / Math.sqrt(xx) : kind === "cbrt" ? c / Math.cbrt(xx) : c / Math.cbrt(xx * xx));
          return {
            prompt: `Evaluate ${M.eq(`${integ(0, n(B))} ${integrand} ${dif(x)}`)} or say why it diverges.`,
            graph: graph({ view: [-0.5, B + 1, -0.5, Math.max(4, fx(B) * 4)], items: [{ t: "fn", e: kind === "half" ? `${c}/sqrt(x)` : kind === "cbrt" ? `${c}/cbrt(x)` : `${c}/cbrt(x^2)` }, region(fx, () => 0, Math.min(0.05, B / 100), B), { t: "vline", x: 0, dash: true, role: "muted" }] }),
            steps: [
              `The integrand blows up at ${x} = 0, so ${integ(0, n(B))} = ${lim("0", tv, "+")}${integ(tv, n(B))} ${n(c)}${pw} ${dif(x)}.`,
              `Power rule (add 1 to the exponent, divide by the new exponent): the antiderivative is ${anti}.`,
              `At ${n(B)}: ${atB}, giving ${f(coef)} · ${n(rootB)} = ${f(ans)}. At ${tv} the antiderivative → 0 as ${tv} → ${M.sup("0", "+")}.`,
              `The integral converges to ${f(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { B, rootB, coef: fv(coef), ans: fv(ans), kk: k * k }, params: { kind, k, c }, consts: [3],
          };
        }
        // level 3: decide by limit comparison
        const type = r.pick(["inf", "inf", "zero"]);
        let P, Q, prompt, steps, conv, lims, params;
        const pow = (q, v = x) => (q.eq(1) ? v : M.sup(v, q.d === 1 ? n(q.n) : `${q.n}/${q.d}`));
        if (type === "inf") {
          const m = r.pick([F(1, 2), F(1), F(2)]), k = r.pick([1, 2, 3, 4].filter((kk) => F(kk).sub(m).value > 0 && F(kk).sub(m).value <= 3));
          const al = r.int(1, 6), be = r.int(1, 6);
          P = F(k).sub(m); Q = F(k); conv = P.value > 1; lims = ["1", "∞"];
          const top = `${m.eq(F(1, 2)) ? M.sqrt(x) : pow(m)} + ${n(al)}`, bot = `${pow(F(k))} + ${n(be)}`;
          prompt = `Does ${M.eq(`${integ(1, "∞")} ${M.frac(top, bot)} ${dif(x)}`)} converge or diverge? Choose the correct statement.`;
          steps = [
            `For large ${x} the dominant terms are ${m.eq(F(1, 2)) ? M.sqrt(x) : pow(m)} on top and ${pow(F(k))} below, so the integrand behaves like ${M.frac("1", pow(P))}.`,
            `Limit comparison: ${M.frac(top, bot)} ÷ ${M.frac("1", pow(P))} → 1, a finite positive number, so both integrals do the same thing.`,
            `${integ(1, "∞")} ${M.frac(dif(x), pow(P))} ${conv ? "converges" : "diverges"}, since ${V("p")} = ${f(P)} ${conv ? "&gt;" : "≤"} 1. So the given integral ${conv ? "converges" : "diverges"}.`,
          ];
          params = { type, m: fv(m), k, al, be };
        } else {
          const a = r.pick([F(1, 2), F(1, 3), F(2, 3), F(1), F(3, 2), F(2)]), be = r.int(1, 5);
          P = a; Q = a.add(1); conv = P.value < 1; lims = ["0", "1"];
          const xa = a.eq(F(1, 2)) ? M.sqrt(x) : a.eq(F(1, 3)) ? M.sqrt(x, "3") : a.eq(F(2, 3)) ? M.sqrt(M.sup(x, 2), "3") : a.eq(F(3, 2)) ? `${x}${M.sqrt(x)}` : pow(a);
          const den = `${xa}(${n(be)} + ${x})`;
          prompt = `Does ${M.eq(`${integ(0, 1)} ${M.frac(dif(x), den)}`)} converge or diverge? Choose the correct statement.`;
          steps = [
            `The only problem point is ${x} = 0, where ${xa} → 0. There ${n(be)} + ${x} → ${n(be)}, so the integrand behaves like ${M.frac("1", `${n(be)}${pow(P)}`)}.`,
            `Limit comparison with ${M.frac("1", pow(P))}: the ratio → ${M.frac("1", n(be))}, a finite positive number, so both integrals do the same thing.`,
            `Near 0, ${integ(0, 1)} ${M.frac(dif(x), pow(P))} converges exactly when ${V("p")} &lt; 1. Here ${V("p")} = ${f(P)}, so the integral ${conv ? "converges" : "diverges"}.`,
          ];
          params = { type, a: fv(a), be };
        }
        const opt = (c, q) => `${c ? "Converges" : "Diverges"}, by limit comparison with ${integ(lims[0], lims[1])} ${M.frac(dif(x), pow(q))}`;
        const options = [opt(true, P), opt(false, P), opt(true, Q), opt(false, Q)];
        const order = r.shuffle([0, 1, 2, 3]), index = order.indexOf(conv ? 0 : 1);
        return {
          prompt, steps, answer: { kind: "choice", options: order.map((i) => options[i]), index }, answerText: options[conv ? 0 : 1],
          vals: { P: fv(P), Q: fv(Q), index }, params: Object.assign(params, { order }),
        };
      },
    },
  });

  // ==== Applications of integration ===============================================================
  /** A polynomial antiderivative shown as a bracket [ … ] from lo to hi with its two values. */
  const evalPoly = (G, lo, hi, v = "x") => `[${ph(G, v)}]${bar(dec(lo), dec(hi))} = ${dec(peval(G, hi))} − ${decp(peval(G, lo))}`;
  const polyFn = (a) => (xx) => a.reduce((acc, c, i) => acc + Frac.of(c).value * Math.pow(xx, i), 0);

  P.define("calculus2", {
    // ---- C2.7 Area between curves ------------------------------------------------------------------
    "C2.5": {
      title: "Area between curves",
      generate(r, level) {
        if (level <= 2) {
          let p, q;
          do { p = r.int(-3, 3); q = r.int(p + 1, p + 5); } while (q > 4 || (level === 2 && p + q === 0 && r.chance(0.7)));
          const m = p + q, c = -p * q, vv = level === 1 ? "x" : "y", w = V(vv), oth = V(level === 1 ? "y" : "x");
          const diff = [c, m, -1], G = pint(diff), Gq = peval(G, q), Gp = peval(G, p), A = Gq.sub(Gp);
          const mid = F(p + q, 2), Lm = peval([c, m], mid), Qm = mid.mul(mid);
          const lineH = `${oth} = ${M.poly([m, c], vv)}`, parH = `${oth} = ${M.sup(w, 2)}`;
          let gr;
          if (level === 1) {
            const ymax = Math.max(p * p, q * q) + 1.5;
            gr = graph({ view: [p - 1.5, q + 1.5, Math.min(-1, m * (p - 1.5) + c) - 0.5, ymax], items: [region((xx) => m * xx + c, (xx) => xx * xx, p, q), { t: "fn", e: "x^2" }, { t: "fn", e: `${m}x + (${c})`, role: "secondary" }] });
          } else {
            const xmax = Math.max(p * p, q * q) + 1.5, xmin = Math.min(-1, m * p + c - 1);
            const right = curvePts((yy) => m * yy + c, (yy) => yy, p, q, 30), left = curvePts((yy) => yy * yy, (yy) => yy, q, p, 30);
            gr = graph({ view: [xmin, xmax, p - 1.5, q + 1.5], items: [{ t: "poly", p: right.concat(left), fill: true, role: "highlight" }, { t: "fn", e: "sqrt(x)" }, { t: "fn", e: "-sqrt(x)" },
              m === 0 ? { t: "vline", x: c, role: "secondary" } : { t: "fn", e: `(x - (${c}))/(${m})`, role: "secondary" }] });
          }
          return {
            prompt: level === 1
              ? `Find the area of the region enclosed by ${M.eq(`${parH} and ${lineH}`)}`
              : `Find the area of the region enclosed by ${M.eq(`${parH} and ${lineH}`)} Use horizontal slices: integrate with respect to ${y}.`,
            graph: gr,
            steps: [
              `Intersections: ${M.sup(w, 2)} = ${M.poly([m, c], vv)} gives ${M.poly([1, -m, -c], vv)} = 0, that is ${fac(p).replace(/<i>x<\/i>/g, w)}${fac(q).replace(/<i>x<\/i>/g, w)} = 0, so ${w} = ${n(p)} and ${w} = ${n(q)}.`,
              `Which is ${level === 1 ? "on top" : "on the right"}? At ${w} = ${f(mid)} the line gives ${f(Lm)} and the parabola gives ${f(Qm)}, so the line is ${level === 1 ? "above" : "to the right"}.`,
              `${V("A")} = ${integ(n(p), n(q))} (${M.poly([m, c], vv)} − ${M.sup(w, 2)}) ${dif(w)} = [${ph(G, vv)}]${bar(n(p), n(q))}.`,
              `At ${n(q)}: ${f(Gq)}. At ${n(p)}: ${f(Gp)}. ${V("A")} = ${f(Gq)} − ${fp(Gp)} = ${f(A)}.`,
            ],
            answer: { kind: "number", value: A.value }, answerText: f(A), answerInput: typed(A),
            vals: { p, q, mid: fv(mid), Lm: fv(Lm), Qm: fv(Qm), G: fvs(G), Gq: fv(Gq), Gp: fv(Gp), A: fv(A) }, params: { m, c }, consts: [3],
          };
        }
        // level 3: a cubic that crosses the axis, area = two pieces
        let a, b;
        do { a = r.int(1, 3); b = r.int(a + 1, 4); } while (a === b);
        const fpol = [0, a * b, -(a + b), 1], G = pint(fpol), Ga = peval(G, a), Gb = peval(G, b), A2 = Gb.sub(Ga), area = Ga.sub(A2);
        const fx = polyFn(fpol);
        let lo = 0, hi = 0;
        for (let i = 0; i <= 80; i++) { const v = fx((b * i) / 80); lo = Math.min(lo, v); hi = Math.max(hi, v); }
        return {
          prompt: `Find the total area between ${M.eq(`${y} = ${ph(fpol)}`)} and the ${x}-axis for 0 ≤ ${x} ≤ ${n(b)}.`,
          graph: graph({ view: [-0.7, b + 0.7, lo - 0.6 * (hi - lo) - 0.3, hi + 0.6 * (hi - lo) + 0.3], items: [region(fx, () => 0, 0, b, 60), { t: "fn", e: ps(fpol) }] }),
          steps: [
            `Factor: ${ph(fpol)} = ${x}${fac(a)}${fac(b)}, so the curve crosses the axis at 0, ${n(a)} and ${n(b)}. On (0, ${n(a)}) two factors are negative and the product is positive; on (${n(a)}, ${n(b)}) only ${fac(b)} is negative, so the curve is below the axis.`,
            `Antiderivative: ${V("F")}(${x}) = ${ph(G)}.`,
            `${integ(0, n(a))} = ${V("F")}(${n(a)}) − ${V("F")}(0) = ${f(Ga)}, the area above the axis.`,
            `${integ(n(a), n(b))} = ${V("F")}(${n(b)}) − ${V("F")}(${n(a)}) = ${f(Gb)} − ${fp(Ga)} = ${f(A2)}: negative because that piece lies below the axis.`,
            `Area = ${f(Ga)} + |${f(A2)}| = ${f(area)}. (A single integral from 0 to ${n(b)} would give ${f(Gb)}, the net signed area, not the area.)`,
          ],
          answer: { kind: "number", value: area.value }, answerText: f(area), answerInput: typed(area),
          vals: { a, G: fvs(G), Ga: fv(Ga), Gb: fv(Gb), A2: fv(A2), area: fv(area) }, params: { s: a + b, pr: a * b, b }, consts: [3, 4],
        };
      },
    },

    // ---- C2.8 Volumes: disks, washers, slicing ------------------------------------------------------
    "C2.6": {
      title: "Volumes by disks, washers and slicing",
      generate(r, level) {
        if (level === 1) {
          const kind = r.pick(["sqrt", "lin", "sq"]);
          let b, k = 1, fh, fe, R2, coef, why;
          if (kind === "sqrt") { b = r.int(1, 6); fh = M.sqrt(x); fe = "sqrt(x)"; R2 = [0, 1]; why = `${M.sup(`(${M.sqrt(x)})`, 2)} = ${x}`; }
          else if (kind === "lin") { k = r.int(1, 3); b = r.int(1, 4); fh = kv(k, x); fe = `${k}x`; R2 = [0, 0, k * k]; why = `${M.sup(`(${kv(k, x)})`, 2)} = ${kv(k * k, M.sup(x, 2))}`; }
          else { b = r.int(1, 3); fh = M.sup(x, 2); fe = "x^2"; R2 = [0, 0, 0, 0, 1]; why = `${M.sup(`(${M.sup(x, 2)})`, 2)} = ${M.sup(x, 4)}`; }
          const G = pint(R2), val = peval(G, b);
          coef = val;
          const ans = ex([[coef, PI]]);
          const fx = kind === "sqrt" ? (xx) => Math.sqrt(xx) : kind === "lin" ? (xx) => k * xx : (xx) => xx * xx;
          const top = fx(b);
          return {
            prompt: `The region under ${M.eq(`${y} = ${fh}, 0 ≤ ${x} ≤ ${n(b)}`)} is rotated about the ${x}-axis. Find the volume of the solid. Give the exact value.`,
            graph: graph({ view: [-0.5, b + 0.8, -top - 0.8, top + 0.8], items: [region(fx, () => 0, 0, b), { t: "fn", e: fe }, { t: "fn", e: `-${fe}`, role: "muted" }, { t: "seg", a: [b, -top], b: [b, top], dash: true, role: "muted" }] }),
            steps: [
              `Slices perpendicular to the ${x}-axis are disks of radius ${V("R")}(${x}) = ${fh}, so ${V("V")} = π${integ(0, n(b))} ${M.sup(`[${V("R")}(${x})]`, 2)} ${dif(x)}.`,
              `${why}, so ${V("V")} = π${integ(0, n(b))} ${ph(R2)} ${dif(x)} = π[${ph(G)}]${bar(0, n(b))}.`,
              `At ${n(b)} the bracket is ${f(val)}; at 0 it is 0. ${V("V")} = ${ans.h}.`,
            ],
            answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
            vals: { R2: fvs(R2), G: fvs(G), val: fv(val) }, params: { kind, k, b }, consts: [3, 4, 5],
          };
        }
        if (level === 2) {
          const m = r.int(1, 3), k = r.int(0, 2);
          const Rr = [k, m], rr = [k, 0, 1], diff = psub(pmul(Rr, Rr), pmul(rr, rr)), G = pint(diff), val = peval(G, m), ans = ex([[val, PI]]);
          const axis = k === 0 ? `the ${x}-axis` : `the line ${y} = ${n(-k)}`;
          return {
            prompt: `The region between ${M.eq(`${y} = ${kv(m, x)} and ${y} = ${M.sup(x, 2)}`)} is rotated about ${axis}. Find the volume. Give the exact value.`,
            graph: graph({ view: [-0.8, m + 0.8, -k - 1, m * m + 1], items: [region((xx) => m * xx, (xx) => xx * xx, 0, m), { t: "fn", e: `${m}x` }, { t: "fn", e: "x^2", role: "secondary" }, { t: "hline", y: -k, dash: true, role: "muted" }] }),
            steps: [
              `The curves meet where ${M.sup(x, 2)} = ${kv(m, x)}: ${x} = 0 and ${x} = ${n(m)}. In between the line is higher.`,
              `Slices perpendicular to the ${x}-axis are washers. Radii are distances from ${axis}: outer ${V("R")} = ${M.poly([m, k])}, inner ${V("r")} = ${M.poly([1, 0, k])}.`,
              `${M.sup(V("R"), 2)} − ${M.sup(V("r"), 2)} = ${M.sup(`(${M.poly([m, k])})`, 2)} − ${M.sup(`(${M.poly([1, 0, k])})`, 2)} = ${ph(diff)}. (Square each radius first; (${V("R")} − ${V("r")})² is not the same.)`,
              `${V("V")} = π${integ(0, n(m))} (${ph(diff)}) ${dif(x)} = π[${ph(G)}]${bar(0, n(m))} = ${ans.h}.`,
            ],
            answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
            vals: { diff: fvs(diff), G: fvs(G), val: fv(val), nk: -k }, params: { m, k }, consts: [3, 4, 5],
          };
        }
        // level 3: known cross-sections over a disk (a word problem)
        const rad = r.int(2, 6), shape = r.pick(["square", "equi", "semi", "right"]), rr = rad * rad, r3 = rr * rad, four3 = F(4 * r3, 3);
        const S = { square: { c: F(4), h: `${M.sup(V("s"), 2)} = 4(${n(rr)} − ${M.sup(x, 2)})`, name: "a square" },
          equi: { c: F(1), h: `${M.frac(M.sqrt("3"), "4")}${M.sup(V("s"), 2)} = ${M.sqrt("3")}(${n(rr)} − ${M.sup(x, 2)})`, name: "an equilateral triangle" },
          semi: { c: F(1, 2), h: `${M.frac("π", "2")}${M.sup(`(${M.frac(V("s"), "2")})`, 2)} = ${M.frac("π", "2")}(${n(rr)} − ${M.sup(x, 2)})`, name: "a semicircle (its diameter on the base)" },
          right: { c: F(1), h: `${M.frac(M.sup(V("s"), 2), "4")} = ${n(rr)} − ${M.sup(x, 2)}`, name: "an isosceles right triangle (its hypotenuse on the base)" } }[shape];
        const coef = S.c.mul(four3);
        const ans = ex([[coef, shape === "equi" ? SQ(3) : shape === "semi" ? PI : ONE]]);
        const cf = shape === "equi" ? M.sqrt("3") : shape === "semi" ? M.frac("π", "2") : shape === "square" ? "4" : "";
        const x0 = rad * 0.45, half = Math.sqrt(rr - x0 * x0);
        return {
          prompt: `A paperweight has a circular base of radius ${n(rad)} cm. Every cross-section perpendicular to one diameter of the base is ${S.name}. Find its volume in cm³.`,
          graph: graph({ view: [-rad - 1, rad + 1, -rad - 1, rad + 1], equal: true, items: [{ t: "circle", c: [0, 0], r: rad }, { t: "seg", a: [x0, -half], b: [x0, half], label: "s", role: "highlight" }] }),
          steps: [
            `Put the center at the origin and slice perpendicular to the ${x}-axis. At ${x}, the slice's base is a chord of length ${V("s")} = 2${M.sqrt(`${n(rr)} − ${M.sup(x, 2)}`)}.`,
            `Cross-section area: ${V("A")}(${x}) = ${S.h}.`,
            `${integ(`−${n(rad)}`, n(rad))} (${n(rr)} − ${M.sup(x, 2)}) ${dif(x)} = [${n(rr)}${x} − ${M.frac(M.sup(x, 3), "3")}]${bar(`−${n(rad)}`, n(rad))} = 2(${n(r3)} − ${M.frac(n(r3), "3")}) = ${f(four3)}.`,
            `${V("V")} = ${cf ? `${cf} · ` : ""}${f(four3)} = ${ans.h} cm³.`,
          ],
          answer: { kind: "number", value: ans.v }, answerText: `${ans.h} cm³`, answerInput: ans.s,
          vals: { rr, r3, four3: fv(four3), coef: fv(coef) }, params: { shape, rad }, consts: [3, 4],
        };
      },
    },

    // ---- C2.9 Shell method --------------------------------------------------------------------------
    "C2.shell": {
      title: "Volumes by cylindrical shells",
      generate(r, level) {
        if (level <= 2) {
          const arch = level === 2 || r.chance(0.5);
          const c = arch ? r.int(2, 4) : r.int(1, 3);
          const hpol = arch ? [0, c, -1] : [0, 0, 1], hi = c;
          let rho, axis, k = 0;
          if (level === 1) { rho = [0, 1]; axis = `the ${y}-axis`; }
          else {
            k = r.int(1, 3);
            const right = r.chance(0.5);
            rho = right ? [c + k, -1] : [k, 1];
            axis = `the line ${x} = ${n(right ? c + k : -k)}`;
            var axisX = right ? c + k : -k;
          }
          const integrand = pmul(rho, hpol), G = pint(integrand), val = peval(G, hi), coef = val.mul(2), ans = ex([[coef, PI]]);
          const fx = polyFn(hpol), top = Math.max(...[0.25, 0.5, 0.75, 1].map((s_) => fx(s_ * hi))) + 1;
          const lo = level === 1 ? -1 : Math.min(-1, axisX - 1), hiV = level === 1 ? hi + 1 : Math.max(hi + 1, axisX + 1);
          const items = [region(fx, () => 0, 0, hi), { t: "fn", e: ps(hpol) }];
          if (level === 2) items.push({ t: "vline", x: axisX, dash: true, role: "muted" });
          return {
            prompt: `The region under ${M.eq(`${y} = ${ph(hpol)}, 0 ≤ ${x} ≤ ${n(hi)}`)} (above the ${x}-axis) is rotated about ${axis}. Use cylindrical shells to find the volume. Give the exact value.`,
            graph: graph({ view: [lo, hiV, -0.8, top], items }),
            steps: [
              `A vertical strip at ${x} has height ${V("h")}(${x}) = ${ph(hpol)} and is ${level === 1 ? `${x}` : ph(rho)} away from ${axis}; it sweeps out a shell of volume 2π · (radius) · (height) · ${dif(x)}.`,
              `${V("V")} = 2π${integ(0, n(hi))} (${ph(rho)})(${ph(hpol)}) ${dif(x)} = 2π${integ(0, n(hi))} (${ph(integrand)}) ${dif(x)}.`,
              `Antiderivative: ${ph(G)}; at ${n(hi)} it is ${f(val)}, at 0 it is 0.`,
              `${V("V")} = 2π · ${f(val)} = ${ans.h}.`,
            ],
            answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
            vals: { rho: fvs(rho), integrand: fvs(integrand), G: fvs(G), val: fv(val), coef: fv(coef), axisX: level === 2 ? axisX : 0 },
            params: { c, arch: arch ? 1 : 0, k, axis: level === 1 ? "y" : axisX > hi ? "right" : "left" }, consts: [3, 4],
          };
        }
        // level 3: the napkin ring
        const [R, a, h] = r.pick([[5, 3, 4], [5, 4, 3], [10, 6, 8], [10, 8, 6], [13, 5, 12], [13, 12, 5], [17, 8, 15], [17, 15, 8], [25, 7, 24], [25, 24, 7]]);
        const RR = R * R, aa = a * a, hh = h * h, h3 = hh * h, coef = F(4 * h3, 3), ans = ex([[coef, PI]]);
        return {
          prompt: `A cylindrical hole of radius ${n(a)} mm is drilled straight through the center of a wooden bead (a sphere) of radius ${n(R)} mm. Find the volume of wood that remains, in mm³.`,
          graph: graph({ view: [-R - 2, R + 2, -R - 2, R + 2], equal: true, items: [{ t: "circle", c: [0, 0], r: R }, { t: "seg", a: [a, -h], b: [a, h], role: "secondary" }, { t: "seg", a: [-a, -h], b: [-a, h], role: "secondary" },
            { t: "poly", p: curvePts((s_) => s_, (s_) => Math.sqrt(Math.max(0, RR - s_ * s_)), a, R, 30).concat(curvePts((s_) => s_, (s_) => -Math.sqrt(Math.max(0, RR - s_ * s_)), R, a, 30)), fill: true, role: "highlight" }] }),
          steps: [
            `Center the sphere at the origin with the hole along the ${y}-axis. The wood left is the part with ${n(a)} ≤ ${x} ≤ ${n(R)} rotated about the ${y}-axis; at distance ${x} a shell has height 2${M.sqrt(`${n(RR)} − ${M.sup(x, 2)}`)} (the sphere's thickness there).`,
            `${V("V")} = 2π${integ(n(a), n(R))} ${x} · 2${M.sqrt(`${n(RR)} − ${M.sup(x, 2)}`)} ${dif(x)}.`,
            `Substitute ${u} = ${n(RR)} − ${M.sup(x, 2)}, ${dif(u)} = −2${x} ${dif(x)}. At ${x} = ${n(a)}, ${u} = ${n(RR)} − ${n(aa)} = ${n(hh)}; at ${x} = ${n(R)}, ${u} = 0. So ${V("V")} = 2π${integ(0, n(hh))} ${M.sqrt(u)} ${dif(u)}.`,
            `2π · ${M.frac("2", "3")}[${M.sup(u, "3/2")}]${bar(0, n(hh))} = ${M.frac("4π", "3")} · ${M.sup(n(hh), "3/2")} = ${M.frac("4π", "3")} · ${n(h3)} = ${ans.h} mm³.`,
          ],
          answer: { kind: "number", value: ans.v }, answerText: `${ans.h} mm³`, answerInput: ans.s,
          vals: { RR, aa, hh, h, h3, coef: fv(coef) }, params: { R, a }, consts: [3, 4],
        };
      },
    },

    // ---- C2.10 Arc length ---------------------------------------------------------------------------
    "C2.7": {
      title: "Arc length",
      generate(r, level) {
        if (level === 1) {
          let a, b;
          do { a = r.pick([0, 3, 8]); b = r.pick([3, 8, 15, 24]); } while (b <= a);
          const A = Math.round(Math.sqrt(1 + a)), B = Math.round(Math.sqrt(1 + b)), A3 = A * A * A, B3 = B * B * B, L = F(2 * (B3 - A3), 3);
          return {
            prompt: `Find the length of the curve ${M.eq(`${y} = ${M.frac("2", "3")}${M.sup(x, "3/2")}, ${n(a)} ≤ ${x} ≤ ${n(b)}`)}`,
            graph: graph({ view: [-1, b + 1, -1, (2 / 3) * Math.pow(b, 1.5) + 2], items: [{ t: "fn", e: `(2/3)x^1.5` }, { t: "pt", x: a, y: (2 / 3) * Math.pow(a, 1.5) }, { t: "pt", x: b, y: (2 / 3) * Math.pow(b, 1.5) }] }),
            steps: [
              `${y}′ = ${M.frac("2", "3")} · ${M.frac("3", "2")}${M.sup(x, "1/2")} = ${M.sqrt(x)}, so 1 + ${M.sup(`(${y}′)`, 2)} = 1 + ${x}.`,
              `${V("L")} = ${integ(n(a), n(b))} ${M.sqrt(`1 + ${x}`)} ${dif(x)} = ${M.frac("2", "3")}[${M.sup(`(1 + ${x})`, "3/2")}]${bar(n(a), n(b))}.`,
              `${M.sup(n(1 + b), "3/2")} = ${M.sup(n(B), 3)} = ${n(B3)} and ${M.sup(n(1 + a), "3/2")} = ${n(A3)}, so ${V("L")} = ${M.frac("2", "3")}(${n(B3)} − ${n(A3)}) = ${f(L)}.`,
            ],
            answer: { kind: "number", value: L.value }, answerText: f(L), answerInput: typed(L),
            vals: { A, B, A3, B3, a1: 1 + a, b1: 1 + b, L: fv(L) }, params: { a, b }, consts: [3],
          };
        }
        if (level === 2) {
          const fam = r.pick(["cube", "quart", "log"]), b = r.pick([2, 3, 4]);
          const Fm = {
            cube: { y: `${M.frac(M.sup(x, 3), "6")} + ${M.frac("1", `2${M.sup(x, 2)}`)}`.replace(M.sup(x, 2), x), P: M.frac(M.sup(x, 2), "2"), Q: M.frac("1", `2${M.sup(x, 2)}`), P2: M.frac(M.sup(x, 4), "4"), Q2: M.frac("1", `4${M.sup(x, 4)}`), G: `${M.frac(M.sup(x, 3), "6")} − ${M.frac("1", `2${x}`)}`, g: (v) => F(v * v * v, 6).sub(F(1, 2 * v)), e: "x^3/6 + 1/(2x)" },
            quart: { y: `${M.frac(M.sup(x, 4), "8")} + ${M.frac("1", `4${M.sup(x, 2)}`)}`, P: M.frac(M.sup(x, 3), "2"), Q: M.frac("1", `2${M.sup(x, 3)}`), P2: M.frac(M.sup(x, 6), "4"), Q2: M.frac("1", `4${M.sup(x, 6)}`), G: `${M.frac(M.sup(x, 4), "8")} − ${M.frac("1", `4${M.sup(x, 2)}`)}`, g: (v) => F(v ** 4, 8).sub(F(1, 4 * v * v)), e: "x^4/8 + 1/(4x^2)" },
            log: { y: `${M.frac(M.sup(x, 2), "4")} − ${M.frac(`ln ${x}`, "2")}`, P: M.frac(x, "2"), Q: M.frac("1", `2${x}`), P2: M.frac(M.sup(x, 2), "4"), Q2: M.frac("1", `4${M.sup(x, 2)}`), G: `${M.frac(M.sup(x, 2), "4")} + ${M.frac(`ln ${x}`, "2")}`, g: (v) => F(v * v, 4), e: "x^2/4 - ln(x)/2" },
          }[fam];
          const Gb = Fm.g(b), G1 = Fm.g(1), rat = Gb.sub(G1);
          const terms = fam === "log" ? [[rat, ONE]].concat(lnCombine([[F(1, 2), b]])) : [[rat, ONE]];
          const L = ex(terms);
          const fyx = (v) => (fam === "cube" ? v ** 3 / 6 + 1 / (2 * v) : fam === "quart" ? v ** 4 / 8 + 1 / (4 * v * v) : (v * v) / 4 - Math.log(v) / 2);
          const atB = fam === "log" ? `${f(Gb)} + ${M.frac(`ln ${n(b)}`, "2")}` : f(Gb);
          return {
            prompt: `Find the length of the curve ${M.eq(`${y} = ${Fm.y}, 1 ≤ ${x} ≤ ${n(b)}`)} Give the exact value.`,
            graph: graph({ view: [0, b + 0.8, -0.5, fyx(b) + 1], items: [{ t: "fn", e: Fm.e }, { t: "pt", x: 1, y: fyx(1) }, { t: "pt", x: b, y: fyx(b) }] }),
            steps: [
              `${y}′ = ${Fm.P} − ${Fm.Q}.`,
              `Square it: ${M.sup(`(${y}′)`, 2)} = ${Fm.P2} − ${M.frac("1", "2")} + ${Fm.Q2}; the middle term is −2 · ${Fm.P} · ${Fm.Q} = −${M.frac("1", "2")}.`,
              `So 1 + ${M.sup(`(${y}′)`, 2)} = ${Fm.P2} + ${M.frac("1", "2")} + ${Fm.Q2} = ${M.sup(`(${Fm.P} + ${Fm.Q})`, 2)}, a perfect square, and ${M.sqrt(`1 + ${M.sup(`(${y}′)`, 2)}`)} = ${Fm.P} + ${Fm.Q}.`,
              `${V("L")} = ${integ(1, n(b))} (${Fm.P} + ${Fm.Q}) ${dif(x)} = [${Fm.G}]${bar(1, n(b))}.`,
              `At ${n(b)}: ${atB}. At 1: ${f(G1)}. ${V("L")} = ${L.h}.`,
            ],
            answer: { kind: "number", value: L.v }, answerText: L.h, answerInput: L.s,
            vals: { Gb: fv(Gb), G1: fv(G1), rat: fv(rat), coefs: terms.map(([c]) => fv(c)) }, params: { fam, b }, consts: [3, 4, 6, 8],
          };
        }
        // level 3: parametric (cycloid) or polar (cardioid)
        if (r.chance(0.5)) {
          const R = r.pick([10, 15, 20, 25, 30, 35]), [frac, turn, cosv] = r.pick([[F(2, 3), "one third of a turn", F(1, 2)], [F(1), "half a turn", F(0)], [F(4, 3), "two thirds of a turn", F(-1, 2)], [F(2), "one full turn", F(-1)]]);
          const R4 = 4 * R, L = F(R4).mul(F(1).sub(cosv)), T = piq(frac), half = piq(frac.div(2));
          const full = curvePts((s_) => R * (s_ - Math.sin(s_)), (s_) => R * (1 - Math.cos(s_)), 0, 2 * Math.PI, 90);
          const done = curvePts((s_) => R * (s_ - Math.sin(s_)), (s_) => R * (1 - Math.cos(s_)), 0, frac.value * Math.PI, 60);
          return {
            prompt: `A bicycle wheel of radius ${n(R)} cm rolls along the ground. A pebble stuck in the tire traces the cycloid ${M.eq(`${x} = ${n(R)}(${t} − sin ${t}), ${y} = ${n(R)}(1 − cos ${t})`)} where ${t} is the angle the wheel has turned. How far does the pebble travel while the wheel makes ${turn} (0 ≤ ${t} ≤ ${T})? Answer in cm.`,
            graph: graph({ view: [-10, 2 * Math.PI * R + 10, -10, 2 * R + 15], equal: true, items: [...polyline(full, "muted"), ...polyline(done, "highlight")] }),
            steps: [
              `${x}′(${t}) = ${n(R)}(1 − cos ${t}) and ${y}′(${t}) = ${n(R)} sin ${t}.`,
              `${M.sup(`${x}′`, 2)} + ${M.sup(`${y}′`, 2)} = ${M.sup(n(R), 2)}(1 − 2 cos ${t} + ${M.sup("cos", 2)} ${t} + ${M.sup("sin", 2)} ${t}) = ${M.sup(n(R), 2)}(2 − 2 cos ${t}) = 4 · ${M.sup(n(R), 2)} ${M.sup("sin", 2)}(${M.frac(t, "2")}), using 1 − cos ${t} = 2 ${M.sup("sin", 2)}(${M.frac(t, "2")}).`,
              `The speed is ${n(2 * R)} sin(${M.frac(t, "2")}) (sin(${M.frac(t, "2")}) ≥ 0 for 0 ≤ ${t} ≤ 2π), so ${V("L")} = ${integ(0, T)} ${n(2 * R)} sin(${M.frac(t, "2")}) ${dif(t)} = [−${n(R4)} cos(${M.frac(t, "2")})]${bar(0, T)}.`,
              `cos(${half}) = ${f(cosv)} and cos 0 = 1, so ${V("L")} = ${n(R4)}(1 − ${fp(cosv)}) = ${f(L)} cm.`,
            ],
            answer: { kind: "number", value: L.value }, answerText: `${f(L)} cm`, answerInput: typed(L),
            vals: { R2: 2 * R, R4, cosv: fv(cosv), L: fv(L), frac: fv(frac), half: fv(frac.div(2)) }, params: { kind: "cycloid", R, frac: fv(frac) }, consts: [4],
          };
        }
        const a = r.int(2, 6), L = 8 * a, a2 = 2 * a, a4 = 4 * a;
        const pts = curvePts((s_) => a * (1 + Math.cos(s_)) * Math.cos(s_), (s_) => a * (1 + Math.cos(s_)) * Math.sin(s_), 0, 2 * Math.PI, 120);
        return {
          prompt: `Find the total length of the cardioid ${M.eq(`${V("r")} = ${a === 1 ? "" : n(a)}(1 + cos ${th})`)}`,
          graph: graph({ view: [-a, 2.4 * a, -1.6 * a, 1.6 * a], equal: true, items: [{ t: "poly", p: pts, role: "primary" }] }),
          steps: [
            `Polar arc length: ${V("L")} = ∫ ${M.sqrt(`${M.sup(V("r"), 2)} + ${M.sup(`(${V("r")}′)`, 2)}`)} ${dif(th)}, with ${V("r")}′ = ${kf(-a, `sin ${th}`)}.`,
            `${M.sup(V("r"), 2)} + ${M.sup(`(${V("r")}′)`, 2)} = ${M.sup(n(a), 2)}(1 + 2 cos ${th} + ${M.sup("cos", 2)} ${th} + ${M.sup("sin", 2)} ${th}) = ${M.sup(n(a), 2)}(2 + 2 cos ${th}) = 4 · ${M.sup(n(a), 2)} ${M.sup("cos", 2)}(${M.frac(th, "2")}), using 1 + cos ${th} = 2 ${M.sup("cos", 2)}(${M.frac(th, "2")}).`,
            `The root is ${n(a2)}|cos(${M.frac(th, "2")})|. The curve is symmetric about the ${x}-axis, and cos(${M.frac(th, "2")}) ≥ 0 for 0 ≤ ${th} ≤ π, so ${V("L")} = 2${integ(0, "π")} ${n(a2)} cos(${M.frac(th, "2")}) ${dif(th)}.`,
            `= 2[${n(a4)} sin(${M.frac(th, "2")})]${bar(0, "π")} = 2 · ${n(a4)} = ${n(L)}.`,
          ],
          answer: { kind: "number", value: L }, answerText: n(L), answerInput: String(L),
          vals: { L, a2, a4 }, params: { kind: "cardioid", a }, consts: [4],
        };
      },
    },

    // ---- C2.11 Surface area of revolution ---------------------------------------------------------------
    "C2.surface": {
      title: "Surface area of revolution",
      generate(r, level) {
        if (level === 1) {
          const [mn, md, hyp] = r.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17]]), k = r.int(1, 2);
          const m = F(mn, md), b = md * k, bb = b * b, sq = F(md * md + mn * mn, md * md), rt = F(hyp, md), rad = mn * k, ell = hyp * k;
          const coef = m.mul(rt).mul(bb), ans = ex([[coef, PI]]);
          return {
            prompt: `The segment ${M.eq(`${y} = ${kv(m, x)}, 0 ≤ ${x} ≤ ${n(b)}`)} is rotated about the ${x}-axis, sweeping out a cone. Find the area of the surface with the integral formula. Give the exact value.`,
            graph: graph({ view: [-1, b + 1, -rad - 1, rad + 1], equal: true, items: [{ t: "fn", e: `${mn}/${md}*x` }, { t: "fn", e: `-${mn}/${md}*x`, role: "muted" }, { t: "seg", a: [b, -rad], b: [b, rad], dash: true, role: "muted" }] }),
            steps: [
              `${y}′ = ${f(m)}, so ${M.sqrt(`1 + ${M.sup(`(${y}′)`, 2)}`)} = ${M.sqrt(`1 + ${M.sup(`(${f(m)})`, 2)}`)} = ${M.sqrt(f(sq))} = ${f(rt)}.`,
              `${V("S")} = 2π${integ(0, n(b))} ${kv(m, x)} · ${f(rt)} ${dif(x)} = 2π · ${f(m)} · ${f(rt)} · ${M.frac(M.sup(n(b), 2), "2")} = ${ans.h}.`,
              `Check with geometry: the cone has radius ${V("r")} = ${f(m)} · ${n(b)} = ${n(rad)} and slant height ${n(b)} · ${f(rt)} = ${n(ell)}, and π${V("r")}ℓ = π · ${n(rad)} · ${n(ell)} = ${ans.h}.`,
            ],
            answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
            vals: { m: fv(m), sq: fv(sq), rt: fv(rt), bb, rad, ell, coef: fv(coef) }, params: { mn, md, b },
          };
        }
        if (level === 2) {
          const R = r.pick([5, 6, 8, 10, 12]);
          let a, b;
          do { a = r.int(-R, R - 1); b = r.int(a + 1, R); } while (b - a > R + 2 || b - a < 2);
          const RR = R * R, w = b - a, coef = 2 * R * w, ans = ex([[coef, PI]]);
          return {
            prompt: `A lampshade is the band of a sphere of radius ${n(R)} cm between two parallel planes: rotate ${M.eq(`${y} = ${M.sqrt(`${n(RR)} − ${M.sup(x, 2)}`)}, ${n(a)} ≤ ${x} ≤ ${n(b)}`)} about the ${x}-axis. Find its surface area in cm².`,
            graph: graph({ view: [-R - 1, R + 1, -R - 1, R + 1], equal: true, items: [{ t: "circle", c: [0, 0], r: R, role: "muted" }, { t: "fn", e: `sqrt(${RR} - x^2)` }, { t: "vline", x: a, dash: true }, { t: "vline", x: b, dash: true }] }),
            steps: [
              `${y}′ = ${M.frac(`−${x}`, M.sqrt(`${n(RR)} − ${M.sup(x, 2)}`))}, so 1 + ${M.sup(`(${y}′)`, 2)} = 1 + ${M.frac(M.sup(x, 2), `${n(RR)} − ${M.sup(x, 2)}`)} = ${M.frac(n(RR), `${n(RR)} − ${M.sup(x, 2)}`)}.`,
              `${y}${M.sqrt(`1 + ${M.sup(`(${y}′)`, 2)}`)} = ${M.sqrt(`${n(RR)} − ${M.sup(x, 2)}`)} · ${M.frac(n(R), M.sqrt(`${n(RR)} − ${M.sup(x, 2)}`))} = ${n(R)}: the integrand is constant.`,
              `${V("S")} = 2π${integ(n(a), n(b))} ${n(R)} ${dif(x)} = 2π · ${n(R)} · (${n(b)} − ${np(a)}) = ${ans.h} cm².`,
            ],
            answer: { kind: "number", value: ans.v }, answerText: `${ans.h} cm²`, answerInput: ans.s,
            vals: { RR, w, coef }, params: { R, a, b },
          };
        }
        let a, b;
        do { a = r.pick([0, 2, 6]); b = r.pick([2, 6, 12, 20]); } while (b <= a);
        const A = Math.round(Math.sqrt(4 * a + 1)), B = Math.round(Math.sqrt(4 * b + 1)), A3 = A ** 3, B3 = B ** 3, coef = F(B3 - A3, 6), ans = ex([[coef, PI]]);
        return {
          prompt: `A reflector is made by rotating ${M.eq(`${y} = ${M.sqrt(x)}, ${n(a)} ≤ ${x} ≤ ${n(b)}`)} (${x} and ${y} in decimeters) about the ${x}-axis. Find its surface area in dm².`,
          graph: graph({ view: [-0.5, b + 1, -Math.sqrt(b) - 1, Math.sqrt(b) + 1], equal: true, items: [{ t: "fn", e: "sqrt(x)" }, { t: "fn", e: "-sqrt(x)", role: "muted" }, { t: "vline", x: a, dash: true }, { t: "vline", x: b, dash: true }] }),
          steps: [
            `${y}′ = ${M.frac("1", `2${M.sqrt(x)}`)}, so 1 + ${M.sup(`(${y}′)`, 2)} = 1 + ${M.frac("1", `4${x}`)} = ${M.frac(`4${x} + 1`, `4${x}`)}.`,
            `${y}${M.sqrt(`1 + ${M.sup(`(${y}′)`, 2)}`)} = ${M.sqrt(x)} · ${M.frac(M.sqrt(`4${x} + 1`), `2${M.sqrt(x)}`)} = ${M.frac(M.sqrt(`4${x} + 1`), "2")}.`,
            `${V("S")} = 2π${integ(n(a), n(b))} ${M.frac(M.sqrt(`4${x} + 1`), "2")} ${dif(x)} = π${integ(n(a), n(b))} ${M.sqrt(`4${x} + 1`)} ${dif(x)} = π · ${M.frac("1", "4")} · ${M.frac("2", "3")}[${M.sup(`(4${x} + 1)`, "3/2")}]${bar(n(a), n(b))} = ${M.frac("π", "6")}[${M.sup(`(4${x} + 1)`, "3/2")}]${bar(n(a), n(b))}.`,
            `${M.sup(n(4 * b + 1), "3/2")} = ${M.sup(n(B), 3)} = ${n(B3)} and ${M.sup(n(4 * a + 1), "3/2")} = ${n(A3)}, so ${V("S")} = ${M.frac("π", "6")}(${n(B3)} − ${n(A3)}) = ${ans.h} dm².`,
          ],
          answer: { kind: "number", value: ans.v }, answerText: `${ans.h} dm²`, answerInput: ans.s,
          vals: { A, B, A3, B3, a4: 4 * a + 1, b4: 4 * b + 1, coef: fv(coef) }, params: { a, b }, consts: [3, 4, 6],
        };
      },
    },

    // ---- C2.12 Average value -------------------------------------------------------------------------
    "C2.8": {
      title: "Average value of a function",
      generate(r, level) {
        if (level === 1) {
          const a = r.int(-2, 2), len = r.pick([2, 3, 4, 6]), b = a + len;
          const fpol = [r.int(-5, 5), r.int(-4, 4), r.nonzero(-3, 3)], G = pint(fpol), Gb = peval(G, b), Ga = peval(G, a), I = Gb.sub(Ga), avg = I.div(len);
          const fx = polyFn(fpol);
          let lo = 0, hi = 0;
          for (let i = 0; i <= 40; i++) { const v = fx(a + (len * i) / 40); lo = Math.min(lo, v); hi = Math.max(hi, v); }
          return {
            prompt: `Find the average value of ${M.eq(`${V("f")}(${x}) = ${ph(fpol)}`)} on the interval [${n(a)}, ${n(b)}].`,
            graph: graph({ view: [a - 1, b + 1, lo - 0.3 * (hi - lo) - 1, hi + 0.3 * (hi - lo) + 1], items: [{ t: "fn", e: ps(fpol) }, { t: "vline", x: a, dash: true, role: "muted" }, { t: "vline", x: b, dash: true, role: "muted" }] }),
            steps: [
              `${M.sub(V("f"), "avg")} = ${M.frac("1", `${V("b")} − ${V("a")}`)}${integ(V("a"), V("b"))} ${V("f")}(${x}) ${dif(x)}, here with ${V("b")} − ${V("a")} = ${n(b)} − ${np(a)} = ${n(len)}.`,
              `${integ(n(a), n(b))} (${ph(fpol)}) ${dif(x)} = [${ph(G)}]${bar(n(a), n(b))} = ${f(Gb)} − ${fp(Ga)} = ${f(I)}.`,
              `${M.sub(V("f"), "avg")} = ${M.frac(f(I), n(len))} = ${f(avg)}.`,
            ],
            answer: { kind: "number", value: avg.value }, answerText: f(avg), answerInput: typed(avg),
            vals: { b, len, G: fvs(G), Gb: fv(Gb), Ga: fv(Ga), I: fv(I), avg: fv(avg) }, params: { a, b, fpol: fvs(fpol) }, consts: [3],
          };
        }
        if (level === 2) {
          const k = r.int(1, 4);
          if (r.chance(0.5)) {
            const j = r.int(1, 3), b = 3 * j, avg = k * 3 * j * j, I = k * 9 * j * j * j;  // ∫₀ᵇ kx² = kb³/3
            const ans = ex([[F(j), SQ(3)]]);
            return {
              prompt: `The Mean Value Theorem for Integrals says ${V("f")}(${V("c")}) equals the average of ${V("f")} on [0, ${n(b)}] for some ${V("c")} in that interval. Find ${V("c")} for ${M.eq(`${V("f")}(${x}) = ${kv(k, M.sup(x, 2))}`)}`,
              graph: graph({ view: [-1, b + 1, -2, k * b * b * 1.1 + 2], items: [{ t: "fn", e: `${k}x^2` }, { t: "hline", y: avg, dash: true, role: "muted" }] }),
              steps: [
                `${integ(0, n(b))} ${kv(k, M.sup(x, 2))} ${dif(x)} = [${kv(F(k, 3), M.sup(x, 3))}]${bar(0, n(b))} = ${n(I)}, so the average is ${M.frac(n(I), n(b))} = ${n(avg)} (the dashed line).`,
              `Solve ${kv(k, M.sup(V("c"), 2))} = ${n(avg)}: ${M.sup(V("c"), 2)} = ${n(3 * j * j)}, so ${V("c")} = ${M.sqrt(n(3 * j * j))}${j === 1 ? "" : ` = ${ans.h}`} (the negative root is outside [0, ${n(b)}]).`,
              ],
              answer: { kind: "number", value: ans.v }, answerText: `${V("c")} = ${ans.h}`, answerInput: ans.s,
              vals: { b, I, avg, cc: 3 * j * j, j }, params: { kind: "sq", k, b }, consts: [3],
            };
          }
          const j = r.int(1, 3), b = 9 * j * j, rb = 3 * j, I = F(2 * k * rb * b, 3), avg = I.div(b), c = 4 * j * j, rc = 2 * j;
          return {
            prompt: `The Mean Value Theorem for Integrals says ${V("f")}(${V("c")}) equals the average of ${V("f")} on [0, ${n(b)}] for some ${V("c")} in that interval. Find ${V("c")} for ${M.eq(`${V("f")}(${x}) = ${kv(k, M.sqrt(x))}`)}`,
            graph: graph({ view: [-1, b + 1, -1, k * rb * 1.2 + 1], items: [{ t: "fn", e: `${k}sqrt(x)` }, { t: "hline", y: avg.value, dash: true, role: "muted" }] }),
            steps: [
              `${integ(0, n(b))} ${kv(k, M.sqrt(x))} ${dif(x)} = [${kv(F(2 * k, 3), M.sup(x, "3/2"))}]${bar(0, n(b))} = ${M.frac(`${n(2 * k)} · ${M.sup(n(b), "3/2")}`, "3")} = ${f(I)}, since ${M.sup(n(b), "3/2")} = ${M.sup(n(rb), 3)}.`,
              `The average is ${M.frac(f(I), n(b))} = ${f(avg)} (the dashed line).`,
              `Solve ${kv(k, M.sqrt(V("c")))} = ${f(avg)}: ${M.sqrt(V("c"))} = ${n(rc)}, so ${V("c")} = ${n(c)}.`,
            ],
            answer: { kind: "number", value: c }, answerText: `${V("c")} = ${n(c)}`, answerInput: String(c),
            vals: { b, rb, I: fv(I), avg: fv(avg), c, rc, k2: 2 * k }, params: { kind: "root", k, b }, consts: [3],
          };
        }
        // level 3: word problems with a calculator
        if (r.chance(0.5)) {
          const V0 = r.pick([120, 155, 170, 311, 325, 340]), rms = V0 / Math.SQRT2, V2 = V0 * V0, half = V2 / 2;
          return {
            prompt: `A household outlet supplies ${M.eq(`${V("V")}(${t}) = ${n(V0)} sin(120π${t})`)} volts (60 Hz). Find its root-mean-square voltage over one period, 0 ≤ ${t} ≤ ${M.frac("1", "60")} s. Round to 2 decimal places.`,
            steps: [
              `${M.sub(V("V"), "rms")} = ${M.sqrt(`${M.frac("1", V("T"))}${integ(0, V("T"))} ${M.sup(V("V"), 2)} ${dif(t)}`)} with ${V("T")} = ${M.frac("1", "60")}. Square: ${M.sup(V("V"), 2)} = ${n(V2)} ${M.sup("sin", 2)}(120π${t}).`,
              `Power reduction: ${M.sup("sin", 2)}(120π${t}) = ${M.frac(`1 − cos(240π${t})`, "2")}. Over a whole period the cosine averages to 0, so the average of ${M.sup("sin", 2)} is ${M.frac("1", "2")}.`,
              `The mean of ${M.sup(V("V"), 2)} is ${n(V2)} · ${M.frac("1", "2")} = ${n(half)}, so ${M.sub(V("V"), "rms")} = ${M.sqrt(n(half))} = ${M.frac(n(V0), M.sqrt("2"))} ≈ ${M.n(rms, { dp: 2 })} V.`,
            ],
            answer: { kind: "number", value: rms, dp: 2 }, answerText: `${M.n(rms, { dp: 2 })} V`, answerInput: M.n(rms, { dp: 2 }),
            vals: { V2, half, rms }, params: { kind: "rms", V0 }, consts: [60, 120, 240],
          };
        }
        const A = r.int(12, 24), B = r.int(3, 9), avg = A + (2 * B) / Math.PI, twoB = 2 * B;
        return {
          prompt: `On a spring day the temperature ${t} hours after 6 a.m. is ${M.eq(`${V("T")}(${t}) = ${n(A)} + ${n(B)} sin(${M.frac(`π${t}`, "12")})`)} in °C. Find the average temperature between 6 a.m. and 6 p.m. (0 ≤ ${t} ≤ 12). Round to 2 decimal places.`,
          graph: graph({ view: [-1, 13, 0, A + B + 3], items: [{ t: "fn", e: `${A} + ${B}sin(pi*x/12)` }] }),
          steps: [
            `${M.sub(V("T"), "avg")} = ${M.frac("1", "12")}${integ(0, 12)} (${n(A)} + ${n(B)} sin(${M.frac(`π${t}`, "12")})) ${dif(t)}.`,
            `${integ(0, 12)} ${n(A)} ${dif(t)} = 12 · ${n(A)}, and ${integ(0, 12)} sin(${M.frac(`π${t}`, "12")}) ${dif(t)} = [−${M.frac("12", "π")} cos(${M.frac(`π${t}`, "12")})]${bar(0, 12)} = ${M.frac("12", "π")}(1 − (−1)) = ${M.frac("24", "π")}.`,
            `${M.sub(V("T"), "avg")} = ${n(A)} + ${M.frac("1", "12")} · ${n(B)} · ${M.frac("24", "π")} = ${n(A)} + ${M.frac(n(twoB), "π")} ≈ ${M.n(avg, { dp: 2 })} °C.`,
          ],
          answer: { kind: "number", value: avg, dp: 2 }, answerText: `${M.n(avg, { dp: 2 })} °C`, answerInput: M.n(avg, { dp: 2 }),
          vals: { avg, twoB }, params: { kind: "temp", A, B }, consts: [6, 12, 24],
        };
      },
    },

    // ---- C2.13 Work, pumping and hydrostatic force ----------------------------------------------------------
    "C2.work": {
      title: "Work, pumping and hydrostatic force",
      generate(r, level) {
        if (level === 1) {
          const j = r.int(1, 8), k = 50 * j, d0 = r.pick([10, 20, 50]), F0 = (k * d0) / 100, dcm = 2 * r.int(5, 30);
          const d0m = F(d0, 100), dm = F(dcm, 100), W = F(k).mul(dm).mul(dm).div(2);
          return {
            prompt: `A force of ${n(F0)} N holds a spring stretched ${n(d0)} cm beyond its natural length. How much work does it take to stretch it from its natural length to ${n(dcm)} cm beyond it? Answer in joules.`,
            steps: [
              `Hooke's law: ${V("F")} = ${V("k")}${x}. In meters, ${n(F0)} = ${V("k")} · ${dec(d0m)}, so ${V("k")} = ${n(k)} N/m.`,
              `${V("W")} = ${integ(0, dec(dm))} ${n(k)}${x} ${dif(x)} = ${M.frac(n(k), "2")} · ${M.sup(dec(dm), 2)} = ${dec(W)} J.`,
            ],
            answer: { kind: "number", value: W.value }, answerText: `${dec(W)} J`, answerInput: dec(W).replace("−", "-"),
            vals: { k, d0m: fv(d0m), dm: fv(dm), W: fv(W) }, params: { F0, d0, dcm }, consts: [100],
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const Wd = r.int(1, 4), H = r.int(1, 3), D = r.int(0, 3), bot = D + H;
            const Fz = 4900 * Wd * (bot * bot - D * D);
            return {
              prompt: `A vertical rectangular gate in a dam is ${n(Wd)} m wide and ${n(H)} m tall, with its top edge ${D === 0 ? "at the water surface" : `${n(D)} m below the surface`}. Find the hydrostatic force on the gate, in newtons. Use ρ${V("g")} = 9800 N/m³ for water.`,
              graph: graph({ view: [-1, Wd + 1, -(bot + 1), 1], equal: true, axes: false, grid: false, items: [{ t: "hline", y: 0, role: "secondary" }, { t: "poly", p: [[0, -D], [Wd, -D], [Wd, -bot], [0, -bot]], fill: true, role: "highlight" }, { t: "text", x: Wd / 2, y: 0.4, s: "surface" }] }),
              steps: [
                `Measure depth ${y} downward from the surface. A horizontal strip at depth ${y} has area ${n(Wd)} ${dif(y)} and feels pressure 9800${y}.`,
                `${V("F")} = ${integ(n(D), n(bot))} 9800${y} · ${n(Wd)} ${dif(y)} = ${n(9800 * Wd)}[${M.frac(M.sup(y, 2), "2")}]${bar(n(D), n(bot))} = ${n(4900 * Wd)}(${M.sup(n(bot), 2)} − ${M.sup(n(D), 2)}).`,
                `= ${n(4900 * Wd)} · ${n(bot * bot - D * D)} = ${P.grouped(Fz)} N.`,
              ],
              answer: { kind: "number", value: Fz }, answerText: `${P.grouped(Fz)} N`, answerInput: String(Fz),
              vals: { bot, w98: 9800 * Wd, w49: 4900 * Wd, dd: bot * bot - D * D, Fz }, params: { kind: "rect", Wd, H, D }, consts: [9800],
            };
          }
          let Wd, H;
          do { Wd = r.int(1, 6); H = r.int(1, 4); } while ((Wd * H * H) % 3 !== 0);
          const Fz = (9800 * Wd * H * H) / 6;
          return {
            prompt: `A triangular plate is submerged vertically with its top edge, ${n(Wd)} m long, along the water surface and its opposite vertex ${n(H)} m below. Find the hydrostatic force on one side, in newtons. Use ρ${V("g")} = 9800 N/m³.`,
            graph: graph({ view: [-Wd / 2 - 1, Wd / 2 + 1, -H - 1, 1], equal: true, axes: false, grid: false, items: [{ t: "hline", y: 0, role: "secondary" }, { t: "poly", p: [[-Wd / 2, 0], [Wd / 2, 0], [0, -H]], fill: true, role: "highlight" }] }),
            steps: [
              `At depth ${y} the plate's width shrinks linearly from ${n(Wd)} at the top to 0 at depth ${n(H)}: ${V("w")}(${y}) = ${M.frac(n(Wd), n(H))}(${n(H)} − ${y}) by similar triangles.`,
              `${V("F")} = ${integ(0, n(H))} 9800${y} · ${M.frac(n(Wd), n(H))}(${n(H)} − ${y}) ${dif(y)} = 9800 · ${M.frac(n(Wd), n(H))}[${M.frac(`${n(H)}${M.sup(y, 2)}`, "2")} − ${M.frac(M.sup(y, 3), "3")}]${bar(0, n(H))}.`,
              `The bracket is ${M.frac(M.sup(n(H), 3), "2")} − ${M.frac(M.sup(n(H), 3), "3")} = ${M.frac(M.sup(n(H), 3), "6")}, so ${V("F")} = ${M.frac(`9800 · ${n(Wd)} · ${M.sup(n(H), 2)}`, "6")} = ${P.grouped(Fz)} N.`,
            ],
            answer: { kind: "number", value: Fz }, answerText: `${P.grouped(Fz)} N`, answerInput: String(Fz),
            vals: { Fz }, params: { kind: "tri", Wd, H }, consts: [9800, 3, 6],
          };
        }
        // level 3: pumping
        for (;;) {
          const cone = r.chance(0.5), R = r.int(2, 3), H = r.int(2, 6), sOut = r.int(0, 2), L = H + sOut;
          const Dp = cone ? H : r.int(1, H);
          let coef, bracket, steps;
          const RR = R * R;
          if (!cone) {
            bracket = F(L * Dp).sub(F(Dp * Dp, 2));
            coef = bracket.mul(9800 * RR);
            if (!coef.isInt()) continue;
            steps = [
              `Let ${y} be the height above the bottom. The slab at height ${y} has volume π · ${M.sup(n(R), 2)} ${dif(y)}, weight 9800π · ${n(RR)} ${dif(y)} newtons, and must rise ${n(L)} − ${y} meters to the outlet.`,
              `${V("W")} = ${integ(0, n(Dp))} 9800π · ${n(RR)}(${n(L)} − ${y}) ${dif(y)} = ${n(9800 * RR)}π[${kv(L, y)} − ${M.frac(M.sup(y, 2), "2")}]${bar(0, n(Dp))}.`,
              `The bracket is ${n(L)} · ${n(Dp)} − ${M.frac(M.sup(n(Dp), 2), "2")} = ${f(bracket)}, so ${V("W")} = ${n(9800 * RR)} · ${f(bracket)} π = ${P.grouped(coef.value)}π ≈ ${P.grouped(coef.value * Math.PI)} J.`,
            ];
          } else {
            const HH = H * H;
            bracket = F(L * H, 3).sub(F(HH, 4));   // ∫₀ᴴ y²(L − y) dy ÷ H²
            coef = bracket.mul(9800 * RR);
            if (!coef.isInt()) continue;
            steps = [
              `Let ${y} be the height above the vertex. By similar triangles the radius there is ${M.frac(n(R), n(H))}${y}, so the slab has volume π${M.sup(`(${M.frac(n(R), n(H))}${y})`, 2)} ${dif(y)} and must rise ${n(L)} − ${y} meters.`,
              `${V("W")} = ${integ(0, n(H))} 9800π ${M.frac(n(RR), n(HH))}${M.sup(y, 2)}(${n(L)} − ${y}) ${dif(y)} = 9800π ${M.frac(n(RR), n(HH))}[${M.frac(`${n(L)}${M.sup(y, 3)}`, "3")} − ${M.frac(M.sup(y, 4), "4")}]${bar(0, n(H))}.`,
              `The bracket is ${M.frac(`${n(L)} · ${M.sup(n(H), 3)}`, "3")} − ${M.frac(M.sup(n(H), 4), "4")} = ${n(HH)} · ${f(bracket)}, so ${V("W")} = 9800π · ${n(RR)} · ${f(bracket)} = ${P.grouped(coef.value)}π ≈ ${P.grouped(coef.value * Math.PI)} J.`,
            ];
          }
          const ans = ex([[coef, PI]]);
          const shape = cone
            ? `A tank is an inverted cone (vertex down) ${n(H)} m deep with a top radius of ${n(R)} m. It is full of water.`
            : `A cylindrical tank stands upright: radius ${n(R)} m, height ${n(H)} m. It holds water ${n(Dp)} m deep.`;
          const items = cone
            ? [{ t: "poly", p: [[0, 0], [R, H], [-R, H]], fill: true, role: "highlight" }]
            : [{ t: "poly", p: [[-R, 0], [R, 0], [R, Dp], [-R, Dp]], fill: true, role: "highlight" }, { t: "poly", p: [[-R, 0], [R, 0], [R, H], [-R, H]], role: "primary" }];
          if (sOut) items.push({ t: "seg", a: [0, H], b: [0, L], role: "secondary" });
          items.push({ t: "text", x: 0, y: L + 0.4, s: "outlet" });
          return {
            prompt: `${shape} How much work does it take to pump all the water out through an outlet ${sOut ? `${n(sOut)} m above the top` : "at the top"}? Use ρ${V("g")} = 9800 N/m³. Give the exact value in joules (a multiple of π).`,
            graph: graph({ view: [-R - 1.5, R + 1.5, -0.8, L + 1.2], equal: true, axes: false, grid: false, items }),
            steps,
            answer: { kind: "number", value: ans.v }, answerText: `${P.grouped(coef.value)}π J`, answerInput: `${coef.value}pi`,
            vals: { L, RR, bracket: fv(bracket), coef: fv(coef), approx: coef.value * Math.PI, w98: 9800 * RR, HH: H * H }, params: { cone: cone ? 1 : 0, R, H, sOut, Dp }, consts: [9800, 3, 4],
          };
        }
      },
    },

    // ---- C2.14 Center of mass -------------------------------------------------------------------------
    "C2.mass": {
      title: "Moments and center of mass",
      generate(r, level) {
        if (level === 1) {
          let xs;
          do { xs = [r.int(-6, 8), r.int(-6, 8), r.int(-6, 8)]; } while (new Set(xs).size < 3);
          const ms = [r.int(1, 9), r.int(1, 9), r.int(1, 9)];
          const Mtot = ms[0] + ms[1] + ms[2], mom = ms.reduce((acc, m, i) => acc + m * xs[i], 0), xbar = F(mom, Mtot);
          return {
            prompt: `Masses of ${ms.map((m) => `${n(m)} kg`).join(", ").replace(/, ([^,]*)$/, " and $1")} sit on a light rod at ${x} = ${xs.map(n).join(", ").replace(/, ([^,]*)$/, " and $1")} m, in that order. Where is the balance point (center of mass)? Answer in meters.`,
            graph: graph({ view: [-8, 10, -2, 3], items: xs.map((xx, i) => ({ t: "pt", x: xx, y: 0, label: `${ms[i]} kg` })) }),
            steps: [
              `Total mass: ${ms.map(n).join(" + ")} = ${n(Mtot)} kg.`,
              `Moment about 0: ${ms.map((m, i) => `${n(m)} · ${np(xs[i])}`).join(" + ")} = ${n(mom)} kg·m.`,
              `${V("x̄")} = ${M.frac(n(mom), n(Mtot))}${xbar.d === Mtot && xbar.n === mom ? "" : ` = ${f(xbar)}`} m.`,
            ],
            answer: { kind: "number", value: xbar.value }, answerText: `${f(xbar)} m`, answerInput: typed(xbar),
            vals: { Mtot, mom, xbar: fv(xbar) }, params: { ms, xs },
          };
        }
        if (level === 2) {
          const al = r.int(1, 6), be = r.int(1, 4), L = r.int(1, 6);
          const rho = [al, be], Mm = pdef(rho, 0, L), Mo = pdef(pmul([0, 1], rho), 0, L), xbar = Mo.div(Mm);
          return {
            prompt: `A rod lies along 0 ≤ ${x} ≤ ${n(L)} m and its density is ${M.eq(`ρ(${x}) = ${M.poly([be, al])} kg/m`)} (heavier toward the right). Find its center of mass in meters.`,
            steps: [
              `Mass: ${V("m")} = ${integ(0, n(L))} (${M.poly([be, al])}) ${dif(x)} = [${ph(pint(rho))}]${bar(0, n(L))} = ${f(Mm)} kg.`,
              `Moment: ${integ(0, n(L))} ${x}(${M.poly([be, al])}) ${dif(x)} = [${ph(pint(pmul([0, 1], rho)))}]${bar(0, n(L))} = ${f(Mo)} kg·m.`,
              `${V("x̄")} = ${M.frac(f(Mo), f(Mm))} = ${f(xbar)} m, a little right of the middle (${f(F(L, 2))} m), as the density suggests.`,
            ],
            answer: { kind: "number", value: xbar.value }, answerText: `${f(xbar)} m`, answerInput: typed(xbar),
            vals: { Mm: fv(Mm), Mo: fv(Mo), xbar: fv(xbar), half: fv(F(L, 2)), anti: fvs(pint(rho)), anti2: fvs(pint(pmul([0, 1], rho))) }, params: { al, be, L }, consts: [3],
          };
        }
        const kind = r.pick(["sq", "arch", "tri"]);
        let fpol, b;
        if (kind === "sq") { b = r.int(1, 3); fpol = [0, 0, 1]; }
        else if (kind === "arch") { b = r.int(2, 4); fpol = [0, b, -1]; }
        else { b = r.int(2, 6); fpol = [0, r.int(1, 3)]; }
        const A = pdef(fpol, 0, b), My = pdef(pmul([0, 1], fpol), 0, b), half2 = pscale(pmul(fpol, fpol), F(1, 2)), Mx = pdef(half2, 0, b);
        const xb = My.div(A), yb = Mx.div(A), fx = polyFn(fpol);
        const top = Math.max(...[0.25, 0.5, 0.75, 1].map((s_) => fx(s_ * b)));
        return {
          prompt: `Find the centroid (${V("x̄")}, ${V("ȳ")}) of the region under ${M.eq(`${y} = ${ph(fpol)}`)} above the ${x}-axis, for 0 ≤ ${x} ≤ ${n(b)}.`,
          graph: graph({ view: [-0.8, b + 0.8, -0.8, top + 1], equal: top < 3 * b && b < 3 * top, items: [region(fx, () => 0, 0, b), { t: "fn", e: ps(fpol) }] }),
          steps: [
            `Area: ${V("A")} = ${integ(0, n(b))} (${ph(fpol)}) ${dif(x)} = ${f(A)}.`,
            `${M.sub(V("M"), y)} = ${integ(0, n(b))} ${x}(${ph(fpol)}) ${dif(x)} = ${integ(0, n(b))} (${ph(pmul([0, 1], fpol))}) ${dif(x)} = ${f(My)}, so ${V("x̄")} = ${M.frac(f(My), f(A))} = ${f(xb)}.`,
            `${M.sub(V("M"), x)} = ${integ(0, n(b))} ${M.frac("1", "2")}${M.sup(`(${ph(fpol)})`, 2)} ${dif(x)} = ${integ(0, n(b))} (${ph(half2)}) ${dif(x)} = ${f(Mx)}, so ${V("ȳ")} = ${M.frac(f(Mx), f(A))} = ${f(yb)}.`,
            `The centroid is (${f(xb)}, ${f(yb)}).`,
          ],
          answer: { kind: "point", value: [xb.value, yb.value] }, answerText: `(${f(xb)}, ${f(yb)})`, answerInput: `(${typed(xb)}, ${typed(yb)})`,
          vals: { A: fv(A), My: fv(My), Mx: fv(Mx), xb: fv(xb), yb: fv(yb), half2: fvs(half2) }, params: { kind, b, fpol: fvs(fpol) }, consts: [3, 4],
        };
      },
    },
  });

  // ==== Sequences and series ======================================================================
  const nv = V("n"), kvv = V("k");
  const sum = (lo, v = nv) => `Σ<sub>${v} = ${lo}</sub><sup>∞</sup>`;
  const limn = `${M.sub("lim", `${nv} → ∞`)} `;
  /** n^p for a fraction p written with roots: √n, ∛(n²), n√n, n². */
  const npow = (p, v = nv) => {
    p = Frac.of(p);
    const whole = Math.floor(p.n / p.d), j = p.n - whole * p.d, k = p.d;
    const wp = whole === 0 ? "" : whole === 1 ? v : M.sup(v, whole);
    if (j === 0) return wp || "1";
    const root = k === 2 ? M.sqrt(v) : M.sqrt(j === 1 ? v : M.sup(v, j), String(k));
    return `${wp}${root}`;
  };
  const supq = (q) => (Frac.of(q).d === 1 ? n(Frac.of(q).n) : `${n(Frac.of(q).n)}/${Frac.of(q).d}`);
  const overT = (c, den) => (c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${M.frac(n(Math.abs(c)), den)}`);
  const powk = (base, k) => (k === 1 ? base : M.sup(base, k));
  const geoT = (q) => (Frac.of(q).d === 1 ? M.sup(n(Frac.of(q).n), nv) : M.sup(`(${f(q)})`, nv));
  const factorial = (k) => { let out = 1; for (let i = 2; i <= k; i++) out *= i; return out; };
  const ptsGraph = (pts, extra = []) => {
    const ys = pts.map((p_) => p_[1]), lo = Math.min(0, ...ys), hi = Math.max(0, ...ys), pad = 0.15 * (hi - lo) + 0.3;
    return graph({ view: [-0.5, pts.length + 0.8, lo - pad, hi + pad], items: pts.map(([a, b]) => ({ t: "pt", x: a, y: b })).concat(extra) });
  };

  P.define("calculus2", {
    // ---- C2.15 Sequences ----------------------------------------------------------------------------
    "C2.9": {
      title: "Limits of sequences",
      generate(r, level) {
        if (level === 1) {
          const a = r.nonzero(-6, 6), b = r.int(-5, 5), c = r.int(-5, 5), dd = r.int(1, 6), e = r.int(0, 9);
          const L = F(a, dd), an = (k) => (a * k * k + b * k + c) / (dd * k * k + e);
          const nn = M.sup(nv, 2);
          return {
            prompt: `Find ${M.eq(`${limn}${M.frac(M.poly([a, b, c], "n"), M.poly([dd, 0, e], "n"))}`)}`,
            graph: ptsGraph(Array.from({ length: 12 }, (_, i) => [i + 1, an(i + 1)])),
            steps: [
              `Divide the top and bottom by the dominant power ${nn}: ${M.frac(`${n(a)}${overT(b, nv)}${overT(c, nn)}`, `${n(dd)}${overT(e, nn)}`)}.`,
              `As ${nv} → ∞ every term with ${nv} in a denominator → 0, so the limit is ${dd === 1 ? n(a) : `${M.frac(n(a), n(dd))}${L.d === dd && L.n === a ? "" : ` = ${f(L)}`}`}. (The graph shows the terms settling toward it.)`,
            ],
            answer: { kind: "number", value: L.value }, answerText: f(L), answerInput: typed(L),
            vals: { L: fv(L) }, params: { a, b, c, dd, e },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const a = r.nonzero(-3, 3), b = r.int(1, 3), ab = a * b, E = EXP(ab);
            const an = M.sup(`(1 ${a > 0 ? "+" : "−"} ${M.frac(n(Math.abs(a)), nv)})`, kv(b, nv));
            return {
              prompt: `Find ${M.eq(`${limn}${an}`)}`,
              steps: [
                `This is a 1<sup>∞</sup> form; take logarithms. ln ${V("a")}<sub>${nv}</sub> = ${kv(b, nv)} ln(1 ${a > 0 ? "+" : "−"} ${M.frac(n(Math.abs(a)), nv)}) = ${M.frac(`${b === 1 ? "" : `${n(b)} `}ln(1 ${a > 0 ? "+" : "−"} ${M.frac(n(Math.abs(a)), nv)})`, M.frac("1", nv))}, a ${M.frac("0", "0")} form.`,
                `Treat ${nv} as a real variable ${x} and use L'Hôpital's rule (put ${V("h")} = ${M.frac("1", x)} → 0): ${b === 1 ? "" : `${n(b)} · `}${M.frac(`ln(1 ${a > 0 ? "+" : "−"} ${kv(Math.abs(a), V("h"))})`, V("h"))} → ${b === 1 ? "" : `${n(b)} · `}${M.frac(n(a), `1 ${a > 0 ? "+" : "−"} ${kv(Math.abs(a), V("h"))}`)} → ${n(ab)}.`,
                `So ln ${V("a")}<sub>${nv}</sub> → ${n(ab)} and ${V("a")}<sub>${nv}</sub> → ${E.h}.`,
              ],
              answer: { kind: "number", value: E.v }, answerText: E.h, answerInput: `e^(${ab})`,
              vals: { ab }, params: { kind: "e", a, b },
            };
          }
          const a = r.int(1, 9), L = F(a, 2);
          return {
            prompt: `Find ${M.eq(`${limn}(${M.sqrt(`${M.sup(nv, 2)} + ${kv(a, nv)}`)} − ${nv})`)}`,
            steps: [
              `An ∞ − ∞ form: multiply and divide by the conjugate ${M.sqrt(`${M.sup(nv, 2)} + ${kv(a, nv)}`)} + ${nv}.`,
              `The top becomes (${M.sup(nv, 2)} + ${kv(a, nv)}) − ${M.sup(nv, 2)} = ${kv(a, nv)}, so the term is ${M.frac(kv(a, nv), `${M.sqrt(`${M.sup(nv, 2)} + ${kv(a, nv)}`)} + ${nv}`)}.`,
              `Divide the top and bottom by ${nv}: ${M.frac(n(a), `${M.sqrt(`1 + ${M.frac(n(a), nv)}`)} + 1`)} → ${M.frac(n(a), "2")}${L.d === 1 ? ` = ${n(L.n)}` : ""}.`,
            ],
            answer: { kind: "number", value: L.value }, answerText: f(L), answerInput: typed(L),
            vals: { L: fv(L) }, params: { kind: "conj", a },
          };
        }
        // level 3: a recursively defined sequence
        if (r.chance(0.5)) {
          const m = r.int(2, 5), c = m * (m - 1), seq = [1];
          for (let i = 1; i < 10; i++) seq.push(Math.sqrt(c + seq[i - 1]));
          return {
            prompt: `A sequence is defined by ${M.eq(`${V("a")}<sub>1</sub> = 1, ${V("a")}<sub>${nv}+1</sub> = ${M.sqrt(`${n(c)} + ${V("a")}<sub>${nv}</sub>`)}`)} It is increasing and bounded above (the graph shows its first terms), so it converges. Find its limit.`,
            graph: ptsGraph(seq.map((v, i) => [i + 1, v])),
            steps: [
              `A bounded monotonic sequence converges (monotone convergence), say to ${V("L")}. Let ${nv} → ∞ on both sides of the recurrence: ${V("L")} = ${M.sqrt(`${n(c)} + ${V("L")}`)}.`,
              `Square: ${M.sup(V("L"), 2)} = ${n(c)} + ${V("L")}, so ${M.sup(V("L"), 2)} − ${V("L")} − ${n(c)} = 0, that is (${V("L")} − ${n(m)})(${V("L")} + ${n(m - 1)}) = 0.`,
              `Every term is positive, so ${V("L")} ≠ ${n(1 - m)}: the limit is ${V("L")} = ${n(m)}.`,
            ],
            answer: { kind: "number", value: m }, answerText: n(m), answerInput: String(m),
            vals: { c, m, m1: m - 1, nm: 1 - m }, params: { kind: "sqrt", c },
          };
        }
        const rr = r.pick([F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4)]), s0 = r.int(1, 9), L = F(s0).div(F(1).sub(rr)), seq = [0];
        for (let i = 1; i < 10; i++) seq.push(rr.value * seq[i - 1] + s0);
        return {
          prompt: `A sequence is defined by ${M.eq(`${V("a")}<sub>1</sub> = 0, ${V("a")}<sub>${nv}+1</sub> = ${kv(rr, `${V("a")}<sub>${nv}</sub>`)} + ${n(s0)}`)} It is increasing and bounded above (the graph shows its first terms), so it converges. Find its limit.`,
          graph: ptsGraph(seq.map((v, i) => [i + 1, v])),
          steps: [
            `A bounded monotonic sequence converges, say to ${V("L")}. Let ${nv} → ∞ in the recurrence: ${V("L")} = ${kv(rr, V("L"))} + ${n(s0)}.`,
            `Solve: ${kv(F(1).sub(rr), V("L"))} = ${n(s0)}, so ${V("L")} = ${M.frac(n(s0), f(F(1).sub(rr)))} = ${f(L)}.`,
          ],
          answer: { kind: "number", value: L.value }, answerText: f(L), answerInput: typed(L),
          vals: { omr: fv(F(1).sub(rr)), L: fv(L) }, params: { kind: "lin", rr: fv(rr), s0 },
        };
      },
    },

    // ---- C2.16 Series: geometric, telescoping ---------------------------------------------------------
    "C2.10": {
      title: "Geometric and telescoping series",
      generate(r, level) {
        if (level === 1) {
          const q = r.int(2, 5), p = r.int(1, q - 1), rr = F(r.sign() * p, q), a = r.nonzero(-9, 9), start = r.pick([0, 1]);
          const first = rr.pow(start).mul(a), S = first.div(F(1).sub(rr));
          const partial = [];
          let acc = F(0);
          for (let N = 0; N <= 8; N++) { acc = acc.add(rr.pow(N + start).mul(a)); partial.push([N + 1, acc.value]); }
          const term = `${a === 1 ? "" : a === -1 ? "−" : n(a)}${M.sup(`(${f(rr)})`, nv)}`;
          return {
            prompt: `Find the sum of the series ${M.eq(`${sum(start)} ${term}`)} The graph shows its first partial sums.`,
            graph: ptsGraph(partial),
            steps: [
              `Each term is ${f(rr)} times the one before: a geometric series with ratio ${V("r")} = ${f(rr)}, and |${V("r")}| &lt; 1, so it converges.`,
              `The first term (${nv} = ${n(start)}) is ${start === 0 ? n(a) : `${n(a)} · ${fp(rr)} = ${f(first)}`}.`,
              `Sum = ${M.frac("first term", `1 − ${V("r")}`)} = ${M.frac(f(first), `1 − ${fp(rr)}`)} = ${M.frac(f(first), f(F(1).sub(rr)))} = ${f(S)}.`,
            ],
            answer: { kind: "number", value: S.value }, answerText: f(S), answerInput: typed(S),
            vals: { first: fv(first), omr: fv(F(1).sub(rr)), S: fv(S) }, params: { a, rr: fv(rr), start },
          };
        }
        if (level === 2) {
          const k = r.int(1, 3), j = r.int(1, 4), c = k * j;
          const H = Array.from({ length: k }, (_, i) => F(1, i + 1)).reduce((acc, v) => acc.add(v), F(0)), S = H.mul(j);
          const head = Array.from({ length: k }, (_, i) => (i === 0 ? "1" : M.frac("1", n(i + 1)))).join(" + "), tail = Array.from({ length: k }, (_, i) => M.frac("1", `${nv === "" ? "" : V("N")} + ${n(i + 1)}`)).join(" − ");
          return {
            prompt: `Find the sum of ${M.eq(`${sum(1)} ${M.frac(n(c), `${nv}(${nv} + ${n(k)})`)}`)}`,
            steps: [
              `Partial fractions: ${M.frac(n(c), `${nv}(${nv} + ${n(k)})`)} = ${kv(j, `(${M.frac("1", nv)} − ${M.frac("1", `${nv} + ${n(k)}`)})`)} (cover-up: ${M.frac(n(c), n(k))} = ${n(j)}).`,
              `Write out the partial sum: each ${M.frac("1", nv)} cancels against the −${M.frac("1", `${nv} + ${n(k)}`)} from ${n(k)} terms earlier (telescoping), leaving ${M.sub(V("S"), V("N"))} = ${kv(j, `(${head} − ${tail})`)}.`,
              `As ${V("N")} → ∞ the trailing terms → 0, so the sum is ${j === 1 ? `${head} = ${f(S)}` : `${n(j)}(${head}) = ${n(j)} · ${f(H)} = ${f(S)}`}.`,
            ],
            answer: { kind: "number", value: S.value }, answerText: f(S), answerInput: typed(S),
            vals: { j, H: fv(H), S: fv(S), ks: Array.from({ length: k }, (_, i) => i + 1) }, params: { c, k },
          };
        }
        const h = r.pick([2, 3, 4, 5, 6, 8, 10]), rr = r.pick([F(1, 2), F(2, 3), F(3, 4), F(3, 5), F(4, 5)]);
        const up = rr.mul(h).div(F(1).sub(rr)), tot = up.mul(2).add(h);
        return {
          prompt: `A ball is dropped from a height of ${n(h)} m. Each time it hits the ground it bounces back to ${f(rr)} of the height it fell from. Find the total vertical distance it travels, in meters.`,
          graph: ptsGraph(Array.from({ length: 8 }, (_, i) => [i + 1, h * Math.pow(rr.value, i)])),
          steps: [
            `The heights of the bounces are ${n(h)} · ${f(rr)}, ${n(h)} · ${M.sup(`(${f(rr)})`, 2)}, …, a geometric sequence with ratio ${f(rr)}.`,
            `After the first drop of ${n(h)} m, the ball goes up and down each bounce height: total = ${n(h)} + 2(${f(rr.mul(h))} + ${f(rr.mul(rr).mul(h))} + ⋯).`,
            `The sum in parentheses is geometric: ${M.frac(f(rr.mul(h)), `1 − ${f(rr)}`)} = ${f(up)}.`,
            `Total = ${n(h)} + 2 · ${f(up)} = ${f(tot)} m.`,
          ],
          answer: { kind: "number", value: tot.value }, answerText: `${f(tot)} m`, answerInput: typed(tot),
          vals: { rh: fv(rr.mul(h)), rrh: fv(rr.mul(rr).mul(h)), up: fv(up), tot: fv(tot) }, params: { h, rr: fv(rr) },
        };
      },
    },

    // ---- C2.17 Integral test and p-series -----------------------------------------------------------------
    "C2.integral-test": {
      title: "Integral test and p-series",
      generate(r, level) {
        if (level === 1) {
          const [m, k, j] = r.pick([[0, 2, 1], [1, 2, 1], [0, 3, 1], [0, 3, 2], [1, 3, 1], [1, 3, 2], [2, 2, 1]]);
          const c = r.int(1, 5), p = F(m * k + j, k), qd = m >= 1 ? F(j, k) : F(k, j);
          const conv = p.value > 1;
          const opts = [[p, true], [p, false], [qd, true], [qd, false]];
          const txt = ([q, cv]) => `${V("p")} = ${f(q)}, so the series ${cv ? "converges" : "diverges"}`;
          const order = r.shuffle([0, 1, 2, 3]), options = order.map((i) => txt(opts[i])), index = order.indexOf(conv ? 0 : 1);
          return {
            prompt: `Write ${M.eq(`${sum(1)} ${M.frac(n(c), npow(p))}`)} as a multiple of a ${V("p")}-series and decide whether it converges.`,
            steps: [
              `${npow(p)} = ${M.sup(nv, supq(p))}: add the exponents (${m ? `${n(m)} from ${xp(m, nv)} and ` : ""}${f(F(j, k))} from the root).`,
              `So the series is ${c === 1 ? "" : `${n(c)} · `}${sum(1)} ${M.frac("1", M.sup(nv, supq(p)))}, a ${V("p")}-series with ${V("p")} = ${f(p)}.`,
              `A ${V("p")}-series converges exactly when ${V("p")} &gt; 1 (compare ∫ ${M.frac(dif(x), M.sup(x, V("p")))}). ${f(p)} ${conv ? "&gt;" : "&lt;"} 1, so it ${conv ? "converges" : "diverges"}.`,
            ],
            answer: { kind: "choice", options, index }, answerText: txt(opts[conv ? 0 : 1]),
            vals: { p: fv(p), qd: fv(qd), jk: fv(F(j, k)), index }, params: { m, k, j, c, order },
          };
        }
        if (level === 2) {
          const kind = r.pick(["rat", "gauss", "log"]), bv = V("b");
          if (kind === "rat") {
            const a = r.int(1, 6), ans = F(1, 2 * (1 + a));
            return {
              prompt: `The integral test applies to ${M.eq(`${sum(1)} ${M.frac(nv, M.sup(`(${M.sup(nv, 2)} + ${n(a)})`, 2))}`)} Evaluate ${integ(1, "∞")} ${M.frac(x, M.sup(`(${M.sup(x, 2)} + ${n(a)})`, 2))} ${dif(x)}, which decides the series.`,
              steps: [
                `${V("f")}(${x}) = ${M.frac(x, M.sup(`(${M.sup(x, 2)} + ${n(a)})`, 2))} is positive and continuous, and decreasing once ${x} is large (its derivative has numerator ${n(a)} − 3${M.sup(x, 2)}).`,
                `Substitute ${u} = ${M.sup(x, 2)} + ${n(a)}, ${dif(u)} = 2${x} ${dif(x)}: ∫ ${M.frac(x, M.sup(u, 2))} ${dif(x)} = ${M.frac("1", "2")}∫ ${M.sup(u, -2)} ${dif(u)} = −${M.frac("1", `2(${M.sup(x, 2)} + ${n(a)})`)}.`,
                `${lim("∞")}[−${M.frac("1", `2(${M.sup(x, 2)} + ${n(a)})`)}]${bar(1, bv)} = 0 + ${M.frac("1", `2 · ${n(1 + a)}`)} = ${f(ans)}. The integral is finite, so the series converges.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
              vals: { a1: 1 + a, ans: fv(ans) }, params: { kind, a }, consts: [3],
            };
          }
          if (kind === "gauss") {
            const c = r.int(1, 6), cc = F(c, 2), ans = { h: M.frac(n(cc.n), `${cc.d === 1 ? "" : n(cc.d)}e`), s: `${cc.n}/(${cc.d}e)`, v: cc.value / Math.E };
            return {
              prompt: `The integral test applies to ${M.eq(`${sum(1)} ${c === 1 ? "" : n(c)}${nv}${M.sup("e", `−${M.sup(nv, 2)}`)}`)} Evaluate ${integ(1, "∞")} ${c === 1 ? "" : n(c)}${x}${M.sup("e", `−${M.sup(x, 2)}`)} ${dif(x)}, which decides the series.`,
              steps: [
                `${V("f")}(${x}) = ${c === 1 ? "" : n(c)}${x}${M.sup("e", `−${M.sup(x, 2)}`)} is positive and continuous, and decreasing for ${x} ≥ 1: ${V("f")}′(${x}) = ${c === 1 ? "" : n(c)}(1 − 2${M.sup(x, 2)})${M.sup("e", `−${M.sup(x, 2)}`)} &lt; 0.`,
                `Substitute ${u} = ${M.sup(x, 2)}: the antiderivative is ${kv(F(-c, 2), M.sup("e", `−${M.sup(x, 2)}`))}.`,
                `${lim("∞")}[${kv(F(-c, 2), M.sup("e", `−${M.sup(x, 2)}`))}]${bar(1, bv)} = 0 + ${kv(cc, M.sup("e", "−1"))} = ${ans.h}. Finite, so the series converges.`,
              ],
              answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
              vals: { cc: fv(cc) }, params: { kind, c },
            };
          }
          return {
            prompt: `The integral test applies to ${M.eq(`${sum(2)} ${M.frac("1", `${nv} ${M.sup("(ln " + nv + ")", 2)}`)}`)} Evaluate ${integ(2, "∞")} ${M.frac(dif(x), `${x} ${M.sup(`(ln ${x})`, 2)}`)}, which decides the series. Give the exact value.`,
            steps: [
              `${V("f")}(${x}) = ${M.frac("1", `${x} ${M.sup(`(ln ${x})`, 2)}`)} is positive, continuous and decreasing for ${x} ≥ 2 (its denominator grows).`,
              `Substitute ${u} = ln ${x}, ${dif(u)} = ${M.frac(dif(x), x)}: ∫ ${M.frac(dif(u), M.sup(u, 2))} = −${M.frac("1", u)} = −${M.frac("1", `ln ${x}`)}.`,
              `${lim("∞")}[−${M.frac("1", `ln ${x}`)}]${bar(2, bv)} = 0 + ${M.frac("1", "ln 2")}. Finite, so the series converges.`,
            ],
            answer: { kind: "number", value: 1 / Math.LN2 }, answerText: M.frac("1", "ln 2"), answerInput: "1/ln(2)",
            vals: {}, params: { kind },
          };
        }
        // level 3: the remainder estimate
        for (;;) {
          const p = r.pick([2, 3, 4]), E = r.pick([0.01, 0.001, 0.0001, 0.0005, 0.005]), inv = Math.round(1 / E), p1 = p - 1;
          // smallest N with 1/((p−1) N^(p−1)) ≤ E, i.e. (p−1) N^(p−1) ≥ 1/E
          let N = 1;
          while (p1 * Math.pow(N, p1) < inv) N++;
          const X = inv / p1, rt = Math.pow(X, 1 / p1);
          if (Math.abs(rt - Math.round(rt)) < 0.01 && Math.abs(rt - Math.round(rt)) > 1e-9) continue;
          const exact = Math.abs(rt - Math.round(rt)) <= 1e-9;
          return {
            prompt: `How many terms ${V("N")} of ${M.eq(`${sum(1)} ${M.frac("1", M.sup(nv, p))}`)} guarantee that the partial sum ${M.sub(V("S"), V("N"))} is within ${fmt(E)} of the true sum? Use the integral bound on the remainder, ${M.sub(V("R"), V("N"))} ≤ ${integ(V("N"), "∞")} ${V("f")}(${x}) ${dif(x)}.`,
            steps: [
              `${integ(V("N"), "∞")} ${M.frac(dif(x), M.sup(x, p))} = ${lim("∞")}[−${M.frac("1", `${p1 === 1 ? "" : n(p1)}${xp(p1)}`)}]${bar(V("N"), V("b"))} = ${M.frac("1", `${p1 === 1 ? "" : n(p1)}${xp(p1, V("N"))}`)}.`,
              `Require ${M.frac("1", `${p1 === 1 ? "" : n(p1)}${xp(p1, V("N"))}`)} ≤ ${fmt(E)}: ${xp(p1, V("N"))} ≥ ${M.frac(n(inv), n(p1))} = ${M.n(X, { dp: 2 })}.`,
              p1 === 1 ? `So ${V("N")} = ${n(N)} terms.` : `${V("N")} ≥ ${M.sqrt(M.n(X, { dp: 2 }), p1 === 2 ? "" : "3")} ${exact ? "=" : "≈"} ${M.n(rt, { dp: 2 })}, so ${V("N")} = ${n(N)} terms.`,
            ],
            answer: { kind: "number", value: N }, answerText: `${V("N")} = ${n(N)}`, answerInput: String(N),
            vals: { p1, inv, X, rt, N }, params: { p, E },
          };
        }
      },
    },

    // ---- C2.18 Comparison tests --------------------------------------------------------------------------
    "C2.comparison": {
      title: "Comparison and limit comparison tests",
      generate(r, level) {
        if (level === 1) {
          const p = r.pick([F(1, 2), F(1), F(2), F(3), F(3, 2)]), conv = p.value > 1, kind = r.pick(["plus", "cos"]);
          const options = ["Converges", "Diverges"];
          let prompt, steps, params, vals;
          if (kind === "plus") {
            const c = r.int(1, 9);
            prompt = `Does ${M.eq(`${sum(1)} ${M.frac("1", `${npow(p)} + ${n(c)}`)}`)} converge or diverge?`;
            steps = conv
              ? [`For every ${nv}, ${npow(p)} + ${n(c)} &gt; ${npow(p)}, so 0 &lt; ${M.frac("1", `${npow(p)} + ${n(c)}`)} &lt; ${M.frac("1", npow(p))}.`,
                `${sum(1)} ${M.frac("1", npow(p))} is a ${V("p")}-series with ${V("p")} = ${f(p)} &gt; 1, so it converges; a smaller positive series converges too.`]
              : [`Bounding above by ${M.frac("1", npow(p))} proves nothing (that series diverges). Bound below instead: ${npow(p)} + ${n(c)} ≤ ${n(1 + c)}${npow(p)} for ${nv} ≥ 1, so ${M.frac("1", `${npow(p)} + ${n(c)}`)} ≥ ${M.frac("1", `${n(1 + c)}${npow(p)}`)}.`,
                `${sum(1)} ${M.frac("1", `${n(1 + c)}${npow(p)}`)} is ${M.frac("1", n(1 + c))} times a ${V("p")}-series with ${V("p")} = ${f(p)} ≤ 1, which diverges; a larger series diverges too.`];
            params = { kind, c, p: fv(p) }; vals = { c1: 1 + c, p: fv(p), index: conv ? 0 : 1 };
          } else {
            const k = r.int(2, 4);
            prompt = `Does ${M.eq(`${sum(1)} ${M.frac(`${n(k)} + cos ${nv}`, npow(p))}`)} converge or diverge?`;
            steps = conv
              ? [`Since −1 ≤ cos ${nv} ≤ 1, the terms satisfy 0 &lt; ${M.frac(`${n(k)} + cos ${nv}`, npow(p))} ≤ ${M.frac(n(k + 1), npow(p))}.`,
                `${sum(1)} ${M.frac(n(k + 1), npow(p))} is ${n(k + 1)} times a ${V("p")}-series with ${V("p")} = ${f(p)} &gt; 1, so it converges, and so does the smaller series.`]
              : [`Since cos ${nv} ≥ −1, the terms satisfy ${M.frac(`${n(k)} + cos ${nv}`, npow(p))} ≥ ${M.frac(n(k - 1), npow(p))} &gt; 0.`,
                `${sum(1)} ${M.frac(n(k - 1), npow(p))} is ${n(k - 1)} times a ${V("p")}-series with ${V("p")} = ${f(p)} ≤ 1, so it diverges, and so does the larger series.`];
            params = { kind, k, p: fv(p) }; vals = { k1: k + 1, km: k - 1, p: fv(p), index: conv ? 0 : 1 };
          }
          return { prompt, steps, answer: { kind: "choice", options, index: conv ? 0 : 1 }, answerText: options[conv ? 0 : 1], vals, params };
        }
        if (level === 2) {
          const a = r.pick([1, 2]), dd = r.int(1, 3), b = a + dd, al = r.int(1, 6), be = r.int(1, 9), ga = r.int(1, 6), de = r.int(1, 9);
          const c = F(al, ga), conv = dd > 1;
          const an = M.frac(`${kv(al, xp(a, nv))} + ${n(be)}`, `${kv(ga, xp(b, nv))} + ${n(de)}`);
          return {
            prompt: `To test ${M.eq(`${sum(1)} ${an}`)} compare it with ${M.sub(V("b"), nv)} = ${M.frac("1", xp(dd, nv))}. Find ${M.eq(`${V("c")} = ${limn}${M.frac(M.sub(V("a"), nv), M.sub(V("b"), nv))}`)}`,
            steps: [
              `The dominant terms are ${kv(al, xp(a, nv))} on top and ${kv(ga, xp(b, nv))} below, so ${M.sub(V("a"), nv)} behaves like ${M.frac(n(al), n(ga))} · ${M.frac("1", xp(dd, nv))}: that is why ${M.sub(V("b"), nv)} = ${M.frac("1", xp(dd, nv))}.`,
              `${M.frac(M.sub(V("a"), nv), M.sub(V("b"), nv))} = ${M.frac(`${kv(al, xp(b, nv))} + ${kv(be, xp(dd, nv))}`, `${kv(ga, xp(b, nv))} + ${n(de)}`)}; divide the top and bottom by ${xp(b, nv)}: → ${M.frac(n(al), n(ga))} = ${f(c)}.`,
              `${V("c")} = ${f(c)} is finite and positive, so ${sum(1)} ${M.sub(V("a"), nv)} does what ${sum(1)} ${M.frac("1", xp(dd, nv))} does: it ${conv ? "converges" : "diverges"} (${V("p")} = ${n(dd)}).`,
            ],
            answer: { kind: "number", value: c.value }, answerText: `${V("c")} = ${f(c)}; the series ${conv ? "converges" : "diverges"}`, answerInput: typed(c),
            vals: { b, c: fv(c) }, params: { a, dd, al, be, ga, de },
          };
        }
        // level 3: choose the right comparison
        let options, index, steps, prompt, params, vals;
        if (r.chance(0.6)) {
          const k = r.int(3, 6), al = r.int(1, 5), be = r.int(1, 9), ga = r.int(1, 3), de = r.int(1, 9), gg = ga * ga;
          const P_ = F(k, 2).sub(1), Q = F(k - 1), conv = P_.value > 1;
          const an = M.frac(`${kv(al, nv)} + ${n(be)}`, M.sqrt(`${kv(gg, M.sup(nv, k))} + ${n(de)}`));
          const opt = (cv, q) => `${cv ? "Converges" : "Diverges"}, by limit comparison with ${sum(1)} ${M.frac("1", npow(q))}`;
          const all = [opt(true, P_), opt(false, P_), opt(true, Q), opt(false, Q)], order = r.shuffle([0, 1, 2, 3]);
          options = order.map((i) => all[i]); index = order.indexOf(conv ? 0 : 1);
          prompt = `Does ${M.eq(`${sum(1)} ${an}`)} converge or diverge? Choose the correct statement.`;
          steps = [
            `For large ${nv}: the top behaves like ${kv(al, nv)} and the bottom like ${M.sqrt(kv(gg, M.sup(nv, k)))} = ${kv(ga, npow(F(k, 2)))}, so ${M.sub(V("a"), nv)} behaves like ${M.frac(n(al), n(ga))} · ${M.frac("1", npow(P_))} (exponent ${f(F(k, 2))} − 1 = ${f(P_)}).`,
            `Limit comparison with ${M.frac("1", npow(P_))}: the ratio → ${f(F(al, ga))}, finite and positive. (Comparing with ${M.frac("1", npow(Q))} forgets the square root; that ratio → ${Q.value > P_.value ? "∞" : "0"} and proves nothing.)`,
            `${sum(1)} ${M.frac("1", npow(P_))} is a ${V("p")}-series with ${V("p")} = ${f(P_)} ${conv ? "&gt;" : "≤"} 1, so the series ${conv ? "converges" : "diverges"}.`,
          ];
          params = { kind: "root", k, al, be, ga, de, order }; vals = { gg, P: fv(P_), Q: fv(Q), kh: fv(F(k, 2)), ratio: fv(F(al, ga)), index };
        } else {
          let A, B;
          do { A = r.int(2, 5); B = r.int(2, 5); } while (A === B);
          const c = r.int(1, 9), conv = A < B, rg = F(A, B), rq = F(B, A);
          const opt = (cv, q) => `${cv ? "Converges" : "Diverges"}, by limit comparison with ${sum(1)} ${geoT(q)}`;
          const all = [opt(true, rg), opt(false, rg), opt(true, rq), opt(false, rq)], order = r.shuffle([0, 1, 2, 3]);
          options = order.map((i) => all[i]); index = order.indexOf(conv ? 0 : 1);
          prompt = `Does ${M.eq(`${sum(1)} ${M.frac(`${M.sup(n(A), nv)} + ${nv}`, `${M.sup(n(B), nv)} + ${n(c)}`)}`)} converge or diverge? Choose the correct statement.`;
          steps = [
            `Exponentials beat powers: for large ${nv} the top behaves like ${M.sup(n(A), nv)} and the bottom like ${M.sup(n(B), nv)}, so ${M.sub(V("a"), nv)} behaves like ${M.sup(`(${f(rg)})`, nv)}.`,
            `Limit comparison: ${M.sub(V("a"), nv)} ÷ ${M.sup(`(${f(rg)})`, nv)} = ${M.frac(`1 + ${nv}/${M.sup(n(A), nv)}`, `1 + ${n(c)}/${M.sup(n(B), nv)}`)} → 1.`,
            `${sum(1)} ${M.sup(`(${f(rg)})`, nv)} is geometric with ratio ${f(rg)} ${conv ? "&lt;" : "&gt;"} 1, so the series ${conv ? "converges" : "diverges"}.`,
          ];
          params = { kind: "exp", A, B, c, order }; vals = { rg: fv(rg), rq: fv(rq), index };
        }
        return { prompt, steps, answer: { kind: "choice", options, index }, answerText: options[index], vals, params };
      },
    },

    // ---- C2.19 Ratio, root and alternating series tests ------------------------------------------------------
    "C2.11": {
      title: "Ratio, root and alternating series tests",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.25)) {
            const b = r.int(2, 9);
            return {
              prompt: `Apply the ratio test to ${M.eq(`${sum(1)} ${M.frac(M.sup(n(b), nv), `${nv}!`)}`)} Find ${V("L")} = ${limn}|${M.frac(M.sub(V("a"), `${nv}+1`), M.sub(V("a"), nv))}|.`,
              steps: [
                `${M.frac(M.sub(V("a"), `${nv}+1`), M.sub(V("a"), nv))} = ${M.frac(M.sup(n(b), `${nv}+1`), `(${nv} + 1)!`)} · ${M.frac(`${nv}!`, M.sup(n(b), nv))} = ${M.frac(n(b), `${nv} + 1`)}, since (${nv} + 1)! = (${nv} + 1) · ${nv}!.`,
                `As ${nv} → ∞ this → 0, so ${V("L")} = 0 &lt; 1: the series converges (absolutely). Factorials beat exponentials.`,
              ],
              answer: { kind: "number", value: 0 }, answerText: `${V("L")} = 0`, answerInput: "0", vals: {}, params: { kind: "fact", b },
            };
          }
          let c, dd;
          do { c = r.int(2, 6); dd = r.int(2, 6); } while (c === dd);
          const k = r.int(1, 3), L = F(c, dd), conv = c < dd;
          const term = `${xp(k, nv)} · ${M.sup(`(${f(L)})`, nv)}`;
          return {
            prompt: `Apply the ratio test to ${M.eq(`${sum(1)} ${M.frac(`${xp(k, nv)} · ${M.sup(n(c), nv)}`, M.sup(n(dd), nv))}`)} Find ${V("L")} = ${limn}|${M.frac(M.sub(V("a"), `${nv}+1`), M.sub(V("a"), nv))}|.`,
            steps: [
              `Write ${M.sub(V("a"), nv)} = ${term}. Then ${M.frac(M.sub(V("a"), `${nv}+1`), M.sub(V("a"), nv))} = ${powk(`(${M.frac(`${nv} + 1`, nv)})`, k)} · ${f(L)}.`,
              `${M.frac(`${nv} + 1`, nv)} → 1, so ${V("L")} = ${f(L)}. ${conv ? `${V("L")} &lt; 1: the series converges.` : `${V("L")} &gt; 1: the series diverges.`}`,
            ],
            answer: { kind: "number", value: L.value }, answerText: `${V("L")} = ${f(L)}`, answerInput: typed(L),
            vals: { L: fv(L) }, params: { kind: "pow", k, c, dd },
          };
        }
        if (level === 2) {
          let al, ga;
          do { al = r.int(1, 6); ga = r.int(1, 6); } while (al === ga);
          const be = r.int(1, 9), de = r.int(1, 9), L = F(al, ga), conv = al < ga;
          return {
            prompt: `Apply the root test to ${M.eq(`${sum(1)} ${M.sup(`(${M.frac(`${kv(al, nv)} + ${n(be)}`, `${kv(ga, nv)} + ${n(de)}`)})`, nv)}`)} Find ${V("L")} = ${limn}${M.sqrt(`|${M.sub(V("a"), nv)}|`, nv)}.`,
            steps: [
              `The ${nv}th root undoes the power: ${M.sqrt(`|${M.sub(V("a"), nv)}|`, nv)} = ${M.frac(`${kv(al, nv)} + ${n(be)}`, `${kv(ga, nv)} + ${n(de)}`)}.`,
              `Divide the top and bottom by ${nv}: → ${ga === 1 ? n(al) : `${M.frac(n(al), n(ga))}${L.d === ga && L.n === al ? "" : ` = ${f(L)}`}`}.`,
              `${V("L")} = ${f(L)} ${conv ? "&lt; 1, so the series converges absolutely" : "&gt; 1, so the series diverges"}.`,
            ],
            answer: { kind: "number", value: L.value }, answerText: `${V("L")} = ${f(L)}`, answerInput: typed(L),
            vals: { L: fv(L) }, params: { al, be, ga, de },
          };
        }
        for (;;) {
          const kind = r.pick(["fact", "sq", "cube", "pow2"]), E = r.pick([0.01, 0.001, 0.0001]), inv = Math.round(1 / E);
          const bN = (k) => (kind === "fact" ? factorial(k) : kind === "sq" ? k * k : kind === "cube" ? k ** 3 : 2 ** k);   // 1/b_k
          let m = 1;
          while (bN(m) < inv) m++;
          const N = m - 1;
          if (N < 2 || N > 120) continue;
          const bh = kind === "fact" ? M.frac("1", `${nv}!`) : kind === "sq" ? M.frac("1", M.sup(nv, 2)) : kind === "cube" ? M.frac("1", M.sup(nv, 3)) : M.frac("1", M.sup("2", nv));
          const at = (k) => (kind === "fact" ? `${n(k)}! = ${P.grouped(factorial(k))}` : kind === "sq" ? `${M.sup(n(k), 2)} = ${P.grouped(k * k)}` : kind === "cube" ? `${M.sup(n(k), 3)} = ${P.grouped(k ** 3)}` : `${M.sup("2", n(k))} = ${P.grouped(2 ** k)}`);
          const sym = kind === "fact" ? `(${V("N")} + 1)!` : kind === "sq" ? M.sup(`(${V("N")} + 1)`, 2) : kind === "cube" ? M.sup(`(${V("N")} + 1)`, 3) : M.sup("2", `${V("N")} + 1`);
          return {
            prompt: `How many terms ${V("N")} of the alternating series ${M.eq(`${sum(1)} ${M.sup("(−1)", `${nv}+1`)} ${bh}`)} guarantee that ${M.sub(V("S"), V("N"))} is within ${fmt(E)} of the sum? Find the smallest such ${V("N")} from the alternating series error bound.`,
            steps: [
              `The terms ${M.sub(V("b"), nv)} = ${bh} decrease to 0, so the alternating series test applies and |${V("S")} − ${M.sub(V("S"), V("N"))}| ≤ ${M.sub(V("b"), `${V("N")}+1`)}, the first omitted term.`,
              `Require ${M.sub(V("b"), `${V("N")}+1`)} ≤ ${fmt(E)}, that is ${sym} ≥ ${P.grouped(inv)}.`,
              `${at(m - 1)} is too small but ${at(m)} is enough, so ${V("N")} + 1 = ${n(m)} and ${V("N")} = ${n(N)}.`,
            ],
            answer: { kind: "number", value: N }, answerText: `${V("N")} = ${n(N)}`, answerInput: String(N),
            vals: { inv, m, m0: m - 1, bm: bN(m), bm0: bN(m - 1), N }, params: { kind, E }, consts: [3],
          };
        }
      },
    },

    // ---- C2.20 Absolute vs conditional convergence ------------------------------------------------------------
    "C2.abs-conv": {
      title: "Absolute or conditional convergence",
      generate(r, level) {
        const options = ["Absolutely convergent", "Conditionally convergent", "Divergent"];
        const alt = M.sup("(−1)", nv);
        const done = (prompt, steps, index, vals, params) => ({ prompt, steps, answer: { kind: "choice", options, index }, answerText: options[index], vals: Object.assign({ index }, vals), params });
        const ask = (term, lo = 1) => `Classify ${M.eq(`${sum(lo)} ${term}`)} as absolutely convergent, conditionally convergent or divergent.`;
        if (level === 1) {
          const p = r.pick([F(1, 3), F(1, 2), F(2, 3), F(1), F(4, 3), F(3, 2), F(2), F(3)]), abs = p.value > 1;
          return done(ask(`${M.frac(alt, npow(p))}`), [
            `Absolute values: ${sum(1)} ${M.frac("1", npow(p))} is a ${V("p")}-series with ${V("p")} = ${f(p)}, which ${abs ? "converges" : "diverges"} (${f(p)} ${abs ? "&gt;" : "≤"} 1).`,
            abs ? `So the series converges absolutely (and therefore converges).`
              : `The series itself: ${M.frac("1", npow(p))} decreases to 0, so the alternating series test says it converges. It converges, but not absolutely: conditionally convergent.`,
          ], abs ? 0 : 1, { p: fv(p) }, { p: fv(p) });
        }
        if (level === 2) {
          for (;;) {
            const k = r.int(1, 3), al = r.int(1, 4), be = r.int(1, 6), ga = r.int(1, 4), de = r.int(1, 6);
            if (k === 2 && !(al * de < al * ga + 2 * be * ga)) continue;
            const term = M.frac(`${kv(al, nv)} + ${n(be)}`, `${kv(ga, xp(k, nv))} + ${n(de)}`);
            const absT = M.frac(`${kv(al, nv)} + ${n(be)}`, `${kv(ga, xp(k, nv))} + ${n(de)}`);
            let steps, index;
            if (k === 1) {
              index = 2;
              steps = [`The size of the terms, ${absT}, tends to ${M.frac(n(al), n(ga))} = ${f(F(al, ga))}, not 0.`,
                `So ${alt}${absT} does not tend to 0, and the divergence test says the series diverges.`];
            } else if (k === 2) {
              index = 1;
              steps = [`|${M.sub(V("a"), nv)}| = ${absT} behaves like ${M.frac(n(al), kv(ga, nv))}; by limit comparison with the harmonic series ${sum(1)} ${M.frac("1", nv)}, the absolute series diverges.`,
                `The terms decrease (the derivative of ${M.frac(`${kv(al, x)} + ${n(be)}`, `${kv(ga, M.sup(x, 2))} + ${n(de)}`)} has numerator −${n(al * ga)}${M.sup(x, 2)} − ${n(2 * be * ga)}${x} + ${n(al * de)} &lt; 0 for ${x} ≥ 1) and tend to 0, so the alternating series test gives convergence.`,
                `Convergent but not absolutely: conditionally convergent.`];
            } else {
              index = 0;
              steps = [`|${M.sub(V("a"), nv)}| = ${absT} behaves like ${M.frac(n(al), kv(ga, M.sup(nv, 2)))}; by limit comparison with ${sum(1)} ${M.frac("1", M.sup(nv, 2))} (${V("p")} = 2), the absolute series converges.`,
                `So the series converges absolutely.`];
            }
            return done(ask(`${alt}${term}`), steps, index, { ag: fv(F(al, ga)), alga: al * ga, bg2: 2 * be * ga, alde: al * de }, { k, al, be, ga, de });
          }
        }
        const kind = r.pick(["geo", "grow", "log", "nlog", "fact"]);
        if (kind === "geo") {
          const k = r.int(1, 3), b = r.int(2, 5), L = F(1, b);
          return done(ask(`${alt}${M.frac(xp(k, nv), M.sup(n(b), nv))}`), [
            `Ratio test on the absolute values: ${M.frac(xp(k, `(${nv} + 1)`), M.sup(n(b), `${nv}+1`))} · ${M.frac(M.sup(n(b), nv), xp(k, nv))} = ${powk(`(${M.frac(`${nv} + 1`, nv)})`, k)} · ${M.frac("1", n(b))} → ${f(L)}.`,
            `${V("L")} = ${f(L)} &lt; 1, so ${sum(1)} ${M.frac(xp(k, nv), M.sup(n(b), nv))} converges: the series converges absolutely.`,
          ], 0, { L: fv(L) }, { kind, k, b });
        }
        if (kind === "grow") {
          const k = r.int(1, 3), b = r.int(2, 5);
          return done(ask(`${alt}${M.frac(M.sup(n(b), nv), xp(k, nv))}`), [
            `Ratio test on the absolute values: ${M.frac(M.sup(n(b), `${nv}+1`), xp(k, `(${nv} + 1)`))} · ${M.frac(xp(k, nv), M.sup(n(b), nv))} = ${n(b)}${powk(`(${M.frac(nv, `${nv} + 1`)})`, k)} → ${n(b)} &gt; 1.`,
            `So |${M.sub(V("a"), nv)}| grows without bound; the terms do not tend to 0 and the series diverges.`,
          ], 2, {}, { kind, k, b });
        }
        if (kind === "fact") {
          const k = r.int(2, 6);
          return done(ask(`${alt}${M.frac(M.sup(n(k), nv), `${nv}!`)}`), [
            `Ratio test on the absolute values: ${M.frac(M.sup(n(k), `${nv}+1`), `(${nv} + 1)!`)} · ${M.frac(`${nv}!`, M.sup(n(k), nv))} = ${M.frac(n(k), `${nv} + 1`)} → 0 &lt; 1.`,
            `So the series converges absolutely (its absolute sum is ${M.sup("e", n(k))} − 1).`,
          ], 0, {}, { kind, k });
        }
        if (kind === "log") {
          return done(ask(`${M.frac(alt, `ln(${nv} + 1)`)}`), [
            `Absolute values: ln(${nv} + 1) &lt; ${nv} + 1, so ${M.frac("1", `ln(${nv} + 1)`)} &gt; ${M.frac("1", `${nv} + 1`)}, and ${sum(1)} ${M.frac("1", `${nv} + 1`)} is the harmonic series without its first term: it diverges, so the absolute series diverges.`,
            `${M.frac("1", `ln(${nv} + 1)`)} decreases to 0, so the alternating series test gives convergence.`,
            `Conditionally convergent.`,
          ], 1, {}, { kind });
        }
        return done(ask(`${M.frac(alt, `${nv} ln ${nv}`)}`, 2), [
          `Absolute values: the integral test with ${u} = ln ${x}: ${integ(2, V("b"))} ${M.frac(dif(x), `${x} ln ${x}`)} = ln(ln ${V("b")}) − ln(ln 2) → ∞, so ${sum(2)} ${M.frac("1", `${nv} ln ${nv}`)} diverges.`,
          `${M.frac("1", `${nv} ln ${nv}`)} decreases to 0, so the alternating series test gives convergence.`,
          `Conditionally convergent.`,
        ], 1, {}, { kind });
      },
    },

    // ---- C2.21 Power series ---------------------------------------------------------------------------
    "C2.12": {
      title: "Radius and interval of convergence",
      generate(r, level) {
        const ratio = `${limn}|${M.frac(M.sub(V("a"), `${nv}+1`), M.sub(V("a"), nv))}|`;
        if (level === 1) {
          const kind = r.pick(["npow", "bpow", "over"]), k = r.int(1, 3), b = r.int(2, 6);
          const pk = (base) => powk(base, k);
          const Rr = kind === "bpow" ? F(1, b) : F(b);
          const term = kind === "npow" ? M.frac(`${xp(k, nv)}${M.sup(x, nv)}`, M.sup(n(b), nv)) : kind === "bpow" ? M.frac(`${M.sup(n(b), nv)}${M.sup(x, nv)}`, xp(k, nv)) : M.frac(M.sup(x, nv), `${xp(k, nv)} · ${M.sup(n(b), nv)}`);
          const lim1 = kind === "bpow" ? `${n(b)}|${x}|` : M.frac(`|${x}|`, n(b));
          return {
            prompt: `Find the radius of convergence of ${M.eq(`${sum(1)} ${term}`)}`,
            steps: [
              `Ratio test on |${M.sub(V("a"), nv)}|: ${ratio} = ${limn}${pk(`(${M.frac(kind === "npow" ? `${nv} + 1` : nv, kind === "npow" ? nv : `${nv} + 1`)})`)} · ${lim1} = ${lim1}, since the power factor → 1.`,
              `Convergence needs ${lim1} &lt; 1, that is |${x}| &lt; ${f(Rr)}. The radius is ${V("R")} = ${f(Rr)}.`,
            ],
            answer: { kind: "number", value: Rr.value }, answerText: `${V("R")} = ${f(Rr)}`, answerInput: typed(Rr),
            vals: { R: fv(Rr) }, params: { kind, k, b },
          };
        }
        if (level === 2) {
          const a = r.int(-3, 3), b = r.int(2, 4), k = r.int(0, 2), sg = r.pick([1, -1]);
          const lo = a - b, hi = a + b, xa = a === 0 ? x : `(${M.poly([1, -a])})`;
          const term = `${sg < 0 ? M.sup("(−1)", nv) : ""}${M.frac(M.sup(xa, nv), k === 0 ? M.sup(n(b), nv) : `${xp(k, nv)} · ${M.sup(n(b), nv)}`)}`;
          // endpoint behaviour
          const atHi = k === 2 ? true : k === 0 ? false : sg < 0;      // Σ sgⁿ/nᵏ
          const atLo = k === 2 ? true : k === 0 ? false : sg > 0;      // Σ (−sg)ⁿ/nᵏ
          const iv = (l, h) => `${l ? "[" : "("}${n(lo)}, ${n(hi)}${h ? "]" : ")"}`;
          const all = [iv(false, false), iv(true, false), iv(false, true), iv(true, true)];
          const index = (atLo ? 1 : 0) + (atHi ? 2 : 0);
          const endTxt = (s_, conv) => {
            const tt = k === 0 ? (s_ > 0 ? `${sum(1)} 1` : `${sum(1)} ${M.sup("(−1)", nv)}`) : `${sum(1)} ${s_ > 0 ? "" : M.sup("(−1)", nv)}${M.frac("1", xp(k, nv))}`;
            const why = k === 0 ? "its terms do not tend to 0" : k === 2 ? "it converges absolutely (p = 2)" : s_ > 0 ? "the harmonic series diverges" : "the alternating harmonic series converges";
            return `${tt}: ${conv ? "converges" : "diverges"}, since ${why}`;
          };
          return {
            prompt: `Find the interval of convergence of ${M.eq(`${sum(1)} ${term}`)}`,
            steps: [
              `Ratio test: ${ratio} = ${M.frac(`|${xa === x ? x : M.poly([1, -a])}|`, n(b))}${k ? ` (the factor ${powk(`(${M.frac(nv, `${nv} + 1`)})`, k)} → 1)` : ""}. It is &lt; 1 when |${M.poly([1, -a])}| &lt; ${n(b)}: center ${n(a)}, radius ${n(b)}, so ${n(lo)} &lt; ${x} &lt; ${n(hi)} converges.`,
              `At ${x} = ${n(hi)} the series is ${endTxt(sg, atHi)}.`,
              `At ${x} = ${n(lo)} the series is ${endTxt(-sg, atLo)}.`,
              `The interval is ${all[index]}.`,
            ],
            answer: { kind: "choice", options: all, index }, answerText: all[index],
            vals: { lo, hi, index }, params: { a, b, k, sg }, consts: [2],
          };
        }
        const kind = r.pick(["cb", "cbinv", "lac", "nn"]);
        if (kind === "lac") {
          const sq = r.int(2, 5), b = sq * sq;
          return {
            prompt: `Find the radius of convergence of ${M.eq(`${sum(0)} ${M.frac(M.sup(x, `2${nv}`), M.sup(n(b), nv))}`)}`,
            steps: [
              `Only even powers appear, so apply the ratio test to the whole term: ${M.frac(M.sup(`|${x}|`, `2${nv}+2`), M.sup(n(b), `${nv}+1`))} · ${M.frac(M.sup(n(b), nv), M.sup(`|${x}|`, `2${nv}`))} = ${M.frac(M.sup(x, 2), n(b))}.`,
              `Convergence needs ${M.sup(x, 2)} &lt; ${n(b)}, that is |${x}| &lt; ${n(sq)}. ${V("R")} = ${n(sq)} (not ${n(b)}).`,
            ],
            answer: { kind: "number", value: sq }, answerText: `${V("R")} = ${n(sq)}`, answerInput: String(sq), vals: { sq }, params: { kind, b },
          };
        }
        if (kind === "nn") {
          return {
            prompt: `Find the radius of convergence of ${M.eq(`${sum(1)} ${M.frac(M.sup(nv, nv), `${nv}!`)} ${M.sup(x, nv)}`)}`,
            steps: [
              `${M.frac(M.sub(V("c"), `${nv}+1`), M.sub(V("c"), nv))} = ${M.frac(M.sup(`(${nv} + 1)`, `${nv}+1`), `(${nv} + 1)!`)} · ${M.frac(`${nv}!`, M.sup(nv, nv))} = ${M.sup(`(${M.frac(`${nv} + 1`, nv)})`, nv)} = ${M.sup(`(1 + ${M.frac("1", nv)})`, nv)}.`,
              `That tends to e, so the ratio test gives e|${x}| &lt; 1: ${V("R")} = ${M.frac("1", "e")}.`,
            ],
            answer: { kind: "number", value: 1 / Math.E }, answerText: `${V("R")} = ${M.frac("1", "e")}`, answerInput: "1/e", vals: {}, params: { kind },
          };
        }
        const inv = kind === "cbinv", Rr = inv ? 4 : F(1, 4);
        const c = inv ? M.frac(M.sup(`(${nv}!)`, 2), `(2${nv})!`) : M.frac(`(2${nv})!`, M.sup(`(${nv}!)`, 2));
        return {
          prompt: `Find the radius of convergence of ${M.eq(`${sum(0)} ${c} ${M.sup(x, nv)}`)}`,
          steps: [
            `(2${nv} + 2)! = (2${nv} + 2)(2${nv} + 1) · (2${nv})! and (${nv} + 1)! = (${nv} + 1) · ${nv}!, so ${M.frac(M.sub(V("c"), `${nv}+1`), M.sub(V("c"), nv))} = ${inv ? M.frac(M.sup(`(${nv} + 1)`, 2), `(2${nv} + 2)(2${nv} + 1)`) : M.frac(`(2${nv} + 2)(2${nv} + 1)`, M.sup(`(${nv} + 1)`, 2))}.`,
            `Divide by ${M.sup(nv, 2)}: this → ${inv ? M.frac("1", "4") : "4"}.`,
            `The ratio test needs ${inv ? M.frac(`|${x}|`, "4") : `4|${x}|`} &lt; 1, so ${V("R")} = ${f(Rr)}.`,
          ],
          answer: { kind: "number", value: Frac.of(Rr).value }, answerText: `${V("R")} = ${f(Rr)}`, answerInput: typed(Rr), vals: { R: fv(Rr) }, params: { kind }, consts: [4],
        };
      },
    },

    // ---- C2.22 Taylor and Maclaurin series -----------------------------------------------------------------
    "C2.13": {
      title: "Taylor and Maclaurin series",
      generate(r, level) {
        if (level === 1) {
          const fn = r.pick(["exp", "sin", "cos"]), a = r.pick([-3, -2, -1, 2, 3]);
          let k = r.int(2, 5);
          if (fn === "sin" && k % 2 === 0) k += 1;
          if (fn === "cos" && k % 2 === 1) k += 1;
          const ak = Math.pow(a, k), kf_ = factorial(k);
          const sg = fn === "exp" ? 1 : fn === "sin" ? ((k - 1) / 2) % 2 ? -1 : 1 : (k / 2) % 2 ? -1 : 1;
          const deriv = sg * ak, coef = F(deriv, kf_);
          const fh = fn === "exp" ? ek(a) : trigA(fn, a);
          return {
            prompt: `Find the coefficient of ${M.sup(x, k)} in the Maclaurin series of ${M.eq(`${V("f")}(${x}) = ${fh}`)}`,
            steps: [
              fn === "exp" ? `Each derivative brings down a factor ${n(a)}: ${M.sup(V("f"), `(${k})`)}(${x}) = ${M.sup(np(a), k)}${ek(a)}, so ${M.sup(V("f"), `(${k})`)}(0) = ${n(ak)}.`
                : `Differentiating ${fh} ${n(k)} times brings down ${M.sup(np(a), k)} = ${n(ak)} and the derivatives cycle ${fn === "sin" ? "sin → cos → −sin → −cos → sin" : "cos → −sin → −cos → sin → cos"}. After ${n(k)} steps you reach ${n(sg)} · cos, and cos 0 = 1, so ${M.sup(V("f"), `(${k})`)}(0) = ${n(sg)} · ${np(ak)} = ${n(deriv)}.`,
              `The coefficient is ${M.frac(`${M.sup(V("f"), `(${k})`)}(0)`, `${n(k)}!`)} = ${M.frac(n(deriv), n(kf_))} = ${f(coef)}.`,
            ],
            answer: { kind: "number", value: coef.value }, answerText: f(coef), answerInput: typed(coef),
            vals: { ak, kf: kf_, deriv, coef: fv(coef) }, params: { fn, a, k },
          };
        }
        if (level === 2) {
          const fn = r.pick(["sqrt", "inv", "inv2"]);
          let a, f0, f1, f2, fh, fe, d1h, d2h;
          if (fn === "sqrt") { const m = r.int(1, 4); a = m * m; f0 = F(m); f1 = F(1, 2 * m); f2 = F(-1, 4 * m * m * m); fh = M.sqrt(x); fe = "sqrt(x)"; d1h = M.frac("1", `2${M.sqrt(x)}`); d2h = `−${M.frac("1", `4${M.sup(x, "3/2")}`)}`; }
          else if (fn === "inv") { a = r.int(1, 3); f0 = F(1, a); f1 = F(-1, a * a); f2 = F(2, a ** 3); fh = M.frac("1", x); fe = "1/x"; d1h = `−${M.frac("1", M.sup(x, 2))}`; d2h = M.frac("2", M.sup(x, 3)); }
          else { a = r.int(1, 3); f0 = F(1, a * a); f1 = F(-2, a ** 3); f2 = F(6, a ** 4); fh = M.frac("1", M.sup(x, 2)); fe = "1/x^2"; d1h = `−${M.frac("2", M.sup(x, 3))}`; d2h = M.frac("6", M.sup(x, 4)); }
          const c2 = f2.div(2), xa = `(${M.poly([1, -a])})`;
          const Ph = `${f(f0)}${M.term(f1, xa)}${M.term(c2, M.sup(xa, 2))}`;
          const expr = `${typed(f0)} + (${typed(f1)})*(x - ${a}) + (${typed(c2)})*(x - ${a})^2`;
          return {
            prompt: `Find the degree-2 Taylor polynomial ${M.sub(V("P"), "2")}(${x}) of ${M.eq(`${V("f")}(${x}) = ${fh}`)} centered at ${V("a")} = ${n(a)}.`,
            graph: graph({ view: [Math.max(0.05, a - 3), a + 4, -1, f0.value * 2.5 + 1], items: [{ t: "fn", e: fe }, { t: "fn", e: expr, role: "secondary" }, { t: "pt", x: a, y: f0.value }] }),
            steps: [
              `Derivatives: ${V("f")}′(${x}) = ${d1h}, ${V("f")}″(${x}) = ${d2h}.`,
              `At ${x} = ${n(a)}: ${V("f")}(${n(a)}) = ${f(f0)}, ${V("f")}′(${n(a)}) = ${f(f1)}, ${V("f")}″(${n(a)}) = ${f(f2)}.`,
              `${M.sub(V("P"), "2")}(${x}) = ${V("f")}(${V("a")}) + ${V("f")}′(${V("a")})(${x} − ${V("a")}) + ${M.frac(`${V("f")}″(${V("a")})`, "2!")}${M.sup(`(${x} − ${V("a")})`, 2)}, with ${M.frac(f(f2), "2")} = ${f(c2)}: ${M.sub(V("P"), "2")}(${x}) = ${Ph}. (The graph shows it hugging ${V("f")} near ${x} = ${n(a)}.)`,
            ],
            answer: { kind: "expr", expr, vars: ["x"] }, answerText: Ph, answerInput: expr,
            vals: { f0: fv(f0), f1: fv(f1), f2: fv(f2), c2: fv(c2) }, params: { fn, a }, consts: [3, 4, 6],
          };
        }
        // level 3: approximate a root by its Taylor polynomial
        const cube = r.chance(0.4);
        const m = cube ? r.int(3, 5) : r.int(3, 10), h = r.nonzero(cube ? -4 : -3, cube ? 4 : 3), a = cube ? m ** 3 : m * m, N = a + h;
        const c1 = cube ? F(1, 3 * m * m) : F(1, 2 * m), c2 = cube ? F(-1, 9 * m ** 5) : F(-1, 8 * m ** 3);
        const approx = c1.mul(h).add(c2.mul(h * h)).add(m), truth = cube ? Math.cbrt(N) : Math.sqrt(N);
        const root = cube ? M.sqrt(n(N), "3") : M.sqrt(n(N));
        const fhx = cube ? M.sqrt(x, "3") : M.sqrt(x);
        return {
          prompt: `Estimate ${root} without a calculator, using the degree-2 Taylor polynomial of ${V("f")}(${x}) = ${fhx} centered at ${V("a")} = ${n(a)}. Give the estimate as a fraction.`,
          graph: graph({ view: [a - 6, a + 6, m - 1, m + 1], items: [{ t: "fn", e: cube ? "cbrt(x)" : "sqrt(x)" }, { t: "fn", e: `${m} + (${typed(c1)})*(x - ${a}) + (${typed(c2)})*(x - ${a})^2`, role: "secondary" }, { t: "pt", x: a, y: m }] }),
          steps: [
            cube ? `${V("f")}′(${x}) = ${M.frac("1", `3${M.sup(x, "2/3")}`)} and ${V("f")}″(${x}) = −${M.frac("2", `9${M.sup(x, "5/3")}`)}. At ${n(a)} = ${M.sup(n(m), 3)}: ${V("f")} = ${n(m)}, ${V("f")}′ = ${f(c1)}, ${V("f")}″ = ${f(c2.mul(2))}.`
              : `${V("f")}′(${x}) = ${M.frac("1", `2${M.sqrt(x)}`)} and ${V("f")}″(${x}) = −${M.frac("1", `4${M.sup(x, "3/2")}`)}. At ${n(a)} = ${M.sup(n(m), 2)}: ${V("f")} = ${n(m)}, ${V("f")}′ = ${f(c1)}, ${V("f")}″ = ${f(c2.mul(2))}.`,
            `${M.sub(V("P"), "2")}(${x}) = ${n(m)}${M.term(c1, `(${M.poly([1, -a])})`)}${M.term(c2, M.sup(`(${M.poly([1, -a])})`, 2))} (the second-derivative value halved).`,
            `At ${x} = ${n(N)}, ${x} − ${n(a)} = ${n(h)}: ${n(m)} + ${fp(c1)} · ${np(h)} + ${fp(c2)} · ${n(h * h)} = ${f(approx)}.`,
            `So ${root} ≈ ${f(approx)} ≈ ${M.n(approx.value, { dp: 5 })}; the true value is ${M.n(truth, { dp: 5 })}.`,
          ],
          answer: { kind: "number", value: approx.value }, answerText: f(approx), answerInput: typed(approx),
          vals: { a, N, c1: fv(c1), c2: fv(c2), f2: fv(c2.mul(2)), hh: h * h, approx: fv(approx), truth }, params: { cube: cube ? 1 : 0, m, h }, consts: [3, 4, 5, 9],
        };
      },
    },

    // ---- C2.23 Building Maclaurin series -------------------------------------------------------------------
    "C2.maclaurin": {
      title: "Building Maclaurin series",
      generate(r, level) {
        if (level === 1) {
          const kind = r.pick(["exp", "geo", "geo1", "xexp"]), c = r.pick([-3, -2, 2, 3]), j = r.int(2, 4);
          let fh, pw, coef, steps;
          if (kind === "exp") {
            fh = M.sup("e", kv(c, M.sup(x, 2))); pw = 2 * j; coef = F(Math.pow(c, j), factorial(j));
            steps = [`Start from ${M.sup("e", u)} = ${sum(0)} ${M.frac(M.sup(u, nv), `${nv}!`)} and substitute ${u} = ${kv(c, M.sup(x, 2))}: ${sum(0)} ${M.frac(`${M.sup(np(c), nv)}${M.sup(x, `2${nv}`)}`, `${nv}!`)}.`,
              `${M.sup(x, pw)} comes from ${nv} = ${n(j)}: ${M.frac(M.sup(np(c), j), `${n(j)}!`)} = ${M.frac(n(Math.pow(c, j)), n(factorial(j)))} = ${f(coef)}.`];
          } else if (kind === "geo") {
            fh = M.frac("1", `1 ${c > 0 ? "−" : "+"} ${kv(Math.abs(c), M.sup(x, 2))}`); pw = 2 * j; coef = F(Math.pow(c, j));
            steps = [`Start from ${M.frac("1", `1 − ${u}`)} = ${sum(0)} ${M.sup(u, nv)} and substitute ${u} = ${kv(c, M.sup(x, 2))}: ${sum(0)} ${M.sup(np(c), nv)}${M.sup(x, `2${nv}`)}.`,
              `${M.sup(x, pw)} comes from ${nv} = ${n(j)}: ${M.sup(np(c), j)} = ${n(coef.n)}.`];
          } else if (kind === "geo1") {
            fh = M.frac("1", `1 ${c > 0 ? "+" : "−"} ${kv(Math.abs(c), x)}`); pw = j; coef = F(Math.pow(-c, j));
            steps = [`Start from ${M.frac("1", `1 − ${u}`)} = ${sum(0)} ${M.sup(u, nv)} with ${u} = ${kv(-c, x)}: ${sum(0)} ${M.sup(np(-c), nv)}${M.sup(x, nv)}.`,
              `The coefficient of ${M.sup(x, pw)} is ${M.sup(np(-c), j)} = ${n(coef.n)}.`];
          } else {
            fh = `${x}${ek(c)}`; pw = j + 1; coef = F(Math.pow(c, j), factorial(j));
            steps = [`${ek(c)} = ${sum(0)} ${M.frac(`${M.sup(np(c), nv)}${M.sup(x, nv)}`, `${nv}!`)}; multiplying by ${x} raises every power by one: ${sum(0)} ${M.frac(`${M.sup(np(c), nv)}${M.sup(x, `${nv}+1`)}`, `${nv}!`)}.`,
              `${M.sup(x, pw)} comes from ${nv} = ${n(j)}: ${M.frac(M.sup(np(c), j), `${n(j)}!`)} = ${M.frac(n(Math.pow(c, j)), n(factorial(j)))} = ${f(coef)}.`];
          }
          return {
            prompt: `Find the coefficient of ${M.sup(x, pw)} in the Maclaurin series of ${M.eq(`${V("f")}(${x}) = ${fh}`)}`,
            steps, answer: { kind: "number", value: coef.value }, answerText: f(coef), answerInput: typed(coef),
            vals: { pw, cj: Math.pow(c, j), mcj: Math.pow(-c, j), jf: factorial(j), coef: fv(coef) }, params: { kind, c, j },
          };
        }
        if (level === 2) {
          const k = r.pick([F(1, 2), F(-1, 2), F(-2), F(-3), F(1, 3), F(3, 2)]), nn = r.pick([2, 3]), b = r.pick([-2, -1, 1, 2, 3]);
          const factors = Array.from({ length: nn }, (_, i) => k.sub(i));
          const top = factors.reduce((acc, v) => acc.mul(v), F(1)), binom = top.div(factorial(nn)), bn = Math.pow(b, nn), coef = binom.mul(bn);
          const base = `(1 ${b > 0 ? "+" : "−"} ${kv(Math.abs(b), x)})`;
          return {
            prompt: `Find the coefficient of ${M.sup(x, nn)} in the binomial series of ${M.eq(M.sup(base, supq(k)))}`,
            steps: [
              `${M.sup(`(1 + ${u})`, V("k"))} = ${sum(0)} (${V("k")} choose ${nv})${M.sup(u, nv)} with the generalized binomial coefficient ${M.frac(`${V("k")}(${V("k")} − 1)⋯(${V("k")} − ${nv} + 1)`, `${nv}!`)}; here ${V("k")} = ${f(k)} and ${u} = ${kv(b, x)}.`,
              `For ${nv} = ${n(nn)}: ${M.frac(factors.map(fp).join(" · "), `${n(nn)}!`)} = ${M.frac(f(top), n(factorial(nn)))} = ${f(binom)}.`,
              `Multiply by ${M.sup(np(b), nn)} = ${n(bn)}: the coefficient is ${f(binom)} · ${np(bn)} = ${f(coef)}.`,
            ],
            answer: { kind: "number", value: coef.value }, answerText: f(coef), answerInput: typed(coef),
            vals: { factors: fvs(factors), top: fv(top), nf: factorial(nn), binom: fv(binom), bn, coef: fv(coef) }, params: { k: fv(k), nn, b },
          };
        }
        const kind = r.pick(["exp", "cos", "sin", "ln", "atan"]), a = r.pick([-3, -2, -1, 1, 2, 3]);
        const ax = kv(a, x), a2 = a * a, a3 = a2 * a, opax = `1 ${a < 0 ? "−" : "+"} ${kv(Math.abs(a), x)}`, pa = a === 1 ? x : `(${ax})`;
        const D = {
          exp: { top: `${M.sup("e", ax)} − 1 − ${a < 0 ? `(${ax})` : ax}`, pw: 2, ser: `1 + ${a < 0 ? `(${ax})` : ax} + ${M.frac(M.sup(pa, 2), "2")} + ${M.frac(M.sup(pa, 3), "6")} + ⋯`, lead: F(a2, 2), lh: M.frac(`${n(a2)}${M.sup(x, 2)}`, "2") },
          cos: { top: `1 − cos(${ax})`, pw: 2, ser: `1 − ${M.frac(M.sup(pa, 2), "2")} + ${M.frac(M.sup(pa, 4), "24")} − ⋯`, lead: F(a2, 2), lh: M.frac(`${n(a2)}${M.sup(x, 2)}`, "2") },
          sin: { top: `sin(${ax}) − ${a < 0 ? `(${ax})` : ax}`, pw: 3, ser: `${ax} − ${M.frac(M.sup(pa, 3), "6")} + ${M.frac(M.sup(pa, 5), "120")} − ⋯`, lead: F(-a3, 6), lh: `−${M.frac(`${np(a3)}${M.sup(x, 3)}`, "6")}` },
          ln: { top: `ln(${opax}) − ${a < 0 ? `(${ax})` : ax}`, pw: 2, ser: `${ax} − ${M.frac(M.sup(pa, 2), "2")} + ${M.frac(M.sup(pa, 3), "3")} − ⋯`, lead: F(-a2, 2), lh: `−${M.frac(`${n(a2)}${M.sup(x, 2)}`, "2")}` },
          atan: { top: `arctan(${ax}) − ${a < 0 ? `(${ax})` : ax}`, pw: 3, ser: `${ax} − ${M.frac(M.sup(pa, 3), "3")} + ${M.frac(M.sup(pa, 5), "5")} − ⋯`, lead: F(-a3, 3), lh: `−${M.frac(`${np(a3)}${M.sup(x, 3)}`, "3")}` },
        }[kind];
        const fnName = { exp: `${M.sup("e", ax)}`, cos: `cos(${ax})`, sin: `sin(${ax})`, ln: `ln(${opax})`, atan: `arctan(${ax})` }[kind];
        return {
          prompt: `Use a Maclaurin series to find ${M.eq(`${M.sub("lim", `${x} → 0`)} ${M.frac(D.top, M.sup(x, D.pw))}`)}`,
          steps: [
            `Expand: ${fnName} = ${D.ser}.`,
            `In the numerator the lower terms cancel, leaving ${kv(D.lead, M.sup(x, D.pw))} + (higher powers of ${x}).`,
            `Divide by ${M.sup(x, D.pw)}: ${f(D.lead)} + (terms that → 0), so the limit is ${f(D.lead)}.`,
          ],
          answer: { kind: "number", value: D.lead.value }, answerText: f(D.lead), answerInput: typed(D.lead),
          vals: { a2, a3, lead: fv(D.lead) }, params: { kind, a }, consts: [3, 4, 5, 6, 24, 120],
        };
      },
    },

    // ---- C2.24 Taylor's theorem and the remainder ----------------------------------------------------------
    "C2.taylor-remainder": {
      title: "Taylor's theorem and the remainder bound",
      generate(r, level) {
        if (level === 1) {
          const fn = r.pick(["sin", "cos"]), b = r.pick([F(1, 2), F(1, 5), F(1, 10), F(1, 3), F(2, 3)]), nn = r.int(2, 5);
          const bp = b.pow(nn + 1), nf = factorial(nn + 1), bound = bp.div(nf);
          return {
            prompt: `The Maclaurin polynomial ${M.sub(V("P"), n(nn))} of ${fn} ${x} is used to approximate ${fn}(${f(b)}). Use the Lagrange remainder to bound the error |${M.sub(V("R"), n(nn))}(${f(b)})|.`,
            steps: [
              `|${M.sub(V("R"), n(nn))}(${x})| ≤ ${M.frac(`${V("M")}${M.sup(`|${x}|`, nn + 1)}`, `(${n(nn)} + 1)!`)}, where ${V("M")} bounds |${M.sup(V("f"), `(${nn + 1})`)}| between 0 and ${x}.`,
              `Every derivative of ${fn} ${x} is ±sin ${x} or ±cos ${x}, so ${V("M")} = 1.`,
              `|${M.sub(V("R"), n(nn))}(${f(b)})| ≤ ${M.frac(M.sup(`(${f(b)})`, nn + 1), `${n(nn + 1)}!`)} = ${M.frac(f(bp), n(nf))} = ${f(bound)}.`,
            ],
            answer: { kind: "number", value: bound.value }, answerText: f(bound), answerInput: typed(bound),
            vals: { n1: nn + 1, bp: fv(bp), nf, bound: fv(bound) }, params: { fn, b: fv(b), nn },
          };
        }
        if (level === 2) {
          const [b, Mb, bh] = r.pick([[F(1), 3, "e"], [F(1, 2), 2, M.sqrt("e")]]), E = r.pick([0.001, 0.0001, 0.00001]), Ef = F(Math.round(E * 100000), 100000);
          let nn = 0;
          const bnd = (k) => b.pow(k + 1).mul(Mb).div(factorial(k + 1));
          while (bnd(nn).cmp(Ef) > 0) nn++;
          const prev = bnd(nn - 1), cur = bnd(nn);
          return {
            prompt: `Approximate ${bh} = ${M.sup("e", f(b))} with the Maclaurin polynomial ${M.sub(V("P"), V("n"))} of ${M.sup("e", x)}. What is the smallest degree ${V("n")} whose Lagrange error bound is at most ${M.n(E, { dp: 6 })}? (Use ${M.sup("e", f(b))} &lt; ${n(Mb)}.)`,
            steps: [
              `Every derivative of ${M.sup("e", x)} is ${M.sup("e", x)}, which on [0, ${f(b)}] is at most ${M.sup("e", f(b))} &lt; ${n(Mb)}: take ${V("M")} = ${n(Mb)}.`,
              `The bound is ${M.frac(`${n(Mb)} · ${M.sup(`(${f(b)})`, `${V("n")}+1`)}`, `(${V("n")} + 1)!`)}.`,
              `For ${V("n")} = ${n(nn - 1)} it is ${f(prev)} ≈ ${M.n(prev.value, { dp: 7 })}, too big; for ${V("n")} = ${n(nn)} it is ${f(cur)} ≈ ${M.n(cur.value, { dp: 7 })} ≤ ${M.n(E, { dp: 6 })}. So ${V("n")} = ${n(nn)}.`,
            ],
            answer: { kind: "number", value: nn }, answerText: `${V("n")} = ${n(nn)}`, answerInput: String(nn),
            vals: { prev: fv(prev), cur: fv(cur), prevd: prev.value, curd: cur.value, nn, nm: nn - 1 }, params: { b: fv(b), Mb, E },
          };
        }
        if (r.chance(0.5)) {
          const m = r.int(2, 6), h = r.int(1, 4), a = m * m, m3 = m ** 3, Mv = F(1, 4 * m3), bound = Mv.mul(h * h).div(2);
          return {
            prompt: `The tangent line ${M.sub(V("P"), "1")} of ${V("f")}(${x}) = ${M.sqrt(x)} at ${V("a")} = ${n(a)} is used to estimate ${M.sqrt(n(a + h))}. Bound the error with the Lagrange remainder.`,
            steps: [
              `|${M.sub(V("R"), "1")}| ≤ ${M.frac(`${V("M")}${M.sup(`(${x} − ${V("a")})`, 2)}`, "2!")}, where ${V("M")} bounds |${V("f")}″| between ${n(a)} and ${n(a + h)}.`,
              `${V("f")}″(${x}) = −${M.frac("1", `4${M.sup(x, "3/2")}`)}; its size decreases as ${x} grows, so the largest value on [${n(a)}, ${n(a + h)}] is at ${x} = ${n(a)}: ${V("M")} = ${M.frac("1", `4 · ${M.sup(n(a), "3/2")}`)} = ${M.frac("1", `4 · ${n(m3)}`)} = ${f(Mv)}.`,
              `|${M.sub(V("R"), "1")}| ≤ ${M.frac(`${f(Mv)} · ${M.sup(n(h), 2)}`, "2")} = ${f(bound)}.`,
            ],
            answer: { kind: "number", value: bound.value }, answerText: f(bound), answerInput: typed(bound),
            vals: { a, ah: a + h, m3, M: fv(Mv), bound: fv(bound) }, params: { kind: "sqrt", m, h }, consts: [3, 4],
          };
        }
        const h = r.pick([F(1, 10), F(1, 5), F(1, 2)]), nn = r.int(1, 3), xv = h.add(1), nf = factorial(nn), bound = h.pow(nn + 1).div(nn + 1);
        return {
          prompt: `The degree-${n(nn)} Taylor polynomial of ${V("f")}(${x}) = ln ${x} centered at 1 is used to estimate ln ${dec(xv)}. Bound the error with the Lagrange remainder.`,
          steps: [
            `|${M.sub(V("R"), n(nn))}| ≤ ${M.frac(`${V("M")}${M.sup(`(${x} − 1)`, nn + 1)}`, `${n(nn + 1)}!`)}, where ${V("M")} bounds |${M.sup(V("f"), `(${nn + 1})`)}| on [1, ${dec(xv)}].`,
            `The derivatives of ln ${x} are ${M.frac("1", x)}, −${M.frac("1", M.sup(x, 2))}, ${M.frac("2", M.sup(x, 3))}, …, so |${M.sup(V("f"), `(${nn + 1})`)}(${x})| = ${M.frac(`${n(nn)}!`, M.sup(x, nn + 1))}, largest at ${x} = 1: ${V("M")} = ${n(nf)}.`,
            `|${M.sub(V("R"), n(nn))}| ≤ ${M.frac(`${n(nf)} · ${M.sup(`(${dec(h)})`, nn + 1)}`, `${n(nn + 1)}!`)} = ${M.frac(M.sup(`(${dec(h)})`, nn + 1), n(nn + 1))} = ${f(bound)}.`,
          ],
          answer: { kind: "number", value: bound.value }, answerText: f(bound), answerInput: typed(bound),
          vals: { xv: fv(xv), h: fv(h), n1: nn + 1, nf, bound: fv(bound) }, params: { kind: "ln", h: fv(h), nn }, consts: [3],
        };
      },
    },
  });

  // ==== Parametric and polar curves, differential equations ==========================================
  const yp = `${y}′`, ypp = `${y}″`;
  /** A view box around a list of points, with padding. */
  const boxOf = (pts, pad = 1) => {
    const xs = pts.map((p_) => p_[0]), ys = pts.map((p_) => p_[1]);
    return [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...ys) - pad, Math.max(...ys) + pad];
  };
  /** c·e^(kx) as html / parser text, k ≠ 0. */
  const cek = (c, k, v = x) => kv(c, ek(k, v));
  /** Σ cᵢ·bodyᵢ with signs, first term without a leading +. */
  const sumT = (terms) => {
    const ts = terms.filter(([c]) => Frac.of(c).n !== 0);
    if (!ts.length) return "0";
    return ts.map(([c, body], i) => (i === 0 ? (body ? kv(c, body) : f(c)) : body ? M.term(c, body) : M.term(c, ""))).join("");
  };
  const co = (k) => (k === 1 ? "" : k === -1 ? "−" : `${n(k)} · `);
  /** ± |c|/den as a signed stacked term; first term without a leading +. */
  const fracT = (c, den, first = false) => { c = Frac.of(c); if (c.n === 0) return first ? "0" : ""; const body = M.frac(f(c.abs()), den); return first ? `${c.n < 0 ? "−" : ""}${body}` : ` ${c.n < 0 ? "−" : "+"} ${body}`; };
  const sumS = (terms) => terms.filter(([c]) => Frac.of(c).n !== 0).map(([c, body]) => `(${typed(c)})${body ? `*${body}` : ""}`).join(" + ") || "0";

  P.define("calculus2", {
    // ---- C2.25 Parametric equations ----------------------------------------------------------------------
    "C2.14": {
      title: "Parametric curves: slopes and tangents",
      generate(r, level) {
        for (;;) {
          const a = r.nonzero(-2, 2), b = r.int(-3, 3), c = r.nonzero(-2, 2), dd = r.int(-3, 3), t0 = r.nonzero(-2, 2);
          const xd = 2 * a * t0 + b, yd = 3 * c * t0 * t0 + dd;
          if (xd === 0 || yd === 0) continue;
          const xh = M.poly([a, b, 0], "t"), yh = M.poly([c, 0, dd, 0], "t");
          const m = F(yd, xd), x0 = a * t0 * t0 + b * t0, y0 = c * t0 ** 3 + dd * t0;
          const curve = `${x} = ${xh}, ${y} = ${yh}`;
          const d1 = [`${M.frac(dif(x), dif(t))} = ${M.poly([2 * a, b], "t")} and ${M.frac(dif(y), dif(t))} = ${M.poly([3 * c, 0, dd], "t")}.`,
            `At ${t} = ${n(t0)}: ${M.frac(dif(x), dif(t))} = ${n(2 * a)} · ${np(t0)}${M.term(b, "")} = ${n(xd)} and ${M.frac(dif(y), dif(t))} = ${n(3 * c)} · ${M.sup(np(t0), 2)}${M.term(dd, "")} = ${n(yd)}.`,
            `${M.frac(dif(y), dif(x))} = ${M.frac(`${dif(y)}/${dif(t)}`, `${dif(x)}/${dif(t)}`)} = ${M.frac(n(yd), n(xd))} = ${f(m)}.`];
          if (level === 1) {
            return {
              prompt: `Find the slope ${M.frac(dif(y), dif(x))} of the curve ${M.eq(curve)} at ${t} = ${n(t0)}.`,
              steps: d1, answer: { kind: "number", value: m.value }, answerText: f(m), answerInput: typed(m),
              vals: { xd, yd, a2: 2 * a, c3: 3 * c, m: fv(m) }, params: { a, b, c, dd, t0 }, consts: [3],
            };
          }
          const pts = curvePts((s_) => a * s_ * s_ + b * s_, (s_) => c * s_ ** 3 + dd * s_, -2.6, 2.6, 80);
          const view = boxOf(pts.filter((p_) => Math.abs(p_[1]) < 25 && Math.abs(p_[0]) < 25));
          if (level === 2) {
            const bint = F(y0).sub(m.mul(x0));
            const items = [...polyline(pts), { t: "pt", x: x0, y: y0 }];
            if (x0 >= view[0] && x0 <= view[1] && y0 >= view[2] && y0 <= view[3]) items.push({ t: "fn", e: `${m.n}/${m.d}*(x - (${x0})) + (${y0})`, role: "secondary" });
            else continue;
            return {
              prompt: `Find the tangent line to the curve ${M.eq(curve)} at the point where ${t} = ${n(t0)}. Write it as ${y} = ${V("m")}${x} + ${V("b")}.`,
              graph: graph({ view, items }),
              steps: d1.concat([
                `The point: ${x} = ${co(a)}${M.sup(np(t0), 2)}${b ? `${M.term(b, "").replace(/ 1$/, ` ${n(Math.abs(b))}`)} · ${np(t0)}` : ""} = ${n(x0)}, ${y} = ${co(c)}${M.sup(np(t0), 3)}${dd ? `${M.term(dd, "")} · ${np(t0)}` : ""} = ${n(y0)}.`,
                `${y} − ${np(y0)} = ${fp(m)}(${x} − ${np(x0)}), so ${y} = ${M.poly([m, bint])}.`,
              ]),
              answer: { kind: "expr", expr: `(${typed(m)})*x + (${typed(bint)})`, vars: ["x"] }, answerText: `${y} = ${M.poly([m, bint])}`, answerInput: `y = (${typed(m)})x + (${typed(bint)})`,
              vals: { xd, yd, a2: 2 * a, c3: 3 * c, m: fv(m), x0, y0, bint: fv(bint) }, params: { a, b, c, dd, t0 }, consts: [3],
            };
          }
          // level 3: the second derivative
          const ydd = 6 * c * t0, xdd = 2 * a, num = ydd * xd - yd * xdd, den = xd ** 3, d2 = F(num, den);
          return {
            prompt: `For the curve ${M.eq(curve)} find ${M.frac(`${dif("")}<sup>2</sup>${y}`, `${dif(x)}<sup>2</sup>`)} at ${t} = ${n(t0)}.`,
            graph: graph({ view, items: [...polyline(pts), { t: "pt", x: x0, y: y0 }] }),
            steps: [
              d1[0], d1[1],
              `The slope in terms of ${t}: ${M.frac(dif(y), dif(x))} = ${M.frac(M.poly([3 * c, 0, dd], "t"), M.poly([2 * a, b], "t"))}.`,
              `${M.frac(`${dif("")}<sup>2</sup>${y}`, `${dif(x)}<sup>2</sup>`)} = ${M.frac(`${M.frac(dif(""), dif(t))}(${M.frac(dif(y), dif(x))})`, `${dif(x)}/${dif(t)}`)}, not ${M.frac(`${y}″(${t})`, `${x}″(${t})`)}. By the quotient rule, ${M.frac(dif(""), dif(t))}(${M.frac(dif(y), dif(x))}) = ${M.frac(`${y}″${x}′ − ${y}′${x}″`, M.sup(`(${x}′)`, 2))}, so ${M.frac(`${dif("")}<sup>2</sup>${y}`, `${dif(x)}<sup>2</sup>`)} = ${M.frac(`${y}″${x}′ − ${y}′${x}″`, M.sup(`(${x}′)`, 3))}.`,
              `At ${t} = ${n(t0)}: ${x}′ = ${n(xd)}, ${x}″ = ${n(xdd)}, ${y}′ = ${n(yd)}, ${y}″ = ${n(ydd)}: ${M.frac(`${n(ydd)} · ${np(xd)} − ${np(yd)} · ${np(xdd)}`, M.sup(np(xd), 3))} = ${M.frac(n(num), n(den))} = ${f(d2)}.`,
            ],
            answer: { kind: "number", value: d2.value }, answerText: f(d2), answerInput: typed(d2),
            vals: { xd, yd, a2: 2 * a, c3: 3 * c, ydd, xdd, num, den, d2: fv(d2) }, params: { a, b, c, dd, t0 }, consts: [3],
          };
        }
      },
    },

    // ---- C2.26 Polar area and calculus --------------------------------------------------------------------
    "C2.15": {
      title: "Polar area and slope",
      generate(r, level) {
        const rv = V("r");
        const polarPts = (fr_, t0 = 0, t1 = 2 * Math.PI) => curvePts((s_) => fr_(s_) * Math.cos(s_), (s_) => fr_(s_) * Math.sin(s_), t0, t1, 160);
        if (level === 1) {
          if (r.chance(0.5)) {
            const a = r.int(2, 6), b = r.int(1, a - 1), aa = a * a, bb = b * b, coef = F(2 * aa + bb, 2), ans = ex([[coef, PI]]);
            const pts = polarPts((s_) => a + b * Math.cos(s_));
            return {
              prompt: `Find the area enclosed by the limaçon ${M.eq(`${rv} = ${n(a)} + ${kf(b, `cos ${th}`)}`)}`,
              graph: graph({ view: boxOf(pts), equal: true, items: [{ t: "poly", p: pts, fill: true, role: "highlight" }] }),
              steps: [
                `${rv} &gt; 0 for every ${th} (since ${n(a)} &gt; ${n(b)}), and one trip 0 ≤ ${th} ≤ 2π traces the curve once: ${V("A")} = ${M.frac("1", "2")}${integ(0, "2π")} ${M.sup(rv, 2)} ${dif(th)}.`,
                `${M.sup(rv, 2)} = ${n(aa)} + ${n(2 * a * b)} cos ${th} + ${n(bb)} ${M.sup("cos", 2)} ${th}.`,
                `Over a full turn: ∫ cos ${th} ${dif(th)} = 0 and ∫ ${M.sup("cos", 2)} ${th} ${dif(th)} = π, so ${integ(0, "2π")} ${M.sup(rv, 2)} ${dif(th)} = ${n(2 * aa)}π + ${n(bb)}π = ${n(2 * aa + bb)}π.`,
                `${V("A")} = ${M.frac("1", "2")} · ${n(2 * aa + bb)}π = ${ans.h}.`,
              ],
              answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
              vals: { aa, bb, ab2: 2 * a * b, aa2: 2 * aa, tot: 2 * aa + bb, coef: fv(coef) }, params: { kind: "limacon", a, b },
            };
          }
          const a = r.int(2, 6), k = r.int(2, 5), aa = a * a, coef = F(aa, 4 * k), ans = ex([[coef, PI]]), lim = piq(F(1, 2 * k));
          const pts = polarPts((s_) => a * Math.cos(k * s_)), petal = polarPts((s_) => a * Math.cos(k * s_), -Math.PI / (2 * k), Math.PI / (2 * k));
          return {
            prompt: `Find the area of one petal of the rose ${M.eq(`${rv} = ${n(a)} cos ${n(k)}${th}`)}`,
            graph: graph({ view: [-a - 0.5, a + 0.5, -a - 0.5, a + 0.5], equal: true, items: [...polyline(pts, "muted"), { t: "poly", p: petal, fill: true, role: "highlight" }] }),
            steps: [
              `The petal on the positive ${x}-axis runs between the angles where ${rv} = 0: cos ${n(k)}${th} = 0 at ${n(k)}${th} = ±${piq(F(1, 2))}, so ${th} = ±${lim}.`,
              `${V("A")} = ${M.frac("1", "2")}${integ(`−${lim}`, lim)} ${n(aa)} ${M.sup("cos", 2)} ${n(k)}${th} ${dif(th)} = ${M.frac(n(aa), "2")}${integ(`−${lim}`, lim)} ${M.frac(`1 + cos ${n(2 * k)}${th}`, "2")} ${dif(th)}.`,
              `The cosine term integrates to 0 over the petal (sin ${n(2 * k)}${th} is 0 at both ends), leaving ${M.frac(n(aa), "4")} · ${piq(F(1, k))} = ${ans.h}.`,
            ],
            answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
            vals: { aa, k2: 2 * k, coef: fv(coef) }, params: { kind: "rose", a, k }, consts: [4],
          };
        }
        if (level === 2) {
          const a = r.int(1, 6), b = r.int(1, 6), trig = r.pick(["sin", "cos"]);
          const ang = trig === "sin" ? r.pick([F(0), F(1)]) : r.pick([F(1, 2), F(3, 2)]);
          const sn = ang.eq(0) ? 0 : ang.eq(1) ? 0 : ang.eq(F(1, 2)) ? 1 : -1, cs = ang.eq(0) ? 1 : ang.eq(1) ? -1 : 0;
          const rr = trig === "sin" ? a + b * sn : a + b * cs, rp = trig === "sin" ? b * cs : -b * sn;
          const num = rp * sn + rr * cs, den = rp * cs - rr * sn, m = F(num, den);
          const angH = ang.eq(0) ? "0" : piq(ang);
          const pts = curvePts((s_) => (trig === "sin" ? a + b * Math.sin(s_) : a + b * Math.cos(s_)) * Math.cos(s_), (s_) => (trig === "sin" ? a + b * Math.sin(s_) : a + b * Math.cos(s_)) * Math.sin(s_), 0, 2 * Math.PI, 160);
          const px = rr * cs, py = rr * sn;
          return {
            prompt: `Find the slope ${M.frac(dif(y), dif(x))} of the polar curve ${M.eq(`${rv} = ${n(a)} + ${kf(b, `${trig} ${th}`)}`)} at ${th} = ${angH}.`,
            graph: graph({ view: boxOf(pts), equal: true, items: [...polyline(pts), { t: "pt", x: px, y: py }] }),
            steps: [
              `Treat ${x} = ${rv} cos ${th}, ${y} = ${rv} sin ${th} as a parametric curve: ${M.frac(dif(y), dif(x))} = ${M.frac(`${rv}′ sin ${th} + ${rv} cos ${th}`, `${rv}′ cos ${th} − ${rv} sin ${th}`)}.`,
              `${rv}′ = ${kf(trig === "sin" ? b : -b, `${trig === "sin" ? "cos" : "sin"} ${th}`)}. At ${th} = ${angH}: sin ${th} = ${n(sn)}, cos ${th} = ${n(cs)}, so ${rv} = ${n(rr)} and ${rv}′ = ${n(rp)}.`,
              `${M.frac(dif(y), dif(x))} = ${M.frac(`${np(rp)} · ${np(sn)} + ${n(rr)} · ${np(cs)}`, `${np(rp)} · ${np(cs)} − ${n(rr)} · ${np(sn)}`)} = ${M.frac(n(num), n(den))} = ${f(m)}.`,
            ],
            answer: { kind: "number", value: m.value }, answerText: f(m), answerInput: typed(m),
            vals: { sn, cs, rr, rp, num, den, m: fv(m), ang: fv(ang) }, params: { a, b, trig, ang: fv(ang) },
          };
        }
        const a = r.int(2, 6), b = r.int(2, a), ab2 = 2 * a * b, bb = b * b, ans = ex([[ab2, ONE], [F(bb, 4), PI]]);
        const outer = polarPts((s_) => a + b * Math.cos(s_)), inner = polarPts(() => a);
        const band = curvePts((s_) => (a + b * Math.cos(s_)) * Math.cos(s_), (s_) => (a + b * Math.cos(s_)) * Math.sin(s_), -Math.PI / 2, Math.PI / 2, 60)
          .concat(curvePts((s_) => a * Math.cos(s_), (s_) => a * Math.sin(s_), Math.PI / 2, -Math.PI / 2, 60));
        return {
          prompt: `Find the area of the region inside ${M.eq(`${rv} = ${n(a)} + ${kf(b, `cos ${th}`)}`)} and outside the circle ${rv} = ${n(a)}.`,
          graph: graph({ view: boxOf(outer.concat(inner)), equal: true, items: [{ t: "poly", p: band, fill: true, role: "highlight" }, ...polyline(outer), ...polyline(inner, "secondary")] }),
          steps: [
            `The curves meet where ${n(a)} + ${kf(b, `cos ${th}`)} = ${n(a)}, so cos ${th} = 0: ${th} = ±${piq(F(1, 2))}. Between those angles the limaçon is outside the circle.`,
            `${V("A")} = ${M.frac("1", "2")}${integ(`−${piq(F(1, 2))}`, piq(F(1, 2)))} (${M.sup(`(${n(a)} + ${kf(b, `cos ${th}`)})`, 2)} − ${M.sup(n(a), 2)}) ${dif(th)}: subtract the squares, not the radii.`,
            `The integrand is ${n(ab2)} cos ${th} + ${n(bb)} ${M.sup("cos", 2)} ${th}. Over [−${piq(F(1, 2))}, ${piq(F(1, 2))}]: ∫ cos ${th} ${dif(th)} = 2 and ∫ ${M.sup("cos", 2)} ${th} ${dif(th)} = ${piq(F(1, 2))}.`,
            `${V("A")} = ${M.frac("1", "2")}(${n(ab2)} · 2 + ${n(bb)} · ${piq(F(1, 2))}) = ${ans.h}.`,
          ],
          answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
          vals: { ab2, bb, c4: fv(F(bb, 4)) }, params: { a, b },
        };
      },
    },

    // ---- C2.27 Slope fields and equilibria ----------------------------------------------------------------
    "C2.ode-basics": {
      title: "Equilibria and stability",
      generate(r, level) {
        if (level === 1) {
          let p, q;
          do { p = r.int(-6, 6); q = r.int(-6, 6); } while (p >= q);
          const sg = r.pick([1, -1]), B = -sg * (p + q), C = sg * p * q;
          return {
            prompt: `Find the equilibrium solutions of ${M.eq(`${M.frac(dif(y), dif(t))} = ${M.poly([sg, B, C], "y")}`)} Enter them separated by a comma.`,
            steps: [
              `An equilibrium is a constant solution, so ${yp} = 0: solve ${M.poly([sg, B, C], "y")} = 0.`,
              `Factor: ${sg < 0 ? "−" : ""}${fac(p).replace(/<i>x<\/i>/g, y)}${fac(q).replace(/<i>x<\/i>/g, y)} = 0, so ${y} = ${n(p)} or ${y} = ${n(q)}.`,
            ],
            answer: { kind: "numbers", values: [p, q] }, answerText: `${y} = ${n(p)} and ${y} = ${n(q)}`, answerInput: `${p}, ${q}`,
            vals: { p, q }, params: { sg, B, C },
          };
        }
        if (level === 2) {
          const options = ["Stable", "Unstable", "Semi-stable"];
          let p, q;
          do { p = r.int(-4, 4); q = r.int(-4, 4); } while (p === q);
          const c = r.pick([1, -1, 2, -2]), semi = r.chance(0.25);
          const fy = semi ? (yy) => c * (yy - p) * (yy - p) * (yy - q) : (yy) => c * (yy - p) * (yy - q);
          const rhs = `${c < 0 ? "−" : ""}${Math.abs(c) === 1 ? "" : n(Math.abs(c))}${semi ? M.sup(fac(p).replace(/<i>x<\/i>/g, y), 2) : fac(p).replace(/<i>x<\/i>/g, y)}${fac(q).replace(/<i>x<\/i>/g, y)}`;
          const lo = Math.min(p, q) - 1.5, hi = Math.max(p, q) + 1.5;
          let ylo = 0, yhi = 0;
          for (let i = 0; i <= 40; i++) { const v = fy(lo + ((hi - lo) * i) / 40); ylo = Math.min(ylo, v); yhi = Math.max(yhi, v); }
          const below = fy(p - 0.5), above = fy(p + 0.5);
          const sgn = (v) => (v > 0 ? "positive" : "negative");
          const index = semi ? 2 : below > 0 && above < 0 ? 0 : 1;
          const fe = semi ? `${c}*(x - (${p}))^2*(x - (${q}))` : `${c}*(x - (${p}))*(x - (${q}))`;
          return {
            prompt: `Classify the equilibrium ${y} = ${n(p)} of ${M.eq(`${M.frac(dif(y), dif(t))} = ${rhs}`)} The graph shows the right side plotted against ${y} (horizontal axis).`,
            graph: graph({ view: [lo, hi, ylo - 0.2 * (yhi - ylo) - 0.5, yhi + 0.2 * (yhi - ylo) + 0.5], items: [{ t: "fn", e: fe }, { t: "pt", x: p, y: 0 }, { t: "pt", x: q, y: 0 }] }),
            steps: [
              `The right side is 0 at ${y} = ${n(p)} and ${y} = ${n(q)}. Look at its sign just below and just above ${y} = ${n(p)}.`,
              `Just below ${n(p)} it is ${sgn(below)} (solutions there ${below > 0 ? "rise" : "fall"}); just above it is ${sgn(above)} (solutions ${above > 0 ? "rise" : "fall"}).`,
              index === 0 ? `Solutions on both sides move toward ${y} = ${n(p)}: it is stable.`
                : index === 1 ? `Solutions on both sides move away from ${y} = ${n(p)}: it is unstable.`
                  : `The sign does not change (the factor ${fac(p).replace(/<i>x<\/i>/g, y)} is squared), so solutions approach on one side and leave on the other: semi-stable.`,
            ],
            answer: { kind: "choice", options, index }, answerText: options[index],
            vals: { index }, params: { p, q, c, semi: semi ? 1 : 0 }, consts: [2],
          };
        }
        // level 3: logistic growth with harvesting
        for (;;) {
          const K = r.int(8, 20), P1 = r.int(1, Math.floor(K / 2) - 1), P2 = K - P1, rr = r.pick([F(1, 2), F(1, 4), F(2, 5), F(3, 4)]);
          const H = rr.mul(P1 * P2).div(K);
          if (dec(H).includes("pf")) continue;
          const P0 = r.chance(0.5) ? r.int(P1 + 1, P2 - 1) : P2 + r.int(1, 4);
          if (P0 === P2) continue;
          const Pv = V("P");
          return {
            prompt: `A fish population ${Pv} (thousands) follows ${M.eq(`${M.frac(dif(Pv), dif(t))} = ${dec(rr)}${Pv}(1 − ${M.frac(Pv, n(K))}) − ${dec(H)}`)} where ${dec(H)} thousand fish a year are harvested. It starts at ${Pv}(0) = ${n(P0)}. What population does it approach in the long run, in thousands?`,
            graph: graph({ view: [-1, K + 2, -H.value - 1, rr.value * K / 4 + 1], items: [{ t: "fn", e: `${rr.value}*x*(1 - x/${K}) - ${H.value}` }] }),
            steps: [
              `Equilibria: ${dec(rr)}${Pv} − ${M.frac(`${dec(rr)}${M.sup(Pv, 2)}`, n(K))} − ${dec(H)} = 0. Multiply by −${M.frac(n(K), dec(rr))}: ${M.sup(Pv, 2)} − ${n(K)}${Pv} + ${n(P1 * P2)} = 0.`,
              `Factor: (${Pv} − ${n(P1)})(${Pv} − ${n(P2)}) = 0, so ${Pv} = ${n(P1)} or ${Pv} = ${n(P2)}.`,
              `The right side is a downward parabola in ${Pv}: positive between ${n(P1)} and ${n(P2)}, negative above ${n(P2)}. So ${n(P2)} is stable and ${n(P1)} unstable.`,
              `Starting at ${n(P0)} (${P0 < P2 ? "between them, so it grows" : `above ${n(P2)}, so it shrinks`}), the population approaches ${n(P2)} thousand.`,
            ],
            answer: { kind: "number", value: P2 }, answerText: `${n(P2)} thousand fish`, answerInput: String(P2),
            vals: { H: fv(H), P1, P2, pp: P1 * P2 }, params: { K, rr: fv(rr), P0, H: fv(H) },
          };
        }
      },
    },

    // ---- C2.28 Separable equations ---------------------------------------------------------------------------
    "C2.16": {
      title: "Separable equations and growth models",
      generate(r, level) {
        if (level === 1) {
          const T = r.pick([2, 3, 4, 5, 6]), k = r.int(2, 5), tt = T * k;
          if (r.chance(0.5)) {
            const N0 = r.pick([100, 200, 250, 500, 1000]), Nt = N0 * 2 ** k;
            return {
              prompt: `A bacteria culture grows at a rate proportional to its size. It starts with ${P.grouped(N0)} bacteria and doubles every ${n(T)} hours. How many bacteria are there after ${n(tt)} hours?`,
              steps: [
                `${M.frac(dif(y), dif(t))} = ${V("k")}${y} gives ${y} = ${M.sub(y, "0")}${M.sup("e", `${V("k")}${t}`)}. Doubling in ${n(T)} hours means ${M.sup("e", `${n(T)}${V("k")}`)} = 2, so ${y} = ${n(N0)} · ${M.sup("2", `${t}/${n(T)}`)}.`,
                `${n(tt)} hours is ${M.frac(n(tt), n(T))} = ${n(k)} doublings: ${y} = ${n(N0)} · ${M.sup("2", n(k))} = ${P.grouped(Nt)}.`,
              ],
              answer: { kind: "number", value: Nt }, answerText: `${P.grouped(Nt)} bacteria`, answerInput: String(Nt),
              vals: { k, Nt, tt }, params: { kind: "grow", T, N0, k },
            };
          }
          const m0 = r.pick([80, 96, 120, 160, 200, 240]), mt = F(m0, 2 ** k);
          return {
            prompt: `A radioactive sample decays at a rate proportional to its mass and has a half-life of ${n(T)} days. Starting from ${n(m0)} mg, how much is left after ${n(tt)} days, in mg?`,
            steps: [
              `${M.frac(dif(y), dif(t))} = ${V("k")}${y} (${V("k")} &lt; 0) gives ${y} = ${M.sub(y, "0")}${M.sup("e", `${V("k")}${t}`)}; halving every ${n(T)} days means ${y} = ${n(m0)} · ${M.sup(`(${M.frac("1", "2")})`, `${t}/${n(T)}`)}.`,
              `${n(tt)} days is ${n(k)} half-lives: ${y} = ${M.frac(n(m0), M.sup("2", n(k)))} = ${M.frac(n(m0), n(2 ** k))} = ${dec(mt)} mg.`,
            ],
            answer: { kind: "number", value: mt.value }, answerText: `${dec(mt)} mg`, answerInput: typed(mt),
            vals: { k, tt, pk: 2 ** k, mt: fv(mt) }, params: { kind: "decay", T, m0, k },
          };
        }
        if (level === 2) {
          const kind = r.pick(["circle", "expo", "recip"]);
          if (kind === "circle") {
            const [a, x1, c] = r.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10], [8, 15, 17], [15, 8, 17]]);
            return {
              prompt: `Solve ${M.eq(`${M.frac(dif(y), dif(x))} = ${M.frac(x, y)}, ${y}(0) = ${n(a)}`)} and find ${y}(${n(x1)}).`,
              steps: [
                `Separate: ${y} ${dif(y)} = ${x} ${dif(x)}. Integrate: ${M.frac(M.sup(y, 2), "2")} = ${M.frac(M.sup(x, 2), "2")} + ${V("C")}, so ${M.sup(y, 2)} = ${M.sup(x, 2)} + ${V("D")}.`,
                `${y}(0) = ${n(a)} gives ${V("D")} = ${n(a * a)}; ${y} &gt; 0, so ${y} = ${M.sqrt(`${M.sup(x, 2)} + ${n(a * a)}`)}.`,
                `${y}(${n(x1)}) = ${M.sqrt(`${n(x1 * x1)} + ${n(a * a)}`)} = ${M.sqrt(n(c * c))} = ${n(c)}.`,
              ],
              answer: { kind: "number", value: c }, answerText: n(c), answerInput: String(c),
              vals: { aa: a * a, xx: x1 * x1, cc: c * c, c }, params: { kind, a, x1 },
            };
          }
          if (kind === "expo") {
            for (;;) {
              const m = r.int(0, 2), k = r.nonzero(-3, 3), y0 = r.int(1, 5), x1 = r.int(1, 2);
              const E = F(k * x1 ** (m + 1), m + 1);
              if (!E.isInt() || E.n === 0 || Math.abs(E.n) > 6) continue;
              const ans = ex([[y0, EXP(E.n)]]), gx = kv(k, xp(m, x));
              const rhs = m === 0 ? kv(k, y) : `${kv(k, xp(m, x))}${y}`;
              return {
                prompt: `Solve ${M.eq(`${M.frac(dif(y), dif(x))} = ${rhs}, ${y}(0) = ${n(y0)}`)} and find ${y}(${n(x1)}). Give the exact value.`,
                steps: [
                  `Separate: ${M.frac(dif(y), y)} = ${m === 0 ? (k === 1 ? "" : k === -1 ? "−" : `${n(k)} `) : `${gx} `}${dif(x)}. (${y} = 0 is also a solution, but not this one.)`,
                  `Integrate: ln|${y}| = ${kv(F(k, m + 1), xp(m + 1, x))} + ${V("C")}, so ${y} = ${V("A")}${M.sup("e", kv(F(k, m + 1), xp(m + 1, x)))}; ${y}(0) = ${n(y0)} gives ${V("A")} = ${n(y0)}.`,
                  `${y}(${n(x1)}) = ${n(y0)}${M.sup("e", F(k, m + 1).eq(1) ? xp(m + 1, n(x1)) : `${f(F(k, m + 1))} · ${xp(m + 1, n(x1))}`)} = ${ans.h}.`,
                ],
                answer: { kind: "number", value: ans.v }, answerText: ans.h, answerInput: ans.s,
                vals: { m1: m + 1, km: fv(F(k, m + 1)), E: E.n }, params: { kind, m, k, y0, x1 },
              };
            }
          }
          const kk = r.int(1, 4), y0 = -kk, x1 = r.int(1, 3), den = 2 + kk * x1 * x1, ans = F(-2 * kk, den);
          return {
            prompt: `Solve ${M.eq(`${M.frac(dif(y), dif(x))} = ${x}${M.sup(y, 2)}, ${y}(0) = ${n(y0)}`)} and find ${y}(${n(x1)}).`,
            steps: [
              `Separate: ${M.frac(dif(y), M.sup(y, 2))} = ${x} ${dif(x)}. Integrate: −${M.frac("1", y)} = ${M.frac(M.sup(x, 2), "2")} + ${V("C")}.`,
              `${y}(0) = ${n(y0)}: −${M.frac("1", np(y0))} = ${V("C")}, so ${V("C")} = ${f(F(1, kk))}. Then ${M.frac("1", y)} = −${M.frac(M.sup(x, 2), "2")} − ${f(F(1, kk))} and ${y} = ${M.frac(n(-2 * kk), `2 + ${kv(kk, M.sup(x, 2))}`)}.`,
              `${y}(${n(x1)}) = ${M.frac(n(-2 * kk), `2 + ${n(kk)} · ${n(x1 * x1)}`)} = ${M.frac(n(-2 * kk), n(den))} = ${f(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { C: fv(F(1, kk)), k2: -2 * kk, xx: x1 * x1, den, ans: fv(ans) }, params: { kind, y0, x1 },
          };
        }
        // level 3: Newton's law of cooling
        const Ta = r.int(18, 24), t1 = r.pick([5, 10, 15, 20]);
        if (r.chance(0.5)) {
          for (;;) {
            const rho = r.pick([F(1, 2), F(3, 4), F(2, 3), F(4, 5)]), m = r.pick([2, 3]), D0 = rho.d ** m * r.int(1, 3);
            const D1 = rho.mul(D0), Dm = rho.pow(m).mul(D0), T0 = Ta + D0, T1 = D1.add(Ta), Tm = Dm.add(Ta);
            if (T0 > 99 || D0 < 10) continue;
            return {
              prompt: `A cup of tea at ${n(T0)} °C is left in a ${n(Ta)} °C room. After ${n(t1)} minutes it is at ${dec(T1)} °C. Assuming Newton's law of cooling, what is its temperature after ${n(m * t1)} minutes?`,
              steps: [
                `${M.frac(dif(V("T")), dif(t))} = −${V("k")}(${V("T")} − ${n(Ta)}) gives ${V("T")} − ${n(Ta)} = ${n(D0)}${M.sup("e", `−${V("k")}${t}`)}: the difference from room temperature decays exponentially.`,
                `After ${n(t1)} min the difference is ${dec(T1)} − ${n(Ta)} = ${dec(D1)}, so every ${n(t1)} min it is multiplied by ${M.frac(dec(D1), n(D0))} = ${f(rho)}.`,
                `${n(m * t1)} min is ${n(m)} such periods: the difference is ${n(D0)} · ${M.sup(`(${f(rho)})`, m)} = ${dec(Dm)}, so ${V("T")} = ${n(Ta)} + ${dec(Dm)} = ${dec(Tm)} °C.`,
              ],
              answer: { kind: "number", value: Tm.value }, answerText: `${dec(Tm)} °C`, answerInput: typed(Tm),
              vals: { T0, T1: fv(T1), D1: fv(D1), rho: fv(rho), Dm: fv(Dm), Tm: fv(Tm), mt: m * t1 }, params: { kind: "exact", Ta, t1, D0, rho: fv(rho), m },
            };
          }
        }
        let D0, D1, D2;
        do { D0 = r.int(50, 75); D1 = r.int(25, D0 - 10); D2 = r.int(5, D1 - 5); } while (D2 >= D1);
        const T0 = Ta + D0, T1 = Ta + D1, T2 = Ta + D2;
        const l1 = Math.log(D0 / D1), l2 = Math.log(D0 / D2), k = l1 / t1, tt = l2 / k;
        return {
          prompt: `A pie comes out of the oven at ${n(T0)} °C into a ${n(Ta)} °C kitchen. After ${n(t1)} minutes it is at ${n(T1)} °C. Assuming Newton's law of cooling, when will it reach ${n(T2)} °C? Answer in minutes, rounded to 2 decimal places.`,
          steps: [
            `${V("T")} − ${n(Ta)} = ${n(D0)}${M.sup("e", `−${V("k")}${t}`)}. At ${t} = ${n(t1)}: ${n(D1)} = ${n(D0)}${M.sup("e", `−${n(t1)}${V("k")}`)}, so ${V("k")} = ${M.frac(`ln(${n(D0)}/${n(D1)})`, n(t1))} ≈ ${M.n(k, { dp: 5 })} per minute.`,
            `${V("T")} = ${n(T2)} means a difference of ${n(D2)}: ${n(D2)} = ${n(D0)}${M.sup("e", `−${V("k")}${t}`)}, so ${t} = ${M.frac(`ln(${n(D0)}/${n(D2)})`, V("k"))}.`,
            `${t} = ${n(t1)} · ${M.frac(`ln(${n(D0)}/${n(D2)})`, `ln(${n(D0)}/${n(D1)})`)} ≈ ${n(t1)} · ${M.frac(M.n(l2, { dp: 5 }), M.n(l1, { dp: 5 }))} ≈ ${M.n(tt, { dp: 2 })} minutes.`,
          ],
          answer: { kind: "number", value: tt, dp: 2 }, answerText: `${M.n(tt, { dp: 2 })} minutes`, answerInput: M.n(tt, { dp: 2 }),
          vals: { T0, T1, T2, k, l1, l2, tt }, params: { kind: "time", Ta, t1, D0, D1, D2 },
        };
      },
    },

    // ---- C2.29 Euler's method -------------------------------------------------------------------------------
    "C2.17": {
      title: "Euler's method",
      generate(r, level) {
        const yv = (k) => M.sub(y, String(k)), tvv = (k) => M.sub(t, String(k));
        if (level <= 2 && !(level === 2 && r.chance(0.5))) {
          const al = r.int(-2, 2), be = r.nonzero(-2, 2), ga = r.int(-3, 3), y0 = r.int(-2, 4), h = r.pick([F(1, 2), F(1, 10), F(1, 4)]), N = level === 1 ? 2 : 4;
          const fh = `${M.poly([al, 0], "t") === "0" ? "" : M.poly([al, 0], "t")}${al ? M.term(be, y) : kv(be, y)}${M.term(ga, "")}`;
          const fn_ = (tt, yy) => tt.mul(al).add(yy.mul(be)).add(ga);
          const rows = [];
          let tt = F(0), yy = F(y0);
          const ts = [tt], ys = [yy], ms = [];
          for (let i = 0; i < N; i++) {
            const m = fn_(tt, yy); ms.push(m);
            const ny = yy.add(h.mul(m));
            rows.push([n(i), dec(tt), dec(yy), dec(m), `${dec(yy)} + ${dec(h)} · ${decp(m)} = ${dec(ny)}`]);
            tt = tt.add(h); yy = ny; ts.push(tt); ys.push(yy);
          }
          return {
            prompt: `Use Euler's method with step ${V("h")} = ${dec(h)} to approximate ${y}(${dec(ts[N])}) for ${M.eq(`${M.frac(dif(y), dif(t))} = ${fh}, ${y}(0) = ${n(y0)}`)}`,
            graph: graph({ view: boxOf(ts.map((q, i) => [q.value, ys[i].value]), 0.6), items: ts.map((q, i) => ({ t: "pt", x: q.value, y: ys[i].value })).concat(polyline(ts.map((q, i) => [q.value, ys[i].value]), "secondary")) }),
            steps: [
              `Each step follows the tangent: ${M.sub(y, `${V("n")}+1`)} = ${M.sub(y, V("n"))} + ${V("h")} · ${V("f")}(${M.sub(t, V("n"))}, ${M.sub(y, V("n"))}), with ${V("f")}(${t}, ${y}) = ${fh}.`,
              M.table([V("n"), M.sub(t, V("n")), M.sub(y, V("n")), `slope ${V("f")}`, M.sub(y, `${V("n")}+1`)], rows),
              `So ${y}(${dec(ts[N])}) ≈ ${yv(N)} = ${dec(ys[N])}.`,
            ],
            answer: { kind: "number", value: ys[N].value }, answerText: dec(ys[N]), answerInput: typed(ys[N]),
            vals: { ts: fvs(ts), ys: fvs(ys), ms: fvs(ms), idx: Array.from({ length: N }, (_, i) => i) }, params: { kind: "lin", al, be, ga, y0, h: fv(h), N },
          };
        }
        if (level === 2) {
          const kk = r.pick([F(1, 10), F(1, 5), F(1, 4)]), h = r.pick([1, 2]), Ta = r.int(15, 25), T0 = r.int(60, 95);
          const rows = [];
          let T = F(T0);
          const Ts = [T], ms = [];
          for (let i = 0; i < 3; i++) {
            const m = kk.neg().mul(T.sub(Ta)); ms.push(m);
            const nT = T.add(m.mul(h));
            rows.push([n(i), n(i * h), dec(T), dec(m), `${dec(T)} + ${n(h)} · ${decp(m)} = ${dec(nT)}`]);
            T = nT; Ts.push(T);
          }
          return {
            prompt: `Coffee at ${n(T0)} °C cools in a ${n(Ta)} °C room by ${M.eq(`${M.frac(dif(V("T")), dif(t))} = −${dec(kk)}(${V("T")} − ${n(Ta)})`)} (${t} in minutes). Use Euler's method with ${V("h")} = ${n(h)} min to estimate the temperature after ${n(3 * h)} minutes, in °C.`,
            steps: [
              `Euler step: ${M.sub(V("T"), `${V("n")}+1`)} = ${M.sub(V("T"), V("n"))} + ${n(h)} · (−${dec(kk)})(${M.sub(V("T"), V("n"))} − ${n(Ta)}).`,
              M.table([V("n"), M.sub(t, V("n")), M.sub(V("T"), V("n")), "slope", M.sub(V("T"), `${V("n")}+1`)], rows),
              `After ${n(3 * h)} minutes, ${V("T")} ≈ ${dec(Ts[3])} °C.`,
            ],
            answer: { kind: "number", value: Ts[3].value }, answerText: `${dec(Ts[3])} °C`, answerInput: typed(Ts[3]),
            vals: { Ts: fvs(Ts), ms: fvs(ms), times: [0, h, 2 * h], total: 3 * h }, params: { kind: "cool", kk: fv(kk), h, Ta, T0 },
          };
        }
        // level 3: Heun's method (2 steps) or one RK4 step
        const al = r.int(-1, 2), be = r.nonzero(-2, 2), y0 = r.int(1, 3);
        const fn_ = (tt, yy) => Frac.of(tt).mul(al).add(Frac.of(yy).mul(be));
        const fh = al ? `${M.poly([al, 0], "t")}${M.term(be, y)}` : kv(be, y);
        if (r.chance(0.5)) {
          const h = F(1, 2), rows = [], ts = [F(0)], ys = [F(y0)], k1s = [], k2s = [];
          for (let i = 0; i < 2; i++) {
            const tt = ts[i], yy = ys[i], k1 = fn_(tt, yy), k2 = fn_(tt.add(h), yy.add(h.mul(k1))), ny = yy.add(h.div(2).mul(k1.add(k2)));
            k1s.push(k1); k2s.push(k2);
            rows.push(`Step ${i + 1} from (${dec(tt)}, ${dec(yy)}): ${M.sub(V("k"), "1")} = ${V("f")}(${dec(tt)}, ${dec(yy)}) = ${dec(k1)}; the Euler guess is ${dec(yy)} + ${dec(h)} · ${decp(k1)} = ${dec(yy.add(h.mul(k1)))}, so ${M.sub(V("k"), "2")} = ${V("f")}(${dec(tt.add(h))}, ${dec(yy.add(h.mul(k1)))}) = ${dec(k2)}; ${M.sub(y, String(i + 1))} = ${dec(yy)} + ${dec(h.div(2))}(${dec(k1)} + ${decp(k2)}) = ${dec(ny)}.`);
            ts.push(tt.add(h)); ys.push(ny);
          }
          return {
            prompt: `Use the improved Euler (Heun) method with ${V("h")} = ${dec(h)} to approximate ${y}(1) for ${M.eq(`${M.frac(dif(y), dif(t))} = ${fh}, ${y}(0) = ${n(y0)}`)}`,
            steps: [
              `Heun's step: ${M.sub(V("k"), "1")} = ${V("f")}(${M.sub(t, V("n"))}, ${M.sub(y, V("n"))}), ${M.sub(V("k"), "2")} = ${V("f")}(${M.sub(t, V("n"))} + ${V("h")}, ${M.sub(y, V("n"))} + ${V("h")}${M.sub(V("k"), "1")}), ${M.sub(y, `${V("n")}+1`)} = ${M.sub(y, V("n"))} + ${M.frac(V("h"), "2")}(${M.sub(V("k"), "1")} + ${M.sub(V("k"), "2")}): average the slopes at both ends.`,
              ...rows,
              `So ${y}(1) ≈ ${dec(ys[2])}.`,
            ],
            answer: { kind: "number", value: ys[2].value }, answerText: dec(ys[2]), answerInput: typed(ys[2]),
            vals: { ts: fvs(ts), ys: fvs(ys), k1s: fvs(k1s), k2s: fvs(k2s), eul: fvs([0, 1].map((i) => ys[i].add(h.mul(k1s[i])))), h2: fv(h.div(2)) }, params: { kind: "heun", al, be, y0 },
          };
        }
        const h = r.pick([F(1, 2), F(1)]), hh = h.div(2), t0 = F(0), Y0 = F(y0);
        const k1 = fn_(t0, Y0), k2 = fn_(t0.add(hh), Y0.add(hh.mul(k1))), k3 = fn_(t0.add(hh), Y0.add(hh.mul(k2))), k4 = fn_(t0.add(h), Y0.add(h.mul(k3)));
        const S = k1.add(k2.mul(2)).add(k3.mul(2)).add(k4), y1 = Y0.add(h.div(6).mul(S));
        const yA = Y0.add(hh.mul(k1)), yB = Y0.add(hh.mul(k2)), yC = Y0.add(h.mul(k3));
        return {
          prompt: `Take one step of the Runge–Kutta method (RK4) with ${V("h")} = ${dec(h)} to approximate ${y}(${dec(h)}) for ${M.eq(`${M.frac(dif(y), dif(t))} = ${fh}, ${y}(0) = ${n(y0)}`)}`,
          steps: [
            `${M.sub(V("k"), "1")} = ${V("f")}(0, ${n(y0)}) = ${dec(k1)}.`,
            `${M.sub(V("k"), "2")} = ${V("f")}(${dec(hh)}, ${n(y0)} + ${dec(hh)} · ${decp(k1)}) = ${V("f")}(${dec(hh)}, ${dec(yA)}) = ${dec(k2)}.`,
            `${M.sub(V("k"), "3")} = ${V("f")}(${dec(hh)}, ${n(y0)} + ${dec(hh)} · ${decp(k2)}) = ${V("f")}(${dec(hh)}, ${dec(yB)}) = ${dec(k3)}.`,
            `${M.sub(V("k"), "4")} = ${V("f")}(${dec(h)}, ${n(y0)} + ${dec(h)} · ${decp(k3)}) = ${V("f")}(${dec(h)}, ${dec(yC)}) = ${dec(k4)}.`,
            `${M.sub(y, "1")} = ${n(y0)} + ${M.frac(dec(h), "6")}(${dec(k1)} + 2 · ${decp(k2)} + 2 · ${decp(k3)} + ${decp(k4)}) = ${n(y0)} + ${M.frac(dec(h), "6")} · ${decp(S)} = ${dec(y1)}.`,
          ],
          answer: { kind: "number", value: y1.value }, answerText: dec(y1), answerInput: typed(y1),
          vals: { h: fv(h), hh: fv(hh), k: fvs([k1, k2, k3, k4]), yA: fv(yA), yB: fv(yB), yC: fv(yC), S: fv(S), y1: fv(y1) }, params: { kind: "rk4", al, be, y0, h: fv(h) }, consts: [3, 4, 6],
        };
      },
    },

    // ---- C2.30 First-order linear equations ----------------------------------------------------------------
    "C2.linear-ode": {
      title: "First-order linear equations",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const a = r.int(1, 4), b = r.nonzero(-8, 8), y0 = r.int(-5, 5), ss = F(b, a), C = F(y0).sub(ss);
            if (C.n === 0) continue;
            const sol = `${f(ss)}${M.term(C, ek(-a))}`, expr = `${typed(ss)} + (${typed(C)})*e^(${-a}*x)`;
            return {
              prompt: `Solve ${M.eq(`${yp} + ${kv(a, y)} = ${n(b)}, ${y}(0) = ${n(y0)}`)}`,
              steps: [
                `Integrating factor: ${V("μ")} = ${M.sup("e", `∫${n(a)} ${dif(x)}`)} = ${ek(a)}. Multiply through: (${ek(a)}${y})′ = ${n(b)}${ek(a)}.`,
                `Integrate: ${ek(a)}${y} = ${kv(ss, ek(a))} + ${V("C")}, so ${y} = ${f(ss)} + ${V("C")}${ek(-a)}.`,
                `${y}(0) = ${n(y0)}: ${f(ss)} + ${V("C")} = ${n(y0)}, so ${V("C")} = ${f(C)}. ${y} = ${sol}: the steady state ${f(ss)} plus a decaying transient.`,
              ],
              answer: { kind: "expr", expr, vars: ["x"] }, answerText: `${y} = ${sol}`, answerInput: expr,
              vals: { ss: fv(ss), C: fv(C), na: -a }, params: { a, b, y0 },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const k = r.int(1, 3), m = r.int(0, 2), c = r.nonzero(-4, 4), y0 = r.int(-4, 4), dd = m + k + 1, cq = F(c, dd), C = F(y0).sub(cq);
            if (C.n === 0) continue;
            const solH = `${kv(cq, xp(m + 1))} ${C.n < 0 ? "−" : "+"} ${M.frac(n(Math.abs(C.n)), `${C.d === 1 ? "" : n(C.d)}${xp(k)}`)}`;
            const expr = `(${typed(cq)})*x^${m + 1} + (${typed(C)})*x^(${-k})`;
            return {
              prompt: `Solve ${M.eq(`${yp} + ${M.frac(n(k), x)}${y} = ${m === 0 ? n(c) : kv(c, xp(m))}, ${y}(1) = ${n(y0)}`)} for ${x} &gt; 0.`,
              steps: [
                `It is in standard form with ${V("P")}(${x}) = ${M.frac(n(k), x)}. Integrating factor: ${V("μ")} = ${M.sup("e", `${n(k)} ln ${x}`)} = ${xp(k)}.`,
                `Multiply through: (${xp(k)}${y})′ = ${kv(c, xp(m + k))}. Integrate: ${xp(k)}${y} = ${kv(cq, xp(dd))} + ${V("C")}.`,
                `Divide by ${xp(k)}: ${y} = ${kv(cq, xp(m + 1))} + ${M.frac(V("C"), xp(k))}. ${y}(1) = ${n(y0)}: ${f(cq)} + ${V("C")} = ${n(y0)}, so ${V("C")} = ${f(C)}.`,
                `${y} = ${solH}.`,
              ],
              answer: { kind: "expr", expr, vars: ["x"] }, answerText: `${y} = ${solH}`, answerInput: expr,
              vals: { dd, mk: m + k, m1: m + 1, cq: fv(cq), C: fv(C) }, params: { k, m, c, y0 },
            };
          }
        }
        const Vv = r.pick([100, 200, 500, 1000]), cin = r.pick([0.1, 0.2, 0.25, 0.5]), rate = r.pick([2, 4, 5, 10]), Tm = r.pick([10, 20, 30, 60]), A0 = r.int(0, 20);
        const Vc = Vv * cin, diff = A0 - Vc, rv = rate / Vv, ex_ = rv * Tm, e_ = Math.exp(-ex_), A = Vc + diff * e_;
        const Av = V("A");
        return {
          prompt: `A tank holds ${n(Vv)} L of water with ${n(A0)} kg of salt dissolved. Brine with ${fmt(cin)} kg of salt per liter flows in at ${n(rate)} L/min, and the well-mixed solution flows out at the same rate. How much salt is in the tank after ${n(Tm)} minutes? Answer in kg, rounded to 2 decimal places.`,
          steps: [
            `Rate in: ${n(rate)} · ${fmt(cin)} = ${n(rate * cin)} kg/min. Rate out: ${n(rate)} · ${M.frac(Av, n(Vv))} = ${M.n(rv, { dp: 4 })}${Av} kg/min. So ${Av}′ + ${M.n(rv, { dp: 4 })}${Av} = ${n(rate * cin)}, a linear equation.`,
            `With constant coefficients the solution is the steady state plus a transient: ${Av} = ${M.frac(n(rate * cin), M.n(rv, { dp: 4 }))} + ${V("C")}${M.sup("e", `−${M.n(rv, { dp: 4 })}${t}`)} = ${n(Vc)} + ${V("C")}${M.sup("e", `−${M.n(rv, { dp: 4 })}${t}`)}.`,
            `${Av}(0) = ${n(A0)}: ${V("C")} = ${n(A0)} − ${n(Vc)} = ${n(diff)}.`,
            `At ${t} = ${n(Tm)}: ${M.sup("e", `−${M.n(ex_, { dp: 4 })}`)} ≈ ${M.n(e_, { dp: 5 })}, so ${Av} ≈ ${n(Vc)} + ${np(diff)} · ${M.n(e_, { dp: 5 })} ≈ ${M.n(A, { dp: 2 })} kg.`,
          ],
          answer: { kind: "number", value: A, dp: 2 }, answerText: `${M.n(A, { dp: 2 })} kg`, answerInput: M.n(A, { dp: 2 }),
          vals: { rin: rate * cin, rv, Vc, diff, ex: ex_, e: e_, A }, params: { Vv, cin, rate, Tm, A0 },
        };
      },
    },

    // ---- C2.31 Second-order homogeneous equations -------------------------------------------------------------
    "C2.second-order": {
      title: "Second-order linear equations",
      generate(r, level) {
        const lhs = (b, c, v = x) => `${ypp.replace(y, v === x ? y : V("x"))}${b ? M.term(b, `${v === x ? y : V("x")}′`) : ""}${c ? M.term(c, v === x ? y : V("x")) : ""}`;
        if (level <= 2) {
          let r1, r2;
          do { r1 = r.int(-4, 3); r2 = r.int(-3, 4); } while (r1 >= r2 || (level === 2 && r1 * r2 === 0));
          const b = -(r1 + r2), c = r1 * r2;
          if (level === 1) {
            return {
              prompt: `Find the roots of the characteristic equation of ${M.eq(`${lhs(b, c)} = 0`)} and write the general solution. Enter the roots separated by a comma.`,
              steps: [
                `Try ${y} = ${M.sup("e", `${V("r")}${x}`)}: substituting and cancelling ${M.sup("e", `${V("r")}${x}`)} gives ${M.poly([1, b, c], "r")} = 0.`,
                `Factor: ${fac(r1).replace(/<i>x<\/i>/g, V("r"))}${fac(r2).replace(/<i>x<\/i>/g, V("r"))} = 0, so ${V("r")} = ${n(r1)} and ${V("r")} = ${n(r2)}.`,
                `Two distinct real roots: ${y} = ${M.sub(V("c"), "1")}${r1 === 0 ? "" : ek(r1)} + ${M.sub(V("c"), "2")}${r2 === 0 ? "" : ek(r2)}.`,
              ],
              answer: { kind: "numbers", values: [r1, r2] }, answerText: `${V("r")} = ${n(r1)}, ${n(r2)}`, answerInput: `${r1}, ${r2}`,
              vals: { r1, r2 }, params: { b, c },
            };
          }
          const c1 = r.nonzero(-3, 3), c2 = r.nonzero(-3, 3), y0 = c1 + c2, v0 = c1 * r1 + c2 * r2;
          const term = (cc, rr) => (rr === 0 ? n(cc) : kv(cc, ek(rr)));
          const sol = `${term(c1, r1)}${r2 === 0 ? M.term(c2, "") : M.term(c2, ek(r2))}`;
          const expr = `(${c1})*e^(${r1}*x) + (${c2})*e^(${r2}*x)`;
          return {
            prompt: `Solve ${M.eq(`${lhs(b, c)} = 0, ${y}(0) = ${n(y0)}, ${yp}(0) = ${n(v0)}`)}`,
            steps: [
              `Characteristic equation ${M.poly([1, b, c], "r")} = 0 = ${fac(r1).replace(/<i>x<\/i>/g, V("r"))}${fac(r2).replace(/<i>x<\/i>/g, V("r"))}: ${V("r")} = ${n(r1)}, ${n(r2)}. So ${y} = ${M.sub(V("c"), "1")}${r1 === 0 ? "" : ek(r1)} + ${M.sub(V("c"), "2")}${r2 === 0 ? "" : ek(r2)}.`,
              `${y}(0) = ${M.sub(V("c"), "1")} + ${M.sub(V("c"), "2")} = ${n(y0)} and ${yp}(0) = ${kv(r1, M.sub(V("c"), "1"))}${M.term(r2, M.sub(V("c"), "2"))} = ${n(v0)}.`,
              `Subtract ${n(r1)} times the first from the second: ${kv(r2 - r1, M.sub(V("c"), "2"))} = ${n(v0 - r1 * y0)}, so ${M.sub(V("c"), "2")} = ${n(c2)} and ${M.sub(V("c"), "1")} = ${n(c1)}.`,
              `${y} = ${sol}.`,
            ],
            answer: { kind: "expr", expr, vars: ["x"] }, answerText: `${y} = ${sol}`, answerInput: expr,
            vals: { r1, r2, d: r2 - r1, rhs: v0 - r1 * y0, c1, c2 }, params: { b, c, y0, v0 },
          };
        }
        // level 3: a damped spring, critically damped or underdamped
        const X_ = V("x"), Xp = `${X_}′`, Xpp = `${X_}″`;
        const eqn = (cc, kk) => `${Xpp} + ${kv(cc, Xp)} + ${kv(kk, X_)} = 0`;
        if (r.chance(0.5)) {
          const rr = -r.int(1, 3), cc = -2 * rr, kk = rr * rr, x0 = r.nonzero(-3, 3), C2 = r.int(-4, 4), v0 = C2 + rr * x0;
          const sol = `(${M.poly([C2, x0], "t")})${ek(rr, t)}`, expr = `(${x0} + (${C2})*t)*e^(${rr}*t)`;
          return {
            prompt: `A 1 kg mass on a spring with damping obeys ${M.eq(eqn(cc, kk))} (${X_} in meters, ${t} in seconds) with ${X_}(0) = ${n(x0)} and ${Xp}(0) = ${n(v0)}. Find ${X_}(${t}).`,
            steps: [
              `Characteristic equation: ${M.poly([1, cc, kk], "r")} = ${M.sup(`(${M.poly([1, -rr], "r")})`, 2)} = 0, a repeated root ${V("r")} = ${n(rr)} (discriminant ${M.sup(n(cc), 2)} − 4 · ${n(kk)} = 0): critically damped.`,
              `So ${X_} = (${M.sub(V("c"), "1")} + ${M.sub(V("c"), "2")}${t})${ek(rr, t)}. ${X_}(0) = ${M.sub(V("c"), "1")} = ${n(x0)}.`,
              `${Xp} = ${M.sub(V("c"), "2")}${ek(rr, t)} + ${n(rr)}(${M.sub(V("c"), "1")} + ${M.sub(V("c"), "2")}${t})${ek(rr, t)}, so ${Xp}(0) = ${M.sub(V("c"), "2")} + ${np(rr)} · ${np(x0)} = ${n(v0)} and ${M.sub(V("c"), "2")} = ${n(C2)}.`,
              `${X_}(${t}) = ${sol}.`,
            ],
            answer: { kind: "expr", expr, vars: ["t"] }, answerText: `${X_}(${t}) = ${sol}`, answerInput: expr,
            vals: { cc, kk, rr, C2 }, params: { kind: "crit", cc, kk, x0, v0 }, consts: [4],
          };
        }
        const al = -r.int(1, 2), be = r.int(1, 3), cc = -2 * al, kk = al * al + be * be, x0 = r.nonzero(-3, 3), C2 = r.int(-3, 3), v0 = be * C2 + al * x0;
        const D = cc * cc - 4 * kk, bt = kv(be, t);
        const sol = `${ek(al, t)}(${kf(x0, `cos ${be === 1 ? t : bt}`)}${C2 ? tf(C2, `sin ${be === 1 ? t : bt}`) : ""})`;
        const expr = `e^(${al}*t)*((${x0})*cos(${be}*t) + (${C2})*sin(${be}*t))`;
        return {
          prompt: `A 1 kg mass on a spring with damping obeys ${M.eq(eqn(cc, kk))} (${X_} in meters, ${t} in seconds) with ${X_}(0) = ${n(x0)} and ${Xp}(0) = ${n(v0)}. Find ${X_}(${t}).`,
          steps: [
            `Characteristic equation: ${M.poly([1, cc, kk], "r")} = 0. The discriminant ${M.sup(n(cc), 2)} − 4 · ${n(kk)} = ${n(D)} &lt; 0: underdamped, with roots ${V("r")} = ${M.frac(`${n(-cc)} ± ${M.sqrt(n(D))}`, "2")} = ${n(al)} ± ${be === 1 ? "" : n(be)}${V("i")}.`,
            `So ${X_} = ${ek(al, t)}(${M.sub(V("c"), "1")} cos ${bt} + ${M.sub(V("c"), "2")} sin ${bt}). ${X_}(0) = ${M.sub(V("c"), "1")} = ${n(x0)}.`,
            `${Xp}(0) = ${kv(al, M.sub(V("c"), "1"))} + ${kv(be, M.sub(V("c"), "2"))} = ${n(v0)}, so ${kv(be, M.sub(V("c"), "2"))} = ${n(v0)} − ${np(al * x0)} = ${n(be * C2)} and ${M.sub(V("c"), "2")} = ${n(C2)}.`,
            `${X_}(${t}) = ${sol}: an oscillation with angular frequency ${n(be)} inside a decaying envelope ${ek(al, t)}.`,
          ],
          answer: { kind: "expr", expr, vars: ["t"] }, answerText: `${X_}(${t}) = ${sol}`, answerInput: expr,
          vals: { cc, kk, D, al, be, ax0: al * x0, bc2: be * C2, C2, ncc: -cc }, params: { kind: "under", cc, kk, x0, v0 }, consts: [4],
        };
      },
    },

    // ---- C2.32 Undetermined coefficients ---------------------------------------------------------------------
    "C2.undetermined": {
      title: "Undetermined coefficients",
      generate(r, level) {
        const lhs = (b, c) => `${ypp}${b ? M.term(b, yp) : ""}${c ? M.term(c, y) : ""}`;
        const yP = M.sub(y, "p");
        if (level === 1) {
          for (;;) {
            const b = r.int(-4, 4), c = r.int(-6, 6), k = r.nonzero(-2, 3), K = r.nonzero(-9, 9), Pk = k * k + b * k + c;
            if (Pk === 0) continue;
            const A = F(K, Pk), expr = `(${typed(A)})*e^(${k}*x)`;
            return {
              prompt: `Find a particular solution of ${M.eq(`${lhs(b, c)} = ${kv(K, ek(k))}`)}`,
              steps: [
                `The forcing is exponential, so try ${yP} = ${V("A")}${ek(k)}: then ${yP}′ = ${kv(k, `${V("A")}${ek(k)}`)} and ${yP}″ = ${kv(k * k, `${V("A")}${ek(k)}`)}.`,
                `Substitute and divide by ${ek(k)}: ${V("A")}(${n(k * k)}${M.term(b * k, "")}${M.term(c, "")}) = ${n(K)}, that is ${n(Pk)}${V("A")} = ${n(K)} (${n(k)} is not a characteristic root, so this is nonzero).`,
                `${V("A")} = ${f(A)}, so ${yP} = ${kv(A, ek(k))}.`,
              ],
              answer: { kind: "expr", expr, vars: ["x"] }, answerText: `${yP} = ${kv(A, ek(k))}`, answerInput: expr,
              vals: { kk: k * k, bk: b * k, Pk, A: fv(A) }, params: { b, c, k, K },
            };
          }
        }
        if (level === 2) {
          const b = r.int(-4, 4), c = r.nonzero(-5, 5), p = r.nonzero(-6, 6), q = r.int(-6, 6);
          const A = F(p, c), B = F(q).sub(A.mul(b)).div(c), sol = M.poly([A, B]), expr = `(${typed(A)})*x + (${typed(B)})`;
          return {
            prompt: `Find a particular solution of ${M.eq(`${lhs(b, c)} = ${M.poly([p, q])}`)}`,
            steps: [
              `The forcing is a degree-1 polynomial, so try ${yP} = ${V("A")}${x} + ${V("B")} (include every lower power): ${yP}′ = ${V("A")}, ${yP}″ = 0.`,
              `Substitute: ${b ? `${kv(b, V("A"))}${M.term(c, `(${V("A")}${x} + ${V("B")})`)}` : kv(c, `(${V("A")}${x} + ${V("B")})`)} = ${M.poly([p, q])}.`,
              `Match ${x}: ${n(c)}${V("A")} = ${n(p)}, so ${V("A")} = ${f(A)}. Match constants: ${b ? `${kv(b, V("A"))}${M.term(c, V("B"))}` : kv(c, V("B"))} = ${n(q)}, so ${V("B")} = ${f(B)}.`,
              `${yP} = ${sol}.`,
            ],
            answer: { kind: "expr", expr, vars: ["x"] }, answerText: `${yP} = ${sol}`, answerInput: expr,
            vals: { A: fv(A), B: fv(B) }, params: { b, c, p, q },
          };
        }
        if (r.chance(0.3)) {
          const w = r.int(1, 3), K = r.nonzero(-8, 8), ww = w * w, coef = F(K, 2 * w);
          const wx = kv(w, x), expr = `(${typed(coef)})*x*sin(${w}*x)`;
          return {
            prompt: `Find a particular solution of ${M.eq(`${ypp} + ${n(ww)}${y} = ${kf(K, `cos ${wx}`)}`)}`,
            steps: [
              `The homogeneous solutions are cos ${wx} and sin ${wx} (roots ±${w === 1 ? "" : n(w)}${V("i")}). The usual trial ${V("A")} cos ${wx} + ${V("B")} sin ${wx} solves the homogeneous equation, so it gives 0: multiply it by ${x} (resonance).`,
              `Try ${yP} = ${x}(${V("A")} cos ${wx} + ${V("B")} sin ${wx}). Then ${yP}″ + ${n(ww)}${yP} = ${n(2 * w)}(${V("B")} cos ${wx} − ${V("A")} sin ${wx}).`,
              `Match: ${n(2 * w)}${V("B")} = ${n(K)} and ${V("A")} = 0, so ${V("B")} = ${f(coef)}.`,
              `${yP} = ${kv(coef, `${x} sin ${wx}`)}: its amplitude grows linearly in ${x}.`,
            ],
            answer: { kind: "expr", expr, vars: ["x"] }, answerText: `${yP} = ${kv(coef, `${x} sin ${wx}`)}`, answerInput: expr,
            vals: { ww, w2: 2 * w, coef: fv(coef) }, params: { kind: "res", w, K },
          };
        }
        for (;;) {
          const b = r.int(1, 4), c = r.int(1, 9), w = r.int(1, 3), K = r.nonzero(-9, 9), cw = c - w * w, bw = b * w, D = cw * cw + bw * bw;
          const A = F(K * cw, D), B = F(K * bw, D), wx = kv(w, x);
          const sol = `${A.n ? kf(A, `cos ${wx}`) : ""}${A.n ? tf(B, `sin ${wx}`) : kf(B, `sin ${wx}`)}`;
          const expr = `(${typed(A)})*cos(${w}*x) + (${typed(B)})*sin(${w}*x)`;
          return {
            prompt: `Find a particular solution of ${M.eq(`${lhs(b, c)} = ${kf(K, `cos ${wx}`)}`)}`,
            steps: [
              `Sinusoidal forcing: try ${yP} = ${V("A")} cos ${wx} + ${V("B")} sin ${wx} (always both). Then ${yP}″ = −${n(w * w)}${yP}, and ${yP}′ = ${n(w)}(−${V("A")} sin ${wx} + ${V("B")} cos ${wx}).`,
              `Substitute and collect: cos ${wx}: ${cw ? `${kv(cw, V("A"))}${M.term(bw, V("B"))}` : kv(bw, V("B"))} = ${n(K)}; sin ${wx}: ${kv(-bw, V("A"))}${M.term(cw, V("B"))} = 0.`,
              `Solve the pair (the determinant is ${M.sup(np(cw), 2)} + ${M.sup(n(bw), 2)} = ${n(D)}): ${V("A")} = ${M.frac(`${n(K)} · ${np(cw)}`, n(D))} = ${f(A)}, ${V("B")} = ${M.frac(`${n(K)} · ${n(bw)}`, n(D))} = ${f(B)}.`,
              `${yP} = ${sol}.`,
            ],
            answer: { kind: "expr", expr, vars: ["x"] }, answerText: `${yP} = ${sol}`, answerInput: expr,
            vals: { ww: w * w, cw, bw, D, A: fv(A), B: fv(B) }, params: { kind: "sin", b, c, w, K },
          };
        }
      },
    },

    // ---- C2.33 Laplace transforms ---------------------------------------------------------------------------
    "C2.laplace": {
      title: "Laplace transforms",
      generate(r, level) {
        const Ls = (inner) => `ℒ{${inner}}`;
        if (level === 1) {
          const a = r.nonzero(-5, 5), k = r.nonzero(-3, 3), kind = r.pick(["pow", "sin", "cos"]), b = r.nonzero(-4, 4);
          let Fh, Fs, nn = 0, w = 0, extra, vals;
          const ab = Math.abs(b);
          if (kind === "pow") {
            nn = r.int(1, 3); const nf = factorial(nn), cb = b * nf;
            extra = `${Ls(xp(nn, t))} = ${M.frac(`${n(nn)}!`, M.sup(sv, nn + 1))}`;
            Fh = M.frac(n(Math.abs(cb)), M.sup(sv, nn + 1)); Fs = `(${cb})/s^${nn + 1}`;
            vals = { nf, cb, n1: nn + 1 };
          } else {
            w = r.int(1, 4); const ww = w * w;
            extra = `${Ls(`${kind} ${kv(w, t)}`)} = ${M.frac(kind === "sin" ? n(w) : sv, `${M.sup(sv, 2)} + ${n(ww)}`)}`;
            Fh = M.frac(kind === "sin" ? n(ab * w) : kv(ab, sv), `${M.sup(sv, 2)} + ${n(ww)}`); Fs = kind === "sin" ? `(${b * w})/(s^2 + ${ww})` : `(${b})*s/(s^2 + ${ww})`;
            vals = { ww, bw: b * w };
          }
          const ftH = `${kv(a, ek(k, t))}${b < 0 ? " − " : " + "}${kind === "pow" ? kv(ab, xp(nn, t)) : kf(ab, `${kind} ${kv(w, t)}`)}`;
          const Fexpr = `(${a})/(s - (${k})) + ${Fs}`;
          const FH = `${a < 0 ? "−" : ""}${M.frac(n(Math.abs(a)), dn(k).replace(/<i>x<\/i>/g, sv))} ${b < 0 ? "−" : "+"} ${Fh}`;
          return {
            prompt: `Find the Laplace transform of ${M.eq(`${V("f")}(${t}) = ${ftH}`)}`,
            steps: [
              `ℒ is linear: transform each term and keep the constants.`,
              `${Ls(ek(k, t))} = ${M.frac("1", dn(k).replace(/<i>x<\/i>/g, sv))} and ${extra}.`,
              `${V("F")}(${sv}) = ${FH}.`,
            ],
            answer: { kind: "expr", expr: Fexpr, vars: ["s"] }, answerText: `${V("F")}(${sv}) = ${FH}`, answerInput: Fexpr,
            vals, params: { a, k, kind, b, nn, w },
          };
        }
        if (level === 2) {
          let a, b;
          do { a = r.int(-4, 4); b = r.int(-4, 4); } while (a >= b);
          const A = r.nonzero(-4, 4), B = r.nonzero(-4, 4), al = A + B, be = -(A * b + B * a);
          const sa = dn(a).replace(/<i>x<\/i>/g, sv), sb = dn(b).replace(/<i>x<\/i>/g, sv), den2 = a === 0 ? `${sv}(${sb})` : b === 0 ? `${sv}(${sa})` : `(${sa})(${sb})`;
          const ft = `${a === 0 ? n(A) : kv(A, ek(a, t))}${b === 0 ? M.term(B, "") : M.term(B, ek(b, t))}`, expr = `(${A})*e^(${a}*t) + (${B})*e^(${b}*t)`;
          return {
            prompt: `Find the inverse Laplace transform of ${M.eq(`${V("F")}(${sv}) = ${M.frac(M.poly([al, be], "s"), den2)}`)}`,
            steps: [
              `Partial fractions: ${M.frac(M.poly([al, be], "s"), den2)} = ${M.frac(V("A"), sa)} + ${M.frac(V("B"), sb)}.`,
              `Cover-up: ${V("A")} = ${M.frac(`${n(al)} · ${np(a)} + ${np(be)}`, `${n(a)} − ${np(b)}`)} = ${n(A)}, ${V("B")} = ${M.frac(`${n(al)} · ${np(b)} + ${np(be)}`, `${n(b)} − ${np(a)}`)} = ${n(B)}.`,
              `ℒ<sup>−1</sup>{${M.frac("1", `${sv} − ${V("a")}`)}} = ${M.sup("e", `${V("a")}${t}`)}, so ${V("f")}(${t}) = ${ft}.`,
            ],
            answer: { kind: "expr", expr, vars: ["t"] }, answerText: `${V("f")}(${t}) = ${ft}`, answerInput: expr,
            vals: { a, b, A, B }, params: { al, be, a, b },
          };
        }
        for (;;) {
          const a = r.nonzero(-3, 4), k = r.nonzero(-3, 3), K = r.nonzero(-6, 6), y0 = r.int(-4, 4);
          if (k === -a) continue;
          const c = F(K, k + a), C = F(y0).sub(c), Y = V("Y");
          const sk = dn(k).replace(/<i>x<\/i>/g, sv), sa = M.poly([1, a], "s");
          const sol = `${kv(c, ek(k, t))}${M.term(C, ek(-a, t))}`, expr = `(${typed(c)})*e^(${k}*t) + (${typed(C)})*e^(${-a}*t)`;
          return {
            prompt: `Solve with the Laplace transform: ${M.eq(`${yp} ${a < 0 ? "−" : "+"} ${kv(Math.abs(a), y)} = ${kv(K, ek(k, t))}, ${y}(0) = ${n(y0)}`)}`,
            steps: [
              `Transform, using ℒ{${yp}} = ${sv}${Y} − ${y}(0): ${sv}${Y}${M.term(-y0, "")}${M.term(a, Y)} = ${M.frac(n(K), sk)}.`,
              `Solve for ${Y}: ${Y} = ${y0 ? `${fracT(y0, sa, true)} + ` : ""}${M.frac(n(K), `(${sk})(${sa})`)}.`,
              `Partial fractions: ${M.frac(n(K), `(${sk})(${sa})`)} = ${fracT(c, sk, true)}${fracT(c.neg(), sa)}, since ${M.frac(n(K), `${n(k)} − ${np(-a)}`)} = ${f(c)}.`,
              `So ${Y} = ${fracT(c, sk, true)}${fracT(C, sa)} (with ${n(y0)} − ${fp(c)} = ${f(C)}), and inverting term by term, ${y} = ${sol}.`,
            ],
            answer: { kind: "expr", expr, vars: ["t"] }, answerText: `${y} = ${sol}`, answerInput: expr,
            vals: { c: fv(c), C: fv(C), na: -a, ka: k + a }, params: { a, k, K, y0 },
          };
        }
      },
    },
  });
})(Practice);
