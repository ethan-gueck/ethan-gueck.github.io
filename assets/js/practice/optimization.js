/*
 * practice/optimization.js — Optimization & Simulation practice problems (chapter 14), one generator
 * per concept key.
 *
 * Each generator(r, level) draws hand-solvable numbers for the level (1 easy, 2 medium, 3 hard) and
 * builds every number it shows from values it computes and reports in `vals`;
 * tools/practice/verifiers/optimization.py recomputes each of them independently (exact fractions,
 * vertex enumeration for LPs, brute force for integer and combinatorial problems, SymPy for calculus).
 * See practice/core.js for the API.
 *
 * Skipped concepts: none. Every concept of the chapter has something to compute.
 */
(function (P) {
  "use strict";
  const { Frac, M, fmt, graph } = P;
  const F = (a, b = 1) => new Frac(a, b);
  const isF = (v) => v instanceof Frac;
  const V = (s) => M.v(s);
  const x = V("x"), y = V("y");
  /** A value as shown: a Frac stacked, a number plain. */
  const n = (v) => (isF(v) ? M.f(v) : M.n(v));
  const np = (v) => (isF(v) ? M.f(v, { paren: true }) : M.n(v, { paren: true }));
  /** Does a Frac have a short decimal form (at most 4 places)? */
  const terminates = (q) => 10000 % q.d === 0;
  /** A value in decimal form when it terminates (0.25), else stacked. */
  const dc = (v) => (isF(v) ? (terminates(v) ? M.n(v.value) : M.f(v)) : M.n(v));
  const dcp = (v) => (isF(v) ? (terminates(v) ? M.n(v.value, { paren: true }) : M.f(v, { paren: true })) : M.n(v, { paren: true }));
  /** What a person types for a value. */
  const typed = (v) => (isF(v) ? (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`) : String(P.round(v, 10)));
  /** A Frac as the {n, d} the verifier reads. */
  const fv = (q) => (isF(q) ? { n: q.n, d: q.d } : q);
  /** A point or vector (a, b), stacked fractions / decimals. */
  const tup = (...a) => `(${a.map(n).join(", ")})`;
  const tupd = (...a) => `(${a.map(dc).join(", ")})`;
  /** A linear expression from [coefficient, variable] pairs: 3x − 2y, never 1x or + −2y. */
  const lin = (pairs) => {
    let out = "";
    for (const [c, name] of pairs) out += M.term(c, name, { first: out === "" });
    return out || "0";
  };
  const linD = (pairs) => {   // decimals instead of stacked fractions for terminating coefficients
    let out = "";
    for (const [c, name] of pairs) {
      const q = Frac.of(c);
      if (q.n === 0) continue;
      const mag = q.abs(), body = mag.eq(1) && name ? name : `${dc(mag)}${name}`;
      out += out === "" ? (q.n < 0 ? "−" : "") + body : ` ${q.n < 0 ? "−" : "+"} ${body}`;
    }
    return out || "0";
  };
  /** A matrix, as a bracketed grid. */
  const mat = (rows) => `<span class="pmx" style="display:inline-grid;grid-template-columns:repeat(${rows[0].length},auto);gap:0 .7em;vertical-align:middle;padding:.1em .45em;border-left:1.5px solid currentColor;border-right:1.5px solid currentColor;border-radius:5px;line-height:1.3;text-align:center">${
    rows.map((row, i) => row.map((c, j) => `<span>${typeof c === "string" ? c : n(c)}${j === row.length - 1 && i < rows.length - 1 ? '<span style="display:none">;</span>' : ""} </span>`).join("")).join("")}</span>`;
  const LET = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const ordinal = ["first", "second", "third", "fourth", "fifth", "sixth"];
  const sum = (a) => a.reduce((s, v) => s + v, 0);
  const fsum = (a) => a.reduce((s, v) => s.add(v), F(0));
  const range = (k) => Array.from({ length: k }, (_, i) => i);
  /** A list of shown values: 2, 5 and 7. */
  const listAnd = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`);
  /** Bits shown with narrow spaces so they read as digits, not one big number: 1 0 1 1. */
  const bits = (b) => b.join(" ");

  // ---- Linear programs in two variables: exact corners by enumeration -------------------------
  // A constraint is { a, b, c, s }: a·x + b·y (s = "le" ≤, "ge" ≥) c. Non-negativity is added here.
  function lpCorners(cons) {
    const all = cons.concat([{ a: 1, b: 0, c: 0, s: "ge" }, { a: 0, b: 1, c: 0, s: "ge" }]);
    const ok = (px, py) => all.every((k) => { const v = F(k.a).mul(px).add(F(k.b).mul(py)); return k.s === "le" ? v.cmp(k.c) <= 0 : v.cmp(k.c) >= 0; });
    const pts = [];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const A = all[i], B = all[j], D = A.a * B.b - B.a * A.b;
      if (D === 0) continue;
      const px = F(A.c * B.b - B.c * A.b, D), py = F(A.a * B.c - B.a * A.c, D);
      if (ok(px, py) && !pts.some((q) => q[0].eq(px) && q[1].eq(py))) pts.push([px, py]);
    }
    return pts;
  }
  /** A convex polygon for drawing a feasible region, clipped to the box [0, X] × [0, Y]. */
  function regionPoly(cons, X, Y) {
    const pts = lpCorners(cons.concat([{ a: 1, b: 0, c: Math.ceil(X), s: "le" }, { a: 0, b: 1, c: Math.ceil(Y), s: "le" }])).map((q) => [q[0].value, q[1].value]);
    const cx = sum(pts.map((q) => q[0])) / pts.length, cy = sum(pts.map((q) => q[1])) / pts.length;
    return pts.sort((p1, p2) => Math.atan2(p1[1] - cy, p1[0] - cx) - Math.atan2(p2[1] - cy, p2[0] - cx));
  }
  /** The line a·x + b·y = c as a graph item. */
  const lineItem = (k, role = "secondary") => (k.b === 0 ? { t: "vline", x: k.c / k.a, role, dash: false } : { t: "fn", e: `(${k.c} - (${k.a})*x)/(${k.b})`, role });
  /** Cramer's rule for a1 x + b1 y = c1, a2 x + b2 y = c2, shown as a step. */
  function cramer(a1, b1, c1, a2, b2, c2, u = x, v = y) {
    const D = a1 * b2 - a2 * b1, Dx = c1 * b2 - c2 * b1, Dy = a1 * c2 - a2 * c1;
    const sx = F(Dx, D), sy = F(Dy, D);
    const text = `Solve ${lin([[a1, u], [b1, v]])} = ${n(c1)} and ${lin([[a2, u], [b2, v]])} = ${n(c2)} by Cramer's rule: ${V("D")} = ${n(a1)} · ${np(b2)} − ${np(a2)} · ${np(b1)} = ${n(D)}, so ${u} = ${M.frac(`${n(c1)} · ${np(b2)} − ${np(c2)} · ${np(b1)}`, n(D))} = ${n(sx)} and ${v} = ${M.frac(`${n(a1)} · ${np(c2)} − ${np(a2)} · ${np(c1)}`, n(D))} = ${n(sy)}.`;
    return { D, Dx, Dy, sx, sy, text };
  }

  // Word-problem settings shared by the formulation, LP, duality and integer problems.
  const SCEN = [
    { intro: `A furniture workshop makes ${x} chairs and ${y} tables per week.`, xu: "chair", yu: "table", xs: "chairs", ys: "tables",
      res: [["wood", "board-foot", "board-feet"], ["labor", "hour", "hours"]], per: "week" },
    { intro: `A bakery makes ${x} batches of bread and ${y} batches of pastries per day.`, xu: "batch of bread", yu: "batch of pastries", xs: "batches of bread", ys: "batches of pastries",
      res: [["flour", "kg", "kg"], ["oven time", "hour", "hours"]], per: "day" },
    { intro: `A farm plants ${x} acres of wheat and ${y} acres of barley this season.`, xu: "acre of wheat", yu: "acre of barley", xs: "acres of wheat", ys: "acres of barley",
      res: [["water", "acre-foot", "acre-feet"], ["labor", "hour", "hours"]], per: "season" },
  ];
  const amt = (k, res) => `${n(k)} ${k === 1 ? res[1] : res[2]} of ${res[0]}`;
  const units = (k, res) => `${n(k)} ${k === 1 ? res[1] : res[2]}`;
  const money = (v) => P.money(isF(v) ? v.value : v);

  const D = {};

  // ---- O.1 Anatomy of an optimization problem ---------------------------------------------------
  D["O.1"] = {
    title: "Decision variables, constraints and the feasible set",
    generate(r, level) {
      const sc = r.pick(SCEN), [R1, R2] = sc.res;
      if (level === 1) {
        // is a given plan feasible?
        for (;;) {
          const a1 = r.int(1, 6), b1 = r.int(1, 6), a2 = r.int(1, 6), b2 = r.int(1, 6), x0 = r.int(1, 8), y0 = r.int(1, 8);
          const l1 = a1 * x0 + b1 * y0, l2 = a2 * x0 + b2 * y0;
          const target = r.int(0, 3), v1 = target === 1 || target === 3, v2 = target === 2 || target === 3;
          const c1 = v1 ? l1 - r.int(1, Math.min(6, l1 - 1)) : l1 + r.int(0, 8);
          const c2 = v2 ? l2 - r.int(1, Math.min(6, l2 - 1)) : l2 + r.int(0, 8);
          const options = ["Feasible: it meets both limits", `Infeasible: it exceeds the ${R1[0]} limit only`, `Infeasible: it exceeds the ${R2[0]} limit only`, "Infeasible: it exceeds both limits"];
          const line = (res, a, b, c, l) => `${res[0][0].toUpperCase() + res[0].slice(1)}: ${lin([[a, x], [b, y]])} ≤ ${n(c)}. The plan uses ${n(a)} · ${n(x0)} + ${n(b)} · ${n(y0)} = ${units(l, res)}, ${l <= c ? `within the ${units(c, res)} available${l === c ? " (exactly all of it)" : ""}` : `which exceeds the ${units(c, res)} available by ${n(l - c)}`}.`;
          return {
            prompt: `${sc.intro} Each ${sc.xu} uses ${amt(a1, R1)} and ${amt(a2, R2)}; each ${sc.yu} uses ${amt(b1, R1)} and ${amt(b2, R2)}. Each ${sc.per} there are ${amt(c1, R1)} and ${amt(c2, R2)} available. Is the plan ${x} = ${n(x0)}, ${y} = ${n(y0)} feasible?`,
            steps: [
              `Each limited resource gives one constraint, and every decision must satisfy all of them (the feasible set). Check the plan against each.`,
              line(R1, a1, b1, c1, l1),
              line(R2, a2, b2, c2, l2),
              `The sign constraints ${x} ≥ 0, ${y} ≥ 0 hold. ${target === 0 ? "Every constraint holds, so the plan is feasible." : "A plan that breaks any constraint is infeasible."}`,
            ],
            answer: { kind: "choice", options, index: target }, answerText: options[target],
            vals: { l1, l2, o1: l1 - c1, o2: l2 - c2 }, params: { a1, b1, c1, a2, b2, c2, x0, y0 },
          };
        }
      }
      if (level === 2) {
        // the best feasible plan among four candidates
        for (;;) {
          const a1 = r.int(1, 5), b1 = r.int(1, 5), a2 = r.int(1, 5), b2 = r.int(1, 5), c1 = r.int(20, 48), c2 = r.int(20, 48), px = r.int(2, 9), py = r.int(2, 9);
          const plans = [];
          while (plans.length < 4) {
            const q = [r.int(1, 10), r.int(1, 10)];
            if (!plans.some((p) => p[0] === q[0] && p[1] === q[1])) plans.push(q);
          }
          const L1 = plans.map((p) => a1 * p[0] + b1 * p[1]), L2 = plans.map((p) => a2 * p[0] + b2 * p[1]);
          const prof = plans.map((p) => px * p[0] + py * p[1]), feas = plans.map((_, i) => L1[i] <= c1 && L2[i] <= c2);
          const fi = range(4).filter((i) => feas[i]);
          if (fi.length < 2 || fi.length > 3) continue;
          const best = Math.max(...fi.map((i) => prof[i]));
          const bi = fi.filter((i) => prof[i] === best);
          if (bi.length !== 1) continue;
          if (!range(4).some((i) => !feas[i] && prof[i] > best)) continue;
          const X = Math.max(...plans.map((p) => p[0])) + 3, Y = Math.max(...plans.map((p) => p[1])) + 3;
          const cons = [{ a: a1, b: b1, c: c1, s: "le" }, { a: a2, b: b2, c: c2, s: "le" }];
          const options = LET.slice(0, 4).map((l) => `Plan ${l}`);
          const steps = [`Constraints: ${R1[0]} ${lin([[a1, x], [b1, y]])} ≤ ${n(c1)}, ${R2[0]} ${lin([[a2, x], [b2, y]])} ≤ ${n(c2)}, and ${x}, ${y} ≥ 0. Objective: maximize ${lin([[px, x], [py, y]])} dollars.`];
          plans.forEach((p, i) => {
            const use = `${R1[0]} ${n(a1)} · ${n(p[0])} + ${n(b1)} · ${n(p[1])} = ${n(L1[i])}, ${R2[0]} ${n(a2)} · ${n(p[0])} + ${n(b2)} · ${n(p[1])} = ${n(L2[i])}`;
            const bad = [L1[i] > c1 ? `${R1[0]} (${n(L1[i])} &gt; ${n(c1)})` : "", L2[i] > c2 ? `${R2[0]} (${n(L2[i])} &gt; ${n(c2)})` : ""].filter(Boolean);
            steps.push(`Plan ${LET[i]}: ${use}. ${feas[i] ? `Feasible, with profit ${n(px)} · ${n(p[0])} + ${n(py)} · ${n(p[1])} = ${money(prof[i])}.` : `It exceeds ${bad.join(" and ")}, so it is infeasible: its profit of ${money(prof[i])} cannot be earned.`}`);
          });
          steps.push(`The best feasible plan is Plan ${LET[bi[0]]}, with profit ${money(best)}. A more profitable plan that breaks a constraint does not count: the optimum is taken over the feasible set only.`);
          return {
            prompt: `${sc.intro} Profit is ${money(px)} per ${sc.xu} and ${money(py)} per ${sc.yu}. Each ${sc.xu} uses ${amt(a1, R1)} and ${amt(a2, R2)}; each ${sc.yu} uses ${amt(b1, R1)} and ${amt(b2, R2)}. There are ${amt(c1, R1)} and ${amt(c2, R2)} available. Which candidate plan is best? ${M.table(["Plan", ...LET.slice(0, 4)], [[`${x} (${sc.xs})`, ...plans.map((p) => n(p[0]))], [`${y} (${sc.ys})`, ...plans.map((p) => n(p[1]))]])} The graph shows the two constraint lines, the feasible region and the plans.`,
            graph: graph({ view: [-0.5, X, -0.5, Y], items: [{ t: "poly", p: regionPoly(cons, X, Y), role: "muted" }, lineItem(cons[0]), lineItem(cons[1], "highlight"),
              ...plans.map((p, i) => ({ t: "pt", x: p[0], y: p[1], label: LET[i], role: "primary" }))] }),
            steps, answer: { kind: "choice", options, index: bi[0] }, answerText: options[bi[0]],
            vals: { L1, L2, prof, best }, params: { a1, b1, c1, a2, b2, c2, px, py, plans },
          };
        }
      }
      // level 3: global versus local minimum of a cubic on an interval
      for (;;) {
        const p = r.int(1, 2), c = r.int(-5, 5), lo = r.int(-2 * p - 2, -1), hi = r.int(p + 1, p + 2);
        if (lo === -2 * p) continue;   // a tie between the endpoint and the local minimum
        const f = (t) => t * t * t - 3 * p * p * t + c;
        const cands = [lo];
        if (lo < -p) cands.push(-p);
        cands.push(p, hi);
        const vals = cands.map(f), best = Math.min(...vals), at = cands[vals.indexOf(best)];
        const fx = `${V("f")}(${x})`, poly = M.poly([1, 0, -3 * p * p, c]);
        const ev = (t) => `${V("f")}(${n(t)}) = ${n(f(t))}`;
        const top = Math.max(...vals, f(hi)), ymin = best - 3, ymax = top + 3;
        return {
          prompt: `Find the global minimum value of ${M.eq(`${fx} = ${poly}`)} over the feasible set ${n(lo)} ≤ ${x} ≤ ${n(hi)} (between the dashed lines).`,
          graph: graph({ view: [lo - 1, hi + 1, ymin, ymax], items: [{ t: "fn", e: `x^3 - ${3 * p * p}*x + (${c})` }, { t: "vline", x: lo, role: "muted" }, { t: "vline", x: hi, role: "muted" }] }),
          steps: [
            `On a closed interval the global minimum is at a critical point inside it or at an endpoint. ${V("f")}′(${x}) = ${M.poly([3, 0, -3 * p * p])} = 0 gives ${M.sup(x, 2)} = ${n(p * p)}, so ${x} = ${n(-p)} or ${x} = ${n(p)}.`,
            `${lo < -p ? `Both critical points lie in [${n(lo)}, ${n(hi)}]` : `Only ${x} = ${n(p)} lies inside (${n(-p)} ${lo === -p ? "is the left endpoint" : `is below ${n(lo)}`})`}. ${V("f")}″(${x}) = 6${x}, positive at ${x} = ${n(p)}: a local minimum${lo < -p ? `; ${x} = ${n(-p)} is a local maximum` : ""}.`,
            `Evaluate the candidates: ${cands.map(ev).join(", ")}.`,
            `The smallest is ${V("f")}(${n(at)}) = ${n(best)}.${at !== p ? ` The local minimum at ${x} = ${n(p)} is not the global one: the endpoint is lower.` : ` Here the local minimum is also the global one.`}`,
          ],
          answer: { kind: "number", value: best }, answerText: n(best), answerInput: String(best),
          vals: { p3: 3 * p * p, pp: p * p, fv: vals, best, at }, params: { p, c, lo, hi }, consts: [3, 6],
        };
      }
    },
  };

  // ---- O.8 Convex sets and functions ------------------------------------------------------------
  /** A symmetric 2×2 Hessian [[2A, B], [B, 2C]] with integer eigenvalues m0 ± h. */
  function niceHessian(r, { minLow = -4, maxLow = 8 } = {}) {
    for (;;) {
      const [t, b, h] = r.pick([[3, 4, 5], [4, 3, 5], [0, 2, 2], [0, 4, 4], [6, 8, 10], [8, 6, 10], [2, 0, 2], [4, 0, 4], [5, 12, 13], [0, 6, 6]]);
      const B = b * r.sign(), m0 = r.int(h + minLow, h + maxLow);
      if ((m0 + t) % 2 !== 0) continue;
      const H11 = m0 + t, H22 = m0 - t;
      if (H11 === 0 || H22 === 0 || B === 0) continue;
      return { A: H11 / 2, B, C: H22 / 2, H11, H22, tr: 2 * m0, det: m0 * m0 - h * h, m0, h, lo: m0 - h, hi: m0 + h };
    }
  }
  const quad2 = (A, B, C) => lin([[A, M.sup(x, 2)], [B, `${x}${y}`], [C, M.sup(y, 2)]]);
  function eigenSteps(H) {
    return [
      `The Hessian of ${V("f")} is constant: ${M.eq(`∇²${V("f")} = ${mat([[H.H11, H.B], [H.B, H.H22]])}`)}`,
      `Its eigenvalues solve ${M.sup(V("λ"), 2)} − (trace)${V("λ")} + det = 0, with trace ${n(H.H11)} + ${np(H.H22)} = ${n(H.tr)} and det ${n(H.H11)} · ${np(H.H22)} − ${M.sup(np(H.B), 2)} = ${n(H.det)}.`,
      `${V("λ")} = ${M.frac(`${n(H.tr)} ± ${M.sqrt(`${M.sup(np(H.tr), 2)} − 4 · ${np(H.det)}`)}`, "2")} = ${M.frac(`${n(H.tr)} ± ${n(2 * H.h)}`, "2")}, so ${V("λ")} = ${n(H.hi)} and ${V("λ")} = ${n(H.lo)}.`,
    ];
  }
  D["O.8"] = {
    title: "Testing convexity",
    generate(r, level) {
      if (level === 1) {
        // the chord of k x² lies above the graph
        for (;;) {
          const k = r.int(1, 3), a = r.int(-6, 8), b = r.int(-6, 8);
          if (a === b || (a - b) % 2 !== 0) continue;
          const m = (a + b) / 2, fm = k * m * m, fa = k * a * a, fb = k * b * b, chord = (fa + fb) / 2, gap = chord - fm;
          const f = k === 1 ? M.sup(x, 2) : `${n(k)}${M.sup(x, 2)}`;
          const fOf = (t) => (k === 1 ? M.sup(np(t), 2) : `${n(k)} · ${M.sup(np(t), 2)}`);
          return {
            prompt: `For ${V("f")}(${x}) = ${f}, take the chord between ${x} = ${n(a)} and ${x} = ${n(b)}. At the midpoint (${V("λ")} = ${M.frac("1", "2")}), how far above the graph is the chord?`,
            graph: graph({ view: [Math.min(a, b) - 2, Math.max(a, b) + 2, -2, Math.max(fa, fb) + 4], items: [{ t: "fn", e: `${k}*x^2` }, { t: "seg", a: [a, fa], b: [b, fb], role: "secondary" }, { t: "pt", x: a, y: fa }, { t: "pt", x: b, y: fb }] }),
            steps: [
              `The midpoint is ${x} = ${M.frac(`${n(a)} + ${np(b)}`, "2")} = ${n(m)}, where the graph has height ${V("f")}(${n(m)}) = ${fOf(m)} = ${n(fm)}.`,
              `The chord's height there is the average of the end heights: ${M.frac(`${V("f")}(${n(a)}) + ${V("f")}(${n(b)})`, "2")} = ${M.frac(`${n(fa)} + ${n(fb)}`, "2")} = ${n(chord)}.`,
              `Gap: ${n(chord)} − ${n(fm)} = ${n(gap)}. It is positive, as the chord inequality ${V("f")}(${V("λ")}${V("a")} + (1 − ${V("λ")})${V("b")}) ≤ ${V("λ")}${V("f")}(${V("a")}) + (1 − ${V("λ")})${V("f")}(${V("b")}) requires when ${V("f")} is convex.`,
            ],
            answer: { kind: "number", value: gap }, answerText: n(gap), answerInput: String(gap),
            vals: { m, fm, fa, fb, chord, gap }, params: { k, a, b },
          };
        }
      }
      if (level === 2) {
        // the largest cross term that keeps a quadratic convex
        const t = r.int(1, 3), a = r.int(1, 3), c = r.intExcept(1, 3, a);
        const A = t * a * a, C = t * c * c, kmax = 2 * t * a * c, prod = 4 * A * C;
        return {
          prompt: `For which values of ${V("k")} is ${M.eq(`${V("f")}(${x}, ${y}) = ${lin([[A, M.sup(x, 2)], [1, `${V("k")}${x}${y}`], [C, M.sup(y, 2)]])}`)} convex? Give the largest such ${V("k")}.`,
          steps: [
            `A twice-differentiable ${V("f")} is convex exactly when its Hessian is positive semidefinite everywhere: ${M.eq(`∇²${V("f")} = ${mat([[2 * A, V("k")], [V("k"), 2 * C]])}`)}`,
            `For a symmetric 2 × 2 matrix that means both diagonal entries ≥ 0 (${n(2 * A)} and ${n(2 * C)} are) and the determinant ≥ 0: ${n(2 * A)} · ${n(2 * C)} − ${M.sup(V("k"), 2)} ≥ 0, so ${M.sup(V("k"), 2)} ≤ ${n(prod)}.`,
            `So ${V("f")} is convex for −${n(kmax)} ≤ ${V("k")} ≤ ${n(kmax)}; the largest value is ${V("k")} = ${n(kmax)} (where the Hessian is singular: convex but not strictly).`,
          ],
          answer: { kind: "number", value: kmax }, answerText: n(kmax), answerInput: String(kmax),
          vals: { H11: 2 * A, H22: 2 * C, prod, kmax }, params: { A, C },
        };
      }
      // level 3: strong convexity constant = smallest Hessian eigenvalue
      const H = niceHessian(r);
      const verdict = H.lo > 0 ? `positive, so ${V("f")} is strongly convex with ${V("m")} = ${n(H.lo)}: curvature at least ${n(H.lo)} in every direction, and a unique minimizer.`
        : H.lo === 0 ? `zero, so ${V("f")} is convex but not strongly convex: it is flat along one direction.`
          : `negative, so ${V("f")} is not convex: it curves downward along the eigenvector of ${n(H.lo)} (a saddle).`;
      return {
        prompt: `Find the smallest eigenvalue of the Hessian of ${M.eq(`${V("f")}(${x}, ${y}) = ${quad2(H.A, H.B, H.C)}`)} and decide whether ${V("f")} is strongly convex. (Enter the eigenvalue.)`,
        steps: [...eigenSteps(H), `The smallest eigenvalue is ${n(H.lo)}: ${verdict}`],
        answer: { kind: "number", value: H.lo }, answerText: `${V("λ")}<sub>min</sub> = ${n(H.lo)}`, answerInput: String(H.lo),
        vals: { H11: H.H11, H22: H.H22, tr: H.tr, det: H.det, h2: 2 * H.h, hi: H.hi, lo: H.lo }, params: { A: H.A, B: H.B, C: H.C }, consts: [4],
      };
    },
  };

  // ---- Two-constraint LPs with integer corners -------------------------------------------------------
  /**
   * Two lines a·x + b·y = c crossing at the integer point P in the first quadrant, with integer axis
   * intercepts. For "le" (max problems) the region {both ≤} has corners (0, 0), (min X, 0), P, (0, min Y);
   * for "ge" (min problems, diets) the region {both ≥} has corners (0, max Y), P, (max X, 0).
   * Objective coefficients make the optimum unique; `atP` asks for the optimum at P.
   */
  function makeLP(r, sense, { atP = null, maxC = 8, maxI = 16 } = {}) {
    for (;;) {
      const px = r.int(1, 6), py = r.int(1, 6), a1 = r.int(1, 5), b1 = r.int(1, 5), a2 = r.int(1, 5), b2 = r.int(1, 5);
      const c1 = a1 * px + b1 * py, c2 = a2 * px + b2 * py;
      if (c1 % a1 || c1 % b1 || c2 % a2 || c2 % b2) continue;
      const X1 = c1 / a1, Y1 = c1 / b1, X2 = c2 / a2, Y2 = c2 / b2;
      if (!((X1 < X2 && Y1 > Y2) || (X1 > X2 && Y1 < Y2))) continue;
      if (Math.max(X1, X2, Y1, Y2) > maxI) continue;
      const cx = r.int(1, maxC), cy = r.int(1, maxC);
      const corners = sense === "le" ? [[0, 0], [Math.min(X1, X2), 0], [px, py], [0, Math.min(Y1, Y2)]] : [[0, Math.max(Y1, Y2)], [px, py], [Math.max(X1, X2), 0]];
      const z = corners.map((q) => cx * q[0] + cy * q[1]);
      const best = sense === "le" ? Math.max(...z) : Math.min(...z);
      if (z.filter((v) => v === best).length !== 1) continue;
      const bi = z.indexOf(best), optP = corners[bi][0] === px && corners[bi][1] === py;
      if (atP !== null && atP !== optP) continue;
      const cons = [{ a: a1, b: b1, c: c1, s: sense }, { a: a2, b: b2, c: c2, s: sense }];
      return { px, py, a1, b1, c1, a2, b2, c2, X1, Y1, X2, Y2, cx, cy, corners, z, best, bi, opt: corners[bi], cons };
    }
  }
  const lpParams = (L) => ({ a1: L.a1, b1: L.b1, c1: L.c1, a2: L.a2, b2: L.b2, c2: L.c2, cx: L.cx, cy: L.cy });
  /** The steps that find and test the corners of a makeLP region. */
  function cornerSteps(L, sense, obj = V("z"), fmtv = n) {
    const ge = sense === "ge", I = (q) => tup(q[0], q[1]);
    const ax = ge ? Math.max(L.X1, L.X2) : Math.min(L.X1, L.X2), ay = ge ? Math.max(L.Y1, L.Y2) : Math.min(L.Y1, L.Y2);
    const cr = cramer(L.a1, L.b1, L.c1, L.a2, L.b2, L.c2);
    return {
      cr,
      steps: [
        `The boundary lines meet the axes at ${x} = ${n(L.c1)} ÷ ${n(L.a1)} = ${n(L.X1)}, ${y} = ${n(L.c1)} ÷ ${n(L.b1)} = ${n(L.Y1)} (first) and ${x} = ${n(L.c2)} ÷ ${n(L.a2)} = ${n(L.X2)}, ${y} = ${n(L.c2)} ÷ ${n(L.b2)} = ${n(L.Y2)} (second). On each axis the ${ge ? "larger" : "smaller"} intercept is the corner, since it satisfies both constraints: ${I([ax, 0])} and ${I([0, ay])}${ge ? "" : `, plus the origin ${I([0, 0])}`}.`,
        `The two lines cross at the remaining corner. ${cr.text}`,
        `By the corner-point theorem the optimum is at a corner. ${L.corners.map((q, i) => `${obj}${I(q)} = ${n(L.cx)} · ${np(q[0])} + ${n(L.cy)} · ${np(q[1])} = ${fmtv(L.z[i])}`).join("; ")}.`,
      ],
    };
  }
  const lpGraph = (L, sense, labels = false, extra = []) => {
    const Xv = Math.max(L.X1, L.X2) + 2, Yv = Math.max(L.Y1, L.Y2) + 2;
    return graph({ view: [-0.5, Xv, -0.5, Yv], items: [{ t: "poly", p: regionPoly(L.cons, Xv, Yv), role: "muted" }, lineItem(L.cons[0]), lineItem(L.cons[1], "highlight"),
      ...(labels ? L.corners.map((q, i) => ({ t: "pt", x: q[0], y: q[1], label: LET[i] })) : []), ...extra] });
  };

  D["O.2"] = {
    title: "Linear programming by the corner-point method",
    generate(r, level) {
      if (level === 1) {
        const L = makeLP(r, "le");
        const z = lin([[L.cx, x], [L.cy, y]]);
        return {
          prompt: `The feasible region of a linear program is the shaded polygon with corners ${listAnd(L.corners.map((q, i) => `${LET[i]} ${tup(q[0], q[1])}`))}. Find the maximum of ${V("z")} = ${z} over the region.`,
          graph: lpGraph(L, "le", true),
          steps: [
            `A linear objective over a polygon is largest at a corner (the corner-point theorem), so evaluate ${V("z")} at each corner.`,
            ...L.corners.map((q, i) => `${LET[i]}: ${V("z")} = ${n(L.cx)} · ${n(q[0])} + ${n(L.cy)} · ${n(q[1])} = ${n(L.z[i])}.`),
            `The largest is ${n(L.best)}, at ${LET[L.bi]} ${tup(...L.opt)}.`,
          ],
          answer: { kind: "number", value: L.best }, answerText: n(L.best), answerInput: String(L.best),
          vals: { z: L.z, best: L.best }, params: { ...lpParams(L), corners: L.corners },
        };
      }
      if (level === 2) {
        const L = makeLP(r, "le", { atP: r.chance(0.7) });
        const { cr, steps } = cornerSteps(L, "le");
        return {
          prompt: `Maximize ${V("z")} = ${lin([[L.cx, x], [L.cy, y]])} subject to ${M.eq(`${lin([[L.a1, x], [L.b1, y]])} ≤ ${n(L.c1)},  ${lin([[L.a2, x], [L.b2, y]])} ≤ ${n(L.c2)},  ${x} ≥ 0,  ${y} ≥ 0.`)} Give the optimal point (${x}, ${y}).`,
          graph: lpGraph(L, "le"),
          steps: [...steps, `The largest value is ${n(L.best)}, at ${tup(...L.opt)}.`],
          answer: { kind: "point", value: L.opt }, answerText: tup(...L.opt), answerInput: `(${L.opt[0]}, ${L.opt[1]})`,
          vals: { X1: L.X1, Y1: L.Y1, X2: L.X2, Y2: L.Y2, D: cr.D, px: L.px, py: L.py, z: L.z, best: L.best }, params: lpParams(L),
        };
      }
      // level 3: a production plan (max profit) or a diet (min cost)
      if (r.chance(0.5)) {
        const sc = r.pick(SCEN), [R1, R2] = sc.res;
        const L = makeLP(r, "le", { atP: r.chance(0.75), maxC: 9 });
        const { cr, steps } = cornerSteps(L, "le", V("P"), money);
        return {
          prompt: `${sc.intro} Each ${sc.xu} earns ${money(L.cx)} profit and uses ${amt(L.a1, R1)} and ${amt(L.a2, R2)}; each ${sc.yu} earns ${money(L.cy)} and uses ${amt(L.b1, R1)} and ${amt(L.b2, R2)}. Each ${sc.per} there are ${amt(L.c1, R1)} and ${amt(L.c2, R2)}. Treating the amounts as continuous, find the maximum profit, in dollars.`,
          graph: lpGraph(L, "le"),
          steps: [
            `Formulate: maximize ${V("P")} = ${lin([[L.cx, x], [L.cy, y]])} subject to ${R1[0]} ${lin([[L.a1, x], [L.b1, y]])} ≤ ${n(L.c1)}, ${R2[0]} ${lin([[L.a2, x], [L.b2, y]])} ≤ ${n(L.c2)}, ${x}, ${y} ≥ 0.`,
            ...steps,
            `The best plan is ${x} = ${n(L.opt[0])} ${sc.xs}, ${y} = ${n(L.opt[1])} ${sc.ys}, earning ${money(L.best)} per ${sc.per}.`,
          ],
          answer: { kind: "number", value: L.best }, answerText: money(L.best), answerInput: String(L.best),
          vals: { X1: L.X1, Y1: L.Y1, X2: L.X2, Y2: L.Y2, D: cr.D, px: L.px, py: L.py, z: L.z, best: L.best }, params: { ...lpParams(L), sense: 1 },
        };
      }
      const L = makeLP(r, "ge", { atP: r.chance(0.75), maxC: 9 });
      const [an, sp1] = r.pick([["a goat", "goat"], ["a calf", "calf"], ["a pig", "pig"]]);
      const { cr, steps } = cornerSteps(L, "ge", V("C"), money);
      return {
        prompt: `A farmer mixes ${x} kg of feed A and ${y} kg of feed B for ${an}'s weekly ration. Feed A has ${n(L.a1)} units of protein and ${n(L.a2)} units of fiber per kg and costs ${money(L.cx)} per kg; feed B has ${n(L.b1)} units of protein and ${n(L.b2)} units of fiber per kg and costs ${money(L.cy)} per kg. The ${sp1} needs at least ${n(L.c1)} units of protein and ${n(L.c2)} units of fiber a week. Find the minimum weekly cost, in dollars.`,
        graph: lpGraph(L, "ge"),
        steps: [
          `Formulate: minimize ${V("C")} = ${lin([[L.cx, x], [L.cy, y]])} subject to protein ${lin([[L.a1, x], [L.b1, y]])} ≥ ${n(L.c1)}, fiber ${lin([[L.a2, x], [L.b2, y]])} ≥ ${n(L.c2)}, ${x}, ${y} ≥ 0. The region is unbounded upward, but the costs are positive, so a cheapest corner exists.`,
          ...steps,
          `The cheapest ration is ${n(L.opt[0])} kg of A and ${n(L.opt[1])} kg of B, costing ${money(L.best)} a week.`,
        ],
        answer: { kind: "number", value: L.best }, answerText: money(L.best), answerInput: String(L.best),
        vals: { X1: L.X1, Y1: L.Y1, X2: L.X2, Y2: L.Y2, D: cr.D, px: L.px, py: L.py, z: L.z, best: L.best }, params: { ...lpParams(L), sense: -1 },
      };
    },
  };

  // ---- O.3 Simplex and duality ---------------------------------------------------------------------
  D["O.3"] = {
    title: "Simplex pivots and LP duality",
    generate(r, level) {
      if (level === 1) {
        // the ratio test for the first pivot from the origin
        for (;;) {
          const c = [r.int(1, 9), r.int(1, 9)];
          if (c[0] === c[1]) continue;
          const j = c[0] > c[1] ? 0 : 1, o = 1 - j;
          const rows = range(3).map(() => {
            const aj = r.int(0, 4), ao = r.int(1, 5);
            const b = aj > 0 ? aj * r.int(2, 9) : r.int(6, 30);
            const row = [0, 0]; row[j] = aj; row[o] = ao;
            return { a: row, b };
          });
          if (rows.some((q, i) => rows.some((t, k) => k > i && t.a[0] * q.a[1] === t.a[1] * q.a[0]))) continue;   // no two parallel constraints
          const pos = rows.map((q, i) => i).filter((i) => rows[i].a[j] > 0);
          if (pos.length < 2) continue;
          const ratios = pos.map((i) => rows[i].b / rows[i].a[j]);
          const mn = Math.min(...ratios);
          if (ratios.filter((v) => v === mn).length !== 1) continue;
          const leave = pos[ratios.indexOf(mn)];
          const vn = [x, y];
          const s = (i) => M.sub(V("s"), i + 1);
          return {
            prompt: `Apply the simplex method, starting at the origin, to ${M.eq(`maximize ${V("z")} = ${lin([[c[0], x], [c[1], y]])} subject to ${rows.map((q) => `${lin([[q.a[0], x], [q.a[1], y]])} ≤ ${n(q.b)}`).join(",  ")},  ${x}, ${y} ≥ 0.`)} The entering variable is the one with the largest objective coefficient. How large does it become after the first pivot?`,
            steps: [
              `Add slacks ${s(0)}, ${s(1)}, ${s(2)}: at the origin all three are basic and ${V("z")} = 0. The coefficients are ${n(c[0])} for ${x} and ${n(c[1])} for ${y}, so ${vn[j]} enters (each unit raises ${V("z")} most).`,
              `Ratio test: increase ${vn[j]} with ${vn[o]} = 0 until a constraint becomes tight. ${rows.map((q, i) => (q.a[j] > 0 ? `Row ${i + 1}: ${M.frac(n(q.b), n(q.a[j]))} = ${n(q.b / q.a[j])}` : `Row ${i + 1} has coefficient 0 on ${vn[j]}, so it never limits it`)).join(". ")}.`,
              `The smallest ratio is ${n(mn)}, in row ${leave + 1}: ${s(leave)} leaves the basis and ${vn[j]} = ${n(mn)}, so ${V("z")} = ${n(c[j])} · ${n(mn)} = ${n(c[j] * mn)}.`,
            ],
            answer: { kind: "number", value: mn }, answerText: `${vn[j]} = ${n(mn)}`, answerInput: String(mn),
            vals: { ratios, mn, leave: leave + 1, z1: c[j] * mn }, params: { c, rows: rows.map((q) => [q.a[0], q.a[1], q.b]) }, consts: [3],
          };
        }
      }
      if (level === 2) {
        // weak duality: a dual-feasible y bounds the primal
        for (;;) {
          const L = makeLP(r, "le");
          const y1 = r.int(0, 4), y2 = r.int(0, 4);
          const g1 = L.a1 * y1 + L.a2 * y2, g2 = L.b1 * y1 + L.b2 * y2;
          if (g1 < L.cx || g2 < L.cy) continue;
          const bound = L.c1 * y1 + L.c2 * y2;
          if (bound === L.best || bound > 3 * L.best) continue;
          const u1 = M.sub(V("w"), 1), u2 = M.sub(V("w"), 2);
          return {
            prompt: `Primal: maximize ${lin([[L.cx, x], [L.cy, y]])} subject to ${lin([[L.a1, x], [L.b1, y]])} ≤ ${n(L.c1)}, ${lin([[L.a2, x], [L.b2, y]])} ≤ ${n(L.c2)}, ${x}, ${y} ≥ 0. Check that (${u1}, ${u2}) = ${tup(y1, y2)} is feasible for the dual, and find the upper bound it gives on the primal optimum.`,
            steps: [
              `Each primal constraint gets a dual variable. The dual: minimize ${lin([[L.c1, u1], [L.c2, u2]])} subject to ${lin([[L.a1, u1], [L.a2, u2]])} ≥ ${n(L.cx)} (the ${x} column), ${lin([[L.b1, u1], [L.b2, u2]])} ≥ ${n(L.cy)} (the ${y} column), ${u1}, ${u2} ≥ 0.`,
              `Check: ${n(L.a1)} · ${n(y1)} + ${n(L.a2)} · ${n(y2)} = ${n(g1)} ≥ ${n(L.cx)} and ${n(L.b1)} · ${n(y1)} + ${n(L.b2)} · ${n(y2)} = ${n(g2)} ≥ ${n(L.cy)}, and both are non-negative: dual feasible.`,
              `Weak duality: every primal-feasible objective is at most ${n(L.c1)} · ${n(y1)} + ${n(L.c2)} · ${n(y2)} = ${n(bound)}. (The true optimum is ${n(L.best)}, at ${tup(...L.opt)}, which is indeed below the bound.)`,
            ],
            answer: { kind: "number", value: bound }, answerText: n(bound), answerInput: String(bound),
            vals: { g1, g2, bound, best: L.best, opt: L.opt }, params: { ...lpParams(L), y1, y2 },
          };
        }
      }
      // level 3: the shadow price of a resource from complementary slackness
      for (;;) {
        const sc = r.pick(SCEN), [R1, R2] = sc.res;
        const L = makeLP(r, "le", { atP: true, maxC: 9 });
        const du = cramer(L.a1, L.a2, L.cx, L.b1, L.b2, L.cy, M.sub(V("w"), 1), M.sub(V("w"), 2));
        const yv = [du.sx, du.sy];
        if (!yv.every((q) => q.n > 0 && 100 % q.d === 0)) continue;
        const k = r.int(0, 1), R = sc.res[k];
        const u1 = M.sub(V("w"), 1), u2 = M.sub(V("w"), 2);
        const check = yv[0].mul(L.c1).add(yv[1].mul(L.c2));
        const { steps } = cornerSteps(L, "le", V("P"), money);
        return {
          prompt: `${sc.intro} Each ${sc.xu} earns ${money(L.cx)} and uses ${amt(L.a1, R1)} and ${amt(L.a2, R2)}; each ${sc.yu} earns ${money(L.cy)} and uses ${amt(L.b1, R1)} and ${amt(L.b2, R2)}. There are ${amt(L.c1, R1)} and ${amt(L.c2, R2)} available. Treating amounts as continuous, by how much would the maximum profit rise per extra ${R[1]} of ${R[0]} (its shadow price), in dollars?`,
          steps: [
            ...steps,
            `The optimum is ${tup(L.px, L.py)} with profit ${money(L.best)}, where both constraints are tight. The shadow prices ${u1}, ${u2} are the optimal dual variables; since ${x}, ${y} &gt; 0, complementary slackness makes both dual constraints tight: ${lin([[L.a1, u1], [L.a2, u2]])} = ${n(L.cx)} and ${lin([[L.b1, u1], [L.b2, u2]])} = ${n(L.cy)}.`,
            du.text,
            `Check strong duality: ${n(L.c1)} · ${dcp(yv[0])} + ${n(L.c2)} · ${dcp(yv[1])} = ${money(check)}, the primal optimum. The ${R[0]} price is ${money(yv[k])} per ${R[1]}.`,
          ],
          answer: { kind: "number", value: yv[k].value }, answerText: `${money(yv[k])} per ${R[1]}`, answerInput: typed(yv[k]),
          vals: { X1: L.X1, Y1: L.Y1, X2: L.X2, Y2: L.Y2, D: du.D, px: L.px, py: L.py, z: L.z, best: L.best, y1: fv(yv[0]), y2: fv(yv[1]) }, params: { ...lpParams(L), k },
        };
      }
    },
  };

  // ---- O.qp Quadratic programming --------------------------------------------------------------------
  D["O.qp"] = {
    title: "Quadratic programs: unconstrained, equality and edge optima",
    generate(r, level) {
      if (level === 1) {
        const a = r.int(1, 4), c = r.int(1, 4), h = r.nonzero(-5, 5), k = r.nonzero(-5, 5);
        const dd = -2 * a * h, e = -2 * c * k;
        return {
          prompt: `Minimize ${M.eq(`${V("f")}(${x}, ${y}) = ${lin([[a, M.sup(x, 2)], [c, M.sup(y, 2)], [dd, x], [e, y]])}.`)} Give the minimizer (${x}, ${y}).`,
          steps: [
            `In QP form ${V("f")} = ${M.frac("1", "2")}${M.sup(V("x"), "⊤")}${V("Q")}${V("x")} + ${M.sup(V("c"), "⊤")}${V("x")} with ${V("Q")} = ${mat([[2 * a, 0], [0, 2 * c]])}. Both eigenvalues (${n(2 * a)}, ${n(2 * c)}) are positive, so ${V("f")} is strictly convex and its stationary point is the global minimum.`,
            `∂${V("f")}/∂${x} = ${lin([[2 * a, x], [dd, ""]])} = 0 gives ${x} = ${M.frac(n(-dd), n(2 * a))} = ${n(h)}.`,
            `∂${V("f")}/∂${y} = ${lin([[2 * c, y], [e, ""]])} = 0 gives ${y} = ${M.frac(n(-e), n(2 * c))} = ${n(k)}.`,
            `The minimizer is ${tup(h, k)}.`,
          ],
          answer: { kind: "point", value: [h, k] }, answerText: tup(h, k), answerInput: `(${h}, ${k})`,
          vals: { q1: 2 * a, q2: 2 * c, h, k }, params: { a, c, d: dd, e },
        };
      }
      if (level === 2) {
        // equality constraint: the Lagrange (KKT) system is linear
        for (;;) {
          const a = r.int(1, 3), c = r.int(1, 3), al = r.int(1, 4), be = r.int(1, 4), de = r.int(2, 12);
          if (a === c && al === be) continue;
          const cx_ = F(al, 2 * a), cy_ = F(be, 2 * c), kx = F(al * al, 2 * a).add(F(be * be, 2 * c)), lam = F(de).div(kx);
          const xs = lam.mul(F(al, 2 * a)), ys = lam.mul(F(be, 2 * c));
          if (lam.d > 30) continue;
          const lamS = V("λ");
          return {
            prompt: `Minimize ${M.eq(`${lin([[a, M.sup(x, 2)], [c, M.sup(y, 2)]])}  subject to  ${lin([[al, x], [be, y]])} = ${n(de)}.`)} Give the minimizer (${x}, ${y}).`,
            steps: [
              `Lagrangian: ${V("L")} = ${lin([[a, M.sup(x, 2)], [c, M.sup(y, 2)]])} − ${lamS}(${lin([[al, x], [be, y]])} − ${n(de)}). The objective is convex (positive coefficients) and the constraint linear, so the stationary point is the global minimum.`,
              `∂${V("L")}/∂${x} = ${n(2 * a)}${x} − ${al === 1 ? "" : n(al)}${lamS} = 0 gives ${x} = ${M.term(cx_, lamS, { first: true })}; ∂${V("L")}/∂${y} = ${n(2 * c)}${y} − ${be === 1 ? "" : n(be)}${lamS} = 0 gives ${y} = ${M.term(cy_, lamS, { first: true })}.`,
              `Substitute into the constraint: ${al === 1 ? "" : `${n(al)} · `}${M.term(cx_, lamS, { first: true })} + ${be === 1 ? "" : `${n(be)} · `}${M.term(cy_, lamS, { first: true })} = ${n(de)}, i.e. ${M.term(kx, lamS, { first: true })} = ${n(de)}, so ${lamS} = ${n(lam)}.`,
              `${x} = ${cx_.eq(1) ? lamS : `${n(cx_)} · ${n(lam)}`} = ${n(xs)} and ${y} = ${cy_.eq(1) ? lamS : `${n(cy_)} · ${n(lam)}`} = ${n(ys)}.`,
            ],
            answer: { kind: "point", value: [xs.value, ys.value] }, answerText: tup(xs, ys), answerInput: `(${typed(xs)}, ${typed(ys)})`,
            vals: { a2: 2 * a, c2: 2 * c, cx: fv(cx_), cy: fv(cy_), kx: fv(kx), lam: fv(lam), xs: fv(xs), ys: fv(ys) }, params: { a, c, al, be, de },
          };
        }
      }
      // level 3: projection onto a half-plane: the optimum lies on an edge, not at a vertex
      for (;;) {
        const a = r.int(1, 3), b = r.int(1, 3), p = r.int(2, 8), q = r.int(2, 8), s = r.int(4, 16);
        const g = a * p + b * q - s, nn = a * a + b * b;
        if (g <= 0) continue;
        const mu = F(2 * g, nn), xs = F(p).sub(mu.mul(F(a, 2))), ys = F(q).sub(mu.mul(F(b, 2)));
        if (xs.n <= 0 || ys.n <= 0 || mu.d > 12) continue;
        const muS = V("μ");
        const Xv = Math.max(s / a, p) + 2, Yv = Math.max(s / b, q) + 2;
        const cons = [{ a, b, c: s, s: "le" }];
        return {
          prompt: `Minimize ${M.eq(`${M.sup(`(${M.poly([1, -p])})`, 2)} + ${M.sup(`(${M.poly([1, -q], "y")})`, 2)}  subject to  ${lin([[a, x], [b, y]])} ≤ ${n(s)},  ${x} ≥ 0,  ${y} ≥ 0.`)} Give the minimizer (${x}, ${y}). (The dot marks the unconstrained minimum.)`,
          graph: graph({ view: [-0.5, Xv, -0.5, Yv], equal: true, items: [{ t: "poly", p: regionPoly(cons, Xv, Yv), role: "muted" }, lineItem(cons[0]), { t: "pt", x: p, y: q, role: "secondary" }] }),
          steps: [
            `Without constraints the minimum is at ${tup(p, q)}, but there ${lin([[a, x], [b, y]])} = ${n(a)} · ${n(p)} + ${n(b)} · ${n(q)} = ${n(a * p + b * q)} &gt; ${n(s)}. So the line constraint must be active: the answer is the point of the line nearest ${tup(p, q)}.`,
            `KKT stationarity with multiplier ${muS} ≥ 0: 2(${x} − ${n(p)}) + ${a === 1 ? "" : n(a)}${muS} = 0 and 2(${y} − ${n(q)}) + ${b === 1 ? "" : n(b)}${muS} = 0, so ${x} = ${n(p)}${M.term(F(-a, 2), muS)}, ${y} = ${n(q)}${M.term(F(-b, 2), muS)}.`,
            `Put them on the line: ${a === 1 ? "" : `${n(a)} · `}(${n(p)}${M.term(F(-a, 2), muS)}) + ${b === 1 ? "" : `${n(b)} · `}(${n(q)}${M.term(F(-b, 2), muS)}) = ${n(a * p + b * q)}${M.term(F(-nn, 2), muS)} = ${n(s)}, so ${muS} = ${M.frac(`2(${n(a * p + b * q)} − ${n(s)})`, n(nn))} = ${n(mu)} ≥ 0.`,
            `${x} = ${n(p)} − ${a === 1 ? "" : `${n(a)} · `}${n(mu.mul(F(1, 2)))} = ${n(xs)}, ${y} = ${n(q)} − ${b === 1 ? "" : `${n(b)} · `}${n(mu.mul(F(1, 2)))} = ${n(ys)}. Both are positive, so the sign constraints are inactive: the optimum sits inside an edge of the region, not at a corner (unlike an LP).`,
          ],
          answer: { kind: "point", value: [xs.value, ys.value] }, answerText: tup(xs, ys), answerInput: `(${typed(xs)}, ${typed(ys)})`,
          vals: { lhs: a * p + b * q, g, nn, half: fv(F(nn, 2)), ha: fv(F(a, 2)), hb: fv(F(b, 2)), mu: fv(mu), mh: fv(mu.mul(F(1, 2))), xs: fv(xs), ys: fv(ys) }, params: { a, b, p, q, s },
        };
      }
    },
  };

  // ---- O.4 Integer programming -------------------------------------------------------------------------
  D["O.4"] = {
    title: "Integer programs: bounds, enumeration and fixed costs",
    generate(r, level) {
      if (level === 1) {
        const I = r.pick([2000, 2500, 4000, 5000, 8000, 10000, 12000, 20000]), g = r.pick([1, 2, 4, 5, 10, 12.5, 20, 25]);
        const diff = (I * g) / 100, B = I + diff;
        return {
          prompt: `A branch-and-bound solver maximizing profit has found an integer solution worth ${money(I)} (the incumbent). The best LP-relaxation bound among the open nodes is ${money(B)}. What is the optimality gap, as a percent?`,
          steps: [
            `The LP relaxation drops integrality, so it can only do better: the true integer optimum lies between ${money(I)} and ${money(B)}.`,
            `Gap = ${M.frac(`${V("z")}<sub>bound</sub> − ${V("z")}<sub>incumbent</sub>`, `|${V("z")}<sub>incumbent</sub>|`)} = ${M.frac(`${n(B)} − ${n(I)}`, n(I))} = ${M.frac(n(diff), n(I))} = ${n(g / 100)}.`,
            `As a percent: ${n(g / 100)} × 100% = ${n(g)}%. The incumbent is at most ${n(g)}% below optimal; a gap of 0 would prove it optimal.`,
          ],
          answer: { kind: "number", value: g }, answerText: `${n(g)}%`, answerInput: String(g),
          vals: { diff, ratio: g / 100, g }, params: { I, B }, consts: [100],
        };
      }
      if (level === 2) {
        // a small integer program solved by enumeration, against its LP relaxation
        for (;;) {
          const a1 = r.int(1, 6), b1 = r.int(1, 6), a2 = r.int(1, 6), b2 = r.int(1, 6), c1 = r.int(8, 30), c2 = r.int(8, 30), cx = r.int(1, 8), cy = r.int(1, 8);
          const cons = [{ a: a1, b: b1, c: c1, s: "le" }, { a: a2, b: b2, c: c2, s: "le" }];
          const xmax = Math.min(Math.floor(c1 / a1), Math.floor(c2 / a2)), ymaxAll = Math.min(Math.floor(c1 / b1), Math.floor(c2 / b2));
          if (xmax < 2 || xmax > 6 || ymaxAll < 2 || ymaxAll > 7) continue;
          const cs = lpCorners(cons).sort((p1, p2) => p1[0].cmp(p2[0]) || p1[1].cmp(p2[1]));
          if (cs.length !== 4) continue;
          const zc = cs.map((q) => q[0].mul(cx).add(q[1].mul(cy)));
          const zb = zc.reduce((m, v) => (v.cmp(m) > 0 ? v : m), zc[0]);
          if (zc.filter((v) => v.eq(zb)).length !== 1) continue;
          const opt = cs[zc.findIndex((v) => v.eq(zb))];
          if (opt[0].isInt() && opt[1].isInt()) continue;
          const lim1 = [], lim2 = [], yb = [], zi = [];
          for (let t = 0; t <= xmax; t++) {
            lim1.push(F(c1 - a1 * t, b1)); lim2.push(F(c2 - a2 * t, b2));
            const yy = Math.min(Math.floor((c1 - a1 * t) / b1), Math.floor((c2 - a2 * t) / b2));
            yb.push(yy); zi.push(cx * t + cy * yy);
          }
          const best = Math.max(...zi), at = zi.indexOf(best);
          if (zb.value - best < 1) continue;
          const lattice = [];
          for (let t = 0; t <= xmax; t++) for (let u = 0; u <= yb[t]; u++) lattice.push({ t: "pt", x: t, y: u, role: "muted" });
          const Xv = Math.max(c1 / a1, c2 / a2, xmax) + 1, Yv = Math.max(c1 / b1, c2 / b2) + 1;
          if (Xv > 14 || Yv > 14) continue;
          return {
            prompt: `Maximize ${V("z")} = ${lin([[cx, x], [cy, y]])} subject to ${M.eq(`${lin([[a1, x], [b1, y]])} ≤ ${n(c1)},  ${lin([[a2, x], [b2, y]])} ≤ ${n(c2)},  ${x}, ${y} ≥ 0 and integer.`)} Find the optimal value. The dots are the feasible integer points.`,
            graph: graph({ view: [-0.5, Xv, -0.5, Yv], items: [{ t: "poly", p: regionPoly(cons, Xv, Yv), role: "muted" }, lineItem(cons[0]), lineItem(cons[1], "highlight"), ...lattice] }),
            steps: [
              `LP relaxation (drop integrality): its corners are ${cs.map((q, i) => `${tup(q[0], q[1])} with ${V("z")} = ${n(zc[i])}`).join(", ")}. The best is ${n(zb)} at ${tup(opt[0], opt[1])}, which is fractional, so it only bounds the integer optimum: ${V("z")} ≤ ${n(zb)}.`,
              `Enumerate: for each integer ${x}, the objective rises with ${y}, so take the largest integer ${y} allowed by both constraints, ${y} ≤ ${M.frac(`${n(c1)} − ${n(a1)}${x}`, n(b1))} and ${y} ≤ ${M.frac(`${n(c2)} − ${n(a2)}${x}`, n(b2))}.`,
              range(xmax + 1).map((t) => `${x} = ${n(t)}: ${y} ≤ ${n(lim1[t])} and ${y} ≤ ${n(lim2[t])}, so ${y} = ${n(yb[t])} and ${V("z")} = ${n(zi[t])}`).join("; ") + ".",
              `The best integer point is ${tup(at, yb[at])} with ${V("z")} = ${n(best)}, below the LP bound ${n(zb)}. Rounding the LP solution would not reliably find it.`,
            ],
            answer: { kind: "number", value: best }, answerText: n(best), answerInput: String(best),
            vals: { xs: range(xmax + 1), cs: cs.map((q) => q.map(fv)), zc: zc.map(fv), zb: fv(zb), lim1: lim1.map(fv), lim2: lim2.map(fv), yb, zi, best, at }, params: { a1, b1, c1, a2, b2, c2, cx, cy },
          };
        }
      }
      // level 3: fixed (setup) costs with binary switches
      for (;;) {
        const p = [r.int(4, 15), r.int(4, 15)], t = [r.int(1, 4), r.int(1, 4)], H = r.int(20, 60), u = [r.int(5, 20), r.int(5, 20)], Fc = [5 * r.int(2, 16), 5 * r.int(2, 16)];
        if (p[0] * t[1] === p[1] * t[0]) continue;
        const single = [0, 1].map((i) => Math.min(u[i], Math.floor(H / t[i])));
        const sv = [0, 1].map((i) => p[i] * single[i] - Fc[i]);
        const f = p[0] * t[1] > p[1] * t[0] ? 0 : 1, s2 = 1 - f;
        const xf = Math.min(u[f], Math.floor(H / t[f])), rem = H - t[f] * xf, xs2 = Math.min(u[s2], Math.floor(rem / t[s2]));
        if (xs2 < 1) continue;
        const both = p[f] * xf + p[s2] * xs2, bv = both - Fc[0] - Fc[1];
        let brute = -1;
        for (let a = 0; a <= u[0]; a++) for (let b = 0; b <= u[1]; b++) if (t[0] * a + t[1] * b <= H) brute = Math.max(brute, p[0] * a + p[1] * b);
        if (brute !== both) continue;
        const cand = [0, sv[0], sv[1], bv], best = Math.max(...cand);
        if (cand.filter((v) => v === best).length !== 1 || best <= 0) continue;
        const bi = cand.indexOf(best);
        const nm = r.pick([["desks", "bookcases", "desk", "bookcase"], ["kayaks", "canoes", "kayak", "canoe"], ["lamps", "clocks", "lamp", "clock"]]);
        const NM = [nm[0], nm[1]], ONE = [nm[2], nm[3]];
        const xv = [M.sub(x, 1), M.sub(x, 2)], yv = [M.sub(y, 1), M.sub(y, 2)];
        const caseTxt = ["make nothing", `make only ${NM[0]}`, `make only ${NM[1]}`, "make both"];
        const xsBoth = [0, 0]; xsBoth[f] = xf; xsBoth[s2] = xs2;
        return {
          prompt: `A workshop can make ${NM[0]} and ${NM[1]} this week. A ${ONE[0]} earns ${money(p[0])} and takes ${units(t[0], ["", "hour", "hours"])} of machine time; a ${ONE[1]} earns ${money(p[1])} and takes ${units(t[1], ["", "hour", "hours"])}. There are ${n(H)} machine hours. Making any ${NM[0]} needs a one-time setup costing ${money(Fc[0])} (any ${NM[1]}: ${money(Fc[1])}), and demand caps output at ${n(u[0])} ${NM[0]} and ${n(u[1])} ${NM[1]}. Units are whole. What is the maximum net profit, in dollars?`,
          steps: [
            `Model: binary ${yv[0]}, ${yv[1]} (set up or not), whole ${xv[0]}, ${xv[1]} ≥ 0; maximize ${lin([[p[0], xv[0]], [p[1], xv[1]], [-Fc[0], yv[0]], [-Fc[1], yv[1]]])} subject to ${lin([[t[0], xv[0]], [t[1], xv[1]]])} ≤ ${n(H)}, ${xv[0]} ≤ ${n(u[0])}${yv[0]}, ${xv[1]} ≤ ${n(u[1])}${yv[1]} (the big-${V("M")} switches: ${yv[0]} = 0 forces ${xv[0]} = 0). With two binaries, check the four cases.`,
            `Make nothing: profit ${money(0)}.`,
            ...[0, 1].map((i) => `Only ${NM[i]}: ${xv[i]} = min(${n(u[i])}, ⌊${n(H)} ÷ ${n(t[i])}⌋) = ${n(single[i])}, profit ${n(p[i])} · ${n(single[i])} − ${n(Fc[i])} = ${money(sv[i])}.`),
            `Both: ${NM[f]} earn more per machine hour (${money(p[f])} ÷ ${n(t[f])} vs ${money(p[s2])} ÷ ${n(t[s2])}), so fill them first: ${xv[f]} = min(${n(u[f])}, ⌊${n(H)} ÷ ${n(t[f])}⌋) = ${n(xf)}, leaving ${n(H)} − ${n(t[f])} · ${n(xf)} = ${n(rem)} hours, so ${xv[s2]} = min(${n(u[s2])}, ⌊${n(rem)} ÷ ${n(t[s2])}⌋) = ${n(xs2)}. Profit ${n(p[0])} · ${n(xsBoth[0])} + ${n(p[1])} · ${n(xsBoth[1])} − ${n(Fc[0])} − ${n(Fc[1])} = ${money(bv)}.`,
            `The best case is to ${caseTxt[bi]}: ${money(best)}.${bi !== 3 ? " The setup cost makes the second product not worth starting." : ""}`,
          ],
          answer: { kind: "number", value: best }, answerText: money(best), answerInput: String(best),
          vals: { single, sv, xf, rem, xs2, bv, best }, params: { p, t, H, u, Fc },
        };
      }
    },
  };

  // ---- O.5 Knapsack ------------------------------------------------------------------------------------
  D["O.5"] = {
    title: "The knapsack problem",
    generate(r, level) {
      if (level === 1) {
        // three items: list every subset
        for (;;) {
          const w = [r.int(1, 6), r.int(1, 6), r.int(1, 6)], v = [r.int(2, 15), r.int(2, 15), r.int(2, 15)];
          const W = r.int(4, 12);
          if (sum(w) <= W || Math.min(...w) > W) continue;
          const subs = [[0], [1], [2], [0, 1], [0, 2], [1, 2], [0, 1, 2]];
          const sw = subs.map((s) => sum(s.map((i) => w[i]))), sv = subs.map((s) => sum(s.map((i) => v[i])));
          const feas = subs.map((_, k) => sw[k] <= W);
          const best = Math.max(...sv.filter((_, k) => feas[k]));
          const win = subs.filter((_, k) => feas[k] && sv[k] === best);
          if (win.length !== 1 || feas.filter(Boolean).length < 4) continue;
          return {
            prompt: `A hiker's pack holds ${n(W)} kg. ${M.table(["Item", "A", "B", "C"], [["weight (kg)", ...w.map(n)], ["value", ...v.map(n)]])} Which items maximize the total value? Enter that value.`,
            steps: [
              `With three items there are only seven non-empty subsets; list each with its weight and value.`,
              subs.map((s, k) => `{${s.map((i) => LET[i]).join(", ")}}: ${n(sw[k])} kg, value ${n(sv[k])}${feas[k] ? "" : " (too heavy)"}`).join("; ") + ".",
              `The best subset that fits is {${win[0].map((i) => LET[i]).join(", ")}}, with value ${n(best)}.`,
            ],
            answer: { kind: "number", value: best }, answerText: n(best), answerInput: String(best),
            vals: { sw, sv, best }, params: { w, v, W },
          };
        }
      }
      if (level === 2) {
        // fractional knapsack by value per kg
        for (;;) {
          const k = 4, rate = r.sample([3, 4, 5, 6, 7, 8, 9, 10, 12, 15], k), w = range(k).map(() => r.int(2, 9));
          const v = range(k).map((i) => rate[i] * w[i]);
          const W = r.int(8, sum(w) - 3);
          const order = range(k).sort((i, j) => rate[j] - rate[i]);
          let room = W, total = 0;
          const take = [];
          for (const i of order) {
            const amt2 = Math.min(room, w[i]);
            take.push(amt2); room -= amt2; total += amt2 * rate[i];
          }
          const split = order.findIndex((i, pos) => take[pos] > 0 && take[pos] < w[i]);
          if (split < 0) continue;
          const goods = r.pick([["saffron", "cardamom", "vanilla", "pepper"], ["silver dust", "copper wire", "tin scrap", "brass shavings"], ["tea", "coffee", "cocoa", "cinnamon"]]);
          return {
            prompt: `A trader can load ${n(W)} kg and may take any fraction of each lot. ${M.table(["Lot", ...goods], [["available (kg)", ...w.map(n)], ["value of the lot ($)", ...v.map(n)]])} What is the most valuable load, in dollars?`,
            steps: [
              `When items are divisible, greedy by value per kg is optimal. Rates: ${range(k).map((i) => `${goods[i]} ${n(v[i])} ÷ ${n(w[i])} = ${n(rate[i])}`).join(", ")} dollars per kg.`,
              `Take the lots in order ${order.map((i) => goods[i]).join(", ")} until the hold is full. ${order.map((i, pos) => (take[pos] === w[i] ? `${pos === 0 ? "All" : "then all"} ${n(w[i])} kg of ${goods[i]} (${money(w[i] * rate[i])})` : take[pos] > 0 ? `then only ${n(take[pos])} kg of ${goods[i]}, the room left (${n(take[pos])} · ${n(rate[i])} = ${money(take[pos] * rate[i])})` : "")).filter(Boolean).join("; ")}.`,
              `Total: ${money(total)}. This also bounds the 0/1 version (whole lots only), which can never do better.`,
            ],
            answer: { kind: "number", value: total }, answerText: money(total), answerInput: String(total),
            vals: { rate, take, total, parts: order.map((i, pos) => take[pos] * rate[i]) }, params: { w, v, W },
          };
        }
      }
      // level 3: the dynamic-programming table
      for (;;) {
        const k = 4, w = range(k).map(() => r.int(1, 5)), v = range(k).map(() => r.int(1, 12)), W = r.int(5, 8);
        if (sum(w) <= W) continue;
        const T = [range(W + 1).map(() => 0)];
        for (let i = 1; i <= k; i++) T.push(range(W + 1).map((c) => Math.max(T[i - 1][c], w[i - 1] <= c ? v[i - 1] + T[i - 1][c - w[i - 1]] : -1)));
        // trace back
        const taken = [];
        let c = W;
        for (let i = k; i >= 1; i--) if (T[i][c] !== T[i - 1][c]) { taken.unshift(i - 1); c -= w[i - 1]; }
        if (taken.length < 2) continue;
        const ans = T[k][W], wl = w[k - 1];
        const head = [V("w"), ...range(W + 1).map(n)];
        return {
          prompt: `Solve the 0/1 knapsack with capacity ${V("W")} = ${n(W)} by dynamic programming. ${M.table(["Item", ...range(k).map((i) => n(i + 1))], [[`weight ${V("w")}<sub>${V("i")}</sub>`, ...w.map(n)], [`value ${V("v")}<sub>${V("i")}</sub>`, ...v.map(n)]])} Find ${V("V")}(${n(k)}, ${n(W)}), the best total value.`,
          steps: [
            `${V("V")}(${V("i")}, ${V("w")}) is the best value using items 1 to ${V("i")} with capacity ${V("w")}. Row 0 is all zeros; then ${V("V")}(${V("i")}, ${V("w")}) = max{${V("V")}(${V("i")} − 1, ${V("w")}), ${V("v")}<sub>${V("i")}</sub> + ${V("V")}(${V("i")} − 1, ${V("w")} − ${V("w")}<sub>${V("i")}</sub>)}, the second option only when ${V("w")}<sub>${V("i")}</sub> ≤ ${V("w")}.`,
            ...range(k).map((i) => `Row ${n(i + 1)} (weight ${n(w[i])}, value ${n(v[i])}): ${M.table(head, [[V("V"), ...T[i + 1].map(n)]])}`),
            `Last cell: ${V("V")}(${n(k)}, ${n(W)}) = max{${n(T[k - 1][W])}, ${wl <= W ? `${n(v[k - 1])} + ${V("V")}(${n(k - 1)}, ${n(W - wl)}) = ${n(v[k - 1])} + ${n(T[k - 1][W - wl])}` : "(too heavy)"}} = ${n(ans)}. Tracing back (a row that changes the value means its item was taken): items ${listAnd(taken.map((i) => n(i + 1)))}.`,
          ],
          answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
          vals: { T: T.slice(1), ans, wl: W - wl, prev: T[k - 1][W], prevW: wl <= W ? T[k - 1][W - wl] : 0, taken: taken.map((i) => i + 1) }, params: { w, v, W }, consts: range(Math.max(W, k) + 1),
        };
      }
    },
  };

  // ---- O.6 Traveling salesman --------------------------------------------------------------------------
  /** Five cities at distinct grid points, with city-block (grid road) distances. */
  function cities(r, k = 5) {
    const pts = [];
    while (pts.length < k) {
      const q = [r.int(0, 9), r.int(0, 7)];
      if (!pts.some((p) => p[0] === q[0] && p[1] === q[1])) pts.push(q);
    }
    const dist = pts.map((p) => pts.map((q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1])));
    return { pts, dist };
  }
  const distTable = (dist, k) => M.table(["", ...LET.slice(0, k)], range(k).map((i) => [LET[i], ...range(k).map((j) => (i === j ? "–" : n(dist[i][j])))]));
  D["O.6"] = {
    title: "Traveling salesman: counting tours, nearest neighbor, 2-opt",
    generate(r, level) {
      if (level === 1) {
        const k = r.int(4, 10);
        let fact = 1;
        for (let i = 2; i <= k - 1; i++) fact *= i;
        const tours = fact / 2;
        return {
          prompt: `A sales rep must visit ${n(k)} cities once each and return home. Road distances are the same in both directions. How many different tours are there?`,
          steps: [
            `A tour is a cycle, so fix the starting city; the other ${n(k - 1)} cities can follow in any order: (${V("n")} − 1)! = ${n(k - 1)}! = ${n(fact)} orders.`,
            `Each tour is counted twice, once in each direction, and with symmetric distances those have the same length. Divide by 2: ${M.frac(n(fact), "2")} = ${n(tours)} tours.`,
          ],
          answer: { kind: "number", value: tours }, answerText: n(tours), answerInput: String(tours),
          vals: { km1: k - 1, fact, tours }, params: { k },
        };
      }
      if (level === 2) {
        // nearest neighbor from A
        for (;;) {
          const { pts, dist } = cities(r);
          const tour = [0], picks = [];
          let ok = true;
          while (tour.length < 5) {
            const u = tour[tour.length - 1], rest = range(5).filter((i) => !tour.includes(i));
            const ds = rest.map((i) => dist[u][i]), m = Math.min(...ds);
            if (ds.filter((v) => v === m).length !== 1 || m === 0) { ok = false; break; }
            picks.push({ u, rest, ds, to: rest[ds.indexOf(m)], m });
            tour.push(rest[ds.indexOf(m)]);
          }
          if (!ok) continue;
          const back = dist[tour[4]][0], legs = [...picks.map((p) => p.m), back], total = sum(legs);
          return {
            prompt: `A courier starts at depot A and must visit B, C, D and E and return. Road distances (km): ${distTable(dist, 5)} Build a tour with the nearest-neighbor heuristic. What is its length, in km?`,
            graph: graph({ view: [-1, 10, -1, 8], equal: true, items: pts.map((p, i) => ({ t: "pt", x: p[0], y: p[1], label: LET[i], role: i === 0 ? "highlight" : "primary" })) }),
            steps: [
              `Nearest neighbor: from the current city, go to the closest city not yet visited; after the last, return to A.`,
              ...picks.map((p) => `From ${LET[p.u]}: ${p.rest.map((i, j) => `${LET[i]} ${n(p.ds[j])}`).join(", ")}. Go to ${LET[p.to]} (${n(p.m)} km).`),
              `Return ${LET[tour[4]]} → A: ${n(back)} km. Tour ${tour.map((i) => LET[i]).join(" → ")} → A, length ${legs.map(n).join(" + ")} = ${n(total)} km.`,
            ],
            answer: { kind: "number", value: total }, answerText: `${n(total)} km`, answerInput: String(total),
            vals: { legs, total, ds: picks.map((p) => p.ds) }, params: { dist },
          };
        }
      }
      // level 3: the best 2-opt move on a five-city tour
      for (;;) {
        const { pts, dist } = cities(r);
        const t = [0, 1, 2, 3, 4], edge = (i) => [t[i], t[(i + 1) % 5]];
        const len = sum(range(5).map((i) => dist[edge(i)[0]][edge(i)[1]]));
        const pairs = [[0, 2], [0, 3], [1, 3], [1, 4], [2, 4]];
        const moves = pairs.map(([i, j]) => {
          const [a, b] = edge(i), [c, e] = edge(j);
          return { i, j, a, b, c, e, delta: dist[a][c] + dist[b][e] - dist[a][b] - dist[c][e] };
        });
        const best = Math.min(...moves.map((m) => m.delta));
        if (best >= 0 || moves.filter((m) => m.delta === best).length !== 1) continue;
        const mv = moves.find((m) => m.delta === best), nt = [...t.slice(0, mv.i + 1), ...t.slice(mv.i + 1, mv.j + 1).reverse(), ...t.slice(mv.j + 1)];
        const newLen = len + best;
        const E = (u, v) => `${LET[u]}${LET[v]}`;
        return {
          prompt: `The current delivery tour is A → B → C → D → E → A (drawn). Road distances (km): ${distTable(dist, 5)} A 2-opt move removes two edges that do not share a city and reconnects the tour the other way. Make the move that shortens the tour most. What is the new length, in km?`,
          graph: graph({ view: [-1, 10, -1, 8], equal: true, items: [...range(5).map((i) => ({ t: "seg", a: pts[edge(i)[0]], b: pts[edge(i)[1]], role: "secondary" })), ...pts.map((p, i) => ({ t: "pt", x: p[0], y: p[1], label: LET[i] }))] }),
          steps: [
            `Current length: ${range(5).map((i) => n(dist[edge(i)[0]][edge(i)[1]])).join(" + ")} = ${n(len)} km.`,
            `Replacing edges ${V("ab")} and ${V("cd")} by ${V("ac")} and ${V("bd")} changes the length by Δ = ${V("d")}(${V("a")}, ${V("c")}) + ${V("d")}(${V("b")}, ${V("d")}) − ${V("d")}(${V("a")}, ${V("b")}) − ${V("d")}(${V("c")}, ${V("d")}). The five pairs of non-adjacent edges:`,
            moves.map((m) => `drop ${E(m.a, m.b)}, ${E(m.c, m.e)}, add ${E(m.a, m.c)}, ${E(m.b, m.e)}: Δ = ${n(dist[m.a][m.c])} + ${n(dist[m.b][m.e])} − ${n(dist[m.a][m.b])} − ${n(dist[m.c][m.e])} = ${n(m.delta)}`).join("; ") + ".",
            `The most negative is Δ = ${n(best)}: the new tour ${nt.map((i) => LET[i]).join(" → ")} → A has length ${n(len)} − ${n(-best)} = ${n(newLen)} km.`,
          ],
          answer: { kind: "number", value: newLen }, answerText: `${n(newLen)} km`, answerInput: String(newLen),
          vals: { len, deltas: moves.map((m) => m.delta), newLen }, params: { dist },
        };
      }
    },
  };

  // ---- O.7 Shortest paths and network flow ------------------------------------------------------------
  const NODE = { s: [0, 3], a: [3, 6], b: [3, 0], c: [6, 6], e: [6, 0], t: [9, 3] };
  const EDGES = [["s", "a"], ["s", "b"], ["a", "b"], ["a", "c"], ["a", "e"], ["b", "e"], ["c", "e"], ["c", "t"], ["e", "t"]];
  D["O.7"] = {
    title: "Shortest paths and maximum flow",
    generate(r, level) {
      if (level === 1) {
        // one Bellman equation
        for (;;) {
          const k = 3, du = range(k).map(() => r.int(2, 20)), w = range(k).map(() => r.int(1, 12));
          const tot = range(k).map((i) => du[i] + w[i]), m = Math.min(...tot);
          if (tot.filter((v) => v === m).length !== 1) continue;
          const via = tot.indexOf(m), U = ["P", "Q", "R"];
          return {
            prompt: `Town ${V("v")} can be reached by road only from towns P, Q and R. The shortest distances from the depot are ${V("d")}(P) = ${n(du[0])}, ${V("d")}(Q) = ${n(du[1])} and ${V("d")}(R) = ${n(du[2])} km, and the roads into ${V("v")} are ${n(w[0])}, ${n(w[1])} and ${n(w[2])} km long. What is ${V("d")}(${V("v")}), in km?`,
            steps: [
              `Bellman optimality: the best route to ${V("v")} is the best route to some predecessor plus that last road, ${V("d")}(${V("v")}) = min over ${V("u")} of [${V("d")}(${V("u")}) + ${V("w")}(${V("u")}, ${V("v")})].`,
              range(k).map((i) => `via ${U[i]}: ${n(du[i])} + ${n(w[i])} = ${n(tot[i])}`).join("; ") + ".",
              `The minimum is ${n(m)} km, through ${U[via]}.`,
            ],
            answer: { kind: "number", value: m }, answerText: `${n(m)} km`, answerInput: String(m),
            vals: { tot, m }, params: { du, w },
          };
        }
      }
      if (level === 2) {
        // Dijkstra on a six-node road map
        for (;;) {
          const w = EDGES.map(() => r.int(1, 9));
          const nb = {};
          for (const v of Object.keys(NODE)) nb[v] = [];
          EDGES.forEach(([u, v], i) => { nb[u].push([v, w[i]]); nb[v].push([u, w[i]]); });
          const dd = { s: 0 }, settled = [], log = [];
          let ok = true;
          while (settled.length < 6) {
            const open = Object.keys(dd).filter((v) => !settled.includes(v));
            const m = Math.min(...open.map((v) => dd[v]));
            const at = open.filter((v) => dd[v] === m);
            if (at.length !== 1) { ok = false; break; }
            const u = at[0];
            settled.push(u);
            if (u === "t") { log.push({ u, du: dd[u], ups: [] }); break; }
            const ups = [];
            for (const [v, wt] of nb[u]) {
              if (settled.includes(v)) continue;
              const cand = dd[u] + wt;
              ups.push({ v, wt, cand, old: dd[v], now: dd[v] === undefined ? cand : Math.min(dd[v], cand) });
              dd[v] = dd[v] === undefined ? cand : Math.min(dd[v], cand);
            }
            log.push({ u, du: dd[u], ups });
          }
          if (!ok) continue;
          // the shortest path to t must be unique
          const count = (v) => (v === "s" ? 1 : sum(nb[v].filter(([u, wt]) => dd[u] + wt === dd[v]).map(([u]) => count(u))));
          if (count("t") !== 1 || dd.t < 8) continue;
          const path = ["t"];
          while (path[0] !== "s") path.unshift(nb[path[0]].find(([u, wt]) => dd[u] + wt === dd[path[0]])[0]);
          const showU = (q, du) => `${V("d")}(${q.v}) = ${q.old === undefined ? `${n(du)} + ${n(q.wt)} = ${n(q.cand)}` : q.cand < q.old ? `min(${n(q.old)}, ${n(du)} + ${n(q.wt)}) = ${n(q.cand)}` : `${n(q.old)} (${n(du)} + ${n(q.wt)} = ${n(q.cand)} is no better)`}`;
          return {
            prompt: `Find the length of the shortest route from ${V("s")} to ${V("t")} on the road map (two-way roads, lengths in km) using Dijkstra's algorithm.`,
            graph: graph({ view: [-1, 10, -1, 7], axes: false, grid: false, equal: true, items: [...EDGES.map(([u, v], i) => ({ t: "seg", a: NODE[u], b: NODE[v], label: String(w[i]), role: "secondary" })), ...Object.entries(NODE).map(([k, p]) => ({ t: "pt", x: p[0], y: p[1], label: k }))] }),
            steps: [
              `Start with ${V("d")}(${V("s")}) = 0 and every other node unknown (∞). Repeatedly settle the unsettled node with the smallest ${V("d")} and relax its edges.`,
              ...log.slice(0, -1).map((l) => `Settle ${l.u} (${V("d")} = ${n(l.du)}). ${l.ups.length ? l.ups.map((q) => showU(q, l.du)).join("; ") + "." : "No unsettled neighbors."}`),
              `Settle ${V("t")} (${V("d")} = ${n(dd.t)}). Following the predecessors back gives the route ${path.join(" → ")}, length ${n(dd.t)} km.`,
            ],
            answer: { kind: "number", value: dd.t }, answerText: `${n(dd.t)} km`, answerInput: String(dd.t),
            vals: { dist: log.map((l) => l.du), cands: log.map((l) => l.ups.map((q) => q.cand)) }, params: { w },
          };
        }
      }
      // level 3: max flow = min cut on a four-node pipe network
      for (;;) {
        const cap = { sa: r.int(2, 12), sb: r.int(2, 12), ab: r.int(1, 8), at: r.int(2, 12), bt: r.int(2, 12) };
        const cuts = [
          { S: "{s}", e: ["sa", "sb"] }, { S: "{s, a}", e: ["sb", "ab", "at"] }, { S: "{s, b}", e: ["sa", "bt"] }, { S: "{s, a, b}", e: ["at", "bt"] },
        ].map((c) => Object.assign(c, { v: sum(c.e.map((k) => cap[k])) }));
        const mc = Math.min(...cuts.map((c) => c.v));
        const f1 = Math.min(cap.sa, cap.at), f2 = Math.min(cap.sb, cap.bt), f3 = Math.min(cap.sa - f1, cap.ab, cap.bt - f2);
        if (f1 + f2 + f3 !== mc || f3 === 0) continue;
        const P = { s: [0, 2], a: [3, 4], b: [3, 0], t: [6, 2] };
        const arrows = Object.keys(cap).map((k) => ({ t: "vec", a: P[k[0]], b: P[k[1]], label: String(cap[k]), role: "secondary" }));
        const nm = (k) => `${k[0]}→${k[1]}`;
        return {
          prompt: `Water flows through pipes from source ${V("s")} to sink ${V("t")}; each label is a pipe's capacity in thousands of liters per hour. What is the maximum flow from ${V("s")} to ${V("t")}?`,
          graph: graph({ view: [-1, 7, -1, 5], axes: false, grid: false, equal: true, items: [...arrows, ...Object.entries(P).map(([k, p]) => ({ t: "pt", x: p[0], y: p[1], label: k }))] }),
          steps: [
            `Max-flow min-cut: the maximum flow equals the smallest capacity of a cut, a set ${V("S")} containing ${V("s")} but not ${V("t")}; its capacity is the total of the pipes leading out of ${V("S")}.`,
            cuts.map((c) => `${V("S")} = ${c.S}: ${c.e.map(nm).join(" + ")} = ${c.e.map((k) => n(cap[k])).join(" + ")} = ${n(c.v)}`).join("; ") + ".",
            `A flow that reaches this bound: send ${n(f1)} along s→a→t, ${n(f2)} along s→b→t and ${n(f3)} along s→a→b→t, ${n(f1)} + ${n(f2)} + ${n(f3)} = ${n(mc)} in all, without exceeding any capacity.`,
            `So the maximum flow is ${n(mc)} thousand liters per hour; ${cuts.filter((c) => c.v === mc).length > 1 ? `the cuts ${listAnd(cuts.filter((c) => c.v === mc).map((c) => c.S))} are tied bottlenecks` : `the cut ${cuts.find((c) => c.v === mc).S} is the bottleneck`}.`,
          ],
          answer: { kind: "number", value: mc }, answerText: `${n(mc)} thousand L/h`, answerInput: String(mc),
          vals: { cuts: cuts.map((c) => c.v), mc, f1, f2, f3 }, params: cap,
        };
      }
    },
  };

  // ---- O.17 Big-O ----------------------------------------------------------------------------------------
  const CLASSES = ["1", `log ${V("n")}`, V("n"), `${V("n")} log ${V("n")}`, M.sup(V("n"), 2), M.sup(V("n"), 3), M.sup("2", V("n"))];
  D["O.17"] = {
    title: "Big-O growth rates",
    generate(r, level) {
      const N = V("n");
      if (level === 1) {
        const kinds = r.sample([0, 1, 2, 3, 4, 5, 6], r.int(2, 3)).sort((a, b) => b - a);
        const co = kinds.map(() => r.int(2, 9));
        const term = (k, c) => (k === 0 ? n(c) : k === 6 ? `${n(c)} · ${CLASSES[6]}` : `${n(c)}${k === 1 ? " " : ""}${CLASSES[k]}`);
        const order = r.shuffle(range(kinds.length));
        const f = order.map((i) => term(kinds[i], co[i])).join(" + ");
        const options = CLASSES.map((c) => `${V("O")}(${c})`);
        const top = kinds[0];
        return {
          prompt: `An algorithm takes ${M.eq(`${V("T")}(${N}) = ${f}`)} steps on an input of size ${N}. What is its Big-O class?`,
          steps: [
            `Growth hierarchy: ${options.join(" &lt; ")}.`,
            `The fastest-growing term is ${term(top, co[0])}; for large ${N} it dominates the others. Drop the constant factor ${n(co[0])}.`,
            `${V("T")}(${N}) = ${options[top]}.`,
          ],
          answer: { kind: "choice", options, index: top }, answerText: options[top],
          vals: { top }, params: { kinds, co, order }, consts: [3],
        };
      }
      if (level === 2) {
        // how running time scales
        if (r.chance(0.65)) {
          const k = r.int(1, 3), m = r.pick([2, 3, 4, 5, 10]), t0 = r.int(1, 9), n0 = r.pick([1000, 2000, 5000, 10000]);
          const factor = Math.pow(m, k), T = t0 * factor;
          return {
            prompt: `An ${V("O")}(${CLASSES[k + (k === 1 ? 1 : 2)]}) algorithm takes ${n(t0)} seconds on ${P.grouped(n0)} items. Roughly how long will it take on ${P.grouped(m * n0)} items, in seconds?`,
            steps: [
              `The input grows by a factor ${n(m * n0)} ÷ ${n(n0)} = ${n(m)}. For ${V("O")}(${CLASSES[k + (k === 1 ? 1 : 2)]}) the time scales by ${k === 1 ? n(m) : `${M.sup(n(m), k)} = ${n(factor)}`}.`,
              `${n(t0)} × ${n(factor)} = ${n(T)} seconds.`,
            ],
            answer: { kind: "number", value: T }, answerText: `${n(T)} s`, answerInput: String(T),
            vals: { m, factor, T, m2: m * n0 }, params: { k, m, t0, n0 }, consts: [3],
          };
        }
        const dn = r.int(2, 6), t0 = r.pick([1, 2, 3, 5]), n0 = r.int(20, 40), factor = Math.pow(2, dn), T = t0 * factor;
        return {
          prompt: `An ${V("O")}(${CLASSES[6]}) algorithm takes ${n(t0)} seconds when ${N} = ${n(n0)}. Roughly how long will it take when ${N} = ${n(n0 + dn)}, in seconds?`,
          steps: [
            `Each extra item doubles the time. Going from ${n(n0)} to ${n(n0 + dn)} adds ${n(dn)}, multiplying the time by ${M.sup("2", n(dn))} = ${n(factor)}.`,
            `${n(t0)} × ${n(factor)} = ${n(T)} seconds. Exponential time explodes: a few more items cost a lot.`,
          ],
          answer: { kind: "number", value: T }, answerText: `${n(T)} s`, answerInput: String(T),
          vals: { dn, factor, T, n1: n0 + dn }, params: { t0, n0, dn },
        };
      }
      // level 3: the witness n0 in the definition of Big-O
      for (;;) {
        const a = r.int(1, 5), dl = r.int(1, 3), b = r.int(3, 20), c = r.int(1, 30), C = a + dl;
        const g = (t) => dl * t * t - b * t - c;
        let n0 = 1;
        for (let t = 1; t < 60; t++) if (g(t) < 0) n0 = t + 1;
        const vert = F(b, 2 * dl);
        if (n0 < 3 || n0 > 9 || vert.value >= n0) continue;
        const fN = lin([[a, M.sup(N, 2)], [b, N], [c, ""]]);
        return {
          prompt: `Show that ${V("f")}(${N}) = ${fN} is ${V("O")}(${M.sup(N, 2)}) with the constant ${V("c")} = ${n(C)}: find the smallest ${M.sub(N, 0)} such that ${V("f")}(${N}) ≤ ${n(C)}${M.sup(N, 2)} for every ${N} ≥ ${M.sub(N, 0)}.`,
          steps: [
            `${fN} ≤ ${n(C)}${M.sup(N, 2)} is the same as ${V("g")}(${N}) = ${lin([[dl, M.sup(N, 2)], [-b, N], [-c, ""]])} ≥ 0.`,
            `${V("g")} is an upward parabola with its vertex at ${N} = ${M.frac(n(b), `2 · ${n(dl)}`)} = ${dc(vert)}, so it increases from there on: once ${V("g")}(${N}) ≥ 0 past the vertex, it stays so.`,
            `${V("g")}(${n(n0 - 1)}) = ${n(dl)} · ${M.sup(n(n0 - 1), 2)} − ${n(b)} · ${n(n0 - 1)} − ${n(c)} = ${n(g(n0 - 1))} &lt; 0, but ${V("g")}(${n(n0)}) = ${n(dl)} · ${M.sup(n(n0), 2)} − ${n(b)} · ${n(n0)} − ${n(c)} = ${n(g(n0))} ≥ 0.`,
            `So ${M.sub(N, 0)} = ${n(n0)}: the inequality fails at ${N} = ${n(n0 - 1)} and holds for every ${N} ≥ ${n(n0)}, which proves ${V("f")} = ${V("O")}(${M.sup(N, 2)}).`,
          ],
          answer: { kind: "number", value: n0 }, answerText: `${M.sub(N, 0)} = ${n(n0)}`, answerInput: String(n0),
          vals: { dl, vert: fv(vert), n0, nm1: n0 - 1, gm: g(n0 - 1), g0: g(n0) }, params: { a, b, c, C },
        };
      }
    },
  };

  // ---- O.gradient-descent -------------------------------------------------------------------------------
  const ETAS = [F(1, 10), F(1, 5), F(1, 4), F(1, 8), F(1, 20)];
  /** Level curves a(x − h)² + c(y − k)² = R of an axis-aligned elliptic bowl, as two graph curves. */
  const ellipse = (a, c, h, k, R, role = "muted") => [1, -1].map((sg) => ({ t: "fn", e: `${k} + (${sg})*sqrt((${R.value} - ${a}*(x - (${h}))^2)/${c})`, role }));
  D["O.gradient-descent"] = {
    title: "Gradient descent steps and convergence",
    generate(r, level) {
      if (level === 1) {
        for (;;) {
          const A = r.int(1, 4), B = r.int(-12, 12), C = r.int(-5, 9), x0 = r.int(-6, 6), eta = r.pick(ETAS);
          const g = 2 * A * x0 + B;
          if (g === 0 || eta.mul(2 * A).cmp(1) >= 0) continue;
          const x1 = F(x0).sub(eta.mul(g));
          const f = (t) => Frac.of(t).mul(t).mul(A).add(Frac.of(t).mul(B)).add(C);
          const f0 = f(x0), f1 = f(x1);
          if (f1.cmp(f0) >= 0) continue;
          return {
            prompt: `Take one gradient-descent step on ${M.eq(`${V("f")}(${x}) = ${M.poly([A, B, C])}`)} from ${M.sub(x, 0)} = ${n(x0)} with step size ${V("η")} = ${dc(eta)}. What is ${M.sub(x, 1)}?`,
            steps: [
              `${V("f")}′(${x}) = ${M.poly([2 * A, B])}, so ${V("f")}′(${n(x0)}) = ${n(2 * A)} · ${np(x0)} + ${np(B)} = ${n(g)}.`,
              `${M.sub(x, 1)} = ${M.sub(x, 0)} − ${V("η")}${V("f")}′(${M.sub(x, 0)}) = ${n(x0)} − ${dc(eta)} · ${np(g)} = ${dc(x1)}.`,
              `Check that it went downhill: ${V("f")}(${n(x0)}) = ${dc(f0)} and ${V("f")}(${dc(x1)}) = ${dc(f1)}, smaller.`,
            ],
            answer: { kind: "number", value: x1.value }, answerText: dc(x1), answerInput: typed(x1),
            vals: { A2: 2 * A, g, x1: fv(x1), f0: fv(f0), f1: fv(f1) }, params: { A, B, C, x0, eta: fv(eta) },
          };
        }
      }
      if (level === 2) {
        // two steps on an elliptic bowl, drawn with its level curves
        for (;;) {
          const a = r.int(1, 4), c = r.intExcept(1, 4, a), h = r.int(-3, 3), k = r.int(-3, 3), eta = r.pick([F(1, 10), F(1, 8), F(1, 5)]);
          const ra = F(1).sub(eta.mul(2 * a)), rc = F(1).sub(eta.mul(2 * c));
          if (ra.n <= 0 || rc.n <= 0) continue;
          const x0 = r.intExcept(-5, 5, h), y0 = r.intExcept(-5, 5, k);
          const dd = -2 * a * h, e = -2 * c * k;
          const f = (u, v) => Frac.of(u).mul(u).mul(a).add(Frac.of(v).mul(v).mul(c)).add(Frac.of(u).mul(dd)).add(Frac.of(v).mul(e));
          const grad = (u, v) => [Frac.of(u).mul(2 * a).add(dd), Frac.of(v).mul(2 * c).add(e)];
          const g0 = grad(x0, y0), p1 = [F(x0).sub(eta.mul(g0[0])), F(y0).sub(eta.mul(g0[1]))];
          const g1 = grad(p1[0], p1[1]), p2 = [p1[0].sub(eta.mul(g1[0])), p1[1].sub(eta.mul(g1[1]))];
          const fs = [f(x0, y0), f(p1[0], p1[1]), f(p2[0], p2[1])];
          if (!(fs[0].cmp(fs[1]) > 0 && fs[1].cmp(fs[2]) > 0)) continue;
          if (![...p2, ...p1, ...g1].every(terminates)) continue;
          const fstar = F(-(a * h * h + c * k * k));
          const R0 = fs[0].sub(fstar), R1 = fs[1].sub(fstar);
          const rx = Math.sqrt(R0.value / a), ry = Math.sqrt(R0.value / c);
          const view = [h - rx - 1, h + rx + 1, k - ry - 1, k + ry + 1];
          const pts = [[x0, y0], [p1[0].value, p1[1].value], [p2[0].value, p2[1].value]];
          const gs = (g) => `(${g.map(dc).join(", ")})`;
          return {
            prompt: `Run two steps of gradient descent on ${M.eq(`${V("f")}(${x}, ${y}) = ${lin([[a, M.sup(x, 2)], [c, M.sup(y, 2)], [dd, x], [e, y]])}`)} from ${M.sub(V("x"), 0)} = ${tup(x0, y0)} with ${V("η")} = ${dc(eta)}. Give ${M.sub(V("x"), 2)}. (The curves are level sets of ${V("f")}.)`,
            graph: graph({ view, equal: true, items: [...ellipse(a, c, h, k, R0), ...ellipse(a, c, h, k, R1, "secondary"), { t: "seg", a: pts[0], b: pts[1], role: "highlight" }, { t: "pt", x: x0, y: y0, label: "x₀", role: "highlight" }] }),
            steps: [
              `∇${V("f")} = (${lin([[2 * a, x], [dd, ""]])}, ${lin([[2 * c, y], [e, ""]])}).`,
              `Step 1: ∇${V("f")}${tup(x0, y0)} = ${gs(g0)}, so ${M.sub(V("x"), 1)} = ${tup(x0, y0)} − ${dc(eta)} · ${gs(g0)} = ${tupd(...p1)}.`,
              `Step 2: ∇${V("f")}${tupd(...p1)} = ${gs(g1)}, so ${M.sub(V("x"), 2)} = ${tupd(...p1)} − ${dc(eta)} · ${gs(g1)} = ${tupd(...p2)}.`,
              `The values fall each step: ${V("f")} = ${dc(fs[0])}, ${dc(fs[1])}, ${dc(fs[2])}, toward the minimum ${dc(fstar)} at ${tup(h, k)}.`,
            ],
            answer: { kind: "point", value: p2.map((q) => q.value) }, answerText: tupd(...p2), answerInput: `(${typed(p2[0])}, ${typed(p2[1])})`,
            vals: { a2: 2 * a, c2: 2 * c, g0: g0.map(fv), p1: p1.map(fv), g1: g1.map(fv), p2: p2.map(fv), fs: fs.map(fv), fstar: fv(fstar) }, params: { a, c, d: dd, e, x0, y0, eta: fv(eta), h, k },
          };
        }
      }
      // level 3: condition number and step-size limits from the Hessian
      const H = niceHessian(r, { minLow: 1, maxLow: 8 });
      const L = H.hi, m = H.lo, kap = F(L, m), lim = F(2, L), fac = F(1).sub(F(m, L));
      return {
        prompt: `For ${M.eq(`${V("f")}(${x}, ${y}) = ${quad2(H.A, H.B, H.C)}`)} find the condition number ${V("κ")} = ${V("L")}/${V("m")} (largest over smallest Hessian eigenvalue), which governs how fast gradient descent converges.`,
        steps: [
          ...eigenSteps(H),
          `${V("L")} = ${n(L)} and ${V("m")} = ${n(m)}, so ${V("κ")} = ${M.frac(n(L), n(m))} = ${n(kap)}.`,
          `Gradient descent converges for 0 &lt; ${V("η")} &lt; ${M.frac("2", V("L"))} = ${n(lim)}. With the safe step ${V("η")} = ${M.frac("1", V("L"))} = ${n(F(1, L))}, the error ${V("f")} − ${V("f")}* shrinks at least by the factor 1 − ${M.frac("1", V("κ"))} = ${n(fac)} per step${kap.value > 3 ? ": a large κ means slow, zig-zagging progress" : ""}.`,
        ],
        answer: { kind: "number", value: kap.value }, answerText: n(kap), answerInput: typed(kap),
        vals: { H11: H.H11, H22: H.H22, tr: H.tr, det: H.det, h2: 2 * H.h, hi: H.hi, lo: H.lo, kap: fv(kap), lim: fv(lim), inv: fv(F(1, L)), fac: fv(fac) }, params: { A: H.A, B: H.B, C: H.C }, consts: [4],
      };
    },
  };

  // ---- O.line-search -----------------------------------------------------------------------------------
  const C1S = [F(1, 10), F(1, 4), F(1, 2)];
  D["O.line-search"] = {
    title: "Armijo backtracking and exact line search",
    generate(r, level) {
      if (level <= 2) {
        for (;;) {
          const A = level === 1 ? r.int(1, 4) : r.int(2, 6), B = r.int(-8, 8), x0 = r.int(-4, 4), c1 = r.pick(C1S);
          const g = 2 * A * x0 + B;
          if (g === 0) continue;
          const f = (t) => Frac.of(t).mul(t).mul(A).add(Frac.of(t).mul(B));
          const f0 = f(x0), slope = -g * g;   // f′(x0)·p with p = −f′(x0)
          const trial = (al) => {
            const xt = F(x0).sub(al.mul(g)), phi = f(xt), rhs = f0.add(c1.mul(al).mul(slope));
            return { al, xt, phi, rhs, ok: phi.cmp(rhs) <= 0 };
          };
          const fx = M.poly([A, B, 0]);
          const show = (t) => `${V("α")} = ${dc(t.al)}: ${x} = ${n(x0)} + ${dc(t.al)} · ${np(-g)} = ${dc(t.xt)}, ${V("f")} = ${dc(t.phi)}; bound ${dc(f0)} − ${dc(c1)} · ${dc(t.al)} · ${n(g * g)} = ${dc(t.rhs)}. ${t.ok ? `${dc(t.phi)} ≤ ${dc(t.rhs)}: accept.` : `${dc(t.phi)} &gt; ${dc(t.rhs)}: reject.`}`;
          const intro = `The direction is ${V("p")} = −${V("f")}′(${n(x0)}) = ${n(-g)} (from ${V("f")}′(${x}) = ${M.poly([2 * A, B])}), so the slope along it is ${V("f")}′${V("p")} = −${M.sup(np(g), 2)} = ${n(slope)}, and ${V("f")}(${n(x0)}) = ${dc(f0)}. Armijo accepts ${V("α")} when ${V("f")}(${x} + ${V("α")}${V("p")}) ≤ ${V("f")}(${x}) + ${M.sub(V("c"), 1)}${V("α")}${V("f")}′${V("p")}.`;
          if (level === 1) {
            const al = r.pick([F(1), F(1, 2), F(1, 4)]), t = trial(al);
            const options = ["Accepted", "Rejected"], idx = t.ok ? 0 : 1;
            return {
              prompt: `For ${V("f")}(${x}) = ${fx} at ${x} = ${n(x0)}, moving in the steepest-descent direction, does the step ${V("α")} = ${dc(al)} satisfy the Armijo condition with ${M.sub(V("c"), 1)} = ${dc(c1)}?`,
              steps: [intro, show(t)],
              answer: { kind: "choice", options, index: idx }, answerText: options[idx],
              vals: { A2: 2 * A, g, f0: fv(f0), slope, gg: g * g, xt: fv(t.xt), phi: fv(t.phi), rhs: fv(t.rhs) }, params: { A, B, x0, c1: fv(c1), al: fv(al) },
            };
          }
          const trials = [];
          for (let al = F(1); ; al = al.mul(F(1, 2))) { const t = trial(al); trials.push(t); if (t.ok) break; }
          if (trials.length < 2 || trials.length > 4) continue;
          const acc = trials[trials.length - 1].al;
          return {
            prompt: `Backtracking line search on ${V("f")}(${x}) = ${fx} from ${x} = ${n(x0)} along ${V("p")} = −${V("f")}′(${n(x0)}): start at ${V("α")} = 1, halve until the Armijo condition holds with ${M.sub(V("c"), 1)} = ${dc(c1)}. Which ${V("α")} is accepted?`,
            steps: [intro, ...trials.map(show), `The first step that passes is ${V("α")} = ${dc(acc)}.`],
            answer: { kind: "number", value: acc.value }, answerText: `${V("α")} = ${dc(acc)}`, answerInput: typed(acc),
            vals: { A2: 2 * A, g, f0: fv(f0), slope, gg: g * g, als: trials.map((t) => fv(t.al)), xt: trials.map((t) => fv(t.xt)), phi: trials.map((t) => fv(t.phi)), rhs: trials.map((t) => fv(t.rhs)) }, params: { A, B, x0, c1: fv(c1) },
          };
        }
      }
      // level 3: exact line search on a quadratic bowl
      for (;;) {
        const a = r.int(1, 3), c = r.int(1, 3), b = r.int(-2, 2), x0 = r.nonzero(-3, 3), y0 = r.nonzero(-3, 3);
        if (4 * a * c - b * b <= 0) continue;
        const g = [2 * a * x0 + b * y0, b * x0 + 2 * c * y0];
        if (g[0] === 0 && g[1] === 0) continue;
        const Hg = [2 * a * g[0] + b * g[1], b * g[0] + 2 * c * g[1]];
        const gg = g[0] * g[0] + g[1] * g[1], gHg = g[0] * Hg[0] + g[1] * Hg[1], al = F(gg, gHg);
        if (al.d > 40) continue;
        const x1 = [F(x0).sub(al.mul(g[0])), F(y0).sub(al.mul(g[1]))];
        return {
          prompt: `Gradient descent with exact line search on ${M.eq(`${V("f")}(${x}, ${y}) = ${quad2(a, b, c)}`)} is at ${tup(x0, y0)}. Find the step ${V("α")}* that minimizes ${V("f")} along ${V("p")} = −∇${V("f")}.`,
          steps: [
            `∇${V("f")} = (${lin([[2 * a, x], [b, y]])}, ${lin([[b, x], [2 * c, y]])}), so ${V("g")} = ∇${V("f")}${tup(x0, y0)} = ${tup(...g)}; the Hessian is ${V("H")} = ${mat([[2 * a, b], [b, 2 * c]])}.`,
            `For a quadratic, ${V("φ")}(${V("α")}) = ${V("f")}(${V("x")} − ${V("α")}${V("g")}) = ${V("f")}(${V("x")}) − ${V("α")}${M.sup(V("g"), "⊤")}${V("g")} + ${M.frac(M.sup(V("α"), 2), "2")}${M.sup(V("g"), "⊤")}${V("H")}${V("g")}; setting ${V("φ")}′ = 0 gives ${V("α")}* = ${M.frac(`${M.sup(V("g"), "⊤")}${V("g")}`, `${M.sup(V("g"), "⊤")}${V("H")}${V("g")}`)}.`,
            `${M.sup(V("g"), "⊤")}${V("g")} = ${M.sup(np(g[0]), 2)} + ${M.sup(np(g[1]), 2)} = ${n(gg)}; ${V("H")}${V("g")} = ${tup(...Hg)}, so ${M.sup(V("g"), "⊤")}${V("H")}${V("g")} = ${n(g[0])} · ${np(Hg[0])} + ${np(g[1])} · ${np(Hg[1])} = ${n(gHg)}.`,
            `${V("α")}* = ${M.frac(n(gg), n(gHg))} = ${n(al)}, and the new point is ${tup(x0, y0)} − ${n(al)} · ${tup(...g)} = ${tup(...x1)}.`,
          ],
          answer: { kind: "number", value: al.value }, answerText: n(al), answerInput: typed(al),
          vals: { g, Hg, gg, gHg, al: fv(al), x1: x1.map(fv), a2: 2 * a, c2: 2 * c }, params: { a, b, c, x0, y0 },
        };
      }
    },
  };

  // ---- O.9 Newton's method -------------------------------------------------------------------------------
  D["O.9"] = {
    title: "Stationary points and Newton steps",
    generate(r, level) {
      if (level === 1) {
        for (;;) {
          const a = r.int(1, 2), b = r.int(-6, 6), c = r.int(-12, 12), x0 = r.int(-3, 4);
          const g = 3 * a * x0 * x0 + 2 * b * x0 + c, h = 6 * a * x0 + 2 * b;
          if (h <= 0 || g === 0) continue;
          const step = F(g, h);
          if (step.d > 2) continue;
          const x1 = F(x0).sub(step);
          return {
            prompt: `Take one Newton step for minimizing ${M.eq(`${V("f")}(${x}) = ${M.poly([a, b, c, 0])}`)} from ${M.sub(x, 0)} = ${n(x0)}. What is ${M.sub(x, 1)}?`,
            steps: [
              `${V("f")}′(${x}) = ${M.poly([3 * a, 2 * b, c])} and ${V("f")}″(${x}) = ${M.poly([6 * a, 2 * b])}.`,
              `At ${n(x0)}: ${V("f")}′ = ${n(3 * a)} · ${M.sup(np(x0), 2)} + ${np(2 * b)} · ${np(x0)} + ${np(c)} = ${n(g)} and ${V("f")}″ = ${n(6 * a)} · ${np(x0)} + ${np(2 * b)} = ${n(h)} &gt; 0, so the local quadratic model has a minimum to jump to.`,
              `${M.sub(x, 1)} = ${M.sub(x, 0)} − ${M.frac(`${V("f")}′(${M.sub(x, 0)})`, `${V("f")}″(${M.sub(x, 0)})`)} = ${n(x0)} − ${M.frac(n(g), n(h))} = ${dc(x1)}.`,
            ],
            answer: { kind: "number", value: x1.value }, answerText: dc(x1), answerInput: typed(x1),
            vals: { a3: 3 * a, b2: 2 * b, a6: 6 * a, g, h, x1: fv(x1) }, params: { a, b, c, x0 }, consts: [3, 6],
          };
        }
      }
      if (level === 2) {
        // classify the stationary points of x³ − 3k²x + c y² − 2cm y
        const k = r.int(1, 3), c = r.int(1, 3), m = r.nonzero(-4, 4);
        const fxy = `${M.sup(x, 3)} − ${n(3 * k * k)}${x} + ${lin([[c, M.sup(y, 2)], [-2 * c * m, y]])}`;
        return {
          prompt: `Find the local minimum of ${M.eq(`${V("f")}(${x}, ${y}) = ${fxy}.`)} Give the point (${x}, ${y}).`,
          steps: [
            `First-order condition ∇${V("f")} = 0: ∂${V("f")}/∂${x} = 3${M.sup(x, 2)} − ${n(3 * k * k)} = 0 gives ${x} = ±${n(k)}; ∂${V("f")}/∂${y} = ${lin([[2 * c, y], [-2 * c * m, ""]])} = 0 gives ${y} = ${n(m)}.`,
            `Second-order test: the Hessian is ${mat([["6" + x, 0], [0, 2 * c]])}, diagonal.`,
            `At ${tup(k, m)} its entries are ${n(6 * k)} and ${n(2 * c)}, both positive: positive definite, a strict local minimum. At ${tup(-k, m)} they are ${n(-6 * k)} and ${n(2 * c)}, of opposite signs: a saddle point.`,
            `The local minimum is ${tup(k, m)}. (It is not global: ${V("f")} → −∞ as ${x} → −∞.)`,
          ],
          answer: { kind: "point", value: [k, m] }, answerText: tup(k, m), answerInput: `(${k}, ${m})`,
          vals: { k3: 3 * k * k, c2: 2 * c, cm: 2 * c * m, k, m, k6: 6 * k }, params: { k, c, m }, consts: [3, 6],
        };
      }
      // level 3: one Newton step in two variables
      for (;;) {
        const c = r.int(1, 3), dd = r.nonzero(-3, 3), x0 = r.pick([-2, -1, 1, 2]), y0 = r.int(-2, 2);
        const g = [4 * x0 * x0 * x0 + dd * y0, 2 * c * y0 + dd * x0], H = [[12 * x0 * x0, dd], [dd, 2 * c]];
        const det = H[0][0] * H[1][1] - dd * dd;
        if (det <= 0 || (g[0] === 0 && g[1] === 0)) continue;
        // solve H p = −g by Cramer's rule
        const p = [F(-g[0] * H[1][1] + g[1] * dd, det), F(-g[1] * H[0][0] + g[0] * dd, det)];
        if (p[0].d > 30 || p[1].d > 30) continue;
        const x1 = [p[0].add(x0), p[1].add(y0)];
        return {
          prompt: `Take one Newton step on ${M.eq(`${V("f")}(${x}, ${y}) = ${lin([[1, M.sup(x, 4)], [c, M.sup(y, 2)], [dd, `${x}${y}`]])}`)} from ${tup(x0, y0)}. Give the new point.`,
          steps: [
            `∇${V("f")} = (${lin([[4, M.sup(x, 3)], [dd, y]])}, ${lin([[2 * c, y], [dd, x]])}) and ∇²${V("f")} = ${mat([[`12${M.sup(x, 2)}`, dd], [dd, 2 * c]])}.`,
            `At ${tup(x0, y0)}: ∇${V("f")} = ${tup(...g)} and ∇²${V("f")} = ${mat(H)}, with determinant ${n(H[0][0])} · ${n(2 * c)} − ${M.sup(np(dd), 2)} = ${n(det)} &gt; 0 (positive definite, so the step points downhill).`,
            `Solve ∇²${V("f")} ${V("p")} = −∇${V("f")} by Cramer's rule: ${M.sub(V("p"), 1)} = ${M.frac(`${np(-g[0])} · ${n(2 * c)} − ${np(-g[1])} · ${np(dd)}`, n(det))} = ${n(p[0])}, ${M.sub(V("p"), 2)} = ${M.frac(`${n(H[0][0])} · ${np(-g[1])} − ${np(dd)} · ${np(-g[0])}`, n(det))} = ${n(p[1])}.`,
            `New point: ${tup(x0, y0)} + ${tup(...p)} = ${tup(...x1)}.`,
          ],
          answer: { kind: "point", value: x1.map((q) => q.value) }, answerText: tup(...x1), answerInput: `(${typed(x1[0])}, ${typed(x1[1])})`,
          vals: { g, H11: H[0][0], c2: 2 * c, det, p: p.map(fv), x1: x1.map(fv), ng: g.map((v) => -v) }, params: { c, d: dd, x0, y0 }, consts: [3, 4, 12],
        };
      }
    },
  };

  // ---- O.quasi-newton ---------------------------------------------------------------------------------------
  D["O.quasi-newton"] = {
    title: "Secant updates and BFGS",
    generate(r, level) {
      if (level === 1) {
        // the one-dimensional secant (quasi-Newton) step
        for (;;) {
          const quad = r.chance(0.5);
          const A = r.int(1, 4), hh = r.int(-4, 4), K = r.pick([2, 3, 5, 6, 7, 10]);
          const gf = quad ? (t) => 2 * A * (t - hh) : (t) => t * t - K;
          const x0 = quad ? r.int(-5, 5) : r.int(1, 4), x1 = quad ? r.int(-5, 5) : r.int(1, 4);
          if (x0 === x1) continue;
          const g0 = gf(x0), g1 = gf(x1), s = x1 - x0, yv = g1 - g0;
          if (yv === 0 || g1 === 0) continue;
          const Hs = F(s, yv), x2 = F(x1).sub(Hs.mul(g1));
          if (x2.d > 12) continue;
          return {
            prompt: `A quasi-Newton method in one variable knows only gradients: ${V("f")}′(${n(x0)}) = ${n(g0)} and ${V("f")}′(${n(x1)}) = ${n(g1)}. From ${M.sub(x, 1)} = ${n(x1)} (previous point ${M.sub(x, 0)} = ${n(x0)}), take the step ${M.sub(x, 2)} = ${M.sub(x, 1)} − ${M.sub(V("H"), 1)}${V("f")}′(${M.sub(x, 1)}), where ${M.sub(V("H"), 1)} satisfies the secant condition. Find ${M.sub(x, 2)}.`,
            steps: [
              `Step ${V("s")} = ${M.sub(x, 1)} − ${M.sub(x, 0)} = ${n(x1)} − ${np(x0)} = ${n(s)}; gradient change ${V("y")} = ${n(g1)} − ${np(g0)} = ${n(yv)}.`,
              `Secant condition ${M.sub(V("H"), 1)}${V("y")} = ${V("s")}: ${M.sub(V("H"), 1)} = ${M.frac(n(s), n(yv))} = ${n(Hs)}, an estimate of 1/${V("f")}″ from gradients alone.`,
              `${M.sub(x, 2)} = ${n(x1)} − ${n(Hs)} · ${np(g1)} = ${n(x2)}.${quad ? " (Here the gradient is linear, so the secant slope is the exact curvature and the step lands on the minimizer.)" : ""}`,
            ],
            answer: { kind: "number", value: x2.value }, answerText: n(x2), answerInput: typed(x2),
            vals: { s, yv, Hs: fv(Hs), x2: fv(x2) }, params: { x0, x1, g0, g1 },
          };
        }
      }
      if (level === 2) {
        // one step from H0 = I and the curvature pair it produces
        for (;;) {
          const a = r.int(1, 4), c = r.intExcept(1, 4, a), x0 = r.nonzero(-3, 3), y0 = r.nonzero(-3, 3), al = r.pick([F(1, 2), F(1, 4), F(1, 10), F(1, 8)]);
          const g0 = [2 * a * x0, 2 * c * y0];
          const s = [al.mul(-g0[0]), al.mul(-g0[1])], x1 = [s[0].add(x0), s[1].add(y0)];
          const g1 = [x1[0].mul(2 * a), x1[1].mul(2 * c)], yy = [g1[0].sub(g0[0]), g1[1].sub(g0[1])];
          const ys = yy[0].mul(s[0]).add(yy[1].mul(s[1])), rho = F(1).div(ys);
          if (!terminates(ys) || ![...s, ...yy, ...x1].every(terminates)) continue;
          return {
            prompt: `BFGS starts on ${M.eq(`${V("f")}(${x}, ${y}) = ${lin([[a, M.sup(x, 2)], [c, M.sup(y, 2)]])}`)} at ${M.sub(V("x"), 0)} = ${tup(x0, y0)} with ${M.sub(V("H"), 0)} = ${V("I")} and step length ${V("α")} = ${dc(al)}. Find ${M.sub(V("ρ"), 0)} = 1/(${M.sup(M.sub(V("y"), 0), "⊤")}${M.sub(V("s"), 0)}), the scale of the first update.`,
            steps: [
              `∇${V("f")} = (${n(2 * a)}${x}, ${n(2 * c)}${y}), so ∇${V("f")}(${M.sub(V("x"), 0)}) = ${tup(...g0)} and the direction is ${M.sub(V("p"), 0)} = −${M.sub(V("H"), 0)}∇${V("f")} = ${tup(-g0[0], -g0[1])}.`,
              `${M.sub(V("s"), 0)} = ${V("α")}${M.sub(V("p"), 0)} = ${tupd(...s)}, so ${M.sub(V("x"), 1)} = ${tupd(...x1)} and ∇${V("f")}(${M.sub(V("x"), 1)}) = ${tupd(...g1)}.`,
              `${M.sub(V("y"), 0)} = ∇${V("f")}(${M.sub(V("x"), 1)}) − ∇${V("f")}(${M.sub(V("x"), 0)}) = ${tupd(...yy)}.`,
              `${M.sup(M.sub(V("y"), 0), "⊤")}${M.sub(V("s"), 0)} = ${dc(yy[0])} · ${dcp(s[0])} + ${dcp(yy[1])} · ${dcp(s[1])} = ${dc(ys)} &gt; 0, so the curvature condition holds and the update keeps ${V("H")} positive definite. ${M.sub(V("ρ"), 0)} = ${ys.isInt() ? n(rho) : `${M.frac("1", dc(ys))} = ${n(rho)}`}.`,
            ],
            answer: { kind: "number", value: rho.value }, answerText: n(rho), answerInput: typed(rho),
            vals: { g0, s: s.map(fv), x1: x1.map(fv), g1: g1.map(fv), yy: yy.map(fv), ys: fv(ys), rho: fv(rho), a2: 2 * a, c2: 2 * c, ng: g0.map((v) => -v) }, params: { a, c, x0, y0, al: fv(al) },
          };
        }
      }
      // level 3: one BFGS inverse-Hessian update from H0 = I
      for (;;) {
        const s = [r.int(-2, 2), r.int(-2, 2)], yv = [r.int(-3, 3), r.int(-3, 3)];
        const ys = s[0] * yv[0] + s[1] * yv[1];
        if (ys <= 0 || ys > 6 || (s[0] === 0 && s[1] === 0) || s[0] * yv[1] === s[1] * yv[0]) continue;
        const rho = F(1, ys), yy = yv[0] * yv[0] + yv[1] * yv[1], k1 = rho.add(rho.mul(rho).mul(yy));
        const ss = [[s[0] * s[0], s[0] * s[1]], [s[1] * s[0], s[1] * s[1]]];
        const sym = [[2 * yv[0] * s[0], yv[0] * s[1] + s[0] * yv[1]], [yv[1] * s[0] + s[1] * yv[0], 2 * yv[1] * s[1]]];
        const Hn = [0, 1].map((i) => [0, 1].map((j) => F(i === j ? 1 : 0).add(k1.mul(ss[i][j])).sub(rho.mul(sym[i][j]))));
        if (Hn.flat().some((q) => q.d > 40)) continue;
        const ans = [Hn[0][0], Hn[0][1], Hn[1][1]];
        const Hy = [Hn[0][0].mul(yv[0]).add(Hn[0][1].mul(yv[1])), Hn[1][0].mul(yv[0]).add(Hn[1][1].mul(yv[1]))];
        const sv = M.sub(V("s"), 0), yvv = M.sub(V("y"), 0), T = (v) => M.sup(v, "⊤");
        return {
          prompt: `Apply one BFGS update to ${M.sub(V("H"), 0)} = ${V("I")} with ${sv} = ${tup(...s)} and ${yvv} = ${tup(...yv)}: ${M.eq(`${M.sub(V("H"), 1)} = (${V("I")} − ${V("ρ")}${sv}${T(yvv)})${M.sub(V("H"), 0)}(${V("I")} − ${V("ρ")}${yvv}${T(sv)}) + ${V("ρ")}${sv}${T(sv)},  ${V("ρ")} = ${M.frac("1", `${T(yvv)}${sv}`)}.`)} Give the entries ${M.sub(V("h"), "11")}, ${M.sub(V("h"), "12")}, ${M.sub(V("h"), "22")} of ${M.sub(V("H"), 1)}.`,
          steps: [
            `${T(yvv)}${sv} = ${n(yv[0])} · ${np(s[0])} + ${np(yv[1])} · ${np(s[1])} = ${n(ys)} &gt; 0, so ${V("ρ")} = ${n(rho)}.`,
            `With ${M.sub(V("H"), 0)} = ${V("I")} the product expands to ${M.sub(V("H"), 1)} = ${V("I")} + (${V("ρ")} + ${M.sup(V("ρ"), 2)}${T(yvv)}${yvv})${sv}${T(sv)} − ${V("ρ")}(${yvv}${T(sv)} + ${sv}${T(yvv)}). Here ${T(yvv)}${yvv} = ${n(yy)}, so the first coefficient is ${n(rho)} + ${M.sup(n(rho), 2)} · ${n(yy)} = ${n(k1)}.`,
            `${sv}${T(sv)} = ${mat(ss)} and ${yvv}${T(sv)} + ${sv}${T(yvv)} = ${mat(sym)}.`,
            `${M.sub(V("H"), 1)} = ${V("I")} + ${n(k1)} · ${mat(ss)} − ${n(rho)} · ${mat(sym)} = ${mat(Hn)}.`,
            `Check the secant condition ${M.sub(V("H"), 1)}${yvv} = ${sv}: ${mat(Hn)}${tup(...yv)} = ${tup(...Hy)}. ✓`,
          ],
          answer: { kind: "numbers", values: ans.map((q) => q.value), ordered: true }, answerText: ans.map(n).join(", "), answerInput: ans.map(typed).join(", "),
          vals: { ys, rho: fv(rho), yy, k1: fv(k1), ss, sym, Hn: Hn.map((row) => row.map(fv)), Hy: Hy.map(fv) }, params: { s, y: yv }, consts: [11, 12, 22],
        };
      }
    },
  };

  // ---- O.coordinate-descent -------------------------------------------------------------------------------
  D["O.coordinate-descent"] = {
    title: "Coordinate descent and soft-thresholding",
    generate(r, level) {
      if (level <= 2) {
        for (;;) {
          const a = r.int(1, 3), c = r.int(1, 3), b = r.nonzero(-3, 3), dd = r.int(-10, 10), e = r.int(-10, 10), x0 = r.int(-3, 3), y0 = r.int(-3, 3);
          if (4 * a * c - b * b <= 0) continue;
          const x1 = F(-(b * y0 + dd), 2 * a);
          if (level === 1 && (!x1.isInt() || x1.eq(x0))) continue;
          const y1 = x1.mul(-b).sub(e).div(2 * c);
          if (level === 2 && (x1.d > 6 || y1.d > 12 || x1.eq(x0) || y1.eq(y0))) continue;
          const fxy = lin([[a, M.sup(x, 2)], [b, `${x}${y}`], [c, M.sup(y, 2)], [dd, x], [e, y]]);
          const stepX = `Hold ${y} = ${n(y0)} and minimize over ${x}: ∂${V("f")}/∂${x} = ${lin([[2 * a, x], [b, y], [dd, ""]])} = 0, so ${x} = ${M.frac(`−(${n(b)} · ${np(y0)} + ${np(dd)})`, n(2 * a))} = ${n(x1)}.`;
          if (level === 1) {
            return {
              prompt: `Coordinate descent on ${M.eq(`${V("f")}(${x}, ${y}) = ${fxy}`)} is at ${tup(x0, y0)}. Update ${x} exactly, holding ${y} fixed. What is the new ${x}?`,
              steps: [stepX, `Only ${x} changed: the new point is ${tup(x1, y0)}. (The ${M.sup(x, 2)} coefficient ${n(a)} is positive, so this really is a minimum along ${x}.)`],
              answer: { kind: "number", value: x1.value }, answerText: n(x1), answerInput: typed(x1),
              vals: { a2: 2 * a, x1: fv(x1) }, params: { a, b, c, d: dd, e, x0, y0 },
            };
          }
          const f = (u, v) => Frac.of(u).mul(u).mul(a).add(Frac.of(u).mul(v).mul(b)).add(Frac.of(v).mul(v).mul(c)).add(Frac.of(u).mul(dd)).add(Frac.of(v).mul(e));
          const fs = [f(x0, y0), f(x1, y0), f(x1, y1)];
          return {
            prompt: `Run one full sweep of coordinate descent (first ${x}, then ${y}, each minimized exactly) on ${M.eq(`${V("f")}(${x}, ${y}) = ${fxy}`)} from ${tup(x0, y0)}. Give the point after the sweep.`,
            steps: [
              stepX,
              `Now hold ${x} = ${n(x1)} and minimize over ${y}: ∂${V("f")}/∂${y} = ${lin([[b, x], [2 * c, y], [e, ""]])} = 0, so ${y} = −(${n(b)} · ${np(x1)} + ${np(e)}) ÷ ${n(2 * c)} = ${n(y1)}.`,
              `After the sweep: ${tup(x1, y1)}. Each update can only lower ${V("f")}: ${n(fs[0])} → ${n(fs[1])} → ${n(fs[2])}.`,
            ],
            answer: { kind: "point", value: [x1.value, y1.value] }, answerText: tup(x1, y1), answerInput: `(${typed(x1)}, ${typed(y1)})`,
            vals: { a2: 2 * a, c2: 2 * c, x1: fv(x1), y1: fv(y1), fs: fs.map(fv) }, params: { a, b, c, d: dd, e, x0, y0 },
          };
        }
      }
      // level 3: the lasso coordinate update with soft-thresholding
      for (;;) {
        const k = r.int(3, 4), xj = range(k).map(() => r.int(-2, 3)), rr = range(k).map(() => r.int(-4, 5)), lam = r.int(1, 8);
        const xx = sum(xj.map((v) => v * v)), z = sum(xj.map((v, i) => v * rr[i]));
        if (xx === 0 || z === 0) continue;
        const Sz = Math.sign(z) * Math.max(Math.abs(z) - lam, 0), beta = F(Sz, xx);
        if (Sz === 0 && !r.chance(0.3)) continue;
        if (beta.d > 12) continue;
        const vec = (v) => `(${v.map(n).join(", ")})`;
        return {
          prompt: `In a lasso regression, coordinate descent updates feature ${V("j")} with ${M.eq(`${M.sub(V("β"), V("j"))} ← ${M.frac(`${M.sub(V("S"), V("λ"))}(${M.sup(M.sub(V("x"), V("j")), "⊤")}${M.sub(V("r"), `(${V("j")})`)})`, `${M.sup(M.sub(V("x"), V("j")), "⊤")}${M.sub(V("x"), V("j"))}`)},  ${M.sub(V("S"), V("λ"))}(${V("z")}) = sign(${V("z")}) max(|${V("z")}| − ${V("λ")}, 0).`)} The feature column is ${M.sub(V("x"), V("j"))} = ${vec(xj)}, the partial residual is ${M.sub(V("r"), `(${V("j")})`)} = ${vec(rr)}, and ${V("λ")} = ${n(lam)}. Find the new ${M.sub(V("β"), V("j"))}.`,
          steps: [
            `${V("z")} = ${M.sup(M.sub(V("x"), V("j")), "⊤")}${M.sub(V("r"), `(${V("j")})`)} = ${xj.map((v, i) => `${i === 0 ? n(v) : np(v)} · ${np(rr[i])}`).join(" + ")} = ${n(z)}.`,
            `Soft-threshold: |${V("z")}| = ${n(Math.abs(z))} ${Math.abs(z) > lam ? `&gt; ${n(lam)}, so ${M.sub(V("S"), V("λ"))}(${V("z")}) = ${z < 0 ? "−" : ""}(${n(Math.abs(z))} − ${n(lam)}) = ${n(Sz)}` : `≤ ${n(lam)}, so ${M.sub(V("S"), V("λ"))}(${V("z")}) = 0: the penalty sets this coefficient exactly to zero`}.`,
            `${M.sup(M.sub(V("x"), V("j")), "⊤")}${M.sub(V("x"), V("j"))} = ${xj.map((v) => M.sup(np(v), 2)).join(" + ")} = ${n(xx)}, so ${M.sub(V("β"), V("j"))} = ${M.frac(n(Sz), n(xx))}${beta.d === xx && beta.n === Sz ? "" : ` = ${n(beta)}`}.`,
          ],
          answer: { kind: "number", value: beta.value }, answerText: n(beta), answerInput: typed(beta),
          vals: { z, az: Math.abs(z), Sz, xx, beta: fv(beta) }, params: { xj, r: rr, lam },
        };
      }
    },
  };

  // ---- O.stochastic SGD -------------------------------------------------------------------------------------
  D["O.stochastic"] = {
    title: "Stochastic gradient descent",
    generate(r, level) {
      if (level === 1) {
        const k = 4, xi = range(k).map(() => r.int(-5, 15)), x0 = r.int(-5, 5);
        const xs = [F(x0)];
        for (let i = 1; i <= k; i++) xs.push(xs[i - 1].sub(xs[i - 1].sub(xi[i - 1]).mul(F(1, i))));
        const mean = F(sum(xi), k);
        return {
          prompt: `To estimate a mean, SGD minimizes ${V("E")}[${M.frac("1", "2")}${M.sup(`(${x} − ${V("ξ")})`, 2)}] using one sample per step: the stochastic gradient is ${x} − ${M.sub(V("ξ"), V("k"))}, and the step size is ${M.sub(V("η"), V("k"))} = 1/${V("k")}. Starting at ${M.sub(x, 0)} = ${n(x0)}, process the samples ${listAnd(xi.map(n))} in order. What is ${M.sub(x, k)}?`,
          steps: [
            `Update: ${M.sub(x, V("k"))} = ${M.sub(x, `${V("k")}−1`)} − ${M.frac("1", V("k"))}(${M.sub(x, `${V("k")}−1`)} − ${M.sub(V("ξ"), V("k"))}).`,
            ...range(k).map((i) => `${V("k")} = ${n(i + 1)}: ${n(xs[i])} − ${i === 0 ? "" : M.frac("1", n(i + 1))}(${n(xs[i])} − ${np(xi[i])}) = ${n(xs[i + 1])}.`),
            `${M.sub(x, k)} = ${n(xs[k])}, exactly the sample mean ${M.frac(xi.map(np).join(" + "), n(k))} = ${n(mean)}: with ${M.sub(V("η"), V("k"))} = 1/${V("k")}, SGD keeps a running average, which averages the noise away.`,
          ],
          answer: { kind: "number", value: xs[k].value }, answerText: dc(xs[k]), answerInput: typed(xs[k]),
          vals: { xs: xs.map(fv), mean: fv(mean) }, params: { xi, x0 }, consts: [3, 4],
        };
      }
      if (level === 2) {
        for (;;) {
          const B = r.int(2, 3), w0 = r.int(-2, 3), eta = r.pick([F(1, 10), F(1, 20), F(1, 4)]);
          const xs = range(B).map(() => r.nonzero(-3, 4)), ys = range(B).map(() => r.int(-6, 9));
          const res = xs.map((v, i) => w0 * v - ys[i]), gi = res.map((v, i) => v * xs[i]);
          const g = F(sum(gi), B), w1 = F(w0).sub(eta.mul(g));
          if (g.n === 0 || !terminates(w1)) continue;
          return {
            prompt: `A one-parameter model ${V("ŷ")} = ${V("w")}${x} is trained by minibatch SGD on the loss ${M.frac("1", "2")}${M.sup(`(${V("w")}${x} − ${y})`, 2)}. The current weight is ${V("w")} = ${n(w0)}, the step size is ${V("η")} = ${dc(eta)}, and the minibatch is ${listAnd(xs.map((v, i) => tup(v, ys[i])))} as (${x}, ${y}) pairs. What is the updated ${V("w")}?`,
            steps: [
              `Per-example gradient: ${M.frac("d", `d${V("w")}`)} ${M.frac("1", "2")}${M.sup(`(${V("w")}${x} − ${y})`, 2)} = (${V("w")}${x} − ${y})${x}.`,
              xs.map((v, i) => `(${n(w0)} · ${np(v)} − ${np(ys[i])}) · ${np(v)} = ${n(res[i])} · ${np(v)} = ${n(gi[i])}`).join("; ") + ".",
              `Minibatch gradient (the average): ${M.frac(gi.map(np).join(" + "), n(B))} = ${dc(g)}.`,
              `${V("w")} ← ${n(w0)} − ${dc(eta)} · ${dcp(g)} = ${dc(w1)}.`,
            ],
            answer: { kind: "number", value: w1.value }, answerText: dc(w1), answerInput: typed(w1),
            vals: { res, gi, g: fv(g), w1: fv(w1) }, params: { B, w0, eta: fv(eta), xs, ys },
          };
        }
      }
      // level 3: minibatch size for a target noise level
      for (;;) {
        const sigma = r.pick([2, 3, 4, 5, 6, 8, 10, 12]), s = r.pick([F(1, 2), F(1), F(3, 2), F(2), F(5, 2), F(3)]), tex = r.pick([F(1, 2), F(1), F(2), F(1, 4)]);
        const ratio = F(sigma).div(s), need = ratio.mul(ratio);
        const B = Math.ceil(need.value - 1e-12);
        if (B < 3 || B > 400 || ratio.cmp(1) <= 0) continue;
        const ms = tex.mul(B);
        return {
          prompt: `Per-example gradients of a model have standard deviation ${V("σ")} = ${n(sigma)} (in each coordinate). You want the minibatch gradient's standard deviation to be at most ${dc(s)}. What is the smallest minibatch size ${V("B")}, and how long does one step take if each example costs ${dc(tex)} ms? (Enter ${V("B")}.)`,
          steps: [
            `The minibatch gradient averages ${V("B")} independent unbiased examples, so its variance is ${M.frac(M.sup(V("σ"), 2), V("B"))} and its standard deviation ${M.frac(V("σ"), M.sqrt(V("B")))}.`,
            `${M.frac(n(sigma), M.sqrt(V("B")))} ≤ ${dc(s)} ⟺ ${M.sqrt(V("B"))} ≥ ${M.frac(n(sigma), dc(s))} = ${dc(ratio)} ⟺ ${V("B")} ≥ ${M.sup(dcp(ratio), 2)} = ${dc(need)}.`,
            `${need.isInt() ? `So ${V("B")} = ${n(B)}.` : `Round up: ${V("B")} = ${n(B)}.`} One step costs ${n(B)} × ${dc(tex)} = ${dc(ms)} ms. Halving the noise would need four times the batch: averaging buys accuracy only at the square-root rate.`,
          ],
          answer: { kind: "number", value: B }, answerText: `${V("B")} = ${n(B)}`, answerInput: String(B),
          vals: { ratio: fv(ratio), need: fv(need), B, ms: fv(ms) }, params: { sigma, s: fv(s), tex: fv(tex) },
        };
      }
    },
  };

  // ---- O.10 Lagrange multipliers ----------------------------------------------------------------------------
  const lamS = V("λ"), muS = V("μ");
  D["O.10"] = {
    title: "Lagrange multipliers",
    generate(r, level) {
      if (level === 1) {
        const a = r.int(1, 4), b = r.int(1, 4), L = P.lcm(2 * a, 2 * b), c = L * r.int(1, Math.max(1, Math.floor(24 / L)));
        const xs = c / (2 * a), ys = c / (2 * b), lam = F(c, 2 * a * b), fs = xs * ys;
        return {
          prompt: `Maximize ${V("f")}(${x}, ${y}) = ${x}${y} subject to ${lin([[a, x], [b, y]])} = ${n(c)}, with ${x}, ${y} &gt; 0.`,
          steps: [
            `Lagrangian: ${V("L")} = ${x}${y} − ${lamS}(${lin([[a, x], [b, y]])} − ${n(c)}).`,
            `∂${V("L")}/∂${x} = ${y} − ${a === 1 ? "" : n(a)}${lamS} = 0 and ∂${V("L")}/∂${y} = ${x} − ${b === 1 ? "" : n(b)}${lamS} = 0, so ${y} = ${a === 1 ? "" : n(a)}${lamS} and ${x} = ${b === 1 ? "" : n(b)}${lamS}: the gradients (${y}, ${x}) and (${n(a)}, ${n(b)}) are parallel.`,
            `Substitute into the constraint: ${a === 1 ? "" : `${n(a)} · `}${b === 1 ? "" : n(b)}${lamS} + ${b === 1 ? "" : `${n(b)} · `}${a === 1 ? "" : n(a)}${lamS} = ${n(2 * a * b)}${lamS} = ${n(c)}, so ${lamS} = ${n(lam)}.`,
            `${x} = ${b === 1 ? lamS : `${n(b)} · ${n(lam)}`} = ${n(xs)}, ${y} = ${a === 1 ? lamS : `${n(a)} · ${n(lam)}`} = ${n(ys)}, and ${V("f")} = ${n(xs)} · ${n(ys)} = ${n(fs)}. (At the ends of the segment ${V("f")} → 0, so this is the maximum.)`,
          ],
          answer: { kind: "number", value: fs }, answerText: n(fs), answerInput: String(fs),
          vals: { ab2: 2 * a * b, lam: fv(lam), xs, ys, fs }, params: { a, b, c },
        };
      }
      if (level === 2) {
        // a linear objective on a circle
        const [t1, t2, h] = r.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10]]);
        const al = t1 * r.sign(), be = t2 * r.sign(), R = r.int(1, 4), R2 = R * R, fmax = h * R;
        const lam = F(h, 2 * R), xs = F(al * R, h), ys = F(be * R, h);
        return {
          prompt: `Find the maximum of ${V("f")}(${x}, ${y}) = ${lin([[al, x], [be, y]])} on the circle ${M.sup(x, 2)} + ${M.sup(y, 2)} = ${n(R2)}.`,
          steps: [
            `Tangency: ∇${V("f")} = ${lamS}∇${V("g")}, i.e. (${n(al)}, ${n(be)}) = ${lamS}(2${x}, 2${y}), so ${x} = ${M.frac(n(al), `2${lamS}`)} and ${y} = ${M.frac(n(be), `2${lamS}`)}.`,
            `Substitute into the constraint: ${M.frac(`${M.sup(np(al), 2)} + ${M.sup(np(be), 2)}`, `4${M.sup(lamS, 2)}`)} = ${M.frac(n(h * h), `4${M.sup(lamS, 2)}`)} = ${n(R2)}, so ${lamS} = ±${n(lam)}.`,
            `${lamS} = ${n(lam)} gives ${tup(xs, ys)} with ${V("f")} = ${n(al)} · ${np(xs)} + ${np(be)} · ${np(ys)} = ${n(fmax)}; ${lamS} = −${n(lam)} gives the opposite point with ${V("f")} = −${n(fmax)}.`,
            `The maximum is ${n(fmax)} (the length of (${n(al)}, ${n(be)}) times the radius ${n(R)}).`,
          ],
          answer: { kind: "number", value: fmax }, answerText: n(fmax), answerInput: String(fmax),
          vals: { hh: h * h, lam: fv(lam), xs: fv(xs), ys: fv(ys), fmax, R, h }, params: { al, be, R2 }, consts: [4],
        };
      }
      // level 3: a fence on a budget, and what one more dollar is worth
      for (;;) {
        const a = r.int(2, 5), b = r.pick([4, 5, 6, 8, 10]);
        if (b <= a) continue;
        const L = P.lcm(4 * a, 2 * b), B = L * r.int(1, 40);
        if (B < 300 || B > 2400) continue;
        const xs = B / (4 * a), ys = B / (2 * b), A = xs * ys, lam = F(B, 4 * a * b);
        return {
          prompt: `A rectangular pen is built against a river, so only three sides are fenced: two sides of length ${x} cost ${money(a)} per meter and the side of length ${y}, parallel to the river, costs ${money(b)} per meter. The budget is ${money(B)}. By how much does the largest possible area grow per extra dollar of budget? Give ${lamS} in m² per dollar.`,
          steps: [
            `Maximize ${V("A")} = ${x}${y} subject to ${lin([[2 * a, x], [b, y]])} = ${n(B)}. Lagrangian: ${V("L")} = ${x}${y} − ${lamS}(${lin([[2 * a, x], [b, y]])} − ${n(B)}).`,
            `∂${V("L")}/∂${x}: ${y} = ${n(2 * a)}${lamS}; ∂${V("L")}/∂${y}: ${x} = ${n(b)}${lamS}. So ${n(2 * a)} · ${n(b)}${lamS} + ${n(b)} · ${n(2 * a)}${lamS} = ${n(4 * a * b)}${lamS} = ${n(B)}, and ${lamS} = ${M.frac(n(B), n(4 * a * b))} = ${dc(lam)}.`,
            `The pen: ${x} = ${n(b)} · ${dc(lam)} = ${n(xs)} m, ${y} = ${n(2 * a)} · ${dc(lam)} = ${n(ys)} m, area ${n(xs)} · ${n(ys)} = ${n(A)} m². (The budget splits evenly: ${money(2 * a * xs)} on the two sides, ${money(b * ys)} on the river side.)`,
            `The multiplier is the shadow price of the budget, ${lamS} = d${V("A")}*/d${V("B")}: each extra dollar adds about ${dc(lam)} m² of area.`,
          ],
          answer: { kind: "number", value: lam.value }, answerText: `${dc(lam)} m² per dollar`, answerInput: typed(lam),
          vals: { a2: 2 * a, ab4: 4 * a * b, lam: fv(lam), xs, ys, A, sides: 2 * a * xs, front: b * ys }, params: { a, b, B },
        };
      }
    },
  };

  // ---- O.11 KKT conditions ----------------------------------------------------------------------------------
  D["O.11"] = {
    title: "KKT conditions and active sets",
    generate(r, level) {
      if (level === 1) {
        for (;;) {
          const a = r.int(-6, 8), b = r.int(-4, 6), upper = r.chance(0.5);
          if (a === b) continue;
          const active = upper ? a > b : a < b;
          const xs = active ? b : a, mu = active ? Math.abs(2 * (a - b)) : 0;
          const g = upper ? `${M.poly([1, -b])} ≤ 0` : `${b === 0 ? `−${x}` : `${n(b)} − ${x}`} ≤ 0`;
          const stat = upper ? `2(${M.poly([1, -a])}) + ${muS} = 0` : `2(${M.poly([1, -a])}) − ${muS} = 0`;
          return {
            prompt: `Minimize ${M.sup(`(${M.poly([1, -a])})`, 2)} subject to ${x} ${upper ? "≤" : "≥"} ${n(b)}. Give the minimizer ${x}* and the multiplier ${muS}, in that order.`,
            steps: [
              `Standard form: ${V("g")}(${x}) = ${g}. KKT: stationarity ${stat}, ${muS} ≥ 0, and complementary slackness ${muS}${V("g")}(${x}) = 0.`,
              `Inactive guess (${muS} = 0): stationarity gives ${x} = ${n(a)}, which ${active ? `violates ${x} ${upper ? "≤" : "≥"} ${n(b)}` : `satisfies ${x} ${upper ? "≤" : "≥"} ${n(b)}: all conditions hold`}.`,
              active ? `Active guess (${x} = ${n(b)}): ${upper ? `2(${n(b)} − ${np(a)}) + ${muS} = 0` : `2(${n(b)} − ${np(a)}) − ${muS} = 0`}, so ${muS} = ${n(mu)} ≥ 0, and complementary slackness holds since the constraint is tight.`
                : `The constraint is slack, so its price is ${muS} = 0.`,
            ],
            answer: { kind: "numbers", values: [xs, mu], ordered: true }, answerText: `${x}* = ${n(xs)}, ${muS} = ${n(mu)}`, answerInput: `${xs}, ${mu}`,
            vals: { xs, mu }, params: { a, b, upper: upper ? 1 : 0 },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const p = r.int(1, 8), q = r.int(1, 8), s = r.int(2, 10), active = p + q > s;
          if (p + q === s || (!active && r.chance(0.6))) continue;
          const mu = active ? p + q - s : 0, xs = F(2 * p - mu, 2), ys = F(2 * q - mu, 2);
          return {
            prompt: `Minimize ${M.sup(`(${M.poly([1, -p])})`, 2)} + ${M.sup(`(${M.poly([1, -q], "y")})`, 2)} subject to ${x} + ${y} ≤ ${n(s)}. Give ${x}*, ${y}* and the multiplier ${muS}, in that order.`,
            steps: [
              `KKT with ${V("g")} = ${x} + ${y} − ${n(s)} ≤ 0: 2(${x} − ${n(p)}) + ${muS} = 0, 2(${y} − ${n(q)}) + ${muS} = 0, ${muS} ≥ 0, ${muS}${V("g")} = 0.`,
              `Try ${muS} = 0: (${x}, ${y}) = ${tup(p, q)}, where ${x} + ${y} = ${n(p + q)} ${active ? `&gt; ${n(s)}: infeasible` : `≤ ${n(s)}: feasible, so all conditions hold`}.`,
              active ? `So the constraint is active: ${x} = ${n(p)} − ${M.frac(muS, "2")}, ${y} = ${n(q)} − ${M.frac(muS, "2")} with ${x} + ${y} = ${n(s)} gives ${n(p + q)} − ${muS} = ${n(s)}, ${muS} = ${n(mu)} ≥ 0. Then ${x}* = ${n(xs)}, ${y}* = ${n(ys)}.`
                : `The constraint is slack, so ${muS} = 0 and the unconstrained minimum ${tup(p, q)} is the answer.`,
            ],
            answer: { kind: "numbers", values: [xs.value, ys.value, mu], ordered: true }, answerText: `${x}* = ${n(xs)}, ${y}* = ${n(ys)}, ${muS} = ${n(mu)}`, answerInput: `${typed(xs)}, ${typed(ys)}, ${mu}`,
            vals: { pq: p + q, mu, xs: fv(xs), ys: fv(ys) }, params: { p, q, s },
          };
        }
      }
      // level 3: two inequality constraints, found by trying active sets
      for (;;) {
        const p = r.int(-6, 4), q = r.int(1, 9), s = r.int(2, 8);
        const m1 = M.sub(muS, 1), m2 = M.sub(muS, 2);
        const tries = [];
        // none active
        const feas0 = p + q < s && p > 0;
        tries.push({ ok: feas0, txt: `No constraint active (${m1} = ${m2} = 0): (${x}, ${y}) = ${tup(p, q)}, ${feas0 ? "feasible: done." : `infeasible (${p + q >= s ? `${x} + ${y} = ${n(p + q)} &gt; ${n(s)}` : `${x} = ${n(p)} &lt; 0`}).`}`, mu: [0, 0], pt: [F(p), F(q)] });
        // g1 active only
        const a1 = p + q - s, x1 = F(2 * p - a1, 2), y1 = F(2 * q - a1, 2), ok1 = a1 > 0 && x1.n > 0;
        tries.push({ ok: ok1, txt: `Only ${M.sub(V("g"), 1)} active (${m2} = 0): ${x} = ${n(p)} − ${M.frac(m1, "2")}, ${y} = ${n(q)} − ${M.frac(m1, "2")} on ${x} + ${y} = ${n(s)} gives ${m1} = ${n(p + q)} − ${n(s)} = ${n(a1)}, point ${tup(x1, y1)}${ok1 ? `: ${m1} &gt; 0 and ${x} &gt; 0, so every condition holds.` : `: rejected, ${a1 <= 0 ? `${m1} = ${n(a1)} is not positive` : `${x} = ${n(x1)} &lt; 0 breaks ${x} ≥ 0`}.`}`, mu: [a1, 0], pt: [x1, y1] });
        // g2 active only
        const a2 = -2 * p, ok2 = a2 > 0 && q < s;
        tries.push({ ok: ok2, txt: `Only ${M.sub(V("g"), 2)} active (${x} = 0, ${m1} = 0): the ${y}-equation gives ${y} = ${n(q)}, and the ${x}-equation 2(0 − ${np(p)}) − ${m2} = 0 gives ${m2} = ${n(a2)}${ok2 ? `: ${m2} &gt; 0 and ${x} + ${y} = ${n(q)} &lt; ${n(s)}, so every condition holds.` : `: rejected, ${a2 <= 0 ? `${m2} = ${n(a2)} is not positive` : `${x} + ${y} = ${n(q)} &gt; ${n(s)}`}.`}`, mu: [0, a2], pt: [F(0), F(q)] });
        // both active
        const b1 = 2 * (q - s), b2 = b1 - 2 * p, ok3 = b1 > 0 && b2 > 0;
        tries.push({ ok: ok3, txt: `Both active: (${x}, ${y}) = (0, ${n(s)}); the ${y}-equation 2(${n(s)} − ${n(q)}) + ${m1} = 0 gives ${m1} = ${n(b1)}, and the ${x}-equation 2(0 − ${np(p)}) + ${m1} − ${m2} = 0 gives ${m2} = ${n(b2)}${ok3 ? ": both positive, so every condition holds." : ": rejected, a multiplier is not positive."}`, mu: [b1, b2], pt: [F(0), F(s)] });
        const win = tries.findIndex((t) => t.ok);
        if (win <= 0 || tries.filter((t) => t.ok).length !== 1 || p + q === s || q === s || p === 0) continue;
        const ans = tries[win].mu;
        return {
          prompt: `Minimize ${M.sup(`(${M.poly([1, -p])})`, 2)} + ${M.sup(`(${M.poly([1, -q], "y")})`, 2)} subject to ${M.sub(V("g"), 1)}: ${x} + ${y} ≤ ${n(s)} and ${M.sub(V("g"), 2)}: ${x} ≥ 0. Find the KKT multipliers ${m1}, ${m2}, in that order.`,
          steps: [
            `Standard form: ${x} + ${y} − ${n(s)} ≤ 0 and −${x} ≤ 0. Stationarity of ${V("f")} + ${m1}(${x} + ${y} − ${n(s)}) + ${m2}(−${x}): 2(${M.poly([1, -p])}) + ${m1} − ${m2} = 0 and 2(${y} − ${n(q)}) + ${m1} = 0. Try active sets until one gives a feasible point with non-negative multipliers.`,
            ...tries.slice(0, win + 1).map((t) => t.txt),
            `The problem is convex, so this KKT point ${tup(...tries[win].pt)} is the global minimum, with ${m1} = ${n(ans[0])}, ${m2} = ${n(ans[1])}.`,
          ],
          answer: { kind: "numbers", values: ans, ordered: true }, answerText: `${m1} = ${n(ans[0])}, ${m2} = ${n(ans[1])}`, answerInput: `${ans[0]}, ${ans[1]}`,
          vals: { pq: p + q, a1, x1: fv(x1), y1: fv(y1), a2, b1, b2, ans }, params: { p, q, s },
        };
      }
    },
  };

  // ---- O.lagrange-duality --------------------------------------------------------------------------------------
  D["O.lagrange-duality"] = {
    title: "The Lagrangian dual",
    generate(r, level) {
      if (level <= 2) {
        const a = r.int(1, 3), b = r.int(1, 5), mu0 = r.int(1, 12), q0 = F(mu0 * b).sub(F(mu0 * mu0, 4 * a)), pstar = a * b * b, mus = 2 * a * b;
        const fx = a === 1 ? M.sup(x, 2) : `${n(a)}${M.sup(x, 2)}`;
        const common = [
          `Write the constraint as ${n(b)} − ${x} ≤ 0 and form ${V("L")}(${x}, ${muS}) = ${fx} + ${muS}(${n(b)} − ${x}), with ${muS} ≥ 0.`,
          `Minimize over ${x}: ${n(2 * a)}${x} − ${muS} = 0 gives ${x} = ${M.frac(muS, n(2 * a))}, so ${V("q")}(${muS}) = ${M.term(b, muS, { first: true })} − ${M.frac(M.sup(muS, 2), n(4 * a))}, a concave parabola.`,
        ];
        if (level === 1) {
          return {
            prompt: `For the problem: minimize ${fx} subject to ${x} ≥ ${n(b)}, evaluate the dual ${V("q")}(${muS}) = min over ${x} of ${V("L")}(${x}, ${muS}) at ${muS} = ${n(mu0)}. What lower bound on the optimum does it give?`,
            steps: [...common,
              `${V("q")}(${n(mu0)}) = ${n(b)} · ${n(mu0)} − ${M.frac(M.sup(n(mu0), 2), n(4 * a))} = ${dc(q0)}.`,
              `Weak duality: the optimal value is at least ${dc(q0)}. (The true optimum is ${n(pstar)}, at ${x} = ${n(b)}.)`],
            answer: { kind: "number", value: q0.value }, answerText: dc(q0), answerInput: typed(q0),
            vals: { a2: 2 * a, a4: 4 * a, q0: fv(q0), pstar, mb: mu0 * b }, params: { a, b, mu0 },
          };
        }
        return {
          prompt: `For the problem: minimize ${fx} subject to ${x} ≥ ${n(b)}, solve the dual problem: maximize ${V("q")}(${muS}) over ${muS} ≥ 0. Give ${muS}* and the dual optimum ${V("d")}*, in that order.`,
          steps: [...common,
            `${V("q")}′(${muS}) = ${n(b)} − ${M.frac(muS, n(2 * a))} = 0 gives ${muS}* = ${n(mus)} ≥ 0, and ${V("d")}* = ${V("q")}(${n(mus)}) = ${n(b)} · ${n(mus)} − ${M.frac(M.sup(n(mus), 2), n(4 * a))} = ${n(pstar)}.`,
            `The primal optimum is at ${x} = ${n(b)}, with value ${n(pstar)}. The duality gap is 0 (a convex problem with a strictly feasible point, so Slater's condition holds), and ${x} = ${M.frac(n(mus), n(2 * a))} = ${n(b)} recovers the primal solution.`],
          answer: { kind: "numbers", values: [mus, pstar], ordered: true }, answerText: `${muS}* = ${n(mus)}, ${V("d")}* = ${n(pstar)}`, answerInput: `${mus}, ${pstar}`,
          vals: { a2: 2 * a, a4: 4 * a, mus, pstar, mb: mus * b, ms2: mus * mus }, params: { a, b },
        };
      }
      // level 3: distance from the origin to a half-plane through the dual
      const al = r.nonzero(-4, 4), be = r.nonzero(-4, 4), c = r.int(1, 10), nn = al * al + be * be;
      const mus = F(2 * c, nn), ds = F(c * c, nn), xs = F(c * al, nn), ys = F(c * be, nn);
      return {
        prompt: `Minimize ${M.sup(x, 2)} + ${M.sup(y, 2)} subject to ${lin([[al, x], [be, y]])} ≥ ${n(c)}, by solving the Lagrangian dual. Find the dual optimum ${V("d")}*.`,
        steps: [
          `${V("L")} = ${M.sup(x, 2)} + ${M.sup(y, 2)} + ${muS}(${n(c)} − ${lin([[al, x], [be, y]])}), ${muS} ≥ 0. Minimizing over ${x}, ${y}: ${x} = ${M.term(F(al, 2), muS, { first: true })}, ${y} = ${M.term(F(be, 2), muS, { first: true })}.`,
          `Substitute: ${V("q")}(${muS}) = ${n(c)}${muS} − ${M.frac(`(${M.sup(np(al), 2)} + ${M.sup(np(be), 2)})${M.sup(muS, 2)}`, "4")} = ${n(c)}${muS}${M.term(F(-nn, 4), M.sup(muS, 2))}.`,
          `${V("q")}′ = ${n(c)}${M.term(F(-nn, 2), muS)} = 0 gives ${muS}* = ${n(mus)}, so ${V("d")}* = ${V("q")}(${muS}*) = ${n(c)} · ${n(mus)} − ${n(F(nn, 4))} · ${M.sup(`(${n(mus)})`, 2)} = ${n(ds)}.`,
          `Slater holds (points far enough along (${n(al)}, ${n(be)}) are strictly feasible), so ${V("d")}* = ${V("p")}*: the closest feasible point is ${tup(xs, ys)}, with ${M.sup(x, 2)} + ${M.sup(y, 2)} = ${n(ds)}.`,
        ],
        answer: { kind: "number", value: ds.value }, answerText: n(ds), answerInput: typed(ds),
        vals: { nn, n4: fv(F(nn, 4)), n2: fv(F(nn, 2)), mus: fv(mus), ds: fv(ds), xs: fv(xs), ys: fv(ys) }, params: { al, be, c }, consts: [4],
      };
    },
  };

  // ---- O.penalty-barrier ------------------------------------------------------------------------------------------
  D["O.penalty-barrier"] = {
    title: "Projection, barrier and penalty methods",
    generate(r, level) {
      if (level === 1) {
        // one projected-gradient step on a box
        for (;;) {
          const u = r.int(3, 6), p = r.int(-3, 9), q = r.int(-3, 9), x0 = r.int(0, u), y0 = r.int(0, u), eta = F(1, 4);
          const z = [F(x0).sub(eta.mul(2 * (x0 - p))), F(y0).sub(eta.mul(2 * (y0 - q)))];
          const clip = (v) => (v.cmp(0) < 0 ? F(0) : v.cmp(u) > 0 ? F(u) : v);
          const xn = z.map(clip);
          if (xn[0].eq(z[0]) && xn[1].eq(z[1])) continue;
          if (x0 === p && y0 === q) continue;
          return {
            prompt: `Projected gradient descent minimizes ${M.sup(`(${M.poly([1, -p])})`, 2)} + ${M.sup(`(${M.poly([1, -q], "y")})`, 2)} over the box 0 ≤ ${x}, ${y} ≤ ${n(u)}. From ${tup(x0, y0)} with ${V("η")} = ${dc(eta)}, take one step. Give the new point.`,
            graph: graph({ view: [-4, 10, -4, 10], equal: true, items: [{ t: "poly", p: [[0, 0], [u, 0], [u, u], [0, u]], role: "muted" }, { t: "pt", x: x0, y: y0, label: "start" }, { t: "pt", x: p, y: q, role: "secondary" }] }),
            steps: [
              `Gradient: (2(${x} − ${np(p)}), 2(${y} − ${np(q)})) = ${tup(2 * (x0 - p), 2 * (y0 - q))} at ${tup(x0, y0)}.`,
              `Plain step: ${tup(x0, y0)} − ${dc(eta)} · ${tup(2 * (x0 - p), 2 * (y0 - q))} = ${tupd(...z)}.`,
              `Project onto the box by clipping each coordinate to [0, ${n(u)}]: ${tupd(...xn)}.`,
            ],
            answer: { kind: "point", value: xn.map((v) => v.value) }, answerText: tupd(...xn), answerInput: `(${typed(xn[0])}, ${typed(xn[1])})`,
            vals: { gx: 2 * (x0 - p), gy: 2 * (y0 - q), z: z.map(fv), xn: xn.map(fv) }, params: { u, p, q, x0, y0, eta: fv(eta) },
          };
        }
      }
      if (level === 2) {
        const c = r.int(1, 5), b = r.nonzero(-3, 6), mu = r.pick([F(1), F(1, 2), F(1, 10), F(1, 100)]);
        const xm = F(b).add(mu.div(c)), gap = xm.mul(c).sub(c * b);
        return {
          prompt: `A log-barrier method solves: minimize ${n(c)}${x} subject to ${x} ≥ ${n(b)}, by minimizing ${M.eq(`${V("B")}(${x}) = ${n(c)}${x} − ${muS} ln(${M.poly([1, -b])}).`)} Find the barrier minimizer ${x}(${muS}) for ${muS} = ${dc(mu)}.`,
          steps: [
            `${V("B")}′(${x}) = ${n(c)} − ${M.frac(muS, M.poly([1, -b]))} = 0 gives ${x} − ${np(b)} = ${M.frac(muS, n(c))}, so ${x}(${muS}) = ${n(b)} + ${M.frac(muS, n(c))}. (${V("B")}″ &gt; 0, so it is a minimum, strictly inside the feasible set.)`,
            `${x}(${dc(mu)}) = ${n(b)} + ${M.frac(dc(mu), n(c))} = ${dc(xm)}.`,
            `Its objective exceeds the true optimum ${n(c * b)} by ${n(c)} · ${dcp(xm)} − ${np(c * b)} = ${dc(gap)} = ${muS} (the central-path bound ${V("m")}${muS} with ${V("m")} = 1 constraint). Shrinking ${muS} drives ${x}(${muS}) to ${n(b)}.`,
          ],
          answer: { kind: "number", value: xm.value }, answerText: dc(xm), answerInput: typed(xm),
          vals: { xm: fv(xm), gap: fv(gap), cb: c * b }, params: { c, b, mu: fv(mu) },
        };
      }
      // level 3: a quadratic penalty strong enough for a tolerance
      for (;;) {
        const a = r.int(-3, 4), b = a + r.int(1, 4), eps = r.pick([F(1, 10), F(1, 20), F(1, 5), F(1, 2), F(1, 100)]);
        const rho = F(2 * (b - a)).div(eps).sub(2);
        if (rho.cmp(0) <= 0 || !rho.isInt()) continue;
        const xr = F(2 * a).add(rho.mul(b)).div(rho.add(2)), viol = F(b).sub(xr);
        return {
          prompt: `A quadratic penalty method solves: minimize ${M.sup(`(${M.poly([1, -a])})`, 2)} subject to ${x} ≥ ${n(b)}, by minimizing ${M.eq(`${M.sup(`(${M.poly([1, -a])})`, 2)} + ${M.frac(V("ρ"), "2")}${M.sup(`max(0, ${n(b)} − ${x})`, 2)}.`)} What is the smallest ${V("ρ")} for which the penalized minimizer violates the constraint by at most ${dc(eps)}?`,
          steps: [
            `The unconstrained minimum ${x} = ${n(a)} is infeasible, so the penalized minimizer lies below ${n(b)}, where the penalty is active: 2(${x} − ${np(a)}) − ${V("ρ")}(${n(b)} − ${x}) = 0, so ${x}(${V("ρ")}) = ${M.frac(`${n(2 * a)} + ${n(b)}${V("ρ")}`, `2 + ${V("ρ")}`)}.`,
            `Violation: ${n(b)} − ${x}(${V("ρ")}) = ${M.frac(`2(${n(b)} − ${np(a)})`, `2 + ${V("ρ")}`)} = ${M.frac(n(2 * (b - a)), `2 + ${V("ρ")}`)}. It shrinks only like 1/${V("ρ")}: penalties approach from outside and are exact only as ${V("ρ")} → ∞.`,
            `${M.frac(n(2 * (b - a)), `2 + ${V("ρ")}`)} ≤ ${dc(eps)} ⟺ 2 + ${V("ρ")} ≥ ${M.frac(n(2 * (b - a)), dc(eps))} = ${n(rho.add(2))} ⟺ ${V("ρ")} ≥ ${n(rho)}.`,
            `Check: ${x}(${n(rho)}) = ${M.frac(`${n(2 * a)} + ${n(b)} · ${n(rho)}`, n(rho.add(2)))} = ${dc(xr)}, violating ${x} ≥ ${n(b)} by ${dc(viol)}.`,
          ],
          answer: { kind: "number", value: rho.value }, answerText: `${V("ρ")} = ${n(rho)}`, answerInput: typed(rho),
          vals: { a2: 2 * a, ba2: 2 * (b - a), rho2: fv(rho.add(2)), rho: fv(rho), xr: fv(xr), viol: fv(viol) }, params: { a, b, eps: fv(eps) },
        };
      }
    },
  };

  // ---- O.12 Dynamic programming --------------------------------------------------------------------------------------
  const GAMMAS = [F(1, 2), F(3, 4), F(4, 5), F(9, 10), F(19, 20)];
  D["O.12"] = {
    title: "Dynamic programming and the Bellman equation",
    generate(r, level) {
      if (level === 1) {
        const rw = r.int(1, 20), g = r.pick(GAMMAS), V0 = F(rw).div(F(1).sub(g));
        return {
          prompt: `A machine earns ${money(rw)} every period forever, and future earnings are discounted by ${V("γ")} = ${dc(g)} per period. What is the discounted value ${V("V")} = Σ ${M.sup(V("γ"), V("t"))}${V("r")} of the stream, starting now, in dollars?`,
          steps: [
            `A constant reward gives a geometric series: ${V("r")} + ${V("γ")}${V("r")} + ${M.sup(V("γ"), 2)}${V("r")} + … = ${M.frac(V("r"), `1 − ${V("γ")}`)}, finite because ${V("γ")} &lt; 1.`,
            `${M.frac(n(rw), `1 − ${dc(g)}`)} = ${M.frac(n(rw), dc(F(1).sub(g)))} = ${dc(V0)}.`,
            `It also satisfies the Bellman equation ${V("V")} = ${V("r")} + ${V("γ")}${V("V")}: ${n(rw)} + ${dc(g)} · ${dc(V0)} = ${dc(V0)}.`,
          ],
          answer: { kind: "number", value: V0.value }, answerText: money(V0), answerInput: typed(V0),
          vals: { om: fv(F(1).sub(g)), V0: fv(V0), gV: fv(g.mul(V0)) }, params: { rw, g: fv(g) },
        };
      }
      if (level === 2) {
        // backward recursion on a staged network
        for (;;) {
          const cA = [r.int(1, 9), r.int(1, 9)], cBC = [[r.int(1, 9), r.int(1, 9)], [r.int(1, 9), r.int(1, 9)]], cZ = [r.int(1, 9), r.int(1, 9)];
          const VC = cZ.slice();
          const VB = [0, 1].map((i) => Math.min(cBC[i][0] + VC[0], cBC[i][1] + VC[1]));
          const VA = Math.min(cA[0] + VB[0], cA[1] + VB[1]);
          const ties = [0, 1].some((i) => cBC[i][0] + VC[0] === cBC[i][1] + VC[1]) || cA[0] + VB[0] === cA[1] + VB[1];
          if (ties) continue;
          const bi = cA[0] + VB[0] < cA[1] + VB[1] ? 0 : 1, ci = cBC[bi][0] + VC[0] < cBC[bi][1] + VC[1] ? 0 : 1;
          const greedy = (() => { const b = cA[0] < cA[1] ? 0 : 1; const c = cBC[b][0] < cBC[b][1] ? 0 : 1; return cA[b] + cBC[b][c] + cZ[c]; })();
          const Pn = { A: [0, 2], B1: [3, 4], B2: [3, 0], C1: [6, 4], C2: [6, 0], Z: [9, 2] };
          const E = [["A", "B1", cA[0]], ["A", "B2", cA[1]], ["B1", "C1", cBC[0][0]], ["B1", "C2", cBC[0][1]], ["B2", "C1", cBC[1][0]], ["B2", "C2", cBC[1][1]], ["C1", "Z", cZ[0]], ["C2", "Z", cZ[1]]];
          const items = [...E.map(([u, v]) => ({ t: "seg", a: Pn[u], b: Pn[v], role: "secondary" })),
            ...E.map(([u, v, w]) => ({ t: "text", x: Pn[u][0] + 0.3 * (Pn[v][0] - Pn[u][0]), y: Pn[u][1] + 0.3 * (Pn[v][1] - Pn[u][1]) + 0.35, s: String(w) })),
            ...Object.entries(Pn).map(([k, p]) => ({ t: "pt", x: p[0], y: p[1], label: k }))];
          const B = ["B1", "B2"], C = ["C1", "C2"];
          return {
            prompt: `A shipment goes from A to Z through one of B1, B2 and then one of C1, C2. The numbers on the links are costs in hundreds of dollars. Use backward recursion to find the cheapest total cost, in hundreds of dollars.`,
            graph: graph({ view: [-1, 10, -1, 5], axes: false, grid: false, equal: true, items }),
            steps: [
              `Work backward from ${V("V")}(Z) = 0. Last stage: ${V("V")}(C1) = ${n(cZ[0])}, ${V("V")}(C2) = ${n(cZ[1])}.`,
              ...[0, 1].map((i) => `${V("V")}(${B[i]}) = min(${n(cBC[i][0])} + ${n(VC[0])}, ${n(cBC[i][1])} + ${n(VC[1])}) = min(${n(cBC[i][0] + VC[0])}, ${n(cBC[i][1] + VC[1])}) = ${n(VB[i])}.`),
              `${V("V")}(A) = min(${n(cA[0])} + ${n(VB[0])}, ${n(cA[1])} + ${n(VB[1])}) = min(${n(cA[0] + VB[0])}, ${n(cA[1] + VB[1])}) = ${n(VA)}.`,
              `Optimal route: A → ${B[bi]} → ${C[ci]} → Z, cost ${n(VA)}.${greedy !== VA ? ` (Choosing the cheapest link at each step would cost ${n(greedy)}: greedy is not optimal here.)` : ""}`,
            ],
            answer: { kind: "number", value: VA }, answerText: n(VA), answerInput: String(VA),
            vals: { VB, VA, sB: [0, 1].map((i) => [cBC[i][0] + VC[0], cBC[i][1] + VC[1]]), sA: [cA[0] + VB[0], cA[1] + VB[1]], greedy }, params: { cA, cBC, cZ },
          };
        }
      }
      // level 3: one Bellman backup with uncertain transitions
      for (;;) {
        const g = r.pick([F(9, 10), F(4, 5), F(1, 2)]), V0 = [r.int(0, 40), r.int(0, 40)], rw = [r.int(-5, 10), r.int(-5, 10)];
        const pr = [F(r.int(1, 9), 10), F(r.int(1, 9), 10)];   // probability of ending in Good under each action
        const Q = [0, 1].map((k) => F(rw[k]).add(g.mul(pr[k].mul(V0[0]).add(F(1).sub(pr[k]).mul(V0[1])))));
        if (Q[0].eq(Q[1]) || V0[0] <= V0[1]) continue;
        const best = Q[0].cmp(Q[1]) > 0 ? 0 : 1, Vn = Q[best];
        const acts = ["keep running", "do maintenance"];
        const exp = (k) => pr[k].mul(V0[0]).add(F(1).sub(pr[k]).mul(V0[1]));
        return {
          prompt: `A machine in the Worn state can ${acts[0]} (reward ${n(rw[0])}; next period it is Good with probability ${dc(pr[0])}, else Worn) or ${acts[1]} (reward ${n(rw[1])}; Good with probability ${dc(pr[1])}). Current value estimates are ${V("V")}(Good) = ${n(V0[0])} and ${V("V")}(Worn) = ${n(V0[1])}, with discount ${V("γ")} = ${dc(g)}. Do one Bellman backup: what is the new ${V("V")}(Worn)?`,
          steps: [
            `${V("V")}(${V("s")}) = max over ${V("a")} of [${V("r")}(${V("s")}, ${V("a")}) + ${V("γ")} Σ ${V("P")}(${V("s")}′ | ${V("s")}, ${V("a")}) ${V("V")}(${V("s")}′)].`,
            ...[0, 1].map((k) => `${acts[k][0].toUpperCase() + acts[k].slice(1)}: ${n(rw[k])} + ${dc(g)} · (${dc(pr[k])} · ${n(V0[0])} + ${dc(F(1).sub(pr[k]))} · ${n(V0[1])}) = ${n(rw[k])} + ${dc(g)} · ${dc(exp(k))} = ${dc(Q[k])}.`),
            `The better action is to ${acts[best]}, so the new ${V("V")}(Worn) = ${dc(Vn)}.`,
          ],
          answer: { kind: "number", value: Vn.value }, answerText: dc(Vn), answerInput: typed(Vn),
          vals: { Q: Q.map(fv), q1: fv(F(1).sub(pr[0])), q2: fv(F(1).sub(pr[1])), e: [0, 1].map((k) => fv(exp(k))) }, params: { g: fv(g), V0, rw, pr: pr.map(fv) },
        };
      }
    },
  };

  // ---- O.13 Simulated annealing ------------------------------------------------------------------------------------
  D["O.13"] = {
    title: "Simulated annealing acceptance and cooling",
    generate(r, level) {
      if (level === 1) {
        const dl = r.int(1, 10), T = r.pick([1, 2, 4, 5, 10, 20]), ratio = dl / T, pa = Math.exp(-ratio);
        if (pa < 0.02) return D["O.13"].generate(r, level);
        return {
          prompt: `Simulated annealing (minimizing) proposes a move that makes the cost worse by Δ = ${n(dl)} at temperature ${V("T")} = ${n(T)}. With what probability is it accepted? Round to 3 decimal places.`,
          steps: [
            `A worse move (Δ &gt; 0) is accepted with probability ${M.sup(V("e"), `−Δ/${V("T")}`)}; an improvement would always be accepted.`,
            `Δ/${V("T")} = ${n(dl)} ÷ ${n(T)} = ${n(ratio)}, so ${M.sup(V("e"), `−${n(ratio)}`)} ≈ ${M.n(pa, { dp: 3 })}.`,
          ],
          answer: { kind: "number", value: pa, dp: 3 }, answerText: M.n(pa, { dp: 3 }), answerInput: M.n(pa, { dp: 3 }),
          vals: { ratio, pa }, params: { dl, T }, consts: [3],
        };
      }
      if (level === 2) {
        for (;;) {
          const fc = r.int(20, 60), fnw = fc + r.int(-5, 12), T = r.pick([2, 4, 5, 8, 10]), U = r.int(1, 99) / 100;
          const dl = fnw - fc;
          if (dl === 0) continue;
          const pa = dl < 0 ? 1 : Math.exp(-dl / T);
          if (Math.abs(pa - U) < 0.02) continue;
          const acc = dl < 0 || U < pa, options = ["Accept the move", "Reject the move"], idx = acc ? 0 : 1;
          return {
            prompt: `Simulated annealing is minimizing a schedule's cost. The current schedule costs ${n(fc)}; a random swap gives a schedule costing ${n(fnw)}. The temperature is ${V("T")} = ${n(T)} and the uniform random number drawn is ${V("U")} = ${n(U)}. Accept or reject?`,
            steps: dl < 0 ? [
              `Δ = ${n(fnw)} − ${n(fc)} = ${n(dl)} &lt; 0: the move improves the cost, so it is always accepted (the random number does not matter).`,
            ] : [
              `Δ = ${n(fnw)} − ${n(fc)} = ${n(dl)} &gt; 0: a worse move, accepted with probability ${M.sup(V("e"), `−Δ/${V("T")}`)} = ${M.sup(V("e"), `−${n(dl / T)}`)} ≈ ${M.n(pa, { dp: 3 })}.`,
              `Accept if ${V("U")} &lt; ${M.n(pa, { dp: 3 })}: ${n(U)} ${acc ? "&lt;" : "≥"} ${M.n(pa, { dp: 3 })}, so ${acc ? "accept (the search climbs uphill, which lets it escape local minima)" : "reject and keep the current schedule"}.`,
            ],
            answer: { kind: "choice", options, index: idx }, answerText: options[idx],
            vals: { dl, ratio: dl / T, pa }, params: { fc, fnw, T, U },
          };
        }
      }
      // level 3: geometric cooling, then acceptance
      for (;;) {
        const T0 = r.pick([10, 20, 50, 100]), al = r.pick([0.5, 0.8, 0.9]), k = r.int(2, 4), dl = r.int(1, 20);
        const Tk = P.round(T0 * Math.pow(al, k), 8), ratio = dl / Tk, pa = Math.exp(-ratio), p0 = Math.exp(-dl / T0);
        if (pa < 0.005 || pa > 0.98 || !Number.isInteger(P.round(Tk * 10000, 6))) continue;
        const exact = Number.isInteger(P.round(ratio * 10000, 6));
        if (!exact && Number.isInteger(P.round(ratio * 100000, 6))) continue;   // a 5th-decimal 5 rounds differently in JS and Python
        return {
          prompt: `Simulated annealing starts at ${M.sub(V("T"), 0)} = ${n(T0)} and cools geometrically, ${M.sub(V("T"), V("k"))} = ${M.sub(V("T"), 0)}${M.sup(V("α"), V("k"))} with ${V("α")} = ${n(al)}. After ${n(k)} coolings, with what probability is a move that worsens the cost by Δ = ${n(dl)} accepted? Round to 3 decimal places.`,
          steps: [
            `${M.sub(V("T"), k)} = ${n(T0)} · ${M.sup(n(al), k)} = ${n(Tk)}.`,
            `Δ/${V("T")} = ${n(dl)} ÷ ${n(Tk)} ${exact ? "=" : "≈"} ${n(ratio)}, so the acceptance probability is ${M.sup(V("e"), `−Δ/${V("T")}`)} ≈ ${M.n(pa, { dp: 3 })}.`,
            `At the start it was ${M.sup(V("e"), `−${n(dl)}/${n(T0)}`)} ≈ ${M.n(p0, { dp: 3 })}: cooling makes uphill moves rarer, turning the search from exploration into descent.`,
          ],
          answer: { kind: "number", value: pa, dp: 3 }, answerText: M.n(pa, { dp: 3 }), answerInput: M.n(pa, { dp: 3 }),
          vals: { Tk, ratio, pa, p0 }, params: { T0, al, k, dl }, consts: [3],
        };
      }
    },
  };

  // ---- O.local-search -------------------------------------------------------------------------------------------
  const vec01 = (b) => `(${b.join(", ")})`;
  D["O.local-search"] = {
    title: "Hill climbing, greedy construction and tabu search",
    generate(r, level) {
      if (level === 1) {
        for (;;) {
          const f = r.sample(range(30).map((i) => i + 1), 9), x0 = r.int(1, 9);
          const path = [x0], moves = [];
          let cur = x0;
          for (;;) {
            const nb = [cur - 1, cur + 1].filter((t) => t >= 1 && t <= 9);
            const best = nb.reduce((m, t) => (f[t - 1] > f[m - 1] ? t : m), nb[0]);
            moves.push({ cur, nb, best, up: f[best - 1] > f[cur - 1] });
            if (f[best - 1] <= f[cur - 1]) break;
            cur = best; path.push(cur);
          }
          const gmax = f.indexOf(Math.max(...f)) + 1;
          if (path.length < 3 || (cur === gmax && r.chance(0.6))) continue;
          return {
            prompt: `Hill climbing maximizes ${V("f")}(${x}) over the whole numbers 1 to 9. A move goes to the better of the two neighbors ${x} − 1 and ${x} + 1, and only if it improves ${V("f")}. ${M.table([x, ...range(9).map((i) => n(i + 1))], [[`${V("f")}(${x})`, ...f.map(n)]])} Starting at ${x} = ${n(x0)}, where does it stop?`,
            graph: graph({ view: [0, 10, 0, 32], items: [...range(8).map((i) => ({ t: "seg", a: [i + 1, f[i]], b: [i + 2, f[i + 1]], role: "muted" })), ...range(9).map((i) => ({ t: "pt", x: i + 1, y: f[i], role: i + 1 === x0 ? "highlight" : "primary" }))] }),
            steps: [
              ...moves.map((m) => `At ${x} = ${n(m.cur)} (${V("f")} = ${n(f[m.cur - 1])}): neighbors ${m.nb.map((t) => `${V("f")}(${n(t)}) = ${n(f[t - 1])}`).join(", ")}. ${m.up ? `Move to ${x} = ${n(m.best)}.` : "No neighbor is better: a local maximum, so stop."}`),
              `It stops at ${x} = ${n(cur)}.${cur !== gmax ? ` The global maximum is ${V("f")}(${n(gmax)}) = ${n(f[gmax - 1])}: hill climbing got stuck on a local peak.` : " Here that is also the global maximum."}`,
            ],
            answer: { kind: "number", value: cur }, answerText: `${x} = ${n(cur)}`, answerInput: String(cur),
            vals: { cur, gmax, path }, params: { f, x0 }, consts: range(10),
          };
        }
      }
      if (level === 2) {
        // greedy by value per kilogram, against the true optimum
        for (;;) {
          const w = range(4).map(() => r.int(1, 6)), v = range(4).map(() => r.int(2, 20)), W = r.int(5, 12);
          if (sum(w) <= W) continue;
          const rt = range(4).map((i) => F(v[i], w[i]));
          if (rt.some((q, i) => rt.some((t, j) => j > i && t.eq(q)))) continue;
          const order = range(4).sort((i, j) => rt[j].cmp(rt[i]));
          let room = W, val = 0;
          const log = [];
          for (const i of order) { const fit = w[i] <= room; log.push({ i, fit, room }); if (fit) { room -= w[i]; val += v[i]; } }
          let opt = 0;
          for (let m = 1; m < 16; m++) { const s = range(4).filter((i) => (m >> i) & 1); if (sum(s.map((i) => w[i])) <= W) opt = Math.max(opt, sum(s.map((i) => v[i]))); }
          if (val === opt && r.chance(0.6)) continue;
          return {
            prompt: `Build a greedy solution to this knapsack (capacity ${n(W)} kg, whole items only): sort by value per kg, then take each item that still fits. ${M.table(["Item", ...LET.slice(0, 4)], [["weight (kg)", ...w.map(n)], ["value", ...v.map(n)]])} What total value does greedy reach?`,
            steps: [
              `Value per kg: ${range(4).map((i) => `${LET[i]} ${M.frac(n(v[i]), n(w[i]))} ${rt[i].isInt() || terminates(rt[i]) ? "=" : "≈"} ${M.n(rt[i].value, { dp: 2 })}`).join(", ")}; order ${order.map((i) => LET[i]).join(", ")}.`,
              log.map((l) => `${LET[l.i]} (${n(w[l.i])} kg, room ${n(l.room)}): ${l.fit ? "take it" : "does not fit, skip"}`).join("; ") + ".",
              `Greedy value: ${n(val)}.${val < opt ? ` The best possible is ${n(opt)}: greedy construction gives a quick start, not a guarantee, which is why local search follows it.` : " Here greedy happens to be optimal."}`,
            ],
            answer: { kind: "number", value: val }, answerText: n(val), answerInput: String(val),
            vals: { val, opt, rooms: log.map((l) => l.room), rt: rt.map((q) => q.value) }, params: { w, v, W },
          };
        }
      }
      // level 3: three iterations of tabu search on 3-bit strings
      for (;;) {
        const fv8 = r.sample(range(40).map((i) => i + 1), 8);   // f of the string with index b0·4 + b1·2 + b2
        const idx = (b) => b[0] * 4 + b[1] * 2 + b[2], fb = (b) => fv8[idx(b)];
        const x0 = [r.int(0, 1), r.int(0, 1), r.int(0, 1)];
        const flip = (b, i) => b.map((t, j) => (j === i ? 1 - t : t));
        if (![0, 1, 2].every((i) => fb(flip(x0, i)) > fb(x0))) continue;   // a local minimum: plain descent would stop here
        let cur = x0, best = fb(x0);
        const tabuUntil = [0, 0, 0], its = [];
        for (let t = 1; t <= 3; t++) {
          const cands = [0, 1, 2].map((i) => { const y2 = flip(cur, i), val = fb(y2), tabu = tabuUntil[i] >= t; return { i, y2, val, tabu, ok: !tabu || val < best }; });
          const allowed = cands.filter((c) => c.ok);
          const pick = allowed.reduce((m, c) => (c.val < m.val ? c : m), allowed[0]);
          its.push({ t, cands, pick, best0: best });
          cur = pick.y2; best = Math.min(best, pick.val); tabuUntil[pick.i] = t + 2;
        }
        if (best >= fb(x0)) continue;
        const name = (b) => vec01(b);
        return {
          prompt: `Tabu search minimizes ${V("f")} over 3-bit strings; a move flips one bit. After a bit is flipped it is tabu (cannot be flipped back) for the next 2 iterations, unless the move would beat the best value found so far (aspiration). ${M.table(["string", ...range(8).map((k) => name([k >> 2 & 1, k >> 1 & 1, k & 1]))], [[V("f"), ...fv8.map(n)]])} Start at ${name(x0)}, a local minimum. Run 3 iterations, always taking the best allowed neighbor even if it is worse. What is the best value found?`,
          steps: [
            `At ${name(x0)}, ${V("f")} = ${n(fb(x0))}, and all three neighbors are worse, so plain descent would stop here.`,
            ...its.map((it) => `Iteration ${it.t}: ${it.cands.map((c) => `flip bit ${c.i + 1} → ${name(c.y2)}, ${V("f")} = ${n(c.val)}${c.tabu ? (c.ok ? " (tabu, but beats the best: allowed)" : " (tabu)") : ""}`).join("; ")}. Move to ${name(it.pick.y2)} (${V("f")} = ${n(it.pick.val)}).`),
            `The best value seen is ${n(best)}${best < fb(x0) ? `, better than the starting local minimum ${n(fb(x0))}: accepting worse moves while forbidding immediate reversals let the search escape` : ""}.`,
          ],
          answer: { kind: "number", value: best }, answerText: n(best), answerInput: String(best),
          vals: { f0: fb(x0), best, picks: its.map((it) => it.pick.val) }, params: { f: fv8, x0 }, consts: [3],
        };
      }
    },
  };

  // ---- O.genetic --------------------------------------------------------------------------------------------------
  D["O.genetic"] = {
    title: "Selection, crossover and particle swarms",
    generate(r, level) {
      if (level === 1) {
        const Fs = range(4).map(() => r.int(1, 20)), k = r.int(0, 3), tot = sum(Fs), pk = F(Fs[k], tot);
        return {
          prompt: `A genetic algorithm uses roulette-wheel (fitness-proportional) selection. Individuals A, B, C, D have fitness ${listAnd(Fs.map(n))}. What is the probability that one spin selects ${LET[k]}?`,
          steps: [
            `Each individual gets a slice of the wheel proportional to its fitness: ${M.sub(V("p"), V("i"))} = ${M.frac(M.sub(V("F"), V("i")), `Σ ${M.sub(V("F"), V("j"))}`)}.`,
            `Total fitness: ${Fs.map(n).join(" + ")} = ${n(tot)}.`,
            `${M.sub(V("p"), LET[k])} = ${M.frac(n(Fs[k]), n(tot))}${pk.d !== tot ? ` = ${n(pk)}` : ""}${terminates(pk) ? ` = ${dc(pk)}` : ` ≈ ${M.n(pk.value, { dp: 3 })}`}.`,
          ],
          answer: { kind: "number", value: pk.value }, answerText: n(pk), answerInput: typed(pk),
          vals: { tot, pk: fv(pk) }, params: { Fs, k },
        };
      }
      if (level === 2) {
        for (;;) {
          const L = 8, a = range(L).map(() => r.int(0, 1)), b = range(L).map(() => r.int(0, 1)), c = r.int(2, 6);
          const c1 = [...a.slice(0, c), ...b.slice(c)], c2 = [...b.slice(0, c), ...a.slice(c)];
          const o1 = sum(c1), o2 = sum(c2);
          if (o1 === o2 || a.every((t, i) => t === b[i])) continue;
          return {
            prompt: `One-point crossover with the cut after bit ${n(c)} is applied to the parents ${M.eq(`${V("a")} = ${bits(a)}    ${V("b")} = ${bits(b)}`)} Fitness is the number of 1s (OneMax). Give the fitness of the first child (head of ${V("a")}, tail of ${V("b")}) and then of the second child.`,
            steps: [
              `Child 1 keeps ${V("a")}'s first ${n(c)} bits and takes ${V("b")}'s tail: ${bits(c1)}.`,
              `Child 2 keeps ${V("b")}'s first ${n(c)} bits and takes ${V("a")}'s tail: ${bits(c2)}.`,
              `Count the 1s: child 1 has ${n(o1)}, child 2 has ${n(o2)} (the parents had ${n(sum(a))} and ${n(sum(b))}). Crossover recombines building blocks; selection then keeps the fitter child.`,
            ],
            answer: { kind: "numbers", values: [o1, o2], ordered: true }, answerText: `${n(o1)}, ${n(o2)}`, answerInput: `${o1}, ${o2}`,
            vals: { o1, o2, sa: sum(a), sb: sum(b) }, params: { a, b, c },
          };
        }
      }
      // level 3: one particle-swarm update in two dimensions
      for (;;) {
        const w = r.pick([F(1, 2), F(7, 10)]), c1 = r.pick([F(1), F(2), F(3, 2)]), c2 = c1;
        const rr = () => r.pick([F(1, 4), F(1, 2), F(3, 4), F(1, 5), F(2, 5), F(4, 5)]);
        const r1 = rr(), r2 = rr();
        const X0 = [r.int(-5, 5), r.int(-5, 5)], V0 = [r.int(-3, 3), r.int(-3, 3)], Pb = [r.int(-5, 5), r.int(-5, 5)], G = [r.int(-5, 5), r.int(-5, 5)];
        if ((Pb[0] === G[0] && Pb[1] === G[1]) || (Pb[0] === X0[0] && Pb[1] === X0[1])) continue;
        const vn = [0, 1].map((i) => w.mul(V0[i]).add(c1.mul(r1).mul(Pb[i] - X0[i])).add(c2.mul(r2).mul(G[i] - X0[i])));
        const xn = vn.map((v, i) => v.add(X0[i]));
        if (!xn.every(terminates)) continue;
        const k1 = c1.mul(r1), k2 = c2.mul(r2);
        const vs = (i) => `${dc(w)} · ${np(V0[i])} + ${dc(k1)} · ${np(Pb[i] - X0[i])} + ${dc(k2)} · ${np(G[i] - X0[i])} = ${dc(vn[i])}`;
        return {
          prompt: `A particle in a swarm sits at ${V("x")} = ${tup(...X0)} with velocity ${V("v")} = ${tup(...V0)}. Its own best point is ${V("p")} = ${tup(...Pb)} and the swarm's best is ${V("g")} = ${tup(...G)}. With ${V("ω")} = ${dc(w)}, ${M.sub(V("c"), 1)} = ${M.sub(V("c"), 2)} = ${dc(c1)} and random numbers ${M.sub(V("r"), 1)} = ${dc(r1)}, ${M.sub(V("r"), 2)} = ${dc(r2)}, apply ${M.eq(`${V("v")} ← ${V("ω")}${V("v")} + ${M.sub(V("c"), 1)}${M.sub(V("r"), 1)}(${V("p")} − ${V("x")}) + ${M.sub(V("c"), 2)}${M.sub(V("r"), 2)}(${V("g")} − ${V("x")}),  ${V("x")} ← ${V("x")} + ${V("v")}.`)} Give the new position.`,
          steps: [
            `${V("p")} − ${V("x")} = ${tup(Pb[0] - X0[0], Pb[1] - X0[1])}, ${V("g")} − ${V("x")} = ${tup(G[0] - X0[0], G[1] - X0[1])}; the weights are ${M.sub(V("c"), 1)}${M.sub(V("r"), 1)} = ${dc(k1)} and ${M.sub(V("c"), 2)}${M.sub(V("r"), 2)} = ${dc(k2)}.`,
            `First coordinate: ${vs(0)}. Second: ${vs(1)}. New velocity ${tupd(...vn)}.`,
            `New position: ${tup(...X0)} + ${tupd(...vn)} = ${tupd(...xn)}: pulled toward both its own best and the swarm's best, with some momentum.`,
          ],
          answer: { kind: "point", value: xn.map((q) => q.value) }, answerText: tupd(...xn), answerInput: `(${typed(xn[0])}, ${typed(xn[1])})`,
          vals: { d1: [Pb[0] - X0[0], Pb[1] - X0[1]], d2: [G[0] - X0[0], G[1] - X0[1]], k1: fv(k1), k2: fv(k2), vn: vn.map(fv), xn: xn.map(fv) }, params: { w: fv(w), c1: fv(c1), r1: fv(r1), r2: fv(r2), X0, V0, Pb, G },
        };
      }
    },
  };

  // ---- O.rng ---------------------------------------------------------------------------------------------------------
  const primeFactors = (m) => { const out = []; for (let p = 2, k = m; k > 1; p++) if (k % p === 0) { out.push(p); while (k % p === 0) k /= p; } return out; };
  D["O.rng"] = {
    title: "Linear congruential generators and Box–Muller",
    generate(r, level) {
      if (level === 1) {
        const m = r.pick([16, 32, 100, 31, 64]), a = r.int(2, 13), c = r.int(1, 15), X0 = r.int(0, m - 1);
        const X = [X0];
        for (let i = 0; i < 3; i++) X.push((a * X[i] + c) % m);
        const raw = X.slice(0, 3).map((t) => a * t + c);
        return {
          prompt: `A linear congruential generator ${M.sub(V("X"), `${V("n")}+1`)} = (${n(a)}${M.sub(V("X"), V("n"))} + ${n(c)}) mod ${n(m)} starts from the seed ${M.sub(V("X"), 0)} = ${n(X0)}. Give ${M.sub(V("X"), 1)}, ${M.sub(V("X"), 2)}, ${M.sub(V("X"), 3)}.`,
          steps: [
            ...[0, 1, 2].map((i) => `${M.sub(V("X"), i + 1)} = (${n(a)} · ${n(X[i])} + ${n(c)}) mod ${n(m)} = ${n(raw[i])} mod ${n(m)} = ${n(X[i + 1])}.`),
            `The uniforms are ${M.sub(V("U"), V("n"))} = ${M.sub(V("X"), V("n"))}/${n(m)}: ${X.slice(1).map((t) => dc(F(t, m))).join(", ")}.`,
          ],
          answer: { kind: "numbers", values: X.slice(1), ordered: true }, answerText: X.slice(1).map(n).join(", "), answerInput: X.slice(1).join(", "),
          vals: { X: X.slice(1), raw, U: X.slice(1).map((t) => fv(F(t, m))) }, params: { m, a, c, X0 }, consts: [3],
        };
      }
      if (level === 2) {
        // which multiplier gives the full period (Hull–Dobell)?
        for (;;) {
          const m = r.pick([16, 32, 64, 100, 36]), pf = primeFactors(m);
          let c;
          do c = r.int(1, m - 1); while (P.gcd(c, m) !== 1);
          const good = (a) => pf.every((p) => (a - 1) % p === 0) && (m % 4 !== 0 || (a - 1) % 4 === 0);
          const opts = r.sample(range(m - 2).map((i) => i + 2), 4);
          if (opts.filter(good).length !== 1) continue;
          const idx = opts.findIndex(good);
          const reason = (a) => {
            const badp = pf.find((p) => (a - 1) % p !== 0);
            if (badp) return `${n(a)} − 1 = ${n(a - 1)} is not divisible by the prime ${n(badp)} of ${n(m)}: fails`;
            if (m % 4 === 0 && (a - 1) % 4 !== 0) return `4 divides ${n(m)} but not ${n(a)} − 1 = ${n(a - 1)}: fails`;
            return `${n(a)} − 1 = ${n(a - 1)} is divisible by ${listAnd(pf.map(n))}${m % 4 === 0 ? " and by 4" : ""}: passes`;
          };
          const options = opts.map((a) => `${V("a")} = ${n(a)}`);
          return {
            prompt: `An LCG ${M.sub(V("X"), `${V("n")}+1`)} = (${V("a")}${M.sub(V("X"), V("n"))} + ${n(c)}) mod ${n(m)} should have full period ${n(m)}. Which multiplier achieves it?`,
            steps: [
              `Hull–Dobell: the period is ${n(m)} exactly when gcd(${V("c")}, ${V("m")}) = 1, every prime factor of ${V("m")} divides ${V("a")} − 1, and 4 divides ${V("a")} − 1 if 4 divides ${V("m")}. Here gcd(${n(c)}, ${n(m)}) = 1, and ${n(m)} has prime factor${pf.length > 1 ? "s" : ""} ${listAnd(pf.map(n))}.`,
              opts.map(reason).join("; ") + ".",
              `Only ${options[idx]} satisfies every condition.`,
            ],
            answer: { kind: "choice", options, index: idx }, answerText: options[idx],
            vals: { pf, am1: opts.map((a) => a - 1) }, params: { m, c, opts }, consts: [4],
          };
        }
      }
      // level 3: Box–Muller to a normal measurement
      const U1 = r.int(1, 9) / 10, U2 = r.pick([F(0), F(1, 6), F(1, 3), F(1, 2), F(2, 3), F(5, 6)]);
      const [mu, sg, what] = r.pick([[170, 8, "an adult's height (cm)"], [100, 15, "a test score"], [50, 4, "a machined part's length (mm)"], [20, 3, "a delivery time (minutes)"]]);
      const lnU = Math.log(U1), R = Math.sqrt(-2 * lnU), ang = U2.mul(2), cs = Math.round(Math.cos(2 * Math.PI * U2.value) * 2) / 2;
      const Z = R * cs, Xv = mu + sg * Z;
      const csTxt = { 1: "1", 0.5: M.frac("1", "2"), [-0.5]: `−${M.frac("1", "2")}`, [-1]: "−1" }[cs];
      return {
        prompt: `Simulate ${what}, modeled as normal with mean ${n(mu)} and standard deviation ${n(sg)} using Box–Muller, ${M.eq(`${V("Z")} = ${M.sqrt(`−2 ln ${M.sub(V("U"), 1)}`)} cos(2π${M.sub(V("U"), 2)}),  ${V("X")} = ${V("μ")} + ${V("σ")}${V("Z")},`)} with ${M.sub(V("U"), 1)} = ${n(U1)} and ${M.sub(V("U"), 2)} = ${n(U2)}. Round ${V("X")} to 2 decimal places.`,
        steps: [
          `ln ${n(U1)} ≈ ${M.n(lnU)}, so ${M.sqrt(`−2 ln ${M.sub(V("U"), 1)}`)} = ${M.sqrt(M.n(-2 * lnU))} ≈ ${M.n(R)}.`,
          `2π${M.sub(V("U"), 2)} = ${ang.isInt() ? (ang.n === 0 ? "0" : `${ang.n === 1 ? "" : n(ang.n)}π`) : `${M.frac(`${ang.n === 1 ? "" : n(ang.n)}π`, n(ang.d))}`}, whose cosine is ${csTxt}.`,
          `${V("Z")} ≈ ${M.n(R)} · ${csTxt === "1" ? "1" : `(${csTxt})`} ≈ ${M.n(Z)}, a standard normal draw.`,
          `${V("X")} = ${n(mu)} + ${n(sg)} · ${np(P.round(Z, 4))} ≈ ${M.n(Xv, { dp: 2 })}.`,
        ],
        answer: { kind: "number", value: Xv, dp: 2 }, answerText: M.n(Xv, { dp: 2 }), answerInput: String(P.round(Xv, 2)),
        vals: { lnU, m2ln: -2 * lnU, R, ang: fv(ang), cs, Z, Xv }, params: { U1, U2: fv(U2), mu, sg },
      };
    },
  };

  // ---- O.15 Random sampling ---------------------------------------------------------------------------------------------
  D["O.15"] = {
    title: "Inverse transform and rejection sampling",
    generate(r, level) {
      if (level === 1) {
        const U = r.int(1, 99) / 100;
        if (r.chance(0.5)) {
          const [lo, hi, what] = r.pick([[10, 30, "a delivery time, in minutes, uniform between 10 and 30"], [2, 6, "a repair time, in hours, uniform between 2 and 6"], [50, 150, "a daily demand, in units, uniform between 50 and 150"]]);
          const Xv = lo + (hi - lo) * U;
          return {
            prompt: `Simulate ${what}, from the uniform random number ${V("U")} = ${n(U)}.`,
            steps: [`Inverse transform for Uniform(${V("a")}, ${V("b")}): ${V("X")} = ${V("a")} + (${V("b")} − ${V("a")})${V("U")}.`, `${V("X")} = ${n(lo)} + (${n(hi)} − ${n(lo)}) · ${n(U)} = ${n(lo)} + ${n(hi - lo)} · ${n(U)} = ${n(Xv)}.`],
            answer: { kind: "number", value: Xv }, answerText: n(Xv), answerInput: String(P.round(Xv, 6)),
            vals: { span: hi - lo, Xv }, params: { lo, hi, U },
          };
        }
        const lam = r.pick([1, 2, 4, 5]), Xv = -Math.log(1 - U) / lam;
        return {
          prompt: `Times between arrivals are exponential with rate ${V("λ")} = ${n(lam)} per minute. Use the inverse transform with ${V("U")} = ${n(U)} to simulate one gap, in minutes. Round to 2 decimal places.`,
          steps: [
            `The CDF is ${V("F")}(${x}) = 1 − ${M.sup(V("e"), `−${V("λ")}${x}`)}. Solving ${V("u")} = ${V("F")}(${x}) gives ${V("X")} = −${M.frac(`ln(1 − ${V("U")})`, V("λ"))}.`,
            `ln(1 − ${n(U)}) = ln ${n(P.round(1 - U, 6))} ≈ ${M.n(Math.log(1 - U))}, so ${V("X")} ≈ ${M.frac(M.n(-Math.log(1 - U)), n(lam))} ≈ ${M.n(Xv, { dp: 2 })}.`,
          ],
          answer: { kind: "number", value: Xv, dp: 2 }, answerText: M.n(Xv, { dp: 2 }), answerInput: String(P.round(Xv, 2)),
          vals: { om: P.round(1 - U, 6), ln: Math.log(1 - U), Xv }, params: { lam, U },
        };
      }
      if (level === 2) {
        // discrete inverse transform
        for (;;) {
          const k = 5, cuts = r.sample(range(19).map((i) => (i + 1) * 5), k - 1).sort((a, b) => a - b);
          const cum = [...cuts, 100], pm = cum.map((c, i) => c - (i ? cum[i - 1] : 0));
          const U = r.int(1, 99) / 100;
          if (cum.includes(Math.round(U * 100))) continue;
          const kk = cum.findIndex((c) => U * 100 < c);
          return {
            prompt: `Daily demand ${V("D")} (units) has this distribution: ${M.table([V("d"), ...range(k).map(n)], [[`${V("P")}(${V("D")} = ${V("d")})`, ...pm.map((q) => n(q / 100))]])} Use the inverse transform with ${V("U")} = ${n(U)} to simulate one day's demand.`,
            steps: [
              `Cumulative probabilities: ${cum.map((c, i) => `${V("F")}(${n(i)}) = ${n(c / 100)}`).join(", ")}.`,
              `Return the first value whose cumulative probability reaches ${V("U")}: ${kk > 0 ? `${V("F")}(${n(kk - 1)}) = ${n(cum[kk - 1] / 100)} &lt; ${n(U)} ≤ ` : `${n(U)} ≤ `}${V("F")}(${n(kk)}) = ${n(cum[kk] / 100)}, so ${V("D")} = ${n(kk)}.`,
            ],
            answer: { kind: "number", value: kk }, answerText: n(kk), answerInput: String(kk),
            vals: { cum: cum.map((c) => c / 100), kk }, params: { pm: pm.map((q) => q / 100), U }, consts: range(k),
          };
        }
      }
      // level 3: rejection sampling from a uniform proposal
      for (;;) {
        const [fTxt, Mv, ratioTxt, ratio] = r.pick([
          [`2${x}`, 2, `${x}`, (t) => t],
          [`3${M.sup(x, 2)}`, 3, M.sup(x, 2), (t) => t * t],
          [`6${x}(1 − ${x})`, 1.5, `4${x}(1 − ${x})`, (t) => 4 * t * (1 - t)],
        ]);
        const xs = range(5).map(() => r.int(1, 9) / 10), Us = range(5).map(() => r.int(1, 99) / 100);
        const rs = xs.map((t) => P.round(ratio(t), 6));
        if (rs.some((v, i) => Math.abs(v - Us[i]) < 0.02)) continue;
        const acc = rs.map((v, i) => Us[i] <= v), na = acc.filter(Boolean).length;
        if (na === 0 || na === 5) continue;
        const rate = F(1).div(F(Mv * 2, 2));
        return {
          prompt: `To sample the density ${V("f")}(${x}) = ${fTxt} on [0, 1], propose ${x} from Uniform(0, 1) (density ${V("g")} = 1) and accept when ${V("U")} ≤ ${M.frac(`${V("f")}(${x})`, `${V("M")}${V("g")}(${x})`)} with ${V("M")} = ${n(Mv)} = max ${V("f")}. ${M.table(["proposal", ...range(5).map((i) => n(i + 1))], [[x, ...xs.map(n)], [V("U"), ...Us.map(n)]])} How many of the five proposals are accepted?`,
          steps: [
            `The acceptance threshold is ${M.frac(V("f"), V("M"))} = ${ratioTxt}.`,
            xs.map((t, i) => `${x} = ${n(t)}: threshold ${n(rs[i])}, ${V("U")} = ${n(Us[i])} ${acc[i] ? "≤ it: accept" : "&gt; it: reject"}`).join("; ") + ".",
            `${n(na)} accepted. On average the acceptance rate is 1/${V("M")} = ${dc(rate)}, and the accepted ${x} values follow ${V("f")} exactly.`,
          ],
          answer: { kind: "number", value: na }, answerText: n(na), answerInput: String(na),
          vals: { rs, na, rate: fv(rate) }, params: { Mv, xs, Us, kind: Mv === 2 ? 0 : Mv === 3 ? 1 : 2 }, consts: [3, 4, 5, 6],
        };
      }
    },
  };

  // ---- O.14 Monte Carlo ----------------------------------------------------------------------------------------------
  const FUNS = [
    { txt: M.sup(x, 2), f: (t) => t.mul(t), I: (a, b) => F(b * b * b - a * a * a, 3) },
    { txt: `2${x} + 1`, f: (t) => t.mul(2).add(1), I: (a, b) => F(b * b - a * a + b - a) },
    { txt: M.sup(x, 3), f: (t) => t.mul(t).mul(t), I: (a, b) => F(b ** 4 - a ** 4, 4) },
    { txt: `4 − ${M.sup(x, 2)}`, f: (t) => F(4).sub(t.mul(t)), I: (a, b) => F(12 * (b - a) - (b ** 3 - a ** 3), 3) },
  ];
  D["O.14"] = {
    title: "Monte Carlo estimates and their error",
    generate(r, level) {
      if (level === 1) {
        const fi = r.int(0, 3), Fn = FUNS[fi], a = r.int(0, 1), b = a + r.int(1, 2);
        const us = r.sample(range((b - a) * 10 - 1).map((i) => a * 10 + 1 + i), 4).map((t) => F(t, 10)), fs = us.map(Fn.f);
        const est = fsum(fs).mul(F(b - a, 4)), tru = Fn.I(a, b);
        return {
          prompt: `Estimate ${M.eq(`∫ from ${n(a)} to ${n(b)} of ${Fn.txt} d${x}`)} by Monte Carlo with the four uniform sample points ${listAnd(us.map(dc))} in [${n(a)}, ${n(b)}].`,
          steps: [
            `Monte Carlo integration: ∫ ≈ ${M.frac(`${V("b")} − ${V("a")}`, V("N"))} Σ ${V("f")}(${M.sub(V("U"), V("i"))}), the average height times the length.`,
            `Heights: ${us.map((u, i) => `${V("f")}(${dc(u)}) = ${dc(fs[i])}`).join(", ")}; their sum is ${dc(fsum(fs))}.`,
            `Estimate: ${M.frac(n(b - a), "4")} × ${dc(fsum(fs))} = ${dc(est)}. (The exact value is ${n(tru)}${terminates(tru) ? "" : ` ≈ ${M.n(tru.value, { dp: 3 })}`}; the error shrinks like 1/${M.sqrt(V("N"))}.)`,
          ],
          answer: { kind: "number", value: est.value }, answerText: dc(est), answerInput: typed(est),
          vals: { fs: fs.map(fv), sm: fv(fsum(fs)), est: fv(est), tru: fv(tru), len: b - a }, params: { fi, a, b, us: us.map(fv) }, consts: [3, 4],
        };
      }
      if (level === 2) {
        // estimate π from points in the unit square
        for (;;) {
          const N = r.pick([10, 12, 16, 20]), pts = [];
          while (pts.length < N) {
            const q = [r.int(1, 19) * 5, r.int(1, 19) * 5], d2 = q[0] * q[0] + q[1] * q[1];
            if (Math.abs(d2 - 10000) < 1500) continue;
            if (!pts.some((p) => p[0] === q[0] && p[1] === q[1])) pts.push(q);
          }
          const P01 = pts.map((p) => [p[0] / 100, p[1] / 100]), d2 = P01.map((p) => P.round(p[0] * p[0] + p[1] * p[1], 6));
          const k = d2.filter((v) => v <= 1).length;
          if (k === 0 || k === N) continue;
          const est = F(4 * k, N);
          return {
            prompt: `${n(N)} random points were dropped in the unit square. Points inside the quarter circle ${M.sup(x, 2)} + ${M.sup(y, 2)} ≤ 1 estimate its area ${M.frac("π", "4")}. Estimate π from the graph.`,
            graph: graph({ view: [0, 1, 0, 1], equal: true, items: [{ t: "fn", e: "sqrt(1 - x^2)", role: "secondary" }, ...P01.map((p, i) => ({ t: "pt", x: p[0], y: p[1], role: d2[i] <= 1 ? "primary" : "highlight" }))] }),
            steps: [
              `Check ${M.sup(x, 2)} + ${M.sup(y, 2)} ≤ 1 for each point: ${P01.map((p, i) => `${tup(p[0], p[1])} → ${n(d2[i])}`).join(", ")}.`,
              `${n(k)} of the ${n(N)} points are inside, so the fraction ${M.frac(n(k), n(N))} estimates ${M.frac("π", "4")}.`,
              `${V("π̂")} = 4 · ${M.frac(n(k), n(N))} = ${dc(est)}. With so few points the error is large; it falls like 1/${M.sqrt(V("N"))}.`,
            ],
            answer: { kind: "number", value: est.value }, answerText: dc(est), answerInput: typed(est),
            vals: { d2, k, est: fv(est) }, params: { N, pts: P01 }, consts: [4],
          };
        }
      }
      // level 3: a confidence interval, then the sample size for a target precision
      for (;;) {
        const N0 = r.pick([100, 400, 900, 2500]), sig = r.int(2, 30), mean = r.int(20, 200), eps = r.pick([F(1, 2), F(1), F(1, 4), F(1, 10), F(2)]);
        const z = F(49, 25), hw = z.mul(sig).div(Math.sqrt(N0)), need = z.mul(sig).div(eps).pow(2), Nn = Math.ceil(need.value - 1e-12);
        if (Nn <= N0 || Nn > 2e6 || need.isInt()) continue;
        return {
          prompt: `A pilot simulation of ${P.grouped(N0)} runs estimates an average cost of ${money(mean)} per order with sample standard deviation ${V("σ̂")} = ${money(sig)}. How many runs are needed for a 95% confidence half-width of at most ${money(eps)}?`,
          steps: [
            `The pilot's 95% interval is ${money(mean)} ± 1.96 · ${M.frac(n(sig), M.sqrt(n(N0)))} ${terminates(hw) ? "=" : "≈"} ${money(mean)} ± ${terminates(hw) ? dc(hw) : M.n(hw.value, { dp: 3 })}.`,
            `Half-width 1.96${V("σ̂")}/${M.sqrt(V("N"))} ≤ ${V("ε")} requires ${V("N")} ≥ ${M.sup(`(${M.frac(`1.96 · ${n(sig)}`, dc(eps))})`, 2)} = ${M.sup(dcp(z.mul(sig).div(eps)), 2)} = ${dc(need)}.`,
            `Round up: ${V("N")} = ${P.grouped(Nn)} runs. Precision is expensive: halving ${V("ε")} would need four times as many.`,
          ],
          answer: { kind: "number", value: Nn }, answerText: `${P.grouped(Nn)} runs`, answerInput: String(Nn),
          vals: { hw: fv(hw), zs: fv(z.mul(sig).div(eps)), need: fv(need), Nn, rt: Math.sqrt(N0) }, params: { N0, sig, mean, eps: fv(eps) }, consts: [1.96, 95],
        };
      }
    },
  };

  // ---- O.variance-reduction --------------------------------------------------------------------------------------------
  D["O.variance-reduction"] = {
    title: "Antithetic, stratified and control-variate estimators",
    generate(r, level) {
      if (level === 1) {
        const fi = r.pick([0, 2]), Fn = FUNS[fi], us = r.sample([1, 2, 3, 4, 6, 7, 8, 9], 3).map((t) => F(t, 10));
        const pairs = us.map((u) => [Fn.f(u), Fn.f(F(1).sub(u))]), avg = pairs.map(([a, b]) => a.add(b).mul(F(1, 2)));
        const est = fsum(avg).mul(F(1, 3)), tru = Fn.I(0, 1);
        return {
          prompt: `Estimate ${V("E")}[${Fn.txt.replace(/x/g, "U")}] for ${V("U")} ~ Uniform(0, 1) with antithetic variates, using ${V("U")} = ${listAnd(us.map(dc))} and their mirrors 1 − ${V("U")}.`,
          steps: [
            `Each draw is paired with its mirror: ${M.frac(`${V("f")}(${V("U")}) + ${V("f")}(1 − ${V("U")})`, "2")}. Because ${V("f")} is monotone the pair is negatively correlated, which lowers the variance.`,
            us.map((u, i) => `${V("U")} = ${dc(u)}: (${dc(pairs[i][0])} + ${dc(pairs[i][1])}) ÷ 2 = ${dc(avg[i])}`).join("; ") + ".",
            `Average of the three pair means: ${M.frac(avg.map(dc).join(" + "), "3")} = ${dc(est)}. (The exact value is ${n(tru)}.)`,
          ],
          answer: { kind: "number", value: est.value }, answerText: dc(est), answerInput: typed(est),
          vals: { pairs: pairs.map((p) => p.map(fv)), avg: avg.map(fv), est: fv(est), tru: fv(tru), mir: us.map((u) => fv(F(1).sub(u))) }, params: { fi, us: us.map(fv) }, consts: [3, 4],
        };
      }
      if (level === 2) {
        for (;;) {
          const w = r.sample([1, 2, 3, 4, 5, 6, 7], 2).sort((a, b) => a - b);
          const ws = [w[0], w[1] - w[0], 10 - w[1]].map((t) => F(t, 10));
          if (ws.some((t) => t.n <= 0)) continue;
          const means = [r.int(10, 40), r.int(30, 80), r.int(60, 150)], est = fsum(ws.map((q, i) => q.mul(means[i])));
          const segs = ["casual", "regular", "frequent"];
          return {
            prompt: `A store simulates customer spending by stratifying customers into three segments with known shares: ${segs.map((s, i) => `${s} ${n(ws[i].value * 100)}%`).join(", ")}. The simulated mean spend in each segment is ${listAnd(means.map(money))}. Give the stratified estimate of the mean spend per customer, in dollars.`,
            steps: [
              `Stratified estimator: ${M.sub(V("θ̂"), "st")} = Σ ${M.sub(V("w"), V("s"))}${M.sub(V("Ȳ"), V("s"))}, weighting each stratum's mean by its known probability, which removes the between-strata variance.`,
              `${ws.map((q, i) => `${dc(q)} · ${n(means[i])}`).join(" + ")} = ${ws.map((q, i) => dc(q.mul(means[i]))).join(" + ")} = ${dc(est)}.`,
              `The estimate is ${money(est)} per customer.`,
            ],
            answer: { kind: "number", value: est.value }, answerText: money(est), answerInput: typed(est),
            vals: { ws: ws.map(fv), pct: ws.map((q) => q.n * (100 / q.d)), parts: ws.map((q, i) => fv(q.mul(means[i]))), est: fv(est) }, params: { ws: ws.map(fv), means }, consts: [100],
          };
        }
      }
      // level 3: the optimal control variate
      for (;;) {
        const sx = r.int(2, 6), sy = r.int(2, 10), rho = r.pick([F(1, 2), F(3, 5), F(4, 5), F(9, 10)]);
        const cov = rho.mul(sx * sy), vx = sx * sx, vy = sy * sy, c = cov.div(vx);
        const muX = r.int(5, 20), xbar = F(muX).add(F(r.nonzero(-20, 20), 10)), ybar = F(r.int(200, 900), 10);
        const est = ybar.sub(c.mul(xbar.sub(muX))), red = F(1).sub(rho.mul(rho));
        if (!terminates(c) || !terminates(est)) continue;
        return {
          prompt: `A simulation estimates the mean waiting time ${V("Y")} (minutes), using the service time ${V("X")} as a control variate with known mean ${M.sub(V("μ"), V("X"))} = ${n(muX)}. From the runs: ${V("Ȳ")} = ${dc(ybar)}, ${V("X̄")} = ${dc(xbar)}, Var(${V("X")}) = ${n(vx)}, Var(${V("Y")}) = ${n(vy)}, Cov(${V("Y")}, ${V("X")}) = ${dc(cov)}. Give the controlled estimate with the optimal coefficient, in minutes.`,
          steps: [
            `Optimal coefficient: ${V("c")}* = ${M.frac(`Cov(${V("Y")}, ${V("X")})`, `Var(${V("X")})`)} = ${M.frac(dc(cov), n(vx))} = ${dc(c)}.`,
            `${M.sub(V("θ̂"), V("c"))} = ${V("Ȳ")} − ${V("c")}*(${V("X̄")} − ${M.sub(V("μ"), V("X"))}) = ${dc(ybar)} − ${dc(c)} · (${dc(xbar)} − ${n(muX)}) = ${dc(ybar)} − ${dc(c)} · ${dcp(xbar.sub(muX))} = ${dc(est)}.`,
            `The correlation is ${V("ρ")} = ${M.frac(dc(cov), `${M.sqrt(n(vx))} · ${M.sqrt(n(vy))}`)} = ${dc(rho)}, so the variance falls to 1 − ${M.sup(V("ρ"), 2)} = ${dc(red)} of the plain estimator's: ${V("X̄")} came out ${xbar.cmp(muX) > 0 ? "high" : "low"}, so the estimate is corrected ${xbar.cmp(muX) > 0 === c.n > 0 ? "down" : "up"}.`,
          ],
          answer: { kind: "number", value: est.value }, answerText: `${dc(est)} minutes`, answerInput: typed(est),
          vals: { cov: fv(cov), c: fv(c), dx: fv(xbar.sub(muX)), est: fv(est), rho: fv(rho), red: fv(red), vx, vy }, params: { sx, sy, rho: fv(rho), muX, xbar: fv(xbar), ybar: fv(ybar) },
        };
      }
    },
  };

  // ---- O.16 MCMC ---------------------------------------------------------------------------------------------------------
  D["O.16"] = {
    title: "Metropolis–Hastings acceptance and effective sample size",
    generate(r, level) {
      const wts = range(5).map(() => r.int(1, 12));
      const tbl = M.table([V("x"), ...range(5).map((i) => n(i + 1))], [[`${V("p̃")}(${V("x")})`, ...wts.map(n)]]);
      const alpha = (a, b) => (wts[b - 1] >= wts[a - 1] ? F(1) : F(wts[b - 1], wts[a - 1]));
      if (level === 1) {
        let xa, xb;
        do { xa = r.int(1, 5); xb = r.int(1, 5); } while (xa === xb || wts[xb - 1] === wts[xa - 1]);
        const al = alpha(xa, xb);
        return {
          prompt: `A Metropolis sampler targets the distribution proportional to ${V("p̃")}: ${tbl} The chain is at ${V("x")} = ${n(xa)} and a symmetric proposal suggests ${V("x")}′ = ${n(xb)}. What is the acceptance probability?`,
          steps: [
            `Symmetric proposal: ${V("α")} = min{1, ${M.frac(`${V("p")}(${V("x")}′)`, `${V("p")}(${V("x")})`)}}; the unknown normalizing constant cancels, so the unnormalized weights suffice.`,
            `${M.frac(n(wts[xb - 1]), n(wts[xa - 1]))}${wts[xb - 1] > wts[xa - 1] ? ` &gt; 1, so ${V("α")} = 1: moves uphill are always accepted.` : ` &lt; 1, so ${V("α")} = ${n(al)}: a downhill move is accepted only with this probability.`}`,
          ],
          answer: { kind: "number", value: al.value }, answerText: n(al), answerInput: typed(al),
          vals: { al: fv(al) }, params: { wts, xa, xb }, consts: [3, 4, 5],
        };
      }
      if (level === 2) {
        for (;;) {
          const x0 = r.int(1, 5), props = [], Us = [], log = [];
          let cur = x0, ok = true;
          for (let t = 0; t < 3; t++) {
            const pr = cur === 1 ? 2 : cur === 5 ? 4 : cur + r.sign();
            const U = r.int(1, 99) / 100, al = alpha(cur, pr);
            if (Math.abs(al.value - U) < 0.02) { ok = false; break; }
            const acc = U <= al.value;
            props.push(pr); Us.push(U); log.push({ cur, pr, U, al, acc });
            if (acc) cur = pr;
          }
          if (!ok || log.every((l) => l.acc) || log.every((l) => !l.acc)) continue;
          return {
            prompt: `A Metropolis chain targets ${V("p̃")} below, starting at ${M.sub(V("x"), 0)} = ${n(x0)}. ${tbl} The proposals are ${listAnd(props.map(n))} with uniforms ${listAnd(Us.map(n))}; accept when ${V("U")} ≤ ${V("α")}. Where is the chain after the three steps?`,
            steps: [
              `${V("α")} = min{1, ${M.frac(`${V("p̃")}(${V("x")}′)`, `${V("p̃")}(${V("x")})`)}} for each proposal.`,
              ...log.map((l, i) => `Step ${n(i + 1)}: at ${n(l.cur)}, propose ${n(l.pr)}: ${V("α")} = ${l.al.eq(1) ? "1" : `${M.frac(n(wts[l.pr - 1]), n(wts[l.cur - 1]))} ≈ ${M.n(l.al.value, { dp: 3 })}`}; ${V("U")} = ${n(l.U)} ${l.acc ? "≤ α: move" : "&gt; α: stay (and record the current state again)"}.`),
              `The chain ends at ${n(cur)}.`,
            ],
            answer: { kind: "number", value: cur }, answerText: n(cur), answerInput: String(cur),
            vals: { als: log.map((l) => l.al.value), cur }, params: { wts, x0, props, Us }, consts: [3, 4, 5],
          };
        }
      }
      if (r.chance(0.5)) {
        // Metropolis–Hastings with an asymmetric proposal
        for (;;) {
          const px = r.int(1, 12), py = r.int(1, 12), qf = F(r.int(1, 9), 10), qb = F(r.int(1, 9), 10);
          const ratio = F(py).mul(qb).div(F(px).mul(qf)), al = ratio.cmp(1) >= 0 ? F(1) : ratio;
          if (ratio.eq(1) || qf.eq(qb) || F(py, px).cmp(1) >= 0 === ratio.cmp(1) >= 0) continue;
          return {
            prompt: `A Metropolis–Hastings sampler with an asymmetric proposal is at ${V("x")}. It proposes ${V("x")}′ with ${V("q")}(${V("x")}′ | ${V("x")}) = ${dc(qf)}, while the reverse move has ${V("q")}(${V("x")} | ${V("x")}′) = ${dc(qb)}. The unnormalized target has ${V("p̃")}(${V("x")}) = ${n(px)} and ${V("p̃")}(${V("x")}′) = ${n(py)}. What is the acceptance probability?`,
            steps: [
              `${V("α")} = min{1, ${M.frac(`${V("p")}(${V("x")}′) ${V("q")}(${V("x")} | ${V("x")}′)`, `${V("p")}(${V("x")}) ${V("q")}(${V("x")}′ | ${V("x")})`)}}: the proposal ratio corrects for moves that are easier to propose in one direction.`,
              `${M.frac(`${n(py)} · ${dc(qb)}`, `${n(px)} · ${dc(qf)}`)} = ${M.frac(dc(qb.mul(py)), dc(qf.mul(px)))} = ${n(ratio)}${ratio.cmp(1) > 0 ? " &gt; 1" : ""}.`,
              `${V("α")} = ${n(al)}. Ignoring the proposal ratio would give min{1, ${M.frac(n(py), n(px))}}, the wrong answer here.`,
            ],
            answer: { kind: "number", value: al.value }, answerText: n(al), answerInput: typed(al),
            vals: { a: fv(qb.mul(py)), b: fv(qf.mul(px)), ratio: fv(ratio), al: fv(al) }, params: { px, py, qf: fv(qf), qb: fv(qb), mode: 0 },
          };
        }
      }
      const N = r.pick([1000, 2000, 5000, 10000]), rho = r.pick([F(1, 2), F(3, 5), F(4, 5), F(9, 10), F(1, 3)]);
      const s = rho.div(F(1).sub(rho)), den = F(1).add(s.mul(2)), ess = F(N).div(den);
      if (!ess.isInt()) return D["O.16"].generate(r, level);
      return {
        prompt: `An MCMC run keeps ${P.grouped(N)} draws whose autocorrelation at lag ${V("k")} is ${M.sup(V("ρ"), V("k"))} with ${V("ρ")} = ${dc(rho)}. Find the effective sample size ${M.eq(`ESS = ${M.frac(V("N"), `1 + 2 Σ ${M.sub(V("ρ"), V("k"))}`)}.`)}`,
        steps: [
          `The autocorrelations form a geometric series: Σ over ${V("k")} ≥ 1 of ${M.sup(V("ρ"), V("k"))} = ${M.frac(V("ρ"), `1 − ${V("ρ")}`)} = ${M.frac(dc(rho), dc(F(1).sub(rho)))} = ${dc(s)}.`,
          `Denominator: 1 + 2 · ${dc(s)} = ${dc(den)}.`,
          `ESS = ${M.frac(n(N), dc(den))} = ${P.grouped(ess.value)}: correlated draws carry far less information than ${P.grouped(N)} independent ones.`,
        ],
        answer: { kind: "number", value: ess.value }, answerText: P.grouped(ess.value), answerInput: String(ess.value),
        vals: { om: fv(F(1).sub(rho)), s: fv(s), den: fv(den), ess: fv(ess) }, params: { N, rho: fv(rho), mode: 1 },
      };
    },
  };

  // ---- O.queueing ------------------------------------------------------------------------------------------------------
  D["O.queueing"] = {
    title: "Little's law and the M/M/1 queue",
    generate(r, level) {
      if (level === 1) {
        const lam = r.int(6, 60), Wm = r.pick([2, 3, 4, 5, 6, 10, 12, 15, 20, 30]), L = F(lam * Wm, 60);
        const k = r.int(0, 2);
        if (!terminates(L)) return D["O.queueing"].generate(r, level);
        if (k === 0) {
          return {
            prompt: `Customers arrive at a coffee shop at ${n(lam)} per hour and spend ${n(Wm)} minutes inside on average. How many customers are in the shop on average?`,
            steps: [`Little's law: ${V("L")} = ${V("λ")}${V("W")}, with consistent units. ${V("W")} = ${n(Wm)} min = ${dc(F(Wm, 60))} h.`, `${V("L")} = ${n(lam)} × ${dc(F(Wm, 60))} = ${dc(L)} customers.`],
            answer: { kind: "number", value: L.value }, answerText: `${dc(L)} customers`, answerInput: typed(L),
            vals: { Wh: fv(F(Wm, 60)), L: fv(L) }, params: { lam, Wm, k }, consts: [60],
          };
        }
        if (k === 1) {
          return {
            prompt: `A clinic's waiting room holds ${dc(L)} patients on average, and patients spend ${n(Wm)} minutes there on average. What is the arrival rate, in patients per hour?`,
            steps: [`Little's law: ${V("L")} = ${V("λ")}${V("W")}, so ${V("λ")} = ${V("L")}/${V("W")}, with ${V("W")} = ${n(Wm)} min = ${dc(F(Wm, 60))} h.`, `${V("λ")} = ${dc(L)} ÷ ${dc(F(Wm, 60))} = ${n(lam)} per hour.`],
            answer: { kind: "number", value: lam }, answerText: `${n(lam)} per hour`, answerInput: String(lam),
            vals: { Wh: fv(F(Wm, 60)), L: fv(L), lam }, params: { L: fv(L), Wm, k }, consts: [60],
          };
        }
        return {
          prompt: `A help desk has on average ${dc(L)} open tickets, and new tickets arrive at ${n(lam)} per hour. How long does a ticket stay open on average, in minutes?`,
          steps: [`Little's law: ${V("W")} = ${V("L")}/${V("λ")} = ${dc(L)} ÷ ${n(lam)} = ${dc(F(Wm, 60))} h.`, `In minutes: ${dc(F(Wm, 60))} × 60 = ${n(Wm)}.`],
          answer: { kind: "number", value: Wm }, answerText: `${n(Wm)} minutes`, answerInput: String(Wm),
          vals: { Wh: fv(F(Wm, 60)), L: fv(L), Wm }, params: { L: fv(L), lam, k }, consts: [60],
        };
      }
      if (level === 2) {
        for (;;) {
          const mu = r.int(4, 30), lam = r.int(2, mu - 1), gap = mu - lam;
          if (60 % gap !== 0) continue;
          const rho = F(lam, mu), L = rho.div(F(1).sub(rho)), Lq = rho.mul(rho).div(F(1).sub(rho)), W = F(60, gap), Wq = rho.mul(W);
          const k = r.int(0, 3), names = ["average number of customers in the system", "average number waiting in line", "average time in the system, in minutes", "average wait in line, in minutes"];
          const val = [L, Lq, W, Wq][k];
          if (!terminates(val)) continue;
          return {
            prompt: `A single ticket window is an M/M/1 queue: customers arrive at ${n(lam)} per hour and the clerk serves ${n(mu)} per hour. Find the ${names[k]}.`,
            steps: [
              `Utilization ${V("ρ")} = ${M.frac(V("λ"), V("μ"))} = ${M.frac(n(lam), n(mu))}${rho.d !== mu ? ` = ${n(rho)}` : ""} &lt; 1, so the queue is stable.`,
              [
                `${V("L")} = ${M.frac(V("ρ"), `1 − ${V("ρ")}`)} = ${M.frac(n(rho), n(F(1).sub(rho)))} = ${dc(L)} customers.`,
                `${M.sub(V("L"), V("q"))} = ${M.frac(M.sup(V("ρ"), 2), `1 − ${V("ρ")}`)} = ${M.frac(M.sup(`(${n(rho)})`, 2), n(F(1).sub(rho)))} = ${dc(Lq)} customers.`,
                `${V("W")} = ${M.frac("1", `${V("μ")} − ${V("λ")}`)} = ${M.frac("1", `${n(mu)} − ${n(lam)}`)} h = ${M.frac("60", n(gap))} min = ${dc(W)} minutes.`,
                `${M.sub(V("W"), V("q"))} = ${V("ρ")}${V("W")} = ${n(rho)} · ${M.frac("60", n(gap))} min = ${dc(Wq)} minutes.`,
              ][k],
              `Little's law ties them together: ${V("L")} = ${V("λ")}${V("W")} = ${n(lam)} · ${M.frac("1", n(gap))} = ${dc(L)}.`,
            ],
            answer: { kind: "number", value: val.value }, answerText: `${dc(val)}${k >= 2 ? " minutes" : " customers"}`, answerInput: typed(val),
            vals: { rho: fv(rho), om: fv(F(1).sub(rho)), L: fv(L), Lq: fv(Lq), W: fv(W), Wq: fv(Wq), gap }, params: { lam, mu, k }, consts: [60],
          };
        }
      }
      // level 3: design a service rate, or the chance of a long line
      if (r.chance(0.5)) {
        const lam = r.int(6, 40), Wm = r.pick([2, 3, 4, 5, 6, 10, 12, 15, 20, 30]), mu = lam + 60 / Wm;
        return {
          prompt: `Orders reach a single packing station at ${n(lam)} per hour (Poisson), and packing times are exponential. How fast must the packer work, in orders per hour, so that the average time an order spends at the station (waiting plus packing) is at most ${n(Wm)} minutes?`,
          steps: [
            `M/M/1: ${V("W")} = ${M.frac("1", `${V("μ")} − ${V("λ")}`)}. Require ${M.frac("1", `${V("μ")} − ${n(lam)}`)} ≤ ${n(Wm)} min = ${dc(F(Wm, 60))} h.`,
            `${V("μ")} − ${n(lam)} ≥ ${M.frac("1", dc(F(Wm, 60)))} = ${n(60 / Wm)}, so ${V("μ")} ≥ ${n(mu)} orders per hour.`,
            `Then ${V("ρ")} = ${M.frac(n(lam), n(mu))}: the packer is idle part of the time, which is the price of short delays.`,
          ],
          answer: { kind: "number", value: mu }, answerText: `${n(mu)} per hour`, answerInput: String(mu),
          vals: { Wh: fv(F(Wm, 60)), inv: 60 / Wm, mu }, params: { lam, Wm, mode: 0 }, consts: [60],
        };
      }
      for (;;) {
        const mu = r.pick([5, 10, 20, 4]), lam = r.int(1, mu - 1), nn = r.int(2, 4), rho = F(lam, mu), pr = rho.pow(nn);
        if (!terminates(pr)) continue;
        return {
          prompt: `Calls reach a one-agent support line at ${n(lam)} per hour and the agent handles ${n(mu)} per hour (M/M/1). In the long run, what is the probability that at least ${n(nn)} callers are in the system? Give a decimal.`,
          steps: [
            `${V("ρ")} = ${M.frac(n(lam), n(mu))} = ${dc(rho)}, and ${V("P")}(${V("N")} = ${V("n")}) = (1 − ${V("ρ")})${M.sup(V("ρ"), V("n"))}, a geometric distribution.`,
            `${V("P")}(${V("N")} ≥ ${n(nn)}) = Σ over ${V("n")} ≥ ${n(nn)} of (1 − ${V("ρ")})${M.sup(V("ρ"), V("n"))} = ${M.sup(V("ρ"), n(nn))} (a geometric tail).`,
            `${M.sup(`(${dc(rho)})`, nn)} = ${dc(pr)}.`,
          ],
          answer: { kind: "number", value: pr.value }, answerText: dc(pr), answerInput: typed(pr),
          vals: { rho: fv(rho), pr: fv(pr) }, params: { lam, mu, nn, mode: 1 },
        };
      }
    },
  };

  // ---- O.des Discrete-event simulation ---------------------------------------------------------------------------------
  D["O.des"] = {
    title: "Event times, waiting times and time averages",
    generate(r, level) {
      if (level === 1) {
        const T = range(5).map(() => r.int(1, 9)), A = [];
        T.reduce((s, t) => { A.push(s + t); return s + t; }, 0);
        const k = r.int(3, 5);
        return {
          prompt: `A simulation draws the interarrival times ${listAnd(T.map(n))} minutes, starting the clock at 0. At what time does customer ${n(k)} arrive?`,
          steps: [
            `Arrival times accumulate: ${M.sub(V("A"), V("n"))} = ${M.sub(V("A"), `${V("n")}−1`)} + ${M.sub(V("T"), V("n"))}, with ${M.sub(V("A"), 0)} = 0.`,
            A.slice(0, k).map((a, i) => (i ? `${M.sub(V("A"), i + 1)} = ${n(A[i - 1])} + ${n(T[i])} = ${n(a)}` : `${M.sub(V("A"), 1)} = ${n(a)}`)).join(", ") + ".",
            `Customer ${n(k)} arrives at minute ${n(A[k - 1])}.`,
          ],
          answer: { kind: "number", value: A[k - 1] }, answerText: `${n(A[k - 1])} min`, answerInput: String(A[k - 1]),
          vals: { A }, params: { T, k }, consts: [3, 4, 5],
        };
      }
      if (level === 2) {
        for (;;) {
          const S = range(5).map(() => r.int(2, 9)), T = range(4).map(() => r.int(1, 8)), W = [0];
          for (let i = 0; i < 4; i++) W.push(Math.max(0, W[i] + S[i] - T[i]));
          if (W.filter((w) => w > 0).length < 2 || !W.slice(1).includes(0) && r.chance(0.5)) continue;
          const avg = F(sum(W), 5);
          return {
            prompt: `At a single-server FIFO counter, service times of customers 1 to 5 are ${listAnd(S.map(n))} minutes, and the gaps between successive arrivals are ${listAnd(T.map(n))} minutes. Customer 1 arrives to an empty system. Use the Lindley recursion to find the average wait in line, in minutes.`,
            steps: [
              `${M.sub(V("W"), `${V("n")}+1`)} = max(0, ${M.sub(V("W"), V("n"))} + ${M.sub(V("S"), V("n"))} − ${M.sub(V("T"), `${V("n")}+1`)}), starting from ${M.sub(V("W"), 1)} = 0.`,
              range(4).map((i) => `${M.sub(V("W"), i + 2)} = max(0, ${n(W[i])} + ${n(S[i])} − ${n(T[i])}) = ${n(W[i + 1])}`).join("; ") + ".",
              `Average: ${M.frac(W.map(n).join(" + "), "5")} = ${dc(avg)} minutes.`,
            ],
            answer: { kind: "number", value: avg.value }, answerText: `${dc(avg)} min`, answerInput: typed(avg),
            vals: { W, raw: range(4).map((i) => W[i] + S[i] - T[i]), sumW: sum(W), avg: fv(avg) }, params: { S, T }, consts: [3, 4, 5],
          };
        }
      }
      // level 3: time-average number in system from the event history
      for (;;) {
        const Aa = [0], S = range(4).map(() => r.int(1, 6));
        for (let i = 0; i < 3; i++) Aa.push(Aa[i] + r.int(1, 5));
        const Dd = [];
        for (let i = 0; i < 4; i++) Dd.push(Math.max(Aa[i], i ? Dd[i - 1] : 0) + S[i]);
        if (!range(3).some((i) => Dd[i] > Aa[i + 1])) continue;   // someone must wait
        const soj = Aa.map((a, i) => Dd[i] - a), area = sum(soj), Tend = Dd[3], Lbar = F(area, Tend);
        // N(t) for the graph
        const ev = [...Aa.map((t) => [t, 1]), ...Dd.map((t) => [t, -1])].sort((p, q) => p[0] - q[0] || q[1] - p[1]);
        const segs = [];
        let N = 0, t0 = 0;
        for (const [t, dN] of ev) { if (t > t0) segs.push({ t: "seg", a: [t0, N], b: [t, N], role: "primary" }); N += dN; t0 = t; }
        return {
          prompt: `A single-server FIFO queue: customers arrive at times ${listAnd(Aa.map(n))} with service times ${listAnd(S.map(n))} minutes. Simulate it and find the time-average number in the system over [0, ${V("T")}], where ${V("T")} is the last departure. (The graph shows the resulting ${V("N")}(${V("t")}).)`,
          graph: graph({ view: [0, Tend + 1, 0, 4.5], items: segs }),
          steps: [
            `Departures: ${M.sub(V("D"), V("i"))} = max(${M.sub(V("A"), V("i"))}, ${M.sub(V("D"), `${V("i")}−1`)}) + ${M.sub(V("S"), V("i"))}: ${Dd.map((dd, i) => `${M.sub(V("D"), i + 1)} = max(${n(Aa[i])}, ${n(i ? Dd[i - 1] : 0)}) + ${n(S[i])} = ${n(dd)}`).join(", ")}.`,
            `The area under ${V("N")}(${V("t")}) equals the total time customers spend in the system: ${soj.map((s, i) => `(${n(Dd[i])} − ${n(Aa[i])})`).join(" + ")} = ${soj.map(n).join(" + ")} = ${n(area)} customer-minutes.`,
            `${V("T")} = ${n(Tend)}, so ${V("L̄")} = ${M.frac(n(area), n(Tend))}${Lbar.d !== Tend || terminates(Lbar) ? ` = ${dc(Lbar)}` : ""} customers on average.`,
          ],
          answer: { kind: "number", value: Lbar.value }, answerText: dc(Lbar), answerInput: typed(Lbar),
          vals: { Dd, soj, area, Tend, Lbar: fv(Lbar) }, params: { A: Aa, S }, consts: [3, 4],
        };
      }
    },
  };

  P.define("optimization", D);
})(Practice);
