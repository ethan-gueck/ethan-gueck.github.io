/*
 * practice/linear-algebra.js — Linear Algebra practice problems (chapter 09), one generator per concept key.
 *
 * Each generator(r, level) draws hand-solvable numbers for the level (1 easy, 2 medium, 3 hard): small
 * integers, 2×2 and 3×3 matrices built so that inverses, eigenvalues, elimination multipliers and
 * least-squares fits come out exact. Every number it shows is computed here and reported in `vals`;
 * tools/practice/verifiers/linear_algebra.py recomputes each one with SymPy. See practice/core.js.
 *
 * Matrices are drawn by mat() below (a bracketed table with an aria-label that reads the rows);
 * vectors are written (a, b, c). Answers that are matrices use the `point` kind with the entries
 * listed row by row.
 *
 * Skipped concept keys: none. Every concept in the chapter has something to compute or decide.
 */
(function (P) {
  "use strict";
  const { Frac, M, fmt, graph } = P;

  // ---- Numbers and markup ----------------------------------------------------------------------
  const F = (x) => Frac.of(x);
  const isF = (x) => x instanceof Frac;
  const n = (v) => (isF(v) ? M.f(v) : M.n(v));
  const np = (v) => (isF(v) ? M.f(v, { paren: true }) : M.n(v, { paren: true }));
  const typed = (v) => (isF(v) ? (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`) : String(v));
  /** A value as the verifier sees it: whole numbers stay numbers, fractions become {n, d}. */
  const V = (x) => (Array.isArray(x) ? x.map(V) : isF(x) ? (x.d === 1 ? x.n : { n: x.n, d: x.d }) : x);
  const val = (x) => (isF(x) ? x.value : x);
  const SUBS = "₀₁₂₃₄₅₆₇₈₉";
  const sb = (k) => String(k).replace(/\d/g, (c) => SUBS[+c]);
  const bv = (s, i) => `<b>${s}</b>${i === undefined ? "" : sb(i)}`;   // a bold vector name, u or v₁
  const mv = (s) => M.v(s);                                             // a matrix name, in italics
  const tp = (s) => M.sup(s, "T");
  const iv = (s) => M.sup(s, "−1");
  const Rw = (i) => `${M.v("R")}${sb(i)}`;
  const R2 = "ℝ²", R3 = "ℝ³";
  const x = M.v("x"), y = M.v("y"), z = M.v("z"), lam = M.v("λ");
  const vec = (v) => `(${v.map(n).join(", ")})`;
  const typedList = (xs) => `(${xs.map(typed).join(", ")})`;
  const norm = (s) => `‖${s}‖`;
  /** A signed sum of numbers: 6 − 4 + 3. */
  const sumNums = (xs) => xs.map((v, i) => {
    const q = F(v);
    return i === 0 ? n(v) : ` ${q.n < 0 ? "−" : "+"} ${n(isF(v) ? q.abs() : Math.abs(v))}`;
  }).join("");
  /** u₁v₁ + u₂v₂ + … with the actual numbers: (−2) · 3 + 1 · 4. */
  const dotTxt = (u, v) => u.map((a, i) => `${np(a)} · ${np(v[i])}`).join(" + ");
  /** A linear expression c₁a + c₂b …, skipping zero coefficients. */
  const lin = (coefs, names) => {
    let out = "";
    coefs.forEach((c, i) => { out += M.term(c, names[i], { first: out === "" }); });
    return out || "0";
  };
  /** k times a name: x, −x, 3x. */
  const kv = (k, name) => M.term(k, name, { first: true }) || "0";
  /** The scalar in front of a matrix or vector: 1/2, −1/3; nothing for 1 and a minus sign for −1. */
  const scal = (q) => { q = F(q); return q.eq(1) ? "" : q.eq(-1) ? "−" : M.f(q); };
  const plain = (v) => (isF(v) ? v.toString() : typeof v === "number" ? fmt(v) : String(v).replace(/<[^>]+>/g, ""));
  const ORD = ["", "first", "second", "third", "fourth"];
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

  /** A matrix in brackets (or determinant bars), with an aria-label that reads it row by row. */
  function mat(A, { bars = false, aug = 0 } = {}) {
    const cols = A[0].length;
    const body = A.map((row) => `<tr>${row.map((c, j) =>
      `<td style="padding:0.12em 0.45em;text-align:center;white-space:nowrap;${aug && j === cols - aug ? "border-left:1px solid currentColor;" : ""}">${typeof c === "string" ? c : n(c)}</td>`).join("")}</tr>`).join("");
    const edge = (side) => `<span aria-hidden="true" style="display:block;width:0.3em;border:0.09em solid currentColor;border-${side}:none;${bars ? "border-top:none;border-bottom:none;" : ""}"></span>`;
    const label = `${bars ? "determinant" : "matrix"} with rows ${A.map((r) => `(${r.map(plain).join(", ")})`).join(", ")}`;
    return `<span class="pmat" role="math" aria-label="${label}" style="display:inline-flex;align-items:stretch;vertical-align:middle;margin:0.15em 0.15em">${edge("right")}<table style="border-collapse:collapse;margin:0.1em 0">${body}</table>${edge("left")}</span>`;
  }
  /** A column vector. */
  const col = (v) => mat(v.map((e) => [e]));
  const radTxt = (k, s) => (s === 1 ? n(k) : `${k === 1 ? "" : n(k)}${M.sqrt(n(s))}`);
  const radIn = (k, s) => (s === 1 ? String(k) : `${k}sqrt(${s})`);
  /** √N = k√s with s square-free. */
  function sqf(N) {
    let k = 1, s = N;
    for (let f = 2; f * f <= s; f++) while (s % (f * f) === 0) { s /= f * f; k *= f; }
    return [k, s];
  }
  const sqrtTxt = (N) => { const [k, s] = sqf(N); return radTxt(k, s); };

  // ---- Matrices of Fracs (whole numbers are accepted anywhere) ------------------------------------
  const fm = (A) => A.map((r) => r.map(F));
  const mmul = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, a, k) => s.add(F(a).mul(B[k][j])), F(0))));
  const mvm = (A, v) => A.map((r) => r.reduce((s, a, k) => s.add(F(a).mul(v[k])), F(0)));
  const madd = (A, B) => A.map((r, i) => r.map((a, j) => F(a).add(B[i][j])));
  const msub = (A, B) => A.map((r, i) => r.map((a, j) => F(a).sub(B[i][j])));
  const msc = (c, A) => A.map((r) => r.map((a) => F(a).mul(c)));
  const trn = (A) => A[0].map((_, j) => A.map((r) => r[j]));
  const dot = (u, v) => u.reduce((s, a, i) => s.add(F(a).mul(v[i])), F(0));
  const vadd = (u, v) => u.map((a, i) => F(a).add(v[i]));
  const vsub = (u, v) => u.map((a, i) => F(a).sub(v[i]));
  const vsc = (c, v) => v.map((a) => F(a).mul(c));
  const eye = (k) => Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) => (i === j ? 1 : 0)));
  const minor = (A, i, j) => A.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));
  const det = (A) => (A.length === 1 ? F(A[0][0]) : A[0].reduce((s, a, j) => s.add(F(a).mul(det(minor(A, 0, j))).mul(j % 2 ? -1 : 1)), F(0)));
  const det2 = (A) => F(A[0][0]).mul(A[1][1]).sub(F(A[0][1]).mul(A[1][0]));
  const adj2 = (A) => [[F(A[1][1]), F(A[0][1]).neg()], [F(A[1][0]).neg(), F(A[0][0])]];
  const inv2 = (A) => msc(F(1).div(det2(A)), adj2(A));
  const flat = (A) => A.flat();
  const allInt = (xs) => xs.flat(3).every((q) => F(q).isInt());
  const maxAbs = (xs) => Math.max(...xs.flat(3).map((q) => Math.abs(val(q))));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const igcd = (xs) => xs.reduce((g, v) => P.gcd(g, v), 0);
  const isZero = (v) => v.every((e) => F(e).n === 0);
  const eqv = (u, v) => u.length === v.length && u.every((e, i) => F(e).eq(v[i]));
  const intv = (v) => v.map((e) => F(e).n);   // a vector of whole Fracs as numbers

  // ---- Answers -------------------------------------------------------------------------------------
  const ansVec = (v, unit = "") => ({ answer: { kind: "point", value: v.map(val) }, answerText: `${vec(v)}${unit}`, answerInput: typedList(v) });
  const ansMat = (A) => ({ answer: { kind: "point", value: flat(A).map(val) }, answerText: mat(A), answerInput: typedList(flat(A)) });
  const ansNum = (v, unit = "") => ({ answer: { kind: "number", value: val(v) }, answerText: `${n(v)}${unit}`, answerInput: typed(v) });
  const ansChoice = (options, index) => ({ answer: { kind: "choice", options, index }, answerText: options[index] });
  const entriesNote = (k) => `Enter the ${WORDS[k]} entries row by row, separated by commas.`;

  // ---- Shapes for random problems --------------------------------------------------------------------
  const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25]];
  const QUADS = [[1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [2, 6, 9, 11], [6, 6, 7, 11], [3, 4, 12, 13], [2, 10, 11, 15]];
  /** Mutually orthogonal integer triples. */
  const ORTHO = [
    [[1, 1, 0], [1, -1, 0], [0, 0, 1]], [[1, 2, 2], [2, 1, -2], [2, -2, 1]], [[1, 1, 1], [1, -1, 0], [1, 1, -2]],
    [[2, 1, 0], [-1, 2, 0], [0, 0, 1]], [[1, 0, 1], [0, 1, 0], [1, 0, -1]], [[2, 2, 1], [1, -2, 2], [2, -1, -2]],
  ];
  /** A random signed permutation of coordinates, applied to every vector of a set (keeps dot products). */
  function shuffleCoords(r, vs) {
    const perm = r.shuffle([0, 1, 2]), sg = [r.sign(), r.sign(), r.sign()];
    return vs.map((v) => perm.map((p, i) => sg[i] * v[p] + 0));
  }
  const signedPerm = (r, q) => r.shuffle(q).map((e) => e * r.sign() + 0);
  /** A square view that holds every point, at least ±lo. */
  const viewFor = (pts, lo = 5) => { const L = Math.max(lo, ...pts.flat().map((v) => Math.abs(v) + 1)); return [-L, L, -L, L]; };
  const arrow = (b, label, role = "primary", a = [0, 0]) => ({ t: "vec", a, b, label, role });
  /** An integer 2×2 matrix with determinant ±1 (so its inverse has whole entries). */
  function unimod2(r, lo = -3, hi = 3) {
    for (;;) {
      const A = [[r.int(lo, hi), r.int(lo, hi)], [r.int(lo, hi), r.int(lo, hi)]];
      const d = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      if (Math.abs(d) !== 1) continue;
      if (A[0][1] === 0 && A[1][0] === 0) continue;   // not just a diagonal of ±1
      return A;
    }
  }
  /** An integer 3×3 with determinant ±1: unit lower times (±1-diagonal) upper triangular. */
  function unimod3(r, k = 2) {
    const L = [[1, 0, 0], [r.int(-k, k), 1, 0], [r.int(-k, k), r.int(-k, k), 1]];
    const U = [[r.pick([1, -1]), r.int(-k, k), r.int(-k, k)], [0, r.pick([1, -1]), r.int(-k, k)], [0, 0, r.pick([1, -1])]];
    return intv2(mmul(L, U));
  }
  const intv2 = (A) => A.map((row) => row.map((e) => F(e).n));

  // ---- Row reduction, recorded step by step (the verifier repeats it) -------------------------------------
  /**
   * Reduce A (whose last `aug` columns are a right-hand side). Each pivot column: swap a nonzero
   * pivot up if needed, scale it to 1 (rref only), and clear the entries below (rref: above too).
   * Returns the final matrix, one snapshot per column that needed work, and the operations.
   */
  function reduce(A0, { aug = 0, rref = false } = {}) {
    const A = A0.map((row) => row.map(F)), m = A.length, nc = A[0].length - aug;
    const steps = [], mults = [], scales = [], pivots = [], log = [];
    let row = 0, swaps = 0;
    for (let c = 0; c < nc && row < m; c++) {
      let p = row;
      while (p < m && A[p][c].n === 0) p++;
      if (p === m) continue;
      const ops = [];
      if (p !== row) { [A[p], A[row]] = [A[row], A[p]]; swaps++; ops.push(`${Rw(row + 1)} ↔ ${Rw(p + 1)}`); }
      if (rref && !A[row][c].eq(1)) {
        const s = A[row][c];
        A[row] = A[row].map((e) => e.div(s));
        scales.push(s);
        ops.push(`${Rw(row + 1)} → ${Rw(row + 1)} ÷ ${np(s)}`);
      }
      for (let i = rref ? 0 : row + 1; i < m; i++) {
        if (i === row || A[i][c].n === 0) continue;
        const f = A[i][c].div(A[row][c]);
        A[i] = A[i].map((e, j) => e.sub(f.mul(A[row][j])));
        mults.push(f);
        log.push({ i, k: row, f });
        ops.push(`${Rw(i + 1)} → ${Rw(i + 1)} ${f.n > 0 ? "−" : "+"} ${f.abs().eq(1) ? "" : n(f.abs())}${Rw(row + 1)}`);
      }
      if (ops.length) steps.push({ ops, mat: A.map((rw) => rw.slice()) });
      pivots.push(c);
      row++;
    }
    return { A, steps, mults, scales, pivots, swaps, log };
  }
  const redSteps = (red, aug = 0) => red.steps.map((s) => `${s.ops.join(", ")}: ${mat(s.mat, { aug })}`);
  const redVals = (red) => ({ snaps: red.steps.map((s) => V(s.mat)), mults: V(red.mults), scales: V(red.scales) });

  /** Cofactor expansion of a 3×3 along the first row, as two lines of text. */
  function det3Lines(A) {
    const m = [0, 1, 2].map((j) => det2(minor(A, 0, j)));
    const t = [0, 1, 2].map((j) => F(A[0][j]).mul(m[j]).mul(j % 2 ? -1 : 1));
    const d = t[0].add(t[1]).add(t[2]);
    const mtxt = (j) => { const B = minor(A, 0, j); return `${np(B[0][0])} · ${np(B[1][1])} − ${np(B[0][1])} · ${np(B[1][0])}`; };
    return {
      lines: [
        `Expand along the first row: det = ${np(A[0][0])}(${mtxt(0)}) − ${np(A[0][1])}(${mtxt(1)}) + ${np(A[0][2])}(${mtxt(2)}).`,
        `The three 2 × 2 determinants are ${n(m[0])}, ${n(m[1])} and ${n(m[2])}, so det = ${np(A[0][0])} · ${np(m[0])} − ${np(A[0][1])} · ${np(m[1])} + ${np(A[0][2])} · ${np(m[2])} = ${sumNums(t)} = ${n(d)}.`,
      ],
      vals: { mins: V(m), terms: V(t), det: V(d) },
      det: d,
    };
  }

  const D = {};

  // ==== LA.1 Vectors: components, magnitude and unit vectors =========================================
  D["LA.vec-basics"] = {
    title: "Components, length and unit vectors",
    generate(r, level) {
      if (level === 1) {
        for (;;) {
          const p = [r.int(-5, 5), r.int(-5, 5)], q = [r.int(-5, 5), r.int(-5, 5)];
          const d = [q[0] - p[0], q[1] - p[1]];
          if (d[0] === 0 || d[1] === 0) continue;
          const lr = d[0] > 0 ? "right" : "left", ud = d[1] > 0 ? "up" : "down";
          return {
            prompt: `The arrow in the graph goes from ${M.v("P")} = ${vec(p)} to ${M.v("Q")} = ${vec(q)}. Find the components of this vector. Enter them as (${M.v("a")}, ${M.v("b")}).`,
            graph: graph({ view: [-7, 7, -7, 7], equal: true, items: [arrow(q, "", "primary", p), { t: "pt", x: p[0], y: p[1], label: "P" }, { t: "pt", x: q[0], y: q[1], label: "Q" }] }),
            steps: [
              `Tip minus tail: ${M.v("Q")} − ${M.v("P")} = (${n(q[0])} − ${np(p[0])}, ${n(q[1])} − ${np(p[1])}) = ${vec(d)}.`,
              `Check on the graph: from ${M.v("P")}, go ${n(Math.abs(d[0]))} ${lr} and ${n(Math.abs(d[1]))} ${ud} to reach ${M.v("Q")}.`,
            ],
            ...ansVec(d), vals: { d }, params: { p, q },
          };
        }
      }
      if (level === 2) {
        const [a, b, c] = r.pick(TRIPLES), k = c > 13 ? 1 : r.int(1, 3), swap = r.chance(0.5);
        const v = [r.sign() * k * (swap ? b : a), r.sign() * k * (swap ? a : b)];
        const sq = v.map((e) => e * e), N = sq[0] + sq[1], L = k * c;
        const u = v.map((e) => new Frac(e, L)), uu = u.map((e) => e.mul(e));
        return {
          prompt: `Find the unit vector in the direction of ${bv("v")} = ${vec(v)}. Enter it as (${M.v("a")}, ${M.v("b")}).`,
          steps: [
            `Length: ${norm(bv("v"))} = ${M.sqrt(`${M.sup(np(v[0]), 2)} + ${M.sup(np(v[1]), 2)}`)} = ${M.sqrt(`${n(sq[0])} + ${n(sq[1])}`)} = ${M.sqrt(n(N))} = ${n(L)}.`,
            `Divide each component by the length: ${bv("v̂")} = (${M.frac(n(v[0]), n(L))}, ${M.frac(n(v[1]), n(L))})${k > 1 ? ` = ${vec(u)}` : ""}.`,
            `Check that it has length 1: ${M.sup(M.f(u[0], { paren: true }), 2)} + ${M.sup(M.f(u[1], { paren: true }), 2)} = ${M.f(uu[0])} + ${M.f(uu[1])} = 1.`,
          ],
          ...ansVec(u), vals: { sq, N, L, u: V(u), uu: V(uu) }, params: { v },
        };
      }
      // level 3: a force of given size along a direction, or the length of a flight in 3-D
      const [a, b, c, len] = r.pick(QUADS);
      if (r.chance(0.5)) {
        const d = signedPerm(r, [a, b, c]), m = r.int(2, 6), Fm = len * m;
        const sq = d.map((e) => e * e), N = sq[0] + sq[1] + sq[2], f = d.map((e) => e * m);
        return {
          prompt: `A cable pulls on an anchor with a force of ${n(Fm)} newtons in the direction of ${bv("d")} = ${vec(d)}. Write the force as a vector, in newtons.`,
          steps: [
            `Length of the direction vector: ${norm(bv("d"))} = ${M.sqrt(d.map((e) => M.sup(np(e), 2)).join(" + "))} = ${M.sqrt(sumNums(sq))} = ${M.sqrt(n(N))} = ${n(len)}.`,
            `The unit direction is ${M.frac(bv("d"), n(len))}; the force is its length times that: ${bv("F")} = ${n(Fm)} · ${M.frac(bv("d"), n(len))}.`,
            `${n(Fm)} ÷ ${n(len)} = ${n(m)}, so ${bv("F")} = ${n(m)}${bv("d")} = ${vec(f)} N.`,
          ],
          ...ansVec(f, " N"), vals: { sq, N, len, m, f }, params: { kind: 0, d, Fm },
        };
      }
      const k = r.int(1, 2), p = [r.int(-5, 5), r.int(-5, 5), r.int(0, 5)];
      const d = signedPerm(r, [a, b, c]).map((e) => e * k), q = p.map((e, i) => e + d[i]);
      const sq = d.map((e) => e * e), N = sq[0] + sq[1] + sq[2], dist = len * k;
      return {
        prompt: `A drone flies in a straight line from ${M.v("P")} = ${vec(p)} to ${M.v("Q")} = ${vec(q)}, with coordinates in meters. How far does it fly, in meters?`,
        steps: [
          `The displacement is ${M.v("Q")} − ${M.v("P")} = (${q.map((e, i) => `${n(e)} − ${np(p[i])}`).join(", ")}) = ${vec(d)}.`,
          `The distance is its length: ${M.sqrt(d.map((e) => M.sup(np(e), 2)).join(" + "))} = ${M.sqrt(sumNums(sq))} = ${M.sqrt(n(N))} = ${n(dist)} m.`,
        ],
        ...ansNum(dist, " m"), vals: { d, sq, N, dist }, params: { kind: 1, p, q },
      };
    },
  };

  // ==== LA.2 Vectors and linear combinations ===========================================================
  D["LA.1"] = {
    title: "Linear combinations",
    generate(r, level) {
      if (level === 1) {
        for (;;) {
          const u = [r.int(-3, 4), r.int(-3, 4)], v = [r.int(-3, 4), r.int(-3, 4)], a = r.int(2, 3), b = r.int(2, 3);
          if (u[0] * v[1] - u[1] * v[0] === 0) continue;
          const au = u.map((e) => a * e), bw = v.map((e) => b * e), w = [au[0] + bw[0], au[1] + bw[1]];
          return {
            prompt: `Let ${bv("u")} = ${vec(u)} and ${bv("v")} = ${vec(v)}, drawn in the graph. Find ${n(a)}${bv("u")} + ${n(b)}${bv("v")}.`,
            graph: graph({ view: viewFor([u, v]), equal: true, items: [arrow(u, "u"), arrow(v, "v", "secondary")] }),
            steps: [
              `Scale each vector by multiplying every component: ${n(a)}${bv("u")} = (${n(a)} · ${np(u[0])}, ${n(a)} · ${np(u[1])}) = ${vec(au)} and ${n(b)}${bv("v")} = (${n(b)} · ${np(v[0])}, ${n(b)} · ${np(v[1])}) = ${vec(bw)}.`,
              `Add matching components: (${n(au[0])} + ${np(bw[0])}, ${n(au[1])} + ${np(bw[1])}) = ${vec(w)}.`,
            ],
            ...ansVec(w), vals: { au, bw, w }, params: { u, v, a, b },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const vs = [0, 1, 2].map(() => [r.int(-4, 4), r.int(-4, 4), r.int(-4, 4)]), c = [r.nonzero(-3, 3), r.nonzero(-3, 3), r.nonzero(-3, 3)];
          if (vs.some(isZero) || c.every((e) => e > 0)) continue;
          const names = [bv("u"), bv("v"), bv("w")];
          const sc = vs.map((v, i) => v.map((e) => c[i] * e)), res = [0, 1, 2].map((j) => sc[0][j] + sc[1][j] + sc[2][j]);
          const combo = lin(c, names);
          return {
            prompt: `Let ${bv("u")} = ${vec(vs[0])}, ${bv("v")} = ${vec(vs[1])} and ${bv("w")} = ${vec(vs[2])}. Find ${M.eq(combo)}`,
            steps: [
              `Scale each vector: ${sc.map((s, i) => `${kv(c[i], names[i])} = ${vec(s)}`).join("; ")}.`,
              `Add component by component: (${[0, 1, 2].map((j) => sumNums(sc.map((s) => s[j]))).join(", ")}) = ${vec(res)}.`,
            ],
            ...ansVec(res), vals: { sc, res }, params: { vs, c },
          };
        }
      }
      // level 3: find the weights
      for (;;) {
        const v1 = [r.int(-4, 4), r.int(-4, 4)], v2 = [r.int(-4, 4), r.int(-4, 4)], c1 = r.nonzero(-3, 3), c2 = r.nonzero(-3, 3);
        const Dt = v1[0] * v2[1] - v2[0] * v1[1];
        if (Dt === 0 || isZero(v1) || isZero(v2)) continue;
        const w = [c1 * v1[0] + c2 * v2[0], c1 * v1[1] + c2 * v2[1]];
        if (Math.max(...w.map(Math.abs)) > 12) continue;
        const C1 = `${M.v("c")}₁`, C2 = `${M.v("c")}₂`;
        const t1 = [w[0] * v2[1], v2[0] * w[1]], num1 = t1[0] - t1[1], t2 = [v1[0] * w[1], w[0] * v1[1]], num2 = t2[0] - t2[1];
        return {
          prompt: `Find the weights ${C1} and ${C2} with ${C1}${bv("v", 1)} + ${C2}${bv("v", 2)} = ${bv("w")}, where ${bv("v", 1)} = ${vec(v1)}, ${bv("v", 2)} = ${vec(v2)} and ${bv("w")} = ${vec(w)}. Enter (${C1}, ${C2}).`,
          graph: graph({ view: viewFor([v1, v2, w]), equal: true, items: [arrow(v1, "v₁"), arrow(v2, "v₂"), arrow(w, "w", "secondary")] }),
          steps: [
            `Write the combination one component at a time: ${M.eq(`${lin([v1[0], v2[0]], [C1, C2])} = ${n(w[0])}`)}${M.eq(`${lin([v1[1], v2[1]], [C1, C2])} = ${n(w[1])}`)}`,
            `The determinant of the coefficients is ${M.v("D")} = ${np(v1[0])} · ${np(v2[1])} − ${np(v2[0])} · ${np(v1[1])} = ${n(Dt)}. It is not 0, so there is exactly one answer.`,
            `Cramer's rule: ${C1} = ${M.frac(`${np(w[0])} · ${np(v2[1])} − ${np(v2[0])} · ${np(w[1])}`, n(Dt))} = ${M.frac(n(num1), n(Dt))} = ${n(c1)}.`,
            `${C2} = ${M.frac(`${np(v1[0])} · ${np(w[1])} − ${np(w[0])} · ${np(v1[1])}`, n(Dt))} = ${M.frac(n(num2), n(Dt))} = ${n(c2)}.`,
            `Check: ${scal(c1)}${vec(v1)} ${c2 < 0 ? "−" : "+"} ${scal(Math.abs(c2))}${vec(v2)} = ${vec(w)}.`,
          ],
          ...ansVec([c1, c2]), vals: { Dt, num1, num2, c1, c2 }, params: { v1, v2, w },
        };
      }
    },
  };

  // ==== LA.3 Dot product and angle ======================================================================
  D["LA.dot"] = {
    title: "Dot product and the angle between vectors",
    generate(r, level) {
      if (level === 1) {
        const dim = r.chance(0.5) ? 2 : 3;
        const u = Array.from({ length: dim }, () => r.int(-5, 6)), v = Array.from({ length: dim }, () => r.int(-5, 6));
        const prods = u.map((e, i) => e * v[i]), s = prods.reduce((a, b) => a + b, 0);
        const kind = s > 0 ? "positive, so the angle between them is acute" : s < 0 ? "negative, so the angle between them is obtuse" : "0, so they are perpendicular";
        return {
          prompt: `Find the dot product ${bv("u")} · ${bv("v")} for ${bv("u")} = ${vec(u)} and ${bv("v")} = ${vec(v)}.`,
          steps: [
            `Multiply matching components and add: ${bv("u")} · ${bv("v")} = ${dotTxt(u, v)}.`,
            `= ${sumNums(prods)} = ${n(s)}. It is ${kind}.`,
          ],
          ...ansNum(s), vals: { prods, s }, params: { u, v },
        };
      }
      if (level === 2) {
        for (;;) {
          const ang = r.pick([45, 135, 60, 120, 90]);
          let u, v;
          if (ang === 45 || ang === 135) {
            const a = r.nonzero(-3, 3), b = r.int(-3, 3), s = r.int(1, 2);
            u = [a, b];
            v = ang === 45 ? [s * (a - b), s * (a + b)] : [s * (-a - b), s * (a - b)];
          } else if (ang === 60 || ang === 120) {
            const base = [];
            for (const i of [0, 1, 2]) for (const j of [0, 1, 2]) if (i < j) for (const si of [1, -1]) for (const sj of [1, -1]) { const e = [0, 0, 0]; e[i] = si; e[j] = sj; base.push(e); }
            const bu = r.pick(base), want = ang === 60 ? 1 : -1, cands = base.filter((e) => dot(e, bu).n === want);
            const s = r.int(1, 2), t = r.int(1, 3);
            u = bu.map((e) => s * e + 0);
            v = r.pick(cands).map((e) => t * e + 0);
          } else {
            u = [r.nonzero(-4, 4), r.int(-4, 4), r.int(-3, 3)];
            const w = [r.int(-2, 2), r.int(-2, 2), r.int(-2, 2)], c = cross(u, w), g = igcd(c);
            if (g === 0) continue;
            v = c.map((e) => e / g);
          }
          const prods = u.map((e, i) => e * v[i]), dp = prods.reduce((a, b) => a + b, 0);
          const step1 = `${bv("u")} · ${bv("v")} = ${dotTxt(u, v)} = ${sumNums(prods)} = ${n(dp)}.`;
          const prompt = `Find the angle between ${bv("u")} = ${vec(u)} and ${bv("v")} = ${vec(v)}, in degrees.`;
          if (ang === 90) {
            return {
              prompt,
              steps: [step1, `The dot product is 0, so cos ${M.v("θ")} = 0 and ${M.v("θ")} = ${n(ang)}°: the vectors are perpendicular.`],
              answer: { kind: "number", value: ang }, answerText: `${n(ang)}°`, answerInput: String(ang),
              vals: { prods, dp, ang }, params: { u, v },
            };
          }
          const sqU = u.map((e) => e * e), sqV = v.map((e) => e * e), N1 = sqU.reduce((a, b) => a + b, 0), N2 = sqV.reduce((a, b) => a + b, 0);
          const NN = N1 * N2, [k, rs] = sqf(NN);
          const cosTxt = rs === 2 ? `${dp < 0 ? "−" : ""}${M.frac("1", M.sqrt("2"))}` : M.f(new Frac(dp < 0 ? -1 : 1, 2));
          return {
            prompt,
            steps: [
              step1,
              `Lengths: ${norm(bv("u"))} = ${M.sqrt(sumNums(sqU))} = ${M.sqrt(n(N1))} and ${norm(bv("v"))} = ${M.sqrt(sumNums(sqV))} = ${M.sqrt(n(N2))}, so ${norm(bv("u"))} ${norm(bv("v"))} = ${M.sqrt(`${n(N1)} · ${n(N2)}`)} = ${M.sqrt(n(NN))} = ${radTxt(k, rs)}.`,
              `cos ${M.v("θ")} = ${M.frac(`${bv("u")} · ${bv("v")}`, `${norm(bv("u"))} ${norm(bv("v"))}`)} = ${M.frac(n(dp), radTxt(k, rs))} = ${cosTxt}.`,
              `${M.v("θ")} = arccos(${cosTxt}) = ${n(ang)}°.`,
            ],
            answer: { kind: "number", value: ang }, answerText: `${n(ang)}°`, answerInput: String(ang),
            vals: { prods, dp, sqU, sqV, N1, N2, NN, k, rs, ang }, params: { u, v },
          };
        }
      }
      // level 3: work done by a force, or the value that makes two vectors perpendicular
      if (r.chance(0.5)) {
        for (;;) {
          const dim = r.chance(0.5) ? 2 : 3;
          const f = Array.from({ length: dim }, () => r.int(-6, 9)), p = Array.from({ length: dim }, () => r.int(-4, 4)), q = Array.from({ length: dim }, () => r.int(-4, 6));
          const d = q.map((e, i) => e - p[i]), prods = f.map((e, i) => e * d[i]), W = prods.reduce((a, b) => a + b, 0);
          if (W <= 0 || isZero(d)) continue;
          return {
            prompt: `A constant force ${bv("F")} = ${vec(f)} newtons pushes a cart in a straight line from ${M.v("P")} = ${vec(p)} to ${M.v("Q")} = ${vec(q)} (coordinates in meters). How much work does the force do, in joules?`,
            steps: [
              `The displacement is ${bv("d")} = ${M.v("Q")} − ${M.v("P")} = (${q.map((e, i) => `${n(e)} − ${np(p[i])}`).join(", ")}) = ${vec(d)}.`,
              `Work is force dotted with displacement: ${M.v("W")} = ${bv("F")} · ${bv("d")} = ${dotTxt(f, d)}.`,
              `= ${sumNums(prods)} = ${n(W)} J. Only the part of the force along the motion does work.`,
            ],
            ...ansNum(W, " J"), vals: { d, prods, W }, params: { kind: 0, f, p, q },
          };
        }
      }
      for (;;) {
        const j = r.int(0, 2), u = [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)], v = [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)];
        if (v[j] === 0) continue;
        const rest = u.reduce((s, e, i) => (i === j ? s : s + e * v[i]), 0);
        if (rest % v[j] !== 0) continue;
        const k = -rest / v[j];
        if (k === 0 || Math.abs(k) > 9) continue;
        u[j] = k;
        const K = M.v("k"), uTxt = `(${u.map((e, i) => (i === j ? K : n(e))).join(", ")})`;
        const prods = u.map((e, i) => e * v[i]);
        const terms = u.map((e, i) => (i === j ? `${K} · ${np(v[i])}` : `${np(e)} · ${np(v[i])}`)).join(" + ");
        return {
          prompt: `Find the value of ${K} that makes ${bv("u")} = ${uTxt} and ${bv("v")} = ${vec(v)} perpendicular.`,
          steps: [
            `Perpendicular means ${bv("u")} · ${bv("v")} = 0. Here ${bv("u")} · ${bv("v")} = ${terms} = ${lin([v[j], rest], [K, ""])}.`,
            Math.abs(v[j]) === 1 ? `Set it to 0: ${kv(v[j], K)} = ${n(-rest)}, so ${K} = ${n(k)}.` : `Set it to 0: ${kv(v[j], K)} = ${n(-rest)}, so ${K} = ${M.frac(n(-rest), n(v[j]))} = ${n(k)}.`,
            `Check: with ${K} = ${n(k)}, ${bv("u")} · ${bv("v")} = ${sumNums(prods)} = 0.`,
          ],
          ...ansNum(k), vals: { rest, nrest: -rest, k, prods }, params: { kind: 1, j, u: u.map((e, i) => (i === j ? 0 : e)), v },
        };
      }
    },
  };

  // ==== LA.4 Scalar and vector projection =================================================================
  D["LA.projection"] = {
    title: "Scalar and vector projection",
    generate(r, level) {
      if (level === 1) {
        for (;;) {
          const [p, q, c] = r.pick(TRIPLES.slice(0, 2)), swap = r.chance(0.5);
          const a = [r.sign() * (swap ? q : p), r.sign() * (swap ? p : q)], b = [r.int(-6, 6), r.int(-6, 6)];
          const prods = [a[0] * b[0], a[1] * b[1]], ab = prods[0] + prods[1];
          if (ab === 0 || isZero(b)) continue;
          const sq = a.map((e) => e * e), comp = new Frac(ab, c);
          return {
            prompt: `Find the scalar projection of ${bv("b")} = ${vec(b)} onto ${bv("a")} = ${vec(a)}, that is, comp${M.sub("", bv("a"))} ${bv("b")}.`,
            steps: [
              `comp${M.sub("", bv("a"))} ${bv("b")} = ${M.frac(`${bv("a")} · ${bv("b")}`, norm(bv("a")))}. First ${bv("a")} · ${bv("b")} = ${dotTxt(a, b)} = ${sumNums(prods)} = ${n(ab)}.`,
              `${norm(bv("a"))} = ${M.sqrt(`${n(sq[0])} + ${n(sq[1])}`)} = ${n(c)}.`,
              `comp${M.sub("", bv("a"))} ${bv("b")} = ${M.frac(n(ab), n(c))}${comp.d === 1 ? ` = ${n(comp)}` : ""}. It is ${ab > 0 ? "positive: the shadow of b points the same way as a" : "negative: the shadow of b points against a"}.`,
            ],
            ...ansNum(comp), vals: { prods, ab, sq, c, comp: V(comp) }, params: { a, b },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const a = [r.int(-4, 4), r.int(-4, 4)], b = [r.int(-5, 5), r.int(-5, 5)];
          const ab = a[0] * b[0] + a[1] * b[1], aa = a[0] * a[0] + a[1] * a[1];
          if (aa === 0 || ab === 0 || a[0] * b[1] - a[1] * b[0] === 0) continue;
          const t = new Frac(ab, aa), proj = a.map((e) => t.mul(e));
          const line = a[0] !== 0 ? { t: "fn", e: `(${a[1]})/(${a[0]})*x`, role: "muted", dash: true } : { t: "vline", x: 0, role: "muted" };
          return {
            prompt: `Find the vector projection of ${bv("b")} = ${vec(b)} onto ${bv("a")} = ${vec(a)}: the shadow of ${bv("b")} on the dashed line through ${bv("a")}. Enter it as (${M.v("x")}, ${M.v("y")}).`,
            graph: graph({ view: viewFor([a, b]), equal: true, items: [line, arrow(a, "a"), arrow(b, "b", "secondary")] }),
            steps: [
              `${bv("a")} · ${bv("b")} = ${dotTxt(a, b)} = ${n(ab)} and ${bv("a")} · ${bv("a")} = ${dotTxt(a, a)} = ${n(aa)}.`,
              `proj${M.sub("", bv("a"))} ${bv("b")} = ${M.frac(`${bv("a")} · ${bv("b")}`, `${bv("a")} · ${bv("a")}`)} ${bv("a")} = ${M.frac(n(ab), n(aa))}${bv("a")}${t.n !== ab ? ` = ${scal(t)}${bv("a")}` : ""}.`,
              `Scale ${bv("a")}: ${M.f(t)} · ${vec(a)} = ${vec(proj)}.`,
            ],
            ...ansVec(proj), vals: { ab, aa, t: V(t), proj: V(proj) }, params: { a, b },
          };
        }
      }
      // level 3: crosswind on a runway
      for (;;) {
        const a = r.pick([[3, 4], [4, 3], [3, -4], [4, -3]]), t = r.int(2, 6), s = r.nonzero(-5, 5);
        const perp = [-a[1] * s, a[0] * s], b = [t * a[0] + perp[0], t * a[1] + perp[1]];
        const prods = [a[0] * b[0], a[1] * b[1]], ab = prods[0] + prods[1], aa = 25, proj = a.map((e) => t * e);
        const chk = [a[0] * perp[0], a[1] * perp[1]], sq = perp.map((e) => e * e), N = sq[0] + sq[1], speed = 5 * Math.abs(s);
        const line = { t: "fn", e: `(${a[1]})/(${a[0]})*x`, role: "muted", dash: true };
        return {
          prompt: `A runway points along ${bv("a")} = ${vec(a)} (the dashed line). The wind blows with velocity ${bv("b")} = ${vec(b)} km/h. Split the wind into a headwind part along the runway and a crosswind part perpendicular to it. Find the crosswind vector ${M.sub(bv("b"), "⊥")}, in km/h.`,
          graph: graph({ view: viewFor([b, [a[0] * 2, a[1] * 2]]), equal: true, items: [line, arrow(b, "b", "secondary")] }),
          steps: [
            `${bv("a")} · ${bv("b")} = ${dotTxt(a, b)} = ${sumNums(prods)} = ${n(ab)} and ${bv("a")} · ${bv("a")} = ${dotTxt(a, a)} = ${n(aa)}.`,
            `The part along the runway is proj${M.sub("", bv("a"))} ${bv("b")} = ${M.frac(n(ab), n(aa))}${bv("a")} = ${n(t)}${vec(a)} = ${vec(proj)}.`,
            `The crosswind is what is left: ${M.sub(bv("b"), "⊥")} = ${bv("b")} − proj${M.sub("", bv("a"))} ${bv("b")} = (${n(b[0])} − ${np(proj[0])}, ${n(b[1])} − ${np(proj[1])}) = ${vec(perp)}.`,
            `Check: ${bv("a")} · ${M.sub(bv("b"), "⊥")} = ${sumNums(chk)} = 0. The crosswind speed is ${M.sqrt(`${n(sq[0])} + ${n(sq[1])}`)} = ${M.sqrt(n(N))} = ${n(speed)} km/h.`,
          ],
          ...ansVec(perp, " km/h"), vals: { prods, ab, aa, t, proj, perp, chk, sq, N, speed }, params: { a, b },
        };
      }
    },
  };

  // ==== LA.5 Cross product and triple products ===============================================================
  /** The three components of a × b, each as "a₂b₃ − a₃b₂ = … = c₁". */
  function crossLines(a, b) {
    const idx = [[1, 2], [2, 0], [0, 1]], c = cross(a, b);
    const prods = idx.map(([i, j]) => [a[i] * b[j], a[j] * b[i]]);
    const lines = idx.map(([i, j], k) => `${np(a[i])} · ${np(b[j])} − ${np(a[j])} · ${np(b[i])} = ${n(prods[k][0])} − ${np(prods[k][1])} = ${n(c[k])}`);
    return { c, prods, lines };
  }
  D["LA.cross-product"] = {
    title: "Cross product, areas and volumes",
    generate(r, level) {
      if (level === 1) {
        for (;;) {
          const a = [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)], b = [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)];
          const { c, prods, lines } = crossLines(a, b);
          if (isZero(c)) continue;
          const chkA = a.map((e, i) => e * c[i]), chkB = b.map((e, i) => e * c[i]);
          const A = (i) => `${M.v("a")}${sb(i)}`, B = (i) => `${M.v("b")}${sb(i)}`;
          return {
            prompt: `Find ${bv("a")} × ${bv("b")} for ${bv("a")} = ${vec(a)} and ${bv("b")} = ${vec(b)}.`,
            steps: [
              `First component, ${A(2)}${B(3)} − ${A(3)}${B(2)}: ${lines[0]}.`,
              `Second component, ${A(3)}${B(1)} − ${A(1)}${B(3)}: ${lines[1]}.`,
              `Third component, ${A(1)}${B(2)} − ${A(2)}${B(1)}: ${lines[2]}. So ${bv("a")} × ${bv("b")} = ${vec(c)}.`,
              `Check that it is perpendicular to both: ${vec(c)} · ${bv("a")} = ${sumNums(chkA)} = 0 and ${vec(c)} · ${bv("b")} = ${sumNums(chkB)} = 0.`,
            ],
            ...ansVec(c), vals: { prods, c, chkA, chkB }, params: { a, b },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const Pp = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)], Q = [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)], Rr = [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)];
          const e = Q.map((v, i) => v - Pp[i]), f = Rr.map((v, i) => v - Pp[i]);
          const { c, prods, lines } = crossLines(e, f);
          if (isZero(c)) continue;
          const sq = c.map((v) => v * v), N = sq[0] + sq[1] + sq[2], [k, rs] = sqf(N);
          if (N > 200) continue;
          const areaTxt = k % 2 === 0 ? radTxt(k / 2, rs) : rs === 1 ? M.f(new Frac(k, 2)) : M.frac(radTxt(k, rs), "2");
          const kh = new Frac(k, 2);
          return {
            prompt: `Find the area of the triangle with vertices ${M.v("P")} = ${vec(Pp)}, ${M.v("Q")} = ${vec(Q)} and ${M.v("R")} = ${vec(Rr)}. Give an exact answer.`,
            steps: [
              `Two edge vectors from ${M.v("P")}: ${M.v("Q")} − ${M.v("P")} = ${vec(e)} and ${M.v("R")} − ${M.v("P")} = ${vec(f)}.`,
              `Their cross product, component by component: ${lines[0]}; ${lines[1]}; ${lines[2]}. So it is ${vec(c)}.`,
              `Its length is the area of the parallelogram on the two edges: ${M.sqrt(sumNums(sq))} = ${M.sqrt(n(N))}${rs !== N || k !== 1 ? ` = ${radTxt(k, rs)}` : ""}.`,
              `The triangle is half of the parallelogram: area = ${M.frac(radTxt(k, rs), "2")}${k % 2 === 0 ? ` = ${areaTxt}` : ""}.`,
            ],
            answer: { kind: "number", value: Math.sqrt(N) / 2 }, answerText: areaTxt, answerInput: `sqrt(${N})/2`,
            vals: { e, f, prods, c, sq, N, k, rs, kh: V(kh) }, params: { P: Pp, Q, R: Rr },
          };
        }
      }
      // level 3: the volume of a crystal's unit cell
      for (;;) {
        const a = [r.int(2, 5), r.int(-1, 1), r.int(-1, 1)], b = [r.int(-1, 2), r.int(2, 5), r.int(-1, 1)], c3 = [r.int(-1, 2), r.int(-1, 2), r.int(2, 6)];
        const { c: bc, prods, lines } = crossLines(b, c3);
        const tprods = a.map((e, i) => e * bc[i]), trip = tprods.reduce((s, v) => s + v, 0);
        if (trip === 0) continue;
        const vol = Math.abs(trip);
        return {
          prompt: `A crystal's unit cell is the parallelepiped with edge vectors ${bv("a")} = ${vec(a)}, ${bv("b")} = ${vec(b)} and ${bv("c")} = ${vec(c3)}, in ångströms (Å). Find its volume in Å³.`,
          steps: [
            `The volume is |${bv("a")} · (${bv("b")} × ${bv("c")})|, the absolute value of the scalar triple product.`,
            `${bv("b")} × ${bv("c")}, component by component: ${lines[0]}; ${lines[1]}; ${lines[2]}. So ${bv("b")} × ${bv("c")} = ${vec(bc)}.`,
            `${bv("a")} · (${bv("b")} × ${bv("c")}) = ${dotTxt(a, bc)} = ${sumNums(tprods)} = ${n(trip)}.`,
            `Volume = |${n(trip)}| = ${n(vol)} Å³.`,
          ],
          ...ansNum(vol, " Å³"), vals: { prods, bc, tprods, trip, vol }, params: { a, b, c: c3 },
        };
      }
    },
  };

  // ==== LA.6 Subspaces ======================================================================================
  const SUBOPT = [
    "It is a subspace.",
    "It is not a subspace: it does not contain the zero vector.",
    "It is not a subspace: it contains <b>0</b> and is closed under scaling, but not under addition.",
    "It is not a subspace: it contains <b>0</b> and is closed under addition, but not under scaling.",
  ];
  const X1 = `${M.v("x")}₁`, X2 = `${M.v("x")}₂`, Y1 = `${M.v("y")}₁`, Y2 = `${M.v("y")}₂`, Z1 = `${M.v("z")}₁`, Z2 = `${M.v("z")}₂`, Cc = M.v("c");
  D["LA.subspace"] = {
    title: "Is it a subspace?",
    generate(r, level) {
      const ask = (set, where, extra = "") => `Is ${M.eq(`${M.v("W")} = {${set}}`)} a subspace of ${where}?${extra} Choose the correct statement.`;
      if (level === 1) {
        if (r.chance(0.65)) {
          const m = r.nonzero(-3, 3), b = r.chance(0.5) ? 0 : r.nonzero(-4, 4);
          const steps = b !== 0 ? [
            `Test the zero vector first: putting ${x} = 0 into ${y} = ${M.poly([m, b])} gives ${y} = ${n(b)}, not 0. So (0, 0) is not in ${M.v("W")}.`,
            `Every subspace contains <b>0</b>, so ${M.v("W")} is not a subspace: it is a line that misses the origin.`,
          ] : [
            `Zero vector: ${x} = 0 gives ${y} = 0, so (0, 0) is in ${M.v("W")}.`,
            `Addition: if ${Y1} = ${kv(m, X1)} and ${Y2} = ${kv(m, X2)}, then ${Y1} + ${Y2} = ${scal(m)}(${X1} + ${X2}), so the sum is in ${M.v("W")}.`,
            `Scaling: ${Cc}${Y1} = ${scal(m)}(${Cc}${X1}), so ${Cc}(${X1}, ${Y1}) is in ${M.v("W")}.`,
            `All three checks pass: ${M.v("W")} is a subspace (a line through the origin).`,
          ];
          return {
            prompt: ask(`(${x}, ${y}) : ${y} = ${M.poly([m, b])}`, R2, " It is the line in the graph."),
            graph: graph({ view: [-6, 6, -6, 6], items: [{ t: "fn", e: `${m}*x + (${b})` }] }),
            steps, ...ansChoice(SUBOPT, b === 0 ? 0 : 1), vals: {}, params: { kind: 0, m, b },
          };
        }
        const a = r.nonzero(-3, 3), b = r.nonzero(-3, 3), c = r.nonzero(-3, 3), d = r.chance(0.5) ? 0 : r.nonzero(-6, 6);
        const lhs = (s) => lin([a, b, c], [`${x}${s}`, `${y}${s}`, `${z}${s}`]);
        const steps = d !== 0 ? [
          `Test the zero vector first: (0, 0, 0) gives ${lin([a, b, c], [x, y, z])} = 0, not ${n(d)}. So <b>0</b> is not in ${M.v("W")}.`,
          `Every subspace contains <b>0</b>, so ${M.v("W")} is not a subspace: it is a plane that misses the origin.`,
        ] : [
          `Zero vector: (0, 0, 0) gives 0 = 0, so <b>0</b> is in ${M.v("W")}.`,
          `Addition: if ${lhs("₁")} = 0 and ${lhs("₂")} = 0, adding the two equations shows the sum also gives 0.`,
          `Scaling: multiplying ${lhs("₁")} = 0 by ${Cc} gives 0 again, so ${Cc}(${X1}, ${Y1}, ${Z1}) is in ${M.v("W")}.`,
          `All three checks pass: ${M.v("W")} is a subspace (a plane through the origin).`,
        ];
        return {
          prompt: ask(`(${x}, ${y}, ${z}) : ${lin([a, b, c], [x, y, z])} = ${n(d)}`, R3),
          steps, ...ansChoice(SUBOPT, d === 0 ? 0 : 1), vals: {}, params: { kind: 1, a, b, c, d },
        };
      }
      if (level === 2) {
        const kind = r.int(0, 5);
        if (kind === 0) {
          const k = r.int(-3, 3);
          return {
            prompt: ask(`(${x}, ${y}) : ${y} ≥ ${M.poly([k, 0])}`, R2),
            steps: [
              `Zero vector: ${x} = ${y} = 0 gives 0 ≥ 0, which is true, so (0, 0) is in ${M.v("W")}.`,
              `Addition: adding ${Y1} ≥ ${kv(k, X1)} and ${Y2} ≥ ${kv(k, X2)} gives ${Y1} + ${Y2} ≥ ${k === 0 ? "0" : `${scal(k)}(${X1} + ${X2})`}, so sums stay in ${M.v("W")}.`,
              `Scaling: (0, 1) is in ${M.v("W")} because 1 ≥ 0, but (−1)(0, 1) = (0, −1) is not, because −1 ≥ 0 is false. Multiplying by a negative number flips the inequality.`,
              `So ${M.v("W")} (a half-plane) contains <b>0</b> and is closed under addition but not under scaling.`,
            ],
            ...ansChoice(SUBOPT, 3), vals: {}, params: { kind, k },
          };
        }
        if (kind === 1) {
          const a = r.int(-3, 3), b = r.intExcept(-3, 3, a), s = a + b;
          return {
            prompt: ask(`(${x}, ${y}) : ${y} = ${M.poly([a, 0])} or ${y} = ${M.poly([b, 0])}`, R2, " It is the pair of lines in the graph."),
            graph: graph({ view: [-6, 6, -6, 6], items: [{ t: "fn", e: `${a}*x` }, { t: "fn", e: `${b}*x`, role: "secondary" }] }),
            steps: [
              `Zero vector: (0, 0) is on both lines, so it is in ${M.v("W")}.`,
              `Scaling: a multiple of a point on one of the lines stays on that line, so ${M.v("W")} is closed under scaling.`,
              `Addition: (1, ${n(a)}) is on the first line and (1, ${n(b)}) on the second, but their sum (2, ${n(s)}) is on neither: ${n(s)} ≠ 2 · ${np(a)} = ${n(2 * a)} and ${n(s)} ≠ 2 · ${np(b)} = ${n(2 * b)}.`,
              `So ${M.v("W")} contains <b>0</b> and is closed under scaling but not under addition.`,
            ],
            ...ansChoice(SUBOPT, 2), vals: { s, a2: 2 * a, b2: 2 * b }, params: { kind, a, b },
          };
        }
        if (kind === 2) {
          return {
            prompt: ask(`(${x}, ${y}) : ${x} and ${y} are both integers`, R2),
            steps: [
              `Zero vector: 0 is an integer, so (0, 0) is in ${M.v("W")}.`,
              `Addition: sums of integers are integers, so ${M.v("W")} is closed under addition.`,
              `Scaling: (1, 0) is in ${M.v("W")}, but ${M.frac("1", "2")}(1, 0) = (${M.frac("1", "2")}, 0) is not. Scalars can be any real numbers.`,
              `So ${M.v("W")} contains <b>0</b> and is closed under addition but not under scaling.`,
            ],
            ...ansChoice(SUBOPT, 3), vals: {}, params: { kind },
          };
        }
        if (kind === 3) {
          const a = r.nonzero(-4, 4), b = r.nonzero(-4, 4);
          return {
            prompt: ask(`(${x}, ${y}, ${z}) : ${z} = ${lin([a, b], [x, y])}`, R3),
            steps: [
              `Zero vector: ${x} = ${y} = 0 gives ${z} = 0, so (0, 0, 0) is in ${M.v("W")}.`,
              `Addition: if ${Z1} = ${lin([a, b], [X1, Y1])} and ${Z2} = ${lin([a, b], [X2, Y2])}, then ${Z1} + ${Z2} = ${lin([a, b], [`(${X1} + ${X2})`, `(${Y1} + ${Y2})`])}, so the sum is in ${M.v("W")}.`,
              `Scaling: ${Cc}${Z1} = ${lin([a, b], [`(${Cc}${X1})`, `(${Cc}${Y1})`])}, so ${Cc}(${X1}, ${Y1}, ${Z1}) is in ${M.v("W")}.`,
              `All three checks pass: ${M.v("W")} is a subspace (a plane through the origin).`,
            ],
            ...ansChoice(SUBOPT, 0), vals: {}, params: { kind, a, b },
          };
        }
        if (kind === 4) {
          return {
            prompt: ask(`(${x}, ${y}) : ${x} ≥ 0 and ${y} ≥ 0`, R2, " This is the first quadrant."),
            steps: [
              `Zero vector: 0 ≥ 0, so (0, 0) is in ${M.v("W")}.`,
              `Addition: sums of nonnegative numbers are nonnegative, so ${M.v("W")} is closed under addition.`,
              `Scaling: (1, 1) is in ${M.v("W")}, but (−1)(1, 1) = (−1, −1) is not.`,
              `So ${M.v("W")} contains <b>0</b> and is closed under addition but not under scaling.`,
            ],
            ...ansChoice(SUBOPT, 3), vals: {}, params: { kind },
          };
        }
        return {
          prompt: ask(`(${x}, ${y}, ${z}) : ${x} = 0 or ${y} = 0`, R3, " This is two coordinate planes together."),
          steps: [
            `Zero vector: (0, 0, 0) has ${x} = 0, so it is in ${M.v("W")}.`,
            `Scaling: if ${x} = 0 then ${Cc}${x} = 0, and likewise for ${y}, so ${M.v("W")} is closed under scaling.`,
            `Addition: (0, 1, 0) and (1, 0, 0) are in ${M.v("W")}, but their sum (1, 1, 0) has ${x} ≠ 0 and ${y} ≠ 0.`,
            `So ${M.v("W")} contains <b>0</b> and is closed under scaling but not under addition.`,
          ],
          ...ansChoice(SUBOPT, 2), vals: {}, params: { kind: 5 },
        };
      }
      // level 3: the orthogonal complement of a plane
      for (;;) {
        const u = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)], v = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
        const { c, prods, lines } = crossLines(u, v);
        if (isZero(c) || c[1] === 0 || (c[0] === 0 && c[2] === 0)) continue;
        const g = igcd(c), w = c.map((e) => e / g), e = [w[0], -w[1], w[2]];
        const cands = [w, u, v, e];
        if (cands.some((p, i) => cands.some((q, j) => j < i && eqv(p, q)))) continue;
        const order = r.shuffle([0, 1, 2, 3]), options = order.map((i) => vec(cands[i])), index = order.indexOf(0);
        const cu = w.map((e2, i) => e2 * u[i]), cv = w.map((e2, i) => e2 * v[i]);
        return {
          prompt: `${M.v("W")} = span{${bv("u")}, ${bv("v")}} with ${bv("u")} = ${vec(u)} and ${bv("v")} = ${vec(v)} is a plane through the origin in ${R3}. Which vector spans its orthogonal complement ${M.sup(M.v("W"), "⊥")}?`,
          steps: [
            `${M.v("W")} is a plane, so dim ${M.v("W")} = 2 and dim ${M.sup(M.v("W"), "⊥")} = 3 − 2 = 1: ${M.sup(M.v("W"), "⊥")} is a line through the origin.`,
            `A vector is in ${M.sup(M.v("W"), "⊥")} when it is perpendicular to both ${bv("u")} and ${bv("v")}, and ${bv("u")} × ${bv("v")} is. Components: ${lines[0]}; ${lines[1]}; ${lines[2]}. So ${bv("u")} × ${bv("v")} = ${vec(c)}.`,
            g > 1 ? `Divide by ${n(g)}: ${vec(w)} spans the same line.` : `It already has no common factor: ${vec(w)}.`,
            `Check: ${vec(w)} · ${bv("u")} = ${sumNums(cu)} = 0 and ${vec(w)} · ${bv("v")} = ${sumNums(cv)} = 0. (${bv("u")} and ${bv("v")} lie in ${M.v("W")} itself, not in ${M.sup(M.v("W"), "⊥")}.)`,
          ],
          ...ansChoice(options, index), vals: { prods, c, g, w, e, cu, cv }, params: { u, v, order }, consts: [3],
        };
      }
    },
  };

  // ==== LA.7 Span, independence, basis =======================================================================
  D["LA.2"] = {
    title: "Linear independence and bases",
    generate(r, level) {
      if (level === 1) {
        for (;;) {
          const v1 = [r.int(-4, 4), r.int(-4, 4)];
          if (isZero(v1)) continue;
          const dep = r.chance(0.5), k = r.pick([-3, -2, -1, 2, 3]);
          const v2 = dep ? v1.map((e) => k * e) : [r.int(-4, 4), r.int(-4, 4)];
          if (isZero(v2) || Math.max(...v2.map(Math.abs)) > 9) continue;
          const ad = v1[0] * v2[1], cb = v2[0] * v1[1], Dt = ad - cb;
          if (!dep && Dt === 0) continue;
          const options = [`Independent: they form a basis of ${R2}`, `Dependent: one is a multiple of the other`];
          return {
            prompt: `Are ${bv("v", 1)} = ${vec(v1)} and ${bv("v", 2)} = ${vec(v2)} (drawn in the graph) linearly independent?`,
            graph: graph({ view: viewFor([v1, v2]), equal: true, items: [arrow(v1, "v₁"), arrow(v2, "v₂", "secondary")] }),
            steps: [
              `Put the vectors in the columns of a matrix: ${mat([[v1[0], v2[0]], [v1[1], v2[1]]])}.`,
              `Its determinant is ${np(v1[0])} · ${np(v2[1])} − ${np(v2[0])} · ${np(v1[1])} = ${n(ad)} − ${np(cb)} = ${n(Dt)}.`,
              Dt !== 0 ? `The determinant is not 0, so the vectors are independent; two independent vectors in ${R2} form a basis.`
                : `The determinant is 0, so the vectors are dependent: indeed ${bv("v", 2)} = ${scal(k)}${bv("v", 1)}, and both arrows lie on one line.`,
            ],
            ...ansChoice(options, Dt !== 0 ? 0 : 1), vals: { ad, cb, Dt }, params: { v1, v2, dep: dep ? 1 : 0, k },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const v1 = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)], v2 = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
          if (isZero(cross(v1, v2))) continue;
          const dep = r.chance(0.5), al = r.nonzero(-2, 2), be = r.nonzero(-2, 2);
          const v3 = dep ? v1.map((e, i) => al * e + be * v2[i]) : [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
          const A = [0, 1, 2].map((i) => [v1[i], v2[i], v3[i]]);
          const d3 = det3Lines(A);
          if (!dep && d3.det.n === 0) continue;
          const options = [`Independent: they form a basis of ${R3}`, `Dependent`];
          return {
            prompt: `Are ${bv("v", 1)} = ${vec(v1)}, ${bv("v", 2)} = ${vec(v2)} and ${bv("v", 3)} = ${vec(v3)} linearly independent?`,
            steps: [
              `Three vectors in ${R3} are independent exactly when the matrix with them as columns has a nonzero determinant: ${mat(A)}.`,
              ...d3.lines,
              d3.det.n !== 0 ? `The determinant is not 0, so the vectors are independent and form a basis of ${R3}.`
                : `The determinant is 0, so the vectors are dependent: indeed ${bv("v", 3)} = ${lin([al, be], [bv("v", 1), bv("v", 2)])}.`,
            ],
            ...ansChoice(options, d3.det.n !== 0 ? 0 : 1), vals: d3.vals, params: { v1, v2, v3, dep: dep ? 1 : 0, al, be },
          };
        }
      }
      // level 3: the value of k that makes three vectors dependent
      for (;;) {
        const j = r.int(0, 2), A = [0, 1, 2].map(() => [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)]);
        const m = [0, 1, 2].map((c) => det2(minor(A, 0, c)).n), sg = [1, -1, 1];
        const coefK = sg[j] * m[j];
        if (coefK === 0) continue;
        const rest = [0, 1, 2].reduce((s, c) => (c === j ? s : s + sg[c] * A[0][c] * m[c]), 0);
        if (rest % coefK !== 0) continue;
        const k = -rest / coefK;
        if (k === 0 || Math.abs(k) > 9) continue;
        const K = M.v("k"), Ak = A.map((row, i) => row.map((e, c) => (i === 0 && c === j ? K : e)));
        const vs = [0, 1, 2].map((c) => `(${Ak.map((row) => (typeof row[c] === "string" ? row[c] : n(row[c]))).join(", ")})`);
        const mt = (c) => { const B = minor(A, 0, c); return `${np(B[0][0])} · ${np(B[1][1])} − ${np(B[0][1])} · ${np(B[1][0])} = ${n(m[c])}`; };
        const first = (c) => (c === j ? K : np(A[0][c]));
        return {
          prompt: `For which value of ${K} are ${bv("v", 1)} = ${vs[0]}, ${bv("v", 2)} = ${vs[1]} and ${bv("v", 3)} = ${vs[2]} linearly dependent?`,
          steps: [
            `They are dependent exactly when the matrix with them as columns has determinant 0: ${mat(Ak)}.`,
            `Expand along the first row (it holds ${K}). The minors are ${M.v("M")}₁₁ = ${mt(0)}, ${M.v("M")}₁₂ = ${mt(1)} and ${M.v("M")}₁₃ = ${mt(2)}.`,
            `det = ${first(0)} · ${np(m[0])} − ${first(1)} · ${np(m[1])} + ${first(2)} · ${np(m[2])} = ${lin([coefK, rest], [K, ""])}.`,
            `Set it to 0: ${kv(coefK, K)} = ${n(-rest)}, so ${K} = ${M.frac(n(-rest), n(coefK))} = ${n(k)}.`,
          ],
          ...ansNum(k), vals: { m, coefK, rest, nrest: -rest, k }, params: { A: A.map((row, i) => row.map((e, c) => (i === 0 && c === j ? 0 : e))), j },
        };
      }
    },
  };

  // ==== LA.8 Change of basis ==================================================================================
  D["LA.3"] = {
    title: "Coordinates in a new basis",
    generate(r, level) {
      const B1 = bv("b", 1), B2 = bv("b", 2), vB = `[${bv("v")}]${M.sub("", "B")}`;
      if (level === 1) {
        for (;;) {
          const b1 = [r.int(-3, 3), r.int(-3, 3)], b2 = [r.int(-3, 3), r.int(-3, 3)], c = [r.nonzero(-3, 3), r.nonzero(-3, 3)];
          if (b1[0] * b2[1] - b1[1] * b2[0] === 0) continue;
          const s1 = b1.map((e) => c[0] * e), s2 = b2.map((e) => c[1] * e), v = [s1[0] + s2[0], s1[1] + s2[1]];
          return {
            prompt: `A basis of ${R2} is ${M.v("B")} = {${B1}, ${B2}} with ${B1} = ${vec(b1)} and ${B2} = ${vec(b2)} (in the graph). A vector has coordinates ${vB} = ${vec(c)} in this basis. Find ${bv("v")} in ordinary coordinates.`,
            graph: graph({ view: viewFor([b1, b2]), equal: true, items: [arrow(b1, "b₁"), arrow(b2, "b₂", "secondary")] }),
            steps: [
              `Coordinates are weights: ${bv("v")} = ${scal(c[0])}${B1} ${c[1] < 0 ? "−" : "+"} ${scal(Math.abs(c[1]))}${B2}, which is ${M.v("P")}${vB} with ${M.v("P")} = ${mat([[b1[0], b2[0]], [b1[1], b2[1]]])}.`,
              `${scal(c[0])}${vec(b1)} = ${vec(s1)} and ${scal(c[1])}${vec(b2)} = ${vec(s2)}.`,
              `Add: ${bv("v")} = (${n(s1[0])} + ${np(s2[0])}, ${n(s1[1])} + ${np(s2[1])}) = ${vec(v)}.`,
            ],
            ...ansVec(v), vals: { s1, s2, v }, params: { b1, b2, c },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const b1 = [r.int(-3, 3), r.int(-3, 3)], b2 = [r.int(-3, 3), r.int(-3, 3)], c = [r.nonzero(-4, 4), r.nonzero(-4, 4)];
          const Dt = b1[0] * b2[1] - b2[0] * b1[1];
          if (Dt === 0 || Math.abs(Dt) > 3) continue;
          const v = [c[0] * b1[0] + c[1] * b2[0], c[0] * b1[1] + c[1] * b2[1]];
          if (Math.max(...v.map(Math.abs)) > 12) continue;
          const Pm = [[b1[0], b2[0]], [b1[1], b2[1]]], adj = intv2(adj2(Pm)), w = intv(mvm(adj, v));
          return {
            prompt: `A basis of ${R2} is ${M.v("B")} = {${B1}, ${B2}} with ${B1} = ${vec(b1)} and ${B2} = ${vec(b2)}. Find the coordinates ${vB} of ${bv("v")} = ${vec(v)} in this basis.`,
            graph: graph({ view: viewFor([b1, b2, v]), equal: true, items: [arrow(b1, "b₁"), arrow(b2, "b₂"), arrow(v, "v", "secondary")] }),
            steps: [
              `${M.v("P")} = [${B1} ${B2}] = ${mat(Pm)} turns ${M.v("B")}-coordinates into ordinary ones, so ${vB} = ${iv(M.v("P"))}${bv("v")}. Its determinant is ${np(b1[0])} · ${np(b2[1])} − ${np(b2[0])} · ${np(b1[1])} = ${n(Dt)}.`,
              `Swap the diagonal, negate the other two entries and divide by the determinant: ${iv(M.v("P"))} = ${scal(new Frac(1, Dt))}${mat(adj)}.`,
              `${vB} = ${scal(new Frac(1, Dt))}(${dotTxt(adj[0], v)}, ${dotTxt(adj[1], v)}) = ${scal(new Frac(1, Dt))}${vec(w)} = ${vec(c)}.`,
              `Check: ${scal(c[0])}${vec(b1)} ${c[1] < 0 ? "−" : "+"} ${scal(Math.abs(c[1]))}${vec(b2)} = ${vec(v)}.`,
            ],
            ...ansVec(c), vals: { Dt, adj, w, c }, params: { b1, b2, v },
          };
        }
      }
      // level 3: the matrix of a map in a new basis, P⁻¹AP
      for (;;) {
        const Pm = unimod2(r), A = [[r.int(-3, 4), r.int(-3, 4)], [r.int(-3, 4), r.int(-3, 4)]];
        const Pi = inv2(Pm), AP = mmul(A, Pm), Bm = mmul(Pi, AP);
        if (maxAbs(Bm) > 30 || maxAbs(AP) > 20) continue;
        const trA = A[0][0] + A[1][1], dA = det2(A).n;
        const trB = Bm[0][0].add(Bm[1][1]), dB = det2(Bm);
        return {
          prompt: `The map ${M.v("T")}(${bv("x")}) = ${M.v("A")}${bv("x")} has ${M.v("A")} = ${mat(A)}. A new basis ${M.v("B")} has the columns of ${M.v("P")} = ${mat(Pm)}. Find the matrix of ${M.v("T")} in this basis, ${iv(M.v("P"))}${M.v("A")}${M.v("P")}. ${entriesNote(4)}`,
          steps: [
            `det ${M.v("P")} = ${n(det2(Pm))}, so ${iv(M.v("P"))} = ${mat(Pi)} (swap the diagonal, negate the rest, divide by ${n(det2(Pm))}).`,
            `${M.v("A")}${M.v("P")} = ${mat(AP)}.`,
            `${iv(M.v("P"))}(${M.v("A")}${M.v("P")}) = ${mat(Bm)}.`,
            `Check with similarity invariants: both have trace ${n(trA)} and determinant ${n(dA)}.`,
          ],
          ...ansMat(Bm), vals: { Pi: V(Pi), AP: V(AP), Bm: V(Bm), trA, dA, trB: V(trB), dB: V(dB), dP: det2(Pm).n }, params: { A, P: Pm },
        };
      }
    },
  };

  // ==== LA.9 Linear transformations ==============================================================================
  D["LA.4"] = {
    title: "Linear maps and their matrices",
    generate(r, level) {
      const E1 = bv("e", 1), E2 = bv("e", 2), T = M.v("T");
      if (level === 1) {
        for (;;) {
          const t1 = [r.int(-3, 4), r.int(-3, 4)], t2 = [r.int(-3, 4), r.int(-3, 4)], v = [r.nonzero(-3, 4), r.nonzero(-3, 4)];
          if (isZero(t1) || isZero(t2)) continue;
          const s1 = t1.map((e) => v[0] * e), s2 = t2.map((e) => v[1] * e), res = [s1[0] + s2[0], s1[1] + s2[1]];
          return {
            prompt: `A linear map ${T} sends ${E1} = (1, 0) to ${vec(t1)} and ${E2} = (0, 1) to ${vec(t2)}. Find ${T}${vec(v)}.`,
            steps: [
              `The matrix of ${T} has ${T}(${E1}) and ${T}(${E2}) as its columns: ${M.v("A")} = ${mat([[t1[0], t2[0]], [t1[1], t2[1]]])}.`,
              `${vec(v)} = ${lin(v, [E1, E2])}, so by linearity ${T}${vec(v)} = ${scal(v[0])}${vec(t1)} ${v[1] < 0 ? "−" : "+"} ${scal(Math.abs(v[1]))}${vec(t2)} = ${vec(s1)} + ${vec(s2)}.`,
              `= ${vec(res)}.`,
            ],
            ...ansVec(res), vals: { s1, s2, res }, params: { t1, t2, v },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const t1 = [r.int(-3, 3), r.int(-3, 3)], t2 = [r.int(-3, 3), r.int(-3, 3)], w = r.int(1, 4), h = r.int(1, 4);
          const ad = t1[0] * t2[1], bc = t2[0] * t1[1], Dt = ad - bc;
          if (Dt === 0 || isZero(t1) || isZero(t2)) continue;
          const ab = Math.abs(Dt), area = w * h, img = ab * area;
          const sum = [t1[0] + t2[0], t1[1] + t2[1]];
          return {
            prompt: `The arrows show where a linear map ${T} sends ${E1} and ${E2}; the shaded parallelogram is the image of the unit square. ${T} is applied to a rectangle of width ${n(w)} and height ${n(h)}. What is the area of the image?`,
            graph: graph({ view: viewFor([t1, t2, sum]), equal: true, items: [{ t: "poly", p: [[0, 0], t1, sum, t2], role: "muted" }, arrow(t1, "T(e₁)"), arrow(t2, "T(e₂)", "secondary")] }),
            steps: [
              `Read the arrows: ${T}(${E1}) = ${vec(t1)} and ${T}(${E2}) = ${vec(t2)}, so ${M.v("A")} = ${mat([[t1[0], t2[0]], [t1[1], t2[1]]])}.`,
              `det ${M.v("A")} = ${np(t1[0])} · ${np(t2[1])} − ${np(t2[0])} · ${np(t1[1])} = ${n(ad)} − ${np(bc)} = ${n(Dt)}. Every area is multiplied by |det ${M.v("A")}| = ${n(ab)}${Dt < 0 ? " (the negative sign only means the map flips orientation)" : ""}.`,
              `The rectangle's area is ${n(w)} · ${n(h)} = ${n(area)}, so its image has area ${n(ab)} · ${n(area)} = ${n(img)}.`,
            ],
            ...ansNum(img), vals: { ad, bc, Dt, ab, area, img }, params: { t1, t2, w, h },
          };
        }
      }
      // level 3: use linearity from the images of a non-standard basis
      for (;;) {
        const u = [r.int(-2, 3), r.int(-2, 3)], v = [r.int(-2, 3), r.int(-2, 3)], al = r.nonzero(-3, 3), be = r.nonzero(-3, 3);
        const Dt = u[0] * v[1] - v[0] * u[1];
        if (Dt === 0) continue;
        const p = [r.int(-4, 4), r.int(-4, 4)], q = [r.int(-4, 4), r.int(-4, 4)];
        if (isZero(p) || isZero(q)) continue;
        const w = [al * u[0] + be * v[0], al * u[1] + be * v[1]];
        const num1 = w[0] * v[1] - v[0] * w[1], num2 = u[0] * w[1] - w[0] * u[1];
        const sp = p.map((e) => al * e), sq = q.map((e) => be * e), res = [sp[0] + sq[0], sp[1] + sq[1]];
        const A_ = M.v("α"), B_ = M.v("β");
        return {
          prompt: `A linear map ${T} satisfies ${T}${vec(u)} = ${vec(p)} and ${T}${vec(v)} = ${vec(q)}. Find ${T}${vec(w)}.`,
          steps: [
            `Write ${vec(w)} = ${A_}${vec(u)} + ${B_}${vec(v)}; then linearity gives ${T}${vec(w)} = ${A_}${vec(p)} + ${B_}${vec(q)}. Componentwise: ${M.eq(`${lin([u[0], v[0]], [A_, B_])} = ${n(w[0])}`)}${M.eq(`${lin([u[1], v[1]], [A_, B_])} = ${n(w[1])}`)}`,
            `The determinant is ${np(u[0])} · ${np(v[1])} − ${np(v[0])} · ${np(u[1])} = ${n(Dt)}. Cramer's rule: ${A_} = ${M.frac(n(num1), n(Dt))} = ${n(al)} and ${B_} = ${M.frac(n(num2), n(Dt))} = ${n(be)}.`,
            `${T}${vec(w)} = ${scal(al)}${vec(p)} ${be < 0 ? "−" : "+"} ${scal(Math.abs(be))}${vec(q)} = ${vec(sp)} + ${vec(sq)} = ${vec(res)}.`,
          ],
          ...ansVec(res), vals: { Dt, num1, num2, al, be, sp, sq, res }, params: { u, v, p, q, w },
        };
      }
    },
  };

  // ==== LA.10 Matrix multiplication ==============================================================================
  D["LA.matmul"] = {
    title: "Matrix multiplication",
    generate(r, level) {
      if (level === 1) {
        const A = [[r.int(-4, 5), r.int(-4, 5)], [r.int(-4, 5), r.int(-4, 5)]], v = [r.int(-4, 5), r.int(-4, 5)];
        const prods = A.map((row) => row.map((e, k) => e * v[k])), res = prods.map((p) => p[0] + p[1]);
        return {
          prompt: `Compute ${M.v("A")}${bv("x")} for ${M.v("A")} = ${mat(A)} and ${bv("x")} = ${col(v)}. Enter the result as (${M.v("a")}, ${M.v("b")}).`,
          steps: [
            `Each entry of ${M.v("A")}${bv("x")} is a row of ${M.v("A")} dotted with ${bv("x")}. First row: ${dotTxt(A[0], v)} = ${sumNums(prods[0])} = ${n(res[0])}.`,
            `Second row: ${dotTxt(A[1], v)} = ${sumNums(prods[1])} = ${n(res[1])}. So ${M.v("A")}${bv("x")} = ${col(res)}.`,
          ],
          ...ansVec(res), vals: { prods, res }, params: { A, v },
        };
      }
      if (level === 2) {
        const A = [[r.int(-4, 4), r.int(-4, 4)], [r.int(-4, 4), r.int(-4, 4)]], B = [[r.int(-4, 4), r.int(-4, 4)], [r.int(-4, 4), r.int(-4, 4)]];
        const C = intv2(mmul(A, B)), cols = trn(B);
        const ent = (i, j) => `(${M.v("A")}${M.v("B")})${sb(`${i + 1}${j + 1}`)} = ${dotTxt(A[i], cols[j])} = ${n(C[i][j])}`;
        return {
          prompt: `Compute ${M.v("A")}${M.v("B")} for ${M.v("A")} = ${mat(A)} and ${M.v("B")} = ${mat(B)}. ${entriesNote(4)}`,
          steps: [
            `Entry (${M.v("i")}, ${M.v("j")}) of ${M.v("A")}${M.v("B")} is row ${M.v("i")} of ${M.v("A")} dotted with column ${M.v("j")} of ${M.v("B")}.`,
            `${ent(0, 0)}; ${ent(0, 1)}.`,
            `${ent(1, 0)}; ${ent(1, 1)}.`,
            `${M.v("A")}${M.v("B")} = ${mat(C)}.`,
          ],
          ...ansMat(C), vals: { C }, params: { A, B },
        };
      }
      // level 3: revenue of two stores, (2 × 3)(3 × 1)
      const items = r.pick([["coffees", "teas", "muffins"], ["notebooks", "pens", "folders"], ["tacos", "burritos", "drinks"]]);
      const Q = [[r.int(2, 12) * 5, r.int(2, 12) * 5, r.int(2, 12) * 5], [r.int(2, 12) * 5, r.int(2, 12) * 5, r.int(2, 12) * 5]], p = [r.int(2, 6), r.int(1, 5), r.int(2, 7)];
      const prods = Q.map((row) => row.map((e, k) => e * p[k])), rev = prods.map((s) => s[0] + s[1] + s[2]);
      return {
        prompt: `Two stores sold ${items[0]}, ${items[1]} and ${items[2]} today. Row ${M.v("i")} of ${M.v("Q")} = ${mat(Q)} holds store ${M.v("i")}'s sales of each, and ${bv("p")} = ${col(p)} holds the prices in dollars. Compute the revenue vector ${M.v("Q")}${bv("p")}. Enter (store 1, store 2) in dollars.`,
        steps: [
          `${M.v("Q")} is 2 × 3 and ${bv("p")} is 3 × 1. The inner sizes match, so ${M.v("Q")}${bv("p")} is 2 × 1: one revenue per store.`,
          `Store 1: ${dotTxt(Q[0], p)} = ${sumNums(prods[0])} = ${n(rev[0])} dollars.`,
          `Store 2: ${dotTxt(Q[1], p)} = ${sumNums(prods[1])} = ${n(rev[1])} dollars.`,
        ],
        ...ansVec(rev), answerText: `${vec(rev)}: $${n(rev[0])} and $${n(rev[1])}`, vals: { prods, rev }, params: { Q, p }, consts: [3],
      };
    },
  };

  // ==== LA.11 Matrix algebra rules ===================================================================================
  D["LA.14"] = {
    title: "Transposes, inverses and the order of products",
    generate(r, level) {
      const A = M.v("A"), B = M.v("B");
      if (level === 1) {
        const c = r.int(2, 3), Am = [0, 1].map(() => [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)]), Bm = [0, 1].map(() => [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)]);
        const cA = intv2(msc(c, Am)), S = intv2(madd(cA, Bm)), St = trn(S);
        return {
          prompt: `Let ${A} = ${mat(Am)} and ${B} = ${mat(Bm)}. Find ${tp(`(${n(c)}${A} + ${B})`)}. ${entriesNote(6)}`,
          steps: [
            `Scale: ${n(c)}${A} = ${mat(cA)}.`,
            `Add ${B} entry by entry: ${n(c)}${A} + ${B} = ${mat(S)}.`,
            `Transpose: rows become columns, so the 2 × 3 matrix becomes 3 × 2: ${mat(St)}. (The same as ${n(c)}${tp(A)} + ${tp(B)}: transposing is linear.)`,
          ],
          ...ansMat(St), vals: { cA, S, St }, params: { c, A: Am, B: Bm }, consts: [3],
        };
      }
      if (level === 2) {
        for (;;) {
          const X = unimod2(r), Y = unimod2(r), kind = r.int(0, 1);
          const Z = intv2(mmul(Y, X));
          if (maxAbs(Z) > 20) continue;
          const [nx, ny, want, rule] = kind === 0
            ? [iv(A), iv(B), iv(`(${A}${B})`), `${iv(`(${A}${B})`)} = ${iv(B)}${iv(A)}: to undo “${B}, then ${A}”, undo ${A} first`]
            : [tp(A), tp(B), tp(`(${A}${B})`), `${tp(`(${A}${B})`)} = ${tp(B)}${tp(A)}: the transpose of a product reverses the order`];
          const cols = trn(X);
          const ent = (i, j) => `${dotTxt(Y[i], cols[j])} = ${n(Z[i][j])}`;
          return {
            prompt: `You know ${nx} = ${mat(X)} and ${ny} = ${mat(Y)}. Find ${want}. ${entriesNote(4)}`,
            steps: [
              `${rule}. So multiply ${ny} by ${nx}, in that order.`,
              `Row 1: ${ent(0, 0)} and ${ent(0, 1)}.`,
              `Row 2: ${ent(1, 0)} and ${ent(1, 1)}.`,
              `${want} = ${mat(Z)}.`,
            ],
            ...ansMat(Z), vals: { Z }, params: { X, Y, kind },
          };
        }
      }
      // level 3: (A + B)² is not A² + 2AB + B²
      for (;;) {
        const Am = [[r.int(-3, 3), r.int(-3, 3)], [r.int(-3, 3), r.int(-3, 3)]], Bm = [[r.int(-3, 3), r.int(-3, 3)], [r.int(-3, 3), r.int(-3, 3)]];
        const AB = intv2(mmul(Am, Bm)), BA = intv2(mmul(Bm, Am)), Dm = intv2(msub(BA, AB));
        if (isZero(flat(Dm))) continue;
        return {
          prompt: `Let ${A} = ${mat(Am)} and ${B} = ${mat(Bm)}. Compute ${M.sup(`(${A} + ${B})`, 2)} − (${M.sup(A, 2)} + 2${A}${B} + ${M.sup(B, 2)}). ${entriesNote(4)}`,
          steps: [
            `Expand carefully, keeping the order: ${M.sup(`(${A} + ${B})`, 2)} = (${A} + ${B})(${A} + ${B}) = ${M.sup(A, 2)} + ${A}${B} + ${B}${A} + ${M.sup(B, 2)}.`,
            `Subtracting ${M.sup(A, 2)} + 2${A}${B} + ${M.sup(B, 2)} leaves ${B}${A} − ${A}${B}, which is not 0 when ${A} and ${B} do not commute.`,
            `${A}${B} = ${mat(AB)} and ${B}${A} = ${mat(BA)}.`,
            `${B}${A} − ${A}${B} = ${mat(Dm)}.`,
          ],
          ...ansMat(Dm), vals: { AB, BA, Dm }, params: { A: Am, B: Bm },
        };
      }
    },
  };

  // ==== LA.12 Other products =====================================================================================
  D["LA.16"] = {
    title: "Outer, Hadamard, Kronecker and block products",
    generate(r, level) {
      const A = M.v("A"), B = M.v("B");
      if (level === 1) {
        if (r.chance(0.5)) {
          const Am = [[r.int(-4, 5), r.int(-4, 5)], [r.int(-4, 5), r.int(-4, 5)]], Bm = [[r.int(-4, 5), r.int(-4, 5)], [r.int(-4, 5), r.int(-4, 5)]];
          const H = Am.map((row, i) => row.map((e, j) => e * Bm[i][j]));
          return {
            prompt: `Find the Hadamard (entrywise) product ${A} ⊙ ${B} for ${A} = ${mat(Am)} and ${B} = ${mat(Bm)}. ${entriesNote(4)}`,
            steps: [
              `The Hadamard product multiplies matching entries; it is not the matrix product.`,
              `${[0, 1].map((i) => [0, 1].map((j) => `${np(Am[i][j])} · ${np(Bm[i][j])} = ${n(H[i][j])}`).join(", ")).join("; ")}. So ${A} ⊙ ${B} = ${mat(H)}.`,
            ],
            ...ansMat(H), vals: { H }, params: { kind: 0, A: Am, B: Bm },
          };
        }
        const u = [r.nonzero(-4, 4), r.nonzero(-4, 4)], v = [r.int(-4, 5), r.int(-4, 5), r.int(-4, 5)];
        const O = u.map((a) => v.map((b) => a * b));
        return {
          prompt: `Find the outer product ${bv("u")}${tp(bv("v"))} for ${bv("u")} = ${col(u)} and ${bv("v")} = ${col(v)}. ${entriesNote(6)}`,
          steps: [
            `${bv("u")} is 2 × 1 and ${tp(bv("v"))} is 1 × 3, so ${bv("u")}${tp(bv("v"))} is 2 × 3, with entry (${M.v("i")}, ${M.v("j")}) equal to ${M.sub(M.v("u"), M.v("i"))}${M.sub(M.v("v"), M.v("j"))}.`,
            `Row 1 is ${n(u[0])}${tp(bv("v"))} = ${vec(O[0])}; row 2 is ${n(u[1])}${tp(bv("v"))} = ${vec(O[1])}. So ${bv("u")}${tp(bv("v"))} = ${mat(O)}.`,
          ],
          ...ansMat(O), vals: { O }, params: { kind: 1, u, v }, consts: [3],
        };
      }
      if (level === 2) {
        const Am = [[r.nonzero(-3, 4), r.nonzero(-3, 4)], [r.nonzero(-3, 4), r.nonzero(-3, 4)]], Bm = [[r.int(-3, 5), r.int(-3, 5)], [r.int(-3, 5), r.int(-3, 5)]];
        const i = r.int(1, 4), j = r.int(1, 4), bi = Math.ceil(i / 2), bj = Math.ceil(j / 2), ii = i - 2 * (bi - 1), jj = j - 2 * (bj - 1);
        const a = Am[bi - 1][bj - 1], b = Bm[ii - 1][jj - 1], e = a * b;
        const blocks = mat([[`${M.v("a")}₁₁${B}`, `${M.v("a")}₁₂${B}`], [`${M.v("a")}₂₁${B}`, `${M.v("a")}₂₂${B}`]]);
        return {
          prompt: `Let ${A} = ${mat(Am)} and ${B} = ${mat(Bm)}. Find the entry in row ${n(i)}, column ${n(j)} of the Kronecker product ${A} ⊗ ${B}.`,
          steps: [
            `${A} ⊗ ${B} = ${blocks}: each entry of ${A} becomes that multiple of the whole block ${B}, so the result is 4 × 4.`,
            `Row ${n(i)} is row ${n(ii)} of block row ${n(bi)}; column ${n(j)} is column ${n(jj)} of block column ${n(bj)}. The block there is ${M.v("a")}${sb(`${bi}${bj}`)}${B} = ${scal(a)}${B}, and inside it we need ${B}'s entry (${n(ii)}, ${n(jj)}), which is ${n(b)}.`,
            `The entry is ${np(a)} · ${np(b)} = ${n(e)}.`,
          ],
          ...ansNum(e), vals: { bi, bj, ii, jj, a, b, e }, params: { A: Am, B: Bm, i, j }, consts: [4],
        };
      }
      // level 3: block multiplication
      const rnd = () => [[r.int(-2, 3), r.int(-2, 3)], [r.int(-2, 3), r.int(-2, 3)]];
      const Am = rnd(), Bm = rnd(), Em = rnd(), Fm = rnd();
      const AE = intv2(mmul(Am, Em)), BF = intv2(mmul(Bm, Fm)), top = intv2(madd(AE, BF));
      const E = M.v("E"), Fv = M.v("F"), I = M.v("I"), O = "0";
      return {
        prompt: `${M.v("M")} = ${mat([[A, B], [O, I]])} and ${M.v("N")} = ${mat([[E], [Fv]])} are made of 2 × 2 blocks, with ${A} = ${mat(Am)}, ${B} = ${mat(Bm)}, ${E} = ${mat(Em)}, ${Fv} = ${mat(Fm)}, ${I} the identity and 0 the zero block. Find the top 2 × 2 block of ${M.v("M")}${M.v("N")}. ${entriesNote(4)}`,
        steps: [
          `Multiply blocks like entries, keeping the order: ${M.v("M")}${M.v("N")} = ${mat([[`${A}${E} + ${B}${Fv}`], [`0${E} + ${I}${Fv}`]])}. The bottom block is just ${Fv}; the top is ${A}${E} + ${B}${Fv}.`,
          `${A}${E} = ${mat(AE)}.`,
          `${B}${Fv} = ${mat(BF)}.`,
          `${A}${E} + ${B}${Fv} = ${mat(top)}.`,
        ],
        ...ansMat(top), vals: { AE, BF, top }, params: { A: Am, B: Bm, E: Em, F: Fm },
      };
    },
  };

  // ==== LA.13 Determinants ============================================================================================
  D["LA.det"] = {
    title: "Determinants and what they measure",
    generate(r, level) {
      const A = M.v("A");
      if (level === 1) {
        const Am = [[r.int(-5, 6), r.int(-5, 6)], [r.int(-5, 6), r.int(-5, 6)]];
        const ad = Am[0][0] * Am[1][1], bc = Am[0][1] * Am[1][0], d = ad - bc;
        const meaning = d === 0 ? "It is 0, so the matrix squashes the plane onto a line and has no inverse."
          : `So the map multiplies areas by ${n(Math.abs(d))}${d < 0 ? " and flips orientation" : ""}.`;
        return {
          prompt: `Find det ${A} for ${A} = ${mat(Am)}.`,
          steps: [
            `For a 2 × 2 matrix, det = ${M.v("a")}${M.v("d")} − ${M.v("b")}${M.v("c")}: the main diagonal minus the other diagonal.`,
            `det ${A} = ${np(Am[0][0])} · ${np(Am[1][1])} − ${np(Am[0][1])} · ${np(Am[1][0])} = ${n(ad)} − ${np(bc)} = ${n(d)}. ${meaning}`,
          ],
          ...ansNum(d), vals: { ad, bc, d, ab: Math.abs(d) }, params: { A: Am },
        };
      }
      if (level === 2) {
        for (;;) {
          const Am = [0, 1, 2].map(() => [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)]);
          const zs = r.sample([0, 1, 2, 3, 4, 5, 6, 7, 8], r.int(2, 3));
          zs.forEach((k) => { Am[Math.floor(k / 3)][k % 3] = 0; });
          const lines = [];
          for (let i = 0; i < 3; i++) lines.push({ row: true, i, zeros: Am[i].filter((e) => e === 0).length });
          for (let j = 0; j < 3; j++) lines.push({ row: false, i: j, zeros: Am.filter((rw) => rw[j] === 0).length });
          const best = lines.reduce((b, l) => (l.zeros > b.zeros ? l : b));
          if (best.zeros === 3) continue;
          const ent = (k) => (best.row ? [best.i, k] : [k, best.i]);
          const terms = [], parts = [], mins = [];
          for (let k = 0; k < 3; k++) {
            const [i, j] = ent(k), e = Am[i][j];
            if (e === 0) continue;
            const Mn = minor(Am, i, j), mval = det2(Mn).n, sg = (i + j) % 2 ? -1 : 1, t = sg * e * mval;
            mins.push(mval); terms.push(t);
            parts.push(`entry ${n(e)} at (${n(i + 1)}, ${n(j + 1)}) has sign ${sg > 0 ? "+" : "−"} and minor ${mat(Mn, { bars: true })} = ${np(Mn[0][0])} · ${np(Mn[1][1])} − ${np(Mn[0][1])} · ${np(Mn[1][0])} = ${n(mval)}, giving ${sg > 0 ? "" : "−"}${np(e)} · ${np(mval)} = ${n(t)}`);
          }
          const d = terms.reduce((s, t) => s + t, 0);
          if (d !== det(Am).n) continue;   // (always equal; a guard)
          const signs = best.row ? [0, 1, 2].map((k) => ((best.i + k) % 2 ? "−" : "+")) : [0, 1, 2].map((k) => ((best.i + k) % 2 ? "−" : "+"));
          return {
            prompt: `Find det ${A} for ${A} = ${mat(Am)}.`,
            steps: [
              `Expand along ${best.row ? "row" : "column"} ${n(best.i + 1)}, which has the most zeros (${WORDS[best.zeros]}). Its checkerboard signs are ${signs.join(", ")}; zero entries contribute nothing.`,
              ...parts.map((p) => `The ${p}.`),
              `det ${A} = ${terms.length > 1 ? `${sumNums(terms)} = ` : ""}${n(d)}.`,
            ],
            ...ansNum(d), vals: { mins, terms, d }, params: { A: Am }, consts: [3],
          };
        }
      }
      // level 3: area of a transformed triangle
      for (;;) {
        const Pp = [r.int(-4, 2), r.int(-4, 2)], Q = [r.int(-2, 4), r.int(-4, 4)], Rr = [r.int(-4, 4), r.int(-2, 4)];
        const e = [Q[0] - Pp[0], Q[1] - Pp[1]], f = [Rr[0] - Pp[0], Rr[1] - Pp[1]];
        const t1 = e[0] * f[1], t2 = f[0] * e[1], D0 = t1 - t2;
        if (D0 === 0) continue;
        const Am = [[r.int(-3, 3), r.int(-3, 3)], [r.int(-3, 3), r.int(-3, 3)]];
        const ad = Am[0][0] * Am[1][1], bc = Am[0][1] * Am[1][0], dA = ad - bc;
        if (dA === 0) continue;
        const area0 = new Frac(Math.abs(D0), 2), absD0 = Math.abs(D0), absA = Math.abs(dA), img = area0.mul(absA);
        return {
          prompt: `A graphics program applies the linear map with matrix ${A} = ${mat(Am)} to the triangle with vertices ${M.v("P")} = ${vec(Pp)}, ${M.v("Q")} = ${vec(Q)} and ${M.v("R")} = ${vec(Rr)} (units of cm). What is the area of the transformed triangle, in cm²?`,
          graph: graph({ view: viewFor([Pp, Q, Rr]), equal: true, items: [{ t: "poly", p: [Pp, Q, Rr] }, { t: "pt", x: Pp[0], y: Pp[1], label: "P" }, { t: "pt", x: Q[0], y: Q[1], label: "Q" }, { t: "pt", x: Rr[0], y: Rr[1], label: "R" }] }),
          steps: [
            `Edge vectors from ${M.v("P")}: ${M.v("Q")} − ${M.v("P")} = ${vec(e)} and ${M.v("R")} − ${M.v("P")} = ${vec(f)}.`,
            `The triangle is half the parallelogram on these edges: area = ${M.frac("1", "2")}|${np(e[0])} · ${np(f[1])} − ${np(f[0])} · ${np(e[1])}| = ${M.frac("1", "2")}|${n(t1)} − ${np(t2)}| = ${M.frac("1", "2")} · ${n(absD0)} = ${n(area0)} cm².`,
            `det ${A} = ${np(Am[0][0])} · ${np(Am[1][1])} − ${np(Am[0][1])} · ${np(Am[1][0])} = ${n(ad)} − ${np(bc)} = ${n(dA)}. A linear map multiplies every area by |det ${A}| = ${n(absA)}.`,
            `New area = ${n(absA)} · ${n(area0)} = ${n(img)} cm².`,
          ],
          ...ansNum(img, " cm²"), vals: { e, f, t1, t2, D0, absD0, area0: V(area0), ad, bc, dA, absA, img: V(img) }, params: { P: Pp, Q, R: Rr, A: Am },
        };
      }
    },
  };

  // ==== LA.14 Determinant properties ======================================================================================
  D["LA.det-props"] = {
    title: "Determinant rules and row operations",
    generate(r, level) {
      const A = M.v("A"), B = M.v("B");
      if (level === 1) {
        const kind = r.int(0, 2), dA = r.nonzero(-6, 6), dB = r.nonzero(-5, 5), nn = r.int(2, 3), c = r.pick([-2, 2, 3]);
        if (kind === 0) {
          const ans = dA * dB;
          return {
            prompt: `${A} and ${B} are ${nn} × ${nn} matrices with det ${A} = ${n(dA)} and det ${B} = ${n(dB)}. Find det(${A}${B}).`,
            steps: [`Determinants multiply: det(${A}${B}) = det ${A} · det ${B}.`, `= ${n(dA)} · ${np(dB)} = ${n(ans)}.`],
            ...ansNum(ans), vals: { ans }, params: { kind, dA, dB, nn },
          };
        }
        if (kind === 1) {
          const ans = new Frac(1, dA);
          return {
            prompt: `${A} is an invertible ${nn} × ${nn} matrix with det ${A} = ${n(dA)}. Find det(${iv(A)}).`,
            steps: [`${A}${iv(A)} = ${M.v("I")} and det ${M.v("I")} = 1, so det ${A} · det(${iv(A)}) = 1.`, `det(${iv(A)}) = ${M.frac("1", "det " + A)} = ${M.frac("1", np(dA))}${dA < 0 ? ` = ${M.f(ans)}` : ""}.`],
            ...ansNum(ans), vals: { ans: V(ans) }, params: { kind, dA, nn },
          };
        }
        const cn = Math.pow(c, nn), ans = cn * dA;
        return {
          prompt: `${A} is a ${nn} × ${nn} matrix with det ${A} = ${n(dA)}. Find det(${n(c)}${A}).`,
          steps: [
            `Multiplying ${A} by ${n(c)} multiplies each of its ${nn === 2 ? "two" : "three"} rows by ${n(c)}, and each row scales the determinant once: det(${n(c)}${A}) = ${M.sup(np(c), nn)} det ${A}.`,
            `${M.sup(np(c), nn)} = ${n(cn)}, so det(${n(c)}${A}) = ${n(cn)} · ${np(dA)} = ${n(ans)}.`,
          ],
          ...ansNum(ans), vals: { cn, ans }, params: { kind, dA, nn, c },
        };
      }
      if (level === 2) {
        if (r.chance(0.5)) {
          const dA = r.nonzero(-5, 5), dB = r.pick([-4, -3, -2, 2, 3, 4, 5]), c = r.pick([-2, 2, 3]), nn = 3;
          const cn = Math.pow(c, nn), ans = new Frac(cn * dA, dB);
          return {
            prompt: `${A} and ${B} are 3 × 3 matrices with det ${A} = ${n(dA)} and det ${B} = ${n(dB)}. Find det(${n(c)}${tp(A)}${iv(B)}).`,
            steps: [
              `Pull out the scalar: each of the three rows is scaled by ${n(c)}, so det(${n(c)}${M.v("X")}) = ${M.sup(np(c), 3)} det ${M.v("X")} = ${n(cn)} det ${M.v("X")}.`,
              `Then det(${tp(A)}${iv(B)}) = det(${tp(A)}) · det(${iv(B)}) = det ${A} · ${M.frac("1", "det " + B)} = ${n(dA)} · ${M.frac("1", n(dB))}.`,
              `det(${n(c)}${tp(A)}${iv(B)}) = ${n(cn)} · ${M.frac(n(dA), n(dB))} = ${M.f(ans)}.`,
            ],
            ...ansNum(ans), vals: { cn, ans: V(ans) }, params: { kind: 0, dA, dB, c }, consts: [3],
          };
        }
        // a sequence of row operations
        const dA = r.nonzero(-6, 6), ops = r.shuffle([0, 1, 2]), k = r.pick([-3, -2, 2, 3, 4]), m = r.nonzero(-4, 4);
        const [i, j] = r.sample([1, 2, 3], 2);
        let cur = dA;
        const lines = ops.map((o) => {
          if (o === 0) { const prev = cur; cur = -cur; return `Swap ${Rw(i)} ↔ ${Rw(j)}: the sign flips, ${n(prev)} → ${n(cur)}.`; }
          if (o === 1) { const prev = cur; cur = k * cur; return `Scale ${Rw(j)} → ${n(k)}${Rw(j)}: the determinant is multiplied by ${n(k)}, ${n(prev)} → ${n(cur)}.`; }
          return `Replace ${Rw(i)} → ${Rw(i)} ${m < 0 ? "−" : "+"} ${scal(Math.abs(m))}${Rw(j)}: adding a multiple of another row changes nothing, it stays ${n(cur)}.`;
        });
        const trail = [];
        { let c2 = dA; ops.forEach((o) => { if (o === 0) c2 = -c2; if (o === 1) c2 = k * c2; trail.push(c2); }); }
        const desc = ops.map((o) => (o === 0 ? `swap rows ${n(i)} and ${n(j)}` : o === 1 ? `multiply row ${n(j)} by ${n(k)}` : `add ${n(m)} times row ${n(j)} to row ${n(i)}`));
        return {
          prompt: `${A} is a 3 × 3 matrix with det ${A} = ${n(dA)}. ${B} is obtained from ${A} by these row operations, in order: ${desc[0]}; ${desc[1]}; ${desc[2]}. Find det ${B}.`,
          steps: [...lines, `So det ${B} = ${n(cur)}.`],
          ...ansNum(cur), vals: { trail, ans: cur }, params: { kind: 1, dA, ops, k, m, i, j }, consts: [3],
        };
      }
      // level 3: by row reduction to triangular form
      for (;;) {
        const L = [[1, 0, 0], [r.int(-3, 3), 1, 0], [r.int(-3, 3), r.int(-3, 3), 1]];
        const U = [[r.nonzero(-3, 3), r.int(-3, 3), r.int(-3, 3)], [0, r.nonzero(-3, 3), r.int(-3, 3)], [0, 0, r.nonzero(-3, 3)]];
        let Am = intv2(mmul(L, U));
        if (r.chance(0.35)) { const [a, b] = r.sample([0, 1, 2], 2); [Am[a], Am[b]] = [Am[b], Am[a]]; }
        if (maxAbs(Am) > 9) continue;
        const red = reduce(Am);
        if (!red.mults.every((f) => f.isInt()) || red.steps.length < 2 || red.pivots.length < 3) continue;
        const diag = [0, 1, 2].map((i) => red.A[i][i]), prod = diag[0].mul(diag[1]).mul(diag[2]);
        const d = red.swaps % 2 ? prod.neg() : prod;
        return {
          prompt: `Find det ${A} by row reducing ${A} = ${mat(Am)} to triangular form.`,
          steps: [
            `Row replacements leave the determinant unchanged; each row swap flips its sign.`,
            ...redSteps(red),
            `The matrix is now upper triangular, so its determinant is the product of the diagonal: ${diag.map(np).join(" · ")} = ${n(prod)}.`,
            red.swaps ? `There ${red.swaps === 1 ? "was one swap" : `were ${WORDS[red.swaps]} swaps`}, so det ${A} = ${red.swaps % 2 ? `−(${n(prod)})` : n(prod)} = ${n(d)}.` : `No swaps were needed, so det ${A} = ${n(d)}.`,
          ],
          ...ansNum(d), vals: { ...redVals(red), diag: V(diag), prod: V(prod), d: V(d) }, params: { A: Am }, consts: [3],
        };
      }
    },
  };

  // ==== LA.15 Inverses ===================================================================================================
  D["LA.inverse"] = {
    title: "Matrix inverses",
    generate(r, level) {
      const A = M.v("A");
      if (level === 1) {
        const Am = unimod2(r, -4, 5), d = det2(Am).n, Ai = intv2(inv2(Am));
        return {
          prompt: `Find ${iv(A)} for ${A} = ${mat(Am)}. ${entriesNote(4)}`,
          steps: [
            `det ${A} = ${np(Am[0][0])} · ${np(Am[1][1])} − ${np(Am[0][1])} · ${np(Am[1][0])} = ${n(d)}, which is not 0, so ${A} is invertible.`,
            `Swap the diagonal entries and negate the other two: ${mat(intv2(adj2(Am)))}.`,
            d === 1 ? `Divide by det ${A} = 1, which changes nothing: ${iv(A)} = ${mat(Ai)}.` : `Divide by det ${A} = −1, which flips every sign: ${iv(A)} = ${mat(Ai)}.`,
            `Check: ${A}${iv(A)} = ${mat(eye(2))}.`,
          ],
          ...ansMat(Ai), vals: { d, adj: intv2(adj2(Am)), Ai }, params: { A: Am },
        };
      }
      if (level === 2) {
        for (;;) {
          const Am = [[r.int(-4, 5), r.int(-4, 5)], [r.int(-4, 5), r.int(-4, 5)]], d = det2(Am).n;
          if (Math.abs(d) < 2 || Math.abs(d) > 6) continue;
          const sol = [r.int(-4, 4), r.int(-4, 4)], b = intv(mvm(Am, sol)), adj = intv2(adj2(Am)), w = intv(mvm(adj, b));
          return {
            prompt: `Solve ${A}${bv("x")} = ${bv("b")} using ${iv(A)}, where ${A} = ${mat(Am)} and ${bv("b")} = ${col(b)}. Enter ${bv("x")} as (${x}, ${y}).`,
            steps: [
              `det ${A} = ${np(Am[0][0])} · ${np(Am[1][1])} − ${np(Am[0][1])} · ${np(Am[1][0])} = ${n(d)}.`,
              `${iv(A)} = ${M.frac("1", "det " + A)}${mat(adj)} = ${scal(new Frac(1, d))}${mat(adj)}.`,
              `${bv("x")} = ${iv(A)}${bv("b")} = ${scal(new Frac(1, d))}(${dotTxt(adj[0], b)}, ${dotTxt(adj[1], b)}) = ${scal(new Frac(1, d))}${vec(w)} = ${vec(sol)}.`,
              `Check: ${A}${col(sol)} = ${col(b)}.`,
            ],
            ...ansVec(sol), vals: { d, adj, w, sol }, params: { A: Am, b },
          };
        }
      }
      // level 3: a 3 × 3 inverse by Gauss–Jordan
      for (;;) {
        const Am = unimod3(r, 2);
        if (maxAbs(Am) > 7) continue;
        const aug = Am.map((row, i) => [...row, ...eye(3)[i]]);
        const red = reduce(aug, { aug: 3, rref: true });
        if (red.steps.length < 3) continue;
        const Ai = red.A.map((row) => row.slice(3));
        if (!allInt(Ai) || maxAbs(Ai) > 15 || !allInt(red.steps.map((s) => s.mat))) continue;
        return {
          prompt: `Find ${iv(A)} by Gauss–Jordan elimination, for ${A} = ${mat(Am)}. ${entriesNote(9)}`,
          steps: [
            `Write ${A} beside the identity: [${A} | ${M.v("I")}] = ${mat(aug, { aug: 3 })}. Row reduce until the left block is ${M.v("I")}.`,
            ...redSteps(red, 3),
            `The left block is now ${M.v("I")}, so the right block is ${iv(A)} = ${mat(Ai)}.`,
          ],
          ...ansMat(Ai), vals: { ...redVals(red), Ai: V(Ai) }, params: { A: Am }, consts: [3],
        };
      }
    },
  };

  // ==== LA.16 Special matrices =========================================================================================
  const SPECIAL = ["Symmetric", "Skew-symmetric", "Upper triangular", "Orthogonal"];
  /** Which of the four special properties a 3 × 3 integer matrix has. */
  function specialProps(Am) {
    const T = trn(Am), ATA = intv2(mmul(T, Am));
    const sym = Am.every((row, i) => row.every((e, j) => e === T[i][j]));
    const skew = Am.every((row, i) => row.every((e, j) => e === -T[i][j]));
    const upper = Am[1][0] === 0 && Am[2][0] === 0 && Am[2][1] === 0;
    const orth = ATA.every((row, i) => row.every((e, j) => e === (i === j ? 1 : 0)));
    return { T, ATA, flags: [sym, skew, upper, orth] };
  }
  D["LA.15"] = {
    title: "Special matrices",
    generate(r, level) {
      const A = M.v("A");
      if (level === 1) {
        for (;;) {
          const kind = r.int(0, 3);
          let Am;
          if (kind === 0) { const a = r.nonzero(-3, 3), b = r.nonzero(-3, 3), c = r.int(-3, 3); Am = [[r.int(-3, 4), a, b], [a, r.int(-3, 4), c], [b, c, r.int(-3, 4)]]; }
          else if (kind === 1) { const a = r.nonzero(-4, 4), b = r.nonzero(-4, 4), c = r.int(-4, 4); Am = [[0, a, b], [-a, 0, c], [-b, -c, 0]]; }
          else if (kind === 2) Am = [[r.int(-3, 4), r.nonzero(-3, 4), r.int(-3, 4)], [0, r.int(-3, 4), r.nonzero(-3, 4)], [0, 0, r.int(-3, 4)]];
          else { const perm = r.pick([[1, 2, 0], [2, 0, 1]]); Am = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (j === perm[i] ? r.sign() : 0))); }
          Am = Am.map((row) => row.map((e) => e + 0));
          const { T, ATA, flags } = specialProps(Am);
          if (flags.filter(Boolean).length !== 1 || !flags[kind]) continue;
          const below = [Am[1][0], Am[2][0], Am[2][1]];
          return {
            prompt: `Exactly one of these words describes ${A} = ${mat(Am)}. Which one?`,
            steps: [
              `Transpose (rows become columns): ${tp(A)} = ${mat(T)}. ${flags[0] ? `${tp(A)} = ${A}, so ${A} is symmetric.` : flags[1] ? `${tp(A)} = −${A}, so ${A} is skew-symmetric.` : `${tp(A)} is neither ${A} nor −${A}, so ${A} is neither symmetric nor skew-symmetric.`}`,
              `Below the diagonal: ${below.map(n).join(", ")}. ${flags[2] ? `All zero, so ${A} is upper triangular.` : `Not all zero, so ${A} is not upper triangular.`}`,
              `${tp(A)}${A} = ${mat(ATA)}${flags[3] ? ` = ${M.v("I")}: the columns are orthonormal, so ${A} is orthogonal.` : `, not ${M.v("I")}, so ${A} is not orthogonal.`}`,
            ],
            ...ansChoice(SPECIAL, kind), vals: { T, ATA, below }, params: { A: Am }, consts: [3],
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const a = r.chance(0.25) ? 0 : r.nonzero(-4, 4), b = r.int(-4, 4), c = r.chance(0.25) ? 0 : r.nonzero(-4, 4);
          const Nm = [[0, a, b], [0, 0, c], [0, 0, 0]];
          if (isZero(flat(Nm))) continue;
          const N2 = intv2(mmul(Nm, Nm)), N3 = intv2(mmul(N2, Nm)), k = isZero(flat(N2)) ? 2 : 3;
          const N = M.v("N");
          return {
            prompt: `${N} = ${mat(Nm)} is strictly upper triangular, so some power of it is the zero matrix. Find the smallest ${M.v("k")} with ${M.sup(N, M.v("k"))} = 0.`,
            steps: [
              `${N} itself is not 0. Square it: ${M.sup(N, 2)} = ${mat(N2)}.`,
              k === 2 ? `${M.sup(N, 2)} = 0, so ${M.v("k")} = 2.` : `${M.sup(N, 2)} ≠ 0 (its corner entry is ${np(a)} · ${np(c)} = ${n(a * c)}). Multiply once more: ${M.sup(N, 3)} = ${M.sup(N, 2)}${N} = ${mat(N3)} = 0.`,
              `So ${M.v("k")} = ${n(k)}. Each multiplication pushes the nonzero entries one step further above the diagonal, so for any 3 × 3 strictly upper triangular matrix the third power is 0.`,
            ],
            ...ansNum(k), vals: { N2, N3, k, ac: a * c }, params: { N: Nm }, consts: [3],
          };
        }
      }
      // level 3: split into symmetric and skew-symmetric parts
      for (;;) {
        const Am = [0, 1, 2].map(() => [r.int(-4, 5), r.int(-4, 5), r.int(-4, 5)]);
        const T = trn(Am), Dm = intv2(msub(Am, T)), Sm = msc(new Frac(1, 2), madd(Am, T)), K = msc(new Frac(1, 2), Dm);
        if (isZero(flat(Dm))) continue;
        const ans = [K[0][1], K[0][2], K[1][2]];
        return {
          prompt: `Every square matrix is ${M.v("S")} + ${M.v("K")} with ${M.v("S")} symmetric and ${M.v("K")} skew-symmetric. For ${A} = ${mat(Am)}, find the entries of ${M.v("K")} above the diagonal, (${M.v("k")}₁₂, ${M.v("k")}₁₃, ${M.v("k")}₂₃).`,
          steps: [
            `${M.v("K")} = ${M.frac("1", "2")}(${A} − ${tp(A)}) and ${M.v("S")} = ${M.frac("1", "2")}(${A} + ${tp(A)}). First ${tp(A)} = ${mat(T)}.`,
            `${A} − ${tp(A)} = ${mat(Dm)}, so ${M.v("K")} = ${mat(K)}.`,
            `Its entries above the diagonal are ${vec(ans)}.`,
            `Check: ${M.v("S")} = ${mat(Sm)} is symmetric, and ${M.v("S")} + ${M.v("K")} = ${A}.`,
          ],
          ...ansVec(ans), vals: { T, Dm, K: V(K), S: V(Sm) }, params: { A: Am },
        };
      }
    },
  };

  // ==== LA.17 Gaussian elimination =======================================================================================
  const VARS3 = [x, y, z];
  /** Back substitution on an upper-triangular augmented 3 × 4 (or 2 × 3) system, one step per variable. */
  function backSub(U, names) {
    const k = U.length, sol = new Array(k), lines = [], rhs = [];
    for (let i = k - 1; i >= 0; i--) {
      const b = U[i][k];
      let rest = b;
      const pieces = [];
      for (let j = i + 1; j < k; j++) { if (U[i][j].n !== 0) { rest = rest.sub(U[i][j].mul(sol[j])); pieces.push(`${np(U[i][j])} · ${np(sol[j])}`); } }
      sol[i] = rest.div(U[i][i]);
      rhs.unshift(rest);
      const one = U[i][i].eq(1), lhs = kv(U[i][i], names[i]);
      const solve = one ? "" : ` and ${names[i]} = ${M.frac(n(rest), n(U[i][i]))} = ${n(sol[i])}`;
      lines.unshift(pieces.length
        ? `Row ${n(i + 1)}: ${lin(U[i].slice(i, k), names.slice(i))} = ${n(b)}, so ${lhs} = ${n(b)} − ${pieces.join(" − ")} = ${n(rest)}${solve}.`
        : `Row ${n(i + 1)}: ${lhs} = ${n(b)}${one ? "" : `, so ${names[i]} = ${M.frac(n(b), n(U[i][i]))} = ${n(sol[i])}`}.`);
    }
    return { sol, lines: lines.reverse(), rhs };
  }
  const sysTxt = (A, b, names) => A.map((row, i) => M.eq(`${lin(row, names)} = ${n(b[i])}`)).join("");
  D["LA.5"] = {
    title: "Solving systems by elimination",
    generate(r, level) {
      if (level <= 2) {
        for (;;) {
          const k = level === 1 ? 2 : 3;
          const L = level === 1 ? [[1, 0], [r.nonzero(-3, 3), 1]] : [[1, 0, 0], [r.int(-3, 3), 1, 0], [r.int(-3, 3), r.int(-3, 3), 1]];
          const U = level === 1 ? [[r.pick([1, -1, 2]), r.int(-4, 4)], [0, r.nonzero(-3, 3)]]
            : [[r.pick([1, -1, 2, -2]), r.int(-3, 3), r.int(-3, 3)], [0, r.pick([1, -1, 2, -2]), r.int(-3, 3)], [0, 0, r.pick([1, -1, 2, 3])]];
          const A = intv2(mmul(L, U)), sol = Array.from({ length: k }, () => r.int(-4, 5)), b = intv(mvm(A, sol));
          if (maxAbs(A) > 9 || maxAbs(b) > 30 || flat(A).some((e) => e === 0) && level === 1 || A.some((row) => row.every((e) => e === 0))) continue;
          const aug = A.map((row, i) => [...row, b[i]]), red = reduce(aug, { aug: 1 });
          if (!red.mults.every((f) => f.isInt()) || red.pivots.length < k || red.steps.length < 1) continue;
          const names = VARS3.slice(0, k), bs = backSub(red.A, names);
          return {
            prompt: `Solve the system by elimination: ${sysTxt(A, b, names)}Enter the solution as (${names.join(", ")}).`,
            steps: [
              `The augmented matrix is ${mat(aug, { aug: 1 })}. Clear the entries below each pivot.`,
              ...redSteps(red, 1),
              `Echelon form reached; back substitute from the bottom row up.`,
              ...bs.lines,
            ],
            ...ansVec(bs.sol), vals: { ...redVals(red), rhs: V(bs.rhs), sol: V(bs.sol) }, params: { A, b }, consts: k === 3 ? [3] : [],
          };
        }
      }
      // level 3: how many solutions?
      const options = ["Exactly one solution", "No solution", "Infinitely many solutions"];
      for (;;) {
        const r1 = [r.pick([1, -1, 2]), r.int(-3, 3), r.int(-3, 3)], r2 = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
        if (isZero(cross(r1, r2))) continue;
        const kind = r.int(0, 2), al = r.nonzero(-2, 2), be = r.nonzero(-2, 2), b1 = r.int(-6, 6), b2 = r.int(-6, 6);
        const r3 = kind === 0 ? [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)] : r1.map((e, i) => al * e + be * r2[i]);
        const b3 = kind === 0 ? r.int(-6, 6) : al * b1 + be * b2 + (kind === 1 ? r.nonzero(-3, 3) : 0);
        const A = [r1, r2, r3], b = [b1, b2, b3];
        if (maxAbs(A) > 9 || (kind === 0 && det(A).n === 0)) continue;
        const aug = A.map((row, i) => [...row, b[i]]), red = reduce(aug, { aug: 1 });
        if (!red.mults.every((f) => f.isInt()) || !allInt(red.steps.map((s) => s.mat))) continue;
        const last = red.A[2], np3 = red.pivots.length, cval = last[3];
        let verdict, index;
        if (np3 === 3) { index = 0; verdict = `There is a pivot in every column (no free variable and no contradiction), so there is exactly one solution.`; }
        else if (cval.n !== 0) { index = 1; verdict = `The last row says 0${x} + 0${y} + 0${z} = ${n(cval)}, which is impossible, so there is no solution.`; }
        else { index = 2; verdict = `The last row is all zeros (0 = 0), so only two pivots remain for three unknowns: one variable is free, and there are infinitely many solutions.`; }
        return {
          prompt: `How many solutions does this system have? ${sysTxt(A, b, VARS3)}`,
          steps: [`The augmented matrix is ${mat(aug, { aug: 1 })}.`, ...redSteps(red, 1), verdict],
          ...ansChoice(options, index), vals: { ...redVals(red), cval: V(cval) }, params: { A, b }, consts: [3],
        };
      }
    },
  };

  // ==== LA.18 LU and Cholesky ===========================================================================================
  const lsub = (i, j) => `${M.v("l")}${sb(`${i}${j}`)}`, usub = (i, j) => `${M.v("u")}${sb(`${i}${j}`)}`;
  D["LA.lu"] = {
    title: "LU and Cholesky factorizations",
    generate(r, level) {
      const A = M.v("A"), L = M.v("L"), U = M.v("U");
      if (level === 1) {
        for (;;) {
          const a = r.pick([1, 2, 3, -1, -2]), l = r.nonzero(-3, 3), b = r.int(-4, 5), d = r.int(-6, 9);
          const c = l * a, lb = l * b, u22 = d - lb;
          if (u22 === 0) continue;
          const Am = [[a, b], [c, d]];
          return {
            prompt: `Factor ${A} = ${mat(Am)} as ${L}${U} with ${L} = ${mat([[1, 0], [lsub(2, 1), 1]])} and ${U} = ${mat([[usub(1, 1), usub(1, 2)], [0, usub(2, 2)]])}. Enter (${lsub(2, 1)}, ${usub(2, 2)}).`,
            steps: [
              `Eliminate below the first pivot ${n(a)}: the multiplier is ${lsub(2, 1)} = ${M.frac(n(c), n(a))} = ${n(l)}.`,
              `${Rw(2)} → ${Rw(2)} ${l > 0 ? "−" : "+"} ${scal(Math.abs(l))}${Rw(1)}: the new second row is (${n(c)} − ${np(l)} · ${np(a)}, ${n(d)} − ${np(l)} · ${np(b)}) = (0, ${n(u22)}).`,
              `So ${U} = ${mat([[a, b], [0, u22]])} and ${L} = ${mat([[1, 0], [l, 1]])}: ${lsub(2, 1)} = ${n(l)}, ${usub(2, 2)} = ${n(u22)}.`,
            ],
            ...ansVec([l, u22]), vals: { l, lb, u22 }, params: { A: Am },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const Lm = [[1, 0, 0], [r.nonzero(-3, 3), 1, 0], [r.nonzero(-3, 3), r.nonzero(-3, 3), 1]];
          const Um = [[r.pick([1, 2, -1, 3]), r.int(-3, 3), r.int(-3, 3)], [0, r.pick([1, -1, 2, -2]), r.int(-3, 3)], [0, 0, r.nonzero(-3, 3)]];
          const Am = intv2(mmul(Lm, Um));
          if (maxAbs(Am) > 12) continue;
          const red = reduce(Am);
          if (red.swaps || red.log.length !== 3) continue;
          const ls = [red.log[0].f, red.log[1].f, red.log[2].f];
          if (!ls.every((f) => f.isInt())) continue;
          return {
            prompt: `Find the multipliers of ${L} in the factorization ${A} = ${L}${U} (${L} unit lower triangular, ${U} upper triangular) for ${A} = ${mat(Am)}. Enter (${lsub(2, 1)}, ${lsub(3, 1)}, ${lsub(3, 2)}).`,
            steps: [
              `Eliminate without swaps. The multiplier ${M.v("l")}${M.sub("", `${M.v("i")}${M.v("j")}`)} is the number of times pivot row ${M.v("j")} is subtracted from row ${M.v("i")}.`,
              ...redSteps(red),
              `The multipliers were ${lsub(2, 1)} = ${n(ls[0])}, ${lsub(3, 1)} = ${n(ls[1])} and ${lsub(3, 2)} = ${n(ls[2])}. So ${L} = ${mat([[1, 0, 0], [ls[0], 1, 0], [ls[1], ls[2], 1]])} and ${U} is the echelon form above.`,
            ],
            ...ansVec(ls), vals: { ...redVals(red), ls: V(ls) }, params: { A: Am }, consts: [3],
          };
        }
      }
      // level 3: Cholesky, or solving with a given LU
      if (r.chance(0.5)) {
        for (;;) {
          const Lm = [[r.int(1, 3), 0, 0], [r.int(-3, 3), r.int(1, 3), 0], [r.int(-3, 3), r.int(-3, 3), r.int(1, 3)]];
          const Am = intv2(mmul(Lm, trn(Lm)));
          if (maxAbs(Am) > 25) continue;
          const [l11, l21, l22, l31, l32, l33] = [Lm[0][0], Lm[1][0], Lm[1][1], Lm[2][0], Lm[2][1], Lm[2][2]];
          const v22 = Am[1][1] - l21 * l21, n32 = Am[2][1] - l31 * l21, v33 = Am[2][2] - l31 * l31 - l32 * l32;
          const ans = [l11, l21, l22, l31, l32, l33];
          return {
            prompt: `Find the Cholesky factor ${L} (lower triangular, positive diagonal, ${A} = ${L}${tp(L)}) of ${A} = ${mat(Am)}. Enter (${lsub(1, 1)}, ${lsub(2, 1)}, ${lsub(2, 2)}, ${lsub(3, 1)}, ${lsub(3, 2)}, ${lsub(3, 3)}).`,
            steps: [
              `First column: ${lsub(1, 1)} = ${M.sqrt(n(Am[0][0]))} = ${n(l11)}, ${lsub(2, 1)} = ${M.frac(n(Am[1][0]), n(l11))} = ${n(l21)}, ${lsub(3, 1)} = ${M.frac(n(Am[2][0]), n(l11))} = ${n(l31)}.`,
              `${lsub(2, 2)} = ${M.sqrt(`${n(Am[1][1])} − ${M.sup(np(l21), 2)}`)} = ${M.sqrt(n(v22))} = ${n(l22)}.`,
              `${lsub(3, 2)} = ${M.frac(`${n(Am[2][1])} − ${np(l31)} · ${np(l21)}`, n(l22))} = ${M.frac(n(n32), n(l22))} = ${n(l32)}.`,
              `${lsub(3, 3)} = ${M.sqrt(`${n(Am[2][2])} − ${M.sup(np(l31), 2)} − ${M.sup(np(l32), 2)}`)} = ${M.sqrt(n(v33))} = ${n(l33)}.`,
              `So ${L} = ${mat(Lm)}. Every number under a root was positive, which confirms ${A} is positive definite.`,
            ],
            ...ansVec(ans), vals: { v22, n32, v33, ans }, params: { kind: 0, A: Am }, consts: [3],
          };
        }
      }
      for (;;) {
        const Lm = [[1, 0, 0], [r.int(-3, 3), 1, 0], [r.int(-3, 3), r.int(-3, 3), 1]];
        const Um = [[r.pick([1, -1, 2]), r.int(-3, 3), r.int(-3, 3)], [0, r.pick([1, -1, 2]), r.int(-3, 3)], [0, 0, r.pick([1, -1, 2, -2])]];
        const sol = [r.int(-4, 4), r.int(-4, 4), r.int(-4, 4)], yv = intv(mvm(Um, sol)), b = intv(mvm(Lm, yv));
        if (maxAbs(b) > 30) continue;
        const Y = (i) => `${M.v("y")}${sb(i)}`;
        const y2r = b[1] - Lm[1][0] * yv[0], y3r = b[2] - Lm[2][0] * yv[0] - Lm[2][1] * yv[1];
        const Uaug = Um.map((row, i) => [...row, yv[i]].map(F)), bs = backSub(Uaug, VARS3);
        return {
          prompt: `${M.v("A")} = ${L}${U} with ${L} = ${mat(Lm)} and ${U} = ${mat(Um)}. Solve ${M.v("A")}${bv("x")} = ${bv("b")} for ${bv("b")} = ${col(b)} with two triangular solves. Enter (${x}, ${y}, ${z}).`,
          steps: [
            `Forward: solve ${L}${bv("y")} = ${bv("b")} from the top. ${Y(1)} = ${n(b[0])}; ${Y(2)} = ${n(b[1])} − ${np(Lm[1][0])} · ${np(yv[0])} = ${n(y2r)}; ${Y(3)} = ${n(b[2])} − ${np(Lm[2][0])} · ${np(yv[0])} − ${np(Lm[2][1])} · ${np(yv[1])} = ${n(y3r)}.`,
            `Back: solve ${U}${bv("x")} = ${bv("y")} = ${vec(yv)} from the bottom.`,
            ...bs.lines,
          ],
          ...ansVec(bs.sol), vals: { yv, y2r, y3r, rhs: V(bs.rhs), sol: V(bs.sol) }, params: { kind: 1, L: Lm, U: Um, b }, consts: [3],
        };
      }
    },
  };

  // ==== LA.19 Rank, null space, rank–nullity ===============================================================================
  D["LA.6"] = {
    title: "Rank, null space and rank–nullity",
    generate(r, level) {
      const A = M.v("A");
      if (level === 1) {
        if (r.chance(0.5)) {
          const m = r.int(2, 6), nc = r.int(3, 8), rk = r.int(1, Math.min(m, nc)), nul = nc - rk;
          return {
            prompt: `${A} is a ${m} × ${nc} matrix of rank ${rk}. What is the dimension of its null space?`,
            steps: [
              `Rank–nullity: rank ${A} + dim Null ${A} = number of columns = ${n(nc)}.`,
              `dim Null ${A} = ${n(nc)} − ${n(rk)} = ${n(nul)}: ${n(rk)} pivot columns, so ${n(nul)} free variable${nul === 1 ? "" : "s"}.`,
            ],
            ...ansNum(nul), vals: { nul }, params: { kind: 0, m, nc, rk },
          };
        }
        for (;;) {
          const nc = r.int(4, 5), piv = r.sample([0, 1, 2, 3, 4].slice(0, nc), r.int(1, 3)).sort((a, b) => a - b);
          const R = [0, 1, 2].map(() => new Array(nc).fill(0));
          piv.forEach((c, i) => {
            R[i][c] = 1;
            for (let j = c + 1; j < nc; j++) if (!piv.includes(j)) R[i][j] = r.int(-3, 4);
          });
          const rk = piv.length, nul = nc - rk, pc = piv.map((c) => c + 1);
          return {
            prompt: `The reduced row echelon form of ${A} is ${mat(R)}. What is the dimension of the null space of ${A}?`,
            steps: [
              `The pivots (leading 1s) are in column${rk === 1 ? "" : "s"} ${pc.map(n).join(", ")}, so rank ${A} = ${n(rk)}.`,
              `${A} has ${n(nc)} columns. Rank–nullity: dim Null ${A} = ${n(nc)} − ${n(rk)} = ${n(nul)}, one for each free variable.`,
            ],
            ...ansNum(nul), vals: { rk, nul, pc, nc }, params: { kind: 1, R }, consts: [3],
          };
        }
      }
      if (level === 2) {
        const options = ["1", "2", "3"];
        for (;;) {
          const rk = r.int(1, 3), r1 = [r.pick([1, -1, 2]), r.int(-3, 3), r.int(-3, 3)];
          let r2, r3;
          if (rk === 1) { r2 = r1.map((e) => r.pick([-2, 2, 3]) * e); const k = r.pick([-1, -3, 2]); r3 = r1.map((e) => k * e); }
          else {
            r2 = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
            if (isZero(cross(r1, r2))) continue;
            const al = r.nonzero(-2, 2), be = r.nonzero(-2, 2);
            r3 = rk === 2 ? r1.map((e, i) => al * e + be * r2[i]) : [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
          }
          const Am = [r1, r2, r3];
          if (maxAbs(Am) > 9 || (rk === 3 && det(Am).n === 0)) continue;
          const red = reduce(Am);
          if (!red.mults.every((f) => f.isInt()) || red.pivots.length !== rk) continue;
          return {
            prompt: `Find the rank of ${A} = ${mat(Am)}.`,
            steps: [
              `Row reduce; the rank is the number of pivots.`,
              ...redSteps(red),
              `${WORDS[rk][0].toUpperCase() + WORDS[rk].slice(1)} nonzero row${rk === 1 ? "" : "s"} remain${rk === 1 ? "s" : ""}, so there ${rk === 1 ? "is one pivot" : `are ${WORDS[rk]} pivots`}: rank ${A} = ${n(rk)}.`,
            ],
            ...ansChoice(options, rk - 1), vals: { ...redVals(red), rk }, params: { A: Am }, consts: [3],
          };
        }
      }
      // level 3: a null-space vector
      for (;;) {
        const E = unimod3(r, 2), p = r.int(-3, 3), q = r.int(-3, 3);
        if (p === 0 && q === 0) continue;
        const Rm = [[1, 0, -p], [0, 1, -q], [0, 0, 0]], Am = intv2(mmul(E, Rm));
        if (maxAbs(Am) > 9 || Am.some((row) => row.every((e) => e === 0))) continue;
        const red = reduce(Am, { rref: true });
        if (!allInt(red.steps.map((s) => s.mat)) || red.steps.length < 2) continue;
        const v = [p, q, 1], chk = intv(mvm(Am, v));
        const X3 = `${M.v("x")}₃`;
        return {
          prompt: `Find the vector in the null space of ${A} = ${mat(Am)} whose third component is 1.`,
          steps: [
            `Solve ${A}${bv("x")} = <b>0</b>: row reduce ${A} to reduced echelon form.`,
            ...redSteps(red),
            `The equations are ${M.v("x")}₁${M.term(-p, X3)} = 0 and ${M.v("x")}₂${M.term(-q, X3)} = 0, and ${X3} is free. So ${M.v("x")}₁ = ${kv(p, X3)} and ${M.v("x")}₂ = ${kv(q, X3)}.`,
            `With ${X3} = 1: ${bv("x")} = ${vec(v)}. Check: ${A}${bv("x")} = ${vec(chk)}.`,
          ],
          ...ansVec(v), vals: { ...redVals(red), chk }, params: { A: Am },
        };
      }
    },
  };

  // ==== LA.20 Orthogonality, projections and least squares =================================================================
  /** Three mutually orthogonal integer vectors, shuffled and rescaled. */
  function orthoSet(r, scale = true) {
    const vs = shuffleCoords(r, r.pick(ORTHO));
    return r.shuffle(vs).map((v) => { const k = scale ? r.pick([1, 1, 2, -1]) : r.sign(); return v.map((e) => k * e + 0); });
  }
  D["LA.7"] = {
    title: "Orthogonality, projections and least squares",
    generate(r, level) {
      if (level === 1) {
        for (;;) {
          const vs = orthoSet(r), bad = r.chance(0.5);
          if (bad) { const i = r.int(0, 2), j = r.int(0, 2); vs[i][j] += r.pick([-1, 1]); }
          const pairs = [[0, 1], [0, 2], [1, 2]], dots = pairs.map(([i, j]) => dot(vs[i], vs[j]).n);
          if (bad && dots.every((d) => d === 0)) continue;
          if (vs.some(isZero)) continue;
          const orth = dots.every((d) => d === 0), names = [bv("u"), bv("v"), bv("w")];
          const options = ["Yes: every pair is perpendicular", "No"];
          return {
            prompt: `Are ${bv("u")} = ${vec(vs[0])}, ${bv("v")} = ${vec(vs[1])} and ${bv("w")} = ${vec(vs[2])} mutually orthogonal?`,
            steps: [
              `Check all three pairs; each dot product must be 0.`,
              ...pairs.map(([i, j], k) => `${names[i]} · ${names[j]} = ${dotTxt(vs[i], vs[j])} = ${n(dots[k])}.`),
              orth ? `All three are 0, so the set is orthogonal.` : `At least one is not 0, so the set is not orthogonal.`,
            ],
            ...ansChoice(options, orth ? 0 : 1), vals: { dots }, params: { vs },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const [u1, u2, u3] = orthoSet(r), al = r.nonzero(-3, 3), be = r.nonzero(-3, 3), ga = r.nonzero(-2, 2);
          const b = [0, 1, 2].map((i) => al * u1[i] + be * u2[i] + ga * u3[i]);
          if (maxAbs(b) > 15) continue;
          const d1 = dot(u1, b).n, n1 = dot(u1, u1).n, d2 = dot(u2, b).n, n2 = dot(u2, u2).n;
          const s1 = u1.map((e) => al * e), s2 = u2.map((e) => be * e), bh = [0, 1, 2].map((i) => s1[i] + s2[i]), res = b.map((e, i) => e - bh[i]);
          const c1 = res.map((e, i) => e * u1[i]), c2 = res.map((e, i) => e * u2[i]);
          return {
            prompt: `${bv("u", 1)} = ${vec(u1)} and ${bv("u", 2)} = ${vec(u2)} are orthogonal and span a plane ${M.v("W")}. Find the orthogonal projection of ${bv("b")} = ${vec(b)} onto ${M.v("W")}.`,
            steps: [
              `With an orthogonal basis, project onto each direction and add: ${bv("b̂")} = ${M.frac(`${bv("u", 1)} · ${bv("b")}`, `${bv("u", 1)} · ${bv("u", 1)}`)}${bv("u", 1)} + ${M.frac(`${bv("u", 2)} · ${bv("b")}`, `${bv("u", 2)} · ${bv("u", 2)}`)}${bv("u", 2)}.`,
              `${bv("u", 1)} · ${bv("b")} = ${n(d1)} and ${bv("u", 1)} · ${bv("u", 1)} = ${n(n1)}: the first weight is ${M.frac(n(d1), n(n1))} = ${n(al)}.`,
              `${bv("u", 2)} · ${bv("b")} = ${n(d2)} and ${bv("u", 2)} · ${bv("u", 2)} = ${n(n2)}: the second weight is ${M.frac(n(d2), n(n2))} = ${n(be)}.`,
              `${bv("b̂")} = ${scal(al)}${vec(u1)} ${be < 0 ? "−" : "+"} ${scal(Math.abs(be))}${vec(u2)} = ${vec(s1)} + ${vec(s2)} = ${vec(bh)}.`,
              `Check: the error ${bv("b")} − ${bv("b̂")} = ${vec(res)} is perpendicular to the plane: dotted with ${bv("u", 1)} it gives ${sumNums(c1)} = 0, and with ${bv("u", 2)}, ${sumNums(c2)} = 0.`,
            ],
            ...ansVec(bh), vals: { d1, n1, d2, n2, al, be, s1, s2, bh, res, c1, c2 }, params: { u1, u2, b },
          };
        }
      }
      // level 3: least-squares line
      for (;;) {
        const npts = r.pick([3, 4]), x0 = r.int(0, 2), dx = r.int(1, 2), c = r.int(1, 8), m = r.int(1, 4), t = r.pick([-2, -1, 1, 2]);
        const xs = Array.from({ length: npts }, (_, i) => x0 + i * dx), pat = npts === 3 ? [1, -2, 1] : [1, -1, -1, 1];
        const ys = xs.map((xv, i) => c + m * xv + t * pat[i]);
        if (ys.some((v) => v <= 0)) continue;
        const Sx = xs.reduce((a, b) => a + b, 0), Sxx = xs.reduce((a, b) => a + b * b, 0), Sy = ys.reduce((a, b) => a + b, 0), Sxy = xs.reduce((a, b, i) => a + b * ys[i], 0);
        const Dt = npts * Sxx - Sx * Sx, cn = Sy * Sxx - Sx * Sxy, mn = npts * Sxy - Sx * Sy;
        const res = ys.map((v, i) => v - c - m * xs[i]);
        const Am = xs.map((xv) => [1, xv]);
        const ctx = r.pick([["A seedling's height", "weeks", "cm"], ["A tank's water level", "hours", "cm"], ["A savings balance", "months", "hundred dollars"]]);
        return {
          prompt: `${ctx[0]} ${y} (in ${ctx[2]}) is measured at times ${x} (in ${ctx[1]}): ${M.table([x, y], xs.map((xv, i) => [n(xv), n(ys[i])]))}Fit the least-squares line ${y} = ${M.v("c")} + ${M.v("m")}${x}. Enter (${M.v("c")}, ${M.v("m")}).`,
          graph: graph({ view: [-1, Math.max(...xs) + 2, -1, Math.max(...ys) + 3], items: xs.map((xv, i) => ({ t: "pt", x: xv, y: ys[i] })) }),
          steps: [
            `One row per point: ${M.v("A")}${col([M.v("c"), M.v("m")])} ≈ ${bv("y")} with ${M.v("A")} = ${mat(Am)} and ${bv("y")} = ${col(ys)}.`,
            `Normal equations ${tp(M.v("A"))}${M.v("A")}${col([M.v("c"), M.v("m")])} = ${tp(M.v("A"))}${bv("y")}. Here Σ${x} = ${sumNums(xs)} = ${n(Sx)}, Σ${M.sup(x, 2)} = ${n(Sxx)}, Σ${y} = ${n(Sy)} and Σ${x}${y} = ${n(Sxy)}, so ${tp(M.v("A"))}${M.v("A")} = ${mat([[npts, Sx], [Sx, Sxx]])} and ${tp(M.v("A"))}${bv("y")} = ${col([Sy, Sxy])}.`,
            `Solve ${M.eq(`${n(npts)}${M.v("c")} + ${n(Sx)}${M.v("m")} = ${n(Sy)}`)}${M.eq(`${n(Sx)}${M.v("c")} + ${n(Sxx)}${M.v("m")} = ${n(Sxy)}`)} The determinant is ${n(npts)} · ${n(Sxx)} − ${M.sup(n(Sx), 2)} = ${n(Dt)}.`,
            `Cramer's rule: ${M.v("c")} = ${M.frac(`${n(Sy)} · ${n(Sxx)} − ${n(Sx)} · ${n(Sxy)}`, n(Dt))} = ${M.frac(n(cn), n(Dt))} = ${n(c)} and ${M.v("m")} = ${M.frac(`${n(npts)} · ${n(Sxy)} − ${n(Sx)} · ${n(Sy)}`, n(Dt))} = ${M.frac(n(mn), n(Dt))} = ${n(m)}.`,
            `Check: the residuals ${y} − (${n(c)} + ${n(m)}${x}) are ${res.map(n).join(", ")}; they add to 0, as least squares guarantees when the model has an intercept.`,
          ],
          ...ansVec([c, m]), vals: { npts, Sx, Sxx, Sy, Sxy, Dt, cn, mn, c, m, res }, params: { xs, ys },
        };
      }
    },
  };

  // ==== LA.21 Gram–Schmidt and QR =========================================================================================
  D["LA.8"] = {
    title: "Gram–Schmidt and QR",
    generate(r, level) {
      const U = (i) => bv("u", i), Vv = (i) => bv("v", i);
      const projTxt = (i, j) => M.frac(`${U(j)} · ${Vv(i)}`, `${U(j)} · ${U(j)}`);
      if (level === 1) {
        for (;;) {
          const v1 = [r.int(-3, 3), r.int(-3, 3)], t = r.nonzero(-3, 3), s = r.nonzero(-2, 2);
          if (isZero(v1)) continue;
          const perp = [-v1[1] * s, v1[0] * s], v2 = [t * v1[0] + perp[0], t * v1[1] + perp[1]];
          const d = dot(v1, v2).n, nn = dot(v1, v1).n, tv = v1.map((e) => t * e), chk = v1.map((e, i) => e * perp[i]);
          return {
            prompt: `Apply Gram–Schmidt to ${Vv(1)} = ${vec(v1)} and ${Vv(2)} = ${vec(v2)} (in the graph): find the second orthogonal vector ${U(2)}, before normalizing.`,
            graph: graph({ view: viewFor([v1, v2]), equal: true, items: [arrow(v1, "v₁"), arrow(v2, "v₂", "secondary")] }),
            steps: [
              `${U(1)} = ${Vv(1)} = ${vec(v1)}. Then ${U(2)} = ${Vv(2)} − ${projTxt(2, 1)}${U(1)}: remove from ${Vv(2)} its shadow on ${U(1)}.`,
              `${U(1)} · ${Vv(2)} = ${dotTxt(v1, v2)} = ${n(d)} and ${U(1)} · ${U(1)} = ${n(nn)}, so the weight is ${M.frac(n(d), n(nn))} = ${n(t)}.`,
              `${U(2)} = ${vec(v2)} − ${np(t)}${vec(v1)} = ${vec(v2)} − ${vec(tv)} = ${vec(perp)}.`,
              `Check: ${U(1)} · ${U(2)} = ${sumNums(chk)} = 0.`,
            ],
            ...ansVec(perp), vals: { d, nn, t, tv, perp, chk }, params: { v1, v2 },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const [w1, w2, w3] = orthoSet(r, false), a = r.nonzero(-2, 2), b = r.nonzero(-2, 2), c = r.nonzero(-2, 2), s2 = r.sign(), s3 = r.sign();
          const v1 = w1, v2 = w1.map((e, i) => a * e + s2 * w2[i]), v3 = w1.map((e, i) => b * e + c * s2 * w2[i] + s3 * w3[i]);
          if (maxAbs([v2, v3]) > 9) continue;
          const u2 = w2.map((e) => s2 * e), u3 = w3.map((e) => s3 * e);
          const d12 = dot(v1, v2).n, n1 = dot(v1, v1).n, d13 = dot(v1, v3).n, d23 = dot(u2, v3).n, n2 = dot(u2, u2).n;
          const p1 = v1.map((e) => b * e + 0), p2 = u2.map((e) => c * e + 0), av1 = v1.map((e) => a * e + 0);
          return {
            prompt: `Apply Gram–Schmidt to ${Vv(1)} = ${vec(v1)}, ${Vv(2)} = ${vec(v2)} and ${Vv(3)} = ${vec(v3)}. Find ${U(3)}, the third orthogonal vector, before normalizing.`,
            steps: [
              `${U(1)} = ${Vv(1)} = ${vec(v1)}.`,
              `${U(2)} = ${Vv(2)} − ${projTxt(2, 1)}${U(1)}: ${U(1)} · ${Vv(2)} = ${n(d12)} and ${U(1)} · ${U(1)} = ${n(n1)}, weight ${M.frac(n(d12), n(n1))} = ${n(a)}, so ${U(2)} = ${vec(v2)} − ${vec(av1)} = ${vec(u2)}.`,
              `${U(3)} = ${Vv(3)} − ${projTxt(3, 1)}${U(1)} − ${projTxt(3, 2)}${U(2)}. ${U(1)} · ${Vv(3)} = ${n(d13)}, so the first weight is ${M.frac(n(d13), n(n1))} = ${n(b)}; ${U(2)} · ${Vv(3)} = ${n(d23)} and ${U(2)} · ${U(2)} = ${n(n2)}, so the second is ${M.frac(n(d23), n(n2))} = ${n(c)}.`,
              `${U(3)} = ${vec(v3)} − ${vec(p1)} − ${vec(p2)} = ${vec(u3)}.`,
              `Check: ${U(3)} · ${U(1)} = ${n(dot(u3, v1))} and ${U(3)} · ${U(2)} = ${n(dot(u3, u2))}.`,
            ],
            ...ansVec(u3), vals: { d12, n1, a, av1, u2, d13, d23, n2, b, c, p1, p2, u3 }, params: { v1, v2, v3 },
          };
        }
      }
      // level 3: the R of a QR factorization
      for (;;) {
        let w1, w2, nrm;
        if (r.chance(0.5)) { [w1, w2] = shuffleCoords(r, r.pick([ORTHO[1], ORTHO[5]])); nrm = 3; }
        else { const [p, q] = r.shuffle([3, 4]); w1 = [p * r.sign(), q * r.sign()]; w2 = [-w1[1], w1[0]]; nrm = 5; }
        const k = r.int(1, 2), r12 = r.int(-6, 6), r22 = r.int(1, 6);
        const a1 = w1.map((e) => k * e), num = w1.map((e, i) => r12 * e + r22 * w2[i]);
        if (num.some((e) => e % nrm !== 0)) continue;
        const a2 = num.map((e) => e / nrm), r11 = k * nrm;
        if (maxAbs(a2) > 9 || isZero(a2)) continue;
        const sq1 = a1.map((e) => e * e), N1 = sq1.reduce((s, e) => s + e, 0), q1 = a1.map((e) => new Frac(e, r11));
        const p12 = dot(a1, a2).n, u2 = a2.map((e, i) => F(e).sub(q1[i].mul(r12)));
        const sq2 = a2.map((e) => e * e), N2 = dot(a2, a2).n, v22 = N2 - r12 * r12;
        const dim = a1.length, Am = a1.map((e, i) => [e, a2[i]]);
        return {
          prompt: `Find ${M.v("R")} in the QR factorization of ${M.v("A")} = ${mat(Am)}, whose columns are ${bv("a", 1)} and ${bv("a", 2)}. Enter (${M.v("r")}₁₁, ${M.v("r")}₁₂, ${M.v("r")}₂₂).`,
          steps: [
            `${M.v("r")}₁₁ = ${norm(bv("a", 1))} = ${M.sqrt(sumNums(sq1))} = ${M.sqrt(n(N1))} = ${n(r11)}, and ${bv("q", 1)} = ${M.frac(bv("a", 1), n(r11))} = ${vec(q1)}.`,
            `${M.v("r")}₁₂ = ${bv("q", 1)} · ${bv("a", 2)} = ${M.frac(`${bv("a", 1)} · ${bv("a", 2)}`, n(r11))} = ${M.frac(n(p12), n(r11))} = ${n(r12)}.`,
            `Remove that part: ${bv("u", 2)} = ${bv("a", 2)} − ${np(r12)}${bv("q", 1)} = ${vec(u2)}.`,
            `${M.v("r")}₂₂ = ${norm(bv("u", 2))}. Since ${bv("u", 2)} ⊥ ${bv("q", 1)}, Pythagoras gives ${M.sup(norm(bv("u", 2)), 2)} = ${M.sup(norm(bv("a", 2)), 2)} − ${M.sup(M.v("r") + "₁₂", 2)} = (${sumNums(sq2)}) − ${M.sup(np(r12), 2)} = ${n(N2)} − ${n(r12 * r12)} = ${n(v22)}, so ${M.v("r")}₂₂ = ${n(r22)}.`,
            `${M.v("R")} = ${mat([[r11, r12], [0, r22]])}.`,
          ],
          ...ansVec([r11, r12, r22]), vals: { sq1, N1, r11, q1: V(q1), p12, r12, u2: V(u2), sq2, N2, rr: r12 * r12, v22, r22 }, params: { A: Am }, consts: dim === 3 ? [3] : [],
        };
      }
    },
  };

  // ==== LA.22 Orthogonal matrices, rotations and reflections =================================================================
  const COS = { 0: 1, 90: 0, 180: -1, 270: 0, 360: 1 }, SIN = { 0: 0, 90: 1, 180: 0, 270: -1, 360: 0 };
  const rot = (t) => [[COS[t], -SIN[t] + 0], [SIN[t], COS[t]]];
  D["LA.orthogonal"] = {
    title: "Rotations, reflections and orthogonal matrices",
    generate(r, level) {
      const th = M.v("θ");
      if (level === 1) {
        for (;;) {
          const t = r.pick([90, 180, 270]), v = [r.int(-5, 5), r.int(-5, 5)];
          if (isZero(v)) continue;
          const Rm = rot(t), w = intv(mvm(Rm, v));
          return {
            prompt: `Rotate ${bv("v")} = ${vec(v)} (in the graph) by ${n(t)}° counterclockwise about the origin.`,
            graph: graph({ view: [-6, 6, -6, 6], equal: true, items: [arrow(v, "v")] }),
            steps: [
              `${M.v("R")}(${th}) = ${mat([[`cos ${th}`, `−sin ${th}`], [`sin ${th}`, `cos ${th}`]])}. With cos ${n(t)}° = ${n(COS[t])} and sin ${n(t)}° = ${n(SIN[t])}: ${M.v("R")} = ${mat(Rm)}.`,
              `${M.v("R")}${bv("v")} = (${dotTxt(Rm[0], v)}, ${dotTxt(Rm[1], v)}) = ${vec(w)}. Its length is unchanged, as for every rotation.`,
            ],
            ...ansVec(w), vals: { Rm, w }, params: { t, v }, consts: [t],
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const [p, q, c] = r.pick(TRIPLES.slice(0, 2)), sw = r.chance(0.5), a = (sw ? q : p) * r.sign(), b = (sw ? p : q) * r.sign(), refl = r.chance(0.5);
          const Qn = refl ? [[a, b], [b, -a]] : [[a, -b], [b, a]], Q = Qn.map((row) => row.map((e) => new Frac(e, c)));
          const xs = [];
          for (let i = -c; i <= c; i++) for (let j = -c; j <= c; j++) { const bb = mvm(Q, [i, j]); if (allInt(bb) && !(i === 0 && j === 0) && maxAbs(bb) <= 15) xs.push([i, j]); }
          if (!xs.length) continue;
          const sol = r.pick(xs), b2 = intv(mvm(Q, sol)), Qt = trn(Q), dQ = det2(Q);
          const sq = [a * a, b * b, c * c];
          return {
            prompt: `${M.v("Q")} = ${mat(Q)}. Show that ${M.v("Q")} is orthogonal and use that to solve ${M.v("Q")}${bv("x")} = ${bv("b")} for ${bv("b")} = ${col(b2)}. Enter ${bv("x")} as (${x}, ${y}).`,
            steps: [
              `Each column has length 1, since ${M.frac(`${n(sq[0])} + ${n(sq[1])}`, n(sq[2]))} = 1, and the columns are perpendicular (their dot product is 0). So ${M.v("Q")} is orthogonal and ${iv(M.v("Q"))} = ${tp(M.v("Q"))}.`,
              `${tp(M.v("Q"))} = ${mat(Qt)}.`,
              `${bv("x")} = ${tp(M.v("Q"))}${bv("b")} = (${dotTxt(Qt[0], b2)}, ${dotTxt(Qt[1], b2)}) = ${vec(sol)}.`,
              `det ${M.v("Q")} = ${n(dQ)}, so ${M.v("Q")} is a ${dQ.n > 0 ? "rotation" : "reflection"}.`,
            ],
            ...ansVec(sol), vals: { sq, Qt: V(Qt), sol, dQ: V(dQ) }, params: { Qn, c, b: b2 },
          };
        }
      }
      // level 3: two rotations then a reflection
      const tgt = r.pick([90, 180, 270]), al = r.pick([10, 15, 20, 25, 30, 35, 40, 50, 55, 65, 70, 75, 80]), be = tgt - al;
      const lines = [["the x-axis", [[1, 0], [0, -1]], "0"], ["the y-axis", [[-1, 0], [0, 1]], null], ["the line y = x", [[0, 1], [1, 0]], "x"], ["the line y = −x", [[0, -1], [-1, 0]], "-x"]];
      const [lname, Fm, fe] = r.pick(lines);
      let v;
      do v = [r.int(-5, 5), r.int(-5, 5)]; while (isZero(v));
      const Rm = rot(tgt), w = intv(mvm(Rm, v)), res = intv(mvm(Fm, w));
      const items = [{ t: "pt", x: v[0], y: v[1], label: "P" }, fe === null ? { t: "vline", x: 0, role: "muted" } : { t: "fn", e: fe, role: "muted", dash: true }];
      const lnTxt = lname.replace("x-axis", `${x}-axis`).replace("y-axis", `${y}-axis`).replace("y = −x", `${y} = −${x}`).replace("y = x", `${y} = ${x}`);
      return {
        prompt: `A design tool rotates the point ${M.v("P")} = ${vec(v)} by ${n(al)}° counterclockwise about the origin, then by another ${n(be)}°, and then reflects it across ${lnTxt} (dashed). Where does ${M.v("P")} end up?`,
        graph: graph({ view: [-6, 6, -6, 6], equal: true, items }),
        steps: [
          `Rotations about the origin compose by adding angles: ${M.v("R")}(${n(be)}°)${M.v("R")}(${n(al)}°) = ${M.v("R")}(${n(tgt)}°) = ${mat(Rm)}, using cos ${n(tgt)}° = ${n(COS[tgt])} and sin ${n(tgt)}° = ${n(SIN[tgt])}.`,
          `After rotating: ${M.v("R")}(${n(tgt)}°)${vec(v)} = ${vec(w)}.`,
          `Reflection across ${lnTxt}: ${M.v("F")} = ${mat(Fm)}, so ${M.v("F")}${vec(w)} = ${vec(res)}.`,
        ],
        ...ansVec(res), vals: { Rm, w, res }, params: { v, al, be, Fm }, consts: [al, be, tgt],
      };
    },
  };

  // ==== LA.23 Eigenvalues and eigenvectors ====================================================================================
  /** A random 2 × 2 integer matrix whose eigenvalues are distinct integers. */
  function eig2(r, lo = -4, hi = 6) {
    for (;;) {
      const A = [[r.int(lo, hi), r.int(lo, hi)], [r.int(lo, hi), r.int(lo, hi)]];
      const t = A[0][0] + A[1][1], d = A[0][0] * A[1][1] - A[0][1] * A[1][0], disc = t * t - 4 * d;
      if (disc <= 0) continue;
      const s = Math.round(Math.sqrt(disc));
      if (s * s !== disc || (t + s) % 2) continue;
      return { A, t, d, l1: (t + s) / 2, l2: (t - s) / 2 };
    }
  }
  /** A − λI with the actual λ: A − 3I, A + 2I, A − I, or just A. */
  const shiftTxt = (A, l) => (l === 0 ? A : `${A} ${l > 0 ? "−" : "+"} ${scal(Math.abs(l))}${M.v("I")}`);
  const lfac = (l) => (l === 0 ? lam : `(${M.poly([1, -l], "λ")})`);
  /** Trace, determinant and the factored characteristic polynomial of a 2 × 2. */
  const charLines = (A, t, d, l1, l2, name = M.v("A")) => [
    `For a 2 × 2 matrix, det(${name} − ${lam}${M.v("I")}) = ${M.sup(lam, 2)} − (tr ${name})${lam} + det ${name}. Here tr ${name} = ${n(A[0][0])} + ${np(A[1][1])} = ${n(t)} and det ${name} = ${np(A[0][0])} · ${np(A[1][1])} − ${np(A[0][1])} · ${np(A[1][0])} = ${n(d)}.`,
    `${M.poly([1, -t, d], "λ")} = ${lfac(l1)}${lfac(l2)} = 0, since ${n(l1)} + ${np(l2)} = ${n(t)} and ${n(l1)} · ${np(l2)} = ${n(d)}.`,
  ];
  D["LA.9"] = {
    title: "Eigenvalues and eigenvectors",
    generate(r, level) {
      const A = M.v("A");
      if (level === 1) {
        const { A: Am, t, d, l1, l2 } = eig2(r);
        return {
          prompt: `Find the eigenvalues of ${A} = ${mat(Am)}. Enter both, separated by a comma.`,
          steps: [...charLines(Am, t, d, l1, l2), `So ${lam} = ${n(l1)} or ${lam} = ${n(l2)}.`],
          answer: { kind: "numbers", values: [l1, l2] }, answerText: `${lam} = ${n(l1)} and ${lam} = ${n(l2)}`, answerInput: `${l1}, ${l2}`,
          vals: { t, d, l1, l2 }, params: { A: Am },
        };
      }
      if (level === 2) {
        for (;;) {
          const y1 = r.int(-3, 3), y2 = y1 + r.pick([1, -1]), la = r.int(-3, 4), lb = r.intExcept(-3, 4, la);
          const Pm = [[1, 1], [y1, y2]], Am = intv2(mmul(mmul(Pm, [[la, 0], [0, lb]]), inv2(Pm)));
          if (maxAbs(Am) > 12) continue;
          const pick = r.int(0, 1), l = pick ? lb : la, yy = pick ? y2 : y1;
          const Bm = [[Am[0][0] - l, Am[0][1]], [Am[1][0], Am[1][1] - l]];
          const row = Bm[0][1] !== 0 ? 0 : 1;
          const [p, q] = Bm[row];
          if (q === 0) continue;
          const Av = intv(mvm(Am, [1, yy]));
          return {
            prompt: `${n(l)} is an eigenvalue of ${A} = ${mat(Am)}. Find its eigenvector of the form (1, ${y}).`,
            steps: [
              `Eigenvectors for ${lam} = ${n(l)} solve (${shiftTxt(A, l)})${bv("v")} = <b>0</b>, with ${shiftTxt(A, l)} = ${mat(Bm)}.`,
              `Row ${n(row + 1)} with ${bv("v")} = (1, ${y}): ${n(p)} · 1 + ${np(q)}${y} = 0, so ${y} = ${M.frac(n(-p), n(q))} = ${n(yy)}.`,
              `Check: ${A}${vec([1, yy])} = ${vec(Av)} = ${n(l)} · ${vec([1, yy])}.`,
            ],
            ...ansVec([1, yy]), vals: { Bm, p, q, np_: -p, yy, Av }, params: { A: Am, l },
          };
        }
      }
      // level 3: a 3 × 3 that splits into a 2 × 2 block and a single entry
      for (;;) {
        const { A: B, t, d, l1, l2 } = eig2(r, -3, 4), g = r.int(-3, 5);
        if (g === l1 || g === l2) continue;
        const e = r.int(-3, 3), f = r.int(-3, 3), variant = r.int(0, 1);
        const Am = variant === 0 ? [[B[0][0], B[0][1], 0], [B[1][0], B[1][1], 0], [e, f, g]] : [[g, 0, 0], [e, B[0][0], B[0][1]], [f, B[1][0], B[1][1]]];
        const shifted = B.map((row, i) => row.map((v, j) => (i === j ? `${n(v)} − ${lam}` : n(v))));
        return {
          prompt: `Find the eigenvalues of ${A} = ${mat(Am)}. Enter all three, separated by commas.`,
          steps: [
            `Expand det(${A} − ${lam}${M.v("I")}) along ${variant === 0 ? "the third column" : "the first row"}: its only nonzero entry there is ${n(g)} − ${lam}, so det(${A} − ${lam}${M.v("I")}) = (${n(g)} − ${lam}) · det ${mat(shifted)}.`,
            ...charLines(B, t, d, l1, l2, M.v("B")).map((s, i) => (i === 0 ? `The 2 × 2 block is ${M.v("B")} = ${mat(B)}. ${s}` : s)),
            `So det(${A} − ${lam}${M.v("I")}) = (${n(g)} − ${lam})${lfac(l1)}${lfac(l2)}, and the eigenvalues are ${n(g)}, ${n(l1)} and ${n(l2)}.`,
          ],
          answer: { kind: "numbers", values: [g, l1, l2] }, answerText: `${n(g)}, ${n(l1)}, ${n(l2)}`, answerInput: `${g}, ${l1}, ${l2}`,
          vals: { t, d, l1, l2, g }, params: { A: Am, variant }, consts: [3],
        };
      }
    },
  };

  // ==== LA.24 Eigenvalue properties and power iteration ==========================================================================
  D["LA.eig-props"] = {
    title: "Eigenvalues of related matrices",
    generate(r, level) {
      const A = M.v("A"), I = M.v("I");
      const lams = r.sample([-3, -2, -1, 1, 2, 3, 4], 3), lt = lams.map(n).join(", ");
      if (level === 1) {
        const kind = r.int(0, 2), c = r.nonzero(-3, 3);
        const out = kind === 0 ? lams.map((l) => l * l) : kind === 1 ? lams.map((l) => l + c) : lams.map((l) => new Frac(1, l));
        const what = kind === 0 ? M.sup(A, 2) : kind === 1 ? `${A} ${c < 0 ? "−" : "+"} ${scal(Math.abs(c))}${I}` : iv(A);
        const rule = kind === 0 ? `If ${A}${bv("v")} = ${lam}${bv("v")}, then ${M.sup(A, 2)}${bv("v")} = ${A}(${lam}${bv("v")}) = ${M.sup(lam, 2)}${bv("v")}: square each eigenvalue.`
          : kind === 1 ? `(${what})${bv("v")} = ${lam}${bv("v")} ${c < 0 ? "−" : "+"} ${scal(Math.abs(c))}${bv("v")}: add ${n(c)} to each eigenvalue.`
            : `${A}${bv("v")} = ${lam}${bv("v")} gives ${iv(A)}${bv("v")} = ${M.frac("1", lam)}${bv("v")}: take reciprocals (none of the eigenvalues is 0, so ${A} is invertible).`;
        const work = kind === 0 ? lams.map((l, i) => `${M.sup(np(l), 2)} = ${n(out[i])}`) : kind === 1 ? lams.map((l, i) => `${n(l)} ${c < 0 ? "−" : "+"} ${n(Math.abs(c))} = ${n(out[i])}`) : lams.map((l, i) => `${M.frac("1", n(l))}${l < 0 ? ` = ${M.f(out[i])}` : ""}`);
        return {
          prompt: `A 3 × 3 matrix ${A} has eigenvalues ${lt}. Find the eigenvalues of ${what}. Enter all three, separated by commas.`,
          steps: [rule, `${work.join("; ")}.`],
          answer: { kind: "numbers", values: out.map(val) }, answerText: out.map(n).join(", "), answerInput: out.map(typed).join(", "),
          vals: { out: V(out) }, params: { kind, lams, c }, consts: [3],
        };
      }
      if (level === 2) {
        const kind = r.int(0, 2), c = r.nonzero(-3, 3);
        if (kind === 0) {
          const sh = lams.map((l) => l + c), prod = sh.reduce((a, b) => a * b, 1);
          return {
            prompt: `A 3 × 3 matrix ${A} has eigenvalues ${lt}. Find det(${A} ${c < 0 ? "−" : "+"} ${scal(Math.abs(c))}${I}).`,
            steps: [
              `Adding ${n(c)}${I} adds ${n(c)} to every eigenvalue: ${sh.map(n).join(", ")}.`,
              `The determinant is the product of the eigenvalues: ${sh.map(np).join(" · ")} = ${n(prod)}.`,
            ],
            ...ansNum(prod), vals: { sh, prod }, params: { kind, lams, c }, consts: [3],
          };
        }
        if (kind === 1) {
          const sq = lams.map((l) => l * l), s = sq.reduce((a, b) => a + b, 0);
          return {
            prompt: `A 3 × 3 matrix ${A} has eigenvalues ${lt}. Find tr(${M.sup(A, 2)}).`,
            steps: [
              `${M.sup(A, 2)} has the squared eigenvalues: ${sq.map(n).join(", ")}.`,
              `The trace is the sum of the eigenvalues: ${sumNums(sq)} = ${n(s)}. (Not the same as ${M.sup("(tr " + A + ")", 2)}.)`,
            ],
            ...ansNum(s), vals: { sq, s }, params: { kind, lams }, consts: [3],
          };
        }
        const rec = lams.map((l) => new Frac(1, l)), s = rec.reduce((a, b) => a.add(b), F(0));
        return {
          prompt: `A 3 × 3 matrix ${A} has eigenvalues ${lt}. Find tr(${iv(A)}).`,
          steps: [
            `${iv(A)} has the reciprocal eigenvalues: ${rec.map(n).join(", ")}.`,
            `The trace is their sum: ${sumNums(rec)} = ${n(s)}.`,
          ],
          ...ansNum(s), vals: { rec: V(rec), s: V(s) }, params: { kind, lams }, consts: [3],
        };
      }
      // level 3: Cayley–Hamilton, or a Rayleigh-quotient estimate after one power step
      if (r.chance(0.5)) {
        const Am = [[r.int(-3, 3), r.int(-3, 3)], [r.int(-3, 3), r.int(-3, 3)]];
        const t = Am[0][0] + Am[1][1], d = det2(Am).n, k1 = t * t - d, k2 = t * d;
        const kA = intv2(msc(k1, Am)), A3 = intv2(mmul(mmul(Am, Am), Am));
        return {
          prompt: `Use the Cayley–Hamilton theorem to compute ${M.sup(A, 3)} for ${A} = ${mat(Am)} without multiplying ${A} by itself three times. ${entriesNote(4)}`,
          steps: [
            `tr ${A} = ${n(t)} and det ${A} = ${n(d)}, so the characteristic polynomial is ${M.poly([1, -t, d], "λ")}. Cayley–Hamilton: ${M.sup(A, 2)}${M.term(-t, A)}${M.term(d, I)} = 0, so ${M.sup(A, 2)} = ${lin([t, -d], [A, I])}.`,
            `Multiply by ${A}: ${M.sup(A, 3)} = ${lin([t, -d], [M.sup(A, 2), A])} = (${M.sup(np(t), 2)} − ${np(d)})${A} − ${np(t)} · ${np(d)}${I} = ${lin([k1, -k2], [A, I])}.`,
            `${n(k1)}${A} = ${mat(kA)}; subtract ${n(k2)} from each diagonal entry: ${M.sup(A, 3)} = ${mat(A3)}.`,
          ],
          ...ansMat(A3), vals: { t, d, k1, k2, kA, A3 }, params: { kind: 0, A: Am }, consts: [3],
        };
      }
      for (;;) {
        const a = r.int(1, 5), b = r.nonzero(-3, 3), dd = r.int(-2, 5), Am = [[a, b], [b, dd]];
        const t = a + dd, d = a * dd - b * b, disc = t * t - 4 * d, s = Math.round(Math.sqrt(disc));
        if (s * s !== disc || (t + s) % 2) continue;
        const l1 = (t + s) / 2, l2 = (t - s) / 2;
        if (Math.abs(l1) <= Math.abs(l2)) continue;
        const x0 = r.pick([[1, 0], [0, 1], [1, 1]]), x1 = intv(mvm(Am, x0)), Ax1 = intv(mvm(Am, x1));
        const num = dot(x1, Ax1).n, den = dot(x1, x1).n;
        if (den === 0) continue;
        const R = new Frac(num, den);
        return {
          prompt: `Take one step of power iteration for ${A} = ${mat(Am)} from ${M.sub(bv("x"), 0)} = ${vec(x0)}: ${M.sub(bv("x"), 1)} = ${A}${M.sub(bv("x"), 0)} (normalizing does not change the estimate). Then estimate the dominant eigenvalue by the Rayleigh quotient ${M.frac(`${tp(M.sub(bv("x"), 1))}${A}${M.sub(bv("x"), 1)}`, `${tp(M.sub(bv("x"), 1))}${M.sub(bv("x"), 1)}`)}.`,
          steps: [
            `${M.sub(bv("x"), 1)} = ${A}${vec(x0)} = ${vec(x1)}.`,
            `${A}${M.sub(bv("x"), 1)} = ${vec(Ax1)}, so the numerator is ${vec(x1)} · ${vec(Ax1)} = ${n(num)} and the denominator is ${vec(x1)} · ${vec(x1)} = ${n(den)}.`,
            `The estimate is ${M.frac(n(num), n(den))}${R.n !== num ? ` = ${M.f(R)}` : ""}.`,
            `For comparison, ${M.poly([1, -t, d], "λ")} = 0 gives the exact eigenvalues ${n(l1)} and ${n(l2)}; the dominant one is ${n(l1)}, and more steps would bring the estimate closer.`,
          ],
          ...ansNum(R), vals: { x1, Ax1, num, den, R: V(R), t, d, l1, l2 }, params: { kind: 1, A: Am, x0 },
        };
      }
    },
  };

  // ==== LA.25 Diagonalization and powers ==========================================================================================
  D["LA.10"] = {
    title: "Diagonalization and matrix powers",
    generate(r, level) {
      const A = M.v("A"), Pn = M.v("P"), Dn = M.v("D");
      if (level === 1) {
        const Pm = unimod2(r, -2, 3), [l1, l2] = r.sample([-3, -2, -1, 0, 1, 2, 3, 4], 2), Dm = [[l1, 0], [0, l2]];
        const Pi = intv2(inv2(Pm)), PD = intv2(mmul(Pm, Dm)), Am = intv2(mmul(PD, Pi));
        return {
          prompt: `Find ${A} = ${Pn}${Dn}${iv(Pn)} for ${Pn} = ${mat(Pm)} and ${Dn} = ${mat(Dm)}. ${entriesNote(4)}`,
          steps: [
            `det ${Pn} = ${n(det2(Pm))}, so ${iv(Pn)} = ${mat(Pi)}.`,
            `${Pn}${Dn} scales the columns of ${Pn} by ${n(l1)} and ${n(l2)}: ${mat(PD)}.`,
            `${A} = (${Pn}${Dn})${iv(Pn)} = ${mat(Am)}. Its eigenvalues are ${n(l1)} and ${n(l2)}, with the columns of ${Pn} as eigenvectors.`,
          ],
          ...ansMat(Am), vals: { dP: det2(Pm).n, Pi, PD, Am }, params: { P: Pm, D: Dm },
        };
      }
      if (level === 2) {
        for (;;) {
          const Pm = unimod2(r, -2, 2), [l1, l2] = r.sample([-2, -1, 1, 2, 3], 2), k = r.int(3, 5), Dm = [[l1, 0], [0, l2]];
          const p1 = Math.pow(l1, k), p2 = Math.pow(l2, k), Dk = [[p1, 0], [0, p2]];
          const Pi = intv2(inv2(Pm)), PDk = intv2(mmul(Pm, Dk)), Ak = intv2(mmul(PDk, Pi));
          if (maxAbs(Ak) > 999) continue;
          return {
            prompt: `${A} = ${Pn}${Dn}${iv(Pn)} with ${Pn} = ${mat(Pm)} and ${Dn} = ${mat(Dm)}. Find ${M.sup(A, k)}. ${entriesNote(4)}`,
            steps: [
              `${M.sup(A, k)} = ${Pn}${M.sup(Dn, k)}${iv(Pn)}: the inner ${iv(Pn)}${Pn} pairs cancel, so only the diagonal is raised to the power.`,
              `${M.sup(Dn, k)} = ${mat([[M.sup(np(l1), k), 0], [0, M.sup(np(l2), k)]])} = ${mat(Dk)}.`,
              `${iv(Pn)} = ${mat(Pi)} (det ${Pn} = ${n(det2(Pm))}), and ${Pn}${M.sup(Dn, k)} = ${mat(PDk)}.`,
              `${M.sup(A, k)} = ${mat(PDk)}${mat(Pi)} = ${mat(Ak)}.`,
            ],
            ...ansMat(Ak), vals: { p1, p2, Pi, PDk, Ak, dP: det2(Pm).n }, params: { P: Pm, D: Dm, k },
          };
        }
      }
      // level 3: Aᵏx₀ through the eigenvector basis
      for (;;) {
        const Pm = unimod2(r, -2, 2), [l1, l2] = r.sample([-2, -1, 1, 2, 3], 2).sort((p, q) => q - p), k = r.int(3, 5);
        const Am = intv2(mmul(mmul(Pm, [[l1, 0], [0, l2]]), inv2(Pm)));
        if (maxAbs(Am) > 9) continue;
        const t = Am[0][0] + Am[1][1], d = det2(Am).n;
        const eig = [l1, l2].map((l) => {
          const Bm = [[Am[0][0] - l, Am[0][1]], [Am[1][0], Am[1][1] - l]];
          const row = Bm[0][0] !== 0 || Bm[0][1] !== 0 ? 0 : 1, [p, q] = Bm[row];
          let v = [q, -p];
          const g = igcd(v);
          v = v.map((e) => e / g);
          if (v[0] < 0 || (v[0] === 0 && v[1] < 0)) v = v.map((e) => -e + 0);
          return { Bm, row, p, q, v };
        });
        const [v1, v2] = [eig[0].v, eig[1].v], x0 = [r.int(-3, 3), r.int(-3, 3)];
        if (isZero(x0)) continue;
        const Dt = v1[0] * v2[1] - v2[0] * v1[1], n1 = x0[0] * v2[1] - v2[0] * x0[1], n2 = v1[0] * x0[1] - x0[0] * v1[1];
        if (Dt === 0 || n1 % Dt || n2 % Dt) continue;
        const c1 = n1 / Dt, c2 = n2 / Dt, p1 = Math.pow(l1, k), p2 = Math.pow(l2, k);
        if (c1 === 0 || c2 === 0) continue;
        const w1 = v1.map((e) => c1 * p1 * e), w2 = v2.map((e) => c2 * p2 * e), res = [w1[0] + w2[0], w1[1] + w2[1]];
        const C1 = `${M.v("c")}₁`, C2 = `${M.v("c")}₂`;
        const eigLine = (e, l, i) => `${lam} = ${n(l)}: ${shiftTxt(A, l)} = ${mat(e.Bm)}; row ${n(e.row + 1)} says ${lin([e.p, e.q], [x, y])} = 0, so ${bv("v", i)} = ${vec(e.v)}.`;
        return {
          prompt: `Let ${A} = ${mat(Am)} and ${M.sub(bv("x"), 0)} = ${vec(x0)}. Use eigenvectors to find ${M.sup(A, k)}${M.sub(bv("x"), 0)}.`,
          steps: [
            ...charLines(Am, t, d, l1, l2),
            `Eigenvectors. ${eigLine(eig[0], l1, 1)} ${eigLine(eig[1], l2, 2)}`,
            `Write ${M.sub(bv("x"), 0)} = ${C1}${bv("v", 1)} + ${C2}${bv("v", 2)}. The determinant of [${bv("v", 1)} ${bv("v", 2)}] is ${n(Dt)}; Cramer's rule gives ${C1} = ${M.frac(n(n1), n(Dt))} = ${n(c1)} and ${C2} = ${M.frac(n(n2), n(Dt))} = ${n(c2)}.`,
            `${M.sup(A, k)} multiplies each eigenvector by ${M.sup(lam, k)}: ${M.sup(A, k)}${M.sub(bv("x"), 0)} = ${n(c1)} · ${M.sup(np(l1), k)}${bv("v", 1)} + ${np(c2)} · ${M.sup(np(l2), k)}${bv("v", 2)} = ${n(c1 * p1)}${vec(v1)} + ${np(c2 * p2)}${vec(v2)}.`,
            `= ${vec(w1)} + ${vec(w2)} = ${vec(res)}.`,
          ],
          ...ansVec(res), vals: { t, d, l1, l2, eig: eig.map((e) => [e.Bm, e.row + 1, e.p, e.q, e.v]), Dt, n1, n2, c1, c2, cp1: c1 * p1, cp2: c2 * p2, w1, w2, res }, params: { A: Am, x0, k },
        };
      }
    },
  };

  // ==== LA.26 Markov chains ===========================================================================================================
  const dec = (q) => fmt(val(q));
  const decMat = (A) => mat(A.map((row) => row.map((q) => dec(q))));
  const PI = (i) => `${M.v("π")}${sb(i)}`;
  D["LA.markov"] = {
    title: "Markov chains",
    generate(r, level) {
      if (level === 1) {
        const a = new Frac(r.int(1, 5), 10), b = new Frac(r.int(1, 6), 10), p = new Frac(r.int(1, 9), 10);
        const a1 = F(1).sub(a), b1 = F(1).sub(b), p1 = F(1).sub(p), Pm = [[a1, a], [b, b1]];
        const t = [p.mul(a1), p1.mul(b), p.mul(a), p1.mul(b1)], s1 = t[0].add(t[1]), s2 = t[2].add(t[3]);
        return {
          prompt: `Each day is sunny or rainy. A sunny day is followed by a rainy one with probability ${dec(a)}; a rainy day is followed by a sunny one with probability ${dec(b)}. So the transition matrix (rows and columns in the order sunny, rainy) is ${M.v("P")} = ${decMat(Pm)}. Today is sunny with probability ${dec(p)}. Find tomorrow's distribution, (probability of sun, probability of rain).`,
          steps: [
            `Today's distribution is the row vector ${M.sub(bv("π"), 0)} = (${dec(p)}, ${dec(p1)}), and tomorrow's is ${M.sub(bv("π"), 0)}${M.v("P")}.`,
            `Sunny: ${dec(p)} · ${dec(a1)} + ${dec(p1)} · ${dec(b)} = ${dec(t[0])} + ${dec(t[1])} = ${dec(s1)}.`,
            `Rainy: ${dec(p)} · ${dec(a)} + ${dec(p1)} · ${dec(b1)} = ${dec(t[2])} + ${dec(t[3])} = ${dec(s2)}. Check: ${dec(s1)} + ${dec(s2)} = 1.`,
          ],
          answer: { kind: "point", value: [s1.value, s2.value] }, answerText: `(${dec(s1)}, ${dec(s2)})`, answerInput: `(${dec(s1)}, ${dec(s2)})`,
          vals: { a1: V(a1), b1: V(b1), p1: V(p1), t: V(t), s1: V(s1), s2: V(s2) }, params: { a: V(a), b: V(b), p: V(p) },
        };
      }
      if (level === 2) {
        const ap = r.int(1, 6) * 5, bp = r.int(1, 8) * 5, a = new Frac(ap, 100), b = new Frac(bp, 100), ab = a.add(b);
        const a1 = F(1).sub(a), b1 = F(1).sub(b), pi1 = b.div(ab), pi2 = a.div(ab);
        return {
          prompt: `Each month ${n(ap)}% of a streaming service's subscribers cancel, and ${n(bp)}% of former subscribers come back. With states (subscribed, not subscribed), ${M.v("P")} = ${decMat([[a1, a], [b, b1]])}. In the long run, what share of people are subscribed and not subscribed? Enter the stationary distribution (${PI(1)}, ${PI(2)}) as fractions.`,
          steps: [
            `The stationary distribution satisfies ${bv("π")}${M.v("P")} = ${bv("π")}. Its first entry: ${dec(a1)}${PI(1)} + ${dec(b)}${PI(2)} = ${PI(1)}, so ${dec(a)}${PI(1)} = ${dec(b)}${PI(2)}: the flow out of “subscribed” equals the flow in.`,
            `With ${PI(1)} + ${PI(2)} = 1: ${PI(1)} = ${M.frac(dec(b), `${dec(a)} + ${dec(b)}`)} = ${M.frac(dec(b), dec(ab))} = ${M.f(pi1)}.`,
            `${PI(2)} = 1 − ${M.f(pi1)} = ${M.f(pi2)}.`,
          ],
          ...ansVec([pi1, pi2]), vals: { a: V(a), b: V(b), a1: V(a1), b1: V(b1), ab: V(ab), pi1: V(pi1), pi2: V(pi2) }, params: { ap, bp },
        };
      }
      // level 3: three rooms in a row (a birth–death chain)
      for (;;) {
        const [p, q, rr, s] = [r.int(1, 5), r.int(1, 5), r.int(1, 5), r.int(1, 5)].map((k) => new Frac(k, 10));
        const mid = F(1).sub(q).sub(rr);
        if (mid.n <= 0) continue;
        const Pm = [[F(1).sub(p), p, F(0)], [q, mid, rr], [F(0), s, F(1).sub(s)]];
        const r1 = q.div(p), r3 = rr.div(s), tot = r1.add(1).add(r3), pi2 = F(1).div(tot), pi1 = r1.mul(pi2), pi3 = r3.mul(pi2);
        if (tot.d > 12) continue;
        return {
          prompt: `A mouse moves among three rooms in a row. Each minute it stays or moves to a neighbouring room, with transition matrix ${M.v("P")} = ${decMat(Pm)} (rooms 1, 2, 3 in order). Find the long-run share of time it spends in each room, (${PI(1)}, ${PI(2)}, ${PI(3)}), as fractions.`,
          steps: [
            `Solve ${bv("π")}${M.v("P")} = ${bv("π")}. The first column: ${PI(1)} = ${dec(Pm[0][0])}${PI(1)} + ${dec(q)}${PI(2)}, so ${dec(p)}${PI(1)} = ${dec(q)}${PI(2)} and ${PI(1)} = ${M.frac(dec(q), dec(p))}${PI(2)} = ${M.f(r1)}${PI(2)}.`,
            `The third column: ${PI(3)} = ${dec(rr)}${PI(2)} + ${dec(Pm[2][2])}${PI(3)}, so ${dec(s)}${PI(3)} = ${dec(rr)}${PI(2)} and ${PI(3)} = ${M.frac(dec(rr), dec(s))}${PI(2)} = ${M.f(r3)}${PI(2)}.`,
            `The shares add to 1: (${M.f(r1)} + 1 + ${M.f(r3)})${PI(2)} = ${M.f(tot)}${PI(2)} = 1, so ${PI(2)} = ${M.f(pi2)}.`,
            `${PI(1)} = ${M.f(r1)} · ${M.f(pi2)} = ${M.f(pi1)} and ${PI(3)} = ${M.f(r3)} · ${M.f(pi2)} = ${M.f(pi3)}.`,
          ],
          ...ansVec([pi1, pi2, pi3]), vals: { P: V(Pm), r1: V(r1), r3: V(r3), tot: V(tot), pi: V([pi1, pi2, pi3]) }, params: { p: V(p), q: V(q), r: V(rr), s: V(s) }, consts: [3],
        };
      }
    },
  };

  // ==== LA.27 Quadratic forms and definiteness =============================================================================================
  const DEFOPT = ["Positive definite", "Negative definite", "Indefinite", "Positive semidefinite, not definite"];
  D["LA.11"] = {
    title: "Quadratic forms and positive definiteness",
    generate(r, level) {
      const A = M.v("A");
      if (level === 1) {
        for (;;) {
          const a = r.int(-3, 4), b = r.int(-3, 3), c = r.int(-3, 4), v = [r.nonzero(-3, 3), r.nonzero(-3, 3)], Am = [[a, b], [b, c]];
          const Av = intv(mvm(Am, v)), q = dot(v, Av).n, terms = [a * v[0] * v[0], 2 * b * v[0] * v[1], c * v[1] * v[1]];
          return {
            prompt: `Evaluate the quadratic form ${tp(bv("x"))}${A}${bv("x")} for ${A} = ${mat(Am)} and ${bv("x")} = ${vec(v)}.`,
            steps: [
              `${A}${bv("x")} = (${dotTxt(Am[0], v)}, ${dotTxt(Am[1], v)}) = ${vec(Av)}.`,
              `${tp(bv("x"))}(${A}${bv("x")}) = ${dotTxt(v, Av)} = ${n(q)}.`,
              `Check with the expanded form ${M.v("a")}${M.sup(x, 2)} + 2${M.v("b")}${x}${y} + ${M.v("c")}${M.sup(y, 2)}: ${np(a)} · ${M.sup(np(v[0]), 2)} + 2 · ${np(b)} · ${np(v[0])} · ${np(v[1])} + ${np(c)} · ${M.sup(np(v[1]), 2)} = ${sumNums(terms)} = ${n(q)}.`,
            ],
            ...ansNum(q), vals: { Av, q, terms }, params: { A: Am, v },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const kind = r.int(0, 3);
          let a, B, c;
          if (kind === 0) { a = r.int(1, 4); c = r.int(1, 5); B = r.int(-6, 6); }
          else if (kind === 1) { a = -r.int(1, 4); c = -r.int(1, 5); B = r.int(-6, 6); }
          else if (kind === 2) { a = r.int(-4, 4); c = r.int(-4, 4); B = r.nonzero(-8, 8); }
          else { const k = r.int(1, 2), s = r.int(1, 2), t = r.int(1, 3); a = k * s * s; c = k * t * t; B = 2 * k * s * t * r.sign(); }
          const h = new Frac(B, 2), h2 = h.mul(h), ac = a * c, D2 = F(ac).sub(h2);
          const idx = D2.n < 0 ? 2 : D2.n === 0 ? (a + c > 0 ? 3 : -1) : a > 0 ? 0 : 1;
          if (idx !== kind) continue;
          const trA = a + c;
          const verdict = [
            `${M.v("D")}₁ = ${n(a)} &gt; 0 and ${M.v("D")}₂ = ${M.f(D2)} &gt; 0, so by Sylvester's criterion the form is positive definite: a bowl.`,
            `${M.v("D")}₁ = ${n(a)} &lt; 0 and ${M.v("D")}₂ = ${M.f(D2)} &gt; 0: then −${A} passes Sylvester's test, so the form is negative definite, an upside-down bowl.`,
            `${M.v("D")}₂ = det ${A} &lt; 0. The determinant is the product of the two eigenvalues, so they have opposite signs: indefinite, a saddle.`,
            `${M.v("D")}₂ = 0, so one eigenvalue is 0; the other equals tr ${A} = ${n(a)} + ${np(c)} = ${n(trA)} &gt; 0. Positive semidefinite but not definite: a trough.`,
          ][idx];
          const form = `${M.term(a, M.sup(x, 2), { first: true })}${M.term(B, `${x}${y}`, { first: a === 0 })}${M.term(c, M.sup(y, 2), { first: a === 0 && B === 0 })}`;
          return {
            prompt: `Classify the quadratic form ${M.v("q")}(${x}, ${y}) = ${form}.`,
            steps: [
              `Write it as ${tp(bv("x"))}${A}${bv("x")} with a symmetric ${A}, splitting the ${x}${y} coefficient in half: ${A} = ${mat([[a, h], [h, c]])}.`,
              `Leading principal minors: ${M.v("D")}₁ = ${n(a)} and ${M.v("D")}₂ = det ${A} = ${np(a)} · ${np(c)} − ${M.sup(M.f(h, { paren: true }), 2)} = ${n(ac)} − ${M.f(h2)} = ${M.f(D2)}.`,
              verdict,
            ],
            ...ansChoice(DEFOPT, idx), vals: { h: V(h), h2: V(h2), ac, D2: V(D2), trA }, params: { a, B, c },
          };
        }
      }
      // level 3: the smallest whole k that makes a 3 × 3 positive definite
      for (;;) {
        const a = r.int(1, 4), b = r.int(-3, 3), c = r.int(1, 6), d = r.nonzero(-3, 3), D2 = a * c - b * b;
        if (D2 <= 0) continue;
        const ad2 = a * d * d, thr = new Frac(ad2, D2), kmin = Math.floor(thr.value) + 1;
        const K = M.v("k"), Am = [[a, b, 0], [b, c, d], [0, d, K]];
        return {
          prompt: `Find the smallest integer ${K} for which ${A} = ${mat(Am)} is positive definite.`,
          steps: [
            `Sylvester's criterion: all three leading principal minors must be positive.`,
            `${M.v("D")}₁ = ${n(a)} &gt; 0 and ${M.v("D")}₂ = ${n(a)} · ${n(c)} − ${M.sup(np(b), 2)} = ${n(D2)} &gt; 0, whatever ${K} is.`,
            `${M.v("D")}₃ = det ${A}. Expanding along the first row: ${n(a)}(${n(c)}${K} − ${M.sup(np(d), 2)}) − ${np(b)}(${np(b)}${K} − 0) = ${n(D2)}${K} − ${n(ad2)}.`,
            `${n(D2)}${K} − ${n(ad2)} &gt; 0 means ${K} &gt; ${M.frac(n(ad2), n(D2))}${thr.d !== D2 || thr.n !== ad2 ? ` = ${M.f(thr)}` : ""}. The smallest integer above it is ${n(kmin)}.`,
          ],
          ...ansNum(kmin), vals: { D2, ad2, thr: V(thr), kmin }, params: { a, b, c, d }, consts: [3],
        };
      }
    },
  };

  // ==== LA.28 Singular value decomposition ==================================================================================================
  D["LA.12"] = {
    title: "Singular values and low-rank approximation",
    generate(r, level) {
      const A = M.v("A"), AtA = `${tp(A)}${A}`;
      if (level === 1) {
        for (;;) {
          const [p, q, c] = r.pick([[1, 0, 1], [3, 4, 5], [5, 12, 13]]), s = r.nonzero(-3, 3), t = r.nonzero(-3, 3);
          if (Math.abs(s) === Math.abs(t) || (c === 13 && (Math.abs(s) > 1 || Math.abs(t) > 1))) continue;
          if (c === 13 && Math.abs(s) === Math.abs(t)) continue;
          const c1 = [s * p, s * q], c2 = [-t * q + 0, t * p];
          const Am = [[c1[0], c2[0]], [c1[1], c2[1]]], G = intv2(mmul(trn(Am), Am)), sig = [Math.abs(s) * c, Math.abs(t) * c].sort((u, v) => v - u);
          return {
            prompt: `Find the singular values of ${A} = ${mat(Am)}. Enter both, largest first.`,
            steps: [
              `The singular values are the square roots of the eigenvalues of ${AtA}.`,
              `${AtA} = ${mat(G)}. The columns of ${A} are perpendicular, so ${AtA} is diagonal and its eigenvalues are its diagonal entries, ${n(G[0][0])} and ${n(G[1][1])}.`,
              `${M.v("σ")}₁ = ${M.sqrt(n(sig[0] * sig[0]))} = ${n(sig[0])} and ${M.v("σ")}₂ = ${M.sqrt(n(sig[1] * sig[1]))} = ${n(sig[1])}: the lengths of the two columns.`,
            ],
            answer: { kind: "numbers", values: sig, ordered: true }, answerText: `${n(sig[0])}, ${n(sig[1])}`, answerInput: `${sig[0]}, ${sig[1]}`,
            vals: { G, sig, sq: sig.map((e) => e * e) }, params: { A: Am },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const Am = [[r.int(-3, 4), r.int(-3, 4)], [r.int(-3, 4), r.int(-3, 4)]], G = intv2(mmul(trn(Am), Am));
          const t = G[0][0] + G[1][1], d = G[0][0] * G[1][1] - G[0][1] * G[1][0], disc = t * t - 4 * d;
          if (d === 0 || G[0][1] === 0) continue;
          const s = Math.round(Math.sqrt(disc));
          if (s * s !== disc || (t + s) % 2) continue;
          const l1 = (t + s) / 2, l2 = (t - s) / 2, [k1, s1] = sqf(l1), [k2, s2] = sqf(l2);
          return {
            prompt: `Find the singular values of ${A} = ${mat(Am)}. Enter both, largest first, as exact roots.`,
            steps: [
              `${AtA} = ${mat(G)}.`,
              `Its eigenvalues solve ${M.sup(lam, 2)} − ${n(t)}${lam} + ${n(d)} = 0 (trace ${n(t)}, determinant ${n(d)}): ${lfac(l1)}${lfac(l2)} = 0, so ${lam} = ${n(l1)} and ${n(l2)}.`,
              `${M.v("σ")}₁ = ${M.sqrt(n(l1))}${k1 > 1 || s1 === 1 ? ` = ${radTxt(k1, s1)}` : ""} and ${M.v("σ")}₂ = ${M.sqrt(n(l2))}${k2 > 1 || s2 === 1 ? ` = ${radTxt(k2, s2)}` : ""}.`,
            ],
            answer: { kind: "numbers", values: [Math.sqrt(l1), Math.sqrt(l2)], ordered: true }, answerText: `${radTxt(k1, s1)}, ${radTxt(k2, s2)}`, answerInput: `${radIn(k1, s1)}, ${radIn(k2, s2)}`,
            vals: { G, t, d, l1, l2, k1, s1, k2, s2 }, params: { A: Am },
          };
        }
      }
      // level 3: best rank-1 approximation
      for (;;) {
        const [p, q, c] = [3, 4, 5], sw = r.chance(0.5), vx = (sw ? q : p) * r.sign(), vy = (sw ? p : q) * r.sign();
        const m1 = r.int(2, c === 13 ? 2 : 3), m2 = r.int(1, m1 - 1), s1 = m1 * c, s2 = m2 * c;
        const Um = r.pick([[[1, 0], [0, 1]], [[0, 1], [1, 0]]]).map((row) => row.map((e) => e)), sg = [r.sign(), r.sign()];
        const U = Um.map((row) => row.map((e, j) => e * sg[j] + 0));
        const Vt = [[vx, vy], [-vy + 0, vx]].map((row) => row.map((e) => new Frac(e, c)));
        const Am = intv2(mmul(mmul(U, [[s1, 0], [0, s2]]), Vt));
        const G = intv2(mmul(trn(Am), Am)), t = G[0][0] + G[1][1], d = G[0][0] * G[1][1] - G[0][1] * G[1][0];
        const l1 = s1 * s1, l2 = s2 * s2;
        const Bm = [[G[0][0] - l1, G[0][1]], [G[1][0], G[1][1] - l1]], row = Bm[0][0] !== 0 || Bm[0][1] !== 0 ? 0 : 1, [bp, bq] = Bm[row];
        let dir = [bq, -bp];
        const g = igcd(dir);
        dir = dir.map((e) => e / g);
        if (dir[0] < 0) dir = dir.map((e) => -e + 0);
        const nn = Math.round(Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1]));
        if (nn !== c) continue;
        const v1 = dir.map((e) => new Frac(e, c)), Av = mvm(Am, v1), u1 = Av.map((e) => e.div(s1));
        const A1 = u1.map((ui) => v1.map((vj) => ui.mul(vj).mul(s1)));
        return {
          prompt: `Find the best rank-1 approximation ${M.sub(A, 1)} = ${M.sub(M.v("σ"), 1)}${M.sub(bv("u"), 1)}${tp(M.sub(bv("v"), 1))} of ${A} = ${mat(Am)}. ${entriesNote(4)}`,
          steps: [
            `${AtA} = ${mat(G)}, with trace ${n(t)} and determinant ${n(d)}, so its eigenvalues solve ${M.poly([1, -t, d], "λ")} = 0: ${lam} = ${n(l1)} and ${n(l2)}. So ${M.v("σ")}₁ = ${M.sqrt(n(l1))} = ${n(s1)} and ${M.v("σ")}₂ = ${M.sqrt(n(l2))} = ${n(s2)}.`,
            `${M.sub(bv("v"), 1)}: ${shiftTxt(AtA, l1)} = ${mat(Bm)}; row ${n(row + 1)} says ${lin([bp, bq], [x, y])} = 0, so the direction is ${vec(dir)}, of length ${n(c)}. Normalize: ${M.sub(bv("v"), 1)} = ${vec(v1)}.`,
            `${M.sub(bv("u"), 1)} = ${M.frac(`${A}${M.sub(bv("v"), 1)}`, M.sub(M.v("σ"), 1))} = ${M.frac(vec(Av), n(s1))} = ${vec(u1)}.`,
            `${M.sub(A, 1)} = ${n(s1)}${M.sub(bv("u"), 1)}${tp(M.sub(bv("v"), 1))} = ${mat(A1)}. The error ${norm(`${A} − ${M.sub(A, 1)}`)}${M.sub("", M.v("F"))} is ${M.v("σ")}₂ = ${n(s2)}.`,
          ],
          ...ansMat(A1), vals: { G, t, d, l1, l2, s1, s2, Bm, dir, c, v1: V(v1), Av: V(Av), u1: V(u1), A1: V(A1) }, params: { A: Am },
        };
      }
    },
  };

  // ==== LA.29 Norms, trace and condition number ================================================================================================
  D["LA.13"] = {
    title: "Norms and condition number",
    generate(r, level) {
      const A = M.v("A");
      if (level === 1) {
        const [a, b, c, len] = r.pick(QUADS.slice(0, 6)), v = signedPerm(r, [a, b, c]);
        const ab = v.map((e) => Math.abs(e)), n1 = ab[0] + ab[1] + ab[2], sq = v.map((e) => e * e), N = sq[0] + sq[1] + sq[2], ninf = Math.max(...ab);
        return {
          prompt: `Find the three norms ${norm(bv("x"))}₁, ${norm(bv("x"))}₂ and ${norm(bv("x"))}<sub>∞</sub> of ${bv("x")} = ${vec(v)}. Enter them in that order.`,
          steps: [
            `${norm(bv("x"))}₁ adds the absolute values: ${sumNums(ab)} = ${n(n1)}.`,
            `${norm(bv("x"))}₂ is the ordinary length: ${M.sqrt(sumNums(sq))} = ${M.sqrt(n(N))} = ${n(len)}.`,
            `${norm(bv("x"))}<sub>∞</sub> is the largest absolute value: ${n(ninf)}.`,
          ],
          answer: { kind: "point", value: [n1, len, ninf] }, answerText: `${n(n1)}, ${n(len)}, ${n(ninf)}`, answerInput: `${n1}, ${len}, ${ninf}`,
          vals: { ab, n1, sq, N, len, ninf }, params: { v },
        };
      }
      if (level === 2) {
        for (;;) {
          const rows = r.int(2, 3), Am = Array.from({ length: rows }, () => [r.int(-5, 6), r.int(-5, 6)]);
          const sq = flat(Am).map((e) => e * e), N = sq.reduce((s, e) => s + e, 0), [k, s] = sqf(N);
          if (N === 0) continue;
          return {
            prompt: `Find the Frobenius norm ${norm(A)}${M.sub("", M.v("F"))} of ${A} = ${mat(Am)}. Give an exact answer.`,
            steps: [
              `Treat the matrix as one long vector: square every entry and add. ${sumNums(sq)} = ${n(N)}.`,
              `${norm(A)}${M.sub("", M.v("F"))} = ${M.sqrt(n(N))}${k > 1 || s === 1 ? ` = ${radTxt(k, s)}` : ""}. (This also equals ${M.sqrt(`tr(${tp(A)}${A})`)}.)`,
            ],
            answer: { kind: "number", value: Math.sqrt(N) }, answerText: radTxt(k, s), answerInput: radIn(k, s),
            vals: { sq, N, k, s }, params: { A: Am }, consts: rows === 3 ? [3] : [],
          };
        }
      }
      // level 3: condition number of a symmetric matrix and the error bound
      for (;;) {
        const a = r.int(-6, 9), b = r.nonzero(-6, 6), d = r.int(-6, 9), Am = [[a, b], [b, d]];
        const t = a + d, dt = a * d - b * b, disc = t * t - 4 * dt, s = Math.round(Math.sqrt(disc));
        if (dt === 0 || s * s !== disc || (t + s) % 2) continue;
        const l1 = (t + s) / 2, l2 = (t - s) / 2, big = Math.max(Math.abs(l1), Math.abs(l2)), small = Math.min(Math.abs(l1), Math.abs(l2));
        if (big % small || big === small) continue;
        const kap = big / small, eps = new Frac(r.pick([1, 2, 5]), 10), bound = eps.mul(kap);
        return {
          prompt: `The data ${bv("b")} in ${A}${bv("x")} = ${bv("b")} have a relative error of up to ${dec(eps)}%, and ${A} = ${mat(Am)}. Using the condition number, how large can the relative error in ${bv("x")} be, in percent?`,
          steps: [
            `${A} is symmetric, so its singular values are the absolute values of its eigenvalues. Trace ${n(t)}, determinant ${n(dt)}: ${M.poly([1, -t, dt], "λ")} = ${lfac(l1)}${lfac(l2)} = 0, so ${lam} = ${n(l1)} and ${n(l2)}.`,
            `${M.v("σ")}<sub>max</sub> = ${n(big)} and ${M.v("σ")}<sub>min</sub> = ${n(small)}, so ${M.v("κ")}(${A}) = ${M.frac(n(big), n(small))} = ${n(kap)}.`,
            `The relative error in ${bv("x")} can be up to ${M.v("κ")} times that in ${bv("b")}: ${n(kap)} × ${dec(eps)}% = ${dec(bound)}%.`,
          ],
          answer: { kind: "number", value: bound.value }, answerText: `${dec(bound)}%`, answerInput: dec(bound),
          vals: { t, dt, l1, l2, big, small, kap, eps: V(eps), bound: V(bound) }, params: { A: Am, eps: V(eps) },
        };
      }
    },
  };

  // ==== LA.30 Matrix calculus ===================================================================================================================
  D["LA.17"] = {
    title: "Gradients of linear and quadratic forms",
    generate(r, level) {
      const A = M.v("A"), f = M.v("f"), grad = `∇${f}`;
      if (level === 1) {
        const x0 = [r.int(-3, 3), r.int(-3, 3)];
        if (r.chance(0.5)) {
          const a = [r.int(-5, 5), r.int(-5, 5)], tx = x0.map((e) => 2 * e), g = [a[0] + tx[0], a[1] + tx[1]];
          return {
            prompt: `${f}(${bv("x")}) = ${tp(bv("a"))}${bv("x")} + ${M.sup(norm(bv("x")), 2)} with ${bv("a")} = ${vec(a)}. Find ${grad} at ${bv("x")} = ${vec(x0)}.`,
            steps: [
              `${M.sub("∇", bv("x"))}(${tp(bv("a"))}${bv("x")}) = ${bv("a")} and ${M.sub("∇", bv("x"))}${M.sup(norm(bv("x")), 2)} = 2${bv("x")}, so ${grad} = ${bv("a")} + 2${bv("x")}.`,
              `${vec(a)} + 2${vec(x0)} = ${vec(a)} + ${vec(tx)} = ${vec(g)}.`,
            ],
            ...ansVec(g), vals: { tx, g }, params: { kind: 0, a, x0 },
          };
        }
        const b = r.int(-3, 3), Am = [[r.int(-3, 4), b], [b, r.int(-3, 4)]], Ax = intv(mvm(Am, x0)), g = Ax.map((e) => 2 * e);
        return {
          prompt: `${f}(${bv("x")}) = ${tp(bv("x"))}${A}${bv("x")} with the symmetric matrix ${A} = ${mat(Am)}. Find ${grad} at ${bv("x")} = ${vec(x0)}.`,
          steps: [
            `For symmetric ${A}, ${M.sub("∇", bv("x"))}(${tp(bv("x"))}${A}${bv("x")}) = 2${A}${bv("x")}, like the derivative of ${M.v("a")}${M.sup(x, 2)}.`,
            `${A}${bv("x")} = (${dotTxt(Am[0], x0)}, ${dotTxt(Am[1], x0)}) = ${vec(Ax)}, so ${grad} = 2${vec(Ax)} = ${vec(g)}.`,
          ],
          ...ansVec(g), vals: { Ax, g }, params: { kind: 1, A: Am, x0 },
        };
      }
      if (level === 2) {
        for (;;) {
          const Am = [[r.int(-3, 4), r.int(-3, 4)], [r.int(-3, 4), r.int(-3, 4)]];
          if (Am[0][1] === Am[1][0]) continue;
          const b = [r.int(-4, 4), r.int(-4, 4)], x0 = [r.int(-3, 3), r.int(-3, 3)];
          const S = intv2(madd(Am, trn(Am))), Sx = intv(mvm(S, x0)), g = [Sx[0] + b[0], Sx[1] + b[1]];
          return {
            prompt: `${f}(${bv("x")}) = ${tp(bv("x"))}${A}${bv("x")} + ${tp(bv("b"))}${bv("x")} with ${A} = ${mat(Am)} and ${bv("b")} = ${vec(b)}. Find ${grad} at ${bv("x")} = ${vec(x0)}.`,
            steps: [
              `${A} is not symmetric, so the gradient of ${tp(bv("x"))}${A}${bv("x")} is (${A} + ${tp(A)})${bv("x")}, not 2${A}${bv("x")}. With the linear term, ${grad} = (${A} + ${tp(A)})${bv("x")} + ${bv("b")}.`,
              `${A} + ${tp(A)} = ${mat(S)}.`,
              `(${A} + ${tp(A)})${bv("x")} = (${dotTxt(S[0], x0)}, ${dotTxt(S[1], x0)}) = ${vec(Sx)}.`,
              `${grad} = ${vec(Sx)} + ${vec(b)} = ${vec(g)}.`,
            ],
            ...ansVec(g), vals: { S, Sx, g }, params: { A: Am, b, x0 },
          };
        }
      }
      // level 3: the minimizer of a quadratic cost
      for (;;) {
        const a = r.int(1, 5), h = r.int(-3, 3), c = r.int(1, 5), Dt = a * c - h * h;
        if (Dt <= 0) continue;
        const sol = [r.int(-4, 4), r.int(-4, 4)], b = [a * sol[0] + h * sol[1], h * sol[0] + c * sol[1]], k = r.int(-9, 9);
        const n1 = b[0] * c - h * b[1], n2 = a * b[1] - h * b[0];
        const xy = `${x}${y}`, X2 = M.sup(x, 2), Y2 = M.sup(y, 2);
        const poly = `${M.term(a, X2, { first: true })}${M.term(2 * h, xy)}${M.term(c, Y2)}${M.term(-2 * b[0], x)}${M.term(-2 * b[1], y)}${M.term(k, "")}`;
        return {
          prompt: `A design's cost is ${M.eq(`${f}(${x}, ${y}) = ${poly}`)} Find the point (${x}, ${y}) that minimizes it.`,
          steps: [
            `In matrix form ${f} = ${tp(bv("x"))}${A}${bv("x")} − 2${tp(bv("b"))}${bv("x")}${M.term(k, "")} with ${A} = ${mat([[a, h], [h, c]])} (the ${xy} coefficient ${n(2 * h)} is split equally between the two off-diagonal entries) and ${bv("b")} = ${vec(b)}.`,
            `${A} is symmetric, so ${grad} = 2${A}${bv("x")} − 2${bv("b")}. Setting it to <b>0</b> gives ${A}${bv("x")} = ${bv("b")}: ${M.eq(`${lin([a, h], [x, y])} = ${n(b[0])}`)}${M.eq(`${lin([h, c], [x, y])} = ${n(b[1])}`)}`,
            `det ${A} = ${n(a)} · ${n(c)} − ${M.sup(np(h), 2)} = ${n(Dt)}. Cramer's rule: ${x} = ${M.frac(`${np(b[0])} · ${n(c)} − ${np(h)} · ${np(b[1])}`, n(Dt))} = ${M.frac(n(n1), n(Dt))} = ${n(sol[0])} and ${y} = ${M.frac(`${n(a)} · ${np(b[1])} − ${np(h)} · ${np(b[0])}`, n(Dt))} = ${M.frac(n(n2), n(Dt))} = ${n(sol[1])}.`,
            `${A} is positive definite (${n(a)} &gt; 0 and det ${A} = ${n(Dt)} &gt; 0), so this critical point is the minimum.`,
          ],
          ...ansVec(sol), vals: { b, h2: 2 * h, Dt, n1, n2, sol }, params: { a, h, c, b2: b.map((e) => -2 * e), k },
        };
      }
    },
  };

  // ==== LA.31 Pseudoinverse and Sherman–Morrison ================================================================================================
  D["LA.18"] = {
    title: "Pseudoinverses and inverse updates",
    generate(r, level) {
      const A = M.v("A"), Ap = M.sup(A, "+");
      if (level === 1) {
        for (;;) {
          const a = [r.int(-3, 3), r.int(-3, 3), r.int(-3, 3)];
          if (isZero(a)) continue;
          const sq = a.map((e) => e * e), aa = sq[0] + sq[1] + sq[2], ap = a.map((e) => new Frac(e, aa));
          return {
            prompt: `Find the pseudoinverse of the column ${bv("a")} = ${col(a)}. It is a row; enter its three entries.`,
            steps: [
              `A single column has full column rank, so ${M.sup(bv("a"), "+")} = ${iv(`(${tp(bv("a"))}${bv("a")})`)}${tp(bv("a"))} = ${M.frac(tp(bv("a")), `${tp(bv("a"))}${bv("a")}`)}.`,
              `${tp(bv("a"))}${bv("a")} = ${sumNums(sq)} = ${n(aa)}, so ${M.sup(bv("a"), "+")} = ${M.frac("1", n(aa))}${vec(a)} = ${vec(ap)}.`,
              `Check: ${M.sup(bv("a"), "+")}${bv("a")} = ${M.frac(n(aa), n(aa))} = 1.`,
            ],
            ...ansVec(ap), vals: { sq, aa, ap: V(ap) }, params: { a },
          };
        }
      }
      if (level === 2) {
        const [w1, w2] = orthoSet(r);
        const Am = [0, 1, 2].map((i) => [w1[i], w2[i]]), G = intv2(mmul(trn(Am), Am));
        const Gi = [[new Frac(1, G[0][0]), F(0)], [F(0), new Frac(1, G[1][1])]], Apm = mmul(Gi, trn(Am));
        return {
          prompt: `Find the pseudoinverse ${Ap} = ${iv(`(${tp(A)}${A})`)}${tp(A)} of ${A} = ${mat(Am)}. ${entriesNote(6)}`,
          steps: [
            `${tp(A)}${A} = ${mat(G)}. The columns of ${A} are orthogonal, so it is diagonal.`,
            `${iv(`(${tp(A)}${A})`)} = ${mat(Gi)}: invert each diagonal entry.`,
            `${Ap} = ${iv(`(${tp(A)}${A})`)}${tp(A)}: ${[0, 1].map((i) => (G[i][i] === 1 ? `row ${n(i + 1)} of ${tp(A)} stays as it is` : `divide row ${n(i + 1)} of ${tp(A)} by ${n(G[i][i])}`)).join(" and ")}. ${Ap} = ${mat(Apm)}, and ${Ap}${A} = ${M.v("I")}.`,
          ],
          ...ansMat(Apm), vals: { G, Gi: V(Gi), Ap: V(Apm) }, params: { A: Am }, consts: [3],
        };
      }
      // level 3: Sherman–Morrison
      for (;;) {
        const Am = unimod2(r, -3, 3), u = [r.int(-2, 2), r.int(-2, 2)], v = [r.int(-2, 2), r.int(-2, 2)];
        if (isZero(u) || isZero(v)) continue;
        const Ai = intv2(inv2(Am)), w = intv(mvm(Ai, u)), zt = intv(mvm(trn(Ai), v)), den = 1 + dot(v, w).n;
        if (den === 0 || Math.abs(den) === 1 && r.chance(0.7)) continue;
        const O = w.map((wi) => zt.map((zj) => wi * zj)), res = Ai.map((row, i) => row.map((e, j) => F(e).sub(new Frac(O[i][j], den))));
        const vw = dot(v, w).n;
        return {
          prompt: `${A} = ${mat(Am)} has ${iv(A)} = ${mat(Ai)}. Use the Sherman–Morrison formula to find ${iv(`(${A} + ${bv("u")}${tp(bv("v"))})`)} for ${bv("u")} = ${col(u)} and ${bv("v")} = ${col(v)}. ${entriesNote(4)}`,
          steps: [
            `${iv(`(${A} + ${bv("u")}${tp(bv("v"))})`)} = ${iv(A)} − ${M.frac(`${iv(A)}${bv("u")} ${tp(bv("v"))}${iv(A)}`, `1 + ${tp(bv("v"))}${iv(A)}${bv("u")}`)}.`,
            `${iv(A)}${bv("u")} = ${vec(w)} and ${tp(bv("v"))}${iv(A)} = ${vec(zt)} (a row).`,
            `Denominator: 1 + ${tp(bv("v"))}(${iv(A)}${bv("u")}) = 1 + ${np(vw)} = ${n(den)}.`,
            `Numerator, the outer product of ${vec(w)} and ${vec(zt)}: ${mat(O)}.`,
            `${iv(A)} ${den > 0 ? "−" : "+"} ${scal(new Frac(1, Math.abs(den)))}${mat(O)} = ${mat(res)}.`,
          ],
          ...ansMat(res), vals: { Ai, w, zt, vw, den, O, res: V(res) }, params: { A: Am, u, v },
        };
      }
    },
  };

  P.define("linear-algebra", D);
})(Practice);
