# /// script
# requires-python = ">=3.11"
# dependencies = ["mini-racer>=0.12"]
# ///
"""Print practice problems as plain text, to read them for correctness.

    uv run tools/practice/sample.py algebra1                 # every concept, levels 1-3, seed 1
    uv run tools/practice/sample.py algebra1 A1.4 --seeds 5  # one concept, several seeds
"""
import argparse
import html
import json
import re
from pathlib import Path

from py_mini_racer import MiniRacer

JS = Path(__file__).resolve().parents[2] / "assets/js/practice"


def text(h: str) -> str:
    h = re.sub(r'<span class="pf__n">(.*?)</span><span class="pf__d">(.*?)</span>', r"(\1)/(\2)", h)
    h = re.sub(r"<sup[^>]*>(.*?)</sup>", r"^\1", h)
    h = re.sub(r"<sub[^>]*>(.*?)</sub>", r"_\1", h)
    h = re.sub(r"</t[dh]>", " | ", h)
    h = re.sub(r"</tr>", "\n      ", h)
    return html.unescape(re.sub(r"<[^>]+>", "", h)).strip()


ap = argparse.ArgumentParser()
ap.add_argument("domain")
ap.add_argument("keys", nargs="*")
ap.add_argument("--seeds", type=int, default=1)
ap.add_argument("--start", type=int, default=1)
a = ap.parse_args()
ctx = MiniRacer()
ctx.eval((JS / "core.js").read_text())
ctx.eval((JS / f"{a.domain}.js").read_text())
keys = a.keys or json.loads(ctx.eval("JSON.stringify(Object.keys(Practice.registry))"))
for k in keys:
    for lv in (1, 2, 3):
        for seed in range(a.start, a.start + a.seeds):
            p = json.loads(ctx.eval(f"JSON.stringify(Practice.generate({json.dumps(k)}, {lv}, {seed}))"))
            print(f"== {k} level {lv} seed {seed}: {text(p['prompt'])}")
            if p.get("graph"):
                print(f"   [graph] {json.dumps(p['graph'])[:300]}")
            for i, s in enumerate(p["steps"]):
                print(f"   {i + 1}. {text(s)}")
            if p["answer"]["kind"] == "choice":
                print(f"   options: {[text(o) for o in p['answer']['options']]}")
            print(f"   ANSWER: {text(p['answerText'])}")
