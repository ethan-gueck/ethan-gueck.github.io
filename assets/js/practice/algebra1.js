/*
 * practice/algebra1.js — Algebra I practice problems (chapter 03), one generator per concept key.
 *
 * Each generator(r, level) draws hand-solvable numbers for the level (1 easy, 2 medium, 3 hard) and
 * builds every number it shows from values it computes and reports in `vals`; tools/practice/
 * verifiers/algebra1.py recomputes each of them independently. See practice/core.js for the API.
 */
(function (P) {
  "use strict";
  const { Frac, M, fmt, graph } = P;
  const n = (v) => M.n(v);
  const np = (v) => M.n(v, { paren: true });   // (−3) in substitutions
  const x = M.v("x"), y = M.v("y");
  const typed = (v) => (v instanceof Frac ? (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`) : String(v));
  const fracVal = (q) => ({ n: q.n, d: q.d });
  /** k times a variable: x, −x, 3x (never 1x). */
  const kv = (k, v = x) => (k === 1 ? v : k === -1 ? `−${v}` : `${n(k)}${v}`);
  /** A factor (x − p), or just x when p = 0. */
  const fac = (p) => (p === 0 ? x : `(${M.poly([1, -p])})`);

  P.define("algebra1", {
    // ---- A1.1 Order of operations ------------------------------------------------------------
    "A1.1": {
      title: "Order of operations",
      generate(r, level) {
        if (level === 1) {
          const a = r.int(2, 9), b = r.int(2, 9), c = r.int(2, 9);
          const prod = b * c, ans = a + prod;
          return {
            prompt: `Evaluate ${M.eq(`${n(a)} + ${n(b)} × ${n(c)}`)}`,
            steps: [
              `Multiplication comes before addition: ${n(b)} × ${n(c)} = ${n(prod)}.`,
              `Then add: ${n(a)} + ${n(prod)} = ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
            vals: { prod, ans }, params: { a, b, c },
          };
        }
        if (level === 2) {
          const a = r.int(20, 60), b = r.int(2, 6), c = r.int(1, 6), d = r.int(1, 5);
          const sum = c + d, prod = b * sum, ans = a - prod;
          return {
            prompt: `Evaluate ${M.eq(`${n(a)} − ${n(b)} × (${n(c)} + ${n(d)})`)}`,
            steps: [
              `Parentheses first: ${n(c)} + ${n(d)} = ${n(sum)}.`,
              `Multiply before subtracting: ${n(b)} × ${n(sum)} = ${n(prod)}.`,
              `Subtract: ${n(a)} − ${n(prod)} = ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
            vals: { sum, prod, ans }, params: { a, b, c, d },
          };
        }
        // level 3: a + b² × (c − d) ÷ e, with e dividing b²(c − d)
        for (;;) {
          const a = r.int(-12, 12), b = r.int(2, 6), c = r.int(1, 9), d = r.int(1, 12);
          const diff = c - d, sq = b * b, prod = sq * diff;
          const divisors = [2, 3, 4, 5, 6, 8, 9, 12].filter((e) => prod % e === 0 && prod !== 0);
          if (!divisors.length) continue;
          const e = r.pick(divisors), quot = prod / e, ans = a + quot;
          return {
            prompt: `Evaluate ${M.eq(`${n(a)} + ${M.sup(n(b), 2)} × (${n(c)} − ${n(d)}) ÷ ${n(e)}`)}`,
            steps: [
              `Parentheses: ${n(c)} − ${n(d)} = ${n(diff)}.`,
              `Exponent: ${M.sup(n(b), 2)} = ${n(sq)}.`,
              `Multiply and divide from left to right: ${n(sq)} × ${np(diff)} = ${n(prod)}, then ${n(prod)} ÷ ${n(e)} = ${n(quot)}.`,
              `Add last: ${n(a)} + ${np(quot)} = ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
            vals: { diff, sq, prod, quot, ans }, params: { a, b, c, d, e },
          };
        }
      },
    },

    // ---- A1.2 Fractions ----------------------------------------------------------------------
    "A1.fractions": {
      title: "Adding, subtracting and dividing fractions",
      generate(r, level) {
        if (level === 1) {
          const d = r.int(3, 12), a = r.int(1, d - 1), c = r.int(1, d - 1);
          const sumN = a + c, ans = new Frac(sumN, d), g = P.gcd(sumN, d);
          const steps = [
            `The denominators match, so add the numerators and keep the denominator: ${M.frac(`${n(a)} + ${n(c)}`, n(d))} = ${M.frac(n(sumN), n(d))}.`,
          ];
          if (g > 1) steps.push(`Simplify: divide the top and bottom by their greatest common factor, ${n(g)}: ${M.f(ans)}.`);
          else steps.push(`${n(sumN)} and ${n(d)} share no factor, so ${M.f(ans)} is already in lowest terms.`);
          return {
            prompt: `Add ${M.eq(`${M.frac(n(a), n(d))} + ${M.frac(n(c), n(d))}`)} Give the answer in lowest terms.`,
            steps, answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: typed(ans),
            vals: { sumN, g, ans: fracVal(ans) }, params: { a, c, d },
          };
        }
        if (level === 2) {
          for (;;) {
            const b = r.int(2, 9), d = r.intExcept(2, 12, b), a = r.int(1, b - 1), c = r.int(1, d - 1);
            // both fractions in lowest terms, and different, so the answer is never a trivial 0
            if (b === d || P.gcd(a, b) !== 1 || P.gcd(c, d) !== 1 || a * d === c * b) continue;
            const sub = r.chance(0.5), L = P.lcm(b, d), ka = L / b, kc = L / d;
            const an = a * ka, cn = c * kc, topN = sub ? an - cn : an + cn;
            const ans = new Frac(topN, L), g = P.gcd(Math.abs(topN), L);
            const op = sub ? "−" : "+";
            const steps = [
              `The least common denominator of ${n(b)} and ${n(d)} is ${n(L)}.`,
              `Rewrite each fraction over ${n(L)}: ${ka === 1 ? `${M.frac(n(a), n(b))} already has it` : `${M.frac(n(a), n(b))} = ${M.frac(`${n(a)} × ${n(ka)}`, `${n(b)} × ${n(ka)}`)} = ${M.frac(n(an), n(L))}`}, and ${kc === 1 ? `${M.frac(n(c), n(d))} already has it` : `${M.frac(n(c), n(d))} = ${M.frac(`${n(c)} × ${n(kc)}`, `${n(d)} × ${n(kc)}`)} = ${M.frac(n(cn), n(L))}`}.`,
              `${sub ? "Subtract" : "Add"} the numerators: ${M.frac(`${n(an)} ${op} ${n(cn)}`, n(L))} = ${M.frac(n(topN), n(L))}.`,
              g > 1 ? `Simplify by ${n(g)}: ${M.f(ans)}.` : `It is already in lowest terms: ${M.f(ans)}.`,
            ];
            return {
              prompt: `${sub ? "Subtract" : "Add"} ${M.eq(`${M.frac(n(a), n(b))} ${op} ${M.frac(n(c), n(d))}`)} Give the answer in lowest terms.`,
              steps, answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: typed(ans),
              vals: { L, ka, kc, an, cn, topN, g, ans: fracVal(ans) }, params: { a, b, c, d, sub: sub ? 1 : 0 },
            };
          }
        }
        // level 3: divide mixed numbers  w1 a/b ÷ w2 c/d
        const b = r.int(2, 6), d = r.int(2, 6), a = r.int(1, b - 1), c = r.int(1, d - 1), w1 = r.int(1, 4), w2 = r.int(1, 3);
        const t1 = w1 * b + a, t2 = w2 * d + c;
        const num = t1 * d, den = b * t2, ans = new Frac(num, den);
        const whole = Math.trunc(ans.n / ans.d), rem = ans.n - whole * ans.d;
        const steps = [
          `Write each mixed number as an improper fraction: ${n(w1)}${M.frac(n(a), n(b))} = ${M.frac(`${n(w1)} × ${n(b)} + ${n(a)}`, n(b))} = ${M.frac(n(t1), n(b))} and ${n(w2)}${M.frac(n(c), n(d))} = ${M.frac(n(t2), n(d))}.`,
          `Dividing by a fraction is multiplying by its reciprocal: ${M.frac(n(t1), n(b))} × ${M.frac(n(d), n(t2))}.`,
          `Multiply across: ${M.frac(`${n(t1)} × ${n(d)}`, `${n(b)} × ${n(t2)}`)} = ${M.frac(n(num), n(den))}, which simplifies to ${M.f(ans)}.`,
        ];
        if (ans.d !== 1 && whole > 0) steps.push(`As a mixed number: ${n(whole)}${M.frac(n(rem), n(ans.d))}.`);
        return {
          prompt: `Divide ${M.eq(`${n(w1)}${M.frac(n(a), n(b))} ÷ ${n(w2)}${M.frac(n(c), n(d))}`)} Give the answer as a fraction in lowest terms.`,
          steps, answer: { kind: "number", value: ans.value }, answerText: M.f(ans), answerInput: typed(ans),
          vals: { t1, t2, num, den, whole, rem, ans: fracVal(ans) }, params: { a, b, c, d, w1, w2 },
        };
      },
    },

    // ---- A1.3 Exponent rules -----------------------------------------------------------------
    "A1.2": {
      title: "Exponent rules",
      generate(r, level) {
        const xe = (k) => (k === 1 ? x : M.sup(x, k));
        if (level === 1) {
          const a = r.int(2, 9), b = r.int(2, 9), s = a + b;
          return {
            prompt: `Simplify ${M.eq(`${xe(a)} · ${xe(b)}`)}`,
            steps: [`Multiplying powers of the same base adds the exponents: ${M.sup(x, `${n(a)} + ${n(b)}`)} = ${xe(s)}.`],
            answer: { kind: "expr", expr: `x^${s}`, vars: ["x"] }, answerText: xe(s), answerInput: `x^${s}`,
            vals: { s }, params: { a, b },
          };
        }
        if (level === 2) {
          const a = r.int(2, 5), b = r.int(2, 4), c = r.int(1, 12);
          const pa = a * b, e = pa - c;
          const res = e === 0 ? "1" : e === 1 ? x : M.sup(x, e);
          const steps = [
            `A power of a power multiplies the exponents: ${M.sup(`(${xe(a)})`, b)} = ${M.sup(x, `${n(a)} · ${n(b)}`)} = ${xe(pa)}.`,
            `Dividing powers of the same base subtracts the exponents: ${M.frac(xe(pa), xe(c))} = ${M.sup(x, `${n(pa)} − ${n(c)}`)} = ${res}.`,
          ];
          if (e < 0) steps.push(`A negative exponent means a reciprocal: ${M.sup(x, e)} = ${M.frac("1", xe(-e))}.`);
          if (e === 0) steps.push(`Anything (nonzero) to the power 0 is 1.`);
          return {
            prompt: `Simplify ${M.eq(M.frac(M.sup(`(${xe(a)})`, b), xe(c)))}`,
            steps, answer: { kind: "expr", expr: `x^(${e})`, vars: ["x"] },
            answerText: e < 0 ? `${M.sup(x, e)} = ${M.frac("1", xe(-e))}` : res, answerInput: e === 0 ? "1" : `x^(${e})`,
            vals: { pa, e }, params: { a, b, c },
          };
        }
        // level 3: (k x^a y^b)^c / (m x^d y^e)
        for (;;) {
          const k = r.int(2, 3), a = r.int(1, 4), b = r.int(1, 3), c = r.int(2, 3), d = r.int(1, 6), e = r.int(1, 5);
          const kc = Math.pow(k, c), divs = [1, 2, 3, 4, 6, 8, 9, 12, 16, 27].filter((m) => kc % m === 0 && m > 1);
          if (!divs.length) continue;
          const m = r.pick(divs), coef = kc / m, ex = a * c - d, ey = b * c - e;
          if (ex === 0 || ey === 0) continue;
          const pw = (v, p) => (p === 1 ? M.v(v) : M.sup(M.v(v), p));
          const top = `${n(kc)}${pw("x", a * c)}${pw("y", b * c)}`;
          const resultTerm = (v, p) => (p > 0 ? pw(v, p) : "");
          const denomTerm = (v, p) => (p < 0 ? pw(v, -p) : "");
          const numer = `${coef === 1 && (ex > 0 || ey > 0) ? "" : n(coef)}${resultTerm("x", ex)}${resultTerm("y", ey)}` || "1";
          const denom = `${denomTerm("x", ex)}${denomTerm("y", ey)}`;
          const result = denom ? M.frac(numer, denom) : numer;
          return {
            prompt: `Simplify ${M.eq(M.frac(M.sup(`(${n(k)}${pw("x", a)}${pw("y", b)})`, c), `${n(m)}${pw("x", d)}${pw("y", e)}`))} Write the answer with positive exponents.`,
            steps: [
              `Raise each factor to the power ${n(c)}: ${M.sup(n(k), c)} = ${n(kc)}, ${M.sup(`(${pw("x", a)})`, c)} = ${pw("x", a * c)}, ${M.sup(`(${pw("y", b)})`, c)} = ${pw("y", b * c)}. The top is ${top}.`,
              `Divide the numbers: ${n(kc)} ÷ ${n(m)} = ${n(coef)}.`,
              `Subtract exponents of each letter: x: ${n(a * c)} − ${n(d)} = ${n(ex)}; y: ${n(b * c)} − ${n(e)} = ${n(ey)}.`,
              `A negative exponent moves that factor to the denominator: ${result}.`,
            ],
            answer: { kind: "expr", expr: `${coef}*x^(${ex})*y^(${ey})`, vars: ["x", "y"] }, answerText: result,
            answerInput: `${coef}x^(${ex})y^(${ey})`,
            vals: { kc, coef, ac: a * c, bc: b * c, ex, ey }, params: { k, a, b, c, d, e, m },
          };
        }
      },
    },

    // ---- A1.4 Radicals -----------------------------------------------------------------------
    "A1.3": {
      title: "Simplifying radicals",
      generate(r, level) {
        const squarefree = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15];
        if (level <= 2) {
          const k = level === 1 ? r.int(2, 5) : r.int(4, 12), s = r.pick(level === 1 ? [2, 3, 5] : squarefree);
          const N = k * k * s, sq = k * k;
          return {
            prompt: `Simplify ${M.eq(M.sqrt(n(N)))} Write it as a√b with b as small as possible.`,
            steps: [
              `Find the largest perfect square that divides ${n(N)}: ${n(N)} = ${n(sq)} × ${n(s)}, and ${n(sq)} = ${M.sup(n(k), 2)}.`,
              `The root of a product is the product of the roots: ${M.sqrt(n(N))} = ${M.sqrt(n(sq))} · ${M.sqrt(n(s))} = ${n(k)}${M.sqrt(n(s))}.`,
            ],
            answer: { kind: "number", value: k * Math.sqrt(s) }, answerText: `${n(k)}${M.sqrt(n(s))}`, answerInput: `${k}sqrt(${s})`,
            vals: { sq, k }, params: { N, s },
          };
        }
        // level 3: rationalize c / √d
        const d = r.pick([2, 3, 5, 6, 7, 8, 12, 18]), c = r.int(2, 12);
        let k = 1, s = d;
        for (let f = 2; f * f <= d; f++) while (s % (f * f) === 0) { s /= f * f; k *= f; }
        // c/(k√s) = c√s/(k s)
        const den = k * s, q = new Frac(c, den), g = P.gcd(c, den);
        const coef = q;  // answer = (c/den)·√s
        const simple = k > 1 ? `First simplify ${M.sqrt(n(d))} = ${n(k)}${M.sqrt(n(s))}. ` : "";
        const body = coef.isInt() ? `${coef.n === 1 ? "" : n(coef.n)}${M.sqrt(n(s))}` : M.frac(`${coef.n === 1 ? "" : n(coef.n)}${M.sqrt(n(s))}`, n(coef.d));
        return {
          prompt: `Rationalize the denominator: ${M.eq(M.frac(n(c), M.sqrt(n(d))))}`,
          steps: [
            `${simple}Multiply the top and bottom by ${M.sqrt(n(s))}, which is 1 in disguise, so the root leaves the denominator.`,
            `${M.frac(n(c), `${k > 1 ? n(k) : ""}${M.sqrt(n(s))}`)} · ${M.frac(M.sqrt(n(s)), M.sqrt(n(s)))} = ${k > 1 ? `${M.frac(`${n(c)}${M.sqrt(n(s))}`, `${n(k)} · ${n(s)}`)} = ` : ""}${M.frac(`${n(c)}${M.sqrt(n(s))}`, n(den))}, since ${M.sqrt(n(s))} · ${M.sqrt(n(s))} = ${n(s)}.`,
            g > 1 ? `Cancel the common factor ${n(g)}: ${body}.` : `No common factor to cancel: ${body}.`,
          ],
          answer: { kind: "number", value: q.value * Math.sqrt(s) }, answerText: body, answerInput: `${q.n === 1 ? "" : q.n}sqrt(${s})${q.d === 1 ? "" : `/${q.d}`}`,
          vals: { k, s, den, g, coef: fracVal(coef) }, params: { c, d },
        };
      },
    },

    // ---- A1.5 Scientific notation ------------------------------------------------------------
    "A1.sci": {
      title: "Scientific notation",
      generate(r, level) {
        const ten = (e) => `10<sup>${fmt(e)}</sup>`;
        const sci = (m, e) => `${fmt(m)} × ${ten(e)}`;
        // mantissas as tenths (integers) so the arithmetic is exact
        const ai = r.int(11, 99), bi = r.int(11, 99);
        const a = ai / 10, b = bi / 10;
        const m = level === 1 ? r.int(2, 6) : r.int(-8, 9), k = level === 1 ? r.int(2, 6) : r.int(-8, 9);
        const divide = level === 3;
        if (!divide) {
          const prodI = ai * bi;  // hundredths
          let mant = prodI / 100, e = m + k, shift = 0;
          if (mant >= 10) { mant = prodI / 1000; e += 1; shift = 1; }
          const steps = [
            `Multiply the numbers in front: ${fmt(a)} × ${fmt(b)} = ${fmt(prodI / 100)}.`,
            `Multiply the powers of 10 by adding exponents: ${ten(m)} × ${ten(k)} = ${ten(m + k)}.`,
          ];
          if (shift) steps.push(`${fmt(prodI / 100)} is 10 or more, so move the decimal one place left and add 1 to the exponent: ${sci(mant, e)}.`);
          else steps.push(`The front number is between 1 and 10, so the answer is ${sci(mant, e)}.`);
          return {
            prompt: `Multiply and write in scientific notation: ${M.eq(`(${sci(a, m)}) × (${sci(b, k)})`)}`,
            steps, answer: { kind: "number", value: mant * Math.pow(10, e) }, answerText: sci(mant, e), answerInput: `${fmt(mant).replace("−", "-")}e${e}`,
            vals: { raw: prodI / 100, sumExp: m + k, mant, e }, params: { a, b, m, k }, consts: [10],
          };
        }
        // divide: a·10^m ÷ b·10^k with a quotient that terminates: choose b and quotient
        // a = q·b with q (one decimal) between 1.1 and 9.9 and a below 10, so both are in scientific notation
        const bb = r.pick([2, 3, 4]), qi = r.int(11, Math.floor(99 / bb));
        const aNum = (qi * bb) / 10, q = qi / 10, mant = q, e = m - k;
        return {
          prompt: `Divide and write in scientific notation: ${M.eq(M.frac(sci(aNum, m), sci(bb, k)))}`,
          steps: [
            `Divide the numbers in front: ${fmt(aNum)} ÷ ${fmt(bb)} = ${fmt(q)}.`,
            `Divide the powers of 10 by subtracting exponents: ${ten(m)} ÷ ${ten(k)} = ${M.sup("10", `${n(m)} − ${np(k)}`)} = ${ten(e)}.`,
            `${fmt(q)} is between 1 and 10, so the answer is ${sci(mant, e)}.`,
          ],
          answer: { kind: "number", value: mant * Math.pow(10, e) }, answerText: sci(mant, e), answerInput: `${fmt(mant)}e${e}`.replace("−", "-"),
          vals: { q, e }, params: { a: aNum, b: bb, m, k }, consts: [10],
        };
      },
    },

    // ---- A1.6 Slope ------------------------------------------------------------------------------
    "A1.4": {
      title: "Slope from two points or a graph",
      generate(r, level) {
        let x1, y1, x2, y2;
        do {
          x1 = r.int(-6, 6); x2 = r.int(-6, 6); y1 = r.int(-6, 6); y2 = r.int(-6, 6);
        } while (x1 === x2 || (level === 1 && (y2 - y1) % (x2 - x1) !== 0) || (level >= 2 && (y2 - y1) % (x2 - x1) === 0 && r.chance(0.7)));
        const rise = y2 - y1, run = x2 - x1, m = new Frac(rise, run);
        const fromGraph = level === 3;
        const P1 = `(${n(x1)}, ${n(y1)})`, P2 = `(${n(x2)}, ${n(y2)})`;
        const kind = m.n > 0 ? "rises from left to right" : m.n < 0 ? "falls from left to right" : "is horizontal";
        const g = graph({
          view: [-8, 8, -8, 8],
          items: [
            { t: "fn", e: `${m.n}/${m.d}*(x - (${x1})) + (${y1})`, role: "primary" },
            { t: "pt", x: x1, y: y1, label: fromGraph ? "" : "A" }, { t: "pt", x: x2, y: y2, label: fromGraph ? "" : "B" },
          ],
        });
        return {
          prompt: fromGraph
            ? `The line passes through the two marked points, which sit on grid corners. What is its slope?`
            : `Find the slope of the line through ${M.eq(`${P1} and ${P2}`)}`,
          graph: g,
          steps: [
            fromGraph ? `Read the two points from the grid: ${P1} and ${P2}.` : `Label the points: (x₁, y₁) = ${P1} and (x₂, y₂) = ${P2}.`,
            `Rise: ${M.v("y")}₂ − ${M.v("y")}₁ = ${n(y2)} − ${np(y1)} = ${n(rise)}. Run: ${M.v("x")}₂ − ${M.v("x")}₁ = ${n(x2)} − ${np(x1)} = ${n(run)}.`,
            `Slope = rise ÷ run = ${M.frac(n(rise), n(run))} = ${M.f(m)}. The line ${kind}.`,
          ],
          answer: { kind: "number", value: m.value }, answerText: M.f(m), answerInput: typed(m),
          vals: { rise, run, m: fracVal(m) }, params: { x1, y1, x2, y2 }, consts: [1],
        };
      },
    },

    // ---- A1.7 Equations of a line ----------------------------------------------------------------
    "A1.5": {
      title: "Equation of a line",
      generate(r, level) {
        let x1, y1, x2, y2;
        do { x1 = r.int(-5, 5); x2 = r.int(-5, 5); y1 = r.int(-6, 6); y2 = r.int(-6, 6); }
        while (x1 === x2 || y1 === y2 || (level <= 2 && (y2 - y1) % (x2 - x1) !== 0) || (level === 3 && (y2 - y1) % (x2 - x1) === 0));
        const m = new Frac(y2 - y1, x2 - x1), b = new Frac(y1).sub(m.mul(x1));
        const eqn = `${y} = ${M.poly([m, b])}`;
        const typedEq = `${typed(m)}*x + (${typed(b)})`;
        if (level === 1) {
          // read slope and intercept from a graph
          const bi = r.int(-5, 5), mi = r.nonzero(-3, 3);
          const pts = [[0, bi], [1, bi + mi]];
          return {
            prompt: `Write the equation of the graphed line in slope–intercept form, ${y} = ${M.v("m")}${x} + ${M.v("b")}.`,
            graph: graph({ view: [-8, 8, -8, 8], items: [{ t: "fn", e: `${mi}*x + (${bi})` }, { t: "pt", x: 0, y: bi }, { t: "pt", x: pts[1][0], y: pts[1][1] }] }),
            steps: [
              `The line crosses the y-axis at (0, ${n(bi)}), so ${M.v("b")} = ${n(bi)}.`,
              `From (0, ${n(bi)}), one step right goes ${mi > 0 ? "up" : "down"} ${n(Math.abs(mi))} to (1, ${n(bi + mi)}), so the slope ${M.v("m")} = ${n(mi)}.`,
              `${y} = ${M.poly([mi, bi])}.`,
            ],
            answer: { kind: "expr", expr: `${mi}*x + (${bi})`, vars: ["x"] }, answerText: `${y} = ${M.poly([mi, bi])}`, answerInput: `y = ${mi}x + ${bi}`,
            vals: { m: mi, b: bi, y1: bi + mi }, params: { mi, bi },
          };
        }
        return {
          prompt: `Write the equation of the line through ${M.eq(`(${n(x1)}, ${n(y1)}) and (${n(x2)}, ${n(y2)})`)} in slope–intercept form.`,
          steps: [
            `Slope: ${M.v("m")} = ${M.frac(`${n(y2)} − ${np(y1)}`, `${n(x2)} − ${np(x1)}`)} = ${M.frac(n(y2 - y1), n(x2 - x1))} = ${M.f(m)}.`,
            `Put one point into ${y} = ${M.v("m")}${x} + ${M.v("b")}: ${n(y1)} = ${M.f(m, { paren: true })} · ${np(x1)} + ${M.v("b")}, so ${n(y1)} = ${M.f(m.mul(x1))} + ${M.v("b")}.`,
            `Solve for ${M.v("b")}: ${M.v("b")} = ${n(y1)} − ${M.f(m.mul(x1), { paren: true })} = ${M.f(b)}.`,
            `${eqn}.`,
          ],
          answer: { kind: "expr", expr: typedEq, vars: ["x"] }, answerText: eqn, answerInput: `y = ${typedEq}`,
          vals: { rise: y2 - y1, run: x2 - x1, m: fracVal(m), mx1: fracVal(m.mul(x1)), b: fracVal(b) }, params: { x1, y1, x2, y2 },
        };
      },
    },

    // ---- A1.8 Parallel and perpendicular lines -----------------------------------------------------
    "A1.6": {
      title: "Parallel and perpendicular lines",
      generate(r, level) {
        const px = r.int(-5, 5), py = r.int(-6, 6);
        if (level <= 2) {
          const m0 = level === 1 ? new Frac(r.nonzero(-4, 4)) : new Frac(r.nonzero(-4, 4), r.int(2, 4));
          const b0 = r.int(-6, 6), perp = level === 2;
          const m = perp ? new Frac(-1).div(m0) : m0, b = new Frac(py).sub(m.mul(px));
          const given = `${y} = ${M.poly([m0, b0])}`;
          return {
            prompt: `Write the equation of the line through (${n(px)}, ${n(py)}) that is ${perp ? "perpendicular" : "parallel"} to ${M.eq(given)}`,
            graph: graph({ view: [-10, 10, -10, 10], items: [{ t: "fn", e: `${m0.n}/${m0.d}*x + (${b0})`, role: "muted" }, { t: "pt", x: px, y: py }] }),
            steps: [
              perp
                ? `The given slope is ${M.f(m0)}. A perpendicular slope is its negative reciprocal: ${M.v("m")} = −1 ÷ ${M.f(m0, { paren: true })} = ${M.f(m)}.`
                : `Parallel lines have equal slopes, so ${M.v("m")} = ${M.f(m0)}.`,
              `Use the point: ${n(py)} = ${M.f(m, { paren: true })} · ${np(px)} + ${M.v("b")} = ${M.f(m.mul(px))} + ${M.v("b")}, so ${M.v("b")} = ${M.f(b)}.`,
              `${y} = ${M.poly([m, b])}.`,
            ],
            answer: { kind: "expr", expr: `${typed(m)}*x + (${typed(b)})`, vars: ["x"] }, answerText: `${y} = ${M.poly([m, b])}`,
            answerInput: `y = ${typed(m)}x + (${typed(b)})`,
            vals: { m: fracVal(m), mpx: fracVal(m.mul(px)), b: fracVal(b) }, params: { px, py, m0: fracVal(m0), b0, perp: perp ? 1 : 0 },
          };
        }
        // level 3: perpendicular to Ax + By = C
        const A = r.nonzero(-6, 6), B = r.nonzero(-6, 6), C = r.int(-12, 12);
        const m0 = new Frac(-A, B), m = new Frac(B, A), b = new Frac(py).sub(m.mul(px));
        return {
          prompt: `Write the equation of the line through (${n(px)}, ${n(py)}) perpendicular to ${M.eq(`${M.poly([A, 0])}${M.term(B, y)} = ${n(C)}`)}`,
          steps: [
            `Solve the given line for ${y}: ${n(B)}${y} = ${M.poly([-A, C])}, so ${y} = ${M.poly([m0, new Frac(C, B)])}. Its slope is ${M.f(m0)}.`,
            `The perpendicular slope is the negative reciprocal: ${M.v("m")} = ${M.f(m)}.`,
            `Use the point: ${n(py)} = ${M.f(m, { paren: true })} · ${np(px)} + ${M.v("b")}, so ${M.v("b")} = ${n(py)} − ${M.f(m.mul(px), { paren: true })} = ${M.f(b)}.`,
            `${y} = ${M.poly([m, b])}.`,
          ],
          answer: { kind: "expr", expr: `${typed(m)}*x + (${typed(b)})`, vars: ["x"] }, answerText: `${y} = ${M.poly([m, b])}`,
          answerInput: `y = ${typed(m)}x + (${typed(b)})`,
          vals: { m0: fracVal(m0), cb: fracVal(new Frac(C, B)), m: fracVal(m), mpx: fracVal(m.mul(px)), b: fracVal(b) }, params: { A, B, C, px, py },
        };
      },
    },

    // ---- A1.9 Functions ----------------------------------------------------------------------------
    "A1.func": {
      title: "Evaluating functions",
      generate(r, level) {
        if (level === 1) {
          const a = r.nonzero(-6, 6), b = r.int(-9, 9), t = r.int(-5, 5), prod = a * t, ans = prod + b;
          return {
            prompt: `If ${M.eq(`${M.v("f")}(${x}) = ${M.poly([a, b])}`)} find ${M.v("f")}(${n(t)}).`,
            steps: [
              `Replace ${x} with ${n(t)}: ${M.v("f")}(${n(t)}) = ${n(a)} · ${np(t)}${M.term(b, "")}.`,
              `Multiply: ${n(a)} · ${np(t)} = ${n(prod)}. Then ${n(prod)}${M.term(b, "")} = ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans), vals: { prod, ans }, params: { a, b, t },
          };
        }
        if (level === 2) {
          const a = r.nonzero(-3, 3), b = r.int(-6, 6), c = r.int(-9, 9), t = r.int(-4, 4);
          const sq = t * t, A = a * sq, B = b * t, ans = A + B + c;
          return {
            prompt: `If ${M.eq(`${M.v("g")}(${x}) = ${M.poly([a, b, c])}`)} find ${M.v("g")}(${n(t)}).`,
            steps: [
              `Replace every ${x} with ${np(t)}: ${M.v("g")}(${n(t)}) = ${n(a)} · ${M.sup(np(t), 2)}${M.term(b, ` · ${np(t)}`)}${M.term(c, "")}.`,
              `Exponent first: ${M.sup(np(t), 2)} = ${n(sq)}. Then multiply: ${n(a)} · ${n(sq)} = ${n(A)} and ${n(b)} · ${np(t)} = ${n(B)}.`,
              `Add: ${n(A)}${M.term(B, "")}${M.term(c, "")} = ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans), vals: { sq, A, B, ans }, params: { a, b, c, t },
          };
        }
        // level 3: composition f(g(t))
        const a = r.nonzero(-4, 4), b = r.int(-6, 6), c = r.nonzero(-3, 3), d = r.int(-5, 5), t = r.int(-4, 4);
        const inner = c * t * t + d, outer = a * inner + b;
        return {
          prompt: `Let ${M.v("f")}(${x}) = ${M.poly([a, b])} and ${M.v("g")}(${x}) = ${M.poly([c, 0, d])}. Find ${M.eq(`${M.v("f")}(${M.v("g")}(${n(t)}))`)}`,
          steps: [
            `Work from the inside out. ${M.v("g")}(${n(t)}) = ${n(c)} · ${M.sup(np(t), 2)}${M.term(d, "")} = ${n(c)} · ${n(t * t)}${M.term(d, "")} = ${n(inner)}.`,
            `Now ${M.v("f")}(${n(inner)}) = ${n(a)} · ${np(inner)}${M.term(b, "")} = ${n(a * inner)}${M.term(b, "")} = ${n(outer)}.`,
          ],
          answer: { kind: "number", value: outer }, answerText: n(outer), answerInput: String(outer),
          vals: { tt: t * t, inner, ai: a * inner, outer }, params: { a, b, c, d, t },
        };
      },
    },

    // ---- A1.10 Solving linear equations ----------------------------------------------------------------
    "A1.solve": {
      title: "Solving linear equations",
      generate(r, level) {
        if (level === 1) {
          const a = r.nonzero(-9, 9), sol = r.int(-9, 9), b = r.int(-15, 15), c = a * sol + b;
          return {
            prompt: `Solve for ${x}: ${M.eq(`${M.poly([a, b])} = ${n(c)}`)}`,
            steps: [
              `Undo the ${b >= 0 ? "addition" : "subtraction"}: ${b >= 0 ? "subtract" : "add"} ${n(Math.abs(b))} on both sides: ${n(a)}${x} = ${n(c)} − ${np(b)} = ${n(c - b)}.`,
              `Divide both sides by ${n(a)}: ${x} = ${M.frac(n(c - b), n(a))} = ${n(sol)}.`,
            ],
            answer: { kind: "number", value: sol }, answerText: `${x} = ${n(sol)}`, answerInput: String(sol), vals: { cb: c - b, sol }, params: { a, b, c },
          };
        }
        if (level === 2) {
          // a(x + b) = c x + d
          for (;;) {
            const a = r.nonzero(-6, 6), b = r.int(-6, 6), c = r.intExcept(-6, 6, a), sol = r.int(-8, 8);
            const d = a * (sol + b) - c * sol;
            const ab = a * b, k = a - c, rhs = d - ab;
            if (k === 0) continue;
            return {
              prompt: `Solve for ${x}: ${M.eq(`${n(a)}(${M.poly([1, b])}) = ${M.poly([c, d])}`)}`,
              steps: [
                `Distribute: ${M.poly([a, ab])} = ${M.poly([c, d])}.`,
                `Collect ${x}-terms on the left (subtract ${M.poly([c, 0])}) and numbers on the right (subtract ${n(ab)}): ${n(a)}${x} − ${np(c)}${x} = ${n(d)} − ${np(ab)}, so ${n(k)}${x} = ${n(rhs)}.`,
                `Divide by ${n(k)}: ${x} = ${M.frac(n(rhs), n(k))} = ${n(sol)}.`,
              ],
              answer: { kind: "number", value: sol }, answerText: `${x} = ${n(sol)}`, answerInput: String(sol),
              vals: { ab, k, rhs, sol }, params: { a, b, c, d },
            };
          }
        }
        // level 3: word problem, two plans
        const f1 = r.int(20, 60), r1 = r.int(5, 12), r2 = r.int(r1 + 2, r1 + 10), months = r.int(4, 15);
        const f2 = f1 + (r1 - r2) * months;
        if (f2 <= 0) return this.generate(r, level);
        return {
          prompt: `Gym A charges a ${P.money(f1)} sign-up fee plus ${P.money(r1)} a month. Gym B charges ${P.money(f2)} to sign up plus ${P.money(r2)} a month. After how many months do the two cost the same?`,
          steps: [
            `Let ${M.v("m")} be the number of months. Cost A = ${n(f1)} + ${n(r1)}${M.v("m")}; cost B = ${n(f2)} + ${n(r2)}${M.v("m")}.`,
            `Set them equal: ${n(f1)} + ${n(r1)}${M.v("m")} = ${n(f2)} + ${n(r2)}${M.v("m")}.`,
            `Subtract ${n(r1)}${M.v("m")} and ${n(f2)} from both sides: ${n(f1)} − ${n(f2)} = ${n(r2)}${M.v("m")} − ${n(r1)}${M.v("m")}, so ${n(f1 - f2)} = ${n(r2 - r1)}${M.v("m")}.`,
            `Divide: ${M.v("m")} = ${M.frac(n(f1 - f2), n(r2 - r1))} = ${n(months)} months.`,
          ],
          answer: { kind: "number", value: months }, answerText: `${n(months)} months`, answerInput: String(months),
          vals: { diffF: f1 - f2, diffR: r2 - r1, months }, params: { f1, r1, f2, r2 },
        };
      },
    },

    // ---- A1.11 Absolute value equations -------------------------------------------------------------------
    "A1.7": {
      title: "Absolute value equations",
      generate(r, level) {
        const a = level === 1 ? 1 : r.nonzero(-5, 5), b = r.int(-9, 9), c = r.int(1, 12), d = level === 3 ? r.int(-8, 8) : 0;
        const rhs = c;  // |ax + b| = c after isolating
        const total = c + d;  // shown right side when d ≠ 0: |ax + b| + d = total
        const s1 = new Frac(c - b, a), s2 = new Frac(-c - b, a);
        const inside = M.poly([a, b]);
        const steps = [];
        if (level === 3) steps.push(`Isolate the absolute value: subtract ${np(d)} from both sides: |${inside}| = ${n(total)} − ${np(d)} = ${n(rhs)}.`);
        steps.push(`|${M.v("u")}| = ${n(rhs)} means ${M.v("u")} = ${n(rhs)} or ${M.v("u")} = −${n(rhs)}. So ${inside} = ${n(rhs)} or ${inside} = ${n(-rhs)}.`);
        steps.push(`First case: ${kv(a)} = ${n(rhs)} − ${np(b)} = ${n(c - b)}, so ${x} = ${M.f(s1)}.`);
        steps.push(`Second case: ${kv(a)} = ${n(-rhs)} − ${np(b)} = ${n(-c - b)}, so ${x} = ${M.f(s2)}.`);
        return {
          prompt: `Solve ${M.eq(`|${inside}|${d ? M.term(d, "") : ""} = ${n(level === 3 ? total : rhs)}`)} Enter both solutions, separated by a comma.`,
          steps, answer: { kind: "numbers", values: [s1.value, s2.value] }, answerText: `${x} = ${M.f(s1)} or ${x} = ${M.f(s2)}`,
          answerInput: `${typed(s1)}, ${typed(s2)}`,
          vals: { rhs, cb1: c - b, cb2: -c - b, s1: fracVal(s1), s2: fracVal(s2), total }, params: { a, b, c, d },
        };
      },
    },

    // ---- A1.12 Systems of linear equations -------------------------------------------------------------
    "A1.8": {
      title: "Systems of two linear equations",
      generate(r, level) {
        if (level === 3) {
          // tickets word problem
          const pa = r.int(8, 15), pc = r.int(3, pa - 2), A = r.int(20, 80), C = r.int(20, 80), N = A + C, T = pa * A + pc * C;
          const pcN = pc * N, diff = T - pcN, dp = pa - pc;
          return {
            prompt: `A theater sold ${n(N)} tickets for ${P.money(T)}. Adult tickets cost ${P.money(pa)} and child tickets ${P.money(pc)}. How many adult tickets were sold?`,
            steps: [
              `Let ${M.v("a")} be adult tickets and ${M.v("c")} child tickets: ${M.v("a")} + ${M.v("c")} = ${n(N)} and ${n(pa)}${M.v("a")} + ${n(pc)}${M.v("c")} = ${n(T)}.`,
              `Multiply the first equation by ${n(pc)}: ${n(pc)}${M.v("a")} + ${n(pc)}${M.v("c")} = ${n(pcN)}.`,
              `Subtract it from the second: (${n(pa)} − ${n(pc)})${M.v("a")} = ${n(T)} − ${n(pcN)}, so ${n(dp)}${M.v("a")} = ${n(diff)}.`,
              `${M.v("a")} = ${M.frac(n(diff), n(dp))} = ${n(A)} adult tickets (and ${n(N)} − ${n(A)} = ${n(C)} child tickets).`,
            ],
            answer: { kind: "number", value: A }, answerText: `${n(A)} adult tickets`, answerInput: String(A),
            vals: { N, T, pcN, diff, dp, A, C }, params: { pa, pc, N, T },
          };
        }
        for (;;) {
          const sx = r.int(-6, 6), sy = r.int(-6, 6);
          const a1 = level === 1 ? 1 : r.nonzero(-5, 5), b1 = level === 1 ? r.pick([1, -1]) : r.nonzero(-5, 5);
          const a2 = level === 1 ? 1 : r.nonzero(-5, 5), b2 = level === 1 ? -b1 : r.nonzero(-5, 5);
          const det = a1 * b2 - a2 * b1;
          if (det === 0) continue;
          const c1 = a1 * sx + b1 * sy, c2 = a2 * sx + b2 * sy;
          // eliminate y: multiply eq1 by b2, eq2 by b1, subtract
          const A1 = a1 * b2, C1 = c1 * b2, A2 = a2 * b1, C2 = c2 * b1, k = A1 - A2, rhs = C1 - C2;
          const back = c1 - a1 * sx;  // b1·y = back
          const eq = (a, b, c) => `${kv(a)}${M.term(b, y)} = ${n(c)}`;
          return {
            prompt: `Solve the system ${M.eq(eq(a1, b1, c1))} ${M.eq(eq(a2, b2, c2))} Enter the solution as a point (${x}, ${y}).`,
            graph: graph({ view: [-10, 10, -10, 10], items: [{ t: "fn", e: `(${c1} - (${a1})*x)/(${b1})` }, { t: "fn", e: `(${c2} - (${a2})*x)/(${b2})`, role: "secondary" }] }),
            steps: [
              `Eliminate ${y}: multiply the first equation by ${n(b2)} and the second by ${n(b1)}: ${kv(A1)}${M.term(b1 * b2, y)} = ${n(C1)} and ${kv(A2)}${M.term(b1 * b2, y)} = ${n(C2)}.`,
              `Subtract the second from the first: ${kv(k)} = ${n(rhs)}, so ${x} = ${M.frac(n(rhs), n(k))} = ${n(sx)}.`,
              `Put ${x} = ${n(sx)} into the first equation: ${n(a1)} · ${np(sx)}${M.term(b1, y)} = ${n(c1)}, so ${kv(b1, y)} = ${n(back)} and ${y} = ${n(sy)}.`,
              `The lines cross at (${n(sx)}, ${n(sy)}).`,
            ],
            answer: { kind: "point", value: [sx, sy] }, answerText: `(${n(sx)}, ${n(sy)})`, answerInput: `(${sx}, ${sy})`,
            vals: { c1, c2, A1, C1, A2, C2, bb: b1 * b2, k, rhs, back, sx, sy }, params: { a1, b1, a2, b2, c1, c2 },
          };
        }
      },
    },

    // ---- A1.13 Polynomial products ---------------------------------------------------------------------------
    "A1.9": {
      title: "Multiplying binomials",
      generate(r, level) {
        const bin = (p, q) => `(${M.poly([p, q])})`;
        const t = (k) => (k < 0 ? `(${kv(k)})` : kv(k));   // a term in parentheses when negative: (−5x)
        if (level <= 2) {
          const a = level === 1 ? 1 : r.nonzero(-5, 5), c = level === 1 ? 1 : r.nonzero(-5, 5);
          const b = r.nonzero(-9, 9), d = r.nonzero(-9, 9);
          const F = a * c, O = a * d, I = b * c, L = b * d, mid = O + I;
          const result = M.poly([F, mid, L]);
          return {
            prompt: `Multiply and simplify: ${M.eq(`${bin(a, b)}${bin(c, d)}`)}`,
            steps: [
              `Multiply every term of the first binomial by every term of the second (FOIL: First, Outer, Inner, Last).`,
              `First: ${t(a)} · ${t(c)} = ${kv(F, M.sup(x, 2))}. Outer: ${t(a)} · ${np(d)} = ${kv(O)}. Inner: ${np(b)} · ${t(c)} = ${kv(I)}. Last: ${np(b)} · ${np(d)} = ${n(L)}.`,
              mid === 0 ? `The middle terms ${kv(O)} and ${kv(I)} cancel.` : `Combine the like terms ${kv(O)} and ${kv(I)}: ${kv(mid)}.`,
              `${result}.`,
            ],
            answer: { kind: "expr", expr: `${F}x^2 + (${mid})x + (${L})`, vars: ["x"], form: "expanded" }, answerText: result,
            answerInput: `${F}x^2 + (${mid})x + (${L})`,
            vals: { F, O, I, L, mid }, params: { a, b, c, d },
          };
        }
        // level 3: a special product, by its pattern
        const a = r.int(2, 6), b = r.nonzero(-9, 9);
        if (r.chance(0.5)) {
          const A2 = a * a, twoAB = 2 * a * b, B2 = b * b, result = M.poly([A2, twoAB, B2]);
          return {
            prompt: `Expand ${M.eq(M.sup(bin(a, b), 2))}`,
            steps: [
              `Use the square of a ${b > 0 ? "sum" : "difference"}: ${M.sup(`(${M.v("u")} ${b > 0 ? "+" : "−"} ${M.v("v")})`, 2)} = ${M.sup(M.v("u"), 2)} ${b > 0 ? "+" : "−"} 2${M.v("u")}${M.v("v")} + ${M.sup(M.v("v"), 2)}, with ${M.v("u")} = ${kv(a)} and ${M.v("v")} = ${n(Math.abs(b))}.`,
              `${M.sup(M.v("u"), 2)} = ${M.sup(`(${kv(a)})`, 2)} = ${kv(A2, M.sup(x, 2))}; 2${M.v("u")}${M.v("v")} = 2 · ${kv(a)} · ${n(Math.abs(b))} = ${kv(Math.abs(twoAB))}; ${M.sup(M.v("v"), 2)} = ${M.sup(n(Math.abs(b)), 2)} = ${n(B2)}.`,
              `${result}. (Not ${kv(A2, M.sup(x, 2))} + ${n(B2)}: the middle term is the one people forget.)`,
            ],
            answer: { kind: "expr", expr: `${A2}x^2 + (${twoAB})x + (${B2})`, vars: ["x"], form: "expanded" }, answerText: result,
            answerInput: `${A2}x^2 + (${twoAB})x + (${B2})`,
            vals: { A2, twoAB, absTwoAB: Math.abs(twoAB), B2, absB: Math.abs(b) }, params: { a, b, square: 1 },
          };
        }
        const B = Math.abs(b), A2 = a * a, B2 = B * B, result = M.poly([A2, 0, -B2]);
        return {
          prompt: `Multiply ${M.eq(`${bin(a, B)}${bin(a, -B)}`)}`,
          steps: [
            `This is a sum times a difference of the same two terms: (${M.v("u")} + ${M.v("v")})(${M.v("u")} − ${M.v("v")}) = ${M.sup(M.v("u"), 2)} − ${M.sup(M.v("v"), 2)}, with ${M.v("u")} = ${kv(a)} and ${M.v("v")} = ${n(B)}.`,
            `The middle terms ${kv(a * B)} and ${kv(-a * B)} cancel.`,
            `${M.sup(`(${kv(a)})`, 2)} − ${M.sup(n(B), 2)} = ${result}.`,
          ],
          answer: { kind: "expr", expr: `${A2}x^2 - ${B2}`, vars: ["x"], form: "expanded" }, answerText: result,
          answerInput: `${A2}x^2 - ${B2}`,
          vals: { A2, B2, aB: a * B, absB: B }, params: { a, b: B, square: 0 },
        };
      },
    },

    // ---- A1.14 Factoring ------------------------------------------------------------------------------------
    "A1.10": {
      title: "Factoring quadratics",
      generate(r, level) {
        if (level === 1) {
          const p = r.nonzero(-9, 9), q = r.nonzero(-9, 9), B = p + q, C = p * q;
          return {
            prompt: `Factor ${M.eq(M.poly([1, B, C]))}`,
            steps: [
              `Find two numbers that multiply to ${n(C)} and add to ${n(B)}.`,
              `${n(p)} × ${np(q)} = ${n(C)} and ${n(p)} + ${np(q)} = ${n(B)}.`,
              `So ${M.poly([1, B, C])} = (${M.poly([1, p])})(${M.poly([1, q])}).`,
            ],
            answer: { kind: "expr", expr: `(x + (${p}))*(x + (${q}))`, vars: ["x"], form: "factored" },
            answerText: `(${M.poly([1, p])})(${M.poly([1, q])})`, answerInput: `(x + ${p})(x + ${q})`.replace(/\+ -/g, "- "),
            vals: { p, q, B, C }, params: { B, C },
          };
        }
        if (level === 2) {
          // AC method: (ax + p)(x + q), a ≥ 2
          for (;;) {
            const a = r.int(2, 5), p = r.nonzero(-7, 7), q = r.nonzero(-7, 7);
            if (P.gcd(a, p) !== 1) continue;
            const A = a, B = a * q + p, C = p * q, AC = A * C;
            const u = a * q, v = p;  // u + v = B, u·v = AC
            return {
              prompt: `Factor ${M.eq(M.poly([A, B, C]))}`,
              steps: [
                `Multiply ${M.v("a")}·${M.v("c")} = ${n(A)} × ${np(C)} = ${n(AC)}. Find two numbers that multiply to ${n(AC)} and add to ${n(B)}: ${n(u)} and ${n(v)}.`,
                `Split the middle term: ${M.poly([A, 0, 0]).replace(/ $/, "")}${M.term(u, x)}${M.term(v, x)}${M.term(C, "")}.`,
                `Group and factor each pair: ${n(a)}${x}(${M.poly([1, q])})${M.term(p, `(${M.poly([1, q])})`)}.`,
                `Factor out the common binomial: (${M.poly([a, p])})(${M.poly([1, q])}).`,
              ],
              answer: { kind: "expr", expr: `(${a}x + (${p}))*(x + (${q}))`, vars: ["x"], form: "factored" },
              answerText: `(${M.poly([a, p])})(${M.poly([1, q])})`, answerInput: `(${a}x + ${p})(x + ${q})`.replace(/\+ -/g, "- "),
              vals: { A, B, C, AC, u, v, p, q }, params: { a, p, q },
            };
          }
        }
        // level 3: GCF, then a difference of squares
        // s and k share no factor, so g really is the greatest common factor of g·s² and g·k²
        let g, k, s;
        do { g = r.int(2, 5); k = r.int(1, 9); s = r.int(1, 3); } while (P.gcd(s, k) !== 1);
        const A = g * s * s, C = g * k * k;
        return {
          prompt: `Factor completely: ${M.eq(M.poly([A, 0, -C]))}`,
          steps: [
            `Take out the greatest common factor ${n(g)}: ${n(g)}(${M.poly([s * s, 0, -k * k])}).`,
            `What is left is a difference of squares: ${M.poly([s * s, 0, -k * k])} = ${M.sup(`(${M.poly([s, 0])})`, 2)} − ${M.sup(n(k), 2)}.`,
            `${M.sup(M.v("u"), 2)} − ${M.sup(M.v("v"), 2)} = (${M.v("u")} − ${M.v("v")})(${M.v("u")} + ${M.v("v")}): ${n(g)}(${M.poly([s, -k])})(${M.poly([s, k])}).`,
          ],
          answer: { kind: "expr", expr: `${g}*(${s}x - ${k})*(${s}x + ${k})`, vars: ["x"], form: "factored" },
          answerText: `${n(g)}(${M.poly([s, -k])})(${M.poly([s, k])})`, answerInput: `${g}(${s}x - ${k})(${s}x + ${k})`,
          vals: { g, ss: s * s, kk: k * k, s, k }, params: { A, C },
        };
      },
    },

    // ---- A1.15 Quadratic formula --------------------------------------------------------------------------------
    "A1.11": {
      title: "The quadratic formula",
      generate(r, level) {
        if (level <= 2) {
          // rational roots: a(x − p)(x − q) with p, q integers (level 1) or a fraction (level 2)
          for (;;) {
            const a = level === 1 ? 1 : r.int(2, 4), p = r.int(-8, 8), qn = r.int(-9, 9);
            const q = level === 1 ? new Frac(qn) : new Frac(qn, a);
            if (level === 2 && q.isInt()) continue;
            if (q.eq(p)) continue;
            // a(x − p)(x − q) = a x² − a(p + q) x + a p q
            const A = a, B = new Frac(-a).mul(q.add(p)), C = new Frac(a).mul(q).mul(p);
            if (!B.isInt() || !C.isInt()) continue;
            const b = B.n, c = C.n, D = b * b - 4 * A * c, sD = Math.round(Math.sqrt(D));
            if (sD * sD !== D) continue;
            const r1 = new Frac(-b + sD, 2 * A), r2 = new Frac(-b - sD, 2 * A);
            return {
              prompt: `Solve ${M.eq(`${M.poly([A, b, c])} = 0`)} Enter both solutions, separated by a comma.`,
              graph: graph({ view: [-10, 10, -12, 12], items: [{ t: "fn", e: `${A}x^2 + (${b})x + (${c})` }] }),
              steps: [
                `Here ${M.v("a")} = ${n(A)}, ${M.v("b")} = ${n(b)}, ${M.v("c")} = ${n(c)}.`,
                `Discriminant: ${M.sup(M.v("b"), 2)} − 4${M.v("a")}${M.v("c")} = ${M.sup(np(b), 2)} − 4 · ${n(A)} · ${np(c)} = ${n(b * b)} − ${np(4 * A * c)} = ${n(D)}. Its square root is ${n(sD)}.`,
                `${x} = ${M.frac(`−${M.v("b")} ± ${M.sqrt("D")}`, `2${M.v("a")}`)} = ${M.frac(`${n(-b)} ± ${n(sD)}`, n(2 * A))}.`,
                `${x} = ${M.frac(n(-b + sD), n(2 * A))} = ${M.f(r1)} or ${x} = ${M.frac(n(-b - sD), n(2 * A))} = ${M.f(r2)}. They are where the parabola crosses the ${x}-axis.`,
              ],
              answer: { kind: "numbers", values: [r1.value, r2.value] }, answerText: `${x} = ${M.f(r1)} or ${x} = ${M.f(r2)}`,
              answerInput: `${typed(r1)}, ${typed(r2)}`,
              vals: { bb: b * b, ac4: 4 * A * c, D, sD, twoA: 2 * A, nb: -b, top1: -b + sD, top2: -b - sD, r1: fracVal(r1), r2: fracVal(r2) },
              params: { a: A, b, c }, consts: [4],
            };
          }
        }
        // level 3: irrational roots (−b ± √D) / 2a with D not a square
        for (;;) {
          const A = r.int(1, 3), b = r.int(-9, 9), c = r.int(-9, 9), D = b * b - 4 * A * c;
          if (D <= 0) continue;
          const sDi = Math.round(Math.sqrt(D));
          if (sDi * sDi === D) continue;
          let k = 1, s = D;
          for (let f = 2; f * f <= s; f++) while (s % (f * f) === 0) { s /= f * f; k *= f; }
          const g = P.gcd(P.gcd(Math.abs(b), k), 2 * A);
          const top = -b / g, kk = k / g, den = (2 * A) / g;
          const rootTxt = `${kk === 1 ? "" : n(kk)}${M.sqrt(n(s))}`;
          const ansTxt = den === 1 ? `${n(top)} ± ${rootTxt}` : M.frac(`${n(top)} ± ${rootTxt}`, n(den));
          const v1 = (-b + Math.sqrt(D)) / (2 * A), v2 = (-b - Math.sqrt(D)) / (2 * A);
          return {
            prompt: `Solve ${M.eq(`${M.poly([A, b, c])} = 0`)} Give exact answers, separated by a comma.`,
            steps: [
              `${M.v("a")} = ${n(A)}, ${M.v("b")} = ${n(b)}, ${M.v("c")} = ${n(c)}. Discriminant: ${M.sup(np(b), 2)} − 4 · ${n(A)} · ${np(c)} = ${n(D)}, which is positive but not a perfect square: two irrational roots.`,
              `Simplify ${M.sqrt(n(D))}${k > 1 ? ` = ${M.sqrt(`${n(k * k)} · ${n(s)}`)} = ${n(k)}${M.sqrt(n(s))}` : " (it does not simplify)"}.`,
              `${x} = ${M.frac(`${n(-b)} ± ${k > 1 ? n(k) : ""}${M.sqrt(n(s))}`, n(2 * A))}${g > 1 ? `; divide the top and bottom by ${n(g)}: ${ansTxt}` : ""}.`,
            ],
            answer: { kind: "numbers", values: [v1, v2] }, answerText: `${x} = ${ansTxt}`,
            answerInput: `(${-b} + ${k}sqrt(${s}))/${2 * A}, (${-b} - ${k}sqrt(${s}))/${2 * A}`,
            vals: { D, k, s, kk2: k * k, g, top, kk, den, twoA: 2 * A, nb: -b }, params: { a: A, b, c }, consts: [4],
          };
        }
      },
    },

    // ---- A1.16 Vertex form -----------------------------------------------------------------------------------
    "A1.12": {
      title: "Finding the vertex",
      generate(r, level) {
        // level 1: a = 1; level 2: a = ±2, ±3; level 3: a fractional vertex (b odd, a = ±1)
        const a = level === 1 ? 1 : level === 2 ? r.pick([-3, -2, 2, 3]) : r.pick([-1, 1]);
        const h = level === 3 ? new Frac(2 * r.int(-4, 3) + 1, 2) : new Frac(r.int(-5, 5));
        const k = level === 3 ? new Frac(r.int(-12, 12), 4) : new Frac(r.int(-8, 8));
        // y = a(x − h)² + k = a x² − 2ah x + a h² + k
        const b = h.mul(-2 * a), c = h.mul(h).mul(a).add(k);
        if (!b.isInt() || !c.isInt()) return this.generate(r, level);
        const ah = h.mul(h).mul(a), bh = b.mul(h);
        const sq = level === 3 ? `${M.sup(M.f(h, { paren: true }), 2)} = ${M.f(h.mul(h))}` : "";
        const vf = `${y} = ${a === 1 ? "" : a === -1 ? "−" : n(a)}${M.sup(`(${M.poly([1, h.neg()])})`, 2)}${k.n === 0 ? "" : M.term(k, "")}`;
        return {
          prompt: `Find the vertex of ${M.eq(`${y} = ${M.poly([a, b, c])}`)} Enter it as a point.`,
          graph: graph({ view: [-10, 10, -14, 14], items: [{ t: "fn", e: `${a}x^2 + (${b.n})x + (${c.n})` }] }),
          steps: [
            `The vertex's ${x} is ${M.frac(`−${M.v("b")}`, `2${M.v("a")}`)} = ${M.frac(n(-b.n), `2 · ${np(a)}`)} = ${M.frac(n(-b.n), n(2 * a))} = ${M.f(h)}.`,
            `Put it back in: ${y} = ${n(a)} · ${M.sup(M.f(h, { paren: true }), 2)}${M.term(b, ` · ${M.f(h, { paren: true })}`)}${M.term(c, "")}${sq ? ` (where ${sq})` : ""} = ${M.f(ah)}${M.term(bh, "")}${M.term(c, "")} = ${M.f(k)}.`,
            `The vertex is (${M.f(h)}, ${M.f(k)}); the parabola opens ${a > 0 ? "up, so it is the lowest point" : "down, so it is the highest point"}. In vertex form, ${vf}.`,
          ],
          answer: { kind: "point", value: [h.value, k.value] }, answerText: `(${M.f(h)}, ${M.f(k)})`, answerInput: `(${typed(h)}, ${typed(k)})`,
          vals: { nb: -b.n, twoA: 2 * a, h: fracVal(h), hh: fracVal(h.mul(h)), ah: fracVal(ah), bh: fracVal(bh), k: fracVal(k) }, params: { a, b: b.n, c: c.n },
        };
      },
    },

    // ---- A1.17 Quadratic inequalities ---------------------------------------------------------------------------
    "A1.quadineq": {
      title: "Quadratic inequalities",
      generate(r, level) {
        const p = r.int(-7, 6), q = r.int(p + 1, p + (level === 1 ? 6 : 10));
        // level 3 opens down: −(x − p)(x − q)
        const s = level === 3 ? -1 : 1, B = s * -(p + q), C = s * p * q;
        const between = level === 1 ? true : level === 2 ? false : r.chance(0.5) ;
        // f < 0 between the roots when it opens up; for level 3 we ask f > 0, which (opening down) is between
        const rel = level === 3 ? (between ? "&gt;" : "&lt;") : between ? "&lt;" : "&gt;";
        const fx = M.poly([s, B, C]);
        const factored = `${s < 0 ? "−" : ""}${fac(p)}${fac(q)}`;
        const shape = s > 0 ? `opens up (the ${M.sup(x, 2)} coefficient is positive), so it is below the ${x}-axis between the roots and above it outside them`
          : `opens down (the ${M.sup(x, 2)} coefficient is negative), so it is above the ${x}-axis between the roots and below it outside them`;
        const where = (rel === "&lt;") === (s > 0) ? "between" : "outside";
        const inside = where === "between";
        return {
          prompt: inside
            ? `Solve ${M.eq(`${fx} ${rel} 0`)} The solution is ${M.v("a")} &lt; ${x} &lt; ${M.v("b")}. Enter ${M.v("a")}, ${M.v("b")}.`
            : `Solve ${M.eq(`${fx} ${rel} 0`)} The solution is ${x} &lt; ${M.v("a")} or ${x} &gt; ${M.v("b")}. Enter ${M.v("a")}, ${M.v("b")}.`,
          graph: graph({ view: [Math.min(-2, p - 3), Math.max(2, q + 3), -Math.max(4, ((q - p) * (q - p)) / 4 + 2), Math.max(4, ((q - p) * (q - p)) / 4 + 2)],
            items: [{ t: "fn", e: `${s}*x^2 + (${B})x + (${C})` }, { t: "pt", x: p, y: 0 }, { t: "pt", x: q, y: 0 }] }),
          steps: [
            `Factor: ${fx} = ${factored}. The roots are ${x} = ${n(p)} and ${x} = ${n(q)}.`,
            `The parabola ${shape}.`,
            `${fx} ${rel} 0 where the graph is ${rel === "&lt;" ? "below" : "above"} the axis: ${inside ? `${n(p)} &lt; ${x} &lt; ${n(q)}` : `${x} &lt; ${n(p)} or ${x} &gt; ${n(q)}`}.`,
          ],
          answer: { kind: "numbers", values: [p, q], ordered: true }, answerText: inside ? `${n(p)} &lt; ${x} &lt; ${n(q)}` : `${x} &lt; ${n(p)} or ${x} &gt; ${n(q)}`,
          answerInput: `${p}, ${q}`, vals: { p, q }, params: { s, B, C, greater: rel === "&gt;" ? 1 : 0, inside: inside ? 1 : 0 },
        };
      },
    },

    // ---- A1.18 Direct and inverse variation -----------------------------------------------------------------------
    "A1.13": {
      title: "Direct and inverse variation",
      generate(r, level) {
        if (level === 1) {
          const k = r.int(2, 9), x1 = r.int(2, 9), x2 = r.int(3, 15), y1 = k * x1, y2 = k * x2;
          return {
            prompt: `${y} varies directly with ${x}. When ${x} = ${n(x1)}, ${y} = ${n(y1)}. Find ${y} when ${x} = ${n(x2)}.`,
            steps: [
              `Direct variation: ${y} = ${M.v("k")}${x}. Find ${M.v("k")}: ${M.v("k")} = ${M.frac(n(y1), n(x1))} = ${n(k)}.`,
              `${y} = ${n(k)} · ${n(x2)} = ${n(y2)}.`,
            ],
            answer: { kind: "number", value: y2 }, answerText: n(y2), answerInput: String(y2), vals: { k, y2 }, params: { x1, y1, x2 },
          };
        }
        if (level === 2) {
          // inverse: workers and days
          const days1 = r.pick([4, 6, 8, 10, 12, 15]), w1 = r.pick([2, 3, 4, 5, 6]), kk = days1 * w1;
          const w2opts = [2, 3, 4, 5, 6, 8, 10, 12].filter((w) => kk % w === 0 && w !== w1);
          const w2 = r.pick(w2opts), days2 = kk / w2;
          return {
            prompt: `It takes ${n(w1)} painters ${n(days1)} days to paint a building. Working at the same rate, how many days would ${n(w2)} painters take?`,
            steps: [
              `More painters means fewer days: days vary inversely with painters, days = ${M.frac(M.v("k"), "painters")}.`,
              `${M.v("k")} = painters × days = ${n(w1)} × ${n(days1)} = ${n(kk)} painter-days of work.`,
              `Days = ${M.frac(n(kk), n(w2))} = ${n(days2)}.`,
            ],
            answer: { kind: "number", value: days2 }, answerText: `${n(days2)} days`, answerInput: String(days2), vals: { kk, days2 }, params: { w1, days1, w2 },
          };
        }
        // joint: z = k x y
        const k = r.int(2, 6), x1 = r.int(2, 6), y1 = r.int(2, 6), x2 = r.int(2, 9), y2 = r.int(2, 9);
        const z1 = k * x1 * y1, z2 = k * x2 * y2;
        return {
          prompt: `${M.v("z")} varies jointly with ${x} and ${y}. When ${x} = ${n(x1)} and ${y} = ${n(y1)}, ${M.v("z")} = ${n(z1)}. Find ${M.v("z")} when ${x} = ${n(x2)} and ${y} = ${n(y2)}.`,
          steps: [
            `Joint variation: ${M.v("z")} = ${M.v("k")}${x}${y}. So ${M.v("k")} = ${M.frac(n(z1), `${n(x1)} · ${n(y1)}`)} = ${M.frac(n(z1), n(x1 * y1))} = ${n(k)}.`,
            `${M.v("z")} = ${n(k)} · ${n(x2)} · ${n(y2)} = ${n(z2)}.`,
          ],
          answer: { kind: "number", value: z2 }, answerText: n(z2), answerInput: String(z2), vals: { xy: x1 * y1, k, z2 }, params: { x1, y1, z1, x2, y2 },
        };
      },
    },

    // ---- A1.19 Percent and proportion ---------------------------------------------------------------------------------
    "A1.14": {
      title: "Percent change and proportions",
      generate(r, level) {
        if (level === 1) {
          const pct = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]), whole = r.pick([20, 40, 60, 80, 120, 200, 240, 300]);
          const part = (pct * whole) / 100;
          return {
            prompt: `What is ${n(pct)}% of ${n(whole)}?`,
            steps: [
              `Percent means per hundred: ${n(pct)}% = ${M.frac(n(pct), "100")}.`,
              `${M.frac(n(pct), "100")} × ${n(whole)} = ${M.frac(n(pct * whole), "100")} = ${n(part)}.`,
            ],
            answer: { kind: "number", value: part }, answerText: n(part), answerInput: String(part), vals: { pw: pct * whole, part }, params: { pct, whole }, consts: [100],
          };
        }
        if (level === 2) {
          const old = r.pick([40, 50, 60, 80, 120, 150, 200, 250, 400]), pct = r.pick([5, 10, 15, 20, 25, 30, 40]) * r.sign();
          const nw = old + (old * pct) / 100, change = nw - old;
          return {
            prompt: `A price changes from ${P.money(old)} to ${P.money(nw)}. What is the percent change? (Use a negative number for a decrease.)`,
            steps: [
              `Change = new − old = ${n(nw)} − ${n(old)} = ${n(change)}.`,
              `Percent change = ${M.frac("change", "old")} × 100% = ${M.frac(n(change), n(old))} × 100% = ${n(pct)}%.`,
            ],
            answer: { kind: "number", value: pct }, answerText: `${n(pct)}%`, answerInput: String(pct), vals: { change, pct, nw }, params: { old, nw }, consts: [100],
          };
        }
        // successive changes
        const p1 = r.pick([10, 20, 25, 50]), p2 = r.pick([10, 20, 25, 40, 50]), price = r.pick([80, 100, 160, 200, 400]);
        const after1 = (price * (100 + p1)) / 100, after2 = (after1 * (100 - p2)) / 100, net = ((after2 - price) / price) * 100;
        return {
          prompt: `A ${P.money(price)} jacket's price rises ${n(p1)}%, then the new price is cut ${n(p2)}%. What is the final price?`,
          steps: [
            `A ${n(p1)}% rise multiplies by ${n(1 + p1 / 100)}: ${n(price)} × ${n(1 + p1 / 100)} = ${n(after1)}.`,
            `A ${n(p2)}% cut multiplies by ${n(1 - p2 / 100)}: ${n(after1)} × ${n(1 - p2 / 100)} = ${n(after2)}.`,
            `The final price is ${P.money(after2)}${net === 0 ? ", back where it started" : `, a net change of ${n(net)}%: percents of different bases do not cancel`}.`,
          ],
          answer: { kind: "number", value: after2 }, answerText: P.money(after2), answerInput: String(after2),
          vals: { m1: 1 + p1 / 100, m2: 1 - p2 / 100, after1, after2, net }, params: { price, p1, p2 },
        };
      },
    },

    // ---- A1.20 Linear inequalities -------------------------------------------------------------------------------------
    "A1.15": {
      title: "Solving linear inequalities",
      generate(r, level) {
        const ops = ["&lt;", "≤", "&gt;", "≥"], oi = r.int(0, 3);
        const flipOf = (i) => [2, 3, 0, 1][i];
        if (level <= 2) {
          const a = level === 1 ? r.int(2, 9) : -r.int(2, 9), b = r.int(-12, 12), sol = r.int(-8, 8);
          const c = a * sol + b, flip = a < 0, fi = flip ? flipOf(oi) : oi;
          const options = ops.map((o) => `${x} ${o} ${n(sol)}`);
          return {
            prompt: `Solve ${M.eq(`${M.poly([a, b])} ${ops[oi]} ${n(c)}`)}`,
            steps: [
              b === 0 ? `There is no number to move: ${kv(a)} ${ops[oi]} ${n(c)}.` : `${b > 0 ? "Subtract" : "Add"} ${n(Math.abs(b))} on both sides: ${kv(a)} ${ops[oi]} ${n(c - b)}.`,
              flip ? `Divide by ${n(a)}. Dividing by a negative number reverses the inequality: ${x} ${ops[fi]} ${M.frac(n(c - b), n(a))} = ${n(sol)}.`
                : `Divide by ${n(a)} (positive, so the sign stays): ${x} ${ops[fi]} ${n(sol)}.`,
            ],
            answer: { kind: "choice", options, index: fi }, answerText: options[fi],
            vals: { cb: c - b, sol, fi }, params: { a, b, c, oi, level },
          };
        }
        // level 3: a(x − b) op c x + d, collect terms (the x-coefficient ends up negative half the time)
        for (;;) {
          const a = r.nonzero(-6, 6), b = r.int(-5, 5), cc = r.intExcept(-6, 6, a), sol = r.int(-8, 8);
          const k = a - cc;  // after collecting: k x op rhs
          if (k === 0) continue;
          const ab = a * b, d = k * sol - ab;   // a x − ab − c x op d  →  k x op d + ab = k·sol
          const rhs = d + ab, flip = k < 0, fi = flip ? flipOf(oi) : oi;
          const options = ops.map((o) => `${x} ${o} ${n(sol)}`);
          return {
            prompt: `Solve ${M.eq(`${n(a)}(${M.poly([1, -b])}) ${ops[oi]} ${M.poly([cc, d])}`)}`,
            steps: [
              `Distribute: ${M.poly([a, -ab])} ${ops[oi]} ${M.poly([cc, d])}.`,
              `Subtract ${kv(cc)} from both sides and add ${np(ab)}: ${kv(a)} − ${np(cc)}${x} ${ops[oi]} ${n(d)} + ${np(ab)}, so ${kv(k)} ${ops[oi]} ${n(rhs)}.`,
              flip ? `Divide by ${n(k)}, a negative number, so the inequality reverses: ${x} ${ops[fi]} ${M.frac(n(rhs), n(k))} = ${n(sol)}.`
                : `Divide by ${n(k)} (positive, so the sign stays): ${x} ${ops[fi]} ${n(sol)}.`,
            ],
            answer: { kind: "choice", options, index: fi }, answerText: options[fi],
            vals: { ab, k, rhs, sol, fi, negab: -ab }, params: { a, b, cc, d, oi, level },
          };
        }
      },
    },

    // ---- A1.21 Sets: inclusion–exclusion --------------------------------------------------------------------------------
    "A1.16": {
      title: "Sets and inclusion–exclusion",
      generate(r, level) {
        const both = r.int(3, 20), onlyA = r.int(4, 30), onlyB = r.int(4, 30), neither = r.int(2, 20);
        const A = onlyA + both, B = onlyB + both, U = A + B - both + neither, union = A + B - both;
        const [s1, s2] = r.pick([["play soccer", "play basketball"], ["take French", "take Spanish"], ["own a cat", "own a dog"], ["read fiction", "read news"]]);
        if (level === 1) {
          return {
            prompt: `In a group, ${n(A)} people ${s1}, ${n(B)} ${s2}, and ${n(both)} do both. How many do at least one?`,
            steps: [`Inclusion–exclusion: |A ∪ B| = |A| + |B| − |A ∩ B|. The ${n(both)} who do both were counted twice.`, `${n(A)} + ${n(B)} − ${n(both)} = ${n(union)}.`],
            answer: { kind: "number", value: union }, answerText: n(union), answerInput: String(union), vals: { union }, params: { A, B, both },
          };
        }
        if (level === 2) {
          return {
            prompt: `Of ${n(union)} people who ${s1} or ${s2} (or both), ${n(A)} ${s1} and ${n(B)} ${s2}. How many do both?`,
            steps: [`|A ∪ B| = |A| + |B| − |A ∩ B|, so |A ∩ B| = |A| + |B| − |A ∪ B|.`, `${n(A)} + ${n(B)} − ${n(union)} = ${n(both)}.`],
            answer: { kind: "number", value: both }, answerText: n(both), answerInput: String(both), vals: { both }, params: { A, B, union },
          };
        }
        return {
          prompt: `A survey of ${n(U)} people: ${n(A)} ${s1}, ${n(B)} ${s2}, ${n(both)} do both. How many do neither?`,
          steps: [
            `People who do at least one: ${n(A)} + ${n(B)} − ${n(both)} = ${n(union)}.`,
            `Neither is the complement: ${n(U)} − ${n(union)} = ${n(neither)}.`,
          ],
          answer: { kind: "number", value: neither }, answerText: n(neither), answerInput: String(neither), vals: { union, neither }, params: { U, A, B, both },
        };
      },
    },
  });
})(Practice);
