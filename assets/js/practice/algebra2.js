/*
 * practice/algebra2.js — Algebra II practice problems (chapter 04), one generator per concept key.
 *
 * Each generator(r, level) draws hand-solvable numbers for the level (1 easy, 2 medium, 3 hard) and
 * builds every number it shows from values it computes and reports in `vals`;
 * tools/practice/verifiers/algebra2.py recomputes each of them independently. See practice/core.js.
 *
 * Skipped concepts: none. Every concept in chapter 04 has something to compute (A2.induction is
 * practised through base cases, the algebra of the inductive step and finding the first n that works).
 *
 * Note: the word "function" never appears in shown text (verify.py treats it as leaked code).
 */
(function (P) {
  "use strict";
  const { Frac, M, fmt, graph } = P;
  const n = (v) => M.n(v);
  const np = (v) => M.n(v, { paren: true });
  const x = M.v("x"), y = M.v("y");
  const fn = M.v("f"), gn = M.v("g");
  const F = (a, b = 1) => new Frac(a, b);
  const typed = (v) => (v instanceof Frac ? (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`) : String(v));
  const fv = (q) => { q = Frac.of(q); return { n: q.n, d: q.d }; };
  const ff = (q, o) => M.f(Frac.of(q), o);
  const ffp = (q) => M.f(Frac.of(q), { paren: true });
  /** k times a variable: x, −x, 3x (never 1x). */
  const kv = (k, v = x) => { k = Frac.of(k); return k.eq(1) ? v : k.eq(-1) ? `−${v}` : `${M.f(k)}${v}`; };
  const pw = (base, e) => (e === 1 ? base : M.sup(base, e));
  const num = (value, dp) => (dp === undefined ? { kind: "number", value } : { kind: "number", value, dp });
  const lt = "&lt;", gt = "&gt;";
  /** A coefficient in front of a bracket: "", "−", "3". */
  const cs = (k) => (k === 1 ? "" : k === -1 ? "−" : n(k));
  /** An ordinal: 21st, 32nd, 13th. */
  const ord = (k) => `${n(k)}${k % 100 >= 11 && k % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][k % 10] || "th"}`;
  /** A fraction in brackets when it is not whole, for raising to a power: (½)⁷. */
  const fpow = (q) => { q = Frac.of(q); return q.isInt() ? np(q.n) : `(${M.f(q)})`; };
  /** Two decimals, zeros kept: 35.00. */
  const fix2 = (v) => v.toFixed(2).replace("-", "−");
  /** A linear factor, bracketed unless it is just x: (x − 3), x. */
  const lin = (v, name = "x") => (v === 0 ? M.v(name) : `(${M.poly([1, -v], name)})`);
  /** A coefficient in front of a number power: "", "−", "3 · ". */
  const csDot = (k) => (k === 1 ? "" : k === -1 ? "−" : `${n(k)} · `);
  /** A signed term that always shows its coefficient: " + 3 · (−2)², " − 1 · 4". */
  const tmul = (k, rest) => (k === 0 ? "" : Math.abs(k) === 1 && rest ? ` ${k < 0 ? "−" : "+"} ${rest.replace(/^ · /, "")}` : ` ${k < 0 ? "−" : "+"} ${n(Math.abs(k))}${rest}`);
  /** k · t for a substitution, without "1 ·": 3 · (−2), (−2), −(−2). */
  const times = (k, t) => (k === 1 ? np(t) : k === -1 ? `−${np(t)}` : `${n(k)} · ${np(t)}`);
  const cap = (s) => s[0].toUpperCase() + s.slice(1);
  /** A polynomial in the parser's syntax, highest power first. */
  const pstr = (coefs, v = "x") => coefs.map((c, i) => { const p = coefs.length - 1 - i; return `(${typed(Frac.of(c))})${p ? `*${v}^${p}` : ""}`; }).join(" + ");
  /** A polynomial as a person would type it: x^2 - 3x + 1/2. */
  function ptyped(coefs, v = "x") {
    let out = "";
    coefs.forEach((c, i) => {
      c = Frac.of(c);
      const p = coefs.length - 1 - i;
      if (c.n === 0) return;
      const mag = c.abs(), vp = p === 0 ? "" : p === 1 ? v : `${v}^${p}`;
      const coef = mag.isInt() ? (mag.n === 1 && p > 0 ? "" : String(mag.n)) : p > 0 ? `(${mag.n}/${mag.d})` : `${mag.n}/${mag.d}`;
      out += out === "" ? `${c.n < 0 ? "-" : ""}${coef}${vp}` : ` ${c.n < 0 ? "-" : "+"} ${coef}${vp}`;
    });
    return out || "0";
  }
  /** Expand a product of polynomials (coefficient lists, highest power first). */
  function pmul(a, b) {
    const out = Array(a.length + b.length - 1).fill(0).map(() => F(0));
    a.forEach((u, i) => b.forEach((v, j) => { out[i + j] = out[i + j].add(Frac.of(u).mul(v)); }));
    return out;
  }
  const pval = (coefs, t) => coefs.reduce((acc, c) => acc.mul(t).add(c), F(0));
  const ints = (coefs) => coefs.map((c) => Frac.of(c).n);
  /** A piecewise rule shown with a brace: rows of [formula, condition]. */
  const cases = (rows) => `<span style="display:inline-flex;align-items:center;vertical-align:middle"><span style="font-size:2.2em;line-height:1;margin-right:0.1em">{</span><span style="display:inline-grid;grid-template-columns:auto auto;column-gap:1.2em;row-gap:0.2em">${rows.map(([a, b]) => `<span>${a}</span><span>${b}</span>`).join("")}</span></span>`;
  /** A matrix in square brackets (entries: numbers, Fracs or HTML). */
  function mat(rows, bars = false) {
    const c = rows[0].length;
    const cells = rows.flat().map((v) => `<span>${typeof v === "string" ? v : M.f(Frac.of(v))}</span>`).join("");
    const side = (s) => `<span style="border:1.5px solid currentColor;border-${s}:none;${bars ? "border-top:none;border-bottom:none;" : ""}width:0.3em"></span>`;
    return `<span style="display:inline-flex;align-items:stretch;vertical-align:middle;margin:0 0.15em">${side("right")}<span style="display:inline-grid;grid-template-columns:repeat(${c},auto);column-gap:0.9em;row-gap:0.15em;padding:0.15em 0.25em;text-align:right">${cells}</span>${side("left")}</span>`;
  }
  /** Σ with its limits stacked: from i = lo to hi. */
  const sig = (lo, hi, v = "i") => `<span style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;line-height:1.05;margin-right:0.15em"><small>${hi}</small><span style="font-size:1.5em">∑</span><small>${M.v(v)} = ${lo}</small></span>`;
  const logb = (b) => `log<sub>${b}</sub>`;
  const I = "<i>i</i>";
  /** a + bi with Fracs. */
  function cx(a, b) {
    a = Frac.of(a); b = Frac.of(b);
    const im = (m) => (m.eq(1) ? I : `${M.f(m)}${I}`);
    if (b.n === 0) return M.f(a);
    if (a.n === 0) return (b.n < 0 ? "−" : "") + im(b.abs());
    return `${M.f(a)} ${b.n < 0 ? "−" : "+"} ${im(b.abs())}`;
  }
  const cxp = (a, b) => { const t = cx(a, b); return t.startsWith("−") ? `(${t})` : t; };
  const cxExpr = (a, b) => `(${typed(Frac.of(a))}) + (${typed(Frac.of(b))})*i`;
  function cxTyped(a, b) {
    a = Frac.of(a); b = Frac.of(b);
    const ib = (m) => (m.eq(1) ? "i" : m.isInt() ? `${m.n}i` : `(${m.n}/${m.d})i`);
    if (b.n === 0) return typed(a);
    if (a.n === 0) return (b.n < 0 ? "-" : "") + ib(b.abs());
    return `${typed(a)} ${b.n < 0 ? "-" : "+"} ${ib(b.abs())}`;
  }
  /** Points on y = f over [a, b] for choosing a graph's y-range. */
  function yRange(f, a, b) {
    let lo = Infinity, hi = -Infinity;
    for (let k = 0; k <= 200; k++) { const v = f(a + ((b - a) * k) / 200); if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
    return [lo, hi];
  }

  /** A synthetic-division layout: the root c, the coefficients, the products row and the sums row. */
  function synth(c, coefs, prods, sums) {
    const td = (v, i, top) => `<td style="padding:0.1em 0.5em;text-align:right;${i === 0 ? "border-right:1px solid currentColor;" : ""}${top ? "border-top:1px solid currentColor;" : ""}">${v}</td>`;
    const row = (cells, top) => `<tr>${cells.map((v, i) => td(v, i, top)).join("")}</tr>`;
    return `<table style="border-collapse:collapse;margin:0.3em 0">${row([n(c), ...coefs.map(n)])}${row(["", "", ...prods.map(n)])}${row(["", ...sums.map(n)], true)}</table>`;
  }

  P.define("algebra2", {
    // ---- A2.1 Composition and inverses -------------------------------------------------------
    "A2.1": {
      title: "Composition and inverses",
      generate(r, level) {
        const inv = M.sup(fn, "−1");
        if (level === 1) {
          const a = r.nonzero(-5, 5), b = r.int(-9, 9), c = r.nonzero(-5, 5), d = r.int(-9, 9), t = r.nonzero(-4, 4);
          const ops = ["+", "−", "·", "∘"], op = r.int(0, 3);
          const fval = a * t + b, gval = c * t + d;
          const fStep = `${fn}(${n(t)}) = ${times(a, t)}${M.term(b, "")} = ${n(fval)}.`;
          const gStep = `${gn}(${n(t)}) = ${times(c, t)}${M.term(d, "")} = ${n(gval)}.`;
          let name, steps, ans, vals;
          if (op === 3) {
            ans = a * gval + b;
            name = `(${fn} ∘ ${gn})(${n(t)})`;
            steps = [
              `${name} means ${fn}(${gn}(${n(t)})): apply ${gn} first, then ${fn}.`,
              gStep,
              `Put that output into ${fn}: ${fn}(${n(gval)}) = ${times(a, gval)}${M.term(b, "")} = ${n(ans)}.`,
            ];
            vals = { gval, ans };
          } else {
            ans = op === 0 ? fval + gval : op === 1 ? fval - gval : fval * gval;
            name = op === 2 ? `(${fn}${gn})(${n(t)})` : `(${fn} ${ops[op]} ${gn})(${n(t)})`;
            steps = [
              `Combine the outputs at the same input: ${name} = ${fn}(${n(t)}) ${ops[op]} ${gn}(${n(t)}).`,
              fStep, gStep,
              `${["Add", "Subtract", "Multiply"][op]}: ${n(fval)} ${ops[op]} ${np(gval)} = ${n(ans)}.`,
            ];
            vals = { fval, gval, ans };
          }
          return {
            prompt: `Let ${fn}(${x}) = ${M.poly([a, b])} and ${gn}(${x}) = ${M.poly([c, d])}. Find ${M.eq(name)}`,
            steps, answer: num(ans), answerText: n(ans), answerInput: String(ans), vals, params: { a, b, c, d, t, op },
          };
        }
        if (level === 2) {
          const ident = { t: "fn", e: "x", role: "muted", dash: true };
          if (r.chance(0.5)) {
            const a = r.pick([-5, -4, -3, -2, 2, 3, 4, 5]), b = r.nonzero(-8, 8);
            const m = F(1, a), c0 = F(-b, a);
            const inner = M.poly([1, -b]);
            return {
              prompt: `Find the inverse of ${M.eq(`${fn}(${x}) = ${M.poly([a, b])}`)} Write ${inv}(${x}).`,
              graph: graph({ view: [-8, 8, -8, 8], items: [{ t: "fn", e: `${a}*x + (${b})` }, { t: "fn", e: `(x - (${b}))/(${a})`, role: "secondary" }, ident] }),
              steps: [
                `Write ${y} = ${M.poly([a, b])}. A line with nonzero slope passes the horizontal line test, so the inverse exists.`,
                `Swap ${x} and ${y}: ${x} = ${M.poly([a, b], "y")}.`,
                `Solve for ${y}: ${inner} = ${kv(a, y)}, so ${y} = ${M.frac(inner, n(a))} = ${M.poly([m, c0])}.`,
                `Check: ${fn}(${inv}(${x})) = ${n(a)}(${M.poly([m, c0])})${M.term(b, "")} = ${inner}${M.term(b, "")} = ${x}. The two graphs are mirror images in the line ${y} = ${x} (dashed).`,
              ],
              answer: { kind: "expr", expr: `(x - (${b}))/(${a})`, vars: ["x"] }, answerText: `${inv}(${x}) = ${M.poly([m, c0])}`,
              answerInput: `(${ptyped([1, -b])})/${a < 0 ? `(${a})` : a}`,
              vals: { m: fv(m), c0: fv(c0) }, params: { kind: 0, a, b },
            };
          }
          let h, k;
          do { h = r.int(-4, 4); k = r.int(-4, 4); } while (h === 0 || k === 0);
          const cube = `${M.sup(`(${M.poly([1, -h])})`, 3)}${M.term(k, "")}`;
          const cubeY = `${M.sup(`(${M.poly([1, -h], "y")})`, 3)}`;
          const root = `${M.sqrt(M.poly([1, -k]), "3")}`;
          return {
            prompt: `Find the inverse of ${M.eq(`${fn}(${x}) = ${cube}`)} Write ${inv}(${x}).`,
            graph: graph({ view: [-8, 8, -8, 8], items: [{ t: "fn", e: `(x - (${h}))^3 + (${k})` }, { t: "fn", e: `cbrt(x - (${k})) + (${h})`, role: "secondary" }, ident] }),
            steps: [
              `Write ${y} = ${cube}. A cube never repeats a value (the graph passes the horizontal line test), so the inverse exists.`,
              `Swap ${x} and ${y}: ${x} = ${cubeY}${M.term(k, "")}.`,
              `Undo the last step first, the ${k > 0 ? "addition" : "subtraction"}: ${M.poly([1, -k])} = ${cubeY}.`,
              `Take the cube root of both sides: ${root} = ${M.poly([1, -h], "y")}, so ${y} = ${root}${M.term(h, "")}.`,
              `Check: ${fn}(${inv}(${x})) = ${M.sup(`(${root}${M.term(h, "")}${M.term(-h, "")})`, 3)}${M.term(k, "")} = ${M.poly([1, -k])}${M.term(k, "")} = ${x}.`,
            ],
            answer: { kind: "expr", expr: `cbrt(x - (${k})) + (${h})`, vars: ["x"] }, answerText: `${inv}(${x}) = ${root}${M.term(h, "")}`,
            answerInput: `cbrt(${ptyped([1, -k])})${h < 0 ? ` - ${-h}` : ` + ${h}`}`,
            vals: {}, params: { kind: 1, h, k }, consts: [3],
          };
        }
        // level 3: (f ∘ g)^(−1)(t) by undoing f, then g
        const a = r.pick([-4, -3, -2, 2, 3, 4, 5]), b = r.int(-9, 9), c = r.pick([-3, -2, 2, 3, 4]), d = r.int(-9, 9), s = r.int(-5, 5);
        const u = c * s + d, t = a * u + b;
        const ginv = M.sup(gn, "−1"), comp = `(${fn} ∘ ${gn})`;
        return {
          prompt: `Let ${fn}(${x}) = ${M.poly([a, b])} and ${gn}(${x}) = ${M.poly([c, d])}. Find ${M.eq(`${M.sup(comp, "−1")}(${n(t)})`)}`,
          steps: [
            `The inverse of a composition undoes the steps in reverse order: ${M.sup(comp, "−1")} = ${ginv} ∘ ${inv}. So undo ${fn} first, then ${gn}.`,
            `${inv}(${n(t)}): solve ${M.poly([a, b])} = ${n(t)}. Then ${kv(a)} = ${n(t)} − ${np(b)} = ${n(t - b)}, so ${x} = ${M.frac(n(t - b), n(a))} = ${n(u)}.`,
            `${ginv}(${n(u)}): solve ${M.poly([c, d])} = ${n(u)}. Then ${kv(c)} = ${n(u)} − ${np(d)} = ${n(u - d)}, so ${x} = ${M.frac(n(u - d), n(c))} = ${n(s)}.`,
            `Check forward: ${gn}(${n(s)}) = ${n(c)} · ${np(s)}${M.term(d, "")} = ${n(u)} and ${fn}(${n(u)}) = ${n(a)} · ${np(u)}${M.term(b, "")} = ${n(t)}.`,
          ],
          answer: num(s), answerText: n(s), answerInput: String(s),
          vals: { tb: t - b, u, ud: u - d, s }, params: { a, b, c, d, t },
        };
      },
    },

    // ---- A2.2 Parent graphs ------------------------------------------------------------------------
    "A2.parent": {
      title: "Parent graphs and their families",
      generate(r, level) {
        const PAR = [
          { eq: `${y} = ${x}`, name: "Linear", e: "x", shape: "a straight line through the origin with slope 1", pts: [[0, 0], [1, 1]],
            dom: "any number can go in", ran: `${y} = ${x} takes every real value` },
          { eq: `${y} = ${M.sup(x, 2)}`, name: "Quadratic", e: "x^2", shape: "a U-shaped parabola, vertex at the origin, symmetric in the y-axis", pts: [[-1, 1], [0, 0], [1, 1]],
            dom: "any number can be squared", ran: `a square is never negative, and every ${y} ≥ 0 is reached` },
          { eq: `${y} = ${M.sup(x, 3)}`, name: "Cubic", e: "x^3", shape: "an S-shaped curve, flat as it passes through the origin, rising from far below to far above", pts: [[-1, -1], [0, 0], [1, 1]],
            dom: "any number can be cubed", ran: "cubes take every real value, negative ones too" },
          { eq: `${y} = |${x}|`, name: "Absolute value", e: "abs(x)", shape: "a V with its corner at the origin and straight sides of slope ±1", pts: [[-1, 1], [0, 0], [1, 1]],
            dom: "any number has an absolute value", ran: `|${x}| is never negative, and every ${y} ≥ 0 is reached` },
          { eq: `${y} = ${M.sqrt(x)}`, name: "Square root", e: "sqrt(x)", shape: "half of a sideways parabola, starting at the origin and rising ever more slowly to the right", pts: [[0, 0], [1, 1], [4, 2]],
            dom: `a real square root needs ${x} ≥ 0`, ran: `the principal root is never negative, and every ${y} ≥ 0 is reached` },
          { eq: `${y} = ${M.frac("1", x)}`, name: "Reciprocal", e: "1/x", shape: "two separate branches that approach both axes without touching them", pts: [[-1, -1], [1, 1]],
            dom: `${x} = 0 would divide by zero`, ran: `${M.frac("1", x)} = ${y} is solved by ${x} = ${M.frac("1", y)} for every ${y} except 0` },
          { eq: `${y} = ${M.sup("2", x)}`, name: "Exponential", e: "2^x", shape: "a curve hugging the x-axis on the left and climbing ever faster on the right", pts: [[0, 1], [1, 2]],
            dom: "any power of 2 can be taken", ran: `${M.sup("2", x)} is always positive and reaches every positive value` },
          { eq: `${y} = ${logb(2)} ${x}`, name: "Logarithmic", e: "ln(x)/ln(2)", shape: "a curve that exists only right of the y-axis, plunging down along it and rising slowly to the right", pts: [[1, 0], [2, 1]],
            dom: "only positive numbers have a logarithm", ran: `${logb(2)} ${x} takes every real value (it undoes ${M.sup("2", x)})` },
        ];
        const DR = [
          "Domain: all real numbers. Range: all real numbers.",
          "Domain: all real numbers. Range: [0, ∞).",
          "Domain: [0, ∞). Range: [0, ∞).",
          `Domain: ${x} ≠ 0. Range: ${y} ≠ 0.`,
          "Domain: all real numbers. Range: (0, ∞).",
          "Domain: (0, ∞). Range: all real numbers.",
        ];
        const drOf = [0, 1, 0, 1, 2, 3, 4, 5];
        const ptsTxt = (p) => p.pts.map(([a, b]) => `(${n(a)}, ${n(b)})`).join(", ");
        if (level === 1) {
          const drawn = r.int(0, 7);
          const others = r.sample([0, 1, 2, 3, 4, 5, 6, 7].filter((k) => k !== drawn), 3);
          const opts = r.shuffle([drawn, ...others]);
          const p = PAR[drawn];
          return {
            prompt: `Which parent graph is drawn? Choose its equation.`,
            graph: graph({ view: [-4, 4, -4, 4], items: [{ t: "fn", e: p.e }, ...p.pts.map(([a, b]) => ({ t: "pt", x: a, y: b }))] }),
            steps: [
              `Shape: ${p.shape}.`,
              `The marked points ${ptsTxt(p)} lie on ${p.eq}${drawn === 2 ? `, and the curve bends (unlike the line ${y} = ${x}, which also passes through them)` : ""}.`,
              `So the graph is the ${p.name.toLowerCase()} parent, ${p.eq}.`,
            ],
            answer: { kind: "choice", options: opts.map((k) => PAR[k].eq), index: opts.indexOf(drawn) }, answerText: p.eq,
            vals: {}, params: { drawn, opts }, consts: [3, 4],
          };
        }
        if (level === 2) {
          const which = r.int(0, 7), right = drOf[which];
          const others = r.sample([0, 1, 2, 3, 4, 5].filter((k) => k !== right), 3);
          const opts = r.shuffle([right, ...others]);
          const p = PAR[which];
          return {
            prompt: `What are the domain and range of the parent graph ${M.eq(p.eq)}`,
            steps: [
              `Domain (the inputs allowed): ${p.dom}.`,
              `Range (the outputs produced): ${p.ran}.`,
              `${DR[right]}`,
            ],
            answer: { kind: "choice", options: opts.map((k) => DR[k]), index: opts.indexOf(right) }, answerText: DR[right],
            vals: {}, params: { which, opts }, consts: [3],
          };
        }
        // level 3: which family models a real situation
        const T = M.v("t");
        const sc = r.int(0, 7);
        let prompt, rule, why, params;
        if (sc === 0) {
          const s = r.pick([40, 50, 60, 70, 80, 90, 100]);
          prompt = `A train runs at a steady ${n(s)} km/h. Its distance ${M.v("d")} (in km) after ${T} hours`;
          rule = `${M.v("d")} = ${n(s)}${T}`; why = `a constant times ${T}: a line through the origin`; params = { sc, s };
        } else if (sc === 1) {
          prompt = `The area ${M.v("A")} (in cm²) of a circular pizza of radius ${T} cm`;
          rule = `${M.v("A")} = π${M.sup(T, 2)}`; why = `a constant times the square of ${T}`; params = { sc };
        } else if (sc === 2) {
          prompt = `The volume ${M.v("V")} (in cm³) of a cube-shaped box with edge ${T} cm`;
          rule = `${M.v("V")} = ${M.sup(T, 3)}`; why = `the cube of ${T}`; params = { sc };
        } else if (sc === 3) {
          const m = r.int(12, 95);
          prompt = `You stand at milepost ${n(m)} on a straight highway. Your distance ${M.v("d")} (in miles) from a car at milepost ${T}`;
          rule = `${M.v("d")} = |${T} − ${n(m)}|`; why = `an absolute value of ${T} minus a constant: a V shape with its corner at ${T} = ${n(m)}`; params = { sc, m };
        } else if (sc === 4) {
          prompt = `The side length ${M.v("s")} (in m) of a square garden whose area is ${T} m²`;
          rule = `${M.v("s")} = ${M.sqrt(T)}`; why = `the square root of ${T}`; params = { sc };
        } else if (sc === 5) {
          const D = r.pick([120, 150, 180, 240, 300, 360, 420]);
          prompt = `The time ${M.v("h")} (in hours) to drive ${n(D)} km at a steady speed of ${T} km/h`;
          rule = `${M.v("h")} = ${M.frac(n(D), T)}`; why = `a constant divided by ${T}`; params = { sc, D };
        } else if (sc === 6) {
          const N0 = r.pick([50, 100, 200, 250, 500]), hh = r.pick([3, 4, 5, 6]);
          prompt = `A culture starts with ${n(N0)} bacteria and doubles every ${n(hh)} hours. The count ${M.v("N")} after ${T} hours`;
          rule = `${M.v("N")} = ${n(N0)} · ${M.sup("2", `${T}/${n(hh)}`)}`; why = `${T} sits in the exponent`; params = { sc, N0, hh };
        } else {
          const dd = r.pick([6, 7, 8, 9, 10, 12]);
          prompt = `An investment doubles every ${n(dd)} years. The time ${M.v("Y")} (in years) it takes to grow by a factor of ${T}`;
          rule = `${M.v("Y")} = ${n(dd)} ${logb(2)} ${T}`; why = `a constant times the logarithm of ${T} (count the doublings: ${M.sup("2", `${M.v("Y")}/${n(dd)}`)} = ${T})`; params = { sc, dd };
        }
        const fam = [0, 1, 2, 3, 4, 5, 6, 7];
        const famName = (k) => (k === 6 ? `Exponential (${y} = ${M.sup(M.v("b"), x)})` : k === 7 ? `Logarithmic (${y} = ${logb(M.v("b"))} ${x})` : `${PAR[k].name} (${PAR[k].eq})`);
        const opts = r.shuffle([sc, ...r.sample(fam.filter((k) => k !== sc), 3)]);
        params.opts = opts;
        return {
          prompt: `${prompt} follows which family of graphs?`,
          steps: [
            `Write the rule: ${rule}.`,
            `It is ${why}.`,
            `So it belongs to the ${famName(sc).replace(/^\w/, (c) => c.toLowerCase())} family.`,
          ],
          answer: { kind: "choice", options: opts.map(famName), index: opts.indexOf(sc) }, answerText: famName(sc),
          vals: {}, params, consts: [3],
        };
      },
    },

    // ---- A2.3 Even and odd ---------------------------------------------------------------------------
    "A2.even-odd": {
      title: "Even and odd functions",
      generate(r, level) {
        const mx = `−${x}`, fm = `${fn}(${mx})`;
        const OPTS = ["Even", "Odd", "Neither"];
        if (level === 1) {
          // coefficients by power 0..5
          for (;;) {
            const kind = r.int(0, 2);
            const c = [0, 0, 0, 0, 0, 0];
            const pows = kind === 0 ? r.sample([4, 2, 0], 2) : kind === 1 ? r.sample([5, 3, 1], 2) : [r.pick([4, 2, 0]), r.pick([3, 1])];
            pows.forEach((p) => { c[p] = r.nonzero(-7, 7); });
            const top = Math.max(...pows);
            const coefs = c.slice(0, top + 1).reverse();               // highest power first
            const neg = coefs.map((v, i) => ((top - i) % 2 ? -v : v)); // f(−x)
            const f = M.poly(coefs), fneg = M.poly(neg), mf = M.poly(coefs.map((v) => -v));
            const subst = coefs.map((v, i) => [v, top - i]).filter(([v]) => v !== 0).map(([v, p], j) => {
              const mag = Math.abs(v), pow = p === 1 ? `(${mx})` : M.sup(`(${mx})`, p);
              const body = p === 0 ? n(mag) : mag === 1 ? pow : `${n(mag)}${pow}`;
              return j === 0 ? (v < 0 ? "−" : "") + body : ` ${v < 0 ? "−" : "+"} ${body}`;
            }).join("");
            const verdict = kind === 0 ? `This is ${fn}(${x}) itself, so ${fn} is even. (Only even powers appear.)`
              : kind === 1 ? `This is −${fn}(${x}) = ${mf}, so ${fn} is odd. (Only odd powers appear.)`
              : `It is neither ${fn}(${x}) = ${f} nor −${fn}(${x}) = ${mf}, so ${fn} is neither even nor odd. (It mixes even and odd powers.)`;
            return {
              prompt: `Is ${M.eq(`${fn}(${x}) = ${f}`)} even, odd or neither?`,
              steps: [
                `Replace ${x} with ${mx}: ${fm} = ${subst}.`,
                `An even power of ${mx} equals the same power of ${x}; an odd power flips the sign. So ${fm} = ${fneg}.`,
                verdict,
              ],
              answer: { kind: "choice", options: OPTS, index: kind }, answerText: OPTS[kind],
              vals: {}, params: { coefs }, consts: [3, 4, 5],
            };
          }
        }
        if (level === 2) {
          const a = r.nonzero(-6, 6), b = r.int(1, 9), t = r.int(0, 8);
          const x2 = M.sup(x, 2), x3 = M.sup(x, 3), mx2 = M.sup(`(${mx})`, 2), mx3 = M.sup(`(${mx})`, 3);
          const T = [
            { f: M.frac(kv(a, x3), `${x2} + ${n(b)}`), s: M.frac(`${cs(a)}${mx3}`, `${mx2} + ${n(b)}`), r: M.frac(kv(-a, x3), `${x2} + ${n(b)}`), k: 1, why: "an odd top over an even bottom" },
            { f: `${kv(a, x2)} + ${kv(b, `|${x}|`)}`, s: `${cs(a)}${mx2} + ${kv(b, `|${mx}|`)}`, r: `${kv(a, x2)} + ${kv(b, `|${x}|`)}`, k: 0, why: `${x2} and |${x}| are both even` },
            { f: kv(a, `${x}|${x}|`), s: `${cs(a)}(${mx})|${mx}|`, r: kv(-a, `${x}|${x}|`), k: 1, why: "odd × even = odd" },
            { f: M.frac(M.poly([a, 0, b]), x), s: M.frac(`${cs(a)}${mx2} + ${n(b)}`, mx), r: `−${M.frac(M.poly([a, 0, b]), x)}`, k: 1, why: "an even top over an odd bottom" },
            { f: M.sqrt(`${x2} + ${n(b)}`), s: M.sqrt(`${mx2} + ${n(b)}`), r: M.sqrt(`${x2} + ${n(b)}`), k: 0, why: `only ${x2} appears inside` },
            { f: `|${M.poly([1, b])}|`, s: `|${mx} + ${n(b)}|`, r: `|${M.poly([1, -b])}|`, k: 2, why: `the shift by ${n(b)} breaks the symmetry`,
              cmp: `−${fn}(${x}) = −|${M.poly([1, b])}|` },
            { f: M.poly([1, 0, 0, a]), s: `${mx3}${M.term(a, "")}`, r: M.poly([-1, 0, 0, a]), k: 2, why: `${x3} is odd but the constant ${n(a)} is even`,
              cmp: `−${fn}(${x}) = ${M.poly([-1, 0, 0, -a])}` },
            { f: `(${M.poly([1, 0, a, 0])})(${M.poly([1, 0, b])})`, s: `(${mx3}${M.term(a, `(${mx})`)})(${mx2} + ${n(b)})`, r: `−(${M.poly([1, 0, a, 0])})(${M.poly([1, 0, b])})`, k: 1, why: "odd × even = odd" },
            { f: `(${M.poly([1, 0, a, 0])})(${M.poly([1, 0, -b, 0])})`, s: `(${mx3}${M.term(a, `(${mx})`)})(${mx3}${M.term(-b, `(${mx})`)})`, r: `(${M.poly([1, 0, a, 0])})(${M.poly([1, 0, -b, 0])})`, k: 0, why: "odd × odd = even (two sign flips cancel)" },
          ][t];
          const verdict = T.k === 0 ? `That is ${fn}(${x}), so ${fn} is even: ${T.why}.`
            : T.k === 1 ? `That is −${fn}(${x}), so ${fn} is odd: ${T.why}.`
            : `That is neither ${fn}(${x}) nor ${T.cmp}, so ${fn} is neither: ${T.why}.`;
          return {
            prompt: `Is ${M.eq(`${fn}(${x}) = ${T.f}`)} even, odd or neither?`,
            steps: [`Replace ${x} with ${mx}: ${fm} = ${T.s}.`, `Simplify (${mx2} = ${x2}, ${mx3} = −${x3}, |${mx}| = |${x}|): ${fm} = ${T.r}.`, verdict],
            answer: { kind: "choice", options: OPTS, index: T.k }, answerText: OPTS[T.k],
            vals: {}, params: { t, a, b }, consts: [3],
          };
        }
        // level 3
        if (r.chance(0.5)) {
          // read f(c) from the right half of the graph, then use the symmetry
          for (;;) {
            const odd = r.chance(0.5);
            const ys = [odd ? 0 : r.int(-3, 3)];
            for (let k = 1; k <= 4; k++) ys.push(Math.max(-4, Math.min(4, ys[k - 1] + r.int(-3, 3))));
            const c = r.int(1, 4), fc = ys[c];
            if (fc === 0 || new Set(ys).size < 3) continue;
            const ans = odd ? -fc : fc;
            const items = [];
            for (let k = 0; k < 4; k++) items.push({ t: "seg", a: [k, ys[k]], b: [k + 1, ys[k + 1]] });
            ys.forEach((v, k) => items.push({ t: "pt", x: k, y: v }));
            return {
              prompt: `${fn} is ${odd ? "odd" : "even"}. Its graph for ${x} ≥ 0 is drawn: straight segments joining grid points. Find ${M.eq(`${fn}(−${n(c)})`)}`,
              graph: graph({ view: [-4, 4, -4, 4], equal: true, items }),
              steps: [
                `Read the graph at ${x} = ${n(c)}: ${fn}(${n(c)}) = ${n(fc)}.`,
                odd ? `Odd means ${fm} = −${fn}(${x}): the left half is the right half turned a half-turn about the origin.` : `Even means ${fm} = ${fn}(${x}): the left half is the mirror image of the right half in the y-axis.`,
                odd ? `${fn}(−${n(c)}) = −${fn}(${n(c)}) = ${fc > 0 ? n(ans) : `−${np(fc)} = ${n(ans)}`}.` : `${fn}(−${n(c)}) = ${fn}(${n(c)}) = ${n(ans)}.`,
              ],
              answer: num(ans), answerText: n(ans), answerInput: String(ans),
              vals: { fc, ans }, params: { odd: odd ? 1 : 0, ys, c },
            };
          }
        }
        // even–odd decomposition of a polynomial
        const deg = r.pick([3, 4]);
        const coefs = Array.from({ length: deg + 1 }, (_, i) => (i === 0 ? r.nonzero(-5, 5) : r.nonzero(-9, 9)));
        const neg = coefs.map((v, i) => ((deg - i) % 2 ? -v : v));
        const wantEven = r.chance(0.5);
        const sum = coefs.map((v, i) => (wantEven ? v + neg[i] : v - neg[i]));
        const part = sum.map((v) => v / 2);
        const name = wantEven ? M.v("E") : M.v("O");
        return {
          prompt: `Split ${M.eq(`${fn}(${x}) = ${M.poly(coefs)}`)} into an even part plus an odd part. Find the ${wantEven ? "even" : "odd"} part ${name}(${x}) = ${M.frac(`${fn}(${x}) ${wantEven ? "+" : "−"} ${fm}`, "2")}.`,
          steps: [
            `${fm} = ${M.poly(neg)} (odd powers flip sign).`,
            `${fn}(${x}) ${wantEven ? "+" : "−"} ${fm} = ${M.poly(sum)}: the ${wantEven ? "odd" : "even"} powers cancel and the ${wantEven ? "even" : "odd"} ones double.`,
            `Halve: ${name}(${x}) = ${M.poly(part)}. It is just the ${wantEven ? "even" : "odd"}-power terms of ${fn}.`,
          ],
          answer: { kind: "expr", expr: pstr(part), vars: ["x"], form: "expanded" }, answerText: `${name}(${x}) = ${M.poly(part)}`,
          answerInput: ptyped(part),
          vals: { neg, sum, part }, params: { coefs, even: wantEven ? 1 : 0 }, consts: [3, 4],
        };
      },
    },

    // ---- A2.4 Piecewise and step functions ---------------------------------------------------------------
    "A2.piecewise": {
      title: "Piecewise and step functions",
      generate(r, level) {
        if (level === 1) {
          const c = r.int(-2, 2), m1 = r.nonzero(-3, 3), b1 = r.int(-4, 4);
          const quad = r.chance(0.5), m2 = r.nonzero(-3, 3), b2 = r.int(-4, 4), e = r.int(-4, 2);
          const t = r.chance(0.3) ? c : r.intExcept(c - 3, c + 3, c);
          const p1 = M.poly([m1, b1]), p2 = quad ? M.poly([1, 0, e]) : M.poly([m2, b2]);
          const left = t < c;
          let ans, calc, vals;
          if (left) { ans = m1 * t + b1; calc = `${times(m1, t)}${M.term(b1, "")} = ${n(ans)}`; vals = { ans }; }
          else if (quad) { ans = t * t + e; calc = `${M.sup(np(t), 2)}${M.term(e, "")} = ${n(t * t)}${M.term(e, "")} = ${n(ans)}`; vals = { tt: t * t, ans }; }
          else { ans = m2 * t + b2; calc = `${times(m2, t)}${M.term(b2, "")} = ${n(ans)}`; vals = { ans }; }
          const e2 = quad ? `x^2 + (${e})` : `${m2}*x + (${b2})`;
          return {
            prompt: `${M.eq(`${fn}(${x}) = ${cases([[p1, `${x} ${lt} ${n(c)}`], [p2, `${x} ≥ ${n(c)}`]])}`)} Find ${fn}(${n(t)}).`,
            graph: graph({ view: [-6, 6, -8, 8], items: [
              { t: "fn", e: `${m1}*x + (${b1}) + 0*sqrt((${c}) - x)` },
              { t: "fn", e: `${e2} + 0*sqrt(x - (${c}))` },
              { t: "pt", x: c, y: quad ? c * c + e : m2 * c + b2 },
            ].filter((it) => it.t !== "pt" || Math.abs(it.y) <= 8) }),
            steps: [
              t === c ? `${x} = ${n(t)} is the boundary. The second piece includes it (${x} ≥ ${n(c)}), so use ${p2}.`
                : `${n(t)} ${left ? lt : "≥"} ${n(c)}, so ${x} = ${n(t)} lies in the ${left ? "first" : "second"} piece: use ${left ? p1 : p2}.`,
              `${fn}(${n(t)}) = ${calc}.`,
            ],
            answer: num(ans), answerText: n(ans), answerInput: String(ans),
            vals, params: { c, m1, b1, quad: quad ? 1 : 0, m2, b2, e, t },
          };
        }
        if (level === 2) {
          const kinds = r.sample([0, 1, 2, 3], 3);   // 0 floor, 1 ceiling, 2 sgn, 3 ReLU
          const us = [], vs = [], sg = [1, r.sign(), r.sign()];
          const names = [];
          const steps = [];
          kinds.forEach((k, j) => {
            let u10;
            do u10 = r.int(-49, 49); while ((k <= 1 || k === 3) && u10 % 10 === 0);
            if (k === 2 && r.chance(0.2)) u10 = 0;
            const u = u10 / 10;
            let v, txt;
            if (k === 0) { v = Math.floor(u); names.push(`⌊${n(u)}⌋`); txt = `⌊${n(u)}⌋ = ${n(v)}: the greatest integer ≤ ${n(u)}${u < 0 ? " (rounding down moves left, away from zero)" : ""}.`; }
            else if (k === 1) { v = Math.ceil(u); names.push(`⌈${n(u)}⌉`); txt = `⌈${n(u)}⌉ = ${n(v)}: the least integer ≥ ${n(u)}${u < 0 ? " (rounding up moves right, toward zero)" : ""}.`; }
            else if (k === 2) { v = Math.sign(u) + 0; names.push(`sgn(${n(u)})`); txt = `sgn(${n(u)}) = ${n(v)}: ${u > 0 ? "the input is positive" : u < 0 ? "the input is negative" : "the input is 0"}.`; }
            else { v = Math.max(0, u); names.push(`ReLU(${n(u)})`); txt = `ReLU(${n(u)}) = max(0, ${n(u)}) = ${n(v)}.`; }
            us.push(u); vs.push(v); steps.push(txt);
          });
          const expr = names.map((s, j) => (j === 0 ? s : ` ${sg[j] > 0 ? "+" : "−"} ${s}`)).join("");
          const ans10 = vs.reduce((acc, v, j) => acc + sg[j] * Math.round(v * 10), 0), ans = ans10 / 10;
          steps.push(`Combine: ${vs.map((v, j) => (j === 0 ? n(v) : ` ${sg[j] > 0 ? "+" : "−"} ${np(v)}`)).join("")} = ${n(ans)}.`);
          return {
            prompt: `Evaluate ${M.eq(expr)}`,
            steps, answer: num(ans), answerText: n(ans), answerInput: String(ans),
            vals: { vs, ans }, params: { kinds, us, sg },
          };
        }
        // level 3
        if (r.chance(0.5)) {
          // parking: a for the first hour (or part), b for each further hour or part, daily cap
          const a = r.pick([3, 4, 5, 6]), b = r.pick([1.5, 2, 2.5, 3]), H = r.int(1, 7), Mi = r.int(1, 59);
          const raw = a + b * H, capped = r.chance(0.35), capV = capped ? Math.floor(raw) - r.int(1, 2) : raw + r.int(2, 8);
          if (capV <= a + b) return this.generate(r, level);
          const cost = Math.min(raw, capV);
          return {
            prompt: `A parking garage charges ${P.money(a)} for the first hour or any part of it, then ${P.money(b)} for each additional hour or part of an hour, up to ${P.money(capV)} a day. How much does it cost to park for ${n(H)} h ${n(Mi)} min? Answer in dollars.`,
            steps: [
              `With ${M.v("t")} in hours (${M.v("t")} &gt; 1), the charge is ${M.v("C")}(${M.v("t")}) = ${n(a)} + ${n(b)}⌈${M.v("t")} − 1⌉, capped at ${n(capV)}: a step rule that jumps at every whole hour.`,
              `After the first hour there remain ${H > 1 ? `${n(H - 1)} h ` : ""}${n(Mi)} min. Every started hour counts in full, so that is ${n(H)} more hour${H === 1 ? "" : "s"}.`,
              `${n(a)} + ${n(b)} × ${n(H)} = ${n(raw)}.`,
              capped ? `That is above the daily cap, so the charge is ${P.money(cost)}.` : `That is below the daily cap of ${P.money(capV)}, so the charge is ${P.money(cost)}.`,
            ],
            answer: num(cost), answerText: P.money(cost), answerInput: String(cost),
            vals: { Hm1: H - 1, raw, cost }, params: { a, b, H, Mi, cap: capV },
          };
        }
        // continuity: find k
        for (;;) {
          const a = r.nonzero(-4, 4), b = r.int(-6, 6), c = r.nonzero(-3, 3), quad = r.chance(0.5);
          const L = a * c + b;
          const left = M.poly([a, b]);
          if (quad) {
            const k = L - c * c;
            return {
              prompt: `For which value of ${M.v("k")} is ${M.eq(`${fn}(${x}) = ${cases([[left, `${x} ${lt} ${n(c)}`], [`${M.sup(x, 2)} + ${M.v("k")}`, `${x} ≥ ${n(c)}`]])}`)} continuous (no jump at ${x} = ${n(c)})?`,
              steps: [
                `Each piece is continuous on its own, so only the break at ${x} = ${n(c)} matters: the two pieces must meet there.`,
                `The left piece approaches ${n(a)} · ${np(c)}${M.term(b, "")} = ${n(L)}. The right piece gives ${M.sup(np(c), 2)} + ${M.v("k")} = ${n(c * c)} + ${M.v("k")}.`,
                `Set them equal: ${n(c * c)} + ${M.v("k")} = ${n(L)}, so ${M.v("k")} = ${n(L)} − ${n(c * c)} = ${n(k)}.`,
              ],
              answer: num(k), answerText: `${M.v("k")} = ${n(k)}`, answerInput: String(k),
              vals: { L, cc: c * c, k }, params: { a, b, c, quad: 1, d: 0 },
            };
          }
          const k = r.intExcept(-5, 5, 0, a), d = L - k * c;
          return {
            prompt: `For which value of ${M.v("k")} is ${M.eq(`${fn}(${x}) = ${cases([[left, `${x} ${lt} ${n(c)}`], [`${M.v("k")}${x}${M.term(d, "")}`, `${x} ≥ ${n(c)}`]])}`)} continuous (no jump at ${x} = ${n(c)})?`,
            steps: [
              `Each piece is a line, so only the break at ${x} = ${n(c)} matters: the two pieces must meet there.`,
              `The left piece approaches ${n(a)} · ${np(c)}${M.term(b, "")} = ${n(L)}. The right piece gives ${M.v("k")} · ${np(c)}${M.term(d, "")}.`,
              `Set them equal: ${kv(c, M.v("k"))}${M.term(d, "")} = ${n(L)}, so ${kv(c, M.v("k"))} = ${n(L)} − ${np(d)} = ${n(L - d)} and ${M.v("k")} = ${M.frac(n(L - d), n(c))} = ${n(k)}.`,
            ],
            answer: num(k), answerText: `${M.v("k")} = ${n(k)}`, answerInput: String(k),
            vals: { L, Ld: L - d, k }, params: { a, b, c, quad: 0, d },
          };
        }
      },
    },

    // ---- A2.5 Transformations -------------------------------------------------------------------------------
    "A2.2": {
      title: "Transformations of graphs",
      generate(r, level) {
        if (level === 1) {
          const p = r.int(-6, 6), q = r.int(-6, 6), h = r.nonzero(-6, 6), k = r.nonzero(-6, 6);
          const X = p + h, Y = q + k;
          return {
            prompt: `The point (${n(p)}, ${n(q)}) is on the graph of ${y} = ${fn}(${x}). Which point must be on the graph of ${M.eq(`${y} = ${fn}(${M.poly([1, -h])})${M.term(k, "")}`)}`,
            steps: [
              `Inside the brackets, ${h > 0 ? M.poly([1, -h]) : `${M.poly([1, -h])} = ${x} − ${np(h)}`} shifts the graph ${h > 0 ? "right" : "left"} ${n(Math.abs(h))} (opposite to the sign you see). New ${x}: ${n(p)} + ${np(h)} = ${n(X)}.`,
              `Outside, ${M.term(k, "").trim()} shifts it ${k > 0 ? "up" : "down"} ${n(Math.abs(k))}. New ${y}: ${n(q)} + ${np(k)} = ${n(Y)}.`,
              `The point moves to (${n(X)}, ${n(Y)}).`,
            ],
            answer: { kind: "point", value: [X, Y] }, answerText: `(${n(X)}, ${n(Y)})`, answerInput: `(${X}, ${Y})`,
            vals: { X, Y }, params: { p, q, h, k },
          };
        }
        if (level === 2) {
          const b = r.pick([-2, -1, 2, 3]), h = r.int(-4, 4), k = r.nonzero(-6, 6), a = r.pick([F(-3), F(-2), F(-1), F(2), F(3), F(1, 2)]);
          const q = a.d === 2 ? 2 * r.int(-3, 3) : r.int(-5, 5);
          const p = r.chance(0.7) ? b * r.int(-3, 3) : r.int(-6, 6);
          const c0 = -b * h, pb = F(p, b), X = pb.add(h), aq = a.mul(q), Y = aq.add(k);
          const aTxt = a.eq(1) ? "" : a.eq(-1) ? "−" : ff(a);
          return {
            prompt: `The point (${n(p)}, ${n(q)}) is on the graph of ${y} = ${fn}(${x}). Which point must be on the graph of ${M.eq(`${y} = ${aTxt}${fn}(${M.poly([b, c0])})${M.term(k, "")}`)}`,
            steps: [
              h === 0 ? `The inside is ${kv(b)}: no shift, only a horizontal scale by ${n(b)}.` : `Factor ${n(b)} out of the inside: ${M.poly([b, c0])} = ${n(b)}(${M.poly([1, -h])}). So ${M.v("b")} = ${n(b)} and ${M.v("h")} = ${n(h)}.`,
              `Horizontal: divide the ${x}-coordinate by ${M.v("b")}, then add ${M.v("h")}: ${M.frac(n(p), n(b))} + ${np(h)} = ${ff(pb)} + ${np(h)} = ${ff(X)}.${b < 0 ? ` (A negative ${M.v("b")} also reflects in the y-axis.)` : ""}`,
              `Vertical: multiply the ${y}-coordinate by ${M.v("a")} = ${ff(a)}, then add ${M.v("k")} = ${n(k)}: ${ff(a)} · ${np(q)} + ${np(k)} = ${ff(aq)} + ${np(k)} = ${ff(Y)}.${a.n < 0 ? ` (A negative ${M.v("a")} also reflects in the x-axis.)` : ""}`,
              `The point moves to (${ff(X)}, ${ff(Y)}).`,
            ],
            answer: { kind: "point", value: [X.value, Y.value] }, answerText: `(${ff(X)}, ${ff(Y)})`, answerInput: `(${typed(X)}, ${typed(Y)})`,
            vals: { c0, pb: fv(pb), X: fv(X), aq: fv(aq), Y: fv(Y) }, params: { p, q, a: fv(a), b, h, k },
          };
        }
        // level 3: read a transformed parent from its graph
        const par = r.int(0, 2);   // 0 |x|, 1 x², 2 √x
        const h = r.int(-3, 3), k = r.int(-3, 3);
        const a = par === 1 ? r.pick([F(-2), F(-1), F(-1, 2), F(1, 2), F(1), F(2)]) : par === 0 ? r.pick([F(-3), F(-2), F(-1), F(1), F(2), F(3)]) : r.pick([F(-2), F(-1), F(1), F(2)]);
        const step = a.d === 2 ? 2 : 1, rise = par === 1 ? step * step : par === 0 ? step : 1;
        const dy = a.mul(rise);                    // the change from the vertex after `step` to the right
        const pts = [[h, k], [h + step, k + dy.value]];
        if (par !== 2) pts.push([h - step, k + dy.value]);
        if (par === 2 && Math.abs(2 * a.value) <= 4) pts.push([h + 4, k + 2 * a.value]);
        const parE = ["abs(x)", "x^2", "sqrt(x)"][par], parT = [`|${x}|`, M.sup(x, 2), M.sqrt(x)][par];
        const shape = ["a V shape: the parent is |x|", "a U-shaped parabola: the parent is x²", "half a sideways parabola with a starting point: the parent is √x"][par];
        const inner = M.poly([1, -h]);
        const body = [`|${inner}|`, h === 0 ? M.sup(x, 2) : M.sup(`(${inner})`, 2), M.sqrt(inner)][par];
        const aTxt = a.eq(1) ? "" : a.eq(-1) ? "−" : ff(a);
        const eqn = `${y} = ${aTxt}${body}${M.term(k, "")}`;
        const view = [h - 4, h + 4, a.n > 0 ? k - 2 : k - 6, a.n > 0 ? k + 6 : k + 2];
        const parentRise = par === 1 ? `${M.sup(n(step), 2)} = ${n(rise)}` : n(rise);
        const exprStr = `(${typed(a)})*${["abs", "", "sqrt"][par]}(x - (${h}))${par === 1 ? "^2" : ""} + (${k})`;
        const aIn = a.eq(1) ? "" : a.eq(-1) ? "-" : a.isInt() ? String(a.n) : `(${typed(a)})`;
        const hIn = ptyped([1, -h]);
        const typedEq = `${aIn}${["abs", "", "sqrt"][par]}(${hIn})${par === 1 ? "^2" : ""}${k ? (k > 0 ? ` + ${k}` : ` - ${-k}`) : ""}`;
        const steps = [
          `The graph is ${shape}. So ${y} = ${M.v("a")}·${M.v("f")}(${x} − ${M.v("h")}) + ${M.v("k")} with ${M.v("f")}(${x}) = ${parT}.`,
          `The ${par === 2 ? "starting point" : "vertex"} is at (${n(h)}, ${n(k)}), so ${M.v("h")} = ${n(h)} and ${M.v("k")} = ${n(k)}.`,
          `From there, ${n(step)} to the right the graph ${dy.n > 0 ? "rises" : "falls"} ${ff(dy.abs())}, while the parent rises ${parentRise}. So ${M.v("a")} = ${M.frac(ff(dy), n(rise))} = ${ff(a)}.`,
          `${eqn}.`,
        ];
        const g = graph({ view, items: [{ t: "fn", e: exprStr }, ...pts.map(([px, py]) => ({ t: "pt", x: px, y: py }))] });
        const vals = { step, rise, dy: fv(dy), a: fv(a), h, k };
        if (par === 2) {
          return {
            prompt: `The graph is a parent graph (${M.sup(x, 2)}, |${x}| or ${M.sqrt(x)}) stretched and shifted: ${y} = ${M.v("a")}·${M.v("f")}(${x} − ${M.v("h")}) + ${M.v("k")}. The marked points sit on grid corners. Find ${M.v("a")}, ${M.v("h")} and ${M.v("k")}, in that order.`,
            graph: g, steps, answer: { kind: "numbers", values: [a.value, h, k], ordered: true }, answerText: `${M.v("a")} = ${ff(a)}, ${M.v("h")} = ${n(h)}, ${M.v("k")} = ${n(k)}: ${eqn}`,
            answerInput: `${typed(a)}, ${h}, ${k}`, vals, params: { par, pts }, consts: [4],
          };
        }
        return {
          prompt: `The graph is a parent graph (${M.sup(x, 2)}, |${x}| or ${M.sqrt(x)}) stretched and shifted: ${y} = ${M.v("a")}·${M.v("f")}(${x} − ${M.v("h")}) + ${M.v("k")}. The marked points sit on grid corners. Write its equation.`,
          graph: g, steps, answer: { kind: "expr", expr: exprStr, vars: ["x"] }, answerText: eqn, answerInput: typedEq,
          vals, params: { par, pts }, consts: [4],
        };
      },
    },

    // ---- A2.6 Complex numbers ---------------------------------------------------------------------------------
    "A2.3": {
      title: "Complex numbers",
      generate(r, level) {
        const expr = (a, b) => ({ kind: "expr", expr: cxExpr(a, b), vars: ["i"] });
        if (level === 1) {
          if (r.chance(0.5)) {
            const a = r.int(-9, 9), b = r.nonzero(-9, 9), c = r.int(-9, 9), d = r.nonzero(-9, 9), sub = r.chance(0.5);
            const re = sub ? a - c : a + c, im = sub ? b - d : b + d, op = sub ? "−" : "+";
            return {
              prompt: `${sub ? "Subtract" : "Add"} and write in the form ${M.v("a")} + ${M.v("b")}${I}: ${M.eq(`(${cx(a, b)}) ${op} (${cx(c, d)})`)}`,
              steps: [
                `Combine the real parts and the imaginary parts separately, like like terms.`,
                `Real: ${n(a)} ${op} ${np(c)} = ${n(re)}. Imaginary: ${n(b)} ${op} ${np(d)} = ${n(im)}.`,
                `${cx(re, im)}.`,
              ],
              answer: expr(re, im), answerText: cx(re, im), answerInput: cxTyped(re, im),
              vals: { re, im }, params: { a, b, c, d, sub: sub ? 1 : 0, kind: 0 },
            };
          }
          const N = r.int(5, 99), q = Math.floor(N / 4), m = N % 4;
          const res = [[1, 0], [0, 1], [-1, 0], [0, -1]][m];
          return {
            prompt: `Simplify ${M.eq(M.sup(I, N))}`,
            steps: [
              `Powers of ${I} repeat every 4: ${M.sup(I, 1)} = ${I}, ${M.sup(I, 2)} = −1, ${M.sup(I, 3)} = −${I}, ${M.sup(I, 4)} = 1.`,
              `Divide the exponent by 4: ${n(N)} = 4 · ${n(q)} + ${n(m)}.`,
              `${M.sup(I, N)} = ${M.sup(`(${M.sup(I, 4)})`, q)} · ${M.sup(I, m)} = ${M.sup("1", q)} · ${M.sup(I, m)} = ${cx(...res)}.`,
            ],
            answer: expr(...res), answerText: cx(...res), answerInput: cxTyped(...res),
            vals: { q, m }, params: { N, kind: 1 }, consts: [3, 4],
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const a = r.nonzero(-6, 6), b = r.nonzero(-6, 6), c = r.nonzero(-6, 6), d = r.nonzero(-6, 6);
            const ac = a * c, ad = a * d, bc = b * c, bd = b * d, re = ac - bd, im = ad + bc;
            return {
              prompt: `Multiply and write in the form ${M.v("a")} + ${M.v("b")}${I}: ${M.eq(`(${cx(a, b)})(${cx(c, d)})`)}`,
              steps: [
                `FOIL: first ${n(a)} · ${np(c)} = ${n(ac)}; outer ${n(a)} · ${cxp(0, d)} = ${cx(0, ad)}; inner ${cxp(0, b)} · ${np(c)} = ${cx(0, bc)}; last ${cxp(0, b)} · ${cxp(0, d)} = ${n(bd)}${M.sup(I, 2)}.`,
                `= ${n(ac)}${M.term(ad, I)}${M.term(bc, I)}${M.term(bd, M.sup(I, 2))}.`,
                `Replace ${M.sup(I, 2)} with −1: ${M.term(bd, M.sup(I, 2), { first: true })} = ${n(-bd)}.`,
                `Real part: ${n(ac)} − ${np(bd)} = ${n(re)}. Imaginary part: ${n(ad)} + ${np(bc)} = ${n(im)}. So ${cx(re, im)}.`,
              ],
              answer: expr(re, im), answerText: cx(re, im), answerInput: cxTyped(re, im),
              vals: { ac, ad, bc, bd, nbd: -bd, re, im }, params: { a, b, c, d, kind: 0 },
            };
          }
          const [u, v, m] = r.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10]]);
          const a = u * r.sign(), b = v * r.sign();
          const view = [Math.min(0, a) - 1, Math.max(0, a) + 1, Math.min(0, b) - 1, Math.max(0, b) + 1];
          return {
            prompt: `The point ${M.v("z")} in the complex plane is drawn (real part across, imaginary part up). Find |${M.v("z")}|.`,
            graph: graph({ view, items: [{ t: "vec", a: [0, 0], b: [a, b] }, { t: "pt", x: a, y: b, label: "z" }] }),
            steps: [
              `Read the point: ${M.v("z")} = ${cx(a, b)}, at (${n(a)}, ${n(b)}).`,
              `The modulus is the distance from 0: |${M.v("z")}| = ${M.sqrt(`${M.sup(np(a), 2)} + ${M.sup(np(b), 2)}`)} = ${M.sqrt(`${n(a * a)} + ${n(b * b)}`)} = ${M.sqrt(n(m * m))} = ${n(m)}.`,
            ],
            answer: num(m), answerText: n(m), answerInput: String(m),
            vals: { a, b, aa: a * a, bb: b * b, mm: m * m, m }, params: { a, b, kind: 1 },
          };
        }
        // level 3
        if (r.chance(0.5)) {
          for (;;) {
            const a = r.int(-9, 9), b = r.int(-9, 9), c = r.nonzero(-3, 3), d = r.nonzero(-3, 3);
            if (a === 0 || b === 0) continue;
            const D = c * c + d * d, reN = a * c + b * d, imN = b * c - a * d;
            if (reN === 0 || imN === 0) continue;
            const re = F(reN, D), im = F(imN, D);
            if (re.isInt() && im.isInt() && r.chance(0.6)) continue;
            return {
              prompt: `Divide and write in the form ${M.v("a")} + ${M.v("b")}${I}: ${M.eq(M.frac(cx(a, b), cx(c, d)))}`,
              steps: [
                `Multiply the top and bottom by the conjugate of the bottom, ${cx(c, -d)}.`,
                `Top: (${cx(a, b)})(${cx(c, -d)}) = ${n(a * c)}${M.term(-a * d, I)}${M.term(b * c, I)}${M.term(-b * d, M.sup(I, 2))} = ${cx(reN, imN)} (since ${M.sup(I, 2)} = −1).`,
                `Bottom: (${cx(c, d)})(${cx(c, -d)}) = ${M.sup(np(c), 2)} + ${M.sup(np(d), 2)} = ${n(D)}, a real number.`,
                `Split: ${M.frac(n(reN), n(D))} ${imN < 0 ? "−" : "+"} ${M.frac(n(Math.abs(imN)), n(D))}${I} = ${cx(re, im)}.`,
              ],
              answer: expr(re, im), answerText: cx(re, im), answerInput: cxTyped(re, im),
              vals: { ac: a * c, ad: -a * d, bc: b * c, bd: -b * d, D, reN, imN, re: fv(re), im: fv(im) }, params: { a, b, c, d, kind: 0 },
            };
          }
        }
        const A = r.pick([1, 1, 2]), h = r.int(-4, 4), k = r.int(1, 5);
        const B = -2 * A * h, C = A * (h * h + k * k), D = B * B - 4 * A * C, s = 2 * A * k;
        return {
          prompt: `Solve ${M.eq(`${M.poly([A, B, C])} = 0`)} Enter the solution with the positive imaginary part, in the form ${M.v("a")} + ${M.v("b")}${I}.`,
          steps: [
            `${M.v("a")} = ${n(A)}, ${M.v("b")} = ${n(B)}, ${M.v("c")} = ${n(C)}. Discriminant: ${M.sup(np(B), 2)} − 4 · ${n(A)} · ${n(C)} = ${n(B * B)} − ${n(4 * A * C)} = ${n(D)}, negative: no real roots.`,
            `${M.sqrt(n(D))} = ${I}${M.sqrt(n(-D))} = ${n(s)}${I}.`,
            `${x} = ${M.frac(`${B === 0 ? "" : `${n(-B)} `}± ${n(s)}${I}`, n(2 * A))} = ${cx(h, k)} or ${cx(h, -k)}. Real coefficients give a conjugate pair, as the conjugate root theorem says.`,
          ],
          answer: expr(h, k), answerText: `${x} = ${cx(h, k)}`, answerInput: cxTyped(h, k),
          vals: { BB: B * B, ac4: 4 * A * C, D, nD: -D, s, nB: -B, twoA: 2 * A, h, k }, params: { a: A, b: B, c: C, kind: 1 }, consts: [4],
        };
      },
    },

    // ---- A2.7 Polynomial division ---------------------------------------------------------------------------
    "A2.poly-division": {
      title: "Polynomial long and synthetic division",
      generate(r, level) {
        /** Synthetic division of coefs (highest first, ints) by x − c: { prods, sums } (the last sum is the remainder). */
        const synDiv = (coefs, c) => {
          const sums = [coefs[0]], prods = [];
          for (let i = 1; i < coefs.length; i++) { prods.push(c * sums[i - 1]); sums.push(coefs[i] + c * sums[i - 1]); }
          return { prods, sums };
        };
        const synSteps = (coefs, c, { prods, sums }) => {
          const out = [`Bring down the leading coefficient ${n(sums[0])}.`];
          for (let i = 1; i < coefs.length; i++) {
            out.push(`Multiply by ${n(c)}: ${n(c)} · ${np(sums[i - 1])} = ${n(prods[i - 1])}. Add it to ${n(coefs[i])}: ${n(coefs[i])} + ${np(prods[i - 1])} = ${n(sums[i])}${i === coefs.length - 1 ? `, the remainder` : ""}.`);
          }
          return out;
        };
        if (level === 1) {
          let rr, s;
          do { rr = r.nonzero(-6, 6); s = r.nonzero(-7, 7); } while (rr === s);
          const B = -(rr + s), C = rr * s, coefs = [1, B, C];
          const sd = synDiv(coefs, rr);
          return {
            prompt: `Use synthetic division to divide ${M.eq(`(${M.poly(coefs)}) ÷ (${M.poly([1, -rr])})`)}`,
            steps: [
              `Dividing by ${M.poly([1, -rr])} means using ${n(rr)} (the value that makes it zero). Write ${n(rr)}, then the coefficients ${coefs.map(n).join(", ")}.`,
              ...synSteps(coefs, rr, sd),
              `${synth(rr, coefs, sd.prods, sd.sums)}The bottom row ${n(sd.sums[0])}, ${n(sd.sums[1])} gives the quotient ${M.poly(sd.sums.slice(0, 2))}; the remainder is 0, so ${M.poly([1, -rr])} divides evenly.`,
            ],
            answer: { kind: "expr", expr: pstr([1, -s]), vars: ["x"] }, answerText: M.poly([1, -s]), answerInput: ptyped([1, -s]),
            vals: { prods: sd.prods, sums: sd.sums }, params: { coefs, c: rr },
          };
        }
        if (level === 2) {
          for (;;) {
            const c = r.nonzero(-3, 3), gap = r.pick([1, 2]);
            const coefs = [r.nonzero(-3, 3), r.nonzero(-6, 6), r.nonzero(-6, 6), r.nonzero(-9, 9)];
            coefs[gap] = 0;
            const sd = synDiv(coefs, c), R = sd.sums[3], Qc = sd.sums.slice(0, 3);
            if (R === 0 || Qc[1] === 0 && Qc[2] === 0) continue;
            const div = M.poly([1, -c]);
            const ansHtml = `${M.poly(Qc)} ${R < 0 ? "−" : "+"} ${M.frac(n(Math.abs(R)), div)}`;
            return {
              prompt: `Divide ${M.eq(`(${M.poly(coefs)}) ÷ (${div})`)} Write the result as ${M.v("Q")}(${x}) + ${M.frac(M.v("R"), div)}.`,
              steps: [
                `The ${gap === 1 ? M.sup(x, 2) : x}-term is missing: its coefficient is 0. Use ${n(c)} and the coefficients ${coefs.map(n).join(", ")}.`,
                ...synSteps(coefs, c, sd),
                `${synth(c, coefs, sd.prods, sd.sums)}Quotient (one degree lower): ${M.poly(Qc)}. Remainder: ${n(R)}.`,
                `${ansHtml}. Check: (${div})(${M.poly(Qc)}) ${R < 0 ? "−" : "+"} ${n(Math.abs(R))} expands back to ${M.poly(coefs)}.`,
              ],
              answer: { kind: "expr", expr: `${pstr(Qc)} + (${R})/(x - (${c}))`, vars: ["x"] }, answerText: ansHtml,
              answerInput: `${ptyped(Qc)} ${R < 0 ? "-" : "+"} ${Math.abs(R)}/(${ptyped([1, -c])})`,
              vals: { prods: sd.prods, sums: sd.sums }, params: { coefs, c }, consts: [3],
            };
          }
        }
        // level 3
        if (r.chance(0.5)) {
          // long division by a quadratic
          for (;;) {
            const p = r.int(-4, 4), q = r.nonzero(-5, 5), a = r.int(1, 3), s = r.nonzero(-5, 5), u = r.int(-4, 4), v = r.int(-6, 6);
            if (u === 0 && v === 0) continue;
            const D = [1, p, q], Qc = [a, s], Rc = [u, v];
            const Pc = ints(pmul(D, Qc)).map((c, i) => c + (i >= 2 ? Rc[i - 2] : 0));
            const m1 = [a, a * p, a * q], r1 = [Pc[1] - m1[1], Pc[2] - m1[2], Pc[3]];   // after the first subtraction
            const m2 = [s, s * p, s * q];
            const Dh = M.poly(D);
            const Rh = M.poly(Rc), Rneg = u < 0 || (u === 0 && v < 0);
            const ansHtml = `${M.poly(Qc)} ${Rneg ? "−" : "+"} ${M.frac(M.poly(Rneg ? [-u, -v] : Rc), Dh)}`;
            return {
              prompt: `Use long division: ${M.eq(`(${M.poly(Pc)}) ÷ (${Dh})`)} Write the result as ${M.v("Q")}(${x}) + ${M.frac(`${M.v("R")}(${x})`, Dh)}.`,
              steps: [
                `Divide the leading terms: ${kv(a, M.sup(x, 3))} ÷ ${M.sup(x, 2)} = ${kv(a)}. Multiply: ${kv(a)}(${Dh}) = ${M.poly([...m1, 0])}.`,
                `Subtract it from ${M.poly(Pc)}: the ${M.sup(x, 3)} terms cancel, leaving ${M.poly(r1)}.`,
                `Divide the new leading term: ${kv(s, M.sup(x, 2))} ÷ ${M.sup(x, 2)} = ${n(s)}. Multiply: ${n(s)}(${Dh}) = ${M.poly(m2)}.`,
                `Subtract: (${M.poly(r1)}) − (${M.poly(m2)}) = ${Rh}. Its degree is below 2, so it is the remainder.`,
                `Quotient ${M.poly(Qc)}, remainder ${Rh}: ${ansHtml}.`,
              ],
              answer: { kind: "expr", expr: `${pstr(Qc)} + (${pstr(Rc)})/(${pstr(D)})`, vars: ["x"] }, answerText: ansHtml,
              answerInput: `${ptyped(Qc)} + (${ptyped(Rc)})/(${ptyped(D)})`,
              vals: { Pc, m1, r1, m2, Qc, Rc }, params: { P: Pc, D }, consts: [3],
            };
          }
        }
        // a box: divide the volume by the two base edges
        const [p, q, h] = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 3);
        const V = ints(pmul(pmul([1, p], [1, q]), [1, h]));
        const s1 = synDiv(V, -p), Q1 = s1.sums.slice(0, 3), s2 = synDiv(Q1, -q);
        return {
          prompt: `A box has volume ${M.eq(`${M.v("V")}(${x}) = ${M.poly(V)}`)} cubic centimeters. Its base measures (${M.poly([1, p])}) cm by (${M.poly([1, q])}) cm. Find its height, in cm, as an expression in ${x}.`,
          steps: [
            `Volume = base × height, so the height is ${M.v("V")}(${x}) ÷ (${M.poly([1, p])}) ÷ (${M.poly([1, q])}). Divide by one factor at a time.`,
            `Divide by ${M.poly([1, p])} = ${x} − ${np(-p)} with synthetic division using ${n(-p)}: ${synth(-p, V, s1.prods, s1.sums)}Quotient ${M.poly(Q1)}, remainder 0.`,
            `Divide ${M.poly(Q1)} by ${M.poly([1, q])} using ${n(-q)}: ${synth(-q, Q1, s2.prods, s2.sums)}Quotient ${M.poly(s2.sums.slice(0, 2))}, remainder 0.`,
            `The height is ${M.poly([1, h])} cm. Check: (${M.poly([1, p])})(${M.poly([1, q])})(${M.poly([1, h])}) = ${M.poly(V)}.`,
          ],
          answer: { kind: "expr", expr: pstr([1, h]), vars: ["x"] }, answerText: `${M.poly([1, h])} cm`, answerInput: ptyped([1, h]),
          vals: { V, p1: s1.prods, s1: s1.sums, p2: s2.prods, s2: s2.sums, h }, params: { p, q, V }, consts: [3],
        };
      },
    },

    // ---- A2.8 Remainder, factor and rational root theorems --------------------------------------------------------
    "A2.4": {
      title: "Remainder, factor and rational root theorems",
      generate(r, level) {
        const Px = `${M.v("P")}(${x})`;
        if (level === 1) {
          const a = r.nonzero(-3, 3), b = r.int(-6, 6), c = r.int(-6, 6), d = r.int(-9, 9), t = r.nonzero(-3, 3);
          const t2 = t * t, t3 = t2 * t, A = a * t3, B = b * t2, C = c * t, R = A + B + C + d;
          return {
            prompt: `Find the remainder when ${M.eq(`${Px} = ${M.poly([a, b, c, d])}`)} is divided by ${M.poly([1, -t])}.`,
            steps: [
              `Remainder theorem: dividing by ${x} − ${M.v("c")} leaves remainder ${M.v("P")}(${M.v("c")}). Here ${M.v("c")} = ${n(t)}, so no division is needed.`,
              `${M.v("P")}(${n(t)}) = ${csDot(a)}${M.sup(np(t), 3)}${tmul(b, ` · ${M.sup(np(t), 2)}`)}${tmul(c, ` · ${np(t)}`)}${M.term(d, "")}, with ${M.sup(np(t), 3)} = ${n(t3)} and ${M.sup(np(t), 2)} = ${n(t2)}.`,
              `= ${n(A)}${M.term(B, "")}${M.term(C, "")}${M.term(d, "")} = ${n(R)}.`,
            ],
            answer: num(R), answerText: n(R), answerInput: String(R),
            vals: { t2, t3, A, B, C, R }, params: { a, b, c, d, t }, consts: [3],
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const a = r.int(-5, 5), c = r.nonzero(-3, 3);
            const k = M.v("k");
            if (r.chance(0.5)) {
              const b = r.int(-6, 6), S = c * c * c + a * c * c + b * c, K = -S;
              return {
                prompt: `Find ${k} so that ${M.poly([1, -c])} is a factor of ${M.eq(`${Px} = ${M.poly([1, a, b, 0])} + ${k}`)}`,
                steps: [
                  `Factor theorem: ${M.poly([1, -c])} is a factor exactly when ${M.v("P")}(${n(c)}) = 0.`,
                  `${M.v("P")}(${n(c)}) = ${M.sup(np(c), 3)}${tmul(a, ` · ${M.sup(np(c), 2)}`)}${tmul(b, ` · ${np(c)}`)} + ${k} = ${n(c * c * c)}${M.term(a * c * c, "")}${M.term(b * c, "")} + ${k} = ${n(S)} + ${k}.`,
                  `Set it to 0: ${k} = ${n(K)}.`,
                ],
                answer: num(K), answerText: `${k} = ${n(K)}`, answerInput: String(K),
                vals: { c3: c * c * c, ac2: a * c * c, bc: b * c, S, K }, params: { a, b, c, pos: 0 }, consts: [3],
              };
            }
            const K = r.nonzero(-6, 6), d = -(c * c * c + a * c * c + K * c), S = c * c * c + a * c * c + d;
            return {
              prompt: `Find ${k} so that ${M.poly([1, -c])} is a factor of ${M.eq(`${Px} = ${M.poly([1, a, 0, 0])} + ${k}${x}${M.term(d, "")}`)}`,
              steps: [
                `Factor theorem: ${M.poly([1, -c])} is a factor exactly when ${M.v("P")}(${n(c)}) = 0.`,
                `${M.v("P")}(${n(c)}) = ${M.sup(np(c), 3)}${tmul(a, ` · ${M.sup(np(c), 2)}`)} + ${k} · ${np(c)}${M.term(d, "")} = ${n(c * c * c)}${M.term(a * c * c, "")}${M.term(c, k)}${M.term(d, "")} = ${n(S)}${M.term(c, k)}.`,
                `Set it to 0: ${kv(c, k)} = ${n(-S)}, so ${k} = ${M.frac(n(-S), n(c))} = ${n(K)}.`,
              ],
              answer: num(K), answerText: `${k} = ${n(K)}`, answerInput: String(K),
              vals: { c3: c * c * c, ac2: a * c * c, S, nS: -S, K }, params: { a, c, d, pos: 1 }, consts: [3],
            };
          }
          // Vieta for a cubic
          const rs = [r.nonzero(-5, 5), r.nonzero(-5, 5), r.nonzero(-5, 5)];
          const A = r.pick([1, 2, 3, -1, -2]);
          const co = ints(pmul(pmul([A, -A * rs[0]], [1, -rs[1]]), [1, -rs[2]]));
          const sum = F(-co[1], co[0]), prod = F(-co[3], co[0]);
          return {
            prompt: `Without solving, find the sum and the product of the three roots (counted with multiplicity) of ${M.eq(`${M.poly(co)} = 0`)} Enter the sum, then the product.`,
            steps: [
              `Vieta's formulas for ${M.v("a")}${M.sup(x, 3)} + ${M.v("b")}${M.sup(x, 2)} + ${M.v("c")}${x} + ${M.v("d")}: the roots add to −${M.frac(M.v("b"), M.v("a"))} and multiply to ${M.sup("(−1)", 3)}${M.frac(M.v("d"), M.v("a"))} = −${M.frac(M.v("d"), M.v("a"))}.`,
              `Here ${M.v("a")} = ${n(co[0])}, ${M.v("b")} = ${n(co[1])}, ${M.v("d")} = ${n(co[3])}.`,
              `Sum: −${M.frac(n(co[1]), n(co[0]))} = ${ff(sum)}. Product: −${M.frac(n(co[3]), n(co[0]))} = ${ff(prod)}.`,
            ],
            answer: { kind: "numbers", values: [sum.value, prod.value], ordered: true }, answerText: `sum ${ff(sum)}, product ${ff(prod)}`,
            answerInput: `${typed(sum)}, ${typed(prod)}`,
            vals: { sum: fv(sum), prod: fv(prod) }, params: { co }, consts: [3],
          };
        }
        // level 3: all the roots of a cubic via the rational root theorem
        for (;;) {
          const half = r.chance(0.35);
          const pp = half ? r.pick([-3, -1, 1, 3]) : 0;
          const rs = half ? [F(pp, 2), F(r.nonzero(-4, 4)), F(r.nonzero(-4, 4))] : [F(r.nonzero(-4, 4)), F(r.nonzero(-4, 4)), F(r.nonzero(-4, 4))];
          if (new Set(rs.map(String)).size < 3) continue;
          const A = half ? 2 : 1;
          const co = ints(pmul(pmul(half ? [2, -pp] : [1, -rs[0].n], [1, -rs[1].n]), [1, -rs[2].n]));
          const a0 = Math.abs(co[3]);
          if (a0 > 40) continue;
          const divs = (m) => Array.from({ length: m }, (_, i) => i + 1).filter((k) => m % k === 0);
          const cands = [];
          divs(a0).forEach((pn) => divs(A).forEach((qd) => { const c = F(pn, qd); if (!cands.some((o) => o.eq(c))) cands.push(c); }));
          cands.sort((u, v) => u.cmp(v));
          const tests = [];
          let root = null;
          for (const c of cands) {
            for (const sgn of [1, -1]) {
              const cc = c.mul(sgn), val = pval(co, cc);
              tests.push([cc, val]);
              if (val.n === 0) { root = cc; break; }
            }
            if (root) break;
          }
          if (tests.length > 6) continue;
          // synthetic division by the root found
          const sums = [F(co[0])];
          for (let i = 1; i < 4; i++) sums.push(F(co[i]).add(root.mul(sums[i - 1])));
          const qa = sums[0], qb = sums[1], qc = sums[2];
          const Dq = qb.mul(qb).sub(qa.mul(qc).mul(4));
          if (!Dq.isInt() || Dq.n < 0) continue;
          const sD = Math.round(Math.sqrt(Dq.n));
          if (sD * sD !== Dq.n) continue;
          const others = rs.filter((v) => !v.eq(root));
          const x1 = qb.neg().add(sD).div(qa.mul(2)), x2 = qb.neg().sub(sD).div(qa.mul(2));
          const candTxt = cands.map((c) => `±${ff(c)}`).join(", ");
          const lo = Math.min(...rs.map((v) => v.value)) - 1, hi = Math.max(...rs.map((v) => v.value)) + 1;
          const [ylo, yhi] = yRange((t) => pval(co, F(Math.round(t * 1000), 1000)).value, lo, hi);
          const pad = Math.max(2, (yhi - ylo) * 0.1);
          return {
            prompt: `Find all the roots of ${M.eq(`${Px} = ${M.poly(co)}`)} Enter them separated by commas.`,
            graph: graph({ view: [lo, hi, Math.floor(ylo - pad), Math.ceil(yhi + pad)], items: [{ t: "fn", e: pstr(co) }] }),
            steps: [
              `Rational root theorem: any rational root is ±${M.frac(M.v("p"), M.v("q"))} with ${M.v("p")} dividing the constant ${n(co[3])} and ${M.v("q")} dividing the leading ${n(co[0])}. Candidates: ${candTxt}.`,
              `Test them, smallest first: ${tests.map(([c, v]) => `${M.v("P")}(${ff(c)}) = ${ff(v)}`).join(", ")}. So ${x} = ${ff(root)} is a root, and (${x} − ${ffp(root)}) is a factor.`,
              `Divide it out with synthetic division by ${ff(root)}: the quotient is ${M.poly(sums.slice(0, 3))} (remainder 0).`,
              `Solve ${M.poly(sums.slice(0, 3))} = 0: ${x} = ${M.frac(`${ff(qb.neg())} ± ${M.sqrt(n(Dq.n))}`, ff(qa.mul(2)))} = ${M.frac(`${ff(qb.neg())} ± ${n(sD)}`, ff(qa.mul(2)))}, so ${x} = ${ff(x1)} or ${x} = ${ff(x2)}.`,
              `The roots are ${ff(root)}, ${ff(others[0])} and ${ff(others[1])}. The graph crosses the ${x}-axis at each of them.`,
            ],
            answer: { kind: "numbers", values: rs.map((v) => v.value) }, answerText: `${ff(root)}, ${ff(others[0])}, ${ff(others[1])}`,
            answerInput: [root, ...others].map(typed).join(", "),
            vals: { cands: cands.map(fv), tests: tests.map(([c, v]) => [fv(c), fv(v)]), root: fv(root), q: sums.slice(0, 3).map(fv), Dq: Dq.n, sD, x1: fv(x1), x2: fv(x2) },
            params: { co }, consts: [3, 4],
          };
        }
      },
    },

    // ---- A2.9 End behavior and multiplicity ---------------------------------------------------------------------
    "A2.end-behavior": {
      title: "Polynomial end behavior and multiplicity",
      generate(r, level) {
        const ENDS = ["Up on the left, up on the right", "Down on the left, down on the right", "Down on the left, up on the right", "Up on the left, down on the right"];
        const endIdx = (a, deg) => (deg % 2 === 0 ? (a > 0 ? 0 : 1) : a > 0 ? 2 : 3);
        const facPow = (rt, m) => { const base = rt === 0 ? x : `(${M.poly([1, -rt])})`; return m === 1 ? base : M.sup(base, m); };
        const factored = (s, rts, ms) => `${s < 0 ? "−" : ""}${rts.map((rt, i) => facPow(rt, ms[i])).join("")}`;
        if (level === 1) {
          const deg = r.int(2, 5), a = r.nonzero(-5, 5);
          const coefs = [a];
          for (let k = 1; k <= deg; k++) coefs.push(r.chance(0.5) ? r.int(-9, 9) : 0);
          const idx = endIdx(a, deg);
          return {
            prompt: `Describe the end behavior of ${M.eq(`${M.v("P")}(${x}) = ${M.poly(coefs)}`)}`,
            steps: [
              `Far from the origin the leading term ${kv(a, M.sup(x, deg))} outweighs all the others, so ${M.v("P")} behaves like it.`,
              `The degree ${n(deg)} is ${deg % 2 ? "odd, so the two ends point in opposite directions" : "even, so both ends point the same way"}.`,
              `The leading coefficient ${n(a)} is ${a > 0 ? "positive" : "negative"}: ${deg % 2 ? (a > 0 ? "the graph rises on the right (and falls on the left)" : "the graph falls on the right (and rises on the left)") : a > 0 ? "both ends point up" : "both ends point down"}.`,
            ],
            answer: { kind: "choice", options: ENDS, index: idx }, answerText: ENDS[idx],
            vals: {}, params: { coefs }, consts: [3, 4, 5],
          };
        }
        if (level === 2) {
          for (;;) {
            const k = r.pick([2, 3]);
            const rts = r.sample([-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5], k), ms = rts.map(() => r.int(1, 3)), s = r.pick([1, -1, 2, -2]);
            const even = rts.filter((_, i) => ms[i] % 2 === 0);
            if (!even.length || even.length === k) continue;
            const deg = ms.reduce((u, v) => u + v, 0);
            const desc = rts.map((rt, i) => `${x} = ${n(rt)}: multiplicity ${n(ms[i])}, ${ms[i] % 2 ? `odd, so it crosses${ms[i] >= 3 ? " (flattening as it does)" : ""}` : "even, so it touches and turns back"}`);
            return {
              prompt: `At which zeros does the graph of ${M.eq(`${M.v("P")}(${x}) = ${n(s) === "1" ? "" : n(s) === "−1" ? "−" : n(s)}${rts.map((rt, i) => facPow(rt, ms[i])).join("")}`)} touch the ${x}-axis and turn back, without crossing it?`,
              steps: [
                `Each factor (${x} − ${M.v("r")})${M.sup("", M.v("m"))} gives a zero at ${M.v("r")} with multiplicity ${M.v("m")}. Odd ${M.v("m")}: the sign changes, so the graph crosses. Even ${M.v("m")}: the sign does not change, so it touches and turns back.`,
                ...desc.map((d) => `${d}.`),
                `It touches without crossing at ${even.map(n).join(" and ")}. (Degree ${n(deg)} in all.)`,
              ],
              answer: { kind: "numbers", values: even }, answerText: even.map((v) => `${x} = ${n(v)}`).join(", "), answerInput: even.join(", "),
              vals: { even, deg }, params: { s, rts, ms }, consts: [3],
            };
          }
        }
        // level 3: pick the equation of a drawn polynomial
        for (;;) {
          const k = r.pick([2, 3]);
          const rts = r.sample([-3, -2, -1, 0, 1, 2, 3], k), ms = rts.map(() => r.int(1, 2)), s = r.sign();
          const deg = ms.reduce((u, v) => u + v, 0);
          if (deg > 4 || !ms.some((m) => m === 2) && r.chance(0.6)) continue;
          const t = r.int(0, k - 1);
          const variants = [
            [s, rts, ms],
            [-s, rts, ms],
            [s, rts, ms.map((m, i) => (i === t ? 3 - m : m))],
            [s, rts.map((v) => -v), ms],
          ];
          const polyOf = ([ss, rr, mm]) => rr.reduce((acc, rt, i) => { let q = acc; for (let j = 0; j < mm[i]; j++) q = pmul(q, [1, -rt]); return q; }, [ss]).map((c) => Frac.of(c).n);
          const keys = variants.map((v) => polyOf(v).join(","));
          if (new Set(keys).size < 4) continue;
          const order = r.shuffle([0, 1, 2, 3]);
          const opts = order.map((i) => variants[i]);
          const e = pstr(polyOf(variants[0]));
          const [ylo, yhi] = yRange((xx) => s * rts.reduce((acc, rt, i) => acc * Math.pow(xx - rt, ms[i]), 1), -4, 4);
          const span = Math.max(yhi, -ylo);
          const ylim = Math.min(Math.ceil(span), 40);
          const cross = rts.filter((_, i) => ms[i] % 2), touch = rts.filter((_, i) => ms[i] % 2 === 0);
          const right = s > 0 ? "up" : "down";
          return {
            prompt: `Which equation matches the graph?`,
            graph: graph({ view: [-4, 4, -ylim, ylim], items: [{ t: "fn", e }] }),
            steps: [
              `Zeros: ${[...cross.map((v) => `it crosses at ${x} = ${n(v)} (odd multiplicity)`), ...touch.map((v) => `it touches and turns back at ${x} = ${n(v)} (even multiplicity)`)].join("; ")}.`,
              `So the factors are ${rts.map((rt, i) => facPow(rt, ms[i])).join(", ")}: degree ${n(deg)}, which is ${deg % 2 ? "odd" : "even"}.`,
              `The right end points ${right}, so the leading coefficient is ${s > 0 ? "positive" : "negative"}${deg % 2 ? "" : `, and with even degree the left end points ${right} too`}.`,
              `That is ${M.v("P")}(${x}) = ${factored(...variants[0])}.`,
            ],
            answer: { kind: "choice", options: opts.map((v) => `${M.v("P")}(${x}) = ${factored(...v)}`), index: order.indexOf(0) },
            answerText: `${M.v("P")}(${x}) = ${factored(...variants[0])}`,
            vals: { deg }, params: { s, rts, ms, opts },
          };
        }
      },
    },

    // ---- A2.10 Rational functions and asymptotes -------------------------------------------------------------------
    "A2.5": {
      title: "Rational functions: asymptotes and holes",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const a = r.nonzero(-6, 6), b = r.int(-9, 9), c = r.nonzero(-4, 4), d = r.int(-9, 9);
            if (a * d - b * c === 0) continue;
            const va = F(-d, c), ha = F(a, c), top = va.mul(a).add(b);
            return {
              prompt: `Find the vertical and horizontal asymptotes of ${M.eq(`${fn}(${x}) = ${M.frac(M.poly([a, b]), M.poly([c, d]))}`)} Enter the vertical asymptote's ${x}-value, then the horizontal asymptote's ${y}-value.`,
              steps: [
                `Vertical: the denominator is 0 when ${M.poly([c, d])} = 0, so ${x} = ${ff(va)}. The numerator there is ${n(a)} · ${ffp(va)}${M.term(b, "")} = ${ff(top)}, not 0, so this is an asymptote (not a hole).`,
                `Horizontal: top and bottom have the same degree, so ${y} approaches the ratio of the leading coefficients: ${M.frac(n(a), n(c))} = ${ff(ha)}.`,
                `Vertical asymptote ${x} = ${ff(va)}; horizontal asymptote ${y} = ${ff(ha)}.`,
              ],
              answer: { kind: "numbers", values: [va.value, ha.value], ordered: true }, answerText: `${x} = ${ff(va)} and ${y} = ${ff(ha)}`,
              answerInput: `${typed(va)}, ${typed(ha)}`,
              vals: { va: fv(va), ha: fv(ha), top: fv(top) }, params: { a, b, c, d },
            };
          }
        }
        if (level === 2) {
          const [p, q, s] = r.sample([-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6], 3);
          const num_ = [1, -(p + q), p * q], den = [1, -(p + s), p * s];
          const hy = F(p - q, p - s);
          const fp = (v) => (v === 0 ? x : `(${M.poly([1, -v])})`);
          return {
            prompt: `The graph of ${M.eq(`${fn}(${x}) = ${M.frac(M.poly(num_), M.poly(den))}`)} has a hole. Find the point where it is.`,
            steps: [
              `Factor top and bottom: ${M.frac(`${fp(p)}${fp(q)}`, `${fp(p)}${fp(s)}`)}.`,
              `The common factor ${fp(p)} cancels, which removes the single point ${x} = ${n(p)} from the graph: a hole. (The other zero of the bottom, ${x} = ${n(s)}, stays: a vertical asymptote.)`,
              `Its height comes from the simplified form ${M.frac(M.poly([1, -q]), M.poly([1, -s]))} at ${x} = ${n(p)}: ${M.frac(`${n(p)} − ${np(q)}`, `${n(p)} − ${np(s)}`)} = ${M.frac(n(p - q), n(p - s))} = ${ff(hy)}.`,
              `The hole is at (${n(p)}, ${ff(hy)}).`,
            ],
            answer: { kind: "point", value: [p, hy.value] }, answerText: `(${n(p)}, ${ff(hy)})`, answerInput: `(${p}, ${typed(hy)})`,
            vals: { p, q, s, B1: -(p + q), C1: p * q, B2: -(p + s), C2: p * s, pq: p - q, ps: p - s, hy: fv(hy) }, params: { num: num_, den },
          };
        }
        // level 3
        if (r.chance(0.5)) {
          for (;;) {
            const B = r.int(-6, 6), C = r.int(-9, 9), d = r.nonzero(-4, 4);
            const q1 = B + d, R = C + d * q1;
            if (R === 0) continue;
            const den = M.poly([1, -d]);
            return {
              prompt: `Find the slant asymptote of ${M.eq(`${fn}(${x}) = ${M.frac(M.poly([1, B, C]), den)}`)}`,
              steps: [
                `The top's degree is one more than the bottom's, so the asymptote is the quotient of the division (the remainder fades as ${x} grows).`,
                `Synthetic division by ${n(d)}: bring down 1; ${n(d)} · 1 = ${n(d)}, ${n(B)} + ${np(d)} = ${n(q1)}; ${n(d)} · ${np(q1)} = ${n(d * q1)}, ${n(C)} + ${np(d * q1)} = ${n(R)}.`,
                `So ${fn}(${x}) = ${M.poly([1, q1])} ${R < 0 ? "−" : "+"} ${M.frac(n(Math.abs(R)), den)}. The fraction tends to 0 far out.`,
                `Slant asymptote: ${y} = ${M.poly([1, q1])}.`,
              ],
              answer: { kind: "expr", expr: pstr([1, q1]), vars: ["x"] }, answerText: `${y} = ${M.poly([1, q1])}`, answerInput: `y = ${ptyped([1, q1])}`,
              vals: { q1, dq1: d * q1, R }, params: { B, C, d },
            };
          }
        }
        // match a graph: y = v + k/(x − h)
        for (;;) {
          const h = r.int(-1, 1), v = r.int(-1, 1), k = r.pick([-2, -1, 1, 2]);
          const variants = [[v, h, k], [v, -h, k], [v + r.pick([-1, 1]), h, k], [v, h, -k]];
          if (h === 0) variants[1] = [-v || 1, h, k];
          const keys = variants.map(([vv, hh, kk]) => `${vv},${hh},${kk}`);
          if (new Set(keys).size < 4) continue;
          const rat = ([vv, hh, kk]) => M.frac(vv === 0 ? n(kk) : M.poly([vv, kk - vv * hh]), M.poly([1, -hh]));
          const order = r.shuffle([0, 1, 2, 3]);
          const opts = order.map((i) => variants[i]);
          return {
            prompt: `Which equation matches the graph? Its asymptotes are dashed, and the marked point is on a grid corner.`,
            graph: graph({ view: [-4, 4, -4, 4], items: [
              { t: "fn", e: `(${v}) + (${k})/(x - (${h}))` }, { t: "vline", x: h, role: "muted" }, { t: "hline", y: v, role: "muted" }, { t: "pt", x: h + 1, y: v + k },
            ] }),
            steps: [
              `The vertical asymptote is ${x} = ${n(h)}, so the bottom is ${M.poly([1, -h])} (it is 0 there).`,
              `The horizontal asymptote is ${y} = ${n(v)}. With top and bottom of equal degree, that is the ratio of leading coefficients, so the top starts with ${v === 0 ? `no ${x}-term (the top is a constant, giving ${y} = 0)` : kv(v)}.`,
              `Check the marked point (${n(h + 1)}, ${n(v + k)}) in ${rat(variants[0])}: at ${x} = ${n(h + 1)} it gives ${M.frac(v === 0 ? n(k) : (h + 1 === 0 ? `0${M.term(k - v * h, "")}` : `${times(v, h + 1)}${M.term(k - v * h, "")}`), `${n(h + 1)} − ${np(h)}`)} = ${n(v + k)}. ✓ Of the choices with these asymptotes, only this one passes through the point.`,
              `So ${fn}(${x}) = ${rat(variants[0])}.`,
            ],
            answer: { kind: "choice", options: opts.map((o) => `${fn}(${x}) = ${rat(o)}`), index: order.indexOf(0) }, answerText: `${fn}(${x}) = ${rat(variants[0])}`,
            vals: { top: k - v * h, xp: h + 1, yp: v + k, tops: opts.map(([vv, hh, kk]) => kk - vv * hh) }, params: { v, h, k, opts },
          };
        }
      },
    },

    // ---- A2.11 Rational equations and inequalities ----------------------------------------------------------------
    "A2.rational-eq": {
      title: "Rational equations and inequalities",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const a = r.nonzero(-9, 9), c = r.intExcept(-9, 9, 0, a), s = r.int(-8, 8), b = r.int(-9, 9);
            const top = c * (s + b) - a * s;
            if (top % a !== 0) continue;
            const d = top / a;
            if (s + b === 0 || s + d === 0 || b === d) continue;
            const k = a - c, rhs = c * b - a * d;
            return {
              prompt: `Solve ${M.eq(`${M.frac(n(a), M.poly([1, b]))} = ${M.frac(n(c), M.poly([1, d]))}`)}`,
              steps: [
                `Excluded values (a denominator would be 0): ${x} ≠ ${n(-b)} and ${x} ≠ ${n(-d)}.`,
                `Cross-multiply: ${cs(a)}${lin(-d)} = ${cs(c)}${lin(-b)}, so ${M.poly([a, a * d])} = ${M.poly([c, c * b])}.`,
                `Collect: ${kv(a)} − ${np(c)}${x} = ${n(c * b)} − ${np(a * d)}, so ${kv(k)} = ${n(rhs)} and ${x} = ${M.frac(n(rhs), n(k))} = ${n(s)}.`,
                `${n(s)} is not excluded, so it is the solution.`,
              ],
              answer: num(s), answerText: `${x} = ${n(s)}`, answerInput: String(s),
              vals: { nb: -b, nd: -d, ad: a * d, cb: c * b, k, rhs, s }, params: { a, b, c, d },
            };
          }
        }
        if (level === 2) {
          let a, v;
          do { a = r.nonzero(-6, 6); v = r.nonzero(-8, 8); } while (a === v);
          const L = a + v, Mm = a * v;
          return {
            prompt: `Solve ${M.eq(`${M.frac(M.sup(x, 2), M.poly([1, -a]))} = ${M.frac(M.poly([L, -Mm]), M.poly([1, -a]))}`)} Watch for extraneous solutions.`,
            steps: [
              `Excluded value: ${x} ≠ ${n(a)} (it makes the denominators 0).`,
              `Multiply both sides by ${M.poly([1, -a])}: ${M.sup(x, 2)} = ${M.poly([L, -Mm])}, so ${M.poly([1, -L, Mm])} = 0.`,
              `Factor: (${M.poly([1, -a])})(${M.poly([1, -v])}) = 0, so ${x} = ${n(a)} or ${x} = ${n(v)}.`,
              `${x} = ${n(a)} is excluded: it is extraneous (it was created by multiplying by a factor equal to 0). The only solution is ${x} = ${n(v)}.`,
            ],
            answer: num(v), answerText: `${x} = ${n(v)}`, answerInput: String(v),
            vals: { L, Mm, v }, params: { a, L, Mm },
          };
        }
        // level 3
        if (r.chance(0.5)) {
          // work rate: (t1 − T)(t2 − T) = T²
          for (;;) {
            const T = r.int(2, 12), divs = [];
            for (let u = 1; u < T; u++) if ((T * T) % u === 0) divs.push(u);
            const u = r.pick(divs), t1 = T + u, t2 = T + (T * T) / u;
            if (t2 > 60) continue;
            const [who, unit] = r.pick([[["A large pipe", "a small pipe"], "hours"], [["Ana", "Ben"], "hours"], [["An experienced painter", "an apprentice"], "hours"], [["One printer", "a slower printer"], "minutes"]]);
            const findT = r.chance(0.5);
            const what = unit === "minutes" ? "print the job" : who[0] === "A large pipe" ? "fill the tank" : "paint the fence";
            const lcd = t1 * t2;
            if (findT) {
              return {
                prompt: `${who[0]} can ${what} alone in ${n(t1)} ${unit}; ${who[1]} takes ${n(t2)} ${unit}. How long does it take working together, in ${unit}?`,
                steps: [
                  `Rates add: together they do ${M.frac("1", n(t1))} + ${M.frac("1", n(t2))} of the job per ${unit.slice(0, -1)}, and that equals ${M.frac("1", M.v("T"))}.`,
                  `Common denominator ${n(lcd)}: ${M.frac(n(t2), n(lcd))} + ${M.frac(n(t1), n(lcd))} = ${M.frac(n(t1 + t2), n(lcd))}.`,
                  `${M.frac("1", M.v("T"))} = ${M.frac(n(t1 + t2), n(lcd))}, so ${M.v("T")} = ${M.frac(n(lcd), n(t1 + t2))} = ${n(T)} ${unit}.`,
                ],
                answer: num(T), answerText: `${n(T)} ${unit}`, answerInput: String(T),
                vals: { lcd, sum: t1 + t2, T }, params: { t1, t2, find: 0 },
              };
            }
            const lcd2 = T * t1;
            return {
              prompt: `${who[0]} can ${what} alone in ${n(t1)} ${unit}. Working together with ${who[1]}, it takes ${n(T)} ${unit}. How long would ${who[1]} take alone, in ${unit}?`,
              steps: [
                `Rates add: ${M.frac("1", n(t1))} + ${M.frac("1", M.v("t"))} = ${M.frac("1", n(T))}, where ${M.v("t")} is the unknown time.`,
                `Isolate: ${M.frac("1", M.v("t"))} = ${M.frac("1", n(T))} − ${M.frac("1", n(t1))} = ${M.frac(n(t1), n(lcd2))} − ${M.frac(n(T), n(lcd2))} = ${M.frac(n(t1 - T), n(lcd2))}.`,
                `Flip: ${M.v("t")} = ${M.frac(n(lcd2), n(t1 - T))} = ${n(t2)} ${unit}.`,
              ],
              answer: num(t2), answerText: `${n(t2)} ${unit}`, answerInput: String(t2),
              vals: { lcd2, diff: t1 - T, t2 }, params: { t1, T, find: 1 },
            };
          }
        }
        // sign chart for (x − p)/(x − q) > 0 or < 0
        let p, q;
        do { p = r.int(-7, 7); q = r.int(-7, 7); } while (p === q);
        const greater = r.chance(0.5), lo = Math.min(p, q), hi = Math.max(p, q);
        const inside = !greater;
        const rel = greater ? gt : lt;
        const fx = M.frac(M.poly([1, -p]), M.poly([1, -q]));
        return {
          prompt: inside
            ? `Solve ${M.eq(`${fx} ${rel} 0`)} The solution is ${M.v("a")} ${lt} ${x} ${lt} ${M.v("b")}. Enter ${M.v("a")}, ${M.v("b")}.`
            : `Solve ${M.eq(`${fx} ${rel} 0`)} The solution is ${x} ${lt} ${M.v("a")} or ${x} ${gt} ${M.v("b")}. Enter ${M.v("a")}, ${M.v("b")}.`,
          steps: [
            `Do not multiply by ${M.poly([1, -q])}: its sign is unknown. Use a sign chart. The top is 0 at ${x} = ${n(p)}; the bottom is 0 at ${x} = ${n(q)} (excluded).`,
            `These split the line into ${x} ${lt} ${n(lo)}, ${n(lo)} ${lt} ${x} ${lt} ${n(hi)} and ${x} ${gt} ${n(hi)}. Left of both, top and bottom are both negative: the quotient is positive. Between them exactly one is negative: negative. Right of both, both positive: positive.`,
            `The quotient is ${greater ? "positive" : "negative"} for ${inside ? `${n(lo)} ${lt} ${x} ${lt} ${n(hi)}` : `${x} ${lt} ${n(lo)} or ${x} ${gt} ${n(hi)}`}. (Strict inequality: ${x} = ${n(p)} gives 0 and ${x} = ${n(q)} is excluded.)`,
          ],
          answer: { kind: "numbers", values: [lo, hi], ordered: true }, answerText: inside ? `${n(lo)} ${lt} ${x} ${lt} ${n(hi)}` : `${x} ${lt} ${n(lo)} or ${x} ${gt} ${n(hi)}`,
          answerInput: `${lo}, ${hi}`, vals: { lo, hi }, params: { p, q, greater: greater ? 1 : 0, inside: inside ? 1 : 0 },
        };
      },
    },

    // ---- A2.12 Radical equations ---------------------------------------------------------------------------------
    "A2.radical-eq": {
      title: "Radical equations and extraneous roots",
      generate(r, level) {
        if (level === 1) {
          const cube = r.chance(0.4);
          const a = r.nonzero(-5, 5), sol = r.int(-9, 9), c = cube ? r.nonzero(-4, 4) : r.int(1, 9);
          const pw_ = cube ? c * c * c : c * c, b = pw_ - a * sol;
          const lhs = M.sqrt(M.poly([a, b]), cube ? "3" : "");
          return {
            prompt: `Solve ${M.eq(`${lhs} = ${n(c)}`)}`,
            steps: [
              `${cube ? "Cube" : "Square"} both sides to undo the root: ${M.poly([a, b])} = ${M.sup(np(c), cube ? 3 : 2)} = ${n(pw_)}.`,
              a === 1 ? `${x} = ${n(pw_)} − ${np(b)} = ${n(sol)}.` : `${kv(a)} = ${n(pw_)} − ${np(b)} = ${n(pw_ - b)}, so ${x} = ${M.frac(n(pw_ - b), n(a))} = ${n(sol)}.`,
              cube ? `Check: ${M.sqrt(`${times(a, sol)}${M.term(b, "")}`, "3")} = ${M.sqrt(n(pw_), "3")} = ${n(c)}. (Cubing never adds false roots.)`
                : `Check: ${M.sqrt(`${times(a, sol)}${M.term(b, "")}`)} = ${M.sqrt(n(pw_))} = ${n(c)}. ✓`,
            ],
            answer: num(sol), answerText: `${x} = ${n(sol)}`, answerInput: String(sol),
            vals: { pw: pw_, pb: pw_ - b, sol }, params: { a, b, c, cube: cube ? 1 : 0 }, consts: [3],
          };
        }
        if (level === 2) {
          for (;;) {
            const v = r.int(-3, 8), c = r.int(-5, 5), e = 1 - 2 * c - v;
            if (e === v || e + c >= 0 || v + c < 0) continue;
            const b = c * c - v * e;
            const k1 = 2 * c - 1, k0 = c * c - b;
            const sqv = (v + c) * (v + c), sqe = (e + c) * (e + c);
            const lhs = M.sqrt(M.poly([1, b])), rhs = M.poly([1, c]);
            return {
              prompt: `Solve ${M.eq(`${lhs} = ${rhs}`)}`,
              steps: [
                `The root is already alone. Square both sides: ${M.poly([1, b])} = ${c === 0 ? M.sup(x, 2) : `${M.sup(`(${rhs})`, 2)} = ${M.poly([1, 2 * c, c * c])}`}.`,
                `Collect on one side: ${M.poly([1, k1, k0])} = 0. Factor: ${lin(v)}${lin(e)} = 0, so ${x} = ${n(v)} or ${x} = ${n(e)}.`,
                `Check ${x} = ${n(v)} in the original: left ${M.sqrt(`${n(v)}${M.term(b, "")}`)} = ${M.sqrt(n(sqv))} = ${n(v + c)}; right ${n(v)}${M.term(c, "")} = ${n(v + c)}. It works.`,
                `Check ${x} = ${n(e)}: left ${M.sqrt(`${n(e)}${M.term(b, "")}`)} = ${M.sqrt(n(sqe))} = ${n(-(e + c))}; right ${n(e)}${M.term(c, "")} = ${n(e + c)}. A square root is never negative, so ${x} = ${n(e)} is extraneous.`,
              ],
              answer: num(v), answerText: `${x} = ${n(v)}`, answerInput: String(v),
              vals: { c2: 2 * c, cc: c * c, k1, k0, v, e, sqv, sqe, vc: v + c, ec: e + c }, params: { b, c },
            };
          }
        }
        // level 3
        const kind = r.int(0, 2);
        if (kind === 0) {
          const t = r.int(1, 6), u = r.int(t + 1, t + 6), A = u * u - t * t, C = t + u;
          return {
            prompt: `Solve ${M.eq(`${M.sqrt(M.poly([1, A]))} + ${M.sqrt(x)} = ${n(C)}`)}`,
            steps: [
              `Isolate one root: ${M.sqrt(M.poly([1, A]))} = ${n(C)} − ${M.sqrt(x)}.`,
              `Square: ${M.poly([1, A])} = ${n(C * C)} − ${n(2 * C)}${M.sqrt(x)} + ${x}.`,
              `The ${x} cancels: ${n(2 * C)}${M.sqrt(x)} = ${n(C * C)} − ${n(A)} = ${n(C * C - A)}, so ${M.sqrt(x)} = ${M.frac(n(C * C - A), n(2 * C))} = ${n(t)}.`,
              `Square again: ${x} = ${n(t * t)}. Check: ${M.sqrt(`${n(t * t)} + ${n(A)}`)} + ${M.sqrt(n(t * t))} = ${n(u)} + ${n(t)} = ${n(C)}. ✓`,
            ],
            answer: num(t * t), answerText: `${x} = ${n(t * t)}`, answerInput: String(t * t),
            vals: { A, C, CC: C * C, C2: 2 * C, top: C * C - A, t, tt: t * t, u }, params: { A, C, kind },
          };
        }
        if (kind === 1) {
          for (;;) {
            const s = r.pick([25, 30, 35, 40, 45, 50, 55, 60, 65, 70]), fh = r.pick([50, 60, 70, 75, 80, 90, 100]);
            const top = s * s * 100, den = 30 * fh;
            if (top % den !== 0) continue;
            const d = top / den, f = fh / 100, ss = s * s, tf = 30 * f;
            return {
              prompt: `Police estimate a car's speed from its skid marks with ${M.eq(`${M.v("s")} = ${M.sqrt(`30${M.v("d")}${M.v("f")}`)}`)} where ${M.v("s")} is the speed in mph, ${M.v("d")} the skid length in feet and ${M.v("f")} the road's drag factor. A car going ${n(s)} mph on a road with ${M.v("f")} = ${n(f)} skids how far, in feet?`,
              steps: [
                `Substitute: ${n(s)} = ${M.sqrt(`30 · ${M.v("d")} · ${n(f)}`)} = ${M.sqrt(`${n(tf)}${M.v("d")}`)}.`,
                `Square both sides: ${n(ss)} = ${n(tf)}${M.v("d")}.`,
                `${M.v("d")} = ${M.frac(n(ss), n(tf))} = ${n(d)} feet. (The speed is positive, so squaring adds no false root.)`,
              ],
              answer: num(d), answerText: `${n(d)} feet`, answerInput: String(d),
              vals: { ss, tf, d }, params: { s, f, kind }, consts: [30],
            };
          }
        }
        const [m, nn] = r.pick([[3, 2], [2, 3], [4, 3], [3, 4], [5, 2]]);
        const t = nn === 4 ? r.int(2, 3) : r.int(2, 4);
        const k = Math.pow(t, m), xv = Math.pow(t, nn);
        if (k > 1100) return this.generate(r, level);
        const both = m % 2 === 0;
        const sols = both ? [xv, -xv] : [xv];
        return {
          prompt: `Solve ${M.eq(`${M.sup(x, `${n(m)}/${n(nn)}`)} = ${n(k)}`)}${both ? " Enter every real solution." : ""}`,
          steps: [
            `${M.sup(x, `${n(m)}/${n(nn)}`)} = ${M.sup(`(${M.sqrt(x, nn === 2 ? "" : String(nn))})`, m)}. Undo the power ${n(m)} first: ${M.sqrt(x, nn === 2 ? "" : String(nn))} = ${both ? "±" : ""}${M.sqrt(n(k), m === 2 ? "" : String(m))} = ${both ? "±" : ""}${n(t)}${both ? ` (an even power hides the sign)` : ""}.`,
            `Then undo the root by raising to the power ${n(nn)}: ${x} = ${both ? "±" : ""}${M.sup(n(t), nn)} = ${both ? "±" : ""}${n(xv)}.`,
            `Check: ${M.sup(n(xv), `${n(m)}/${n(nn)}`)} = ${M.sup(n(t), m)} = ${n(k)}${both ? `, and the same for ${n(-xv)} since the power ${n(m)} is even` : ""}.`,
          ],
          answer: { kind: "numbers", values: sols }, answerText: both ? `${x} = ${n(xv)} or ${x} = ${n(-xv)}` : `${x} = ${n(xv)}`, answerInput: sols.join(", "),
          vals: { k, t, xv }, params: { m, nn, k, kind },
        };
      },
    },

    // ---- A2.13 Exponential growth and decay ------------------------------------------------------------------------
    "A2.6": {
      title: "Exponential growth and decay",
      generate(r, level) {
        const t = M.v("t");
        if (level === 1) {
          const k = r.int(2, 5), hl = r.pick([2, 3, 4, 5, 6, 8, 10, 12]), T = k * hl, pow2 = Math.pow(2, k);
          if (r.chance(0.5)) {
            const m = r.int(1, 9), y0 = m * pow2 * r.pick([1, 5, 10]), ans = y0 / pow2;
            const [what, unit, tu] = r.pick([["a medical tracer", "mg", "hours"], ["a radioactive sample", "g", "days"], ["a pollutant in a lake", "kg", "years"]]);
            return {
              prompt: `${cap(what)} starts at ${n(y0)} ${unit} and has a half-life of ${n(hl)} ${tu}. How much remains after ${n(T)} ${tu}, in ${unit}?`,
              graph: graph({ view: [0, T + hl, 0, Math.ceil(y0 * 1.1)], items: [{ t: "fn", e: `${y0}*(1/2)^(x/${hl})` }, { t: "pt", x: 0, y: y0 }] }),
              steps: [
                `Half-life form: ${y} = ${M.sub(y, "0")} · ${M.sup(`(${M.frac("1", "2")})`, `${t}/${M.sub(t, "½")}`)}. The exponent counts half-lives.`,
                `${M.frac(n(T), n(hl))} = ${n(k)} half-lives, so the amount is halved ${n(k)} times: ${M.sup(`(${M.frac("1", "2")})`, k)} = ${M.frac("1", n(pow2))}.`,
                `${n(y0)} × ${M.frac("1", n(pow2))} = ${n(ans)} ${unit}.`,
              ],
              answer: num(ans), answerText: `${n(ans)} ${unit}`, answerInput: String(ans),
              vals: { k, pow2, ans }, params: { y0, hl, T, decay: 1 },
            };
          }
          const y0 = r.pick([20, 50, 100, 150, 200, 250, 300, 500]), ans = y0 * pow2;
          return {
            prompt: `A culture of ${n(y0)} bacteria doubles every ${n(hl)} hours. How many bacteria are there after ${n(T)} hours?`,
            graph: graph({ view: [0, T + hl / 2, 0, Math.ceil(ans * 1.15)], items: [{ t: "fn", e: `${y0}*2^(x/${hl})` }, { t: "pt", x: 0, y: y0 }] }),
            steps: [
              `Doubling form: ${y} = ${M.sub(y, "0")} · ${M.sup("2", `${t}/${M.v("d")}`)}, with doubling time ${M.v("d")} = ${n(hl)} hours.`,
              `${M.frac(n(T), n(hl))} = ${n(k)} doublings: ${M.sup("2", k)} = ${n(pow2)}.`,
              `${n(y0)} × ${n(pow2)} = ${n(ans)} bacteria.`,
            ],
            answer: num(ans), answerText: `${n(ans)} bacteria`, answerInput: String(ans),
            vals: { k, pow2, ans }, params: { y0, hl, T, decay: 0 },
          };
        }
        if (level === 2) {
          for (;;) {
            const Pp = r.pick([500, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000]), rp = r.pick([2, 3, 4, 5, 6, 8]);
            const cont = r.chance(0.35), rdec = rp / 100;
            let fac, steps, how, nper = 0, years, N = 0, rt = 0;
            if (cont) {
              years = r.int(2, 20); rt = (rp * years) / 100; fac = Math.exp(rt); how = "continuously";
            } else {
              nper = r.pick([1, 2, 4, 12]); years = r.int(2, 15); N = nper * years; fac = Math.pow(1 + rdec / nper, N);
              how = { 1: "annually", 2: "twice a year", 4: "quarterly", 12: "monthly" }[nper];
            }
            const exact = Pp * fac * 100, A = Math.round(exact) / 100, fac6 = Math.round(fac * 1e6) / 1e6;
            const shown = Pp * fac6 * 100;
            if (Math.abs(exact - Math.floor(exact) - 0.5) < 0.05 || Math.abs(shown - Math.floor(shown) - 0.5) < 0.05 || Math.round(shown) / 100 !== A) continue;
            if (cont) {
              steps = [
                `Continuous compounding: ${M.v("A")} = ${M.v("P")}${M.sup(M.v("e"), `${M.v("r")}${t}`)} with ${M.v("P")} = ${n(Pp)}, ${M.v("r")} = ${n(rdec)}, ${t} = ${n(years)}.`,
                `Exponent: ${M.v("r")}${t} = ${n(rdec)} × ${n(years)} = ${n(rt)}. Then ${M.sup(M.v("e"), n(rt))} ≈ ${fmt(fac, 6)}.`,
                `${M.v("A")} = ${n(Pp)} × ${fmt(fac, 6)} ≈ ${P.money(A)} (keep the full calculator value of ${M.sup(M.v("e"), n(rt))}).`,
              ];
            } else {
              steps = [
                `Compound interest: ${M.v("A")} = ${M.v("P")}${M.sup(`(1 + ${M.frac(M.v("r"), M.v("n"))})`, `${M.v("n")}${t}`)} with ${M.v("P")} = ${n(Pp)}, ${M.v("r")} = ${n(rdec)}, ${M.v("n")} = ${n(nper)}, ${t} = ${n(years)}.`,
                `Number of compounding periods: ${M.v("n")}${t} = ${n(nper)} × ${n(years)} = ${n(N)}.`,
                `Growth factor: ${M.sup(`(1 + ${M.frac(n(rdec), n(nper))})`, N)} ≈ ${fmt(fac, 6)}.`,
                `${M.v("A")} = ${n(Pp)} × ${fmt(fac, 6)} ≈ ${P.money(A)} (keep the full calculator value of the factor).`,
              ];
            }
            return {
              prompt: `You deposit ${P.money(Pp)} in an account paying ${n(rp)}% a year, compounded ${how}. How much is in the account after ${n(years)} years? Round to the nearest cent (2 decimal places).`,
              steps, answer: num(A, 2), answerText: P.money(A), answerInput: String(A),
              vals: { rdec, N, rt, fac, A }, params: { Pp, rp, nper, years, cont: cont ? 1 : 0 }, consts: [100],
            };
          }
        }
        // level 3: two data points fix the model; predict when it reaches a level
        const decay = r.chance(0.4);
        const g = decay ? 2 : r.pick([2, 2, 3]);
        const a = r.int(1, 2), b = r.int(a + 1, a + (g === 3 ? 3 : 4)), d = r.pick([2, 3, 4, 5, 6, 8]);
        const t1 = a * d, t2 = b * d, ga = Math.pow(g, a), gb = Math.pow(g, b);
        const word = g === 3 ? "triples" : decay ? "halves" : "doubles", wordN = g === 3 ? "triplings" : decay ? "halvings" : "doublings";
        let y0, y1, y2, sc;
        if (decay) {
          y0 = r.pick([1, 3, 5]) * gb * r.pick([10, 20]); y1 = y0 / ga; y2 = y0 / gb;
          sc = { what: "A radioactive sample", unit: "g", tu: "days", verb: "decays" };
        } else {
          y0 = r.pick([50, 100, 200, 500]); y1 = y0 * ga; y2 = y0 * gb;
          sc = { what: "A bacteria culture", unit: "cells", tu: "hours", verb: "grows" };
        }
        const k = (decay ? -1 : 1) * Math.log(ga) / t1;
        const top = Math.max(y0, y2);
        return {
          prompt: `${sc.what} ${sc.verb} exponentially from ${n(y0)} ${sc.unit} to ${n(y1)} ${sc.unit} in ${n(t1)} ${sc.tu}. How many ${sc.tu} after the start will it reach ${n(y2)} ${sc.unit}?`,
          graph: graph({ view: [0, Math.ceil(t2 * 1.15), 0, Math.ceil(top * 1.1)], items: [{ t: "fn", e: `${y0}*(${decay ? "1/2" : g})^(x/${d})` }, { t: "pt", x: 0, y: y0 }, { t: "pt", x: t1, y: y1 }] }),
          steps: [
            `In ${n(t1)} ${sc.tu} the amount ${decay ? "shrank" : "grew"} by a factor of ${decay ? M.frac(n(y0), n(y1)) : M.frac(n(y1), n(y0))} = ${n(ga)} = ${M.sup(n(g), a)}: ${n(a)} ${a === 1 ? wordN.slice(0, -1) : wordN}. So it ${word} every ${a === 1 ? "" : `${M.frac(n(t1), n(a))} = `}${n(d)} ${sc.tu}.`,
            `From ${n(y0)} to ${n(y2)} is a factor of ${n(gb)} = ${M.sup(n(g), b)}: ${n(b)} ${wordN}.`,
            `${n(b)} × ${n(d)} = ${n(t2)} ${sc.tu}.`,
            `(With logarithms: ${M.v("k")} = ${M.frac(`${decay ? "−" : ""}ln ${n(ga)}`, n(t1))} ≈ ${fmt(k, 4)} per ${sc.tu.slice(0, -1)}, and ${t} = ${M.frac(`ln(${n(y2)}/${n(y0)})`, M.v("k"))} = ${n(t2)}.)`,
          ],
          answer: num(t2), answerText: `${n(t2)} ${sc.tu}`, answerInput: String(t2),
          vals: { g, ga, gb, a, b, d, t2, k }, params: { y0, y1, y2, t1 },
        };
      },
    },

    // ---- A2.14 Logarithms ----------------------------------------------------------------------------------------------
    "A2.7": {
      title: "Logarithms: definition and properties",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const b = r.pick([2, 3, 4, 5, 10]), k = r.int(-3, 4);
            const bk = Math.pow(b, Math.abs(k));
            if (bk > 1000) continue;
            const half = k === 2 && r.chance(0.25);
            const xs = half ? M.sqrt(n(b)) : k < 0 ? M.frac("1", n(bk)) : n(bk);
            const ans = half ? F(1, 2) : F(k);
            const powTxt = half ? `${M.sqrt(n(b))} = ${M.sup(n(b), M.frac("1", "2"))}` : k < 0 ? `${M.frac("1", n(bk))} = ${M.frac("1", M.sup(n(b), -k))} = ${M.sup(n(b), n(k))}` : k === 0 ? `1 = ${M.sup(n(b), 0)} (any base to the power 0)` : `${n(bk)} = ${M.sup(n(b), k)}`;
            return {
              prompt: `Evaluate ${M.eq(`${logb(n(b))} ${xs}`)}`,
              steps: [
                `${logb(n(b))} ${xs} asks: ${n(b)} to what power gives ${xs}?`,
                `${powTxt}.`,
                `So ${logb(n(b))} ${xs} = ${ff(ans)}.`,
              ],
              answer: num(ans.value), answerText: ff(ans), answerInput: typed(ans),
              vals: { bk: half ? b : bk, ans: fv(ans) }, params: { b, k: half ? 0.5 : k },
            };
          }
        }
        if (level === 2) {
          const isPow = (v, b) => { while (v % b === 0) v /= b; return v === 1; };
          for (;;) {
            const kind = r.int(0, 2);
            if (kind === 0) {
              const b = r.pick([6, 10, 12, 15]), k = r.pick([2, 3]), N = Math.pow(b, k);
              if (N > 2000) continue;
              const divs = [];
              for (let u = 2; u < N; u++) if (N % u === 0 && !isPow(u, b) && !isPow(N / u, b) && u < N / u) divs.push(u);
              if (!divs.length) continue;
              const u = r.pick(divs), v = N / u;
              return {
                prompt: `Evaluate without a calculator: ${M.eq(`${logb(n(b))} ${n(u)} + ${logb(n(b))} ${n(v)}`)}`,
                steps: [
                  `Neither term is a whole number on its own. Product rule: ${logb(n(b))} ${n(u)} + ${logb(n(b))} ${n(v)} = ${logb(n(b))}(${n(u)} × ${n(v)}) = ${logb(n(b))} ${n(N)}.`,
                  `${n(N)} = ${M.sup(n(b), k)}, so ${logb(n(b))} ${n(N)} = ${n(k)}.`,
                ],
                answer: num(k), answerText: n(k), answerInput: String(k), vals: { N, k }, params: { b, u, v, kind },
              };
            }
            if (kind === 1) {
              const b = r.pick([2, 3, 5]), k = r.int(2, 3), v = r.int(2, 12);
              if (isPow(v, b)) continue;
              const u = v * Math.pow(b, k);
              if (u > 1000) continue;
              return {
                prompt: `Evaluate without a calculator: ${M.eq(`${logb(n(b))} ${n(u)} − ${logb(n(b))} ${n(v)}`)}`,
                steps: [
                  `Quotient rule: ${logb(n(b))} ${n(u)} − ${logb(n(b))} ${n(v)} = ${logb(n(b))} ${M.frac(n(u), n(v))} = ${logb(n(b))} ${n(u / v)}.`,
                  `${n(u / v)} = ${M.sup(n(b), k)}, so the value is ${n(k)}.`,
                ],
                answer: num(k), answerText: n(k), answerInput: String(k), vals: { q: u / v, k }, params: { b, u, v, kind },
              };
            }
            const b = r.pick([2, 3, 5, 10]), m = r.pick([2, 3]), u = r.int(2, 12), k = r.int(1, 4);
            if (isPow(u, b)) continue;
            const um = Math.pow(u, m), bk = Math.pow(b, k);
            if (um % bk !== 0) continue;
            const v = um / bk;
            if (v < 2 || isPow(v, b) || v > 500) continue;
            return {
              prompt: `Evaluate without a calculator: ${M.eq(`${n(m)} ${logb(n(b))} ${n(u)} − ${logb(n(b))} ${n(v)}`)}`,
              steps: [
                `Power rule: ${n(m)} ${logb(n(b))} ${n(u)} = ${logb(n(b))} ${M.sup(n(u), m)} = ${logb(n(b))} ${n(um)}.`,
                `Quotient rule: ${logb(n(b))} ${n(um)} − ${logb(n(b))} ${n(v)} = ${logb(n(b))} ${M.frac(n(um), n(v))} = ${logb(n(b))} ${n(bk)}.`,
                `${n(bk)} = ${M.sup(n(b), k)}, so the value is ${n(k)}.`,
              ],
              answer: num(k), answerText: n(k), answerInput: String(k), vals: { um, bk, k }, params: { b, m, u, v, kind }, consts: [3],
            };
          }
        }
        // level 3: in terms of p = log_b 2 and q = log_b 3
        const p = M.v("p"), q = M.v("q"), lb = logb(M.v("b"));
        for (;;) {
          const i = r.int(0, 5), j = r.int(0, 4), form = r.int(0, 3);
          if (i + j < 2 || (form === 1 && (i === 0 || j === 0)) || (form === 2 && (i % 2 || j % 2 || i + j === 0) && r.chance(0.7))) continue;
          const N2 = Math.pow(2, i), N3 = Math.pow(3, j), N = N2 * N3;
          if (N > 1000) continue;
          const expr = (ci, cj, c0 = 0) => [c0 ? n(c0) : "", ci ? M.term(ci, p, { first: !c0 }) : "", cj ? M.term(cj, q, { first: !c0 && !ci }) : ""].join("");
          const fact = `${i ? (i === 1 ? "2" : M.sup("2", i)) : ""}${i && j ? " · " : ""}${j ? (j === 1 ? "3" : M.sup("3", j)) : ""}`;
          let shown, steps, ans, ansStr;
          if (form === 0) {
            shown = n(N); ans = expr(i, j); ansStr = `${i}*p + ${j}*q`;
            steps = [`Factor into primes: ${n(N)} = ${fact}.`, `Product rule, then power rule: ${lb} ${n(N)} = ${i ? `${i === 1 ? "" : `${n(i)} `}${lb} 2` : ""}${i && j ? " + " : ""}${j ? `${j === 1 ? "" : `${n(j)} `}${lb} 3` : ""}.`, `= ${ans}.`];
          } else if (form === 1) {
            shown = M.frac(n(N2), n(N3)); ans = expr(i, -j); ansStr = `${i}*p - ${j}*q`;
            steps = [`${[i > 1 ? `${n(N2)} = ${M.sup("2", i)}` : "", j > 1 ? `${n(N3)} = ${M.sup("3", j)}` : ""].filter(Boolean).join(" and ") || "Both are primes"}.`, `Quotient rule: ${lb} ${M.frac(n(N2), n(N3))} = ${lb} ${pw("2", i)} − ${lb} ${pw("3", j)}.`, `Power rule: ${ans}.`];
          } else if (form === 2) {
            shown = M.sqrt(n(N)); ans = `${M.frac(expr(i, j), "2")}`; ansStr = `(${i}*p + ${j}*q)/2`;
            steps = [`A square root is the power ${M.frac("1", "2")}: ${lb} ${M.sqrt(n(N))} = ${M.frac("1", "2")} ${lb} ${n(N)}.`, `${n(N)} = ${fact}, so ${lb} ${n(N)} = ${expr(i, j)}.`, `Halve: ${ans}.`];
          } else {
            shown = `${n(N)}${M.v("b")}`; ans = expr(i, j, 1); ansStr = `1 + ${i}*p + ${j}*q`;
            steps = [`Product rule: ${lb}(${n(N)}${M.v("b")}) = ${lb} ${n(N)} + ${lb} ${M.v("b")}, and ${lb} ${M.v("b")} = 1.`, `${n(N)} = ${fact}, so ${lb} ${n(N)} = ${expr(i, j)}.`, `Total: ${ans}.`];
          }
          return {
            prompt: `Let ${p} = ${lb} 2 and ${q} = ${lb} 3. Write ${M.eq(`${lb} ${form === 3 ? `(${shown})` : shown}`)} in terms of ${p} and ${q}.`,
            steps, answer: { kind: "expr", expr: ansStr, vars: ["p", "q"] }, answerText: ans,
            answerInput: ansStr.replace(/\*/g, ""),
            vals: { i, j, N, N2, N3 }, params: { i, j, form }, consts: [3],
          };
        }
      },
    },

    // ---- A2.15 Graphs of exponential and logarithmic functions ------------------------------------------------------------
    "A2.exp-log-graphs": {
      title: "Graphs of exponentials and logarithms",
      generate(r, level) {
        if (level === 1) {
          const b = r.pick([F(2), F(3), F(4), F(1, 2), F(1, 3), F(1, 4)]);
          const s = b.n > 1 ? (b.eq(2) && r.chance(0.4) ? 2 : 1) : b.eq(F(1, 2)) && r.chance(0.4) ? -2 : -1;
          const v = b.pow(s);
          return {
            prompt: `The graph of ${y} = ${M.sup(M.v("b"), x)} passes through the marked points. Find ${M.v("b")}.`,
            graph: graph({ view: [-4, 4, -1, 7], items: [{ t: "fn", e: `(${typed(b)})^x` }, { t: "pt", x: 0, y: 1 }, { t: "pt", x: s, y: v.value }] }),
            steps: [
              `Every ${y} = ${M.sup(M.v("b"), x)} passes through (0, 1), since ${M.sup(M.v("b"), "0")} = 1. The other point is (${n(s)}, ${ff(v)}).`,
              `So ${M.sup(M.v("b"), n(s))} = ${ff(v)}.`,
              s === 1 ? `${M.v("b")} = ${ff(b)}.` : s === 2 ? `${M.v("b")} = ${M.sqrt(ff(v))} = ${ff(b)} (a base is positive).`
                : s === -1 ? `${M.sup(M.v("b"), "−1")} = ${M.frac("1", M.v("b"))} = ${ff(v)}, so ${M.v("b")} = ${ff(b)}: the graph falls, a decay base below 1.`
                : `${M.frac("1", M.sup(M.v("b"), 2))} = ${ff(v)}, so ${M.sup(M.v("b"), 2)} = ${M.frac("1", ff(v))} and ${M.v("b")} = ${ff(b)}: the graph falls, a decay base below 1.`,
            ],
            answer: num(b.value), answerText: `${M.v("b")} = ${ff(b)}`, answerInput: typed(b),
            vals: { v: fv(v), b: fv(b) }, params: { s, pt: fv(v) },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const b = r.pick([2, 3]), a = r.pick([-3, -2, -1, 1, 2, 3]), h = r.int(-2, 1), k = r.nonzero(-4, 4);
            const bh = F(b).pow(-h), yi = bh.mul(a).add(k);
            return {
              prompt: `For ${M.eq(`${y} = ${csDot(a)}${M.sup(n(b), M.poly([1, -h]))}${M.term(k, "")}`)} find the horizontal asymptote and the ${y}-intercept. Enter the asymptote's ${y}-value, then the ${y}-intercept.`,
              steps: [
                `${M.sup(n(b), M.poly([1, -h]))} is always positive and tends to 0 on the left, so ${y} levels off at ${n(k)}: the asymptote is ${y} = ${n(k)}.`,
                `${y}-intercept: put ${x} = 0: ${y} = ${csDot(a)}${M.sup(n(b), n(-h))}${M.term(k, "")} = ${n(a)} · ${ff(bh)}${M.term(k, "")} = ${ff(yi)}.`,
                `Asymptote ${y} = ${n(k)}; ${y}-intercept (0, ${ff(yi)}).`,
              ],
              answer: { kind: "numbers", values: [k, yi.value], ordered: true }, answerText: `${y} = ${n(k)} and (0, ${ff(yi)})`,
              answerInput: `${k}, ${typed(yi)}`, vals: { bh: fv(bh), yi: fv(yi), nh: -h }, params: { b, a, h, k, kind: 0 },
            };
          }
          const b = r.pick([2, 3, 10]), h = r.nonzero(-4, 4), k = r.int(-2, 2);
          const bk = F(b).pow(-k), xi = bk.add(h);
          return {
            prompt: `For ${M.eq(`${y} = ${logb(n(b))}(${M.poly([1, -h])})${M.term(k, "")}`)} find the vertical asymptote and the ${x}-intercept. Enter the asymptote's ${x}-value, then the ${x}-intercept.`,
            steps: [
              `A logarithm needs a positive argument: ${M.poly([1, -h])} &gt; 0, so ${x} &gt; ${n(h)}. The graph plunges down along ${x} = ${n(h)}: the vertical asymptote.`,
              `${x}-intercept: set ${y} = 0: ${logb(n(b))}(${M.poly([1, -h])}) = ${n(-k)}, so ${M.poly([1, -h])} = ${M.sup(n(b), n(-k))} = ${ff(bk)}.`,
              `${x} = ${ff(bk)} + ${np(h)} = ${ff(xi)}. Asymptote ${x} = ${n(h)}; ${x}-intercept (${ff(xi)}, 0).`,
            ],
            answer: { kind: "numbers", values: [h, xi.value], ordered: true }, answerText: `${x} = ${n(h)} and (${ff(xi)}, 0)`,
            answerInput: `${h}, ${typed(xi)}`, vals: { nk: -k, bk: fv(bk), xi: fv(xi) }, params: { b, h, k, kind: 1 },
          };
        }
        // level 3: read y = b^(x − h) + k off its graph
        const b = r.pick([F(2), F(3), F(1, 2)]), h = r.int(-3, 3), k = r.int(-3, 3);
        const s2 = b.n > 1 ? 1 : -1, y2 = b.pow(s2).add(k);
        const ex_ = `(${typed(b)})^(x - (${h})) + (${k})`;
        const eqTxt = `${y} = ${M.sup(b.isInt() ? n(b.n) : `(${ff(b)})`, M.poly([1, -h]))}${M.term(k, "")}`;
        return {
          prompt: `The graph is ${y} = ${M.sup(M.v("b"), `${x} − ${M.v("h")}`)} + ${M.v("k")}. The marked points sit on grid corners. Find its equation.`,
          graph: graph({ view: [h - 4, h + 4, k - 2, k + 6], items: [{ t: "fn", e: ex_ }, { t: "pt", x: h, y: k + 1 }, { t: "pt", x: h + s2, y: y2.value }] }),
          steps: [
            `The curve levels off at ${y} = ${n(k)} on the ${b.n > 1 ? "left" : "right"}: that horizontal asymptote is ${y} = ${M.v("k")}, so ${M.v("k")} = ${n(k)}.`,
            `The parent's key point (0, 1) moves to (${M.v("h")}, 1 + ${M.v("k")}). The marked point one unit above the asymptote is (${n(h)}, ${n(k + 1)}), so ${M.v("h")} = ${n(h)}.`,
            `One step ${s2 > 0 ? "right" : "left"} of it, at (${n(h + s2)}, ${ff(y2)}), the height above the asymptote is ${ff(y2)} − ${np(k)} = ${ff(b.pow(s2))} = ${M.sup(M.v("b"), n(s2))}, so ${M.v("b")} = ${ff(b)}.`,
            `${eqTxt}.`,
          ],
          answer: { kind: "expr", expr: ex_, vars: ["x"] }, answerText: eqTxt,
          answerInput: `${b.isInt() ? b.n : `(${typed(b)})`}^(${ptyped([1, -h])})${k ? (k > 0 ? ` + ${k}` : ` - ${-k}`) : ""}`,
          vals: { kp1: k + 1, hs: h + s2, y2: fv(y2), bs: fv(b.pow(s2)), b: fv(b) }, params: { h, k, pts: [[h, k + 1], [h + s2, y2.value]] },
        };
      },
    },

    // ---- A2.16 Change of base and exponential equations ---------------------------------------------------------------
    "A2.8": {
      title: "Exponential equations and change of base",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const b = r.pick([2, 3, 5, 10]), sol = r.int(-3, 5), a = r.int(1, 4), c = r.int(-5, 5);
            const m = a * sol + c;
            if (m < 1 || Math.pow(b, m) > 10000) continue;
            const N = Math.pow(b, m);
            return {
              prompt: `Solve ${M.eq(`${M.sup(n(b), M.poly([a, c]))} = ${n(N)}`)}`,
              steps: [
                `Write the right side as a power of ${n(b)}: ${n(N)} = ${M.sup(n(b), m)}.`,
                `Same base, so the exponents are equal: ${M.poly([a, c])} = ${n(m)}.`,
                a === 1 ? `${x} = ${n(m)} − ${np(c)} = ${n(sol)}.` : `${kv(a)} = ${n(m)} − ${np(c)} = ${n(m - c)}, so ${x} = ${M.frac(n(m - c), n(a))} = ${n(sol)}.`,
              ],
              answer: num(sol), answerText: `${x} = ${n(sol)}`, answerInput: String(sol),
              vals: { m, mc: m - c, sol }, params: { b, a, c, N },
            };
          }
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            // A·b^x + d = e: logarithms, rounded
            for (;;) {
              const A = r.int(2, 6), b = r.pick([2, 3, 5, 1.5, 1.2]), c = r.int(3, 60), d = r.int(-20, 20);
              const isPow = (() => { let v = c; if (!Number.isInteger(b)) return false; while (v % b === 0) v /= b; return v === 1; })();
              if (isPow) continue;
              const e = A * c + d, lc = Math.log(c), lb = Math.log(b), xv = lc / lb;
              const lc4 = Math.round(lc * 1e4) / 1e4, lb4 = Math.round(lb * 1e4) / 1e4;
              const x2 = Math.round(xv * 100) / 100;
              if (Math.abs(xv * 100 - Math.floor(xv * 100) - 0.5) < 0.05 || Math.round((lc4 / lb4) * 100) / 100 !== x2) continue;
              return {
                prompt: `Solve ${M.eq(`${n(A)} · ${M.sup(n(b), x)}${M.term(d, "")} = ${n(e)}`)} Round to 2 decimal places.`,
                steps: [
                  `Isolate the power: ${n(A)} · ${M.sup(n(b), x)} = ${n(e)} − ${np(d)} = ${n(A * c)}, so ${M.sup(n(b), x)} = ${M.frac(n(A * c), n(A))} = ${n(c)}.`,
                  `${n(c)} is not a whole power of ${n(b)}, so take ln of both sides: ${x} ln ${n(b)} = ln ${n(c)} (power rule).`,
                  `${x} = ${M.frac(`ln ${n(c)}`, `ln ${n(b)}`)} ≈ ${M.frac(fmt(lc, 4), fmt(lb, 4))} ≈ ${fix2(x2)}.`,
                ],
                answer: num(xv, 2), answerText: `${x} ≈ ${fix2(x2)}`, answerInput: x2.toFixed(2),
                vals: { Ac: A * c, c, lc, lb, x2 }, params: { A, b, d, e, kind: 0 },
              };
            }
          }
          for (;;) {
            const g = r.pick([2, 3]), [p, q] = r.pick([[2, 3], [3, 2], [2, 1], [1, 2], [3, 1], [1, 3], [3, 4], [4, 3]]);
            const B1 = Math.pow(g, p), B2 = Math.pow(g, q);
            if (B1 > 81 || B2 > 81) continue;
            const c = r.int(-4, 4), e = r.int(-4, 4);
            const sol = F(q * e - p * c, p - q);
            const L1 = M.poly([1, c]), L2 = M.poly([1, e]);
            const mulL = (k, L, z) => (k === 1 ? L : z === 0 ? `${n(k)}${x}` : `${n(k)}(${L})`);
            return {
              prompt: `Solve ${M.eq(`${M.sup(n(B1), L1)} = ${M.sup(n(B2), L2)}`)}`,
              steps: [
                `Both bases are powers of ${n(g)}: ${n(B1)} = ${M.sup(n(g), p)} and ${n(B2)} = ${M.sup(n(g), q)}.`,
                `So ${M.sup(n(g), mulL(p, L1, c))} = ${M.sup(n(g), mulL(q, L2, e))}, and the exponents must be equal: ${mulL(p, L1, c)} = ${mulL(q, L2, e)}.`,
                `Expand: ${M.poly([p, p * c])} = ${M.poly([q, q * e])}, so ${kv(p - q)} = ${p * c === 0 ? n(q * e) : `${n(q * e)} − ${np(p * c)} = ${n(q * e - p * c)}`}${p - q === 1 ? "" : `, and ${x} = ${M.frac(n(q * e - p * c), n(p - q))} = ${ff(sol)}`}.`,
              ],
              answer: num(sol.value), answerText: `${x} = ${ff(sol)}`, answerInput: typed(sol),
              vals: { B1, B2, pc: p * c, qe: q * e, top: q * e - p * c, pq: p - q, sol: fv(sol) }, params: { g, p, q, c, e, kind: 1 },
            };
          }
        }
        // level 3
        if (r.chance(0.5)) {
          for (;;) {
            const b = r.pick([2, 3]), m1 = r.int(0, b === 2 ? 4 : 3), neg = r.chance(0.4);
            const s1 = Math.pow(b, m1);
            const m2 = neg ? null : r.intExcept(0, b === 2 ? 4 : 3, m1);
            const s2 = neg ? -r.int(1, 8) : Math.pow(b, m2);
            const S_ = s1 + s2, Pr = s1 * s2;
            if (S_ === 0) continue;
            const u = M.v("u");
            const sols = neg ? [m1] : [m1, m2];
            const solve1 = (s, m) => `${M.sup(n(b), x)} = ${n(s)} = ${M.sup(n(b), m)} gives ${x} = ${n(m)}`;
            return {
              prompt: `Solve ${M.eq(`${M.sup(n(b), `2${x}`)}${tmul(-S_, ` · ${M.sup(n(b), x)}`)}${M.term(Pr, "")} = 0`)}${neg ? "" : " Enter both solutions."}`,
              steps: [
                `${M.sup(n(b), `2${x}`)} = ${M.sup(`(${M.sup(n(b), x)})`, 2)}, so put ${u} = ${M.sup(n(b), x)}: ${M.poly([1, -S_, Pr], "u")} = 0.`,
                `Factor: (${M.poly([1, -s1], "u")})(${M.poly([1, -s2], "u")}) = 0, so ${u} = ${n(s1)} or ${u} = ${n(s2)}.`,
                `${solve1(s1, m1)}.`,
                neg ? `${M.sup(n(b), x)} = ${n(s2)} is impossible: a power of a positive base is always positive. Reject it.` : `${solve1(s2, m2)}.`,
              ],
              answer: { kind: "numbers", values: sols }, answerText: sols.map((v) => `${x} = ${n(v)}`).join(" or "), answerInput: sols.join(", "),
              vals: { s1, s2, S: S_, Pr, m1, m2: neg ? 0 : m2 }, params: { b, S: S_, Pr, m1, kind: 0 },
            };
          }
        }
        for (;;) {
          const rp = r.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 12]), mult = r.pick([2, 2, 3]), P0 = r.pick([1000, 2000, 5000, 10000]);
          const g = 1 + rp / 100, tv = Math.log(mult) / Math.log(g);
          const lm4 = Math.round(Math.log(mult) * 1e4) / 1e4, lg4 = Math.round(Math.log(g) * 1e6) / 1e6, t2 = Math.round(tv * 100) / 100;
          if (Math.abs(tv * 100 - Math.floor(tv * 100) - 0.5) < 0.05 || Math.round((lm4 / lg4) * 100) / 100 !== t2) continue;
          const goal = P0 * mult;
          return {
            prompt: `An investment of ${P.money(P0)} earns ${n(rp)}% a year, compounded annually. How many years until it is worth ${P.money(goal)}? Round to 2 decimal places.`,
            steps: [
              `${n(P0)}${M.sup(`(1 + ${n(rp / 100)})`, M.v("t"))} = ${n(goal)}, so ${M.sup(n(g), M.v("t"))} = ${M.frac(n(goal), n(P0))} = ${n(mult)}.`,
              `Take ln of both sides: ${M.v("t")} ln ${n(g)} = ln ${n(mult)}.`,
              `${M.v("t")} = ${M.frac(`ln ${n(mult)}`, `ln ${n(g)}`)} ≈ ${M.frac(fmt(Math.log(mult), 4), fmt(Math.log(g), 6))} ≈ ${fix2(t2)} years.`,
            ],
            answer: num(tv, 2), answerText: `${fix2(t2)} years`, answerInput: t2.toFixed(2),
            vals: { goal, rdec: rp / 100, g, mult, lm: Math.log(mult), lg: Math.log(g), t2 }, params: { P0, rp, mult, kind: 1 }, consts: [100],
          };
        }
      },
    },

    // ---- A2.17 Logarithmic equations ------------------------------------------------------------------------------------------
    "A2.log-eq": {
      title: "Logarithmic equations",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const b = r.pick([2, 3, 5, 10]), k = r.int(1, 4), sol = r.int(-6, 12), a = r.nonzero(-5, 5);
            const bk = Math.pow(b, k);
            if (bk > 1000) continue;
            const c = bk - a * sol;
            return {
              prompt: `Solve ${M.eq(`${logb(n(b))}(${M.poly([a, c])}) = ${n(k)}`)}`,
              steps: [
                `Rewrite in exponential form: ${M.poly([a, c])} = ${M.sup(n(b), k)} = ${n(bk)}.`,
                a === 1 ? `${x} = ${n(bk)} − ${np(c)} = ${n(sol)}.` : `${kv(a)} = ${n(bk)} − ${np(c)} = ${n(bk - c)}, so ${x} = ${M.frac(n(bk - c), n(a))} = ${n(sol)}.`,
                `Check: the argument is ${times(a, sol)}${M.term(c, "")} = ${n(bk)} &gt; 0. ✓`,
              ],
              answer: num(sol), answerText: `${x} = ${n(sol)}`, answerInput: String(sol),
              vals: { bk, bkc: bk - c, sol }, params: { b, a, c, k },
            };
          }
        }
        if (level === 2) {
          const b = r.pick([2, 3, 5, 10]);
          if (r.chance(0.5)) {
            const a = r.nonzero(-6, 6), d = r.intExcept(-6, 6, 0, a), sol = r.int(-6, 8), A = r.int(1, 20);
            const c = A - a * sol, e = A - d * sol;
            return {
              prompt: `Solve ${M.eq(`${logb(n(b))}(${M.poly([a, c])}) = ${logb(n(b))}(${M.poly([d, e])})`)}`,
              steps: [
                `Equal logs in the same base have equal arguments: ${M.poly([a, c])} = ${M.poly([d, e])}.`,
                `${kv(a)} − ${np(d)}${x} = ${n(e)} − ${np(c)}, so ${kv(a - d)} = ${n(e - c)}${a - d === 1 ? "" : ` and ${x} = ${M.frac(n(e - c), n(a - d))} = ${n(sol)}`}.`,
                `Check: both arguments equal ${n(A)} at ${x} = ${n(sol)}, which is positive. ✓`,
              ],
              answer: num(sol), answerText: `${x} = ${n(sol)}`, answerInput: String(sol),
              vals: { ad: a - d, ec: e - c, sol, A }, params: { b, a, c, d, e, kind: 0 },
            };
          }
          for (;;) {
            const k = r.int(1, 2), bk = Math.pow(b, k), sol = r.int(1, 12), p = sol * (bk - 1);
            if (p > 200) continue;
            return {
              prompt: `Solve ${M.eq(`${logb(n(b))}(${M.poly([1, p])}) − ${logb(n(b))} ${x} = ${n(k)}`)}`,
              steps: [
                `Quotient rule: ${logb(n(b))} ${M.frac(M.poly([1, p]), x)} = ${n(k)}.`,
                `Exponential form: ${M.frac(M.poly([1, p]), x)} = ${M.sup(n(b), k)} = ${n(bk)}, so ${M.poly([1, p])} = ${kv(bk)}.`,
                bk - 1 === 1 ? `${n(p)} = ${x}.` : `${n(p)} = ${kv(bk - 1)}, so ${x} = ${M.frac(n(p), n(bk - 1))} = ${n(sol)}.`,
                `Check: ${x} = ${n(sol)} &gt; 0 and ${x} + ${n(p)} = ${n(sol + p)} &gt; 0. ✓`,
              ],
              answer: num(sol), answerText: `${x} = ${n(sol)}`, answerInput: String(sol),
              vals: { bk, bk1: bk - 1, sol, sp: sol + p }, params: { b, p, k, kind: 1 },
            };
          }
        }
        // level 3
        if (r.chance(0.55)) {
          for (;;) {
            const b = r.pick([2, 3, 4, 5, 6, 10]), k = r.int(1, 4), N = Math.pow(b, k);
            if (N > 100 || N < 4) continue;
            const pairs = [];
            for (let w = 1; w * w < N; w++) if (N % w === 0) pairs.push([N / w, w]);
            if (!pairs.length) continue;
            const [v, w] = r.pick(pairs), a = v - w;
            return {
              prompt: `Solve ${M.eq(`${logb(n(b))} ${x} + ${logb(n(b))}(${M.poly([1, -a])}) = ${n(k)}`)}`,
              steps: [
                `Domain first: ${x} &gt; 0 and ${M.poly([1, -a])} &gt; 0, so ${x} &gt; ${n(a)}.`,
                `Product rule: ${logb(n(b))}(${x}(${M.poly([1, -a])})) = ${n(k)}, so ${x}(${M.poly([1, -a])}) = ${M.sup(n(b), k)} = ${n(N)}.`,
                `${M.poly([1, -a, -N])} = 0 factors as (${M.poly([1, -v])})(${M.poly([1, w])}) = 0: ${x} = ${n(v)} or ${x} = ${n(-w)}.`,
                `${x} = ${n(-w)} would need the log of a negative number: extraneous. ${x} = ${n(v)} works: ${logb(n(b))} ${n(v)} + ${logb(n(b))} ${n(w)} = ${logb(n(b))} ${n(N)} = ${n(k)}.`,
              ],
              answer: num(v), answerText: `${x} = ${n(v)}`, answerInput: String(v),
              vals: { a, N, v, w, nw: -w }, params: { b, a, k, kind: 0 },
            };
          }
        }
        const S = [["a whisper", 30], ["a quiet library", 40], ["normal conversation", 60], ["a vacuum cleaner", 70], ["heavy traffic", 80], ["a lawn mower", 90], ["a rock concert", 110], ["a jet engine nearby", 130]];
        let i, j;
        do { i = r.int(0, 7); j = r.int(0, 7); } while (S[j][1] - S[i][1] < 20);
        const [lo, L1] = S[i], [hi, L2] = S[j], m = (L2 - L1) / 10, ratio = Math.pow(10, m);
        const I1 = M.sub(M.v("I"), "1"), I2 = M.sub(M.v("I"), "2");
        return {
          prompt: `Loudness in decibels is ${M.eq(`${M.v("L")} = 10 ${logb("10")} ${M.frac(M.v("I"), M.sub(M.v("I"), "0"))}`)} where ${M.v("I")} is the sound's intensity. ${cap(lo)} measures ${n(L1)} dB and ${hi} ${n(L2)} dB. How many times as intense is ${hi}?`,
          steps: [
            `Subtract the two levels: ${M.sub(M.v("L"), "2")} − ${M.sub(M.v("L"), "1")} = 10 ${logb("10")} ${M.frac(I2, M.sub(M.v("I"), "0"))} − 10 ${logb("10")} ${M.frac(I1, M.sub(M.v("I"), "0"))} = 10 ${logb("10")} ${M.frac(I2, I1)} (quotient rule; ${M.sub(M.v("I"), "0")} cancels).`,
            `${n(L2)} − ${n(L1)} = ${n(L2 - L1)} = 10 ${logb("10")} ${M.frac(I2, I1)}, so ${logb("10")} ${M.frac(I2, I1)} = ${n(m)}.`,
            `Exponential form: ${M.frac(I2, I1)} = ${M.sup("10", m)} = ${P.grouped(ratio)}.`,
          ],
          answer: num(ratio), answerText: `${P.grouped(ratio)} times`, answerInput: String(ratio),
          vals: { dL: L2 - L1, m, ratio }, params: { L1, L2, kind: 1 }, consts: [10],
        };
      },
    },

    // ---- A2.18 Arithmetic sequences and series ------------------------------------------------------------------------
    "A2.9": {
      title: "Arithmetic sequences and series",
      generate(r, level) {
        const a = (k) => M.sub(M.v("a"), k);
        if (level === 1) {
          const nn = r.int(12, 40);
          if (r.chance(0.5)) {
            const d = r.pick([-2, -1, 1, 2]), m = r.int(-2, 2), a1 = m - 2 * d, an = a1 + (nn - 1) * d;
            const terms = [0, 1, 2, 3, 4].map((k) => a1 + k * d);
            return {
              prompt: `The graph shows the first five terms of an arithmetic sequence, as points (${M.v("n")}, ${a(M.v("n"))}). Find ${a(n(nn))}.`,
              graph: graph({ view: [0, 6, m - 4, m + 4], items: terms.map((v, k) => ({ t: "pt", x: k + 1, y: v })) }),
              steps: [
                `Read the points: ${a("1")} = ${n(a1)}, ${a("2")} = ${n(terms[1])}, ${a("3")} = ${n(terms[2])}. Each step ${d > 0 ? "rises" : "falls"} by ${n(Math.abs(d))}, so ${M.v("d")} = ${n(d)}.`,
                `${a(M.v("n"))} = ${a("1")} + (${M.v("n")} − 1)${M.v("d")}: ${a(n(nn))} = ${n(a1)} + ${n(nn - 1)} · ${np(d)} = ${n(an)}.`,
              ],
              answer: num(an), answerText: n(an), answerInput: String(an),
              vals: { terms, a1, d, nm1: nn - 1, an }, params: { terms, nn }, consts: [3],
            };
          }
          const a1 = r.int(-20, 20), d = r.nonzero(-9, 9), an = a1 + (nn - 1) * d;
          const terms = [0, 1, 2, 3].map((k) => a1 + k * d);
          return {
            prompt: `Find the ${ord(nn)} term of the arithmetic sequence ${M.eq(`${terms.map(n).join(", ")}, …`)}`,
            steps: [
              `Common difference: ${M.v("d")} = ${n(terms[1])} − ${np(terms[0])} = ${n(d)}.`,
              `${a(M.v("n"))} = ${a("1")} + (${M.v("n")} − 1)${M.v("d")}: ${a(n(nn))} = ${n(a1)} + ${n(nn - 1)} · ${np(d)} = ${n(a1)}${M.term((nn - 1) * d, "")} = ${n(an)}.`,
            ],
            answer: num(an), answerText: n(an), answerInput: String(an),
            vals: { terms, d, nm1: nn - 1, prod: (nn - 1) * d, an }, params: { terms, nn }, consts: [3],
          };
        }
        if (level === 2) {
          const a1 = r.int(-10, 20), d = r.pick([-7, -5, -4, -3, -2, 2, 3, 4, 5, 6, 7]), nn = r.int(10, 30), an = a1 + (nn - 1) * d;
          const S_ = (nn * (a1 + an)) / 2;
          const shown = d > 0 && a1 > 0 ? `${n(a1)} + ${n(a1 + d)} + ${n(a1 + 2 * d)} + ⋯ + ${n(an)}` : `${np(a1)} + ${np(a1 + d)} + ${np(a1 + 2 * d)} + ⋯ + ${np(an)}`;
          return {
            prompt: `Find the sum of the arithmetic series ${M.eq(shown)}`,
            steps: [
              `Common difference: ${M.v("d")} = ${n(a1 + d)} − ${np(a1)} = ${n(d)}.`,
              `Number of terms: ${M.v("n")} = ${M.frac(`${a(M.v("n"))} − ${a("1")}`, M.v("d"))} + 1 = ${M.frac(`${n(an)} − ${np(a1)}`, n(d))} + 1 = ${n(nn - 1)} + 1 = ${n(nn)}.`,
              `${M.sub(M.v("S"), M.v("n"))} = ${M.frac(`${M.v("n")}(${a("1")} + ${a(M.v("n"))})`, "2")} = ${M.frac(`${n(nn)}(${n(a1)} + ${np(an)})`, "2")} = ${M.frac(`${n(nn)} · ${np(a1 + an)}`, "2")} = ${n(S_)}.`,
            ],
            answer: num(S_), answerText: n(S_), answerInput: String(S_),
            vals: { a2: a1 + d, a3: a1 + 2 * d, an, d, nm1: nn - 1, nn, sum: a1 + an, S: S_ }, params: { a1, d, an }, consts: [3],
          };
        }
        if (r.chance(0.5)) {
          const r1 = r.int(12, 30), d = r.int(1, 4), nn = r.int(10, 30), last = r1 + (nn - 1) * d, S_ = (nn * (r1 + last)) / 2;
          return {
            prompt: `A theater's first row has ${n(r1)} seats, and each row has ${n(d)} more seat${d === 1 ? "" : "s"} than the one in front. There are ${n(nn)} rows. How many seats are there in all?`,
            steps: [
              `The rows form an arithmetic sequence with ${a("1")} = ${n(r1)} and ${M.v("d")} = ${n(d)}.`,
              `Last row: ${a(n(nn))} = ${n(r1)} + ${n(nn - 1)} · ${n(d)} = ${n(last)} seats.`,
              `Total: ${M.sub(M.v("S"), n(nn))} = ${M.frac(`${n(nn)}(${n(r1)} + ${n(last)})`, "2")} = ${M.frac(`${n(nn)} · ${n(r1 + last)}`, "2")} = ${n(S_)} seats.`,
            ],
            answer: num(S_), answerText: `${n(S_)} seats`, answerInput: String(S_),
            vals: { nm1: nn - 1, last, sum: r1 + last, S: S_ }, params: { r1, d, nn },
          };
        }
        for (;;) {
          const a1 = r.int(-20, 20), d = r.nonzero(-8, 8), p = r.int(2, 8), q = r.int(p + 2, p + 12), nn = r.int(q + 5, 60);
          const ap = a1 + (p - 1) * d, aq = a1 + (q - 1) * d, an = a1 + (nn - 1) * d;
          return {
            prompt: `In an arithmetic sequence ${M.eq(`${a(n(p))} = ${n(ap)} and ${a(n(q))} = ${n(aq)}`)} Find ${a(n(nn))}.`,
            steps: [
              `From term ${n(p)} to term ${n(q)} is ${n(q)} − ${n(p)} = ${n(q - p)} steps of ${M.v("d")}: ${n(q - p)}${M.v("d")} = ${n(aq)} − ${np(ap)} = ${n(aq - ap)}, so ${M.v("d")} = ${n(d)}.`,
              `From term ${n(q)} to term ${n(nn)} is ${n(nn - q)} more steps: ${a(n(nn))} = ${n(aq)} + ${n(nn - q)} · ${np(d)} = ${n(an)}.`,
            ],
            answer: num(an), answerText: n(an), answerInput: String(an),
            vals: { qp: q - p, diff: aq - ap, d, nq: nn - q, an }, params: { p, q, ap, aq, nn },
          };
        }
      },
    },

    // ---- A2.19 Geometric sequences and series --------------------------------------------------------------------------
    "A2.10": {
      title: "Geometric sequences and series",
      generate(r, level) {
        const a = (k) => M.sub(M.v("a"), k);
        if (level === 1) {
          for (;;) {
            const rr = r.pick([F(2), F(3), F(-2), F(-3), F(1, 2), F(-1, 2)]), nn = r.int(5, 8);
            let a1 = F(r.nonzero(-5, 5));
            if (rr.d === 2) a1 = a1.mul(Math.pow(2, nn - 1));
            const an = a1.mul(rr.pow(nn - 1));
            if (Math.abs(an.value) > 5000) continue;
            const terms = [0, 1, 2].map((k) => a1.mul(rr.pow(k)));
            return {
              prompt: `Find the ${ord(nn)} term of the geometric sequence ${M.eq(`${terms.map((t) => ff(t)).join(", ")}, …`)}`,
              steps: [
                `Common ratio: ${M.v("r")} = ${M.frac(ff(terms[1]), ff(terms[0]))} = ${ff(rr)}.`,
                `${a(M.v("n"))} = ${a("1")}${M.sup(M.v("r"), `${M.v("n")} − 1`)}: ${a(n(nn))} = ${ff(a1)} · ${M.sup(fpow(rr), nn - 1)} = ${ff(a1)} · ${ffp(rr.pow(nn - 1))} = ${ff(an)}.`,
              ],
              answer: num(an.value), answerText: ff(an), answerInput: typed(an),
              vals: { terms: terms.map(fv), r: fv(rr), nm1: nn - 1, rp: fv(rr.pow(nn - 1)), an: fv(an) }, params: { a1: fv(a1), r: fv(rr), nn },
            };
          }
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const a1 = r.int(1, 5) * r.sign(), rr = r.pick([2, 3, -2]), nn = r.int(4, rr === 3 ? 6 : 8);
            const rn = Math.pow(rr, nn), S_ = (a1 * (1 - rn)) / (1 - rr);
            const terms = [0, 1, 2].map((k) => a1 * Math.pow(rr, k)), last = a1 * Math.pow(rr, nn - 1);
            return {
              prompt: `Find the sum of the first ${n(nn)} terms of ${M.eq(`${terms.map(n).join(", ")}, …`)}`,
              steps: [
                `${a("1")} = ${n(a1)} and ${M.v("r")} = ${M.frac(n(terms[1]), n(terms[0]))} = ${n(rr)}. (The ${ord(nn)} term is ${n(last)}.)`,
                `${M.sub(M.v("S"), M.v("n"))} = ${M.frac(`${a("1")}(1 − ${M.sup(M.v("r"), M.v("n"))})`, `1 − ${M.v("r")}`)} = ${M.frac(`${n(a1)}(1 − ${M.sup(np(rr), nn)})`, `1 − ${np(rr)}`)} = ${M.frac(`${n(a1)}(1 − ${np(rn)})`, n(1 - rr))}.`,
                `= ${M.frac(`${n(a1)} · ${np(1 - rn)}`, n(1 - rr))} = ${M.frac(n(a1 * (1 - rn)), n(1 - rr))} = ${n(S_)}.`,
              ],
              answer: num(S_), answerText: n(S_), answerInput: String(S_),
              vals: { terms, last, rn, omr: 1 - rr, omrn: 1 - rn, top: a1 * (1 - rn), S: S_ }, params: { a1, r: rr, nn },
            };
          }
          let ab;
          do ab = r.int(1, 98); while (ab % 11 === 0 || ab % 10 === 0 && r.chance(0.6));
          const q = F(ab, 99), g = P.gcd(ab, 99);
          const digits = String(ab).padStart(2, "0");
          return {
            prompt: `Write ${M.eq(`0.<span style="text-decoration:overline">${digits}</span>`)} as a fraction in lowest terms.`,
            steps: [
              `The block ${digits} repeats every 2 places: 0.${digits}<span>${digits}</span><span>${digits}</span>… = ${M.frac(n(ab), "100")} + ${M.frac(n(ab), "10000")} + ⋯, a geometric series with ${a("1")} = ${M.frac(n(ab), "100")} and ${M.v("r")} = ${M.frac("1", "100")}.`,
              `${M.sub(M.v("S"), "∞")} = ${M.frac(a("1"), `1 − ${M.v("r")}`)} = ${M.frac(M.frac(n(ab), "100"), M.frac("99", "100"))} = ${M.frac(n(ab), "99")}.`,
              g > 1 ? `Divide top and bottom by ${n(g)}: ${ff(q)}.` : `${n(ab)} and 99 share no factor: ${ff(q)}.`,
            ],
            answer: num(q.value), answerText: ff(q), answerInput: typed(q),
            vals: { ab, abh: ab / 100, g, q: fv(q) }, params: { ab }, consts: [99, 100, 10000],
          };
        }
        if (r.chance(0.5)) {
          for (;;) {
            const rr = r.pick([F(1, 2), F(2, 3), F(3, 4), F(3, 5), F(4, 5), F(2, 5)]), k = r.int(1, 6), h = (rr.d - rr.n) * k * r.pick([1, 2]);
            if (h > 20 || h < 2) continue;
            const up = rr.mul(h), tail = up.mul(2).div(F(1).sub(rr)), total = tail.add(h);
            if (!total.isInt()) continue;
            return {
              prompt: `A ball is dropped from ${n(h)} m. Each bounce rises to ${ff(rr)} of the height before it. In theory it bounces forever. What total vertical distance does it travel, in meters?`,
              steps: [
                `Down ${n(h)} m first. Then each bounce goes up and back down the same height: ${ff(up)} m, then ${ff(up.mul(rr))} m, …: a geometric series with ratio ${ff(rr)}.`,
                `The bounce heights add to ${M.frac(ff(up), `1 − ${ff(rr)}`)} = ${M.frac(ff(up), ff(F(1).sub(rr)))} = ${ff(up.div(F(1).sub(rr)))} m; each is travelled twice: ${ff(tail)} m.`,
                `Total: ${n(h)} + ${ff(tail)} = ${ff(total)} m.`,
              ],
              answer: num(total.value), answerText: `${ff(total)} m`, answerInput: typed(total),
              vals: { up: fv(up), up2: fv(up.mul(rr)), omr: fv(F(1).sub(rr)), sumUp: fv(up.div(F(1).sub(rr))), tail: fv(tail), total: fv(total) }, params: { h, r: fv(rr) },
            };
          }
        }
        for (;;) {
          const rr = r.pick([F(1, 2), F(-1, 2), F(1, 3), F(-1, 3), F(2, 3), F(-2, 3), F(1, 4), F(3, 4)]);
          const a1 = F(r.int(1, 6) * rr.d * rr.d * (r.chance(0.3) ? -1 : 1));
          const terms = [0, 1, 2, 3].map((k) => a1.mul(rr.pow(k)));
          if (!terms.slice(0, 3).every((t) => t.isInt())) continue;
          const S_ = a1.div(F(1).sub(rr));
          const shown = terms.map((t, k) => (k === 0 ? ff(t) : ` ${t.n < 0 ? "−" : "+"} ${ff(t.abs())}`)).join("") + " + ⋯";
          return {
            prompt: `Find the sum of the infinite geometric series ${M.eq(shown)}`,
            steps: [
              `Ratio: ${M.v("r")} = ${M.frac(ff(terms[1]), ff(terms[0]))} = ${ff(rr)}. Since |${M.v("r")}| &lt; 1, the series converges.`,
              `${M.sub(M.v("S"), "∞")} = ${M.frac(a("1"), `1 − ${M.v("r")}`)} = ${M.frac(ff(a1), `1 − ${ffp(rr)}`)} = ${M.frac(ff(a1), ff(F(1).sub(rr)))} = ${ff(S_)}.`,
            ],
            answer: num(S_.value), answerText: ff(S_), answerInput: typed(S_),
            vals: { terms: terms.map(fv), r: fv(rr), omr: fv(F(1).sub(rr)), S: fv(S_) }, params: { a1: fv(a1), r: fv(rr) },
          };
        }
      },
    },

    // ---- A2.20 Means --------------------------------------------------------------------------------------------------------
    "A2.means": {
      title: "Arithmetic, geometric and harmonic means",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const k = r.int(1, 6), m = r.int(1, 6), nn = r.int(1, 6);
            if (m === nn) continue;
            const a = k * m * m, b = k * nn * nn;
            if (a > 150 || b > 150) continue;
            const prod = a * b, gm = k * m * nn, am = (a + b) / 2;
            return {
              prompt: `Find the geometric mean of ${n(a)} and ${n(b)}.`,
              steps: [
                `Geometric mean of two numbers: ${M.sqrt(`${M.v("a")}${M.v("b")}`)}.`,
                `${M.sqrt(`${n(a)} × ${n(b)}`)} = ${M.sqrt(n(prod))} = ${n(gm)}.`,
                `For comparison the arithmetic mean is ${M.frac(`${n(a)} + ${n(b)}`, "2")} = ${n(am)}, larger, as AM ≥ GM promises.`,
              ],
              answer: num(gm), answerText: n(gm), answerInput: String(gm),
              vals: { prod, gm, am, sum: a + b }, params: { a, b },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const v1 = r.int(4, 24) * 5, v2 = r.int(4, 24) * 5;
            if (v1 === v2 || (2 * v1 * v2) % (v1 + v2) !== 0) continue;
            const D = P.lcm(v1, v2);
            if (D > 600) continue;
            const t1 = D / v1, t2 = D / v2, hm = (2 * v1 * v2) / (v1 + v2), am = (v1 + v2) / 2;
            return {
              prompt: `A driver covers ${n(D)} km at ${n(v1)} km/h and then drives the same ${n(D)} km back at ${n(v2)} km/h. What is the average speed for the round trip, in km/h?`,
              steps: [
                `Times: ${M.frac(n(D), n(v1))} = ${n(t1)} h out and ${M.frac(n(D), n(v2))} = ${n(t2)} h back, ${n(t1 + t2)} h in all.`,
                `Average speed = total distance ÷ total time = ${M.frac(n(2 * D), n(t1 + t2))} = ${n(hm)} km/h.`,
                `That is the harmonic mean ${M.frac(`2 · ${n(v1)} · ${n(v2)}`, `${n(v1)} + ${n(v2)}`)} = ${n(hm)}, not the arithmetic mean ${n(am)}: more time is spent at the slower speed.`,
              ],
              answer: num(hm), answerText: `${n(hm)} km/h`, answerInput: String(hm),
              vals: { D, t1, t2, tt: t1 + t2, D2: 2 * D, hm, am, sum: v1 + v2 }, params: { v1, v2, D },
            };
          }
        }
        if (r.chance(0.5)) {
          for (;;) {
            const p1 = r.int(-50, 100), p2 = r.int(-50, 100);
            if (p1 === p2 || p1 === 0 || p2 === 0) continue;
            const f1 = 100 + p1, f2 = 100 + p2, prod = f1 * f2, g = Math.round(Math.sqrt(prod));
            if (g * g !== prod || g === 100) continue;
            const avg = g - 100;
            const word = (v) => (v > 0 ? `rises ${n(v)}%` : `falls ${n(-v)}%`);
            return {
              prompt: `A stock ${word(p1)} one year and ${word(p2)} the next. What constant yearly percent change would give the same result over the two years? (Use a negative number for a decrease.)`,
              steps: [
                `Growth factors multiply: ${n(f1 / 100)} and ${n(f2 / 100)}, so over two years the factor is ${n(f1 / 100)} × ${n(f2 / 100)} = ${n(prod / 10000)}.`,
                `The constant yearly factor is their geometric mean: ${M.sqrt(n(prod / 10000))} = ${n(g / 100)}.`,
                `${n(g / 100)} means a change of ${n(avg)}% a year. (The arithmetic mean of the two changes, ${n((p1 + p2) / 2)}%, would be wrong.)`,
              ],
              answer: num(avg), answerText: `${n(avg)}% a year`, answerInput: String(avg),
              vals: { f1: f1 / 100, f2: f2 / 100, prod: prod / 10000, g: g / 100, avg, am: (p1 + p2) / 2 }, params: { p1, p2 }, consts: [100],
            };
          }
        }
        for (;;) {
          const [w1, w2, w3] = r.pick([[20, 30, 50], [25, 35, 40], [10, 40, 50], [30, 30, 40], [20, 40, 40], [15, 35, 50]]);
          const s1 = r.int(60, 98), s2 = r.int(55, 95), T = r.pick([70, 75, 80, 85, 90]);
          const need = 100 * T - w1 * s1 - w2 * s2;
          if (need % w3 !== 0) continue;
          const s3 = need / w3;
          if (s3 < 40 || s3 > 100) continue;
          return {
            prompt: `A course grade is ${n(w1)}% homework, ${n(w2)}% midterm and ${n(w3)}% final exam. A student has ${n(s1)} on homework and ${n(s2)} on the midterm. What final-exam score gives an overall grade of exactly ${n(T)}?`,
            steps: [
              `The grade is a weighted mean: ${M.frac(`${n(w1)} · ${n(s1)} + ${n(w2)} · ${n(s2)} + ${n(w3)}${M.v("f")}`, "100")} = ${n(T)}.`,
              `Multiply by 100: ${n(w1 * s1)} + ${n(w2 * s2)} + ${n(w3)}${M.v("f")} = ${n(100 * T)}.`,
              `${n(w3)}${M.v("f")} = ${n(100 * T)} − ${n(w1 * s1 + w2 * s2)} = ${n(need)}, so ${M.v("f")} = ${M.frac(n(need), n(w3))} = ${n(s3)}.`,
            ],
            answer: num(s3), answerText: n(s3), answerInput: String(s3),
            vals: { ws1: w1 * s1, ws2: w2 * s2, T100: 100 * T, wsum: w1 * s1 + w2 * s2, need, s3 }, params: { w1, w2, w3, s1, s2, T }, consts: [100],
          };
        }
      },
    },

    // ---- A2.21 Sigma notation -----------------------------------------------------------------------------------------
    "A2.11": {
      title: "Sigma notation and summation formulas",
      generate(r, level) {
        const i = M.v("i"), nv = M.v("n");
        const tri = (m) => (m * (m + 1)) / 2, sq = (m) => (m * (m + 1) * (2 * m + 1)) / 6;
        if (level === 1) {
          const m = r.int(3, 5), a = r.nonzero(-5, 5), b = r.int(-6, 6);
          const terms = Array.from({ length: m }, (_, k) => a * (k + 1) + b), S_ = terms.reduce((u, v) => u + v, 0);
          return {
            prompt: `Evaluate ${M.eq(`${sig("1", n(m))}(${M.poly([a, b], "i")})`)}`,
            steps: [
              `Put ${i} = 1, 2, …, ${n(m)} into ${M.poly([a, b], "i")}: ${terms.map((t, k) => `${i} = ${n(k + 1)} gives ${n(t)}`).join("; ")}.`,
              `Add them: ${terms.map((t, k) => (k === 0 ? n(t) : ` + ${np(t)}`)).join("")} = ${n(S_)}.`,
            ],
            answer: num(S_), answerText: n(S_), answerInput: String(S_), vals: { is: terms.map((_, j) => j + 1), terms, S: S_ }, params: { m, a, b },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const N = r.int(10, 30), a = r.nonzero(-5, 5), b = r.nonzero(-9, 9), T = tri(N), S_ = a * T + b * N;
            return {
              prompt: `Evaluate ${M.eq(`${sig("1", n(N))}(${M.poly([a, b], "i")})`)}`,
              steps: [
                `Split the sum and pull out the constant: ${cs(a)}${sig("1", n(N))}${i}${tmul(b, ` · ${n(N)}`)} (the constant ${n(b)} added ${n(N)} times).`,
                `${sig("1", n(N))}${i} = ${M.frac(`${n(N)} · ${n(N + 1)}`, "2")} = ${n(T)}.`,
                `${n(a)} · ${n(T)}${tmul(b, ` · ${n(N)}`)} = ${n(a * T)}${M.term(b * N, "")} = ${n(S_)}.`,
              ],
              answer: num(S_), answerText: n(S_), answerInput: String(S_), vals: { N1: N + 1, T, aT: a * T, bN: b * N, S: S_ }, params: { N, a, b, kind: 0 },
            };
          }
          const N = r.int(5, 12), a = r.nonzero(-4, 4), b = r.int(-9, 9), Q2 = sq(N), S_ = a * Q2 + b * N;
          return {
            prompt: `Evaluate ${M.eq(`${sig("1", n(N))}(${M.poly([a, 0, b], "i")})`)}`,
            steps: [
              `By linearity: ${cs(a)}${sig("1", n(N))}${M.sup(i, 2)}${b ? `${tmul(b, ` · ${n(N)}`)} (the constant ${n(b)} added ${n(N)} times)` : ""}.`,
              `Sum of squares: ${sig("1", n(N))}${M.sup(i, 2)} = ${M.frac(`${n(N)} · ${n(N + 1)} · ${n(2 * N + 1)}`, "6")} = ${n(Q2)}.`,
              `${n(a)} · ${n(Q2)}${tmul(b, ` · ${n(N)}`)} = ${n(a * Q2)}${M.term(b * N, "")} = ${n(S_)}.`,
            ],
            answer: num(S_), answerText: n(S_), answerInput: String(S_), vals: { N1: N + 1, N2: 2 * N + 1, Q2, aQ: a * Q2, bN: b * N, S: S_ }, params: { N, a, b, kind: 1 }, consts: [6],
          };
        }
        if (r.chance(0.5)) {
          const squares = r.chance(0.5), m = r.int(3, 8), N = r.int(m + 5, 20);
          const Sf = squares ? sq : tri, top = Sf(N), bot = Sf(m - 1), S_ = top - bot;
          const body = squares ? M.sup(i, 2) : i;
          const form = (k) => (squares ? M.frac(`${n(k)} · ${n(k + 1)} · ${n(2 * k + 1)}`, "6") : M.frac(`${n(k)} · ${n(k + 1)}`, "2"));
          return {
            prompt: `Evaluate ${M.eq(`${sig(n(m), n(N))}${body}`)}`,
            steps: [
              `The sum starts at ${n(m)}, not 1: take the sum from 1 to ${n(N)} and remove the terms from 1 to ${n(m - 1)}: ${sig("1", n(N))}${body} − ${sig("1", n(m - 1))}${body}.`,
              `${sig("1", n(N))}${body} = ${form(N)} = ${n(top)}.`,
              `${sig("1", n(m - 1))}${body} = ${form(m - 1)} = ${n(bot)}.`,
              `${n(top)} − ${n(bot)} = ${n(S_)}.`,
            ],
            answer: num(S_), answerText: n(S_), answerInput: String(S_),
            vals: { mm1: m - 1, m0: m, N1: N + 1, N2: 2 * N + 1, m2: 2 * m - 1, top, bot, S: S_ }, params: { m, N, squares: squares ? 1 : 0, kind: 0 }, consts: [6],
          };
        }
        const c = r.int(1, 6), N = r.int(5, 30), S_ = F(c * N, N + 1);
        return {
          prompt: `Evaluate ${M.eq(`${sig("1", n(N))}${M.frac(n(c), `${i}(${i} + 1)`)}`)}`,
          steps: [
            `Split the fraction: ${M.frac("1", `${i}(${i} + 1)`)} = ${M.frac("1", i)} − ${M.frac("1", `${i} + 1`)} (check: ${M.frac(`(${i} + 1) − ${i}`, `${i}(${i} + 1)`)}).`,
            `The sum telescopes: (1 − ${M.frac("1", "2")}) + (${M.frac("1", "2")} − ${M.frac("1", "3")}) + ⋯ + (${M.frac("1", n(N))} − ${M.frac("1", n(N + 1))}). Every middle term cancels, leaving 1 − ${M.frac("1", n(N + 1))} = ${M.frac(n(N), n(N + 1))}.`,
            ...(c === 1 ? [] : [`Multiply by ${n(c)}: ${n(c)} · ${M.frac(n(N), n(N + 1))} = ${ff(S_)}.`]),
          ],
          answer: num(S_.value), answerText: ff(S_), answerInput: typed(S_), vals: { N1: N + 1, S: fv(S_) }, params: { c, N, kind: 1 }, consts: [3],
        };
      },
    },

    // ---- A2.22 Induction ------------------------------------------------------------------------------------------------
    "A2.induction": {
      title: "Mathematical induction",
      generate(r, level) {
        const k = M.v("k"), nv = M.v("n");
        if (level === 1) {
          const c = r.int(0, 4), m = r.int(3, 6);
          const CL = [
            { lhs: `1 + 3 + 5 + ⋯ + (2${nv} − 1)`, rhs: M.sup(nv, 2), t: (i) => 2 * i - 1, R: (q) => q * q, rtxt: (q) => `${M.sup(n(q), 2)}` },
            { lhs: `1 + 2 + 3 + ⋯ + ${nv}`, rhs: M.frac(`${nv}(${nv} + 1)`, "2"), t: (i) => i, R: (q) => (q * (q + 1)) / 2, rtxt: (q) => M.frac(`${n(q)} · ${n(q + 1)}`, "2") },
            { lhs: `${M.sup("1", 2)} + ${M.sup("2", 2)} + ⋯ + ${M.sup(nv, 2)}`, rhs: M.frac(`${nv}(${nv} + 1)(2${nv} + 1)`, "6"), t: (i) => i * i, R: (q) => (q * (q + 1) * (2 * q + 1)) / 6, rtxt: (q) => M.frac(`${n(q)} · ${n(q + 1)} · ${n(2 * q + 1)}`, "6") },
            { lhs: `1 + 2 + 4 + ⋯ + ${M.sup("2", `${nv} − 1`)}`, rhs: `${M.sup("2", nv)} − 1`, t: (i) => Math.pow(2, i - 1), R: (q) => Math.pow(2, q) - 1, rtxt: (q) => `${M.sup("2", q)} − 1` },
            { lhs: `1 · 2 + 2 · 3 + ⋯ + ${nv}(${nv} + 1)`, rhs: M.frac(`${nv}(${nv} + 1)(${nv} + 2)`, "3"), t: (i) => i * (i + 1), R: (q) => (q * (q + 1) * (q + 2)) / 3, rtxt: (q) => M.frac(`${n(q)} · ${n(q + 1)} · ${n(q + 2)}`, "3") },
          ][c];
          const terms = Array.from({ length: m }, (_, i) => CL.t(i + 1)), L = terms.reduce((u, v) => u + v, 0), R = CL.R(m);
          return {
            prompt: `Check the claim ${M.eq(`${CL.lhs} = ${CL.rhs}`)} for ${nv} = ${n(m)}: what common value do both sides take?`,
            steps: [
              `Left side, term by term (${n(m)} terms): ${terms.map(n).join(" + ")} = ${n(L)}.`,
              `Right side with ${nv} = ${n(m)}: ${CL.rtxt(m)} = ${n(R)}.`,
              `Both sides equal ${n(L)}, so the claim holds at ${nv} = ${n(m)}. (Checking cases is not a proof: induction needs the base case plus the step from ${k} to ${k} + 1.)`,
            ],
            answer: num(L), answerText: n(L), answerInput: String(L),
            vals: { terms, L, R, m1: m + 1, m2: m + 2, mm: 2 * m + 1, pm: Math.pow(2, m), pm1: Math.pow(2, m - 1) }, params: { c, m }, consts: [3, 4, 5, 6],
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            let a, b;
            do { a = r.pick([2, 4, 6]); b = r.int(-5, 5); } while (a / 2 + b === 0);
            const h = a / 2, Fk = [h, h + b, 0], next = [a, a + b];   // a(k + 1) + b = a k + (a + b)
            const sum = [h, h + b + a, a + b];
            const i = M.v("i");
            return {
              prompt: `Claim: ${M.eq(`${sig("1", nv)}(${M.poly([a, b], "i")}) = ${M.poly([h, h + b, 0], "n")}`)} In the inductive step you assume it for ${nv} = ${k}. Add the next term to ${M.poly(Fk, "k")} and simplify the sum up to ${k} + 1 to standard form.`,
              steps: [
                `Assumption (the inductive hypothesis): ${sig("1", k)}(${M.poly([a, b], "i")}) = ${M.poly(Fk, "k")}.`,
                `The next term is ${i} = ${k} + 1: ${n(a)}(${k} + 1)${M.term(b, "")} = ${M.poly(next, "k")}.`,
                `Sum: ${M.poly(Fk, "k")} + ${M.poly(next, "k")} = ${M.poly(sum, "k")}.`,
                `Compare with the claim at ${k} + 1: ${n(h) === "1" ? "" : n(h)}${M.sup(`(${k} + 1)`, 2)}${tmul(h + b, `(${k} + 1)`)} = ${M.poly(sum, "k")}. They match, which completes the step.`,
              ],
              answer: { kind: "expr", expr: pstr(sum, "k"), vars: ["k"], form: "expanded" }, answerText: M.poly(sum, "k"), answerInput: ptyped(sum, "k"),
              vals: { h, hb: h + b, ab: a + b, sum }, params: { a, b, kind: 0 },
            };
          }
          const rr = r.pick([3, 4, 5]), rm = rr - 1;
          const rk = M.sup(n(rr), k), rk1 = M.sup(n(rr), `${k} + 1`);
          return {
            prompt: `Claim: ${M.eq(`1 + ${n(rr)} + ${M.sup(n(rr), 2)} + ⋯ + ${M.sup(n(rr), `${nv} − 1`)} = ${M.frac(`${M.sup(n(rr), nv)} − 1`, n(rm))}`)} In the inductive step, add the next term ${rk} to ${M.frac(`${rk} − 1`, n(rm))} and write the result as one fraction.`,
            steps: [
              `Inductive hypothesis: the first ${k} terms add to ${M.frac(`${rk} − 1`, n(rm))}. The next term is ${M.sup(n(rr), `(${k} + 1) − 1`)} = ${rk}.`,
              `Common denominator ${n(rm)}: ${M.frac(`${rk} − 1`, n(rm))} + ${M.frac(`${n(rm)} · ${rk}`, n(rm))} = ${M.frac(`${n(rm + 1)} · ${rk} − 1`, n(rm))}.`,
              `${n(rr)} · ${rk} = ${rk1}, so the sum is ${M.frac(`${rk1} − 1`, n(rm))}: the claim for ${k} + 1.`,
            ],
            answer: { kind: "expr", expr: `(${rr}^(k+1) - 1)/${rm}`, vars: ["k"] }, answerText: M.frac(`${rk1} − 1`, n(rm)), answerInput: `(${rr}^(k + 1) - 1)/${rm}`,
            vals: { rm }, params: { r: rr, kind: 1 },
          };
        }
        const CL = [
          { kind: 0, a: 2, p: 2 }, { kind: 0, a: 2, p: 3 }, { kind: 0, a: 3, p: 3 }, { kind: 0, a: 3, p: 4 },
          { kind: 1, a: 2 }, { kind: 1, a: 3 }, { kind: 1, a: 4 }, { kind: 2 },
        ][r.int(0, 7)];
        const fact = (m) => { let v = 1; for (let j = 2; j <= m; j++) v *= j; return v; };
        const L = (m) => (CL.kind === 0 ? Math.pow(CL.a, m) : CL.kind === 1 ? fact(m) : Math.pow(2, m));
        const R = (m) => (CL.kind === 0 ? Math.pow(m, CL.p) : CL.kind === 1 ? Math.pow(CL.a, m) : 2 * m + 1);
        let n0 = 1;
        for (let m = 1; m <= 40; m++) if (L(m) <= R(m)) n0 = m + 1;
        const ns = Array.from({ length: n0 }, (_, j) => j + 1);
        const lt_ = CL.kind === 0 ? M.sup(n(CL.a), nv) : CL.kind === 1 ? `${nv}!` : M.sup("2", nv);
        const rt_ = CL.kind === 0 ? M.sup(nv, CL.p) : CL.kind === 1 ? M.sup(n(CL.a), nv) : `2${nv} + 1`;
        const why = CL.kind === 1 ? `the left side is multiplied by ${nv} + 1 &gt; ${n(CL.a)}, the right side only by ${n(CL.a)}`
          : CL.kind === 2 ? "the left side doubles while the right side grows by only 2"
          : `the left side is multiplied by ${n(CL.a)} while the right side grows by the factor ${M.sup(`(${M.frac(`${nv} + 1`, nv)})`, CL.p)}, which is less than ${n(CL.a)} from ${nv} = ${n(n0)} on`;
        return {
          prompt: `For which smallest whole number ${M.sub(nv, "0")} is ${M.eq(`${lt_} &gt; ${rt_}`)} true for every ${nv} ≥ ${M.sub(nv, "0")}? (That ${M.sub(nv, "0")} is the base case of an induction proof.)`,
          steps: [
            `Tabulate both sides: ${M.table([nv, lt_, rt_, "holds?"], ns.map((m) => [n(m), n(L(m)), n(R(m)), L(m) > R(m) ? "yes" : "no"]))}`,
            `It fails at ${nv} = ${n(n0 - 1)} and holds at ${nv} = ${n(n0)}.`,
            `It keeps holding after that: going from ${nv} to ${nv} + 1, ${why}. That is the inductive step, so ${M.sub(nv, "0")} = ${n(n0)}.`,
          ],
          answer: num(n0), answerText: `${M.sub(nv, "0")} = ${n(n0)}`, answerInput: String(n0),
          vals: { ns, lefts: ns.map(L), rights: ns.map(R), n0, nm: n0 - 1 }, params: { ...CL },
        };
      },
    },

    // ---- A2.23 Binomial theorem -----------------------------------------------------------------------------------------
    "A2.12": {
      title: "The binomial theorem",
      generate(r, level) {
        const C = (a, b) => { let v = 1; for (let j = 1; j <= b; j++) v = (v * (a - b + j)) / j; return Math.round(v); };
        const Cn = (a, b) => `C(${n(a)}, ${typeof b === "string" ? b : n(b)})`;
        const prodTxt = (a, b) => Array.from({ length: b }, (_, j) => n(a - j)).join(" · ");
        const factTxt = (b) => Array.from({ length: b }, (_, j) => n(b - j)).join(" · ");
        if (level === 1) {
          const N = r.int(5, 10), kk = r.int(2, N - 2), small = Math.min(kk, N - kk), val = C(N, kk);
          let num_ = 1, den = 1;
          for (let j = 0; j < small; j++) { num_ *= N - j; den *= j + 1; }
          const asCoef = r.chance(0.5);
          return {
            prompt: asCoef ? `Find the coefficient of ${M.sup(x, kk)} in ${M.eq(M.sup(`(${x} + 1)`, N))}` : `Evaluate the binomial coefficient ${M.eq(Cn(N, kk))}`,
            steps: [
              asCoef ? `Each term of ${M.sup(`(${x} + 1)`, N)} is ${Cn(N, M.v("k"))}${M.sup(x, `${n(N)} − ${M.v("k")}`)} · ${M.sup("1", M.v("k"))}. For ${M.sup(x, kk)} take ${M.v("k")} = ${n(N - kk)}: the coefficient is ${Cn(N, N - kk)} = ${Cn(N, kk)}.`
                : `${Cn(N, kk)} = ${M.frac(`${n(N)}!`, `${n(kk)}! · ${n(N - kk)}!`)}, the number of ways to choose ${n(kk)} things from ${n(N)}.`,
              `Cancel the larger factorial${small !== kk ? ` (use ${Cn(N, kk)} = ${Cn(N, small)})` : ""}: ${M.frac(prodTxt(N, small), factTxt(small))} = ${M.frac(n(num_), n(den))} = ${n(val)}.`,
            ],
            answer: num(val), answerText: n(val), answerInput: String(val),
            vals: { nk: N - kk, small, tops: Array.from({ length: small }, (_, j) => N - j), facs: Array.from({ length: small }, (_, j) => small - j), num: num_, den, val }, params: { N, k: kk },
          };
        }
        if (level === 2) {
          for (;;) {
            const N = r.int(4, 7), a = r.pick([1, 2, 3]), c = r.nonzero(-4, 4), j = r.int(1, N - 1), kk = N - j;
            const Cv = C(N, kk), aj = Math.pow(a, j), ck = Math.pow(c, kk), coef = Cv * aj * ck;
            if (Math.abs(coef) > 50000 || (a === 1 && Math.abs(c) === 1)) continue;
            return {
              prompt: `Find the coefficient of ${pw(x, j)} in ${M.eq(M.sup(`(${M.poly([a, c])})`, N))}`,
              steps: [
                `General term: ${Cn(N, M.v("k"))} · ${M.sup(a === 1 ? x : `(${kv(a)})`, `${n(N)} − ${M.v("k")}`)} · ${M.sup(np(c), M.v("k"))}. The power of ${x} is ${n(N)} − ${M.v("k")}, so ${M.v("k")} = ${n(N)} − ${n(j)} = ${n(kk)}.`,
                `${Cn(N, kk)} = ${n(Cv)}${a === 1 ? "" : `, ${M.sup(n(a), j)} = ${n(aj)}`} and ${M.sup(np(c), kk)} = ${n(ck)}.`,
                `Coefficient: ${n(Cv)}${a === 1 ? "" : ` · ${n(aj)}`} · ${np(ck)} = ${n(coef)}.`,
              ],
              answer: num(coef), answerText: n(coef), answerInput: String(coef),
              vals: { kk, Cv, aj, ck, coef }, params: { N, a, c, j },
            };
          }
        }
        for (;;) {
          const [p, q] = r.pick([[1, 1], [2, 1], [1, 2]]), N = r.int(3, 9), c = r.nonzero(-3, 3);
          if ((p * N) % (p + q) !== 0) continue;
          const kk = (p * N) / (p + q), Cv = C(N, kk), ck = Math.pow(c, kk), coef = Cv * ck;
          const A = p === 1 ? x : M.sup(x, p), B = M.frac(n(c), q === 1 ? x : M.sup(x, q)), Bm = M.frac(n(Math.abs(c)), q === 1 ? x : M.sup(x, q));
          const Ap = p === 1 ? x : `(${A})`, pk = p === 1 ? `${n(N)} − ${M.v("k")}` : `${n(p)}(${n(N)} − ${M.v("k")})`;
          return {
            prompt: `Find the term independent of ${x} (the constant term) in ${M.eq(M.sup(`(${A} ${c < 0 ? "−" : "+"} ${Bm})`, N))}`,
            steps: [
              `Treat the second term as ${B}. General term: ${Cn(N, M.v("k"))} · ${M.sup(Ap, `${n(N)} − ${M.v("k")}`)} · ${M.sup(`(${B})`, M.v("k"))} = ${Cn(N, M.v("k"))} · ${M.sup(np(c), M.v("k"))} · ${M.sup(x, `${pk} − ${q === 1 ? "" : n(q)}${M.v("k")}`)}.`,
              `No ${x} means the exponent is 0: ${pk} = ${q === 1 ? "" : n(q)}${M.v("k")}, so ${n(p * N)} = ${n(p + q)}${M.v("k")} and ${M.v("k")} = ${n(kk)}.`,
              `${Cn(N, kk)} · ${M.sup(np(c), kk)} = ${n(Cv)} · ${np(ck)} = ${n(coef)}.`,
            ],
            answer: num(coef), answerText: n(coef), answerInput: String(coef),
            vals: { pN: p * N, pq: p + q, kk, Cv, ck, coef }, params: { p, q, N, c },
          };
        }
      },
    },

    // ---- A2.24 Matrix operations ----------------------------------------------------------------------------------------
    "A2.13": {
      title: "Matrix operations",
      generate(r, level) {
        const rnd = (lo, hi) => [[r.int(lo, hi), r.int(lo, hi)], [r.int(lo, hi), r.int(lo, hi)]];
        const flat = (m) => m.flat();
        const pos = ["top left", "top right", "bottom left", "bottom right"];
        if (level === 1) {
          const A = rnd(-6, 6), B = rnd(-6, 6), s = r.pick([1, 2, 3]), t = r.pick([1, -1, -2, -3]);
          const Rm = A.map((row, i) => row.map((v, j) => s * v + t * B[i][j]));
          const name = `${s === 1 ? "" : n(s)}${M.v("A")} ${t < 0 ? "−" : "+"} ${Math.abs(t) === 1 ? "" : n(Math.abs(t))}${M.v("B")}`;
          return {
            prompt: `${M.eq(`${M.v("A")} = ${mat(A)}, ${M.v("B")} = ${mat(B)}`)} Find ${name}. Enter its entries row by row, separated by commas.`,
            steps: [
              `Scaling and adding work entry by entry: each entry is ${s === 1 ? "" : `${n(s)} · `}(entry of ${M.v("A")}) ${t < 0 ? "−" : "+"} ${Math.abs(t) === 1 ? "" : `${n(Math.abs(t))} · `}(entry of ${M.v("B")}).`,
              flat(A).map((v, q) => `${pos[q]}: ${s === 1 ? n(v) : times(s, v)} ${t < 0 ? "−" : "+"} ${times(Math.abs(t), flat(B)[q])} = ${n(flat(Rm)[q])}`).join("; ") + ".",
              `${name} = ${mat(Rm)}.`,
            ],
            answer: { kind: "numbers", values: flat(Rm), ordered: true }, answerText: mat(Rm), answerInput: flat(Rm).join(", "),
            vals: { R: flat(Rm) }, params: { A, B, s, t },
          };
        }
        if (level === 2) {
          const A = rnd(-5, 5), B = rnd(-5, 5);
          const Rm = [[0, 0], [0, 0]].map((row, i) => row.map((_, j) => A[i][0] * B[0][j] + A[i][1] * B[1][j]));
          return {
            prompt: `${M.eq(`${M.v("A")} = ${mat(A)}, ${M.v("B")} = ${mat(B)}`)} Find ${M.v("A")}${M.v("B")}. Enter its entries row by row, separated by commas.`,
            steps: [
              `Entry (${M.v("i")}, ${M.v("j")}) of ${M.v("A")}${M.v("B")} is row ${M.v("i")} of ${M.v("A")} times column ${M.v("j")} of ${M.v("B")}: multiply pairs and add.`,
              ...[0, 1].flatMap((i) => [0, 1].map((j) => `${cap(pos[2 * i + j])}: (row ${n(i + 1)}) · (column ${n(j + 1)}) = ${n(A[i][0])} · ${np(B[0][j])} + ${np(A[i][1])} · ${np(B[1][j])} = ${n(A[i][0] * B[0][j])} + ${np(A[i][1] * B[1][j])} = ${n(Rm[i][j])}.`)),
              `${M.v("A")}${M.v("B")} = ${mat(Rm)}.`,
            ],
            answer: { kind: "numbers", values: flat(Rm), ordered: true }, answerText: mat(Rm), answerInput: flat(Rm).join(", "),
            vals: { R: flat(Rm), P: [0, 1].flatMap((i) => [0, 1].flatMap((j) => [A[i][0] * B[0][j], A[i][1] * B[1][j]])) }, params: { A, B },
          };
        }
        if (r.chance(0.5)) {
          const items = r.pick([["coffees", "muffins", "sandwiches"], ["notebooks", "pens", "backpacks"], ["tickets", "drinks", "posters"]]);
          const price = [r.pick([2, 2.5, 3, 3.5, 4]), r.pick([1.5, 2, 2.5, 3]), r.pick([5, 6, 7.5, 8, 9])];
          const Qm = [[r.int(10, 60), r.int(10, 60), r.int(5, 30)], [r.int(10, 60), r.int(10, 60), r.int(5, 30)]];
          const parts = Qm.map((row) => row.map((v, j) => v * price[j]));
          const rev = parts.map((row) => row.reduce((u, v) => u + v, 0));
          const pcol = price.map((v) => [P.money(v).replace("$", "")]);
          return {
            prompt: `Two shops sell ${items.join(", ")} at the same prices. The quantity matrix ${M.v("Q")} (rows: shop 1, shop 2; columns: ${items.join(", ")}) and the price vector ${M.v("p")} (dollars) are ${M.eq(`${M.v("Q")} = ${mat(Qm)}, ${M.v("p")} = ${mat(pcol)}`)} Find each shop's revenue ${M.v("Q")}${M.v("p")}, in dollars. Enter shop 1, then shop 2.`,
            steps: [
              `Sizes: (2 × 3)(3 × 1) = 2 × 1, one revenue per shop.`,
              `Shop 1: ${Qm[0].map((v, j) => `${n(v)} · ${n(price[j])}`).join(" + ")} = ${parts[0].map(n).join(" + ")} = ${n(rev[0])}.`,
              `Shop 2: ${Qm[1].map((v, j) => `${n(v)} · ${n(price[j])}`).join(" + ")} = ${parts[1].map(n).join(" + ")} = ${n(rev[1])}.`,
              `Revenue: ${P.money(rev[0])} and ${P.money(rev[1])}.`,
            ],
            answer: { kind: "numbers", values: rev, ordered: true }, answerText: `${P.money(rev[0])} and ${P.money(rev[1])}`, answerInput: rev.join(", "),
            vals: { parts, rev }, params: { Q: Qm, price }, consts: [3],
          };
        }
        const A = [[r.int(-4, 4), r.int(-4, 4), r.int(-4, 4)], [r.int(-4, 4), r.int(-4, 4), r.int(-4, 4)]];
        const B = [[r.int(-4, 4), r.int(-4, 4)], [r.int(-4, 4), r.int(-4, 4)], [r.int(-4, 4), r.int(-4, 4)]];
        const Rm = [0, 1].map((i) => [0, 1].map((j) => A[i][0] * B[0][j] + A[i][1] * B[1][j] + A[i][2] * B[2][j]));
        return {
          prompt: `${M.eq(`${M.v("A")} = ${mat(A)}, ${M.v("B")} = ${mat(B)}`)} Find ${M.v("A")}${M.v("B")}. Enter its entries row by row, separated by commas.`,
          steps: [
            `Sizes: (2 × 3)(3 × 2). The inner sizes match (3 = 3), so the product exists and is 2 × 2.`,
            ...[0, 1].flatMap((i) => [0, 1].map((j) => `${cap(pos[2 * i + j])}: ${[0, 1, 2].map((m) => `${np(A[i][m])} · ${np(B[m][j])}`).join(" + ")} = ${n(Rm[i][j])}.`)),
            `${M.v("A")}${M.v("B")} = ${mat(Rm)}. (${M.v("B")}${M.v("A")} would be 3 × 3: order matters.)`,
          ],
          answer: { kind: "numbers", values: Rm.flat(), ordered: true }, answerText: mat(Rm), answerInput: Rm.flat().join(", "),
          vals: { R: Rm.flat() }, params: { A, B }, consts: [3],
        };
      },
    },

    // ---- A2.25 Determinants, inverses and Cramer's rule ---------------------------------------------------------------------
    "A2.14": {
      title: "Determinants, inverses and Cramer's rule",
      generate(r, level) {
        const det2 = (m) => m[0][0] * m[1][1] - m[0][1] * m[1][0];
        const dtxt = (m) => `${n(m[0][0])} · ${np(m[1][1])} − ${np(m[0][1])} · ${np(m[1][0])}`;
        if (level === 1) {
          const A = [[r.int(-9, 9), r.int(-9, 9)], [r.int(-9, 9), r.int(-9, 9)]], D = det2(A);
          return {
            prompt: `Find the determinant ${M.eq(mat(A, true))}`,
            steps: [
              `For a 2 × 2 matrix, det = ${M.v("a")}${M.v("d")} − ${M.v("b")}${M.v("c")}: the main diagonal product minus the other diagonal product.`,
              `${dtxt(A)} = ${n(A[0][0] * A[1][1])} − ${np(A[0][1] * A[1][0])} = ${n(D)}.`,
            ],
            answer: num(D), answerText: n(D), answerInput: String(D), vals: { ad: A[0][0] * A[1][1], bc: A[0][1] * A[1][0], D }, params: { A },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            for (;;) {
              const a1 = r.nonzero(-6, 6), b1 = r.nonzero(-6, 6), a2 = r.nonzero(-6, 6), b2 = r.nonzero(-6, 6), sx = r.int(-6, 6), sy = r.int(-6, 6);
              const D = a1 * b2 - a2 * b1;
              if (D === 0) continue;
              const c1 = a1 * sx + b1 * sy, c2 = a2 * sx + b2 * sy, Dx = c1 * b2 - b1 * c2, Dy = a1 * c2 - c1 * a2;
              const eq = (a, b, c) => `${kv(a)}${M.term(b, y)} = ${n(c)}`;
              return {
                prompt: `Solve with Cramer's rule: ${M.eq(eq(a1, b1, c1))} ${M.eq(eq(a2, b2, c2))} Enter the solution as a point (${x}, ${y}).`,
                steps: [
                  `${M.v("D")} = ${mat([[a1, b1], [a2, b2]], true)} = ${n(a1)} · ${np(b2)} − ${np(b1)} · ${np(a2)} = ${n(D)}. It is not 0, so there is exactly one solution.`,
                  `Replace the ${x}-column by the constants: ${M.sub(M.v("D"), x)} = ${mat([[c1, b1], [c2, b2]], true)} = ${n(c1)} · ${np(b2)} − ${np(b1)} · ${np(c2)} = ${n(Dx)}.`,
                  `Replace the ${y}-column: ${M.sub(M.v("D"), y)} = ${mat([[a1, c1], [a2, c2]], true)} = ${n(a1)} · ${np(c2)} − ${np(c1)} · ${np(a2)} = ${n(Dy)}.`,
                  `${x} = ${M.frac(n(Dx), n(D))} = ${n(sx)}, ${y} = ${M.frac(n(Dy), n(D))} = ${n(sy)}.`,
                ],
                answer: { kind: "point", value: [sx, sy] }, answerText: `(${n(sx)}, ${n(sy)})`, answerInput: `(${sx}, ${sy})`,
                vals: { c1, c2, D, Dx, Dy, sx, sy }, params: { a1, b1, a2, b2, c1, c2, kind: 0 },
              };
            }
          }
          for (;;) {
            const A = [[r.int(-5, 5), r.int(-5, 5)], [r.int(-5, 5), r.int(-5, 5)]], D = det2(A);
            if (![1, -1, 2, -2].includes(D)) continue;
            const inv = [[F(A[1][1], D), F(-A[0][1], D)], [F(-A[1][0], D), F(A[0][0], D)]];
            const flatI = inv.flat();
            return {
              prompt: `Find the inverse of ${M.eq(`${M.v("A")} = ${mat(A)}`)} Enter its entries row by row, separated by commas.`,
              steps: [
                `det ${M.v("A")} = ${dtxt(A)} = ${n(D)}, not 0, so the inverse exists.`,
                `Swap the diagonal entries, negate the other two, and divide by the determinant: ${M.sup(M.v("A"), "−1")} = ${M.frac("1", n(D))}${mat([[A[1][1], -A[0][1]], [-A[1][0], A[0][0]]])}.`,
                `${M.sup(M.v("A"), "−1")} = ${mat(inv)}. Check: ${M.v("A")}${M.sup(M.v("A"), "−1")} = ${M.v("I")}.`,
              ],
              answer: { kind: "numbers", values: flatI.map((q) => q.value), ordered: true }, answerText: mat(inv), answerInput: flatI.map(typed).join(", "),
              vals: { D, adj: [A[1][1], -A[0][1], -A[1][0], A[0][0]], inv: flatI.map(fv) }, params: { A, kind: 1 },
            };
          }
        }
        if (r.chance(0.5)) {
          const A = [0, 1, 2].map(() => [r.int(-4, 4), r.int(-4, 4), r.int(-4, 4)]);
          const [a, b, c] = A[0], [d, e, f] = A[1], [g, h, i] = A[2];
          const m1 = e * i - f * h, m2 = d * i - f * g, m3 = d * h - e * g, D = a * m1 - b * m2 + c * m3;
          return {
            prompt: `Find the determinant ${M.eq(mat(A, true))}`,
            steps: [
              `Expand along the top row with signs +, −, +: det = ${M.v("a")}(${M.v("e")}${M.v("i")} − ${M.v("f")}${M.v("h")}) − ${M.v("b")}(${M.v("d")}${M.v("i")} − ${M.v("f")}${M.v("g")}) + ${M.v("c")}(${M.v("d")}${M.v("h")} − ${M.v("e")}${M.v("g")}).`,
              `Minors: ${n(e)} · ${np(i)} − ${np(f)} · ${np(h)} = ${n(m1)}; ${n(d)} · ${np(i)} − ${np(f)} · ${np(g)} = ${n(m2)}; ${n(d)} · ${np(h)} − ${np(e)} · ${np(g)} = ${n(m3)}.`,
              `det = ${n(a)} · ${np(m1)} − ${np(b)} · ${np(m2)} + ${np(c)} · ${np(m3)} = ${n(a * m1)} − ${np(b * m2)} + ${np(c * m3)} = ${n(D)}.`,
            ],
            answer: num(D), answerText: n(D), answerInput: String(D), vals: { m1, m2, m3, am1: a * m1, bm2: b * m2, cm3: c * m3, D }, params: { A, kind: 0 },
          };
        }
        for (;;) {
          const u = [r.int(-3, 3), r.int(-3, 3)], v = [r.int(-3, 3), r.int(-3, 3)], D = u[0] * v[1] - v[0] * u[1];
          if (D === 0) continue;
          const xs = [0, u[0], v[0], u[0] + v[0]], ys = [0, u[1], v[1], u[1] + v[1]];
          const view = [Math.min(...xs) - 1, Math.max(...xs) + 1, Math.min(...ys) - 1, Math.max(...ys) + 1];
          if (view[1] - view[0] > 8 || view[3] - view[2] > 8) continue;
          const A = [[u[0], v[0]], [u[1], v[1]]], area = Math.abs(D);
          return {
            prompt: `The matrix ${M.v("A")} sends the unit square to the shaded parallelogram: (1, 0) goes to the tip of ${M.v("u")} and (0, 1) to the tip of ${M.v("v")}. Both tips sit on grid corners. What is the parallelogram's area, in square units?`,
            graph: graph({ view, equal: true, items: [
              { t: "poly", p: [[0, 0], u, [u[0] + v[0], u[1] + v[1]], v], role: "muted" },
              { t: "vec", a: [0, 0], b: u, label: "u" }, { t: "vec", a: [0, 0], b: v, label: "v", role: "secondary" },
            ] }),
            steps: [
              `Read the vectors: ${M.v("u")} = (${n(u[0])}, ${n(u[1])}) and ${M.v("v")} = (${n(v[0])}, ${n(v[1])}). They are the columns of ${M.v("A")} = ${mat(A)}.`,
              `det ${M.v("A")} = ${n(u[0])} · ${np(v[1])} − ${np(v[0])} · ${np(u[1])} = ${n(D)}.`,
              `The determinant scales area (its sign only records a flip). The unit square has area 1, so the parallelogram has area |${n(D)}| = ${n(area)} square units.`,
            ],
            answer: num(area), answerText: `${n(area)} square units`, answerInput: String(area), vals: { D, area }, params: { u, v, kind: 1 },
          };
        }
      },
    },

    // ---- A2.26 Conic sections --------------------------------------------------------------------------------------------
    "A2.15": {
      title: "Conic sections",
      generate(r, level) {
        const sqx = (h, v = "x") => (h === 0 ? M.sup(M.v(v), 2) : M.sup(`(${M.poly([1, -h], v)})`, 2));
        const circ = (h, k, rr2) => `${sqx(h)} + ${sqx(k, "y")} = ${n(rr2)}`;
        if (level === 1) {
          const h = r.int(-3, 3), k = r.int(-3, 3);
          if (r.chance(0.5)) {
            const rr = r.int(1, 3);
            return {
              prompt: `The circle is drawn on a grid. Find its center (${M.v("h")}, ${M.v("k")}) and radius ${M.v("r")}. Enter ${M.v("h")}, ${M.v("k")}, ${M.v("r")}.`,
              graph: graph({ view: [h - rr - 1, h + rr + 1, k - rr - 1, k + rr + 1], equal: true, items: [{ t: "circle", c: [h, k], r: rr }, { t: "pt", x: h, y: k }] }),
              steps: [
                `The center (marked) is at (${n(h)}, ${n(k)}).`,
                `The top of the circle is at (${n(h)}, ${n(k + rr)}), ${n(rr)} above the center, so ${M.v("r")} = ${n(rr)}.`,
                `Its equation is ${circ(h, k, rr * rr)}.`,
              ],
              answer: { kind: "numbers", values: [h, k, rr], ordered: true }, answerText: `center (${n(h)}, ${n(k)}), radius ${n(rr)}`, answerInput: `${h}, ${k}, ${rr}`,
              vals: { h, k, rr, top: k + rr, r2: rr * rr }, params: { h, k, rr, kind: 0 },
            };
          }
          const rr = r.int(1, 9);
          return {
            prompt: `Find the center (${M.v("h")}, ${M.v("k")}) and radius ${M.v("r")} of ${M.eq(circ(h, k, rr * rr))} Enter ${M.v("h")}, ${M.v("k")}, ${M.v("r")}.`,
            steps: [
              `Standard form is ${M.sup(`(${x} − ${M.v("h")})`, 2)} + ${M.sup(`(${y} − ${M.v("k")})`, 2)} = ${M.sup(M.v("r"), 2)}.`,
              `${h === 0 ? `${M.sup(x, 2)} means ${M.v("h")} = 0` : (h > 0 ? `${M.poly([1, -h])} gives ${M.v("h")} = ${n(h)}` : `${M.poly([1, -h])} = ${x} − ${np(h)}, so ${M.v("h")} = ${n(h)}`)}; ${k === 0 ? `${M.sup(y, 2)} means ${M.v("k")} = 0` : (k > 0 ? `${M.poly([1, -k], "y")} gives ${M.v("k")} = ${n(k)}` : `${M.poly([1, -k], "y")} = ${y} − ${np(k)}, so ${M.v("k")} = ${n(k)}`)}.`,
              `${M.sup(M.v("r"), 2)} = ${n(rr * rr)}, so ${M.v("r")} = ${M.sqrt(n(rr * rr))} = ${n(rr)}.`,
            ],
            answer: { kind: "numbers", values: [h, k, rr], ordered: true }, answerText: `center (${n(h)}, ${n(k)}), radius ${n(rr)}`, answerInput: `${h}, ${k}, ${rr}`,
            vals: { h, k, rr, r2: rr * rr }, params: { h, k, r2: rr * rr, kind: 1 },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const h = r.nonzero(-6, 6), k = r.nonzero(-6, 6), rr = r.int(1, 8);
            const D = -2 * h, E = -2 * k, Fc = h * h + k * k - rr * rr;
            const gen = `${M.sup(x, 2)} + ${M.sup(y, 2)}${M.term(D, x)}${M.term(E, y)}${M.term(Fc, "")} = 0`;
            return {
              prompt: `Find the center (${M.v("h")}, ${M.v("k")}) and radius ${M.v("r")} of the circle ${M.eq(gen)} Enter ${M.v("h")}, ${M.v("k")}, ${M.v("r")}.`,
              steps: [
                `Group ${x} and ${y} terms and move the constant: (${M.poly([1, D, 0])}) + (${M.poly([1, E, 0], "y")}) = ${n(-Fc)}.`,
                `Complete each square: half of ${n(D)} is ${n(-h)}, squared ${n(h * h)}; half of ${n(E)} is ${n(-k)}, squared ${n(k * k)}. Add both to each side.`,
                `${circ(h, k, rr * rr)}, since ${n(-Fc)} + ${n(h * h)} + ${n(k * k)} = ${n(rr * rr)}.`,
                `Center (${n(h)}, ${n(k)}), radius ${M.sqrt(n(rr * rr))} = ${n(rr)}.`,
              ],
              answer: { kind: "numbers", values: [h, k, rr], ordered: true }, answerText: `center (${n(h)}, ${n(k)}), radius ${n(rr)}`, answerInput: `${h}, ${k}, ${rr}`,
              vals: { nF: -Fc, nh: -h, nk: -k, hh: h * h, kk: k * k, r2: rr * rr, h, k, rr }, params: { D, E, F: Fc, kind: 0 },
            };
          }
          // classify Ax² + Cy² + Dx + Ey + F = 0
          const type = r.int(0, 3), h = r.int(-4, 4), k = r.int(-4, 4);
          let A, Cc, D, E, Fc;
          if (type === 0) { const m = r.int(1, 3), rr = r.int(1, 5); A = m; Cc = m; D = -2 * m * h; E = -2 * m * k; Fc = m * (h * h + k * k - rr * rr); }
          else if (type === 1 || type === 2) {
            let a, b; do { a = r.int(1, 4); b = r.int(1, 4); } while (a === b);
            const s = type === 1 ? 1 : -1;
            A = b * b; Cc = s * a * a; D = -2 * A * h; E = -2 * Cc * k; Fc = A * h * h + Cc * k * k - a * a * b * b;
            if (r.chance(0.5)) { A = -A; Cc = -Cc; D = -D; E = -E; Fc = -Fc; }
          } else { const p = r.nonzero(-3, 3); A = 1; Cc = 0; D = -2 * h; E = -4 * p; Fc = h * h + 4 * p * k; }
          const gen = [M.term(A, M.sup(x, 2), { first: true }), M.term(Cc, M.sup(y, 2), { first: false }), M.term(D, x), M.term(E, y), M.term(Fc, "")].join("") + " = 0";
          const OPTS = ["Circle", "Ellipse", "Hyperbola", "Parabola"];
          const reason = type === 3 ? `${M.v("C")} = 0: only one variable is squared, so it is a parabola.`
            : type === 0 ? `${M.v("A")} = ${M.v("C")} = ${n(A)}: equal squared coefficients make a circle.`
            : type === 1 ? `${M.v("A")}${M.v("C")} = ${n(A)} · ${np(Cc)} = ${n(A * Cc)} &gt; 0 with ${M.v("A")} ≠ ${M.v("C")}: an ellipse.`
            : `${M.v("A")}${M.v("C")} = ${n(A)} · ${np(Cc)} = ${n(A * Cc)} &lt; 0: the squares have opposite signs, a hyperbola.`;
          return {
            prompt: `Which conic is ${M.eq(gen)}`,
            steps: [
              `Compare the coefficients of the squares: ${M.v("A")} = ${n(A)} (on ${M.sup(x, 2)}) and ${M.v("C")} = ${n(Cc)} (on ${M.sup(y, 2)}).`,
              reason,
            ],
            answer: { kind: "choice", options: OPTS, index: type }, answerText: OPTS[type],
            vals: { AC: A * Cc }, params: { A, C: Cc, D, E, F: Fc, kind: 1 },
          };
        }
        const kind = r.int(0, 2), h = r.int(-4, 4), k = r.int(-4, 4);
        if (kind === 2) {
          const p = r.nonzero(-4, 4), vert = r.chance(0.5), fp = 4 * p;
          const eqn = vert ? `${sqx(h)} = ${n(fp)}(${M.poly([1, -k], "y")})` : `${sqx(k, "y")} = ${n(fp)}(${M.poly([1, -h])})`;
          const focus = vert ? [h, k + p] : [h + p, k];
          return {
            prompt: `Find the focus of the parabola ${M.eq(eqn)} Enter it as a point.`,
            steps: [
              `Compare with ${vert ? `(${x} − ${M.v("h")})² = 4${M.v("p")}(${y} − ${M.v("k")})` : `(${y} − ${M.v("k")})² = 4${M.v("p")}(${x} − ${M.v("h")})`}: the vertex is (${n(h)}, ${n(k)}) and 4${M.v("p")} = ${n(fp)}, so ${M.v("p")} = ${n(p)}.`,
              `The parabola opens ${vert ? (p > 0 ? "up" : "down") : p > 0 ? "right" : "left"}; the focus is ${n(Math.abs(p))} from the vertex in that direction, and the directrix ${n(Math.abs(p))} the other way (${vert ? `${y} = ${n(k - p)}` : `${x} = ${n(h - p)}`}).`,
              `Focus: (${n(focus[0])}, ${n(focus[1])}).`,
            ],
            answer: { kind: "point", value: focus }, answerText: `(${n(focus[0])}, ${n(focus[1])})`, answerInput: `(${focus[0]}, ${focus[1]})`,
            vals: { p, fx: focus[0], fy: focus[1], dl: vert ? k - p : h - p }, params: { h, k, fp, vert: vert ? 1 : 0, kind }, consts: [4],
          };
        }
        const ell = kind === 0;
        const [a, b, c] = ell ? r.pick([[5, 4, 3], [5, 3, 4], [10, 8, 6], [10, 6, 8], [13, 12, 5], [13, 5, 12]]) : r.pick([[3, 4, 5], [4, 3, 5], [6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13]]);
        const vert = ell && r.chance(0.5);
        const [dx, dy] = vert ? [b * b, a * a] : [a * a, b * b];
        const eqn = `${M.frac(sqx(h), n(dx))} ${ell ? "+" : "−"} ${M.frac(sqx(k, "y"), n(dy))} = 1`;
        const focus = vert ? [h, k + c] : [h + c, k];
        const items = ell
          ? (vert ? [{ t: "fn", e: `(${k}) + ${a}*sqrt(1 - ((x - (${h}))/${b})^2)` }, { t: "fn", e: `(${k}) - ${a}*sqrt(1 - ((x - (${h}))/${b})^2)` }]
            : [{ t: "fn", e: `(${k}) + ${b}*sqrt(1 - ((x - (${h}))/${a})^2)` }, { t: "fn", e: `(${k}) - ${b}*sqrt(1 - ((x - (${h}))/${a})^2)` }])
          : [{ t: "fn", e: `(${k}) + ${b}*sqrt(((x - (${h}))/${a})^2 - 1)` }, { t: "fn", e: `(${k}) - ${b}*sqrt(((x - (${h}))/${a})^2 - 1)` }];
        const W = ell ? (vert ? b : a) + 1 : 2.5 * a, Hh = ell ? (vert ? a : b) + 1 : 2.5 * b;
        return {
          prompt: `Find the focus of ${M.eq(eqn)} that lies ${vert ? "above" : "to the right of"} the center. Enter it as a point.`,
          graph: graph({ view: [h - W, h + W, k - Hh, k + Hh], equal: true, items: [...items, { t: "pt", x: h, y: k }] }),
          steps: [
            `Center (${n(h)}, ${n(k)}). ${ell ? `The larger denominator, ${n(a * a)}, is under ${vert ? y : x}, so the major axis is ${vert ? "vertical" : "horizontal"}: ${M.sup(M.v("a"), 2)} = ${n(a * a)}, ${M.sup(M.v("b"), 2)} = ${n(b * b)}.` : `The ${x}-term is positive, so the hyperbola opens left and right: ${M.sup(M.v("a"), 2)} = ${n(a * a)}, ${M.sup(M.v("b"), 2)} = ${n(b * b)}.`}`,
            ell ? `For an ellipse ${M.sup(M.v("c"), 2)} = ${M.sup(M.v("a"), 2)} − ${M.sup(M.v("b"), 2)} = ${n(a * a)} − ${n(b * b)} = ${n(c * c)}, so ${M.v("c")} = ${n(c)}.`
              : `For a hyperbola ${M.sup(M.v("c"), 2)} = ${M.sup(M.v("a"), 2)} + ${M.sup(M.v("b"), 2)} = ${n(a * a)} + ${n(b * b)} = ${n(c * c)}, so ${M.v("c")} = ${n(c)}.`,
            `The foci are ${n(c)} from the center along the ${vert ? "vertical" : "horizontal"} axis: (${n(focus[0])}, ${n(focus[1])}) and (${n(vert ? h : h - c)}, ${n(vert ? k - c : k)}). ${ell ? `Eccentricity ${M.frac(n(c), n(a))} &lt; 1.` : `Asymptote slopes ±${M.frac(n(b), n(a))}.`}`,
          ],
          answer: { kind: "point", value: focus }, answerText: `(${n(focus[0])}, ${n(focus[1])})`, answerInput: `(${focus[0]}, ${focus[1]})`,
          vals: { a2: a * a, b2: b * b, c2: c * c, a, b, c, fx: focus[0], fy: focus[1], ox: vert ? h : h - c, oy: vert ? k - c : k }, params: { h, k, dx, dy, ell: ell ? 1 : 0, kind },
        };
      },
    },
  });
})(Practice);
