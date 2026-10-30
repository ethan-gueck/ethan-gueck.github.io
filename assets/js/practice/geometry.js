/*
 * practice/geometry.js — Geometry practice problems (chapter 05), one generator per concept key.
 *
 * Each generator(r, level) draws hand-solvable numbers for the level (1 easy, 2 medium, 3 hard):
 * Pythagorean triples, special angles, exact multiples of π and simplified radicals. Every number it
 * shows is built from values it computes and reports in `vals`; tools/practice/verifiers/geometry.py
 * recomputes each of them independently. Figures are drawn to scale from the same numbers.
 *
 * Every concept of chapter 05 has problems; none is skipped.
 */
(function (P) {
  "use strict";
  const { Frac, M, graph } = P;
  const n = (v) => M.n(v);
  const np = (v) => M.n(v, { paren: true });
  const typed = (v) => (v instanceof Frac ? (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`) : String(v));
  const fracVal = (q) => ({ n: q.n, d: q.d });
  const V = M.v;
  const x = V("x"), y = V("y");
  const dg = (a) => `${n(a)}°`;
  const sq = (b) => M.sup(b, 2);
  /** k times a variable: x, −x, 3x (never 1x). */
  const kv = (k, v = x) => (k === 1 ? v : k === -1 ? `−${v}` : `${n(k)}${v}`);
  /** px + q as HTML, and as plain text for figure labels. */
  const lin = (p, q) => M.poly([p, q]);
  const linPlain = (p, q) => `${p === 1 ? "" : p === -1 ? "−" : String(p).replace("-", "−")}x${q === 0 ? "" : ` ${q < 0 ? "−" : "+"} ${Math.abs(q)}`}`;
  /** p·X + q evaluated for display: "3 · 7 + 2", or "7 + 2" when p = 1. */
  const ev = (p, X, q) => `${p === 1 ? "" : `${n(p)} · `}${p === 1 ? n(X) : np(X)}${M.term(q, "")}`;
  /** (px + q)° as an angle measure; px° alone needs no parentheses. */
  const dlin = (p, q) => (q === 0 ? `${lin(p, q)}°` : `(${lin(p, q)})°`);
  const dlinPlain = (p, q) => (q === 0 ? `${linPlain(p, q)}°` : `(${linPlain(p, q)})°`);
  const plain = (v) => String(v).replace(/-/g, "−");
  /** Name a segment, angle or triangle: AB, ∠ABC, △ABC (letters in italics). */
  const seg = (s) => V(s);
  const ang = (s) => `∠${V(s)}`;
  const mang = (s) => `m∠${V(s)}`;
  const tri = (s) => `△${V(s)}`;
  /** √N = k√s with s square-free. */
  function splitRoot(N) { let k = 1, s = N; for (let f = 2; f * f <= s; f++) while (s % (f * f) === 0) { s /= f * f; k *= f; } return [k, s]; }
  const rootText = (k, s) => (s === 1 ? n(k) : `${k === 1 ? "" : n(k)}${M.sqrt(n(s))}`);
  const rootIn = (k, s) => (s === 1 ? String(k) : `${k}sqrt(${s})`);
  /** q·π shown and typed: 12π, 3π/2 (stacked), π. */
  function piText(q) {
    q = Frac.of(q);
    const top = q.n === 1 ? "π" : `${n(q.n)}π`;
    return q.d === 1 ? top : M.frac(top, n(q.d));
  }
  const piIn = (q) => { q = Frac.of(q); return q.d === 1 ? `${q.n}pi` : `${q.n}pi/${q.d}`; };
  /** A Frac coefficient times a root: (3/2)√3 shown as 3√3/2. */
  function fracRoot(q, s) {
    q = Frac.of(q);
    const top = `${q.n === 1 ? "" : n(q.n)}${M.sqrt(n(s))}`;
    return q.d === 1 ? top : M.frac(top, n(q.d));
  }
  /** "a" or "an" before a number read aloud: an 8, an 11, an 18, an 80–89. */
  const aNum = (v, cap = false) => { const w = /^(8|11|18)$|^8\d$/.test(String(v)) ? "an" : "a"; return cap ? w[0].toUpperCase() + w.slice(1) : w; };
  const fracRootIn = (q, s) => { q = Frac.of(q); return `${q.n}sqrt(${s})${q.d === 1 ? "" : `/${q.d}`}`; };

  // ---- Figures ---------------------------------------------------------------------------------
  const RAD = Math.PI / 180;
  const dir = (deg) => [Math.cos(deg * RAD), Math.sin(deg * RAD)];
  const add = (p, q, k = 1) => [p[0] + k * q[0], p[1] + k * q[1]];
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const unit = (v) => { const L = Math.hypot(v[0], v[1]) || 1; return [v[0] / L, v[1] / L]; };
  const centroid = (pts) => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
  function extent(pts) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  }
  const size = (pts) => { const e = extent(pts); return Math.max(e.x1 - e.x0, e.y1 - e.y0, 1e-9); };
  const txt = (p, s, role) => (role ? { t: "text", x: p[0], y: p[1], s, role } : { t: "text", x: p[0], y: p[1], s });
  /** A figure (no axes or grid, equal units) whose view holds `pts` with a margin for labels. */
  function fig(items, pts, pad = 0.22) {
    const e = extent(pts), s = size(pts), m = s * pad;
    return graph({ view: [e.x0 - m, e.x1 + m, e.y0 - m, e.y1 + m], items, equal: true, axes: false, grid: false });
  }
  /** Coordinate plane, equal units. */
  const plane = (items, lim = 10, opts = {}) => graph(Object.assign({ view: [-lim, lim, -lim, lim], items, equal: true }, opts));
  /** An arc of small segments (center c, radius rad, from a0 to a1 degrees, counterclockwise). */
  function arc(c, rad, a0, a1, role = "muted") {
    const out = [], N = Math.max(6, Math.ceil(Math.abs(a1 - a0) / 8));
    for (let i = 0; i < N; i++) {
      const t0 = a0 + ((a1 - a0) * i) / N, t1 = a0 + ((a1 - a0) * (i + 1)) / N;
      out.push({ t: "seg", a: add(c, dir(t0), rad), b: add(c, dir(t1), rad), role });
    }
    return out;
  }
  /** Right-angle marker at vertex p between the directions to q1 and q2. */
  function rightMark(p, q1, q2, e) {
    const u = unit(sub(q1, p)), w = unit(sub(q2, p));
    const a = add(p, u, e), b = add(add(p, u, e), w, e), c = add(p, w, e);
    return [{ t: "seg", a, b, role: "muted" }, { t: "seg", a: b, b: c, role: "muted" }];
  }
  /**
   * A polygon with labels: names[i] at vertex i (outside), sides[i] on side i → i+1 (outside),
   * angles[i] inside at vertex i, right: vertices with a right-angle mark.
   */
  function polyItems(Vs, { names = [], sides = [], angles = [], right = [], role = "primary", scale } = {}) {
    const s = scale || size(Vs), c = centroid(Vs), off = 0.075 * s, k = Vs.length;
    const items = [{ t: "poly", p: Vs, role }];
    Vs.forEach((p, i) => {
      const prev = Vs[(i + k - 1) % k], next = Vs[(i + 1) % k];
      if (names[i]) items.push(txt(add(p, unit(sub(p, c)), off), names[i]));
      if (sides[i]) {
        const m = mid(p, next), d = sub(next, p);
        let nrm = unit([-d[1], d[0]]);
        if ((m[0] - c[0]) * nrm[0] + (m[1] - c[1]) * nrm[1] < 0) nrm = [-nrm[0], -nrm[1]];
        items.push(txt(add(m, nrm, off), sides[i]));
      }
      if (angles[i]) {
        const b = unit(add(unit(sub(prev, p)), unit(sub(next, p))));
        items.push(txt(add(p, b, 0.15 * s), angles[i], "highlight"));
      }
      if (right.includes(i)) items.push(...rightMark(p, prev, next, 0.05 * s));
    });
    return items;
  }
  /** Triangle vertices from two angles at the ends of a base of length L (A at origin, B on the x-axis). */
  function triFromAngles(A, B, L = 6) {
    const C = 180 - A - B, AC = (L * Math.sin(B * RAD)) / Math.sin(C * RAD);
    return [[0, 0], [L, 0], add([0, 0], dir(A), AC)];
  }
  /** Triangle vertices from three sides: A at origin, B = (c, 0), BC = a, CA = b. */
  function triFromSides(a, b, c) {
    const cx = (b * b + c * c - a * a) / (2 * c), cy = Math.sqrt(Math.max(b * b - cx * cx, 0));
    return [[0, 0], [c, 0], [cx, cy]];
  }

  /** ℓ, triples, names */
  const TRIPLES = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]];
  function triple(r, maxC = 60) {
    for (;;) {
      const [a, b, c] = r.pick(TRIPLES), k = r.int(1, 6);
      if (c * k > maxC) continue;
      return r.chance(0.5) ? [a * k, b * k, c * k] : [b * k, a * k, c * k];
    }
  }
  /** a/b, then "= simplest form" only when that looks different. */
  const fracEq = (a, b) => { const q = new Frac(a, b); return `${M.frac(n(a), n(b))}${q.d === b && q.n === a && b !== 1 ? "" : ` = ${M.f(q)}`}`; };
  /** ", so x = r/k = X" after a line that ends in "kx = r" (nothing when k = 1: the line already says x = X). */
  const soX = (rhs, k, X) => (k === 1 ? "" : `, so ${x} = ${M.frac(n(rhs), n(k))} = ${n(X)}`);
  /** Solve a x + b = c x + d for display: returns the "collect" line and x (exact). */
  function collect(a, b, c, d, X = x) {
    // a x + b = c x + d, a ≠ c; put x on the side with the larger coefficient
    if (a > c) return { line: `${kv(a - c, X)} = ${n(d)} − ${np(b)} = ${n(d - b)}`, k: a - c, rhs: d - b };
    return { line: `${kv(c - a, X)} = ${n(b)} − ${np(d)} = ${n(b - d)}`, k: c - a, rhs: b - d };
  }

  /** An ellipse (or part) of small segments: center c, semi-axes a (x) and b (y), from t0 to t1 degrees. */
  function ellipse(c, a, b, t0 = 0, t1 = 360, role = "primary", dash = false) {
    const out = [], N = Math.max(8, Math.ceil(Math.abs(t1 - t0) / 10));
    for (let i = 0; i < N; i++) {
      const u0 = (t0 + ((t1 - t0) * i) / N) * RAD, u1 = (t0 + ((t1 - t0) * (i + 1)) / N) * RAD;
      const s = { t: "seg", a: [c[0] + a * Math.cos(u0), c[1] + b * Math.sin(u0)], b: [c[0] + a * Math.cos(u1), c[1] + b * Math.sin(u1)], role };
      if (dash) s.dash = true;
      out.push(s);
    }
    return out;
  }
  /** A box drawn in oblique projection: length l across, height h up, width w receding. labs = [l, w, h]. */
  function boxFig(l, w, h, labs, diag = false) {
    const dv = [0.5 * w * Math.cos(35 * RAD), 0.5 * w * Math.sin(35 * RAD)];
    const F = [[0, 0], [l, 0], [l, h], [0, h]], B = F.map((p) => add(p, dv));
    const S = Math.max(l, h, w), o = 0.07 * S;
    const items = [{ t: "poly", p: F, role: "primary" }, { t: "seg", a: F[1], b: B[1], role: "primary" }, { t: "seg", a: F[2], b: B[2], role: "primary" }, { t: "seg", a: F[3], b: B[3], role: "primary" },
      { t: "seg", a: B[1], b: B[2], role: "primary" }, { t: "seg", a: B[2], b: B[3], role: "primary" },
      { t: "seg", a: F[0], b: B[0], role: "muted", dash: true }, { t: "seg", a: B[0], b: B[1], role: "muted", dash: true }, { t: "seg", a: B[0], b: B[3], role: "muted", dash: true },
      txt([l / 2, -o], labs[0]), txt(add(mid(F[1], B[1]), [o * 1.6, -o * 0.4]), labs[1]), txt([-o * 1.6, h / 2], labs[2])];
    if (diag) items.push({ t: "seg", a: F[0], b: B[2], role: "secondary", dash: true });
    return fig(items, [...F, ...B], 0.15);
  }
  /** A cylinder seen from the side: radius rad, height h. */
  function cylFig(rad, h, rLab, hLab, useD = false) {
    const e = 0.3 * rad, items = [...ellipse([0, h], rad, e), ...ellipse([0, 0], rad, e, 180, 360), ...ellipse([0, 0], rad, e, 0, 180, "muted", true),
      { t: "seg", a: [-rad, 0], b: [-rad, h], role: "primary" }, { t: "seg", a: [rad, 0], b: [rad, h], role: "primary" },
      useD ? { t: "seg", a: [-rad, h], b: [rad, h], role: "secondary" } : { t: "seg", a: [0, h], b: [rad, h], role: "secondary" },
      txt([useD ? 0 : rad / 2, h + 0.08 * Math.max(h, 2 * rad) + e], rLab), txt([rad + 0.12 * Math.max(h, 2 * rad), h / 2], hLab)];
    return fig(items, [[-rad, -e], [rad, h + e]], 0.18);
  }
  /** A cone seen from the side: base radius rad, height h; labels for r, h and the slant height. */
  function coneFig(rad, h, rLab, hLab, lLab = "") {
    const e = 0.3 * rad, S = Math.max(h, 2 * rad), items = [...ellipse([0, 0], rad, e, 180, 360), ...ellipse([0, 0], rad, e, 0, 180, "muted", true),
      { t: "seg", a: [-rad, 0], b: [0, h], role: "primary" }, { t: "seg", a: [rad, 0], b: [0, h], role: "primary" }, { t: "seg", a: [0, 0], b: [rad, 0], role: "secondary" },
      txt([rad / 2, -e - 0.07 * S], rLab)];
    if (hLab) items.push({ t: "seg", a: [0, 0], b: [0, h], role: "muted", dash: true }, txt([-0.1 * S, h / 2], hLab), ...rightMark([0, 0], [rad, 0], [0, h], 0.04 * S));
    if (lLab) items.push(txt(add(mid([rad, 0], [0, h]), unit([h, rad]), 0.08 * S), lLab));
    return fig(items, [[-rad, -e], [rad, h]], 0.18);
  }
  /** A square pyramid in oblique projection: base edge s, height h; optional slant-height line. */
  function pyrFig(s, h, sLab, hLab, slant = false) {
    const dv = [0.5 * s * Math.cos(35 * RAD), 0.5 * s * Math.sin(35 * RAD)];
    const Bs = [[0, 0], [s, 0], add([s, 0], dv), add([0, 0], dv)], c = mid(Bs[0], Bs[2]), T = [c[0], c[1] + h], S = Math.max(s, h);
    const items = [{ t: "seg", a: Bs[0], b: Bs[1], role: "primary" }, { t: "seg", a: Bs[1], b: Bs[2], role: "primary" }, { t: "seg", a: Bs[2], b: Bs[3], role: "muted", dash: true }, { t: "seg", a: Bs[3], b: Bs[0], role: "muted", dash: true },
      ...Bs.map((p, i) => ({ t: "seg", a: p, b: T, role: i === 3 ? "muted" : "primary", dash: i === 3 })),
      { t: "seg", a: c, b: T, role: "secondary", dash: true }, txt([s / 2, -0.07 * S], sLab), txt([c[0] + 0.08 * S, c[1] + h / 2], hLab)];
    if (slant) items.push({ t: "seg", a: [s / 2, 0], b: T, role: "highlight" }, txt(add(mid([s / 2, 0], T), [-0.08 * S, 0]), "ℓ"));
    return fig(items, [...Bs, T], 0.15);
  }

  /** Fixed constants each concept's text may show (formula numbers such as 180°, 360°, 30–60–90). */
  const CONSTS = {
    "G.angle-types": [90, 180, 360, 12], "G.4": [30, 45, 60, 90, 3], "G.8": [30, 60, 90], "G.rotations": [90, 180, 270, 45],
    "G.13": [90, 180, 270], "G.9": [90, 60, 3], "G.heron": [3], "G.coord-proofs": [3],
  };
  const defs = {
    // ---- G.1 Points, lines, rays, segments & planes ---------------------------------------------
    "G.points-lines": {
      title: "Segment addition and collinear points",
      generate(r, level) {
        const [A, B, C] = ["A", "B", "C"].map(V);
        if (level === 1) {
          const a = r.int(2, 15), b = r.int(2, 15), ac = a + b, whole = r.chance(0.5);
          const s = ac, lab = (p, q, str) => txt([(p + q) / 2, 0.09 * s], str);
          const items = [
            { t: "seg", a: [-0.08 * s, 0], b: [1.08 * s, 0], role: "muted" },
            { t: "pt", x: 0, y: 0, label: "A" }, { t: "pt", x: a, y: 0, label: "B" }, { t: "pt", x: ac, y: 0, label: "C" },
            lab(0, a, String(a)), lab(a, ac, whole ? String(b) : "?"),
          ];
          if (!whole) items.push(txt([ac / 2, -0.12 * s], `AC = ${ac}`));
          const g = fig(items, [[0, -0.15 * s], [ac, 0.15 * s]], 0.1);
          if (whole) {
            return {
              prompt: `Points ${A}, ${B} and ${C} lie on a line in that order. ${seg("AB")} = ${n(a)} and ${seg("BC")} = ${n(b)}. Find ${seg("AC")}.`,
              graph: g,
              steps: [
                `${B} lies between ${A} and ${C}, so the segment addition postulate applies: ${seg("AB")} + ${seg("BC")} = ${seg("AC")}.`,
                `${seg("AC")} = ${n(a)} + ${n(b)} = ${n(ac)}.`,
              ],
              answer: { kind: "number", value: ac }, answerText: n(ac), answerInput: String(ac),
              vals: { ac }, params: { a, b, whole: 1 },
            };
          }
          return {
            prompt: `Points ${A}, ${B} and ${C} lie on a line in that order. ${seg("AC")} = ${n(ac)} and ${seg("AB")} = ${n(a)}. Find ${seg("BC")}.`,
            graph: g,
            steps: [
              `${B} lies between ${A} and ${C}, so ${seg("AB")} + ${seg("BC")} = ${seg("AC")}, which gives ${seg("BC")} = ${seg("AC")} − ${seg("AB")}.`,
              `${seg("BC")} = ${n(ac)} − ${n(a)} = ${n(b)}.`,
            ],
            answer: { kind: "number", value: b }, answerText: n(b), answerInput: String(b),
            vals: { b }, params: { a, ac, whole: 0 },
          };
        }
        if (level === 2) {
          for (;;) {
            const X = r.int(2, 9), p = r.int(2, 5), q = r.int(-6, 9);
            if (r.chance(0.5)) {
              // B between A and C: AB + BC = AC
              const rr = r.int(1, 4), s = r.int(-6, 9), AB = p * X + q, BC = rr * X + s;
              if (AB <= 0 || BC <= 0) continue;
              const AC = AB + BC, k = p + rr, qs = q + s, rhs = AC - qs;
              return {
                prompt: `${B} lies on ${seg("AC")}, between ${A} and ${C}. ${seg("AB")} = ${lin(p, q)}, ${seg("BC")} = ${lin(rr, s)} and ${seg("AC")} = ${n(AC)}. Find ${seg("BC")}.`,
                graph: fig([{ t: "seg", a: [0, 0], b: [AC, 0], role: "primary" }, { t: "pt", x: 0, y: 0, label: "A" }, { t: "pt", x: AB, y: 0, label: "B" }, { t: "pt", x: AC, y: 0, label: "C" },
                  txt([AB / 2, 0.09 * AC], linPlain(p, q)), txt([AB + BC / 2, 0.09 * AC], linPlain(rr, s)), txt([AC / 2, -0.12 * AC], `AC = ${AC}`)], [[0, -0.15 * AC], [AC, 0.15 * AC]], 0.12),
                steps: [
                  `Segment addition: ${seg("AB")} + ${seg("BC")} = ${seg("AC")}, so (${lin(p, q)}) + (${lin(rr, s)}) = ${n(AC)}.`,
                  `Combine like terms: ${lin(k, qs)} = ${n(AC)}.`,
                  qs === 0 ? `Divide by ${n(k)}: ${x} = ${M.frac(n(AC), n(k))} = ${n(X)}.`
                    : `${qs > 0 ? `Subtract ${n(qs)} from` : `Add ${n(-qs)} to`} both sides: ${kv(k)} = ${n(rhs)}${soX(rhs, k, X)}.`,
                  `${seg("BC")} = ${ev(rr, X, s)} = ${n(BC)}. (Check: ${seg("AB")} = ${n(AB)}, and ${n(AB)} + ${n(BC)} = ${n(AC)}.)`,
                ],
                answer: { kind: "number", value: BC }, answerText: n(BC), answerInput: String(BC),
                vals: { X, k, qs, rhs, AB, BC }, params: { p, q, r: rr, s, AC, mid: 0 },
              };
            }
            // M is the midpoint of AC: AM = MC
            const rr = r.int(1, p - 1), AM = p * X + q, s = AM - rr * X;
            if (AM <= 0 || Math.abs(s) > 30) continue;
            const AC = 2 * AM, k = p - rr, rhs = s - q;
            return {
              prompt: `${V("M")} is the midpoint of ${seg("AC")}. ${seg("AM")} = ${lin(p, q)} and ${seg("MC")} = ${lin(rr, s)}. Find ${seg("AC")}.`,
              graph: fig([{ t: "seg", a: [0, 0], b: [AC, 0], role: "primary" }, { t: "pt", x: 0, y: 0, label: "A" }, { t: "pt", x: AM, y: 0, label: "M" }, { t: "pt", x: AC, y: 0, label: "C" },
                txt([AM / 2, 0.09 * AC], linPlain(p, q)), txt([AM * 1.5, 0.09 * AC], linPlain(rr, s))], [[0, -0.1 * AC], [AC, 0.15 * AC]], 0.12),
              steps: [
                `A midpoint splits a segment into two equal halves: ${seg("AM")} = ${seg("MC")}, so ${lin(p, q)} = ${lin(rr, s)}.`,
                `Subtract ${kv(rr)} from both sides${q === 0 ? "" : q > 0 ? ` and subtract ${n(q)}` : ` and add ${n(-q)}`}: ${kv(k)} = ${n(s)} − ${np(q)} = ${n(rhs)}${soX(rhs, k, X)}.`,
                `${seg("AM")} = ${ev(p, X, q)} = ${n(AM)}, and ${seg("AC")} = 2 · ${n(AM)} = ${n(AC)}.`,
              ],
              answer: { kind: "number", value: AC }, answerText: n(AC), answerInput: String(AC),
              vals: { X, k, rhs, AM, AC }, params: { p, q, r: rr, s, mid: 1 },
            };
          }
        }
        // level 3: collinear points in coordinates
        for (;;) {
          const x1 = r.int(-6, 6), y1 = r.int(-6, 6), x2 = r.int(-6, 6), y2 = r.int(-6, 6), x3 = r.int(-8, 8);
          const dx = x2 - x1, dy = y2 - y1;
          if (dx === 0 || dy === 0 || dy % dx === 0 || x3 === x1 || x3 === x2) continue;
          const m = new Frac(dy, dx), d3 = x3 - x1, prod = m.mul(d3), k = prod.add(y1);
          if (!k.isInt() || Math.abs(k.n) > 9) continue;
          return {
            prompt: `Find ${V("k")} so that ${A}(${n(x1)}, ${n(y1)}), ${B}(${n(x2)}, ${n(y2)}) and ${C}(${n(x3)}, ${V("k")}) are collinear (on one line).`,
            graph: plane([{ t: "pt", x: x1, y: y1, label: "A" }, { t: "pt", x: x2, y: y2, label: "B" }, { t: "vline", x: x3, dash: true, role: "muted" }]),
            steps: [
              `Three points are collinear when the slopes agree: slope ${seg("AB")} = slope ${seg("AC")}.`,
              `Slope ${seg("AB")} = ${M.frac(`${n(y2)} − ${np(y1)}`, `${n(x2)} − ${np(x1)}`)} = ${M.frac(n(dy), n(dx))} = ${M.f(m)}.`,
              `Slope ${seg("AC")} = ${M.frac(`${V("k")} − ${np(y1)}`, `${n(x3)} − ${np(x1)}`)} = ${M.frac(`${V("k")} − ${np(y1)}`, n(d3))}. Set it equal to ${M.f(m)}: ${V("k")} − ${np(y1)} = ${M.f(m)} · ${np(d3)} = ${n(prod.n)}.`,
              `${V("k")} = ${n(y1)} + ${np(prod.n)} = ${n(k.n)}. ${C} is (${n(x3)}, ${n(k.n)}), on the dashed line.`,
            ],
            answer: { kind: "number", value: k.n }, answerText: `${V("k")} = ${n(k.n)}`, answerInput: String(k.n),
            vals: { dx, dy, m: fracVal(m), d3, prod: prod.n, k: k.n }, params: { x1, y1, x2, y2, x3 },
          };
        }
      },
    },

    // ---- G.2 Angles: measure & types ------------------------------------------------------------
    "G.angle-types": {
      title: "Angle types, angle addition and bisectors",
      generate(r, level) {
        if (level === 1) {
          const kind = r.pick([0, 0, 1, 2, 2, 3, 4, 4]);
          const th = [r.int(2, 17) * 5, 90, r.int(19, 35) * 5, 180, r.int(37, 71) * 5][kind];
          const names = ["Acute", "Right", "Obtuse", "Straight", "Reflex"];
          const O = [0, 0], R = 3;
          const items = [{ t: "seg", a: O, b: add(O, dir(0), R), role: "primary" }, { t: "seg", a: O, b: add(O, dir(th), R), role: "primary" },
            ...arc(O, 0.8, 0, th, "highlight"), txt(add(O, dir(th / 2), 1.35), `${th}°`, "highlight"), { t: "pt", x: 0, y: 0 }];
          const reason = [
            `${dg(th)} is more than 0° and less than 90°, so the angle is acute.`,
            `It is exactly 90°: a right angle, whose sides are perpendicular.`,
            `${dg(th)} is more than 90° and less than 180°, so the angle is obtuse.`,
            `It is exactly 180°: the two sides are opposite rays, so the angle is a straight line.`,
            `${dg(th)} is more than 180° and less than 360°, so the angle is reflex: the outside of an ordinary angle of 360° − ${dg(th)} = ${dg(360 - th)}.`,
          ][kind];
          return {
            prompt: `An angle measures ${dg(th)}, measured counterclockwise along the marked arc. What type of angle is it?`,
            graph: fig(items, [[-R, -R], [R, R]], 0.08),
            steps: [`Compare the measure with 90° (a right angle) and 180° (a straight angle).`, reason],
            answer: { kind: "choice", options: names, index: kind }, answerText: names[kind],
            vals: { kind, rest: 360 - th }, params: { th }, consts: [90, 180, 360],
          };
        }
        if (level === 2) {
          const bis = r.chance(0.5);
          for (;;) {
            const X = r.int(3, 15), p = r.int(2, 6), q = r.int(-10, 20), a1 = p * X + q;
            if (a1 < 15 || a1 > 80) continue;
            let rr, s, a2;
            if (bis) { rr = r.intExcept(1, 6, p); s = a1 - rr * X; a2 = a1; if (Math.abs(s) > 40) continue; }
            else { rr = r.int(1, 6); s = r.int(-10, 20); a2 = rr * X + s; if (a2 < 15 || a2 > 100) continue; }
            const total = a1 + a2;
            if (total > 170) continue;
            const Bp = [0, 0], R = 3.2;
            const items = [{ t: "seg", a: Bp, b: add(Bp, dir(0), R), role: "primary" }, { t: "seg", a: Bp, b: add(Bp, dir(a2), R), role: "secondary" },
              { t: "seg", a: Bp, b: add(Bp, dir(total), R), role: "primary" },
              txt(add(Bp, dir(total), R + 0.35), "A"), txt([-0.3, -0.3], "B"), txt(add(Bp, dir(0), R + 0.35), "C"), txt(add(Bp, dir(a2), R + 0.35), "D"),
              txt(add(Bp, dir(a2 + a1 / 2), 1.9), dlinPlain(p, q), "highlight"), txt(add(Bp, dir(a2 / 2), 1.9), dlinPlain(rr, s), "highlight"),
              ...arc(Bp, 0.7, 0, a2), ...arc(Bp, 0.85, a2, total)];
            const g = fig(items, [[-0.5, -0.5], [R + 0.5, R + 0.5], add(Bp, dir(total), R + 0.5)], 0.08);
            if (bis) {
              const c = collect(p, q, rr, s);
              return {
                prompt: `Ray ${V("BD")} bisects ${ang("ABC")}. ${mang("ABD")} = ${dlin(p, q)} and ${mang("DBC")} = ${dlin(rr, s)}. Find ${mang("ABC")}.`,
                graph: g,
                steps: [
                  `A bisector splits the angle into two equal halves: ${lin(p, q)} = ${lin(rr, s)}.`,
                  `Collect ${x} on one side: ${c.line}${soX(c.rhs, c.k, X)}.`,
                  `${mang("ABD")} = ${ev(p, X, q)} = ${dg(a1)}, so ${mang("ABC")} = 2 · ${dg(a1)} = ${dg(total)}.`,
                ],
                answer: { kind: "number", value: total }, answerText: dg(total), answerInput: String(total),
                vals: { X, ck: c.k, crhs: c.rhs, a1, total }, params: { p, q, r: rr, s, bis: 1 },
              };
            }
            const k = p + rr, qs = q + s, rhs = total - qs;
            if (qs === 0) continue;
            return {
              prompt: `Point ${V("D")} lies in the interior of ${ang("ABC")}. ${mang("ABD")} = ${dlin(p, q)}, ${mang("DBC")} = ${dlin(rr, s)} and ${mang("ABC")} = ${dg(total)}. Find ${mang("ABD")}.`,
              graph: g,
              steps: [
                `Angle addition: ${mang("ABD")} + ${mang("DBC")} = ${mang("ABC")}, so (${lin(p, q)}) + (${lin(rr, s)}) = ${n(total)}.`,
                `Combine like terms: ${lin(k, qs)} = ${n(total)}, so ${kv(k)} = ${n(total)} − ${np(qs)} = ${n(rhs)} and ${x} = ${M.frac(n(rhs), n(k))} = ${n(X)}.`,
                `${mang("ABD")} = ${ev(p, X, q)} = ${dg(a1)}. (Check: ${mang("DBC")} = ${dg(a2)}, and ${n(a1)} + ${n(a2)} = ${n(total)}.)`,
              ],
              answer: { kind: "number", value: a1 }, answerText: dg(a1), answerInput: String(a1),
              vals: { X, k, qs, rhs, a1, a2 }, params: { p, q, r: rr, s, total, bis: 0 },
            };
          }
        }
        // level 3: the angle between the hands of a clock
        for (;;) {
          const h = r.int(1, 12), m = 2 * r.int(1, 29), H = h % 12;
          const minA = 6 * m, half = m / 2, hourA = 30 * H + half, diff = Math.abs(hourA - minA);
          const small = Math.min(diff, 360 - diff);
          if (small === 0 || small === 180 || small < 10) continue;
          const reflex = r.chance(0.5), ans = reflex ? 360 - small : small;
          const time = `${h}:${String(m).padStart(2, "0")}`;
          const hand = (a, L, role) => ({ t: "seg", a: [0, 0], b: [L * Math.sin(a * RAD), L * Math.cos(a * RAD)], role });
          const items = [{ t: "circle", c: [0, 0], r: 4, role: "muted" }, txt([0, 3.3], "12"), txt([3.3, 0], "3"), txt([0, -3.3], "6"), txt([-3.3, 0], "9"),
            hand(minA, 3.6, "primary"), hand(hourA, 2.3, "secondary"), { t: "pt", x: 0, y: 0 }];
          const steps = [
            `The minute hand turns 360° in 60 minutes, 6° per minute. At ${n(m)} minutes past the hour it points 6 · ${n(m)} = ${dg(minA)} clockwise from 12.`,
            `The hour hand moves 30° per hour plus half a degree per minute${h === 12 ? " (12 o’clock counts as 0 hours)" : ""}: 30 · ${n(H)} + ${n(m)} ÷ 2 = ${n(30 * H)} + ${n(half)} = ${dg(hourA)} from 12.`,
            diff > 180 ? `The hands are |${n(hourA)} − ${n(minA)}| = ${dg(diff)} apart. That is more than 180°, so the smaller angle is 360° − ${dg(diff)} = ${dg(small)}.`
              : `The hands are |${n(hourA)} − ${n(minA)}| = ${dg(diff)} apart, which is at most 180°, so the smaller angle is ${dg(small)}.`,
          ];
          if (reflex) steps.push(`The reflex angle is the rest of the full turn: 360° − ${dg(small)} = ${dg(ans)}.`);
          return {
            prompt: `At ${time}, what is the measure of the ${reflex ? "reflex angle between the hands of a clock (the larger angle, more than 180°)" : "smaller angle between the hands of a clock"}? Answer in degrees.`,
            graph: fig(items, [[-4, -4], [4, 4]], 0.05),
            steps,
            answer: { kind: "number", value: ans }, answerText: dg(ans), answerInput: String(ans),
            vals: { minA, H, H30: 30 * H, half, hourA, diff, small, ans }, params: { h, m, reflex: reflex ? 1 : 0 }, consts: [360, 60, 6, 30, 180],
          };
        }
      },
    },

    // ---- G.3 Angle relationships ------------------------------------------------------------------
    "G.1": {
      title: "Angle pairs and parallel lines cut by a transversal",
      generate(r, level) {
        if (level === 1) {
          const kind = r.pick(["comp", "supp", "vert", "linear"]);
          if (kind === "comp" || kind === "supp") {
            const tot = kind === "comp" ? 90 : 180, th = kind === "comp" ? r.int(5, 85) : r.int(5, 175), ans = tot - th;
            const word = kind === "comp" ? "complementary" : "supplementary";
            return {
              prompt: `Two angles are ${word}. One measures ${dg(th)}. Find the other.`,
              steps: [`${word[0].toUpperCase() + word.slice(1)} angles add to ${dg(tot)}${kind === "comp" ? " (a right angle)" : " (a straight angle)"}.`, `${dg(tot)} − ${dg(th)} = ${dg(ans)}.`],
              answer: { kind: "number", value: ans }, answerText: dg(ans), answerInput: String(ans),
              vals: { ans }, params: { th, tot }, consts: [90, 180],
            };
          }
          const th = r.pick([r.int(20, 80), r.int(100, 160)]), vert = kind === "vert", ans = vert ? th : 180 - th;
          const R = 3.5, O = [0, 0];
          const at = vert ? 180 + th / 2 : 90 + th / 2;
          const items = [{ t: "seg", a: add(O, dir(0), -R), b: add(O, dir(0), R), role: "primary" }, { t: "seg", a: add(O, dir(th), -R), b: add(O, dir(th), R), role: "primary" },
            ...arc(O, 0.7, 0, th, "highlight"), txt(add(O, dir(th / 2), 1.4), `${th}°`, "highlight"),
            ...(vert ? arc(O, 0.7, 180, 180 + th) : arc(O, 0.7, th, 180)), txt(add(O, dir(at), 1.4), "?")];
          return {
            prompt: `Two lines cross as shown. One angle measures ${dg(th)}. Find the angle marked ?.`,
            graph: fig(items, [[-R, -R], [R, R]], 0.05),
            steps: vert
              ? [`The marked angles are opposite each other at the crossing: they are vertical angles.`, `Vertical angles are equal, so ? = ${dg(ans)}.`]
              : [`The marked angles sit side by side on one line: they form a linear pair.`, `A linear pair adds to 180°: 180° − ${dg(th)} = ${dg(ans)}.`],
            answer: { kind: "number", value: ans }, answerText: dg(ans), answerInput: String(ans),
            vals: { ans }, params: { th, vert: vert ? 1 : 0 }, consts: [180],
          };
        }
        // levels 2–3: parallel lines ℓ (top) and m (bottom) cut by a transversal; angles numbered
        // clockwise from the top left at each crossing: 1 2 / 4 3 at ℓ and 5 6 / 8 7 at m.
        const PAIRS = [
          [1, 5, "corresponding", true], [2, 6, "corresponding", true], [3, 7, "corresponding", true], [4, 8, "corresponding", true],
          [3, 5, "alternate interior", true], [4, 6, "alternate interior", true],
          [1, 7, "alternate exterior", true], [2, 8, "alternate exterior", true],
          [4, 5, "same-side interior", false], [3, 6, "same-side interior", false],
        ];
        const RULE = { corresponding: "Corresponding angles (same position at each crossing) are equal when the lines are parallel.",
          "alternate interior": "Alternate interior angles (between the parallels, on opposite sides of the transversal) are equal.",
          "alternate exterior": "Alternate exterior angles (outside the parallels, on opposite sides of the transversal) are equal.",
          "same-side interior": "Same-side interior angles (between the parallels, on the same side of the transversal) are supplementary: they add to 180°." };
        let phi;
        do phi = r.int(30, 150); while (phi > 75 && phi < 105);
        // measure of angle k: positions 2, 4 (and 6, 8) equal φ; 1, 3 (and 5, 7) equal 180 − φ
        const meas = (k) => ((k - 1) % 4 === 1 || (k - 1) % 4 === 3 ? phi : 180 - phi);
        let [i, j, rel, equal] = r.pick(PAIRS);
        if (r.chance(0.5)) [i, j] = [j, i];
        const ai = meas(i), aj = meas(j);
        // figure
        const Hh = 3, T = [0, 0], Bc = [(-Hh * Math.cos(phi * RAD)) / Math.sin(phi * RAD), -Hh], u = dir(phi);
        const xs = [T[0], Bc[0]], L0 = Math.min(...xs) - 3.2, L1 = Math.max(...xs) + 3.2;
        const bis = [90 + phi / 2, phi / 2, 270 + phi / 2, 180 + phi / 2];   // positions 1, 2, 3, 4
        const items = [{ t: "seg", a: [L0, 0], b: [L1, 0], role: "primary" }, { t: "seg", a: [L0, -Hh], b: [L1, -Hh], role: "primary" },
          { t: "seg", a: add(T, u, 2.2), b: add(Bc, u, -2.2), role: "secondary" }, txt([L1 + 0.4, 0], "ℓ"), txt([L1 + 0.4, -Hh], "m")];
        const label = (k, s) => txt(add(k <= 4 ? T : Bc, dir(bis[(k - 1) % 4]), 0.75), s);
        const pts = [[L0, 0.8], [L1 + 0.6, -Hh - 0.8], add(T, u, 2.2), add(Bc, u, -2.2)];
        if (level === 2) {
          for (let k = 1; k <= 8; k++) items.push(label(k, String(k)));
          return {
            prompt: `Lines ℓ and ${V("m")} are parallel, cut by a transversal. ∠${i} = ${dg(ai)}. Find ∠${j}.`,
            graph: fig(items, pts, 0.06),
            steps: [
              `∠${i} and ∠${j} are ${rel} angles.`,
              RULE[rel],
              equal ? `So ∠${j} = ∠${i} = ${dg(aj)}.` : `So ∠${j} = 180° − ${dg(ai)} = ${dg(aj)}.`,
            ],
            answer: { kind: "number", value: aj }, answerText: dg(aj), answerInput: String(aj),
            vals: { aj }, params: { i, j, ai }, consts: [180],
          };
        }
        // level 3: the two angles as expressions in x
        for (;;) {
          const X = r.int(4, 25), p = r.int(2, 7), q = ai - p * X;
          const rr = equal ? r.intExcept(1, 7, p) : r.int(1, 7), s = aj - rr * X;
          if (Math.abs(q) > 60 || Math.abs(s) > 60) continue;
          if (!equal && q + s === 0) continue;
          items.push(label(i, dlinPlain(p, q)), label(j, dlinPlain(rr, s)));
          let solve, vals;
          if (equal) {
            const c = collect(p, q, rr, s);
            solve = [`So ${lin(p, q)} = ${lin(rr, s)}.`, `Collect ${x} on one side: ${c.line}${soX(c.rhs, c.k, X)}.`];
            vals = { X, ck: c.k, crhs: c.rhs, ai, aj };
          } else {
            const k = p + rr, qs = q + s, rhs = 180 - qs;
            solve = [`So (${lin(p, q)}) + (${lin(rr, s)}) = 180, which is ${lin(k, qs)} = 180.`, `${kv(k)} = 180 − ${np(qs)} = ${n(rhs)}${soX(rhs, k, X)}.`];
            vals = { X, k, qs, rhs, ai, aj };
          }
          return {
            prompt: `Lines ℓ and ${V("m")} are parallel. In the figure, ∠${i} = ${dlin(p, q)} and ∠${j} = ${dlin(rr, s)}. Find the measure of ∠${j}.`,
            graph: fig(items, pts, 0.06),
            steps: [
              `∠${i} and ∠${j} are ${rel} angles. ${RULE[rel]}`,
              ...solve,
              `∠${j} = ${ev(rr, X, s)} = ${dg(aj)}. (Check: ∠${i} = ${ev(p, X, q)} = ${dg(ai)}${equal ? ", the same" : `, and ${n(ai)} + ${n(aj)} = 180`}.)`,
            ],
            answer: { kind: "number", value: aj }, answerText: dg(aj), answerInput: String(aj),
            vals, params: { i, j, p, q, r: rr, s }, consts: [180],
          };
        }
      },
    },

    // ---- G.4 Classifying triangles ----------------------------------------------------------------
    "G.triangle-class": {
      title: "Classifying triangles",
      generate(r, level) {
        if (level === 1) {
          const target = r.int(0, 2), names = ["Acute", "Right", "Obtuse"];
          for (;;) {
            const A = r.int(20, 115), B = r.int(20, 115), C = 180 - A - B;
            if (C < 15) continue;
            const mx = Math.max(A, B, C), cls = mx < 90 ? 0 : mx === 90 ? 1 : 2;
            if (cls !== target || A === 90 || B === 90) continue;
            const Vs = triFromAngles(A, B);
            return {
              prompt: `Two angles of a triangle measure ${dg(A)} and ${dg(B)}. Classify the triangle by its angles.`,
              graph: fig(polyItems(Vs, { names: ["A", "B", "C"], angles: [`${A}°`, `${B}°`, "?"] }), Vs),
              steps: [
                `The angles add to 180°: the third angle is 180° − ${dg(A)} − ${dg(B)} = ${dg(C)}.`,
                `The largest angle is ${dg(mx)}, which is ${cls === 0 ? "less than 90°: an acute triangle (all three angles acute)" : cls === 1 ? "exactly 90°: a right triangle" : "more than 90°: an obtuse triangle"}.`,
              ],
              answer: { kind: "choice", options: names, index: cls }, answerText: names[cls],
              vals: { C, mx, cls }, params: { A, B }, consts: [180, 90],
            };
          }
        }
        if (level === 2) {
          const kind = r.pick(["base", "vertex", "order"]);
          if (kind === "order") {
            for (;;) {
              const a = r.int(3, 15), b = r.int(3, 15), c = r.int(3, 15);
              const srt = [a, b, c].sort((p, q) => p - q);
              if (a === b || b === c || a === c || srt[0] + srt[1] <= srt[2]) continue;
              const big = [a, b, c].indexOf(srt[2]), opts = ["∠A", "∠B", "∠C"];
              const sideName = ["BC", "CA", "AB"][big];
              const Vs = triFromSides(a, b, c);
              return {
                prompt: `In ${tri("ABC")}, ${seg("BC")} = ${n(a)}, ${seg("CA")} = ${n(b)} and ${seg("AB")} = ${n(c)}. Which angle is the largest?`,
                graph: fig(polyItems(Vs, { names: ["A", "B", "C"], sides: [String(c), String(a), String(b)] }), Vs),
                steps: [
                  `The largest angle is opposite the longest side (and the smallest angle opposite the shortest).`,
                  `The longest side is ${seg(sideName)} = ${n(srt[2])}, which does not touch vertex ${V("ABC"[big])}; it is opposite ${ang("ABC"[big])}.`,
                ],
                answer: { kind: "choice", options: opts, index: big }, answerText: opts[big],
                vals: { big, longest: srt[2] }, params: { a, b, c },
              };
            }
          }
          const base = kind === "base";
          const vtx = base ? 2 * r.int(10, 80) : null, b0 = base ? null : r.int(20, 85);
          const beta = base ? (180 - vtx) / 2 : b0, apex = base ? vtx : 180 - 2 * b0;
          const w = 3, Vs = [[-w, 0], [w, 0], [0, w * Math.tan(beta * RAD)]];
          const items = polyItems(Vs, { names: ["A", "B", "C"], angles: base ? ["?", "", `${apex}°`] : [`${beta}°`, "", "?"] });
          items.push(txt(add(mid(Vs[0], Vs[2]), unit([-Vs[2][1], w]), 0.4), "|"), txt(add(mid(Vs[1], Vs[2]), unit([Vs[2][1], w]), 0.4), "|"));
          return {
            prompt: base
              ? `${tri("ABC")} is isosceles with ${seg("CA")} = ${seg("CB")}. Its vertex angle ${ang("C")} measures ${dg(apex)}. Find the base angle ${ang("A")}.`
              : `${tri("ABC")} is isosceles with ${seg("CA")} = ${seg("CB")}. The base angle ${ang("A")} measures ${dg(beta)}. Find the vertex angle ${ang("C")}.`,
            graph: fig(items, Vs),
            steps: base
              ? [`Equal sides face equal angles (base angles theorem), so ${ang("A")} = ${ang("B")}.`, `The two base angles share what the vertex angle leaves: 180° − ${dg(apex)} = ${dg(180 - apex)}.`, `${ang("A")} = ${dg(180 - apex)} ÷ 2 = ${dg(beta)}.`]
              : [`Equal sides face equal angles (base angles theorem), so ${ang("B")} = ${ang("A")} = ${dg(beta)}.`, `${ang("C")} = 180° − 2 · ${dg(beta)} = 180° − ${dg(2 * beta)} = ${dg(apex)}.`],
            answer: { kind: "number", value: base ? beta : apex }, answerText: dg(base ? beta : apex), answerInput: String(base ? beta : apex),
            vals: base ? { rest: 180 - apex, beta } : { twob: 2 * beta, apex }, params: base ? { apex } : { beta }, consts: [180],
          };
        }
        // level 3: equilateral triangle area A = (√3/4) s², forward or backward
        const k = r.int(2, 8), s = 2 * k, s2 = s * s, area = k * k, P3 = 3 * s;
        const [thing, unitName] = r.pick([["garden bed", "m"], ["tile", "cm"], ["sail", "m"], ["warning sign", "cm"]]);
        const Vs = [[0, 0], [s, 0], [s / 2, (s * Math.sqrt(3)) / 2]];
        if (r.chance(0.5)) {
          return {
            prompt: `An equilateral triangular ${thing} has a perimeter of ${n(P3)} ${unitName}. Find its exact area in ${unitName}².`,
            graph: fig(polyItems(Vs, { sides: ["s", "s", "s"] }), Vs),
            steps: [
              `All three sides are equal: ${V("s")} = ${n(P3)} ÷ 3 = ${n(s)} ${unitName}.`,
              `Equilateral area: ${M.frac(M.sqrt("3"), "4")}${sq(V("s"))} = ${M.frac(M.sqrt("3"), "4")} · ${sq(n(s))} = ${M.frac(`${n(s2)}${M.sqrt("3")}`, "4")}.`,
              `${n(s2)} ÷ 4 = ${n(area)}, so the area is ${n(area)}${M.sqrt("3")} ${unitName}².`,
            ],
            answer: { kind: "number", value: area * Math.sqrt(3) }, answerText: `${n(area)}${M.sqrt("3")} ${unitName}²`, answerInput: `${area}sqrt(3)`,
            vals: { s, s2, area }, params: { P: P3, back: 0 }, consts: [3, 4],
          };
        }
        return {
          prompt: `An equilateral triangular ${thing} has an area of ${n(area)}${M.sqrt("3")} ${unitName}². Find its perimeter in ${unitName}.`,
          graph: fig(polyItems(Vs, { sides: ["s", "s", "s"] }), Vs),
          steps: [
            `Equilateral area: ${M.frac(M.sqrt("3"), "4")}${sq(V("s"))} = ${n(area)}${M.sqrt("3")}.`,
            `Divide both sides by ${M.sqrt("3")} and multiply by 4: ${sq(V("s"))} = 4 · ${n(area)} = ${n(s2)}.`,
            `${V("s")} = ${M.sqrt(n(s2))} = ${n(s)} ${unitName}, and the perimeter is 3 · ${n(s)} = ${n(P3)} ${unitName}.`,
          ],
          answer: { kind: "number", value: P3 }, answerText: `${n(P3)} ${unitName}`, answerInput: String(P3),
          vals: { s, s2, P: P3 }, params: { area, back: 1 }, consts: [3, 4],
        };
      },
    },

    // ---- G.5 Triangle angle sum & triangle inequality ----------------------------------------------
    "G.2": {
      title: "Triangle angle sum, exterior angles and the triangle inequality",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.5)) {
            let A, B, C;
            do { A = r.int(20, 120); B = r.int(20, 120); C = 180 - A - B; } while (C < 12);
            const Vs = triFromAngles(A, B);
            return {
              prompt: `Two angles of a triangle measure ${dg(A)} and ${dg(B)}. Find the third angle.`,
              graph: fig(polyItems(Vs, { names: ["A", "B", "C"], angles: [`${A}°`, `${B}°`, "?"] }), Vs),
              steps: [`The angles of a triangle add to 180°.`, `180° − ${dg(A)} − ${dg(B)} = ${dg(C)}.`],
              answer: { kind: "number", value: C }, answerText: dg(C), answerInput: String(C),
              vals: { C }, params: { A, B, tri: 0 }, consts: [180],
            };
          }
          for (;;) {
            const ok = r.chance(0.5), a = r.int(2, 12), b = r.int(2, 12);
            const c = ok ? r.int(Math.abs(a - b) + 1, a + b - 1) : r.int(a + b, a + b + 6);
            const srt = [a, b, c].sort((p, q) => p - q), sum = srt[0] + srt[1];
            if (srt[2] === srt[0]) continue;
            const shown = r.shuffle([a, b, c]);
            const cmp = sum > srt[2] ? "&gt;" : sum === srt[2] ? "=" : "&lt;";
            return {
              prompt: `Can segments of lengths ${n(shown[0])}, ${n(shown[1])} and ${n(shown[2])} form a triangle? Answer yes or no.`,
              steps: [
                `Sort the lengths: ${n(srt[0])} ≤ ${n(srt[1])} ≤ ${n(srt[2])}. Only the two shorter against the longest needs checking.`,
                `${n(srt[0])} + ${n(srt[1])} = ${n(sum)} ${cmp} ${n(srt[2])}.`,
                sum > srt[2] ? `The two shorter sides together are longer than the longest, so the segments form a triangle: yes.`
                  : sum === srt[2] ? `The two shorter sides only just reach: they would lie flat along the longest side, so there is no triangle: no.`
                    : `The two shorter sides cannot reach across the longest, so there is no triangle: no.`,
            ],
              answer: { kind: "text", accept: [sum > srt[2] ? "yes" : "no"] }, answerText: sum > srt[2] ? "Yes" : "No", answerInput: sum > srt[2] ? "yes" : "no",
              vals: { lo: srt[0], md: srt[1], hi: srt[2], sum }, params: { a: shown[0], b: shown[1], c: shown[2], tri: 1 },
            };
          }
        }
        if (level === 2) {
          // exterior angle theorem with expressions
          for (;;) {
            const X = r.int(3, 12), p = r.int(1, 5), rr = r.int(1, 5), q = r.int(-15, 30), s = r.int(-15, 30);
            const A = p * X + q, B = rr * X + s, ext = A + B;
            if (A < 20 || B < 20 || ext > 165) continue;
            const t = r.intExcept(2, 9, p + rr), u = ext - t * X;
            if (Math.abs(u) > 60) continue;
            const k = p + rr, qs = q + s, c = collect(t, u, k, qs);
            const Vs = triFromAngles(B, 180 - ext);           // B at origin, C on the x-axis, A on top
            const Cp = Vs[1], D = [Cp[0] + 3, 0];
            const items = [...polyItems(Vs, { names: ["B", "C", "A"] }), { t: "seg", a: Cp, b: D, role: "primary" }, txt([D[0] + 0.3, -0.35], "D"),
              txt(add(Vs[2], unit(sub(centroid(Vs), Vs[2])), 1.1), dlinPlain(p, q), "highlight"),
              txt(add(Vs[0], unit(sub(centroid(Vs), Vs[0])), 1.4), dlinPlain(rr, s), "highlight"),
              txt(add(Cp, dir((180 - (180 - ext)) / 2), 1.3), dlinPlain(t, u), "highlight")];
            return {
              prompt: `In ${tri("ABC")}, side ${seg("BC")} is extended past ${V("C")} to ${V("D")}. ${mang("A")} = ${dlin(p, q)}, ${mang("B")} = ${dlin(rr, s)} and the exterior angle ${ang("ACD")} = ${dlin(t, u)}. Find ${mang("ACD")}.`,
              graph: fig(items, [...Vs, D]),
              steps: [
                `Exterior angle theorem: an exterior angle equals the sum of the two remote interior angles, so ${mang("ACD")} = ${mang("A")} + ${mang("B")}.`,
                `${lin(t, u)} = (${lin(p, q)}) + (${lin(rr, s)}) = ${lin(k, qs)}.`,
                `Collect ${x} on one side: ${c.line}${soX(c.rhs, c.k, X)}.`,
                `${mang("ACD")} = ${ev(t, X, u)} = ${dg(ext)}. (Check: ${mang("A")} = ${dg(A)}, ${mang("B")} = ${dg(B)}, and ${n(A)} + ${n(B)} = ${n(ext)}.)`,
              ],
              answer: { kind: "number", value: ext }, answerText: dg(ext), answerInput: String(ext),
              vals: { k, qs, ck: c.k, crhs: c.rhs, X, A, B, ext }, params: { p, q, r: rr, s, t, u },
            };
          }
        }
        // level 3: how many whole-number third sides
        for (;;) {
          const a = r.int(3, 20), b = r.int(3, 20);
          if (a === b) continue;
          const diff = Math.abs(a - b), sum = a + b, lo = diff + 1, hi = sum - 1, count = hi - lo + 1;
          const [thing, u] = r.pick([["triangular garden bed", "m"], ["triangular sail", "ft"], ["triangular fence", "m"], ["triangular frame", "cm"]]);
          return {
            prompt: `Two sides of a ${thing} measure ${n(a)} ${u} and ${n(b)} ${u}. The third side is a whole number of ${u === "ft" ? "feet" : u === "m" ? "meters" : "centimeters"}. How many different lengths are possible for the third side?`,
            steps: [
              `Triangle inequality: the third side ${V("c")} is longer than the difference and shorter than the sum of the other two: ${n(Math.max(a, b))} − ${n(Math.min(a, b))} &lt; ${V("c")} &lt; ${n(a)} + ${n(b)}, so ${n(diff)} &lt; ${V("c")} &lt; ${n(sum)}.`,
              `Both inequalities are strict: the whole numbers allowed run from ${n(lo)} to ${n(hi)}.`,
              `Count them: ${n(hi)} − ${n(lo)} + 1 = ${n(count)}.`,
            ],
            answer: { kind: "number", value: count }, answerText: `${n(count)} lengths`, answerInput: String(count),
            vals: { diff, sum, lo, hi, count }, params: { a, b },
          };
        }
      },
    },

    // ---- G.6 Triangle congruence --------------------------------------------------------------------
    "G.congruence": {
      title: "Triangle congruence shortcuts and CPCTC",
      generate(r, level) {
        const OPTS = ["SSS", "SAS", "ASA", "AAS", "HL", "Not enough information"];
        /** A copy of triangle Vs reflected in a vertical line to its right (corresponding vertices in order). */
        const mirror = (Vs, gap) => { const e = extent(Vs), xm = e.x1 + gap / 2; return Vs.map((p) => [2 * xm - p[0], p[1]]); };
        if (level === 1) {
          const kind = r.int(0, 6);   // SSS, SAS, ASA, AAS, HL, SSA, AAA
          let Vs, parts, given, idx, reason;
          const sideLab = ["", "", ""], angLab = ["", "", ""], right = [];
          const sideEq = (s1, s2, v) => `${seg(s1)} = ${seg(s2)} = ${n(v)}`;
          const angEq = (a1, a2, v) => `${ang(a1)} = ${ang(a2)} = ${dg(v)}`;
          for (;;) {
            if (kind === 0) {
              const a = r.int(4, 12), b = r.int(4, 12), c = r.int(4, 12);
              const s = [a, b, c].sort((p, q) => p - q);
              if (s[0] + s[1] <= s[2]) continue;
              Vs = triFromSides(a, b, c); sideLab[0] = String(c); sideLab[1] = String(a); sideLab[2] = String(b);
              given = [sideEq("AB", "DE", c), sideEq("BC", "EF", a), sideEq("CA", "FD", b)];
              parts = { AB: c, BC: a, CA: b };
              reason = `All three pairs of sides are equal: SSS.`;
            } else if (kind === 1) {
              const c = r.int(4, 12), a = r.int(4, 12), B = r.int(30, 130);
              Vs = [add([0, 0], dir(B), c), [0, 0], [a, 0]];
              sideLab[0] = String(c); sideLab[1] = String(a); angLab[1] = `${B}°`;
              given = [sideEq("AB", "DE", c), angEq("B", "E", B), sideEq("BC", "EF", a)];
              parts = { AB: c, B, BC: a };
              reason = `${ang("B")} is formed by ${seg("AB")} and ${seg("BC")}: it is the included angle between the two sides. Side, angle, side: SAS.`;
            } else if (kind === 2) {
              const A = r.int(30, 90), B = r.int(30, 90), c = r.int(4, 12);
              if (A + B > 160) continue;
              Vs = triFromAngles(A, B, c); sideLab[0] = String(c); angLab[0] = `${A}°`; angLab[1] = `${B}°`;
              given = [angEq("A", "D", A), sideEq("AB", "DE", c), angEq("B", "E", B)];
              parts = { A, AB: c, B };
              reason = `${seg("AB")} joins the vertices of ${ang("A")} and ${ang("B")}: it is the included side between the two angles. Angle, side, angle: ASA.`;
            } else if (kind === 3) {
              const A = r.int(30, 90), B = r.int(30, 90), a = r.int(4, 12);
              if (A + B > 160) continue;
              const C = 180 - A - B, c = (a * Math.sin(C * RAD)) / Math.sin(A * RAD);
              Vs = triFromAngles(A, B, c); sideLab[1] = String(a); angLab[0] = `${A}°`; angLab[1] = `${B}°`;
              given = [angEq("A", "D", A), angEq("B", "E", B), sideEq("BC", "EF", a)];
              parts = { A, B, BC: a };
              reason = `${seg("BC")} does not join ${V("A")} and ${V("B")}, so the side is not between the two angles: angle, angle, side: AAS.`;
            } else if (kind === 4) {
              const [a, b, c] = triple(r, 30);
              Vs = [[0, b], [a, 0], [0, 0]]; sideLab[0] = String(c); sideLab[1] = String(a); right.push(2);
              given = [angEq("C", "F", 90), sideEq("AB", "DE", c), sideEq("BC", "EF", a)];
              parts = { C: 90, AB: c, BC: a };
              reason = `Both are right triangles (${ang("C")} = ${ang("F")} = 90°). ${seg("AB")} is opposite the right angle, so it is the hypotenuse, and ${seg("BC")} is a leg: hypotenuse, leg: HL.`;
            } else if (kind === 5) {
              const c = r.int(6, 12), A = r.int(25, 60), a = r.int(2, c - 1);
              if (!(c * Math.sin(A * RAD) < a - 0.3)) continue;
              const t = c * Math.cos(A * RAD) + Math.sqrt(a * a - Math.pow(c * Math.sin(A * RAD), 2));
              Vs = [[0, 0], [c, 0], add([0, 0], dir(A), t)]; sideLab[0] = String(c); sideLab[1] = String(a); angLab[0] = `${A}°`;
              given = [sideEq("AB", "DE", c), sideEq("BC", "EF", a), angEq("A", "D", A)];
              parts = { AB: c, BC: a, A };
              reason = `${ang("A")} is formed by ${seg("AB")} and ${seg("AC")}, not by ${seg("BC")}: two sides and a non-included angle (SSA). That is not a congruence shortcut. Here ${seg("BC")} is shorter than ${seg("AB")}, so two different triangles have these parts (the ambiguous case).`;
            } else {
              const A = r.int(30, 90), B = r.int(30, 90), C = 180 - A - B;
              if (C < 25) continue;
              Vs = triFromAngles(A, B, 6); angLab[0] = `${A}°`; angLab[1] = `${B}°`; angLab[2] = `${C}°`;
              given = [angEq("A", "D", A), angEq("B", "E", B), angEq("C", "F", C)];
              parts = { A, B, C };
              reason = `Three equal angles (AAA) fix the shape but not the size: the triangles are similar, but one can be a scaled copy of the other. Not enough information.`;
            }
            break;
          }
          idx = kind <= 4 ? kind : 5;
          const s = size(Vs), Ws = mirror(Vs, 0.5 * s);
          const items = [...polyItems(Vs, { names: ["A", "B", "C"], sides: sideLab, angles: angLab, right, scale: s }),
            ...polyItems(Ws, { names: ["D", "E", "F"], sides: sideLab, angles: angLab, right, role: "secondary", scale: s })];
          const order = Object.keys(parts).map((k) => (k.length === 2 ? `side ${seg(k)}` : `${ang(k)}`)).join(", ");
          return {
            prompt: `In ${tri("ABC")} and ${tri("DEF")}: ${given.join(", ")}. Which shortcut proves ${tri("ABC")} ≅ ${tri("DEF")}?`,
            graph: fig(items, [...Vs, ...Ws], 0.12),
            steps: [`The given parts of ${tri("ABC")}, in order around the triangle: ${order}.`, reason],
            answer: { kind: "choice", options: OPTS, index: idx }, answerText: OPTS[idx],
            vals: { idx }, params: { parts }, consts: [90],
          };
        }
        if (level === 2) {
          const kind = r.pick(["kiteSSS", "kiteSAS", "bowSAS", "bowASA", "bowAAS", "altHL"]);
          const legs = [5, 9, 16], hyp = { 5: 13, 9: 15, 16: 20 }, w = 12;
          let prompt, steps, idx, Vs, items, parts, prove, pv = {};
          if (kind.startsWith("kite")) {
            const [ha, hc] = r.sample(legs, 2), AB = hyp[ha], CB = hyp[hc];
            const A = [0, ha], B = [-w, 0], C = [0, -hc], D = [w, 0];
            Vs = [A, B, C, D];
            items = [...polyItems(Vs, { names: ["A", "B", "C", "D"] }), { t: "seg", a: A, b: C, role: "secondary" }];
            prove = `${tri("ABC")} ≅ ${tri("ADC")}`;
            if (kind === "kiteSSS") {
              prompt = `In quadrilateral ${V("ABCD")}, ${seg("AB")} = ${seg("AD")} = ${n(AB)} cm and ${seg("CB")} = ${seg("CD")} = ${n(CB)} cm. Which shortcut proves ${prove}?`;
              steps = [`Given: ${seg("AB")} = ${seg("AD")} and ${seg("CB")} = ${seg("CD")}.`, `Free fact: the diagonal ${seg("AC")} is a side of both triangles, and it equals itself (the reflexive property).`, `Three pairs of equal sides: SSS.`];
              idx = 0; parts = { AB: AB, BC: CB, CA: 0 }; pv = { AB, CB };
            } else {
              prompt = `In quadrilateral ${V("ABCD")}, ${seg("AB")} = ${seg("AD")} = ${n(AB)} cm and diagonal ${seg("AC")} bisects ${ang("BAD")}, so ${ang("BAC")} = ${ang("DAC")}. Which shortcut proves ${prove}?`;
              steps = [`Given: ${seg("AB")} = ${seg("AD")} and ${ang("BAC")} = ${ang("DAC")}.`, `Free fact: ${seg("AC")} is shared, so ${seg("AC")} = ${seg("AC")}.`, `In ${tri("ABC")} the angle at ${V("A")} is formed by ${seg("AB")} and ${seg("AC")}, so it is included between the two sides: SAS.`];
              idx = 1; parts = { AB: AB, A: -1, CA: 0 }; pv = { AB };
            }
            pv.ha = ha; pv.hc = hc;
          } else if (kind.startsWith("bow")) {
            const p = r.int(3, 9), q = r.int(3, 9), t = r.int(20, 40);
            const A = [-p * Math.cos(t * RAD), p * Math.sin(t * RAD)], C = [p * Math.cos(t * RAD), -p * Math.sin(t * RAD)];
            const B = [-q * Math.cos(t * RAD), -q * Math.sin(t * RAD)], D = [q * Math.cos(t * RAD), q * Math.sin(t * RAD)];
            Vs = [A, B, C, D];
            items = [{ t: "seg", a: A, b: C, role: "primary" }, { t: "seg", a: B, b: D, role: "primary" }, { t: "seg", a: A, b: B, role: "primary" }, { t: "seg", a: C, b: D, role: "primary" },
              txt(add(A, unit(A), 0.08 * size(Vs)), "A"), txt(add(B, unit(B), 0.08 * size(Vs)), "B"), txt(add(C, unit(C), 0.08 * size(Vs)), "C"), txt(add(D, unit(D), 0.08 * size(Vs)), "D"), txt([0, -0.09 * size(Vs)], "E")];
            Vs = [A, B, C, D, [0, 0]];
            prove = `${tri("AEB")} ≅ ${tri("CED")}`;
            const free = `Free fact: ${ang("AEB")} and ${ang("CED")} are vertical angles, so they are equal.`;
            if (kind === "bowSAS") {
              prompt = `Segments ${seg("AC")} and ${seg("BD")} cross at ${V("E")}, with ${seg("AE")} = ${seg("CE")} = ${n(p)} cm and ${seg("BE")} = ${seg("DE")} = ${n(q)} cm. Which shortcut proves ${prove}?`;
              steps = [`Given: ${seg("AE")} = ${seg("CE")} and ${seg("BE")} = ${seg("DE")}.`, free, `In ${tri("AEB")} the angle at ${V("E")} lies between ${seg("AE")} and ${seg("EB")}: side, included angle, side: SAS.`];
              idx = 1; parts = { AE: p, E: -1, EB: q }; pv = { p, q };
            } else if (kind === "bowASA") {
              prompt = `Segments ${seg("AC")} and ${seg("BD")} cross at ${V("E")}, with ${ang("EAB")} = ${ang("ECD")} and ${seg("AE")} = ${seg("CE")} = ${n(p)} cm. Which shortcut proves ${prove}?`;
              steps = [`Given: ${ang("EAB")} = ${ang("ECD")} and ${seg("AE")} = ${seg("CE")}.`, free, `In ${tri("AEB")} the side ${seg("AE")} joins the two angles at ${V("A")} and ${V("E")}: angle, included side, angle: ASA.`];
              idx = 2; parts = { A: -1, AE: p, E: -1 }; pv = { p };
            } else {
              prompt = `Segments ${seg("AC")} and ${seg("BD")} cross at ${V("E")}, with ${ang("EAB")} = ${ang("ECD")} and ${seg("BE")} = ${seg("DE")} = ${n(q)} cm. Which shortcut proves ${prove}?`;
              steps = [`Given: ${ang("EAB")} = ${ang("ECD")} and ${seg("BE")} = ${seg("DE")}.`, free, `In ${tri("AEB")} the side ${seg("EB")} does not join the angles at ${V("A")} and ${V("E")}: angle, angle, non-included side: AAS.`];
              idx = 3; parts = { A: -1, E: -1, EB: q }; pv = { q };
            }
            pv.t = t;
          } else {
            const h = r.pick(legs), AB = hyp[h];
            const A = [-w, 0], B = [0, h], C = [w, 0], D = [0, 0];
            Vs = [A, B, C, D];
            items = [...polyItems([A, B, C], { names: ["A", "B", "C"] }), { t: "seg", a: B, b: D, role: "secondary" }, txt([0, -0.07 * size(Vs)], "D"), ...rightMark(D, C, B, 0.05 * size(Vs))];
            prove = `${tri("ABD")} ≅ ${tri("CBD")}`;
            prompt = `In ${tri("ABC")}, ${seg("AB")} = ${seg("CB")} = ${n(AB)} cm, and ${seg("BD")} is perpendicular to ${seg("AC")} at ${V("D")}. Which shortcut proves ${prove}?`;
            steps = [`Given: ${seg("AB")} = ${seg("CB")}, and ${ang("BDA")} = ${ang("BDC")} = 90°, so both triangles are right triangles.`, `Free fact: the leg ${seg("BD")} is shared.`, `${seg("AB")} and ${seg("CB")} are opposite the right angles, so they are the hypotenuses: hypotenuse, leg: HL.`];
            idx = 4; parts = { D: 90, AB: AB, BD: 0 }; pv = { h, AB };
          }
          const opts = OPTS.slice(0, 5);
          return {
            prompt, graph: fig(items, Vs, 0.15), steps,
            answer: { kind: "choice", options: opts, index: idx }, answerText: opts[idx],
            vals: { idx }, params: Object.assign({ kind, parts }, pv), consts: [90],
          };
        }
        // level 3: CPCTC with a scrambled correspondence
        const perm = r.pick(["DEF", "DFE", "EDF", "EFD", "FDE", "FED"]);
        const [X1, Y1, Z1] = perm.split("");
        const corr = `${V("A")} ↔ ${V(X1)}, ${V("B")} ↔ ${V(Y1)}, ${V("C")} ↔ ${V(Z1)}`;
        const drawPair = (Vs) => {
          const s = size(Vs), e = extent(Vs), cx = e.x1 + 0.25 * s, cyy = (e.y0 + e.y1) / 2;
          const Ws = Vs.map((p) => [2 * cx - p[0], 2 * cyy - p[1]]);   // a half-turn copy to the right
          return { items: [...polyItems(Vs, { names: ["A", "B", "C"], scale: s }), ...polyItems(Ws, { names: [X1, Y1, Z1], role: "secondary", scale: s })], pts: [...Vs, ...Ws] };
        };
        for (;;) {
          const X = r.int(3, 15), p = r.int(2, 6), rr = r.intExcept(1, 6, p);
          if (r.chance(0.5)) {
            const A = r.int(30, 100), B = r.int(30, 100), C = 180 - A - B;
            if (C < 20) continue;
            const q = A - p * X, s = A - rr * X;
            if (Math.abs(q) > 50 || Math.abs(s) > 50) continue;
            const c = collect(p, q, rr, s), d = drawPair(triFromAngles(A, B));
            return {
              prompt: `${tri("ABC")} ≅ ${tri(perm)}. ${mang("A")} = ${dlin(p, q)}, ${mang(X1)} = ${dlin(rr, s)} and ${mang("B")} = ${dg(B)}. Find ${mang(Z1)}.`,
              graph: fig(d.items, d.pts, 0.12),
              steps: [
                `The order of the letters gives the correspondence: ${corr}.`,
                `Corresponding parts of congruent triangles are congruent (CPCTC), so ${ang("A")} = ${ang(X1)}: ${lin(p, q)} = ${lin(rr, s)}.`,
                `Collect ${x} on one side: ${c.line}${soX(c.rhs, c.k, X)}, and ${mang("A")} = ${ev(p, X, q)} = ${dg(A)}.`,
                `${ang(Z1)} corresponds to ${ang("C")}, and ${mang("C")} = 180° − ${dg(A)} − ${dg(B)} = ${dg(C)}. So ${mang(Z1)} = ${dg(C)}.`,
              ],
              answer: { kind: "number", value: C }, answerText: dg(C), answerInput: String(C),
              vals: { X, ck: c.k, crhs: c.rhs, A, C }, params: { perm, p, q, r: rr, s, B, ang: 1 }, consts: [180],
            };
          }
          const AB = r.int(4, 15), BC = r.int(4, 15), CA = r.int(4, 15);
          const srt = [AB, BC, CA].sort((u, v) => u - v);
          if (srt[0] + srt[1] <= srt[2]) continue;
          const q = AB - p * X, s = AB - rr * X;
          if (Math.abs(q) > 40 || Math.abs(s) > 40) continue;
          const c = collect(p, q, rr, s), per = AB + BC + CA, d = drawPair(triFromSides(BC, CA, AB));
          return {
            prompt: `${tri("ABC")} ≅ ${tri(perm)}. ${seg("AB")} = ${lin(p, q)}, ${seg(X1 + Y1)} = ${lin(rr, s)}, ${seg("BC")} = ${n(BC)} and ${seg("CA")} = ${n(CA)}. Find the perimeter of ${tri(perm)}.`,
            graph: fig(d.items, d.pts, 0.12),
            steps: [
              `The order of the letters gives the correspondence: ${corr}, so ${seg("AB")} ↔ ${seg(X1 + Y1)}.`,
              `CPCTC: ${seg("AB")} = ${seg(X1 + Y1)}, so ${lin(p, q)} = ${lin(rr, s)}. Collect ${x} on one side: ${c.line}${soX(c.rhs, c.k, X)}.`,
              `${seg("AB")} = ${ev(p, X, q)} = ${n(AB)}.`,
              `Congruent triangles have equal perimeters: ${n(AB)} + ${n(BC)} + ${n(CA)} = ${n(per)}.`,
            ],
            answer: { kind: "number", value: per }, answerText: n(per), answerInput: String(per),
            vals: { X, ck: c.k, crhs: c.rhs, AB, per }, params: { perm, p, q, r: rr, s, BC, CA, ang: 0 },
          };
        }
      },
    },

    // ---- G.7 Pythagorean theorem ----------------------------------------------------------------------
    "G.3": {
      title: "The Pythagorean theorem and its converse",
      generate(r, level) {
        const rt = (a, b, labs) => { const Vs = [[0, 0], [a, 0], [0, b]]; return fig(polyItems(Vs, { sides: labs, right: [0] }), Vs); };
        if (level === 1) {
          const [a, b, c] = triple(r, 30);
          return {
            prompt: `A right triangle has legs ${n(a)} cm and ${n(b)} cm. Find the hypotenuse in cm.`,
            graph: rt(a, b, [String(a), "?", String(b)]),
            steps: [
              `Pythagorean theorem: ${sq(V("a"))} + ${sq(V("b"))} = ${sq(V("c"))}, with ${V("c")} the hypotenuse.`,
              `${sq(n(a))} + ${sq(n(b))} = ${n(a * a)} + ${n(b * b)} = ${n(c * c)}.`,
              `${V("c")} = ${M.sqrt(n(c * c))} = ${n(c)} cm.`,
            ],
            answer: { kind: "number", value: c }, answerText: `${n(c)} cm`, answerInput: String(c),
            vals: { aa: a * a, bb: b * b, cc: c * c, c }, params: { a, b },
          };
        }
        if (level === 2) {
          const kind = r.pick(["leg", "root", "euclid"]);
          if (kind === "leg") {
            const [a, b, c] = triple(r, 45);
            return {
              prompt: `A right triangle has hypotenuse ${n(c)} and one leg ${n(a)}. Find the other leg.`,
              graph: rt(a, b, [String(a), String(c), "?"]),
              steps: [
                `${sq(V("a"))} + ${sq(V("b"))} = ${sq(V("c"))}, so the missing leg is ${V("b")} = ${M.sqrt(`${sq(V("c"))} − ${sq(V("a"))}`)}: subtract squares for a leg.`,
                `${sq(n(c))} − ${sq(n(a))} = ${n(c * c)} − ${n(a * a)} = ${n(b * b)}.`,
                `${V("b")} = ${M.sqrt(n(b * b))} = ${n(b)}.`,
              ],
              answer: { kind: "number", value: b }, answerText: n(b), answerInput: String(b),
              vals: { aa: a * a, bb: b * b, cc: c * c, b }, params: { a, c, kind: "leg" },
            };
          }
          if (kind === "root") {
            for (;;) {
              const a = r.int(1, 9), b = r.int(1, 9), N = a * a + b * b, [k, s] = splitRoot(N);
              if (s === 1 || a === b && r.chance(0.7)) continue;
              return {
                prompt: `A right triangle has legs ${n(a)} and ${n(b)}. Find the exact length of the hypotenuse in simplest radical form.`,
                graph: rt(a, b, [String(a), "?", String(b)]),
                steps: [
                  `${sq(V("c"))} = ${sq(n(a))} + ${sq(n(b))} = ${n(a * a)} + ${n(b * b)} = ${n(N)}.`,
                  k > 1 ? `${V("c")} = ${M.sqrt(n(N))}. The largest square factor of ${n(N)} is ${n(k * k)}: ${M.sqrt(n(N))} = ${M.sqrt(`${n(k * k)} · ${n(s)}`)} = ${rootText(k, s)}.`
                    : `${V("c")} = ${M.sqrt(n(N))}, which does not simplify (${n(N)} has no square factor other than 1).`,
                ],
                answer: { kind: "number", value: k * Math.sqrt(s) }, answerText: rootText(k, s), answerInput: rootIn(k, s),
                vals: { aa: a * a, bb: b * b, N, k, kk: k * k, s }, params: { a, b, kind: "root" },
              };
            }
          }
          const m = r.int(2, 7), nn = r.int(1, m - 1);
          const a = m * m - nn * nn, b = 2 * m * nn, c = m * m + nn * nn;
          return {
            prompt: `Euclid's formula makes the Pythagorean triple (${sq(V("m"))} − ${sq(V("n"))}, 2${V("m")}${V("n")}, ${sq(V("m"))} + ${sq(V("n"))}). Find the triple for ${V("m")} = ${n(m)} and ${V("n")} = ${n(nn)}. Enter the three numbers in that order.`,
            steps: [
              `${sq(V("m"))} − ${sq(V("n"))} = ${n(m * m)} − ${n(nn * nn)} = ${n(a)}.`,
              `2${V("m")}${V("n")} = 2 · ${n(m)} · ${n(nn)} = ${n(b)}.`,
              `${sq(V("m"))} + ${sq(V("n"))} = ${n(m * m)} + ${n(nn * nn)} = ${n(c)}.`,
              `Check: ${sq(n(a))} + ${sq(n(b))} = ${n(a * a)} + ${n(b * b)} = ${n(c * c)} = ${sq(n(c))}.`,
            ],
            answer: { kind: "numbers", values: [a, b, c], ordered: true }, answerText: `${n(a)}, ${n(b)}, ${n(c)}`, answerInput: `${a}, ${b}, ${c}`,
            vals: { mm: m * m, nn2: nn * nn, a, b, c, aa: a * a, bb: b * b, cc: c * c }, params: { m, n: nn, kind: "euclid" },
          };
        }
        // level 3
        const kind = r.pick(["ladder", "screen", "classify"]);
        if (kind === "ladder") {
          for (;;) {
            const [d, h, L] = triple(r, 30);
            if (d > h) continue;
            const Vs = [[0, 0], [d, 0], [0, h]];
            return {
              prompt: `${aNum(L, true)} ${n(L)} ft ladder leans against a vertical wall with its foot ${n(d)} ft from the wall. How high up the wall does it reach, in feet?`,
              graph: fig([...polyItems(Vs, { sides: [`${d} ft`, `${L} ft`, "?"], right: [0] }), { t: "seg", a: [0, 0], b: [0, h * 1.15], role: "muted" }], Vs),
              steps: [
                `The wall, the ground and the ladder form a right triangle; the ladder is the hypotenuse.`,
                `${sq(V("h"))} = ${sq(n(L))} − ${sq(n(d))} = ${n(L * L)} − ${n(d * d)} = ${n(h * h)}.`,
                `${V("h")} = ${M.sqrt(n(h * h))} = ${n(h)} ft.`,
              ],
              answer: { kind: "number", value: h }, answerText: `${n(h)} ft`, answerInput: String(h),
              vals: { LL: L * L, dd: d * d, hh: h * h, h }, params: { L, d, kind },
            };
          }
        }
        if (kind === "screen") {
          const k = r.pick([4, 5, 6, 8, 10, 11, 12, 13]), w = 4 * k, h = 3 * k, dgl = 5 * k;
          const Vs = [[0, 0], [w, 0], [w, h], [0, h]];
          return {
            prompt: `A rectangular screen is ${n(w)} inches wide and ${n(h)} inches tall. Screens are sold by their diagonal. What is its diagonal, in inches?`,
            graph: fig([...polyItems(Vs, { sides: [`${w} in`, `${h} in`] }), { t: "seg", a: [0, 0], b: [w, h], role: "secondary", dash: true }], Vs),
            steps: [
              `The diagonal splits the screen into two right triangles with legs ${n(w)} and ${n(h)}.`,
              `${sq(V("d"))} = ${sq(n(w))} + ${sq(n(h))} = ${n(w * w)} + ${n(h * h)} = ${n(dgl * dgl)}.`,
              `${V("d")} = ${M.sqrt(n(dgl * dgl))} = ${n(dgl)} inches.`,
            ],
            answer: { kind: "number", value: dgl }, answerText: `${n(dgl)} in`, answerInput: String(dgl),
            vals: { ww: w * w, hh: h * h, dd: dgl * dgl, d: dgl }, params: { w, h, kind },
          };
        }
        for (;;) {
          let a, b, c;
          if (r.chance(0.3)) [a, b, c] = triple(r, 30).sort((p, q) => p - q);
          else { a = r.int(3, 15); b = r.int(a, 16); c = r.int(b, 20); }
          if (a + b <= c || (c === b && r.chance(0.7))) continue;
          const lhs = a * a + b * b, cc = c * c, idx = cc < lhs ? 0 : cc === lhs ? 1 : 2;
          const opts = ["Acute", "Right", "Obtuse"];
          const sides = r.shuffle([a, b, c]);
          return {
            prompt: `A triangle has sides ${n(sides[0])}, ${n(sides[1])} and ${n(sides[2])}. Is it acute, right or obtuse?`,
            steps: [
              `Compare the square of the longest side, ${n(c)}, with the sum of the squares of the other two.`,
              `${sq(n(c))} = ${n(cc)}; ${sq(n(a))} + ${sq(n(b))} = ${n(a * a)} + ${n(b * b)} = ${n(lhs)}.`,
              idx === 1 ? `They are equal, so by the converse of the Pythagorean theorem the angle opposite ${n(c)} is a right angle: a right triangle.`
                : idx === 0 ? `${n(cc)} &lt; ${n(lhs)}: the longest side is too short for a right angle, so its opposite angle (the largest) is less than 90°: an acute triangle.`
                  : `${n(cc)} &gt; ${n(lhs)}: the longest side is too long for a right angle, so its opposite angle is more than 90°: an obtuse triangle.`,
            ],
            answer: { kind: "choice", options: opts, index: idx }, answerText: opts[idx],
            vals: { cc, aa: a * a, bb: b * b, lhs, idx }, params: { a: sides[0], b: sides[1], c: sides[2], kind }, consts: [90],
          };
        }
      },
    },

    // ---- G.8 Special right triangles -----------------------------------------------------------------
    "G.4": {
      title: "45–45–90 and 30–60–90 triangles",
      generate(r, level) {
        const t45 = (k, labs) => { const Vs = [[0, 0], [k, 0], [0, k]]; return fig(polyItems(Vs, { sides: labs, right: [0], angles: ["", "45°", "45°"] }), Vs); };
        // 30–60–90: right angle at the origin, the 30° angle at (k√3, 0), the 60° angle at (0, k)
        const t30 = (k, labs) => { const Vs = [[0, 0], [k * Math.sqrt(3), 0], [0, k]]; return fig(polyItems(Vs, { sides: labs, right: [0], angles: ["", "30°", "60°"] }), Vs); };
        const r2 = M.sqrt("2"), r3 = M.sqrt("3");
        if (level === 1) {
          const k = r.int(2, 12);
          if (r.chance(0.4)) {
            return {
              prompt: `A 45–45–90 triangle has legs of length ${n(k)}. Find the exact length of the hypotenuse.`,
              graph: t45(k, [String(k), "?", String(k)]),
              steps: [`The sides of a 45–45–90 triangle are in the ratio ${x} : ${x} : ${x}${r2}: the hypotenuse is a leg times ${r2}.`, `Hypotenuse = ${n(k)}${r2}.`],
              answer: { kind: "number", value: k * Math.SQRT2 }, answerText: `${n(k)}${r2}`, answerInput: `${k}sqrt(2)`,
              vals: { k }, params: { k, kind: "45" },
            };
          }
          const hyp = r.chance(0.5);
          return {
            prompt: `In a 30–60–90 triangle the shorter leg (opposite 30°) is ${n(k)}. Find the exact length of the ${hyp ? "hypotenuse" : "longer leg"}.`,
            graph: t30(k, [hyp ? "" : "?", hyp ? "?" : "", String(k)]),
            steps: [`The sides of a 30–60–90 triangle are in the ratio ${x} : ${x}${r3} : 2${x}, where ${x} is the shorter leg.`,
              hyp ? `The hypotenuse is twice the shorter leg: 2 · ${n(k)} = ${n(2 * k)}.` : `The longer leg is the shorter leg times ${r3}: ${n(k)}${r3}.`],
            answer: { kind: "number", value: hyp ? 2 * k : k * Math.sqrt(3) }, answerText: hyp ? n(2 * k) : `${n(k)}${r3}`, answerInput: hyp ? String(2 * k) : `${k}sqrt(3)`,
            vals: { k, h: 2 * k }, params: { k, kind: hyp ? "30hyp" : "30long" },
          };
        }
        if (level === 2) {
          const kind = r.pick(["45hyp", "30long", "30hyp"]), k = r.int(2, 12);
          if (kind === "45hyp") {
            const h = 2 * k;
            return {
              prompt: `A 45–45–90 triangle has a hypotenuse of ${n(h)}. Find the exact length of each leg.`,
              graph: t45(k * Math.SQRT2, ["?", String(h), "?"]),
              steps: [
                `Hypotenuse = leg · ${r2}, so leg = ${M.frac(n(h), r2)}.`,
                `Rationalize: ${M.frac(n(h), r2)} · ${M.frac(r2, r2)} = ${M.frac(`${n(h)}${r2}`, "2")} = ${n(k)}${r2}.`,
              ],
              answer: { kind: "number", value: k * Math.SQRT2 }, answerText: `${n(k)}${r2}`, answerInput: `${k}sqrt(2)`,
              vals: { k }, params: { h, kind },
            };
          }
          if (kind === "30long") {
            return {
              prompt: `In a 30–60–90 triangle the longer leg is ${n(k)}${r3}. Find the hypotenuse.`,
              graph: t30(k, [`${k}√3`, "?", ""]),
              steps: [
                `The longer leg is the shorter leg times ${r3}, so the shorter leg is ${n(k)}${r3} ÷ ${r3} = ${n(k)}.`,
                `The hypotenuse is twice the shorter leg: 2 · ${n(k)} = ${n(2 * k)}.`,
              ],
              answer: { kind: "number", value: 2 * k }, answerText: n(2 * k), answerInput: String(2 * k),
              vals: { h: 2 * k }, params: { k, kind },
            };
          }
          const h = 2 * k;
          return {
            prompt: `In a 30–60–90 triangle the hypotenuse is ${n(h)}. Find the exact length of the longer leg.`,
            graph: t30(k, ["?", String(h), ""]),
            steps: [
              `The shorter leg is half the hypotenuse: ${n(h)} ÷ 2 = ${n(k)}.`,
              `The longer leg is the shorter leg times ${r3}: ${n(k)}${r3}.`,
            ],
            answer: { kind: "number", value: k * Math.sqrt(3) }, answerText: `${n(k)}${r3}`, answerInput: `${k}sqrt(3)`,
            vals: { k }, params: { h, kind },
          };
        }
        // level 3: word problems
        const kind = r.pick(["park", "truss", "ladder"]);
        if (kind === "park") {
          const s = 10 * r.int(2, 9), two = 2 * s;
          const Vs = [[0, 0], [s, 0], [s, s], [0, s]];
          return {
            prompt: `A square park is ${n(s)} m on each side. Instead of walking along two sides from one corner to the opposite corner, Maya cuts straight across the diagonal. How many meters shorter is her walk? Give an exact answer.`,
            graph: fig([...polyItems(Vs, { sides: [`${s} m`, `${s} m`] }), { t: "seg", a: [0, 0], b: [s, s], role: "secondary", dash: true }], Vs),
            steps: [
              `Along two sides: 2 · ${n(s)} = ${n(two)} m.`,
              `The diagonal splits the square into two 45–45–90 triangles, so it is a side times ${r2}: ${n(s)}${r2} m.`,
              `The saving is (${n(two)} − ${n(s)}${r2}) m (about ${n(Math.round((two - s * Math.SQRT2) * 10) / 10)} m).`,
            ],
            answer: { kind: "number", value: two - s * Math.SQRT2 }, answerText: `(${n(two)} − ${n(s)}${r2}) m`, answerInput: `${two} - ${s}sqrt(2)`,
            vals: { two, approx: Math.round((two - s * Math.SQRT2) * 10) / 10 }, params: { s, kind },
          };
        }
        const k = r.int(2, 9), L = 2 * k;
        if (kind === "truss") {
          const Vs = [[0, 0], [L, 0], [k, k * Math.sqrt(3)]];
          return {
            prompt: `A roof truss is an equilateral triangle with ${n(L)} m sides. How tall is it, from the middle of the base to the peak? Give an exact answer in meters.`,
            graph: fig([...polyItems(Vs, { sides: [`${L} m`, `${L} m`, `${L} m`] }), { t: "seg", a: [k, 0], b: Vs[2], role: "secondary", dash: true }, ...rightMark([k, 0], [L, 0], Vs[2], 0.05 * L)], Vs),
            steps: [
              `The height splits the equilateral triangle into two 30–60–90 triangles with hypotenuse ${n(L)} m.`,
              `The shorter leg is half the base: ${n(L)} ÷ 2 = ${n(k)} m.`,
              `The height is the longer leg: ${n(k)}${r3} m.`,
            ],
            answer: { kind: "number", value: k * Math.sqrt(3) }, answerText: `${n(k)}${r3} m`, answerInput: `${k}sqrt(3)`,
            vals: { k }, params: { L, kind },
          };
        }
        const Vs = [[0, 0], [k, 0], [0, k * Math.sqrt(3)]];
        return {
          prompt: `${aNum(L, true)} ${n(L)} m ladder leans against a wall, making a 60° angle with the ground. How high up the wall does it reach? Give an exact answer in meters.`,
          graph: fig([...polyItems([[k, 0], [0, 0], [0, k * Math.sqrt(3)]], { sides: ["", "?", `${L} m`], right: [1], angles: ["60°", "", ""] })], Vs),
          steps: [
            `The ladder, wall and ground form a 30–60–90 triangle with the ladder as the hypotenuse; the 30° angle is at the top.`,
            `The foot's distance from the wall is opposite the 30° angle: half the ladder, ${n(L)} ÷ 2 = ${n(k)} m.`,
            `The height is opposite the 60° angle, the longer leg: ${n(k)}${r3} m.`,
          ],
          answer: { kind: "number", value: k * Math.sqrt(3) }, answerText: `${n(k)}${r3} m`, answerInput: `${k}sqrt(3)`,
          vals: { k }, params: { L, kind }, consts: [60, 30],
        };
      },
    },

    // ---- G.9 Similar figures & scale factor -----------------------------------------------------------
    "G.5": {
      title: "Scale factor: lengths, areas and volumes",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const k = r.pick([new Frac(2), new Frac(3), new Frac(4), new Frac(3, 2), new Frac(5, 2), new Frac(1, 2)]);
            const a = k.d * r.int(2, 8), b = k.d * r.int(2, 8), c = k.d * r.int(2, 8);
            const srt = [a, b, c].sort((p, q) => p - q);
            if (srt[0] + srt[1] <= srt[2]) continue;
            const ask = r.pick(["BC", "CA"]), known = ask === "BC" ? b : c, ans = k.mul(known).n, DE = k.mul(a).n;
            const img = { BC: "EF", CA: "FD" }[ask];
            const Vs = triFromSides(b, c, a), s1 = size(Vs), kk = k.value, e = extent(Vs);
            const Ws = Vs.map((p) => [e.x1 + 0.4 * s1 + p[0] * kk, p[1] * kk]);
            const lab1 = [String(a), String(b), String(c)], lab2 = [String(DE), ask === "BC" ? "?" : "", ask === "CA" ? "?" : ""];
            return {
              prompt: `${tri("ABC")} ∼ ${tri("DEF")}. ${seg("AB")} = ${n(a)}, ${seg("BC")} = ${n(b)}, ${seg("CA")} = ${n(c)} and ${seg("DE")} = ${n(DE)}. Find ${seg(img)}.`,
              graph: fig([...polyItems(Vs, { names: ["A", "B", "C"], sides: lab1 }), ...polyItems(Ws, { names: ["D", "E", "F"], sides: lab2, role: "secondary" })], [...Vs, ...Ws], 0.12),
              steps: [
                `The vertex order matches the sides: ${seg("AB")} ↔ ${seg("DE")}, ${seg("BC")} ↔ ${seg("EF")}, ${seg("CA")} ↔ ${seg("FD")}.`,
                `Scale factor from ${tri("ABC")} to ${tri("DEF")}: ${V("k")} = ${M.frac(seg("DE"), seg("AB"))} = ${M.frac(n(DE), n(a))} = ${M.f(k)}.`,
                `${seg(img)} = ${V("k")} · ${seg(ask)} = ${M.f(k)} · ${n(known)} = ${n(ans)}.`,
              ],
              answer: { kind: "number", value: ans }, answerText: n(ans), answerInput: String(ans),
              vals: { DE, k: fracVal(k), ans }, params: { a, b, c, DE, ask },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            const p = r.int(1, 5), q = r.int(2, 6);
            if (p >= q || P.gcd(p, q) !== 1) continue;
            const k = new Frac(q, p), k2 = k.mul(k);
            if (r.chance(0.5)) {
              const s1 = p * r.int(1, 4), s2 = s1 * q / p, A1 = p * p * r.int(2, 12), A2 = k2.mul(A1).n;
              const [thing, u] = r.pick([["rooms on a floor plan", "m"], ["triangular sails", "m"], ["photo prints", "cm"], ["garden plots", "m"]]);
              return {
                prompt: `Two similar ${thing} have corresponding sides of ${n(s1)} ${u} and ${n(s2)} ${u}. The smaller has an area of ${n(A1)} ${u}². Find the area of the larger, in ${u}².`,
                steps: [
                  `Scale factor: ${V("k")} = ${M.frac(n(s2), n(s1))} = ${M.f(k)}.`,
                  `Areas scale by ${sq(V("k"))}: ${sq(`(${M.f(k)})`)} = ${M.f(k2)}.`,
                  `${n(A1)} · ${M.f(k2)} = ${n(A2)} ${u}².`,
                ],
                answer: { kind: "number", value: A2 }, answerText: `${n(A2)} ${u}²`, answerInput: String(A2),
                vals: { k: fracVal(k), k2: fracVal(k2), A2 }, params: { s1, s2, A1, kind: "area" },
              };
            }
            const A1 = p * p * r.int(1, 6), A2 = k2.mul(A1).n, P1 = p * r.int(3, 12), P2 = k.mul(P1).n;
            return {
              prompt: `Two similar triangles have areas ${n(A1)} cm² and ${n(A2)} cm². The smaller has a perimeter of ${n(P1)} cm. Find the perimeter of the larger, in cm.`,
              steps: [
                `Areas scale by ${sq(V("k"))}: ${sq(V("k"))} = ${M.frac(n(A2), n(A1))} = ${M.f(k2)}.`,
                `So ${V("k")} = ${M.sqrt(M.f(k2))} = ${M.f(k)}. Perimeters are lengths, so they scale by ${V("k")} itself.`,
                `${n(P1)} · ${M.f(k)} = ${n(P2)} cm.`,
              ],
              answer: { kind: "number", value: P2 }, answerText: `${n(P2)} cm`, answerInput: String(P2),
              vals: { k: fracVal(k), k2: fracVal(k2), P2 }, params: { A1, A2, P1, kind: "perim" },
            };
          }
        }
        for (;;) {
          const p = r.int(1, 4), q = r.int(2, 5);
          if (p >= q || P.gcd(p, q) !== 1) continue;
          const k = new Frac(q, p), k3 = k.pow(3), k2 = k.mul(k);
          if (r.chance(0.5)) {
            const h1 = p * r.int(2, 6), h2 = k.mul(h1).n, V1 = p * p * p * r.int(2, 20), V2 = k3.mul(V1).n;
            if (V2 > 5000) continue;
            return {
              prompt: `Two similar bottles are ${n(h1)} cm and ${n(h2)} cm tall. The smaller holds ${n(V1)} mL. How much does the larger hold, in mL?`,
              steps: [
                `Scale factor for lengths: ${V("k")} = ${M.frac(n(h2), n(h1))} = ${M.f(k)}.`,
                `Volumes have three length dimensions, so they scale by ${M.sup(V("k"), 3)} = ${M.sup(`(${M.f(k)})`, 3)} = ${M.f(k3)}.`,
                `${n(V1)} · ${M.f(k3)} = ${n(V2)} mL.`,
              ],
              answer: { kind: "number", value: V2 }, answerText: `${n(V2)} mL`, answerInput: String(V2),
              vals: { k: fracVal(k), k3: fracVal(k3), V2 }, params: { h1, h2, V1, kind: "vol" }, consts: [3],
            };
          }
          const m = r.int(1, 4), V1 = p * p * p * m, V2 = q * q * q * m, S1 = p * p * r.int(3, 30), S2 = k2.mul(S1).n;
          return {
            prompt: `Two similar solids have volumes ${n(V1)} cm³ and ${n(V2)} cm³. The smaller has a surface area of ${n(S1)} cm². Find the surface area of the larger, in cm².`,
            steps: [
              `Volumes scale by ${M.sup(V("k"), 3)}: ${M.sup(V("k"), 3)} = ${fracEq(V2, V1)}.`,
              `Take the cube root: ${V("k")} = ${M.f(k)}${p === 1 ? "" : ` (since ${M.sup(n(q), 3)} = ${n(q * q * q)} and ${M.sup(n(p), 3)} = ${n(p * p * p)})`}.`,
              `Surface areas scale by ${sq(V("k"))} = ${M.f(k2)}: ${n(S1)} · ${M.f(k2)} = ${n(S2)} cm².`,
            ],
            answer: { kind: "number", value: S2 }, answerText: `${n(S2)} cm²`, answerInput: String(S2),
            vals: { k: fracVal(k), k3: fracVal(k3), k2: fracVal(k2), S2, qqq: q * q * q, ppp: p * p * p }, params: { V1, V2, S1, kind: "sa" }, consts: [3],
          };
        }
      },
    },

    // ---- G.10 Similarity criteria & proportional segments ----------------------------------------------
    "G.similarity": {
      title: "Similar triangles: shadows, side splitters and geometric means",
      generate(r, level) {
        if (level === 1) {
          for (;;) {
            const h1 = r.int(2, 4), s1 = r.int(2, 6), t = r.int(2, 8), s2 = s1 * t, H = h1 * t;
            if (H > 30 || s1 === h1) continue;
            const g = 0.6 * s1;
            const pole = [[0, 0], [0, h1], [s1, 0]], tree = [[s1 + g, 0], [s1 + g, H], [s1 + g + s2, 0]];
            const items = [...polyItems(pole, { sides: [`${h1} m`, "", `${s1} m`], right: [0], scale: H }), ...polyItems(tree, { sides: ["?", "", `${s2} m`], right: [0], role: "secondary", scale: H })];
            return {
              prompt: `At the same moment, ${aNum(h1)} ${n(h1)} m pole casts ${aNum(s1)} ${n(s1)} m shadow and a tree casts ${aNum(s2)} ${n(s2)} m shadow. How tall is the tree, in meters?`,
              graph: fig(items, [...pole, ...tree], 0.08),
              steps: [
                `The sun's rays make the same angle with the ground for both, and both stand at right angles to the ground, so the triangles are similar (AA).`,
                `Corresponding sides are proportional: ${M.frac(V("h"), n(h1))} = ${M.frac(n(s2), n(s1))}.`,
                `${V("h")} = ${n(h1)} · ${M.frac(n(s2), n(s1))} = ${n(h1)} · ${n(t)} = ${n(H)} m.`,
              ],
              answer: { kind: "number", value: H }, answerText: `${n(H)} m`, answerInput: String(H),
              vals: { t, H }, params: { h1, s1, s2 },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            if (r.chance(0.5)) {
              const a = r.int(2, 9), b = r.int(2, 9), c = r.int(2, 12), num = c * b;
              if (num % a !== 0 || a === b) continue;
              const ec = num / a;
              const B = [0, 0], C = [10, 0], A = [3.5, 7], f = a / (a + b);
              const D = add(A, sub(B, A), f), E = add(A, sub(C, A), f);
              const items = [...polyItems([A, B, C], { names: ["A", "B", "C"] }), { t: "seg", a: D, b: E, role: "secondary" },
                txt(add(D, [-0.6, 0.1]), "D"), txt(add(E, [0.6, 0.1]), "E"),
                txt(add(mid(A, D), [-0.7, 0]), String(a)), txt(add(mid(D, B), [-0.7, 0]), String(b)), txt(add(mid(A, E), [0.7, 0]), String(c)), txt(add(mid(E, C), [0.7, 0]), "?")];
              return {
                prompt: `In ${tri("ABC")}, ${V("D")} is on ${seg("AB")} and ${V("E")} is on ${seg("AC")}, with ${seg("DE")} ∥ ${seg("BC")}. ${seg("AD")} = ${n(a)}, ${seg("DB")} = ${n(b)} and ${seg("AE")} = ${n(c)}. Find ${seg("EC")}.`,
                graph: fig(items, [A, B, C]),
                steps: [
                  `Side-splitter theorem: a line parallel to one side cuts the other two sides proportionally, so ${M.frac(seg("AD"), seg("DB"))} = ${M.frac(seg("AE"), seg("EC"))}.`,
                  `${M.frac(n(a), n(b))} = ${M.frac(n(c), seg("EC"))}. Cross-multiply: ${n(a)} · ${seg("EC")} = ${n(c)} · ${n(b)} = ${n(num)}.`,
                  `${seg("EC")} = ${M.frac(n(num), n(a))} = ${n(ec)}.`,
                ],
                answer: { kind: "number", value: ec }, answerText: n(ec), answerInput: String(ec),
                vals: { num, ec }, params: { a, b, c, kind: "splitter" },
              };
            }
            const AB = r.int(3, 15), AC = r.int(3, 15), m = r.int(2, 12), num = m * AC;
            if (AB === AC || num % AB !== 0) continue;
            const dc = num / AB, BC = m + dc;
            if (AB + AC <= BC || AB + BC <= AC || AC + BC <= AB) continue;
            const [Ap, Bp, Cp] = triFromSides(BC, AC, AB);
            const D = add(Bp, sub(Cp, Bp), m / BC);
            const items = [...polyItems([Ap, Bp, Cp], { names: ["A", "B", "C"], sides: [String(AB), "", String(AC)] }), { t: "seg", a: Ap, b: D, role: "secondary" },
              txt(add(D, unit(sub(D, Ap)), 0.07 * size([Ap, Bp, Cp])), "D"),
              txt(add(mid(Bp, D), unit(sub(mid(Bp, D), centroid([Ap, Bp, Cp]))), 0.09 * size([Ap, Bp, Cp])), String(m)),
              txt(add(mid(D, Cp), unit(sub(mid(D, Cp), centroid([Ap, Bp, Cp]))), 0.09 * size([Ap, Bp, Cp])), "?")];
            return {
              prompt: `In ${tri("ABC")}, ${seg("AB")} = ${n(AB)} and ${seg("AC")} = ${n(AC)}. The bisector of ${ang("A")} meets ${seg("BC")} at ${V("D")}, and ${seg("BD")} = ${n(m)}. Find ${seg("DC")}.`,
              graph: fig(items, [Ap, Bp, Cp]),
              steps: [
                `Angle bisector theorem: the bisector divides the opposite side in the ratio of the adjacent sides, ${M.frac(seg("BD"), seg("DC"))} = ${M.frac(seg("AB"), seg("AC"))}.`,
                `${M.frac(n(m), seg("DC"))} = ${M.frac(n(AB), n(AC))}. Cross-multiply: ${n(AB)} · ${seg("DC")} = ${n(m)} · ${n(AC)} = ${n(num)}.`,
                `${seg("DC")} = ${M.frac(n(num), n(AB))} = ${n(dc)}.`,
              ],
              answer: { kind: "number", value: dc }, answerText: n(dc), answerInput: String(dc),
              vals: { num, dc }, params: { AB, AC, m, kind: "bisector" },
            };
          }
        }
        // level 3: the altitude to the hypotenuse, h² = pq
        for (;;) {
          const p = r.int(1, 16), q = r.int(1, 16);
          if (p === q) continue;
          const N = p * q, [k, s] = splitRoot(N);
          const A = [0, 0], B = [p + q, 0], D = [p, 0], C = [p, Math.sqrt(N)];
          const back = s === 1 && r.chance(0.5);
          const items = [...polyItems([A, B, C], { names: ["A", "B", "C"], right: [2] }), { t: "seg", a: C, b: D, role: "secondary" }, txt(add(D, [0, -0.07 * (p + q)]), "D"),
            ...rightMark(D, B, C, 0.04 * (p + q)), txt([p / 2, 0.05 * (p + q)], String(p)), txt([p + q / 2, 0.05 * (p + q)], back ? "?" : String(q)),
            txt([p + 0.06 * (p + q), Math.sqrt(N) / 2], back ? String(k) : "?")];
          if (back) {
            return {
              prompt: `In right ${tri("ABC")} the right angle is at ${V("C")}, and ${seg("CD")} is the altitude to the hypotenuse ${seg("AB")}. ${seg("CD")} = ${n(k)} and ${seg("AD")} = ${n(p)}. Find ${seg("DB")}.`,
              graph: fig(items, [A, B, C]),
              steps: [
                `The altitude to the hypotenuse makes two triangles similar to each other (${tri("ACD")} ∼ ${tri("CBD")}), so ${M.frac(seg("AD"), seg("CD"))} = ${M.frac(seg("CD"), seg("DB"))}: ${sq(seg("CD"))} = ${seg("AD")} · ${seg("DB")}.`,
                `${sq(n(k))} = ${n(p)} · ${seg("DB")}, so ${n(N)} = ${n(p)} · ${seg("DB")}.`,
                `${seg("DB")} = ${M.frac(n(N), n(p))} = ${n(q)}.`,
              ],
              answer: { kind: "number", value: q }, answerText: n(q), answerInput: String(q),
              vals: { N, q }, params: { k, p, kind: "back" },
            };
          }
          return {
            prompt: `In right ${tri("ABC")} the right angle is at ${V("C")}, and the altitude ${seg("CD")} cuts the hypotenuse into ${seg("AD")} = ${n(p)} and ${seg("DB")} = ${n(q)}. Find ${seg("CD")}${s === 1 ? "" : " in simplest radical form"}.`,
            graph: fig(items, [A, B, C]),
            steps: [
              `The altitude to the hypotenuse makes ${tri("ACD")} ∼ ${tri("CBD")}, so ${M.frac(seg("AD"), seg("CD"))} = ${M.frac(seg("CD"), seg("DB"))}: the altitude is the geometric mean of the two pieces, ${sq(seg("CD"))} = ${seg("AD")} · ${seg("DB")}.`,
              `${sq(seg("CD"))} = ${n(p)} · ${n(q)} = ${n(N)}.`,
              s === 1 ? `${seg("CD")} = ${M.sqrt(n(N))} = ${n(k)}.`
                : k > 1 ? `${seg("CD")} = ${M.sqrt(n(N))} = ${M.sqrt(`${n(k * k)} · ${n(s)}`)} = ${rootText(k, s)}.` : `${seg("CD")} = ${M.sqrt(n(N))}, which does not simplify.`,
            ],
            answer: { kind: "number", value: k * Math.sqrt(s) }, answerText: rootText(k, s), answerInput: rootIn(k, s),
            vals: { N, k, kk: k * k, s }, params: { p, q, kind: "fwd" },
          };
        }
      },
    },

    // ---- G.11 Triangle centers ------------------------------------------------------------------------
    "G.centers": {
      title: "Centroid, incircle, circumcircle and the Euler line",
      generate(r, level) {
        const Pt = (a, b) => `(${n(a)}, ${n(b)})`;
        if (level === 1) {
          for (;;) {
            const pts = [0, 1, 2].map(() => [r.int(-8, 8), r.int(-8, 8)]);
            const sx = pts[0][0] + pts[1][0] + pts[2][0], sy = pts[0][1] + pts[1][1] + pts[2][1];
            const area2 = (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[2][0] - pts[0][0]) * (pts[1][1] - pts[0][1]);
            if (sx % 3 || sy % 3 || Math.abs(area2) < 20) continue;
            const gx = sx / 3, gy = sy / 3;
            return {
              prompt: `Find the centroid of the triangle with vertices ${V("A")}${Pt(...pts[0])}, ${V("B")}${Pt(...pts[1])} and ${V("C")}${Pt(...pts[2])}.`,
              graph: plane([{ t: "poly", p: pts, role: "primary" }, ...pts.map((p, i) => ({ t: "pt", x: p[0], y: p[1], label: "ABC"[i] }))]),
              steps: [
                `The centroid (where the medians meet) averages the vertices: ${V("G")} = (${M.frac(`${M.sub(x, 1)} + ${M.sub(x, 2)} + ${M.sub(x, 3)}`, "3")}, ${M.frac(`${M.sub(y, 1)} + ${M.sub(y, 2)} + ${M.sub(y, 3)}`, "3")}).`,
                `${x}: ${M.frac(`${n(pts[0][0])} + ${np(pts[1][0])} + ${np(pts[2][0])}`, "3")} = ${M.frac(n(sx), "3")} = ${n(gx)}.`,
                `${y}: ${M.frac(`${n(pts[0][1])} + ${np(pts[1][1])} + ${np(pts[2][1])}`, "3")} = ${M.frac(n(sy), "3")} = ${n(gy)}.`,
                `${V("G")} = ${Pt(gx, gy)}.`,
              ],
              answer: { kind: "point", value: [gx, gy] }, answerText: Pt(gx, gy), answerInput: `(${gx}, ${gy})`,
              vals: { sx, sy, gx, gy }, params: { pts }, consts: [3],
            };
          }
        }
        if (level === 2) {
          const kind = r.pick(["inr", "circR", "euler"]);
          if (kind === "inr") {
            const [a, b, c] = triple(r, 41), area = (a * b) / 2, per = a + b + c, s = per / 2, rin = area / s;
            const Vs = [[0, 0], [a, 0], [0, b]];
            return {
              prompt: `A right triangle has sides ${n(a)}, ${n(b)} and ${n(c)}. Find the radius of its inscribed circle using ${V("r")} = ${M.frac("Area", V("s"))}, where ${V("s")} is the semi-perimeter.`,
              graph: fig([...polyItems(Vs, { sides: [String(a), String(c), String(b)], right: [0] }), { t: "circle", c: [rin, rin], r: rin, role: "secondary" }, { t: "pt", x: rin, y: rin }], Vs),
              steps: [
                `The legs are ${n(a)} and ${n(b)} (the hypotenuse is the longest side), so Area = ${M.frac("1", "2")} · ${n(a)} · ${n(b)} = ${n(area)}.`,
                `Semi-perimeter: ${V("s")} = ${M.frac(`${n(a)} + ${n(b)} + ${n(c)}`, "2")} = ${M.frac(n(per), "2")} = ${n(s)}.`,
                `${V("r")} = ${M.frac(n(area), n(s))} = ${n(rin)}.`,
              ],
              answer: { kind: "number", value: rin }, answerText: n(rin), answerInput: String(rin),
              vals: { area, per, s, rin }, params: { a, b, c, kind },
            };
          }
          if (kind === "circR") {
            const [a, b, c, K] = r.pick([[5, 5, 6, 12], [5, 5, 8, 12], [13, 14, 15, 84], [10, 13, 13, 60], [9, 10, 17, 36], [11, 13, 20, 66], [13, 20, 21, 126], [10, 17, 21, 84], [7, 15, 20, 42], [6, 25, 29, 60]]);
            const abc = a * b * c, K4 = 4 * K, R = new Frac(abc, K4);
            const Vs = triFromSides(a, b, c);
            const [Ax, Ay] = Vs[0], [Bx, By] = Vs[1], [Cx, Cy] = Vs[2];
            const D = 2 * (Ax * (By - Cy) + Bx * (Cy - Ay) + Cx * (Ay - By));
            const ox = ((Ax * Ax + Ay * Ay) * (By - Cy) + (Bx * Bx + By * By) * (Cy - Ay) + (Cx * Cx + Cy * Cy) * (Ay - By)) / D;
            const oy = ((Ax * Ax + Ay * Ay) * (Cx - Bx) + (Bx * Bx + By * By) * (Ax - Cx) + (Cx * Cx + Cy * Cy) * (Bx - Ax)) / D;
            return {
              prompt: `A triangle has sides ${n(a)}, ${n(b)} and ${n(c)}, and its area is ${n(K)}. Find the radius of its circumscribed circle, ${V("R")} = ${M.frac(`${V("a")}${V("b")}${V("c")}`, `4 · Area`)}.`,
              graph: fig([...polyItems(Vs, { sides: [String(c), String(a), String(b)] }), { t: "circle", c: [ox, oy], r: R.value, role: "secondary" }, { t: "pt", x: ox, y: oy }],
                [[ox - R.value, oy - R.value], [ox + R.value, oy + R.value]], 0.08),
              steps: [
                `Multiply the sides: ${n(a)} · ${n(b)} · ${n(c)} = ${n(abc)}.`,
                `4 · Area = 4 · ${n(K)} = ${n(K4)}.`,
                `${V("R")} = ${M.frac(n(abc), n(K4))} = ${M.f(R)}.`,
              ],
              answer: { kind: "number", value: R.value }, answerText: M.f(R), answerInput: typed(R),
              vals: { abc, K4, R: fracVal(R) }, params: { a, b, c, K, kind }, consts: [4],
            };
          }
          const G = [r.int(-4, 4), r.int(-4, 4)], O = [r.int(-4, 4), r.int(-4, 4)];
          if (G[0] === O[0] && G[1] === O[1]) return this.generate(r, level);
          const H = [3 * G[0] - 2 * O[0], 3 * G[1] - 2 * O[1]];
          if (Math.abs(H[0]) > 12 || Math.abs(H[1]) > 12) return this.generate(r, level);
          return {
            prompt: `A triangle's centroid is ${V("G")}${Pt(...G)} and its circumcenter is ${V("O")}${Pt(...O)}. The orthocenter ${V("H")} lies on the Euler line with ${V("G")} = ${M.frac("1", "3")}${V("H")} + ${M.frac("2", "3")}${V("O")}. Find ${V("H")}.`,
            graph: plane([{ t: "pt", x: G[0], y: G[1], label: "G" }, { t: "pt", x: O[0], y: O[1], label: "O" }], 13),
            steps: [
              `Solve for ${V("H")}: multiply by 3, 3${V("G")} = ${V("H")} + 2${V("O")}, so ${V("H")} = 3${V("G")} − 2${V("O")}.`,
              `${x}: 3 · ${np(G[0])} − 2 · ${np(O[0])} = ${n(3 * G[0])} − ${np(2 * O[0])} = ${n(H[0])}.`,
              `${y}: 3 · ${np(G[1])} − 2 · ${np(O[1])} = ${n(3 * G[1])} − ${np(2 * O[1])} = ${n(H[1])}.`,
              `${V("H")} = ${Pt(...H)}. (${V("G")} sits between them, with ${V("HG")} = 2 · ${V("GO")}.)`,
            ],
            answer: { kind: "point", value: H }, answerText: Pt(...H), answerInput: `(${H[0]}, ${H[1]})`,
            vals: { g3x: 3 * G[0], g3y: 3 * G[1], o2x: 2 * O[0], o2y: 2 * O[1], hx: H[0], hy: H[1] }, params: { G, O, kind }, consts: [3],
          };
        }
        // level 3: circumcenter from coordinates
        const VEC = [[5, 0], [0, 5], [-5, 0], [0, -5], [3, 4], [4, 3], [-3, 4], [-4, 3], [3, -4], [4, -3], [-3, -4], [-4, -3]];
        for (;;) {
          const h = r.int(-3, 3), k = r.int(-3, 3), vs = r.sample(VEC, 3), pts = vs.map((v) => [h + v[0], k + v[1]]);
          const area2 = (pts[1][0] - pts[0][0]) * (pts[2][1] - pts[0][1]) - (pts[2][0] - pts[0][0]) * (pts[1][1] - pts[0][1]);
          if (Math.abs(area2) < 16) continue;
          const [A, B, C] = pts, n2 = (p) => p[0] * p[0] + p[1] * p[1];
          const eq = (Q) => { let a = 2 * (Q[0] - A[0]), b = 2 * (Q[1] - A[1]), c = n2(Q) - n2(A); const g = P.gcd(P.gcd(a, b), c) || 1; return [a / g, b / g, c / g]; };
          const [a1, b1, c1] = eq(B), [a2, b2, c2] = eq(C), det = a1 * b2 - a2 * b1;
          const nx = c1 * b2 - c2 * b1, ny = a1 * c2 - a2 * c1;
          if (det === 0 || nx / det !== h || ny / det !== k) continue;
          const X = V("X"), Y = V("Y");
          const lineEq = (a, b, c) => `${a === 0 ? "" : kv(a, X)}${b === 0 ? "" : a === 0 ? kv(b, Y) : M.term(b, Y)} = ${n(c)}`;
          return {
            prompt: `Find the circumcenter of the triangle with vertices ${V("A")}${Pt(...A)}, ${V("B")}${Pt(...B)} and ${V("C")}${Pt(...C)}.`,
            graph: plane([{ t: "poly", p: pts, role: "primary" }, ...pts.map((p, i) => ({ t: "pt", x: p[0], y: p[1], label: "ABC"[i] }))]),
            steps: [
              `The circumcenter ${V("O")}(${X}, ${Y}) is equally far from all three vertices: ${sq(V("OA"))} = ${sq(V("OB"))} = ${sq(V("OC"))}.`,
              `${sq(V("OA"))} = ${sq(V("OB"))}: ${sq(`(${X} − ${np(A[0])})`)} + ${sq(`(${Y} − ${np(A[1])})`)} = ${sq(`(${X} − ${np(B[0])})`)} + ${sq(`(${Y} − ${np(B[1])})`)}. Expand; ${sq(X)} and ${sq(Y)} cancel, leaving ${lineEq(a1, b1, c1)} (after dividing out any common factor).`,
              `${sq(V("OA"))} = ${sq(V("OC"))} the same way: ${lineEq(a2, b2, c2)}.`,
              `Solve the pair (elimination or Cramer's rule): the determinant is ${n(a1)} · ${np(b2)} − ${np(a2)} · ${np(b1)} = ${n(det)}; ${X} = ${M.frac(`${n(c1)} · ${np(b2)} − ${np(c2)} · ${np(b1)}`, n(det))} = ${M.frac(n(nx), n(det))} = ${n(h)} and ${Y} = ${M.frac(`${n(a1)} · ${np(c2)} − ${np(a2)} · ${np(c1)}`, n(det))} = ${M.frac(n(ny), n(det))} = ${n(k)}.`,
              `${V("O")} = ${Pt(h, k)}. Check: ${sq(V("OA"))} = ${sq(np(A[0] - h))} + ${sq(np(A[1] - k))} = 25, the same for ${V("B")} and ${V("C")}: the circumradius is 5.`,
            ],
            answer: { kind: "point", value: [h, k] }, answerText: Pt(h, k), answerInput: `(${h}, ${k})`,
            vals: { a1, b1, c1, a2, b2, c2, det, nx, ny, h, k, dax: A[0] - h, day: A[1] - k }, params: { pts }, consts: [25, 5],
          };
        }
      },
    },

    // ---- G.12 Distance & midpoint -------------------------------------------------------------------------
    "G.6": {
      title: "Distance, midpoint and section formulas",
      generate(r, level) {
        const Pt = (a, b) => `(${n(a)}, ${n(b)})`;
        if (level === 1) {
          for (;;) {
            const x1 = r.int(-8, 8), y1 = r.int(-8, 8), x2 = r.int(-8, 8), y2 = r.int(-8, 8);
            if ((x1 + x2) % 2 || (y1 + y2) % 2 || (x1 === x2 && y1 === y2)) continue;
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            return {
              prompt: `Find the midpoint of the segment from ${V("A")}${Pt(x1, y1)} to ${V("B")}${Pt(x2, y2)}.`,
              graph: plane([{ t: "seg", a: [x1, y1], b: [x2, y2], role: "primary" }, { t: "pt", x: x1, y: y1, label: "A" }, { t: "pt", x: x2, y: y2, label: "B" }]),
              steps: [
                `The midpoint averages the coordinates: ${V("M")} = (${M.frac(`${M.sub(x, 1)} + ${M.sub(x, 2)}`, "2")}, ${M.frac(`${M.sub(y, 1)} + ${M.sub(y, 2)}`, "2")}).`,
                `${M.frac(`${n(x1)} + ${np(x2)}`, "2")} = ${M.frac(n(x1 + x2), "2")} = ${n(mx)} and ${M.frac(`${n(y1)} + ${np(y2)}`, "2")} = ${M.frac(n(y1 + y2), "2")} = ${n(my)}.`,
                `${V("M")} = ${Pt(mx, my)}.`,
              ],
              answer: { kind: "point", value: [mx, my] }, answerText: Pt(mx, my), answerInput: `(${mx}, ${my})`,
              vals: { sx: x1 + x2, sy: y1 + y2, mx, my }, params: { x1, y1, x2, y2 },
            };
          }
        }
        if (level === 2) {
          for (;;) {
            let dx, dy;
            if (r.chance(0.5)) { const t = triple(r, 15); dx = t[0] * r.sign(); dy = t[1] * r.sign(); }
            else { dx = r.nonzero(-7, 7); dy = r.nonzero(-7, 7); }
            const x1 = r.int(-8, 8), y1 = r.int(-8, 8), x2 = x1 + dx, y2 = y1 + dy;
            if (Math.abs(x2) > 9 || Math.abs(y2) > 9) continue;
            const N = dx * dx + dy * dy, [k, s] = splitRoot(N);
            return {
              prompt: `Find the distance between ${V("A")}${Pt(x1, y1)} and ${V("B")}${Pt(x2, y2)}${s === 1 ? "" : ". Give an exact answer in simplest radical form"}.`,
              graph: plane([{ t: "seg", a: [x1, y1], b: [x2, y2], role: "primary" }, { t: "seg", a: [x1, y1], b: [x2, y1], role: "muted", dash: true }, { t: "seg", a: [x2, y1], b: [x2, y2], role: "muted", dash: true },
                { t: "pt", x: x1, y: y1, label: "A" }, { t: "pt", x: x2, y: y2, label: "B" }]),
              steps: [
                `The distance is the hypotenuse of a right triangle with legs Δ${x} and Δ${y}: ${V("d")} = ${M.sqrt(`${sq(`(${M.sub(x, 2)} − ${M.sub(x, 1)})`)} + ${sq(`(${M.sub(y, 2)} − ${M.sub(y, 1)})`)}`)}.`,
                `Δ${x} = ${n(x2)} − ${np(x1)} = ${n(dx)}; Δ${y} = ${n(y2)} − ${np(y1)} = ${n(dy)}.`,
                `${V("d")} = ${M.sqrt(`${sq(np(dx))} + ${sq(np(dy))}`)} = ${M.sqrt(`${n(dx * dx)} + ${n(dy * dy)}`)} = ${M.sqrt(n(N))}${s === 1 ? ` = ${n(k)}` : k > 1 ? ` = ${M.sqrt(`${n(k * k)} · ${n(s)}`)} = ${rootText(k, s)}` : ", which does not simplify"}.`,
              ],
              answer: { kind: "number", value: k * Math.sqrt(s) }, answerText: rootText(k, s), answerInput: rootIn(k, s),
              vals: { dx, dy, dxx: dx * dx, dyy: dy * dy, N, k, kk: k * k, s }, params: { x1, y1, x2, y2 },
            };
          }
        }
        const kind = r.pick(["endpoint", "section", "space", "taxi"]);
        if (kind === "endpoint") {
          for (;;) {
            const ax = r.int(-8, 8), ay = r.int(-8, 8), mx = r.int(-6, 6), my = r.int(-6, 6), bx = 2 * mx - ax, by = 2 * my - ay;
            if (Math.abs(bx) > 9 || Math.abs(by) > 9 || (ax === mx && ay === my)) continue;
            return {
              prompt: `${V("M")}${Pt(mx, my)} is the midpoint of ${seg("AB")}, and ${V("A")} = ${Pt(ax, ay)}. Find ${V("B")}.`,
              graph: plane([{ t: "pt", x: ax, y: ay, label: "A" }, { t: "pt", x: mx, y: my, label: "M" }]),
              steps: [
                `The midpoint averages the endpoints: ${M.frac(`${n(ax)} + ${M.sub(x, "B")}`, "2")} = ${n(mx)} and ${M.frac(`${n(ay)} + ${M.sub(y, "B")}`, "2")} = ${n(my)}.`,
                `Multiply by 2 and subtract: ${M.sub(x, "B")} = 2 · ${np(mx)} − ${np(ax)} = ${n(2 * mx)} − ${np(ax)} = ${n(bx)}; ${M.sub(y, "B")} = 2 · ${np(my)} − ${np(ay)} = ${n(2 * my)} − ${np(ay)} = ${n(by)}.`,
                `${V("B")} = ${Pt(bx, by)}. (From ${V("A")} to ${V("M")} is the same step as from ${V("M")} to ${V("B")}.)`,
              ],
              answer: { kind: "point", value: [bx, by] }, answerText: Pt(bx, by), answerInput: `(${bx}, ${by})`,
              vals: { mx2: 2 * mx, my2: 2 * my, bx, by }, params: { ax, ay, mx, my, kind },
            };
          }
        }
        if (kind === "section") {
          for (;;) {
            const m = r.int(1, 4), nn = r.int(1, 4);
            if (m === nn || P.gcd(m, nn) !== 1) continue;
            const t = [r.nonzero(-3, 3), r.nonzero(-3, 3)], ax = r.int(-8, 8), ay = r.int(-8, 8);
            const bx = ax + (m + nn) * t[0], by = ay + (m + nn) * t[1];
            if (Math.abs(bx) > 9 || Math.abs(by) > 9) continue;
            const px = (nn * ax + m * bx) / (m + nn), py = (nn * ay + m * by) / (m + nn);
            return {
              prompt: `Find the point ${V("P")} on ${seg("AB")} that divides it in the ratio ${V("AP")} : ${V("PB")} = ${n(m)} : ${n(nn)}, where ${V("A")} = ${Pt(ax, ay)} and ${V("B")} = ${Pt(bx, by)}.`,
              graph: plane([{ t: "seg", a: [ax, ay], b: [bx, by], role: "primary" }, { t: "pt", x: ax, y: ay, label: "A" }, { t: "pt", x: bx, y: by, label: "B" }]),
              steps: [
                `Section formula for the ratio ${V("m")} : ${V("n")} = ${n(m)} : ${n(nn)} from ${V("A")}: ${V("P")} = (${M.frac(`${V("n")}${M.sub(x, 1)} + ${V("m")}${M.sub(x, 2)}`, `${V("m")} + ${V("n")}`)}, ${M.frac(`${V("n")}${M.sub(y, 1)} + ${V("m")}${M.sub(y, 2)}`, `${V("m")} + ${V("n")}`)}).`,
                `${x}: ${M.frac(`${n(nn)} · ${np(ax)} + ${n(m)} · ${np(bx)}`, n(m + nn))} = ${M.frac(n(nn * ax + m * bx), n(m + nn))} = ${n(px)}.`,
                `${y}: ${M.frac(`${n(nn)} · ${np(ay)} + ${n(m)} · ${np(by)}`, n(m + nn))} = ${M.frac(n(nn * ay + m * by), n(m + nn))} = ${n(py)}.`,
                `${V("P")} = ${Pt(px, py)}, ${M.frac(n(m), n(m + nn))} of the way from ${V("A")} to ${V("B")}.`,
              ],
              answer: { kind: "point", value: [px, py] }, answerText: Pt(px, py), answerInput: `(${px}, ${py})`,
              vals: { mn: m + nn, tx: nn * ax + m * bx, ty: nn * ay + m * by, px, py }, params: { ax, ay, bx, by, m, n: nn, kind },
            };
          }
        }
        if (kind === "space") {
          const [d1, d2, d3, D] = r.pick([[1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [2, 6, 9, 11], [6, 6, 7, 11], [3, 4, 12, 13], [2, 10, 11, 15], [2, 5, 14, 15]]);
          const ds = r.shuffle([d1, d2, d3]).map((d) => d * r.sign());
          const p = [r.int(-5, 5), r.int(-5, 5), r.int(-5, 5)], q = p.map((c, i) => c + ds[i]);
          const P3 = (v) => `(${v.map(n).join(", ")})`;
          const S = ds.reduce((s, d) => s + d * d, 0);
          return {
            prompt: `Find the distance between the points ${P3(p)} and ${P3(q)} in space.`,
            steps: [
              `In three dimensions add one squared difference per coordinate: ${V("d")} = ${M.sqrt(`Δ${sq(x)} + Δ${sq(y)} + Δ${sq(V("z"))}`)}.`,
              `Differences: ${n(q[0])} − ${np(p[0])} = ${n(ds[0])}, ${n(q[1])} − ${np(p[1])} = ${n(ds[1])}, ${n(q[2])} − ${np(p[2])} = ${n(ds[2])}.`,
              `${V("d")} = ${M.sqrt(`${n(ds[0] * ds[0])} + ${n(ds[1] * ds[1])} + ${n(ds[2] * ds[2])}`)} = ${M.sqrt(n(S))} = ${n(D)}.`,
            ],
            answer: { kind: "number", value: D }, answerText: n(D), answerInput: String(D),
            vals: { d0: ds[0], d1: ds[1], d2: ds[2], s0: ds[0] * ds[0], s1: ds[1] * ds[1], s2: ds[2] * ds[2], S, D }, params: { p, q, kind },
          };
        }
        const [a, b, c] = triple(r, 30), d1 = a + b, diff = d1 - c;
        return {
          prompt: `A delivery robot drives along a street grid from the depot at (0, 0) to a house at ${Pt(a, b)}, in blocks. A drone flies straight there. How many blocks farther does the robot travel?`,
          graph: graph({ view: [-2, Math.max(a, b) + 2, -2, Math.max(a, b) + 2], items: [{ t: "seg", a: [0, 0], b: [a, 0], role: "primary" }, { t: "seg", a: [a, 0], b: [a, b], role: "primary" },
            { t: "seg", a: [0, 0], b: [a, b], role: "secondary", dash: true }, { t: "pt", x: 0, y: 0, label: "depot" }, { t: "pt", x: a, y: b, label: "house" }], equal: true }),
          steps: [
            `The robot covers the Manhattan (grid) distance: |Δ${x}| + |Δ${y}| = ${n(a)} + ${n(b)} = ${n(d1)} blocks.`,
            `The drone covers the straight-line distance: ${M.sqrt(`${sq(n(a))} + ${sq(n(b))}`)} = ${M.sqrt(n(c * c))} = ${n(c)} blocks.`,
            `Difference: ${n(d1)} − ${n(c)} = ${n(diff)} blocks.`,
          ],
          answer: { kind: "number", value: diff }, answerText: `${n(diff)} blocks`, answerInput: String(diff),
          vals: { d1, cc: c * c, c, diff }, params: { a, b, kind },
        };
      },
    },

    // ---- G.13 Polygon angle sums & diagonals --------------------------------------------------------------
    "G.7": {
      title: "Polygon angle sums and diagonals",
      generate(r, level) {
        const NAME = { 3: "triangle", 4: "quadrilateral", 5: "pentagon", 6: "hexagon", 7: "heptagon", 8: "octagon", 9: "nonagon", 10: "decagon", 12: "dodecagon" };
        const nm = (k) => NAME[k] || `${k}-gon`;
        const an = (k) => (/^[aeiou]/.test(nm(k)) || [8, 11, 18].includes(k) ? "an" : "a");
        const ngon = (k) => { const pts = []; for (let i = 0; i < k; i++) pts.push(dir(90 + (360 * i) / k)); return fig([{ t: "poly", p: pts, role: "primary" }], pts, 0.1); };
        if (level === 1) {
          if (r.chance(0.5)) {
            const k = r.int(5, 20), t = k - 2, S = t * 180;
            return {
              prompt: `Find the sum of the interior angles of ${an(k)} ${nm(k)}${NAME[k] ? ` (${k} sides)` : ""}.`,
              graph: k <= 12 ? ngon(k) : undefined,
              steps: [`Diagonals from one vertex split an ${V("n")}-gon into ${V("n")} − 2 triangles, each with 180°.`, `(${n(k)} − 2) · 180° = ${n(t)} · 180° = ${dg(S)}.`],
              answer: { kind: "number", value: S }, answerText: dg(S), answerInput: String(S),
              vals: { t, S }, params: { n: k, each: 0 }, consts: [180],
            };
          }
          const k = r.pick([5, 6, 8, 9, 10, 12, 15, 18, 20]), t = k - 2, S = t * 180, each = S / k;
          return {
            prompt: `Find the measure of each interior angle of a regular ${nm(k)}${NAME[k] ? ` (${k} sides)` : ""}.`,
            graph: k <= 12 ? ngon(k) : undefined,
            steps: [`Sum of the interior angles: (${n(k)} − 2) · 180° = ${n(t)} · 180° = ${dg(S)}.`, `A regular polygon shares it equally among its ${n(k)} angles: ${dg(S)} ÷ ${n(k)} = ${dg(each)}.`],
            answer: { kind: "number", value: each }, answerText: dg(each), answerInput: String(each),
            vals: { t, S, each }, params: { n: k, each: 1 }, consts: [180],
          };
        }
        if (level === 2) {
          const kind = r.pick(["ext", "int", "diag"]);
          if (kind === "diag") {
            const k = r.int(5, 20), d = (k * (k - 3)) / 2;
            return {
              prompt: `How many diagonals does ${an(k)} ${nm(k)}${NAME[k] ? ` (${k} sides)` : ""} have?`,
              graph: k <= 10 ? (() => { const pts = []; for (let i = 0; i < k; i++) pts.push(dir(90 + (360 * i) / k)); const items = [{ t: "poly", p: pts, role: "primary" }]; for (let i = 2; i < k - 1; i++) items.push({ t: "seg", a: pts[0], b: pts[i], role: "muted", dash: true }); return fig(items, pts, 0.1); })() : undefined,
              steps: [
                `Each vertex joins ${V("n")} − 3 others by a diagonal (not itself or its two neighbors): ${n(k)} − 3 = ${n(k - 3)}. The dashed lines show one vertex's diagonals.`,
                `${V("n")}(${V("n")} − 3) counts every diagonal twice (once from each end): ${M.frac(`${n(k)} · ${n(k - 3)}`, "2")} = ${M.frac(n(k * (k - 3)), "2")} = ${n(d)}.`,
              ],
              answer: { kind: "number", value: d }, answerText: `${n(d)} diagonals`, answerInput: String(d),
              vals: { k3: k - 3, prod: k * (k - 3), d }, params: { n: k, kind }, consts: [3],
            };
          }
          const e = r.pick([10, 12, 15, 18, 20, 24, 30, 36, 40, 45, 60, 72]), k = 360 / e, i = 180 - e;
          if (kind === "ext") {
            return {
              prompt: `Each exterior angle of a regular polygon measures ${dg(e)}. How many sides does it have?`,
              steps: [`The exterior angles of any convex polygon add to 360°, and a regular polygon's are all equal: ${V("n")} · ${dg(e)} = 360°.`, `${V("n")} = 360° ÷ ${dg(e)} = ${n(k)} sides.`],
              answer: { kind: "number", value: k }, answerText: `${n(k)} sides`, answerInput: String(k),
              vals: { k }, params: { e, kind }, consts: [360],
            };
          }
          return {
            prompt: `Each interior angle of a regular polygon measures ${dg(i)}. How many sides does it have?`,
            steps: [`Each exterior angle is the supplement of the interior angle: 180° − ${dg(i)} = ${dg(e)}.`, `The exterior angles add to 360°: ${V("n")} = 360° ÷ ${dg(e)} = ${n(k)} sides.`],
            answer: { kind: "number", value: k }, answerText: `${n(k)} sides`, answerInput: String(k),
            vals: { e, k }, params: { i, kind }, consts: [360, 180],
          };
        }
        if (r.chance(0.5)) {
          const k = r.int(5, 20), D = (k * (k - 3)) / 2, disc = 9 + 8 * D, sd = 2 * k - 3;
          return {
            prompt: `A convex polygon has ${n(D)} diagonals. How many sides does it have?`,
            steps: [
              `Set the diagonal count equal: ${M.frac(`${V("n")}(${V("n")} − 3)`, "2")} = ${n(D)}, so ${sq(V("n"))} − 3${V("n")} = ${n(2 * D)}, that is ${sq(V("n"))} − 3${V("n")} − ${n(2 * D)} = 0.`,
              `Quadratic formula: ${V("n")} = ${M.frac(`3 ± ${M.sqrt(`9 + 4 · ${n(2 * D)}`)}`, "2")} = ${M.frac(`3 ± ${M.sqrt(n(disc))}`, "2")} = ${M.frac(`3 ± ${n(sd)}`, "2")}.`,
              `A side count is positive: ${V("n")} = ${M.frac(n(3 + sd), "2")} = ${n(k)}. Check: ${M.frac(`${n(k)} · ${n(k - 3)}`, "2")} = ${n(D)}.`,
            ],
            answer: { kind: "number", value: k }, answerText: `${n(k)} sides`, answerInput: String(k),
            vals: { D2: 2 * D, disc, sd, top: 3 + sd, k, k3: k - 3 }, params: { D, kind: "diag" }, consts: [3, 9, 4],
          };
        }
        for (;;) {
          const k = r.int(5, 8), S = (k - 2) * 180, xe = r.int(95, 170), known = S - 2 * xe;
          const angs = [];
          for (let i = 0; i < k - 3; i++) angs.push(r.int(80, 175));
          const last = known - angs.reduce((s, a) => s + a, 0);
          if (last < 70 || last > 178) continue;
          angs.push(last);
          const shown = r.shuffle(angs), ksum = known, rest = S - ksum;
          return {
            prompt: `A convex ${nm(k)} has angles ${shown.map(dg).join(", ")} and two more angles that are equal to each other. Find the measure of each of the two equal angles.`,
            steps: [
              `Interior angle sum: (${n(k)} − 2) · 180° = ${dg(S)}.`,
              `The known angles add to ${shown.map(n).join(" + ")} = ${dg(ksum)}.`,
              `The two equal angles share the rest: ${dg(S)} − ${dg(ksum)} = ${dg(rest)}, so each is ${dg(rest)} ÷ 2 = ${dg(xe)}.`,
            ],
            answer: { kind: "number", value: xe }, answerText: dg(xe), answerInput: String(xe),
            vals: { S, ksum, rest, xe, k2: k - 2 }, params: { n: k, angs: shown, kind: "poly" }, consts: [180],
          };
        }
      },
    },

    // ---- G.14 Quadrilateral properties ----------------------------------------------------------------------
    "G.quadrilaterals": {
      title: "Parallelograms, rhombuses, kites and trapezoids",
      generate(r, level) {
        const para = (a, labs) => { const A = [0, 0], B = [6, 0], D = add(A, dir(a), 3.6), C = add(B, dir(a), 3.6), Vs = [A, B, C, D]; return fig(polyItems(Vs, { names: ["A", "B", "C", "D"], angles: labs }), Vs); };
        if (level === 1) {
          let a;
          do a = r.int(40, 140); while (a > 80 && a < 100);
          const ask = r.pick(["B", "C", "D"]), opp = ask === "C", ans = opp ? a : 180 - a;
          const labs = ["", "", "", ""]; labs[0] = `${a}°`; labs["ABCD".indexOf(ask)] = "?";
          return {
            prompt: `${V("ABCD")} is a parallelogram with ${mang("A")} = ${dg(a)}. Find ${mang(ask)}.`,
            graph: para(a, labs),
            steps: opp
              ? [`${ang("A")} and ${ang("C")} are opposite angles of the parallelogram.`, `Opposite angles of a parallelogram are equal: ${mang("C")} = ${dg(a)}.`]
              : [`${ang("A")} and ${ang(ask)} are consecutive angles (they share side ${seg(ask === "B" ? "AB" : "AD")}).`, `Consecutive angles of a parallelogram are supplementary: 180° − ${dg(a)} = ${dg(ans)}.`],
            answer: { kind: "number", value: ans }, answerText: dg(ans), answerInput: String(ans),
            vals: { ans }, params: { a, ask }, consts: [180],
          };
        }
        if (level === 2) {
          const kind = r.pick(["bisect", "rect", "mid"]);
          if (kind === "mid") {
            const b1 = r.int(4, 20), b2 = r.int(4, 20);
            if ((b1 + b2) % 2 || b1 === b2) return this.generate(r, level);
            const m = (b1 + b2) / 2, back = r.chance(0.5);
            const H = 5, off = (b1 - b2) / 2 + r.int(-1, 1);
            const Vs = [[0, 0], [b1, 0], [off + b2, H], [off, H]];
            const items = [...polyItems(Vs, { sides: [String(b1), "", back ? "?" : String(b2), ""] }), { t: "seg", a: mid(Vs[0], Vs[3]), b: mid(Vs[1], Vs[2]), role: "secondary", dash: true },
              txt(add(mid(mid(Vs[0], Vs[3]), mid(Vs[1], Vs[2])), [0, 0.6]), back ? String(m) : "?")];
            return {
              prompt: back ? `A trapezoid's midsegment is ${n(m)} and one base is ${n(b1)}. Find the other base.` : `A trapezoid has bases ${n(b1)} and ${n(b2)}. Find the length of its midsegment.`,
              graph: fig(items, Vs),
              steps: back
                ? [`The midsegment is the average of the bases: ${n(m)} = ${M.frac(`${n(b1)} + ${M.sub(V("b"), 2)}`, "2")}.`, `Multiply by 2: ${n(b1)} + ${M.sub(V("b"), 2)} = ${n(2 * m)}, so ${M.sub(V("b"), 2)} = ${n(2 * m)} − ${n(b1)} = ${n(b2)}.`]
                : [`The midsegment joins the midpoints of the legs; it is parallel to the bases and equals their average.`, `${M.frac(`${n(b1)} + ${n(b2)}`, "2")} = ${M.frac(n(b1 + b2), "2")} = ${n(m)}.`],
              answer: { kind: "number", value: back ? b2 : m }, answerText: n(back ? b2 : m), answerInput: String(back ? b2 : m),
              vals: back ? { m2: 2 * m, b2 } : { sum: b1 + b2, m }, params: back ? { m, b1, kind, back: 1 } : { b1, b2, kind, back: 0 },
            };
          }
          for (;;) {
            const X = r.int(2, 9), p = r.int(2, 6), rr = r.intExcept(1, 6, p), q = r.int(-8, 12), L = p * X + q, s = L - rr * X;
            if (L <= 2 || Math.abs(s) > 30) continue;
            const c = collect(p, q, rr, s);
            if (kind === "bisect") {
              const AC = 2 * L, Vs = [[0, 0], [8, 0], [11, 4], [3, 4]], E = mid(Vs[0], Vs[2]);
              const items = [...polyItems(Vs, { names: ["A", "B", "C", "D"] }), { t: "seg", a: Vs[0], b: Vs[2], role: "secondary" }, { t: "seg", a: Vs[1], b: Vs[3], role: "secondary" },
                txt(add(E, [0, -0.6]), "E"), txt(add(mid(Vs[0], E), [0, 0.55]), linPlain(p, q)), txt(add(mid(E, Vs[2]), [0, 0.55]), linPlain(rr, s))];
              return {
                prompt: `The diagonals of parallelogram ${V("ABCD")} meet at ${V("E")}. ${seg("AE")} = ${lin(p, q)} and ${seg("EC")} = ${lin(rr, s)}. Find ${seg("AC")}.`,
                graph: fig(items, Vs),
                steps: [
                  `The diagonals of a parallelogram bisect each other, so ${seg("AE")} = ${seg("EC")}: ${lin(p, q)} = ${lin(rr, s)}.`,
                  `Collect ${x} on one side: ${c.line}${soX(c.rhs, c.k, X)}.`,
                  `${seg("AE")} = ${ev(p, X, q)} = ${n(L)}, and ${seg("AC")} = 2 · ${n(L)} = ${n(AC)}.`,
                ],
                answer: { kind: "number", value: AC }, answerText: n(AC), answerInput: String(AC),
                vals: { ck: c.k, crhs: c.rhs, X, L, AC }, params: { p, q, r: rr, s, kind },
              };
            }
            const Vs = [[0, 0], [9, 0], [9, 5], [0, 5]];
            const items = [...polyItems(Vs, { names: ["A", "B", "C", "D"], right: [0, 1, 2, 3] }), { t: "seg", a: Vs[0], b: Vs[2], role: "secondary" }, { t: "seg", a: Vs[1], b: Vs[3], role: "secondary" }];
            return {
              prompt: `In rectangle ${V("ABCD")}, diagonal ${seg("AC")} = ${lin(p, q)} and diagonal ${seg("BD")} = ${lin(rr, s)}. Find ${seg("BD")}.`,
              graph: fig(items, Vs),
              steps: [
                `The diagonals of a rectangle are equal: ${lin(p, q)} = ${lin(rr, s)}.`,
                `Collect ${x} on one side: ${c.line}${soX(c.rhs, c.k, X)}.`,
                `${seg("BD")} = ${ev(rr, X, s)} = ${n(L)}. (Check: ${seg("AC")} = ${ev(p, X, q)} = ${n(L)}.)`,
              ],
              answer: { kind: "number", value: L }, answerText: n(L), answerInput: String(L),
              vals: { ck: c.k, crhs: c.rhs, X, L }, params: { p, q, r: rr, s, kind },
            };
          }
        }
        const kind = r.pick(["rhombus", "kite", "trapalg"]);
        if (kind === "rhombus") {
          const [a, b, c] = triple(r, 30), d1 = 2 * a, d2 = 2 * b, per = 4 * c;
          const Vs = [[-a, 0], [0, -b], [a, 0], [0, b]];
          const items = [...polyItems(Vs, {}), { t: "seg", a: Vs[0], b: Vs[2], role: "secondary", dash: true }, { t: "seg", a: Vs[1], b: Vs[3], role: "secondary", dash: true }, ...rightMark([0, 0], [a, 0], [0, b], 0.05 * Math.max(d1, d2))];
          return {
            prompt: `A rhombus has diagonals of ${n(d1)} cm and ${n(d2)} cm. Find its perimeter, in cm.`,
            graph: fig(items, Vs),
            steps: [
              `The diagonals of a rhombus bisect each other at right angles, so they cut it into four right triangles with legs ${n(d1)} ÷ 2 = ${n(a)} and ${n(d2)} ÷ 2 = ${n(b)}.`,
              `Each side is a hypotenuse: ${M.sqrt(`${sq(n(a))} + ${sq(n(b))}`)} = ${M.sqrt(`${n(a * a)} + ${n(b * b)}`)} = ${M.sqrt(n(c * c))} = ${n(c)} cm.`,
              `All four sides are equal: 4 · ${n(c)} = ${n(per)} cm.`,
            ],
            answer: { kind: "number", value: per }, answerText: `${n(per)} cm`, answerInput: String(per),
            vals: { a, b, aa: a * a, bb: b * b, cc: c * c, c, per }, params: { d1, d2, kind }, consts: [4],
          };
        }
        if (kind === "kite") {
          const LEG = { 12: [[5, 13], [9, 15], [16, 20], [35, 37]], 8: [[6, 10], [15, 17]], 24: [[7, 25], [10, 26], [18, 30], [32, 40]], 15: [[8, 17], [20, 25], [36, 39]] };
          const b = r.pick([12, 8, 24, 15]), [[a1, h1], [a2, h2]] = r.sample(LEG[b], 2), per = 2 * h1 + 2 * h2;
          const Vs = [[0, a1], [-b, 0], [0, -a2], [b, 0]];
          const items = [...polyItems(Vs, { names: ["A", "B", "C", "D"] }), { t: "seg", a: Vs[0], b: Vs[2], role: "secondary", dash: true }, { t: "seg", a: Vs[1], b: Vs[3], role: "secondary", dash: true },
            txt([0.07 * size(Vs), -0.06 * size(Vs)], "E"), ...rightMark([0, 0], [b, 0], [0, a1], 0.04 * size(Vs))];
          return {
            prompt: `Kite ${V("ABCD")} has ${seg("AB")} = ${seg("AD")} and ${seg("CB")} = ${seg("CD")}. Its diagonals meet at ${V("E")}, with ${seg("BE")} = ${seg("ED")} = ${n(b)}, ${seg("AE")} = ${n(a1)} and ${seg("EC")} = ${n(a2)}. Find the perimeter of the kite.`,
            graph: fig(items, Vs),
            steps: [
              `The diagonals of a kite are perpendicular, so ${tri("ABE")} and ${tri("CBE")} are right triangles with the right angle at ${V("E")}.`,
              `${seg("AB")} = ${M.sqrt(`${sq(n(a1))} + ${sq(n(b))}`)} = ${M.sqrt(`${n(a1 * a1)} + ${n(b * b)}`)} = ${n(h1)}, and ${seg("CB")} = ${M.sqrt(`${sq(n(a2))} + ${sq(n(b))}`)} = ${M.sqrt(`${n(a2 * a2)} + ${n(b * b)}`)} = ${n(h2)}.`,
              `Perimeter: 2 · ${n(h1)} + 2 · ${n(h2)} = ${n(per)}.`,
            ],
            answer: { kind: "number", value: per }, answerText: n(per), answerInput: String(per),
            vals: { a1a1: a1 * a1, bb: b * b, a2a2: a2 * a2, h1, h2, per }, params: { a1, a2, b, kind },
          };
        }
        for (;;) {
          const X = r.int(2, 9), p = r.int(1, 5), rr = r.int(1, 5), q = r.int(-5, 15), s = r.int(-5, 15);
          const b1 = p * X + q, b2 = rr * X + s, sum = b1 + b2;
          if (b1 < 3 || b2 < 3 || b1 === b2 || sum % 2) continue;
          const m = sum / 2, t = r.int(1, 6), u = m - t * X;
          if (2 * t === p + rr || Math.abs(u) > 30) continue;
          const c = collect(2 * t, 2 * u, p + rr, q + s);
          const H = 5, off = (b1 - b2) / 2;
          const Vs = [[0, 0], [b1, 0], [off + b2, H], [off, H]];
          const items = [...polyItems(Vs, { sides: [linPlain(p, q), "", linPlain(rr, s), ""] }), { t: "seg", a: mid(Vs[0], Vs[3]), b: mid(Vs[1], Vs[2]), role: "secondary", dash: true },
            txt(add(mid(mid(Vs[0], Vs[3]), mid(Vs[1], Vs[2])), [0, 0.6]), linPlain(t, u))];
          return {
            prompt: `A trapezoid has bases ${lin(p, q)} and ${lin(rr, s)}, and its midsegment is ${lin(t, u)}. Find the length of the midsegment.`,
            graph: fig(items, Vs),
            steps: [
              `The midsegment is the average of the bases: ${lin(t, u)} = ${M.frac(`(${lin(p, q)}) + (${lin(rr, s)})`, "2")}.`,
              `Multiply by 2 and combine: ${lin(2 * t, 2 * u)} = ${lin(p + rr, q + s)}.`,
              `Collect ${x} on one side: ${c.line}${soX(c.rhs, c.k, X)}.`,
              `Midsegment: ${ev(t, X, u)} = ${n(m)}. (Check: the bases are ${n(b1)} and ${n(b2)}, and ${M.frac(`${n(b1)} + ${n(b2)}`, "2")} = ${n(m)}.)`,
            ],
            answer: { kind: "number", value: m }, answerText: n(m), answerInput: String(m),
            vals: { t2: 2 * t, u2: 2 * u, pr: p + rr, qs: q + s, ck: c.k, crhs: c.rhs, X, b1, b2, m }, params: { p, q, r: rr, s, t, u, kind },
          };
        }
      },
    },

    // ---- G.15 Area of plane figures ------------------------------------------------------------------------
    "G.8": {
      title: "Area of rectangles, triangles, trapezoids and composite figures",
      generate(r, level) {
        const hdash = (a, b) => ({ t: "seg", a, b, role: "muted", dash: true });
        if (level === 1) {
          const kind = r.pick(["rect", "para", "tri"]), b = r.int(3, 15), h = r.int(2, 12);
          if (kind === "rect") {
            const A = b * h, Vs = [[0, 0], [b, 0], [b, h], [0, h]];
            return {
              prompt: `A rectangle is ${n(b)} cm long and ${n(h)} cm wide. Find its area in cm².`,
              graph: fig(polyItems(Vs, { sides: [`${b} cm`, `${h} cm`], right: [0, 1, 2, 3] }), Vs),
              steps: [`Rectangle: ${V("A")} = ${V("l")}${V("w")}.`, `${n(b)} · ${n(h)} = ${n(A)} cm².`],
              answer: { kind: "number", value: A }, answerText: `${n(A)} cm²`, answerInput: String(A),
              vals: { A }, params: { b, h, kind },
            };
          }
          const sl = r.int(1, 4) * r.sign();
          if (kind === "para") {
            const A = b * h, Vs = [[0, 0], [b, 0], [b + sl, h], [sl, h]];
            const foot = sl > 0 ? [sl, 0] : [b + sl, 0], top = sl > 0 ? [sl, h] : [b + sl, h];
            return {
              prompt: `A parallelogram has base ${n(b)} cm and perpendicular height ${n(h)} cm. Find its area in cm².`,
              graph: fig([...polyItems(Vs, { sides: [`${b} cm`] }), hdash(foot, top), txt(add(mid(foot, top), [0.5, 0]), `${h} cm`), ...rightMark(foot, top, sl > 0 ? [b, 0] : [0, 0], 0.04 * b)], Vs),
              steps: [`Cut the triangle off one end and slide it to the other: the parallelogram becomes a ${n(b)} by ${n(h)} rectangle, so ${V("A")} = ${V("b")}${V("h")}.`, `${n(b)} · ${n(h)} = ${n(A)} cm². (The slanted side is not the height.)`],
              answer: { kind: "number", value: A }, answerText: `${n(A)} cm²`, answerInput: String(A),
              vals: { A }, params: { b, h, kind },
            };
          }
          const A = new Frac(b * h, 2), apex = r.int(-2, b + 2);
          const Vs = [[0, 0], [b, 0], [apex, h]];
          const items = [...polyItems(Vs, { sides: [`${b} cm`] }), hdash([apex, 0], [apex, h]), txt([apex + 0.5, h / 2], `${h} cm`)];
          if (apex < 0 || apex > b) items.push(hdash(apex < 0 ? [0, 0] : [b, 0], [apex, 0]));
          return {
            prompt: `A triangle has base ${n(b)} cm and height ${n(h)} cm. Find its area in cm².`,
            graph: fig(items, [...Vs, [apex, 0]]),
            steps: [`A triangle is half of a parallelogram with the same base and height: ${V("A")} = ${M.frac("1", "2")}${V("b")}${V("h")}.`, `${M.frac("1", "2")} · ${n(b)} · ${n(h)} = ${fracEq(b * h, 2)} cm².`],
            answer: { kind: "number", value: A.value }, answerText: `${M.f(A)} cm²`, answerInput: typed(A),
            vals: { bh: b * h, A: fracVal(A) }, params: { b, h, kind },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            for (;;) {
              const b1 = r.int(3, 16), b2 = r.int(3, 16), h = r.int(2, 10);
              if (b1 === b2 || ((b1 + b2) * h) % 2) continue;
              const sum = b1 + b2, A = (sum * h) / 2, lo = Math.min(b1, b2), hi = Math.max(b1, b2), off = (hi - lo) / 2 - 1;
              const Vs = [[0, 0], [hi, 0], [off + lo, h], [off, h]];
              return {
                prompt: `A trapezoid has parallel sides ${n(b1)} m and ${n(b2)} m, ${n(h)} m apart. Find its area in m².`,
                graph: fig([...polyItems(Vs, { sides: [`${hi} m`, "", `${lo} m`] }), hdash([off, 0], [off, h]), txt([off + 0.6, h / 2], `${h} m`)], Vs),
                steps: [`Trapezoid: ${V("A")} = ${M.frac("1", "2")}(${M.sub(V("b"), 1)} + ${M.sub(V("b"), 2)})${V("h")}, the average of the parallel sides times the height.`,
                  `${M.frac("1", "2")} · (${n(b1)} + ${n(b2)}) · ${n(h)} = ${M.frac("1", "2")} · ${n(sum)} · ${n(h)} = ${n(A)} m².`],
                answer: { kind: "number", value: A }, answerText: `${n(A)} m²`, answerInput: String(A),
                vals: { sum, A }, params: { b1, b2, h, kind: "trap" },
              };
            }
          }
          for (;;) {
            const d1 = r.int(4, 20), d2 = r.int(4, 20);
            if ((d1 * d2) % 2 || d1 === d2) continue;
            const A = (d1 * d2) / 2, rh = r.chance(0.5), up = rh ? d2 / 2 : d2 / 3;
            const Vs = [[-d1 / 2, 0], [0, -(d2 - up)], [d1 / 2, 0], [0, up]];
            return {
              prompt: `A ${rh ? "rhombus" : "kite"} has diagonals of ${n(d1)} cm and ${n(d2)} cm. Find its area in cm².`,
              graph: fig([...polyItems(Vs, {}), hdash(Vs[0], Vs[2]), hdash(Vs[1], Vs[3]), txt([0, 0.6], `${d1} cm`), txt([0.25 * d1, -0.35 * d2], `${d2} cm`)], Vs),
              steps: [`The diagonals of a ${rh ? "rhombus" : "kite"} are perpendicular, so the area is half the product of the diagonals: ${V("A")} = ${M.frac("1", "2")}${M.sub(V("d"), 1)}${M.sub(V("d"), 2)}.`,
                `${M.frac("1", "2")} · ${n(d1)} · ${n(d2)} = ${M.frac(n(d1 * d2), "2")} = ${n(A)} cm².`],
              answer: { kind: "number", value: A }, answerText: `${n(A)} cm²`, answerInput: String(A),
              vals: { prod: d1 * d2, A }, params: { d1, d2, kind: "diag" },
            };
          }
        }
        const kind = r.pick(["gable", "ell", "hex"]);
        if (kind === "gable") {
          for (;;) {
            const w = r.int(5, 12), h = r.int(3, 6), t = r.int(2, 5), ww = r.int(1, 2), wh = r.int(1, 2);
            if ((w * t) % 2) continue;
            const rect = w * h, triA = (w * t) / 2, win = ww * wh, paint = rect + triA - win;
            const Vs = [[0, 0], [w, 0], [w, h], [w / 2, h + t], [0, h]];
            const wx = w / 2 - ww / 2, wy = h / 2 - wh / 2;
            return {
              prompt: `The end wall of a shed is ${aNum(w)} ${n(w)} m by ${n(h)} m rectangle topped by a triangular gable ${n(t)} m tall. It has one ${n(ww)} m by ${n(wh)} m window. How many square meters of wall need paint?`,
              graph: fig([...polyItems(Vs, { sides: [`${w} m`, `${h} m`] }), { t: "seg", a: [0, h], b: [w, h], role: "muted", dash: true }, hdash([w / 2, h], [w / 2, h + t]), txt([w / 2 + 0.5, h + t / 2], `${t} m`),
                { t: "poly", p: [[wx, wy], [wx + ww, wy], [wx + ww, wy + wh], [wx, wy + wh]], role: "secondary" }], Vs),
              steps: [
                `Split the wall: a rectangle plus a triangle, minus the window.`,
                `Rectangle: ${n(w)} · ${n(h)} = ${n(rect)} m². Triangle: ${M.frac("1", "2")} · ${n(w)} · ${n(t)} = ${n(triA)} m². Window: ${n(ww)} · ${n(wh)} = ${n(win)} m².`,
                `${n(rect)} + ${n(triA)} − ${n(win)} = ${n(paint)} m².`,
              ],
              answer: { kind: "number", value: paint }, answerText: `${n(paint)} m²`, answerInput: String(paint),
              vals: { rect, triA, win, paint }, params: { w, h, t, ww, wh, kind },
            };
          }
        }
        if (kind === "ell") {
          const W = r.int(8, 15), H = r.int(6, 12), cw = r.int(2, W - 3), ch = r.int(2, H - 3);
          const big = W * H, cut = cw * ch, A = big - cut;
          const Vs = [[0, 0], [W, 0], [W, H - ch], [W - cw, H - ch], [W - cw, H], [0, H]];
          return {
            prompt: `An L-shaped room fits in ${aNum(W)} ${n(W)} m by ${n(H)} m rectangle with ${aNum(cw)} ${n(cw)} m by ${n(ch)} m corner missing. Find the floor area in m².`,
            graph: fig([...polyItems(Vs, { sides: [`${W} m`, "", `${cw} m`, `${ch} m`, "", `${H} m`] }), { t: "poly", p: [[W - cw, H - ch], [W, H - ch], [W, H], [W - cw, H]], role: "muted" }], Vs),
            steps: [
              `Think of the full rectangle and subtract the missing corner.`,
              `Full rectangle: ${n(W)} · ${n(H)} = ${n(big)} m². Missing corner: ${n(cw)} · ${n(ch)} = ${n(cut)} m².`,
              `${n(big)} − ${n(cut)} = ${n(A)} m².`,
            ],
            answer: { kind: "number", value: A }, answerText: `${n(A)} m²`, answerInput: String(A),
            vals: { big, cut, A }, params: { W, H, cw, ch, kind },
          };
        }
        const s = 2 * r.int(2, 6), k = s / 2, per = 6 * s, coef = (3 * s * s) / 2;
        const pts = []; for (let i = 0; i < 6; i++) pts.push(add([0, 0], dir(60 * i), s));
        return {
          prompt: `A regular hexagon has sides of ${n(s)} cm. Find its exact area in cm², using ${V("A")} = ${M.frac("1", "2")}${V("a")}${V("P")} (apothem ${V("a")}, perimeter ${V("P")}).`,
          graph: fig([...polyItems(pts, { sides: [`${s} cm`] }), hdash([0, 0], [0.75 * s, (s * Math.sqrt(3)) / 4]), hdash([0, 0], pts[0]), hdash([0, 0], pts[1]), txt([0.2 * s, 0.38 * s], "a")], pts),
          steps: [
            `Lines from the center split the hexagon into 6 equilateral triangles of side ${n(s)}. The apothem is the height of one: half of it is a 30–60–90 triangle with short leg ${n(s)} ÷ 2 = ${n(k)}, so ${V("a")} = ${n(k)}${M.sqrt("3")}.`,
            `Perimeter: ${V("P")} = 6 · ${n(s)} = ${n(per)} cm.`,
            `${V("A")} = ${M.frac("1", "2")} · ${n(k)}${M.sqrt("3")} · ${n(per)} = ${n(coef)}${M.sqrt("3")} cm².`,
          ],
          answer: { kind: "number", value: coef * Math.sqrt(3) }, answerText: `${n(coef)}${M.sqrt("3")} cm²`, answerInput: `${coef}sqrt(3)`,
          vals: { k, per, coef }, params: { s, kind }, consts: [6, 3],
        };
      },
    },

    // ---- G.16 Triangle area: Heron's formula & alternatives --------------------------------------------------
    "G.heron": {
      title: "Triangle area from sides, angles or coordinates",
      generate(r, level) {
        const HERON = [[3, 4, 5], [5, 5, 6], [5, 5, 8], [5, 12, 13], [6, 8, 10], [7, 15, 20], [9, 10, 17], [10, 13, 13], [13, 14, 15], [11, 13, 20], [13, 20, 21], [10, 17, 21], [8, 15, 17], [12, 16, 20], [6, 25, 29], [9, 12, 15]];
        const sas = (a, b, C) => { const Vs = [[0, 0], [a, 0], add([0, 0], dir(C), b)]; return fig(polyItems(Vs, { names: ["C", "B", "A"], sides: [String(a), "", String(b)], angles: [`${C}°`] }), Vs); };
        if (level === 1) {
          const C = r.pick([30, 150, 90]), a = r.int(3, 14), b = r.int(3, 14), sinT = C === 90 ? "1" : M.frac("1", "2");
          const A = new Frac(a * b * (C === 90 ? 2 : 1), 4);
          return {
            prompt: `Two sides of a triangle are ${n(a)} cm and ${n(b)} cm, and the angle between them is ${dg(C)}. Find the area in cm², using Area = ${M.frac("1", "2")}${V("a")}${V("b")} sin ${V("C")}.`,
            graph: sas(a, b, C),
            steps: [
              `sin ${dg(C)} = ${sinT}${C === 150 ? " (the same as sin 30°, since sin(180° − θ) = sin θ)" : ""}.`,
              `Area = ${M.frac("1", "2")} · ${n(a)} · ${n(b)} · ${sinT} = ${M.f(A)} cm².`,
            ],
            answer: { kind: "number", value: A.value }, answerText: `${M.f(A)} cm²`, answerInput: typed(A),
            vals: { A: fracVal(A) }, params: { a, b, C }, consts: [30, 180],
          };
        }
        if (level === 2) {
          const [a0, b0, c0] = r.pick(HERON), m = a0 + b0 + c0 <= 20 ? r.int(1, 2) : 1;
          const [a, b, c] = r.shuffle([a0 * m, b0 * m, c0 * m]), per = a + b + c, s = per / 2;
          const sa = s - a, sb = s - b, sc = s - c, prod = s * sa * sb * sc, A = Math.round(Math.sqrt(prod));
          return {
            prompt: `Find the area of a triangle with sides ${n(a)}, ${n(b)} and ${n(c)} using Heron's formula.`,
            graph: fig(polyItems(triFromSides(a, b, c), { sides: [String(c), String(a), String(b)] }), triFromSides(a, b, c)),
            steps: [
              `Semi-perimeter: ${V("s")} = ${M.frac(`${n(a)} + ${n(b)} + ${n(c)}`, "2")} = ${M.frac(n(per), "2")} = ${n(s)}.`,
              `${V("s")} − ${V("a")} = ${n(s)} − ${n(a)} = ${n(sa)}; ${V("s")} − ${V("b")} = ${n(s)} − ${n(b)} = ${n(sb)}; ${V("s")} − ${V("c")} = ${n(s)} − ${n(c)} = ${n(sc)}.`,
              `Area = ${M.sqrt(`${V("s")}(${V("s")} − ${V("a")})(${V("s")} − ${V("b")})(${V("s")} − ${V("c")})`)} = ${M.sqrt(`${n(s)} · ${n(sa)} · ${n(sb)} · ${n(sc)}`)} = ${M.sqrt(n(prod))} = ${n(A)}.`,
            ],
            answer: { kind: "number", value: A }, answerText: n(A), answerInput: String(A),
            vals: { per, s, sa, sb, sc, prod, A }, params: { a, b, c },
          };
        }
        const kind = r.pick(["shoelace", "inradius", "sasroot"]);
        if (kind === "shoelace") {
          for (;;) {
            const pts = [0, 1, 2].map(() => [r.int(-7, 7), r.int(-7, 7)]);
            const [[x1, y1], [x2, y2], [x3, y3]] = pts;
            const t1 = x1 * (y2 - y3), t2 = x2 * (y3 - y1), t3 = x3 * (y1 - y2), S = t1 + t2 + t3;
            if (Math.abs(S) < 12) continue;
            const A = new Frac(Math.abs(S), 2);
            return {
              prompt: `Find the area of the triangle with vertices ${V("A")}(${n(x1)}, ${n(y1)}), ${V("B")}(${n(x2)}, ${n(y2)}) and ${V("C")}(${n(x3)}, ${n(y3)}).`,
              graph: plane([{ t: "poly", p: pts, role: "primary" }, ...pts.map((p, i) => ({ t: "pt", x: p[0], y: p[1], label: "ABC"[i] }))], 9),
              steps: [
                `Coordinate (shoelace) formula: Area = ${M.frac("1", "2")}|${M.sub(x, 1)}(${M.sub(y, 2)} − ${M.sub(y, 3)}) + ${M.sub(x, 2)}(${M.sub(y, 3)} − ${M.sub(y, 1)}) + ${M.sub(x, 3)}(${M.sub(y, 1)} − ${M.sub(y, 2)})|.`,
                `${n(x1)}(${n(y2)} − ${np(y3)}) = ${n(t1)}; ${n(x2)}(${n(y3)} − ${np(y1)}) = ${n(t2)}; ${n(x3)}(${n(y1)} − ${np(y2)}) = ${n(t3)}.`,
                `Sum: ${n(t1)} + ${np(t2)} + ${np(t3)} = ${n(S)}. Area = ${M.frac("1", "2")} · |${n(S)}| = ${M.f(A)}.`,
              ],
              answer: { kind: "number", value: A.value }, answerText: M.f(A), answerInput: typed(A),
              vals: { t1, t2, t3, S, A: fracVal(A) }, params: { pts, kind },
            };
          }
        }
        if (kind === "inradius") {
          const [a, b, c] = r.shuffle(r.pick(HERON)), per = a + b + c, s = per / 2;
          const sa = s - a, sb = s - b, sc = s - c, prod = s * sa * sb * sc, A = Math.round(Math.sqrt(prod)), rin = new Frac(A, s);
          return {
            prompt: `A triangle has sides ${n(a)}, ${n(b)} and ${n(c)}. Find the radius of its inscribed circle, using Area = ${V("r")}${V("s")}.`,
            steps: [
              `Semi-perimeter: ${V("s")} = ${M.frac(n(per), "2")} = ${n(s)}.`,
              `Heron: Area = ${M.sqrt(`${n(s)} · ${n(sa)} · ${n(sb)} · ${n(sc)}`)} = ${M.sqrt(n(prod))} = ${n(A)}.`,
              `Area = ${V("r")}${V("s")}, so ${V("r")} = ${M.frac("Area", V("s"))} = ${M.frac(n(A), n(s))} = ${M.f(rin)}.`,
            ],
            answer: { kind: "number", value: rin.value }, answerText: M.f(rin), answerInput: typed(rin),
            vals: { per, s, sa, sb, sc, prod, A, rin: fracVal(rin) }, params: { a, b, c, kind },
          };
        }
        const C = r.pick([45, 60, 120, 135]), a = r.int(2, 12), b = r.int(2, 12), rt = C === 45 || C === 135 ? 2 : 3;
        const coef = new Frac(a * b, 4);
        return {
          prompt: `Two sides of a triangle are ${n(a)} and ${n(b)}, and the angle between them is ${dg(C)}. Find the exact area.`,
          graph: sas(a, b, C),
          steps: [
            `SAS area: Area = ${M.frac("1", "2")}${V("a")}${V("b")} sin ${V("C")}, and sin ${dg(C)} = ${M.frac(M.sqrt(n(rt)), "2")}${C > 90 ? ` (equal to sin ${dg(180 - C)}, since sin(180° − θ) = sin θ)` : ""}.`,
            `Area = ${M.frac("1", "2")} · ${n(a)} · ${n(b)} · ${M.frac(M.sqrt(n(rt)), "2")} = ${M.frac(`${n(a * b)}${M.sqrt(n(rt))}`, "4")}${coef.d === 4 ? "" : ` = ${fracRoot(coef, rt)}`}.`,
          ],
          answer: { kind: "number", value: coef.value * Math.sqrt(rt) }, answerText: fracRoot(coef, rt), answerInput: fracRootIn(coef, rt),
          vals: { rt, ab: a * b, coef: fracVal(coef), sup: 180 - C }, params: { a, b, C, kind }, consts: [4, 180],
        };
      },
    },

    // ---- G.17 Circles: circumference, area, arcs & sectors ------------------------------------------------
    "G.9": {
      title: "Circumference, area, arcs and sectors",
      generate(r, level) {
        const circ = (rad, extra = []) => fig([{ t: "circle", c: [0, 0], r: rad, role: "primary" }, { t: "pt", x: 0, y: 0 }, ...extra], [[-rad, -rad], [rad, rad]], 0.12);
        if (level === 1) {
          const area = r.chance(0.5), useD = r.chance(0.5), rad = r.int(2, 15), d = 2 * rad;
          const g = useD ? circ(rad, [{ t: "seg", a: [-rad, 0], b: [rad, 0], role: "secondary" }, txt([0, 0.12 * rad], `${d} cm`)])
            : circ(rad, [{ t: "seg", a: [0, 0], b: [rad, 0], role: "secondary" }, txt([rad / 2, 0.12 * rad], `${rad} cm`)]);
          const given = useD ? `diameter ${n(d)} cm` : `radius ${n(rad)} cm`;
          if (area) {
            const A = rad * rad;
            return {
              prompt: `A circle has ${given}. Find its exact area in cm².`,
              graph: g,
              steps: [...(useD ? [`The radius is half the diameter: ${n(d)} ÷ 2 = ${n(rad)} cm.`] : []), `${V("A")} = π${sq(V("r"))} = π · ${sq(n(rad))} = ${n(A)}π cm². (Square the radius, not the diameter.)`],
              answer: { kind: "number", value: A * Math.PI }, answerText: `${n(A)}π cm²`, answerInput: `${A}pi`,
              vals: { rad, A }, params: useD ? { d, area: 1 } : { rad, area: 1 },
            };
          }
          const C = d;
          return {
            prompt: `A circle has ${given}. Find its exact circumference in cm.`,
            graph: g,
            steps: useD ? [`${V("C")} = π${V("d")} = π · ${n(d)} = ${n(C)}π cm.`] : [`${V("C")} = 2π${V("r")} = 2 · π · ${n(rad)} = ${n(C)}π cm.`],
            answer: { kind: "number", value: C * Math.PI }, answerText: `${n(C)}π cm`, answerInput: `${C}pi`,
            vals: { C }, params: useD ? { d, area: 0 } : { rad, area: 0 },
          };
        }
        if (level === 2) {
          const rad = r.int(2, 12), sector = r.chance(0.5);
          if (r.chance(0.3)) {
            // radians: s = rθ, A = ½ r² θ
            const th = r.pick([new Frac(1, 2), new Frac(1, 3), new Frac(1, 4), new Frac(1, 6), new Frac(2, 3), new Frac(3, 4), new Frac(5, 6), new Frac(3, 2), new Frac(5, 4)]);
            const thd = th.mul(180).n, res = sector ? th.mul(rad * rad).div(2) : th.mul(rad);
            const thT = piText(th);
            return {
              prompt: `A sector of a circle of radius ${n(rad)} m has a central angle of ${thT} radians. Find the exact ${sector ? "area of the sector, in m²" : "length of its arc, in m"}.`,
              graph: circ(rad, [{ t: "seg", a: [0, 0], b: [rad, 0], role: "secondary" }, { t: "seg", a: [0, 0], b: add([0, 0], dir(thd), rad), role: "secondary" }, ...arc([0, 0], rad, 0, thd, "highlight"), txt([rad / 2, -0.12 * rad], `${rad} m`)]),
              steps: sector
                ? [`With the angle in radians, sector area = ${M.frac("1", "2")}${sq(V("r"))}θ.`, `${M.frac("1", "2")} · ${sq(n(rad))} · ${thT} = ${M.frac(n(rad * rad), "2")} · ${thT} = ${piText(res)} m².`]
                : [`With the angle in radians, arc length = ${V("r")}θ.`, `${n(rad)} · ${thT} = ${piText(res)} m.`],
              answer: { kind: "number", value: res.value * Math.PI }, answerText: `${piText(res)} ${sector ? "m²" : "m"}`, answerInput: piIn(res),
              vals: { rr: rad * rad, res: fracVal(res), th: fracVal(th) }, params: { rad, th: fracVal(th), sector: sector ? 1 : 0, rads: 1 },
            };
          }
          const th = r.pick([30, 40, 45, 60, 72, 80, 90, 120, 135, 150, 210, 240, 270, 300]), f = new Frac(th, 360);
          const whole = sector ? rad * rad : 2 * rad, res = f.mul(whole);
          return {
            prompt: `A circle has radius ${n(rad)} m. Find the exact ${sector ? "area of a sector" : "length of an arc"} with a central angle of ${dg(th)}${sector ? ", in m²" : ", in m"}.`,
            graph: circ(rad, [{ t: "seg", a: [0, 0], b: [rad, 0], role: "secondary" }, { t: "seg", a: [0, 0], b: add([0, 0], dir(th), rad), role: "secondary" }, ...arc([0, 0], rad, 0, th, "highlight"), ...arc([0, 0], 0.2 * rad, 0, th), txt(add([0, 0], dir(th / 2), 0.33 * rad), `${th}°`)]),
            steps: [
              `The ${sector ? "sector" : "arc"} is the fraction ${M.frac(dg(th), "360°")} = ${M.f(f)} of the whole ${sector ? "disk" : "circle"}.`,
              sector ? `Whole area: π${sq(V("r"))} = π · ${sq(n(rad))} = ${n(whole)}π m².` : `Whole circumference: 2π${V("r")} = 2 · π · ${n(rad)} = ${n(whole)}π m.`,
              `${M.f(f)} · ${n(whole)}π = ${piText(res)} ${sector ? "m²" : "m"}.`,
            ],
            answer: { kind: "number", value: res.value * Math.PI }, answerText: `${piText(res)} ${sector ? "m²" : "m"}`, answerInput: piIn(res),
            vals: { f: fracVal(f), whole, res: fracVal(res) }, params: { rad, th, sector: sector ? 1 : 0, rads: 0 }, consts: [360],
          };
        }
        const kind = r.pick(["segment", "wheel", "chord"]);
        if (kind === "segment") {
          const th = r.pick([90, 60]), k = r.int(1, 6), rad = 2 * k, rr = rad * rad;
          const B = add([0, 0], dir(th), rad);
          const g = circ(rad, [{ t: "seg", a: [0, 0], b: [rad, 0], role: "secondary" }, { t: "seg", a: [0, 0], b: B, role: "secondary" }, { t: "seg", a: [rad, 0], b: B, role: "highlight" },
            ...arc([0, 0], rad, 0, th, "highlight"), txt(add([0, 0], dir(th / 2), 0.3 * rad), `${th}°`), txt([rad / 2, -0.12 * rad], `${rad} cm`)]);
          if (th === 90) {
            const sec = new Frac(rr, 4), triA = rr / 2;
            return {
              prompt: `A chord cuts off a 90° arc of a circle of radius ${n(rad)} cm. Find the exact area of the segment between the chord and the arc, in cm².`,
              graph: g,
              steps: [
                `Segment = sector − triangle.`,
                `Sector: ${M.frac("90°", "360°")} · π · ${sq(n(rad))} = ${M.frac("1", "4")} · ${n(rr)}π = ${piText(sec)}.`,
                `Triangle: the two radii are perpendicular legs, so its area is ${M.frac("1", "2")} · ${n(rad)} · ${n(rad)} = ${n(triA)}.`,
                `Segment: (${piText(sec)} − ${n(triA)}) cm² (about ${n(Math.round((sec.value * Math.PI - triA) * 100) / 100)} cm²).`,
              ],
              answer: { kind: "number", value: sec.value * Math.PI - triA }, answerText: `(${piText(sec)} − ${n(triA)}) cm²`, answerInput: `${piIn(sec)} - ${triA}`,
              vals: { rr, sec: fracVal(sec), triA, approx: Math.round((sec.value * Math.PI - triA) * 100) / 100 }, params: { rad, th, kind }, consts: [90, 360, 4],
            };
          }
          const sec = new Frac(rr, 6), kk = k * k;
          return {
            prompt: `A chord cuts off a 60° arc of a circle of radius ${n(rad)} cm. Find the exact area of the segment between the chord and the arc, in cm².`,
            graph: g,
            steps: [
              `Segment = sector − triangle.`,
              `Sector: ${M.frac("60°", "360°")} · π · ${sq(n(rad))} = ${M.frac("1", "6")} · ${n(rr)}π = ${piText(sec)}.`,
              `Triangle: two radii with a 60° angle between them make an equilateral triangle of side ${n(rad)}: ${M.frac(M.sqrt("3"), "4")} · ${sq(n(rad))} = ${n(kk)}${M.sqrt("3")}.`,
              `Segment: (${piText(sec)} − ${n(kk)}${M.sqrt("3")}) cm² (about ${n(Math.round((sec.value * Math.PI - kk * Math.sqrt(3)) * 100) / 100)} cm²).`,
            ],
            answer: { kind: "number", value: sec.value * Math.PI - kk * Math.sqrt(3) }, answerText: `(${piText(sec)} − ${n(kk)}${M.sqrt("3")}) cm²`, answerInput: `${piIn(sec)} - ${kk}sqrt(3)`,
            vals: { rr, sec: fracVal(sec), kk, approx: Math.round((sec.value * Math.PI - kk * Math.sqrt(3)) * 100) / 100 }, params: { rad, th, kind }, consts: [60, 360, 6, 3, 4],
          };
        }
        if (kind === "wheel") {
          for (;;) {
            const d = r.pick([50, 60, 64, 66, 70, 72, 75, 80]), N = r.pick([50, 100, 150, 200, 250, 300, 500]), cm = N * d;
            if (cm % 100) continue;
            const m = cm / 100;
            return {
              prompt: `A bicycle wheel has a diameter of ${n(d)} cm. How far does the bicycle travel when the wheel turns ${n(N)} times? Give an exact answer in meters.`,
              graph: circ(d / 2, [{ t: "seg", a: [-d / 2, 0], b: [d / 2, 0], role: "secondary" }, txt([0, 0.07 * d], `${d} cm`), { t: "seg", a: [-d, -d / 2], b: [d, -d / 2], role: "muted" }]),
              steps: [
                `One turn rolls the wheel along its circumference: π${V("d")} = ${n(d)}π cm.`,
                `${n(N)} turns: ${n(N)} · ${n(d)}π = ${n(cm)}π cm.`,
                `100 cm = 1 m: ${n(cm)}π ÷ 100 = ${n(m)}π m (about ${n(Math.round(m * Math.PI * 10) / 10)} m).`,
              ],
              answer: { kind: "number", value: m * Math.PI }, answerText: `${n(m)}π m`, answerInput: `${m}pi`,
              vals: { cm, m, approx: Math.round(m * Math.PI * 10) / 10 }, params: { d, N, kind }, consts: [100],
            };
          }
        }
        const th = r.pick([60, 90, 120]), rad = r.int(2, 12), half = th / 2;
        const B = add([0, 0], dir(th), rad);
        const sinT = th === 60 ? M.frac("1", "2") : th === 90 ? M.frac(M.sqrt("2"), "2") : M.frac(M.sqrt("3"), "2");
        const ans = th === 60 ? n(rad) : `${n(rad)}${M.sqrt(th === 90 ? "2" : "3")}`;
        return {
          prompt: `Two points on a circle of radius ${n(rad)} are separated by a central angle of ${dg(th)}. Find the exact length of the chord joining them.`,
          graph: circ(rad, [{ t: "seg", a: [0, 0], b: [rad, 0], role: "secondary" }, { t: "seg", a: [0, 0], b: B, role: "secondary" }, { t: "seg", a: [rad, 0], b: B, role: "highlight" }, txt(add([0, 0], dir(th / 2), 0.25 * rad), `${th}°`)]),
          steps: [
            `Chord length: ${V("c")} = 2${V("r")} sin ${M.frac("θ", "2")}. (The radius bisecting the angle splits the chord into two equal halves of length ${V("r")} sin ${M.frac("θ", "2")}.)`,
            `${M.frac("θ", "2")} = ${dg(half)}, and sin ${dg(half)} = ${sinT}.`,
            `${V("c")} = 2 · ${n(rad)} · ${sinT} = ${ans}.`,
          ],
          answer: { kind: "number", value: 2 * rad * Math.sin(half * RAD) }, answerText: ans, answerInput: th === 60 ? String(rad) : `${rad}sqrt(${th === 90 ? 2 : 3})`,
          vals: { half }, params: { rad, th, kind }, consts: [3],
        };
      },
    },

    // ---- G.18 Circle theorems -------------------------------------------------------------------------------
    "G.10": {
      title: "Inscribed angles, chords, secants and tangents",
      generate(r, level) {
        const R = 4, O = [0, 0], on = (a) => add(O, dir(a), R);
        const base = () => [{ t: "circle", c: O, r: R, role: "muted" }];
        if (level === 1) {
          if (r.chance(0.5)) {
            const th = r.int(15, 80), cen = 2 * th, a0 = r.int(200, 320) - cen / 2;
            const A = on(a0), B = on(a0 + cen), C = on(a0 + cen + (360 - cen) / 2);
            const fromCentral = r.chance(0.5);
            const items = [...base(), { t: "seg", a: O, b: A, role: "secondary" }, { t: "seg", a: O, b: B, role: "secondary" }, { t: "seg", a: C, b: A, role: "primary" }, { t: "seg", a: C, b: B, role: "primary" },
              { t: "pt", x: 0, y: 0, label: "O" }, txt(add(A, unit(A), 0.5), "A"), txt(add(B, unit(B), 0.5), "B"), txt(add(C, unit(C), 0.5), "C"),
              txt(add(O, dir(a0 + cen / 2), 0.9), fromCentral ? `${cen}°` : "?"), txt(add(C, unit(sub(O, C)), 1.2), fromCentral ? "?" : `${th}°`)];
            return {
              prompt: fromCentral
                ? `Central angle ${ang("AOB")} measures ${dg(cen)}. Find the inscribed angle ${ang("ACB")}, which cuts off the same arc ${V("AB")}.`
                : `Inscribed angle ${ang("ACB")} measures ${dg(th)}. Find the central angle ${ang("AOB")} on the same arc ${V("AB")}.`,
              graph: fig(items, [[-R, -R], [R, R]], 0.15),
              steps: fromCentral
                ? [`Inscribed angle theorem: an inscribed angle is half the central angle on the same arc.`, `${mang("ACB")} = ${dg(cen)} ÷ 2 = ${dg(th)}.`]
                : [`Inscribed angle theorem: the central angle on the same arc is twice the inscribed angle.`, `${mang("AOB")} = 2 · ${dg(th)} = ${dg(cen)}.`],
              answer: { kind: "number", value: fromCentral ? th : cen }, answerText: dg(fromCentral ? th : cen), answerInput: String(fromCentral ? th : cen),
              vals: fromCentral ? { th } : { cen }, params: fromCentral ? { cen, kind: "c2i" } : { th, kind: "i2c" },
            };
          }
          const a = r.int(15, 75), b = 90 - a;
          const A = [-R, 0], B = [R, 0], C = on(2 * a);
          const items = [...base(), { t: "seg", a: A, b: B, role: "secondary" }, { t: "seg", a: A, b: C, role: "primary" }, { t: "seg", a: B, b: C, role: "primary" }, { t: "pt", x: 0, y: 0, label: "O" },
            txt([-R - 0.5, 0], "A"), txt([R + 0.5, 0], "B"), txt(add(C, unit(C), 0.5), "C"), txt(add(A, dir(a / 2), 1.3), `${a}°`), txt(add(B, dir(180 - b / 2), 1.3), "?"), ...rightMark(C, A, B, 0.35)];
          return {
            prompt: `${seg("AB")} is a diameter of the circle and ${V("C")} is a point on it. ${mang("CAB")} = ${dg(a)}. Find ${mang("CBA")}.`,
            graph: fig(items, [[-R, -R], [R, R]], 0.15),
            steps: [`Thales' theorem: an angle inscribed in a semicircle is a right angle, so ${mang("ACB")} = 90°.`, `The angles of ${tri("ABC")} add to 180°: ${mang("CBA")} = 180° − 90° − ${dg(a)} = ${dg(b)}.`],
            answer: { kind: "number", value: b }, answerText: dg(b), answerInput: String(b),
            vals: { b }, params: { a, kind: "thales" }, consts: [90, 180],
          };
        }
        if (level === 2) {
          const kind = r.pick(["chords", "secant", "tangents"]);
          if (kind === "chords") {
            for (;;) {
              const a = r.int(2, 12), b = r.int(2, 12), c = r.int(2, 12), num = a * b;
              if (num % c || c === a || c === b) continue;
              const d = num / c, phi = r.int(50, 130);
              const A = [-a, 0], B = [b, 0], C = add([0, 0], dir(phi), -c), D = add([0, 0], dir(phi), d);
              // circle through A, B, C
              const Dd = 2 * (A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1]));
              const ox = ((A[0] ** 2 + A[1] ** 2) * (B[1] - C[1]) + (B[0] ** 2 + B[1] ** 2) * (C[1] - A[1]) + (C[0] ** 2 + C[1] ** 2) * (A[1] - B[1])) / Dd;
              const oy = ((A[0] ** 2 + A[1] ** 2) * (C[0] - B[0]) + (B[0] ** 2 + B[1] ** 2) * (A[0] - C[0]) + (C[0] ** 2 + C[1] ** 2) * (B[0] - A[0])) / Dd;
              const rad = Math.hypot(A[0] - ox, A[1] - oy), s = 0.07 * 2 * rad;
              const items = [{ t: "circle", c: [ox, oy], r: rad, role: "muted" }, { t: "seg", a: A, b: B, role: "primary" }, { t: "seg", a: C, b: D, role: "secondary" },
                txt(add(A, unit(sub(A, [ox, oy])), s), "A"), txt(add(B, unit(sub(B, [ox, oy])), s), "B"), txt(add(C, unit(sub(C, [ox, oy])), s), "C"), txt(add(D, unit(sub(D, [ox, oy])), s), "D"),
                txt([0.4 * s, -0.8 * s], "E"), txt([-a / 2, 0.6 * s], String(a)), txt([b / 2, 0.6 * s], String(b)), txt(add(add([0, 0], dir(phi), -c / 2), dir(phi + 90), 0.6 * s), String(c)), txt(add(add([0, 0], dir(phi), d / 2), dir(phi + 90), 0.6 * s), "?")];
              return {
                prompt: `Chords ${seg("AB")} and ${seg("CD")} cross at ${V("E")}. ${seg("AE")} = ${n(a)}, ${seg("EB")} = ${n(b)} and ${seg("CE")} = ${n(c)}. Find ${seg("ED")}.`,
                graph: fig(items, [[ox - rad, oy - rad], [ox + rad, oy + rad]], 0.12),
                steps: [`Intersecting chords: the products of the pieces are equal, ${seg("AE")} · ${seg("EB")} = ${seg("CE")} · ${seg("ED")}.`,
                  `${n(a)} · ${n(b)} = ${n(c)} · ${seg("ED")}, so ${n(num)} = ${n(c)} · ${seg("ED")}.`, `${seg("ED")} = ${M.frac(n(num), n(c))} = ${n(d)}.`],
                answer: { kind: "number", value: d }, answerText: n(d), answerInput: String(d),
                vals: { num, d }, params: { a, b, c, kind },
              };
            }
          }
          if (kind === "secant") {
            for (;;) {
              const a = r.int(2, 16), w = r.int(a + 2, 36), pw = a * w, t = Math.round(Math.sqrt(pw));
              if (t * t !== pw) continue;
              const fwd = r.chance(0.5);
              // a circle of radius rad with P outside: |PO|² = rad² + t², and a secant with pieces a and w
              const rad = (w - a) / 2 + 2, PO = Math.sqrt(rad * rad + t * t), psi = Math.acos((a + w) / (2 * PO));
              const Pp = [-PO, 0], u = dir(psi * 180 / Math.PI), Ap = add(Pp, u, a), Bp = add(Pp, u, w);
              const tangA = Math.acos(rad / PO) * 180 / Math.PI, T = add([0, 0], dir(180 - tangA), rad);
              const items = [{ t: "circle", c: [0, 0], r: rad, role: "muted" }, { t: "seg", a: Pp, b: Bp, role: "primary" }, { t: "seg", a: Pp, b: T, role: "secondary" },
                txt(add(Pp, [-0.6, 0]), "P"), txt(add(Ap, [0, 0.7]), "A"), txt(add(Bp, unit(Bp), 0.7), "B"), txt(add(T, unit(T), 0.7), "T"), ...rightMark(T, Pp, [0, 0], 0.5), { t: "seg", a: [0, 0], b: T, role: "muted", dash: true }];
              return {
                prompt: fwd
                  ? `From a point ${V("P")} outside a circle, a tangent touches the circle at ${V("T")}, and a secant meets it at ${V("A")} and then ${V("B")}. ${seg("PA")} = ${n(a)} and ${seg("PB")} = ${n(w)}. Find the tangent length ${seg("PT")}.`
                  : `From a point ${V("P")} outside a circle, a tangent touches the circle at ${V("T")}, and a secant meets it at ${V("A")} and then ${V("B")}. ${seg("PT")} = ${n(t)} and ${seg("PA")} = ${n(a)}. Find the chord length ${seg("AB")}.`,
                graph: fig(items, [Pp, [rad, rad], [rad, -rad]], 0.1),
                steps: fwd
                  ? [`Power of a point: the tangent length squared equals the outside part of the secant times the whole secant, ${sq(seg("PT"))} = ${seg("PA")} · ${seg("PB")}.`, `${sq(seg("PT"))} = ${n(a)} · ${n(w)} = ${n(pw)}.`, `${seg("PT")} = ${M.sqrt(n(pw))} = ${n(t)}.`]
                  : [`Power of a point: ${sq(seg("PT"))} = ${seg("PA")} · ${seg("PB")}.`, `${sq(n(t))} = ${n(a)} · ${seg("PB")}, so ${seg("PB")} = ${M.frac(n(pw), n(a))} = ${n(w)}.`, `${seg("AB")} = ${seg("PB")} − ${seg("PA")} = ${n(w)} − ${n(a)} = ${n(w - a)}.`],
                answer: { kind: "number", value: fwd ? t : w - a }, answerText: n(fwd ? t : w - a), answerInput: String(fwd ? t : w - a),
                vals: fwd ? { pw, t } : { pw, w, ab: w - a }, params: fwd ? { a, w, kind, fwd: 1 } : { a, t, kind, fwd: 0 },
              };
            }
          }
          for (;;) {
            const X = r.int(2, 9), p = r.int(2, 6), rr = r.intExcept(1, 6, p), q = r.int(-6, 12), L = p * X + q, s = L - rr * X;
            if (L < 3 || Math.abs(s) > 25) continue;
            const c = collect(p, q, rr, s), Dd = 2.4 * R, ta = Math.acos(R / Dd) * 180 / Math.PI;
            const Pp = [Dd, 0], T1 = on(ta), T2 = on(-ta);
            const items = [...base(), { t: "seg", a: Pp, b: T1, role: "primary" }, { t: "seg", a: Pp, b: T2, role: "primary" }, txt(add(Pp, [0.6, 0]), "P"), txt(add(T1, unit(T1), 0.5), "A"), txt(add(T2, unit(T2), 0.5), "B"),
              txt(add(mid(Pp, T1), [0.3, 0.6]), linPlain(p, q)), txt(add(mid(Pp, T2), [0.3, -0.6]), linPlain(rr, s))];
            return {
              prompt: `From a point ${V("P")} outside a circle, two tangent segments touch the circle at ${V("A")} and ${V("B")}. ${seg("PA")} = ${lin(p, q)} and ${seg("PB")} = ${lin(rr, s)}. Find ${seg("PA")}.`,
              graph: fig(items, [[-R, -R], [Dd, R]], 0.12),
              steps: [`Two tangent segments from the same outside point are equal: ${lin(p, q)} = ${lin(rr, s)}.`, `Collect ${x} on one side: ${c.line}${soX(c.rhs, c.k, X)}.`,
                `${seg("PA")} = ${ev(p, X, q)} = ${n(L)}.`],
              answer: { kind: "number", value: L }, answerText: n(L), answerInput: String(L),
              vals: { ck: c.k, crhs: c.rhs, X, L }, params: { p, q, r: rr, s, kind },
            };
          }
        }
        if (r.chance(0.5)) {
          const [rad, t, d] = triple(r, 30), gap = d - rad;
          const ta = Math.acos(rad / d) * 180 / Math.PI, Pp = [d, 0], T = add([0, 0], dir(ta), rad);
          const items = [{ t: "circle", c: [0, 0], r: rad, role: "muted" }, { t: "seg", a: [0, 0], b: T, role: "secondary" }, { t: "seg", a: Pp, b: T, role: "primary" }, { t: "seg", a: [rad, 0], b: Pp, role: "highlight" },
            { t: "seg", a: [0, 0], b: [rad, 0], role: "muted", dash: true }, { t: "pt", x: 0, y: 0, label: "O" }, txt(add(Pp, [0.06 * d, 0]), "P"), txt(add(T, unit(T), 0.07 * d), "T"), ...rightMark(T, [0, 0], Pp, 0.05 * d)];
          return {
            prompt: `A circular pond has a radius of ${n(rad)} m. A straight path runs from a lamp post ${V("P")} to the edge of the pond, touching it at ${V("T")} without entering it, and the path is ${n(t)} m long. How far is the lamp post from the nearest point of the pond's edge?`,
            graph: fig(items, [[-rad, -rad], [d, rad]], 0.1),
            steps: [
              `The path is a tangent, and a tangent is perpendicular to the radius at the point of contact: ${tri("OTP")} has a right angle at ${V("T")}.`,
              `${sq(V("OP"))} = ${sq(n(rad))} + ${sq(n(t))} = ${n(rad * rad)} + ${n(t * t)} = ${n(d * d)}, so ${V("OP")} = ${n(d)} m from the center.`,
              `The nearest point of the edge lies on ${seg("OP")}, one radius from ${V("O")}: ${n(d)} − ${n(rad)} = ${n(gap)} m.`,
            ],
            answer: { kind: "number", value: gap }, answerText: `${n(gap)} m`, answerInput: String(gap),
            vals: { rr: rad * rad, tt: t * t, dd: d * d, d, gap }, params: { rad, t, kind: "tangent" },
          };
        }
        for (;;) {
          const X = r.int(4, 20), p = r.int(2, 6), rr = r.int(1, 6), q = r.int(-20, 40), A = p * X + q;
          if (A < 50 || A > 130) continue;
          const C = 180 - A, s = C - rr * X;
          if (Math.abs(s) > 60) continue;
          const k = p + rr, qs = q + s, rhs = 180 - qs;
          if (qs === 0) continue;
          // arcs BC + CD = 2A and DA + AB = 2C, drawn to match
          const u2 = Math.round(A * (0.6 + 0.6 * r.next())), u3 = 2 * A - u2, u4 = Math.round(C * (0.6 + 0.6 * r.next())), u1 = 2 * C - u4;
          const a0 = 200, angA = a0, angB = a0 + u1, angC = angB + u2, angD = angC + u3;
          const Vs = [on(angA), on(angB), on(angC), on(angD)];
          const items = [...base(), ...polyItems(Vs, { names: ["A", "B", "C", "D"], angles: [dlinPlain(p, q), "", dlinPlain(rr, s), ""], scale: 2 * R })];
          return {
            prompt: `Quadrilateral ${V("ABCD")} is inscribed in a circle. ${mang("A")} = ${dlin(p, q)} and ${mang("C")} = ${dlin(rr, s)}. Find ${mang("C")}.`,
            graph: fig(items, [[-R, -R], [R, R]], 0.15),
            steps: [
              `Opposite angles of a cyclic quadrilateral are supplementary (together they stand on the whole circle): ${mang("A")} + ${mang("C")} = 180°.`,
              `(${lin(p, q)}) + (${lin(rr, s)}) = 180, so ${lin(k, qs)} = 180 and ${kv(k)} = 180 − ${np(qs)} = ${n(rhs)}.`,
              `${x} = ${M.frac(n(rhs), n(k))} = ${n(X)}, so ${mang("C")} = ${ev(rr, X, s)} = ${dg(C)}. (Check: ${mang("A")} = ${dg(A)}, and ${n(A)} + ${n(C)} = 180.)`,
            ],
            answer: { kind: "number", value: C }, answerText: dg(C), answerInput: String(C),
            vals: { k, qs, rhs, X, A, C }, params: { p, q, r: rr, s, kind: "cyclic" }, consts: [180],
          };
        }
      },
    },

    // ---- G.19 Equation of a circle ---------------------------------------------------------------------------
    "G.circle-eq": {
      title: "Center, radius and tangents from a circle's equation",
      generate(r, level) {
        const Pt = (a, b) => `(${n(a)}, ${n(b)})`;
        /** (x − h)² with the sign written correctly; x² when h = 0. */
        const shift = (v, h) => (h === 0 ? sq(v) : sq(`(${v} ${h > 0 ? "−" : "+"} ${n(Math.abs(h))})`));
        const stdForm = (h, k, R2) => `${shift(x, h)} + ${shift(y, k)} = ${n(R2)}`;
        const general = (D, E, F) => `${sq(x)} + ${sq(y)}${M.term(D, x)}${M.term(E, y)}${M.term(F, "")} = 0`;
        const read1 = (v, h, name) => (h === 0 ? `${sq(v)} = ${sq(`(${v} − 0)`)}, so ${V(name)} = 0`
          : h > 0 ? `(${v} − ${n(h)}) gives ${V(name)} = ${n(h)}` : `(${v} + ${n(-h)}) = (${v} − ${np(h)}), so ${V(name)} = ${n(h)}`);
        const readHK = (h, k) => `${read1(x, h, "h")}; ${read1(y, k, "k")}`;
        if (level === 1) {
          const h = r.int(-6, 6), k = r.int(-6, 6), R = r.int(1, 9), R2 = R * R;
          return {
            prompt: `Find the center (${V("h")}, ${V("k")}) and radius ${V("r")} of the circle ${M.eq(stdForm(h, k, R2))} Enter ${V("h")}, ${V("k")}, ${V("r")}.`,
            steps: [
              `Compare with the standard form ${sq(`(${x} − ${V("h")})`)} + ${sq(`(${y} − ${V("k")})`)} = ${sq(V("r"))}: the center is (${V("h")}, ${V("k")}).`,
              `${readHK(h, k)}.`,
              `${sq(V("r"))} = ${n(R2)}, so ${V("r")} = ${M.sqrt(n(R2))} = ${n(R)}. Center ${Pt(h, k)}, radius ${n(R)}.`,
            ],
            answer: { kind: "numbers", values: [h, k, R], ordered: true }, answerText: `center ${Pt(h, k)}, radius ${n(R)}`, answerInput: `${h}, ${k}, ${R}`,
            vals: { h, k, R }, params: { h, k, R2 },
          };
        }
        if (level === 2) {
          for (;;) {
            const h = r.int(-6, 6), k = r.int(-6, 6), R = r.int(1, 9), R2 = R * R;
            if (h === 0 || k === 0) continue;
            const D = -2 * h, E = -2 * k, F = h * h + k * k - R2;
            return {
              prompt: `Find the center (${V("h")}, ${V("k")}) and radius ${V("r")} of the circle ${M.eq(general(D, E, F))} Enter ${V("h")}, ${V("k")}, ${V("r")}.`,
              graph: plane([{ t: "circle", c: [h, k], r: R, role: "primary" }], 16),
              steps: [
                `Group the ${x}-terms and the ${y}-terms and move the constant: (${sq(x)}${M.term(D, x)}) + (${sq(y)}${M.term(E, y)}) = ${n(-F)}.`,
                `Complete each square: add ${sq(`(${M.frac(n(D), "2")})`)} = ${n(h * h)} and ${sq(`(${M.frac(n(E), "2")})`)} = ${n(k * k)} to both sides.`,
                `${shift(x, h)} + ${shift(y, k)} = ${n(-F)} + ${n(h * h)} + ${n(k * k)} = ${n(R2)}.`,
                `Center ${Pt(h, k)}; radius ${M.sqrt(n(R2))} = ${n(R)}.`,
              ],
              answer: { kind: "numbers", values: [h, k, R], ordered: true }, answerText: `center ${Pt(h, k)}, radius ${n(R)}`, answerInput: `${h}, ${k}, ${R}`,
              vals: { hh: h * h, kk: k * k, negF: -F, R2, h, k, R }, params: { D, E, F },
            };
          }
        }
        const VEC = { 5: [[3, 4], [4, 3]], 10: [[6, 8], [8, 6]], 13: [[5, 12], [12, 5]] };
        if (r.chance(0.5)) {
          for (;;) {
            const R = r.pick([5, 10, 13]), [vx0, vy0] = r.pick(VEC[R]), vx = vx0 * r.sign(), vy = vy0 * r.sign(), h = r.int(-3, 3), k = r.int(-3, 3);
            const x0 = h + vx, y0 = k + vy;
            if (Math.abs(x0) > 14 || Math.abs(y0) > 14) continue;
            const mr = new Frac(vy, vx), m = new Frac(-vx, vy), b = new Frac(y0).sub(m.mul(x0));
            return {
              prompt: `Find the equation of the line tangent to the circle ${M.eq(stdForm(h, k, R * R))} at the point ${V("P")}${Pt(x0, y0)}. Write it in slope–intercept form.`,
              graph: plane([{ t: "circle", c: [h, k], r: R, role: "primary" }, { t: "pt", x: h, y: k, label: "C" }, { t: "pt", x: x0, y: y0, label: "P" }, { t: "seg", a: [h, k], b: [x0, y0], role: "muted", dash: true }], 16),
              steps: [
                `The center is ${Pt(h, k)}. Slope of the radius to ${V("P")}: ${M.frac(`${n(y0)} − ${np(k)}`, `${n(x0)} − ${np(h)}`)} = ${fracEq(vy, vx)}.`,
                `A tangent is perpendicular to the radius at the point of contact, so its slope is the negative reciprocal: ${V("m")} = ${M.f(m)}.`,
                `Through ${V("P")}: ${y} − ${np(y0)} = ${M.f(m, { paren: true })}(${x} − ${np(x0)}), so ${V("b")} = ${n(y0)} − ${M.f(m, { paren: true })} · ${np(x0)} = ${n(y0)} − ${M.f(m.mul(x0), { paren: true })} = ${M.f(b)}.`,
                `${y} = ${M.poly([m, b])}.`,
              ],
              answer: { kind: "expr", expr: `${typed(m)}*x + (${typed(b)})`, vars: ["x"] }, answerText: `${y} = ${M.poly([m, b])}`, answerInput: `y = ${typed(m)}x + (${typed(b)})`,
              vals: { vx, vy, mr: fracVal(mr), m: fracVal(m), mx0: fracVal(m.mul(x0)), b: fracVal(b) }, params: { h, k, R2: R * R, x0, y0 },
            };
          }
        }
        for (;;) {
          const h = r.int(-5, 5), k = r.int(-5, 5), R = r.pick([5, 10, 13]), R2 = R * R;
          if (h === 0 || k === 0) continue;
          const D = -2 * h, E = -2 * k, F = h * h + k * k - R2, where = r.int(0, 2);
          let dx, dy;
          if (where === 1) [dx, dy] = r.pick(VEC[R]).map((t) => t * r.sign());
          else { dx = r.int(-R - 3, R + 3); dy = r.int(-R - 3, R + 3); const d2 = dx * dx + dy * dy; if ((where === 0) !== (d2 < R2) || d2 === R2) continue; }
          const x0 = h + dx, y0 = k + dy, d2 = dx * dx + dy * dy, opts = ["Inside", "On", "Outside"];
          const cmp = d2 < R2 ? "&lt;" : d2 === R2 ? "=" : "&gt;";
          return {
            prompt: `Is the point ${Pt(x0, y0)} inside, on or outside the circle below? ${M.eq(general(D, E, F))}`,
            steps: [
              `Complete the squares: add ${n(h * h)} and ${n(k * k)} to both sides of (${sq(x)}${M.term(D, x)}) + (${sq(y)}${M.term(E, y)}) = ${n(-F)}: ${stdForm(h, k, R2)}. Center ${Pt(h, k)}, ${sq(V("r"))} = ${n(R2)}.`,
              `Squared distance from the center: ${sq(`(${n(x0)} − ${np(h)})`)} + ${sq(`(${n(y0)} − ${np(k)})`)} = ${sq(np(dx))} + ${sq(np(dy))} = ${n(dx * dx)} + ${n(dy * dy)} = ${n(d2)}.`,
              `${n(d2)} ${cmp} ${n(R2)}, so the point is ${opts[where].toLowerCase()} the circle.`,
            ],
            answer: { kind: "choice", options: opts, index: where }, answerText: opts[where],
            vals: { h, k, hh: h * h, kk: k * k, negF: -F, R2, dx, dy, dxx: dx * dx, dyy: dy * dy, d2, where }, params: { D, E, F, x0, y0 },
          };
        }
      },
    },

    // ---- G.20 Coordinate geometry proofs ---------------------------------------------------------------------
    "G.coord-proofs": {
      title: "Proving properties with coordinates",
      generate(r, level) {
        const Pt = (a, b) => `(${n(a)}, ${n(b)})`;
        const slopeTxt = (P1, P2) => `${M.frac(`${n(P2[1])} − ${np(P1[1])}`, `${n(P2[0])} − ${np(P1[0])}`)} = ${fracEq(P2[1] - P1[1], P2[0] - P1[0])}`;
        const inView = (pts, L = 9) => pts.every((p) => Math.abs(p[0]) <= L && Math.abs(p[1]) <= L);
        if (level === 1) {
          const opts = ["Parallel", "Perpendicular", "Neither"];
          for (;;) {
            const dx = r.nonzero(-4, 4), dy = r.nonzero(-4, 4), kind = r.int(0, 2);
            let ex, ey;
            if (kind === 0) { const t = r.pick([1, 2, -1]); ex = t * dx; ey = t * dy; }
            else if (kind === 1) { const t = r.pick([1, -1, 2]); ex = -t * dy; ey = t * dx; }
            else { ex = r.nonzero(-4, 4); ey = r.nonzero(-4, 4); if (ex * dy === ey * dx || ex * dx + ey * dy === 0) continue; }
            const A = [r.int(-8, 8), r.int(-8, 8)], B = [A[0] + dx, A[1] + dy], C = [r.int(-8, 8), r.int(-8, 8)], D = [C[0] + ex, C[1] + ey];
            if (!inView([A, B, C, D]) || ex === 0 || ey === 0) continue;
            const m1 = new Frac(dy, dx), m2 = new Frac(ey, ex), prod = m1.mul(m2);
            if (kind === 0 && new Frac(A[1]).sub(m1.mul(A[0])).eq(new Frac(C[1]).sub(m1.mul(C[0])))) continue;   // not the same line
            return {
              prompt: `Are ${seg("AB")} and ${seg("CD")} parallel, perpendicular or neither, where ${V("A")}${Pt(...A)}, ${V("B")}${Pt(...B)}, ${V("C")}${Pt(...C)} and ${V("D")}${Pt(...D)}?`,
              graph: plane([{ t: "seg", a: A, b: B, role: "primary" }, { t: "seg", a: C, b: D, role: "secondary" }, { t: "pt", x: A[0], y: A[1], label: "A" }, { t: "pt", x: B[0], y: B[1], label: "B" }, { t: "pt", x: C[0], y: C[1], label: "C" }, { t: "pt", x: D[0], y: D[1], label: "D" }]),
              steps: [
                `Slope of ${seg("AB")}: ${slopeTxt(A, B)}.`,
                `Slope of ${seg("CD")}: ${slopeTxt(C, D)}.`,
                kind === 0 ? `The slopes are equal (and the segments are not on one line), so they are parallel.`
                  : kind === 1 ? `The product of the slopes is ${M.f(m1, { paren: true })} · ${M.f(m2, { paren: true })} = ${M.f(prod)}: they are negative reciprocals, so the segments are perpendicular.`
                    : `The slopes are not equal, and their product is ${M.f(m1, { paren: true })} · ${M.f(m2, { paren: true })} = ${M.f(prod)}, not −1: neither parallel nor perpendicular.`,
              ],
              answer: { kind: "choice", options: opts, index: kind }, answerText: opts[kind],
              vals: { dx, dy, ex, ey, m1: fracVal(m1), m2: fracVal(m2), prod: fracVal(prod), kind }, params: { A, B, C, D },
            };
          }
        }
        if (level === 2) {
          const opts = ["Parallelogram only", "Rectangle (not a square)", "Rhombus (not a square)", "Square"];
          const L5 = [[5, 0], [0, 5], [3, 4], [4, 3], [-3, 4], [-4, 3], [3, -4], [4, -3]];
          for (;;) {
            const kind = r.int(0, 3);
            let u, v;
            if (kind === 3) { u = [r.nonzero(-3, 3), r.int(-3, 3)]; v = [-u[1], u[0]]; }
            else if (kind === 1) { u = [r.nonzero(-3, 3), r.int(-2, 2)]; const t = r.pick([2, 3]); v = [-t * u[1], t * u[0]]; }
            else if (kind === 2) { [u, v] = r.sample(L5, 2); }
            else { u = [r.int(-4, 4), r.int(-4, 4)]; v = [r.int(-4, 4), r.int(-4, 4)]; }
            const dot = u[0] * v[0] + u[1] * v[1], cross = u[0] * v[1] - u[1] * v[0], uu = u[0] ** 2 + u[1] ** 2, vv = v[0] ** 2 + v[1] ** 2;
            if (cross === 0) continue;
            if (kind === 0 && (dot === 0 || uu === vv)) continue;
            if (kind === 2 && dot === 0) continue;
            const A = [r.int(-6, 6), r.int(-6, 6)], B = add(A, u), C = add(B, v), D = add(A, v);
            if (!inView([A, B, C, D])) continue;
            const mAC = [new Frac(A[0] + C[0], 2), new Frac(A[1] + C[1], 2)], mBD = [new Frac(B[0] + D[0], 2), new Frac(B[1] + D[1], 2)];
            const ac = [C[0] - A[0], C[1] - A[1]], bd = [D[0] - B[0], D[1] - B[1]];
            const AC2 = ac[0] ** 2 + ac[1] ** 2, BD2 = bd[0] ** 2 + bd[1] ** 2, dd = ac[0] * bd[0] + ac[1] * bd[1];
            const eqd = AC2 === BD2, perp = dd === 0, idx = eqd ? (perp ? 3 : 1) : perp ? 2 : 0;
            if (idx !== kind) continue;
            const Mp = (m) => `(${M.f(m[0])}, ${M.f(m[1])})`;
            return {
              prompt: `Classify quadrilateral ${V("ABCD")} with ${V("A")}${Pt(...A)}, ${V("B")}${Pt(...B)}, ${V("C")}${Pt(...C)} and ${V("D")}${Pt(...D)} as precisely as possible.`,
              graph: plane([{ t: "poly", p: [A, B, C, D], role: "primary" }, ...[A, B, C, D].map((p, i) => ({ t: "pt", x: p[0], y: p[1], label: "ABCD"[i] }))]),
              steps: [
                `Midpoints of the diagonals: ${M.sub(V("M"), V("AC"))} = ${Mp(mAC)} and ${M.sub(V("M"), V("BD"))} = ${Mp(mBD)}. They coincide, so the diagonals bisect each other: ${V("ABCD")} is a parallelogram.`,
                `Diagonal lengths squared: ${sq(seg("AC"))} = ${sq(np(ac[0]))} + ${sq(np(ac[1]))} = ${n(AC2)} and ${sq(seg("BD"))} = ${sq(np(bd[0]))} + ${sq(np(bd[1]))} = ${n(BD2)}. ${eqd ? "Equal diagonals: a rectangle." : "Unequal diagonals: not a rectangle."}`,
                `Right-angle (dot product) test on the diagonal directions (${n(ac[0])}, ${n(ac[1])}) and (${n(bd[0])}, ${n(bd[1])}): ${n(ac[0])} · ${np(bd[0])} + ${np(ac[1])} · ${np(bd[1])} = ${n(dd)}. ${perp ? "Zero, so the diagonals are perpendicular: a rhombus." : "Not zero, so the diagonals are not perpendicular: not a rhombus."}`,
                `So ${V("ABCD")} is ${["a parallelogram, but not a rectangle or a rhombus", "a rectangle but not a square", "a rhombus but not a square", "both a rectangle and a rhombus: a square"][idx]}.`,
              ],
              answer: { kind: "choice", options: opts, index: idx }, answerText: opts[idx],
              vals: { mACx: fracVal(mAC[0]), mACy: fracVal(mAC[1]), acx: ac[0], acy: ac[1], bdx: bd[0], bdy: bd[1], AC2, BD2, dd, idx }, params: { A, B, C, D },
            };
          }
        }
        if (r.chance(0.5)) {
          for (;;) {
            const A = [r.int(-5, 5), r.int(-5, 5)], bx = r.nonzero(-5, 5), by = r.nonzero(-5, 5), B = [A[0] + bx, A[1] + by], c0 = r.int(-8, 8), cy = c0 - A[1];
            if (cy === 0) continue;
            const num = -by * cy;
            if (num % bx) continue;
            const cx = num / bx, k = A[0] + cx;
            if (!inView([A, B, [k, c0]]) || cx === 0) continue;
            return {
              prompt: `Find ${V("k")} so that ${tri("ABC")} with ${V("A")}${Pt(...A)}, ${V("B")}${Pt(...B)} and ${V("C")}(${V("k")}, ${n(c0)}) has a right angle at ${V("A")}.`,
              graph: plane([{ t: "seg", a: A, b: B, role: "primary" }, { t: "pt", x: A[0], y: A[1], label: "A" }, { t: "pt", x: B[0], y: B[1], label: "B" }, { t: "hline", y: c0, dash: true, role: "muted" }]),
              steps: [
                `A right angle at ${V("A")} means the sides from ${V("A")} are perpendicular: the dot product of their directions is 0, (${M.sub(x, 2)} − ${M.sub(x, 1)})(${M.sub(x, 3)} − ${M.sub(x, 1)}) + (${M.sub(y, 2)} − ${M.sub(y, 1)})(${M.sub(y, 3)} − ${M.sub(y, 1)}) = 0.`,
                `Directions: ${V("AB")} = (${n(B[0])} − ${np(A[0])}, ${n(B[1])} − ${np(A[1])}) = (${n(bx)}, ${n(by)}) and ${V("AC")} = (${V("k")} − ${np(A[0])}, ${n(c0)} − ${np(A[1])}) = (${V("k")} − ${np(A[0])}, ${n(cy)}).`,
                `${n(bx)}(${V("k")} − ${np(A[0])}) + ${np(by)} · ${np(cy)} = 0, so ${n(bx)}(${V("k")} − ${np(A[0])}) = ${n(num)} and ${V("k")} − ${np(A[0])} = ${M.frac(n(num), n(bx))} = ${n(cx)}.`,
                `${V("k")} = ${n(A[0])} + ${np(cx)} = ${n(k)}.`,
              ],
              answer: { kind: "number", value: k }, answerText: `${V("k")} = ${n(k)}`, answerInput: String(k),
              vals: { bx, by, cy, num, cx, k }, params: { A, B, c0 },
            };
          }
        }
        for (;;) {
          const A = [r.int(-7, 7), r.int(-7, 7)], B = [r.int(-7, 7), r.int(-7, 7)], C = [r.int(-7, 7), r.int(-7, 7)];
          const cross = (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0]);
          if (Math.abs(cross) < 10) continue;
          const D = [A[0] + C[0] - B[0], A[1] + C[1] - B[1]];
          if (!inView([D])) continue;
          const sx = A[0] + C[0], sy = A[1] + C[1], mx = new Frac(sx, 2), my = new Frac(sy, 2);
          return {
            prompt: `${V("ABCD")} is a parallelogram with ${V("A")}${Pt(...A)}, ${V("B")}${Pt(...B)} and ${V("C")}${Pt(...C)}. Find ${V("D")}.`,
            graph: plane([{ t: "seg", a: A, b: B, role: "primary" }, { t: "seg", a: B, b: C, role: "primary" }, ...[A, B, C].map((p, i) => ({ t: "pt", x: p[0], y: p[1], label: "ABC"[i] }))]),
            steps: [
              `The diagonals of a parallelogram bisect each other, so ${seg("AC")} and ${seg("BD")} share a midpoint.`,
              `Midpoint of ${seg("AC")}: (${M.frac(`${n(A[0])} + ${np(C[0])}`, "2")}, ${M.frac(`${n(A[1])} + ${np(C[1])}`, "2")}) = (${M.f(mx)}, ${M.f(my)}).`,
              `${V("B")} + ${V("D")} must equal ${V("A")} + ${V("C")} = (${n(sx)}, ${n(sy)}): ${V("D")} = (${n(sx)} − ${np(B[0])}, ${n(sy)} − ${np(B[1])}) = ${Pt(...D)}.`,
            ],
            answer: { kind: "point", value: D }, answerText: Pt(...D), answerInput: `(${D[0]}, ${D[1]})`,
            vals: { sx, sy, mx: fracVal(mx), my: fracVal(my), dx: D[0], dy: D[1] }, params: { A, B, C },
          };
        }
      },
    },

    // ---- G.21 Prisms & cylinders ---------------------------------------------------------------------------
    "G.11": {
      title: "Volume of prisms and cylinders",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.3)) {
            const s = r.int(2, 12), Vv = s * s * s;
            return {
              prompt: `A cube has edges of ${n(s)} cm. Find its volume in cm³.`,
              graph: boxFig(s, s, s, [`${s} cm`, `${s} cm`, `${s} cm`]),
              steps: [`A cube is a box with all edges equal: ${V("V")} = ${M.sup(V("s"), 3)}.`, `${M.sup(n(s), 3)} = ${n(s)} · ${n(s)} · ${n(s)} = ${n(Vv)} cm³.`],
              answer: { kind: "number", value: Vv }, answerText: `${n(Vv)} cm³`, answerInput: String(Vv),
              vals: { Vv }, params: { s, cube: 1 }, consts: [3],
            };
          }
          const l = r.int(2, 15), w = r.int(2, 12), h = r.int(2, 12), Vv = l * w * h;
          return {
            prompt: `A box (rectangular prism) is ${n(l)} cm long, ${n(w)} cm wide and ${n(h)} cm tall. Find its volume in cm³.`,
            graph: boxFig(l, w, h, [`${l} cm`, `${w} cm`, `${h} cm`]),
            steps: [`Prism volume: base area times height, and the base is a ${n(l)} by ${n(w)} rectangle: ${V("V")} = ${V("l")}${V("w")}${V("h")}.`, `${n(l)} · ${n(w)} · ${n(h)} = ${n(l * w)} · ${n(h)} = ${n(Vv)} cm³.`],
            answer: { kind: "number", value: Vv }, answerText: `${n(Vv)} cm³`, answerInput: String(Vv),
            vals: { lw: l * w, Vv }, params: { l, w, h, cube: 0 },
          };
        }
        if (level === 2) {
          if (r.chance(0.5)) {
            const rad = r.int(2, 10), h = r.int(2, 15), useD = r.chance(0.4), B = rad * rad, Vv = B * h;
            return {
              prompt: `A cylinder has ${useD ? `diameter ${n(2 * rad)}` : `radius ${n(rad)}`} cm and height ${n(h)} cm. Find its exact volume in cm³.`,
              graph: cylFig(rad, h, useD ? `d = ${2 * rad} cm` : `${rad} cm`, `${h} cm`, useD),
              steps: [
                ...(useD ? [`Radius: ${n(2 * rad)} ÷ 2 = ${n(rad)} cm.`] : []),
                `The base is a circle: ${V("B")} = π${sq(V("r"))} = π · ${sq(n(rad))} = ${n(B)}π cm².`,
                `${V("V")} = ${V("B")}${V("h")} = ${n(B)}π · ${n(h)} = ${n(Vv)}π cm³.`,
              ],
              answer: { kind: "number", value: Vv * Math.PI }, answerText: `${n(Vv)}π cm³`, answerInput: `${Vv}pi`,
              vals: { rad, B, Vv }, params: useD ? { d: 2 * rad, h, kind: "cyl" } : { rad, h, kind: "cyl" },
            };
          }
          for (;;) {
            const a = r.int(2, 12), b = r.int(2, 12), L = r.int(3, 20);
            if ((a * b) % 2) continue;
            const B = (a * b) / 2, Vv = B * L, Vs = [[0, 0], [a, 0], [0, b]];
            return {
              prompt: `A prism ${n(L)} m long has a right-triangle cross-section with legs ${n(a)} m and ${n(b)} m (like a ramp or a tent). Find its volume in m³.`,
              graph: fig([...polyItems(Vs, { sides: [`${a} m`, "", `${b} m`], right: [0] }), ...Vs.map((p) => ({ t: "seg", a: p, b: add(p, [0.5 * L, 0.3 * L]), role: "muted" })), { t: "poly", p: Vs.map((p) => add(p, [0.5 * L, 0.3 * L])), role: "muted" },
                txt(add(mid(Vs[1], add(Vs[1], [0.5 * L, 0.3 * L])), [0.5, -0.4]), `${L} m`)], [...Vs, ...Vs.map((p) => add(p, [0.5 * L, 0.3 * L]))]),
              steps: [`Prism volume: ${V("V")} = ${V("B")}${V("h")}, with ${V("B")} the area of the cross-section and ${V("h")} the length between the two triangular ends.`,
                `${V("B")} = ${M.frac("1", "2")} · ${n(a)} · ${n(b)} = ${n(B)} m².`, `${V("V")} = ${n(B)} · ${n(L)} = ${n(Vv)} m³.`],
              answer: { kind: "number", value: Vv }, answerText: `${n(Vv)} m³`, answerInput: String(Vv),
              vals: { B, Vv }, params: { a, b, L, kind: "tri" },
            };
          }
        }
        if (r.chance(0.5)) {
          for (;;) {
            const l = 10 * r.int(4, 12), w = 10 * r.int(2, 5), h = 10 * r.int(2, 6), cm3 = l * w * h, Lt = cm3 / 1000;
            const q = r.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20]);
            if (Lt % q) continue;
            const t = Lt / q;
            return {
              prompt: `An aquarium is ${n(l)} cm long, ${n(w)} cm wide and ${n(h)} cm tall. A hose fills it at ${n(q)} liters per minute. How many minutes does it take to fill? (1 liter = 1000 cm³.)`,
              graph: boxFig(l, w, h, [`${l} cm`, `${w} cm`, `${h} cm`]),
              steps: [`Volume: ${n(l)} · ${n(w)} · ${n(h)} = ${n(cm3)} cm³.`, `In liters: ${n(cm3)} ÷ 1000 = ${n(Lt)} L.`, `Time: ${n(Lt)} ÷ ${n(q)} = ${n(t)} minutes.`],
              answer: { kind: "number", value: t }, answerText: `${n(t)} minutes`, answerInput: String(t),
              vals: { cm3, Lt, t }, params: { l, w, h, q, kind: "tank" }, consts: [1000],
            };
          }
        }
        const [a, b, c, d] = r.pick([[1, 2, 2, 3], [2, 3, 6, 7], [1, 4, 8, 9], [4, 4, 7, 9], [2, 6, 9, 11], [6, 6, 7, 11], [3, 4, 12, 13], [2, 10, 11, 15], [2, 5, 14, 15], [4, 8, 8, 12], [4, 12, 18, 22]]);
        const k = r.int(1, 3), [l, w, h] = r.shuffle([a * k, b * k, c * k]), D = d * k, base2 = l * l + w * w;
        return {
          prompt: `A storage box is ${n(l)} dm long, ${n(w)} dm wide and ${n(h)} dm tall. What is the longest straight rod that fits inside, corner to opposite corner, in dm?`,
          graph: boxFig(l, w, h, [`${l} dm`, `${w} dm`, `${h} dm`], true),
          steps: [
            `First the diagonal of the floor: ${sq(n(l))} + ${sq(n(w))} = ${n(l * l)} + ${n(w * w)} = ${n(base2)}, so it is ${M.sqrt(n(base2))}.`,
            `That floor diagonal and the height are the legs of a second right triangle whose hypotenuse is the space diagonal: ${sq(V("d"))} = ${n(base2)} + ${sq(n(h))} = ${n(base2)} + ${n(h * h)} = ${n(D * D)}.`,
            `${V("d")} = ${M.sqrt(n(D * D))} = ${n(D)} dm. (In one step: ${V("d")} = ${M.sqrt(`${sq(V("l"))} + ${sq(V("w"))} + ${sq(V("h"))}`)}.)`,
          ],
          answer: { kind: "number", value: D }, answerText: `${n(D)} dm`, answerInput: String(D),
          vals: { ll: l * l, ww: w * w, hh: h * h, base2, DD: D * D, D }, params: { l, w, h, kind: "diag" },
        };
      },
    },

    // ---- G.22 Pyramids, cones & spheres -----------------------------------------------------------------------
    "G.12": {
      title: "Volume of pyramids, cones and spheres",
      generate(r, level) {
        const third = M.frac("1", "3"), fourThirds = M.frac("4", "3");
        if (level === 1) {
          const kind = r.pick(["sphereV", "sphereA", "cone"]);
          if (kind === "sphereV") {
            const rad = r.int(2, 9), r3 = rad ** 3, Vq = new Frac(4 * r3, 3);
            return {
              prompt: `Find the exact volume of a sphere of radius ${n(rad)} cm, in cm³.`,
              graph: fig([{ t: "circle", c: [0, 0], r: rad, role: "primary" }, { t: "seg", a: [0, 0], b: [rad, 0], role: "secondary" }, txt([rad / 2, 0.12 * rad], `${rad} cm`), ...arc([0, 0], rad, 180, 360, "muted").map((s) => Object.assign(s, { dash: true }))], [[-rad, -rad], [rad, rad]], 0.12),
              steps: [`${V("V")} = ${fourThirds}π${M.sup(V("r"), 3)}.`, `${M.sup(n(rad), 3)} = ${n(r3)}, so ${V("V")} = ${fourThirds} · ${n(r3)}π = ${M.frac(`${n(4 * r3)}π`, "3")}${Vq.d === 1 ? ` = ${piText(Vq)}` : ""} cm³.`],
              answer: { kind: "number", value: Vq.value * Math.PI }, answerText: `${piText(Vq)} cm³`, answerInput: piIn(Vq),
              vals: { r3, r34: 4 * r3, Vq: fracVal(Vq) }, params: { rad, kind }, consts: [4, 3],
            };
          }
          if (kind === "sphereA") {
            const rad = r.int(2, 12), A = 4 * rad * rad;
            return {
              prompt: `Find the exact surface area of a sphere of radius ${n(rad)} m, in m².`,
              graph: fig([{ t: "circle", c: [0, 0], r: rad, role: "primary" }, { t: "seg", a: [0, 0], b: [rad, 0], role: "secondary" }, txt([rad / 2, 0.12 * rad], `${rad} m`)], [[-rad, -rad], [rad, rad]], 0.12),
              steps: [`${V("S")} = 4π${sq(V("r"))}, four times the area of a great circle.`, `4 · π · ${sq(n(rad))} = 4 · ${n(rad * rad)}π = ${n(A)}π m².`],
              answer: { kind: "number", value: A * Math.PI }, answerText: `${n(A)}π m²`, answerInput: `${A}pi`,
              vals: { rr: rad * rad, A }, params: { rad, kind }, consts: [4],
            };
          }
          const rad = r.int(2, 9), h = 3 * r.int(1, 6), rr = rad * rad, Vv = (rr * h) / 3;
          return {
            prompt: `A cone has base radius ${n(rad)} cm and height ${n(h)} cm. Find its exact volume in cm³.`,
            graph: coneFig(rad, h, `${rad} cm`, `${h} cm`),
            steps: [`A cone holds one third of the cylinder with the same base and height: ${V("V")} = ${third}π${sq(V("r"))}${V("h")}.`, `${third} · π · ${sq(n(rad))} · ${n(h)} = ${third} · ${n(rr * h)}π = ${n(Vv)}π cm³.`],
            answer: { kind: "number", value: Vv * Math.PI }, answerText: `${n(Vv)}π cm³`, answerInput: `${Vv}pi`,
            vals: { rr, rrh: rr * h, Vv }, params: { rad, h, kind }, consts: [3],
          };
        }
        if (level === 2) {
          const kind = r.pick(["coneSlant", "pyramid", "coneSA"]);
          if (kind === "pyramid") {
            const s = r.int(2, 12), h = r.int(2, 15), B = s * s, Vq = new Frac(B * h, 3);
            return {
              prompt: `A pyramid has a square base with ${n(s)} m sides and a height of ${n(h)} m. Find its volume in m³.`,
              graph: pyrFig(s, h, `${s} m`, `${h} m`),
              steps: [`A pyramid holds one third of the prism on the same base: ${V("V")} = ${third}${V("B")}${V("h")}.`, `Base: ${V("B")} = ${sq(n(s))} = ${n(B)} m².`, `${V("V")} = ${third} · ${n(B)} · ${n(h)} = ${fracEq(B * h, 3)} m³.`],
              answer: { kind: "number", value: Vq.value }, answerText: `${M.f(Vq)} m³`, answerInput: typed(Vq),
              vals: { B, Bh: B * h, Vq: fracVal(Vq) }, params: { s, h, kind }, consts: [3],
            };
          }
          const [rad, h, l] = triple(r, 30);
          if (kind === "coneSA") {
            const base = rad * rad, lat = rad * l, S = base + lat;
            return {
              prompt: `A cone has base radius ${n(rad)} cm and slant height ${n(l)} cm. Find its exact total surface area, in cm².`,
              graph: coneFig(rad, h, `${rad} cm`, "", `${l} cm`),
              steps: [`${V("S")} = π${sq(V("r"))} + π${V("r")}ℓ: the base disk plus the curved (lateral) surface.`, `Base: π · ${sq(n(rad))} = ${n(base)}π. Lateral: π · ${n(rad)} · ${n(l)} = ${n(lat)}π.`, `${V("S")} = ${n(base)}π + ${n(lat)}π = ${n(S)}π cm².`],
              answer: { kind: "number", value: S * Math.PI }, answerText: `${n(S)}π cm²`, answerInput: `${S}pi`,
              vals: { base, lat, S }, params: { rad, l, kind },
            };
          }
          const Vq = new Frac(rad * rad * h, 3);
          return {
            prompt: `A cone has base radius ${n(rad)} cm and slant height ${n(l)} cm. Find its exact volume in cm³.`,
            graph: coneFig(rad, h, `${rad} cm`, "?", `${l} cm`),
            steps: [
              `The height, radius and slant height form a right triangle with the slant height as hypotenuse: ${V("h")} = ${M.sqrt(`${sq(n(l))} − ${sq(n(rad))}`)} = ${M.sqrt(`${n(l * l)} − ${n(rad * rad)}`)} = ${M.sqrt(n(h * h))} = ${n(h)} cm.`,
              `${V("V")} = ${third}π${sq(V("r"))}${V("h")} = ${third} · π · ${sq(n(rad))} · ${n(h)} = ${M.frac(`${n(rad * rad * h)}π`, "3")}${Vq.d === 1 ? ` = ${piText(Vq)}` : ""} cm³.`,
            ],
            answer: { kind: "number", value: Vq.value * Math.PI }, answerText: `${piText(Vq)} cm³`, answerInput: piIn(Vq),
            vals: { ll: l * l, rr: rad * rad, hh: h * h, h, rrh: rad * rad * h, Vq: fracVal(Vq) }, params: { rad, l, kind }, consts: [3],
          };
        }
        const kind = r.pick(["frustum", "melt", "icecream"]);
        if (kind === "frustum") {
          for (;;) {
            const rs = r.int(2, 8), Rb = r.int(rs + 1, 12), h = r.int(3, 15), sum = Rb * Rb + Rb * rs + rs * rs, Vq = new Frac(h * sum, 3);
            if (Vq.d !== 1 && r.chance(0.6)) continue;
            const Vs = [[-rs, 0], [rs, 0], [Rb, h], [-Rb, h]];
            return {
              prompt: `A bucket is a frustum (a cone with its tip cut off) with bottom radius ${n(rs)} cm, top radius ${n(Rb)} cm and height ${n(h)} cm. Find its exact volume in cm³ using ${V("V")} = ${third}π${V("h")}(${sq(V("R"))} + ${V("R")}${V("r")} + ${sq(V("r"))}).`,
              graph: fig([...polyItems(Vs, { sides: ["", `${h} cm`] }), { t: "seg", a: [0, h], b: [Rb, h], role: "secondary", dash: true }, txt([Rb / 2, h + 0.08 * h], `${Rb} cm`), { t: "seg", a: [0, 0], b: [rs, 0], role: "secondary", dash: true }, txt([rs / 2, -0.1 * h], `${rs} cm`)], Vs),
              steps: [
                `${sq(V("R"))} + ${V("R")}${V("r")} + ${sq(V("r"))} = ${sq(n(Rb))} + ${n(Rb)} · ${n(rs)} + ${sq(n(rs))} = ${n(Rb * Rb)} + ${n(Rb * rs)} + ${n(rs * rs)} = ${n(sum)}.`,
                `${V("V")} = ${third} · π · ${n(h)} · ${n(sum)} = ${M.frac(`${n(h * sum)}π`, "3")}${Vq.d === 1 ? ` = ${piText(Vq)}` : ""} cm³.`,
              ],
              answer: { kind: "number", value: Vq.value * Math.PI }, answerText: `${piText(Vq)} cm³`, answerInput: piIn(Vq),
              vals: { RR: Rb * Rb, Rr: Rb * rs, rr: rs * rs, sum, hs: h * sum, Vq: fracVal(Vq) }, params: { R: Rb, r: rs, h, kind }, consts: [3],
            };
          }
        }
        if (kind === "melt") {
          for (;;) {
            const a = r.int(2, 9), Rc = r.int(2, 9), a3 = a ** 3, hq = new Frac(4 * a3, 3 * Rc * Rc);
            if (hq.d > 4 || hq.value > 60 || hq.value < 2) continue;
            const sv = new Frac(4 * a3, 3);
            return {
              prompt: `A metal sphere of radius ${n(a)} cm is melted and recast as a solid cylinder of radius ${n(Rc)} cm. How tall is the cylinder, in cm?`,
              steps: [
                `The volume stays the same. Sphere: ${fourThirds}π · ${M.sup(n(a), 3)} = ${fourThirds} · ${n(a3)}π = ${piText(sv)} cm³.`,
                `Cylinder: π · ${sq(n(Rc))} · ${V("h")} = ${n(Rc * Rc)}π${V("h")}.`,
                `${n(Rc * Rc)}π${V("h")} = ${piText(sv)}, so ${V("h")} = ${M.frac(M.f(sv), n(Rc * Rc))} = ${M.f(hq)} cm.`,
              ],
              answer: { kind: "number", value: hq.value }, answerText: `${M.f(hq)} cm`, answerInput: typed(hq),
              vals: { a3, sv: fracVal(sv), RR: Rc * Rc, hq: fracVal(hq) }, params: { a, R: Rc, kind }, consts: [4, 3],
            };
          }
        }
        const rad = r.int(2, 6), h = r.int(6, 15), rr = rad * rad, cone = new Frac(rr * h, 3), hemi = new Frac(2 * rad ** 3, 3), tot = cone.add(hemi);
        return {
          prompt: `An ice cream cone is ${n(h)} cm deep with ${aNum(rad)} ${n(rad)} cm radius, filled and topped with a hemisphere of ice cream of the same radius. Find the exact total volume of ice cream, in cm³.`,
          graph: fig([{ t: "poly", p: [[-rad, 0], [rad, 0], [0, -h]], role: "primary" }, ...arc([0, 0], rad, 0, 180, "secondary"), txt([rad / 2, 0.1 * h], `${rad} cm`), { t: "seg", a: [0, 0], b: [rad, 0], role: "muted", dash: true },
            { t: "seg", a: [0, 0], b: [0, -h], role: "muted", dash: true }, txt([0.15 * h, -h / 2], `${h} cm`)], [[-rad, -h], [rad, rad]], 0.15),
          steps: [
            `Cone: ${third}π${sq(V("r"))}${V("h")} = ${third} · π · ${n(rr)} · ${n(h)} = ${piText(cone)}.`,
            `Hemisphere: half a sphere, ${M.frac("2", "3")}π${M.sup(V("r"), 3)} = ${M.frac("2", "3")} · π · ${n(rad ** 3)} = ${piText(hemi)}.`,
            `Total: ${piText(cone)} + ${piText(hemi)} = ${piText(tot)} cm³.`,
          ],
          answer: { kind: "number", value: tot.value * Math.PI }, answerText: `${piText(tot)} cm³`, answerInput: piIn(tot),
          vals: { rr, r3: rad ** 3, cone: fracVal(cone), hemi: fracVal(hemi), tot: fracVal(tot) }, params: { rad, h, kind }, consts: [3],
        };
      },
    },

    // ---- G.23 Surface area of solids ---------------------------------------------------------------------------
    "G.surface-area": {
      title: "Surface area of solids",
      generate(r, level) {
        if (level === 1) {
          if (r.chance(0.3)) {
            const s = r.int(2, 12), f = s * s, S = 6 * f;
            return {
              prompt: `A cube has edges of ${n(s)} cm. Find its surface area in cm².`,
              graph: boxFig(s, s, s, [`${s} cm`, `${s} cm`, `${s} cm`]),
              steps: [`A cube has 6 square faces, each ${n(s)} by ${n(s)}.`, `One face: ${sq(n(s))} = ${n(f)} cm². All six: 6 · ${n(f)} = ${n(S)} cm².`],
              answer: { kind: "number", value: S }, answerText: `${n(S)} cm²`, answerInput: String(S),
              vals: { f, S }, params: { s, cube: 1 }, consts: [6],
            };
          }
          const l = r.int(2, 12), w = r.int(2, 10), h = r.int(2, 10), lw = l * w, lh = l * h, wh = w * h, sum = lw + lh + wh, S = 2 * sum;
          return {
            prompt: `A closed box is ${n(l)} cm long, ${n(w)} cm wide and ${n(h)} cm tall. Find its surface area in cm².`,
            graph: boxFig(l, w, h, [`${l} cm`, `${w} cm`, `${h} cm`]),
            steps: [`The six faces come in three equal pairs: top and bottom (${n(l)} by ${n(w)}), front and back (${n(l)} by ${n(h)}), and the two ends (${n(w)} by ${n(h)}).`,
              `One of each: ${n(l)} · ${n(w)} + ${n(l)} · ${n(h)} + ${n(w)} · ${n(h)} = ${n(lw)} + ${n(lh)} + ${n(wh)} = ${n(sum)} cm².`, `Both of each: 2 · ${n(sum)} = ${n(S)} cm².`],
            answer: { kind: "number", value: S }, answerText: `${n(S)} cm²`, answerInput: String(S),
            vals: { lw, lh, wh, sum, S }, params: { l, w, h, cube: 0 },
          };
        }
        if (level === 2) {
          const kind = r.pick(["cyl", "coneL", "hemi", "euler"]);
          if (kind === "cyl") {
            const rad = r.int(2, 9), h = r.int(2, 15), disks = 2 * rad * rad, side = 2 * rad * h, S = disks + side;
            return {
              prompt: `A closed cylinder has radius ${n(rad)} cm and height ${n(h)} cm. Find its exact total surface area in cm².`,
              graph: cylFig(rad, h, `${rad} cm`, `${h} cm`),
              steps: [`Unroll it: two disks plus a rectangle (the label) that is 2π${V("r")} long and ${V("h")} tall.`, `Disks: 2 · π · ${sq(n(rad))} = ${n(disks)}π. Label: 2 · π · ${n(rad)} · ${n(h)} = ${n(side)}π.`, `${n(disks)}π + ${n(side)}π = ${n(S)}π cm².`],
              answer: { kind: "number", value: S * Math.PI }, answerText: `${n(S)}π cm²`, answerInput: `${S}pi`,
              vals: { disks, side, S }, params: { rad, h, kind },
            };
          }
          if (kind === "coneL") {
            const rad = r.int(2, 10), l = r.int(rad + 1, 20), L = rad * l;
            return {
              prompt: `A paper party hat is a cone with no base, of radius ${n(rad)} cm and slant height ${n(l)} cm. Find the exact area of paper it uses, in cm².`,
              graph: coneFig(rad, Math.sqrt(l * l - rad * rad), `${rad} cm`, "", `${l} cm`),
              steps: [`The hat is only the lateral surface: ${V("L")} = π${V("r")}ℓ (it unrolls into a sector of radius ℓ).`, `π · ${n(rad)} · ${n(l)} = ${n(L)}π cm².`],
              answer: { kind: "number", value: L * Math.PI }, answerText: `${n(L)}π cm²`, answerInput: `${L}pi`,
              vals: { L }, params: { rad, l, kind },
            };
          }
          if (kind === "hemi") {
            const rad = r.int(2, 12), rr = rad * rad, curved = 2 * rr, S = 3 * rr;
            return {
              prompt: `A solid hemisphere (half a ball, with its flat face) has radius ${n(rad)} cm. Find its exact total surface area in cm².`,
              graph: fig([...arc([0, 0], rad, 0, 180, "primary"), { t: "seg", a: [-rad, 0], b: [rad, 0], role: "primary" }, { t: "seg", a: [0, 0], b: [rad, 0], role: "secondary", dash: true }, txt([rad / 2, -0.12 * rad], `${rad} cm`)], [[-rad, -0.3 * rad], [rad, rad]], 0.12),
              steps: [`Curved part: half of a sphere's 4π${sq(V("r"))}, so 2π${sq(V("r"))} = 2 · ${n(rr)}π = ${n(curved)}π.`, `Flat face: a disk, π${sq(V("r"))} = ${n(rr)}π.`, `Total: ${n(curved)}π + ${n(rr)}π = ${n(S)}π cm² (that is, 3π${sq(V("r"))}).`],
              answer: { kind: "number", value: S * Math.PI }, answerText: `${n(S)}π cm²`, answerInput: `${S}pi`,
              vals: { rr, curved, S }, params: { rad, kind }, consts: [4, 3],
            };
          }
          const k = r.int(3, 12), prism = r.chance(0.5);
          const Vn = prism ? 2 * k : k + 1, E = prism ? 3 * k : 2 * k, F = prism ? k + 2 : k + 1;
          const ask = r.pick(["E", "V", "F"]);
          const solid = `${prism ? "prism" : "pyramid"} whose base has ${n(k)} sides`;
          const known = { V: [`${n(Vn)} vertices`], E: [`${n(E)} edges`], F: [`${n(F)} faces`] };
          const givenTxt = ["V", "E", "F"].filter((t) => t !== ask).map((t) => known[t][0]).join(" and ");
          const ans = { V: Vn, E, F }[ask];
          const solve = { E: `${V("E")} = ${V("V")} + ${V("F")} − 2 = ${n(Vn)} + ${n(F)} − 2 = ${n(E)}`, V: `${V("V")} = 2 + ${V("E")} − ${V("F")} = 2 + ${n(E)} − ${n(F)} = ${n(Vn)}`, F: `${V("F")} = 2 + ${V("E")} − ${V("V")} = 2 + ${n(E)} − ${n(Vn)} = ${n(F)}` }[ask];
          const word = { V: "vertices", E: "edges", F: "faces" }[ask];
          return {
            prompt: `A ${solid} has ${givenTxt}. Use Euler's formula to find how many ${word} it has.`,
            steps: [`Euler's formula for a convex polyhedron: ${V("V")} − ${V("E")} + ${V("F")} = 2.`, `${solve}.`],
            answer: { kind: "number", value: ans }, answerText: `${n(ans)} ${word}`, answerInput: String(ans),
            vals: { Vn, E, F }, params: { k, prism: prism ? 1 : 0, ask, kind },
          };
        }
        const kind = r.pick(["pyramid", "openbox", "triprism"]);
        if (kind === "pyramid") {
          const [a, h, l] = triple(r, 30), s = 2 * a, base = s * s, lat = 2 * s * l, S = base + lat;
          return {
            prompt: `A regular square pyramid has base edges of ${n(s)} m and a height of ${n(h)} m. Find its total surface area in m².`,
            graph: pyrFig(s, h, `${s} m`, `${h} m`, true),
            steps: [
              `Each triangular face has a slant height ℓ, from the apex to the middle of a base edge. The height, half the base edge (${n(s)} ÷ 2 = ${n(a)}) and ℓ form a right triangle.`,
              `ℓ = ${M.sqrt(`${sq(n(h))} + ${sq(n(a))}`)} = ${M.sqrt(`${n(h * h)} + ${n(a * a)}`)} = ${M.sqrt(n(l * l))} = ${n(l)} m.`,
              `Four triangles: 4 · ${M.frac("1", "2")} · ${n(s)} · ${n(l)} = ${n(lat)} m². Base: ${sq(n(s))} = ${n(base)} m².`,
              `Total: ${n(base)} + ${n(lat)} = ${n(S)} m².`,
            ],
            answer: { kind: "number", value: S }, answerText: `${n(S)} m²`, answerInput: String(S),
            vals: { a, hh: h * h, aa: a * a, ll: l * l, l, lat, base, S }, params: { s, h, kind }, consts: [4],
          };
        }
        if (kind === "openbox") {
          for (;;) {
            const l = r.int(2, 6), w = r.int(2, 5), h = r.int(1, 4), cov = r.pick([2, 4, 5, 8, 10]);
            const bottom = l * w, long = 2 * l * h, ends = 2 * w * h, S = bottom + long + ends;
            if (S % cov) continue;
            const cans = S / cov;
            return {
              prompt: `A garden planter is an open-top box ${n(l)} m long, ${n(w)} m wide and ${n(h)} m tall. You will paint its outside, including the bottom but not the open top. One liter of paint covers ${n(cov)} m². How many liters do you need?`,
              graph: boxFig(l, w, h, [`${l} m`, `${w} m`, `${h} m`]),
              steps: [
                `Faces present: the bottom, the front and back, and the two ends (no top).`,
                `Bottom: ${n(l)} · ${n(w)} = ${n(bottom)} m². Front and back: 2 · ${n(l)} · ${n(h)} = ${n(long)} m². Ends: 2 · ${n(w)} · ${n(h)} = ${n(ends)} m².`,
                `Area: ${n(bottom)} + ${n(long)} + ${n(ends)} = ${n(S)} m². Paint: ${n(S)} ÷ ${n(cov)} = ${n(cans)} liters.`,
              ],
              answer: { kind: "number", value: cans }, answerText: `${n(cans)} liters`, answerInput: String(cans),
              vals: { bottom, long, ends, S, cans }, params: { l, w, h, cov, kind },
            };
          }
        }
        const [a, b, c] = triple(r, 20), L = r.int(3, 15), ends = a * b, per = a + b + c, lat = per * L, S = ends + lat;
        const Vs = [[0, 0], [a, 0], [0, b]], off = [0.5 * L, 0.3 * L];
        return {
          prompt: `A closed triangular prism is ${n(L)} cm long. Its ends are right triangles with legs ${n(a)} cm and ${n(b)} cm. Find its total surface area in cm².`,
          graph: fig([...polyItems(Vs, { sides: [`${a} cm`, "", `${b} cm`], right: [0] }), ...Vs.map((p) => ({ t: "seg", a: p, b: add(p, off), role: "muted" })), { t: "poly", p: Vs.map((p) => add(p, off)), role: "muted" },
            txt(add(mid(Vs[1], add(Vs[1], off)), [0.5, -0.4]), `${L} cm`)], [...Vs, ...Vs.map((p) => add(p, off))]),
          steps: [
            `The hypotenuse of each end: ${M.sqrt(`${sq(n(a))} + ${sq(n(b))}`)} = ${M.sqrt(n(c * c))} = ${n(c)} cm.`,
            `Two triangular ends: 2 · ${M.frac("1", "2")} · ${n(a)} · ${n(b)} = ${n(ends)} cm².`,
            `Three rectangular sides: (perimeter of the end) · length = (${n(a)} + ${n(b)} + ${n(c)}) · ${n(L)} = ${n(per)} · ${n(L)} = ${n(lat)} cm².`,
            `Total: ${n(ends)} + ${n(lat)} = ${n(S)} cm².`,
          ],
          answer: { kind: "number", value: S }, answerText: `${n(S)} cm²`, answerInput: String(S),
          vals: { cc: c * c, c, ends, per, lat, S }, params: { a, b, L, kind },
        };
      },
    },

    // ---- G.24 Coordinate transformations ------------------------------------------------------------------------
    "G.13": {
      title: "Translations, reflections and dilations",
      generate(r, level) {
        const Pt = (a, b) => `(${n(a)}, ${n(b)})`;
        const lim = 12;
        if (level === 1) {
          const px = r.nonzero(-8, 8), py = r.nonzero(-8, 8), kind = r.pick(["trans", "xaxis", "yaxis"]);
          if (kind === "trans") {
            for (;;) {
              const a = r.nonzero(-6, 6), b = r.nonzero(-6, 6), qx = px + a, qy = py + b;
              if (Math.abs(qx) > 10 || Math.abs(qy) > 10) continue;
              return {
                prompt: `Translate ${V("P")}${Pt(px, py)} by the vector (${n(a)}, ${n(b)}): ${a > 0 ? `${n(a)} right` : `${n(-a)} left`} and ${b > 0 ? `${n(b)} up` : `${n(-b)} down`}. Where does ${V("P")} land?`,
                graph: plane([{ t: "pt", x: px, y: py, label: "P" }, { t: "vec", a: [0, 0], b: [a, b], role: "muted" }], lim),
                steps: [`A translation adds the vector to every point: (${x}, ${y}) ↦ (${x} + ${V("a")}, ${y} + ${V("b")}).`, `(${n(px)} + ${np(a)}, ${n(py)} + ${np(b)}) = ${Pt(qx, qy)}.`],
                answer: { kind: "point", value: [qx, qy] }, answerText: Pt(qx, qy), answerInput: `(${qx}, ${qy})`,
                vals: { qx, qy }, params: { px, py, a, b, kind },
              };
            }
          }
          const xa = kind === "xaxis", qx = xa ? px : -px, qy = xa ? -py : py;
          return {
            prompt: `Reflect ${V("P")}${Pt(px, py)} in the ${xa ? x : y}-axis. Where does it land?`,
            graph: plane([{ t: "pt", x: px, y: py, label: "P" }, xa ? { t: "hline", y: 0, role: "highlight" } : { t: "vline", x: 0, role: "highlight" }], lim),
            steps: [xa ? `Reflecting in the ${x}-axis flips top to bottom: (${x}, ${y}) ↦ (${x}, −${y}).` : `Reflecting in the ${y}-axis flips left to right: (${x}, ${y}) ↦ (−${x}, ${y}).`,
              `${Pt(px, py)} ↦ ${Pt(qx, qy)}.`],
            answer: { kind: "point", value: [qx, qy] }, answerText: Pt(qx, qy), answerInput: `(${qx}, ${qy})`,
            vals: { qx, qy }, params: { px, py, kind },
          };
        }
        if (level === 2) {
          const kind = r.pick(["yx", "ynx", "dil"]);
          if (kind === "dil") {
            for (;;) {
              const k = r.pick([new Frac(2), new Frac(3), new Frac(1, 2), new Frac(3, 2), new Frac(1, 3), new Frac(-2), new Frac(-1, 2)]);
              const px = r.nonzero(-8, 8), py = r.nonzero(-8, 8), qx = k.mul(px), qy = k.mul(py);
              if (!qx.isInt() || !qy.isInt() || Math.abs(qx.n) > 11 || Math.abs(qy.n) > 11) continue;
              return {
                prompt: `Dilate ${V("P")}${Pt(px, py)} from the origin by a scale factor of ${M.f(k)}. Where does it land?`,
                graph: plane([{ t: "pt", x: px, y: py, label: "P" }, { t: "pt", x: 0, y: 0, label: "O" }], lim),
                steps: [`A dilation from the origin multiplies both coordinates by the scale factor: (${x}, ${y}) ↦ (${V("k")}${x}, ${V("k")}${y}).`,
                  `(${M.f(k)} · ${np(px)}, ${M.f(k)} · ${np(py)}) = ${Pt(qx.n, qy.n)}.${k.n < 0 ? " (A negative factor also sends the point through the origin to the other side.)" : ""}`],
                answer: { kind: "point", value: [qx.n, qy.n] }, answerText: Pt(qx.n, qy.n), answerInput: `(${qx.n}, ${qy.n})`,
                vals: { k: fracVal(k), qx: qx.n, qy: qy.n }, params: { px, py, k: fracVal(k), kind },
              };
            }
          }
          const px = r.nonzero(-8, 8), py = r.intExcept(-8, 8, 0, px, -px), yx = kind === "yx", qx = yx ? py : -py, qy = yx ? px : -px;
          return {
            prompt: `Reflect ${V("P")}${Pt(px, py)} in the line ${y} = ${yx ? x : `−${x}`}. Where does it land?`,
            graph: plane([{ t: "pt", x: px, y: py, label: "P" }, { t: "fn", e: yx ? "x" : "-x", role: "highlight" }], lim),
            steps: [yx ? `Reflecting in ${y} = ${x} swaps the coordinates: (${x}, ${y}) ↦ (${y}, ${x}).` : `Reflecting in ${y} = −${x} swaps the coordinates and negates both: (${x}, ${y}) ↦ (−${y}, −${x}).`,
              `${Pt(px, py)} ↦ ${Pt(qx, qy)}.`],
            answer: { kind: "point", value: [qx, qy] }, answerText: Pt(qx, qy), answerInput: `(${qx}, ${qy})`,
            vals: { qx, qy }, params: { px, py, kind },
          };
        }
        if (r.chance(0.5)) {
          for (;;) {
            const k = r.pick([new Frac(2), new Frac(3), new Frac(1, 2), new Frac(3, 2), new Frac(-1)]);
            const cx = r.int(-4, 4), cy = r.int(-4, 4), px = r.int(-8, 8), py = r.int(-8, 8), dx = px - cx, dy = py - cy;
            if (dx === 0 || dy === 0 || (cx === 0 && cy === 0)) continue;
            const kx = k.mul(dx), ky = k.mul(dy);
            if (!kx.isInt() || !ky.isInt()) continue;
            const qx = cx + kx.n, qy = cy + ky.n;
            if (Math.abs(qx) > 11 || Math.abs(qy) > 11) continue;
            return {
              prompt: `Dilate ${V("P")}${Pt(px, py)} by a scale factor of ${M.f(k)} about the center ${V("C")}${Pt(cx, cy)}. Where does it land?`,
              graph: plane([{ t: "pt", x: px, y: py, label: "P" }, { t: "pt", x: cx, y: cy, label: "C" }], lim),
              steps: [
                `Measure from the center: ${V("P")} − ${V("C")} = (${n(px)} − ${np(cx)}, ${n(py)} − ${np(cy)}) = (${n(dx)}, ${n(dy)}).`,
                `Scale that by ${M.f(k)}: (${n(kx.n)}, ${n(ky.n)}).`,
                `Add the center back: (${n(cx)} + ${np(kx.n)}, ${n(cy)} + ${np(ky.n)}) = ${Pt(qx, qy)}.`,
              ],
              answer: { kind: "point", value: [qx, qy] }, answerText: Pt(qx, qy), answerInput: `(${qx}, ${qy})`,
              vals: { dx, dy, kx: kx.n, ky: ky.n, qx, qy }, params: { px, py, cx, cy, k: fracVal(k), kind: "dilc" },
            };
          }
        }
        const th = r.pick([90, 180, 270]), c = { 90: 0, 180: -1, 270: 0 }[th], s = { 90: 1, 180: 0, 270: -1 }[th];
        const px = r.nonzero(-8, 8), py = r.nonzero(-8, 8), qx = c * px - s * py, qy = s * px + c * py;
        return {
          prompt: `Use the rotation matrix to rotate ${V("P")}${Pt(px, py)} by ${dg(th)} counterclockwise about the origin.`,
          graph: plane([{ t: "pt", x: px, y: py, label: "P" }], lim),
          steps: [
            `The rotation matrix by θ gives ${x}′ = ${x} cos θ − ${y} sin θ and ${y}′ = ${x} sin θ + ${y} cos θ.`,
            `cos ${dg(th)} = ${n(c)} and sin ${dg(th)} = ${n(s)}.`,
            `${x}′ = ${np(px)} · ${np(c)} − ${np(py)} · ${np(s)} = ${n(qx)}; ${y}′ = ${np(px)} · ${np(s)} + ${np(py)} · ${np(c)} = ${n(qy)}.`,
            `The image is ${Pt(qx, qy)}.`,
          ],
          answer: { kind: "point", value: [qx, qy] }, answerText: Pt(qx, qy), answerInput: `(${qx}, ${qy})`,
          vals: { c, s, qx, qy }, params: { px, py, th, kind: "mat" },
        };
      },
    },

    // ---- G.25 Rotations, rigid motions & compositions ----------------------------------------------------------------
    "G.rotations": {
      title: "Rotations and compositions of rigid motions",
      generate(r, level) {
        const Pt = (a, b) => `(${n(a)}, ${n(b)})`;
        const lim = 12;
        const ROT = {
          90: { name: "a rotation of 90° counterclockwise about the origin", rule: `(${x}, ${y}) ↦ (−${y}, ${x})`, f: (p) => [-p[1], p[0]] },
          180: { name: "a rotation of 180° about the origin", rule: `(${x}, ${y}) ↦ (−${x}, −${y})`, f: (p) => [-p[0], -p[1]] },
          270: { name: "a rotation of 90° clockwise (270° counterclockwise) about the origin", rule: `(${x}, ${y}) ↦ (${y}, −${x})`, f: (p) => [p[1], -p[0]] },
        };
        if (level === 1) {
          const th = r.pick([90, 180, 270]), px = r.nonzero(-8, 8), py = r.intExcept(-8, 8, 0, px), q = ROT[th].f([px, py]);
          const phr = th === 270 ? "90° clockwise" : th === 90 ? "90° counterclockwise" : "180°";
          return {
            prompt: `Rotate ${V("P")}${Pt(px, py)} ${phr} about the origin. Where does it land?`,
            graph: plane([{ t: "pt", x: px, y: py, label: "P" }, { t: "seg", a: [0, 0], b: [px, py], role: "muted", dash: true }], lim),
            steps: [`The rule for ${ROT[th].name}: ${ROT[th].rule}.`, `${Pt(px, py)} ↦ ${Pt(q[0], q[1])}.`],
            answer: { kind: "point", value: q }, answerText: Pt(...q), answerInput: `(${q[0]}, ${q[1]})`,
            vals: { qx: q[0], qy: q[1] }, params: { px, py, th },
          };
        }
        const MOVES = {
          rx: { name: `a reflection in the ${x}-axis`, rule: `(${x}, ${y}) ↦ (${x}, −${y})`, f: (p) => [p[0], -p[1]] },
          ry: { name: `a reflection in the ${y}-axis`, rule: `(${x}, ${y}) ↦ (−${x}, ${y})`, f: (p) => [-p[0], p[1]] },
          rd: { name: `a reflection in the line ${y} = ${x}`, rule: `(${x}, ${y}) ↦ (${y}, ${x})`, f: (p) => [p[1], p[0]] },
          r90: Object.assign({}, ROT[90]), r180: Object.assign({}, ROT[180]), r270: Object.assign({}, ROT[270]),
        };
        if (level === 2) {
          for (;;) {
            const [m1, m2] = r.sample(Object.keys(MOVES), 2), px = r.nonzero(-8, 8), py = r.intExcept(-8, 8, 0, px, -px);
            const a = MOVES[m1].f([px, py]), b = MOVES[m2].f(a);
            if (b[0] === px && b[1] === py) continue;
            return {
              prompt: `Apply ${MOVES[m1].name} to ${V("P")}${Pt(px, py)}, then ${MOVES[m2].name}. Where does ${V("P")} end up?`,
              graph: plane([{ t: "pt", x: px, y: py, label: "P" }], lim),
              steps: [`Apply the moves in order, the first one first.`, `First, ${MOVES[m1].name}: ${MOVES[m1].rule}, so ${Pt(px, py)} ↦ ${Pt(...a)}.`, `Then ${MOVES[m2].name}: ${MOVES[m2].rule}, so ${Pt(...a)} ↦ ${Pt(...b)}.`],
              answer: { kind: "point", value: b }, answerText: Pt(...b), answerInput: `(${b[0]}, ${b[1]})`,
              vals: { ax: a[0], ay: a[1], bx: b[0], by: b[1] }, params: { px, py, m1, m2 },
            };
          }
        }
        const kind = r.pick(["about", "parallel", "crossing"]);
        if (kind === "about") {
          for (;;) {
            const th = r.pick([90, 180, 270]), cx = r.nonzero(-4, 4), cy = r.int(-4, 4), px = r.int(-8, 8), py = r.int(-8, 8), dx = px - cx, dy = py - cy;
            if (dx === 0 && dy === 0) continue;
            const t = ROT[th].f([dx, dy]), q = [t[0] + cx, t[1] + cy];
            if (Math.abs(q[0]) > 11 || Math.abs(q[1]) > 11) continue;
            const phr = th === 270 ? "90° clockwise" : th === 90 ? "90° counterclockwise" : "180°";
            return {
              prompt: `Rotate ${V("P")}${Pt(px, py)} ${phr} about the point ${V("C")}${Pt(cx, cy)}. Where does it land?`,
              graph: plane([{ t: "pt", x: px, y: py, label: "P" }, { t: "pt", x: cx, y: cy, label: "C" }, { t: "seg", a: [cx, cy], b: [px, py], role: "muted", dash: true }], lim),
              steps: [
                `Translate so ${V("C")} is at the origin: ${V("P")} − ${V("C")} = (${n(px)} − ${np(cx)}, ${n(py)} − ${np(cy)}) = (${n(dx)}, ${n(dy)}).`,
                `Rotate about the origin with ${ROT[th].rule}: (${n(dx)}, ${n(dy)}) ↦ (${n(t[0])}, ${n(t[1])}).`,
                `Translate back by adding ${V("C")}: (${n(t[0])} + ${np(cx)}, ${n(t[1])} + ${np(cy)}) = ${Pt(...q)}.`,
              ],
              answer: { kind: "point", value: q }, answerText: Pt(...q), answerInput: `(${q[0]}, ${q[1]})`,
              vals: { dx, dy, tx: t[0], ty: t[1], qx: q[0], qy: q[1] }, params: { px, py, cx, cy, th, kind },
            };
          }
        }
        if (kind === "parallel") {
          for (;;) {
            const a = r.int(-5, 5), b = r.intExcept(-5, 5, a), px = r.int(-8, 8), py = r.int(-8, 8);
            const m1 = 2 * a - px, m2 = 2 * b - m1, shift = 2 * (b - a);
            if (Math.abs(m1) > 11 || Math.abs(m2) > 11 || px === a) continue;
            return {
              prompt: `Reflect ${V("P")}${Pt(px, py)} in the line ${x} = ${n(a)}, then reflect the image in the line ${x} = ${n(b)}. Where does ${V("P")} end up, and what single motion does the same thing?`,
              graph: plane([{ t: "pt", x: px, y: py, label: "P" }, { t: "vline", x: a, role: "highlight" }, { t: "vline", x: b, role: "secondary" }], lim),
              steps: [
                `Reflecting in ${x} = ${V("a")} sends ${x} to 2${V("a")} − ${x} and keeps ${y}. First mirror: 2 · ${np(a)} − ${np(px)} = ${n(m1)}, giving (${n(m1)}, ${n(py)}).`,
                `Second mirror: 2 · ${np(b)} − ${np(m1)} = ${n(m2)}, giving ${Pt(m2, py)}.`,
                `Two reflections in parallel mirrors make a translation perpendicular to them by twice the distance between them: 2 · (${n(b)} − ${np(a)}) = ${n(shift)}, and ${n(px)} + ${np(shift)} = ${n(m2)}. It checks.`,
              ],
              answer: { kind: "point", value: [m2, py] }, answerText: Pt(m2, py), answerInput: `(${m2}, ${py})`,
              vals: { m1, m2, shift }, params: { px, py, a, b, kind },
            };
          }
        }
        const px = r.nonzero(-8, 8), py = r.intExcept(-8, 8, 0, px, -px), a = [px, -py], b = [-py, px];
        return {
          prompt: `Reflect ${V("P")}${Pt(px, py)} in the ${x}-axis, then reflect the image in the line ${y} = ${x}. Where does ${V("P")} end up, and what single motion does the same thing?`,
          graph: plane([{ t: "pt", x: px, y: py, label: "P" }, { t: "hline", y: 0, role: "highlight" }, { t: "fn", e: "x", role: "secondary" }], lim),
          steps: [
            `Reflect in the ${x}-axis: (${x}, ${y}) ↦ (${x}, −${y}), so ${Pt(px, py)} ↦ ${Pt(...a)}.`,
            `Reflect in ${y} = ${x}: swap the coordinates, so ${Pt(...a)} ↦ ${Pt(...b)}.`,
            `The mirrors cross at the origin at 45°, and two reflections in crossing mirrors make a rotation about the crossing point by twice that angle: 90° counterclockwise, (${x}, ${y}) ↦ (−${y}, ${x}), which sends ${Pt(px, py)} to ${Pt(...b)}. It checks.`,
          ],
          answer: { kind: "point", value: b }, answerText: Pt(...b), answerInput: `(${b[0]}, ${b[1]})`,
          vals: { ax: a[0], ay: a[1], bx: b[0], by: b[1] }, params: { px, py, kind }, consts: [45, 90],
        };
      },
    },
  };
  for (const [key, d] of Object.entries(defs)) {
    if (!CONSTS[key]) continue;
    const gen = d.generate;
    d.generate = function (r, level) {
      const out = gen.call(this, r, level);
      out.consts = [...(out.consts || []), ...CONSTS[key]];
      return out;
    };
  }
  P.define("geometry", defs);
})(Practice);
