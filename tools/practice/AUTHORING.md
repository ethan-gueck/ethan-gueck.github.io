# Writing practice-problem generators

Practice problems on ethan-gueck.github.io are **generated, never stored**. Each domain file
`assets/js/practice/<domain>.js` registers one generator per flashcard concept. A reader picks a
domain, a concept (or "any") and a level (1 easy, 2 medium, 3 hard); the page calls the generator
with a seeded random source and shows the prompt, takes the answer, offers the steps one at a time
as hints, and shows all the steps after a wrong answer.

**Correctness is the requirement that matters most.** Ethan learns from these. A wrong answer or a
wrong step is worse than no problem at all. Everything below exists to make errors impossible to
ship: each generator is checked by `tools/practice/verify.py` against an independent Python verifier,
at three levels and hundreds of seeds, and must pass with zero failures.

Read `assets/js/practice/core.js` (the API) and `assets/js/practice/algebra1.js` plus
`tools/practice/verifiers/algebra1.py` (the reference implementation) before writing anything.

## Files you own

- `assets/js/practice/<domain>.js`: the generators.
- `tools/practice/verifiers/<domain_with_underscores>.py`: the verifier (a `VERIFY` dict, key → function).

Do **not** edit `core.js`, `verify.py`, other domains, or anything outside these two files. Do not
commit or push. If you need a helper, write it at the top of your domain file. If core genuinely
lacks something, say so in your final report (with the exact need); do not work around it unsafely.

## Which concepts

`uv run tools/practice/concepts.py <chapter>` prints the chapter's concepts: the **key** (register
the generator under the key, e.g. `"G.points-lines"` or `"C1.4"`, never the shown ID), the title,
summary and every named formula. Write a generator for **every concept where solving a problem is
possible** (a computation, a word problem, reading a graph, choosing the right rule). Skip only pure
definitions or history with nothing to solve; list skipped keys with a one-line reason in a comment
at the top of your domain file. When a concept has several formulas, rotate among them (by level
and by `r.pick`) so the concept's important formulas all appear.

## The generator contract

```js
(function (P) {
  "use strict";
  const { Frac, M, fmt, graph } = P;
  P.define("<domain>", {
    "<concept key>": {
      title: "Short title of the problem type",
      generate(r, level) {          // r: seeded random source (r.int, r.nonzero, r.pick, r.chance, r.shuffle, r.sample)
        ...
        return {
          prompt,                   // HTML: the question. Never contains the answer.
          steps: [...],             // HTML strings: the by-hand solution, one step each; the last step reaches the answer
          answer,                   // see "Answers"
          answerText,               // HTML: the answer as shown after checking
          answerInput,              // plain text a person would type for the correct answer (not for "choice")
          vals: { name: value },    // EVERY number the steps/answer show that is computed (not an input), by name
          params: { name: value },  // the inputs the verifier needs (numbers, or {n, d} fractions)
          consts: [4, 180],         // optional: fixed constants the text shows (formula numbers like 4ac, 180°, 100%)
          graph,                    // optional, see "Graphs"
          deg: true,                // optional: answer is in degrees (the checker evaluates sin/cos in degrees)
        };
      },
    },
  });
})(Practice);
```

Rules:

1. **Every number shown is tracked.** The verifier audits every number in the prompt, steps, answer
   text and choice options: each must equal an input (`params`), a computed value (`vals`), the answer,
   a declared constant (`consts`) or 0, 1, 2. Build all text from computed variables; never type a
   number into a string by hand. Fractions shown stacked (`M.f`) count via their numerator and
   denominator: put the Frac in `vals` as `{ n, d }` (`fracVal(q)` in algebra1.js).
2. **Steps compute, they don't assert.** Each step shows the arithmetic with the actual numbers
   ("Rise: 3 − (−4) = 7"), in the order a person solves it **by hand**. Choose numbers so that it is
   genuinely hand-solvable at every level: perfect squares, special angles, friendly fractions,
   exact divisions. Where a calculator is unavoidable (logs of arbitrary numbers, e^x, physics with
   measured constants), say "round to 2 decimal places" in the prompt, set `answer.dp`, and show the
   intermediate values the reader would get.
3. **Levels mean something.** Level 1: one idea, small whole numbers. Level 2: negatives, fractions,
   two steps. Level 3: several steps, harder numbers or a scenario (word problem), or a less direct
   form of the question. A level 3 problem must be a *different kind* of problem from level 2, not just
   bigger numbers.
