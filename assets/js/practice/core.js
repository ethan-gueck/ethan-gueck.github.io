/*
 * practice/core.js — the machinery every practice problem shares.
 *
 * Problems are generated, not stored: each domain file (practice/<domain>.js, loaded on demand)
 * registers one generator per flashcard concept, keyed by the concept's stable key in the book.
 * A generator draws numbers from a seeded random source for the chosen level (1 easy, 2 medium,
 * 3 hard) and returns the prompt, the answer, the steps of a by-hand solution (shown one at a time
 * as hints, and all at once after a wrong answer), an optional graph, and `vals`: every number the
 * text shows, by name, so tools/practice/verify.py can recompute each one independently.
 *
 * This file: seeded random numbers (rng), exact fractions (Frac), number formatting (fmt) and math
 * markup (M), an expression parser (parse / evaluate) used for answers, the calculator and graph
 * curves, answer checking (check), and the registry (Practice.define / Practice.generate).
 * No DOM: the verifier runs this file in a bare JavaScript engine.
 */
(function (global) {
  "use strict";

  // ---- Seeded random numbers (mulberry32) ----------------------------------------
  function rng(seed) {
    let s = seed >>> 0;
    function next() {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    const r = {
      next,
      /** An integer from lo to hi, both included. */
      int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
      /** A nonzero integer from lo to hi. */
      nonzero(lo, hi) { let v; do v = r.int(lo, hi); while (v === 0); return v; },
      /** An integer from lo to hi other than those listed. */
      intExcept(lo, hi, ...not) { let v; do v = r.int(lo, hi); while (not.includes(v)); return v; },
      pick: (list) => list[Math.floor(next() * list.length)],
      sign: () => (next() < 0.5 ? -1 : 1),
      chance: (p) => next() < p,
      shuffle(list) {
        const a = list.slice();
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
      },
      sample: (list, n) => r.shuffle(list).slice(0, n),
    };
    return r;
  }

  // ---- Exact fractions -------------------------------------------------------------
  const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => (a && b ? Math.abs(a * b) / gcd(a, b) : 0);

  class Frac {
    constructor(n, d = 1) {
      if (!Number.isInteger(n) || !Number.isInteger(d) || d === 0) throw new Error(`bad fraction ${n}/${d}`);
      const g = gcd(n, d) || 1;
      const s = d < 0 ? -1 : 1;
      this.n = (s * n) / g + 0;  // + 0 turns -0 into 0
      this.d = (s * d) / g;
    }
    static of(x) { return x instanceof Frac ? x : new Frac(x, 1); }
    add(o) { o = Frac.of(o); return new Frac(this.n * o.d + o.n * this.d, this.d * o.d); }
    sub(o) { o = Frac.of(o); return new Frac(this.n * o.d - o.n * this.d, this.d * o.d); }
    mul(o) { o = Frac.of(o); return new Frac(this.n * o.n, this.d * o.d); }
    div(o) { o = Frac.of(o); if (o.n === 0) throw new Error("divide by zero"); return new Frac(this.n * o.d, this.d * o.n); }
    neg() { return new Frac(-this.n, this.d); }
    abs() { return new Frac(Math.abs(this.n), this.d); }
    pow(k) { let r = new Frac(1); for (let i = 0; i < Math.abs(k); i++) r = r.mul(this); return k < 0 ? new Frac(1).div(r) : r; }
    eq(o) { o = Frac.of(o); return this.n === o.n && this.d === o.d; }
    cmp(o) { o = Frac.of(o); return Math.sign(this.n * o.d - o.n * this.d); }
    isInt() { return this.d === 1; }
    get value() { return this.n / this.d; }
    toString() { return this.d === 1 ? minus(String(this.n)) : `${minus(String(this.n))}/${this.d}`; }
  }

  // ---- Numbers as text ----------------------------------------------------------------
  const minus = (s) => s.replace(/-/g, "−");
  /** Round to `dp` decimals and drop trailing zeros; -0 becomes 0. */
  function round(v, dp = 10) { const r = Number(v.toFixed(dp)); return r === 0 ? 0 : r; }
  /** A number as shown: integers whole, others to at most `dp` decimals, with a true minus sign. */
  function fmt(v, dp = 4) {
    if (v instanceof Frac) return v.toString();
    if (!Number.isFinite(v)) throw new Error(`cannot show ${v}`);
    const r = round(v, dp);
    let s = String(r);
    if (/e/.test(s)) s = r.toFixed(dp).replace(/\.?0+$/, "");
    return minus(s);
  }
  /** Money: two decimals and thousands separators, e.g. $1,234.50. */
  function money(v) {
    const r = round(v, 2);
    const s = Math.abs(r).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (r < 0 ? "−$" : "$") + s;
  }
  /** Thousands separators for a whole number. */
  const grouped = (v) => minus(String(round(v, 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ","));

  // ---- Math markup (HTML; styled by css/components/practice.css) ------------------------
  const M = {
    /** A number; negative numbers in parentheses when `paren` (for substitution: 3 · (−2)). */
    n: (v, { paren = false, dp = 4 } = {}) => { const s = fmt(v, dp); return paren && s.startsWith("−") ? `(${s})` : s; },
    /** A variable, in italics. */
    v: (name) => `<i>${name}</i>`,
    /** A stacked fraction. */
    frac: (top, bottom) => `<span class="pf"><span class="pf__n">${top}</span><span class="pf__d">${bottom}</span></span>`,
    /** A Frac shown stacked (or as a whole number). */
    f(q, { paren = false } = {}) {
      q = Frac.of(q);
      if (q.isInt()) return M.n(q.n, { paren });
      const body = M.frac(String(Math.abs(q.n)), String(q.d));
      return q.n < 0 ? (paren ? `(−${body})` : `−${body}`) : body;
    },
    sup: (base, exp) => `${base}<sup>${exp}</sup>`,
    sub: (base, s) => `${base}<sub>${s}</sub>`,
    sqrt: (inner, index = "") => `<span class="prt">${index ? `<sup class="prt__i">${index}</sup>` : ""}√<span class="prt__in">${inner}</span></span>`,
    abs: (inner) => `|${inner}|`,
    /** A displayed equation or result on its own line. */
    eq: (html) => `<span class="pm">${html}</span>`,
    /** A term with its sign, for writing sums: ' + 3x', ' − 2'. */
    term(coef, rest = "", { first = false } = {}) {
      const c = Frac.of(coef);
      if (c.n === 0) return "";
      const mag = c.abs();
      const body = rest && mag.eq(1) ? rest : `${M.f(mag)}${rest}`;
      if (first) return (c.n < 0 ? "−" : "") + body;
      return ` ${c.n < 0 ? "−" : "+"} ${body}`;
    },
    /** A polynomial from coefficients, highest power first: [1, 5, 6] in x → x² + 5x + 6. */
    poly(coefs, x = "x") {
      const deg = coefs.length - 1;
      let out = "";
      coefs.forEach((c, i) => {
        const p = deg - i;
        const rest = p === 0 ? "" : p === 1 ? M.v(x) : M.sup(M.v(x), p);
        const t = M.term(c, rest, { first: out === "" });
        if (p === 0 && Frac.of(c).abs().eq(1)) out += out === "" ? (Frac.of(c).n < 0 ? "−1" : "1") : ` ${Frac.of(c).n < 0 ? "−" : "+"} 1`;
        else out += t;
      });
      return out || "0";
    },
    table(head, rows) {
      return `<table class="pt"><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${
        rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    },
  };

  // ---- Expressions: answers, the calculator and graph curves ---------------------------
  const FUNCS = {
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, ln: Math.log, log: Math.log10, exp: Math.exp,
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    floor: Math.floor, ceil: Math.ceil,
  };
  const TRIG = new Set(["sin", "cos", "tan"]);
  const ATRIG = new Set(["asin", "acos", "atan"]);

  function tokenize(src) {
    const s = String(src)
      .replace(/[−–—]/g, "-").replace(/[×·∙⋅]/g, "*").replace(/÷/g, "/").replace(/π/g, "pi")
      .replace(/√/g, "sqrt").replace(/∛/g, "cbrt").replace(/\*\*/g, "^").replace(/²/g, "^2").replace(/³/g, "^3")
      .replace(/arcsin/g, "asin").replace(/arccos/g, "acos").replace(/arctan/g, "atan").replace(/°/g, "deg");
    const out = [];
    const re = /\s*(?:(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+)|([A-Za-z]+)|(\S))/gy;   // names are letters only: √2 → sqrt 2
    let m;
    while (re.lastIndex < s.length && (m = re.exec(s))) {
      if (m[1] !== undefined) out.push({ t: "num", v: parseFloat(m[1]) });
      else if (m[2] !== undefined) out.push({ t: "id", v: m[2] });
      else if (m[3] !== undefined) out.push({ t: "op", v: m[3] });
      if (/^\s*$/.test(s.slice(re.lastIndex))) break;
    }
    return out;
  }

  /** Parse an expression into a tree. Implicit multiplication (2x, 3√2, 2(x+1)) is allowed. */
  function parse(src, vars = []) {
    const toks = tokenize(src);
    let i = 0;
    const peek = () => toks[i];
    const isOp = (v) => peek() && peek().t === "op" && peek().v === v;
    // Split names like "xy" or "2pix" into known pieces.
    const known = new Set([...Object.keys(FUNCS), "pi", "e", "deg", ...vars]);
    function idTokens(name) {
      if (known.has(name)) return [name];
      const out = [];
      let rest = name;
      while (rest) {
        const hit = [...known].filter((k) => rest.startsWith(k)).sort((a, b) => b.length - a.length)[0];
        if (!hit) throw new Error(`I don't know “${name}”`);
        out.push(hit);
        rest = rest.slice(hit.length);
      }
      return out;
    }
    function expr() {
      let node = term();
      while (isOp("+") || isOp("-")) { const op = toks[i++].v; node = { op, a: node, b: term() }; }
      return node;
    }
    function term() {
      let node = unary();
      for (;;) {
        if (isOp("*") || isOp("/")) { const op = toks[i++].v; node = { op, a: node, b: unary() }; continue; }
        const t = peek();
        // implicit multiplication: a number, name or "(" right after a factor
        if (t && (t.t === "num" || t.t === "id" || (t.t === "op" && t.v === "("))) { node = { op: "*", a: node, b: unary() }; continue; }
        return node;
      }
    }
    function unary() {
      if (isOp("-")) { i++; return { op: "neg", a: unary() }; }
      if (isOp("+")) { i++; return unary(); }
      return power();
    }
    function power() {
      let base = postfix();
      if (isOp("^")) { i++; return { op: "^", a: base, b: unary() }; }  // right-associative
      return base;
    }
    function postfix() {
      let node = atom();
      while (peek() && peek().t === "id" && peek().v === "deg") { i++; node = { op: "deg", a: node }; }
      while (isOp("!")) { i++; node = { op: "!", a: node }; }
      return node;
    }
    function atom() {
      const t = toks[i++];
      if (!t) throw new Error("The expression ends too soon.");
      if (t.t === "num") return { num: t.v };
      if (t.t === "op" && t.v === "(") {
        const e = expr();
        if (!isOp(")")) throw new Error("A “(” is missing its “)”.");
        i++;
        return e;
      }
      if (t.t === "op" && t.v === "|") {
        const e = expr();
        if (!isOp("|")) throw new Error("An absolute value bar is missing.");
        i++;
        return { fn: "abs", a: e };
      }
      if (t.t === "id") {
        // "2pix" or "sqrtx": a run of known names multiplies; a function takes the rest of the run,
        // or else the parenthesis or factor after it (sqrt(2), sqrt 2, sin 30deg).
        const parts = idTokens(t.v);
        // "xy^2" is x·y²: a leading plain name stands alone and the rest of the run goes back as the
        // next token, so an exponent binds only to the last name.
        if (parts.length > 1 && !FUNCS[parts[0]]) {
          toks.splice(i, 0, { t: "id", v: parts.slice(1).join("") });
          return leaf(parts[0]);
        }
        let node = null;
        for (let k = 0; k < parts.length; k++) {
          const name = parts[k];
          let part;
          if (FUNCS[name]) {
            let arg;
            if (k < parts.length - 1) {
              arg = parts.slice(k + 1).map(leaf).reduce((acc, l) => ({ op: "*", a: acc, b: l }));
              k = parts.length;
            } else {
              arg = isOp("(") ? atom() : postfix();
            }
            part = { fn: name, a: arg };
          } else part = leaf(name);
          node = node ? { op: "*", a: node, b: part } : part;
        }
        return node;
      }
      throw new Error(`I didn't expect “${t.v}”.`);
    }
    const leaf = (name) => (name === "pi" ? { num: Math.PI } : name === "e" ? { num: Math.E } : name === "deg" ? { num: Math.PI / 180 } : { id: name });
    const tree = expr();
    if (i < toks.length) throw new Error(`I didn't expect “${toks[i].v}”.`);
    return tree;
  }

  const fact = (n) => { if (!Number.isInteger(n) || n < 0 || n > 170) return NaN; let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; };

  /** The value of a tree. `deg`: trig functions take and give degrees (the calculator's DEG mode). */
  function evaluate(node, env = {}, { deg = false } = {}) {
    const ev = (n) => evaluate(n, env, { deg });
    if ("num" in node) return node.num;
    if ("id" in node) { if (!(node.id in env)) throw new Error(`“${node.id}” has no value here.`); return env[node.id]; }
    if (node.fn) {
      const x = ev(node.a);
      if (deg && TRIG.has(node.fn)) return FUNCS[node.fn](x * Math.PI / 180);
      if (deg && ATRIG.has(node.fn)) return FUNCS[node.fn](x) * 180 / Math.PI;
      return FUNCS[node.fn](x);
    }
    switch (node.op) {
      case "+": return ev(node.a) + ev(node.b);
      case "-": return ev(node.a) - ev(node.b);
      case "*": return ev(node.a) * ev(node.b);
      case "/": return ev(node.a) / ev(node.b);
      case "^": {
        const b = ev(node.a), p = ev(node.b);
        // a real odd root of a negative number: (−8)^(1/3) = −2
        if (b < 0 && !Number.isInteger(p)) { const q = 1 / p; if (Number.isInteger(Math.round(q)) && Math.abs(q - Math.round(q)) < 1e-9 && Math.round(q) % 2) return -Math.pow(-b, p); }
        return Math.pow(b, p);
      }
      case "neg": return -ev(node.a);
      case "deg": return ev(node.a) * (deg ? 1 : Math.PI / 180);
      case "!": return fact(ev(node.a));
    }
    throw new Error("Unknown expression.");
  }

  /** Evaluate text; vars maps names to values. Throws on a parse error. */
  const value = (src, vars = {}, opts) => evaluate(parse(src, Object.keys(vars)), vars, opts);

  /** Does the tree multiply or raise a sum (i.e. is it not expanded)? */
  function hasProductOfSums(node) {
    const isSum = (n) => n && (n.op === "+" || n.op === "-" || (n.op === "neg" && isSum(n.a)));
    if (!node || "num" in node || "id" in node) return false;
    if ((node.op === "*" || node.op === "^") && (isSum(node.a) || (node.op === "*" && isSum(node.b)))) return true;
    return hasProductOfSums(node.a) || hasProductOfSums(node.b);
  }

  // ---- Answer checking -----------------------------------------------------------------
  const close = (a, b, tol) => Math.abs(a - b) <= tol;
  /** Tolerance for an exact answer typed as an expression or a long decimal. */
  const exactTol = (v) => Math.max(1e-9 * Math.abs(v), 1e-12);   // relative, with a floor so float noise (−1.4e-17) still equals a typed 0
  /** Tolerance when the prompt asks to round to `dp` decimals: half a unit in the last place (plus float slack). */
  const roundTol = (dp) => 0.5 * Math.pow(10, -dp) + 1e-9;

  function splitList(text) {
    return String(text).replace(/\b(or|and)\b/gi, ",").replace(/;/g, ",").split(",").map((s) => s.replace(/^\s*[a-zA-Z]\w*\s*=\s*/, "").trim()).filter(Boolean);
  }

  function numberOf(text, opts) {
    // "x = 3", "$1,250.50", "25%": drop the name, the dollar and percent signs and thousands separators
    const src = String(text).trim().replace(/^[a-zA-Z]\w*\s*=\s*/, "").replace(/[$%]/g, "").replace(/,(?=\d{3}(\D|$))/g, "");
    if (!src) throw new Error("Enter an answer.");
    const v = value(src, {}, opts);
    if (!Number.isFinite(v)) throw new Error("That doesn't come out to a number.");
    return v;
  }

  /**
   * Check a typed answer against a problem's answer. Returns { ok, note }.
   * Kinds:
   *   number  { value, dp? }          dp: the prompt asks to round to dp decimals
   *   numbers { values, dp?, ordered? } a list (roots, solutions); order ignored unless ordered
   *   point   { value: [x, y], dp? }
   *   expr    { expr, vars, form? }    any equal expression; form 'expanded' rejects unexpanded products,
 *                                    'factored' rejects a sum (the answer must be a product)
   *   choice  { options, index }       the input is the chosen index
   *   text    { accept: [...] }        one of a few words (yes/no, a name), case-insensitive
   */
  function check(answer, input, { deg = false } = {}) {
    try {
      const tolFor = (v) => (answer.dp !== undefined ? roundTol(answer.dp) : exactTol(v));
      switch (answer.kind) {
        case "number": {
          const v = numberOf(input, { deg });
          return { ok: close(v, answer.value, tolFor(answer.value)) };
        }
        case "numbers": {
          const got = splitList(input).map((t) => numberOf(t, { deg }));
          const want = answer.values.slice();
          if (got.length !== want.length) return { ok: false, note: `Enter ${want.length} value${want.length === 1 ? "" : "s"}, separated by commas.` };
          if (answer.ordered) return { ok: got.every((g, k) => close(g, want[k], tolFor(want[k]))) };
          const left = want.slice();
          for (const g of got) {
            const k = left.findIndex((w) => close(g, w, tolFor(w)));
            if (k < 0) return { ok: false };
            left.splice(k, 1);
          }
          return { ok: true };
        }
        case "point": {
          // drop one outer pair of brackets, then split on the commas at depth 0: ((3 − 2√3)/2, 1)
          let s = String(input).trim();
          const outer = () => { let d = 0; for (let k = 0; k < s.length; k++) { d += "([".includes(s[k]) ? 1 : ")]".includes(s[k]) ? -1 : 0; if (d === 0) return k === s.length - 1; } return false; };
          if (/^[([]/.test(s) && outer()) s = s.slice(1, -1);
          const m = [];
          let depth = 0, start = 0;
          for (let k = 0; k < s.length; k++) {
            if (s[k] === "(" || s[k] === "[") depth++;
            else if (s[k] === ")" || s[k] === "]") depth--;
            else if (s[k] === "," && depth === 0) { m.push(s.slice(start, k)); start = k + 1; }
          }
          m.push(s.slice(start));
          if (m.length !== answer.value.length) return { ok: false, note: `Enter a point like (x, y).` };
          return { ok: m.every((t, k) => close(numberOf(t, { deg }), answer.value[k], tolFor(answer.value[k]))) };
        }
        case "expr": {
          const vars = answer.vars || ["x"];
          const tree = parse(String(input).replace(/^\s*[a-zA-Z]\w*\s*=\s*/, ""), vars);
          const want = parse(answer.expr, vars);
          if (answer.form === "expanded" && hasProductOfSums(tree)) return { ok: false, note: "Multiply it out: write the answer without parentheses." };
          if (answer.form === "factored" && (tree.op === "+" || tree.op === "-")) return { ok: false, note: "Write it as a product of factors, like (x + 2)(x − 3)." };
          const points = [-2.37, -1.13, 0.71, 1.59, 2.83, 3.41];
          for (let k = 0; k < points.length; k++) {
            const env = Object.fromEntries(vars.map((name, j) => [name, points[(k + j * 2) % points.length]]));
            const a = evaluate(tree, env), b = evaluate(want, env);
            if (!Number.isFinite(a) || !close(a, b, 1e-7 * Math.max(1, Math.abs(b)))) return { ok: false };
          }
          return { ok: true };
        }
        case "choice": return { ok: Number(input) === answer.index };
        case "text": return { ok: answer.accept.some((a) => a.toLowerCase() === String(input).trim().toLowerCase()) };
      }
      return { ok: false, note: "Unknown answer type." };
    } catch (err) {
      return { ok: false, note: err.message, invalid: true };
    }
  }

  // ---- Graph helpers (a graph is plain data, drawn by modules/practice.js) -------------------
  /**
   * graph({ view: [xmin, xmax, ymin, ymax], items: [...] }) — items:
   *   { t: "fn", e: "2x + 1", role? }            a curve y = e(x), e in the expression syntax above
   *   { t: "pt", x, y, label?, role? }           a dot
   *   { t: "seg", a: [x, y], b: [x, y], label?, dash?, role? }
   *   { t: "poly", p: [[x, y], ...], label?, fill?, role? }   a closed polygon
   *   { t: "vec", a: [x, y], b: [x, y], label?, role? }       an arrow from a to b
   *   { t: "circle", c: [x, y], r, role? }
   *   { t: "text", x, y, s, role? }
   *   { t: "vline", x, dash?, role? } / { t: "hline", y, dash?, role? }
   * Options: axes (default true), grid (default true), equal (equal units, for figures), ticks.
   * Roles: primary, secondary, highlight, muted.
   */
  const graph = (spec) => Object.assign({ axes: true, grid: true }, spec);

  // ---- Registry --------------------------------------------------------------------------
  const registry = {};
  const Practice = global.Practice = global.Practice || {};
  Object.assign(Practice, {
    rng, Frac, gcd, lcm, fmt, money, grouped, round, M, parse, evaluate, value, check, graph, hasProductOfSums,
    registry,
    /** Register a domain's generators: { "<concept key>": { title, generate(r, level) } }. */
    define(domain, defs) {
      for (const [key, def] of Object.entries(defs)) registry[key] = Object.assign({ domain, key }, def);
    },
    /** A problem for concept `key` at `level` (1–3) from `seed`. */
    generate(key, level, seed) {
      const def = registry[key];
      if (!def) throw new Error(`No practice problems for ${key}`);
      const r = rng(seed);
      r.level = level;
      const p = def.generate(r, level);
      return Object.assign({ key, level, seed, title: def.title }, p);
    },
  });
})(typeof window !== "undefined" ? window : globalThis);
