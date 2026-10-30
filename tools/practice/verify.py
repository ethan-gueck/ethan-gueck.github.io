# /// script
# requires-python = ">=3.11"
# dependencies = ["mini-racer>=0.12", "sympy>=1.12"]
# ///
"""Verify every practice-problem generator, then write the practice index.

    uv run tools/practice/verify.py [domain ...] [--seeds 300] [--index]

For each generator in assets/js/practice/<domain>.js, at levels 1–3 and many seeds, this runs the
same JavaScript the site runs and checks:

  1. shape       prompt, steps (≥ 1), answer, answerText, answerInput, vals and params are present
  2. text        no NaN / undefined / Infinity / null / [object …] anywhere a reader would see
  3. answer      tools/practice/verifiers/<domain>.py recomputes the answer from the inputs, on its
                 own (Python, exact fractions or SymPy), and it must match
  4. every value the verifier also recomputes every named value in `vals` (the numbers the steps
                 show), and must cover all of them
  5. numbers     every number shown in the prompt, steps or answer must be an input, a verified
                 value, a declared constant (`consts`) or 0, 1, 2: an untracked number fails
  6. typing      the correct answer typed as `answerInput` must be accepted by Practice.check
  7. graphs      every curve parses and evaluates; points sit inside the view
  8. variety     a level gives more than a handful of different problems

With --index (and no failures) it writes assets/js/practice/index.js: the concept keys that have
problems, by domain file, which the page and the flashcard popups read.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import math
import re
import sys
from fractions import Fraction
from pathlib import Path

from py_mini_racer import MiniRacer

ROOT = Path(__file__).resolve().parents[2]
JS = ROOT / "assets/js/practice"
VERIFIERS = Path(__file__).resolve().parent / "verifiers"
# Code leaks only: "null" and "function" are ordinary words in prose ("null hypothesis", "null space",
# "probability mass function"), so they count only in a code-like shape.
BAD_TEXT = re.compile(r"NaN|(?<!\bis )(?<!\bare )(?<!\bbe )(?<!\bbecomes )(?<!\bstays )undefined|Infinity|\[object|\bnull\b(?!\s+(?:hypothesis|hypotheses|space|spaces|set|model|vector|distribution|value))"
                      r"|\bfunction\s*\(|=>")
NUMBER = re.compile(r"\d[\d,]*(?:\.\d+)?|\.\d+")


def domains() -> list[str]:
    return sorted(p.stem for p in JS.glob("*.js") if p.stem not in ("core", "index"))


def load(domain: str) -> MiniRacer:
    ctx = MiniRacer()
    ctx.eval((JS / "core.js").read_text())
    ctx.eval((JS / f"{domain}.js").read_text())
    return ctx


def verifier(domain: str):
    path = VERIFIERS / f"{domain.replace('-', '_')}.py"
    if not path.exists():
        return {}
    spec = importlib.util.spec_from_file_location(f"verifiers.{domain}", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.VERIFY


def numbers_in(obj) -> list[float]:
    """Every number inside params / vals / answers (fractions as {n, d} give n, d and n/d)."""
    out = []
    if isinstance(obj, bool) or obj is None:
        return out
    if isinstance(obj, (int, float)):
        out.append(float(obj))
    elif isinstance(obj, Fraction):
        out += [float(obj), float(obj.numerator), float(obj.denominator)]
    elif isinstance(obj, dict):
        if set(obj) == {"n", "d"}:
            out += [obj["n"] / obj["d"], obj["n"], obj["d"]]
        else:
            for v in obj.values():
                out += numbers_in(v)
    elif isinstance(obj, (list, tuple)):
        for v in obj:
            out += numbers_in(v)
    return out


def as_value(v):
    """A verifier's or generator's value as float(s) for comparison."""
    if isinstance(v, dict) and set(v) == {"n", "d"}:
        return v["n"] / v["d"]
    if isinstance(v, Fraction):
        return float(v)
    if isinstance(v, (list, tuple)):
        return [as_value(x) for x in v]
    return v


def same(a, b, tol=1e-9) -> bool:
    a, b = as_value(a), as_value(b)
    if isinstance(a, list) or isinstance(b, list):
        return isinstance(a, list) and isinstance(b, list) and len(a) == len(b) and all(same(x, y, tol) for x, y in zip(a, b))
    if isinstance(a, str) or isinstance(b, str):
        return a == b
    if isinstance(a, bool) or isinstance(b, bool):
        return a == b
    try:
        return math.isclose(float(a), float(b), rel_tol=tol, abs_tol=tol)
    except (TypeError, ValueError):
        return False


def visible_text(p: dict) -> str:
    parts = [p.get("prompt", ""), p.get("answerText", "")] + list(p.get("steps", []))
    if p["answer"].get("kind") == "choice":
        parts += p["answer"].get("options", [])
    return " ".join(parts)


def strip_tags(html: str) -> str:
    html = re.sub(r"<sup[^>]*>", " ^", html)
    html = re.sub(r"<sub[^>]*>", " _", html)
    html = re.sub(r"<[^>]+>", " ", html)
    return html.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")


def audit_numbers(p: dict, known: list[float]) -> list[str]:
    """Numbers shown that are not an input, a value, a constant or 0, 1, 2."""
    allowed = [abs(k) for k in known] + [abs(c) for c in p.get("consts", [])] + [0.0, 1.0, 2.0]
    text = strip_tags(visible_text(p))
    bad = []
    for tok in NUMBER.findall(text):
        clean = tok.replace(",", "")
        if clean.endswith("."):
            clean = clean[:-1]
        try:
            t = float(clean)
        except ValueError:
            continue
        dp = len(clean.split(".")[1]) if "." in clean else 0
        ok = any(abs(round(k, dp) - t) < 10 ** (-dp - 3) or abs(k - t) < 1e-9 for k in allowed)
        if not ok:
            bad.append(tok)
    return sorted(set(bad))


def check_graph(ctx: MiniRacer, g: dict) -> list[str]:
    errs = []
    view = g.get("view")
    if not view or len(view) != 4 or not (view[0] < view[1] and view[2] < view[3]):
        return ["graph view must be [xmin, xmax, ymin, ymax] with min < max"]
    for it in g.get("items", []):
        t = it.get("t")
        if t == "fn":
            try:
                ys = ctx.eval(f"(function(){{const t=Practice.parse({json.dumps(it['e'])},['x']);const out=[];for(let i=0;i<=40;i++){{const x=({view[0]})+(({view[1]})-({view[0]}))*i/40;let y;try{{y=Practice.evaluate(t,{{x}})}}catch(e){{y=null}}out.push(y)}}return JSON.stringify(out)}})()")
                ys = json.loads(ys)
                if not any(isinstance(y, (int, float)) and math.isfinite(y) for y in ys):
                    errs.append(f"curve {it['e']!r} has no finite values in view")
            except Exception as e:  # noqa: BLE001
                errs.append(f"curve {it.get('e')!r} does not parse: {str(e)[:80]}")
        elif t == "pt":
            x, y = it["x"], it["y"]
            if g.get("axes", True) and not (view[0] <= x <= view[1] and view[2] <= y <= view[3]):
                errs.append(f"point ({x}, {y}) outside the view")
        elif t not in ("seg", "poly", "vec", "circle", "text", "vline", "hline", "arc", "angle", "label"):
            errs.append(f"unknown graph item {t!r}")
    return errs


def run(domain: str, seeds: int) -> tuple[list[str], dict]:
    ctx = load(domain)
    verify = verifier(domain)
    keys = json.loads(ctx.eval(f"JSON.stringify(Object.values(Practice.registry).filter(d => d.domain !== undefined).map(d => [d.key, d.title || '', d.domain]))"))
    failures, index = [], []
    for key, title, dom in keys:
        fails_here = []
        if key not in verify:
            failures.append(f"{domain} {key}: no verifier in tools/practice/verifiers/{domain.replace('-', '_')}.py")
            continue
        for level in (1, 2, 3):
            prompts = set()
            for seed in range(1, seeds + 1):
                where = f"{domain} {key} level {level} seed {seed}"
                try:
                    p = json.loads(ctx.eval(f"JSON.stringify(Practice.generate({json.dumps(key)}, {level}, {seed}))"))
                except Exception as e:  # noqa: BLE001
                    fails_here.append(f"{where}: generator threw {str(e)[:160]}")
                    break
                errs = []
                for field in ("prompt", "steps", "answer", "answerText", "vals", "params"):
                    if field not in p:
                        errs.append(f"missing {field}")
                if errs:
                    fails_here.append(f"{where}: " + "; ".join(errs))
                    break
                if not p["steps"] or not all(isinstance(s, str) and s.strip() for s in p["steps"]):
                    errs.append("steps must be non-empty strings")
                if BAD_TEXT.search(visible_text(p)):
                    errs.append(f"bad text: {BAD_TEXT.search(visible_text(p)).group(0)!r}")
                # 3, 4: independent recomputation
                try:
                    exp = verify[key](p)
                except Exception as e:  # noqa: BLE001
                    errs.append(f"verifier threw {type(e).__name__}: {e}")
                    exp = None
                if exp is not None:
                    ans = p["answer"]
                    want = exp.get("answer")
                    got = {"number": ans.get("value"), "numbers": ans.get("values"), "point": ans.get("value"),
                           "choice": ans.get("index"), "expr": ans.get("expr"), "text": (ans.get("accept") or [None])[0]}.get(ans.get("kind"))
                    if ans.get("kind") == "numbers" and not ans.get("ordered") and isinstance(want, list):
                        got, want = sorted(as_value(got)), sorted(as_value(want))
                    if ans.get("kind") == "expr":
                        ok = json.loads(ctx.eval(f"JSON.stringify(Practice.check({json.dumps(ans)}, {json.dumps(want)}))"))["ok"]
                        if not ok:
                            errs.append(f"answer {got!r} is not equal to the verifier's {want!r}")
                    elif not same(got, want, 1e-9 if ans.get("dp") is None else 1e-9):
                        errs.append(f"answer {got!r} but the verifier gets {want!r}")
                    vals = p.get("vals", {})
                    expv = exp.get("vals", {})
                    missing = sorted(set(vals) - set(expv))
                    if missing:
                        errs.append(f"vals not recomputed by the verifier: {missing}")
                    for name, v in expv.items():
                        if name not in vals:
                            errs.append(f"verifier expects val {name!r}, which the generator does not report")
                        elif not same(vals[name], v):
                            errs.append(f"val {name} = {vals[name]!r} but the verifier gets {v!r}")
                # 5: every shown number is accounted for
                known = numbers_in(p.get("params")) + numbers_in(p.get("vals")) + numbers_in(p["answer"].get("value")) + numbers_in(p["answer"].get("values"))
                stray = audit_numbers(p, known)
                if stray:
                    errs.append(f"numbers shown but not tracked: {stray}")
                # 6: the correct answer, typed, is accepted
                if p["answer"].get("kind") != "choice":
                    if "answerInput" not in p:
                        errs.append("missing answerInput (the correct answer as a person would type it)")
                    else:
                        res = json.loads(ctx.eval(f"JSON.stringify(Practice.check({json.dumps(p['answer'])}, {json.dumps(p['answerInput'])}, {{deg: {json.dumps(bool(p.get('deg')))}}}))"))
                        if not res.get("ok"):
                            errs.append(f"typing the answer {p['answerInput']!r} is marked wrong ({res.get('note', '')})")
                else:
                    opts = p["answer"].get("options", [])
                    if not (0 <= p["answer"].get("index", -1) < len(opts)) or len(set(opts)) != len(opts):
                        errs.append("choice index out of range or duplicate options")
                # 7: graphs
                if p.get("graph"):
                    errs += check_graph(ctx, p["graph"])
                if errs:
                    fails_here.append(f"{where}: " + "; ".join(errs))
                    if len(fails_here) > 6:
                        break
                prompts.add(p["prompt"] + json.dumps(p.get("params"), sort_keys=True))  # a graph-only problem differs in its inputs
            if len(fails_here) > 6:
                break
            if len(prompts) < min(5, seeds // 4):
                fails_here.append(f"{domain} {key} level {level}: only {len(prompts)} different problems in {seeds} seeds")
        failures += fails_here
        if not fails_here:
            index.append(key)
    return failures, {"keys": index}


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("domains", nargs="*")
    ap.add_argument("--seeds", type=int, default=300)
    ap.add_argument("--index", action="store_true", help="write assets/js/practice/index.js (all domains, no failures)")
    args = ap.parse_args()
    chosen = args.domains or domains()
    all_fail, idx = [], {}
    for d in chosen:
        fails, info = run(d, args.seeds)
        idx[d] = info["keys"]
        print(f"{d}: {len(info['keys'])} concepts pass" + (f", {len(fails)} failures" if fails else ""))
        for f in fails[:40]:
            print("   ", f)
        all_fail += fails
    if args.index:
        if all_fail or args.domains:
            sys.exit("Not writing the index: run every domain with no failures.")
        body = json.dumps({d: keys for d, keys in idx.items() if keys}, separators=(",", ":"))
        (JS / "index.js").write_text(
            "/* Practice problems available, by domain file: concept keys (see tools/practice/verify.py, which writes this\n"
            "   after every generator passes). */\n(function (g) { (g.Practice = g.Practice || {}).index = " + body + "; })(typeof window !== 'undefined' ? window : globalThis);\n")
        print("wrote assets/js/practice/index.js")
    sys.exit(1 if all_fail else 0)


if __name__ == "__main__":
    main()
