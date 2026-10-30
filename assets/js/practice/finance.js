/*
 * practice/finance.js — Finance practice problems (chapter 17), one generator per concept key.
 *
 * Each generator(r, level) draws realistic numbers for the level (1 easy, 2 medium, 3 hard), builds
 * every number it shows from values it computes and reports in `vals`, and
 * tools/practice/verifiers/finance.py recomputes each of them independently (exact fractions and
 * 40-digit mpmath). Compounding needs a calculator, so those prompts say to round, and the steps show
 * each intermediate value (the growth factor, its power) to enough digits that the next step, done
 * with the number as shown, gives the same rounded result.
 *
 * Every concept in the chapter has problems; none is skipped. Formulas that only exist to be
 * computed numerically (the Black–Scholes PDE, implied volatility, a mean–variance optimizer over
 * many assets, the general n-step tree) are covered through their solvable special cases.
 */
(function (P) {
  "use strict";
  const { Frac, M, graph } = P;
  /** Equal up to float noise (1e-12 relative): "exact" for display, so 6.0225752122 is never shown as = 6.02257521. */
  const near = (a, b) => Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b));
  /** A number to dp decimals: exact values as they are (0.5, 1.1664), rounded ones with all dp digits (35.00). */
  /** A rounding that sits on (or within float noise of) a half: the reader could round either way. */
  const tie = (x, dp) => { const s = Math.abs(x) * Math.pow(10, dp); return Math.abs(s - Math.floor(s) - 0.5) < 1e-6; };
  /** Decimals to show: dp, or more when x sits exactly on a half at dp (0.125 is shown whole, never as 0.13). */
  const dpFor = (x, dp) => { let d = dp; while (tie(x, d) && d < dp + 6) d++; return d; };
  const fmt = (x, dp = 4) => {
    dp = dpFor(x, dp);
    return near(P.round(x, dp), x) ? P.fmt(x, dp) : P.fmt(x, dp).replace(/^(−?\d+)(?:\.(\d*))?$/, (_, w, f = "") => `${w}.${f.padEnd(dp, "0")}`);
  };
  const iv = M.v;
  const n = (x, dp = 4) => fmt(x, dp);
  const np = (x, dp = 4) => { const t = fmt(x, dp); return t.startsWith("−") ? `(${t})` : t; };
  /** "=" when x shows exactly at dp decimals, else "≈". */
  const rel = (x, dp) => (near(P.round(x, dpFor(x, dp)), x) ? "=" : "≈");
  const eqn = (x, dp = 4) => `${rel(x, dp)} ${fmt(x, dp)}`;
  /** Dollars: whole amounts without cents ($12,100), others to the cent ($1,628.89). */
  const cash = (x) => (near(x, Math.round(x)) ? (x < -1e-9 ? "−$" : "$") + P.grouped(Math.abs(Math.round(x))) : P.money(x));
  /** Dollars to the cent, or whole dollars when exact. */
  const mon = (x) => (near(P.round(x, 2), x) ? cash(x) : P.money(x));
  const eqm = (x) => (near(P.round(x, 2), x) ? `= ${cash(x)}` : `≈ ${P.money(x)}`);
  const pc = (x, dp = 2) => `${fmt(x, dp)}%`;
  const eqp = (x, dp = 2) => `${rel(x, dp)} ${pc(x, dp)}`;
  const typed = (x, dp = 2) => String(P.round(x, dp));
  /** Fewest decimals (at least `min`) to show factor f so that mult × f-as-shown has the same cents as mult × f. */
  function digits(f, mult, min = 6) {
    for (let d = min; d <= 12; d++) if (P.round(mult * P.round(f, d), 2) === P.round(mult * f, 2)) return d;
    return 12;
  }
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  /** Exactly dp decimals, as a table prints them: N(0.10) = 0.4960. */
  const fx = (x, dp) => P.round(x, dp).toFixed(dp).replace(/^-/, "−");
  /** The article for a number read aloud: "an 8%", "an 11-year", "a 6%". */
  const an = (x, cap = false) => {
    const d = String(Math.floor(Math.abs(x))), v = d[0] === "8" || (d.length % 3 === 2 && /^1[18]/.test(d));
    return (cap ? (v ? "An" : "A") : (v ? "an" : "a"));
  };
  /** A number with thousands separators when whole (1,329), else as n() shows it. */
  const gn = (x) => (near(x, Math.round(x)) ? P.grouped(x) : n(x));
  /** Rounded parts must add up to the rounded total, so the shown addition is right. */
  const addsUp = (parts, total, dp = 2) => near(P.round(sum(parts.map((x) => P.round(x, dp))), dp), P.round(total, dp));
  const sup = M.sup;
  const pow = (base, e) => sup(base, e);
  const fr = (a, b) => M.frac(a, b);
  const fracVal = (q) => ({ n: q.n, d: q.d });
  /** 1st, 2nd, 3rd, 4th, 11th, 12th, 13th, 21st … */
  const ord = (k) => { const t = k % 100, u = k % 10; return `${k}${t >= 11 && t <= 13 ? "th" : u === 1 ? "st" : u === 2 ? "nd" : u === 3 ? "rd" : "th"}`; };
  /** Standard normal CDF via the error function's Taylor series (accurate to ~1e-14 for |z| ≤ 4). */
  function erf(x) {
    let term = x, s = x;
    const x2 = x * x;
    for (let k = 1; k < 300; k++) { term *= -x2 / k; const t = term / (2 * k + 1); s += t; if (Math.abs(t) < 1e-17) break; }
    return (2 / Math.sqrt(Math.PI)) * s;
  }
  const Phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));
  const phi = (z) => Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
  /** A table value N(z), to 4 decimals (z itself already rounded to 2). */
  const Ntab = (z) => P.round(Phi(z), 4);

  /** A cash-flow timeline: flows [[t, amount]], arrows up for inflows and down for outflows. */
  function timeline(flows, T, { unit = "year", mark } = {}) {
    const items = [{ t: "seg", a: [0, 0], b: [T, 0], role: "muted" }];
    for (let k = 0; k <= T; k++) {
      items.push({ t: "seg", a: [k, -0.1], b: [k, 0.1], role: "muted" });
      items.push({ t: "text", x: k, y: -0.45, s: String(k) });
    }
    flows.forEach(([t, a]) => {
      const up = a >= 0;
      items.push({ t: "vec", a: [t, 0], b: [t, up ? 0.7 : -0.7], role: up ? "primary" : "secondary" });
      items.push({ t: "text", x: t, y: up ? 0.95 : -1.05, s: mon(a) });
    });
    if (mark) items.push({ t: "text", x: mark[0], y: 0.95, s: mark[1], role: "highlight" });
    items.push({ t: "text", x: T / 2, y: -1.45, s: `${unit}s from today`, role: "muted" });
    return graph({ view: [-0.8, T + 0.8, -1.7, 1.3], axes: false, grid: false, items });
  }

  const COMP = { 1: "annually", 2: "semiannually", 4: "quarterly", 12: "monthly", 365: "daily" };
  const PER = { 1: "year", 2: "half-year", 4: "quarter", 12: "month", 365: "day" };

  const DEFS = {
    // ---- FN.1 Simple vs. compound interest --------------------------------------------------------
    "FN.1": {
      title: "Simple and compound interest",
      generate(r, level) {
        if (level === 1) {
          const P0 = r.int(4, 80) * 250, rp = r.pick([2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 8]), t = r.int(2, 8);
          const rate = rp / 100, I = (P0 * rp * t) / 100, A = P0 + I, ask = r.pick(["interest", "balance"]);
          const steps = [
            `Write the rate as a decimal: ${iv("r")} = ${pc(rp)} = ${n(rate)}.`,
            `Simple interest is paid on the principal only: ${iv("I")} = ${iv("P")}${iv("r")}${iv("t")} = ${cash(P0)} × ${n(rate)} × ${n(t)} = ${cash(I)}.`,
          ];
          if (ask === "balance") steps.push(`The balance is the principal plus the interest: ${iv("A")} = ${cash(P0)} + ${cash(I)} = ${cash(A)}.`);
          const ans = ask === "balance" ? A : I;
          return {
            prompt: `You deposit ${cash(P0)} in an account that pays ${pc(rp)} simple interest per year. ${ask === "balance" ? `What is the balance after ${n(t)} years?` : `How much interest has it earned after ${n(t)} years?`} Answer in dollars.`,
            steps, answer: { kind: "number", value: ans, dp: 2 }, answerText: cash(ans), answerInput: typed(ans),
            vals: { rate, I, A }, params: { P0, rp, t, ask },
          };
        }
        if (level === 2) {
          for (;;) {
            const [rp, m, t] = r.pick([
              [r.pick([4, 5, 6, 8, 10, 20]), 1, r.pick([2, 3])],
              [r.pick([4, 6, 8, 10]), 2, r.pick([1, 2])],
              [r.pick([4, 8]), 4, 1],
            ]);
            const P0 = r.int(2, 40) * 500, ask = r.pick(["balance", "extra"]);
            const i = rp / 100 / m, N = m * t, g = 1 + i;
            const pows = [g];
            for (let k = 2; k <= N; k++) pows.push(pows[k - 2] * g);
            const fac = pows[N - 1], A = P0 * fac;
            const simpleF = 1 + (rp / 100) * t, As = P0 * simpleF, extra = A - As;
            if (tie(A, 2) || N < 2) continue;
            const steps = [
              m === 1
                ? `Interest is credited once a year, so the rate per period is ${iv("r")} = ${n(i)} and there are ${iv("t")} = ${n(N)} periods.`
                : `Rate per period: ${M.frac(iv("r"), iv("n"))} = ${M.frac(n(rp / 100), n(m))} = ${n(i)}. Number of periods: ${iv("n")}${iv("t")} = ${n(m)} × ${n(t)} = ${n(N)}.`,
              `Growth factor, one multiplication at a time: ${pows.slice(1).map((pw, k) => `${pow(n(g), k + 2)} = ${fmt(pw, 10)}`).join(", ")}.`,
              `Balance: ${iv("A")} = ${cash(P0)} × ${fmt(fac, 10)} ${eqm(A)}.`,
            ];
            if (ask === "extra") steps.push(`Simple interest would give ${cash(P0)} × (1 + ${n(rp / 100)} × ${n(t)}) = ${cash(P0)} × ${n(simpleF)} = ${cash(As)}. Compounding earns ${mon(A)} − ${cash(As)} ${eqm(extra)} more.`);
            const ans = ask === "extra" ? extra : A;
            return {
              prompt: `${cash(P0)} is invested at ${pc(rp)} a year compounded ${COMP[m]}. ${ask === "extra"
                ? `After ${n(t)} year${t > 1 ? "s" : ""}, how much more is in the account than ${pc(rp)} simple interest would have produced?`
                : `What is the balance after ${n(t)} year${t > 1 ? "s" : ""}?`} Round to the nearest cent.`,
              steps, answer: { kind: "number", value: ans, dp: 2 }, answerText: P.money(ans), answerInput: typed(ans),
              vals: { i, N, pows, ks: pows.map((_, k) => k + 1), A, simpleF, As, extra, r: rp / 100 }, params: { P0, rp, m, t, ask },
            };
          }
        }
        // level 3: solve for the time, solve for the rate, or continuous vs annual compounding
        const kind = r.pick(["time", "rate", "cont"]);
        if (kind === "time") {
          for (;;) {
            const [m, rp] = r.pick([[1, r.pick([3, 4, 5, 6, 7, 8, 9])], [4, r.pick([4, 6, 8, 10])], [12, r.pick([3, 4.8, 6, 9, 12])]]);
            const mult = r.pick([1.5, 2, 2.5, 3]), P0 = r.int(2, 40) * 1000, A = P0 * mult;
            const i = rp / 100 / m, lnM = Math.log(mult), lnG = Math.log(1 + i), t = lnM / (m * lnG);
            const mlnG = m * lnG;
            const tShown = P.round(lnM, 6) / (m * P.round(lnG, 8));
            if (P.round(tShown, 2) !== P.round(t, 2) || tie(t, 2)) continue;
            const T = Math.ceil(t * 1.2);
            const nt = m === 1 ? iv("t") : `${n(m)}${iv("t")}`;
            return {
              prompt: `How many years will it take ${cash(P0)} to grow to ${cash(A)} at ${pc(rp)} a year compounded ${COMP[m]}? Solve the compound-interest formula for ${iv("t")} and round to 2 decimal places.`,
              graph: graph({
                view: [-0.18 * T, T, -0.08 * A * 1.15, A * 1.15],
                items: [
                  { t: "fn", e: `${P0}*(1+${i})^(${m}*x)`, role: "primary" },
                  { t: "hline", y: A, role: "highlight" },
                  { t: "text", x: T * 0.2, y: A * 1.06, s: `goal ${cash(A)}` },
                ],
              }),
              steps: [
                `Set ${iv("A")} = ${iv("P")}${m === 1 ? pow(`(1 + ${iv("r")})`, iv("t")) : pow(`(1 + ${iv("r")}/${iv("n")})`, `${iv("n")}${iv("t")}`)} and divide by ${iv("P")}: ${pow(`(1 + ${n(i, 6)})`, nt)} = ${M.frac(cash(A), cash(P0))} = ${n(mult)}.`,
                `Take natural logs: ${nt} · ln(${n(1 + i, 6)}) = ln ${n(mult)}.`,
                `With a calculator: ln ${n(mult)} ${eqn(lnM, 6)} and ln(${n(1 + i, 6)}) ${eqn(lnG, 8)}${m > 1 ? `, so ${n(m)} · ln(${n(1 + i, 6)}) ${eqn(mlnG, 8)}` : ""}.`,
                `${iv("t")} = ${M.frac(fmt(lnM, 6), fmt(m > 1 ? mlnG : lnG, 8))} ${eqn(t, 2)} years.`,
              ],
              answer: { kind: "number", value: t, dp: 2 }, answerText: `${fmt(t, 2)} years`, answerInput: typed(t),
              vals: { A, i, g: 1 + i, mult, lnM, lnG, mlnG, t }, params: { P0, rp, m, mult, kind },
            };
          }
        }
        if (kind === "rate") {
          for (;;) {
            const P0 = r.int(4, 60) * 500, t = r.int(3, 12), gr = r.int(25, 110) / 1000;
            const A = Math.round((P0 * Math.pow(1 + gr, t)) / 10) * 10;
            const ratio = A / P0, root = Math.pow(ratio, 1 / t), rr = (root - 1) * 100;
            if (P.round((P.round(root, 6) - 1) * 100, 2) !== P.round(rr, 2) || tie(rr, 2)) continue;
            return {
              prompt: `An investment of ${cash(P0)} grew to ${cash(A)} in ${n(t)} years with annual compounding. What annual interest rate did it earn? Give a percent rounded to 2 decimal places.`,
              steps: [
                `Divide ${iv("A")} = ${iv("P")}${pow(`(1 + ${iv("r")})`, iv("t"))} by ${iv("P")}: ${pow(`(1 + ${iv("r")})`, n(t))} = ${M.frac(cash(A), cash(P0))} ${eqn(ratio, 6)}.`,
                `Take the ${ord(t)} root: 1 + ${iv("r")} = ${pow(fmt(ratio, 6), `1/${n(t)}`)} ${eqn(root, 6)}.`,
                `${iv("r")} ${eqn(root - 1, 6)} ${eqp(rr)}.`,
              ],
              answer: { kind: "number", value: rr, dp: 2 }, answerText: pc(rr), answerInput: typed(rr),
              vals: { ratio, root, rdec: root - 1, rr }, params: { P0, A, t, kind },
            };
          }
        }
        for (;;) {
          const P0 = r.int(4, 100) * 500, rp = r.pick([3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8]), t = r.int(5, 25);
          const rate = rp / 100, rt = rate * t, ec = Math.exp(rt), ga = Math.pow(1 + rate, t);
          const Ac = P0 * ec, Aa = P0 * ga, diff = Ac - Aa;
          const dC = digits(ec, P0), dA = digits(ga, P0);
          if (P.round(P.round(Ac, 2) - P.round(Aa, 2), 2) !== P.round(diff, 2) || tie(Ac, 2) || tie(Aa, 2)) continue;
          return {
            prompt: `${cash(P0)} is invested for ${n(t)} years at ${pc(rp)}. How much more does it grow to if interest compounds continuously instead of once a year? Round to the nearest cent.`,
            steps: [
              `Continuous compounding: ${iv("A")} = ${iv("P")}${pow("e", `${iv("r")}${iv("t")}`)}, with ${iv("r")}${iv("t")} = ${n(rate)} × ${n(t)} = ${n(rt)}. ${pow("e", n(rt))} ${eqn(ec, dC)}, so ${iv("A")} = ${cash(P0)} × ${fmt(ec, dC)} ${eqm(Ac)}.`,
              `Annual compounding: ${iv("A")} = ${iv("P")}${pow(`(1 + ${iv("r")})`, iv("t"))} = ${cash(P0)} × ${pow(n(1 + rate), n(t))}. ${pow(n(1 + rate), n(t))} ${eqn(ga, dA)}, so ${iv("A")} ${eqm(Aa)}.`,
              `Difference: ${mon(Ac)} − ${mon(Aa)} ${eqm(diff)}. Continuous compounding is the most a nominal rate can grow to.`,
            ],
            answer: { kind: "number", value: diff, dp: 2 }, answerText: P.money(diff), answerInput: typed(diff),
            vals: { rate, a: 1 + rate, rt, ec, ga, Ac, Aa, diff }, params: { P0, rp, t, kind },
          };
        }
      },
    },

    // ---- FN.2 APR vs. effective annual rate ---------------------------------------------------------
    "FN.2": {
      title: "APR and the effective annual rate",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const [m, apr, what] = r.pick([
              [12, r.pick([6, 9, 12, 18, 24]), r.pick(["A credit card charges", "A store card charges", "A personal loan charges"])],
              [4, r.pick([4, 6, 8, 10, 12]), r.pick(["A savings account pays", "A certificate of deposit pays"])],
              [2, r.pick([4, 6, 8, 10, 12]), r.pick(["A bond fund pays", "A savings bond pays"])],
            ]);
            const a = apr / 100, i = a / m, fac = Math.pow(1 + i, m), ear = fac - 1, earPct = ear * 100;
            if (tie(earPct, 2)) continue;
            return {
              prompt: `${what} ${pc(apr)} APR compounded ${COMP[m]}. What is the effective annual rate? Give a percent rounded to 2 decimal places.`,
              steps: [
                `Rate per ${PER[m]}: ${M.frac("APR", iv("n"))} = ${M.frac(n(a), n(m))} = ${n(i, 6)}.`,
                `Compound it over the ${n(m)} periods of one year: ${pow(`(1 + ${n(i, 6)})`, n(m))} ${eqn(fac, 8)}.`,
                `EAR = ${fmt(fac, 8)} − 1 ${eqn(ear, 8)} ${eqp(earPct)}. It is above the APR because interest earns interest within the year.`,
              ],
              answer: { kind: "number", value: earPct, dp: 2 }, answerText: pc(earPct), answerInput: typed(earPct),
              vals: { a, i, fac, ear, earPct }, params: { m, apr },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const freqs = r.sample([1, 2, 4, 12, 365, 0], 2);
            const a1 = r.int(70, 130) / 20, a2 = P.round(a1 + r.pick([-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15]), 2);
            const ears = [[a1, freqs[0]], [a2, freqs[1]]].map(([a, m]) => (m === 0 ? Math.exp(a / 100) - 1 : Math.pow(1 + a / 100 / m, m) - 1) * 100);
            if (Math.abs(ears[0] - ears[1]) < 0.01 || Math.abs(P.round(ears[0], 2) - P.round(ears[1], 2)) < 0.01 || ears.some((e) => tie(e, 2))) continue;
            const best = ears[0] > ears[1] ? 0 : 1, names = ["Bank A", "Bank B"];
            const desc = (a, m) => `${pc(a)} compounded ${m === 0 ? "continuously" : COMP[m]}`;
            const work = (a, m, e) => (m === 1 ? `compounded once a year, the EAR is the APR itself, ${pc(e)}` : m === 0
              ? `${pow("e", n(a / 100))} − 1 ${eqn(e / 100, 6)} ${eqp(e)}`
              : `${pow(`(1 + ${M.frac(n(a / 100), n(m))})`, n(m))} − 1 ${eqn(e / 100, 6)} ${eqp(e)}`);
            return {
              prompt: `${names[0]} pays ${desc(a1, freqs[0])}; ${names[1]} pays ${desc(a2, freqs[1])}. Which account earns more over a year? Enter its effective annual rate as a percent rounded to 2 decimal places.`,
              steps: [
                `Compare quotes on one basis, the effective annual rate. ${freqs.includes(0) ? `For continuous compounding EAR = ${pow("e", iv("r"))} − 1; otherwise` : "For each,"} EAR = ${pow(`(1 + APR/${iv("n")})`, iv("n"))} − 1.`,
                `${names[0]}: ${work(a1, freqs[0], ears[0])}.`,
                `${names[1]}: ${work(a2, freqs[1], ears[1])}.`,
                `${names[best]} has the higher EAR, ${pc(ears[best])}.`,
              ],
              answer: { kind: "number", value: ears[best], dp: 2 }, answerText: `${names[best]}, ${pc(ears[best])}`, answerInput: typed(ears[best]),
              vals: { e1: ears[0] / 100, e2: ears[1] / 100, p1: ears[0], p2: ears[1], a1d: a1 / 100, a2d: a2 / 100 }, params: { a1, a2, m1: freqs[0], m2: freqs[1] },
            };
          }
        }
        // level 3: convert one compounding frequency to another, or to a continuous rate
        const kind = r.pick(["freq", "cont"]);
        for (;;) {
          const m = r.pick([12, 4, 2]), apr = r.pick(m === 12 ? [6, 9, 12, 18] : [4, 6, 8, 10, 12]);
          const a = apr / 100, i = a / m, fac = Math.pow(1 + i, m);
          if (kind === "cont") {
            const lnG = Math.log(1 + i), rc = m * lnG * 100;
            if (P.round(m * P.round(lnG, 8) * 100, 2) !== P.round(rc, 2) || tie(rc, 2)) continue;
            return {
              prompt: `A loan is quoted at ${pc(apr)} APR compounded ${COMP[m]}. What continuously compounded rate gives the same growth in a year? Give a percent rounded to 2 decimal places.`,
              steps: [
                `Equal growth in a year: ${pow("e", iv("r<sub>c</sub>"))} = ${pow(`(1 + ${M.frac(n(a), n(m))})`, n(m))}, so ${iv("r")}<sub>c</sub> = ${n(m)} · ln(1 + ${n(i, 6)}).`,
                `ln(${n(1 + i, 6)}) ${eqn(lnG, 8)}.`,
                `${iv("r")}<sub>c</sub> = ${n(m)} × ln(${n(1 + i, 6)}) ${eqn(rc / 100, 8)} ${eqp(rc)}, a little below the APR: continuous compounding needs a smaller rate for the same growth.`,
              ],
              answer: { kind: "number", value: rc, dp: 2 }, answerText: pc(rc), answerInput: typed(rc),
              vals: { a, i, g: 1 + i, lnG, rcd: rc / 100, rc }, params: { m, apr, kind },
            };
          }
          const k = r.pick([12, 4, 2].filter((x) => x !== m));
          const per = Math.pow(fac, 1 / k) - 1, aprK = k * per * 100;
          const shown = k * (Math.pow(P.round(fac, 8), 1 / k) - 1) * 100;
          if (P.round(shown, 2) !== P.round(aprK, 2) || P.round(k * P.round(per, 8) * 100, 2) !== P.round(aprK, 2) || tie(aprK, 2)) continue;
          return {
            prompt: `A rate is quoted as ${pc(apr)} APR compounded ${COMP[m]}. What APR compounded ${COMP[k]} gives the same effective annual rate? Give a percent rounded to 2 decimal places.`,
            steps: [
              `Growth in one year: ${pow(`(1 + ${M.frac(n(a), n(m))})`, n(m))} = ${pow(`(${n(1 + i, 6)})`, n(m))} ${eqn(fac, 8)}, so EAR ${eqp((fac - 1) * 100, 4)}.`,
              `The ${PER[k]}ly rate with the same growth is ${pow(fmt(fac, 8), `1/${n(k)}`)} − 1 ${eqn(per, 8)}.`,
              `APR = ${n(k)} × ${fmt(per, 8)} ${eqn(aprK / 100, 8)} ${eqp(aprK)}.`,
            ],
            answer: { kind: "number", value: aprK, dp: 2 }, answerText: pc(aprK), answerInput: typed(aprK),
            vals: { a, i, g: 1 + i, fac, earPct: (fac - 1) * 100, per, aprKd: aprK / 100, aprK }, params: { m, apr, k, kind },
          };
        }
      },
    },

    // ---- FN.3 Doubling time and the rule of 72 -----------------------------------------------------
    "FN.3": {
      title: "Doubling time and the rule of 72",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.5)) {
            const rp = r.pick([2, 3, 4, 6, 8, 9, 12, 18]), t = 72 / rp;
            return {
              prompt: `An index fund is expected to return ${pc(rp)} a year. By the rule of 72, about how many years does it take to double?`,
              steps: [`Rule of 72: ${iv("t")}<sub>double</sub> ≈ ${M.frac("72", `${iv("r")} (in %)`)} = ${M.frac("72", n(rp))} = ${n(t)} years.`],
              answer: { kind: "number", value: t }, answerText: `about ${n(t)} years`, answerInput: String(t),
              vals: { t }, params: { rp, kind: "years" }, consts: [72],
            };
          }
          const t = r.pick([3, 4, 6, 8, 9, 12, 18, 24]), rp = 72 / t;
          return {
            prompt: `A town's housing prices doubled in ${n(t)} years. By the rule of 72, about what yearly growth rate is that? Give a percent.`,
            steps: [`Turn the rule around: ${iv("r")} (in %) ≈ ${M.frac("72", `${iv("t")}<sub>double</sub>`)} = ${M.frac("72", n(t))} = ${n(rp)}.`],
            answer: { kind: "number", value: rp }, answerText: `about ${pc(rp)}`, answerInput: String(rp),
            vals: { rp }, params: { t, kind: "rate" }, consts: [72],
          };
        }
        if (level === 2) {
          for (;;) {
            const cont = r.chance(0.35), rp = cont ? r.pick([2, 3, 4, 5, 6, 7, 8, 10]) : r.int(2, 15);
            const rate = rp / 100, ln2 = Math.log(2);
            if (cont) {
              const t = ln2 / rate, est = 69.3 / rp;
              if (P.round(P.round(ln2, 6) / rate, 2) !== P.round(t, 2) || tie(t, 2)) continue;
              return {
                prompt: `A population grows continuously at ${pc(rp)} a year. Exactly how long does it take to double? Round to 2 decimal places.`,
                steps: [
                  `Continuous growth: solve ${pow("e", `${n(rate)}${iv("t")}`)} = 2 by taking natural logs: ${n(rate)}${iv("t")} = ln 2.`,
                  `${iv("t")} = ${M.frac("ln 2", n(rate))} ${rel(t, 2)} ${M.frac(fmt(ln2, 6), n(rate))} ${eqn(t, 2)} years.`,
                  `Check with the rule of 69.3: ${M.frac("69.3", n(rp))} ${eqn(est, 2)}.`,
                ],
                answer: { kind: "number", value: t, dp: 2 }, answerText: `${fmt(t, 2)} years`, answerInput: typed(t),
                vals: { rate, ln2, t, est }, params: { rp, cont: 1 }, consts: [69.3],
              };
            }
            const lg = Math.log(1 + rate), t = ln2 / lg, est = 72 / rp;
            if (P.round(P.round(ln2, 6) / P.round(lg, 6), 2) !== P.round(t, 2) || tie(t, 2)) continue;
            return {
              prompt: `Savings earn ${pc(rp)} a year, compounded annually. Exactly how many years until they double? Round to 2 decimal places.`,
              steps: [
                `Solve ${pow(`(1 + ${n(rate)})`, iv("t"))} = 2 by taking natural logs: ${iv("t")} · ln(${n(1 + rate)}) = ln 2.`,
                `ln 2 ${eqn(ln2, 6)} and ln(${n(1 + rate)}) ${eqn(lg, 6)}.`,
                `${iv("t")} = ${M.frac(fmt(ln2, 6), fmt(lg, 6))} ${eqn(t, 2)} years. The rule of 72 gives ${M.frac("72", n(rp))} ${eqn(est, 2)}, close to the exact value.`,
              ],
              answer: { kind: "number", value: t, dp: 2 }, answerText: `${fmt(t, 2)} years`, answerInput: typed(t),
              vals: { rate, ln2, lg, t, est, g: 1 + rate }, params: { rp, cont: 0 }, consts: [72],
            };
          }
        }
        // level 3: several doublings by the rule of 72, or exact tripling time
        if (r.chance(0.5)) {
          let rp, td, k, T;
          do { rp = r.pick([4, 6, 8, 9, 12]); td = 72 / rp; k = r.pick([2, 3, 4]); T = td * k; } while (T > 36);
          const P0 = r.int(2, 20) * 500, mult = Math.pow(2, k), A = P0 * mult;
          return {
            prompt: `A grandparent puts ${cash(P0)} in a fund earning ${pc(rp)} a year for a newborn. Using the rule of 72, about how much will the fund hold when the child is ${n(T)}?`,
            steps: [
              `Doubling time by the rule of 72: ${M.frac("72", n(rp))} = ${n(td)} years.`,
              `${n(T)} years is ${M.frac(n(T), n(td))} = ${n(k)} doublings, so the fund grows by ${pow("2", n(k))} = ${n(mult)} times.`,
              `${cash(P0)} × ${n(mult)} = ${cash(A)}.`,
            ],
            answer: { kind: "number", value: A }, answerText: `about ${cash(A)}`, answerInput: String(A),
            vals: { td, k, mult, A }, params: { rp, T, P0, kind: "doublings" }, consts: [72],
          };
        }
        for (;;) {
          const rp = r.int(3, 12), rate = rp / 100, ln3 = Math.log(3), lg = Math.log(1 + rate), t = ln3 / lg, est = 114 / rp;
          if (P.round(P.round(ln3, 6) / P.round(lg, 6), 2) !== P.round(t, 2) || tie(t, 2)) continue;
          return {
            prompt: `How many years does money take to triple at ${pc(rp)} compounded annually? Solve exactly and round to 2 decimal places.`,
            steps: [
              `Solve ${pow(`(1 + ${n(rate)})`, iv("t"))} = 3: ${iv("t")} = ${M.frac("ln 3", `ln(${n(1 + rate)})`)}.`,
              `ln 3 ${eqn(ln3, 6)} and ln(${n(1 + rate)}) ${eqn(lg, 6)}.`,
              `${iv("t")} = ${M.frac(fmt(ln3, 6), fmt(lg, 6))} ${eqn(t, 2)} years. The rule of 114 estimates ${M.frac("114", n(rp))} ${eqn(est, 2)}.`,
            ],
            answer: { kind: "number", value: t, dp: 2 }, answerText: `${fmt(t, 2)} years`, answerInput: typed(t),
            vals: { rate, g: 1 + rate, ln3, lg, t, est }, params: { rp, kind: "triple" }, consts: [114, 3],
          };
        }
      },
    },

    // ---- FN.8 Inflation and real returns -------------------------------------------------------------
    "FN.8": {
      title: "Inflation and real returns",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.5)) {
            const i = r.int(2, 12), pi = r.int(1, 9), rr = i - pi;
            if (rr === 0) return this.generate(r, level);
            return {
              prompt: `A savings bond pays ${pc(i)} a year while inflation runs at ${pc(pi)}. Approximately what is the real return? Give a percent.`,
              steps: [`Approximate real rate: ${iv("r")}<sub>real</sub> ≈ ${iv("i")} − π = ${pc(i)} − ${pc(pi)} = ${pc(rr)}.${rr < 0 ? " It is negative: the money buys less each year." : ""}`],
              answer: { kind: "number", value: rr }, answerText: pc(rr), answerInput: String(rr),
              vals: { rr }, params: { i, pi, kind: "approx" },
            };
          }
          for (;;) {
            const c0 = r.int(2400, 3200) / 10, c1 = P.round(c0 * (1 + r.int(5, 90) / 1000), 1), d = P.round(c1 - c0, 1);
            const pi = (c1 / c0 - 1) * 100;
            if (tie(pi, 2) || d <= 0) continue;
            return {
              prompt: `The consumer price index rose from ${n(c0)} to ${n(c1)} over a year. What was the inflation rate? Give a percent rounded to 2 decimal places.`,
              steps: [
                `π = ${M.frac(`CPI<sub>${iv("t")}</sub>`, `CPI<sub>${iv("t")}−1</sub>`)} − 1 = ${M.frac(n(c1), n(c0))} − 1.`,
                `${M.frac(n(c1), n(c0))} ${eqn(c1 / c0, 6)}, so π ${eqn(c1 / c0 - 1, 6)} ${eqp(pi)}.`,
              ],
              answer: { kind: "number", value: pi, dp: 2 }, answerText: pc(pi), answerInput: typed(pi),
              vals: { ratio: c1 / c0, pid: c1 / c0 - 1, pi }, params: { c0, c1, kind: "cpi" },
            };
          }
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            for (;;) {
              const i = r.int(6, 24) / 2, pi = r.int(2, 16) / 2;
              if (i <= pi) continue;
              const ratio = (1 + i / 100) / (1 + pi / 100), rr = (ratio - 1) * 100, approx = i - pi;
              if (tie(rr, 2)) continue;
              return {
                prompt: `A stock fund returned ${pc(i)} last year while inflation was ${pc(pi)}. What was the exact real return? Give a percent rounded to 2 decimal places.`,
                steps: [
                  `Fisher equation: 1 + ${iv("r")}<sub>real</sub> = ${M.frac(`1 + ${iv("i")}`, "1 + π")} = ${M.frac(n(1 + i / 100), n(1 + pi / 100))} ${eqn(ratio, 6)}.`,
                  `${iv("r")}<sub>real</sub> ${eqn(ratio - 1, 6)} ${eqp(rr)}.`,
                  `The shortcut ${iv("i")} − π = ${pc(approx)} overstates it slightly, because it ignores the cross term.`,
                ],
                answer: { kind: "number", value: rr, dp: 2 }, answerText: pc(rr), answerInput: typed(rr),
                vals: { g: 1 + i / 100, h: 1 + pi / 100, ratio, rd: ratio - 1, rr, approx }, params: { i, pi, kind: "exact" },
              };
            }
          }
          const real = r.int(1, 6), pi = r.int(2, 8), g = (1 + real / 100) * (1 + pi / 100), nom = (g - 1) * 100;
          return {
            prompt: `A pension plan wants a real return of ${pc(real)} a year. If inflation is expected to be ${pc(pi)}, what nominal return does it need? Give the exact percent.`,
            steps: [
              `Fisher equation: 1 + ${iv("i")} = (1 + ${iv("r")}<sub>real</sub>)(1 + π) = ${n(1 + real / 100)} × ${n(1 + pi / 100)} = ${fmt(g, 6)}.`,
              `${iv("i")} = ${fmt(g - 1, 6)} = ${pc(nom, 4)}, a bit more than ${pc(real)} + ${pc(pi)} = ${pc(real + pi)}.`,
            ],
            answer: { kind: "number", value: nom }, answerText: pc(nom, 4), answerInput: typed(nom, 4),
            vals: { a: 1 + real / 100, b: 1 + pi / 100, g, nd: g - 1, nom, simple: real + pi }, params: { real, pi, kind: "nominal" },
          };
        }
        // level 3: deflate a future amount, or the real value of an investment
        if (r.chance(0.5)) {
          for (;;) {
            const X = r.int(2, 40) * 25000, pi = r.pick([2, 2.5, 3, 3.5, 4]), t = r.int(10, 30);
            const fac = Math.pow(1 + pi / 100, t), real = X / fac, d = digits(1 / fac, X);
            if (tie(real, 2)) continue;
            return {
              prompt: `You expect to have ${cash(X)} saved in ${n(t)} years. If inflation averages ${pc(pi)} a year, what is that worth in today's dollars? Round to the nearest cent.`,
              steps: [
                `Prices grow by ${pow(`(1 + ${n(pi / 100)})`, n(t))} ${eqn(fac, 6)} over ${n(t)} years.`,
                `Deflate: real value = ${M.frac("nominal", pow("(1 + π)", iv("t")))} = ${cash(X)} × ${M.frac("1", fmt(fac, 6))}. With 1/${fmt(fac, 6)} ${eqn(1 / fac, d)}, this is ${cash(X)} × ${fmt(1 / fac, d)} ${eqm(real)}.`,
              ],
              answer: { kind: "number", value: real, dp: 2 }, answerText: `${P.money(real)} in today's dollars`, answerInput: typed(real),
              vals: { fac, df: 1 / fac, real, pid: pi / 100 }, params: { X, pi, t, kind: "deflate" },
            };
          }
        }
        for (;;) {
          const P0 = r.int(4, 40) * 2500, i = r.int(4, 10), pi = r.pick([2, 2.5, 3, 3.5, 4]), t = r.int(5, 20);
          const gi = Math.pow(1 + i / 100, t), gp = Math.pow(1 + pi / 100, t), nomV = P0 * gi, real = nomV / gp;
          const dI = digits(gi, P0);
          if (tie(nomV, 2) || tie(real, 2)) continue;
          const shown = P.round(nomV, 2) / P.round(gp, 8);
          if (P.round(shown, 2) !== P.round(real, 2)) continue;
          return {
            prompt: `${cash(P0)} is invested at ${pc(i)} a year, compounded annually, for ${n(t)} years. Inflation averages ${pc(pi)} a year. What is the final balance worth in today's dollars? Round to the nearest cent.`,
            steps: [
              `Nominal balance: ${cash(P0)} × ${pow(n(1 + i / 100), n(t))}, with ${pow(n(1 + i / 100), n(t))} ${eqn(gi, dI)}, so ${cash(P0)} × ${fmt(gi, dI)} ${eqm(nomV)}.`,
              `Price growth over the same period: ${pow(n(1 + pi / 100), n(t))} ${eqn(gp, 8)}.`,
              `Real value: ${M.frac(mon(nomV), fmt(gp, 8))} ${eqm(real)}.`,
            ],
            answer: { kind: "number", value: real, dp: 2 }, answerText: `${P.money(real)} in today's dollars`, answerInput: typed(real),
            vals: { gi, gp, nomV, real, a: 1 + i / 100, b: 1 + pi / 100 }, params: { P0, i, pi, t, kind: "invest" },
          };
        }
      },
    },

    // ---- FN.4 Present value and discounting ---------------------------------------------------------
    "FN.4": {
      title: "Present value and discounting",
      generate(r, level) {
        if (level === 1) {
          const [rp, t] = r.pick([[10, r.pick([2, 3])], [5, 2], [20, r.pick([2, 3])], [25, 2]]);
          const PV = r.int(5, 120) * 100, fac = Math.pow(1 + rp / 100, t), FV = P.round(PV * fac, 2);
          return {
            prompt: `How much must you invest today at ${pc(rp)} a year, compounded annually, to have ${cash(FV)} in ${n(t)} years?`,
            steps: [
              `Discounting runs compounding backwards: ${iv("PV")} = ${M.frac(iv("FV"), pow(`(1 + ${iv("r")})`, iv("t")))}.`,
              `${pow(`(1 + ${n(rp / 100)})`, n(t))} = ${fmt(fac, 8)}.`,
              `${iv("PV")} = ${M.frac(cash(FV), fmt(fac, 8))} = ${cash(PV)}.`,
            ],
            answer: { kind: "number", value: PV, dp: 2 }, answerText: cash(PV), answerInput: String(PV),
            vals: { fac, PV, rd: rp / 100 }, params: { rp, t, FV },
          };
        }
        if (level === 2) {
          for (;;) {
            const cont = r.chance(0.35), FV = r.int(4, 200) * 500, rp = r.pick([3, 3.5, 4, 4.5, 5, 6, 7, 8, 9]), t = r.int(3, 25);
            const rate = rp / 100, df = cont ? Math.exp(-rate * t) : 1 / Math.pow(1 + rate, t), PV = FV * df, d = digits(df, FV);
            if (tie(PV, 2)) continue;
            const what = r.pick([`${an(FV)} ${cash(FV)} payment promised`, `${an(FV)} ${cash(FV)} lump sum you will receive`, `${an(FV)} ${cash(FV)} inheritance due`]);
            if (cont) {
              return {
                prompt: `What is the present value of ${what} in ${n(t)} years, at ${pc(rp)} compounded continuously? Round to the nearest cent.`,
                steps: [
                  `Continuous discount factor: ${iv("DF")} = ${pow("e", `−${iv("r")}${iv("t")}`)} = ${pow("e", `−${n(rate)} × ${n(t)}`)} = ${pow("e", n(-rate * t))} ${eqn(df, d)}.`,
                  `${iv("PV")} = ${cash(FV)} × ${fmt(df, d)} ${eqm(PV)}.`,
                ],
                answer: { kind: "number", value: PV, dp: 2 }, answerText: P.money(PV), answerInput: typed(PV),
                vals: { rate, rt: rate * t, df, PV }, params: { FV, rp, t, cont: 1 },
              };
            }
            const g = Math.pow(1 + rate, t);
            return {
              prompt: `What is the present value of ${what} in ${n(t)} years, at a discount rate of ${pc(rp)} a year? Round to the nearest cent.`,
              steps: [
                `Grow 1 dollar for ${n(t)} years: ${pow(n(1 + rate), n(t))} ${eqn(g, 8)}.`,
                `Discount factor: ${iv("DF")} = ${M.frac("1", fmt(g, 8))} ${eqn(df, d)}.`,
                `${iv("PV")} = ${cash(FV)} × ${fmt(df, d)} ${eqm(PV)}.`,
              ],
              answer: { kind: "number", value: PV, dp: 2 }, answerText: P.money(PV), answerInput: typed(PV),
              vals: { g, df, PV, a: 1 + rate }, params: { FV, rp, t, cont: 0 },
            };
          }
        }
        // level 3: an uneven stream of cash flows
        for (;;) {
          const T = r.pick([3, 4]), rp = r.int(4, 12), rate = rp / 100;
          const cfs = Array.from({ length: T }, () => r.int(5, 90) * 100);
          const pvs = cfs.map((c, k) => c / Math.pow(1 + rate, k + 1)), total = sum(pvs);
          if (!addsUp(pvs, total) || pvs.some((x) => tie(x, 2))) continue;
          const g = Array.from({ length: T }, (_, k) => Math.pow(1 + rate, k + 1));
          return {
            prompt: `A small business will receive ${cfs.map((c, k) => `${cash(c)} at the end of year ${k + 1}`).join(", ")}. What is the stream worth today at a discount rate of ${pc(rp)}? Round to the nearest cent.`,
            graph: timeline(cfs.map((c, k) => [k + 1, c]), T, { mark: [0, "PV = ?"] }),
            steps: [
              `Values add: discount each cash flow by ${pow(`(1 + ${n(rate)})`, iv("t"))} and sum.`,
              ...cfs.map((c, k) => `Year ${k + 1}: ${M.frac(cash(c), k === 0 ? n(1 + rate) : pow(n(1 + rate), k + 1))}${k === 0 ? "" : ` = ${M.frac(cash(c), fmt(g[k], 8))}`} ${eqm(pvs[k])}.`),
              `Total: ${pvs.map((x) => mon(x)).join(" + ")} ${eqm(total)}.`,
            ],
            answer: { kind: "number", value: total, dp: 2 }, answerText: P.money(total), answerInput: typed(total),
            vals: { g, pvs, total, a: 1 + rate, rate, years: cfs.map((_, k) => k + 1) }, params: { cfs, rp },
          };
        }
      },
    },

    // ---- FN.6 Annuities and perpetuities -------------------------------------------------------------
    "FN.6": {
      title: "Annuities and perpetuities",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const rp = r.pick([2, 2.5, 4, 5, 8, 10, 3, 6]), rate = rp / 100;
            if (r.chance(0.5)) {
              const C = r.int(4, 100) * 250, PV = C / rate;
              if (!near(PV * 100, Math.round(PV * 100))) continue;
              return {
                prompt: `A scholarship will pay ${cash(C)} at the end of every year forever. At ${an(rp)} ${pc(rp)} interest rate, how much money must be set aside today to fund it?`,
                steps: [`A perpetuity is worth ${iv("PV")} = ${M.frac(iv("C"), iv("r"))} = ${M.frac(cash(C), n(rate))} ${eqm(PV)}.`],
                answer: { kind: "number", value: PV, dp: 2 }, answerText: cash(PV), answerInput: typed(PV),
                vals: { rate, PV }, params: { C, rp, kind: "pv" },
              };
            }
            const PV = r.int(4, 80) * 25000, C = PV * rate;
            return {
              prompt: `A university endowment of ${cash(PV)} earns ${pc(rp)} a year. What equal amount can it pay out at the end of every year forever without shrinking?`,
              steps: [`From ${iv("PV")} = ${M.frac(iv("C"), iv("r"))}: ${iv("C")} = ${iv("PV")} · ${iv("r")} = ${cash(PV)} × ${n(rate)} ${eqm(C)}. Paying only the interest keeps the principal intact.`],
              answer: { kind: "number", value: C, dp: 2 }, answerText: cash(C), answerInput: typed(C),
              vals: { rate, C }, params: { PV, rp, kind: "payment" },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            if (r.chance(0.5)) {
              const C = r.int(4, 80) * 250, rp = r.pick([3, 4, 5, 6, 7, 8, 9, 10]), N = r.int(5, 25), rate = rp / 100;
              const g = Math.pow(1 + rate, N), v = 1 / g, af = (1 - v) / rate, PV = C * af, d = digits(af, C);
              if (tie(PV, 2)) continue;
              return {
                prompt: `A settlement pays ${cash(C)} at the end of each year for ${n(N)} years. What is it worth today at ${pc(rp)} a year? Round to the nearest cent.`,
                steps: [
                  `Ordinary annuity: ${iv("PV")} = ${iv("C")} · ${M.frac(`1 − ${pow(`(1 + ${iv("r")})`, `−${iv("n")}`)}`, iv("r"))}, with ${iv("r")} = ${n(rate)} and ${iv("n")} = ${n(N)}.`,
                  `${pow(n(1 + rate), `−${n(N)}`)} = ${M.frac("1", pow(n(1 + rate), n(N)))} ${eqn(v, 10)}.`,
                  `Annuity factor: ${M.frac(`1 − ${fmt(v, 10)}`, n(rate))} ${eqn(af, d)}.`,
                  `${iv("PV")} = ${cash(C)} × ${fmt(af, d)} ${eqm(PV)}.`,
                ],
                answer: { kind: "number", value: PV, dp: 2 }, answerText: P.money(PV), answerInput: typed(PV),
                vals: { rate, a: 1 + rate, v, af, PV }, params: { C, rp, N, kind: "pv" },
              };
            }
            const C = r.int(4, 40) * 25, apr = r.pick([3, 4.8, 6, 9, 12]), yrs = r.int(5, 30), i = apr / 1200, N = 12 * yrs;
            const g = Math.pow(1 + i, N), af = (g - 1) / i, FV = C * af, d = digits(af, C);
            if (tie(FV, 2)) continue;
            return {
              prompt: `You save ${cash(C)} at the end of every month for ${n(yrs)} years in an account paying ${pc(apr)} APR compounded monthly. How much will you have right after the last deposit? Round to the nearest cent.`,
              steps: [
                `Per month: ${iv("i")} = ${M.frac(n(apr / 100), "12")} = ${n(i, 6)} and ${iv("n")} = 12 × ${n(yrs)} = ${n(N)} deposits.`,
                `${pow(`(1 + ${n(i, 6)})`, n(N))} ${eqn(g, 8)}.`,
                `Annuity factor: ${M.frac(`${fmt(g, 8)} − 1`, n(i, 6))} ${eqn(af, d)}.`,
                `${iv("FV")} = ${iv("C")} · ${M.frac(`${pow(`(1 + ${iv("i")})`, iv("n"))} − 1`, iv("i"))} = ${cash(C)} × ${fmt(af, d)} ${eqm(FV)}.`,
              ],
              answer: { kind: "number", value: FV, dp: 2 }, answerText: P.money(FV), answerInput: typed(FV),
              vals: { i, N, g, af, FV, a: apr / 100 }, params: { C, apr, yrs, kind: "fv" }, consts: [12],
            };
          }
        }
        // level 3: a growing perpetuity from this year's payment, or the saving needed to reach a goal
        for (;;) {
          if (r.chance(0.5)) {
            const C0 = r.int(4, 80) * 500, gp = r.pick([1, 2, 2.5, 3, 4]), spread = r.pick([2, 2.5, 4, 5, 8]), rp = gp + spread;
            const C1 = C0 * (1 + gp / 100), PV = C1 / (spread / 100);
            if (!near(C1 * 100, Math.round(C1 * 100)) || !near(PV * 100, Math.round(PV * 100))) continue;
            return {
              prompt: `A building's net rent was ${cash(C0)} this year, just received. Rent is expected to grow ${pc(gp)} a year forever, and investors require ${pc(rp)}. What is the building worth today?`,
              steps: [
                `The growing-perpetuity formula needs the next payment, one year from now: ${iv("C")}<sub>1</sub> = ${cash(C0)} × ${n(1 + gp / 100)} ${eqm(C1)}.`,
                `${iv("r")} − ${iv("g")} = ${n(rp / 100)} − ${n(gp / 100)} = ${n(spread / 100)}.`,
                `${iv("PV")} = ${M.frac(`${iv("C")}<sub>1</sub>`, `${iv("r")} − ${iv("g")}`)} = ${M.frac(cash(C1), n(spread / 100))} ${eqm(PV)}.`,
              ],
              answer: { kind: "number", value: PV, dp: 2 }, answerText: cash(PV), answerInput: typed(PV),
              vals: { C1, sp: spread / 100, PV, rd: rp / 100, gd: gp / 100, gf: 1 + gp / 100 }, params: { C0, gp, rp, kind: "growing" },
            };
          }
          const goal = r.int(10, 200) * 1000, rp = r.pick([3, 4, 5, 6, 7, 8]), N = r.int(5, 25), rate = rp / 100;
          const g = Math.pow(1 + rate, N), af = (g - 1) / rate, C = goal / af;
          const shownC = goal / P.round(af, 8);
          if (tie(C, 2) || P.round(shownC, 2) !== P.round(C, 2)) continue;
          return {
            prompt: `Parents want ${cash(goal)} for college in ${n(N)} years. They will make equal deposits at the end of each year into an account earning ${pc(rp)}. How much must each deposit be? Round to the nearest cent.`,
            steps: [
              `The deposits form an ordinary annuity whose future value must be the goal: ${cash(goal)} = ${iv("C")} · ${M.frac(`${pow(`(1 + ${iv("r")})`, iv("n"))} − 1`, iv("r"))}.`,
              `${pow(n(1 + rate), n(N))} ${eqn(g, 8)}, so the factor is ${M.frac(`${fmt(g, 8)} − 1`, n(rate))} ${eqn(af, 8)}.`,
              `${iv("C")} = ${M.frac(cash(goal), fmt(af, 8))} ${eqm(C)}.`,
            ],
            answer: { kind: "number", value: C, dp: 2 }, answerText: `${P.money(C)} a year`, answerInput: typed(C),
            vals: { rate, g, af, C, a: 1 + rate }, params: { goal, rp, N, kind: "sinking" },
          };
        }
      },
    },

    // ---- FN.growing-annuity Annuities due and growing annuities --------------------------------------
    "FN.growing-annuity": {
      title: "Annuities due and growing annuities",
      generate(r, level) {
        if (level === 1) {
          const rp = r.int(2, 10), X = r.int(200, 3000) * 10, fv = r.chance(0.5), due = (X * (100 + rp)) / 100, N = r.int(5, 20);
          return {
            prompt: `The ${fv ? "future" : "present"} value of ${n(N)} yearly payments made at the end of each year is ${cash(X)} at ${pc(rp)}. If each payment is made at the start of the year instead, what is the ${fv ? "future" : "present"} value?`,
            steps: [
              `In an annuity due every payment arrives one period earlier, so it earns one extra period of interest: multiply by (1 + ${iv("r")}).`,
              `${cash(X)} × ${n(1 + rp / 100)} ${eqm(due)}.`,
            ],
            answer: { kind: "number", value: due, dp: 2 }, answerText: cash(due), answerInput: typed(due),
            vals: { a: 1 + rp / 100, due }, params: { rp, X, fv: fv ? 1 : 0, N },
          };
        }
        if (level === 2) {
          for (;;) {
            if (r.chance(0.5)) {
              const C = r.int(12, 60) * 50, apr = r.pick([3, 4.8, 6, 9, 12]), N = r.pick([12, 24, 36]), i = apr / 1200;
              const v = Math.pow(1 + i, -N), af = (1 - v) / i, afd = af * (1 + i), PV = C * afd, d = digits(afd, C);
              if (tie(PV, 2) || P.round(P.round(af, 8) * (1 + i), d) !== P.round(afd, d)) continue;
              return {
                prompt: `A business leases equipment for ${cash(C)} paid at the start of each month for ${n(N)} months. At ${pc(apr)} APR compounded monthly, what is the present value of the lease payments? Round to the nearest cent.`,
                steps: [
                  `Monthly rate ${iv("i")} = ${M.frac(n(apr / 100), "12")} = ${n(i, 6)}, ${iv("n")} = ${n(N)} payments, the first one today.`,
                  `Ordinary annuity factor: ${M.frac(`1 − ${pow(`(1 + ${n(i, 6)})`, `−${n(N)}`)}`, n(i, 6))} = ${M.frac(`1 − ${fmt(v, 10)}`, n(i, 6))} ${eqn(af, 8)}.`,
                  `Payments at the start: multiply by (1 + ${iv("i")}): ${fmt(af, 8)} × ${n(1 + i, 6)} ${eqn(afd, d)}.`,
                  `${iv("PV")}<sub>due</sub> = ${cash(C)} × ${fmt(afd, d)} ${eqm(PV)}.`,
                ],
                answer: { kind: "number", value: PV, dp: 2 }, answerText: P.money(PV), answerInput: typed(PV),
                vals: { i, a: apr / 100, g: 1 + i, v, af, afd, PV }, params: { C, apr, N, kind: "pv" }, consts: [12],
              };
            }
            const C = r.int(4, 80) * 250, rp = r.pick([3, 4, 5, 6, 7, 8]), N = r.int(5, 30), rate = rp / 100;
            const g = Math.pow(1 + rate, N), af = (g - 1) / rate, afd = af * (1 + rate), FV = C * afd, d = digits(afd, C);
            if (tie(FV, 2) || P.round(P.round(af, 8) * (1 + rate), d) !== P.round(afd, d)) continue;
            return {
              prompt: `You deposit ${cash(C)} at the start of each year for ${n(N)} years into an account paying ${pc(rp)} a year. How much is in the account at the end of year ${n(N)}? Round to the nearest cent.`,
              steps: [
                `${pow(n(1 + rate), n(N))} ${eqn(g, 8)}, so the ordinary future-value factor is ${M.frac(`${fmt(g, 8)} − 1`, n(rate))} ${eqn(af, 8)}.`,
                `Each deposit is made a year earlier than in an ordinary annuity, so multiply by ${n(1 + rate)}: ${fmt(af, 8)} × ${n(1 + rate)} ${eqn(afd, d)}.`,
                `${iv("FV")}<sub>due</sub> = ${cash(C)} × ${fmt(afd, d)} ${eqm(FV)}.`,
              ],
              answer: { kind: "number", value: FV, dp: 2 }, answerText: P.money(FV), answerInput: typed(FV),
              vals: { rate, a: 1 + rate, g, af, afd, FV }, params: { C, rp, N, kind: "fv" },
            };
          }
        }
        // level 3: a growing annuity, or the equal-rate case
        for (;;) {
          if (r.chance(0.65)) {
            const C1 = r.int(20, 120) * 1000, gp = r.pick([2, 3, 4]), rp = gp + r.pick([2, 3, 4, 5]), N = r.int(10, 30);
            const rate = rp / 100, gr = gp / 100, q = (1 + gr) / (1 + rate), qn = Math.pow(q, N), base = C1 / (rate - gr), PV = base * (1 - qn);
            const shown = base * (1 - P.round(qn, 8));
            if (tie(PV, 2) || P.round(shown, 2) !== P.round(PV, 2)) continue;
            return {
              prompt: `A job offer pays a salary of ${cash(C1)} at the end of the first year, rising ${pc(gp)} a year, for ${n(N)} years. At a discount rate of ${pc(rp)}, what is the present value of all the salary payments? Round to the nearest cent.`,
              steps: [
                `Growing annuity: ${iv("PV")} = ${M.frac(`${iv("C")}<sub>1</sub>`, `${iv("r")} − ${iv("g")}`)}[1 − ${pow(`(${M.frac(`1 + ${iv("g")}`, `1 + ${iv("r")}`)})`, iv("n"))}].`,
                `${M.frac(n(1 + gr), n(1 + rate))} ${eqn(q, 10)}, and its ${ord(N)} power ${eqn(qn, 8)}.`,
                `${M.frac(cash(C1), `${n(rate)} − ${n(gr)}`)} = ${M.frac(cash(C1), n(rate - gr))} ${eqm(base)}.`,
                `${iv("PV")} ${rel(PV, 2)} ${mon(base)} × (1 − ${fmt(qn, 8)}) ${eqm(PV)}.`,
              ],
              answer: { kind: "number", value: PV, dp: 2 }, answerText: P.money(PV), answerInput: typed(PV),
              vals: { rate, gr, a: 1 + gr, b: 1 + rate, q, qn, spread: rate - gr, base, PV }, params: { C1, gp, rp, N, kind: "growing" },
            };
          }
          const C1 = r.int(10, 100) * 500, rp = r.int(2, 8), N = r.int(5, 25), PV = (N * C1) / (1 + rp / 100);
          if (tie(PV, 2)) continue;
          return {
            prompt: `A royalty pays ${cash(C1)} at the end of the first year and then grows ${pc(rp)} a year, for ${n(N)} payments in all. The discount rate is also ${pc(rp)}. What is the present value? Round to the nearest cent.`,
            steps: [
              `When ${iv("g")} = ${iv("r")} the general formula gives ${M.frac("0", "0")}; use the equal-rate case instead.`,
              `Each payment ${iv("C")}<sub>1</sub>${pow(`(1 + ${iv("g")})`, `${iv("t")}−1`)} discounted by ${pow(`(1 + ${iv("r")})`, iv("t"))} is worth ${M.frac(`${iv("C")}<sub>1</sub>`, `1 + ${iv("r")}`)} today, so ${iv("PV")} = ${M.frac(`${iv("n")}${iv("C")}<sub>1</sub>`, `1 + ${iv("r")}`)}.`,
              `${iv("PV")} = ${M.frac(`${n(N)} × ${cash(C1)}`, n(1 + rp / 100))} = ${M.frac(cash(N * C1), n(1 + rp / 100))} ${eqm(PV)}.`,
            ],
            answer: { kind: "number", value: PV, dp: 2 }, answerText: P.money(PV), answerInput: typed(PV),
            vals: { a: 1 + rp / 100, tot: N * C1, PV }, params: { C1, rp, N, kind: "equal" },
          };
        }
      },
    },

    // ---- FN.5 NPV and IRR ------------------------------------------------------------------------------
    "FN.5": {
      title: "Net present value, IRR and payback",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const C0 = r.int(10, 60) * 1000, cfs = Array.from({ length: 5 }, () => r.int(3, 20) * 1000);
            const cum = [];
            let c = -C0;
            for (const x of cfs) { c += x; cum.push(c); }
            const T = cum.findIndex((x) => x >= 0) + 1;
            if (T < 2) continue;
            const shown = cum.slice(0, T);
            return {
              prompt: `A machine costs ${cash(C0)} and is expected to save ${cfs.map((x) => cash(x)).join(", ")} in years 1 to 5. What is its payback period, in whole years (the first year-end at which the cumulative cash flow is no longer negative)?`,
              steps: [
                `Start at −${cash(C0)} and add each year's savings.`,
                ...shown.map((x, k) => `End of year ${k + 1}: ${k === 0 ? `−${cash(C0)}` : cash(cum[k - 1])} + ${cash(cfs[k])} = ${cash(x)}${x >= 0 ? ", no longer negative" : ""}.`),
                `Payback period: ${n(T)} years. It ignores discounting and everything after year ${n(T)}.`,
              ],
              answer: { kind: "number", value: T }, answerText: `${n(T)} years`, answerInput: String(T),
              vals: { cum: shown, T, years: [1, 2, 3, 4, 5] }, params: { C0, cfs },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const T = r.pick([3, 4]), rp = r.int(6, 14), rate = rp / 100, C0 = r.int(20, 100) * 1000;
            const cfs = Array.from({ length: T }, () => r.int(Math.ceil(C0 / T / 1000 * 0.7), Math.ceil(C0 / T / 1000 * 1.6)) * 1000);
            const pvs = cfs.map((c, k) => c / Math.pow(1 + rate, k + 1)), pvIn = sum(pvs), npv = pvIn - C0, pi = pvIn / C0;
            const kind = r.pick(["npv", "pi"]);
            if (!addsUp(pvs, pvIn) || pvs.some((x) => tie(x, 2)) || Math.abs(npv) < 50 || (kind === "pi" && (tie(pi, 2) || P.round(P.round(pvIn, 2) / C0, 2) !== P.round(pi, 2)))) continue;
            const flowsText = cfs.map((x, k) => `${cash(x)} in year ${k + 1}`).join(", ");
            const steps = [
              `Discount each inflow at ${pc(rp)}: ${pvs.map((x, k) => `${M.frac(cash(cfs[k]), k ? pow(n(1 + rate), k + 1) : n(1 + rate))} ${eqm(x)}`).join("; ")}.`,
              `Present value of the inflows: ${pvs.map((x) => mon(x)).join(" + ")} ${eqm(pvIn)}.`,
            ];
            if (kind === "npv") steps.push(`${iv("NPV")} ${rel(npv, 2)} ${mon(pvIn)} − ${cash(C0)} ${eqm(npv)}. It is ${npv > 0 ? "positive, so accept the project" : "negative, so reject the project"}.`);
            else steps.push(`${iv("PI")} = ${M.frac(mon(pvIn), cash(C0))} ${eqn(pi, 2)}, ${pi > 1 ? "above 1, so the project adds value" : "below 1, so the project destroys value"}.`);
            const ans = kind === "npv" ? npv : pi;
            return {
              prompt: `A project costs ${cash(C0)} today and returns ${flowsText}. The hurdle rate is ${pc(rp)}. ${kind === "npv" ? "What is its net present value? Round to the nearest cent." : "What is its profitability index? Round to 2 decimal places."}`,
              graph: timeline([[0, -C0], ...cfs.map((x, k) => [k + 1, x])], T),
              steps, answer: { kind: "number", value: ans, dp: 2 }, answerText: kind === "npv" ? mon(npv) : fmt(pi, 2), answerInput: typed(ans),
              vals: { pvs, pvIn, npv, pi, a: 1 + rate, years: cfs.map((_, k) => k + 1) }, params: { C0, cfs, rp, kind },
            };
          }
        }
        // level 3: an exact IRR from a two-year project (a quadratic in 1 + IRR)
        for (;;) {
          const [p, q] = r.pick([[21, 20], [11, 10], [9, 8], [23, 20], [6, 5], [5, 4]]);
          const al = r.int(1, 8), be = r.int(1, 6);
          const C0 = q * al + q * q * be, C1 = p * al, C2 = p * p * be;
          if (C0 > 3000 || C1 * 5 < C2 || C2 * 3 < C1) continue;
          const disc = C1 * C1 + 4 * C0 * C2, root = Math.round(Math.sqrt(disc));
          if (root * root !== disc) continue;
          const x = new Frac(C1 + root, 2 * C0), xneg = new Frac(C1 - root, 2 * C0), irr = x.sub(1).mul(100);
          const hurdle = r.pick([6, 8, 10, 12, 15, 18, 20, 22].filter((h) => h * irr.d !== irr.n));
          const acc = irr.value > hurdle;
          return {
            prompt: `A project costs ${cash(C0 * 1000)} today and returns ${cash(C1 * 1000)} after one year and ${cash(C2 * 1000)} after two. Find its internal rate of return exactly (a percent), and decide whether to accept it at ${an(hurdle)} ${pc(hurdle)} hurdle rate.`,
            graph: timeline([[0, -C0 * 1000], [1, C1 * 1000], [2, C2 * 1000]], 2),
            steps: [
              `Work in thousands of dollars and write ${iv("x")} = 1 + IRR. NPV = 0 means −${n(C0)} + ${M.frac(n(C1), iv("x"))} + ${M.frac(n(C2), pow(iv("x"), 2))} = 0.`,
              `Multiply by ${pow(iv("x"), 2)}: ${n(C0)}${pow(iv("x"), 2)} − ${n(C1)}${iv("x")} − ${n(C2)} = 0.`,
              `Quadratic formula: discriminant ${pow(n(C1), 2)} + 4 · ${n(C0)} · ${n(C2)} = ${P.grouped(disc)} = ${pow(n(root), 2)}, so ${iv("x")} = ${M.frac(`${n(C1)} ± ${n(root)}`, `2 · ${n(C0)}`)}.`,
              `The roots are ${M.f(x)} and ${M.f(xneg)}; 1 + IRR must be positive, so ${iv("x")} = ${M.f(x)} = ${fmt(x.value, 6)}.`,
              `IRR = ${fmt(x.value, 6)} − 1 = ${pc(irr.value, 4)}, ${acc ? "above" : "below"} the ${pc(hurdle)} hurdle rate, so ${acc ? "accept" : "reject"} the project.`,
            ],
            answer: { kind: "number", value: irr.value }, answerText: `${pc(irr.value, 4)}; ${acc ? "accept" : "reject"}`, answerInput: typed(irr.value, 6),
            vals: { C0k: C0, C1k: C1, C2k: C2, disc, root, x: fracVal(x), xneg: fracVal(xneg), xv: x.value, irr: irr.value }, params: { C0: C0 * 1000, C1: C1 * 1000, C2: C2 * 1000, hurdle }, consts: [4],
          };
        }
      },
    },

    // ---- FN.7 Loan amortization and mortgages ----------------------------------------------------------
    "FN.7": {
      title: "Loan payments and amortization",
      generate(r, level) {
        const APRS = [3.6, 4.2, 4.8, 5.4, 6, 6.6, 7.2, 7.8, 8.4, 9];
        const payment = (L, i, N) => (L * i * Math.pow(1 + i, N)) / (Math.pow(1 + i, N) - 1);
        if (level === 1) {
          const L = r.int(80, 600) * 1000, apr = r.pick(APRS), yrs = r.pick([15, 20, 30]), i = apr / 1200, N = 12 * yrs;
          const Mp = P.round(payment(L, i, N), 2), I1 = L * i, pr = Mp - I1, B1 = L - pr, kind = r.pick(["principal", "balance", "total"]);
          if (kind === "total") {
            const paid = N * Mp, ti = paid - L;
            return {
              prompt: `${an(yrs, true)} ${n(yrs)}-year mortgage of ${cash(L)} has a monthly payment of ${P.money(Mp)}. How much interest is paid over the life of the loan?`,
              steps: [
                `Total paid: ${iv("n")}${iv("M")} = ${n(N)} × ${P.money(Mp)} ${eqm(paid)}.`,
                `Total interest = total paid − amount borrowed = ${mon(paid)} − ${cash(L)} ${eqm(ti)}.`,
              ],
              answer: { kind: "number", value: ti, dp: 2 }, answerText: P.money(ti), answerInput: typed(ti),
              vals: { N, paid, ti }, params: { L, Mp, yrs, apr, kind }, consts: [12],
            };
          }
          return {
            prompt: `${an(yrs, true)} ${n(yrs)}-year mortgage of ${cash(L)} at ${pc(apr, 1)} APR (compounded monthly) has a monthly payment of ${P.money(Mp)}. In the first payment, ${kind === "principal" ? "how much goes to repaying principal" : "what is the balance after it is made"}?`,
            steps: [
              `Monthly rate: ${iv("i")} = ${M.frac(n(apr / 100), "12")} = ${n(i, 6)}.`,
              `Interest for the first month is charged on the full balance: ${iv("I")}<sub>1</sub> = ${n(i, 6)} × ${cash(L)} ${eqm(I1)}.`,
              `Principal repaid: ${iv("M")} − ${iv("I")}<sub>1</sub> = ${P.money(Mp)} − ${cash(I1)} ${eqm(pr)}.`,
              ...(kind === "balance" ? [`New balance: ${cash(L)} − ${mon(pr)} ${eqm(B1)}.`] : []),
            ],
            answer: { kind: "number", value: kind === "principal" ? pr : B1, dp: 2 }, answerText: P.money(kind === "principal" ? pr : B1), answerInput: typed(kind === "principal" ? pr : B1),
            vals: { i, I1, pr, B1, a: apr / 100 }, params: { L, Mp, yrs, apr, kind }, consts: [12],
          };
        }
        if (level === 2) {
          for (;;) {
            const car = r.chance(0.4), L = car ? r.int(16, 90) * 500 : r.int(80, 700) * 1000, yrs = car ? r.pick([3, 4, 5, 6]) : r.pick([15, 20, 30]);
            const apr = r.pick(APRS), i = apr / 1200, N = 12 * yrs, g = Math.pow(1 + i, N), Mp = payment(L, i, N);
            const shown = (L * i * P.round(g, 8)) / (P.round(g, 8) - 1);
            if (tie(Mp, 2) || P.round(shown, 2) !== P.round(Mp, 2)) continue;
            return {
              prompt: `What is the monthly payment on ${an(yrs)} ${n(yrs)}-year ${car ? "car loan" : "mortgage"} of ${cash(L)} at ${pc(apr, 1)} APR, compounded monthly? Round to the nearest cent.`,
              steps: [
                `Monthly rate ${iv("i")} = ${M.frac(n(apr / 100), "12")} = ${n(i, 6)}; number of payments ${iv("n")} = 12 × ${n(yrs)} = ${n(N)}.`,
                `${pow(`(1 + ${n(i, 6)})`, n(N))} ${eqn(g, 8)}.`,
                `${iv("M")} = ${iv("P")} ${M.frac(`${iv("i")}${pow(`(1 + ${iv("i")})`, iv("n"))}`, `${pow(`(1 + ${iv("i")})`, iv("n"))} − 1`)} = ${cash(L)} × ${M.frac(`${n(i, 6)} × ${fmt(g, 8)}`, `${fmt(g, 8)} − 1`)} ${eqm(Mp)}.`,
              ],
              answer: { kind: "number", value: Mp, dp: 2 }, answerText: `${P.money(Mp)} a month`, answerInput: typed(Mp),
              vals: { i, N, g, Mp, a: apr / 100 }, params: { L, yrs, apr }, consts: [12],
            };
          }
        }
        // level 3: the balance after k payments, or the interest in the next payment
        for (;;) {
          const L = r.int(100, 600) * 1000, yrs = r.pick([15, 20, 30]), apr = r.pick(APRS), i = apr / 1200, N = 12 * yrs;
          const Mp = P.round(payment(L, i, N), 2), kyrs = r.int(2, yrs - 3), k = 12 * kyrs, kind = r.pick(["balance", "interest"]);
          const gk = Math.pow(1 + i, k), grown = L * gk, sf = (gk - 1) / i, paid = Mp * sf, Bk = grown - paid, Inext = i * Bk;
          const dG = digits(gk, L, 8), dS = digits(sf, Mp, 6);
          if (tie(grown, 2) || tie(paid, 2) || tie(Bk, 2) || tie(Inext, 2) || !near(P.round(P.round(grown, 2) - P.round(paid, 2), 2), P.round(Bk, 2))) continue;
          if (kind === "interest" && P.round(i * P.round(Bk, 2), 2) !== P.round(Inext, 2)) continue;
          const steps = [
            `Monthly rate ${iv("i")} = ${M.frac(n(apr / 100), "12")} = ${n(i, 6)}; after ${n(kyrs)} years, ${iv("k")} = ${n(k)} payments have been made.`,
            `The loan grown at ${iv("i")}: ${pow(`(1 + ${n(i, 6)})`, n(k))} ${eqn(gk, dG)}, so ${cash(L)} × ${fmt(gk, dG)} ${eqm(grown)}.`,
            `The payments grown at ${iv("i")}: ${M.frac(`${fmt(gk, dG)} − 1`, n(i, 6))} ${eqn(sf, dS)}, so ${P.money(Mp)} × ${fmt(sf, dS)} ${eqm(paid)}.`,
            `Remaining balance: ${iv("B")}<sub>${n(k)}</sub> = ${mon(grown)} − ${mon(paid)} ${eqm(Bk)}.`,
          ];
          if (kind === "interest") steps.push(`Payment ${n(k + 1)} pays interest on that balance: ${n(i, 6)} × ${mon(Bk)} ${eqm(Inext)}.`);
          const ans = kind === "balance" ? Bk : Inext;
          return {
            prompt: `${an(yrs, true)} ${n(yrs)}-year mortgage of ${cash(L)} at ${pc(apr, 1)} APR (compounded monthly) has a monthly payment of ${P.money(Mp)}. ${kind === "balance"
              ? `What is the balance after ${n(kyrs)} years of payments?` : `How much of payment number ${n(k + 1)} is interest?`} Use the remaining-balance formula and round to the nearest cent.`,
            steps, answer: { kind: "number", value: ans, dp: 2 }, answerText: P.money(ans), answerInput: typed(ans),
            vals: { i, k, gk, grown, sf, paid, Bk, Inext, a: apr / 100, k1: k + 1 }, params: { L, yrs, apr, Mp, kyrs, kind }, consts: [12],
          };
        }
      },
    },
    // ---- FN.9 Returns: simple, log and CAGR -------------------------------------------------------------
    "FN.9": {
      title: "Returns, compounding of returns and CAGR",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const P0 = r.int(20, 200), P1 = P0 + r.int(-Math.floor(P0 * 0.25), Math.floor(P0 * 0.35)), Dv = r.pick([0, 0.5, 0.8, 1, 1.2, 1.5, 2, 2.4, 3]);
            if (P1 === P0) continue;
            const dP = P1 - P0, gain = dP + Dv, R = (gain / P0) * 100;
            if (tie(R, 2)) continue;
            const steps = [
              `Price change: ${cash(P1)} − ${cash(P0)} = ${cash(dP)}.`,
              Dv ? `Add the dividend for the total gain: ${cash(dP)} + ${mon(Dv)} = ${mon(gain)}.` : `There is no dividend, so the gain is ${cash(dP)}.`,
              `${iv("R")} = ${M.frac(mon(gain), cash(P0))} ${eqn(gain / P0, 6)} ${eqp(R)}.`,
            ];
            return {
              prompt: `You bought a share for ${cash(P0)}. A year later it trades at ${cash(P1)}${Dv ? `, and it paid ${an(Dv)} ${mon(Dv)} dividend during the year` : " and paid no dividend"}. What was your total return? Give a percent rounded to 2 decimal places.`,
              steps, answer: { kind: "number", value: R, dp: 2 }, answerText: pc(R), answerInput: typed(R),
              vals: { dP, gain, Rd: gain / P0, R }, params: { P0, P1, Dv },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const T = r.pick([2, 3]), Rs = Array.from({ length: T }, () => r.nonzero(-30, 40));
            const gs = Rs.map((x) => 1 + x / 100), prod = gs.reduce((a, b) => a * b, 1), tot = (prod - 1) * 100, naive = sum(Rs);
            if (Math.abs(tot - naive) < 0.5) continue;
            return {
              prompt: `A fund returned ${Rs.map((x, k) => `${pc(x)} in year ${k + 1}`).join(", ")}. What was its total return over the ${n(T)} years? Give the exact percent.`,
              steps: [
                `Returns compound: multiply the growth factors 1 + ${iv("R")}<sub>${iv("t")}</sub>: ${gs.map((g) => n(g)).join(" × ")} = ${fmt(prod, 8)}.`,
                `Total return: ${fmt(prod, 8)} − 1 = ${fmt(prod - 1, 8)} = ${pc(tot, 6)}.`,
                `Adding the returns (${Rs.map((x) => pc(x)).join(" + ").replace(/\+ −/g, "− ")} = ${pc(naive)}) would be wrong: each year's return applies to a different base.`,
              ],
              answer: { kind: "number", value: tot }, answerText: pc(tot, 6), answerInput: typed(tot, 6),
              vals: { gs, prod, pd: prod - 1, tot, naive, years: Rs.map((_, k) => k + 1) }, params: { Rs },
            };
          }
        }
        // level 3: CAGR, or geometric versus arithmetic mean
        if (r.chance(0.5)) {
          for (;;) {
            const V0 = r.int(4, 60) * 1000, T = r.int(3, 12), V1 = Math.round(V0 * Math.pow(1 + r.int(-40, 150) / 1000, T) / 100) * 100;
            if (V1 === V0) continue;
            const ratio = V1 / V0, root = Math.pow(ratio, 1 / T), cagr = (root - 1) * 100;
            if (tie(cagr, 2) || P.round((P.round(root, 6) - 1) * 100, 2) !== P.round(cagr, 2)) continue;
            return {
              prompt: `A portfolio grew from ${cash(V0)} to ${cash(V1)} over ${n(T)} years. What was its compound annual growth rate (CAGR)? Give a percent rounded to 2 decimal places.`,
              steps: [
                `CAGR = ${pow(`(${M.frac(`${iv("V")}<sub>${iv("T")}</sub>`, `${iv("V")}<sub>0</sub>`)})`, `1/${iv("T")}`)} − 1.`,
                `${M.frac(cash(V1), cash(V0))} ${eqn(ratio, 6)}; its ${ord(T)} root is ${pow(fmt(ratio, 6), `1/${n(T)}`)} ${eqn(root, 6)}.`,
                `CAGR ${eqn(root - 1, 6)} ${eqp(cagr)}: the constant yearly rate that turns ${cash(V0)} into ${cash(V1)} in ${n(T)} years.`,
              ],
              answer: { kind: "number", value: cagr, dp: 2 }, answerText: pc(cagr), answerInput: typed(cagr),
              vals: { ratio, root, cd: root - 1, cagr }, params: { V0, V1, T, kind: "cagr" },
            };
          }
        }
        for (;;) {
          const Rs = [r.int(10, 50), -r.int(10, 40), r.int(-10, 30)];
          const ar = sum(Rs) / 3, gs = Rs.map((x) => 1 + x / 100), prod = gs[0] * gs[1] * gs[2], root = Math.cbrt(prod), geo = (root - 1) * 100;
          if (prod <= 0 || tie(geo, 2) || Math.abs(ar - geo) < 1 || P.round((P.round(root, 6) - 1) * 100, 2) !== P.round(geo, 2)) continue;
          return {
            prompt: `A stock returned ${Rs.map((x) => pc(x)).join(", ")} in three successive years. What was its geometric mean (compound average) annual return? Give a percent rounded to 2 decimal places.`,
            steps: [
              `Multiply the growth factors: ${gs.map((g) => n(g)).join(" × ")} = ${fmt(prod, 8)}.`,
              `Take the cube root: ${pow(fmt(prod, 8), "1/3")} ${eqn(root, 6)}, so ${M.v("R̄")}<sub>geo</sub> ${eqn(root - 1, 6)} ${eqp(geo)}.`,
              `The arithmetic mean is ${M.frac(Rs.map((x) => n(x)).join(" + ").replace(/\+ −/g, "− "), "3")} ${eqp(ar)}, higher than the geometric mean: volatility drags down compound growth.`,
            ],
            answer: { kind: "number", value: geo, dp: 2 }, answerText: pc(geo), answerInput: typed(geo),
            vals: { gs, prod, root, gd: root - 1, geo, ar }, params: { Rs, kind: "geo" }, consts: [3],
          };
        }
      },
    },

    // ---- FN.10 Volatility and risk -------------------------------------------------------------------
    "FN.10": {
      title: "Volatility and the square root of time",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.6)) {
            const sd = r.pick([0.8, 1, 1.2, 1.5, 2, 2.5, 3]), T = r.pick([4, 9, 16, 25]), rt = Math.sqrt(T), sT = sd * rt;
            return {
              prompt: `A stock's daily returns have a volatility (standard deviation) of ${pc(sd)} and are independent from day to day. What is the volatility of its ${n(T)}-day return? Give a percent.`,
              steps: [
                `Variances of independent returns add, so volatility grows with the square root of time: ${iv("σ")}<sub>${iv("T")}</sub> = ${iv("σ")}${M.sqrt(iv("T"))}.`,
                `${pc(sd)} × ${M.sqrt(n(T))} = ${pc(sd)} × ${n(rt)} = ${pc(sT)}.`,
              ],
              answer: { kind: "number", value: sT }, answerText: pc(sT), answerInput: typed(sT, 6),
              vals: { rt, sT }, params: { sd, T, kind: "sqrt" },
            };
          }
          const [per, k] = r.pick([["daily", 252], ["monthly", 12], ["weekly", 52]]), mu = per === "daily" ? r.pick([0.02, 0.03, 0.04, 0.05]) : per === "weekly" ? r.pick([0.1, 0.15, 0.2, 0.25]) : r.pick([0.5, 0.6, 0.75, 0.8, 1]);
          const ann = mu * k;
          return {
            prompt: `A fund's average ${per} return is ${pc(mu)}. What is its annualized mean return? (There are ${n(k)} ${per === "daily" ? "trading days" : per === "weekly" ? "weeks" : "months"} in a year.) Give a percent.`,
            steps: [`Means scale linearly with time: ${iv("μ")}<sub>annual</sub> = ${n(k)} × ${pc(mu)} = ${pc(ann, 4)}.`],
            answer: { kind: "number", value: ann }, answerText: pc(ann, 4), answerInput: typed(ann, 6),
            vals: { ann }, params: { mu, k, kind: "mean" },
          };
        }
        if (level === 2) {
          for (;;) {
            const [per, k] = r.pick([["daily", 252], ["weekly", 52], ["monthly", 12]]);
            const sd = per === "daily" ? r.pick([0.6, 0.8, 0.9, 1.1, 1.2, 1.5, 1.8, 2.2]) : per === "weekly" ? r.pick([1.5, 2, 2.4, 3, 3.5, 4]) : r.pick([3, 3.5, 4, 4.5, 5, 6, 7.5]);
            const rk = Math.sqrt(k), ann = sd * rk;
            if (tie(ann, 2) || P.round(sd * P.round(rk, 6), 2) !== P.round(ann, 2)) continue;
            return {
              prompt: `The standard deviation of a stock's ${per} returns is ${pc(sd)}. Annualize it, assuming ${n(k)} ${per === "daily" ? "trading days" : per === "weekly" ? "weeks" : "months"} a year and independent returns. Give a percent rounded to 2 decimal places.`,
              steps: [
                `Variance scales with time, so volatility scales with its square root: ${iv("σ")}<sub>annual</sub> = ${iv("σ")}<sub>${per}</sub>${M.sqrt(n(k))}.`,
                `${M.sqrt(n(k))} ${eqn(rk, 6)}.`,
                `${pc(sd)} × ${fmt(rk, 6)} ${eqp(ann)}.`,
              ],
              answer: { kind: "number", value: ann, dp: 2 }, answerText: pc(ann), answerInput: typed(ann),
              vals: { rk, ann }, params: { sd, k },
            };
          }
        }
        // level 3: sample volatility from data, or an EWMA update
        if (r.chance(0.55)) {
          for (;;) {
            const xs = Array.from({ length: 5 }, () => r.int(-8, 10));
            const s = sum(xs);
            if (s % 5 !== 0 || new Set(xs).size < 4) continue;
            const mean = s / 5, dev = xs.map((x) => x - mean), sq = dev.map((d) => d * d), ss = sum(sq), vr = ss / 4, sd = Math.sqrt(vr);
            if (ss === 0 || tie(sd, 2)) continue;
            return {
              prompt: `A fund's monthly returns over five months were ${xs.map((x) => pc(x)).join(", ")}. What is the sample standard deviation of its monthly returns? Give a percent rounded to 2 decimal places.`,
              steps: [
                `Mean: ${M.frac(xs.map((x) => n(x)).join(" + ").replace(/\+ −/g, "− "), "5")} = ${M.frac(n(s), "5")} = ${pc(mean)}.`,
                `Deviations from the mean: ${dev.map((d) => n(d)).join(", ")}. Squared: ${sq.map((d) => n(d)).join(", ")}; their sum is ${n(ss)}.`,
                `Sample variance divides by ${iv("n")} − 1 = 4: ${M.frac(n(ss), "4")} = ${n(vr)} (in %²).`,
                `${iv("σ")} = ${M.sqrt(n(vr))} ${eqp(sd)}.`,
              ],
              answer: { kind: "number", value: sd, dp: 2 }, answerText: pc(sd), answerInput: typed(sd),
              vals: { s, mean, dev, sq, ss, vr, sd }, params: { xs }, consts: [4, 5],
            };
          }
        }
        for (;;) {
          const lam = 0.94, s0 = r.pick([0.8, 1, 1.2, 1.5, 2]), r0 = r.sign() * r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4]);
          const a = lam * s0 * s0, b = (1 - lam) * r0 * r0, v = a + b, s1 = Math.sqrt(v);
          if (tie(s1, 2)) continue;
          return {
            prompt: `A risk desk uses an EWMA volatility estimate with λ = ${n(lam)}. Yesterday's volatility estimate was ${pc(s0)} and yesterday's return was ${pc(r0)}. What is today's volatility estimate? Give a percent rounded to 2 decimal places.`,
            steps: [
              `EWMA: ${pow(iv("σ"), 2)}<sub>${iv("t")}</sub> = λ${pow(iv("σ"), 2)}<sub>${iv("t")}−1</sub> + (1 − λ)${pow(iv("r"), 2)}<sub>${iv("t")}−1</sub>. Work in percent, so variances are in %².`,
              `${n(lam)} × ${pow(n(s0), 2)} = ${n(lam)} × ${n(s0 * s0)} = ${fmt(a, 6)}, and ${n(1 - lam)} × ${pow(np(r0), 2)} = ${n(1 - lam)} × ${n(r0 * r0)} = ${fmt(b, 6)}.`,
              `${pow(iv("σ"), 2)}<sub>${iv("t")}</sub> = ${fmt(a, 6)} + ${fmt(b, 6)} = ${fmt(v, 6)}, so ${iv("σ")}<sub>${iv("t")}</sub> = ${M.sqrt(fmt(v, 6))} ${eqp(s1)}. ${Math.abs(r0) > s0 ? "The large move pushed the estimate up." : "The quiet day pulled the estimate down."}`,
            ],
            answer: { kind: "number", value: s1, dp: 2 }, answerText: pc(s1), answerInput: typed(s1),
            vals: { lam, l1: 1 - lam, s02: s0 * s0, r02: r0 * r0, a, b, v, s1 }, params: { s0, r0, kind: "ewma" },
          };
        }
      },
    },

    // ---- FN.11 Portfolio return, variance and diversification ------------------------------------------
    "FN.11": {
      title: "Portfolio return and risk",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.5)) {
            const w = r.int(1, 9) * 10, R1 = r.int(7, 15), R2 = r.int(2, 6), E = (w * R1 + (100 - w) * R2) / 100;
            return {
              prompt: `A portfolio holds ${pc(w)} in a stock fund expected to return ${pc(R1)} and ${pc(100 - w)} in a bond fund expected to return ${pc(R2)}. What is the portfolio's expected return? Give a percent.`,
              steps: [`Expected returns average with the weights: ${n(w / 100)} × ${pc(R1)} + ${n(1 - w / 100)} × ${pc(R2)} = ${pc(w * R1 / 100, 4)} + ${pc((100 - w) * R2 / 100, 4)} = ${pc(E, 4)}.`],
              answer: { kind: "number", value: E }, answerText: pc(E, 4), answerInput: typed(E, 6),
              vals: { w1: w / 100, w2: 1 - w / 100, w2p: 100 - w, t1: w * R1 / 100, t2: (100 - w) * R2 / 100, E }, params: { w, R1, R2, kind: "two" },
            };
          }
          for (;;) {
            const tot = r.pick([50000, 100000, 200000]), a = r.int(2, 12) * 5000, b = r.int(2, 12) * 5000, c = tot - a - b;
            if (c < 10000) continue;
            const amts = [a, b, c], Rs = [r.int(2, 14), r.int(2, 14), r.int(2, 14)];
            const ws = amts.map((x) => x / tot), terms = ws.map((w, k) => w * Rs[k]), E = sum(terms);
            return {
              prompt: `You invest ${amts.map((x, k) => `${cash(x)} in fund ${"ABC"[k]} (expected return ${pc(Rs[k])})`).join(", ")}. What is the expected return of the whole portfolio? Give a percent rounded to 2 decimal places.`,
              steps: [
                `Total invested: ${amts.map((x) => cash(x)).join(" + ")} = ${cash(tot)}.`,
                `Weights: ${ws.map((w, k) => `${M.frac(cash(amts[k]), cash(tot))} = ${n(w)}`).join(", ")}.`,
                `${iv("E")}[${iv("R")}<sub>${iv("p")}</sub>] = ${ws.map((w, k) => `${n(w)} × ${pc(Rs[k])}`).join(" + ")} = ${terms.map((t) => pc(t, 4)).join(" + ")} ${eqp(E)}.`,
              ],
              answer: { kind: "number", value: E, dp: 2 }, answerText: pc(E), answerInput: typed(E),
              vals: { tot, ws, terms, E }, params: { amts, Rs, kind: "three" },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const s1 = r.int(10, 40), s2 = r.intExcept(8, 30, s1), w = r.int(1, 9) / 10, rho = r.pick([-0.5, -0.3, 0, 0.2, 0.3, 0.5, 0.8]);
            const w2 = P.round(1 - w, 1), t1 = w * w * s1 * s1, t2 = w2 * w2 * s2 * s2, t3 = 2 * w * w2 * rho * s1 * s2, v = t1 + t2 + t3, sp = Math.sqrt(v);
            if (tie(sp, 2)) continue;
            return {
              prompt: `Stock A has volatility ${pc(s1)} and stock B ${pc(s2)}; their correlation is ${n(rho)}. A portfolio puts ${pc(w * 100)} in A and ${pc(w2 * 100)} in B. What is the portfolio's volatility? Give a percent rounded to 2 decimal places.`,
              steps: [
                `${pow(iv("σ"), 2)}<sub>${iv("p")}</sub> = ${pow(iv("w"), 2)}<sub>1</sub>${pow(iv("σ"), 2)}<sub>1</sub> + ${pow(iv("w"), 2)}<sub>2</sub>${pow(iv("σ"), 2)}<sub>2</sub> + 2${iv("w")}<sub>1</sub>${iv("w")}<sub>2</sub>ρ${iv("σ")}<sub>1</sub>${iv("σ")}<sub>2</sub>, working in percent.`,
                `${pow(n(w), 2)} × ${pow(n(s1), 2)} = ${fmt(t1, 6)}; ${pow(n(w2), 2)} × ${pow(n(s2), 2)} = ${fmt(t2, 6)}; 2 × ${n(w)} × ${n(w2)} × ${np(rho)} × ${n(s1)} × ${n(s2)} = ${fmt(t3, 6)}.`,
                `${pow(iv("σ"), 2)}<sub>${iv("p")}</sub> = ${fmt(t1, 6)} + ${fmt(t2, 6)} ${t3 < 0 ? "−" : "+"} ${fmt(Math.abs(t3), 6)} = ${fmt(v, 6)} (in %²).`,
                `${iv("σ")}<sub>${iv("p")}</sub> = ${M.sqrt(fmt(v, 6))} ${eqp(sp)}${rho < 1 ? `, less than the weighted average ${pc(w * s1 + w2 * s2, 4)}: diversification` : ""}.`,
              ],
              answer: { kind: "number", value: sp, dp: 2 }, answerText: pc(sp), answerInput: typed(sp),
              vals: { w2, wp: w * 100, w2p: w2 * 100, t1, t2, t3, v, sp, avg: w * s1 + w2 * s2 }, params: { s1, s2, w, rho },
            };
          }
        }
        // level 3: the zero-risk portfolio when ρ = −1, or diversification across N assets
        if (r.chance(0.5)) {
          for (;;) {
            const s1 = r.int(10, 40), s2 = r.intExcept(8, 30, s1), E1 = r.int(8, 16), E2 = r.intExcept(3, 10, E1);
            const w1 = new Frac(s2, s1 + s2), w2 = new Frac(s1, s1 + s2), E = w1.mul(E1).add(w2.mul(E2));
            if (tie(E.value, 2)) continue;
            return {
              prompt: `Assets A and B are perfectly negatively correlated (ρ = −1). A has expected return ${pc(E1)} and volatility ${pc(s1)}; B has ${pc(E2)} and ${pc(s2)}. What is the expected return of the portfolio of A and B that has zero risk? Give a percent rounded to 2 decimal places.`,
              steps: [
                `With ρ = −1, ${iv("σ")}<sub>${iv("p")}</sub> = |${iv("w")}<sub>1</sub>${iv("σ")}<sub>1</sub> − ${iv("w")}<sub>2</sub>${iv("σ")}<sub>2</sub>|, which is 0 when ${iv("w")}<sub>1</sub>${iv("σ")}<sub>1</sub> = ${iv("w")}<sub>2</sub>${iv("σ")}<sub>2</sub>.`,
                `With ${iv("w")}<sub>2</sub> = 1 − ${iv("w")}<sub>1</sub>: ${iv("w")}<sub>1</sub> = ${M.frac(`${iv("σ")}<sub>2</sub>`, `${iv("σ")}<sub>1</sub> + ${iv("σ")}<sub>2</sub>`)} = ${M.frac(n(s2), `${n(s1)} + ${n(s2)}`)} = ${M.f(w1)} and ${iv("w")}<sub>2</sub> = ${M.f(w2)}.`,
                `${iv("E")}[${iv("R")}<sub>${iv("p")}</sub>] = ${M.f(w1)} × ${pc(E1)} + ${M.f(w2)} × ${pc(E2)} = ${M.f(E)}% ${eqp(E.value)}.`,
              ],
              answer: { kind: "number", value: E.value, dp: 2 }, answerText: pc(E.value), answerInput: typed(E.value),
              vals: { w1: fracVal(w1), w2: fracVal(w2), E: fracVal(E), sum: s1 + s2 }, params: { s1, s2, E1, E2, kind: "hedge" },
            };
          }
        }
        for (;;) {
          const sd = r.pick([30, 35, 40, 45, 50]), cov = r.pick([200, 250, 300, 400, 500]), N = r.pick([4, 5, 10, 20, 25, 50]);
          const vbar = sd * sd, a = vbar / N, b = (1 - 1 / N) * cov, v = a + b, sp = Math.sqrt(v), lim = Math.sqrt(cov);
          if (tie(sp, 2) || tie(lim, 2)) continue;
          return {
            prompt: `Each of ${n(N)} stocks has volatility ${pc(sd)}, and every pair has covariance ${n(cov)} (in %², so a correlation of about ${fmt(cov / vbar, 2)}). What is the volatility of an equal-weighted portfolio of all ${n(N)}? Give a percent rounded to 2 decimal places.`,
            steps: [
              `Equal weights: ${pow(iv("σ"), 2)}<sub>${iv("p")}</sub> = ${M.frac(pow(M.v("σ̄"), 2), iv("N"))} + (1 − ${M.frac("1", iv("N"))})·${M.v("cov")}, with ${pow(M.v("σ̄"), 2)} = ${pow(n(sd), 2)} = ${n(vbar)}.`,
              `${M.frac(n(vbar), n(N))} = ${n(a)} and (1 − ${M.frac("1", n(N))}) × ${n(cov)} = ${n(b)}.`,
              `${pow(iv("σ"), 2)}<sub>${iv("p")}</sub> = ${n(a)} + ${n(b)} = ${n(v)}, so ${iv("σ")}<sub>${iv("p")}</sub> = ${M.sqrt(n(v))} ${eqp(sp)}.`,
              `As ${iv("N")} grows the first term vanishes, but risk never falls below ${M.sqrt(n(cov))} ${eqp(lim)}: the average covariance cannot be diversified away.`,
            ],
            answer: { kind: "number", value: sp, dp: 2 }, answerText: pc(sp), answerInput: typed(sp),
            vals: { vbar, a, b, v, sp, lim, rho: cov / vbar }, params: { sd, cov, N, kind: "diversify" },
          };
        }
      },
    },

    // ---- FN.efficient-frontier Minimum variance and the capital market line --------------------------
    "FN.efficient-frontier": {
      title: "Minimum-variance portfolio and the capital market line",
      generate(r, level) {
        if (level <= 2) {
          for (;;) {
            const s1 = r.int(10, 40), s2 = r.intExcept(8, 35, s1), rho = level === 1 ? 0 : r.pick([-0.5, -0.4, -0.2, 0.2, 0.25, 0.3, 0.4, 0.5]);
            const c = rho * s1 * s2, num = s2 * s2 - c, den = s1 * s1 + s2 * s2 - 2 * c, w = num / den, wp = w * 100;
            if (w <= 0.02 || w >= 0.98 || tie(wp, 2)) continue;
            const steps = level === 1
              ? [
                `With ρ = 0 the cross term drops out: ${iv("w")}<sub>1</sub>* = ${M.frac(pow(`${iv("σ")}<sub>2</sub>`, 2), `${pow(`${iv("σ")}<sub>1</sub>`, 2)} + ${pow(`${iv("σ")}<sub>2</sub>`, 2)}`)}.`,
                `${M.frac(pow(n(s2), 2), `${pow(n(s1), 2)} + ${pow(n(s2), 2)}`)} = ${M.frac(n(s2 * s2), `${n(s1 * s1)} + ${n(s2 * s2)}`)} = ${M.frac(n(num), n(den))} ${eqn(w, 6)} ${eqp(wp)}.`,
                `The less volatile asset gets the larger weight; the rest, ${pc(100 - wp)}, goes in asset 2.`,
              ]
              : [
                `${iv("w")}<sub>1</sub>* = ${M.frac(`${pow(`${iv("σ")}<sub>2</sub>`, 2)} − ρ${iv("σ")}<sub>1</sub>${iv("σ")}<sub>2</sub>`, `${pow(`${iv("σ")}<sub>1</sub>`, 2)} + ${pow(`${iv("σ")}<sub>2</sub>`, 2)} − 2ρ${iv("σ")}<sub>1</sub>${iv("σ")}<sub>2</sub>`)}, working in percent.`,
                `ρ${iv("σ")}<sub>1</sub>${iv("σ")}<sub>2</sub> = ${n(rho)} × ${n(s1)} × ${n(s2)} = ${n(c)}.`,
                `Numerator: ${n(s2 * s2)} − ${np(c)} = ${n(num)}. Denominator: ${n(s1 * s1)} + ${n(s2 * s2)} − 2 × ${np(c)} = ${n(den)}.`,
                `${iv("w")}<sub>1</sub>* = ${M.frac(n(num), n(den))} ${eqn(w, 6)} ${eqp(wp)}.`,
              ];
            return {
              prompt: `Asset 1 has volatility ${pc(s1)} and asset 2 has volatility ${pc(s2)}${level === 1 ? "; their returns are uncorrelated" : `; their correlation is ${n(rho)}`}. What weight on asset 1 gives the minimum-variance portfolio of the two? Give a percent rounded to 2 decimal places.`,
              steps, answer: { kind: "number", value: wp, dp: 2 }, answerText: pc(wp), answerInput: typed(wp),
              vals: { a: s1 * s1, b: s2 * s2, c, num, den, w, wp, rest: 100 - wp }, params: { s1, s2, rho },
            };
          }
        }
        // level 3: the capital market line
        for (;;) {
          const Rf = r.pick([2, 3, 4, 5]), ET = Rf + r.int(4, 10), sT = r.int(12, 25), kind = r.pick(["return", "risk"]);
          const slope = (ET - Rf) / sT;
          const g = graph({
            view: [-0.18 * sT * 1.6, sT * 1.6, -1.5, ET + (ET - Rf) * 0.7],
            items: [
              { t: "fn", e: `${Rf} + ${ET - Rf}/${sT}*x`, role: "primary" },
              { t: "pt", x: 0, y: Rf, label: `Rf ${Rf}%` },
              { t: "pt", x: sT, y: ET, label: `T (${sT}%, ${ET}%)` },
            ],
          });
          const steps0 = `The CML: ${iv("E")}[${iv("R")}<sub>${iv("p")}</sub>] = ${iv("R")}<sub>${iv("f")}</sub> + ${M.frac(`${iv("E")}[${iv("R")}<sub>${iv("T")}</sub>] − ${iv("R")}<sub>${iv("f")}</sub>`, `${iv("σ")}<sub>${iv("T")}</sub>`)}${iv("σ")}<sub>${iv("p")}</sub>, with slope (the Sharpe ratio) ${M.frac(`${n(ET)} − ${n(Rf)}`, n(sT))} = ${M.frac(n(ET - Rf), n(sT))}.`;
          if (kind === "return") {
            const sp = r.int(4, Math.round(sT * 1.5)), E = Rf + slope * sp, y = sp / sT;
            if (sp === sT || tie(E, 2)) continue;
            return {
              prompt: `The risk-free rate is ${pc(Rf)} and the tangency portfolio has expected return ${pc(ET)} and volatility ${pc(sT)}. An investor on the capital market line wants a volatility of ${pc(sp)}. What expected return does she get? Give a percent rounded to 2 decimal places.`,
              graph: g,
              steps: [
                steps0,
                `${iv("E")}[${iv("R")}<sub>${iv("p")}</sub>] = ${n(Rf)} + ${M.frac(n(ET - Rf), n(sT))} × ${n(sp)} ${eqp(E)}.`,
                `She holds ${M.frac(n(sp), n(sT))} ${eqp(y * 100)} of her money in the tangency portfolio${y > 1 ? ", borrowing the rest at the risk-free rate" : " and the rest in the risk-free asset"}.`,
              ],
              answer: { kind: "number", value: E, dp: 2 }, answerText: pc(E), answerInput: typed(E),
              vals: { prem: ET - Rf, E, y: y * 100 }, params: { Rf, ET, sT, sp, kind },
            };
          }
          const Ep = Rf + r.int(1, Math.round((ET - Rf) * 1.5)), sp = (Ep - Rf) / slope;
          if (Ep === ET || tie(sp, 2)) continue;
          return {
            prompt: `The risk-free rate is ${pc(Rf)} and the tangency portfolio has expected return ${pc(ET)} and volatility ${pc(sT)}. What volatility must an investor on the capital market line accept to expect ${pc(Ep)}? Give a percent rounded to 2 decimal places.`,
            graph: g,
            steps: [
              steps0,
              `Solve ${n(Ep)} = ${n(Rf)} + ${M.frac(n(ET - Rf), n(sT))}${iv("σ")}<sub>${iv("p")}</sub>: ${iv("σ")}<sub>${iv("p")}</sub> = ${M.frac(`(${n(Ep)} − ${n(Rf)}) × ${n(sT)}`, n(ET - Rf))} = ${M.frac(n((Ep - Rf) * sT), n(ET - Rf))} ${eqp(sp)}.`,
            ],
            answer: { kind: "number", value: sp, dp: 2 }, answerText: pc(sp), answerInput: typed(sp),
            vals: { prem: ET - Rf, sp, num: (Ep - Rf) * sT }, params: { Rf, ET, sT, Ep, kind },
          };
        }
      },
    },

    // ---- FN.13 CAPM and beta ---------------------------------------------------------------------------
    "FN.13": {
      title: "CAPM, beta and alpha",
      generate(r, level) {
        if (level === 1) {
          const Rf = r.pick([2, 2.5, 3, 3.5, 4, 4.5, 5]), Rm = r.int(7, 12), b = r.int(4, 20) / 10, prem = Rm - Rf, E = Rf + b * prem;
          return {
            prompt: `The risk-free rate is ${pc(Rf)}, the market is expected to return ${pc(Rm)}, and a stock has beta ${n(b)}. What return does CAPM predict for the stock? Give a percent.`,
            steps: [
              `Market risk premium: ${pc(Rm)} − ${pc(Rf)} = ${pc(prem)}.`,
              `${iv("E")}[${iv("R")}<sub>${iv("i")}</sub>] = ${iv("R")}<sub>${iv("f")}</sub> + β(${iv("E")}[${iv("R")}<sub>${iv("m")}</sub>] − ${iv("R")}<sub>${iv("f")}</sub>) = ${pc(Rf)} + ${n(b)} × ${pc(prem)} = ${pc(Rf)} + ${pc(b * prem, 4)} = ${pc(E, 4)}.`,
            ],
            answer: { kind: "number", value: E }, answerText: pc(E, 4), answerInput: typed(E, 6),
            vals: { prem, bp: b * prem, E }, params: { Rf, Rm, b },
          };
        }
        if (level === 2) {
          const Rf = r.pick([2, 3, 4, 5]), Rm = r.int(8, 12), prem = Rm - Rf;
          if (r.chance(0.5)) {
            const tot = r.pick([100000, 200000, 50000]), a = r.int(2, 8) * tot / 20, b2 = r.int(2, 8) * tot / 20, c = tot - a - b2;
            const amts = [a, b2, c], bs = [r.int(5, 18) / 10, r.int(5, 18) / 10, r.int(3, 15) / 10];
            const ws = amts.map((x) => x / tot), terms = ws.map((w, k) => w * bs[k]), bp = sum(terms), E = Rf + bp * prem;
            return {
              prompt: `A portfolio holds ${amts.map((x, k) => `${cash(x)} of a stock with beta ${n(bs[k])}`).join(", ")}. The risk-free rate is ${pc(Rf)} and the market is expected to return ${pc(Rm)}. What is the portfolio's CAPM expected return? Give a percent rounded to 2 decimal places.`,
              steps: [
                `Weights out of ${cash(tot)}: ${ws.map((w) => n(w)).join(", ")}.`,
                `Betas average with the weights: β<sub>${iv("p")}</sub> = ${ws.map((w, k) => `${n(w)} × ${n(bs[k])}`).join(" + ")} = ${fmt(bp, 6)}.`,
                `${iv("E")}[${iv("R")}<sub>${iv("p")}</sub>] = ${pc(Rf)} + ${fmt(bp, 6)} × (${pc(Rm)} − ${pc(Rf)}) = ${pc(Rf)} + ${fmt(bp, 6)} × ${pc(prem)} ${eqp(E)}.`,
              ],
              answer: { kind: "number", value: E, dp: 2 }, answerText: pc(E), answerInput: typed(E),
              vals: { tot, ws, terms, bp, prem, E }, params: { amts, bs, Rf, Rm, kind: "portfolio" },
            };
          }
          const rho = r.pick([0.3, 0.4, 0.5, 0.6, 0.7, 0.8]), si = r.int(15, 50), sm = r.pick([15, 16, 18, 20]), b = (rho * si) / sm, E = Rf + b * prem;
          return {
            prompt: `A stock's returns have volatility ${pc(si)} and correlation ${n(rho)} with the market, whose volatility is ${pc(sm)}. The risk-free rate is ${pc(Rf)} and the market is expected to return ${pc(Rm)}. What is the stock's CAPM expected return? Give a percent rounded to 2 decimal places.`,
            steps: [
              `β = ρ${M.frac(`${iv("σ")}<sub>${iv("i")}</sub>`, `${iv("σ")}<sub>${iv("m")}</sub>`)} = ${n(rho)} × ${M.frac(n(si), n(sm))} ${eqn(b, 6)}.`,
              `${iv("E")}[${iv("R")}<sub>${iv("i")}</sub>] = ${pc(Rf)} + ${fmt(b, 6)} × (${pc(Rm)} − ${pc(Rf)}) = ${pc(Rf)} + ${fmt(b, 6)} × ${pc(prem)} ${eqp(E)}.`,
            ],
            answer: { kind: "number", value: E, dp: 2 }, answerText: pc(E), answerInput: typed(E),
            vals: { b, prem, E }, params: { rho, si, sm, Rf, Rm, kind: "rho" },
          };
        }
        // level 3: Jensen's alpha against the security market line, or the risk decomposition
        if (r.chance(0.6)) {
          for (;;) {
            const Rf = r.pick([2, 3, 4]), Rm = r.int(6, 14), b = r.int(5, 18) / 10, Ri = r.int(2, 22), req = Rf + b * (Rm - Rf), alpha = Ri - req;
            if (Math.abs(alpha) < 0.5) continue;
            const top = Math.max(Ri, Rf + 2 * (Rm - Rf)) + 3;
            return {
              prompt: `Last year a fund with beta ${n(b)} returned ${pc(Ri)}, while the market returned ${pc(Rm)} and Treasury bills ${pc(Rf)}. What was the fund's Jensen's alpha? Give a percent.`,
              graph: graph({
                view: [-0.35, 2.2, -1.5, top],
                items: [
                  { t: "fn", e: `${Rf} + ${Rm - Rf}*x`, role: "muted" },
                  { t: "pt", x: 1, y: Rm, label: "market", role: "secondary" },
                  { t: "pt", x: b, y: Ri, label: "fund", role: "highlight" },
                  { t: "text", x: 1.9, y: Rf + 1.9 * (Rm - Rf) + 1.2, s: "SML" },
                ],
              }),
              steps: [
                `CAPM's required return for beta ${n(b)}: ${pc(Rf)} + ${n(b)} × (${pc(Rm)} − ${pc(Rf)}) = ${pc(Rf)} + ${n(b)} × ${pc(Rm - Rf)} = ${pc(req, 4)}.`,
                `α = ${iv("R")}<sub>${iv("i")}</sub> − required = ${pc(Ri)} − ${pc(req, 4)} = ${pc(alpha, 4)}.`,
                `The fund plots ${alpha > 0 ? "above" : "below"} the security market line: it ${alpha > 0 ? "beat" : "fell short of"} what its market risk alone would earn.`,
              ],
              answer: { kind: "number", value: alpha }, answerText: pc(alpha, 4), answerInput: typed(alpha, 6),
              vals: { prem: Rm - Rf, req, alpha }, params: { Rf, Rm, b, Ri, kind: "alpha" },
            };
          }
        }
        for (;;) {
          const b = r.int(5, 15) / 10, sm = r.pick([15, 16, 18, 20]), si = r.int(25, 60), sys = b * b * sm * sm, tot = si * si, idio = tot - sys;
          if (idio <= 0) continue;
          const se = Math.sqrt(idio), share = (sys / tot) * 100;
          if (tie(se, 2) || tie(share, 2)) continue;
          return {
            prompt: `A stock has beta ${n(b)} and total volatility ${pc(si)}; the market's volatility is ${pc(sm)}. What is the stock's idiosyncratic (diversifiable) volatility? Give a percent rounded to 2 decimal places.`,
            steps: [
              `Split the variance: ${pow(iv("σ"), 2)}<sub>${iv("i")}</sub> = ${pow("β", 2)}${pow(iv("σ"), 2)}<sub>${iv("m")}</sub> + ${pow(iv("σ"), 2)}<sub>ε</sub>, working in %².`,
              `Systematic part: ${pow(n(b), 2)} × ${pow(n(sm), 2)} = ${n(b * b)} × ${n(sm * sm)} = ${n(sys)}. Total: ${pow(n(si), 2)} = ${n(tot)}.`,
              `${pow(iv("σ"), 2)}<sub>ε</sub> = ${n(tot)} − ${n(sys)} = ${n(idio)}, so ${iv("σ")}<sub>ε</sub> = ${M.sqrt(n(idio))} ${eqp(se)}.`,
              `Only the systematic share, ${M.frac(n(sys), n(tot))} ${eqp(share)} of the variance, earns a risk premium under CAPM.`,
            ],
            answer: { kind: "number", value: se, dp: 2 }, answerText: pc(se), answerInput: typed(se),
            vals: { b2: b * b, sm2: sm * sm, sys, tot, idio, se, share }, params: { b, sm, si, kind: "split" },
          };
        }
      },
    },

    // ---- FN.beta-estimation Estimating beta; levered and unlevered beta --------------------------------
    "FN.beta-estimation": {
      title: "Estimating, adjusting and relevering beta",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.5)) {
            const sx = r.pick([9, 16, 20, 25, 36]), b = r.int(6, 18) / 10, sxy = (b * sx) / 10000, sx2 = sx / 10000;
            return {
              prompt: `From monthly excess returns, the sample covariance of a stock with the market is ${fmt(sxy, 6)} and the sample variance of the market is ${fmt(sx2, 6)}. What is the stock's estimated beta?`,
              steps: [`The OLS slope is covariance over market variance: β̂ = ${M.frac(fmt(sxy, 6), fmt(sx2, 6))} = ${n(b)}.`],
              answer: { kind: "number", value: b }, answerText: n(b), answerInput: typed(b, 6),
              vals: { b }, params: { sxy, sx2, kind: "ols" },
            };
          }
          const b = r.int(4, 25) / 10, adj = 0.67 * b + 0.33;
          return {
            prompt: `A regression gives a raw beta of ${n(b)}. What is the Blume-adjusted beta, 0.67β̂ + 0.33?`,
            steps: [
              `0.67 × ${n(b)} = ${fmt(0.67 * b, 6)}; add 0.33: ${fmt(adj, 6)}.`,
              `The adjustment pulls beta toward 1, since betas tend to revert to the market average.`,
            ],
            answer: { kind: "number", value: adj }, answerText: fmt(adj, 6), answerInput: typed(adj, 6),
            vals: { p: 0.67 * b, adj }, params: { b, kind: "blume" }, consts: [0.67, 0.33],
          };
        }
        if (level === 2) {
          for (;;) {
            const T = r.pick([20, 21, 25, 30, 35]), de = r.pick([0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 1, 1.5]), f = 1 + (1 - T / 100) * de;
            if (r.chance(0.5)) {
              const bL = r.int(8, 22) / 10, bU = bL / f;
              if (tie(bU, 2)) continue;
              return {
                prompt: `A company has an equity beta of ${n(bL)}, a debt-to-equity ratio of ${n(de)} and ${an(T)} ${pc(T)} tax rate. What is its unlevered (asset) beta? Round to 2 decimal places.`,
                steps: [
                  `Hamada: β<sub>${iv("U")}</sub> = ${M.frac(`β<sub>${iv("L")}</sub>`, `1 + (1 − ${iv("T")}<sub>${iv("c")}</sub>)${iv("D")}/${iv("E")}`)}.`,
                  `1 + (1 − ${n(T / 100)}) × ${n(de)} = 1 + ${n(1 - T / 100)} × ${n(de)} = ${fmt(f, 6)}.`,
                  `β<sub>${iv("U")}</sub> = ${M.frac(n(bL), fmt(f, 6))} ${eqn(bU, 2)}: the risk of the business with the debt stripped out.`,
                ],
                answer: { kind: "number", value: bU, dp: 2 }, answerText: fmt(bU, 2), answerInput: typed(bU),
                vals: { t: T / 100, t1: 1 - T / 100, f, bU }, params: { bL, T, de, kind: "unlever" },
              };
            }
            const bU = r.int(5, 15) / 10, bL = bU * f;
            return {
              prompt: `A business has an unlevered beta of ${n(bU)}. If it is financed with a debt-to-equity ratio of ${n(de)} and pays ${an(T)} ${pc(T)} tax rate, what is its equity beta? Give the exact value.`,
              steps: [
                `Relever: β<sub>${iv("L")}</sub> = β<sub>${iv("U")}</sub>[1 + (1 − ${iv("T")}<sub>${iv("c")}</sub>)${M.frac(iv("D"), iv("E"))}].`,
                `1 + ${n(1 - T / 100)} × ${n(de)} = ${fmt(f, 6)}, so β<sub>${iv("L")}</sub> = ${n(bU)} × ${fmt(f, 6)} = ${fmt(bL, 6)}. Debt makes the equity riskier.`,
              ],
              answer: { kind: "number", value: bL }, answerText: fmt(bL, 6), answerInput: typed(bL, 6),
              vals: { t1: 1 - T / 100, f, bL }, params: { bU, T, de, kind: "relever" },
            };
          }
        }
        // level 3: OLS beta from data, or relevering a comparable firm's beta
        if (r.chance(0.5)) {
          for (;;) {
            const xs = Array.from({ length: 5 }, () => r.int(-6, 8)), ys = xs.map((x) => Math.round(x * r.int(5, 18) / 10) + r.int(-3, 3));
            const sx = sum(xs), sy = sum(ys);
            if (sx % 5 || sy % 5 || new Set(xs).size < 4) continue;
            const mx = sx / 5, my = sy / 5, dx = xs.map((x) => x - mx), dy = ys.map((y) => y - my);
            const sxy = sum(dx.map((d, k) => d * dy[k])), sxx = sum(dx.map((d) => d * d));
            if (sxx === 0) continue;
            const b = new Frac(sxy, sxx);
            if (b.value < 0.3 || b.value > 2.5 || tie(b.value, 2)) continue;
            const lo = Math.min(...xs) - 2, hi = Math.max(...xs) + 2, ylo = Math.min(...ys) - 2, yhi = Math.max(...ys) + 2;
            return {
              prompt: `Five months of excess returns (in %) for the market (${iv("x")}) and a stock (${iv("y")}) are shown in the table and the scatter plot. Estimate the stock's beta by least squares. Round to 2 decimal places.${M.table(["month", "1", "2", "3", "4", "5"], [[iv("x"), ...xs.map((x) => n(x))], [iv("y"), ...ys.map((y) => n(y))]])}`,
              graph: graph({ view: [Math.min(lo, -1), Math.max(hi, 1), Math.min(ylo, -1), Math.max(yhi, 1)], items: xs.map((x, k) => ({ t: "pt", x, y: ys[k] })) }),
              steps: [
                `Means: ${M.v("x̄")} = ${M.frac(n(sx), "5")} = ${n(mx)} and ${M.v("ȳ")} = ${M.frac(n(sy), "5")} = ${n(my)}.`,
                `Deviations ${iv("x")} − ${M.v("x̄")}: ${dx.map((d) => n(d)).join(", ")}; ${iv("y")} − ${M.v("ȳ")}: ${dy.map((d) => n(d)).join(", ")}.`,
                `Σ(${iv("x")} − ${M.v("x̄")})(${iv("y")} − ${M.v("ȳ")}) = ${dx.map((d, k) => `${np(d)} · ${np(dy[k])}`).join(" + ")} = ${n(sxy)}.`,
                `Σ${pow(`(${iv("x")} − ${M.v("x̄")})`, 2)} = ${dx.map((d) => pow(np(d), 2)).join(" + ")} = ${n(sxx)}.`,
                `β̂ = ${M.frac(n(sxy), n(sxx))} ${eqn(b.value, 2)}.`,
              ],
              answer: { kind: "number", value: b.value, dp: 2 }, answerText: fmt(b.value, 2), answerInput: typed(b.value),
              vals: { sx, sy, mx, my, dx, dy, sxy, sxx, b: fracVal(b), months: [3, 4, 5] }, params: { xs, ys, kind: "ols" }, consts: [5],
            };
          }
        }
        for (;;) {
          const T = r.pick([21, 25, 30]), bC = r.int(9, 20) / 10, deC = r.pick([0.25, 0.4, 0.5, 0.6, 0.8, 1]), deT = r.pick([0, 0.2, 0.3, 0.5, 0.75, 1.2].filter((x) => x !== deC));
          const t1 = 1 - T / 100, fC = 1 + t1 * deC, bU = bC / fC, fT = 1 + t1 * deT, bL = bU * fT;
          if (tie(bL, 2) || P.round(P.round(bU, 6) * fT, 2) !== P.round(bL, 2)) continue;
          return {
            prompt: `A private company wants its equity beta. A comparable public firm has equity beta ${n(bC)} and debt-to-equity ${n(deC)}. The private company plans a debt-to-equity ratio of ${n(deT)}; both pay ${an(T)} ${pc(T)} tax rate. Unlever the comparable's beta and relever it to the target structure. Round to 2 decimal places.`,
            steps: [
              `Unlever: β<sub>${iv("U")}</sub> = ${M.frac(n(bC), `1 + ${n(t1)} × ${n(deC)}`)} = ${M.frac(n(bC), fmt(fC, 6))} ${eqn(bU, 6)}.`,
              `Relever at ${iv("D")}/${iv("E")} = ${n(deT)}: β<sub>${iv("L")}</sub> = ${fmt(bU, 6)} × (1 + ${n(t1)} × ${n(deT)}) = ${fmt(bU, 6)} × ${fmt(fT, 6)} ${eqn(bL, 2)}.`,
            ],
            answer: { kind: "number", value: bL, dp: 2 }, answerText: fmt(bL, 2), answerInput: typed(bL),
            vals: { t1, fC, bU, fT, bL }, params: { T, bC, deC, deT, kind: "comparable" },
          };
        }
      },
    },

    // ---- FN.12 Sharpe ratio and risk-adjusted return ----------------------------------------------------
    "FN.12": {
      title: "Sharpe, Treynor, information and Sortino ratios",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const Rf = r.pick([2, 3, 4, 5]), E = Rf + r.int(2, 12), s = r.int(8, 30), S = (E - Rf) / s;
            if (tie(S, 2)) continue;
            return {
              prompt: `A fund is expected to return ${pc(E)} with volatility ${pc(s)}; the risk-free rate is ${pc(Rf)}. What is its Sharpe ratio? Round to 2 decimal places.`,
              steps: [
                `Excess return: ${pc(E)} − ${pc(Rf)} = ${pc(E - Rf)}.`,
                `${iv("S")} = ${M.frac("excess return", "volatility")} = ${M.frac(n(E - Rf), n(s))} ${eqn(S, 2)}.`,
              ],
              answer: { kind: "number", value: S, dp: 2 }, answerText: fmt(S, 2), answerInput: typed(S),
              vals: { ex: E - Rf, S }, params: { Rf, E, s },
            };
          }
        }
        if (level === 2) {
          const kind = r.pick(["compare", "treynor", "ir"]);
          if (kind === "compare") {
            for (;;) {
              const Rf = r.pick([2, 3, 4]), EA = Rf + r.int(3, 10), sA = r.int(8, 25), EB = Rf + r.int(3, 12), sB = r.int(8, 30);
              const SA = (EA - Rf) / sA, SB = (EB - Rf) / sB;
              if (Math.abs(SA - SB) < 0.02 || EA === EB || (EA > EB) === (SA > SB)) continue;
              const best = SA > SB ? 0 : 1;
              return {
                prompt: `Fund A expects ${pc(EA)} with volatility ${pc(sA)}; fund B expects ${pc(EB)} with volatility ${pc(sB)}. The risk-free rate is ${pc(Rf)}. Which fund offers more excess return per unit of risk?`,
                steps: [
                  `Compare Sharpe ratios. A: ${M.frac(`${n(EA)} − ${n(Rf)}`, n(sA))} = ${M.frac(n(EA - Rf), n(sA))} ${eqn(SA, 4)}.`,
                  `B: ${M.frac(`${n(EB)} − ${n(Rf)}`, n(sB))} = ${M.frac(n(EB - Rf), n(sB))} ${eqn(SB, 4)}.`,
                  `Fund ${"AB"[best]} has the higher Sharpe ratio, even though fund ${"AB"[1 - best]} has the higher expected return.`,
                ],
                answer: { kind: "choice", options: ["Fund A", "Fund B"], index: best }, answerText: `Fund ${"AB"[best]}`,
                vals: { xA: EA - Rf, xB: EB - Rf, SA, SB }, params: { Rf, EA, sA, EB, sB, kind },
              };
            }
          }
          if (kind === "treynor") {
            for (;;) {
              const Rf = r.pick([2, 3, 4]), E = Rf + r.int(2, 12), b = r.int(5, 18) / 10, Tr = (E - Rf) / b;
              if (tie(Tr, 2)) continue;
              return {
                prompt: `A diversified portfolio is expected to return ${pc(E)} and has beta ${n(b)}; the risk-free rate is ${pc(Rf)}. What is its Treynor ratio (in percent per unit of beta)? Round to 2 decimal places.`,
                steps: [
                  `Treynor divides the excess return by systematic risk, beta: ${M.frac(`${pc(E)} − ${pc(Rf)}`, n(b))} = ${M.frac(pc(E - Rf), n(b))} ${eqp(Tr)}.`,
                  `It suits a well-diversified portfolio, whose remaining risk is mostly market risk.`,
                ],
                answer: { kind: "number", value: Tr, dp: 2 }, answerText: `${pc(Tr)} per unit of beta`, answerInput: typed(Tr),
                vals: { ex: E - Rf, Tr }, params: { Rf, E, b, kind },
              };
            }
          }
          for (;;) {
            const Rb = r.int(4, 12), Rp = Rb + r.nonzero(-3, 5) / 2, te = r.pick([1.5, 2, 2.5, 3, 4, 5]), IR = (Rp - Rb) / te;
            if (tie(IR, 2)) continue;
            return {
              prompt: `An active fund returned ${pc(Rp)} a year on average while its benchmark returned ${pc(Rb)}. Its tracking error (the volatility of the return difference) is ${pc(te)}. What is its information ratio? Round to 2 decimal places.`,
              steps: [
                `Active return: ${pc(Rp)} − ${pc(Rb)} = ${pc(Rp - Rb)}.`,
                `IR = ${M.frac("active return", "tracking error")} = ${M.frac(n(Rp - Rb), n(te))} ${eqn(IR, 2)}.`,
              ],
              answer: { kind: "number", value: IR, dp: 2 }, answerText: fmt(IR, 2), answerInput: typed(IR),
              vals: { act: Rp - Rb, IR }, params: { Rp, Rb, te, kind },
            };
          }
        }
        // level 3: Sortino ratio from data
        for (;;) {
          const xs = Array.from({ length: 6 }, () => r.int(-6, 9)), Rf = r.pick([0, 0.5]);
          const downs = xs.filter((x) => x < 0);
          if (downs.length < 2 || downs.length > 4) continue;
          const mean = sum(xs) / 6, sq = downs.map((x) => x * x), ssq = sum(sq), dd2 = ssq / 6, dd = Math.sqrt(dd2), so = (mean - Rf) / dd;
          if (mean <= Rf || tie(so, 2) || P.round((P.round(mean, 6) - Rf) / P.round(dd, 6), 2) !== P.round(so, 2)) continue;
          return {
            prompt: `A strategy's monthly returns were ${xs.map((x) => pc(x)).join(", ")}. With a monthly risk-free rate of ${pc(Rf)} and a downside target of 0%, what is its monthly Sortino ratio? Round to 2 decimal places.`,
            steps: [
              `Mean return: ${M.frac(`${xs.map((x) => n(x)).join(" + ").replace(/\+ −/g, "− ")} = ${n(sum(xs))}`, "6")} ${eqp(mean, 6)}.`,
              `Downside deviation counts only returns below the 0% target: the shortfalls ${downs.map((x) => n(x)).join(", ")} square to ${sq.map((x) => n(x)).join(", ")}, summing to ${n(ssq)}; the other months contribute 0.`,
              `${iv("σ")}<sub>down</sub> = ${M.sqrt(M.frac(n(ssq), "6"))} ${eqn(dd, 6)} (percent).`,
              `Sortino = ${M.frac(`${fmt(mean, 6)} − ${n(Rf)}`, fmt(dd, 6))} ${eqn(so, 2)}.`,
            ],
            answer: { kind: "number", value: so, dp: 2 }, answerText: fmt(so, 2), answerInput: typed(so),
            vals: { tot: sum(xs), mean, sq, ssq, dd, so }, params: { xs, Rf }, consts: [6],
          };
        }
      },
    },

    // ---- FN.wacc Weighted average cost of capital -------------------------------------------------------
    "FN.wacc": {
      title: "Weighted average cost of capital",
      generate(r, level) {
        if (level === 1) {
          const V = r.pick([100, 200, 400, 500, 1000]), we = r.int(4, 9) / 10, E = V * we, D = V - E;
          const rE = r.int(8, 15), rD = r.int(8, 16) / 2, T = r.pick([21, 25, 30]);
          const t1 = 1 - T / 100, a = we * rE, b = (1 - we) * rD * t1, W = a + b;
          return {
            prompt: `A firm's equity is worth $${n(E)} million and its debt $${n(D)} million. Its cost of equity is ${pc(rE)}, its cost of debt ${pc(rD)} and its tax rate ${pc(T)}. What is its WACC? Give a percent.`,
            steps: [
              `${iv("V")} = ${iv("E")} + ${iv("D")} = ${n(E)} + ${n(D)} = ${n(V)}, so ${M.frac(iv("E"), iv("V"))} = ${n(we)} and ${M.frac(iv("D"), iv("V"))} = ${n(1 - we)}.`,
              `Interest is tax-deductible, so the after-tax cost of debt is ${pc(rD)} × (1 − ${n(T / 100)}) = ${pc(rD * t1, 4)}.`,
              `WACC = ${n(we)} × ${pc(rE)} + ${n(1 - we)} × ${pc(rD * t1, 4)} = ${pc(a, 4)} + ${pc(b, 4)} = ${pc(W, 4)}.`,
            ],
            answer: { kind: "number", value: W }, answerText: pc(W, 4), answerInput: typed(W, 6),
            vals: { E, D, we, wd: 1 - we, t: T / 100, rDa: rD * t1, a, b, W }, params: { V, we, rE, rD, T },
          };
        }
        if (level === 2) {
          for (;;) {
            const sh = r.int(10, 200), px = r.int(10, 120), E = sh * px, D = r.int(1, 12) * 100 * Math.max(1, Math.round(E / 2000));
            const Rf = r.pick([3, 3.5, 4, 4.5]), b = r.int(7, 16) / 10, mrp = r.pick([5, 5.5, 6]), rD = r.int(8, 16) / 2, T = r.pick([21, 25]);
            const rE = Rf + b * mrp, V = E + D, wE = E / V, wD = D / V, rDa = rD * (1 - T / 100), W = wE * rE + wD * rDa;
            if (D > 1.5 * E || tie(W, 2)) continue;
            return {
              prompt: `A company has ${n(sh)} million shares trading at ${cash(px)} and $${P.grouped(D)} million of debt yielding ${pc(rD)}. Its equity beta is ${n(b)}, the risk-free rate is ${pc(Rf)}, the market risk premium is ${pc(mrp)} and the tax rate is ${pc(T)}. What is its WACC? Give a percent rounded to 2 decimal places.`,
              steps: [
                `Market value of equity: ${n(sh)} million × ${cash(px)} = $${P.grouped(E)} million; ${iv("V")} = ${P.grouped(E)} + ${P.grouped(D)} = ${P.grouped(V)}.`,
                `Weights: ${M.frac(P.grouped(E), P.grouped(V))} ${eqn(wE, 6)} and ${M.frac(P.grouped(D), P.grouped(V))} ${eqn(wD, 6)}.`,
                `Cost of equity by CAPM: ${pc(Rf)} + ${n(b)} × ${pc(mrp)} = ${pc(rE, 4)}. After-tax cost of debt: ${pc(rD)} × ${n(1 - T / 100)} = ${pc(rDa, 4)}.`,
                `WACC = ${fmt(wE, 6)} × ${pc(rE, 4)} + ${fmt(wD, 6)} × ${pc(rDa, 4)} ${eqp(W)}.`,
              ],
              answer: { kind: "number", value: W, dp: 2 }, answerText: pc(W), answerInput: typed(W),
              vals: { E, V, wE, wD, rE, t1: 1 - T / 100, rDa, W }, params: { sh, px, D, Rf, b, mrp, rD, T },
            };
          }
        }
        // level 3: from a target debt-to-equity ratio, or backing out the cost of equity
        const target = r.chance(0.5);
        for (;;) {
          const de = r.pick([0.25, 0.5, 0.6, 1, 1.5]), T = r.pick([21, 25, 30]), rD = r.int(8, 14) / 2, t1 = 1 - T / 100;
          const wE = new Frac(1).div(new Frac(Math.round(de * 100), 100).add(1)), wD = new Frac(1).sub(wE), rDa = rD * t1;
          if (target) {
            const Rf = r.pick([3, 4, 5]), b = r.int(8, 18) / 10, mrp = r.pick([5, 6]), rE = Rf + b * mrp, W = wE.value * rE + wD.value * rDa;
            if (tie(W, 2)) continue;
            return {
              prompt: `A firm targets a debt-to-equity ratio of ${n(de)}. Its equity beta is ${n(b)}, the risk-free rate ${pc(Rf)}, the market risk premium ${pc(mrp)}, its pre-tax cost of debt ${pc(rD)} and its tax rate ${pc(T)}. What is its WACC? Give a percent rounded to 2 decimal places.`,
              steps: [
                `From ${M.frac(iv("D"), iv("E"))} = ${n(de)}: ${M.frac(iv("E"), iv("V"))} = ${M.frac("1", `1 + ${n(de)}`)} = ${M.f(wE)} and ${M.frac(iv("D"), iv("V"))} = ${M.f(wD)}.`,
                `${iv("r")}<sub>${iv("E")}</sub> = ${pc(Rf)} + ${n(b)} × ${pc(mrp)} = ${pc(rE, 4)}; after-tax ${iv("r")}<sub>${iv("D")}</sub> = ${pc(rD)} × ${n(t1)} = ${pc(rDa, 4)}.`,
                `WACC = ${M.f(wE)} × ${pc(rE, 4)} + ${M.f(wD)} × ${pc(rDa, 4)} ${eqp(W)}.`,
              ],
              answer: { kind: "number", value: W, dp: 2 }, answerText: pc(W), answerInput: typed(W),
              vals: { wE: fracVal(wE), wD: fracVal(wD), rE, t1, rDa, W }, params: { de, b, Rf, mrp, rD, T, kind: "target" },
            };
          }
          const W = r.int(14, 24) / 2, debtPart = wD.value * rDa, rE = (W - debtPart) / wE.value;
          if (rE <= W || tie(rE, 2)) continue;
          return {
            prompt: `A firm's WACC is ${pc(W)}. It has a debt-to-equity ratio of ${n(de)}, a pre-tax cost of debt of ${pc(rD)} and a tax rate of ${pc(T)}. What cost of equity does that imply? Give a percent rounded to 2 decimal places.`,
            steps: [
              `Weights from ${M.frac(iv("D"), iv("E"))} = ${n(de)}: ${M.frac(iv("E"), iv("V"))} = ${M.frac("1", `1 + ${n(de)}`)} = ${M.f(wE)}, ${M.frac(iv("D"), iv("V"))} = ${M.f(wD)}.`,
              `After-tax cost of debt: ${pc(rD)} × ${n(t1)} = ${pc(rDa, 4)}; its contribution is ${M.f(wD)} × ${pc(rDa, 4)} ${eqp(debtPart, 6)}.`,
              `Solve WACC = ${M.frac(iv("E"), iv("V"))}${iv("r")}<sub>${iv("E")}</sub> + debt part: ${iv("r")}<sub>${iv("E")}</sub> = (${n(W)} − ${fmt(debtPart, 6)}) ÷ ${M.f(wE)} ${eqp(rE)}.`,
            ],
            answer: { kind: "number", value: rE, dp: 2 }, answerText: pc(rE), answerInput: typed(rE),
            vals: { wE: fracVal(wE), wD: fracVal(wD), t1, rDa, debtPart, rE }, params: { W, de, rD, T, kind: "implied" },
          };
        }
      },
    },
    // ---- FN.16 Stock valuation and multiples ---------------------------------------------------------
    "FN.16": {
      title: "Dividend discount model and multiples",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.6)) {
            const D1 = r.int(10, 80) / 10, g = r.int(1, 4), s = r.pick([2, 2.5, 4, 5, 8]), rq = g + s, Pz = D1 / (s / 100);
            return {
              prompt: `A stock is expected to pay ${an(D1)} ${mon(D1)} dividend next year, and dividends grow ${pc(g)} a year forever. Investors require ${pc(rq)}. What is the share worth today by the Gordon growth model?`,
              steps: [
                `${iv("r")} − ${iv("g")} = ${n(rq / 100)} − ${n(g / 100)} = ${n(s / 100)}.`,
                `${iv("P")}<sub>0</sub> = ${M.frac(`${iv("D")}<sub>1</sub>`, `${iv("r")} − ${iv("g")}`)} = ${M.frac(mon(D1), n(s / 100))} ${eqm(Pz)}.`,
              ],
              answer: { kind: "number", value: Pz, dp: 2 }, answerText: P.money(Pz), answerInput: typed(Pz),
              vals: { rd: rq / 100, gd: g / 100, sd: s / 100, Pz }, params: { D1, g, rq, kind: "gordon" },
            };
          }
          const eps = r.int(100, 900) / 100, pe = r.int(8, 30), px = eps * pe;
          return {
            prompt: `Peers in an industry trade at ${n(pe)} times earnings. A company in it earned ${mon(eps)} per share. What share price does the peer P/E multiple imply?`,
            steps: [`Price = ${M.frac("P", "E")} × EPS = ${n(pe)} × ${mon(eps)} ${eqm(px)}.`],
            answer: { kind: "number", value: px, dp: 2 }, answerText: P.money(px), answerInput: typed(px),
            vals: { px }, params: { eps, pe, kind: "pe" },
          };
        }
        if (level === 2) {
          for (;;) {
            if (r.chance(0.5)) {
              const D0 = r.int(10, 60) / 10, g = r.pick([2, 3, 4, 5]), s = r.pick([2, 4, 5, 8, 10]), rq = g + s;
              const D1 = D0 * (1 + g / 100), Pz = D1 / (s / 100);
              if (tie(Pz, 2)) continue;
              return {
                prompt: `A company just paid a dividend of ${mon(D0)} per share. Dividends are expected to grow ${pc(g)} a year forever, and the required return is ${pc(rq)}. What is the share worth? Round to the nearest cent.`,
                steps: [
                  `The model needs next year's dividend, not the one just paid: ${iv("D")}<sub>1</sub> = ${mon(D0)} × ${n(1 + g / 100)} = $${fmt(D1, 4)}.`,
                  `${iv("P")}<sub>0</sub> = ${M.frac(`$${fmt(D1, 4)}`, `${n(rq / 100)} − ${n(g / 100)}`)} = ${M.frac(`$${fmt(D1, 4)}`, n(s / 100))} ${eqm(Pz)}.`,
                ],
                answer: { kind: "number", value: Pz, dp: 2 }, answerText: P.money(Pz), answerInput: typed(Pz),
                vals: { gf: 1 + g / 100, D1, rd: rq / 100, gd: g / 100, sd: s / 100, Pz }, params: { D0, g, rq, kind: "d0" },
              };
            }
            const D1 = r.int(10, 60) / 10, P0 = r.int(20, 120), g = r.pick([2, 3, 4, 5, 6]), dy = (D1 / P0) * 100, rq = dy + g;
            if (tie(rq, 2)) continue;
            return {
              prompt: `A stock trades at ${cash(P0)} and is expected to pay ${an(D1)} ${mon(D1)} dividend next year, growing ${pc(g)} a year thereafter. What required return does the price imply? Give a percent rounded to 2 decimal places.`,
              steps: [
                `Solve the Gordon model for ${iv("r")}: ${iv("r")} = ${M.frac(`${iv("D")}<sub>1</sub>`, `${iv("P")}<sub>0</sub>`)} + ${iv("g")}, the dividend yield plus growth.`,
                `Dividend yield: ${M.frac(mon(D1), cash(P0))} ${eqp(dy, 4)}.`,
                `${iv("r")} ${rel(rq, 2)} ${pc(dy, 4)} + ${pc(g)} ${eqp(rq)}.`,
              ],
              answer: { kind: "number", value: rq, dp: 2 }, answerText: pc(rq), answerInput: typed(rq),
              vals: { dy, rq }, params: { D1, P0, g, kind: "implied" },
            };
          }
        }
        // level 3: growth from ROE and retention, then the Gordon price and the implied P/E
        for (;;) {
          const eps = r.int(200, 800) / 100, pay = r.pick([0.3, 0.4, 0.5, 0.6]), roe = r.pick([10, 12, 15, 18, 20]);
          const b = P.round(1 - pay, 1), g = roe * b, rq = Math.ceil(g) + r.int(2, 6), D1 = eps * pay, Pz = D1 / ((rq - g) / 100), pe = P.round(Pz, 2) / eps;
          if (tie(Pz, 2) || tie(pe, 2) || rq - g < 1.5) continue;
          return {
            prompt: `A company will earn ${mon(eps)} per share next year and pay out ${pc(pay * 100)} of earnings as dividends. It earns a return on equity of ${pc(roe)} on the earnings it keeps, and investors require ${pc(rq)}. What is the share worth? Round to the nearest cent.`,
            steps: [
              `Retention ratio: ${iv("b")} = 1 − ${n(pay)} = ${n(b)}. Sustainable growth: ${iv("g")} = ROE × ${iv("b")} = ${pc(roe)} × ${n(b)} = ${pc(g, 4)}.`,
              `Next year's dividend: ${iv("D")}<sub>1</sub> = ${mon(eps)} × ${n(pay)} = $${fmt(D1, 4)}.`,
              `${iv("P")}<sub>0</sub> = ${M.frac(`$${fmt(D1, 4)}`, `${n(rq / 100)} − ${n(g / 100, 6)}`)} = ${M.frac(`$${fmt(D1, 4)}`, n((rq - g) / 100, 6))} ${eqm(Pz)}.`,
              `That is ${M.frac(mon(Pz), mon(eps))} ${eqn(pe, 2)} times next year's earnings.`,
            ],
            answer: { kind: "number", value: Pz, dp: 2 }, answerText: P.money(Pz), answerInput: typed(Pz),
            vals: { b, g, gd: g / 100, rd: rq / 100, sd: (rq - g) / 100, D1, Pz, pe, payPct: pay * 100 }, params: { eps, pay, roe, rq },
          };
        }
      },
    },

    // ---- FN.dcf Discounted cash flow and terminal value ------------------------------------------------
    "FN.dcf": {
      title: "Free cash flow, terminal value and DCF",
      generate(r, level) {
        if (level === 1) {
          const ebit = r.int(10, 100) * 5, T = r.pick([20, 21, 25, 30]), da = r.int(4, 40) * 2, capex = r.int(5, 60) * 2, dnwc = r.int(-10, 20);
          const nopat = ebit * (1 - T / 100), fcf = nopat + da - capex - dnwc;
          return {
            prompt: `This year a firm has EBIT of $${n(ebit)} million, a tax rate of ${pc(T)}, depreciation and amortization of $${n(da)} million, capital expenditure of $${n(capex)} million, and net working capital that ${dnwc >= 0 ? `rose by $${n(dnwc)} million` : `fell by $${n(-dnwc)} million`}. What is its free cash flow to the firm, in $ millions?`,
            steps: [
              `After-tax operating profit: ${n(ebit)} × (1 − ${n(T / 100)}) = ${n(ebit)} × ${n(1 - T / 100)} = ${n(nopat)}.`,
              `Add back the non-cash D&A, subtract reinvestment: ${n(nopat)} + ${n(da)} − ${n(capex)} ${dnwc >= 0 ? `− ${n(dnwc)}` : `+ ${n(-dnwc)}`} = ${n(fcf)}.`,
              `FCF = $${n(fcf)} million${dnwc < 0 ? " (releasing working capital frees cash)" : ""}.`,
            ],
            answer: { kind: "number", value: fcf }, answerText: `$${n(fcf)} million`, answerInput: typed(fcf, 6),
            vals: { t: T / 100, t1: 1 - T / 100, nopat, fcf }, params: { ebit, T, da, capex, dnwc },
          };
        }
        if (level === 2) {
          for (;;) {
            const W = r.pick([8, 9, 10, 11, 12]), Tn = 5, disc = Math.pow(1 + W / 100, Tn);
            if (r.chance(0.5)) {
              const f = r.int(20, 200), g = r.pick([2, 2.5, 3]), next = f * (1 + g / 100), TV = next / ((W - g) / 100), pv = TV / disc;
              if (tie(pv, 2) || P.round(P.round(TV, 4) / P.round(disc, 8), 2) !== P.round(pv, 2)) continue;
              return {
                prompt: `A DCF forecasts free cash flow of $${n(f)} million in year ${n(Tn)}, growing ${pc(g)} a year after that. The WACC is ${pc(W)}. What is the present value today of the Gordon terminal value at year ${n(Tn)}, in $ millions? Round to 2 decimal places.`,
                steps: [
                  `The terminal value is a growing perpetuity starting in year ${n(Tn + 1)}: ${iv("FCF")}<sub>${n(Tn + 1)}</sub> = ${n(f)} × ${n(1 + g / 100)} = ${fmt(next, 4)}.`,
                  `${iv("TV")}<sub>${n(Tn)}</sub> = ${M.frac(fmt(next, 4), `${n(W / 100)} − ${n(g / 100)}`)} ${eqn(TV, 4)}.`,
                  `Discount ${n(Tn)} years: ${pow(n(1 + W / 100), n(Tn))} ${eqn(disc, 8)}, so PV = ${M.frac(fmt(TV, 4), fmt(disc, 8))} ${eqn(pv, 2)}.`,
                ],
                answer: { kind: "number", value: pv, dp: 2 }, answerText: `$${fmt(pv, 2)} million`, answerInput: typed(pv),
                vals: { next, TV, disc, pv, a: 1 + W / 100, gf: 1 + g / 100, t6: Tn + 1, wd: W / 100, gd: g / 100 }, params: { f, g, W, Tn, kind: "gordon" },
              };
            }
            const e = r.int(20, 300), mult = r.int(6, 14), TV = e * mult, pv = TV / disc;
            if (tie(pv, 2) || P.round(TV / P.round(disc, 8), 2) !== P.round(pv, 2)) continue;
            return {
              prompt: `A DCF projects EBITDA of $${n(e)} million in year ${n(Tn)} and assumes the business could then be sold at ${n(mult)} times EBITDA, the peers' multiple. The WACC is ${pc(W)}. What is the present value today of that terminal value, in $ millions? Round to 2 decimal places.`,
              steps: [
                `Exit-multiple terminal value: ${n(mult)} × ${n(e)} = ${n(TV)}.`,
                `Discount ${n(Tn)} years: ${pow(n(1 + W / 100), n(Tn))} ${eqn(disc, 8)}, so PV = ${M.frac(n(TV), fmt(disc, 8))} ${eqn(pv, 2)}.`,
              ],
              answer: { kind: "number", value: pv, dp: 2 }, answerText: `$${fmt(pv, 2)} million`, answerInput: typed(pv),
              vals: { TV, disc, pv, a: 1 + W / 100 }, params: { e, mult, W, Tn, kind: "multiple" },
            };
          }
        }
        // level 3: a three-year DCF to a value per share
        for (;;) {
          const W = r.pick([8, 9, 10, 11]), g = r.pick([2, 2.5, 3]), f1 = r.int(10, 60), fs = [f1, f1 + r.int(1, 6), 0];
          fs[2] = fs[1] + r.int(1, 6);
          const a = 1 + W / 100, ds = [a, a * a, a * a * a], pvs = fs.map((f, k) => f / ds[k]), pvF = sum(pvs);
          const TV = (fs[2] * (1 + g / 100)) / ((W - g) / 100), pvTV = TV / ds[2], EV = pvF + pvTV;
          const debt = r.int(2, 30) * 10, cash0 = r.int(1, 20) * 5, eq = EV - debt + cash0, sh = r.int(5, 50), ps = eq / sh;
          const R2 = (x) => P.round(x, 2);
          if (eq <= 0 || [...pvs, TV, pvTV, pvF, EV, eq, ps].some((x) => tie(x, 2)) || !addsUp(pvs, pvF) || !addsUp([pvF, pvTV], EV)
            || !near(R2(R2(EV) - debt + cash0), R2(eq)) || R2(R2(TV) / P.round(ds[2], 6)) !== R2(pvTV) || R2(R2(eq) / sh) !== R2(ps)) continue;
          return {
            prompt: `A company is forecast to generate free cash flow of $${fs.map((f) => n(f)).join(", $")} million in years 1 to 3, growing ${pc(g)} a year after that. Its WACC is ${pc(W)}, it has $${n(debt)} million of debt and $${n(cash0)} million of cash, and ${n(sh)} million shares. What is the DCF value per share? Work in $ millions to 2 decimal places and round the answer to the nearest cent.`,
            graph: timeline(fs.map((f, k) => [k + 1, f * 1e6]), 3, { mark: [0, "value = ?"] }),
            steps: [
              `Discount each forecast: ${pvs.map((x, k) => `${M.frac(n(fs[k]), k ? pow(n(a), k + 1) : n(a))} ${eqn(x, 2)}`).join("; ")}. Sum: ${pvs.map((x) => fmt(x, 2)).join(" + ")} ${eqn(pvF, 2)}.`,
              `Terminal value at year 3: ${M.frac(`${n(fs[2])} × ${n(1 + g / 100)}`, `${n(W / 100)} − ${n(g / 100)}`)} ${eqn(TV, 2)}; today it is worth ${M.frac(fmt(TV, 2), fmt(ds[2], 6))} ${eqn(pvTV, 2)}.`,
              `Enterprise value: ${fmt(pvF, 2)} + ${fmt(pvTV, 2)} ${eqn(EV, 2)}.`,
              `Equity value: ${fmt(EV, 2)} − ${n(debt)} + ${n(cash0)} ${eqn(eq, 2)}.`,
              `Per share: ${M.frac(fmt(eq, 2), n(sh))} ${eqm(ps)}.`,
            ],
            answer: { kind: "number", value: ps, dp: 2 }, answerText: P.money(ps), answerInput: typed(ps),
            vals: { a, ds, pvs, pvF, gf: 1 + g / 100, wd: W / 100, gd: g / 100, TV, pvTV, EV, eq, ps }, params: { fs, W, g, debt, cash0, sh }, consts: [3],
          };
        }
      },
    },

    // ---- FN.20 Financial ratios and DuPont analysis -----------------------------------------------------
    "FN.20": {
      title: "ROE, liquidity, leverage and DuPont",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const kind = r.pick(["roe", "current", "de"]);
            if (kind === "roe") {
              const NI = r.int(5, 200), Eq = r.int(40, 900), roe = (NI / Eq) * 100;
              if (tie(roe, 2) || roe > 60) continue;
              return {
                prompt: `A company earned net income of $${n(NI)} million on shareholders' equity of $${n(Eq)} million. What is its return on equity? Give a percent rounded to 2 decimal places.`,
                steps: [`ROE = ${M.frac("net income", "equity")} = ${M.frac(n(NI), n(Eq))} ${eqp(roe)}.`],
                answer: { kind: "number", value: roe, dp: 2 }, answerText: pc(roe), answerInput: typed(roe),
                vals: { roe }, params: { NI, Eq, kind },
              };
            }
            const a = r.int(20, 500), b = r.int(20, 500), x = a / b;
            if (tie(x, 2) || x > 5 || x < 0.2) continue;
            const [A, B] = kind === "current" ? ["current assets", "current liabilities"] : ["total debt", "shareholders' equity"];
            return {
              prompt: `A company has ${A} of $${n(a)} million and ${B} of $${n(b)} million. What is its ${kind === "current" ? "current ratio" : "debt-to-equity ratio"}? Round to 2 decimal places.`,
              steps: [
                `${kind === "current" ? "Current ratio" : "D/E"} = ${M.frac(A, B)} = ${M.frac(n(a), n(b))} ${eqn(x, 2)}.`,
                kind === "current"
                  ? (x > 1 ? "Above 1: assets due to turn into cash within a year cover the bills due within a year." : "Below 1: short-term bills exceed the assets that turn into cash within a year.")
                  : `Lenders fund ${fmt(x, 2)} dollars for every dollar of shareholders' equity.`,
              ],
              answer: { kind: "number", value: x, dp: 2 }, answerText: fmt(x, 2), answerInput: typed(x),
              vals: { x }, params: { a, b, kind },
            };
          }
        }
        if (level === 2) {
          const m = r.pick([4, 5, 6, 8, 10, 12, 15]), turn = r.pick([0.5, 0.8, 1, 1.2, 1.5, 2, 2.5]), lev = r.pick([1.25, 1.5, 2, 2.5, 3, 4]);
          const Eq = r.int(2, 40) * 20, A = Eq * lev, S = A * turn, NI = (S * m) / 100, roe = (NI / Eq) * 100;
          return {
            prompt: `A retailer reports net income of $${gn(NI)} million on sales of $${gn(S)} million, total assets of $${gn(A)} million and shareholders' equity of $${gn(Eq)} million. Break its ROE into margin, turnover and leverage (DuPont) and give the ROE as a percent.`,
            steps: [
              `Net margin: ${M.frac(n(NI), n(S))} = ${n(m / 100)}. Asset turnover: ${M.frac(n(S), n(A))} = ${n(turn)}. Equity multiplier: ${M.frac(n(A), n(Eq))} = ${n(lev)}.`,
              `ROE = ${n(m / 100)} × ${n(turn)} × ${n(lev)} = ${fmt(roe / 100, 6)} = ${pc(roe, 4)}.`,
              `Check: ${M.frac(n(NI), n(Eq))} = ${pc(roe, 4)}; sales and assets cancel.`,
            ],
            answer: { kind: "number", value: roe }, answerText: pc(roe, 4), answerInput: typed(roe, 6),
            vals: { NI, S, A, md: m / 100, roed: roe / 100, roe }, params: { m, turn, lev, Eq },
          };
        }
        for (;;) {
          const target = r.int(12, 25), m = r.pick([4, 5, 6, 8, 10]), turn = r.pick([0.8, 1, 1.2, 1.5, 2]), rt = (m / 100) * turn, lev = target / 100 / rt, de = lev - 1;
          if (lev <= 1.05 || lev > 5 || tie(de, 2)) continue;
          return {
            prompt: `A firm has a net margin of ${pc(m)} and asset turnover of ${n(turn)}. Management wants a return on equity of ${pc(target)}. Assuming assets are financed only by debt and equity, what debt-to-equity ratio does it need? Round to 2 decimal places.`,
            steps: [
              `ROA = margin × turnover = ${n(m / 100)} × ${n(turn)} = ${n(rt, 6)}.`,
              `ROE = ROA × ${M.frac("assets", "equity")}, so the equity multiplier must be ${M.frac(n(target / 100), n(rt, 6))} ${eqn(lev, 6)}.`,
              `Assets = debt + equity, so ${M.frac("assets", "equity")} = 1 + ${M.frac("D", "E")}: ${M.frac("D", "E")} ${rel(de, 2)} ${fmt(lev, 6)} − 1 ${eqn(de, 2)}.`,
            ],
            answer: { kind: "number", value: de, dp: 2 }, answerText: fmt(de, 2), answerInput: typed(de),
            vals: { md: m / 100, rt, td: target / 100, lev, de }, params: { target, m, turn },
          };
        }
      },
    },

    // ---- FN.ratios More financial statement ratios ---------------------------------------------------------
    "FN.ratios": {
      title: "Profitability, liquidity, efficiency and valuation ratios",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const kind = r.pick(["gross", "roa", "quick", "cover", "yield", "pb"]);
            let prompt, step, x, pct = true, vals = {}, params = { kind };
            if (kind === "gross") {
              const rev = r.int(50, 900), cogs = r.int(Math.round(rev * 0.3), Math.round(rev * 0.85)), gp = rev - cogs;
              x = (gp / rev) * 100; vals = { gp, x }; params = { rev, cogs, kind };
              prompt = `A company had revenue of $${n(rev)} million and cost of goods sold of $${n(cogs)} million. What is its gross margin?`;
              step = `Gross margin = ${M.frac("revenue − COGS", "revenue")} = ${M.frac(`${n(rev)} − ${n(cogs)}`, n(rev))} = ${M.frac(n(gp), n(rev))} ${eqp(x)}.`;
            } else if (kind === "roa") {
              const NI = r.int(5, 120), TA = r.int(150, 2500); x = (NI / TA) * 100; vals = { x }; params = { NI, TA, kind };
              prompt = `A bank earned net income of $${n(NI)} million with total assets of $${gn(TA)} million. What is its return on assets?`;
              step = `ROA = ${M.frac("net income", "total assets")} = ${M.frac(n(NI), gn(TA))} ${eqp(x)}.`;
            } else if (kind === "quick") {
              const CA = r.int(60, 600), inv = r.int(10, Math.round(CA * 0.6)), CL = r.int(40, 500); x = (CA - inv) / CL; pct = false;
              vals = { qa: CA - inv, x }; params = { CA, inv, CL, kind };
              prompt = `A manufacturer has current assets of $${n(CA)} million, of which $${n(inv)} million is inventory, and current liabilities of $${n(CL)} million. What is its quick ratio?`;
              step = `Quick ratio = ${M.frac("current assets − inventory", "current liabilities")} = ${M.frac(`${n(CA)} − ${n(inv)}`, n(CL))} = ${M.frac(n(CA - inv), n(CL))} ${eqn(x, 2)}.`;
            } else if (kind === "cover") {
              const ebit = r.int(20, 600), intr = r.int(4, Math.max(5, Math.floor(ebit / 1.5))); x = ebit / intr; pct = false; vals = { x }; params = { ebit, intr, kind };
              prompt = `A company's EBIT is $${n(ebit)} million and its interest expense is $${n(intr)} million. What is its interest coverage ratio?`;
              step = `Coverage = ${M.frac("EBIT", "interest expense")} = ${M.frac(n(ebit), n(intr))} ${eqn(x, 2)}: operating profit covers the interest that many times.`;
            } else if (kind === "yield") {
              const dv = r.int(20, 400) / 100, px = r.int(15, 250); x = (dv / px) * 100; vals = { x }; params = { dv, px, kind };
              prompt = `A stock pays annual dividends of ${mon(dv)} per share and trades at ${cash(px)}. What is its dividend yield?`;
              step = `Dividend yield = ${M.frac("annual dividend", "price")} = ${M.frac(mon(dv), cash(px))} ${eqp(x)}.`;
            } else {
              const cap = r.int(50, 3000), be = r.int(30, 1500); x = cap / be; pct = false; vals = { x }; params = { cap, be, kind };
              prompt = `A company's market capitalization is $${P.grouped(cap)} million and its book equity is $${P.grouped(be)} million. What is its price-to-book ratio?`;
              step = `${M.frac("P", "B")} = ${M.frac("market cap", "book equity")} = ${M.frac(P.grouped(cap), P.grouped(be))} ${eqn(x, 2)}.`;
            }
            if (tie(x, 2)) continue;
            return {
              prompt: `${prompt} ${pct ? "Give a percent rounded to 2 decimal places." : "Round to 2 decimal places."}`,
              steps: [step], answer: { kind: "number", value: x, dp: 2 }, answerText: pct ? pc(x) : fmt(x, 2), answerInput: typed(x), vals, params,
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const kind = r.pick(["turnover", "dso", "ev"]);
            if (kind === "turnover") {
              const cogs = r.int(100, 2000), i0 = r.int(20, 300), i1 = r.int(20, 300), avg = (i0 + i1) / 2, x = cogs / avg, days = 365 / x;
              if (tie(x, 2) || tie(days, 1) || x < 1) continue;
              return {
                prompt: `A retailer's cost of goods sold was $${n(cogs)} million. Inventory was $${n(i0)} million at the start of the year and $${n(i1)} million at the end. What is its inventory turnover? Round to 2 decimal places.`,
                steps: [
                  `Average inventory: ${M.frac(`${n(i0)} + ${n(i1)}`, "2")} = ${n(avg)}.`,
                  `Inventory turnover = ${M.frac("COGS", "average inventory")} = ${M.frac(n(cogs), n(avg))} ${eqn(x, 2)} times a year, so stock sits about ${M.frac("365", fmt(x, 2))} ${eqn(days, 1)} days.`,
                ],
                answer: { kind: "number", value: x, dp: 2 }, answerText: fmt(x, 2), answerInput: typed(x),
                vals: { avg, x, days }, params: { cogs, i0, i1, kind }, consts: [365],
              };
            }
            if (kind === "dso") {
              const rev = r.int(100, 3000), ar = r.int(Math.round(rev * 0.04), Math.round(rev * 0.3)), ratio = ar / rev, x = ratio * 365;
              if (tie(x, 1) || ar < 1) continue;
              return {
                prompt: `A company had annual revenue of $${n(rev)} million and accounts receivable of $${n(ar)} million at year end. What is its days sales outstanding? Round to 1 decimal place.`,
                steps: [`DSO = ${M.frac("receivables", "revenue")} × 365 = ${M.frac(n(ar), n(rev))} × 365 ${eqn(x, 1)} days: the average time to collect from customers.`],
                answer: { kind: "number", value: x, dp: 1 }, answerText: `${fmt(x, 1)} days`, answerInput: typed(x, 1),
                vals: { x }, params: { rev, ar, kind }, consts: [365],
              };
            }
            const sh = r.int(10, 200), px = r.int(10, 150), cap = sh * px, debt = r.int(0, 40) * 25, cs = r.int(1, 30) * 10, ebit = r.int(20, 400), da = r.int(5, 120);
            const ev = cap + debt - cs, ebitda = ebit + da, x = ev / ebitda;
            if (tie(x, 2) || ev <= 0 || x > 40) continue;
            return {
              prompt: `A company has ${n(sh)} million shares at ${cash(px)}, $${n(debt)} million of debt and $${n(cs)} million of cash. Its EBIT is $${n(ebit)} million and depreciation and amortization $${n(da)} million. What is its EV/EBITDA multiple? Round to 2 decimal places.`,
              steps: [
                `Market cap: ${n(sh)} × ${n(px)} = $${P.grouped(cap)} million. EV = ${P.grouped(cap)} + ${n(debt)} − ${n(cs)} = $${P.grouped(ev)} million.`,
                `EBITDA = EBIT + D&A = ${n(ebit)} + ${n(da)} = ${n(ebitda)}.`,
                `EV/EBITDA = ${M.frac(P.grouped(ev), n(ebitda))} ${eqn(x, 2)}.`,
              ],
              answer: { kind: "number", value: x, dp: 2 }, answerText: fmt(x, 2), answerInput: typed(x),
              vals: { cap, ev, ebitda, x }, params: { sh, px, debt, cs, ebit, da, kind },
            };
          }
        }
        // level 3: an income statement to net margin or interest coverage
        for (;;) {
          const rev = r.int(200, 2000), cogs = Math.round(rev * r.int(40, 70) / 100), opex = Math.round(rev * r.int(8, 25) / 100), intr = r.int(2, 60), T = r.pick([21, 25, 30]);
          const ebit = rev - cogs - opex, ebt = ebit - intr, ni = ebt * (1 - T / 100), nm = (ni / rev) * 100, cov = ebit / intr, kind = r.pick(["margin", "cover"]);
          if (ebt <= 0 || tie(nm, 2) || tie(cov, 2)) continue;
          const table = M.table(["Item", "$ millions"], [["Revenue", gn(rev)], ["Cost of goods sold", gn(cogs)], ["Operating expenses", gn(opex)], ["Interest expense", n(intr)], ["Tax rate", pc(T)]]);
          const steps = [`EBIT = revenue − COGS − operating expenses = ${gn(rev)} − ${gn(cogs)} − ${gn(opex)} = ${gn(ebit)}.`];
          if (kind === "margin") {
            steps.push(`Pre-tax income: ${gn(ebit)} − ${n(intr)} = ${gn(ebt)}. Net income: ${gn(ebt)} × ${n(1 - T / 100)} = ${fmt(ni, 4)}.`);
            steps.push(`Net margin = ${M.frac(fmt(ni, 4), gn(rev))} ${eqp(nm)}.`);
          } else steps.push(`Interest coverage = ${M.frac("EBIT", "interest")} = ${M.frac(gn(ebit), n(intr))} ${eqn(cov, 2)}.`);
          const ans = kind === "margin" ? nm : cov;
          return {
            prompt: `From this income statement, find the ${kind === "margin" ? "net profit margin (a percent rounded to 2 decimal places)" : "interest coverage ratio (rounded to 2 decimal places)"}.${table}`,
            steps, answer: { kind: "number", value: ans, dp: 2 }, answerText: kind === "margin" ? pc(nm) : fmt(cov, 2), answerInput: typed(ans),
            vals: { ebit, ebt, t1: 1 - T / 100, ni, nm, cov }, params: { rev, cogs, opex, intr, T, kind },
          };
        }
      },
    },

    // ---- FN.14 Bond pricing and yield --------------------------------------------------------------------
    "FN.14": {
      title: "Bond prices",
      generate(r, level) {
        const bondPrice = (C, y, N, F) => C * (1 - Math.pow(1 + y, -N)) / y + F * Math.pow(1 + y, -N);
        if (level === 1) {
          if (r.chance(0.5)) {
            const c = r.int(2, 9), y = r.chance(0.2) ? c : r.intExcept(2, 9, c), idx = c > y ? 0 : c < y ? 1 : 2, yrs = r.int(3, 30);
            const opts = ["above its face value (at a premium)", "below its face value (at a discount)", "at its face value (at par)"];
            return {
              prompt: `${an(yrs, true)} ${n(yrs)}-year bond pays ${an(c)} ${pc(c)} annual coupon. Similar bonds yield ${pc(y)}. Does it trade above, below or at its face value?`,
              steps: [
                `Compare the coupon rate with the yield: ${pc(c)} ${idx === 0 ? "&gt;" : idx === 1 ? "&lt;" : "="} ${pc(y)}.`,
                idx === 0 ? "The bond pays more than the market requires, so buyers pay more than face value for it: a premium."
                  : idx === 1 ? "The bond pays less than the market requires, so its price falls below face value until its yield matches: a discount."
                    : "The coupon is exactly what the market requires, so the bond trades at par.",
              ],
              answer: { kind: "choice", options: opts, index: idx }, answerText: opts[idx],
              vals: {}, params: { c, y, yrs, kind: "class" },
            };
          }
          for (;;) {
            const y = r.pick([3, 4, 5, 6, 8, 10]), N = r.int(2, 3), F = 1000, g = Math.pow(1 + y / 100, N), Pz = F / g;
            if (tie(Pz, 2)) continue;
            return {
              prompt: `A zero-coupon bond pays $1,000 in ${n(N)} years. What is its price at a yield of ${pc(y)}, compounded annually? Round to the nearest cent.`,
              steps: [
                `A zero pays only its face value: ${iv("P")} = ${M.frac(iv("F"), pow(`(1 + ${iv("y")})`, iv("n")))}.`,
                `${pow(n(1 + y / 100), n(N))} = ${fmt(g, 8)}, so ${iv("P")} = ${M.frac("$1,000", fmt(g, 8))} ${eqm(Pz)}.`,
              ],
              answer: { kind: "number", value: Pz, dp: 2 }, answerText: P.money(Pz), answerInput: typed(Pz),
              vals: { g, Pz, a: 1 + y / 100 }, params: { y, N, F, kind: "zero" }, consts: [1000],
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const F = 1000, c = r.int(3, 9), y = r.intExcept(2, 10, c), N = r.int(3, 5), C = (F * c) / 100, yd = y / 100;
            const v = Math.pow(1 + yd, -N), af = (1 - v) / yd, pvC = C * af, pvF = F * v, Pz = pvC + pvF;
            if ([pvC, pvF, Pz].some((x) => tie(x, 2)) || !addsUp([pvC, pvF], Pz) || P.round(C * P.round(af, 8), 2) !== P.round(pvC, 2) || P.round(F * P.round(v, 8), 2) !== P.round(pvF, 2)) continue;
            return {
              prompt: `${an(N, true)} ${n(N)}-year bond with face value $1,000 pays ${an(c)} ${pc(c)} coupon once a year. What is its price if the market yield is ${pc(y)}? Round to the nearest cent.`,
              graph: timeline([...Array.from({ length: N - 1 }, (_, k) => [k + 1, C]), [N, C + F]], N, { mark: [0, "P = ?"] }),
              steps: [
                `Annual coupon: ${n(c / 100)} × $1,000 = ${cash(C)}. Discount factor for year ${n(N)}: ${pow(n(1 + yd), `−${n(N)}`)} ${eqn(v, 8)}.`,
                `Coupons are an annuity: ${cash(C)} × ${M.frac(`1 − ${fmt(v, 8)}`, n(yd))} = ${cash(C)} × ${fmt(af, 8)} ${eqm(pvC)}.`,
                `Face value: $1,000 × ${fmt(v, 8)} ${eqm(pvF)}.`,
                `Price: ${mon(pvC)} + ${mon(pvF)} ${eqm(Pz)}, ${c > y ? "above par, since the coupon rate beats the yield" : "below par, since the coupon rate is under the yield"}.`,
              ],
              answer: { kind: "number", value: Pz, dp: 2 }, answerText: P.money(Pz), answerInput: typed(Pz),
              vals: { C, cd: c / 100, v, af, pvC, pvF, Pz, a: 1 + yd, yd, cf: C + F, years: Array.from({ length: N }, (_, k) => k + 1) }, params: { F, c, y, N }, consts: [1000],
            };
          }
        }
        // level 3: semiannual coupons, or the price change when the yield moves
        if (r.chance(0.5)) {
          for (;;) {
            const F = 1000, c = r.int(2, 9), y = r.intExcept(2, 10, c), yrs = r.int(2, 10), N = 2 * yrs, C = (F * c) / 200, i = y / 200;
            const v = Math.pow(1 + i, -N), af = (1 - v) / i, pvC = C * af, pvF = F * v, Pz = pvC + pvF;
            if ([pvC, pvF, Pz].some((x) => tie(x, 2)) || !addsUp([pvC, pvF], Pz) || P.round(C * P.round(af, 8), 2) !== P.round(pvC, 2) || P.round(F * P.round(v, 8), 2) !== P.round(pvF, 2)) continue;
            return {
              prompt: `${an(yrs, true)} ${n(yrs)}-year Treasury note with face value $1,000 pays ${an(c)} ${pc(c)} coupon in two semiannual installments. What is its price at a yield of ${pc(y)} (a bond-equivalent yield, compounded semiannually)? Round to the nearest cent.`,
              steps: [
                `Per half-year: coupon ${M.frac(`${n(c / 100)} × $1,000`, "2")} = ${mon(C)}, yield ${M.frac(n(y / 100), "2")} = ${n(i)}, and ${iv("n")} = 2 × ${n(yrs)} = ${n(N)} periods.`,
                `${pow(n(1 + i), `−${n(N)}`)} ${eqn(v, 8)}, so the annuity factor is ${M.frac(`1 − ${fmt(v, 8)}`, n(i))} ${eqn(af, 8)}.`,
                `Coupons: ${mon(C)} × ${fmt(af, 8)} ${eqm(pvC)}. Face: $1,000 × ${fmt(v, 8)} ${eqm(pvF)}.`,
                `Price: ${mon(pvC)} + ${mon(pvF)} ${eqm(Pz)}.`,
              ],
              answer: { kind: "number", value: Pz, dp: 2 }, answerText: P.money(Pz), answerInput: typed(Pz),
              vals: { C, cd: c / 100, yd: y / 100, i, N, v, af, pvC, pvF, Pz, a: 1 + i }, params: { F, c, y, yrs, kind: "semi" }, consts: [1000],
            };
          }
        }
        for (;;) {
          const F = 1000, c = r.int(3, 8), N = r.int(5, 12), y1 = r.int(3, 9), dy = r.pick([-1, -0.5, 0.5, 1]), y2 = y1 + dy, C = (F * c) / 100;
          const P1 = bondPrice(C, y1 / 100, N, F), P2 = bondPrice(C, y2 / 100, N, F), d = P2 - P1;
          if ([P1, P2, d].some((x) => tie(x, 2)) || !near(P.round(P.round(P2, 2) - P.round(P1, 2), 2), P.round(d, 2))) continue;
          const v1 = Math.pow(1 + y1 / 100, -N), v2 = Math.pow(1 + y2 / 100, -N);
          return {
            prompt: `${an(N, true)} ${n(N)}-year bond with face value $1,000 pays ${an(c)} ${pc(c)} annual coupon. Its yield moves from ${pc(y1)} to ${pc(y2)}. By how much does its price change? Give a signed dollar amount rounded to the nearest cent.`,
            graph: graph({
              view: [0.5, 12, Math.floor(bondPrice(C, 0.12, N, F) / 100) * 100 - 100, Math.ceil(bondPrice(C, 0.005, N, F) / 100) * 100 + 50],
              items: [
                { t: "fn", e: `${C}*(1-(1+x/100)^(-${N}))/(x/100) + ${F}*(1+x/100)^(-${N})`, role: "primary" },
                { t: "vline", x: y1, role: "muted" }, { t: "vline", x: y2, role: "highlight" },
                { t: "text", x: 9.5, y: Math.ceil(bondPrice(C, 0.005, N, F) / 100) * 100, s: "price vs. yield (%)" },
              ],
            }),
            steps: [
              `At ${pc(y1)}: ${pow(n(1 + y1 / 100), `−${n(N)}`)} ${eqn(v1, 8)}; price = ${cash(C)} × ${M.frac(`1 − ${fmt(v1, 8)}`, n(y1 / 100))} + $1,000 × ${fmt(v1, 8)} ${eqm(P1)}.`,
              `At ${pc(y2)}: ${pow(n(1 + y2 / 100), `−${n(N)}`)} ${eqn(v2, 8)}; price = ${cash(C)} × ${M.frac(`1 − ${fmt(v2, 8)}`, n(y2 / 100))} + $1,000 × ${fmt(v2, 8)} ${eqm(P2)}.`,
              `Change: ${mon(P2)} − ${mon(P1)} ${eqm(d)}. The yield ${dy > 0 ? "rose, so the price fell" : "fell, so the price rose"}: price and yield move in opposite directions.`,
            ],
            answer: { kind: "number", value: d, dp: 2 }, answerText: P.money(d), answerInput: typed(d),
            vals: { C, y2, v1, v2, P1, P2, d, a1: 1 + y1 / 100, a2: 1 + y2 / 100, r1: y1 / 100, r2: y2 / 100 }, params: { F, c, N, y1, dy, kind: "move" }, consts: [1000],
          };
        }
      },
    },

    // ---- FN.bond-yields Bond yield measures ----------------------------------------------------------------
    "FN.bond-yields": {
      title: "Current yield, YTM, effective yield and forward rates",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const c = r.int(2, 9), Pz = r.int(850, 1150), C = c * 10, cy = (C / Pz) * 100;
            if (tie(cy, 2)) continue;
            return {
              prompt: `A bond with face value $1,000 pays ${an(c)} ${pc(c)} annual coupon and trades at ${cash(Pz)}. What is its current yield? Give a percent rounded to 2 decimal places.`,
              steps: [
                `Annual coupon: ${n(c / 100)} × $1,000 = ${cash(C)}.`,
                `Current yield = ${M.frac("annual coupon", "price")} = ${M.frac(cash(C), cash(Pz))} ${eqp(cy)}. It ignores the gain or loss as the price pulls to par.`,
              ],
              answer: { kind: "number", value: cy, dp: 2 }, answerText: pc(cy), answerInput: typed(cy),
              vals: { C, cd: c / 100, cy }, params: { c, Pz }, consts: [1000],
            };
          }
        }
        if (level === 2) {
          for (;;) {
            if (r.chance(0.5)) {
              const c = r.int(2, 9), N = r.int(3, 20), Pz = r.int(80, 120) * 10, C = c * 10, pull = (1000 - Pz) / N, top = C + pull, avg = (1000 + Pz) / 2, y = (top / avg) * 100;
              if (Pz === 1000 || tie(y, 2)) continue;
              return {
                prompt: `${an(N, true)} ${n(N)}-year bond with face value $1,000 and ${an(c)} ${pc(c)} annual coupon trades at ${cash(Pz)}. Estimate its yield to maturity with the approximation formula. Give a percent rounded to 2 decimal places.`,
                steps: [
                  `${iv("y")} ≈ ${M.frac(`${iv("C")} + (${iv("F")} − ${iv("P")})/${iv("n")}`, `(${iv("F")} + ${iv("P")})/2`)}: the coupon plus a straight-line pull to par, over the average price.`,
                  `Coupon ${cash(C)}; pull to par ${M.frac(`1000 − ${n(Pz)}`, n(N))} ${eqn(pull, 4)}; numerator ${eqn(top, 4)}.`,
                  `Average price ${M.frac(`1000 + ${n(Pz)}`, "2")} = ${n(avg)}; ${iv("y")} ≈ ${M.frac(fmt(top, 4), n(avg))} ${eqp(y)}.`,
                ],
                answer: { kind: "number", value: y, dp: 2 }, answerText: pc(y), answerInput: typed(y),
                vals: { C, pull, top, avg, y }, params: { c, N, Pz, kind: "approx" }, consts: [1000],
              };
            }
            const bey = r.int(4, 18) / 2, ys = bey / 200, eay = (Math.pow(1 + ys, 2) - 1) * 100;
            return {
              prompt: `A Treasury bond is quoted at a bond-equivalent yield of ${pc(bey)}. What is its effective annual yield? Give the exact percent.`,
              steps: [
                `The quote is twice the semiannual yield, so the yield per half-year is ${M.frac(n(bey / 100), "2")} = ${n(ys)}.`,
                `EAY = ${pow(`(1 + ${n(ys)})`, 2)} − 1 = ${fmt(Math.pow(1 + ys, 2), 8)} − 1 = ${pc(eay, 6)}.`,
              ],
              answer: { kind: "number", value: eay }, answerText: pc(eay, 6), answerInput: typed(eay, 8),
              vals: { bd: bey / 100, ys, g: Math.pow(1 + ys, 2), eay }, params: { bey, kind: "eay" },
            };
          }
        }
        for (;;) {
          if (r.chance(0.5)) {
            const s1 = r.int(4, 12) / 2, s2 = s1 + r.int(1, 4) / 2, g2 = Math.pow(1 + s2 / 100, 2), f = (g2 / (1 + s1 / 100) - 1) * 100;
            if (tie(f, 2)) continue;
            return {
              prompt: `The one-year spot rate is ${pc(s1)} and the two-year spot rate is ${pc(s2)} (annual compounding). What one-year forward rate, one year from now, do they imply? Give a percent rounded to 2 decimal places.`,
              steps: [
                `No arbitrage: ${pow(`(1 + ${iv("s")}<sub>2</sub>)`, 2)} = (1 + ${iv("s")}<sub>1</sub>)(1 + ${iv("f")}<sub>1→2</sub>).`,
                `${pow(n(1 + s2 / 100), 2)} = ${fmt(g2, 8)}, so 1 + ${iv("f")}<sub>1→2</sub> = ${M.frac(fmt(g2, 8), n(1 + s1 / 100))} ${eqn(g2 / (1 + s1 / 100), 6)}.`,
                `${iv("f")}<sub>1→2</sub> ${eqp(f)}, above both spot rates because the curve slopes up.`,
              ],
              answer: { kind: "number", value: f, dp: 2 }, answerText: pc(f), answerInput: typed(f),
              vals: { a1: 1 + s1 / 100, a2: 1 + s2 / 100, g2, ratio: g2 / (1 + s1 / 100), f }, params: { s1, s2, kind: "spots" },
            };
          }
          const P1 = r.int(930, 980), P2 = r.int(Math.round(P1 * 0.9), P1 - 30), s1 = (1000 / P1 - 1) * 100, s2 = (Math.sqrt(1000 / P2) - 1) * 100, f = (P1 / P2 - 1) * 100;
          if ([s1, s2, f].some((x) => tie(x, 2)) || f <= 0) continue;
          return {
            prompt: `Zero-coupon bonds paying $1,000 trade at ${cash(P1)} (one year) and ${cash(P2)} (two years). Find the one-year forward rate between years 1 and 2. Give a percent rounded to 2 decimal places.`,
            steps: [
              `Spot rates: ${iv("s")}<sub>1</sub> = ${M.frac("1000", n(P1))} − 1 ${eqp(s1)}; ${iv("s")}<sub>2</sub> = ${pow(`(${M.frac("1000", n(P2))})`, "1/2")} − 1 ${eqp(s2)}.`,
              `${pow(`(1 + ${iv("s")}<sub>2</sub>)`, 2)} = ${M.frac("1000", n(P2))} and 1 + ${iv("s")}<sub>1</sub> = ${M.frac("1000", n(P1))}, so 1 + ${iv("f")}<sub>1→2</sub> = ${M.frac(n(P1), n(P2))} ${eqn(P1 / P2, 6)}.`,
              `${iv("f")}<sub>1→2</sub> ${eqp(f)}.`,
            ],
            answer: { kind: "number", value: f, dp: 2 }, answerText: pc(f), answerInput: typed(f),
            vals: { s1, s2, ratio: P1 / P2, f }, params: { P1, P2, kind: "zeros" }, consts: [1000],
          };
        }
      },
    },

    // ---- FN.15 Duration and convexity ---------------------------------------------------------------------
    "FN.15": {
      title: "Duration, convexity and DV01",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.6)) {
            const Dm = r.int(20, 150) / 10, bp = r.pick([-100, -50, -25, 25, 50, 75, 100]), dy = bp / 10000, ch = -Dm * dy * 100;
            return {
              prompt: `A bond has a modified duration of ${n(Dm)}. Its yield ${bp > 0 ? "rises" : "falls"} by ${n(Math.abs(bp))} basis points. Estimate the percent change in its price.`,
              steps: [
                `${n(Math.abs(bp))} basis points = ${n(Math.abs(dy))}${bp < 0 ? ", so Δ" + iv("y") + " = " + n(dy) : ""}.`,
                `${M.frac(`Δ${iv("P")}`, iv("P"))} ≈ −${iv("D")}<sub>mod</sub> Δ${iv("y")} = −${n(Dm)} × ${np(dy)} = ${n(ch / 100, 6)} = ${pc(ch, 4)}.`,
              ],
              answer: { kind: "number", value: ch }, answerText: pc(ch, 4), answerInput: typed(ch, 6),
              vals: { dy, ch, chd: ch / 100 }, params: { Dm, bp, kind: "first" },
            };
          }
          const Dm = r.int(20, 150) / 10, V = r.int(1, 50) * 100000, dv = Dm * V * 0.0001;
          return {
            prompt: `A bond portfolio worth ${cash(V)} has a modified duration of ${n(Dm)}. What is its DV01, the dollar change for a one-basis-point move in yield?`,
            steps: [`DV01 = ${iv("D")}<sub>mod</sub> × ${iv("P")} × 0.0001 = ${n(Dm)} × ${cash(V)} × 0.0001 ${eqm(dv)}.`],
            answer: { kind: "number", value: dv, dp: 2 }, answerText: P.money(dv), answerInput: typed(dv),
            vals: { dv }, params: { Dm, V, kind: "dv01" }, consts: [0.0001],
          };
        }
        if (level === 2) {
          const Dm = r.int(30, 150) / 10, Cx = r.int(10, 200), d = r.pick([-2, -1.5, -1, 1, 1.5, 2]), dy = d / 100, P0 = r.int(80, 120) * 10;
          const a = -Dm * dy, b = 0.5 * Cx * dy * dy, ch = a + b, P1 = P0 * (1 + ch);
          return {
            prompt: `A bond priced at ${cash(P0)} has modified duration ${n(Dm)} and convexity ${n(Cx)}. Its yield ${d > 0 ? "rises" : "falls"} by ${pc(Math.abs(d))}. Estimate the new price with the duration–convexity approximation.`,
            steps: [
              `Δ${iv("y")} = ${n(dy)}. Duration term: −${n(Dm)} × ${np(dy)} = ${fmt(a, 6)}.`,
              `Convexity term: ${M.frac("1", "2")} × ${n(Cx)} × ${pow(np(dy), 2)} = ${fmt(b, 6)}. It is always positive, cushioning falls and adding to rises.`,
              `${M.frac(`Δ${iv("P")}`, iv("P"))} ≈ ${fmt(a, 6)} + ${fmt(b, 6)} = ${fmt(ch, 6)}, so the price ≈ ${cash(P0)} × ${fmt(1 + ch, 6)} ${eqm(P1)}.`,
            ],
            answer: { kind: "number", value: P1, dp: 2 }, answerText: P.money(P1), answerInput: typed(P1),
            vals: { dy, a, b, ch, g: 1 + ch, P1 }, params: { Dm, Cx, d, P0 },
          };
        }
        for (;;) {
          const c = r.int(3, 9), y = r.int(3, 9), F = 100, N = 3, yd = y / 100, cfs = [c, c, c + F];
          const pvs = cfs.map((x, k) => x / Math.pow(1 + yd, k + 1)), Pz = sum(pvs), tw = pvs.map((x, k) => (k + 1) * x), stw = sum(tw), Dmac = stw / Pz, Dmod = Dmac / (1 + yd);
          const R4 = (x) => P.round(x, 4);
          if (tie(Dmod, 2) || !addsUp(pvs, Pz, 4) || !addsUp(tw, stw, 4) || P.round(R4(stw) / R4(Pz), 4) !== R4(Dmac) || P.round(R4(Dmac) / (1 + yd), 2) !== P.round(Dmod, 2)) continue;
          return {
            prompt: `A 3-year bond with face value $100 pays ${an(c)} ${pc(c)} annual coupon and yields ${pc(y)}. Compute its Macaulay duration from the cash flows, then its modified duration. Round the modified duration to 2 decimal places.`,
            steps: [
              `Present values of the cash flows ${cfs.map((x) => cash(x)).join(", ")}: ${pvs.map((x, k) => `${M.frac(n(cfs[k]), k ? pow(n(1 + yd), k + 1) : n(1 + yd))} ${eqn(x, 4)}`).join("; ")}.`,
              `Price: ${pvs.map((x) => fmt(x, 4)).join(" + ")} ${eqn(Pz, 4)}.`,
              `Weight each by its time: ${tw.map((x, k) => `${k + 1} × ${M.frac(n(cfs[k]), k ? pow(n(1 + yd), k + 1) : n(1 + yd))} ${eqn(x, 4)}`).join("; ")}; sum ${eqn(stw, 4)}.`,
              `${iv("D")}<sub>Mac</sub> = ${M.frac(fmt(stw, 4), fmt(Pz, 4))} ${eqn(Dmac, 4)} years.`,
              `${iv("D")}<sub>mod</sub> = ${M.frac(fmt(Dmac, 4), n(1 + yd))} ${eqn(Dmod, 2)}: the price moves about ${fmt(Dmod, 2)}% for each 1% change in yield.`,
            ],
            answer: { kind: "number", value: Dmod, dp: 2 }, answerText: fmt(Dmod, 2), answerInput: typed(Dmod),
            vals: { cfs, pvs, Pz, tw, stw, Dmac, Dmod, a: 1 + yd }, params: { c, y, F, N }, consts: [3],
          };
        }
      },
    },
    // ---- FN.17 Options: payoffs and put–call parity ----------------------------------------------------------
    "FN.17": {
      title: "Option payoffs, profit and put–call parity",
      generate(r, level) {
        const hinge = (call, K) => (call ? `(abs(x-${K})+(x-${K}))/2` : `(abs(${K}-x)+(${K}-x))/2`);
        const payoffGraph = (fns, K, lo, hi) => graph({
          view: [Math.max(0, K * 0.4) - K * 0.12, K * 1.6, lo, hi],
          items: [...fns.map((e, k) => ({ t: "fn", e, role: k ? "muted" : "primary" })), { t: "hline", y: 0, role: "muted", dash: false }, { t: "vline", x: K, role: "muted" }, { t: "text", x: K, y: hi * 0.92, s: `K = ${K}` }],
        });
        if (level === 1) {
          const call = r.chance(0.5), K = r.int(4, 30) * 5, prem = r.int(10, 80) / 10, ST = K + r.nonzero(-6, 6) * r.pick([1, 2, 3]);
          const pay = call ? Math.max(ST - K, 0) : Math.max(K - ST, 0), prof = pay - prem;
          return {
            prompt: `You buy a ${call ? "call" : "put"} option with strike ${cash(K)} for a premium of ${mon(prem)}. At expiry the stock is at ${cash(ST)}. What is your profit per share (negative for a loss)?`,
            graph: payoffGraph([`${hinge(call, K)} - ${prem}`], K, -prem * 2.5, K * 0.5),
            steps: [
              `${call ? "Call" : "Put"} payoff: max(${call ? `${iv("S")}<sub>${iv("T")}</sub> − ${iv("K")}` : `${iv("K")} − ${iv("S")}<sub>${iv("T")}</sub>`}, 0) = max(${call ? `${n(ST)} − ${n(K)}` : `${n(K)} − ${n(ST)}`}, 0) = ${n(pay)}.`,
              `${pay === 0 ? "The option expires worthless. " : ""}Profit = payoff − premium = ${n(pay)} − ${n(prem)} = ${mon(prof)}.`,
            ],
            answer: { kind: "number", value: prof }, answerText: P.money(prof), answerInput: typed(prof, 6),
            vals: { pay, prof, diff: call ? ST - K : K - ST }, params: { call: call ? 1 : 0, K, prem, ST },
          };
        }
        if (level === 2) {
          const kind = r.pick(["breakeven", "short", "straddle"]), K = r.int(4, 30) * 5;
          if (kind === "breakeven") {
            const call = r.chance(0.5), prem = r.int(10, 120) / 10, be = call ? K + prem : K - prem;
            return {
              prompt: `A ${call ? "call" : "put"} with strike ${cash(K)} costs ${mon(prem)}. At what stock price at expiry does the buyer exactly break even?`,
              graph: payoffGraph([`${hinge(call, K)} - ${prem}`], K, -prem * 2.5, K * 0.5),
              steps: [
                `Break-even is where the payoff equals the premium paid${call ? `: ${iv("S")}<sub>${iv("T")}</sub> − ${n(K)} = ${n(prem)}` : `: ${n(K)} − ${iv("S")}<sub>${iv("T")}</sub> = ${n(prem)}`}.`,
                `${iv("S")}<sub>${iv("T")}</sub> = ${n(K)} ${call ? "+" : "−"} ${n(prem)} = ${mon(be)}.`,
              ],
              answer: { kind: "number", value: be }, answerText: mon(be), answerInput: typed(be, 6),
              vals: { be }, params: { call: call ? 1 : 0, K, prem, kind },
            };
          }
          if (kind === "short") {
            const call = r.chance(0.5), prem = r.int(10, 80) / 10, ST = K + r.nonzero(-6, 6) * r.pick([1, 2, 3]);
            const pay = call ? Math.max(ST - K, 0) : Math.max(K - ST, 0), prof = prem - pay;
            return {
              prompt: `You write (sell) a ${call ? "call" : "put"} with strike ${cash(K)} and collect ${an(prem)} ${mon(prem)} premium. At expiry the stock is at ${cash(ST)}. What is your profit per share (negative for a loss)?`,
              graph: payoffGraph([`${prem} - ${hinge(call, K)}`], K, -K * 0.5, prem * 2.5),
              steps: [
                `The buyer receives max(${call ? `${n(ST)} − ${n(K)}` : `${n(K)} − ${n(ST)}`}, 0) = ${n(pay)}, which the writer pays.`,
                `Writer's profit = premium − payoff = ${n(prem)} − ${n(pay)} = ${mon(prof)}.`,
              ],
              answer: { kind: "number", value: prof }, answerText: P.money(prof), answerInput: typed(prof, 6),
              vals: { pay, prof, diff: call ? ST - K : K - ST }, params: { call: call ? 1 : 0, K, prem, ST, kind },
            };
          }
          const c = r.int(20, 80) / 10, p = r.int(20, 80) / 10, ST = K + r.nonzero(-5, 5) * r.pick([2, 3, 4]), cost = c + p, pay = Math.abs(ST - K), prof = pay - cost;
          return {
            prompt: `A trader buys a straddle: a call (${mon(c)}) and a put (${mon(p)}), both with strike ${cash(K)}. At expiry the stock is at ${cash(ST)}. What is the profit per share (negative for a loss)?`,
            graph: payoffGraph([`abs(x-${K}) - ${cost}`], K, -cost * 2, K * 0.5),
            steps: [
              `Cost: ${n(c)} + ${n(p)} = ${n(cost)}.`,
              `Exactly one leg pays: the ${ST > K ? "call" : "put"} pays |${n(ST)} − ${n(K)}| = ${n(pay)}.`,
              `Profit = ${n(pay)} − ${n(cost)} = ${mon(prof)}. A straddle profits only from a move larger than its cost, in either direction.`,
            ],
            answer: { kind: "number", value: prof }, answerText: P.money(prof), answerInput: typed(prof, 6),
            vals: { cost, pay, prof }, params: { c, p, K, ST, kind },
          };
        }
        for (;;) {
          const S0 = r.int(20, 200), K = Math.round(S0 * r.int(85, 115) / 100), rr = r.pick([2, 3, 4, 5]), T = r.pick([0.25, 0.5, 1]), findPut = r.chance(0.5);
          const known = r.int(20, 150) / 10, rT = (rr / 100) * T, df = Math.exp(-rT), pvK = K * df;
          const ans = findPut ? known - S0 + pvK : known + S0 - pvK;
          if (ans <= 0.05 || tie(ans, 2) || tie(pvK, 2) || !near(P.round(findPut ? known - S0 + P.round(pvK, 2) : known + S0 - P.round(pvK, 2), 2), P.round(ans, 2))) continue;
          return {
            prompt: `A stock trades at ${cash(S0)} and pays no dividends. A European ${findPut ? "call" : "put"} with strike ${cash(K)} expiring in ${n(T)} year${T === 1 ? "" : "s"} costs ${mon(known)}. The continuously compounded risk-free rate is ${pc(rr)}. By put–call parity, what should the ${findPut ? "put" : "call"} with the same strike and expiry cost? Round to the nearest cent.`,
            steps: [
              `Put–call parity: ${iv("C")} − ${iv("P")} = ${iv("S")}<sub>0</sub> − ${iv("K")}${pow("e", `−${iv("r")}${iv("T")}`)}.`,
              `Present value of the strike: ${n(K)} × ${pow("e", `−${n(rT)}`)}, with ${pow("e", `−${n(rT)}`)} ${eqn(df, 8)}, gives ${eqm(pvK)}.`,
              findPut
                ? `${iv("P")} = ${iv("C")} − ${iv("S")}<sub>0</sub> + ${iv("K")}${pow("e", `−${iv("r")}${iv("T")}`)} = ${n(known)} − ${n(S0)} + ${fmt(pvK, 2)} ${eqm(ans)}.`
                : `${iv("C")} = ${iv("P")} + ${iv("S")}<sub>0</sub> − ${iv("K")}${pow("e", `−${iv("r")}${iv("T")}`)} = ${n(known)} + ${n(S0)} − ${fmt(pvK, 2)} ${eqm(ans)}.`,
            ],
            answer: { kind: "number", value: ans, dp: 2 }, answerText: P.money(ans), answerInput: typed(ans),
            vals: { rT, df, pvK, ans }, params: { S0, K, rr, T, known, findPut: findPut ? 1 : 0 },
          };
        }
      },
    },

    // ---- FN.binomial Binomial option pricing --------------------------------------------------------------
    "FN.binomial": {
      title: "Binomial option pricing",
      generate(r, level) {
        const UD = [[[6, 5], [4, 5]], [[11, 10], [9, 10]], [[5, 4], [4, 5]], [[13, 10], [4, 5]], [[3, 2], [1, 2]]];
        const pay = (call, S, K) => (call ? Frac.of(S).sub(K) : Frac.of(K).sub(S)).cmp(0) > 0 ? (call ? Frac.of(S).sub(K) : Frac.of(K).sub(S)) : new Frac(0);
        const tree1 = (S0, Su, Sd, Vu, Vd, showV) => graph({
          view: [-0.5, 1.8, -1.6, 1.6], axes: false, grid: false,
          items: [
            { t: "seg", a: [0, 0], b: [1, 1], role: "muted" }, { t: "seg", a: [0, 0], b: [1, -1], role: "muted" },
            { t: "pt", x: 0, y: 0 }, { t: "pt", x: 1, y: 1 }, { t: "pt", x: 1, y: -1 },
            { t: "text", x: 0, y: 0.3, s: `S = ${fmt(S0, 4)}` },
            { t: "text", x: 1.35, y: 1, s: `${fmt(Su, 4)}${showV ? `, V = ${fmt(Vu, 4)}` : ""}`, anchor: "start" },
            { t: "text", x: 1.35, y: -1, s: `${fmt(Sd, 4)}${showV ? `, V = ${fmt(Vd, 4)}` : ""}`, anchor: "start" },
          ],
        });
        if (level === 1 || (level === 2 && r.chance(0.5))) {
          for (;;) {
            const [[un, ud], [dn, dd]] = r.pick(UD), u = new Frac(un, ud), d = new Frac(dn, dd), S0 = r.pick([20, 40, 50, 60, 80, 100, 120]);
            const call = r.chance(0.5), Su = u.mul(S0), Sd = d.mul(S0), K = r.int(Math.ceil(Sd.value) + 1, Math.floor(Su.value) - 1);
            if (!Su.isInt() || !Sd.isInt() || K <= Sd.value || K >= Su.value) continue;
            const Vu = pay(call, Su, K), Vd = pay(call, Sd, K), p = new Frac(1).sub(d).div(u.sub(d)), V0 = p.mul(Vu).add(new Frac(1).sub(p).mul(Vd));
            const hedge = Vu.sub(Vd).div(Su.sub(Sd)), B = V0.sub(hedge.mul(S0));
            if (level === 2) {
              return {
                prompt: `A stock at ${cash(S0)} will move to ${cash(Su.value)} or ${cash(Sd.value)} in one period; the interest rate is 0. How many shares (the hedge ratio Δ) replicate one European ${call ? "call" : "put"} with strike ${cash(K)}, and what does the replication cost? Enter Δ.`,
                graph: tree1(S0, Su.value, Sd.value, 0, 0, false),
                steps: [
                  `Payoffs: ${iv("V")}<sub>${iv("u")}</sub> = ${n(Vu.value)} and ${iv("V")}<sub>${iv("d")}</sub> = ${n(Vd.value)}.`,
                  `Δ = ${M.frac(`${iv("V")}<sub>${iv("u")}</sub> − ${iv("V")}<sub>${iv("d")}</sub>`, `${iv("S")}<sub>${iv("u")}</sub> − ${iv("S")}<sub>${iv("d")}</sub>`)} = ${M.frac(`${n(Vu.value)} − ${n(Vd.value)}`, `${n(Su.value)} − ${n(Sd.value)}`)} = ${M.f(hedge)}${hedge.isInt() ? "" : ` = ${fmt(hedge.value, 6)}`}${call ? "" : ": a put is replicated by selling shares"}.`,
                  `Cash position: ${iv("B")} = ${iv("V")}<sub>${iv("d")}</sub> − Δ${iv("S")}<sub>${iv("d")}</sub> = ${n(Vd.value)} − ${M.f(hedge, { paren: true })} × ${n(Sd.value)} = ${M.f(B.add(0))}; the option costs Δ${iv("S")}<sub>0</sub> + ${iv("B")} = ${M.f(V0)}${V0.isInt() ? "" : ` ${eqn(V0.value, 4)}`}.`,
                ],
                answer: { kind: "number", value: hedge.value }, answerText: `Δ = ${M.f(hedge)}`, answerInput: `${hedge.n}/${hedge.d}`,
                vals: { Su: fracVal(Su), Sd: fracVal(Sd), Vu: fracVal(Vu), Vd: fracVal(Vd), hedge: fracVal(hedge), B: fracVal(B), V0: fracVal(V0), dS: Su.sub(Sd).value, dV: Vu.sub(Vd).value }, params: { u: fracVal(u), d: fracVal(d), S0, K, call: call ? 1 : 0, kind: "hedge" },
              };
            }
            return {
              prompt: `A stock at ${cash(S0)} will go up by a factor ${n(u.value)} or down by a factor ${n(d.value)} in one period, and the interest rate is 0. What is the value of a European ${call ? "call" : "put"} with strike ${cash(K)} expiring at the end of the period? Give the exact value.`,
              graph: tree1(S0, Su.value, Sd.value, 0, 0, false),
              steps: [
                `Prices: ${iv("S")}<sub>${iv("u")}</sub> = ${n(S0)} × ${n(u.value)} = ${n(Su.value)}, ${iv("S")}<sub>${iv("d")}</sub> = ${n(S0)} × ${n(d.value)} = ${n(Sd.value)}. Payoffs: ${iv("V")}<sub>${iv("u")}</sub> = ${n(Vu.value)}, ${iv("V")}<sub>${iv("d")}</sub> = ${n(Vd.value)}.`,
                `Risk-neutral probability with ${iv("r")} = 0: ${iv("p")} = ${M.frac(`1 − ${iv("d")}`, `${iv("u")} − ${iv("d")}`)} = ${M.frac(`1 − ${n(d.value)}`, `${n(u.value)} − ${n(d.value)}`)} = ${M.f(p)}.`,
                `${iv("V")}<sub>0</sub> = ${iv("p")}${iv("V")}<sub>${iv("u")}</sub> + (1 − ${iv("p")})${iv("V")}<sub>${iv("d")}</sub> = ${M.f(p)} × ${n(Vu.value)} + ${M.f(new Frac(1).sub(p))} × ${n(Vd.value)} = ${M.f(V0)}${V0.isInt() ? "" : ` ${eqn(V0.value, 4)}`}.`,
              ],
              answer: { kind: "number", value: V0.value }, answerText: V0.isInt() ? cash(V0.value) : `${M.f(V0)} ${eqm(V0.value)}`, answerInput: V0.isInt() ? String(V0.n) : `${V0.n}/${V0.d}`,
              vals: { Su: fracVal(Su), Sd: fracVal(Sd), Vu: fracVal(Vu), Vd: fracVal(Vd), p: fracVal(p), q: fracVal(new Frac(1).sub(p)), V0: fracVal(V0), u: u.value, d: d.value }, params: { u: fracVal(u), d: fracVal(d), S0, K, call: call ? 1 : 0, kind: "value" },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const [[un, ud], [dn, dd]] = r.pick(UD.slice(0, 4)), u = un / ud, d = dn / dd, S0 = r.pick([40, 50, 80, 100]), rr = r.pick([2, 3, 4, 5, 6]), T = r.pick([0.25, 0.5, 1]), call = r.chance(0.5);
            const Su = S0 * u, Sd = S0 * d, K = r.int(Math.ceil(Sd) + 1, Math.floor(Su) - 1), Vu = call ? Math.max(Su - K, 0) : Math.max(K - Su, 0), Vd = call ? Math.max(Sd - K, 0) : Math.max(K - Sd, 0);
            const rT = (rr / 100) * T, g = Math.exp(rT), p = (g - d) / (u - d), ev = p * Vu + (1 - p) * Vd, V0 = ev / g;
            if (!Number.isInteger(Su) || !Number.isInteger(Sd) || tie(V0, 2) || P.round(P.round(p * Vu + P.round(1 - p, 6) * Vd, 8) / P.round(g, 8), 2) !== P.round(V0, 2) || P.round(P.round(p, 6) * Vu + P.round(1 - p, 6) * Vd, 4) !== P.round(ev, 4)) continue;
            return {
              prompt: `A stock at ${cash(S0)} will be at ${cash(Su)} or ${cash(Sd)} in ${n(T)} year${T === 1 ? "" : "s"}. The continuously compounded risk-free rate is ${pc(rr)}. Value a European ${call ? "call" : "put"} with strike ${cash(K)} on that date with a one-step tree. Round to the nearest cent.`,
              graph: tree1(S0, Su, Sd, Vu, Vd, true),
              steps: [
                `Payoffs: ${iv("V")}<sub>${iv("u")}</sub> = ${n(Vu)}, ${iv("V")}<sub>${iv("d")}</sub> = ${n(Vd)}. Factors: ${iv("u")} = ${n(u)}, ${iv("d")} = ${n(d)}.`,
                `Growth at the risk-free rate over the period: ${T === 1 ? "" : `${pow("e", `${n(rr / 100)} × ${n(T)}`)} = `}${pow("e", n(rT))} ${eqn(g, 8)}.`,
                `${iv("p")} = ${M.frac(`${fmt(g, 8)} − ${n(d)}`, `${n(u)} − ${n(d)}`)} ${eqn(p, 6)}, so 1 − ${iv("p")} ${eqn(1 - p, 6)}.`,
                `${iv("V")}<sub>0</sub> = ${pow("e", `−${n(rT)}`)}[${fmt(p, 6)} × ${n(Vu)} + ${fmt(1 - p, 6)} × ${n(Vd)}] ${rel(V0, 2)} ${M.frac(fmt(ev, 4), fmt(g, 8))} ${eqm(V0)}.`,
              ],
              answer: { kind: "number", value: V0, dp: 2 }, answerText: P.money(V0), answerInput: typed(V0),
              vals: { Su, Sd, Vu, Vd, u, d, rT, g, p, q: 1 - p, ev, V0, rd: rr / 100 }, params: { u, d, S0, K, rr, T, call: call ? 1 : 0, kind: "rate" },
            };
          }
        }
        // level 3: a two-step tree with r = 0
        for (;;) {
          const [[un, ud], [dn, dd]] = r.pick(UD.slice(0, 4)), u = new Frac(un, ud), d = new Frac(dn, dd), S0 = r.pick([50, 100, 200]), call = r.chance(0.5);
          const Suu = u.mul(u).mul(S0), Sud = u.mul(d).mul(S0), Sdd = d.mul(d).mul(S0), Su = u.mul(S0), Sd = d.mul(S0);
          const K = r.int(Math.ceil(Sdd.value) + 1, Math.floor(Suu.value) - 1);
          if (![Suu, Sud, Sdd].every((x) => x.isInt()) || Sud.value === K) continue;
          const p = new Frac(1).sub(d).div(u.sub(d)), q = new Frac(1).sub(p);
          const Vuu = pay(call, Suu, K), Vud = pay(call, Sud, K), Vdd = pay(call, Sdd, K);
          if ([Vuu, Vud, Vdd].filter((v) => v.n > 0).length < 1 || [Vuu, Vud, Vdd].every((v) => v.n > 0)) continue;
          const Vu = p.mul(Vuu).add(q.mul(Vud)), Vd = p.mul(Vud).add(q.mul(Vdd)), V0 = p.mul(Vu).add(q.mul(Vd));
          const lab = (x) => (x.isInt() ? fmt(x.value, 4) : `${x.n}/${x.d}`);
          return {
            prompt: `A stock at ${cash(S0)} moves up by ${n(u.value)} or down by ${n(d.value)} in each of two periods; the interest rate is 0. What is the value of a European ${call ? "call" : "put"} with strike ${cash(K)} expiring after two periods? Give the exact value.`,
            graph: graph({
              view: [-0.4, 2.9, -2.6, 2.6], axes: false, grid: false,
              items: [
                { t: "seg", a: [0, 0], b: [1, 1], role: "muted" }, { t: "seg", a: [0, 0], b: [1, -1], role: "muted" },
                { t: "seg", a: [1, 1], b: [2, 2], role: "muted" }, { t: "seg", a: [1, 1], b: [2, 0], role: "muted" },
                { t: "seg", a: [1, -1], b: [2, 0], role: "muted" }, { t: "seg", a: [1, -1], b: [2, -2], role: "muted" },
                ...[[0, 0], [1, 1], [1, -1], [2, 2], [2, 0], [2, -2]].map(([x, y]) => ({ t: "pt", x, y })),
                { t: "text", x: 0, y: 0.35, s: lab(Frac.of(S0)) }, { t: "text", x: 1, y: 1.35, s: lab(Su) }, { t: "text", x: 1, y: -1.35, s: lab(Sd) },
                { t: "text", x: 2.15, y: 2, s: lab(Suu), anchor: "start" }, { t: "text", x: 2.15, y: 0, s: lab(Sud), anchor: "start" }, { t: "text", x: 2.15, y: -2, s: lab(Sdd), anchor: "start" },
              ],
            }),
            steps: [
              `Final prices: ${n(Suu.value)}, ${n(Sud.value)}, ${n(Sdd.value)}. Payoffs: ${n(Vuu.value)}, ${n(Vud.value)}, ${n(Vdd.value)}.`,
              `${iv("p")} = ${M.frac(`1 − ${n(d.value)}`, `${n(u.value)} − ${n(d.value)}`)} = ${M.f(p)}, 1 − ${iv("p")} = ${M.f(q)}.`,
              `Roll back one step: ${iv("V")}<sub>${iv("u")}</sub> = ${M.f(p)} × ${n(Vuu.value)} + ${M.f(q)} × ${n(Vud.value)} = ${M.f(Vu)}; ${iv("V")}<sub>${iv("d")}</sub> = ${M.f(p)} × ${n(Vud.value)} + ${M.f(q)} × ${n(Vdd.value)} = ${M.f(Vd)}.`,
              `${iv("V")}<sub>0</sub> = ${M.f(p)} × ${M.f(Vu)} + ${M.f(q)} × ${M.f(Vd)} = ${M.f(V0)}${V0.isInt() ? "" : ` ${eqn(V0.value, 4)}`}.`,
            ],
            answer: { kind: "number", value: V0.value }, answerText: V0.isInt() ? cash(V0.value) : `${M.f(V0)} ${eqm(V0.value)}`, answerInput: V0.isInt() ? String(V0.n) : `${V0.n}/${V0.d}`,
            vals: { Suu: fracVal(Suu), Sud: fracVal(Sud), Sdd: fracVal(Sdd), Vuu: fracVal(Vuu), Vud: fracVal(Vud), Vdd: fracVal(Vdd), p: fracVal(p), q: fracVal(q), Vu: fracVal(Vu), Vd: fracVal(Vd), V0: fracVal(V0), u: u.value, d: d.value }, params: { u: fracVal(u), d: fracVal(d), S0, K, call: call ? 1 : 0 },
          };
        }
      },
    },

    // ---- FN.22 Geometric Brownian motion --------------------------------------------------------------------
    "FN.22": {
      title: "Geometric Brownian motion",
      generate(r, level) {
        if (level === 1) {
          const mu = r.int(4, 15), sg = r.pick([10, 20, 30, 40, 50]), T = r.pick([0.25, 1, 4]), m = mu / 100, s = sg / 100;
          const drift = P.round(m - (s * s) / 2, 12), mean = P.round(drift * T, 12), sd = P.round(s * Math.sqrt(T), 12);
          return {
            prompt: `A stock follows geometric Brownian motion with drift μ = ${n(m)} and volatility σ = ${n(s)} (annual). Over ${n(T)} year${T === 1 ? "" : "s"}, the log return ln(${iv("S")}<sub>${iv("T")}</sub>/${iv("S")}<sub>0</sub>) is normal. Enter its mean and standard deviation, in that order.`,
            steps: [
              `Mean: (μ − ${M.frac(pow("σ", 2), "2")})${iv("T")} = (${n(m)} − ${M.frac(n(s * s), "2")}) × ${n(T)} = ${n(drift)} × ${n(T)} = ${n(mean, 6)}. The −σ²/2 is the volatility drag.`,
              `Standard deviation: σ${M.sqrt(iv("T"))} = ${n(s)} × ${M.sqrt(n(T))} = ${n(s)} × ${n(Math.sqrt(T))} = ${n(sd, 6)}.`,
            ],
            answer: { kind: "numbers", values: [mean, sd], ordered: true }, answerText: `mean ${n(mean, 6)}, standard deviation ${n(sd, 6)}`, answerInput: `${P.round(mean, 8)}, ${P.round(sd, 8)}`,
            vals: { m, s, s2: s * s, drift, mean, rt: Math.sqrt(T), sd }, params: { mu, sg, T },
          };
        }
        if (level === 2) {
          for (;;) {
            const S0 = r.int(20, 200), mu = r.int(5, 15), sg = r.pick([20, 25, 30, 40, 50]), T = r.int(1, 5), m = mu / 100, s = sg / 100, ask = r.pick(["mean", "median"]);
            const a = m * T, b = (m - (s * s) / 2) * T, ea = Math.exp(a), eb = Math.exp(b), mean = S0 * ea, med = S0 * eb, ans = ask === "mean" ? mean : med;
            if (tie(mean, 2) || tie(med, 2) || P.round(S0 * P.round(ea, digits(ea, S0)), 2) !== P.round(mean, 2)) continue;
            return {
              prompt: `A stock at ${cash(S0)} follows geometric Brownian motion with μ = ${n(m)} and σ = ${n(s)}. What is the ${ask} of its price in ${n(T)} year${T === 1 ? "" : "s"}? Round to the nearest cent.`,
              steps: [
                `Mean: ${iv("S")}<sub>0</sub>${pow("e", `μ${iv("T")}`)} = ${n(S0)} × ${pow("e", n(a))}, with ${pow("e", n(a))} ${eqn(ea, digits(ea, S0))}, so ${eqm(mean)}.`,
                `Median: ${iv("S")}<sub>0</sub>${pow("e", `(μ − σ²/2)${iv("T")}`)}; (${n(m)} − ${M.frac(n(s * s), "2")}) × ${n(T)} = ${n(b, 6)}, ${pow("e", n(b, 6))} ${eqn(eb, digits(eb, S0))}, so ${eqm(med)}.`,
                `The mean exceeds the median: the log-normal price is skewed to the right.`,
              ],
              answer: { kind: "number", value: ans, dp: 2 }, answerText: P.money(ans), answerInput: typed(ans),
              vals: { m, s, s2: s * s, a, b, ea, eb, mean, med }, params: { S0, mu, sg, T, ask },
            };
          }
        }
        for (;;) {
          const S0 = r.int(20, 200), mu = r.int(5, 15), sg = r.pick([20, 25, 30, 40]), m = mu / 100, s = sg / 100;
          if (r.chance(0.5)) {
            const dt = r.pick([0.25, 1]), Z = r.sign() * r.int(3, 20) / 10, sq = Math.sqrt(dt), ex = (m - s * s / 2) * dt + s * sq * Z, g = Math.exp(ex), S1 = S0 * g, dg = digits(g, S0);
            if (tie(S1, 2)) continue;
            return {
              prompt: `Simulate one step of geometric Brownian motion: the stock is at ${cash(S0)}, μ = ${n(m)}, σ = ${n(s)}, the step is Δ${iv("t")} = ${n(dt)} year, and the standard normal draw is ${iv("Z")} = ${n(Z)}. What is the next price? Round to the nearest cent.`,
              steps: [
                `Exact step: ${iv("S")}<sub>${iv("t")}+Δ${iv("t")}</sub> = ${iv("S")}<sub>${iv("t")}</sub> exp[(μ − σ²/2)Δ${iv("t")} + σ${M.sqrt(`Δ${iv("t")}`)}${iv("Z")}].`,
                `Exponent: (${n(m)} − ${M.frac(n(s * s), "2")}) × ${n(dt)} + ${n(s)} × ${n(sq)} × ${np(Z)} = ${n((m - s * s / 2) * dt, 6)} ${(s * sq * Z) < 0 ? "−" : "+"} ${n(Math.abs(s * sq * Z), 6)} = ${n(ex, 6)}.`,
                `${pow("e", n(ex, 6))} ${eqn(g, dg)}, so ${iv("S")} = ${n(S0)} × ${fmt(g, dg)} ${eqm(S1)}.`,
              ],
              answer: { kind: "number", value: S1, dp: 2 }, answerText: P.money(S1), answerInput: typed(S1),
              vals: { m, s, s2: s * s, sq, dr: (m - s * s / 2) * dt, sh: Math.abs(s * sq * Z), ex, g, S1 }, params: { S0, mu, sg, dt, Z, kind: "step" },
            };
          }
          const T = r.pick([1, 4, 0.25]), z = (-(m - s * s / 2) * T) / (s * Math.sqrt(T));
          const zr = P.round(z, 2);
          if (tie(z, 2) || Math.abs(z) > 3 || Math.abs(z) < 0.05) continue;
          const pr = Ntab(zr);
          if (tie(Phi(zr), 4)) continue;
          return {
            prompt: `A stock follows geometric Brownian motion with μ = ${n(m)} and σ = ${n(s)}. What is the probability that it is below today's price after ${n(T)} year${T === 1 ? "" : "s"}? Round the z-score to 2 decimals and use the normal table value to 4 decimals.`,
            steps: [
              `${iv("S")}<sub>${iv("T")}</sub> &lt; ${iv("S")}<sub>0</sub> exactly when the log return is below 0; it is normal with mean (μ − σ²/2)${iv("T")} = ${n((m - s * s / 2) * T, 6)} and standard deviation σ${M.sqrt(iv("T"))} = ${n(s * Math.sqrt(T), 6)}.`,
              `${iv("z")} = ${M.frac(`0 − ${np((m - s * s / 2) * T, 6)}`, n(s * Math.sqrt(T), 6))} ${eqn(z, 2)}.`,
              `${iv("N")}(${fx(zr, 2)}) = ${fx(pr, 4)}.`,
            ],
            answer: { kind: "number", value: pr }, answerText: fx(pr, 4), answerInput: String(pr),
            vals: { m, s, mean: (m - s * s / 2) * T, sd: s * Math.sqrt(T), z, zr, pr }, params: { mu, sg, T, kind: "prob" }, consts: [4],
          };
        }
      },
    },

    // ---- FN.18 Black–Scholes option pricing -------------------------------------------------------------
    "FN.18": {
      title: "Black–Scholes prices",
      generate(r, level) {
        // at the money with nice numbers: d1 = (r + σ²/2)√T/σ comes out to 2 decimals
        const atm = () => {
          for (;;) {
            const s = r.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5]), rr = r.pick([0, 0, 0.01, 0.02, 0.03, 0.04, 0.05]), T = r.pick([0.25, 1, 4]);
            const sq = Math.sqrt(T), d1 = ((rr + s * s / 2) * T) / (s * sq), d2 = d1 - s * sq;
            if (!near(P.round(d1, 2), d1) || !near(P.round(d2, 2), d2) || Math.abs(d1) > 3) continue;
            return { s, rr, T, sq, d1: P.round(d1, 2), d2: P.round(d2, 2), num: (rr + s * s / 2) * T, den: s * sq };
          }
        };
        if (level === 1) {
          const { s, rr, T, sq, d1, d2, num, den } = atm(), S0 = r.int(4, 40) * 5;
          return {
            prompt: `A stock at ${cash(S0)} has a European call with strike ${cash(S0)} expiring in ${n(T)} year${T === 1 ? "" : "s"}. The volatility is σ = ${n(s)} and the continuously compounded rate is ${iv("r")} = ${n(rr)}. Find ${iv("d")}<sub>1</sub> and ${iv("d")}<sub>2</sub>, in that order.`,
            steps: [
              `At the money ln(${iv("S")}<sub>0</sub>/${iv("K")}) = ln 1 = 0, so ${iv("d")}<sub>1</sub> = ${M.frac(`(${iv("r")} + σ²/2)${iv("T")}`, `σ${M.sqrt(iv("T"))}`)} = ${M.frac(`(${n(rr)} + ${n(s * s / 2)}) × ${n(T)}`, `${n(s)} × ${n(sq)}`)} = ${M.frac(n(num, 6), n(den, 6))} = ${n(d1)}.`,
              `${iv("d")}<sub>2</sub> = ${iv("d")}<sub>1</sub> − σ${M.sqrt(iv("T"))} = ${n(d1)} − ${n(den, 6)} = ${n(d2)}.`,
            ],
            answer: { kind: "numbers", values: [d1, d2], ordered: true }, answerText: `${iv("d")}<sub>1</sub> = ${n(d1)}, ${iv("d")}<sub>2</sub> = ${n(d2)}`, answerInput: `${d1}, ${d2}`,
            vals: { h: s * s / 2, sq, num, den, d1, d2 }, params: { s, rr, T, S0 },
          };
        }
        if (level === 2) {
          for (;;) {
            const { s, rr, T, sq, d1, d2, num, den } = atm(), S0 = r.int(4, 40) * 5;
            const N1 = Ntab(d1), N2 = Ntab(d2), df = Math.exp(-rr * T), a = S0 * N1, pk = S0 * df, b = pk * N2, C = a - b;
            if (tie(Phi(d1), 4) || tie(Phi(d2), 4) || tie(C, 2) || tie(pk, 4) || P.round(P.round(a, 4) - P.round(b, 4), 2) !== P.round(C, 2)) continue;
            return {
              prompt: `Price a European call on a non-dividend stock at ${cash(S0)} with strike ${cash(S0)}, ${n(T)} year${T === 1 ? "" : "s"} to expiry, σ = ${n(s)} and ${iv("r")} = ${n(rr)} (continuous), by Black–Scholes. Use normal-table values to 4 decimals and round the price to the nearest cent.`,
              steps: [
                `${iv("d")}<sub>1</sub> = ${M.frac(`0 + (${n(rr)} + ${n(s * s / 2)}) × ${n(T)}`, `${n(s)} × ${n(sq)}`)} = ${M.frac(n(num, 6), n(den, 6))} = ${n(d1)}; ${iv("d")}<sub>2</sub> = ${n(d1)} − ${n(den, 6)} = ${n(d2)}.`,
                `Table: ${iv("N")}(${fx(d1, 2)}) = ${fx(N1, 4)}, ${iv("N")}(${fx(d2, 2)}) = ${fx(N2, 4)}.`,
                rr === 0 ? `With ${iv("r")} = 0 the strike is not discounted: ${iv("K")}${pow("e", `−${iv("r")}${iv("T")}`)} = ${n(S0)}.` : `Discounted strike: ${n(S0)} × ${pow("e", `−${n(rr * T)}`)} ${eqn(pk, 4)}.`,
                `${iv("C")} = ${n(S0)} × ${fx(N1, 4)} − ${fmt(pk, 4)} × ${fx(N2, 4)} ${rel(C, 2)} ${fmt(a, 4)} − ${fmt(b, 4)} ${eqm(C)}.`,
              ],
              answer: { kind: "number", value: C, dp: 2 }, answerText: P.money(C), answerInput: typed(C),
              vals: { h: s * s / 2, sq, num, den, d1, d2, N1, N2, rT: rr * T, pk, a, b, C }, params: { s, rr, T, S0 }, consts: [4],
            };
          }
        }
        for (;;) {
          const S0 = r.int(20, 200), K = Math.round(S0 * r.int(80, 120) / 100), s = r.pick([0.2, 0.3, 0.4]), rr = r.pick([0.02, 0.03, 0.04, 0.05]), T = r.pick([0.25, 1]);
          const sq = Math.sqrt(T), lnSK = Math.log(S0 / K), d1 = (lnSK + (rr + s * s / 2) * T) / (s * sq);
          if (S0 === K || tie(d1, 2) || Math.abs(d1) > 2.5) continue;
          const d1r = P.round(d1, 2), d2r = P.round(d1r - s * sq, 2), Nm1 = Ntab(-d1r), Nm2 = Ntab(-d2r), df = Math.exp(-rr * T), pk = K * df;
          const a = pk * Nm2, b = S0 * Nm1, Pp = a - b;
          if (tie(Phi(-d1r), 4) || tie(Phi(-d2r), 4) || Pp < 0.05 || tie(Pp, 2) || P.round(P.round(pk, 4) * Nm2, 4) !== P.round(a, 4) || P.round(P.round(a, 4) - P.round(b, 4), 2) !== P.round(Pp, 2)) continue;
          return {
            prompt: `Price a European put on a non-dividend stock at ${cash(S0)} with strike ${cash(K)}, ${n(T)} year${T === 1 ? "" : "s"} to expiry, σ = ${n(s)} and ${iv("r")} = ${n(rr)} (continuous), by Black–Scholes. Round ${iv("d")}<sub>1</sub> to 2 decimals, use normal-table values to 4 decimals, and round the price to the nearest cent.`,
            steps: [
              `ln(${M.frac(n(S0), n(K))}) ${eqn(lnSK, 6)}; ${iv("d")}<sub>1</sub> = ${M.frac(`${fmt(lnSK, 6)} + (${n(rr)} + ${n(s * s / 2)}) × ${n(T)}`, `${n(s)} × ${n(sq)}`)} ${eqn(d1, 4)}, which rounds to ${n(d1r)}.`,
              `${iv("d")}<sub>2</sub> = ${n(d1r)} − ${n(s * sq)} = ${n(d2r)}.`,
              `Table: ${iv("N")}(−${iv("d")}<sub>1</sub>) = ${iv("N")}(${fx(-d1r, 2)}) = ${fx(Nm1, 4)} and ${iv("N")}(−${iv("d")}<sub>2</sub>) = ${iv("N")}(${fx(-d2r, 2)}) = ${fx(Nm2, 4)}.`,
              `Discounted strike: ${n(K)} × ${pow("e", `−${n(rr * T)}`)} ${eqn(pk, 4)}.`,
              `${iv("P")} = ${iv("K")}${pow("e", `−${iv("r")}${iv("T")}`)}${iv("N")}(−${iv("d")}<sub>2</sub>) − ${iv("S")}<sub>0</sub>${iv("N")}(−${iv("d")}<sub>1</sub>) = ${fmt(pk, 4)} × ${fx(Nm2, 4)} − ${n(S0)} × ${fx(Nm1, 4)} ${rel(Pp, 2)} ${fmt(a, 4)} − ${fmt(b, 4)} ${eqm(Pp)}.`,
            ],
            answer: { kind: "number", value: Pp, dp: 2 }, answerText: P.money(Pp), answerInput: typed(Pp),
            vals: { h: s * s / 2, sq, lnSK, d1, d1r, d2r, Nm1, Nm2, rT: rr * T, pk, a, b, Pp, sqs: s * sq }, params: { S0, K, s, rr, T }, consts: [4],
          };
        }
      },
    },

    // ---- FN.greeks Option Greeks ----------------------------------------------------------------------------
    "FN.greeks": {
      title: "Delta hedging and the Greeks",
      generate(r, level) {
        if (level === 1) {
          const Nc = r.int(1, 50) * 2, dc = r.int(20, 85) / 100, put = r.chance(0.5), delta = put ? dc - 1 : dc, sh = Math.abs(delta) * 100 * Nc;
          return {
            prompt: `You have sold ${n(Nc)} ${put ? "put" : "call"} contracts (100 shares each). The ${put ? "matching call's" : "call's"} delta, ${iv("N")}(${iv("d")}<sub>1</sub>), is ${n(dc)}. How many shares must you ${put ? "sell short" : "buy"} to be delta-neutral?`,
            steps: [
              put ? `Put delta = ${iv("N")}(${iv("d")}<sub>1</sub>) − 1 = ${n(dc)} − 1 = ${n(delta)}: each put loses value as the stock rises.` : `Each call's value moves ${n(dc)} dollars per $1 move in the stock.`,
              `Having sold the options, your delta is −${n(Nc)} × 100 × ${np(delta)} = ${gn(-delta * 100 * Nc)} shares' worth.`,
              `Offset it: ${put ? "sell short" : "buy"} ${n(Math.abs(delta))} × 100 × ${n(Nc)} = ${gn(sh)} shares.`,
            ],
            answer: { kind: "number", value: sh }, answerText: `${P.grouped(sh)} shares`, answerInput: String(P.round(sh, 6)),
            vals: { delta, ad: Math.abs(delta), pos: -delta * 100 * Nc, sh }, params: { Nc, dc, put: put ? 1 : 0 }, consts: [100],
          };
        }
        if (level === 2) {
          const V = r.int(20, 150) / 10, dl = r.int(20, 85) / 100, G = r.int(1, 9) / 100, dS = r.nonzero(-5, 5), a = dl * dS, b = 0.5 * G * dS * dS, dV = a + b, V1 = V + dV;
          return {
            prompt: `A call is worth ${mon(V)} with delta ${n(dl)} and gamma ${n(G)}. The stock ${dS > 0 ? "rises" : "falls"} by ${cash(Math.abs(dS))}. Estimate the new option value with the delta–gamma approximation.`,
            steps: [
              `Δ${iv("V")} ≈ Δ · Δ${iv("S")} + ${M.frac("1", "2")}Γ(Δ${iv("S")})² = ${n(dl)} × ${np(dS)} + ${M.frac("1", "2")} × ${n(G)} × ${pow(np(dS), 2)}.`,
              `= ${n(a, 6)} + ${n(b, 6)} = ${n(dV, 6)}.`,
              `New value ≈ ${n(V)} + ${np(dV, 6)} = $${n(V1, 6)}. Gamma adds value whichever way the stock moves.`,
            ],
            answer: { kind: "number", value: V1 }, answerText: `$${n(V1, 6)}`, answerInput: typed(V1, 6),
            vals: { a, b, dV, V1, ds2: dS * dS }, params: { V, dl, G, dS },
          };
        }
        for (;;) {
          const s = r.pick([0.2, 0.25, 0.3, 0.4, 0.5]), T = r.pick([0.25, 1]), S0 = r.int(4, 40) * 5, sq = Math.sqrt(T), d1 = (s * sq) / 2, ph = phi(d1), kind = r.pick(["gamma", "vega"]);
          const G = ph / (S0 * s * sq), Vg = S0 * ph * sq, ans = kind === "gamma" ? G : Vg, dp = kind === "gamma" ? 4 : 2;
          if (tie(ans, dp) || !near(P.round(d1, 4), d1) || P.round(kind === "gamma" ? P.round(ph, 6) / (S0 * s * sq) : S0 * P.round(ph, 6) * sq, dp) !== P.round(ans, dp)) continue;
          return {
            prompt: `An at-the-money European call on a stock at ${cash(S0)} has ${n(T)} year${T === 1 ? "" : "s"} to expiry, volatility σ = ${n(s)} and interest rate 0. What is its ${kind === "gamma" ? "gamma (round to 4 decimal places)" : "vega, per unit of volatility (round to 2 decimal places)"}?`,
            steps: [
              `At the money with ${iv("r")} = 0: ${iv("d")}<sub>1</sub> = ${M.frac(`σ${M.sqrt(iv("T"))}`, "2")} = ${M.frac(`${n(s)} × ${n(sq)}`, "2")} = ${n(d1)}.`,
              `Normal density: φ(${n(d1)}) = ${M.frac(pow("e", `−${n(d1)}²/2`), M.sqrt("2π"))} ${eqn(ph, 6)}.`,
              kind === "gamma"
                ? `Γ = ${M.frac(`φ(${iv("d")}<sub>1</sub>)`, `${iv("S")}σ${M.sqrt(iv("T"))}`)} = ${M.frac(fmt(ph, 6), `${n(S0)} × ${n(s)} × ${n(sq)}`)} ${eqn(G, 4)}: delta changes by about that much per $1 move.`
                : `${M.v("𝒱")} = ${iv("S")}φ(${iv("d")}<sub>1</sub>)${M.sqrt(iv("T"))} = ${n(S0)} × ${fmt(ph, 6)} × ${n(sq)} ${eqn(Vg, 2)}, so a 1-point rise in σ (0.01) adds about ${mon(Vg / 100)}.`,
            ],
            answer: { kind: "number", value: ans, dp }, answerText: fmt(ans, dp), answerInput: typed(ans, dp),
            vals: { sq, d1, ph, G, Vg, v1: Vg / 100 }, params: { s, T, S0, kind }, consts: [0.01, 4],
          };
        }
      },
    },

    // ---- FN.19 Value at risk and expected shortfall ------------------------------------------------------------
    "FN.19": {
      title: "Value at risk and expected shortfall",
      generate(r, level) {
        const Z = { 95: 1.645, 99: 2.326 }, ESF = { 95: 2.063, 99: 2.665 };
        if (level <= 2) {
          const al = r.pick([95, 99]), sd = r.pick([0.8, 1, 1.2, 1.5, 2, 2.5]), V = r.int(1, 100) * 100000, kind = level === 1 ? "var" : r.pick(["horizon", "es"]);
          const t = kind === "horizon" ? r.pick([4, 9, 16, 25]) : 1, rt = Math.sqrt(t), z = Z[al], k = kind === "es" ? ESF[al] : z, x = k * (sd / 100) * rt * V;
          const steps = [`At ${pc(al)} the one-sided normal quantile is ${iv("z")} = ${n(z)}; the daily volatility is ${n(sd / 100)}.`];
          if (kind === "var") steps.push(`VaR = ${iv("z")}σ${iv("V")} = ${n(z)} × ${n(sd / 100)} × ${cash(V)} ${eqm(x)}.`);
          if (kind === "horizon") steps.push(`Over ${n(t)} days volatility scales by ${M.sqrt(n(t))} = ${n(rt)}: VaR = ${n(z)} × ${n(sd / 100)} × ${n(rt)} × ${cash(V)} ${eqm(x)}.`);
          if (kind === "es") steps.push(`For normal returns ES = ${M.frac(`φ(${iv("z")})`, "1 − α")}σ${iv("V")} = ${n(k)}σ${iv("V")} at ${pc(al)}: ${n(k)} × ${n(sd / 100)} × ${cash(V)} ${eqm(x)}, larger than the VaR of ${n(z)} × ${n(sd / 100)} × ${cash(V)} ${eqm(z * sd / 100 * V)}.`);
          return {
            prompt: `A portfolio worth ${cash(V)} has daily return volatility ${pc(sd)} and zero mean, and returns are normal. What is its ${kind === "es" ? `1-day ${pc(al)} expected shortfall` : `${n(t)}-day ${pc(al)} value at risk`}?`,
            steps, answer: { kind: "number", value: x, dp: 2 }, answerText: P.money(x), answerInput: typed(x),
            vals: { z, sdd: sd / 100, rt, k, x, v: z * sd / 100 * V }, params: { al, sd, V, t, kind },
          };
        }
        for (;;) {
          const [N, al] = r.pick([[500, 99], [1000, 99], [200, 95], [100, 95]]), k = Math.round(N * (100 - al) / 100);
          const losses = r.sample(Array.from({ length: 300 }, (_, i) => 10 + i), k + 3).map((x) => x * 1000), sorted = losses.slice().sort((a, b) => b - a);
          const worst = sorted.slice(0, k), VaR = sorted[k - 1], ES = sum(worst) / k;
          if (tie(ES, 2)) continue;
          return {
            prompt: `A desk revalued its portfolio under ${n(N)} historical days. The ${n(k + 3)} largest losses were ${losses.map((x) => cash(x)).join(", ")}. Using the convention that the ${pc(al)} VaR is the loss at position (1 − α)${iv("N")}, what is the ${pc(al)} expected shortfall?`,
            steps: [
              `(1 − ${n(al / 100)}) × ${n(N)} = ${n(k)}, so the VaR is the ${ord(k)}-largest loss and ES averages the ${n(k)} largest.`,
              `Sorted from the worst: ${sorted.map((x) => cash(x)).join(", ")}. The VaR is ${cash(VaR)}.`,
              `The ${n(k)} largest losses add up to ${cash(sum(worst))}, so ES = ${M.frac(cash(sum(worst)), n(k))} ${eqm(ES)}. It is at least the VaR, and it also sees how bad the tail is.`,
            ],
            answer: { kind: "number", value: ES, dp: 2 }, answerText: P.money(ES), answerInput: typed(ES),
            vals: { a: al / 100, k, VaR, tot: sum(worst), ES, kk: k + 3 }, params: { N, al, losses },
          };
        }
      },
    },

    // ---- FN.21 Expected value of bets and the Kelly criterion ------------------------------------------------
    "FN.21": {
      title: "Expected value and the Kelly criterion",
      generate(r, level) {
        if (level === 1) {
          const p = r.int(20, 70), W = r.int(2, 40) * 5, L = r.int(2, 40) * 5, ev = (p * W - (100 - p) * L) / 100;
          return {
            prompt: `A bet wins ${cash(W)} with probability ${pc(p)} and otherwise loses ${cash(L)}. What is its expected value?`,
            steps: [
              `${iv("q")} = 1 − ${n(p / 100)} = ${n(1 - p / 100)}.`,
              `EV = ${iv("p")}${iv("W")} − ${iv("q")}${iv("L")} = ${n(p / 100)} × ${n(W)} − ${n(1 - p / 100)} × ${n(L)} = ${n(p * W / 100)} − ${n((100 - p) * L / 100)} = ${mon(ev)}. ${ev > 0 ? "Positive, so the bet is worth taking." : ev < 0 ? "Negative: decline the bet." : "Zero: a fair bet."}`,
            ],
            answer: { kind: "number", value: ev }, answerText: mon(ev), answerInput: typed(ev, 6),
            vals: { pd: p / 100, q: 1 - p / 100, a: p * W / 100, b: (100 - p) * L / 100, ev }, params: { p, W, L },
          };
        }
        if (level === 2) {
          for (;;) {
            const p = new Frac(r.int(40, 70), 100), b = new Frac(r.pick([2, 3, 4, 6]), 2), q = new Frac(1).sub(p), f = p.sub(q.div(b)), bank = r.int(2, 50) * 500, stake = f.mul(bank);
            if (f.value <= 0.02 || tie(stake.value, 2)) continue;
            return {
              prompt: `A bet pays ${n(b.value)} to 1 and you win it with probability ${n(p.value)}. Your bankroll is ${cash(bank)}. How much should you stake by the Kelly criterion?`,
              steps: [
                `Check the edge: EV per dollar = ${n(b.value)} × ${n(p.value)} − ${n(q.value)} = ${fmt(b.mul(p).sub(q).value, 4)} &gt; 0.`,
                `Kelly fraction: ${iv("f")}* = ${iv("p")} − ${M.frac(iv("q"), iv("b"))} = ${n(p.value)} − ${M.frac(n(q.value), n(b.value))} = ${M.f(f)}${f.d > 100 ? "" : ` = ${fmt(f.value, 6)}`}.`,
                `Stake: ${M.f(f)} × ${cash(bank)} ${eqm(stake.value)}. Many bettors use half of this to allow for errors in ${iv("p")}.`,
              ],
              answer: { kind: "number", value: stake.value, dp: 2 }, answerText: P.money(stake.value), answerInput: typed(stake.value),
              vals: { q: fracVal(q), f: fracVal(f), edge: b.mul(p).sub(q).value, stake: stake.value, fv: f.value }, params: { p: p.value, b: b.value, bank },
            };
          }
        }
        if (r.chance(0.5)) {
          const mu = r.int(6, 14), rf = r.int(1, 5), sg = r.pick([10, 15, 20, 25, 30]), Wl = r.int(2, 40) * 25000, f = (mu - rf) / 100 / Math.pow(sg / 100, 2), pos = f * Wl;
          return {
            prompt: `A stock index has expected return ${pc(mu)} and volatility ${pc(sg)}; the risk-free rate is ${pc(rf)}. By continuous-time Kelly, what fraction of wealth should be held in the index? (A value above 1 means borrowing.)`,
            steps: [
              `${iv("f")}* = ${M.frac(`μ − ${iv("r")}`, pow("σ", 2))} = ${M.frac(`${n(mu / 100)} − ${n(rf / 100)}`, pow(n(sg / 100), 2))} = ${M.frac(n((mu - rf) / 100), n(Math.pow(sg / 100, 2)))} ${eqn(f, 4)}.`,
              `With ${cash(Wl)} of wealth that is ${eqm(pos)} in the index${f > 1 ? ", borrowing the difference" : ""}.`,
            ],
            answer: { kind: "number", value: f }, answerText: fmt(f, 4), answerInput: typed(f, 10),
            vals: { m: mu / 100, rr: rf / 100, s: sg / 100, ex: (mu - rf) / 100, v: Math.pow(sg / 100, 2), f, pos }, params: { mu, rf, sg, Wl, kind: "cont" },
          };
        }
        for (;;) {
          const p = r.int(52, 70) / 100, q = P.round(1 - p, 2), f = p - q, half = f / 2, l1 = Math.log(1 + f), l2 = Math.log(1 - f), G = p * l1 + q * l2, Gh = p * Math.log(1 + half) + q * Math.log(1 - half);
          if (tie(G, 4) || tie(Gh, 4) || P.round(p * P.round(l1, 6) + q * P.round(l2, 6), 4) !== P.round(G, 4)) continue;
          return {
            prompt: `An even-money bet (${iv("b")} = 1) wins with probability ${n(p)}. What is the expected log growth per bet, ${iv("G")}(${iv("f")}*) = ${iv("p")} ln(1 + ${iv("f")}*) + ${iv("q")} ln(1 − ${iv("f")}*), at the Kelly fraction? Round to 4 decimal places.`,
            steps: [
              `With ${iv("b")} = 1, ${iv("f")}* = ${iv("p")} − ${iv("q")} = ${n(p)} − ${n(q)} = ${n(f)}.`,
              `ln(${n(1 + f)}) ${eqn(l1, 6)} and ln(${n(1 - f)}) ${eqn(l2, 6)}.`,
              `${iv("G")} = ${n(p)} × ${fmt(l1, 6)} + ${n(q)} × ${np(P.round(l2, 6), 6)} ${eqn(G, 4)} per bet. Half Kelly gives ${eqn(Gh, 4)}: most of the growth with much less risk.`,
            ],
            answer: { kind: "number", value: G, dp: 4 }, answerText: fmt(G, 4), answerInput: typed(G, 4),
            vals: { q, f, l1, l2, G, Gh, a: 1 + f, b1: 1 - f }, params: { p, kind: "growth" }, consts: [4],
          };
        }
      },
    },
  };

  // Safety net for rule 9: never ask to round an answer that sits on a half; draw again from the same stream.
  for (const def of Object.values(DEFS)) {
    const gen = def.generate;
    def.generate = function (r, level) {
      for (let k = 0; k < 200; k++) {
        const p = gen.call(this, r, level), a = p.answer;
        const vs = a.dp === undefined ? [] : a.kind === "number" ? [a.value] : a.values || [];
        if (!vs.some((x) => tie(x, a.dp))) return p;
      }
      throw new Error("no problem without a rounding tie");
    };
  }
  P.define("finance", DEFS);
})(Practice);
