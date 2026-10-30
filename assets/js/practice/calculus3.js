/*
 * practice/calculus3.js — Calculus III (multivariable calculus) practice problems (chapter 10), one generator per
 * concept key.
 *
 * Each generator(r, level) draws hand-solvable numbers for the level (1 easy, 2 medium, 3 hard) and builds every
 * number it shows from values it computes and reports in `vals`; tools/practice/verifiers/calculus3.py recomputes
 * each of them independently (exact fractions and SymPy). See practice/core.js for the API.
 *
 * Skipped concepts: none. Every concept of chapter 10 has something to compute.
 */
(function (P) {
  "use strict";
  const { Frac, M, fmt, graph } = P;
  const F = (a, b = 1) => new Frac(a, b);
  const Q = (v) => Frac.of(v);
  const n = (v, o) => M.n(v, o), np = (v) => M.n(v, { paren: true });
  const f = (q) => M.f(q), fp = (q) => M.f(q, { paren: true });
  const fv = (q) => { q = Q(q); return { n: q.n, d: q.d }; };
  /** A Frac as typed text: 3, -1/2. */
  const raw = (q) => { q = Q(q); return q.d === 1 ? String(q.n) : `${q.n}/${q.d}`; };
  /** A decimal shown from an exact Frac (terminating decimals only). */
  const dec = (q) => fmt(Q(q).value);
  const decp = (q) => { const s = dec(q); return s.startsWith("−") ? `(${s})` : s; };
  const decIn = (q) => String(P.round(Q(q).value, 10));
  const V = (s) => M.v(s);
  const x = V("x"), y = V("y"), z = V("z"), t = V("t");
  const XY = ["x", "y"], XYZ = ["x", "y", "z"];
  const bv = (s) => `<b>${s}</b>`;
  const pw = (b, k) => (k === 0 ? "" : k === 1 ? b : M.sup(b, k));
  /** k times something: x, −x, 3x, ½x (never 1x). */
  const kv = (k, s) => { k = Q(k); return k.eq(1) ? s : k.eq(-1) ? `−${s}` : `${f(k)}${s}`; };
  const tup = (a) => `(${a.map((c) => f(c)).join(", ")})`;
  const tupIn = (a) => `(${a.map(raw).join(", ")})`;
  const sum = (a) => a.reduce((s, c) => s.add(c), F(0));
  /** A list of values written as a sum: 3 − 4 + 5. */
  const sumH = (list) => list.map((c, i) => { c = Q(c); return i === 0 ? f(c) : ` ${c.n < 0 ? "−" : "+"} ${f(c.abs())}`; }).join("");
  const integ = (lo, hi) => `∫<sub>${lo}</sub><sup>${hi}</sup>`;
  const evalAtH = (lo, hi) => `<sub>${lo}</sub><sup>${hi}</sup>`;
  const pd = (fn, vr) => M.sub(V(fn), vr.split("").map(V).join(""));
  const sq2 = (b) => M.sup(b, 2);
  /** A value as a base for a power: (−2), (½), 3. */
  const base = (q) => { q = Q(q); return q.n < 0 || q.d !== 1 ? `(${f(q)})` : f(q); };
  const dot = (a, b) => a.reduce((s, c, i) => s + c * b[i], 0);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  /** √N = k√s with s square-free. */
  function surd(N) { let k = 1, s = N; for (let p = 2; p * p <= s; p++) while (s % (p * p) === 0) { s /= p * p; k *= p; } return { k, s }; }
  /** q·√s as HTML (s square-free; s = 1 means no root); `tail` (e.g. π) goes after the numerator. */
  function radH(q, s, tail = "") {
    q = Q(q);
    const mag = q.abs(), root = s === 1 ? "" : M.sqrt(n(s));
    const top = mag.n === 1 && (root || tail) ? `${root}${tail}` : `${n(mag.n)}${root}${tail}`;
    const body = mag.d === 1 ? top : M.frac(top, n(mag.d));
    return (q.n < 0 ? "−" : "") + body;
  }
  const radIn = (q, s, tail = "") => { q = Q(q); return `${q.n}${s === 1 ? "" : `*sqrt(${s})`}${tail ? `*${tail}` : ""}${q.d === 1 ? "" : `/${q.d}`}`; };
  /** Integer vectors with an integer length: [a, b, c, length]. */
  const QUADS = [[1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [2, 6, 9, 11], [6, 6, 7, 11], [3, 4, 12, 13], [2, 10, 11, 15], [2, 5, 14, 15], [1, 12, 12, 17], [8, 9, 12, 17]];
  function quadVec(r, upto) {
    const q = r.pick(QUADS.slice(0, upto));
    return { v: r.shuffle(q.slice(0, 3)).map((c) => c * r.sign()), len: q[3] };
  }
  const randVec = (r, lo, hi) => [r.int(lo, hi), r.int(lo, hi), r.int(lo, hi)];
  const isZero = (a) => a.every((c) => c === 0);

  // ---- Terms: c · x^e0 · y^e1 · … · e^(k0 x + k1 y + …) -------------------------------------------------
  // A term never has both a power of a variable and that variable in its exponential, so every partial
  // derivative of a term is again a single term.
  const term = (c, e, k) => ({ c: Q(c), e: e.slice(), k: k ? k.slice() : e.map(() => 0) });
  const isExp = (tm) => tm.k.some((c) => c !== 0);
  const deg = (tm) => tm.e.reduce((s, p) => s + p, 0);
  function tcmp(a, b) {
    if (deg(a) !== deg(b)) return deg(b) - deg(a);
    for (let i = 0; i < a.e.length; i++) if (a.e[i] !== b.e[i]) return b.e[i] - a.e[i];
    for (let i = 0; i < a.k.length; i++) if (a.k[i] !== b.k[i]) return b.k[i] - a.k[i];
    return 0;
  }
  function pnorm(terms) {
    const map = new Map();
    for (const tm of terms) {
      const key = tm.e.join(",") + "|" + tm.k.join(",");
      if (map.has(key)) map.get(key).c = map.get(key).c.add(tm.c);
      else map.set(key, term(tm.c, tm.e, tm.k));
    }
    return [...map.values()].filter((tm) => tm.c.n !== 0).sort(tcmp);
  }
  function tdiff(tm, i) {
    if (tm.k[i] !== 0) return term(tm.c.mul(tm.k[i]), tm.e, tm.k);
    if (tm.e[i] === 0) return null;
    const e = tm.e.slice(); e[i] -= 1;
    return term(tm.c.mul(tm.e[i]), e, tm.k);
  }
  const pdiff = (terms, i) => pnorm(terms.map((tm) => tdiff(tm, i)).filter(Boolean));
  const tenc = (terms) => terms.map((tm) => [fv(tm.c), ...tm.e, ...tm.k]);
  function tval(tm, pt) {
    if (isExp(tm)) throw new Error("exponential terms are not evaluated at points");
    return tm.e.reduce((acc, p, j) => acc.mul(Q(pt[j]).pow(p)), tm.c);
  }
  const peval = (terms, pt) => sum(terms.map((tm) => tval(tm, pt)));
  function linH(coefs, names) {
    let out = "";
    coefs.forEach((c, j) => { if (Q(c).n !== 0) out += M.term(c, V(names[j]), { first: out === "" }); });
    return out || "0";
  }
  function monoH(tm, names) {
    let s = tm.e.map((p, j) => pw(V(names[j]), p)).join("");
    if (isExp(tm)) s += M.sup("e", linH(tm.k, names));
    return s;
  }
  const polyH = (terms, names) => (terms.length ? terms.map((tm, i) => M.term(tm.c, monoH(tm, names), { first: i === 0 })).join("") : "0");
  /** The polynomial in the parser's syntax, for answers. */
  function polyE(terms, names) {
    if (!terms.length) return "0";
    return terms.map((tm) => {
      const parts = [`(${raw(tm.c)})`];
      tm.e.forEach((p, j) => { if (p) parts.push(p === 1 ? names[j] : `${names[j]}^${p}`); });
      if (isExp(tm)) parts.push(`exp(${tm.k.map((c, j) => (c ? `(${c})*${names[j]}` : "")).filter(Boolean).join(" + ")})`);
      return parts.join("*");
    }).join(" + ");
  }
  /** The polynomial as a person would type it: 3*x*y^2 - e^(2*y). */
  function polyIn(terms, names) {
    if (!terms.length) return "0";
    return terms.map((tm, i) => {
      const neg = tm.c.n < 0, mag = tm.c.abs();
      const fs = [];
      tm.e.forEach((p, j) => { if (p) fs.push(p === 1 ? names[j] : `${names[j]}^${p}`); });
      if (isExp(tm)) fs.push(`e^(${tm.k.map((c, j) => (c ? `${c === 1 ? "" : c === -1 ? "-" : `${c}*`}${names[j]}` : "")).filter(Boolean).join(" + ").replace(/\+ -/g, "- ")})`);
      if (!mag.eq(1) || !fs.length) fs.unshift(mag.d === 1 ? String(mag.n) : `(${mag.n}/${mag.d})`);
      const body = fs.join("*");
      return i === 0 ? (neg ? "-" : "") + body : ` ${neg ? "-" : "+"} ${body}`;
    }).join("");
  }
  /** A term with a point substituted: 3 · 2² · (−1). */
  function tsubH(tm, pt, first) {
    const parts = [];
    tm.e.forEach((p, j) => { if (p) parts.push(p === 1 ? fp(pt[j]) : M.sup(base(pt[j]), p)); });
    const mag = tm.c.abs();
    const neg = tm.c.n < 0;
    if (!mag.eq(1) || !parts.length || (neg && tval(tm, pt).n === 0)) parts.unshift(f(mag));
    const body = parts.join(" · ");
    return first ? (neg ? "−" : "") + body : ` ${neg ? "−" : "+"} ${body}`;
  }
  /** Substitute a point into a polynomial: the chain "3 · 2² − 4 · 1 = 12 − 4 = 8", its term values and total. */
  function evalAt(terms, pt) {
    if (!terms.length) return { html: "0", tv: [], total: F(0) };
    const tv = terms.map((tm) => tval(tm, pt)), total = sum(tv);
    const parts = [terms.map((tm, i) => tsubH(tm, pt, i === 0)).join("")];
    if (terms.length > 1 && sumH(tv) !== parts[0].replace(/[()]/g, "")) parts.push(sumH(tv));
    if (parts[parts.length - 1] !== f(total)) parts.push(f(total));
    return { html: parts.join(" = "), tv, total };
  }
  /** Distinct random monomials (total degree 1..maxDeg) with nonzero integer coefficients. */
  function randPoly(r, nv, count, { maxDeg = 3, cmax = 6, constant = false, mixed = true, minDeg = 1 } = {}) {
    for (;;) {
      const terms = [], seen = new Set();
      let guard = 0;
      while (terms.length < count && guard++ < 200) {
        const e = Array.from({ length: nv }, () => r.int(0, maxDeg));
        const d = e.reduce((s, p) => s + p, 0);
        if (d < minDeg || d > maxDeg || seen.has(e.join(","))) continue;
        seen.add(e.join(","));
        terms.push(term(r.nonzero(-cmax, cmax), e));
      }
      if (terms.length < count) continue;
      if (constant) terms.push(term(r.nonzero(-9, 9), Array(nv).fill(0)));
      if (mixed && !terms.some((tm) => tm.e.filter((p) => p > 0).length >= 2)) continue;
      return pnorm(terms);
    }
  }
  /** "The partial derivative of each term" lines: ∂/∂x(3x²y) = 6xy. */
  function termwise(terms, i, names) {
    return terms.map((tm) => {
      const d = tdiff(tm, i);
      return `${M.frac("∂", `∂${V(names[i])}`)}(${polyH([tm], names)}) = ${d ? polyH([d], names) : "0"}`;
    }).join("; ");
  }

  P.define("calculus3", {
    // ---- C3.1 3-D coordinates, distance and spheres ---------------------------------------------------
    "C3.space": {
      title: "Distance, midpoints and spheres",
      generate(r, level) {
        const names = ["x", "y", "z"];
        const pt = (p) => `(${p.map((c) => f(c)).join(", ")})`;
        if (level === 1) {
          const { v: d, len: D } = quadVec(r, 9);
          const A = randVec(r, -6, 6), B = A.map((a, i) => a + d[i]);
          const sq = d.map((c) => c * c), S = sq[0] + sq[1] + sq[2];
          const word = r.chance(0.5), unit = word ? " m" : "";
          return {
            prompt: word
              ? `Two drones hover at ${M.eq(`A${pt(A)} and B${pt(B)}`)} with coordinates in meters. How far apart are they, in meters?`
              : `Find the distance between the points ${M.eq(`${pt(A)} and ${pt(B)}`)}`,
            steps: [
              `The distance formula: ${V("d")} = ${M.sqrt(`${sq2(`(${x}₂ − ${x}₁)`)} + ${sq2(`(${y}₂ − ${y}₁)`)} + ${sq2(`(${z}₂ − ${z}₁)`)}`)}.`,
              `Differences: ${names.map((c, i) => `${V(c)}₂ − ${V(c)}₁ = ${n(B[i])} − ${np(A[i])} = ${n(d[i])}`).join("; ")}.`,
              `Square and add: ${d.map((c) => sq2(np(c))).join(" + ")} = ${sq.map(n).join(" + ")} = ${n(S)}.`,
              `${V("d")} = ${M.sqrt(n(S))} = ${n(D)}${unit}.`,
            ],
            answer: { kind: "number", value: D }, answerText: `${n(D)}${unit}`, answerInput: String(D),
            vals: { d, sq, S, D }, params: { A, B },
          };
        }
        if (level === 2) {
          for (;;) {
            const A = randVec(r, -7, 7), B = randVec(r, -7, 7);
            const s = A.map((a, i) => a + B[i]);
            if (A.every((a, i) => a === B[i]) || s.every((c) => c % 2 === 0)) continue;
            const C = s.map((c) => F(c, 2));
            return {
              prompt: `A sphere has a diameter with endpoints ${M.eq(`${V("P")}${pt(A)} and ${V("Q")}${pt(B)}`)} Find the center of the sphere.`,
              steps: [
                `The center of a sphere is the midpoint of every diameter, so average each coordinate: ${V("M")} = (${M.frac(`${x}₁ + ${x}₂`, "2")}, ${M.frac(`${y}₁ + ${y}₂`, "2")}, ${M.frac(`${z}₁ + ${z}₂`, "2")}).`,
                names.map((c, i) => `${V(c)}: ${M.frac(`${n(A[i])} + ${np(B[i])}`, "2")} = ${M.frac(n(s[i]), "2")}${C[i].isInt() ? ` = ${f(C[i])}` : ""}`).join("; ") + ".",
                `The center is ${pt(C)}.`,
              ],
              answer: { kind: "point", value: C.map((c) => c.value) }, answerText: pt(C), answerInput: tupIn(C),
              vals: { s, C: C.map(fv) }, params: { A, B },
            };
          }
        }
        // level 3: general form → complete the square in x, y and z → radius
        for (;;) {
          const c = randVec(r, -5, 5), rad = r.int(1, 8);
          if (c.filter((v) => v !== 0).length < 2) continue;
          const G = c.map((v) => -2 * v), J = c[0] * c[0] + c[1] * c[1] + c[2] * c[2] - rad * rad;
          const sqs = c.map((v) => v * v), r2 = rad * rad;
          const grp = (i) => (G[i] ? `(${sq2(V(names[i]))}${M.term(G[i], V(names[i]))})` : sq2(V(names[i])));
          const done = (i) => (c[i] ? sq2(`(${V(names[i])} ${c[i] > 0 ? "−" : "+"} ${n(Math.abs(c[i]))})`) : sq2(V(names[i])));
          const nz = [0, 1, 2].filter((i) => c[i] !== 0);
          const eqn = `${sq2(x)} + ${sq2(y)} + ${sq2(z)}${M.term(G[0], x)}${M.term(G[1], y)}${M.term(G[2], z)}${M.term(J, "")} = 0`;
          return {
            prompt: `Find the radius of the sphere ${M.eq(eqn)}`,
            steps: [
              `Group the terms of each variable and move the constant to the right: ${[0, 1, 2].map(grp).join(" + ")} = ${n(-J)}.`,
              `Complete each square by adding the square of half the linear coefficient: ${nz.map((i) => `${sq2(V(names[i]))}${M.term(G[i], V(names[i]))} + ${n(sqs[i])} = ${done(i)}`).join("; ")}. Add the same amounts to the right side.`,
              `${[0, 1, 2].map(done).join(" + ")} = ${n(-J)} + ${nz.map((i) => n(sqs[i])).join(" + ")} = ${n(r2)}.`,
              `The center is ${pt(c)} and ${sq2(V("r"))} = ${n(r2)}, so ${V("r")} = ${M.sqrt(n(r2))} = ${n(rad)}.`,
            ],
            answer: { kind: "number", value: rad }, answerText: n(rad), answerInput: String(rad),
            vals: { negJ: -J, sqs, r2, rad, c }, params: { G, J },
          };
        }
      },
    },

    // ---- C3.2 Dot and cross products ------------------------------------------------------------------------
    "C3.vectors": {
      title: "Dot and cross products",
      generate(r, level) {
        const U = bv("u"), W = bv("v");
        if (level === 1) {
          if (r.chance(0.35)) {
            const { v: a, len } = quadVec(r, 7);
            const sq = a.map((c) => c * c), S = sq[0] + sq[1] + sq[2];
            return {
              prompt: `Find the length ${`‖${W}‖`} of the vector ${M.eq(`${W} = ${tup(a)}`)}`,
              steps: [
                `The length is the square root of the sum of the squared components: ${`‖${W}‖`} = ${M.sqrt(a.map((c) => sq2(np(c))).join(" + "))}.`,
                `${M.sqrt(sq.map(n).join(" + "))} = ${M.sqrt(n(S))} = ${n(len)}.`,
              ],
              answer: { kind: "number", value: len }, answerText: n(len), answerInput: String(len),
              vals: { sq, S, len }, params: { a },
            };
          }
          for (;;) {
            const a = randVec(r, -6, 6), b = randVec(r, -6, 6);
            if (r.chance(0.3)) {  // a perpendicular pair now and then
              if (a[2] === 0) continue;
              const top = -(a[0] * b[0] + a[1] * b[1]);
              if (top % a[2] !== 0 || Math.abs(top / a[2]) > 9) continue;
              b[2] = top / a[2];
            }
            if (isZero(a) || isZero(b) || a.filter((c) => c).length < 2 || b.filter((c) => c).length < 2) continue;
            const prods = a.map((c, i) => c * b[i]), d = prods[0] + prods[1] + prods[2];
            return {
              prompt: `Let ${M.eq(`${U} = ${tup(a)} and ${W} = ${tup(b)}`)} Find ${U} · ${W}. What does its sign say about the angle between the vectors?`,
              steps: [
                `Multiply matching components and add: ${U} · ${W} = ${a.map((c, i) => `${np(c)} · ${np(b[i])}`).join(" + ")} = ${sumH(prods)} = ${n(d)}.`,
                `Since ${U} · ${W} = ‖${U}‖ ‖${W}‖ cos θ, the sign of the dot product is the sign of cos θ: ${d > 0 ? "positive, so the angle is acute" : d < 0 ? "negative, so the angle is obtuse" : "zero, so the vectors are perpendicular"}.`,
              ],
              answer: { kind: "number", value: d }, answerText: n(d), answerInput: String(d),
              vals: { prods, d }, params: { a, b },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const a = randVec(r, -5, 5), b = randVec(r, -5, 5), c = cross(a, b);
            if (isZero(c) || a.filter((v) => v).length < 2 || b.filter((v) => v).length < 2) continue;
            const pa = c.map((v, i) => v * a[i]), pb = c.map((v, i) => v * b[i]);
            const p = [[a[1] * b[2], a[2] * b[1]], [a[2] * b[0], a[0] * b[2]], [a[0] * b[1], a[1] * b[0]]];
            const ix = (s_) => "₁₂₃".indexOf(s_);
            const comp = (lbl, i, j, k) => `${lbl}: ${V("u")}${i}${V("v")}${j} − ${V("u")}${j}${V("v")}${i} = ${np(a[ix(i)])} · ${np(b[ix(j)])} − ${np(a[ix(j)])} · ${np(b[ix(i)])} = ${n(p[k][0])} − ${np(p[k][1])} = ${n(c[k])}`;
            return {
              prompt: `Find ${U} × ${W} for ${M.eq(`${U} = ${tup(a)} and ${W} = ${tup(b)}`)}`,
              steps: [
                `Each component is a 2 × 2 determinant from the rows ${U} and ${W}; for the middle one the order flips.`,
                comp(`First (${bv("i")})`, "₂", "₃", 0) + ".",
                comp(`Second (${bv("j")})`, "₃", "₁", 1) + ".",
                comp(`Third (${bv("k")})`, "₁", "₂", 2) + ".",
                `Check that the result is perpendicular to both: ${sumH(pa)} = 0 and ${sumH(pb)} = 0. So ${U} × ${W} = ${tup(c)}.`,
              ],
              answer: { kind: "point", value: c }, answerText: tup(c), answerInput: tupIn(c),
              vals: { p, c, pa, pb }, params: { a, b },
            };
          }
        }
        // level 3: triangle area from three points, or the volume of a parallelepiped
        if (r.chance(0.5)) {
          for (;;) {
            const A = randVec(r, -4, 4), B = randVec(r, -4, 4), C = randVec(r, -4, 4);
            const u = B.map((v, i) => v - A[i]), w = C.map((v, i) => v - A[i]), c = cross(u, w);
            if (isZero(c)) continue;
            const sq = c.map((v) => v * v), N = sq[0] + sq[1] + sq[2], { k, s } = surd(N), area = F(k, 2);
            const PQ = `${M.v("PQ")}`, PR = `${M.v("PR")}`;
            return {
              prompt: `Find the area of the triangle with vertices ${M.eq(`${V("P")}${tup(A)}, ${V("Q")}${tup(B)} and ${V("R")}${tup(C)}`)} Give an exact answer.`,
              steps: [
                `Two edge vectors from ${V("P")}: ${PQ} = ${V("Q")} − ${V("P")} = ${tup(u)} and ${PR} = ${V("R")} − ${V("P")} = ${tup(w)}.`,
                `Cross product: ${PQ} × ${PR} = (${np(u[1])} · ${np(w[2])} − ${np(u[2])} · ${np(w[1])}, ${np(u[2])} · ${np(w[0])} − ${np(u[0])} · ${np(w[2])}, ${np(u[0])} · ${np(w[1])} − ${np(u[1])} · ${np(w[0])}) = ${tup(c)}.`,
                `Its length: ${M.sqrt(c.map((v) => sq2(np(v))).join(" + "))} = ${M.sqrt(sq.map(n).join(" + "))} = ${M.sqrt(n(N))}${k > 1 ? ` = ${radH(k, s)}` : ""}. That is the area of the parallelogram on the two edges.`,
                `The triangle is half of it: ${M.frac("1", "2")} · ${radH(k, s)} = ${radH(area, s)}.`,
              ],
              answer: { kind: "number", value: area.value * Math.sqrt(s) }, answerText: radH(area, s), answerInput: radIn(area, s),
              vals: { u, w, c, sq, N, k, s, area: fv(area) }, params: { A, B, C },
            };
          }
        }
        for (;;) {
          const a = randVec(r, -3, 4), b = randVec(r, -3, 4), c = randVec(r, -3, 4);
          const bc = cross(b, c), prods = a.map((v, i) => v * bc[i]), tr = prods[0] + prods[1] + prods[2];
          if (tr === 0 || [a, b, c].some((q) => q.filter((v) => v).length < 2)) continue;
          const A = bv("a"), B = bv("b"), C = bv("c");
          return {
            prompt: `A crystal's unit cell is the parallelepiped spanned by the edge vectors ${M.eq(`${A} = ${tup(a)}, ${B} = ${tup(b)}, ${C} = ${tup(c)}`)} in ångströms (Å). Find its volume in Å³.`,
            steps: [
              `The volume is the absolute value of the scalar triple product ${A} · (${B} × ${C}).`,
              `${B} × ${C} = (${np(b[1])} · ${np(c[2])} − ${np(b[2])} · ${np(c[1])}, ${np(b[2])} · ${np(c[0])} − ${np(b[0])} · ${np(c[2])}, ${np(b[0])} · ${np(c[1])} − ${np(b[1])} · ${np(c[0])}) = ${tup(bc)}.`,
              `${A} · (${B} × ${C}) = ${a.map((v, i) => `${np(v)} · ${np(bc[i])}`).join(" + ")} = ${sumH(prods)} = ${n(tr)}.`,
              `Volume = |${n(tr)}| = ${n(Math.abs(tr))} Å³.`,
            ],
            answer: { kind: "number", value: Math.abs(tr) }, answerText: `${n(Math.abs(tr))} Å³`, answerInput: String(Math.abs(tr)),
            vals: { bc, prods, tr, vol: Math.abs(tr) }, params: { a, b, c },
          };
        }
      },
    },

    // ---- C3.3 Lines and planes ---------------------------------------------------------------------------------
    "C3.lines-planes": {
      title: "Lines and planes in space",
      generate(r, level) {
        if (level === 1) {
          // where a line crosses a coordinate plane
          for (;;) {
            const i = r.int(0, 2), P0 = randVec(r, -6, 6), d = randVec(r, -4, 4), ts = r.nonzero(-3, 3);
            if (d[i] === 0 || d.filter((c) => c).length < 2) continue;
            P0[i] = -d[i] * ts;
            const Pt = P0.map((c, j) => c + d[j] * ts), prod = d.map((c) => c * ts);
            const names = ["x", "y", "z"], plane = ["yz", "xz", "xy"][i];
            const par = (j) => `${V(names[j])} = ${P0[j] === 0 ? (d[j] === 0 ? "0" : kv(d[j], t)) : `${n(P0[j])}${M.term(d[j], t)}`}`;
            const others = [0, 1, 2].filter((j) => j !== i);
            return {
              prompt: `The line through ${M.eq(`${tup(P0)}`)} with direction ${M.eq(`${bv("v")} = ${tup(d)}`)} crosses the ${V(plane[0])}${V(plane[1])}-plane at one point. Find it.`,
              steps: [
                `Parametric equations: ${[0, 1, 2].map(par).join(", ")}.`,
                `On the ${V(plane[0])}${V(plane[1])}-plane, ${V(names[i])} = 0: ${P0[i] === 0 ? kv(d[i], t) : `${n(P0[i])}${M.term(d[i], t)}`} = 0, so ${t} = ${M.frac(n(-P0[i]), n(d[i]))} = ${n(ts)}.`,
                `Substitute ${t} = ${n(ts)}: ${others.map((j) => `${V(names[j])} = ${n(P0[j])} + ${np(d[j])} · ${np(ts)} = ${n(Pt[j])}`).join(", ")}. The point is ${tup(Pt)}.`,
              ],
              answer: { kind: "point", value: Pt }, answerText: tup(Pt), answerInput: tupIn(Pt),
              vals: { ts, prod, Pt }, params: { P0, d, i },
            };
          }
        }
        if (level === 2) {
          // distance from a point to a plane
          for (;;) {
            const { v: nn, len } = quadVec(r, 7), dd = r.int(-12, 12), A = randVec(r, -5, 5);
            const prods = nn.map((c, i) => c * A[i]), top = prods[0] + prods[1] + prods[2] - dd;
            if (top === 0) continue;
            const sq = nn.map((c) => c * c), S = sq[0] + sq[1] + sq[2], D = F(Math.abs(top), len);
            const word = r.chance(0.4), unit = word ? " m" : "";
            return {
              prompt: word
                ? `A drone hovers at ${M.eq(tup(A))} near a sloped roof that lies in the plane ${M.eq(`${linH(nn, XYZ)} = ${n(dd)}`)} (coordinates in meters). How far is the drone from the plane of the roof, in meters?`
                : `Find the distance from the point ${M.eq(tup(A))} to the plane ${M.eq(`${linH(nn, XYZ)} = ${n(dd)}`)}`,
              steps: [
                `For a plane ${V("a")}${x} + ${V("b")}${y} + ${V("c")}${z} = ${V("d")}, the distance is ${M.frac(`|${V("a")}${x}₁ + ${V("b")}${y}₁ + ${V("c")}${z}₁ − ${V("d")}|`, M.sqrt(`${sq2(V("a"))} + ${sq2(V("b"))} + ${sq2(V("c"))}`))}.`,
                `Numerator: ${nn.map((c, i) => `${np(c)} · ${np(A[i])}`).join(" + ")} − ${np(dd)} = ${sumH(prods)} − ${np(dd)} = ${n(top)}, so its absolute value is ${n(Math.abs(top))}.`,
                `Length of the normal: ${M.sqrt(nn.map((c) => sq2(np(c))).join(" + "))} = ${M.sqrt(sq.map(n).join(" + "))} = ${M.sqrt(n(S))} = ${n(len)}.`,
                `${V("D")} = ${M.frac(n(Math.abs(top)), n(len))}${D.d === len ? "" : ` = ${f(D)}`}${unit}.`,
              ],
              answer: { kind: "number", value: D.value }, answerText: `${f(D)}${unit}`, answerInput: raw(D),
              vals: { prods, top, abs: Math.abs(top), sq, S, len, D: fv(D) }, params: { nn, dd, A },
            };
          }
        }
        if (r.chance(0.5)) {
          // plane through three points, then its z-intercept
          for (;;) {
            const A = randVec(r, -4, 4), B = randVec(r, -4, 4), C = randVec(r, -4, 4);
            const u = B.map((v, i) => v - A[i]), w = C.map((v, i) => v - A[i]), c = cross(u, w);
            if (isZero(c) || c[2] === 0) continue;
            const prods = c.map((v, i) => v * A[i]), dd = prods[0] + prods[1] + prods[2], zi = F(dd, c[2]);
            return {
              prompt: `Find the plane through ${M.eq(`${V("P")}${tup(A)}, ${V("Q")}${tup(B)} and ${V("R")}${tup(C)}`)} At what height ${z} does it cross the ${z}-axis?`,
              steps: [
                `Two vectors in the plane: ${M.v("PQ")} = ${tup(u)} and ${M.v("PR")} = ${tup(w)}.`,
                `A normal is their cross product: ${bv("n")} = (${np(u[1])} · ${np(w[2])} − ${np(u[2])} · ${np(w[1])}, ${np(u[2])} · ${np(w[0])} − ${np(u[0])} · ${np(w[2])}, ${np(u[0])} · ${np(w[1])} − ${np(u[1])} · ${np(w[0])}) = ${tup(c)}.`,
                `Use ${V("P")} for the constant: ${bv("n")} · ${V("P")} = ${c.map((v, i) => `${np(v)} · ${np(A[i])}`).join(" + ")} = ${n(dd)}. The plane is ${linH(c, XYZ)} = ${n(dd)}.`,
                `On the ${z}-axis ${x} = ${y} = 0: ${kv(c[2], z)} = ${n(dd)}${c[2] === 1 ? "" : `, so ${z} = ${M.frac(n(dd), n(c[2]))}${zi.d === c[2] && zi.n === dd ? "" : ` = ${f(zi)}`}`}. It crosses at (0, 0, ${f(zi)}).`,
              ],
              answer: { kind: "number", value: zi.value }, answerText: `${z} = ${f(zi)}`, answerInput: raw(zi),
              vals: { u, w, c, prods, dd, zi: fv(zi) }, params: { A, B, C },
            };
          }
        }
        // distance from a point to a line
        for (;;) {
          const { v: d, len } = quadVec(r, 6), P0 = randVec(r, -4, 4), P1 = randVec(r, -4, 4);
          const w = P1.map((c, i) => c - P0[i]), c = cross(w, d);
          if (isZero(c)) continue;
          const sq = c.map((v) => v * v), N = sq[0] + sq[1] + sq[2], { k, s } = surd(N), D = F(k, len);
          const dsq = d.map((v) => v * v);
          return {
            prompt: `Find the distance from the point ${M.eq(`${V("P")}${tup(P1)}`)} to the line through ${M.eq(`${V("P")}₀${tup(P0)}`)} with direction ${M.eq(`${bv("v")} = ${tup(d)}`)} Give an exact answer.`,
            steps: [
              `Use ${V("D")} = ${M.frac(`‖${bv("w")} × ${bv("v")}‖`, `‖${bv("v")}‖`)} with ${bv("w")} = ${V("P")} − ${V("P")}₀ = ${tup(w)}: the parallelogram area divided by its base.`,
              `${bv("w")} × ${bv("v")} = (${np(w[1])} · ${np(d[2])} − ${np(w[2])} · ${np(d[1])}, ${np(w[2])} · ${np(d[0])} − ${np(w[0])} · ${np(d[2])}, ${np(w[0])} · ${np(d[1])} − ${np(w[1])} · ${np(d[0])}) = ${tup(c)}.`,
              `‖${bv("w")} × ${bv("v")}‖ = ${M.sqrt(sq.map(n).join(" + "))} = ${M.sqrt(n(N))}${k > 1 ? ` = ${radH(k, s)}` : ""}, and ‖${bv("v")}‖ = ${M.sqrt(dsq.map(n).join(" + "))} = ${n(len)}.`,
              `${V("D")} = ${M.frac(radH(k, s), n(len))}${D.d === len && D.n === k ? "" : ` = ${radH(D, s)}`}.`,
            ],
            answer: { kind: "number", value: D.value * Math.sqrt(s) }, answerText: radH(D, s), answerInput: radIn(D, s),
            vals: { w, c, sq, N, k, s, dsq, len, D: fv(D) }, params: { P0, P1, d },
          };
        }
      },
    },

    // ---- C3.4 Quadric surfaces ------------------------------------------------------------------------------------
    "C3.quadrics": {
      title: "Identifying quadric surfaces",
      generate(r, level) {
        const names = ["x", "y", "z"];
        const OPTS = ["Ellipsoid", "Elliptic paraboloid", "Hyperbolic paraboloid", "Hyperboloid of one sheet", "Hyperboloid of two sheets", "Elliptic cone", "Cylinder"];
        // the equation is Σ sq[i]·v_i² + Σ lin[i]·v_i = k
        function kind(sq, lin, k) {
          const S = [0, 1, 2].filter((i) => sq[i].n !== 0);
          const L = [0, 1, 2].filter((i) => sq[i].n === 0 && lin[i] !== 0);
          const A = [0, 1, 2].filter((i) => sq[i].n === 0 && lin[i] === 0);
          if (A.length) return { type: 6, axis: A[0] };
          if (L.length) return { type: sq[S[0]].n * sq[S[1]].n > 0 ? 1 : 2, axis: L[0] };
          const pos = S.filter((i) => sq[i].n > 0), neg = S.filter((i) => sq[i].n < 0);
          if (k.n === 0) return { type: 5, axis: pos.length === 1 ? pos[0] : neg[0] };
          const opp = k.n > 0 ? neg : pos;
          if (opp.length === 0) return { type: 0, axis: 2 };
          if (opp.length === 1) return { type: 3, axis: opp[0] };
          return { type: 4, axis: (k.n > 0 ? pos : neg)[0] };
        }
        function sqTerm(c, vn, first) {
          const mag = c.abs(), v2 = sq2(V(vn));
          const top = mag.n === 1 ? v2 : `${n(mag.n)}${v2}`;
          const b = mag.d === 1 ? top : M.frac(top, n(mag.d));
          return first ? (c.n < 0 ? "−" : "") + b : ` ${c.n < 0 ? "−" : "+"} ${b}`;
        }
        const side = (idx, sq) => idx.map((i, j) => sqTerm(sq[i], names[i], j === 0)).join("");
        function eqH(sq, lin, k, order) {
          const li = order.find((i) => sq[i].n === 0 && lin[i] !== 0);
          const items = order.filter((i) => sq[i].n !== 0);
          const bySign = [...items.filter((i) => sq[i].n > 0), ...items.filter((i) => sq[i].n < 0)];
          if (li !== undefined) return `${kv(-lin[li], V(names[li]))} = ${side(bySign, sq)}`;
          if (k.n === 0) {
            const pos = items.filter((i) => sq[i].n > 0), neg = items.filter((i) => sq[i].n < 0);
            const abs = sq.map((c) => c.abs());
            const [Lh, Rh] = pos.length <= neg.length ? [pos, neg] : [neg, pos];
            return `${side(Lh, abs)} = ${side(Rh, abs)}`;
          }
          return `${side(bySign, sq)} = ${f(k)}`;
        }
        function explain(kd) {
          const ax = V(names[kd.axis]);
          return [
            `All three variables are squared, and every squared term has the same sign as the constant on the right: every trace is an ellipse, so the surface is an ellipsoid.`,
            `${ax} appears only to the first power, so the surface is a paraboloid with axis along the ${ax}-axis. The two squared terms have the same sign, so cross-sections perpendicular to that axis are ellipses: an elliptic paraboloid (a bowl).`,
            `${ax} appears only to the first power, so the surface is a paraboloid with axis along the ${ax}-axis. The two squared terms have opposite signs, so cross-sections perpendicular to that axis are hyperbolas: a hyperbolic paraboloid (a saddle).`,
            `All three variables are squared and the constant side is not 0. Exactly one squared term (the ${ax} term) has the sign opposite to the constant: a hyperboloid of one sheet around the ${ax}-axis.`,
            `All three variables are squared and the constant side is not 0. Two squared terms have the sign opposite to the constant; only the ${ax} term agrees with it: a hyperboloid of two sheets opening along the ${ax}-axis.`,
            `All three variables are squared, the terms do not all have the same sign, and there is no constant: an elliptic cone with axis along the ${ax}-axis.`,
            `${ax} does not appear at all, so it is free: the curve in the other two variables is extended along the ${ax}-axis. The surface is a cylinder.`,
          ][kd.type];
        }
        const sqs = [1, 4, 9, 16, 25];
        if (level <= 2) {
          for (;;) {
            const type = r.int(0, 6);
            const [a2, b2, c2] = r.sample(sqs, 3);
            let sq, lin = [0, 0, 0], k = F(1);
            const inv = (d, s = 1) => F(s, d);
            if (type === 0) sq = [inv(a2), inv(b2), inv(c2)];
            else if (type === 1) { sq = [inv(a2), inv(b2), F(0)]; lin = [0, 0, -1]; k = F(0); }
            else if (type === 2) { const s = r.sign(); sq = [inv(a2, s), inv(b2, -s), F(0)]; lin = [0, 0, -1]; k = F(0); }
            else if (type === 3) sq = [inv(a2), inv(b2), inv(c2, -1)];
            else if (type === 4) sq = [inv(a2, -1), inv(b2, -1), inv(c2)];
            else if (type === 5) { sq = [inv(a2), inv(b2), inv(c2, -1)]; k = F(0); }
            else sq = [inv(a2), inv(b2), F(0)];
            let order = [0, 1, 2], std = [];
            const steps = [];
            if (level === 2) {
              // clear the denominators (or pick integer coefficients for a paraboloid), and turn the axis onto a random coordinate
              let s2;
              if (lin.some((c) => c)) s2 = sq.map((c) => (c.n === 0 ? F(0) : F(Math.sign(c.n) * r.int(1, 4))));
              else { const L = sq.reduce((l, c) => P.lcm(l, c.d), 1); s2 = sq.map((c) => c.mul(L)); k = k.mul(L); }
              const perm = r.shuffle([0, 1, 2]), ps = [F(0), F(0), F(0)], pl = [0, 0, 0];
              perm.forEach((to, from) => { ps[to] = s2[from]; pl[to] = lin[from]; });
              sq = ps; lin = pl; order = r.shuffle([0, 1, 2]);
              if (k.n !== 0 && !k.eq(1)) { std = sq.map((c) => fv(c.div(k))); steps.push(`Divide both sides by ${f(k)} to get a standard form: ${eqH(sq.map((c) => c.div(k)), lin, F(1), order)}.`); }
            }
            const kd = kind(sq, lin, k);
            steps.push(explain(kd));
            return {
              prompt: `Identify the surface ${M.eq(eqH(sq, lin, k, order))}`,
              steps, answer: { kind: "choice", options: OPTS, index: kd.type }, answerText: OPTS[kd.type],
              vals: { type: kd.type, axis: kd.axis, std }, params: { sq: sq.map(fv), lin, k: fv(k) },
            };
          }
        }
        // level 3: identify, then the radius of the trace in a horizontal plane z = h
        const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15]];
        const type = r.pick([0, 1, 3, 4, 5]);
        let sq, lin = [0, 0, 0], k, h, rad, work;
        const pZ = (v) => sq2(np(v));
        const xy2 = `${sq2(x)} + ${sq2(y)}`;
        if (type === 0) {
          const [a, b, c] = r.pick(TRIPLES), swap = r.chance(0.5);
          h = (swap ? a : b) * r.sign(); rad = swap ? b : a;
          sq = [F(1), F(1), F(1)]; k = F(c * c);
          work = `${xy2} + ${pZ(h)} = ${n(c * c)}, so ${xy2} = ${n(c * c)} − ${n(h * h)} = ${n(rad * rad)}`;
        } else if (type === 3) {
          const [a, b, c] = r.pick(TRIPLES), swap = r.chance(0.5);
          const A = swap ? a : b; h = (swap ? b : a) * r.sign(); rad = c;
          sq = [F(1), F(1), F(-1)]; k = F(A * A);
          work = `${xy2} − ${pZ(h)} = ${n(A * A)}, so ${xy2} = ${n(A * A)} + ${n(h * h)} = ${n(rad * rad)}`;
        } else if (type === 4) {
          const [a, b, c] = r.pick(TRIPLES), swap = r.chance(0.5);
          const A = swap ? a : b; rad = swap ? b : a; h = c * r.sign();
          sq = [F(-1), F(-1), F(1)]; k = F(A * A);
          work = `${pZ(h)} − ${sq2(x)} − ${sq2(y)} = ${n(A * A)}, so ${xy2} = ${n(h * h)} − ${n(A * A)} = ${n(rad * rad)}`;
        } else if (type === 1) {
          const c = r.pick([1, 2, 4]);
          rad = r.pick(c === 1 ? [1, 2, 3, 4, 5, 6] : c === 2 ? [2, 4, 6] : [2, 4, 6, 8]);
          h = (rad * rad) / c;
          sq = [F(1, c), F(1, c), F(0)]; lin = [0, 0, -1]; k = F(0);
          work = c === 1 ? `${n(h)} = ${xy2}` : `${n(h)} = ${M.frac(xy2, n(c))}, so ${xy2} = ${n(c)} · ${n(h)} = ${n(rad * rad)}`;
        } else {
          const m = r.pick([1, 2, 3]); h = r.nonzero(-4, 4); rad = m * Math.abs(h);
          sq = [F(1), F(1), F(-m * m)]; k = F(0);
          work = m === 1 ? `${xy2} = ${pZ(h)} = ${n(rad * rad)}` : `${xy2} = ${n(m * m)} · ${pZ(h)} = ${n(m * m)} · ${n(h * h)} = ${n(rad * rad)}`;
        }
        const kd = kind(sq, lin, k);
        return {
          prompt: `Identify the surface ${M.eq(eqH(sq, lin, k, [0, 1, 2]))} and find the radius of its trace in the plane ${M.eq(`${z} = ${n(h)}`)}`,
          steps: [
            explain(kd),
            `Set ${z} = ${n(h)}: ${work}.`,
            `That trace is a circle centered on the ${z}-axis with radius ${M.sqrt(n(rad * rad))} = ${n(rad)}.`,
          ],
          answer: { kind: "number", value: rad }, answerText: n(rad), answerInput: String(rad),
          vals: { type: kd.type, axis: kd.axis, hh: h * h, r2: rad * rad, rad }, params: { sq: sq.map(fv), lin, k: fv(k), h },
        };
      },
    },

    // ---- C3.5 Vector-valued functions and motion ----------------------------------------------------------------
    "C3.vvf": {
      title: "Velocity, acceleration and projectile motion",
      generate(r, level) {
        const T1 = ["t"], R = bv("r"), comps = ["x", "y", "z"];
        const vecH = (cs) => `(${cs.map((c) => polyH(c, T1)).join(", ")})`;
        if (level === 1) {
          for (;;) {
            const cs = [3, 3, 2].map((d) => randPoly(r, 1, r.int(1, 2), { maxDeg: d, cmax: 5, mixed: false, constant: r.chance(0.3) }));
            const acc = r.chance(0.4), t0 = r.int(-2, 3);
            const d1 = cs.map((c) => pdiff(c, 0)), d2 = d1.map((c) => pdiff(c, 0));
            const use = acc ? d2 : d1, mark = acc ? "″" : "′";
            if (use.filter((c) => c.length).length < 2) continue;
            const ev = use.map((c) => evalAt(c, [t0])), val = ev.map((e) => e.total);
            const steps = [`Differentiate each component: ${R}′(${t}) = ${vecH(d1)}.`];
            if (acc) steps.push(`Differentiate again: ${R}″(${t}) = ${vecH(d2)}.`);
            steps.push(`At ${t} = ${n(t0)}: ${ev.map((e, i) => `${V(comps[i])}${mark}(${n(t0)}) = ${e.html}`).join("; ")}. So ${bv(acc ? "a" : "v")}(${n(t0)}) = ${tup(val)}.`);
            return {
              prompt: `A particle moves along ${M.eq(`${R}(${t}) = ${vecH(cs)}`)} Find its ${acc ? "acceleration" : "velocity"} vector at ${t} = ${n(t0)}.`,
              steps, answer: { kind: "point", value: val.map((q) => q.value) }, answerText: tup(val), answerInput: tupIn(val),
              vals: { d1: d1.map(tenc), d2: d2.map(tenc), tv: ev.map((e) => e.tv.map(fv)), val: val.map(fv) },
              params: { cs: cs.map(tenc), t0, acc: acc ? 1 : 0 },
            };
          }
        }
        if (level === 2) {
          const cs = [0, 1, 2].map(() => randPoly(r, 1, r.int(1, 2), { maxDeg: 2, cmax: 6, mixed: false, constant: r.chance(0.5) }));
          const b = r.int(1, 3);
          const anti = cs.map((c) => pnorm(c.map((tm) => term(tm.c.div(tm.e[0] + 1), [tm.e[0] + 1]))));
          const ev = anti.map((a) => evalAt(a, [b])), val = ev.map((e) => e.total);
          const paren = (c) => (c.length > 1 ? `(${polyH(c, T1)})` : polyH(c, T1));
          return {
            prompt: `Evaluate ${M.eq(`${integ("0", n(b))} ${R}(${t}) d${t}, where ${R}(${t}) = ${vecH(cs)}`)}`,
            steps: [
              `Integrate component by component. Each antiderivative below is 0 at ${t} = 0, so only the upper limit counts.`,
              `Antiderivatives: ${cs.map((c, i) => `∫ ${paren(c)} d${t} = ${polyH(anti[i], T1)}`).join("; ")}.`,
              `At ${t} = ${n(b)}: ${ev.map((e, i) => `${V(comps[i])}: ${e.html}`).join("; ")}.`,
              `So the integral is the vector ${tup(val)}.`,
            ],
            answer: { kind: "point", value: val.map((q) => q.value) }, answerText: tup(val), answerInput: tupIn(val),
            vals: { anti: anti.map(tenc), tv: ev.map((e) => e.tv.map(fv)), val: val.map(fv) }, params: { cs: cs.map(tenc), b },
          };
        }
        // level 3: projectile motion with g = 9.8 m/s²
        const k = r.int(1, 4), vx = r.int(5, 30), top = r.chance(0.5), h = top ? r.pick([0, r.int(1, 20)]) : 0;
        const vy = F(98 * k, 10), A = vy.mul(k), B = F(49, 10).mul(k * k);
        const vel = `${bv("v")}(0) = (${n(vx)}, ${dec(vy)})`;
        const s1 = `Integrate ${bv("a")}(${t}) = (0, −9.8): ${bv("v")}(${t}) = (0, −9.8${t}) + ${bv("v")}(0) = (${n(vx)}, ${dec(vy)} − 9.8${t}).`;
        const s2 = `Integrate again: ${R}(${t}) = (${n(vx)}${t}, ${dec(vy)}${t} − 4.9${sq2(t)}) + ${R}(0) = (${n(vx)}${t}, ${h ? `${n(h)} + ` : ""}${dec(vy)}${t} − 4.9${sq2(t)}).`;
        if (top) {
          const yTop = A.sub(B).add(h);
          return {
            prompt: `A ball is thrown ${h ? `from a height of ${n(h)} m` : "from the ground"} with initial velocity ${M.eq(`${vel} m/s`)} (horizontal, vertical). Gravity gives ${bv("a")}(${t}) = (0, −9.8) m/s². What is the ball's maximum height, in meters?`,
            steps: [s1, s2,
              `At the top the vertical velocity is 0: ${dec(vy)} − 9.8${t} = 0, so ${t} = ${M.frac(dec(vy), "9.8")} = ${n(k)} s.`,
              `Height then: ${h ? `${n(h)} + ` : ""}${dec(vy)} · ${n(k)} − 4.9 · ${sq2(n(k))} = ${h ? `${n(h)} + ` : ""}${dec(A)} − ${dec(B)} = ${dec(yTop)} m.`],
            answer: { kind: "number", value: yTop.value }, answerText: `${dec(yTop)} m`, answerInput: decIn(yTop),
            vals: { k, A: fv(A), B: fv(B), yTop: fv(yTop) }, params: { vx, vy: vy.value, h, top: 1 }, consts: [9.8, 4.9],
          };
        }
        const tl = 2 * k, range = vx * tl;
        return {
          prompt: `A ball is kicked from the ground with initial velocity ${M.eq(`${vel} m/s`)} (horizontal, vertical). Gravity gives ${bv("a")}(${t}) = (0, −9.8) m/s². How far away does it land, in meters?`,
          steps: [s1, s2,
            `It lands when the height is 0 again: ${t}(${dec(vy)} − 4.9${t}) = 0, so ${t} = 0 (the kick) or ${t} = ${M.frac(dec(vy), "4.9")} = ${n(tl)} s.`,
            `Horizontal distance then: ${n(vx)} · ${n(tl)} = ${n(range)} m.`],
          answer: { kind: "number", value: range }, answerText: `${n(range)} m`, answerInput: String(range),
          vals: { tl, range }, params: { vx, vy: vy.value, h, top: 0 }, consts: [9.8, 4.9],
        };
      },
    },

    // ---- C3.6 Arc length and curvature --------------------------------------------------------------------------
    "C3.curvature": {
      title: "Arc length and curvature",
      generate(r, level) {
        const R = bv("r");
        const sin2 = `${M.sup("sin", 2)} ${t}`, cos2 = `${M.sup("cos", 2)} ${t}`;
        if (level === 1) {
          const [a, c, s] = r.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]]);
          const turns = r.int(1, 3), T = 2 * turns, L = s * T, word = r.chance(0.5), unit = word ? " cm" : "";
          const curve = `${R}(${t}) = (${n(a)} cos ${t}, ${n(a)} sin ${t}, ${n(c)}${t})`;
          return {
            prompt: word
              ? `A spring's wire follows the helix ${M.eq(curve)} for 0 ≤ ${t} ≤ ${n(T)}π (${n(turns)} full turn${turns > 1 ? "s" : ""}), in centimeters. How long is the wire, in cm?`
              : `Find the arc length of the helix ${M.eq(curve)} for 0 ≤ ${t} ≤ ${n(T)}π.`,
            steps: [
              `Velocity: ${R}′(${t}) = (−${n(a)} sin ${t}, ${n(a)} cos ${t}, ${n(c)}).`,
              `Speed: ‖${R}′(${t})‖ = ${M.sqrt(`${n(a * a)} ${sin2} + ${n(a * a)} ${cos2} + ${n(c * c)}`)} = ${M.sqrt(`${n(a * a)} + ${n(c * c)}`)} = ${M.sqrt(n(a * a + c * c))} = ${n(s)}, since ${sin2} + ${cos2} = 1. The speed is constant.`,
              `Arc length = ${integ("0", `${n(T)}π`)} ${n(s)} d${t} = ${n(s)} · ${n(T)}π = ${n(L)}π${unit}.`,
            ],
            answer: { kind: "number", value: L * Math.PI }, answerText: `${n(L)}π${unit}`, answerInput: `${L}pi`,
            vals: { a2: a * a, c2: c * c, S: a * a + c * c, s, T, L }, params: { a, c, turns },
          };
        }
        if (level === 2) {
          for (;;) {
            const cubic = r.chance(0.4), a = r.nonzero(-2, 2), x0 = r.int(-2, 2), m = r.int(-3, 3), c = r.int(-4, 4);
            if (cubic && x0 === 0) continue;
            const b = cubic ? m - 3 * a * x0 * x0 : m - 2 * a * x0;
            const terms = pnorm([term(a, [cubic ? 3 : 2]), term(b, [1]), term(c, [0])]);
            const d1 = pdiff(terms, 0), d2 = pdiff(d1, 0), e1 = evalAt(d1, [x0]), e2 = evalAt(d2, [x0]);
            const fpp = e2.total.n, A = Math.abs(fpp), y0 = peval(terms, [x0]);
            if (A === 0 || Math.abs(y0.value) > 12) continue;
            const q = 1 + m * m, g = P.gcd(A, q), num = A / g, den = q / g, kappa = A / (q * Math.sqrt(q));
            const fx = V("f");
            const res = q === 1 ? n(A) : M.frac(n(num), `${den === 1 ? "" : n(den)}${M.sqrt(n(q))}`);
            const steps = [
              `${fx}′(${x}) = ${polyH(d1, XY)} and ${fx}″(${x}) = ${polyH(d2, XY)}.`,
              `At ${x} = ${n(x0)}: ${fx}′(${n(x0)}) = ${e1.html} and ${fx}″(${n(x0)}) = ${e2.html}.`,
            ];
            if (q === 1) steps.push(`The curve is flat there (${fx}′ = 0), so ${V("κ")} = ${M.frac(`|${fx}″|`, M.sup(`(1 + ${sq2(`${fx}′`)})`, "3/2"))} = |${fx}″(${n(x0)})| = ${n(A)}.`);
            else {
              steps.push(`${V("κ")} = ${M.frac(`|${fx}″|`, M.sup(`(1 + ${sq2(`${fx}′`)})`, "3/2"))} = ${M.frac(n(A), M.sup(`(1 + ${sq2(np(m))})`, "3/2"))} = ${M.frac(n(A), M.sup(n(q), "3/2"))} = ${M.frac(n(A), `${n(q)}${M.sqrt(n(q))}`)}${g > 1 ? ` = ${res}` : ""}.`);
              steps.push(`${V("κ")} ≈ ${n(kappa)}; the radius of the best-fitting circle there is 1/${V("κ")} ≈ ${n(1 / kappa, { dp: 2 })}.`);
            }
            return {
              prompt: `Find the curvature of ${M.eq(`${y} = ${polyH(terms, XY)}`)} at the point where ${x} = ${n(x0)}. Give an exact answer.`,
              graph: graph({ view: [x0 - 4, x0 + 4, y0.value - 8, y0.value + 8], items: [{ t: "fn", e: polyE(terms, XY) }, { t: "pt", x: x0, y: y0.value }] }),
              steps, answer: { kind: "number", value: kappa }, answerText: res,
              answerInput: q === 1 ? String(A) : `${num}/(${den}*sqrt(${q}))`,
              vals: { d1: tenc(d1), d2: tenc(d2), tv1: e1.tv.map(fv), tv2: e2.tv.map(fv), m, fpp, A, q, num, den, radius: 1 / kappa },
              params: { f: tenc(terms), x0 }, consts: [3],
            };
          }
        }
        // level 3: curvature of a helix by the cross-product formula (word problem)
        const a = r.int(1, 4), c = r.int(1, 4), q = a * a + c * c, kap = F(a, q), rc = F(q, a);
        const ks = (k, fn) => (k === 1 ? `${fn} ${t}` : k === -1 ? `−${fn} ${t}` : `${n(k)} ${fn} ${t}`);
        return {
          prompt: `A spiral staircase's handrail follows ${M.eq(`${R}(${t}) = (${ks(a, "cos")}, ${ks(a, "sin")}, ${kv(c, t)})`)} in meters. Find its curvature, in 1/m.`,
          steps: [
            `${R}′(${t}) = (${ks(-a, "sin")}, ${ks(a, "cos")}, ${n(c)}) and ${R}″(${t}) = (${ks(-a, "cos")}, ${ks(-a, "sin")}, 0).`,
            `Cross product: ${R}′ × ${R}″ = (${ks(c * a, "sin")}, ${ks(-c * a, "cos")}, ${n(a * a)} ${M.sup("sin", 2)} ${t} + ${n(a * a)} ${M.sup("cos", 2)} ${t}) = (${ks(c * a, "sin")}, ${ks(-c * a, "cos")}, ${n(a * a)}).`,
            `‖${R}′ × ${R}″‖ = ${M.sqrt(`${n(c * a * c * a)} + ${M.sup(n(a * a), 2)}`)} = ${M.sqrt(n(c * c * a * a + a ** 4))} = ${kv(a, M.sqrt(n(q)))}, and ‖${R}′‖ = ${M.sqrt(`${n(a * a)} + ${n(c * c)}`)} = ${M.sqrt(n(q))}.`,
            `${V("κ")} = ${M.frac(`‖${R}′ × ${R}″‖`, M.sup(`‖${R}′‖`, 3))} = ${M.frac(kv(a, M.sqrt(n(q))), `${n(q)}${M.sqrt(n(q))}`)} = ${f(kap)} per meter. The handrail bends like a circle of radius ${f(rc)} m.`,
          ],
          answer: { kind: "number", value: kap.value }, answerText: `${f(kap)} per meter`, answerInput: raw(kap),
          vals: { ca: c * a, a2: a * a, c2: c * c, ca2: c * c * a * a, a4: a ** 4, S: c * c * a * a + a ** 4, q, kap: fv(kap), rc: fv(rc) },
          params: { a, c }, consts: [3],
        };
      },
    },

    // ---- C3.7 Functions of several variables and level curves --------------------------------------------------------
    "C3.functions": {
      title: "Level curves",
      generate(r, level) {
        const fxy = `${V("f")}(${x}, ${y})`;
        if (level === 1) {
          const fp_ = randPoly(r, 2, r.int(2, 3), { maxDeg: 2, cmax: 5, constant: r.chance(0.4), mixed: false });
          const pt = [r.int(-3, 3), r.int(-3, 3)], e = evalAt(fp_, pt);
          return {
            prompt: `Let ${M.eq(`${fxy} = ${polyH(fp_, XY)}`)} Which level curve ${fxy} = ${V("c")} passes through the point (${n(pt[0])}, ${n(pt[1])})? Find ${V("c")}.`,
            steps: [
              `A level curve is the set of points where ${V("f")} has one constant value, so ${V("c")} is the value of ${V("f")} at the point.`,
              `${V("f")}(${n(pt[0])}, ${n(pt[1])}) = ${e.html}.`,
              `The point lies on the level curve ${fxy} = ${f(e.total)}.`,
            ],
            answer: { kind: "number", value: e.total.value }, answerText: `${V("c")} = ${f(e.total)}`, answerInput: raw(e.total),
            vals: { tv: e.tv.map(fv), c: fv(e.total) }, params: { f: tenc(fp_), pt },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const d = r.int(-5, 5), R0 = r.int(1, 5);
            const terms = pnorm([term(1, [2, 0]), term(1, [0, 2]), term(d, [0, 0])]), e = evalAt(terms, [R0, 0]);
            const items = [1, 2, 3, 4, 5].map((rr) => ({ t: "circle", c: [0, 0], r: rr, role: rr === R0 ? "highlight" : "muted" }));
            return {
              prompt: `The graph shows level curves of ${M.eq(`${fxy} = ${polyH(terms, XY)}`)} The highlighted curve is the level curve ${fxy} = ${V("c")}. Find ${V("c")}.`,
              graph: graph({ view: [-6, 6, -6, 6], equal: true, items }),
              steps: [
                `The highlighted curve is the circle centered at the origin that crosses the ${x}-axis at (${n(R0)}, 0).`,
                `${V("f")} has the same value at every point of a level curve, so use (${n(R0)}, 0): ${V("f")}(${n(R0)}, 0) = ${e.html}.`,
                `So ${V("c")} = ${f(e.total)}.`,
              ],
              answer: { kind: "number", value: e.total.value }, answerText: `${V("c")} = ${f(e.total)}`, answerInput: raw(e.total),
              vals: { tv: e.tv.map(fv), c: fv(e.total) }, params: { f: tenc(terms), R0 },
            };
          }
          const a = r.pick([F(1), F(-1), F(1, 2), F(-1, 2)]), d = r.int(-3, 3);
          const verts = r.pick([[-4, -2, 0, 2, 4], [-3, -1, 1, 3, 5], [-5, -3, -1, 1, 3]]), v0 = r.pick(verts);
          const terms = pnorm([term(a.neg(), [2, 0]), term(1, [0, 1]), term(d, [0, 0])]), e = evalAt(terms, [0, v0]);
          const items = verts.map((vv) => ({ t: "fn", e: `(${raw(a)})*x^2 + (${vv})`, role: vv === v0 ? "highlight" : "muted" }));
          return {
            prompt: `The graph shows level curves of ${M.eq(`${fxy} = ${polyH(terms, XY)}`)} The highlighted curve is the level curve ${fxy} = ${V("c")}. Find ${V("c")}.`,
            graph: graph({ view: [-6, 6, -6, 6], equal: true, items }),
            steps: [
              `Each level curve ${fxy} = ${V("c")} is a parabola. The highlighted one passes through the grid point (0, ${n(v0)}), its vertex.`,
              `${V("f")} has the same value at every point of a level curve, so use that point: ${V("f")}(0, ${n(v0)}) = ${e.html}.`,
              `So ${V("c")} = ${f(e.total)}.`,
            ],
            answer: { kind: "number", value: e.total.value }, answerText: `${V("c")} = ${f(e.total)}`, answerInput: raw(e.total),
            vals: { tv: e.tv.map(fv), c: fv(e.total) }, params: { f: tenc(terms), v0, a: fv(a) },
          };
        }
        // level 3: an isotherm on a plate (word problem)
        for (;;) {
          const a = r.int(1, 4), b = r.intExcept(1, 4, a), x0 = r.int(1, 6), y0 = r.int(1, 6);
          const A = a * x0 * x0, B = b * y0 * y0, K = A + B;
          if (K % a) continue;
          const p2 = K / a, p = Math.round(Math.sqrt(p2));
          if (p * p !== p2 || p === x0) continue;
          const T0 = r.int(40, 90), Tc = T0 - K;
          if (Tc < -10) continue;
          const T = `${V("T")}(${x}, ${y}) = ${n(T0)}${M.term(-a, sq2(x))}${M.term(-b, sq2(y))}`;
          return {
            prompt: `The temperature on a metal plate is ${M.eq(`${T} °C`)} with ${x} and ${y} in cm. An ant at (${n(x0)}, ${n(y0)}) walks along the isotherm (the level curve of ${V("T")}) through its position. At what distance from the origin does its path cross the positive ${x}-axis, in cm?`,
            steps: [
              `The ant's temperature: ${V("T")}(${n(x0)}, ${n(y0)}) = ${n(T0)} − ${a === 1 ? "" : `${n(a)} · `}${sq2(n(x0))} − ${b === 1 ? "" : `${n(b)} · `}${sq2(n(y0))} = ${n(T0)} − ${n(A)} − ${n(B)} = ${n(Tc)} °C.`,
              `The isotherm is ${V("T")}(${x}, ${y}) = ${n(Tc)}: ${n(T0)}${M.term(-a, sq2(x))}${M.term(-b, sq2(y))} = ${n(Tc)}, so ${kv(a, sq2(x))} + ${kv(b, sq2(y))} = ${n(T0)} − ${np(Tc)} = ${n(K)}, an ellipse.`,
              `On the ${x}-axis ${y} = 0: ${kv(a, sq2(x))} = ${n(K)}${a === 1 ? "" : `, so ${sq2(x)} = ${n(p2)}`}, and ${x} = ${n(p)} cm.`,
            ],
            answer: { kind: "number", value: p }, answerText: `${n(p)} cm`, answerInput: String(p),
            vals: { A, B, Tc, K, p2, p }, params: { T0, a, b, x0, y0 },
          };
        }
      },
    },

    // ---- C3.8 Limits in several variables ----------------------------------------------------------------------------
    "C3.limits": {
      title: "Limits and continuity in two variables",
      generate(r, level) {
        const lim = (a, b) => M.sub("lim", `(${x}, ${y}) → (${n(a)}, ${n(b)})`);
        if (level === 1) {
          for (;;) {
            const num = randPoly(r, 2, 2, { maxDeg: 2, cmax: 5, mixed: false, constant: r.chance(0.5) });
            const den = pnorm([term(r.nonzero(-3, 3), [1, 0]), term(r.nonzero(-3, 3), [0, 1]), term(r.int(-5, 5), [0, 0])]);
            const pt = [r.int(-3, 3), r.int(-3, 3)], en = evalAt(num, pt), ed = evalAt(den, pt);
            if (ed.total.n === 0) continue;
            const L = en.total.div(ed.total);
            return {
              prompt: `Find ${M.eq(`${lim(pt[0], pt[1])} ${M.frac(polyH(num, XY), polyH(den, XY))}`)}`,
              steps: [
                `Denominator at the point: ${ed.html}, which is not 0. A quotient of polynomials is continuous wherever its denominator is not 0, so the limit is the value there.`,
                `Numerator at the point: ${en.html}.`,
                `The limit is ${ed.total.eq(1) ? f(en.total) : `${M.frac(f(en.total), f(ed.total))}${L.n === en.total.n && L.d === ed.total.n ? "" : ` = ${f(L)}`}`}.`,
              ],
              answer: { kind: "number", value: L.value }, answerText: f(L), answerInput: raw(L),
              vals: { tvn: en.tv.map(fv), tvd: ed.tv.map(fv), N: fv(en.total), D: fv(ed.total), L: fv(L) }, params: { num: tenc(num), den: tenc(den), pt },
            };
          }
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const k = r.int(1, 3), b0 = r.nonzero(-4, 4), a0 = k * b0, pt = [a0, b0];
            const num = pnorm([term(1, [2, 0]), term(-k * k, [0, 2])]), den = pnorm([term(1, [1, 0]), term(-k, [0, 1])]);
            const lin = pnorm([term(1, [1, 0]), term(k, [0, 1])]);
            const en = evalAt(num, pt), ed = evalAt(den, pt), el = evalAt(lin, pt);
            return {
              prompt: `Find ${M.eq(`${lim(a0, b0)} ${M.frac(polyH(num, XY), polyH(den, XY))}`)}`,
              steps: [
                `Direct substitution gives 0/0: the numerator is ${en.html} and the denominator is ${ed.html}. Simplify first.`,
                `Factor the difference of squares: ${polyH(num, XY)} = (${polyH(den, XY)})(${polyH(lin, XY)}). Off the line ${x} = ${kv(k, y)} the factor ${polyH(den, XY)} is not 0 and cancels, leaving ${polyH(lin, XY)}.`,
                `${polyH(lin, XY)} is continuous, so substitute: ${el.html}.`,
              ],
              answer: { kind: "number", value: el.total.value }, answerText: f(el.total), answerInput: raw(el.total),
              vals: { tvn: en.tv.map(fv), tvd: ed.tv.map(fv), tvl: el.tv.map(fv), L: fv(el.total), kk: k * k }, params: { fam: 0, k, a0, b0 },
            };
          }
          const a = r.nonzero(-4, 4), bb = r.nonzero(-4, 4), y0 = r.int(-4, 4), pt = [bb, y0];
          const num = pnorm([term(1, [1, 1]), term(a, [1, 0]), term(-bb, [0, 1]), term(-a * bb, [0, 0])]);
          const den = pnorm([term(1, [1, 0]), term(-bb, [0, 0])]);
          const en = evalAt(num, pt), ed = evalAt(den, pt), L = y0 + a;
          const ya = `(${y}${M.term(a, "")})`;
          return {
            prompt: `Find ${M.eq(`${lim(bb, y0)} ${M.frac(polyH(num, XY), polyH(den, XY))}`)}`,
            steps: [
              `Direct substitution gives 0/0: the numerator is ${en.html} and the denominator is ${ed.html}. Simplify first.`,
              `Factor the numerator by grouping: ${x}${ya}${M.term(-bb, ya)} = (${polyH(den, XY)})${ya}. Off the line ${x} = ${n(bb)} the factor ${polyH(den, XY)} is not 0 and cancels, leaving ${y}${M.term(a, "")}.`,
              `${y}${M.term(a, "")} is continuous, so substitute: ${n(y0)} + ${np(a)} = ${n(L)}.`,
            ],
            answer: { kind: "number", value: L }, answerText: n(L), answerInput: String(L),
            vals: { tvn: en.tv.map(fv), tvd: ed.tv.map(fv), L }, params: { fam: 1, a, bb, y0 },
          };
        }
        // level 3: does the limit at the origin exist?
        const fam = r.int(0, 5), a = r.nonzero(-4, 4), k = fam === 1 ? r.int(1, 3) : 0;
        const c = fam >= 3 && r.chance(0.5) ? r.nonzero(-5, 5) : 0;
        const x2 = sq2(x), y2 = sq2(y), cs = (s) => (c ? `${n(c)} + ${s}` : s);
        let fH, steps, L, exists;
        const cth = `cos ${V("θ")}`, sth = `sin ${V("θ")}`, rr = V("r");
        if (fam === 0) {
          L = F(a, 2); exists = false;
          fH = M.frac(kv(a, `${x}${y}`), `${x2} + ${y2}`);
          steps = [
            `Along the ${x}-axis (${y} = 0): ${V("f")}(${x}, 0) = ${M.frac("0", x2)} = 0 for ${x} ≠ 0, so ${V("f")} → 0.`,
            `Along the line ${y} = ${x}: ${V("f")}(${x}, ${x}) = ${M.frac(kv(a, x2), `2${x2}`)} = ${f(L)} for ${x} ≠ 0, so ${V("f")} → ${f(L)}.`,
            `Two paths give different values, 0 and ${f(L)}, so the limit does not exist.`,
          ];
        } else if (fam === 1) {
          L = F(1); exists = false;
          fH = M.frac(`${x2} − ${kv(k, y2)}`, `${x2} + ${kv(k, y2)}`);
          steps = [
            `Along the ${x}-axis (${y} = 0): ${V("f")} = ${M.frac(x2, x2)} = 1.`,
            `Along the ${y}-axis (${x} = 0): ${V("f")} = ${M.frac(`−${kv(k, y2)}`, kv(k, y2))} = −1.`,
            `Two paths give different values, 1 and −1, so the limit does not exist.`,
          ];
        } else if (fam === 2) {
          L = F(a, 2); exists = false;
          const m = V("m");
          fH = M.frac(kv(a, `${x2}${y}`), `${M.sup(x, 4)} + ${y2}`);
          steps = [
            `Along any line ${y} = ${m}${x}: ${V("f")} = ${M.frac(kv(a, `${m}${M.sup(x, 3)}`), `${M.sup(x, 4)} + ${sq2(m)}${x2}`)} = ${M.frac(kv(a, `${m}${x}`), `${x2} + ${sq2(m)}`)} → 0 as ${x} → 0, and along the ${y}-axis ${V("f")} = 0. Every straight line gives 0.`,
            `Along the parabola ${y} = ${x2}: ${V("f")}(${x}, ${x2}) = ${M.frac(kv(a, M.sup(x, 4)), `${M.sup(x, 4)} + ${M.sup(x, 4)}`)} = ${f(L)}.`,
            `The parabola gives ${f(L)}, not 0, so the limit does not exist.`,
          ];
        } else {
          exists = true; L = c ? F(c) : F(a);
          const numH = [kv(a, `${x2}${y}`), kv(a, `${x}${y2}`), kv(a, M.sup(x, 3))][fam - 3];
          const polar = [`${M.sup("cos", 2)} ${V("θ")} ${sth}`, `${cth} ${M.sup("sin", 2)} ${V("θ")}`, `${M.sup("cos", 3)} ${V("θ")}`][fam - 3];
          const fc = c ? `${V("f")} − ${np(c)}` : V("f");
          fH = cs(M.frac(numH, `${x2} + ${y2}`));
          steps = [
            `Along either axis ${V("f")} → ${n(c)}. That suggests the limit ${n(c)}, but no number of paths can prove a limit exists.`,
            `Use polar coordinates ${x} = ${rr} ${cth}, ${y} = ${rr} ${sth}, so ${x2} + ${y2} = ${sq2(rr)}: ${fc} = ${M.frac(kv(a, `${M.sup(rr, 3)} ${polar}`), sq2(rr))} = ${kv(a, `${rr} ${polar}`)}.`,
            `Since |${cth}| ≤ 1 and |${sth}| ≤ 1, |${fc}| ≤ ${n(Math.abs(a))}${rr}, which goes to 0 as ${rr} → 0. By the squeeze theorem the limit is ${n(c)}.`,
          ];
        }
        const base_ = [`The limit is 0`, `The limit is ${f(L)}`, `The limit does not exist`];
        const correct = !exists ? 2 : c === 0 ? 0 : 1;
        const order = r.shuffle([0, 1, 2]), options = order.map((i) => base_[i]);
        return {
          prompt: `Let ${M.eq(`${V("f")}(${x}, ${y}) = ${fH}`)} Find ${lim(0, 0)} ${V("f")}(${x}, ${y}), or decide that it does not exist.`,
          steps, answer: { kind: "choice", options, index: order.indexOf(correct) }, answerText: base_[correct],
          vals: { L: fv(L), correct }, params: { fam, a, k, c, order }, consts: [3, 4],
        };
      },
    },

    // ---- C3.9 Partial derivatives ---------------------------------------------------------------------------------------
    "V.1": {
      title: "Partial derivatives",
      generate(r, level) {
        const fname = V("f");
        if (level <= 2) {
          let terms, i, intro;
          if (level === 1) {
            for (;;) {
              terms = randPoly(r, 2, 3, { maxDeg: 3, cmax: 7, constant: r.chance(0.3) });
              i = r.int(0, 1);
              if (pdiff(terms, i).length >= 2) break;
            }
            intro = `To find ${pd("f", XY[i])}, treat ${V(XY[1 - i])} as a constant and differentiate each term with respect to ${V(XY[i])}.`;
          } else {
            const ev = r.int(0, 1), ov = 1 - ev, kk = r.nonzero(-3, 3);
            const eA = [0, 0], kA = [0, 0]; eA[ov] = r.int(1, 3); kA[ev] = kk;
            terms = pnorm([term(r.nonzero(-5, 5), eA, kA), term(r.nonzero(-6, 6), [r.int(1, 3), r.int(1, 3)])]);
            i = r.int(0, 1);
            const eH = M.sup("e", linH(kA, XY));
            intro = `To find ${pd("f", XY[i])}, treat ${V(XY[1 - i])} as a constant. ` + (i === ev
              ? `The exponential needs the chain rule: ${M.frac("∂", `∂${V(XY[i])}`)} ${eH} = ${kv(kk, eH)}.`
              : `The factor ${eH} contains no ${V(XY[i])}, so it is a constant multiplier.`);
          }
          const d = pdiff(terms, i);
          return {
            prompt: `Find ${M.eq(`${pd("f", XY[i])} for ${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)}`,
            steps: [intro, `Term by term: ${termwise(terms, i, XY)}.`, `${pd("f", XY[i])} = ${polyH(d, XY)}.`],
            answer: { kind: "expr", expr: polyE(d, XY), vars: XY }, answerText: polyH(d, XY), answerInput: polyIn(d, XY),
            vals: { d: tenc(d) }, params: { f: tenc(terms), i },
          };
        }
        // level 3: rates of change in a measured quantity
        const shape = r.pick(["cyl", "cone", "plate"]);
        if (shape !== "plate") {
          const r0 = r.int(2, 9), h0 = r.int(3, 15), wrt = r.pick(["r", "h"]);
          const c = shape === "cyl" ? F(1) : F(1, 3), rr = V("r"), hh = V("h");
          const K = wrt === "r" ? c.mul(2 * r0 * h0) : c.mul(r0 * r0), approx = K.value * Math.PI;
          const coef = (q) => (q.eq(1) ? "" : f(q));
          const Vf = `${V("V")} = ${coef(c)}π${sq2(rr)}${hh}`;
          const what = shape === "cyl" ? "cylindrical tank" : "conical pile of sand";
          const dV = M.frac(`∂${V("V")}`, `∂${wrt === "r" ? rr : hh}`);
          const steps = wrt === "r"
            ? [`Hold ${hh} fixed and differentiate ${Vf} with respect to ${rr}: ${dV} = ${coef(c)}π${hh} · 2${rr} = ${coef(c.mul(2))}π${rr}${hh}.`,
              `At ${rr} = ${n(r0)}, ${hh} = ${n(h0)}: ${coef(c.mul(2))}π · ${n(r0)} · ${n(h0)} = ${f(K)}π ≈ ${n(approx, { dp: 2 })} cm³ per cm. With the height held at ${n(h0)} cm, each extra centimeter of radius adds about that much volume.`]
            : [`Hold ${rr} fixed and differentiate ${Vf} with respect to ${hh}: ${dV} = ${coef(c)}π${sq2(rr)}.`,
              `At ${rr} = ${n(r0)}: ${coef(c)}π · ${sq2(n(r0))} = ${f(K)}π ≈ ${n(approx, { dp: 2 })} cm³ per cm. With the radius held at ${n(r0)} cm, each extra centimeter of height adds about that much volume.`];
          return {
            prompt: `The volume of a ${what} is ${M.eq(Vf)} with ${rr} and ${hh} in cm. Find ${dV} when ${rr} = ${n(r0)} cm and ${hh} = ${n(h0)} cm, in cm³ per cm. Give the exact value in terms of π.`,
            steps, answer: { kind: "number", value: approx }, answerText: `${f(K)}π cm³ per cm`, answerInput: `${raw(K)}*pi`,
            vals: { K: fv(K) }, params: { shape: shape === "cyl" ? 0 : 1, r0, h0, wrt: wrt === "r" ? 0 : 1 }, consts: [3],
          };
        }
        const T0 = r.int(50, 90), a = r.int(1, 3), b = r.int(1, 3), c = r.nonzero(-3, 3), i = r.int(0, 1);
        const pt = [r.int(-4, 4), r.int(-4, 4)];
        const terms = pnorm([term(T0, [0, 0]), term(-a, [2, 0]), term(-b, [0, 2]), term(c, [1, 1])]);
        const d = pdiff(terms, i), e = evalAt(d, pt), vr = V(XY[i]);
        return {
          prompt: `The temperature on a hot plate is ${M.eq(`${V("T")}(${x}, ${y}) = ${polyH(terms, XY)}`)} in °C, with ${x} and ${y} in cm. Find ${pd("T", XY[i])} at (${n(pt[0])}, ${n(pt[1])}), in °C per cm.`,
          steps: [
            `Hold ${V(XY[1 - i])} fixed and differentiate with respect to ${vr}: ${pd("T", XY[i])} = ${polyH(d, XY)}.`,
            `At (${n(pt[0])}, ${n(pt[1])}): ${e.html} °C per cm. Moving 1 cm in the positive ${vr}-direction from there changes the temperature by about ${f(e.total)} °C.`,
          ],
          answer: { kind: "number", value: e.total.value }, answerText: `${f(e.total)} °C per cm`, answerInput: raw(e.total),
          vals: { d: tenc(d), tv: e.tv.map(fv), val: fv(e.total) }, params: { shape: 2, f: tenc(terms), i, pt },
        };
      },
    },

    // ---- C3.10 Higher-order partials and Clairaut's theorem ------------------------------------------------------------
    "C3.mixed": {
      title: "Second partial derivatives",
      generate(r, level) {
        const fname = V("f");
        if (level === 1) {
          for (;;) {
            const terms = randPoly(r, 2, 3, { maxDeg: 4, cmax: 5 }), i = r.int(0, 1);
            const d1 = pdiff(terms, i), d2 = pdiff(d1, i);
            if (d2.length < 2) continue;
            const v1 = XY[i], v2 = v1 + v1;
            return {
              prompt: `Find ${M.eq(`${pd("f", v2)} for ${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)}`,
              steps: [
                `First partial (${V(XY[1 - i])} held constant): ${pd("f", v1)} = ${polyH(d1, XY)}.`,
                `Differentiate with respect to ${V(v1)} again: ${pd("f", v2)} = ${polyH(d2, XY)}.`,
              ],
              answer: { kind: "expr", expr: polyE(d2, XY), vars: XY }, answerText: polyH(d2, XY), answerInput: polyIn(d2, XY),
              vals: { d1: tenc(d1), d2: tenc(d2) }, params: { f: tenc(terms), i },
            };
          }
        }
        if (level === 2) {
          const ev = r.int(0, 1), ov = 1 - ev, eA = [0, 0], kA = [0, 0];
          eA[ov] = r.int(1, 3); kA[ev] = r.nonzero(-3, 3);
          const extra = [0, 0]; extra[r.int(0, 1)] = r.int(2, 4);
          const terms = pnorm([term(r.nonzero(-5, 5), eA, kA), term(r.nonzero(-6, 6), [r.int(1, 3), r.int(1, 3)]), term(r.nonzero(-6, 6), extra)]);
          const fx = pdiff(terms, 0), fxy = pdiff(fx, 1), fy = pdiff(terms, 1), fyx = pdiff(fy, 0);
          return {
            prompt: `Find ${M.eq(`${pd("f", "xy")} for ${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)}`,
            steps: [
              `Differentiate with respect to ${x} first: ${pd("f", "x")} = ${polyH(fx, XY)}.`,
              `Then with respect to ${y}: ${pd("f", "xy")} = (${pd("f", "x")})${M.sub("", y)} = ${polyH(fxy, XY)}.`,
              `Check in the other order: ${pd("f", "y")} = ${polyH(fy, XY)}, and ${pd("f", "yx")} = ${polyH(fyx, XY)}. They agree, as Clairaut's theorem promises when the second partials are continuous.`,
            ],
            answer: { kind: "expr", expr: polyE(fxy, XY), vars: XY }, answerText: polyH(fxy, XY), answerInput: polyIn(fxy, XY),
            vals: { fx: tenc(fx), fxy: tenc(fxy), fy: tenc(fy), fyx: tenc(fyx) }, params: { f: tenc(terms) },
          };
        }
        // level 3: is it harmonic? f_xx + f_yy
        for (;;) {
          const a = r.int(-4, 4), b = r.int(-4, 4), c = r.nonzero(-3, 3), d = r.int(-5, 5), e = r.int(-5, 5);
          const cub = r.chance(0.5) ? [term(c, [3, 0]), term(-3 * c, [1, 2])] : [term(3 * c, [2, 1]), term(-c, [0, 3])];
          const raw_ = [term(a, [2, 0]), term(-a, [0, 2]), term(b, [1, 1]), ...cub, term(d, [1, 0]), term(e, [0, 1])];
          const harmonic = r.chance(0.5);
          if (!harmonic) raw_.push(term(r.nonzero(-3, 3), r.pick([[2, 0], [0, 2], [1, 2], [2, 1]])));
          const terms = pnorm(raw_);
          if (terms.length < 3) continue;
          const fx = pdiff(terms, 0), fxx = pdiff(fx, 0), fy = pdiff(terms, 1), fyy = pdiff(fy, 1);
          const lap = pnorm([...fxx, ...fyy]);
          if (harmonic !== (lap.length === 0)) continue;
          return {
            prompt: `Compute ${M.eq(`${pd("f", "xx")} + ${pd("f", "yy")} for ${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)} Is ${fname} harmonic, that is, does it satisfy Laplace's equation?`,
            steps: [
              `${pd("f", "x")} = ${polyH(fx, XY)}, so ${pd("f", "xx")} = ${polyH(fxx, XY)}.`,
              `${pd("f", "y")} = ${polyH(fy, XY)}, so ${pd("f", "yy")} = ${polyH(fyy, XY)}.`,
              `${pd("f", "xx")} + ${pd("f", "yy")} = (${polyH(fxx, XY)}) + (${polyH(fyy, XY)}) = ${polyH(lap, XY)}. ${lap.length ? `It is not 0 everywhere, so ${fname} is not harmonic.` : `It is 0 everywhere, so ${fname} satisfies Laplace's equation: it is harmonic.`}`,
            ],
            answer: { kind: "expr", expr: polyE(lap, XY), vars: XY }, answerText: polyH(lap, XY), answerInput: polyIn(lap, XY),
            vals: { fx: tenc(fx), fxx: tenc(fxx), fy: tenc(fy), fyy: tenc(fyy), lap: tenc(lap) }, params: { f: tenc(terms) },
          };
        }
      },
    },

    // ---- C3.11 Tangent planes and linear approximation -----------------------------------------------------------------
    "C3.tangent-plane": {
      title: "Tangent planes and linear approximation",
      generate(r, level) {
        const fname = V("f");
        /** f, f_x and f_y at a point, each as a step. */
        function firstOrder(terms, pt) {
          const fx = pdiff(terms, 0), fy = pdiff(terms, 1);
          const e0 = evalAt(terms, pt), ex = evalAt(fx, pt), ey = evalAt(fy, pt);
          const at = `(${pt.map((c) => f(c)).join(", ")})`;
          return {
            fx, fy, e0, ex, ey, f0: e0.total, A: ex.total, B: ey.total,
            steps: [
              `${fname}${at} = ${e0.html}.`,
              `${pd("f", "x")} = ${polyH(fx, XY)}, so ${pd("f", "x")}${at} = ${ex.html}.`,
              `${pd("f", "y")} = ${polyH(fy, XY)}, so ${pd("f", "y")}${at} = ${ey.html}.`,
            ],
            vals: { fx: tenc(fx), fy: tenc(fy), tv0: e0.tv.map(fv), tvx: ex.tv.map(fv), tvy: ey.tv.map(fv), f0: fv(e0.total), A: fv(ex.total), B: fv(ey.total) },
          };
        }
        const chain = (list) => { let out = ""; list.forEach(([c, rest]) => { if (Q(c).n !== 0) out += M.term(c, rest, { first: out === "" }); }); return out || "0"; };
        const fac = (vn, p) => (p === 0 ? V(vn) : `(${V(vn)} ${p > 0 ? "−" : "+"} ${n(Math.abs(p))})`);
        if (level === 1) {
          for (;;) {
            const terms = randPoly(r, 2, r.int(2, 3), { maxDeg: 2, cmax: 4, constant: r.chance(0.5) });
            const pt = [r.int(-2, 3), r.int(-2, 3)], fo = firstOrder(terms, pt), { f0, A, B } = fo;
            if (A.n === 0 && B.n === 0) continue;
            const Aa = A.mul(pt[0]), Bb = B.mul(pt[1]), C0 = f0.sub(Aa).sub(Bb);
            const plane = pnorm([term(A, [1, 0]), term(B, [0, 1]), term(C0, [0, 0])]);
            return {
              prompt: `Find the tangent plane to ${M.eq(`${z} = ${polyH(terms, XY)}`)} at the point where (${x}, ${y}) = (${n(pt[0])}, ${n(pt[1])}). Write it as ${z} = ${V("a")}${x} + ${V("b")}${y} + ${V("c")}.`,
              steps: [...fo.steps,
                `Tangent plane: ${z} = ${fname}(${V("a")}, ${V("b")}) + ${pd("f", "x")}(${x} − ${V("a")}) + ${pd("f", "y")}(${y} − ${V("b")}) = ${chain([[f0, ""], [A, fac("x", pt[0])], [B, fac("y", pt[1])]])}.`,
                `Distribute and collect: ${z} = ${chain([[A, x], [B, y], [f0, ""], [Aa.neg(), ""], [Bb.neg(), ""]])} = ${polyH(plane, XY)}.`],
              answer: { kind: "expr", expr: polyE(plane, XY), vars: XY }, answerText: `${z} = ${polyH(plane, XY)}`, answerInput: `z = ${polyIn(plane, XY)}`,
              vals: { ...fo.vals, Aa: fv(Aa), Bb: fv(Bb), C0: fv(C0) }, params: { f: tenc(terms), pt },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const terms = randPoly(r, 2, r.int(2, 3), { maxDeg: 3, cmax: 4, constant: r.chance(0.4) });
            const pt = [r.int(1, 3), r.int(1, 3)], fo = firstOrder(terms, pt), { f0, A, B } = fo;
            if ((A.n === 0 && B.n === 0) || Math.abs(f0.value) > 60) continue;
            const dx = F(r.int(1, 3) * r.sign(), 10), dy = F(r.int(1, 3) * r.sign(), 10);
            const x1 = dx.add(pt[0]), y1 = dy.add(pt[1]), Adx = A.mul(dx), Bdy = B.mul(dy), L = f0.add(Adx).add(Bdy);
            const exact = peval(terms, [x1, y1]);
            const decSum = (list) => list.map((c, i) => (i === 0 ? dec(c) : ` ${Q(c).n < 0 ? "−" : "+"} ${dec(Q(c).abs())}`)).join("");
            return {
              prompt: `Use the linear approximation of ${M.eq(`${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)} at (${n(pt[0])}, ${n(pt[1])}) to estimate ${fname}(${dec(x1)}, ${dec(y1)}).`,
              steps: [...fo.steps,
                `The steps are Δ${x} = ${dec(x1)} − ${n(pt[0])} = ${dec(dx)} and Δ${y} = ${dec(y1)} − ${n(pt[1])} = ${dec(dy)}.`,
                `${V("L")} = ${fname}(${n(pt[0])}, ${n(pt[1])}) + ${pd("f", "x")} Δ${x} + ${pd("f", "y")} Δ${y} = ${f(f0)} + ${fp(A)} · ${decp(dx)} + ${fp(B)} · ${decp(dy)} = ${decSum([f0, Adx, Bdy])} = ${dec(L)}. (For comparison, the exact value is ${dec(exact)}.)`],
              answer: { kind: "number", value: L.value }, answerText: dec(L), answerInput: decIn(L),
              vals: { ...fo.vals, Adx: fv(Adx), Bdy: fv(Bdy), L: fv(L), exact: fv(exact) },
              params: { f: tenc(terms), pt, dx: dx.value, dy: dy.value, x1: x1.value, y1: y1.value },
            };
          }
        }
        // level 3: worst-case error from measurement errors (differentials)
        const errs = [F(1, 10), F(1, 20), F(1, 5)];
        if (r.chance(0.5)) {
          const r0 = r.int(2, 10), h0 = r.int(5, 20), er = r.pick(errs), eh = r.pick(errs);
          const A = 2 * r0 * h0, B = r0 * r0, p1 = er.mul(A), p2 = eh.mul(B), K = p1.add(p2), approx = K.value * Math.PI;
          const rr = V("r"), hh = V("h");
          return {
            prompt: `A cylindrical can measures ${rr} = ${n(r0)} cm in radius and ${hh} = ${n(h0)} cm in height, with possible errors of up to ${dec(er)} cm in the radius and ${dec(eh)} cm in the height. Use differentials to estimate the largest possible error in its computed volume ${V("V")} = π${sq2(rr)}${hh}, in cm³. Round to 2 decimal places.`,
            steps: [
              `${V("dV")} = ${M.frac(`∂${V("V")}`, `∂${rr}`)} ${V("dr")} + ${M.frac(`∂${V("V")}`, `∂${hh}`)} ${V("dh")} = 2π${rr}${hh} ${V("dr")} + π${sq2(rr)} ${V("dh")}.`,
              `At the measured values: 2π · ${n(r0)} · ${n(h0)} = ${n(A)}π and π · ${sq2(n(r0))} = ${n(B)}π.`,
              `In the worst case both errors push the same way: |Δ${V("V")}| ≈ ${n(A)}π · ${dec(er)} + ${n(B)}π · ${dec(eh)} = (${dec(p1)} + ${dec(p2)})π = ${dec(K)}π ≈ ${n(approx, { dp: 2 })} cm³.`,
            ],
            answer: { kind: "number", value: approx, dp: 2 }, answerText: `${dec(K)}π ≈ ${n(approx, { dp: 2 })} cm³`, answerInput: n(approx, { dp: 2 }),
            vals: { A, B, p1: fv(p1), p2: fv(p2), K: fv(K) }, params: { kind: 0, r0, h0, er: er.value, eh: eh.value },
          };
        }
        const l = r.int(3, 20), w = r.int(3, 20), h = r.int(3, 20), e = r.pick(errs);
        const wh = w * h, lh = l * h, lw = l * w, S = wh + lh + lw, err = e.mul(S);
        return {
          prompt: `A box measures ${n(l)} cm by ${n(w)} cm by ${n(h)} cm, and each measurement may be off by up to ${dec(e)} cm. Use differentials to estimate the largest possible error in its computed volume ${V("V")} = ${V("l")}${V("w")}${V("h")}, in cm³.`,
          steps: [
            `${V("dV")} = ${V("w")}${V("h")} ${V("dl")} + ${V("l")}${V("h")} ${V("dw")} + ${V("l")}${V("w")} ${V("dh")}.`,
            `At the measured values: ${V("w")}${V("h")} = ${n(wh)}, ${V("l")}${V("h")} = ${n(lh)}, ${V("l")}${V("w")} = ${n(lw)}.`,
            `In the worst case every error pushes the same way: |Δ${V("V")}| ≈ (${n(wh)} + ${n(lh)} + ${n(lw)}) · ${dec(e)} = ${n(S)} · ${dec(e)} = ${dec(err)} cm³.`,
          ],
          answer: { kind: "number", value: err.value }, answerText: `${dec(err)} cm³`, answerInput: decIn(err),
          vals: { wh, lh, lw, S, err: fv(err) }, params: { kind: 1, l, w, h, e: e.value },
        };
      },
    },

    // ---- C3.12 Gradient and directional derivative ------------------------------------------------------------------------
    "V.2": {
      title: "Gradients and directional derivatives",
      generate(r, level) {
        const fname = V("f");
        function grad(terms, pt, names, fn = "f") {
          const ds = names.map((_, i) => pdiff(terms, i)), es = ds.map((d) => evalAt(d, pt));
          const at = `(${pt.map((c) => n(c)).join(", ")})`;
          return {
            g: es.map((e) => e.total),
            steps: names.map((nm, i) => `${pd(fn, nm)} = ${polyH(ds[i], names)}, so ${pd(fn, nm)}${at} = ${es[i].html}.`),
            vals: { ds: ds.map(tenc), tv: es.map((e) => e.tv.map(fv)), g: es.map((e) => fv(e.total)) },
          };
        }
        if (level === 1) {
          for (;;) {
            const terms = randPoly(r, 2, r.int(2, 3), { maxDeg: 3, cmax: 5, constant: r.chance(0.3) });
            const pt = [r.int(-2, 2), r.int(-2, 2)], G = grad(terms, pt, XY);
            if (G.g.every((c) => c.n === 0)) continue;
            return {
              prompt: `Find the gradient of ${M.eq(`${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)} at (${n(pt[0])}, ${n(pt[1])}).`,
              steps: [`∇${fname} = (${pd("f", "x")}, ${pd("f", "y")}).`, ...G.steps, `So ∇${fname}(${n(pt[0])}, ${n(pt[1])}) = ${tup(G.g)}.`],
              answer: { kind: "point", value: G.g.map((c) => c.value) }, answerText: tup(G.g), answerInput: tupIn(G.g),
              vals: G.vals, params: { f: tenc(terms), pt },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const terms = randPoly(r, 2, r.int(2, 3), { maxDeg: 2, cmax: 4, constant: r.chance(0.3) });
            const pt = [r.int(-3, 3), r.int(-3, 3)], G = grad(terms, pt, XY), [A, B] = G.g;
            if (A.n === 0 && B.n === 0) continue;
            const b0 = r.pick([[3, 4], [4, 3]]), sc = r.pick([1, 2]), vv = [b0[0] * sc * r.sign(), b0[1] * sc * r.sign()], m = 5 * sc;
            const toward = r.chance(0.5), Qp = [pt[0] + vv[0], pt[1] + vv[1]];
            const Av = A.mul(vv[0]), Bv = B.mul(vv[1]), top = Av.add(Bv), D = top.div(m);
            const S = vv[0] * vv[0] + vv[1] * vv[1];
            const items = [{ t: "pt", x: pt[0], y: pt[1], label: "P" }, { t: "vec", a: pt, b: Qp, label: toward ? "" : "v", role: "secondary" }];
            if (toward) items.push({ t: "pt", x: Qp[0], y: Qp[1], label: "Q" });
            return {
              prompt: toward
                ? `Find the directional derivative of ${M.eq(`${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)} at ${V("P")}(${n(pt[0])}, ${n(pt[1])}) in the direction toward ${V("Q")}(${n(Qp[0])}, ${n(Qp[1])}).`
                : `Find the directional derivative of ${M.eq(`${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)} at ${V("P")}(${n(pt[0])}, ${n(pt[1])}) in the direction of ${bv("v")} = ${tup(vv)}.`,
              graph: graph({ view: [-12, 12, -12, 12], equal: true, items }),
              steps: [...G.steps,
                `${toward ? `The direction is ${bv("v")} = ${V("Q")} − ${V("P")} = ${tup(vv)}. ` : ""}Its length is ${M.sqrt(`${sq2(np(vv[0]))} + ${sq2(np(vv[1]))}`)} = ${M.sqrt(n(S))} = ${n(m)}, so the unit vector is ${bv("u")} = (${M.frac(n(vv[0]), n(m))}, ${M.frac(n(vv[1]), n(m))}).`,
                `${M.sub(V("D"), bv("u"))}${fname} = ∇${fname} · ${bv("u")} = ${M.frac(`${fp(A)} · ${np(vv[0])} + ${fp(B)} · ${np(vv[1])}`, n(m))} = ${M.frac(sumH([Av, Bv]), n(m))} = ${M.frac(f(top), n(m))}${top.d === 1 && D.d === m && D.n === top.n ? "" : ` = ${f(D)}`}.`],
              answer: { kind: "number", value: D.value }, answerText: f(D), answerInput: raw(D),
              vals: { ...G.vals, vv, S, m, Av: fv(Av), Bv: fv(Bv), top: fv(top), D: fv(D), Qp }, params: { f: tenc(terms), pt, vv },
            };
          }
        }
        // level 3: the fastest rate of increase (word problem)
        for (;;) {
          const three = r.chance(0.5), names = three ? XYZ : XY;
          const terms = randPoly(r, names.length, 3, { maxDeg: 2, cmax: 4, constant: false });
          terms.push(term(r.int(15, 30), names.map(() => 0)));
          const pt = names.map(() => r.int(-2, 2)), G = grad(terms, pt, names, "T");
          const sq = G.g.map((c) => c.mul(c).n), N = sq.reduce((s, c) => s + c, 0);
          if (N === 0 || G.g.some((c) => !c.isInt())) continue;
          const { k, s } = surd(N);
          const args = names.map((c) => V(c)).join(", ");
          return {
            prompt: three
              ? `The temperature in a room is ${M.eq(`${V("T")}(${args}) = ${polyH(terms, names)}`)} in °C, with distances in meters. A sensor sits at (${pt.map(n).join(", ")}). What is the fastest rate at which the temperature increases as the sensor moves away from that point, in °C per meter?`
              : `The temperature on a heated plate is ${M.eq(`${V("T")}(${args}) = ${polyH(terms, names)}`)} in °C, with distances in meters. A bug sits at (${pt.map(n).join(", ")}). What is the fastest rate at which the temperature increases as the bug walks away from that point, in °C per meter?`,
            steps: [...G.steps,
              `∇${V("T")} = ${tup(G.g)} points in the direction of fastest increase.`,
              `The fastest rate is its length: ‖∇${V("T")}‖ = ${M.sqrt(G.g.map((c) => sq2(fp(c))).join(" + "))} = ${M.sqrt(sq.map(n).join(" + "))} = ${M.sqrt(n(N))}${k > 1 ? ` = ${radH(k, s)}` : ""} °C per meter.`],
            answer: { kind: "number", value: k * Math.sqrt(s) }, answerText: `${radH(k, s)} °C per meter`, answerInput: radIn(k, s),
            vals: { ...G.vals, sq, N, k, s }, params: { f: tenc(terms), pt, nv: names.length },
          };
        }
      },
    },

    // ---- C3.13 Multivariable chain rule -----------------------------------------------------------------------------------
    "V.3": {
      title: "The multivariable chain rule",
      generate(r, level) {
        const dfr = (a, b) => M.frac(`∂${a}`, `∂${b}`), ofr = (a, b) => M.frac(`d${a}`, `d${b}`);
        if (level <= 2) {
          const two = level === 2, PN = two ? ["s", "t"] : ["t"];
          const wv = two ? r.int(0, 1) : 0, w = V(PN[wv]);
          for (;;) {
            const zf = randPoly(r, 2, 2, { maxDeg: 2, cmax: 4, mixed: r.chance(0.6) });
            const xp = randPoly(r, PN.length, 2, { maxDeg: 2, cmax: 3, mixed: false, constant: !two && r.chance(0.5) });
            const yp = randPoly(r, PN.length, 2, { maxDeg: 2, cmax: 3, mixed: false, constant: !two && r.chance(0.5) });
            const p0 = PN.map(() => r.int(-2, 2));
            const ex = evalAt(xp, p0), ey = evalAt(yp, p0), X0 = ex.total, Y0 = ey.total;
            if (Math.abs(X0.value) > 6 || Math.abs(Y0.value) > 6) continue;
            const zx = pdiff(zf, 0), zy = pdiff(zf, 1), xd = pdiff(xp, wv), yd = pdiff(yp, wv);
            if (!xd.length || !yd.length) continue;
            const ezx = evalAt(zx, [X0, Y0]), ezy = evalAt(zy, [X0, Y0]), exd = evalAt(xd, p0), eyd = evalAt(yd, p0);
            const p1 = ezx.total.mul(exd.total), p2 = ezy.total.mul(eyd.total), ans = p1.add(p2);
            if (ans.n === 0 && r.chance(0.7)) continue;
            const D = two ? dfr : ofr;
            const atP = two ? `(${V("s")}, ${t}) = (${n(p0[0])}, ${n(p0[1])})` : `${t} = ${n(p0[0])}`;
            return {
              prompt: `Let ${M.eq(`${z} = ${polyH(zf, XY)}, ${x} = ${polyH(xp, PN)}, ${y} = ${polyH(yp, PN)}`)} Find ${D(z, w)} at ${atP}.`,
              steps: [
                `Chain rule: ${D(z, w)} = ${dfr(z, x)} · ${D(x, w)} + ${dfr(z, y)} · ${D(y, w)}.`,
                `${dfr(z, x)} = ${polyH(zx, XY)}, ${dfr(z, y)} = ${polyH(zy, XY)}, ${D(x, w)} = ${polyH(xd, PN)}, ${D(y, w)} = ${polyH(yd, PN)}.`,
                `At ${atP}: ${x} = ${ex.html} and ${y} = ${ey.html}.`,
                `There ${dfr(z, x)} = ${ezx.html}; ${dfr(z, y)} = ${ezy.html}; ${D(x, w)} = ${exd.html}; ${D(y, w)} = ${eyd.html}.`,
                `${D(z, w)} = ${fp(ezx.total)} · ${fp(exd.total)} + ${fp(ezy.total)} · ${fp(eyd.total)} = ${sumH([p1, p2])} = ${f(ans)}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: raw(ans),
              vals: { zx: tenc(zx), zy: tenc(zy), xd: tenc(xd), yd: tenc(yd), tvx: ex.tv.map(fv), tvy: ey.tv.map(fv), X0: fv(X0), Y0: fv(Y0),
                tzx: ezx.tv.map(fv), tzy: ezy.tv.map(fv), txd: exd.tv.map(fv), tyd: eyd.tv.map(fv),
                A: fv(ezx.total), B: fv(exd.total), C: fv(ezy.total), Dd: fv(eyd.total), p1: fv(p1), p2: fv(p2), ans: fv(ans) },
              params: { z: tenc(zf), x: tenc(xp), y: tenc(yp), p0, wv, nv: PN.length },
            };
          }
        }
        // level 3: related rates
        if (r.chance(0.5)) {
          for (;;) {
            const r0 = r.int(2, 10), h0 = r.int(3, 20), rd = r.int(1, 3), hd = r.nonzero(-4, 3);
            const A = 2 * r0 * h0 * rd, B = r0 * r0 * hd, K = A + B;
            if (K === 0) continue;
            const rr = V("r"), hh = V("h");
            return {
              prompt: `A cylinder of clay is being reshaped. Right now its radius is ${n(r0)} cm and ${rd > 0 ? "growing" : "shrinking"} at ${n(rd)} cm/s, and its height is ${n(h0)} cm and ${hd > 0 ? "growing" : "shrinking"} at ${n(Math.abs(hd))} cm/s. How fast is the volume ${V("V")} = π${sq2(rr)}${hh} changing, in cm³/s? Give the exact value in terms of π.`,
              steps: [
                `Chain rule: ${ofr(V("V"), t)} = ${dfr(V("V"), rr)} ${ofr(rr, t)} + ${dfr(V("V"), hh)} ${ofr(hh, t)} = 2π${rr}${hh} · ${ofr(rr, t)} + π${sq2(rr)} · ${ofr(hh, t)}.`,
                `Here ${ofr(rr, t)} = ${n(rd)} and ${ofr(hh, t)} = ${n(hd)}: 2π · ${n(r0)} · ${n(h0)} · ${n(rd)} + π · ${sq2(n(r0))} · ${np(hd)} = ${n(A)}π${M.term(B, "π")} = ${n(K)}π.`,
                `${ofr(V("V"), t)} = ${n(K)}π ≈ ${n(K * Math.PI, { dp: 2 })} cm³/s: the volume is ${K > 0 ? "increasing" : "decreasing"}.`,
              ],
              answer: { kind: "number", value: K * Math.PI }, answerText: `${n(K)}π cm³/s`, answerInput: `${K}pi`,
              vals: { A, B, K }, params: { kind: 0, r0, h0, rd, hd },
            };
          }
        }
        for (;;) {
          const [p, q, h] = r.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 6, 10], [6, 8, 10]]), sc = r.int(1, 3);
          const X = p * sc, Y = q * sc, D = h * sc, a = r.int(3, 9) * 10 * r.sign(), b = r.int(3, 9) * 10 * r.sign();
          const P1 = X * a, P2 = Y * b, rate = F(P1 + P2, D);
          if (rate.n === 0) continue;
          const DD = V("D"), xd = ofr(x, t), yd = ofr(y, t);
          return {
            prompt: `Car A is ${n(X)} km east of an intersection, driving ${a > 0 ? "away from" : "toward"} it at ${n(Math.abs(a))} km/h. Car B is ${n(Y)} km north of the intersection, driving ${b > 0 ? "away from" : "toward"} it at ${n(Math.abs(b))} km/h. How fast is the distance between the cars changing, in km/h? (A negative rate means it is shrinking.)`,
            steps: [
              `Put the intersection at the origin: A is at (${x}, 0), B at (0, ${y}), and ${DD} = ${M.sqrt(`${sq2(x)} + ${sq2(y)}`)}. Now ${DD} = ${M.sqrt(`${sq2(n(X))} + ${sq2(n(Y))}`)} = ${M.sqrt(n(D * D))} = ${n(D)} km.`,
              `${dfr(DD, x)} = ${M.frac(x, DD)} and ${dfr(DD, y)} = ${M.frac(y, DD)}, so ${ofr(DD, t)} = ${M.frac(x, DD)} ${xd} + ${M.frac(y, DD)} ${yd}.`,
              `${xd} = ${n(a)} and ${yd} = ${n(b)} (negative when moving toward the intersection).`,
              `${ofr(DD, t)} = ${M.frac(`${n(X)} · ${np(a)} + ${n(Y)} · ${np(b)}`, n(D))} = ${M.frac(sumH([P1, P2]), n(D))} = ${f(rate)} km/h: the distance is ${rate.n > 0 ? "growing" : "shrinking"}.`,
            ],
            answer: { kind: "number", value: rate.value }, answerText: `${f(rate)} km/h`, answerInput: raw(rate),
            vals: { D, D2: D * D, P1, P2, rate: fv(rate) }, params: { kind: 1, X, Y, a, b },
          };
        }
      },
    },

    // ---- C3.14 Implicit differentiation ------------------------------------------------------------------------------------
    "C3.implicit": {
      title: "Implicit differentiation with partials",
      generate(r, level) {
        const Fn = V("F");
        const neg = (A, B) => `${M.frac(`−${fp(A)}`, f(B))}`;
        if (level === 1 || level === 3) {
          for (;;) {
            const Fp = randPoly(r, 2, 3, { maxDeg: 3, cmax: level === 3 ? 3 : 4 });
            if (level === 3 && !Fp.some((tm) => deg(tm) === 3)) continue;
            const pt = [r.nonzero(-2, 2), r.nonzero(-2, 2)], c = peval(Fp, pt);
            const Fx = pdiff(Fp, 0), Fy = pdiff(Fp, 1), ex = evalAt(Fx, pt), ey = evalAt(Fy, pt);
            if (ey.total.n === 0 || ex.total.n === 0) continue;
            const m = ex.total.neg().div(ey.total), at = `(${n(pt[0])}, ${n(pt[1])})`;
            const dydx = M.frac(`d${y}`, `d${x}`);
            const core = [
              `${pd("F", "x")} = ${polyH(Fx, XY)}, so ${pd("F", "x")}${at} = ${ex.html}.`,
              `${pd("F", "y")} = ${polyH(Fy, XY)}, so ${pd("F", "y")}${at} = ${ey.html}.`,
              `${dydx} = −${M.frac(pd("F", "x"), pd("F", "y"))} = ${neg(ex.total, ey.total)} = ${f(m)}.`,
            ];
            const base = { f: tenc(Fp), pt };
            const vbase = { c: fv(c), Fx: tenc(Fx), Fy: tenc(Fy), tvx: ex.tv.map(fv), tvy: ey.tv.map(fv), A: fv(ex.total), B: fv(ey.total), m: fv(m) };
            if (level === 1) {
              return {
                prompt: `The point ${at} lies on the curve ${M.eq(`${polyH(Fp, XY)} = ${f(c)}`)} Find ${dydx} there.`,
                steps: [`Let ${Fn}(${x}, ${y}) = ${polyH(Fp, XY)}; the curve is ${Fn} = ${f(c)}. Differentiating ${Fn}(${x}, ${y}(${x})) = ${f(c)} gives ${pd("F", "x")} + ${pd("F", "y")} ${y}′ = 0, so ${dydx} = −${M.frac(pd("F", "x"), pd("F", "y"))}.`, ...core],
                answer: { kind: "number", value: m.value }, answerText: f(m), answerInput: raw(m), vals: vbase, params: base,
              };
            }
            // level 3: a cubic curve written with terms on both sides; the tangent line there
            const mv = r.pick(Fp.filter((tm) => deg(tm) < 3));
            if (!mv) continue;
            const left = Fp.filter((tm) => tm !== mv), right = pnorm([term(mv.c.neg(), mv.e), term(c, [0, 0])]);
            const e0 = evalAt(Fp, pt), mx0 = m.mul(pt[0]), b = Q(pt[1]).sub(mx0), line = pnorm([term(m, [1]), term(b, [0])]);
            return {
              prompt: `Find the tangent line to the curve ${M.eq(`${polyH(left, XY)} = ${polyH(right, XY)}`)} at ${at}. Write it as ${y} = ${V("m")}${x} + ${V("b")}.`,
              steps: [
                `Bring every variable term to the left: ${Fn}(${x}, ${y}) = ${polyH(Fp, XY)} = ${f(c)}.`,
                `Check the point: ${Fn}${at} = ${e0.html}, so it is on the curve.`,
                ...core.slice(0, 2),
                `Slope: ${V("m")} = −${M.frac(pd("F", "x"), pd("F", "y"))} = ${neg(ex.total, ey.total)} = ${f(m)}.`,
                `${y} − ${np(pt[1])} = ${fp(m)}(${x} − ${np(pt[0])}), so ${y} = ${kv(m, x)}${M.term(mx0.neg(), "")}${M.term(pt[1], "")} = ${polyH(line, ["x"])}.`,
              ],
              answer: { kind: "expr", expr: polyE(line, ["x"]), vars: ["x"] }, answerText: `${y} = ${polyH(line, ["x"])}`, answerInput: `y = ${polyIn(line, ["x"])}`,
              vals: { ...vbase, tv0: e0.tv.map(fv), mx0: fv(mx0), b: fv(b), right: tenc(right) }, params: { ...base, mv: tenc([mv]) },
            };
          }
        }
        // level 2: a surface F(x, y, z) = c
        for (;;) {
          const Fp = randPoly(r, 3, r.int(3, 4), { maxDeg: 3, cmax: 4 });
          const pt = [r.nonzero(-2, 2), r.nonzero(-2, 2), r.nonzero(-2, 2)], i = r.int(0, 1), c = peval(Fp, pt);
          const Fi = pdiff(Fp, i), Fz = pdiff(Fp, 2), ei = evalAt(Fi, pt), ez = evalAt(Fz, pt);
          if (ez.total.n === 0 || ei.total.n === 0) continue;
          const m = ei.total.neg().div(ez.total), at = `(${pt.map(n).join(", ")})`, vi = XYZ[i];
          const dz = M.frac(`∂${z}`, `∂${V(vi)}`);
          return {
            prompt: `The point ${at} lies on the surface ${M.eq(`${polyH(Fp, XYZ)} = ${f(c)}`)} Near it the equation determines ${z} from ${x} and ${y}. Find ${dz} there.`,
            steps: [
              `With ${Fn}(${x}, ${y}, ${z}) = ${polyH(Fp, XYZ)}, differentiating ${Fn} = ${f(c)} with respect to ${V(vi)} (${z} depending on it) gives ${dz} = −${M.frac(pd("F", vi), pd("F", "z"))}.`,
              `${pd("F", vi)} = ${polyH(Fi, XYZ)}, so ${pd("F", vi)}${at} = ${ei.html}.`,
              `${pd("F", "z")} = ${polyH(Fz, XYZ)}, so ${pd("F", "z")}${at} = ${ez.html}.`,
              `${dz} = ${neg(ei.total, ez.total)} = ${f(m)}.`,
            ],
            answer: { kind: "number", value: m.value }, answerText: f(m), answerInput: raw(m),
            vals: { c: fv(c), Fi: tenc(Fi), Fz: tenc(Fz), tvi: ei.tv.map(fv), tvz: ez.tv.map(fv), A: fv(ei.total), B: fv(ez.total), m: fv(m) },
            params: { f: tenc(Fp), pt, i },
          };
        }
      },
    },

    // ---- C3.15 The Jacobian ----------------------------------------------------------------------------------------------------
    "V.4": {
      title: "Jacobians",
      generate(r, level) {
        const UV = ["u", "v"];
        const jac = `${M.frac(`∂(${x}, ${y})`, `∂(${V("u")}, ${V("v")})`)}`;
        if (level === 1) {
          for (;;) {
            const a = r.nonzero(-5, 5), b = r.nonzero(-5, 5), c = r.nonzero(-5, 5), d = r.nonzero(-5, 5), ad = a * d, bc = b * c, det = ad - bc;
            if (det === 0) continue;
            return {
              prompt: `Find the Jacobian determinant ${jac} of the map ${M.eq(`${x} = ${linH([a, b], UV)}, ${y} = ${linH([c, d], UV)}`)}`,
              steps: [
                `The partials are constants: ${pd("x", "u")} = ${n(a)}, ${pd("x", "v")} = ${n(b)}, ${pd("y", "u")} = ${n(c)}, ${pd("y", "v")} = ${n(d)}.`,
                `${jac} = ${pd("x", "u")}${pd("y", "v")} − ${pd("x", "v")}${pd("y", "u")} = ${np(a)} · ${np(d)} − ${np(b)} · ${np(c)} = ${n(ad)} − ${np(bc)} = ${n(det)}.`,
                `So the map multiplies every area by |${n(det)}| = ${n(Math.abs(det))}${det < 0 ? ", and the negative sign means it reverses orientation" : ""}.`,
              ],
              answer: { kind: "number", value: det }, answerText: n(det), answerInput: String(det),
              vals: { ad, bc, det, abs: Math.abs(det) }, params: { a, b, c, d },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const xp = randPoly(r, 2, 2, { maxDeg: 2, cmax: 3, mixed: false }), yp = randPoly(r, 2, 2, { maxDeg: 2, cmax: 3, mixed: false });
            const pt = [r.int(-2, 2), r.int(-2, 2)];
            const ds = [pdiff(xp, 0), pdiff(xp, 1), pdiff(yp, 0), pdiff(yp, 1)], es = ds.map((d) => evalAt(d, pt));
            const [xu, xv, yu, yv] = es.map((e) => e.total), p1 = xu.mul(yv), p2 = xv.mul(yu), det = p1.sub(p2);
            if (det.n === 0) continue;
            const lbl = [pd("x", "u"), pd("x", "v"), pd("y", "u"), pd("y", "v")];
            return {
              prompt: `For the map ${M.eq(`${x} = ${polyH(xp, UV)}, ${y} = ${polyH(yp, UV)}`)} find the Jacobian determinant ${jac} at (${V("u")}, ${V("v")}) = (${n(pt[0])}, ${n(pt[1])}).`,
              steps: [
                `Partials: ${lbl.map((l, i) => `${l} = ${polyH(ds[i], UV)}`).join(", ")}.`,
                `At (${n(pt[0])}, ${n(pt[1])}): ${lbl.map((l, i) => `${l} = ${es[i].html}`).join("; ")}.`,
                `${jac} = ${pd("x", "u")}${pd("y", "v")} − ${pd("x", "v")}${pd("y", "u")} = ${fp(xu)} · ${fp(yv)} − ${fp(xv)} · ${fp(yu)} = ${f(p1)} − ${fp(p2)} = ${f(det)}.`,
              ],
              answer: { kind: "number", value: det.value }, answerText: f(det), answerInput: raw(det),
              vals: { ds: ds.map(tenc), tv: es.map((e) => e.tv.map(fv)), J: [xu, xv, yu, yv].map(fv), p1: fv(p1), p2: fv(p2), det: fv(det) },
              params: { x: tenc(xp), y: tenc(yp), pt },
            };
          }
        }
        // level 3: linear approximation of a map with the Jacobian matrix
        for (;;) {
          const f1 = randPoly(r, 2, 2, { maxDeg: 2, cmax: 3, constant: r.chance(0.3) }), f2 = randPoly(r, 2, 2, { maxDeg: 2, cmax: 3, constant: r.chance(0.3) });
          const pt = [r.int(1, 3), r.int(1, 3)], h = F(r.int(1, 2) * r.sign(), 10), k = F(r.int(1, 2) * r.sign(), 10);
          const ev = [f1, f2].map((p) => evalAt(p, pt));
          const ds = [pdiff(f1, 0), pdiff(f1, 1), pdiff(f2, 0), pdiff(f2, 1)], es = ds.map((d) => evalAt(d, pt));
          const J = es.map((e) => e.total);
          if (J.every((c) => c.n === 0)) continue;
          const prods = [J[0].mul(h), J[1].mul(k), J[2].mul(h), J[3].mul(k)];
          const Jh = [prods[0].add(prods[1]), prods[2].add(prods[3])], G = [ev[0].total.add(Jh[0]), ev[1].total.add(Jh[1])];
          const F1 = `${V("f")}₁`, F2 = `${V("f")}₂`, at = `(${n(pt[0])}, ${n(pt[1])})`;
          const lbl = [M.frac(`∂${F1}`, `∂${x}`), M.frac(`∂${F1}`, `∂${y}`), M.frac(`∂${F2}`, `∂${x}`), M.frac(`∂${F2}`, `∂${y}`)];
          const x1 = h.add(pt[0]), y1 = k.add(pt[1]);
          const decSum = (a, b) => `${dec(a)} ${b.n < 0 ? "−" : "+"} ${dec(b.abs())}`;
          return {
            prompt: `Let ${M.eq(`${bv("f")}(${x}, ${y}) = (${polyH(f1, XY)}, ${polyH(f2, XY)})`)} Use the Jacobian matrix at ${at} to approximate ${bv("f")}(${dec(x1)}, ${dec(y1)}).`,
            steps: [
              `${bv("f")}${at}: ${F1} = ${ev[0].html}; ${F2} = ${ev[1].html}.`,
              `Partials: ${lbl.map((l, i) => `${l} = ${polyH(ds[i], XY)}`).join(", ")}.`,
              `At ${at}: ${lbl.map((l, i) => `${l} = ${es[i].html}`).join("; ")}. So ${V("J")} has rows ${tup(J.slice(0, 2))} and ${tup(J.slice(2))}.`,
              `With the step ${bv("h")} = (${dec(h)}, ${dec(k)}): ${V("J")}${bv("h")} = (${fp(J[0])} · ${decp(h)} + ${fp(J[1])} · ${decp(k)}, ${fp(J[2])} · ${decp(h)} + ${fp(J[3])} · ${decp(k)}) = (${dec(Jh[0])}, ${dec(Jh[1])}).`,
              `${bv("f")}(${dec(x1)}, ${dec(y1)}) ≈ ${bv("f")}${at} + ${V("J")}${bv("h")} = (${decSum(ev[0].total, Jh[0])}, ${decSum(ev[1].total, Jh[1])}) = (${dec(G[0])}, ${dec(G[1])}).`,
            ],
            answer: { kind: "point", value: G.map((c) => c.value) }, answerText: `(${dec(G[0])}, ${dec(G[1])})`, answerInput: `(${decIn(G[0])}, ${decIn(G[1])})`,
            vals: { tv1: ev[0].tv.map(fv), tv2: ev[1].tv.map(fv), F0: ev.map((e) => fv(e.total)), ds: ds.map(tenc), tvd: es.map((e) => e.tv.map(fv)), J: J.map(fv),
              prods: prods.map(fv), Jh: Jh.map(fv), G: G.map(fv) },
            params: { f1: tenc(f1), f2: tenc(f2), pt, h: h.value, k: k.value, x1: x1.value, y1: y1.value },
          };
        }
      },
    },

    // ---- C3.16 Hessian and the second-derivative test ------------------------------------------------------------------------
    "V.5": {
      title: "Critical points and the second-derivative test",
      generate(r, level) {
        const fname = V("f");
        const OPTS = ["Local minimum", "Local maximum", "Saddle point", "The test is inconclusive (D = 0)"];
        const cls = (D, fxx) => (D.n < 0 ? 2 : D.n === 0 ? 3 : fxx.n > 0 ? 0 : 1);
        const clsTxt = (D, fxx) => (D.n < 0 ? "D < 0, so it is a saddle point" : D.n === 0 ? "D = 0, so the test says nothing"
          : fxx.n > 0 ? `D > 0 and ${pd("f", "xx")} > 0, so it is a local minimum` : `D > 0 and ${pd("f", "xx")} < 0, so it is a local maximum`).replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/&lt;(\/?)(i|sub)&gt;/g, "<$1$2>");
        if (level === 1) {
          const A = r.nonzero(-4, 4), C = r.nonzero(-4, 4), h = r.int(-4, 4), k = r.int(-4, 4), G = r.int(-9, 9);
          const terms = pnorm([term(A, [2, 0]), term(C, [0, 2]), term(-2 * A * h, [1, 0]), term(-2 * C * k, [0, 1]), term(G, [0, 0])]);
          const fx = pdiff(terms, 0), fy = pdiff(terms, 1);
          const solve = (d, coef, val, vn) => (val === 0 ? `${polyH(d, XY)} = 0, so ${V(vn)} = 0` : `${polyH(d, XY)} = 0, so ${kv(2 * coef, V(vn))} = ${n(2 * coef * val)} and ${V(vn)} = ${M.frac(n(2 * coef * val), n(2 * coef))} = ${n(val)}`);
          return {
            prompt: `Find the critical point of ${M.eq(`${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)}`,
            steps: [
              `A critical point has ${pd("f", "x")} = 0 and ${pd("f", "y")} = 0.`,
              `${pd("f", "x")} = ${solve(fx, A, h, "x")}.`,
              `${pd("f", "y")} = ${solve(fy, C, k, "y")}.`,
              `The critical point is (${n(h)}, ${n(k)}).`,
            ],
            answer: { kind: "point", value: [h, k] }, answerText: `(${n(h)}, ${n(k)})`, answerInput: `(${h}, ${k})`,
            vals: { fx: tenc(fx), fy: tenc(fy), h, k, h2: 2 * A * h, k2: 2 * C * k, A2: 2 * A, C2: 2 * C }, params: { f: tenc(terms) },
          };
        }
        if (level === 2) {
          for (;;) {
            const A = r.nonzero(-3, 3), B = r.nonzero(-4, 4), C = r.nonzero(-3, 3), D = 4 * A * C - B * B;
            if (D === 0) continue;
            const h = r.int(-3, 3), k = r.int(-3, 3), G = r.int(-9, 9);
            const terms = pnorm([term(A, [2, 0]), term(B, [1, 1]), term(C, [0, 2]), term(-(2 * A * h + B * k), [1, 0]), term(-(B * h + 2 * C * k), [0, 1]), term(G, [0, 0])]);
            const fx = pdiff(terms, 0), fy = pdiff(terms, 1), ex = evalAt(fx, [h, k]), ey = evalAt(fy, [h, k]);
            const P1 = 4 * A * C, P2 = B * B, idx = cls(F(D), F(A));
            return {
              prompt: `${M.eq(`${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)} has a critical point at (${n(h)}, ${n(k)}). Classify it.`,
              steps: [
                `Check that it is critical: ${pd("f", "x")} = ${polyH(fx, XY)} gives ${ex.html}; ${pd("f", "y")} = ${polyH(fy, XY)} gives ${ey.html}.`,
                `Second partials (constants here): ${pd("f", "xx")} = ${n(2 * A)}, ${pd("f", "yy")} = ${n(2 * C)}, ${pd("f", "xy")} = ${n(B)}.`,
                `${V("D")} = ${pd("f", "xx")}${pd("f", "yy")} − ${sq2(pd("f", "xy"))} = ${np(2 * A)} · ${np(2 * C)} − ${sq2(np(B))} = ${n(P1)} − ${n(P2)} = ${n(D)}.`,
                `${clsTxt(F(D), F(A))}.`,
              ],
              answer: { kind: "choice", options: OPTS, index: idx }, answerText: OPTS[idx],
              vals: { fx: tenc(fx), fy: tenc(fy), tvx: ex.tv.map(fv), tvy: ey.tv.map(fv), A2: 2 * A, C2: 2 * C, P1, P2, D, idx }, params: { f: tenc(terms), h, k },
            };
          }
        }
        // level 3: two critical points, exactly one of them an extremum
        const fam = r.int(0, 1);
        let terms, cps, solveStep;
        if (fam === 0) {
          const s = r.sign(), p = r.int(1, 3), c = r.nonzero(-3, 3), sy = r.int(-3, 3);
          terms = pnorm([term(s, [3, 0]), term(-3 * s * p * p, [1, 0]), term(c, [0, 2]), term(-2 * c * sy, [0, 1])]);
          cps = [[p, sy], [-p, sy]];
          const fx = pdiff(terms, 0), fy = pdiff(terms, 1);
          solveStep = `${pd("f", "x")} = ${polyH(fx, XY)} = 0 gives ${sq2(x)} = ${n(p * p)}, so ${x} = ${n(p)} or ${x} = ${n(-p)}. ${pd("f", "y")} = ${polyH(fy, XY)} = 0 gives ${y} = ${n(sy)}. Critical points: (${n(p)}, ${n(sy)}) and (${n(-p)}, ${n(sy)}).`;
        } else {
          const k = r.nonzero(-3, 3), k3 = k ** 3;
          terms = pnorm([term(1, [3, 0]), term(1, [0, 3]), term(-3 * k, [1, 1])]);
          cps = [[0, 0], [k, k]];
          const fx = pdiff(terms, 0), fy = pdiff(terms, 1);
          solveStep = `${pd("f", "x")} = ${polyH(fx, XY)} = 0 gives ${sq2(x)} = ${kv(k, y)}; ${pd("f", "y")} = ${polyH(fy, XY)} = 0 gives ${sq2(y)} = ${kv(k, x)}. Square the first: ${M.sup(x, 4)} = ${kv(k * k, sq2(y))} = ${k * k === 1 ? "" : `${n(k * k)}(${kv(k, x)}) = `}${kv(k3, x)}, so ${x}(${M.sup(x, 3)}${M.term(-k3, "")}) = 0: ${x} = 0 or ${x} = ${n(k)}. Then ${sq2(x)} = ${kv(k, y)} gives the critical points (0, 0) and (${n(k)}, ${n(k)}).`;
        }
        const fxx = pdiff(pdiff(terms, 0), 0), fyy = pdiff(pdiff(terms, 1), 1), fxy = pdiff(pdiff(terms, 0), 1);
        const info = cps.map((cp) => {
          const a = peval(fxx, cp), b = peval(fyy, cp), c = peval(fxy, cp), D = a.mul(b).sub(c.mul(c));
          return { cp, a, b, c, D, idx: cls(D, a), txt: `At (${n(cp[0])}, ${n(cp[1])}): ${pd("f", "xx")} = ${f(a)}, ${pd("f", "yy")} = ${f(b)}, ${pd("f", "xy")} = ${f(c)}, so ${V("D")} = ${fp(a)} · ${fp(b)} − ${sq2(fp(c))} = ${f(D)}: ${clsTxt(D, a)}.` };
        });
        const ext = info.find((o) => o.idx < 2);
        return {
          prompt: `${M.eq(`${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)} has two critical points, and exactly one of them is a local extremum. Find it.`,
          steps: [solveStep, `Second partials: ${pd("f", "xx")} = ${polyH(fxx, XY)}, ${pd("f", "yy")} = ${polyH(fyy, XY)}, ${pd("f", "xy")} = ${polyH(fxy, XY)}.`,
            ...info.map((o) => o.txt), `The local extremum is (${n(ext.cp[0])}, ${n(ext.cp[1])}), a local ${ext.idx === 0 ? "minimum" : "maximum"}.`],
          answer: { kind: "point", value: ext.cp }, answerText: `(${n(ext.cp[0])}, ${n(ext.cp[1])}), a local ${ext.idx === 0 ? "minimum" : "maximum"}`, answerInput: `(${ext.cp[0]}, ${ext.cp[1]})`,
          vals: { fx: tenc(pdiff(terms, 0)), fy: tenc(pdiff(terms, 1)), fxx: tenc(fxx), fyy: tenc(fyy), fxy: tenc(fxy), cps,
            hess: info.map((o) => [fv(o.a), fv(o.b), fv(o.c), fv(o.D)]), kinds: info.map((o) => o.idx), k3: fam ? cps[1][0] ** 3 : 0, kk: fam ? cps[1][0] ** 2 : cps[0][0] ** 2 },
          params: { f: tenc(terms), fam }, consts: [3, 4],
        };
      },
    },

    // ---- C3.17 Absolute extrema on closed, bounded regions -----------------------------------------------------------------------
    "C3.abs-extrema": {
      title: "Absolute extrema on a closed region",
      generate(r, level) {
        const fname = V("f"), ptH = (p) => `(${p.map((c) => f(c)).join(", ")})`;
        const rect = (x1, x2, y1, y2) => ({ t: "poly", p: [[x1, y1], [x2, y1], [x2, y2], [x1, y2]], role: "secondary" });
        const where = (list, val) => list.filter((o) => o.v.eq(val)).map((o) => ptH(o.p)).join(" and ");
        if (level === 1) {
          const a = r.nonzero(-5, 5), b = r.nonzero(-5, 5), c = r.int(-9, 9), x1 = r.int(-3, 1), x2 = x1 + r.int(2, 4), y1 = r.int(-3, 1), y2 = y1 + r.int(2, 4);
          const terms = pnorm([term(a, [1, 0]), term(b, [0, 1]), term(c, [0, 0])]), want = r.chance(0.5) ? "maximum" : "minimum";
          const cs = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]].map((p) => { const e = evalAt(terms, p); return { p, e, v: e.total }; });
          const vs = cs.map((o) => o.v.value), best = want === "maximum" ? Math.max(...vs) : Math.min(...vs), bestF = F(best);
          return {
            prompt: `Find the absolute ${want} of ${M.eq(`${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)} on the rectangle ${n(x1)} ≤ ${x} ≤ ${n(x2)}, ${n(y1)} ≤ ${y} ≤ ${n(y2)}.`,
            graph: graph({ view: [x1 - 2, x2 + 2, y1 - 2, y2 + 2], equal: true, items: [rect(x1, x2, y1, y2)] }),
            steps: [
              `${pd("f", "x")} = ${n(a)} and ${pd("f", "y")} = ${n(b)} are never both 0, so there is no critical point inside: the extremes lie on the boundary.`,
              `On each edge ${fname} is linear in a single variable, so its extremes on an edge are at the edge's ends: the four corners.`,
              `The corners: ${M.table(["Corner", `${fname}`], cs.map((o) => [ptH(o.p), o.e.html]))}`,
              `The absolute ${want} is ${n(best)}, at ${where(cs, bestF)}.`,
            ],
            answer: { kind: "number", value: best }, answerText: n(best), answerInput: String(best),
            vals: { tv: cs.map((o) => o.e.tv.map(fv)), cv: cs.map((o) => fv(o.v)), best }, params: { f: tenc(terms), x1, x2, y1, y2, max: want === "maximum" ? 1 : 0 },
          };
        }
        if (level === 2) {
          const A = r.pick([-2, -1, 1, 2]), C = r.pick([-2, -1, 1, 2]), h = r.int(-2, 2), k = r.int(-2, 2), c0 = r.int(-5, 5);
          const x1 = h - r.int(1, 3), x2 = h + r.int(1, 3), y1 = k - r.int(1, 3), y2 = k + r.int(1, 3);
          const terms = pnorm([term(A, [2, 0]), term(C, [0, 2]), term(-2 * A * h, [1, 0]), term(-2 * C * k, [0, 1]), term(A * h * h + C * k * k + c0, [0, 0])]);
          const sqf = (v, p) => sq2(p === 0 ? V(v) : `(${V(v)} ${p > 0 ? "−" : "+"} ${n(Math.abs(p))})`);
          const cterm = (c, body, first) => { const mag = Math.abs(c), b = mag === 1 ? body : `${n(mag)} · ${body}`; return first ? (c < 0 ? "−" : "") + b : ` ${c < 0 ? "−" : "+"} ${b}`; };
          const shape = `${cterm(A, sqf("x", h), true).replace(" · ", "")}${cterm(C, sqf("y", k), false).replace(" · ", "")}${M.term(c0, "")}`;
          const cands = [["Interior", [h, k]], ["Edge", [h, y1]], ["Edge", [h, y2]], ["Edge", [x1, k]], ["Edge", [x2, k]],
            ["Corner", [x1, y1]], ["Corner", [x2, y1]], ["Corner", [x2, y2]], ["Corner", [x1, y2]]].map(([kind, p]) => {
            const dx = p[0] - h, dy = p[1] - k, v = A * dx * dx + C * dy * dy + c0;
            return { kind, p, v: F(v), dx, dy, html: `${cterm(A, sq2(np(dx)), true)}${cterm(C, sq2(np(dy)), false)}${M.term(c0, "")} = ${n(v)}` };
          });
          const vs = cands.map((o) => o.v.value), mx = Math.max(...vs), mn = Math.min(...vs);
          return {
            prompt: `Find the absolute maximum and minimum values of ${M.eq(`${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)} on the rectangle ${n(x1)} ≤ ${x} ≤ ${n(x2)}, ${n(y1)} ≤ ${y} ≤ ${n(y2)}. Enter the maximum, then the minimum.`,
            graph: graph({ view: [x1 - 2, x2 + 2, y1 - 2, y2 + 2], equal: true, items: [rect(x1, x2, y1, y2)] }),
            steps: [
              `Complete the squares: ${fname} = ${shape}.`,
              `Inside: ${pd("f", "x")} = 0 and ${pd("f", "y")} = 0 only at (${n(h)}, ${n(k)}), which lies inside the rectangle.`,
              `Edges: on ${x} = ${n(x1)} and ${x} = ${n(x2)}, ${fname} is a parabola in ${y} with vertex at ${y} = ${n(k)}; on ${y} = ${n(y1)} and ${y} = ${n(y2)}, a parabola in ${x} with vertex at ${x} = ${n(h)}. Those vertices lie on the edges, so they join the four corners as candidates.`,
              `Evaluate every candidate: ${M.table(["Candidate", "Point", `${fname}`], cands.map((o) => [o.kind, ptH(o.p), o.html]))}`,
              `The largest value is ${n(mx)}, at ${where(cands, F(mx))}; the smallest is ${n(mn)}, at ${where(cands, F(mn))}.`,
            ],
            answer: { kind: "numbers", values: [mx, mn], ordered: true }, answerText: `maximum ${n(mx)}, minimum ${n(mn)}`, answerInput: `${mx}, ${mn}`,
            vals: { cpts: cands.map((o) => o.p), d: cands.map((o) => [o.dx, o.dy, o.dx * o.dx, o.dy * o.dy]), cv: cands.map((o) => o.v.n), mx, mn, f: tenc(terms) },
            params: { A, C, h, k, c0, x1, x2, y1, y2 },
          };
        }
        // level 3: on a disk
        const [p0, q0] = r.pick([[6, 8], [8, 6], [4, 0], [0, 4], [6, 0], [0, 6]]);
        const p = p0 * r.sign(), q = q0 * r.sign(), N = Math.round(Math.hypot(p, q)), R = N / 2 + r.int(1, 4);
        const terms = pnorm([term(1, [2, 0]), term(1, [0, 2]), term(p, [1, 0]), term(q, [0, 1])]);
        const cp = [F(-p, 2), F(-q, 2)], e0 = evalAt(terms, cp), fmin = e0.total;
        const gmax = R * R + R * N, gmin = R * R - R * N, Pm = [F(R * p, N), F(R * q, N)], Pn = Pm.map((c) => c.neg());
        const trigSum = (A, B) => [[A, "cos"], [B, "sin"]].filter(([c]) => c !== 0).map(([c, fn], i) => `${i === 0 ? (c < 0 ? "−" : "") : ` ${c < 0 ? "−" : "+"} `}${Math.abs(c) === 1 ? "" : `${n(Math.abs(c))} `}${fn} ${t}`).join("");
        return {
          prompt: `Find the absolute maximum and minimum values of ${M.eq(`${fname}(${x}, ${y}) = ${polyH(terms, XY)}`)} on the disk ${sq2(x)} + ${sq2(y)} ≤ ${n(R * R)}. Enter the maximum, then the minimum.`,
          graph: graph({ view: [-R - 2, R + 2, -R - 2, R + 2], equal: true, items: [{ t: "circle", c: [0, 0], r: R, role: "secondary" }] }),
          steps: [
            `Inside: ${pd("f", "x")} = ${polyH(pdiff(terms, 0), XY)} = 0 and ${pd("f", "y")} = ${polyH(pdiff(terms, 1), XY)} = 0 give ${ptH(cp)}, at distance ${f(F(N, 2))} from the origin, inside the disk of radius ${n(R)}. There ${fname} = ${e0.html}.`,
            `Boundary: ${x} = ${n(R)} cos ${t}, ${y} = ${n(R)} sin ${t}, so ${sq2(x)} + ${sq2(y)} = ${n(R * R)} and ${V("g")}(${t}) = ${n(R * R)}${[[p * R, "cos"], [q * R, "sin"]].filter(([c]) => c !== 0).map(([c, fn]) => ` ${c < 0 ? "−" : "+"} ${n(Math.abs(c))} ${fn} ${t}`).join("")}.`,
            `${V("g")}′(${t}) = 0 exactly when (cos ${t}, sin ${t}) is parallel to (${n(p)}, ${n(q)}), that is (cos ${t}, sin ${t}) = ±${M.frac(`(${n(p)}, ${n(q)})`, n(N))}, since ${M.sqrt(`${sq2(np(p))} + ${sq2(np(q))}`)} = ${n(N)}. Then ${trigSum(p, q)} = ±${n(N)}, so ${V("g")} = ${n(R * R)} ± ${n(R)} · ${n(N)}: ${n(gmax)} at ${ptH(Pm)} and ${n(gmin)} at ${ptH(Pn)}.`,
            `Compare the candidates ${f(fmin)}, ${n(gmax)} and ${n(gmin)}: the maximum is ${n(gmax)} and the minimum is ${f(fmin)}, at ${ptH(cp)}.`,
          ],
          answer: { kind: "numbers", values: [gmax, fmin.value], ordered: true }, answerText: `maximum ${n(gmax)}, minimum ${f(fmin)}`, answerInput: `${gmax}, ${raw(fmin)}`,
          vals: { N, R2: R * R, cp: cp.map(fv), tv: e0.tv.map(fv), fmin: fv(fmin), pR: p * R, qR: q * R, gmax, gmin, Pm: Pm.map(fv) }, params: { p, q, R },
        };
      },
    },

    // ---- C3.18 Lagrange multipliers -------------------------------------------------------------------------------------------------
    "C3.lagrange": {
      title: "Lagrange multipliers",
      generate(r, level) {
        const L = V("λ"), fname = V("f");
        if (level === 1) {
          const a = r.int(1, 4), b = r.int(1, 4), m = r.int(1, 4), c = 2 * a * b * m, xs = b * m, ys = a * m, fm = xs * ys;
          return {
            prompt: `Find the maximum value of ${M.eq(`${fname}(${x}, ${y}) = ${x}${y}`)} subject to ${M.eq(`${linH([a, b], XY)} = ${n(c)}`)} with ${x}, ${y} ≥ 0.`,
            steps: [
              `∇${fname} = (${y}, ${x}) and the constraint ${V("g")} = ${linH([a, b], XY)} has ∇${V("g")} = (${n(a)}, ${n(b)}). ∇${fname} = ${L}∇${V("g")} gives ${y} = ${kv(a, L)} and ${x} = ${kv(b, L)}.`,
              `Substitute into the constraint: ${kv(a * b, L)} + ${kv(a * b, L)} = ${n(c)}, so ${L} = ${M.frac(n(c), n(2 * a * b))} = ${n(m)}.`,
              `${x} = ${kv(b, L)} = ${b === 1 ? "" : `${n(b)} · ${n(m)} = `}${n(xs)}, ${y} = ${kv(a, L)} = ${a === 1 ? "" : `${n(a)} · ${n(m)} = `}${n(ys)}, and ${fname} = ${n(xs)} · ${n(ys)} = ${n(fm)}. It is the maximum: at the ends of the segment (${x} = 0 or ${y} = 0) ${fname} = 0.`,
            ],
            answer: { kind: "number", value: fm }, answerText: n(fm), answerInput: String(fm),
            vals: { ab: a * b, ab2: 2 * a * b, m, xs, ys, fm }, params: { a, b, c },
          };
        }
        if (level === 2) {
          const a = r.int(2, 6) * 5, b = r.int(1, 4) * 5, lam = r.int(2, 8);
          const xs = 2 * b * lam, ys = (a + b) * lam, C = 4 * b * (a + b) * lam, area = xs * ys;
          return {
            prompt: `A rectangular garden is fenced on all four sides. Fencing for the front side costs ${P.money(a)} per meter; for the other three sides it costs ${P.money(b)} per meter. With a budget of ${P.money(C)}, what is the largest area the garden can have, in m²?`,
            steps: [
              `Let ${x} be the length of the front (and back) side and ${y} the depth, in meters. Cost: ${n(a)}${x} + ${n(b)}${x} + ${n(2 * b)}${y} = ${n(a + b)}${x} + ${n(2 * b)}${y} = ${n(C)}.`,
              `Maximize ${V("A")} = ${x}${y}: ∇${V("A")} = (${y}, ${x}) = ${L}(${n(a + b)}, ${n(2 * b)}), so ${y} = ${n(a + b)}${L} and ${x} = ${n(2 * b)}${L}.`,
              `Substitute: ${n(a + b)} · ${n(2 * b)}${L} + ${n(2 * b)} · ${n(a + b)}${L} = ${n(2 * (2 * b) * (a + b))}${L} = ${n(C)}, so ${L} = ${n(lam)}.`,
              `${x} = ${n(2 * b)} · ${n(lam)} = ${n(xs)} m and ${y} = ${n(a + b)} · ${n(lam)} = ${n(ys)} m, so the area is ${n(xs)} · ${n(ys)} = ${P.grouped(area)} m².`,
            ],
            answer: { kind: "number", value: area }, answerText: `${P.grouped(area)} m²`, answerInput: String(area),
            vals: { ab: a + b, b2: 2 * b, coef: 4 * b * (a + b), lam, xs, ys, area }, params: { a, b, C },
          };
        }
        const [a0, b0, N0] = r.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10]]);
        const a = a0 * r.sign(), b = b0 * r.sign(), N = N0, R = r.int(1, 5), RN = R * N;
        const lam2 = F(N * N, 4 * R * R), lam = F(N, 2 * R), Pm = [F(R * a, N), F(R * b, N)];
        return {
          prompt: `Find the maximum and minimum values of ${M.eq(`${fname}(${x}, ${y}) = ${linH([a, b], XY)}`)} on the circle ${M.eq(`${sq2(x)} + ${sq2(y)} = ${n(R * R)}`)} Enter the maximum, then the minimum.`,
          steps: [
            `∇${fname} = (${n(a)}, ${n(b)}) and ∇${V("g")} = (2${x}, 2${y}). ∇${fname} = ${L}∇${V("g")} gives ${n(a)} = 2${L}${x} and ${n(b)} = 2${L}${y}, so ${x} = ${M.frac(n(a), `2${L}`)} and ${y} = ${M.frac(n(b), `2${L}`)}.`,
            `Substitute into ${sq2(x)} + ${sq2(y)} = ${n(R * R)}: ${M.frac(`${n(a * a)} + ${n(b * b)}`, `4${sq2(L)}`)} = ${n(R * R)}, so ${sq2(L)} = ${M.frac(n(N * N), n(4 * R * R))}${lam2.d === 4 * R * R && lam2.n === N * N ? "" : ` = ${f(lam2)}`} and ${L} = ±${f(lam)}.`,
            `${L} = ${f(lam)} gives (${x}, ${y}) = ${tup(Pm)} and ${fname} = ${n(a)} · ${fp(Pm[0])} + ${np(b)} · ${fp(Pm[1])} = ${n(RN)}; ${L} = −${f(lam)} gives the opposite point ${tup(Pm.map((c) => c.neg()))} and ${fname} = ${n(-RN)}.`,
            `The maximum is ${n(RN)} and the minimum is ${n(-RN)}.`,
          ],
          answer: { kind: "numbers", values: [RN, -RN], ordered: true }, answerText: `maximum ${n(RN)}, minimum ${n(-RN)}`, answerInput: `${RN}, ${-RN}`,
          vals: { a2: a * a, b2: b * b, R2: R * R, NN: N * N, R4: 4 * R * R, lam2: fv(lam2), lam: fv(lam), Pm: Pm.map(fv), RN }, params: { a, b, R }, consts: [4],
        };
      },
    },

    // ---- C3.19 Double and triple integrals -------------------------------------------------------------------------------------------
    "V.6": {
      title: "Double and triple integrals",
      generate(r, level) {
        const over = (s, d) => (d === 1 ? s : M.frac(s, n(d)));
        if (level === 1) {
          const a = r.int(1, 4), b = r.int(1, 4), c = r.int(0, 5), x1 = r.int(0, 2), x2 = x1 + r.int(1, 3), y1 = r.int(0, 2), y2 = y1 + r.int(1, 3);
          const avg = r.chance(0.4), dy = y2 - y1, dx = x2 - x1;
          const Pc = a * dy, Q0 = F(b * (y2 * y2 - y1 * y1), 2).add(c * dy);
          const X1 = F(Pc * (x2 * x2 - x1 * x1), 2), X2 = Q0.mul(dx), I = X1.add(X2), area = dx * dy, av = I.div(area);
          const fH = `${kv(a, x)} + ${kv(b, y)}${M.term(c, "")}`;
          const inner = pnorm([term(Pc, [1]), term(Q0, [0])]);
          const steps = [
            `Integrate in ${y} first, holding ${x} fixed: ${integ(n(y1), n(y2))} (${fH}) d${y} = [${kv(a, `${x}${y}`)} + ${M.frac(kv(b, sq2(y)), "2")}${M.term(c, y)}]${evalAtH(n(y1), n(y2))}.`,
            `= ${n(a)} · ${n(dy)}${x} + ${M.frac(n(b), "2")}(${n(y2 * y2)} − ${n(y1 * y1)})${c ? ` + ${n(c)} · ${n(dy)}` : ""} = ${polyH(inner, ["x"])}.`,
            `Then in ${x}: ${integ(n(x1), n(x2))} (${polyH(inner, ["x"])}) d${x} = ${M.frac(n(Pc), "2")}(${n(x2 * x2)} − ${n(x1 * x1)}) + ${fp(Q0)} · ${n(dx)} = ${f(X1)} + ${f(X2)} = ${f(I)}.`,
          ];
          if (avg) steps.push(`The rectangle's area is ${n(dx)} · ${n(dy)} = ${n(area)}, so the average value is ${M.frac(f(I), n(area))} = ${f(av)}.`);
          const ans = avg ? av : I;
          return {
            prompt: avg
              ? `Find the average value of ${M.eq(`${V("f")}(${x}, ${y}) = ${fH}`)} over the rectangle ${n(x1)} ≤ ${x} ≤ ${n(x2)}, ${n(y1)} ≤ ${y} ≤ ${n(y2)}.`
              : `Evaluate ${M.eq(`${integ(n(x1), n(x2))}${integ(n(y1), n(y2))} (${fH}) d${y} d${x}`)}`,
            steps, answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: raw(ans),
            vals: { dy, dx, y22: y2 * y2, y12: y1 * y1, x22: x2 * x2, x12: x1 * x1, Pc, Q0: fv(Q0), X1: fv(X1), X2: fv(X2), I: fv(I), area, av: fv(av) },
            params: { a, b, c, x1, x2, y1, y2, avg: avg ? 1 : 0 },
          };
        }
        if (level === 2) {
          for (;;) {
            const p = r.pick([1, 2]), m = r.int(1, 3), Lx = r.int(1, 3);
            if (m * Lx ** p > 9) continue;
            const i = r.int(0, 1), j = r.int(0, 1), K = r.int(1, 4);
            const Cc = F(K * m ** (j + 1), j + 1), Pw = p * (j + 1) + i, Lp = Lx ** (Pw + 1), I = Cc.mul(Lp).div(Pw + 1);
            const top = kv(m, pw(x, p)), ig = polyH([term(K, [i, j])], XY);
            const inner = polyH([term(Cc, [Pw, 0])], XY);
            const xi = pw(x, i), pts = [[0, 0]];
            for (let s = 0; s <= 20; s++) { const xs = (Lx * s) / 20; pts.push([xs, m * xs ** p]); }
            pts.push([Lx, 0]);
            return {
              prompt: `Evaluate ${M.eq(`∬${M.sub("", V("D"))} ${ig} d${V("A")}`)} where ${V("D")} is the region bounded by ${y} = ${top}, ${y} = 0 and ${x} = ${n(Lx)}.`,
              graph: graph({ view: [-1, Lx + 1, -1, m * Lx ** p + 1], items: [{ t: "poly", p: pts, role: "secondary" }, { t: "fn", e: `${m}*x^${p}` }] }),
              steps: [
                `Use vertical strips: for each ${x} from 0 to ${n(Lx)}, ${y} runs from 0 up to ${top}. So the integral is ${integ("0", n(Lx))}${integ("0", top)} ${ig} d${y} d${x}.`,
                j === 0
                  ? `Inner: ${integ("0", top)} ${ig} d${y} = ${K === 1 && i === 0 ? "" : `${kv(K, xi)} · `}${top} = ${inner}.`
                  : `Inner: ${integ("0", top)} ${ig} d${y} = ${kv(K, xi)}[${M.frac(sq2(y), "2")}]${evalAtH("0", top)} = ${kv(K, xi)} · ${M.frac(sq2(`(${top})`), "2")} = ${inner}.`,
                `Outer: ${integ("0", n(Lx))} ${inner} d${x} = ${Cc.eq(1) ? "" : `${fp(Cc)} · `}${M.frac(M.sup(n(Lx), Pw + 1), n(Pw + 1))} = ${Cc.eq(1) ? "" : `${fp(Cc)} · `}${M.frac(n(Lp), n(Pw + 1))}${Cc.eq(1) && I.d === Pw + 1 && I.n === Lp ? "" : ` = ${f(I)}`}.`,
              ],
              answer: { kind: "number", value: I.value }, answerText: f(I), answerInput: raw(I),
              vals: { Cc: fv(Cc), Pw, P1: Pw + 1, Lp, I: fv(I) }, params: { p, m, L: Lx, i, j, K },
            };
          }
        }
        // level 3: volume of a tetrahedron by a triple integral
        const p = r.int(1, 6), q = r.int(1, 6), h = r.int(1, 6), rq = F(h * q, 2), p3 = F(p, 3), Vol = F(p * q * h, 6);
        const w = V("w"), xp = `1 − ${over(x, p)}`;
        return {
          prompt: `A concrete ramp fills the solid in the first octant under the plane ${M.eq(`${over(x, p)} + ${over(y, q)} + ${over(z, h)} = 1`)} with lengths in meters. Use a triple integral to find its volume, in m³.`,
          steps: [
            `The top surface is ${z} = ${kv(h, `(${xp} − ${over(y, q)})`)}. Its shadow on the ${x}${y}-plane is the triangle ${x}, ${y} ≥ 0, ${over(x, p)} + ${over(y, q)} ≤ 1: ${x} from 0 to ${n(p)}, and ${y} from 0 to ${kv(q, `(${xp})`)}.`,
            `Inner: ${integ("0", `${kv(h, `(${xp} − ${over(y, q)})`)}`)} d${z} = ${kv(h, `(${xp} − ${over(y, q)})`)}.`,
            `Middle: write ${w} = ${xp}. ${integ("0", kv(q, w))} ${kv(h, `(${w} − ${over(y, q)})`)} d${y} = ${n(h)}[${w}${y} − ${M.frac(sq2(y), n(2 * q))}]${evalAtH("0", kv(q, w))} = ${n(h)}(${kv(q, sq2(w))} − ${M.frac(kv(q, sq2(w)), "2")}) = ${kv(rq, sq2(w))}.`,
            `Outer: ${integ("0", n(p))} ${fp(rq)}${sq2(`(${xp})`)} d${x} = ${fp(rq)} · ${f(p3)}, since ${integ("0", n(p))} ${sq2(`(${xp})`)} d${x} = ${f(p3)} (substitute ${V("u")} = ${xp}). So the volume is ${M.frac(n(p * q * h), "6")}${Vol.d === 6 && Vol.n === p * q * h ? "" : ` = ${f(Vol)}`} m³.`,
          ],
          answer: { kind: "number", value: Vol.value }, answerText: `${f(Vol)} m³`, answerInput: raw(Vol),
          vals: { q2: 2 * q, rq: fv(rq), p3: fv(p3), pqh: p * q * h, Vol: fv(Vol) }, params: { p, q, h }, consts: [3, 6],
        };
      },
    },

    // ---- C3.20 Fubini's theorem and changing the order -----------------------------------------------------------------------------
    "C3.fubini": {
      title: "Fubini's theorem and reversing the order",
      generate(r, level) {
        const fxy = `${V("f")}(${x}, ${y})`;
        if (level === 1) {
          for (;;) {
            const K = r.int(1, 4), m = r.int(0, 3), nn = r.int(0, 3);
            if (m === 0 && nn === 0) continue;
            const a1 = r.int(0, 2), b1 = a1 + r.int(1, 2), a2 = r.int(0, 2), b2 = a2 + r.int(1, 2);
            const one = (lo, hi, e, vn) => {
              const v = V(vn);
              if (e === 0) return { val: F(hi - lo), html: `${integ(n(lo), n(hi))} d${v} = ${n(hi)} − ${n(lo)} = ${n(hi - lo)}`, hi: 0, lo: 0 };
              const H = hi ** (e + 1), Lo = lo ** (e + 1), val = F(H - Lo, e + 1);
              return { val, H, Lo, html: `${integ(n(lo), n(hi))} ${pw(v, e)} d${v} = [${M.frac(M.sup(v, e + 1), n(e + 1))}]${evalAtH(n(lo), n(hi))} = ${M.frac(`${n(H)} − ${n(Lo)}`, n(e + 1))} = ${f(val)}` };
            };
            const A = one(a1, b1, m, "x"), B = one(a2, b2, nn, "y"), I = A.val.mul(B.val).mul(K);
            const ig = polyH([term(K, [m, nn])], XY);
            return {
              prompt: `Evaluate ${M.eq(`${integ(n(a1), n(b1))}${integ(n(a2), n(b2))} ${ig} d${y} d${x}`)}`,
              steps: [
                `The region is a rectangle and the integrand is a product of a factor in ${x} alone and a factor in ${y} alone, so by Fubini's theorem the integral splits into a product: ${K === 1 ? "" : `${n(K)} · `}(${integ(n(a1), n(b1))} ${m ? pw(x, m) : "1"} d${x})(${integ(n(a2), n(b2))} ${nn ? pw(y, nn) : "1"} d${y}).`,
                `${A.html}.`, `${B.html}.`,
                `${K === 1 ? "" : `${n(K)} · `}${fp(A.val)} · ${fp(B.val)} = ${f(I)}.`,
              ],
              answer: { kind: "number", value: I.value }, answerText: f(I), answerInput: raw(I),
              vals: { A: fv(A.val), B: fv(B.val), AH: A.H || 0, AL: A.Lo || 0, BH: B.H || 0, BL: B.Lo || 0, m1: m + 1, n1: nn + 1, I: fv(I) },
              params: { K, m, n: nn, a1, b1, a2, b2 },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const T = r.int(0, 3), lin = T < 2, a = lin ? r.int(1, 4) : r.int(2, 3), m = lin ? r.int(1, 3) : 1;
            const num = (v) => ({ h: n(v), s: String(v) });
            const ym = { h: m === 1 ? y : M.frac(y, n(m)), s: `y/${m}` }, my = { h: kv(m, y), s: `${m}*y` };
            const sq = { h: M.sqrt(y), s: "sqrt(y)" }, y2_ = { h: sq2(y), s: "y**2" };
            const top = lin ? m * a : a * a;
            const curve = lin ? ym : sq, wrong = lin ? my : y2_;
            const below = T === 0 || T === 2;  // region under the curve: x runs from the curve to a
            const Icor = below ? [curve, num(a)] : [num(0), curve], Iswap = below ? [num(0), curve] : [curve, num(a)];
            const Iwr = below ? [wrong, num(a)] : [num(0), wrong];
            const Ocor = [num(0), num(top)], Owr = [num(0), num(a)];
            const cands = [[Ocor, Icor], [Ocor, Iswap], [Owr, Icor], [Ocor, Iwr], [Owr, Iswap], [Owr, Iwr]];
            const html = ([O, I]) => `${integ(O[0].h, O[1].h)}${integ(I[0].h, I[1].h)} ${fxy} d${x} d${y}`;
            const seen = new Set(), opts = [];
            for (const c of cands) { const h = html(c); if (!seen.has(h)) { seen.add(h); opts.push(c); } }
            if (opts.length < 4) continue;
            const chosen = [opts[0], ...r.shuffle(opts.slice(1)).slice(0, 3)], order = r.shuffle([0, 1, 2, 3]);
            const options = order.map((i) => chosen[i]);
            const yb = lin ? kv(m, x) : sq2(x), ytop = lin ? n(m * a) : n(a * a);
            const orig = below ? `${integ("0", n(a))}${integ("0", yb)} ${fxy} d${y} d${x}` : `${integ("0", n(a))}${integ(yb, ytop)} ${fxy} d${y} d${x}`;
            const pts = [];
            for (let s = 0; s <= 20; s++) { const xs = (a * s) / 20; pts.push([xs, lin ? m * xs : xs * xs]); }
            pts.push(below ? [a, 0] : [0, top]);
            if (below) pts.unshift([0, 0]);
            return {
              prompt: `Which integral equals ${M.eq(orig)} with the order of integration reversed?`,
              graph: graph({ view: [-1, a + 1, -1, top + 1], items: [{ t: "poly", p: pts, role: "secondary" }, { t: "fn", e: lin ? `${m}*x` : "x^2" }] }),
              steps: [
                `Sketch the region: ${x} runs from 0 to ${n(a)}, and for each ${x}, ${y} runs ${below ? `from 0 up to the curve ${y} = ${yb}` : `from the curve ${y} = ${yb} up to ${y} = ${ytop}`}.`,
                `With ${y} outside, ${y} covers the region's full height: 0 to ${n(top)}.`,
                `For a fixed ${y}, solve ${y} = ${yb} for ${x}: ${x} = ${curve.h}. ${below ? `${x} runs from that curve to the line ${x} = ${n(a)}` : `${x} runs from the ${y}-axis (${x} = 0) to that curve`}.`,
                `So the integral is ${html(chosen[0])}.`,
              ],
              answer: { kind: "choice", options: options.map(html), index: order.indexOf(0) }, answerText: html(chosen[0]),
              vals: { top }, params: { T, a, m, opts: options.map(([O, I]) => [O[0].s, O[1].s, I[0].s, I[1].s]) },
            };
          }
        }
        // level 3: an inner integral with no elementary antiderivative; swap the order
        if (r.chance(0.5)) {
          const k = r.int(1, 4), b = r.pick([1, 2]), half = F(k, 2), val = half.value * (Math.exp(b * b) - 1);
          const ey = M.sup("e", sq2(y));
          return {
            prompt: `Evaluate ${M.eq(`${integ("0", n(k * b))}${integ(k === 1 ? x : M.frac(x, n(k)), n(b))} ${ey} d${y} d${x}`)} Round to 2 decimal places.`,
            graph: graph({ view: [-1, k * b + 1, -1, b + 1], items: [{ t: "poly", p: [[0, 0], [k * b, b], [0, b]], role: "secondary" }] }),
            steps: [
              `${ey} has no elementary antiderivative, so the inner integral cannot be done as written. Reverse the order.`,
              `The region: 0 ≤ ${x} ≤ ${n(k * b)} and ${k === 1 ? x : M.frac(x, n(k))} ≤ ${y} ≤ ${n(b)}, the triangle with vertices (0, 0), (${n(k * b)}, ${n(b)}) and (0, ${n(b)}). With horizontal strips: ${y} from 0 to ${n(b)}, and ${x} from 0 to ${kv(k, y)}.`,
              `${integ("0", n(b))}${integ("0", kv(k, y))} ${ey} d${x} d${y} = ${integ("0", n(b))} ${kv(k, y)}${ey} d${y}.`,
              `Substitute ${V("u")} = ${sq2(y)}, d${V("u")} = 2${y} d${y}: ${f(half)}[${ey}]${evalAtH("0", n(b))} = ${f(half)}(${M.sup("e", n(b * b))} − 1) ≈ ${n(val, { dp: 2 })}.`,
            ],
            answer: { kind: "number", value: val, dp: 2 }, answerText: `${f(half)}(${M.sup("e", n(b * b))} − 1) ≈ ${n(val, { dp: 2 })}`, answerInput: `${k}/2*(e^(${b * b}) - 1)`,
            vals: { kb: k * b, bb: b * b, half: fv(half) }, params: { fam: 0, k, b },
          };
        }
        const c = r.int(1, 6), third = F(c, 3), val = third.value * (Math.E - 1);
        const ey = M.sup("e", M.sup(y, 3)), pts = [];
        for (let s = 0; s <= 20; s++) { const ys = s / 20; pts.push([c * ys * ys, ys]); }
        pts.push([0, 1]);
        return {
          prompt: `Evaluate ${M.eq(`${integ("0", n(c))}${integ(M.sqrt(c === 1 ? x : M.frac(x, n(c))), "1")} ${ey} d${y} d${x}`)} Round to 2 decimal places.`,
          graph: graph({ view: [-1, c + 1, -0.5, 1.5], items: [{ t: "poly", p: pts, role: "secondary" }] }),
          steps: [
            `${ey} has no elementary antiderivative, so reverse the order.`,
            `The region: 0 ≤ ${x} ≤ ${n(c)} and ${M.sqrt(c === 1 ? x : M.frac(x, n(c)))} ≤ ${y} ≤ 1. The lower boundary is ${x} = ${kv(c, sq2(y))}, so with horizontal strips ${y} runs from 0 to 1 and ${x} from 0 to ${kv(c, sq2(y))}.`,
            `${integ("0", "1")}${integ("0", kv(c, sq2(y)))} ${ey} d${x} d${y} = ${integ("0", "1")} ${kv(c, sq2(y))}${ey} d${y}.`,
            `Substitute ${V("u")} = ${M.sup(y, 3)}, d${V("u")} = 3${sq2(y)} d${y}: ${f(third)}[${ey}]${evalAtH("0", "1")} = ${f(third)}(e − 1) ≈ ${n(val, { dp: 2 })}.`,
          ],
          answer: { kind: "number", value: val, dp: 2 }, answerText: `${f(third)}(e − 1) ≈ ${n(val, { dp: 2 })}`, answerInput: `${c}/3*(e - 1)`,
          vals: { third: fv(third) }, params: { fam: 1, c }, consts: [3],
        };
      },
    },

    // ---- C3.21 Polar, cylindrical and spherical coordinates -----------------------------------------------------------------------
    "V.7": {
      title: "Integrals in polar, cylindrical and spherical coordinates",
      generate(r, level) {
        const rr = V("r"), th = V("θ"), ph = V("φ"), rho = V("ρ");
        const dA = `${rr} d${rr} d${th}`;
        if (level === 1) {
          const a = r.int(1, 5), b = r.int(1, 3), R = r.int(1, 4), R2 = R * R, R4 = R2 * R2;
          const S1 = F(a * R2, 2), S2 = F(b * R4, 4), S = S1.add(S2), K = S.mul(2);
          const ig = `${n(a)} + ${b === 1 ? "" : n(b)}(${sq2(x)} + ${sq2(y)})`;
          return {
            prompt: `Evaluate ${M.eq(`∬${M.sub("", V("D"))} (${ig}) d${V("A")}`)} where ${V("D")} is the disk ${sq2(x)} + ${sq2(y)} ≤ ${n(R2)}. Give the exact value in terms of π.`,
            steps: [
              `In polar coordinates the disk is 0 ≤ ${rr} ≤ ${n(R)}, 0 ≤ ${th} ≤ 2π; ${sq2(x)} + ${sq2(y)} = ${sq2(rr)} and d${V("A")} = ${dA}.`,
              `${integ("0", "2π")}${integ("0", n(R))} (${n(a)} + ${kv(b, sq2(rr))})${rr} d${rr} d${th}. Inner: ${integ("0", n(R))} (${n(a)}${rr} + ${kv(b, M.sup(rr, 3))}) d${rr} = [${M.frac(`${n(a)}${sq2(rr)}`, "2")} + ${M.frac(kv(b, M.sup(rr, 4)), "4")}]${evalAtH("0", n(R))} = ${M.frac(`${n(a)} · ${n(R2)}`, "2")} + ${M.frac(`${n(b)} · ${n(R4)}`, "4")} = ${f(S1)} + ${f(S2)} = ${f(S)}.`,
              `Outer: ${integ("0", "2π")} ${f(S)} d${th} = 2π · ${f(S)} = ${f(K)}π.`,
            ],
            answer: { kind: "number", value: K.value * Math.PI }, answerText: `${f(K)}π`, answerInput: `${raw(K)}*pi`,
            vals: { R2, R4, S1: fv(S1), S2: fv(S2), S: fv(S), K: fv(K) }, params: { a, b, R }, consts: [3, 4],
          };
        }
        if (level === 2) {
          const opt = r.pick([[0, "x"], [0, "y"], [0, "xy"], [1, "y"], [2, "x"]]), [reg, ig] = opt, cc = r.int(1, 4), R = r.int(1, 4);
          const lims = [["0", `${M.frac("π", "2")}`], ["0", "π"], [`−${M.frac("π", "2")}`, M.frac("π", "2")]][reg];
          const desc = ["the quarter of the disk " + `${sq2(x)} + ${sq2(y)} ≤ ${n(R * R)}` + " in the first quadrant", `the upper half (${y} ≥ 0) of the disk ${sq2(x)} + ${sq2(y)} ≤ ${n(R * R)}`, `the right half (${x} ≥ 0) of the disk ${sq2(x)} + ${sq2(y)} ≤ ${n(R * R)}`][reg];
          const trig = ig === "x" ? `cos ${th}` : ig === "y" ? `sin ${th}` : `sin ${th} cos ${th}`;
          const anti = ig === "x" ? `sin ${th}` : ig === "y" ? `−cos ${th}` : `${M.frac(`${M.sup("sin", 2)} ${th}`, "2")}`;
          const Tv = ig === "xy" ? F(1, 2) : reg === 0 ? F(1) : F(2);
          const rp = ig === "xy" ? 3 : 2, Rp = R ** (rp + 1), Rv = F(Rp, rp + 1), I = Rv.mul(Tv).mul(cc);
          const igH = ig === "xy" ? kv(cc, `${x}${y}`) : kv(cc, V(ig));
          const polar = ig === "x" ? `${rr} cos ${th}` : ig === "y" ? `${rr} sin ${th}` : `${sq2(rr)} sin ${th} cos ${th}`;
          const angles = [[0, Math.PI / 2], [0, Math.PI], [-Math.PI / 2, Math.PI / 2]][reg], pts = [[0, 0]];
          for (let s = 0; s <= 24; s++) { const a = angles[0] + ((angles[1] - angles[0]) * s) / 24; pts.push([R * Math.cos(a), R * Math.sin(a)]); }
          return {
            prompt: `Evaluate ${M.eq(`∬${M.sub("", V("D"))} ${igH} d${V("A")}`)} where ${V("D")} is ${desc}.`,
            graph: graph({ view: [-R - 1, R + 1, -R - 1, R + 1], equal: true, items: [{ t: "poly", p: pts, role: "secondary" }] }),
            steps: [
              `In polar coordinates ${V("D")} is 0 ≤ ${rr} ≤ ${n(R)}, ${lims[0]} ≤ ${th} ≤ ${lims[1]}.`,
              `${igH} = ${kv(cc, polar)} and d${V("A")} = ${dA}, so the integral is ${integ(lims[0], lims[1])}${integ("0", n(R))} ${kv(cc, `${M.sup(rr, rp)} ${trig}`)} d${rr} d${th} = ${cc === 1 ? "" : `${n(cc)} · `}(${integ(lims[0], lims[1])} ${trig} d${th})(${integ("0", n(R))} ${M.sup(rr, rp)} d${rr}).`,
              `${integ(lims[0], lims[1])} ${trig} d${th} = [${anti}]${evalAtH(lims[0], lims[1])} = ${f(Tv)}, and ${integ("0", n(R))} ${M.sup(rr, rp)} d${rr} = ${M.frac(M.sup(n(R), rp + 1), n(rp + 1))} = ${f(Rv)}.`,
              `${cc === 1 ? "" : `${n(cc)} · `}${f(Tv)} · ${f(Rv)} = ${f(I)}.`,
            ],
            answer: { kind: "number", value: I.value }, answerText: f(I), answerInput: raw(I),
            vals: { R2: R * R, Tv: fv(Tv), rp, rp1: rp + 1, Rp, Rv: fv(Rv), I: fv(I) }, params: { reg, ig: ["x", "y", "xy"].indexOf(ig), cc, R }, consts: [3, 4],
          };
        }
        if (r.chance(0.5)) {
          const k = r.int(1, 5), R = r.int(1, 4), R4 = R ** 4, q = F(R4, 4), K = k * R4;
          return {
            prompt: `A ball of radius ${n(R)} cm has density ${kv(k, rho)} g/cm³ at distance ${rho} cm from its center. Find its mass in grams. Give the exact value in terms of π.`,
            steps: [
              `Spherical coordinates: the ball is 0 ≤ ${rho} ≤ ${n(R)}, 0 ≤ ${ph} ≤ π, 0 ≤ ${th} ≤ 2π, and d${V("V")} = ${sq2(rho)} sin ${ph} d${rho} d${ph} d${th}.`,
              `${V("m")} = ${integ("0", "2π")}${integ("0", "π")}${integ("0", n(R))} ${kv(k, rho)} · ${sq2(rho)} sin ${ph} d${rho} d${ph} d${th} = ${k === 1 ? "" : `${n(k)} · `}(${integ("0", n(R))} ${M.sup(rho, 3)} d${rho})(${integ("0", "π")} sin ${ph} d${ph})(${integ("0", "2π")} d${th}).`,
              `${integ("0", n(R))} ${M.sup(rho, 3)} d${rho} = ${M.frac(n(R4), "4")} = ${f(q)}; ${integ("0", "π")} sin ${ph} d${ph} = [−cos ${ph}]${evalAtH("0", "π")} = 2; ${integ("0", "2π")} d${th} = 2π.`,
              `${V("m")} = ${k === 1 ? "" : `${n(k)} · `}${f(q)} · 2 · 2π = ${n(K)}π g.`,
            ],
            answer: { kind: "number", value: K * Math.PI }, answerText: `${n(K)}π g`, answerInput: `${K}pi`,
            vals: { R4, q: fv(q), K }, params: { kind: 0, k, R }, consts: [3, 4],
          };
        }
        const a = r.int(1, 3), rm = r.int(1, 4), H = a * rm * rm, rm2 = rm * rm, rm4 = rm2 * rm2;
        const S1 = F(H * rm2, 2), S2 = F(a * rm4, 4), S = S1.sub(S2), K = S.mul(2);
        return {
          prompt: `A dome has the shape ${M.eq(`${z} = ${n(H)} − ${a === 1 ? "" : n(a)}(${sq2(x)} + ${sq2(y)})`)} above the ground ${z} = 0, in meters. Find the volume under the dome, in m³. Give the exact value in terms of π.`,
          steps: [
            `In cylindrical coordinates ${z} = ${n(H)} − ${kv(a, sq2(rr))}. The dome meets the ground where ${kv(a, sq2(rr))} = ${n(H)}, so ${sq2(rr)} = ${n(rm2)} and ${rr} = ${n(rm)}.`,
            `${V("V")} = ${integ("0", "2π")}${integ("0", n(rm))} (${n(H)} − ${kv(a, sq2(rr))}) ${rr} d${rr} d${th}.`,
            `Inner: [${M.frac(`${n(H)}${sq2(rr)}`, "2")} − ${M.frac(kv(a, M.sup(rr, 4)), "4")}]${evalAtH("0", n(rm))} = ${M.frac(`${n(H)} · ${n(rm2)}`, "2")} − ${M.frac(`${n(a)} · ${n(rm4)}`, "4")} = ${f(S1)} − ${f(S2)} = ${f(S)}.`,
            `${V("V")} = 2π · ${f(S)} = ${f(K)}π m³.`,
          ],
          answer: { kind: "number", value: K.value * Math.PI }, answerText: `${f(K)}π m³`, answerInput: `${raw(K)}*pi`,
          vals: { H, rm2, rm4, S1: fv(S1), S2: fv(S2), S: fv(S), K: fv(K) }, params: { kind: 1, a, rm }, consts: [4],
        };
      },
    },

    // ---- C3.22 Change of variables -------------------------------------------------------------------------------------------------
    "C3.change-vars": {
      title: "Change of variables in double integrals",
      generate(r, level) {
        const uu = V("u"), vv = V("v");
        if (level <= 2) {
          for (;;) {
            const a = r.int(-3, 3), b = r.int(-3, 3), c = r.int(-3, 3), d = r.int(-3, 3), J = a * d - b * c;
            if ((a === 0 && b === 0) || (c === 0 && d === 0) || J === 0 || Math.abs(J) > 5) continue;
            const p = r.int(1, 5), q = r.int(1, 5), aJ = Math.abs(J);
            const corners = [[0, 0], [p, 0], [p, q], [0, q]].map(([U, W]) => [(d * U - b * W) / J, (a * W - c * U) / J]);
            const xs = corners.map((c_) => c_[0]), ys = corners.map((c_) => c_[1]);
            if (Math.max(...xs) - Math.min(...xs) > 14 || Math.max(...ys) - Math.min(...ys) > 14) continue;
            const U = linH([a, b], XY), W = linH([c, d], XY);
            const kind = level === 1 ? 0 : r.int(1, 2);
            const ig = kind === 0 ? "1" : kind === 1 ? `(${U})` : `(${U})(${W})`;
            const val = kind === 0 ? F(p * q, aJ) : kind === 1 ? F(p * p * q, 2 * aJ) : F(p * p * q * q, 4 * aJ);
            const uv = kind === 0 ? "" : kind === 1 ? uu : `${uu}${vv}`;
            const lastStep = kind === 0
              ? `Area = ${integ("0", n(p))}${integ("0", n(q))} ${M.frac("1", n(aJ))} d${vv} d${uu} = ${M.frac(`${n(p)} · ${n(q)}`, n(aJ))} = ${f(val)}.`
              : kind === 1
                ? `${integ("0", n(p))}${integ("0", n(q))} ${uu} · ${M.frac("1", n(aJ))} d${vv} d${uu} = ${M.frac("1", n(aJ))} · ${M.frac(sq2(n(p)), "2")} · ${n(q)} = ${f(val)}.`
                : `${integ("0", n(p))}${integ("0", n(q))} ${uu}${vv} · ${M.frac("1", n(aJ))} d${vv} d${uu} = ${M.frac("1", n(aJ))} · ${M.frac(sq2(n(p)), "2")} · ${M.frac(sq2(n(q)), "2")} = ${f(val)}.`;
            return {
              prompt: kind === 0
                ? `Find the area of the parallelogram ${V("R")} bounded by ${M.eq(`${U} = 0, ${U} = ${n(p)}, ${W} = 0, ${W} = ${n(q)}`)} using the substitution ${uu} = ${U}, ${vv} = ${W}.`
                : `Evaluate ${M.eq(`∬${M.sub("", V("R"))} ${ig} d${V("A")}`)} where ${V("R")} is the parallelogram bounded by ${U} = 0, ${U} = ${n(p)}, ${W} = 0 and ${W} = ${n(q)}. Use ${uu} = ${U}, ${vv} = ${W}.`,
              graph: graph({ view: [Math.min(...xs) - 1, Math.max(...xs) + 1, Math.min(...ys) - 1, Math.max(...ys) + 1], equal: true, items: [{ t: "poly", p: corners, role: "secondary" }] }),
              steps: [
                `With ${uu} = ${U} and ${vv} = ${W}, the parallelogram becomes the rectangle 0 ≤ ${uu} ≤ ${n(p)}, 0 ≤ ${vv} ≤ ${n(q)}${uv ? `, and the integrand becomes ${uv}` : ""}.`,
                `${M.frac(`∂(${uu}, ${vv})`, `∂(${x}, ${y})`)} = ${np(a)} · ${np(d)} − ${np(b)} · ${np(c)} = ${n(J)}, so ${M.frac(`∂(${x}, ${y})`, `∂(${uu}, ${vv})`)} = ${f(F(1, J))} and d${V("A")} = ${M.frac(`d${uu} d${vv}`, n(aJ))}.`,
                lastStep,
              ],
              answer: { kind: "number", value: val.value }, answerText: f(val), answerInput: raw(val),
              vals: { ad: a * d, bc: b * c, J, aJ, val: fv(val), p2: p * p, q2: q * q }, params: { a, b, c, d, p, q, kind },
            };
          }
        }
        for (;;) {
          const a = r.int(2, 10), b = r.intExcept(2, 10, a), D = r.int(1, 4), ab = a * b, K = F(ab * D, 2);
          return {
            prompt: `An elliptical pond has the outline ${M.eq(`${M.frac(sq2(x), n(a * a))} + ${M.frac(sq2(y), n(b * b))} = 1`)} in meters, and its depth at (${x}, ${y}) is ${kv(D, `(1 − ${M.frac(sq2(x), n(a * a))} − ${M.frac(sq2(y), n(b * b))})`)} m. How much water does it hold, in m³? Give the exact value in terms of π.`,
            steps: [
              `Substitute ${x} = ${n(a)}${uu}, ${y} = ${n(b)}${vv}: the ellipse becomes the unit disk ${sq2(uu)} + ${sq2(vv)} ≤ 1, and ${M.frac(`∂(${x}, ${y})`, `∂(${uu}, ${vv})`)} = ${n(a)} · ${n(b)} − 0 · 0 = ${n(ab)}.`,
              `${V("V")} = ∬ ${kv(D, `(1 − ${sq2(uu)} − ${sq2(vv)})`)} · ${n(ab)} d${uu} d${vv} = ${n(D * ab)} ∬${M.sub("", `${sq2(uu)} + ${sq2(vv)} ≤ 1`)} (1 − ${sq2(uu)} − ${sq2(vv)}) d${uu} d${vv}.`,
              `In polar coordinates: ${integ("0", "2π")}${integ("0", "1")} (1 − ${sq2(V("r"))}) ${V("r")} d${V("r")} d${V("θ")} = 2π(${M.frac("1", "2")} − ${M.frac("1", "4")}) = ${M.frac("π", "2")}.`,
              `${V("V")} = ${n(D * ab)} · ${M.frac("π", "2")} = ${f(K)}π ≈ ${n(K.value * Math.PI, { dp: 2 })} m³.`,
            ],
            answer: { kind: "number", value: K.value * Math.PI }, answerText: `${f(K)}π m³`, answerInput: `${raw(K)}*pi`,
            vals: { a2: a * a, b2: b * b, ab, Dab: D * ab, K: fv(K) }, params: { a, b, D }, consts: [4],
          };
        }
      },
    },

    // ---- C3.23 Mass, moments and center of mass -----------------------------------------------------------------------------------------
    "C3.mass": {
      title: "Mass and center of mass",
      generate(r, level) {
        const rh = V("ρ");
        if (level === 1) {
          const a = r.int(1, 6), b = r.int(1, 6), k = r.int(1, 4);
          if (r.chance(0.5)) {
            const X = F(a * a, 2), Y = F(b * b, 2), m = X.mul(Y).mul(k);
            return {
              prompt: `A thin plate covers the rectangle 0 ≤ ${x} ≤ ${n(a)}, 0 ≤ ${y} ≤ ${n(b)} (in cm) with density ${M.eq(`${rh}(${x}, ${y}) = ${kv(k, `${x}${y}`)} g/cm²`)} Find its mass in grams.`,
              steps: [
                `${V("m")} = ∬ ${rh} d${V("A")} = ${integ("0", n(a))}${integ("0", n(b))} ${kv(k, `${x}${y}`)} d${y} d${x}.`,
                `The integrand is a product over a rectangle, so it splits: ${k === 1 ? "" : `${n(k)} · `}(${integ("0", n(a))} ${x} d${x})(${integ("0", n(b))} ${y} d${y}) = ${k === 1 ? "" : `${n(k)} · `}${M.frac(sq2(n(a)), "2")} · ${M.frac(sq2(n(b)), "2")} = ${k === 1 ? "" : `${n(k)} · `}${f(X)} · ${f(Y)}.`,
                `${V("m")} = ${f(m)} g.`,
              ],
              answer: { kind: "number", value: m.value }, answerText: `${f(m)} g`, answerInput: raw(m),
              vals: { X: fv(X), Y: fv(Y), m: fv(m) }, params: { kind: 0, a, b, k },
            };
          }
          const c = r.int(1, 5), A1 = b * c, A2 = b * k, T1 = A1 * a, T2 = F(A2 * a * a, 2), m = T2.add(T1);
          return {
            prompt: `A thin plate covers the rectangle 0 ≤ ${x} ≤ ${n(a)}, 0 ≤ ${y} ≤ ${n(b)} (in cm) with density ${M.eq(`${rh}(${x}, ${y}) = ${n(c)} + ${kv(k, x)} g/cm²`)} Find its mass in grams.`,
            steps: [
              `${V("m")} = ${integ("0", n(a))}${integ("0", n(b))} (${n(c)} + ${kv(k, x)}) d${y} d${x}.`,
              `Inner: ${integ("0", n(b))} (${n(c)} + ${kv(k, x)}) d${y} = ${n(b)}(${n(c)} + ${kv(k, x)}) = ${n(A1)} + ${kv(A2, x)}.`,
              `Outer: ${integ("0", n(a))} (${n(A1)} + ${kv(A2, x)}) d${x} = ${n(A1)} · ${n(a)} + ${n(A2)} · ${M.frac(sq2(n(a)), "2")} = ${n(T1)} + ${f(T2)} = ${f(m)} g.`,
            ],
            answer: { kind: "number", value: m.value }, answerText: `${f(m)} g`, answerInput: raw(m),
            vals: { A1, A2, T1, T2: fv(T2), m: fv(m) }, params: { kind: 1, a, b, k, c },
          };
        }
        if (level === 2) {
          const [i, j] = r.pick([[1, 0], [0, 1], [1, 1]]), a = r.int(1, 6), b = r.int(1, 6), k = r.int(1, 4);
          const ix = (L, e) => ({ v: F(L ** (e + 1), e + 1), h: `${integ("0", n(L))} ${e ? pw(x, e) : "1"}` });
          const X1 = F(a ** (i + 1), i + 1), X2 = F(a ** (i + 2), i + 2), Y1 = F(b ** (j + 1), j + 1), Y2 = F(b ** (j + 2), j + 2);
          const m = X1.mul(Y1).mul(k), My = X2.mul(Y1).mul(k), Mx = X1.mul(Y2).mul(k), xb = My.div(m), yb = Mx.div(m);
          const dens = kv(k, `${pw(x, i)}${pw(y, j)}`), kk = k === 1 ? "" : `${n(k)} · `;
          const I = (vn, e, L) => `${integ("0", n(L))} ${e ? pw(V(vn), e) : "1"} d${V(vn)}`;
          return {
            prompt: `A thin plate covers the rectangle 0 ≤ ${x} ≤ ${n(a)}, 0 ≤ ${y} ≤ ${n(b)} with density ${M.eq(`${rh}(${x}, ${y}) = ${dens}`)} Find its center of mass.`,
            steps: [
              `Every integral splits into an ${x}-integral times a ${y}-integral. ${I("x", i, a)} = ${f(X1)}, ${I("x", i + 1, a)} = ${f(X2)}, ${I("y", j, b)} = ${f(Y1)}, ${I("y", j + 1, b)} = ${f(Y2)}.`,
              `Mass: ${V("m")} = ∬ ${dens} d${V("A")} = ${kk}${f(X1)} · ${f(Y1)} = ${f(m)}.`,
              `Moments: ${M.sub(V("M"), y)} = ∬ ${x}${rh} d${V("A")} = ${kk}${f(X2)} · ${f(Y1)} = ${f(My)} and ${M.sub(V("M"), x)} = ∬ ${y}${rh} d${V("A")} = ${kk}${f(X1)} · ${f(Y2)} = ${f(Mx)}.`,
              `${x}̄ = ${M.frac(M.sub(V("M"), y), V("m"))} = ${M.frac(f(My), f(m))} = ${f(xb)} and ${y}̄ = ${M.frac(M.sub(V("M"), x), V("m"))} = ${M.frac(f(Mx), f(m))} = ${f(yb)}. The center of mass is ${tup([xb, yb])}.`,
            ],
            answer: { kind: "point", value: [xb.value, yb.value] }, answerText: tup([xb, yb]), answerInput: tupIn([xb, yb]),
            vals: { X1: fv(X1), X2: fv(X2), Y1: fv(Y1), Y2: fv(Y2), m: fv(m), My: fv(My), Mx: fv(Mx), xb: fv(xb), yb: fv(yb) }, params: { i, j, a, b, k },
          };
        }
        const k = r.int(1, 3), a = r.int(1, 3), a3 = a ** 3, a4 = a ** 4, a5 = a ** 5;
        const A = F(k * a3, 3), My = F(k * a4, 4), Mx = F(k * k * a5, 10), xb = My.div(A), yb = Mx.div(A);
        const top = kv(k, sq2(x)), pts = [[0, 0]];
        for (let s = 0; s <= 20; s++) { const xs = (a * s) / 20; pts.push([xs, k * xs * xs]); }
        pts.push([a, 0]);
        return {
          prompt: `A metal plate of uniform density fills the region under ${M.eq(`${y} = ${top}`)} for 0 ≤ ${x} ≤ ${n(a)}. Find its centroid (center of mass).`,
          graph: graph({ view: [-1, a + 1, -1, k * a * a + 1], items: [{ t: "poly", p: pts, role: "secondary" }, { t: "fn", e: `${k}*x^2` }] }),
          steps: [
            `Area: ${V("A")} = ${integ("0", n(a))} ${top} d${x} = ${M.frac(`${k === 1 ? "" : `${n(k)} · `}${M.sup(n(a), 3)}`, "3")} = ${f(A)}.`,
            `${M.sub(V("M"), y)} = ∬ ${x} d${V("A")} = ${integ("0", n(a))} ${x} · ${top} d${x} = ${M.frac(`${k === 1 ? "" : `${n(k)} · `}${M.sup(n(a), 4)}`, "4")} = ${f(My)}.`,
            `${M.sub(V("M"), x)} = ∬ ${y} d${V("A")} = ${integ("0", n(a))}${integ("0", top)} ${y} d${y} d${x} = ${integ("0", n(a))} ${M.frac(sq2(`(${top})`), "2")} d${x} = ${M.frac(`${k === 1 ? "" : `${n(k * k)} · `}${M.sup(n(a), 5)}`, "10")} = ${f(Mx)}.`,
            `${x}̄ = ${M.frac(f(My), f(A))} = ${f(xb)} and ${y}̄ = ${M.frac(f(Mx), f(A))} = ${f(yb)}. The centroid is ${tup([xb, yb])}.`,
          ],
          answer: { kind: "point", value: [xb.value, yb.value] }, answerText: tup([xb, yb]), answerInput: tupIn([xb, yb]),
          vals: { kk: k * k, A: fv(A), My: fv(My), Mx: fv(Mx), xb: fv(xb), yb: fv(yb), a3, a4, a5 }, params: { k, a }, consts: [3, 4, 5, 10],
        };
      },
    },

    // ---- C3.24 Surface area ------------------------------------------------------------------------------------------------------------
    "C3.surface-area": {
      title: "Surface area",
      generate(r, level) {
        const stretch = `${M.sqrt(`1 + ${sq2(pd("f", "x"))} + ${sq2(pd("f", "y"))}`)}`;
        if (level <= 2) {
          for (;;) {
            let a, b;
            if (level === 1) { const pick = r.pick([[2, 2], [4, 8], [8, 4], [12, 12], [6, 18], [18, 6]]); a = pick[0] * r.sign(); b = pick[1] * r.sign(); }
            else { a = r.int(-3, 3); b = r.int(-3, 3); if (a === 0 && b === 0) continue; }
            const c0 = r.int(-5, 5), S = 1 + a * a + b * b, { k, s } = surd(S);
            if (level === 2 && s === 1) continue;
            const plane = `${z} = ${polyH(pnorm([term(a, [1, 0]), term(b, [0, 1]), term(c0, [0, 0])]), XY)}`;
            const st = [`${pd("f", "x")} = ${n(a)} and ${pd("f", "y")} = ${n(b)}.`,
              `Stretch factor: ${stretch} = ${M.sqrt(`1 + ${sq2(np(a))} + ${sq2(np(b))}`)} = ${M.sqrt(`1 + ${n(a * a)} + ${n(b * b)}`)} = ${M.sqrt(n(S))}${S === k * k || k > 1 ? ` = ${radH(k, s)}` : ""}. It is constant, since the surface is a plane.`];
            if (level === 1) {
              const p = r.int(1, 5), q = r.int(1, 5), A = k * p * q;
              return {
                prompt: `Find the area of the part of the plane ${M.eq(plane)} that lies above the rectangle 0 ≤ ${x} ≤ ${n(p)}, 0 ≤ ${y} ≤ ${n(q)}.`,
                steps: [...st, `Area = ${n(k)} × (area of the rectangle) = ${n(k)} · ${n(p)} · ${n(q)} = ${n(A)}.`],
                answer: { kind: "number", value: A }, answerText: n(A), answerInput: String(A),
                vals: { a2: a * a, b2: b * b, S, k, A }, params: { a, b, c0, p, q },
              };
            }
            if (r.chance(0.5)) {
              const R = r.int(1, 4), coef = k * R * R;
              return {
                prompt: `Find the area of the part of the plane ${M.eq(plane)} that lies above the disk ${sq2(x)} + ${sq2(y)} ≤ ${n(R * R)}. Give an exact answer.`,
                steps: [...st, `The disk has area π · ${sq2(n(R))} = ${n(R * R)}π, so the surface area is ${radH(k, s)} · ${n(R * R)}π = ${radH(coef, s, "π")}.`],
                answer: { kind: "number", value: coef * Math.sqrt(s) * Math.PI }, answerText: radH(coef, s, "π"), answerInput: radIn(coef, s, "pi"),
                vals: { a2: a * a, b2: b * b, S, k, s, R2: R * R, coef }, params: { a, b, c0, R, disk: 1 },
              };
            }
            const p = r.int(1, 5), q = r.int(1, 5), T = F(p * q, 2), coef = T.mul(k);
            return {
              prompt: `Find the area of the part of the plane ${M.eq(plane)} that lies above the triangle with vertices (0, 0), (${n(p)}, 0) and (0, ${n(q)}). Give an exact answer.`,
              steps: [...st, `The triangle has area ${M.frac(`${n(p)} · ${n(q)}`, "2")} = ${f(T)}, so the surface area is ${radH(k, s)} · ${f(T)} = ${radH(coef, s)}.`],
              answer: { kind: "number", value: coef.value * Math.sqrt(s) }, answerText: radH(coef, s), answerInput: radIn(coef, s),
              vals: { a2: a * a, b2: b * b, S, k, s, T: fv(T), coef: fv(coef) }, params: { a, b, c0, p, q, disk: 0 },
            };
          }
        }
        const a = r.pick([1, 2]), [H, w] = r.pick(a === 1 ? [[2, 3], [6, 5], [12, 7], [20, 9]] : [[1, 3], [3, 5], [6, 7], [10, 9]]);
        const dome = r.chance(0.5), a4 = 4 * a * a, a8 = 8 * a * a, a6 = 6 * a * a, rm2 = F(H, a), w2 = w * w, w3 = w ** 3, K = F(w3 - 1, a6);
        const rr = V("r"), aH = kv(a, `(${sq2(x)} + ${sq2(y)})`);
        const surf = dome ? `${z} = ${n(H)} − ${aH}` : `${z} = ${aH}`;
        return {
          prompt: dome
            ? `A tent roof has the shape ${M.eq(surf)} for ${z} ≥ 0, in meters. How much fabric covers it, in m²? Give the exact value in terms of π.`
            : `A satellite dish has the shape ${M.eq(surf)} for ${z} ≤ ${n(H)}, in meters. What is its surface area, in m²? Give the exact value in terms of π.`,
          steps: [
            `${pd("f", "x")} = ${kv(dome ? -2 * a : 2 * a, x)} and ${pd("f", "y")} = ${kv(dome ? -2 * a : 2 * a, y)}, so ${stretch} = ${M.sqrt(`1 + ${kv(a4, `(${sq2(x)} + ${sq2(y)})`)}`)} = ${M.sqrt(`1 + ${kv(a4, sq2(rr))}`)} in polar coordinates.`,
            `The surface lies over the disk where ${kv(a, sq2(rr))} ≤ ${n(H)}, that is ${sq2(rr)} ≤ ${f(rm2)}.`,
            `${V("A")} = ${integ("0", "2π")}${integ("0", M.sqrt(f(rm2)))} ${M.sqrt(`1 + ${kv(a4, sq2(rr))}`)} ${rr} d${rr} d${V("θ")}. Substitute ${V("u")} = 1 + ${kv(a4, sq2(rr))}, d${V("u")} = ${n(a8)}${rr} d${rr}; ${V("u")} runs from 1 to 1 + ${n(a4)} · ${f(rm2)} = ${n(w2)}.`,
            `${V("A")} = 2π · ${M.frac("1", n(a8))} · ${M.frac("2", "3")}[${M.sup(V("u"), "3/2")}]${evalAtH("1", n(w2))} = ${M.frac("π", n(a6))}(${n(w3)} − 1) = ${f(K)}π ≈ ${n(K.value * Math.PI, { dp: 2 })} m².`,
          ],
          answer: { kind: "number", value: K.value * Math.PI }, answerText: `${f(K)}π m²`, answerInput: `${raw(K)}*pi`,
          vals: { a2: 2 * a, a4, a8, a6, rm2: fv(rm2), w2, w3, K: fv(K) }, params: { a, H, dome: dome ? 1 : 0 }, consts: [3],
        };
      },
    },
  });
})(Practice);
