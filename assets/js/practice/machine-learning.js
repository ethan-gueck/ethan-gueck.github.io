/*
 * practice/machine-learning.js — Machine Learning practice problems (chapter 15), one generator per concept key.
 *
 * Each generator(r, level) draws hand-solvable numbers for the level (1 easy, 2 medium, 3 hard) and
 * builds every number it shows from values it computes and reports in `vals`; tools/practice/
 * verifiers/machine_learning.py recomputes each of them independently. See practice/core.js for the API.
 *
 * Exact arithmetic uses Frac throughout; where a logarithm, exponential or trigonometric value is
 * unavoidable the prompt asks for rounding (answer.dp), the steps show 4-decimal intermediates, and
 * answers that sit too close to a rounding boundary are redrawn.
 *
 * Skipped concepts: none. Every concept in the chapter has a computation to practice.
 */
(function (P) {
  "use strict";
  const { Frac, M, fmt, graph } = P;
  const F = (a, b = 1) => new Frac(a, b);
  const fv = (q) => ({ n: q.n, d: q.d });
  const fvs = (qs) => qs.map((q) => fv(Frac.of(q)));
  const ty = (q) => (q.d === 1 ? String(q.n) : `${q.n}/${q.d}`);
  const V = M.v;
  const YH = V("ŷ");
  const SUBS = "₀₁₂₃₄₅₆₇₈₉";
  const ix = (i) => String(i).split("").map((c) => SUBS[+c]).join("");
  const vi = (name, i) => `${V(name)}${ix(i)}`;
  const LET = "ABCDEFGHIJKL";
  const sumF = (a) => a.reduce((s, t) => s.add(t), F(0));
  const sumN = (a) => a.reduce((s, t) => s + t, 0);
  const range = (k) => Array.from({ length: k }, (_, i) => i);
  /** Decimal places of a terminating fraction (Infinity if it does not terminate). */
  function places(q) {
    q = Frac.of(q);
    let d = q.d, k2 = 0, k5 = 0;
    while (d % 2 === 0) { d /= 2; k2++; }
    while (d % 5 === 0) { d /= 5; k5++; }
    return d === 1 ? Math.max(k2, k5) : Infinity;
  }
  /** An exact value: a decimal when it terminates within 6 places, otherwise a stacked fraction. */
  const ex = (q, paren = false) => {
    q = Frac.of(q);
    return places(q) <= 6 ? M.n(q.value, { dp: 8, paren }) : M.f(q, { paren });
  };
  const exp_ = (q) => ex(q, true);
  /** What a person types for an exact value. */
  const exIn = (q) => { q = Frac.of(q); return places(q) <= 6 ? String(P.round(q.value, 10)) : ty(q); };
  /** A rounded (calculator) value, 4 decimals by default. */
  const ap = (x, dp = 4) => M.n(x, { dp });
  const app = (x, dp = 4) => M.n(x, { dp, paren: true });
  /** Too close to a rounding boundary at dp places to be fair to a reader using rounded intermediates. */
  const near = (x, dp) => { const s = Math.abs(x) * Math.pow(10, dp); const f = s - Math.floor(s); return Math.abs(f - 0.5) < 0.12; };
  const fixed = (x, dp) => x.toFixed(dp).replace("-", "−");
  /** a + b − c … from exact values. */
  const chain = (xs) => xs.map((x, i) => {
    const q = Frac.of(x);
    if (i === 0) return ex(q);
    return q.n < 0 ? ` − ${ex(q.neg())}` : ` + ${ex(q)}`;
  }).join("");
  /** a + b − c … from rounded values. */
  const chainA = (xs, dp = 4) => xs.map((x, i) => (i === 0 ? ap(x, dp) : x < 0 ? ` − ${ap(-x, dp)}` : ` + ${ap(x, dp)}`)).join("");
  /** top/bottom as a stacked fraction, followed by its lowest terms when it reduces. */
  const fq = (top, bot) => { const q = F(top, bot); return `${M.frac(M.n(top), M.n(bot))}${q.n !== top || q.d !== bot || places(q) <= 6 ? ` = ${ex(q)}` : ""}`; };
  const sigma = (z) => 1 / (1 + Math.exp(-z));
  const log2 = (x) => Math.log(x) / Math.LN2;
  const h2 = (p) => (p <= 0 || p >= 1 ? 0 : -p * log2(p) - (1 - p) * log2(1 - p));
  const listTxt = (xs, show = ex) => xs.map((x) => show(x)).join(", ");
  const vec = (xs, show = ex) => `(${listTxt(xs, show)})`;
  const scatterView = (pts, pad = 1) => {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return [Math.min(0, ...xs) - pad, Math.max(...xs) + pad, Math.min(0, ...ys) - pad, Math.max(...ys) + pad];
  };

  P.define("machine-learning", {
    // ---- ML.1 The learning problem and empirical risk ------------------------------------------------
    "ML.1": {
      title: "Empirical risk and the generalization gap",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const N = r.pick([8, 10]);
            const y = range(N).map(() => r.int(0, 1));
            const yh = y.map((t) => (r.chance(0.25) ? 1 - t : t));
            const wrongIdx = range(N).filter((i) => y[i] !== yh[i]);
            const m = wrongIdx.length;
            if (m === 0 || m > N / 2) continue;
            const risk = F(m, N);
            const tbl = M.table(["Email", ...range(N).map((i) => LET[i])],
              [[`true label ${V("y")}`, ...y.map(String)], [`prediction ${YH}`, ...yh.map(String)]]);
            return {
              prompt: `A spam filter labels ${N} emails (1 = spam, 0 = not spam). ${tbl} Using the 0–1 loss, what is the filter's empirical risk ${V("R̂")} on these emails?`,
              steps: [
                `The 0–1 loss is 1 when the prediction differs from the label and 0 when it matches.`,
                `The mismatches are email${m > 1 ? "s" : ""} ${wrongIdx.map((i) => LET[i]).join(", ")}: ${m} loss${m > 1 ? "es" : ""} of 1.`,
                `Empirical risk is the average loss: ${V("R̂")} = ${M.frac(String(m), String(N))} = ${ex(risk)}.`,
              ],
              answer: { kind: "number", value: risk.value }, answerText: ex(risk), answerInput: exIn(risk),
              vals: { m, risk: fv(risk) }, params: { N, y, yh },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const xs = r.sample([1, 2, 3, 4, 5], 4).sort((a, b) => a - b), w = r.int(1, 3);
            const ys = xs.map((x) => w * x + r.int(-3, 3));
            if (ys.some((t) => t < 0)) continue;
            const res = xs.map((x, i) => ys[i] - w * x);
            if (res.filter((t) => t !== 0).length < 2) continue;
            const lam = r.pick([F(1, 10), F(1, 4), F(1, 2), F(1)]);
            const sq = res.map((t) => t * t), SSE = sumN(sq), mse = F(SSE, 4), w2 = w * w, pen = lam.mul(w2), J = mse.add(pen);
            return {
              prompt: `A model ${V("f")}(${V("x")}) = ${V("w")}${V("x")} is trained with squared loss and the penalty ${V("λ")}${V("R")}(${V("w")}), where ${V("R")}(${V("w")}) = ${M.sup(V("w"), 2)} and ${V("λ")} = ${ex(lam)}. Evaluate the regularized empirical risk ${M.eq(`${V("J")}(${V("w")}) = ${M.frac("1", V("n"))} Σ (${V("y")} − ${V("w")}${V("x")})² + ${V("λ")}${M.sup(V("w"), 2)}`)} at ${V("w")} = ${w} on these ${4} points: ${M.table([V("x"), ...xs.map(String)], [[V("y"), ...ys.map(String)]])}`,
              steps: [
                `Residuals ${V("y")} − ${w}${V("x")}: ${xs.map((x, i) => `${ys[i]} − ${w} · ${x} = ${M.n(res[i])}`).join("; ")}.`,
                `Squared: ${listTxt(sq, M.n)}; their sum is ${SSE}, and the average over the ${4} points is ${M.frac(String(SSE), "4")} = ${ex(mse)}.`,
                `Penalty: ${V("λ")}${M.sup(V("w"), 2)} = ${ex(lam)} · ${M.sup(String(w), 2)} = ${ex(lam)} · ${w2} = ${ex(pen)}.`,
                `${V("J")}(${w}) = ${ex(mse)} + ${ex(pen)} = ${ex(J)}.`,
              ],
              answer: { kind: "number", value: J.value }, answerText: ex(J), answerInput: exIn(J),
              vals: { res, sq, SSE, mse: fv(mse), w2, pen: fv(pen), J: fv(J) }, params: { xs, ys, w, lam: fv(lam) }, consts: [4],
            };
          }
        }
        // level 3: train vs test error of a fitted line, and the gap between them
        for (;;) {
          const a = r.int(3, 10), b = r.int(2, 5);
          const xtr = r.sample([1, 2, 3, 4, 5, 6, 7, 8], 4).sort((u, v) => u - v);
          const xte = r.sample([1, 2, 3, 4, 5, 6, 7, 8].filter((x) => !xtr.includes(x)), 4).sort((u, v) => u - v);
          const rtr = xtr.map(() => r.int(-1, 1)), rte = xte.map(() => r.int(-4, 4));
          if (rtr.every((t) => t === 0)) continue;
          const ytr = xtr.map((x, i) => a + b * x + rtr[i]), yte = xte.map((x, i) => a + b * x + rte[i]);
          const str = sumN(rtr.map((t) => t * t)), ste = sumN(rte.map((t) => t * t));
          const mtr = F(str, 4), mte = F(ste, 4), gap = mte.sub(mtr);
          if (gap.n <= 0) continue;
          const line = (xs, ys, rs) => xs.map((x, i) => `${ys[i]} − (${a} + ${b} · ${x}) = ${M.n(rs[i])}`).join("; ");
          return {
            prompt: `A model predicts a delivery time (minutes) from distance (km) as ${M.eq(`${YH} = ${a} + ${b}${V("x")}.`)} Training data: ${M.table([`distance ${V("x")}`, ...xtr.map(String)], [[`time ${V("y")}`, ...ytr.map(String)]])} Held-out test data: ${M.table([`distance ${V("x")}`, ...xte.map(String)], [[`time ${V("y")}`, ...yte.map(String)]])} Using mean squared error, estimate the generalization gap (test MSE − training MSE), in squared minutes.`,
            steps: [
              `Training residuals ${V("y")} − ${YH}: ${line(xtr, ytr, rtr)}.`,
              `Training MSE = ${M.frac(rtr.map((t) => M.sup(M.n(t, { paren: true }), 2)).join(" + "), "4")} = ${M.frac(String(str), "4")} = ${ex(mtr)}.`,
              `Test residuals: ${line(xte, yte, rte)}.`,
              `Test MSE = ${M.frac(rte.map((t) => M.sup(M.n(t, { paren: true }), 2)).join(" + "), "4")} = ${M.frac(String(ste), "4")} = ${ex(mte)}.`,
              `Gap = ${ex(mte)} − ${ex(mtr)} = ${ex(gap)} squared minutes: the training error understates the error on new data.`,
            ],
            answer: { kind: "number", value: gap.value }, answerText: `${ex(gap)} min²`, answerInput: exIn(gap),
            vals: { rtr, rte, str, ste, mtr: fv(mtr), mte: fv(mte), gap: fv(gap) }, params: { a, b, xtr, ytr, xte, yte }, consts: [4],
          };
        }
      },
    },

    // ---- ML.2 Loss functions ---------------------------------------------------------------------------------
    "ML.2": {
      title: "Loss functions",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const y = range(4).map(() => r.int(12, 30)), e = range(4).map(() => r.int(-4, 4));
            if (e.filter((t) => t !== 0).length < 3) continue;
            const yh = y.map((t, i) => t - e[i]);
            const useMSE = r.chance(0.5);
            const terms = useMSE ? e.map((t) => t * t) : e.map((t) => Math.abs(t));
            const S = sumN(terms), L = F(S, 4);
            const name = useMSE ? "mean squared error" : "mean absolute error";
            return {
              prompt: `A weather model's forecasts of daily high temperature (°C) against the actual highs: ${M.table(["Day", "Mon", "Tue", "Wed", "Thu"], [[`actual ${V("y")}`, ...y.map(String)], [`forecast ${YH}`, ...yh.map(String)]])} Find the ${name}${useMSE ? ", in °C²" : ", in °C"}.`,
              steps: [
                `Errors ${V("y")} − ${YH}: ${y.map((t, i) => `${t} − ${yh[i]} = ${M.n(e[i])}`).join("; ")}.`,
                useMSE ? `Square each error: ${listTxt(terms, M.n)}; the sum is ${S}.` : `Take absolute values: ${listTxt(terms, M.n)}; the sum is ${S}.`,
                `Average over the ${4} days: ${M.frac(String(S), "4")} = ${ex(L)}.`,
              ],
              answer: { kind: "number", value: L.value }, answerText: `${ex(L)} ${useMSE ? "°C²" : "°C"}`, answerInput: exIn(L),
              vals: { e, terms, S, L: fv(L) }, params: { y, yh, useMSE: useMSE ? 1 : 0 }, consts: [4],
            };
          }
        }
        if (level === 2) {
          const kind = r.pick(["huber", "hinge", "pinball"]);
          if (kind === "huber") {
            for (;;) {
              const delta = r.pick([1, 2]), res = range(4).map(() => r.int(-5, 5));
              if (!res.some((t) => Math.abs(t) <= delta && t !== 0) || !res.some((t) => Math.abs(t) > delta)) continue;
              const Ls = res.map((t) => (Math.abs(t) <= delta ? F(t * t, 2) : F(delta).mul(F(Math.abs(t)).sub(F(delta, 2)))));
              const S = sumF(Ls), L = S.div(4);
              const half = M.frac("1", "2");
              return {
                prompt: `Find the mean Huber loss with ${V("δ")} = ${delta} for the residuals ${M.eq(listTxt(res, M.n))} using ${M.eq(`${V("L")}<sub>${V("δ")}</sub>(${V("r")}) = ${half}${M.sup(V("r"), 2)} if |${V("r")}| ≤ ${V("δ")}, and ${V("δ")}(|${V("r")}| − ${half}${V("δ")}) otherwise.`)}`,
                steps: [
                  ...res.map((t, i) => (Math.abs(t) <= delta
                    ? `${V("r")} = ${M.n(t)}: |${V("r")}| ≤ ${delta}, quadratic part: ${half} · ${M.sup(M.n(t, { paren: true }), 2)} = ${ex(Ls[i])}.`
                    : `${V("r")} = ${M.n(t)}: |${V("r")}| &gt; ${delta}, linear part: ${delta} · (${Math.abs(t)} − ${ex(F(delta, 2))}) = ${ex(Ls[i])}.`)),
                  `Mean: (${chain(Ls)}) ÷ ${4} = ${ex(S)} ÷ ${4} = ${ex(L)}.`,
                ],
                answer: { kind: "number", value: L.value }, answerText: ex(L), answerInput: exIn(L),
                vals: { Ls: fvs(Ls), S: fv(S), L: fv(L), hd: fv(F(delta, 2)) }, params: { kind: 0, delta, res }, consts: [4],
              };
            }
          }
          if (kind === "hinge") {
            for (;;) {
              const ys = range(4).map(() => r.pick([-1, 1])), fs = range(4).map(() => F(r.int(-4, 4), 2));
              const marg = ys.map((t, i) => fs[i].mul(t));
              const Ls = marg.map((m) => (F(1).sub(m).n > 0 ? F(1).sub(m) : F(0)));
              if (!Ls.some((q) => q.n === 0) || !Ls.some((q) => q.n > 0) || !ys.includes(1) || !ys.includes(-1)) continue;
              const S = sumF(Ls), L = S.div(4);
              return {
                prompt: `An SVM gives scores ${V("f")}(${V("x")}) to four points with labels ${V("y")} ∈ {−1, +1}: ${M.table(["Point", "A", "B", "C", "D"], [[V("y"), ...ys.map((t) => M.n(t))], [`${V("f")}(${V("x")})`, ...fs.map((q) => ex(q))]])} Find the mean hinge loss, max(0, 1 − ${V("y")}${V("f")}(${V("x")})).`,
              steps: [
                  `Margins ${V("y")}${V("f")}(${V("x")}): ${marg.map((m, i) => `${LET[i]}: ${M.n(ys[i])} · ${exp_(fs[i])} = ${ex(m)}`).join("; ")}.`,
                  `Losses max(0, 1 − margin): ${Ls.map((q, i) => `${LET[i]}: ${ex(q)}`).join("; ")}. A point with margin at least 1 costs nothing.`,
                  `Mean: (${chain(Ls)}) ÷ ${4} = ${ex(L)}.`,
                ],
                answer: { kind: "number", value: L.value }, answerText: ex(L), answerInput: exIn(L),
                vals: { marg: fvs(marg), Ls: fvs(Ls), S: fv(S), L: fv(L) }, params: { kind: 1, ys, fs: fvs(fs) }, consts: [4],
              };
            }
          }
          for (;;) {
            const tau = r.pick([F(1, 10), F(1, 4), F(3, 4), F(9, 10)]);
            const y = range(4).map(() => r.int(20, 40)), e = range(4).map(() => r.nonzero(-4, 4));
            if (!e.some((t) => t > 0) || !e.some((t) => t < 0)) continue;
            const yh = y.map((t, i) => t - e[i]);
            const tm1 = tau.sub(1);
            const Ls = e.map((t) => (t > 0 ? tau.mul(t) : tm1.mul(t)));
            const S = sumF(Ls), L = S.div(4);
            return {
              prompt: `A store forecasts the ${V("τ")} = ${ex(tau)} quantile of daily demand. Actual demand and forecasts: ${M.table(["Day", "Mon", "Tue", "Wed", "Thu"], [[`actual ${V("y")}`, ...y.map(String)], [`forecast ${YH}`, ...yh.map(String)]])} Find the mean pinball loss ${M.eq(`${V("L")}<sub>${V("τ")}</sub>(${V("r")}) = max(${V("τ")}${V("r")}, (${V("τ")} − 1)${V("r")}),  ${V("r")} = ${V("y")} − ${YH}.`)}`,
              steps: [
                `Residuals: ${e.map((t) => M.n(t)).join(", ")}.`,
                `Under-forecasts (${V("r")} &gt; 0) cost ${V("τ")}${V("r")} = ${ex(tau)}${V("r")}; over-forecasts cost (${V("τ")} − 1)${V("r")} = ${exp_(tm1)}${V("r")}: ${e.map((t, i) => `${t > 0 ? ex(tau) : exp_(tm1)} · ${M.n(t, { paren: true })} = ${ex(Ls[i])}`).join("; ")}.`,
                `Mean: (${chain(Ls)}) ÷ ${4} = ${ex(S)} ÷ ${4} = ${ex(L)}.`,
              ],
              answer: { kind: "number", value: L.value }, answerText: ex(L), answerInput: exIn(L),
              vals: { e, tm1: fv(tm1), Ls: fvs(Ls), S: fv(S), L: fv(L) }, params: { kind: 2, tau: fv(tau), y, yh }, consts: [4],
            };
          }
        }
        // level 3: log-loss of a spam filter
        for (;;) {
          const k = r.pick([3, 4]);
          const ps = range(k).map(() => F(r.int(1, 9), 10)), ys = range(k).map(() => r.int(0, 1));
          if (!ys.includes(0) || !ys.includes(1)) continue;
          const terms = ps.map((p, i) => -Math.log(ys[i] ? p.value : 1 - p.value));
          const S = sumN(terms), L = S / k;
          if (near(L, 3)) continue;
          const pTrue = ps.map((p, i) => (ys[i] ? p : F(1).sub(p)));
          return {
            prompt: `A spam filter outputs ${V("p")} = P(spam) for ${k} emails: ${M.table(["Email", ...range(k).map((i) => LET[i])], [[`spam? ${V("y")}`, ...ys.map(String)], [V("p"), ...ps.map((q) => ex(q))]])} Compute the average log-loss ${M.eq(`−[${V("y")} ln ${V("p")} + (1 − ${V("y")}) ln(1 − ${V("p")})]`)} Round to 3 decimal places.`,
            steps: [
              `Each email contributes −ln of the probability given to its true class: ${V("p")} for spam, 1 − ${V("p")} for not spam.`,
              ps.map((p, i) => `${LET[i]}: −ln ${ex(pTrue[i])} ≈ ${ap(terms[i])}`).join("; ") + ".",
              `Sum ≈ ${ap(S)}; average ≈ ${ap(S)} ÷ ${k} ≈ ${ap(L)}.`,
              `So the log-loss is about ${fixed(L, 3)}. A confident wrong probability costs far more than a hesitant right one, because −ln ${V("p")} grows without bound as ${V("p")} → 0.`,
            ],
            answer: { kind: "number", value: L, dp: 3 }, answerText: `≈ ${fixed(L, 3)}`, answerInput: L.toFixed(3),
            vals: { terms, S, L, pTrue: fvs(pTrue) }, params: { ps: fvs(ps), ys, k }, consts: [3],
          };
        }
      },
    },

    // ---- ML.3 Entropy, cross-entropy and KL divergence ---------------------------------------------------------
    "ML.3": {
      title: "Entropy, cross-entropy and KL divergence",
      generate(r, level) {
        const SHAPES = [[1, 1], [1, 2, 2], [2, 2, 2, 2], [1, 2, 3, 3], [2, 2, 2, 3, 3], [1, 3, 3, 3, 3], [1, 2, 3, 4, 4], [2, 2, 3, 3, 3, 3]];
        const NAMES = [["sunny", "cloudy", "rainy", "snowy", "foggy", "windy"], ["cat", "dog", "bird", "fish", "horse", "rabbit"], ["A", "B", "C", "D", "E", "F"]];
        const pw = (k) => F(1, Math.pow(2, k));
        if (level === 1) {
          const ks = r.shuffle(r.pick(SHAPES)), names = r.pick(NAMES).slice(0, ks.length), ps = ks.map(pw);
          const terms = ks.map((k) => F(k, Math.pow(2, k))), H = sumF(terms);
          return {
            prompt: `A classifier's predicted distribution over ${ks.length} classes is ${M.table(["class", ...names], [[V("p"), ...ps.map((q) => M.f(q))]])} Find its entropy ${V("H")}(${V("p")}) = −Σ ${V("p")}<sub>${V("k")}</sub> log₂ ${V("p")}<sub>${V("k")}</sub>, in bits.`,
            steps: [
              `Every probability is a power of ½, so its log is easy: log₂ ${M.f(pw(1))} = −1, log₂ ${M.f(pw(2))} = −2, log₂ ${M.f(pw(3))} = −3, and so on.`,
              `Terms −${V("p")} log₂ ${V("p")}: ${ks.map((k, i) => `${M.f(ps[i])} · ${k} = ${M.f(terms[i])}`).join("; ")}.`,
              `Add them: ${V("H")} = ${terms.map((q) => M.f(q)).join(" + ")} = ${ex(H)} bits.`,
            ],
            answer: { kind: "number", value: H.value }, answerText: `${ex(H)} bits`, answerInput: exIn(H),
            vals: { ks, terms: fvs(terms), H: fv(H), p3: fv(pw(3)), K: ks.length }, params: { ps: fvs(ps) }, consts: [3, 4],
          };
        }
        if (level === 2) {
          for (;;) {
            const base = r.pick(SHAPES.filter((s) => new Set(s).size > 1));
            const kp = r.shuffle(base), kq = r.shuffle(base);
            if (kp.every((k, i) => k === kq[i])) continue;
            const ps = kp.map(pw), qs = kq.map(pw);
            const Hpq = sumF(ps.map((p, i) => p.mul(kq[i]))), Hp = sumF(ps.map((p, i) => p.mul(kp[i]))), KL = Hpq.sub(Hp);
            const lab = range(kp.length).map((i) => LET[i]);
            return {
              prompt: `True class frequencies ${V("p")} and a model's predictions ${V("q")}: ${M.table(["class", ...lab], [[V("p"), ...ps.map((q) => M.f(q))], [V("q"), ...qs.map((q) => M.f(q))]])} Find ${V("D")}<sub>KL</sub>(${V("p")} ‖ ${V("q")}) in bits.`,
              steps: [
                `Use ${V("D")}<sub>KL</sub>(${V("p")} ‖ ${V("q")}) = ${V("H")}(${V("p")}, ${V("q")}) − ${V("H")}(${V("p")}). Every entry is a power of ½, so −log₂ of each is a whole number: for ${V("p")}: ${kp.join(", ")}; for ${V("q")}: ${kq.join(", ")}.`,
                `Cross-entropy ${V("H")}(${V("p")}, ${V("q")}) = Σ ${V("p")}<sub>${V("k")}</sub>(−log₂ ${V("q")}<sub>${V("k")}</sub>) = ${ps.map((p, i) => `${M.f(p)} · ${kq[i]}`).join(" + ")} = ${ex(Hpq)}.`,
                `Entropy ${V("H")}(${V("p")}) = ${ps.map((p, i) => `${M.f(p)} · ${kp[i]}`).join(" + ")} = ${ex(Hp)}.`,
                `${V("D")}<sub>KL</sub> = ${ex(Hpq)} − ${ex(Hp)} = ${ex(KL)} bits: the extra cost of coding with ${V("q")} when the data follow ${V("p")}.`,
              ],
              answer: { kind: "number", value: KL.value }, answerText: `${ex(KL)} bits`, answerInput: exIn(KL),
              vals: { kp, kq, Hpq: fv(Hpq), Hp: fv(Hp), KL: fv(KL) }, params: { ps: fvs(ps), qs: fvs(qs) },
            };
          }
        }
        // level 3: mutual information from a 2×2 count table
        for (;;) {
          const a = r.int(1, 12), b = r.int(1, 12), c = r.int(1, 12), d = r.int(1, 12);
          const N = a + b + c + d, n1 = a + b, n2 = c + d, cl = a + c;
          if (a * d === b * c || N > 40) continue;
          const HY = h2(cl / N), H1 = h2(a / n1), H2 = h2(c / n2);
          const HYX = (n1 / N) * H1 + (n2 / N) * H2, I = HY - HYX;
          if (I < 0.005 || near(I, 3)) continue;
          return {
            prompt: `Ad clicks by device: ${M.table(["", "clicked", "did not click"], [["mobile", String(a), String(b)], ["desktop", String(c), String(d)]])} Find the mutual information ${V("I")}(device; click) = ${V("H")}(click) − ${V("H")}(click | device), in bits. Round to 3 decimal places.`,
            steps: [
              `${N} visitors, ${cl} clicked. ${V("H")}(click) = ${V("h")}(${M.frac(String(cl), String(N))}) ≈ ${ap(HY)}, where ${V("h")}(${V("q")}) = −${V("q")} log₂ ${V("q")} − (1 − ${V("q")}) log₂(1 − ${V("q")}).`,
              `Mobile (${n1} visitors): ${V("h")}(${M.frac(String(a), String(n1))}) ≈ ${ap(H1)}. Desktop (${n2} visitors): ${V("h")}(${M.frac(String(c), String(n2))}) ≈ ${ap(H2)}.`,
              `${V("H")}(click | device) = ${M.frac(String(n1), String(N))} · ${ap(H1)} + ${M.frac(String(n2), String(N))} · ${ap(H2)} ≈ ${ap(HYX)}.`,
              `${V("I")} ≈ ${ap(HY)} − ${ap(HYX)} ≈ ${ap(I)} bits.`,
            ],
            answer: { kind: "number", value: I, dp: 3 }, answerText: `≈ ${fixed(I, 3)} bits`, answerInput: I.toFixed(3),
            vals: { N, n1, n2, cl, HY, H1, H2, HYX, I }, params: { a, b, c, d }, consts: [3],
          };
        }
      },
    },

    // ---- ML.4 Bias–variance trade-off ------------------------------------------------------------------------
    "ML.4": {
      title: "Bias–variance decomposition",
      generate(r, level) {
        if (level === 1) {
          const bias = F(r.pick([-4, -3, -2, -1, 1, 2, 3, 4]), 2), vr = r.pick([F(1, 4), F(1, 2), F(1), F(3, 2), F(2), F(3)]), s2 = r.pick([F(1, 2), F(1), F(2), F(4)]);
          const b2 = bias.mul(bias), E = b2.add(vr).add(s2);
          return {
            prompt: `At a fixed input, a regression model has bias ${ex(bias)}, variance ${ex(vr)}, and the noise variance is ${V("σ")}² = ${ex(s2)}. What is its expected squared prediction error there?`,
            steps: [
              `Expected squared error = Bias² + Variance + ${V("σ")}².`,
              `Bias² = ${M.sup(exp_(bias), 2)} = ${ex(b2)}. A negative bias (predicting too low on average) costs the same as a positive one.`,
              `${ex(b2)} + ${ex(vr)} + ${ex(s2)} = ${ex(E)}.`,
            ],
            answer: { kind: "number", value: E.value }, answerText: ex(E), answerInput: exIn(E),
            vals: { b2: fv(b2), E: fv(E) }, params: { bias: fv(bias), vr: fv(vr), s2: fv(s2) },
          };
        }
        const model = (lo, hi) => {
          for (;;) {
            const p = range(4).map(() => r.int(lo, hi));
            if (sumN(p) % 4 === 0 && new Set(p).size > 1) return p;
          }
        };
        const stats = (p, T) => {
          const mean = sumN(p) / 4, bias = mean - T, dev = p.map((t) => t - mean), vr = F(sumN(dev.map((t) => t * t)), 4);
          return { mean, bias, dev, vr, b2: bias * bias };
        };
        if (level === 2) {
          const T = r.int(10, 20), p = model(T - 5, T + 5), s2 = r.pick([F(1), F(2), F(4)]);
          const st = stats(p, T), E = F(st.b2).add(st.vr).add(s2);
          return {
            prompt: `To study a model at one input ${vi("x", 0)}, it is trained on four different training sets. Its predictions there are ${M.eq(listTxt(p, M.n))} The true value is ${V("f")}(${vi("x", 0)}) = ${T} and the noise variance is ${V("σ")}² = ${ex(s2)}. Estimate the expected squared error Bias² + Variance + ${V("σ")}².`,
            steps: [
              `Average prediction: (${p.join(" + ")}) ÷ ${4} = ${st.mean}.`,
              `Bias = ${st.mean} − ${T} = ${M.n(st.bias)}, so Bias² = ${st.b2}.`,
              `Deviations from the average: ${listTxt(st.dev, M.n)}. Variance = (${st.dev.map((t) => M.sup(M.n(t, { paren: true }), 2)).join(" + ")}) ÷ ${4} = ${ex(st.vr)}.`,
              `Expected error = ${st.b2} + ${ex(st.vr)} + ${ex(s2)} = ${ex(E)}.`,
            ],
            answer: { kind: "number", value: E.value }, answerText: ex(E), answerInput: exIn(E),
            vals: { mean: st.mean, bias: st.bias, b2: st.b2, dev: st.dev, vr: fv(st.vr), E: fv(E) }, params: { p, T, s2: fv(s2) }, consts: [4],
          };
        }
        for (;;) {
          const T = r.int(20, 40), off = r.nonzero(-4, 4);
          const pa = model(T + off - 1, T + off + 1), pb = model(T - 6, T + 6), s2 = r.pick([F(1), F(2)]);
          const A = stats(pa, T), B = stats(pb, T);
          const EA = F(A.b2).add(A.vr).add(s2), EB = F(B.b2).add(B.vr).add(s2);
          if (EA.sub(EB).abs().cmp(1) < 0) continue;
          const opts = ["Model A (linear)", "Model B (deep tree)"], idx = EA.cmp(EB) < 0 ? 0 : 1;
          const desc = (st, p, nm, E) => `${nm}: average ${st.mean}, Bias² = ${M.sup(M.n(st.bias, { paren: true }), 2)} = ${st.b2}; deviations ${listTxt(st.dev, M.n)}, Variance = ${ex(st.vr)}; total ${st.b2} + ${ex(st.vr)} + ${ex(s2)} = ${ex(E)}.`;
          return {
            prompt: `Two churn-score models are each retrained on four bootstrap samples and evaluated at the same customer, whose true score is ${T}. ${M.table(["", "set 1", "set 2", "set 3", "set 4"], [["Model A (linear)", ...pa.map(String)], ["Model B (deep tree)", ...pb.map(String)]])} With noise variance ${V("σ")}² = ${ex(s2)}, which model has the lower expected squared error at this customer?`,
            steps: [
              `For each model, Bias = average prediction − ${T}, Variance = average squared deviation from its own average.`,
              desc(A, pa, "Model A", EA),
              desc(B, pb, "Model B", EB),
              `${idx === 0 ? "Model A" : "Model B"} has the lower expected error (${ex(idx === 0 ? EA : EB)} vs ${ex(idx === 0 ? EB : EA)}). ${A.b2 > B.b2 ? "Model A misses systematically (bias) while Model B jumps around (variance)." : "Here the flexible model's variance is the larger cost."}`,
            ],
            answer: { kind: "choice", options: opts, index: idx }, answerText: opts[idx],
            vals: { mA: A.mean, mB: B.mean, bA: A.bias, bB: B.bias, b2A: A.b2, b2B: B.b2, dA: A.dev, dB: B.dev, vA: fv(A.vr), vB: fv(B.vr), EA: fv(EA), EB: fv(EB), idx },
            params: { T, pa, pb, s2: fv(s2) }, consts: [3, 4],
          };
        }
      },
    },

    // ---- ML.6 Cross-validation -----------------------------------------------------------------------------
    "ML.6": {
      title: "Cross-validation",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const N = r.pick([120, 200, 240, 300, 500, 600, 1000, 1200, 150, 360]), k = r.pick([3, 4, 5, 6, 8, 10]);
            if (N % k) continue;
            const val = N / k, train = N - val;
            return {
              prompt: `A dataset of ${N} customers is split for ${k}-fold cross-validation. On how many rows is each of the ${k} models trained?`,
              steps: [
                `Each fold holds ${M.frac(V("n"), V("k"))} = ${M.frac(String(N), String(k))} = ${val} rows, used once for validation.`,
                `Each model trains on the other ${k} − 1 folds: ${N} − ${val} = ${train} rows (that is, ${M.frac(`${V("k")} − 1`, V("k"))} of the data).`,
              ],
              answer: { kind: "number", value: train }, answerText: `${train} rows`, answerInput: String(train),
              vals: { val, train }, params: { N, k },
            };
          }
        }
        if (level === 2) {
          const k = 5, errs = range(k).map(() => F(r.int(20, 60), 100)), S = sumF(errs), cv = S.div(k);
          return {
            prompt: `A house-price model is evaluated with ${k}-fold cross-validation. The RMSE on each held-out fold (in $100k) is ${M.eq(listTxt(errs))} What is the CV estimate CV<sub>(${k})</sub> = ${M.frac("1", V("k"))} Σ Err<sub>${V("j")}</sub>?`,
            steps: [
              `Add the fold errors: ${chain(errs)} = ${ex(S)}.`,
              `Divide by ${k}: ${ex(S)} ÷ ${k} = ${ex(cv)} (in $100k).`,
            ],
            answer: { kind: "number", value: cv.value }, answerText: ex(cv), answerInput: exIn(cv),
            vals: { S: fv(S), cv: fv(cv) }, params: { k, errs: fvs(errs) }, consts: [100],
          };
        }
        // level 3: the one-standard-error rule
        for (;;) {
          const fam = r.pick([
            { what: "a decision tree's maximum depth", labels: ["depth 2", "depth 4", "depth 8"] },
            { what: "a ridge model's penalty", labels: ["λ = 10", "λ = 1", "λ = 0.1"] },
            { what: "the number of neighbors in k-NN", labels: ["k = 25", "k = 9", "k = 3"] },
          ]);
          const best = r.int(0, 2);
          const mb = r.int(30, 50);
          const means = [0, 1, 2].map((j) => (j === best ? mb : mb + r.int(1, 6)));
          const folds = means.map((m) => {
            const a = r.int(1, 6), b = r.intExcept(1, 6, a);
            return r.shuffle([m + a, m - a, m + b, m - b]);
          });
          const devs = folds[best].map((e) => e - mb), ss = sumN(devs.map((t) => t * t));
          const s = Math.sqrt(ss / 3) / 100, SE = s / 2, thr = mb / 100 + SE;
          if (means.some((m) => Math.abs(m / 100 - thr) < 0.0015)) continue;
          const pick = [0, 1, 2].find((j) => means[j] / 100 <= thr);
          const errs = folds.map((f) => f.map((e) => F(e, 100))), mF = means.map((m) => F(m, 100));
          const opts = fam.labels.slice();
          return {
            prompt: `You tune ${fam.what} with 4-fold cross-validation (settings listed from simplest to most complex). Fold errors: ${M.table(["setting", "fold errors"], fam.labels.map((l, j) => [l, listTxt(errs[j])]))} Using the one-standard-error rule, which setting do you choose?`,
            steps: [
              `CV means: ${fam.labels.map((l, j) => `${l}: ${ex(mF[j])}`).join("; ")}. The lowest is ${ex(mF[best])} (${fam.labels[best]}).`,
              `Its fold errors deviate from ${ex(mF[best])} by ${listTxt(devs.map((t) => F(t, 100)))}; the squared deviations sum to ${ex(F(ss, 10000))}, so the sample SD is ${V("s")} = ${M.sqrt(M.frac(ex(F(ss, 10000)), "3"))} ≈ ${ap(s)}.`,
              `Standard error ${V("s")}/${M.sqrt("4")} ≈ ${ap(s)} ÷ 2 ≈ ${ap(SE)}; threshold ${ex(mF[best])} + ${ap(SE)} ≈ ${ap(thr)}.`,
              `The simplest setting whose CV mean is at most ${ap(thr)} is ${opts[pick]}${pick === best ? " (the best setting itself)" : ", which is statistically indistinguishable from the best and less likely to overfit"}.`,
            ],
            answer: { kind: "choice", options: opts, index: pick }, answerText: opts[pick],
            vals: { mF: fvs(mF), devs: fvs(devs.map((t) => F(t, 100))), ssd: fv(F(ss, 10000)), s, SE, thr, pick, best }, params: { errs: errs.map(fvs), fam: opts.join("|") },
            consts: [3, 4, 10, 0.1, 25, 9, 8],
          };
        }
      },
    },

    // ---- ML.features Feature scaling and encoding -------------------------------------------------------------
    "ML.features": {
      title: "Feature scaling and encoding",
      generate(r, level) {
        if (level === 1) {
          const mu = r.int(40, 80), sd = r.pick([2, 4, 5, 8, 10]), z = F(r.nonzero(-10, 10), 4), xq = z.mul(sd).add(mu);
          if (!xq.isInt()) return this.generate(r, level);
          const x = xq.n, diff = x - mu;
          return {
            prompt: `Exam scores have mean ${V("μ")} = ${mu} and standard deviation ${V("σ")} = ${sd}. Standardize a score of ${x}: find ${V("z")} = ${M.frac(`${V("x")} − ${V("μ")}`, V("σ"))}.`,
            steps: [
              `Subtract the mean: ${x} − ${mu} = ${M.n(diff)}.`,
              `Divide by the standard deviation: ${M.frac(M.n(diff), String(sd))} = ${ex(z)}. The score is ${ex(z.abs())} standard deviations ${z.n > 0 ? "above" : "below"} the mean.`,
            ],
            answer: { kind: "number", value: z.value }, answerText: ex(z), answerInput: exIn(z),
            vals: { diff, z: fv(z), az: fv(z.abs()) }, params: { mu, sd, x },
          };
        }
        if (level === 2) {
          if (r.chance(0.65)) {
            const vs = r.sample(range(30).map((i) => 5 * i + r.int(0, 4)), 5);
            const lo = Math.min(...vs), hi = Math.max(...vs), mid = vs.filter((t) => t !== lo && t !== hi);
            const x = r.pick(mid), s = F(x - lo, hi - lo);
            return {
              prompt: `Monthly spending (in dollars) for five customers is ${M.eq(listTxt(vs, String))} Apply min–max scaling to the customer who spent ${x}. Give an exact fraction.`,
              steps: [
                `Min = ${lo}, max = ${hi}, so the range is ${hi} − ${lo} = ${hi - lo}.`,
                `${V("x")}′ = ${M.frac(`${V("x")} − ${V("x")}<sub>min</sub>`, `${V("x")}<sub>max</sub> − ${V("x")}<sub>min</sub>`)} = ${M.frac(`${x} − ${lo}`, String(hi - lo))} = ${M.frac(String(x - lo), String(hi - lo))}${s.d !== hi - lo ? ` = ${M.f(s)}` : ""}.`,
              ],
              answer: { kind: "number", value: s.value }, answerText: M.f(s), answerInput: ty(s),
              vals: { lo, hi, rng: hi - lo, top: x - lo, s: fv(s) }, params: { vs, x, robust: 0 },
            };
          }
          const med = r.int(30, 60), q1 = med - r.int(4, 12), q3 = med + r.int(4, 15), x = med + r.nonzero(-20, 40), iqr = q3 - q1, s = F(x - med, iqr);
          return {
            prompt: `Household income (in $1000s) is right-skewed, so you use robust scaling ${M.eq(`${V("x")}′ = ${M.frac(`${V("x")} − median`, "IQR")}`)} The median is ${med}, the first quartile ${q1} and the third quartile ${q3}. Scale an income of ${x}. Give an exact value.`,
            steps: [
              `IQR = ${V("Q")}₃ − ${V("Q")}₁ = ${q3} − ${q1} = ${iqr}.`,
              `${V("x")}′ = ${M.frac(`${x} − ${med}`, String(iqr))} = ${fq(x - med, iqr)}.`,
            ],
            answer: { kind: "number", value: s.value }, answerText: ex(s), answerInput: exIn(s),
            vals: { iqr, top: x - med, s: fv(s) }, params: { med, q1, q3, x, robust: 1 }, consts: [1000],
          };
        }
        // level 3: smoothed target encoding
        for (;;) {
          const m = r.pick([10, 20]), yb = r.pick(m === 10 ? [F(1, 10), F(1, 5), F(3, 10), F(2, 5)] : [F(1, 10), F(1, 5), F(1, 4), F(3, 10), F(2, 5)]);
          const nc = r.int(3, 16), kc = r.int(0, nc);
          const my = yb.mul(m), num = my.add(kc), den = nc + m, enc = num.div(den), raw = F(kc, nc);
          if (raw.eq(yb)) continue;
          return {
            prompt: `For a churn model you target-encode the "city" column. Overall, a fraction ${V("ȳ")} = ${ex(yb)} of customers churn. One city has ${nc} customers, of whom ${kc} churned. With smoothing strength ${V("m")} = ${m}, find its encoding ${M.eq(`${V("x")}′ = ${M.frac(`${V("n")}<sub>${V("c")}</sub>${V("ȳ")}<sub>${V("c")}</sub> + ${V("m")}${V("ȳ")}`, `${V("n")}<sub>${V("c")}</sub> + ${V("m")}`)}`)} Give an exact value.`,
            steps: [
              `The city's own churn rate is ${V("ȳ")}<sub>${V("c")}</sub> = ${M.frac(String(kc), String(nc))}, so ${V("n")}<sub>${V("c")}</sub>${V("ȳ")}<sub>${V("c")}</sub> = ${kc} (its churn count).`,
              `${V("m")}${V("ȳ")} = ${m} · ${ex(yb)} = ${ex(my)}: ${m} imaginary customers at the overall rate.`,
              `${V("x")}′ = ${M.frac(`${kc} + ${ex(my)}`, `${nc} + ${m}`)} = ${M.frac(ex(num), String(den))}${num.isInt() && enc.n === num.n && enc.d === den && places(enc) > 6 ? "" : ` = ${ex(enc)}`}.`,
              `The raw rate ${ex(raw)} is pulled toward ${ex(yb)} because the city has only ${nc} customers; this guards against noisy small categories.`,
            ],
            answer: { kind: "number", value: enc.value }, answerText: ex(enc), answerInput: exIn(enc),
            vals: { my: fv(my), num: fv(num), den, enc: fv(enc), raw: fv(raw) }, params: { m, yb: fv(yb), nc, kc },
          };
        }
      },
    },
    // ---- ML.linreg Linear regression -------------------------------------------------------------------------
    "ML.linreg": {
      title: "Least squares and gradient descent for linear regression",
      generate(r, level) {
        const X = V("x"), Y = V("y");
        const lineTxt = (b0, b1) => {
          const sl = b1.abs().eq(1) ? X : `${ex(b1.abs())}${X}`;
          return b0.n === 0 ? `${YH} = ${b1.n < 0 ? "−" : ""}${sl}` : `${YH} = ${ex(b0)} ${b1.n < 0 ? "−" : "+"} ${sl}`;
        };
        if (level === 1) {
          for (;;) {
            const k = r.pick([3, 5]), s0 = r.int(0, 3), xs = range(k).map((i) => s0 + i);
            const a = r.int(-2, 6), b = r.nonzero(-3, 3), ys = xs.map((x) => a + b * x + r.int(-2, 2));
            if (sumN(ys) % k) continue;
            const xb = sumN(xs) / k, yb = sumN(ys) / k, dx = xs.map((x) => x - xb), dy = ys.map((y) => y - yb);
            const prods = dx.map((t, i) => t * dy[i]), Sxy = sumN(prods), Sxx = sumN(dx.map((t) => t * t));
            if (Sxy === 0) continue;
            const b1 = F(Sxy, Sxx), b0 = F(yb).sub(b1.mul(xb));
            const pts = xs.map((x, i) => [x, ys[i]]);
            return {
              prompt: `Fit the least-squares line ${YH} = ${V("β̂")}₀ + ${V("β̂")}₁${X} to the points ${M.eq(pts.map((p) => `(${p[0]}, ${M.n(p[1])})`).join(", "))} Enter ${V("β̂")}₀, ${V("β̂")}₁.`,
              graph: graph({ view: scatterView(pts), items: pts.map((p) => ({ t: "pt", x: p[0], y: p[1] })) }),
              steps: [
                `Means: ${V("x̄")} = ${M.frac(xs.join(" + "), String(k))} = ${xb}; ${V("ȳ")} = ${M.frac(ys.map((t) => M.n(t, { paren: true })).join(" + "), String(k))} = ${M.n(yb)}.`,
                `Deviations ${X} − ${V("x̄")}: ${listTxt(dx, M.n)}. Deviations ${Y} − ${V("ȳ")}: ${listTxt(dy, M.n)}.`,
                `Σ(${X} − ${V("x̄")})(${Y} − ${V("ȳ")}) = ${dx.map((t, i) => `${M.n(t, { paren: true })} · ${M.n(dy[i], { paren: true })}`).join(" + ")} = ${M.n(Sxy)}; Σ(${X} − ${V("x̄")})² = ${Sxx}.`,
                `${V("β̂")}₁ = ${M.frac(M.n(Sxy), String(Sxx))} = ${ex(b1)}; ${V("β̂")}₀ = ${V("ȳ")} − ${V("β̂")}₁${V("x̄")} = ${M.n(yb)} − ${exp_(b1)} · ${xb} = ${ex(b0)}.`,
                `The line is ${lineTxt(b0, b1)}.`,
              ],
              answer: { kind: "numbers", values: [b0.value, b1.value], ordered: true }, answerText: lineTxt(b0, b1), answerInput: `${exIn(b0)}, ${exIn(b1)}`,
              vals: { k, xb, yb, dx, dy, Sxy, Sxx, b1: fv(b1), b0: fv(b0) }, params: { xs, ys },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const xs = r.sample([0, 1, 2, 3, 4], 4).sort((u, v) => u - v), ys = range(4).map(() => r.int(0, 9));
            const c0 = r.int(-1, 1), c1 = r.int(-1, 1), eta = r.pick([F(1, 10), F(1, 20), F(1, 100)]);
            const pred = xs.map((x) => c0 + c1 * x), res = ys.map((y, i) => y - pred[i]);
            const S0 = sumN(res), xr = xs.map((x, i) => x * res[i]), S1 = sumN(xr);
            if (S0 === 0 || S1 === 0) continue;
            const g0 = F(-2 * S0, 4), g1 = F(-2 * S1, 4), n0 = F(c0).sub(eta.mul(g0)), n1 = F(c1).sub(eta.mul(g1));
            return {
              prompt: `A linear model ${YH} = ${V("β")}₀ + ${V("β")}₁${X} is trained by gradient descent on the mean squared error ${V("J")} = ${M.frac("1", V("n"))}Σ(${Y} − ${YH})². The current parameters are ${V("β")}₀ = ${M.n(c0)}, ${V("β")}₁ = ${M.n(c1)} and the learning rate is ${V("η")} = ${ex(eta)}. Data: ${M.table([X, ...xs.map(String)], [[Y, ...ys.map(String)]])} Take one gradient step. Enter the new ${V("β")}₀, ${V("β")}₁.`,
              steps: [
                `Predictions ${YH} = ${M.poly([c1, c0])}: ${listTxt(pred, M.n)}. Residuals ${Y} − ${YH}: ${listTxt(res, M.n)}.`,
                `∂${V("J")}/∂${V("β")}₀ = −${M.frac("2", V("n"))}Σ(${Y} − ${YH}) = −${M.frac("2", "4")} · ${M.n(S0, { paren: true })} = ${ex(g0)}.`,
                `∂${V("J")}/∂${V("β")}₁ = −${M.frac("2", V("n"))}Σ${X}(${Y} − ${YH}); the products ${X}(${Y} − ${YH}) are ${listTxt(xr, M.n)}, summing to ${M.n(S1)}, so the derivative is ${ex(g1)}.`,
                `Step against the gradient: ${V("β")}₀ = ${M.n(c0)} − ${ex(eta)} · ${exp_(g0)} = ${ex(n0)}; ${V("β")}₁ = ${M.n(c1)} − ${ex(eta)} · ${exp_(g1)} = ${ex(n1)}.`,
              ],
              answer: { kind: "numbers", values: [n0.value, n1.value], ordered: true }, answerText: `${V("β")}₀ = ${ex(n0)}, ${V("β")}₁ = ${ex(n1)}`, answerInput: `${exIn(n0)}, ${exIn(n1)}`,
              vals: { pred, res, S0, xr, S1, g0: fv(g0), g1: fv(g1), n0: fv(n0), n1: fv(n1) }, params: { xs, ys, c0, c1, eta: fv(eta) }, consts: [4],
            };
          }
        }
        // level 3: normal equations, then a prediction
        for (;;) {
          const xs = r.sample([1, 2, 3, 4, 5, 6, 7, 8, 9], 4).sort((u, v) => u - v), a = r.int(5, 20), b = r.int(2, 6);
          const ys = xs.map((x) => a + b * x + r.int(-3, 3));
          const Sx = sumN(xs), Sxx = sumN(xs.map((x) => x * x)), Sy = sumN(ys), Sxy = sumN(xs.map((x, i) => x * ys[i]));
          const det = 4 * Sxx - Sx * Sx, b1 = F(4 * Sxy - Sx * Sy, det), b0 = F(Sxx * Sy - Sx * Sxy, det);
          if (b1.d > 10 || b0.d > 10) continue;
          const xn = r.pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((x) => !xs.includes(x))), pred = b0.add(b1.mul(xn));
          const pts = xs.map((x, i) => [x, ys[i]]);
          return {
            prompt: `A store records weekly ad spend ${X} (in $1000s) and sales ${Y} (in units): ${M.table([X, ...xs.map(String)], [[Y, ...ys.map(String)]])} Fit ${YH} = ${V("β")}₀ + ${V("β")}₁${X} by solving the normal equations ${V("X")}<sup>⊤</sup>${V("X")}${V("β")} = ${V("X")}<sup>⊤</sup>${V("y")}, then predict sales when ${xn} thousand dollars is spent. Give an exact value.`,
            graph: graph({ view: [0, 11, 0, Math.max(...ys) + 5], items: pts.map((p) => ({ t: "pt", x: p[0], y: p[1] })) }),
            steps: [
              `Sums: ${V("n")} = ${4}, Σ${X} = ${Sx}, Σ${M.sup(X, 2)} = ${Sxx}, Σ${Y} = ${Sy}, Σ${X}${Y} = ${Sxy}.`,
              `With a column of 1s in ${V("X")}, the normal equations are ${M.eq(`${4}${V("β")}₀ + ${Sx}${V("β")}₁ = ${Sy}`)} ${M.eq(`${Sx}${V("β")}₀ + ${Sxx}${V("β")}₁ = ${Sxy}`)}`,
              `Determinant: ${4} · ${Sxx} − ${M.sup(String(Sx), 2)} = ${det}. By Cramer's rule, ${V("β")}₁ = ${M.frac(`${4} · ${Sxy} − ${Sx} · ${Sy}`, String(det))} = ${ex(b1)} and ${V("β")}₀ = ${M.frac(`${Sxx} · ${Sy} − ${Sx} · ${Sxy}`, String(det))} = ${ex(b0)}.`,
              `Prediction: ${ex(b0)} + ${ex(b1)} · ${xn} = ${ex(pred)} units.`,
            ],
            answer: { kind: "number", value: pred.value }, answerText: `${ex(pred)} units`, answerInput: exIn(pred),
            vals: { Sx, Sxx, Sy, Sxy, det, b1: fv(b1), b0: fv(b0), pred: fv(pred) }, params: { xs, ys, xn }, consts: [4, 1000],
          };
        }
      },
    },

    // ---- ML.5 Regularization -------------------------------------------------------------------------------
    "ML.5": {
      title: "Ridge, lasso and elastic-net penalties",
      generate(r, level) {
        const X = V("x"), Y = V("y"), B = V("β");
        if (level === 1) {
          const kind = r.pick(["ridge", "lasso", "enet"]);
          const beta = range(3).map(() => F(r.nonzero(-6, 6), 2)), lam = r.pick([F(1, 10), F(1, 2), F(2)]);
          const abs = beta.map((q) => q.abs()), sq = beta.map((q) => q.mul(q)), l1 = sumF(abs), l2 = sumF(sq), al = F(1, 2);
          const pen = kind === "ridge" ? lam.mul(l2) : kind === "lasso" ? lam.mul(l1) : lam.mul(al.mul(l1).add(F(1).sub(al).mul(l2)));
          const what = kind === "ridge" ? `the ridge penalty ${V("λ")}‖${B}‖₂²` : kind === "lasso" ? `the lasso penalty ${V("λ")}‖${B}‖₁` : `the elastic-net penalty ${V("λ")}[${V("α")}‖${B}‖₁ + (1 − ${V("α")})‖${B}‖₂²] with ${V("α")} = ${ex(al)}`;
          const steps = [];
          if (kind !== "ridge") steps.push(`‖${B}‖₁ = Σ|${B}<sub>${V("j")}</sub>| = ${listTxt(abs).replace(/, /g, " + ")} = ${ex(l1)}.`);
          if (kind !== "lasso") steps.push(`‖${B}‖₂² = Σ${B}<sub>${V("j")}</sub>² = ${sq.map((q) => ex(q)).join(" + ")} = ${ex(l2)}.`);
          steps.push(kind === "ridge" ? `Penalty: ${ex(lam)} · ${ex(l2)} = ${ex(pen)}.` : kind === "lasso" ? `Penalty: ${ex(lam)} · ${ex(l1)} = ${ex(pen)}.`
            : `Penalty: ${ex(lam)} · (${ex(al)} · ${ex(l1)} + ${ex(al)} · ${ex(l2)}) = ${ex(pen)}.`);
          return {
            prompt: `A model has coefficients ${B} = ${vec(beta)} and ${V("λ")} = ${ex(lam)}. Compute ${what}.`,
            steps, answer: { kind: "number", value: pen.value }, answerText: ex(pen), answerInput: exIn(pen),
            vals: { l1: fv(l1), l2: fv(l2), sq: fvs(sq), pen: fv(pen), al: fv(al) }, params: { kind, beta: fvs(beta), lam: fv(lam) },
          };
        }
        if (level === 2) {
          for (;;) {
            const xs = range(3).map(() => r.int(1, 4)), ys = range(3).map(() => r.int(-2, 9)), lam = r.pick([1, 2, 3, 4, 5, 10]);
            const s = sumN(xs.map((x, i) => x * ys[i])), Qx = sumN(xs.map((x) => x * x));
            if (s === 0) continue;
            const ridge = F(s, Qx + lam), ols = F(s, Qx);
            return {
              prompt: `Fit ${Y} ≈ ${B}${X} (no intercept) by ridge regression, minimizing ${M.eq(`Σ(${Y}<sub>${V("i")}</sub> − ${B}${X}<sub>${V("i")}</sub>)² + ${V("λ")}${M.sup(B, 2)}`)} with ${V("λ")} = ${lam}, on the points ${M.eq(xs.map((x, i) => `(${x}, ${M.n(ys[i])})`).join(", "))} Find ${V("β̂")}. Give an exact value.`,
              steps: [
                `Set the derivative to zero: −2Σ${X}(${Y} − ${B}${X}) + 2${V("λ")}${B} = 0, so ${V("β̂")} = ${M.frac(`Σ${X}${Y}`, `Σ${M.sup(X, 2)} + ${V("λ")}`)}.`,
                `Σ${X}${Y} = ${xs.map((x, i) => `${x} · ${M.n(ys[i], { paren: true })}`).join(" + ")} = ${M.n(s)}; Σ${M.sup(X, 2)} = ${xs.map((x) => M.sup(String(x), 2)).join(" + ")} = ${Qx}.`,
                `${V("β̂")} = ${M.frac(M.n(s), `${Qx} + ${lam}`)} = ${ex(ridge)}. Without the penalty it would be ${fq(s, Qx)}: ridge shrinks the coefficient toward 0.`,
              ],
              answer: { kind: "number", value: ridge.value }, answerText: ex(ridge), answerInput: exIn(ridge),
              vals: { s, Qx, ridge: fv(ridge), ols: fv(ols), den: Qx + lam }, params: { xs, ys, lam },
            };
          }
        }
        // level 3: one-feature lasso (soft thresholding), sometimes exactly zero
        for (;;) {
          const xs = range(3).map(() => r.int(1, 3)), ys = range(3).map(() => r.int(-6, 6));
          const s = sumN(xs.map((x, i) => x * ys[i])), Qx = sumN(xs.map((x) => x * x)), as = Math.abs(s);
          if (as < 2) continue;
          const zero = r.chance(0.4), lam = 2 * (zero ? r.int(as, as + 6) : r.int(1, as - 1)), half = lam / 2;
          const beta = as <= half ? F(0) : F(s - Math.sign(s) * half, Qx);
          const steps = [
            `For ${B} ≠ 0 the derivative of Σ(${Y} − ${B}${X})² + ${V("λ")}|${B}| is −2Σ${X}${Y} + 2${B}Σ${M.sup(X, 2)} + ${V("λ")} · sign(${B}). Setting it to zero gives ${B} = ${M.frac(`Σ${X}${Y} ∓ ${V("λ")}/2`, `Σ${M.sup(X, 2)}`)}, valid only if |Σ${X}${Y}| &gt; ${V("λ")}/2; otherwise the minimum is at ${B} = 0.`,
            `Σ${X}${Y} = ${xs.map((x, i) => `${x} · ${M.n(ys[i], { paren: true })}`).join(" + ")} = ${M.n(s)}; Σ${M.sup(X, 2)} = ${Qx}; ${V("λ")}/2 = ${half}.`,
          ];
          if (beta.n === 0) steps.push(`|${M.n(s)}| = ${as} ≤ ${half}, so the penalty wins: ${V("β̂")} = 0. The lasso has dropped this feature entirely.`);
          else steps.push(`|${M.n(s)}| = ${as} &gt; ${half}, so ${V("β̂")} = ${M.frac(`${M.n(s)} ${s > 0 ? "−" : "+"} ${half}`, String(Qx))} = ${ex(beta)} (least squares alone would give ${fq(s, Qx)}).`);
          return {
            prompt: `A churn model's weight on one feature is fit by the lasso, minimizing ${M.eq(`Σ(${Y}<sub>${V("i")}</sub> − ${B}${X}<sub>${V("i")}</sub>)² + ${V("λ")}|${B}|`)} with ${V("λ")} = ${lam}, on the (centered) data ${M.eq(xs.map((x, i) => `(${x}, ${M.n(ys[i])})`).join(", "))} Find ${V("β̂")}. Give an exact value.`,
            steps, answer: { kind: "number", value: beta.value }, answerText: ex(beta), answerInput: exIn(beta),
            vals: { s, Qx, as, half, beta: fv(beta), ols: fv(F(s, Qx)) }, params: { xs, ys, lam },
          };
        }
      },
    },

    // ---- ML.7 Logistic regression ------------------------------------------------------------------------------
    "ML.7": {
      title: "Logistic regression",
      generate(r, level) {
        const X = V("x");
        if (level === 1) {
          if (r.chance(0.5)) {
            for (;;) {
              const b0 = r.int(-3, 3), b1 = r.pick([F(1, 2), F(1), F(2), F(-1), F(-1, 2)]), x = r.int(0, 8), z = b1.mul(x).add(b0);
              if (!z.isInt() || z.n === 0 || Math.abs(z.n) > 4) continue;
              const e = Math.exp(-z.n), p = 1 / (1 + e);
              if (near(p, 3)) continue;
              return {
                prompt: `A churn model scores a customer by ${M.eq(`${V("z")} = ${M.n(b0)}${M.term(b1, ` · ${X}`)}`)} where ${X} is the number of support calls last month, and predicts ${V("p")} = ${V("σ")}(${V("z")}) = ${M.frac("1", `1 + ${M.sup("e", `−${V("z")}`)}`)}. Find ${V("p")} for a customer with ${x} support calls. Round to 3 decimal places.`,
                steps: [
                  `${V("z")} = ${M.n(b0)}${M.term(b1, ` · ${x}`)} = ${M.n(z.n)}.`,
                  `${M.sup("e", `−${V("z")}`)} = ${M.sup("e", M.n(-z.n))} ≈ ${ap(e)}.`,
                  `${V("p")} = ${M.frac("1", `1 + ${ap(e)}`)} ≈ ${ap(p)}.`,
                ],
                answer: { kind: "number", value: p, dp: 3 }, answerText: `≈ ${fixed(p, 3)}`, answerInput: p.toFixed(3),
                vals: { z: z.n, e, p }, params: { b0, b1: fv(b1), x, sig: 1 }, consts: [3],
              };
            }
          }
          const b0 = r.nonzero(-6, 6), b1 = F(r.nonzero(-4, 4), 2), xs = b0 === 0 ? F(0) : F(-b0).div(b1);
          return {
            prompt: `A logistic model predicts ${V("p")} = ${V("σ")}(${M.n(b0)}${M.term(b1, X)}). At what value of ${X} is the predicted probability exactly ${ex(F(1, 2))} (the decision boundary)? Give an exact value.`,
            steps: [
              `${V("σ")}(${V("z")}) = ${ex(F(1, 2))} exactly when ${V("z")} = 0.`,
              `${M.n(b0)}${M.term(b1, X)} = 0 gives ${X} = −${V("β")}₀/${V("β")}₁ = ${M.n(-b0)} ÷ ${exp_(b1)} = ${ex(xs)}.`,
            ],
            answer: { kind: "number", value: xs.value }, answerText: `${X} = ${ex(xs)}`, answerInput: exIn(xs),
            vals: { xs: fv(xs), half: fv(F(1, 2)), nb0: -b0 }, params: { b0, b1: fv(b1), sig: 0 },
          };
        }
        if (level === 2) {
          for (;;) {
            const k = r.pick([2, 3]), m = r.pick([1, 2]), p0 = r.pick([F(1, 2), F(1, 3), F(1, 4), F(1, 5), F(2, 5), F(1, 10), F(1, 7), F(1, 9), F(3, 5)]);
            const o0 = p0.div(F(1).sub(p0)), fac = Math.pow(k, m), o1 = o0.mul(fac), p1 = o1.div(o1.add(1));
            if (p1.d > 50) continue;
            return {
              prompt: `In a logistic churn model, the coefficient on "support tickets this month" is ${V("β")} = ln ${k} ≈ ${ap(Math.log(k))}. A customer's predicted churn probability is ${M.f(p0)}. If the customer files ${m} more ticket${m > 1 ? "s" : ""} (all else equal), what is the new churn probability? Give an exact fraction.`,
              steps: [
                `Odds = ${M.frac(V("p"), `1 − ${V("p")}`)} = ${M.f(p0)} ÷ ${M.f(F(1).sub(p0))} = ${M.f(o0)}.`,
                `Each extra ticket adds ${V("β")} to the log-odds, so it multiplies the odds by ${M.sup("e", V("β"))} = ${k}. ${m > 1 ? `Over ${m} tickets: ${M.sup(String(k), m)} = ${fac}.` : ""}`,
                `New odds = ${M.f(o0)} × ${fac} = ${M.f(o1)}.`,
                `${V("p")} = ${M.frac("odds", "1 + odds")} = ${M.f(o1)} ÷ ${M.f(o1.add(1))} = ${M.f(p1)}.`,
              ],
              answer: { kind: "number", value: p1.value }, answerText: M.f(p1), answerInput: ty(p1),
              vals: { lnk: Math.log(k), q0: fv(F(1).sub(p0)), o0: fv(o0), fac, o1: fv(o1), o1p: fv(o1.add(1)), p1: fv(p1) }, params: { k, m, p0: fv(p0) },
            };
          }
        }
        // level 3: one gradient step from β = 0
        for (;;) {
          const xs = r.sample([-2, -1, 0, 1, 2, 3], 4).sort((u, v) => u - v), ys = range(4).map(() => r.int(0, 1));
          if (!ys.includes(0) || !ys.includes(1)) continue;
          const eta = r.pick([F(1, 10), F(1, 2), F(1)]);
          const d = ys.map((y) => F(1, 2).sub(y)), xd = d.map((q, i) => q.mul(xs[i]));
          const g0 = sumF(d).div(4), g1 = sumF(xd).div(4);
          if (g1.n === 0) continue;
          const n0 = g0.mul(eta).neg(), n1 = g1.mul(eta).neg();
          return {
            prompt: `Logistic regression ${V("p")} = ${V("σ")}(${V("β")}₀ + ${V("β")}₁${X}) starts at ${V("β")}₀ = ${V("β")}₁ = 0 and is trained by gradient descent on the mean log-loss, whose gradient is ${M.frac("1", V("n"))}${V("X")}<sup>⊤</sup>(${V("p")} − ${V("y")}). With learning rate ${V("η")} = ${ex(eta)} and the data ${M.table([X, ...xs.map((t) => M.n(t))], [[V("y"), ...ys.map(String)]])} find the parameters after one step. Enter ${V("β")}₀, ${V("β")}₁.`,
            graph: graph({ view: [-3, 4, -0.5, 1.5], items: xs.map((x, i) => ({ t: "pt", x, y: ys[i], role: ys[i] ? "primary" : "secondary" })) }),
            steps: [
              `At ${V("β")} = 0 every score is ${V("z")} = 0, so every ${V("p")} = ${V("σ")}(0) = ${M.f(F(1, 2))}.`,
              `${V("p")} − ${V("y")} for each point: ${d.map((q) => ex(q)).join(", ")}.`,
              `Gradient for ${V("β")}₀ (the column of 1s): ${M.frac("1", "4")}(${chain(d)}) = ${ex(g0)}. For ${V("β")}₁: ${M.frac("1", "4")}(${chain(xd)}) = ${ex(g1)}.`,
              `Step: ${V("β")}₀ = 0 − ${ex(eta)} · ${exp_(g0)} = ${ex(n0)}; ${V("β")}₁ = 0 − ${ex(eta)} · ${exp_(g1)} = ${ex(n1)}.`,
            ],
            answer: { kind: "numbers", values: [n0.value, n1.value], ordered: true }, answerText: `${V("β")}₀ = ${ex(n0)}, ${V("β")}₁ = ${ex(n1)}`, answerInput: `${exIn(n0)}, ${exIn(n1)}`,
            vals: { d: fvs(d), xd: fvs(xd), g0: fv(g0), g1: fv(g1), n0: fv(n0), n1: fv(n1) }, params: { xs, ys, eta: fv(eta) }, consts: [4],
          };
        }
      },
    },

    // ---- ML.10 Naive Bayes ---------------------------------------------------------------------------------
    "ML.10": {
      title: "Naive Bayes classification",
      generate(r, level) {
        const tenth = () => F(r.int(1, 9), 10);
        if (level === 1) {
          for (;;) {
            const ps = F(r.int(2, 6), 10), a = tenth(), b = F(r.pick([1, 2, 5, 10, 15, 20, 30, 40]), 100);
            const ph = F(1).sub(ps), ss = ps.mul(a), sh = ph.mul(b);
            if (ss.eq(sh)) continue;
            const word = r.pick(["free", "winner", "invoice", "meeting", "prize", "offer"]);
            const opts = ["spam", "not spam"], idx = ss.cmp(sh) > 0 ? 0 : 1;
            return {
              prompt: `A naive Bayes spam filter has P(spam) = ${ex(ps)}, P("${word}" | spam) = ${ex(a)} and P("${word}" | not spam) = ${ex(b)}. An email contains "${word}" (and no other informative words). Which class does the filter pick?`,
              steps: [
                `Score each class by prior × likelihood. P(not spam) = 1 − ${ex(ps)} = ${ex(ph)}.`,
                `Spam: ${ex(ps)} × ${ex(a)} = ${ex(ss)}. Not spam: ${ex(ph)} × ${ex(b)} = ${ex(sh)}.`,
                `${ex(ss.cmp(sh) > 0 ? ss : sh)} &gt; ${ex(ss.cmp(sh) > 0 ? sh : ss)}, so the filter picks ${opts[idx]}.`,
              ],
              answer: { kind: "choice", options: opts, index: idx }, answerText: opts[idx],
              vals: { ph: fv(ph), ss: fv(ss), sh: fv(sh), idx }, params: { ps: fv(ps), a: fv(a), b: fv(b) },
            };
          }
        }
        if (level === 2) {
          const n = r.int(0, 6), ny = r.int(40, 200), Vs = r.pick([20, 30, 50, 60, 80, 100]), p = F(n + 1, ny + Vs);
          const word = r.pick(["refund", "crypto", "lottery", "unsubscribe", "agenda"]);
          return {
            prompt: `In the training emails labeled spam there are ${ny} word occurrences in total, and the word "${word}" appears ${n} time${n === 1 ? "" : "s"}. The vocabulary has ${V("V")} = ${Vs} words. Find the Laplace-smoothed estimate P("${word}" | spam). Give an exact fraction.`,
            steps: [
              `Laplace smoothing adds one pseudo-count to every word: ${M.eq(`P̂ = ${M.frac(`${V("n")}<sub>${V("w")}</sub> + 1`, `${V("n")}<sub>spam</sub> + ${V("V")}`)}`)}`,
              `${M.frac(`${n} + 1`, `${ny} + ${Vs}`)} = ${M.frac(String(n + 1), String(ny + Vs))}${p.d !== ny + Vs ? ` = ${M.f(p)}` : ""}.${n === 0 ? " Without smoothing it would be 0, and one unseen word would zero out the whole product." : ""}`,
            ],
            answer: { kind: "number", value: p.value }, answerText: M.f(p), answerInput: ty(p),
            vals: { top: n + 1, bot: ny + Vs, p: fv(p) }, params: { n, ny, Vs },
          };
        }
        for (;;) {
          const ps = F(r.int(2, 6), 10), a = tenth(), b = tenth(), c = tenth(), d = tenth();
          const ph = F(1).sub(ps), ss = ps.mul(a).mul(b), sh = ph.mul(c).mul(d), post = ss.div(ss.add(sh));
          if (post.d > 60 || post.eq(F(1, 2))) continue;
          const [w1, w2] = r.sample(["free", "meeting", "prize", "invoice", "urgent", "lunch"], 2);
          return {
            prompt: `A naive Bayes spam filter uses: ${M.table(["", "P(class)", `P("${w1}" | class)`, `P("${w2}" | class)`], [["spam", ex(ps), ex(a), ex(b)], ["not spam", ex(ph), ex(c), ex(d)]])} An email contains both "${w1}" and "${w2}". Find P(spam | both words). Give an exact fraction.`,
            steps: [
              `Naive Bayes multiplies the prior by each word's likelihood, treating the words as independent given the class.`,
              `Spam: ${ex(ps)} × ${ex(a)} × ${ex(b)} = ${ex(ss)}. Not spam: ${ex(ph)} × ${ex(c)} × ${ex(d)} = ${ex(sh)}.`,
              `Normalize: P(spam | words) = ${M.frac(ex(ss), `${ex(ss)} + ${ex(sh)}`)} = ${M.frac(ex(ss), ex(ss.add(sh)))} = ${M.f(post)}.`,
            ],
            answer: { kind: "number", value: post.value }, answerText: M.f(post), answerInput: ty(post),
            vals: { ph: fv(ph), ss: fv(ss), sh: fv(sh), tot: fv(ss.add(sh)), post: fv(post) }, params: { ps: fv(ps), a: fv(a), b: fv(b), c: fv(c), d: fv(d) },
          };
        }
      },
    },

    // ---- ML.9 k-nearest neighbors and distances -------------------------------------------------------------------
    "ML.9": {
      title: "Distances and k-nearest neighbors",
      generate(r, level) {
        if (level === 1) {
          const trip = r.pick([[3, 4, 0, 5], [6, 8, 0, 10], [5, 12, 0, 13], [1, 2, 2, 3], [2, 3, 6, 7], [2, 6, 9, 11], [4, 4, 7, 9], [1, 4, 8, 9]]);
          const dim = trip[2] === 0 ? 2 : 3, dl = r.shuffle(trip.slice(0, dim)).map((t) => t * r.sign());
          const a = range(dim).map(() => r.int(-3, 5)), b = a.map((t, i) => t + dl[i]);
          const euclid = r.chance(0.5), man = sumN(dl.map(Math.abs)), ans = euclid ? trip[3] : man;
          return {
            prompt: `Two customers have feature vectors ${M.eq(`${V("x")} = ${vec(a, M.n)} and ${V("z")} = ${vec(b, M.n)}`)} Find their ${euclid ? "Euclidean" : "Manhattan"} distance.`,
            steps: [
              `Coordinate differences ${V("x")}<sub>${V("j")}</sub> − ${V("z")}<sub>${V("j")}</sub>: ${a.map((t, i) => `${M.n(t)} − ${M.n(b[i], { paren: true })} = ${M.n(-dl[i])}`).join("; ")}.`,
              euclid ? `${V("d")}₂ = ${M.sqrt(dl.map((t) => M.sup(M.n(-t, { paren: true }), 2)).join(" + "))} = ${M.sqrt(String(trip[3] * trip[3]))} = ${trip[3]}.`
                : `${V("d")}₁ = Σ|${V("x")}<sub>${V("j")}</sub> − ${V("z")}<sub>${V("j")}</sub>| = ${dl.map((t) => Math.abs(t)).join(" + ")} = ${man}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: String(ans), answerInput: String(ans),
            vals: { dl, sq: trip[3] * trip[3], ans, man }, params: { a, b, euclid: euclid ? 1 : 0 },
          };
        }
        if (level === 2) {
          for (;;) {
            const pool = r.pick([[[3, 4], [4, 3], [5, 12], [12, 5], [6, 8], [8, 6], [0, 5], [5, 0]], [[1, 2, 2], [2, 1, 2], [2, 2, 1], [2, 3, 6], [3, 6, 2], [6, 2, 3], [4, 4, 7], [1, 4, 8], [8, 4, 1], [0, 3, 4], [4, 0, 3]]]);
            const [u, v] = r.sample(pool, 2);
            const nu = Math.round(Math.sqrt(sumN(u.map((t) => t * t)))), nv = Math.round(Math.sqrt(sumN(v.map((t) => t * t))));
            const dot = sumN(u.map((t, i) => t * v[i])), cos = F(dot, nu * nv);
            const words = ["“refund”", "“delivery”", "“late”"].slice(0, u.length);
            return {
              prompt: `Two support tickets are represented by word counts for ${words.join(", ")}: ${M.eq(`${V("u")} = ${vec(u, String)},  ${V("v")} = ${vec(v, String)}`)} Find their cosine similarity. Give an exact fraction.`,
              steps: [
                `Dot product: ${u.map((t, i) => `${t} · ${v[i]}`).join(" + ")} = ${dot}.`,
                `Lengths: ‖${V("u")}‖ = ${M.sqrt(u.map((t) => M.sup(String(t), 2)).join(" + "))} = ${nu}, ‖${V("v")}‖ = ${M.sqrt(v.map((t) => M.sup(String(t), 2)).join(" + "))} = ${nv}.`,
                `cos ${V("θ")} = ${M.frac(String(dot), `${nu} · ${nv}`)} = ${M.frac(String(dot), String(nu * nv))}${cos.d !== nu * nv ? ` = ${M.f(cos)}` : ""}.`,
              ],
              answer: { kind: "number", value: cos.value }, answerText: M.f(cos), answerInput: ty(cos),
              vals: { dot, nu, nv, nn: nu * nv, cos: fv(cos) }, params: { u, v },
            };
          }
        }
        // level 3: classify a query point by 3-NN on a plot
        for (;;) {
          const k = 3, q = [r.int(2, 6), r.int(2, 6)];
          const cls = r.shuffle([0, 0, 0, 1, 1, 1]);
          const pts = cls.map(() => [r.int(0, 8), r.int(0, 8)]);
          const keys = pts.map((p) => p[0] * 9 + p[1]);
          if (new Set(keys).size < 6 || keys.includes(q[0] * 9 + q[1])) continue;
          const d2 = pts.map((p) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2);
          const order = range(6).sort((i, j) => d2[i] - d2[j]);
          if (d2[order[2]] === d2[order[3]]) continue;
          const near3 = order.slice(0, k), votes = near3.filter((i) => cls[i] === 0).length, pick = votes >= 2 ? 0 : 1;
          const names = ["apple", "orange"], opts = names.slice();
          return {
            prompt: `Fruit are described by (sweetness, crunchiness). Labeled training fruit: ${M.table(["fruit", "sweetness", "crunchiness", "class"], pts.map((p, i) => [LET[i], String(p[0]), String(p[1]), names[cls[i]]]))} Classify a new fruit at (${q[0]}, ${q[1]}) with ${V("k")} = ${k} nearest neighbors and Euclidean distance.`,
            graph: graph({ view: [-1, 9, -1, 9], equal: true, items: [...pts.map((p, i) => ({ t: "pt", x: p[0], y: p[1], label: LET[i], role: cls[i] ? "secondary" : "primary" })), { t: "pt", x: q[0], y: q[1], label: "?", role: "highlight" }] }),
            steps: [
              `Squared distances are enough for ranking: ${pts.map((p, i) => `${LET[i]}: ${M.sup(`(${p[0]} − ${q[0]})`, 2)} + ${M.sup(`(${p[1]} − ${q[1]})`, 2)} = ${d2[i]}`).join("; ")}.`,
              `The ${k} smallest are ${near3.map((i) => `${LET[i]} (${d2[i]}, ${names[cls[i]]})`).join(", ")}.`,
              `Votes: ${votes} apple, ${k - votes} orange. The majority says ${names[pick]}.`,
            ],
            answer: { kind: "choice", options: opts, index: pick }, answerText: names[pick],
            vals: { d2, votes, other: k - votes, pick }, params: { pts, cls, q, k },
          };
        }
      },
    },

    // ---- ML.11 Decision trees -------------------------------------------------------------------------------
    "ML.11": {
      title: "Gini impurity, entropy and information gain",
      generate(r, level) {
        const gini = (a, b) => F(1).sub(F(a * a + b * b, (a + b) * (a + b)));
        if (level === 1) {
          const a = r.int(1, 12), b = r.int(1, 12), N = a + b, g = gini(a, b);
          return {
            prompt: `A decision-tree node holds ${a} customers who renewed and ${b} who did not. Find its Gini impurity 1 − Σ${M.sup(`${V("p")}<sub>${V("k")}</sub>`, 2)}. Give an exact fraction.`,
            steps: [
              `Class proportions: ${M.frac(String(a), String(N))} and ${M.frac(String(b), String(N))}.`,
              `Gini = 1 − ${M.sup(`(${M.frac(String(a), String(N))})`, 2)} − ${M.sup(`(${M.frac(String(b), String(N))})`, 2)} = 1 − ${M.frac(`${a * a} + ${b * b}`, String(N * N))} = ${M.f(g)}.`,
            ],
            answer: { kind: "number", value: g.value }, answerText: M.f(g), answerInput: ty(g),
            vals: { N, aa: a * a, bb: b * b, NN: N * N, g: fv(g) }, params: { a, b },
          };
        }
        const split = () => {
          for (;;) {
            const a1 = r.int(0, 8), b1 = r.int(0, 8), a2 = r.int(0, 8), b2 = r.int(0, 8);
            const n1 = a1 + b1, n2 = a2 + b2;
            if (n1 < 2 || n2 < 2 || a1 * b2 === a2 * b1 || a1 + a2 === 0 || b1 + b2 === 0) continue;
            return [a1, b1, a2, b2];
          }
        };
        if (level === 2) {
          const [a1, b1, a2, b2] = split(), a = a1 + a2, b = b1 + b2, N = a + b, n1 = a1 + b1, n2 = a2 + b2;
          const gp = gini(a, b), g1 = gini(a1, b1), g2 = gini(a2, b2), wc = F(n1, N).mul(g1).add(F(n2, N).mul(g2)), gain = gp.sub(wc);
          return {
            prompt: `A node with ${a} "yes" and ${b} "no" is split on "age &lt; 30": the left child gets ${a1} yes / ${b1} no and the right child ${a2} yes / ${b2} no. Find the decrease in Gini impurity (parent minus the size-weighted children). Give an exact fraction.`,
            steps: [
              `Parent: 1 − ${M.frac(`${a * a} + ${b * b}`, String(N * N))} = ${M.f(gp)}.`,
              `Left (${n1} rows): 1 − ${M.frac(`${a1 * a1} + ${b1 * b1}`, String(n1 * n1))} = ${M.f(g1)}. Right (${n2} rows): 1 − ${M.frac(`${a2 * a2} + ${b2 * b2}`, String(n2 * n2))} = ${M.f(g2)}.`,
              `Weighted children: ${M.frac(String(n1), String(N))} · ${M.f(g1)} + ${M.frac(String(n2), String(N))} · ${M.f(g2)} = ${M.f(wc)}.`,
              `Decrease: ${M.f(gp)} − ${M.f(wc)} = ${M.f(gain)}.`,
            ],
            answer: { kind: "number", value: gain.value }, answerText: M.f(gain), answerInput: ty(gain),
            consts: [30], vals: { a, b, N, n1, n2, sq: [a * a, b * b, N * N, a1 * a1, b1 * b1, n1 * n1, a2 * a2, b2 * b2, n2 * n2], gp: fv(gp), g1: fv(g1), g2: fv(g2), wc: fv(wc), gain: fv(gain) },
            params: { a1, b1, a2, b2 },
          };
        }
        for (;;) {
          const [a1, b1, a2, b2] = split(), a = a1 + a2, b = b1 + b2, N = a + b, n1 = a1 + b1, n2 = a2 + b2;
          const Hp = h2(a / N), H1 = h2(a1 / n1), H2 = h2(a2 / n2), wc = (n1 / N) * H1 + (n2 / N) * H2, IG = Hp - wc;
          if (IG < 0.005 || near(IG, 3)) continue;
          const hTxt = (x, n, H) => (x === 0 || x === n ? `0 (pure)` : `${V("h")}(${M.frac(String(x), String(n))}) ≈ ${ap(H)}`);
          return {
            prompt: `Loan applications at a tree node: ${a} defaulted and ${b} repaid. Splitting on "income &lt; $40k" sends ${a1} defaulted / ${b1} repaid left and ${a2} defaulted / ${b2} repaid right. Find the information gain in bits. Round to 3 decimal places.`,
            steps: [
              `Binary entropy ${V("h")}(${V("q")}) = −${V("q")} log₂ ${V("q")} − (1 − ${V("q")}) log₂(1 − ${V("q")}), with ${V("q")} the share that defaulted.`,
              `Parent: ${V("h")}(${M.frac(String(a), String(N))}) ≈ ${ap(Hp)}.`,
              `Left (${n1} rows): ${hTxt(a1, n1, H1)}. Right (${n2} rows): ${hTxt(a2, n2, H2)}.`,
              `Weighted children: ${M.frac(String(n1), String(N))} · ${ap(H1)} + ${M.frac(String(n2), String(N))} · ${ap(H2)} ≈ ${ap(wc)}.`,
              `IG ≈ ${ap(Hp)} − ${ap(wc)} ≈ ${ap(IG)} bits.`,
            ],
            answer: { kind: "number", value: IG, dp: 3 }, answerText: `≈ ${fixed(IG, 3)} bits`, answerInput: IG.toFixed(3),
            vals: { a, b, N, n1, n2, Hp, H1, H2, wc, IG }, params: { a1, b1, a2, b2 }, consts: [3, 40],
          };
        }
      },
    },

    // ---- ML.12 Ensembles -------------------------------------------------------------------------------------
    "ML.12": {
      title: "Bagging, variance of an average and AdaBoost",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.6)) {
            const B = r.pick([4, 5]), preds = range(B).map(() => F(r.int(150, 400), 10)), S = sumF(preds), avg = S.div(B);
            return {
              prompt: `A bagged ensemble of ${B} regression trees predicts tomorrow's electricity demand (in MWh). The trees predict ${M.eq(listTxt(preds))} What is the ensemble's prediction?`,
              steps: [
                `Bagging averages the trees: ${M.frac("1", V("B"))}Σ${V("f̂")}<sub>${V("b")}</sub>.`,
                `(${chain(preds)}) ÷ ${B} = ${ex(S)} ÷ ${B} = ${ex(avg)} MWh.`,
              ],
              answer: { kind: "number", value: avg.value }, answerText: `${ex(avg)} MWh`, answerInput: exIn(avg),
              vals: { S: fv(S), avg: fv(avg) }, params: { B, preds: fvs(preds) },
            };
          }
          const n = r.pick([3, 4, 5]), base = F(n - 1, n), oob = base.pow(n);
          return {
            prompt: `A bootstrap sample draws ${n} rows with replacement from a dataset of ${n} rows. What is the probability that a particular row is never drawn (so it is out-of-bag)? Give an exact fraction.`,
            steps: [
              `Each draw misses the row with probability 1 − ${M.frac("1", String(n))} = ${M.f(base)}.`,
              `The ${n} draws are independent: ${M.sup(`(${M.f(base)})`, n)} = ${M.f(oob)}. (As ${V("n")} grows this tends to ${M.sup("e", "−1")} ≈ ${ap(Math.exp(-1), 3)}.)`,
            ],
            answer: { kind: "number", value: oob.value }, answerText: M.f(oob), answerInput: ty(oob),
            vals: { base: fv(base), oob: fv(oob), einv: Math.exp(-1) }, params: { n },
          };
        }
        if (level === 2) {
          const rho = r.pick([F(0), F(1, 10), F(1, 5), F(1, 4), F(1, 2)]), s2 = r.pick([1, 2, 4, 9]), B = r.pick([4, 5, 10, 20, 100]);
          const t1 = rho.mul(s2), t2 = F(1).sub(rho).mul(s2).div(B), vr = t1.add(t2);
          return {
            prompt: `A random forest averages ${V("B")} = ${B} trees. Each tree's prediction has variance ${V("σ")}² = ${s2}, and any two trees' predictions have correlation ${V("ρ")} = ${ex(rho)}. Find the variance of the forest's average, ${M.eq(`${V("ρ")}${V("σ")}² + ${M.frac(`1 − ${V("ρ")}`, V("B"))}${V("σ")}².`)}`,
            steps: [
              `Correlated part: ${V("ρ")}${V("σ")}² = ${ex(rho)} · ${s2} = ${ex(t1)}. More trees cannot remove it; only decorrelating the trees can.`,
              `Averaged-away part: ${M.frac(`1 − ${ex(rho)}`, String(B))} · ${s2} = ${ex(t2)}.`,
              `Total: ${ex(t1)} + ${ex(t2)} = ${ex(vr)}.`,
            ],
            answer: { kind: "number", value: vr.value }, answerText: ex(vr), answerInput: exIn(vr),
            vals: { t1: fv(t1), t2: fv(t2), vr: fv(vr) }, params: { rho: fv(rho), s2, B },
          };
        }
        const [N, m, k] = r.pick([[5, 1, 2], [10, 2, 2], [15, 3, 2], [20, 4, 2], [10, 1, 3], [20, 2, 3], [25, 5, 2]]);
        const eps = F(m, N), ratio = F(1).sub(eps).div(eps), w = F(1, N), wm = w.mul(k), wc = w.div(k);
        const Z = wm.mul(m).add(wc.mul(N - m)), neww = wm.div(Z);
        return {
          prompt: `AdaBoost starts with ${N} training points, each with weight ${M.frac("1", String(N))}. The first weak learner misclassifies ${m} of them. Using ${M.eq(`${V("α")} = ${M.frac("1", "2")} ln ${M.frac(`1 − ${V("ε")}`, V("ε"))},  ${V("w")}<sub>${V("i")}</sub> ← ${V("w")}<sub>${V("i")}</sub>${M.sup("e", `−${V("α")}${V("y")}<sub>${V("i")}</sub>${V("h")}(${V("x")}<sub>${V("i")}</sub>)`)}`)} and then normalizing the weights to sum to 1, find the new weight of one misclassified point. Give an exact fraction.`,
          steps: [
            `Weighted error ${V("ε")} = ${M.frac(String(m), String(N))}${eps.d !== N ? ` = ${M.f(eps)}` : ""}, so ${M.frac(`1 − ${V("ε")}`, V("ε"))} = ${M.f(ratio)} and ${V("α")} = ${M.frac("1", "2")} ln ${M.f(ratio)} = ln ${k} ≈ ${ap(Math.log(k))}.`,
            `A misclassified point has ${V("y")}${V("h")} = −1, so its weight is multiplied by ${M.sup("e", V("α"))} = ${k}: ${M.frac("1", String(N))} · ${k} = ${M.f(wm)}. A correct one is multiplied by ${M.sup("e", `−${V("α")}`)} = ${M.frac("1", String(k))}: ${M.f(wc)}.`,
            `Total before normalizing: ${m} · ${M.f(wm)} + ${N - m} · ${M.f(wc)} = ${M.f(Z)}.`,
            `New weight: ${M.f(wm)} ÷ ${M.f(Z)} = ${M.f(neww)}. ${m === 1 ? "The misclassified point now carries" : "Together the misclassified points now carry"} half the total weight, so the next learner focuses on ${m === 1 ? "it" : "them"}.`,
          ],
          answer: { kind: "number", value: neww.value }, answerText: M.f(neww), answerInput: ty(neww),
          vals: { eps: fv(eps), ratio: fv(ratio), lnk: Math.log(k), k, wm: fv(wm), wc: fv(wc), nc: N - m, Z: fv(Z), neww: fv(neww) }, params: { N, m },
        };
      },
    },

    // ---- ML.boosting Gradient boosting ----------------------------------------------------------------------
    "ML.boosting": {
      title: "Gradient boosting steps",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const k = r.pick([3, 4, 5]), ys = range(k).map(() => r.int(2, 20));
            if (sumN(ys) % k) continue;
            const F0 = sumN(ys) / k, res = ys.map((y) => y - F0);
            if (res.every((t) => t === 0)) continue;
            return {
              prompt: `Gradient boosting with squared-error loss starts from the best constant ${V("F")}₀. The targets are ${M.eq(listTxt(ys, String))} Find ${V("F")}₀ and the pseudo-residuals for the first round. Enter the residuals in order.`,
              steps: [
                `For squared error the best constant is the mean: ${V("F")}₀ = ${M.frac(ys.join(" + "), String(k))} = ${F0}.`,
                `For ${V("L")} = ½(${V("y")} − ${V("F")})², the negative gradient is ${V("y")} − ${V("F")}: the residuals ${ys.map((y, i) => `${y} − ${F0} = ${M.n(res[i])}`).join(", ")}.`,
              ],
              answer: { kind: "numbers", values: res, ordered: true }, answerText: listTxt(res, M.n), answerInput: res.join(", "),
              vals: { F0, res }, params: { ys, k },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const xs = [1, 2, 3, 4, 5, 6], ys = xs.map(() => r.int(2, 20));
            if (sumN(ys) % 6) continue;
            const t = r.int(2, 4), nu = r.pick([F(1, 10), F(1, 2)]), F0 = sumN(ys) / 6, res = ys.map((y) => y - F0);
            const L = range(6).filter((i) => xs[i] <= t), R = range(6).filter((i) => xs[i] > t);
            const hl = F(sumN(L.map((i) => res[i])), L.length), hr = F(sumN(R.map((i) => res[i])), R.length);
            if (hl.n === 0) continue;
            const j = r.int(0, 5), hj = xs[j] <= t ? hl : hr, F1 = nu.mul(hj).add(F0);
            return {
              prompt: `Gradient boosting (squared error, learning rate ${V("ν")} = ${ex(nu)}) on ${M.table([V("x"), ...xs.map(String)], [[V("y"), ...ys.map(String)]])} starts at ${V("F")}₀ = mean(${V("y")}). The first tree is a stump splitting at ${V("x")} ≤ ${t}, with each leaf predicting the mean residual of its points. Find ${V("F")}₁ at ${V("x")} = ${xs[j]}.`,
              steps: [
                `${V("F")}₀ = ${M.frac(String(sumN(ys)), "6")} = ${F0}. Residuals ${V("y")} − ${V("F")}₀: ${listTxt(res, M.n)}.`,
                `Left leaf (${V("x")} ≤ ${t}): mean of ${listTxt(L.map((i) => res[i]), M.n)} = ${ex(hl)}. Right leaf: mean of ${listTxt(R.map((i) => res[i]), M.n)} = ${ex(hr)}.`,
                `${V("x")} = ${xs[j]} falls in the ${xs[j] <= t ? "left" : "right"} leaf, so ${V("h")}₁ = ${ex(hj)}.`,
                `${V("F")}₁ = ${V("F")}₀ + ${V("ν")}${V("h")}₁ = ${F0} + ${ex(nu)} · ${exp_(hj)} = ${ex(F1)}.`,
              ],
              answer: { kind: "number", value: F1.value }, answerText: ex(F1), answerInput: exIn(F1),
              vals: { S: sumN(ys), F0, res, hl: fv(hl), hr: fv(hr), F1: fv(F1) }, params: { xs, ys, t, nu: fv(nu), j }, consts: [6],
            };
          }
        }
        // level 3: XGBoost-style Newton leaf weight
        for (;;) {
          const lam = r.pick([0, 1, 2]), logl = r.chance(0.5);
          if (logl) {
            const ys = range(r.int(3, 6)).map(() => r.int(0, 1)), g = ys.map((y) => F(1, 2).sub(y)), hh = F(1, 4);
            const G = sumF(g), H = hh.mul(ys.length), w = G.neg().div(H.add(lam));
            if (G.n === 0) continue;
            return {
              prompt: `An XGBoost classifier (log-loss) starts every point at score ${V("F")} = 0, so ${V("p")} = ${M.f(F(1, 2))}. One leaf of the first tree contains points with labels ${M.eq(listTxt(ys, String))} With L2 penalty ${V("λ")} = ${lam}, find the leaf weight ${M.eq(`${V("w")}* = −${M.frac(`Σ${V("g")}<sub>${V("i")}</sub>`, `Σ${V("h")}<sub>${V("i")}</sub> + ${V("λ")}`)}`)} Give an exact value.`,
              steps: [
                `For log-loss, ${V("g")} = ${V("p")} − ${V("y")} and ${V("h")} = ${V("p")}(1 − ${V("p")}). At ${V("p")} = ${M.f(F(1, 2))}: ${V("g")} = ${listTxt(g)} and each ${V("h")} = ${ex(hh)}.`,
                `Σ${V("g")} = ${ex(G)}; Σ${V("h")} = ${ys.length} · ${ex(hh)} = ${ex(H)}.`,
                `${V("w")}* = −${M.frac(exp_(G), `${ex(H)} + ${lam}`)} = ${ex(w)}${w.n > 0 ? ", pushing these points toward class 1" : ", pushing these points toward class 0"}.`,
              ],
              answer: { kind: "number", value: w.value }, answerText: ex(w), answerInput: exIn(w),
              vals: { g: fvs(g), hh: fv(hh), G: fv(G), H: fv(H), w: fv(w), cnt: ys.length }, params: { ys, lam, logl: 1 },
            };
          }
          const cnt = r.int(2, 4), Fc = r.int(5, 15), ys = range(cnt).map(() => r.int(Fc - 6, Fc + 6)), g = ys.map((y) => Fc - y);
          const G = sumN(g), w = F(-G, cnt + lam);
          if (G === 0) continue;
          return {
            prompt: `A gradient-boosted regressor uses ${V("L")} = ½(${V("y")} − ${V("F")})², and every point's current prediction is ${V("F")} = ${Fc}. A leaf contains points with targets ${M.eq(listTxt(ys, String))} With L2 penalty ${V("λ")} = ${lam}, find the Newton leaf weight ${M.eq(`${V("w")}* = −${M.frac(`Σ${V("g")}<sub>${V("i")}</sub>`, `Σ${V("h")}<sub>${V("i")}</sub> + ${V("λ")}`)}`)} Give an exact value.`,
            steps: [
              `For this loss ${V("g")} = ∂${V("L")}/∂${V("F")} = ${V("F")} − ${V("y")} and ${V("h")} = ∂²${V("L")}/∂${M.sup(V("F"), 2)} = 1.`,
              `${V("g")}: ${ys.map((y, i) => `${Fc} − ${y} = ${M.n(g[i])}`).join(", ")}; Σ${V("g")} = ${M.n(G)}; Σ${V("h")} = ${cnt}.`,
              `${V("w")}* = −${M.frac(M.n(G, { paren: true }), `${cnt} + ${lam}`)} = ${ex(w)}${lam ? ` (with ${V("λ")} = 0 it would be the mean residual ${ex(F(-G, cnt))})` : ", the mean residual"}.`,
            ],
            answer: { kind: "number", value: w.value }, answerText: ex(w), answerInput: exIn(w),
            vals: { g, G, w: fv(w), mr: fv(F(-G, cnt)), cnt }, params: { ys, lam, Fc, logl: 0 },
          };
        }
      },
    },

    // ---- ML.13 Support vector machines ----------------------------------------------------------------------
    "ML.13": {
      title: "SVM margins, hinge loss and the dual decision function",
      generate(r, level) {
        if (level === 1) {
          const [p, q, c] = r.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [0, 2, 2], [9, 12, 15], [0, 4, 4]]);
          const w = r.shuffle([p * r.sign(), q * r.sign()]), mg = F(2, c), b = r.int(-5, 5);
          return {
            prompt: `A linear SVM has weight vector ${V("w")} = ${vec(w, M.n)} and bias ${V("b")} = ${M.n(b)}. How wide is its margin (the distance between the hyperplanes ${V("w")}<sup>⊤</sup>${V("x")} + ${V("b")} = ±1)? Give an exact value.`,
            steps: [
              `‖${V("w")}‖ = ${M.sqrt(w.map((t) => M.sup(M.n(t, { paren: true }), 2)).join(" + "))} = ${M.sqrt(String(c * c))} = ${c}.`,
              `Margin = ${M.frac("2", `‖${V("w")}‖`)} = ${M.frac("2", String(c))}${mg.d !== c || mg.n !== 2 ? ` = ${ex(mg)}` : ""}. The bias only shifts the hyperplanes; it does not change the width.`,
            ],
            answer: { kind: "number", value: mg.value }, answerText: ex(mg), answerInput: exIn(mg),
            vals: { c, cc: c * c, mg: fv(mg) }, params: { w, b },
          };
        }
        if (level === 2) {
          for (;;) {
            const w = [r.nonzero(-2, 2), r.nonzero(-2, 2)].map((t) => F(t, 2)), b = F(r.int(-2, 2), 2), C = r.pick([F(1, 2), F(1), F(2)]);
            const pts = range(4).map(() => [r.int(-4, 4), r.int(-4, 4)]);
            const f = pts.map((p) => w[0].mul(p[0]).add(w[1].mul(p[1])).add(b));
            if (f.some((v) => v.n === 0) || new Set(pts.map(String)).size < 4) continue;
            const ys = f.map((v) => (r.chance(0.75) ? Math.sign(v.n) : -Math.sign(v.n)));
            const marg = f.map((v, i) => v.mul(ys[i])), xi = marg.map((m) => (F(1).sub(m).n > 0 ? F(1).sub(m) : F(0)));
            if (xi.every((t) => t.n === 0) || xi.every((t) => t.n > 0)) continue;
            const ww = w[0].mul(w[0]).add(w[1].mul(w[1])), half = ww.div(2), Sxi = sumF(xi), obj = half.add(C.mul(Sxi));
            const fx = (s) => `(${-b.value - s} - (${w[0].value})*x)/(${w[1].value})`;
            return {
              prompt: `A soft-margin SVM has ${V("w")} = ${vec(w)}, ${V("b")} = ${ex(b)} and ${V("C")} = ${ex(C)}. For the four labeled points below, evaluate the objective ${M.eq(`${M.frac("1", "2")}‖${V("w")}‖² + ${V("C")}Σ max(0, 1 − ${V("y")}<sub>${V("i")}</sub>(${V("w")}<sup>⊤</sup>${V("x")}<sub>${V("i")}</sub> + ${V("b")})).`)} ${M.table(["point", ...LET.slice(0, 4).split("")], [[`${V("x")}`, ...pts.map((p) => `(${p[0]}, ${p[1]})`.replace(/-/g, "−"))], [V("y"), ...ys.map((t) => M.n(t))]])}`,
              graph: graph({ view: [-5, 5, -5, 5], equal: true, items: [{ t: "fn", e: fx(0) }, { t: "fn", e: fx(1), role: "muted" }, { t: "fn", e: fx(-1), role: "muted" }, ...pts.map((p, i) => ({ t: "pt", x: p[0], y: p[1], label: LET[i], role: ys[i] > 0 ? "primary" : "secondary" }))] }),
              steps: [
                `Scores ${V("f")} = ${V("w")}<sup>⊤</sup>${V("x")} + ${V("b")}: ${f.map((v, i) => `${LET[i]}: ${ex(v)}`).join("; ")}.`,
                `Margins ${V("y")}${V("f")}: ${marg.map((m, i) => `${LET[i]}: ${ex(m)}`).join("; ")}. Slacks ${V("ξ")} = max(0, 1 − ${V("y")}${V("f")}): ${xi.map((t) => ex(t)).join(", ")}; total ${ex(Sxi)}.`,
                `${M.frac("1", "2")}‖${V("w")}‖² = ${M.frac("1", "2")}(${ex(w[0].mul(w[0]))} + ${ex(w[1].mul(w[1]))}) = ${ex(half)}.`,
                `Objective = ${ex(half)} + ${ex(C)} · ${ex(Sxi)} = ${ex(obj)}.`,
              ],
              answer: { kind: "number", value: obj.value }, answerText: ex(obj), answerInput: exIn(obj),
              vals: { f: fvs(f), marg: fvs(marg), xi: fvs(xi), Sxi: fv(Sxi), w0: fv(w[0].mul(w[0])), w1: fv(w[1].mul(w[1])), half: fv(half), obj: fv(obj) },
              params: { w: fvs(w), b: fv(b), C: fv(C), pts, ys },
            };
          }
        }
        // level 3: dual decision function with a polynomial kernel
        for (;;) {
          const sv = range(3).map(() => [r.int(-2, 2), r.int(-2, 2)]), ys = [1, -1, r.pick([1, -1])], al = range(3).map(() => F(r.int(1, 4), 2));
          const b = r.int(-3, 3), xq = [r.int(-2, 2), r.int(-2, 2)];
          const dots = sv.map((s) => s[0] * xq[0] + s[1] * xq[1]), K = dots.map((d) => (d + 1) * (d + 1));
          const terms = K.map((k, i) => al[i].mul(ys[i]).mul(k)), fval = sumF(terms).add(b);
          if (fval.n === 0 || new Set(sv.map((s) => s.join())).size < 3) continue;
          const cls = fval.n > 0 ? 1 : -1;
          return {
            prompt: `A kernel SVM with ${V("K")}(${V("x")}, ${V("z")}) = ${M.sup(`(${V("x")}<sup>⊤</sup>${V("z")} + 1)`, 2)} has three support vectors: ${M.table(["", V("x") + "ᵢ", V("y") + "ᵢ", V("α") + "ᵢ"], sv.map((s, i) => [LET[i], `(${M.n(s[0])}, ${M.n(s[1])})`, M.n(ys[i]), ex(al[i])]))} and ${V("b")} = ${M.n(b)}. Evaluate ${V("f")}(${V("x")}) = Σ ${V("α")}<sub>${V("i")}</sub>${V("y")}<sub>${V("i")}</sub>${V("K")}(${V("x")}<sub>${V("i")}</sub>, ${V("x")}) + ${V("b")} at ${V("x")} = (${M.n(xq[0])}, ${M.n(xq[1])}).`,
            steps: [
              `Dot products with the new point: ${sv.map((s, i) => `${LET[i]}: ${M.n(s[0])} · ${M.n(xq[0], { paren: true })} + ${M.n(s[1], { paren: true })} · ${M.n(xq[1], { paren: true })} = ${M.n(dots[i])}`).join("; ")}.`,
              `Kernel values ${M.sup(`(${V("x")}<sup>⊤</sup>${V("z")} + 1)`, 2)}: ${K.join(", ")}.`,
              `Terms ${V("α")}${V("y")}${V("K")}: ${terms.map((t, i) => `${ex(al[i])} · ${M.n(ys[i], { paren: true })} · ${K[i]} = ${ex(t)}`).join("; ")}.`,
              `${V("f")}(${V("x")}) = ${chain(terms)}${M.term(b, "")} = ${ex(fval)}, so the point is classified ${cls > 0 ? "+1" : "−1"}.`,
            ],
            answer: { kind: "number", value: fval.value }, answerText: `${ex(fval)} (class ${cls > 0 ? "+1" : "−1"})`, answerInput: exIn(fval),
            vals: { dots, K, terms: fvs(terms), f: fv(fval), cls }, params: { sv, ys, al: fvs(al), b, xq },
          };
        }
      },
    },

    // ---- ML.kernels Kernels and the kernel trick ---------------------------------------------------------------
    "ML.kernels": {
      title: "Kernels and kernel ridge regression",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const x = [r.int(-3, 3), r.int(-3, 3)], z = [r.int(-3, 3), r.int(-3, 3)], c = r.int(1, 2), p = r.pick([2, 3]);
            const dot = x[0] * z[0] + x[1] * z[1], base = dot + c, K = Math.pow(base, p);
            if (Math.abs(base) > 5 || base === 0) continue;
            return {
              prompt: `Evaluate the polynomial kernel ${V("K")}(${V("x")}, ${V("z")}) = ${M.sup(`(${V("x")}<sup>⊤</sup>${V("z")} + ${c})`, p)} for ${V("x")} = ${vec(x, M.n)} and ${V("z")} = ${vec(z, M.n)}.`,
              steps: [
                `${V("x")}<sup>⊤</sup>${V("z")} = ${M.n(x[0])} · ${M.n(z[0], { paren: true })} + ${M.n(x[1], { paren: true })} · ${M.n(z[1], { paren: true })} = ${M.n(dot)}.`,
                `${M.sup(`(${M.n(dot)} + ${c})`, p)} = ${M.sup(M.n(base, { paren: true }), p)} = ${M.n(K)}. One dot product stands in for an inner product over all monomials up to degree ${p}.`,
              ],
              answer: { kind: "number", value: K }, answerText: M.n(K), answerInput: String(K),
              vals: { dot, base, K }, params: { x, z, c, p },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const x = [r.nonzero(-3, 3), r.nonzero(-3, 3)], z = [r.nonzero(-3, 3), r.nonzero(-3, 3)];
            const px = [x[0] * x[0], x[0] * x[1], x[1] * x[1]], pz = [z[0] * z[0], z[0] * z[1], z[1] * z[1]];
            const t = [px[0] * pz[0], 2 * px[1] * pz[1], px[2] * pz[2]], tot = sumN(t), dot = x[0] * z[0] + x[1] * z[1];
            if (dot === 0) continue;
            const phi = (q) => `(${q[0]}, ${M.n(q[1])}√2, ${q[2]})`;
            return {
              prompt: `With the feature map ${V("φ")}(${V("x")}) = (${M.sup(`${V("x")}₁`, 2)}, √2 ${V("x")}₁${V("x")}₂, ${M.sup(`${V("x")}₂`, 2)}), compute ${V("φ")}(${V("x")})<sup>⊤</sup>${V("φ")}(${V("z")}) for ${V("x")} = ${vec(x, M.n)} and ${V("z")} = ${vec(z, M.n)}, and check it against the kernel ${M.sup(`(${V("x")}<sup>⊤</sup>${V("z")})`, 2)}.`,
              steps: [
                `${V("φ")}(${V("x")}) = ${phi(px)}; ${V("φ")}(${V("z")}) = ${phi(pz)}.`,
                `Inner product: ${px[0]} · ${pz[0]} + (${M.n(px[1])}√2)(${M.n(pz[1])}√2) + ${px[2]} · ${pz[2]} = ${M.n(t[0])} + ${M.n(t[1], { paren: true })} + ${M.n(t[2])} = ${M.n(tot)}, since √2 · √2 = 2.`,
                `Kernel shortcut: ${V("x")}<sup>⊤</sup>${V("z")} = ${M.n(dot)} and ${M.sup(M.n(dot, { paren: true }), 2)} = ${M.n(dot * dot)}. They agree, without ever building ${V("φ")}.`,
              ],
              answer: { kind: "number", value: tot }, answerText: M.n(tot), answerInput: String(tot),
              vals: { px, pz, t, tot, dot, dd: dot * dot }, params: { x, z },
            };
          }
        }
        // level 3: kernel ridge regression with two training points
        for (;;) {
          const x1 = r.int(-2, 2), x2 = r.intExcept(-2, 3, x1), y1 = r.int(-4, 6), y2 = r.int(-4, 6), lam = r.pick([1, 2]), xs = r.pick([-3, -2, -1, 1, 2, 3].filter((t) => t !== x1 && t !== x2));
          const Kf = (a, b) => a * b + 1;
          const k11 = Kf(x1, x1), k12 = Kf(x1, x2), k22 = Kf(x2, x2);
          const A = k11 + lam, Bm = k12, D = k22 + lam, det = A * D - Bm * Bm;
          const a1 = F(D * y1 - Bm * y2, det), a2 = F(A * y2 - Bm * y1, det);
          const ks1 = Kf(x1, xs), ks2 = Kf(x2, xs), pred = a1.mul(ks1).add(a2.mul(ks2));
          if (a1.d > 20 || a2.d > 20 || (y1 === 0 && y2 === 0) || k12 === 0) continue;
          return {
            prompt: `Kernel ridge regression with ${V("K")}(${V("x")}, ${V("z")}) = ${V("x")}${V("z")} + 1 and ${V("λ")} = ${lam} is trained on two points, (${M.n(x1)}, ${M.n(y1)}) and (${M.n(x2)}, ${M.n(y2)}). Find ${V("α")} = (${V("K")} + ${V("λ")}${V("I")})<sup>−1</sup>${V("y")}, then predict at ${V("x")} = ${M.n(xs)} with ${V("f")}(${V("x")}) = Σ ${V("α")}<sub>${V("i")}</sub>${V("K")}(${V("x")}<sub>${V("i")}</sub>, ${V("x")}). Give an exact value.`,
            steps: [
              `Gram matrix entries: ${V("K")}₁₁ = ${k11}, ${V("K")}₁₂ = ${V("K")}₂₁ = ${M.n(k12)}, ${V("K")}₂₂ = ${k22}. Adding ${V("λ")} to the diagonal gives the system ${M.eq(`${A}${V("α")}₁ ${M.term(Bm, `${V("α")}₂`).trim()} = ${M.n(y1)}`)} ${M.eq(`${M.term(Bm, `${V("α")}₁`, { first: true })} + ${D}${V("α")}₂ = ${M.n(y2)}`)}`,
              `Determinant ${A} · ${D} − ${M.sup(M.n(Bm, { paren: true }), 2)} = ${det}. Cramer's rule: ${V("α")}₁ = ${M.frac(`${D} · ${M.n(y1, { paren: true })} − ${M.n(Bm, { paren: true })} · ${M.n(y2, { paren: true })}`, String(det))} = ${ex(a1)}, ${V("α")}₂ = ${M.frac(`${A} · ${M.n(y2, { paren: true })} − ${M.n(Bm, { paren: true })} · ${M.n(y1, { paren: true })}`, String(det))} = ${ex(a2)}.`,
              `Kernel with the new point: ${V("K")}(${M.n(x1)}, ${M.n(xs)}) = ${M.n(ks1)}, ${V("K")}(${M.n(x2)}, ${M.n(xs)}) = ${M.n(ks2)}.`,
              `${V("f")}(${M.n(xs)}) = ${exp_(a1)} · ${M.n(ks1, { paren: true })} + ${exp_(a2)} · ${M.n(ks2, { paren: true })} = ${ex(pred)}.`,
            ],
            answer: { kind: "number", value: pred.value }, answerText: ex(pred), answerInput: exIn(pred),
            vals: { k11, k12, k22, A, D, det, a1: fv(a1), a2: fv(a2), ks1, ks2, pred: fv(pred) }, params: { x1, x2, y1, y2, lam, xs },
          };
        }
      },
    },

    // ---- ML.8 Classification metrics ----------------------------------------------------------------------------
    "ML.8": {
      title: "Precision, recall, F1 and accuracy",
      generate(r, level) {
        const cm = (TP, FN, FP, TN) => M.table(["", "predicted positive", "predicted negative"], [["actually positive", String(TP), String(FN)], ["actually negative", String(FP), String(TN)]]);
        if (level === 1) {
          const TP = r.int(10, 60), FN = r.int(2, 30), FP = r.int(2, 30), TN = r.int(40, 200);
          const kind = r.pick(["precision", "recall", "accuracy", "FPR"]), N = TP + FN + FP + TN;
          const [top, bot, form] = kind === "precision" ? [TP, TP + FP, `${M.frac(V("TP"), `${V("TP")} + ${V("FP")}`)} = ${M.frac(String(TP), `${TP} + ${FP}`)}`]
            : kind === "recall" ? [TP, TP + FN, `${M.frac(V("TP"), `${V("TP")} + ${V("FN")}`)} = ${M.frac(String(TP), `${TP} + ${FN}`)}`]
              : kind === "accuracy" ? [TP + TN, N, `${M.frac(`${V("TP")} + ${V("TN")}`, V("N"))} = ${M.frac(`${TP} + ${TN}`, `${TP} + ${FN} + ${FP} + ${TN}`)}`]
                : [FP, FP + TN, `${M.frac(V("FP"), `${V("FP")} + ${V("TN")}`)} = ${M.frac(String(FP), `${FP} + ${TN}`)}`];
          const q = F(top, bot), name = kind === "FPR" ? "false positive rate" : kind;
          return {
            prompt: `A fraud detector's results on a test set: ${cm(TP, FN, FP, TN)} Find its ${name}. Give an exact value.`,
            steps: [
              kind === "precision" ? `Precision asks: of the transactions flagged as fraud, what fraction really were?` : kind === "recall" ? `Recall asks: of the real frauds, what fraction were caught?`
                : kind === "accuracy" ? `Accuracy is the fraction of all predictions that are correct.` : `The false positive rate is the fraction of legitimate transactions wrongly flagged.`,
              `${form} = ${fq(top, bot)}.`,
            ],
            answer: { kind: "number", value: q.value }, answerText: ex(q), answerInput: exIn(q),
            vals: { top, bot, q: fv(q) }, params: { TP, FN, FP, TN, kind },
          };
        }
        if (level === 2) {
          const TP = r.int(5, 50), FN = r.int(1, 25), FP = r.int(1, 25), TN = r.int(30, 150);
          const Pr = F(TP, TP + FP), Re = F(TP, TP + FN), num = Pr.mul(Re).mul(2), den = Pr.add(Re), F1 = num.div(den);
          return {
            prompt: `An image classifier for "cat" gives: ${cm(TP, FN, FP, TN)} Find its ${V("F")}₁ score. Give an exact value.`,
            steps: [
              `Precision = ${fq(TP, TP + FP)}. Recall = ${fq(TP, TP + FN)}.`,
              `${V("F")}₁ = ${M.frac(`2 · Precision · Recall`, "Precision + Recall")}. Top: 2 · ${M.f(Pr)} · ${M.f(Re)} = ${M.f(num)}. Bottom: ${M.f(Pr)} + ${M.f(Re)} = ${M.f(den)}. So ${V("F")}₁ = ${M.f(num)} ÷ ${M.f(den)} = ${ex(F1)}.`,
              `Check with the shortcut ${M.frac(`2${V("TP")}`, `2${V("TP")} + ${V("FP")} + ${V("FN")}`)} = ${M.frac(String(2 * TP), `${2 * TP} + ${FP} + ${FN}`)} = ${ex(F1)}. Note that true negatives (${TN}) play no part.`,
            ],
            answer: { kind: "number", value: F1.value }, answerText: ex(F1), answerInput: exIn(F1),
            vals: { pp: TP + FP, rr: TP + FN, Pr: fv(Pr), Re: fv(Re), num: fv(num), den: fv(den), F1: fv(F1), tt: 2 * TP }, params: { TP, FN, FP, TN },
          };
        }
        for (;;) {
          const N = r.pick([1000, 2000, 5000, 10000]), pct = r.pick([1, 2, 5, 10]), rec = r.pick([F(4, 5), F(9, 10), F(19, 20)]), fpr = r.pick([F(1, 50), F(1, 20), F(1, 10)]);
          const pos = (N * pct) / 100, neg = N - pos, TP = rec.mul(pos), FP = fpr.mul(neg);
          if (!TP.isInt() || !FP.isInt()) continue;
          const prec = TP.div(TP.add(FP));
          return {
            prompt: `A disease affects ${pct}% of a population. A screening test catches ${ex(rec.mul(100))}% of people who have it (recall) and wrongly flags ${ex(fpr.mul(100))}% of people who do not (false positive rate). If ${P.grouped(N)} people are screened, what fraction of those who test positive actually have the disease (precision)? Give an exact fraction.`,
            steps: [
              `Have the disease: ${pct}% of ${P.grouped(N)} = ${P.grouped(pos)}; do not: ${P.grouped(neg)}.`,
              `True positives: ${ex(rec)} × ${P.grouped(pos)} = ${P.grouped(TP.n)}. False positives: ${ex(fpr)} × ${P.grouped(neg)} = ${P.grouped(FP.n)}.`,
              `Precision = ${M.frac(String(TP.n), `${TP.n} + ${FP.n}`)} = ${fq(TP.n, TP.n + FP.n)}${places(prec) > 6 ? ` ≈ ${ap(prec.value, 3)}` : ""}.`,
              `Even with a good test, most positives can be false alarms when the condition is rare: precision depends on prevalence, recall does not.`,
            ],
            answer: { kind: "number", value: prec.value }, answerText: M.f(prec), answerInput: ty(prec),
            vals: { pos, neg, TP: TP.n, FP: FP.n, tot: TP.n + FP.n, prec: fv(prec), rp: fv(rec.mul(100)), fp: fv(fpr.mul(100)) },
            params: { N, pct, rec: fv(rec), fpr: fv(fpr) }, consts: [100],
          };
        }
      },
    },

    // ---- ML.21 ROC and AUC --------------------------------------------------------------------------------
    "ML.21": {
      title: "ROC points and AUC",
      generate(r, level) {
        const scores = (k) => r.sample(range(19).map((i) => 5 * (i + 1)), k).map((t) => F(t, 100));
        if (level === 1) {
          for (;;) {
            const all = scores(8), pos = all.slice(0, 4), neg = all.slice(4), tau = F(r.pick([3, 4, 5, 6, 7]), 10);
            const TP = pos.filter((q) => q.cmp(tau) >= 0).length, FP = neg.filter((q) => q.cmp(tau) >= 0).length;
            if (TP === 0 && FP === 0) continue;
            const tpr = F(TP, 4), fpr = F(FP, 4);
            return {
              prompt: `A churn model scores 4 customers who churned and 4 who stayed. ${M.table(["", "scores"], [["churned", listTxt(pos)], ["stayed", listTxt(neg)]])} At threshold ${V("τ")} = ${ex(tau)} (flag a customer if score ≥ ${ex(tau)}), which point (FPR, TPR) does the model give on the ROC curve?`,
              steps: [
                `Churned customers at or above ${ex(tau)}: ${TP} of 4, so TPR = ${fq(TP, 4)}.`,
                `Stayers at or above ${ex(tau)}: ${FP} of 4, so FPR = ${fq(FP, 4)}.`,
                `The ROC point is (${ex(fpr)}, ${ex(tpr)}).`,
              ],
              answer: { kind: "point", value: [fpr.value, tpr.value] }, answerText: `(${ex(fpr)}, ${ex(tpr)})`, answerInput: `(${exIn(fpr)}, ${exIn(tpr)})`,
              vals: { TP, FP, tpr: fv(tpr), fpr: fv(fpr) }, params: { pos: fvs(pos), neg: fvs(neg), tau: fv(tau) }, consts: [4],
            };
          }
        }
        if (level === 2) {
          const np = r.pick([3, 4]), nn = 4, all = scores(np + nn), pos = all.slice(0, np), neg = all.slice(np);
          const wins = pos.map((p) => neg.filter((q) => p.cmp(q) > 0).length), W = sumN(wins), auc = F(W, np * nn);
          return {
            prompt: `A fraud model scores ${np} fraudulent and ${nn} legitimate transactions: ${M.table(["", "scores"], [["fraud", listTxt(pos)], ["legitimate", listTxt(neg)]])} Find the AUC as the probability that a random fraud scores higher than a random legitimate transaction. Give an exact value.`,
            steps: [
              `There are ${np} × ${nn} = ${np * nn} (fraud, legitimate) pairs; count those where the fraud scores higher.`,
              pos.map((p, i) => `Fraud ${ex(p)} beats ${wins[i]} legitimate score${wins[i] === 1 ? "" : "s"}`).join("; ") + ".",
              `AUC = ${M.frac(String(W), String(np * nn))} = ${ex(auc)}.`,
            ],
            answer: { kind: "number", value: auc.value }, answerText: ex(auc), answerInput: exIn(auc),
            vals: { pairs: np * nn, wins, W, auc: fv(auc) }, params: { pos: fvs(pos), neg: fvs(neg), np, nn },
          };
        }
        // level 3: area under a drawn ROC polyline
        for (;;) {
          const k = r.pick([2, 3]), xs = r.sample([1, 2, 3], k).sort(), ys = r.sample([1, 2, 3, 4], k).sort();
          if (ys.some((y, i) => y < xs[i]) || sumN(ys) === sumN(xs)) continue;
          const pts = [[0, 0], ...xs.map((x, i) => [x, ys[i]]), [4, 4]].map((p) => [F(p[0], 4), F(p[1], 4)]);
          const traps = range(pts.length - 1).map((i) => pts[i + 1][0].sub(pts[i][0]).mul(pts[i][1].add(pts[i + 1][1])).div(2));
          const auc = sumF(traps);
          const lab = (p) => `(${ex(p[0])}, ${ex(p[1])})`;
          return {
            prompt: `The ROC curve of a spam filter is drawn below; its corners are labeled. Find the area under the curve (AUC). Give an exact value.`,
            graph: graph({ view: [-0.1, 1.1, -0.1, 1.1], equal: true, items: [
              ...range(pts.length - 1).map((i) => ({ t: "seg", a: [pts[i][0].value, pts[i][1].value], b: [pts[i + 1][0].value, pts[i + 1][1].value], role: "primary" })),
              { t: "seg", a: [0, 0], b: [1, 1], dash: true, role: "muted" },
              ...pts.map((p) => ({ t: "pt", x: p[0].value, y: p[1].value, label: lab(p) })),
              { t: "text", x: 0.5, y: -0.07, s: "FPR" }, { t: "text", x: -0.07, y: 0.5, s: "TPR" }] }),
            steps: [
              `Corners in order: ${pts.map(lab).join(", ")}.`,
              `Split the area into trapezoids, width × average height: ${traps.map((t, i) => `${ex(pts[i + 1][0].sub(pts[i][0]))} × ${M.frac(`${ex(pts[i][1])} + ${ex(pts[i + 1][1])}`, "2")} = ${ex(t)}`).join("; ")}.`,
              `AUC = ${chain(traps)} = ${ex(auc)}. (The dashed diagonal, a random ranking, has area ${ex(F(1, 2))}.)`,
            ],
            answer: { kind: "number", value: auc.value }, answerText: ex(auc), answerInput: exIn(auc),
            vals: { widths: fvs(range(pts.length - 1).map((i) => pts[i + 1][0].sub(pts[i][0]))), traps: fvs(traps), auc: fv(auc), half: fv(F(1, 2)) },
            params: { pts: pts.map((p) => fvs(p)) },
          };
        }
      },
    },

    // ---- ML.22 Regression metrics -------------------------------------------------------------------------------
    "ML.22": {
      title: "RMSE, R² and MAPE",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const e = range(4).map(() => r.int(-6, 6)), S = sumN(e.map((t) => t * t)), m = F(S, 4), rt = Math.round(Math.sqrt(m.value));
            if (!m.isInt() || rt * rt !== m.n || rt === 0 || e.filter((t) => t !== 0).length < 3) continue;
            const y = e.map(() => r.int(20, 60)), yh = y.map((t, i) => t - e[i]);
            return {
              prompt: `A model predicts commute times (minutes): ${M.table(["", "A", "B", "C", "D"], [[`actual ${V("y")}`, ...y.map(String)], [`predicted ${YH}`, ...yh.map(String)]])} Find the RMSE, in minutes.`,
              steps: [
                `Errors ${V("y")} − ${YH}: ${listTxt(e, M.n)}. Squared: ${listTxt(e.map((t) => t * t), M.n)}; sum ${S}.`,
                `Mean squared error: ${M.frac(String(S), "4")} = ${m.n}.`,
                `RMSE = ${M.sqrt(String(m.n))} = ${rt} minutes, in the same units as ${V("y")}.`,
              ],
              answer: { kind: "number", value: rt }, answerText: `${rt} min`, answerInput: String(rt),
              vals: { e, sq: e.map((t) => t * t), S, mse: m.n, rt }, params: { y, yh }, consts: [4],
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const k = r.pick([4, 5]), y = range(k).map(() => r.int(2, 20));
            if (sumN(y) % k) continue;
            const yb = sumN(y) / k, e = y.map(() => r.int(-2, 2)), yh = y.map((t, i) => t - e[i]);
            const SSE = sumN(e.map((t) => t * t)), dev = y.map((t) => t - yb), SST = sumN(dev.map((t) => t * t));
            if (SST === 0 || SSE === 0) continue;
            const R2 = F(1).sub(F(SSE, SST));
            return {
              prompt: `Find ${V("R")}² for these predictions: ${M.table(["", ...range(k).map((i) => LET[i])], [[V("y"), ...y.map(String)], [YH, ...yh.map(String)]])} Give an exact value.`,
              steps: [
                `Residual sum of squares: errors ${listTxt(e, M.n)}, so SSE = ${SSE}.`,
                `Mean ${V("ȳ")} = ${yb}; deviations ${listTxt(dev, M.n)}, so SST = Σ(${V("y")} − ${V("ȳ")})² = ${SST}.`,
                `${V("R")}² = 1 − ${M.frac("SSE", "SST")} = 1 − ${fq(SSE, SST)} = ${ex(R2)}.${R2.n < 0 ? " It is negative: these predictions do worse than always predicting the mean." : ""}`,
              ],
              answer: { kind: "number", value: R2.value }, answerText: ex(R2), answerInput: exIn(R2),
              vals: { SSE, yb, dev, SST, ratio: fv(F(SSE, SST)), R2: fv(R2), k }, params: { y, yh },
            };
          }
        }
        if (r.chance(0.5)) {
          for (;;) {
            const y = range(4).map(() => r.pick([20, 25, 40, 50, 80, 100, 125, 200])), e = y.map((t) => r.pick([-4, -2, -1, 1, 2, 3, 5]) * t / (t >= 100 ? 20 : t >= 50 ? 10 : 5));
            if (!e.every(Number.isInteger)) continue;
            const yh = y.map((t, i) => t - e[i]), pct = e.map((t, i) => F(Math.abs(t) * 100, y[i])), mape = sumF(pct).div(4);
            if (!pct.every((q) => places(q) <= 2)) continue;
            return {
              prompt: `Weekly sales forecasts for four stores: ${M.table(["store", "A", "B", "C", "D"], [[`actual ${V("y")}`, ...y.map(String)], [`forecast ${YH}`, ...yh.map(String)]])} Find the mean absolute percentage error (MAPE), in percent.`,
              steps: [
                `Percentage errors |${V("y")} − ${YH}| ÷ ${V("y")} × 100%: ${y.map((t, i) => `${Math.abs(e[i])} ÷ ${t} = ${ex(pct[i])}%`).join("; ")}.`,
                `MAPE = (${chain(pct)}) ÷ ${4} = ${ex(mape)}%.`,
              ],
              answer: { kind: "number", value: mape.value }, answerText: `${ex(mape)}%`, answerInput: exIn(mape),
              vals: { ae: e.map(Math.abs), pct: fvs(pct), mape: fv(mape) }, params: { y, yh, mode: 1 }, consts: [4, 100],
            };
          }
        }
        for (;;) {
          const n = r.pick([21, 31, 41, 51, 61]), p1 = r.int(2, 4), p2 = p1 + r.pick([5, 10]);
          const R1 = F(r.int(60, 85), 100), R2 = R1.add(F(r.int(1, 6), 100));
          const a1 = F(1).sub(F(1).sub(R1).mul(F(n - 1, n - p1 - 1))), a2 = F(1).sub(F(1).sub(R2).mul(F(n - 1, n - p2 - 1)));
          if (a1.eq(a2) || Math.abs(a1.value - a2.value) < 0.002) continue;
          const idx = a1.cmp(a2) > 0 ? 0 : 1, opts = ["Model A", "Model B"];
          return {
            prompt: `On ${n} houses, Model A uses ${p1} features and has ${V("R")}² = ${ex(R1)}; Model B adds ${p2 - p1} more features (${p2} in all) and has ${V("R")}² = ${ex(R2)}. Which has the higher adjusted ${V("R")}², ${M.eq(`${V("R")}²<sub>adj</sub> = 1 − (1 − ${V("R")}²)${M.frac(`${V("n")} − 1`, `${V("n")} − ${V("p")} − 1`)}?`)}`,
            steps: [
              `Model A: 1 − ${ex(F(1).sub(R1))} × ${M.frac(String(n - 1), String(n - p1 - 1))} = ${ex(a1)}${places(a1) > 6 ? ` ≈ ${ap(a1.value)}` : ""}.`,
              `Model B: 1 − ${ex(F(1).sub(R2))} × ${M.frac(String(n - 1), String(n - p2 - 1))} = ${ex(a2)}${places(a2) > 6 ? ` ≈ ${ap(a2.value)}` : ""}.`,
              idx === 0 ? `Model A wins: Model B's extra features raise ${V("R")}² too little to pay for themselves.` : `Model B wins: its extra features add enough explained variance to outweigh the penalty.`,
            ],
            answer: { kind: "choice", options: opts, index: idx }, answerText: opts[idx],
            vals: { u1: fv(F(1).sub(R1)), u2: fv(F(1).sub(R2)), d1: n - p1 - 1, d2: n - p2 - 1, nm1: n - 1, a1: fv(a1), a2: fv(a2), add: p2 - p1, idx }, params: { n, p1, p2, R1: fv(R1), R2: fv(R2), mode: 0 },
          };
        }
      },
    },

    // ---- ML.23 Reading metrics -------------------------------------------------------------------------------
    "ML.23": {
      title: "Brier score, MCC and baselines",
      generate(r, level) {
        if (level === 1) {
          const ps = range(4).map(() => F(r.int(1, 9), 10)), ys = range(4).map(() => r.int(0, 1));
          const d = ps.map((p, i) => p.sub(ys[i])), sq = d.map((q) => q.mul(q)), B = sumF(sq).div(4);
          return {
            prompt: `A rain model gave these probabilities on four days: ${M.table(["day", "Mon", "Tue", "Wed", "Thu"], [[`forecast ${V("p")}`, ...ps.map((q) => ex(q))], [`rained? ${V("y")}`, ...ys.map(String)]])} Find its Brier score ${M.frac("1", V("n"))}Σ(${V("p")}<sub>${V("i")}</sub> − ${V("y")}<sub>${V("i")}</sub>)².`,
            steps: [
              `Differences ${V("p")} − ${V("y")}: ${listTxt(d)}. Squared: ${listTxt(sq)}.`,
              `Average: (${chain(sq)}) ÷ ${4} = ${ex(B)}. Lower is better; always forecasting ${ex(F(1, 2))} scores ${ex(F(1, 4))}.`,
            ],
            answer: { kind: "number", value: B.value }, answerText: ex(B), answerInput: exIn(B),
            vals: { d: fvs(d), sq: fvs(sq), B: fv(B), half: fv(F(1, 2)), q: fv(F(1, 4)) }, params: { ps: fvs(ps), ys }, consts: [4],
          };
        }
        if (level === 2) {
          let TP, FN, FP, TN, prod, rt;
          for (let tries = 0; ; tries++) {
            TP = r.int(5, 40); FN = r.int(1, 20); FP = r.int(1, 20); TN = r.int(20, 80);
            if (tries > 4000) FN = FP;
            prod = (TP + FP) * (TP + FN) * (TN + FP) * (TN + FN); rt = Math.round(Math.sqrt(prod));
            if (rt * rt === prod) break;
          }
          const num = TP * TN - FP * FN, mcc = F(num, rt);
          return {
            prompt: `A churn classifier's confusion matrix: ${M.table(["", "predicted churn", "predicted stay"], [["churned", String(TP), String(FN)], ["stayed", String(FP), String(TN)]])} Find the Matthews correlation coefficient ${M.eq(`MCC = ${M.frac(`${V("TP")} · ${V("TN")} − ${V("FP")} · ${V("FN")}`, M.sqrt(`(${V("TP")} + ${V("FP")})(${V("TP")} + ${V("FN")})(${V("TN")} + ${V("FP")})(${V("TN")} + ${V("FN")})`))}`)} Give an exact value.`,
            steps: [
              `Numerator: ${TP} · ${TN} − ${FP} · ${FN} = ${TP * TN} − ${FP * FN} = ${M.n(num)}.`,
              `Denominator: ${M.sqrt(`${TP + FP} · ${TP + FN} · ${TN + FP} · ${TN + FN}`)} = ${M.sqrt(P.grouped(prod))} = ${P.grouped(rt)}.`,
              `MCC = ${fq(num, rt)}${places(mcc) > 6 ? ` ≈ ${ap(mcc.value, 3)}` : ""}. On a scale from −1 to 1, 0 means no better than chance.`,
            ],
            answer: { kind: "number", value: mcc.value }, answerText: ex(mcc), answerInput: exIn(mcc),
            vals: { tt: TP * TN, ff: FP * FN, num, sums: [TP + FP, TP + FN, TN + FP, TN + FN], prod, rt, mcc: fv(mcc) }, params: { TP, FN, FP, TN },
          };
        }
        for (;;) {
          const n = r.pick([4, 5]), ys = range(n).map(() => r.int(0, 1)), ps = range(n).map(() => F(r.int(1, 9), 10));
          const k = sumN(ys);
          if (k === 0 || k === n) continue;
          const B = sumF(ps.map((p, i) => p.sub(ys[i]).mul(p.sub(ys[i])))).div(n), pi = F(k, n), Bref = pi.mul(F(1).sub(pi)), BSS = F(1).sub(B.div(Bref));
          return {
            prompt: `Rain forecasts over ${n} days: ${M.table(["day", ...range(n).map((i) => LET[i])], [[`forecast ${V("p")}`, ...ps.map((q) => ex(q))], [`rained? ${V("y")}`, ...ys.map(String)]])} The reference forecast always predicts the observed rain frequency ${V("π")}, whose Brier score is ${V("π")}(1 − ${V("π")}). Find the Brier skill score 1 − Brier/Brier<sub>ref</sub>. Give an exact value.`,
            steps: [
              `Squared errors (${V("p")} − ${V("y")})²: ${listTxt(ps.map((p, i) => p.sub(ys[i]).mul(p.sub(ys[i]))))}; Brier = ${ex(sumF(ps.map((p, i) => p.sub(ys[i]).mul(p.sub(ys[i])))))} ÷ ${n} = ${ex(B)}.`,
              `It rained on ${k} of ${n} days, so ${V("π")} = ${ex(pi)} and Brier<sub>ref</sub> = ${ex(pi)} · ${ex(F(1).sub(pi))} = ${ex(Bref)}.`,
              `Skill = 1 − ${ex(B)} ÷ ${ex(Bref)} = 1 − ${ex(B.div(Bref))} = ${ex(BSS)}. ${BSS.n > 0 ? "Positive: the model beats the climatology baseline." : "Not positive: the model is no better than always forecasting the base rate."}`,
            ],
            answer: { kind: "number", value: BSS.value }, answerText: ex(BSS), answerInput: exIn(BSS),
            vals: { sq: fvs(ps.map((p, i) => p.sub(ys[i]).mul(p.sub(ys[i])))), S: fv(sumF(ps.map((p, i) => p.sub(ys[i]).mul(p.sub(ys[i]))))), B: fv(B), k, pi: fv(pi), q: fv(F(1).sub(pi)), Bref: fv(Bref), ratio: fv(B.div(Bref)), BSS: fv(BSS) },
            params: { ps: fvs(ps), ys, n },
          };
        }
      },
    },

    // ---- ML.calibration Probability calibration --------------------------------------------------------------------
    "ML.calibration": {
      title: "Calibration error and temperature scaling",
      generate(r, level) {
        if (level === 1) {
          const nb = r.pick([20, 25, 40, 50, 100]), pb = F(r.int(5, 9), 10), k = Math.min(nb, Math.round(nb * pb.value) + r.nonzero(-Math.floor(nb / 5), Math.floor(nb / 10))), yb = F(k, nb), gap = yb.sub(pb).abs();
          if (gap.n === 0) return this.generate(r, level);
          return {
            prompt: `Among ${nb} emails to which a spam filter gave a spam probability near ${ex(pb)} (average exactly ${ex(pb)}), ${k} were actually spam. What is the calibration gap |${V("ȳ")} − ${V("p̄")}| for this bin?`,
            steps: [
              `Observed frequency ${V("ȳ")} = ${fq(k, nb)}.`,
              `Gap = |${ex(yb)} − ${ex(pb)}| = ${ex(gap)}. The filter is ${yb.cmp(pb) < 0 ? "overconfident here: it predicts spam more strongly than spam occurs" : "underconfident here: spam is more common than it predicts"}.`,
            ],
            answer: { kind: "number", value: gap.value }, answerText: ex(gap), answerInput: exIn(gap),
            vals: { yb: fv(yb), gap: fv(gap) }, params: { nb, pb: fv(pb), k },
          };
        }
        if (level === 2) {
          for (;;) {
            const ns = range(3).map(() => r.pick([10, 20, 25, 40, 50])), N = sumN(ns);
            const pb = [F(r.int(1, 3), 10), F(r.int(4, 6), 10), F(r.int(7, 9), 10)];
            const ks = ns.map((nb, i) => Math.max(0, Math.min(nb, Math.round(nb * pb[i].value) + r.int(-4, 4))));
            const yb = ks.map((k, i) => F(k, ns[i])), gaps = yb.map((q, i) => q.sub(pb[i]).abs()), terms = gaps.map((g, i) => g.mul(F(ns[i], N)));
            const ece = sumF(terms);
            if (places(ece) > 6 || ece.n === 0) continue;
            return {
              prompt: `A model's predictions are grouped into three confidence bins: ${M.table(["bin", "count", `mean prediction ${V("p̄")}`, "positives"], range(3).map((i) => [LET[i], String(ns[i]), ex(pb[i]), String(ks[i])]))} Find the expected calibration error ECE = Σ ${M.frac(`${V("n")}<sub>${V("b")}</sub>`, V("n"))}|${V("ȳ")}<sub>${V("b")}</sub> − ${V("p̄")}<sub>${V("b")}</sub>|.`,
              steps: [
                `Observed frequencies: ${yb.map((q, i) => `${LET[i]}: ${M.frac(String(ks[i]), String(ns[i]))} = ${ex(q)}`).join("; ")}.`,
                `Gaps |${V("ȳ")} − ${V("p̄")}|: ${gaps.map((g) => ex(g)).join(", ")}.`,
                `Weight by bin size (${V("n")} = ${N}): ${gaps.map((g, i) => `${M.frac(String(ns[i]), String(N))} · ${ex(g)}`).join(" + ")} = ${ex(ece)}.`,
              ],
              answer: { kind: "number", value: ece.value }, answerText: ex(ece), answerInput: exIn(ece),
              vals: { yb: fvs(yb), gaps: fvs(gaps), N, ece: fv(ece) }, params: { ns, pb: fvs(pb), ks },
            };
          }
        }
        for (;;) {
          if (r.chance(0.5)) {
            const z = [F(r.int(10, 40), 10), F(r.int(-10, 10), 10)], T = r.pick([F(3, 2), F(2), F(5, 2), F(3)]);
            const d = z[0].sub(z[1]), dT = d.div(T), p1 = sigma(d.value), pT = sigma(dT.value);
            if (d.n <= 0 || near(pT, 3)) continue;
            return {
              prompt: `An overconfident image classifier outputs logits ${V("z")} = ${vec(z)} for (cat, dog). Temperature scaling with ${V("T")} = ${ex(T)} replaces them by ${V("z")}/${V("T")} before the softmax. Find the calibrated probability of "cat". Round to 3 decimal places.`,
              steps: [
                `With two classes, softmax gives P(cat) = ${M.frac("1", `1 + ${M.sup("e", `−(${V("z")}₁ − ${V("z")}₂)/${V("T")}`)}`)}.`,
                `${V("z")}₁ − ${V("z")}₂ = ${ex(z[0])} − ${exp_(z[1])} = ${ex(d)}; divided by ${V("T")}: ${ex(d)} ÷ ${ex(T)} = ${ex(dT)}${places(dT) > 6 ? ` ≈ ${ap(dT.value)}` : ""}.`,
                `P(cat) = ${M.frac("1", `1 + ${M.sup("e", `−${places(dT) > 6 ? ap(dT.value) : ex(dT)}`)}`)} ≈ ${M.frac("1", `1 + ${ap(Math.exp(-dT.value))}`)} ≈ ${ap(pT)}.`,
                `Before scaling it was about ${ap(p1, 3)}; the temperature softens the confidence without changing which class wins.`,
              ],
              answer: { kind: "number", value: pT, dp: 3 }, answerText: `≈ ${fixed(pT, 3)}`, answerInput: pT.toFixed(3),
              vals: { d: fv(d), dT: fv(dT), e: Math.exp(-dT.value), pT, p1 }, params: { z: fvs(z), T: fv(T), mode: 0 }, consts: [3],
            };
          }
          const a = F(r.int(5, 30), 10), b = F(r.int(-20, 10), 10), sc = F(r.int(-10, 30), 10), u = a.mul(sc).add(b), pp = sigma(u.value);
          if (near(pp, 3) || u.n === 0) continue;
          return {
            prompt: `Platt scaling maps an SVM score ${V("s")} to a probability ${V("p̂")} = ${V("σ")}(${V("a")}${V("s")} + ${V("b")}), with ${V("a")} = ${ex(a)} and ${V("b")} = ${ex(b)} fitted on held-out data. Find ${V("p̂")} for a score ${V("s")} = ${ex(sc)}. Round to 3 decimal places.`,
            steps: [
              `${V("a")}${V("s")} + ${V("b")} = ${ex(a)} · ${exp_(sc)} + ${exp_(b)} = ${ex(u)}.`,
              `${M.sup("e", `−${exp_(u)}`)} ≈ ${ap(Math.exp(-u.value))}.`,
              `${V("p̂")} = ${M.frac("1", `1 + ${ap(Math.exp(-u.value))}`)} ≈ ${ap(pp)}.`,
            ],
            answer: { kind: "number", value: pp, dp: 3 }, answerText: `≈ ${fixed(pp, 3)}`, answerInput: pp.toFixed(3),
            vals: { u: fv(u), e: Math.exp(-u.value), pp }, params: { a: fv(a), b: fv(b), sc: fv(sc), mode: 1 }, consts: [3],
          };
        }
      },
    },

    // ---- ML.14 Neural networks and backpropagation -----------------------------------------------------------------
    "ML.14": {
      title: "Forward pass and backpropagation",
      generate(r, level) {
        if (level === 1) {
          const x = range(3).map(() => r.int(-3, 4)), w = range(3).map(() => r.int(-3, 3)), b = r.int(-4, 4);
          const prods = x.map((t, i) => t * w[i]), z = sumN(prods) + b, a = Math.max(0, z);
          return {
            prompt: `A neuron with weights ${V("w")} = ${vec(w, M.n)}, bias ${V("b")} = ${M.n(b)} and ReLU activation receives ${V("x")} = ${vec(x, M.n)}. Find its output ${V("a")} = ReLU(${V("w")}<sup>⊤</sup>${V("x")} + ${V("b")}).`,
            steps: [
              `${V("z")} = ${w.map((t, i) => `${M.n(t, { paren: i > 0 })} · ${M.n(x[i], { paren: true })}`).join(" + ")} + ${M.n(b, { paren: true })} = ${prods.map((t, i) => (i === 0 ? M.n(t) : M.term(t, "").trim())).join(" ")}${M.term(b, "")} = ${M.n(z)}.`,
              `ReLU(${M.n(z)}) = max(0, ${M.n(z)}) = ${a}${z < 0 ? ": the unit is inactive for this input" : ""}.`,
            ],
            answer: { kind: "number", value: a }, answerText: String(a), answerInput: String(a),
            vals: { prods, z, a }, params: { x, w, b },
          };
        }
        if (level === 2) {
          const w = F(r.int(-6, 6), 2), x = r.nonzero(-3, 3), y = r.int(-6, 6), eta = r.pick([F(1, 10), F(1, 20), F(1, 100)]);
          const yh = w.mul(x), err = yh.sub(y), g = err.mul(x), nw = w.sub(eta.mul(g));
          return {
            prompt: `A one-weight model ${YH} = ${V("w")}${V("x")} has loss ${V("L")} = ${M.frac("1", "2")}(${YH} − ${V("y")})². With ${V("w")} = ${ex(w)}, training example ${V("x")} = ${M.n(x)}, ${V("y")} = ${M.n(y)} and learning rate ${V("η")} = ${ex(eta)}, find ${V("w")} after one gradient step.`,
            steps: [
              `Forward: ${YH} = ${ex(w)} · ${M.n(x, { paren: true })} = ${ex(yh)}.`,
              `Chain rule: ∂${V("L")}/∂${V("w")} = (${YH} − ${V("y")}) · ${V("x")} = (${ex(yh)} − ${M.n(y, { paren: true })}) · ${M.n(x, { paren: true })} = ${ex(err)} · ${M.n(x, { paren: true })} = ${ex(g)}.`,
              `Update: ${V("w")} ← ${ex(w)} − ${ex(eta)} · ${exp_(g)} = ${ex(nw)}.`,
            ],
            answer: { kind: "number", value: nw.value }, answerText: ex(nw), answerInput: exIn(nw),
            vals: { yh: fv(yh), err: fv(err), g: fv(g), nw: fv(nw) }, params: { w: fv(w), x, y, eta: fv(eta) },
          };
        }
        for (;;) {
          const x = r.nonzero(-3, 3), w1 = r.nonzero(-3, 3), b1 = r.int(-2, 2), w2 = r.nonzero(-3, 3), b2 = r.int(-2, 2), y = r.int(-5, 5);
          const z1 = w1 * x + b1, h = Math.max(0, z1), yh = w2 * h + b2, d = yh - y, gw2 = d * h, dh = w2 * d, rel = z1 > 0 ? 1 : 0, gw1 = dh * rel * x;
          if (z1 === 0 || (z1 < 0 && r.chance(0.7)) || d === 0) continue;
          return {
            prompt: `A tiny network computes ${M.eq(`${V("h")} = ReLU(${V("w")}₁${V("x")} + ${V("b")}₁),  ${YH} = ${V("w")}₂${V("h")} + ${V("b")}₂,  ${V("L")} = ${M.frac("1", "2")}(${YH} − ${V("y")})²`)} with ${V("w")}₁ = ${M.n(w1)}, ${V("b")}₁ = ${M.n(b1)}, ${V("w")}₂ = ${M.n(w2)}, ${V("b")}₂ = ${M.n(b2)}. For the example ${V("x")} = ${M.n(x)}, ${V("y")} = ${M.n(y)}, use backpropagation to find ∂${V("L")}/∂${V("w")}₁.`,
            steps: [
              `Forward: ${V("z")}₁ = ${M.n(w1)} · ${M.n(x, { paren: true })}${M.term(b1, "")} = ${M.n(z1)}; ${V("h")} = ReLU(${M.n(z1)}) = ${h}; ${YH} = ${M.n(w2)} · ${h}${M.term(b2, "")} = ${M.n(yh)}.`,
              `Output error: ∂${V("L")}/∂${YH} = ${YH} − ${V("y")} = ${M.n(yh)} − ${M.n(y, { paren: true })} = ${M.n(d)}. (For comparison, ∂${V("L")}/∂${V("w")}₂ = ${M.n(d)} · ${h} = ${M.n(gw2)}.)`,
              `Back through the output weight: ∂${V("L")}/∂${V("h")} = ${V("w")}₂ · ${M.n(d, { paren: true })} = ${M.n(dh)}. Through the ReLU: its slope at ${V("z")}₁ = ${M.n(z1)} is ${rel}, so ∂${V("L")}/∂${V("z")}₁ = ${M.n(dh * rel)}.`,
              `∂${V("L")}/∂${V("w")}₁ = ∂${V("L")}/∂${V("z")}₁ · ${V("x")} = ${M.n(dh * rel)} · ${M.n(x, { paren: true })} = ${M.n(gw1)}${rel ? "" : ": the ReLU is off, so no gradient reaches the first layer"}.`,
            ],
            answer: { kind: "number", value: gw1 }, answerText: M.n(gw1), answerInput: String(gw1),
            vals: { z1, h, yh, d, gw2, dh, rel, dz: dh * rel, gw1 }, params: { x, w1, b1, w2, b2, y },
          };
        }
      },
    },

    // ---- ML.activations Activation functions ----------------------------------------------------------------------
    "ML.activations": {
      title: "Activation functions and their derivatives",
      generate(r, level) {
        if (level === 1) {
          const kind = r.pick(["sigmoid", "tanh", "leaky"]);
          if (kind === "leaky") {
            const z = F(r.nonzero(-12, 12), 2), al = r.pick([F(1, 100), F(1, 10), F(1, 5)]), out = z.n > 0 ? z : al.mul(z), slope = z.n > 0 ? F(1) : al;
            return {
              prompt: `For leaky ReLU, max(${V("α")}${V("z")}, ${V("z")}) with ${V("α")} = ${ex(al)}, find the output and the derivative at ${V("z")} = ${ex(z)}. Enter the output, then the derivative.`,
              steps: [
                `${V("z")} = ${ex(z)} is ${z.n > 0 ? "positive, so the output is " + ex(z) + " itself" : `negative, so the output is ${V("α")}${V("z")} = ${ex(al)} · ${exp_(z)} = ${ex(out)}`}.`,
                `The slope is ${z.n > 0 ? "1 on the positive side" : `${V("α")} = ${ex(al)} on the negative side (not 0, so the unit cannot die)`}.`,
              ],
              answer: { kind: "numbers", values: [out.value, slope.value], ordered: true }, answerText: `${ex(out)}, ${ex(slope)}`, answerInput: `${exIn(out)}, ${exIn(slope)}`,
              vals: { out: fv(out), slope: fv(slope) }, params: { z: fv(z), al: fv(al), kind },
            };
          }
          const sv = kind === "sigmoid" ? r.pick([F(1, 2), F(3, 4), F(1, 4), F(4, 5), F(1, 5), F(9, 10), F(2, 3)]) : r.pick([F(1, 2), F(-1, 2), F(3, 5), F(-4, 5), F(1, 3), F(9, 10)]);
          const dv = kind === "sigmoid" ? sv.mul(F(1).sub(sv)) : F(1).sub(sv.mul(sv));
          return {
            prompt: kind === "sigmoid" ? `At some input, a sigmoid unit outputs ${V("σ")}(${V("z")}) = ${M.f(sv)}. Find its derivative ${V("σ")}′(${V("z")}) there. Give an exact fraction.`
              : `At some input, a tanh unit outputs tanh ${V("z")} = ${M.f(sv)}. Find the derivative of tanh there. Give an exact fraction.`,
            steps: kind === "sigmoid" ? [
              `${V("σ")}′ = ${V("σ")}(1 − ${V("σ")}), so no exponential is needed.`,
              `${M.f(sv)} · (1 − ${M.f(sv)}) = ${M.f(sv)} · ${M.f(F(1).sub(sv))} = ${M.f(dv)}${sv.eq(F(1, 2)) ? ", the largest a sigmoid's slope can be" : ""}.`,
            ] : [
              `tanh′ = 1 − tanh², so only the output is needed.`,
              `1 − ${M.sup(`(${M.f(sv)})`, 2)} = 1 − ${M.f(sv.mul(sv))} = ${M.f(dv)}.`,
            ],
            answer: { kind: "number", value: dv.value }, answerText: M.f(dv), answerInput: ty(dv),
            vals: { sv2: fv(kind === "sigmoid" ? F(1).sub(sv) : sv.mul(sv)), dv: fv(dv) }, params: { sv: fv(sv), kind },
          };
        }
        if (level === 2) {
          for (;;) {
            const den = r.pick([4, 5, 6, 8, 10]), a = r.int(1, den - 2), b = r.int(1, den - a - 1), s = [F(a, den), F(b, den), F(den - a - b, den)];
            const k = r.int(0, 2), j = r.chance(0.4) ? k : r.intExcept(0, 2, k);
            const val = k === j ? s[k].mul(F(1).sub(s[k])) : s[k].mul(s[j]).neg();
            return {
              prompt: `A softmax layer outputs ${V("s")} = ${vec(s, (q) => M.f(q))}. Using ${M.eq(`${M.frac(`∂${V("s")}<sub>${V("k")}</sub>`, `∂${V("z")}<sub>${V("j")}</sub>`)} = ${V("s")}<sub>${V("k")}</sub>(${V("δ")}<sub>${V("k")}${V("j")}</sub> − ${V("s")}<sub>${V("j")}</sub>),`)} find ∂${V("s")}${ix(k + 1)}/∂${V("z")}${ix(j + 1)}. Give an exact fraction.`,
              steps: k === j ? [
                `Here ${V("k")} = ${V("j")}, so ${V("δ")} = 1 and the entry is ${V("s")}${ix(k + 1)}(1 − ${V("s")}${ix(k + 1)}).`,
                `${M.f(s[k])} · ${M.f(F(1).sub(s[k]))} = ${M.f(val)}: raising a class's own logit raises its probability.`,
              ] : [
                `Here ${V("k")} ≠ ${V("j")}, so ${V("δ")} = 0 and the entry is −${V("s")}${ix(k + 1)}${V("s")}${ix(j + 1)}.`,
                `−${M.f(s[k])} · ${M.f(s[j])} = ${M.f(val)}: raising another class's logit takes probability away from this one.`,
              ],
              answer: { kind: "number", value: val.value }, answerText: M.f(val), answerInput: ty(val),
              vals: { s: fvs(s), one: fv(F(1).sub(s[k])), val: fv(val) }, params: { s: fvs(s), k, j },
            };
          }
        }
        const L = r.int(3, 5), ss = range(L).map(() => r.pick([F(1, 2), F(1, 3), F(2, 3), F(1, 4), F(3, 4), F(1, 5), F(4, 5)]));
        const ds = ss.map((q) => q.mul(F(1).sub(q))), prod = ds.reduce((a, b) => a.mul(b), F(1)), bound = F(1, Math.pow(4, L));
        return {
          prompt: `A gradient passes backward through ${L} stacked sigmoid units (each weight equal to 1). Their outputs during the forward pass were ${M.eq(listTxt(ss, (q) => M.f(q)))} By what factor is the gradient multiplied on the way through? Give an exact fraction.`,
          steps: [
            `Each unit multiplies the gradient by its local slope ${V("σ")}′ = ${V("σ")}(1 − ${V("σ")}): ${ss.map((q, i) => `${M.f(q)} · ${M.f(F(1).sub(q))} = ${M.f(ds[i])}`).join("; ")}.`,
            `Chain rule: multiply them: ${ds.map((q) => M.f(q)).join(" × ")} = ${M.f(prod)}.`,
            `Each factor is at most ${M.f(F(1, 4))}, so after ${L} layers the factor can be no larger than ${M.sup(`(${M.f(F(1, 4))})`, L)} = ${M.f(bound)}: the vanishing-gradient problem that ReLU avoids.`,
          ],
          answer: { kind: "number", value: prod.value }, answerText: M.f(prod), answerInput: ty(prod),
          vals: { one: fvs(ss.map((q) => F(1).sub(q))), ds: fvs(ds), prod: fv(prod), bound: fv(bound) }, params: { ss: fvs(ss), L }, consts: [4],
        };
      },
    },

    // ---- ML.15 Softmax and cross-entropy ------------------------------------------------------------------------------
    "ML.15": {
      title: "Softmax and cross-entropy",
      generate(r, level) {
        const CL = ["cat", "dog", "bird"];
        if (level === 1) {
          for (;;) {
            const a = r.int(1, 7), b = r.int(1, 9 - a - 1), ps = [F(a, 10), F(b, 10), F(10 - a - b, 10)], t = r.int(0, 2), L = -Math.log(ps[t].value);
            if (near(L, 3)) continue;
            return {
              prompt: `An image classifier's softmax output for (cat, dog, bird) is ${vec(ps)}. The image is a ${CL[t]}. Find the cross-entropy loss. Round to 3 decimal places.`,
              steps: [
                `With a one-hot label only the true class counts: ${V("L")} = −ln ${V("p̂")}<sub>${CL[t]}</sub>.`,
                `${V("L")} = −ln ${ex(ps[t])} ≈ ${ap(L)}.`,
              ],
              answer: { kind: "number", value: L, dp: 3 }, answerText: `≈ ${fixed(L, 3)}`, answerInput: L.toFixed(3),
              vals: { L }, params: { ps: fvs(ps), t }, consts: [3],
            };
          }
        }
        for (;;) {
          const z = range(3).map(() => r.int(-2, 4)), m = Math.max(...z), sh = z.map((t) => t - m), ex_ = sh.map((t) => Math.exp(t)), S = sumN(ex_);
          const p = ex_.map((t) => t / S), t = r.int(0, 2);
          if (new Set(z).size < 2) continue;
          if (level === 2) {
            if (near(p[t], 3)) continue;
            return {
              prompt: `A classifier outputs logits ${V("z")} = ${vec(z, M.n)} for (cat, dog, bird). Find the softmax probability of "${CL[t]}". Round to 3 decimal places.`,
              steps: [
                `Subtract the largest logit (${M.n(m)}) first; this does not change the softmax but keeps the exponentials small: ${listTxt(sh, M.n)}.`,
                `Exponentials: ${sh.map((u, i) => `${M.sup("e", M.n(u))} ≈ ${ap(ex_[i])}`).join(", ")}; their sum ≈ ${ap(S)}.`,
                `${V("p̂")}<sub>${CL[t]}</sub> ≈ ${ap(ex_[t])} ÷ ${ap(S)} ≈ ${ap(p[t])}.`,
              ],
              answer: { kind: "number", value: p[t], dp: 3 }, answerText: `≈ ${fixed(p[t], 3)}`, answerInput: p[t].toFixed(3),
              vals: { m, sh, ex: ex_, S, p }, params: { z, t, mode: 0 }, consts: [3],
            };
          }
          if (r.chance(0.5)) {
            const g = p.map((q, i) => q - (i === t ? 1 : 0));
            if (g.some((v) => near(v, 3))) continue;
            return {
              prompt: `A classifier outputs logits ${V("z")} = ${vec(z, M.n)} for (cat, dog, bird); the image is a ${CL[t]}. With softmax and cross-entropy, ∂${V("L")}/∂${V("z")} = ${V("p̂")} − ${V("y")}. Find the full gradient vector, rounding each entry to 3 decimal places.`,
              steps: [
                `Softmax (after subtracting the max ${M.n(m)}): exponentials ${listTxt(ex_, ap)}, sum ≈ ${ap(S)}, so ${V("p̂")} ≈ ${vec(p, ap)}.`,
                `The one-hot label is ${V("y")} = ${vec(CL.map((_, i) => (i === t ? 1 : 0)), String)}.`,
                `${V("p̂")} − ${V("y")} ≈ ${vec(g, ap)}: the true class's logit is pushed up, the others down.`,
              ],
              answer: { kind: "numbers", values: g, ordered: true, dp: 3 }, answerText: `≈ ${vec(g, (v) => fixed(v, 3))}`, answerInput: g.map((v) => v.toFixed(3)).join(", "),
              vals: { m, ex: ex_, S, p, g }, params: { z, t, mode: 1 }, consts: [3],
            };
          }
          const T = r.pick([F(1, 2), F(2), F(3)]), zt = z.map((u) => F(u).div(T)), mt = Math.max(...zt.map((q) => q.value)), et = zt.map((q) => Math.exp(q.value - mt)), St = sumN(et), pt = et.map((u) => u / St);
          if (near(pt[t], 3)) continue;
          return {
            prompt: `A language model's logits for the candidate next tokens A, B and C are ${vec(z, M.n)}. Sampling uses temperature ${V("T")} = ${ex(T)}: ${V("p̂")}<sub>${V("k")}</sub> ∝ ${M.sup("e", `${V("z")}<sub>${V("k")}</sub>/${V("T")}`)}. Find the probability of token ${LET[t]}. Round to 3 decimal places.`,
            steps: [
              `Scaled logits ${V("z")}/${V("T")}: ${listTxt(zt)}. Subtract the largest (${ap(mt)}) before exponentiating.`,
              `Exponentials ≈ ${listTxt(et, ap)}; sum ≈ ${ap(St)}.`,
              `${V("p̂")} ≈ ${ap(et[t])} ÷ ${ap(St)} ≈ ${ap(pt[t])}. ${T.cmp(1) < 0 ? `${V("T")} &lt; 1 sharpens the distribution toward the top token.` : `${V("T")} &gt; 1 flattens the distribution.`}`,
            ],
            answer: { kind: "number", value: pt[t], dp: 3 }, answerText: `≈ ${fixed(pt[t], 3)}`, answerInput: pt[t].toFixed(3),
            vals: { zt: fvs(zt), mt, et, St, pt }, params: { z, t, T: fv(T), mode: 2 }, consts: [3],
          };
        }
      },
    },

    // ---- ML.init Weight initialization ----------------------------------------------------------------------------
    "ML.init": {
      title: "Xavier and He initialization",
      generate(r, level) {
        if (level === 1) {
          const nin = r.pick([64, 100, 128, 200, 256, 300, 512]), nout = r.pick([32, 50, 64, 100, 128, 256]), he = r.chance(0.5);
          const v = he ? F(2, nin) : F(2, nin + nout);
          return {
            prompt: `A dense layer has ${V("n")}<sub>in</sub> = ${nin} inputs and ${V("n")}<sub>out</sub> = ${nout} outputs and uses ${he ? "ReLU" : "tanh"}. Using ${he ? "He" : "Xavier (Glorot)"} initialization, what variance should the weights have? Give an exact value.`,
            steps: [
              he ? `He initialization, for ReLU: Var(${V("w")}) = ${M.frac("2", `${V("n")}<sub>in</sub>`)}. The 2 makes up for ReLU zeroing half its inputs.`
                : `Xavier, for tanh or sigmoid: Var(${V("w")}) = ${M.frac("2", `${V("n")}<sub>in</sub> + ${V("n")}<sub>out</sub>`)}.`,
              he ? `${M.frac("2", String(nin))} = ${ex(v)}.` : `${M.frac("2", `${nin} + ${nout}`)} = ${M.frac("2", String(nin + nout))} = ${ex(v)}.`,
            ],
            answer: { kind: "number", value: v.value }, answerText: ex(v), answerInput: exIn(v),
            vals: { v: fv(v), s: nin + nout }, params: { nin, nout, he: he ? 1 : 0 },
          };
        }
        if (level === 2) {
          for (;;) {
            const k = r.int(2, 10), tot = 6 * k * k, nin = r.int(Math.ceil(tot * 0.3), Math.floor(tot * 0.7)), nout = tot - nin, a = F(1, k);
            return {
              prompt: `Xavier uniform initialization draws weights from ${V("U")}[−${V("a")}, ${V("a")}] with ${V("a")} = ${M.sqrt(M.frac("6", `${V("n")}<sub>in</sub> + ${V("n")}<sub>out</sub>`))}. For a layer with ${nin} inputs and ${nout} outputs, find ${V("a")}. Give an exact value.`,
              steps: [
                `${V("n")}<sub>in</sub> + ${V("n")}<sub>out</sub> = ${nin} + ${nout} = ${tot}.`,
                `${V("a")} = ${M.sqrt(M.frac("6", String(tot)))} = ${M.sqrt(M.frac("1", String(k * k)))} = ${M.f(a)}.`,
                `Check: a uniform on [−${V("a")}, ${V("a")}] has variance ${M.frac(M.sup(V("a"), 2), "3")} = ${M.f(a.mul(a).div(3))}, which equals ${M.frac("2", String(tot))} = ${M.f(F(2, tot))}, the Xavier variance.`,
              ],
              answer: { kind: "number", value: a.value }, answerText: M.f(a), answerInput: ty(a),
              vals: { tot, kk: k * k, a: fv(a), v: fv(F(2, tot)) }, params: { nin, nout }, consts: [6, 3],
            };
          }
        }
        for (;;) {
          const nin = r.pick([64, 100, 128, 256, 400, 500]), fac = r.pick([F(1, 2), F(2), F(3, 2), F(2, 3)]), vw = fac.div(nin), L = r.int(3, 8), vx = r.pick([1, 2]);
          const gain = fac.pow(L), vz = gain.mul(vx);
          if (gain.n > 5000 || gain.d > 5000) continue;
          return {
            prompt: `A deep network has ${L} linear layers (no activations), each with ${nin} inputs. The weights are drawn with variance ${ex(vw)}, independent of the inputs, all with mean 0. The input features have variance ${vx}. Using Var(${V("z")}) = ${V("n")}<sub>in</sub> Var(${V("w")}) Var(${V("x")}) layer by layer, what is the variance of the final layer's outputs? Give an exact value.`,
            steps: [
              `Each layer multiplies the variance by ${V("n")}<sub>in</sub> Var(${V("w")}) = ${nin} · ${ex(vw)} = ${ex(fac)}.`,
              `After ${L} layers: ${vx} · ${M.sup(`(${ex(fac)})`, L)} = ${vx} · ${ex(gain)} = ${ex(vz)}.`,
              `${fac.cmp(1) > 0 ? "The signal explodes" : "The signal vanishes"}; choosing Var(${V("w")}) = ${M.frac("1", String(nin))} would keep the factor at 1.`,
            ],
            answer: { kind: "number", value: vz.value }, answerText: ex(vz), answerInput: exIn(vz),
            vals: { fac: fv(fac), gain: fv(gain), vz: fv(vz) }, params: { nin, vw: fv(vw), L, vx },
          };
        }
      },
    },

    // ---- ML.dropout Dropout and normalization -----------------------------------------------------------------------
    "ML.dropout": {
      title: "Inverted dropout, batch norm and layer norm",
      generate(r, level) {
        const devs = () => {
          for (;;) {
            const d = range(4).map(() => r.int(-6, 6)), s2 = sumN(d.map((t) => t * t)) / 4, sd = Math.round(Math.sqrt(s2));
            if (sumN(d) === 0 && sd > 0 && sd * sd === s2 && new Set(d).size > 1) return { d, s2, sd };
          }
        };
        if (level === 1) {
          for (;;) {
            const p = r.pick([F(1, 2), F(1, 4), F(1, 5), F(1, 10)]), h = range(4).map(() => F(r.int(1, 12), 2)), m = range(4).map(() => (r.chance(0.6) ? 1 : 0));
            if (!m.includes(1) || !m.includes(0)) continue;
            const keep = F(1).sub(p), out = h.map((q, i) => (m[i] ? q.div(keep) : F(0)));
            if (!out.every((q) => places(q) <= 4)) continue;
            return {
              prompt: `During training, inverted dropout with drop probability ${V("p")} = ${ex(p)} is applied to activations ${V("h")} = ${vec(h)} with the random keep-mask ${V("m")} = ${vec(m, String)}. Find the output ${M.frac(`${V("m")} ⊙ ${V("h")}`, `1 − ${V("p")}`)}. Enter all four entries.`,
              steps: [
                `Dropped units (mask 0) output 0.`,
                `Kept units are divided by 1 − ${V("p")} = ${ex(keep)}, so the expected activation stays the same: ${h.map((q, i) => (m[i] ? `${ex(q)} ÷ ${ex(keep)} = ${ex(out[i])}` : null)).filter(Boolean).join("; ")}.`,
                `Output: ${vec(out)}. At test time nothing is dropped or rescaled.`,
              ],
              answer: { kind: "numbers", values: out.map((q) => q.value), ordered: true }, answerText: vec(out), answerInput: out.map(exIn).join(", "),
              vals: { keep: fv(keep), out: fvs(out) }, params: { p: fv(p), h: fvs(h), m },
            };
          }
        }
        if (level === 2) {
          const mu = r.int(-5, 10), { d, s2, sd } = devs(), xs = d.map((t) => mu + t), i = r.int(0, 3);
          const gam = r.pick([F(1, 2), F(2), F(3, 2), F(3)]), bet = F(r.int(-4, 4), 2), xh = F(d[i], sd), y = gam.mul(xh).add(bet);
          return {
            prompt: `Batch normalization sees one feature's values in a mini-batch: ${M.eq(listTxt(xs, M.n))} With ${V("γ")} = ${ex(gam)}, ${V("β")} = ${ex(bet)} and ${V("ϵ")} negligible, find the output for the value ${M.n(xs[i])}.`,
            steps: [
              `Batch mean ${V("μ")}<sub>B</sub> = (${xs.map((t) => M.n(t, { paren: true })).join(" + ")}) ÷ ${4} = ${M.n(mu)}.`,
              `Deviations ${listTxt(d, M.n)}; batch variance ${V("σ")}²<sub>B</sub> = (${d.map((t) => M.sup(M.n(t, { paren: true }), 2)).join(" + ")}) ÷ ${4} = ${s2}, so ${V("σ")}<sub>B</sub> = ${sd}.`,
              `Normalize: ${V("x̂")} = ${M.frac(`${M.n(xs[i])} − ${M.n(mu, { paren: true })}`, String(sd))} = ${ex(xh)}.`,
              `Scale and shift: ${V("y")} = ${ex(gam)} · ${exp_(xh)} + ${exp_(bet)} = ${ex(y)}.`,
            ],
            answer: { kind: "number", value: y.value }, answerText: ex(y), answerInput: exIn(y),
            vals: { mu, d, s2, sd, xh: fv(xh), y: fv(y) }, params: { xs, i, gam: fv(gam), bet: fv(bet) }, consts: [4],
          };
        }
        const mu = r.int(-3, 6), { d, s2, sd } = devs(), xs = d.map((t) => mu + t);
        const gam = range(4).map(() => r.pick([F(1), F(2), F(1, 2)])), bet = range(4).map(() => F(r.int(-2, 2)));
        const xh = d.map((t) => F(t, sd)), y = xh.map((q, i) => q.mul(gam[i]).add(bet[i]));
        return {
          prompt: `Layer normalization normalizes one token's ${4} features across the features, then applies per-feature ${V("γ")} and ${V("β")}. For ${V("x")} = ${vec(xs, M.n)}, ${V("γ")} = ${vec(gam)} and ${V("β")} = ${vec(bet)} (with ${V("ϵ")} negligible), find the output vector.`,
          steps: [
            `Mean over the features: ${V("μ")} = (${xs.map((t) => M.n(t, { paren: true })).join(" + ")}) ÷ ${4} = ${M.n(mu)}.`,
            `Deviations ${listTxt(d, M.n)}; variance (${d.map((t) => M.sup(M.n(t, { paren: true }), 2)).join(" + ")}) ÷ ${4} = ${s2}, standard deviation ${sd}.`,
            `Normalized: ${V("x̂")} = ${vec(xh)}.`,
            `${V("y")} = ${V("γ")} ⊙ ${V("x̂")} + ${V("β")}: ${xh.map((q, i) => `${ex(gam[i])} · ${exp_(q)} + ${exp_(bet[i])} = ${ex(y[i])}`).join("; ")}.`,
          ],
          answer: { kind: "numbers", values: y.map((q) => q.value), ordered: true }, answerText: vec(y), answerInput: y.map(exIn).join(", "),
          vals: { mu, d, s2, sd, xh: fvs(xh), y: fvs(y) }, params: { xs, gam: fvs(gam), bet: fvs(bet) }, consts: [4],
        };
      },
    },

    // ---- ML.16 SGD, momentum and Adam ------------------------------------------------------------------------------
    "ML.16": {
      title: "SGD, momentum and Adam updates",
      generate(r, level) {
        const TH = V("θ");
        if (level === 1) {
          const th = range(2).map(() => F(r.int(-20, 20), 10)), g = range(2).map(() => F(r.int(-30, 30), 10)), eta = r.pick([F(1, 10), F(1, 100), F(1, 2), F(1, 20)]);
          const nt = th.map((q, i) => q.sub(eta.mul(g[i])));
          return {
            prompt: `Parameters ${TH} = ${vec(th)} have mini-batch gradient ${V("g")} = ${vec(g)}. Take one SGD step with learning rate ${V("η")} = ${ex(eta)}. Enter the new ${TH}.`,
            steps: [
              `${TH} ← ${TH} − ${V("η")}${V("g")}. Step sizes ${V("η")}${V("g")} = ${vec(g.map((q) => eta.mul(q)))}.`,
              `${th.map((q, i) => `${ex(q)} − ${exp_(eta.mul(g[i]))} = ${ex(nt[i])}`).join("; ")}.`,
            ],
            answer: { kind: "numbers", values: nt.map((q) => q.value), ordered: true }, answerText: vec(nt), answerInput: nt.map(exIn).join(", "),
            vals: { st: fvs(g.map((q) => eta.mul(q))), nt: fvs(nt) }, params: { th: fvs(th), g: fvs(g), eta: fv(eta) },
          };
        }
        if (level === 2) {
          const th = F(r.int(-20, 20), 10), g1 = F(r.int(-20, 20), 10), g2 = F(r.int(-20, 20), 10), beta = F(9, 10), eta = r.pick([F(1, 10), F(1, 2)]);
          const v1 = g1, t1 = th.sub(eta.mul(v1)), bv = beta.mul(v1), v2 = bv.add(g2), t2 = t1.sub(eta.mul(v2));
          return {
            prompt: `SGD with momentum (${V("v")} ← ${V("β")}${V("v")} + ∇${V("L")}, ${TH} ← ${TH} − ${V("η")}${V("v")}) starts at ${TH} = ${ex(th)}, ${V("v")} = 0, with ${V("β")} = ${ex(beta)} and ${V("η")} = ${ex(eta)}. The next two gradients are ${ex(g1)} and ${ex(g2)}. Find ${TH} after both steps.`,
            steps: [
              `Step 1: ${V("v")} = ${ex(beta)} · 0 + ${exp_(g1)} = ${ex(v1)}; ${TH} = ${ex(th)} − ${ex(eta)} · ${exp_(v1)} = ${ex(t1)}.`,
              `Step 2: ${V("v")} = ${ex(beta)} · ${exp_(v1)} + ${exp_(g2)} = ${ex(bv)} + ${exp_(g2)} = ${ex(v2)}; ${TH} = ${ex(t1)} − ${ex(eta)} · ${exp_(v2)} = ${ex(t2)}.`,
              `The velocity carries most of the first gradient into the second step, smoothing the direction.`,
            ],
            answer: { kind: "number", value: t2.value }, answerText: ex(t2), answerInput: exIn(t2),
            vals: { v1: fv(v1), t1: fv(t1), bv: fv(bv), v2: fv(v2), t2: fv(t2) }, params: { th: fv(th), g1: fv(g1), g2: fv(g2), beta: fv(beta), eta: fv(eta) },
          };
        }
        for (;;) {
          const th = range(2).map(() => F(r.int(-20, 20), 10)), g = [F(r.nonzero(-50, 50), 10), F(r.nonzero(-5, 5), 10)], eta = r.pick([F(1, 100), F(1, 1000)]), lam = F(1, 10);
          const b1 = F(9, 10), b2 = F(999, 1000);
          const m = g.map((q) => F(1).sub(b1).mul(q)), v = g.map((q) => F(1).sub(b2).mul(q).mul(q)), mh = m.map((q) => q.div(F(1).sub(b1))), vh = v.map((q) => q.div(F(1).sub(b2)));
          const ratio = mh.map((q) => F(Math.sign(q.n))), nt = th.map((q, i) => q.sub(eta.mul(ratio[i].add(lam.mul(q)))));
          return {
            prompt: `AdamW takes its first step (${V("t")} = 1) from ${TH} = ${vec(th)} with gradient ${V("g")} = ${vec(g)}, using ${V("β")}₁ = ${ex(b1)}, ${V("β")}₂ = ${ex(b2)}, ${V("η")} = ${ex(eta)}, weight decay ${V("λ")} = ${ex(lam)} and ${V("ϵ")} negligible: ${M.eq(`${TH} ← ${TH} − ${V("η")}(${M.frac(V("m̂"), M.sqrt(V("v̂")))} + ${V("λ")}${TH}).`)} Find the new ${TH}.`,
            steps: [
              `Moments from zero: ${V("m")} = (1 − ${ex(b1)})${V("g")} = ${vec(m)}; ${V("v")} = (1 − ${ex(b2)})${M.sup(V("g"), 2)} = ${vec(v)}.`,
              `Bias correction at ${V("t")} = 1 divides by 1 − ${V("β")}: ${V("m̂")} = ${vec(mh)} = ${V("g")}, ${V("v̂")} = ${vec(vh)} = ${M.sup(V("g"), 2)}.`,
              `So ${M.frac(V("m̂"), M.sqrt(V("v̂")))} = ${M.frac(V("g"), `|${V("g")}|`)} = ${vec(ratio, M.n)}: the first step has size ${V("η")} in every coordinate, however different the gradients' scales.`,
              `${th.map((q, i) => `${ex(q)} − ${ex(eta)}(${M.n(ratio[i].n)} + ${ex(lam)} · ${exp_(q)}) = ${ex(nt[i])}`).join("; ")}.`,
            ],
            answer: { kind: "numbers", values: nt.map((q) => q.value), ordered: true }, answerText: vec(nt), answerInput: nt.map(exIn).join(", "),
            vals: { m: fvs(m), v: fvs(v), mh: fvs(mh), vh: fvs(vh), ratio: fvs(ratio), nt: fvs(nt) }, params: { th: fvs(th), g: fvs(g), eta: fv(eta), lam: fv(lam), b1: fv(b1), b2: fv(b2) },
          };
        }
      },
    },

    // ---- ML.training Schedules, clipping and early stopping ---------------------------------------------------------
    "ML.training": {
      title: "Learning-rate schedules, clipping and early stopping",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const e0 = r.pick([F(1, 10), F(1, 100), F(1, 1000), F(3, 10)]), gam = r.pick([F(1, 10), F(1, 2)]), st = r.pick([10, 20, 30]), t = r.int(1, 99);
            const k = Math.floor(t / st), et = e0.mul(gam.pow(k));
            if (places(et) > 6 || k === 0 && r.chance(0.7)) continue;
            return {
              prompt: `A step-decay schedule ${V("η")}<sub>${V("t")}</sub> = ${V("η")}₀ ${M.sup(V("γ"), `⌊${V("t")}/${V("s")}⌋`)} starts at ${V("η")}₀ = ${ex(e0)} and multiplies by ${V("γ")} = ${ex(gam)} every ${V("s")} = ${st} epochs. What is the learning rate at epoch ${V("t")} = ${t}?`,
              steps: [
                `⌊${t}/${st}⌋ = ${k}: the rate has been cut ${k} time${k === 1 ? "" : "s"}.`,
                `${V("η")} = ${ex(e0)} · ${M.sup(ex(gam), k)} = ${ex(e0)} · ${ex(gam.pow(k))} = ${ex(et)}.`,
              ],
              answer: { kind: "number", value: et.value }, answerText: ex(et), answerInput: exIn(et),
              vals: { k, gk: fv(gam.pow(k)), et: fv(et) }, params: { e0: fv(e0), gam: fv(gam), st, t },
            };
          }
        }
        if (level === 2) {
          const [a, b, c] = r.pick([[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 6, 10], [12, 5, 13], [9, 12, 15]]);
          const g = [a * r.sign(), b * r.sign()], cap = r.pick([1, 2, 3, 4, 5].filter((t) => t < c)), sc = F(cap, c), out = g.map((t) => sc.mul(t));
          return {
            prompt: `A gradient ${V("g")} = ${vec(g, M.n)} is clipped by norm with threshold ${V("c")} = ${cap}: ${V("g")} ← ${V("g")} · min(1, ${V("c")}/‖${V("g")}‖). Find the clipped gradient. Give exact values.`,
            steps: [
              `‖${V("g")}‖ = ${M.sqrt(g.map((t) => M.sup(M.n(t, { paren: true }), 2)).join(" + "))} = ${c}, which exceeds ${cap}, so the gradient is rescaled.`,
              `Scale factor ${M.frac(String(cap), String(c))}: ${g.map((t, i) => `${M.n(t)} · ${M.frac(String(cap), String(c))} = ${ex(out[i])}`).join(", ")}.`,
              `The clipped gradient ${vec(out)} keeps its direction and has length ${cap}.`,
            ],
            answer: { kind: "numbers", values: out.map((q) => q.value), ordered: true }, answerText: vec(out), answerInput: out.map(exIn).join(", "),
            vals: { c, sc: fv(sc), out: fvs(out) }, params: { g, cap },
          };
        }
        if (r.chance(0.5)) {
          const [num, den, cosv] = r.pick([[1, 3, F(1, 2)], [1, 2, F(0)], [2, 3, F(-1, 2)], [1, 1, F(-1)], [0, 1, F(1)]]);
          const T = r.pick([30, 60, 90, 120]), t = (T * num) / den, emax = r.pick([F(1, 10), F(1, 100), F(3, 1000), F(6, 1000)]), emin = r.pick([F(0), F(1, 1000), F(1, 10000)]);
          const eta = emin.add(F(1, 2).mul(emax.sub(emin)).mul(F(1).add(cosv)));
          const ang = num === 0 ? "0" : `${num === 1 ? "" : num}π${den === 1 ? "" : `/${den}`}`;
          return {
            prompt: `A cosine schedule ${M.eq(`${V("η")}<sub>${V("t")}</sub> = ${V("η")}<sub>min</sub> + ${M.frac("1", "2")}(${V("η")}<sub>max</sub> − ${V("η")}<sub>min</sub>)(1 + cos ${M.frac(`π${V("t")}`, V("T"))})`)} runs for ${V("T")} = ${T} epochs with ${V("η")}<sub>max</sub> = ${ex(emax)} and ${V("η")}<sub>min</sub> = ${ex(emin)}. Find the learning rate at epoch ${V("t")} = ${t}.`,
            steps: [
              `${M.frac(`π${V("t")}`, V("T"))} = ${M.frac(`${t}π`, String(T))} = ${ang}, and cos ${ang} = ${ex(cosv)}.`,
              `${V("η")}<sub>max</sub> − ${V("η")}<sub>min</sub> = ${ex(emax.sub(emin))}; ${M.frac("1", "2")} · ${ex(emax.sub(emin))} · (1 + ${exp_(cosv)}) = ${ex(eta.sub(emin))}.`,
              `${V("η")} = ${ex(emin)} + ${ex(eta.sub(emin))} = ${ex(eta)}.`,
            ],
            answer: { kind: "number", value: eta.value }, answerText: ex(eta), answerInput: exIn(eta),
            vals: { cosv: fv(cosv), num, den, diff: fv(emax.sub(emin)), part: fv(eta.sub(emin)), eta: fv(eta) }, params: { T, t, emax: fv(emax), emin: fv(emin), mode: 0 },
          };
        }
        for (;;) {
          const E = 12, Pt = r.pick([2, 3]);
          const loss = [];
          let cur = r.int(80, 95);
          for (let e = 0; e < E; e++) { cur = Math.max(20, cur + (e < r.int(4, 8) ? -r.int(2, 9) : r.int(-3, 5))); loss.push(cur); }
          let best = 0, stop = null;
          for (let e = 1; e < E; e++) {
            if (loss[e] < loss[best]) best = e;
            else if (e - best >= Pt) { stop = e; break; }
          }
          if (stop === null || new Set(loss.slice(0, stop + 1)).size < stop + 1 - 2) continue;
          const L = loss.map((t) => F(t, 100)), shown = L;
          return {
            prompt: `A training run's validation loss after epochs 1 to ${E} is plotted and listed below (as if training ran to the end): ${M.eq(listTxt(shown))} Early stopping with patience ${V("P")} = ${Pt} would stop training once ${Pt} epochs in a row fail to beat the best loss so far, and keep the best checkpoint. At which epoch does training stop, and which epoch's checkpoint is kept? Enter the stopping epoch, then the kept epoch.`,
            graph: graph({ view: [0, E + 1, 0, 1], items: [...range(E - 1).map((e) => ({ t: "seg", a: [e + 1, L[e].value], b: [e + 2, L[e + 1].value], role: "primary" })), ...shown.map((q, e) => ({ t: "pt", x: e + 1, y: q.value }))] }),
            steps: [
              `Losses up to the stop: ${shown.slice(0, stop + 1).map((q, e) => `epoch ${e + 1}: ${ex(q)}`).join(", ")}.`,
              `The lowest value up to the stop is ${ex(L[best])} at epoch ${best + 1}; epochs ${range(stop - best).map((k) => best + 2 + k).join(", ")} do not beat it.`,
              `That is ${Pt} epochs without improvement, so training stops after epoch ${stop + 1} and restores the checkpoint from epoch ${best + 1}.`,
            ],
            answer: { kind: "numbers", values: [stop + 1, best + 1], ordered: true }, answerText: `stop after epoch ${stop + 1}; keep epoch ${best + 1}`, answerInput: `${stop + 1}, ${best + 1}`,
            vals: { stop: stop + 1, best: best + 1, epochs: range(stop + 1).map((e) => e + 1), bestL: fv(L[best]) }, params: { loss: fvs(shown), Pt, E, allEp: range(E).map((e) => e + 1), mode: 1 },
          };
        }
      },
    },

    // ---- ML.cnn Convolutional layers -----------------------------------------------------------------------------
    "ML.cnn": {
      title: "Convolution output sizes, parameters and receptive fields",
      generate(r, level) {
        const outSize = (W, Fk, Pd, S) => Math.floor((W - Fk + 2 * Pd) / S) + 1;
        const sizeStep = (W, Fk, Pd, S, O) => `${V("O")} = ⌊${M.frac(`${W} − ${Fk} + 2 · ${Pd}`, String(S))}⌋ + 1 = ⌊${M.frac(String(W - Fk + 2 * Pd), String(S))}⌋ + 1 = ${O}`;
        if (level === 1) {
          for (;;) {
            const W = r.pick([28, 32, 64, 96, 128, 224, 227]), Fk = r.pick([3, 5, 7, 11]), Pd = r.int(0, 3), S = r.pick([1, 2, 4]);
            if (W - Fk + 2 * Pd < 0 || 2 * Pd >= Fk) continue;
            const O = outSize(W, Fk, Pd, S);
            return {
              prompt: `A convolutional layer applies ${Fk}×${Fk} kernels with padding ${V("P")} = ${Pd} and stride ${V("S")} = ${S} to a ${W}×${W} image. What is the output's height (and width)?`,
              steps: [
                `Use ${V("O")} = ⌊${M.frac(`${V("W")} − ${V("F")} + 2${V("P")}`, V("S"))}⌋ + 1 with ${V("W")} = ${W}, ${V("F")} = ${Fk}.`,
                `${sizeStep(W, Fk, Pd, S, O)}. The output is ${O}×${O}.`,
              ],
              answer: { kind: "number", value: O }, answerText: `${O}`, answerInput: String(O),
              vals: { num: W - Fk + 2 * Pd, O }, params: { W, Fk, Pd, S },
            };
          }
        }
        if (level === 2) {
          const Fk = r.pick([1, 3, 5, 7]), Cin = r.pick([1, 3, 16, 32, 64]), Cout = r.pick([8, 16, 32, 64, 128]), W = r.pick([32, 64, 128]);
          const per = Fk * Fk * Cin, params = (per + 1) * Cout;
          return {
            prompt: `A convolutional layer maps a ${W}×${W}×${Cin} input to ${Cout} output channels using ${Fk}×${Fk} kernels with biases. How many learnable parameters does it have?`,
            steps: [
              `Each kernel spans all ${Cin} input channel${Cin === 1 ? "" : "s"}: ${Fk} · ${Fk} · ${Cin} = ${per} weights, plus 1 bias.`,
              `One kernel per output channel: (${per} + 1) · ${Cout} = ${P.grouped(params)}.`,
              `The image size ${W}×${W} does not enter: the same weights slide over every position.`,
            ],
            answer: { kind: "number", value: params }, answerText: P.grouped(params), answerInput: String(params),
            vals: { per, params }, params: { Fk, Cin, Cout, W },
          };
        }
        if (r.chance(0.5)) {
          for (;;) {
            const W = r.pick([32, 64, 96, 128]), F1 = r.pick([3, 5]), P1 = (F1 - 1) / 2, S1 = r.pick([1, 2]), C1 = r.pick([16, 32, 64]), F2 = 3, P2 = r.pick([0, 1]), C2 = 2 * C1;
            const O1 = outSize(W, F1, P1, S1), O2 = outSize(O1, 2, 0, 2), O3 = outSize(O2, F2, P2, 1);
            if (O3 < 2) continue;
            return {
              prompt: `An image classifier takes ${W}×${W}×3 images through: (1) a convolution with ${C1} kernels of size ${F1}×${F1}, padding ${P1}, stride ${S1}; (2) 2×2 max pooling with stride 2; (3) a convolution with ${C2} kernels of size ${F2}×${F2}, padding ${P2}, stride 1. What are the final height (= width) and number of channels? Enter the size, then the channels.`,
              steps: [
                `Layer 1: ${sizeStep(W, F1, P1, S1, O1)}; ${C1} channels.`,
                `Pooling uses the same formula with ${V("P")} = 0: ${sizeStep(O1, 2, 0, 2, O2)}; still ${C1} channels.`,
                `Layer 3: ${sizeStep(O2, F2, P2, 1, O3)}; ${C2} channels, one per kernel.`,
                `Final output: ${O3}×${O3}×${C2}.`,
              ],
              answer: { kind: "numbers", values: [O3, C2], ordered: true }, answerText: `${O3}×${O3}×${C2}`, answerInput: `${O3}, ${C2}`,
              vals: { n1: W - F1 + 2 * P1, O1, n2: O1 - 2, O2, n3: O2 - F2 + 2 * P2, O3, C2 }, params: { W, F1, P1, S1, C1, F2, P2, mode: 0 }, consts: [3],
            };
          }
        }
        const L = r.int(3, 4), Fs = range(L).map(() => r.pick([3, 5])), Ss = range(L).map(() => r.pick([1, 2]));
        const jumps = [], rs = [];
        let rr = 1, j = 1;
        for (let l = 0; l < L; l++) { jumps.push(j); rr += (Fs[l] - 1) * j; rs.push(rr); j *= Ss[l]; }
        return {
          prompt: `A stack of ${L} convolutional layers has kernel sizes ${listTxt(Fs, String)} and strides ${listTxt(Ss, String)} (first layer first). Using ${M.eq(`${V("r")}<sub>${V("l")}</sub> = ${V("r")}<sub>${V("l")}−1</sub> + (${V("F")}<sub>${V("l")}</sub> − 1) Π<sub>${V("k")}&lt;${V("l")}</sub> ${V("S")}<sub>${V("k")}</sub>,  ${V("r")}₀ = 1,`)} find the receptive field (in input pixels) of one unit in the last layer.`,
          steps: [
            ...range(L).map((l) => `Layer ${l + 1}: the product of earlier strides is ${jumps[l]}, so ${V("r")} = ${l === 0 ? 1 : rs[l - 1]} + (${Fs[l]} − 1) · ${jumps[l]} = ${rs[l]}.`),
            `One unit at the top sees a ${rs[L - 1]}×${rs[L - 1]} patch of the input; strides early in the stack make it grow fastest.`,
          ],
          answer: { kind: "number", value: rs[L - 1] }, answerText: `${rs[L - 1]} pixels`, answerInput: String(rs[L - 1]),
          vals: { jumps, rs }, params: { Fs, Ss, L, layers: range(L).map((l) => l + 1), mode: 1 },
        };
      },
    },

    // ---- ML.rnn Recurrent networks ------------------------------------------------------------------------------
    "ML.rnn": {
      title: "RNN steps and vanishing gradients",
      generate(r, level) {
        const H = V("h");
        if (level <= 2) {
          for (;;) {
            const wh = F(r.int(-10, 10), 10), wx = F(r.int(-10, 10), 10), b = F(r.int(-5, 5), 10), h0 = level === 1 ? F(r.int(-8, 8), 10) : F(0);
            const xs = level === 1 ? [F(r.int(-3, 3))] : [F(r.int(-3, 3)), F(r.int(-3, 3))];
            const as = [], hs = [];
            let hprev = h0.value;
            const steps = [];
            xs.forEach((x, t) => {
              const a = wh.value * hprev + wx.value * x.value + b.value, h = Math.tanh(a);
              as.push(a); hs.push(h);
              steps.push(`Step ${t + 1}: ${V("a")} = ${ex(wh)} · ${t === 0 ? exp_(h0) : app(hprev)} + ${exp_(wx)} · ${exp_(x)} + ${exp_(b)} ≈ ${ap(a)}; ${H}${ix(t + 1)} = tanh(${ap(a)}) ≈ ${ap(h)}.`);
              hprev = h;
            });
            const ans = hs[hs.length - 1];
            if (near(ans, 3) || Math.abs(as[0]) < 0.05) continue;
            const T = xs.length;
            return {
              prompt: `A one-unit RNN updates ${M.eq(`${H}<sub>${V("t")}</sub> = tanh(${V("w")}<sub>${V("h")}</sub>${H}<sub>${V("t")}−1</sub> + ${V("w")}<sub>${V("x")}</sub>${V("x")}<sub>${V("t")}</sub> + ${V("b")})`)} with ${V("w")}<sub>${V("h")}</sub> = ${ex(wh)}, ${V("w")}<sub>${V("x")}</sub> = ${ex(wx)}, ${V("b")} = ${ex(b)} and ${H}₀ = ${ex(h0)}. ${T === 1 ? `The input is ${V("x")}₁ = ${ex(xs[0])}. Find ${H}₁.` : `The inputs are ${V("x")}₁ = ${ex(xs[0])}, ${V("x")}₂ = ${ex(xs[1])}. Find ${H}₂.`} Round to 3 decimal places.`,
              steps: [...steps, `${T === 1 ? `${H}₁` : `${H}₂`} ≈ ${fixed(ans, 3)}. The same weights are used at every step.`],
              answer: { kind: "number", value: ans, dp: 3 }, answerText: `≈ ${fixed(ans, 3)}`, answerInput: ans.toFixed(3),
              vals: { as, hs }, params: { wh: fv(wh), wx: fv(wx), b: fv(b), h0: fv(h0), xs: fvs(xs) }, consts: [3],
            };
          }
        }
        const k = r.int(3, 4), wh = r.pick([F(1, 2), F(2), F(3, 2), F(-1, 2), F(4, 5)]), hs = range(k).map(() => r.pick([F(0), F(1, 2), F(-1, 2), F(3, 5), F(-4, 5), F(1, 3)]));
        const fac = hs.map((h) => F(1).sub(h.mul(h)).mul(wh)), prod = fac.reduce((a, b) => a.mul(b), F(1));
        return {
          prompt: `In a one-unit tanh RNN with recurrent weight ${V("w")}<sub>${V("h")}</sub> = ${ex(wh)}, the hidden states over the last ${k} steps were ${M.eq(listTxt(hs, (q) => M.f(q)))} Using ${M.frac(`∂${H}<sub>${V("t")}</sub>`, `∂${H}<sub>${V("t")}−1</sub>`)} = (1 − ${M.sup(`${H}<sub>${V("t")}</sub>`, 2)})${V("w")}<sub>${V("h")}</sub>, find the factor ∂${H}<sub>${V("T")}</sub>/∂${H}<sub>${V("T")}−${k}</sub> by which a gradient is multiplied over these ${k} steps. Give an exact value.`,
          steps: [
            `Each step contributes (1 − ${M.sup(H, 2)}) · ${ex(wh)}: ${hs.map((h, i) => `(1 − ${M.sup(`(${M.f(h)})`, 2)}) · ${exp_(wh)} = ${M.f(fac[i])}`).join("; ")}.`,
            `Multiply: ${fac.map((q) => M.f(q, { paren: true })).join(" × ")} = ${M.f(prod)}.`,
            `${prod.abs().cmp(1) < 0 ? "The factor is small" : "The factor is large"}: products of many such terms vanish when they are below 1 in size and explode when above, which is why plain RNNs struggle with long-range dependencies.`,
          ],
          answer: { kind: "number", value: prod.value }, answerText: M.f(prod), answerInput: ty(prod),
          vals: { hh: fvs(hs.map((h) => h.mul(h))), fac: fvs(fac), prod: fv(prod) }, params: { wh: fv(wh), hs: fvs(hs), k },
        };
      },
    },

    // ---- ML.lstm LSTM and GRU gates ----------------------------------------------------------------------------
    "ML.lstm": {
      title: "LSTM and GRU state updates",
      generate(r, level) {
        const tenth = (lo, hi) => F(r.int(lo, hi), 10);
        if (level === 1) {
          const f = range(2).map(() => tenth(1, 9)), i = range(2).map(() => tenth(1, 9)), c0 = range(2).map(() => F(r.int(-20, 20), 10)), ct = range(2).map(() => tenth(-9, 9));
          const c1 = f.map((q, k) => q.mul(c0[k]).add(i[k].mul(ct[k])));
          return {
            prompt: `An LSTM cell has previous cell state ${V("c")}<sub>${V("t")}−1</sub> = ${vec(c0)}, forget gate ${V("f")} = ${vec(f)}, input gate ${V("i")} = ${vec(i)} and candidate ${V("c̃")} = ${vec(ct)}. Find the new cell state ${V("c")}<sub>${V("t")}</sub> = ${V("f")} ⊙ ${V("c")}<sub>${V("t")}−1</sub> + ${V("i")} ⊙ ${V("c̃")}.`,
            steps: [
              `Keep part of the old memory: ${V("f")} ⊙ ${V("c")}<sub>${V("t")}−1</sub> = ${vec(f.map((q, k) => q.mul(c0[k])))}.`,
              `Write new content: ${V("i")} ⊙ ${V("c̃")} = ${vec(i.map((q, k) => q.mul(ct[k])))}.`,
              `Add elementwise: ${V("c")}<sub>${V("t")}</sub> = ${vec(c1)}. The update is additive, which is what lets gradients survive many steps.`,
            ],
            answer: { kind: "numbers", values: c1.map((q) => q.value), ordered: true }, answerText: vec(c1), answerInput: c1.map(exIn).join(", "),
            vals: { fc: fvs(f.map((q, k) => q.mul(c0[k]))), ic: fvs(i.map((q, k) => q.mul(ct[k]))), c1: fvs(c1) }, params: { f: fvs(f), i: fvs(i), c0: fvs(c0), ct: fvs(ct) },
          };
        }
        if (level === 2) {
          const z = range(2).map(() => tenth(1, 9)), h0 = range(2).map(() => F(r.int(-10, 10), 10)), ht = range(2).map(() => tenth(-9, 9));
          const one = z.map((q) => F(1).sub(q)), h1 = z.map((q, k) => one[k].mul(h0[k]).add(q.mul(ht[k])));
          return {
            prompt: `A GRU has previous state ${V("h")}<sub>${V("t")}−1</sub> = ${vec(h0)}, update gate ${V("z")} = ${vec(z)} and candidate ${V("h̃")} = ${vec(ht)}. Find ${M.eq(`${V("h")}<sub>${V("t")}</sub> = (1 − ${V("z")}) ⊙ ${V("h")}<sub>${V("t")}−1</sub> + ${V("z")} ⊙ ${V("h̃")}.`)}`,
            steps: [
              `1 − ${V("z")} = ${vec(one)}.`,
              ...range(2).map((k) => `Entry ${k + 1}: ${ex(one[k])} · ${exp_(h0[k])} + ${ex(z[k])} · ${exp_(ht[k])} = ${ex(one[k].mul(h0[k]))} + ${exp_(z[k].mul(ht[k]))} = ${ex(h1[k])}.`),
              `${V("h")}<sub>${V("t")}</sub> = ${vec(h1)}: each entry is a blend of the old state and the candidate, mixed by the update gate.`,
            ],
            answer: { kind: "numbers", values: h1.map((q) => q.value), ordered: true }, answerText: vec(h1), answerInput: h1.map(exIn).join(", "),
            vals: { one: fvs(one), a: fvs(one.map((q, k) => q.mul(h0[k]))), b: fvs(z.map((q, k) => q.mul(ht[k]))), h1: fvs(h1) }, params: { z: fvs(z), h0: fvs(h0), ht: fvs(ht) },
          };
        }
        for (;;) {
          const af = F(r.int(-20, 30), 10), ai = F(r.int(-20, 20), 10), ac = F(r.int(-15, 15), 10), ao = F(r.int(-20, 20), 10), c0 = F(r.int(-20, 20), 10);
          const f = sigma(af.value), i = sigma(ai.value), ct = Math.tanh(ac.value), o = sigma(ao.value), c1 = f * c0.value + i * ct, h1 = o * Math.tanh(c1);
          if (near(h1, 3)) continue;
          return {
            prompt: `One step of a one-unit LSTM has gate pre-activations: forget ${ex(af)}, input ${ex(ai)}, candidate ${ex(ac)}, output ${ex(ao)}. The previous cell state is ${V("c")}<sub>${V("t")}−1</sub> = ${ex(c0)}. With ${V("f")} = ${V("σ")}(·), ${V("i")} = ${V("σ")}(·), ${V("c̃")} = tanh(·), ${V("o")} = ${V("σ")}(·), find ${V("h")}<sub>${V("t")}</sub> = ${V("o")} · tanh(${V("c")}<sub>${V("t")}</sub>). Round to 3 decimal places.`,
            steps: [
              `Gates: ${V("f")} = ${V("σ")}(${ex(af)}) ≈ ${ap(f)}, ${V("i")} = ${V("σ")}(${ex(ai)}) ≈ ${ap(i)}, ${V("c̃")} = tanh(${ex(ac)}) ≈ ${ap(ct)}, ${V("o")} = ${V("σ")}(${ex(ao)}) ≈ ${ap(o)}.`,
              `Cell: ${V("c")}<sub>${V("t")}</sub> = ${ap(f)} · ${exp_(c0)} + ${ap(i)} · ${app(ct)} ≈ ${ap(c1)}.`,
              `Hidden: ${V("h")}<sub>${V("t")}</sub> = ${ap(o)} · tanh(${ap(c1)}) ≈ ${ap(o)} · ${app(Math.tanh(c1))} ≈ ${ap(h1)}.`,
            ],
            answer: { kind: "number", value: h1, dp: 3 }, answerText: `≈ ${fixed(h1, 3)}`, answerInput: h1.toFixed(3),
            vals: { f, i, ct, o, c1, tc: Math.tanh(c1), h1 }, params: { af: fv(af), ai: fv(ai), ac: fv(ac), ao: fv(ao), c0: fv(c0) }, consts: [3],
          };
        }
      },
    },

    // ---- ML.embeddings Embeddings and cosine similarity ---------------------------------------------------------
    "ML.embeddings": {
      title: "Embedding similarity, analogies and skip-gram",
      generate(r, level) {
        const POOL3 = [[1, 2, 2], [2, 1, 2], [2, 2, 1], [2, 3, 6], [3, 6, 2], [6, 2, 3], [4, 4, 7], [1, 4, 8], [8, 4, 1], [4, 8, 1], [2, 6, 9], [6, 9, 2], [9, 2, 6], [0, 3, 4], [4, 0, 3], [3, 4, 0]];
        if (level === 1) {
          const [a, b] = r.sample(POOL3, 2), u = a.map((t) => t * r.pick([1, 1, -1])), v = b.map((t) => t * r.pick([1, 1, -1]));
          const nu = Math.round(Math.sqrt(sumN(u.map((t) => t * t)))), nv = Math.round(Math.sqrt(sumN(v.map((t) => t * t)))), dot = sumN(u.map((t, i) => t * v[i])), cos = F(dot, nu * nv);
          const [w1, w2] = r.pick([["coffee", "tea"], ["paris", "london"], ["guitar", "violin"], ["run", "jog"], ["river", "bank"]]);
          return {
            prompt: `Embeddings for "${w1}" and "${w2}" are ${M.eq(`${V("u")} = ${vec(u, M.n)},  ${V("v")} = ${vec(v, M.n)}`)} Find their cosine similarity. Give an exact fraction.`,
            steps: [
              `${V("u")} · ${V("v")} = ${u.map((t, i) => `${M.n(t, { paren: i > 0 })} · ${M.n(v[i], { paren: true })}`).join(" + ")} = ${M.n(dot)}.`,
              `‖${V("u")}‖ = ${M.sqrt(String(nu * nu))} = ${nu}, ‖${V("v")}‖ = ${M.sqrt(String(nv * nv))} = ${nv}.`,
              `cos = ${M.frac(M.n(dot), `${nu} · ${nv}`)} = ${M.f(cos)}. ${cos.value > 0.5 ? "The words point in similar directions." : cos.value < 0 ? "The vectors point in roughly opposite directions." : "The words are only weakly related in this space."}`,
            ],
            answer: { kind: "number", value: cos.value }, answerText: M.f(cos), answerInput: ty(cos),
            vals: { dot, nu, nv, n2: [nu * nu, nv * nv], cos: fv(cos) }, params: { u, v },
          };
        }
        if (level === 2) {
          for (;;) {
            const king = [r.int(3, 8), r.int(3, 8)], man = [r.int(0, 4), r.int(-3, 1)], woman = [man[0] + r.int(-3, 3), man[1] + r.int(2, 5)];
            const tgt = king.map((t, i) => t - man[i] + woman[i]);
            const cands = [["queen", tgt.map((t) => t + r.int(-1, 1))], ["prince", [king[0] + r.int(-1, 1), king[1] + r.int(-2, 0)]], ["actress", [woman[0] + r.int(-1, 2), woman[1] + r.int(-1, 1)]]];
            const d2 = cands.map(([, c]) => (c[0] - tgt[0]) ** 2 + (c[1] - tgt[1]) ** 2);
            const best = d2.indexOf(Math.min(...d2));
            if (d2.filter((t) => t === d2[best]).length > 1 || new Set([king, man, woman, ...cands.map((c) => c[1])].map(String)).size < 6 || [king, man, woman, ...cands.map((c) => c[1])].some((p) => Math.abs(p[0]) > 10 || Math.abs(p[1]) > 10)) continue;
            const opts = cands.map((c) => c[0]);
            const all = [["king", king], ["man", man], ["woman", woman], ...cands];
            return {
              prompt: `Toy 2-D word embeddings: ${M.table(["word", "vector"], all.map(([w, p]) => [w, `(${M.n(p[0])}, ${M.n(p[1])})`]))} Compute king − man + woman and find the closest of the last three words by Euclidean distance.`,
              graph: graph({ view: [-11, 11, -11, 11], equal: true, items: [...all.map(([w, p], i) => ({ t: "pt", x: p[0], y: p[1], label: w, role: i < 3 ? "secondary" : "primary" })), { t: "pt", x: tgt[0], y: tgt[1], label: "?", role: "highlight" }] }),
              steps: [
                `king − man + woman = (${M.n(king[0])} − ${M.n(man[0], { paren: true })} + ${M.n(woman[0], { paren: true })}, ${M.n(king[1])} − ${M.n(man[1], { paren: true })} + ${M.n(woman[1], { paren: true })}) = (${M.n(tgt[0])}, ${M.n(tgt[1])}).`,
                `Squared distances to it: ${cands.map(([w, c], i) => `${w}: ${M.sup(`(${M.n(c[0])} − ${M.n(tgt[0], { paren: true })})`, 2)} + ${M.sup(`(${M.n(c[1])} − ${M.n(tgt[1], { paren: true })})`, 2)} = ${d2[i]}`).join("; ")}.`,
                `The closest is ${opts[best]}${best === 0 ? ": the man → woman direction carried king to queen" : ""}.`,
              ],
              answer: { kind: "choice", options: opts, index: best }, answerText: opts[best],
              vals: { tgt, d2, best }, params: { king, man, woman, cands: cands.map((c) => c[1]) },
            };
          }
        }
        for (;;) {
          const vc = [r.int(-2, 2), r.int(-2, 2)], us = range(3).map(() => [r.int(-2, 2), r.int(-2, 2)]), o = r.int(0, 2);
          const dots = us.map((u) => u[0] * vc[0] + u[1] * vc[1]), m = Math.max(...dots), es = dots.map((d) => Math.exp(d - m)), S = sumN(es), pr = es[o] / S;
          if (new Set(dots).size < 2 || near(pr, 3) || (vc[0] === 0 && vc[1] === 0)) continue;
          const words = ["cat", "sat", "mat"];
          return {
            prompt: `A skip-gram model with a 3-word vocabulary (cat, sat, mat) has center vector ${V("v")}<sub>${V("c")}</sub> = ${vec(vc, M.n)} for the word "on", and context vectors ${M.table(["word", ...words], [[V("u") + "<sub>" + V("w") + "</sub>", ...us.map((u) => `(${M.n(u[0])}, ${M.n(u[1])})`)]])} Find P("${words[o]}" | "on") = ${M.frac(`exp(${V("u")}<sub>${V("o")}</sub><sup>⊤</sup>${V("v")}<sub>${V("c")}</sub>)`, `Σ<sub>${V("w")}</sub> exp(${V("u")}<sub>${V("w")}</sub><sup>⊤</sup>${V("v")}<sub>${V("c")}</sub>)`)}. Round to 3 decimal places.`,
            steps: [
              `Dot products with ${V("v")}<sub>${V("c")}</sub>: ${us.map((u, i) => `${words[i]}: ${M.n(u[0])} · ${M.n(vc[0], { paren: true })} + ${M.n(u[1], { paren: true })} · ${M.n(vc[1], { paren: true })} = ${M.n(dots[i])}`).join("; ")}.`,
              `Softmax (subtract the largest, ${M.n(m)}): ${M.sup("e", "…")} ≈ ${listTxt(es, ap)}; sum ≈ ${ap(S)}.`,
              `P("${words[o]}" | "on") ≈ ${ap(es[o])} ÷ ${ap(S)} ≈ ${ap(pr)}.`,
            ],
            answer: { kind: "number", value: pr, dp: 3 }, answerText: `≈ ${fixed(pr, 3)}`, answerInput: pr.toFixed(3),
            vals: { dots, m, es, S, pr }, params: { vc, us, o }, consts: [3],
          };
        }
      },
    },

    // ---- ML.attention Scaled dot-product attention -----------------------------------------------------------------
    "ML.attention": {
      title: "Scaled dot-product attention",
      generate(r, level) {
        const dk = 4, rt = 2;
        const v4 = () => range(4).map(() => r.int(-2, 2));
        if (level === 1) {
          const q = v4(), k = v4(), dot = sumN(q.map((t, i) => t * k[i])), sc = F(dot, rt);
          return {
            prompt: `A query and a key in a transformer head have ${V("d")}<sub>${V("k")}</sub> = ${dk}: ${M.eq(`${V("q")} = ${vec(q, M.n)},  ${V("k")} = ${vec(k, M.n)}`)} Find the scaled attention score ${M.frac(`${V("q")}<sup>⊤</sup>${V("k")}`, M.sqrt(`${V("d")}<sub>${V("k")}</sub>`))}.`,
            steps: [
              `${V("q")}<sup>⊤</sup>${V("k")} = ${q.map((t, i) => `${M.n(t, { paren: i > 0 })} · ${M.n(k[i], { paren: true })}`).join(" + ")} = ${M.n(dot)}.`,
              `Divide by ${M.sqrt(String(dk))} = ${rt}: ${M.frac(M.n(dot), String(rt))} = ${ex(sc)}. The scaling keeps scores of order 1 as ${V("d")}<sub>${V("k")}</sub> grows, so the softmax does not saturate.`,
            ],
            answer: { kind: "number", value: sc.value }, answerText: ex(sc), answerInput: exIn(sc),
            vals: { dot, sc: fv(sc), rt }, params: { q, k, dk },
          };
        }
        for (;;) {
          const q = v4(), K = range(3).map(v4), dots = K.map((k) => sumN(q.map((t, i) => t * k[i]))), sc = dots.map((d) => d / rt);
          const m = Math.max(...sc), es = sc.map((s) => Math.exp(s - m)), S = sumN(es), w = es.map((e) => e / S), j = r.int(0, 2);
          if (new Set(dots).size < 2) continue;
          const head = `A query ${V("q")} = ${vec(q, M.n)} attends over three keys (${V("d")}<sub>${V("k")}</sub> = ${dk}): ${M.table(["", ...LET.slice(0, 3).split("")], [[V("k"), ...K.map((k) => vec(k, M.n))]])}`;
          const s1 = `Scores ${V("q")}<sup>⊤</sup>${V("k")}/${M.sqrt(String(dk))}: ${K.map((k, i) => `${LET[i]}: ${M.n(dots[i])} ÷ ${rt} = ${ex(F(dots[i], rt))}`).join("; ")}.`;
          const s2 = `Softmax (subtract the largest, ${ex(F(Math.round(m * rt), rt))}): exponentials ≈ ${listTxt(es, ap)}; sum ≈ ${ap(S)}; weights ≈ ${listTxt(w, ap)}.`;
          if (level === 2) {
            if (near(w[j], 3) || w[j] < 0.05 || w[j] > 0.95) continue;
            return {
              prompt: `${head} Find the attention weight on key ${LET[j]}. Round to 3 decimal places.`,
              steps: [s1, s2, `The weight on ${LET[j]} is about ${fixed(w[j], 3)}.`],
              answer: { kind: "number", value: w[j], dp: 3 }, answerText: `≈ ${fixed(w[j], 3)}`, answerInput: w[j].toFixed(3),
              vals: { dots, sc: fvs(dots.map((d) => F(d, rt))), m: fv(F(Math.round(m * rt), rt)), es, S, w, rt }, params: { q, K, j, dk }, consts: [3],
            };
          }
          const Vv = range(3).map(() => [r.int(-3, 5), r.int(-3, 5)]), out = [0, 1].map((c) => sumN(w.map((a, i) => a * Vv[i][c])));
          if (out.some((t) => near(t, 3))) continue;
          return {
            prompt: `${head} with values ${M.table(["", ...LET.slice(0, 3).split("")], [[V("v"), ...Vv.map((v) => vec(v, M.n))]])} Compute the attention output softmax(${V("q")}<sup>⊤</sup>${V("K")}<sup>⊤</sup>/${M.sqrt(`${V("d")}<sub>${V("k")}</sub>`)})${V("V")}. Round each entry to 3 decimal places.`,
            steps: [s1, s2,
              `Output = Σ weight × value: first entry ${w.map((a, i) => `${ap(a)} · ${M.n(Vv[i][0], { paren: true })}`).join(" + ")} ≈ ${ap(out[0])}; second entry ${w.map((a, i) => `${ap(a)} · ${M.n(Vv[i][1], { paren: true })}`).join(" + ")} ≈ ${ap(out[1])}.`,
              `The output (${fixed(out[0], 3)}, ${fixed(out[1], 3)}) is a weighted mix of the value vectors, dominated by the best-matching key.`],
            answer: { kind: "numbers", values: out, ordered: true, dp: 3 }, answerText: `≈ (${fixed(out[0], 3)}, ${fixed(out[1], 3)})`, answerInput: out.map((t) => t.toFixed(3)).join(", "),
            vals: { dots, sc: fvs(dots.map((d) => F(d, rt))), m: fv(F(Math.round(m * rt), rt)), es, S, w, out, rt }, params: { q, K, Vv, dk }, consts: [3],
          };
        }
      },
    },

    // ---- ML.transformer Transformers -----------------------------------------------------------------------------
    "ML.transformer": {
      title: "Transformer dimensions, parameters and positional encoding",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const d = r.pick([256, 384, 512, 768, 1024, 1280]), H = r.pick([4, 6, 8, 12, 16, 20]);
            if (d % H) continue;
            const dh = d / H, ff = 4 * d;
            return {
              prompt: `A transformer layer has model width ${V("d")} = ${d} and ${V("H")} = ${H} attention heads. What is each head's query/key dimension ${V("d")}/${V("H")}?`,
              steps: [`Each head works in its own subspace of size ${M.frac(V("d"), V("H"))} = ${M.frac(String(d), String(H))} = ${dh}; the ${H} head outputs concatenate back to ${H} · ${dh} = ${d}. (The feed-forward sublayer would typically be 4${V("d")} = ${ff} wide.)`],
              answer: { kind: "number", value: dh }, answerText: String(dh), answerInput: String(dh),
              vals: { dh, ff }, params: { d, H }, consts: [4],
            };
          }
        }
        if (level === 2) {
          const d = r.pick([64, 128, 256, 512, 768]), ffn = r.chance(0.5);
          const ans = ffn ? 8 * d * d + 5 * d : 4 * d * d + 4 * d;
          return {
            prompt: ffn ? `A transformer block's feed-forward sublayer is ${V("W")}₂ GELU(${V("W")}₁${V("x")} + ${V("b")}₁) + ${V("b")}₂ with model width ${V("d")} = ${d} and hidden width 4${V("d")}. How many parameters does it have?`
              : `A multi-head attention sublayer with model width ${V("d")} = ${d} has query, key, value and output projections, each a ${V("d")}×${V("d")} matrix with a bias. How many parameters does it have? (The number of heads does not matter.)`,
            steps: ffn ? [
              `${V("W")}₁ is ${4 * d}×${d} with ${4 * d} biases: ${P.grouped(4 * d * d)} + ${P.grouped(4 * d)}.`,
              `${V("W")}₂ is ${d}×${4 * d} with ${d} biases: ${P.grouped(4 * d * d)} + ${d}.`,
              `Total 8${M.sup(V("d"), 2)} + 5${V("d")} = ${P.grouped(8 * d * d)} + ${P.grouped(5 * d)} = ${P.grouped(ans)}.`,
            ] : [
              `Each projection: ${M.sup(String(d), 2)} + ${d} = ${P.grouped(d * d + d)} parameters. Splitting into heads just partitions these matrices.`,
              `Four projections: 4 · ${P.grouped(d * d + d)} = ${P.grouped(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: P.grouped(ans), answerInput: String(ans),
            vals: ffn ? { a: 4 * d * d, b: 4 * d, c: 8 * d * d, e: 5 * d, ans } : { a: d * d + d, ans }, params: { d, ffn: ffn ? 1 : 0 }, consts: [4, 5, 8],
          };
        }
        for (;;) {
          const p = r.int(1, 30), vals = [Math.sin(p), Math.cos(p), Math.sin(p / 100), Math.cos(p / 100)];
          if (vals.some((t) => near(t, 3))) continue;
          return {
            prompt: `With model width ${V("d")} = ${4}, the sinusoidal positional encoding is ${M.eq(`${V("PE")}<sub>(${V("p")}, 2${V("i")})</sub> = sin(${V("p")}/${M.sup("10000", `2${V("i")}/${V("d")}`)}),  ${V("PE")}<sub>(${V("p")}, 2${V("i")}+1)</sub> = cos(${V("p")}/${M.sup("10000", `2${V("i")}/${V("d")}`)}).`)} Find the encoding vector for position ${V("p")} = ${p} (angles in radians). Round each entry to 3 decimal places.`,
            steps: [
              `${V("i")} = 0 gives ${M.sup("10000", "0")} = 1; ${V("i")} = 1 gives ${M.sup("10000", `2/${4}`)} = 100. So the angles are ${p} and ${p}/100 = ${ex(F(p, 100))}.`,
              `sin ${p} ≈ ${ap(vals[0])}, cos ${p} ≈ ${ap(vals[1])}, sin ${ex(F(p, 100))} ≈ ${ap(vals[2])}, cos ${ex(F(p, 100))} ≈ ${ap(vals[3])}.`,
              `The first pair cycles quickly with position, the second slowly: together they give every position a distinct code.`,
            ],
            answer: { kind: "numbers", values: vals, ordered: true, dp: 3 }, answerText: `≈ ${vec(vals, (t) => fixed(t, 3))}`, answerInput: vals.map((t) => t.toFixed(3)).join(", "),
            vals: { vals, pp: fv(F(p, 100)) }, params: { p }, consts: [4, 10000, 100, 3],
          };
        }
      },
    },

    // ---- ML.17 k-means --------------------------------------------------------------------------------------------
    "ML.17": {
      title: "k-means assignment, update and seeding",
      generate(r, level) {
        const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
        const pt = (p) => `(${M.n(p[0])}, ${M.n(p[1])})`;
        if (level === 1) {
          for (;;) {
            const cs = range(3).map(() => [r.int(0, 8), r.int(0, 8)]), x = [r.int(0, 8), r.int(0, 8)], ds = cs.map((c) => d2(x, c));
            const best = ds.indexOf(Math.min(...ds));
            if (ds.filter((t) => t === ds[best]).length > 1 || new Set(cs.map(String)).size < 3) continue;
            const opts = ["μ₁", "μ₂", "μ₃"].map((s) => `<i>${s[0]}</i>${s.slice(1)}`);
            return {
              prompt: `A customer at ${pt(x)} (spend, visits) is to be assigned to the nearest of three ${V("k")}-means centroids: ${V("μ")}₁ = ${pt(cs[0])}, ${V("μ")}₂ = ${pt(cs[1])}, ${V("μ")}₃ = ${pt(cs[2])}. Which centroid does it join?`,
              graph: graph({ view: [-1, 9, -1, 9], equal: true, items: [...cs.map((c, i) => ({ t: "pt", x: c[0], y: c[1], label: `μ${ix(i + 1)}`, role: "secondary" })), { t: "pt", x: x[0], y: x[1], label: "x", role: "highlight" }] }),
              steps: [
                `Squared distances (enough for comparing): ${cs.map((c, i) => `${V("μ")}${ix(i + 1)}: ${M.sup(`(${x[0]} − ${c[0]})`, 2)} + ${M.sup(`(${x[1]} − ${c[1]})`, 2)} = ${ds[i]}`).join("; ")}.`,
                `The smallest is ${ds[best]}, so the customer joins ${V("μ")}${ix(best + 1)}.`,
              ],
              answer: { kind: "choice", options: opts, index: best }, answerText: opts[best],
              vals: { ds, best }, params: { cs, x },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const c = [[r.int(0, 3), r.int(0, 8)], [r.int(5, 8), r.int(0, 8)]], X = range(6).map(() => [r.int(0, 8), r.int(0, 8)]);
            const ds = X.map((x) => c.map((m) => d2(x, m)));
            if (ds.some((d) => d[0] === d[1] || d[0] === 0 || d[1] === 0) || new Set(X.map(String)).size < 6) continue;
            const asg = ds.map((d) => (d[0] < d[1] ? 0 : 1)), C1 = X.filter((_, i) => asg[i] === 0);
            if (C1.length < 2 || C1.length > 4) continue;
            const mu = [F(sumN(C1.map((p) => p[0])), C1.length), F(sumN(C1.map((p) => p[1])), C1.length)];
            return {
              prompt: `One iteration of ${V("k")}-means with centroids ${V("μ")}₁ = ${pt(c[0])} and ${V("μ")}₂ = ${pt(c[1])} on the points ${X.map((p, i) => `${LET[i]} ${pt(p)}`).join(", ")}. After assigning each point to its nearest centroid, where does ${V("μ")}₁ move?`,
              graph: graph({ view: [-1, 9, -1, 9], equal: true, items: [...X.map((p, i) => ({ t: "pt", x: p[0], y: p[1], label: LET[i] })), ...c.map((m, i) => ({ t: "pt", x: m[0], y: m[1], label: `μ${ix(i + 1)}`, role: "secondary" }))] }),
              steps: [
                `Squared distances to (${V("μ")}₁, ${V("μ")}₂): ${X.map((p, i) => `${LET[i]}: (${ds[i][0]}, ${ds[i][1]})`).join("; ")}.`,
                `Cluster 1 gets ${X.map((_, i) => i).filter((i) => asg[i] === 0).map((i) => LET[i]).join(", ")}; cluster 2 gets the rest.`,
                `New ${V("μ")}₁ = mean of cluster 1: (${M.frac(C1.map((p) => p[0]).join(" + "), String(C1.length))}, ${M.frac(C1.map((p) => p[1]).join(" + "), String(C1.length))}) = (${ex(mu[0])}, ${ex(mu[1])}).`,
              ],
              answer: { kind: "point", value: [mu[0].value, mu[1].value] }, answerText: `(${ex(mu[0])}, ${ex(mu[1])})`, answerInput: `(${exIn(mu[0])}, ${exIn(mu[1])})`,
              vals: { ds, asg, n1: C1.length, mu: fvs(mu), sx: sumN(C1.map((p) => p[0])), sy: sumN(C1.map((p) => p[1])) }, params: { c, X },
            };
          }
        }
        for (;;) {
          const X = range(5).map(() => [r.int(0, 8), r.int(0, 8)]), first = 0, target = r.int(1, 4);
          if (new Set(X.map(String)).size < 5) continue;
          const D = X.map((p) => d2(p, X[first])), S = sumN(D), prob = F(D[target], S);
          return {
            prompt: `${V("k")}-means++ seeding has chosen point A as the first centroid. Points: ${X.map((p, i) => `${LET[i]} ${pt(p)}`).join(", ")}. The next centroid is drawn with probability proportional to ${V("D")}(${V("x")})², the squared distance to the nearest chosen centroid. What is the probability that point ${LET[target]} is chosen? Give an exact fraction.`,
            graph: graph({ view: [-1, 9, -1, 9], equal: true, items: X.map((p, i) => ({ t: "pt", x: p[0], y: p[1], label: LET[i], role: i === 0 ? "secondary" : "primary" })) }),
            steps: [
              `Squared distances to A: ${X.map((p, i) => `${LET[i]}: ${D[i]}`).join(", ")} (A itself has 0, so it cannot be chosen again).`,
              `Total: ${D.slice(1).join(" + ")} = ${S}.`,
              `P(${LET[target]}) = ${fq(D[target], S)}. Far points are favored, which spreads the seeds out.`,
            ],
            answer: { kind: "number", value: prob.value }, answerText: M.f(prob), answerInput: ty(prob),
            vals: { D, S, prob: fv(prob) }, params: { X, target },
          };
        }
      },
    },

    // ---- ML.18 Hierarchical clustering and silhouette -------------------------------------------------------------
    "ML.18": {
      title: "Silhouette scores and linkage",
      generate(r, level) {
        if (level === 1) {
          const a = F(r.int(5, 40), 10), b = F(r.int(5, 40), 10);
          if (a.eq(b)) return this.generate(r, level);
          const mx = a.cmp(b) > 0 ? a : b, s = b.sub(a).div(mx);
          return {
            prompt: `A point's mean distance to the other members of its own cluster is ${V("a")} = ${ex(a)}, and to the nearest other cluster ${V("b")} = ${ex(b)}. Find its silhouette ${V("s")} = ${M.frac(`${V("b")} − ${V("a")}`, `max(${V("a")}, ${V("b")})`)}. Give an exact value.`,
            steps: [
              `${V("b")} − ${V("a")} = ${ex(b)} − ${ex(a)} = ${ex(b.sub(a))}; max(${V("a")}, ${V("b")}) = ${ex(mx)}.`,
              `${V("s")} = ${M.frac(ex(b.sub(a)), ex(mx))} = ${ex(s)}. ${s.n > 0 ? "Positive: the point sits closer to its own cluster." : "Negative: the point is closer to another cluster and is probably misassigned."}`,
            ],
            answer: { kind: "number", value: s.value }, answerText: ex(s), answerInput: exIn(s),
            vals: { diff: fv(b.sub(a)), mx: fv(mx), s: fv(s) }, params: { a: fv(a), b: fv(b) },
          };
        }
        if (level === 2) {
          for (;;) {
            const A = r.sample(range(8).map((i) => i + 1), 3).sort((u, v) => u - v), B = r.sample(range(8).map((i) => i + 10), 2).sort((u, v) => u - v), x = A[0];
            const others = A.slice(1), a = F(sumN(others.map((t) => Math.abs(t - x))), others.length), b = F(sumN(B.map((t) => Math.abs(t - x))), B.length);
            const mx = a.cmp(b) > 0 ? a : b, s = b.sub(a).div(mx);
            return {
              prompt: `Delivery times (minutes) were clustered into cluster 1 = {${A.join(", ")}} and cluster 2 = {${B.join(", ")}}. Find the silhouette of the point ${x}. Give an exact value.`,
              steps: [
                `${V("a")} = mean distance to the rest of its cluster: (${others.map((t) => `|${t} − ${x}|`).join(" + ")}) ÷ ${others.length} = ${ex(a)}.`,
                `${V("b")} = mean distance to cluster 2: (${B.map((t) => `|${t} − ${x}|`).join(" + ")}) ÷ ${B.length} = ${ex(b)}.`,
                `${V("s")} = ${M.frac(`${ex(b)} − ${ex(a)}`, ex(mx))} = ${ex(s)}.`,
              ],
              answer: { kind: "number", value: s.value }, answerText: ex(s), answerInput: exIn(s),
              vals: { dA: others.map((t) => Math.abs(t - x)), dB: B.map((t) => Math.abs(t - x)), a: fv(a), b: fv(b), mx: fv(mx), s: fv(s) }, params: { A, B, x },
            };
          }
        }
        for (;;) {
          const link = r.pick(["single", "complete", "average"]);
          const cl = [[r.int(0, 3), r.int(4, 6)], [r.int(9, 11), r.int(12, 15)], [r.int(18, 20), r.int(21, 26)]].map((c) => r.chance(0.5) ? c : [c[0]]);
          const dist = (A, B) => {
            const ds = A.flatMap((a) => B.map((b) => Math.abs(a - b)));
            return link === "single" ? F(Math.min(...ds)) : link === "complete" ? F(Math.max(...ds)) : F(sumN(ds), ds.length);
          };
          const pairs = [[0, 1], [0, 2], [1, 2]], ds = pairs.map(([i, j]) => dist(cl[i], cl[j]));
          const best = ds.reduce((bi, d, k) => (d.cmp(ds[bi]) < 0 ? k : bi), 0);
          if (ds.filter((d) => d.eq(ds[best])).length > 1) continue;
          const nm = (i) => `{${cl[i].join(", ")}}`, opts = pairs.map(([i, j]) => `${nm(i)} and ${nm(j)}`);
          const rule = link === "single" ? "the closest pair of points" : link === "complete" ? "the farthest pair of points" : "the average over all pairs of points";
          return {
            prompt: `Agglomerative clustering of house ages (years) has reached three clusters: ${nm(0)}, ${nm(1)} and ${nm(2)}. With ${link} linkage, which two clusters merge next?`,
            steps: [
              `${link[0].toUpperCase() + link.slice(1)} linkage measures the distance between clusters by ${rule}.`,
              `${pairs.map(([i, j], k) => `${nm(i)}–${nm(j)}: ${ex(ds[k])}`).join("; ")}.`,
              `The smallest linkage distance is ${ex(ds[best])}, so ${opts[best]} merge.`,
            ],
            answer: { kind: "choice", options: opts, index: best }, answerText: opts[best],
            vals: { ds: fvs(ds), best }, params: { cl, link },
          };
        }
      },
    },

    // ---- ML.20 Gaussian mixtures and EM ---------------------------------------------------------------------------
    "ML.20": {
      title: "EM for Gaussian mixtures",
      generate(r, level) {
        if (level <= 2) {
          const k = 4, xs = r.sample([-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8], k).sort((u, v) => u - v), g = range(k).map(() => F(r.int(1, 9), 10));
          const Nk = sumF(g);
          if (level === 1) {
            const pi = Nk.div(k);
            return {
              prompt: `After an E-step, the responsibilities of component 1 for four points are ${M.eq(listTxt(g))} What is the M-step mixing weight ${V("π")}₁ = ${V("N")}₁/${V("n")}?`,
              steps: [
                `${V("N")}₁ = Σ ${V("γ")}<sub>${V("i")}1</sub> = ${chain(g)} = ${ex(Nk)}: the effective number of points owned by component 1.`,
                `${V("π")}₁ = ${ex(Nk)} ÷ ${k} = ${ex(pi)}.`,
              ],
              answer: { kind: "number", value: pi.value }, answerText: ex(pi), answerInput: exIn(pi),
              vals: { Nk: fv(Nk), pi: fv(pi) }, params: { g: fvs(g), k }, consts: [4],
            };
          }
          const gx = g.map((q, i) => q.mul(xs[i])), S = sumF(gx), mu = S.div(Nk);
          return {
            prompt: `Points ${M.eq(listTxt(xs, M.n))} have responsibilities for component 1 of ${M.eq(listTxt(g))} Find the M-step mean ${V("μ")}₁ = ${M.frac(`Σ ${V("γ")}<sub>${V("i")}1</sub>${V("x")}<sub>${V("i")}</sub>`, `Σ ${V("γ")}<sub>${V("i")}1</sub>`)}. Give an exact value.`,
            steps: [
              `Weighted sum: ${g.map((q, i) => `${ex(q)} · ${M.n(xs[i], { paren: true })}`).join(" + ")} = ${ex(S)}.`,
              `Total responsibility: ${chain(g)} = ${ex(Nk)}.`,
              `${V("μ")}₁ = ${M.frac(ex(S), ex(Nk))} = ${ex(S.div(Nk))}. Points the component owns more strongly pull harder.`,
            ],
            answer: { kind: "number", value: mu.value }, answerText: ex(mu), answerInput: exIn(mu),
            vals: { gx: fvs(gx), S: fv(S), Nk: fv(Nk), mu: fv(mu) }, params: { xs, g: fvs(g) },
          };
        }
        for (;;) {
          const mu1 = r.int(-2, 2), mu2 = mu1 + r.int(2, 5), x = r.int(mu1 - 1, mu2 + 1), pi1 = r.pick([F(1, 2), F(1, 4), F(3, 4), F(2, 5)]), pi2 = F(1).sub(pi1);
          const e1 = -((x - mu1) ** 2) / 2, e2 = -((x - mu2) ** 2) / 2, n1 = pi1.value * Math.exp(e1), n2 = pi2.value * Math.exp(e2), gam = n1 / (n1 + n2);
          if (near(gam, 3) || gam > 0.999 || gam < 0.001) continue;
          return {
            prompt: `A two-component Gaussian mixture has ${V("μ")}₁ = ${M.n(mu1)}, ${V("μ")}₂ = ${M.n(mu2)}, both with ${V("σ")} = 1, and weights ${V("π")}₁ = ${ex(pi1)}, ${V("π")}₂ = ${ex(pi2)}. In the E-step, find the responsibility of component 1 for the point ${V("x")} = ${M.n(x)}. Round to 3 decimal places.`,
            steps: [
              `With equal ${V("σ")}, the normal densities' constant ${M.frac("1", M.sqrt("2π"))} cancels, leaving ${V("π")}<sub>${V("k")}</sub>${M.sup("e", `−(${V("x")} − ${V("μ")}<sub>${V("k")}</sub>)²/2`)}.`,
              `Component 1: ${ex(pi1)} · ${M.sup("e", `−(${M.n(x)} − ${M.n(mu1, { paren: true })})²/2`)} = ${ex(pi1)} · ${M.sup("e", ex(F(-((x - mu1) ** 2), 2)))} ≈ ${ap(n1)}. Component 2: ${ex(pi2)} · ${M.sup("e", ex(F(-((x - mu2) ** 2), 2)))} ≈ ${ap(n2)}.`,
              `${V("γ")}₁ = ${M.frac(ap(n1), `${ap(n1)} + ${ap(n2)}`)} ≈ ${ap(gam)}.`,
            ],
            answer: { kind: "number", value: gam, dp: 3 }, answerText: `≈ ${fixed(gam, 3)}`, answerInput: gam.toFixed(3),
            vals: { pi2: fv(pi2), e1: fv(F(-((x - mu1) ** 2), 2)), e2: fv(F(-((x - mu2) ** 2), 2)), n1, n2, gam }, params: { mu1, mu2, x, pi1: fv(pi1) }, consts: [3],
          };
        }
      },
    },

    // ---- ML.19 PCA ----------------------------------------------------------------------------------------------------
    "ML.19": {
      title: "Principal component analysis",
      generate(r, level) {
        if (level === 1) {
          const lam = range(4).map(() => r.int(1, 30)).sort((a, b) => b - a), k = r.pick([1, 2]), T = sumN(lam), top = sumN(lam.slice(0, k)), q = F(top, T);
          return {
            prompt: `PCA on a customer dataset gives covariance eigenvalues ${M.eq(listTxt(lam, String))} What fraction of the total variance do the first ${k === 1 ? "principal component captures" : "two principal components capture"}? Give an exact value.`.replace("captures? ", "captures? ").replace("do the first principal component captures", "does the first principal component capture"),
            steps: [
              `Total variance = sum of the eigenvalues = ${lam.join(" + ")} = ${T}.`,
              `${k === 1 ? `First component: ${top}` : `First two: ${lam[0]} + ${lam[1]} = ${top}`}; fraction ${fq(top, T)}.`,
            ],
            answer: { kind: "number", value: q.value }, answerText: ex(q), answerInput: exIn(q),
            vals: { T, top, q: fv(q) }, params: { lam, k },
          };
        }
        if (level === 2) {
          for (;;) {
            const a = r.int(2, 12), c = r.int(1, 12), b = r.nonzero(-6, 6), tr = a + c, det = a * c - b * b, disc = tr * tr - 4 * det, sd = Math.round(Math.sqrt(disc));
            if (sd * sd !== disc || det <= 0 || (tr + sd) % 2) continue;
            const l1 = (tr + sd) / 2, l2 = (tr - sd) / 2, q = F(l1, tr);
            return {
              prompt: `Two features have covariance matrix ${M.eq(`${V("S")} = ${M.table(["", ""], [[String(a), M.n(b)], [M.n(b), String(c)]]).replace(/<thead>.*?<\/thead>/, "")}`)} What fraction of the variance does the first principal component explain? Give an exact value.`,
              steps: [
                `Eigenvalues solve ${M.sup(V("λ"), 2)} − (trace)${V("λ")} + det = 0, with trace = ${a} + ${c} = ${tr} and det = ${a} · ${c} − ${M.sup(M.n(b, { paren: true }), 2)} = ${det}.`,
                `${V("λ")} = ${M.frac(`${tr} ± ${M.sqrt(`${M.sup(String(tr), 2)} − 4 · ${det}`)}`, "2")} = ${M.frac(`${tr} ± ${sd}`, "2")}, so ${V("λ")}₁ = ${l1} and ${V("λ")}₂ = ${l2}.`,
                `Explained by PC1: ${M.frac(String(l1), `${l1} + ${l2}`)} = ${fq(l1, tr)}.`,
              ],
              answer: { kind: "number", value: q.value }, answerText: ex(q), answerInput: exIn(q),
              vals: { tr, det, disc, sd, l1, l2, q: fv(q) }, params: { a, b, c }, consts: [4],
            };
          }
        }
        for (;;) {
          const [p, qv] = r.pick([[3, 4], [4, 3], [3, -4], [4, -3]]), v = [F(p, 5), F(qv, 5)];
          if (p * p + qv * qv !== 25) { v[0] = F(p); v[1] = F(qv); }
          const mb = [r.int(1, 5), r.int(1, 5)], x = [r.int(0, 8), r.int(0, 8)], dx = [x[0] - mb[0], x[1] - mb[1]];
          const z = v[0].mul(dx[0]).add(v[1].mul(dx[1])), xh = [z.mul(v[0]).add(mb[0]), z.mul(v[1]).add(mb[1])];
          if (dx[0] === 0 && dx[1] === 0) continue;
          if (xh.some((t) => t.value < -1 || t.value > 9)) continue;
          return {
            prompt: `The data's mean is ${V("x̄")} = (${mb[0]}, ${mb[1]}) and its first principal direction is the unit vector ${V("v")} = (${ex(v[0])}, ${ex(v[1])}). Project the point ${V("x")} = (${x[0]}, ${x[1]}) onto the first component and reconstruct it: find ${V("x̂")} = ${V("x̄")} + ${V("z")}${V("v")}, where ${V("z")} = ${V("v")}<sup>⊤</sup>(${V("x")} − ${V("x̄")}).`,
            graph: graph({ view: [-1, 9, -1, 9], equal: true, items: [
              { t: "seg", a: [mb[0] - 8 * v[0].value, mb[1] - 8 * v[1].value], b: [mb[0] + 8 * v[0].value, mb[1] + 8 * v[1].value], role: "muted", dash: true },
              { t: "pt", x: mb[0], y: mb[1], label: "x̄", role: "secondary" }, { t: "pt", x: x[0], y: x[1], label: "x" }] }),
            steps: [
              `Center: ${V("x")} − ${V("x̄")} = (${M.n(dx[0])}, ${M.n(dx[1])}).`,
              `Score: ${V("z")} = ${ex(v[0])} · ${M.n(dx[0], { paren: true })} + ${exp_(v[1])} · ${M.n(dx[1], { paren: true })} = ${ex(z)}.`,
              `Reconstruct: ${V("x̂")} = (${mb[0]} + ${exp_(z)} · ${exp_(v[0])}, ${mb[1]} + ${exp_(z)} · ${exp_(v[1])}) = (${ex(xh[0])}, ${ex(xh[1])}), the closest point to ${V("x")} on the dashed line.`,
            ],
            answer: { kind: "point", value: [xh[0].value, xh[1].value] }, answerText: `(${ex(xh[0])}, ${ex(xh[1])})`, answerInput: `(${exIn(xh[0])}, ${exIn(xh[1])})`,
            vals: { dx, z: fv(z), xh: fvs(xh) }, params: { v: fvs(v), mb, x },
          };
        }
      },
    },

    // ---- ML.tsne t-SNE --------------------------------------------------------------------------------------------
    "ML.tsne": {
      title: "t-SNE affinities and objective",
      generate(r, level) {
        if (level === 1) {
          const a = [r.int(-3, 3), r.int(-3, 3)], b = [r.int(-3, 3), r.int(-3, 3)], d2 = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2, w = F(1, 1 + d2);
          return {
            prompt: `In a t-SNE map, two points sit at ${V("y")}<sub>${V("i")}</sub> = (${M.n(a[0])}, ${M.n(a[1])}) and ${V("y")}<sub>${V("j")}</sub> = (${M.n(b[0])}, ${M.n(b[1])}). Find their unnormalized Student-${V("t")} affinity ${M.sup(`(1 + ‖${V("y")}<sub>${V("i")}</sub> − ${V("y")}<sub>${V("j")}</sub>‖²)`, "−1")}. Give an exact fraction.`,
            steps: [
              `‖${V("y")}<sub>${V("i")}</sub> − ${V("y")}<sub>${V("j")}</sub>‖² = ${M.sup(`(${M.n(a[0])} − ${M.n(b[0], { paren: true })})`, 2)} + ${M.sup(`(${M.n(a[1])} − ${M.n(b[1], { paren: true })})`, 2)} = ${d2}.`,
              `${M.frac("1", `1 + ${d2}`)} = ${M.f(w)}. The heavy tail decays like 1/distance², far slower than a Gaussian.`,
            ],
            answer: { kind: "number", value: w.value }, answerText: M.f(w), answerInput: ty(w),
            vals: { d2, w: fv(w), den: 1 + d2 }, params: { a, b },
          };
        }
        if (level === 2) {
          for (;;) {
            const ys = r.sample([-3, -2, -1, 0, 1, 2, 3, 4], 3).sort((u, v) => u - v), pairs = [[0, 1], [0, 2], [1, 2]];
            const w = pairs.map(([i, j]) => F(1, 1 + (ys[i] - ys[j]) ** 2)), Z = sumF(w).mul(2), q = w[0].div(Z);
            return {
              prompt: `A 1-D t-SNE map has three points at ${V("y")} = ${listTxt(ys, M.n)} (call them A, B, C). Find ${V("q")}<sub>AB</sub> = ${M.frac(M.sup(`(1 + ‖${V("y")}<sub>A</sub> − ${V("y")}<sub>B</sub>‖²)`, "−1"), `Σ<sub>${V("k")}≠${V("l")}</sub> ${M.sup(`(1 + ‖${V("y")}<sub>${V("k")}</sub> − ${V("y")}<sub>${V("l")}</sub>‖²)`, "−1")}`)}, where the sum runs over ordered pairs. Give an exact fraction.`,
              steps: [
                `Affinities: AB: ${M.frac("1", `1 + ${(ys[0] - ys[1]) ** 2}`)} = ${M.f(w[0])}; AC: ${M.frac("1", `1 + ${(ys[0] - ys[2]) ** 2}`)} = ${M.f(w[1])}; BC: ${M.frac("1", `1 + ${(ys[1] - ys[2]) ** 2}`)} = ${M.f(w[2])}.`,
                `Each unordered pair appears twice among the ordered pairs: denominator = 2(${w.map((q) => M.f(q)).join(" + ")}) = ${M.f(Z)}.`,
                `${V("q")}<sub>AB</sub> = ${M.f(w[0])} ÷ ${M.f(Z)} = ${M.f(q)}.`,
              ],
              answer: { kind: "number", value: q.value }, answerText: M.f(q), answerInput: ty(q),
              vals: { d: pairs.map(([i, j]) => (ys[i] - ys[j]) ** 2), w: fvs(w), Z: fv(Z), q: fv(q) }, params: { ys },
            };
          }
        }
        for (;;) {
          const pp = [r.int(1, 6), r.int(1, 6), r.int(1, 6)], qq = [r.int(1, 6), r.int(1, 6), r.int(1, 6)];
          const p = pp.map((t) => F(t, 2 * sumN(pp))), q = qq.map((t) => F(t, 2 * sumN(qq)));
          if (p.every((t, i) => t.eq(q[i]))) continue;
          const terms = p.map((t, i) => t.value * Math.log(t.value / q[i].value)), C = 2 * sumN(terms);
          if (near(C, 3) || C < 0.001) continue;
          return {
            prompt: `For three points, t-SNE's symmetric affinities are given per unordered pair (each pair counts twice in Σ<sub>${V("i")}≠${V("j")}</sub>, so each row sums to ${M.f(F(1, 2))}): ${M.table(["pair", "AB", "AC", "BC"], [[V("p"), ...p.map((t) => M.f(t))], [V("q"), ...q.map((t) => M.f(t))]])} Find the t-SNE cost ${V("C")} = Σ<sub>${V("i")}≠${V("j")}</sub> ${V("p")}<sub>${V("i")}${V("j")}</sub> ln(${V("p")}<sub>${V("i")}${V("j")}</sub>/${V("q")}<sub>${V("i")}${V("j")}</sub>). Round to 3 decimal places.`,
            steps: [
              `Per unordered pair, ${V("p")} ln(${V("p")}/${V("q")}): ${p.map((t, i) => `${["AB", "AC", "BC"][i]}: ${M.f(t)} ln(${M.f(t)} ÷ ${M.f(q[i])}) ≈ ${ap(terms[i])}`).join("; ")}.`,
              `Their sum ≈ ${ap(sumN(terms))}; doubling for the two orders gives ${V("C")} ≈ ${ap(C)}.`,
              `${V("C")} is a KL divergence: 0 only if the map reproduces the neighbor structure exactly.`,
            ],
            answer: { kind: "number", value: C, dp: 3 }, answerText: `≈ ${fixed(C, 3)}`, answerInput: C.toFixed(3),
            vals: { terms, half: sumN(terms), C, h: fv(F(1, 2)) }, params: { p: fvs(p), q: fvs(q) }, consts: [3],
          };
        }
      },
    },

    // ---- ML.autoencoder Autoencoders and VAEs ----------------------------------------------------------------------
    "ML.autoencoder": {
      title: "Reconstruction loss, VAE KL and reparameterization",
      generate(r, level) {
        if (level === 1) {
          const x = range(4).map(() => F(r.int(0, 10), 10)), xh = x.map((t) => t.add(F(r.int(-3, 3), 10))), d = x.map((t, i) => t.sub(xh[i])), sq = d.map((t) => t.mul(t)), L = sumF(sq);
          return {
            prompt: `An autoencoder reconstructs a 4-pixel patch ${V("x")} = ${vec(x)} as ${V("x̂")} = ${vec(xh)}. Find the reconstruction loss ‖${V("x")} − ${V("x̂")}‖².`,
            steps: [
              `Differences: ${vec(d)}.`,
              `Squares ${listTxt(sq)}; sum ${ex(L)}.`,
            ],
            answer: { kind: "number", value: L.value }, answerText: ex(L), answerInput: exIn(L),
            vals: { d: fvs(d), sq: fvs(sq), L: fv(L) }, params: { x: fvs(x), xh: fvs(xh) }, consts: [4],
          };
        }
        if (level === 2) {
          for (;;) {
            const mu = range(2).map(() => F(r.int(-10, 10), 10)), s2 = range(2).map(() => r.pick([F(1, 4), F(1, 2), F(1), F(2), F(4)]));
            const terms = mu.map((m, i) => m.value ** 2 + s2[i].value - Math.log(s2[i].value) - 1), KL = sumN(terms) / 2;
            if (near(KL, 3)) continue;
            return {
              prompt: `A VAE encoder outputs mean ${V("μ")} = ${vec(mu)} and variance ${M.sup(V("σ"), 2)} = ${vec(s2)} for one input. Find the KL term ${M.eq(`${V("D")}<sub>KL</sub> = ${M.frac("1", "2")}Σ<sub>${V("j")}</sub>(${M.sup(`${V("μ")}<sub>${V("j")}</sub>`, 2)} + ${M.sup(`${V("σ")}<sub>${V("j")}</sub>`, 2)} − ln ${M.sup(`${V("σ")}<sub>${V("j")}</sub>`, 2)} − 1)`)} Round to 3 decimal places.`,
              steps: [
                ...range(2).map((j) => `Dimension ${j + 1}: ${M.sup(exp_(mu[j]), 2)} + ${ex(s2[j])} − ln ${ex(s2[j])} − 1 ≈ ${ex(mu[j].mul(mu[j]))} + ${ex(s2[j])} − ${app(Math.log(s2[j].value))} − 1 ≈ ${ap(terms[j])}.`),
                `Half the sum: ${M.frac("1", "2")}(${ap(terms[0])} + ${ap(terms[1])}) ≈ ${ap(KL)}. It is 0 only when ${V("μ")} = 0 and ${M.sup(V("σ"), 2)} = 1, the prior.`,
              ],
              answer: { kind: "number", value: KL, dp: 3 }, answerText: `≈ ${fixed(KL, 3)}`, answerInput: KL.toFixed(3),
              vals: { mu2: fvs(mu.map((m) => m.mul(m))), ln: s2.map((t) => Math.log(t.value)), terms, KL }, params: { mu: fvs(mu), s2: fvs(s2) }, consts: [3],
            };
          }
        }
        const mu = range(2).map(() => F(r.int(-10, 10), 10)), sg = range(2).map(() => r.pick([F(1, 2), F(1), F(2), F(1, 10)])), eps = range(2).map(() => F(r.int(-20, 20), 10));
        const z = mu.map((m, i) => m.add(sg[i].mul(eps[i]))), w = [r.nonzero(-2, 2), r.nonzero(-2, 2)], b = r.int(-2, 2), xh = z[0].mul(w[0]).add(z[1].mul(w[1])).add(b), x = F(r.int(-20, 20), 10), L = x.sub(xh).mul(x.sub(xh));
        return {
          prompt: `A VAE encodes an input with ${V("μ")} = ${vec(mu)} and ${V("σ")} = ${vec(sg)}. With noise ${V("ϵ")} = ${vec(eps)}, sample ${V("z")} = ${V("μ")} + ${V("σ")} ⊙ ${V("ϵ")}, decode with ${V("x̂")} = ${M.term(w[0], `${V("z")}₁`, { first: true })}${M.term(w[1], `${V("z")}₂`)}${M.term(b, "")}, and find the squared reconstruction error for the true value ${V("x")} = ${ex(x)}.`,
          steps: [
            `Reparameterize: ${V("z")} = (${ex(mu[0])} + ${ex(sg[0])} · ${exp_(eps[0])}, ${ex(mu[1])} + ${ex(sg[1])} · ${exp_(eps[1])}) = ${vec(z)}. The randomness sits in ${V("ϵ")}, so gradients flow through ${V("μ")} and ${V("σ")}.`,
            `Decode: ${V("x̂")} = ${M.n(w[0])} · ${exp_(z[0])} + ${M.n(w[1], { paren: true })} · ${exp_(z[1])} + ${M.n(b, { paren: true })} = ${ex(xh)}.`,
            `Error: ${M.sup(`(${ex(x)} − ${exp_(xh)})`, 2)} = ${M.sup(exp_(x.sub(xh)), 2)} = ${ex(L)}.`,
          ],
          answer: { kind: "number", value: L.value }, answerText: ex(L), answerInput: exIn(L),
          vals: { z: fvs(z), xh: fv(xh), diff: fv(x.sub(xh)), L: fv(L), aw: Math.abs(w[1]), ab: Math.abs(b) }, params: { mu: fvs(mu), sg: fvs(sg), eps: fvs(eps), w, b, x: fv(x) },
        };
      },
    },

    // ---- ML.gan GANs ----------------------------------------------------------------------------------------------------
    "ML.gan": {
      title: "GAN discriminator, losses and JS divergence",
      generate(r, level) {
        if (level === 1) {
          const pd = F(r.int(1, 9), 10), pg = F(r.int(1, 9), 10), D = pd.div(pd.add(pg));
          return {
            prompt: `At a point ${V("x")}, the data density is ${V("p")}<sub>data</sub>(${V("x")}) = ${ex(pd)} and the generator's density is ${V("p")}<sub>${V("g")}</sub>(${V("x")}) = ${ex(pg)}. What does the optimal discriminator output there? Give an exact value.`,
            steps: [
              `${V("D")}*(${V("x")}) = ${M.frac(`${V("p")}<sub>data</sub>`, `${V("p")}<sub>data</sub> + ${V("p")}<sub>${V("g")}</sub>`)} = ${M.frac(ex(pd), `${ex(pd)} + ${ex(pg)}`)} = ${M.frac(ex(pd), ex(pd.add(pg)))} = ${ex(D)}.`,
              pd.eq(pg) ? `The densities match, so the discriminator can do no better than ${ex(F(1, 2))}.` : `The point is ${pd.cmp(pg) > 0 ? "more" : "less"} typical of real data, so ${V("D")}* is ${pd.cmp(pg) > 0 ? "above" : "below"} ${ex(F(1, 2))}.`,
            ],
            answer: { kind: "number", value: D.value }, answerText: ex(D), answerInput: exIn(D),
            vals: { s: fv(pd.add(pg)), D: fv(D), half: fv(F(1, 2)) }, params: { pd: fv(pd), pg: fv(pg) },
          };
        }
        if (level === 2) {
          for (;;) {
            const dr = range(2).map(() => F(r.int(5, 9), 10)), df = range(2).map(() => F(r.int(1, 4), 10)), ns = r.chance(0.5);
            if (!ns) {
              const tr = dr.map((q) => Math.log(q.value)), tf = df.map((q) => Math.log(1 - q.value)), Vv = sumN(tr) / 2 + sumN(tf) / 2;
              if (near(Vv, 3)) continue;
              return {
                prompt: `A GAN discriminator outputs ${V("D")} = ${listTxt(dr)} on two real images and ${listTxt(df)} on two generated images. Estimate the value ${M.eq(`${V("V")} = mean ln ${V("D")}(real) + mean ln(1 − ${V("D")}(fake)).`)} Round to 3 decimal places.`,
                steps: [
                  `Real: ln ${ex(dr[0])} ≈ ${ap(tr[0])}, ln ${ex(dr[1])} ≈ ${ap(tr[1])}; mean ≈ ${ap(sumN(tr) / 2)}.`,
                  `Fake: ln(1 − ${ex(df[0])}) = ln ${ex(F(1).sub(df[0]))} ≈ ${ap(tf[0])}, ln ${ex(F(1).sub(df[1]))} ≈ ${ap(tf[1])}; mean ≈ ${ap(sumN(tf) / 2)}.`,
                  `${V("V")} ≈ ${ap(sumN(tr) / 2)} + ${app(sumN(tf) / 2)} ≈ ${ap(Vv)}. The discriminator tries to raise this toward 0; the generator tries to lower it.`,
                ],
                answer: { kind: "number", value: Vv, dp: 3 }, answerText: `≈ ${fixed(Vv, 3)}`, answerInput: Vv.toFixed(3),
                vals: { tr, tf, mr: sumN(tr) / 2, mf: sumN(tf) / 2, Vv, one: fvs(df.map((q) => F(1).sub(q))) }, params: { dr: fvs(dr), df: fvs(df), ns: 0 }, consts: [3],
              };
            }
            const fk = range(3).map(() => F(r.int(1, 30), 100)), t = fk.map((q) => -Math.log(q.value)), Lg = sumN(t) / 3;
            const sat = fk.map((q) => Math.log(1 - q.value)), Ls = sumN(sat) / 3;
            if (near(Lg, 3)) continue;
            return {
              prompt: `Early in training, the discriminator gives generated images ${V("D")}(${V("G")}(${V("z")})) = ${listTxt(fk)}. Find the non-saturating generator loss ${V("L")}<sub>${V("G")}</sub> = −mean ln ${V("D")}(${V("G")}(${V("z")})). Round to 3 decimal places.`,
              steps: [
                `−ln of each: ${fk.map((q, i) => `−ln ${ex(q)} ≈ ${ap(t[i])}`).join("; ")}.`,
                `Mean: ≈ ${ap(Lg)}.`,
                `Compare the saturating form mean ln(1 − ${V("D")}) ≈ ${ap(Ls)}: it sits near 0 and is flat when ${V("D")} is small, so it would give the generator almost no gradient.`,
              ],
              answer: { kind: "number", value: Lg, dp: 3 }, answerText: `≈ ${fixed(Lg, 3)}`, answerInput: Lg.toFixed(3),
              vals: { t, Lg, sat, Ls }, params: { fk: fvs(fk), ns: 1 }, consts: [3],
            };
          }
        }
        for (;;) {
          const a = [r.int(1, 8), r.int(1, 8), r.int(0, 8)], b = [r.int(0, 8), r.int(1, 8), r.int(1, 8)];
          const p = a.map((t) => F(t, sumN(a))), q = b.map((t) => F(t, sumN(b))), m = p.map((t, i) => t.add(q[i]).div(2));
          if (p.every((t, i) => t.eq(q[i]))) continue;
          const kl = (u) => sumN(u.map((t, i) => (t.n === 0 ? 0 : t.value * log2(t.value / m[i].value))));
          const kp = kl(p), kq = kl(q), JS = (kp + kq) / 2;
          if (near(JS, 3)) continue;
          return {
            prompt: `Real images fall into three styles with frequencies ${V("p")} = ${vec(p, (t) => M.f(t))}, while a generator produces them with frequencies ${V("q")} = ${vec(q, (t) => M.f(t))}. Find the Jensen–Shannon divergence ${M.eq(`JS(${V("p")} ‖ ${V("q")}) = ${M.frac("1", "2")}${V("D")}<sub>KL</sub>(${V("p")} ‖ ${V("m")}) + ${M.frac("1", "2")}${V("D")}<sub>KL</sub>(${V("q")} ‖ ${V("m")}),  ${V("m")} = ${M.frac(`${V("p")} + ${V("q")}`, "2")},`)} in bits. Round to 3 decimal places.`,
            steps: [
              `Mixture ${V("m")} = ${vec(m, (t) => M.f(t))}.`,
              `${V("D")}<sub>KL</sub>(${V("p")} ‖ ${V("m")}) = Σ ${V("p")} log₂(${V("p")}/${V("m")}) ≈ ${ap(kp)} (a term with ${V("p")} = 0 contributes 0).`,
              `${V("D")}<sub>KL</sub>(${V("q")} ‖ ${V("m")}) ≈ ${ap(kq)}.`,
              `JS ≈ ${M.frac("1", "2")}(${ap(kp)} + ${ap(kq)}) ≈ ${ap(JS)} bits. Unlike KL it is symmetric and never exceeds 1 bit.`,
            ],
            answer: { kind: "number", value: JS, dp: 3 }, answerText: `≈ ${fixed(JS, 3)} bits`, answerInput: JS.toFixed(3),
            vals: { m: fvs(m), kp, kq, JS }, params: { p: fvs(p), q: fvs(q) }, consts: [3],
          };
        }
      },
    },

    // ---- ML.mdp MDPs and the Bellman equation --------------------------------------------------------------------------
    "ML.mdp": {
      title: "Discounted return and Bellman equations",
      generate(r, level) {
        if (level === 1) {
          const g = r.pick([F(1, 2), F(9, 10), F(4, 5)]), k = r.int(3, 4), rw = range(k).map(() => r.int(-2, 5));
          const terms = rw.map((x, i) => g.pow(i).mul(x)), G = sumF(terms);
          return {
            prompt: `A robot receives rewards ${M.eq(listTxt(rw, M.n))} on its next ${k} steps and nothing afterwards. With discount ${V("γ")} = ${ex(g)}, find the return ${V("G")} = Σ ${M.sup(V("γ"), V("k"))}${V("r")}<sub>${V("t")}+${V("k")}+1</sub>.`,
            steps: [
              `Discount factors 1, ${range(k - 1).map((i) => ex(g.pow(i + 1))).join(", ")}.`,
              `${rw.map((x, i) => `${ex(g.pow(i))} · ${M.n(x, { paren: true })}`).join(" + ")} = ${chain(terms)} = ${ex(G)}.`,
            ],
            answer: { kind: "number", value: G.value }, answerText: ex(G), answerInput: exIn(G),
            vals: { gp: fvs(range(k).map((i) => g.pow(i))), terms: fvs(terms), G: fv(G) }, params: { g: fv(g), rw, k },
          };
        }
        if (level === 2) {
          const g = r.pick([F(1, 2), F(9, 10), F(4, 5), F(3, 4)]), ra = r.int(-2, 6), rb = r.intExcept(-2, 6, 0, ra === 0 ? 0 : 99);
          const VA = F(ra).add(g.mul(rb)).div(F(1).sub(g.mul(g))), VB = F(rb).add(g.mul(VA));
          return {
            prompt: `A two-state process alternates deterministically: from A it always moves to B with reward ${M.n(ra)}, and from B it always moves to A with reward ${M.n(rb)}. With ${V("γ")} = ${ex(g)}, solve the Bellman equations ${M.eq(`${V("V")}(A) = ${M.n(ra)} + ${V("γ")}${V("V")}(B),  ${V("V")}(B) = ${M.n(rb)} + ${V("γ")}${V("V")}(A)`)} for ${V("V")}(A). Give an exact value.`,
            steps: [
              `Substitute the second into the first: ${V("V")}(A) = ${M.n(ra)} + ${ex(g)}(${M.n(rb)} + ${ex(g)}${V("V")}(A)) = ${ex(F(ra).add(g.mul(rb)))} + ${ex(g.mul(g))}${V("V")}(A).`,
              `(1 − ${ex(g.mul(g))})${V("V")}(A) = ${ex(F(ra).add(g.mul(rb)))}, so ${V("V")}(A) = ${M.frac(ex(F(ra).add(g.mul(rb))), ex(F(1).sub(g.mul(g))))} = ${ex(VA)}.`,
              `(Then ${V("V")}(B) = ${M.n(rb)} + ${ex(g)} · ${exp_(VA)} = ${ex(VB)}.)`,
            ],
            answer: { kind: "number", value: VA.value }, answerText: ex(VA), answerInput: exIn(VA),
            vals: { top: fv(F(ra).add(g.mul(rb))), gg: fv(g.mul(g)), bot: fv(F(1).sub(g.mul(g))), VA: fv(VA), VB: fv(VB) }, params: { g: fv(g), ra, rb },
          };
        }
        for (;;) {
          const g = r.pick([F(9, 10), F(1, 2), F(4, 5)]), Vn = { X: r.int(0, 10), Y: r.int(0, 10), Z: r.int(0, 10) };
          const acts = ["left", "right"].map((nm) => {
            const [s1, s2] = r.sample(["X", "Y", "Z"], 2), p = r.pick([F(1, 2), F(3, 4), F(4, 5), F(1, 4)]), R = r.int(-2, 4);
            return { nm, s1, s2, p, R };
          });
          const Qs = acts.map((a) => a.p.mul(g.mul(Vn[a.s1]).add(a.R)).add(F(1).sub(a.p).mul(g.mul(Vn[a.s2]).add(a.R))));
          if (Qs[0].eq(Qs[1]) || new Set([Vn.X, Vn.Y, Vn.Z]).size < 3 || (acts[0].s1 + acts[0].s2).split("").sort().join() === (acts[1].s1 + acts[1].s2).split("").sort().join()) continue;
          const best = Qs[0].cmp(Qs[1]) > 0 ? 0 : 1;
          return {
            prompt: `In state S a robot can move left or right; either way it gets the reward shown, then lands in a next state at random. Current value estimates: ${V("V")}(X) = ${Vn.X}, ${V("V")}(Y) = ${Vn.Y}, ${V("V")}(Z) = ${Vn.Z}. ${M.table(["action", "reward", "next states"], acts.map((a) => [a.nm, M.n(a.R), `${a.s1} with prob. ${ex(a.p)}, ${a.s2} with prob. ${ex(F(1).sub(a.p))}`]))} With ${V("γ")} = ${ex(g)}, do one value-iteration backup: find ${V("V")}(S) = max<sub>${V("a")}</sub> Σ ${V("P")}(${V("s")}′)[${V("R")} + ${V("γ")}${V("V")}(${V("s")}′)].`,
            steps: [
              ...acts.map((a, i) => `${a.nm}: ${ex(a.p)}(${M.n(a.R)} + ${ex(g)} · ${Vn[a.s1]}) + ${ex(F(1).sub(a.p))}(${M.n(a.R)} + ${ex(g)} · ${Vn[a.s2]}) = ${ex(Qs[i])}.`),
              `Take the better action, ${acts[best].nm}: ${V("V")}(S) = ${ex(Qs[best])}.`,
            ],
            answer: { kind: "number", value: Qs[best].value }, answerText: ex(Qs[best]), answerInput: exIn(Qs[best]),
            vals: { Qs: fvs(Qs), q: fvs(acts.map((a) => F(1).sub(a.p))), best }, params: { g: fv(g), Vn: [Vn.X, Vn.Y, Vn.Z], acts: acts.map((a) => [a.R, fv(a.p), "XYZ".indexOf(a.s1), "XYZ".indexOf(a.s2)]) },
          };
        }
      },
    },

    // ---- ML.rl Q-learning and policy evaluation ------------------------------------------------------------------------
    "ML.rl": {
      title: "TD error, Q-learning and advantages",
      generate(r, level) {
        const Q = V("Q");
        if (level <= 2) {
          const q = F(r.int(-20, 60), 10), rw = r.int(-2, 5), g = r.pick([F(9, 10), F(1, 2), F(99, 100)]), nxt = range(3).map(() => F(r.int(-10, 80), 10)), al = r.pick([F(1, 10), F(1, 2), F(1, 4)]);
          const mx = nxt.reduce((a, b) => (b.cmp(a) > 0 ? b : a)), tgt = g.mul(mx).add(rw), delta = tgt.sub(q), nq = q.add(al.mul(delta));
          const pre = `An agent in state ${V("s")} took action ${V("a")} with ${Q}(${V("s")}, ${V("a")}) = ${ex(q)}, received reward ${M.n(rw)} and landed in ${V("s")}′, where the three actions have ${Q}-values ${listTxt(nxt)}. The discount is ${V("γ")} = ${ex(g)}.`;
          const s1 = `Best next value: max = ${ex(mx)}. Target: ${M.n(rw)} + ${ex(g)} · ${exp_(mx)} = ${ex(tgt)}.`;
          const s2 = `TD error ${V("δ")} = ${ex(tgt)} − ${exp_(q)} = ${ex(delta)}.`;
          if (level === 1) {
            return {
              prompt: `${pre} Find the TD error ${V("δ")} = ${V("r")} + ${V("γ")} max<sub>${V("a")}′</sub> ${Q}(${V("s")}′, ${V("a")}′) − ${Q}(${V("s")}, ${V("a")}).`,
              steps: [s1, s2 + (delta.n > 0 ? " Positive: the outcome was better than expected." : delta.n < 0 ? " Negative: worse than expected." : "")],
              answer: { kind: "number", value: delta.value }, answerText: ex(delta), answerInput: exIn(delta),
              vals: { mx: fv(mx), tgt: fv(tgt), delta: fv(delta) }, params: { q: fv(q), rw, g: fv(g), nxt: fvs(nxt) },
            };
          }
          return {
            prompt: `${pre} With learning rate ${V("α")} = ${ex(al)}, find the Q-learning update of ${Q}(${V("s")}, ${V("a")}).`,
            steps: [s1, s2, `${Q}(${V("s")}, ${V("a")}) ← ${ex(q)} + ${ex(al)} · ${exp_(delta)} = ${ex(nq)}.`],
            answer: { kind: "number", value: nq.value }, answerText: ex(nq), answerInput: exIn(nq),
            vals: { mx: fv(mx), tgt: fv(tgt), delta: fv(delta), nq: fv(nq) }, params: { q: fv(q), rw, g: fv(g), nxt: fvs(nxt), al: fv(al) },
          };
        }
        for (;;) {
          const nA = r.pick([3, 4]), qs = range(nA).map(() => r.int(-2, 10)), eps = r.pick([F(1, 10), F(1, 5), F(1, 2), F(2, 5)]);
          const gi = qs.indexOf(Math.max(...qs));
          if (qs.filter((t) => t === qs[gi]).length > 1) continue;
          const pOther = eps.div(nA), pGreedy = F(1).sub(eps).add(pOther), pi = qs.map((_, i) => (i === gi ? pGreedy : pOther));
          const Vs = sumF(pi.map((p, i) => p.mul(qs[i]))), a = r.intExcept(0, nA - 1, gi), adv = F(qs[a]).sub(Vs);
          return {
            prompt: `In state ${V("s")}, the actions ${LET.slice(0, nA).split("").join(", ")} have ${Q}-values ${listTxt(qs, M.n)}. The agent follows an ${V("ε")}-greedy policy with ${V("ε")} = ${ex(eps)} (a uniformly random action with probability ${V("ε")}, otherwise the greedy one). Find ${V("V")}(${V("s")}) = Σ<sub>${V("a")}</sub> ${V("π")}(${V("a")} | ${V("s")})${Q}(${V("s")}, ${V("a")}) and then the advantage ${V("A")}(${V("s")}, ${LET[a]}) = ${Q}(${V("s")}, ${LET[a]}) − ${V("V")}(${V("s")}). Enter the advantage.`,
            steps: [
              `The greedy action is ${LET[gi]}. Each action gets ${M.frac(V("ε"), String(nA))} = ${ex(pOther)} from exploration; ${LET[gi]} also gets 1 − ${V("ε")}: ${ex(F(1).sub(eps))} + ${ex(pOther)} = ${ex(pGreedy)}.`,
              `${V("V")}(${V("s")}) = ${qs.map((t, i) => `${ex(pi[i])} · ${M.n(t, { paren: true })}`).join(" + ")} = ${ex(Vs)}.`,
              `${V("A")}(${V("s")}, ${LET[a]}) = ${M.n(qs[a])} − ${exp_(Vs)} = ${ex(adv)}: ${adv.n < 0 ? "worse than the policy's average, so a policy-gradient step would make it less likely" : "better than the policy's average, so a policy-gradient step would make it more likely"}.`,
            ],
            answer: { kind: "number", value: adv.value }, answerText: ex(adv), answerInput: exIn(adv),
            vals: { pOther: fv(pOther), om: fv(F(1).sub(eps)), pGreedy: fv(pGreedy), Vs: fv(Vs), adv: fv(adv), gi, nA }, params: { qs, eps: fv(eps), a },
          };
        }
      },
    },

  });
})(Practice);
