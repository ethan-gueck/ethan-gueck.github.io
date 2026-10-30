/*
 * practice/electrical.js — Electrical Engineering practice problems (chapter 16), one generator per
 * concept key.
 *
 * Each generator(r, level) draws hand-solvable numbers for the level (1 easy, 2 medium, 3 hard) and
 * builds every number it shows from values it computes and reports in `vals`; tools/practice/
 * verifiers/electrical.py recomputes each of them independently (circuits by nodal analysis with
 * exact fractions, signals with SymPy). See practice/core.js for the API.
 *
 * Every concept in the chapter has a generator; none is skipped. The four schematic-symbol concepts
 * (EE.22–EE.25) are practised through the parts they draw: lamps and fuses, meters and shunts, Zener
 * regulators, and logic-gate networks.
 *
 * Unit conventions in the steps: mA × kΩ = V, kΩ × μF = ms, mA × ms = μC, mH ÷ kΩ = μs.
 */
(function (P) {
  "use strict";
  const { Frac, M, fmt, graph } = P;
  /** A number; with dp, shown to exactly dp decimals (a rounded value keeps its trailing zeros: 2.00). */
  const n = (v, dp) => (dp === undefined ? M.n(v) : (Math.abs(v) < 0.5 * Math.pow(10, -dp) ? 0 : v).toFixed(dp).replace("-", "−"));
  const np = (v) => M.n(v, { paren: true });
  const fracVal = (q) => ({ n: q.n, d: q.d });
  const typed = (v) => (v instanceof Frac ? (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`) : String(v));
  const it = (s) => `<i>${s}</i>`;
  const SUBD = "₀₁₂₃₄₅₆₇₈₉";
  /** A symbol with a subscript: digits as Unicode subscripts (R₁), words as <sub> (V<sub>th</sub>). */
  const sym = (b, s) => (s === undefined ? it(b) : /^\d+$/.test(String(s)) ? `${it(b)}${String(s).split("").map((c) => SUBD[c]).join("")}` : `${it(b)}<sub>${s}</sub>`);
  const R = (k) => sym("R", k), V = (k) => sym("V", k), I = (k) => sym("I", k), C = (k) => sym("C", k), L = (k) => sym("L", k);
  /** A quantity with its unit, with a non-breaking space. */
  const q = (v, unit, dp) => `${n(v, dp)}&nbsp;${unit}`;
  const OHM = "Ω", KOHM = "kΩ";
  const par = " ∥ ";
  /** Bits shown one character per span, so a bit string is never read as a decimal number. */
  const bits = (s) => `<span class="pbits">${String(s).split("").map((c) => `<span>${c}</span>`).join("")}</span>`;
  const bar = (s) => `<span style="text-decoration:overline">${s}</span>`;
  const sci = (m, e) => `${fmt(m)} × 10<sup>${fmt(e)}</sup>`;
  const r2 = (v, dp) => Number(v.toFixed(dp));
  /** "a" or "an" before a number as it is read aloud: an 8, an 11, an 18, an 80. */
  const art = (v) => { const s = fmt(Math.abs(v)), ip = s.split(".")[0]; return /^8/.test(s) || (/^1[18]/.test(ip) && ip.length % 3 === 2) ? "an" : "a"; };
  const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  /** A number with thousands separators when it is whole (1,250), plainly otherwise (1250.5). */
  const big = (v) => (Number.isInteger(v) ? P.grouped(v) : fmt(v));
  /** k times a symbol: s, −s, 3s (never 1s). */
  const kv = (k, s) => (k === 1 ? s : k === -1 ? `−${s}` : `${n(k)}${s}`);
  const cap1 = (s) => s[0].toUpperCase() + s.slice(1);
  /** "=" when v shows exactly at dp decimals, "≈" when the shown value is rounded. */
  const approx = (v, dp = 4) => (Math.abs(v * Math.pow(10, dp) - Math.round(v * Math.pow(10, dp))) < 1e-6 ? "=" : "≈");
  const gcd = P.gcd;
  /** Is v (nearly) a rounding tie at dp decimals, or so close to one that rounding is fragile? Then redraw. */
  const tie = (v, dp, tol = 1e-3) => { const x = Math.abs(v) * Math.pow(10, dp); return Math.abs(x - Math.floor(x) - 0.5) < tol; };

  // ---- Circuit figures: plain graph items (segments and text) ---------------------------------
  const W = (a, b) => ({ t: "seg", a, b });
  const T = (x, y, s) => ({ t: "text", x, y, s });
  const dot = (x, y, label) => ({ t: "pt", x, y, label: label || "" });
  /** A resistor (zigzag) from a to b, horizontal or vertical; the label sits above or to the right. */
  function res(a, b, label, side = 1) {
    const [x1, y1] = a, [x2, y2] = b;
    const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len, nx = -uy, ny = ux;
    const p = (s, o) => [x1 + ux * s + nx * o, y1 + uy * s + ny * o];
    const s0 = len * 0.25, s1 = len * 0.75, k = 6, amp = 0.2;
    const out = [W(a, p(s0, 0))];
    let prev = p(s0, 0);
    for (let i = 1; i <= k; i++) {
      const s = s0 + ((s1 - s0) * (i - 0.5)) / k, o = i % 2 ? amp : -amp;
      const pt = p(s, o);
      out.push(W(prev, pt));
      prev = pt;
    }
    out.push(W(prev, p(s1, 0)), W(p(s1, 0), b));
    if (label) {
      const horiz = Math.abs(uy) < 1e-9;
      const lp = horiz ? [(x1 + x2) / 2, (y1 + y2) / 2 + 0.55 * side] : [(x1 + x2) / 2 + 1.4 * side, (y1 + y2) / 2];
      out.push(T(lp[0], lp[1], label));
    }
    return out;
  }
  /** A voltage source on a vertical wire from a (bottom) to b (top); + at the top unless flipped. */
  function vsrc(a, b, label, flip = false, side = -1) {
    const x = a[0], ym = (a[1] + b[1]) / 2, rr = 0.45;
    return [
      W(a, [x, ym - rr]), W([x, ym + rr], b), { t: "circle", c: [x, ym], r: rr },
      T(x, ym + 0.2, flip ? "−" : "+"), T(x, ym - 0.22, flip ? "+" : "−"),
      ...(label ? [T(x + 1.05 * side, ym, label)] : []),
    ];
  }
  /** A current source on a vertical wire from a (bottom) to b (top), arrow up (or down). */
  function isrc(a, b, label, down = false, side = 1) {
    const x = a[0], ym = (a[1] + b[1]) / 2, rr = 0.45;
    return [
      W(a, [x, ym - rr]), W([x, ym + rr], b), { t: "circle", c: [x, ym], r: rr },
      { t: "vec", a: [x, down ? ym + 0.3 : ym - 0.3], b: [x, down ? ym - 0.3 : ym + 0.3] },
      ...(label ? [T(x + 1.05 * side, ym, label)] : []),
    ];
  }
  /** A capacitor from a to b (vertical). */
  function cap(a, b, label, side = 1) {
    const x = a[0], ym = (a[1] + b[1]) / 2, g = 0.12;
    return [W(a, [x, ym - g]), W([x, ym + g], b), W([x - 0.35, ym - g], [x + 0.35, ym - g]), W([x - 0.35, ym + g], [x + 0.35, ym + g]),
      ...(label ? [T(x + 0.95 * side, ym, label)] : [])];
  }
  /** An inductor from a to b (horizontal): four bumps. */
  function ind(a, b, label) {
    const [x1, y] = a, x2 = b[0], s0 = x1 + (x2 - x1) * 0.2, s1 = x1 + (x2 - x1) * 0.8, w = (s1 - s0) / 4;
    const out = [W(a, [s0, y]), W([s1, y], b)];
    for (let k = 0; k < 4; k++) {
      const cx = s0 + w * (k + 0.5);
      for (let j = 0; j < 6; j++) {
        const t1 = Math.PI - (Math.PI * j) / 6, t2 = Math.PI - (Math.PI * (j + 1)) / 6;
        out.push(W([cx + (w / 2) * Math.cos(t1), y + (w / 2) * Math.sin(t1)], [cx + (w / 2) * Math.cos(t2), y + (w / 2) * Math.sin(t2)]));
      }
    }
    if (label) out.push(T((x1 + x2) / 2, y + 0.75, label));
    return out;
  }
  /** Plain-text symbol for figure labels: pn("R", 1) → R₁. */
  const pn = (b, k) => b + String(k).split("").map((c) => SUBD[c]).join("");
  const RV = [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 90];
  /** Resistor pairs whose parallel combination is a whole number. */
  const PAIRS = [];
  for (const a of RV) for (const b of RV) if (a <= b && (a * b) % (a + b) === 0) PAIRS.push([a, b]);
  /** Pythagorean triples (a, b, c): friendly impedance and power triangles. */
  const TRIPLES = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25], [20, 21, 29], [21, 20, 29]];
  // ---- Digital logic helpers --------------------------------------------------------------------------------------------
  const toBin = (v, w) => v.toString(2).padStart(w, "0");
  /** Boolean expression trees: "A" | ["not", e] | ["and", e, e, …] | ["or", e, e, …] | ["xor", e, e]. */
  function bEval(e, env) {
    if (typeof e === "string") return env[e];
    const [op, ...a] = e, v = a.map((x) => bEval(x, env));
    if (op === "not") return 1 - v[0];
    if (op === "and") return v.every(Boolean) ? 1 : 0;
    if (op === "or") return v.some(Boolean) ? 1 : 0;
    return v[0] ^ v[1];
  }
  function bHtml(e, top = true) {
    if (typeof e === "string") return it(e);
    const [op, ...a] = e;
    if (op === "not") return bar(bHtml(a[0], true));
    if (op === "and") return a.map((x) => (Array.isArray(x) && (x[0] === "or" || x[0] === "xor") ? `(${bHtml(x, false)})` : bHtml(x, false))).join("");
    const body = a.map((x) => bHtml(x, false)).join(op === "or" ? " + " : " ⊕ ");
    return top ? body : `(${body})`;
  }
  const nt = (x) => ["not", x];
  /** Expressions over A, B, C for truth-table counting. */
  const BOOL3 = [
    ["or", ["and", "A", "B"], nt("C")], ["and", ["or", "A", "B"], nt("C")], ["or", nt(["and", "A", "B"]), "C"], ["or", ["and", "A", nt("B")], ["and", nt("A"), "C"]],
    ["and", nt(["or", "A", "C"]), "B"], ["xor", "A", ["and", "B", "C"]], ["or", ["and", nt("A"), nt("B")], ["and", "B", "C"]], ["and", ["or", "A", nt("B")], ["or", "B", "C"]],
  ];
  /** [expression, simplified form, three non-equivalent distractors, the identity used]. */
  const SIMPLIFY = [
    [["or", "A", ["and", "A", "B"]], "A", [["and", "A", "B"], "B", ["or", "A", "B"]], `Absorption: ${it("A")} + ${it("A")}${it("B")} = ${it("A")}(1 + ${it("B")}) = ${it("A")} · 1 = ${it("A")}.`],
    [["and", "A", ["or", "A", "B"]], "A", [["or", "A", "B"], ["and", "A", "B"], "B"], `Distribute: ${it("A")}(${it("A")} + ${it("B")}) = ${it("A")}${it("A")} + ${it("A")}${it("B")} = ${it("A")} + ${it("A")}${it("B")} = ${it("A")} (absorption).`],
    [["or", ["and", "A", "B"], ["and", "A", nt("B")]], "A", ["B", ["and", "A", "B"], ["or", "A", "B"]], `Factor out ${it("A")}: ${it("A")}(${it("B")} + ${bar(it("B"))}) = ${it("A")} · 1 = ${it("A")}. Terms that differ in one variable merge and drop it.`],
    [nt(["and", nt("A"), nt("B")]), ["or", "A", "B"], [["and", "A", "B"], ["or", nt("A"), nt("B")], ["and", nt("A"), nt("B")]], `De Morgan: break the bar and change the operator, ${bar(`${bar(it("A"))}${bar(it("B"))}`)} = ${bar(bar(it("A")))} + ${bar(bar(it("B")))}, and a double bar cancels.`],
    [nt(["or", "A", nt("B")]), ["and", nt("A"), "B"], [["or", nt("A"), "B"], ["and", "A", nt("B")], ["or", "A", nt("B")]], `De Morgan: ${bar(`${it("A")} + ${bar(it("B"))}`)} = ${bar(it("A"))} · ${bar(bar(it("B")))} = ${bar(it("A"))}${it("B")}.`],
    [["or", "A", ["and", nt("A"), "B"]], ["or", "A", "B"], ["B", ["and", "A", "B"], ["and", nt("A"), "B"]], `${it("A")} + ${bar(it("A"))}${it("B")} = (${it("A")} + ${bar(it("A"))})(${it("A")} + ${it("B")}) = 1 · (${it("A")} + ${it("B")}), by the distributive law of OR over AND.`],
    [["and", ["or", "A", "B"], ["or", "A", "C"]], ["or", "A", ["and", "B", "C"]], [["and", "A", ["or", "B", "C"]], ["or", "A", "B", "C"], ["and", "A", "B", "C"]], `Expand: ${it("A")}${it("A")} + ${it("A")}${it("C")} + ${it("A")}${it("B")} + ${it("B")}${it("C")} = ${it("A")}(1 + ${it("C")} + ${it("B")}) + ${it("B")}${it("C")} = ${it("A")} + ${it("B")}${it("C")}.`],
    [["or", ["and", "A", "B"], ["and", nt("A"), "C"], ["and", "B", "C"]], ["or", ["and", "A", "B"], ["and", nt("A"), "C"]], [["or", ["and", "A", "B"], "C"], ["or", "B", "C"], ["or", ["and", "A", "B"], ["and", "A", "C"]]], `Consensus: ${it("B")}${it("C")} = ${it("B")}${it("C")}(${it("A")} + ${bar(it("A"))}) = ${it("A")}${it("B")}${it("C")} + ${bar(it("A"))}${it("B")}${it("C")}, and each piece is absorbed by ${it("A")}${it("B")} or ${bar(it("A"))}${it("C")}.`],
  ];
  const GATES = {
    AND: { f: (a, b) => a & b, shape: "D-shaped body", rule: "1 only when both inputs are 1." },
    OR: { f: (a, b) => a | b, shape: "curved shield body", rule: "1 when either input is 1." },
    NAND: { f: (a, b) => 1 - (a & b), shape: "AND body with an output bubble", rule: "AND followed by NOT: 0 only when both inputs are 1. It is universal: every other gate can be built from NANDs." },
    NOR: { f: (a, b) => 1 - (a | b), shape: "OR body with an output bubble", rule: "OR followed by NOT: 1 only when both inputs are 0." },
    XOR: { f: (a, b) => a ^ b, shape: "OR body with an extra curved input line", rule: "1 when the inputs differ (a 1-bit adder's sum)." },
    XNOR: { f: (a, b) => 1 - (a ^ b), shape: "XOR body with an output bubble", rule: "1 when the inputs are equal." },
  };
  // K-map minimization. A cube is a string over {0, 1, -} (one character per variable, A first).
  const cubeSize = (c) => 1 << c.split("").filter((ch) => ch === "-").length;
  const cubeHas = (c, m, nv) => c.split("").every((ch, i) => ch === "-" || +ch === ((m >> (nv - 1 - i)) & 1));
  const cubeMins = (c, nv) => [...Array(1 << nv).keys()].filter((m) => cubeHas(c, m, nv));
  const lits = (c) => c.split("").filter((ch) => ch !== "-").length;
  function minimize(mins, nv) {
    const all = [];
    const gen = (p) => { if (p.length === nv) { all.push(p); return; } for (const ch of "01-") gen(p + ch); };
    gen("");
    const impl = all.filter((c) => cubeMins(c, nv).every((m) => mins.includes(m)));
    const primes = impl.filter((c) => !impl.some((d) => d !== c && cubeMins(c, nv).every((m) => cubeHas(d, m, nv))));
    let best = null, bestKey = null, count = 0;
    for (let mask = 1; mask < 1 << primes.length; mask++) {
      const set = primes.filter((_, i) => (mask >> i) & 1);
      if (!mins.every((m) => set.some((c) => cubeHas(c, m, nv)))) continue;
      const key = [set.length, set.reduce((s, c) => s + lits(c), 0)];
      if (!best || key[0] < bestKey[0] || (key[0] === bestKey[0] && key[1] < bestKey[1])) { best = set; bestKey = key; count = 1; }
      else if (key[0] === bestKey[0] && key[1] === bestKey[1]) count++;
    }
    return { cover: best || [], unique: count === 1 && mins.length > 0 && mins.length < 1 << nv };
  }
  /** Does a cube wrap around the map's edge (it spans the first and last Gray columns or rows)? */
  const wraps = (c, nv) => { const cm = cubeMins(c, nv); return cm.length > 1 && cm.some((m) => (m & 3) === 0) && cm.some((m) => (m & 3) === 2) && !cm.some((m) => (m & 3) === 1); };
  const termHtml = (c, names) => c.split("").map((ch, i) => (ch === "-" ? "" : ch === "1" ? it(names[i]) : bar(it(names[i])))).join("") || "1";
  const sopHtml = (cover, names) => cover.map((c) => termHtml(c, names)).join(" + ");
  const sameFn = (cover, mins, nv) => [...Array(1 << nv).keys()].every((m) => cover.some((c) => cubeHas(c, m, nv)) === mins.includes(m));
  /** Plausible wrong answers: a term dropped, a literal flipped, a literal dropped. */
  function distractors(cover, nv, r) {
    const out = [];
    if (cover.length > 1) cover.forEach((_, i) => out.push(cover.filter((__, j) => j !== i)));
    cover.forEach((c, i) => c.split("").forEach((ch, k) => {
      if (ch === "-") return;
      const flip = c.slice(0, k) + (ch === "1" ? "0" : "1") + c.slice(k + 1), drop = c.slice(0, k) + "-" + c.slice(k + 1);
      out.push(cover.map((d, j) => (j === i ? flip : d)), cover.map((d, j) => (j === i ? drop : d)));
    }));
    return r.shuffle(out);
  }
  const fig = (view, items) => graph({ view, items, equal: true, axes: false, grid: false });

  P.define("electrical", {
    // ---- EE.1 Charge, current, voltage, power & energy ---------------------------------------------
    "EE.1": {
      title: "Charge, current, power and energy",
      generate(r, level) {
        if (level === 1) {
          const kind = r.int(0, 2);
          if (kind === 0) {
            const Iv = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6]), t = r.pick([4, 6, 8, 10, 12, 20, 30, 40, 60]), Q = Iv * t;
            return {
              prompt: `A charge of ${q(Q, "C")} flows past a point in a wire in ${q(t, "s")}, at a steady rate. What is the current, in amperes?`,
              steps: [
                `Current is charge per unit time: ${it("I")} = ${M.frac(it("Q"), it("t"))}.`,
                `${it("I")} = ${M.frac(q(Q, "C"), q(t, "s"))} = ${q(Iv, "A")} (one ampere is one coulomb per second).`,
              ],
              answer: { kind: "number", value: Iv }, answerText: q(Iv, "A"), answerInput: String(Iv),
              vals: { I: Iv }, params: { kind, Q, t },
            };
          }
          if (kind === 1) {
            const [Vs, dev] = r.pick([[120, "a toaster"], [120, "a microwave oven"], [230, "a kettle"], [12, "a car headlight"], [5, "a USB charger"], [9, "a small motor"], [240, "a clothes dryer"]]);
            const Iv = r.pick([0.5, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]), Pw = Vs * Iv;
            return {
              prompt: `${dev[0].toUpperCase() + dev.slice(1)} runs on ${q(Vs, "V")} and draws ${q(Iv, "A")}. How much power does it use, in watts?`,
              steps: [
                `Electric power is voltage times current: ${it("P")} = ${it("V")}${it("I")}.`,
                `${it("P")} = ${n(Vs)} × ${n(Iv)} = ${q(Pw, "W")}.`,
              ],
              answer: { kind: "number", value: Pw }, answerText: q(Pw, "W"), answerInput: String(Pw),
              vals: { P: Pw }, params: { kind, V: Vs, I: Iv },
            };
          }
          const Vv = r.pick([1.5, 3, 6, 9, 12, 24]), Q = r.pick([2, 4, 5, 10, 20, 50]), Wj = Vv * Q;
          return {
            prompt: `A battery does ${q(Wj, "J")} of work moving ${q(Q, "C")} of charge from its negative to its positive terminal. What is its voltage?`,
            steps: [
              `Voltage is energy per unit charge: ${it("V")} = ${M.frac(it("W"), it("Q"))}.`,
              `${it("V")} = ${M.frac(q(Wj, "J"), q(Q, "C"))} = ${q(Vv, "V")} (one volt is one joule per coulomb).`,
            ],
            answer: { kind: "number", value: Vv }, answerText: q(Vv, "V"), answerInput: String(Vv),
            vals: { V: Vv }, params: { kind, W: Wj, Q },
          };
        }
        if (level === 2) {
          const [dev, Pw] = r.pick([["space heater", 1500], ["window air conditioner", 1200], ["television", 120], ["refrigerator", 150], ["gaming computer", 400], ["dehumidifier", 300], ["electric blanket", 200], ["aquarium heater", 100]]);
          const h = r.pick([2, 3, 4, 5, 6, 8, 10, 12]), d = r.pick([30, 31]), c = r.int(10, 30);
          const Wh = Pw * h, kwhDay = Wh / 1000, kwh = kwhDay * d, cost = (kwh * c) / 100;
          if (tie(cost, 2)) return this.generate(r, level);
          return {
            prompt: `${cap1(art(Pw))} ${big(Pw)}&nbsp;W ${dev} runs ${n(h)} hours a day for ${n(d)} days. Electricity costs ${n(c)}¢ per kilowatt-hour. What does it cost to run, in dollars? Round to the nearest cent.`,
            steps: [
              `Energy per day: ${it("E")} = ${it("P")}${it("t")} = ${big(Pw)}&nbsp;W × ${n(h)}&nbsp;h = ${big(Wh)}&nbsp;Wh = ${q(kwhDay, "kWh")} (1&nbsp;kWh = 1000&nbsp;Wh).`,
              `Over ${n(d)} days: ${n(kwhDay)} × ${n(d)} = ${q(kwh, "kWh")}.`,
              `Cost: ${n(kwh)}&nbsp;kWh × ${n(c)}¢ = ${n(kwh * c)}¢ = ${P.money(cost)}.`,
            ],
            answer: { kind: "number", value: cost, dp: 2 }, answerText: P.money(cost), answerInput: r2(cost, 2).toFixed(2),
            vals: { Wh, kwhDay, kwh, cents: kwh * c, cost }, params: { P: Pw, h, d, c }, consts: [1000],
          };
        }
        // level 3: charge = area under a current–time graph (a trapezoid)
        for (;;) {
          const Im = r.int(2, 8), t1 = r.int(1, 3), t2 = t1 + r.int(2, 5), t3 = t2 + r.int(1, 3);
          const q1 = (Im * t1) / 2, q2 = Im * (t2 - t1), q3 = (Im * (t3 - t2)) / 2, Q = q1 + q2 + q3;
          if (t3 > 11) continue;
          return {
            prompt: `The graph shows the current into a capacitor (in mA) against time (in ms): it ramps up, holds steady, then ramps down to zero. How much charge flows, in microcoulombs (μC)?`,
            graph: graph({ view: [0, 12, 0, 10], items: [W([0, 0], [t1, Im]), W([t1, Im], [t2, Im]), W([t2, Im], [t3, 0]), dot(t1, Im), dot(t2, Im), dot(t3, 0)] }),
            steps: [
              `Charge is the area under the current–time graph: ${it("Q")} = ∫${it("i")}&thinsp;${it("dt")}. With mA and ms, the area comes out in μC.`,
              `Read the corners: the current rises to ${q(Im, "mA")} at ${q(t1, "ms")}, stays there until ${q(t2, "ms")}, and falls to zero at ${q(t3, "ms")}.`,
              `Rising triangle: ½ × ${n(t1)} × ${n(Im)} = ${n(q1)}. Flat rectangle: (${n(t2)} − ${n(t1)}) × ${n(Im)} = ${n(q2)}. Falling triangle: ½ × (${n(t3)} − ${n(t2)}) × ${n(Im)} = ${n(q3)}.`,
              `${it("Q")} = ${n(q1)} + ${n(q2)} + ${n(q3)} = ${q(Q, "μC")}.`,
            ],
            answer: { kind: "number", value: Q }, answerText: q(Q, "μC"), answerInput: String(Q),
            vals: { q1, q2, q3, Q, d21: t2 - t1, d32: t3 - t2 }, params: { Im, t1, t2, t3 },
          };
        }
      },
    },

    // ---- EE.2 Resistance, Ohm's law & resistivity ---------------------------------------------------
    "EE.resistance": {
      title: "Ohm's law, power and wire resistance",
      generate(r, level) {
        if (level === 1) {
          const kind = r.int(0, 3);
          if (kind === 0) {
            const Rv = r.pick([2, 3, 4, 5, 6, 8, 10, 12, 20]), Iv = r.int(1, 6), Vv = Rv * Iv;
            return {
              prompt: `${cap1(art(Rv))} ${q(Rv, OHM)} resistor is connected across ${q(Vv, "V")}. What current flows, in amperes?`,
              steps: [`Ohm's law, ${it("V")} = ${it("I")}${it("R")}, solved for the current: ${it("I")} = ${M.frac(it("V"), it("R"))}.`, `${it("I")} = ${M.frac(n(Vv), n(Rv))} = ${q(Iv, "A")}.`],
              answer: { kind: "number", value: Iv }, answerText: q(Iv, "A"), answerInput: String(Iv), vals: { I: Iv }, params: { kind, R: Rv, V: Vv },
            };
          }
          if (kind === 1) {
            const Rv = r.pick([1, 1.5, 2, 2.2, 3.3, 4.7, 5, 10]), Iv = r.int(2, 9), Vv = r2(Rv * Iv, 6);
            return {
              prompt: `A current of ${q(Iv, "mA")} flows through ${art(Rv)} ${q(Rv, KOHM)} resistor. What is the voltage across it, in volts?`,
              steps: [`Ohm's law: ${it("V")} = ${it("I")}${it("R")}. Milliamps times kilohms gives volts (the 10<sup>−3</sup> and 10<sup>3</sup> cancel).`, `${it("V")} = ${n(Iv)}&nbsp;mA × ${n(Rv)}&nbsp;kΩ = ${q(Vv, "V")}.`],
              answer: { kind: "number", value: Vv }, answerText: q(Vv, "V"), answerInput: String(Vv), vals: { V: Vv }, params: { kind, R: Rv, I: Iv }, consts: [10, 3],
            };
          }
          if (kind === 2) {
            const Vv = r.pick([12, 24, 48, 120, 240]), Iv = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12]), Rv = Vv / Iv;
            if (!Number.isInteger(Rv)) return this.generate(r, level);
            return {
              prompt: `A heating element draws ${q(Iv, "A")} from ${art(Vv)} ${q(Vv, "V")} supply. What is its resistance, in ohms?`,
              steps: [`Ohm's law solved for resistance: ${it("R")} = ${M.frac(it("V"), it("I"))}.`, `${it("R")} = ${M.frac(n(Vv), n(Iv))} = ${q(Rv, OHM)}.`],
              answer: { kind: "number", value: Rv }, answerText: q(Rv, OHM), answerInput: String(Rv), vals: { R: Rv }, params: { kind, V: Vv, I: Iv },
            };
          }
          // read R from a V–I graph
          for (;;) {
            const Rv = r.pick([0.5, 1, 1.5, 2, 2.5, 3]), I0 = r.int(2, 6), V0 = Rv * I0;
            if (!Number.isInteger(V0) || V0 > 12 || V0 < 2) continue;
            return {
              prompt: `The graph shows the voltage across a resistor (in volts, vertical) against the current through it (in mA, horizontal). The marked point sits on grid lines. What is the resistance, in kΩ?`,
              graph: graph({ view: [0, 7, 0, 14], items: [{ t: "fn", e: `${Rv}*x`, role: "primary" }, dot(I0, V0)] }),
              steps: [
                `For a resistor the ${it("V")}–${it("I")} graph is a straight line through the origin, and its slope is ${it("R")} = ${M.frac(it("V"), it("I"))}.`,
                `The marked point is ${q(I0, "mA")}, ${q(V0, "V")}.`,
                `${it("R")} = ${M.frac(q(V0, "V"), q(I0, "mA"))} = ${q(Rv, KOHM)} (volts per milliamp are kilohms).`,
              ],
              answer: { kind: "number", value: Rv }, answerText: q(Rv, KOHM), answerInput: String(Rv), vals: { R: Rv }, params: { kind, I0, V0 },
            };
          }
        }
        if (level === 2) {
          const kind = r.int(0, 2);
          if (kind === 0) {
            for (;;) {
              const Vs = r.pick([120, 240, 12, 24]), Rv = r.pick(Vs >= 120 ? [8, 9, 10, 12, 15, 16, 18, 20, 24, 30, 36, 40, 48, 60, 72, 96] : [2, 3, 4, 6, 8, 9, 12, 16, 18, 24]);
              const Pw = (Vs * Vs) / Rv;
              if (!Number.isInteger(Pw)) continue;
              const Iv = Pw / Vs;
              return {
                prompt: `A heater is rated ${big(Pw)}&nbsp;W at ${q(Vs, "V")}. What is the resistance of its element, in ohms?`,
                steps: [
                  `Combine ${it("P")} = ${it("V")}${it("I")} with Ohm's law: ${it("P")} = ${M.frac(M.sup(it("V"), 2), it("R"))}, so ${it("R")} = ${M.frac(M.sup(it("V"), 2), it("P"))}.`,
                  `${it("R")} = ${M.frac(M.sup(n(Vs), 2), big(Pw))} = ${M.frac(big(Vs * Vs), big(Pw))} = ${q(Rv, OHM)}.`,
                  `Check: it draws ${it("I")} = ${M.frac(n(Pw), n(Vs))} = ${q(Iv, "A")}, and ${n(Iv)} × ${n(Rv)} = ${q(Vs, "V")}.`,
                ],
                answer: { kind: "number", value: Rv }, answerText: q(Rv, OHM), answerInput: String(Rv), vals: { R: Rv, VV: Vs * Vs, I: Iv, P: Pw }, params: { kind, V: Vs, P: Pw },
              };
            }
          }
          if (kind === 1) {
            const Rv = r.pick([1, 2.2, 3.3, 4.7, 10]), Iv = r.pick([2, 3, 4, 5, 6, 8, 10]), Pmw = r2(Iv * Iv * Rv, 6);
            const ok = Pmw <= 250;
            return {
              prompt: `${cap1(art(Rv))} ${q(Rv, KOHM)} resistor carries ${q(Iv, "mA")}. How much power does it turn into heat, in milliwatts? Is a ¼&nbsp;W (250&nbsp;mW) resistor big enough?`,
              steps: [
                `Joule heating: ${it("P")} = ${M.sup(it("I"), 2)}${it("R")}. With mA and kΩ the result is in mW (10<sup>−6</sup> × 10<sup>3</sup> = 10<sup>−3</sup>).`,
                `${it("P")} = ${M.sup(n(Iv), 2)} × ${n(Rv)} = ${n(Iv * Iv)} × ${n(Rv)} = ${q(Pmw, "mW")}.`,
                ok ? `${n(Pmw)}&nbsp;mW is below 250&nbsp;mW, so a ¼&nbsp;W part is enough.` : `${n(Pmw)}&nbsp;mW is more than 250&nbsp;mW, so a ¼&nbsp;W part would overheat; use a larger power rating.`,
              ],
              answer: { kind: "number", value: Pmw }, answerText: `${q(Pmw, "mW")} (${ok ? "a ¼&nbsp;W part is enough" : "too much for a ¼&nbsp;W part"})`, answerInput: String(Pmw),
              vals: { II: Iv * Iv, P: Pmw }, params: { kind, R: Rv, I: Iv }, consts: [250, 10, 6, 3, 4],
            };
          }
          const Rohm = r.pick([50, 100, 125, 200, 250, 500]), Gms = 1000 / Rohm, Vv = r.pick([2, 3, 4, 5, 6, 10, 12]), Ima = Gms * Vv;
          return {
            prompt: `A resistor has resistance ${q(Rohm, OHM)}. Find its conductance in millisiemens, then the current (in mA) when ${q(Vv, "V")} is applied.`,
            steps: [
              `Conductance is the reciprocal of resistance: ${it("G")} = ${M.frac("1", it("R"))} = ${M.frac("1", `${n(Rohm)}&nbsp;Ω`)} = ${q(Gms, "mS")} (1&nbsp;S = 1000&nbsp;mS).`,
              `Ohm's law in conductance form: ${it("I")} = ${it("G")}${it("V")} = ${n(Gms)}&nbsp;mS × ${n(Vv)}&nbsp;V = ${q(Ima, "mA")}.`,
            ],
            answer: { kind: "number", value: Ima }, answerText: q(Ima, "mA"), answerInput: String(Ima), vals: { G: Gms, I: Ima }, params: { kind, R: Rohm, V: Vv }, consts: [1000],
          };
        }
        // level 3: wire resistance and its loss, or resistance at a new temperature
        if (r.chance(0.5)) {
          const [metal, rho] = r.pick([["copper", 1.68], ["aluminum", 2.65]]);
          const Lm = r.pick([10, 15, 20, 25, 30, 40, 50]), A = r.pick([1.5, 2.5, 4]), Iv = r.pick([5, 8, 10, 12, 15, 16, 20]);
          const len = 2 * Lm, Rw = (rho * 1e-2 * len) / A, Pl = Iv * Iv * Rw;
          if (tie(Pl, 2) || Math.abs(Rw * 1e4 - Math.round(Rw * 1e4)) > 1e-7) return this.generate(r, level);   // R exact at 4 decimals, so the shown product is exact
          return {
            prompt: `${cap1(art(Lm))} ${n(Lm)}&nbsp;m extension cord has two ${metal} conductors (out and back), each ${n(A)}&nbsp;mm² in cross-section; ${metal} has resistivity ${sci(rho, -8)}&nbsp;Ω·m. It carries ${q(Iv, "A")}. How much power is wasted as heat in the cord? Round to 2 decimal places.`,
            steps: [
              `The current travels out and back, so the conductor length is ${it("L")} = 2 × ${n(Lm)} = ${q(len, "m")}. Area in SI units: ${it("A")} = ${n(A)} × 10<sup>−6</sup>&nbsp;m².`,
              `${it("R")} = ${it("ρ")}${M.frac(it("L"), it("A"))} = ${M.frac(`${sci(rho, -8)} × ${n(len)}`, `${n(A)} × 10<sup>−6</sup>`)} = ${q(Rw, OHM, 4)}.`,
              `${it("P")} = ${M.sup(it("I"), 2)}${it("R")} = ${M.sup(n(Iv), 2)} × ${n(Rw, 4)} = ${q(Pl, "W", 2)}.`,
            ],
            answer: { kind: "number", value: Pl, dp: 2 }, answerText: q(Pl, "W", 2), answerInput: r2(Pl, 2).toString(),
            vals: { len, R: Rw, Ploss: Pl }, params: { rho, L: Lm, A, I: Iv, metal: metal === "copper" ? 1 : 0 }, consts: [10, 8, 6],
          };
        }
        const R0 = r.pick([10, 20, 40, 50, 80, 100, 120]), T0 = 20, T1 = r.pick([40, 60, 75, 80, 90, 100, 120, 150]);
        const dT = T1 - T0, factor = 1 + 0.0039 * dT, R1 = R0 * factor;
        if (tie(R1, 2)) return this.generate(r, level);
        return {
          prompt: `A copper motor winding measures ${q(R0, OHM)} at ${n(T0)}&nbsp;°C. Copper's temperature coefficient is ${it("α")} = 0.0039 per °C. What is its resistance when it runs hot at ${n(T1)}&nbsp;°C? Round to 2 decimal places.`,
          steps: [
            `${it("R")}(${it("T")}) = ${sym("R", 0)}[1 + ${it("α")}(${it("T")} − ${sym("T", 0)})]. A metal's resistance grows with temperature.`,
            `Temperature rise: ${n(T1)} − ${n(T0)} = ${n(dT)}&nbsp;°C, so the factor is 1 + 0.0039 × ${n(dT)} = ${n(factor)}.`,
            `${it("R")} = ${n(R0)} × ${n(factor)} = ${q(R1, OHM, 2)}.`,
          ],
          answer: { kind: "number", value: R1, dp: 2 }, answerText: q(R1, OHM, 2), answerInput: r2(R1, 2).toString(),
          vals: { dT, factor, R1 }, params: { R0, T0, T1 }, consts: [0.0039],
        };
      },
    },
    // ---- EE.3 Series & parallel combinations ----------------------------------------------------------
    "EE.series-parallel": {
      title: "Series and parallel combinations",
      generate(r, level) {
        if (level === 1) {
          const kind = r.int(0, 2);
          if (kind === 0) {
            const [a0, b0] = r.pick(PAIRS.filter(([a, b]) => a !== b)), [a, b] = r.chance(0.5) ? [a0, b0] : [b0, a0];
            const prod = a * b, sum = a + b, Req = prod / sum;
            return {
              prompt: `Two resistors, ${R(1)} = ${q(a, OHM)} and ${R(2)} = ${q(b, OHM)}, are connected in parallel between terminals ${it("a")} and ${it("b")}. What is their equivalent resistance?`,
              graph: fig([-1, 9, -1, 4.6], [dot(0, 3.5, "a"), dot(0, 0, "b"), W([0, 3.5], [5.5, 3.5]), W([0, 0], [5.5, 0]), ...res([2, 3.5], [2, 0], `${pn("R", 1)} = ${fmt(a)} Ω`), ...res([5.5, 3.5], [5.5, 0], `${pn("R", 2)} = ${fmt(b)} Ω`)]),
              steps: [
                `Both resistors connect the same two nodes, so they are in parallel. For two, use product over sum: ${R(1)}${par}${R(2)} = ${M.frac(`${R(1)}${R(2)}`, `${R(1)} + ${R(2)}`)}.`,
                `${M.frac(`${n(a)} × ${n(b)}`, `${n(a)} + ${n(b)}`)} = ${M.frac(n(prod), n(sum))} = ${q(Req, OHM)}.`,
                `Check: ${q(Req, OHM)} is below the smaller resistor, ${q(Math.min(a, b), OHM)}, as it must be: a second path only makes it easier for current to flow.`,
              ],
              answer: { kind: "number", value: Req }, answerText: q(Req, OHM), answerInput: String(Req),
              vals: { prod, sum, Req }, params: { kind, a, b },
            };
          }
          if (kind === 1) {
            const N = r.pick([2, 3, 4, 5, 6]), Rv = N * r.pick([20, 30, 40, 50, 60, 100, 200]), Req = Rv / N;
            return {
              prompt: `${cap1(WORDS[N])} identical ${q(Rv, OHM)} resistors are connected in parallel. What is the equivalent resistance?`,
              steps: [
                `In parallel, conductances add: ${M.frac("1", sym("R", "eq"))} = ${M.frac("1", it("R"))} + ⋯ + ${M.frac("1", it("R"))} = ${M.frac(it("N"), it("R"))}, so ${n(N)} equal resistors give ${sym("R", "eq")} = ${M.frac(it("R"), it("N"))}.`,
                `${sym("R", "eq")} = ${M.frac(n(Rv), n(N))} = ${q(Req, OHM)}.`,
              ],
              answer: { kind: "number", value: Req }, answerText: q(Req, OHM), answerInput: String(Req),
              vals: { Req }, params: { kind, N, R: Rv },
            };
          }
          const a = r.pick([10, 22, 33, 47, 68, 100, 150, 220]), b = r.pick([10, 22, 33, 47, 68, 100, 150, 220]), c = r.pick([10, 22, 33, 47, 68, 100, 150, 220]), Req = a + b + c;
          return {
            prompt: `Resistors of ${q(a, OHM)}, ${q(b, OHM)} and ${q(c, OHM)} are connected in series, end to end. What is the equivalent resistance?`,
            steps: [
              `In series the same current flows through each resistor and their voltages add, so the resistances add: ${sym("R", "eq")} = ${R(1)} + ${R(2)} + ${R(3)}.`,
              `${sym("R", "eq")} = ${n(a)} + ${n(b)} + ${n(c)} = ${q(Req, OHM)}.`,
            ],
            answer: { kind: "number", value: Req }, answerText: q(Req, OHM), answerInput: String(Req),
            vals: { Req }, params: { kind, a, b, c },
          };
        }
        if (level === 2) {
          const kind = r.int(0, 2);
          if (kind === 0) {
            const [b, c] = r.shuffle(r.pick(PAIRS)), a = r.pick(RV), p = (b * c) / (b + c), Req = a + p;
            return {
              prompt: `Find the equivalent resistance between terminals ${it("a")} and ${it("b")}.`,
              graph: fig([-1, 10, -1, 4.8], [dot(0, 3.5, "a"), dot(0, 0, "b"), ...res([0, 3.5], [3.5, 3.5], `${pn("R", 1)} = ${fmt(a)} Ω`), ...res([3.5, 3.5], [3.5, 0], `${pn("R", 2)} = ${fmt(b)} Ω`),
                W([3.5, 3.5], [7, 3.5]), ...res([7, 3.5], [7, 0], `${pn("R", 3)} = ${fmt(c)} Ω`), W([0, 0], [7, 0])]),
              steps: [
                `${R(2)} and ${R(3)} share both of their nodes, so they are in parallel: ${M.frac(`${n(b)} × ${n(c)}`, `${n(b)} + ${n(c)}`)} = ${M.frac(n(b * c), n(b + c))} = ${q(p, OHM)}.`,
                `All of that combination's current also passes through ${R(1)}, so the two are in series: ${sym("R", "eq")} = ${n(a)} + ${n(p)} = ${q(Req, OHM)}.`,
              ],
              answer: { kind: "number", value: Req }, answerText: q(Req, OHM), answerInput: String(Req),
              vals: { bc: b * c, bpc: b + c, p, Req }, params: { kind, a, b, c },
            };
          }
          if (kind === 1) {
            const [x, y] = r.shuffle(r.pick(PAIRS.filter(([u, v]) => Math.max(u, v) >= 3 && Math.max(u, v) <= 60)));
            const Cp = Math.max(x, y) >= 3 ? x : y, C3 = Cp === x ? y : x;
            if (Cp < 3) return this.generate(r, level);
            const C1 = r.int(1, Cp - 1), C2 = Cp - C1, Ceq = (Cp * C3) / (Cp + C3);
            return {
              prompt: `Capacitors ${C(1)} = ${q(C1, "μF")} and ${C(2)} = ${q(C2, "μF")} are in parallel, and that pair is in series with ${C(3)} = ${q(C3, "μF")}. What is the equivalent capacitance?`,
              steps: [
                `Capacitors combine the opposite way to resistors. In parallel the plate areas add: ${n(C1)} + ${n(C2)} = ${q(Cp, "μF")}.`,
                `In series the reciprocals add, so for two use product over sum: ${M.frac(`${n(Cp)} × ${n(C3)}`, `${n(Cp)} + ${n(C3)}`)} = ${M.frac(n(Cp * C3), n(Cp + C3))} = ${q(Ceq, "μF")}.`,
              ],
              answer: { kind: "number", value: Ceq }, answerText: q(Ceq, "μF"), answerInput: String(Ceq),
              vals: { Cp, prod: Cp * C3, sum: Cp + C3, Ceq }, params: { kind, C1, C2, C3 },
            };
          }
          const [b, c] = r.shuffle(r.pick(PAIRS)), a = r.pick(RV), p = (b * c) / (b + c), Leq = a + p;
          return {
            prompt: `Inductor ${L(1)} = ${q(a, "mH")} is in series with the parallel pair ${L(2)} = ${q(b, "mH")} and ${L(3)} = ${q(c, "mH")}. There is no magnetic coupling between the coils. What is the equivalent inductance?`,
            steps: [
              `Uncoupled inductors combine like resistors. The parallel pair: ${M.frac(`${n(b)} × ${n(c)}`, `${n(b)} + ${n(c)}`)} = ${M.frac(n(b * c), n(b + c))} = ${q(p, "mH")}.`,
              `In series they add: ${sym("L", "eq")} = ${n(a)} + ${n(p)} = ${q(Leq, "mH")}.`,
            ],
            answer: { kind: "number", value: Leq }, answerText: q(Leq, "mH"), answerInput: String(Leq),
            vals: { bc: b * c, bpc: b + c, p, Leq }, params: { kind, a, b, c },
          };
        }
        // level 3: a two-rung ladder, R1 + R2 ∥ (R3 + R4 ∥ R5)
        for (;;) {
          const [d, e] = r.shuffle(r.pick(PAIRS)), p45 = (d * e) / (d + e), c = r.pick(RV), s = c + p45;
          const opts = RV.filter((b) => (b * s) % (b + s) === 0);
          if (!opts.length) continue;
          const b = r.pick(opts), p2 = (b * s) / (b + s), a = r.pick(RV), Req = a + p2;
          return {
            prompt: `Find the equivalent resistance between terminals ${it("a")} and ${it("b")} of this ladder network.`,
            graph: fig([-1, 13, -1, 4.8], [dot(0, 3.5, "a"), dot(0, 0, "b"), ...res([0, 3.5], [3, 3.5], `${pn("R", 1)} = ${fmt(a)} Ω`), ...res([3, 3.5], [3, 0], `${pn("R", 2)} = ${fmt(b)} Ω`),
              ...res([3, 3.5], [6.5, 3.5], `${pn("R", 3)} = ${fmt(c)} Ω`), ...res([6.5, 3.5], [6.5, 0], `${pn("R", 4)} = ${fmt(d)} Ω`), W([6.5, 3.5], [10, 3.5]),
              ...res([10, 3.5], [10, 0], `${pn("R", 5)} = ${fmt(e)} Ω`), W([0, 0], [10, 0])]),
            steps: [
              `Start at the end farthest from the terminals. ${R(4)} and ${R(5)} are in parallel: ${M.frac(`${n(d)} × ${n(e)}`, `${n(d)} + ${n(e)}`)} = ${M.frac(n(d * e), n(d + e))} = ${q(p45, OHM)}.`,
              `${R(3)} is in series with that pair: ${n(c)} + ${n(p45)} = ${q(s, OHM)}.`,
              `${R(2)} is in parallel with everything to its right: ${M.frac(`${n(b)} × ${n(s)}`, `${n(b)} + ${n(s)}`)} = ${M.frac(n(b * s), n(b + s))} = ${q(p2, OHM)}.`,
              `${R(1)} is in series with the rest: ${sym("R", "eq")} = ${n(a)} + ${n(p2)} = ${q(Req, OHM)}.`,
            ],
            answer: { kind: "number", value: Req }, answerText: q(Req, OHM), answerInput: String(Req),
            vals: { de: d * e, dpe: d + e, p45, s, bs: b * s, bps: b + s, p2, Req }, params: { a, b, c, d, e },
          };
        }
      },
    },

    // ---- EE.4 Kirchhoff's laws ----------------------------------------------------------------------
    "EE.2": {
      title: "Kirchhoff's current and voltage laws",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.5)) {
            for (;;) {
              const I1 = r.int(2, 12), I2 = r.int(1, 10), I3 = r.int(1, 12), I4 = I1 + I2 - I3;
              if (I4 <= 0) continue;
              return {
                prompt: `Currents ${I(1)} = ${q(I1, "mA")} and ${I(2)} = ${q(I2, "mA")} flow into a node. ${I(3)} = ${q(I3, "mA")} flows out along a third wire. What current ${I(4)} flows out along the fourth wire?`,
                graph: fig([-5, 5, -4.5, 4.5], [dot(0, 0), { t: "vec", a: [-4, 0], b: [-0.3, 0] }, { t: "vec", a: [0, 4], b: [0, 0.3] }, { t: "vec", a: [0.3, 0], b: [4, 0] }, { t: "vec", a: [0, -0.3], b: [0, -4] },
                  T(-2.2, 0.6, `${pn("I", 1)} = ${fmt(I1)} mA`), T(1.9, 2.5, `${pn("I", 2)} = ${fmt(I2)} mA`), T(2.2, 0.6, `${pn("I", 3)} = ${fmt(I3)} mA`), T(1.4, -2.5, `${pn("I", 4)} = ?`)]),
                steps: [
                  `Kirchhoff's current law: charge cannot pile up at a node, so the current in equals the current out: ${I(1)} + ${I(2)} = ${I(3)} + ${I(4)}.`,
                  `${I(4)} = ${n(I1)} + ${n(I2)} − ${n(I3)} = ${q(I4, "mA")}.`,
                ],
                answer: { kind: "number", value: I4 }, answerText: q(I4, "mA"), answerInput: String(I4),
                vals: { I4 }, params: { kind: 0, I1, I2, I3 },
              };
            }
          }
          for (;;) {
            const V1 = r.int(1, 9), V2 = r.int(1, 9), V3 = r.int(1, 9), Vs = V1 + V2 + V3;
            return {
              prompt: `${cap1(art(Vs))} ${q(Vs, "V")} source drives three resistors in series. A voltmeter reads ${q(V1, "V")} across ${R(1)} and ${q(V2, "V")} across ${R(2)}. What does it read across ${R(3)}?`,
              graph: fig([-2.5, 9, -1.3, 5], [...vsrc([0, 0], [0, 4], `${fmt(Vs)} V`), ...res([0, 4], [6, 4], `${pn("R", 1)}: ${fmt(V1)} V`), ...res([6, 4], [6, 0], `${pn("R", 2)}: ${fmt(V2)} V`), ...res([6, 0], [0, 0], `${pn("R", 3)}: ?`, -1)]),
              steps: [
                `Kirchhoff's voltage law: around a closed loop the rises equal the drops. The source is the only rise: ${n(Vs)} = ${n(V1)} + ${n(V2)} + ${sym("V", "3")}.`,
                `${sym("V", "3")} = ${n(Vs)} − ${n(V1)} − ${n(V2)} = ${q(V3, "V")}.`,
              ],
              answer: { kind: "number", value: V3 }, answerText: q(V3, "V"), answerInput: String(V3),
              vals: { V3 }, params: { kind: 1, Vs, V1, V2 },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const R1 = r.int(1, 6), R2 = r.int(1, 6), R3 = r.int(1, 6), V1 = r.int(3, 24), V2 = r.int(1, 12), aid = r.chance(0.5);
            const net = aid ? V1 + V2 : V1 - V2, sum = R1 + R2 + R3, Iv = net / sum;
            if (net <= 0 || !Number.isInteger(Iv * 2)) continue;
            const VR2 = Iv * R2;
            return {
              prompt: `In the loop shown, ${V(1)} = ${q(V1, "V")} (+ at the top) and ${V(2)} = ${q(V2, "V")} (+ at the ${aid ? "bottom" : "top"}); ${R(1)} = ${q(R1, KOHM)}, ${R(2)} = ${q(R2, KOHM)}, ${R(3)} = ${q(R3, KOHM)}. Find the voltage across ${R(2)}, in volts.`,
              graph: fig([-2.5, 10, -1.6, 5], [...vsrc([0, 0], [0, 4], `${pn("V", 1)}`), ...res([0, 4], [3.5, 4], `${pn("R", 1)}`), ...res([3.5, 4], [7, 4], `${pn("R", 2)}`), ...vsrc([7, 0], [7, 4], `${pn("V", 2)}`, aid, 1), ...res([7, 0], [0, 0], `${pn("R", 3)}`, -1), T(3.5, 2, "I ↻")]),
              steps: [
                `Take the loop current ${it("I")} clockwise and walk around clockwise from the bottom left. Up through ${V(1)} (− to +) is a rise of ${n(V1)}; each resistor is a drop of ${it("IR")}; down through ${V(2)} goes ${aid ? "from − to +, another rise" : "from + to −, a drop"}.`,
                `KVL: ${n(V1)} ${aid ? "+" : "−"} ${n(V2)} − ${it("I")}(${n(R1)} + ${n(R2)} + ${n(R3)}) = 0, so ${n(net)} = ${n(sum)}${it("I")}.`,
                `${it("I")} = ${M.frac(n(net), n(sum))} = ${q(Iv, "mA")} (volts over kilohms give milliamps).`,
                `Across ${R(2)}: ${it("V")} = ${it("I")}${R(2)} = ${n(Iv)} × ${n(R2)} = ${q(VR2, "V")}.`,
              ],
              answer: { kind: "number", value: VR2 }, answerText: q(VR2, "V"), answerInput: String(VR2),
              vals: { net, sum, I: Iv, VR2 }, params: { V1, V2, aid: aid ? 1 : 0, R1, R2, R3 },
            };
          }
        }
        // level 3: KCL and KVL together, working back from a measured branch current to the source voltage
        for (;;) {
          const R2 = r.int(1, 6), R3 = r.int(1, 8), R1 = r.int(1, 6), Vp = r.int(2, 12);
          const I2 = Vp / R2, I3 = Vp / R3;
          if (R2 === R3 || !Number.isInteger(I2 * 2) || !Number.isInteger(I3 * 2)) continue;
          const I1 = I2 + I3, V1 = I1 * R1, Vs = V1 + Vp;
          return {
            prompt: `A source ${sym("V", "s")} feeds ${R(1)} = ${q(R1, KOHM)}, which then splits into ${R(2)} = ${q(R2, KOHM)} and ${R(3)} = ${q(R3, KOHM)} in parallel. An ammeter in series with ${R(2)} reads ${q(I2, "mA")}. What is ${sym("V", "s")}?`,
            graph: fig([-2.5, 11, -1, 5], [...vsrc([0, 0], [0, 4], "Vs = ?"), ...res([0, 4], [3.5, 4], `${pn("R", 1)} = ${fmt(R1)} kΩ`), ...res([3.5, 4], [3.5, 0], `${pn("R", 2)} = ${fmt(R2)} kΩ`), W([3.5, 4], [7.5, 4]),
              ...res([7.5, 4], [7.5, 0], `${pn("R", 3)} = ${fmt(R3)} kΩ`), W([0, 0], [7.5, 0]), T(4.9, 3.1, `${pn("I", 2)} = ${fmt(I2)} mA`)]),
            steps: [
              `Ohm's law on ${R(2)}: the voltage across the parallel pair is ${n(I2)} × ${n(R2)} = ${q(Vp, "V")}.`,
              `${R(3)} has the same voltage (it is in parallel), so ${I(3)} = ${M.frac(n(Vp), n(R3))} = ${q(I3, "mA")}.`,
              `KCL at the top node: everything through ${R(1)} splits into the two branches, ${I(1)} = ${n(I2)} + ${n(I3)} = ${q(I1, "mA")}, so ${R(1)} drops ${n(I1)} × ${n(R1)} = ${q(V1, "V")}.`,
              `KVL around the outer loop through ${R(2)}: ${sym("V", "s")} = ${n(V1)} + ${n(Vp)} = ${q(Vs, "V")}.`,
            ],
            answer: { kind: "number", value: Vs }, answerText: q(Vs, "V"), answerInput: String(Vs),
            vals: { Vp, I3, I1, V1, Vs }, params: { R1, R2, R3, I2 },
          };
        }
      },
    },

    // ---- EE.5 Voltage & current dividers --------------------------------------------------------------
    "EE.3": {
      title: "Voltage and current dividers",
      generate(r, level) {
        const KV = [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30];
        if (level === 1) {
          for (;;) {
            const Vin = r.pick([5, 9, 10, 12, 15, 24]), R1 = r.pick(KV), R2 = r.pick(KV), Vout = (Vin * R2) / (R1 + R2);
            if (!Number.isInteger(Vout * 4)) continue;
            return {
              prompt: `Find ${sym("V", "out")}, the voltage across ${R(2)}, for ${sym("V", "in")} = ${q(Vin, "V")}, ${R(1)} = ${q(R1, KOHM)} and ${R(2)} = ${q(R2, KOHM)}.`,
              graph: fig([-2.5, 8.5, -1, 5], [...vsrc([0, 0], [0, 4], `${fmt(Vin)} V`), ...res([0, 4], [3.5, 4], `${pn("R", 1)} = ${fmt(R1)} kΩ`), ...res([3.5, 4], [3.5, 0], `${pn("R", 2)} = ${fmt(R2)} kΩ`),
                W([3.5, 4], [6.5, 4]), W([0, 0], [6.5, 0]), dot(6.5, 4, "+"), dot(6.5, 0, "−"), T(6.9, 2, "Vout")]),
              steps: [
                `Nothing is connected across the output, so ${R(1)} and ${R(2)} carry the same current and split ${sym("V", "in")} in proportion to their resistances: ${sym("V", "out")} = ${sym("V", "in")}${M.frac(R(2), `${R(1)} + ${R(2)}`)}.`,
                `${sym("V", "out")} = ${n(Vin)} × ${M.frac(n(R2), `${n(R1)} + ${n(R2)}`)} = ${n(Vin)} × ${M.frac(n(R2), n(R1 + R2))} = ${q(Vout, "V")}.`,
              ],
              answer: { kind: "number", value: Vout }, answerText: q(Vout, "V"), answerInput: String(Vout),
              vals: { sum: R1 + R2, Vout }, params: { Vin, R1, R2 },
            };
          }
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            for (;;) {
              const It = r.pick([6, 8, 10, 12, 15, 18, 20, 24, 30]), R1 = r.pick(KV), R2 = r.pick(KV), I1 = (It * R2) / (R1 + R2);
              if (R1 === R2 || !Number.isInteger(I1 * 2)) continue;
              const I2 = It - I1;
              return {
                prompt: `${cap1(art(It))} ${q(It, "mA")} current source feeds ${R(1)} = ${q(R1, KOHM)} and ${R(2)} = ${q(R2, KOHM)} in parallel. How much current flows through ${R(1)}?`,
                graph: fig([-2.5, 10, -1, 5], [...isrc([0, 0], [0, 4], `${fmt(It)} mA`, false, -1), W([0, 4], [7, 4]), W([0, 0], [7, 0]), ...res([3.5, 4], [3.5, 0], `${pn("R", 1)} = ${fmt(R1)} kΩ`), ...res([7, 4], [7, 0], `${pn("R", 2)} = ${fmt(R2)} kΩ`)]),
                steps: [
                  `Current divider: the current through one branch has the other resistor on top, ${I(1)} = ${sym("I", "total")}${M.frac(R(2), `${R(1)} + ${R(2)}`)}. More current takes the easier path.`,
                  `${I(1)} = ${n(It)} × ${M.frac(n(R2), n(R1 + R2))} = ${q(I1, "mA")}.`,
                  `Check with KCL: ${I(2)} = ${n(It)} − ${n(I1)} = ${q(I2, "mA")}, and both branches have the same voltage: ${n(I1)} × ${n(R1)} = ${n(I2)} × ${n(R2)} = ${q(I1 * R1, "V")}.`,
                ],
                answer: { kind: "number", value: I1 }, answerText: q(I1, "mA"), answerInput: String(I1),
                vals: { sum: R1 + R2, I1, I2, Vp: I1 * R1 }, params: { kind: 0, It, R1, R2 },
              };
            }
          }
          for (;;) {
            const Vin = r.pick([6, 9, 10, 12, 15, 18, 24, 30, 36]), R1 = r.pick(KV), R2 = r.pick(KV), R3 = r.pick(KV), sum = R1 + R2 + R3, V2 = (Vin * R2) / sum;
            if (!Number.isInteger(V2 * 4)) continue;
            return {
              prompt: `Three resistors in series, ${R(1)} = ${q(R1, KOHM)}, ${R(2)} = ${q(R2, KOHM)} and ${R(3)} = ${q(R3, KOHM)}, sit across ${art(Vin)} ${q(Vin, "V")} supply. What is the voltage across ${R(2)}?`,
              steps: [
                `Each series resistor takes its share of the total: ${V(2)} = ${it("V")}${M.frac(R(2), `${R(1)} + ${R(2)} + ${R(3)}`)}.`,
                `The total resistance is ${n(R1)} + ${n(R2)} + ${n(R3)} = ${q(sum, KOHM)}.`,
                `${V(2)} = ${n(Vin)} × ${M.frac(n(R2), n(sum))} = ${q(V2, "V")}.`,
              ],
              answer: { kind: "number", value: V2 }, answerText: q(V2, "V"), answerInput: String(V2),
              vals: { sum, V2 }, params: { kind: 1, Vin, R1, R2, R3 },
            };
          }
        }
        // level 3: a divider loaded by the circuit it feeds
        for (;;) {
          const Vin = r.pick([5, 9, 12, 15, 24]), R1 = r.pick([1, 2, 4, 5, 10, 20]), R2 = r.pick([1, 2, 4, 5, 10, 20]), RL = r.pick([2, 3, 4, 5, 6, 10, 12, 20, 30, 40, 60]);
          const prodL = R2 * RL, sumL = R2 + RL, Rp = prodL / sumL, V0 = (Vin * R2) / (R1 + R2), VL = (Vin * Rp) / (R1 + Rp);
          if (!Number.isInteger(Rp) || !Number.isInteger(V0 * 100) || !Number.isInteger(VL * 100) || V0 - VL < 0.2) continue;
          const dev = r.pick(["a sensor circuit", "a meter", "an amplifier input"]);
          return {
            prompt: `A divider with ${R(1)} = ${q(R1, KOHM)} on top and ${R(2)} = ${q(R2, KOHM)} on the bottom runs from ${q(Vin, "V")}. Its output is connected to ${dev} that behaves like ${art(RL)} ${q(RL, KOHM)} resistor to ground. What is the output voltage now?`,
            graph: fig([-2.5, 11, -1, 5], [...vsrc([0, 0], [0, 4], `${fmt(Vin)} V`), ...res([0, 4], [3.5, 4], `${pn("R", 1)} = ${fmt(R1)} kΩ`), ...res([3.5, 4], [3.5, 0], `${pn("R", 2)} = ${fmt(R2)} kΩ`),
              W([3.5, 4], [7.5, 4]), ...res([7.5, 4], [7.5, 0], `RL = ${fmt(RL)} kΩ`), W([0, 0], [7.5, 0])]),
            steps: [
              `Unloaded, the output would be ${n(Vin)} × ${M.frac(n(R2), n(R1 + R2))} = ${q(V0, "V")}. But the load sits in parallel with ${R(2)}, so the divider's bottom leg is smaller.`,
              `${R(2)}${par}${sym("R", "L")} = ${M.frac(`${n(R2)} × ${n(RL)}`, `${n(R2)} + ${n(RL)}`)} = ${M.frac(n(prodL), n(sumL))} = ${q(Rp, KOHM)}.`,
              `${sym("V", "out")} = ${n(Vin)} × ${M.frac(n(Rp), `${n(R1)} + ${n(Rp)}`)} = ${q(VL, "V")}.`,
              `The load pulls the output down by ${n(V0)} − ${n(VL)} = ${q(V0 - VL, "V")}. To keep a divider accurate, make its resistors much smaller than the load, or buffer it.`,
            ],
            answer: { kind: "number", value: VL }, answerText: q(VL, "V"), answerInput: String(VL),
            vals: { R12: R1 + R2, V0, prodL, sumL, Rp, VL, drop: V0 - VL }, params: { Vin, R1, R2, RL },
          };
        }
      },
    },

    // ---- EE.6 Sources & source transformation ---------------------------------------------------------
    "EE.sources": {
      title: "Sources, source transformation and dependent sources",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.5)) {
            const Rv = r.pick([2, 3, 4, 5, 6, 8, 10, 12]), Is = r.int(1, 6), Vs = Is * Rv;
            return {
              prompt: `${cap1(art(Vs))} ${q(Vs, "V")} voltage source in series with ${q(Rv, OHM)} is to be replaced by an equivalent current source in parallel with a resistor. What current must the source supply, and what resistor goes with it? Enter the current (A) and the resistance (Ω), separated by a comma.`,
              steps: [
                `Two sources are equivalent if they give the same open-circuit voltage and the same short-circuit current at the terminals.`,
                `Short the terminals of the original: ${it("I")} = ${M.frac(n(Vs), n(Rv))} = ${q(Is, "A")}. So ${sym("I", "s")} = ${M.frac(sym("V", "s"), it("R"))} = ${q(Is, "A")}.`,
                `The same ${q(Rv, OHM)} resistor goes in parallel, so the open-circuit voltage is again ${n(Is)} × ${n(Rv)} = ${q(Vs, "V")}.`,
              ],
              answer: { kind: "numbers", values: [Is, Rv], ordered: true }, answerText: `${q(Is, "A")} in parallel with ${q(Rv, OHM)}`, answerInput: `${Is}, ${Rv}`,
              vals: { Is }, params: { kind: 0, Vs, R: Rv },
            };
          }
          const Rv = r.pick([1, 2, 3, 4, 5, 10]), Is = r.int(2, 12), Vs = Is * Rv;
          return {
            prompt: `${cap1(art(Is))} ${q(Is, "mA")} current source in parallel with ${q(Rv, KOHM)} is to be replaced by an equivalent voltage source in series with a resistor. What voltage must the source have, and what resistor goes with it? Enter the voltage (V) and the resistance (kΩ), separated by a comma.`,
            steps: [
              `Equivalent sources give the same open-circuit voltage and short-circuit current.`,
              `Open circuit: all ${q(Is, "mA")} flows through the resistor, so ${sym("V", "s")} = ${sym("I", "s")}${it("R")} = ${n(Is)} × ${n(Rv)} = ${q(Vs, "V")}.`,
              `The same ${q(Rv, KOHM)} goes in series; shorting the terminals then gives ${M.frac(n(Vs), n(Rv))} = ${q(Is, "mA")}, as before.`,
            ],
            answer: { kind: "numbers", values: [Vs, Rv], ordered: true }, answerText: `${q(Vs, "V")} in series with ${q(Rv, KOHM)}`, answerInput: `${Vs}, ${Rv}`,
            vals: { Vs }, params: { kind: 1, Is, R: Rv },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            for (;;) {
              const rint = r.pick([0.5, 1, 2]), RL = r.int(2, 22), Iv = r.pick([0.25, 0.5, 1, 1.5, 2]), E = Iv * (rint + RL);
              if (E < 3 || E > 24 || !Number.isInteger(E * 10)) continue;
              const drop = Iv * rint, Vt = E - drop;
              return {
                prompt: `A battery has an open-circuit voltage of ${q(E, "V")} and an internal resistance of ${q(rint, OHM)}. What is its terminal voltage when it drives ${art(RL)} ${q(RL, OHM)} load?`,
                steps: [
                  `Model the battery as an ideal source in series with its internal resistance; the load closes the loop. ${it("I")} = ${M.frac(it("E"), `${sym("R", "s")} + ${sym("R", "L")}`)} = ${M.frac(n(E), `${n(rint)} + ${n(RL)}`)} = ${q(Iv, "A")}.`,
                  `The internal resistance drops ${it("I")}${sym("R", "s")} = ${n(Iv)} × ${n(rint)} = ${q(drop, "V")}.`,
                  `Terminal voltage: ${it("v")} = ${sym("V", "s")} − ${it("i")}${sym("R", "s")} = ${n(E)} − ${n(drop)} = ${q(Vt, "V")} (check: ${n(Iv)} × ${n(RL)} = ${n(Vt)}).`,
                ],
                answer: { kind: "number", value: Vt }, answerText: q(Vt, "V"), answerInput: String(Vt),
                vals: { rRL: rint + RL, I: Iv, drop, Vt }, params: { kind: 0, E, rint, RL },
              };
            }
          }
          for (;;) {
            const [E, what, Iset] = r.pick([[12.6, "car battery", [50, 80, 100, 120, 150, 200]], [12, "lead-acid battery", [5, 10, 20, 40]], [3.7, "lithium cell", [1, 2, 3, 4]], [9, "9&nbsp;V battery", [0.1, 0.2, 0.25, 0.5]]]);
            const Iv = r.pick(Iset), rint = r.pick([0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2]), drop = r2(Iv * rint, 6), Vt = r2(E - drop, 6);
            if (drop < 0.05 * E || drop > 0.3 * E || !Number.isInteger(r2(Vt * 100, 6))) continue;
            return {
              prompt: `A ${what} reads ${q(E, "V")} with nothing connected. While it supplies ${q(Iv, "A")}, its terminals read ${q(Vt, "V")}. What is its internal resistance, in ohms?`,
              steps: [
                `With no load there is no internal drop, so the open-circuit reading is the source voltage, ${q(E, "V")}.`,
                `Under load: ${it("v")} = ${sym("V", "s")} − ${it("i")}${sym("R", "s")}, so the internal drop is ${n(E)} − ${n(Vt)} = ${q(drop, "V")}.`,
                `${sym("R", "s")} = ${M.frac(q(drop, "V"), q(Iv, "A"))} = ${q(rint, OHM)}.`,
              ],
              answer: { kind: "number", value: rint }, answerText: q(rint, OHM), answerInput: String(rint),
              vals: { drop, rint }, params: { kind: 1, E, I: Iv, Vt },
            };
          }
        }
        // level 3: an amplifier model with a dependent source
        for (;;) {
          const type = r.pick(["VCVS", "VCCS", "CCVS", "CCCS"]);
          const vsm = r.pick([10, 20, 50, 100, 200, 500]), Rs = r.pick([1, 2, 4, 5, 10]), Rin = r.pick([1, 4, 5, 10, 15, 20, 40]);
          const vs = new Frac(vsm, 1000), vx = vs.mul(Rin).div(Rs + Rin), ix = vs.div(Rs + Rin);  // V and mA
          const Ro = r.pick([1, 2, 4, 5, 10]), RL = r.pick([2, 4, 5, 6, 10, 12, 20]);
          let k, ctrl, src, out;
          if (type === "VCVS") { k = r.pick([5, 10, 20, 40, 50, 100]); ctrl = vx; src = vx.mul(k); out = src.mul(RL).div(Ro + RL); }
          else if (type === "CCVS") { k = r.pick([2, 5, 10, 20, 50]); ctrl = ix; src = ix.mul(k); out = src.mul(RL).div(Ro + RL); }
          else if (type === "VCCS") { k = r.pick([2, 4, 5, 10, 20]); ctrl = vx; src = vx.mul(k); out = src.mul(Ro * RL).div(Ro + RL); }
          else { k = r.pick([20, 50, 80, 100, 150, 200]); ctrl = ix; src = ix.mul(k); out = src.mul(Ro * RL).div(Ro + RL); }
          const fin = (f) => Number.isInteger(r2(f.value * 1e4, 6));
          if (![vx, ix, src, out].every(fin) || out.value > 20 || out.value < 0.05) continue;
          const vIn = type[0] === "V";
          const vsrcOut = type.endsWith("VS");
          const gainName = { VCVS: `${it("μ")}`, CCVS: `${sym("r", "m")}`, VCCS: `${sym("g", "m")}`, CCCS: `${it("β")}` }[type];
          const gainTxt = { VCVS: `${it("μ")} = ${n(k)}`, CCVS: `${sym("r", "m")} = ${q(k, KOHM)}`, VCCS: `${sym("g", "m")} = ${q(k, "mS")}`, CCCS: `${it("β")} = ${n(k)}` }[type];
          const ctrlName = vIn ? sym("v", "x") : sym("i", "x");
          const what = { VCVS: "voltage-controlled voltage source", CCVS: "current-controlled voltage source", VCCS: "voltage-controlled current source", CCCS: "current-controlled current source" }[type];
          const outDesc = vsrcOut
            ? `drives ${sym("R", "L")} = ${q(RL, KOHM)} through an output resistance ${sym("R", "o")} = ${q(Ro, KOHM)} in series`
            : `pushes its current into ${sym("R", "o")} = ${q(Ro, KOHM)} and ${sym("R", "L")} = ${q(RL, KOHM)}, which are in parallel from the output node to ground`;
          const ctrlUnit = vIn ? "V" : "mA", srcUnit = vsrcOut ? "V" : "mA";
          const plain = { VCVS: "μvx", CCVS: "rm·ix", VCCS: "gm·vx", CCCS: "β·ix" }[type];
          const items = [...vsrc([0, 0], [0, 4], "vs"), ...res([0, 4], [3.5, 4], "Rs"), ...res([3.5, 4], [3.5, 0], "Rin"), W([0, 0], [3.5, 0]),
            { t: "poly", p: [[7, 2.6], [7.55, 2], [7, 1.4], [6.45, 2]] }, W([7, 4], [7, 2.6]), W([7, 1.4], [7, 0]), T(5.6, 2, plain),
            ...(vsrcOut ? [T(7, 2.25, "+"), T(7, 1.75, "−"), ...res([7, 4], [10.5, 4], "Ro"), ...res([10.5, 4], [10.5, 0], "RL"), W([7, 0], [10.5, 0])]
              : [{ t: "vec", a: [7, 1.7], b: [7, 2.3] }, W([7, 4], [12.5, 4]), ...res([9.5, 4], [9.5, 0], "Ro"), ...res([12.5, 4], [12.5, 0], "RL"), W([7, 0], [12.5, 0])]),
            T(vIn ? 4.6 : 2.2, vIn ? 3.2 : 2.6, vIn ? "+ vx" : "ix ↓")];
          const steps = [
            `In volts, ${sym("v", "s")} = ${q(vsm, "mV")} = ${q(vs.value, "V")}.`,
            vIn ? `Input side: ${sym("v", "x")} is the voltage across ${sym("R", "in")}, a divider of ${sym("v", "s")}: ${sym("v", "x")} = ${n(vs.value)} × ${M.frac(n(Rin), `${n(Rs)} + ${n(Rin)}`)} = ${q(vx.value, "V")}.`
              : `Input side: ${sym("i", "x")} is the current through ${sym("R", "s")} and ${sym("R", "in")} in series: ${sym("i", "x")} = ${M.frac(n(vs.value), `${n(Rs)} + ${n(Rin)}`)} = ${q(ix.value, "mA")} (volts over kilohms).`,
            `The dependent source is set by that ${vIn ? "voltage" : "current"}: ${gainName}${ctrlName} = ${n(k)} × ${n(ctrl.value)} = ${q(src.value, srcUnit)}${type === "VCCS" ? " (mS × V = mA)" : type === "CCVS" ? " (kΩ × mA = V)" : ""}.`,
            vsrcOut ? `Output side is a divider: ${sym("v", "out")} = ${n(src.value)} × ${M.frac(n(RL), `${n(Ro)} + ${n(RL)}`)} = ${q(out.value, "V")}.`
              : `${sym("R", "o")}${par}${sym("R", "L")} = ${M.frac(`${n(Ro)} × ${n(RL)}`, `${n(Ro)} + ${n(RL)}`)} = ${q((Ro * RL) / (Ro + RL), KOHM)}, so ${sym("v", "out")} = ${n(src.value)} × ${n((Ro * RL) / (Ro + RL))} = ${q(out.value, "V")}.`,
            `Overall voltage gain: ${M.frac(n(out.value), n(vs.value))} ${approx(out.value / vs.value)} ${n(out.value / vs.value)}. A dependent source is how amplifiers and transistors are modeled.`,
          ];
          return {
            prompt: `An amplifier is modeled as shown. The input source ${sym("v", "s")} = ${q(vsm, "mV")} has a series resistance ${sym("R", "s")} = ${q(Rs, KOHM)} and feeds the amplifier's input resistance ${sym("R", "in")} = ${q(Rin, KOHM)}. A ${what} with ${gainTxt}, controlled by ${vIn ? `the voltage ${sym("v", "x")} across ${sym("R", "in")}` : `the current ${sym("i", "x")} into ${sym("R", "in")}`}, ${outDesc}. Find the output voltage ${sym("v", "out")} across ${sym("R", "L")}, in volts.`,
            graph: fig([-2.5, vsrcOut ? 13 : 15, -1, 5], items),
            steps,
            answer: { kind: "number", value: out.value }, answerText: q(out.value, "V"), answerInput: String(r2(out.value, 6)),
            vals: { vs: vs.value, ctrl: ctrl.value, src: src.value, out: out.value, par: (Ro * RL) / (Ro + RL), gain: out.value / vs.value, sumIn: Rs + Rin, sumOut: Ro + RL },
            params: { type, vsm, Rs, Rin, k, Ro, RL },
          };
        }
      },
    },
    // ---- EE.7 Nodal & mesh analysis ------------------------------------------------------------------------
    "EE.5": {
      title: "Nodal and mesh analysis",
      generate(r, level) {
        const KV = [1, 2, 3, 4, 5, 6, 8, 10, 12];
        const kx = (k, s) => (k === 1 ? s : k === -1 ? `−${s}` : `${n(k)}${s}`);
        const VA = sym("V", "A"), VB = sym("V", "B"), Va = sym("V", "a");
        if (level === 1) {
          for (;;) {
            const R1 = r.pick(KV), R2 = r.pick(KV), R3 = r.pick(KV), va = r.int(1, 12), V1 = r.int(2, 24);
            const V2f = new Frac(va).add(new Frac(R2).mul(new Frac(va, R3).add(new Frac(va - V1, R1))));
            if (!V2f.isInt() || V2f.n < 1 || V2f.n > 30 || V2f.n === V1 || V2f.n === va || V1 === va) continue;
            const V2 = V2f.n, D = P.lcm(P.lcm(R1, R2), R3), a = D / R1, b = D / R2, c = D / R3, tot = a + b + c, rhs = a * V1 + b * V2;
            return {
              prompt: `Use nodal analysis to find the voltage ${Va} at node ${it("a")} (the bottom wire is ground). ${V(1)} = ${q(V1, "V")}, ${V(2)} = ${q(V2, "V")}, ${R(1)} = ${q(R1, KOHM)}, ${R(2)} = ${q(R2, KOHM)}, ${R(3)} = ${q(R3, KOHM)}.`,
              graph: fig([-2.5, 11, -1, 5], [...vsrc([0, 0], [0, 4], pn("V", 1)), ...res([0, 4], [4, 4], pn("R", 1)), dot(4, 4, "a"), ...res([4, 4], [4, 0], pn("R", 3)), ...res([4, 4], [8, 4], pn("R", 2)),
                ...vsrc([8, 0], [8, 4], pn("V", 2), false, 1), W([0, 0], [8, 0])]),
              steps: [
                `KCL at node ${it("a")}, writing every current as leaving through its resistor: ${M.frac(`${Va} − ${n(V1)}`, n(R1))} + ${M.frac(`${Va} − ${n(V2)}`, n(R2))} + ${M.frac(Va, n(R3))} = 0.`,
                `Multiply every term by ${n(D)}, the least common multiple of the denominators: ${kx(a, `(${Va} − ${n(V1)})`)} + ${kx(b, `(${Va} − ${n(V2)})`)} + ${kx(c, Va)} = 0.`,
                `Collect: (${n(a)} + ${n(b)} + ${n(c)})${Va} = ${n(a)} × ${n(V1)} + ${n(b)} × ${n(V2)}, so ${n(tot)}${Va} = ${n(rhs)}.`,
                `${Va} = ${M.frac(n(rhs), n(tot))} = ${q(va, "V")}.`,
              ],
              answer: { kind: "number", value: va }, answerText: q(va, "V"), answerInput: String(va),
              vals: { D, a, b, c, tot, rhs, va }, params: { V1, V2, R1, R2, R3 },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const R1 = r.int(1, 6), R2 = r.int(1, 6), R3 = r.int(1, 6), I1 = r.int(1, 6), I2 = r.intExcept(-4, 5, 0);
            const a = R1 + R3, b = R2 + R3, c = R3, V1 = a * I1 - c * I2, V2 = c * I1 - b * I2;
            if (V1 < 1 || V1 > 40 || V2 < 1 || V2 > 40) continue;
            const det = a * b - c * c, num1 = V1 * b - c * V2, num2 = c * V1 - a * V2;
            return {
              prompt: `Use mesh analysis to find the clockwise mesh currents ${I(1)} (left window) and ${I(2)} (right window), in mA. ${V(1)} = ${q(V1, "V")}, ${V(2)} = ${q(V2, "V")} (both + at the top), ${R(1)} = ${q(R1, KOHM)}, ${R(2)} = ${q(R2, KOHM)}, and ${R(3)} = ${q(R3, KOHM)} is shared by both meshes. Enter ${I(1)}, ${I(2)}.`,
              graph: fig([-2.5, 11.5, -1, 5], [...vsrc([0, 0], [0, 4], pn("V", 1)), ...res([0, 4], [4.5, 4], pn("R", 1)), ...res([4.5, 4], [4.5, 0], pn("R", 3)), ...res([4.5, 4], [9, 4], pn("R", 2)),
                ...vsrc([9, 0], [9, 4], pn("V", 2), false, 1), W([0, 0], [9, 0]), T(2.2, 2, `${pn("I", 1)} ↻`), T(7.4, 1, `${pn("I", 2)} ↻`)]),
              steps: [
                `Mesh 1, clockwise: up through ${V(1)} is a rise; ${R(1)} carries ${I(1)}; the shared ${R(3)} carries ${I(1)} − ${I(2)} downward. KVL: ${V(1)} = ${R(1)}${I(1)} + ${R(3)}(${I(1)} − ${I(2)}), so (${n(R1)} + ${n(R3)})${I(1)} − ${kx(R3, I(2))} = ${n(V1)}: ${kx(a, I(1))} − ${kx(c, I(2))} = ${n(V1)}.`,
                `Mesh 2, clockwise: ${R(2)} carries ${I(2)}; going down through ${V(2)} from + to − is a drop; ${R(3)} carries ${I(2)} − ${I(1)} upward. KVL: ${R(2)}${I(2)} + ${V(2)} + ${R(3)}(${I(2)} − ${I(1)}) = 0, so −${kx(c, I(1))} + ${kx(b, I(2))} = −${n(V2)}.`,
                `Determinant of the coefficients: Δ = ${n(a)} × ${n(b)} − ${n(c)} × ${n(c)} = ${n(det)}.`,
                `Cramer's rule: ${I(1)} = ${M.frac(`${n(V1)} × ${n(b)} − ${n(c)} × ${n(V2)}`, n(det))} = ${M.frac(n(num1), n(det))} = ${q(I1, "mA")}.`,
                `${I(2)} = ${M.frac(`${n(c)} × ${n(V1)} − ${n(a)} × ${n(V2)}`, n(det))} = ${M.frac(n(num2), n(det))} = ${q(I2, "mA")}${I2 < 0 ? " (negative: it actually circulates counterclockwise)" : ""}. Volts over kilohms give milliamps.`,
              ],
              answer: { kind: "numbers", values: [I1, I2], ordered: true }, answerText: `${I(1)} = ${q(I1, "mA")}, ${I(2)} = ${q(I2, "mA")}`, answerInput: `${I1}, ${I2}`,
              vals: { a, b, c, det, num1, num2, I1, I2 }, params: { V1, V2, R1, R2, R3 },
            };
          }
        }
        // level 3: two unknown node voltages
        for (;;) {
          const R1 = r.pick(KV), R2 = r.pick(KV), R3 = r.pick(KV), R4 = r.pick(KV), vA = r.int(2, 12), vB = r.intExcept(1, 12, vA);
          const Vsf = new Frac(vA).add(new Frac(R1).mul(new Frac(vA, R2).add(new Frac(vA - vB, R3))));
          const Isf = new Frac(vB - vA, R3).add(new Frac(vB, R4));
          if (!Vsf.isInt() || Vsf.n < 2 || Vsf.n > 40 || Isf.n <= 0 || !Isf.mul(4).isInt() || Isf.value > 12) continue;
          const Vs = Vsf.n, Is = Isf.value;
          const DA = P.lcm(P.lcm(R1, R2), R3), a1 = DA / R1, a2 = DA / R2, a3 = DA / R3, eA = a1 + a2 + a3, gA = a1 * Vs;
          const DB = P.lcm(R3, R4), b3 = DB / R3, b4 = DB / R4, eB = b3 + b4, gB = DB * Is;
          const det = eA * eB - a3 * b3, numA = gA * eB + a3 * gB, numB = eA * gB + b3 * gA;
          if (numA !== vA * det || numB !== vB * det) throw new Error("nodal solution mismatch");
          return {
            prompt: `Find the node voltages ${VA} and ${VB} (bottom wire is ground) for ${sym("V", "s")} = ${q(Vs, "V")}, ${sym("I", "s")} = ${q(Is, "mA")}, ${R(1)} = ${q(R1, KOHM)}, ${R(2)} = ${q(R2, KOHM)}, ${R(3)} = ${q(R3, KOHM)}, ${R(4)} = ${q(R4, KOHM)}. Enter ${VA}, ${VB}.`,
            graph: fig([-2.5, 13.5, -1, 5], [...vsrc([0, 0], [0, 4], "Vs"), ...res([0, 4], [3.5, 4], pn("R", 1)), dot(3.5, 4, "A"), ...res([3.5, 4], [3.5, 0], pn("R", 2)), ...res([3.5, 4], [7.5, 4], pn("R", 3)),
              dot(7.5, 4, "B"), ...res([7.5, 4], [7.5, 0], pn("R", 4)), W([7.5, 4], [11, 4]), ...isrc([11, 0], [11, 4], "Is"), W([0, 0], [11, 0])]),
            steps: [
              `KCL at A, every current leaving: ${M.frac(`${VA} − ${n(Vs)}`, n(R1))} + ${M.frac(VA, n(R2))} + ${M.frac(`${VA} − ${VB}`, n(R3))} = 0.`,
              `KCL at B, where the source pushes ${sym("I", "s")} in: ${M.frac(`${VB} − ${VA}`, n(R3))} + ${M.frac(VB, n(R4))} = ${n(Is)}.`,
              `Clear the fractions: multiply A's equation by ${n(DA)}: (${n(a1)} + ${n(a2)} + ${n(a3)})${VA} − ${kx(a3, VB)} = ${n(a1)} × ${n(Vs)}, so ${kx(eA, VA)} − ${kx(a3, VB)} = ${n(gA)}. Multiply B's by ${n(DB)}: −${kx(b3, VA)} + ${kx(eB, VB)} = ${n(gB)}.`,
              `Determinant: Δ = ${n(eA)} × ${n(eB)} − ${n(a3)} × ${n(b3)} = ${n(det)}.`,
              `Cramer's rule: ${VA} = ${M.frac(`${n(gA)} × ${n(eB)} + ${n(a3)} × ${n(gB)}`, n(det))} = ${M.frac(n(numA), n(det))} = ${q(vA, "V")}, and ${VB} = ${M.frac(`${n(eA)} × ${n(gB)} + ${n(b3)} × ${n(gA)}`, n(det))} = ${M.frac(n(numB), n(det))} = ${q(vB, "V")}.`,
            ],
            answer: { kind: "numbers", values: [vA, vB], ordered: true }, answerText: `${VA} = ${q(vA, "V")}, ${VB} = ${q(vB, "V")}`, answerInput: `${vA}, ${vB}`,
            vals: { DA, a1, a2, a3, eA, gA, DB, b3, b4, eB, gB, det, numA, numB, vA, vB }, params: { Vs, Is, R1, R2, R3, R4 },
          };
        }
      },
    },

    // ---- EE.8 Superposition ----------------------------------------------------------------------------------
    "EE.superposition": {
      title: "Superposition",
      generate(r, level) {
        for (;;) {
          const [R1, R2] = r.shuffle(r.pick(PAIRS.filter(([a, b]) => b <= 30))), Vs = r.int(2, 24), Is = r.int(1, 6), up = level === 1 ? true : r.chance(0.5);
          const sum = R1 + R2, Rp = (R1 * R2) / sum, va1 = (Vs * R2) / sum, va2 = (up ? 1 : -1) * Is * Rp, va = va1 + va2;
          if (!Number.isInteger(va1 * 2) || va === 0) continue;
          const Va = sym("V", "a");
          const items = [...vsrc([0, 0], [0, 4], `${fmt(Vs)} V`), ...res([0, 4], [4, 4], `${pn("R", 1)} = ${fmt(R1)} kΩ`), dot(4, 4, "a"), ...res([4, 4], [4, 0], `${pn("R", 2)} = ${fmt(R2)} kΩ`),
            W([4, 4], [8.5, 4]), ...isrc([8.5, 0], [8.5, 4], `${fmt(Is)} mA`, !up), W([0, 0], [8.5, 0])];
          const desc = `In the circuit, ${art(Vs)} ${q(Vs, "V")} source feeds node ${it("a")} through ${R(1)} = ${q(R1, KOHM)}; ${R(2)} = ${q(R2, KOHM)} runs from ${it("a")} to ground; and ${art(Is)} ${q(Is, "mA")} current source ${up ? "pushes current into" : "pulls current out of"} node ${it("a")}.`;
          const sV = `Voltage source alone: switch the current source off. A current source at zero is an open circuit, so ${R(1)} and ${R(2)} form a divider: ${Va}′ = ${n(Vs)} × ${M.frac(n(R2), `${n(R1)} + ${n(R2)}`)} = ${q(va1, "V")}.`;
          const sI = `Current source alone: switch the voltage source off. A voltage source at zero is a short circuit, so ${R(1)} now also runs from ${it("a")} to ground, in parallel with ${R(2)}: ${R(1)}${par}${R(2)} = ${M.frac(`${n(R1)} × ${n(R2)}`, `${n(R1)} + ${n(R2)}`)} = ${q(Rp, KOHM)}. The source ${up ? "drives" : "pulls"} ${q(Is, "mA")} ${up ? "into" : "out of"} it: ${Va}″ = ${up ? "" : "−"}${n(Is)} × ${n(Rp)} = ${q(va2, "V")}.`;
          if (level === 1) {
            const which = r.pick(["V", "I"]), ans = which === "V" ? va1 : va2;
            return {
              prompt: `${desc} By superposition, how much of the voltage ${Va} is due to the ${which === "V" ? "voltage" : "current"} source acting alone?`,
              graph: fig([-2.5, 11, -1, 5], items),
              steps: [`Superposition: in a linear circuit each source's contribution can be found with the other independent sources switched off.`, which === "V" ? sV : sI],
              answer: { kind: "number", value: ans }, answerText: q(ans, "V"), answerInput: String(ans),
              vals: which === "V" ? { sum, va1 } : { Rp, va2, prod: R1 * R2, sum }, params: { R1, R2, Vs, Is, up: up ? 1 : 0, which },
            };
          }
          if (level === 2) {
            return {
              prompt: `${desc} Use superposition to find ${Va}.`,
              graph: fig([-2.5, 11, -1, 5], items),
              steps: [sV, sI, `Add the contributions with their signs: ${Va} = ${n(va1)} + ${np(va2)} = ${q(va, "V")}.`],
              answer: { kind: "number", value: va }, answerText: q(va, "V"), answerInput: String(va),
              vals: { sum, va1, Rp, va2, prod: R1 * R2, va }, params: { R1, R2, Vs, Is, up: up ? 1 : 0 },
            };
          }
          const Pt = (va * va) / R2, P1 = (va1 * va1) / R2, P2 = (va2 * va2) / R2;
          if (tie(Pt, 2) || tie(P1, 2) || tie(P2, 2) || tie(P1 + P2, 2)) continue;
          return {
            prompt: `${desc} How much power does ${R(2)} absorb, in milliwatts? Round to 2 decimal places.`,
            graph: fig([-2.5, 11, -1, 5], items),
            steps: [sV, sI, `Total: ${Va} = ${n(va1)} + ${np(va2)} = ${q(va, "V")}.`,
              `Power is not superposable, because it is quadratic: compute it from the total voltage. ${it("P")} = ${M.frac(M.sup(Va, 2), R(2))} = ${M.frac(M.sup(np(va), 2), n(R2))} ${approx(Pt, 2)} ${q(Pt, "mW", 2)} (V²/kΩ = mW).`,
              `Adding the powers of the separate contributions would give ${M.frac(M.sup(np(va1), 2), n(R2))} + ${M.frac(M.sup(np(va2), 2), n(R2))} ${approx(P1 + P2, 2)} ${q(P1 + P2, "mW", 2)}, which is wrong: the cross term 2${it("v")}′${it("v")}″/${R(2)} is missing.`],
            answer: { kind: "number", value: Pt, dp: 2 }, answerText: q(Pt, "mW", 2), answerInput: r2(Pt, 2).toString(),
            vals: { sum, va1, Rp, va2, prod: R1 * R2, va, Pt, Psum: P1 + P2 }, params: { R1, R2, Vs, Is, up: up ? 1 : 0 },
          };
        }
      },
    },

    // ---- EE.9 Thévenin & Norton; maximum power transfer --------------------------------------------------
    "EE.4": {
      title: "Thévenin and Norton equivalents; maximum power",
      generate(r, level) {
        const Vth = sym("V", "th"), Rth = sym("R", "th"), RL = sym("R", "L");
        if (level === 1) {
          const kind = r.int(0, 2);
          for (;;) {
            const vth = r.int(3, 24), rth = r.pick([1, 2, 3, 4, 5, 6, 8, 10]), rl = r.pick([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
            if (kind === 0) {
              const iL = vth / (rth + rl);
              if (!Number.isInteger(iL * 4)) continue;
              return {
                prompt: `A circuit's Thévenin equivalent is ${Vth} = ${q(vth, "V")} in series with ${Rth} = ${q(rth, KOHM)}. What current flows into ${art(rl)} ${q(rl, KOHM)} load?`,
                steps: [`With the equivalent drawn, the load completes a single series loop: ${it("I")} = ${M.frac(Vth, `${Rth} + ${RL}`)}.`, `${it("I")} = ${M.frac(n(vth), `${n(rth)} + ${n(rl)}`)} = ${M.frac(n(vth), n(rth + rl))} = ${q(iL, "mA")}.`],
                answer: { kind: "number", value: iL }, answerText: q(iL, "mA"), answerInput: String(iL), vals: { sum: rth + rl, iL }, params: { kind, vth, rth, rl },
              };
            }
            if (kind === 1) {
              const vL = (vth * rl) / (rth + rl);
              if (!Number.isInteger(vL * 4)) continue;
              return {
                prompt: `A circuit's Thévenin equivalent is ${Vth} = ${q(vth, "V")} in series with ${Rth} = ${q(rth, KOHM)}. What voltage appears across ${art(rl)} ${q(rl, KOHM)} load?`,
                steps: [`The load and ${Rth} form a voltage divider: ${sym("V", "L")} = ${Vth}${M.frac(RL, `${Rth} + ${RL}`)}.`, `${sym("V", "L")} = ${n(vth)} × ${M.frac(n(rl), n(rth + rl))} = ${q(vL, "V")}.`],
                answer: { kind: "number", value: vL }, answerText: q(vL, "V"), answerInput: String(vL), vals: { sum: rth + rl, vL }, params: { kind, vth, rth, rl },
              };
            }
            const iN = vth / rth;
            if (!Number.isInteger(iN * 4)) continue;
            return {
              prompt: `Convert the Thévenin equivalent ${Vth} = ${q(vth, "V")}, ${Rth} = ${q(rth, KOHM)} to its Norton equivalent. What is the Norton current ${sym("I", "N")}?`,
              steps: [`The Norton current is the short-circuit current: shorting the terminals leaves ${Vth} across ${Rth} alone, so ${sym("I", "N")} = ${M.frac(Vth, Rth)}.`, `${sym("I", "N")} = ${M.frac(n(vth), n(rth))} = ${q(iN, "mA")}, in parallel with the same ${q(rth, KOHM)}.`],
              answer: { kind: "number", value: iN }, answerText: q(iN, "mA"), answerInput: String(iN), vals: { iN }, params: { kind, vth, rth },
            };
          }
        }
        const net = () => {
          for (;;) {
            const [R1, R2] = r.shuffle(r.pick(PAIRS.filter(([a, b]) => b <= 30))), R3 = r.pick([1, 2, 3, 4, 5, 6, 8, 10]), Vs = r.int(3, 30);
            const vth = (Vs * R2) / (R1 + R2), p = (R1 * R2) / (R1 + R2), rth = p + R3;
            if (!Number.isInteger(vth * 2)) continue;
            return { R1, R2, R3, Vs, vth, p, rth };
          }
        };
        const netFig = (c) => fig([-2.5, 9.5, -1, 5], [...vsrc([0, 0], [0, 4], `${fmt(c.Vs)} V`), ...res([0, 4], [3.5, 4], `${pn("R", 1)} = ${fmt(c.R1)} kΩ`), ...res([3.5, 4], [3.5, 0], `${pn("R", 2)} = ${fmt(c.R2)} kΩ`),
          ...res([3.5, 4], [7.5, 4], `${pn("R", 3)} = ${fmt(c.R3)} kΩ`), dot(7.5, 4, "a"), dot(7.5, 0, "b"), W([0, 0], [7.5, 0])]);
        const netSteps = (c) => [
          `${Vth} is the open-circuit voltage at ${it("a")}–${it("b")}. With nothing connected, no current flows in ${R(3)}, so ${Vth} is the voltage across ${R(2)}: ${n(c.Vs)} × ${M.frac(n(c.R2), `${n(c.R1)} + ${n(c.R2)}`)} = ${q(c.vth, "V")}.`,
          `${Rth}: switch the source off (a voltage source becomes a short). Looking in from ${it("a")}–${it("b")}, ${R(1)}${par}${R(2)} = ${M.frac(`${n(c.R1)} × ${n(c.R2)}`, `${n(c.R1)} + ${n(c.R2)}`)} = ${q(c.p, KOHM)}, in series with ${R(3)}: ${Rth} = ${n(c.p)} + ${n(c.R3)} = ${q(c.rth, KOHM)}.`,
        ];
        if (level === 2) {
          const c = net();
          return {
            prompt: `Find the Thévenin equivalent of the circuit seen from terminals ${it("a")}–${it("b")}. Enter ${Vth} (V), ${Rth} (kΩ).`,
            graph: netFig(c), steps: netSteps(c),
            answer: { kind: "numbers", values: [c.vth, c.rth], ordered: true }, answerText: `${Vth} = ${q(c.vth, "V")}, ${Rth} = ${q(c.rth, KOHM)}`, answerInput: `${c.vth}, ${c.rth}`,
            vals: { sum: c.R1 + c.R2, vth: c.vth, prod: c.R1 * c.R2, p: c.p, rth: c.rth }, params: { R1: c.R1, R2: c.R2, R3: c.R3, Vs: c.Vs },
          };
        }
        if (r.chance(0.5)) {
          for (;;) {
            const c = net(), Pmax = (c.vth * c.vth) / (4 * c.rth);
            if (tie(Pmax, 2)) continue;
            return {
              prompt: `What load resistance connected across ${it("a")}–${it("b")} receives the most power, and how much power is that? Enter ${RL} (kΩ), ${sym("P", "max")} (mW, rounded to 2 decimal places).`,
              graph: netFig(c),
              steps: [...netSteps(c),
                `Maximum power transfer: the load gets the most power when it matches the source's resistance, ${RL} = ${Rth} = ${q(c.rth, KOHM)}.`,
                `Then half of ${Vth} appears across the load: ${sym("P", "max")} = ${M.frac(M.sup(Vth, 2), `4${Rth}`)} = ${M.frac(M.sup(n(c.vth), 2), `4 × ${n(c.rth)}`)} ${approx(Pmax, 2)} ${q(Pmax, "mW", 2)}. The same power is lost inside the source, so the efficiency is only 50%.`],
              answer: { kind: "numbers", values: [c.rth, Pmax], ordered: true, dp: 2 }, answerText: `${RL} = ${q(c.rth, KOHM)}, ${sym("P", "max")} ${approx(Pmax, 2)} ${q(Pmax, "mW", 2)}`, answerInput: `${c.rth}, ${r2(Pmax, 2)}`,
              vals: { sum: c.R1 + c.R2, vth: c.vth, prod: c.R1 * c.R2, p: c.p, rth: c.rth, Pmax }, params: { R1: c.R1, R2: c.R2, R3: c.R3, Vs: c.Vs }, consts: [4, 50],
            };
          }
        }
        for (;;) {
          const Voc = r.pick([3, 5, 6, 9, 12, 15, 18, 24]), Isc = r.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 30]), rth = Voc / Isc, Pmax = (Voc * Isc) / 4;
          if (!Number.isInteger(rth * 100) || rth < 0.2 || !Number.isInteger(Pmax * 100)) continue;
          const half = Voc / 2, ihalf = Isc / 2;
          return {
            prompt: `A circuit's output terminals read ${q(Voc, "V")} with nothing connected. Shorting them through an ammeter gives ${q(Isc, "mA")}. The circuit is linear. What load resistance would draw the most power from it, and how much power is that? Enter ${RL} (kΩ), ${sym("P", "max")} (mW).`,
            steps: [
              `The open-circuit voltage is ${Vth} = ${q(Voc, "V")}; the short-circuit current is the Norton current ${sym("I", "N")} = ${q(Isc, "mA")}.`,
              `${Rth} = ${M.frac(sym("V", "oc"), sym("I", "sc"))} = ${M.frac(n(Voc), n(Isc))} = ${q(rth, KOHM)}. Maximum power transfer needs ${RL} = ${Rth} = ${q(rth, KOHM)}.`,
              `A matched load sees half the open-circuit voltage, ${q(half, "V")}, and half the short-circuit current, ${q(ihalf, "mA")}: ${sym("P", "max")} = ${n(half)} × ${n(ihalf)} = ${q(Pmax, "mW")} (the same as ${M.frac(M.sup(Vth, 2), `4${Rth}`)}).`,
            ],
            answer: { kind: "numbers", values: [rth, Pmax], ordered: true }, answerText: `${RL} = ${q(rth, KOHM)}, ${sym("P", "max")} = ${q(Pmax, "mW")}`, answerInput: `${rth}, ${Pmax}`,
            vals: { rth, half, ihalf, Pmax }, params: { Voc, Isc }, consts: [4],
          };
        }
      },
    },
    // ---- EE.10 Capacitors & inductors ------------------------------------------------------------------------
    "EE.6": {
      title: "Capacitors and inductors",
      generate(r, level) {
        if (level === 1) {
          const kind = r.int(0, 2);
          if (kind === 0) {
            const Cv = r.pick([1, 2.2, 4.7, 10, 22, 47, 100, 220, 470]), Vv = r.pick([3, 5, 6, 9, 12, 15, 24]), Q = r2(Cv * Vv, 6);
            return {
              prompt: `${cap1(art(Cv))} ${q(Cv, "μF")} capacitor is charged to ${q(Vv, "V")}. How much charge does it hold, in microcoulombs?`,
              steps: [`Capacitance is charge stored per volt: ${it("Q")} = ${it("C")}${it("V")}.`, `${it("Q")} = ${n(Cv)}&nbsp;μF × ${n(Vv)}&nbsp;V = ${q(Q, "μC")}.`],
              answer: { kind: "number", value: Q }, answerText: q(Q, "μC"), answerInput: String(Q), vals: { Q }, params: { kind, C: Cv, V: Vv },
            };
          }
          if (kind === 1) {
            const Cv = r.pick([10, 22, 47, 100, 220, 470, 1000]), Vv = r.pick([5, 9, 12, 15, 24, 50]), VV = Vv * Vv, Euj = (Cv * VV) / 2, Emj = Euj / 1000;
            return {
              prompt: `How much energy does ${art(Cv)} ${q(Cv, "μF")} capacitor store at ${q(Vv, "V")}? Give the answer in millijoules.`,
              steps: [`${sym("E", "C")} = ½${it("C")}${M.sup(it("V"), 2)}, stored in the electric field between the plates.`,
                `${sym("E", "C")} = ½ × ${n(Cv)}&nbsp;μF × ${M.sup(n(Vv), 2)}&nbsp;V² = ½ × ${n(Cv)} × ${n(VV)} = ${Number.isInteger(Euj) ? big(Euj) : n(Euj)}&nbsp;μJ = ${q(Emj, "mJ")}.`],
              answer: { kind: "number", value: Emj }, answerText: q(Emj, "mJ"), answerInput: String(Emj), vals: { VV, Euj, Emj }, params: { kind, C: Cv, V: Vv }, consts: [1000],
            };
          }
          const Lv = r.pick([1, 2, 5, 10, 20, 50, 100]), Iv = r.pick([0.5, 1, 2, 3, 4, 5]), II = Iv * Iv, E = (Lv * II) / 2;
          return {
            prompt: `${cap1(art(Lv))} ${q(Lv, "mH")} inductor carries a steady ${q(Iv, "A")}. How much energy is stored in its magnetic field, in millijoules?`,
            steps: [`${sym("E", "L")} = ½${it("L")}${M.sup(it("I"), 2)}, the magnetic counterpart of ½${it("C")}${M.sup(it("V"), 2)}.`,
              `${sym("E", "L")} = ½ × ${n(Lv)}&nbsp;mH × ${M.sup(n(Iv), 2)}&nbsp;A² = ½ × ${n(Lv)} × ${n(II)} = ${q(E, "mJ")} (mH × A² = mJ).`],
            answer: { kind: "number", value: E }, answerText: q(E, "mJ"), answerInput: String(E), vals: { II, E }, params: { kind, L: Lv, I: Iv },
          };
        }
        if (level === 2) {
          // a piecewise-linear capacitor voltage (or inductor current) read from a graph
          for (;;) {
            const isC = r.chance(0.5), k = isC ? r.pick([1, 2, 3, 4, 5, 10]) : r.pick([1, 2, 4, 5, 10, 20]);
            const t1 = r.int(1, 3), t2 = t1 + r.int(1, 4), t3 = t2 + r.int(1, 3);
            const y1 = r.int(-6, 8), y2 = r.int(-6, 8), y3 = r.int(-6, 8);
            if (t3 > 10 || y1 === 0 || y1 === y2 || y2 === y3) continue;
            const seg = r.int(1, 3), ts = [0, t1, t2, t3], ys = [0, y1, y2, y3];
            const ta = ts[seg - 1], tb = ts[seg], ya = ys[seg - 1], yb = ys[seg], dy = yb - ya, dt = tb - ta, slope = dy / dt, out = k * slope;
            if (!Number.isInteger(r2(out * 100, 6))) continue;
            const lo = Math.min(0, y1, y2, y3) - 1, hi = Math.max(0, y1, y2, y3) + 1;
            const g = graph({ view: [0, 11, lo, hi], items: [W([0, 0], [t1, y1]), W([t1, y1], [t2, y2]), W([t2, y2], [t3, y3]), dot(t1, y1), dot(t2, y2), dot(t3, y3)] });
            const qty = isC ? "voltage across" : "current through", unitY = isC ? "V" : "A", unitO = isC ? "mA" : "V";
            return {
              prompt: `The graph shows the ${qty} ${art(k)} ${q(k, isC ? "μF capacitor" : "mH inductor")} (in ${unitY}) against time (in ms); the corners sit on grid points. What is the ${isC ? "current through the capacitor" : "voltage across the inductor"} between ${it("t")} = ${q(ta, "ms")} and ${q(tb, "ms")}, in ${unitO}?`,
              graph: g,
              steps: [
                isC ? `A capacitor passes current only while its voltage changes: ${it("i")} = ${it("C")}${M.frac(`${it("dv")}`, `${it("dt")}`)}. On a straight segment ${M.frac(it("dv"), it("dt"))} is the slope.`
                  : `An inductor has voltage only while its current changes: ${it("v")} = ${it("L")}${M.frac(`${it("di")}`, `${it("dt")}`)}. On a straight segment ${M.frac(it("di"), it("dt"))} is the slope.`,
                `Between ${q(ta, "ms")} and ${q(tb, "ms")} the ${isC ? "voltage" : "current"} goes from ${q(ya, unitY)} to ${q(yb, unitY)}: slope = ${M.frac(`${n(yb)} − ${np(ya)}`, `${n(tb)} − ${n(ta)}`)} = ${M.frac(n(dy), n(dt))} ${approx(slope)} ${n(slope)}&nbsp;${unitY}/ms.`,
                `${isC ? it("i") : it("v")} = ${n(k)} × ${np(r2(slope, 10))} ${approx(out)} ${q(out, unitO)} (${isC ? "μF × V/ms = mA" : "mH × A/ms = V"})${out < 0 ? `; the minus sign means it is opposite to the passive-sign reference ${isC ? "direction (current flows out of the + plate)" : "polarity"}` : ""}.`,
              ],
              answer: { kind: "number", value: out }, answerText: q(out, unitO), answerInput: String(r2(out, 6)),
              vals: { dy, dt, slope, out }, params: { isC: isC ? 1 : 0, k, t1, t2, t3, y1, y2, y3, seg },
            };
          }
        }
        // level 3: charge sharing between two capacitors
        for (;;) {
          const C1 = r.pick([1, 2, 3, 4, 5, 6, 10]), C2 = r.pick([1, 2, 3, 4, 5, 6, 10]), V0 = r.pick([6, 9, 10, 12, 15, 18, 20, 24, 30]);
          const Q = C1 * V0, Ct = C1 + C2, Vf = Q / Ct;
          if (!Number.isInteger(Vf * 2)) continue;
          const E0 = (C1 * V0 * V0) / 2, E1 = (Ct * Vf * Vf) / 2, lost = E0 - E1;
          return {
            prompt: `${C(1)} = ${q(C1, "μF")} is charged to ${q(V0, "V")} and disconnected. It is then connected across an uncharged ${C(2)} = ${q(C2, "μF")}. What is the final common voltage, and how much energy is lost in the transfer? Enter the voltage (V), the energy lost (μJ).`,
            steps: [
              `Charge is conserved: ${it("Q")} = ${C(1)}${sym("V", 0)} = ${n(C1)} × ${n(V0)} = ${q(Q, "μC")}.`,
              `Connected together, the capacitors are in parallel and share one voltage: ${sym("V", "f")} = ${M.frac(it("Q"), `${C(1)} + ${C(2)}`)} = ${M.frac(n(Q), n(Ct))} = ${q(Vf, "V")}.`,
              `Energy before: ½ × ${n(C1)} × ${M.sup(n(V0), 2)} = ${q(E0, "μJ")}. Energy after: ½ × ${n(Ct)} × ${M.sup(n(Vf), 2)} = ${q(E1, "μJ")}.`,
              `Lost: ${n(E0)} − ${n(E1)} = ${q(lost, "μJ")}, dissipated as heat (and radiation) in the connecting wires while the charge redistributed. Charge is conserved; stored energy is not.`,
            ],
            answer: { kind: "numbers", values: [Vf, lost], ordered: true }, answerText: `${q(Vf, "V")}; ${q(lost, "μJ")} lost`, answerInput: `${Vf}, ${lost}`,
            vals: { Q, Ct, Vf, E0, E1, lost }, params: { C1, C2, V0 },
          };
        }
      },
    },

    // ---- EE.11 RC & RL transients ------------------------------------------------------------------------------
    "EE.7": {
      title: "RC and RL transients",
      generate(r, level) {
        const tau = it("τ");
        if (level === 1) {
          if (r.chance(0.5)) {
            for (;;) {
              const Rv = r.pick([1, 2, 4.7, 10, 22, 47, 100]), Cv = r.pick([1, 2.2, 4.7, 10, 22, 47, 100]), t = r2(Rv * Cv, 6), five = r2(5 * t, 6);
              if (t > 2000) continue;
              return {
                prompt: `${cap1(art(Rv))} ${q(Rv, KOHM)} resistor charges ${art(Cv)} ${q(Cv, "μF")} capacitor. What is the time constant, in milliseconds?`,
                steps: [`For an RC circuit ${tau} = ${it("RC")}. Kilohms times microfarads gives milliseconds (10<sup>3</sup> × 10<sup>−6</sup> = 10<sup>−3</sup>).`,
                  `${tau} = ${n(Rv)} × ${n(Cv)} = ${q(t, "ms")}. After about 5${tau} = ${q(five, "ms")} the capacitor is within 1% of its final voltage.`],
                answer: { kind: "number", value: t }, answerText: q(t, "ms"), answerInput: String(t), vals: { tau: t, five }, params: { kind: 0, R: Rv, C: Cv }, consts: [10, 3, 6, 5],
              };
            }
          }
          for (;;) {
            const Lv = r.pick([10, 20, 50, 100, 200, 500]), Rv = r.pick([5, 10, 20, 25, 40, 50, 100]), t = Lv / Rv;
            if (!Number.isInteger(t * 100)) continue;
            return {
              prompt: `${cap1(art(Lv))} ${q(Lv, "mH")} inductor is in series with ${q(Rv, OHM)}. What is the time constant of the circuit, in milliseconds?`,
              steps: [`For an RL circuit ${tau} = ${M.frac(it("L"), it("R"))}. Millihenries over ohms gives milliseconds.`, `${tau} = ${M.frac(n(Lv), n(Rv))} = ${q(t, "ms")}.`],
              answer: { kind: "number", value: t }, answerText: q(t, "ms"), answerInput: String(t), vals: { tau: t }, params: { kind: 1, L: Lv, R: Rv },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const kind = r.int(0, 2), t0 = r.pick([1, 2, 5, 10]), x = r.pick([0.25, 0.5, 1, 1.5, 2, 2.5, 3]), t = t0 * x;
            const Vs = r.pick([5, 9, 10, 12, 15, 24]), e = Math.exp(-x), e4 = r2(e, 4);
            let val, val4, prompt, steps, unit, extra = {}, params, fn;
            if (kind === 0) {
              val = Vs * (1 - e); val4 = Vs * (1 - e4); unit = "V";
              prompt = `An uncharged capacitor charges through a resistor from ${art(Vs)} ${q(Vs, "V")} source; the time constant is ${q(t0, "ms")}. What is the capacitor voltage ${q(t, "ms")} after the switch closes? Round to 2 decimal places.`;
              steps = [`Charging from 0&nbsp;V: ${sym("v", "C")}(${it("t")}) = ${sym("V", "s")}(1 − ${M.sup("e", `−${it("t")}/${tau}`)}).`,
                `${M.frac(it("t"), tau)} = ${M.frac(n(t), n(t0))} = ${n(x)}, and ${M.sup("e", `−${n(x)}`)} ≈ ${n(e, 4)}.`,
                `${sym("v", "C")} = ${n(Vs)} × (1 − ${n(e, 4)}) ≈ ${q(val, "V", 2)}.`];
              params = { kind, Vs, t0, t }; fn = `${Vs}*(1-exp(-x/${t0}))`;
            } else if (kind === 1) {
              val = Vs * e; val4 = Vs * e4; unit = "V";
              prompt = `A capacitor charged to ${q(Vs, "V")} discharges through a resistor; the time constant is ${q(t0, "ms")}. What is its voltage ${q(t, "ms")} later? Round to 2 decimal places.`;
              steps = [`Discharging toward 0&nbsp;V: ${sym("v", "C")}(${it("t")}) = ${sym("V", 0)}${M.sup("e", `−${it("t")}/${tau}`)}.`,
                `${M.frac(it("t"), tau)} = ${M.frac(n(t), n(t0))} = ${n(x)}, and ${M.sup("e", `−${n(x)}`)} ≈ ${n(e, 4)}.`,
                `${sym("v", "C")} = ${n(Vs)} × ${n(e, 4)} ≈ ${q(val, "V", 2)}.`];
              params = { kind, Vs, t0, t }; fn = `${Vs}*exp(-x/${t0})`;
            } else {
              const Rv = r.pick([2, 4, 5, 10, 20]), Lv = Rv * t0, Ifin = Vs / Rv;
              if (!Number.isInteger(Ifin * 100)) continue;
              val = Ifin * (1 - e); val4 = Ifin * (1 - e4); unit = "A";
              prompt = `${cap1(art(Vs))} ${q(Vs, "V")} source is switched across ${art(Lv)} ${q(Lv, "mH")} inductor in series with ${q(Rv, OHM)}. What is the current ${q(t, "ms")} after the switch closes? Round to 2 decimal places.`;
              steps = [`The current rises toward ${M.frac(sym("V", "s"), it("R"))} = ${M.frac(n(Vs), n(Rv))} = ${q(Ifin, "A")} with ${tau} = ${M.frac(it("L"), it("R"))} = ${M.frac(n(Lv), n(Rv))} = ${q(t0, "ms")}: ${it("i")}(${it("t")}) = ${M.frac(sym("V", "s"), it("R"))}(1 − ${M.sup("e", `−${it("t")}/${tau}`)}).`,
                `${M.frac(it("t"), tau)} = ${M.frac(n(t), n(t0))} = ${n(x)}, and ${M.sup("e", `−${n(x)}`)} ≈ ${n(e, 4)}.`,
                `${it("i")} = ${n(Ifin)} × (1 − ${n(e, 4)}) ≈ ${q(val, "A", 2)}.`];
              extra = { Ifin }; params = { kind, Vs, R: Rv, L: Lv, t }; fn = `${Ifin}*(1-exp(-x/${t0}))`;
            }
            if (tie(val, 2) || r2(val, 2) !== r2(val4, 2)) continue;
            const top = kind === 2 ? Vs / (params.R) : Vs;
            return {
              prompt, steps,
              graph: graph({ view: [0, 5 * t0, 0, top * 1.15], items: [{ t: "fn", e: fn, role: "primary" }, { t: "vline", x: t, dash: true, role: "muted" }] }),
              answer: { kind: "number", value: val, dp: 2 }, answerText: q(val, unit, 2), answerInput: r2(val, 2).toString(),
              vals: { x, e, val, tau: t0, ...extra }, params,
            };
          }
        }
        // level 3: time to reach a threshold, or a switch between two sources (general first-order solution)
        for (;;) {
          if (r.chance(0.5)) {
            const Rv = r.pick([1, 2, 4.7, 10, 22, 47]), Cv = r.pick([1, 2.2, 4.7, 10, 22, 47, 100]), t0 = r2(Rv * Cv, 6), Vs = r.pick([5, 9, 12, 15]);
            const [fn_, fd] = r.pick([[1, 2], [2, 3], [3, 4], [4, 5], [9, 10], [1, 3]]), Vth = (Vs * fn_) / fd;
            if (!Number.isInteger(Vth * 100) || t0 > 500) continue;
            const ratio = Vs / (Vs - Vth), lnr = Math.log(ratio), t = t0 * lnr;
            if (tie(t, 2) || r2(t0 * r2(lnr, 4), 2) !== r2(t, 2)) continue;
            return {
              prompt: `A timer charges ${art(Cv)} ${q(Cv, "μF")} capacitor from 0&nbsp;V through ${q(Rv, KOHM)} from ${art(Vs)} ${q(Vs, "V")} supply. A comparator fires when the capacitor reaches ${q(Vth, "V")}. How long after the start does it fire, in milliseconds? Round to 2 decimal places.`,
              graph: graph({ view: [0, 5 * t0, 0, Vs * 1.15], items: [{ t: "fn", e: `${Vs}*(1-exp(-x/${t0}))`, role: "primary" }, { t: "hline", y: Vth, dash: true, role: "muted" }] }),
              steps: [
                `${tau} = ${it("RC")} = ${n(Rv)}&nbsp;kΩ × ${n(Cv)}&nbsp;μF = ${q(t0, "ms")}.`,
                `Set ${sym("V", "s")}(1 − ${M.sup("e", `−${it("t")}/${tau}`)}) = ${sym("V", "th")} and solve: ${M.sup("e", `−${it("t")}/${tau}`)} = ${M.frac(`${sym("V", "s")} − ${sym("V", "th")}`, sym("V", "s"))}, so ${it("t")} = ${tau} ln${M.frac(sym("V", "s"), `${sym("V", "s")} − ${sym("V", "th")}`)}.`,
                `${M.frac(n(Vs), `${n(Vs)} − ${n(Vth)}`)} = ${M.frac(n(Vs), n(Vs - Vth))} ${approx(ratio)} ${n(ratio)}, and ln ${n(ratio)} ≈ ${n(lnr, 4)}.`,
                `${it("t")} ≈ ${n(t0)} × ${n(lnr, 4)} ≈ ${q(t, "ms", 2)}.`,
              ],
              answer: { kind: "number", value: t, dp: 2 }, answerText: q(t, "ms", 2), answerInput: r2(t, 2).toString(),
              vals: { tau: t0, Vth, diff: Vs - Vth, ratio, lnr, t }, params: { R: Rv, C: Cv, Vs, fn: fn_, fd },
            };
          }
          const VA = r.pick([0, 2, 4, 5, 6, 9, 10, 12]), VB = r.pick([-12, -5, 0, 3, 5, 10, 12, 15, 20]), Rv = r.pick([1, 2, 5, 10]), Cv = r.pick([1, 2, 5, 10, 20]);
          if (VA === VB) continue;
          const t0 = Rv * Cv, x = r.pick([0.5, 1, 1.5, 2]), t = t0 * x, e = Math.exp(-x), e4 = r2(e, 4), diff = VA - VB, val = VB + diff * e;
          if (tie(val, 2) || r2(VB + diff * e4, 2) !== r2(val, 2)) continue;
          const lo = Math.min(VA, VB, 0) - 1, hi = Math.max(VA, VB, 0) + 1;
          const srcTxt = (v) => (v === 0 ? "ground (0&nbsp;V)" : `${art(v)} ${q(v, "V")} source`);
          return {
            prompt: `A switch has connected ${art(Cv)} ${q(Cv, "μF")} capacitor to ${srcTxt(VA)} for a long time. At ${it("t")} = 0 it flips, connecting the capacitor instead through ${q(Rv, KOHM)} to ${srcTxt(VB)}. What is its voltage at ${it("t")} = ${q(t, "ms")}? Round to 2 decimal places.`,
            graph: graph({ view: [-t0, 5 * t0, lo, hi], items: [{ t: "fn", e: `${VB} + (${diff})*exp(-x/${t0})`, role: "primary" }, { t: "hline", y: VB, dash: true, role: "muted" }, { t: "vline", x: t, dash: true, role: "muted" }] }),
            steps: [
              `Before the switch, in DC steady state no current flows, so the capacitor sits at the old source's voltage: ${sym("v", "C")}(0<sup>−</sup>) = ${q(VA, "V")}. Capacitor voltage cannot jump, so ${sym("v", "C")}(0<sup>+</sup>) = ${q(VA, "V")}.`,
              `Long after, it settles at the new source: ${sym("v", "C")}(∞) = ${q(VB, "V")}. The time constant is ${tau} = ${n(Rv)} × ${n(Cv)} = ${q(t0, "ms")}.`,
              `General first-order solution: ${it("v")}(${it("t")}) = ${it("v")}(∞) + [${it("v")}(0<sup>+</sup>) − ${it("v")}(∞)]${M.sup("e", `−${it("t")}/${tau}`)} = ${VB === 0 ? "" : `${n(VB)} + `}(${n(diff)})${M.sup("e", `−${it("t")}/${n(t0)}`)}.`,
              `At ${it("t")} = ${q(t, "ms")}: ${M.sup("e", `−${n(x)}`)} ≈ ${n(e, 4)}, so ${it("v")} ≈ ${VB === 0 ? "" : `${n(VB)} + `}${np(diff)} × ${n(e, 4)} ≈ ${q(val, "V", 2)}.`,
            ],
            answer: { kind: "number", value: val, dp: 2 }, answerText: q(val, "V", 2), answerInput: r2(val, 2).toString(),
            vals: { tau: t0, diff, x, e, val }, params: { VA, VB, R: Rv, C: Cv, t },
          };
        }
      },
    },

    // ---- EE.12 Second-order (RLC) transients ---------------------------------------------------------------------
    "EE.rlc-transient": {
      title: "Second-order RLC transients and damping",
      generate(r, level) {
        const NICE_C = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 4, 5, 10, 20, 25, 40, 50, 100, 200, 250, 400, 500, 1000];
        const al = it("α"), w0 = sym("ω", 0), wd = sym("ω", "d"), ze = it("ζ");
        const lc = (Lv, Cv) => `${M.frac("1", M.sqrt(`${it("L")}${it("C")}`))} = ${M.frac("1", M.sqrt(`${n(Lv)} × ${n(Cv)} × 10<sup>−6</sup>`))}`;
        /** L (H) and C (μF) with ω₀ = 1/√(LC) = target; C must be a friendly value. */
        const pickLC = (w) => {
          for (let k = 0; k < 40; k++) {
            const Lv = r.pick([0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1]), Cv = r2(1e6 / (w * w * Lv), 9);
            if (NICE_C.includes(Cv)) return [Lv, Cv];
          }
          return null;
        };
        if (level === 1) {
          for (;;) {
            const w = r.pick([50, 100, 200, 250, 500, 1000, 2000]), lcp = pickLC(w);
            if (!lcp) continue;
            const [Lv, Cv] = lcp, type = r.int(0, 2), z = type === 0 ? r.pick([1.25, 1.5, 2, 2.5, 4]) : type === 1 ? 1 : r.pick([0.2, 0.25, 0.4, 0.5, 0.6, 0.8]);
            const Rv = r2(2 * z * w * Lv, 9), a = r2(Rv / (2 * Lv), 9);
            if (!Number.isInteger(Rv * 100) || Rv < 0.5) continue;
            const options = ["Overdamped: it creeps to its final value with no overshoot", "Critically damped: the fastest response with no overshoot", "Underdamped: it overshoots and rings as it settles"];
            const cmp = type === 0 ? `${al} &gt; ${w0}` : type === 1 ? `${al} = ${w0}` : `${al} &lt; ${w0}`;
            return {
              prompt: `A series RLC circuit has ${it("R")} = ${q(Rv, OHM)}, ${it("L")} = ${q(Lv, "H")} and ${it("C")} = ${q(Cv, "μF")}. After a step, how does the capacitor voltage behave?`,
              steps: [
                `Series RLC: ${al} = ${M.frac(it("R"), `2${it("L")}`)} = ${M.frac(n(Rv), `2 × ${n(Lv)}`)} = ${n(a)}&nbsp;s<sup>−1</sup>.`,
                `${w0} = ${lc(Lv, Cv)} = ${q(w, "rad/s")}.`,
                `Compare: ${cmp}, so ${ze} = ${M.frac(al, w0)} = ${n(z)}. ${type === 0 ? "Two distinct real roots." : type === 1 ? "A repeated real root." : "Complex roots: decaying oscillation."}`,
              ],
              answer: { kind: "choice", options, index: type }, answerText: options[type],
              vals: { a, w, z }, params: { R: Rv, L: Lv, C: Cv }, consts: [10, 6],
            };
          }
        }
        const TRI = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [6, 8, 10], [8, 6, 10], [8, 15, 17], [15, 8, 17]];
        if (level === 2) {
          for (;;) {
            const [x, y, h] = r.pick(TRI), m = r.pick([10, 20, 50, 100]), over = r.chance(0.5);
            const a = over ? h * m : x * m, w = over ? x * m : h * m, d = y * m;   // over: α² − ω₀² = d²; under: ω₀² − α² = d²
            const lcp = pickLC(w);
            if (!lcp) continue;
            const [Lv, Cv] = lcp, Rv = r2(2 * a * Lv, 9);
            if (!Number.isInteger(Rv * 100)) continue;
            const base = [
              `Series RLC: ${al} = ${M.frac(it("R"), `2${it("L")}`)} = ${M.frac(n(Rv), `2 × ${n(Lv)}`)} = ${n(a)}&nbsp;s<sup>−1</sup>, and ${w0} = ${lc(Lv, Cv)} = ${q(w, "rad/s")}.`,
              `The characteristic equation is ${M.sup(it("s"), 2)} + 2${al}${it("s")} + ${M.sup(w0, 2)} = 0, with roots ${it("s")} = −${al} ± ${M.sqrt(`${M.sup(al, 2)} − ${M.sup(w0, 2)}`)}.`,
            ];
            if (over) {
              const s1 = -a + d, s2 = -a - d;
              return {
                prompt: `A series RLC circuit has ${it("R")} = ${q(Rv, OHM)}, ${it("L")} = ${q(Lv, "H")} and ${it("C")} = ${q(Cv, "μF")}. Find the two roots of its characteristic equation (in s<sup>−1</sup>). Enter both, separated by a comma.`,
                steps: [...base,
                  `${M.sup(al, 2)} − ${M.sup(w0, 2)} = ${M.sup(n(a), 2)} − ${M.sup(n(w), 2)} = ${n(a * a)} − ${n(w * w)} = ${n(d * d)}, so the square root is ${n(d)}: ${al} &gt; ${w0}, overdamped.`,
                  `${it("s")} = −${n(a)} ± ${n(d)}: ${sym("s", 1)} = ${n(s1)} and ${sym("s", 2)} = ${n(s2)}. The response is ${sym("A", 1)}${M.sup("e", `${n(s1)}${it("t")}`)} + ${sym("A", 2)}${M.sup("e", `${n(s2)}${it("t")}`)}: two decaying exponentials, no ringing.`],
                answer: { kind: "numbers", values: [s1, s2] }, answerText: `${it("s")} = ${n(s1)} and ${n(s2)} s<sup>−1</sup>`, answerInput: `${s1}, ${s2}`,
                vals: { a, w, aa: a * a, ww: w * w, dd: d * d, d, s1, s2 }, params: { R: Rv, L: Lv, C: Cv, over: 1 }, consts: [10, 6],
              };
            }
            return {
              prompt: `A series RLC circuit has ${it("R")} = ${q(Rv, OHM)}, ${it("L")} = ${q(Lv, "H")} and ${it("C")} = ${q(Cv, "μF")}. Its step response rings. Find the decay rate ${al} (in s<sup>−1</sup>) and the damped ringing frequency ${wd} (in rad/s). Enter ${al}, ${wd}.`,
              steps: [...base,
                `Here ${al} &lt; ${w0}, so the quantity under the square root is negative and the roots are complex: ${it("s")} = −${al} ± ${it("j")}${wd} with ${wd} = ${M.sqrt(`${M.sup(w0, 2)} − ${M.sup(al, 2)}`)}.`,
                `${wd} = ${M.sqrt(`${M.sup(n(w), 2)} − ${M.sup(n(a), 2)}`)} = ${M.sqrt(`${n(w * w)} − ${n(a * a)}`)} = ${M.sqrt(n(d * d))} = ${q(d, "rad/s")}. The response is ${M.sup("e", `−${n(a)}${it("t")}`)}(${sym("B", 1)} cos ${n(d)}${it("t")} + ${sym("B", 2)} sin ${n(d)}${it("t")}).`],
              answer: { kind: "numbers", values: [a, d], ordered: true }, answerText: `${al} = ${n(a)}&nbsp;s<sup>−1</sup>, ${wd} = ${q(d, "rad/s")}`, answerInput: `${a}, ${d}`,
              vals: { a, w, aa: a * a, ww: w * w, dd: d * d, d }, params: { R: Rv, L: Lv, C: Cv, over: 0 }, consts: [10, 6],
            };
          }
        }
        // level 3: design R for critical damping, or the percent overshoot of an underdamped response
        for (;;) {
          if (r.chance(0.5)) {
            const w = r.pick([100, 200, 250, 500, 1000, 2000]), lcp = pickLC(w);
            if (!lcp) continue;
            const [Lv, Cv] = lcp, LoC = (Lv * 1e6) / Cv, root = Math.sqrt(LoC), Rv = 2 * root, a = Rv / (2 * Lv), ts = 4000 / a;
            if (!Number.isInteger(r2(root, 9)) || !Number.isInteger(r2(ts * 100, 6))) continue;
            return {
              prompt: `A series RLC circuit has ${it("L")} = ${q(Lv, "H")} and ${it("C")} = ${q(Cv, "μF")}. What resistance makes it critically damped, and what is then its 2% settling time ${sym("t", "s")} ≈ ${M.frac("4", al)}? Enter ${it("R")} (Ω), ${sym("t", "s")} (ms).`,
              steps: [
                `Critical damping means ${al} = ${w0}: ${M.frac(it("R"), `2${it("L")}`)} = ${M.frac("1", M.sqrt(`${it("L")}${it("C")}`))}, so ${it("R")} = 2${M.sqrt(M.frac(it("L"), it("C")))}.`,
                `${M.frac(it("L"), it("C"))} = ${M.frac(n(Lv), `${n(Cv)} × 10<sup>−6</sup>`)} = ${big(LoC)}&nbsp;Ω², whose square root is ${q(root, OHM)}.`,
                `${it("R")} = 2 × ${n(root)} = ${q(Rv, OHM)}.`,
                `Then ${al} = ${M.frac(n(Rv), `2 × ${n(Lv)}`)} = ${n(a)}&nbsp;s<sup>−1</sup> (equal to ${w0}), and ${sym("t", "s")} ≈ ${M.frac("4", n(a))}&nbsp;s = ${q(ts, "ms")}.`,
              ],
              answer: { kind: "numbers", values: [Rv, ts], ordered: true }, answerText: `${it("R")} = ${q(Rv, OHM)}, ${sym("t", "s")} ≈ ${q(ts, "ms")}`, answerInput: `${Rv}, ${ts}`,
              vals: { LoC, root, R: Rv, a, ts }, params: { L: Lv, C: Cv }, consts: [10, 6, 4, 2],
            };
          }
          const w = r.pick([100, 200, 250, 500, 1000, 2000]), lcp = pickLC(w), z = r.pick([0.2, 0.3, 0.4, 0.5, 0.6, 0.7]);
          if (!lcp) continue;
          const [Lv, Cv] = lcp, Rv = r2(2 * z * w * Lv, 9);
          if (!Number.isInteger(Rv * 100)) continue;
          const a = r2(Rv / (2 * Lv), 9), sq = Math.sqrt(1 - z * z), ex = (Math.PI * z) / sq, os = 100 * Math.exp(-ex), ts = 4000 / a;
          if (tie(os, 1, 0.05) || !Number.isInteger(r2(ts * 100, 6))) continue;
          return {
            prompt: `A series RLC circuit with ${it("R")} = ${q(Rv, OHM)}, ${it("L")} = ${q(Lv, "H")} and ${it("C")} = ${q(Cv, "μF")} gets a step input. By what percentage does the capacitor voltage overshoot its final value? Round to 1 decimal place.`,
            steps: [
              `${al} = ${M.frac(n(Rv), `2 × ${n(Lv)}`)} = ${n(a)}&nbsp;s<sup>−1</sup> and ${w0} = ${lc(Lv, Cv)} = ${q(w, "rad/s")}, so ${ze} = ${M.frac(al, w0)} = ${M.frac(n(a), n(w))} = ${n(z)}: underdamped.`,
              `Percent overshoot: %OS = 100${M.sup("e", `−π${ze}/${M.sqrt(`1 − ${ze}²`)}`)}. Here ${M.sqrt(`1 − ${M.sup(n(z), 2)}`)} ≈ ${n(sq, 4)}, so the exponent is −${M.frac(`π × ${n(z)}`, n(sq, 4))} ≈ −${n(ex, 4)}.`,
              `%OS ≈ 100 × ${M.sup("e", `−${n(ex, 4)}`)} ≈ ${n(os, 1)}%. It settles (within 2%) in about ${M.frac("4", al)} = ${q(ts, "ms")}.`,
            ],
            answer: { kind: "number", value: os, dp: 1 }, answerText: `${n(os, 1)}%`, answerInput: r2(os, 1).toString(),
            vals: { a, w, z, sq, ex, os, ts }, params: { R: Rv, L: Lv, C: Cv }, consts: [10, 6, 100, 4],
          };
        }
      },
    },

    // ---- EE.13 AC signals & RMS ----------------------------------------------------------------------------------------
    "EE.8": {
      title: "AC signals and RMS values",
      generate(r, level) {
        const Vm = sym("V", "m"), Vrms = sym("V", "rms");
        if (level === 1) {
          const kind = r.int(0, 2);
          if (kind === 0) {
            const f = r.pick([50, 60, 100, 400, 500, 1000]), k = 2 * f, A = r.pick([5, 10, 12, 170, 325]);
            return {
              prompt: `A voltage is ${M.eq(`${it("v")}(${it("t")}) = ${n(A)} sin(${n(k)}π${it("t")})&nbsp;V`)} with ${it("t")} in seconds. What is its frequency, in hertz?`,
              steps: [`Compare with ${Vm} sin(${it("ω")}${it("t")}): the angular frequency is ${it("ω")} = ${n(k)}π&nbsp;rad/s.`, `${it("ω")} = 2π${it("f")}, so ${it("f")} = ${M.frac(`${n(k)}π`, "2π")} = ${q(f, "Hz")}.`],
              answer: { kind: "number", value: f }, answerText: q(f, "Hz"), answerInput: String(f), vals: { f }, params: { kind, k, A },
            };
          }
          if (kind === 1) {
            const f = r.pick([50, 100, 125, 200, 250, 400, 500, 1000, 2000]), T = 1000 / f;
            return {
              prompt: `What is the period, in milliseconds, of ${art(f)} ${q(f, "Hz")} sine wave?`,
              steps: [`The period is the time for one cycle: ${it("T")} = ${M.frac("1", it("f"))}.`, `${it("T")} = ${M.frac("1", n(f))}&nbsp;s = ${M.frac("1000", n(f))}&nbsp;ms = ${q(T, "ms")}.`],
              answer: { kind: "number", value: T }, answerText: q(T, "ms"), answerInput: String(T), vals: { T }, params: { kind, f }, consts: [1000],
            };
          }
          for (;;) {
            const A = r.pick([10, 12, 20, 24, 100, 155, 170, 311, 325, 340]), rms = A / Math.SQRT2;
            if (tie(rms, 2)) continue;
            return {
              prompt: `A sinusoidal voltage has a peak of ${q(A, "V")}. What is its RMS value? Round to 2 decimal places.`,
              steps: [`The average of ${M.sup("sin", 2)} over a cycle is ½, so the RMS of a sine is ${Vrms} = ${M.frac(Vm, M.sqrt("2"))} ≈ 0.707${Vm}.`, `${Vrms} = ${M.frac(n(A), M.sqrt("2"))} ≈ ${q(rms, "V", 2)}.`],
              answer: { kind: "number", value: rms, dp: 2 }, answerText: q(rms, "V", 2), answerInput: r2(rms, 2).toString(), vals: { rms }, params: { kind, A }, consts: [0.707],
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const A = r.int(2, 9), T = r.pick([4, 5, 8, 10, 16, 20]), f = 1000 / T, rms = A / Math.SQRT2;
            if (tie(rms, 2)) continue;
            return {
              prompt: `The graph shows a sinusoidal voltage (in volts) against time (in ms). The marked points are its first peak and the end of its first cycle. Find its frequency and RMS value. Enter ${it("f")} (Hz), ${Vrms} (V, rounded to 2 decimal places).`,
              graph: graph({ view: [0, 2 * T, -A - 1, A + 1], items: [{ t: "fn", e: `${A}*sin(2*pi*x/${T})`, role: "primary" }, dot(T / 4, A), dot(T, 0)] }),
              steps: [
                `Read the graph: the peak is ${Vm} = ${q(A, "V")}, and one full cycle ends at ${it("T")} = ${q(T, "ms")}.`,
                `${it("f")} = ${M.frac("1", it("T"))} = ${M.frac("1000", n(T))} = ${q(f, "Hz")} (one cycle every ${n(T)} thousandths of a second).`,
                `${Vrms} = ${M.frac(n(A), M.sqrt("2"))} ≈ ${q(rms, "V", 2)}.`,
              ],
              answer: { kind: "numbers", values: [f, rms], ordered: true, dp: 2 }, answerText: `${it("f")} = ${q(f, "Hz")}, ${Vrms} ≈ ${q(rms, "V", 2)}`, answerInput: `${f}, ${r2(rms, 2)}`,
              vals: { A, T, f, rms }, params: { A, T }, consts: [1000],
            };
          }
        }
        for (;;) {
          const shape = r.pick(["square", "sine", "triangle"]), A = r.pick([6, 10, 12, 15, 20, 24]), Rv = r.pick([4, 5, 8, 10, 20, 50]), k = { square: 1, sine: 2, triangle: 3 }[shape];
          const Pw = (A * A) / (k * Rv), rms = A / Math.sqrt(k);
          if (tie(Pw, 2)) continue;
          const T = 4, e = shape === "sine" ? `${A}*sin(2*pi*x/${T})` : shape === "square" ? `${A}*sin(2*pi*x/${T})/abs(sin(2*pi*x/${T}))` : `${2 * A}/pi*asin(sin(2*pi*x/${T}))`;
          const rmsTxt = shape === "square" ? `A square wave is always at ±${Vm}, so its square is always ${M.sup(Vm, 2)}: ${Vrms} = ${Vm} = ${q(A, "V")}.`
            : shape === "sine" ? `For a sine, ${Vrms} = ${M.frac(Vm, M.sqrt("2"))}, so ${M.sup(Vrms, 2)} = ${M.frac(M.sup(Vm, 2), "2")} = ${M.frac(n(A * A), "2")} = ${n((A * A) / 2)}&nbsp;V².`
              : `For a triangle wave, ${Vrms} = ${M.frac(Vm, M.sqrt("3"))}, so ${M.sup(Vrms, 2)} = ${M.frac(M.sup(Vm, 2), "3")} = ${M.frac(n(A * A), "3")}&nbsp;V².`;
          return {
            prompt: `A ${shape} wave with peak ${q(A, "V")} (shown) drives ${art(Rv)} ${q(Rv, OHM)} heating resistor. What average power does the resistor absorb? Round to 2 decimal places.`,
            graph: graph({ view: [0, 8, -A - 2, A + 2], items: [{ t: "fn", e, role: "primary" }] }),
            steps: [
              `Average power to a resistor uses the RMS value: ${it("P")} = ${M.frac(M.sup(Vrms, 2), it("R"))}. RMS depends on the waveform's shape, not just its peak.`,
              rmsTxt,
              `${it("P")} = ${M.frac(M.sup(n(A), 2), `${k === 1 ? "" : `${n(k)} × `}${n(Rv)}`)} = ${M.frac(n(A * A), n(k * Rv))} ${approx(Pw, 2)} ${q(Pw, "W", 2)}.${shape !== "square" ? ` A square wave of the same peak would deliver ${n((A * A) / Rv)}&nbsp;W.` : ""}`,
            ],
            answer: { kind: "number", value: Pw, dp: 2 }, answerText: q(Pw, "W", 2), answerInput: r2(Pw, 2).toString(),
            vals: { AA: A * A, half: (A * A) / 2, kR: k * Rv, Pw, Psq: (A * A) / Rv, rms }, params: { shape, A, R: Rv, k },
          };
        }
      },
    },
    // ---- EE.14 Phasors & impedance -------------------------------------------------------------------------------------
    "EE.9": {
      title: "Phasors and impedance",
      generate(r, level) {
        const XL = sym("X", "L"), XC = sym("X", "C"), om = it("ω"), j = it("j");
        const deg = (x) => (x * 180) / Math.PI;
        if (level === 1) {
          const kind = r.int(0, 2);
          for (;;) {
            if (kind === 0) {
              const w = r.pick([100, 200, 500, 1000, 2000, 5000, 10000]), Lm = r.pick([1, 2, 5, 10, 20, 50, 100]), X = (w * Lm) / 1000;
              if (!Number.isInteger(X * 100) || X < 0.5 || X > 1000) continue;
              return {
                prompt: `What is the reactance of ${art(Lm)} ${q(Lm, "mH")} inductor at ${om} = ${q(w, "rad/s")}?`,
                steps: [`An inductor's impedance is ${sym("Z", "L")} = ${j}${om}${it("L")}, so its reactance is ${XL} = ${om}${it("L")}: it grows with frequency.`, `${XL} = ${n(w)} × ${n(Lm)} × 10<sup>−3</sup> = ${q(X, OHM)}.`],
                answer: { kind: "number", value: X }, answerText: q(X, OHM), answerInput: String(X), vals: { X }, params: { kind, w, Lm }, consts: [10, 3],
              };
            }
            if (kind === 1) {
              const w = r.pick([100, 200, 500, 1000, 2000, 5000, 10000]), Cu = r.pick([1, 2, 5, 10, 20, 50, 100, 200]), X = 1e6 / (w * Cu);
              if (!Number.isInteger(r2(X * 100, 6)) || X < 0.5 || X > 5000) continue;
              return {
                prompt: `What is the magnitude of the reactance of ${art(Cu)} ${q(Cu, "μF")} capacitor at ${om} = ${q(w, "rad/s")}?`,
                steps: [`A capacitor's impedance is ${sym("Z", "C")} = ${M.frac("1", `${j}${om}${it("C")}`)} = −${M.frac(j, `${om}${it("C")}`)}, so the magnitude of its reactance is ${M.frac("1", `${om}${it("C")}`)}: it shrinks as frequency grows.`,
                  `${M.frac("1", `${n(w)} × ${n(Cu)} × 10<sup>−6</sup>`)} = ${M.frac("10<sup>6</sup>", n(w * Cu))} = ${q(X, OHM)}.`],
                answer: { kind: "number", value: X }, answerText: q(X, OHM), answerInput: String(r2(X, 6)), vals: { wC: w * Cu, X }, params: { kind, w, Cu }, consts: [10, 6],
              };
            }
            const [a, b, h] = r.pick(TRIPLES), m = r.pick([1, 2, 3, 5, 10]), Rv = a * m, X = b * m * r.sign(), Zm = h * m;
            return {
              prompt: `What is the magnitude of the impedance ${it("Z")} = ${n(Rv)} ${X > 0 ? "+" : "−"} ${j}${n(Math.abs(X))}&nbsp;Ω?`,
              steps: [`|${it("Z")}| = ${M.sqrt(`${M.sup(it("R"), 2)} + ${M.sup(it("X"), 2)}`)}: the length of the vector (${it("R")}, ${it("X")}) in the complex plane.`,
                `|${it("Z")}| = ${M.sqrt(`${M.sup(n(Rv), 2)} + ${M.sup(n(Math.abs(X)), 2)}`)} = ${M.sqrt(`${n(Rv * Rv)} + ${n(X * X)}`)} = ${M.sqrt(n(Zm * Zm))} = ${q(Zm, OHM)}.`],
              answer: { kind: "number", value: Zm }, answerText: q(Zm, OHM), answerInput: String(Zm), vals: { RR: Rv * Rv, XX: X * X, ZZ: Zm * Zm, Zm, absX: Math.abs(X) }, params: { kind, R: Rv, X },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const [a, b, h] = r.pick(TRIPLES), m = r.pick([1, 2, 5, 10]), Rv = a * m, X = b * m, Zm = h * m, Im = r.pick([0.5, 1, 2, 3, 4, 5]), Vm = Zm * Im;
            const w = r.pick([100, 200, 500, 1000, 2000, 5000]), isL = r.chance(0.5);
            const comp = isL ? (X * 1000) / w : 1e6 / (w * X);   // mH or μF
            if (!Number.isInteger(r2(comp * 100, 6)) || comp < 0.1 || comp > 2000) continue;
            const thZ = deg(Math.atan(X / Rv)), thI = isL ? -thZ : thZ;
            if (tie(thI, 1)) continue;
            const ratio = X / Rv;
            return {
              prompt: `A source ${it("v")}(${it("t")}) = ${n(Vm)} cos(${n(w)}${it("t")})&nbsp;V drives ${q(Rv, OHM)} in series with ${isL ? `${art(comp)} ${q(comp, "mH")} inductor` : `${art(comp)} ${q(comp, "μF")} capacitor`}. Find the current's amplitude ${sym("I", "m")} (A) and phase angle ${it("θ")} (degrees, rounded to 1 decimal place). Enter ${sym("I", "m")}, ${it("θ")}.`,
              steps: [
                isL ? `Reactance: ${XL} = ${om}${it("L")} = ${n(w)} × ${n(comp)} × 10<sup>−3</sup> = ${q(X, OHM)}, so ${it("Z")} = ${n(Rv)} + ${j}${n(X)}&nbsp;Ω.`
                  : `Reactance: ${M.frac("1", `${om}${it("C")}`)} = ${M.frac("1", `${n(w)} × ${n(comp)} × 10<sup>−6</sup>`)} = ${q(X, OHM)}, so ${it("Z")} = ${n(Rv)} − ${j}${n(X)}&nbsp;Ω.`,
                `|${it("Z")}| = ${M.sqrt(`${M.sup(n(Rv), 2)} + ${M.sup(n(X), 2)}`)} = ${q(Zm, OHM)}, and its angle is ${isL ? "" : "−"}arctan ${M.frac(n(X), n(Rv))} ${approx(ratio)} ${isL ? "" : "−"}arctan ${n(ratio)} ≈ ${isL ? "" : "−"}${n(thZ, 1)}°.`,
                `Ohm's law with phasors: ${it("Ĩ")} = ${M.frac(it("Ṽ"), it("Z"))} = ${M.frac(`${n(Vm)}∠0°`, `${n(Zm)}∠${isL ? "" : "−"}${n(thZ, 1)}°`)}: divide the magnitudes and subtract the angles.`,
                `${sym("I", "m")} = ${M.frac(n(Vm), n(Zm))} = ${q(Im, "A")} and ${it("θ")} ≈ ${n(thI, 1)}°, so ${it("i")}(${it("t")}) ≈ ${Im === 1 ? "" : `${n(Im)} `}cos(${n(w)}${it("t")} ${thI < 0 ? "−" : "+"} ${n(Math.abs(thI), 1)}°)&nbsp;A. The current ${isL ? "lags" : "leads"} the voltage, as in every ${isL ? "inductive" : "capacitive"} load.`,
              ],
              answer: { kind: "numbers", values: [Im, thI], ordered: true, dp: 1 }, answerText: `${sym("I", "m")} = ${q(Im, "A")}, ${it("θ")} ≈ ${n(thI, 1)}°`, answerInput: `${Im}, ${r2(thI, 1)}`,
              vals: { X, Zm, ratio, thZ, thI, Im, comp }, params: { Vm, w, R: Rv, isL: isL ? 1 : 0, comp }, consts: [10, 3, 6], deg: true,
            };
          }
        }
        // level 3: series RLC with a phase-shifted source
        for (;;) {
          const [a, b, h] = r.pick(TRIPLES), m = r.pick([1, 2, 5, 10]), Rv = a * m, X = b * m * r.sign(), Zm = h * m;
          const w = r.pick([100, 200, 500, 1000, 2000]), xl = r.pick([10, 20, 25, 40, 50, 60, 80, 100, 120, 150, 200]), xc = xl - X;
          if (xc <= 0) continue;
          const Lm = (xl * 1000) / w, Cu = 1e6 / (w * xc);
          if (!Number.isInteger(r2(Lm * 100, 6)) || !Number.isInteger(r2(Cu * 100, 6)) || Cu < 0.1 || Cu > 5000) continue;
          const Im = r.pick([0.5, 1, 2, 4, 5]), Vm = Zm * Im, ph = r.pick([0, 30, 45, 60, -30, -45, 90]);
          const thZ = deg(Math.atan(X / Rv)), thI = ph - thZ;
          if (tie(thI, 1) || tie(thZ, 1)) continue;
          const sgn = (v) => (v < 0 ? "−" : "+");
          return {
            prompt: `A series RLC circuit has ${it("R")} = ${q(Rv, OHM)}, ${it("L")} = ${q(Lm, "mH")} and ${it("C")} = ${q(Cu, "μF")}, driven by ${it("v")}(${it("t")}) = ${n(Vm)} cos(${n(w)}${it("t")}${ph === 0 ? "" : ` ${sgn(ph)} ${n(Math.abs(ph))}°`})&nbsp;V. Find the current ${it("i")}(${it("t")}) = ${sym("I", "m")} cos(${n(w)}${it("t")} + ${it("θ")}). Enter ${sym("I", "m")} (A), ${it("θ")} (degrees, rounded to 1 decimal place).`,
            steps: [
              `Reactances at ${om} = ${q(w, "rad/s")}: ${XL} = ${n(w)} × ${n(Lm)} × 10<sup>−3</sup> = ${q(xl, OHM)}; ${XC} = ${M.frac("1", `${n(w)} × ${n(Cu)} × 10<sup>−6</sup>`)} = ${q(xc, OHM)}.`,
              `Series impedances add: ${it("Z")} = ${n(Rv)} + ${j}(${n(xl)} − ${n(xc)}) = ${n(Rv)} ${sgn(X)} ${j}${n(Math.abs(X))}&nbsp;Ω. The net reactance is ${X > 0 ? "positive, so the circuit is inductive" : "negative, so the circuit is capacitive"}.`,
              `|${it("Z")}| = ${M.sqrt(`${M.sup(n(Rv), 2)} + ${M.sup(n(Math.abs(X)), 2)}`)} = ${q(Zm, OHM)}; ∠${it("Z")} = arctan ${M.frac(n(X), n(Rv))} ≈ ${n(thZ, 1)}°.`,
              `${it("Ĩ")} = ${M.frac(`${n(Vm)}∠${n(ph)}°`, `${n(Zm)}∠${n(thZ, 1)}°`)} = ${n(Im)}∠(${n(ph)}° − ${thZ < 0 ? `(${n(thZ, 1)}°)` : `${n(thZ, 1)}°`}) ≈ ${n(Im)}∠${n(thI, 1)}°.`,
              `${it("i")}(${it("t")}) ≈ ${Im === 1 ? "" : `${n(Im)} `}cos(${n(w)}${it("t")} ${sgn(thI)} ${n(Math.abs(thI), 1)}°)&nbsp;A: the current ${X > 0 ? "lags" : "leads"} the voltage by ${n(Math.abs(thZ), 1)}°.`,
            ],
            answer: { kind: "numbers", values: [Im, thI], ordered: true, dp: 1 }, answerText: `${sym("I", "m")} = ${q(Im, "A")}, ${it("θ")} ≈ ${n(thI, 1)}°`, answerInput: `${Im}, ${r2(thI, 1)}`,
            vals: { xl, xc, X, absX: Math.abs(X), Zm, thZ, thI, Im }, params: { R: Rv, Lm, Cu, Vm, w, ph }, consts: [10, 3, 6], deg: true,
          };
        }
      },
    },

    // ---- EE.15 AC power & power factor ----------------------------------------------------------------------------------
    "EE.10": {
      title: "AC power and power factor",
      generate(r, level) {
        const S = `|${it("S")}|`, pf = "pf";
        if (level === 1) {
          const kind = r.int(0, 2), Vv = r.pick([120, 230, 240, 480]), Iv = r.pick([2, 4, 5, 10, 12, 15, 20]), p = r.pick([0.6, 0.75, 0.8, 0.85, 0.9, 0.95]);
          const Sv = Vv * Iv, Pv = r2(Sv * p, 6);
          if (kind === 0) {
            return {
              prompt: `A motor on ${q(Vv, "V")} rms draws ${q(Iv, "A")} rms at a power factor of ${n(p)} lagging. How much real power does it use, in watts?`,
              steps: [`Only the part of the current in phase with the voltage does work: ${it("P")} = ${sym("V", "rms")}${sym("I", "rms")} cos ${it("θ")}, and cos ${it("θ")} is the power factor.`,
                `${it("P")} = ${n(Vv)} × ${n(Iv)} × ${n(p)} = ${n(Sv)} × ${n(p)} = ${q(Pv, "W")}.`],
              answer: { kind: "number", value: Pv }, answerText: q(Pv, "W"), answerInput: String(Pv), vals: { S: Sv, P: Pv }, params: { kind, V: Vv, I: Iv, pf: p },
            };
          }
          if (kind === 1) {
            return {
              prompt: `A load on ${q(Vv, "V")} rms draws ${q(Iv, "A")} rms. What apparent power must its supply be rated for, in volt-amperes?`,
              steps: [`Apparent power, which sizes wires and transformers, is ${S} = ${sym("V", "rms")}${sym("I", "rms")}, whatever the power factor.`, `${S} = ${n(Vv)} × ${n(Iv)} = ${big(Sv)}&nbsp;VA.`],
              answer: { kind: "number", value: Sv }, answerText: `${big(Sv)}&nbsp;VA`, answerInput: String(Sv), vals: { S: Sv }, params: { kind, V: Vv, I: Iv },
            };
          }
          return {
            prompt: `A wattmeter reads ${big(Pv)}&nbsp;W for a load drawing ${q(Iv, "A")} rms from ${q(Vv, "V")} rms. What is its power factor?`,
            steps: [`Power factor = ${M.frac(it("P"), S)}, real power over apparent power.`, `${S} = ${n(Vv)} × ${n(Iv)} = ${big(Sv)}&nbsp;VA, so pf = ${M.frac(big(Pv), big(Sv))} = ${n(p)}.`],
            answer: { kind: "number", value: p }, answerText: n(p), answerInput: String(p), vals: { S: Sv, P: Pv, pf: p }, params: { kind, V: Vv, I: Iv, P: Pv },
          };
        }
        if (level === 2) {
          const [a, b, h] = r.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17], [7, 24, 25], [24, 7, 25]]), m = r.pick([1, 2, 3, 4, 5, 10]);
          const Pk = a * m, Qk = b * m, Sk = h * m, p = a / h;
          if (r.chance(0.5)) {
            return {
              prompt: `A factory draws ${q(Pk, "kW")} of real power and ${q(Qk, "kvar")} of inductive reactive power. Find its apparent power and its power factor. Enter ${S} (kVA), pf.`,
              steps: [`The power triangle: ${M.sup(S, 2)} = ${M.sup(it("P"), 2)} + ${M.sup(it("Q"), 2)}.`,
                `${S} = ${M.sqrt(`${M.sup(n(Pk), 2)} + ${M.sup(n(Qk), 2)}`)} = ${M.sqrt(`${n(Pk * Pk)} + ${n(Qk * Qk)}`)} = ${M.sqrt(n(Sk * Sk))} = ${q(Sk, "kVA")}.`,
                `pf = ${M.frac(it("P"), S)} = ${M.frac(n(Pk), n(Sk))} ${approx(p)} ${n(p)}, lagging (inductive, ${it("Q")} &gt; 0).`],
              answer: { kind: "numbers", values: [Sk, p], ordered: true }, answerText: `${S} = ${q(Sk, "kVA")}, pf = ${M.frac(n(a), n(h))} ${approx(p)} ${n(p)} lagging`, answerInput: `${Sk}, ${a}/${h}`,
              vals: { PP: Pk * Pk, QQ: Qk * Qk, SS: Sk * Sk, S: Sk, pf: p, pfn: a, pfd: h }, params: { kind: 0, P: Pk, Q: Qk },
            };
          }
          const tn = b / a, sn = b / h;
          return {
            prompt: `A load uses ${q(Pk, "kW")} at a power factor of ${M.frac(n(a), n(h))}${Number.isInteger(r2(p * 100, 6)) ? ` (${n(p)})` : ""} lagging. How much reactive power does it draw, in kvar?`,
            steps: [
              `cos ${it("θ")} = ${M.frac(n(a), n(h))}, so sin ${it("θ")} = ${M.sqrt(`1 − ${M.sup(`(${n(a)}/${n(h)})`, 2)}`)} = ${M.frac(n(b), n(h))} and tan ${it("θ")} = ${M.frac("sin θ", "cos θ")} = ${M.frac(n(b), n(a))}.`,
              `${it("Q")} = ${it("P")} tan ${it("θ")} = ${n(Pk)} × ${M.frac(n(b), n(a))} = ${q(Qk, "kvar")} (positive: inductive).`,
              `Check: ${S} = ${M.frac(it("P"), "pf")} = ${n(Pk)} × ${M.frac(n(h), n(a))} = ${q(Sk, "kVA")}, and ${M.sup(n(Pk), 2)} + ${M.sup(n(Qk), 2)} = ${M.sup(n(Sk), 2)}.`,
            ],
            answer: { kind: "number", value: Qk }, answerText: q(Qk, "kvar"), answerInput: String(Qk),
            vals: { Q: Qk, S: Sk, pf: p, tn, sn, a, b, h }, params: { kind: 1, P: Pk, pfn: a, pfd: h },
          };
        }
        // level 3: power-factor correction with a shunt capacitor
        for (;;) {
          const [p1, t1] = r.pick([[0.6, 4 / 3], [0.8, 0.75]]), [p2, t2] = p1 === 0.6 ? r.pick([[1, 0], [0.8, 0.75]]) : [1, 0];
          const Pk = r.pick([6, 9, 12, 15, 18, 24, 30, 36, 48, 60]), Vv = r.pick([240, 400, 480]), f = r.pick([50, 60]);
          const Q1 = Pk * t1, Q2 = Pk * t2, Qc = Q1 - Q2, w = 2 * Math.PI * f, Cuf = (Qc * 1000 * 1e6) / (w * Vv * Vv), S1 = Pk / p1, S2 = Pk / p2;
          if (!Number.isInteger(r2(Q1 * 100, 6)) || tie(Cuf, 1)) continue;
          return {
            prompt: `A workshop draws ${q(Pk, "kW")} at a power factor of ${n(p1)} lagging from ${art(Vv)} ${q(Vv, "V")} rms, ${q(f, "Hz")} supply. What capacitance, connected in parallel with the load, raises the power factor to ${n(p2)}? Give the answer in microfarads, rounded to 1 decimal place.`,
            steps: [
              `Before: cos ${sym("θ", 1)} = ${n(p1)} gives tan ${sym("θ", 1)} = ${n(r2(t1, 4))}${p1 === 0.6 ? " (= 4/3)" : ""}, so ${sym("Q", 1)} = ${it("P")} tan ${sym("θ", 1)} = ${n(Pk)} × ${p1 === 0.6 ? "4/3" : n(t1)} = ${q(Q1, "kvar")}, and ${S} = ${M.frac(n(Pk), n(p1))} = ${q(S1, "kVA")}.`,
              `Target: ${p2 === 1 ? `pf = 1 means ${sym("Q", 2)} = 0` : `pf = ${n(p2)} means tan ${sym("θ", 2)} = ${n(t2)} and ${sym("Q", 2)} = ${n(Pk)} × ${n(t2)} = ${q(Q2, "kvar")}`}. The capacitor must supply ${sym("Q", "C")} = ${n(Q1)} − ${n(Q2)} = ${q(Qc, "kvar")}; the real power is unchanged and ${S} falls to ${q(S2, "kVA")}.`,
              `${it("ω")} = 2π${it("f")} = 2π × ${n(f)} ≈ ${n(w, 2)}&nbsp;rad/s. A capacitor across ${sym("V", "rms")} supplies ${sym("Q", "C")} = ${it("ω")}${it("C")}${M.sup(sym("V", "rms"), 2)}.`,
              `${it("C")} = ${M.frac(sym("Q", "C"), `${it("ω")}${M.sup(sym("V", "rms"), 2)}`)} = ${M.frac(`${big(Qc * 1000)}`, `${n(w, 2)} × ${M.sup(n(Vv), 2)}`)} ≈ ${q(Cuf, "μF", 1)}.`,
            ],
            answer: { kind: "number", value: Cuf, dp: 1 }, answerText: q(Cuf, "μF", 1), answerInput: r2(Cuf, 1).toString(),
            vals: { t1, Q1, Q2, Qc, Qvar: Qc * 1000, w, Cuf, S1, S2 }, params: { P: Pk, p1, p2, V: Vv, f }, consts: [4, 3, 0.75],
          };
        }
      },
    },

    // ---- EE.16 RLC circuits & resonance ------------------------------------------------------------------------------------
    "EE.11": {
      title: "Resonance, quality factor and bandwidth",
      generate(r, level) {
        const w0 = sym("ω", 0), f0 = sym("f", 0);
        /** L (mH) and C (nF) whose product is a perfect square, so ω₀ = 10⁶/√(LC) is exact. */
        const pick = () => {
          for (;;) {
            const Lm = r.pick([1, 2, 4, 5, 8, 10, 16, 20, 25, 40, 50, 100]), Cn = r.pick([1, 2, 4, 5, 8, 10, 16, 20, 25, 40, 50, 100, 250]), pr = Lm * Cn, sq = Math.round(Math.sqrt(pr));
            if (sq * sq === pr && Lm !== Cn) return { Lm, Cn, pr, sq, w: 1e6 / sq };
          }
        };
        const w0step = (c) => `${w0} = ${M.frac("1", M.sqrt(`${it("L")}${it("C")}`))} = ${M.frac("1", M.sqrt(`${n(c.Lm)} × 10<sup>−3</sup> × ${n(c.Cn)} × 10<sup>−9</sup>`))} = ${M.frac(`10<sup>6</sup>`, M.sqrt(n(c.pr)))} = ${M.frac(`10<sup>6</sup>`, n(c.sq))} = ${big(c.w)}&nbsp;rad/s.`;
        if (level === 1) {
          for (;;) {
            const c = pick();
            if (!Number.isInteger(c.w)) continue;
            if (r.chance(0.5)) {
              return {
                prompt: `${cap1(art(c.Lm))} ${q(c.Lm, "mH")} inductor and ${art(c.Cn)} ${q(c.Cn, "nF")} capacitor are in series. At what angular frequency do they resonate, in rad/s?`,
                steps: [`Resonance is where the reactances cancel, ${it("ω")}${it("L")} = ${M.frac("1", `${it("ω")}${it("C")}`)}, which gives ${w0} = ${M.frac("1", M.sqrt(`${it("L")}${it("C")}`))}.`, w0step(c)],
                answer: { kind: "number", value: c.w }, answerText: `${big(c.w)}&nbsp;rad/s`, answerInput: String(c.w), vals: { pr: c.pr, sq: c.sq, w: c.w }, params: { Lm: c.Lm, Cn: c.Cn, kind: 0 }, consts: [10, 3, 9, 6],
              };
            }
            const f = c.w / (2 * Math.PI);
            if (tie(f, 1)) continue;
            return {
              prompt: `${cap1(art(c.Lm))} ${q(c.Lm, "mH")} inductor and ${art(c.Cn)} ${q(c.Cn, "nF")} capacitor form a resonant circuit. What is its resonant frequency in hertz? Round to 1 decimal place.`,
              steps: [`${w0} = ${M.frac("1", M.sqrt(`${it("L")}${it("C")}`))}, and ${f0} = ${M.frac(w0, "2π")}.`, w0step(c), `${f0} = ${M.frac(big(c.w), "2π")} ≈ ${q(f, "Hz", 1)}.`],
              answer: { kind: "number", value: f, dp: 1 }, answerText: q(f, "Hz", 1), answerInput: r2(f, 1).toString(), vals: { pr: c.pr, sq: c.sq, w: c.w, f }, params: { Lm: c.Lm, Cn: c.Cn, kind: 1 }, consts: [10, 3, 9, 6],
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const c = pick(), Rv = r.pick([1, 2, 4, 5, 8, 10, 20, 25, 40, 50, 100]), XL = (c.w * c.Lm) / 1000, Qf = XL / Rv, BW = (Rv * 1000) / c.Lm;
            if (!Number.isInteger(c.w) || !Number.isInteger(XL) || !Number.isInteger(Qf) || Qf < 2 || !Number.isInteger(BW)) continue;
            return {
              prompt: `A series RLC circuit has ${it("R")} = ${q(Rv, OHM)}, ${it("L")} = ${q(c.Lm, "mH")} and ${it("C")} = ${q(c.Cn, "nF")}. Find its quality factor ${it("Q")} and its bandwidth in rad/s. Enter ${it("Q")}, BW.`,
              steps: [w0step(c),
                `At resonance the inductor's reactance is ${w0}${it("L")} = ${big(c.w)} × ${n(c.Lm)} × 10<sup>−3</sup> = ${big(XL)}&nbsp;Ω, so ${it("Q")} = ${M.frac(`${w0}${it("L")}`, it("R"))} = ${M.frac(big(XL), n(Rv))} = ${n(Qf)}.`,
                `BW = ${M.frac(w0, it("Q"))} = ${M.frac(big(c.w), n(Qf))} = ${big(BW)}&nbsp;rad/s (the same as ${M.frac(it("R"), it("L"))}). A higher ${it("Q")} means a taller, narrower peak.`],
              answer: { kind: "numbers", values: [Qf, BW], ordered: true }, answerText: `${it("Q")} = ${n(Qf)}, BW = ${big(BW)}&nbsp;rad/s`, answerInput: `${Qf}, ${BW}`,
              vals: { pr: c.pr, sq: c.sq, w: c.w, XL, Q: Qf, BW }, params: { R: Rv, Lm: c.Lm, Cn: c.Cn }, consts: [10, 3, 9, 6],
            };
          }
        }
        // level 3: tune a radio, or the voltage magnification at resonance
        for (;;) {
          if (r.chance(0.5)) {
            const fk = r.pick([540, 600, 700, 800, 880, 950, 1000, 1100, 1200, 1400, 1600]), Lu = r.pick([100, 150, 200, 220, 250, 330]);
            const w = 2 * Math.PI * fk * 1000, Cp = 1e12 / (w * w * Lu * 1e-6);
            if (tie(Cp, 1)) continue;
            return {
              prompt: `An AM radio tunes stations with ${art(Lu)} ${q(Lu, "μH")} coil and a variable capacitor. What capacitance tunes it to a station at ${q(fk, "kHz")}? Give the answer in picofarads, rounded to 1 decimal place.`,
              steps: [`Resonance: ${f0} = ${M.frac("1", `2π${M.sqrt(`${it("L")}${it("C")}`)}`)}, so ${it("C")} = ${M.frac("1", `${M.sup(`(2π${f0})`, 2)}${it("L")}`)}.`,
                `2π${f0} = 2π × ${n(fk)} × 10<sup>3</sup> ≈ ${big(r2(w, 0))}&nbsp;rad/s.`,
                `${it("C")} = ${M.frac("1", `${M.sup(`(${big(r2(w, 0))})`, 2)} × ${n(Lu)} × 10<sup>−6</sup>`)} ≈ ${n(Cp / 1000, 4)} × 10<sup>−9</sup>&nbsp;F ≈ ${q(Cp, "pF", 1)}.`],
              answer: { kind: "number", value: Cp, dp: 1 }, answerText: q(Cp, "pF", 1), answerInput: r2(Cp, 1).toString(), vals: { w, Cp, Cn: Cp / 1000 }, params: { fk, Lu }, consts: [10, 3, 6, 9],
            };
          }
          const c = pick(), Rv = r.pick([2, 4, 5, 10, 20, 25, 50]), Vs = r.pick([0.5, 1, 2, 5, 10]), XL = (c.w * c.Lm) / 1000, Qf = XL / Rv, Iv = Vs / Rv, VC = Iv * XL;
          if (!Number.isInteger(c.w) || !Number.isInteger(XL) || !Number.isInteger(Qf) || Qf < 3 || !Number.isInteger(r2(Iv * 1000, 6))) continue;
          return {
            prompt: `${cap1(art(Vs))} ${q(Vs, "V")} rms source drives a series RLC circuit (${it("R")} = ${q(Rv, OHM)}, ${it("L")} = ${q(c.Lm, "mH")}, ${it("C")} = ${q(c.Cn, "nF")}) at its resonant frequency. What rms voltage appears across the capacitor?`,
            steps: [w0step(c),
              `At resonance the reactances cancel, so ${it("Z")} = ${it("R")} and ${it("I")} = ${M.frac(n(Vs), n(Rv))} = ${q(Iv * 1000, "mA")}.`,
              `The capacitor's reactance equals the inductor's: ${M.frac("1", `${w0}${it("C")}`)} = ${w0}${it("L")} = ${big(c.w)} × ${n(c.Lm)} × 10<sup>−3</sup> = ${q(XL, OHM)}.`,
              `${sym("V", "C")} = ${it("I")}${sym("X", "C")} = ${n(Iv)} × ${n(XL)} = ${q(VC, "V")}: ${it("Q")} = ${n(Qf)} times the source voltage. The L and C voltages are equal and opposite, so they cancel around the loop.`],
            answer: { kind: "number", value: VC }, answerText: q(VC, "V"), answerInput: String(VC), vals: { pr: c.pr, sq: c.sq, w: c.w, ImA: Iv * 1000, I: Iv, XL, VC, Q: Qf }, params: { Vs, R: Rv, Lm: c.Lm, Cn: c.Cn }, consts: [10, 3, 9, 6],
          };
        }
      },
    },

    // ---- EE.17 Filters, frequency response & decibels ------------------------------------------------------------------------
    "EE.12": {
      title: "RC filters and frequency response",
      generate(r, level) {
        const fc = sym("f", "c");
        if (level === 1) {
          for (;;) {
            const Rk = r.pick([1, 1.5, 2.2, 3.3, 4.7, 10, 22, 47]), Cn = r.pick([1, 2.2, 4.7, 10, 22, 47, 100]), f = 1e6 / (2 * Math.PI * Rk * Cn);
            if (tie(f, 1) || f > 200000) continue;
            return {
              prompt: `An RC low-pass filter uses ${it("R")} = ${q(Rk, KOHM)} and ${it("C")} = ${q(Cn, "nF")}. What is its cutoff frequency, in hertz? Round to 1 decimal place.`,
              steps: [`The cutoff is where the capacitor's reactance equals ${it("R")}: ${fc} = ${M.frac("1", `2π${it("RC")}`)}.`,
                `${it("RC")} = ${n(Rk)} × 10<sup>3</sup> × ${n(Cn)} × 10<sup>−9</sup> = ${n(r2(Rk * Cn, 6))} × 10<sup>−6</sup>&nbsp;s.`,
                `${fc} = ${M.frac("1", `2π × ${n(r2(Rk * Cn, 6))} × 10<sup>−6</sup>`)} ≈ ${q(f, "Hz", 1)}.`],
              answer: { kind: "number", value: f, dp: 1 }, answerText: q(f, "Hz", 1), answerInput: r2(f, 1).toString(), vals: { RC: r2(Rk * Cn, 6), f }, params: { Rk, Cn }, consts: [10, 3, 9, 6],
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const k = r.pick([0.5, 1, 2, 3, 4, 10, 100]), fcv = r.pick([100, 200, 500, 1000, 2000, 5000]), f = k * fcv, kk = k * k, mag = 1 / Math.sqrt(1 + kk), dB = 20 * Math.log10(mag), ph = (-Math.atan(k) * 180) / Math.PI;
            if (tie(dB, 2) || tie(mag, 4)) continue;
            return {
              prompt: `An RC low-pass filter has cutoff ${fc} = ${q(fcv, "Hz")}. By how many decibels does it change a sine wave at ${q(f, "Hz")}? Round to 2 decimal places (a loss is negative).`,
              graph: graph({ view: [-2, 3, -45, 5], items: [{ t: "fn", e: "-10*log(1+10^(2x))", role: "primary" }, { t: "vline", x: Math.log10(k), dash: true, role: "muted" }] }),
              steps: [
                `|${it("H")}| = ${M.frac("1", M.sqrt(`1 + ${M.sup(`(${it("f")}/${fc})`, 2)}`))}. Here ${M.frac(it("f"), fc)} = ${M.frac(n(f), n(fcv))} = ${n(k)}.`,
                `|${it("H")}| = ${M.frac("1", M.sqrt(`1 + ${n(kk)}`))} ≈ ${n(mag, 4)}.`,
                `In decibels: 20 log<sub>10</sub> |${it("H")}| = −10 log<sub>10</sub>(1 + ${n(kk)}) ≈ ${n(dB, 2)}&nbsp;dB. The phase is −arctan ${n(k)} ≈ ${n(ph, 1)}°.${k >= 10 ? " Far above cutoff the gain falls 20 dB per decade." : k === 1 ? " At the cutoff the output is 3 dB down: half power." : ""}`,
              ],
              answer: { kind: "number", value: dB, dp: 2 }, answerText: `${n(dB, 2)}&nbsp;dB`, answerInput: r2(dB, 2).toString(),
              vals: { k, kk, mag, dB, ph, f }, params: { k, fc: fcv }, consts: [20, 10, 3],
            };
          }
        }
        for (;;) {
          if (r.chance(0.5)) {
            const fcv = r.pick([100, 300, 500, 1000, 2000, 3000, 10000]), Cn = r.pick([1, 10, 22, 47, 100]), Rk = 1e6 / (2 * Math.PI * fcv * Cn);
            if (tie(Rk, 2) || Rk < 0.1 || Rk > 1000) continue;
            return {
              prompt: `Design an RC low-pass filter with cutoff ${q(fcv, "Hz")} using ${art(Cn)} ${q(Cn, "nF")} capacitor. What resistance is needed, in kΩ? Round to 2 decimal places.`,
              steps: [`${fc} = ${M.frac("1", `2π${it("RC")}`)}, so ${it("R")} = ${M.frac("1", `2π${fc}${it("C")}`)}.`,
                `${it("R")} = ${M.frac("1", `2π × ${n(fcv)} × ${n(Cn)} × 10<sup>−9</sup>`)} ≈ ${q(Rk * 1000, OHM, 0)} ≈ ${q(Rk, KOHM, 2)}.`,
                `In practice you would pick the nearest standard value and accept a cutoff slightly off target.`],
              answer: { kind: "number", value: Rk, dp: 2 }, answerText: q(Rk, KOHM, 2), answerInput: r2(Rk, 2).toString(), vals: { Rk, R: Rk * 1000 }, params: { fc: fcv, Cn }, consts: [10, 9],
            };
          }
          const fcv = r.pick([100, 200, 500, 1000]), k = r.pick([0.25, 0.5, 1, 2, 3, 4]), f = k * fcv, A = r.pick([1, 2, 5, 10]);
          const mag = k / Math.sqrt(1 + k * k), out = A * mag, ph = (Math.atan(1 / k) * 180) / Math.PI;
          if (tie(out, 2) || tie(ph, 1) || r2(A * r2(mag, 4), 2) !== r2(out, 2)) continue;
          return {
            prompt: `An RC high-pass filter (output across ${it("R")}) has cutoff ${q(fcv, "Hz")}. A ${q(A, "V")} amplitude sine wave at ${q(f, "Hz")} goes in. What is the output amplitude? Round to 2 decimal places.`,
            steps: [
              `High-pass: ${it("H")} = ${M.frac(`${it("j")}${it("ω")}${it("RC")}`, `1 + ${it("j")}${it("ω")}${it("RC")}`)}, so |${it("H")}| = ${M.frac(`${it("f")}/${fc}`, M.sqrt(`1 + ${M.sup(`(${it("f")}/${fc})`, 2)}`))}: it blocks low frequencies.`,
              `${M.frac(it("f"), fc)} = ${M.frac(n(f), n(fcv))} = ${n(k)}, so |${it("H")}| = ${M.frac(n(k), M.sqrt(`1 + ${n(k * k)}`))} ≈ ${n(mag, 4)}.`,
              `Output amplitude: ${n(A)} × ${n(mag, 4)} ≈ ${q(out, "V", 2)}. It leads the input by arctan(${fc}/${it("f")}) = arctan ${n(1 / k)} ≈ ${n(ph, 1)}°.`,
            ],
            answer: { kind: "number", value: out, dp: 2 }, answerText: q(out, "V", 2), answerInput: r2(out, 2).toString(), vals: { k, kk: k * k, mag, out, inv: 1 / k, ph, f }, params: { fc: fcv, k, A },
          };
        }
      },
    },
    // ---- EE.18 Electric & magnetic fields ------------------------------------------------------------------------------------
    "EE.16": {
      title: "Electric and magnetic fields; Faraday's law",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.5)) {
            for (;;) {
              const Vv = r.pick([6, 9, 12, 24, 50, 100, 240, 1000]), d = r.pick([0.5, 1, 2, 4, 5, 10]), E = (Vv * 1000) / d;
              if (!Number.isInteger(E)) continue;
              return {
                prompt: `Two parallel plates ${q(d, "mm")} apart have ${q(Vv, "V")} between them. What is the electric field between them, in volts per meter?`,
                steps: [`Between parallel plates the field is uniform: ${it("E")} = ${M.frac(it("V"), it("d"))}.`, `${it("d")} = ${n(d)}&nbsp;mm = ${n(d / 1000)}&nbsp;m, so ${it("E")} = ${M.frac(n(Vv), n(d / 1000))} = ${big(E)}&nbsp;V/m.`],
                answer: { kind: "number", value: E }, answerText: `${big(E)}&nbsp;V/m`, answerInput: String(E), vals: { dm: d / 1000, E }, params: { kind: 0, V: Vv, d },
              };
            }
          }
          const qc = r.pick([1, 2, 3, 4, 5, 10]), E = r.pick([100, 200, 500, 1000, 2000, 5000]), Fm = (qc * E) / 1000;
          return {
            prompt: `${cap1(art(qc))} ${q(qc, "μC")} charge sits in a uniform electric field of ${big(E)}&nbsp;V/m. What force acts on it, in millinewtons?`,
            steps: [`The field is force per unit charge, so ${it("F")} = ${it("q")}${it("E")}.`, `${it("F")} = ${n(qc)} × 10<sup>−6</sup>&nbsp;C × ${big(E)}&nbsp;V/m = ${n(Fm / 1000)}&nbsp;N = ${q(Fm, "mN")}.`],
            answer: { kind: "number", value: Fm }, answerText: q(Fm, "mN"), answerInput: String(Fm), vals: { FN: Fm / 1000, F: Fm }, params: { kind: 1, q: qc, E }, consts: [10, 6],
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            for (;;) {
              const Iv = r.pick([1, 2, 5, 10, 15, 20, 50, 100]), rc = r.pick([1, 2, 4, 5, 10, 20, 50]), B = (20 * Iv) / rc;
              if (!Number.isInteger(B * 100)) continue;
              return {
                prompt: `A long straight wire carries ${q(Iv, "A")}. What is the magnetic field ${q(rc, "cm")} from it, in microteslas? Use ${sym("μ", 0)} = 4π × 10<sup>−7</sup>&nbsp;T·m/A.`,
                steps: [`The field circles the wire and falls off as 1/${it("r")}: ${it("B")} = ${M.frac(`${sym("μ", 0)}${it("I")}`, `2π${it("r")}`)}.`,
                  `${M.frac(`4π × 10<sup>−7</sup> × ${n(Iv)}`, `2π × ${n(rc / 100)}`)} = ${M.frac(`2 × 10<sup>−7</sup> × ${n(Iv)}`, n(rc / 100))} = ${n(B)} × 10<sup>−6</sup>&nbsp;T = ${q(B, "μT")} (Earth's field is about 50&nbsp;μT).`],
                answer: { kind: "number", value: B }, answerText: q(B, "μT"), answerInput: String(B), vals: { rm: rc / 100, B }, params: { kind: 0, I: Iv, r: rc }, consts: [4, 10, 7, 6, 50],
              };
            }
          }
          const B = r.pick([0.1, 0.2, 0.5, 1, 1.5]), Iv = r.pick([2, 4, 5, 10, 20]), Lc = r.pick([10, 20, 25, 50, 100]), Fn = r2((B * Iv * Lc) / 100, 6);
          return {
            prompt: `${cap1(art(Lc))} ${q(Lc, "cm")} length of wire carrying ${q(Iv, "A")} lies at right angles to ${art(B)} ${q(B, "T")} magnetic field, as in a motor. What force acts on it, in newtons?`,
            steps: [`Force on a current-carrying wire: ${it("F")} = ${it("I")}${it("L")}${it("B")} sin ${it("θ")}, and sin 90° = 1.`, `${it("F")} = ${n(Iv)} × ${n(Lc / 100)} × ${n(B)} = ${q(Fn, "N")}.`],
            answer: { kind: "number", value: Fn }, answerText: q(Fn, "N"), answerInput: String(Fn), vals: { Lm: Lc / 100, F: Fn }, params: { kind: 1, B, I: Iv, L: Lc }, consts: [90],
          };
        }
        for (;;) {
          const N = r.pick([10, 20, 50, 100, 200, 500]), A = r.pick([2, 4, 5, 10, 20, 25, 50]), B1 = r.pick([0, 10, 20, 50, 100]), B2 = r.pick([0, 10, 20, 50, 100, 200]), dt = r.pick([1, 2, 5, 10, 20, 50]);
          if (B1 === B2) continue;
          const dB = B2 - B1, dPhi = (A * dB) / 10, emf = (N * A * Math.abs(dB)) / (10000 * dt);   // dΦ in μWb (cm² × mT / 10)
          if (!Number.isInteger(r2(emf * 10000, 6)) || emf < 0.001) continue;
          return {
            prompt: `${cap1(art(N))} ${n(N)}-turn coil of area ${q(A, "cm²")} sits at right angles to a magnetic field that changes steadily from ${q(B1, "mT")} to ${q(B2, "mT")} in ${q(dt, "ms")}. What EMF is induced, in volts (magnitude)?`,
            steps: [
              `Faraday's law: ${it("ℰ")} = −${it("N")}${M.frac(`Δ${sym("Φ", "B")}`, `Δ${it("t")}`)}, with flux ${sym("Φ", "B")} = ${it("B")}${it("A")}.`,
              `Change in flux: Δ${sym("Φ", "B")} = ${it("A")}Δ${it("B")} = ${n(A)} × 10<sup>−4</sup>&nbsp;m² × (${n(B2)} − ${n(B1)}) × 10<sup>−3</sup>&nbsp;T = ${n(dPhi)} × 10<sup>−6</sup>&nbsp;Wb.`,
              `|${it("ℰ")}| = ${n(N)} × ${M.frac(`${n(Math.abs(dPhi))} × 10<sup>−6</sup>`, `${n(dt)} × 10<sup>−3</sup>`)} = ${q(emf, "V")}. By Lenz's law the induced current opposes the change: it would ${dB > 0 ? "weaken" : "prop up"} the field through the coil.`,
            ],
            answer: { kind: "number", value: emf }, answerText: q(emf, "V"), answerInput: String(emf), vals: { dB, dPhi, adPhi: Math.abs(dPhi), emf }, params: { N, A, B1, B2, dt }, consts: [10, 4, 3, 6],
          };
        }
      },
    },

    // ---- EE.19 Transformers & power transmission -------------------------------------------------------------------------------
    "EE.15": {
      title: "Transformers and transmission losses",
      generate(r, level) {
        const Np = sym("N", "p"), Ns = sym("N", "s"), Vp = sym("V", "p"), Vs = sym("V", "s");
        if (level === 1) {
          for (;;) {
            const vp = r.pick([120, 230, 240, 480, 7200]), np_ = r.pick([100, 200, 400, 500, 1000, 1200, 2000, 3000]), ns = r.pick([10, 20, 25, 50, 100, 200, 400, 600, 1000]), vs = (vp * ns) / np_;
            if (!Number.isInteger(vs * 10) || ns === np_) continue;
            return {
              prompt: `An ideal transformer has ${big(np_)} turns on its primary and ${big(ns)} on its secondary. The primary is connected to ${big(vp)}&nbsp;V ac. What is the secondary voltage?`,
              steps: [`Voltage scales with turns: ${M.frac(Vs, Vp)} = ${M.frac(Ns, Np)}, so ${Vs} = ${Vp}${M.frac(Ns, Np)}.`, `${Vs} = ${big(vp)} × ${M.frac(big(ns), big(np_))} = ${q(vs, "V")}, a step-${ns > np_ ? "up" : "down"} transformer.`],
              answer: { kind: "number", value: vs }, answerText: q(vs, "V"), answerInput: String(vs), vals: { vs }, params: { vp, np: np_, ns },
            };
          }
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            for (;;) {
              const vp = r.pick([120, 230, 240]), vs = r.pick([6, 12, 24, 48]), is = r.pick([0.5, 1, 2, 2.5, 5, 10]), Pw = vs * is, ip = Pw / vp;
              if (!Number.isInteger(r2(ip * 10000, 6))) continue;
              return {
                prompt: `An ideal ${big(vp)}&nbsp;V to ${q(vs, "V")} transformer supplies ${q(is, "A")} to a load. What current does it draw from the ${big(vp)}&nbsp;V side, in amperes?`,
                steps: [`An ideal transformer has no losses, so power in equals power out: ${Vp}${sym("I", "p")} = ${Vs}${sym("I", "s")}.`, `Output power: ${n(vs)} × ${n(is)} = ${q(Pw, "W")}.`, `${sym("I", "p")} = ${M.frac(n(Pw), big(vp))} = ${q(ip, "A")}: stepping the voltage down steps the current up.`],
                answer: { kind: "number", value: ip }, answerText: q(ip, "A"), answerInput: String(ip), vals: { P: Pw, ip }, params: { kind: 0, vp, vs, is },
              };
            }
          }
          const k = r.pick([2, 3, 4, 5, 8, 10, 20]), ZL = r.pick([4, 8, 16]), Zin = k * k * ZL;
          return {
            prompt: `${cap1(art(ZL))} ${q(ZL, OHM)} speaker is driven through an output transformer with turns ratio ${Np}:${Ns} = ${n(k)}:1. What resistance does the amplifier see at the primary?`,
            steps: [`A load seen through a transformer is scaled by the turns ratio squared: ${sym("Z", "in")} = ${M.sup(`(${Np}/${Ns})`, 2)}${sym("Z", "L")}.`, `${sym("Z", "in")} = ${M.sup(n(k), 2)} × ${n(ZL)} = ${n(k * k)} × ${n(ZL)} = ${q(Zin, OHM)}. This is how transformers match a load to a source.`],
            answer: { kind: "number", value: Zin }, answerText: q(Zin, OHM), answerInput: String(Zin), vals: { kk: k * k, Zin }, params: { kind: 1, k, ZL },
          };
        }
        for (;;) {
          const Pk = r.pick([100, 200, 500, 1000, 2000]), Rl = r.pick([0.5, 1, 2, 4, 5]), V1 = r.pick([2, 4, 5, 10]), mult = r.pick([5, 10, 20]), V2 = V1 * mult;
          const I1 = Pk / V1, I2 = Pk / V2, L1 = (I1 * I1 * Rl) / 1000, L2 = (I2 * I2 * Rl) / 1000;   // kW / kV = A; A² Ω / 1000 = kW
          if (!Number.isInteger(r2(I2 * 100, 6)) || !Number.isInteger(r2(L2 * 1000, 6)) || L1 >= Pk) continue;
          return {
            prompt: `A town draws ${big(Pk)}&nbsp;kW through a line with total resistance ${q(Rl, OHM)}. How much power is lost in the line if it runs at ${q(V1, "kV")}, and at ${q(V2, "kV")}? (Treat the load as resistive, power factor 1.) Enter both losses in kW.`,
            steps: [
              `For a fixed delivered power the line current is ${it("I")} = ${M.frac(it("P"), it("V"))}, and the loss is ${M.sup(it("I"), 2)}${it("R")}. (Kilowatts over kilovolts give amperes.)`,
              `At ${q(V1, "kV")}: ${it("I")} = ${M.frac(big(Pk), n(V1))} = ${q(I1, "A")}, loss = ${M.sup(n(I1), 2)} × ${n(Rl)} = ${big(I1 * I1 * Rl)}&nbsp;W = ${q(L1, "kW")}.`,
              `At ${q(V2, "kV")}: ${it("I")} = ${M.frac(big(Pk), n(V2))} = ${q(I2, "A")}, loss = ${M.sup(n(I2), 2)} × ${n(Rl)} = ${big(I2 * I2 * Rl)}&nbsp;W = ${q(L2, "kW")}.`,
              `Raising the voltage ${n(mult)}-fold cuts the current ${n(mult)}-fold and the loss ${n(mult * mult)}-fold: that is why grids use transformers to transmit at high voltage.`,
            ],
            answer: { kind: "numbers", values: [L1, L2], ordered: true }, answerText: `${q(L1, "kW")} at ${q(V1, "kV")}; ${q(L2, "kW")} at ${q(V2, "kV")}`, answerInput: `${L1}, ${L2}`,
            vals: { V2, I1, I2, W1: I1 * I1 * Rl, W2: I2 * I2 * Rl, L1, L2, m2: mult * mult }, params: { P: Pk, R: Rl, V1, mult },
          };
        }
      },
    },

    // ---- EE.20 Three-phase systems ---------------------------------------------------------------------------------------------
    "EE.three-phase": {
      title: "Three-phase power: wye and delta",
      generate(r, level) {
        const VL = sym("V", "L"), Vph = sym("V", "ph"), IL = sym("I", "L"), Iph = sym("I", "ph");
        if (level === 1) {
          for (;;) {
            if (r.chance(0.5)) {
              const vph = r.pick([120, 127, 230, 240, 277, 2400]), vl = vph * Math.sqrt(3);
              if (tie(vl, 1)) continue;
              return {
                prompt: `A wye-connected three-phase supply has a phase (line-to-neutral) voltage of ${big(vph)}&nbsp;V. What is the line-to-line voltage? Round to 1 decimal place.`,
                steps: [`In a wye (Y), a line voltage spans two phases ${n(120)}° apart, so ${VL} = ${M.sqrt("3")}${Vph} (and it leads its phase voltage by 30°).`, `${VL} = ${M.sqrt("3")} × ${big(vph)} ≈ ${q(vl, "V", 1)}.`],
                answer: { kind: "number", value: vl, dp: 1 }, answerText: q(vl, "V", 1), answerInput: r2(vl, 1).toString(), vals: { vl }, params: { kind: 0, vph }, consts: [120, 30, 3],
              };
            }
            const iph = r.pick([5, 8, 10, 12, 15, 20, 25]), il = iph * Math.sqrt(3);
            if (tie(il, 1)) continue;
            return {
              prompt: `Each phase of a delta-connected motor carries ${q(iph, "A")}. What current flows in each supply line? Round to 1 decimal place.`,
              steps: [`In a delta (Δ), each line feeds two phase windings whose currents are ${n(120)}° apart, so ${IL} = ${M.sqrt("3")}${Iph} (and the line voltage equals the phase voltage).`, `${IL} = ${M.sqrt("3")} × ${n(iph)} ≈ ${q(il, "A", 1)}.`],
              answer: { kind: "number", value: il, dp: 1 }, answerText: q(il, "A", 1), answerInput: r2(il, 1).toString(), vals: { il }, params: { kind: 1, iph }, consts: [120, 3],
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const vl = r.pick([208, 400, 415, 480]), il = r.pick([10, 15, 20, 25, 30, 40, 50]), pf = r.pick([0.8, 0.85, 0.9, 0.95, 1]), Pw = Math.sqrt(3) * vl * il * pf, Pk = Pw / 1000;
            if (tie(Pk, 2)) continue;
            return {
              prompt: `A balanced three-phase load draws ${q(il, "A")} per line from ${art(vl)} ${q(vl, "V")} (line-to-line) supply at a power factor of ${n(pf)}. What real power does it use, in kilowatts? Round to 2 decimal places.`,
              steps: [`Total real power of a balanced load, in line quantities (for wye or delta alike): ${it("P")} = ${M.sqrt("3")}${VL}${IL} cos ${it("θ")}.`, `${it("P")} = ${M.sqrt("3")} × ${n(vl)} × ${n(il)} × ${n(pf)} ≈ ${big(r2(Pw, 0))}&nbsp;W ≈ ${q(Pk, "kW", 2)}.`],
              answer: { kind: "number", value: Pk, dp: 2 }, answerText: q(Pk, "kW", 2), answerInput: r2(Pk, 2).toString(), vals: { Pw, Pk }, params: { vl, il, pf }, consts: [3],
            };
          }
        }
        for (;;) {
          const [a, b, h] = r.pick(TRIPLES), m = r.pick([1, 2, 3, 4, 5]), Rv = a * m, X = b * m, Zm = h * m, vph = r.pick([120, 230, 240, 277]), iph = vph / Zm;
          if (!Number.isInteger(r2(iph * 100, 6))) continue;
          const P1 = iph * iph * Rv, Pt = 3 * P1, pf = a / h, vl = vph * Math.sqrt(3);
          return {
            prompt: `A balanced wye load has impedance ${it("Z")} = ${n(Rv)} + ${it("j")}${n(X)}&nbsp;Ω in each phase and is fed with ${big(vph)}&nbsp;V line-to-neutral (about ${q(vl, "V", 0)} line-to-line). What total real power does it absorb, in watts?`,
            steps: [
              `Solve one phase as a single-phase circuit: |${it("Z")}| = ${M.sqrt(`${M.sup(n(Rv), 2)} + ${M.sup(n(X), 2)}`)} = ${q(Zm, OHM)}, so ${Iph} = ${M.frac(big(vph), n(Zm))} = ${q(iph, "A")} (also the line current, in a wye).`,
              `Only the resistance absorbs real power: per phase ${M.sup(Iph, 2)}${it("R")} = ${M.sup(n(iph), 2)} × ${n(Rv)} = ${big(P1)}&nbsp;W.`,
              `Three equal phases: ${it("P")} = 3 × ${big(P1)} = ${big(Pt)}&nbsp;W. Check: ${M.sqrt("3")}${VL}${IL}·pf = 3${Vph}${Iph}·${M.frac(n(Rv), n(Zm))} = 3 × ${big(vph)} × ${n(iph)} × ${M.f(new Frac(Rv, Zm))} = ${big(Pt)}&nbsp;W.`,
            ],
            answer: { kind: "number", value: Pt }, answerText: `${big(Pt)}&nbsp;W`, answerInput: String(Pt), vals: { Zm, iph, P1, Pt, vl, pfq: fracVal(new Frac(Rv, Zm)), pf }, params: { R: Rv, X, vph }, consts: [3],
          };
        }
      },
    },

    // ---- EE.21 Batteries & energy storage --------------------------------------------------------------------------------------------
    "EE.21": {
      title: "Batteries: energy, runtime and packs",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.5)) {
            const Vn = r.pick([3.6, 3.7, 3.85, 7.4, 11.1, 12]), mAh = r.pick([1000, 2000, 2500, 3000, 4000, 5000, 10000]), Ah = mAh / 1000, Wh = r2(Vn * Ah, 6);
            return {
              prompt: `${cap1(art(Vn))} ${q(Vn, "V")} battery is rated ${big(mAh)}&nbsp;mAh. How much energy does it store, in watt-hours?`,
              steps: [`Amp-hours measure charge; multiply by the voltage to get energy: ${it("E")} = ${it("V")} × capacity.`, `${big(mAh)}&nbsp;mAh = ${q(Ah, "Ah")}, so ${it("E")} = ${n(Vn)} × ${n(Ah)} = ${q(Wh, "Wh")}.`],
              answer: { kind: "number", value: Wh }, answerText: q(Wh, "Wh"), answerInput: String(Wh), vals: { Ah, Wh }, params: { kind: 0, V: Vn, mAh }, consts: [1000],
            };
          }
          for (;;) {
            const Ah = r.pick([2, 5, 7, 10, 12, 20, 50, 100]), Iv = r.pick([0.5, 1, 2, 2.5, 4, 5, 10]), t = Ah / Iv;
            if (!Number.isInteger(t * 100)) continue;
            return {
              prompt: `Ideally, how many hours can ${art(Ah)} ${q(Ah, "Ah")} battery supply a steady ${q(Iv, "A")}?`,
              steps: [`Runtime ≈ ${M.frac("capacity (Ah)", `${it("I")} (A)`)}. Real runtime is shorter at high current.`, `${it("t")} = ${M.frac(n(Ah), n(Iv))} = ${q(t, "h")}.`],
              answer: { kind: "number", value: t }, answerText: q(t, "h"), answerInput: String(t), vals: { t }, params: { kind: 1, Ah, I: Iv },
            };
          }
        }
        if (level === 2) {
          const Vc = r.pick([3.6, 3.7]), Ac = r.pick([2.5, 3, 3.5, 5]), ns = r.pick([3, 4, 7, 10, 12, 13, 14]), npp = r.pick([2, 3, 4, 5]);
          const Vp = r2(ns * Vc, 6), Ap = r2(npp * Ac, 6), Wh = r2(Vp * Ap, 6), cells = ns * npp;
          return {
            prompt: `A battery pack is built from ${n(cells)} cells (${q(Vc, "V")}, ${q(Ac, "Ah")} each) wired as ${n(ns)} in series × ${n(npp)} in parallel ("${n(ns)}s${n(npp)}p"). Find the pack voltage and its energy. Enter the voltage (V), the energy (Wh).`,
            steps: [`Series cells add voltage: ${sym("V", "pack")} = ${n(ns)} × ${n(Vc)} = ${q(Vp, "V")}.`, `Parallel strings add capacity: ${n(npp)} × ${n(Ac)} = ${q(Ap, "Ah")}.`, `Energy: ${n(Vp)} × ${n(Ap)} = ${q(Wh, "Wh")} (the same as ${n(cells)} cells × ${n(r2(Vc * Ac, 6))}&nbsp;Wh each).`],
            answer: { kind: "numbers", values: [Vp, Wh], ordered: true }, answerText: `${q(Vp, "V")}, ${q(Wh, "Wh")}`, answerInput: `${Vp}, ${Wh}`,
            vals: { Vp, Ap, Wh, cells, cellWh: r2(Vc * Ac, 6) }, params: { Vc, Ac, ns, np: npp },
          };
        }
        for (;;) {
          if (r.chance(0.5)) {
            const mAh = r.pick([10000, 20000, 26800]), Vb = 3.7, eta = r.pick([0.6, 0.7, 0.8, 0.85, 0.9]), ph = r.pick([12, 15, 17, 19]);
            const Eb = (Vb * mAh) / 1000, Eo = Eb * eta, nCh = Eo / ph;
            if (tie(nCh, 1)) continue;
            return {
              prompt: `A power bank holds ${big(mAh)}&nbsp;mAh at its cells' ${q(Vb, "V")}. Conversion to 5&nbsp;V and charging losses leave ${n(eta * 100)}% of that energy for the phone. How many full charges of ${art(ph)} ${q(ph, "Wh")} phone battery does it give? Round to 1 decimal place.`,
              steps: [`Rated energy: ${n(Vb)}&nbsp;V × ${n(mAh / 1000)}&nbsp;Ah = ${q(Eb, "Wh")}. (Compare batteries in Wh: the mAh figure is at the cell voltage, not at 5&nbsp;V.)`,
                `Usable: ${n(Eb)} × ${n(eta)} = ${q(Eo, "Wh")}.`, `Charges: ${M.frac(n(Eo), n(ph))} ≈ ${n(nCh, 1)}.`],
              answer: { kind: "number", value: nCh, dp: 1 }, answerText: `about ${n(nCh, 1)} charges`, answerInput: r2(nCh, 1).toString(),
              vals: { Ah: mAh / 1000, Eb, Eo, nCh, pct: eta * 100 }, params: { kind: 0, mAh, eta, ph }, consts: [3.7, 5, 1000],
            };
          }
          const kWh = r.pick([40, 50, 60, 75, 82, 100]), use = r.pick([0.8, 0.9]), cons = r.pick([140, 150, 160, 180, 200, 250]), usable = kWh * use, km = (usable * 1000) / cons;
          if (!Number.isInteger(r2(km * 10, 6))) continue;
          return {
            prompt: `An electric car has ${art(kWh)} ${q(kWh, "kWh")} battery, of which the management system lets you use ${n(use * 100)}%. On the highway it uses ${q(cons, "Wh/km")}. What is its highway range, in kilometers?`,
            steps: [`Usable energy: ${n(kWh)} × ${n(use)} = ${q(usable, "kWh")} = ${big(usable * 1000)}&nbsp;Wh.`, `Range = ${M.frac("energy", "energy per km")} = ${M.frac(big(usable * 1000), n(cons))} = ${q(km, "km")}.`],
            answer: { kind: "number", value: km }, answerText: q(km, "km"), answerInput: String(km), vals: { usable, Wh: usable * 1000, km, pct: use * 100 }, params: { kind: 1, kWh, use, cons },
          };
        }
      },
    },

    // ---- EE.32 Diodes, LEDs & rectifiers ----------------------------------------------------------------------------------------------
    "EE.14": {
      title: "Diodes, LEDs and rectifiers",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const [col, Vf] = r.pick([["red", 2], ["red", 1.8], ["yellow", 2.1], ["green", 2.2], ["blue", 3.2], ["white", 3]]), Vs = r.pick([3.3, 5, 9, 12]), Ima = r.pick([5, 10, 15, 20, 25]);
            const drop = r2(Vs - Vf, 6), Rv = (drop * 1000) / Ima, Pr = r2(drop * Ima, 6);
            if (drop < 0.5 || !Number.isInteger(r2(Rv * 10, 6))) continue;
            return {
              prompt: `A ${col} LED (forward voltage ${q(Vf, "V")}) should run at ${q(Ima, "mA")} from ${art(Vs)} ${q(Vs, "V")} supply. What series resistor is needed, in ohms?`,
              steps: [`KVL around the loop: the resistor drops what the LED does not, ${n(Vs)} − ${n(Vf)} = ${q(drop, "V")}.`,
                `${it("R")} = ${M.frac(q(drop, "V"), q(Ima / 1000, "A"))} = ${q(Rv, OHM)}. It dissipates ${n(drop)} × ${n(Ima)} = ${q(Pr, "mW")}.`],
              answer: { kind: "number", value: Rv }, answerText: q(Rv, OHM), answerInput: String(Rv), vals: { drop, IA: Ima / 1000, R: Rv, P: Pr }, params: { Vf, Vs, I: Ima },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            if (r.chance(0.3)) {
              const Vm = r.pick([5, 10, 12, 15, 17, 24, 34]), pk = r2(Vm - 0.7, 6);
              return {
                prompt: `A silicon diode half-wave rectifies a sine wave of peak ${q(Vm, "V")} into a resistor. What is the peak output voltage (constant-drop model)?`,
                steps: [`The diode conducts only on positive half-cycles, and while it conducts it drops about 0.7&nbsp;V.`, `Peak output: ${n(Vm)} − 0.7 = ${q(pk, "V")}; on negative half-cycles the output is 0.`],
                answer: { kind: "number", value: pk }, answerText: q(pk, "V"), answerInput: String(pk), vals: { pk }, params: { kind: 0, Vm }, consts: [0.7],
              };
            }
            const Vs = r.pick([3, 5, 6, 9, 12, 15]), nd = r.pick([1, 1, 2, 3]), Rk = r.pick([0.5, 1, 2, 4.7, 10]), rev = r.chance(0.25);
            const drop = r2(0.7 * nd, 6), Iv = rev ? 0 : r2((Vs - drop) / Rk, 6);
            if (!rev && (Vs - drop <= 0 || !Number.isInteger(r2(Iv * 1000, 6)))) continue;
            return {
              prompt: `${cap1(art(Vs))} ${q(Vs, "V")} source drives ${nd === 1 ? "a silicon diode" : `${WORDS[nd]} silicon diodes in series`} and ${art(Rk)} ${q(Rk, KOHM)} resistor. The diode${nd === 1 ? " is" : "s are"} connected ${rev ? "with the cathode toward the source's + terminal (reverse-biased)" : "anode toward the source's + terminal (forward-biased)"}. Using the 0.7&nbsp;V constant-drop model, what current flows, in mA?`,
              steps: rev ? [`Guess: the diode is off. Then no current flows and the whole ${q(Vs, "V")} appears across the reversed diode.`, `Check: an off diode needs ${sym("V", "D")} &lt; 0.7&nbsp;V in the forward direction; here it is reverse-biased by ${q(Vs, "V")}, so the guess holds. ${it("I")} = 0&nbsp;mA.`]
                : [nd === 1 ? `Guess: the diode is on, dropping 0.7&nbsp;V.` : `Guess: the diodes are on, each dropping 0.7&nbsp;V: total ${n(nd)} × 0.7 = ${q(drop, "V")}.`,
                  `KVL: the resistor gets ${n(Vs)} − ${n(drop)} = ${q(r2(Vs - drop, 6), "V")}, so ${it("I")} = ${M.frac(n(r2(Vs - drop, 6)), n(Rk))} = ${q(Iv, "mA")}.`, `Check: ${it("I")} &gt; 0, so the "on" guess is consistent.`],
              answer: { kind: "number", value: Iv }, answerText: q(Iv, "mA"), answerInput: String(Iv), vals: rev ? { I: Iv } : { drop, VR: r2(Vs - drop, 6), I: Iv }, params: { kind: 1, Vs, nd, Rk, rev: rev ? 1 : 0 }, consts: [0.7],
            };
          }
        }
        for (;;) {
          const Vrms = r.pick([6, 9, 12, 15, 18, 24]), full = r.chance(0.5), f = r.pick([50, 60]), Cu = r.pick([470, 1000, 2200, 4700]), Ima = r.pick([100, 200, 250, 500, 1000]);
          const Vm = Vrms * Math.SQRT2, drop = full ? 1.4 : 0.7, pk = Vm - drop, fr = full ? 2 * f : f, Vr = (Ima / 1000) / (fr * Cu * 1e-6), Vmin = pk - Vr;
          if (Vmin <= 0 || Vr > 0.5 * pk || tie(Vmin, 2) || tie(Vr, 2)) continue;
          return {
            prompt: `A transformer gives ${q(Vrms, "V")} rms at ${q(f, "Hz")}. It feeds a ${full ? "full-wave bridge" : "half-wave"} rectifier with silicon diodes and ${art(Cu)} ${big(Cu)}&nbsp;μF filter capacitor. The load draws ${big(Ima)}&nbsp;mA. What is the lowest point of the output voltage (peak minus ripple)? Round to 2 decimal places.`,
            steps: [
              `Peak of the ac: ${M.sqrt("2")} × ${n(Vrms)} ≈ ${q(Vm, "V", 2)}. ${full ? "A bridge conducts through two diodes at a time, dropping 1.4&nbsp;V" : "One diode drops 0.7&nbsp;V"}: peak output ≈ ${q(pk, "V", 2)}.`,
              `Between peaks the capacitor supplies the load. Ripple ≈ ${M.frac(sym("I", "load"), `${it("f")}${it("C")}`)}, with ${it("f")} = ${q(fr, "Hz")} (${full ? "a full-wave rectifier tops up the capacitor twice per cycle" : "once per cycle"}): ${M.frac(n(Ima / 1000), `${n(fr)} × ${big(Cu)} × 10<sup>−6</sup>`)} ≈ ${q(Vr, "V", 2)}.`,
              `Lowest output ≈ ${n(pk, 2)} − ${n(Vr, 2)} ≈ ${q(Vmin, "V", 2)}.`,
            ],
            answer: { kind: "number", value: Vmin, dp: 2 }, answerText: q(Vmin, "V", 2), answerInput: r2(Vmin, 2).toString(),
            vals: { Vm, pk, fr, IA: Ima / 1000, Vr, Vmin }, params: { Vrms, full: full ? 1 : 0, f, Cu, I: Ima }, consts: [0.7, 1.4, 10, 6],
          };
        }
      },
    },

    // ---- EE.33 BJT & MOSFET operating regions -----------------------------------------------------------------------------------------
    "EE.transistor-regions": {
      title: "Transistor operating regions",
      generate(r, level) {
        const IB = sym("I", "B"), IC = sym("I", "C"), IE = sym("I", "E"), b = it("β");
        if (level === 1) {
          const ib = r.pick([10, 20, 25, 40, 50, 80, 100]), beta = r.pick([50, 80, 100, 120, 150, 200, 250]), ic = (beta * ib) / 1000, ie = r2(ic + ib / 1000, 6);
          return {
            prompt: `An npn transistor in the active region has ${b} = ${n(beta)} and base current ${q(ib, "μA")}. Find the collector and emitter currents, in mA. Enter ${IC}, ${IE}.`,
            steps: [`Active region: ${IC} = ${b}${IB} = ${n(beta)} × ${n(ib)}&nbsp;μA = ${big(beta * ib)}&nbsp;μA = ${q(ic, "mA")}.`, `KCL on the transistor: ${IE} = ${IB} + ${IC} = ${n(ib / 1000)} + ${n(ic)} = ${q(ie, "mA")}.`],
            answer: { kind: "numbers", values: [ic, ie], ordered: true }, answerText: `${IC} = ${q(ic, "mA")}, ${IE} = ${q(ie, "mA")}`, answerInput: `${ic}, ${ie}`,
            vals: { icu: beta * ib, ic, ibm: ib / 1000, ie }, params: { ib, beta },
          };
        }
        if (level === 2) {
          for (;;) {
            const kn = r.pick([0.5, 1, 2, 4]), Vt = r.pick([0.5, 1, 1.5, 2]), Vgs = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4, 5]), Vds = r.pick([0.5, 1, 2, 3, 5, 8]);
            const ov = Vgs - Vt, region = ov <= 0 ? 0 : Vds >= ov ? 2 : 1;
            if (r.chance(region === 0 ? 0.7 : 0)) continue;
            const id = region === 0 ? 0 : region === 2 ? 0.5 * kn * ov * ov : kn * (ov * Vds - 0.5 * Vds * Vds);
            const steps = [`Overdrive: ${sym("V", "GS")} − ${sym("V", "t")} = ${n(Vgs)} − ${n(Vt)} = ${q(ov, "V")}.`];
            if (region === 0) steps.push(`The overdrive is not positive (${sym("V", "GS")} ≤ ${sym("V", "t")}), so the channel is off: cutoff, ${sym("I", "D")} = 0.`);
            else if (region === 2) steps.push(`${sym("V", "DS")} = ${q(Vds, "V")} ≥ ${q(ov, "V")}, so the MOSFET is in saturation (the amplifier region).`,
              `${sym("I", "D")} = ½${sym("k", "n")}${M.sup(`(${sym("V", "GS")} − ${sym("V", "t")})`, 2)} = ½ × ${n(kn)} × ${M.sup(n(ov), 2)} = ${q(id, "mA")}.`);
            else steps.push(`${sym("V", "DS")} = ${q(Vds, "V")} &lt; ${q(ov, "V")}, so it is in the triode (linear) region, acting like a voltage-controlled resistor.`,
              `${sym("I", "D")} = ${sym("k", "n")}[(${sym("V", "GS")} − ${sym("V", "t")})${sym("V", "DS")} − ½${M.sup(sym("V", "DS"), 2)}] = ${n(kn)} × [${n(ov)} × ${n(Vds)} − ½ × ${M.sup(n(Vds), 2)}] = ${n(kn)} × ${n(ov * Vds - 0.5 * Vds * Vds)} = ${q(id, "mA")}.`);
            return {
              prompt: `An n-channel MOSFET has ${sym("k", "n")} = ${n(kn)}&nbsp;mA/V² and threshold ${sym("V", "t")} = ${q(Vt, "V")}. It is biased at ${sym("V", "GS")} = ${q(Vgs, "V")} and ${sym("V", "DS")} = ${q(Vds, "V")}. What is the drain current, in mA?`,
              steps, answer: { kind: "number", value: id }, answerText: `${q(id, "mA")} (${["cutoff", "triode", "saturation"][region]})`, answerInput: String(r2(id, 6)),
              vals: { ov, id, br: ov * Vds - 0.5 * Vds * Vds }, params: { kn, Vt, Vgs, Vds },
            };
          }
        }
        for (;;) {
          const Vbb = r.pick([2, 3, 5]), Rb = r.pick([10, 20, 43, 47, 100, 220]), beta = r.pick([50, 100, 150, 200]), Vcc = r.pick([9, 10, 12, 15]), Rc = r.pick([0.5, 1, 2, 2.2, 4.7]);
          const ib = (Vbb - 0.7) / Rb, icA = beta * ib, vceA = Vcc - icA * Rc, sat = vceA < 0.2;
          if (!Number.isInteger(r2(ib * 1e5, 6)) || !Number.isInteger(r2(vceA * 1000, 6)) || (sat && r.chance(0.5)) || Math.abs(vceA - 0.2) < 0.3) continue;
          const icS = (Vcc - 0.2) / Rc, vce = sat ? 0.2 : vceA;
          if (sat && !Number.isInteger(r2(icS * 1000, 6))) continue;
          const steps = [
            `Base loop: ${IB} = ${M.frac(`${sym("V", "BB")} − 0.7`, sym("R", "B"))} = ${M.frac(n(r2(Vbb - 0.7, 6)), n(Rb))} = ${q(ib, "mA")} (${q(r2(ib * 1000, 6), "μA")}).`,
            `Assume the active region: ${IC} = ${b}${IB} = ${n(beta)} × ${n(ib)} = ${q(icA, "mA")}, so ${sym("V", "CE")} = ${sym("V", "CC")} − ${IC}${sym("R", "C")} = ${n(Vcc)} − ${n(icA)} × ${n(Rc)} = ${q(vceA, "V")}.`,
          ];
          if (sat) steps.push(`That is below 0.2&nbsp;V (${vceA < 0 ? "even negative" : "too small"}), so the assumption fails: the transistor is saturated, a closed switch. Then ${sym("V", "CE")} ≈ 0.2&nbsp;V and ${IC} = ${M.frac(`${n(Vcc)} − 0.2`, n(Rc))} = ${q(icS, "mA")}, less than ${b}${IB}.`);
          else steps.push(`${n(vceA)}&nbsp;V &gt; 0.2&nbsp;V, so the active-region assumption holds: it works as an amplifier.`);
          return {
            prompt: `An npn transistor (${b} = ${n(beta)}, ${sym("V", "BE")} = 0.7&nbsp;V when on, ${sym("V", "CE,sat")} = 0.2&nbsp;V) has its base fed from ${q(Vbb, "V")} through ${sym("R", "B")} = ${q(Rb, KOHM)}, and its collector tied to ${q(Vcc, "V")} through ${sym("R", "C")} = ${q(Rc, KOHM)}; the emitter is grounded. What is ${sym("V", "CE")}?`,
            steps, answer: { kind: "number", value: vce }, answerText: `${q(vce, "V")} (${sat ? "saturation" : "active"})`, answerInput: String(r2(vce, 6)),
            vals: sat ? { vbb7: r2(Vbb - 0.7, 6), ib, ibu: r2(ib * 1000, 6), icA, vceA, icS, vce } : { vbb7: r2(Vbb - 0.7, 6), ib, ibu: r2(ib * 1000, 6), icA, vceA, vce },
            params: { Vbb, Rb, beta, Vcc, Rc }, consts: [0.7, 0.2],
          };
        }
      },
    },

    // ---- EE.34 Operational amplifiers -------------------------------------------------------------------------------------------------
    "EE.13": {
      title: "Op-amp amplifiers",
      generate(r, level) {
        const Rf = sym("R", "f"), Rin = sym("R", "in"), Rg = sym("R", "g"), Vo = sym("V", "out"), Vi = sym("V", "in");
        if (level === 1) {
          for (;;) {
            const inv = r.chance(0.5), rf = r.pick([10, 20, 22, 33, 47, 50, 100]), ri = r.pick([1, 2, 5, 10, 11, 22]), vin = r.pick([0.1, 0.2, 0.25, 0.5, -0.1, -0.2, 1]);
            const G = inv ? -rf / ri : 1 + rf / ri, vo = r2(G * vin, 9);
            if (!Number.isInteger(r2(G * 100, 6)) || !Number.isInteger(r2(vo * 1000, 6)) || Math.abs(vo) > 12) continue;
            return {
              prompt: `${inv ? "An inverting" : "A non-inverting"} amplifier uses ${Rf} = ${q(rf, KOHM)} and ${inv ? Rin : Rg} = ${q(ri, KOHM)}. What is ${Vo} for ${Vi} = ${q(vin, "V")}? (Ideal op-amp, output within the supply rails.)`,
              steps: [inv ? `Inverting: the + input is grounded, so the − input is a virtual ground and ${M.frac(Vo, Vi)} = −${M.frac(Rf, Rin)} = −${M.frac(n(rf), n(ri))} = ${n(G)}.`
                : `Non-inverting: ${M.frac(Vo, Vi)} = 1 + ${M.frac(Rf, Rg)} = 1 + ${M.frac(n(rf), n(ri))} = ${n(G)}.`, `${Vo} = ${n(G)} × ${np(vin)} = ${q(vo, "V")}.`],
              answer: { kind: "number", value: vo }, answerText: q(vo, "V"), answerInput: String(vo), vals: { G, vo }, params: { inv: inv ? 1 : 0, rf, ri, vin },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const rf = r.pick([10, 20, 30, 40, 50, 90, 100]), rg = r.pick([1, 2, 5, 10]), vin = r.pick([0.1, 0.2, 0.3, 0.5, 0.8, 1, 1.5, -0.5, -1]), rail = r.pick([5, 9, 12, 15]);
            const G = 1 + rf / rg, ideal = r2(G * vin, 9), clip = Math.abs(ideal) > rail, vo = clip ? Math.sign(ideal) * rail : ideal;
            if (!Number.isInteger(G) || !Number.isInteger(r2(ideal * 100, 6)) || Math.abs(Math.abs(ideal) - rail) < 0.5 || (!clip && r.chance(0.4))) continue;
            return {
              prompt: `A non-inverting amplifier with ${Rf} = ${q(rf, KOHM)} and ${Rg} = ${q(rg, KOHM)} runs on ±${q(rail, "V")} supplies; its output can swing to the rails but no further. What is the output for an input of ${q(vin, "V")}?`,
              steps: [`Gain: 1 + ${M.frac(n(rf), n(rg))} = ${n(G)}.`, `Ideal output: ${n(G)} × ${np(vin)} = ${q(ideal, "V")}.`,
                clip ? `That is beyond the ${ideal > 0 ? "+" : "−"}${q(rail, "V")} rail, so the output clips (saturates) at ${q(vo, "V")}; the golden rules no longer hold.` : `That is inside ±${q(rail, "V")}, so the output is ${q(vo, "V")}.`],
              answer: { kind: "number", value: vo }, answerText: q(vo, "V"), answerInput: String(vo), vals: { G, ideal, vo }, params: { rf, rg, vin, rail },
            };
          }
        }
        for (;;) {
          const gbw = r.pick([1, 3, 4, 8, 10]), G = r.pick([10, 20, 50, 100, 200]), need = r.pick([20, 50, 100]), bw = (gbw * 1000) / G;
          if (!Number.isInteger(r2(bw * 10, 6)) || bw === need) continue;
          const ok = bw >= need, Gmax = (gbw * 1000) / need;
          return {
            prompt: `An op-amp has a gain–bandwidth product of ${q(gbw, "MHz")}. It is wired as a non-inverting amplifier with gain ${n(G)}. What is its −3&nbsp;dB bandwidth, in kHz? Is that enough for a signal reaching ${q(need, "kHz")}?`,
            steps: [`Gain times bandwidth is roughly constant: ${sym("A", "cl")} · ${sym("f", "−3dB")} ≈ GBW, so ${sym("f", "−3dB")} ≈ ${M.frac("GBW", sym("A", "cl"))}.`,
              `${sym("f", "−3dB")} ≈ ${M.frac(`${big(gbw * 1000)}&nbsp;kHz`, n(G))} = ${q(bw, "kHz")}.`,
              ok ? `${n(bw)}&nbsp;kHz ≥ ${n(need)}&nbsp;kHz, so it is enough.` : `${n(bw)}&nbsp;kHz &lt; ${n(need)}&nbsp;kHz, so it is not: use a faster op-amp, or split the gain over two stages (one stage could give at most ${n(Gmax)} at ${q(need, "kHz")}).`],
            answer: { kind: "number", value: bw }, answerText: `${q(bw, "kHz")} (${ok ? "enough" : "not enough"})`, answerInput: String(bw), vals: { gbwk: gbw * 1000, bw, Gmax }, params: { gbw, G, need }, consts: [3],
          };
        }
      },
    },

    // ---- EE.35 Op-amp configurations ---------------------------------------------------------------------------------------------------
    "EE.opamp-configs": {
      title: "Summing, difference and integrator op-amp circuits",
      generate(r, level) {
        const Vo = sym("V", "out");
        if (level === 1) {
          for (;;) {
            const rf = r.pick([10, 20, 30, 60, 100]), r1 = r.pick([10, 20, 30, 60, 100]), r2_ = r.pick([5, 10, 20, 50]), v1 = r.pick([0.5, 1, 2, -1, 1.5]), v2 = r.pick([0.2, 0.5, 1, -0.5, -2]);
            const t1 = (rf / r1) * v1, t2 = (rf / r2_) * v2, vo = -(t1 + t2);
            if (!Number.isInteger(r2(t1 * 100, 6)) || !Number.isInteger(r2(t2 * 100, 6)) || Math.abs(vo) > 14 || vo === 0) continue;
            return {
              prompt: `A summing amplifier has ${R("f")} = ${q(rf, KOHM)}, input ${V(1)} = ${q(v1, "V")} through ${R(1)} = ${q(r1, KOHM)} and input ${V(2)} = ${q(v2, "V")} through ${R(2)} = ${q(r2_, KOHM)}. What is ${Vo}?`,
              steps: [`The − input is a virtual ground, so each input sends ${M.frac(sym("V", "k"), sym("R", "k"))} into the junction, and it all flows through ${R("f")}: ${Vo} = −${R("f")}(${M.frac(V(1), R(1))} + ${M.frac(V(2), R(2))}).`,
                `Weighted terms: ${M.frac(n(rf), n(r1))} × ${np(v1)} = ${n(r2(t1, 9))} and ${M.frac(n(rf), n(r2_))} × ${np(v2)} = ${n(r2(t2, 9))}.`,
                `${Vo} = −(${n(r2(t1, 9))} + ${np(r2(t2, 9))}) = ${q(r2(vo, 9), "V")}.`],
              answer: { kind: "number", value: r2(vo, 9) }, answerText: q(r2(vo, 9), "V"), answerInput: String(r2(vo, 9)), vals: { t1: r2(t1, 9), t2: r2(t2, 9), vo: r2(vo, 9) }, params: { rf, r1, r2: r2_, v1, v2 },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const ra = r.pick([1, 2, 5, 10]), rb = r.pick([10, 20, 50, 100]), v1 = r.pick([1, 1.2, 1.5, 2, 2.5, 3]), v2 = r.pick([1.1, 1.3, 1.6, 2.2, 2.8, 3.1]), G = rb / ra, d = r2(v2 - v1, 9), vo = r2(G * d, 9);
            if (!Number.isInteger(G) || d === 0 || Math.abs(vo) > 14) continue;
            return {
              prompt: `A difference amplifier has matched resistors ${R(1)} = ${q(ra, KOHM)} and ${R(2)} = ${q(rb, KOHM)}. Its inputs are ${V(1)} = ${q(v1, "V")} (to the − side) and ${V(2)} = ${q(v2, "V")} (to the + side). What is ${Vo}?`,
              steps: [`With matched ratios the circuit amplifies only the difference: ${Vo} = ${M.frac(R(2), R(1))}(${V(2)} − ${V(1)}). Any voltage common to both inputs cancels.`,
                `${V(2)} − ${V(1)} = ${n(v2)} − ${n(v1)} = ${q(d, "V")}, and ${M.frac(n(rb), n(ra))} = ${n(G)}.`, `${Vo} = ${n(G)} × ${np(d)} = ${q(vo, "V")}.`],
              answer: { kind: "number", value: vo }, answerText: q(vo, "V"), answerInput: String(vo), vals: { G, d, vo }, params: { ra, rb, v1, v2 },
            };
          }
        }
        for (;;) {
          const Rk = r.pick([1, 2, 5, 10, 20]), Cu = r.pick([0.1, 0.5, 1, 2, 10]), vin = r.pick([0.5, 1, 2, -0.5, -1, -2]), rail = r.pick([10, 12, 15]), tau = r2(Rk * Cu, 9);
          const slope = -vin / tau, ts = (rail * tau) / Math.abs(vin);
          if (!Number.isInteger(r2(ts * 100, 6)) || !Number.isInteger(r2(slope * 1000, 6))) continue;
          const sat = -Math.sign(vin) * rail;
          return {
            prompt: `An op-amp integrator has ${it("R")} = ${q(Rk, KOHM)} at the input and ${it("C")} = ${q(Cu, "μF")} in the feedback path, with the capacitor initially discharged. At ${it("t")} = 0 a steady ${q(vin, "V")} is applied. The output saturates at ±${q(rail, "V")}. How long until it saturates, in ms?`,
            graph: graph({ view: [0, ts * 1.5, -rail - 2, rail + 2], items: [{ t: "fn", e: `(${slope})*x`, role: "primary" }, { t: "hline", y: sat, dash: true, role: "muted" }] }),
            steps: [
              `Integrator: ${Vo} = −${M.frac("1", it("RC"))}∫${sym("V", "in")}&thinsp;${it("dt")}. A constant input makes a straight ramp: ${Vo} = −${M.frac(sym("V", "in"), it("RC"))}${it("t")}.`,
              `${it("RC")} = ${n(Rk)}&nbsp;kΩ × ${n(Cu)}&nbsp;μF = ${q(tau, "ms")}, so the output moves at −${M.frac(n(vin), n(tau))} = ${n(slope)}&nbsp;V/ms.`,
              `It reaches ${q(sat, "V")} when ${M.frac(`${Math.abs(vin) === 1 ? "" : n(Math.abs(vin))}${it("t")}`, n(tau))} = ${n(rail)}: ${it("t")} = ${M.frac(`${n(rail)} × ${n(tau)}`, n(Math.abs(vin)))} = ${q(ts, "ms")}. (A real integrator needs a large resistor across ${it("C")} to stop slow drift.)`,
            ],
            answer: { kind: "number", value: ts }, answerText: q(ts, "ms"), answerInput: String(ts), vals: { tau, slope, ts, sat, absv: Math.abs(vin) }, params: { Rk, Cu, vin, rail },
          };
        }
      },
    },
    // ---- EE.22 LTI systems & convolution --------------------------------------------------------------------------------------------
    "EE.lti": {
      title: "Convolution and BIBO stability",
      generate(r, level) {
        const seq = (a) => `[${a.map((v) => n(v)).join(", ")}]`;
        if (level <= 2) {
          for (;;) {
            const x = level === 1 ? [r.int(1, 4), r.int(0, 4), r.int(1, 4)] : [r.int(-3, 4), r.int(-3, 4), r.int(-3, 4)];
            const h = level === 1 ? [r.int(1, 3), r.int(1, 3)] : [r.int(-2, 3), r.int(-2, 3), r.int(-2, 3)];
            if (level === 2 && (x[0] === 0 || x[2] === 0 || h[0] === 0 || h[2] === 0 || !x.some((v) => v < 0) && !h.some((v) => v < 0))) continue;
            const L = x.length + h.length - 1, y = [], lines = [];
            for (let k = 0; k < L; k++) {
              const terms = [];
              let s = 0;
              for (let i = 0; i < x.length; i++) { const jj = k - i; if (jj >= 0 && jj < h.length) { terms.push(`${np(x[i])} × ${np(h[jj])}`); s += x[i] * h[jj]; } }
              y.push(s);
              lines.push(`${it("y")}[${n(k)}] = ${terms.join(" + ")} = ${n(s)}`);
            }
            return {
              prompt: `An LTI system has impulse response ${it("h")}[${it("n")}] = ${seq(h)} (starting at ${it("n")} = 0). Find its output for the input ${it("x")}[${it("n")}] = ${seq(x)}. Enter all ${n(L)} output samples in order, separated by commas.`,
              graph: graph({ view: [-1, L, Math.min(0, ...x) - 1, Math.max(0, ...x) + 1], items: x.map((v, i) => W([i, 0], [i, v])).concat(x.map((v, i) => dot(i, v))) }),
              steps: [
                `The output is the convolution ${it("y")}[${it("n")}] = Σ<sub>${it("k")}</sub> ${it("x")}[${it("k")}]${it("h")}[${it("n")} − ${it("k")}]: flip ${it("h")}, slide it along, multiply where it overlaps ${it("x")}, and add. The length is ${n(x.length)} + ${n(h.length)} − 1 = ${n(L)}.`,
                `${lines.join("; ")}.`,
                `${it("y")} = ${seq(y)}. (Check: the sum of ${it("y")}, ${n(y.reduce((a, b) => a + b, 0))}, equals (sum of ${it("x")}) × (sum of ${it("h")}) = ${n(x.reduce((a, b) => a + b, 0))} × ${np(h.reduce((a, b) => a + b, 0))}.)`,
              ],
              answer: { kind: "numbers", values: y, ordered: true }, answerText: seq(y), answerInput: y.join(", "),
              vals: { L, y, sy: y.reduce((a, b) => a + b, 0), sx: x.reduce((a, b) => a + b, 0), sh: h.reduce((a, b) => a + b, 0) }, params: { x, h }, consts: [3, 4],
            };
          }
        }
        const A = r.pick([1, 2, 3, 4, 6]), rr = r.pick([new Frac(1, 2), new Frac(-1, 2), new Frac(1, 3), new Frac(-1, 3), new Frac(2, 3), new Frac(3, 4), new Frac(-3, 4), new Frac(1, 4)]);
        const ab = rr.abs(), sum = new Frac(A).div(new Frac(1).sub(ab)), h0 = A, h1 = rr.mul(A), h2 = rr.mul(rr).mul(A);
        const pts = [0, 1, 2, 3, 4, 5].map((k) => [k, rr.pow(k).mul(A).value]);
        return {
          prompt: `A discrete-time system has impulse response ${it("h")}[${it("n")}] = ${n(A)}${M.sup(`(${M.f(rr)})`, it("n"))} for ${it("n")} ≥ 0 (zero before). Is it BIBO stable? Compute Σ|${it("h")}[${it("n")}]|.`,
          graph: graph({ view: [-1, 7, Math.min(0, ...pts.map((p) => p[1])) - 1, A + 1], items: pts.map(([k, v]) => W([k, 0], [k, v])).concat(pts.map(([k, v]) => dot(k, v))) }),
          steps: [
            `BIBO stability needs the impulse response to be absolutely summable: Σ|${it("h")}[${it("n")}]| &lt; ∞.`,
            `|${it("h")}[${it("n")}]| = ${n(A)}${M.sup(`(${M.f(ab)})`, it("n"))}: ${n(h0)}, ${M.f(h1.abs())}, ${M.f(h2.abs())}, … a geometric series with ratio ${M.f(ab)}.`,
            `Σ = ${M.frac(n(A), `1 − ${M.f(ab)}`)} = ${M.f(sum)}. It is finite (because |${M.f(rr)}| &lt; 1), so the system is stable: every bounded input gives a bounded output.`,
          ],
          answer: { kind: "number", value: sum.value }, answerText: `${M.f(sum)} (stable)`, answerInput: typed(sum),
          vals: { sum: fracVal(sum), h1: fracVal(h1.abs()), h2: fracVal(h2.abs()), ab: fracVal(ab), pts }, params: { A, r: fracVal(rr) },
        };
      },
    },

    // ---- EE.23 Laplace transform ----------------------------------------------------------------------------------------------------
    "EE.laplace": {
      title: "Laplace transforms and transfer functions",
      generate(r, level) {
        const s = it("s"), t = it("t"), ex = (a, v = t) => M.sup("e", `−${a === 1 ? "" : n(a)}${v}`);
        const lin = (a) => `${s} + ${n(a)}`;
        if (level === 1) {
          if (r.chance(0.5)) {
            const A = r.int(1, 9), B = r.nonzero(-6, 6), a = r.int(1, 6);
            return {
              prompt: `Find the Laplace transform of ${M.eq(`${it("f")}(${t}) = ${n(A)} ${B < 0 ? "−" : "+"} ${Math.abs(B) === 1 ? "" : n(Math.abs(B))}${ex(a)}, &nbsp; ${t} ≥ 0`)} Enter ${it("F")}(${s}).`,
              steps: [`The transform is linear, so transform each term with the table: ${it("u")}(${t}) → ${M.frac("1", s)} and ${M.sup("e", `−${it("a")}${t}`)} → ${M.frac("1", `${s} + ${it("a")}`)}.`,
                `${it("F")}(${s}) = ${M.frac(n(A), s)} ${B < 0 ? "−" : "+"} ${M.frac(n(Math.abs(B)), lin(a))}.`],
              answer: { kind: "expr", expr: `${A}/s + (${B})/(s + ${a})`, vars: ["s"] }, answerText: `${M.frac(n(A), s)} ${B < 0 ? "−" : "+"} ${M.frac(n(Math.abs(B)), lin(a))}`,
              answerInput: `${A}/s ${B < 0 ? "-" : "+"} ${Math.abs(B)}/(s + ${a})`, vals: {}, params: { kind: 0, A, B, a },
            };
          }
          const K = r.int(2, 12), a = r.int(1, 8);
          return {
            prompt: `Find the inverse Laplace transform of ${M.eq(`${it("F")}(${s}) = ${M.frac(n(K), lin(a))}`)} Enter ${it("f")}(${t}) for ${t} ≥ 0.`,
            steps: [`Table pair: ${M.frac("1", `${s} + ${it("a")}`)} ← ${M.sup("e", `−${it("a")}${t}`)}. A constant factor carries through.`, `${it("f")}(${t}) = ${n(K)}${ex(a)}.`],
            answer: { kind: "expr", expr: `${K}*exp(-${a}*t)`, vars: ["t"] }, answerText: `${n(K)}${ex(a)}`, answerInput: `${K}e^(-${a}t)`, vals: {}, params: { kind: 1, K, a },
          };
        }
        if (level === 2) {
          for (;;) {
            if (r.chance(0.5)) {
              const a = r.int(1, 6), K = a * r.int(1, 6), c = K / a;
              return {
                prompt: `Find ${it("y")}(${t}) for ${M.eq(`${it("Y")}(${s}) = ${M.frac(n(K), `${s}(${lin(a)})`)}`)}`,
                steps: [`Partial fractions: ${M.frac(n(K), `${s}(${lin(a)})`)} = ${M.frac(it("A"), s)} + ${M.frac(it("B"), lin(a))}.`,
                  `Cover-up: ${it("A")} = ${M.frac(n(K), `0 + ${n(a)}`)} = ${n(c)} (at ${s} = 0); ${it("B")} = ${M.frac(n(K), `−${n(a)}`)} = ${n(-c)} (at ${s} = −${n(a)}).`,
                  c === 1 ? `Invert term by term: ${it("y")}(${t}) = 1 − ${ex(a)}, a rise to 1.` : `Invert term by term: ${it("y")}(${t}) = ${n(c)} − ${n(c)}${ex(a)} = ${n(c)}(1 − ${ex(a)}), a rise to ${n(c)}.`],
                answer: { kind: "expr", expr: `${c}*(1 - exp(-${a}*t))`, vars: ["t"] }, answerText: c === 1 ? `1 − ${ex(a)}` : `${n(c)}(1 − ${ex(a)})`, answerInput: `${c}(1 - e^(-${a}t))`, vals: { c, nc: -c }, params: { kind: 0, K, a },
              };
            }
            const a = r.int(1, 5), b = r.int(a + 1, 9), K = (b - a) * r.int(1, 4), c = K / (b - a);
            return {
              prompt: `Find ${it("y")}(${t}) for ${M.eq(`${it("Y")}(${s}) = ${M.frac(n(K), `(${lin(a)})(${lin(b)})`)}`)}`,
              steps: [`Partial fractions: ${M.frac(it("A"), lin(a))} + ${M.frac(it("B"), lin(b))}.`,
                `Cover-up: ${it("A")} = ${M.frac(n(K), `−${n(a)} + ${n(b)}`)} = ${n(c)}; ${it("B")} = ${M.frac(n(K), `−${n(b)} + ${n(a)}`)} = ${n(-c)}.`,
                c === 1 ? `${it("y")}(${t}) = ${ex(a)} − ${ex(b)}.` : `${it("y")}(${t}) = ${n(c)}${ex(a)} − ${n(c)}${ex(b)} = ${n(c)}(${ex(a)} − ${ex(b)}).`],
              answer: { kind: "expr", expr: `${c}*(exp(-${a}*t) - exp(-${b}*t))`, vars: ["t"] }, answerText: c === 1 ? `${ex(a)} − ${ex(b)}` : `${n(c)}(${ex(a)} − ${ex(b)})`, answerInput: `${c}(e^(-${a}t) - e^(-${b}t))`,
              vals: { c, nc: -c, ba: b - a }, params: { kind: 1, K, a, b },
            };
          }
        }
        for (;;) {
          const a = r.int(1, 5), fin = r.int(-4, 6), b = a * fin, y0 = r.int(-5, 6);
          if (y0 === fin || b === 0) continue;
          const d = y0 - fin;
          return {
            prompt: `Use the Laplace transform to solve ${M.eq(`${it("y")}′ + ${a === 1 ? "" : n(a)}${it("y")} = ${n(b)}, &nbsp; ${it("y")}(0) = ${n(y0)}`)} for ${t} ≥ 0.`,
            steps: [
              `Transform, with ℒ{${it("y")}′} = ${s}${it("Y")} − ${it("y")}(0) and ℒ{${n(b)}} = ${M.frac(n(b), s)}: ${s}${it("Y")} − ${np(y0)} + ${kv(a, it("Y"))} = ${M.frac(n(b), s)}.`,
              `Solve for ${it("Y")}: (${lin(a)})${it("Y")} = ${y0 === 0 ? "" : `${n(y0)} ${b < 0 ? "−" : "+"} `}${M.frac(y0 === 0 ? n(b) : n(Math.abs(b)), s)}, so ${it("Y")} = ${M.frac(M.poly([y0, b], "s"), `${s}(${lin(a)})`)}.`,
              `Partial fractions by cover-up: at ${s} = 0, ${M.frac(n(b), n(a))} = ${n(fin)}; at ${s} = −${n(a)}, ${M.frac(`${n(y0)} × (−${n(a)}) + ${np(b)}`, `−${n(a)}`)} = ${n(d)}. So ${it("Y")} = ${M.frac(n(fin), s)} + ${M.frac(n(d), lin(a))}.`,
              `${it("y")}(${t}) = ${n(fin)} ${d < 0 ? "−" : "+"} ${Math.abs(d) === 1 ? "" : n(Math.abs(d))}${ex(a)}. Check: ${it("y")}(0) = ${n(fin)} + ${np(d)} = ${n(y0)}, and the final value theorem gives ${it("y")}(∞) = lim ${s}${it("Y")} = ${n(fin)}.`,
            ],
            answer: { kind: "expr", expr: `${fin} + (${d})*exp(-${a}*t)`, vars: ["t"] }, answerText: `${it("y")}(${t}) = ${n(fin)} ${d < 0 ? "−" : "+"} ${Math.abs(d) === 1 ? "" : n(Math.abs(d))}${ex(a)}`,
            answerInput: `${fin} + (${d})e^(-${a}t)`, vals: { fin, d }, params: { a, b, y0 },
          };
        }
      },
    },

    // ---- EE.24 Poles, zeros & stability ------------------------------------------------------------------------------------------------
    "EE.poles-zeros": {
      title: "Poles, zeros and stability",
      generate(r, level) {
        const s = it("s"), H = `${it("H")}(${s})`;
        if (level === 1) {
          for (;;) {
            const p1 = r.intExcept(-8, 3, 0), p2 = r.intExcept(-9, 2, 0), K = r.int(1, 10);
            if (p1 === p2) continue;
            const b = -(p1 + p2), c = p1 * p2, stable = p1 < 0 && p2 < 0, D = b * b - 4 * c, sD = Math.abs(p1 - p2);
            return {
              prompt: `Find the poles of ${M.eq(`${H} = ${M.frac(n(K), M.poly([1, b, c], "s"))}`)} Enter both, separated by a comma.`,
              steps: [`The poles are the roots of the denominator: ${M.poly([1, b, c], "s")} = 0.`,
                `Discriminant: ${M.sup(np(b), 2)} − 4 × ${np(c)} = ${n(D)}, whose square root is ${n(sD)}: ${s} = ${M.frac(`${n(-b)} ± ${n(sD)}`, "2")}, so ${s} = ${n(Math.max(p1, p2))} and ${s} = ${n(Math.min(p1, p2))}.`,
                stable ? `Both poles are negative (left half-plane), so every mode ${M.sup("e", `${it("p")}${it("t")}`)} decays: the system is stable.` : `A pole at ${s} = ${n(Math.max(p1, p2))} is in the right half-plane, so its mode ${M.sup("e", `${n(Math.max(p1, p2))}${it("t")}`)} grows: the system is unstable.`],
              answer: { kind: "numbers", values: [p1, p2] }, answerText: `${s} = ${n(Math.max(p1, p2))} and ${n(Math.min(p1, p2))} (${stable ? "stable" : "unstable"})`, answerInput: `${p1}, ${p2}`,
              vals: { b, c, D, sD, nb: -b, p1, p2 }, params: { K, b, c }, consts: [4],
            };
          }
        }
        if (level === 2) {
          const al = r.int(1, 6), be = r.int(1, 9), b = 2 * al, c = al * al + be * be, K = c;
          return {
            prompt: `A second-order system has ${M.eq(`${H} = ${M.frac(n(K), M.poly([1, b, c], "s"))}`)} Its poles are ${it("σ")} ± ${it("j")}${it("ω")}. Find ${it("σ")} and ${it("ω")} (with ${it("ω")} &gt; 0). Enter ${it("σ")}, ${it("ω")}.`,
            steps: [`Complete the square: ${M.poly([1, b, c], "s")} = ${M.sup(`(${s} + ${n(al)})`, 2)} + ${n(be * be)}, since ${M.sup(n(al), 2)} = ${n(al * al)} and ${n(c)} − ${n(al * al)} = ${n(be * be)}.`,
              `Setting it to zero: ${s} + ${n(al)} = ±${it("j")}${M.sqrt(n(be * be))}, so ${s} = −${n(al)} ± ${it("j")}${be === 1 ? "" : n(be)}.`,
              `Real part −${n(al)}: stable, the response decays like ${M.sup("e", `−${al === 1 ? "" : n(al)}${it("t")}`)}. Imaginary part ${n(be)}: it rings at ${q(be, "rad/s")}. DC gain ${it("H")}(0) = ${M.frac(n(K), n(c))} = 1.`],
            answer: { kind: "numbers", values: [-al, be], ordered: true }, answerText: `${it("σ")} = ${n(-al)}, ${it("ω")} = ${n(be)}`, answerInput: `${-al}, ${be}`,
            vals: { al, aa: al * al, bb: be * be, be, nal: -al }, params: { K, b, c },
          };
        }
        for (;;) {
          const b = r.int(-4, 6), c = r.intExcept(-6, 12, 0), z = r.int(1, 5);
          const cls = b > 0 && c > 0 ? 0 : b === 0 && c > 0 ? 1 : 2;
          if (cls === 0 && r.chance(0.4)) continue;
          const options = ["Stable: all poles in the left half-plane", "Marginally stable: poles on the imaginary axis (it oscillates forever)", "Unstable: a pole in the right half-plane"];
          const why = c < 0 ? `The product of the roots is ${it("c")} = ${n(c)} &lt; 0, so the two poles are real with opposite signs: one is positive.`
            : b === 0 ? `With no ${s} term the poles are ${s} = ±${it("j")}${M.sqrt(n(c))}: purely imaginary, on the axis.`
              : b < 0 ? `The sum of the roots is −${it("b")} = ${n(-b)} &gt; 0 while their product ${n(c)} &gt; 0, so both have positive real part.`
                : `The sum of the roots is −${it("b")} = ${n(-b)} &lt; 0 and their product is ${n(c)} &gt; 0, so both have negative real part.`;
          return {
            prompt: `Classify the stability of ${M.eq(`${H} = ${M.frac(`${s} + ${n(z)}`, M.poly([1, b, c], "s"))}`)}`,
            steps: [`Stability is set by the poles (roots of the denominator), not the zero at ${s} = −${n(z)}.`,
              `For ${M.sup(s, 2)} + ${it("b")}${s} + ${it("c")}, the roots satisfy ${sym("p", 1)} + ${sym("p", 2)} = −${it("b")} and ${sym("p", 1)}${sym("p", 2)} = ${it("c")}. Here ${it("b")} = ${n(b)} and ${it("c")} = ${n(c)}.`,
              why, `So: ${options[cls].toLowerCase()}. (A quadratic has both roots in the left half-plane exactly when ${it("b")} &gt; 0 and ${it("c")} &gt; 0.)`],
            answer: { kind: "choice", options, index: cls }, answerText: options[cls], vals: { b, c, nb: -b, cls }, params: { b, c, z },
          };
        }
      },
    },

    // ---- EE.25 Bode plots ------------------------------------------------------------------------------------------------------------------
    "EE.bode": {
      title: "Bode plots",
      generate(r, level) {
        const w = it("ω"), dB = (k) => 20 * Math.log10(k);
        const Hs = (K, ws) => `${it("H")}(${it("s")}) = ${M.frac(big(K), ws.map((x) => `(1 + ${it("s")}/${big(x)})`).join(""))}`;
        if (level === 1) {
          const K = r.pick([0.01, 0.1, 10, 100, 1000, 10000]), wp = r.pick([10, 100, 1000]), g = Math.round(dB(K));
          return {
            prompt: `What is the low-frequency gain, in dB, of ${M.eq(Hs(K, [wp]))}`,
            steps: [`Well below the corner (${w} ≪ ${big(wp)}&nbsp;rad/s) the factor 1 + ${it("j")}${w}/${big(wp)} ≈ 1, so |${it("H")}| ≈ ${big(K)}, the DC gain.`, `20 log<sub>10</sub> ${big(K)} = 20 × ${n(Math.round(Math.log10(K)))} = ${n(g)}&nbsp;dB.`],
            answer: { kind: "number", value: g }, answerText: `${n(g)}&nbsp;dB`, answerInput: String(g), vals: { g, lg: Math.round(Math.log10(K)) }, params: { K, wp }, consts: [20, 10],
          };
        }
        if (level === 2) {
          const K = r.pick([10, 100, 1000]), wp = r.pick([10, 100, 1000]), m = r.int(1, 3), wq = wp * Math.pow(10, m), g0 = Math.round(dB(K)), g = g0 - 20 * m;
          return {
            prompt: `Using the straight-line (asymptotic) Bode plot, what is the gain in dB of ${M.eq(Hs(K, [wp]))} at ${w} = ${big(wq)}&nbsp;rad/s?`,
            graph: graph({ view: [0, 6, Math.min(g, 0) - 10, g0 + 10], items: [W([0, g0], [Math.log10(wp), g0]), W([Math.log10(wp), g0], [6, g0 - 20 * (6 - Math.log10(wp))]), { t: "vline", x: Math.log10(wq), dash: true, role: "muted" }, T(3, g0 + 5, "horizontal: log10 ω")] }),
            steps: [`Low-frequency level: 20 log<sub>10</sub> ${big(K)} = ${n(g0)}&nbsp;dB, flat up to the corner at ${big(wp)}&nbsp;rad/s.`,
              `Above the corner a real pole falls at −20&nbsp;dB per decade. From ${big(wp)} to ${big(wq)} is ${n(m)} decade${m > 1 ? "s" : ""}.`,
              `${n(g0)} − 20 × ${n(m)} = ${n(g)}&nbsp;dB. (The true curve is 3&nbsp;dB below the asymptotes at the corner itself, and very close to them a decade away.)`],
            answer: { kind: "number", value: g }, answerText: `${n(g)}&nbsp;dB`, answerInput: String(g), vals: { g0, g, wq }, params: { K, wp, m }, consts: [20, 3, 10],
          };
        }
        for (;;) {
          const K = r.pick([10, 100]), w1 = r.pick([10, 100]), two = r.chance(0.6), w2 = two ? w1 * r.pick([10, 100]) : 0, g0 = dB(K);
          const ws = two ? [w1, w2] : [w1];
          const pts = [[0, g0], [Math.log10(w1), g0]];
          if (two) pts.push([Math.log10(w2), g0 - 20 * (Math.log10(w2) - Math.log10(w1))]);
          const last = pts[pts.length - 1], slope = two ? -40 : -20;
          pts.push([5, last[1] + slope * (5 - last[0])]);
          const opts = [Hs(K, ws), Hs(K === 10 ? 100 : 10, ws), Hs(K, two ? [w1 * 10, w2 * 10] : [w1 * 10]), Hs(K, two ? [w1] : [w1, w1 * 100])];
          if (new Set(opts).size < 4) continue;
          const order = r.shuffle([0, 1, 2, 3]), options = order.map((i) => opts[i]), index = order.indexOf(0);
          const items = [];
          for (let i = 0; i + 1 < pts.length; i++) items.push(W(pts[i], pts[i + 1]));
          return {
            prompt: `The straight-line Bode magnitude plot below has log<sub>10</sub> ${w} on the horizontal axis (so 1, 2, 3 mean 10, 100, 1000&nbsp;rad/s) and gain in dB vertically. Which transfer function does it show?`,
            graph: graph({ view: [0, 5, Math.min(...pts.map((p) => p[1])) - 10, g0 + 10], items }),
            steps: [`Low-frequency level ${n(g0)}&nbsp;dB = 20 log<sub>10</sub> ${it("K")}, so ${it("K")} = ${n(K)}.`,
              `The first break is at log<sub>10</sub> ${w} = ${n(Math.log10(w1))}, i.e. ${w} = ${big(w1)}&nbsp;rad/s, where the slope becomes −20&nbsp;dB/decade: a real pole there.`,
              two ? `A second break at ${w} = ${big(w2)}&nbsp;rad/s steepens it to −40&nbsp;dB/decade: a second pole.` : `The slope stays −20&nbsp;dB/decade: there is only one pole.`,
              `So ${opts[0]}.`],
            answer: { kind: "choice", options, index }, answerText: opts[0], vals: { g0, K, w1, w2, lw1: Math.log10(w1), pts, alt: [w1 * 10, w2 * 10, w1 * 100] }, params: { K, w1, w2, two: two ? 1 : 0, order }, consts: [20, 40, 10, 100, 1000, 3, 5],
          };
        }
      },
    },
    // ---- EE.26 Fourier series & the DFT -----------------------------------------------------------------------------------------------
    "EE.20": {
      title: "Fourier series and the DFT",
      generate(r, level) {
        const Xk = (k) => sym("X", k), j = it("j");
        if (level === 1) {
          for (;;) {
            const fs = r.pick([1000, 8000, 16000, 44100, 48000]), N = r.pick([256, 512, 1000, 1024, 2048, 4096]), df = fs / N;
            if (!Number.isInteger(r2(df * 1000, 6))) continue;
            if (r.chance(0.5)) {
              return {
                prompt: `${cap1(art(N))} ${big(N)}-point FFT is taken of a signal sampled at ${big(fs)}&nbsp;Hz. What is the frequency resolution (bin spacing), in hertz?`,
                steps: [`${big(N)} samples span ${it("N")}/${sym("f", "s")} seconds, and the bins are spaced by the reciprocal of that: Δ${it("f")} = ${M.frac(sym("f", "s"), it("N"))}.`, `Δ${it("f")} = ${M.frac(big(fs), big(N))} = ${q(df, "Hz")}. Record longer to resolve closer tones.`],
                answer: { kind: "number", value: df }, answerText: q(df, "Hz"), answerInput: String(df), vals: { df }, params: { kind: 0, fs, N },
              };
            }
            const k = r.int(1, Math.floor(N / 2) - 1), f = r2(k * df, 6);
            if (!Number.isInteger(r2(f * 100, 6))) continue;
            return {
              prompt: `A signal sampled at ${big(fs)}&nbsp;Hz is analyzed with ${art(N)} ${big(N)}-point DFT. A pure tone at ${big(f)}&nbsp;Hz falls exactly on a bin. Which bin index ${it("k")} is it?`,
              steps: [`Bin ${it("k")} sits at ${it("k")}Δ${it("f")}, with Δ${it("f")} = ${M.frac(big(fs), big(N))} = ${q(df, "Hz")}.`, `${it("k")} = ${M.frac(big(f), n(df))} = ${n(k)}.`],
              answer: { kind: "number", value: k }, answerText: n(k), answerInput: String(k), vals: { df, k, f }, params: { kind: 1, fs, N },
            };
          }
        }
        if (level === 2) {
          const x = [r.int(-3, 5), r.int(-3, 5), r.int(-3, 5), r.int(-3, 5)], [a, b, c, d] = x;
          const re = a - c, im = -(b - d);
          return {
            prompt: `Find the DFT coefficient ${Xk(1)} of the 4-point sequence ${it("x")} = [${x.map((v) => n(v)).join(", ")}]. Enter its real part and imaginary part.`,
            steps: [`${Xk("k")} = Σ ${sym("x", "n")}${M.sup("e", `−${j}2π${it("k")}${it("n")}/4`)}. For ${it("k")} = 1 the factors ${M.sup("e", `−${j}π${it("n")}/2`)} are 1, −${j}, −1, ${j} for ${it("n")} = 0, 1, 2, 3.`,
              `${Xk(1)} = ${np(a)} · 1 + ${np(b)} · (−${j}) + ${np(c)} · (−1) + ${np(d)} · ${j} = (${n(a)} − ${np(c)}) − ${j}(${n(b)} − ${np(d)}).`,
              `${Xk(1)} = ${n(re)} ${im < 0 ? "−" : "+"} ${j}${n(Math.abs(im))}. (For comparison ${Xk(0)} = ${n(a + b + c + d)}, the sum of the samples.)`],
            answer: { kind: "numbers", values: [re, im], ordered: true }, answerText: `${Xk(1)} = ${n(re)} ${im < 0 ? "−" : "+"} ${j}${n(Math.abs(im))}`, answerInput: `${re}, ${im}`,
            vals: { re, im, aim: Math.abs(im), X0: a + b + c + d }, params: { x }, consts: [4, 3],
          };
        }
        for (;;) {
          const A = r.pick([1, 2, 5, 10]), nh = r.pick([1, 2, 3, 5, 7]), f0 = r.pick([50, 100, 200, 1000]), amp = nh % 2 ? (4 * A) / (nh * Math.PI) : 0;
          if (amp && tie(amp, 3)) continue;
          const T = 4;
          return {
            prompt: `A square wave switches between +${q(A, "V")} and −${q(A, "V")} at ${q(f0, "Hz")} (shown, with its fundamental dashed). What is the amplitude of its harmonic at ${q(nh * f0, "Hz")}? Round to 3 decimal places.`,
            graph: graph({ view: [0, 8, -A * 1.6, A * 1.6], items: [{ t: "fn", e: `${A}*sin(2*pi*x/${T})/abs(sin(2*pi*x/${T}))`, role: "primary" }, { t: "fn", e: `${(4 * A) / Math.PI}*sin(2*pi*x/${T})`, role: "secondary" }] }),
            steps: [`The odd-symmetric square wave's Fourier series is ${M.frac(`4${it("A")}`, "π")}[sin ${it("ω")}${it("t")} + ⅓ sin 3${it("ω")}${it("t")} + ⅕ sin 5${it("ω")}${it("t")} + ⋯]: only odd harmonics, amplitude ${M.frac(`4${it("A")}`, `${it("n")}π`)}.`,
              `${n(nh * f0)}&nbsp;Hz is harmonic ${it("n")} = ${M.frac(n(nh * f0), n(f0))} = ${n(nh)}.`,
              nh % 2 ? `Amplitude: ${M.frac(`4 × ${n(A)}`, `${nh === 1 ? "" : `${n(nh)}`}π`)} ≈ ${q(amp, "V", 3)}.` : `${n(nh)} is even, and a square wave with half-wave symmetry has no even harmonics: the amplitude is 0.`],
            answer: { kind: "number", value: amp, dp: 3 }, answerText: amp ? q(amp, "V", 3) : "0&nbsp;V", answerInput: r2(amp, 3).toString(),
            vals: { amp, fh: nh * f0, nh }, params: { A, nh, f0 }, consts: [4, 3, 5],
          };
        }
      },
    },

    // ---- EE.27 Sampling, Nyquist & quantization -----------------------------------------------------------------------------------------
    "EE.18": {
      title: "Sampling, aliasing and ADC codes",
      generate(r, level) {
        const fs = sym("f", "s");
        if (level === 1) {
          const [what, fm] = r.pick([["Audio up to", 20000], ["A vibration sensor's signal contains frequencies up to", 500], ["An ECG signal has content up to", 150], ["A telephone voice channel extends to", 3400], ["An ultrasound echo reaches", 5000000]]), fmin = 2 * fm;
          return {
            prompt: `${what} ${big(fm)}&nbsp;Hz. What sampling rate must be exceeded to capture it without aliasing?`,
            steps: [`Nyquist criterion: ${fs} &gt; 2${sym("f", "max")}.`, `2 × ${big(fm)} = ${big(fmin)}&nbsp;Hz; in practice one samples somewhat faster and filters out everything above ${sym("f", "max")} first.`],
            answer: { kind: "number", value: fmin }, answerText: `${big(fmin)}&nbsp;Hz`, answerInput: String(fmin), vals: { fmin }, params: { fm },
          };
        }
        if (level === 2) {
          for (;;) {
            const s_ = r.pick([100, 200, 500, 1000, 8000, 10000]), f = r.int(1, 39) * (s_ / 20), k = Math.round(f / s_), fa = Math.abs(f - k * s_);
            if (f <= s_ / 2 || Math.abs(f / s_ - k) === 0.5) continue;
            return {
              prompt: `${cap1(art(f))} ${big(f)}&nbsp;Hz tone is sampled at ${big(s_)}&nbsp;Hz with no anti-aliasing filter. At what frequency does it appear in the sampled data?`,
              steps: [`The Nyquist frequency is ${fs}/2 = ${big(s_ / 2)}&nbsp;Hz, and the tone is above it, so it aliases: ${sym("f", "alias")} = |${it("f")} − ${it("k")}${fs}| with ${it("k")} the integer nearest ${it("f")}/${fs}.`,
                `${M.frac(big(f), big(s_))} = ${n(f / s_)}, so ${it("k")} = ${n(k)}.`, `${sym("f", "alias")} = |${big(f)} − ${n(k)} × ${big(s_)}| = ${big(fa)}&nbsp;Hz.`],
              answer: { kind: "number", value: fa }, answerText: `${big(fa)}&nbsp;Hz`, answerInput: String(fa), vals: { ny: s_ / 2, ratio: f / s_, k, fa, ks: k * s_ }, params: { f, fs: s_ },
            };
          }
        }
        for (;;) {
          const N = r.pick([8, 10, 12]), Vref = r.pick([3.3, 5, 2.5, 4.096]), Vin = r2(r.int(5, 95) * Vref / 100 + r.int(0, 9) / 1000, 3), levels = Math.pow(2, N);
          const ratio = (Vin / Vref) * levels, D = Math.floor(ratio), lsb = (Vref / levels) * 1000;
          if (Vin >= Vref || Math.abs(ratio - Math.round(ratio)) < 0.02 || tie(lsb, 4) || tie(ratio, 4)) continue;
          const sq = 6.02 * N + 1.76;
          return {
            prompt: `${cap1(art(N))} ${n(N)}-bit ADC with reference ${q(Vref, "V")} (codes 0 to ${big(levels - 1)}) reads an input of ${q(Vin, "V")}. What output code does it produce? (It rounds down.)`,
            steps: [`Resolution: Δ = ${M.frac(sym("V", "ref"), M.sup("2", it("N")))} = ${M.frac(n(Vref), big(levels))}&nbsp;V ≈ ${q(lsb, "mV", 4)}.`,
              `Code: ${it("D")} = ⌊${M.frac(sym("V", "in"), sym("V", "ref"))} × ${M.sup("2", it("N"))}⌋ = ⌊${M.frac(n(Vin), n(Vref))} × ${big(levels)}⌋ = ⌊${n(ratio, 4)}…⌋ = ${big(D)}.`,
              `The rounding error is uniform over one step, giving an ideal SQNR of about 6.02${it("N")} + 1.76 = ${n(sq, 2)}&nbsp;dB for a full-scale sine.`],
            answer: { kind: "number", value: D }, answerText: big(D), answerInput: String(D), vals: { levels, top: levels - 1, lsb, ratio, D, sq }, params: { N, Vref, Vin }, consts: [6.02, 1.76],
          };
        }
      },
    },

    // ---- EE.28 Z-transform & digital filters --------------------------------------------------------------------------------------------
    "EE.ztransform": {
      title: "Z-transforms and difference equations",
      generate(r, level) {
        const z = it("z"), zi = (k) => (k === 0 ? "" : M.sup(z, `−${k}`));
        if (level === 1) {
          for (;;) {
            const x = [r.int(-3, 5), r.int(-4, 5), r.int(-4, 5)];
            if (x[0] === 0 || x[2] === 0 || x[1] === 0) continue;
            let txt = "";
            x.forEach((c, k) => { const mag = Math.abs(c), body = k === 0 ? n(mag) : `${mag === 1 ? "" : n(mag)}${zi(k)}`; txt += txt === "" ? (c < 0 ? "−" : "") + body : ` ${c < 0 ? "−" : "+"} ${body}`; });
            const expr = x.map((c, k) => `(${c})*z^(-${k})`).join(" + ");
            return {
              prompt: `Find the Z-transform of the finite sequence ${it("x")}[${it("n")}] = [${x.map((v) => n(v)).join(", ")}] (for ${it("n")} = 0, 1, 2; zero elsewhere).`,
              steps: [`${it("X")}(${z}) = Σ ${it("x")}[${it("n")}]${M.sup(z, `−${it("n")}`)}: each sample becomes the coefficient of a delay ${M.sup(z, `−${it("n")}`)}.`, `${it("X")}(${z}) = ${txt}.`],
              answer: { kind: "expr", expr, vars: ["z"] }, answerText: txt, answerInput: x.map((c, k) => `${c}z^(-${k})`).join(" + ").replace("z^(-0)", ""), vals: {}, params: { x },
            };
          }
        }
        const A = r.pick([new Frac(1, 2), new Frac(-1, 2), new Frac(1, 4), new Frac(3, 4), new Frac(-1, 3), new Frac(2, 3)]), b0 = r.int(1, 4), b1 = r.int(-3, 3);
        const de = `${it("y")}[${it("n")}] = ${M.f(A)}${it("y")}[${it("n")} − 1] + ${b0 === 1 ? "" : n(b0)}${it("x")}[${it("n")}]${b1 === 0 ? "" : ` ${b1 < 0 ? "−" : "+"} ${Math.abs(b1) === 1 ? "" : n(Math.abs(b1))}${it("x")}[${it("n")} − 1]`}`;
        if (level === 2) {
          const h = [new Frac(b0)];
          h.push(A.mul(h[0]).add(b1));
          h.push(A.mul(h[1]));
          h.push(A.mul(h[2]));
          return {
            prompt: `A digital filter obeys ${M.eq(de)} Find its first four impulse-response samples ${it("h")}[0], ${it("h")}[1], ${it("h")}[2], ${it("h")}[3] (input ${it("x")} = δ, starting at rest). Fractions are fine.`,
            steps: [`Feed in ${it("x")}[0] = 1 and ${it("x")}[${it("n")}] = 0 otherwise, with ${it("y")}[−1] = 0, and iterate.`,
              `${it("h")}[0] = ${M.f(A)} × 0 + ${n(b0)} × 1 = ${M.f(h[0])}.`,
              `${it("h")}[1] = ${M.f(A)} × ${M.f(h[0], { paren: true })} + ${np(b1)} × 1 = ${M.f(h[1])}.`,
              `${it("h")}[2] = ${M.f(A)} × ${M.f(h[1], { paren: true })} = ${M.f(h[2])}; ${it("h")}[3] = ${M.f(A)} × ${M.f(h[2], { paren: true })} = ${M.f(h[3])}. From here each sample is ${M.f(A)} times the last: the pole at ${z} = ${M.f(A)} sets the decay.`],
            answer: { kind: "numbers", values: h.map((v) => v.value), ordered: true }, answerText: h.map((v) => M.f(v)).join(", "), answerInput: h.map(typed).join(", "),
            vals: { h: h.map(fracVal) }, params: { A: fracVal(A), b0, b1 }, consts: [3],
          };
        }
        const dc = new Frac(b0 + b1).div(new Frac(1).sub(A)), ny = new Frac(b0 - b1).div(new Frac(1).add(A));
        const numZ = b1 === 0 ? n(b0) : `${n(b0)} ${b1 < 0 ? "−" : "+"} ${Math.abs(b1) === 1 ? "" : n(Math.abs(b1))}${M.sup(z, "−1")}`;
        return {
          prompt: `For the filter ${M.eq(de)} find its transfer function, then its gain at DC (${it("Ω")} = 0) and at the Nyquist frequency (${it("Ω")} = π). Enter both gains.`,
          steps: [`Transform with the delay rule ${it("x")}[${it("n")} − 1] ↔ ${M.sup(z, "−1")}${it("X")}: (1 ${A.n < 0 ? "+" : "−"} ${M.f(A.abs())}${M.sup(z, "−1")})${it("Y")} = (${numZ})${it("X")}, so ${it("H")}(${z}) = ${M.frac(numZ, `1 ${A.n < 0 ? "+" : "−"} ${M.f(A.abs())}${M.sup(z, "−1")}`)}. Its pole is ${z} = ${M.f(A)}, inside the unit circle: stable.`,
            `DC is ${z} = ${M.sup("e", `${it("j")}0`)} = 1: ${it("H")}(1) = ${M.frac(`${n(b0)} + ${np(b1)}`, `1 − ${M.f(A, { paren: true })}`)} = ${M.f(dc)}.`,
            `Nyquist is ${z} = ${M.sup("e", `${it("j")}π`)} = −1, where ${M.sup(z, "−1")} = −1: ${it("H")}(−1) = ${M.frac(`${n(b0)} − ${np(b1)}`, `1 + ${M.f(A, { paren: true })}`)} = ${M.f(ny)}.`],
          answer: { kind: "numbers", values: [dc.value, ny.value], ordered: true }, answerText: `DC gain ${M.f(dc)}, Nyquist gain ${M.f(ny)}`, answerInput: `${typed(dc)}, ${typed(ny)}`,
          vals: { dc: fracVal(dc), ny: fracVal(ny) }, params: { A: fracVal(A), b0, b1 },
        };
      },
    },

    // ---- EE.29 Decibels, SNR & channel capacity ------------------------------------------------------------------------------------------
    "EE.19": {
      title: "Decibels, SNR and channel capacity",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.5)) {
            for (;;) {
              const ratio = r.pick([2, 4, 10, 100, 1000, 0.5, 0.1, 0.01, 1000000]), d = 10 * Math.log10(ratio);
              if (tie(d, 2)) continue;
              return {
                prompt: `An amplifier's output power is ${big(ratio)} times its input power. What is its gain in decibels? Round to 2 decimal places.`,
                steps: [`Power ratio in dB: 10 log<sub>10</sub>${M.frac(sym("P", 2), sym("P", 1))}.`, `10 log<sub>10</sub> ${big(ratio)} ${approx(d, 2)} ${n(d, 2)}&nbsp;dB.${ratio === 2 ? " (Doubling power is about +3 dB.)" : ""}`],
                answer: { kind: "number", value: d, dp: 2 }, answerText: `${n(d, 2)}&nbsp;dB`, answerInput: r2(d, 2).toString(), vals: { d }, params: { kind: 0, ratio }, consts: [10, 3],
              };
            }
          }
          const g = r.pick([-40, -20, 20, 40, 60, 80]), vr = Math.pow(10, g / 20);
          return {
            prompt: `A voltage gain is ${n(g)}&nbsp;dB. By what factor does it multiply the voltage?`,
            steps: [`Voltage decibels use 20 log<sub>10</sub> (because power goes as voltage squared), so the factor is ${M.sup("10", `dB/20`)}.`, `${M.sup("10", `${n(g)}/20`)} = ${M.sup("10", n(g / 20))} = ${n(vr)}.`],
            answer: { kind: "number", value: vr }, answerText: n(vr), answerInput: String(vr), vals: { e: g / 20, vr }, params: { kind: 1, g }, consts: [20, 10],
          };
        }
        if (level === 2) {
          for (;;) {
            const pin = r.pick([-60, -50, -40, -30, -20]), g1 = r.pick([10, 15, 20, 25, 30]), loss = r.pick([3, 5, 6, 10]), g2 = r.pick([10, 15, 20, 25]), out = pin + g1 - loss + g2;
            if (out % 10 !== 0) continue;
            const mw = Math.pow(10, out / 10);
            return {
              prompt: `${cap1(art(pin))} ${n(pin)}&nbsp;dBm signal passes through an amplifier of gain ${q(g1, "dB")}, a cable that loses ${q(loss, "dB")}, and a second amplifier of ${q(g2, "dB")}. What is the output level in dBm, and in milliwatts? Enter dBm, mW.`,
              steps: [`Gains in a chain multiply, so in dB they add: ${n(pin)} + ${n(g1)} − ${n(loss)} + ${n(g2)} = ${n(out)}&nbsp;dBm.`,
                `dBm is relative to 1&nbsp;mW: ${it("P")} = ${M.sup("10", `${n(out)}/10`)}&nbsp;mW = ${n(mw)}&nbsp;mW.`],
              answer: { kind: "numbers", values: [out, mw], ordered: true }, answerText: `${n(out)}&nbsp;dBm = ${n(mw)}&nbsp;mW`, answerInput: `${out}, ${mw}`,
              vals: { out, mw }, params: { pin, g1, loss, g2 }, consts: [10],
            };
          }
        }
        for (;;) {
          const B = r.pick([1, 2, 5, 10, 20]);
          if (r.chance(0.5)) {
            const k = r.pick([2, 3, 4, 5, 6, 8, 10]), snr = Math.pow(2, k) - 1, C_ = B * k;
            return {
              prompt: `A channel of bandwidth ${q(B, "MHz")} has a signal-to-noise power ratio of ${big(snr)} (linear). What is its Shannon capacity, in Mbit/s?`,
              steps: [`Shannon–Hartley: ${it("C")} = ${it("B")} log<sub>2</sub>(1 + SNR), with SNR as a plain ratio.`, `1 + ${big(snr)} = ${big(snr + 1)} = ${M.sup("2", n(k))}, so log<sub>2</sub> ${big(snr + 1)} = ${n(k)}.`, `${it("C")} = ${n(B)} × ${n(k)} = ${q(C_, "Mbit/s")}.`],
              answer: { kind: "number", value: C_ }, answerText: q(C_, "Mbit/s"), answerInput: String(C_), vals: { snr1: snr + 1, k, C: C_ }, params: { kind: 0, B, snr },
            };
          }
          const sdb = r.pick([10, 20, 30, 40]), lin = Math.pow(10, sdb / 10), l2 = Math.log2(1 + lin), C_ = B * l2;
          if (tie(C_, 2)) continue;
          return {
            prompt: `${cap1(art(B))} ${q(B, "MHz")} channel has an SNR of ${q(sdb, "dB")}. What is its Shannon capacity, in Mbit/s? Round to 2 decimal places.`,
            steps: [`Convert the SNR from dB to a ratio first: ${M.sup("10", `${n(sdb)}/10`)} = ${big(lin)}.`, `log<sub>2</sub>(1 + ${big(lin)}) = ${M.frac(`ln ${big(1 + lin)}`, "ln 2")} ≈ ${n(l2, 4)}.`, `${it("C")} = ${n(B)} × ${n(l2, 4)} ≈ ${q(C_, "Mbit/s", 2)}.`],
            answer: { kind: "number", value: C_, dp: 2 }, answerText: q(C_, "Mbit/s", 2), answerInput: r2(C_, 2).toString(), vals: { lin, lin1: 1 + lin, l2, C: C_ }, params: { kind: 1, B, sdb }, consts: [10],
          };
        }
      },
    },

    // ---- EE.30 Feedback & stability ----------------------------------------------------------------------------------------------------
    "EE.feedback": {
      title: "Feedback, steady-state error and closed-loop poles",
      generate(r, level) {
        const s = it("s"), G = it("G"), Hh = it("H"), T = it("T");
        if (level === 1) {
          for (;;) {
            const g = r.pick([10, 50, 100, 200, 1000, 10000]), m = r.pick([2, 5, 10, 20, 100]), h = new Frac(1, m), Tf = new Frac(g).div(new Frac(1).add(h.mul(g)));
            if (tie(Tf.value, 2)) continue;
            return {
              prompt: `An amplifier with forward gain ${G} = ${big(g)} has negative feedback through ${Hh} = ${M.f(h)}. What is the closed-loop gain? Round to 2 decimal places.`,
              steps: [`${T} = ${M.frac(G, `1 + ${G}${Hh}`)}. The loop gain is ${G}${Hh} = ${big(g)} × ${M.f(h)} = ${M.f(h.mul(g))}.`,
                `${T} = ${M.frac(big(g), `1 + ${M.f(h.mul(g))}`)} ≈ ${n(Tf.value, 2)}. When the loop gain is large, ${T} ≈ ${M.frac("1", Hh)} = ${n(m)}: set by the feedback path alone.`],
              answer: { kind: "number", value: Tf.value, dp: 2 }, answerText: n(Tf.value, 2), answerInput: r2(Tf.value, 2).toString(), vals: { gh: fracVal(h.mul(g)), T: Tf.value, m }, params: { g, m },
            };
          }
        }
        if (level === 2) {
          const K = r.int(1, 20), a = r.int(1, 10), Kp = new Frac(K, a), ess = new Frac(a, a + K);
          return {
            prompt: `A unity-feedback loop has ${M.eq(`${G}(${s}) = ${M.frac(n(K), `${s} + ${n(a)}`)}`)} What is the steady-state error for a unit step reference? Give it as a fraction.`,
            steps: [`Step error: ${sym("e", "ss")} = ${M.frac("1", `1 + ${sym("K", "p")}`)} with ${sym("K", "p")} = lim<sub>${s}→0</sub> ${G}(${s}) (final value theorem).`,
              `${sym("K", "p")} = ${a === 1 ? n(K) : `${M.frac(n(K), n(a))}${P.gcd(K, a) > 1 ? ` = ${M.f(Kp)}` : ""}`}.`,
              `${sym("e", "ss")} = ${M.frac("1", `1 + ${M.f(Kp)}`)} = ${M.f(ess)}. There is no integrator in the loop, so some error always remains; raising ${it("K")} shrinks it.`],
            answer: { kind: "number", value: ess.value }, answerText: M.f(ess), answerInput: typed(ess), vals: { Kp: fracVal(Kp), ess: fracVal(ess), aK: a + K }, params: { K, a },
          };
        }
        const a = r.pick([2, 4, 6, 8, 10, 20]), [zt, zl] = r.pick([[new Frac(1), "critically damped (ζ = 1)"], [new Frac(1, 2), "damping ratio ζ = 0.5 (about 16% overshoot)"], [new Frac(1, 4), "damping ratio ζ = 0.25"]]);
        const wn = new Frac(a).div(zt.mul(2)), K = wn.mul(wn);
        return {
          prompt: `A motor position loop has ${M.eq(`${G}(${s}) = ${M.frac(it("K"), `${s}(${s} + ${n(a)})`)}`)} with unity feedback. What gain ${it("K")} makes the closed loop ${zl}?`,
          steps: [`Closed loop: ${T} = ${M.frac(G, `1 + ${G}`)} = ${M.frac(it("K"), `${M.sup(s, 2)} + ${n(a)}${s} + ${it("K")}`)}. The characteristic equation is ${M.sup(s, 2)} + ${n(a)}${s} + ${it("K")} = 0.`,
            `Match it to ${M.sup(s, 2)} + 2${it("ζ")}${sym("ω", "n")}${s} + ${M.sup(sym("ω", "n"), 2)}: ${sym("ω", "n")} = ${M.sqrt(it("K"))} and 2${it("ζ")}${sym("ω", "n")} = ${n(a)}.`,
            `With ${it("ζ")} = ${M.f(zt)}: ${sym("ω", "n")} = ${M.frac(n(a), `2 × ${M.f(zt)}`)} = ${M.f(wn)}&nbsp;rad/s, so ${it("K")} = ${M.sup(sym("ω", "n"), 2)} = ${M.f(K)}.`],
          answer: { kind: "number", value: K.value }, answerText: `${it("K")} = ${M.f(K)}`, answerInput: typed(K), vals: { wn: fracVal(wn), K: fracVal(K), zt: fracVal(zt) }, params: { a, zt: fracVal(zt) }, consts: [0.5, 0.25, 16],
        };
      },
    },

    // ---- EE.31 PID control ---------------------------------------------------------------------------------------------------------------
    "EE.pid": {
      title: "PID control",
      generate(r, level) {
        const Kp = sym("K", "p"), Ki = sym("K", "i"), Kd = sym("K", "d");
        if (level === 1) {
          const kp = r.pick([0.5, 1, 2, 4, 5]), ki = r.pick([0.1, 0.2, 0.5, 1]), kd = r.pick([0.1, 0.5, 1, 2]), e = r.int(-5, 10), ie = r.int(-10, 30), de = r.int(-6, 6);
          const p = r2(kp * e, 9), i_ = r2(ki * ie, 9), d = r2(kd * de, 9), u = r2(p + i_ + d, 9);
          return {
            prompt: `A PID controller has ${Kp} = ${n(kp)}, ${Ki} = ${n(ki)}&nbsp;s<sup>−1</sup>, ${Kd} = ${n(kd)}&nbsp;s. At one instant the error is ${it("e")} = ${n(e)}, its integral so far is ${n(ie)}&nbsp;s, and it is changing at ${n(de)} per second. What is the controller output ${it("u")}?`,
            steps: [`${it("u")} = ${Kp}${it("e")} + ${Ki}∫${it("e")} + ${Kd}${M.frac(it("de"), it("dt"))}: present, past and predicted future.`,
              `${n(kp)} × ${np(e)} = ${n(p)}; ${n(ki)} × ${np(ie)} = ${n(i_)}; ${n(kd)} × ${np(de)} = ${n(d)}.`, `${it("u")} = ${n(p)} + ${np(i_)} + ${np(d)} = ${n(u)}.`],
            answer: { kind: "number", value: u }, answerText: n(u), answerInput: String(u), vals: { p, i: i_, d, u }, params: { kp, ki, kd, e, ie, de },
          };
        }
        if (level === 2) {
          const ku = r.pick([2, 4, 5, 8, 10, 20]), tu = r.pick([0.4, 0.8, 1, 2, 4, 8]), kp = r2(0.6 * ku, 9), ti = tu / 2, td = tu / 8, ki = r2(kp / ti, 9), kd = r2(kp * td, 9);
          return {
            prompt: `Under proportional-only control a loop oscillates steadily at gain ${sym("K", "u")} = ${n(ku)} with period ${sym("T", "u")} = ${q(tu, "s")}. Use Ziegler–Nichols PID tuning to find ${Kp}, ${Ki} and ${Kd}. Enter all three.`,
            steps: [`Z–N rules: ${Kp} = 0.6${sym("K", "u")}, ${sym("T", "i")} = ${M.frac(sym("T", "u"), "2")}, ${sym("T", "d")} = ${M.frac(sym("T", "u"), "8")}.`,
              `${Kp} = 0.6 × ${n(ku)} = ${n(kp)}; ${sym("T", "i")} = ${q(ti, "s")}; ${sym("T", "d")} = ${q(td, "s")}.`,
              `Convert to parallel gains: ${Ki} = ${M.frac(Kp, sym("T", "i"))} = ${M.frac(n(kp), n(ti))} = ${n(ki)}&nbsp;s<sup>−1</sup> and ${Kd} = ${Kp}${sym("T", "d")} = ${n(kp)} × ${n(td)} = ${n(kd)}&nbsp;s.`],
            answer: { kind: "numbers", values: [kp, ki, kd], ordered: true }, answerText: `${Kp} = ${n(kp)}, ${Ki} = ${n(ki)}, ${Kd} = ${n(kd)}`, answerInput: `${kp}, ${ki}, ${kd}`,
            vals: { kp, ti, td, ki, kd }, params: { ku, tu }, consts: [0.6, 8],
          };
        }
        const kp = r.pick([1, 2, 3, 4]), ki = r.pick([0.5, 1, 2, 5]), kd = r.pick([0.01, 0.02, 0.05, 0.1]), ts = r.pick([0.1, 0.2, 0.5]);
        const e = [r.int(2, 9), r.int(1, 8), r.int(-2, 6)], sum = e[0] + e[1] + e[2], p = kp * e[2], i_ = r2(ki * ts * sum, 9), d = r2((kd * (e[2] - e[1])) / ts, 9), u = r2(p + i_ + d, 9);
        return {
          prompt: `A digital PID runs every ${sym("T", "s")} = ${q(ts, "s")} with ${Kp} = ${n(kp)}, ${Ki} = ${n(ki)}&nbsp;s<sup>−1</sup>, ${Kd} = ${n(kd)}&nbsp;s. The errors at samples 0, 1, 2 are ${n(e[0])}, ${n(e[1])}, ${n(e[2])}. What output ${sym("u", "2")} does it send at sample 2?`,
          steps: [`${sym("u", "k")} = ${Kp}${sym("e", "k")} + ${Ki}${sym("T", "s")}Σ${sym("e", "j")} + ${Kd}${M.frac(`${sym("e", "k")} − ${sym("e", "k−1")}`, sym("T", "s"))}: the integral becomes a running sum, the derivative a difference.`,
            `Proportional: ${n(kp)} × ${np(e[2])} = ${n(p)}. Integral: ${n(ki)} × ${n(ts)} × (${n(e[0])} + ${n(e[1])} + ${np(e[2])}) = ${n(ki)} × ${n(ts)} × ${n(sum)} = ${n(i_)}.`,
            `Derivative: ${n(kd)} × ${M.frac(`${n(e[2])} − ${np(e[1])}`, n(ts))} = ${n(kd)} × ${np(r2((e[2] - e[1]) / ts, 9))} = ${n(d)}.`, `${sym("u", "2")} = ${n(p)} + ${np(i_)} + ${np(d)} = ${n(u)}.`],
          answer: { kind: "number", value: u }, answerText: n(u), answerInput: String(u), vals: { sum, p, i: i_, d, slope: r2((e[2] - e[1]) / ts, 9), u }, params: { kp, ki, kd, ts, e },
        };
      },
    },
    // ---- EE.36 Digital logic, binary & Boolean algebra --------------------------------------------------------------------------------
    "EE.17": {
      title: "Binary numbers and Boolean algebra",
      generate(r, level) {
        if (level === 1) {
          const v = r.int(1, 255), b = toBin(v, 8), terms = [];
          for (let i = 7; i >= 0; i--) if ((v >> i) & 1) terms.push(1 << i);
          return {
            prompt: `Convert the 8-bit binary number ${bits(b)}<sub>2</sub> to decimal.`,
            steps: [`Each bit weighs a power of two; from the left: 2<sup>7</sup> = 128, 64, 32, 16, 8, 4, 2, 1.`,
              `Add the weights of the 1 bits: ${terms.map((t) => n(t)).join(" + ")} = ${n(v)}.`],
            answer: { kind: "number", value: v }, answerText: n(v), answerInput: String(v), vals: { b, terms, v }, params: { b }, consts: [128, 64, 32, 16, 8, 4, 7],
          };
        }
        if (level === 2) {
          const tree = r.pick(BOOL3), rows = [], ones = [];
          for (let m = 0; m < 8; m++) { const env = { A: (m >> 2) & 1, B: (m >> 1) & 1, C: m & 1 }, y = bEval(tree, env); rows.push([env.A, env.B, env.C, y].map(String)); if (y) ones.push(m); }
          return {
            prompt: `How many of the 8 input combinations make ${M.eq(`${it("F")} = ${bHtml(tree)}`)} equal to 1?`,
            steps: [`List the truth table, row by row (${it("A")}${it("B")}${it("C")} counting from 000 to 111 in binary):${M.table([it("A"), it("B"), it("C"), it("F")], rows.map((rw) => rw.map((c) => bits(c))))}`,
              `${it("F")} = 1 in ${n(ones.length)} rows: minterms Σ${it("m")}(${ones.map((m) => n(m)).join(", ")}). AND (·) is 1 only when both inputs are; OR (+) when either is; a bar inverts.`],
            answer: { kind: "number", value: ones.length }, answerText: n(ones.length), answerInput: String(ones.length), vals: { count: ones.length, ones }, params: { tree }, consts: [8, 111, 0],
          };
        }
        const [tree, good, bads, why] = r.pick(SIMPLIFY);
        const opts = [good, ...bads], order = r.shuffle([0, 1, 2, 3]), options = order.map((i) => bHtml(opts[i]));
        return {
          prompt: `Which expression is equivalent to ${M.eq(bHtml(tree))}`,
          steps: [why, `So ${bHtml(tree)} = ${bHtml(good)}. (Check any option by its truth table: only this one matches in all rows.)`],
          answer: { kind: "choice", options, index: order.indexOf(0) }, answerText: bHtml(good), vals: {}, params: { tree, opts: order.map((i) => opts[i]) },
        };
      },
    },

    // ---- EE.37 Number systems & two's complement ------------------------------------------------------------------------------------------
    "EE.number-systems": {
      title: "Hexadecimal and two's complement",
      generate(r, level) {
        const acc = (b) => [b, b.replace(/(\d{4})(?=\d)/g, "$1 ")];
        if (level === 1) {
          const v = r.int(16, 255), hx = v.toString(16).toUpperCase(), d1 = v >> 4, d0 = v & 15;
          if (r.chance(0.5)) {
            return {
              prompt: `Convert ${bits(hx)}<sub>16</sub> to decimal.`,
              steps: [`Hex digits run 0–9 then A–F (10–15). Here the digits are ${bits(hx[0])} = ${n(d1)} and ${bits(hx[1])} = ${n(d0)}.`, `${n(d1)} × 16 + ${n(d0)} = ${n(d1 * 16)} + ${n(d0)} = ${n(v)}.`],
              answer: { kind: "number", value: v }, answerText: n(v), answerInput: String(v), vals: { d1, d0, d16: d1 * 16, v }, params: { hx }, consts: [16, 10, 15, 9],
            };
          }
          const b = toBin(v, 8), hi = b.slice(0, 4), lo = b.slice(4);
          return {
            prompt: `Write ${bits(hx)}<sub>16</sub> as an 8-bit binary number.`,
            steps: [`Each hex digit is exactly 4 bits. ${bits(hx[0])} = ${n(d1)} = ${bits(hi)} and ${bits(hx[1])} = ${n(d0)} = ${bits(lo)}.`, `Put the groups side by side: ${bits(b)}<sub>2</sub> (= ${n(v)} in decimal).`],
            answer: { kind: "text", accept: acc(b) }, answerText: bits(b), answerInput: b, vals: { d1, d0, b, v }, params: { hx }, consts: [16, 4, 8],
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const v = r.int(-128, -1), u = v + 256, b = toBin(u, 8), low = u - 128;
            return {
              prompt: `The 8-bit pattern ${bits(b)} holds a two's-complement signed integer. What is its value?`,
              steps: [`In two's complement the top bit weighs −128 instead of +128. The top bit is 1, so the number is negative.`,
                `The other seven bits are worth ${n(low)}, so the value is −128 + ${n(low)} = ${n(v)}.`,
                `Check by negating: invert and add 1 to get ${bits(toBin(-v, 8))} = ${n(-v)}.`],
              answer: { kind: "number", value: v }, answerText: n(v), answerInput: String(v), vals: { low, v, nv: -v, nb: toBin(-v, 8) }, params: { b }, consts: [128, 8],
            };
          }
          const x = r.int(1, 127), pb = toBin(x, 8), inv = pb.split("").map((c) => (c === "1" ? "0" : "1")).join(""), nb = toBin(256 - x, 8);
          return {
            prompt: `Write −${n(x)} as an 8-bit two's-complement pattern.`,
            steps: [`Start from +${n(x)} = ${bits(pb)}.`, `Invert every bit: ${bits(inv)}.`, `Add 1: ${bits(nb)}. Check: −128 + ${n(256 - x - 128)} = ${n(-x)}.`],
            answer: { kind: "text", accept: acc(nb) }, answerText: bits(nb), answerInput: nb, vals: { pb, inv, nb, low: 256 - x - 128, x }, params: { x }, consts: [128, 8],
          };
        }
        for (;;) {
          const a = r.int(-128, 127), b = r.int(-128, 127), want = r.chance(0.5), sum = a + b, over = sum > 127 || sum < -128;
          if (over !== want || a === 0 || b === 0) continue;
          const wrapped = ((sum + 384) % 256) - 128, ab = toBin((a + 256) % 256, 8), bb = toBin((b + 256) % 256, 8), sb = toBin((sum + 512) % 256, 8);
          return {
            prompt: `An 8-bit processor adds two signed (two's-complement) bytes, ${n(a)} and ${n(b)}. What signed value does the 8-bit result hold?`,
            steps: [`In binary: ${n(a)} = ${bits(ab)} and ${n(b)} = ${bits(bb)}.`,
              `Add them as unsigned bytes and keep 8 bits (drop any carry out): ${bits(sb)}.`,
              over ? `The true sum ${n(sum)} lies outside −128 to 127: two ${a > 0 ? "positive" : "negative"} operands gave a ${wrapped < 0 ? "negative" : "positive"} result, which is signed overflow. The byte reads as ${n(wrapped)} (${n(sum)} ${sum > 0 ? "−" : "+"} 256).`
                : `The true sum ${n(sum)} fits in −128 to 127, so there is no overflow (${a * b < 0 ? "operands of opposite sign can never overflow" : "the sign is consistent"}); the byte reads as ${n(wrapped)}.`],
            answer: { kind: "number", value: wrapped }, answerText: `${n(wrapped)}${over ? " (overflow)" : ""}`, answerInput: String(wrapped),
            vals: { sum, wrapped, ab, bb, sb }, params: { a, b }, consts: [128, 127, 256, 8],
          };
        }
      },
    },

    // ---- EE.38 Karnaugh maps -----------------------------------------------------------------------------------------------------------------
    "EE.kmap": {
      title: "Karnaugh-map minimization",
      generate(r, level) {
        const nv = level === 3 ? 4 : 3, names = nv === 3 ? ["A", "B", "C"] : ["A", "B", "C", "D"], N = 1 << nv;
        for (;;) {
          const cnt = level === 1 ? r.int(2, 4) : level === 2 ? r.int(4, 6) : r.int(5, 10);
          const mins = r.sample([...Array(N).keys()], cnt).sort((x, y) => x - y);
          const sol = minimize(mins, nv);
          if (!sol.unique || sol.cover.length < (level === 1 ? 1 : 2) || sol.cover.length > 4) continue;
          if (level === 2 && !sol.cover.some((c) => wraps(c, nv))) continue;
          const good = sol.cover, cands = distractors(good, nv, r).filter((o) => !sameFn(o, mins, nv));
          const uniq = [];
          for (const o of cands) if (!uniq.some((u) => sopHtml(u, names) === sopHtml(o, names)) && sopHtml(o, names) !== sopHtml(good, names)) uniq.push(o);
          if (uniq.length < 3) continue;
          const opts = [good, ...uniq.slice(0, 3)], order = r.shuffle([0, 1, 2, 3]), options = order.map((i) => sopHtml(opts[i], names));
          const gray = ["00", "01", "11", "10"], rowsV = nv === 3 ? ["0", "1"] : gray, rowName = nv === 3 ? it("A") : `${it("A")}${it("B")}`, colName = nv === 3 ? `${it("B")}${it("C")}` : `${it("C")}${it("D")}`;
          const cell = (rv, cv) => parseInt(rv + cv, 2);
          const table = M.table([`${rowName} \\ ${colName}`, ...gray.map((g) => bits(g))], rowsV.map((rv) => [bits(rv), ...gray.map((cv) => bits(mins.includes(cell(rv, cv)) ? "1" : "0"))]));
          const groupTxt = good.map((t) => `${n(cubeSize(t))} cell${cubeSize(t) > 1 ? "s" : ""} → ${termHtml(t, names)}`);
          return {
            prompt: `Use a Karnaugh map to find the minimal sum-of-products form of ${M.eq(`${it("f")}(${names.map(it).join(", ")}) = Σ${it("m")}(${mins.map((m) => n(m)).join(", ")})`)}`,
            steps: [`Fill the map in Gray-code order (neighbors differ in one bit; the edges wrap around): ${table}`,
              `Circle the largest rectangles of 1s whose size is a power of two, as few as possible, until every 1 is covered: ${groupTxt.join("; ")}. Inside each group the variables that change drop out.`,
              `OR the products: ${it("f")} = ${sopHtml(good, names)}.`],
            answer: { kind: "choice", options, index: order.indexOf(0) }, answerText: sopHtml(good, names),
            vals: {}, params: { nv, mins, opts: order.map((i) => opts[i]) }, consts: [4, 8],
          };
        }
      },
    },

    // ---- EE.39 Flip-flops, registers & counters ---------------------------------------------------------------------------------------------
    "EE.flipflops": {
      title: "Flip-flops, counters and clock speed",
      generate(r, level) {
        if (level === 1) {
          const nb = r.int(2, 8), fk = r.pick([1000, 2000, 4800, 8000, 16000, 32768, 64000]), mod = 1 << nb, fq = fk / mod;
          if (!Number.isInteger(r2(fq * 1000, 6))) return this.generate(r, level);
          return {
            prompt: `${cap1(art(nb))} ${n(nb)}-bit binary ripple counter is clocked at ${big(fk)}&nbsp;Hz. How many states does it count through, and what is the frequency of its most significant output bit? Enter the number of states, the frequency (Hz).`,
            steps: [`${n(nb)} flip-flops give a mod-${M.sup("2", n(nb))} counter: ${big(mod)} states (0 to ${big(mod - 1)}).`,
              `Each stage toggles at half the rate of the one before, so bit ${it("i")} runs at ${M.frac(sym("f", "clk"), M.sup("2", `${it("i")} + 1`))}. The top bit (${it("i")} = ${n(nb - 1)}) runs at ${M.frac(big(fk), M.sup("2", n(nb)))} = ${big(fq)}&nbsp;Hz.`],
            answer: { kind: "numbers", values: [mod, fq], ordered: true }, answerText: `${big(mod)} states; ${big(fq)}&nbsp;Hz`, answerInput: `${mod}, ${fq}`, vals: { mod, top: mod - 1, fq, i: nb - 1 }, params: { nb, fk },
          };
        }
        if (level === 2) {
          for (;;) {
            const tcq = r.pick([0.5, 1, 1.5, 2]), tl = r.pick([2, 3, 4, 5, 6, 8, 10, 12]), ts = r.pick([0.5, 1, 1.5]), tot = tcq + tl + ts, fm = 1000 / tot;
            if (tie(fm, 2)) continue;
            return {
              prompt: `In a synchronous circuit the slowest register-to-register path has clock-to-Q delay ${q(tcq, "ns")}, logic delay ${q(tl, "ns")} and setup time ${q(ts, "ns")}. What is the maximum clock frequency, in MHz? Round to 2 decimal places.`,
              steps: [`Within one clock period the data must leave the first register, pass the logic, and settle before the next edge: ${it("T")} ≥ ${sym("t", "cq")} + ${sym("t", "logic")} + ${sym("t", "setup")}.`,
                `${it("T")} = ${n(tcq)} + ${n(tl)} + ${n(ts)} = ${q(tot, "ns")}.`, `${sym("f", "max")} = ${M.frac("1", `${n(tot)}&nbsp;ns`)} = ${M.frac("1000", n(tot))}&nbsp;MHz ${approx(fm, 2)} ${q(fm, "MHz", 2)}.`],
              answer: { kind: "number", value: fm, dp: 2 }, answerText: q(fm, "MHz", 2), answerInput: r2(fm, 2).toString(), vals: { tot, fm }, params: { tcq, tl, ts }, consts: [1000],
            };
          }
        }
        const Q0 = r.int(0, 1), J = [0, 1, 2, 3].map(() => r.int(0, 1)), K = [0, 1, 2, 3].map(() => r.int(0, 1)), Qs = [];
        let qv = Q0;
        const rows = [];
        for (let k = 0; k < 4; k++) {
          const nx = J[k] && K[k] ? 1 - qv : J[k] ? 1 : K[k] ? 0 : qv;
          rows.push([n(k + 1), bits(String(J[k])), bits(String(K[k])), bits(String(qv)), bits(String(nx)), J[k] && K[k] ? "toggle" : J[k] ? "set" : K[k] ? "reset" : "hold"]);
          qv = nx; Qs.push(nx);
        }
        const ans = Qs.join("");
        return {
          prompt: `A JK flip-flop starts with ${it("Q")} = ${bits(String(Q0))}. On four successive clock edges its inputs are ${it("J")}${it("K")} = ${J.map((j, k) => bits(`${j}${K[k]}`)).join(", ")}. What is ${it("Q")} after each edge? Enter the four bits in order, e.g. ${bits("1011")}.`,
          steps: [`JK rule ${M.sup(it("Q"), "+")} = ${it("J")}${bar(it("Q"))} + ${bar(it("K"))}${it("Q")}: ${it("J")}${it("K")} = 00 holds, 10 sets, 01 resets, 11 toggles.`,
            `${M.table(["edge", it("J"), it("K"), it("Q") + " before", it("Q") + " after", "action"], rows)}`, `${it("Q")} goes ${bits(ans)}.`],
          answer: { kind: "text", accept: [ans, ans.split("").join(" "), ans.split("").join(", "), ans.split("").join(",")] }, answerText: bits(ans), answerInput: ans,
          vals: { ans }, params: { Q0, J, K }, consts: [3, 4, 0, 10, 11],
        };
      },
    },

    // ---- EE.40 Passive components & switches: lamps and fuses ---------------------------------------------------------------------------------
    "EE.22": {
      title: "Lamps and fuses",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const Vr = r.pick([6, 12, 24, 120, 230]), Pr = r.pick([3, 5, 6, 12, 21, 36, 40, 60, 100]), Rl = (Vr * Vr) / Pr, Il = Pr / Vr;
            if (!Number.isInteger(r2(Rl * 100, 6)) || !Number.isInteger(r2(Il * 10000, 6))) continue;
            return {
              prompt: `A lamp symbol on a schematic is labelled ${q(Vr, "V")}, ${q(Pr, "W")}. Treating the lamp as a resistor at its rated operating point, what is its resistance and the current it draws? Enter ${it("R")} (Ω), ${it("I")} (A).`,
              steps: [`A lamp is a resistive load: ${it("P")} = ${M.frac(M.sup(it("V"), 2), it("R"))}, so ${it("R")} = ${M.frac(M.sup(it("V"), 2), it("P"))} = ${M.frac(big(Vr * Vr), n(Pr))} = ${q(Rl, OHM)}.`,
                `${it("I")} = ${M.frac(it("P"), it("V"))} = ${M.frac(n(Pr), n(Vr))} = ${q(Il, "A")}. (A cold filament has much lower resistance, which is why lamps fail at switch-on.)`],
              answer: { kind: "numbers", values: [Rl, Il], ordered: true }, answerText: `${q(Rl, OHM)}, ${q(Il, "A")}`, answerInput: `${Rl}, ${Il}`, vals: { VV: Vr * Vr, R: Rl, I: Il }, params: { V: Vr, P: Pr },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const Vs = r.pick([120, 230, 240]), fuse = r.pick([5, 10, 13, 15, 20]), [dev, Pd] = r.pick([["60 W bulbs", 60], ["100 W lamps", 100], ["1500 W heaters", 1500], ["800 W toasters", 800], ["250 W monitors", 250], ["400 W freezers", 400]]);
            const Imax = fuse, each = Pd / Vs, nmax = Math.floor((fuse * Vs) / Pd);
            if (nmax < 1 || (fuse * Vs) % Pd === 0 || nmax > 60) continue;
            return {
              prompt: `How many ${dev.replace(/(\d+) W/, "$1&nbsp;W")} can run at once on ${art(Vs)} ${q(Vs, "V")} circuit protected by ${art(fuse)} ${q(fuse, "A")} fuse before the fuse opens?`,
              steps: [`Each device draws ${it("I")} = ${M.frac(it("P"), it("V"))} = ${M.frac(n(Pd), n(Vs))} ${approx(each)} ${q(each, "A")}. In parallel their currents add.`,
                `The fuse opens when the total exceeds ${q(fuse, "A")}, i.e. ${n(fuse)} × ${n(Vs)} = ${big(fuse * Vs)}&nbsp;W of load.`,
                `${M.frac(big(fuse * Vs), n(Pd))} ${approx(fuse * Vs / Pd)} ${n(fuse * Vs / Pd)}, so at most ${n(nmax)} can run; one more would draw ${approx((nmax + 1) * Pd / Vs) === "=" ? "" : "about "}${n((nmax + 1) * Pd / Vs)}&nbsp;A &gt; ${n(fuse)}&nbsp;A.`],
              answer: { kind: "number", value: nmax }, answerText: n(nmax), answerInput: String(nmax),
              vals: { each, W: fuse * Vs, ratio: (fuse * Vs) / Pd, nmax, over: ((nmax + 1) * Pd) / Vs, Pd }, params: { Vs, fuse, Pd },
            };
          }
        }
        for (;;) {
          const Vr = r.pick([12, 24]), Pr = r.pick([6, 12, 18, 24, 36]), Rl = (Vr * Vr) / Pr, Rs = r.pick([2, 4, 6, 8, 12, 16, 24]), Vs = Vr, Iv = Vs / (Rl + Rs), Pl = Iv * Iv * Rl;
          if (!Number.isInteger(Rl) || tie(Pl, 2)) continue;
          return {
            prompt: `${cap1(art(Vr))} ${q(Vr, "V")}, ${q(Pr, "W")} lamp is dimmed by putting ${art(Rs)} ${q(Rs, OHM)} resistor in series with it on the same ${q(Vs, "V")} supply. Assuming the lamp's resistance stays at its rated value, what power does the lamp now get? Round to 2 decimal places.`,
            steps: [`Lamp resistance: ${M.frac(M.sup(n(Vr), 2), n(Pr))} = ${q(Rl, OHM)}.`, `Series loop: ${it("I")} = ${M.frac(n(Vs), `${n(Rl)} + ${n(Rs)}`)} = ${M.frac(n(Vs), n(Rl + Rs))} ${approx(Iv)} ${q(Iv, "A")}.`,
              `${it("P")} = ${M.sup(it("I"), 2)}${it("R")} = ${M.frac(M.sup(n(Vs), 2), M.sup(n(Rl + Rs), 2))} × ${n(Rl)} ${approx(Pl, 2)} ${q(Pl, "W", 2)}, down from ${q(Pr, "W")}. (A real filament cools and its resistance falls, so it would get a little more.)`],
            answer: { kind: "number", value: Pl, dp: 2 }, answerText: q(Pl, "W", 2), answerInput: r2(Pl, 2).toString(), vals: { R: Rl, sum: Rl + Rs, I: Iv, Pl }, params: { Vr, Pr, Rs },
          };
        }
      },
    },

    // ---- EE.41 Sources, meters & ground: meter readings and range extension ---------------------------------------------------------------------
    "EE.23": {
      title: "Meters: readings, loading and range extension",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const Vs = r.pick([5, 9, 12, 24]), R1 = r.pick([1, 2, 3, 4, 5, 10]), R2 = r.pick([1, 2, 3, 4, 5, 10]), Iv = Vs / (R1 + R2), V2 = Iv * R2;
            if (!Number.isInteger(r2(Iv * 100, 6)) || !Number.isInteger(r2(V2 * 100, 6))) continue;
            return {
              prompt: `${cap1(art(Vs))} ${q(Vs, "V")} source drives ${R(1)} = ${q(R1, KOHM)} and ${R(2)} = ${q(R2, KOHM)} in series. An ideal ammeter is inserted in the loop and an ideal voltmeter is placed across ${R(2)}. What do they read? Enter the current (mA), the voltage (V).`,
              graph: fig([-2.5, 9, -1.4, 5], [...vsrc([0, 0], [0, 4], `${fmt(Vs)} V`), W([0, 4], [1.6, 4]), { t: "circle", c: [2.1, 4], r: 0.45 }, T(2.1, 4, "A"), ...res([2.6, 4], [6, 4], pn("R", 1)), ...res([6, 4], [6, 0], pn("R", 2), -1), W([6, 0], [0, 0]),
                W([6, 4], [8, 4]), W([6, 0], [8, 0]), W([8, 4], [8, 2.45]), W([8, 0], [8, 1.55]), { t: "circle", c: [8, 2], r: 0.45 }, T(8, 2, "V")]),
              steps: [`An ideal ammeter has zero resistance and goes in series, so it does not change the loop: ${it("I")} = ${M.frac(n(Vs), `${n(R1)} + ${n(R2)}`)} = ${q(Iv, "mA")}.`,
                `An ideal voltmeter has infinite resistance and goes in parallel, drawing no current: it reads ${n(Iv)} × ${n(R2)} = ${q(V2, "V")}.`],
              answer: { kind: "numbers", values: [Iv, V2], ordered: true }, answerText: `${q(Iv, "mA")}, ${q(V2, "V")}`, answerInput: `${Iv}, ${V2}`, vals: { I: Iv, V2 }, params: { Vs, R1, R2 },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const Vs = r.pick([10, 12, 20]), R1 = r.pick([1, 2, 5]), R2 = r.pick([1, 2, 5]), Rm = r.pick([1, 10]), Rp = (R2 * Rm) / (R2 + Rm), V0 = (Vs * R2) / (R1 + R2), Vm = (Vs * Rp) / (R1 + Rp);
            if (tie(Vm, 2) || tie(Rp, 4)) continue;
            return {
              prompt: `A divider of ${R(1)} = ${q(R1, "MΩ")} (top) and ${R(2)} = ${q(R2, "MΩ")} (bottom) sits across ${q(Vs, "V")}. A digital voltmeter with ${q(Rm, "MΩ")} input resistance is connected across ${R(2)}. What does it read? Round to 2 decimal places.`,
              steps: [`An ideal meter would read ${n(Vs)} × ${M.frac(n(R2), n(R1 + R2))} = ${q(V0, "V")}. A real voltmeter's resistance appears in parallel with ${R(2)} and loads the divider.`,
                `${R(2)}${par}${sym("R", "m")} = ${M.frac(`${n(R2)} × ${n(Rm)}`, `${n(R2)} + ${n(Rm)}`)} ${approx(Rp)} ${q(Rp, "MΩ")}.`,
                `Reading: ${n(Vs)} × ${M.frac(n(Rp), `${n(R1)} + ${n(Rp)}`)} ${approx(Vm, 2)} ${q(Vm, "V", 2)}. With megohm resistors, even ${art(Rm)} ${q(Rm, "MΩ")} meter disturbs the circuit noticeably.`],
              answer: { kind: "number", value: Vm, dp: 2 }, answerText: q(Vm, "V", 2), answerInput: r2(Vm, 2).toString(), vals: { V0, sum: R1 + R2, Rp, Vm }, params: { Vs, R1, R2, Rm },
            };
          }
        }
        for (;;) {
          const Ig = r.pick([0.05, 0.1, 0.5, 1]), Rg = r.pick([20, 50, 100, 200, 500]);
          if (r.chance(0.5)) {
            const Vfs = r.pick([1, 5, 10, 20, 50, 100]), Rt = (Vfs * 1000) / Ig, Rs = Rt - Rg;
            if (Rs <= 0 || !Number.isInteger(r2(Rs, 6))) continue;
            return {
              prompt: `A moving-coil meter reads full scale at ${q(Ig, "mA")} and has coil resistance ${q(Rg, OHM)}. What series (multiplier) resistor turns it into ${art(Vfs)} ${q(Vfs, "V")} full-scale voltmeter?`,
              steps: [`At full scale the meter current is ${q(Ig, "mA")} with ${q(Vfs, "V")} across the whole voltmeter: total resistance ${M.frac(n(Vfs), `${n(Ig)} × 10<sup>−3</sup>`)} = ${big(Rt)}&nbsp;Ω.`,
                `The coil supplies ${q(Rg, OHM)} of it, so the multiplier is ${big(Rt)} − ${n(Rg)} = ${big(Rs)}&nbsp;Ω.`],
              answer: { kind: "number", value: Rs }, answerText: `${big(Rs)}&nbsp;Ω`, answerInput: String(Rs), vals: { Rt, Rs }, params: { kind: 0, Ig, Rg, Vfs }, consts: [10, 3],
            };
          }
          const Ifs = r.pick([1, 2, 5, 10]), Vg = (Ig * Rg) / 1000, Ish = Ifs - Ig / 1000, Rsh = (Vg / Ish) * 1000;   // mΩ
          if (tie(Rsh, 2)) continue;
          return {
            prompt: `A moving-coil meter reads full scale at ${q(Ig, "mA")} and has coil resistance ${q(Rg, OHM)}. What shunt resistor, in parallel with it, makes it a ${q(Ifs, "A")} full-scale ammeter? Give it in milliohms, rounded to 2 decimal places.`,
            steps: [`At full scale the coil carries ${q(Ig, "mA")}, so its voltage is ${n(Ig)} × 10<sup>−3</sup> × ${n(Rg)} = ${q(Vg, "V")}.`,
              `The shunt has the same voltage and carries the rest: ${n(Ifs)} − ${n(Ig / 1000)} = ${q(Ish, "A")}.`, `${sym("R", "sh")} = ${M.frac(n(Vg), n(Ish))}&nbsp;Ω ${approx(Rsh, 2)} ${q(Rsh, "mΩ", 2)}: an ammeter must have very low resistance.`],
            answer: { kind: "number", value: Rsh, dp: 2 }, answerText: q(Rsh, "mΩ", 2), answerInput: r2(Rsh, 2).toString(), vals: { Vg, Ig_A: Ig / 1000, Ish, Rsh }, params: { kind: 1, Ig, Rg, Ifs }, consts: [10, 3],
          };
        }
      },
    },

    // ---- EE.42 Semiconductors & op-amps: Zener regulators -----------------------------------------------------------------------------------------
    "EE.24": {
      title: "Zener-diode regulators",
      generate(r, level) {
        const Vz = sym("V", "Z"), Iz = sym("I", "Z");
        for (;;) {
          const vz = r.pick([3.3, 5.1, 6.2, 9.1, 12]), vin = r.pick([9, 12, 15, 18, 24]), Rv = r.pick([100, 150, 200, 220, 270, 330, 470]);
          if (vin - vz < 2) continue;
          const IR = ((vin - vz) / Rv) * 1000;
          if (level === 1) {
            if (!Number.isInteger(r2(IR * 100, 6))) continue;
            return {
              prompt: `${cap1(art(vz))} ${q(vz, "V")} Zener diode is fed from ${q(vin, "V")} through ${art(Rv)} ${q(Rv, OHM)} resistor, with no load connected. What current flows through the Zener, in mA?`,
              steps: [`In reverse breakdown the Zener holds its voltage at ${Vz} = ${q(vz, "V")}, so the resistor drops ${n(vin)} − ${n(vz)} = ${q(r2(vin - vz, 6), "V")}.`,
                `${it("I")} = ${M.frac(n(r2(vin - vz, 6)), n(Rv))} = ${q(IR, "mA")}; with no load all of it goes through the Zener.`],
              answer: { kind: "number", value: IR }, answerText: q(IR, "mA"), answerInput: String(r2(IR, 6)), vals: { drop: r2(vin - vz, 6), IR }, params: { vz, vin, R: Rv },
            };
          }
          if (level === 2) {
            const RL = r.pick([330, 470, 500, 1000, 2000]), IL = (vz / RL) * 1000, iz = IR - IL;
            if (iz < 2 || !Number.isInteger(r2(IR * 100, 6)) || !Number.isInteger(r2(IL * 100, 6))) continue;
            return {
              prompt: `A regulator uses ${art(vz)} ${q(vz, "V")} Zener fed from ${q(vin, "V")} through ${q(Rv, OHM)}, and drives ${art(RL)} ${q(RL, OHM)} load. How much current flows through the Zener, in mA?`,
              steps: [`The load sits across the Zener, so it sees ${q(vz, "V")}. Resistor current: ${M.frac(`${n(vin)} − ${n(vz)}`, n(Rv))} = ${q(IR, "mA")}.`,
                `Load current: ${M.frac(n(vz), n(RL))} = ${q(IL, "mA")}.`, `KCL: ${Iz} = ${n(IR)} − ${n(IL)} = ${q(iz, "mA")}. It stays positive, so the Zener is still regulating.`],
              answer: { kind: "number", value: r2(iz, 9) }, answerText: q(r2(iz, 9), "mA"), answerInput: String(r2(iz, 9)), vals: { IR, IL, iz: r2(iz, 9) }, params: { vz, vin, R: Rv, RL },
            };
          }
          const ILmax = r.pick([10, 20, 25, 40, 50]), Izmin = r.pick([5, 10]), tot = ILmax + Izmin, Rd = ((vin - vz) / tot) * 1000, Pz = vz * ((vin - vz) / Rd) * 1000;
          if (!Number.isInteger(r2(Rd * 10, 6)) || !Number.isInteger(r2(Pz * 10, 6))) continue;
          return {
            prompt: `Design a regulator: ${art(vz)} ${q(vz, "V")} Zener, fed from ${q(vin, "V")}, must supply loads up to ${q(ILmax, "mA")} while keeping at least ${q(Izmin, "mA")} through the Zener. What series resistor is needed, and what power must the Zener handle if the load is disconnected? Enter ${it("R")} (Ω), ${it("P")} (mW).`,
            steps: [`At full load the resistor must carry the load plus the minimum Zener current: ${n(ILmax)} + ${n(Izmin)} = ${q(tot, "mA")}.`,
              `${it("R")} = ${M.frac(`${n(vin)} − ${n(vz)}`, `${n(tot)}&nbsp;mA`)} = ${q(Rd, OHM)}.`,
              `With no load, all ${q(tot, "mA")} flows through the Zener: ${it("P")} = ${n(vz)} × ${n(tot)} = ${q(Pz, "mW")}. Choose a Zener rated above that.`],
            answer: { kind: "numbers", values: [Rd, Pz], ordered: true }, answerText: `${it("R")} = ${q(Rd, OHM)}, ${it("P")} = ${q(Pz, "mW")}`, answerInput: `${Rd}, ${Pz}`, vals: { tot, R: Rd, P: Pz }, params: { vz, vin, ILmax, Izmin },
          };
        }
      },
    },

    // ---- EE.43 Logic gates -------------------------------------------------------------------------------------------------------------------------
    "EE.25": {
      title: "Logic gates and adders",
      generate(r, level) {
        if (level === 1) {
          const g = r.pick(Object.keys(GATES)), col = [0, 1, 2, 3].map((m) => GATES[g].f((m >> 1) & 1, m & 1)).join("");
          return {
            prompt: `Write the output column of a 2-input ${g} gate (${GATES[g].shape}) for inputs ${it("A")}${it("B")} = 00, 01, 10, 11, in that order (e.g. ${bits("0110")}).`,
            steps: [`${g}: ${GATES[g].rule}`, `${M.table([it("A"), it("B"), it("Y")], [0, 1, 2, 3].map((m) => [bits(String((m >> 1) & 1)), bits(String(m & 1)), bits(col[m])]))}`, `Output column: ${bits(col)}.`],
            answer: { kind: "text", accept: [col, col.split("").join(" "), col.split("").join(",")] }, answerText: bits(col), answerInput: col, vals: { col }, params: { g }, consts: [10, 11, 0],
          };
        }
        if (level === 2) {
          const g1 = r.pick(Object.keys(GATES)), g2 = r.pick(Object.keys(GATES)), col = [], rows = [];
          for (let m = 0; m < 8; m++) { const A = (m >> 2) & 1, B = (m >> 1) & 1, Cc = m & 1, x = GATES[g1].f(A, B), y = GATES[g2].f(x, Cc); col.push(y); rows.push([A, B, Cc, x, y].map((v) => bits(String(v)))); }
          const ans = col.join("");
          return {
            prompt: `Inputs ${it("A")} and ${it("B")} feed ${/^[AOX]/.test(g1) ? "an" : "a"} ${g1} gate. Its output ${it("X")} and input ${it("C")} feed ${/^[AOX]/.test(g2) ? "an" : "a"} ${g2} gate, whose output is ${it("Y")}. Write the column of ${it("Y")} for ${it("A")}${it("B")}${it("C")} = 000, 001, …, 111 (8 bits, e.g. ${bits("01101001")}).`,
            steps: [`First gate: ${it("X")} = ${g1}(${it("A")}, ${it("B")}). Second: ${it("Y")} = ${g2}(${it("X")}, ${it("C")}).`, `${M.table([it("A"), it("B"), it("C"), it("X"), it("Y")], rows)}`, `${it("Y")} column: ${bits(ans)}.`],
            answer: { kind: "text", accept: [ans, ans.split("").join(" "), ans.split("").join(",")] }, answerText: bits(ans), answerInput: ans, vals: { ans }, params: { g1, g2 }, consts: [0, 1, 111, 8],
          };
        }
        const a = r.int(1, 15), b = r.int(1, 15), ab = toBin(a, 4), bb = toBin(b, 4), rows = [];
        let c = 0, sbits = "";
        for (let i = 3; i >= 0; i--) {
          const x = +ab[i], y = +bb[i], s = x ^ y ^ c, co = (x & y) | (c & (x ^ y));
          rows.push([n(3 - i), bits(String(x)), bits(String(y)), bits(String(c)), bits(String(s)), bits(String(co))]);
          sbits = s + sbits; c = co;
        }
        const out = String(c) + sbits, sum = a + b;
        return {
          prompt: `A 4-bit ripple-carry adder (four full adders) adds ${bits(ab)} and ${bits(bb)}. What 5-bit result, carry-out first, does it produce?`,
          steps: [`Each full adder computes sum = ${it("a")} ⊕ ${it("b")} ⊕ ${sym("c", "in")} (an XOR chain) and carry = ${it("a")}${it("b")} + ${sym("c", "in")}(${it("a")} ⊕ ${it("b")}), starting at the rightmost bit with ${sym("c", "in")} = 0.`,
            `${M.table(["bit", it("a"), it("b"), sym("c", "in"), "sum", sym("c", "out")], rows)}`,
            `Result ${bits(out)}: carry-out ${bits(String(c))}, then the sum bits. Check: ${n(a)} + ${n(b)} = ${n(sum)}.`],
          answer: { kind: "text", accept: [out, out.split("").join(" ")] }, answerText: bits(out), answerInput: out, vals: { out, sum }, params: { a, b }, consts: [3, 4, 5],
        };
      },
    },
  });
})(Practice);
