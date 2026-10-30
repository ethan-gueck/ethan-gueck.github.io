/*
 * practice/statistics.js — Statistics & Probability practice problems (chapter 13), one generator per
 * concept key.
 *
 * Each generator(r, level) draws hand-solvable numbers for the level (1 easy, 2 medium, 3 hard) and
 * builds every number it shows from values it computes and reports in `vals`; tools/practice/
 * verifiers/statistics.py recomputes each of them independently (exact fractions; math.erf for the
 * normal table). See practice/core.js for the API.
 *
 * Every concept in the chapter has a generator; none is skipped.
 *
 * Normal probabilities use four-place z-table values (PHI below), which the verifier checks against
 * math.erf; problems that need e^x or ln x ask the reader to round.
 */
(function (P) {
  "use strict";
  const { Frac, M, fmt, graph } = P;
  const n = (v) => M.n(v);
  const nd = (v, dp) => M.n(v, { dp });
  const np = (v) => M.n(v, { paren: true });
  const fv = (q) => ({ n: q.n, d: q.d });
  const Q = (a, b = 1) => new Frac(a, b);
  const typed = (v) => (v instanceof Frac ? (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`) : fmt(v, 10).replace(/−/g, "-"));
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const fsum = (a) => a.reduce((s, x) => s.add(x), new Frac(0));
  const fprod = (a) => a.reduce((s, x) => s.mul(x), new Frac(1));
  const list = (a) => a.map((v) => n(v)).join(", ");
  const plus = (a) => a.map((v, i) => (i === 0 ? n(v) : v < 0 ? `− ${n(-v)}` : `+ ${n(v)}`)).join(" ");
  const V = M.v;
  const xbar = "<i>x̄</i>";
  const sorted = (a) => a.slice().sort((p, q) => p - q);
  /** Does a fraction have an exact decimal with at most dp places? */
  const terminates = (q, dp = 4) => { q = Frac.of(q); return Math.pow(10, dp) % q.d === 0; };
  /** A fraction as a decimal (rounded to dp places). */
  const dec = (q, dp = 4) => fmt(Frac.of(q).value, terminates(q, 6) ? 6 : dp);   // exact when it ends within 6 places: no rounding ties
  /** A fraction rounded to dp places for a rounded answer; an exact tie (…5) is shown in full instead. */
  const rq = (q, dp) => { q = Frac.of(q); const t = q.mul(Math.pow(10, dp)); return t.mul(2).isInt() && !t.isInt() ? fmt(q.value, 8) : fmt(q.value, dp); };
  /** "= x" when x is the exact value, else "≈ x" (x = rq(q, dp)). */
  const eqr = (q, dp) => `${Math.abs(Frac.of(q).value - Number(rq(q, dp).replace("−", "-"))) < 1e-12 ? "=" : "≈"} ${rq(q, dp)}`;
  const eqs = (q, dp = 4) => (terminates(q, 6) ? "=" : "≈");
  /** A fraction and its decimal: 3/8 = 0.375, 1/6 ≈ 0.1667. */
  const fd = (q, dp = 4) => { q = Frac.of(q); return q.isInt() ? n(q.n) : `${M.f(q)} ${eqs(q, dp)} ${dec(q, dp)}`; };
  /** A float result shown rounded: ≈ unless it is exact at dp places. */
  const approx = (v, dp) => (Math.abs(v - P.round(v, dp)) < 1e-12 ? "=" : "≈");
  const ord = (k) => `${k}${k % 100 >= 11 && k % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][k % 10] || "th"}`;
  const isSq = (v) => v >= 0 && Number.isInteger(v) && Math.round(Math.sqrt(v)) ** 2 === v;
  const fact = (k) => { let f = 1; for (let i = 2; i <= k; i++) f *= i; return f; };
  const C = (a, b) => (b < 0 || b > a ? 0 : Math.round(fact(a) / (fact(b) * fact(a - b))));
  const tally = (data) => {
    const c = {};
    for (const x of data) c[x] = (c[x] || 0) + 1;
    return Object.keys(c).map(Number).sort((a, b) => a - b).map((x) => [x, c[x]]);
  };
  const unit = (v, one, many) => `${n(v)} ${v === 1 ? one : many}`;
  /** Four-place standard normal table values Φ(z). */
  const PHI = { "0.5": 0.6915, "1": 0.8413, "1.5": 0.9332, "2": 0.9772, "2.5": 0.9938, "3": 0.9987,
    "1.96": 0.975, "1.645": 0.95, "0.84": 0.7995, "1.28": 0.8997, "2.33": 0.9901, "2.576": 0.995 };
  const phi = (z) => PHI[String(z)];
  const Phi = (z) => `Φ(${typeof z === "string" ? z : n(z)})`;
  const sub0 = "H₀", suba = "H<sub>a</sub>";
  /** A probability answer from a fraction: exact, or rounded to 4 places when its decimal does not end. */
  const pAns = (q, dp = 4) => ({
    answer: Object.assign({ kind: "number", value: q.value }, terminates(q, 6) ? {} : { dp }),
    answerText: fd(q, dp), answerInput: typed(q),
  });
  /** The prompt's rounding note for pAns. */
  const WORDS_DP = ["zero", "one", "two", "three", "four", "five", "six"];
  const rnd = (q, dp = 4) => (terminates(q, 6) ? "" : ` Give a fraction or a decimal rounded to ${WORDS_DP[dp]} places.`);
  /** top/bot, then its lowest terms if different, then its decimal: 6/16 = 3/8 = 0.375. */
  const fc = (top, bot, q, dp = 4) => {
    q = Frac.of(q);
    const red = q.d !== bot ? ` = ${M.f(q)}` : "";
    return `${M.frac(n(top), n(bot))}${red}${q.isInt() ? "" : ` ${eqs(q, dp)} ${dec(q, dp)}`}`;
  };
  const pr = (s) => `${V("P")}(${s})`;
  /** A sum of fractions shown as decimals with signs: 0.2 − 1.5 + 3. */
  const plusQ = (a, dp = 4) => a.map((q, i) => (i === 0 ? dec(q, dp) : q.n < 0 ? `− ${dec(q.neg(), dp)}` : `+ ${dec(q, dp)}`)).join(" ");
  /** A fraction to a power, in parentheses: (2/3)³; the bare fraction for power 1. */
  const pw = (q, e) => (e === 1 ? M.f(q) : M.sup(`(${M.f(q)})`, e));
  /** m positive whole numbers (multiples of step, from lo to hi) that add to 100. */
  const comp = (r, m, step = 5, lo = 5, hi = 40) => {
    for (;;) {
      const a = Array.from({ length: m - 1 }, () => step * r.int(Math.ceil(lo / step), Math.floor(hi / step)));
      const last = 100 - sum(a);
      if (last >= lo && last <= hi + 15) return r.shuffle([...a, last]);
    }
  };

  // ---- graphs ---------------------------------------------------------------------------------
  function dotPlot(data) {
    const lo = Math.min(...data), hi = Math.max(...data), cnt = {}, items = [];
    for (const x of sorted(data)) { cnt[x] = (cnt[x] || 0) + 1; items.push({ t: "pt", x, y: cnt[x] }); }
    const top = Math.max(...Object.values(cnt));
    return graph({ view: [lo - 1, hi + 1, -0.5, top + 1], items, grid: false });
  }
  /** Bars of width w centred on xs (a PMF or a histogram). */
  function bars(xs, hs, w = 0.6, extra = []) {
    const items = xs.map((x, i) => ({ t: "poly", p: [[x - w / 2, 0], [x - w / 2, hs[i]], [x + w / 2, hs[i]], [x + w / 2, 0]] }));
    const top = Math.max(...hs);
    return graph({ view: [Math.min(...xs) - 1, Math.max(...xs) + 1, -top * 0.08, top * 1.15], items: items.concat(extra), grid: false });
  }
  /** A bell curve over μ ± 4σ (height scaled to 1 at the peak), shaded from lo to hi (null: no end). */
  function normalGraph(mu, sd, lo, hi, more = []) {
    const a = mu - 4 * sd, b = mu + 4 * sd;
    const shade = ([l, h]) => {
      const L = l === null ? a : Math.max(l, a), R = h === null ? b : Math.min(h, b), pts = [[L, 0]];
      for (let i = 0; i <= 60; i++) { const x = L + ((R - L) * i) / 60; pts.push([x, Math.exp(-(((x - mu) / sd) ** 2) / 2)]); }
      pts.push([R, 0]);
      return { t: "poly", p: pts, role: "highlight" };
    };
    return graph({ view: [a, b, -0.1, 1.15], grid: false, items: [
      ...[[lo, hi], ...more].map(shade),
      { t: "fn", e: `exp(-((x - (${mu}))/${sd})^2/2)` },
      { t: "vline", x: mu, role: "muted" },
    ] });
  }
  function scatter(xs, ys, line) {
    const items = xs.map((x, i) => ({ t: "pt", x, y: ys[i] }));
    if (line) items.push({ t: "fn", e: `${line[0]} + (${line[1]})*x`, role: "secondary" });
    const lo = Math.min(0, ...ys) - 1, hi = Math.max(...ys) + 1;
    return graph({ view: [Math.min(0, ...xs) - 1, Math.max(...xs) + 1, lo, hi], items });
  }

  P.define("statistics", {
    // ---- S.1 Measures of center ---------------------------------------------------------------
    "S.1": {
      title: "Mean, median and mode",
      generate(r, level) {
        if (level === 1) {
          const kind = r.int(0, 2);   // 0 mean, 1 median, 2 mode
          const CTX = [
            ["Books finished this term by the members of a reading club", "book", "books", 1, 9],
            ["Goals a hockey team scored in its recent games", "goal", "goals", 0, 7],
            ["Hours of sleep reported by students the night before an exam", "hour", "hours", 3, 10],
            ["Customer ratings of a new app, on a scale of 1 to 10", "point", "points", 1, 10],
          ];
          for (;;) {
            const ci = r.int(0, CTX.length - 1), [ctx, one, many, lo, hi] = CTX[ci];
            const N = kind === 1 ? r.pick([5, 7, 9]) : r.int(6, 9);
            const data = Array.from({ length: N }, () => r.int(lo, hi));
            const s = sum(data), srt = sorted(data), freq = tally(data);
            const top = Math.max(...freq.map((f) => f[1])), tops = freq.filter((f) => f[1] === top);
            const intro = `${ctx}: ${M.eq(list(data))} The dot plot shows the same data.`;
            const params = { kind, ci, data, lo, hi };
            if (kind === 0) {
              if (s % N) continue;
              const mean = s / N;
              return {
                prompt: `${intro} Find the mean.`, graph: dotPlot(data),
                steps: [
                  `Add the ${n(N)} values: ${data.map(n).join(" + ")} = ${n(s)}.`,
                  `Divide by the number of values: ${xbar} = ${M.frac(n(s), n(N))} = ${unit(mean, one, many)}.`,
                ],
                answer: { kind: "number", value: mean }, answerText: unit(mean, one, many), answerInput: String(mean),
                vals: { N, s, mean }, params,
              };
            }
            if (kind === 1) {
              const pos = (N + 1) / 2, med = srt[pos - 1];
              return {
                prompt: `${intro} Find the median.`, graph: dotPlot(data),
                steps: [
                  `Sort the values: ${list(srt)}.`,
                  `With ${n(N)} values (an odd number), the median is the middle one, in position ${M.frac(`${n(N)} + 1`, "2")} = ${n(pos)}.`,
                  `The ${ord(pos)} value in the sorted list is ${n(med)}, so the median is ${unit(med, one, many)}.`,
                ],
                answer: { kind: "number", value: med }, answerText: unit(med, one, many), answerInput: String(med),
                vals: { N, pos, med }, params,
              };
            }
            if (tops.length !== 1 || top < 2) continue;
            const mode = tops[0][0];
            return {
              prompt: `${intro} Find the mode.`, graph: dotPlot(data),
              steps: [
                `Count how often each value appears: ${M.table(["Value", ...freq.map((f) => n(f[0]))], [["Count", ...freq.map((f) => n(f[1]))]])}`,
                `${n(mode)} appears ${n(top)} times, more often than any other value (the tallest stack of dots), so the mode is ${unit(mode, one, many)}.`,
              ],
              answer: { kind: "number", value: mode }, answerText: unit(mode, one, many), answerInput: String(mode),
              vals: { freq, top, mode }, params,
            };
          }
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            // median of an even number of values
            const N = r.pick([6, 8, 10]);
            const data = Array.from({ length: N }, () => r.int(8, 55));
            const srt = sorted(data), a = N / 2, m1 = srt[a - 1], m2 = srt[a], med = Q(m1 + m2, 2);
            return {
              prompt: `A commuter timed ${n(N)} trips to work, in minutes: ${M.eq(list(data))} Find the median trip time, in minutes.`,
              steps: [
                `Sort the times: ${list(srt)}.`,
                `There are ${n(N)} values, an even number, so the median is the mean of the two middle values, in positions ${n(a)} and ${n(a + 1)}.`,
                `Those values are ${n(m1)} and ${n(m2)}: ${M.frac(`${n(m1)} + ${n(m2)}`, "2")} = ${dec(med)} minutes.`,
              ],
              answer: { kind: "number", value: med.value }, answerText: `${dec(med)} minutes`, answerInput: typed(med.value),
              vals: { N, a, a1: a + 1, m1, m2, med: fv(med) }, params: { kind: 0, data },
            };
          }
          // weighted mean: a course grade
          const W = r.pick([[20, 20, 25, 35], [10, 30, 30, 30], [15, 15, 30, 40], [25, 25, 20, 30], [10, 20, 30, 40]]);
          const cats = ["Homework", "Quizzes", "Midterm exam", "Final exam"];
          const sc = W.map(() => r.int(60, 100)), prods = W.map((w, i) => w * sc[i]), T = sum(prods), g = Q(T, 100);
          return {
            prompt: `A course grade is the weighted mean of four scores, with the weights (in percent) in the table. ${M.table(["Category", "Weight (%)", "Score"], cats.map((c, i) => [c, n(W[i]), n(sc[i])]))} What is the course grade?`,
            steps: [
              `Multiply each score by its weight: ${prods.map((p, i) => `${n(W[i])} × ${n(sc[i])} = ${n(p)}`).join("; ")}.`,
              `Add the products: ${prods.map(n).join(" + ")} = ${P.grouped(T)}.`,
              `Divide by the total weight, ${W.map(n).join(" + ")} = 100: ${xbar}<sub>w</sub> = ${M.frac(P.grouped(T), "100")} = ${dec(g)}.`,
            ],
            answer: { kind: "number", value: g.value }, answerText: dec(g), answerInput: typed(g.value),
            vals: { prods, T, g: fv(g) }, params: { kind: 1, W, sc }, consts: [100],
          };
        }
        if (r.chance(0.5)) {
          // trimmed mean with an outlier
          for (;;) {
            const g = r.pick([1, 2]), N = 10;
            const base = Array.from({ length: 9 }, () => r.int(38, 95)), out = r.int(180, 450);
            const data = r.shuffle([...base, out]), srt = sorted(data), mid = srt.slice(g, N - g), ms = sum(mid), k = N - 2 * g;
            if (ms % k) continue;
            const tm = ms / k, s = sum(data), mean = Q(s, N), pct = 10 * g;
            const dropped = g === 1 ? `${n(srt[0])} and ${n(srt[N - 1])}` : `${n(srt[0])}, ${n(srt[1])}, ${n(srt[N - 2])} and ${n(srt[N - 1])}`;
            return {
              prompt: `Annual salaries at a small firm, in thousands of dollars: ${M.eq(list(data))} Find the ${n(pct)}% trimmed mean: drop the ${g === 1 ? "smallest and the largest value" : "two smallest and the two largest values"} and average the rest.`,
              steps: [
                `Sort: ${list(srt)}.`,
                `Drop ${dropped}. The remaining ${n(k)} values add to ${n(ms)}.`,
                `Trimmed mean: ${M.frac(n(ms), n(k))} = ${n(tm)} thousand dollars.`,
                `For comparison, the ordinary mean is ${M.frac(n(s), n(N))} = ${dec(mean)}: the one very high salary pulls it up, while the trimmed mean stays with the typical salaries.`,
              ],
              answer: { kind: "number", value: tm }, answerText: `${n(tm)} thousand dollars`, answerInput: String(tm),
              vals: { N, k, ms, tm, s, mean: fv(mean), pct }, params: { kind: 0, data, g },
            };
          }
        }
        // the missing value for a target mean
        for (;;) {
          const k = r.pick([3, 4, 5]), sc = Array.from({ length: k }, () => r.int(62, 98)), T = r.int(75, 92);
          const s = sum(sc), tot = T * (k + 1), need = tot - s;
          if (need < 55 || need > 100) continue;
          return {
            prompt: `Maya's scores on her first ${n(k)} tests are ${list(sc)}. What score does she need on the next test so that her mean over all ${n(k + 1)} tests is exactly ${n(T)}?`,
            steps: [
              `A mean of ${n(T)} over ${n(k + 1)} tests needs a total of ${n(T)} × ${n(k + 1)} = ${n(tot)} points.`,
              `Her ${n(k)} scores so far add to ${sc.map(n).join(" + ")} = ${n(s)}.`,
              `She needs ${n(tot)} − ${n(s)} = ${n(need)} on the next test.`,
            ],
            answer: { kind: "number", value: need }, answerText: `${n(need)} points`, answerInput: String(need),
            vals: { k1: k + 1, tot, s, need }, params: { kind: 1, k, sc, T },
          };
        }
      },
    },

    // ---- S.2 Variance & standard deviation ----------------------------------------------------
    "S.2": {
      title: "Variance and standard deviation",
      generate(r, level) {
        const devTable = (data, mu, devs, sq, m) =>
          M.table([V("x"), `${V("x")} − ${m}`, `(${V("x")} − ${m})²`], data.map((x, i) => [n(x), n(devs[i]), n(sq[i])]));
        if (level === 1) {
          for (;;) {
            const N = r.pick([4, 5, 6, 8]), data = Array.from({ length: N }, () => r.int(2, 16)), s = sum(data);
            if (s % N) continue;
            const mu = s / N, devs = data.map((x) => x - mu), sq = devs.map((d) => d * d), SS = sum(sq);
            if (SS === 0 || SS % N) continue;
            const v = SS / N, sd = Math.round(Math.sqrt(v));
            if (sd * sd !== v) continue;
            return {
              prompt: `Treat these ${n(N)} values as an entire population: ${M.eq(list(data))} Find the population standard deviation σ.`,
              steps: [
                `Mean: μ = ${M.frac(n(s), n(N))} = ${n(mu)}.`,
                `Deviations from the mean and their squares: ${devTable(data, mu, devs, sq, "μ")}`,
                `Sum of squares: SS = ${sq.map(n).join(" + ")} = ${n(SS)}. Population variance: σ² = ${M.frac("SS", V("N"))} = ${M.frac(n(SS), n(N))} = ${n(v)}.`,
                `Standard deviation: σ = ${M.sqrt(n(v))} = ${n(sd)}.`,
              ],
              answer: { kind: "number", value: sd }, answerText: `σ = ${n(sd)}`, answerInput: String(sd),
              vals: { N, s, mu, devs, sq, SS, v, sd }, params: { data },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const N = r.pick([4, 5, 6]), data = Array.from({ length: N }, () => r.int(10, 40)), s = sum(data);
            if (s % N) continue;
            const mu = s / N, devs = data.map((x) => x - mu), sq = devs.map((d) => d * d), SS = sum(sq);
            if (SS === 0) continue;
            const s2 = Q(SS, N - 1);
            return {
              prompt: `A random sample of ${n(N)} pizza delivery times, in minutes: ${M.eq(list(data))} Find the sample variance ${M.sup(V("s"), 2)} (exact, as a fraction or decimal).`,
              steps: [
                `Mean: ${xbar} = ${M.frac(n(s), n(N))} = ${n(mu)}.`,
                `Deviations from the mean and their squares: ${devTable(data, mu, devs, sq, xbar)}`,
                `Sum of squares: SS = ${sq.map(n).join(" + ")} = ${n(SS)}.`,
                `A sample divides by ${V("n")} − 1 = ${n(N - 1)}, not ${V("n")} (Bessel's correction, because the deviations were measured from ${xbar} rather than the unknown μ): ${M.sup(V("s"), 2)} = ${fc(SS, N - 1, s2)} square minutes.`,
              ],
              answer: { kind: "number", value: s2.value }, answerText: `${M.sup(V("s"), 2)} = ${fd(s2)} square minutes`, answerInput: typed(s2),
              vals: { N, n1: N - 1, s, mu, devs, sq, SS, s2: fv(s2) }, params: { data },
            };
          }
        }
        if (r.chance(0.5)) {
          // computational formula from two running totals
          const N = r.pick([10, 20, 25, 40, 50]), mu = r.int(12, 60), v = r.int(4, 40);
          const Sx = N * mu, Sxx = N * (v + mu * mu), mx2 = v + mu * mu, mu2 = mu * mu;
          return {
            prompt: `A sensor logged ${n(N)} temperature readings (°C), but kept only two running totals: Σ${V("x")} = ${P.grouped(Sx)} and Σ${M.sup(V("x"), 2)} = ${P.grouped(Sxx)}. Treating the readings as the whole population, find the variance σ² with the computational formula σ² = ${M.frac(`Σ${M.sup(V("x"), 2)}`, V("N"))} − μ².`,
            steps: [
              `Mean: μ = ${M.frac(`Σ${V("x")}`, V("N"))} = ${M.frac(P.grouped(Sx), n(N))} = ${n(mu)}.`,
              `Mean of the squares: ${M.frac(`Σ${M.sup(V("x"), 2)}`, V("N"))} = ${M.frac(P.grouped(Sxx), n(N))} = ${P.grouped(mx2)}.`,
              `σ² = ${P.grouped(mx2)} − ${M.sup(n(mu), 2)} = ${P.grouped(mx2)} − ${P.grouped(mu2)} = ${n(v)} (°C)².`,
            ],
            answer: { kind: "number", value: v }, answerText: `σ² = ${n(v)} (°C)²`, answerInput: String(v),
            vals: { mu, mx2, mu2, v }, params: { kind: 0, N, Sx, Sxx },
          };
        }
        // coefficient of variation: two scales
        for (;;) {
          const m1 = r.pick([20, 25, 40, 50, 80]), s1 = r.int(1, 8), m2 = r.pick([200, 250, 400, 500, 800]), s2 = r.int(4, 40);
          const r1 = Q(s1, m1), r2 = Q(s2, m2), cv1 = (s1 * 100) / m1, cv2 = (s2 * 100) / m2;
          if (r1.eq(r2) || s2 <= s1) continue;
          const idx = r1.cmp(r2) > 0 ? 0 : 1;
          const options = ["Line A (the bolts)", "Line B (the beams)"];
          return {
            prompt: `Line A makes bolts with mean length ${n(m1)} mm and standard deviation ${n(s1)} mm. Line B makes beams with mean length ${n(m2)} cm and standard deviation ${n(s2)} cm. Whose output is more variable relative to its mean?`,
            steps: [
              `The standard deviations are in different units and at different scales, so compare the unit-free coefficient of variation CV = ${M.frac(V("s"), xbar)}.`,
              `Line A: CV = ${M.frac(n(s1), n(m1))} = ${dec(r1)} = ${n(cv1)}%.`,
              `Line B: CV = ${M.frac(n(s2), n(m2))} = ${dec(r2)} = ${n(cv2)}%.`,
              `${idx === 0 ? `${n(cv1)}% &gt; ${n(cv2)}%: the bolts vary more relative to their size${s2 > s1 ? ", even though the beams have the larger standard deviation" : ""}.` : `${n(cv2)}% &gt; ${n(cv1)}%: the beams vary more relative to their size.`}`,
            ],
            answer: { kind: "choice", options, index: idx }, answerText: options[idx],
            vals: { r1: fv(r1), r2: fv(r2), cv1, cv2 }, params: { kind: 1, m1, s1, m2, s2 },
          };
        }
      },
    },

    // ---- S.3 Quartiles, IQR & outliers --------------------------------------------------------
    "S.3": {
      title: "Quartiles, IQR and outliers",
      generate(r, level) {
        if (level === 1) {
          const N = 8, srt = sorted(Array.from({ length: N }, () => r.int(8, 45)));
          const q1 = Q(srt[1] + srt[2], 2), q3 = Q(srt[5] + srt[6], 2), iqr = q3.sub(q1);
          return {
            prompt: `The sorted numbers of push-ups that ${n(N)} students did in one minute: ${M.eq(list(srt))} Find the interquartile range (IQR). Take each quartile as the median of its half of the data.`,
            steps: [
              `The lower half is the first four values: ${list(srt.slice(0, 4))}. Its median is Q₁ = ${M.frac(`${n(srt[1])} + ${n(srt[2])}`, "2")} = ${dec(q1)}.`,
              `The upper half is the last four values: ${list(srt.slice(4))}. Its median is Q₃ = ${M.frac(`${n(srt[5])} + ${n(srt[6])}`, "2")} = ${dec(q3)}.`,
              `IQR = Q₃ − Q₁ = ${dec(q3)} − ${dec(q1)} = ${dec(iqr)}: the middle half of the students lie within a band ${dec(iqr)} push-ups wide.`,
            ],
            answer: { kind: "number", value: iqr.value }, answerText: dec(iqr), answerInput: typed(iqr.value),
            vals: { q1: fv(q1), q3: fv(q3), iqr: fv(iqr) }, params: { N, srt },
          };
        }
        if (level === 2) {
          for (;;) {
            const N = 10, dir = r.pick([1, -1]);
            const base = Array.from({ length: 9 }, () => r.int(20, 45)), out = dir > 0 ? r.int(62, 99) : r.int(0, 6);
            const data = r.shuffle([...base, out]), srt = sorted(data);
            const q1 = srt[2], q3 = srt[7], iqr = q3 - q1, step = 1.5 * iqr, lf = q1 - step, uf = q3 + step;
            const outs = srt.filter((x) => x < lf || x > uf);
            if (iqr === 0 || outs.length !== 1 || outs[0] !== out || data.some((x) => x === lf || x === uf)) continue;
            return {
              prompt: `Response times of a web server, in milliseconds, for ${n(N)} requests: ${M.eq(list(data))} Use Tukey's fences (1.5 × IQR beyond the quartiles) to find the one outlier.`,
              steps: [
                `Sort: ${list(srt)}.`,
                `Each half has five values, and each quartile is the middle (3rd) value of its half: Q₁ = ${n(q1)} and Q₃ = ${n(q3)}, so IQR = ${n(q3)} − ${n(q1)} = ${n(iqr)}.`,
                `1.5 × IQR = 1.5 × ${n(iqr)} = ${n(step)}. Lower fence: ${n(q1)} − ${n(step)} = ${n(lf)}. Upper fence: ${n(q3)} + ${n(step)} = ${n(uf)}.`,
                `Only ${n(out)} lies ${dir > 0 ? "above the upper" : "below the lower"} fence, so it is the outlier.`,
              ],
              answer: { kind: "number", value: out }, answerText: `${n(out)} ms`, answerInput: String(out),
              vals: { N, q1, q3, iqr, step, lf, uf, out }, params: { data }, consts: [1.5, 3],
            };
          }
        }
        if (r.chance(0.5)) {
          // read a box plot
          for (;;) {
            const mn = r.int(0, 10), q1 = mn + r.int(2, 8), med = q1 + r.int(2, 6), q3 = med + r.int(2, 6), mx = q3 + r.int(2, 9);
            const iqr = q3 - q1, step = 1.5 * iqr, uf = q3 + step, lf = q1 - step;
            if (iqr % 2 || mx > uf || mn < lf) continue;
            const items = [
              { t: "poly", p: [[q1, 1.5], [q3, 1.5], [q3, 2.5], [q1, 2.5]] },
              { t: "seg", a: [med, 1.5], b: [med, 2.5], role: "highlight" },
              { t: "seg", a: [mn, 2], b: [q1, 2] }, { t: "seg", a: [q3, 2], b: [mx, 2] },
              { t: "seg", a: [mn, 1.75], b: [mn, 2.25] }, { t: "seg", a: [mx, 1.75], b: [mx, 2.25] },
              ...[mn, q1, med, q3, mx].map((v) => ({ t: "text", x: v, y: 1, s: String(v) })),
            ];
            return {
              prompt: `The box plot summarizes the wait times, in minutes, at a clinic. What is the largest wait time that Tukey's rule (more than 1.5 × IQR above Q₃) would not flag as an outlier?`,
              graph: graph({ view: [mn - 2, mx + 2, 0.4, 3.2], axes: false, grid: false, items }),
              steps: [
                `The box runs from Q₁ to Q₃, with the median inside it: Q₁ = ${n(q1)}, median ${n(med)}, Q₃ = ${n(q3)}. The whiskers reach the minimum ${n(mn)} and the maximum ${n(mx)}.`,
                `IQR = Q₃ − Q₁ = ${n(q3)} − ${n(q1)} = ${n(iqr)}, and 1.5 × ${n(iqr)} = ${n(step)}.`,
                `Upper fence: Q₃ + 1.5 × IQR = ${n(q3)} + ${n(step)} = ${n(uf)}. A wait up to ${n(uf)} minutes is not flagged; anything longer is an outlier. (The longest observed wait, ${n(mx)}, is inside the fence, which is why the whisker reaches it.)`,
              ],
              answer: { kind: "number", value: uf }, answerText: `${n(uf)} minutes`, answerInput: String(uf),
              vals: { iqr, step, uf }, params: { kind: 0, mn, q1, med, q3, mx }, consts: [1.5],
            };
          }
        }
        // percentile by interpolation
        const N = 11, srt = sorted(r.sample(Array.from({ length: 60 }, (_, i) => 40 + i), N));
        const p = r.pick([15, 25, 35, 45, 55, 65, 75, 85, 30, 70, 90]);
        const L = Q(p * (N - 1), 100).add(1), j = Math.floor(L.value), f = L.sub(j);
        const a = srt[j - 1], b = f.n === 0 ? a : srt[j], ans = Q(a).add(f.mul(b - a));
        const steps = [
          `Position in the sorted list: ${V("L")} = ${M.frac(V("p"), "100")}(${V("n")} − 1) + 1 = ${M.frac(n(p), "100")} × ${n(N - 1)} + 1 = ${dec(L)}.`,
        ];
        if (f.n === 0) steps.push(`${V("L")} is a whole number, so the ${ord(p)} percentile is the ${ord(j)} value: ${n(a)}.`);
        else steps.push(`${V("L")} = ${dec(L)} lies between the ${ord(j)} value (${n(a)}) and the ${ord(j + 1)} value (${n(b)}), ${dec(f)} of the way along.`,
          `Interpolate: ${n(a)} + ${dec(f)} × (${n(b)} − ${n(a)}) = ${n(a)} + ${dec(f)} × ${n(b - a)} = ${dec(ans)}.`);
        return {
          prompt: `Eleven sorted exam scores: ${M.eq(list(srt))} Find the ${ord(p)} percentile using the position ${V("L")} = ${M.frac(V("p"), "100")}(${V("n")} − 1) + 1 and linear interpolation between neighbors.`,
          steps, answer: { kind: "number", value: ans.value }, answerText: dec(ans), answerInput: typed(ans.value),
          vals: { N, n1: N - 1, L: fv(L), j, j1: j + 1, f: fv(f), a, b, ba: b - a, ans: fv(ans) }, params: { kind: 1, srt, p }, consts: [100],
        };
      },
    },

    // ---- S.4 z-scores -----------------------------------------------------------------------------
    "S.4": {
      title: "z-scores and standardizing",
      generate(r, level) {
        if (level === 1) {
          const z = r.pick([-2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5]), sd = r.pick([4, 6, 8, 10, 12]), mu = r.int(60, 80), x = mu + z * sd;
          return {
            prompt: `Exam scores have mean μ = ${n(mu)} and standard deviation σ = ${n(sd)}. What is the ${V("z")}-score of a score of ${n(x)}?`,
            steps: [
              `${V("z")} = ${M.frac(`${V("x")} − μ`, "σ")} = ${M.frac(`${n(x)} − ${n(mu)}`, n(sd))} = ${M.frac(n(x - mu), n(sd))} = ${n(z)}.`,
              `The score is ${n(Math.abs(z))} standard deviation${Math.abs(z) === 1 ? "" : "s"} ${z > 0 ? "above" : "below"} the mean.`,
            ],
            answer: { kind: "number", value: z }, answerText: `${V("z")} = ${n(z)}`, answerInput: String(z),
            vals: { diff: x - mu, z, az: Math.abs(z) }, params: { mu, sd, x },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const z = r.pick([-2.25, -1.75, -1.25, -0.75, 0.75, 1.25, 1.75, 2.25, -1.5, 1.5]), sd = r.pick([4, 8, 12, 20, 40, 80]), mu = r.pick([100, 250, 500, 600]);
            const zs = z * sd, x = mu + zs;
            return {
              prompt: `On an aptitude test with mean ${n(mu)} and standard deviation ${n(sd)}, a candidate's standardized score is ${V("z")} = ${n(z)}. What was the raw score?`,
              steps: [
                `Back-transform: ${V("x")} = μ + ${V("z")}σ.`,
                `${V("x")} = ${n(mu)} + ${np(z)} × ${n(sd)} = ${n(mu)} + ${np(zs)} = ${n(x)}.`,
              ],
              answer: { kind: "number", value: x }, answerText: n(x), answerInput: String(x),
              vals: { zs, x }, params: { kind: 0, mu, sd, z },
            };
          }
          for (;;) {
            const data = Array.from({ length: 6 }, () => r.int(10, 90)), lo = Math.min(...data), hi = Math.max(...data);
            const cand = data.filter((x) => x !== lo && x !== hi);
            if (hi - lo < 10 || !cand.length) continue;
            const x = r.pick(cand), ans = Q(x - lo, hi - lo);
            return {
              prompt: `Min–max scaling maps a data set onto [0, 1] with ${V("x")}′ = ${M.frac(`${V("x")} − ${M.sub(V("x"), "min")}`, `${M.sub(V("x"), "max")} − ${M.sub(V("x"), "min")}`)}. For the data ${M.eq(list(data))} what is the scaled value of ${n(x)}?`,
              steps: [
                `The smallest value is ${n(lo)} and the largest is ${n(hi)}, so the range is ${n(hi)} − ${n(lo)} = ${n(hi - lo)}.`,
                `${V("x")}′ = ${M.frac(`${n(x)} − ${n(lo)}`, n(hi - lo))} = ${fc(x - lo, hi - lo, ans)}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: fd(ans), answerInput: typed(ans),
              vals: { lo, hi, rng: hi - lo, top: x - lo, ans: fv(ans) }, params: { kind: 1, data, x },
            };
          }
        }
        for (;;) {
          const z1 = r.pick([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]), z2 = r.pick([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
          if (z1 === z2) continue;
          const s1 = r.pick([4, 8, 12, 16]), m1 = r.int(55, 75), s2 = r.pick([40, 80, 120, 160]), m2 = r.pick([400, 500, 600]);
          const x1 = m1 + z1 * s1, x2 = m2 + z2 * s2;
          const idx = z1 > z2 ? 0 : 1, options = ["Ana", "Ben"];
          return {
            prompt: `Ana scored ${n(x1)} on a chemistry exam (class mean ${n(m1)}, SD ${n(s1)}). Ben scored ${n(x2)} on a physics exam (class mean ${n(m2)}, SD ${n(s2)}). Relative to their own class, who did better?`,
            steps: [
              `Raw scores on different scales can't be compared; compare ${V("z")}-scores, the number of SDs above each class mean.`,
              `Ana: ${V("z")} = ${M.frac(`${n(x1)} − ${n(m1)}`, n(s1))} = ${M.frac(n(x1 - m1), n(s1))} = ${n(z1)}.`,
              `Ben: ${V("z")} = ${M.frac(`${n(x2)} − ${n(m2)}`, n(s2))} = ${M.frac(n(x2 - m2), n(s2))} = ${n(z2)}.`,
              `${idx === 0 ? `Ana's ${n(z1)} &gt; Ben's ${n(z2)}` : `Ben's ${n(z2)} &gt; Ana's ${n(z1)}`}, so ${options[idx]} did relatively better.`,
            ],
            answer: { kind: "choice", options, index: idx }, answerText: options[idx],
            vals: { d1: x1 - m1, d2: x2 - m2, z1, z2 }, params: { x1, m1, s1, x2, m2, s2 },
          };
        }
      },
    },

    // ---- S.5 Shape: skewness & kurtosis ----------------------------------------------------------
    "S.shape": {
      title: "Skewness and kurtosis",
      generate(r, level) {
        if (level === 1) {
          const dir = r.int(0, 2);   // 0 right, 1 left, 2 symmetric
          const med = r.int(40, 70), gap = r.int(4, 15), mean = dir === 0 ? med + gap : dir === 1 ? med - gap : med;
          const shapes = [[3, 9, 12, 8, 5, 3, 2, 1], [1, 2, 3, 5, 8, 12, 9, 3], [1, 3, 7, 11, 11, 7, 3, 1]];
          const hs = shapes[dir].map((h) => (dir === 2 ? h : h + r.int(0, 1)));
          const options = ["Skewed right (a long tail to the right)", "Skewed left (a long tail to the left)", "Roughly symmetric"];
          const g = bars(hs.map((_, i) => i), hs, 1);
          return {
            prompt: `The histogram shows a sample of measurements. Their mean is ${n(mean)} and their median is ${n(med)}. Describe the shape of the distribution.`,
            graph: g,
            steps: [
              `The median is the middle value and ignores how far out the extremes are; the mean is pulled toward a long tail.`,
              dir === 2 ? `Mean = median = ${n(med)}: nothing pulls the mean to one side.` : `Mean − median = ${n(mean)} − ${n(med)} = ${n(mean - med)}: the mean is ${dir === 0 ? "above" : "below"} the median, so a tail stretches to the ${dir === 0 ? "right" : "left"}.`,
              dir === 0 ? `The histogram agrees: a peak at the left and a long right tail (typically mode &lt; median &lt; mean).` : dir === 1 ? `The histogram agrees: a peak at the right and a long left tail (typically mean &lt; median &lt; mode).` : `The histogram agrees: the bars mirror each other about the center.`,
            ],
            answer: { kind: "choice", options, index: dir }, answerText: options[dir],
            vals: { diff: mean - med }, params: { mean, med },
          };
        }
        // data with 5 values whose deviations make the moments friendly
        const N = 5;
        for (;;) {
          const d = Array.from({ length: 4 }, () => r.int(-6, 6));
          d.push(-sum(d));
          if (Math.abs(d[4]) > 9) continue;
          const SS = sum(d.map((x) => x * x));
          if (SS === 0) continue;
          const mean = r.int(10, 25), data = d.map((x) => mean + x), s = sum(data), m2 = Q(SS, N);
          if (level === 2) {
            if (SS % N || !isSq(SS / N)) continue;
            const k = Math.round(Math.sqrt(SS / N)), cubes = d.map((x) => x ** 3), S3 = sum(cubes);
            if (S3 === 0) continue;
            const m3 = Q(S3, N), k3 = k ** 3, g1 = m3.div(k3);
            return {
              prompt: `Find the sample skewness of ${M.eq(list(data))} using ${M.sub(V("g"), "1")} = ${M.frac(M.sub(V("m"), "3"), M.sup(M.sub(V("m"), "2"), "3/2"))}, where ${M.sub(V("m"), "2")} and ${M.sub(V("m"), "3")} are the means (dividing by ${V("n")}) of the squared and cubed deviations from ${xbar}. Round to 2 decimal places.`,
              steps: [
                `Mean: ${xbar} = ${M.frac(n(s), n(N))} = ${n(mean)}. Deviations ${V("d")} = ${V("x")} − ${xbar}: ${list(d)}.`,
                `Squares: ${list(d.map((x) => x * x))}, sum ${n(SS)}, so ${M.sub(V("m"), "2")} = ${M.frac(n(SS), n(N))} = ${n(SS / N)}.`,
                `Cubes: ${list(cubes)}, sum ${n(S3)}, so ${M.sub(V("m"), "3")} = ${M.frac(n(S3), n(N))} = ${dec(m3)}.`,
                `${M.sup(M.sub(V("m"), "2"), "3/2")} = ${M.sup(`(${M.sqrt(n(SS / N))})`, 3)} = ${M.sup(n(k), 3)} = ${n(k3)}.`,
                `${M.sub(V("g"), "1")} = ${M.frac(dec(m3), n(k3))} ${eqr(g1, 2)}. ${g1.n > 0 ? "Positive: the longer tail is on the right." : "Negative: the longer tail is on the left."}`,
              ],
              answer: { kind: "number", value: g1.value, dp: 2 }, answerText: `${M.sub(V("g"), "1")} ${eqr(g1, 2)}`, answerInput: rq(g1, 2).replace("−", "-"),
              vals: { s, mean, d, sq: d.map((x) => x * x), SS, m2: SS / N, cubes, S3, m3: fv(m3), k, k3, g1: fv(g1) }, params: { data }, consts: [3, 5],
            };
          }
          const fourth = d.map((x) => x ** 4), S4 = sum(fourth), m4 = Q(S4, N), m2sq = m2.mul(m2), ratio = m4.div(m2sq), g2 = ratio.sub(3);
          return {
            prompt: `Find the excess kurtosis of ${M.eq(list(data))} using ${M.sub(V("g"), "2")} = ${M.frac(M.sub(V("m"), "4"), M.sup(M.sub(V("m"), "2"), 2))} − 3, where ${M.sub(V("m"), "2")} and ${M.sub(V("m"), "4")} are the means (dividing by ${V("n")}) of the squared and fourth-power deviations from ${xbar}. Round to 2 decimal places.`,
            steps: [
              `Mean: ${xbar} = ${M.frac(n(s), n(N))} = ${n(mean)}. Deviations ${V("d")} = ${V("x")} − ${xbar}: ${list(d)}.`,
              `Squares: ${list(d.map((x) => x * x))}, sum ${n(SS)}, so ${M.sub(V("m"), "2")} = ${M.frac(n(SS), n(N))} = ${dec(m2)} and ${M.sup(M.sub(V("m"), "2"), 2)} = ${dec(m2sq)}.`,
              `Fourth powers: ${list(fourth)}, sum ${P.grouped(S4)}, so ${M.sub(V("m"), "4")} = ${M.frac(P.grouped(S4), n(N))} = ${dec(m4)}.`,
              `${M.frac(M.sub(V("m"), "4"), M.sup(M.sub(V("m"), "2"), 2))} = ${M.frac(dec(m4), dec(m2sq))} ${eqs(ratio)} ${dec(ratio)}.`,
              `${M.sub(V("g"), "2")} = ${dec(ratio)} − 3 ${eqr(g2, 2)}. ${g2.n > 0 ? "Positive: heavier tails than a normal distribution (more extreme values)." : g2.n < 0 ? "Negative: lighter tails than a normal distribution." : "Zero: the same tail weight as a normal distribution."}`,
            ],
            answer: { kind: "number", value: g2.value, dp: 2 }, answerText: `${M.sub(V("g"), "2")} ${eqr(g2, 2)}`, answerInput: rq(g2, 2).replace("−", "-"),
            vals: { s, mean, d, sq: d.map((x) => x * x), SS, m2: fv(m2), m2sq: fv(m2sq), fourth, S4, m4: fv(m4), ratio: fv(ratio), g2: fv(g2) }, params: { data }, consts: [3, 4, 5],
          };
        }
      },
    },

    // ---- S.6 Sample spaces, events & the axioms ---------------------------------------------------
    "S.axioms": {
      title: "Sample spaces and classical probability",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const m = r.pick([6, 8, 10, 12, 20]), kind = r.int(0, 2), all = Array.from({ length: m }, (_, i) => i + 1);
            const k = r.int(2, 5), t = r.int(2, m - 2);
            const isPrime = (x) => x > 1 && all.slice(1, x - 1).every((d) => d === 1 || x % d !== 0);
            const A = kind === 0 ? all.filter((x) => x % k === 0) : kind === 1 ? all.filter((x) => x > t) : all.filter(isPrime);
            const desc = kind === 0 ? `a multiple of ${n(k)}` : kind === 1 ? `a number greater than ${n(t)}` : "a prime number";
            const c = A.length, p = Q(c, m);
            if (c === 0) continue;
            return {
              prompt: `A fair ${n(m)}-sided die, numbered 1 to ${n(m)}, is rolled. What is the probability that it shows ${desc}?`,
              steps: [
                `The sample space ${V("S")} = {1, 2, …, ${n(m)}} has ${n(m)} equally likely outcomes.`,
                `The event is ${V("A")} = {${list(A)}}, so |${V("A")}| = ${n(c)}.`,
                `Classical probability: ${pr(V("A"))} = ${M.frac(`|${V("A")}|`, `|${V("S")}|`)} = ${M.frac(n(c), n(m))}${p.d !== m ? ` = ${M.f(p)}` : ""}.`,
              ],
              answer: { kind: "number", value: p.value }, answerText: M.f(p), answerInput: typed(p),
              vals: { A, c, p: fv(p) }, params: { m, kind, k: kind === 0 ? k : 0, t: kind === 1 ? t : 0 },
            };
          }
        }
        if (level === 2) {
          const kind = r.int(0, 1), s = kind === 0 ? r.int(3, 11) : r.int(8, 11);
          const pairs = [];
          for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (kind === 0 ? a + b === s : a + b >= s) pairs.push([a, b]);
          const c = pairs.length, p = Q(c, 36);
          const items = [];
          for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) items.push({ t: "pt", x: a, y: b, role: (kind === 0 ? a + b === s : a + b >= s) ? "highlight" : "muted" });
          const ts = [], ws = [];
          for (let u = s; u <= 12; u++) { ts.push(u); ws.push(6 - Math.abs(u - 7)); }
          return {
            prompt: `Two fair six-sided dice are rolled. What is the probability that the sum is ${kind === 0 ? n(s) : `at least ${n(s)}`}? The grid shows all outcomes (first die across, second die up).`,
            graph: graph({ view: [-0.5, 7, -0.5, 7], equal: true, items }),
            steps: [
              `There are 6 × 6 = 36 equally likely ordered outcomes (first die, second die).`,
              kind === 0
                ? `The outcomes with sum ${n(s)} are ${pairs.map(([a, b]) => `(${a}, ${b})`).join(", ")}: ${n(c)} of them (the highlighted diagonal).`
                : `Count by sum: ${ts.map((u, i) => `sum ${n(u)} in ${n(ws[i])} way${ws[i] === 1 ? "" : "s"}`).join(", ")}; in total ${ws.map(n).join(" + ")} = ${n(c)} outcomes.`,
              `${pr("event")} = ${M.frac(n(c), "36")} = ${M.f(p)}.`,
            ],
            answer: { kind: "number", value: p.value }, answerText: M.f(p), answerInput: typed(p),
            vals: { c, p: fv(p), ws, ts }, params: { kind, s }, consts: [3, 4, 5, 6, 36],
          };
        }
        for (;;) {
          const c = r.pick([5, 10, 15, 20]), k = r.pick([2, 3, 4]), ab = 100 - c * (k + 1);
          if (ab < 20) continue;
          const a = 5 * r.int(1, ab / 5 - 1), b = ab - a;
          const pa = Q(a, 100), pb = Q(b, 100), pc = Q(c, 100), py = Q(k * c, 100), right = Q(c * (k + 1), 100), pab = Q(ab, 100);
          return {
            prompt: `A spinner lands on red, blue, green or yellow. ${pr("red")} = ${dec(pa)} and ${pr("blue")} = ${dec(pb)}, and yellow is ${n(k)} times as likely as green. Find ${pr("green")}.`,
            steps: [
              `The probabilities of all the outcomes must add to 1 (the axiom ${pr(V("S"))} = 1). Let ${V("g")} = ${pr("green")}; then ${pr("yellow")} = ${n(k)}${V("g")}.`,
              `${dec(pa)} + ${dec(pb)} + ${V("g")} + ${n(k)}${V("g")} = 1, so ${n(k + 1)}${V("g")} = 1 − ${dec(pab)} = ${dec(right)}.`,
              `${V("g")} = ${M.frac(dec(right), n(k + 1))} = ${dec(pc)}.`,
              `Check: ${pr("yellow")} = ${n(k)} × ${dec(pc)} = ${dec(py)}, the four add to ${dec(pa)} + ${dec(pb)} + ${dec(pc)} + ${dec(py)} = 1, and none is negative.`,
            ],
            answer: { kind: "number", value: pc.value }, answerText: dec(pc), answerInput: typed(pc.value),
            vals: { k1: k + 1, pab: fv(pab), right: fv(right), pc: fv(pc), py: fv(py) }, params: { pa: fv(pa), pb: fv(pb), k },
          };
        }
      },
    },

    // ---- S.7 Basic probability rules ------------------------------------------------------------------
    "S.5": {
      title: "Complements, unions and “at least one”",
      generate(r, level) {
        if (level === 1) {
          const CTX = [["a flight is delayed", "the flight leaves on time"], ["it rains tomorrow", "it stays dry tomorrow"],
            ["a randomly chosen battery is defective", "the battery works"], ["a shopper uses a coupon", "the shopper does not use a coupon"]];
          const ci = r.int(0, CTX.length - 1), p = Q(r.int(3, 97), 100), q = Q(1).sub(p);
          return {
            prompt: `The probability that ${CTX[ci][0]} is ${dec(p)}. What is the probability that ${CTX[ci][1]}?`,
            steps: [
              `The two events are complements: exactly one of them happens. Complement rule: ${pr(M.sup(V("A"), "c"))} = 1 − ${pr(V("A"))}.`,
              `1 − ${dec(p)} = ${dec(q)}.`,
            ],
            answer: { kind: "number", value: q.value }, answerText: dec(q), answerInput: typed(q.value),
            vals: { q: fv(q) }, params: { ci, p: fv(p) },
          };
        }
        if (level === 2) {
          for (;;) {
            const a = r.int(20, 60), b = r.int(15, 50), c = r.int(5, Math.min(a, b) - 3), kind = r.int(0, 1);
            if (a + b - c > 95) continue;
            const pa = Q(a, 100), pb = Q(b, 100), pc = Q(c, 100), u = pa.add(pb).sub(pc), none = Q(1).sub(u);
            const ans = kind === 0 ? u : none;
            const steps = [
              `"Or" is the union. Addition rule: ${pr(`${V("M")} ∪ ${V("C")}`)} = ${pr(V("M"))} + ${pr(V("C"))} − ${pr(`${V("M")} ∩ ${V("C")}`)}; the overlap is subtracted because it was counted in both.`,
              `${pr(`${V("M")} ∪ ${V("C")}`)} = ${dec(pa)} + ${dec(pb)} − ${dec(pc)} = ${dec(u)}.`,
            ];
            if (kind === 1) steps.push(`"Neither" is the complement of the union: 1 − ${dec(u)} = ${dec(none)}.`);
            return {
              prompt: `At a university, the probability that a random student takes a math course (${V("M")}) is ${dec(pa)}, a computing course (${V("C")}) is ${dec(pb)}, and both is ${dec(pc)}. What is the probability that a random student takes ${kind === 0 ? "a math course or a computing course (or both)" : "neither"}?`,
              graph: graph({ view: [-3.6, 3.6, -2.4, 2.4], equal: true, axes: false, grid: false, items: [
                { t: "circle", c: [-0.9, 0], r: 1.7 }, { t: "circle", c: [0.9, 0], r: 1.7, role: "secondary" },
                { t: "text", x: -2.2, y: 1.7, s: "M" }, { t: "text", x: 2.2, y: 1.7, s: "C" }] }),
              steps, answer: { kind: "number", value: ans.value }, answerText: dec(ans), answerInput: typed(ans.value),
              vals: { u: fv(u), none: fv(none) }, params: { kind, pa: fv(pa), pb: fv(pb), pc: fv(pc) },
            };
          }
        }
        if (r.chance(0.5)) {
          const k = r.pick([2, 3, 4]), qs = Array.from({ length: k }, () => Q(r.pick([5, 10, 15, 20, 25, 30]), 100));
          const none = fprod(qs), ans = Q(1).sub(none);
          return {
            prompt: `A data center has ${n(k)} backup generators that fail independently. During an outage they fail to start with probabilities ${qs.map((q) => dec(q)).join(", ")}. What is the probability that at least one starts?`,
            steps: [
              `"At least one starts" is the complement of "none start", which is a single easy event.`,
              `Independent events multiply: ${pr("none start")} = ${qs.map((q) => dec(q)).join(" × ")} = ${dec(none, 8)}.`,
              `${pr("at least one starts")} = 1 − ${dec(none, 8)} = ${dec(ans, 8)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: dec(ans, 8), answerInput: typed(ans.value),
            vals: { none: fv(none), ans: fv(ans) }, params: { kind: 0, k, qs: qs.map(fv) },
          };
        }
        for (;;) {
          // Venn regions in hundredths: A only, B only, C only, AB only, AC only, BC only, ABC
          const g = Array.from({ length: 7 }, (_, i) => r.int(i < 3 ? 6 : 2, i < 3 ? 22 : 9));
          const tot = sum(g);
          if (tot > 96) continue;
          const [oa, ob, oc, ab, ac, bc, abc] = g;
          const A = oa + ab + ac + abc, B = ob + ab + bc + abc, Cc = oc + ac + bc + abc, AB = ab + abc, AC = ac + abc, BC = bc + abc;
          const h = (x) => dec(Q(x, 100));
          const singles = A + B + Cc, pairs = AB + AC + BC, u = singles - pairs + abc;
          return {
            prompt: `A survey asks households which of three streaming services they pay for. For a random household: ${pr(V("A"))} = ${h(A)}, ${pr(V("B"))} = ${h(B)}, ${pr(V("C"))} = ${h(Cc)}, ${pr(`${V("A")} ∩ ${V("B")}`)} = ${h(AB)}, ${pr(`${V("A")} ∩ ${V("C")}`)} = ${h(AC)}, ${pr(`${V("B")} ∩ ${V("C")}`)} = ${h(BC)}, and ${pr(`${V("A")} ∩ ${V("B")} ∩ ${V("C")}`)} = ${h(abc)}. What is the probability that a household pays for at least one of them?`,
            steps: [
              `Three-event inclusion–exclusion: add the singles, subtract the pairs, add back the triple (it was added three times and subtracted three times).`,
              `Singles: ${h(A)} + ${h(B)} + ${h(Cc)} = ${h(singles)}. Pairs: ${h(AB)} + ${h(AC)} + ${h(BC)} = ${h(pairs)}.`,
              `${pr(`${V("A")} ∪ ${V("B")} ∪ ${V("C")}`)} = ${h(singles)} − ${h(pairs)} + ${h(abc)} = ${h(u)}.`,
            ],
            answer: { kind: "number", value: u / 100 }, answerText: h(u), answerInput: typed(Q(u, 100).value),
            vals: { singles: singles / 100, pairs: pairs / 100, u: u / 100 }, params: { kind: 1, A: A / 100, B: B / 100, C: Cc / 100, AB: AB / 100, AC: AC / 100, BC: BC / 100, ABC: abc / 100 },
          };
        }
      },
    },

    // ---- S.8 Counting ---------------------------------------------------------------------------------
    "S.8": {
      title: "Counting: permutations and combinations",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.5)) {
            const a = r.int(3, 8), b = r.int(2, 6), c = r.int(2, 5), ans = a * b * c;
            return {
              prompt: `A café offers ${n(a)} sandwiches, ${n(b)} drinks and ${n(c)} desserts. How many different meals of one sandwich, one drink and one dessert can be ordered?`,
              steps: [
                `Multiplication principle: independent choices multiply.`,
                `${n(a)} × ${n(b)} × ${n(c)} = ${n(ans)} meals.`,
              ],
              answer: { kind: "number", value: ans }, answerText: `${n(ans)} meals`, answerInput: String(ans),
              vals: { ans }, params: { kind: 0, a, b, c },
            };
          }
          const N = r.int(6, 12), k = r.pick([2, 3]), fs = Array.from({ length: k }, (_, i) => N - i), ans = fs.reduce((x, y) => x * y, 1);
          return {
            prompt: k === 3
              ? `${n(N)} runners are in a race. In how many ways can the gold, silver and bronze medals be awarded?`
              : `A club of ${n(N)} members elects a president and a vice-president (different people). In how many ways can this be done?`,
            steps: [
              `Order matters (the positions are different) and nobody fills two positions: a permutation, ${V("P")}(${V("n")}, ${V("r")}) = ${M.frac(`${V("n")}!`, `(${V("n")} − ${V("r")})!`)}.`,
              `${n(N)} choices for the first position, then ${n(N - 1)} for the second${k === 3 ? `, then ${n(N - 2)} for the third` : ""}: ${fs.map(n).join(" × ")} = ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: `${n(ans)} ways`, answerInput: String(ans),
            vals: { fs, ans }, params: { kind: 1, N, k },
          };
        }
        if (level === 2) {
          const N = r.int(6, 15), k = r.int(2, Math.min(5, N - 2));
          const fs = Array.from({ length: k }, (_, i) => N - i), num = fs.reduce((x, y) => x * y, 1), kf = fact(k), ans = num / kf;
          return {
            prompt: `A committee of ${n(k)} is chosen from ${n(N)} volunteers. How many different committees are possible?`,
            steps: [
              `A committee has no order, so this is a combination: C(${V("n")}, ${V("r")}) = ${M.frac(`${V("n")}!`, `${V("r")}! (${V("n")} − ${V("r")})!`)}.`,
              `Cancel (${n(N)} − ${n(k)})! = ${n(N - k)}! from the top: C(${n(N)}, ${n(k)}) = ${M.frac(fs.map(n).join(" × "), `${n(k)}!`)}.`,
              `${M.frac(P.grouped(num), n(kf))} = ${P.grouped(ans)} committees. (Dividing by ${n(k)}! = ${n(kf)} removes the orderings of the same ${n(k)} people.)`,
            ],
            answer: { kind: "number", value: ans }, answerText: `${P.grouped(ans)} committees`, answerInput: String(ans),
            vals: { fs, Nk: N - k, num, kf, ans }, params: { N, k },
          };
        }
        const kind = r.int(0, 2);
        if (kind === 0) {
          const WORDS = [["STATISTICS", [["S", 3], ["T", 3], ["I", 2], ["A", 1], ["C", 1]]], ["BANANA", [["A", 3], ["N", 2], ["B", 1]]],
            ["LETTER", [["E", 2], ["T", 2], ["L", 1], ["R", 1]]], ["SUCCESS", [["S", 3], ["C", 2], ["U", 1], ["E", 1]]],
            ["BALLOON", [["L", 2], ["O", 2], ["B", 1], ["A", 1], ["N", 1]]], ["COMMITTEE", [["M", 2], ["T", 2], ["E", 2], ["C", 1], ["O", 1], ["I", 1]]],
            ["MISSISSIPPI", [["S", 4], ["I", 4], ["P", 2], ["M", 1]]]];
          const wi = r.int(0, WORDS.length - 1), [w, reps] = WORDS[wi], N = w.length, rep = reps.filter((x) => x[1] > 1);
          const top = fact(N), dens = rep.map((x) => fact(x[1])), den = dens.reduce((x, y) => x * y, 1), ans = top / den;
          return {
            prompt: `How many distinct arrangements of the letters of ${w} are there?`,
            steps: [
              `${w} has ${n(N)} letters, with repeats: ${rep.map(([l, c]) => `${l} appears ${n(c)} times`).join(", ")}.`,
              `Swapping identical letters gives the same word, so divide ${n(N)}! by the factorial of each repeat count: ${M.frac(`${n(N)}!`, rep.map(([, c]) => `${n(c)}!`).join(" "))}.`,
              `${M.frac(P.grouped(top), rep.length > 1 ? `${dens.map(n).join(" × ")}` : n(den))} = ${M.frac(P.grouped(top), P.grouped(den))} = ${P.grouped(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: P.grouped(ans), answerInput: String(ans),
            vals: { N, counts: rep.map((x) => x[1]), top, dens, den, ans }, params: { kind, wi },
          };
        }
        if (kind === 1) {
          for (;;) {
            const W = r.int(4, 8), Mn = r.int(4, 8), k = r.int(3, 5), j = r.int(1, k - 1);
            if (j > W || k - j > Mn) continue;
            const cw = C(W, j), cm = C(Mn, k - j), ans = cw * cm;
            return {
              prompt: `A team of ${n(k)} is chosen from ${n(W)} women and ${n(Mn)} men. How many different teams contain exactly ${n(j)} ${j === 1 ? "woman" : "women"}?`,
              steps: [
                `Choose the women and the men separately; order within the team does not matter.`,
                `Women: C(${n(W)}, ${n(j)}) = ${n(cw)}. Men: the other ${n(k - j)} place${k - j === 1 ? "" : "s"}, C(${n(Mn)}, ${n(k - j)}) = ${n(cm)}.`,
                `Multiplication principle: ${n(cw)} × ${n(cm)} = ${n(ans)} teams.`,
              ],
              answer: { kind: "number", value: ans }, answerText: `${n(ans)} teams`, answerInput: String(ans),
              vals: { km: k - j, cw, cm, ans }, params: { kind, W, Mn, k, j },
            };
          }
        }
        const kinds = r.int(3, 6), k = r.int(4, 10), T = k + kinds - 1, ans = C(T, k);
        return {
          prompt: `A bakery sells ${n(kinds)} kinds of doughnut (plenty of each). How many different boxes of ${n(k)} doughnuts can you choose, if only the mix matters?`,
          steps: [
            `Repetition is allowed and order does not matter: stars and bars. Write the box as ${n(k)} stars (doughnuts) and ${n(kinds - 1)} bars separating the kinds.`,
            `That is ${n(k)} + ${n(kinds - 1)} = ${n(T)} symbols, and a box is fixed by choosing which ${n(k)} of them are stars.`,
            `C(${n(T)}, ${n(k)}) = ${n(ans)} boxes.`,
          ],
          answer: { kind: "number", value: ans }, answerText: `${n(ans)} boxes`, answerInput: String(ans),
          vals: { bars: kinds - 1, T, ans }, params: { kind, kinds, k },
        };
      },
    },

    // ---- S.9 Conditional probability & independence --------------------------------------------------
    "S.6": {
      title: "Conditional probability and independence",
      generate(r, level) {
        if (level === 1) {
          const rows = ["Coffee drinker", "Tea drinker"], rowsPl = ["coffee drinkers", "tea drinkers"], cols = ["Morning person", "Night owl"], colsPl = ["morning people", "night owls"];
          const c = [[r.int(8, 60), r.int(8, 60)], [r.int(8, 60), r.int(8, 60)]];
          const rt = c.map((x) => x[0] + x[1]), ct = [c[0][0] + c[1][0], c[0][1] + c[1][1]], N = rt[0] + rt[1];
          const ri = r.int(0, 1), cj = r.int(0, 1), cell = c[ri][cj], p = Q(cell, ct[cj]);
          return {
            prompt: `A survey of ${n(N)} people: ${M.table(["", ...cols, "Total"], [...rows.map((rw, i) => [rw, n(c[i][0]), n(c[i][1]), n(rt[i])]), ["Total", n(ct[0]), n(ct[1]), n(N)]])} One of them is chosen at random. Given that the person is a ${cols[cj].toLowerCase()}, what is the probability that they are a ${rows[ri].toLowerCase()}?${rnd(p)}`,
            steps: [
              `"Given" restricts attention to the ${colsPl[cj]}: the ${cols[cj]} column, ${n(ct[cj])} people.`,
              `Of those, ${n(cell)} are ${rowsPl[ri]}.`,
              `${pr(`${rows[ri].toLowerCase()} | ${cols[cj].toLowerCase()}`)} = ${fc(cell, ct[cj], p)}.`,
            ],
            ...pAns(p), vals: { rt, ct, N, p: fv(p) }, params: { c, ri, cj },
          };
        }
        if (level === 2) {
          const R = r.int(3, 8), B = r.int(2, 8), N = R + B, kind = r.int(0, 1), x = kind === 0 ? R - 1 : B;
          const p = Q(R, N).mul(Q(x, N - 1));
          return {
            prompt: `A bag holds ${n(R)} red and ${n(B)} blue marbles. Two are drawn without replacement. What is the probability that ${kind === 0 ? "both are red" : "the first is red and the second is blue"}?${rnd(p)}`,
            steps: [
              `${pr("first red")} = ${M.frac(n(R), n(N))}.`,
              `After a red marble is removed, ${n(N - 1)} remain, ${n(x)} of them ${kind === 0 ? "red" : "blue"}: ${pr(`second ${kind === 0 ? "red" : "blue"} | first red`)} = ${M.frac(n(x), n(N - 1))}.`,
              `Multiplication rule: ${M.frac(n(R), n(N))} × ${M.frac(n(x), n(N - 1))} = ${fc(R * x, N * (N - 1), p)}.`,
            ],
            ...pAns(p), vals: { N, N1: N - 1, x, top: R * x, bot: N * (N - 1), p: fv(p) }, params: { R, B, kind },
          };
        }
        for (;;) {
          const N = 200, rA = 20 * r.int(2, 7), cB = 10 * r.int(4, 14), e = (rA * cB) / N, indep = r.chance(0.5);
          const delta = indep ? 0 : r.pick([-1, 1]) * r.int(4, 12);
          const a = e + delta, b = rA - a, c = cB - a, d = N - rA - cB + a;
          if (Math.min(a, b, c, d) < 3) continue;
          const pB = Q(cB, N), pBA = Q(a, rA), idx = pB.eq(pBA) ? 0 : 1, options = ["Independent", "Not independent"];
          return {
            prompt: `An online store showed ${n(N)} visitors either a new or an old checkout page: ${M.table(["", "Bought", "Did not buy", "Total"], [["New page", n(a), n(b), n(rA)], ["Old page", n(c), n(d), n(N - rA)], ["Total", n(cB), n(N - cB), n(N)]])} Are the events “saw the new page” and “bought” independent?`,
            steps: [
              `Independence means ${pr("bought | new page")} = ${pr("bought")}: knowing the page would not change the chance of buying.`,
              `${pr("bought")} = ${M.frac(n(cB), n(N))} = ${dec(pB)}.`,
              `${pr("bought | new page")} = ${M.frac(n(a), n(rA))} ${eqs(pBA)} ${dec(pBA)}.`,
              idx === 0 ? `The two are equal, so the events are independent.` : `${dec(pBA)} ≠ ${dec(pB)}, so the events are not independent: buyers are ${pBA.cmp(pB) > 0 ? "more" : "less"} common among visitors who saw the new page.`,
            ],
            answer: { kind: "choice", options, index: idx }, answerText: options[idx],
            vals: { b, c, d, rB: N - rA, nB: N - cB, pB: fv(pB), pBA: fv(pBA) }, params: { N, a, rA, cB },
          };
        }
      },
    },

    // ---- S.10 Law of total probability -----------------------------------------------------------------
    "S.total-prob": {
      title: "The law of total probability",
      generate(r, level) {
        const tree = (labels) => graph({ view: [-0.5, 6.5, -2.2, 2.2], axes: false, grid: false, items: [
          { t: "seg", a: [0, 0], b: [2.5, 1.2] }, { t: "seg", a: [0, 0], b: [2.5, -1.2] },
          { t: "seg", a: [2.5, 1.2], b: [5, 1.8] }, { t: "seg", a: [2.5, 1.2], b: [5, 0.6] },
          { t: "seg", a: [2.5, -1.2], b: [5, -0.6] }, { t: "seg", a: [2.5, -1.2], b: [5, -1.8] },
          ...labels.map(([x, y, s]) => ({ t: "text", x, y, s }))] });
        if (level === 1) {
          for (;;) {
            const pA = Q(r.int(1, 9), 10), bA = Q(r.int(3, 9), 10), bN = Q(r.int(1, 6), 20);
            if (bN.cmp(bA) >= 0) continue;
            const t1 = bA.mul(pA), t2 = bN.mul(Q(1).sub(pA)), ans = t1.add(t2);
            return {
              prompt: `The probability of rain tomorrow is ${dec(pA)}. If it rains, the bus is late with probability ${dec(bA)}; if it does not rain, it is late with probability ${dec(bN)}. What is the probability that the bus is late tomorrow?`,
              graph: tree([[1, 1.1, `rain ${dec(pA)}`], [1, -1.1, `dry ${dec(Q(1).sub(pA))}`], [4, 2, `late ${dec(bA)}`], [4, -0.35, `late ${dec(bN)}`]]),
              steps: [
                `Split on the weather: ${pr("late")} = ${pr("late | rain")} ${pr("rain")} + ${pr("late | dry")} ${pr("dry")}.`,
                `${pr("dry")} = 1 − ${dec(pA)} = ${dec(Q(1).sub(pA))}.`,
                `${dec(bA)} × ${dec(pA)} + ${dec(bN)} × ${dec(Q(1).sub(pA))} = ${dec(t1)} + ${dec(t2)} = ${dec(ans)}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: dec(ans), answerInput: typed(ans.value),
              vals: { dry: fv(Q(1).sub(pA)), t1: fv(t1), t2: fv(t2), ans: fv(ans) }, params: { pA: fv(pA), bA: fv(bA), bN: fv(bN) },
            };
          }
        }
        if (level === 2) {
          const S = r.pick([[50, 30, 20], [60, 25, 15], [40, 35, 25], [45, 35, 20], [50, 40, 10]]), D = S.map(() => r.int(1, 6));
          const terms = S.map((s, i) => Q(s * D[i], 10000)), ans = fsum(terms);
          return {
            prompt: `Three machines make ${S.map((s) => `${n(s)}%`).join(", ")} of a factory's parts, and their defect rates are ${D.map((d) => `${n(d)}%`).join(", ")} respectively. What is the probability that a randomly chosen part is defective?`,
            steps: [
              `The machines partition the parts (each part comes from exactly one), so ${pr("defect")} = Σ ${pr(`defect | machine ${V("i")}`)} ${pr(`machine ${V("i")}`)}.`,
              `${S.map((s, i) => `${dec(Q(D[i], 100))} × ${dec(Q(s, 100))} = ${dec(terms[i], 6)}`).join("; ")}.`,
              `Add: ${terms.map((t) => dec(t, 6)).join(" + ")} = ${dec(ans, 6)}, i.e. ${n(ans.value * 100)}% of all parts.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: dec(ans, 6), answerInput: typed(ans.value),
            vals: { sD: S.map((v) => v / 100), dD: D.map((v) => v / 100), terms: terms.map(fv), ans: fv(ans), pct: ans.value * 100 }, params: { S, D },
          };
        }
        for (;;) {
          const a = Q(r.int(2, 8), 10), q1 = Q(5 * r.int(14, 19), 100), q0 = Q(5 * r.int(2, 10), 100);
          const pB = q1.mul(a).add(q0.mul(Q(1).sub(a))), diff = q1.sub(q0), top = pB.sub(q0);
          return {
            prompt: `Applicants who completed a training course pass a certification exam with probability ${dec(q1)}; those who did not pass with probability ${dec(q0)}. Overall, ${dec(pB)} of applicants pass. What fraction of applicants completed the training?`,
            steps: [
              `Let ${V("t")} = ${pr("trained")}. By total probability, ${pr("pass")} = ${dec(q1)}${V("t")} + ${dec(q0)}(1 − ${V("t")}).`,
              `${dec(pB)} = ${dec(q0)} + (${dec(q1)} − ${dec(q0)})${V("t")} = ${dec(q0)} + ${dec(diff)}${V("t")}.`,
              `${V("t")} = ${M.frac(`${dec(pB)} − ${dec(q0)}`, dec(diff))} = ${M.frac(dec(top), dec(diff))} = ${dec(a)}.`,
              `Check: ${dec(q1)} × ${dec(a)} + ${dec(q0)} × ${dec(Q(1).sub(a))} = ${dec(pB)}.`,
            ],
            answer: { kind: "number", value: a.value }, answerText: dec(a), answerInput: typed(a.value),
            vals: { diff: fv(diff), top: fv(top), a: fv(a), na: fv(Q(1).sub(a)) }, params: { q1: fv(q1), q0: fv(q0), pB: fv(pB) },
          };
        }
      },
    },

    // ---- S.11 Bayes' theorem ---------------------------------------------------------------------------------
    "S.7": {
      title: "Bayes' theorem",
      generate(r, level) {
        if (level === 1) {
          const pA = Q(5 * r.int(2, 10), 100), bA = Q(r.int(4, 9), 10), bN = Q(r.int(1, 10), 100);
          const pB = bA.mul(pA).add(bN.mul(Q(1).sub(pA))), num = bA.mul(pA), ans = num.div(pB);
          return {
            prompt: `A spam filter knows that ${pr("spam")} = ${dec(pA)} for incoming email, that the word “winner” appears in spam with probability ${pr("winner | spam")} = ${dec(bA)}, and that ${pr("winner")} = ${dec(pB)} over all email. An email contains “winner”. What is ${pr("spam | winner")}?${rnd(ans)}`,
            steps: [
              `Bayes' theorem: ${pr("spam | winner")} = ${M.frac(`${pr("winner | spam")} ${pr("spam")}`, pr("winner"))}.`,
              `Numerator: ${dec(bA)} × ${dec(pA)} = ${dec(num)}.`,
              `${M.frac(dec(num), dec(pB))} = ${fd(ans)}.`,
            ],
            ...pAns(ans), vals: { num: fv(num), ans: fv(ans) }, params: { pA: fv(pA), bA: fv(bA), pB: fv(pB) },
          };
        }
        if (level === 2) {
          const prev = r.pick([1, 2, 4, 5, 10]), sens = r.pick([80, 90, 95, 99]), fpr = r.pick([2, 5, 10]);
          const D = 100 * prev, H = 10000 - D, TP = prev * sens, FP = (100 - prev) * fpr, ans = Q(TP, TP + FP), g = P.grouped;
          return {
            prompt: `A disease affects ${n(prev)}% of a population. A screening test detects it in ${n(sens)}% of people who have it, and gives a false positive for ${n(fpr)}% of people who do not. A randomly chosen person tests positive. What is the probability that they have the disease? Round to three decimal places.`,
            steps: [
              `Picture 10,000 people: ${n(prev)}% of them, ${g(D)}, have the disease and ${g(H)} do not.`,
              `True positives: ${n(sens)}% of ${g(D)} = ${g(TP)}. False positives: ${n(fpr)}% of ${g(H)} = ${g(FP)}.`,
              `Of the ${g(TP + FP)} people who test positive, ${g(TP)} are sick: ${pr("disease | positive")} = ${M.frac(g(TP), g(TP + FP))} ${eqs(ans, 3)} ${dec(ans, 3)}. (This is Bayes' theorem with counts in place of probabilities.)`,
              ans.value < 0.5
                ? `Most positives are false alarms: the disease is rare, so the many healthy people produce more false positives than the few sick people produce true ones.`
                : `More than half of the positives are real, because the false-positive rate is small next to the disease's prevalence.`,
            ],
            answer: { kind: "number", value: ans.value, dp: 3 }, answerText: dec(ans, 3), answerInput: typed(ans),
            vals: { D, H, TP, FP, pos: TP + FP, ans: fv(ans) }, params: { prev, sens, fpr }, consts: [10000],
          };
        }
        const S = r.pick([[50, 30, 20], [60, 25, 15], [40, 35, 25], [45, 35, 20]]), names = ["Supplier A", "Supplier B", "Supplier C"];
        const D = S.map(() => r.int(1, 6)), j = r.int(0, 2);
        const joint = S.map((s, i) => Q(s * D[i], 10000)), tot = fsum(joint), ans = joint[j].div(tot);
        return {
          prompt: `A shop buys ${S.map((s, i) => `${n(s)}% of its parts from ${names[i]}`).join(", ")}. Their defect rates are ${D.map((d) => `${n(d)}%`).join(", ")} respectively. A part is found to be defective. What is the probability that it came from ${names[j]}? Round to three decimal places.`,
          steps: [
            `Joint probability of each supplier and a defect: ${S.map((s, i) => `${dec(Q(s, 100))} × ${dec(Q(D[i], 100))} = ${dec(joint[i], 6)}`).join("; ")}.`,
            `${pr("defective")} = ${joint.map((t) => dec(t, 6)).join(" + ")} = ${dec(tot, 6)}.`,
            `Bayes' theorem: ${pr(`${names[j]} | defective`)} = ${M.frac(dec(joint[j], 6), dec(tot, 6))} ${eqs(ans, 3)} ${dec(ans, 3)}.`,
            `${names[j]} makes ${n(S[j])}% of the parts but about ${n(Math.round(ans.value * 100))}% of the defective ones.`,
          ],
          answer: { kind: "number", value: ans.value, dp: 3 }, answerText: dec(ans, 3), answerInput: typed(ans),
          vals: { sD: S.map((v) => v / 100), dD: D.map((v) => v / 100), joint: joint.map(fv), tot: fv(tot), ans: fv(ans), pct: Math.round(ans.value * 100) }, params: { S, D, j },
        };
      },
    },

    // ---- S.12 Random variables, PMFs, PDFs & CDFs ------------------------------------------------------
    "S.rv": {
      title: "PMFs and CDFs",
      generate(r, level) {
        const X = V("X"), x = V("x");
        if (level === 1) {
          const K = r.pick([3, 4]), xs = Array.from({ length: K + 1 }, (_, i) => i), ps = comp(r, K + 1), m = r.int(0, K);
          const known = sum(ps) - ps[m], others = ps.filter((_, i) => i !== m).map((p) => Q(p, 100)), miss = Q(ps[m], 100);
          return {
            prompt: `${X} is the number of cars owned by a randomly chosen household. Its probability distribution is ${M.table([x, ...xs.map(n)], [[`${V("p")}(${x})`, ...ps.map((p, i) => (i === m ? "?" : dec(Q(p, 100))))]])} The bar chart shows the known probabilities. Find ${pr(`${X} = ${n(m)}`)}.`,
            graph: bars(xs, ps.map((p, i) => (i === m ? 0 : p / 100))),
            steps: [
              `The probabilities of a PMF add to 1 over all values: Σ ${V("p")}(${x}) = 1.`,
              `The known probabilities add to ${others.map((q) => dec(q)).join(" + ")} = ${dec(Q(known, 100))}.`,
              `${pr(`${X} = ${n(m)}`)} = 1 − ${dec(Q(known, 100))} = ${dec(miss)}.`,
            ],
            answer: { kind: "number", value: miss.value }, answerText: dec(miss), answerInput: typed(miss.value),
            vals: { known: known / 100, miss: fv(miss) }, params: { xs, ps: ps.map((p, i) => (i === m ? 0 : p / 100)), m },
          };
        }
        if (level === 2) {
          const xs = [0, 1, 2, 3, 4], ps = comp(r, 5), F = [];
          ps.forEach((p, i) => F.push((i ? F[i - 1] : 0) + p));
          const Fq = F.map((f) => Q(f, 100)), kind = r.int(0, 2);
          const items = [{ t: "seg", a: [-1, 0], b: [0, 0] }];
          xs.forEach((v, i) => { items.push({ t: "seg", a: [v, F[i] / 100], b: [v + 1, F[i] / 100] }, { t: "pt", x: v, y: F[i] / 100 }); });
          const g = graph({ view: [-1, 5.5, -0.1, 1.15], items });
          let q, steps, params;
          if (kind === 0) {
            const k = r.int(1, 4);
            q = Q(F[k] - F[k - 1], 100);
            params = { kind, k };
            steps = [`The CDF jumps at each value by that value's probability: ${pr(`${X} = ${n(k)}`)} = ${V("F")}(${n(k)}) − ${V("F")}(${n(k - 1)}).`,
              `${dec(Fq[k])} − ${dec(Fq[k - 1])} = ${dec(q)}.`];
          } else if (kind === 1) {
            const a = r.int(0, 2), b = r.int(a + 1, 3);
            q = Q(F[b] - F[a], 100);
            params = { kind, a, b };
            steps = [`${pr(`${n(a)} &lt; ${X} ≤ ${n(b)}`)} = ${V("F")}(${n(b)}) − ${V("F")}(${n(a)}): everything up to ${n(b)}, minus everything up to ${n(a)}.`,
              `${dec(Fq[b])} − ${dec(Fq[a])} = ${dec(q)}.`];
          } else {
            const k = r.int(0, 3);
            q = Q(100 - F[k], 100);
            params = { kind, k };
            steps = [`${pr(`${X} &gt; ${n(k)}`)} is the complement of ${pr(`${X} ≤ ${n(k)}`)} = ${V("F")}(${n(k)}).`,
              `1 − ${dec(Fq[k])} = ${dec(q)}.`];
          }
          const ask = kind === 0 ? `${pr(`${X} = ${n(params.k)}`)}` : kind === 1 ? pr(`${n(params.a)} &lt; ${X} ≤ ${n(params.b)}`) : pr(`${X} &gt; ${n(params.k)}`);
          return {
            prompt: `${X} is the number of customer complaints a store receives in a day. Its cumulative distribution ${V("F")}(${x}) = ${pr(`${X} ≤ ${x}`)} is ${M.table([x, ...xs.map(n)], [[`${V("F")}(${x})`, ...Fq.map((f) => dec(f))]])} The graph shows the same steps. Find ${ask}.`,
            graph: g, steps, answer: { kind: "number", value: q.value }, answerText: dec(q), answerInput: typed(q.value),
            vals: { q: fv(q), xs }, params: Object.assign(params, { F: Fq.map((f) => f.value) }),
          };
        }
        const L = r.pick([2, 4, 5, 10]), L2 = L * L, kind = r.int(0, 1);
        const items = [{ t: "seg", a: [-L / 4, 0], b: [0, 0] }, { t: "seg", a: [L, 1], b: [L * 1.25, 1] }];
        for (let i = 0; i < 40; i++) items.push({ t: "seg", a: [(L * i) / 40, (i / 40) ** 2], b: [(L * (i + 1)) / 40, ((i + 1) / 40) ** 2] });
        const g = graph({ view: [-L / 4, L * 1.25, -0.1, 1.15], items });
        const Fx = `${V("F")}(${x}) = ${M.frac(M.sup(x, 2), n(L2))} for 0 ≤ ${x} ≤ ${n(L)}`;
        const intro = `The time ${X}, in hours, that a technician needs for a repair has cumulative distribution ${Fx} (and ${V("F")} = 0 below 0, 1 above ${n(L)}), graphed below.`;
        if (kind === 0) {
          const a = r.int(0, L - 1), b = r.int(a + 1, L), ans = Q(b * b - a * a, L2);
          return {
            prompt: `${intro} Find ${pr(`${n(a)} ≤ ${X} ≤ ${n(b)}`)}.${rnd(ans)}`, graph: g,
            steps: [
              `For a continuous variable, an interval's probability is a difference of CDF values: ${pr(`${n(a)} ≤ ${X} ≤ ${n(b)}`)} = ${V("F")}(${n(b)}) − ${V("F")}(${n(a)}).`,
              `${V("F")}(${n(b)}) = ${M.frac(M.sup(n(b), 2), n(L2))} = ${fc(b * b, L2, Q(b * b, L2))} and ${V("F")}(${n(a)}) = ${M.frac(M.sup(n(a), 2), n(L2))} = ${fc(a * a, L2, Q(a * a, L2))}.`,
              `Difference: ${fc(b * b - a * a, L2, ans)}.`,
            ],
            ...pAns(ans), vals: { L2, bb: b * b, aa: a * a, Fb: fv(Q(b * b, L2)), Fa: fv(Q(a * a, L2)), top: b * b - a * a, ans: fv(ans) }, params: { kind, L, a, b },
          };
        }
        const s = Q(r.int(2, 9), 10), p = s.mul(s), xq = s.mul(L), x2 = p.mul(L2);
        return {
          prompt: `${intro} Find the value ${x} with ${pr(`${X} ≤ ${x}`)} = ${dec(p)} (the ${dec(p)} quantile), in hours.`, graph: g,
          steps: [
            `Set ${V("F")}(${x}) = ${dec(p)}: ${M.frac(M.sup(x, 2), n(L2))} = ${dec(p)}.`,
            `${M.sup(x, 2)} = ${dec(p)} × ${n(L2)} = ${dec(x2)}.`,
            `${x} = ${M.sqrt(dec(x2))} = ${dec(xq)} hours (the positive root, since 0 ≤ ${x} ≤ ${n(L)}). So ${n(p.value * 100)}% of repairs take at most ${dec(xq)} hours.`,
          ],
          answer: { kind: "number", value: xq.value }, answerText: `${dec(xq)} hours`, answerInput: typed(xq.value),
          vals: { L2, p: fv(p), x2: fv(x2), xq: fv(xq), pct: p.value * 100 }, params: { kind, L, s: s.value },
        };
      },
    },

    // ---- S.13 Expected value & variance of a random variable -------------------------------------------
    "S.9": {
      title: "Expected value and variance",
      generate(r, level) {
        const X = V("X"), E = (s) => `E[${s}]`;
        if (level === 1) {
          for (;;) {
            const c = r.int(1, 5), w1 = r.int(1, 5), w2 = r.int(8, 30), p1 = r.int(4, 7), p2 = r.int(1, 4), p3 = 10 - p1 - p2;
            if (p3 < 1 || w1 === c) continue;
            const xs = [-c, w1, w2], ps = [Q(p1, 10), Q(p2, 10), Q(p3, 10)], terms = xs.map((v, i) => ps[i].mul(v)), ev = fsum(terms);
            const verdict = ev.n === 0 ? "On average a player breaks even." : ev.n < 0 ? `On average a player loses ${P.money(-ev.value)} per game, which is how the game makes money.` : `On average a player wins ${P.money(ev.value)} per game.`;
            return {
              prompt: `In a carnival game your net winnings ${X}, in dollars, have this distribution: ${M.table([V("x"), ...xs.map(n)], [[pr(`${X} = ${V("x")}`), ...ps.map((q) => dec(q))]])} Find the expected value ${E(X)}.`,
              steps: [
                `${E(X)} = Σ ${V("x")} ${V("p")}(${V("x")}): multiply each value by its probability and add.`,
                `${xs.map((v, i) => `${np(v)} × ${dec(ps[i])} = ${dec(terms[i])}`).join("; ")}.`,
                `${E(X)} = ${plusQ(terms)} = ${dec(ev)}. ${verdict}`,
              ],
              answer: { kind: "number", value: ev.value }, answerText: `${E(X)} = ${dec(ev)} dollars`, answerInput: typed(ev.value),
              vals: { terms: terms.map(fv), ev: fv(ev), lose: Math.abs(ev.value) }, params: { xs, ps: ps.map((q) => q.value) },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const xs = [0, 1, 2, 3], pt = Array.from({ length: 3 }, () => r.int(1, 4)), last = 10 - sum(pt);
            if (last < 1) continue;
            const ps = [...pt, last].map((t) => Q(t, 10));
            const t1 = xs.map((v, i) => ps[i].mul(v)), t2 = xs.map((v, i) => ps[i].mul(v * v)), m = fsum(t1), m2 = fsum(t2), msq = m.mul(m), vr = m2.sub(msq);
            return {
              prompt: `${X} is the number of goals a striker scores in a match: ${M.table([V("x"), ...xs.map(n)], [[pr(`${X} = ${V("x")}`), ...ps.map((q) => dec(q))]])} Find Var(${X}).`,
              steps: [
                `${E(X)} = Σ ${V("x")} ${V("p")}(${V("x")}) = ${xs.map((v, i) => `${n(v)} × ${dec(ps[i])}`).join(" + ")} = ${dec(m)}.`,
                `${E(M.sup(X, 2))} = Σ ${M.sup(V("x"), 2)} ${V("p")}(${V("x")}) = ${xs.map((v, i) => `${n(v * v)} × ${dec(ps[i])}`).join(" + ")} = ${dec(m2)}.`,
                `Var(${X}) = ${E(M.sup(X, 2))} − ${M.sup(`(${E(X)})`, 2)} = ${dec(m2)} − ${M.sup(dec(m), 2)} = ${dec(m2)} − ${dec(msq)} = ${dec(vr)}.`,
              ],
              answer: { kind: "number", value: vr.value }, answerText: `Var(${X}) = ${dec(vr)}`, answerInput: typed(vr.value),
              vals: { m: fv(m), m2: fv(m2), msq: fv(msq), vr: fv(vr), sq: [0, 1, 4, 9] }, params: { ps: ps.map((q) => q.value) }, consts: [3, 4, 9],
            };
          }
        }
        if (r.chance(0.5)) {
          const mu = r.int(20, 60), sd = r.int(3, 10), a = r.int(2, 8), b = 10 * r.int(5, 20), am = a * mu, ey = am - b, sy = a * sd;
          return {
            prompt: `A food truck sells ${X} burritos a day, with ${E(X)} = ${n(mu)} and SD(${X}) = ${n(sd)}. Each burrito earns $${n(a)} and running the truck costs $${n(b)} a day, so the daily profit is ${V("Y")} = ${n(a)}${X} − ${n(b)} dollars. Find ${E(V("Y"))} and SD(${V("Y")}), separated by a comma.`,
            steps: [
              `Expectation is linear: ${E(`${V("a")}${X} + ${V("b")}`)} = ${V("a")}${E(X)} + ${V("b")}. So ${E(V("Y"))} = ${n(a)} × ${n(mu)} − ${n(b)} = ${n(am)} − ${n(b)} = ${n(ey)} dollars.`,
              `Var(${V("a")}${X} + ${V("b")}) = ${M.sup(V("a"), 2)} Var(${X}): adding a constant shifts the distribution without spreading it. Taking square roots, SD(${V("Y")}) = |${V("a")}| SD(${X}) = ${n(a)} × ${n(sd)} = ${n(sy)} dollars.`,
            ],
            answer: { kind: "numbers", values: [ey, sy], ordered: true }, answerText: `${E(V("Y"))} = ${P.money(ey)}, SD(${V("Y")}) = ${P.money(sy)}`, answerInput: `${ey}, ${sy}`,
            vals: { am, ey, sy }, params: { kind: 0, mu, sd, a, b },
          };
        }
        const [s1, s2, s3] = r.pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10], [9, 12, 15], [7, 24, 25]]), m1 = r.int(20, 40), m2 = r.int(10, 30);
        return {
          prompt: `A delivery has two independent legs. The first takes ${X} minutes, with mean ${n(m1)} and SD ${n(s1)}; the second takes ${V("Y")} minutes, with mean ${n(m2)} and SD ${n(s2)}. What is the standard deviation of the total time ${X} + ${V("Y")}, in minutes?`,
          steps: [
            `For independent variables the variances add (the standard deviations do not): Var(${X} + ${V("Y")}) = Var(${X}) + Var(${V("Y")}).`,
            `${M.sup(n(s1), 2)} + ${M.sup(n(s2), 2)} = ${n(s1 * s1)} + ${n(s2 * s2)} = ${n(s3 * s3)}.`,
            `SD = ${M.sqrt(n(s3 * s3))} = ${n(s3)} minutes, less than ${n(s1)} + ${n(s2)} = ${n(s1 + s2)}, because the legs' delays partly offset each other. (The mean total, ${n(m1)} + ${n(m2)} = ${n(m1 + m2)} minutes, does not affect the spread.)`,
          ],
          answer: { kind: "number", value: s3 }, answerText: `${n(s3)} minutes`, answerInput: String(s3),
          vals: { v1: s1 * s1, v2: s2 * s2, vt: s3 * s3, sdt: s3, naive: s1 + s2, mt: m1 + m2 }, params: { kind: 1, s1, s2, m1, m2 },
        };
      },
    },

    // ---- S.14 Joint, marginal & conditional distributions -----------------------------------------------
    "S.joint": {
      title: "Joint, marginal and conditional distributions",
      generate(r, level) {
        const X = V("X"), Y = V("Y");
        if (level === 3 && r.chance(0.5)) {
          const ps = comp(r, 3, 10, 10, 60), mus = [5 * r.int(4, 12), 5 * r.int(10, 20), 5 * r.int(20, 40)], names = ["new", "returning", "VIP"];
          const pq = ps.map((p) => Q(p, 100)), terms = pq.map((q, i) => q.mul(mus[i])), ev = fsum(terms);
          return {
            prompt: `A shop's customers are ${names.map((nm, i) => `${n(ps[i])}% ${nm}`).join(", ")}. The average spend is $${n(mus[0])} for new customers, $${n(mus[1])} for returning ones and $${n(mus[2])} for VIPs. What is the average spend over all customers, in dollars?`,
            steps: [
              `Law of total expectation: E[${Y}] = Σ E[${Y} | group] ${pr("group")}, the group means weighted by the group shares.`,
              `${mus.map((m, i) => `${n(m)} × ${dec(pq[i])} = ${dec(terms[i])}`).join("; ")}.`,
              `E[${Y}] = ${terms.map((t) => dec(t)).join(" + ")} = ${dec(ev)} dollars.`,
            ],
            answer: { kind: "number", value: ev.value }, answerText: P.money(ev.value), answerInput: typed(ev.value),
            vals: { pq: pq.map((q) => q.value), terms: terms.map((t) => t.value), ev: ev.value }, params: { kind: 1, ps, mus },
          };
        }
        let cells;
        for (;;) { cells = Array.from({ length: 5 }, () => r.int(4, 30)); const last = 100 - sum(cells); if (last >= 4 && last <= 30) { cells.push(last); break; } }
        const c = [cells.slice(0, 3), cells.slice(3)], cq = c.map((row) => row.map((v) => Q(v, 100)));
        const table = M.table(["", `${Y} = 1`, `${Y} = 2`, `${Y} = 3`], [0, 1].map((i) => [`${X} = ${n(i)}`, ...cq[i].map((q) => dec(q))]));
        const intro = `For a random shopper, ${X} = 1 if they are a loyalty member (0 if not) and ${Y} is the number of items they buy. The joint distribution ${V("p")}(${V("x")}, ${V("y")}) = ${pr(`${X} = ${V("x")}, ${Y} = ${V("y")}`)} is ${table}`;
        const rows = c.map((row) => sum(row)), cols = [0, 1, 2].map((j) => c[0][j] + c[1][j]);
        if (level === 1) {
          if (r.chance(0.5)) {
            const i = r.int(0, 1), ans = Q(rows[i], 100);
            return {
              prompt: `${intro} Find the marginal probability ${pr(`${X} = ${n(i)}`)}.`,
              steps: [
                `A marginal sums the joint table over the other variable: ${pr(`${X} = ${n(i)}`)} = Σ<sub>${V("y")}</sub> ${V("p")}(${n(i)}, ${V("y")}), the total of row ${X} = ${n(i)}.`,
                `${cq[i].map((q) => dec(q)).join(" + ")} = ${dec(ans)}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: dec(ans), answerInput: typed(ans.value),
              vals: { ans: fv(ans), cells: cells.map((v) => v / 100) }, params: { kind: 0, c, i }, consts: [3],
            };
          }
          const j = r.int(0, 2), ans = Q(cols[j], 100);
          return {
            prompt: `${intro} Find the marginal probability ${pr(`${Y} = ${n(j + 1)}`)}.`,
            steps: [
              `A marginal sums the joint table over the other variable: ${pr(`${Y} = ${n(j + 1)}`)} = ${V("p")}(0, ${n(j + 1)}) + ${V("p")}(1, ${n(j + 1)}), the total of that column.`,
              `${dec(cq[0][j])} + ${dec(cq[1][j])} = ${dec(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: dec(ans), answerInput: typed(ans.value),
            vals: { y: j + 1, ans: fv(ans), cells: cells.map((v) => v / 100) }, params: { kind: 1, c, j }, consts: [3],
          };
        }
        const i = r.int(0, 1), px = Q(rows[i], 100);
        if (level === 2) {
          const j = r.int(0, 2), ans = Q(c[i][j], rows[i]);
          return {
            prompt: `${intro} Find the conditional probability ${pr(`${Y} = ${n(j + 1)} | ${X} = ${n(i)}`)}.${rnd(ans)}`,
            steps: [
              `First the marginal: ${pr(`${X} = ${n(i)}`)} = ${cq[i].map((q) => dec(q)).join(" + ")} = ${dec(px)}.`,
              `Conditional = joint ÷ marginal: ${pr(`${Y} = ${n(j + 1)} | ${X} = ${n(i)}`)} = ${M.frac(`${V("p")}(${n(i)}, ${n(j + 1)})`, `${pr(`${X} = ${n(i)}`)}`)} = ${M.frac(dec(cq[i][j]), dec(px))} = ${fd(ans)}.`,
            ],
            ...pAns(ans), vals: { y: j + 1, px: fv(px), ans: fv(ans), cells: cells.map((v) => v / 100) }, params: { c, i, j }, consts: [3],
          };
        }
        const tq = cq[i].map((q, j) => q.mul(j + 1)), num = fsum(tq), ans = num.div(px);
        return {
          prompt: `${intro} Find the conditional expectation E[${Y} | ${X} = ${n(i)}], the mean number of items bought by ${i === 1 ? "members" : "non-members"}.${rnd(ans)}`,
          steps: [
            `Marginal: ${pr(`${X} = ${n(i)}`)} = ${cq[i].map((q) => dec(q)).join(" + ")} = ${dec(px)}.`,
            `E[${Y} | ${X} = ${n(i)}] = ${M.frac(`Σ ${V("y")} ${V("p")}(${n(i)}, ${V("y")})`, `${pr(`${X} = ${n(i)}`)}`)}. Numerator: ${cq[i].map((q, j) => `${n(j + 1)} × ${dec(q)}`).join(" + ")} = ${dec(num)}.`,
            `E[${Y} | ${X} = ${n(i)}] = ${M.frac(dec(num), dec(px))} = ${fd(ans)} items.`,
          ],
          ...pAns(ans), vals: { px: fv(px), num: fv(num), ans: fv(ans), cells: cells.map((v) => v / 100) }, params: { kind: 0, c, i }, consts: [3],
        };
      },
    },

    // ---- S.15 Bernoulli, geometric & negative binomial ------------------------------------------------------
    "S.bernoulli": {
      title: "Geometric and negative binomial waiting times",
      generate(r, level) {
        const PS = [Q(1, 2), Q(1, 3), Q(1, 4), Q(1, 5), Q(1, 6), Q(1, 10), Q(2, 5), Q(3, 10)];
        const p = r.pick(PS), q = Q(1).sub(p), P_ = V("p");
        if (level === 1) {
          const k = r.int(2, 5), qk = q.pow(k - 1), ans = qk.mul(p);
          return {
            prompt: `A basketball player makes each free throw with probability ${M.f(p)}, independently. What is the probability that her first make comes on throw number ${n(k)}?${rnd(ans)}`,
            steps: [
              `The first make on throw ${n(k)} means ${n(k - 1)} miss${k - 1 === 1 ? "" : "es"} and then a make: the geometric probability ${pr(`${V("X")} = ${V("k")}`)} = ${M.sup(`(1 − ${P_})`, `${V("k")} − 1`)}${P_}.`,
              `The miss probability is 1 − ${M.f(p)} = ${M.f(q)}.`,
              `${pw(q, k - 1)} × ${M.f(p)} = ${k > 2 ? `${M.f(qk)} × ${M.f(p)} = ` : ""}${fd(ans)}.`,
            ],
            ...pAns(ans), vals: { k1: k - 1, q: fv(q), qk: fv(qk), ans: fv(ans) }, params: { p: fv(p), k },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const k = r.int(2, 5), ans = q.pow(k);
            return {
              prompt: `Each call a fundraiser makes succeeds with probability ${M.f(p)}, independently. What is the probability that more than ${n(k)} calls are needed for the first success?${rnd(ans)}`,
              steps: [
                `Needing more than ${n(k)} calls means the first ${n(k)} calls all fail: ${pr(`${V("X")} &gt; ${V("k")}`)} = ${M.sup(`(1 − ${P_})`, V("k"))}.`,
                `1 − ${M.f(p)} = ${M.f(q)}, and ${pw(q, k)} = ${fd(ans)}.`,
              ],
              ...pAns(ans), vals: { q: fv(q), ans: fv(ans) }, params: { kind: 0, p: fv(p), k },
            };
          }
          const mean = Q(1).div(p), vr = q.div(p.mul(p));
          return {
            prompt: `A quality engineer tests chips one at a time until finding a defective one. Each chip is defective with probability ${M.f(p)}, independently. Find the mean and the variance of the number of chips tested, separated by a comma.`,
            steps: [
              `The count of trials up to the first success is geometric with ${P_} = ${M.f(p)}.`,
              `Mean: ${M.frac("1", P_)} = 1 ÷ ${M.f(p)} = ${M.f(mean)} chips.`,
              `Variance: ${M.frac(`1 − ${P_}`, M.sup(P_, 2))} = ${M.f(q)} ÷ ${M.f(p.mul(p))} = ${fd(vr)}.`,
            ],
            answer: { kind: "numbers", values: [mean.value, vr.value], ordered: true }, answerText: `mean ${M.f(mean)}, variance ${M.f(vr)}`, answerInput: `${typed(mean)}, ${typed(vr)}`,
            vals: { q: fv(q), p2: fv(p.mul(p)), mean: fv(mean), vr: fv(vr) }, params: { kind: 1, p: fv(p) },
          };
        }
        const rr = r.pick([2, 3]), k = r.int(rr + 1, rr + 4), ways = C(k - 1, rr - 1), pr_ = p.pow(rr), qr = q.pow(k - rr), seq = pr_.mul(qr), ans = seq.mul(ways);
        return {
          prompt: `A salesperson closes each call with probability ${M.f(p)}, independently. What is the probability that the ${ord(rr)} sale happens on call ${n(k)}?${rnd(ans)}`,
          steps: [
            `The ${ord(rr)} success on trial ${n(k)} means exactly ${n(rr - 1)} success${rr - 1 === 1 ? "" : "es"} in the first ${n(k - 1)} trials, then a success on trial ${n(k)} (negative binomial).`,
            `Places for the earlier success${rr - 1 === 1 ? "" : "es"}: C(${n(k - 1)}, ${n(rr - 1)}) = ${n(ways)}.`,
            `Each such sequence has ${n(rr)} successes and ${n(k - rr)} failure${k - rr === 1 ? "" : "s"}: ${pw(p, rr)} × ${pw(q, k - rr)} = ${M.f(pr_)} × ${M.f(qr)} = ${M.f(seq)}.`,
            `${pr(`${V("X")} = ${n(k)}`)} = ${n(ways)} × ${M.f(seq)} = ${fd(ans)}.`,
          ],
          ...pAns(ans), vals: { r1: rr - 1, k1: k - 1, kr: k - rr, ways, q: fv(q), pr: fv(pr_), qr: fv(qr), seq: fv(seq), ans: fv(ans) }, params: { p: fv(p), r: rr, k },
        };
      },
    },

    // ---- S.16 Binomial distribution ---------------------------------------------------------------------------
    "S.10": {
      title: "Binomial probabilities",
      generate(r, level) {
        const X = V("X");
        if (level === 1) {
          const N = r.int(3, 8), k = r.int(1, N - 1), tot = 2 ** N, c = C(N, k), ans = Q(c, tot);
          return {
            prompt: `A fair coin is flipped ${n(N)} times. What is the probability of exactly ${unit(k, "head", "heads")}?${rnd(ans)}`,
            steps: [
              `All ${M.sup("2", n(N))} = ${n(tot)} sequences of heads and tails are equally likely.`,
              `Sequences with exactly ${unit(k, "head", "heads")}: choose which flips are heads, C(${n(N)}, ${n(k)}) = ${n(c)}.`,
              `${pr(`${X} = ${n(k)}`)} = ${fc(c, tot, ans)}.`,
            ],
            ...pAns(ans), vals: { tot, c, ans: fv(ans) }, params: { N, k },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const d = r.pick([3, 4, 5, 6, 10]), p = Q(1, d), q = Q(d - 1, d), N = r.int(3, 5), k = r.int(1, N - 1);
            const c = C(N, k), pk = p.pow(k), qk = q.pow(N - k), ans = pk.mul(qk).mul(c);
            return {
              prompt: `A quiz has ${n(N)} multiple-choice questions, each with ${n(d)} options. A student guesses every answer at random. What is the probability of exactly ${n(k)} correct?${rnd(ans)}`,
              steps: [
                `${X} ~ Binomial(${V("n")} = ${n(N)}, ${V("p")} = ${M.f(p)}): fixed number of independent trials, same success chance. ${pr(`${X} = ${V("k")}`)} = C(${V("n")}, ${V("k")}) ${M.sup(V("p"), V("k"))} ${M.sup(`(1 − ${V("p")})`, `${V("n")} − ${V("k")}`)}.`,
                `C(${n(N)}, ${n(k)}) = ${n(c)}; ${pw(p, k)} = ${M.f(pk)}; ${pw(q, N - k)} = ${M.f(qk)}.`,
                `${pr(`${X} = ${n(k)}`)} = ${n(c)} × ${M.f(pk)} × ${M.f(qk)} = ${fd(ans)}.`,
              ],
              ...pAns(ans), vals: { c, nk: N - k, q: fv(q), pk: fv(pk), qk: fv(qk), ans: fv(ans) }, params: { kind: 0, d, N, k },
            };
          }
          const p = Q(r.pick([5, 10, 15, 20]), 100), q = Q(1).sub(p), N = r.int(2, 4), none = q.pow(N), ans = Q(1).sub(none);
          return {
            prompt: `Each item from a production line is defective with probability ${dec(p)}, independently. In a sample of ${n(N)} items, what is the probability that at least one is defective?`,
            steps: [
              `"At least one" is the complement of "none": ${pr(`${X} ≥ 1`)} = 1 − ${pr(`${X} = 0`)}.`,
              `${pr(`${X} = 0`)} = ${M.sup(`(1 − ${dec(p)})`, n(N))} = ${M.sup(dec(q), n(N))} = ${dec(none, 8)}.`,
              `1 − ${dec(none, 8)} = ${dec(ans, 8)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: dec(ans, 8), answerInput: typed(ans.value),
            vals: { q: fv(q), none: fv(none), ans: fv(ans) }, params: { kind: 1, p: p.value, N },
          };
        }
        if (r.chance(0.5)) {
          const p = Q(r.pick([1, 2, 3]), 10), q = Q(1).sub(p), N = r.int(4, 6);
          const p0 = q.pow(N), q1 = q.pow(N - 1), p1 = q1.mul(p).mul(N), ans = Q(1).sub(p0).sub(p1);
          return {
            prompt: `A printer jams on each job with probability ${dec(p)}, independently. Out of ${n(N)} jobs, what is the probability of at least 2 jams? Round to four decimal places.`,
            steps: [
              `${pr(`${X} ≥ 2`)} = 1 − ${pr(`${X} = 0`)} − ${pr(`${X} = 1`)}, with ${X} ~ Binomial(${n(N)}, ${dec(p)}).`,
              `${pr(`${X} = 0`)} = ${M.sup(dec(q), n(N))} = ${dec(p0, 8)}.`,
              `${pr(`${X} = 1`)} = C(${n(N)}, 1) × ${dec(p)} × ${M.sup(dec(q), n(N - 1))} = ${n(N)} × ${dec(p)} × ${dec(q1, 8)} = ${dec(p1, 8)}.`,
              `1 − ${dec(p0, 8)} − ${dec(p1, 8)} = ${dec(ans, 8)} ≈ ${dec(ans, 4)}.`,
            ],
            answer: { kind: "number", value: ans.value, dp: 4 }, answerText: dec(ans, 4), answerInput: dec(ans, 4),
            vals: { q: fv(q), n1: N - 1, p0: fv(p0), q1: fv(q1), p1: fv(p1), ans: fv(ans) }, params: { kind: 0, p: p.value, N },
          };
        }
        const [N, p, mu, sd] = r.pick([[36, Q(1, 2), 18, 3], [100, Q(1, 2), 50, 5], [100, Q(1, 10), 10, 3], [900, Q(1, 10), 90, 9]]);
        const z = r.pick([0.5, 1.5, 2.5]), c = mu + z * sd + 0.5, c5 = c - 0.5, ph = phi(z), ans = 1 - ph, vr = sd * sd;
        const ctx = p.d === 2 ? `A fair coin is tossed ${n(N)} times.` : `Each of ${n(N)} customers independently redeems a coupon with probability ${dec(p)}.`;
        const what = p.d === 2 ? "heads" : "redemptions";
        return {
          prompt: `${ctx} Use the normal approximation with a continuity correction to estimate the probability of at least ${n(c)} ${what}. Use a four-place z-table.`,
          graph: normalGraph(mu, sd, c5, null),
          steps: [
            `${V("μ")} = ${V("n")}${V("p")} = ${n(N)} × ${dec(p)} = ${n(mu)}; ${V("σ")} = ${M.sqrt(`${V("n")}${V("p")}(1 − ${V("p")})`)} = ${M.sqrt(n(vr))} = ${n(sd)}. Both ${V("n")}${V("p")} and ${V("n")}(1 − ${V("p")}) are at least 10, so the approximation is reasonable.`,
            `Continuity correction: the whole numbers ${n(c)} and up cover the interval from ${n(c5)} upward, so find ${pr(`${V("Y")} ≥ ${n(c5)}`)} for the normal ${V("Y")}.`,
            `${V("z")} = ${M.frac(`${n(c5)} − ${n(mu)}`, n(sd))} = ${n(z)}.`,
            `${pr(`${V("Z")} ≥ ${n(z)}`)} = 1 − ${Phi(z)} = 1 − ${n(ph)} = ${nd(ans, 4)}.`,
          ],
          answer: { kind: "number", value: ans, dp: 4 }, answerText: `≈ ${nd(ans, 4)}`, answerInput: fmt(ans, 4),
          vals: { mu, vr, sd, c5, z, ph, ans }, params: { kind: 1, N, p: p.value, c }, consts: [10],
        };
      },
    },

    // ---- S.17 Hypergeometric & discrete uniform ------------------------------------------------------------------
    "S.hypergeom": {
      title: "Hypergeometric and discrete uniform",
      generate(r, level) {
        if (level === 1) {
          const a = r.int(1, 10), m = r.int(4, 12), b = a + m - 1, mu = Q(a + b, 2), vr = Q(m * m - 1, 12);
          return {
            prompt: `A whole number is drawn uniformly at random from ${n(a)} to ${n(b)} (inclusive). Find its mean and variance, separated by a comma.`,
            steps: [
              `There are ${V("m")} = ${n(b)} − ${n(a)} + 1 = ${n(m)} equally likely values.`,
              `Mean: ${M.frac(`${V("a")} + ${V("b")}`, "2")} = ${M.frac(`${n(a)} + ${n(b)}`, "2")} = ${dec(mu)}.`,
              `Variance: ${M.frac(`${M.sup(V("m"), 2)} − 1`, "12")} = ${M.frac(`${n(m * m)} − 1`, "12")} = ${fc(m * m - 1, 12, vr)}.`,
            ],
            answer: { kind: "numbers", values: [mu.value, vr.value], ordered: true }, answerText: `mean ${dec(mu)}, variance ${M.f(vr)}`, answerInput: `${typed(mu)}, ${typed(vr)}`,
            vals: { m, ab: a + b, mu: fv(mu), mm: m * m, top: m * m - 1, vr: fv(vr) }, params: { a, b }, consts: [12],
          };
        }
        for (;;) {
          const N = r.int(10, 20), K = r.int(2, 6), nn = r.int(3, 5), k = r.int(level === 2 ? 0 : 1, Math.min(K, nn));
          if (nn - k > N - K) continue;
          const T = C(N, nn);
          if (level === 2) {
            const a = C(K, k), b = C(N - K, nn - k), ans = Q(a * b, T);
            return {
              prompt: `A box of ${n(N)} bulbs contains ${n(K)} defective ones. An inspector picks ${n(nn)} bulbs at random without replacement. What is the probability that ${k === 0 ? "none is" : `exactly ${n(k)} ${k === 1 ? "is" : "are"}`} defective?${rnd(ans)}`,
              steps: [
                `Sampling without replacement from a small box: the hypergeometric distribution, ${pr(`${V("X")} = ${V("k")}`)} = ${M.frac(`C(${V("K")}, ${V("k")}) C(${V("N")} − ${V("K")}, ${V("n")} − ${V("k")})`, `C(${V("N")}, ${V("n")})`)}.`,
                `Defective bulbs: C(${n(K)}, ${n(k)}) = ${n(a)}. Good bulbs for the other ${n(nn - k)} place${nn - k === 1 ? "" : "s"}: C(${n(N - K)}, ${n(nn - k)}) = ${P.grouped(b)}.`,
                `All possible samples: C(${n(N)}, ${n(nn)}) = ${P.grouped(T)}.`,
                `${pr(`${V("X")} = ${n(k)}`)} = ${M.frac(`${n(a)} × ${P.grouped(b)}`, P.grouped(T))} = ${fc(a * b, T, ans)}.`,
              ],
              ...pAns(ans), vals: { a, b, NK: N - K, nk: nn - k, T, ab: a * b, ans: fv(ans) }, params: { N, K, nn, k },
            };
          }
          if (r.chance(0.5)) {
            const z = C(N - K, nn), p0 = Q(z, T), ans = Q(1).sub(p0);
            return {
              prompt: `A shipment of ${n(N)} laptops includes ${n(K)} with a faulty battery. An auditor tests ${n(nn)} laptops chosen at random (without replacement). What is the probability that at least one faulty laptop is found?${rnd(ans)}`,
              steps: [
                `Complement: ${pr("at least one faulty")} = 1 − ${pr("none faulty")}.`,
                `None faulty means all ${n(nn)} come from the ${n(N)} − ${n(K)} = ${n(N - K)} good laptops: C(${n(N - K)}, ${n(nn)}) = ${n(z)} of the C(${n(N)}, ${n(nn)}) = ${P.grouped(T)} equally likely samples.`,
                `${pr("none faulty")} = ${fc(z, T, p0)}.`,
                `${pr("at least one")} = 1 − ${M.f(p0)} = ${fd(ans)}.`,
              ],
              ...pAns(ans), vals: { NK: N - K, z, T, p0: fv(p0), ans: fv(ans) }, params: { kind: 0, N, K, nn },
            };
          }
          const pk = Q(K, N), mu = pk.mul(nn), fpc = Q(N - nn, N - 1), vr = mu.mul(Q(1).sub(pk)).mul(fpc);
          return {
            prompt: `A committee of ${n(nn)} is drawn at random from a staff of ${n(N)}, of whom ${n(K)} work night shifts. Let ${V("X")} be the number of night-shift workers chosen. Find E[${V("X")}] and Var(${V("X")}), separated by a comma.`,
            steps: [
              `Hypergeometric with ${V("N")} = ${n(N)}, ${V("K")} = ${n(K)}, ${V("n")} = ${n(nn)}. The share of night workers is ${M.frac(V("K"), V("N"))} = ${M.f(pk)}.`,
              `Mean: ${V("n")}${M.frac(V("K"), V("N"))} = ${n(nn)} × ${M.f(pk)} = ${M.f(mu)}.`,
              `Finite-population correction: ${M.frac(`${V("N")} − ${V("n")}`, `${V("N")} − 1`)} = ${M.frac(n(N - nn), n(N - 1))}${fpc.d !== N - 1 ? ` = ${M.f(fpc)}` : ""}.`,
              `Variance: ${V("n")}${M.frac(V("K"), V("N"))}(1 − ${M.frac(V("K"), V("N"))})${M.frac(`${V("N")} − ${V("n")}`, `${V("N")} − 1`)} = ${M.f(mu)} × ${M.f(Q(1).sub(pk))} × ${M.f(fpc)} = ${fd(vr)}, a little less than the binomial value because sampling without replacement removes some variability.`,
            ],
            answer: { kind: "numbers", values: [mu.value, vr.value], ordered: true }, answerText: `E[${V("X")}] = ${M.f(mu)}, Var(${V("X")}) = ${M.f(vr)}`, answerInput: `${typed(mu)}, ${typed(vr)}`,
            vals: { pk: fv(pk), mu: fv(mu), Nn: N - nn, N1: N - 1, fpc: fv(fpc), qk: fv(Q(1).sub(pk)), vr: fv(vr) }, params: { kind: 1, N, K, nn },
          };
        }
      },
    },

    // ---- S.18 Poisson distribution ---------------------------------------------------------------------------------
    "S.11": {
      title: "Poisson probabilities",
      generate(r, level) {
        const X = V("X"), lam = "λ";
        const ex = (l) => M.sup(V("e"), `−${n(l)}`);
        if (level <= 2) {
          let l, k, intro, pre = [], params;
          if (level === 1) {
            l = r.int(1, 4); k = r.int(0, 4);
            intro = `A help desk receives on average ${n(l)} calls per hour, and the number of calls in an hour follows a Poisson distribution.`;
            params = { l, k };
          } else {
            for (;;) {
              const rate = r.pick([2, 3, 4, 6, 8, 12]), t = r.pick([15, 20, 30, 45, 90]);
              l = (rate * t) / 60; k = r.int(0, 4);
              if (!Number.isInteger(2 * l) || l > 8) continue;
              intro = `A website receives on average ${n(rate)} sign-ups per hour, arriving as a Poisson process. Consider a ${n(t)}-minute window.`;
              pre = [`Scale the rate to the interval: ${lam} = ${n(rate)} per hour × ${M.frac(n(t), "60")} hour = ${n(l)}.`];
              params = { rate, t, k };
              break;
            }
          }
          const lk = l ** k, kf = fact(k), e = Math.exp(-l), ans = (lk * e) / kf;
          return {
            prompt: `${intro} What is the probability of exactly ${level === 1 ? `${unit(k, "call", "calls")} in an hour` : `${unit(k, "sign-up", "sign-ups")} in the window`}? Round to four decimal places.`,
            steps: [...pre,
              `Poisson PMF: ${pr(`${X} = ${V("k")}`)} = ${M.frac(`${M.sup(lam, V("k"))} ${M.sup(V("e"), `−${lam}`)}`, `${V("k")}!`)}.`,
              `${M.sup(n(l), n(k))} = ${n(lk)}, ${n(k)}! = ${n(kf)}, and ${ex(l)} ≈ ${nd(e, 6)}.`,
              `${pr(`${X} = ${n(k)}`)} = ${M.frac(`${n(lk)} × ${nd(e, 6)}`, n(kf))} ≈ ${nd(ans, 4)}.`,
            ],
            answer: { kind: "number", value: ans, dp: 4 }, answerText: `≈ ${nd(ans, 4)}`, answerInput: fmt(ans, 4),
            vals: { l, lk, kf, e, ans }, params, consts: [60],
          };
        }
        for (;;) {
          const r1 = r.pick([1, 2, 3, 4]), r2 = r.pick([1, 2, 3, 5]), t = r.pick([0.5, 1, 1.5]);
          const l = (r1 + r2) * t;
          if (!Number.isInteger(2 * l) || l > 6) continue;
          const e = Math.exp(-l), p0 = e, p1 = l * e, ans = 1 - e * (1 + l);
          return {
            prompt: `Two independent ticket queues receive Poisson arrivals at ${n(r1)} and ${n(r2)} tickets per hour. What is the probability of at least 2 tickets in total during a ${n(t * 60)}-minute period? Round to four decimal places.`,
            steps: [
              `Independent Poisson counts add their rates: ${n(r1)} + ${n(r2)} = ${n(r1 + r2)} per hour. Over ${n(t)} hour${t === 1 ? "" : "s"}, ${lam} = ${n(r1 + r2)} × ${n(t)} = ${n(l)}.`,
              `${pr(`${X} ≥ 2`)} = 1 − ${pr(`${X} = 0`)} − ${pr(`${X} = 1`)}, and ${ex(l)} ≈ ${nd(e, 6)}.`,
              `${pr(`${X} = 0`)} = ${ex(l)} ≈ ${nd(p0, 6)}; ${pr(`${X} = 1`)} = ${n(l)}${ex(l)} ≈ ${nd(p1, 6)}.`,
              `1 − ${nd(p0, 6)} − ${nd(p1, 6)} ≈ ${nd(ans, 4)}.`,
            ],
            answer: { kind: "number", value: ans, dp: 4 }, answerText: `≈ ${nd(ans, 4)}`, answerInput: fmt(ans, 4),
            vals: { rs: r1 + r2, l, e, p0, p1, ans, mins: t * 60 }, params: { r1, r2, t },
          };
        }
      },
    },

    // ---- S.19 Uniform & exponential ----------------------------------------------------------------------------------
    "S.20": {
      title: "Uniform and exponential distributions",
      generate(r, level) {
        const X = V("X");
        if (level === 1) {
          const b = r.pick([10, 12, 15, 20, 30]), c = r.int(0, b - 2), d = r.int(c + 1, c === 0 ? b - 1 : b), ans = Q(d - c, b);
          const h = 1 / b;
          return {
            prompt: `A bus comes every ${n(b)} minutes and you arrive at a random moment, so your wait ${X} is uniform on [0, ${n(b)}] minutes. What is the probability that you wait between ${n(c)} and ${n(d)} minutes?${rnd(ans)}`,
            graph: graph({ view: [-b / 10, b * 1.1, -h * 0.15, h * 1.5], grid: false, items: [
              { t: "poly", p: [[0, 0], [0, h], [b, h], [b, 0]], fill: false },
              { t: "poly", p: [[c, 0], [c, h], [d, h], [d, 0]], role: "highlight" }] }),
            steps: [
              `The density is flat: ${V("f")}(${V("x")}) = ${M.frac("1", `${V("b")} − ${V("a")}`)} = ${M.frac("1", n(b))} on [0, ${n(b)}].`,
              `Probability is the shaded area, width × height: (${n(d)} − ${n(c)}) × ${M.frac("1", n(b))} = ${fc(d - c, b, ans)}.`,
            ],
            ...pAns(ans), vals: { w: d - c, ans: fv(ans) }, params: { b, c, d },
          };
        }
        const m = r.pick([2, 4, 5, 8, 10]), lamq = Q(1, m);
        const ex = (top) => M.sup(V("e"), `−${typed(Q(top, m))}`);
        if (level === 2) {
          if (r.chance(0.5)) {
            const a = r.int(0, 10), w = r.pick([4, 6, 8, 10, 12]), b = a + w, mu = Q(a + b, 2), vr = Q(w * w, 12);
            return {
              prompt: `A sensor's reading error ${X} (in millivolts) is uniform on [${n(a)}, ${n(b)}]. Find its mean and variance, separated by a comma.`,
              steps: [
                `Mean: the midpoint, ${M.frac(`${V("a")} + ${V("b")}`, "2")} = ${M.frac(`${n(a)} + ${n(b)}`, "2")} = ${dec(mu)}.`,
                `Variance: ${M.frac(M.sup(`(${V("b")} − ${V("a")})`, 2), "12")} = ${M.frac(M.sup(n(w), 2), "12")} = ${fc(w * w, 12, vr)}.`,
              ],
              answer: { kind: "numbers", values: [mu.value, vr.value], ordered: true }, answerText: `mean ${dec(mu)}, variance ${M.f(vr)}`, answerInput: `${typed(mu)}, ${typed(vr)}`,
              vals: { ab: a + b, mu: fv(mu), w, ww: w * w, vr: fv(vr) }, params: { kind: 0, a, b }, consts: [12],
            };
          }
          const x = r.int(1, m + 2), e = Math.exp(-x / m), ans = 1 - e;
          return {
            prompt: `The lifetime of a component is exponential with mean ${n(m)} years. What is the probability that it fails within ${n(x)} years? Round to four decimal places.`,
            steps: [
              `Rate: ${"λ"} = ${M.frac("1", "mean")} = ${M.f(lamq)} per year. Exponential CDF: ${pr(`${X} ≤ ${V("x")}`)} = 1 − ${M.sup(V("e"), `−λ${V("x")}`)}.`,
              `${ex(x)} ≈ ${nd(e, 6)}.`,
              `${pr(`${X} ≤ ${n(x)}`)} = 1 − ${nd(e, 6)} ≈ ${nd(ans, 4)}.`,
            ],
            answer: { kind: "number", value: ans, dp: 4 }, answerText: `≈ ${nd(ans, 4)}`, answerInput: fmt(ans, 4),
            vals: { lam: fv(lamq), xm: fv(Q(x, m)), e, ans }, params: { kind: 1, m, x },
          };
        }
        if (r.chance(0.5)) {
          const s = r.int(1, 6), t = r.int(1, m), e = Math.exp(-t / m);
          return {
            prompt: `Waiting times for a taxi are exponential with mean ${n(m)} minutes. You have already waited ${n(s)} minutes. What is the probability you wait more than ${unit(t, "further minute", "further minutes")}? Round to four decimal places.`,
            steps: [
              `The exponential distribution is memoryless: ${pr(`${X} &gt; ${V("s")} + ${V("t")} | ${X} &gt; ${V("s")}`)} = ${pr(`${X} &gt; ${V("t")}`)}. The ${n(s)} minutes already waited do not matter.`,
              `${pr(`${X} &gt; ${V("t")}`)} = ${M.sup(V("e"), `−λ${V("t")}`)} with λ = ${M.f(lamq)}: ${ex(t)} ≈ ${nd(e, 4)}.`,
            ],
            answer: { kind: "number", value: e, dp: 4 }, answerText: `≈ ${nd(e, 4)}`, answerInput: fmt(e, 4),
            vals: { lam: fv(lamq), xm: fv(Q(t, m)), e }, params: { kind: 0, m, s, t },
          };
        }
        const a = r.int(1, m), b = r.int(a + 1, 2 * m), ea = Math.exp(-a / m), eb = Math.exp(-b / m), ans = ea - eb;
        return {
          prompt: `The time between earthquakes in a region above a certain size is exponential with mean ${n(m)} years. What is the probability that the next one comes between ${n(a)} and ${n(b)} years from now? Round to four decimal places.`,
          steps: [
            `${pr(`${X} &gt; ${V("x")}`)} = ${M.sup(V("e"), `−λ${V("x")}`)} with λ = ${M.f(lamq)}, so ${pr(`${n(a)} &lt; ${X} &lt; ${n(b)}`)} = ${pr(`${X} &gt; ${n(a)}`)} − ${pr(`${X} &gt; ${n(b)}`)}.`,
            `${ex(a)} ≈ ${nd(ea, 6)} and ${ex(b)} ≈ ${nd(eb, 6)}.`,
            `${nd(ea, 6)} − ${nd(eb, 6)} ≈ ${nd(ans, 4)}.`,
          ],
          answer: { kind: "number", value: ans, dp: 4 }, answerText: `≈ ${nd(ans, 4)}`, answerInput: fmt(ans, 4),
          vals: { lam: fv(lamq), am: fv(Q(a, m)), bm: fv(Q(b, m)), ea, eb, ans }, params: { kind: 1, m, a, b },
        };
      },
    },

    // ---- S.20 Normal distribution -------------------------------------------------------------------------------------
    "S.12": {
      title: "Normal probabilities",
      generate(r, level) {
        const X = V("X"), Z = V("Z");
        if (level === 1) {
          // bands in hundredths of a percent, from z = −∞ up: below −3, −3..−2, −2..−1, −1..0, 0..1, 1..2, 2..3, above 3
          const band = [15, 235, 1350, 3400, 3400, 1350, 235, 15], cut = [null, -3, -2, -1, 0, 1, 2, 3, null];
          for (;;) {
            const i = r.int(0, 4), j = r.int(4, 8);   // lower cut index (0 = −∞), upper cut index (8 = +∞)
            if (j <= i || (i === 0 && j === 8)) continue;
            const lo = cut[i], hi = cut[j], used = band.slice(i, j), pct = sum(used) / 100;
            const mu = r.int(60, 70), sd = r.pick([2, 3, 4]), xl = lo === null ? null : mu + lo * sd, xh = hi === null ? null : mu + hi * sd;
            const what = lo === null ? `shorter than ${n(xh)} inches` : hi === null ? `taller than ${n(xl)} inches` : `between ${n(xl)} and ${n(xh)} inches tall`;
            const zs = [lo, hi].filter((v) => v !== null);
            return {
              prompt: `Adult heights in a population are approximately normal with mean ${n(mu)} inches and standard deviation ${n(sd)} inches. Using the empirical (68–95–99.7) rule, about what percent of adults are ${what}?`,
              graph: normalGraph(mu, sd, xl, xh),
              steps: [
                `In standard deviations from the mean: ${zs.map((z) => `${n(mu + z * sd)} is ${V("z")} = ${M.frac(`${n(mu + z * sd)} − ${n(mu)}`, n(sd))} = ${n(z)}`).join("; ")}.`,
                `The rule puts 68% within 1 SD, 95% within 2 and 99.7% within 3. So each side of the mean holds 34% (0 to 1 SD), 13.5% (1 to 2 SD), 2.35% (2 to 3 SD) and 0.15% beyond 3 SD.`,
                used.length === 1 ? `The shaded region is a single band: ${n(pct)}%.` : `Add the bands in the shaded region: ${used.map((u) => n(u / 100)).join(" + ")} = ${n(pct)}%.`,
              ],
              answer: { kind: "number", value: pct }, answerText: `about ${n(pct)}%`, answerInput: String(pct),
              vals: { zs, xs: zs.map((z) => mu + z * sd), diffs: zs.map((z) => z * sd), pct }, params: { mu, sd, lo: lo === null ? -99 : lo, hi: hi === null ? 99 : hi },
              consts: [68, 95, 99.7, 34, 13.5, 2.35, 0.15, 3],
            };
          }
        }
        if (level === 2) {
          const [mu, sd, ctx, u] = r.pick([[100, 15, "IQ scores are", "points"], [40, 4, "Battery lifetimes are", "hours"], [500, 100, "Exam scores are", "points"], [70, 8, "Commute times are", "minutes"]]);
          const zz = r.pick([0.5, 1, 1.5, 2, 2.5]) * r.sign(), less = r.chance(0.5), x = mu + zz * sd, az = Math.abs(zz), ph = phi(az);
          const ans = less ? (zz > 0 ? ph : 1 - ph) : zz > 0 ? 1 - ph : ph;
          const direct = (less && zz > 0) || (!less && zz < 0);
          return {
            prompt: `${ctx} normal with mean ${n(mu)} and standard deviation ${n(sd)}. What proportion are ${less ? "below" : "above"} ${n(x)} ${u}? Use a four-place z-table.`,
            graph: normalGraph(mu, sd, less ? null : x, less ? x : null),
            steps: [
              `Standardize: ${V("z")} = ${M.frac(`${n(x)} − ${n(mu)}`, n(sd))} = ${M.frac(n(x - mu), n(sd))} = ${n(zz)}.`,
              `The table gives ${Phi(az)} = ${n(ph)}, the area to the left of ${n(az)}.`,
              direct
                ? `${less ? `${pr(`${Z} &lt; ${n(zz)}`)} = ${Phi(zz)}` : `By symmetry, ${pr(`${Z} &gt; ${n(zz)}`)} = ${pr(`${Z} &lt; ${n(az)}`)}`} = ${n(ph)}.`
                : `${less ? `By symmetry, ${pr(`${Z} &lt; ${n(zz)}`)} = ${pr(`${Z} &gt; ${n(az)}`)}` : `${pr(`${Z} &gt; ${n(zz)}`)}`} = 1 − ${n(ph)} = ${nd(ans, 4)}.`,
            ],
            answer: { kind: "number", value: ans, dp: 4 }, answerText: nd(ans, 4), answerInput: fmt(ans, 4),
            vals: { diff: x - mu, z: zz, az, ph, ans }, params: { mu, sd, x, less: less ? 1 : 0 },
          };
        }
        if (r.chance(0.5)) {
          for (;;) {
            const za = r.pick([-2, -1.5, -1, -0.5, 0.5, 1]), zb = r.pick([-0.5, 0.5, 1, 1.5, 2, 2.5]);
            if (zb <= za) continue;
            const mu = r.pick([100, 200, 250]), sd = r.pick([10, 20, 25]), a = mu + za * sd, b = mu + zb * sd;
            const Fa = za > 0 ? phi(za) : 1 - phi(-za), Fb = zb > 0 ? phi(zb) : 1 - phi(-zb), ans = Fb - Fa;
            const show = (z, F) => (z > 0 ? `${Phi(z)} = ${n(F)}` : `${Phi(z)} = 1 − ${Phi(-z)} = 1 − ${n(phi(-z))} = ${nd(F, 4)}`);
            return {
              prompt: `The fill volume of juice bottles is normal with mean ${n(mu)} ml and standard deviation ${n(sd)} ml. What proportion of bottles hold between ${n(a)} and ${n(b)} ml? Use a four-place z-table.`,
              graph: normalGraph(mu, sd, a, b),
              steps: [
                `Standardize both ends: ${V("z")}<sub>a</sub> = ${M.frac(`${n(a)} − ${n(mu)}`, n(sd))} = ${n(za)} and ${V("z")}<sub>b</sub> = ${M.frac(`${n(b)} − ${n(mu)}`, n(sd))} = ${n(zb)}.`,
                `${pr(`${n(a)} &lt; ${X} &lt; ${n(b)}`)} = ${Phi(zb)} − ${Phi(za)}.`,
                `${show(zb, Fb)}; ${show(za, Fa)}${za < 0 || zb < 0 ? " (symmetry: Φ(−z) = 1 − Φ(z))" : ""}.`,
                `${nd(Fb, 4)} − ${nd(Fa, 4)} = ${nd(ans, 4)}.`,
              ],
              answer: { kind: "number", value: ans, dp: 4 }, answerText: nd(ans, 4), answerInput: fmt(ans, 4),
              vals: { za, zb, Fa, Fb, ans, pa: phi(Math.abs(za)), pb: phi(Math.abs(zb)), da: a - mu, db: b - mu }, params: { mu, sd, a, b, kind: 0 },
            };
          }
        }
        const [z, tail] = r.pick([[1.645, 5], [1.96, 2.5], [1.28, 10], [2.33, 1]]), top = r.chance(0.5);
        const [mu, sd, ctx, u] = r.pick([[500, 100, "Scores on an entrance exam", "points"], [170, 10, "Heights of adult men", "cm"], [60, 8, "Finishing times in a 10 km race", "minutes"]]);
        const cutoff = top ? mu + z * sd : mu - z * sd, target = Q(1000 - tail * 10, 1000), zsd = z * sd;
        return {
          prompt: `${ctx} are normal with mean ${n(mu)} and standard deviation ${n(sd)}. Find the cutoff for the ${top ? "top" : "bottom"} ${n(tail)}%, in ${u}. Use a four-place z-table.`,
          graph: normalGraph(mu, sd, top ? cutoff : null, top ? null : cutoff),
          steps: [
            `${top ? `The top ${n(tail)}% lies above a ${V("z")} with ${Phi(V("z"))} = ${dec(target)}` : `The bottom ${n(tail)}% lies below −${V("z")}, where ${Phi(V("z"))} = ${dec(target)} by symmetry`}. The table value closest to ${dec(target)} is ${Phi(z)} = ${n(phi(z))}, so ${V("z")} ≈ ${n(z)}.`,
            `Back-transform: ${V("x")} = μ ${top ? "+" : "−"} ${V("z")}σ = ${n(mu)} ${top ? "+" : "−"} ${n(z)} × ${n(sd)} = ${n(mu)} ${top ? "+" : "−"} ${n(zsd)} = ${n(cutoff)} ${u}.`,
          ],
          answer: { kind: "number", value: cutoff }, answerText: `${n(cutoff)} ${u}`, answerInput: String(cutoff),
          vals: { z, tail, target: fv(target), ph: phi(z), zsd, cutoff }, params: { kind: 1, mu, sd, top: top ? 1 : 0, tail }, consts: [10],
        };
      },
    },

    // ---- S.21 Degrees of freedom ----------------------------------------------------------------------------------
    "S.dof": {
      title: "Degrees of freedom",
      generate(r, level) {
        const df = V("df");
        if (level === 1) {
          if (r.chance(0.5)) {
            const N = r.int(6, 40);
            return {
              prompt: `A one-sample ${V("t")}-test is run on ${n(N)} measurements. How many degrees of freedom does the ${V("t")} statistic have?`,
              steps: [
                `The sample standard deviation is measured around ${xbar}, which was estimated from the same data, so the deviations must add to 0 and one of them is fixed by the others.`,
                `${df} = ${V("n")} − 1 = ${n(N)} − 1 = ${n(N - 1)}.`,
              ],
              answer: { kind: "number", value: N - 1 }, answerText: n(N - 1), answerInput: String(N - 1),
              vals: { df: N - 1 }, params: { kind: 0, N },
            };
          }
          for (;;) {
            const N = r.int(4, 6), mean = r.int(5, 12), known = Array.from({ length: N - 1 }, () => r.int(1, 20)), last = N * mean - sum(known);
            if (last < 0 || last > 25) continue;
            return {
              prompt: `${n(N)} numbers have mean ${n(mean)}. ${N - 1} of them are ${list(known)}. What must the last one be? (This is why their deviations have only ${V("n")} − 1 degrees of freedom.)`,
              steps: [
                `A mean of ${n(mean)} over ${n(N)} numbers fixes their total: ${n(N)} × ${n(mean)} = ${n(N * mean)}.`,
                `The known values add to ${known.map(n).join(" + ")} = ${n(sum(known))}.`,
                `The last value is forced: ${n(N * mean)} − ${n(sum(known))} = ${n(last)}. Only ${n(N - 1)} values were free to vary: ${df} = ${n(N)} − 1 = ${n(N - 1)}.`,
              ],
              answer: { kind: "number", value: last }, answerText: n(last), answerInput: String(last),
              vals: { N1: N - 1, tot: N * mean, s: sum(known), last }, params: { kind: 1, N, mean, known },
            };
          }
        }
        if (level === 2) {
          const kind = r.int(0, 2);
          if (kind === 0) {
            const R = r.int(2, 5), Cc = r.int(2, 5), d = (R - 1) * (Cc - 1);
            return {
              prompt: `A survey cross-tabulates ${n(R)} age groups against ${n(Cc)} favorite social networks, and a χ² test of independence is run on the ${n(R)} × ${n(Cc)} table. How many degrees of freedom does the test have?`,
              steps: [
                `With the row and column totals fixed, each row has one cell determined by the others, and so does each column.`,
                `${df} = (${V("r")} − 1)(${V("c")} − 1) = (${n(R)} − 1)(${n(Cc)} − 1) = ${n(R - 1)} × ${n(Cc - 1)} = ${n(d)}.`,
              ],
              answer: { kind: "number", value: d }, answerText: n(d), answerInput: String(d),
              vals: { R1: R - 1, C1: Cc - 1, d }, params: { kind, R, C: Cc },
            };
          }
          if (kind === 1) {
            const n1 = r.int(5, 30), n2 = r.int(5, 30), d = n1 + n2 - 2;
            return {
              prompt: `A pooled two-sample ${V("t")}-test compares ${n(n1)} patients on a new drug with ${n(n2)} on a placebo. How many degrees of freedom does it have?`,
              steps: [
                `Each group's mean is estimated from its own data, which uses up one degree of freedom per group.`,
                `${df} = ${M.sub(V("n"), "1")} + ${M.sub(V("n"), "2")} − 2 = ${n(n1)} + ${n(n2)} − 2 = ${n(d)}.`,
              ],
              answer: { kind: "number", value: d }, answerText: n(d), answerInput: String(d),
              vals: { d }, params: { kind, n1, n2 },
            };
          }
          const k = r.int(4, 9), m = r.int(0, 2), d = k - 1 - m;
          const model = m === 0 ? "a fully specified distribution (no parameters estimated)" : m === 1 ? "a Poisson distribution whose mean is estimated from the data" : "a normal distribution whose mean and standard deviation are estimated from the data";
          return {
            prompt: `A χ² goodness-of-fit test with ${n(k)} categories checks the data against ${model}. How many degrees of freedom does the test have?`,
            steps: [
              `Start from ${n(k)} category counts; they must add to ${V("n")}, which removes one degree of freedom.`,
              `Each parameter estimated from the data removes one more: here ${n(m)}.`,
              `${df} = ${V("k")} − 1 − ${V("m")} = ${n(k)} − 1 − ${n(m)} = ${n(d)}.`,
            ],
            answer: { kind: "number", value: d }, answerText: n(d), answerInput: String(d),
            vals: { d }, params: { kind, k, m },
          };
        }
        if (r.chance(0.5)) {
          const k = r.int(3, 5), sizes = Array.from({ length: k }, () => r.int(4, 12)), N = sum(sizes), d1 = k - 1, d2 = N - k;
          return {
            prompt: `A one-way ANOVA compares ${n(k)} teaching methods with groups of ${list(sizes)} students. Give the between-groups and within-groups degrees of freedom, separated by a comma.`,
            steps: [
              `Total observations: ${V("N")} = ${sizes.map(n).join(" + ")} = ${n(N)}.`,
              `Between groups: the ${n(k)} group means vary around one grand mean, so ${M.sub(df, "B")} = ${V("k")} − 1 = ${n(d1)}.`,
              `Within groups: each group's mean is estimated, using one degree of freedom per group, so ${M.sub(df, "W")} = ${V("N")} − ${V("k")} = ${n(N)} − ${n(k)} = ${n(d2)}.`,
            ],
            answer: { kind: "numbers", values: [d1, d2], ordered: true }, answerText: `${n(d1)}, ${n(d2)}`, answerInput: `${d1}, ${d2}`,
            vals: { k, N, d1, d2 }, params: { kind: 0, sizes },
          };
        }
        const N = r.int(20, 80), p = r.int(2, 6), d2 = N - p - 1;
        return {
          prompt: `A multiple regression predicts house prices from ${n(p)} predictors using ${n(N)} houses. What are the two degrees of freedom of the overall ${V("F")}-test (numerator, then denominator)?`,
          steps: [
            `The numerator counts the slopes being tested: ${M.sub(df, "1")} = ${V("p")} = ${n(p)}.`,
            `The residuals lose one degree of freedom for each estimated coefficient: ${n(p)} slopes plus the intercept. ${M.sub(df, "2")} = ${V("n")} − ${V("p")} − 1 = ${n(N)} − ${n(p)} − 1 = ${n(d2)}.`,
          ],
          answer: { kind: "numbers", values: [p, d2], ordered: true }, answerText: `${n(p)}, ${n(d2)}`, answerInput: `${p}, ${d2}`,
          vals: { d2 }, params: { kind: 1, N, p },
        };
      },
    },

    // ---- S.22 Sampling distributions: χ², t & F --------------------------------------------------------------------
    "S.sampling-dists": {
      title: "χ², t and F statistics",
      generate(r, level) {
        if (level === 1) {
          const k = r.int(2, 12);
          return {
            prompt: `${V("Q")} is the sum of the squares of ${n(k)} independent standard normal variables. Find E[${V("Q")}] and Var(${V("Q")}), separated by a comma.`,
            steps: [
              `${V("Q")} ~ ${M.sup("χ", 2)} with ${V("k")} = ${n(k)} degrees of freedom.`,
              `Each ${M.sup(V("Z"), 2)} has mean E[${M.sup(V("Z"), 2)}] = Var(${V("Z")}) = 1 and variance 2, and independent terms add both: E[${V("Q")}] = ${V("k")} = ${n(k)}, Var(${V("Q")}) = 2${V("k")} = ${n(2 * k)}.`,
            ],
            answer: { kind: "numbers", values: [k, 2 * k], ordered: true }, answerText: `${n(k)}, ${n(2 * k)}`, answerInput: `${k}, ${2 * k}`,
            vals: { k2: 2 * k }, params: { k },
          };
        }
        if (level === 2) {
          const rt = r.pick([2, 3, 4, 5, 6, 8]), N = rt * rt, se = r.pick([0.5, 1, 1.5, 2, 2.5, 3]), s = se * rt;
          if (!Number.isInteger(s)) return this.generate(r, level);
          const t = r.pick([-3, -2.5, -2, -1.5, -1, 1, 1.5, 2, 2.5, 3, 3.5]), mu0 = r.int(20, 80), xb = mu0 + t * se, diff = t * se;
          return {
            prompt: `A sample of ${n(N)} has mean ${xbar} = ${n(xb)} and standard deviation ${V("s")} = ${n(s)}. Compute the ${V("t")}-statistic for ${sub0}: μ = ${n(mu0)} (the solution also gives its degrees of freedom).`,
            steps: [
              `Standard error: ${M.frac(V("s"), M.sqrt(V("n")))} = ${M.frac(n(s), M.sqrt(n(N)))} = ${M.frac(n(s), n(rt))} = ${n(se)}.`,
              `${V("t")} = ${M.frac(`${xbar} − ${M.sub("μ", "0")}`, `${V("s")}/${M.sqrt(V("n"))}`)} = ${M.frac(`${n(xb)} − ${n(mu0)}`, n(se))} = ${M.frac(n(diff), n(se))} = ${n(t)}.`,
              `It follows a ${V("t")} distribution with ${V("n")} − 1 = ${n(N - 1)} degrees of freedom (σ was replaced by ${V("s")}, which adds uncertainty).`,
            ],
            answer: { kind: "number", value: t }, answerText: `${V("t")} = ${n(t)}, with ${n(N - 1)} degrees of freedom`, answerInput: String(t),
            vals: { rt, se, diff, t, df: N - 1 }, params: { N, xb, s, mu0 },
          };
        }
        if (r.chance(0.5)) {
          const N = r.pick([10, 16, 20, 25, 31]), s2 = r.int(3, 12), v0 = r.int(2, 9), top = (N - 1) * s2, stat = Q(top, v0);
          return {
            prompt: `A filling machine is supposed to have variance ${M.sup("σ", 2)} = ${n(v0)} ml². A sample of ${n(N)} fills has ${M.sup(V("s"), 2)} = ${n(s2)} ml². Compute the χ² statistic ${M.frac(`(${V("n")} − 1)${M.sup(V("s"), 2)}`, M.sup(M.sub("σ", "0"), 2))} for testing that variance.${rnd(stat, 2)}`,
            steps: [
              `For normal data, ${M.frac(`(${V("n")} − 1)${M.sup(V("s"), 2)}`, M.sup("σ", 2))} follows ${M.sup("χ", 2)} with ${V("n")} − 1 degrees of freedom.`,
              `${M.frac(`(${n(N)} − 1) × ${n(s2)}`, n(v0))} = ${fc(top, v0, stat, 2)}, compared with ${M.sup("χ", 2)} on ${n(N - 1)} degrees of freedom (mean ${n(N - 1)}).`,
            ],
            ...pAns(stat, 2), vals: { N1: N - 1, top, stat: fv(stat) }, params: { kind: 0, N, s2, v0 },
          };
        }
        const s1 = r.int(3, 12), s2 = r.int(2, 10), n1 = r.int(8, 25), n2 = r.int(8, 25);
        if (s1 === s2) return this.generate(r, level);
        const v1 = s1 * s1, v2 = s2 * s2, F = Q(v1, v2);
        return {
          prompt: `Two suppliers' bolt lengths are compared. Supplier 1: ${n(n1)} bolts with standard deviation ${n(s1)} μm. Supplier 2: ${n(n2)} bolts with standard deviation ${n(s2)} μm. Compute the ${V("F")} statistic ${M.frac(M.sup(M.sub(V("s"), "1"), 2), M.sup(M.sub(V("s"), "2"), 2))} (the solution also gives its degrees of freedom).${rnd(F, 2)}`,
          steps: [
            `The ${V("F")} statistic compares variances, not standard deviations: square both.`,
            `${M.sup(M.sub(V("s"), "1"), 2)} = ${M.sup(n(s1), 2)} = ${n(v1)} and ${M.sup(M.sub(V("s"), "2"), 2)} = ${M.sup(n(s2), 2)} = ${n(v2)}.`,
            `${V("F")} = ${fc(v1, v2, F, 2)}, on (${n(n1)} − 1, ${n(n2)} − 1) = (${n(n1 - 1)}, ${n(n2 - 1)}) degrees of freedom.`,
          ],
          ...pAns(F, 2), vals: { v1, v2, F: fv(F), d1: n1 - 1, d2: n2 - 1 }, params: { kind: 1, s1, s2, n1, n2 },
        };
      },
    },

    // ---- S.23 Law of large numbers & inequalities --------------------------------------------------------------------
    "S.lln": {
      title: "Chebyshev, Markov and the law of large numbers",
      generate(r, level) {
        const ks = [Q(3, 2), Q(2), Q(5, 2), Q(3), Q(4), Q(5)];
        if (level === 1) {
          const k = r.pick(ks), inv = Q(1).div(k.mul(k)), ans = Q(1).sub(inv);
          return {
            prompt: `For any distribution with a finite variance, at least what fraction of the values lie within ${dec(k)} standard deviations of the mean?`,
            steps: [
              `Chebyshev's inequality: ${pr(`|${V("X")} − μ| ≥ ${V("k")}σ`)} ≤ ${M.frac("1", M.sup(V("k"), 2))}, so at least 1 − ${M.frac("1", M.sup(V("k"), 2))} lies within ${V("k")}σ.`,
              `${M.frac("1", M.sup(dec(k), 2))} = ${M.f(inv)}, so at least 1 − ${M.f(inv)} = ${fd(ans)}.`,
              `This holds for every distribution; a normal one actually has far more within ${dec(k)}σ.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: fd(ans), answerInput: typed(ans),
            vals: { k: fv(k), inv: fv(inv), ans: fv(ans) }, params: { k: fv(k) },
          };
        }
        if (level === 2) {
          const mu = r.int(2, 20), a = mu * r.int(2, 6) + r.int(0, 3), ans = Q(mu, a);
          return {
            prompt: `The waiting time at a clinic is never negative and averages ${n(mu)} minutes; nothing else is known about its distribution. What is the best upper bound Markov's inequality gives for the probability of waiting at least ${n(a)} minutes?${rnd(ans)}`,
            steps: [
              `Markov's inequality, for a non-negative ${V("X")}: ${pr(`${V("X")} ≥ ${V("a")}`)} ≤ ${M.frac(`E[${V("X")}]`, V("a"))}.`,
              `${M.frac(n(mu), n(a))}${ans.d !== a ? ` = ${M.f(ans)}` : ""} ${eqs(ans)} ${dec(ans)}. At most this fraction of patients wait ${n(a)} minutes or longer.`,
            ],
            ...pAns(ans), vals: { ans: fv(ans) }, params: { mu, a },
          };
        }
        if (r.chance(0.5)) {
          const k = r.pick(ks), sd = r.pick([2, 4, 6, 8, 10]), mu = r.int(40, 120), half = k.mul(sd);
          if (!half.isInt()) return this.generate(r, level);
          const lo = mu - half.n, hi = mu + half.n, inv = Q(1).div(k.mul(k)), ans = Q(1).sub(inv);
          return {
            prompt: `Daily orders at a warehouse have mean ${n(mu)} and standard deviation ${n(sd)}, with an unknown distribution. At least what fraction of days have between ${n(lo)} and ${n(hi)} orders (exclusive)?`,
            steps: [
              `The interval is μ ± ${n(half.n)}, and ${n(half.n)} = ${V("k")}σ with ${V("k")} = ${M.frac(n(half.n), n(sd))} = ${dec(k)}.`,
              `Chebyshev: at least 1 − ${M.frac("1", M.sup(V("k"), 2))} of the values lie strictly within ${V("k")}σ of the mean.`,
              `1 − ${M.frac("1", M.sup(dec(k), 2))} = 1 − ${M.f(inv)} = ${fd(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: fd(ans), answerInput: typed(ans),
            vals: { half: half.n, k: fv(k), inv: fv(inv), ans: fv(ans) }, params: { kind: 0, mu, sd, lo, hi },
          };
        }
        const sd = r.int(2, 10), eps = r.pick([Q(1, 2), Q(1), Q(2)]), del = r.pick([Q(1, 20), Q(1, 10), Q(1, 100)]);
        const raw = Q(sd * sd).div(eps.mul(eps).mul(del)), ans = Math.ceil(raw.value - 1e-12);
        return {
          prompt: `A lab measures a quantity with standard deviation σ = ${n(sd)} per reading. How many independent readings guarantee, by Chebyshev's inequality, that the average is within ${dec(eps)} of the true mean with probability at least ${dec(Q(1).sub(del))}?`,
          steps: [
            `The average ${M.sub(V("X̄"), V("n"))} has mean μ and variance ${M.frac(M.sup("σ", 2), V("n"))}. Chebyshev: ${pr(`|${V("X̄")} − μ| ≥ ε`)} ≤ ${M.frac(M.sup("σ", 2), `${V("n")}${M.sup("ε", 2)}`)}.`,
            `We need ${M.frac(M.sup("σ", 2), `${V("n")}${M.sup("ε", 2)}`)} ≤ ${dec(del)}, i.e. ${V("n")} ≥ ${M.frac(M.sup("σ", 2), `${M.sup("ε", 2)} × ${dec(del)}`)} = ${M.frac(n(sd * sd), `${dec(eps.mul(eps))} × ${dec(del)}`)} = ${dec(raw)}.`,
            `${raw.isInt() ? `So ${n(ans)} readings suffice.` : `Round up: ${n(ans)} readings.`} This is the law of large numbers made concrete: more readings squeeze the average toward μ.`,
          ],
          answer: { kind: "number", value: ans }, answerText: `${n(ans)} readings`, answerInput: String(ans),
          vals: { s2: sd * sd, e2: fv(eps.mul(eps)), raw: fv(raw), ans, conf: fv(Q(1).sub(del)) }, params: { kind: 1, sd, eps: eps.value, del: del.value },
        };
      },
    },

    // ---- S.24 Central limit theorem & standard error ------------------------------------------------------------------
    "S.13": {
      title: "Standard error and the central limit theorem",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const rt = r.pick([2, 3, 4, 5, 6, 8, 10]), se = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4]), sd = se * rt;
            if (!Number.isInteger(sd)) continue;
            const N = rt * rt;
            return {
              prompt: `Package weights have standard deviation σ = ${n(sd)} g. What is the standard error of the mean weight of a random sample of ${n(N)} packages, in grams?`,
              steps: [
                `The standard error of a mean is ${M.frac("σ", M.sqrt(V("n")))}: averaging ${V("n")} independent values divides the variance by ${V("n")}.`,
                `${M.frac(n(sd), M.sqrt(n(N)))} = ${M.frac(n(sd), n(rt))} = ${n(se)} g.`,
              ],
              answer: { kind: "number", value: se }, answerText: `${n(se)} g`, answerInput: String(se),
              vals: { rt, se }, params: { sd, N },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const [p, rpq] = r.pick([[1, 3], [2, 4], [5, 5], [8, 4], [9, 3]]), k = r.pick([5, 10, 20, 30, 40, 50]), N = k * k;
            const se = Q(rpq, 10 * k), pq = Q(p * (10 - p), 100);
            if (!terminates(se, 6)) continue;
            const ph = Q(p, 10);
            return {
              prompt: `In a poll of ${P.grouped(N)} randomly chosen voters, a proportion ${V("p̂")} = ${dec(ph)} support a new park. What is the standard error of ${V("p̂")}?`,
              steps: [
                `A proportion is a mean of 0/1 values, so ${M.sub("SE", V("p̂"))} = ${M.sqrt(M.frac(`${V("p̂")}(1 − ${V("p̂")})`, V("n")))}.`,
                `${V("p̂")}(1 − ${V("p̂")}) = ${dec(ph)} × ${dec(Q(1).sub(ph))} = ${dec(pq)}, whose square root is ${dec(Q(rpq, 10))}; ${M.sqrt(P.grouped(N))} = ${n(k)}.`,
                `SE = ${M.frac(dec(Q(rpq, 10)), n(k))} = ${dec(se, 6)}, about ${n(se.value * 100)} percentage points.`,
              ],
              answer: { kind: "number", value: se.value }, answerText: dec(se, 6), answerInput: typed(se.value),
              vals: { q: fv(Q(1).sub(ph)), pq: fv(pq), rpq: rpq / 10, k, se: fv(se), pts: se.value * 100 }, params: { ph: ph.value, N },
            };
          }
        }
        if (r.chance(0.5)) {
          for (;;) {
            const rt = r.pick([4, 5, 6, 8, 10]), N = rt * rt, se = r.pick([0.5, 1, 1.5, 2, 2.5]), sd = se * rt;
            if (!Number.isInteger(sd)) continue;
            const z = r.pick([0.5, 1, 1.5, 2, 2.5]), mu = r.pick([250, 330, 500, 750]), c = mu + z * se, ph = phi(z), ans = 1 - ph;
            return {
              prompt: `A machine fills bottles with mean ${n(mu)} ml and standard deviation ${n(sd)} ml. A quality check measures a random sample of ${n(N)} bottles. Using the central limit theorem, what is the probability that the sample mean exceeds ${n(c)} ml? Use a four-place z-table.`,
              graph: normalGraph(mu, se, c, null),
              steps: [
                `By the CLT, ${xbar} is approximately normal with mean ${n(mu)} and standard error ${M.frac(n(sd), M.sqrt(n(N)))} = ${M.frac(n(sd), n(rt))} = ${n(se)} ml.`,
                `${V("z")} = ${M.frac(`${n(c)} − ${n(mu)}`, n(se))} = ${n(z)}.`,
                `${pr(`${V("Z")} &gt; ${n(z)}`)} = 1 − ${Phi(z)} = 1 − ${n(ph)} = ${nd(ans, 4)}.`,
              ],
              answer: { kind: "number", value: ans, dp: 4 }, answerText: nd(ans, 4), answerInput: fmt(ans, 4),
              vals: { rt, se, diff: c - mu, z, ph, ans }, params: { kind: 0, mu, sd, N, c },
            };
          }
        }
        const [a, b, c] = r.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [4, 3, 5]]), r1 = r.pick([2, 3, 4, 5]), r2 = r.pick([2, 3, 4, 5]);
        const n1 = r1 * r1, n2 = r2 * r2, s1 = a * r1, s2 = b * r2;
        return {
          prompt: `An A/B test of page-load times: version A has ${n(n1)} visits with standard deviation ${n(s1)} ms, version B has ${n(n2)} visits with standard deviation ${n(s2)} ms. What is the standard error of the difference in mean load times, in ms?`,
          steps: [
            `The two samples are independent, so their variances (not standard errors) add: ${M.sub("SE", `${V("x̄")}₁ − ${V("x̄")}₂`)} = ${M.sqrt(`${M.frac(M.sup(M.sub(V("s"), "1"), 2), M.sub(V("n"), "1"))} + ${M.frac(M.sup(M.sub(V("s"), "2"), 2), M.sub(V("n"), "2"))}`)}.`,
            `${M.frac(M.sup(n(s1), 2), n(n1))} = ${M.frac(n(s1 * s1), n(n1))} = ${n(a * a)} and ${M.frac(M.sup(n(s2), 2), n(n2))} = ${M.frac(n(s2 * s2), n(n2))} = ${n(b * b)}.`,
            `SE = ${M.sqrt(`${n(a * a)} + ${n(b * b)}`)} = ${M.sqrt(n(c * c))} = ${n(c)} ms.`,
          ],
          answer: { kind: "number", value: c }, answerText: `${n(c)} ms`, answerInput: String(c),
          vals: { v1: s1 * s1, v2: s2 * s2, a2: a * a, b2: b * b, c2: c * c, c }, params: { kind: 1, n1, s1, n2, s2 },
        };
      },
    },

    // ---- S.25 Point estimators: bias, variance & MSE ------------------------------------------------------------------
    "S.estimators": {
      title: "Bias, variance and mean squared error",
      generate(r, level) {
        const th = V("θ̂");
        if (level === 1) {
          const truth = r.pick([100, 200, 500, 1000]), b = Q(r.nonzero(-12, 12), 2), avg = b.add(truth);
          return {
            prompt: `A kitchen scale weighs a certified ${n(truth)} g reference mass many times; the readings average ${dec(avg)} g. What is the scale's bias, in grams?`,
            steps: [
              `Bias = E[${th}] − θ: the long-run average of the estimates minus the true value.`,
              `${dec(avg)} − ${n(truth)} = ${dec(b)} g. The scale reads ${b.n > 0 ? "high" : "low"} by ${dec(b.abs())} g on average.`,
            ],
            answer: { kind: "number", value: b.value }, answerText: `${dec(b)} g`, answerInput: typed(b.value),
            vals: { b: fv(b), ab: fv(b.abs()) }, params: { truth, avg: avg.value },
          };
        }
        if (level === 2) {
          for (;;) {
            const vA = r.int(4, 30), vB = r.int(1, vA - 1), bB = r.int(1, 5), mB = vB + bB * bB;
            if (mB === vA) continue;
            const idx = vA < mB ? 0 : 1, options = ["Estimator A", "Estimator B"];
            return {
              prompt: `Two estimators of a population mean: A is unbiased with variance ${n(vA)}; B has bias ${n(bB)} and variance ${n(vB)}. Which has the smaller mean squared error?`,
              steps: [
                `MSE = Var + ${M.sup("Bias", 2)}: random scatter plus systematic error.`,
                `A: ${n(vA)} + ${M.sup("0", 2)} = ${n(vA)}. B: ${n(vB)} + ${M.sup(n(bB), 2)} = ${n(vB)} + ${n(bB * bB)} = ${n(mB)}.`,
                idx === 0 ? `${n(vA)} &lt; ${n(mB)}: A wins; B's bias costs more than its smaller variance saves.` : `${n(mB)} &lt; ${n(vA)}: B wins; a little bias buys a larger cut in variance.`,
              ],
              answer: { kind: "choice", options, index: idx }, answerText: options[idx],
              vals: { b2: bB * bB, mB }, params: { vA, vB, bB },
            };
          }
        }
        if (r.chance(0.5)) {
          for (;;) {
            const vals3 = [r.int(4, 10), r.int(11, 14), r.int(15, 20)], t = Array.from({ length: 2 }, () => r.int(1, 6)), lt = 10 - sum(t);
            if (lt < 1) continue;
            const ps = [...t, lt].map((v) => Q(v, 10)), theta = r.int(10, 14);
            const e = fsum(vals3.map((v, i) => ps[i].mul(v))), e2 = fsum(vals3.map((v, i) => ps[i].mul(v * v))), vr = e2.sub(e.mul(e)), bias = e.sub(theta), mse = vr.add(bias.mul(bias));
            return {
              prompt: `An estimator ${th} of a parameter whose true value is θ = ${n(theta)} has this sampling distribution: ${M.table([th, ...vals3.map(n)], [["Probability", ...ps.map((q) => dec(q))]])} Find its mean squared error.`,
              steps: [
                `E[${th}] = ${vals3.map((v, i) => `${n(v)} × ${dec(ps[i])}`).join(" + ")} = ${dec(e)}, so the bias is ${dec(e)} − ${n(theta)} = ${dec(bias)}.`,
                `E[${M.sup(th, 2)}] = ${vals3.map((v, i) => `${n(v * v)} × ${dec(ps[i])}`).join(" + ")} = ${dec(e2)}, so Var(${th}) = ${dec(e2)} − ${M.sup(dec(e), 2)} = ${dec(e2)} − ${dec(e.mul(e))} = ${dec(vr)}.`,
                `MSE = Var + ${M.sup("Bias", 2)} = ${dec(vr)} + ${M.sup(`(${dec(bias)})`, 2)} = ${dec(vr)} + ${dec(bias.mul(bias))} = ${dec(mse)}.`,
              ],
              answer: { kind: "number", value: mse.value }, answerText: dec(mse), answerInput: typed(mse.value),
              vals: { e: fv(e), bias: fv(bias), sq: vals3.map((v) => v * v), e2: fv(e2), ee: fv(e.mul(e)), vr: fv(vr), b2: fv(bias.mul(bias)), mse: fv(mse) }, params: { kind: 0, vals3, ps: ps.map((q) => q.value), theta },
            };
          }
        }
        const N = r.int(4, 20), s2 = r.int(2, 30), e = Q(s2 * (N - 1), N), bias = e.sub(s2);
        return {
          prompt: `The estimator ${M.sup(V("σ̂"), 2)} = ${M.frac("1", V("n"))}Σ${M.sup(`(${V("x")}<sub>${V("i")}</sub> − ${xbar})`, 2)} divides by ${V("n")} instead of ${V("n")} − 1. Its expected value is ${M.frac(`${V("n")} − 1`, V("n"))}σ². For samples of ${V("n")} = ${n(N)} from a population with σ² = ${n(s2)}, what is its bias?${rnd(bias)}`,
          steps: [
            `E[${M.sup(V("σ̂"), 2)}] = ${M.frac(`${n(N)} − 1`, n(N))} × ${n(s2)} = ${M.frac(n(s2 * (N - 1)), n(N))}${e.d !== N ? ` = ${M.f(e)}` : ""}.`,
            `Bias = E[${M.sup(V("σ̂"), 2)}] − σ² = ${M.f(e)} − ${n(s2)} = ${fd(bias)}, which equals −σ²/${V("n")}: it underestimates on average, which is why the sample variance divides by ${V("n")} − 1.`,
          ],
          ...pAns(bias), vals: { top: s2 * (N - 1), e: fv(e), bias: fv(bias) }, params: { kind: 1, N, s2 },
        };
      },
    },

    // ---- S.26 Maximum likelihood ---------------------------------------------------------------------------------------
    "S.21": {
      title: "Maximum likelihood estimates",
      generate(r, level) {
        const ell = "ℓ";
        if (level === 1) {
          if (r.chance(0.5)) {
            const N = r.pick([20, 40, 50, 80, 100, 200]), k = r.int(1, N / 2), ph = Q(k, N);
            return {
              prompt: `In a test of a new button, ${n(k)} of ${n(N)} visitors clicked it. Treating each visit as an independent Bernoulli(${V("p")}) trial, what is the maximum likelihood estimate of ${V("p")}?`,
              steps: [
                `The likelihood is ${M.sup(V("p"), V("k"))}${M.sup(`(1 − ${V("p")})`, `${V("n")} − ${V("k")}`)}, maximized at the sample proportion: ${V("p̂")} = ${M.frac(V("k"), V("n"))}.`,
                `${V("p̂")} = ${fc(k, N, ph)}.`,
              ],
              answer: { kind: "number", value: ph.value }, answerText: fd(ph), answerInput: typed(ph),
              vals: { ph: fv(ph) }, params: { kind: 0, N, k },
            };
          }
          const N = r.int(5, 8), data = Array.from({ length: N }, () => r.int(0, 7)), s = sum(data), lam = Q(s, N);
          return {
            prompt: `The numbers of typos found on ${n(N)} randomly chosen pages are ${M.eq(list(data))} Assuming a Poisson(λ) model, what is the maximum likelihood estimate of λ?${rnd(lam)}`,
            steps: [
              `For a Poisson sample the MLE of λ is the sample mean: setting ${M.frac(`d${ell}`, "dλ")} = ${M.frac(`Σ${V("x")}<sub>${V("i")}</sub>`, "λ")} − ${V("n")} = 0 gives λ̂ = ${xbar}.`,
              `λ̂ = ${fc(s, N, lam)} typos per page.`,
            ],
            ...pAns(lam), vals: { N, s, lam: fv(lam) }, params: { kind: 1, data },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            for (;;) {
              const N = r.int(4, 6), data = Array.from({ length: N }, () => r.int(1, 12)), s = sum(data), lam = Q(N, s);
              return {
                prompt: `Times between bus arrivals, in minutes: ${M.eq(list(data))} Assuming an exponential model with density λ${M.sup(V("e"), `−λ${V("x")}`)}, find the maximum likelihood estimate of the rate λ.${rnd(lam)}`,
                steps: [
                  `Log-likelihood: ${ell}(λ) = Σ ln(λ${M.sup(V("e"), `−λ${V("x")}<sub>${V("i")}</sub>`)}) = ${V("n")} ln λ − λΣ${V("x")}<sub>${V("i")}</sub> = ${n(N)} ln λ − ${n(s)}λ, since Σ${V("x")}<sub>${V("i")}</sub> = ${n(s)}.`,
                  `Derivative: ${M.frac(`d${ell}`, "dλ")} = ${M.frac(n(N), "λ")} − ${n(s)} = 0, so λ̂ = ${M.frac(n(N), n(s))}. (The second derivative, −${M.frac(n(N), "λ²")}, is negative: a maximum.)`,
                  `λ̂ = ${fd(lam)} per minute, i.e. 1/${xbar}.`,
                ],
                ...pAns(lam), vals: { N, s, lam: fv(lam) }, params: { kind: 0, data },
              };
            }
          }
          for (;;) {
            const N = r.pick([4, 5]), data = Array.from({ length: N }, () => r.int(10, 30)), s = sum(data);
            if (s % N) continue;
            const mu = s / N, d = data.map((x) => x - mu), SS = sum(d.map((x) => x * x)), v = Q(SS, N);
            if (SS === 0) continue;
            return {
              prompt: `Assume the data ${M.eq(list(data))} come from a normal distribution. Find the maximum likelihood estimate of the variance σ².${rnd(v)}`,
              steps: [
                `The normal MLEs are μ̂ = ${xbar} and ${M.sup(V("σ̂"), 2)} = ${M.frac("1", V("n"))}Σ${M.sup(`(${V("x")}<sub>${V("i")}</sub> − ${xbar})`, 2)}, dividing by ${V("n")}, not ${V("n")} − 1.`,
                `${xbar} = ${M.frac(n(s), n(N))} = ${n(mu)}. Deviations: ${list(d)}; squares: ${list(d.map((x) => x * x))}, adding to ${n(SS)}.`,
                `${M.sup(V("σ̂"), 2)} = ${fc(SS, N, v)} (slightly smaller than the unbiased ${M.sup(V("s"), 2)}).`,
              ],
              ...pAns(v), vals: { N, s, mu, d, sq: d.map((x) => x * x), SS, v: fv(v) }, params: { kind: 1, data },
            };
          }
        }
        const N = r.int(4, 6), data = Array.from({ length: N }, () => r.int(1, 8)), s = sum(data), ph = Q(N, s), fails = s - N;
        if (fails === 0) return this.generate(r, level);
        return {
          prompt: `A player keeps shooting until scoring; the numbers of attempts needed in ${n(N)} separate rounds were ${M.eq(list(data))} With the geometric model ${pr(`${V("X")} = ${V("x")}`)} = ${M.sup(`(1 − ${V("p")})`, `${V("x")} − 1`)}${V("p")}, find the maximum likelihood estimate of ${V("p")}.${rnd(ph)}`,
          steps: [
            `Likelihood: ${V("L")}(${V("p")}) = ∏ ${M.sup(`(1 − ${V("p")})`, `${V("x")}<sub>${V("i")}</sub> − 1`)}${V("p")} = ${M.sup(V("p"), V("n"))}${M.sup(`(1 − ${V("p")})`, `Σ${V("x")}<sub>${V("i")}</sub> − ${V("n")}`)}. Here Σ${V("x")}<sub>${V("i")}</sub> = ${n(s)}, so ${ell}(${V("p")}) = ${n(N)} ln ${V("p")} + ${n(fails)} ln(1 − ${V("p")}).`,
            `${M.frac(`d${ell}`, `d${V("p")}`)} = ${M.frac(n(N), V("p"))} − ${M.frac(n(fails), `1 − ${V("p")}`)} = 0, so ${n(N)}(1 − ${V("p")}) = ${n(fails)}${V("p")}, i.e. ${n(N)} = ${n(N + fails)}${V("p")}.`,
            `${V("p̂")} = ${fc(N, s, ph)}: one over the mean number of attempts. (Both terms of the second derivative are negative, so this is a maximum.)`,
          ],
          ...pAns(ph), vals: { N, s, fails, ph: fv(ph) }, params: { data },
        };
      },
    },

    // ---- S.27 Confidence intervals -------------------------------------------------------------------------------------
    "S.14": {
      title: "Confidence intervals and sample size",
      generate(r, level) {
        const ZS = [[90, 1.645], [95, 1.96], [99, 2.576]];
        if (level === 1) {
          for (;;) {
            const [cl, z] = r.pick(ZS), rt = r.pick([4, 5, 6, 8, 10]), se = r.pick([0.5, 1, 2, 2.5]), sd = se * rt;
            if (!Number.isInteger(sd)) continue;
            const N = rt * rt, xb = r.int(40, 120), E = P.round(z * se, 6), lo = P.round(xb - E, 6), hi = P.round(xb + E, 6);
            return {
              prompt: `A sample of ${n(N)} phone batteries has mean life ${n(xb)} hours. The population standard deviation is known to be σ = ${n(sd)} hours. Find the ${n(cl)}% confidence interval for the mean. Enter the lower and upper limits, separated by a comma.`,
              steps: [
                `With σ known, use ${xbar} ± ${V("z")}* ${M.frac("σ", M.sqrt(V("n")))}; for ${n(cl)}% confidence ${V("z")}* = ${n(z)}.`,
                `Standard error: ${M.frac(n(sd), M.sqrt(n(N)))} = ${M.frac(n(sd), n(rt))} = ${n(se)}.`,
                `Margin of error: ${n(z)} × ${n(se)} = ${n(E)}.`,
                `${n(xb)} ± ${n(E)}: from ${n(lo)} to ${n(hi)} hours.`,
              ],
              answer: { kind: "numbers", values: [lo, hi], ordered: true }, answerText: `(${n(lo)}, ${n(hi)}) hours`, answerInput: `${fmt(lo, 6)}, ${fmt(hi, 6)}`,
              vals: { z, rt, se, E, lo, hi }, params: { cl, N, xb, sd },
            };
          }
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            for (;;) {
              const [cl, z] = r.pick(ZS), [p, rpq] = r.pick([[1, 3], [2, 4], [5, 5], [8, 4], [9, 3]]), k = r.pick([10, 20, 30, 50]), N = k * k;
              const ph = Q(p, 10), se = Q(rpq, 10 * k), x = (p * N) / 10;
              if (!terminates(se, 6)) continue;
              const E = P.round(z * se.value, 8), lo = P.round(ph.value - E, 8), hi = P.round(ph.value + E, 8);
              return {
                prompt: `In a survey of ${P.grouped(N)} customers, ${P.grouped(x)} say they would recommend the product. Find the ${n(cl)}% confidence interval for the true proportion. Enter the lower and upper limits as decimals, separated by a comma.`,
                steps: [
                  `${V("p̂")} = ${M.frac(P.grouped(x), P.grouped(N))} = ${dec(ph)}. Both ${V("n")}${V("p̂")} and ${V("n")}(1 − ${V("p̂")}) are well above 10.`,
                  `SE = ${M.sqrt(M.frac(`${dec(ph)} × ${dec(Q(1).sub(ph))}`, P.grouped(N)))} = ${M.frac(dec(Q(rpq, 10)), n(k))} = ${dec(se, 6)}.`,
                  `Margin: ${n(z)} × ${dec(se, 6)} = ${nd(E, 6)}.`,
                  `${dec(ph)} ± ${nd(E, 6)}: from ${nd(lo, 6)} to ${nd(hi, 6)}.`,
                ],
                answer: { kind: "numbers", values: [lo, hi], ordered: true }, answerText: `(${nd(lo, 6)}, ${nd(hi, 6)})`, answerInput: `${fmt(lo, 8)}, ${fmt(hi, 8)}`,
                vals: { z, x, ph: ph.value, q: Q(1).sub(ph).value, rpq: rpq / 10, k, se: se.value, E, lo, hi }, params: { kind: 0, cl, N, p: ph.value }, consts: [10],
              };
            }
          }
          const [N, tstar] = r.pick([[9, 2.306], [16, 2.131], [25, 2.064]]), rt = Math.sqrt(N), se = r.int(1, 3), s = se * rt, xb = r.int(8, 25);
          const E = P.round(tstar * se, 6), lo = P.round(xb - E, 6), hi = P.round(xb + E, 6);
          return {
            prompt: `On a new drug, a sample of ${n(N)} patients shows a mean reduction in systolic blood pressure of ${n(xb)} mmHg, with sample standard deviation ${n(s)} mmHg. Find the 95% confidence interval for the mean reduction, using ${M.sup(V("t"), "*")} = ${n(tstar)} (${n(N - 1)} degrees of freedom). Enter the limits separated by a comma.`,
            steps: [
              `σ is unknown, so use ${V("t")}: ${xbar} ± ${M.sup(V("t"), "*")} ${M.frac(V("s"), M.sqrt(V("n")))}, with ${V("n")} − 1 = ${n(N - 1)} degrees of freedom.`,
              `SE = ${M.frac(n(s), M.sqrt(n(N)))} = ${M.frac(n(s), n(rt))} = ${n(se)}.`,
              `Margin: ${n(tstar)} × ${n(se)} = ${n(E)}.`,
              `${n(xb)} ± ${n(E)}: from ${n(lo)} to ${n(hi)} mmHg.`,
            ],
            answer: { kind: "numbers", values: [lo, hi], ordered: true }, answerText: `(${n(lo)}, ${n(hi)}) mmHg`, answerInput: `${fmt(lo, 6)}, ${fmt(hi, 6)}`,
            vals: { df: N - 1, rt, se, E, lo, hi }, params: { kind: 1, N, tstar, s, xb }, consts: [95],
          };
        }
        if (r.chance(0.5)) {
          const [cl, z] = r.pick(ZS), sd = r.int(5, 30), E = r.int(1, 5), ratio = (z * sd) / E, raw = ratio * ratio, ans = Math.ceil(raw - 1e-9);
          return {
            prompt: `A researcher wants to estimate a mean to within ±${n(E)} units with ${n(cl)}% confidence. A pilot study suggests σ = ${n(sd)}. What is the smallest sample size that achieves this?`,
            steps: [
              `The margin is ${V("z")}* ${M.frac("σ", M.sqrt(V("n")))} ≤ ${V("E")}, so ${V("n")} ≥ ${M.sup(`(${M.frac(`${V("z")}* σ`, V("E"))})`, 2)}, with ${V("z")}* = ${n(z)}.`,
              `${M.frac(`${n(z)} × ${n(sd)}`, n(E))} = ${nd(ratio, 6)}, and ${M.sup(nd(ratio, 6), 2)} ${approx(raw, 6)} ${nd(raw, 6)}.`,
              `Round up (a smaller ${V("n")} would miss the target): ${V("n")} = ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
            vals: { z, ratio, raw, ans }, params: { kind: 0, cl, sd, E },
          };
        }
        const [cl, z] = r.pick(ZS), E = Q(r.int(1, 5), 100), raw = (z * z * 0.25) / (E.value * E.value), ans = Math.ceil(raw - 1e-9);
        return {
          prompt: `A pollster wants a margin of error of ±${dec(E)} (${n(E.value * 100)} percentage points) at ${n(cl)}% confidence, with no prior guess for the proportion. How many people must be surveyed?`,
          steps: [
            `${V("n")} = ${M.frac(`(${V("z")}*)² ${V("p")}(1 − ${V("p")})`, M.sup(V("E"), 2))}. With no prior guess, use ${V("p")} = 0.5, which makes ${V("p")}(1 − ${V("p")}) = 0.25 as large as possible (the safe choice).`,
            `${M.frac(`${M.sup(n(z), 2)} × 0.25`, M.sup(dec(E), 2))} = ${M.frac(`${nd(z * z, 6)} × 0.25`, dec(E.mul(E), 6))} ${approx(raw, 4)} ${nd(raw, 4)}.`,
            `Round up: ${P.grouped(ans)} people.`,
          ],
          answer: { kind: "number", value: ans }, answerText: `${P.grouped(ans)} people`, answerInput: String(ans),
          vals: { z, zz: z * z, E2: fv(E.mul(E)), raw, ans, pts: E.value * 100 }, params: { kind: 1, cl, E: E.value }, consts: [0.5, 0.25],
        };
      },
    },

    // ---- S.28 Hypothesis testing ------------------------------------------------------------------------------------------
    "S.15": {
      title: "z-tests and p-values",
      generate(r, level) {
        const setup = (zset, mus = [50, 100, 250, 500]) => {
          for (;;) {
            const rt = r.pick([4, 5, 6, 8, 10]), se = r.pick([0.5, 1, 1.5, 2, 2.5]), sd = se * rt;
            if (!Number.isInteger(sd)) continue;
            const z = r.pick(zset), mu0 = r.pick(mus), xb = mu0 + z * se;
            return { rt, N: rt * rt, se, sd, z, mu0, xb, diff: z * se };
          }
        };
        if (level === 1) {
          const s = setup([-2.5, -2, -1.5, -1, -0.5, 0.5, 1, 1.5, 2, 2.5, 3]);
          return {
            prompt: `A cereal maker claims μ = ${n(s.mu0)} g per box. A sample of ${n(s.N)} boxes has mean ${n(s.xb)} g; the process standard deviation is known to be σ = ${n(s.sd)} g. Compute the ${V("z")} test statistic.`,
            steps: [
              `${V("z")} = ${M.frac(`${xbar} − ${M.sub("μ", "0")}`, `σ/${M.sqrt(V("n"))}`)}: how many standard errors the sample mean is from the claim.`,
              `Standard error: ${M.frac(n(s.sd), M.sqrt(n(s.N)))} = ${M.frac(n(s.sd), n(s.rt))} = ${n(s.se)}.`,
              `${V("z")} = ${M.frac(`${n(s.xb)} − ${n(s.mu0)}`, n(s.se))} = ${M.frac(n(s.diff), n(s.se))} = ${n(s.z)}.`,
            ],
            answer: { kind: "number", value: s.z }, answerText: `${V("z")} = ${n(s.z)}`, answerInput: String(s.z),
            vals: { rt: s.rt, se: s.se, diff: s.diff, z: s.z }, params: { mu0: s.mu0, N: s.N, xb: s.xb, sd: s.sd },
          };
        }
        if (level === 2) {
          const s = setup([-2.5, -2, -1.5, -1, 1, 1.5, 2, 2.5, 3]), az = Math.abs(s.z), ph = phi(az), tail = 1 - ph, p = 2 * tail;
          return {
            prompt: `A battery is rated for ${n(s.mu0)} hours. A sample of ${n(s.N)} batteries averages ${n(s.xb)} hours, with known σ = ${n(s.sd)} hours. Find the two-sided ${V("p")}-value for ${sub0}: μ = ${n(s.mu0)} against ${suba}: μ ≠ ${n(s.mu0)}. Use a four-place z-table.`,
            graph: normalGraph(0, 1, null, -az, [[az, null]]),
            steps: [
              `SE = ${M.frac(n(s.sd), M.sqrt(n(s.N)))} = ${n(s.se)}, so ${V("z")} = ${M.frac(`${n(s.xb)} − ${n(s.mu0)}`, n(s.se))} = ${n(s.z)}.`,
              `Two-sided: a result at least this extreme in either direction. ${V("p")} = 2(1 − ${Phi(az)}).`,
              `${Phi(az)} = ${n(ph)}, so each tail holds 1 − ${n(ph)} = ${nd(tail, 4)} and ${V("p")} = 2 × ${nd(tail, 4)} = ${nd(p, 4)}.`,
              `${p < 0.05 ? `${nd(p, 4)} &lt; 0.05: significant at the 5% level.` : `${nd(p, 4)} ≥ 0.05: not significant at the 5% level.`}`,
            ],
            answer: { kind: "number", value: p, dp: 4 }, answerText: `${V("p")} = ${nd(p, 4)}`, answerInput: fmt(p, 4),
            vals: { se: s.se, z: s.z, az, ph, tail, p, rt: s.rt }, params: { mu0: s.mu0, N: s.N, xb: s.xb, sd: s.sd }, consts: [0.05, 5],
          };
        }
        const up = r.chance(0.5), s = setup(up ? [0.5, 1, 1.5, 2, 2.5, 3] : [-0.5, -1, -1.5, -2, -2.5, -3], [30, 45, 60]), alpha = r.pick([0.05, 0.01]);
        const az = Math.abs(s.z), ph = phi(az), p = 1 - ph, rej = p < alpha, idx = rej ? 0 : 1;
        const options = [`Reject ${sub0}`, `Fail to reject ${sub0}`];
        return {
          prompt: `A delivery company says its mean delivery time is ${n(s.mu0)} minutes. A manager suspects it is ${up ? "longer" : "shorter"}. A random sample of ${n(s.N)} deliveries averages ${n(s.xb)} minutes; σ = ${n(s.sd)} minutes is known. Test at α = ${n(alpha)} using a four-place z-table.`,
          graph: normalGraph(0, 1, up ? s.z : null, up ? null : s.z),
          steps: [
            `${sub0}: μ = ${n(s.mu0)}; ${suba}: μ ${up ? "&gt;" : "&lt;"} ${n(s.mu0)} (one-sided, as the suspicion was stated in advance).`,
            `SE = ${M.frac(n(s.sd), M.sqrt(n(s.N)))} = ${n(s.se)}; ${V("z")} = ${M.frac(`${n(s.xb)} − ${n(s.mu0)}`, n(s.se))} = ${n(s.z)}.`,
            up ? `${V("p")} = ${pr(`${V("Z")} ≥ ${n(s.z)}`)} = 1 − ${Phi(az)} = 1 − ${n(ph)} = ${nd(p, 4)}.`
              : `${V("p")} = ${pr(`${V("Z")} ≤ ${n(s.z)}`)} = 1 − ${Phi(az)} = 1 − ${n(ph)} = ${nd(p, 4)} (by symmetry).`,
            rej ? `${nd(p, 4)} &lt; ${n(alpha)}: reject ${sub0}. The data support a ${up ? "longer" : "shorter"} mean time.`
              : `${nd(p, 4)} ≥ ${n(alpha)}: fail to reject ${sub0}. The data are not convincing evidence (which is not proof that μ = ${n(s.mu0)}).`,
          ],
          answer: { kind: "choice", options, index: idx }, answerText: options[idx],
          vals: { se: s.se, z: s.z, az, ph, p, rt: s.rt }, params: { up: up ? 1 : 0, mu0: s.mu0, N: s.N, xb: s.xb, sd: s.sd, alpha },
        };
      },
    },

    // ---- S.29 Power, sample size & effect size --------------------------------------------------------------------------
    "S.power": {
      title: "Effect size, pooled SD and sample size",
      generate(r, level) {
        const sp = M.sub(V("s"), V("p"));
        if (level === 1) {
          const d = r.pick([0.2, 0.25, 0.4, 0.5, 0.6, 0.75, 0.8, 1, 1.2, 1.5]), s = r.pick([4, 8, 10, 12, 20]), diff = d * s, m2 = r.int(50, 80), m1 = m2 + diff;
          const size = d < 0.35 ? "small" : d < 0.65 ? "medium" : "large";
          return {
            prompt: `In a study of a tutoring program, tutored students averaged ${n(m1)} points and untutored students ${n(m2)} points; the pooled standard deviation is ${sp} = ${n(s)}. Compute Cohen's ${V("d")}.`,
            steps: [
              `Cohen's ${V("d")} = ${M.frac(`${M.sub(xbar, "1")} − ${M.sub(xbar, "2")}`, sp)}: the difference in means in standard-deviation units.`,
              `${V("d")} = ${M.frac(`${n(m1)} − ${n(m2)}`, n(s))} = ${M.frac(n(diff), n(s))} = ${n(d)}.`,
              `By Cohen's benchmarks (0.2 small, 0.5 medium, 0.8 large) this is a ${size} effect.`,
            ],
            answer: { kind: "number", value: d }, answerText: `${V("d")} = ${n(d)} (${size})`, answerInput: String(d),
            vals: { diff, d }, params: { m1, m2, s }, consts: [0.2, 0.5, 0.8],
          };
        }
        if (level === 2) {
          for (;;) {
            const n1 = r.int(5, 15), n2 = r.int(5, 15), s1 = r.int(2, 12), s2 = r.int(2, 12);
            if (s1 === s2) continue;
            const a = (n1 - 1) * s1 * s1, b = (n2 - 1) * s2 * s2, den = n1 + n2 - 2, num = a + b;
            if (num % den || !isSq(num / den)) continue;
            const v = num / den, s = Math.round(Math.sqrt(v));
            return {
              prompt: `Two groups are compared: ${n(n1)} plants on fertilizer A with standard deviation ${n(s1)} cm, and ${n(n2)} plants on fertilizer B with standard deviation ${n(s2)} cm. Find the pooled standard deviation ${sp}.`,
              steps: [
                `${sp} = ${M.sqrt(M.frac(`(${M.sub(V("n"), "1")} − 1)${M.sup(M.sub(V("s"), "1"), 2)} + (${M.sub(V("n"), "2")} − 1)${M.sup(M.sub(V("s"), "2"), 2)}`, `${M.sub(V("n"), "1")} + ${M.sub(V("n"), "2")} − 2`))}: each group's variance weighted by its degrees of freedom.`,
                `Numerator: ${n(n1 - 1)} × ${M.sup(n(s1), 2)} + ${n(n2 - 1)} × ${M.sup(n(s2), 2)} = ${n(a)} + ${n(b)} = ${n(num)}. Denominator: ${n(n1)} + ${n(n2)} − 2 = ${n(den)}.`,
                `${sp} = ${M.sqrt(M.frac(n(num), n(den)))} = ${M.sqrt(n(v))} = ${n(s)} cm, between ${n(Math.min(s1, s2))} and ${n(Math.max(s1, s2))} as a weighted average must be.`,
              ],
              answer: { kind: "number", value: s }, answerText: `${n(s)} cm`, answerInput: String(s),
              vals: { a1: n1 - 1, b1: n2 - 1, a, b, num, den, v, s }, params: { n1, n2, s1, s2 },
            };
          }
        }
        const [pw_, zb] = r.pick([[80, 0.84], [90, 1.28]]), za = 1.96, sum_ = P.round(za + zb, 6), sq = P.round(sum_ * sum_, 6);
        const sd = r.pick([5, 8, 10, 12, 15, 20]), delta = r.pick([2, 3, 4, 5, 6, 8, 10]), two = r.chance(0.5);
        const raw = ((two ? 2 : 1) * sq * sd * sd) / (delta * delta), ans = Math.ceil(raw - 1e-9);
        return {
          prompt: two
            ? `An A/B test will compare mean order values between two groups. The standard deviation is about $${n(sd)}, and the team wants ${n(pw_)}% power to detect a difference of $${n(delta)} with a two-sided test at α = 0.05. How many customers are needed per group?`
            : `A one-sample study wants ${n(pw_)}% power to detect a shift of ${n(delta)} units in a mean, using a two-sided test at α = 0.05; σ ≈ ${n(sd)}. How many subjects are needed?`,
          steps: [
            `Critical values: ${M.sub(V("z"), "α/2")} = ${n(za)} for α = 0.05 two-sided, and ${M.sub(V("z"), "β")} = ${n(zb)} for ${n(pw_)}% power.`,
            two ? `Per group: ${V("n")} = ${M.frac(`2 ${M.sup(`(${M.sub(V("z"), "α/2")} + ${M.sub(V("z"), "β")})`, 2)} ${M.sup("σ", 2)}`, M.sup("δ", 2))}.`
              : `${V("n")} = ${M.sup(`(${M.frac(`(${M.sub(V("z"), "α/2")} + ${M.sub(V("z"), "β")})σ`, "δ")})`, 2)}.`,
            `${n(za)} + ${n(zb)} = ${n(sum_)}, and ${M.sup(n(sum_), 2)} = ${n(sq)}.`,
            `${V("n")} = ${M.frac(`${two ? "2 × " : ""}${n(sq)} × ${M.sup(n(sd), 2)}`, M.sup(n(delta), 2))} = ${M.frac(`${two ? "2 × " : ""}${n(sq)} × ${n(sd * sd)}`, n(delta * delta))} ${approx(raw, 4)} ${nd(raw, 4)}; round up to ${n(ans)}${two ? " per group" : ""}.`,
          ],
          answer: { kind: "number", value: ans }, answerText: `${n(ans)}${two ? " per group" : ""}`, answerInput: String(ans),
          vals: { za, zb, sum: sum_, sq, sd2: sd * sd, d2: delta * delta, raw, ans }, params: { two: two ? 1 : 0, pw: pw_, sd, delta }, consts: [0.05],
        };
      },
    },

    // ---- S.30 t-tests ------------------------------------------------------------------------------------------------------
    "S.16": {
      title: "One-sample, paired and Welch t-tests",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const rt = r.pick([3, 4, 5, 6]), N = rt * rt, se = r.pick([0.5, 1, 1.5, 2]), s = se * rt;
            if (!Number.isInteger(s)) continue;
            const t = r.pick([-3, -2.5, -2, -1.5, 1.5, 2, 2.5, 3]), mu0 = r.pick([8, 12, 20, 30]), xb = mu0 + t * se, diff = t * se;
            return {
              prompt: `A coffee shop says its drinks are served in ${n(mu0)} minutes on average. A sample of ${n(N)} orders has mean ${n(xb)} minutes and standard deviation ${n(s)} minutes. Compute the one-sample ${V("t")} statistic and its degrees of freedom; enter ${V("t")}.`,
              steps: [
                `${V("t")} = ${M.frac(`${xbar} − ${M.sub("μ", "0")}`, `${V("s")}/${M.sqrt(V("n"))}`)}, with ${V("n")} − 1 degrees of freedom.`,
                `SE = ${M.frac(n(s), M.sqrt(n(N)))} = ${M.frac(n(s), n(rt))} = ${n(se)}.`,
                `${V("t")} = ${M.frac(`${n(xb)} − ${n(mu0)}`, n(se))} = ${M.frac(n(diff), n(se))} = ${n(t)}, on ${n(N)} − 1 = ${n(N - 1)} degrees of freedom.`,
              ],
              answer: { kind: "number", value: t }, answerText: `${V("t")} = ${n(t)} (${n(N - 1)} df)`, answerInput: String(t),
              vals: { rt, se, diff, t, df: N - 1 }, params: { mu0, N, xb, s },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const N = r.pick([4, 9]), d = Array.from({ length: N }, () => r.int(-2, 10)), S = sum(d);
            if (S % N || S <= 0) continue;
            const db = S / N, dev = d.map((x) => x - db), SS = sum(dev.map((x) => x * x));
            if (SS === 0 || SS % (N - 1) || !isSq(SS / (N - 1))) continue;
            const v = SS / (N - 1), sd = Math.round(Math.sqrt(v)), rt = Math.sqrt(N), se = Q(sd, rt), t = Q(db).div(se);
            const before = d.map(() => r.int(120, 160)), after = before.map((b, i) => b - d[i]);
            return {
              prompt: `Systolic blood pressure (mmHg) for ${n(N)} patients before and after a month of exercise: ${M.table(["Patient", "Before", "After"], before.map((b, i) => [String(i + 1), n(b), n(after[i])]))} Compute the paired ${V("t")} statistic for the drop (before − after).${rnd(t, 2)}`,
              steps: [
                `Paired data: work with the differences ${V("d")} = before − after: ${list(d)}.`,
                `${V("d̄")} = ${M.frac(n(S), n(N))} = ${n(db)}. Deviations from ${V("d̄")}: ${list(dev)}; squares add to ${n(SS)}.`,
                `${M.sub(V("s"), V("d"))} = ${M.sqrt(M.frac(n(SS), n(N - 1)))} = ${M.sqrt(n(v))} = ${n(sd)}.`,
                `${V("t")} = ${M.frac(V("d̄"), `${M.sub(V("s"), V("d"))}/${M.sqrt(V("n"))}`)} = ${M.frac(n(db), `${n(sd)}/${n(rt)}`)} = ${fd(t, 2)}, on ${n(N - 1)} degrees of freedom.`,
              ],
              ...pAns(t, 2), vals: { d, S, db, dev, SS, n1: N - 1, v, sd, rt, se: fv(se), t: fv(t), idx: Array.from({ length: N }, (_, i) => i + 1) }, params: { before, after },
            };
          }
        }
        const [a, b, c] = r.pick([[3, 4, 5], [6, 8, 10], [4, 3, 5], [8, 6, 10], [5, 12, 13], [12, 5, 13]]), r1 = r.pick([3, 4, 5, 6]), r2 = r.pick([3, 4, 5, 6]);
        const n1 = r1 * r1, n2 = r2 * r2, s1 = a * r1, s2 = b * r2, t = r.pick([-3, -2.5, -2, -1.5, -1, 1, 1.5, 2, 2.5, 3]), diff = t * c, m2 = r.int(50, 90), m1 = m2 + diff;
        const v1 = a * a, v2 = b * b, dfw = Q((v1 + v2) * (v1 + v2)).div(Q(v1 * v1, n1 - 1).add(Q(v2 * v2, n2 - 1)));
        return {
          prompt: `Group 1: ${n(n1)} students, mean ${n(m1)}, SD ${n(s1)}. Group 2: ${n(n2)} students, mean ${n(m2)}, SD ${n(s2)}. Compute Welch's two-sample ${V("t")} statistic.`,
          steps: [
            `Welch's ${V("t")} = ${M.frac(`${M.sub(xbar, "1")} − ${M.sub(xbar, "2")}`, M.sqrt(`${M.sup(M.sub(V("s"), "1"), 2)}/${M.sub(V("n"), "1")} + ${M.sup(M.sub(V("s"), "2"), 2)}/${M.sub(V("n"), "2")}`))}, which does not assume equal variances.`,
            `${M.sup(n(s1), 2)}/${n(n1)} = ${n(s1 * s1)}/${n(n1)} = ${n(v1)} and ${M.sup(n(s2), 2)}/${n(n2)} = ${n(s2 * s2)}/${n(n2)} = ${n(v2)}; SE = ${M.sqrt(`${n(v1)} + ${n(v2)}`)} = ${M.sqrt(n(v1 + v2))} = ${n(c)}.`,
            `${V("t")} = ${M.frac(`${n(m1)} − ${n(m2)}`, n(c))} = ${M.frac(n(diff), n(c))} = ${n(t)}.`,
            `(The Welch–Satterthwaite degrees of freedom are ${M.frac(M.sup(`(${n(v1)} + ${n(v2)})`, 2), `${M.sup(n(v1), 2)}/${n(n1 - 1)} + ${M.sup(n(v2), 2)}/${n(n2 - 1)}`)} ≈ ${nd(dfw.value, 1)}, used to look up the ${V("p")}-value.)`,
          ],
          answer: { kind: "number", value: t }, answerText: `${V("t")} = ${n(t)}`, answerInput: String(t),
          vals: { ss1: s1 * s1, ss2: s2 * s2, v1, v2, vs: v1 + v2, c, diff, t, a1: n1 - 1, b1: n2 - 1, dfw: fv(dfw) }, params: { n1, m1, s1, n2, m2, s2 },
        };
      },
    },

    // ---- S.31 z-tests for proportions -----------------------------------------------------------------------------------
    "S.prop-test": {
      title: "Proportion z-tests and A/B tests",
      generate(r, level) {
        const ph = V("p̂");
        if (level === 1) {
          for (;;) {
            const [p, rpq] = r.pick([[5, 5], [2, 4], [1, 3], [8, 4], [9, 3]]), k = r.pick([10, 20, 30, 40, 50]), N = k * k;
            const p0 = Q(p, 10), se = Q(rpq, 10 * k), z = r.pick([-3, -2.5, -2, -1.5, -1, 1, 1.5, 2, 2.5, 3]), phat = p0.add(se.mul(Q(z * 2, 2)));
            if (!terminates(se, 6) || !phat.mul(N).isInt() || phat.value <= 0 || phat.value >= 1) continue;
            const x = phat.mul(N).n;
            return {
              prompt: `A company claims ${n(p * 10)}% of customers prefer its brand. In a random sample of ${P.grouped(N)} customers, ${P.grouped(x)} prefer it. Compute the ${V("z")} statistic for ${sub0}: ${V("p")} = ${dec(p0)}.`,
              steps: [
                `${ph} = ${M.frac(P.grouped(x), P.grouped(N))} = ${dec(phat)}.`,
                `The standard error uses the value claimed by ${sub0}: ${M.sqrt(M.frac(`${M.sub(V("p"), "0")}(1 − ${M.sub(V("p"), "0")})`, V("n")))} = ${M.sqrt(M.frac(`${dec(p0)} × ${dec(Q(1).sub(p0))}`, P.grouped(N)))} = ${M.frac(dec(Q(rpq, 10)), n(k))} = ${dec(se, 6)}.`,
                `${V("z")} = ${M.frac(`${dec(phat)} − ${dec(p0)}`, dec(se, 6))} = ${M.frac(dec(phat.sub(p0), 6), dec(se, 6))} = ${n(z)}.`,
              ],
              answer: { kind: "number", value: z }, answerText: `${V("z")} = ${n(z)}`, answerInput: String(z),
              vals: { phat: fv(phat), q0: fv(Q(1).sub(p0)), r: rpq / 10, k, se: fv(se), diff: fv(phat.sub(p0)), z, pct: p * 10 }, params: { p0: p0.value, N, x },
            };
          }
        }
        // two proportions with a friendly pooled standard error; equal group sizes
        for (;;) {
          const [nn, root2n] = r.pick([[50, Q(1, 5)], [200, Q(1, 10)], [800, Q(1, 20)]]), [p, rpq] = r.pick([[1, 3], [2, 4], [5, 5]]);
          const pool = Q(p, 10), se = Q(rpq, 10).mul(root2n);
          const zs = level === 2 ? [-3, -2.5, -2, -1.5, -1, 1, 1.5, 2, 2.5, 3] : [0.5, 1, 1.5, 2, 2.5, 3];
          const z = r.pick(zs), diff = se.mul(Q(z * 2, 2));
          const tot = pool.mul(2 * nn), dx = diff.mul(nn);
          if (!tot.isInt() || !dx.isInt() || (tot.n + dx.n) % 2) continue;
          const xB = (tot.n + dx.n) / 2, xA = tot.n - xB;
          if (xA <= 0 || xB >= nn) continue;
          const pA = Q(xA, nn), pB = Q(xB, nn);
          const common = [
            `${M.sub(ph, "A")} = ${M.frac(n(xA), n(nn))} = ${dec(pA)} and ${M.sub(ph, "B")} = ${M.frac(n(xB), n(nn))} = ${dec(pB)}.`,
            `Under ${sub0}: ${M.sub(V("p"), "A")} = ${M.sub(V("p"), "B")} both groups share one rate, estimated by pooling: ${ph} = ${M.frac(`${n(xA)} + ${n(xB)}`, `${n(nn)} + ${n(nn)}`)} = ${M.frac(n(tot.n), n(2 * nn))} = ${dec(pool)}.`,
            `SE = ${M.sqrt(`${ph}(1 − ${ph})(${M.frac("1", M.sub(V("n"), "A"))} + ${M.frac("1", M.sub(V("n"), "B"))})`)} = ${M.sqrt(`${dec(pool)} × ${dec(Q(1).sub(pool))} × ${M.frac("2", n(nn))}`)} = ${dec(Q(rpq, 10))} × ${dec(root2n)} = ${dec(se, 6)}.`,
            `${V("z")} = ${M.frac(`${M.sub(ph, "B")} − ${M.sub(ph, "A")}`, "SE")} = ${M.frac(`${dec(pB)} − ${dec(pA)}`, dec(se, 6))} = ${M.frac(dec(diff, 6), dec(se, 6))} = ${n(z)}.`,
          ];
          const vals = { tot: tot.n, nn2: 2 * nn, pA: fv(pA), pB: fv(pB), pool: fv(pool), q: fv(Q(1).sub(pool)), r: rpq / 10, root: fv(root2n), se: fv(se), diff: fv(diff), z };
          if (level === 2) {
            return {
              prompt: `An A/B test sends ${n(nn)} visitors to page A and ${n(nn)} to page B. ${n(xA)} visitors convert on A and ${n(xB)} on B. Compute the pooled two-proportion ${V("z")} statistic (B minus A).`,
              steps: common, answer: { kind: "number", value: z }, answerText: `${V("z")} = ${n(z)}`, answerInput: String(z),
              vals, params: { nn, xA, xB },
            };
          }
          const lift = pB.sub(pA).div(pA), sig = Math.abs(z) > 1.96, idx = sig ? 0 : 1;
          const options = ["Significant at the 5% level", "Not significant at the 5% level"];
          return {
            prompt: `An A/B test sends ${n(nn)} visitors to the current checkout (A) and ${n(nn)} to a redesign (B). ${n(xA)} visitors buy on A and ${n(xB)} on B. Is the difference significant in a two-sided pooled ${V("z")}-test at α = 0.05?`,
            steps: [...common.slice(0, 1),
              `Relative lift: ${M.frac(`${dec(pB)} − ${dec(pA)}`, dec(pA))} ${eqs(lift)} ${dec(lift)}, i.e. about ${n(Math.round(lift.value * 100))}%.`,
              ...common.slice(1),
              sig ? `|${V("z")}| = ${n(z)} &gt; 1.96, the two-sided critical value at α = 0.05: significant.` : `|${V("z")}| = ${n(z)} &lt; 1.96, the two-sided critical value at α = 0.05: not significant, despite the ${n(Math.round(lift.value * 100))}% lift; with this many visitors the gap is within chance variation.`],
            answer: { kind: "choice", options, index: idx }, answerText: options[idx],
            vals: Object.assign(vals, { lift: fv(lift), liftPct: Math.round(lift.value * 100) }), params: { nn, xA, xB }, consts: [1.96, 0.05, 5],
          };
        }
      },
    },

    // ---- S.32 Chi-square tests ---------------------------------------------------------------------------------------------
    "S.17": {
      title: "Chi-square tests",
      generate(r, level) {
        const chi = M.sup("χ", 2);
        if (level === 1) {
          for (;;) {
            const E = r.pick([10, 20]), d = Array.from({ length: 5 }, () => r.int(-6, 6));
            d.push(-sum(d));
            if (Math.abs(d[5]) > 8 || d.every((x) => x === 0)) continue;
            const O = d.map((x) => E + x), sq = d.map((x) => x * x), SS = sum(sq), stat = Q(SS, E);
            return {
              prompt: `A die is rolled ${n(6 * E)} times. The faces 1 to 6 come up ${list(O)} times. Compute the ${chi} goodness-of-fit statistic for the hypothesis that the die is fair.`,
              steps: [
                `If the die is fair, each face is expected ${M.frac(n(6 * E), "6")} = ${n(E)} times.`,
                `${chi} = Σ ${M.frac(M.sup(`(${V("O")} − ${V("E")})`, 2), V("E"))}. Differences ${V("O")} − ${V("E")}: ${list(d)}; squared: ${list(sq)}, adding to ${n(SS)}.`,
                `All expected counts are equal, so ${chi} = ${M.frac(n(SS), n(E))} = ${dec(stat)}, with 6 − 1 = 5 degrees of freedom.`,
              ],
              answer: { kind: "number", value: stat.value }, answerText: dec(stat), answerInput: typed(stat.value),
              vals: { E, N: 6 * E, d, sq, SS, stat: fv(stat) }, params: { O }, consts: [5, 6],
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const cells = [[r.int(10, 60), r.int(10, 60), r.int(10, 60)], [r.int(10, 60), r.int(10, 60), r.int(10, 60)]];
            const R = cells.map((row) => sum(row)), Cc = [0, 1, 2].map((j) => cells[0][j] + cells[1][j]), N = R[0] + R[1];
            const i = r.int(0, 1), j = r.int(0, 2), E = (R[i] * Cc[j]) / N;
            if (!Number.isInteger(E)) continue;
            const rows = ["Under 30", "30 and over"], cols = ["Video", "Podcast", "Text"];
            return {
              prompt: `A survey records age group and favorite news format: ${M.table(["", ...cols, "Total"], [...rows.map((rw, k) => [rw, ...cells[k].map(n), n(R[k])]), ["Total", ...Cc.map(n), n(N)]])} Under independence, what is the expected count for the cell (${rows[i]}, ${cols[j]})?`,
              steps: [
                `If age and format are independent, ${pr("row and column")} = ${pr("row")} ${pr("column")}, so ${V("E")} = ${V("N")} × ${M.frac("row total", V("N"))} × ${M.frac("column total", V("N"))} = ${M.frac("(row total)(column total)", "grand total")}.`,
                `${V("E")} = ${M.frac(`${n(R[i])} × ${n(Cc[j])}`, n(N))} = ${M.frac(P.grouped(R[i] * Cc[j]), n(N))} = ${n(E)}.`,
                `The observed count is ${n(cells[i][j])}, ${cells[i][j] === E ? "exactly as expected" : `${n(Math.abs(cells[i][j] - E))} ${cells[i][j] > E ? "more" : "fewer"} than expected`}.`,
              ],
              answer: { kind: "number", value: E }, answerText: n(E), answerInput: String(E),
              vals: { R, C: Cc, N, prod: R[i] * Cc[j], E, gap: Math.abs(cells[i][j] - E) }, params: { cells, i, j }, consts: [30],
            };
          }
        }
        for (;;) {
          const N = r.pick([100, 200]), R1 = 10 * r.int(3, N / 10 - 3), C1 = 10 * r.int(3, N / 10 - 3);
          const E = [[(R1 * C1) / N, (R1 * (N - C1)) / N], [((N - R1) * C1) / N, ((N - R1) * (N - C1)) / N]];
          if (!E.flat().every(Number.isInteger) || Math.min(...E.flat()) < 5) continue;
          const dd = r.nonzero(-9, 9), O = [[E[0][0] + dd, E[0][1] - dd], [E[1][0] - dd, E[1][1] + dd]];
          if (Math.min(...O.flat()) < 1) continue;
          const terms = E.flat().map((e) => Q(dd * dd, e)), stat = fsum(terms), sig = stat.value > 3.841;
          return {
            prompt: `A clinic tests whether a reminder text affects attendance: ${M.table(["", "Attended", "Missed", "Total"], [["Text", n(O[0][0]), n(O[0][1]), n(R1)], ["No text", n(O[1][0]), n(O[1][1]), n(N - R1)], ["Total", n(C1), n(N - C1), n(N)]])} Compute the ${chi} statistic for independence. Round to 2 decimal places.`,
            steps: [
              `Expected counts, (row total)(column total)/${n(N)}: ${E.flat().map(n).join(", ")} (Text–Attended, Text–Missed, No text–Attended, No text–Missed).`,
              `Every observed count differs from its expected count by ${n(Math.abs(dd))} (in a 2 × 2 table the differences must balance), so each (${V("O")} − ${V("E")})² = ${n(dd * dd)}.`,
              `${chi} = ${E.flat().map((e) => M.frac(n(dd * dd), n(e))).join(" + ")} = ${terms.map((t) => dec(t)).join(" + ")} ${eqs(stat)} ${dec(stat)}${terminates(stat, 2) ? "" : ` ${eqr(stat, 2)}`}.`,
              `With (2 − 1)(2 − 1) = 1 degree of freedom the 5% critical value is 3.841: ${sig ? `${rq(stat, 2)} &gt; 3.841, so the reminder and attendance are associated.` : `${rq(stat, 2)} &lt; 3.841, so there is no significant association.`}`,
            ],
            answer: { kind: "number", value: stat.value, dp: 2 }, answerText: `${chi} ${eqr(stat, 2)}`, answerInput: rq(stat, 2),
            vals: { E: E.flat(), add: Math.abs(dd), d2: dd * dd, terms: terms.map(fv), stat: fv(stat), R2: N - R1, C2: N - C1 }, params: { O: O.flat(), N, R1, C1 }, consts: [3.841, 5],
          };
        }
      },
    },

    // ---- S.33 One-way ANOVA --------------------------------------------------------------------------------------------------
    "S.anova": {
      title: "One-way ANOVA and the F statistic",
      generate(r, level) {
        const ss = (s) => M.sub("SS", s), ms = (s) => M.sub("MS", s);
        if (level === 1) {
          const k = r.int(3, 5), N = k * r.int(4, 8), d1 = k - 1, d2 = N - k, msb = r.int(4, 40), msw = r.int(2, 12), SSB = msb * d1, SSW = msw * d2, F = Q(msb, msw);
          return {
            prompt: `A one-way ANOVA with ${n(k)} groups and ${n(N)} observations in total gives ${ss("B")} = ${n(SSB)} and ${ss("W")} = ${n(SSW)}. Compute the ${V("F")} statistic.${rnd(F, 2)}`,
            steps: [
              `Degrees of freedom: between ${V("k")} − 1 = ${n(d1)}, within ${V("N")} − ${V("k")} = ${n(N)} − ${n(k)} = ${n(d2)}.`,
              `Mean squares: ${ms("B")} = ${M.frac(n(SSB), n(d1))} = ${n(msb)} and ${ms("W")} = ${M.frac(n(SSW), n(d2))} = ${n(msw)}.`,
              `${V("F")} = ${M.frac(ms("B"), ms("W"))} = ${fc(msb, msw, F, 2)}, on (${n(d1)}, ${n(d2)}) degrees of freedom.`,
            ],
            ...pAns(F, 2), vals: { d1, d2, msb, msw, F: fv(F) }, params: { k, N, SSB, SSW },
          };
        }
        if (level === 2) {
          const k = r.int(3, 5), N = k * r.int(4, 8), d1 = k - 1, d2 = N - k, msb = r.int(4, 40), msw = r.int(2, 12), SSB = msb * d1, SSW = msw * d2, SST = SSB + SSW;
          if (r.chance(0.5)) {
            const F = Q(msb, msw);
            return {
              prompt: `In a one-way ANOVA of ${n(k)} diets with ${n(N)} subjects, the total sum of squares is ${ss("T")} = ${n(SST)} and the between-groups sum of squares is ${ss("B")} = ${n(SSB)}. Compute the ${V("F")} statistic.${rnd(F, 2)}`,
              steps: [
                `The total splits into between and within: ${ss("W")} = ${ss("T")} − ${ss("B")} = ${n(SST)} − ${n(SSB)} = ${n(SSW)}.`,
                `${ms("B")} = ${M.frac(n(SSB), `${n(k)} − 1`)} = ${n(msb)}; ${ms("W")} = ${M.frac(n(SSW), `${n(N)} − ${n(k)}`)} = ${n(msw)}.`,
                `${V("F")} = ${fc(msb, msw, F, 2)}.`,
              ],
              ...pAns(F, 2), vals: { SSW, msb, msw, F: fv(F) }, params: { kind: 0, k, N, SST, SSB },
            };
          }
          const eta = Q(SSB, SST);
          return {
            prompt: `A one-way ANOVA of ${n(k)} fertilizers gives ${ss("B")} = ${n(SSB)} and ${ss("W")} = ${n(SSW)}. What share of the total variation in yield is explained by the fertilizer (η²)?${rnd(eta)}`,
            steps: [
              `${ss("T")} = ${ss("B")} + ${ss("W")} = ${n(SSB)} + ${n(SSW)} = ${n(SST)}.`,
              `η² = ${M.frac(ss("B"), ss("T"))} = ${fc(SSB, SST, eta)}: about ${n(Math.round(eta.value * 100))}% of the variation is between groups.`,
            ],
            ...pAns(eta), vals: { SST, eta: fv(eta), pct: Math.round(eta.value * 100) }, params: { kind: 1, k, SSB, SSW },
          };
        }
        for (;;) {
          const g = r.int(10, 20), offs = [r.int(-4, 4), r.int(-4, 4)];
          offs.push(-offs[0] - offs[1]);
          if (offs.every((o) => o === 0) || Math.abs(offs[2]) > 6) continue;
          const means = offs.map((o) => g + o), groups = means.map((m) => {
            const a = r.int(-3, 3), b = r.int(-3, 3), c = -a - b;
            return [m + a, m + b, m + c];
          });
          const SSB = 3 * sum(offs.map((o) => o * o)), devs = groups.map((gr, j) => gr.map((v) => v - means[j])), SSW = sum(devs.flat().map((v) => v * v));
          if (SSW === 0) continue;
          const msb = Q(SSB, 2), msw = Q(SSW, 6), F = msb.div(msw);
          return {
            prompt: `Three study methods were each tried by 3 students; test scores: ${M.table(["Method A", "Method B", "Method C"], [0, 1, 2].map((i) => groups.map((gr) => n(gr[i]))))} Compute the one-way ANOVA ${V("F")} statistic. Round to 2 decimal places.`,
            steps: [
              `Group means: ${means.map(n).join(", ")}. Grand mean (equal group sizes): ${M.frac(means.map(n).join(" + "), "3")} = ${n(g)}.`,
              `${ss("B")} = Σ ${M.sub(V("n"), V("j"))}${M.sup(`(${M.sub(V("ȳ"), V("j"))} − ${V("ȳ")})`, 2)} = 3(${offs.map((o) => M.sup(np(o), 2)).join(" + ")}) = ${n(SSB)}.`,
              `${ss("W")}: deviations from each group mean are ${devs.map((dv) => `(${list(dv)})`).join(", ")}; their squares add to ${n(SSW)}.`,
              `${ms("B")} = ${M.frac(n(SSB), "3 − 1")} = ${dec(msb)}; ${ms("W")} = ${M.frac(n(SSW), "9 − 3")} = ${fd(msw)}.`,
              `${V("F")} = ${M.frac(ms("B"), ms("W"))} = ${M.f(msb)} ÷ ${M.f(msw)} = ${M.f(F)}${F.isInt() ? "" : ` ${eqr(F, 2)}`}, on (2, 6) degrees of freedom.`,
            ],
            answer: { kind: "number", value: F.value, dp: 2 }, answerText: `${V("F")} ${eqr(F, 2)}`, answerInput: rq(F, 2),
            vals: { means, g, offs, SSB, devs: devs.flat(), SSW, msb: fv(msb), msw: fv(msw), F: fv(F) }, params: { groups: groups.flat() }, consts: [3, 6, 9],
          };
        }
      },
    },

    // ---- S.34 Nonparametric rank tests ---------------------------------------------------------------------------------------
    "S.nonparam": {
      title: "Rank tests: Mann–Whitney, Wilcoxon and sign test",
      generate(r, level) {
        if (level === 1) {
          const pool = r.sample(Array.from({ length: 30 }, (_, i) => i + 1), 7), g1 = sorted(pool.slice(0, 3)), g2 = sorted(pool.slice(3));
          const all = sorted(pool), rank = (v) => all.indexOf(v) + 1, ranks1 = g1.map(rank), R1 = sum(ranks1), U1 = R1 - 6;
          return {
            prompt: `Reaction times (ms, rounded) for two small groups: group 1: ${list(g1)}; group 2: ${list(g2)}. Compute the Mann–Whitney statistic ${M.sub(V("U"), "1")} = ${M.sub(V("R"), "1")} − ${M.frac(`${M.sub(V("n"), "1")}(${M.sub(V("n"), "1")} + 1)`, "2")}.`,
            steps: [
              `Pool and sort all ${n(7)} values, ranking from 1: ${all.map((v) => `${n(v)}${g1.includes(v) ? "*" : ""}`).join(", ")} (group 1 starred).`,
              `Group 1's ranks are ${list(ranks1)}, so ${M.sub(V("R"), "1")} = ${ranks1.map(n).join(" + ")} = ${n(R1)}.`,
              `${M.sub(V("U"), "1")} = ${n(R1)} − ${M.frac("3 × 4", "2")} = ${n(R1)} − 6 = ${n(U1)}: in ${n(U1)} of the 3 × 4 = 12 pairs, the group-1 value is the larger one.`,
            ],
            answer: { kind: "number", value: U1 }, answerText: `${M.sub(V("U"), "1")} = ${n(U1)}`, answerInput: String(U1),
            vals: { ranks1, R1, U1, N: 7 }, params: { g1, g2 }, consts: [3, 4, 6, 12],
          };
        }
        if (level === 2) {
          for (;;) {
            const mags = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], 6), d = mags.map((m) => m * (r.chance(0.65) ? 1 : -1));
            if (d.every((x) => x > 0) || d.every((x) => x < 0)) continue;
            const byAbs = sorted(mags), rank = (v) => byAbs.indexOf(Math.abs(v)) + 1, pos = d.filter((x) => x > 0), posRanks = pos.map(rank), W = sum(posRanks);
            return {
              prompt: `Six runners' times improved (positive) or worsened (negative) after a training plan, in seconds: ${M.eq(list(d))} Compute the Wilcoxon signed-rank statistic ${M.sup(V("W"), "+")}.`,
              steps: [
                `Rank the absolute differences from smallest to largest: ${byAbs.map((v, i) => `${n(v)} → ${n(i + 1)}`).join(", ")}.`,
                `The positive differences are ${list(pos)}, with ranks ${list(posRanks)}.`,
                `${M.sup(V("W"), "+")} = ${posRanks.map(n).join(" + ")} = ${n(W)}. If the plan had no effect we would expect about ${M.frac("6 × 7", "4")} = 10.5.`,
              ],
              answer: { kind: "number", value: W }, answerText: `${M.sup(V("W"), "+")} = ${n(W)}`, answerInput: String(W),
              vals: { byAbs, ranks: byAbs.map((_, i) => i + 1), posRanks, W }, params: { d }, consts: [6, 7, 4, 10.5],
            };
          }
        }
        for (;;) {
          const N = r.int(8, 10), S = r.int(Math.ceil(N / 2) + 1, N);
          const d = r.shuffle([...Array.from({ length: S }, () => r.int(1, 9)), ...Array.from({ length: N - S }, () => -r.int(1, 9))]);
          const tot = 2 ** N, terms = [];
          for (let j = S; j <= N; j++) terms.push(C(N, j));
          const cnt = sum(terms), p = Q(cnt, tot), rej = p.value < 0.05;
          return {
            prompt: `A taste panel of ${n(N)} people rates a new recipe against the old one; the differences (new − old) are ${M.eq(list(d))} Use the sign test to find the one-sided ${V("p")}-value for “the new recipe is preferred”.${rnd(p)}`,
            steps: [
              `Count the positive differences: ${V("S")} = ${n(S)} of ${n(N)}. Under ${sub0}, each sign is a fair coin, so ${V("S")} ~ Binomial(${n(N)}, ${M.frac("1", "2")}).`,
              `${V("p")} = ${pr(`${V("S")} ≥ ${n(S)}`)} = ${M.frac(terms.map((_, i) => `C(${n(N)}, ${n(S + i)})`).join(" + "), M.sup("2", n(N)))} = ${M.frac(terms.map(n).join(" + "), n(tot))} = ${fc(cnt, tot, p)}.`,
              `${rej ? `${dec(p)} &lt; 0.05: the panel significantly prefers the new recipe.` : `${dec(p)} ≥ 0.05: not significant at the 5% level.`}`,
            ],
            ...pAns(p), vals: { S, terms, ks: terms.map((_, i) => S + i), tot, cnt, p: fv(p) }, params: { d }, consts: [0.05, 5],
          };
        }
      },
    },

    // ---- S.35 Multiple testing -------------------------------------------------------------------------------------------------
    "S.multiple": {
      title: "Multiple testing corrections",
      generate(r, level) {
        const alpha = 0.05;
        const pv = (lo, hi) => r.int(lo, hi) / 1000;
        if (level === 1) {
          if (r.chance(0.5)) {
            for (;;) {
              const m = r.pick([4, 5, 10]), th = alpha / m, ps = Array.from({ length: m }, () => r.pick([pv(1, 15), pv(1, 60), pv(20, 400)]));
              if (ps.some((p) => Math.abs(p - th) < 1e-9)) continue;
              const rejected = ps.filter((p) => p <= th), naive = ps.filter((p) => p <= alpha).length;
              if (!rejected.length && r.chance(0.7)) continue;
              return {
                prompt: `A team runs ${n(m)} independent tests and gets ${V("p")}-values ${list(ps)}. With a Bonferroni correction at family-wise α = 0.05, how many hypotheses are rejected?`,
                steps: [
                  `Bonferroni compares each ${V("p")}-value with ${M.frac("α", V("m"))} = ${M.frac("0.05", n(m))} = ${n(th)}.`,
                  rejected.length ? `Only ${list(rejected)} ${rejected.length === 1 ? "is" : "are"} at most ${n(th)}.` : `None is at most ${n(th)}.`,
                  `${n(rejected.length)} rejected (without the correction, ${n(naive)} would pass 0.05).`,
                ],
                answer: { kind: "number", value: rejected.length }, answerText: n(rejected.length), answerInput: String(rejected.length),
                vals: { m, th, k: rejected.length, naive }, params: { kind: 0, ps }, consts: [0.05],
              };
            }
          }
          const m = r.int(2, 5), keep = Math.pow(0.95, m), ans = 1 - keep;
          return {
            prompt: `${n(m)} independent hypothesis tests are run at α = 0.05 each, and every ${sub0} is true. What is the probability of at least one false positive (the family-wise error rate)? Round to four decimal places.`,
            steps: [
              `Each test avoids a false positive with probability 1 − 0.05 = 0.95; independent tests multiply.`,
              `${pr("no false positives")} = ${M.sup("0.95", n(m))} ${approx(keep, 6)} ${nd(keep, 6)}.`,
              `FWER = 1 − ${nd(keep, 6)} ${approx(ans, 4)} ${nd(ans, 4)}, about ${n(Math.round((ans / 0.05) * 100) / 100)} times the single-test rate.`,
            ],
            answer: { kind: "number", value: ans, dp: 4 }, answerText: nd(ans, 4), answerInput: fmt(ans, 4),
            vals: { keep, ans, ratio: Math.round((ans / 0.05) * 100) / 100 }, params: { kind: 1, m }, consts: [0.05, 0.95],
          };
        }
        const m = level === 2 ? r.pick([4, 5]) : r.pick([5, 6, 8]);
        for (;;) {
          const ps = sorted(Array.from({ length: m }, () => r.pick([pv(1, 12), pv(5, 30), pv(10, 60), pv(30, 300)])));
          if (new Set(ps).size < m) continue;
          if (level === 2) {
            const th = ps.map((_, i) => alpha / (m - i));
            if (ps.some((p, i) => Math.abs(p - th[i]) < 1e-9)) continue;
            let k = 0;
            while (k < m && ps[k] <= th[k]) k++;
            const bonf = ps.filter((p) => p <= alpha / m).length;
            if (k === 0 || k === m) continue;
            const lines = ps.slice(0, k + 1).map((p, i) => `${n(p)} vs ${M.frac("0.05", n(m - i))} ${approx(th[i], 4)} ${nd(th[i], 4)}: ${p <= th[i] ? "reject" : "stop"}`);
            return {
              prompt: `Sorted ${V("p")}-values from ${n(m)} tests: ${list(ps)}. Apply Holm's step-down procedure at family-wise α = 0.05. How many hypotheses are rejected?`,
              steps: [
                `Holm compares the ${V("i")}th smallest ${V("p")}-value with ${M.frac("α", `${V("m")} − ${V("i")} + 1`)} and stops at the first failure.`,
                `${lines.join("; ")}.`,
                `${n(k)} rejected. (Plain Bonferroni, with every threshold ${M.frac("0.05", n(m))}, rejects ${n(bonf)}.)`,
              ],
              answer: { kind: "number", value: k }, answerText: n(k), answerInput: String(k),
              vals: { th, dens: ps.map((_, i) => m - i), k, bonf }, params: { ps }, consts: [0.05],
            };
          }
          const th = ps.map((_, i) => ((i + 1) / m) * alpha);
          if (ps.some((p, i) => Math.abs(p - th[i]) < 1e-9)) continue;
          let k = 0;
          ps.forEach((p, i) => { if (p <= th[i]) k = i + 1; });
          if (k === 0 || k === m) continue;
          const gap = ps.slice(0, k).some((p, i) => p > th[i]);
          if (!gap && r.chance(0.5)) continue;
          return {
            prompt: `Sorted ${V("p")}-values from ${n(m)} tests: ${list(ps)}. Apply the Benjamini–Hochberg procedure with false discovery rate ${V("q")} = 0.05. How many hypotheses are rejected?`,
            steps: [
              `Compare each ${M.sub(V("p"), `(${V("i")})`)} with ${M.frac(V("i"), V("m"))}${V("q")} = ${M.frac(V("i"), n(m))} × 0.05.`,
              `${ps.map((p, i) => `${n(p)} vs ${nd(th[i], 5)}: ${p <= th[i] ? "≤" : "&gt;"}`).join("; ")}.`,
              `The largest ${V("i")} that passes is ${n(k)}, so reject the ${n(k)} smallest${gap ? " (including any earlier ones that missed their own threshold: BH steps up from the largest pass)" : ""}.`,
            ],
            answer: { kind: "number", value: k }, answerText: n(k), answerInput: String(k),
            vals: { th, k, idx: ps.map((_, i) => i + 1) }, params: { ps }, consts: [0.05],
          };
        }
      },
    },

    // ---- S.36 Bootstrap & permutation tests ------------------------------------------------------------------------------------
    "S.bootstrap": {
      title: "Bootstrap and permutation tests",
      generate(r, level) {
        if (level === 1) {
          const B = r.pick([999, 1999, 4999, 9999]), c = r.int(0, Math.floor((B + 1) / 10)), p = Q(1 + c, B + 1), rej = p.value < 0.05;
          return {
            prompt: `A permutation test shuffles the group labels ${P.grouped(B)} times. In ${P.grouped(c)} of the shuffles the difference in means is at least as extreme as the observed one. What is the permutation ${V("p")}-value?${rnd(p)}`,
            steps: [
              `Count the observed arrangement as one of the possibilities: ${V("p")} = ${M.frac(`1 + #{extreme shuffles}`, `${V("B")} + 1`)}. This also keeps ${V("p")} above 0.`,
              `${V("p")} = ${M.frac(`1 + ${P.grouped(c)}`, `${P.grouped(B)} + 1`)} = ${M.frac(P.grouped(1 + c), P.grouped(B + 1))} = ${fd(p)}.`,
              rej ? `${dec(p)} &lt; 0.05: the observed difference is unusual under random labeling.` : `${dec(p)} ≥ 0.05: a difference this large often arises by chance.`,
            ],
            ...pAns(p), vals: { c1: 1 + c, B1: B + 1, p: fv(p) }, params: { B, c }, consts: [0.05],
          };
        }
        if (level === 2) {
          const N = r.int(2, 6), q = Q(N - 1, N), ans = q.pow(N);
          return {
            prompt: `A bootstrap resample draws ${n(N)} values with replacement from a data set of ${n(N)} distinct values. What is the probability that one particular value is left out of the resample?${rnd(ans)}`,
            steps: [
              `Each draw misses that value with probability 1 − ${M.frac("1", n(N))} = ${M.f(q)}, and the ${n(N)} draws are independent.`,
              `${pr("left out")} = ${M.sup(`(${M.f(q)})`, n(N))} = ${fd(ans)}.`,
              `As ${V("n")} grows, ${M.sup(`(1 − 1/${V("n")})`, V("n"))} → ${M.sup(V("e"), "−1")} ≈ 0.368: about 37% of points are “out of bag” in each resample.`,
            ],
            ...pAns(ans), vals: { q: fv(q), ans: fv(ans) }, params: { N }, consts: [0.368, 37],
          };
        }
        for (;;) {
          const base = r.int(20, 60), dv = Array.from({ length: 4 }, () => r.int(-6, 6));
          dv.push(-sum(dv));
          if (Math.abs(dv[4]) > 8) continue;
          const SS = sum(dv.map((x) => x * x));
          if (SS === 0 || SS % 4 || !isSq(SS / 4)) continue;
          const means = dv.map((x) => base + x), v = SS / 4, se = Math.round(Math.sqrt(v));
          return {
            prompt: `A toy bootstrap run with only ${V("B")} = 5 resamples gives these resampled means: ${M.eq(list(means))} Estimate the standard error of the mean as the standard deviation of the bootstrap means (divide by ${V("B")} − 1).`,
            steps: [
              `Average of the bootstrap means: ${M.frac(means.map(n).join(" + "), "5")} = ${n(base)}.`,
              `Deviations: ${list(dv)}; squares: ${list(dv.map((x) => x * x))}, adding to ${n(SS)}.`,
              `${M.sup("SE", "*")} = ${M.sqrt(M.frac(n(SS), "5 − 1"))} = ${M.sqrt(n(v))} = ${n(se)}. (Real analyses use thousands of resamples.)`,
            ],
            answer: { kind: "number", value: se }, answerText: n(se), answerInput: String(se),
            vals: { base, dv, sq: dv.map((x) => x * x), SS, v, se }, params: { means }, consts: [5, 4],
          };
        }
      },
    },

    // ---- S.37 Bayesian inference ------------------------------------------------------------------------------------------------
    "S.bayes-inference": {
      title: "Conjugate Bayesian updates",
      generate(r, level) {
        const beta = (a, b) => `Beta(${n(a)}, ${n(b)})`;
        const a = r.int(1, 5), b = r.int(1, 5), N = r.int(5, 30), k = r.int(0, N), a2 = a + k, b2 = b + N - k;
        if (level === 1) {
          return {
            prompt: `A website's click rate θ has prior ${beta(a, b)}. Then ${n(k)} of ${n(N)} visitors click. What is the posterior distribution? Enter its two parameters, separated by a comma.`,
            steps: [
              `The Beta prior is conjugate to the binomial: successes add to the first parameter, failures to the second.`,
              `Failures: ${n(N)} − ${n(k)} = ${n(N - k)}.`,
              `Posterior: Beta(${n(a)} + ${n(k)}, ${n(b)} + ${n(N - k)}) = ${beta(a2, b2)}.`,
            ],
            answer: { kind: "numbers", values: [a2, b2], ordered: true }, answerText: beta(a2, b2), answerInput: `${a2}, ${b2}`,
            vals: { f: N - k, a2, b2 }, params: { a, b, N, k },
          };
        }
        if (level === 2) {
          const pm = Q(a2, a2 + b2), mle = Q(k, N);
          return {
            prompt: `A drug's response rate θ has prior ${beta(a, b)}. In a trial, ${n(k)} of ${n(N)} patients respond. What is the posterior mean of θ?${rnd(pm)}`,
            steps: [
              `Posterior: Beta(${n(a)} + ${n(k)}, ${n(b)} + ${n(N - k)}) = ${beta(a2, b2)}.`,
              `The mean of Beta(α, β) is ${M.frac("α", "α + β")}: ${M.frac(n(a2), `${n(a2)} + ${n(b2)}`)} = ${fc(a2, a2 + b2, pm)}.`,
              `Compare the sample rate ${fc(k, N, mle)}: the prior pulls the estimate toward its own mean ${M.frac(n(a), n(a + b))}, as if it were ${n(a + b)} extra patients.`,
            ],
            ...pAns(pm), vals: { f: N - k, a2, b2, s2: a2 + b2, pm: fv(pm), mle: fv(mle), ab: a + b }, params: { a, b, N, k },
          };
        }
        if (r.chance(0.5)) {
          const map = Q(a2 - 1, a2 + b2 - 2);
          if (a2 + b2 - 2 <= 0 || a2 < 2 || b2 < 2) return this.generate(r, level);
          return {
            prompt: `A defect rate θ has prior ${beta(a, b)}; then ${n(k)} defects are found in ${n(N)} items. What is the MAP estimate (the posterior mode) of θ?${rnd(map)}`,
            steps: [
              `Posterior: ${beta(a2, b2)}.`,
              `For α, β &gt; 1 the mode of Beta(α, β) is ${M.frac("α − 1", "α + β − 2")}.`,
              `MAP = ${M.frac(`${n(a2)} − 1`, `${n(a2)} + ${n(b2)} − 2`)} = ${fc(a2 - 1, a2 + b2 - 2, map)}.`,
            ],
            ...pAns(map), vals: { a2, b2, top: a2 - 1, bot: a2 + b2 - 2, map: fv(map) }, params: { kind: 1, a, b, N, k },
          };
        }
        const tau2 = r.pick([4, 9, 16, 25]), s2 = r.pick([16, 25, 36, 64, 100]), Nn = r.int(2, 10), mu0 = r.int(50, 80), xb = mu0 + r.nonzero(-12, 12);
        const w0 = Q(1, tau2), w1 = Q(Nn, s2), num = w0.mul(mu0).add(w1.mul(xb)), den = w0.add(w1), post = num.div(den);
        return {
          prompt: `A sensor's true offset μ has a normal prior with mean ${n(mu0)} and variance τ² = ${n(tau2)}. Readings have known noise variance σ² = ${n(s2)}. After ${n(Nn)} readings with mean ${xbar} = ${n(xb)}, what is the posterior mean of μ?${rnd(post, 2)}`,
          steps: [
            `Normal–normal update: the posterior mean is a precision-weighted average, ${M.frac(`${M.sub("μ", "0")}/τ² + ${V("n")}${xbar}/σ²`, `1/τ² + ${V("n")}/σ²`)}.`,
            `Prior precision 1/τ² = ${M.f(w0)}; data precision ${V("n")}/σ² = ${M.frac(n(Nn), n(s2))}${w1.d !== s2 ? ` = ${M.f(w1)}` : ""}.`,
            `Numerator: ${M.f(w0)} × ${n(mu0)} + ${M.f(w1)} × ${n(xb)} = ${M.f(num)}. Denominator: ${M.f(w0)} + ${M.f(w1)} = ${M.f(den)}.`,
            `Posterior mean = ${M.f(num)} ÷ ${M.f(den)} = ${fd(post, 2)}, between the prior mean ${n(mu0)} and the data mean ${n(xb)}, closer to whichever is more precise.`,
          ],
          ...pAns(post, 2), vals: { w0: fv(w0), w1: fv(w1), num: fv(num), den: fv(den), post: fv(post) }, params: { kind: 0, mu0, tau2, s2, Nn, xb },
        };
      },
    },

    // ---- S.38 Covariance & correlation -----------------------------------------------------------------------------------------
    "S.18": {
      title: "Covariance and correlation",
      generate(r, level) {
        const pairTable = (xs, ys, dx, dy, mx, my) => M.table([V("x"), V("y"), `${V("x")} − ${mx}`, `${V("y")} − ${my}`, "product"],
          xs.map((x, i) => [n(x), n(ys[i]), n(dx[i]), n(dy[i]), n(dx[i] * dy[i])]));
        if (level === 1) {
          for (;;) {
            const N = r.pick([4, 5]), xs = Array.from({ length: N }, () => r.int(1, 12)), ys = Array.from({ length: N }, () => r.int(1, 20));
            if (sum(xs) % N || sum(ys) % N) continue;
            const mx = sum(xs) / N, my = sum(ys) / N, dx = xs.map((x) => x - mx), dy = ys.map((y) => y - my), prods = dx.map((d, i) => d * dy[i]), Sxy = sum(prods);
            if (Sxy === 0) continue;
            const cov = Q(Sxy, N - 1);
            return {
              prompt: `Hours of practice ${V("x")} and points scored ${V("y")} for ${n(N)} players: ${M.table([V("x"), ...xs.map(n)], [[V("y"), ...ys.map(n)]])} Compute the sample covariance.${rnd(cov)}`,
              graph: scatter(xs, ys),
              steps: [
                `Means: ${xbar} = ${M.frac(n(sum(xs)), n(N))} = ${n(mx)} and ${V("ȳ")} = ${M.frac(n(sum(ys)), n(N))} = ${n(my)}.`,
                `Deviations and their products: ${pairTable(xs, ys, dx, dy, xbar, V("ȳ"))}`,
                `Sum of products: ${plus(prods)} = ${n(Sxy)}.`,
                `Cov(${V("x")}, ${V("y")}) = ${M.frac(n(Sxy), `${n(N)} − 1`)} = ${fd(cov)}. ${Sxy > 0 ? "Positive: more practice goes with more points." : "Negative: more practice goes with fewer points here."}`,
              ],
              ...pAns(cov), vals: { N, sx: sum(xs), sy: sum(ys), mx, my, dx, dy, prods, Sxy, cov: fv(cov) }, params: { xs, ys },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const dx = Array.from({ length: 4 }, () => r.int(-4, 4)), dy = Array.from({ length: 4 }, () => r.int(-5, 5));
            dx.push(-sum(dx)); dy.push(-sum(dy));
            if (Math.abs(dx[4]) > 5 || Math.abs(dy[4]) > 6) continue;
            const Sxx = sum(dx.map((d) => d * d)), Syy = sum(dy.map((d) => d * d)), prods = dx.map((d, i) => d * dy[i]), Sxy = sum(prods);
            if (!Sxx || !Syy || !Sxy || !isSq(Sxx * Syy) || Math.abs(Sxy) === Math.sqrt(Sxx * Syy)) continue;
            const mx = r.int(5, 10), my = r.int(8, 15), xs = dx.map((d) => mx + d), ys = dy.map((d) => my + d), root = Math.sqrt(Sxx * Syy), rr = Q(Sxy, root);
            return {
              prompt: `Five stores' advertising spend ${V("x")} (thousand dollars) and sales ${V("y")} (thousand units): ${M.table([V("x"), ...xs.map(n)], [[V("y"), ...ys.map(n)]])} Compute Pearson's correlation ${V("r")}.${rnd(rr)}`,
              graph: scatter(xs, ys),
              steps: [
                `Means: ${xbar} = ${n(mx)}, ${V("ȳ")} = ${n(my)}. Deviations and products: ${pairTable(xs, ys, dx, dy, xbar, V("ȳ"))}`,
                `${M.sub("S", V("xy"))} = Σ products = ${n(Sxy)}; ${M.sub("S", V("xx"))} = Σ${M.sup(`(${V("x")} − ${xbar})`, 2)} = ${n(Sxx)}; ${M.sub("S", V("yy"))} = Σ${M.sup(`(${V("y")} − ${V("ȳ")})`, 2)} = ${n(Syy)}.`,
                `${V("r")} = ${M.frac(M.sub("S", V("xy")), M.sqrt(`${M.sub("S", V("xx"))}${M.sub("S", V("yy"))}`))} = ${M.frac(n(Sxy), M.sqrt(`${n(Sxx)} × ${n(Syy)}`))} = ${M.frac(n(Sxy), M.sqrt(n(Sxx * Syy)))} = ${fc(Sxy, root, rr)}.`,
                `${Math.abs(rr.value) >= 0.7 ? "A strong" : Math.abs(rr.value) >= 0.4 ? "A moderate" : "A weak"} ${rr.n > 0 ? "positive" : "negative"} linear relationship (the (${V("n")} − 1) factors in the covariance and the SDs cancel).`,
              ],
              ...pAns(rr), vals: { mx, my, dx, dy, prods, Sxy, Sxx, Syy, SS: Sxx * Syy, root, rr: fv(rr) }, params: { xs, ys }, consts: [5],
            };
          }
        }
        if (r.chance(0.5)) {
          for (;;) {
            const N = 5, xs = r.sample(Array.from({ length: 40 }, (_, i) => i + 10), N), ys = r.sample(Array.from({ length: 50 }, (_, i) => i + 20), N);
            const rk = (arr) => arr.map((v) => sorted(arr).indexOf(v) + 1), rx = rk(xs), ry = rk(ys), d = rx.map((v, i) => v - ry[i]), d2 = d.map((v) => v * v), D = sum(d2);
            const rho = Q(1).sub(Q(6 * D, N * (N * N - 1)));
            return {
              prompt: `Two judges score five gymnasts: ${M.table(["Gymnast", "A", "B", "C", "D", "E"], [["Judge 1", ...xs.map(n)], ["Judge 2", ...ys.map(n)]])} Compute Spearman's rank correlation ${M.sub("ρ", V("s"))}.${rnd(rho)}`,
              steps: [
                `Rank each judge's scores from 1 (lowest) to 5: Judge 1 ${list(rx)}; Judge 2 ${list(ry)}.`,
                `Rank differences ${V("d")}: ${list(d)}; squares ${list(d2)}, adding to Σ${M.sup(V("d"), 2)} = ${n(D)}.`,
                `${M.sub("ρ", V("s"))} = 1 − ${M.frac(`6Σ${M.sup(V("d"), 2)}`, `${V("n")}(${M.sup(V("n"), 2)} − 1)`)} = 1 − ${M.frac(`6 × ${n(D)}`, "5 × 24")} = 1 − ${M.frac(n(6 * D), "120")} = ${fd(rho)}.`,
              ],
              ...pAns(rho), vals: { rx, ry, d, d2, D, D6: 6 * D, rho: fv(rho) }, params: { kind: 0, xs, ys }, consts: [5, 6, 24, 120],
            };
          }
        }
        const [rv, s1] = r.pick([[0.6, 0.8], [0.8, 0.6], [0.28, 0.96], [0.96, 0.28]]), k = r.pick([2, 3, 4, 5, 6]), N = k * k + 2, sgn = r.sign(), rr = sgn * rv;
        const t = P.round((rr * k) / s1, 10);
        return {
          prompt: `In a sample of ${n(N)} cities, the correlation between average income and commute length is ${V("r")} = ${n(rr)}. Compute the ${V("t")} statistic for ${sub0}: ρ = 0.${rnd(Q(Math.round(t * 1e6), 1e6), 2)}`,
          steps: [
            `${V("t")} = ${M.frac(`${V("r")}${M.sqrt(`${V("n")} − 2`)}`, M.sqrt(`1 − ${M.sup(V("r"), 2)}`))}, with ${V("n")} − 2 degrees of freedom.`,
            `${M.sqrt(`${n(N)} − 2`)} = ${M.sqrt(n(k * k))} = ${n(k)}; ${M.sqrt(`1 − ${M.sup(np(rr), 2)}`)} = ${M.sqrt(`1 − ${n(rv * rv)}`)} = ${M.sqrt(n(1 - rv * rv))} = ${n(s1)}.`,
            `${V("t")} = ${M.frac(`${n(rr)} × ${n(k)}`, n(s1))} = ${M.frac(n(rr * k), n(s1))} ${approx(t, 4)} ${nd(t, 4)}, on ${n(N - 2)} degrees of freedom.`,
          ],
          answer: Object.assign({ kind: "number", value: t }, Math.abs(t - P.round(t, 4)) < 1e-12 ? {} : { dp: 2 }), answerText: `${V("t")} ${approx(t, 4)} ${nd(t, 4)}`, answerInput: fmt(t, 4),
          vals: { k2: k * k, k, r2: rv * rv, q: 1 - rv * rv, s1, rk: rr * k, t, df: N - 2 }, params: { kind: 1, N, r: rr },
        };
      },
    },

    // ---- S.39 Covariance matrix ------------------------------------------------------------------------------------------------
    "S.cov-matrix": {
      title: "Covariance matrices and portfolio variance",
      generate(r, level) {
        const mat = (S, names) => M.table(["", ...names], S.map((row, i) => [names[i], ...row.map(n)]));
        if (level <= 2) {
          for (;;) {
            const s1 = r.int(2, 9), s2 = r.int(2, 9), v1 = level === 2 ? s1 * s1 : r.int(4, 40), v2 = level === 2 ? s2 * s2 : r.int(4, 40), cv = r.nonzero(-20, 20);
            if (cv * cv >= v1 * v2) continue;
            const S = [[v1, cv], [cv, v2]], names = [V("X"), V("Y")];
            if (level === 1) {
              const minus = r.chance(0.5), ans = v1 + v2 + (minus ? -2 : 2) * cv;
              return {
                prompt: `The covariance matrix of returns ${V("X")} and ${V("Y")} is ${mat(S, names)} Find Var(${V("X")} ${minus ? "−" : "+"} ${V("Y")}).`,
                steps: [
                  `The diagonal holds the variances (Var ${V("X")} = ${n(v1)}, Var ${V("Y")} = ${n(v2)}); the off-diagonal entry is Cov(${V("X")}, ${V("Y")}) = ${n(cv)}.`,
                  `Var(${V("X")} ${minus ? "−" : "+"} ${V("Y")}) = Var ${V("X")} + Var ${V("Y")} ${minus ? "−" : "+"} 2 Cov(${V("X")}, ${V("Y")}).`,
                  `${n(v1)} + ${n(v2)} ${minus ? "−" : "+"} 2 × ${np(cv)} = ${n(v1 + v2)} ${(minus ? -cv : cv) < 0 ? "−" : "+"} ${n(Math.abs(2 * cv))} = ${n(ans)}.`,
                ],
                answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
                vals: { vs: v1 + v2, c2: Math.abs(2 * cv), ans }, params: { v1, v2, cv, minus: minus ? 1 : 0 },
              };
            }
            const rho = Q(cv, s1 * s2);
            return {
              prompt: `Two sensors' readings have covariance matrix ${mat(S, names)} Find their correlation.${rnd(rho)}`,
              steps: [
                `Standard deviations are the square roots of the diagonal: ${M.sqrt(n(v1))} = ${n(s1)} and ${M.sqrt(n(v2))} = ${n(s2)}.`,
                `ρ = ${M.frac(`Cov(${V("X")}, ${V("Y")})`, `${M.sub("σ", V("X"))}${M.sub("σ", V("Y"))}`)} = ${M.frac(n(cv), `${n(s1)} × ${n(s2)}`)} = ${fc(cv, s1 * s2, rho)}.`,
              ],
              ...pAns(rho), vals: { s1, s2, ss: s1 * s2, rho: fv(rho) }, params: { v1, v2, cv },
            };
          }
        }
        for (;;) {
          const B = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => r.int(-2, 2)));
          const S = [0, 1, 2].map((i) => [0, 1, 2].map((j) => sum([0, 1, 2].map((k) => B[i][k] * B[j][k]))));
          if (S.some((row, i) => row[i] === 0)) continue;
          const a = [r.int(1, 3), r.nonzero(-2, 2), r.int(1, 3)];
          const diag = [0, 1, 2].map((i) => a[i] * a[i] * S[i][i]), pairs = [[0, 1], [0, 2], [1, 2]], off = pairs.map(([i, j]) => 2 * a[i] * a[j] * S[i][j]);
          const ans = sum(diag) + sum(off);
          if (ans <= 0) continue;
          const names = ["A", "B", "C"].map(V);
          return {
            prompt: `A portfolio holds ${a.map((w, i) => `${n(w)} unit${Math.abs(w) === 1 ? "" : "s"} of ${names[i]}`).join(", ")} (a negative amount is a short position). The returns have covariance matrix ${mat(S, names)} What is the variance of the portfolio's return, ${M.sup(V("a"), "⊤")}Σ${V("a")}?`,
            steps: [
              `${M.sup(V("a"), "⊤")}Σ${V("a")} = Σ<sub>${V("i")}</sub> ${M.sup(M.sub(V("a"), V("i")), 2)}${M.sub("Σ", V("ii"))} + 2Σ<sub>${V("i")}&lt;${V("j")}</sub> ${M.sub(V("a"), V("i"))}${M.sub(V("a"), V("j"))}${M.sub("Σ", V("ij"))}.`,
              `Variance terms: ${[0, 1, 2].map((i) => `${M.sup(np(a[i]), 2)} × ${n(S[i][i])} = ${n(diag[i])}`).join("; ")}.`,
              `Covariance terms: ${pairs.map(([i, j], q) => `2 × ${np(a[i])} × ${np(a[j])} × ${np(S[i][j])} = ${n(off[q])}`).join("; ")}.`,
              `Total: ${plus([...diag, ...off])} = ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
            vals: { diag, off, ans }, params: { S: S.flat(), a },
          };
        }
      },
    },

    // ---- S.40 Least-squares regression & R² ----------------------------------------------------------------------------------
    "S.19": {
      title: "Least-squares regression and R²",
      generate(r, level) {
        const yh = V("ŷ");
        const line = (b0, b1) => `${yh} = ${dec(b0)} ${b1.n < 0 ? "−" : "+"} ${b1.abs().eq(1) ? "" : dec(b1.abs())}${V("x")}`;
        if (level === 1) {
          const mx = r.int(3, 10), my = r.int(50, 80), b1 = Q(r.nonzero(-8, 12), 2), b0 = Q(my).sub(b1.mul(mx)), x0 = r.int(1, 12), y0 = b0.add(b1.mul(x0));
          return {
            prompt: `For hours studied ${V("x")} and exam score ${V("y")}, a class has ${xbar} = ${n(mx)}, ${V("ȳ")} = ${n(my)}, and least-squares slope ${M.sub(V("b"), "1")} = ${dec(b1)}. Predict the score of a student who studies ${unit(x0, "hour", "hours")}.`,
            steps: [
              `The least-squares line passes through (${xbar}, ${V("ȳ")}), so ${M.sub(V("b"), "0")} = ${V("ȳ")} − ${M.sub(V("b"), "1")}${xbar} = ${n(my)} − ${M.n(b1.value, { paren: true })} × ${n(mx)} = ${n(my)} − ${M.n(b1.mul(mx).value, { paren: true })} = ${dec(b0)}.`,
              `${line(b0, b1)}.`,
              `At ${V("x")} = ${n(x0)}: ${yh} = ${dec(b0)} ${b1.n < 0 ? "−" : "+"} ${dec(b1.abs())} × ${n(x0)} = ${dec(b0)} ${b1.n < 0 ? "−" : "+"} ${dec(b1.abs().mul(x0))} = ${dec(y0)}.`,
            ],
            answer: { kind: "number", value: y0.value }, answerText: dec(y0), answerInput: typed(y0.value),
            vals: { b1x: fv(b1.mul(mx)), b0: fv(b0), b1x0: fv(b1.mul(x0)), y0: fv(y0) }, params: { mx, my, b1: b1.value, x0 },
          };
        }
        for (;;) {
          const xs = [1, 2, 3, 4, 5], ys = xs.map(() => r.int(2, 20)), sy = sum(ys);
          if (sy % 5) continue;
          const my = sy / 5, dx = [-2, -1, 0, 1, 2], dy = ys.map((y) => y - my), prods = dx.map((d, i) => d * dy[i]), Sxy = sum(prods), Syy = sum(dy.map((d) => d * d));
          if (Sxy === 0 || Syy === 0) continue;
          const b1 = Q(Sxy, 10), b0 = Q(my).sub(b1.mul(3));
          if (level === 2) {
            return {
              prompt: `Weeks of training ${V("x")} and a sprinter's improvement ${V("y")} (hundredths of a second): ${M.table([V("x"), ...xs.map(n)], [[V("y"), ...ys.map(n)]])} Find the least-squares line ${yh} = ${M.sub(V("b"), "0")} + ${M.sub(V("b"), "1")}${V("x")}.`,
              graph: scatter(xs, ys),
              steps: [
                `Means: ${xbar} = 3, ${V("ȳ")} = ${M.frac(n(sy), "5")} = ${n(my)}.`,
                `${V("x")} − ${xbar}: ${list(dx)}; ${V("y")} − ${V("ȳ")}: ${list(dy)}. ${M.sub("S", V("xy"))} = ${plus(prods)} = ${n(Sxy)}; ${M.sub("S", V("xx"))} = 4 + 1 + 0 + 1 + 4 = 10.`,
                `${M.sub(V("b"), "1")} = ${M.frac(M.sub("S", V("xy")), M.sub("S", V("xx")))} = ${M.frac(n(Sxy), "10")} = ${dec(b1)}.`,
                `${M.sub(V("b"), "0")} = ${V("ȳ")} − ${M.sub(V("b"), "1")}${xbar} = ${n(my)} − ${M.n(b1.value, { paren: true })} × 3 = ${dec(b0)}. So ${line(b0, b1)}.`,
              ],
              answer: { kind: "expr", expr: `${typed(b0.value)} + (${typed(b1.value)})*x`, vars: ["x"] }, answerText: line(b0, b1),
              answerInput: `y = ${typed(b0.value)} + (${typed(b1.value)})x`,
              vals: { sy, my, dx, dy, prods, Sxy, b1: fv(b1), b0: fv(b0) }, params: { ys }, consts: [3, 4, 5, 10],
            };
          }
          const fit = xs.map((x) => b0.add(b1.mul(x))), res = ys.map((y, i) => Q(y).sub(fit[i])), SSres = fsum(res.map((e) => e.mul(e))), R2 = Q(1).sub(SSres.div(Syy));
          return {
            prompt: `The least-squares line for ${M.table([V("x"), ...xs.map(n)], [[V("y"), ...ys.map(n)]])} is ${line(b0, b1)} (drawn). Compute ${M.sup(V("R"), 2)} = 1 − ${M.frac(M.sub("SS", "res"), M.sub("SS", "tot"))}.${rnd(R2, 3)}`,
            graph: scatter(xs, ys, [b0.value, b1.value]),
            steps: [
              `Fitted values ${yh} at ${V("x")} = 1, …, 5: ${fit.map((f) => dec(f)).join(", ")}.`,
              `Residuals ${V("y")} − ${yh}: ${res.map((e) => dec(e)).join(", ")}; their squares add to ${M.sub("SS", "res")} = ${dec(SSres)}.`,
              `${V("ȳ")} = ${n(my)}; deviations ${list(dy)}, so ${M.sub("SS", "tot")} = ${n(Syy)}.`,
              `${M.sup(V("R"), 2)} = 1 − ${M.frac(dec(SSres), n(Syy))} = ${fd(R2, 3)}: the line explains about ${n(Math.round(R2.value * 100))}% of the variation in ${V("y")}.`,
            ],
            ...pAns(R2, 3), vals: { b0: fv(b0), b1: fv(b1), fit: fit.map(fv), res: res.map(fv), SSres: fv(SSres), my, dy, Syy, R2: fv(R2), pct: Math.round(R2.value * 100) }, params: { ys }, consts: [3, 4, 5],
          };
        }
      },
    },

    // ---- S.41 Multiple regression & adjusted R² ----------------------------------------------------------------------------
    "S.multreg": {
      title: "Adjusted R² and the overall F-test",
      generate(r, level) {
        const R2 = M.sup(V("R"), 2), adj = M.sub(R2, "adj");
        const pick = () => {
          for (;;) {
            const d = r.pick([8, 10, 16, 20, 25, 40, 50]), p = r.int(2, 6), N = d + p + 1, R = Q(r.int(20, 90), 100);
            return { d, p, N, R };
          }
        };
        if (level === 1) {
          const { d, p, N, R } = pick(), ratio = Q(N - 1, d), ans = Q(1).sub(Q(1).sub(R).mul(ratio));
          return {
            prompt: `A regression of ${n(N)} observations on ${n(p)} predictors has ${R2} = ${dec(R)}. Compute the adjusted ${R2}.`,
            steps: [
              `${adj} = 1 − (1 − ${R2})${M.frac(`${V("n")} − 1`, `${V("n")} − ${V("p")} − 1`)}: it charges for each predictor.`,
              `${M.frac(`${n(N)} − 1`, `${n(N)} − ${n(p)} − 1`)} = ${M.frac(n(N - 1), n(d))} = ${dec(ratio)}; 1 − ${dec(R)} = ${dec(Q(1).sub(R))}.`,
              `${adj} = 1 − ${dec(Q(1).sub(R))} × ${dec(ratio)} = 1 − ${dec(Q(1).sub(R).mul(ratio))} = ${dec(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: dec(ans), answerInput: typed(ans.value),
            vals: { N1: N - 1, d, ratio: fv(ratio), q: fv(Q(1).sub(R)), qr: fv(Q(1).sub(R).mul(ratio)), ans: fv(ans) }, params: { N, p, R: R.value },
          };
        }
        if (level === 2) {
          const { d, p, N, R } = pick(), top = R.div(p), bot = Q(1).sub(R).div(d), F = top.div(bot);
          return {
            prompt: `A model with ${n(p)} predictors fit to ${n(N)} observations has ${R2} = ${dec(R)}. Compute the overall ${V("F")} statistic.${rnd(F, 2)}`,
            steps: [
              `${V("F")} = ${M.frac(`${R2}/${V("p")}`, `(1 − ${R2})/(${V("n")} − ${V("p")} − 1)`)}, on (${V("p")}, ${V("n")} − ${V("p")} − 1) = (${n(p)}, ${n(d)}) degrees of freedom.`,
              `Numerator: ${M.frac(dec(R), n(p))} = ${fd(top)}. Denominator: ${M.frac(dec(Q(1).sub(R)), n(d))} = ${fd(bot)}.`,
              `${V("F")} = ${fd(F, 2)}.`,
            ],
            ...pAns(F, 2), vals: { d, q: fv(Q(1).sub(R)), top: fv(top), bot: fv(bot), F: fv(F) }, params: { N, p, R: R.value },
          };
        }
        for (;;) {
          const N = r.pick([21, 26, 31, 41, 51]), pA = r.int(1, 3), pB = pA + r.int(1, 4), RA = Q(r.int(30, 80), 100), RB = RA.add(Q(r.int(1, 12), 100));
          if (RB.value >= 1) continue;
          const adjA = Q(1).sub(Q(1).sub(RA).mul(Q(N - 1, N - pA - 1))), adjB = Q(1).sub(Q(1).sub(RB).mul(Q(N - 1, N - pB - 1)));
          if (adjA.eq(adjB) || Math.abs(adjA.value - adjB.value) < 0.0002) continue;
          const idx = adjA.cmp(adjB) > 0 ? 0 : 1, options = ["Model A", "Model B"];
          return {
            prompt: `With ${n(N)} observations, model A uses ${n(pA)} predictor${pA === 1 ? "" : "s"} and has ${R2} = ${dec(RA)}; model B adds ${n(pB - pA)} more (${n(pB)} in all) and has ${R2} = ${dec(RB)}. Which model has the higher adjusted ${R2}?`,
            steps: [
              `${R2} never falls when predictors are added, so compare ${adj} = 1 − (1 − ${R2})${M.frac(`${V("n")} − 1`, `${V("n")} − ${V("p")} − 1`)}.`,
              `A: 1 − ${dec(Q(1).sub(RA))} × ${M.frac(n(N - 1), n(N - pA - 1))} ${eqs(adjA)} ${dec(adjA)}.`,
              `B: 1 − ${dec(Q(1).sub(RB))} × ${M.frac(n(N - 1), n(N - pB - 1))} ${eqs(adjB)} ${dec(adjB)}.`,
              idx === 0 ? `A is higher: B's extra predictors raise ${R2} by less than their cost.` : `B is higher: its extra predictors add more than chance would.`,
            ],
            answer: { kind: "choice", options, index: idx }, answerText: options[idx],
            vals: { add: pB - pA, qA: fv(Q(1).sub(RA)), qB: fv(Q(1).sub(RB)), dA: N - pA - 1, dB: N - pB - 1, N1: N - 1, adjA: fv(adjA), adjB: fv(adjB) }, params: { N, pA, pB, RA: RA.value, RB: RB.value },
          };
        }
      },
    },

    // ---- S.42 Logistic regression ---------------------------------------------------------------------------------------------
    "S.logistic": {
      title: "Odds ratios and logistic predictions",
      generate(r, level) {
        if (level === 1) {
          const b = r.pick([0.25, 0.4, 0.5, 0.69, 0.75, 1, 1.2, -0.3, -0.5, -0.7]), or = Math.exp(b), pct = (or - 1) * 100;
          const ctx = r.pick(["the number of marketing emails a customer opened last month", "the number of past purchases"]);
          return {
            prompt: `In a logistic regression for whether a customer buys, the coefficient for ${ctx} is ${M.sub("β̂", "1")} = ${n(b)}. Find the odds ratio for a one-unit increase. Round to 2 decimal places.`,
            steps: [
              `The model is linear in the log-odds, so a one-unit increase adds ${n(b)} to ln(odds) and multiplies the odds by ${M.sup(V("e"), M.sub("β", "1"))}.`,
              `OR = ${M.sup(V("e"), n(b))} ${approx(or, 4)} ${nd(or, 4)} ≈ ${nd(or, 2)}.`,
              `Each extra unit ${b > 0 ? "raises" : "lowers"} the odds of buying by about ${n(Math.abs(Math.round(pct)))}% (the odds, not the probability).`,
            ],
            answer: { kind: "number", value: or, dp: 2 }, answerText: `≈ ${nd(or, 2)}`, answerInput: fmt(or, 2),
            vals: { or, pct: Math.abs(Math.round(pct)) }, params: { b },
          };
        }
        if (level === 2) {
          const b0 = r.int(-5, -1), b1 = r.pick([0.25, 0.5, 0.2, 0.1]), x0 = r.int(2, 30), z = P.round(b0 + b1 * x0, 10), ez = Math.exp(-z), p = 1 / (1 + ez);
          if (Math.abs(z) > 4) return this.generate(r, level);
          return {
            prompt: `A logistic model for loan default gives log-odds ${V("z")} = ${n(b0)} + ${n(b1)}${V("x")}, where ${V("x")} is the debt-to-income ratio in percent. What is the predicted default probability at ${V("x")} = ${n(x0)}? Round to three decimal places.`,
            steps: [
              `${V("z")} = ${n(b0)} + ${n(b1)} × ${n(x0)} = ${n(b0)} + ${n(b1 * x0)} = ${n(z)}.`,
              `${V("p")} = ${M.frac("1", `1 + ${M.sup(V("e"), `−${V("z")}`)}`)}, and ${M.sup(V("e"), n(-z))} ≈ ${nd(ez, 4)}.`,
              `${V("p")} = ${M.frac("1", `1 + ${nd(ez, 4)}`)} ≈ ${nd(p, 3)}.`,
            ],
            answer: { kind: "number", value: p, dp: 3 }, answerText: `≈ ${nd(p, 3)}`, answerInput: fmt(p, 3),
            vals: { bx: b1 * x0, z, nz: -z, ez, p }, params: { b0, b1, x0 },
          };
        }
        const b0 = r.int(-6, -2), b1 = r.pick([0.5, 0.25, 0.8, 0.4]), target = r.pick([0.5, 0.8, 0.75, 0.9, 0.2, 0.25]), odds = target / (1 - target), lo = Math.log(odds), x = (lo - b0) / b1;
        return {
          prompt: `A logistic model predicts that a student passes with log-odds ${n(b0)} + ${n(b1)}${V("x")}, where ${V("x")} is hours of study. How many hours give a predicted pass probability of ${n(target)}? Round to 2 decimal places.`,
          steps: [
            `Turn the probability into log-odds: odds = ${M.frac(n(target), `1 − ${n(target)}`)} = ${nd(odds, 4)}, and ln ${nd(odds, 4)} ${approx(lo, 4)} ${nd(lo, 4)}.`,
            `Set ${n(b0)} + ${n(b1)}${V("x")} = ${nd(lo, 4)}: ${V("x")} = ${M.frac(`${nd(lo, 4)} − ${np(b0)}`, n(b1))} = ${M.frac(nd(lo - b0, 4), n(b1))} ≈ ${nd(x, 2)} hours.`,
          ],
          answer: { kind: "number", value: x, dp: 2 }, answerText: `≈ ${nd(x, 2)} hours`, answerInput: fmt(x, 2),
          vals: { odds, lo, top: lo - b0, x }, params: { b0, b1, target },
        };
      },
    },

    // ---- S.43 Correlation vs causation ------------------------------------------------------------------------------------------
    "S.causation": {
      title: "Treatment effects and Simpson's paradox",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const t = Array.from({ length: 4 }, () => r.int(60, 95)), c = Array.from({ length: 4 }, () => r.int(55, 90));
            if (sum(t) % 4 || sum(c) % 4) continue;
            const mt = sum(t) / 4, mc = sum(c) / 4, ate = mt - mc;
            if (ate === 0) continue;
            return {
              prompt: `Eight students were randomly assigned to a new study app or to the usual method. Test scores: app ${list(t)}; usual ${list(c)}. Estimate the average treatment effect of the app.`,
              steps: [
                `Random assignment makes the groups comparable on average, so the simple difference in means estimates the causal effect: ATE = E[${V("Y")} | ${V("T")} = 1] − E[${V("Y")} | ${V("T")} = 0].`,
                `App mean: ${M.frac(t.map(n).join(" + "), "4")} = ${n(mt)}. Usual mean: ${M.frac(c.map(n).join(" + "), "4")} = ${n(mc)}.`,
                `ATE ≈ ${n(mt)} − ${n(mc)} = ${unit(ate, "point", "points")}.`,
              ],
              answer: { kind: "number", value: ate }, answerText: unit(ate, "point", "points"), answerInput: String(ate),
              vals: { mt, mc, ate }, params: { t, c }, consts: [4],
            };
          }
        }
        if (level === 2) {
          const pz = Q(r.int(2, 8), 10), y = [[r.int(50, 80), r.int(40, 70)], [r.int(30, 60), r.int(20, 50)]];
          const d = [y[0][0] - y[0][1], y[1][0] - y[1][1]], qz = Q(1).sub(pz), ate = pz.mul(d[0]).add(qz.mul(d[1]));
          return {
            prompt: `An observational study of a blood-pressure drug: age is a confounder. Mean reduction (mmHg) by group: ${M.table(["", "Drug", "No drug", "Share of population"], [["Younger", n(y[0][0]), n(y[0][1]), dec(pz)], ["Older", n(y[1][0]), n(y[1][1]), dec(qz)]])} Adjusting for age, estimate the average treatment effect.`,
            steps: [
              `Compare drug and no drug within each age group (where they are comparable), then average the differences with the population shares: ATE = Σ (E[${V("Y")} | drug, ${V("z")}] − E[${V("Y")} | no drug, ${V("z")}]) ${pr(V("z"))}.`,
              `Younger: ${n(y[0][0])} − ${n(y[0][1])} = ${n(d[0])}. Older: ${n(y[1][0])} − ${n(y[1][1])} = ${n(d[1])}.`,
              `ATE = ${np(d[0])} × ${dec(pz)} + ${np(d[1])} × ${dec(qz)} = ${dec(pz.mul(d[0]))} + ${M.n(qz.mul(d[1]).value, { paren: true })} = ${dec(ate)} mmHg.`,
            ],
            answer: { kind: "number", value: ate.value }, answerText: `${dec(ate)} mmHg`, answerInput: typed(ate.value),
            vals: { qz: fv(qz), d, t0: fv(pz.mul(d[0])), t1: fv(qz.mul(d[1])), ate: fv(ate) }, params: { pz: pz.value, y: y.flat() },
          };
        }
        const want = r.chance(0.5);
        for (;;) {
          const nA = [r.int(10, 90), r.int(10, 90)], nB = [r.int(10, 90), r.int(10, 90)];
          const rate = (lo, hi) => r.int(lo, hi) / 100;
          const sA = [Math.round(nA[0] * rate(60, 95)), Math.round(nA[1] * rate(20, 70))], sB = [Math.round(nB[0] * rate(60, 95)), Math.round(nB[1] * rate(20, 70))];
          const ra = [0, 1].map((k) => Q(sA[k], nA[k])), rb = [0, 1].map((k) => Q(sB[k], nB[k]));
          const pA = Q(sA[0] + sA[1], nA[0] + nA[1]), pB = Q(sB[0] + sB[1], nB[0] + nB[1]);
          const c0 = ra[0].cmp(rb[0]), c1 = ra[1].cmp(rb[1]), cp = pA.cmp(pB);
          // shown to one decimal of a percent: skip exact ties like 31.25%, which round differently in different languages
          if ([...ra, ...rb, pA, pB].some((q) => q.mul(2000).isInt() && !q.mul(1000).isInt())) continue;
          if (c0 === 0 || c0 !== c1 || cp === 0) continue;
          const gaps = [ra[0].sub(rb[0]), ra[1].sub(rb[1]), pA.sub(pB)].map((g) => Math.abs(g.value));
          if (Math.min(...gaps) < 0.01) continue;
          const paradox = cp !== c0;
          if (paradox !== want) continue;
          const w = c0 > 0 ? 0 : 1, idx = 2 * w + (paradox ? 0 : 1);
          const options = ["A is better in both groups, but B is better when the groups are pooled", "A is better in both groups and when pooled",
            "B is better in both groups, but A is better when the groups are pooled", "B is better in both groups and when pooled"];
          const pc = (q) => nd(q.value * 100, 1);
          return {
            prompt: `Success counts for two treatments, split by case severity: ${M.table(["", "Mild cases", "Severe cases"], [["Treatment A", `${n(sA[0])} of ${n(nA[0])}`, `${n(sA[1])} of ${n(nA[1])}`], ["Treatment B", `${n(sB[0])} of ${n(nB[0])}`, `${n(sB[1])} of ${n(nB[1])}`]])} Which statement is true?`,
            steps: [
              `Mild: A ${pc(ra[0])}%, B ${pc(rb[0])}%. Severe: A ${pc(ra[1])}%, B ${pc(rb[1])}%. So ${w === 0 ? "A" : "B"} does better within each severity group.`,
              `Pooled: A ${M.frac(n(sA[0] + sA[1]), n(nA[0] + nA[1]))} ≈ ${pc(pA)}%, B ${M.frac(n(sB[0] + sB[1]), n(nB[0] + nB[1]))} ≈ ${pc(pB)}%.`,
              paradox
                ? `The pooled comparison reverses (Simpson's paradox): ${w === 0 ? "A" : "B"} was given more of the severe cases (${n(w === 0 ? nA[1] : nB[1])} of ${n(w === 0 ? nA[0] + nA[1] : nB[0] + nB[1])}), which have lower success rates. Severity confounds the pooled comparison; the within-group comparison is the fair one.`
                : `Here the pooled comparison agrees with the groups; no reversal occurs.`,
            ],
            answer: { kind: "choice", options, index: idx }, answerText: options[idx],
            vals: { ra: ra.map((q) => q.value * 100), rb: rb.map((q) => q.value * 100), tA: sA[0] + sA[1], nAt: nA[0] + nA[1], tB: sB[0] + sB[1], nBt: nB[0] + nB[1], pA: pA.value * 100, pB: pB.value * 100 },
            params: { sA, nA, sB, nB },
          };
        }
      },
    },
  });
})(Practice);
