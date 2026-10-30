/*
 * practice/calculus1.js — Calculus I practice problems (chapter 07), one generator per concept key.
 *
 * Each generator(r, level) draws hand-solvable numbers for the level (1 easy, 2 medium, 3 hard) and
 * builds every number it shows from values it computes and reports in `vals`; tools/practice/
 * verifiers/calculus1.py recomputes each of them independently with SymPy (limit, diff, integrate,
 * solve). See practice/core.js for the API.
 *
 * Skipped concepts: none. Every concept of the chapter has something to compute.
 */
(function (P) {
  "use strict";
  const { Frac, M, fmt, graph } = P;
  const Q = (a, b = 1) => new Frac(a, b);
  const n = (v) => M.n(v);
  const np = (v) => M.n(v, { paren: true });   // (−3) in substitutions
  const f = (q) => M.f(q);
  const fp = (q) => M.f(q, { paren: true });
  const fv = (q) => { q = Frac.of(q); return { n: q.n, d: q.d }; };
  const typed = (v) => { const q = Frac.of(v); return q.d === 1 ? String(q.n) : `${q.n}/${q.d}`; };
  const x = M.v("x"), y = M.v("y"), t = M.v("t"), u = M.v("u");
  const fx = (name = "f", arg = x) => `${M.v(name)}(${arg})`;
  const xp = (k, v = x) => (k === 1 ? v : M.sup(v, k));
  /** A signed number term for sums, coefficient always shown: ' + 3 · (−2)', ' − 5'; '' for 0. */
  const st = (c, body = "") => {
    const q = Frac.of(c); if (q.n === 0) return "";
    if (q.abs().eq(1) && body.startsWith(" · ")) return ` ${q.n < 0 ? "−" : "+"} ${body.slice(3)}`;
    return ` ${q.n < 0 ? "−" : "+"} ${M.f(q.abs())}${body}`;
  };
  /** k times a variable: x, −x, 3x (never 1x). */
  const kv = (k, v = x) => { const q = Frac.of(k); return q.eq(1) ? v : q.eq(-1) ? `−${v}` : `${M.f(q)}${v}`; };
  /** A signed variable term for sums: ' + 3x', ' − x'. */
  const vt = (k, v = x) => M.term(k, v);
  /** The factor (x − p), or just x when p = 0. */
  const fac = (p, v = x) => (p === 0 ? v : `(${M.poly([1, -p], v.replace(/<\/?i>/g, ""))})`);
  /** lim with its subscript; side "+" or "−" for one-sided limits. */
  const lim = (to, side = "", v = x) => `${M.sub("lim", `${v} → ${to}${side ? `<sup>${side}</sup>` : ""}`)} `;
  const inf = "∞";
  /** An arithmetic chain a = b = c, dropping a link identical to the one before it. */
  const chain = (...parts) => parts.filter((v, i) => i === 0 || v !== parts[i - 1]).join(" = ");
  /** c · body, with "c · " dropped for 1 and "−" for −1. */
  const cdot = (c, body) => (c === 1 ? body : c === -1 ? `−${body}` : `${n(c)} · ${body}`);
  /** A signed term c/x^k: ' + 3/x²'. */
  const over = (c, k, v = x) => (c === 0 ? "" : ` ${c < 0 ? "−" : "+"} ${M.frac(n(Math.abs(c)), xp(k, v))}`);

  // ---- polynomials as coefficient lists, highest power first (ints or Fracs) ----
  const peval = (cs, v) => cs.reduce((acc, c) => acc.mul(v).add(c), Q(0));
  const pder = (cs) => cs.slice(0, -1).map((c, i) => Frac.of(c).mul(cs.length - 1 - i));
  /** Parser syntax for a polynomial. */
  const pstr = (cs, v = "x") => cs.map((c, i) => `(${typed(c)})*${v}^${cs.length - 1 - i}`).join(" + ");
  /** Exponents above 2 that a polynomial shows (to list as structural constants). */
  const pows = (cs) => cs.map((c, i) => (Frac.of(c).n !== 0 ? cs.length - 1 - i : 0)).filter((p) => p > 2);

  /** The part of the line through (x0, y0) with slope m inside the view and [xa, xb], as a seg item (or null). */
  function lineSeg(m, x0, y0, xa, xb, view, extra = {}) {
    const ylo = view[2], yhi = view[3], at = (xx) => y0 + m * (xx - x0);
    let lo = Math.max(xa, view[0]), hi = Math.min(xb, view[1]);
    if (m !== 0) {
      const xA = x0 + (ylo - y0) / m, xB = x0 + (yhi - y0) / m;
      lo = Math.max(lo, Math.min(xA, xB)); hi = Math.min(hi, Math.max(xA, xB));
    } else if (y0 < ylo || y0 > yhi) return null;
    if (lo >= hi) return null;
    return Object.assign({ t: "seg", a: [lo, at(lo)], b: [hi, at(hi)] }, extra);
  }
  /** c · body with c as a juxtaposed coefficient: 3(x + 1), −(x + 1), (x + 1). */
  const pdot = (c, body) => (c === 1 ? body : c === -1 ? `−${body}` : `${n(c)}${body}`);
  /** f′(arg). */
  const fpr = (arg = x, name = "f") => `${M.v(name)}′(${arg})`;
  /** A coefficient times a named function, spaced: 3 sin x, −cos x; signed unless first. */
  const ft = (c, body, first = false) => {
    const q = Frac.of(c); if (q.n === 0) return "";
    const b = q.abs().eq(1) ? body : `${M.f(q.abs())} ${body}`;
    return first ? `${q.n < 0 ? "−" : ""}${b}` : ` ${q.n < 0 ? "−" : "+"} ${b}`;
  };
  /** A signed fraction term: ' − 3/(x²)'. */
  const sfr = (c, bottom, first = false) => { if (c === 0) return ""; const body = M.frac(n(Math.abs(c)), bottom); return first ? `${c < 0 ? "−" : ""}${body}` : ` ${c < 0 ? "−" : "+"} ${body}`; };
  /** A polynomial as a person would type it. */
  const plain = (cs, v = "x") => {
    let out = "";
    cs.forEach((c, i) => {
      const q = Frac.of(c), p = cs.length - 1 - i;
      if (q.n === 0) return;
      const mag = q.abs(), coef = mag.eq(1) && p > 0 ? "" : mag.d === 1 ? String(mag.n) : `(${typed(mag)})`;
      const body = p === 0 ? coef : `${coef}${p > 1 ? `${v}^${p}` : v}`;
      out += out === "" ? `${q.n < 0 ? "-" : ""}${body}` : ` ${q.n < 0 ? "-" : "+"} ${body}`;
    });
    return out || "0";
  };
  /** Substitute v into a polynomial: [the substitution, the evaluated terms, the term values, the total]. */
  function subst(cs, v) {
    let a = "", b = "";
    const terms = [];
    cs.forEach((c, i) => {
      const k = cs.length - 1 - i;
      if (Frac.of(c).n === 0) return;
      const pw = k === 0 ? "" : k === 1 ? np(v) : M.sup(np(v), k), tv = Frac.of(c).mul(Frac.of(v).pow(k));
      terms.push(tv);
      if (a === "") { a = k === 0 ? n(c) : cdot(c, pw); b = f(tv); } else { a += k === 0 ? st(c) : st(c, ` · ${pw}`); b += st(tv); }
    });
    const total = terms.reduce((s2, q) => s2.add(q), Q(0));
    return [a, b, terms, total];
  }
  /** A view [x0, x1, y0, y1] around a curve on [x0, x1] that keeps the given heights inside. */
  function fit(x0, x1, fnum, extra = []) {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= 80; i++) { const v = fnum(x0 + ((x1 - x0) * i) / 80); if (Number.isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }
    extra.forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v); });
    const pad = Math.max(1, (hi - lo) * 0.12);
    return [x0, x1, Math.floor(lo - pad), Math.ceil(hi + pad)];
  }
  const dd = (top = "", v = x) => M.frac(`d${top}`, `d${v}`);
  const items = (...list) => list.filter(Boolean);
  const hole = (a, b, role = "primary") => ({ t: "circle", c: [a, b], r: 0.15, role });
  /** A text label at (x, y), nudged inside the view. */
  const label = (s, xx, yy, view) => ({ t: "text", s, x: Math.min(Math.max(xx, view[0] + 0.4), view[1] - 0.4), y: Math.min(Math.max(yy, view[2] + 0.4), view[3] - 0.4) });

  P.define("calculus1", {
    // ---- C1.1 Limits and limit laws ----------------------------------------------------------------
    "C1.1": {
      title: "Limits and the limit laws",
      generate(r, level) {
        if (level === 1) {
          const p = r.nonzero(-3, 3), q = r.int(-6, 6), c = r.int(-9, 9), a = r.int(-4, 4);
          const sq = a * a, A = p * sq, B = q * a, ans = A + B + c;
          return {
            prompt: `Find ${M.eq(`${lim(n(a))}(${M.poly([p, q, c])})`)}`,
            steps: [
              `A polynomial is continuous everywhere, so the limit is simply its value at ${x} = ${n(a)} (direct substitution).`,
              `${chain(`${cdot(p, M.sup(np(a), 2))}${st(q, ` · ${np(a)}`)}${st(c)}`, `${n(A)}${st(B)}${st(c)}`, n(ans))}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
            vals: { sq, A, B, ans }, params: { p, q, c, a },
          };
        }
        if (level === 2) {
          for (;;) {
            const a = r.int(-5, 5), A = r.nonzero(-6, 6), B = r.nonzero(-5, 5), c = r.int(2, 5), d = r.nonzero(-6, 6);
            const D = A - d, cA = c * A, BB = B * B, N = cA + BB;
            if (D === 0 || N === 0) continue;
            const ans = Q(N, D), F = fx("f"), G = fx("g"), L = lim(n(a));
            return {
              prompt: `Suppose ${L}${F} = ${n(A)} and ${L}${G} = ${n(B)}. Find ${M.eq(`${L}${M.frac(`${n(c)}${F} + ${M.sup(`[${G}]`, 2)}`, `${F}${st(-d)}`)}`)}`,
              steps: [
                `Check the bottom first. By the sum law, ${L}[${F}${st(-d)}] = ${n(A)}${st(-d)} = ${n(D)}. It is not 0, so the quotient law applies.`,
                `The top, by the sum, constant-multiple and power laws: ${n(c)} · ${np(A)} + ${M.sup(np(B), 2)} = ${n(cA)} + ${n(BB)} = ${n(N)}.`,
                `Quotient law: the limit is ${n(N)} ÷ ${np(D)} = ${f(ans)}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
              vals: { D, cA, BB, N, ans: fv(ans) }, params: { a, A, B, c, d },
            };
          }
        }
        // level 3: read the two limits from a graph (f has a hole and a displaced dot), then combine
        for (;;) {
          const a = r.int(-3, 3), Lf = r.int(-3, 3), Fa = r.int(-3, 3), Lg = r.int(-3, 3);
          if (Fa === Lf || Lg === Lf || Fa === Lg) continue;
          const m1 = r.pick([-1, -0.5, 0.5, 1]), parab = r.chance(0.5), s = r.pick([-0.5, 0.5]), m2 = r.pick([-1, -0.5, 0.5, 1]);
          const prod = r.chance(0.5) ? 1 : 0, c = r.pick([2, 3, -2]);
          const cLg = c * Lg, ans = prod ? Lf * Lg : Lf + cLg;
          if (ans === 0 && r.chance(0.7)) continue;
          const view = [-6, 6, -4, 4], F = fx("f"), G = fx("g"), L = lim(n(a));
          const ge = parab ? `${s}*(x - (${a}))^2 + (${Lg})` : `${m2}*(x - (${a})) + (${Lg})`;
          const xl = a + 2 <= 5 ? a + 2 : a - 2, xg = a - 2 >= -5 ? a - 2 : a + 2;
          const gAt = (xx) => (parab ? s * (xx - a) ** 2 + Lg : m2 * (xx - a) + Lg);
          const g = graph({ view, items: items(
            lineSeg(m1, a, Lf, -6, a - 0.15, view), lineSeg(m1, a, Lf, a + 0.15, 6, view), hole(a, Lf), { t: "pt", x: a, y: Fa },
            { t: "fn", e: ge, role: "secondary" },
            label("f", xl, Lf + m1 * (xl - a) + 0.6, view), label("g", xg, gAt(xg) + 0.6, view)) });
          const expr = prod ? `${F} · ${G}` : `[${F}${st(c, G)}]`;
          return {
            prompt: `The graph shows ${M.v("f")} (a line with an open circle at ${x} = ${n(a)} and a separate dot above or below it) and ${M.v("g")} (the other curve). Find ${M.eq(`${L}${expr}`)}`,
            graph: g,
            steps: [
              `As ${x} → ${n(a)} from either side, the graph of ${M.v("f")} heads to the open circle at height ${n(Lf)}, so ${L}${F} = ${n(Lf)}. The dot at (${n(a)}, ${n(Fa)}) is the value ${M.v("f")}(${n(a)}) = ${n(Fa)}, which a limit ignores.`,
              `${M.v("g")} has no break at ${x} = ${n(a)}, so ${L}${G} = ${M.v("g")}(${n(a)}) = ${n(Lg)}.`,
              prod ? `Product law: ${n(Lf)} · ${np(Lg)} = ${n(ans)}.`
                : `Sum and constant-multiple laws: ${chain(`${n(Lf)}${st(c, ` · ${np(Lg)}`)}`, `${n(Lf)}${st(cLg)}`, n(ans))}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
            vals: prod ? { ans } : { cLg, ans }, params: { a, Lf, Fa, Lg, prod, c, m1, parab: parab ? 1 : 0, s, m2 },
          };
        }
      },
    },

    // ---- C1.2 One-sided and infinite limits ------------------------------------------------------------
    "C1.one-sided": {
      title: "One-sided and infinite limits",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const a = r.int(-3, 3), p = r.nonzero(-2, 2), q = r.int(-5, 5), m = r.nonzero(-4, 4), k = r.int(-6, 6), left = r.chance(0.5) ? 1 : 0;
            const pa2 = p * a * a, Lv = pa2 + q, ma = m * a, Rv = ma + k;
            if (Lv === Rv) continue;
            const ans = left ? Lv : Rv, F = fx("f");
            return {
              prompt: `Let ${F} = ${M.poly([p, 0, q])} for ${x} &lt; ${n(a)} and ${F} = ${M.poly([m, k])} for ${x} ≥ ${n(a)}. Find ${M.eq(`${lim(n(a), left ? "−" : "+")}${F}`)}`,
              steps: [
                left ? `The limit from the left only uses ${x} &lt; ${n(a)}, where ${F} = ${M.poly([p, 0, q])}.`
                  : `The limit from the right only uses ${x} &gt; ${n(a)}, where ${F} = ${M.poly([m, k])}.`,
                left ? `That piece is a polynomial, so substitute ${x} = ${n(a)}: ${chain(`${cdot(p, M.sup(np(a), 2))}${st(q)}`, `${n(pa2)}${st(q)}`, n(Lv))}.`
                  : `That piece is a polynomial, so substitute ${x} = ${n(a)}: ${chain(`${n(m)} · ${np(a)}${st(k)}`, `${n(ma)}${st(k)}`, n(Rv))}.`,
                `(From the ${left ? "right" : "left"} the other piece gives ${n(left ? Rv : Lv)}. The one-sided limits differ, so the two-sided limit does not exist.)`,
              ],
              answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
              vals: { pa2, Lv, ma, Rv }, params: { a, p, q, m, k, left },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const a = r.int(-4, 4), b = r.nonzero(-4, 4), c = r.int(-8, 8), N = b * a + c;
            if (N === 0) continue;
            const sq = r.chance(0.35) ? 1 : 0, plus = r.chance(0.5) ? 1 : 0;
            const dsign = sq ? 1 : plus ? 1 : -1, sign = Math.sign(N) * dsign;
            const base = fac(a), den = sq ? M.sup(base === x ? x : base, 2) : (a === 0 ? x : M.poly([1, -a]));
            const options = [inf, `−${inf}`, "0", n(N)], index = sign > 0 ? 0 : 1;
            const side = plus ? "right" : "left";
            return {
              prompt: `Find ${M.eq(`${lim(n(a), plus ? "+" : "−")}${M.frac(M.poly([b, c]), den)}`)}`,
              steps: [
                `Substitute ${x} = ${n(a)}: the top is ${chain(`${n(b)} · ${np(a)}${st(c)}`, n(N))} and the bottom is 0. A nonzero number over 0 means the limit is infinite; the signs decide which way.`,
                sq ? `The bottom ${den} is a square, so it is a small positive number on both sides of ${n(a)}.`
                  : `For ${x} just to the ${side} of ${n(a)}, ${a === 0 ? x : M.poly([1, -a])} is a small ${plus ? "positive" : "negative"} number.`,
                `A ${N > 0 ? "positive" : "negative"} number divided by a small ${dsign > 0 ? "positive" : "negative"} one is huge and ${sign > 0 ? "positive" : "negative"}: the limit is ${options[index]}. The line ${x} = ${n(a)} is a vertical asymptote.`,
              ],
              answer: { kind: "choice", options, index }, answerText: options[index],
              vals: { N }, params: { a, b, c, sq, plus },
            };
          }
        }
        // level 3: read a jump from a graph
        for (;;) {
          const a = r.int(-2, 2), Lv = r.int(-3, 3), Rv = r.int(-3, 3);
          if (Lv === Rv) continue;
          const m1 = r.pick([-1, -0.5, 0, 0.5, 1]), m2 = r.pick([-1, -0.5, 0, 0.5, 1]), which = r.int(0, 2);
          const V = which === 0 ? Lv : which === 1 ? Rv : r.int(-3, 3);
          if (which === 2 && (V === Lv || V === Rv)) continue;
          const view = [-6, 6, -4, 4], J = Rv - Lv, F = fx("f");
          const g = graph({ view, items: items(
            lineSeg(m1, a, Lv, -6, which === 0 ? a : a - 0.15, view), lineSeg(m2, a, Rv, which === 1 ? a : a + 0.15, 6, view),
            which !== 0 ? hole(a, Lv) : null, which !== 1 ? hole(a, Rv) : null, { t: "pt", x: a, y: V }) });
          return {
            prompt: `Use the graph of ${M.v("f")} to find ${M.eq(`${lim(n(a), "−")}${F}, ${lim(n(a), "+")}${F} and ${fx("f", n(a))}`)} Enter the three numbers in that order, separated by commas.`,
            graph: g,
            steps: [
              `Follow the left piece toward ${x} = ${n(a)}: it approaches height ${n(Lv)}, so the left-hand limit is ${n(Lv)}.`,
              `Follow the right piece toward ${x} = ${n(a)}: it approaches height ${n(Rv)}, so the right-hand limit is ${n(Rv)}.`,
              `The filled dot is at (${n(a)}, ${n(V)}), so ${fx("f", n(a))} = ${n(V)}; an open circle marks a height the graph approaches but does not take there.`,
              `The one-sided limits differ (a jump of ${n(Rv)} − ${np(Lv)} = ${n(J)}), so ${lim(n(a))}${F} does not exist.`,
            ],
            answer: { kind: "numbers", values: [Lv, Rv, V], ordered: true }, answerText: `${n(Lv)}, ${n(Rv)}, ${n(V)}`, answerInput: `${Lv}, ${Rv}, ${V}`,
            vals: { J }, params: { a, Lv, Rv, V, which, m1, m2 },
          };
        }
      },
    },

    // ---- C1.3 Limits at infinity ---------------------------------------------------------------------
    "C1.limits-infinity": {
      title: "Limits at infinity",
      generate(r, level) {
        if (level === 1) {
          const k = r.int(1, 3), a = r.nonzero(-6, 6), d = r.int(1, 6);
          const top = [a], bot = [d];
          for (let i = 0; i < k; i++) { top.push(r.int(-9, 9)); bot.push(r.int(-9, 9)); }
          const neg = r.chance(0.3) ? 1 : 0, ans = Q(a, d), to = neg ? `−${inf}` : inf;
          const divided = (cs) => n(cs[0]) + cs.slice(1).map((c, i) => over(c, i + 1)).join("");
          return {
            prompt: `Find ${M.eq(`${lim(to)}${M.frac(M.poly(top), M.poly(bot))}`)}`,
            steps: [
              `The top and the bottom both have degree ${n(k)}. Divide every term by ${xp(k)}, the highest power in the bottom: ${M.frac(divided(top), divided(bot))}.`,
              `As ${x} → ${to}, every term ${M.frac(M.v("c"), M.sup(x, M.v("p")))} → 0, leaving ${M.frac(n(a), n(d))}${ans.d !== d ? ` = ${f(ans)}` : ""}.`,
              `The limit is ${f(ans)}: the line ${y} = ${f(ans)} is a horizontal asymptote.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { ans: fv(ans) }, params: { k, top, bot, neg },
          };
        }
        if (level === 2) {
          // the square-root sign trap: √(x²) = |x|
          const s = r.int(1, 4), pp = s * s, q = r.int(1, 9), c = r.int(1, 5), d = r.int(-9, 9), neg = r.chance(0.75) ? 1 : 0;
          const ans = Q(neg ? -s : s, c), to = neg ? `−${inf}` : inf, root = M.sqrt(M.poly([pp, 0, q]));
          const sg = neg ? "−" : "";
          return {
            prompt: `Find ${M.eq(`${lim(to)}${M.frac(root, M.poly([c, d]))}`)}`,
            steps: [
              `The highest power in the bottom is ${x}; divide the top and the bottom by ${x}.`,
              neg ? `For ${x} &lt; 0, ${M.sqrt(M.sup(x, 2))} = |${x}| = −${x}, so ${x} = −${M.sqrt(M.sup(x, 2))}. Dividing the root by ${x} therefore gives ${M.frac(root, x)} = −${M.sqrt(M.frac(M.poly([pp, 0, q]), M.sup(x, 2)))} = −${M.sqrt(`${n(pp)}${over(q, 2)}`)}.`
                : `For ${x} &gt; 0, ${x} = ${M.sqrt(M.sup(x, 2))}, so ${M.frac(root, x)} = ${M.sqrt(M.frac(M.poly([pp, 0, q]), M.sup(x, 2)))} = ${M.sqrt(`${n(pp)}${over(q, 2)}`)}.`,
              `The expression becomes ${M.frac(`${sg}${M.sqrt(`${n(pp)}${over(q, 2)}`)}`, `${n(c)}${over(d, 1)}`)}.`,
              `As ${x} → ${to}, ${M.frac(n(q), M.sup(x, 2))} → 0${d !== 0 ? ` and ${M.frac(n(Math.abs(d)), x)} → 0` : ""}: ${M.frac(`${sg}${M.sqrt(n(pp))}`, n(c))} = ${M.frac(`${sg}${n(s)}`, n(c))}${ans.d !== c ? ` = ${f(ans)}` : ""}.${neg ? ` (Forgetting that ${M.sqrt(M.sup(x, 2))} = −${x} here would give the wrong sign.)` : ""}`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { s, ans: fv(ans) }, params: { pp, q, c, d, neg },
          };
        }
        // level 3: a mixing tank, modeled and then sent to infinity
        for (;;) {
          const V0 = r.pick([100, 200, 250, 400, 500]), S0 = r.pick([50, 100, 200, 300, 600]), C = r.pick([2, 3, 4, 5, 8, 10, 12, 15]), rate = r.pick([2, 4, 5, 10, 20]);
          if (S0 === C * V0) continue;
          const Cr = C * rate, c0 = Q(S0, V0);
          return {
            prompt: `A large tank holds ${n(V0)} L of water with ${n(S0)} g of salt dissolved in it. Brine containing ${n(C)} g of salt per liter flows in at ${n(rate)} L/min and mixes in instantly; nothing flows out. What does the salt concentration in the tank approach in the long run, in g/L?`,
            steps: [
              `After ${t} minutes the tank holds ${n(S0)} + ${n(C)} · ${n(rate)}${t} = ${n(S0)} + ${n(Cr)}${t} grams of salt in ${n(V0)} + ${n(rate)}${t} liters.`,
              `Concentration: ${fx("c", t)} = ${M.frac(`${n(S0)} + ${n(Cr)}${t}`, `${n(V0)} + ${n(rate)}${t}`)} g/L. At the start it is ${M.frac(n(S0), n(V0))} = ${n(c0.value)} g/L.`,
              `Top and bottom both have degree 1. Divide every term by ${t}: ${fx("c", t)} = ${M.frac(`${M.frac(n(S0), t)} + ${n(Cr)}`, `${M.frac(n(V0), t)} + ${n(rate)}`)}.`,
              `As ${t} → ${inf} the terms over ${t} vanish: ${M.frac(n(Cr), n(rate))} = ${n(C)} g/L, the concentration of the incoming brine.`,
            ],
            answer: { kind: "number", value: C }, answerText: `${n(C)} g/L`, answerInput: String(C),
            vals: { Cr, c0: c0.value }, params: { V0, S0, C, rate },
          };
        }
      },
    },

    // ---- C1.4 Indeterminate forms ---------------------------------------------------------------------
    "C1.indeterminate": {
      title: "Indeterminate forms",
      generate(r, level) {
        if (level === 1) {
          const a = r.nonzero(-6, 6), b = r.intExcept(-6, 6, a);
          const s = a + b, pr = a * b, ans = a - b, aa = a * a, sa = -s * a;
          const top = M.poly([1, -s, pr]);
          return {
            prompt: `Find ${M.eq(`${lim(n(a))}${M.frac(top, M.poly([1, -a]))}`)}`,
            steps: [
              `Substitute ${x} = ${n(a)}: the top is ${M.sup(np(a), 2)}${st(-s, ` · ${np(a)}`)}${st(pr)} = ${n(aa)}${st(sa)}${st(pr)} = 0 and the bottom is 0. The form 0/0 is indeterminate: simplify first.`,
              `Factor the top. Two numbers with product ${n(pr)} and sum ${n(-s)} are ${n(-a)} and ${n(-b)}: ${top} = ${fac(a)}${fac(b)}.`,
              `Cancel the common factor ${M.poly([1, -a])}. This is allowed because the limit never uses ${x} = ${n(a)} itself. What is left is ${M.poly([1, -b])}.`,
              `Now substitute: ${n(a)} − ${np(b)} = ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
            vals: { s, pr, aa, sa, ans }, params: { a, b },
          };
        }
        if (level === 2) {
          // ∞ − ∞ by the conjugate
          const A = r.int(1, 3), b = r.nonzero(-9, 9), c = r.int(-9, 9), AA = A * A, A2 = 2 * A, ans = Q(b, A2);
          const inner = M.poly([AA, b, c]), root = M.sqrt(inner);
          return {
            prompt: `Find ${M.eq(`${lim(inf)}(${root} − ${kv(A)})`)}`,
            steps: [
              `As ${x} → ${inf} both terms grow without bound: the form ${inf} − ${inf}. Multiply and divide by the conjugate ${root} + ${kv(A)}.`,
              `The top becomes a difference of squares: (${inner}) − ${M.poly([AA, 0, 0])} = ${M.poly([b, c])}. So the expression equals ${M.frac(M.poly([b, c]), `${root} + ${kv(A)}`)}.`,
              `Divide the top and the bottom by ${x} (for ${x} &gt; 0, ${x} = ${M.sqrt(M.sup(x, 2))}, so it moves inside the root as ${M.sup(x, 2)}): ${M.frac(`${n(b)}${over(c, 1)}`, `${M.sqrt(`${n(AA)}${over(b, 1)}${over(c, 2)}`)} + ${n(A)}`)}.`,
              `As ${x} → ${inf} every term over a power of ${x} → 0: ${M.frac(n(b), `${M.sqrt(n(AA))} + ${n(A)}`)} = ${M.frac(n(b), n(A2))}${ans.d !== A2 ? ` = ${f(ans)}` : ""}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { AA, A2, ans: fv(ans) }, params: { A, b, c },
          };
        }
        // level 3: the 1^∞ form
        const a = r.nonzero(-5, 5), b = r.int(1, 4), ab = a * b;
        const base = `(1 ${a < 0 ? "−" : "+"} ${M.frac(n(Math.abs(a)), x)})`;
        const lnBase = `ln${base}`;
        return {
          prompt: `Find ${M.eq(`${lim(inf)}${M.sup(base, kv(b))}`)} Give the exact value.`,
          steps: [
            `As ${x} → ${inf} the base → 1 and the exponent → ${inf}: the indeterminate form 1<sup>${inf}</sup>. Call the expression ${y} and take logarithms: ln ${y} = ${kv(b)} · ${lnBase}.`,
            `That is an ${inf} · 0 form. Write it as a quotient: ln ${y} = ${b === 1 ? "" : `${n(b)} · `}${M.frac(lnBase, M.frac("1", x))}, a 0/0 form.`,
            `Put ${u} = ${M.frac("1", x)}, so ${u} → 0<sup>+</sup>: ln ${y} = ${b === 1 ? "" : `${n(b)} · `}${M.frac(`ln(1${vt(a, u)})`, u)}. By the logarithm limit ${M.frac(`ln(1 + ${M.v("w")})`, M.v("w"))} → 1 with ${M.v("w")} = ${kv(a, u)}, this fraction → ${n(a)}.`,
            `So ln ${y} → ${n(b)} · ${np(a)} = ${n(ab)}, and ${y} → ${ab === 1 ? "e" : M.sup("e", n(ab))}.`,
          ],
          answer: { kind: "number", value: Math.exp(ab) }, answerText: ab === 1 ? "e" : M.sup("e", n(ab)), answerInput: `e^(${ab})`,
          vals: { ab }, params: { a, b },
        };
      },
    },

    // ---- C1.5 Squeeze theorem ----------------------------------------------------------------------------
    "C1.squeeze": {
      title: "The squeeze theorem",
      generate(r, level) {
        if (level === 1) {
          const c = r.int(2, 9), m = r.pick([2, 4]), k = r.int(1, 9), d = r.nonzero(-9, 9), trig = r.pick(["sin", "cos"]);
          const osc = `${trig}(${M.frac(n(k), x)})`, cx = `${n(c)}${M.sup(x, m)}`;
          return {
            prompt: `Find ${M.eq(`${lim("0")}(${cx} ${osc}${st(d)})`)}`,
            steps: [
              `${osc} swings between −1 and 1 faster and faster as ${x} → 0, so it has no limit and the product law cannot be used. What we do know: −1 ≤ ${osc} ≤ 1 for every ${x} ≠ 0.`,
              `Multiply through by ${cx}, which is never negative (an even power): −${cx} ≤ ${cx} ${osc} ≤ ${cx}.`,
              `Both bounds → ${n(c)} · 0 = 0 as ${x} → 0, so by the squeeze theorem ${cx} ${osc} → 0.`,
              `Add the constant: 0${st(d)} = ${n(d)}.`,
            ],
            answer: { kind: "number", value: d }, answerText: n(d), answerInput: String(d),
            vals: {}, params: { c, m, k, d, trig },
          };
        }
        if (level === 2) {
          const k = r.nonzero(-9, 9), a = r.int(1, 6), mm = r.int(1, 5), d = r.int(2, 6), trig = r.pick(["sin", "cos"]), sgn = r.sign();
          const ans = Q(k, d), osc = `${trig}(${kv(mm)})`, ot = `${a === 1 ? "" : `${n(a)} `}${osc}`, op = sgn > 0 ? "+" : "−";
          return {
            prompt: `Find ${M.eq(`${lim(inf)}${M.frac(`${kv(k)} ${op} ${ot}`, kv(d))}`)}`,
            steps: [
              `Split the fraction: ${M.frac(kv(k), kv(d))} ${op} ${M.frac(n(a), n(d))} · ${M.frac(osc, x)}. The first piece is ${f(ans)}.`,
              `For ${x} &gt; 0, −1 ≤ ${osc} ≤ 1 gives −${M.frac("1", x)} ≤ ${M.frac(osc, x)} ≤ ${M.frac("1", x)}.`,
              `Both bounds → 0 as ${x} → ${inf}, so ${M.frac(osc, x)} → 0 by the squeeze theorem, and the second piece → ${M.frac(n(a), n(d))} · 0 = 0.`,
              `The limit is ${f(ans)} ${op} 0 = ${f(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { ans: fv(ans) }, params: { k, a, mm, d, trig, sgn },
          };
        }
        // level 3: two given bounds that touch at x = a
        const a = r.int(-3, 3), m = r.int(-3, 3), L = r.int(-4, 4), sc = r.pick([1, 2]);
        const B = m - 2 * sc * a, C = sc * a * a - m * a + L, G0 = L - m * a;
        const ma = m * a, sca2 = sc * a * a, Ba = B * a;
        const view = [a - 4, a + 4, L - 5, L + 5];
        const G = fx("g"), H = fx("h"), F = fx("f");
        return {
          prompt: `Suppose ${G} ≤ ${F} ≤ ${H} for all ${x} near ${n(a)}, where ${M.eq(`${G} = ${M.poly([m, G0])}`)} and ${M.eq(`${H} = ${M.poly([sc, B, C])}.`)} Find ${lim(n(a))}${F}.`,
          graph: graph({ view, items: [{ t: "fn", e: `${m}*x + (${G0})`, role: "secondary" }, { t: "fn", e: `${sc}*x^2 + (${B})*x + (${C})` },
            label("g", a - 3, m * -3 + L - 0.8, view), label("h", a - 2.5, sc * 6.25 - 2.5 * m + L + 0.3, view)] }),
          steps: [
            m === 0 ? `${M.v("g")} is constant, so ${lim(n(a))}${G} = ${n(G0)}.`
              : `${M.v("g")} is a polynomial, so its limit is its value: ${M.v("g")}(${n(a)}) = ${chain(`${n(m)} · ${np(a)}${st(G0)}`, `${n(ma)}${st(G0)}`, n(L))}.`,
            `${M.v("h")} is a polynomial too: ${M.v("h")}(${n(a)}) = ${chain(`${cdot(sc, M.sup(np(a), 2))}${st(B, ` · ${np(a)}`)}${st(C)}`, `${n(sca2)}${st(Ba)}${st(C)}`, n(L))}.`,
            `Both bounds approach the same number, ${n(L)}, and ${M.v("f")} is trapped between them, so by the squeeze theorem ${lim(n(a))}${F} = ${n(L)}. (The bounds only need to hold near ${n(a)}.)`,
          ],
          answer: { kind: "number", value: L }, answerText: n(L), answerInput: String(L),
          vals: { ma, sca2, Ba, L }, params: { a, m, G0, sc, B, C },
        };
      },
    },

    // ---- C1.6 Special limits and e ------------------------------------------------------------------------
    "C1.2": {
      title: "Special limits and the number e",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const k = r.int(2, 9), m = r.int(2, 9), flip = r.chance(0.4) ? 1 : 0;
            if (k === m) continue;
            const ans = flip ? Q(m, k) : Q(k, m), s = `sin(${kv(k)})`;
            const expr = flip ? M.frac(kv(m), s) : M.frac(s, kv(m));
            return {
              prompt: `Find ${M.eq(`${lim("0")}${expr}`)}`,
              steps: [
                `Substituting gives 0/0. Make the sine limit ${M.frac("sin θ", "θ")} → 1 appear by putting ${kv(k)} under (or over) the sine.`,
                flip ? `${expr} = ${M.frac(n(m), n(k))} · ${M.frac(kv(k), s)}.` : `${expr} = ${M.frac(n(k), n(m))} · ${M.frac(s, kv(k))}.`,
                `As ${x} → 0, θ = ${kv(k)} → 0 too, so ${flip ? M.frac(kv(k), s) : M.frac(s, kv(k))} → 1.`,
                `The limit is ${flip ? M.frac(n(m), n(k)) : M.frac(n(k), n(m))} · 1 = ${f(ans)}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
              vals: { ans: fv(ans) }, params: { k, m, flip },
            };
          }
        }
        if (level === 2) {
          const kind = r.pick(["exp", "ln", "cos"]), m = r.int(2, 9);
          if (kind === "cos") {
            const k = r.int(1, 6), kk = k * k, m2 = 2 * m, ans = Q(kk, m2), c = `cos(${kv(k)})`;
            return {
              prompt: `Find ${M.eq(`${lim("0")}${M.frac(`1 − ${c}`, `${n(m)}${M.sup(x, 2)}`)}`)}`,
              steps: [
                `Substituting gives 0/0. Match the cosine limit ${M.frac("1 − cos θ", M.sup("θ", 2))} → ${M.frac("1", "2")} with θ = ${kv(k)}: θ<sup>2</sup> = ${M.poly([kk, 0, 0])}.`,
                `${M.frac(`1 − ${c}`, `${n(m)}${M.sup(x, 2)}`)} = ${M.frac(n(kk), n(m))} · ${M.frac(`1 − ${c}`, k === 1 ? M.sup(x, 2) : M.sup(`(${kv(k)})`, 2))}.`,
                `As ${x} → 0, θ → 0, so the second factor → ${M.frac("1", "2")}. The limit is ${M.frac(n(kk), n(m))} · ${M.frac("1", "2")} = ${M.frac(n(kk), n(m2))}${ans.d !== m2 ? ` = ${f(ans)}` : ""}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
              vals: { kk, m2, ans: fv(ans) }, params: { kind, k, m },
            };
          }
          const k = r.nonzero(-6, 6), ans = Q(k, m);
          const top = kind === "exp" ? `${M.sup("e", kv(k))} − 1` : `ln(1${vt(k)})`;
          const special = kind === "exp" ? M.frac(`${M.sup("e", "θ")} − 1`, "θ") : M.frac("ln(1 + θ)", "θ");
          return {
            prompt: `Find ${M.eq(`${lim("0")}${M.frac(top, kv(m))}`)}`,
            steps: [
              `Substituting gives 0/0. Use the ${kind === "exp" ? "exponential" : "logarithm"} limit ${special} → 1 with θ = ${kv(k)}.`,
              `${M.frac(top, kv(m))} = ${M.frac(n(k), n(m))} · ${M.frac(top, kv(k))}.`,
              `As ${x} → 0, θ = ${kv(k)} → 0, so the second factor → 1. The limit is ${f(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { ans: fv(ans) }, params: { kind, k, m },
          };
        }
        // level 3: continuous compounding as a limit
        const Pv = r.pick([500, 1000, 2000, 2500, 5000, 10000]), rp = r.int(2, 8), T = r.int(2, 20);
        const rdec = rp / 100, rt = (rp * T) / 100, ert = Math.exp(rt), ans = Pv * ert;
        const nn = M.v("n");
        return {
          prompt: `${P.money(Pv)} is invested at ${n(rp)}% a year, compounded ${nn} times a year. As ${nn} → ${inf} (continuous compounding), what does the balance after ${n(T)} years approach? Round to the nearest cent.`,
          steps: [
            `Compounded ${nn} times a year the balance is ${n(Pv)}${M.sup(`(1 + ${M.frac(n(rdec), nn)})`, `${n(T)}${nn}`)} = ${n(Pv)}${M.sup(`[${M.sup(`(1 + ${M.frac(n(rdec), nn)})`, nn)}]`, n(T))}.`,
            `As ${nn} → ${inf}, ${M.sup(`(1 + ${M.frac(M.v("r"), nn)})`, nn)} → ${M.sup("e", M.v("r"))} (a 1<sup>${inf}</sup> limit), so the balance → ${n(Pv)}${M.sup("e", `${n(rdec)} · ${n(T)}`)} = ${n(Pv)}${M.sup("e", n(rt))}.`,
            `${M.sup("e", n(rt))} ≈ ${M.n(ert, { dp: 6 })}, so the balance is ${n(Pv)} × ${M.n(ert, { dp: 6 })} ≈ ${P.money(ans)}.`,
          ],
          answer: { kind: "number", value: ans, dp: 2 }, answerText: P.money(ans), answerInput: ans.toFixed(2),
          vals: { rdec, rt, ert }, params: { P: Pv, rp, T },
        };
      },
    },

    // ---- C1.7 Continuity and the IVT --------------------------------------------------------------------
    "C1.3": {
      title: "Continuity and the intermediate value theorem",
      generate(r, level) {
        if (level === 1) {
          const p = r.pick([1, -1, 2]), q = r.int(-6, 6), m = r.nonzero(-4, 4), c = r.int(-3, 3);
          const pc2 = p * c * c, R = pc2 + q, mc = m * c, ans = R - mc, k = M.v("k"), F = fx("f");
          return {
            prompt: `For what value of ${k} is ${M.v("f")} continuous everywhere? ${M.eq(`${F} = ${kv(m)} + ${k} for ${x} &lt; ${n(c)}, and ${F} = ${M.poly([p, 0, q])} for ${x} ≥ ${n(c)}.`)}`,
            steps: [
              `Each piece is a polynomial, so ${M.v("f")} is continuous everywhere except possibly at the seam ${x} = ${n(c)}. There the left limit, the right limit and ${fx("f", n(c))} must agree.`,
              `From the right, and at ${x} = ${n(c)} itself: ${chain(`${p === -1 ? `−1 · ${M.sup(np(c), 2)}` : cdot(p, M.sup(np(c), 2))}${st(q)}`, `${n(pc2)}${st(q)}`, n(R))}.`,
              `From the left: ${n(m)} · ${np(c)} + ${k} = ${n(mc)} + ${k}.`,
              `Set them equal: ${n(mc)} + ${k} = ${n(R)}, so ${k} = ${n(R)} − ${np(mc)} = ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: `${k} = ${n(ans)}`, answerInput: String(ans),
            vals: { pc2, R, mc, ans }, params: { p, q, m, c },
          };
        }
        if (level === 2) {
          for (;;) {
            const b = r.int(-3, 3), c = r.int(-6, 6), d = r.int(-8, 8), s = r.int(-3, 0);
            const xs = [s, s + 1, s + 2, s + 3, s + 4], vs = xs.map((v) => v ** 3 + b * v * v + c * v + d);
            if (vs.some((v) => v === 0)) continue;
            const ch = [0, 1, 2, 3].filter((i) => Math.sign(vs[i]) !== Math.sign(vs[i + 1]));
            if (ch.length !== 1) continue;
            const i = ch[0], options = [0, 1, 2, 3].map((j) => `[${n(xs[j])}, ${n(xs[j + 1])}]`);
            const fpoly = M.poly([1, b, c, d]);
            return {
              prompt: `Let ${fx()} = ${fpoly}. On which interval does the intermediate value theorem guarantee a root of ${M.v("f")}?`,
              steps: [
                `${M.v("f")} is a polynomial, so it is continuous on every closed interval. If ${M.v("f")} has opposite signs at the two ends of an interval, it must cross 0 inside it (Bolzano).`,
                `Evaluate ${M.v("f")} at the endpoints: ${M.table([x, ...xs.map(n)], [[fx(), ...vs.map(n)]])}`,
                `The only sign change is between ${x} = ${n(xs[i])} and ${x} = ${n(xs[i + 1])} (${fx("f", n(xs[i]))} = ${n(vs[i])}, ${fx("f", n(xs[i + 1]))} = ${n(vs[i + 1])}), so a root lies in ${options[i]}. On the other intervals ${M.v("f")} has the same sign at both ends, and the theorem promises nothing there.`,
              ],
              answer: { kind: "choice", options, index: i }, answerText: options[i],
              vals: { xs, vs }, params: { b, c, d, s }, consts: [3],
            };
          }
        }
        // level 3: two steps of bisection for √N
        const a = r.int(1, 8), N = r.int(a * a + 1, (a + 1) * (a + 1) - 1);
        const fa = a * a - N, fb = (a + 1) * (a + 1) - N;
        const m1 = Q(2 * a + 1, 2), f1 = m1.mul(m1).sub(N);
        const [lo1, hi1] = f1.n < 0 ? [m1, Q(a + 1)] : [Q(a), m1];
        const m2 = lo1.add(hi1).div(2), f2 = m2.mul(m2).sub(N);
        const [lo, hi] = f2.n < 0 ? [m2, hi1] : [lo1, m2];
        const dec = (q) => n(q.value), sgn = (q) => (q.n < 0 ? "negative" : "positive");
        const F = (v) => fx("f", v);
        return {
          prompt: `A calculator without a square-root key finds ${M.sqrt(n(N))} by bisection on ${fx()} = ${M.poly([1, 0, -N])}, starting from the interval [${n(a)}, ${n(a + 1)}]. Do two bisection steps and enter the endpoints of the final interval, smaller first.`,
          steps: [
            `Check the start: ${F(n(a))} = ${n(a * a)} − ${n(N)} = ${n(fa)} &lt; 0 and ${F(n(a + 1))} = ${n((a + 1) * (a + 1))} − ${n(N)} = ${n(fb)} &gt; 0. ${M.v("f")} is continuous, so a root lies between.`,
            `Midpoint ${dec(m1)}: ${F(dec(m1))} = ${dec(m1.mul(m1))} − ${n(N)} = ${dec(f1)}, which is ${sgn(f1)}. The sign change is now on [${dec(lo1)}, ${dec(hi1)}].`,
            `Midpoint ${dec(m2)}: ${F(dec(m2))} = ${dec(m2.mul(m2))} − ${n(N)} = ${dec(f2)}, which is ${sgn(f2)}. Keep [${dec(lo)}, ${dec(hi)}].`,
            `So ${M.sqrt(n(N))} lies in [${dec(lo)}, ${dec(hi)}], an interval of length ${dec(hi.sub(lo))}: each step halves it.`,
          ],
          answer: { kind: "numbers", values: [lo.value, hi.value], ordered: true }, answerText: `[${dec(lo)}, ${dec(hi)}]`, answerInput: `${lo.value}, ${hi.value}`,
          vals: { a1: a + 1, aa: a * a, bb: (a + 1) * (a + 1), fa, fb, m1: m1.value, m1sq: m1.mul(m1).value, f1: f1.value, lo1: lo1.value, hi1: hi1.value,
            m2: m2.value, m2sq: m2.mul(m2).value, f2: f2.value, lo: lo.value, hi: hi.value, len: hi.sub(lo).value }, params: { a, N },
        };
      },
    },

    // ---- C1.8 Types of discontinuity -------------------------------------------------------------------
    "C1.continuity-types": {
      title: "Types of discontinuity",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const kind = r.int(0, 2), a = r.int(-2, 2), Lv = r.int(-3, 3), Rv = r.int(-3, 3), V = r.int(-3, 3);
            const m1 = r.pick([-1, -0.5, 0.5, 1]), m2 = r.pick([-1, -0.5, 0, 0.5, 1]), k = r.pick([-2, -1, 1, 2]), dotted = r.chance(0.6) ? 1 : 0;
            if (kind === 0 && dotted && V === Lv) continue;
            if (kind === 1 && Lv === Rv) continue;
            const view = [-6, 6, -4, 4], options = ["removable", "jump", "infinite", "oscillating"];
            let its, steps;
            if (kind === 0) {
              its = items(lineSeg(m1, a, Lv, -6, a - 0.15, view), lineSeg(m1, a, Lv, a + 0.15, 6, view), hole(a, Lv), dotted ? { t: "pt", x: a, y: V } : null);
              steps = [
                `From both sides the graph approaches the same height, ${n(Lv)} (the open circle), so ${lim(n(a))}${fx()} = ${n(Lv)} exists.`,
                dotted ? `But the dot says ${fx("f", n(a))} = ${n(V)}, not ${n(Lv)}. A limit that exists but differs from the value is a removable discontinuity: redefining ${fx("f", n(a))} = ${n(Lv)} would fill the hole.`
                  : `But there is no dot: ${fx("f", n(a))} is not defined. A limit that exists where the value is missing is a removable discontinuity: defining ${fx("f", n(a))} = ${n(Lv)} would fill the hole.`,
              ];
            } else if (kind === 1) {
              its = items(lineSeg(m1, a, Lv, -6, a, view), lineSeg(m2, a, Rv, a + 0.15, 6, view), hole(a, Rv), { t: "pt", x: a, y: Lv });
              steps = [
                `From the left the graph approaches ${n(Lv)}; from the right it approaches ${n(Rv)}.`,
                `Both one-sided limits are finite but different (a jump of ${n(Rv)} − ${np(Lv)} = ${n(Rv - Lv)}), so the limit does not exist: a jump discontinuity.`,
              ];
            } else {
              its = [{ t: "fn", e: `${k}/(x - (${a})) + (${Lv})` }, { t: "vline", x: a, role: "muted" }];
              steps = [
                `Near ${x} = ${n(a)} the graph shoots off without bound, upward on one side and downward on the other, along the dashed vertical line.`,
                `A one-sided limit that is ±${inf} (a vertical asymptote) is an infinite discontinuity.`,
              ];
            }
            return {
              prompt: `What type of discontinuity does the graph show at ${x} = ${n(a)}?`,
              graph: graph({ view, items: its }),
              steps, answer: { kind: "choice", options, index: kind }, answerText: options[kind],
              vals: kind === 1 ? { J: Rv - Lv } : {}, params: { kind, a, Lv, Rv, V, m1, m2, k, dotted },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const kind = r.int(0, 3), a = r.int(-4, 4), options = ["removable", "jump", "infinite", `none: ${M.v("f")} is continuous at ${x} = ${n(a)}`];
            const F = fx(), at = fx("f", n(a));
            if (kind === 0) {
              const b = r.intExcept(-6, 6, a), s = a + b, pr = a * b, ans = a - b;
              return {
                prompt: `Classify the behavior of ${M.eq(`${F} = ${M.frac(M.poly([1, -s, pr]), M.poly([1, -a]))}`)} at ${x} = ${n(a)}.`,
                steps: [
                  `At ${x} = ${n(a)} the bottom is 0, so ${at} is not defined.`,
                  `Factor the top: ${M.poly([1, -s, pr])} = ${fac(a)}${fac(b)}. For ${x} ≠ ${n(a)} the factor ${M.poly([1, -a])} cancels and ${F} = ${M.poly([1, -b])}.`,
                  `So ${lim(n(a))}${F} = ${n(a)} − ${np(b)} = ${n(ans)} exists but there is no value at ${x} = ${n(a)}: a removable discontinuity (a hole at (${n(a)}, ${n(ans)})).`,
                ],
                answer: { kind: "choice", options, index: 0 }, answerText: options[0],
                vals: { s, pr, ans }, params: { kind, a, b },
              };
            }
            if (kind === 2) {
              const c = r.int(-6, 6), N = a + c;
              if (N === 0) continue;
              return {
                prompt: `Classify the behavior of ${M.eq(`${F} = ${M.frac(M.poly([1, c]), M.poly([1, -a]))}`)} at ${x} = ${n(a)}.`,
                steps: [
                  `At ${x} = ${n(a)} the bottom is 0 and the top is ${chain(`${n(a)}${st(c)}`, n(N))}, not 0. Nothing cancels.`,
                  `A nonzero number over something tending to 0 grows without bound: ${F} → ±${inf} as ${x} → ${n(a)}. That is an infinite discontinuity, with vertical asymptote ${x} = ${n(a)}.`,
                ],
                answer: { kind: "choice", options, index: 2 }, answerText: options[2],
                vals: { N }, params: { kind, a, c },
              };
            }
            // piecewise lines: a jump (kind 1) or a continuous seam (kind 3)
            const p1 = r.nonzero(-4, 4), q1 = r.int(-6, 6), p2 = r.nonzero(-4, 4);
            const Lv = p1 * a + q1, q2 = kind === 3 ? Lv - p2 * a : r.int(-6, 6), Rv = p2 * a + q2;
            if (kind === 1 && Lv === Rv) continue;
            if (p1 === p2 && q1 === q2) continue;
            const idx = kind === 3 ? 3 : 1;
            return {
              prompt: `Classify the behavior of ${M.v("f")} at ${x} = ${n(a)}, where ${M.eq(`${F} = ${M.poly([p1, q1])} for ${x} &lt; ${n(a)}, and ${F} = ${M.poly([p2, q2])} for ${x} ≥ ${n(a)}.`)}`,
              steps: [
                `Left-hand limit (left piece): ${chain(`${n(p1)} · ${np(a)}${st(q1)}`, `${n(p1 * a)}${st(q1)}`, n(Lv))}.`,
                `Right-hand limit and ${at} (right piece): ${chain(`${n(p2)} · ${np(a)}${st(q2)}`, `${n(p2 * a)}${st(q2)}`, n(Rv))}.`,
                kind === 3 ? `Both equal ${n(Lv)} = ${at}, so ${lim(n(a))}${F} = ${at}: ${M.v("f")} is continuous at ${x} = ${n(a)} (the pieces meet).`
                  : `Both are finite but ${n(Lv)} ≠ ${n(Rv)}: a jump discontinuity of size ${n(Rv)} − ${np(Lv)} = ${n(Rv - Lv)}.`,
              ],
              answer: { kind: "choice", options, index: idx }, answerText: options[idx],
              vals: { p1a: p1 * a, Lv, p2a: p2 * a, Rv, J: Rv - Lv }, params: { kind, a, p1, q1, p2, q2 },
            };
          }
        }
        // level 3: a rational function with one hole and one asymptote
        for (;;) {
          const a = r.int(-5, 5), b = r.intExcept(-5, 5, a), c = r.int(-6, 6);
          if (b + c === 0 || a + c === 0) continue;
          const B1 = c - a, C1 = -a * c, s = a + b, pr = a * b, fill = Q(a + c, a - b);
          const top = M.poly([1, B1, C1]), bot = M.poly([1, -s, pr]);
          return {
            prompt: `${M.eq(`${fx()} = ${M.frac(top, bot)}`)} has two discontinuities, one of them removable. What value must ${M.v("f")} be given at the removable one to make it continuous there?`,
            steps: [
              `Factor the bottom: ${bot} = ${fac(a)}${fac(b)}, which is 0 at ${x} = ${n(a)} and ${x} = ${n(b)}. These are the two discontinuities.`,
              `Factor the top: ${top} = ${fac(a)}${fac(-c)}.`,
              `At ${x} = ${n(b)} the top is ${chain(`${n(b)}${st(c)}`, n(b + c))} ≠ 0 while the bottom → 0: an infinite discontinuity (vertical asymptote ${x} = ${n(b)}).`,
              `At ${x} = ${n(a)} the factor ${M.poly([1, -a])} cancels: for ${x} ≠ ${n(a)}, ${fx()} = ${M.frac(M.poly([1, c]), M.poly([1, -b]))}. So ${lim(n(a))}${fx()} = ${M.frac(`${n(a)}${st(c)}`, `${n(a)} − ${np(b)}`)} = ${f(fill)}: a removable discontinuity, repaired by setting ${fx("f", n(a))} = ${f(fill)}.`,
            ],
            answer: { kind: "number", value: fill.value }, answerText: f(fill), answerInput: typed(fill),
            vals: { B1, C1, s, pr, bc: b + c, fill: fv(fill) }, params: { a, b, c },
          };
        }
      },
    },
    // ---- C1.9 Definition of the derivative ----------------------------------------------------------
    "C1.4": {
      title: "The derivative from its definition",
      generate(r, level) {
        const hv = M.v("h");
        if (level === 1) {
          // a secant slope (average rate of change) on a parabola
          const p = r.nonzero(-2, 2), q = r.int(-5, 5), c = r.int(-6, 6), a = r.int(-3, 3), hh = r.int(1, 3), b = a + hh;
          const fq = (v) => p * v * v + q * v + c;
          const fa = fq(a), fb = fq(b), diff = fb - fa, m = diff / hh;
          const [sa, ea] = subst([p, q, c], a), [sb, eb] = subst([p, q, c], b);
          const view = fit(a - 2, b + 2, fq, [fa, fb]);
          const F = (v) => fx("f", n(v));
          return {
            prompt: `For ${fx()} = ${M.poly([p, q, c])}, find the average rate of change from ${x} = ${n(a)} to ${x} = ${n(b)}: the slope of the secant line through the two marked points.`,
            graph: graph({ view, items: [{ t: "fn", e: `${p}*x^2 + (${q})*x + (${c})` }, { t: "fn", e: `${m}*(x - (${a})) + (${fa})`, role: "secondary", dash: true },
              { t: "pt", x: a, y: fa }, { t: "pt", x: b, y: fb }] }),
            steps: [
              `Use the difference quotient ${M.frac(`${M.v("f")}(${x} + ${hv}) − ${fx()}`, hv)} with ${x} = ${n(a)} and ${hv} = ${n(hh)}: ${M.frac(`${F(b)} − ${F(a)}`, n(hh))}.`,
              `${F(b)} = ${chain(sb, eb, n(fb))}.`,
              `${F(a)} = ${chain(sa, ea, n(fa))}.`,
              `Slope = ${chain(M.frac(`${n(fb)} − ${np(fa)}`, n(hh)), hh === 1 ? n(diff) : M.frac(n(diff), n(hh)), n(m))}.`,
            ],
            answer: { kind: "number", value: m }, answerText: n(m), answerInput: String(m),
            vals: { b, pb2: p * b * b, qb: q * b, fb, pa2: p * a * a, qa: q * a, fa, diff, m }, params: { p, q, c, a, hh },
          };
        }
        if (level === 2) {
          const p = r.nonzero(-3, 3), q = r.int(-6, 6), c = r.int(-6, 6), a = r.nonzero(-3, 3);
          const a2 = a * a, twoA = 2 * a, pa2 = p * a2, twopa = 2 * p * a, qa = q * a, fa = pa2 + qa + c, lin = twopa + q;
          const ah = `(${n(a)} + ${hv})`, [sa, ea] = subst([p, q, c], a);
          return {
            prompt: `Use the limit definition of the derivative to find ${fpr(n(a))} for ${M.eq(`${fx()} = ${M.poly([p, q, c])}.`)}`,
            steps: [
              `By definition, ${fpr(n(a))} = ${lim("0", "", hv)}${M.frac(`${M.v("f")}${ah} − ${fx("f", n(a))}`, hv)}.`,
              `Expand: ${M.v("f")}${ah} = ${pdot(p, M.sup(ah, 2))}${q ? M.term(q, ah) : ""}${st(c)} = ${pdot(p, `(${n(a2)}${vt(twoA, hv)} + ${M.sup(hv, 2)})`)}${st(qa)}${vt(q, hv)}${st(c)} = ${M.poly([p, lin, fa], "h")}.`,
              `${fx("f", n(a))} = ${chain(sa, ea, n(fa))}, so the difference quotient is ${M.frac(M.poly([p, lin, 0], "h"), hv)} = ${M.poly([p, lin], "h")} (for ${hv} ≠ 0).`,
              `Let ${hv} → 0: ${fpr(n(a))} = ${n(lin)}.`,
            ],
            answer: { kind: "number", value: lin }, answerText: n(lin), answerInput: String(lin),
            vals: { a2, twoA, pa2, twopa, qa, fa, lin }, params: { p, q, c, a },
          };
        }
        // level 3: k/x or k√x from the definition (combine fractions, or rationalize)
        if (r.chance(0.5)) {
          const k = r.nonzero(-9, 9), a = r.nonzero(-4, 4), ka = k * a, a2 = a * a, ans = Q(-k, a2);
          const ah = `(${n(a)} + ${hv})`;
          return {
            prompt: `Use the limit definition of the derivative to find ${fpr(n(a))} for ${M.eq(`${fx()} = ${M.frac(n(k), x)}.`)}`,
            steps: [
              `${fpr(n(a))} = ${lim("0", "", hv)}${M.frac(`${M.frac(n(k), `${n(a)} + ${hv}`)} − ${M.frac(n(k), n(a))}`, hv)}.`,
              `Combine the two fractions over ${n(a)}${ah}: ${M.frac(`${n(k)} · ${np(a)} − ${np(k)}${ah}`, `${n(a)}${ah}`)} = ${M.frac(`${n(ka)} − (${n(ka)}${vt(k, hv)})`, `${n(a)}${ah}`)} = ${M.frac(kv(-k, hv), `${n(a)}${ah}`)}.`,
              `Divide by ${hv}: the difference quotient is ${M.frac(n(-k), `${n(a)}${ah}`)}.`,
              `Let ${hv} → 0: ${fpr(n(a))} = ${chain(M.frac(n(-k), `${n(a)} · ${np(a)}`), a2 === 1 ? n(-k) : M.frac(n(-k), n(a2)), f(ans))}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { ka, a2, ans: fv(ans) }, params: { kind: "recip", k, a },
          };
        }
        const k = r.int(1, 9), s = r.int(1, 5), a = s * s, s2 = 2 * s, ans = Q(k, s2);
        const kr = (inner) => (k === 1 ? M.sqrt(inner) : `${n(k)}${M.sqrt(inner)}`);
        const conjB = `${M.sqrt(`${n(a)} + ${hv}`)} + ${n(s)}`, conj = `(${conjB})`;
        return {
          prompt: `Use the limit definition of the derivative to find ${fpr(n(a))} for ${M.eq(`${fx()} = ${kr(x)}.`)}`,
          steps: [
            `${fpr(n(a))} = ${lim("0", "", hv)}${M.frac(`${kr(`${n(a)} + ${hv}`)} − ${kr(n(a))}`, hv)}, and ${M.sqrt(n(a))} = ${n(s)}.`,
            `Multiply the top and the bottom by the conjugate ${conj}. The top becomes ${pdot(k, `[(${n(a)} + ${hv}) − ${n(a)}]`)} = ${kv(k, hv)}, so the quotient is ${M.frac(kv(k, hv), `${hv}${conj}`)}.`,
            `Cancel ${hv}: ${M.frac(n(k), conjB)}.`,
            `Let ${hv} → 0: ${fpr(n(a))} = ${chain(M.frac(n(k), `${n(s)} + ${n(s)}`), M.frac(n(k), n(s2)), f(ans))}.`,
          ],
          answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
          vals: { s, s2, ans: fv(ans) }, params: { kind: "sqrt", k, a },
        };
      },
    },

    // ---- C1.10 Differentiability ---------------------------------------------------------------------------
    "C1.differentiability": {
      title: "Differentiability and continuity",
      generate(r, level) {
        const F = fx();
        if (level === 1) {
          for (;;) {
            const a = r.int(-2, 2), b = r.int(-2, 2), m1 = r.int(-3, 3), m2 = r.int(-3, 3);
            if (m1 === m2) continue;
            const view = [-6, 6, -6, 6];
            const P1 = `(${n(a - 1)}, ${n(b - m1)})`, P0 = `(${n(a)}, ${n(b)})`, P2 = `(${n(a + 1)}, ${n(b + m2)})`;
            return {
              prompt: `The graph of ${M.v("f")} is made of two straight pieces that meet at ${P0}. Find the left-hand and right-hand derivatives of ${M.v("f")} at ${x} = ${n(a)}. Enter them in that order.`,
              graph: graph({ view, items: items(lineSeg(m1, a, b, -6, a, view), lineSeg(m2, a, b, a, 6, view),
                { t: "pt", x: a, y: b }, { t: "pt", x: a - 1, y: b - m1, role: "muted" }, { t: "pt", x: a + 1, y: b + m2, role: "muted" }) }),
              steps: [
                `Left of ${x} = ${n(a)} the graph is the line through ${P1} and ${P0}. Its slope is ${M.frac(`${n(b)} − ${np(b - m1)}`, `${n(a)} − ${np(a - 1)}`)} = ${n(m1)}, so the left-hand derivative is ${n(m1)}.`,
                `Right of ${x} = ${n(a)} it is the line through ${P0} and ${P2}, with slope ${M.frac(`${n(b + m2)} − ${np(b)}`, `${n(a + 1)} − ${np(a)}`)} = ${n(m2)}: the right-hand derivative.`,
                `The one-sided derivatives differ (${n(m1)} ≠ ${n(m2)}): the graph has a corner, so ${M.v("f")} is continuous but not differentiable at ${x} = ${n(a)}.`,
              ],
              answer: { kind: "numbers", values: [m1, m2], ordered: true }, answerText: `${n(m1)}, ${n(m2)}`, answerInput: `${m1}, ${m2}`,
              vals: { am1: a - 1, bm1: b - m1, ap1: a + 1, bp2: b + m2 }, params: { a, b, m1, m2 },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const kind = r.int(0, 2), c = r.int(-2, 2), p = r.int(-4, 4), q = r.int(-5, 5);
            const L = c * c + p * c + q, sL = 2 * c + p;
            const m = kind === 0 ? sL : kind === 1 ? r.intExcept(-5, 5, sL) : r.int(-5, 5);
            const k = kind === 2 ? r.intExcept(-9, 9, L - m * c) : L - m * c;
            const Rv = m * c + k;
            const options = [`differentiable at ${x} = ${n(c)}`, "continuous but not differentiable (a corner)", "not continuous, so not differentiable"];
            const steps = [
              `Left piece at ${x} = ${n(c)}, which is also ${fx("f", n(c))}: ${chain(`${M.sup(np(c), 2)}${st(p, ` · ${np(c)}`)}${st(q)}`, `${n(c * c)}${st(p * c)}${st(q)}`, n(L))}.`,
              `Right piece as ${x} → ${n(c)}<sup>+</sup>: ${chain(`${n(m)} · ${np(c)}${st(k)}`, `${n(m * c)}${st(k)}`, n(Rv))}.`,
            ];
            if (kind === 2) steps.push(`${n(L)} ≠ ${n(Rv)}: the graph breaks at ${x} = ${n(c)}. A discontinuous ${M.v("f")} cannot be differentiable there.`);
            else {
              steps.push(`Both are ${n(L)}, so ${M.v("f")} is continuous at ${x} = ${n(c)}. Now compare slopes: the left piece has derivative ${M.poly([2, p])}, which is ${chain(`2 · ${np(c)}${st(p)}`, n(sL))} at ${x} = ${n(c)}; the right piece has slope ${n(m)}.`);
              steps.push(kind === 0 ? `The slopes agree, so ${M.v("f")} is differentiable at ${x} = ${n(c)}, with ${fpr(n(c))} = ${n(sL)}.`
                : `The slopes differ (${n(sL)} ≠ ${n(m)}): a corner. ${M.v("f")} is continuous but not differentiable there.`);
            }
            return {
              prompt: `Let ${F} = ${M.poly([1, p, q])} for ${x} ≤ ${n(c)} and ${F} = ${M.poly([m, k])} for ${x} &gt; ${n(c)}. Which is true at ${x} = ${n(c)}?`,
              steps, answer: { kind: "choice", options, index: kind }, answerText: options[kind],
              vals: { cc: c * c, pc: p * c, L, mc: m * c, Rv, sL }, params: { c, p, q, m, k },
            };
          }
        }
        // level 3: choose the line that joins a parabola smoothly
        const a = r.pick([-2, -1, 1, 2]), b = r.int(-5, 5), c = r.nonzero(-3, 3);
        const twoA = 2 * a, twoAc = twoA * c, m = twoAc + b, ac2 = a * c * c, bc = b * c, L = ac2 + bc, mc = m * c, k = L - mc;
        const mm = M.v("m"), kk = M.v("k");
        return {
          prompt: `Find ${mm} and ${kk} so that ${M.v("f")} is differentiable at ${x} = ${n(c)}, where ${M.eq(`${F} = ${M.poly([a, b, 0])} for ${x} ≤ ${n(c)}, and ${F} = ${mm}${x} + ${kk} for ${x} &gt; ${n(c)}.`)} Enter ${mm}, ${kk}.`,
          steps: [
            `Differentiable implies continuous, so at ${x} = ${n(c)} the pieces must meet and their slopes must match.`,
            `Slopes: the left piece has derivative ${M.poly([twoA, b])}, which is ${chain(`${n(twoA)} · ${np(c)}${st(b)}`, `${n(twoAc)}${st(b)}`, n(m))} at ${x} = ${n(c)}. The line's slope is ${mm}, so ${mm} = ${n(m)}.`,
            `Meeting: the left piece at ${x} = ${n(c)} is ${chain(`${cdot(a, M.sup(np(c), 2))}${st(b, ` · ${np(c)}`)}`, `${n(ac2)}${st(bc)}`, n(L))}; the line there is ${n(m)} · ${np(c)} + ${kk} = ${n(mc)} + ${kk}.`,
            `So ${n(mc)} + ${kk} = ${n(L)}, giving ${kk} = ${n(L)} − ${np(mc)} = ${n(k)}.`,
          ],
          answer: { kind: "numbers", values: [m, k], ordered: true }, answerText: `${mm} = ${n(m)}, ${kk} = ${n(k)}`, answerInput: `${m}, ${k}`,
          vals: { twoA, twoAc, m, ac2, bc, L, mc, k }, params: { a, b, c },
        };
      },
    },

    // ---- C1.11 Power, constant and sum rules ---------------------------------------------------------------
    "C1.5": {
      title: "The power rule",
      generate(r, level) {
        if (level === 1) {
          const deg = r.int(3, 4), cs = [r.nonzero(-6, 6)];
          for (let i = 1; i <= deg; i++) cs.push(r.chance(0.25) ? 0 : r.int(-9, 9));
          const d = pder(cs).map((q) => q.n);
          const parts = [];
          cs.forEach((c, i) => {
            const k = deg - i;
            if (c === 0) return;
            if (k === 0) parts.push(`the constant ${n(c)} → 0`);
            else if (k === 1) parts.push(`${kv(c)} → ${n(c)}`);
            else parts.push(`${kv(c, xp(k))} → ${n(k)} · ${np(c)} · ${xp(k - 1)} = ${kv(k * c, xp(k - 1))}`);
          });
          return {
            prompt: `Differentiate ${M.eq(`${fx()} = ${M.poly(cs)}`)}`,
            steps: [
              `Differentiate term by term with the power rule, ${dd()} ${M.sup(x, M.v("n"))} = ${M.v("n")}${M.sup(x, `${M.v("n")} − 1`)}: a constant factor stays, a constant term becomes 0.`,
              `${parts.join("; ")}.`,
              `${fpr()} = ${M.poly(d)}.`,
            ],
            answer: { kind: "expr", expr: pstr(d), vars: ["x"] }, answerText: `${fpr()} = ${M.poly(d)}`, answerInput: plain(d),
            vals: { d }, params: { cs }, consts: [3, 4],
          };
        }
        if (level === 2) {
          const a = r.nonzero(-8, 8), b = r.nonzero(-8, 8), c = r.nonzero(-3, 3), s = r.int(1, 3), t0 = s * s;
          const s4 = t0 * t0, a2 = Q(a, 2), twoC = 2 * c, T1 = Q(a, 2 * s), T2 = Q(-b, s4), T3 = twoC * t0, ans = T1.add(T2).add(T3);
          const half = M.frac("1", "2");
          return {
            prompt: `Find ${fpr(n(t0))} for ${M.eq(`${fx()} = ${a === 1 ? "" : a === -1 ? "−" : n(a)}${M.sqrt(x)}${sfr(b, x)}${vt(c, M.sup(x, 2))}.`)}`,
            steps: [
              `Write the root and the reciprocal as powers: ${fx()} = ${kv(a, M.sup(x, half))}${M.term(b, M.sup(x, "−1"))}${vt(c, M.sup(x, 2))}.`,
              `Power rule on each term: ${fpr()} = ${kv(a2, M.sup(x, `−${half}`))}${M.term(-b, M.sup(x, "−2"))}${M.term(twoC, x)} = ${sfr(a, `2${M.sqrt(x)}`, true)}${sfr(-b, M.sup(x, 2))}${M.term(twoC, x)}.`,
              `At ${x} = ${n(t0)}: ${M.sqrt(n(t0))} = ${n(s)} and ${M.sup(n(t0), 2)} = ${n(s4)}. So ${fpr(n(t0))} = ${sfr(a, `2 · ${n(s)}`, true)}${sfr(-b, n(s4))}${st(twoC, ` · ${n(t0)}`)} = ${chain(`${f(T1)}${st(T2)}${st(T3)}`, f(ans))}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { s, s4, a2: fv(a2), twoC, T1: fv(T1), T2: fv(T2), T3, ans: fv(ans) }, params: { a, b, c, t0 },
          };
        }
        // level 3: where does the tangent have a given slope?
        for (;;) {
          const r1 = r.int(-3, 3), r2 = r.int(-3, 3);
          if (r1 >= r2 || (r1 + r2) % 2 !== 0) continue;
          const b = (-3 * (r1 + r2)) / 2, m = r.int(-9, 9), c = m + 3 * r1 * r2, d = r.int(-5, 5);
          const cs = [1, b, c, d], fq = (v) => v ** 3 + b * v * v + c * v + d;
          const view = fit(r1 - 2, r2 + 2, fq);
          return {
            prompt: `At which ${x}-values does the tangent line to ${M.eq(`${y} = ${M.poly(cs)}`)} have slope ${n(m)}? Enter all of them, separated by commas.`,
            graph: graph({ view, items: [{ t: "fn", e: pstr(cs) }] }),
            steps: [
              `The slope of the tangent at ${x} is the derivative: ${dd(y)} = ${M.poly([3, 2 * b, c])} (power rule).`,
              `Set it equal to ${n(m)}: ${M.poly([3, 2 * b, c])} = ${n(m)}, so ${M.poly([3, 2 * b, c - m])} = 0.`,
              `Divide by 3: ${M.poly([1, -(r1 + r2), r1 * r2])} = 0, which factors as ${fac(r1)}${fac(r2)} = 0.`,
              `${x} = ${n(r1)} or ${x} = ${n(r2)}. At these two points the tangent lines are parallel, both with slope ${n(m)}.`,
            ],
            answer: { kind: "numbers", values: [r1, r2] }, answerText: `${x} = ${n(r1)} or ${x} = ${n(r2)}`, answerInput: `${r1}, ${r2}`,
            vals: { twoB: 2 * b, cm: c - m, s: r1 + r2, pr: r1 * r2 }, params: { b, c, d, m }, consts: [3],
          };
        }
      },
    },

    // ---- C1.12 Product and quotient rules --------------------------------------------------------------------
    "C1.6": {
      title: "Product and quotient rules",
      generate(r, level) {
        const fp_ = `${M.v("f")}′`, gp_ = `${M.v("g")}′`, fv_ = M.v("f"), gv = M.v("g");
        if (level === 1) {
          const a = r.nonzero(-5, 5), b = r.int(-6, 6), c = r.nonzero(-4, 4), d = r.int(-6, 6);
          const twoC = 2 * c, ac = a * c, ad = a * d, twoAC = 2 * a * c, twoBC = 2 * b * c, threeAC = 3 * a * c;
          const res = [threeAC, twoBC, ad];
          return {
            prompt: `Differentiate ${M.eq(`${y} = (${M.poly([a, b])})(${M.poly([c, 0, d])})`)}`,
            steps: [
              `Product rule: (${fv_}${gv})′ = ${fp_}${gv} + ${fv_}${gp_}, with ${fv_} = ${M.poly([a, b])} and ${gv} = ${M.poly([c, 0, d])}.`,
              `${fp_} = ${n(a)} and ${gp_} = ${M.poly([twoC, 0])}.`,
              `${fp_}${gv} = ${n(a)}(${M.poly([c, 0, d])}) = ${M.poly([ac, 0, ad])}; ${fv_}${gp_} = (${M.poly([a, b])})(${M.poly([twoC, 0])}) = ${M.poly([twoAC, twoBC, 0])}.`,
              `Add them: ${y}′ = ${M.poly(res)}.`,
            ],
            answer: { kind: "expr", expr: pstr(res), vars: ["x"] }, answerText: `${y}′ = ${M.poly(res)}`, answerInput: plain(res),
            vals: { twoC, ac, ad, twoAC, twoBC, threeAC }, params: { a, b, c, d },
          };
        }
        if (level === 2) {
          for (;;) {
            const a = r.nonzero(-6, 6), b = r.int(-6, 6), c = r.nonzero(-5, 5), d = r.int(-6, 6), det = a * d - b * c;
            if (det === 0) continue;
            const ac = a * c, ad = a * d, bc = b * c, top = M.poly([a, b]), bot = M.poly([c, d]);
            const res = M.frac(n(det), M.sup(`(${bot})`, 2));
            return {
              prompt: `Differentiate ${M.eq(`${y} = ${M.frac(top, bot)}`)}`,
              steps: [
                `Quotient rule: ${M.frac(`${fp_}${gv} − ${fv_}${gp_}`, M.sup(gv, 2))}, with ${fv_} = ${top}, ${gv} = ${bot}, ${fp_} = ${n(a)}, ${gp_} = ${n(c)}.`,
                `Numerator: ${n(a)}(${bot}) − ${np(c)}(${top}) = (${M.poly([ac, ad])}) − (${M.poly([ac, bc])}) = ${n(det)}. The ${x}-terms cancel.`,
                `${y}′ = ${res}.`,
              ],
              answer: { kind: "expr", expr: `(${det})/((${c})*x + (${d}))^2`, vars: ["x"] }, answerText: `${y}′ = ${res}`,
              answerInput: `${det}/(${plain([c, d])})^2`,
              vals: { ac, ad, bc, det }, params: { a, b, c, d },
            };
          }
        }
        // level 3: word problems, product (revenue) or quotient (concentration)
        if (r.chance(0.5)) {
          const pr = r.pick([12, 15, 20, 25, 40]), q = r.pick([200, 300, 400, 500, 800]), rr = r.pick([0.5, 1, 1.5, 2]), s = r.pick([5, 10, 15, 20]);
          const rrq = rr * q, prs = pr * s, ans = rrq - prs;
          const R = M.v("R"), p_ = M.v("p"), q_ = M.v("q");
          return {
            prompt: `A store sells ${n(q)} lamps a week at ${P.money(pr)} each. The price is rising by ${P.money(rr)} a week while weekly sales are falling by ${n(s)} lamps a week. How fast is weekly revenue changing right now, in dollars per week? (Use a negative number if it is falling.)`,
            steps: [
              `Revenue is price times quantity, ${R} = ${p_}${q_}, so by the product rule ${R}′ = ${p_}′${q_} + ${p_}${q_}′.`,
              `Right now ${p_} = ${n(pr)}, ${p_}′ = ${n(rr)}, ${q_} = ${n(q)} and ${q_}′ = −${n(s)} (falling).`,
              `${R}′ = ${n(rr)} · ${n(q)} + ${n(pr)} · (−${n(s)}) = ${n(rrq)} − ${n(prs)} = ${n(ans)} dollars per week. The price rise ${ans >= 0 ? "outweighs" : "does not make up for"} the lost sales.`,
            ],
            answer: { kind: "number", value: ans }, answerText: `${n(ans)} dollars per week`, answerInput: String(ans),
            vals: { rrq, prs, ans }, params: { kind: "revenue", pr, q, rr, s },
          };
        }
        for (;;) {
          const m = r.pick([100, 200, 300, 400, 500]), V = r.pick([2, 4, 5, 10]), mp = r.pick([-20, -10, 10, 20, 30]), Vp = r.pick([-1, 1, 2]);
          const mpV = mp * V, mVp = m * Vp, num = mpV - mVp, den = V * V;
          if (num % den !== 0 || num === 0) continue;
          const ans = num / den, c_ = M.v("c"), m_ = M.v("m"), V_ = M.v("V");
          return {
            prompt: `A tank holds ${n(V)} L of water with ${n(m)} mg of dye dissolved in it. Right now dye is being ${mp > 0 ? "added" : "removed"} at ${n(Math.abs(mp))} mg/min and the volume is ${Vp > 0 ? "growing" : "shrinking"} by ${n(Math.abs(Vp))} L/min. How fast is the concentration ${c_} = ${M.frac(m_, V_)} changing, in mg/L per minute?`,
            steps: [
              `Quotient rule: ${c_}′ = ${M.frac(`${m_}′${V_} − ${m_}${V_}′`, M.sup(V_, 2))}.`,
              `Right now ${m_} = ${n(m)}, ${m_}′ = ${n(mp)}, ${V_} = ${n(V)} and ${V_}′ = ${n(Vp)}.`,
              `${c_}′ = ${M.frac(`${n(mp)} · ${n(V)} − ${n(m)} · ${np(Vp)}`, M.sup(n(V), 2))} = ${M.frac(`${n(mpV)} − ${np(mVp)}`, n(den))} = ${M.frac(n(num), n(den))} = ${n(ans)} mg/L per minute.`,
            ],
            answer: { kind: "number", value: ans }, answerText: `${n(ans)} mg/L per minute`, answerInput: String(ans),
            vals: { mpV, mVp, num, den, ans }, params: { kind: "conc", m, V, mp, Vp },
          };
        }
      },
    },

    // ---- C1.13 Chain rule ------------------------------------------------------------------------------------------
    "C1.7": {
      title: "The chain rule",
      generate(r, level) {
        const pw = (base, k) => (k === 1 ? base : M.sup(base, n(k)));
        if (level === 1) {
          const a = r.pick([-5, -4, -3, -2, 2, 3, 4, 5]), b = r.nonzero(-9, 9), k = r.int(3, 7), km1 = k - 1, ka = k * a;
          const inner = M.poly([a, b]), res = `${n(ka)}${pw(`(${inner})`, km1)}`;
          return {
            prompt: `Differentiate ${M.eq(`${y} = ${M.sup(`(${inner})`, n(k))}`)}`,
            steps: [
              `The outer layer is ${M.sup(u, n(k))}, with inner ${u} = ${inner}.`,
              `Outer derivative: ${n(k)}${M.sup(u, n(km1))}. Inner derivative: ${u}′ = ${n(a)}.`,
              `Chain rule (outer at the inner, times the inner's derivative): ${y}′ = ${n(k)}${pw(`(${inner})`, km1)} · ${np(a)} = ${res}.`,
            ],
            answer: { kind: "expr", expr: `${ka}*(${a}*x + (${b}))^${km1}`, vars: ["x"] }, answerText: `${y}′ = ${res}`,
            answerInput: `${ka}(${plain([a, b])})^${km1}`,
            vals: { km1, ka }, params: { a, b, k },
          };
        }
        if (level === 2) {
          const kind = r.pick(["pow", "exp", "trig"]);
          if (kind === "pow") {
            const a = r.nonzero(-4, 4), b = r.nonzero(-9, 9), k = r.int(2, 5), km1 = k - 1, twoA = 2 * a, coef = 2 * k * a;
            const inner = M.poly([a, 0, b]), res = `${kv(coef)}${pw(`(${inner})`, km1)}`;
            return {
              prompt: `Differentiate ${M.eq(`${y} = ${M.sup(`(${inner})`, n(k))}`)}`,
              steps: [
                `Outer: ${M.sup(u, n(k))}; inner: ${u} = ${inner}, so ${u}′ = ${kv(twoA)}.`,
                `General power rule: ${y}′ = ${n(k)}${pw(`(${inner})`, km1)} · ${twoA < 0 ? `(${kv(twoA)})` : kv(twoA)} = ${res}.`,
              ],
              answer: { kind: "expr", expr: `${coef}*x*(${a}*x^2 + (${b}))^${km1}`, vars: ["x"] }, answerText: `${y}′ = ${res}`,
              answerInput: `${coef}x(${plain([a, 0, b])})^${km1}`,
              vals: { km1, twoA, coef }, params: { kind, a, b, k },
            };
          }
          if (kind === "exp") {
            const a = r.nonzero(-3, 3), b = r.int(-5, 5), twoA = 2 * a, inner = M.poly([a, b, 0]);
            const res = `(${M.poly([twoA, b])})${M.sup("e", inner)}`;
            return {
              prompt: `Differentiate ${M.eq(`${y} = ${M.sup("e", inner)}`)}`,
              steps: [
                `Outer: ${M.sup("e", u)}, whose derivative is itself; inner: ${u} = ${inner}, so ${u}′ = ${M.poly([twoA, b])}.`,
                `Chain rule: copy the exponential and multiply by the inner derivative: ${y}′ = ${res}.`,
              ],
              answer: { kind: "expr", expr: `(${twoA}*x + (${b}))*exp(${a}*x^2 + (${b})*x)`, vars: ["x"] }, answerText: `${y}′ = ${res}`,
              answerInput: `(${plain([twoA, b])})e^(${plain([a, b, 0])})`,
              vals: { twoA }, params: { kind, a, b },
            };
          }
          const a = r.nonzero(-4, 4), b = r.int(-6, 6), twoA = 2 * a, isSin = r.chance(0.5), inner = M.poly([a, 0, b]);
          const coef = isSin ? twoA : -twoA, res = `${kv(coef)} ${isSin ? "cos" : "sin"}(${inner})`;
          return {
            prompt: `Differentiate ${M.eq(`${y} = ${isSin ? "sin" : "cos"}(${inner})`)}`,
            steps: [
              `Outer: ${isSin ? "sin" : "cos"} ${u}, with derivative ${isSin ? "cos" : "−sin"} ${u}; inner: ${u} = ${inner}, so ${u}′ = ${kv(twoA)}.`,
              `Chain rule: ${y}′ = ${isSin ? "cos" : "−sin"}(${inner}) · ${twoA < 0 ? `(${kv(twoA)})` : kv(twoA)} = ${res}.`,
            ],
            answer: { kind: "expr", expr: `${coef}*x*${isSin ? "cos" : "sin"}(${a}*x^2 + (${b}))`, vars: ["x"] }, answerText: `${y}′ = ${res}`,
            answerInput: `${coef}x*${isSin ? "cos" : "sin"}(${plain([a, 0, b])})`,
            vals: { twoA, coef }, params: { kind, a, b, isSin: isSin ? 1 : 0 },
          };
        }
        // level 3: a table of values, or rates multiplying along a chain
        if (r.chance(0.6)) {
          const xs = [1, 2, 3, 4], fs = xs.map(() => r.int(1, 4)), fps = xs.map(() => r.nonzero(-5, 5)), gs = xs.map(() => r.int(1, 4)), gps = xs.map(() => r.nonzero(-5, 5));
          const a = r.int(1, 4), fg = r.chance(0.5) ? 1 : 0;
          const [o, i] = fg ? ["f", "g"] : ["g", "f"];
          const inner = fg ? gs[a - 1] : fs[a - 1], innerD = fg ? gps[a - 1] : fps[a - 1], outerD = fg ? fps[inner - 1] : gps[inner - 1], ans = outerD * innerD;
          const h = M.v("h"), O = M.v(o), I = M.v(i);
          return {
            prompt: `Use the table to find ${h}′(${n(a)}) for ${h}(${x}) = ${O}(${I}(${x})). ${M.table([x, fx("f"), fpr(x), fx("g"), fpr(x, "g")], xs.map((v, j) => [n(v), n(fs[j]), n(fps[j]), n(gs[j]), n(gps[j])]))}`,
            steps: [
              `Chain rule: ${h}′(${n(a)}) = ${O}′(${I}(${n(a)})) · ${I}′(${n(a)}).`,
              `From the row ${x} = ${n(a)}: ${I}(${n(a)}) = ${n(inner)} and ${I}′(${n(a)}) = ${n(innerD)}.`,
              `The outer derivative is needed at ${n(inner)}, not at ${n(a)}: from the row ${x} = ${n(inner)}, ${O}′(${n(inner)}) = ${n(outerD)}.`,
              `${h}′(${n(a)}) = ${n(outerD)} · ${np(innerD)} = ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
            vals: { inner, innerD, outerD, ans }, params: { kind: "table", xs, fs, fps, gs, gps, a, fg },
          };
        }
        const L10 = r.pick([50, 60, 65, 80, 98]), c10 = r.pick([2, 3, 4, 5, 12]);
        const lapse = L10 / 10, climb = c10 / 10, ans = -(L10 * c10) / 100;
        const Tv = M.v("T"), av = M.v("a");
        return {
          prompt: `Air temperature falls ${n(lapse)} °C for every kilometer of altitude. A weather balloon is rising at ${n(climb)} km/min. How fast is the temperature around the balloon changing, in °C per minute?`,
          steps: [
            `Temperature ${Tv} depends on altitude ${av}, which depends on time ${t}. Chain rule: ${dd(Tv, t)} = ${dd(Tv, av)} · ${dd(av, t)}.`,
            `${dd(Tv, av)} = −${n(lapse)} °C/km (falling with height) and ${dd(av, t)} = ${n(climb)} km/min.`,
            `${dd(Tv, t)} = −${n(lapse)} × ${n(climb)} = ${n(ans)} °C/min. The kilometers cancel, leaving °C per minute.`,
          ],
          answer: { kind: "number", value: ans }, answerText: `${n(ans)} °C per minute`, answerInput: String(ans),
          vals: { ans }, params: { kind: "lapse", lapse, climb },
        };
      },
    },

    // ---- C1.14 Trig, exponential and log derivatives ----------------------------------------------------------------
    "C1.8": {
      title: "Derivatives of trig, exponential and log functions",
      generate(r, level) {
        if (level === 1) {
          const a = r.nonzero(-6, 6), b = r.nonzero(-6, 6), c = r.nonzero(-6, 6);
          const ex = M.sup("e", x), res = `${ft(a, `cos ${x}`, true)}${ft(-b, `sin ${x}`)}${ft(c, ex)}`;
          return {
            prompt: `Differentiate ${M.eq(`${fx()} = ${ft(a, `sin ${x}`, true)}${ft(b, `cos ${x}`)}${ft(c, ex)}`)}`,
            steps: [
              `Term by term: ${dd()} sin ${x} = cos ${x}, ${dd()} cos ${x} = −sin ${x}, and ${dd()} ${ex} = ${ex}. Constant factors stay.`,
              `${fpr()} = ${res}.`,
            ],
            answer: { kind: "expr", expr: `${a}*cos(x) + (${-b})*sin(x) + (${c})*exp(x)`, vars: ["x"] }, answerText: `${fpr()} = ${res}`,
            answerInput: `${a}cos(x) + ${-b}sin(x) + ${c}e^x`.replace(/\+ -/g, "- "),
            vals: {}, params: { a, b, c },
          };
        }
        if (level === 2) {
          const kind = r.pick(["exp", "log", "ln"]);
          if (kind === "exp") {
            const a = r.pick([1, 2, 3, 5]), b = r.pick([2, 3, 5, 10]), k = r.int(0, 3), bk = b ** k, coef = a * bk, approx = coef * Math.log(b);
            const res = `${coef === 1 ? "" : n(coef)} ln ${n(b)}`;
            return {
              prompt: `Find the exact value of ${fpr(n(k))} for ${M.eq(`${fx()} = ${a === 1 ? "" : `${n(a)} · `}${M.sup(n(b), x)}.`)}`,
              steps: [
                `${M.sup(n(b), x)} = ${M.sup("e", `${x} ln ${n(b)}`)}, so by the chain rule ${dd()} ${M.sup(n(b), x)} = ${M.sup(n(b), x)} ln ${n(b)}.`,
                `${fpr()} = ${a === 1 ? "" : `${n(a)} · `}${M.sup(n(b), x)} ln ${n(b)}.`,
                `At ${x} = ${n(k)}: ${M.sup(n(b), n(k))} = ${n(bk)}, so ${fpr(n(k))} = ${res.trim()} ≈ ${n(approx)}.`,
              ],
              answer: { kind: "number", value: approx }, answerText: res.trim(), answerInput: `${coef}ln(${b})`,
              vals: { bk, coef, approx }, params: { kind, a, b, k },
            };
          }
          if (kind === "log") {
            const a = r.int(1, 6), b = r.pick([2, 3, 10]), k = r.int(1, 5), q = Q(a, k), approx = q.value / Math.log(b);
            const res = M.frac(n(q.n), `${q.d === 1 ? "" : n(q.d)} ln ${n(b)}`);
            return {
              prompt: `Find the exact value of ${fpr(n(k))} for ${M.eq(`${fx()} = ${a === 1 ? "" : `${n(a)} `}${M.sub("log", n(b))} ${x}.`)}`,
              steps: [
                `Change of base: ${M.sub("log", n(b))} ${x} = ${M.frac(`ln ${x}`, `ln ${n(b)}`)}, and ln ${n(b)} is a constant. So ${dd()} ${M.sub("log", n(b))} ${x} = ${M.frac("1", `${x} ln ${n(b)}`)}.`,
                `${fpr()} = ${M.frac(n(a), `${x} ln ${n(b)}`)}, and at ${x} = ${n(k)}: ${M.frac(n(a), `${n(k)} ln ${n(b)}`)}${q.d !== k ? ` = ${res}` : ""} ≈ ${n(approx)}.`,
              ],
              answer: { kind: "number", value: approx }, answerText: res, answerInput: `${q.n}/(${q.d}ln(${b}))`,
              vals: { q: fv(q), approx }, params: { kind, a, b, k },
            };
          }
          const a = r.nonzero(-8, 8), c = r.nonzero(-3, 3), k = r.int(1, 6), T1 = Q(a, k), twoC = 2 * c, T2 = twoC * k, ans = T1.add(T2);
          return {
            prompt: `Find ${fpr(n(k))} for ${M.eq(`${fx()} = ${ft(a, `ln ${x}`, true)}${vt(c, M.sup(x, 2))}.`)}`,
            steps: [
              `${dd()} ln ${x} = ${M.frac("1", x)} and ${dd()} ${M.sup(x, 2)} = 2${x}, so ${fpr()} = ${M.frac(n(a), x)}${M.term(twoC, x)}.`,
              `At ${x} = ${n(k)}: ${M.frac(n(a), n(k))}${st(twoC, ` · ${n(k)}`)} = ${chain(`${f(T1)}${st(T2)}`, f(ans))}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { T1: fv(T1), twoC, T2, ans: fv(ans) }, params: { kind, a, c, k },
          };
        }
        // level 3: tides, a sine model
        const M0 = r.int(3, 8), A = r.int(1, 3), useSin = r.chance(0.5) ? 1 : 0;
        const tab = useSin ? { 0: [1, 1], 2: [1, 2], 3: [0, 1], 4: [-1, 2], 6: [-1, 1], 8: [-1, 2], 9: [0, 1], 10: [1, 2] }
          : { 0: [0, 1], 1: [1, 2], 3: [1, 1], 5: [1, 2], 6: [0, 1], 7: [-1, 2], 9: [-1, 1], 11: [-1, 2] };
        const t0 = Number(r.pick(Object.keys(tab))), tv = Q(...tab[t0]), angle = Q(t0, 6);
        const coef = Q(A, 6).mul(tv).mul(useSin ? 1 : -1), approx = coef.value * Math.PI;
        const piF = (q) => (q.n === 0 ? "0" : q.d === 1 ? `${q.n === 1 ? "" : q.n === -1 ? "−" : n(q.n)}π` : `${q.n < 0 ? "−" : ""}${M.frac(`${Math.abs(q.n) === 1 ? "" : n(Math.abs(q.n))}π`, n(q.d))}`);
        const arg = `${M.frac(`π${t}`, "6")}`, D = M.v("D"), outer = useSin ? "sin" : "cos", dOuter = useSin ? "cos" : "sin";
        const Api = `${A === 1 ? "" : n(A)}π`;
        const mood = coef.n > 0 ? "The water is rising." : coef.n < 0 ? "The water is falling." : `The rate is 0: this is ${useSin === 1 ? (tv.n === 0 && t0 === 3 ? "high" : "low") : (t0 === 0 ? "high" : "low")} tide, where the depth turns around.`;
        return {
          prompt: `The depth of water at a harbor entrance is ${M.eq(`${D}(${t}) = ${n(M0)} + ${A === 1 ? "" : `${n(A)} `}${outer}(${arg})`)} meters, ${t} hours after midnight. How fast is the depth changing at ${t} = ${n(t0)}, in meters per hour? Give the exact value in terms of π.`,
          steps: [
            `Chain rule: ${dd("", t)} ${outer}(${arg}) = ${useSin ? "" : "−"}${dOuter}(${arg}) · ${M.frac("π", "6")}, so ${D}′(${t}) = ${useSin ? "" : "−"}${M.frac(Api, "6")} ${dOuter}(${arg}).`,
            `At ${t} = ${n(t0)} the angle is ${t0 === 0 ? "0" : chain(M.frac(`${n(t0)}π`, "6"), piF(angle))}, and ${dOuter}(${piF(angle)}) = ${f(tv)}.`,
            `${D}′(${n(t0)}) = ${useSin ? "" : "−"}${M.frac(Api, "6")} · ${fp(tv)} = ${piF(coef)}${coef.n !== 0 ? ` ≈ ${n(approx)}` : ""} m/h. ${mood}`,
          ],
          answer: { kind: "number", value: approx }, answerText: `${piF(coef)} m/h`, answerInput: coef.n === 0 ? "0" : `${coef.n}pi/${coef.d}`,
          vals: { angle: fv(angle), tv: fv(tv), coef: fv(coef), approx }, params: { M0, A, useSin, t0 }, consts: [6],
        };
      },
    },

    // ---- C1.15 Inverse functions and inverse trig ------------------------------------------------------------------
    "C1.inverse-derivs": {
      title: "Derivatives of inverse functions",
      generate(r, level) {
        if (level === 1) {
          const c = r.nonzero(-6, 6), k = r.int(2, 5), kk = k * k, ck = c * k, res = M.frac(n(ck), `1 + ${M.poly([kk, 0, 0])}`);
          return {
            prompt: `Differentiate ${M.eq(`${y} = ${c === 1 ? "" : c === -1 ? "−" : `${n(c)} `}arctan(${kv(k)})`)}`,
            steps: [
              `${dd()} arctan ${u} = ${M.frac("1", `1 + ${M.sup(u, 2)}`)}. Here ${u} = ${kv(k)}, so the chain rule adds the factor ${u}′ = ${n(k)}.`,
              `${y}′ = ${c === 1 ? "" : `${n(c)} · `}${M.frac("1", `1 + ${M.sup(`(${kv(k)})`, 2)}`)} · ${n(k)} = ${res}.`,
            ],
            answer: { kind: "expr", expr: `${ck}/(1 + ${kk}*x^2)`, vars: ["x"] }, answerText: `${y}′ = ${res}`, answerInput: `${ck}/(1 + ${kk}x^2)`,
            vals: { kk, ck }, params: { c, k },
          };
        }
        if (level === 2) {
          const [b, leg, a] = r.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [6, 8, 10], [8, 6, 10]]);
          const c = r.int(1, 6), isSin = r.chance(0.5), sg = isSin ? 1 : -1, ans = Q(sg * c, leg), aa = a * a, bb = b * b, diff = aa - bb;
          const fn_ = isSin ? "arcsin" : "arccos";
          return {
            prompt: `Find ${fpr(n(b))} for ${M.eq(`${fx()} = ${c === 1 ? "" : `${n(c)} `}${fn_}(${M.frac(x, n(a))}).`)}`,
            steps: [
              `${dd()} ${fn_} ${u} = ${isSin ? "" : "−"}${M.frac("1", M.sqrt(`1 − ${M.sup(u, 2)}`))}, with ${u} = ${M.frac(x, n(a))} and ${u}′ = ${M.frac("1", n(a))}.`,
              `${fpr()} = ${isSin ? "" : "−"}${c === 1 ? "" : `${n(c)} · `}${M.frac(M.frac("1", n(a)), M.sqrt(`1 − ${M.frac(M.sup(x, 2), n(aa))}`))} = ${isSin ? "" : "−"}${M.frac(n(c), M.sqrt(`${n(aa)} − ${M.sup(x, 2)}`))} (move the ${M.frac("1", n(a))} inside the root as ${M.frac("1", n(aa))}).`,
              `At ${x} = ${n(b)}: ${M.sqrt(`${n(aa)} − ${n(bb)}`)} = ${M.sqrt(n(diff))} = ${n(leg)}, so ${fpr(n(b))} = ${isSin ? "" : "−"}${M.frac(n(c), n(leg))}${ans.d !== leg ? ` = ${f(ans)}` : ""}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { aa, bb, diff, leg, ans: fv(ans) }, params: { a, b, c, isSin: isSin ? 1 : 0 },
          };
        }
        // level 3: the derivative of an inverse at a point, without a formula for the inverse
        const p = r.int(1, 6), q = r.int(-6, 6), a = r.int(-2, 2);
        const a3 = a ** 3, pa = p * a, b = a3 + pa + q, D = 3 * a * a + p, ans = Q(1, D), fi = `${M.v("f")}<sup>−1</sup>`;
        return {
          prompt: `Let ${M.eq(`${fx()} = ${M.poly([1, 0, p, q])}.`)} Find ${M.eq(`(${fi})′(${n(b)}).`)} (Hint: ${fi}(${n(b)}) is a whole number between −2 and 2.)`,
          steps: [
            `The inverse's slope is the reciprocal slope at the mirrored point: (${fi})′(${n(b)}) = ${M.frac("1", fpr(M.v("a")))}, where ${fx("f", M.v("a"))} = ${n(b)}.`,
            `Find ${M.v("a")}: ${fx("f", n(a))} = ${chain(`${M.sup(np(a), 3)}${st(p, ` · ${np(a)}`)}${st(q)}`, `${n(a3)}${st(pa)}${st(q)}`, n(b))}, so ${fi}(${n(b)}) = ${n(a)}. (${fpr()} = ${M.poly([3, 0, p])} &gt; 0, so ${M.v("f")} is increasing and this is the only solution.)`,
            `${fpr(n(a))} = 3 · ${M.sup(np(a), 2)}${st(p)} = ${n(D)}.`,
            `(${fi})′(${n(b)}) = ${f(ans)}.`,
          ],
          answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
          vals: { a3, pa, b, a, D, ans: fv(ans) }, params: { p, q, b }, consts: [3],
        };
      },
    },

    // ---- C1.16 Hyperbolic functions ---------------------------------------------------------------------------------
    "C1.hyperbolic": {
      title: "Hyperbolic functions",
      generate(r, level) {
        const lnk = (k) => `ln ${n(k)}`;
        if (level === 1) {
          const k = r.int(2, 6), kind = r.pick(["cosh", "sinh", "tanh"]), kk = k * k;
          const top = kind === "cosh" ? kk + 1 : kk - 1, ans = kind === "tanh" ? Q(kk - 1, kk + 1) : Q(top, 2 * k);
          const ek = `${M.sup("e", lnk(k))} = ${n(k)} and ${M.sup("e", `−${lnk(k)}`)} = ${M.frac("1", n(k))}`;
          const sum = (sg) => `${n(k)} ${sg} ${M.frac("1", n(k))}`;
          const steps = [`Use the definitions with ${ek}.`];
          if (kind === "tanh") {
            steps.push(`tanh(${lnk(k)}) = ${M.frac(`${M.sup("e", lnk(k))} − ${M.sup("e", `−${lnk(k)}`)}`, `${M.sup("e", lnk(k))} + ${M.sup("e", `−${lnk(k)}`)}`)} = ${M.frac(sum("−"), sum("+"))}.`);
            steps.push(`Multiply the top and the bottom by ${n(k)}: ${M.frac(`${n(kk)} − 1`, `${n(kk)} + 1`)} = ${f(ans)}.`);
          } else {
            const sg = kind === "cosh" ? "+" : "−";
            steps.push(`${kind}(${lnk(k)}) = ${M.frac(`${M.sup("e", lnk(k))} ${sg} ${M.sup("e", `−${lnk(k)}`)}`, "2")} = ${M.frac(sum(sg), "2")}.`);
            steps.push(`Multiply the top and the bottom by ${n(k)}: ${M.frac(`${n(kk)} ${sg} 1`, `2 · ${n(k)}`)} = ${M.frac(n(top), n(2 * k))}${ans.d !== 2 * k ? ` = ${f(ans)}` : ""}.`);
          }
          return {
            prompt: `Find the exact value of ${M.eq(`${kind}(${lnk(k)}).`)}`,
            steps, answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { kk, top, k2: 2 * k, ans: fv(ans) }, params: { k, kind },
          };
        }
        if (level === 2) {
          const k = r.int(2, 5), kk = k * k, C = Q(kk + 1, 2 * k), S = Q(kk - 1, 2 * k);
          if (r.chance(0.5)) {
            const a = r.nonzero(-5, 5), b = r.nonzero(-5, 5), ans = C.mul(a).add(S.mul(b));
            return {
              prompt: `Find ${fpr(lnk(k))} for ${M.eq(`${fx()} = ${ft(a, `sinh ${x}`, true)}${ft(b, `cosh ${x}`)}.`)}`,
              steps: [
                `${dd()} sinh ${x} = cosh ${x} and ${dd()} cosh ${x} = sinh ${x} (no minus sign, unlike cos), so ${fpr()} = ${ft(a, `cosh ${x}`, true)}${ft(b, `sinh ${x}`)}.`,
                `With ${M.sup("e", lnk(k))} = ${n(k)}: cosh(${lnk(k)}) = ${M.frac(`${n(k)} + ${M.frac("1", n(k))}`, "2")} = ${f(C)} and sinh(${lnk(k)}) = ${M.frac(`${n(k)} − ${M.frac("1", n(k))}`, "2")} = ${f(S)}.`,
                `${fpr(lnk(k))} = ${n(a)} · ${f(C)}${st(b, ` · ${f(S)}`)} = ${chain(`${f(C.mul(a))}${st(S.mul(b))}`, f(ans))}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
              vals: { C: fv(C), S: fv(S), aC: fv(C.mul(a)), bS: fv(S.mul(b)), ans: fv(ans) }, params: { kind: "sc", a, b, k },
            };
          }
          const c = r.int(1, 6), th = Q(kk - 1, kk + 1), sech2 = Q(1).sub(th.mul(th)), ans = sech2.mul(c);
          return {
            prompt: `Find ${fpr(lnk(k))} for ${M.eq(`${fx()} = ${c === 1 ? "" : `${n(c)} `}tanh ${x}.`)}`,
            steps: [
              `${dd()} tanh ${x} = ${M.sup("sech", 2)} ${x} = 1 − ${M.sup("tanh", 2)} ${x}, so ${fpr()} = ${pdot(c, `(1 − ${M.sup("tanh", 2)} ${x})`)}.`,
              `tanh(${lnk(k)}) = ${M.frac(`${n(k)} − ${M.frac("1", n(k))}`, `${n(k)} + ${M.frac("1", n(k))}`)} = ${M.frac(`${n(kk)} − 1`, `${n(kk)} + 1`)} = ${f(th)}.`,
              `1 − ${M.sup(fp(th), 2)} = 1 − ${f(th.mul(th))} = ${f(sech2)}, so ${fpr(lnk(k))} = ${c === 1 ? "" : `${n(c)} · `}${f(sech2)}${c === 1 ? "" : ` = ${f(ans)}`}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { kk, th: fv(th), th2: fv(th.mul(th)), sech2: fv(sech2), ans: fv(ans) }, params: { kind: "tanh", c, k },
          };
        }
        // level 3: a hanging cable (catenary)
        const a = r.pick([10, 20, 30, 40, 50]), k = r.int(2, 5), kk = k * k, ans = Q(kk - 1, 2 * k);
        return {
          prompt: `A power line hangs between two towers in the shape ${M.eq(`${y} = ${n(a)} cosh(${M.frac(x, n(a))})`)} meters, with ${x} measured horizontally from the lowest point. What is the slope of the line at ${x} = ${n(a)} ${lnk(k)} meters?`,
          steps: [
            `${dd()} cosh ${u} = sinh ${u}; with ${u} = ${M.frac(x, n(a))} the chain rule adds the factor ${M.frac("1", n(a))}: ${y}′ = ${n(a)} · sinh(${M.frac(x, n(a))}) · ${M.frac("1", n(a))} = sinh(${M.frac(x, n(a))}).`,
            `At ${x} = ${n(a)} ${lnk(k)}: ${M.frac(x, n(a))} = ${lnk(k)}, and ${M.sup("e", lnk(k))} = ${n(k)}, ${M.sup("e", `−${lnk(k)}`)} = ${M.frac("1", n(k))}.`,
            `${y}′ = sinh(${lnk(k)}) = ${M.frac(`${n(k)} − ${M.frac("1", n(k))}`, "2")} = ${M.frac(`${n(kk)} − 1`, `2 · ${n(k)}`)} = ${f(ans)}: the cable rises ${f(ans)} m per meter there.`,
          ],
          answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
          vals: { kk, ans: fv(ans) }, params: { a, k },
        };
      },
    },

    // ---- C1.17 Implicit differentiation ------------------------------------------------------------------------------
    "C1.9": {
      title: "Implicit differentiation",
      generate(r, level) {
        const yp = `${y}′`;
        if (level === 1) {
          const [p0, q0] = r.pick([[3, 4], [4, 3], [5, 12], [12, 5], [6, 8], [8, 6]]);
          const p = p0 * r.sign(), q = q0 * r.sign(), R2 = p * p + q * q, Rr = Math.round(Math.sqrt(R2)), ans = Q(-p, q);
          return {
            prompt: `Find the slope of the circle ${M.eq(`${M.sup(x, 2)} + ${M.sup(y, 2)} = ${n(R2)}`)} at the point (${n(p)}, ${n(q)}).`,
            graph: graph({ view: [-Rr - 2, Rr + 2, -Rr - 2, Rr + 2], equal: true, items: [{ t: "circle", c: [0, 0], r: Rr }, { t: "pt", x: p, y: q }] }),
            steps: [
              `Differentiate both sides with respect to ${x}, treating ${y} as ${y}(${x}), a quantity that depends on ${x}: 2${x} + 2${y}${yp} = 0 (the chain rule gives ${y}² the factor ${yp}).`,
              `Solve for ${yp}: ${yp} = −${M.frac(x, y)}.`,
              `At (${n(p)}, ${n(q)}): ${yp} = ${chain(`−${M.frac(n(p), n(q))}`, f(ans))}. (The radius to this point has slope ${f(Q(q, p))}; the tangent is perpendicular to it.)`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { R2, Rr, rad: fv(Q(q, p)), ans: fv(ans) }, params: { p, q },
          };
        }
        if (level === 2) {
          for (;;) {
            const a = r.pick([-4, -3, -1, 1, 3, 4]), x0 = r.nonzero(-4, 4), y0 = r.nonzero(-4, 4);
            const c = x0 * x0 + a * x0 * y0 + y0 * y0, N = 2 * x0 + a * y0, D = a * x0 + 2 * y0;
            if (D === 0 || c <= 0) continue;
            const ans = Q(-N, D);
            return {
              prompt: `Find ${dd(y)} at the point (${n(x0)}, ${n(y0)}) on the curve ${M.eq(`${M.sup(x, 2)}${M.term(a, `${x}${y}`)} + ${M.sup(y, 2)} = ${n(c)}.`)}`,
              steps: [
                `Differentiate both sides with respect to ${x}. The product rule handles ${x}${y} and the chain rule handles ${M.sup(y, 2)}: 2${x}${M.term(a, `(${y} + ${x}${yp})`)} + 2${y}${yp} = 0.`,
                `Collect the ${yp} terms: (${kv(a)} + 2${y})${yp} = −(2${x}${M.term(a, y)}).`,
                `${yp} = −${M.frac(`2${x}${M.term(a, y)}`, `${kv(a)} + 2${y}`)}.`,
                `At (${n(x0)}, ${n(y0)}): ${yp} = −${M.frac(`2 · ${np(x0)}${st(a, ` · ${np(y0)}`)}`, `${n(a)} · ${np(x0)} + 2 · ${np(y0)}`)} = ${chain(`−${M.frac(n(N), n(D))}`, f(ans))}.`,
              ],
              answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
              vals: { c, N, D, ans: fv(ans) }, params: { a, x0, y0 },
            };
          }
        }
        // level 3: the tangent line to an implicit curve
        for (;;) {
          const a = r.nonzero(-4, 4), x0 = r.int(-3, 3), y0 = r.nonzero(-3, 3);
          const c = y0 ** 3 + a * x0 * y0 + x0 * x0, N = a * y0 + 2 * x0, D = 3 * y0 * y0 + a * x0;
          if (D === 0) continue;
          const m = Q(-N, D), b0 = Q(y0).sub(m.mul(x0));
          const line = `${y} = ${M.poly([m, b0])}`;
          return {
            prompt: `Find the equation of the tangent line to ${M.eq(`${M.sup(y, 3)}${M.term(a, `${x}${y}`)} + ${M.sup(x, 2)} = ${n(c)}`)} at the point (${n(x0)}, ${n(y0)}). Write it as ${y} = ${M.v("m")}${x} + ${M.v("b")}.`,
            steps: [
              `Differentiate implicitly (product rule on ${x}${y}, chain rule on ${M.sup(y, 3)}): 3${M.sup(y, 2)}${yp}${M.term(a, `(${y} + ${x}${yp})`)} + 2${x} = 0.`,
              `Collect ${yp}: (3${M.sup(y, 2)}${M.term(a, x)})${yp} = −(${kv(a, y)} + 2${x}), so ${yp} = −${M.frac(`${kv(a, y)} + 2${x}`, `3${M.sup(y, 2)}${M.term(a, x)}`)}.`,
              `At (${n(x0)}, ${n(y0)}): the slope is −${M.frac(`${n(a)} · ${np(y0)} + 2 · ${np(x0)}`, `3 · ${M.sup(np(y0), 2)}${st(a, ` · ${np(x0)}`)}`)} = ${chain(`−${M.frac(n(N), n(D))}`, f(m))}.`,
              `Point–slope form: ${y} − ${np(y0)} = ${fp(m)}(${x} − ${np(x0)}). Solve for ${y}: ${line}.`,
            ],
            answer: { kind: "expr", expr: `(${typed(m)})*x + (${typed(b0)})`, vars: ["x"] }, answerText: line, answerInput: `y = ${plain([m, b0])}`,
            vals: { c, N, D, m: fv(m), b0: fv(b0) }, params: { a, x0, y0 }, consts: [3],
          };
        }
      },
    },

    // ---- C1.18 Logarithmic differentiation ---------------------------------------------------------------------------
    "C1.log-diff": {
      title: "Logarithmic differentiation",
      generate(r, level) {
        const yp = `${y}′`;
        if (level === 1) {
          if (r.chance(0.5)) {
            const a = r.int(1, 5), b = r.int(1, 9), twoA = 2 * a, g = M.poly([a, 0, b]), res = M.frac(kv(twoA), g);
            return {
              prompt: `Differentiate ${M.eq(`${y} = ln(${g})`)}`,
              steps: [
                `The logarithmic derivative: ${dd()} ln ${M.v("g")} = ${M.frac(`${M.v("g")}′`, M.v("g"))}. Here ${M.v("g")} = ${g}, which is always positive, and ${M.v("g")}′ = ${kv(twoA)}.`,
                `${yp} = ${res}.`,
              ],
              answer: { kind: "expr", expr: `${twoA}*x/(${a}*x^2 + ${b})`, vars: ["x"] }, answerText: `${yp} = ${res}`, answerInput: `${twoA}x/(${plain([a, 0, b])})`,
              vals: { twoA }, params: { kind: "plain", a, b },
            };
          }
          const b = r.int(1, 9), k = r.int(2, 5), twoK = 2 * k, g = M.poly([1, 0, b]), res = M.frac(kv(twoK), g);
          return {
            prompt: `Differentiate ${M.eq(`${y} = ln ${M.sup(`(${g})`, n(k))}`)}`,
            steps: [
              `A log rule first: ln ${M.sup(`(${g})`, n(k))} = ${n(k)} ln(${g}).`,
              `${dd()} ln ${M.v("g")} = ${M.frac(`${M.v("g")}′`, M.v("g"))} with ${M.v("g")} = ${g}, ${M.v("g")}′ = 2${x}: ${yp} = ${n(k)} · ${M.frac(`2${x}`, g)} = ${res}.`,
            ],
            answer: { kind: "expr", expr: `${twoK}*x/(x^2 + ${b})`, vars: ["x"] }, answerText: `${yp} = ${res}`, answerInput: `${twoK}x/(${plain([1, 0, b])})`,
            vals: { twoK }, params: { kind: "power", b, k },
          };
        }
        if (level === 2) {
          // y = x^(kx): neither the power rule nor the exponential rule applies
          const k = r.int(1, 2), x0 = r.int(1, 3), Y = x0 ** (k * x0), coef = Y * k, ans = coef * (Math.log(x0) + 1);
          const expo = kv(k);
          const res = x0 === 1 ? n(coef) : `${n(coef)}(ln ${n(x0)} + 1)`;
          return {
            prompt: `Find the exact value of ${yp} at ${x} = ${n(x0)} for ${M.eq(`${y} = ${M.sup(x, expo)}.`)}`,
            steps: [
              `Both the base and the exponent vary, so take logs: ln ${y} = ${expo} ln ${x}.`,
              `Differentiate (product rule on the right): ${M.frac(yp, y)} = ${k === 1 ? "" : `${n(k)} `}ln ${x} + ${expo} · ${M.frac("1", x)} = ${pdot(k, `(ln ${x} + 1)`)}.`,
              `Multiply back by ${y}: ${yp} = ${M.sup(x, expo)} · ${pdot(k, `(ln ${x} + 1)`)}.`,
              `At ${x} = ${n(x0)}: ${M.sup(n(x0), k === 1 ? n(x0) : `${n(k)} · ${n(x0)}`)} = ${n(Y)}, so ${yp} = ${n(Y)} · ${pdot(k, `(ln ${n(x0)} + 1)`)} = ${res}${x0 === 1 ? " (ln 1 = 0)" : ` ≈ ${n(ans)}`}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: res, answerInput: x0 === 1 ? String(coef) : `${coef}(ln(${x0}) + 1)`,
            vals: { kx: k * x0, Y, coef, ans }, params: { k, x0 },
          };
        }
        // level 3: a product and quotient of powers, at a point
        for (;;) {
          const x0 = r.int(0, 3), a = r.int(1, 3), p = r.int(2, 3), sq = r.int(1, 3), b = sq * sq - x0, c = r.int(1, 4);
          const A = x0 + a, B = x0 + b, C = x0 + c;
          const Y = Q(A ** p * sq, C), S = Q(p, A).add(Q(1, 2 * B)).sub(Q(1, C)), ans = Y.mul(S);
          if (ans.n === 0) continue;
          const fa = fac(-a), fb = M.poly([1, b]), fc = fac(-c);
          return {
            prompt: `Use logarithmic differentiation to find ${yp} at ${x} = ${n(x0)} for ${M.eq(`${y} = ${M.frac(`${M.sup(fa, n(p))}${M.sqrt(fb)}`, M.poly([1, c]))}.`)}`,
            steps: [
              `Take logs and expand: ln ${y} = ${n(p)} ln${fa} + ${M.frac("1", "2")} ln(${fb}) − ln${fc}.`,
              `Differentiate: ${M.frac(yp, y)} = ${M.frac(n(p), M.poly([1, a]))} + ${M.frac("1", `2(${fb})`)} − ${M.frac("1", M.poly([1, c]))}.`,
              `At ${x} = ${n(x0)}: ${y} = ${M.frac(`${M.sup(n(A), n(p))} · ${M.sqrt(n(B))}`, n(C))} = ${f(Y)}, and ${M.frac(yp, y)} = ${M.frac(n(p), n(A))} + ${M.frac("1", n(2 * B))} − ${M.frac("1", n(C))} = ${f(S)}.`,
              `${yp} = ${y} · ${M.frac(yp, y)} = ${f(Y)} · ${fp(S)} = ${f(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { A, B, C, sq, B2: 2 * B, Y: fv(Y), S: fv(S), ans: fv(ans) }, params: { x0, a, p, b, c },
          };
        }
      },
    },

    // ---- C1.19 Higher-order derivatives ---------------------------------------------------------------------------------
    "C1.higher-order": {
      title: "Higher-order derivatives",
      generate(r, level) {
        if (level === 1) {
          const deg = r.int(3, 4), cs = [r.nonzero(-4, 4)];
          for (let i = 1; i <= deg; i++) cs.push(r.int(-6, 6));
          const a = r.int(-3, 3), d1 = pder(cs), d2 = pder(d1);
          const [sa, ea, terms, ans] = subst(d2, a);
          return {
            prompt: `Find ${M.v("f")}″(${n(a)}) for ${M.eq(`${fx()} = ${M.poly(cs)}.`)}`,
            steps: [
              `First derivative (power rule): ${fpr()} = ${M.poly(d1)}.`,
              `Differentiate again: ${M.v("f")}″(${x}) = ${M.poly(d2)}.`,
              `At ${x} = ${n(a)}: ${chain(sa, ea, f(ans))}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: n(ans.value), answerInput: typed(ans),
            vals: { d1: d1.map((q) => q.n), d2: d2.map((q) => q.n), terms: terms.map((q) => q.n), ans: ans.n }, params: { cs, a }, consts: [3, 4],
          };
        }
        if (level === 2) {
          const k = r.int(1, 4), b = 3 * k, c = r.int(0, 30), d = r.int(0, 20), twoB = 2 * b, kk = k * k, threeKK = 3 * kk, twoBk = twoB * k, ans = threeKK - twoBk + c;
          const s_ = M.v("s"), v_ = M.v("v"), a_ = M.v("a");
          return {
            prompt: `A particle moves along a line with position ${M.eq(`${s_}(${t}) = ${M.poly([1, -b, c, d], "t")}`)} meters at time ${t} seconds. At what moment is its acceleration zero, and what is its velocity then? Enter the velocity in m/s.`,
            steps: [
              `Velocity is the first derivative: ${v_}(${t}) = ${s_}′(${t}) = ${M.poly([3, -twoB, c], "t")}.`,
              `Acceleration is the second: ${a_}(${t}) = ${s_}″(${t}) = ${M.poly([6, -twoB], "t")}.`,
              `${a_}(${t}) = 0 when 6${t} = ${n(twoB)}, that is at ${t} = ${n(k)} s.`,
              `${v_}(${n(k)}) = 3 · ${M.sup(n(k), 2)} − ${n(twoB)} · ${n(k)}${st(c)} = ${chain(`${n(threeKK)} − ${n(twoBk)}${st(c)}`, n(ans))} m/s${ans < 0 ? ": negative, so the particle is moving backward" : ""}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: `${n(ans)} m/s (at ${t} = ${n(k)} s)`, answerInput: String(ans),
            vals: { twoB, k, kk, threeKK, twoBk, ans }, params: { b, c, d }, consts: [3, 6],
          };
        }
        // level 3: patterns in nth derivatives
        const nn = r.int(5, 10), k = r.pick(nn > 8 ? [2, -2, -1] : [2, -2, 3, -1, -3]), m = r.int(2, nn - 1), trig = r.pick(["sin", "cos"]);
        const kn = k ** nn, q = Math.floor(nn / 4), rem = nn % 4;
        const cyc = trig === "sin" ? ["sin", "cos", "−sin", "−cos"] : ["cos", "−sin", "−cos", "sin"];
        const trigVal = trig === "sin" ? [0, 1, 0, -1][rem] : [1, 0, -1, 0][rem], ans = kn + trigVal;
        const ekx = M.sup("e", kv(k)), fn_ = `${M.v("f")}<sup>(${n(nn)})</sup>`;
        return {
          prompt: `Let ${M.eq(`${fx()} = ${M.sup(x, n(m))} + ${ekx} + ${trig} ${x}.`)} Find ${fn_}(0), the ${n(nn)}th derivative at 0.`,
          steps: [
            `${M.sup(x, n(m))}: each derivative lowers the power by one, so after ${n(m)} derivatives it is a constant and every later derivative is 0. Since ${n(nn)} &gt; ${n(m)}, this term contributes 0.`,
            `${ekx}: each derivative multiplies by ${n(k)}, so the ${n(nn)}th derivative is ${M.sup(np(k), n(nn))}${ekx}, which at ${x} = 0 is ${M.sup(np(k), n(nn))} = ${n(kn)}.`,
            `${trig} ${x}: the derivatives cycle with period 4 (${cyc.join(", ")}, …). ${n(nn)} = 4 · ${n(q)} + ${n(rem)}, so the ${n(nn)}th derivative is ${cyc[rem]} ${x}, which is ${n(trigVal)} at ${x} = 0.`,
            `${fn_}(0) = 0${st(kn)}${st(trigVal)} = ${n(ans)}.`,
          ],
          answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
          vals: { kn, q, rem, trigVal, ans }, params: { nn, k, m, trig }, consts: [4],
        };
      },
    },
    // ---- C1.20 Related rates ----------------------------------------------------------------------------------------
    "C1.10": {
      title: "Related rates",
      generate(r, level) {
        const dt = (q) => dd(q, t);
        if (level === 1) {
          if (r.chance(0.5)) {
            const rr = r.int(3, 20), dr = r.int(1, 5), twoR = 2 * rr, coef = twoR * dr, approx = coef * Math.PI;
            const A = M.v("A"), R_ = M.v("r");
            return {
              prompt: `A stone dropped in a pond sends out a circular ripple whose radius grows at ${n(dr)} cm/s. How fast is the area inside the ripple growing when the radius is ${n(rr)} cm? Give the exact answer in cm²/s.`,
              steps: [
                `The area of a circle: ${A} = π${M.sup(R_, 2)}. Both ${A} and ${R_} depend on time.`,
                `Differentiate with respect to ${t}: ${dt(A)} = 2π${R_} ${dt(R_)}.`,
                `Substitute ${R_} = ${n(rr)} and ${dt(R_)} = ${n(dr)}: ${dt(A)} = 2π · ${n(rr)} · ${n(dr)} = ${n(coef)}π ≈ ${n(approx)} cm²/s.`,
              ],
              answer: { kind: "number", value: approx }, answerText: `${n(coef)}π cm²/s`, answerInput: `${coef}pi`,
              vals: { twoR, coef, approx }, params: { kind: "circle", rr, dr },
            };
          }
          const rr = r.int(2, 10), dr = r.int(1, 3), r2 = rr * rr, coef = 4 * r2 * dr, approx = coef * Math.PI;
          const V = M.v("V"), R_ = M.v("r");
          return {
            prompt: `Air is pumped into a spherical balloon so that its radius grows at ${n(dr)} cm/s. How fast is its volume growing when the radius is ${n(rr)} cm? Give the exact answer in cm³/s.`,
            steps: [
              `The volume of a sphere: ${V} = ${M.frac("4", "3")}π${M.sup(R_, 3)}.`,
              `Differentiate with respect to ${t}: ${dt(V)} = ${M.frac("4", "3")}π · 3${M.sup(R_, 2)} ${dt(R_)} = 4π${M.sup(R_, 2)} ${dt(R_)} (the surface area times the rate of the radius).`,
              `Substitute: ${dt(V)} = 4π · ${M.sup(n(rr), 2)} · ${n(dr)} = 4π · ${n(r2)} · ${n(dr)} = ${n(coef)}π ≈ ${n(approx)} cm³/s.`,
            ],
            answer: { kind: "number", value: approx }, answerText: `${n(coef)}π cm³/s`, answerInput: `${coef}pi`,
            vals: { r2, coef, approx }, params: { kind: "sphere", rr, dr }, consts: [3, 4],
          };
        }
        if (level === 2) {
          const [X0, Y0, L] = r.pick([[6, 8, 10], [8, 6, 10], [5, 12, 13], [12, 5, 13], [9, 12, 15], [12, 9, 15], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25], [15, 20, 25], [20, 15, 25]]);
          const dx = r.int(1, 4), L2 = L * L, X2 = X0 * X0, D = L2 - X2, ans = Q(X0 * dx, Y0), xd = X0 * dx;
          const xv = x, yv = y;
          return {
            prompt: `A ${n(L)} m ladder leans against a vertical wall. Its foot slides away from the wall at ${n(dx)} m/s. How fast is the top of the ladder sliding down the wall when the foot is ${n(X0)} m from the wall, in m/s?`,
            graph: graph({ view: [-1, X0 + 2, -1, Y0 + 2], equal: true, axes: false, grid: false, items: [
              { t: "seg", a: [0, 0], b: [0, Y0 + 1.5], role: "muted" }, { t: "seg", a: [-0.5, 0], b: [X0 + 1.5, 0], role: "muted" },
              { t: "seg", a: [X0, 0], b: [0, Y0], label: `${L} m` }, { t: "text", x: X0 / 2, y: -0.6, s: "x" }, { t: "text", x: -0.5, y: Y0 / 2, s: "y" }] }),
            steps: [
              `Let ${xv} be the distance from the wall to the foot and ${yv} the height of the top. Pythagoras: ${M.sup(xv, 2)} + ${M.sup(yv, 2)} = ${M.sup(n(L), 2)}, and the ladder's length does not change.`,
              `Differentiate with respect to ${t}: 2${xv} ${dt(xv)} + 2${yv} ${dt(yv)} = 0, so ${dt(yv)} = −${M.frac(xv, yv)} ${dt(xv)}.`,
              `When ${xv} = ${n(X0)}: ${yv} = ${M.sqrt(`${n(L2)} − ${n(X2)}`)} = ${M.sqrt(n(D))} = ${n(Y0)}.`,
              `${dt(yv)} = −${M.frac(n(X0), n(Y0))} · ${n(dx)} = −${f(ans)} m/s. The minus sign says the top is falling, at ${f(ans)} m/s.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: `${f(ans)} m/s`, answerInput: typed(ans),
            vals: { L2, X2, D, Y0, xd, ans: fv(ans) }, params: { L, X0, dx },
          };
        }
        // level 3: a filling cone
        const [R0, H0] = r.pick([[2, 6], [3, 9], [4, 12], [2, 4], [3, 6], [5, 10]]), k = Q(R0, H0), h0 = r.int(2, H0 - 1), Vp = r.pick([2, 3, 4, 5, 6, 9, 10]);
        const k2 = k.mul(k), k23 = k2.div(3), h2 = h0 * h0, coef = Q(Vp).div(k2.mul(h2)), approx = coef.value / Math.PI;
        const V = M.v("V"), hh = M.v("h"), rv = M.v("r");
        const ansTxt = M.frac(n(coef.n), `${coef.d === 1 ? "" : n(coef.d)}π`);
        return {
          prompt: `Water is pumped at ${n(Vp)} m³/min into a tank shaped like a cone with its point down, ${n(H0)} m deep and ${n(R0)} m in radius at the top. How fast is the water level rising when the water is ${n(h0)} m deep? Give the exact answer in m/min.`,
          graph: graph({ view: [-R0 - 1, R0 + 1, -1, H0 + 1], equal: true, axes: false, grid: false, items: [
            { t: "poly", p: [[-R0, H0], [R0, H0], [0, 0]], fill: false, role: "muted" }, { t: "poly", p: [[-k.value * h0, h0], [k.value * h0, h0], [0, 0]] },
            { t: "text", x: 0, y: H0 + 0.5, s: `${2 * R0} m across` }, { t: "text", x: k.value * h0 / 2 + 0.6, y: h0 / 2, s: "h" }] }),
          steps: [
            `At depth ${hh} the water is a cone of radius ${rv}. Similar triangles: ${M.frac(rv, hh)} = ${M.frac(n(R0), n(H0))}, so ${rv} = ${kv(k, hh)}.`,
            `${V} = ${M.frac("1", "3")}π${M.sup(rv, 2)}${hh} = ${M.frac("1", "3")}π${M.sup(`(${kv(k, hh)})`, 2)}${hh} = ${f(k23)}π${M.sup(hh, 3)}. Only one changing quantity is left.`,
            `Differentiate with respect to ${t}: ${dt(V)} = ${f(k23)}π · 3${M.sup(hh, 2)} ${dt(hh)} = ${f(k2)}π${M.sup(hh, 2)} ${dt(hh)}.`,
            `Substitute ${dt(V)} = ${n(Vp)} and ${hh} = ${n(h0)}: ${n(Vp)} = ${f(k2)}π · ${n(h2)} · ${dt(hh)}, so ${dt(hh)} = ${n(Vp)} ÷ ${k2.mul(h2).eq(1) ? "π" : `(${f(k2.mul(h2))}π)`} = ${ansTxt} ≈ ${n(approx)} m/min.`,
          ],
          answer: { kind: "number", value: approx }, answerText: `${ansTxt} m/min`, answerInput: `${coef.n}/(${coef.d}pi)`,
          vals: { k: fv(k), k2: fv(k2), k23: fv(k23), h2, k2h2: fv(k2.mul(h2)), coef: fv(coef), approx }, params: { R0, H0, h0, Vp }, consts: [3],
        };
      },
    },

    // ---- C1.21 Tangent lines and linear approximation ----------------------------------------------------------------------
    "C1.11": {
      title: "Tangent lines and linear approximation",
      generate(r, level) {
        if (level === 1) {
          const p = r.nonzero(-2, 2), q = r.int(-5, 5), c = r.int(-6, 6), a = r.int(-3, 3);
          const fa = p * a * a + q * a + c, twoP = 2 * p, twoPa = twoP * a, m = twoPa + q, ma = m * a, b0 = fa - ma;
          const [sa, ea] = subst([p, q, c], a), line = `${y} = ${M.poly([m, b0])}`;
          const view = fit(a - 3, a + 3, (v) => p * v * v + q * v + c, [fa]);
          return {
            prompt: `Find the equation of the tangent line to ${M.eq(`${y} = ${M.poly([p, q, c])}`)} at ${x} = ${n(a)}. Write it as ${y} = ${M.v("m")}${x} + ${M.v("b")}.`,
            graph: graph({ view, items: [{ t: "fn", e: `${p}*x^2 + (${q})*x + (${c})` }, { t: "pt", x: a, y: fa }] }),
            steps: [
              `The point: ${fx("f", n(a))} = ${chain(sa, ea, n(fa))}, so the line passes through (${n(a)}, ${n(fa)}).`,
              `The slope: ${fpr()} = ${M.poly([twoP, q])}, so ${fpr(n(a))} = ${chain(`${n(twoP)} · ${np(a)}${st(q)}`, `${n(twoPa)}${st(q)}`, n(m))}.`,
              `Point–slope form: ${y} − ${np(fa)} = ${pdot(m, `(${x} − ${np(a)})`)}. Solve for ${y}: ${y} = ${chain(`${kv(m)}${st(-ma)}${st(fa)}`, M.poly([m, b0]))}.`,
            ],
            answer: { kind: "expr", expr: `${m}*x + (${b0})`, vars: ["x"] }, answerText: line, answerInput: `y = ${plain([m, b0])}`,
            vals: { fa, twoP, twoPa, m, ma, b0, terms: subst([p, q, c], a)[2].map((v) => v.n) }, params: { p, q, c, a },
          };
        }
        if (level === 2) {
          const cube = r.chance(0.4), s = cube ? r.int(2, 4) : r.int(2, 10), a = cube ? s ** 3 : s * s, d = r.nonzero(-9, 9), dx = Q(d, 10);
          const slope = cube ? Q(1, 3 * s * s) : Q(1, 2 * s), corr = slope.mul(dx), est = Q(s).add(corr), target = Q(a).add(dx);
          const truth = cube ? Math.cbrt(target.value) : Math.sqrt(target.value);
          if (Math.abs(((est.value * 1e4) % 1) - 0.5) < 1e-6) return this.generate(r, level);   // no rounding ties at 4 places
          const root = (v) => (cube ? M.sqrt(v, "3") : M.sqrt(v));
          const deriv = cube ? M.frac("1", `3${M.sup(x, M.frac("2", "3"))}`) : M.frac("1", `2${M.sqrt(x)}`);
          return {
            prompt: `Use a linear approximation to estimate ${M.eq(`${root(n(target.value))}.`)} Round to 4 decimal places.`,
            steps: [
              `Use ${fx()} = ${root(x)} near ${M.v("a")} = ${n(a)}, a ${cube ? "perfect cube" : "perfect square"} close to ${n(target.value)}: ${fx("f", n(a))} = ${n(s)}.`,
              `${fpr()} = ${deriv}, so ${fpr(n(a))} = ${cube ? M.frac("1", `3 · ${M.sup(n(s), 2)}`) : M.frac("1", `2 · ${n(s)}`)} = ${f(slope)}.`,
              `${M.v("L")}(${x}) = ${n(s)} + ${f(slope)}(${x} − ${n(a)}). With ${x} − ${n(a)} = ${n(dx.value)}: ${M.v("L")} = ${n(s)} ${d < 0 ? "−" : "+"} ${n(Math.abs(dx.value))} · ${f(slope)} = ${n(s)}${st(corr)} = ${f(est)} ≈ ${M.n(est.value, { dp: 4 })}.`,
              `(The true value is ${M.n(truth, { dp: 4 })}: the tangent line is very close near ${M.v("a")}.)`,
            ],
            answer: { kind: "number", value: est.value, dp: 4 }, answerText: M.n(est.value, { dp: 4 }), answerInput: est.value.toFixed(4),
            vals: { a, s, ss: s * s, slope: fv(slope), corr: fv(corr), est: fv(est), dxv: dx.value, truth }, params: { cube: cube ? 1 : 0, s, target: target.value }, consts: cube ? [3, 4] : [4],
          };
        }
        // level 3: the normal line to a cubic
        for (;;) {
          const b = r.int(-4, 4), c = r.int(-4, 4), a = r.int(-2, 2);
          const fa = a ** 3 + b * a + c, m = 3 * a * a + b;
          if (m === 0) continue;
          const nm = Q(-1, m), b0 = Q(fa).sub(nm.mul(a)), line = `${y} = ${M.poly([nm, b0])}`;
          const [sa, ea] = subst([1, 0, b, c], a);
          const view = fit(a - 3, a + 3, (v) => v ** 3 + b * v + c, [fa]);
          return {
            prompt: `Find the equation of the normal line (perpendicular to the tangent) to ${M.eq(`${y} = ${M.poly([1, 0, b, c])}`)} at ${x} = ${n(a)}. Write it as ${y} = ${M.v("m")}${x} + ${M.v("b")}.`,
            graph: graph({ view, items: [{ t: "fn", e: pstr([1, 0, b, c]) }, { t: "pt", x: a, y: fa }] }),
            steps: [
              `The point: ${chain(sa, ea, n(fa))}, so (${n(a)}, ${n(fa)}).`,
              `Tangent slope: ${y}′ = ${M.poly([3, 0, b])}, which is ${chain(`3 · ${M.sup(np(a), 2)}${st(b)}`, n(m))} at ${x} = ${n(a)}.`,
              `The normal slope is the negative reciprocal: −1 ÷ ${np(m)} = ${f(nm)}.`,
              `${y} − ${np(fa)} = ${fp(nm)}(${x} − ${np(a)}), so ${line}.`,
            ],
            answer: { kind: "expr", expr: `(${typed(nm)})*x + (${typed(b0)})`, vars: ["x"] }, answerText: line, answerInput: `y = ${plain([nm, b0])}`,
            vals: { fa, m, nm: fv(nm), b0: fv(b0), terms: subst([1, 0, b, c], a)[2].map((v) => v.n) }, params: { b, c, a }, consts: [3],
          };
        }
      },
    },

    // ---- C1.22 Differentials and error propagation ------------------------------------------------------------------------------
    "C1.differentials": {
      title: "Differentials and error estimates",
      generate(r, level) {
        if (level === 1) {
          const p = r.nonzero(-2, 2), q = r.int(-6, 6), a = r.int(1, 4), d = r.nonzero(-3, 3), dx = Q(d, 10);
          const fq = (v) => Q(p).mul(Frac.of(v).pow(3)).add(Q(q).mul(v));
          const D = 3 * p * a * a + q, dy = dx.mul(D), Dy = fq(dx.add(a)).sub(fq(a));
          return {
            prompt: `For ${M.eq(`${y} = ${M.poly([p, 0, q, 0])}`)} find the differential ${M.v("dy")} when ${x} = ${n(a)} and ${M.v("dx")} = ${n(dx.value)}.`,
            steps: [
              `${M.v("dy")} = ${y}′ ${M.v("dx")}, and ${y}′ = ${M.poly([3 * p, 0, q])}.`,
              `At ${x} = ${n(a)}: ${y}′ = ${chain(`${n(3 * p)} · ${M.sup(n(a), 2)}${st(q)}`, n(D))}.`,
              `${M.v("dy")} = ${n(D)} · ${np(dx.value)} = ${n(dy.value)}.`,
              `(The actual change is Δ${y} = ${y}(${n(dx.add(a).value)}) − ${y}(${n(a)}) = ${n(Dy.value)}. The differential approximates it, and the gap shrinks as ${M.v("dx")} shrinks.)`,
            ],
            answer: { kind: "number", value: dy.value }, answerText: n(dy.value), answerInput: String(dy.value),
            vals: { p3: 3 * p, D, dy: dy.value, xn: dx.add(a).value, Dy: Dy.value }, params: { p, q, a, dx: dx.value }, consts: [3],
          };
        }
        if (level === 2) {
          const cube = r.chance(0.5), s = r.int(3, 20), e = r.pick([0.05, 0.1, 0.2, 0.5]), e100 = Math.round(e * 100);
          const k = cube ? 3 : 2, sk1 = cube ? s * s : s, coef = k * sk1, dV = (coef * e100) / 100;
          const unit = cube ? "cm³" : "cm²", what = cube ? "volume" : "area", V = M.v(cube ? "V" : "A");
          return {
            prompt: `The side of a ${cube ? "cube" : "square tile"} is measured as ${n(s)} cm, with a possible error of ±${n(e)} cm. Use differentials to estimate the largest possible error in the computed ${what}, in ${unit}.`,
            steps: [
              `${V} = ${M.sup(x, k)}, so ${M.v(`d${cube ? "V" : "A"}`)} = ${k}${cube ? M.sup(x, 2) : x} ${M.v("dx")}.`,
              `With ${x} = ${n(s)} and ${M.v("dx")} = ±${n(e)}: ${M.v(`d${cube ? "V" : "A"}`)} = ${k} · ${cube ? M.sup(n(s), 2) : n(s)} · ${n(e)} = ${n(coef)} · ${n(e)} = ±${n(dV)} ${unit}.`,
              `So the computed ${what}, ${n(s ** k)} ${unit}, could be off by about ${n(dV)} ${unit}.`,
            ],
            answer: { kind: "number", value: dV }, answerText: `±${n(dV)} ${unit}`, answerInput: String(dV),
            vals: { coef, dV, Vs: s ** k }, params: { cube: cube ? 1 : 0, s, e }, consts: [3],
          };
        }
        // level 3: percentage errors scale by the exponent
        const kind = r.pick(["sphere", "circle", "pendulum"]), p10 = r.pick([5, 10, 15, 20, 30, 40]), pc = p10 / 10;
        const nexp = kind === "sphere" ? Q(3) : kind === "circle" ? Q(2) : Q(1, 2), ans = nexp.mul(Q(p10, 10)).value;
        const rr = r.int(2, 9);
        let prompt, steps;
        if (kind === "sphere") {
          prompt = `The radius of a ball bearing is measured as ${n(rr)} mm with a possible error of ${n(pc)}%. Use differentials to estimate the possible percentage error in its volume.`;
          steps = [`${M.v("V")} = ${M.frac("4", "3")}π${M.sup(M.v("r"), 3)}, so ${M.v("dV")} = 4π${M.sup(M.v("r"), 2)} ${M.v("dr")}.`,
            `Relative error: ${M.frac(M.v("dV"), M.v("V"))} = ${M.frac(`4π${M.sup(M.v("r"), 2)} ${M.v("dr")}`, `${M.frac("4", "3")}π${M.sup(M.v("r"), 3)}`)} = 3 · ${M.frac(M.v("dr"), M.v("r"))}. The radius itself (${n(rr)} mm) cancels.`,
            `${M.frac(M.v("dr"), M.v("r"))} = ${n(pc)}%, so the volume error is about 3 × ${n(pc)}% = ${n(ans)}%.`];
        } else if (kind === "circle") {
          prompt = `The radius of a circular pipe is measured as ${n(rr)} cm with a possible error of ${n(pc)}%. Use differentials to estimate the possible percentage error in its cross-sectional area.`;
          steps = [`${M.v("A")} = π${M.sup(M.v("r"), 2)}, so ${M.v("dA")} = 2π${M.v("r")} ${M.v("dr")}.`,
            `Relative error: ${M.frac(M.v("dA"), M.v("A"))} = ${M.frac(`2π${M.v("r")} ${M.v("dr")}`, `π${M.sup(M.v("r"), 2)}`)} = 2 · ${M.frac(M.v("dr"), M.v("r"))}. The radius itself (${n(rr)} cm) cancels.`,
            `${M.frac(M.v("dr"), M.v("r"))} = ${n(pc)}%, so the area error is about 2 × ${n(pc)}% = ${n(ans)}%.`];
        } else {
          prompt = `A pendulum's period is ${M.v("T")} = 2π${M.sqrt(M.frac(M.v("L"), M.v("g")))}. Its length is measured as ${n(rr)} m with a possible error of ${n(pc)}%. Use differentials to estimate the possible percentage error in the computed period.`;
          steps = [`${M.v("T")} = ${M.frac("2π", M.sqrt(M.v("g")))} ${M.sup(M.v("L"), M.frac("1", "2"))}, a constant times ${M.sup(M.v("L"), M.frac("1", "2"))}. So ${M.v("dT")} = ${M.frac("2π", M.sqrt(M.v("g")))} · ${M.frac("1", "2")}${M.sup(M.v("L"), `−${M.frac("1", "2")}`)} ${M.v("dL")}.`,
            `Relative error: ${M.frac(M.v("dT"), M.v("T"))} = ${M.frac("1", "2")} · ${M.frac(M.v("dL"), M.v("L"))}. The length itself (${n(rr)} m) cancels.`,
            `${M.frac(M.v("dL"), M.v("L"))} = ${n(pc)}%, so the period error is about ${M.frac("1", "2")} × ${n(pc)}% = ${n(ans)}%.`];
        }
        return {
          prompt, steps, answer: { kind: "number", value: ans }, answerText: `${n(ans)}%`, answerInput: String(ans),
          vals: { ans }, params: { kind, pc, rr }, consts: [3, 4],
        };
      },
    },

    // ---- C1.23 Critical points, extrema and concavity ------------------------------------------------------------------------
    "C1.12": {
      title: "Critical points and concavity",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const r1 = r.int(-4, 3), r2 = r.int(r1 + 1, 5), d = r.int(-9, 9);
            const b = -3 * (r1 + r2), c = 6 * r1 * r2, cs = [2, b, c, d], s = r1 + r2, pr = r1 * r2;
            return {
              prompt: `Find the critical points of ${M.eq(`${fx()} = ${M.poly(cs)}.`)} Enter their ${x}-values, separated by commas.`,
              steps: [
                `Critical points are where ${fpr()} = 0 or ${fpr()} does not exist. A polynomial's derivative exists everywhere, so solve ${fpr()} = 0.`,
                `${fpr()} = ${M.poly([6, 2 * b, c])} = 0. Divide by 6: ${M.poly([1, -s, pr])} = 0.`,
                `Factor: ${fac(r1)}${fac(r2)} = 0, so ${x} = ${n(r1)} or ${x} = ${n(r2)}.`,
              ],
              answer: { kind: "numbers", values: [r1, r2] }, answerText: `${x} = ${n(r1)} and ${x} = ${n(r2)}`, answerInput: `${r1}, ${r2}`,
              vals: { twoB: 2 * b, s, pr }, params: { b, c, d }, consts: [3, 6],
            };
          }
        }
        if (level === 2) {
          const a = r.nonzero(-2, 2), h = r.int(-2, 2), c = r.int(-6, 6), d = r.int(-5, 5), b = -3 * a * h;
          const cs = [a, b, c, d], fh = a * h ** 3 + b * h * h + c * h + d, [sh, eh] = subst(cs, h);
          const view = fit(h - 3, h + 3, (v) => a * v ** 3 + b * v * v + c * v + d, [fh]);
          return {
            prompt: `Find the inflection point of ${M.eq(`${fx()} = ${M.poly(cs)}.`)} Enter it as a point.`,
            graph: graph({ view, items: [{ t: "fn", e: pstr(cs) }] }),
            steps: [
              `${fpr()} = ${M.poly([3 * a, 2 * b, c])} and ${M.v("f")}″(${x}) = ${M.poly([6 * a, 2 * b])}.`,
              `${M.v("f")}″(${x}) = 0 when ${kv(6 * a)} = ${n(-2 * b)}, that is ${x} = ${n(h)}. ${M.v("f")}″ is linear with a nonzero slope, so its sign really changes there: the concavity flips.`,
              `${fx("f", n(h))} = ${chain(sh, eh, n(fh))}. The inflection point is (${n(h)}, ${n(fh)}).`,
            ],
            answer: { kind: "point", value: [h, fh] }, answerText: `(${n(h)}, ${n(fh)})`, answerInput: `(${h}, ${fh})`,
            vals: { a3: 3 * a, twoB: 2 * b, a6: 6 * a, nb2: -2 * b, h, fh, terms: subst(cs, h)[2].map((v) => v.n) }, params: { a, b, c, d }, consts: [3, 6],
          };
        }
        // level 3: read the graph of f′
        for (;;) {
          const r1 = r.int(-4, 2), r2 = r.int(r1 + 2, 5), s = r.pick([-1, -0.5, 0.5, 1]), wantMax = r.chance(0.5) ? 1 : 0;
          const ans = (s > 0) === (wantMax === 1) ? r1 : r2;
          const fq = (v) => s * (v - r1) * (v - r2), view = fit(r1 - 2, r2 + 2, fq);
          const what = wantMax ? "maximum" : "minimum";
          const signs = s > 0 ? ["positive", "negative", "positive"] : ["negative", "positive", "negative"];
          return {
            prompt: `The graph shows the derivative ${fpr()}, not ${M.v("f")} itself. At which ${x} does ${M.v("f")} have a local ${what}?`,
            graph: graph({ view, items: [{ t: "fn", e: `${s}*(x - (${r1}))*(x - (${r2}))` }, { t: "text", x: r2 + 1.2, y: fq(r2 + 1.2) + (s > 0 ? -1 : 1), s: "f′" }] }),
            steps: [
              `The graph of ${fpr()} crosses the axis at ${x} = ${n(r1)} and ${x} = ${n(r2)}: those are the critical points of ${M.v("f")}.`,
              `Reading the signs of ${fpr()}: ${signs[0]} left of ${n(r1)}, ${signs[1]} between, ${signs[2]} right of ${n(r2)}. So ${M.v("f")} ${s > 0 ? "rises, falls, then rises" : "falls, rises, then falls"}.`,
              `First-derivative test: a local maximum where ${fpr()} changes from + to −, a local minimum where it changes from − to +. The local ${what} is at ${x} = ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: `${x} = ${n(ans)}`, answerInput: String(ans),
            vals: { ans }, params: { r1, r2, s, wantMax },
          };
        }
      },
    },

    // ---- C1.24 Extreme value theorem ---------------------------------------------------------------------------------------------
    "C1.evt": {
      title: "Absolute extrema on a closed interval",
      generate(r, level) {
        const row = (cands) => M.table([x, ...cands.map((c) => n(c[0]))], [[fx(), ...cands.map((c) => n(c[1]))]]);
        if (level === 1) {
          for (;;) {
            const p = r.pick([-2, -1, 1, 2]), h = r.int(-3, 3), k = r.int(-6, 6), lo = r.int(-5, 2), hi = r.int(lo + 2, lo + 6), wantMax = r.chance(0.5) ? 1 : 0;
            const fq = (v) => p * (v - h) ** 2 + k, b = -2 * p * h, c = p * h * h + k, cs = [p, b, c];
            const inside = h > lo && h < hi, cands = inside ? [[lo, fq(lo)], [h, fq(h)], [hi, fq(hi)]] : [[lo, fq(lo)], [hi, fq(hi)]];
            const vals_ = cands.map((q) => q[1]), ans = wantMax ? Math.max(...vals_) : Math.min(...vals_);
            if (fq(lo) === fq(hi) && !inside) continue;
            const what = wantMax ? "maximum" : "minimum";
            return {
              prompt: `Find the absolute ${what} value of ${M.eq(`${fx()} = ${M.poly(cs)}`)} on the interval [${n(lo)}, ${n(hi)}].`,
              steps: [
                `${M.v("f")} is continuous on the closed interval, so the extreme value theorem guarantees the ${what}. It occurs at a critical point or an endpoint.`,
                `${fpr()} = ${M.poly([2 * p, b])} = 0 at ${x} = ${n(h)}${inside ? `, which is inside the interval.` : h === lo || h === hi ? `, an endpoint, which is a candidate anyway.` : `, which is outside the interval, so only the endpoints count.`}`,
                `Evaluate the candidates: ${row(cands)}`,
                `The ${wantMax ? "largest" : "smallest"} value is ${n(ans)}.`,
              ],
              answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
              vals: { twoP: 2 * p, h, cv: vals_, ans }, params: { p, b, c, lo, hi, wantMax },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const r1 = r.int(-3, 2), r2 = r.int(r1 + 1, 3), d = r.int(-6, 6), b = -3 * (r1 + r2), c = 6 * r1 * r2, cs = [2, b, c, d];
            const lo = r.int(r1 - 2, r1), hi = r.int(Math.max(r2, lo + 2), r2 + 2);
            const fq = (v) => 2 * v ** 3 + b * v * v + c * v + d;
            const crit = [r1, r2].filter((v) => v > lo && v < hi);
            const xs = [lo, ...crit, hi], cands = xs.map((v) => [v, fq(v)]), vs = cands.map((q) => q[1]);
            const mn = Math.min(...vs), mx = Math.max(...vs);
            return {
              prompt: `Find the absolute minimum and maximum values of ${M.eq(`${fx()} = ${M.poly(cs)}`)} on [${n(lo)}, ${n(hi)}]. Enter the minimum, then the maximum.`,
              steps: [
                `${fpr()} = ${M.poly([6, 2 * b, c])} = 6(${M.poly([1, -(r1 + r2), r1 * r2])}) = 6${fac(r1)}${fac(r2)}, so the critical points are ${x} = ${n(r1)} and ${x} = ${n(r2)}.`,
                crit.length === 2 ? `Both lie inside (${n(lo)}, ${n(hi)}).` : crit.length === 1 ? `Only ${x} = ${n(crit[0])} lies inside (${n(lo)}, ${n(hi)}).` : `Neither lies inside (${n(lo)}, ${n(hi)}).`,
                `Evaluate ${M.v("f")} at the endpoints and the critical points inside: ${row(cands)}`,
                `The smallest value is ${n(mn)} and the largest is ${n(mx)}.`,
              ],
              answer: { kind: "numbers", values: [mn, mx], ordered: true }, answerText: `minimum ${n(mn)}, maximum ${n(mx)}`, answerInput: `${mn}, ${mx}`,
              vals: { twoB: 2 * b, s: r1 + r2, pr: r1 * r2, r1, r2, vs, mn, mx }, params: { b, c, d, lo, hi }, consts: [3, 6],
            };
          }
        }
        // level 3: the peak concentration of a drug over a time window
        for (;;) {
          const k = r.int(1, 4), A = 2 * k * r.int(2, 8), t1 = r.int(0, k + 1), t2 = r.int(Math.max(t1 + 1, k - 1), 3 * k + 2);
          if (t1 === k || t2 === k) continue;
          const C = (v) => Q(A * v, v * v + k * k), kk = k * k;
          const inside = k > t1 && k < t2, xs = inside ? [t1, k, t2] : [t1, t2], cv = xs.map(C);
          const best = cv.reduce((m, q) => (q.cmp(m) > 0 ? q : m)), at = xs[cv.findIndex((q) => q.eq(best))];
          const Cc = M.v("C");
          return {
            prompt: `The concentration of a drug in the blood ${t} hours after an injection is ${M.eq(`${Cc}(${t}) = ${M.frac(`${n(A)}${t}`, `${M.sup(t, 2)} + ${n(kk)}`)}`)} mg/L. What is the highest concentration between ${t} = ${n(t1)} and ${t} = ${n(t2)} hours, in mg/L?`,
            steps: [
              `Quotient rule: ${Cc}′(${t}) = ${M.frac(`${n(A)}(${M.sup(t, 2)} + ${n(kk)}) − ${n(A)}${t} · 2${t}`, M.sup(`(${M.sup(t, 2)} + ${n(kk)})`, 2))} = ${M.frac(`${n(A)}(${n(kk)} − ${M.sup(t, 2)})`, M.sup(`(${M.sup(t, 2)} + ${n(kk)})`, 2))}.`,
              `${Cc}′(${t}) = 0 when ${M.sup(t, 2)} = ${n(kk)}, so ${t} = ${n(k)} (time is positive)${inside ? ", inside the window." : `, outside [${n(t1)}, ${n(t2)}]: only the endpoints count.`}`,
              `${Cc} is continuous on the closed interval, so compare the candidates: ${M.table([t, ...xs.map(n)], [[`${Cc}(${t})`, ...cv.map(f)]])}`,
              `The highest concentration is ${f(best)} mg/L, at ${t} = ${n(at)} h.`,
            ],
            answer: { kind: "number", value: best.value }, answerText: `${f(best)} mg/L`, answerInput: typed(best),
            vals: { kk, k, cv: cv.map(fv), best: fv(best), at }, params: { A, k, t1, t2 },
          };
        }
      },
    },

    // ---- C1.25 Curve sketching -------------------------------------------------------------------------------------------------
    "C1.curve-sketching": {
      title: "Curve sketching with the derivative tests",
      generate(r, level) {
        if (level === 1) {
          const r1 = r.int(-4, 2), r2 = r.int(r1 + 1, 4), sg = r.pick([1, -1]), d = r.int(-6, 6);
          const b = -3 * (r1 + r2) * sg, c = 6 * r1 * r2 * sg, cs = [2 * sg, b, c, d];
          const word = sg > 0 ? "decreasing" : "increasing";
          const fp1 = (v) => Q(6 * sg).mul(Frac.of(v).sub(r1)).mul(Frac.of(v).sub(r2));
          const tl = r1 - 1, tm = Q(r1 + r2, 2), tr = r2 + 1, vl = fp1(tl), vm = fp1(tm), vr = fp1(tr);
          return {
            prompt: `On which interval is ${M.eq(`${fx()} = ${M.poly(cs)}`)} ${word}? The answer has the form (${M.v("a")}, ${M.v("b")}); enter ${M.v("a")}, ${M.v("b")}.`,
            steps: [
              `${fpr()} = ${M.poly([6 * sg, 2 * b, c])} = ${n(6 * sg)}${fac(r1)}${fac(r2)}, which is 0 at ${x} = ${n(r1)} and ${x} = ${n(r2)}.`,
              `Sign chart, one test point per interval: ${fpr(n(tl))} = ${n(vl.value)}, ${fpr(n(tm.value))} = ${n(vm.value)}, ${fpr(n(tr))} = ${n(vr.value)}.`,
              `${fpr()} &lt; 0 only between the critical points, ${sg > 0 ? "so" : "and"} ${M.v("f")} is ${sg > 0 ? "decreasing on" : "decreasing outside it, increasing on"} (${n(r1)}, ${n(r2)}).`,
            ].map((st_, i) => (i === 2 && sg < 0 ? `${fpr()} &gt; 0 only between the critical points, so ${M.v("f")} is increasing on (${n(r1)}, ${n(r2)}).` : st_)),
            answer: { kind: "numbers", values: [r1, r2], ordered: true }, answerText: `(${n(r1)}, ${n(r2)})`, answerInput: `${r1}, ${r2}`,
            vals: { six: 6 * sg, twoB: 2 * b, tl, tm: tm.value, tr, vl: vl.value, vm: vm.value, vr: vr.value }, params: { sg, b, c, d }, consts: [3],
          };
        }
        if (level === 2) {
          // f = s(x⁴ − 4a x³) + c: the second-derivative test fails at 0, the first-derivative test does not
          const a = r.pick([-2, -1, 1, 2]), s = r.pick([1, -1]), cc = r.int(-5, 5), at0 = r.chance(0.5) ? 1 : 0, a3 = 3 * a;
          const cs = [s, -4 * a * s, 0, 0, cc], pt = at0 ? 0 : a3;
          const f2 = s * (12 * pt * pt - 24 * a * pt);
          const options = ["a local maximum", "a local minimum", "neither"];
          const idx = at0 ? 2 : s > 0 ? 1 : 0;
          const sgnL = (v) => (v > 0 ? "+" : "−");
          const left0 = s * (-a3), right0 = s * (-a3); // sign of 4s·x²(x − 3a) just beside 0 is sign of s(−3a)
          const steps = [
            `${fpr()} = ${M.poly([4 * s, -12 * a * s, 0, 0])} = ${n(4 * s)}${M.sup(x, 2)}${fac(a3)}, so the critical points are ${x} = 0 and ${x} = ${n(a3)}.`,
            `${M.v("f")}″(${x}) = ${M.poly([12 * s, -24 * a * s, 0])}, and ${M.v("f")}″(${n(pt)}) = ${n(f2)}.`,
          ];
          if (at0) {
            steps.push(`${M.v("f")}″(0) = 0, so the second-derivative test says nothing. Use the first-derivative test: ${M.sup(x, 2)} ≥ 0 on both sides of 0, so near 0 the sign of ${fpr()} is the sign of ${n(4 * s)}${fac(a3)} at ${x} = 0, which is ${sgnL(left0)} on both sides.`);
            steps.push(`${fpr()} does not change sign at 0, so ${M.v("f")} has neither a maximum nor a minimum there (a flat spot on the way ${left0 > 0 ? "up" : "down"}).`);
          } else {
            steps.push(`${M.v("f")}″(${n(pt)}) ${f2 > 0 ? "&gt;" : "&lt;"} 0, so ${M.v("f")} is concave ${f2 > 0 ? "up" : "down"} there: by the second-derivative test, ${options[idx]}.`);
          }
          return {
            prompt: `Let ${M.eq(`${fx()} = ${M.poly(cs)}.`)} What does ${M.v("f")} have at its critical point ${x} = ${n(pt)}?`,
            steps, answer: { kind: "choice", options, index: idx }, answerText: options[idx],
            vals: { a3, f2, s4: 4 * s, s12: 12 * s, as12: -12 * a * s, as24: -24 * a * s, as4: -4 * a * s }, params: { a, s, cc, at0 }, consts: [3, 4],
          };
        }
        // level 3: read the signs of f′ and f″ from a graph
        const h = r.int(-2, 2), v = r.int(-2, 2), c = r.pick([-0.5, 0.5]);
        const us = [-3, -1, 1, 3], letters = r.shuffle(["A", "B", "C", "D"]);
        const fq = (xx) => v + c * ((xx - h) ** 3 - 12 * (xx - h));
        const sp1 = us.map((u_) => Math.sign(c * (3 * u_ * u_ - 12))), sp2 = us.map((u_) => Math.sign(c * u_));
        const want = r.int(0, 3), ws1 = sp1[want], ws2 = sp2[want];
        const options = ["A", "B", "C", "D"], index = options.indexOf(letters[want]);
        const desc = (i) => `${letters[i]}: ${sp1[i] > 0 ? "rising" : "falling"} (${fpr()} ${sp1[i] > 0 ? "&gt;" : "&lt;"} 0), concave ${sp2[i] > 0 ? "up" : "down"} (${M.v("f")}″ ${sp2[i] > 0 ? "&gt;" : "&lt;"} 0)`;
        const order = [0, 1, 2, 3].sort((i, j) => letters[i].localeCompare(letters[j]));
        return {
          prompt: `At which labeled point of the graph of ${M.v("f")} is ${fpr()} ${ws1 > 0 ? "&gt;" : "&lt;"} 0 and ${M.v("f")}″(${x}) ${ws2 > 0 ? "&gt;" : "&lt;"} 0?`,
          graph: graph({ view: [h - 4.5, h + 4.5, v - 10, v + 10], items: [{ t: "fn", e: `${v} + ${c}*((x - (${h}))^3 - 12*(x - (${h})))` },
            ...us.map((u_, i) => ({ t: "pt", x: h + u_, y: fq(h + u_), label: letters[i] }))] }),
          steps: [
            `${fpr()} &gt; 0 means the graph is rising, &lt; 0 falling. ${M.v("f")}″ &gt; 0 means it is concave up (bending like a cup), &lt; 0 concave down.`,
            `Read each point: ${order.map(desc).join("; ")}.`,
            `So the point that is ${ws1 > 0 ? "rising" : "falling"} and concave ${ws2 > 0 ? "up" : "down"} is ${letters[want]}.`,
          ],
          answer: { kind: "choice", options, index }, answerText: letters[want],
          vals: {}, params: { h, v, c, want, letters },
        };
      },
    },

    // ---- C1.26 Optimization and gradient descent -------------------------------------------------------------------------------------
    "C1.13": {
      title: "Optimization and gradient descent",
      generate(r, level) {
        if (level === 1) {
          const a = r.pick([1, 2]), m = r.int(-5, 5), x0 = r.intExcept(-6, 6, m), eta = a === 1 ? r.pick([Q(1, 10), Q(1, 4)]) : r.pick([Q(1, 10), Q(1, 20)]);
          const g = (v) => Q(2 * a).mul(v.sub(m)), X0 = Q(x0), g0 = g(X0), X1 = X0.sub(eta.mul(g0)), g1 = g(X1), X2 = X1.sub(eta.mul(g1));
          const xs = (i) => M.sub(x, i), etaT = M.v("η");
          return {
            prompt: `Run two steps of gradient descent on ${M.eq(`${fx()} = ${pdot(a, M.sup(`(${M.poly([1, -m])})`, 2))}`)} with learning rate ${etaT} = ${n(eta.value)}, starting from ${xs(0)} = ${n(x0)}. What is ${xs(2)}?`,
            steps: [
              `The update is ${xs(`${M.v("k")}+1`)} = ${xs(M.v("k"))} − ${etaT} ${fpr(xs(M.v("k")))}, with ${fpr()} = ${n(2 * a)}(${M.poly([1, -m])}).`,
              `Step 1: ${fpr(n(x0))} = ${n(2 * a)}(${n(x0)} − ${np(m)}) = ${n(g0.value)}, so ${xs(1)} = ${n(x0)} − ${n(eta.value)} · ${np(g0.value)} = ${n(X1.value)}.`,
              `Step 2: ${fpr(n(X1.value))} = ${n(2 * a)}(${n(X1.value)} − ${np(m)}) = ${n(g1.value)}, so ${xs(2)} = ${n(X1.value)} − ${n(eta.value)} · ${np(g1.value)} = ${n(X2.value)}.`,
              `Each step moves toward the minimum at ${x} = ${n(m)}, and the steps shrink as the slope flattens.`,
            ],
            answer: { kind: "number", value: X2.value }, answerText: n(X2.value), answerInput: String(X2.value),
            vals: { a2: 2 * a, g0: g0.value, x1: X1.value, g1: g1.value, x2: X2.value }, params: { a, m, x0, eta: eta.value },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const L = r.pick([40, 80, 100, 120, 160, 200, 240, 400]), xs = L / 4, len = L - 2 * xs, area = xs * len;
            const A = M.v("A");
            return {
              prompt: `A farmer has ${n(L)} m of fence to enclose a rectangular field along a straight river; no fence is needed along the river. What is the largest area she can enclose, in m²?`,
              steps: [
                `Let ${x} be the length of each side perpendicular to the river. The side parallel to the river is then ${n(L)} − 2${x}, so ${A}(${x}) = ${x}(${n(L)} − 2${x}) = ${n(L)}${x} − 2${M.sup(x, 2)}, for 0 &lt; ${x} &lt; ${n(L / 2)}.`,
                `${A}′(${x}) = ${n(L)} − 4${x} = 0 gives ${x} = ${n(xs)}. ${A}″ = −4 &lt; 0, so it is a maximum (the only critical point).`,
                `The sides are ${n(xs)} m and ${n(L)} − 2 · ${n(xs)} = ${n(len)} m, so the area is ${n(xs)} · ${n(len)} = ${n(area)} m².`,
              ],
              answer: { kind: "number", value: area }, answerText: `${n(area)} m²`, answerInput: String(area),
              vals: { half: L / 2, xs, len, area }, params: { kind: "river", L }, consts: [4],
            };
          }
          const s = r.pick([5, 10, 15, 20, 30]), A0 = 2 * s * s, fence = 4 * s, other = A0 / s;
          return {
            prompt: `A rectangular pen of area ${n(A0)} m² is built against a long barn wall, so only three sides need fencing. What is the least amount of fence needed, in meters?`,
            steps: [
              `Let ${x} be each side perpendicular to the wall; the side parallel to it is ${M.frac(n(A0), x)}. Fence: ${M.v("F")}(${x}) = 2${x} + ${M.frac(n(A0), x)}, for ${x} &gt; 0.`,
              `${M.v("F")}′(${x}) = 2 − ${M.frac(n(A0), M.sup(x, 2))} = 0 gives ${M.sup(x, 2)} = ${n(A0 / 2)}, so ${x} = ${n(s)}. ${M.v("F")}″(${x}) = ${M.frac(n(2 * A0), M.sup(x, 3))} &gt; 0: a minimum (the only critical point).`,
              `The sides are ${n(s)} m and ${M.frac(n(A0), n(s))} = ${n(other)} m, so the fence is 2 · ${n(s)} + ${n(other)} = ${n(fence)} m.`,
            ],
            answer: { kind: "number", value: fence }, answerText: `${n(fence)} m`, answerInput: String(fence),
            vals: { s, ss: A0 / 2, A2: 2 * A0, other, fence }, params: { kind: "wall", A0 }, consts: [3],
          };
        }
        // level 3: the open box
        const S = r.pick([12, 18, 24, 30, 36, 48]), xs = S / 6, base = S - 2 * xs, vol = xs * base * base, S2 = S / 2;
        const V = M.v("V");
        return {
          prompt: `An open box is made from a ${n(S)} cm by ${n(S)} cm square of cardboard by cutting equal squares from the corners and folding up the sides. What is the largest possible volume, in cm³?`,
          steps: [
            `Cut squares of side ${x}. The base is ${n(S)} − 2${x} on each side and the height is ${x}: ${V}(${x}) = ${x}${M.sup(`(${n(S)} − 2${x})`, 2)}, for 0 &lt; ${x} &lt; ${n(S2)}.`,
            `Product and chain rules: ${V}′(${x}) = ${M.sup(`(${n(S)} − 2${x})`, 2)} + ${x} · 2(${n(S)} − 2${x})(−2) = (${n(S)} − 2${x})(${n(S)} − 2${x} − 4${x}) = (${n(S)} − 2${x})(${n(S)} − 6${x}).`,
            `${V}′ = 0 at ${x} = ${n(S2)} (no box) or ${x} = ${n(xs)}. ${V} is 0 at both ends of [0, ${n(S2)}] and positive between, so ${x} = ${n(xs)} gives the maximum.`,
            `${V}(${n(xs)}) = ${n(xs)} · ${M.sup(`(${n(S)} − ${n(2 * xs)})`, 2)} = ${n(xs)} · ${M.sup(n(base), 2)} = ${n(vol)} cm³.`,
          ],
          answer: { kind: "number", value: vol }, answerText: `${n(vol)} cm³`, answerInput: String(vol),
          vals: { S2, xs, x2: 2 * xs, base, vol }, params: { S }, consts: [3, 4, 6],
        };
      },
    },

    // ---- C1.27 Mean value theorem ------------------------------------------------------------------------------------------------
    "C1.14": {
      title: "The mean value theorem",
      generate(r, level) {
        if (level === 1) {
          const p = r.nonzero(-3, 3), q = r.int(-6, 6), a = r.int(-4, 2), b = r.int(a + 1, a + 5);
          const fq = (v) => p * v * v + q * v, fa = fq(a), fb = fq(b), avg = Q(fb - fa, b - a), c = Q(a + b, 2);
          const view = fit(a - 1, b + 1, fq, [fa, fb]);
          return {
            prompt: `Find the number ${M.v("c")} that the mean value theorem promises for ${M.eq(`${fx()} = ${M.poly([p, q, 0])}`)} on [${n(a)}, ${n(b)}].`,
            graph: graph({ view, items: [{ t: "fn", e: `${p}*x^2 + (${q})*x` }, { t: "seg", a: [a, fa], b: [b, fb], role: "secondary", dash: true }, { t: "pt", x: a, y: fa }, { t: "pt", x: b, y: fb }] }),
            steps: [
              `${M.v("f")} is a polynomial, so it is continuous on [${n(a)}, ${n(b)}] and differentiable inside: the theorem applies.`,
              `Average rate: ${M.frac(`${fx("f", n(b))} − ${fx("f", n(a))}`, `${n(b)} − ${np(a)}`)} = ${M.frac(`${n(fb)} − ${np(fa)}`, n(b - a))} = ${f(avg)}.`,
              `${fpr(M.v("c"))} = ${n(2 * p)}${M.v("c")}${st(q)} = ${f(avg)}, so ${M.v("c")} = ${M.frac(`${f(avg)}${st(-q)}`, n(2 * p))} = ${f(c)}: the tangent there is parallel to the secant.`,
            ],
            answer: { kind: "number", value: c.value }, answerText: `${M.v("c")} = ${f(c)}`, answerInput: typed(c),
            vals: { fa, fb, ba: b - a, avg: fv(avg), p2: 2 * p, c: fv(c) }, params: { p, q, a, b },
          };
        }
        if (level === 2) {
          const p = r.int(-6, 6), b = r.int(1, 6), bb = b * b, fb = b ** 3 + p * b, avg = bb + p, cq = Q(b, 3), cval = b / Math.sqrt(3);
          const cT = `${cq.d === 1 ? (cq.n === 1 ? "" : n(cq.n)) : ""}${M.sqrt("3")}`, ansTxt = cq.d === 1 ? cT : M.frac(`${b === 1 ? "" : n(b)}${M.sqrt("3")}`, "3");
          const view = fit(-0.5, b + 0.5, (v) => v ** 3 + p * v, [0, fb]);
          return {
            prompt: `Find the number ${M.v("c")} in (0, ${n(b)}) that the mean value theorem promises for ${M.eq(`${fx()} = ${M.poly([1, 0, p, 0])}`)} on [0, ${n(b)}]. Give the exact value.`,
            graph: graph({ view, items: [{ t: "fn", e: `x^3 + (${p})*x` }, { t: "seg", a: [0, 0], b: [b, fb], role: "secondary", dash: true }, { t: "pt", x: 0, y: 0 }, { t: "pt", x: b, y: fb }] }),
            steps: [
              `Average rate: ${M.frac(`${fx("f", n(b))} − ${fx("f", "0")}`, `${n(b)} − 0`)} = ${M.frac(`${n(fb)} − 0`, n(b))} = ${n(avg)}.`,
              `${fpr(M.v("c"))} = 3${M.sup(M.v("c"), 2)}${st(p)} = ${n(avg)}, so 3${M.sup(M.v("c"), 2)} = ${n(bb)} and ${M.sup(M.v("c"), 2)} = ${M.frac(n(bb), "3")}.`,
              `${M.v("c")} = ${M.frac(n(b), M.sqrt("3"))} = ${ansTxt} ≈ ${n(cval)} (the negative root is outside the interval).`,
            ],
            answer: { kind: "number", value: cval }, answerText: `${M.v("c")} = ${ansTxt}`, answerInput: `${b}sqrt(3)/3`,
            vals: { bb, fb, avg, cv: cval, cq: fv(cq) }, params: { p, b }, consts: [3],
          };
        }
        if (r.chance(0.5)) {
          for (;;) {
            const D = r.pick([8, 10, 12, 15, 18, 20, 24]), T = r.pick([5, 6, 8, 9, 10, 12]), avg = (60 * D) / T;
            if (!Number.isInteger(avg) || avg <= 100) continue;
            return {
              prompt: `Two speed cameras ${n(D)} km apart on a highway record a car ${n(T)} minutes apart. The speed limit is 100 km/h. What speed does the mean value theorem say the car must have reached at some moment, in km/h?`,
              steps: [
                `The car's position changes smoothly (differentiably) with time, so the mean value theorem applies: at some moment the instantaneous speed equals the average speed.`,
                `${n(T)} minutes = ${M.frac(n(T), "60")} h, so the average speed is ${n(D)} ÷ ${M.frac(n(T), "60")} = ${M.frac(`${n(D)} · 60`, n(T))} = ${n(avg)} km/h.`,
                `So the car was going exactly ${n(avg)} km/h at some instant: over the limit, even if no one saw it.`,
              ],
              answer: { kind: "number", value: avg }, answerText: `${n(avg)} km/h`, answerInput: String(avg),
              vals: { avg }, params: { kind: "trap", D, T }, consts: [60, 100],
            };
          }
        }
        const a = r.int(-2, 3), b = r.int(a + 1, a + 6), y0 = r.int(-9, 9), Mx = r.int(1, 6), ans = y0 + Mx * (b - a);
        return {
          prompt: `${M.v("f")} is differentiable everywhere, ${fx("f", n(a))} = ${n(y0)}, and ${fpr()} ≤ ${n(Mx)} for all ${x}. What is the largest possible value of ${fx("f", n(b))}?`,
          steps: [
            `Mean value theorem on [${n(a)}, ${n(b)}]: ${M.frac(`${fx("f", n(b))} − ${fx("f", n(a))}`, `${n(b)} − ${np(a)}`)} = ${fpr(M.v("c"))} for some ${M.v("c")} in between.`,
            `Since ${fpr(M.v("c"))} ≤ ${n(Mx)}: ${fx("f", n(b))} − ${np(y0)} ≤ ${n(Mx)} · ${n(b - a)} = ${n(Mx * (b - a))}.`,
            `So ${fx("f", n(b))} ≤ ${n(y0)} + ${n(Mx * (b - a))} = ${n(ans)}. The bound is reached by the line with slope ${n(Mx)}, so it is the largest possible value.`,
          ],
          answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
          vals: { ba: b - a, rise: Mx * (b - a), ans }, params: { kind: "bound", a, b, y0, Mx },
        };
      },
    },

    // ---- C1.28 L'Hôpital's rule -------------------------------------------------------------------------------------------------
    "C1.15": {
      title: "L'Hôpital's rule",
      generate(r, level) {
        const e = (k, v = x) => M.sup("e", kv(k, v));
        if (level === 1) {
          const a = r.nonzero(-6, 6), b = r.int(2, 7), kind = r.pick(["exp", "ln"]), ans = Q(a, b);
          const top = kind === "exp" ? `${e(a)} − 1` : `ln(1${vt(a)})`, dtop = kind === "exp" ? `${n(a)}${e(a)}` : M.frac(n(a), `1${vt(a)}`);
          return {
            prompt: `Use L'Hôpital's rule to find ${M.eq(`${lim("0")}${M.frac(top, `sin(${kv(b)})`)}`)}`,
            steps: [
              `At ${x} = 0 the top is ${kind === "exp" ? "1 − 1" : "ln 1"} = 0 and the bottom is sin 0 = 0: the form 0/0, so L'Hôpital's rule applies.`,
              `Differentiate the top and the bottom separately: the top gives ${dtop}, the bottom gives ${n(b)} cos(${kv(b)}).`,
              `${lim("0")}${M.frac(dtop, `${n(b)} cos(${kv(b)})`)} = ${M.frac(n(a), `${n(b)} · 1`)} = ${f(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { ans: fv(ans) }, params: { kind, a, b },
          };
        }
        if (level === 2) {
          const a = r.int(1, 6), b = r.int(1, 6), kind = r.pick(["exp", "cos"]), aa = a * a, b2 = 2 * b, ans = Q(aa, b2);
          const bot = `${b === 1 ? "" : n(b)}${M.sup(x, 2)}`;
          const steps = kind === "exp" ? [
            `At ${x} = 0: top ${M.sup("e", "0")} − 1 − 0 = 0, bottom 0. The form 0/0.`,
            `First application: ${M.frac(`${n(a)}${e(a)} − ${n(a)}`, `${n(b2)}${x}`)}. At 0 this is still 0/0.`,
            `Second application: ${M.frac(`${n(aa)}${e(a)}`, n(b2))}.`,
            `At ${x} = 0: ${M.frac(n(aa), n(b2))}${ans.d !== b2 ? ` = ${f(ans)}` : ""}.`,
          ] : [
            `At ${x} = 0: top 1 − cos 0 = 0, bottom 0. The form 0/0.`,
            `First application: ${M.frac(`${n(a)} sin(${kv(a)})`, `${n(b2)}${x}`)}. At 0 this is still 0/0.`,
            `Second application: ${M.frac(`${n(aa)} cos(${kv(a)})`, n(b2))}.`,
            `At ${x} = 0: ${M.frac(n(aa), n(b2))}${ans.d !== b2 ? ` = ${f(ans)}` : ""}.`,
          ];
          const top = kind === "exp" ? `${e(a)} − 1 − ${kv(a)}` : `1 − cos(${kv(a)})`;
          return {
            prompt: `Use L'Hôpital's rule (twice) to find ${M.eq(`${lim("0")}${M.frac(top, bot)}`)}`,
            steps, answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { aa, b2, ans: fv(ans) }, params: { kind, a, b },
          };
        }
        // level 3: a 0 · ∞ form, rewritten as a quotient first
        const kind = r.pick(["sin", "ln", "exp"]), a = r.int(1, 6), c = r.int(1, 5), ca = c * a;
        const inner = kind === "sin" ? `sin(${M.frac(n(a), x)})` : kind === "ln" ? `ln(1 + ${M.frac(n(a), x)})` : `(${M.sup("e", M.frac(n(a), x))} − 1)`;
        const innerQ = kind === "exp" ? `${M.sup("e", M.frac(n(a), x))} − 1` : inner;
        const dInner = kind === "sin" ? `cos(${M.frac(n(a), x)}) · (−${M.frac(n(a), M.sup(x, 2))})` : kind === "ln" ? `${M.frac("1", `1 + ${M.frac(n(a), x)}`)} · (−${M.frac(n(a), M.sup(x, 2))})` : `${M.sup("e", M.frac(n(a), x))} · (−${M.frac(n(a), M.sup(x, 2))})`;
        const after = kind === "sin" ? `${a === 1 ? "" : `${n(a)} `}cos(${M.frac(n(a), x)})` : kind === "ln" ? M.frac(n(a), `1 + ${M.frac(n(a), x)}`) : `${a === 1 ? "" : n(a)}${M.sup("e", M.frac(n(a), x))}`;
        return {
          prompt: `Find ${M.eq(`${lim(inf)}${c === 1 ? "" : n(c)}${x} ${inner}`)}`,
          steps: [
            `As ${x} → ${inf}, ${M.frac(n(a), x)} → 0, so ${innerQ} → 0 while ${x} → ${inf}: the form ${inf} · 0. Rewrite it as a quotient: ${c === 1 ? "" : `${n(c)} · `}${M.frac(innerQ, M.frac("1", x))}, a 0/0 form.`,
            `L'Hôpital: the top's derivative is ${dInner} (chain rule); the bottom's is −${M.frac("1", M.sup(x, 2))}.`,
            `Their ratio: the factors −${M.frac("1", M.sup(x, 2))} cancel, leaving ${after}.`,
            `As ${x} → ${inf}, ${M.frac(n(a), x)} → 0: ${c === 1 ? "" : `${n(c)} · `}${n(a)} = ${n(ca)}.`,
          ],
          answer: { kind: "number", value: ca }, answerText: n(ca), answerInput: String(ca),
          vals: { ca }, params: { kind, a, c },
        };
      },
    },
    // ---- C1.29 Antiderivatives -------------------------------------------------------------------------------------------------
    "C1.16": {
      title: "Antiderivatives",
      generate(r, level) {
        const dxT = `${M.v("d")}${x}`, C = M.v("C");
        if (level === 1) {
          const deg = r.int(2, 3), anti = [];
          for (let i = 0; i <= deg; i++) anti.push(i === 0 ? r.nonzero(-4, 4) : r.int(-5, 5));
          // anti: coefficients of x^(deg+1) … x^1; the integrand is its derivative
          const F = [...anti, 0], integrand = pder(F).map((q) => q.n);
          const parts = integrand.map((c, i) => {
            const k = deg - i;
            if (c === 0) return "";
            return k === 0 ? `${n(c)} → ${kv(c)}` : `${kv(c, xp(k))} → ${n(c)} · ${M.frac(xp(k + 1), n(k + 1))} = ${kv(anti[i], xp(k + 1))}`;
          }).filter(Boolean);
          return {
            prompt: `Find ${M.eq(`∫ (${M.poly(integrand)}) ${dxT}`)} Enter the antiderivative without the + ${C}.`,
            steps: [
              `Integrate term by term with the power rule, ∫ ${M.sup(x, M.v("n"))} ${dxT} = ${M.frac(M.sup(x, `${M.v("n")} + 1`), `${M.v("n")} + 1`)}: raise the power by one and divide by the new power.`,
              `${parts.join("; ")}.`,
              `So the integral is ${M.poly(F)} + ${C}. Check: differentiating gives back ${M.poly(integrand)}.`,
            ],
            answer: { kind: "expr", expr: pstr(F), vars: ["x"] }, answerText: `${M.poly(F)} + ${C}`, answerInput: plain(F),
            vals: { integrand, anti }, params: { integrand }, consts: [3, 4],
          };
        }
        if (level === 2) {
          const a = r.nonzero(-6, 6), b = r.nonzero(-6, 6), c = r.nonzero(-6, 6), d = r.nonzero(-6, 6);
          const ex = M.sup("e", x), res = `${ft(a, `ln |${x}|`, true)}${ft(b, ex)}${ft(c, `sin ${x}`)}${ft(-d, `cos ${x}`)}`;
          return {
            prompt: `Find ${M.eq(`∫ (${M.frac(n(a), x)}${ft(b, ex)}${ft(c, `cos ${x}`)}${ft(d, `sin ${x}`)}) ${dxT}`)} Enter the antiderivative without the + ${C}.`,
            steps: [
              `Each term is a derivative read backward: ∫ ${M.frac("1", x)} ${dxT} = ln |${x}|, ∫ ${ex} ${dxT} = ${ex}, ∫ cos ${x} ${dxT} = sin ${x}, ∫ sin ${x} ${dxT} = −cos ${x}.`,
              `Keep the constant factors: ${res} + ${C}. (Check: the derivative of −cos ${x} is sin ${x}.)`,
            ],
            answer: { kind: "expr", expr: `${a}*ln(abs(x)) + (${b})*exp(x) + (${c})*sin(x) + (${-d})*cos(x)`, vars: ["x"] }, answerText: `${res} + ${C}`,
            answerInput: `${a}ln|x| + ${b}e^x + ${c}sin(x) + ${-d}cos(x)`.replace(/\+ -/g, "- "),
            vals: {}, params: { a, b, c, d },
          };
        }
        // level 3: total cost from a marginal cost (an initial value problem)
        const m = r.pick([20, 30, 40, 50, 60]), k2 = r.pick([0.02, 0.04, 0.05, 0.1]), F0 = r.pick([500, 1000, 1500, 2000, 5000]), Qn = r.pick([50, 100, 150, 200]);
        const k = k2 / 2, mQ = m * Qn, kQ2 = Math.round(k * Qn * Qn * 1e6) / 1e6, ans = F0 + mQ - kQ2;
        const Cc = M.v("C");
        return {
          prompt: `A workshop's marginal cost is ${Cc}′(${x}) = ${n(m)} − ${n(k2)}${x} dollars per unit when it makes ${x} units, and its fixed cost (the cost of making nothing) is ${P.money(F0)}. What is the total cost of making ${n(Qn)} units?`,
          steps: [
            `Antidifferentiate: ${Cc}(${x}) = ${n(m)}${x} − ${n(k2)} · ${M.frac(M.sup(x, 2), "2")} + ${M.v("K")} = ${n(m)}${x} − ${n(k)}${M.sup(x, 2)} + ${M.v("K")}.`,
            `The fixed cost fixes the constant: ${Cc}(0) = ${M.v("K")} = ${n(F0)}.`,
            `${Cc}(${n(Qn)}) = ${n(m)} · ${n(Qn)} − ${n(k)} · ${M.sup(n(Qn), 2)} + ${n(F0)} = ${n(mQ)} − ${n(kQ2)} + ${n(F0)} = ${n(ans)} dollars.`,
          ],
          answer: { kind: "number", value: ans }, answerText: P.money(ans), answerInput: String(ans),
          vals: { k, mQ, kQ2, ans }, params: { m, k2, F0, Qn },
        };
      },
    },

    // ---- C1.30 Riemann sums ----------------------------------------------------------------------------------------------------
    "C1.17": {
      title: "Riemann sums",
      generate(r, level) {
        if (level === 1) {
          const c = r.int(0, 4), a = r.int(-1, 1), nn = 4, side = r.pick(["left", "right"]), sg = r.pick([1, -1]);
          const fq = (v) => sg * v * v + (sg < 0 ? 12 : c);
          const cc = sg < 0 ? 12 : c, cs = [sg, 0, cc];
          const xs = side === "left" ? [a, a + 1, a + 2, a + 3] : [a + 1, a + 2, a + 3, a + 4], ys = xs.map(fq), total = ys.reduce((s2, v) => s2 + v, 0);
          const rects = xs.map((xx, i) => ({ t: "poly", p: [[a + i, 0], [a + i + 1, 0], [a + i + 1, ys[i]], [a + i, ys[i]]], role: "secondary" }));
          const view = fit(a - 1, a + 5, fq, [0, ...ys]);
          return {
            prompt: `Estimate ${M.eq(`∫${M.sub("", n(a))}<sup>${n(a + 4)}</sup> (${M.poly(cs)}) ${M.v("d")}${x}`)} with a ${side} Riemann sum of ${n(nn)} rectangles (shown).`,
            graph: graph({ view, items: [...rects, { t: "fn", e: `${sg}*x^2 + (${cc})` }] }),
            steps: [
              `Width: Δ${x} = ${M.frac(`${n(a + 4)} − ${np(a)}`, n(nn))} = 1. The ${side} endpoints of the four subintervals are ${xs.map(n).join(", ")}.`,
              `Heights: ${xs.map((xx, i) => `${fx("f", n(xx))} = ${n(ys[i])}`).join(", ")}.`,
              `Sum of the areas: (${ys.map(n).join(" + ").replace(/\+ −/g, "− ")}) · 1 = ${n(total)}.`,
            ],
            answer: { kind: "number", value: total }, answerText: n(total), answerInput: String(total),
            vals: { b: a + 4, xs, ys, total }, params: { sg, cc, a, nn, side }, consts: [3, 4],
          };
        }
        if (level === 2) {
          const dt = r.pick([5, 10]), side = r.pick(["left", "right"]);
          const v0 = r.int(0, 10), vs = [v0];
          for (let i = 1; i <= 4; i++) vs.push(vs[i - 1] + r.int(1, 6));
          const ts = [0, 1, 2, 3, 4].map((i) => i * dt), used = side === "left" ? vs.slice(0, 4) : vs.slice(1), sum = used.reduce((s2, v) => s2 + v, 0), dist = sum * dt;
          return {
            prompt: `A car speeds up along a road; its speedometer is read every ${n(dt)} seconds: ${M.table([`${t} (s)`, ...ts.map(n)], [[`${M.v("v")} (m/s)`, ...vs.map(n)]])} Estimate the distance traveled in the first ${n(4 * dt)} seconds with a ${side} Riemann sum, in meters.`,
            steps: [
              `Distance is the integral of speed, ∫${M.sub("", "0")}<sup>${n(4 * dt)}</sup> ${M.v("v")}(${t}) ${M.v("d")}${t}. Four subintervals of width Δ${t} = ${n(dt)} s.`,
              `A ${side} sum uses the speed at the ${side} end of each subinterval: ${used.map(n).join(", ")}.`,
              `(${used.map(n).join(" + ")}) · ${n(dt)} = ${n(sum)} · ${n(dt)} = ${n(dist)} m.`,
              `The speed is increasing, so the ${side} sum is ${side === "left" ? "an underestimate" : "an overestimate"}.`,
            ],
            answer: { kind: "number", value: dist }, answerText: `${n(dist)} m`, answerInput: String(dist),
            vals: { ts, T4: 4 * dt, sum, dist }, params: { dt, vs, side }, consts: [4],
          };
        }
        // level 3: the exact value as a limit of right sums
        const c = r.nonzero(-3, 3), d = r.int(-4, 4), b = r.int(1, 4), b2 = b * b, b3 = b2 * b;
        const ans = Q(c * b3, 3).add(Q(d * b2, 2)), cb3 = c * b3, db2 = d * b2;
        const nv = M.v("n"), iv = M.v("i"), dxT = `${M.v("d")}${x}`;
        const xi = M.frac(`${b === 1 ? "" : n(b)}${iv}`, nv);
        return {
          prompt: `Evaluate ${M.eq(`∫${M.sub("", "0")}<sup>${n(b)}</sup> (${M.poly([c, d, 0])}) ${dxT}`)} as the limit of right Riemann sums (not by antiderivatives).`,
          steps: [
            `Δ${x} = ${M.frac(n(b), nv)} and the right endpoints are ${M.sub(x, iv)} = ${xi}, for ${iv} = 1, …, ${nv}.`,
            `${M.sub("R", nv)} = Σ [${c === 1 ? "" : c === -1 ? "−" : n(c)}${M.sup(`(${xi})`, 2)}${d ? st(d, `(${xi})`) : ""}] · ${M.frac(n(b), nv)} = ${M.frac(n(cb3), M.sup(nv, 3))} Σ ${M.sup(iv, 2)}${d ? st(db2, ` · ${M.frac("1", M.sup(nv, 2))} Σ ${iv}`) : ""}.`,
            `Summation formulas: Σ ${M.sup(iv, 2)} = ${M.frac(`${nv}(${nv} + 1)(2${nv} + 1)`, "6")}${d ? ` and Σ ${iv} = ${M.frac(`${nv}(${nv} + 1)`, "2")}` : ""}. So ${M.sub("R", nv)} = ${n(cb3)} · ${M.frac(`(${nv} + 1)(2${nv} + 1)`, `6${M.sup(nv, 2)}`)}${d ? st(db2, ` · ${M.frac(`${nv} + 1`, `2${nv}`)}`) : ""}.`,
            `As ${nv} → ${inf}: ${M.frac(`(${nv} + 1)(2${nv} + 1)`, `6${M.sup(nv, 2)}`)} → ${M.frac("2", "6")} = ${M.frac("1", "3")}${d ? ` and ${M.frac(`${nv} + 1`, `2${nv}`)} → ${M.frac("1", "2")}` : ""}. The limit is ${n(cb3)} · ${M.frac("1", "3")}${d ? st(db2, ` · ${M.frac("1", "2")}`) : ""} = ${f(ans)}.`,
          ],
          answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
          vals: { cb3, db2, ans: fv(ans) }, params: { c, d, b }, consts: [3, 6],
        };
      },
    },

    // ---- C1.31 Properties of definite integrals ----------------------------------------------------------------------------------
    "C1.integral-props": {
      title: "Properties of definite integrals",
      generate(r, level) {
        const I = (lo, hi, body) => `∫${M.sub("", lo)}<sup>${hi}</sup> ${body} ${M.v("d")}${x}`;
        const F = fx(), G = fx("g");
        if (level === 1) {
          const a = r.int(-3, 2), b = r.int(a + 1, a + 6), A = r.nonzero(-9, 9), B = r.nonzero(-9, 9), c = r.int(2, 5), d = r.int(1, 5), rev = r.chance(0.4) ? 1 : 0;
          const lin = c * A - d * B, ans = rev ? -lin : lin;
          const lo = rev ? n(b) : n(a), hi = rev ? n(a) : n(b);
          return {
            prompt: `Given ${M.eq(`${I(n(a), n(b), F)} = ${n(A)}`)} and ${M.eq(`${I(n(a), n(b), G)} = ${n(B)},`)} find ${M.eq(`${I(lo, hi, `[${n(c)}${F} − ${d === 1 ? "" : n(d)}${G}]`)}.`)}`,
            steps: [
              rev ? `The limits are reversed, which flips the sign: ${I(lo, hi, "[…]")} = −${I(n(a), n(b), "[…]")}.` : `The limits match the given integrals.`,
              `Linearity: ${I(n(a), n(b), `[${n(c)}${F} − ${d === 1 ? "" : n(d)}${G}]`)} = ${n(c)} · ${np(A)} − ${n(d)} · ${np(B)} = ${n(c * A)} − ${np(d * B)} = ${n(lin)}.`,
              rev ? `With the reversal: ${chain(`−${np(lin)}`, n(ans))}.` : `The answer is ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
            vals: { cA: c * A, dB: d * B, lin, ans }, params: { a, b, A, B, c, d, rev },
          };
        }
        if (level === 2) {
          const a = r.int(-2, 2), m = r.int(a + 1, a + 4), b = r.int(m + 1, m + 4), A = r.nonzero(-12, 12), B = r.intExcept(-12, 12, 0, A), rev = r.chance(0.5) ? 1 : 0;
          const part = A - B, ans = rev ? -part : part;
          return {
            prompt: `If ${M.eq(`${I(n(a), n(b), F)} = ${n(A)}`)} and ${M.eq(`${I(n(m), n(b), F)} = ${n(B)},`)} find ${M.eq(`${I(rev ? n(m) : n(a), rev ? n(a) : n(m), F)}.`)}`,
            steps: [
              `Additivity: ${I(n(a), n(m), F)} + ${I(n(m), n(b), F)} = ${I(n(a), n(b), F)}.`,
              `So ${I(n(a), n(m), F)} = ${n(A)} − ${np(B)} = ${n(part)}.`,
              rev ? `Reversing the limits flips the sign: ${I(n(m), n(a), F)} = ${chain(`−${np(part)}`, n(ans))}.` : `That is the integral asked for: ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
            vals: { part, ans }, params: { a, m, b, A, B, rev },
          };
        }
        // level 3: symmetry kills the odd part
        const a = r.int(1, 3), p = r.nonzero(-5, 5), q3 = r.int(-3, 3), q = 3 * q3, rr = r.int(-6, 6), s = q3 === 0 ? r.nonzero(-6, 6) : r.int(-6, 6);
        const [sh, eh, hterms] = subst([q3, 0, s, 0], a);
        const cs = [p, q, rr, s], a3 = a ** 3, half = q3 * a3 + s * a, ans = 2 * half;
        return {
          prompt: `Evaluate ${M.eq(`${I(n(-a), n(a), `(${M.poly(cs)})`)}`)} using symmetry.`,
          steps: [
            `Split into odd and even parts: ${M.poly([p, 0, rr, 0])} is odd and ${M.poly([q, 0, s])} is even.`,
            `On an interval symmetric about 0 an odd integrand contributes 0 (its areas cancel), and an even one contributes twice the integral from 0: ${I(n(-a), n(a), `(…)`)} = 2${I("0", n(a), `(${M.poly([q, 0, s])})`)}.`,
            `${I("0", n(a), `(${M.poly([q, 0, s])})`)} = ${M.sup(`[${M.poly([q3, 0, s, 0])}]`, n(a))}<sub>0</sub> = ${chain(sh, eh, n(half))} (the value at 0 is 0).`,
            `The integral is 2 · ${np(half)} = ${n(ans)}.`,
          ],
          answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
          vals: { q3, a3, half, ans, hterms: hterms.map((v) => v.n) }, params: { a, p, q, rr, s }, consts: [3],
        };
      },
    },

    // ---- C1.32 Fundamental theorem of calculus ----------------------------------------------------------------------------------
    "C1.18": {
      title: "The fundamental theorem of calculus",
      generate(r, level) {
        const I = (lo, hi, body, v = x) => `∫${M.sub("", lo)}<sup>${hi}</sup> ${body} ${M.v("d")}${v}`;
        if (level === 1) {
          const p = r.nonzero(-3, 3), q = r.int(-4, 4), c = r.int(-3, 6), a = r.int(-2, 1), b = r.int(a + 1, a + 3);
          const Fc = [Q(p, 3), Q(q, 2), Q(c), Q(0)], Fb = peval(Fc, b), Fa = peval(Fc, a), ans = Fb.sub(Fa);
          const fq = (v) => p * v * v + q * v + c, pts = [];
          for (let i = 0; i <= 24; i++) { const xx = a + ((b - a) * i) / 24; pts.push([xx, fq(xx)]); }
          const view = fit(a - 1, b + 1, fq, [0]);
          return {
            prompt: `Evaluate ${M.eq(I(n(a), n(b), `(${M.poly([p, q, c])})`))} This is the signed area of the shaded region.`,
            graph: graph({ view, items: [{ t: "poly", p: [[a, 0], ...pts, [b, 0]], role: "secondary" }, { t: "fn", e: `${p}*x^2 + (${q})*x + (${c})` }] }),
            steps: [
              `An antiderivative (power rule backward): ${M.v("F")}(${x}) = ${M.poly(Fc)}.`,
              `${M.v("F")}(${n(b)}) = ${f(Fb)} and ${M.v("F")}(${n(a)}) = ${f(Fa)}.`,
              `FTC part 2: ${M.v("F")}(${n(b)}) − ${M.v("F")}(${n(a)}) = ${f(Fb)} − ${fp(Fa)} = ${f(ans)}.`,
            ],
            answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
            vals: { Fc: Fc.map(fv), Fb: fv(Fb), Fa: fv(Fa), ans: fv(ans) }, params: { p, q, c, a, b }, consts: [3],
          };
        }
        if (level === 2) {
          const k = r.int(2, 3), a = r.nonzero(-4, 4), m = r.int(-6, 6), c0 = r.int(-2, 2), ka = k * a, k1 = k - 1;
          // d/dx ∫_c^{x^k} (a t + m) dt = (a x^k + m) · k x^(k−1)
          const resC = [ka, ...Array(k - 1).fill(0), k * m, ...Array(k - 1).fill(0)];
          return {
            prompt: `Find ${M.eq(`${dd()} ${I(n(c0), M.sup(x, n(k)), `(${M.poly([a, m], "t")})`, t)}`)}`,
            steps: [
              `FTC part 1 with the chain rule: ${dd()} ${I(M.v("c"), `${M.v("g")}(${x})`, `${fx("f", t)}`, t)} = ${M.v("f")}(${M.v("g")}(${x})) · ${M.v("g")}′(${x}). The lower limit does not matter.`,
              `Here ${fx("f", t)} = ${M.poly([a, m], "t")} and ${M.v("g")}(${x}) = ${M.sup(x, n(k))}, ${M.v("g")}′(${x}) = ${kv(k, xp(k1))}.`,
              `So the derivative is (${M.poly([a, ...Array(k - 1).fill(0), m])}) · ${kv(k, xp(k1))} = ${M.poly(resC)}.`,
            ],
            answer: { kind: "expr", expr: pstr(resC), vars: ["x"] }, answerText: M.poly(resC), answerInput: plain(resC),
            vals: { ka, km: k * m, k1, k2: 2 * k - 1 }, params: { k, a, m, c0 }, consts: [3, 5],
          };
        }
        // level 3: transcendental antiderivatives
        const kind = r.pick(["log", "trig", "exp"]);
        if (kind === "log") {
          const a = r.nonzero(-6, 6), b = r.int(1, 4) * 2, m = r.int(2, 5), mm = m * m, poly2 = Q(b * (mm - 1), 2), approx = a * Math.log(m) + poly2.value;
          const ansT = `${a === 1 ? "" : a === -1 ? "−" : n(a)} ln ${n(m)} + ${f(poly2)}`;
          return {
            prompt: `Evaluate ${M.eq(I("1", n(m), `(${M.frac(n(a), x)} + ${kv(b)})`))} Give the exact value.`,
            steps: [
              `Antiderivative: ${n(a)} ln |${x}| + ${M.frac(n(b), "2")}${M.sup(x, 2)} = ${n(a)} ln ${x} + ${kv(b / 2, M.sup(x, 2))} (${x} &gt; 0 here).`,
              `At ${n(m)}: ${n(a)} ln ${n(m)} + ${b === 2 ? n(mm) : `${n(b / 2)} · ${n(mm)}`}. At 1: ${n(a)} ln 1 + ${n(b / 2)} = ${n(b / 2)}, since ln 1 = 0.`,
              `Subtract: ${n(a)} ln ${n(m)} + ${n((b / 2) * mm)} − ${n(b / 2)} = ${ansT} ≈ ${n(approx)}.`,
            ],
            answer: { kind: "number", value: approx }, answerText: ansT, answerInput: `${a}ln(${m}) + ${typed(poly2)}`,
            vals: { b2: b / 2, mm, top: (b / 2) * mm, poly2: fv(poly2), approx }, params: { kind, a, b, m },
          };
        }
        if (kind === "trig") {
          const a = r.nonzero(-6, 6), b = r.nonzero(-6, 6), ans = a + b;
          return {
            prompt: `Evaluate ${M.eq(I("0", M.frac("π", "2"), `(${ft(a, `cos ${x}`, true)}${ft(b, `sin ${x}`)})`))}`,
            steps: [
              `Antiderivative: ${ft(a, `sin ${x}`, true)}${ft(-b, `cos ${x}`)} (since ∫ sin ${x} ${M.v("d")}${x} = −cos ${x}).`,
              `At ${M.frac("π", "2")}: sin = 1 and cos = 0, giving ${n(a)}. At 0: sin = 0 and cos = 1, giving ${n(-b)}.`,
              `Subtract: ${n(a)} − ${np(-b)} = ${n(ans)}.`,
            ],
            answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
            vals: { nb: -b, ans }, params: { kind, a, b },
          };
        }
        const c = r.nonzero(-6, 6), m = r.int(2, 9), ans = c * (m - 1);
        return {
          prompt: `Evaluate ${M.eq(I("0", `ln ${n(m)}`, c > 0 ? `${c === 1 ? "" : n(c)}${M.sup("e", x)}` : `(${c === -1 ? "−" : n(c)}${M.sup("e", x)})`))}`,
          steps: [
            `An antiderivative of ${M.sup("e", x)} is ${M.sup("e", x)} itself, so of the integrand: ${c === 1 ? "" : c === -1 ? "−" : n(c)}${M.sup("e", x)}.`,
            `At ln ${n(m)}: ${M.sup("e", `ln ${n(m)}`)} = ${n(m)}. At 0: ${M.sup("e", "0")} = 1.`,
            `${n(c)} · (${n(m)} − 1) = ${n(c)} · ${n(m - 1)} = ${n(ans)}.`,
          ],
          answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
          vals: { m1: m - 1, ans }, params: { kind, c, m },
        };
      },
    },

    // ---- C1.33 Net change -------------------------------------------------------------------------------------------------------
    "C1.net-change": {
      title: "Net change and total distance",
      generate(r, level) {
        const I = (lo, hi, body) => `∫${M.sub("", lo)}<sup>${hi}</sup> ${body} ${M.v("d")}${t}`;
        if (level === 1) {
          const a = r.int(2, 12), b = r.pick([1, 2, 3, 4]) * r.pick([1, -1]), T = r.int(2, 10) * 2, Q0 = r.pick([50, 100, 200, 300]);
          const rate = (v) => a + b * v;
          if (rate(T) <= 0) return this.generate(r, level);
          const aT = a * T, bT2 = (b * T * T) / 2, change = aT + bT2, ans = Q0 + change;
          return {
            prompt: `A tank holds ${n(Q0)} L of water. Water flows in at ${M.v("r")}(${t}) = ${M.poly([b, a], "t")} L/min for ${n(T)} minutes. How much water is in the tank then, in liters?`,
            steps: [
              `Net change theorem: the water added is ${I("0", n(T), `(${M.poly([b, a], "t")})`)}.`,
              `Antiderivative: ${n(a)}${t}${M.term(Q(b, 2), M.sup(t, 2))}. At ${n(T)}: ${n(a)} · ${n(T)}${st(Q(b, 2), ` · ${M.sup(n(T), 2)}`)} = ${n(aT)}${st(bT2)} = ${n(change)} L (at 0 it is 0).`,
              `Amount = start + change = ${n(Q0)}${st(change)} = ${n(ans)} L.`,
            ],
            answer: { kind: "number", value: ans }, answerText: `${n(ans)} L`, answerInput: String(ans),
            vals: { b2: fv(Q(b, 2)), aT, bT2, change, ans }, params: { a, b, T, Q0 },
          };
        }
        if (level === 2) {
          // a linear velocity graph: two triangles
          const t0 = r.int(1, 5), T = r.int(t0 + 1, 8), m = r.pick([1, 2, -1, -2]);
          const v = (s) => m * (s - t0), A1 = Q(t0 * Math.abs(v(0)), 2), A2 = Q((T - t0) * Math.abs(v(T)), 2), dist = A1.add(A2), disp = Q(T - t0).mul(v(T)).div(2).sub(Q(t0).mul(-v(0)).div(2));
          const view = fit(-0.5, T + 0.5, v, [0]);
          return {
            prompt: `The graph shows the velocity ${M.v("v")}(${t}) = ${M.poly([m, -m * t0], "t")} m/s of a cart for 0 ≤ ${t} ≤ ${n(T)} seconds. Find the total distance it travels, in meters.`,
            graph: graph({ view, items: [{ t: "poly", p: [[0, 0], [0, v(0)], [t0, 0]], role: "secondary" }, { t: "poly", p: [[t0, 0], [T, v(T)], [T, 0]], role: "secondary" }, { t: "fn", e: `${m}*(x - (${t0}))` }] }),
            steps: [
              `${M.v("v")} changes sign at ${t} = ${n(t0)}: the cart moves ${m > 0 ? "backward" : "forward"} first, then ${m > 0 ? "forward" : "backward"}. Total distance adds the areas without signs: ∫ |${M.v("v")}| ${M.v("d")}${t}.`,
              `First triangle (0 to ${n(t0)}): ${M.frac("1", "2")} · ${n(t0)} · ${n(Math.abs(v(0)))} = ${f(A1)}.`,
              `Second triangle (${n(t0)} to ${n(T)}): ${M.frac("1", "2")} · ${n(T - t0)} · ${n(Math.abs(v(T)))} = ${f(A2)}.`,
              `Total distance: ${f(A1)} + ${f(A2)} = ${f(dist)} m. (The displacement, with signs, is ${f(disp)} m.)`,
            ],
            answer: { kind: "number", value: dist.value }, answerText: `${f(dist)} m`, answerInput: typed(dist),
            vals: { v0: Math.abs(v(0)), vT: Math.abs(v(T)), Tt: T - t0, A1: fv(A1), A2: fv(A2), dist: fv(dist), disp: fv(disp) }, params: { t0, T, m },
          };
        }
        // level 3: a quadratic velocity, split at its zeros
        const p = r.int(0, 2), q = p + r.pick([2, 4]), T = q + r.int(1, 2), s = p + q;
        const v = [3, -3 * s, 3 * p * q], Fq = (u_) => u_ ** 3 - (3 * s * u_ * u_) / 2 + 3 * p * q * u_;
        const cuts = p === 0 ? [0, q, T] : [0, p, q, T], pieces = [];
        for (let i = 0; i + 1 < cuts.length; i++) pieces.push(Fq(cuts[i + 1]) - Fq(cuts[i]));
        const dist = pieces.reduce((acc, w) => acc + Math.abs(w), 0), disp = Fq(T) - Fq(0);
        const Fpoly = [1, Q(-3 * s, 2), 3 * p * q, 0];
        const view = fit(-0.3, T + 0.3, (u_) => 3 * (u_ - p) * (u_ - q), [0]);
        return {
          prompt: `A particle moves along a line with velocity ${M.eq(`${M.v("v")}(${t}) = ${M.poly(v, "t")}`)} m/s. Find the total distance it travels from ${t} = 0 to ${t} = ${n(T)} s, in meters.`,
          graph: graph({ view, items: [{ t: "fn", e: `3*(x - (${p}))*(x - (${q}))` }] }),
          steps: [
            `${M.v("v")}(${t}) = 3${fac(p, t)}${fac(q, t)}, zero at ${t} = ${n(p)} and ${t} = ${n(q)}. It is negative between them and positive outside, so split the integral there.`,
            `Antiderivative: ${M.v("s")}(${t}) = ${M.poly(Fpoly, "t")}. Values: ${cuts.map((u_) => `${M.v("s")}(${n(u_)}) = ${n(Fq(u_))}`).join(", ")}.`,
            `Pieces: ${pieces.map((w, i) => `${I(n(cuts[i]), n(cuts[i + 1]), M.v("v"))} = ${n(w)}`).join("; ")}.`,
            `Total distance = ${pieces.map((w) => n(Math.abs(w))).join(" + ")} = ${n(dist)} m. (Displacement: ${n(disp)} m; the backward stretch cancels part of it.)`,
          ],
          answer: { kind: "number", value: dist }, answerText: `${n(dist)} m`, answerInput: String(dist),
          vals: { s, threeS: 3 * s, pq3: 3 * p * q, Fc: [Q(-3 * s, 2)].map(fv), Fv: cuts.map(Fq), pieces, dist, disp }, params: { p, q, T }, consts: [3],
        };
      },
    },

    // ---- C1.34 u-substitution ----------------------------------------------------------------------------------------------------
    "C1.19": {
      title: "Integration by substitution",
      generate(r, level) {
        const dxT = `${M.v("d")}${x}`, du = `${M.v("d")}${u}`, C = M.v("C");
        if (level === 1) {
          const a = r.pick([-4, -3, -2, 2, 3, 4, 5]), b = r.int(-6, 6), kind = r.pick(["cos", "sin", "exp"]);
          const inner = M.poly([a, b]), ia = Q(1, a);
          const outer = kind === "cos" ? `cos(${inner})` : kind === "sin" ? `sin(${inner})` : M.sup("e", inner);
          const anti = kind === "cos" ? `sin(${inner})` : kind === "sin" ? `cos(${inner})` : M.sup("e", inner);
          const coef = kind === "sin" ? ia.neg() : ia, res = ft(coef, anti, true);
          const fnU = kind === "cos" ? `cos ${u}` : kind === "sin" ? `sin ${u}` : M.sup("e", u);
          const antiU = kind === "cos" ? `sin ${u}` : kind === "sin" ? `−cos ${u}` : M.sup("e", u);
          const jsInner = `(${a}*x + (${b}))`, jsF = kind === "cos" ? `sin${jsInner}` : kind === "sin" ? `cos${jsInner}` : `exp${jsInner}`;
          return {
            prompt: `Find ${M.eq(`∫ ${outer} ${dxT}`)} Enter the antiderivative without the + ${C}.`,
            steps: [
              `Let ${u} = ${inner}. Then ${du} = ${n(a)} ${dxT}, so ${dxT} = ${M.frac(du, n(a))}.`,
              `∫ ${outer} ${dxT} = ${f(ia)} ∫ ${fnU} ${du} = ${f(ia)}${antiU.startsWith("−") ? `(${antiU})` : ` ${antiU}`} + ${C}.`,
              `Substitute back: ${res} + ${C}.`,
            ],
            answer: { kind: "expr", expr: `(${typed(coef)})*${jsF}`, vars: ["x"] }, answerText: `${res} + ${C}`, answerInput: `(${typed(coef)})${jsF}`,
            vals: { ia: fv(ia), coef: fv(coef) }, params: { a, b, kind },
          };
        }
        if (level === 2) {
          const kind = r.pick(["exp", "cos", "log"]);
          if (kind === "log") {
            const c = r.nonzero(-6, 6), b = r.int(1, 9), half = Q(c, 2), g = M.poly([1, 0, b]);
            const res = ft(half, `ln(${g})`, true);
            return {
              prompt: `Find ${M.eq(`∫ ${M.frac(kv(c), g)} ${dxT}`)} Enter the antiderivative without the + ${C}.`,
              steps: [
                `Let ${u} = ${g}; then ${du} = 2${x} ${dxT}, so ${x} ${dxT} = ${M.frac(du, "2")}.`,
                `∫ ${M.frac(kv(c), g)} ${dxT} = ${n(c)} · ${M.frac("1", "2")} ∫ ${M.frac(du, u)} = ${ft(half, `ln |${u}|`, true)} + ${C}.`,
                `${u} = ${g} is always positive, so the absolute value can go: ${res} + ${C}.`,
              ],
              answer: { kind: "expr", expr: `(${typed(half)})*ln(x^2 + ${b})`, vars: ["x"] }, answerText: `${res} + ${C}`, answerInput: `(${typed(half)})ln(x^2 + ${b})`,
              vals: { half: fv(half) }, params: { kind, c, b },
            };
          }
          const a = r.nonzero(-4, 4), c = r.int(1, 6), twoA = 2 * a, coef = Q(c, twoA), inner = M.poly([a, 0, 0]);
          const outer = kind === "exp" ? M.sup("e", inner) : `cos(${inner})`, anti = kind === "exp" ? M.sup("e", inner) : `sin(${inner})`;
          const res = ft(coef, anti, true);
          return {
            prompt: `Find ${M.eq(`∫ ${c === 1 ? "" : n(c)}${x} ${outer} ${dxT}`)} Enter the antiderivative without the + ${C}.`,
            steps: [
              `The inside ${inner} has derivative ${kv(twoA)}, and a multiple of ${x} is present: let ${u} = ${inner}, ${du} = ${kv(twoA)} ${dxT}, so ${x} ${dxT} = ${f(Q(1, twoA))} ${du}.`,
              `∫ ${c === 1 ? "" : n(c)}${x} ${outer} ${dxT} = ${c === 1 ? fp(Q(1, twoA)) : `${n(c)} · ${fp(Q(1, twoA))}`} ∫ ${kind === "exp" ? M.sup("e", u) : `cos ${u}`} ${du} = ${f(coef)} ${kind === "exp" ? M.sup("e", u) : `sin ${u}`} + ${C}.`,
              `Substitute back: ${res} + ${C}.`,
            ],
            answer: { kind: "expr", expr: `(${typed(coef)})*${kind === "exp" ? "exp" : "sin"}(${a}*x^2)`, vars: ["x"] }, answerText: `${res} + ${C}`,
            answerInput: `(${typed(coef)})${kind === "exp" ? "e^" : "sin"}(${a}x^2)`,
            vals: { twoA, inv: fv(Q(1, twoA)), coef: fv(coef) }, params: { kind, a, c },
          };
        }
        // level 3: a definite integral with new limits
        const cc = r.int(1, 2), b = r.int(1, 3), nn = r.int(2, 3), top = cc * cc + b, n1 = nn + 1, den = 2 * n1;
        const ans = Q(top ** n1 - b ** n1, den);
        return {
          prompt: `Evaluate ${M.eq(`∫${M.sub("", "0")}<sup>${n(cc)}</sup> ${x}${M.sup(`(${M.poly([1, 0, b])})`, n(nn))} ${dxT}`)}`,
          steps: [
            `Let ${u} = ${M.poly([1, 0, b])}; ${du} = 2${x} ${dxT}, so ${x} ${dxT} = ${M.frac(du, "2")}.`,
            `New limits: ${x} = 0 gives ${u} = ${n(b)}; ${x} = ${n(cc)} gives ${u} = ${n(cc * cc)} + ${n(b)} = ${n(top)}.`,
            `${M.frac("1", "2")}∫${M.sub("", n(b))}<sup>${n(top)}</sup> ${M.sup(u, n(nn))} ${du} = ${M.frac("1", "2")} ${M.sup(`[${M.frac(M.sup(u, n(n1)), n(n1))}]`, n(top))}<sub>${n(b)}</sub> = ${M.frac(`${M.sup(n(top), n(n1))} − ${M.sup(n(b), n(n1))}`, n(den))}.`,
            `${M.frac(`${n(top ** n1)} − ${n(b ** n1)}`, n(den))} = ${f(ans)}.`,
          ],
          answer: { kind: "number", value: ans.value }, answerText: f(ans), answerInput: typed(ans),
          vals: { cc2: cc * cc, top, n1, den, tp: top ** n1, bp: b ** n1, ans: fv(ans) }, params: { cc, b, nn },
        };
      },
    },

    // ---- C1.35 Newton's method ------------------------------------------------------------------------------------------------------
    "C1.20": {
      title: "Newton's method",
      generate(r, level) {
        const xs = (i) => M.sub(x, i);
        if (level === 1) {
          for (;;) {
            const N = r.int(2, 60), x0 = Math.round(Math.sqrt(N)) + r.pick([0, 1]);
            if (x0 * x0 === N || x0 < 1) continue;
            const f0 = x0 * x0 - N, d0 = 2 * x0, x1 = Q(x0).sub(Q(f0, d0));
            const view = fit(Math.max(0, x0 - 3), x0 + 2, (v) => v * v - N, [f0, 0]);
            return {
              prompt: `Apply one step of Newton's method to ${fx()} = ${M.poly([1, 0, -N])}, starting from ${xs(0)} = ${n(x0)}, to approximate ${M.sqrt(n(N))}. Give ${xs(1)} exactly.`,
              graph: graph({ view, items: [{ t: "fn", e: `x^2 - ${N}` }, { t: "fn", e: `${d0}*(x - ${x0}) + (${f0})`, role: "secondary", dash: true }, { t: "pt", x: x0, y: f0 }] }),
              steps: [
                `Newton's step follows the tangent line down to the axis: ${xs(1)} = ${xs(0)} − ${M.frac(fx("f", xs(0)), fpr(xs(0)))}, with ${fpr()} = 2${x}.`,
                `${fx("f", n(x0))} = ${M.sup(n(x0), 2)} − ${n(N)} = ${n(f0)} and ${fpr(n(x0))} = ${n(d0)}.`,
                `${xs(1)} = ${n(x0)} − ${M.frac(n(f0), n(d0))} = ${f(x1)} ≈ ${M.n(x1.value, { dp: 4 })}. (Compare ${M.sqrt(n(N))} ≈ ${M.n(Math.sqrt(N), { dp: 4 })}.)`,
              ],
              answer: { kind: "number", value: x1.value }, answerText: f(x1), answerInput: typed(x1),
              vals: { f0, d0, x1: fv(x1), x1d: x1.value, rt: Math.sqrt(N) }, params: { N, x0 }, consts: [4],
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const p = r.int(-5, 5), q = r.int(-9, 9), x0 = r.int(-3, 3);
            const f0 = x0 ** 3 + p * x0 + q, d0 = 3 * x0 * x0 + p;
            if (d0 === 0 || f0 === 0) continue;
            const x1 = Q(x0).sub(Q(f0, d0));
            const [sa, ea] = subst([1, 0, p, q], x0);
            return {
              prompt: `Apply one step of Newton's method to ${M.eq(`${fx()} = ${M.poly([1, 0, p, q])}`)} starting from ${xs(0)} = ${n(x0)}. Give ${xs(1)} exactly.`,
              steps: [
                `${xs(1)} = ${xs(0)} − ${M.frac(fx("f", xs(0)), fpr(xs(0)))}, with ${fpr()} = ${M.poly([3, 0, p])}.`,
                `${fx("f", n(x0))} = ${chain(sa, ea, n(f0))}; ${fpr(n(x0))} = ${chain(`3 · ${M.sup(np(x0), 2)}${st(p)}`, n(d0))}.`,
                `${xs(1)} = ${n(x0)} − ${M.frac(n(f0), n(d0))} = ${f(x1)}.`,
              ],
              answer: { kind: "number", value: x1.value }, answerText: f(x1), answerInput: typed(x1),
              vals: { f0, d0, x1: fv(x1), terms: subst([1, 0, p, q], x0)[2].map((v) => v.n) }, params: { p, q, x0 }, consts: [3],
            };
          }
        }
        // level 3: two steps of the square-root (Babylonian) iteration
        for (;;) {
          const N = r.int(3, 99), x0 = Math.max(1, Math.round(Math.sqrt(N)));
          if (x0 * x0 === N) continue;
          const x1 = Q(x0).add(Q(N, x0)).div(2), x2 = x1.add(Q(N).div(x1)).div(2);
          if (Math.abs(((x2.value * 1e6) % 1) - 0.5) < 1e-6) continue;
          return {
            prompt: `Newton's method on ${fx()} = ${M.poly([1, 0, -N])} simplifies to ${M.eq(`${xs(`${M.v("k")}+1`)} = ${M.frac("1", "2")}(${xs(M.v("k"))} + ${M.frac(n(N), xs(M.v("k")))}).`)} Starting from ${xs(0)} = ${n(x0)}, compute ${xs(2)}. Round to 6 decimal places.`,
            steps: [
              `(Check: ${xs(M.v("k"))} − ${M.frac(`${M.sup(xs(M.v("k")), 2)} − ${n(N)}`, `2${xs(M.v("k"))}`)} = ${M.frac(`${M.sup(xs(M.v("k")), 2)} + ${n(N)}`, `2${xs(M.v("k"))}`)}, the same thing.)`,
              `${xs(1)} = ${M.frac("1", "2")}(${n(x0)} + ${M.frac(n(N), n(x0))}) = ${f(x1)}.`,
              `${xs(2)} = ${M.frac("1", "2")}(${f(x1)} + ${n(N)} ÷ ${f(x1)}) = ${M.frac("1", "2")}(${f(x1)} + ${f(Q(N).div(x1))}) = ${f(x2)} ≈ ${M.n(x2.value, { dp: 6 })}.`,
              `(${M.sqrt(n(N))} ≈ ${M.n(Math.sqrt(N), { dp: 6 })}: two steps already agree closely, since near the root the error roughly squares each step.)`,
            ],
            answer: { kind: "number", value: x2.value, dp: 6 }, answerText: M.n(x2.value, { dp: 6 }), answerInput: x2.value.toFixed(6),
            vals: { x1: fv(x1), Nx1: fv(Q(N).div(x1)), x2: fv(x2), x2d: x2.value, rt: Math.sqrt(N) }, params: { N, x0 }, consts: [6],
          };
        }
      },
    },
  });
})(Practice);
