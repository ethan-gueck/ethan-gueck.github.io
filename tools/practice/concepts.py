# /// script
# requires-python = ">=3.11"
# dependencies = ["mini-racer>=0.12"]
# ///
"""Print a chapter's concepts from the book source: key (what generators register), display ID, title,
summary and each named formula, for writing practice generators.

    uv run tools/practice/concepts.py 05          # chapter number
    uv run tools/practice/concepts.py 18 --gallery # graph-gallery tiles (F.*, D.*)
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "tools"))
from flashcards.texparse import parse_book  # noqa: E402

SRC = ROOT.parents[1] / "math-review-2nd-edition-source"
chapter = sys.argv[1]
chapters, cards, registry = parse_book(SRC)
for c in cards:
    if c["chapter"] != chapter:
        continue
    if c["kind"] == "concept":
        print(f"\n### {c['key']}  (shown as {c['id']})  {c['title']}")
        print(f"summary: {c.get('summary', '')}")
        for f in c["fitems"]:
            print(f"  - {f['name']}: {f['formula']}    // {f['explain']}")
        if c.get("method"):
            print(f"  method: {c['method'][:400]}")
    elif "--gallery" in sys.argv and c["kind"] == "gtile":
        print(f"\n### {c['key']}  {c['name']}: {c['formula']}    // {c['note']}")
