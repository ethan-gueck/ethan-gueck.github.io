/*
 * practice/physics.js — Physics & Natural Phenomena practice problems (chapter 12), one generator per
 * concept key.
 *
 * Each generator(r, level) draws realistic, hand-friendly numbers for the level (1 easy, 2 medium, 3 hard)
 * and builds every number it shows from values it computes and reports in `vals`;
 * tools/practice/verifiers/physics.py recomputes each of them independently from `params`.
 * Conventions: SI units, g = 9.81 m/s² (stated in every prompt that uses it), and any other constant is
 * stated in the prompt and listed in `consts`. Where a calculator is unavoidable the prompt says how to
 * round and the steps show the intermediate values a reader would get.
 *
 * Skipped concepts: none. Every concept in chapter 12 has something to compute.
 */
(function (P) {
  "use strict";
  const { Frac, M, fmt, graph } = P;

  // ---- Helpers ------------------------------------------------------------------------------------
  let CONSTS = [];
  /** Is v (nearly) halfway between two roundings at dp places? Such values round differently in different tools. */
  const nearTie = (v, dp) => { const s = Math.abs(v) * Math.pow(10, dp); return Math.abs(s - Math.floor(s) - 0.5) < 1e-6; };
  /** Places to show: dp, or one more when v sits on a rounding tie (so the shown value is exact). */
  const places = (v, dp) => { const b = dp === undefined ? 4 : dp; let d = b; while (d < b + 3 && nearTie(v, d)) d++; return d; };
  const n = (v, dp) => M.n(v, { dp: places(v, dp) });
  const np = (v, dp) => M.n(v, { paren: true, dp: places(v, dp) });
  /** A fixed constant shown in the text (recorded in `consts`). */
  const c = (v, dp) => { CONSTS.push(v); return n(v, dp); };
  const V = (s) => M.v(s);
  const S = (s, sub) => M.sub(M.v(s), sub);
  const frac = M.frac;
  const H = "½";
  const fv = (q) => ({ n: q.n, d: q.d });
  /** A decimal with at most 4 places as an exact fraction. */
  const D = (x) => new Frac(Math.round(x * 10000), 10000);
  /** Does the fraction end as a decimal of at most 4 places? */
  const term = (q) => 10000 % q.d === 0;
  /** A fraction shown as a decimal when it terminates, else stacked. */
  const qs = (q, paren = false) => (term(q) ? (paren ? np(q.value) : n(q.value)) : M.f(q, { paren }));
  const qt = (q) => (term(q) ? fmt(q.value).replace(/−/g, "-") : `${q.n}/${q.d}`);
  const isExact = (v, dp = 4) => Math.abs(P.round(v, dp) - v) <= 1e-12 * Math.max(1, Math.abs(v));
  /** "= 2.5" when the shown value is exact, "≈ 2.4495" when it is rounded. */
  const ap = (v, dp = 4) => `${isExact(v, places(v, dp)) ? "=" : "≈"} ${n(v, dp)}`;
  const g = 9.81;
  const gTxt = () => `${V("g")} = ${c(9.81)} m/s²`;
  const rnd = (dp) => (dp === 0 ? "Round to the nearest whole number." : `Round to ${c(dp)} decimal place${dp === 1 ? "" : "s"}.`);
  const r4 = (x) => Math.round(x * 10000) / 10000;
  const rad = (deg) => (deg * Math.PI) / 180;
  const sind = (deg) => Math.sin(rad(deg));
  const cosd = (deg) => Math.cos(rad(deg));
  const tand = (deg) => Math.tan(rad(deg));
  const asind = (x) => (Math.asin(x) * 180) / Math.PI;

  /** Mantissa and exponent for scientific notation, the mantissa rounded to dp places in [1, 10). */
  function sciParts(v, dp) {
    let e = Math.floor(Math.log10(Math.abs(v)));
    let m = v / Math.pow(10, e);
    if (Math.abs(m) >= 10) { m /= 10; e += 1; }
    if (Math.abs(m) < 1) { m *= 10; e -= 1; }
    if (Math.abs(P.round(m, dp)) >= 10) { m /= 10; e += 1; }
    return { m, e };
  }
  /** A computed value shown in scientific notation; records name+"M" and name+"E" in vals. */
  function sci(vals, name, v, dp = 3) {
    const { m, e } = sciParts(v, dp);
    vals[name + "M"] = m; vals[name + "E"] = e;
    CONSTS.push(10);
    return `${n(m, dp)} × 10<sup>${n(e)}</sup>`;
  }
  /** A fixed constant in scientific notation, mantissa given as text so its digits show (e.g. "3.00"). */
  const sciC = (ms, e) => { CONSTS.push(parseFloat(ms), Math.abs(e), 10); return `${ms} × 10<sup>${n(e)}</sup>`; };

  /** Answer fields for a number (exact, or rounded to dp when the prompt asks). */
  function num(v, unit, dp) {
    const s = dp === undefined ? n(v) : n(v, dp);
    const answer = dp === undefined ? { kind: "number", value: v } : { kind: "number", value: v, dp };
    return { answer, answerText: unit ? (unit === "%" || unit === "°" ? `${s}${unit}` : `${s} ${unit}`) : s, answerInput: s.replace(/−/g, "-") };
  }
  /** Answer fields for an exact fraction. */
  function numF(q, unit) {
    const s = qs(q);
    return { answer: { kind: "number", value: q.value }, answerText: unit ? `${s} ${unit}` : s, answerInput: qt(q) };
  }
  const def = (title, gen) => ({
    title,
    generate(r, level) {
      for (let tries = 0; ; tries++) {
        CONSTS = [];
        const p = gen(r, level);
        if (tries < 50 && p.answer.dp !== undefined && nearTie(p.answer.value, p.answer.dp)) continue;  // draw again
        if (p.consts) CONSTS.push(...p.consts);
        p.consts = [...new Set(CONSTS)];
        return p;
      }
    },
  });

  /** A free-body diagram: a box with force arrows; forces: [{ ang (degrees), mag, label }]. */
  function fbd(forces, extra = []) {
    const max = Math.max(...forces.map((f) => f.mag));
    const items = [{ t: "poly", p: [[-0.6, -0.45], [0.6, -0.45], [0.6, 0.45], [-0.6, 0.45]], role: "muted" }];
    for (const f of forces) {
      const a = rad(f.ang), ux = Math.cos(a), uy = Math.sin(a);
      const s = Math.min(0.6 / Math.max(Math.abs(ux), 1e-9), 0.45 / Math.max(Math.abs(uy), 1e-9));
      const L = 0.7 + (1.5 * f.mag) / max;
      items.push({ t: "vec", a: [r4(ux * s), r4(uy * s)], b: [r4(ux * (s + L)), r4(uy * (s + L))], label: f.label, role: f.role || "primary" });
    }
    return graph({ view: [-3.2, 3.2, -3, 3], equal: true, axes: false, grid: false, items: items.concat(extra) });
  }

  /** A trapezoid-shaped graph (rise over t1, flat to t2, fall to zero at t3) with value labels on the axes. */
  function trapGraph(t1, t2, t3, Y, xl, yl) {
    const items = [{ t: "seg", a: [0, 0], b: [t1, Y], role: "primary" }];
    if (t2 > t1) items.push({ t: "seg", a: [t1, Y], b: [t2, Y], role: "primary" });
    items.push({ t: "seg", a: [t2, Y], b: [t3, 0], role: "primary" });
    items.push({ t: "seg", a: [t1, 0], b: [t1, Y], dash: true, role: "muted" });
    if (t2 > t1) items.push({ t: "seg", a: [t2, 0], b: [t2, Y], dash: true, role: "muted" });
    items.push({ t: "seg", a: [0, Y], b: [t1, Y], dash: true, role: "muted" });
    const dy = 0.09 * Y, dx = 0.05 * t3 + 0.3;
    for (const t of [...new Set([t1, t2, t3])]) items.push({ t: "text", x: t, y: -dy, s: fmt(t) });
    items.push({ t: "text", x: -dx, y: Y, s: fmt(Y) });
    items.push({ t: "text", x: t3 * 1.08 + 0.4, y: dy, s: xl });
    items.push({ t: "text", x: 0.12 * t3 + 0.6, y: Y * 1.18, s: yl });
    return graph({ view: [-0.12 * t3 - 0.6, t3 * 1.15 + 1, -0.18 * Y, Y * 1.28], items });
  }
  /** Areas under the trapezoid: rising triangle, flat rectangle, falling triangle. */
  function trapAreas(t1, t2, t3, Y, unitY, unitX, areaUnit, what) {
    const A1 = (t1 * Y) / 2, w = t2 - t1, A2 = w * Y, b = t3 - t2, A3 = (b * Y) / 2, tot = A1 + A2 + A3;
    const steps = [
      `Rising part (0 to ${n(t1)} ${unitX}): a triangle, ${H} · ${n(t1)} · ${n(Y)} = ${n(A1)} ${areaUnit}.`,
    ];
    if (w > 0) steps.push(`Flat part (${n(t1)} to ${n(t2)} ${unitX}): a rectangle, (${n(t2)} − ${n(t1)}) · ${n(Y)} = ${n(w)} · ${n(Y)} = ${n(A2)} ${areaUnit}.`);
    steps.push(`Falling part (${n(t2)} to ${n(t3)} ${unitX}): a triangle, ${H} · (${n(t3)} − ${n(t2)}) · ${n(Y)} = ${H} · ${n(b)} · ${n(Y)} = ${n(A3)} ${areaUnit}.`);
    steps.push(`Total ${what}: ${w > 0 ? `${n(A1)} + ${n(A2)} + ${n(A3)}` : `${n(A1)} + ${n(A3)}`} = ${n(tot)} ${areaUnit}.`);
    return { steps, vals: { A1, w, A2, b, A3, tot } };
  }

  // ---- P.1 dimensional analysis data ------------------------------------------------------------------
  const DIM = { // exponents of [M, L, T]
    T: [0, 0, 1], t: [0, 0, 1], L: [0, 1, 0], m: [1, 0, 0], g: [0, 1, -2], F: [1, 1, -2], mu: [1, -1, 0],
    lam: [0, 1, 0], k: [1, 0, -2], h: [0, 1, 0], r: [0, 1, 0], G: [-1, 3, -2], Ms: [1, 0, 0], rho: [1, -3, 0],
    v: [0, 1, -1], A: [0, 2, 0], E: [1, 2, -2], R: [0, 1, 0],
  };
  const SYM = { T: V("T"), t: V("t"), L: V("L"), m: V("m"), g: V("g"), F: V("F"), mu: V("μ"), lam: V("λ"), k: V("k"), h: V("h"),
    r: V("r"), G: V("G"), Ms: V("M"), rho: V("ρ"), v: V("v"), A: V("A"), E: V("E"), R: V("R") };
  const CC = V("C");
  const ANSATZ = [
    { id: "pendulum", q: "T", desc: "the period <i>T</i> of a simple pendulum", vars: [["L", "its length"], ["m", "the mass of the bob"], ["g", "the gravitational acceleration"]], nice: `${CC}${M.sqrt(frac(V("L"), V("g")))}` },
    { id: "string", q: "v", desc: "the speed <i>v</i> of a wave on a stretched string", vars: [["F", "the tension"], ["mu", "the mass per unit length"]], nice: `${CC}${M.sqrt(frac(V("F"), V("μ")))}` },
    { id: "deep", q: "v", desc: "the speed <i>v</i> of a deep-water ocean wave", vars: [["g", "the gravitational acceleration"], ["lam", "the wavelength"]], nice: `${CC}${M.sqrt(`${V("g")}${V("λ")}`)}` },
    { id: "spring", q: "T", desc: "the period <i>T</i> of a mass bouncing on a spring", vars: [["m", "the mass"], ["k", "the spring constant (force per unit stretch)"]], nice: `${CC}${M.sqrt(frac(V("m"), V("k")))}` },
    { id: "fall", q: "t", desc: "the time <i>t</i> an object dropped from rest takes to fall a height <i>h</i>", vars: [["h", "the height"], ["g", "the gravitational acceleration"], ["m", "the object's mass"]], nice: `${CC}${M.sqrt(frac(V("h"), V("g")))}` },
    { id: "orbit", q: "T", desc: "the period <i>T</i> of a small moon on a circular orbit", vars: [["r", "the orbit radius"], ["G", "the gravitational constant", " (in N·m²/kg²)"], ["Ms", "the planet's mass"]], nice: `${CC}${M.sqrt(frac(`${V("r")}³`, `${V("G")}${V("M")}`))}` },
    { id: "drag", q: "F", desc: "the air-drag force <i>F</i> on a fast car", vars: [["rho", "the air density"], ["v", "the speed"], ["A", "the frontal area"]], nice: `${CC}${V("ρ")}${V("v")}²${V("A")}` },
    { id: "escape", q: "v", desc: "the escape speed <i>v</i> from a planet's surface", vars: [["G", "the gravitational constant", " (in N·m²/kg²)"], ["Ms", "the planet's mass"], ["R", "the planet's radius"]], nice: `${CC}${M.sqrt(frac(`${V("G")}${V("M")}`, V("R")))}` },
    { id: "ke", q: "E", desc: "the kinetic energy <i>E</i> of a moving object", vars: [["m", "its mass"], ["v", "its speed"]], nice: `${CC}${V("m")}${V("v")}²` },
  ];
  const DNAMES = ["M", "L", "T"];
  function dimTxt(d) {
    const parts = [];
    d.forEach((e, i) => {
      if (e === 0) return;
      if (e === 1) parts.push(DNAMES[i]);
      else { CONSTS.push(Math.abs(e)); parts.push(`${DNAMES[i]}<sup>${n(e)}</sup>`); }
    });
    return parts.length ? parts.join(" ") : "1 (no dimensions)";
  }
  /** A linear combination of letters: coefs [1, −3, 0] over [a, b, c] → "a − 3b". */
  function linTxt(coefs, letters) {
    let out = "";
    coefs.forEach((k, i) => {
      if (k === 0) return;
      const a = Math.abs(k);
      if (a !== 1) CONSTS.push(a);
      const body = `${a === 1 ? "" : n(a)}${V(letters[i])}`;
      if (out === "") out = (k < 0 ? "−" : "") + body;
      else out += ` ${k < 0 ? "−" : "+"} ${body}`;
    });
    return out;
  }

  P.define("physics", {
    // ---- P.1 Units & dimensional analysis ---------------------------------------------------------
    "P.1": def("Units and dimensional analysis", (r, level) => {
      if (level === 1) {
        const kind = r.pick(["kmh", "ms", "rho"]);
        if (kind === "kmh") {
          const kmh = 9 * r.int(4, 16), mph = kmh * 1000, ms = mph / 3600;
          const who = r.pick(["A car", "A bus", "A delivery van", "A train"]);
          return {
            prompt: `${who} travels at ${n(kmh)} km/h. Express this speed in meters per second (m/s).`,
            steps: [
              `The conversion factors: 1 km = ${c(1000)} m and 1 h = ${c(3600)} s.`,
              `Multiply by fractions equal to 1 so that km and h cancel: ${n(kmh)} km/h × ${frac(`${c(1000)} m`, "1 km")} × ${frac("1 h", `${c(3600)} s`)} = ${frac(`${n(mph)} m`, `${c(3600)} s`)}.`,
              `Divide: ${n(mph)} ÷ ${c(3600)} = ${n(ms)}, so the speed is ${n(ms)} m/s.`,
            ],
            ...num(ms, "m/s"), vals: { mph, ms }, params: { kind, kmh },
          };
        }
        if (kind === "ms") {
          const [who, lo, hi] = r.pick([["A sprinter", 6, 11], ["A cyclist", 5, 15], ["A car", 12, 35], ["A cheetah", 20, 30]]);
          const s = r.int(lo, hi), mph = s * 3600, kmh = mph / 1000;
          return {
            prompt: `${who} moves at ${n(s)} m/s. Express this speed in kilometers per hour (km/h).`,
            steps: [
              `The conversion factors: 1 h = ${c(3600)} s and 1 km = ${c(1000)} m.`,
              `Multiply by fractions equal to 1 so that m and s cancel: ${n(s)} m/s × ${frac(`${c(3600)} s`, "1 h")} × ${frac("1 km", `${c(1000)} m`)} = ${frac(`${n(mph)} km`, `${c(1000)} h`)}.`,
              `Divide: ${n(mph)} ÷ ${c(1000)} = ${n(kmh)}, so the speed is ${n(kmh)} km/h.`,
            ],
            ...num(kmh, "km/h"), vals: { mph, kmh }, params: { kind, s },
          };
        }
        const [mat, rho] = r.pick([["Aluminum", 2.7], ["Iron", 7.87], ["Ice", 0.917], ["Seawater", 1.025], ["Mercury", 13.6], ["Gold", 19.3], ["Olive oil", 0.91], ["Copper", 8.96]]);
        const si = rho * 1000;
        return {
          prompt: `${mat} has a density of ${n(rho)} g/cm³. Express this density in the SI unit kg/m³.`,
          steps: [
            `The conversion factors: 1 g = 10<sup>−${c(3)}</sup> kg, and since 1 cm = 10<sup>−2</sup> m, 1 cm³ = (10<sup>−2</sup> m)³ = 10<sup>−${c(6)}</sup> m³.`,
            `So 1 g/cm³ = ${frac(`10<sup>−${c(3)}</sup> kg`, `10<sup>−${c(6)}</sup> m³`)} = 10<sup>${c(3)}</sup> kg/m³ = ${c(1000)} kg/m³.`,
            `Multiply: ${n(rho)} × ${c(1000)} = ${n(si)} kg/m³.`,
          ],
          ...num(si, "kg/m³"), vals: { si }, params: { kind, rho }, consts: [10],
        };
      }
      if (level === 2) {
        const OPT = { N: "kg·m/s²", J: "kg·m²/s²", W: "kg·m²/s³", Pa: "kg/(m·s²)", p: "kg·m/s" };
        const q = r.pick(["N", "J", "W", "Pa"]);
        const info = {
          N: ["newton (N)", "force", [
            `Newton's second law, ${V("F")} = ${V("m")}${V("a")}, defines the newton: force is mass times acceleration.`,
            `So 1 N = 1 kg × 1 m/s² = 1 kg·m/s².`]],
          J: ["joule (J)", "energy", [
            `Work is force times distance (${V("W")} = ${V("F")}${V("d")}), so 1 J = 1 N·m.`,
            `With 1 N = 1 kg·m/s² (from ${V("F")} = ${V("m")}${V("a")}): 1 J = kg·m/s² × m = kg·m²/s².`]],
          W: ["watt (W)", "power", [
            `Power is energy per unit time (${V("P")} = ${V("W")}/${V("t")}), so 1 W = 1 J/s.`,
            `With 1 J = 1 N·m = 1 kg·m²/s²: 1 W = kg·m²/s² ÷ s = kg·m²/s³.`]],
          Pa: ["pascal (Pa)", "pressure", [
            `Pressure is force per unit area (${V("P")} = ${V("F")}/${V("A")}), so 1 Pa = 1 N/m².`,
            `With 1 N = 1 kg·m/s²: 1 Pa = kg·m/s² ÷ m² = kg/(m·s²).`]],
        }[q];
        const opts = r.shuffle(Object.keys(OPT));
        return {
          prompt: `Which combination of SI base units equals one ${info[0]}, the unit of ${info[1]}?`,
          steps: info[2],
          answer: { kind: "choice", options: opts.map((k) => OPT[k]), index: opts.indexOf(q) },
          answerText: OPT[q], vals: {}, params: { q, opts },
        };
      }
      // level 3: power-law ansatz
      const sc = r.pick(ANSATZ);
      const letters = ["a", "b", "c"].slice(0, sc.vars.length);
      const lhs = DIM[sc.q];
      const coefs = [0, 1, 2].map((d) => sc.vars.map(([v]) => DIM[v][d]));
      const prodTxt = sc.vars.map(([v], i) => `${SYM[v]}<sup>${V(letters[i])}</sup>`).join("");
      const dimList = [`[${SYM[sc.q]}] = ${dimTxt(lhs)}`].concat(sc.vars.map(([v]) => `[${SYM[v]}] = ${dimTxt(DIM[v])}`));
      const eqs = [];
      [0, 1, 2].forEach((d) => {
        if (coefs[d].every((k) => k === 0) && lhs[d] === 0) return;
        eqs.push({ d, txt: `${DNAMES[d]}: ${n(lhs[d])} = ${linTxt(coefs[d], letters)}` });
      });
      const known = {};
      const used = new Set();
      const solveSteps = [];
      for (;;) {
        const left = letters.filter((l) => !(l in known));
        if (!left.length) break;
        const eq = eqs.find((e) => !used.has(e.d) && coefs[e.d].filter((k, i) => k !== 0 && !(letters[i] in known)).length === 1);
        if (!eq) throw new Error("ansatz not triangular");
        used.add(eq.d);
        const ui = coefs[eq.d].findIndex((k, i) => k !== 0 && !(letters[i] in known));
        const kc = coefs[eq.d][ui];
        let rest = new Frac(0);
        const subs = [];
        coefs[eq.d].forEach((k, i) => {
          if (k === 0) return;
          if (i === ui) { subs.push({ k, txt: V(letters[i]), unk: true }); return; }
          rest = rest.add(known[letters[i]].mul(k));
          subs.push({ k, txt: M.f(known[letters[i]], { paren: true }) });
        });
        const val = new Frac(lhs[eq.d]).sub(rest).div(kc);
        known[letters[ui]] = val;
        let line = `From ${DNAMES[eq.d]}: ${n(lhs[eq.d])} = ${linTxt(coefs[eq.d], letters)}`;
        if (subs.length > 1) {
          const others = letters.filter((l, i) => i !== ui && coefs[eq.d][i] !== 0);
          const sub = subs.map((s, j) => {
            const a = Math.abs(s.k);
            const body = a === 1 ? s.txt : s.unk ? `${n(a)}${s.txt}` : `${n(a)} · ${s.txt}`;
            return j === 0 ? (s.k < 0 ? "−" : "") + body : ` ${s.k < 0 ? "−" : "+"} ${body}`;
          }).join("");
          line += `; with ${others.map((l) => `${V(l)} = ${M.f(known[l])}`).join(" and ")} this is ${n(lhs[eq.d])} = ${sub}`;
        }
        solveSteps.push(`${line}, so ${V(letters[ui])} = ${M.f(val)}.`);
      }
      const checks = eqs.filter((e) => !used.has(e.d));
      if (checks.length) solveSteps.push(`Check with the remaining equation${checks.length > 1 ? "s" : ""}: ${checks.map((e) => e.txt).join("; ")}. ${checks.length > 1 ? "They hold" : "It holds"} with these values.`);
      const ex = letters.map((l) => known[l]);
      const supTxt = (q) => (q.d === 1 ? n(q.n) : `${n(q.n)}/${q.d}`);
      const finalProd = sc.vars.map(([v], i) => (ex[i].n === 0 ? "" : ex[i].eq(1) ? SYM[v] : `${SYM[v]}<sup>${supTxt(ex[i])}</sup>`)).join("");
      const vals = {};
      letters.forEach((l, i) => { vals[l] = fv(ex[i]); });
      const varList = sc.vars.map(([v, d, note]) => `${d} ${SYM[v]}${note || ""}`);
      const listTxt = varList.length === 2 ? varList.join(" and ") : `${varList.slice(0, -1).join(", ")} and ${varList[varList.length - 1]}`;
      return {
        prompt: `Use dimensional analysis to find how ${sc.desc} depends on ${listTxt}. Assume ${SYM[sc.q]} = ${CC}${prodTxt}, with ${CC} a dimensionless number, and find the exponents ${letters.map(V).join(", ")} in that order.`,
        steps: [
          `Write each quantity in base dimensions (M mass, L length, T time): ${dimList.join(", ")}.`,
          `Both sides of ${SYM[sc.q]} = ${CC}${prodTxt} must have the same dimensions, so the exponents of each base dimension match: ${eqs.map((e) => e.txt).join("; ")}.`,
          ...solveSteps,
          `So ${SYM[sc.q]} = ${CC}${finalProd} = ${sc.nice}.`,
        ],
        answer: { kind: "numbers", values: ex.map((q) => q.value), ordered: true },
        answerText: letters.map((l, i) => `${V(l)} = ${M.f(ex[i])}`).join(", "),
        answerInput: ex.map((q) => (q.d === 1 ? String(q.n) : `${q.n}/${q.d}`)).join(", "),
        vals, params: { id: sc.id },
      };
    }),

    // ---- P.2 Kinematics: constant acceleration --------------------------------------------------------
    "P.2": def("Constant-acceleration kinematics", (r, level) => {
      const v0s = S("v", "0"), dx = `Δ${V("x")}`, vv = V("v"), aa = V("a"), tt = V("t");
      if (level === 1) {
        const kind = r.pick(["vt", "avg"]);
        if (kind === "vt") {
          const [who, hi, as] = r.pick([["A cyclist", 6, [0.5, 1, 1.5]], ["A car", 15, [1, 1.5, 2, 2.5, 3]], ["A train", 10, [0.5, 1]], ["A motorbike", 12, [2, 2.5, 3, 4]]]);
          const v0 = r.int(0, hi), a = r.pick(as), t = r.int(3, 10), at = a * t, v = v0 + at;
          return {
            prompt: `${who} ${v0 === 0 ? "starts from rest and" : `moving at ${n(v0)} m/s`} speeds up with a constant acceleration of ${n(a)} m/s² for ${n(t)} s. How fast is it moving at the end, in m/s?`,
            steps: [
              `Knowns: ${v0s} = ${n(v0)} m/s, ${aa} = ${n(a)} m/s², ${tt} = ${n(t)} s. We want ${vv}, and we neither know nor need the displacement ${dx}.`,
              `The equation that leaves out ${dx} is the velocity–time equation: ${vv} = ${v0s} + ${aa}${tt}.`,
              `Substitute: ${vv} = ${n(v0)} + ${n(a)} · ${n(t)} = ${n(v0)} + ${n(at)} = ${n(v)} m/s.`,
            ],
            ...num(v, "m/s"), vals: { at, v }, params: { kind, v0, a, t },
          };
        }
        const v0 = r.int(0, 10), v = v0 + r.int(4, 20), t = r.int(2, 12), sum = v0 + v, d = (sum * t) / 2;
        const who = r.pick(["A car", "A bus", "A motorbike", "A cyclist"]);
        return {
          prompt: `${who} speeds up steadily from ${v0 === 0 ? "rest" : `${n(v0)} m/s`} to ${n(v)} m/s in ${n(t)} s. How far does it travel in that time, in meters?`,
          steps: [
            `Knowns: ${v0s} = ${n(v0)} m/s, ${vv} = ${n(v)} m/s, ${tt} = ${n(t)} s. We want ${dx}, and we neither know nor need the acceleration ${aa}.`,
            `The equation that leaves out ${aa} is the average-velocity form: ${dx} = ${H}(${v0s} + ${vv})${tt}. With constant acceleration the average velocity is the midpoint of ${v0s} and ${vv}.`,
            `Substitute: ${dx} = ${H} · (${n(v0)} + ${n(v)}) · ${n(t)} = ${H} · ${n(sum)} · ${n(t)} = ${n(d)} m.`,
          ],
          ...num(d, "m"), vals: { sum, d }, params: { kind, v0, v, t },
        };
      }
      if (level === 2) {
        const kind = r.pick(["dist", "acc"]);
        const v0 = r.int(10, 30), a = r.pick([2, 2.5, 4, 5, 8]), sq = v0 * v0;
        const setup = `Take the direction of motion as positive. Braking means the acceleration points backward, and the car ends at rest, so ${vv} = 0.`;
        if (kind === "dist") {
          const twoA = 2 * a, d = sq / twoA;
          return {
            prompt: `A car traveling at ${n(v0)} m/s brakes with a constant deceleration of ${n(a)} m/s². How far does it travel before it stops, in meters?`,
            steps: [
              `${setup} So ${aa} = −${n(a)} m/s².`,
              `We know ${v0s}, ${vv} and ${aa}, want ${dx}, and do not know the time: use the timeless equation ${vv}² = ${v0s}² + 2${aa}${dx}.`,
              `0 = ${n(v0)}² + 2 · (−${n(a)}) · ${dx}, so ${dx} = ${frac(`${n(v0)}²`, `2 · ${n(a)}`)} = ${frac(n(sq), n(twoA))} = ${n(d)} m.`,
            ],
            ...num(d, "m"), vals: { sq, twoA, d }, params: { kind, v0, a },
          };
        }
        const d = sq / (2 * a), twoD = 2 * d;
        return {
          prompt: `A car traveling at ${n(v0)} m/s brakes steadily to a stop in a distance of ${n(d)} m. What constant deceleration does this take, in m/s²?`,
          steps: [
            setup,
            `We know ${v0s}, ${vv} and ${dx}, want ${aa}, and do not know the time: use the timeless equation ${vv}² = ${v0s}² + 2${aa}${dx}.`,
            `0 = ${n(v0)}² + 2${aa} · ${n(d)}, so ${aa} = −${frac(`${n(v0)}²`, `2 · ${n(d)}`)} = −${frac(n(sq), n(twoD))} = −${n(a)} m/s².`,
            `The negative sign means the acceleration opposes the motion: a deceleration of ${n(a)} m/s².`,
          ],
          ...num(a, "m/s²"), vals: { sq, twoD, a }, params: { kind, v0, d },
        };
      }
      // level 3: read a v–t graph
      const kind = r.pick(["dist", "acc"]);
      const Y = 2 * r.int(2, 10), t1 = r.int(2, 6), w = r.int(2, 8), b = r.int(2, 6), t2 = t1 + w, t3 = t2 + b;
      const gph = trapGraph(t1, t2, t3, Y, "t (s)", "v (m/s)");
      if (kind === "dist") {
        const ar = trapAreas(t1, t2, t3, Y, "m/s", "s", "m", "distance");
        return {
          prompt: `The graph shows the velocity of a test car on a straight track. How far does the car travel in the ${n(t3)} s shown, in meters?`,
          graph: gph,
          steps: [`Displacement is the area under the ${V("v")}–${V("t")} graph. The velocity is never negative here, so the area is also the distance traveled.`, ...ar.steps],
          ...num(ar.vals.tot, "m"), vals: ar.vals, params: { kind, t1, t2, t3, Y },
        };
      }
      const phase = r.pick(["up", "down"]);
      const acc = phase === "up" ? new Frac(Y, t1) : new Frac(-Y, b);
      const steps = [`Acceleration is the slope of the ${V("v")}–${V("t")} graph.`];
      if (phase === "up") steps.push(`While speeding up, the line runs from (0, 0) to (${n(t1)}, ${n(Y)}): slope = ${frac(`${n(Y)} − 0`, `${n(t1)} − 0`)} = ${qs(acc)} m/s².`);
      else steps.push(`While slowing down, the line runs from (${n(t2)}, ${n(Y)}) to (${n(t3)}, 0): slope = ${frac(`0 − ${n(Y)}`, `${n(t3)} − ${n(t2)}`)} = ${frac(`−${n(Y)}`, n(b))} = ${qs(acc)} m/s².`, `The negative slope means the car is decelerating.`);
      return {
        prompt: `The graph shows the velocity of a test car on a straight track. What is its acceleration while it is ${phase === "up" ? "speeding up" : "slowing down"}, in m/s²?`,
        graph: gph, steps,
        ...numF(acc, "m/s²"), vals: phase === "up" ? { acc: fv(acc) } : { b, acc: fv(acc) }, params: { kind, phase, t1, t2, t3, Y },
      };
    }),

    // ---- P.projectile Projectile motion --------------------------------------------------------------
    "P.projectile": def("Projectile motion", (r, level) => {
      const vx0 = S("v", "0x"), vy0 = S("v", "0y"), tt = V("t");
      if (level === 1) {
        const [tpl, hs, ulo, uhi] = r.pick([
          [(h, u) => `A ball rolls off a horizontal table ${n(h)} m high at ${n(u)} m/s.`, [0.75, 0.8, 0.9, 1, 1.2], 1, 4],
          [(h, u) => `A stone is thrown horizontally at ${n(u)} m/s from the top of a cliff ${n(h)} m high.`, [10, 15, 20, 25, 30, 40, 45, 50, 60], 5, 20],
          [(h, u) => `A package slides off the edge of a flat roof ${n(h)} m above the ground, moving horizontally at ${n(u)} m/s.`, [3, 4, 5, 6, 8], 2, 6],
        ]);
        const h = r.pick(hs), u = r.int(ulo, uhi);
        const ratio = (2 * h) / g, t = Math.sqrt(ratio), x = u * t;
        return {
          prompt: `${tpl(h, u)} Ignoring air resistance, how far from the base does it land, in meters? Take ${gTxt()}. ${rnd(2)}`,
          steps: [
            `The launch is horizontal, so ${vy0} = 0 and the vertical motion is free fall from rest: ${V("h")} = ${H}${V("g")}${tt}².`,
            `Time to fall: ${tt}² = ${frac(`2${V("h")}`, V("g"))} = ${frac(`2 · ${n(h)}`, c(9.81))} ${ap(ratio)} s², so ${tt} ${ap(t)} s.`,
            `Horizontally no force acts, so the speed stays ${n(u)} m/s: ${V("x")} = ${S("v", "x")}${tt} = ${n(u)} · ${n(t, 4)} ${ap(x)} m.`,
          ],
          ...num(x, "m", 2), vals: { ratio, t, x }, params: { h, u },
        };
      }
      if (level === 2) {
        const kind = r.pick(["range", "height", "time"]);
        const th = 5 * r.int(4, 14), v0 = r.int(8, 30);
        const vx = v0 * cosd(th), vy = v0 * sind(th), tf = (2 * vy) / g;
        const what = { range: "how far away it lands (its range), in meters", height: "the maximum height it reaches, in meters", time: "how long it stays in the air, in seconds" }[kind];
        const steps = [`Resolve the launch velocity: ${vx0} = ${S("v", "0")} cos θ = ${n(v0)} · cos ${n(th)}° ${ap(vx)} m/s and ${vy0} = ${S("v", "0")} sin θ = ${n(v0)} · sin ${n(th)}° ${ap(vy)} m/s.`];
        let ans, vals;
        if (kind === "height") {
          const Hh = (vy * vy) / (2 * g);
          steps.push(`At the top the vertical velocity is zero. The timeless equation vertically, 0 = ${vy0}² − 2${V("g")}${V("H")}, gives ${V("H")} = ${frac(`${vy0}²`, `2${V("g")}`)} = ${frac(`${n(vy, 4)}²`, `2 · ${c(9.81)}`)} ${ap(Hh)} m.`);
          ans = num(Hh, "m", 2); vals = { vx, vy, Hh };
        } else {
          steps.push(`It lands when ${V("y")} = ${vy0}${tt} − ${H}${V("g")}${tt}² = 0 again. The nonzero root is ${tt} = ${frac(`2${vy0}`, V("g"))} = ${frac(`2 · ${n(vy, 4)}`, c(9.81))} ${ap(tf)} s.`);
          if (kind === "time") { ans = num(tf, "s", 2); vals = { vx, vy, tf }; }
          else {
            const R = vx * tf;
            steps.push(`No horizontal force acts, so ${vx0} stays constant: ${V("R")} = ${vx0}${tt} = ${n(vx, 4)} · ${n(tf, 4)} ${ap(R)} m.`);
            ans = num(R, "m", 2); vals = { vx, vy, tf, R };
          }
        }
        return {
          prompt: `A ball is kicked from level ground at ${n(v0)} m/s, ${n(th)}° above the horizontal. Ignoring air resistance, find ${what}. Take ${gTxt()}. ${rnd(2)}`,
          steps, ...ans, vals, params: { kind, th, v0 }, deg: true,
        };
      }
      // level 3: launched upward from a cliff, landing below
      const v0 = r.int(8, 20), th = 5 * r.int(3, 12), h = r.int(5, 40);
      const vx = v0 * cosd(th), vy = v0 * sind(th), vy2 = vy * vy, twogh = 2 * g * h, sq = Math.sqrt(vy2 + twogh);
      const t = (vy + sq) / g, x = vx * t, Hh = vy2 / (2 * g);
      const k = g / (2 * v0 * v0 * cosd(th) * cosd(th));
      const top = h + Hh;
      const s6 = (v) => String(+v.toFixed(6));
      return {
        prompt: `A stone is thrown from the top of a cliff ${n(h)} m high at ${n(v0)} m/s, ${n(th)}° above the horizontal, and lands on the flat ground below. Ignoring air resistance, how far from the base of the cliff does it land, in meters? Take ${gTxt()}. ${rnd(2)}`,
        graph: graph({
          view: [-0.12 * x, 1.12 * x, -0.06 * top, 1.15 * top],
          items: [
            { t: "poly", p: [[r4(-0.1 * x), 0], [0, 0], [0, h], [r4(-0.1 * x), h]], role: "muted" },
            { t: "fn", e: `${h} + ${s6(tand(th))}*x - ${s6(k)}*x^2`, role: "primary" },
            { t: "pt", x: 0, y: h, label: "launch" },
          ],
        }),
        steps: [
          `Resolve the launch velocity: ${vx0} = ${n(v0)} · cos ${n(th)}° ${ap(vx)} m/s and ${vy0} = ${n(v0)} · sin ${n(th)}° ${ap(vy)} m/s.`,
          `Put the origin at the base of the cliff with up positive. Vertically, ${V("y")} = ${V("h")} + ${vy0}${tt} − ${H}${V("g")}${tt}². It lands when ${V("y")} = 0: ${H}${V("g")}${tt}² − ${vy0}${tt} − ${V("h")} = 0, a quadratic in ${tt}.`,
          `The quadratic formula, keeping the positive root: ${tt} = ${frac(`${vy0} + ${M.sqrt(`${vy0}² + 2${V("g")}${V("h")}`)}`, V("g"))}. Here ${vy0}² ${ap(vy2)} and 2${V("g")}${V("h")} = 2 · ${c(9.81)} · ${n(h)} = ${n(twogh)}, so the root is ${M.sqrt(`${n(vy2, 4)} + ${n(twogh)}`)} ${ap(sq)}.`,
          `${tt} = ${frac(`${n(vy, 4)} + ${n(sq, 4)}`, c(9.81))} ${ap(t)} s.`,
          `Horizontally the velocity stays ${vx0}: ${V("x")} = ${vx0}${tt} = ${n(vx, 4)} · ${n(t, 4)} ${ap(x)} m.`,
        ],
        ...num(x, "m", 2), vals: { vx, vy, vy2, twogh, sq, t, x }, params: { v0, th, h }, deg: true,
      };
    }),

    // ---- P.3 Newton's laws & friction --------------------------------------------------------------------
    "P.3": def("Newton's laws and friction", (r, level) => {
      const mk = S("μ", "k"), fk = S("f", "k");
      if (level === 1) {
        for (;;) {
          const m = r.pick([2, 4, 5, 8, 10, 20, 25, 40, 50]), Fe = r.int(5, 80), Fw = r.int(5, 80);
          if (Fe === Fw) continue;
          const net = Fe - Fw, a = Math.abs(net) / m;
          const dir = net > 0 ? "east" : "west";
          return {
            prompt: `Two people push a ${n(m)} kg crate across frictionless ice: one pushes east with ${n(Fe)} N, the other west with ${n(Fw)} N. Find the magnitude of the crate's acceleration, in m/s².`,
            graph: fbd([{ ang: 0, mag: Fe, label: `${fmt(Fe)} N` }, { ang: 180, mag: Fw, label: `${fmt(Fw)} N` }, { ang: 90, mag: (Fe + Fw) / 2, label: "N" }, { ang: -90, mag: (Fe + Fw) / 2, label: "W" }]),
            steps: [
              `Free-body diagram: weight ${V("W")} down, normal force ${V("N")} up, ${n(Fe)} N east and ${n(Fw)} N west. Nothing accelerates vertically, so ${V("N")} balances ${V("W")} and only the horizontal forces matter.`,
              `Net force, east positive: ${S("F", "net")} = ${n(Fe)} − ${n(Fw)} = ${n(net)} N${net < 0 ? `, that is ${n(-net)} N west` : ""}.`,
              `Newton's second law: ${V("a")} = ${frac(`|${S("F", "net")}|`, V("m"))} = ${frac(n(Math.abs(net)), n(m))} = ${n(a)} m/s², directed ${dir}.`,
            ],
            ...num(a, "m/s²"), vals: { net, a }, params: { m, Fe, Fw },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const m = r.int(10, 60), mu = r.pick([0.15, 0.2, 0.25, 0.3, 0.35, 0.4]);
          const Nf = m * g, f = mu * Nf, F = Math.ceil(f) + r.int(10, 80), net = F - f, a = net / m;
          if (a < 0.2) continue;
          return {
            prompt: `A worker drags a ${n(m)} kg crate across a level floor with a horizontal rope pulling ${n(F)} N. The coefficient of kinetic friction between the crate and the floor is ${n(mu)}. Find the crate's acceleration, in m/s². Take ${gTxt()}. ${rnd(2)}`,
            graph: fbd([{ ang: 0, mag: F, label: "T" }, { ang: 180, mag: f, label: "f" }, { ang: 90, mag: Nf, label: "N" }, { ang: -90, mag: Nf, label: "W" }]),
            steps: [
              `Free-body diagram: the rope's pull ${V("T")} = ${n(F)} N forward, kinetic friction ${fk} backward, weight ${V("m")}${V("g")} down and the normal force ${V("N")} up.`,
              `Nothing accelerates vertically, so ${V("N")} = ${V("m")}${V("g")} = ${n(m)} · ${c(9.81)} = ${n(Nf)} N.`,
              `Kinetic friction: ${fk} = ${mk}${V("N")} = ${n(mu)} · ${n(Nf)} = ${n(f)} N.`,
              `Newton's second law along the floor: ${V("T")} − ${fk} = ${V("m")}${V("a")}, so ${V("a")} = ${frac(`${n(F)} − ${n(f)}`, n(m))} = ${frac(n(net), n(m))} ${ap(a)} m/s².`,
            ],
            ...num(a, "m/s²", 2), vals: { Nf, f, net, a }, params: { m, mu, F },
          };
        }
      }
      // level 3: an incline with friction, or a block on a table pulled by a hanging block
      if (r.chance(0.5)) {
        for (;;) {
          const th = r.pick([25, 30, 35, 40, 45]), mu = r.pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4]), m = r.int(2, 20);
          if (tand(th) - mu < 0.15) continue;
          const W = m * g, Wpar = W * sind(th), Wperp = W * cosd(th), f = mu * Wperp, net = Wpar - f, a = net / m;
          // the ramp: hypotenuse from (0, hgt) down to (wid, 0); block centered on it
          const L = 5, wid = L * cosd(th), hgt = L * sind(th);
          const ux = cosd(th), uy = -sind(th), nx = sind(th), ny = cosd(th);
          const mx = wid / 2 + 0.35 * nx, my = hgt / 2 + 0.35 * ny;
          const corner = (s, t) => [r4(wid / 2 + s * ux + t * nx), r4(hgt / 2 + s * uy + t * ny)];
          const C = [r4(mx), r4(my)];
          return {
            prompt: `A ${n(m)} kg box is released from rest on a ramp inclined at ${n(th)}° to the horizontal. The coefficient of kinetic friction between the box and the ramp is ${n(mu)}. Find the box's acceleration down the ramp, in m/s². Take ${gTxt()}. ${rnd(2)}`,
            graph: graph({
              view: [-0.6, wid + 0.8, -1.4, hgt + 1.2], equal: true, axes: false, grid: false,
              items: [
                { t: "poly", p: [[0, 0], [r4(wid), 0], [0, r4(hgt)]], role: "muted" },
                { t: "poly", p: [corner(-0.35, 0), corner(0.35, 0), corner(0.35, 0.7), corner(-0.35, 0.7)], role: "secondary" },
                { t: "vec", a: C, b: [C[0], r4(C[1] - 1.6)], label: "mg", role: "primary" },
                { t: "vec", a: C, b: [r4(C[0] + 1.3 * nx), r4(C[1] + 1.3 * ny)], label: "N", role: "primary" },
                { t: "vec", a: C, b: [r4(C[0] - 1.0 * ux), r4(C[1] - 1.0 * uy)], label: "f", role: "primary" },
                { t: "text", x: r4(wid - 0.9), y: 0.25, s: "θ" },
              ],
            }),
            steps: [
              `Free-body diagram: weight ${V("m")}${V("g")} straight down, normal force ${V("N")} perpendicular to the ramp, kinetic friction ${fk} up the ramp (opposing the sliding). Take ${V("x")} down the ramp and ${V("y")} perpendicular to it.`,
              `Weight: ${V("m")}${V("g")} = ${n(m)} · ${c(9.81)} = ${n(W)} N. Along the ramp: ${V("m")}${V("g")} sin θ = ${n(W)} · sin ${n(th)}° ${ap(Wpar)} N. Into the ramp: ${V("m")}${V("g")} cos θ = ${n(W)} · cos ${n(th)}° ${ap(Wperp)} N.`,
              `Nothing accelerates perpendicular to the ramp, so ${V("N")} = ${V("m")}${V("g")} cos θ ${ap(Wperp)} N, and ${fk} = ${mk}${V("N")} = ${n(mu)} · ${n(Wperp, 4)} ${ap(f)} N.`,
              `Newton's second law along the ramp: ${V("m")}${V("g")} sin θ − ${fk} = ${V("m")}${V("a")}, so ${V("a")} = ${frac(`${n(Wpar, 4)} − ${n(f, 4)}`, n(m))} = ${frac(n(net, 4), n(m))} ${ap(a)} m/s². (The mass cancels: ${V("a")} = ${V("g")}(sin θ − ${mk} cos θ).)`,
            ],
            ...num(a, "m/s²", 2), vals: { W, Wpar, Wperp, f, net, a }, params: { th, mu, m }, deg: true,
          };
        }
      }
      for (;;) {
        const m1 = r.int(2, 10), m2 = r.int(1, 6), mu = r.pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4]), ask = r.pick(["a", "T"]);
        const W2 = m2 * g, f = mu * m1 * g, net = W2 - f, mt = m1 + m2, a = net / mt;
        if (a < 0.5) continue;
        const gma = g - a, T = m2 * gma;
        const steps = [
          `The string keeps both blocks moving with the same acceleration ${V("a")}. Newton's second law for each block, positive in its direction of motion: hanging block ${S("m", 2)}${V("g")} − ${V("T")} = ${S("m", 2)}${V("a")}; table block ${V("T")} − ${mk}${S("m", 1)}${V("g")} = ${S("m", 1)}${V("a")}.`,
          `The forces: the hanging weight ${S("m", 2)}${V("g")} = ${n(m2)} · ${c(9.81)} = ${n(W2)} N, and the friction on the table block ${mk}${S("m", 1)}${V("g")} = ${n(mu)} · ${n(m1)} · ${c(9.81)} = ${n(f)} N.`,
          `Add the two equations so the tension cancels: ${S("m", 2)}${V("g")} − ${mk}${S("m", 1)}${V("g")} = (${S("m", 1)} + ${S("m", 2)})${V("a")}, so ${V("a")} = ${frac(`${n(W2)} − ${n(f)}`, `${n(m1)} + ${n(m2)}`)} = ${frac(n(net), n(mt))} ${ap(a)} m/s².`,
        ];
        const vals = { W2, f, net, mt, a };
        if (ask === "T") {
          steps.push(`From the hanging block: ${V("T")} = ${S("m", 2)}(${V("g")} − ${V("a")}) = ${n(m2)} · (${c(9.81)} − ${n(a, 4)}) = ${n(m2)} · ${n(gma, 4)} ${ap(T)} N.`);
          Object.assign(vals, { gma, T });
        }
        return {
          prompt: `A ${n(m1)} kg block rests on a horizontal table. A light string tied to it runs over a frictionless pulley at the table's edge to a hanging ${n(m2)} kg block. The coefficient of kinetic friction between the table and the first block is ${n(mu)}. After the blocks are released, find ${ask === "a" ? "their acceleration, in m/s²" : "the tension in the string, in newtons"}. Take ${gTxt()}. ${rnd(2)}`,
          graph: graph({
            view: [-3.3, 2.6, -2.8, 1.5], equal: true, axes: false, grid: false,
            items: [
              { t: "poly", p: [[-3, 0], [1, 0], [1, -2.5], [-3, -2.5]], role: "muted" },
              { t: "poly", p: [[-2.2, 0], [-0.8, 0], [-0.8, 0.9], [-2.2, 0.9]], label: "m₁", role: "secondary" },
              { t: "circle", c: [1.25, 0.25], r: 0.25 },
              { t: "seg", a: [-0.8, 0.5], b: [1.25, 0.5] },
              { t: "seg", a: [1.5, 0.25], b: [1.5, -1.2] },
              { t: "poly", p: [[1.1, -1.2], [1.9, -1.2], [1.9, -2.0], [1.1, -2.0]], label: "m₂", role: "secondary" },
            ],
          }),
          steps, ...num(ask === "a" ? a : T, ask === "a" ? "m/s²" : "N", 2), vals, params: { m1, m2, mu, ask },
        };
      }
    }),

    // ---- P.hooke Hooke's law & springs ---------------------------------------------------------------
    "P.hooke": def("Hooke's law and springs", (r, level) => {
      const kk = V("k"), xx = V("x"), FF = V("F");
      if (level === 1) {
        if (r.chance(0.5)) {
          for (;;) {
            const F = r.int(2, 60), x = r.pick([2, 4, 5, 8, 10, 12, 15, 20, 25]);
            const kq = new Frac(F * 100, x);
            if (!term(kq)) continue;
            const xm = x / 100, k = kq.value;
            return {
              prompt: `A spring stretches ${n(x)} cm when a force of ${n(F)} N pulls on it. What is its spring constant, in N/m?`,
              steps: [
                `Convert the stretch to meters: ${n(x)} cm = ${n(xm)} m.`,
                `Hooke's law (magnitudes): ${FF} = ${kk}${xx}, so ${kk} = ${frac(FF, xx)} = ${frac(n(F), n(xm))} = ${n(k)} N/m.`,
              ],
              ...num(k, "N/m"), vals: { xm, k }, params: { kind: "k", F, x },
            };
          }
        }
        for (;;) {
          const k = r.pick([50, 100, 200, 250, 400, 500, 800, 1000]), F = r.int(2, 80);
          const xq = new Frac(F, k);
          if (!term(xq)) continue;
          const xm = xq.value, xcm = xm * 100;
          return {
            prompt: `A spring with spring constant ${n(k)} N/m is pulled with a force of ${n(F)} N. How far does it stretch, in centimeters?`,
            steps: [
              `Hooke's law (magnitudes): ${FF} = ${kk}${xx}, so ${xx} = ${frac(FF, kk)} = ${frac(n(F), n(k))} = ${n(xm)} m.`,
              `In centimeters: ${n(xm)} × ${c(100)} = ${n(xcm)} cm.`,
            ],
            ...num(xcm, "cm"), vals: { xm, xcm }, params: { kind: "x", F, k },
          };
        }
      }
      if (level === 2) {
        const series = r.chance(0.5);
        let k1, k2;
        if (series) [k1, k2] = r.shuffle(r.pick([[100, 100], [200, 300], [300, 600], [150, 300], [400, 400], [200, 200], [120, 600], [30, 60], [100, 400], [200, 800], [300, 300], [400, 600], [500, 500], [100, 150], [60, 90]]));
        else { k1 = 50 * r.int(1, 10); k2 = 50 * r.int(1, 10); }
        const m = 0.5 * r.int(1, 10), W = m * g;
        const prod = k1 * k2, sum = k1 + k2, keq = series ? prod / sum : sum, xm = W / keq, xcm = xm * 100;
        const steps = [series
          ? `In series each spring carries the full weight and their stretches add, so ${frac("1", S("k", "eq"))} = ${frac("1", S("k", 1))} + ${frac("1", S("k", 2))}, which gives ${S("k", "eq")} = ${frac(`${S("k", 1)}${S("k", 2)}`, `${S("k", 1)} + ${S("k", 2)}`)} = ${frac(`${n(k1)} · ${n(k2)}`, `${n(k1)} + ${n(k2)}`)} = ${frac(n(prod), n(sum))} = ${n(keq)} N/m.`
          : `In parallel both springs stretch the same amount and their forces add: ${S("k", "eq")} = ${S("k", 1)} + ${S("k", 2)} = ${n(k1)} + ${n(k2)} = ${n(keq)} N/m.`];
        steps.push(`At rest the spring force balances the weight: ${S("k", "eq")}${xx} = ${V("m")}${V("g")} = ${n(m)} · ${c(9.81)} = ${n(W)} N.`);
        steps.push(`${xx} = ${frac(n(W), n(keq))} ${ap(xm, 5)} m ${ap(xcm, 3)} cm.`);
        return {
          prompt: `Two springs with spring constants ${n(k1)} N/m and ${n(k2)} N/m hang from a ceiling ${series ? "joined end to end (in series), with a" : "side by side (in parallel), joined at the bottom by a light bar that holds a"} ${n(m)} kg mass${series ? " hanging from the lower spring" : ""}. How far does the mass move down as the springs stretch, in centimeters? Take ${gTxt()}. ${rnd(2)}`,
          steps, ...num(xcm, "cm", 2), vals: series ? { prod, sum, keq, W, xm, xcm } : { keq, W, xm, xcm }, params: { series: series ? 1 : 0, k1, k2, m },
        };
      }
      // level 3: energy from an F–x graph, or a stretched steel wire (Young's modulus)
      if (r.chance(0.5)) {
        for (;;) {
          const k = r.pick([100, 200, 250, 400, 500]), x1 = r.int(2, 8), x2 = r.int(2, 10);
          if (x1 === x2 || (k * x1) % 100 !== 0) continue;
          const F1 = (k * x1) / 100, x1m = x1 / 100, x2m = x2 / 100, x2sq = x2m * x2m, U = 0.5 * k * x2sq;
          const Fmax = k / 10;
          return {
            prompt: `The graph shows the force ${FF} needed to stretch a spring by ${xx}. Using the marked point, find the elastic potential energy the spring stores when it is stretched ${n(x2)} cm, in joules.`,
            graph: graph({
              view: [-1.2, 11, -0.12 * Fmax, 1.15 * Fmax],
              items: [
                { t: "fn", e: `${k / 100}*x`, role: "primary" },
                { t: "pt", x: x1, y: F1, label: "P" },
                { t: "seg", a: [x1, 0], b: [x1, F1], dash: true, role: "muted" },
                { t: "seg", a: [0, F1], b: [x1, F1], dash: true, role: "muted" },
                { t: "text", x: x1, y: -0.07 * Fmax, s: fmt(x1) },
                { t: "text", x: -0.6, y: F1, s: fmt(F1) },
                { t: "text", x: 10.3, y: 0.05 * Fmax, s: "x (cm)" },
                { t: "text", x: 1.2, y: 1.1 * Fmax, s: "F (N)" },
              ],
            }),
            steps: [
              `The graph is a straight line through the origin, so the spring obeys Hooke's law, ${FF} = ${kk}${xx}, and the slope is ${kk}. Read the marked point: ${FF} = ${n(F1)} N at ${xx} = ${n(x1)} cm = ${n(x1m)} m.`,
              `${kk} = ${frac(FF, xx)} = ${frac(n(F1), n(x1m))} = ${n(k)} N/m.`,
              `The stored energy is the area under the line up to ${xx} = ${n(x2)} cm = ${n(x2m)} m, a triangle: ${S("U", "s")} = ${H}${kk}${xx}² = ${H} · ${n(k)} · ${n(x2m)}² = ${H} · ${n(k)} · ${n(x2sq)} = ${n(U)} J.`,
            ],
            ...num(U, "J"), vals: { F1, x1m, k, x2m, x2sq, U }, params: { kind: "graph", x1, x2, k },
          };
        }
      }
      for (;;) {
        const L0 = 0.5 * r.int(2, 10), d = r.pick([0.5, 0.8, 1, 1.2, 1.5, 2]), m = r.int(5, 50);
        const F = m * g, dm = d / 1000, A = (Math.PI * dm * dm) / 4, EA = 2e11 * A, dLm = (F * L0) / EA, dLmm = dLm * 1000;
        if (F / A > 2.5e8 || dLmm < 0.3) continue;
        const vals = { F, dm, EA, dLm, dLmm };
        const As = sci(vals, "A", A, 3);
        return {
          prompt: `A steel wire ${n(L0)} m long and ${n(d)} mm in diameter hangs from a hook, and a ${n(m)} kg mass is attached to its lower end. Young's modulus for steel is ${V("E")} = ${c(200)} GPa = ${sciC("2.00", 11)} Pa. By how much does the wire stretch, in millimeters? Take ${gTxt()}. ${rnd(2)}`,
          steps: [
            `The load: ${FF} = ${V("m")}${V("g")} = ${n(m)} · ${c(9.81)} = ${n(F)} N.`,
            `Cross-section: ${V("d")} = ${n(d)} mm = ${n(dm)} m, so ${V("A")} = ${frac(`π${V("d")}²`, c(4))} = ${frac(`π · ${n(dm)}²`, c(4))} ≈ ${As} m².`,
            `Hooke's law for a material (stress = ${V("E")} × strain): ${frac(FF, V("A"))} = ${V("E")}${frac(`Δ${V("L")}`, S("L", "0"))}, so Δ${V("L")} = ${frac(`${FF}${S("L", "0")}`, `${V("E")}${V("A")}`)}. First ${V("E")}${V("A")} = ${sciC("2.00", 11)} · ${As} ${ap(EA, 1)} N.`,
            `Δ${V("L")} = ${frac(`${n(F)} · ${n(L0)}`, n(EA, 1))} ${ap(dLm, 6)} m ${ap(dLmm, 3)} mm.`,
          ],
          ...num(dLmm, "mm", 2), vals, params: { kind: "young", L0, d, m },
        };
      }
    }),

    // ---- P.4 Work, energy & power -----------------------------------------------------------------------
    "P.4": def("Work, energy and power", (r, level) => {
      const m_ = V("m"), g_ = V("g"), h_ = V("h"), v_ = V("v");
      if (level === 1) {
        if (r.chance(0.5)) {
          const th = r.pick([0, 60]), F = 10 * r.int(2, 20), d = r.int(2, 50), cosv = th === 0 ? 1 : 0.5, W = F * d * cosv;
          const ctx = th === 0
            ? `A shopper pushes a cart ${n(d)} m along a level aisle with a horizontal force of ${n(F)} N.`
            : `A child pulls a sled ${n(d)} m across level snow with a rope that pulls with ${n(F)} N at ${n(th)}° above the horizontal.`;
          return {
            prompt: `${ctx} How much work does this force do, in joules?`,
            steps: [
              `Only the component of the force along the motion does work: ${V("W")} = ${V("F")}${V("d")} cos θ, with θ the angle between the force and the motion.`,
              `Here θ = ${n(th)}°, so cos θ = ${n(cosv)}.`,
              `${V("W")} = ${n(F)} · ${n(d)} · ${n(cosv)} = ${n(W)} J.`,
            ],
            ...num(W, "J"), vals: { cosv, W }, params: { kind: "work", th, F, d },
          };
        }
        const [who, mlo, mhi, mstep, vlo, vhi, kj] = r.pick([["car", 8, 20, 100, 5, 30, true], ["cyclist with bike", 70, 100, 1, 3, 12, false], ["sprinter", 55, 90, 1, 6, 10, false]]);
        const m = r.int(mlo, mhi) * mstep, v = r.int(vlo, vhi), v2 = v * v, KE = 0.5 * m * v2, KEk = KE / 1000;
        const steps = [`Kinetic energy: ${V("KE")} = ${H}${m_}${v_}² = ${H} · ${n(m)} · ${n(v)}² = ${H} · ${n(m)} · ${n(v2)} = ${n(KE)} J${kj ? ` = ${n(KEk)} kJ` : ""}.`];
        return {
          prompt: `A ${n(m)} kg ${who} moves at ${n(v)} m/s. What is its kinetic energy, in ${kj ? "kilojoules" : "joules"}?`,
          steps, ...num(kj ? KEk : KE, kj ? "kJ" : "J"), vals: kj ? { v2, KE, KEk } : { v2, KE }, params: { kind: "ke", m, v, kj: kj ? 1 : 0 },
        };
      }
      if (level === 2) {
        if (r.chance(0.5)) {
          const h = 0.5 * r.int(3, 24), twogh = 2 * g * h, v = Math.sqrt(twogh);
          return {
            prompt: `A child starts from rest at the top of a water slide that ends ${n(h)} m lower. Treating the slide as frictionless, how fast is the child moving at the bottom, in m/s? Take ${gTxt()}. ${rnd(2)}`,
            steps: [
              `Only gravity does work (the normal force is perpendicular to the motion), so mechanical energy is conserved. With the zero of potential energy at the bottom: ${m_}${g_}${h_} + 0 = 0 + ${H}${m_}${v_}².`,
              `The mass cancels: ${v_} = ${M.sqrt(`2${g_}${h_}`)} = ${M.sqrt(`2 · ${c(9.81)} · ${n(h)}`)} = ${M.sqrt(n(twogh))} ${ap(v)} m/s.`,
            ],
            ...num(v, "m/s", 2), vals: { twogh, v }, params: { kind: "slide", h },
          };
        }
        const v0 = r.int(5, 25), v02 = v0 * v0, Hh = v02 / (2 * g);
        return {
          prompt: `A ball is thrown straight up at ${n(v0)} m/s. Ignoring air resistance, how high above the release point does it rise, in meters? Take ${gTxt()}. ${rnd(2)}`,
          steps: [
            `Energy conservation from release to the top, where the ball is momentarily at rest (zero of potential energy at the release point): ${H}${m_}${S("v", "0")}² = ${m_}${g_}${V("H")}.`,
            `The mass cancels: ${V("H")} = ${frac(`${S("v", "0")}²`, `2${g_}`)} = ${frac(`${n(v0)}²`, `2 · ${c(9.81)}`)} = ${frac(n(v02), c(19.62))} ${ap(Hh)} m.`,
          ],
          ...num(Hh, "m", 2), vals: { v02, Hh }, params: { kind: "throw", v0 },
        };
      }
      // level 3: energy with friction losses, or power and efficiency
      if (r.chance(0.5)) {
        for (;;) {
          const m = r.int(20, 80), h = r.int(5, 20), d = 10 * r.int(2, 8), f = r.int(10, 60);
          const PE = m * g * h, loss = f * d, KE = PE - loss;
          if (loss > 0.8 * PE) continue;
          const v = Math.sqrt((2 * KE) / m);
          return {
            prompt: `A sled and rider with a combined mass of ${n(m)} kg start from rest at the top of a snowy hill and slide down to level ground ${n(h)} m lower, covering ${n(d)} m of snow in all. A friction force of ${n(f)} N opposes the motion the whole way. How fast are they moving at the end, in m/s? Take ${gTxt()}. ${rnd(2)}`,
            steps: [
              `Friction turns mechanical energy into heat, so use energy with losses (zero of potential energy at the bottom): ${m_}${g_}${h_} = ${H}${m_}${v_}² + ${S("E", "loss")}, with ${S("E", "loss")} = ${V("f")}${V("d")}.`,
              `Starting energy: ${m_}${g_}${h_} = ${n(m)} · ${c(9.81)} · ${n(h)} = ${n(PE)} J.`,
              `Lost to friction: ${V("f")}${V("d")} = ${n(f)} · ${n(d)} = ${n(loss)} J.`,
              `Kinetic energy left: ${n(PE)} − ${n(loss)} = ${n(KE)} J, so ${v_} = ${M.sqrt(frac(`2${V("KE")}`, m_))} = ${M.sqrt(frac(`2 · ${n(KE)}`, n(m)))} ${ap(v)} m/s.`,
            ],
            ...num(v, "m/s", 2), vals: { PE, loss, KE, v }, params: { kind: "loss", m, h, d, f },
          };
        }
      }
      const m = 50 * r.int(2, 20), h = r.int(5, 30), t = r.int(5, 60), eta = 5 * r.int(12, 18);
      const W = m * g * h, Pout = W / t, e = eta / 100, Pin = Pout / e, Pk = Pin / 1000;
      return {
        prompt: `An electric hoist lifts a ${n(m)} kg load ${n(h)} m straight up at constant speed in ${n(t)} s. The hoist is ${n(eta)}% efficient. What electrical power does it draw, in kilowatts? Take ${gTxt()}. ${rnd(2)}`,
        steps: [
          `At constant speed the useful work is the gain in potential energy: ${V("W")} = ${m_}${g_}${h_} = ${n(m)} · ${c(9.81)} · ${n(h)} = ${n(W)} J.`,
          `Useful (output) power: ${S("P", "out")} = ${frac(V("W"), V("t"))} = ${frac(n(W), n(t))} ${ap(Pout)} W.`,
          `Efficiency η = ${frac(S("P", "out"), S("P", "in"))}, and η = ${n(eta)}% = ${n(e)}. So ${S("P", "in")} = ${frac(S("P", "out"), "η")} = ${frac(n(Pout, 4), n(e))} ${ap(Pin)} W ${ap(Pk)} kW.`,
        ],
        ...num(Pk, "kW", 2), vals: { W, Pout, e, Pin, Pk }, params: { kind: "power", m, h, t, eta }, consts: [100],
      };
    }),

    // ---- P.5 Momentum & impulse --------------------------------------------------------------------
    "P.5": def("Momentum and impulse", (r, level) => {
      const kv = (k, s) => (k === 1 ? s : `${n(k)}${s}`);
      if (level === 1) {
        for (;;) {
          const [ball, mg] = r.pick([["tennis ball", 57], ["golf ball", 46], ["baseball", 145], ["soccer ball", 430], ["hockey puck", 170], ["volleyball", 270]]);
          const v = r.int(10, 50), dt = r.int(1, 10), F = (v * mg) / dt;
          if (!Number.isInteger(F) || F < 50 || F > 5000) continue;
          const dts = dt / 1000, mkg = mg / 1000, J = F * dts;
          return {
            prompt: `A ${ball} (mass ${n(mg)} g) is at rest when it is struck; the average force on it is ${n(F)} N, acting for ${n(dt)} ms. How fast does it move afterward, in m/s?`,
            steps: [
              `Impulse–momentum theorem: ${S("F", "avg")}Δ${V("t")} = Δ${V("p")} = ${V("m")}${V("v")} − 0, since it starts at rest.`,
              `SI units: Δ${V("t")} = ${n(dt)} ms = ${n(dts)} s and ${V("m")} = ${n(mg)} g = ${n(mkg)} kg.`,
              `Impulse: ${n(F)} · ${n(dts)} = ${n(J)} N·s.`,
              `${V("v")} = ${frac(n(J), n(mkg))} = ${n(v)} m/s.`,
            ],
            ...num(v, "m/s"), vals: { dts, mkg, J, v }, params: { mg, F, dt }, consts: [1000],
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const m1 = r.int(1, 6), m2 = r.int(1, 6), v1 = r.int(1, 6), v2 = r.int(-6, 4);
          if (v2 >= v1) continue;
          const p1 = m1 * v1, p2 = m2 * v2, p = p1 + p2, mt = m1 + m2, vf = new Frac(p, mt);
          if (p === 0 || 100 % vf.d !== 0) continue;
          const other = v2 === 0 ? "at rest" : v2 > 0 ? `moving right at ${n(v2)} m/s` : `moving left at ${n(-v2)} m/s`;
          return {
            prompt: `On a level, frictionless track, a ${n(m1)} kg cart moving right at ${n(v1)} m/s runs into a ${n(m2)} kg cart ${other}. They couple together. Find their common velocity just after the collision, in m/s (positive means to the right).`,
            steps: [
              `Take right as positive: ${S("v", 1)} = ${n(v1)} m/s and ${S("v", 2)} = ${n(v2)} m/s.`,
              `No external horizontal force acts, so momentum is conserved. Total momentum before: ${S("m", 1)}${S("v", 1)} + ${S("m", 2)}${S("v", 2)} = ${n(m1)} · ${n(v1)} + ${n(m2)} · ${np(v2)} = ${n(p1)} + ${np(p2)} = ${n(p)} kg·m/s.`,
              `They move together afterward: (${S("m", 1)} + ${S("m", 2)})${V("v")}′ = ${n(p)}, so ${V("v")}′ = ${frac(n(p), `${n(m1)} + ${n(m2)}`)} = ${frac(n(p), n(mt))} = ${qs(vf)} m/s.`,
              `The ${vf.n > 0 ? "positive" : "negative"} sign means the coupled carts move ${vf.n > 0 ? "right" : "left"}.`,
            ],
            ...numF(vf, "m/s"), vals: { p1, p2, p, mt, vf: fv(vf) }, params: { m1, m2, v1, v2 },
          };
        }
      }
      // level 3: an elastic collision, or impulse from a force–time graph
      if (r.chance(0.5)) {
        for (;;) {
          const m1 = r.int(1, 5), m2 = r.int(1, 5), v1 = r.int(2, 8), v2 = r.pick([0, 0, -1, -2, -3, -4]);
          if (m1 === m2) continue;
          const mt = m1 + m2, p = m1 * v1 + m2 * v2, dv = v1 - v2, m2dv = m2 * dv, rhs = p - m2dv;
          const v1f = new Frac(rhs, mt), v2f = v1f.add(dv);
          if (100 % v1f.d !== 0) continue;
          const KE = (m1 * v1 * v1 + m2 * v2 * v2) / 2;
          const s1 = S("v", 1), s2 = S("v", 2);
          return {
            prompt: `On a frictionless air track, a ${n(m1)} kg glider moving right at ${n(v1)} m/s collides elastically with a ${n(m2)} kg glider ${v2 === 0 ? "at rest" : `moving left at ${n(-v2)} m/s`}. Find the velocities of the first and the second glider after the collision, in m/s (positive means to the right), in that order.`,
            steps: [
              `Take right as positive. Momentum is conserved: ${S("m", 1)}${s1} + ${S("m", 2)}${s2} = ${n(m1)} · ${n(v1)} + ${n(m2)} · ${np(v2)} = ${n(p)} kg·m/s, so ${kv(m1, `${s1}′`)} + ${kv(m2, `${s2}′`)} = ${n(p)}.`,
              `In a one-dimensional elastic collision the relative velocity reverses: ${s1}′ − ${s2}′ = −(${s1} − ${s2}), so ${s2}′ = ${s1}′ + (${n(v1)} − ${np(v2)}) = ${s1}′ + ${n(dv)}.`,
              `Substitute into the momentum equation: ${kv(m1, `${s1}′`)} + ${n(m2)}(${s1}′ + ${n(dv)}) = ${n(p)}, so ${n(mt)}${s1}′ = ${n(p)} − ${n(m2dv)} = ${n(rhs)} and ${s1}′ = ${frac(n(rhs), n(mt))} = ${qs(v1f)} m/s.`,
              `Then ${s2}′ = ${qs(v1f)} + ${n(dv)} = ${qs(v2f)} m/s.`,
              `Check: the kinetic energy is ${n(KE)} J both before and after (${H} · ${n(m1)} · ${np(v1f.value)}² + ${H} · ${n(m2)} · ${np(v2f.value)}² = ${n(KE)} J), as an elastic collision requires.`,
            ],
            answer: { kind: "numbers", values: [v1f.value, v2f.value], ordered: true },
            answerText: `${s1}′ = ${qs(v1f)} m/s, ${s2}′ = ${qs(v2f)} m/s`, answerInput: `${qt(v1f)}, ${qt(v2f)}`,
            vals: { p, dv, m2dv, rhs, mt, v1f: fv(v1f), v2f: fv(v2f), KE }, params: { kind: "elastic", m1, m2, v1, v2 },
          };
        }
      }
      const Fm = 2 * r.int(2, 8), t1 = r.int(1, 3), w = r.int(0, 3), b = r.int(1, 3), t2 = t1 + w, t3 = t2 + b;
      const m = r.pick([2, 4, 5, 8]), u = r.int(0, 3);
      const ar = trapAreas(t1, t2, t3, Fm, "N", "s", "N·s", "impulse");
      const J = ar.vals.tot, dv = J / m, v = u + dv;
      return {
        prompt: `A ${n(m)} kg cart ${u === 0 ? "is at rest" : `rolls at ${n(u)} m/s`} on a level, frictionless track when a push ${u === 0 ? "" : "along its direction of motion "}acts on it; the graph shows the force against time. What is the cart's speed after the push, in m/s?`,
        graph: trapGraph(t1, t2, t3, Fm, "t (s)", "F (N)"),
        steps: [
          `The impulse of a force is the area under its ${V("F")}–${V("t")} graph.`,
          ...ar.steps,
          `Impulse–momentum theorem: ${V("J")} = ${V("m")}(${V("v")} − ${V("u")}), so ${V("v")} = ${V("u")} + ${frac(V("J"), V("m"))} = ${n(u)} + ${frac(n(J), n(m))} = ${n(u)} + ${n(dv)} = ${n(v)} m/s.`,
        ],
        ...num(v, "m/s"), vals: Object.assign({}, ar.vals, { dv, v }), params: { kind: "graph", t1, t2, t3, Fm, m, u },
      };
    }),

    // ---- P.6 Circular motion & gravitation --------------------------------------------------------------
    "P.6": def("Circular motion and gravitation", (r, level) => {
      const v_ = V("v"), r_ = V("r"), m_ = V("m");
      const Gtxt = () => `${V("G")} = ${sciC("6.674", -11)} N·m²/kg²`;
      if (level === 1) {
        if (r.chance(0.5)) {
          const v = r.int(5, 30), rr = r.pick([20, 25, 40, 50, 80, 100, 125, 200, 250]), v2 = v * v, a = v2 / rr;
          return {
            prompt: `A car drives around a circular track of radius ${n(rr)} m at a steady ${n(v)} m/s. What is its centripetal acceleration, in m/s²?`,
            steps: [
              `Even at constant speed the direction of motion keeps changing, so there is an acceleration toward the center: ${S("a", "c")} = ${frac(`${v_}²`, r_)}.`,
              `${S("a", "c")} = ${frac(`${n(v)}²`, n(rr))} = ${frac(n(v2), n(rr))} = ${n(a)} m/s².`,
            ],
            ...num(a, "m/s²"), vals: { v2, a }, params: { kind: "a", v, rr },
          };
        }
        for (;;) {
          const m = r.int(20, 50), rr = r.pick([1, 1.5, 2, 2.5, 3]), v = r.int(1, 3), v2 = v * v;
          const Fq = new Frac(m * v2 * 2, Math.round(rr * 2));
          if (100 % Fq.d !== 0) continue;
          const mv2 = m * v2, Fc = Fq.value;
          return {
            prompt: `A ${n(m)} kg child rides near the edge of a merry-go-round, ${n(rr)} m from its center, moving at ${n(v)} m/s. What net inward (centripetal) force must act on the child, in newtons?`,
            steps: [
              `Moving in a circle requires a net force toward the center (here supplied by friction and the child's grip): ${S("F", "c")} = ${frac(`${m_}${v_}²`, r_)}.`,
              `${S("F", "c")} = ${frac(`${n(m)} · ${n(v)}²`, n(rr))} = ${frac(n(mv2), n(rr))} = ${n(Fc)} N.`,
            ],
            ...num(Fc, "N"), vals: { mv2, Fc }, params: { kind: "F", m, rr, v },
          };
        }
      }
      if (level === 2) {
        if (r.chance(0.5)) {
          const mu = r.int(3, 9) / 10, rr = 10 * r.int(2, 20), prod = mu * g * rr, v = Math.sqrt(prod);
          const mus = S("μ", "s");
          return {
            prompt: `A car rounds a flat (unbanked) curve of radius ${n(rr)} m. The coefficient of static friction between its tires and the road is ${n(mu)}. What is the highest speed at which it can take the curve without skidding, in m/s? Take ${gTxt()}. ${rnd(2)}`,
            steps: [
              `On a flat curve static friction is the only horizontal force, so it supplies the centripetal force: ${S("f", "s")} = ${frac(`${m_}${v_}²`, r_)}.`,
              `At the top speed friction is at its maximum, ${S("f", "s")} = ${mus}${V("N")} = ${mus}${m_}${V("g")} (on level ground the normal force equals the weight). So ${mus}${m_}${V("g")} = ${frac(`${m_}${v_}²`, r_)}, and the mass cancels: ${v_} = ${M.sqrt(`${mus}${V("g")}${r_}`)}.`,
              `${v_} = ${M.sqrt(`${n(mu)} · ${c(9.81)} · ${n(rr)}`)} = ${M.sqrt(n(prod))} ${ap(v)} m/s.`,
            ],
            ...num(v, "m/s", 2), vals: { prod, v }, params: { kind: "curve", mu, rr },
          };
        }
        const m = r.int(2, 20) / 10, rr = r.pick([0.5, 0.6, 0.8, 1, 1.2, 1.5]), v = r.int(2, 8);
        const W = m * g, Fc = (m * v * v) / rr, T = W + Fc;
        return {
          prompt: `A ${n(m)} kg ball on a string is whirled in a vertical circle of radius ${n(rr)} m. At the lowest point it moves at ${n(v)} m/s. What is the tension in the string there, in newtons? Take ${gTxt()}. ${rnd(2)}`,
          steps: [
            `At the lowest point the center of the circle is straight up. The tension ${V("T")} pulls up and the weight ${m_}${V("g")} pulls down; their difference is the centripetal force: ${V("T")} − ${m_}${V("g")} = ${frac(`${m_}${v_}²`, r_)}.`,
            `Weight: ${m_}${V("g")} = ${n(m)} · ${c(9.81)} = ${n(W)} N. Centripetal force: ${frac(`${m_}${v_}²`, r_)} = ${frac(`${n(m)} · ${n(v)}²`, n(rr))} ${ap(Fc)} N.`,
            `${V("T")} = ${n(W)} + ${n(Fc, 4)} ${ap(T)} N.`,
          ],
          ...num(T, "N", 2), vals: { W, Fc, T }, params: { kind: "loop", m, rr, v },
        };
      }
      // level 3: surface gravity of a planet, or a satellite's speed or period
      if (r.chance(0.5)) {
        for (;;) {
          const a = r.int(10, 99) / 10, e = r.int(22, 25), Rkm = 100 * r.int(10, 700);
          const Mp = a * Math.pow(10, e), R = Rkm * 1000, rho = Mp / ((4 / 3) * Math.PI * R ** 3), gg = (6.674e-11 * Mp) / (R * R);
          if (rho < 700 || rho > 12000 || gg < 0.5 || gg > 30) continue;
          const vals = { gg };
          const Rs = sci(vals, "R", R), R2s = sci(vals, "R2", R * R), GMs = sci(vals, "GM", 6.674e-11 * Mp);
          return {
            prompt: `A planet has a mass of ${n(a)} × 10<sup>${n(e)}</sup> kg and a radius of ${n(Rkm)} km. What is the gravitational acceleration at its surface, in m/s²? Use ${Gtxt()}. ${rnd(2)}`,
            steps: [
              `At the surface an object's weight is the gravitational force on it (Newton's law of gravitation): ${m_}${V("g")} = ${frac(`${V("G")}${V("M")}${m_}`, `${V("R")}²`)}, so ${V("g")} = ${frac(`${V("G")}${V("M")}`, `${V("R")}²`)}.`,
              `In SI units ${V("R")} = ${n(Rkm)} km = ${Rs} m, so ${V("R")}² ≈ ${R2s} m².`,
              `${V("G")}${V("M")} = ${sciC("6.674", -11)} · ${n(a)} × 10<sup>${n(e)}</sup> ≈ ${GMs} m³/s².`,
              `${V("g")} = ${frac(GMs, R2s)} ${ap(gg)} m/s².`,
            ],
            ...num(gg, "m/s²", 2), vals, params: { kind: "surface", a, e, Rkm },
          };
        }
      }
      const kind = r.pick(["v", "T"]), h = 50 * r.int(4, 40);
      const rkm = 6371 + h, R = rkm * 1000, GM = 6.674e-11 * 5.972e24, v = Math.sqrt(GM / R), vk = v / 1000;
      const vals = { rkm, v, vk };
      const Rs = sci(vals, "r", R), GMs = sci(vals, "GM", GM);
      const steps = [
        `Gravity supplies the centripetal force: ${frac(`${V("G")}${V("M")}${m_}`, `${r_}²`)} = ${frac(`${m_}${v_}²`, r_)}, so ${v_} = ${M.sqrt(frac(`${V("G")}${V("M")}`, r_))}, whatever the satellite's mass.`,
        `The orbit radius is measured from Earth's center: ${r_} = ${c(6371)} + ${n(h)} = ${n(rkm)} km = ${Rs} m.`,
        `${V("G")}${V("M")} = ${sciC("6.674", -11)} · ${sciC("5.972", 24)} ≈ ${GMs} m³/s².`,
        `${v_} = ${M.sqrt(frac(GMs, Rs))} ${ap(v, 1)} m/s ${ap(vk, 4)} km/s.`,
      ];
      let ans;
      if (kind === "T") {
        const Ts = (2 * Math.PI * R) / v, Tmin = Ts / 60;
        steps.push(`One lap is the circumference 2π${r_}: ${V("T")} = ${frac(`2π${r_}`, v_)} = ${frac(`2π · ${Rs}`, n(v, 1))} ${ap(Ts, 1)} s, and dividing by ${c(60)}: ${V("T")} ${ap(Tmin, 3)} min.`);
        Object.assign(vals, { Ts, Tmin });
        ans = num(Tmin, "min", 1);
      } else ans = num(vk, "km/s", 2);
      return {
        prompt: `A satellite circles Earth at an altitude of ${n(h)} km. Find its orbital ${kind === "v" ? "speed, in km/s" : "period, in minutes"}. Use ${Gtxt()}, Earth's mass ${sciC("5.972", 24)} kg and Earth's radius ${c(6371)} km. ${rnd(kind === "v" ? 2 : 1)}`,
        steps, ...ans, vals, params: { kind, h },
      };
    }),

    // ---- P.orbits Orbits, escape velocity & Kepler's laws --------------------------------------------------
    "P.orbits": def("Orbits, escape velocity and Kepler's laws", (r, level) => {
      const sq2 = (s) => M.sup(`(${s})`, 2);
      if (level === 1) {
        const law = `Gravity's field strength falls with the inverse square of the distance from Earth's center: ${V("g")}(${V("r")}) = ${V("g")}${sq2(frac(V("R"), V("r")))}, with ${V("R")} Earth's radius.`;
        if (r.chance(0.5)) {
          const k = r.int(2, 5), k2 = k * k, gr = g / k2, alt = k - 1;
          return {
            prompt: `A space probe is ${n(k)} Earth radii from Earth's center, that is, ${alt === 1 ? "one Earth radius" : `${n(alt)} Earth radii`} above the surface. What is the gravitational field strength there, in m/s²? Take ${gTxt()} at the surface. ${rnd(2)}`,
            steps: [
              law,
              `Here ${V("r")} = ${n(k)}${V("R")}, so ${sq2(frac(V("R"), V("r")))} = ${frac("1", `${n(k)}²`)} = ${frac("1", n(k2))}.`,
              `${V("g")}(${V("r")}) = ${frac(c(9.81), n(k2))} ${ap(gr)} m/s².`,
            ],
            ...num(gr, "m/s²", 2), vals: alt === 1 ? { k2, gr } : { alt, k2, gr }, params: { kind: "k", k },
          };
        }
        const [what, h] = r.pick([["The International Space Station", 400], ["A weather satellite", 850], ["A navigation (GPS) satellite", 20200], ["A geostationary satellite", 35786], ["A spy satellite", 300], ["An Earth-imaging satellite", 700]]);
        const rkm = 6371 + h, ratio = 6371 / rkm, ratio2 = ratio * ratio, gr = g * ratio2;
        return {
          prompt: `${what} orbits ${n(h)} km above Earth's surface. What is the gravitational field strength at that altitude, in m/s²? Take ${gTxt()} at the surface and Earth's radius as ${c(6371)} km. ${rnd(2)}`,
          steps: [
            law,
            `Distance from the center: ${V("r")} = ${V("R")} + ${V("h")} = ${c(6371)} + ${n(h)} = ${n(rkm)} km.`,
            `${frac(V("R"), V("r"))} = ${frac(c(6371), n(rkm))} ${ap(ratio)}, and squared ${ap(ratio2)}.`,
            `${V("g")}(${V("r")}) = ${c(9.81)} · ${n(ratio2, 4)} ${ap(gr)} m/s².`,
          ],
          ...num(gr, "m/s²", 2), vals: { rkm, ratio, ratio2, gr }, params: { kind: "h", h },
        };
      }
      if (level === 2) {
        for (;;) {
          const a = r.int(10, 99) / 10, e = r.int(22, 25), Rkm = 100 * r.int(10, 150);
          const Mp = a * Math.pow(10, e), R = Rkm * 1000, rho = Mp / ((4 / 3) * Math.PI * R ** 3);
          const twoGM = 2 * 6.674e-11 * Mp, ratio = twoGM / R, v = Math.sqrt(ratio), vk = v / 1000;
          if (rho < 700 || rho > 12000 || vk < 1 || vk > 20) continue;
          const vals = { v, vk };
          const twoGMs = sci(vals, "twoGM", twoGM), Rs = sci(vals, "R", R), rs = sci(vals, "ratio", ratio, 4);
          return {
            prompt: `A planet has a mass of ${n(a)} × 10<sup>${n(e)}</sup> kg and a radius of ${n(Rkm)} km. What is the escape speed from its surface, in km/s? Use ${V("G")} = ${sciC("6.674", -11)} N·m²/kg². ${rnd(2)}`,
            steps: [
              `Just escaping means the total energy is zero: the object ends at rest infinitely far away, where both kinetic and potential energy vanish. So ${H}${V("m")}${V("v")}² − ${frac(`${V("G")}${V("M")}${V("m")}`, V("R"))} = 0, which gives ${V("v")} = ${M.sqrt(frac(`2${V("G")}${V("M")}`, V("R")))}.`,
              `2${V("G")}${V("M")} = 2 · ${sciC("6.674", -11)} · ${n(a)} × 10<sup>${n(e)}</sup> ≈ ${twoGMs} m³/s², and ${V("R")} = ${n(Rkm)} km = ${Rs} m.`,
              `${frac(`2${V("G")}${V("M")}`, V("R"))} ≈ ${rs} m²/s², so ${V("v")} ${ap(v, 1)} m/s ${ap(vk, 4)} km/s.`,
            ],
            ...num(vk, "km/s", 2), vals, params: { a, e, Rkm },
          };
        }
      }
      // level 3: Kepler's third law, by hand
      if (r.chance(0.5)) {
        const sqa = r.pick([0.5, 0.8, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6]), a = P.round(sqa * sqa, 4), T = P.round(sqa * sqa * sqa, 4);
        const obj = r.pick(["An asteroid", "A comet", "A dwarf planet"]);
        return {
          prompt: `${obj} orbits the Sun on an ellipse with a semi-major axis of ${n(a)} AU. What is its orbital period, in years? Compare with Earth, which has ${V("a")} = 1 AU and ${V("T")} = 1 year.`,
          steps: [
            `Kepler's third law: ${V("T")}² = ${frac(`${c(4)}π²`, `${V("G")}${V("M")}`)}${V("a")}³. The factor is the same for every body orbiting the Sun, and Earth (${V("a")} = 1 AU, ${V("T")} = 1 year) shows it equals 1 in these units: ${V("T")}² = ${V("a")}³.`,
            `So ${V("T")} = ${M.sup(V("a"), `${c(3)}/2`)} = ${M.sup(`(${M.sqrt(V("a"))})`, c(3))} = ${M.sup(`(${M.sqrt(n(a))})`, c(3))} = ${M.sup(n(sqa), c(3))} = ${n(T)} years.`,
          ],
          ...num(T, "years"), vals: { sqa, T }, params: { kind: "sun", a },
        };
      }
      const [rn, rd] = r.pick([[4, 1], [9, 1], [1, 4], [1, 9], [9, 4], [4, 9], [16, 9], [9, 16], [16, 1], [25, 4]]);
      const ratio = new Frac(rn, rd), s = new Frac(Math.round(Math.sqrt(rn)), Math.round(Math.sqrt(rd))), s3 = s.pow(3);
      const u = r.int(1, 10), a1k = rd * u * 10, a2k = rn * u * 10;  // thousands of km
      const aA = a1k * 1000, aB = a2k * 1000;
      const T1 = r.int(1, 20), T2 = s3.mul(T1);
      const sr = (x) => `(${x})`;
      return {
        prompt: `Two moons orbit the same planet. Moon A has an orbital radius of ${n(aA)} km and a period of ${n(T1)} days; moon B orbits at ${n(aB)} km. What is moon B's period, in days?`,
        steps: [
          `Kepler's third law with the same central mass: ${V("T")}² ∝ ${V("a")}³, so ${M.sup(sr(frac(S("T", "B"), S("T", "A"))), 2)} = ${M.sup(sr(frac(S("a", "B"), S("a", "A"))), c(3))}.`,
          `${frac(S("a", "B"), S("a", "A"))} = ${frac(n(aB), n(aA))} = ${M.f(ratio)}, so ${frac(S("T", "B"), S("T", "A"))} = ${M.sup(sr(M.f(ratio)), `${c(3)}/2`)} = ${M.sup(sr(M.sqrt(M.f(ratio))), c(3))} = ${M.sup(sr(M.f(s)), c(3))} = ${M.f(s3)}.`,
          `${S("T", "B")} = ${n(T1)} · ${M.f(s3)} = ${qs(T2)}${term(T2) ? "" : ` ≈ ${n(T2.value, 2)}`} days.`,
        ],
        ...numF(T2, "days"), vals: { ratio: fv(ratio), s: fv(s), s3: fv(s3), T2: fv(T2) }, params: { kind: "moons", aA, aB, T1 },
      };
    }),

    // ---- P.rot-kinematics Rotational kinematics --------------------------------------------------------
    "P.rot-kinematics": def("Rotational kinematics", (r, level) => {
      const w_ = "ω", al = "α";
      if (level === 1) {
        if (r.chance(0.5)) {
          const [dev, rpm] = r.pick([["A record turntable", 45], ["A ceiling fan", r.pick([90, 120, 150, 180, 240])], ["A washing-machine drum", r.pick([600, 900, 1200])], ["A car engine", r.pick([1800, 3000, 3600])], ["A hard-disk platter", 7200], ["A potter's wheel", r.pick([60, 90, 120, 150])]]);
          const k = new Frac(rpm, 30), w = k.value * Math.PI;
          const kpi = k.d === 1 ? (k.n === 1 ? "π" : `${n(k.n)}π`) : frac(k.n === 1 ? "π" : `${n(k.n)}π`, n(k.d));
          return {
            prompt: `${dev} spins at ${n(rpm)} revolutions per minute (rpm). What is its angular velocity, in rad/s? Give the exact value in terms of π.`,
            steps: [
              `One revolution is 2π rad and one minute is ${c(60)} s, so ${w_} = ${frac(`2π · rpm`, c(60))}.`,
              `${w_} = ${frac(`2π · ${n(rpm)}`, c(60))} = ${kpi} rad/s ${ap(w, 2)} rad/s.`,
            ],
            answer: { kind: "number", value: w }, answerText: `${kpi} rad/s`,
            answerInput: k.d === 1 ? `${k.n === 1 ? "" : k.n}pi` : `${k.n === 1 ? "" : k.n}pi/${k.d}`,
            vals: { k: fv(k), w }, params: { kind: "rpm", rpm },
          };
        }
        const rc = r.int(5, 50), w = r.int(2, 30), rm = rc / 100, v = rm * w;
        return {
          prompt: `A wheel spins at ${n(w)} rad/s. How fast is a point ${n(rc)} cm from the axle moving, in m/s?`,
          steps: [
            `Convert the radius: ${n(rc)} cm = ${n(rm)} m.`,
            `A point at radius ${V("r")} moves along its circle with speed ${S("v", "t")} = ${V("r")}${w_} = ${n(rm)} · ${n(w)} = ${n(v)} m/s.`,
          ],
          ...num(v, "m/s"), vals: { rm, v }, params: { kind: "v", rc, w },
        };
      }
      if (level === 2) {
        const w0 = r.int(10, 60), a = r.pick([1, 2, 2.5, 4, 5]), sq = w0 * w0, twoA = 2 * a, th = sq / twoA, rev = th / (2 * Math.PI);
        return {
          prompt: `A grinding wheel spinning at ${n(w0)} rad/s is switched off and slows down with a constant angular deceleration of ${n(a)} rad/s². How many revolutions does it make before it stops? ${rnd(1)}`,
          steps: [
            `Take the spin direction as positive: slowing down means ${al} = −${n(a)} rad/s², and the final angular velocity is ${w_} = 0.`,
            `We want the angle and do not know the time, so use the rotational timeless equation ${w_}² = ${S("ω", "0")}² + 2${al}Δθ.`,
            `0 = ${n(w0)}² − 2 · ${n(a)} · Δθ, so Δθ = ${frac(`${n(w0)}²`, `2 · ${n(a)}`)} = ${frac(n(sq), n(twoA))} = ${n(th)} rad.`,
            `One revolution is 2π rad: ${frac(n(th), "2π")} ${ap(rev)} revolutions.`,
          ],
          ...num(rev, "revolutions", 1), vals: { sq, twoA, th, rev }, params: { w0, a },
        };
      }
      // level 3: read an ω–t graph
      const kind = r.pick(["rev", "alpha"]);
      const Y = 2 * r.int(2, 10), t1 = r.int(2, 6), w = r.int(2, 8), b = r.int(2, 6), t2 = t1 + w, t3 = t2 + b;
      const gph = trapGraph(t1, t2, t3, Y, "t (s)", "ω (rad/s)");
      if (kind === "rev") {
        const ar = trapAreas(t1, t2, t3, Y, "rad/s", "s", "rad", "angle");
        const rev = ar.vals.tot / (2 * Math.PI);
        return {
          prompt: `The graph shows the angular velocity of a centrifuge rotor as it spins up, runs steadily and stops. How many revolutions does it make in the ${n(t3)} s shown? ${rnd(1)}`,
          graph: gph,
          steps: [`The angle turned is the area under the ω–${V("t")} graph (just as displacement is the area under a ${V("v")}–${V("t")} graph).`, ...ar.steps, `One revolution is 2π rad: ${frac(n(ar.vals.tot), "2π")} ${ap(rev)} revolutions.`],
          ...num(rev, "revolutions", 1), vals: Object.assign({}, ar.vals, { rev }), params: { kind, t1, t2, t3, Y },
        };
      }
      const phase = r.pick(["up", "down"]);
      const acc = phase === "up" ? new Frac(Y, t1) : new Frac(-Y, b);
      const steps = [`Angular acceleration is the slope of the ω–${V("t")} graph.`];
      if (phase === "up") steps.push(`While spinning up, the line runs from (0, 0) to (${n(t1)}, ${n(Y)}): slope = ${frac(`${n(Y)} − 0`, `${n(t1)} − 0`)} = ${qs(acc)} rad/s².`);
      else steps.push(`While stopping, the line runs from (${n(t2)}, ${n(Y)}) to (${n(t3)}, 0): slope = ${frac(`0 − ${n(Y)}`, `${n(t3)} − ${n(t2)}`)} = ${frac(`−${n(Y)}`, n(b))} = ${qs(acc)} rad/s². The negative sign means it is slowing down.`);
      return {
        prompt: `The graph shows the angular velocity of a centrifuge rotor as it spins up, runs steadily and stops. What is its angular acceleration while it is ${phase === "up" ? "spinning up" : "stopping"}, in rad/s²?`,
        graph: gph, steps, ...numF(acc, "rad/s²"), vals: phase === "up" ? { acc: fv(acc) } : { b, acc: fv(acc) }, params: { kind, phase, t1, t2, t3, Y },
      };
    }),

    // ---- P.torque Torque & static equilibrium ------------------------------------------------------------
    "P.torque": def("Torque and static equilibrium", (r, level) => {
      const tau = "τ";
      if (level === 1) {
        const rr = r.pick([0.2, 0.25, 0.3, 0.4, 0.5]), F = 10 * r.int(2, 20), phi = r.pick([90, 30, 150]);
        const sinv = phi === 90 ? 1 : 0.5, T = rr * F * sinv;
        const L = 3, ang = rad(phi);
        return {
          prompt: `A mechanic pulls on the end of a wrench ${n(rr)} m long with a force of ${n(F)} N directed at ${n(phi)}° to the line of the wrench${phi === 90 ? " (at right angles to it)" : ""}. What torque does the force exert about the bolt, in N·m?`,
          graph: graph({
            view: [-0.8, 5.2, -1.2, 2.2], equal: true, axes: false, grid: false,
            items: [
              { t: "seg", a: [0, 0], b: [L, 0], label: "r", role: "secondary" },
              { t: "pt", x: 0, y: 0, label: "bolt" },
              { t: "vec", a: [L, 0], b: [r4(L + 1.6 * Math.cos(ang)), r4(1.6 * Math.sin(ang))], label: "F", role: "primary" },
              { t: "seg", a: [L, 0], b: [L + 1.2, 0], dash: true, role: "muted" },
              { t: "text", x: r4(L + 0.55 * Math.cos(ang / 2)), y: r4(0.55 * Math.sin(ang / 2)), s: "φ" },
            ],
          }),
          steps: [
            `Torque is ${tau} = ${V("r")}${V("F")} sin φ, where ${V("r")} runs from the bolt to the point where the force acts and φ is the angle between ${V("r")} and the force. Only the part of the force perpendicular to the wrench turns it.`,
            `Here φ = ${n(phi)}°, so sin φ = ${n(sinv)}.`,
            `${tau} = ${n(rr)} · ${n(F)} · ${n(sinv)} = ${n(T)} N·m.`,
          ],
          ...num(T, "N·m"), vals: { sinv, T }, params: { rr, F, phi },
        };
      }
      if (level === 2) {
        for (;;) {
          const kind = r.pick(["d", "m"]);
          const m1 = r.int(20, 60), d1 = 0.5 * r.int(1, 5), prod = m1 * d1;
          let m2, d2;
          if (kind === "d") { m2 = r.int(20, 60); d2 = prod / m2; if (m2 === m1 || d2 > 3 || !isExact(d2, 2)) continue; }
          else { d2 = 0.5 * r.int(1, 6); m2 = prod / d2; if (d2 === d1 || m2 < 15 || m2 > 80 || !isExact(m2, 1)) continue; }
          const blk = (x, lab) => ({ t: "poly", p: [[x - 0.25, 0.3], [x + 0.25, 0.3], [x + 0.25, 0.8], [x - 0.25, 0.8]], label: lab, role: "secondary" });
          const items = [
            { t: "seg", a: [-3, 0.3], b: [3, 0.3], role: "muted" },
            { t: "poly", p: [[-0.3, 0], [0.3, 0], [0, 0.3]], role: "muted" },
            blk(-d1, "m₁"),
            { t: "seg", a: [-d1, -0.2], b: [0, -0.2], label: "d₁", dash: true },
          ];
          if (kind === "m") items.push(blk(d2, "m₂"), { t: "seg", a: [0, -0.2], b: [d2, -0.2], label: "d₂", dash: true });
          return {
            prompt: kind === "d"
              ? `A ${n(m1)} kg child sits ${n(d1)} m from the pivot of a seesaw whose plank is balanced at its center. How far from the pivot, on the other side, must a ${n(m2)} kg child sit for the seesaw to balance, in meters?`
              : `A ${n(m1)} kg child sits ${n(d1)} m from the pivot of a seesaw whose plank is balanced at its center. A second child sits ${n(d2)} m from the pivot on the other side, and the seesaw balances. What is the second child's mass, in kilograms?`,
            graph: graph({ view: [-3.3, 3.3, -0.8, 1.4], equal: true, axes: false, grid: false, items }),
            steps: [
              `The plank's own weight acts at the pivot, so it has no torque. Rotational equilibrium about the pivot: the counter-clockwise torque equals the clockwise torque, ${S("m", 1)}${V("g")}${S("d", 1)} = ${S("m", 2)}${V("g")}${S("d", 2)}.`,
              kind === "d"
                ? `${V("g")} cancels: ${S("d", 2)} = ${frac(`${S("m", 1)}${S("d", 1)}`, S("m", 2))} = ${frac(`${n(m1)} · ${n(d1)}`, n(m2))} = ${frac(n(prod), n(m2))} = ${n(d2)} m.`
                : `${V("g")} cancels: ${S("m", 2)} = ${frac(`${S("m", 1)}${S("d", 1)}`, S("d", 2))} = ${frac(`${n(m1)} · ${n(d1)}`, n(d2))} = ${frac(n(prod), n(d2))} = ${n(m2)} kg.`,
            ],
            ...num(kind === "d" ? d2 : m2, kind === "d" ? "m" : "kg"), vals: kind === "d" ? { prod, d2 } : { prod, m2 },
            params: kind === "d" ? { kind, m1, d1, m2 } : { kind, m1, d1, d2 },
          };
        }
      }
      // level 3: a plank on two supports
      for (;;) {
        const Lp = r.pick([2, 3, 4, 5, 6]), Wp = 20 * r.int(5, 20), W = 50 * r.int(6, 18), x = 0.5 * r.int(1, 2 * Lp - 1);
        if (x === Lp / 2) continue;
        const half = Lp / 2, t1 = Wp * half, t2 = W * x, sum = t1 + t2, B = sum / Lp, tot = Wp + W, A = tot - B;
        if (!isExact(B, 2)) continue;
        const ask = r.pick(["A", "B"]);
        const steps = [
          `The plank is in equilibrium, so both the net force and the net torque are zero. Take torques about support A, so A's unknown force has no torque there (its lever arm is zero).`,
          `Clockwise torques about A: the plank's weight acts at its center, ${n(half)} m from A, giving ${n(Wp)} · ${n(half)} = ${n(t1)} N·m; the painter gives ${n(W)} · ${n(x)} = ${n(t2)} N·m. The only counter-clockwise torque is from B, ${V("B")} · ${n(Lp)}.`,
          `Στ = 0: ${V("B")} · ${n(Lp)} = ${n(t1)} + ${n(t2)} = ${n(sum)}, so ${V("B")} = ${frac(n(sum), n(Lp))} = ${n(B)} N.`,
        ];
        const vals = { half, t1, t2, sum, B };
        if (ask === "A") { steps.push(`The vertical forces balance: ${V("A")} + ${V("B")} = ${n(Wp)} + ${n(W)} = ${n(tot)} N, so ${V("A")} = ${n(tot)} − ${n(B)} = ${n(A)} N.`); Object.assign(vals, { tot, A }); }
        return {
          prompt: `A uniform plank ${n(Lp)} m long and weighing ${n(Wp)} N rests on two supports, A at its left end and B at its right end. A painter weighing ${n(W)} N stands ${n(x)} m from end A. Find the upward force from support ${ask}, in newtons.`,
          graph: graph({
            view: [-0.9, Lp + 0.9, -1.6, 1.7], equal: true, axes: false, grid: false,
            items: [
              { t: "poly", p: [[0, 0], [Lp, 0], [Lp, 0.15], [0, 0.15]], role: "muted" },
              { t: "poly", p: [[-0.2, -0.35], [0.2, -0.35], [0, 0]], role: "muted" },
              { t: "poly", p: [[Lp - 0.2, -0.35], [Lp + 0.2, -0.35], [Lp, 0]], role: "muted" },
              { t: "vec", a: [0, -1.4], b: [0, -0.4], label: "A", role: "primary" },
              { t: "vec", a: [Lp, -1.4], b: [Lp, -0.4], label: "B", role: "primary" },
              { t: "vec", a: [half, 0.15], b: [half, -0.9], label: "plank", role: "secondary" },
              { t: "vec", a: [x, 1.4], b: [x, 0.2], label: "painter", role: "secondary" },
            ],
          }),
          steps, ...num(ask === "A" ? A : B, "N"), vals, params: { ask, Lp, Wp, W, x },
        };
      }
    }),

    // ---- P.inertia Moment of inertia ---------------------------------------------------------------------
    "P.inertia": def("Moment of inertia", (r, level) => {
      const I_ = V("I");
      if (level === 1) {
        for (;;) {
          const k = r.int(2, 3), ms = [], rs = [];
          for (let i = 0; i < k; i++) { ms.push(0.5 * r.int(1, 10)); rs.push(0.1 * r.int(1, 15) * (i % 2 ? -1 : 1)); }
          const pos = rs.map((x) => P.round(x, 1));
          if (new Set(pos).size < k) continue;
          const sqs = pos.map((x) => P.round(x * x, 4)), ts = sqs.map((s2, i) => P.round(ms[i] * s2, 6)), I = P.round(ts.reduce((a, b) => a + b, 0), 6);
          const desc = pos.map((x, i) => `${n(ms[i])} kg at ${n(Math.abs(x))} m ${x < 0 ? "to the left of" : "to the right of"} O`);
          const vals = { I };
          sqs.forEach((s2, i) => { vals[`sq${i}`] = s2; vals[`t${i}`] = ts[i]; });
          const lo = Math.min(0, ...pos), hi = Math.max(0, ...pos);
          return {
            prompt: `Small balls are fixed to a light rod that spins about an axis through point O, perpendicular to the rod: ${desc.slice(0, -1).join(", ")} and ${desc[desc.length - 1]}. Find the moment of inertia about that axis, in kg·m².`,
            graph: graph({
              view: [lo - 0.3, hi + 0.3, -0.4, 0.4], equal: true, axes: false, grid: false,
              items: [{ t: "seg", a: [lo, 0], b: [hi, 0], role: "muted" }, { t: "pt", x: 0, y: 0, label: "O", role: "highlight" }]
                .concat(pos.map((x, i) => ({ t: "pt", x, y: 0, label: `${fmt(ms[i])} kg`, role: "primary" }))),
            }),
            steps: [
              `For point masses ${I_} = Σ${V("m")}${V("r")}², with each ${V("r")} the distance from the axis (the side does not matter, since it is squared).`,
              ...pos.map((x, i) => `${n(ms[i])} · ${n(Math.abs(x))}² = ${n(ms[i])} · ${n(sqs[i])} = ${n(ts[i])} kg·m².`),
              `${I_} = ${ts.map((t) => n(t)).join(" + ")} = ${n(I)} kg·m².`,
            ],
            ...num(I, "kg·m²"), vals, params: { ms, pos },
          };
        }
      }
      if (level === 2) {
        const shape = r.pick(["rod", "disk", "sphere"]);
        const Mk = r.int(1, 8);
        let Icm, dd, cq, Ltxt, prompt, cmTxt, len, end = 0;
        if (shape === "rod") {
          len = r.pick([1, 1.2, 1.5, 2, 2.4, 3]);
          end = r.chance(0.5) ? 1 : 0;
          dd = D(len).mul(end ? new Frac(1, 2) : new Frac(1, 4));
          cq = new Frac(1, 12); Icm = cq.mul(Mk).mul(D(len).pow(2));
          prompt = `A uniform rod of mass ${n(Mk)} kg and length ${n(len)} m rotates about an axis perpendicular to it through ${end ? "one end" : "a point a quarter of the way along it"}, which is ${qs(dd)} m from its center. Find its moment of inertia about this axis, in kg·m².`;
          cmTxt = `${frac("1", c(12))}${V("M")}${V("L")}² = ${frac("1", c(12))} · ${n(Mk)} · ${n(len)}²`;
          Ltxt = "a rod about its center";
        } else {
          len = r.pick([0.1, 0.2, 0.25, 0.3, 0.4, 0.5]);
          dd = D(len);
          cq = shape === "disk" ? new Frac(1, 2) : new Frac(2, 5); Icm = cq.mul(Mk).mul(D(len).pow(2));
          prompt = shape === "disk"
            ? `A uniform disk of mass ${n(Mk)} kg and radius ${n(len)} m spins about an axis perpendicular to its face through a point on its rim. Find its moment of inertia about this axis, in kg·m².`
            : `A solid sphere of mass ${n(Mk)} kg and radius ${n(len)} m spins about an axis tangent to its surface. Find its moment of inertia about this axis, in kg·m².`;
          cmTxt = `${M.f(cq)}${V("M")}${V("R")}² = ${M.f(cq)} · ${n(Mk)} · ${n(len)}²`;
          if (shape === "sphere") CONSTS.push(5);
          Ltxt = shape === "disk" ? "a disk about its central axis" : "a solid sphere about a diameter";
        }
        const Md2 = dd.pow(2).mul(Mk), I = Icm.add(Md2);
        return {
          prompt,
          steps: [
            `Start from the center-of-mass value for ${Ltxt}: ${S("I", "cm")} = ${cmTxt} = ${qs(Icm)} kg·m².`,
            `The axis is ${V("d")} = ${qs(dd)} m from the center of mass, so use the parallel-axis theorem: ${I_} = ${S("I", "cm")} + ${V("M")}${V("d")}². Here ${V("M")}${V("d")}² = ${n(Mk)} · ${qs(dd, true)}² = ${qs(Md2)} kg·m².`,
            `${I_} = ${qs(Icm)} + ${qs(Md2)} = ${qs(I)} kg·m².`,
          ],
          ...numF(I, "kg·m²"), vals: { dd: fv(dd), Icm: fv(Icm), Md2: fv(Md2), I: fv(I) }, params: { shape, M: Mk, len, end },
        };
      }
      // level 3: composite body, radius of gyration
      const Mk = r.int(1, 4), L = r.pick([0.5, 1, 1.5, 2]), m = 0.5 * r.int(1, 6), mid = r.chance(0.5), m2 = mid ? 0.5 * r.int(1, 4) : 0;
      const Icm = (Mk * L * L) / 12, half = L / 2, shift = Mk * half * half, Irod = Icm + shift, Im = m * L * L, Im2 = m2 * half * half;
      const I = Irod + Im + Im2, Mt = Mk + m + m2, Rg = Math.sqrt(I / Mt);
      const vals = { Icm, half, shift, Irod, Im, I, Mt, Rg };
      if (mid) vals.Im2 = Im2;
      return {
        prompt: `A uniform rod of mass ${n(Mk)} kg and length ${n(L)} m is pivoted at one end. A small ${n(m)} kg ball is fixed to its far end${mid ? ` and a small ${n(m2)} kg ball to its midpoint` : ""}. Find the radius of gyration of the whole object about the pivot, in meters. ${rnd(3)}`,
        steps: [
          `Rod about its end, by the parallel-axis theorem: ${S("I", "cm")} = ${frac("1", c(12))}${V("M")}${V("L")}² = ${frac(`${n(Mk)} · ${n(L)}²`, c(12))} ${ap(Icm)} kg·m², and the end is ${n(half)} m from the center, so ${S("I", "rod")} = ${n(Icm, 4)} + ${n(Mk)} · ${n(half)}² ${ap(Irod)} kg·m² (that is ${frac("1", c(3))}${V("M")}${V("L")}²).`,
          `Point masses add ${V("m")}${V("r")}²: the end ball ${n(m)} · ${n(L)}² = ${n(Im)} kg·m²${mid ? `; the middle ball ${n(m2)} · ${n(half)}² = ${n(Im2)} kg·m²` : ""}.`,
          `Total: ${V("I")} = ${n(Irod, 4)} + ${n(Im)}${mid ? ` + ${n(Im2)}` : ""} ${ap(I)} kg·m², and the total mass is ${n(Mk)} + ${n(m)}${mid ? ` + ${n(m2)}` : ""} = ${n(Mt)} kg.`,
          `The radius of gyration ${S("R", "g")} is where all the mass could sit to give the same ${V("I")}: ${V("I")} = ${V("M")}${S("R", "g")}², so ${S("R", "g")} = ${M.sqrt(frac(n(I, 4), n(Mt)))} ${ap(Rg)} m.`,
        ],
        ...num(Rg, "m", 3), vals, params: { M: Mk, L, m, m2 },
      };
    }),

    // ---- P.rot-dynamics Rotational dynamics & angular momentum ---------------------------------------------
    "P.rot-dynamics": def("Rotational dynamics and angular momentum", (r, level) => {
      const al = "α", tau = "τ";
      if (level === 1) {
        if (r.chance(0.5)) {
          for (;;) {
            const T = r.int(2, 60), I = r.pick([0.25, 0.5, 1, 2, 2.5, 4, 5, 8, 10, 20]), a = T / I;
            if (!isExact(a, 3)) continue;
            return {
              prompt: `A motor applies a net torque of ${n(T)} N·m to a flywheel whose moment of inertia is ${n(I)} kg·m². What is the flywheel's angular acceleration, in rad/s²?`,
              steps: [`Newton's second law for rotation: Σ${tau} = ${V("I")}${al}, so ${al} = ${frac(tau, V("I"))} = ${frac(n(T), n(I))} = ${n(a)} rad/s².`],
              ...num(a, "rad/s²"), vals: { a }, params: { kind: "direct", T, I },
            };
          }
        }
        for (;;) {
          const F = r.int(5, 50), Mk = r.int(2, 20), R = r.pick([0.1, 0.2, 0.25, 0.4, 0.5]);
          const T = F * R, I = 0.5 * Mk * R * R, a = T / I;
          if (!isExact(T, 2) || !isExact(I, 4) || !isExact(a, 2)) continue;
          return {
            prompt: `A rope wrapped around a uniform disk (mass ${n(Mk)} kg, radius ${n(R)} m) that turns on a fixed frictionless axle is pulled with a steady force of ${n(F)} N. What is the disk's angular acceleration, in rad/s²?`,
            steps: [
              `The rope pulls tangent to the rim, so its lever arm is the radius: ${tau} = ${V("F")}${V("R")} = ${n(F)} · ${n(R)} = ${n(T)} N·m.`,
              `A uniform disk about its axis: ${V("I")} = ${H}${V("M")}${V("R")}² = ${H} · ${n(Mk)} · ${n(R)}² = ${n(I)} kg·m².`,
              `Newton's second law for rotation: ${al} = ${frac(tau, V("I"))} = ${frac(n(T), n(I))} = ${n(a)} rad/s².`,
            ],
            ...num(a, "rad/s²"), vals: { T, I, a }, params: { kind: "disk", F, M: Mk, R },
          };
        }
      }
      if (level === 2) {
        const m = 0.5 * r.int(1, 10), Mk = r.int(1, 8), R = r.pick([0.1, 0.15, 0.2, 0.25, 0.3]);
        const halfM = Mk / 2, W = m * g, den = m + halfM, a = W / den;
        return {
          prompt: `A ${n(m)} kg bucket hangs from a light rope wound around a ${n(Mk)} kg pulley of radius ${n(R)} m. The pulley is a uniform solid disk turning on a frictionless axle. The bucket is released from rest. What is its acceleration, in m/s²? Take ${gTxt()}. ${rnd(2)}`,
          steps: [
            `Bucket (down positive), Newton's second law: ${V("m")}${V("g")} − ${V("T")} = ${V("m")}${V("a")}.`,
            `Pulley: the rope's torque is ${V("T")}${V("R")} = ${V("I")}${al}, with ${V("I")} = ${H}${V("M")}${V("R")}². The rope does not slip, so ${al} = ${frac(V("a"), V("R"))}. Then ${V("T")}${V("R")} = ${H}${V("M")}${V("R")}² · ${frac(V("a"), V("R"))}, so ${V("T")} = ${H}${V("M")}${V("a")} (the radius cancels).`,
            `Substitute: ${V("m")}${V("g")} − ${H}${V("M")}${V("a")} = ${V("m")}${V("a")}, so ${V("a")} = ${frac(`${V("m")}${V("g")}`, `${V("m")} + ${H}${V("M")}`)} = ${frac(`${n(m)} · ${c(9.81)}`, `${n(m)} + ${n(halfM)}`)} = ${frac(n(W), n(den))} ${ap(a)} m/s².`,
          ],
          ...num(a, "m/s²", 2), vals: { halfM, W, den, a }, params: { m, M: Mk, R },
        };
      }
      // level 3: conservation of angular momentum
      if (r.chance(0.5)) {
        const Mk = r.int(2, 10), R = r.pick([0.2, 0.25, 0.3, 0.4, 0.5]), w1 = r.pick([30, 45, 60, 75, 90]), m = 0.5 * r.int(1, 6);
        const I1 = 0.5 * Mk * R * R, mr2 = m * R * R, I2 = I1 + mr2, w2 = (w1 * I1) / I2;
        return {
          prompt: `A turntable, a uniform disk of mass ${n(Mk)} kg and radius ${n(R)} m, spins freely at ${n(w1)} rpm. A ${n(m)} kg lump of clay is dropped onto it and sticks at the rim. What is the new rotation rate, in rpm? ${rnd(1)}`,
          steps: [
            `No external torque acts about the axle, so angular momentum is conserved: ${S("I", 1)}${S("ω", 1)} = ${S("I", 2)}${S("ω", 2)}.`,
            `Before: ${S("I", 1)} = ${H}${V("M")}${V("R")}² = ${H} · ${n(Mk)} · ${n(R)}² = ${n(I1)} kg·m².`,
            `After, the clay adds ${V("m")}${V("R")}² = ${n(m)} · ${n(R)}² = ${n(mr2)} kg·m², so ${S("I", 2)} = ${n(I1)} + ${n(mr2)} = ${n(I2)} kg·m².`,
            `Only the ratio of the rates matters, so rpm can stay as rpm: ${S("ω", 2)} = ${S("ω", 1)} · ${frac(S("I", 1), S("I", 2))} = ${n(w1)} · ${frac(n(I1), n(I2))} ${ap(w2)} rpm.`,
          ],
          ...num(w2, "rpm", 1), vals: { I1, mr2, I2, w2 }, params: { kind: "clay", M: Mk, R, w1, m },
        };
      }
      const I1 = r.pick([3, 3.5, 4, 4.5, 5, 5.5, 6]), f1 = r.pick([1, 1.5, 2, 2.5]), I2 = r.pick([1, 1.2, 1.5, 1.8, 2, 2.4, 2.5]);
      const ratio = I1 / I2, f2 = f1 * ratio;
      return {
        prompt: `A figure skater spins at ${n(f1)} rev/s with arms outstretched, when her moment of inertia is ${n(I1)} kg·m². She pulls her arms in, reducing it to ${n(I2)} kg·m². What is her new spin rate, in rev/s? ${rnd(2)}`,
        steps: [
          `The ice exerts almost no torque about the vertical axis, so angular momentum ${V("L")} = ${V("I")}ω is conserved: ${S("I", 1)}${S("ω", 1)} = ${S("I", 2)}${S("ω", 2)}.`,
          `Only the ratio matters, so rev/s can stay as rev/s: ${frac(S("I", 1), S("I", 2))} = ${frac(n(I1), n(I2))} ${ap(ratio)}.`,
          `New rate: ${n(f1)} · ${n(ratio, 4)} ${ap(f2)} rev/s. Pulling the mass inward shrinks ${V("I")}, so the spin speeds up.`,
        ],
        ...num(f2, "rev/s", 2), vals: { ratio, f2 }, params: { kind: "skater", I1, f1, I2 },
      };
    }),

    // ---- P.rolling Rotational kinetic energy & rolling -----------------------------------------------------
    "P.rolling": def("Rotational kinetic energy and rolling", (r, level) => {
      const SHAPES = [["hoop", "thin hoop", new Frac(1)], ["disk", "solid disk (cylinder)", new Frac(1, 2)], ["sphere", "solid sphere", new Frac(2, 5)], ["shell", "thin spherical shell", new Frac(2, 3)]];
      if (level === 1) {
        if (r.chance(0.5)) {
          const I = 0.5 * r.int(1, 40), w = 10 * r.int(1, 10), KE = 0.5 * I * w * w;
          return {
            prompt: `A flywheel with moment of inertia ${n(I)} kg·m² spins at ${n(w)} rad/s. How much rotational kinetic energy does it store, in joules?`,
            steps: [`Rotational kinetic energy: ${S("KE", "rot")} = ${H}${V("I")}ω² = ${H} · ${n(I)} · ${n(w)}² = ${n(KE)} J.`],
            ...num(KE, "J"), vals: { KE }, params: { kind: "I", I, w },
          };
        }
        const Mk = r.int(2, 20), R = r.pick([0.1, 0.2, 0.3, 0.4, 0.5]), w = 10 * r.int(1, 10), I = 0.5 * Mk * R * R, KE = 0.5 * I * w * w;
        return {
          prompt: `A uniform solid disk of mass ${n(Mk)} kg and radius ${n(R)} m spins about its central axis at ${n(w)} rad/s. How much rotational kinetic energy does it have, in joules?`,
          steps: [
            `Moment of inertia of a disk about its axis: ${V("I")} = ${H}${V("M")}${V("R")}² = ${H} · ${n(Mk)} · ${n(R)}² = ${n(I)} kg·m².`,
            `${S("KE", "rot")} = ${H}${V("I")}ω² = ${H} · ${n(I)} · ${n(w)}² = ${n(KE)} J.`,
          ],
          ...num(KE, "J"), vals: { I, KE }, params: { kind: "disk", M: Mk, R, w },
        };
      }
      const [sid, sname, cq] = r.pick(SHAPES);
      const opc = cq.add(1);
      if (level === 2) {
        const h = 0.5 * r.int(1, 10), Mk = r.int(1, 10), num2 = 2 * g * h, x = num2 / opc.value, v = Math.sqrt(x);
        return {
          prompt: `A ${n(Mk)} kg ${sname} starts from rest and rolls without slipping down a slope, dropping a height of ${n(h)} m. How fast is its center moving at the bottom, in m/s? Take ${gTxt()}. ${rnd(2)}`,
          steps: [
            `Rolling without slipping, the contact point is momentarily at rest, so static friction does no work and mechanical energy is conserved: ${V("M")}${V("g")}${V("h")} = ${H}${V("M")}${V("v")}² + ${H}${S("I", "cm")}ω².`,
            `For a ${sname}, ${S("I", "cm")} = ${M.f(cq)}${V("M")}${V("R")}²${cq.eq(1) ? "" : ""}, and rolling means ω = ${frac(V("v"), V("R"))}, so ${H}${S("I", "cm")}ω² = ${M.f(cq)} · ${H}${V("M")}${V("v")}². Then ${V("M")}${V("g")}${V("h")} = ${H}${V("M")}${V("v")}²(1 + ${M.f(cq)}) = ${H}${V("M")}${V("v")}² · ${M.f(opc)}.`,
            `The mass cancels: ${V("v")} = ${M.sqrt(frac(`2${V("g")}${V("h")}`, M.f(opc)))} = ${M.sqrt(frac(`2 · ${c(9.81)} · ${n(h)}`, M.f(opc)))} = ${M.sqrt(frac(n(num2), M.f(opc)))} ${ap(v)} m/s.`,
          ],
          ...num(v, "m/s", 2), vals: { c: fv(cq), opc: fv(opc), num2, v }, params: { shape: sid, h, M: Mk },
        };
      }
      const th = 5 * r.int(2, 8), d = r.int(1, 10), gs = g * sind(th), a = gs / opc.value, t = Math.sqrt((2 * d) / a);
      return {
        prompt: `A ${sname} is released from rest and rolls without slipping down a ramp inclined at ${n(th)}°. How long does it take to roll ${n(d)} m along the ramp, in seconds? Take ${gTxt()}. ${rnd(2)}`,
        steps: [
          `Along the ramp: ${V("M")}${V("g")} sin θ − ${V("f")} = ${V("M")}${V("a")}, where ${V("f")} is static friction at the contact point. About the center: ${V("f")}${V("R")} = ${S("I", "cm")}α = ${M.f(cq)}${V("M")}${V("R")}² · ${frac(V("a"), V("R"))}, so ${V("f")} = ${M.f(cq)}${V("M")}${V("a")}.`,
          `Adding: ${V("M")}${V("g")} sin θ = (1 + ${M.f(cq)})${V("M")}${V("a")}, so ${V("a")} = ${frac(`${V("g")} sin θ`, M.f(opc))}. Here ${V("g")} sin θ = ${c(9.81)} · sin ${n(th)}° ${ap(gs)} m/s², so ${V("a")} = ${frac(n(gs, 4), M.f(opc))} ${ap(a)} m/s².`,
          `From rest with constant acceleration, ${V("d")} = ${H}${V("a")}${V("t")}², so ${V("t")} = ${M.sqrt(frac(`2${V("d")}`, V("a")))} = ${M.sqrt(frac(`2 · ${n(d)}`, n(a, 4)))} ${ap(t)} s.`,
        ],
        ...num(t, "s", 2), vals: { c: fv(cq), opc: fv(opc), gs, a, t }, params: { shape: sid, th, d }, deg: true,
      };
    }),

    // ---- P.7 Oscillations & simple harmonic motion ---------------------------------------------------------
    "P.7": def("Simple harmonic motion", (r, level) => {
      if (level === 1) {
        const m = r.pick([0.2, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3]), k = 10 * r.int(2, 50), ratio = m / k, sq = Math.sqrt(ratio), T = 2 * Math.PI * sq;
        return {
          prompt: `A ${n(m)} kg block attached to a spring with spring constant ${n(k)} N/m oscillates on a frictionless horizontal surface. What is the period of the oscillation, in seconds? ${rnd(2)}`,
          steps: [
            `For a mass on a spring, ${V("T")} = 2π${M.sqrt(frac(V("m"), V("k")))}, independent of the amplitude.`,
            `${frac(V("m"), V("k"))} = ${frac(n(m), n(k))} ${ap(ratio, 6)} s², and its square root ${ap(sq)} s.`,
            `${V("T")} = 2π · ${n(sq, 4)} ${ap(T)} s.`,
          ],
          ...num(T, "s", 2), vals: { ratio, sq, T }, params: { m, k },
        };
      }
      if (level === 2) {
        const w = r.int(2, 20), m = r.pick([0.1, 0.2, 0.25, 0.5, 1, 2]), k = P.round(m * w * w, 4);
        const [A, x, s] = r.pick([[5, 3, 4], [5, 4, 3], [10, 6, 8], [10, 8, 6], [13, 5, 12], [13, 12, 5], [15, 9, 12], [15, 12, 9], [17, 8, 15], [17, 15, 8], [20, 12, 16], [20, 16, 12], [25, 7, 24], [25, 24, 7]]);
        const w2 = w * w, diff = A * A - x * x, sm = s / 100, v = P.round(w * sm, 6);
        return {
          prompt: `A ${n(m)} kg block on a spring (spring constant ${n(k)} N/m) oscillates on a frictionless surface with an amplitude of ${n(A)} cm. How fast is it moving when it is ${n(x)} cm from equilibrium, in m/s?`,
          steps: [
            `Energy is conserved: ${H}${V("k")}${V("A")}² = ${H}${V("m")}${V("v")}² + ${H}${V("k")}${V("x")}², so ${V("v")} = ${M.sqrt(frac(V("k"), V("m")))} · ${M.sqrt(`${V("A")}² − ${V("x")}²`)} = ω${M.sqrt(`${V("A")}² − ${V("x")}²`)}.`,
            `ω = ${M.sqrt(frac(n(k), n(m)))} = ${M.sqrt(n(w2))} = ${n(w)} rad/s.`,
            `${M.sqrt(`${n(A)}² − ${n(x)}²`)} = ${M.sqrt(n(diff))} = ${n(s)} cm = ${n(sm)} m.`,
            `${V("v")} = ${n(w)} · ${n(sm)} = ${n(v)} m/s.`,
          ],
          ...num(v, "m/s"), vals: { w2, w, diff, s, sm, v }, params: { m, k, A, x },
        };
      }
      // level 3: read amplitude and period from an x–t graph
      const kind = r.pick(["k", "v"]);
      const A = r.int(2, 8), T = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4]), m = r.pick([0.2, 0.5, 1, 1.5, 2]);
      const T2 = T * T, kk = (4 * Math.PI * Math.PI * m) / T2, vmax = (2 * Math.PI * A) / T;
      const gph = graph({
        view: [-0.25 * T - 0.2, 2.25 * T, -A - 1.6, A + 1.8],
        items: [
          { t: "fn", e: `${A}*cos(2*pi*x/${T})`, role: "primary" },
          { t: "pt", x: 0, y: A }, { t: "pt", x: T, y: A },
          { t: "seg", a: [T, 0], b: [T, A], dash: true, role: "muted" },
          { t: "text", x: T, y: A + 0.8, s: `t = ${fmt(T)} s` },
          { t: "text", x: -0.14 * T - 0.1, y: A, s: fmt(A) },
          { t: "text", x: 2.1 * T, y: 0.6, s: "t (s)" },
          { t: "text", x: 0.25 * T + 0.2, y: A + 1.5, s: "x (cm)" },
        ],
      });
      const read = `Read the graph: the amplitude is the height of a peak above the center line, ${V("A")} = ${n(A)} cm; the period is the time from one peak to the next, ${V("T")} = ${n(T)} s.`;
      if (kind === "k") {
        return {
          prompt: `The graph shows the position of a ${n(m)} kg mass oscillating on a spring. What is the spring constant, in N/m? ${rnd(2)}`,
          graph: gph,
          steps: [read, `For a mass on a spring ω² = ${frac(V("k"), V("m"))} and ω = ${frac("2π", V("T"))}, so ${V("k")} = ${V("m")}ω² = ${frac(`${c(4)}π²${V("m")}`, `${V("T")}²`)}.`, `${V("k")} = ${frac(`${c(4)}π² · ${n(m)}`, `${n(T)}²`)} = ${frac(`${c(4)}π² · ${n(m)}`, n(T2))} ${ap(kk)} N/m. (The amplitude is not needed.)`],
          ...num(kk, "N/m", 2), vals: { T2, kk }, params: { kind, A, T, m },
        };
      }
      return {
        prompt: `The graph shows the position of a mass oscillating on a spring. What is its maximum speed, in cm/s? ${rnd(1)}`,
        graph: gph,
        steps: [read, `The speed is greatest as it passes equilibrium: ${S("v", "max")} = ${V("A")}ω = ${frac(`2π${V("A")}`, V("T"))}.`, `${S("v", "max")} = ${frac(`2π · ${n(A)}`, n(T))} ${ap(vmax)} cm/s.`],
        ...num(vmax, "cm/s", 1), vals: { vmax }, params: { kind, A, T, m },
      };
    }),

    // ---- P.pendulum Pendulums ---------------------------------------------------------------------------
    "P.pendulum": def("Pendulums", (r, level) => {
      const T_ = V("T"), L_ = V("L"), g_ = V("g");
      if (level === 1) {
        if (r.chance(0.5)) {
          const L = r.int(2, 30) / 10, ratio = L / g, sq = Math.sqrt(ratio), T = 2 * Math.PI * sq;
          return {
            prompt: `A simple pendulum is ${n(L)} m long. What is its period for small swings, in seconds? Take ${gTxt()}. ${rnd(2)}`,
            steps: [
              `For small swings a simple pendulum has ${T_} = 2π${M.sqrt(frac(L_, g_))}, independent of the bob's mass and of the (small) amplitude.`,
              `${frac(L_, g_)} = ${frac(n(L), c(9.81))} ${ap(ratio, 5)} s², and its square root ${ap(sq)} s.`,
              `${T_} = 2π · ${n(sq, 4)} ${ap(T)} s.`,
            ],
            ...num(T, "s", 2), vals: { ratio, sq, T }, params: { kind: "T", L },
          };
        }
        const T = r.pick([1, 1.5, 2, 2.5, 3, 4]), T2 = T * T, nm = g * T2, den = 4 * Math.PI * Math.PI, L = nm / den, Lcm = L * 100;
        return {
          prompt: `How long must a simple pendulum be to have a period of ${n(T)} s, in centimeters? Take ${gTxt()}. ${rnd(1)}`,
          steps: [
            `Square both sides of ${T_} = 2π${M.sqrt(frac(L_, g_))}: ${T_}² = ${frac(`${c(4)}π²${L_}`, g_)}, so ${L_} = ${frac(`${g_}${T_}²`, `${c(4)}π²`)}.`,
            `${L_} = ${frac(`${c(9.81)} · ${n(T)}²`, `${c(4)}π²`)} = ${frac(n(nm), n(den, 4))} ${ap(L)} m.`,
            `In centimeters: ${L_} ${ap(Lcm, 3)} cm.`,
          ],
          ...num(Lcm, "cm", 1), vals: { T2, nm, den, L, Lcm }, params: { kind: "L", T },
        };
      }
      if (level === 2) {
        const L = r.int(10, 40) / 20, nsw = r.pick([10, 20, 25, 30, 50]), gt = 9.8 + r.int(-3, 3) / 100;
        const t = P.round(nsw * 2 * Math.PI * Math.sqrt(L / gt), 1);
        const T = t / nsw, T2 = T * T, nm = 4 * Math.PI * Math.PI * L, gm = nm / T2;
        return {
          prompt: `To measure ${g_}, a student times ${n(nsw)} complete swings of a simple pendulum ${n(L)} m long and gets ${n(t)} s. What value of ${g_} does this give, in m/s²? ${rnd(2)}`,
          steps: [
            `Timing many swings and dividing reduces the timing error. One period: ${T_} = ${frac(n(t), n(nsw))} ${ap(T, 5)} s.`,
            `Invert ${T_} = 2π${M.sqrt(frac(L_, g_))}: ${g_} = ${frac(`${c(4)}π²${L_}`, `${T_}²`)}.`,
            `${c(4)}π²${L_} = ${c(4)}π² · ${n(L)} ${ap(nm)} m and ${T_}² ${ap(T2, 5)} s², so ${g_} = ${frac(n(nm, 4), n(T2, 5))} ${ap(gm)} m/s².`,
          ],
          ...num(gm, "m/s²", 2), vals: { T, T2, nm, gm }, params: { L, nsw, t },
        };
      }
      // level 3: physical pendulum
      const shape = r.pick(["rodEnd", "rodQuarter", "hoop", "diskRim"]);
      const Mk = r.int(1, 5), len = shape.startsWith("rod") ? r.int(5, 15) / 10 : r.int(1, 6) / 10;
      let Icm, d, desc, cmTxt;
      if (shape === "rodEnd" || shape === "rodQuarter") {
        Icm = (Mk * len * len) / 12; d = shape === "rodEnd" ? len / 2 : len / 4;
        desc = `A uniform rod of mass ${n(Mk)} kg and length ${n(len)} m swings from a pivot ${shape === "rodEnd" ? "at one end" : `${n(d)} m from its center`}`;
        cmTxt = `${frac("1", c(12))}${V("M")}${L_}² = ${frac(`${n(Mk)} · ${n(len)}²`, c(12))}`;
      } else if (shape === "hoop") {
        Icm = Mk * len * len; d = len;
        desc = `A thin hoop of mass ${n(Mk)} kg and radius ${n(len)} m hangs on a nail and swings in its own plane`;
        cmTxt = `${V("M")}${V("R")}² = ${n(Mk)} · ${n(len)}²`;
      } else {
        Icm = (Mk * len * len) / 2; d = len;
        desc = `A uniform disk of mass ${n(Mk)} kg and radius ${n(len)} m swings in its own plane from a pivot at its rim`;
        cmTxt = `${H}${V("M")}${V("R")}² = ${H} · ${n(Mk)} · ${n(len)}²`;
      }
      const Md2 = Mk * d * d, I = Icm + Md2, mgd = Mk * g * d, ratio = I / mgd, T = 2 * Math.PI * Math.sqrt(ratio);
      return {
        prompt: `${desc}. What is its period for small swings, in seconds? Take ${gTxt()}. ${rnd(2)}`,
        steps: [
          `A rigid body swinging about a pivot is a physical pendulum: ${T_} = 2π${M.sqrt(frac(V("I"), `${V("M")}${g_}${V("d")}`))}, with ${V("I")} about the pivot and ${V("d")} the distance from the pivot to the center of mass, here ${V("d")} = ${n(d)} m.`,
          `About the center of mass ${S("I", "cm")} = ${cmTxt} ${ap(Icm)} kg·m². Parallel-axis theorem: ${V("I")} = ${S("I", "cm")} + ${V("M")}${V("d")}² = ${n(Icm, 4)} + ${n(Mk)} · ${n(d)}² ${ap(I)} kg·m².`,
          `${V("M")}${g_}${V("d")} = ${n(Mk)} · ${c(9.81)} · ${n(d)} = ${n(mgd)} N·m, so ${frac(V("I"), `${V("M")}${g_}${V("d")}`)} = ${frac(n(I, 4), n(mgd))} ${ap(ratio, 5)} s².`,
          `${T_} = 2π${M.sqrt(n(ratio, 5))} ${ap(T)} s. (The mass cancels.)`,
        ],
        ...num(T, "s", 2), vals: { d, Icm, I, mgd, ratio, T }, params: { shape, M: Mk, len },
      };
    }),

    // ---- P.waves Waves: speed, frequency & wavelength ---------------------------------------------------
    "P.waves": def("Waves: speed, frequency and wavelength", (r, level) => {
      const lam = "λ", f_ = V("f"), v_ = V("v");
      if (level === 1) {
        const kind = r.pick(["rope", "radio", "ocean"]);
        if (kind === "rope") {
          const v = r.int(1, 20), f = r.pick([0.5, 1, 2, 2.5, 4, 5]), L = v / f;
          return {
            prompt: `A wave travels along a stretched rope at ${n(v)} m/s with a frequency of ${n(f)} Hz. What is its wavelength, in meters?`,
            steps: [`One wavelength passes each period, so ${v_} = ${f_}${lam}, and ${lam} = ${frac(v_, f_)} = ${frac(n(v), n(f))} = ${n(L)} m.`],
            ...num(L, "m"), vals: { L }, params: { kind, v, f },
          };
        }
        if (kind === "radio") {
          const f = r.pick([75, 100, 120, 150, 200, 250, 300, 600, 750, 1500]), L = 300 / f;
          return {
            prompt: `A radio transmitter broadcasts at ${n(f)} MHz. What is the wavelength of the radio waves, in meters? Radio waves travel at the speed of light, ${V("c")} = ${sciC("3.00", 8)} m/s.`,
            steps: [
              `${f_} = ${n(f)} MHz = ${n(f)} × 10<sup>${c(6)}</sup> Hz.`,
              `${V("c")} = ${f_}${lam}, so ${lam} = ${frac(V("c"), f_)} = ${frac(sciC("3.00", 8), `${n(f)} × 10<sup>${c(6)}</sup>`)} = ${frac(c(300), n(f))} = ${n(L)} m.`,
            ],
            ...num(L, "m"), vals: { L }, params: { kind, f },
          };
        }
        for (;;) {
          const L = r.int(20, 100), T = r.int(4, 12), v = L / T;
          if (!isExact(v, 2)) continue;
          return {
            prompt: `Ocean swells with a wavelength of ${n(L)} m pass a pier, one crest every ${n(T)} s. How fast do the waves travel, in m/s?`,
            steps: [`The time between crests is the period ${V("T")}, and one wavelength passes per period: ${v_} = ${frac(lam, V("T"))} = ${frac(n(L), n(T))} = ${n(v)} m/s.`],
            ...num(v, "m/s"), vals: { v }, params: { kind, L, T },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const v = 10 * r.int(4, 30), mu = r.pick([1, 2, 4, 5, 8, 10]), L = r.pick([0.5, 0.6, 0.8, 1, 1.2, 1.25]), nh = r.int(1, 3);
          const mukg = mu / 1000, v2 = v * v, F = P.round(mukg * v2, 4), f = (nh * v) / (2 * L);
          if (!isExact(f, 2) || F < 5 || F > 1500) continue;
          const name = ["fundamental (first harmonic)", "second harmonic", "third harmonic"][nh - 1];
          return {
            prompt: `A string ${n(L)} m long, fixed at both ends, has a mass per unit length of ${n(mu)} g/m and is stretched to a tension of ${n(F)} N. What is the frequency of its ${name}, in Hz?`,
            steps: [
              `Convert: μ = ${n(mu)} g/m = ${n(mukg)} kg/m.`,
              `Wave speed on a string: ${v_} = ${M.sqrt(frac(S("F", "T"), "μ"))} = ${M.sqrt(frac(n(F), n(mukg)))} = ${M.sqrt(n(v2))} = ${n(v)} m/s.`,
              `With both ends fixed, the ${V("n")}th standing wave fits ${V("n")} half-wavelengths: ${S("f", "n")} = ${frac(`${V("n")}${v_}`, `2${V("L")}`)} = ${frac(`${n(nh)} · ${n(v)}`, `2 · ${n(L)}`)} = ${n(f)} Hz.`,
            ],
            ...num(f, "Hz"), vals: { mukg, v2, v, f }, params: { mu, F, L, nh },
          };
        }
      }
      // level 3: read a wave from a snapshot graph, or from its equation
      if (r.chance(0.5)) {
        const L = r.pick([0.5, 1, 1.5, 2, 2.5, 3, 4]), A = r.int(2, 6), f = r.pick([2, 3, 4, 5, 10, 20, 25]);
        const c1 = L / 4, c2 = (5 * L) / 4, v = f * L;
        return {
          prompt: `The graph is a snapshot of a wave on a long rope (displacement in centimeters against position in meters). The wave's frequency is ${n(f)} Hz. How fast does it travel, in m/s?`,
          graph: graph({
            view: [-0.15 * L, 2.2 * L, -A - 2, A + 2.2],
            items: [
              { t: "fn", e: `${A}*sin(2*pi*x/${L})`, role: "primary" },
              { t: "pt", x: c1, y: A }, { t: "pt", x: c2, y: A },
              { t: "text", x: c1, y: A + 1.1, s: `x = ${fmt(c1)} m` },
              { t: "text", x: c2, y: A + 1.1, s: `x = ${fmt(c2)} m` },
              { t: "text", x: 2.05 * L, y: 0.7, s: "x (m)" },
            ],
          }),
          steps: [
            `The wavelength is the distance between neighboring crests. The marked crests are at ${V("x")} = ${n(c1)} m and ${V("x")} = ${n(c2)} m, so ${lam} = ${n(c2)} − ${n(c1)} = ${n(L)} m.`,
            `${v_} = ${f_}${lam} = ${n(f)} · ${n(L)} = ${n(v)} m/s. (The amplitude does not affect the speed.)`,
          ],
          ...num(v, "m/s"), vals: { c1, c2, L, v }, params: { kind: "graph", A, f, lamP: L },
        };
      }
      const k = r.pick([2, 3, 4, 5, 6, 8, 10]), sp = r.int(2, 20), w = k * sp, A = r.pick([0.01, 0.02, 0.03, 0.05]), sgn = r.pick([-1, 1]);
      const vel = -sgn * sp;
      return {
        prompt: `A wave on a string is described by ${V("y")} = ${n(A)} sin(${n(k)}${V("x")} ${sgn < 0 ? "−" : "+"} ${n(w)}${V("t")}), with ${V("x")} and ${V("y")} in meters and ${V("t")} in seconds. What is the wave's velocity along the string, in m/s (positive means toward +${V("x")})?`,
        steps: [
          `Compare with ${V("y")} = ${V("A")} sin(${V("k")}${V("x")} − ω${V("t")}), which travels toward +${V("x")}; with + ω${V("t")} it travels toward −${V("x")}. Here ${V("k")} = ${n(k)} rad/m and ω = ${n(w)} rad/s${sgn < 0 ? ", with a minus sign: toward +" + V("x") : ", with a plus sign: toward −" + V("x")}.`,
          `A crest keeps ${V("k")}${V("x")} ${sgn < 0 ? "−" : "+"} ω${V("t")} constant, so it moves at speed ${v_} = ${frac("ω", V("k"))} = ${frac(n(w), n(k))} = ${n(sp)} m/s.`,
          `Velocity: ${n(vel)} m/s.`,
        ],
        ...num(vel, "m/s"), vals: { sp, vel }, params: { kind: "eq", k, w, A, sgn },
      };
    }),

    // ---- P.sound Sound: intensity, decibels & the Doppler effect ------------------------------------------
    "P.sound": def("Sound: decibels and the Doppler effect", (r, level) => {
      const beta = "β";
      if (level === 1) {
        const cc = r.pick([1, 1, 2, 3, 4, 5, 6, 8]), k = r.int(3, 10), e = 12 - k, logc = Math.log10(cc), sum = logc + e, b = 10 * sum;
        const Itxt = cc === 1 ? `10<sup>${n(-k)}</sup>` : `${n(cc)} × 10<sup>${n(-k)}</sup>`;
        const steps = [
          `Sound intensity level: ${beta} = ${c(10)} log${frac(V("I"), S("I", "0"))} dB, with log in base ${c(10)}.`,
          `${frac(V("I"), S("I", "0"))} = ${frac(Itxt, `10<sup>−${c(12)}</sup>`)} = ${cc === 1 ? "" : `${n(cc)} × `}10<sup>${n(e)}</sup>.`,
          cc === 1
            ? `log(10<sup>${n(e)}</sup>) = ${n(e)}, so ${beta} = ${c(10)} · ${n(e)} = ${n(b)} dB.`
            : `log(${n(cc)} × 10<sup>${n(e)}</sup>) = log ${n(cc)} + ${n(e)} ${ap(sum)}, so ${beta} ${ap(b, 2)} dB.`,
        ];
        return {
          prompt: `The sound intensity at a listener's ear is ${V("I")} = ${Itxt} W/m². What is the sound intensity level, in decibels? Take the threshold of hearing as ${S("I", "0")} = 10<sup>−${c(12)}</sup> W/m². ${rnd(1)}`,
          steps, ...num(b, "dB", 1), vals: cc === 1 ? { e, b } : { e, sum, b }, params: { cc, k },
        };
      }
      if (level === 2) {
        if (r.chance(0.5)) {
          const b1 = 5 * r.int(8, 18), nn = r.pick([2, 3, 4, 5, 10, 100]), logn = Math.log10(nn), add = 10 * logn, b = b1 + add;
          return {
            prompt: `One machine in a workshop produces a sound level of ${n(b1)} dB at a worker's position. What is the level there when ${n(nn)} identical machines, all the same distance away, run together? ${rnd(1)}`,
            steps: [
              `Intensities add, decibels do not: ${n(nn)} identical sources give ${n(nn)} times the intensity of one.`,
              `Multiplying the intensity by ${n(nn)} adds ${c(10)} log ${n(nn)} ${ap(add, 3)} dB, so ${beta} = ${n(b1)} + ${n(add, 3)} ${ap(b, 3)} dB.`,
            ],
            ...num(b, "dB", 1), vals: { add, b }, params: { kind: "n", b1, nn },
          };
        }
        for (;;) {
          const b1 = 5 * r.int(12, 20), r1 = r.pick([1, 2, 5, 10]), rho = r.pick([2, 3, 4, 5, 10, 0.5, 0.1]), r2 = P.round(r1 * rho, 4);
          if (r2 < 0.5) continue;
          const q = new Frac(Math.round(r1 * 10), Math.round(r2 * 10)).pow(2), dd = 10 * Math.log10(q.value), b2 = b1 + dd;
          return {
            prompt: `A small loudspeaker radiating equally in all directions produces a sound level of ${n(b1)} dB at ${n(r1)} m. What level does a listener ${n(r2)} m from it hear? ${rnd(1)}`,
            steps: [
              `A point source spreads its power over a sphere of area 4π${V("r")}², so intensity follows the inverse-square law: ${frac(S("I", 2), S("I", 1))} = ${M.sup(`(${frac(S("r", 1), S("r", 2))})`, 2)} = ${M.sup(`(${frac(n(r1), n(r2))})`, 2)} = ${M.f(q)}.`,
              `In decibels: ${S("β", 2)} = ${S("β", 1)} + ${c(10)} log${frac(S("I", 2), S("I", 1))}, and ${c(10)} log(${M.f(q)}) ${ap(dd, 3)} dB, so ${S("β", 2)} = ${n(b1)} ${dd < 0 ? "−" : "+"} ${n(Math.abs(dd), 3)} ${ap(b2, 3)} dB.`,
            ],
            ...num(b2, "dB", 1), vals: { q: fv(q), dd, b2 }, params: { kind: "r", b1, r1, r2 }, consts: [4],
          };
        }
      }
      // level 3: Doppler effect
      const kind = r.pick(["app", "rec", "pass", "obs"]), f = 10 * r.int(30, 100), vs = r.int(10, 40), vsnd = 343;
      const law = `Doppler effect: ${V("f")}′ = ${V("f")}${frac(`${V("v")} ± ${S("v", "o")}`, `${V("v")} ∓ ${S("v", "s")}`)}, with ${V("v")} = ${c(343)} m/s, ${S("v", "o")} the listener's speed and ${S("v", "s")} the source's; take the upper signs for motion toward the other party.`;
      if (kind === "obs") {
        const num2 = vsnd + vs, f1 = (f * num2) / vsnd;
        return {
          prompt: `A cyclist rides at ${n(vs)} m/s straight toward a stationary alarm bell that rings at ${n(f)} Hz. What frequency does the cyclist hear? Take the speed of sound as ${c(343)} m/s. ${rnd(1)}`,
          steps: [law, `Here the listener moves toward the source and the source is still: ${V("f")}′ = ${V("f")}${frac(`${V("v")} + ${S("v", "o")}`, V("v"))} = ${n(f)} · ${frac(`${c(343)} + ${n(vs)}`, c(343))} = ${n(f)} · ${frac(n(num2), c(343))} ${ap(f1)} Hz. Approaching raises the pitch.`],
          ...num(f1, "Hz", 1), vals: { num2, f1 }, params: { kind, f, vs },
        };
      }
      const dA = vsnd - vs, dR = vsnd + vs, fA = (f * vsnd) / dA, fR = (f * vsnd) / dR;
      const app = `Approaching (source toward listener): ${V("f")}′ = ${V("f")}${frac(V("v"), `${V("v")} − ${S("v", "s")}`)} = ${n(f)} · ${frac(c(343), `${c(343)} − ${n(vs)}`)} = ${n(f)} · ${frac(c(343), n(dA))} ${ap(fA)} Hz.`;
      const rec = `Receding (source away from listener): ${V("f")}′ = ${V("f")}${frac(V("v"), `${V("v")} + ${S("v", "s")}`)} = ${n(f)} · ${frac(c(343), `${c(343)} + ${n(vs)}`)} = ${n(f)} · ${frac(c(343), n(dR))} ${ap(fR)} Hz.`;
      if (kind === "pass") {
        const df = fA - fR;
        return {
          prompt: `An ambulance siren sounds at ${n(f)} Hz as the ambulance drives at ${n(vs)} m/s past a pedestrian standing at the roadside. By how much does the pitch the pedestrian hears drop as the ambulance passes, in Hz? Take the speed of sound as ${c(343)} m/s. ${rnd(1)}`,
          steps: [law, app, rec, `The drop: ${n(fA, 4)} − ${n(fR, 4)} ${ap(df)} Hz.`],
          ...num(df, "Hz", 1), vals: { dA, fA, dR, fR, df }, params: { kind, f, vs },
        };
      }
      return {
        prompt: `A train horn sounds at ${n(f)} Hz while the train moves at ${n(vs)} m/s ${kind === "app" ? "toward" : "away from"} a stationary listener. What frequency does the listener hear? Take the speed of sound as ${c(343)} m/s. ${rnd(1)}`,
        steps: [law, kind === "app" ? app : rec, kind === "app" ? `The approaching source raises the pitch.` : `The receding source lowers the pitch.`],
        ...num(kind === "app" ? fA : fR, "Hz", 1), vals: kind === "app" ? { dA, fA } : { dR, fR }, params: { kind, f, vs },
      };
    }),

    // ---- P.8 Pressure, hydrostatics & buoyancy --------------------------------------------------------------
    "P.8": def("Pressure, hydrostatics and buoyancy", (r, level) => {
      const rho = "ρ";
      if (level === 1) {
        if (r.chance(0.5)) {
          const sea = r.chance(0.5), dens = sea ? 1025 : 1000, h = r.int(1, 60), Pa = dens * g * h, kPa = Pa / 1000;
          return {
            prompt: `A diver is ${n(h)} m below the surface of ${sea ? "the sea" : "a freshwater lake"}. What is the gauge pressure on the diver (the pressure above atmospheric), in kPa? Take the water's density as ${c(dens)} kg/m³ and ${gTxt()}.${sea ? ` ${rnd(2)}` : ""}`,
            steps: [
              `In a fluid at rest the pressure grows linearly with depth: ${V("P")} − ${S("P", "0")} = ${rho}${V("g")}${V("h")}.`,
              `${rho}${V("g")}${V("h")} = ${c(dens)} · ${c(9.81)} · ${n(h)} = ${n(Pa)} Pa = ${n(kPa, 5)} kPa.`,
            ],
            ...num(kPa, "kPa", sea ? 2 : undefined), vals: { Pa, kPa }, params: { kind: "depth", dens, h }, consts: [1000],
          };
        }
        const m = r.int(50, 90), A = r.pick([1, 2, 4, 5]), F = m * g, Pa = F / (A * 1e-4), MPa = Pa / 1e6;
        return {
          prompt: `A ${n(m)} kg person briefly balances with all their weight on one stiletto heel whose contact area is ${n(A)} cm². What pressure does the heel exert on the floor, in megapascals (MPa)? Take ${gTxt()}. ${rnd(2)}`,
          steps: [
            `The force is the person's weight: ${V("F")} = ${V("m")}${V("g")} = ${n(m)} · ${c(9.81)} = ${n(F)} N.`,
            `Area: 1 cm² = 10<sup>−${c(4)}</sup> m², so ${V("A")} = ${n(A)} × 10<sup>−${c(4)}</sup> m².`,
            `Pressure is force per area: ${V("P")} = ${frac(V("F"), V("A"))} = ${frac(n(F), `${n(A)} × 10<sup>−${c(4)}</sup>`)} ${ap(Pa, 1)} Pa ${ap(MPa)} MPa (1 MPa = 10<sup>${c(6)}</sup> Pa).`,
          ],
          ...num(MPa, "MPa", 2), vals: { F, Pa, MPa }, params: { kind: "heel", m, A }, consts: [10],
        };
      }
      if (level === 2) {
        if (r.chance(0.5)) {
          const Mk = 100 * r.int(10, 20), d1 = r.int(2, 5), d2 = r.int(20, 40), W = Mk * g, q = new Frac(d1 * d1, d2 * d2), F1 = W * q.value;
          return {
            prompt: `In a garage hydraulic lift, a small piston ${n(d1)} cm in diameter pushes on oil that presses on a large piston ${n(d2)} cm in diameter. What force on the small piston holds up a ${n(Mk)} kg car resting on the large piston, in newtons? Take ${gTxt()}. ${rnd(1)}`,
            steps: [
              `Pascal's principle: the pressure is the same on both pistons, ${frac(S("F", 1), S("A", 1))} = ${frac(S("F", 2), S("A", 2))}, so ${S("F", 1)} = ${S("F", 2)}${frac(S("A", 1), S("A", 2))}. Since ${V("A")} = π${V("d")}²/4, the area ratio is ${M.sup(`(${frac(S("d", 1), S("d", 2))})`, 2)}.`,
              `The large piston carries the car's weight: ${S("F", 2)} = ${V("m")}${V("g")} = ${n(Mk)} · ${c(9.81)} = ${n(W)} N.`,
              `${M.sup(`(${frac(n(d1), n(d2))})`, 2)} = ${M.f(q)}, so ${S("F", 1)} = ${n(W)} · ${M.f(q)} ${ap(F1)} N.`,
            ],
            ...num(F1, "N", 1), vals: { W, q: fv(q), F1 }, params: { kind: "hyd", M: Mk, d1, d2 }, consts: [4],
          };
        }
        const h = r.int(2, 50), dP = g * h, P = 101.3 + dP;
        return {
          prompt: `What is the absolute pressure ${n(h)} m below the surface of a freshwater lake, in kPa? Take atmospheric pressure as ${c(101.3)} kPa, the water's density as ${c(1000)} kg/m³ and ${gTxt()}.`,
          steps: [
            `Absolute pressure is atmospheric pressure plus the weight of the water above: ${V("P")} = ${S("P", "0")} + ${rho}${V("g")}${V("h")}.`,
            `${rho}${V("g")}${V("h")} = ${c(1000)} · ${c(9.81)} · ${n(h)} Pa = ${n(dP)} kPa.`,
            `${V("P")} = ${c(101.3)} + ${n(dP)} = ${n(P)} kPa.`,
          ],
          ...num(P, "kPa"), vals: { dP, P }, params: { kind: "abs", h },
        };
      }
      // level 3: a floating block, or density from weighing in water
      if (r.chance(0.5)) {
        const rw = r.pick([500, 600, 650, 700, 750, 800]), H = r.int(10, 40), fr_ = rw / 1000, d = H * fr_, above = H - d;
        return {
          prompt: `A block of wood with density ${n(rw)} kg/m³ and height ${n(H)} cm floats upright in fresh water (density ${c(1000)} kg/m³), with its top and bottom faces horizontal. How high does its top stand above the water, in centimeters?`,
          steps: [
            `Floating means the buoyant force equals the weight (Archimedes): ${S("ρ", "water")}${V("g")}${V("A")}${V("d")} = ${S("ρ", "wood")}${V("g")}${V("A")}${V("H")}, with ${V("A")} the block's horizontal area and ${V("d")} the depth under water.`,
            `${V("g")} and ${V("A")} cancel: ${frac(V("d"), V("H"))} = ${frac(S("ρ", "wood"), S("ρ", "water"))} = ${frac(n(rw), c(1000))} = ${n(fr_)}.`,
            `${V("d")} = ${n(H)} · ${n(fr_)} = ${n(d)} cm under water, so ${n(H)} − ${n(d)} = ${n(above)} cm stands above.`,
          ],
          ...num(above, "cm"), vals: { fr_, d, above }, params: { kind: "float", rw, H },
        };
      }
      for (;;) {
        const [, dens] = r.pick([["aluminum", 2700], ["iron", 7870], ["copper", 8960], ["silver", 10490], ["lead", 11340], ["titanium", 4510]]);
        const Vc = 10 * r.int(5, 50);
        const Wair = P.round(dens * Vc * 1e-6 * g, 2), Wwat = P.round((dens - 1000) * Vc * 1e-6 * g, 2);
        const FB = P.round(Wair - Wwat, 2);
        if (FB < 0.5) continue;
        const ratio = Wair / FB, rhoS = 1000 * ratio;
        return {
          prompt: `A metal sample hung from a spring scale reads ${n(Wair)} N in air and ${n(Wwat)} N when fully submerged in water (density ${c(1000)} kg/m³). What is the density of the metal, in kg/m³? ${rnd(0)}`,
          steps: [
            `Archimedes' principle: the apparent loss of weight is the buoyant force, ${S("F", "B")} = ${n(Wair)} − ${n(Wwat)} = ${n(FB)} N.`,
            `${S("F", "B")} = ${S("ρ", "water")}${V("g")}${V("V")} and ${S("W", "air")} = ${rho}${V("g")}${V("V")} with the same volume ${V("V")}, so ${frac(rho, S("ρ", "water"))} = ${frac(S("W", "air"), S("F", "B"))} = ${frac(n(Wair), n(FB))} ${ap(ratio)}.`,
            `${rho} = ${c(1000)} · ${n(ratio, 4)} ${ap(rhoS, 1)} kg/m³.`,
          ],
          ...num(rhoS, "kg/m³", 0), vals: { FB, ratio, rhoS }, params: { kind: "weigh", Wair, Wwat },
        };
      }
    }),

    // ---- P.9 Continuity & Bernoulli ---------------------------------------------------------------------
    "P.9": def("Continuity and Bernoulli's equation", (r, level) => {
      const s1 = S("v", 1), s2 = S("v", 2);
      if (level === 1) {
        const [d1, d2] = r.pick([[2, 1], [3, 1], [3, 2], [4, 1], [5, 2], [4, 3], [5, 4], [6, 5]]), v1 = r.int(1, 4);
        const q = new Frac(d1 * d1, d2 * d2), v2 = q.mul(v1);
        return {
          prompt: `Water flows at ${n(v1)} m/s through a garden hose with an inner diameter of ${n(d1)} cm. It leaves through a nozzle ${n(d2)} cm across. How fast does it leave the nozzle, in m/s?`,
          steps: [
            `Continuity for an incompressible fluid: ${S("A", 1)}${s1} = ${S("A", 2)}${s2}. A circle's area ${V("A")} = π${V("d")}²/4 goes as ${V("d")}², so ${s2} = ${s1}${M.sup(`(${frac(S("d", 1), S("d", 2))})`, 2)}.`,
            `${M.sup(`(${frac(n(d1), n(d2))})`, 2)} = ${M.f(q)}.`,
            `${s2} = ${n(v1)} · ${M.f(q)} = ${qs(v2)} m/s.`,
          ],
          ...numF(v2, "m/s"), vals: { q: fv(q), v2: fv(v2) }, params: { d1, d2, v1 }, consts: [4],
        };
      }
      if (level === 2) {
        const h = r.int(5, 50) / 10, d = r.pick([1, 1.5, 2, 2.5, 3]), x = 2 * g * h, v = Math.sqrt(x), Acm = (Math.PI * d * d) / 4, QL = Acm * v * 0.1;
        return {
          prompt: `A large open water tank has a small round hole ${n(d)} cm across, ${n(h)} m below the water surface. At what rate does water flow out, in liters per second? Ignore the narrowing of the jet. Take ${gTxt()}. ${rnd(2)}`,
          steps: [
            `Bernoulli between the surface and the hole: both are at atmospheric pressure and the surface of a large tank barely moves, so ${V("ρ")}${V("g")}${V("h")} = ${H}${V("ρ")}${V("v")}² (Torricelli's law): ${V("v")} = ${M.sqrt(`2${V("g")}${V("h")}`)} = ${M.sqrt(`2 · ${c(9.81)} · ${n(h)}`)} = ${M.sqrt(n(x))} ${ap(v)} m/s.`,
            `Hole area: ${V("A")} = ${frac(`π${V("d")}²`, c(4))} = ${frac(`π · ${n(d)}²`, c(4))} ${ap(Acm)} cm² = ${n(Acm, 4)} × 10<sup>−${c(4)}</sup> m².`,
            `Flow rate ${V("Q")} = ${V("A")}${V("v")}. Since 1 m³ = ${c(1000)} L, 10<sup>−${c(4)}</sup> m³ = ${c(0.1)} L, so ${V("Q")} = ${n(Acm, 4)} · ${n(v, 4)} · ${c(0.1)} ${ap(QL)} L/s.`,
          ],
          ...num(QL, "L/s", 2), vals: { x, v, Acm, QL }, params: { h, d }, consts: [10],
        };
      }
      // level 3: Bernoulli in a narrowing (and maybe rising) pipe
      for (;;) {
        const [d1, d2] = r.pick([[2, 1], [3, 2], [4, 2], [5, 4], [5, 2], [6, 5]]), v1 = r.int(1, 3), P1 = 10 * r.int(15, 30), rise = r.chance(0.5) ? r.int(1, 10) : 0;
        const q = new Frac(d1 * d1, d2 * d2), v2 = v1 * q.value;
        if (v2 > 15) continue;
        const v12 = v1 * v1, v22 = v2 * v2, dP = 500 * (v12 - v22), dPk = dP / 1000, rg = g * rise, P2 = P1 + dPk - rg;
        if (P2 < 20) continue;
        const vals = { q: fv(q), v2, v12, v22, dP, dPk, P2 };
        if (rise) vals.rg = rg;
        return {
          prompt: `Water (density ${c(1000)} kg/m³) flows through a pipe that narrows from ${n(d1)} cm to ${n(d2)} cm in diameter${rise ? `, the narrow part being ${n(rise)} m higher than the wide part` : " and stays level"}. In the wide part the water moves at ${n(v1)} m/s and its pressure is ${n(P1)} kPa. What is the pressure in the narrow part, in kPa?${rise ? ` Take ${gTxt()}.` : ""} ${rnd(2)}`,
          steps: [
            `Continuity: ${s2} = ${s1}${M.sup(`(${frac(S("d", 1), S("d", 2))})`, 2)} = ${n(v1)} · ${M.f(q)} ${ap(v2)} m/s.`,
            `Bernoulli along the flow: ${S("P", 1)} + ${H}${V("ρ")}${s1}² + ${V("ρ")}${V("g")}${S("h", 1)} = ${S("P", 2)} + ${H}${V("ρ")}${s2}² + ${V("ρ")}${V("g")}${S("h", 2)}, so ${S("P", 2)} = ${S("P", 1)} + ${H}${V("ρ")}(${s1}² − ${s2}²)${rise ? ` − ${V("ρ")}${V("g")}(${S("h", 2)} − ${S("h", 1)})` : ""}.`,
            `${H}${V("ρ")}(${s1}² − ${s2}²) = ${H} · ${c(1000)} · (${n(v12)} − ${n(v22)}) ${ap(dP)} Pa ${ap(dPk)} kPa. Speeding up costs pressure.`,
            ...(rise ? [`Climbing ${n(rise)} m costs ${V("ρ")}${V("g")}Δ${V("h")} = ${c(1000)} · ${c(9.81)} · ${n(rise)} Pa = ${n(rg)} kPa.`] : []),
            `${S("P", 2)} = ${n(P1)} + ${np(dPk)}${rise ? ` − ${n(rg)}` : ""} ${ap(P2)} kPa.`,
          ],
          ...num(P2, "kPa", 2), vals, params: { d1, d2, v1, P1, rise },
        };
      }
    }),

    // ---- P.10 Viscosity & the Reynolds number ---------------------------------------------------------------
    "P.10": def("Viscosity and the Reynolds number", (r, level) => {
      if (level === 1) {
        for (;;) {
          const mu = r.pick([0.1, 0.2, 0.25, 0.5, 0.8]), h = r.pick([0.5, 1, 2, 2.5, 4, 5]), U = 0.5 * r.int(1, 10);
          const hm = h / 1000, grad = U / hm, tau = mu * grad;
          if (!isExact(grad, 2) || !isExact(tau, 2)) continue;
          return {
            prompt: `A flat plate slides at ${n(U)} m/s over a film of oil ${n(h)} mm thick that lies on a fixed surface. The oil's viscosity is ${n(mu)} Pa·s. Assuming the oil's velocity changes linearly across the film, what shear stress does the oil exert on the plate, in pascals?`,
            steps: [
              `The oil touching the fixed surface is at rest and the oil touching the plate moves with it, so the velocity gradient is ${frac(`d${V("u")}`, `d${V("y")}`)} = ${frac(V("U"), V("h"))} = ${frac(n(U), n(hm))} = ${n(grad)} s⁻¹ (with ${n(h)} mm = ${n(hm)} m).`,
              `Newton's law of viscosity: τ = μ${frac(`d${V("u")}`, `d${V("y")}`)} = ${n(mu)} · ${n(grad)} = ${n(tau)} Pa.`,
            ],
            ...num(tau, "Pa"), vals: { hm, grad, tau }, params: { mu, h, U },
          };
        }
      }
      if (level === 2) {
        const FL = [["water", 1000, "1.00", -3], ["blood", 1060, "3.5", -3], ["olive oil", 910, "8.1", -2], ["air", 1.2, "1.8", -5]];
        const target = r.pick([0, 1, 2]);
        for (;;) {
          const [name, dens, ms, me] = r.pick(FL), mu = parseFloat(ms) * Math.pow(10, me);
          const v = r.int(1, 100) / 20, D = r.pick([0.5, 1, 2, 2.5, 5, 10]), Dm = D / 100, Re = (dens * v * Dm) / mu;
          const reg = Re < 2300 ? 0 : Re <= 4000 ? 1 : 2;
          if (reg !== target || Math.abs(Re - 2300) < 100 || Math.abs(Re - 4000) < 150 || Re < 50) continue;
          const names = ["laminar", "transitional", "turbulent"];
          return {
            prompt: `${name[0].toUpperCase() + name.slice(1)} (density ${n(dens)} kg/m³, viscosity ${sciC(ms, me)} Pa·s) flows at ${n(v)} m/s through a pipe ${n(D)} cm in diameter. Is the flow laminar, transitional or turbulent?`,
            steps: [
              `The Reynolds number compares inertia with viscosity: Re = ${frac(`ρ${V("v")}${V("D")}`, "μ")}, a pure number.`,
              `With ${V("D")} = ${n(D)} cm = ${n(Dm)} m: Re = ${frac(`${n(dens)} · ${n(v)} · ${n(Dm)}`, sciC(ms, me))} ${ap(Re, 1)}.`,
              `In a pipe, Re &lt; ${c(2300)} is laminar, ${c(2300)} to ${c(4000)} is transitional and Re &gt; ${c(4000)} is turbulent, so this flow is ${names[reg]}.`,
            ],
            answer: { kind: "choice", options: names, index: reg }, answerText: `${names[reg]} (Re ${ap(Re, 0)})`,
            vals: { Dm, Re }, params: { dens, mu, v, D },
          };
        }
      }
      // level 3: Poiseuille's law, by ratios
      const [a, b] = r.pick([[1, 2], [2, 3], [3, 4], [4, 5], [9, 10], [3, 5]]), f = new Frac(a, b);
      if (r.chance(0.5)) {
        const fac = new Frac(b, a).pow(4);
        return {
          prompt: `Plaque narrows a short section of artery so that its radius falls to ${M.f(f)} of its original value. By what factor must the pressure difference across that section rise to keep the same blood flow rate? Assume laminar (Poiseuille) flow. ${rnd(2)}`,
          steps: [
            `Poiseuille's law: ${V("Q")} = ${frac(`π${V("r")}<sup>${c(4)}</sup>Δ${V("P")}`, `${c(8)}μ${V("L")}`)}. With ${V("Q")}, μ and ${V("L")} unchanged, Δ${V("P")} ∝ ${frac("1", `${V("r")}<sup>${c(4)}</sup>`)}.`,
            `${frac(`Δ${S("P", 2)}`, `Δ${S("P", 1)}`)} = ${M.sup(`(${frac(S("r", 1), S("r", 2))})`, c(4))} = ${M.sup(`(${M.f(new Frac(b, a))})`, c(4))} = ${M.f(fac)} ${ap(fac.value)}.`,
            `A modest narrowing needs a much larger pressure difference, because flow depends on the fourth power of the radius.`,
          ],
          ...num(fac.value, "", 2), answerText: `${n(fac.value, 2)} times`, vals: { fac: fv(fac) }, params: { kind: "dP", a, b },
        };
      }
      const Q1 = 5 * r.int(1, 20), f4 = f.pow(4), Q2 = Q1 * f4.value;
      return {
        prompt: `Water flows smoothly (laminar flow) at ${n(Q1)} mL/s through a narrow tube. The tube is replaced by one of the same length whose radius is ${M.f(f)} as large, with the same pressure difference. What is the new flow rate, in mL/s? ${rnd(2)}`,
        steps: [
          `Poiseuille's law: ${V("Q")} = ${frac(`π${V("r")}<sup>${c(4)}</sup>Δ${V("P")}`, `${c(8)}μ${V("L")}`)}. With Δ${V("P")}, μ and ${V("L")} unchanged, ${V("Q")} ∝ ${V("r")}<sup>${c(4)}</sup>.`,
          `${frac(S("Q", 2), S("Q", 1))} = ${M.sup(`(${M.f(f)})`, c(4))} = ${M.f(f4)}.`,
          `${S("Q", 2)} = ${n(Q1)} · ${M.f(f4)} ${ap(Q2)} mL/s.`,
        ],
        ...num(Q2, "mL/s", 2), vals: { f4: fv(f4), Q2 }, params: { kind: "Q", a, b, Q1 },
      };
    }),

    // ---- P.11 Drag & terminal velocity -----------------------------------------------------------------------
    "P.11": def("Drag and terminal velocity", (r, level) => {
      const air = () => `Take the air density as ${c(1.2)}0 kg/m³`;
      if (level === 1) {
        const car = r.chance(0.5);
        const Cd = car ? r.pick([0.25, 0.28, 0.3, 0.32, 0.35]) : 0.9, A = car ? r.pick([2, 2.2, 2.4]) : r.pick([0.4, 0.5]);
        const v = car ? r.int(10, 35) : r.int(5, 15), v2 = v * v, F = 0.5 * 1.2 * Cd * A * v2;
        return {
          prompt: `${car ? "A car" : "A cyclist"} with drag coefficient ${n(Cd)} and frontal area ${n(A)} m² moves at ${n(v)} m/s through still air. What is the drag force, in newtons? ${air()}. ${rnd(2)}`,
          steps: [
            `At everyday speeds drag grows with the square of speed: ${S("F", "D")} = ${H}${V("ρ")}${S("C", "D")}${V("A")}${V("v")}².`,
            `${S("F", "D")} = ${H} · ${c(1.2)}0 · ${n(Cd)} · ${n(A)} · ${n(v)}² = ${H} · ${c(1.2)}0 · ${n(Cd)} · ${n(A)} · ${n(v2)} ${ap(F)} N.`,
          ],
          ...num(F, "N", 2), vals: { v2, F }, params: { Cd, A, v },
        };
      }
      if (level === 2) {
        const [pose, Cd, A] = r.pick([["falling belly-down", 1.0, 0.7], ["diving head-down", 0.7, 0.18], ["hanging under an open parachute", 1.5, 25]]);
        const m = r.int(60, 100), num2 = 2 * m * g, den = 1.2 * Cd * A, q = num2 / den, v = Math.sqrt(q);
        return {
          prompt: `A skydiver of mass ${n(m)} kg (with gear) is ${pose}, with drag coefficient ${n(Cd)} and frontal area ${n(A)} m². What is the terminal velocity, in m/s? ${air()} and ${gTxt()}. ${rnd(2)}`,
          steps: [
            `At terminal velocity the drag balances the weight, so the acceleration is zero: ${H}${V("ρ")}${S("C", "D")}${V("A")}${V("v")}² = ${V("m")}${V("g")}, giving ${S("v", "t")} = ${M.sqrt(frac(`2${V("m")}${V("g")}`, `${V("ρ")}${S("C", "D")}${V("A")}`))}.`,
            `2${V("m")}${V("g")} = 2 · ${n(m)} · ${c(9.81)} = ${n(num2)} N and ${V("ρ")}${S("C", "D")}${V("A")} = ${c(1.2)}0 · ${n(Cd)} · ${n(A)} = ${n(den)} kg/m.`,
            `${S("v", "t")} = ${M.sqrt(frac(n(num2), n(den)))} ${ap(v)} m/s.`,
          ],
          ...num(v, "m/s", 2), vals: { num2, den, q, v }, params: { Cd, A, m },
        };
      }
      // level 3: power against drag scales as v³, or Stokes drag on a droplet
      if (r.chance(0.5)) {
        for (;;) {
          const v1 = 10 * r.int(5, 13), v2 = 10 * r.int(5, 13), P1 = r.int(5, 30);
          if (v1 === v2) continue;
          const q = new Frac(v2, v1), q3 = q.pow(3), P2 = P1 * q3.value;
          return {
            prompt: `At ${n(v1)} km/h a car's engine must deliver ${n(P1)} kW just to overcome air drag. How much power does overcoming drag take at ${n(v2)} km/h, in kilowatts? Assume quadratic drag. ${rnd(2)}`,
            steps: [
              `Power is force times speed, and quadratic drag is ${S("F", "D")} = ${H}${V("ρ")}${S("C", "D")}${V("A")}${V("v")}², so ${S("P", "drag")} = ${S("F", "D")}${V("v")} = ${H}${V("ρ")}${S("C", "D")}${V("A")}${V("v")}³ ∝ ${V("v")}³.`,
              `Only the ratio of speeds matters, so km/h can stay as km/h: ${frac(S("v", 2), S("v", 1))} = ${frac(n(v2), n(v1))} = ${M.f(q)}, and cubed ${M.f(q3)}.`,
              `${S("P", 2)} = ${n(P1)} · ${M.f(q3)} ${ap(P2)} kW.`,
            ],
            ...num(P2, "kW", 2), vals: { q: fv(q), q3: fv(q3), P2 }, params: { kind: "power", v1, v2, P1 },
          };
        }
      }
      const rr = r.int(5, 30), rm = rr * 1e-6, vals = {};
      const num2 = 2 * rm * rm * 1000 * g, den = 9 * 1.8e-5, v = num2 / den, vmm = v * 1000;
      const r2s = sci(vals, "r2", rm * rm), ns = sci(vals, "num2", num2), ds = sci(vals, "den", den);
      Object.assign(vals, { v, vmm });
      return {
        prompt: `A water droplet in a cloud has a radius of ${n(rr)} μm. Using Stokes drag, find its terminal speed in still air, in millimeters per second. Take the density of water as ${c(1000)} kg/m³, the viscosity of air as ${sciC("1.8", -5)} Pa·s and ${gTxt()}, and ignore the buoyancy of the air. ${rnd(2)}`,
        steps: [
          `A droplet this small moves at a tiny Reynolds number, so the drag is linear in speed (Stokes): ${S("F", "D")} = ${c(6)}πμ${V("r")}${V("v")}.`,
          `At terminal speed it balances the weight ${frac(c(4), c(3))}π${V("r")}³${V("ρ")}${V("g")}: ${c(6)}πμ${V("r")}${V("v")} = ${frac(c(4), c(3))}π${V("r")}³${V("ρ")}${V("g")}, so ${V("v")} = ${frac(`2${V("r")}²${V("ρ")}${V("g")}`, `${c(9)}μ`)}.`,
          `${V("r")} = ${n(rr)} × 10<sup>−${c(6)}</sup> m, so ${V("r")}² ≈ ${r2s} m². Numerator: 2 · ${r2s} · ${c(1000)} · ${c(9.81)} ≈ ${ns}; denominator: ${c(9)} · ${sciC("1.8", -5)} = ${ds}.`,
          `${V("v")} ${ap(v, 6)} m/s ${ap(vmm, 3)} mm/s.`,
        ],
        ...num(vmm, "mm/s", 2), vals, params: { kind: "stokes", rr },
      };
    }),

    // ---- P.12 Heat, temperature & phase change ---------------------------------------------------------------
    "P.12": def("Heat, temperature and phase change", (r, level) => {
      const MATS = [["water", 4186], ["aluminum", 900], ["copper", 385], ["iron", 450]];
      if (level === 1) {
        const [mat, cc] = r.pick(MATS), m = r.int(1, 50) / 10, T1 = r.int(5, 30), T2 = T1 + r.int(5, 70);
        const dT = T2 - T1, Q = m * cc * dT, Qk = Q / 1000;
        return {
          prompt: `How much heat does it take to warm ${n(m)} kg of ${mat} from ${n(T1)} °C to ${n(T2)} °C, in kilojoules? The specific heat of ${mat} is ${c(cc)} J/(kg·K). ${rnd(1)}`,
          steps: [
            `With no change of phase, the heat needed is ${V("Q")} = ${V("m")}${V("c")}Δ${V("T")}.`,
            `Δ${V("T")} = ${n(T2)} − ${n(T1)} = ${n(dT)} °C, which is also ${n(dT)} K (a change of 1 °C equals a change of 1 K).`,
            `${V("Q")} = ${n(m)} · ${c(cc)} · ${n(dT)} = ${n(Q)} J = ${n(Qk)} kJ.`,
          ],
          ...num(Qk, "kJ", 1), vals: { dT, Q, Qk }, params: { cc, m, T1, T2 },
        };
      }
      if (level === 2) {
        const [mat, c1] = r.pick(MATS.slice(1)), m1 = r.int(1, 10) / 10, T1 = 10 * r.int(8, 20), m2 = r.int(2, 20) / 10, T2 = r.int(10, 25);
        const C1 = m1 * c1, C2 = m2 * 4186, a = C1 * T1, b = C2 * T2, den = C1 + C2, Tf = (a + b) / den;
        return {
          prompt: `A ${n(m1)} kg block of ${mat} at ${n(T1)} °C is dropped into ${n(m2)} kg of water at ${n(T2)} °C in an insulated container. What is the final temperature, in °C? Specific heats: ${mat} ${c(c1)} J/(kg·K), water ${c(4186)} J/(kg·K). ${rnd(1)}`,
          steps: [
            `The container is insulated, so the heat lost by the metal equals the heat gained by the water: ${S("m", 1)}${S("c", 1)}(${S("T", 1)} − ${S("T", "f")}) = ${S("m", 2)}${S("c", 2)}(${S("T", "f")} − ${S("T", 2)}).`,
            `Heat capacities: ${S("m", 1)}${S("c", 1)} = ${n(m1)} · ${c(c1)} = ${n(C1)} J/K and ${S("m", 2)}${S("c", 2)} = ${n(m2)} · ${c(4186)} = ${n(C2)} J/K.`,
            `Solving for ${S("T", "f")}: ${S("T", "f")} = ${frac(`${S("m", 1)}${S("c", 1)}${S("T", 1)} + ${S("m", 2)}${S("c", 2)}${S("T", 2)}`, `${S("m", 1)}${S("c", 1)} + ${S("m", 2)}${S("c", 2)}`)} = ${frac(`${n(a)} + ${n(b)}`, `${n(C1)} + ${n(C2)}`)} = ${frac(n(a + b), n(den))} ${ap(Tf)} °C.`,
            `Check: ${n(Tf, 1)} °C lies between ${n(T2)} °C and ${n(T1)} °C, as it must.`,
          ],
          ...num(Tf, "°C", 1), vals: { C1, C2, a, b, ab: a + b, den, Tf }, params: { c1, m1, T1, m2, T2 },
        };
      }
      // level 3: heating through a phase change
      if (r.chance(0.5)) {
        const m = r.int(1, 10) / 10, Ti = -r.int(5, 30), Tf = r.int(10, 60);
        const Q1 = m * 2100 * -Ti, Q2 = m * 334000, Q3 = m * 4186 * Tf, Q = Q1 + Q2 + Q3, Qk = Q / 1000;
        return {
          prompt: `How much heat does it take to turn ${n(m)} kg of ice at ${n(Ti)} °C into water at ${n(Tf)} °C, in kilojoules? Use specific heats of ${c(2100)} J/(kg·K) for ice and ${c(4186)} J/(kg·K) for water, and a latent heat of fusion of ${sciC("3.34", 5)} J/kg. ${rnd(1)}`,
          steps: [
            `Three stages: warm the ice to 0 °C, melt it at 0 °C, then warm the water. Use ${V("Q")} = ${V("m")}${V("c")}Δ${V("T")} for the warming and ${V("Q")} = ${V("m")}${V("L")} for the melting.`,
            `Warm the ice: ${n(m)} · ${c(2100)} · (0 − ${np(Ti)}) = ${n(Q1)} J.`,
            `Melt it: ${n(m)} · ${sciC("3.34", 5)} = ${n(Q2)} J.`,
            `Warm the water: ${n(m)} · ${c(4186)} · (${n(Tf)} − 0) = ${n(Q3)} J.`,
            `Total: ${n(Q1)} + ${n(Q2)} + ${n(Q3)} = ${n(Q)} J = ${n(Qk)} kJ. Melting takes the largest share.`,
          ],
          ...num(Qk, "kJ", 1), vals: { Q1, Q2, Q3, Q, Qk }, params: { kind: "ice", m, Ti, Tf },
        };
      }
      const m = r.int(1, 10) / 10, T = r.int(20, 90), Q1 = m * 4186 * (100 - T), Q2 = m * 2.26e6, Q = Q1 + Q2, Qk = Q / 1000;
      return {
        prompt: `How much heat does it take to turn ${n(m)} kg of water at ${n(T)} °C into steam at 100 °C (at normal atmospheric pressure), in kilojoules? Use a specific heat of ${c(4186)} J/(kg·K) for water and a latent heat of vaporization of ${sciC("2.26", 6)} J/kg. ${rnd(1)}`,
        steps: [
          `Two stages: warm the water to its boiling point, 100 °C, with ${V("Q")} = ${V("m")}${V("c")}Δ${V("T")}, then boil it at constant temperature with ${V("Q")} = ${V("m")}${V("L")}.`,
          `Warm: ${n(m)} · ${c(4186)} · (100 − ${n(T)}) = ${n(Q1)} J.`,
          `Boil: ${n(m)} · ${sciC("2.26", 6)} = ${n(Q2)} J.`,
          `Total: ${n(Q1)} + ${n(Q2)} = ${n(Q)} J = ${n(Qk)} kJ. Boiling takes far more energy than warming.`,
        ],
        ...num(Qk, "kJ", 1), vals: { Q1, Q2, Q, Qk }, params: { kind: "steam", m, T }, consts: [100],
      };
    }),

    // ---- P.13 Conduction: Fourier's law & thermal resistance -------------------------------------------------
    "P.13": def("Conduction and thermal resistance", (r, level) => {
      const Qd = "<i>Q̇</i>", dT = `Δ${V("T")}`;
      if (level === 1) {
        for (;;) {
          const A = r.int(1, 8) / 2, L = r.pick([3, 4, 5, 6, 8, 10]), d = r.int(1, 6), Lm = L / 1000, Q = (0.8 * A * d) / Lm;
          if (!isExact(Q, 2)) continue;
          return {
            prompt: `A single-pane glass window ${n(A)} m² in area and ${n(L)} mm thick has its inner surface ${n(d)} °C warmer than its outer surface. The thermal conductivity of glass is ${c(0.8)} W/(m·K). At what rate does heat conduct through it, in watts?`,
            steps: [
              `Fourier's law for a uniform slab in steady state: ${Qd} = ${frac(`${V("k")}${V("A")}${dT}`, V("L"))}.`,
              `Thickness: ${n(L)} mm = ${n(Lm)} m. A temperature difference of ${n(d)} °C is ${n(d)} K.`,
              `${Qd} = ${frac(`${c(0.8)} · ${n(A)} · ${n(d)}`, n(Lm))} = ${n(Q)} W.`,
            ],
            ...num(Q, "W"), vals: { Lm, Q }, params: { A, L, d },
          };
        }
      }
      const STR = [["brick", 0.7, [0.1, 0.2]], ["concrete", 1.4, [0.15, 0.2, 0.3]], ["wood", 0.12, [0.02, 0.025, 0.05]]];
      const INS = [["fiberglass", 0.04, [0.05, 0.08, 0.1]], ["foam board", 0.03, [0.025, 0.05]]];
      const [n1, k1, L1s] = r.pick(STR), [n2, k2, L2s] = r.pick(INS), L1 = r.pick(L1s), L2 = r.pick(L2s);
      const A = r.int(5, 20), Tin = r.int(18, 22), Tout = r.int(-10, 10), d = Tin - Tout;
      const R1 = L1 / (k1 * A), R2 = L2 / (k2 * A), Rt = R1 + R2, Q = d / Rt;
      const prompt = `A wall ${n(A)} m² in area is made of ${n(L1)} m of ${n1} (${V("k")} = ${n(k1)} W/(m·K)) on the inside and ${n(L2)} m of ${n2} (${V("k")} = ${n(k2)} W/(m·K)) on the outside. The inner surface is at ${n(Tin)} °C and the outer surface at ${n(Tout)} °C.`;
      const steps = [
        `Layers in series act like resistors in series: each has ${S("R", "cond")} = ${frac(V("L"), `${V("k")}${V("A")}`)}, and ${Qd} = ${frac(dT, S("R", "total"))}.`,
        `${S("R", 1)} = ${frac(n(L1), `${n(k1)} · ${n(A)}`)} ${ap(R1, 5)} K/W and ${S("R", 2)} = ${frac(n(L2), `${n(k2)} · ${n(A)}`)} ${ap(R2, 5)} K/W.`,
        `${S("R", "total")} = ${n(R1, 5)} + ${n(R2, 5)} ${ap(Rt, 5)} K/W, and ${dT} = ${n(Tin)} − ${np(Tout)} = ${n(d)} K.`,
        `${Qd} = ${frac(n(d), n(Rt, 5))} ${ap(Q, 3)} W.`,
      ];
      if (level === 2) {
        return {
          prompt: `${prompt} At what rate does heat flow through the wall, in watts? ${rnd(1)}`,
          steps, ...num(Q, "W", 1), vals: { R1, R2, Rt, d, Q }, params: { k1, L1, k2, L2, A, Tin, Tout },
        };
      }
      const drop = Q * R1, Ti = Tin - drop;
      return {
        prompt: `${prompt} What is the temperature at the boundary between the two layers, in °C? ${rnd(1)}`,
        steps: [...steps, `The same heat flow crosses each layer, so the temperature falls by ${Qd}${S("R", 1)} across the ${n1}: ${n(Q, 3)} · ${n(R1, 5)} ${ap(drop, 3)} K.`, `Boundary temperature: ${n(Tin)} − ${n(drop, 3)} ${ap(Ti, 3)} °C. Most of the drop happens across the ${n2}, which has the larger resistance.`],
        ...num(Ti, "°C", 1), vals: { R1, R2, Rt, d, Q, drop, Ti }, params: { k1, L1, k2, L2, A, Tin, Tout },
      };
    }),

    // ---- P.14 Convection & Newton's law of cooling --------------------------------------------------------------
    "P.14": def("Convection and Newton's law of cooling", (r, level) => {
      const Ti = S("T", "∞");
      if (level === 1) {
        const h = r.pick([5, 10, 15, 25, 50, 100]), A = r.int(1, 20) / 10, Ts = r.int(40, 90), Tinf = r.int(15, 25), d = Ts - Tinf, Q = h * A * d;
        return {
          prompt: `A hot surface of area ${n(A)} m² at ${n(Ts)} °C is cooled by air at ${n(Tinf)} °C. The convection coefficient is ${n(h)} W/(m²·K). At what rate does the surface lose heat by convection, in watts?`,
          steps: [
            `Convective heat flow is proportional to the surface–fluid temperature gap: <i>Q̇</i> = ${V("h")}${V("A")}(${S("T", "s")} − ${Ti}).`,
            `Gap: ${n(Ts)} − ${n(Tinf)} = ${n(d)} K.`,
            `<i>Q̇</i> = ${n(h)} · ${n(A)} · ${n(d)} = ${n(Q)} W.`,
          ],
          ...num(Q, "W"), vals: { d, Q }, params: { h, A, Ts, Tinf },
        };
      }
      if (level === 2) {
        const tau = r.int(5, 30), t = r.int(2, 60), T0 = r.int(60, 95), Tinf = r.int(15, 25), D = T0 - Tinf, x = t / tau, ex = Math.exp(-x), T = Tinf + D * ex;
        return {
          prompt: `A mug of coffee at ${n(T0)} °C is left in a room at ${n(Tinf)} °C. It cools by Newton's law of cooling with a time constant of ${n(tau)} min. What is its temperature after ${n(t)} min, in °C? ${rnd(1)}`,
          steps: [
            `Newton's law of cooling: ${V("T")}(${V("t")}) = ${Ti} + (${S("T", "0")} − ${Ti})${M.sup("e", `−${V("t")}/τ`)}.`,
            `${S("T", "0")} − ${Ti} = ${n(T0)} − ${n(Tinf)} = ${n(D)} K, and ${V("t")}/τ = ${frac(n(t), n(tau))} ${ap(x)}, so ${M.sup("e", `−${n(x, 4)}`)} ${ap(ex)}.`,
            `${V("T")} = ${n(Tinf)} + ${n(D)} · ${n(ex, 4)} ${ap(T)} °C.`,
          ],
          ...num(T, "°C", 1), vals: { D, x, ex, T }, params: { tau, t, T0, Tinf },
        };
      }
      // level 3: read the halving time from a cooling curve
      const t1 = r.pick([4, 5, 6, 8, 10, 12, 15]), Tinf = r.int(15, 25), D = 16 * r.int(3, 6), T0 = Tinf + D, k = r.int(2, 4);
      const half = D / 2, T1 = Tinf + half, tau = t1 / Math.LN2, p2 = Math.pow(2, k), gap = D / p2, t = k * t1, Tk = Tinf + gap;
      const kind = r.pick(["time", "temp"]);
      const span = (k + 1.2) * t1;
      const gph = graph({
        view: [-0.12 * span, span, -0.08 * T0, T0 * 1.15],
        items: [
          { t: "fn", e: `${Tinf} + ${D}*2^(-x/${t1})`, role: "primary" },
          { t: "hline", y: Tinf, dash: true, role: "muted" },
          { t: "pt", x: 0, y: T0 }, { t: "pt", x: t1, y: T1 },
          { t: "text", x: 0.45 * t1 + 0.5, y: T0 + 0.05 * T0, s: `${fmt(T0)} °C` },
          { t: "text", x: t1 + 0.35 * t1, y: T1 + 0.06 * T0, s: `${fmt(t1)} min, ${fmt(T1)} °C` },
          { t: "text", x: 0.85 * span, y: Tinf + 0.05 * T0, s: `room ${fmt(Tinf)} °C` },
          { t: "text", x: 0.9 * span, y: -0.04 * T0, s: "t (min)" },
        ],
      });
      const steps = [
        `Newton's law of cooling: ${V("T")} − ${Ti} = (${S("T", "0")} − ${Ti})${M.sup("e", `−${V("t")}/τ`)}. The gap to room temperature shrinks by the same factor in every equal stretch of time.`,
        `From the graph, the gap starts at ${n(T0)} − ${n(Tinf)} = ${n(D)} K and is ${n(T1)} − ${n(Tinf)} = ${n(half)} K after ${n(t1)} min: it halves every ${n(t1)} min. (Equivalently ${M.sup("e", `−${n(t1)}/τ`)} = ${H}, so τ = ${frac(n(t1), "ln 2")} ${ap(tau, 3)} min.)`,
      ];
      if (kind === "time") {
        steps.push(`The target gap is ${n(Tk)} − ${n(Tinf)} = ${n(gap)} K = ${frac(n(D), n(p2))} K, which is ${n(k)} halvings, so ${V("t")} = ${n(k)} · ${n(t1)} = ${n(t)} min.`);
        return {
          prompt: `The graph shows a cup of tea cooling in a room at ${n(Tinf)} °C, following Newton's law of cooling. How long after the start does the tea reach ${n(Tk)} °C, in minutes?`,
          graph: gph, steps, ...num(t, "min"), vals: { D, half, T1, tau, gap, k, p2, t }, params: { kind, t1, Tinf, T0, Tk },
        };
      }
      steps.push(`${n(t)} min is ${n(t)} ÷ ${n(t1)} = ${n(k)} halving times, so the gap is ${frac(n(D), n(p2))} = ${n(gap)} K and ${V("T")} = ${n(Tinf)} + ${n(gap)} = ${n(Tk)} °C.`);
      return {
        prompt: `The graph shows a cup of tea cooling in a room at ${n(Tinf)} °C, following Newton's law of cooling. What is the tea's temperature ${n(t)} min after the start, in °C?`,
        graph: gph, steps, ...num(Tk, "°C"), vals: { D, half, T1, tau, gap, k, p2, Tk }, params: { kind, t1, Tinf, T0, t },
      };
    }),

    // ---- P.15 Biot number & lumped capacitance ---------------------------------------------------------------------
    "P.15": def("Biot number and the lumped model", (r, level) => {
      const SH = {
        sphere: ["solid sphere", "solid sphere", "radius", new Frac(1, 3), () => `${V("V")} = ${frac(c(4), c(3))}π${V("r")}³ and ${S("A", "s")} = ${c(4)}π${V("r")}², so ${S("L", "c")} = ${frac(V("r"), c(3))}`],
        cylinder: ["long solid cylinder (ignore its ends)", "long cylinder", "radius", new Frac(1, 2), () => `per unit length ${V("V")} = π${V("r")}² and ${S("A", "s")} = 2π${V("r")}, so ${S("L", "c")} = ${frac(V("r"), "2")}`],
        cube: ["solid cube", "cube", "side length", new Frac(1, 6), () => `${V("V")} = ${V("a")}³ and ${S("A", "s")} = ${c(6)}${V("a")}², so ${S("L", "c")} = ${frac(V("a"), c(6))}`],
      };
      const shape = r.pick(Object.keys(SH)), [sname, short, dim, cf, geo] = SH[shape];
      const sym = shape === "cube" ? V("a") : V("r");
      if (level === 1) {
        const x = r.int(3, 60), Lc = cf.mul(x);
        return {
          prompt: `A ${sname} has a ${dim} of ${n(x)} mm. What is its characteristic length ${S("L", "c")} = ${V("V")}/${S("A", "s")} (volume per unit surface area), in millimeters?`,
          steps: [`For a ${short}: ${geo()}.`, `${S("L", "c")} = ${M.f(cf)} · ${n(x)} = ${qs(Lc)} mm.`],
          ...numF(Lc, "mm"), vals: { Lc: fv(Lc) }, params: { shape, x },
        };
      }
      const MAT = [["copper", 400], ["aluminum", 237], ["steel", 50], ["brass", 110], ["glass", 1]];
      if (level === 2) {
        for (;;) {
          const [mat, k] = r.pick(MAT), h = r.pick([10, 20, 25, 50, 100, 200, 500, 1000]), x = r.int(3, 60);
          const Lc = cf.mul(x).div(1000), Bi = Lc.mul(h).div(k);
          if (!term(Bi) || !term(Lc) || Bi.value < 0.002 || Bi.value > 20) continue;
          const ok = Bi.value < 0.1;
          return {
            prompt: `A ${sname} made of ${mat}, with a ${dim} of ${n(x)} mm, is cooled by a fluid with a convection coefficient of ${n(h)} W/(m²·K). The thermal conductivity of ${mat} is ${n(k)} W/(m·K). Find its Biot number, and decide whether the lumped (uniform-temperature) model applies.`,
            steps: [
              `Characteristic length: ${geo()}. Here ${S("L", "c")} = ${M.f(cf)} · ${n(x)} mm = ${n(Lc.value)} m.`,
              `Bi = ${frac(`${V("h")}${S("L", "c")}`, S("k", "solid"))} = ${frac(`${n(h)} · ${n(Lc.value)}`, n(k))} = ${n(Bi.value)}.`,
              ok ? `Bi &lt; ${c(0.1)}, so heat moves inside the body much more easily than it leaves the surface: the lumped model applies.` : `Bi ≥ ${c(0.1)}, so the inside cannot keep up with the surface: the lumped model does not apply.`,
            ],
            ...num(Bi.value, ""), answerText: `Bi = ${n(Bi.value)}; the lumped model ${ok ? "applies" : "does not apply"}`, vals: { Lc: Lc.value, Bi: Bi.value }, params: { shape, k, h, x },
          };
        }
      }
      for (;;) {
        const [mat, k] = r.pick(MAT), h = r.pick([10, 20, 25, 50, 100, 200, 500, 1000]);
        const Lc = (0.1 * k) / h, inv = 1 / cf.value, x = Lc * inv, xmm = x * 1000;
        if (xmm < 1 || xmm > 500 || !isExact(xmm, 2) || !isExact(Lc, 6)) continue;
        return {
          prompt: `A ${sname} made of ${mat} is cooled by a fluid with a convection coefficient of ${n(h)} W/(m²·K). The thermal conductivity of ${mat} is ${n(k)} W/(m·K). What is the largest ${dim} for which the lumped model (valid for Bi &lt; ${c(0.1)}) can be used, in millimeters?`,
          steps: [
            `The lumped model needs Bi = ${frac(`${V("h")}${S("L", "c")}`, V("k"))} &lt; ${c(0.1)}. At the limit, ${S("L", "c")} = ${frac(`${c(0.1)}${V("k")}`, V("h"))} = ${frac(`${c(0.1)} · ${n(k)}`, n(h))} = ${n(Lc, 6)} m.`,
            `For a ${short}: ${geo()}, so ${sym} = ${n(inv)}${S("L", "c")} = ${n(inv)} · ${n(Lc, 6)} = ${n(x, 6)} m = ${n(xmm)} mm.`,
          ],
          ...num(xmm, "mm"), vals: { Lc, inv, x, xmm }, params: { shape, k, h },
        };
      }
    }),

    // ---- P.16 Natural convection: Nu, Pr, Gr & Ra ------------------------------------------------------------------
    "P.16": def("Natural convection: Nusselt and Rayleigh numbers", (r, level) => {
      const props = () => `For the air take β = 1/${c(300)} K⁻¹ (an ideal gas near ${c(300)} K), kinematic viscosity ν = ${sciC("1.6", -5)} m²/s, thermal diffusivity α = ${sciC("2.2", -5)} m²/s, and ${gTxt()}`;
      if (level === 1) {
        for (;;) {
          const [fl, k] = r.pick([["air", 0.026], ["water", 0.6]]), Nu = r.int(5, 200), L = r.pick([0.1, 0.2, 0.25, 0.5, 1, 2]), h = (Nu * k) / L;
          if (!isExact(h, 3)) continue;
          return {
            prompt: `For natural convection from a vertical plate ${n(L)} m tall into ${fl}, a correlation gives a Nusselt number of ${n(Nu)}. The thermal conductivity of ${fl} is ${n(k)} W/(m·K). What is the convection coefficient ${V("h")}, in W/(m²·K)?`,
            steps: [
              `The Nusselt number compares convective with purely conductive heat transfer: Nu = ${frac(`${V("h")}${V("L")}`, S("k", "fluid"))}.`,
              `So ${V("h")} = ${frac(`Nu · ${S("k", "fluid")}`, V("L"))} = ${frac(`${n(Nu)} · ${n(k)}`, n(L))} = ${n(h)} W/(m²·K).`,
            ],
            ...num(h, "W/(m²·K)"), vals: { h }, params: { Nu, k, L },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const Lmm = r.int(5, 30), d = r.int(2, 40), L = Lmm / 1000, L3 = L * L * L, num2 = (g * d * L3) / 300, na = 1.6e-5 * 2.2e-5, Ra = num2 / na;
          if (Math.abs(Ra - 1708) < 0.06 * 1708 || Ra < 100 || Ra > 1e5) continue;
          const vals = { L, Ra };
          const L3s = sci(vals, "L3", L3), ns = sci(vals, "num2", num2), nas = sci(vals, "na", na);
          const conv = Ra > 1708;
          return {
            prompt: `A horizontal layer of air ${n(Lmm)} mm thick lies between two plates; the lower plate is ${n(d)} K warmer than the upper one. Find the Rayleigh number of the layer and decide whether convection cells form (the critical value is about ${c(1708)}). ${props()}. ${rnd(0)}`,
            steps: [
              `Rayleigh number: Ra = ${frac(`${V("g")}βΔ${V("T")}${V("L")}³`, "να")}, buoyancy against the combined damping of viscosity and heat diffusion.`,
              `${V("L")} = ${n(Lmm)} mm = ${n(L)} m, so ${V("L")}³ ≈ ${L3s} m³.`,
              `Numerator: ${c(9.81)} · ${frac("1", c(300))} · ${n(d)} · ${L3s} ≈ ${ns}. Denominator: να = ${sciC("1.6", -5)} · ${sciC("2.2", -5)} = ${nas}.`,
              `Ra ${ap(Ra, 1)}, which is ${conv ? "above" : "below"} ${c(1708)}: ${conv ? "the layer overturns into convection cells" : "the layer stays still and heat crosses it by conduction only"}.`,
            ],
            ...num(Ra, "", 0), answerText: `Ra ${ap(Ra, 0)}; ${conv ? "convection starts" : "no convection (conduction only)"}`, vals, params: { Lmm, d },
          };
        }
      }
      const L = r.pick([0.2, 0.3, 0.5, 0.8, 1, 1.5, 2]), w = r.pick([0.5, 1, 2]), d = r.int(10, 60);
      const Ra = (g * d * L ** 3) / 300 / (1.6e-5 * 2.2e-5), lam = Ra < 1e9;
      const root = lam ? Math.pow(Ra, 0.25) : Math.cbrt(Ra), Nu = (lam ? 0.59 : 0.1) * root, h = (Nu * 0.026) / L, A = L * w, Q = h * A * d;
      const vals = { root, Nu, h, A, Q };
      const Ras = sci(vals, "Ra", Ra);
      return {
        prompt: `A vertical plate ${n(L)} m tall and ${n(w)} m wide is held ${n(d)} K above the surrounding air. Estimate the heat it loses from one face by natural convection, in watts. Use Nu = ${c(0.59)} Ra<sup>1/4</sup> when Ra &lt; 10<sup>${c(9)}</sup> (laminar) and Nu = ${c(0.1)}0 Ra<sup>1/3</sup> otherwise (turbulent), with Ra and Nu based on the height. ${props()}, and take the air's thermal conductivity as ${c(0.026)} W/(m·K). ${rnd(1)}`,
        steps: [
          `Rayleigh number: Ra = ${frac(`${V("g")}βΔ${V("T")}${V("L")}³`, "να")} = ${frac(`${c(9.81)} · (1/${c(300)}) · ${n(d)} · ${n(L)}³`, `${sciC("1.6", -5)} · ${sciC("2.2", -5)}`)} ≈ ${Ras}.`,
          `${lam ? `Ra &lt; 10<sup>${c(9)}</sup>: laminar, so Nu = ${c(0.59)} Ra<sup>1/4</sup>, with Ra<sup>1/4</sup> ${ap(root, 3)}` : `Ra ≥ 10<sup>${c(9)}</sup>: turbulent, so Nu = ${c(0.1)}0 Ra<sup>1/3</sup>, with Ra<sup>1/3</sup> ${ap(root, 3)}`}. So Nu ${ap(Nu, 3)}.`,
          `Convection coefficient: ${V("h")} = ${frac(`Nu · ${V("k")}`, V("L"))} = ${frac(`${n(Nu, 3)} · ${c(0.026)}`, n(L))} ${ap(h)} W/(m²·K).`,
          `Heat flow: <i>Q̇</i> = ${V("h")}${V("A")}Δ${V("T")}, with ${V("A")} = ${n(L)} · ${n(w)} = ${n(A)} m²: <i>Q̇</i> = ${n(h, 4)} · ${n(A)} · ${n(d)} ${ap(Q, 3)} W.`,
        ],
        ...num(Q, "W", 1), vals, params: { L, w, d }, consts: [3, 4],
      };
    }),

    // ---- P.17 Thermal radiation ---------------------------------------------------------------------------------------
    "P.17": def("Thermal radiation", (r, level) => {
      const sig = () => `σ = ${sciC("5.670", -8)} W/(m²·K⁴)`;
      if (level === 1) {
        const wien = `Wien's displacement law: ${S("λ", "max")}${V("T")} = ${V("b")} = ${sciC("2.898", -3)} m·K = ${sciC("2.898", 6)} nm·K.`;
        if (r.chance(0.5)) {
          const T = 100 * r.int(30, 120), L = 2.898e6 / T;
          return {
            prompt: `A star's surface temperature is ${n(T)} K. At what wavelength does its emission peak, in nanometers? ${rnd(0)}`,
            steps: [wien, `${S("λ", "max")} = ${frac(V("b"), V("T"))} = ${frac(sciC("2.898", 6), n(T))} ${ap(L, 2)} nm.`],
            ...num(L, "nm", 0), vals: { L }, params: { kind: "lam", T },
          };
        }
        const L = 10 * r.int(30, 100), T = 2.898e6 / L;
        return {
          prompt: `An object's thermal emission peaks at a wavelength of ${n(L)} nm. What is its temperature, in kelvin? ${rnd(0)}`,
          steps: [wien, `${V("T")} = ${frac(V("b"), S("λ", "max"))} = ${frac(sciC("2.898", 6), n(L))} ${ap(T, 2)} K.`],
          ...num(T, "K", 0), vals: { T }, params: { kind: "T", L },
        };
      }
      if (level === 2) {
        const e = r.int(6, 19) / 20, A = r.int(1, 50) / 100, T = 50 * r.int(8, 30), vals = {};
        const T4 = T ** 4, Pw = e * 5.67e-8 * A * T4;
        const T4s = sci(vals, "T4", T4, 4);
        vals.Pw = Pw;
        return {
          prompt: `A heating element with a surface area of ${n(A)} m² and emissivity ${n(e)} glows at ${n(T)} K. How much power does it radiate, in watts? Use ${sig()}. ${rnd(0)}`,
          steps: [
            `Stefan–Boltzmann law: ${V("P")} = εσ${V("A")}${V("T")}⁴, with ${V("T")} in kelvin.`,
            `${V("T")}⁴ = ${n(T)}⁴ ≈ ${T4s} K⁴.`,
            `${V("P")} = ${n(e)} · ${sciC("5.670", -8)} · ${n(A)} · ${T4s} ${ap(Pw, 2)} W.`,
          ],
          ...num(Pw, "W", 0), vals, params: { e, A, T },
        };
      }
      const Ts = r.int(32, 35), Tr = r.int(15, 25), A = r.int(15, 20) / 10, TsK = Ts + 273.15, TrK = Tr + 273.15, diff = TsK ** 4 - TrK ** 4, Pn = 0.97 * 5.67e-8 * A * diff;
      const vals = { TsK, TrK };
      const s1 = sci(vals, "Ts4", TsK ** 4, 4), s2 = sci(vals, "Tr4", TrK ** 4, 4), sd = sci(vals, "diff", diff, 4);
      vals.Pn = Pn;
      return {
        prompt: `A person's skin, of area ${n(A)} m² and emissivity ${c(0.97)}, is at ${n(Ts)} °C in a room whose walls are at ${n(Tr)} °C. What is the net power the person loses by thermal radiation, in watts? Use ${sig()}. ${rnd(1)}`,
        steps: [
          `Net radiative exchange: ${S("P", "net")} = εσ${V("A")}(${V("T")}⁴ − ${S("T", "surr")}⁴), with absolute temperatures.`,
          `In kelvin: ${V("T")} = ${n(Ts)} + ${c(273.15)} = ${n(TsK)} K and ${S("T", "surr")} = ${n(Tr)} + ${c(273.15)} = ${n(TrK)} K.`,
          `${n(TsK)}⁴ ≈ ${s1} and ${n(TrK)}⁴ ≈ ${s2}; the difference is ≈ ${sd} K⁴.`,
          `${S("P", "net")} = ${c(0.97)} · ${sciC("5.670", -8)} · ${n(A)} · ${sd} ${ap(Pn, 3)} W.`,
        ],
        ...num(Pn, "W", 1), vals, params: { Ts, Tr, A },
      };
    }),

    // ---- P.18 Ideal gas law & thermodynamics --------------------------------------------------------------------------
    "P.18": def("Ideal gas law and the first law", (r, level) => {
      const Rtxt = () => `${V("R")} = ${c(8.314)} J/(mol·K)`;
      if (level === 1) {
        if (r.chance(0.5)) {
          const nm = r.int(1, 10) / 2, Tc = r.int(0, 100), Vl = r.int(5, 50), TK = Tc + 273.15, Vm = Vl / 1000, Pa = (nm * 8.314 * TK) / Vm, kPa = Pa / 1000;
          return {
            prompt: `A sealed ${n(Vl)} L container holds ${n(nm)} mol of an ideal gas at ${n(Tc)} °C. What is the pressure, in kPa? Use ${Rtxt()}. ${rnd(1)}`,
            steps: [
              `Ideal gas law: ${V("P")}${V("V")} = ${V("n")}${V("R")}${V("T")}, with SI units and absolute temperature.`,
              `${V("T")} = ${n(Tc)} + ${c(273.15)} = ${n(TK)} K and ${V("V")} = ${n(Vl)} L = ${n(Vm)} m³.`,
              `${V("P")} = ${frac(`${V("n")}${V("R")}${V("T")}`, V("V"))} = ${frac(`${n(nm)} · ${c(8.314)} · ${n(TK)}`, n(Vm))} ${ap(Pa, 1)} Pa ${ap(kPa, 3)} kPa.`,
            ],
            ...num(kPa, "kPa", 1), vals: { TK, Vm, Pa, kPa }, params: { kind: "P", nm, Tc, Vl },
          };
        }
        const P = 10 * r.int(10, 30), Vl = r.int(5, 50), Tc = r.int(0, 100), TK = Tc + 273.15, PV = P * Vl, nm = PV / (8.314 * TK);
        return {
          prompt: `A tank with a volume of ${n(Vl)} L holds an ideal gas at ${n(P)} kPa and ${n(Tc)} °C. How many moles of gas does it contain? Use ${Rtxt()}. ${rnd(2)}`,
          steps: [
            `Ideal gas law: ${V("P")}${V("V")} = ${V("n")}${V("R")}${V("T")}, so ${V("n")} = ${frac(`${V("P")}${V("V")}`, `${V("R")}${V("T")}`)}.`,
            `SI units: ${V("P")} = ${n(P * 1000)} Pa, ${V("V")} = ${n(Vl / 1000)} m³, ${V("T")} = ${n(Tc)} + ${c(273.15)} = ${n(TK)} K. So ${V("P")}${V("V")} = ${n(PV)} J.`,
            `${V("n")} = ${frac(n(PV), `${c(8.314)} · ${n(TK)}`)} ${ap(nm)} mol.`,
          ],
          ...num(nm, "mol", 2), vals: { Ppa: P * 1000, Vm: Vl / 1000, TK, PV, nm }, params: { kind: "n", P, Vl, Tc },
        };
      }
      if (level === 2) {
        const P = 10 * r.int(10, 30), V1 = r.int(2, 10), exp = r.chance(0.5), dV = exp ? r.int(1, 5) : -r.int(1, Math.min(5, V1 - 1)), V2 = V1 + dV;
        const W = P * dV, Q = exp ? 50 * r.int(4, 40) : -50 * r.int(4, 40), dU = Q - W;
        return {
          prompt: `A gas in a cylinder is held at a constant pressure of ${n(P)} kPa while its volume ${exp ? "grows" : "shrinks"} from ${n(V1)} L to ${n(V2)} L. Meanwhile the gas ${Q > 0 ? `absorbs ${n(Q)} J of heat` : `gives off ${n(-Q)} J of heat`}. What is the change in the gas's internal energy, in joules?`,
          steps: [
            `First law: Δ${V("U")} = ${V("Q")} − ${V("W")}, with ${V("Q")} the heat added to the gas and ${V("W")} the work done by the gas.`,
            `At constant pressure ${V("W")} = ${V("P")}Δ${V("V")} = ${n(P)} kPa × (${n(V2)} − ${n(V1)}) L = ${n(P)} · ${np(dV)} = ${n(W)} J, since 1 kPa·L = 10<sup>${c(3)}</sup> Pa × 10<sup>−${c(3)}</sup> m³ = 1 J.${exp ? "" : " (Negative: the surroundings do work on the gas.)"}`,
            `${V("Q")} = ${n(Q)} J (${Q > 0 ? "heat in" : "heat out"}), so Δ${V("U")} = ${n(Q)} − ${np(W)} = ${n(dU)} J.`,
          ],
          ...num(dU, "J"), vals: { dV, W, dU }, params: { P, V1, V2, Q }, consts: [10],
        };
      }
      // level 3: net work of a cycle from a P–V diagram
      const V1 = r.int(1, 5), V2 = V1 + r.int(1, 6), P1 = 50 * r.int(2, 4), P2 = P1 + 50 * r.int(1, 6), cw = r.chance(0.6), tri = r.chance(0.5);
      let pts = tri ? [[V1, P1], [V1, P2], [V2, P1]] : [[V1, P1], [V1, P2], [V2, P2], [V2, P1]];
      if (!cw) pts = [pts[0], ...pts.slice(1).reverse()];
      const dV = V2 - V1, dP = P2 - P1, area = tri ? (dV * dP) / 2 : dV * dP, W = cw ? area : -area;
      const labels = ["A", "B", "C", "D"];
      const items = [{ t: "poly", p: pts, role: "secondary" }];
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length], m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], u = [(q[0] - p[0]) * 0.12, (q[1] - p[1]) * 0.12];
        items.push({ t: "vec", a: [r4(m[0] - u[0]), r4(m[1] - u[1])], b: [r4(m[0] + u[0]), r4(m[1] + u[1])], role: "primary" });
        items.push({ t: "pt", x: p[0], y: p[1], label: labels[i] });
      });
      items.push({ t: "text", x: V1, y: -25, s: fmt(V1) }, { t: "text", x: V2, y: -25, s: fmt(V2) }, { t: "text", x: -0.6, y: P1, s: fmt(P1) }, { t: "text", x: -0.6, y: P2, s: fmt(P2) },
        { t: "text", x: V2 + 1.2, y: 15, s: "V (L)" }, { t: "text", x: 0.9, y: P2 + 70, s: "P (kPa)" });
      return {
        prompt: `The graph shows a cycle that a gas runs through, ${pts.map((p, i) => labels[i]).join(" → ")} → A, with pressure in kPa and volume in liters. How much net work does the gas do per cycle, in joules? (Negative means net work is done on the gas.)`,
        graph: graph({ view: [-1.2, V2 + 2, -50, P2 + 90], items }),
        steps: [
          `On a ${V("P")}–${V("V")} diagram the work done by the gas along a path is the area under it (positive while the volume grows, negative while it shrinks). Around a closed cycle the net work is the enclosed area: positive if the cycle runs clockwise, negative if counter-clockwise.`,
          `Read the graph: ${V("V")} runs from ${n(V1)} L to ${n(V2)} L, so Δ${V("V")} = ${n(dV)} L; ${V("P")} runs from ${n(P1)} kPa to ${n(P2)} kPa, so Δ${V("P")} = ${n(dP)} kPa.`,
          tri ? `The cycle is a right triangle: area = ${H} · ${n(dV)} · ${n(dP)} = ${n(area)} kPa·L = ${n(area)} J (1 kPa·L = 1 J).` : `The cycle is a rectangle: area = ${n(dV)} · ${n(dP)} = ${n(area)} kPa·L = ${n(area)} J (1 kPa·L = 1 J).`,
          `It runs ${cw ? "clockwise" : "counter-clockwise"}, so the net work by the gas is ${n(W)} J${cw ? "" : " (net work is done on the gas, as in a refrigerator)"}.`,
        ],
        ...num(W, "J"), vals: { dV, dP, area, W }, params: { V1, V2, P1, P2, cw: cw ? 1 : 0, tri: tri ? 1 : 0 },
      };
    }),

    // ---- P.entropy Entropy & the second law -----------------------------------------------------------------------------
    "P.entropy": def("Entropy and the second law", (r, level) => {
      const TH = S("T", "H"), TC = S("T", "C");
      if (level === 1) {
        if (r.chance(0.5)) {
          const Th = 50 * r.int(8, 20), Tc = 10 * r.int(25, 35), ratio = Tc / Th, eta = 1 - ratio, pct = 100 * eta;
          return {
            prompt: `A heat engine runs between a hot reservoir at ${n(Th)} K and a cold reservoir at ${n(Tc)} K. What is the highest efficiency it could have, as a percentage? ${rnd(1)}`,
            steps: [
              `No engine can beat the Carnot efficiency: ${S("η", "Carnot")} = 1 − ${frac(TC, TH)}, with absolute temperatures.`,
              `${frac(TC, TH)} = ${frac(n(Tc), n(Th))} ${ap(ratio)}, so η ${ap(eta)}, about ${n(pct, 3)}%.`,
            ],
            ...num(pct, "%", 1), vals: { ratio, eta, pct }, params: { kind: "K", Th, Tc }, consts: [100],
          };
        }
        const thc = 50 * r.int(4, 12), tcc = r.int(10, 40), Th = thc + 273.15, Tc = tcc + 273.15, ratio = Tc / Th, eta = 1 - ratio, pct = 100 * eta;
        return {
          prompt: `A steam turbine takes in steam at ${n(thc)} °C and exhausts to cooling water at ${n(tcc)} °C. What is its maximum possible (Carnot) efficiency, as a percentage? ${rnd(1)}`,
          steps: [
            `Carnot efficiency: ${S("η", "Carnot")} = 1 − ${frac(TC, TH)}, and it needs absolute temperatures.`,
            `${TH} = ${n(thc)} + ${c(273.15)} = ${n(Th)} K and ${TC} = ${n(tcc)} + ${c(273.15)} = ${n(Tc)} K.`,
            `${frac(TC, TH)} = ${frac(n(Tc), n(Th))} ${ap(ratio)}, so η ${ap(eta)}, about ${n(pct, 3)}%.`,
          ],
          ...num(pct, "%", 1), vals: { Th, Tc, ratio, eta, pct }, params: { kind: "C", thc, tcc }, consts: [100],
        };
      }
      if (level === 2) {
        if (r.chance(0.5)) {
          const m = r.int(1, 20) / 10, Q = m * 334000, dS = Q / 273.15;
          return {
            prompt: `${n(m)} kg of ice melts at 0 °C. By how much does its entropy increase, in J/K? Use a latent heat of fusion of ${sciC("3.34", 5)} J/kg. ${rnd(1)}`,
            steps: [
              `Melting happens at constant temperature, so Δ${V("S")} = ${frac(V("Q"), V("T"))} with ${V("T")} in kelvin: 0 °C = ${c(273.15)} K.`,
              `Heat absorbed: ${V("Q")} = ${V("m")}${V("L")} = ${n(m)} · ${sciC("3.34", 5)} = ${n(Q)} J.`,
              `Δ${V("S")} = ${frac(n(Q), c(273.15))} ${ap(dS, 3)} J/K.`,
            ],
            ...num(dS, "J/K", 1), vals: { Q, dS }, params: { kind: "melt", m },
          };
        }
        const Q = 100 * r.int(5, 50), Th = 10 * r.int(40, 80), Tc = 10 * r.int(25, 35), sH = Q / Th, sC = Q / Tc, tot = sC - sH;
        return {
          prompt: `${n(Q)} J of heat leaks from a large reservoir at ${n(Th)} K to another at ${n(Tc)} K; both stay at constant temperature. What is the total entropy change of the two reservoirs, in J/K? ${rnd(3)}`,
          steps: [
            `Each reservoir stays at one temperature, so Δ${V("S")} = ${frac(V("Q"), V("T"))} for each, with ${V("Q")} positive for heat in.`,
            `Hot reservoir loses heat: Δ${S("S", "H")} = −${frac(n(Q), n(Th))} ${ap(-sH)} J/K. Cold reservoir gains it: Δ${S("S", "C")} = ${frac(n(Q), n(Tc))} ${ap(sC)} J/K.`,
            `Total: ${n(sC, 4)} − ${n(sH, 4)} ${ap(tot)} J/K. It is positive, as the second law requires for heat flowing from hot to cold.`,
          ],
          ...num(tot, "J/K", 3), vals: { sH, sC, tot }, params: { kind: "flow", Q, Th, Tc },
        };
      }
      if (r.chance(0.5)) {
        if (r.chance(0.5)) {
          const tin = r.int(18, 22), tout = r.int(-15, 5), PH = r.int(5, 15), Th = tin + 273.15, Tc = tout + 273.15, dT = Th - Tc, cop = Th / dT, Wk = PH / cop;
          return {
            prompt: `A heat pump keeps a house at ${n(tin)} °C while it is ${n(tout)} °C outside, delivering ${n(PH)} kW of heat. What is the least electrical power it could run on, in kW? ${rnd(2)}`,
            steps: [
              `The best possible heat pump is a reversed Carnot engine: ${S("COP", "HP")} = ${frac(S("Q", "H"), V("W"))} ≤ ${frac(TH, `${TH} − ${TC}`)}, with absolute temperatures.`,
              `${TH} = ${n(tin)} + ${c(273.15)} = ${n(Th)} K, ${TC} = ${n(tout)} + ${c(273.15)} = ${n(Tc)} K, and ${TH} − ${TC} = ${n(dT)} K.`,
              `${S("COP", "max")} = ${frac(n(Th), n(dT))} ${ap(cop)}, so the least power is ${frac(n(PH), n(cop, 4))} ${ap(Wk)} kW.`,
            ],
            ...num(Wk, "kW", 2), vals: { Th, Tc, dT, cop, Wk }, params: { kind: "pump", tin, tout, PH },
          };
        }
        const tin = -r.int(10, 18), tout = r.int(20, 28), PC = 10 * r.int(5, 30), Th = tout + 273.15, Tc = tin + 273.15, dT = Th - Tc, cop = Tc / dT, Ww = PC / cop;
        return {
          prompt: `A freezer holds its inside at ${n(tin)} °C in a kitchen at ${n(tout)} °C, removing heat from the inside at ${n(PC)} W. What is the least electrical power it could run on, in watts? ${rnd(1)}`,
          steps: [
            `The best possible refrigerator is a reversed Carnot engine: ${S("COP", "R")} = ${frac(S("Q", "C"), V("W"))} ≤ ${frac(TC, `${TH} − ${TC}`)}, with absolute temperatures.`,
            `${TC} = ${n(tin)} + ${c(273.15)} = ${n(Tc)} K, ${TH} = ${n(tout)} + ${c(273.15)} = ${n(Th)} K, and ${TH} − ${TC} = ${n(dT)} K.`,
            `${S("COP", "max")} = ${frac(n(Tc), n(dT))} ${ap(cop)}, so the least power is ${frac(n(PC), n(cop, 4))} ${ap(Ww)} W.`,
          ],
          ...num(Ww, "W", 1), vals: { Th, Tc, dT, cop, Ww }, params: { kind: "fridge", tin, tout, PC },
        };
      }
      for (;;) {
        const Th = 50 * r.int(8, 18), Tc = 10 * r.int(28, 32), carnot = 100 * (1 - Tc / Th), claim = Math.round(carnot) + r.pick([-12, -8, -5, -3, 3, 5, 8]);
        if (claim <= 5 || Math.abs(claim - carnot) < 1) continue;
        const ok = claim < carnot, ratio = Tc / Th;
        return {
          prompt: `An inventor claims an engine that takes heat from a source at ${n(Th)} K, dumps its waste heat at ${n(Tc)} K, and turns ${n(claim)}% of the heat it takes in into work. Is the claim possible? Answer yes or no.`,
          steps: [
            `The second law caps every heat engine at the Carnot efficiency, ${S("η", "Carnot")} = 1 − ${frac(TC, TH)}.`,
            `${frac(TC, TH)} = ${frac(n(Tc), n(Th))} ${ap(ratio)}, so ${S("η", "Carnot")} ${ap(carnot, 2)}%.`,
            ok ? `${n(claim)}% is below ${n(carnot, 2)}%, so the claim does not break the second law: it is possible (if hard to build).` : `${n(claim)}% is above ${n(carnot, 2)}%, so the engine would decrease the total entropy: the claim is impossible.`,
          ],
          answer: { kind: "text", accept: ok ? ["yes", "y"] : ["no", "n"] }, answerText: ok ? "Yes, it is below the Carnot limit." : "No, it exceeds the Carnot limit.", answerInput: ok ? "yes" : "no",
          vals: { ratio, carnot }, params: { kind: "claim", Th, Tc, claim }, consts: [100],
        };
      }
    }),

    // ---- P.19 Diffusion & the heat equation ------------------------------------------------------------------------------
    "P.19": def("Diffusion and the heat equation", (r, level) => {
      if (level === 1) {
        const [what, ms, me, liquid] = r.pick([["oxygen in water", "2.0", -9, true], ["glucose in water", "6.7", -10, true], ["carbon dioxide in air", "1.6", -5, false], ["water vapor in air", "2.4", -5, false]]);
        const Dv = parseFloat(ms) * Math.pow(10, me), unit = liquid ? "μm" : "mm", ue = liquid ? 6 : 3, vals = {};
        if (r.chance(0.5)) {
          const t = r.pick([1, 10, 60, 100, 600, 3600]), x = 2 * Dv * t, L = Math.sqrt(x), Lu = L * Math.pow(10, ue);
          const xs = sci(vals, "x", x);
          vals.Lu = Lu;
          return {
            prompt: `The diffusion coefficient of ${what} is ${sciC(ms, me)} m²/s. About how far does it spread by diffusion in ${n(t)} s, in ${liquid ? "micrometers (μm)" : "millimeters"}? Use the diffusion length ${S("L", "diff")} ≈ ${M.sqrt(`2${V("D")}${V("t")}`)}. ${rnd(1)}`,
            steps: [
              `Random molecular steps spread a substance a distance that grows like the square root of time: ${S("L", "diff")} ≈ ${M.sqrt(`2${V("D")}${V("t")}`)}.`,
              `2${V("D")}${V("t")} = 2 · ${sciC(ms, me)} · ${n(t)} ≈ ${xs} m².`,
              `${S("L", "diff")} ≈ ${M.sqrt(xs)} m ${ap(Lu, 3)} ${unit} (1 ${unit} = 10<sup>−${c(ue)}</sup> m).`,
            ],
            ...num(Lu, unit, 1), vals, params: { kind: "L", D: Dv, t, ue },
          };
        }
        const Lum = r.pick([5, 10, 20, 50, 100]), Lm = Lum * Math.pow(10, -ue), t = (Lm * Lm) / (2 * Dv), tms = t * 1000;
        const L2s = sci(vals, "L2", Lm * Lm), Ds = sci(vals, "twoD", 2 * Dv);
        Object.assign(vals, { t, tms });
        return {
          prompt: `The diffusion coefficient of ${what} is ${sciC(ms, me)} m²/s. Roughly how long does it take to diffuse ${n(Lum)} ${unit}, in milliseconds? Use the diffusion length ${S("L", "diff")} ≈ ${M.sqrt(`2${V("D")}${V("t")}`)}. ${rnd(1)}`,
          steps: [
            `Square ${S("L", "diff")} ≈ ${M.sqrt(`2${V("D")}${V("t")}`)} and solve for the time: ${V("t")} ≈ ${frac(`${V("L")}²`, `2${V("D")}`)}.`,
            `${V("L")} = ${n(Lum)} ${unit} = ${n(Lum)} × 10<sup>−${c(ue)}</sup> m, so ${V("L")}² ≈ ${L2s} m², and 2${V("D")} = ${Ds} m²/s.`,
            `${V("t")} ≈ ${frac(L2s, Ds)} ${ap(t, 6)} s ${ap(tms, 3)} ms.`,
          ],
          ...num(tms, "ms", 1), vals, params: { kind: "t", D: Dv, Lum, ue },
        };
      }
      if (level === 2) {
        const [ms, me] = r.pick([["1.0", -9], ["2.0", -9], ["5.0", -10]]), Dv = parseFloat(ms) * Math.pow(10, me);
        const C1 = 10 * r.int(2, 10), C2 = C1 - 10 * r.int(1, C1 / 10), dmm = r.int(1, 10), dm = dmm / 1000, grad = (C2 - C1) / dm, J = -Dv * grad, Jmu = J * 1e6;
        const vals = { dm, grad, Jmu };
        const Js = sci(vals, "J", J);
        return {
          prompt: `The graph shows the steady concentration of a dissolved gas across a membrane ${n(dmm)} mm thick (concentration in mol/m³ against position in mm). The gas's diffusion coefficient in the membrane is ${sciC(ms, me)} m²/s. What is the diffusion flux through the membrane, in μmol/(m²·s)? ${rnd(2)}`,
          graph: graph({
            view: [-0.25 * dmm - 0.3, dmm * 1.35 + 0.3, -0.12 * C1, C1 * 1.25],
            items: [
              { t: "seg", a: [0, C1], b: [dmm, C2], role: "primary" },
              { t: "pt", x: 0, y: C1 }, { t: "pt", x: dmm, y: C2 },
              { t: "text", x: 0.25 * dmm + 0.2, y: C1 + 0.08 * C1, s: fmt(C1) },
              { t: "text", x: dmm + 0.15 * dmm + 0.1, y: C2 + 0.08 * C1, s: fmt(C2) },
              { t: "text", x: dmm, y: -0.07 * C1, s: fmt(dmm) },
              { t: "text", x: 1.25 * dmm, y: 0.05 * C1, s: "x (mm)" },
              { t: "text", x: 0.15 * dmm + 0.6, y: 1.18 * C1, s: "C (mol/m³)" },
            ],
          }),
          steps: [
            `Fick's first law: ${V("J")} = −${V("D")}${frac(`d${V("C")}`, `d${V("x")}`)}. The profile is a straight line, so the gradient is its slope.`,
            `Read the graph: ${V("C")} falls from ${n(C1)} to ${n(C2)} mol/m³ across ${n(dmm)} mm = ${n(dm)} m, so the slope is ${frac(`${n(C2)} − ${n(C1)}`, n(dm))} = ${n(grad)} mol/m⁴.`,
            `${V("J")} = −${sciC(ms, me)} · ${np(grad)} ≈ ${Js} mol/(m²·s) ${ap(Jmu, 4)} μmol/(m²·s), flowing toward +${V("x")}, down the gradient.`,
          ],
          ...num(Jmu, "μmol/(m²·s)", 2), vals, params: { D: Dv, C1, C2, dmm },
        };
      }
      for (;;) {
        const [mat, al] = r.pick([["steel", 12], ["aluminum", 97], ["copper", 111], ["brass", 34]]), dx = r.pick([5, 10, 20, 25, 50]);
        const Tm = r.int(20, 80), Tl = Tm + r.int(-15, 15), Tr = Tm + r.int(-15, 15), s = Tl - 2 * Tm + Tr;
        if (s === 0) continue;
        const dx2 = dx * dx, rate = (al * s) / dx2;
        if (!isExact(rate, 4)) continue;
        return {
          prompt: `Along a ${mat} rod (thermal diffusivity ${n(al)} mm²/s), three points ${n(dx)} mm apart read ${n(Tl)} °C, ${n(Tm)} °C and ${n(Tr)} °C at one instant. Using the heat equation with a finite-difference estimate of the curvature, how fast is the middle point's temperature changing, in K/s (negative means cooling)?`,
          graph: graph({
            view: [-1.6 * dx, 1.6 * dx, Math.min(Tl, Tm, Tr) - 10, Math.max(Tl, Tm, Tr) + 10],
            items: [
              { t: "seg", a: [-dx, Tl], b: [dx, Tr], dash: true, role: "muted" },
              { t: "pt", x: -dx, y: Tl, label: `${fmt(Tl)} °C` }, { t: "pt", x: 0, y: Tm, label: `${fmt(Tm)} °C` }, { t: "pt", x: dx, y: Tr, label: `${fmt(Tr)} °C` },
            ],
          }),
          steps: [
            `Heat equation: ${frac(`∂${V("T")}`, `∂${V("t")}`)} = α${frac(`∂²${V("T")}`, `∂${V("x")}²`)}. Estimate the curvature from three equally spaced points: ${frac(`∂²${V("T")}`, `∂${V("x")}²`)} ≈ ${frac(`${S("T", "left")} − 2${S("T", "mid")} + ${S("T", "right")}`, `Δ${V("x")}²`)}.`,
            `Second difference: ${n(Tl)} − 2 · ${n(Tm)} + ${n(Tr)} = ${n(s)} K, and Δ${V("x")}² = ${n(dx)}² = ${n(dx2)} mm².`,
            `${frac(`∂${V("T")}`, `∂${V("t")}`)} ≈ ${n(al)} mm²/s · ${frac(`${n(s)} K`, `${n(dx2)} mm²`)} = ${n(rate)} K/s (the mm² cancel). The middle point is ${s > 0 ? "colder than the average of its neighbors, so it warms" : "hotter than the average of its neighbors, so it cools"}.`,
          ],
          ...num(rate, "K/s"), vals: { s, dx2, rate }, params: { al, dx, Tl, Tm, Tr },
        };
      }
    }),

    // ---- P.coulomb Coulomb's law, electric field & potential --------------------------------------------------------
    "P.coulomb": def("Coulomb's law, field and potential", (r, level) => {
      const kTxt = () => `${V("k")} = ${sciC("8.99", 9)} N·m²/C²`;
      const qtxt = (q) => `${q > 0 ? "+" : "−"}${n(Math.abs(q))} μC`;
      if (level === 1) {
        const q1 = r.sign() * r.int(1, 9), q2 = r.sign() * r.int(1, 9), rc = 5 * r.int(1, 10);
        const prod = Math.abs(q1 * q2), kq = 8.99e-3 * prod, rm = rc / 100, r2 = rm * rm, F = kq / r2;
        const rep = q1 * q2 > 0;
        return {
          prompt: `Two small charged spheres, ${qtxt(q1)} and ${qtxt(q2)}, are ${n(rc)} cm apart. What is the magnitude of the electric force between them, in newtons? Use ${kTxt()}. ${rnd(2)}`,
          steps: [
            `Coulomb's law: ${V("F")} = ${frac(`${V("k")}|${S("q", 1)}${S("q", 2)}|`, `${V("r")}²`)}. Convert to SI: 1 μC = 10<sup>−${c(6)}</sup> C and ${V("r")} = ${n(rc)} cm = ${n(rm)} m.`,
            `${V("k")}|${S("q", 1)}${S("q", 2)}| = ${sciC("8.99", 9)} · ${n(prod)} × 10<sup>−${c(12)}</sup> ${ap(kq, 5)} N·m², and ${V("r")}² = ${n(r2)} m².`,
            `${V("F")} = ${frac(n(kq, 5), n(r2))} ${ap(F)} N. The charges have ${rep ? "the same sign, so the force is repulsive" : "opposite signs, so the force is attractive"}.`,
          ],
          ...num(F, "N", 2), vals: { prod, kq, rm, r2, F }, params: { q1, q2, rc },
        };
      }
      if (level === 2) {
        if (r.chance(0.5)) {
          const Vv = 50 * r.int(2, 20), dmm = r.pick([1, 2, 4, 5, 8, 10, 20, 25]), q = r.int(1, 20), dm = dmm / 1000, E = Vv / dm, FmN = q * E * 1e-6;
          return {
            prompt: `Two large parallel metal plates ${n(dmm)} mm apart are held at a potential difference of ${n(Vv)} V. A tiny dust grain carrying ${n(q)} nC of charge sits between them. What force does the field exert on it, in millinewtons (mN)?`,
            steps: [
              `Between large parallel plates the field is uniform: ${V("E")} = ${frac(`Δ${V("V")}`, V("d"))} = ${frac(n(Vv), n(dm))} = ${n(E)} V/m (with ${n(dmm)} mm = ${n(dm)} m; 1 V/m = 1 N/C).`,
              `Force on a charge: ${V("F")} = ${V("q")}${V("E")} = ${n(q)} × 10<sup>−${c(9)}</sup> C · ${n(E)} N/C = ${n(FmN)} × 10<sup>−${c(3)}</sup> N = ${n(FmN)} mN.`,
            ],
            ...num(FmN, "mN"), vals: { dm, E, FmN }, params: { kind: "plates", Vv, dmm, q }, consts: [10],
          };
        }
        const q = r.sign() * r.int(1, 9), rr = r.pick([0.1, 0.2, 0.25, 0.5, 1, 2]), Vv = (8990 * q) / rr, kV = Vv / 1000;
        return {
          prompt: `What is the electric potential ${n(rr)} m from a point charge of ${qtxt(q)}, in kilovolts? Take the potential to be zero far away, and use ${kTxt()}.`,
          steps: [
            `Potential of a point charge: ${V("V")} = ${frac(`${V("k")}${V("q")}`, V("r"))}, a signed scalar (no direction).`,
            `${V("k")}${V("q")} = ${sciC("8.99", 9)} · ${np(q)} × 10<sup>−${c(6)}</sup> = ${n(8990 * q)} V·m.`,
            `${V("V")} = ${frac(n(8990 * q), n(rr))} = ${n(Vv)} V = ${n(kV)} kV.`,
          ],
          ...num(kV, "kV"), vals: { kq: 8990 * q, Vv, kV }, params: { kind: "pot", q, rr },
        };
      }
      for (;;) {
        const q1 = r.sign() * r.int(1, 9), q2 = r.sign() * r.int(1, 9), D = r.int(2, 10) / 10, p = r.int(-5, Math.round(D * 10) + 5) / 10;
        const r1 = P.round(Math.abs(p), 4), r2 = P.round(Math.abs(p - D), 4);
        if (r1 < 0.1 || r2 < 0.1) continue;
        const E1 = (8990 * Math.abs(q1)) / (r1 * r1), E2 = (8990 * Math.abs(q2)) / (r2 * r2);
        const s1 = Math.sign(q1) * Math.sign(p), s2 = Math.sign(q2) * Math.sign(p - D), Ex = s1 * E1 + s2 * E2, Exk = Ex / 1000;
        if (Math.abs(Ex) < 0.05 * (E1 + E2)) continue;
        const dirTxt = (s, q, i) => `pointing ${s > 0 ? "right (+" + V("x") + ")" : "left (−" + V("x") + ")"}, ${q > 0 ? `away from ${S("q", i)}` : `toward ${S("q", i)}`}`;
        return {
          prompt: `Point charges ${S("q", 1)} = ${qtxt(q1)} and ${S("q", 2)} = ${qtxt(q2)} sit on the ${V("x")}-axis at ${V("x")} = 0 and ${V("x")} = ${n(D)} m. What is the ${V("x")}-component of the electric field at point P, ${V("x")} = ${n(p)} m, in kN/C (positive means toward +${V("x")})? Use ${kTxt()}. ${rnd(2)}`,
          graph: graph({
            view: [Math.min(0, p) - 0.25, Math.max(D, p) + 0.25, -0.3, 0.3], equal: true, axes: false, grid: false,
            items: [
              { t: "seg", a: [Math.min(0, p) - 0.2, 0], b: [Math.max(D, p) + 0.2, 0], role: "muted" },
              { t: "pt", x: 0, y: 0, label: `q₁ = ${q1 > 0 ? "+" : "−"}${Math.abs(q1)} μC`, role: q1 > 0 ? "primary" : "secondary" },
              { t: "pt", x: D, y: 0, label: `q₂ = ${q2 > 0 ? "+" : "−"}${Math.abs(q2)} μC`, role: q2 > 0 ? "primary" : "secondary" },
              { t: "pt", x: p, y: 0, label: "P", role: "highlight" },
            ],
          }),
          steps: [
            `Superposition: add the fields of the two charges. Each has magnitude ${V("E")} = ${frac(`${V("k")}|${V("q")}|`, `${V("r")}²`)} and points away from a positive charge, toward a negative one. With ${V("k")} = ${sciC("8.99", 9)} and 1 μC = 10<sup>−${c(6)}</sup> C, ${V("k")}|${V("q")}| = ${c(8990)}|${V("q")}| (in μC) N·m²/C.`,
            `From ${S("q", 1)}: ${S("r", 1)} = ${n(r1)} m, ${S("E", 1)} = ${frac(`${c(8990)} · ${n(Math.abs(q1))}`, `${n(r1)}²`)} ${ap(E1, 1)} N/C, ${dirTxt(s1, q1, 1)}.`,
            `From ${S("q", 2)}: ${S("r", 2)} = ${n(r2)} m, ${S("E", 2)} = ${frac(`${c(8990)} · ${n(Math.abs(q2))}`, `${n(r2)}²`)} ${ap(E2, 1)} N/C, ${dirTxt(s2, q2, 2)}.`,
            `${S("E", "x")} = ${s1 > 0 ? "" : "−"}${n(E1, 1)} ${s2 > 0 ? "+" : "−"} ${n(E2, 1)} ${ap(Ex, 1)} N/C ${ap(Exk, 4)} kN/C.`,
          ],
          ...num(Exk, "kN/C", 2), vals: { r1, r2, E1, E2, Ex, Exk }, params: { q1, q2, D, p },
        };
      }
    }),

    // ---- P.20 Electric circuits: Ohm's law & power ------------------------------------------------------------------
    "P.20": def("Circuits: Ohm's law and power", (r, level) => {
      const Om = "Ω";
      if (level === 1) {
        const kind = r.pick(["I", "P", "I2R"]);
        for (;;) {
          if (kind === "I") {
            const Vv = r.pick([1.5, 3, 4.5, 6, 9, 12, 24, 120, 230]), R = r.int(1, 100), I = Vv / R;
            if (!isExact(I, 3)) continue;
            return {
              prompt: `A ${n(R)} ${Om} resistor is connected across a ${n(Vv)} V supply. What current flows through it, in amperes?`,
              steps: [`Ohm's law: ${V("V")} = ${V("I")}${V("R")}, so ${V("I")} = ${frac(V("V"), V("R"))} = ${frac(n(Vv), n(R))} = ${n(I)} A.`],
              ...num(I, "A"), vals: { I }, params: { kind, Vv, R },
            };
          }
          if (kind === "P") {
            const Vv = r.pick([6, 9, 12, 24, 120, 230]), R = r.int(2, 100), Pw = (Vv * Vv) / R;
            if (!isExact(Pw, 2)) continue;
            return {
              prompt: `A heating coil with a resistance of ${n(R)} ${Om} runs on ${n(Vv)} V. How much power does it dissipate, in watts?`,
              steps: [`With voltage and resistance known, use ${V("P")} = ${frac(`${V("V")}²`, V("R"))} (from ${V("P")} = ${V("I")}${V("V")} and ${V("I")} = ${V("V")}/${V("R")}).`, `${V("P")} = ${frac(`${n(Vv)}²`, n(R))} = ${frac(n(Vv * Vv), n(R))} = ${n(Pw)} W.`],
              ...num(Pw, "W"), vals: { V2: Vv * Vv, Pw }, params: { kind, Vv, R },
            };
          }
          const I = r.pick([0.5, 1, 1.5, 2, 2.5, 3]), R = r.int(2, 100), Pw = I * I * R;
          return {
            prompt: `A current of ${n(I)} A flows through a ${n(R)} ${Om} resistor. How much power does it dissipate, in watts?`,
            steps: [`With current and resistance known, use ${V("P")} = ${V("I")}²${V("R")}.`, `${V("P")} = ${n(I)}² · ${n(R)} = ${n(I * I)} · ${n(R)} = ${n(Pw)} W.`],
            ...num(Pw, "W"), vals: { I2: I * I, Pw }, params: { kind, I, R },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const [R2, R3] = r.pick([[6, 3], [4, 4], [12, 6], [20, 30], [10, 15], [12, 4], [30, 60], [10, 40], [8, 8], [20, 20], [12, 12], [6, 12], [15, 10]]);
          const R1 = r.int(1, 20), Vv = r.pick([6, 9, 12, 18, 24]), prod = R2 * R3, sum = R2 + R3, Rp = prod / sum, Rt = R1 + Rp, I = Vv / Rt;
          if (!isExact(I, 4)) continue;
          const ask = r.pick(["I", "P"]), Pw = Vv * I;
          const box = (x, y, vert, lab) => ({ t: "poly", p: vert ? [[x - 0.2, y - 0.5], [x + 0.2, y - 0.5], [x + 0.2, y + 0.5], [x - 0.2, y + 0.5]] : [[x - 0.5, y - 0.2], [x + 0.5, y - 0.2], [x + 0.5, y + 0.2], [x - 0.5, y + 0.2]], label: lab, role: "secondary" });
          const steps = [
            `${S("R", 2)} and ${S("R", 3)} are in parallel (same voltage across each): ${S("R", "∥")} = ${frac(`${S("R", 2)}${S("R", 3)}`, `${S("R", 2)} + ${S("R", 3)}`)} = ${frac(`${n(R2)} · ${n(R3)}`, `${n(R2)} + ${n(R3)}`)} = ${frac(n(prod), n(sum))} = ${n(Rp)} ${Om}.`,
            `That pair is in series with ${S("R", 1)} (same current through both): ${S("R", "total")} = ${n(R1)} + ${n(Rp)} = ${n(Rt)} ${Om}.`,
            `Ohm's law for the whole circuit: ${V("I")} = ${frac(V("V"), S("R", "total"))} = ${frac(n(Vv), n(Rt))} = ${n(I)} A.`,
          ];
          if (ask === "P") steps.push(`Power delivered by the battery: ${V("P")} = ${V("I")}${V("V")} = ${n(I)} · ${n(Vv)} = ${n(Pw)} W.`);
          return {
            prompt: `A ${n(Vv)} V battery drives a circuit in which ${S("R", 1)} = ${n(R1)} ${Om} is in series with a parallel pair ${S("R", 2)} = ${n(R2)} ${Om} and ${S("R", 3)} = ${n(R3)} ${Om}. ${ask === "I" ? "What current does the battery supply, in amperes?" : "How much power does the battery deliver, in watts?"}`,
            graph: graph({
              view: [-0.8, 6.8, -0.8, 4.8], equal: true, axes: false, grid: false,
              items: [
                { t: "seg", a: [0, 0], b: [0, 1.6] }, { t: "seg", a: [0, 2.4], b: [0, 4] },
                { t: "seg", a: [-0.4, 1.6], b: [0.4, 1.6], role: "primary" }, { t: "seg", a: [-0.2, 2.4], b: [0.2, 2.4], role: "primary" },
                { t: "text", x: -0.6, y: 2, s: `${fmt(Vv)} V` },
                { t: "seg", a: [0, 4], b: [1.5, 4] }, box(2, 4, false, "R₁"), { t: "seg", a: [2.5, 4], b: [4, 4] },
                { t: "seg", a: [4, 4], b: [6, 4] }, { t: "seg", a: [4, 4], b: [4, 2.5] }, box(4, 2, true, "R₂"), { t: "seg", a: [4, 1.5], b: [4, 0] },
                { t: "seg", a: [6, 4], b: [6, 2.5] }, box(6, 2, true, "R₃"), { t: "seg", a: [6, 1.5], b: [6, 0] },
                { t: "seg", a: [0, 0], b: [6, 0] },
              ],
            }),
            steps, ...num(ask === "I" ? I : Pw, ask === "I" ? "A" : "W"), vals: ask === "I" ? { prod, sum, Rp, Rt, I } : { prod, sum, Rp, Rt, I, Pw }, params: { ask, R1, R2, R3, Vv }, consts: [3],
          };
        }
      }
      if (r.chance(0.5)) {
        const [dev, Pw] = r.pick([["space heater", 1500], ["electric kettle", 2000], ["refrigerator", 150], ["LED bulb", 10], ["desktop computer", 400], ["air conditioner", 3500], ["television", 120]]);
        const hrs = r.pick([0.5, 1, 2, 3, 4, 6, 8, 10, 12, 24]), days = r.pick([30, 31, 365]), price = r.int(10, 35) / 100;
        const kW = Pw / 1000, E = kW * hrs * days, cost = E * price;
        return {
          prompt: `A ${Pw} W ${dev} runs ${n(hrs)} hours a day for ${n(days)} days. Electricity costs ${P.money(price)} per kilowatt-hour. What does the electricity cost, in dollars? ${rnd(2)}`,
          steps: [
            `Energy is power times time: ${V("E")} = ${V("P")}${V("t")}. Utilities bill in kilowatt-hours, so use kW and hours (1 kWh = ${sciC("3.6", 6)} J).`,
            `${V("P")} = ${n(Pw)} W = ${n(kW)} kW and ${V("t")} = ${n(hrs)} · ${n(days)} = ${n(hrs * days)} h, so ${V("E")} = ${n(kW)} · ${n(hrs * days)} = ${n(E)} kWh.`,
            `Cost: ${n(E)} kWh × ${P.money(price)}/kWh ${ap(cost)} dollars, that is ${P.money(cost)}.`,
          ],
          ...num(cost, "dollars", 2), answerText: P.money(cost), vals: { kW, ht: hrs * days, E, cost }, params: { kind: "cost", Pw, hrs, days, price },
        };
      }
      const L = 5 * r.int(2, 20), d = r.pick([0.5, 0.8, 1, 1.5, 2, 2.5]), dm = d / 1000, A = (Math.PI * dm * dm) / 4, R = (1.68e-8 * L) / A;
      const vals = { dm, R };
      const As = sci(vals, "A", A, 4);
      return {
        prompt: `What is the resistance of a copper wire ${n(L)} m long and ${n(d)} mm in diameter, in ohms? The resistivity of copper is ${sciC("1.68", -8)} ${Om}·m. ${rnd(3)}`,
        steps: [
          `Resistance grows with length and falls with cross-sectional area: ${V("R")} = ${frac(`${S("ρ", "e")}${V("L")}`, V("A"))}.`,
          `${V("d")} = ${n(d)} mm = ${n(dm)} m, so ${V("A")} = ${frac(`π${V("d")}²`, c(4))} = ${frac(`π · ${n(dm)}²`, c(4))} ≈ ${As} m².`,
          `${V("R")} = ${frac(`${sciC("1.68", -8)} · ${n(L)}`, As)} ${ap(R, 5)} ${Om}.`,
        ],
        ...num(R, Om, 3), vals, params: { kind: "wire", L, d },
      };
    }),

    // ---- P.refraction Reflection, refraction & total internal reflection ----------------------------------------------
    "P.refraction": def("Refraction and total internal reflection", (r, level) => {
      const th = "θ";
      if (level === 1) {
        const kind = r.pick(["n", "v", "lam"]);
        if (kind === "n") {
          const nn = r.pick([1.2, 1.25, 1.5, 1.6, 2, 2.4, 2.5]), vm = P.round(3 / nn, 4);
          return {
            prompt: `Light travels through a transparent material at ${n(vm)} × 10<sup>${c(8)}</sup> m/s. What is the material's index of refraction? Take ${V("c")} = ${sciC("3.00", 8)} m/s.`,
            steps: [`The index of refraction is how many times slower light is in the material: ${V("n")} = ${frac(V("c"), V("v"))} = ${frac(sciC("3.00", 8), `${n(vm)} × 10<sup>${c(8)}</sup>`)} = ${frac(c(3), n(vm))} = ${n(nn)}.`],
            ...num(nn, ""), vals: { nn }, params: { kind, vm },
          };
        }
        const [med, nn] = r.pick([["water", 1.33], ["crown glass", 1.52], ["diamond", 2.42], ["ice", 1.31], ["ethanol", 1.36], ["fused quartz", 1.46]]);
        if (kind === "v") {
          const vk = 300000 / nn;
          return {
            prompt: `How fast does light travel in ${med} (index of refraction ${n(nn)}), in km/s? Take ${V("c")} = ${sciC("3.00", 8)} m/s. ${rnd(0)}`,
            steps: [`${V("n")} = ${frac(V("c"), V("v"))}, so ${V("v")} = ${frac(V("c"), V("n"))}. In km/s, ${V("c")} = ${c(300000)} km/s.`, `${V("v")} = ${frac(c(300000), n(nn))} ${ap(vk, 1)} km/s.`],
            ...num(vk, "km/s", 0), vals: { vk }, params: { kind, nn },
          };
        }
        const L0 = 10 * r.int(40, 70), Ln = L0 / nn;
        return {
          prompt: `Light with a wavelength of ${n(L0)} nm in vacuum enters ${med} (index of refraction ${n(nn)}). What is its wavelength in the ${med}, in nm? ${rnd(1)}`,
          steps: [`The frequency is set by the source and does not change, but the light slows by the factor ${V("n")}, so its wavelength shrinks by the same factor: ${S("λ", "n")} = ${frac(S("λ", "0"), V("n"))}.`, `${S("λ", "n")} = ${frac(n(L0), n(nn))} ${ap(Ln, 3)} nm.`],
          ...num(Ln, "nm", 1), vals: { Ln }, params: { kind, L0, nn },
        };
      }
      if (level === 2) {
        for (;;) {
          const [m1, n1, m2, n2] = r.pick([["air", 1.0, "water", 1.33], ["air", 1.0, "glass", 1.5], ["water", 1.33, "glass", 1.5], ["air", 1.0, "diamond", 2.42], ["glass", 1.5, "water", 1.33], ["glass", 1.5, "air", 1.0], ["water", 1.33, "air", 1.0]]);
          const t1 = 5 * r.int(2, 14), s1 = sind(t1), s2 = (n1 * s1) / n2;
          if (s2 > 0.98) continue;
          const t2 = asind(s2), toward = n2 > n1;
          const R = 2.4;
          return {
            prompt: `A ray of light in ${m1} (${V("n")} = ${n1.toFixed(2)}) strikes a flat surface of ${m2} (${V("n")} = ${n2.toFixed(2)}) at ${n(t1)}° from the normal. At what angle from the normal does the refracted ray travel, in degrees? ${rnd(1)}`,
            graph: graph({
              view: [-3, 3, -2.8, 2.8], equal: true, axes: false, grid: false,
              items: [
                { t: "seg", a: [-3, 0], b: [3, 0], role: "muted" },
                { t: "seg", a: [0, -2.6], b: [0, 2.6], dash: true, role: "muted" },
                { t: "vec", a: [r4(-R * s1), r4(R * cosd(t1))], b: [0, 0], role: "primary" },
                { t: "vec", a: [0, 0], b: [r4(R * s2), r4(-R * Math.sqrt(1 - s2 * s2))], role: "primary" },
                { t: "text", x: -0.35, y: 1.3, s: "θ₁" }, { t: "text", x: 0.35, y: -1.3, s: "θ₂" },
                { t: "text", x: -2.3, y: 0.35, s: m1 }, { t: "text", x: -2.3, y: -0.4, s: m2 },
              ],
            }),
            steps: [
              `Measure angles from the normal. Snell's law: ${S("n", 1)} sin ${S(th, 1)} = ${S("n", 2)} sin ${S(th, 2)}.`,
              `sin ${S(th, 2)} = ${frac(`${S("n", 1)} sin ${S(th, 1)}`, S("n", 2))} = ${frac(`${n1.toFixed(2)} · sin ${n(t1)}°`, n2.toFixed(2))} = ${frac(`${n1.toFixed(2)} · ${n(s1, 4)}`, n2.toFixed(2))} ${ap(s2)}.`,
              `${S(th, 2)} = arcsin ${n(s2, 4)} ${ap(t2, 3)}°. Going into the ${toward ? "higher" : "lower"}-index medium, the ray bends ${toward ? "toward" : "away from"} the normal.`,
            ],
            ...num(t2, "°", 1), vals: { s1, s2, t2 }, params: { n1, n2, t1 }, deg: true,
          };
        }
      }
      if (r.chance(0.5)) {
        const n1 = r.int(146, 150) / 100, n2 = P.round(n1 - r.int(1, 5) / 100, 2);
        const ratio = n2 / n1, tc = asind(ratio), tm = 90 - tc, sm = sind(tm), sa = n1 * sm, ta = asind(sa);
        return {
          prompt: `An optical fiber has a core of index ${n(n1)} and a cladding of index ${n(n2)}. Light enters the flat end of the fiber from air (${V("n")} = 1.00). What is the largest angle from the fiber's axis at which incoming light is still trapped in the core by total internal reflection, in degrees? ${rnd(1)}`,
          steps: [
            `Total internal reflection at the core–cladding wall needs the ray to hit it at more than the critical angle: sin ${S(th, "c")} = ${frac(S("n", "clad"), S("n", "core"))} = ${frac(n(n2), n(n1))} ${ap(ratio)}, so ${S(th, "c")} ${ap(tc, 3)}°.`,
            `The wall is parallel to the axis, so a ray at ${S(th, "c")} to the wall's normal travels at ${c(90)}° − ${n(tc, 3)}° ${ap(tm, 3)}° to the axis. Rays steeper than this escape.`,
            `At the entry face (normal along the axis), Snell's law from air: 1.00 · sin ${S(th, "a")} = ${n(n1)} · sin ${n(tm, 3)}° = ${n(n1)} · ${n(sm, 4)} ${ap(sa)}.`,
            `${S(th, "a")} = arcsin ${n(sa, 4)} ${ap(ta, 3)}°.`,
          ],
          ...num(ta, "°", 1), vals: { ratio, tc, tm, sm, sa, ta }, params: { kind: "fiber", n1, n2 }, deg: true,
        };
      }
      const d = r.int(2, 10) / 2, ratio = 1 / 1.33, tc = asind(ratio), tc_ = tand(tc), R = d * tc_;
      return {
        prompt: `A small lamp sits ${n(d)} m below the surface of a calm pool (water index ${c(1.33)}). Light reaches the air only through a circle on the surface directly above it; outside the circle it is totally reflected back. What is the radius of that circle, in meters? ${rnd(2)}`,
        steps: [
          `Going from water to air, rays hitting the surface beyond the critical angle are totally reflected: sin ${S(th, "c")} = ${frac(S("n", "air"), S("n", "water"))} = ${frac("1", c(1.33))} ${ap(ratio)}, so ${S(th, "c")} ${ap(tc, 3)}°.`,
          `The edge of the circle is where a ray from the lamp meets the surface at exactly ${S(th, "c")} from the vertical normal, so its radius is ${V("R")} = ${V("d")} tan ${S(th, "c")}.`,
          `tan ${n(tc, 3)}° ${ap(tc_)}, so ${V("R")} = ${n(d)} · ${n(tc_, 4)} ${ap(R)} m.`,
        ],
        ...num(R, "m", 2), vals: { ratio, tc, tc_, R }, params: { kind: "pool", d }, deg: true,
      };
    }),

    // ---- P.lenses Thin lenses & mirrors -----------------------------------------------------------------------------------
    "P.lenses": def("Thin lenses", (r, level) => {
      const f_ = V("f"), dO = S("d", "o"), dI = S("d", "i");
      const lensGraph = (f, dob, hob) => {
        const X = Math.max(Math.abs(f), dob) * 1.3;
        return graph({
          view: [-X, X, -hob * 2.2, hob * 2.2],
          items: [
            { t: "hline", y: 0, role: "muted" },
            { t: "seg", a: [0, -hob * 1.9], b: [0, hob * 1.9], role: "secondary", label: "lens" },
            { t: "pt", x: -Math.abs(f), y: 0, label: "F" }, { t: "pt", x: Math.abs(f), y: 0, label: "F′" },
            { t: "vec", a: [-dob, 0], b: [-dob, hob], role: "primary", label: "object" },
          ],
        });
      };
      if (level === 1) {
        for (;;) {
          const f = r.int(5, 30), dob = r.int(f + 1, 4 * f), k = dob - f, prod = f * dob;
          if (prod % k !== 0) continue;
          const di = prod / k;
          if (di > 200) continue;
          return {
            prompt: `An object stands ${n(dob)} cm in front of a converging lens with focal length ${n(f)} cm. Where does the image form, in centimeters from the lens (positive means on the far side)?`,
            graph: lensGraph(f, dob, 3),
            steps: [
              `Thin-lens equation: ${frac("1", f_)} = ${frac("1", dO)} + ${frac("1", dI)}, so ${frac("1", dI)} = ${frac("1", f_)} − ${frac("1", dO)}.`,
              `${frac("1", dI)} = ${frac("1", n(f))} − ${frac("1", n(dob))} = ${frac(`${n(dob)} − ${n(f)}`, `${n(f)} · ${n(dob)}`)} = ${frac(n(k), n(prod))}.`,
              `${dI} = ${frac(n(prod), n(k))} = ${n(di)} cm. It is positive: a real image on the far side of the lens.`,
            ],
            ...num(di, "cm"), vals: { k, prod, di }, params: { f, dob },
          };
        }
      }
      if (level === 2) {
        for (;;) {
          const kind = r.pick(["real", "virtual", "diverging"]);
          const fa = r.int(5, 30), f = kind === "diverging" ? -fa : fa;
          const dob = kind === "virtual" ? r.int(1, fa - 1) : r.int(fa + 1, 3 * fa), ho = r.int(1, 10);
          if (dob === fa) continue;
          const inv = new Frac(1, f).sub(new Frac(1, dob)), di = new Frac(1).div(inv), m = di.neg().div(dob), hi = m.mul(ho);
          if (!term(di) || !term(hi) || Math.abs(di.value) > 300) continue;
          const real = di.value > 0;
          return {
            prompt: `A ${n(ho)} cm tall object stands ${n(dob)} cm from a ${f > 0 ? "converging" : "diverging"} lens of focal length ${n(f)} cm. What is the height of the image, in centimeters (positive means upright, negative inverted)?`,
            graph: lensGraph(f, dob, ho),
            steps: [
              `Thin-lens equation (a ${f > 0 ? "converging" : "diverging"} lens has ${f > 0 ? "positive" : "negative"} ${f_}): ${frac("1", dI)} = ${frac("1", f_)} − ${frac("1", dO)} = ${frac("1", n(f))} − ${frac("1", n(dob))} = ${M.f(inv)}, so ${dI} = ${qs(di)} cm.`,
              `Magnification: ${V("m")} = −${frac(dI, dO)} = −${frac(qs(di, true), n(dob))} = ${qs(m)}.`,
              `Image height: ${S("h", "i")} = ${V("m")}${S("h", "o")} = ${qs(m, true)} · ${n(ho)} = ${qs(hi)} cm. The image is ${real ? "real (on the far side)" : "virtual (on the object's side)"} and ${hi.value > 0 ? "upright" : "inverted"}, ${Math.abs(m.value) > 1 ? "enlarged" : "reduced"}.`,
            ],
            ...numF(hi, "cm"), vals: { inv: fv(inv), di: fv(di), m: fv(m), hi: fv(hi) }, params: { f, dob, ho },
          };
        }
      }
      if (r.chance(0.5)) {
        for (;;) {
          const plano = r.chance(0.4), R1 = 5 * r.int(2, 8), R2 = plano ? 0 : 5 * r.int(2, 8);
          const pw = plano ? new Frac(1, R1).mul(new Frac(1, 2)) : new Frac(1, R1).add(new Frac(1, R2)).mul(new Frac(1, 2)), f = new Frac(1).div(pw);
          const dob = r.int(Math.ceil(f.value) + 2, Math.ceil(f.value) + 60), inv = pw.sub(new Frac(1, dob)), di = new Frac(1).div(inv);
          if (!term(f) || !term(di) || di.value > 300) continue;
          return {
            prompt: `A ${plano ? "plano-convex" : "biconvex"} glass lens (index ${c(1.5)}) has ${plano ? `one flat face and one convex face with radius of curvature ${n(R1)} cm` : `convex faces with radii of curvature ${n(R1)} cm and ${n(R2)} cm`}. An object stands ${n(dob)} cm in front of it. Where does the image form, in centimeters from the lens?`,
            steps: [
              `Lensmaker's equation: ${frac("1", f_)} = (${V("n")} − 1)(${frac("1", S("R", 1))} − ${frac("1", S("R", 2))}), with ${V("R")} positive for a surface bulging toward the incoming light${plano ? " and 1/R = 0 for a flat face" : ", so the back face of a biconvex lens has negative R"}.`,
              plano
                ? `${frac("1", f_)} = (${c(1.5)} − 1)(${frac("1", n(R1))} − 0) = ${M.f(pw)}, so ${f_} = ${qs(f)} cm.`
                : `${frac("1", f_)} = (${c(1.5)} − 1)(${frac("1", n(R1))} − ${frac("1", `(−${n(R2)})`)}) = ${H}(${frac("1", n(R1))} + ${frac("1", n(R2))}) = ${M.f(pw)}, so ${f_} = ${qs(f)} cm.`,
              `Thin-lens equation: ${frac("1", dI)} = ${frac("1", f_)} − ${frac("1", dO)} = ${M.f(pw)} − ${frac("1", n(dob))} = ${M.f(inv)}, so ${dI} = ${qs(di)} cm (a real image on the far side).`,
            ],
            ...numF(di, "cm"), vals: { pw: fv(pw), f: fv(f), inv: fv(inv), di: fv(di) }, params: { kind: "maker", R1, R2, dob },
          };
        }
      }
      for (;;) {
        const f1 = r.pick([10, 20, 25, 40, 50]), f2 = r.pick([-50, -40, -25, 20, 25, 40, 50, 100]);
        const P1 = new Frac(100, f1), P2 = new Frac(100, f2), Pt = P1.add(P2);
        if (Pt.n <= 0) continue;
        const f = new Frac(100).div(Pt), dob = r.int(Math.ceil(f.value) + 2, Math.ceil(f.value) + 60), inv = new Frac(1).div(f).sub(new Frac(1, dob)), di = new Frac(1).div(inv);
        if (!term(f) || !term(di) || di.value > 300 || !term(P1) || !term(P2)) continue;
        return {
          prompt: `Two thin lenses${f1 === f2 ? `, each with a focal length of ${n(f1)} cm,` : ` with focal lengths ${n(f1)} cm and ${n(f2)} cm`} are placed in contact. An object stands ${n(dob)} cm in front of the pair. Where does the image form, in centimeters from the lenses?`,
          steps: [
            `Thin lenses in contact add their optical powers ${V("P")} = 1/${f_}, measured in diopters (1/m) when ${f_} is in meters.`,
            `${S("P", 1)} = ${frac("1", `${n(f1 / 100)} m`)} = ${qs(P1)} D and ${S("P", 2)} = ${frac("1", `${np(f2 / 100)} m`)} = ${qs(P2)} D, so ${V("P")} = ${qs(P1)} + ${qs(P2, true)} = ${qs(Pt)} D and ${f_} = ${frac(c(100), qs(Pt))} cm = ${qs(f)} cm.`,
            `Thin-lens equation: ${frac("1", dI)} = ${frac("1", qs(f))} − ${frac("1", n(dob))} = ${M.f(inv)}, so ${dI} = ${qs(di)} cm (a real image on the far side).`,
          ],
          ...numF(di, "cm"), vals: { P1: fv(P1), P2: fv(P2), Pt: fv(Pt), f: fv(f), inv: fv(inv), di: fv(di) }, params: { kind: "contact", f1, f2, dob, f1m: f1 / 100, f2m: f2 / 100 },
        };
      }
    }),

    // ---- P.relativity Special relativity basics ---------------------------------------------------------------------------
    "P.relativity": def("Special relativity", (r, level) => {
      const TRI = [[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [7, 24, 25], [24, 7, 25], [8, 15, 17], [15, 8, 17], [20, 21, 29], [21, 20, 29]];
      const [a, b, hyp] = r.pick(TRI), beta = new Frac(a, hyp), b2 = beta.pow(2), om = new Frac(1).sub(b2), s = new Frac(b, hyp), gam = new Frac(hyp, b);
      const gSteps = [
        `Lorentz factor: γ = ${frac("1", M.sqrt(`1 − ${V("v")}²/${V("c")}²`))}, with ${frac(V("v"), V("c"))} = ${M.f(beta)}.`,
        `${frac(`${V("v")}²`, `${V("c")}²`)} = ${M.f(b2)}, so 1 − ${M.f(b2)} = ${M.f(om)} and ${M.sqrt(M.f(om))} = ${M.f(s)}.`,
        `γ = ${frac("1", M.f(s))} = ${M.f(gam)}${term(gam) ? "" : ` ≈ ${n(gam.value)}`}.`,
      ];
      const gVals = { b2: fv(b2), om: fv(om), s: fv(s), gam: fv(gam) };
      if (level === 1) {
        return {
          prompt: `A spacecraft moves at ${V("v")} = ${M.f(beta)}${V("c")} relative to Earth. What is its Lorentz factor γ? Give an exact fraction.`,
          steps: gSteps, ...numF(gam, ""), vals: gVals, params: { a, hyp },
        };
      }
      if (level === 2) {
        if (r.chance(0.5)) {
          const dt = gam.value * 2.2;
          return {
            prompt: `Muons have a lifetime of ${c(2.2)} μs in their own rest frame. How long does a muon moving at ${M.f(beta)}${V("c")} live, as measured in the lab, in microseconds? ${rnd(2)}`,
            steps: [...gSteps, `Time dilation: the moving muon's clock runs slow, so the lab measures Δ${V("t")} = γΔ${S("t", "0")} = ${M.f(gam)} · ${c(2.2)} ${ap(dt)} μs.`],
            ...num(dt, "μs", 2), vals: Object.assign({}, gVals, { dt }), params: { kind: "time", a, hyp },
          };
        }
        const L0 = 10 * r.int(5, 50), L = gam.pow(-1).mul(L0);
        return {
          prompt: `A spaceship is ${n(L0)} m long in its own rest frame. How long is it as measured by observers it passes at ${M.f(beta)}${V("c")}, in meters?`,
          steps: [...gSteps, `Length contraction along the motion: ${V("L")} = ${frac(S("L", "0"), "γ")} = ${n(L0)} · ${M.f(s)} = ${qs(L)}${term(L) ? "" : ` ≈ ${n(L.value, 2)}`} m.`],
          ...numF(L, "m"), vals: Object.assign({}, gVals, { L: fv(L) }), params: { kind: "length", a, hyp, L0 },
        };
      }
      const kind = r.pick(["add", "emc", "ke"]);
      if (kind === "add") {
        const FR = [[1, 2], [3, 5], [4, 5], [1, 3], [2, 3], [3, 4], [1, 4]];
        const [p1, q1] = r.pick(FR), [p2, q2] = r.pick(FR), u1 = new Frac(p1, q1), v1 = new Frac(p2, q2), sum = u1.add(v1), prod = u1.mul(v1), den = prod.add(1), u = sum.div(den);
        return {
          prompt: `A spaceship moving at ${M.f(v1)}${V("c")} relative to Earth fires a probe forward at ${M.f(u1)}${V("c")} relative to the ship. How fast does the probe move relative to Earth, as a fraction of ${V("c")}?`,
          steps: [
            `Velocities do not simply add near ${V("c")}. Relativistic velocity addition: ${V("u")} = ${frac(`${V("u")}′ + ${V("v")}`, `1 + ${V("u")}′${V("v")}/${V("c")}²`)}, with ${V("u")}′ = ${M.f(u1)}${V("c")} and ${V("v")} = ${M.f(v1)}${V("c")}.`,
            `Top: ${M.f(u1)} + ${M.f(v1)} = ${M.f(sum)}. Bottom: 1 + ${M.f(u1)} · ${M.f(v1)} = 1 + ${M.f(prod)} = ${M.f(den)}.`,
            `${V("u")} = ${frac(M.f(sum), M.f(den))}${V("c")} = ${M.f(u)}${V("c")}, still less than ${V("c")}.`,
          ],
          ...numF(u, ""), answerText: `${M.f(u)}${V("c")}`, vals: { sum: fv(sum), prod: fv(prod), den: fv(den), u: fv(u) }, params: { kind, u1: fv(u1), v1: fv(v1) },
        };
      }
      if (kind === "emc") {
        const k = r.pick([10, 20, 50, 100]), pc = k * a, mc2 = k * b, E2 = pc * pc + mc2 * mc2, E = k * hyp, KE = E - mc2;
        return {
          prompt: `A particle with rest energy ${V("m")}${V("c")}² = ${n(mc2)} MeV has momentum ${V("p")} with ${V("p")}${V("c")} = ${n(pc)} MeV. What is its kinetic energy, in MeV?`,
          steps: [
            `Energy–momentum relation: ${V("E")}² = (${V("p")}${V("c")})² + (${V("m")}${V("c")}²)².`,
            `${V("E")}² = ${n(pc)}² + ${n(mc2)}² = ${n(pc * pc)} + ${n(mc2 * mc2)} = ${n(E2)}, so ${V("E")} = ${M.sqrt(n(E2))} = ${n(E)} MeV.`,
            `Kinetic energy is the total minus the rest energy: ${V("E")} − ${V("m")}${V("c")}² = ${n(E)} − ${n(mc2)} = ${n(KE)} MeV.`,
          ],
          ...num(KE, "MeV"), vals: { pc2: pc * pc, mc4: mc2 * mc2, E2, E, KE }, params: { kind, pc, mc2 },
        };
      }
      const gm1 = gam.sub(1), KE = gm1.value * 938.3;
      return {
        prompt: `A proton (rest energy ${c(938.3)} MeV) moves at ${M.f(beta)}${V("c")}. What is its kinetic energy, in MeV? ${rnd(1)}`,
        steps: [...gSteps, `Relativistic kinetic energy: ${V("KE")} = (γ − 1)${V("m")}${V("c")}² = ${M.f(gm1)} · ${c(938.3)} ${ap(KE, 3)} MeV. (The classical ${H}${V("m")}${V("v")}² would be too small at this speed.)`],
        ...num(KE, "MeV", 1), vals: Object.assign({}, gVals, { gm1: fv(gm1), KE }), params: { kind, a, hyp },
      };
    }),

    // ---- P.quantum Photons & matter waves --------------------------------------------------------------------------------
    "P.quantum": def("Photons and matter waves", (r, level) => {
      const hc = () => `${V("h")}${V("c")} = ${c(1240)} eV·nm`;
      if (level === 1) {
        if (r.chance(0.5)) {
          const L = r.pick([124, 155, 200, 248, 310, 400, 496, 620, 800, 1000, 1240]), E = 1240 / L;
          return {
            prompt: `What is the energy of one photon of light with a wavelength of ${n(L)} nm, in electronvolts? Use ${hc()}.`,
            steps: [`Photon energy: ${V("E")} = ${V("h")}${V("f")} = ${frac(`${V("h")}${V("c")}`, "λ")}.`, `${V("E")} = ${frac(c(1240), n(L))} = ${n(E)} eV.`],
            ...num(E, "eV"), vals: { E }, params: { kind: "lam", L },
          };
        }
        const fm = r.int(40, 150) / 10, E = 0.4136 * fm;
        return {
          prompt: `What is the energy of one photon of frequency ${n(fm)} × 10<sup>${c(14)}</sup> Hz, in electronvolts? Use ${V("h")} = ${sciC("4.136", -15)} eV·s. ${rnd(2)}`,
          steps: [`Photon energy: ${V("E")} = ${V("h")}${V("f")}.`, `${V("E")} = ${sciC("4.136", -15)} · ${n(fm)} × 10<sup>${c(14)}</sup> = ${c(0.4136)} · ${n(fm)} ${ap(E)} eV.`],
          ...num(E, "eV", 2), vals: { E }, params: { kind: "f", fm },
        };
      }
      if (level === 2) {
        for (;;) {
          const [metal, phi] = r.pick([["sodium", 2.28], ["potassium", 2.3], ["calcium", 2.87], ["zinc", 4.33], ["cesium", 2.14], ["magnesium", 3.68]]);
          const L = r.pick([124, 155, 200, 248, 310, 400, 496]), E = 1240 / L, KE = E - phi;
          if (KE < 0.1) continue;
          const ask = r.pick(["KE", "V"]);
          return {
            prompt: `Light of wavelength ${n(L)} nm shines on a clean ${metal} surface, whose work function is ${n(phi)} eV. ${ask === "KE" ? "What is the maximum kinetic energy of the ejected electrons, in eV?" : "What stopping potential (the reverse voltage that just halts the fastest electrons) is needed, in volts?"} Use ${hc()}.`,
            steps: [
              `Each electron absorbs one photon: ${V("E")} = ${frac(`${V("h")}${V("c")}`, "λ")} = ${frac(c(1240), n(L))} = ${n(E)} eV.`,
              `Photoelectric equation: ${S("KE", "max")} = ${V("h")}${V("f")} − φ = ${n(E)} − ${n(phi)} = ${n(KE)} eV.`,
              ...(ask === "V" ? [`The stopping potential satisfies ${V("e")}${S("V", "0")} = ${S("KE", "max")}; an energy of ${n(KE)} eV is stopped by ${n(KE)} V.`] : []),
            ],
            ...num(KE, ask === "KE" ? "eV" : "V"), vals: { E, KE }, params: { phi, L, ask },
          };
        }
      }
      if (r.chance(0.5)) {
        const vm = r.int(10, 90) / 10, v = vm * 1e6, p = 9.109e-31 * v, L = 6.626e-34 / p, Lnm = L * 1e9, vals = { Lnm };
        const ps = sci(vals, "p", p), Ls = sci(vals, "L", L);
        return {
          prompt: `An electron moves at ${n(vm)} × 10<sup>${c(6)}</sup> m/s. What is its de Broglie wavelength, in nanometers? Use ${V("h")} = ${sciC("6.626", -34)} J·s and the electron mass ${sciC("9.109", -31)} kg. ${rnd(3)}`,
          steps: [
            `de Broglie: every particle has a wavelength λ = ${frac(V("h"), V("p"))} = ${frac(V("h"), `${V("m")}${V("v")}`)} (the speed is far below ${V("c")}, so ${V("p")} = ${V("m")}${V("v")}).`,
            `${V("p")} = ${sciC("9.109", -31)} · ${n(vm)} × 10<sup>${c(6)}</sup> ≈ ${ps} kg·m/s.`,
            `λ = ${frac(sciC("6.626", -34), ps)} ≈ ${Ls} m ${ap(Lnm, 4)} nm, comparable to atomic spacings, which is why electrons diffract from crystals.`,
          ],
          ...num(Lnm, "nm", 3), vals, params: { kind: "dB", vm },
        };
      }
      const dx = r.pick([0.1, 0.2, 0.5, 1, 2, 5, 10]), dp = 1.055e-34 / (2 * dx * 1e-9), dv = dp / 9.109e-31, dvk = dv / 1000, vals = { dv, dvk };
      const dps = sci(vals, "dp", dp);
      return {
        prompt: `An electron is confined to a region ${n(dx)} nm wide. What is the smallest possible uncertainty in its speed, in km/s? Use ℏ = ${sciC("1.055", -34)} J·s and the electron mass ${sciC("9.109", -31)} kg. ${rnd(0)}`,
        steps: [
          `Heisenberg uncertainty principle: Δ${V("x")}Δ${V("p")} ≥ ${frac("ℏ", "2")}, so the least momentum uncertainty is Δ${V("p")} = ${frac("ℏ", `2Δ${V("x")}`)}.`,
          `Δ${V("p")} = ${frac(sciC("1.055", -34), `2 · ${n(dx)} × 10<sup>−${c(9)}</sup>`)} ≈ ${dps} kg·m/s.`,
          `Δ${V("v")} = ${frac(`Δ${V("p")}`, V("m"))} = ${frac(dps, sciC("9.109", -31))} ${ap(dv, 0)} m/s ${ap(dvk, 2)} km/s.`,
        ],
        ...num(dvk, "km/s", 0), vals, params: { kind: "unc", dx },
      };
    }),

  });
})(Practice);