4. **Mix the kinds of problem**: numeric, word problems with realistic scenarios (units, plausible
   magnitudes), and graph problems (read a slope, intercept, amplitude, area or vector from a drawn
   graph or figure; pick the graph's equation). Visuals help: include a graph wherever one fits.
5. **Make the problem reject retries.** Use `for (;;) { … if (bad) continue; … }` to redraw until the
   numbers are valid (nonzero denominators, integer answers where promised, distinct choices, points
   inside the graph view, a GCF that really is the greatest, …). Never return an invalid problem.
6. **Typography**: true minus sign (M.n / fmt do it), variables in italics (M.v), stacked fractions
   (M.frac / M.f), `M.sup`, `M.sqrt`, `M.poly` for polynomials, `kv(k)` style helpers so you never show
   "1x", "+ −3" or "−−". Put negative numbers in parentheses when substituting (`M.n(v, {paren:true})`).
   A coefficient next to a number needs "·": write `3 · 4²`, never `34²`. Use `&lt;` / `&gt;` for < and >.
   Sentence case, full sentences, no exclamation marks.
7. **Units** on answers to word problems, in the prompt ("in meters") and the answer text.
8. **No leaks**: the prompt never contains the answer; a graph must not label the answer point
   when the question is to find it.
9. **Rounding ties**: JavaScript and Python round an exact …5 differently. Never ask to round a value
   that sits on a tie; redraw instead.
10. **Words**: the text check rejects code leaks (NaN, Infinity, "[object", "x = undefined",
   "function(", "=>"). Ordinary prose is fine: "null hypothesis", "null space", "cost function",
   "the slope is undefined".

## Answers

`answer.kind`:

| kind | fields | the reader types |
| --- | --- | --- |
| `number` | `value`, optional `dp` (prompt asks to round to dp decimals) | `3/4`, `2√3`, `0.75`, `1.92e11` (any equal expression) |
| `numbers` | `values`, optional `ordered`, `dp` | `2, −3` (roots, solutions); order ignored unless `ordered` |
| `point` | `value: [x, y]` (or more coordinates) | `(2, −3)` |
| `expr` | `expr` (in the parser's syntax), `vars`, optional `form: "expanded" \| "factored"` | `x^2 + 5x + 6` |
| `choice` | `options` (HTML, distinct), `index` | picks one |
| `text` | `accept: [...]` | a word, e.g. `yes` |

Exact answers are compared to 1e-9 relative, so `3/4`, `0.75` and `6/8` all pass, but a rounded
decimal does not unless `dp` is set. `answerInput` must be accepted: the verifier types it in.

## Graphs

`graph({ view: [xmin, xmax, ymin, ymax], items: [...], equal?, axes?, grid? })`, drawn as SVG:
`{t:"fn", e:"2x+1"}` (any parser expression in x; it may be undefined in parts of the view),
`{t:"pt", x, y, label}`, `{t:"seg", a:[x,y], b:[x,y], label, dash}`, `{t:"poly", p:[[x,y],…], label}`,
`{t:"vec", a, b, label}`, `{t:"circle", c:[x,y], r}`, `{t:"text", x, y, s}`, `{t:"vline", x}`, `{t:"hline", y}`.
`role: "primary" | "secondary" | "highlight" | "muted"` colors an item. Geometry figures: `equal: true,
axes: false, grid: false`, and labels for sides and angles (`seg` with `label`, `text`). Keep points
inside the view.

## The verifier

`tools/practice/verifiers/<domain>.py` defines `VERIFY = { "<key>": fn }`. `fn(p)` gets the problem
(dict: `params`, `vals`, `level`, `answer`, …) and returns `{"answer": …, "vals": {…}}`, recomputed
**from `p["params"]` only**, independently: Python `fractions.Fraction`, `math`, and SymPy (`solve`,
`expand`, `factor`, `diff`, `integrate`, `limit`, `Matrix`, …). Never read `p["vals"]` to compute an
expected value (the reference reads it once only to check which factor order was used). It must
recompute **every key in `vals`** (the harness fails on a missing one) and should `assert` the
problem's promises (integer answers, a unique solution, a square-free radicand, the stated GCF, the
claimed relationship in the scenario). Use SymPy to confirm the mathematics, not just to repeat the
generator's arithmetic. For `expr` answers return an equal expression string; for `choice` the
correct index.

## Done means

1. `uv run tools/practice/verify.py <domain> --seeds 400` passes with **zero failures**.
2. You have read `uv run tools/practice/sample.py <domain> --seeds 2` end to end and checked every step
   of every concept at every level for correct mathematics, correct reasoning, clear wording, sensible
   numbers and good typography. Fix anything awkward, not just anything wrong.
3. Final report: concepts covered (key, title, the problem types per level), concepts skipped (key and
   reason), anything core.js lacked.
