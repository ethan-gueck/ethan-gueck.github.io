# /// script
# requires-python = ">=3.11"
# dependencies = ["mini-racer>=0.12", "pymupdf>=1.24"]
# ///
"""Generate the flashcards from Mathematics: A Comprehensive Review (Second Edition).

    uv run tools/gen_flashcards.py [--source DIR] [--pdf FILE]

Reads the book's LaTeX (default ../../math-review-2nd-edition-source) and its compiled PDF (default
../../resources/source/Math_Comprehensive_Review_Second_Edition.pdf), and writes:

  assets/js/data/flashcards.js   every card the book prints, in the same order and with the same IDs
                                 (a concept split into parts is "C1.4 (1/3)" …); fails unless the
                                 PDF's own card badges match
  assets/js/data/stated.js       per concept: terms, stated equation, named formulas, summary, method,
                                 decision point, origin and uses; library implementations are kept
                                 from the previous stated.js by the concept's key, and the entries
                                 written for gallery, symbol and glossary cards are kept whole
  assets/img/flashcards/*.svg    gallery and schematic-symbol fronts, cropped from the PDF's sheets
  assets/js/data/neurons.js      Site.neuronRequires: the book's cross references to earlier
                                 concepts, plus the edges already there that still point backwards

Math is converted with Temml (downloaded once into tools/.cache/). Then run tools/gen_symbols.py,
which fails if a card uses a symbol the keyboard reference doesn't list.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, OrderedDict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from flashcards import conv  # noqa: E402
from flashcards.conv import Ctx, math, split_steps, split_terms, to_html, to_text  # noqa: E402
from flashcards.texparse import parse_book  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "assets/js/data"
IMG = ROOT / "assets/img/flashcards"
REF_CHAPTERS = ("01", "02", "18", "19")  # signs, Greek, gallery and glossary: reference decks


def read_js(path: Path, marker: str):
    s = path.read_text()
    return json.JSONDecoder().raw_decode(s[s.index(marker) + len(marker):])[0]


def plain(t: str, ctx) -> str:
    return to_text(to_html(t, ctx, br=" "))


def lines(h: str) -> list:
    """A back's text split at its LaTeX line breaks, one card line each."""
    return [x.strip() for x in h.split("<br>") if x.strip()]


def front_svg(card_id: str) -> str:
    return f"assets/img/flashcards/{card_id.lower().replace('.', '-')}-front.svg"


def build(src: Path, prev: dict):
    """prev: the previous stated.js entries by key (concept implementations; whole entries for other cards)."""
    chapters, cards, registry = parse_book(src)
    ctx = Ctx(registry)
    order = {}  # key -> position in the book
    for i, c in enumerate(cards):
        order.setdefault(c["key"], i)
    decks: "OrderedDict[str, dict]" = OrderedDict()
    stated, requires = {}, {}
    kt_total = Counter(c["id"] for c in cards if c["kind"] == "ktcard")

    def deck(name, chapter, ref):
        name = name.replace("\\&", "&")
        decks.setdefault(name, {"name": name, "ref": ref, "cards": []})
        return decks[name]["cards"]

    def prereq(c, *texts):
        """The concepts a card cross-references that come earlier in the book (key topics are not neurons)."""
        reqs = []
        for t in texts:
            for key in re.findall(r"\\xref\{([^}]*)\}", t or ""):
                if key in order and order[key] < order[c["key"]] and ".K" not in registry[key]:
                    d = registry[key]
                    if d != c["id"] and d not in reqs:
                        reqs.append(d)
        if reqs:
            requires[c["id"]] = reqs

    for c in cards:
        k, ref = c["kind"], c["chapter"] in REF_CHAPTERS
        if k == "concept":
            title = plain(c.get("cardtitle") or c["title"], ctx)
            memo = to_html(c["memory"], ctx) if c.get("memory") else ""
            terms = to_html(c["cardterms"], ctx) if c.get("cardterms") else ""
            parts = c["parts"]
            for j in range(1, parts + 1):
                items = [f for f in c["fitems"] if f["chunk"] == j]
                card = {
                    "id": f"{c['id']} ({j}/{parts})" if parts > 1 else c["id"], "concept": c["id"], "title": title,
                    "names": [to_html(f["name"], ctx, br=" ") for f in items],
                    "body": [math(f["formula"], True) for f in items],
                }
                if parts > 1:
                    card["part"] = f"Part {j} of {parts}"
                if terms:
                    card["terms"] = terms
                card["note"] = memo
                card["stated"] = True
                deck(c["cat"], c["chapter"], ref).append(card)
            entry = {
                "key": c["key"],
                "terms": [{"term": to_html(a, ctx), "meaning": to_html(b, ctx)} for a, b in split_terms(c.get("terms", ""))],
                "spoken": [{"text": to_html(c["stated"], ctx)}] if c.get("stated") else [],
                "formulas": [{"name": to_html(f["name"], ctx, br=" "), "explain": to_html(f["explain"], ctx)} for f in c["fitems"]],
                "explanation": to_html(c.get("summary", ""), ctx),
            }
            if c.get("context"):
                o, u, d, p = c["context"]
                entry["origin"] = to_html(o, ctx)
                entry["uses"] = [{"label": lab, "text": to_html(t, ctx)} for lab, t in (("Use", u), ("Data science", d), ("Physical application", p)) if t.strip()]
            if c.get("method"):
                entry["method"] = [to_html(s, ctx) for s in split_steps(c["method"])]
            if c.get("decide"):
                entry["decide"] = to_html(c["decide"], ctx)
            if prev.get(c["key"], {}).get("implementations"):
                entry["implementations"] = prev[c["key"]]["implementations"]
            stated[c["id"]] = entry
            prereq(c, c.get("summary"), c.get("terms"), c.get("memory"), *[f["name"] + f["formula"] + f["explain"] for f in c["fitems"]])
        elif k == "ktcard":
            n, tot = c["n"], kt_total[c["id"]]
            front = to_html(c["front"], ctx)
            deck(c["cat"], c["chapter"], ref).append({
                "id": f"{c['id']} ({n}/{tot})" if tot > 1 else c["id"], "concept": c["id"], "keytopic": plain(c["kt_title"], ctx),
                "title": to_text(front), "titleHTML": front, "prompt": "Recall it", "body": lines(to_html(c["back"], ctx)), "note": "",
            })
        elif k == "sym":
            name = to_html(c["name"], ctx, br=" ")
            deck(c["cat"], c["chapter"], ref).append({
                "id": c["id"], "title": to_text(name), "glyphs": math(c["sym"], True), "prompt": "Name it / give an example",
                "body": [f'<strong class="fcard__name">{name}</strong>', *lines(to_html(c["meaning"], ctx)),
                         '<span class="fcard__ex">Example</span> ' + " ".join(lines(to_html(c["example"], ctx)))],
                "note": "",
            })
        elif k == "greek":
            deck("Greek Alphabet", c["chapter"], ref).append({
                "id": c["id"], "title": c["name"], "glyphs": math(r"\mathrm{" + c["cap"] + "}") + "\u2003" + to_html("$" + c["low"] + "$", ctx),
                "prompt": "Name the letter",
                "body": [f'<strong class="fcard__name">{c["name"]}</strong>', "<em>" + to_html(c["pron"], ctx) + "</em>", to_html(c["uses"], ctx)],
                "note": "",
            })
        elif k == "gtile":
            name = to_html(c["name"], ctx, br=" ")
            deck(c["cat"], c["chapter"], True).append({
                "id": c["id"], "title": to_text(name), "front": front_svg(c["id"]),
                "body": [f'<strong class="fcard__name">{name}</strong>', math(c["formula"], True), *lines(to_html(c["note"], ctx))], "note": "",
            })
            prereq(c, c["note"], c["formula"])
        elif k == "symtile":
            name = to_html(c["name"], ctx, br=" ")
            deck("EE Symbols", c["chapter"], False).append({
                "id": c["id"], "title": to_text(name), "front": front_svg(c["id"]),
                "body": [f'<strong class="fcard__name">{name}</strong>', *lines(to_html(c["back"], ctx))], "note": "",
            })
            prereq(c, c["back"], c["caption"])
        elif k == "gentry":
            name = to_html(c["name"], ctx, br=" ")
            deck(c["cat"], c["chapter"], True).append({
                "id": c["id"], "title": to_text(name), "prompt": "Define it", "body": lines(to_html(c["def"], ctx)), "note": "",
            })
            prereq(c, c["def"])
    # Gallery, schematic-symbol and glossary cards have no stated equation in the book; keep the
    # entries written for them on this site (their IDs are the same in both editions).
    for d in decks.values():
        for card in d["cards"]:
            if "concept" not in card and card["id"] in prev and card["id"] not in stated:
                stated[card["id"]] = prev[card["id"]]
                card["stated"] = True
    return cards, registry, order, decks, stated, requires


def check_order(cards, pdf: Path):
    """The cards must be the PDF's own, in the PDF's order (read from the badges on its front sheets)."""
    from flashcards.pdfcards import front_cells
    expected = []
    for c in cards:
        if c["kind"] == "concept" and c["parts"] > 1:
            expected += [f"{c['id']} ({j}/{c['parts']})" for j in range(1, c["parts"] + 1)]
        else:
            expected.append(c["id"])
    cells = front_cells(pdf)
    got = [x["badge"] for x in cells]
    if expected != got:
        bad = next(i for i, (a, b) in enumerate(zip(expected + [None] * len(got), got + [None] * len(expected))) if a != b)
        sys.exit(f"Card order differs from the PDF at card {bad + 1}: source {expected[bad:bad + 1]}, PDF {got[bad:bad + 1]} "
                 f"({len(expected)} vs {len(got)} cards). Is the PDF compiled from this source?")
    return cells


def write_fronts(cards, cells, pdf: Path):
    """Picture fronts: each gallery tile and schematic symbol, cut from its cell on the PDF's front sheet."""
    import pymupdf
    want = {c["id"] for c in cards if c["kind"] in ("gtile", "symtile")}
    src = pymupdf.open(pdf)
    inset = 3  # points inside the 2.5 in cell, clear of the dashed cut lines
    for cell in cells:
        if cell["badge"] not in want:
            continue
        r = cell["rect"]
        clip = pymupdf.Rect(r.x0 + inset, r.y0 + inset, r.x1 - inset, r.y1 - inset)
        doc = pymupdf.open()
        doc.insert_pdf(src, from_page=cell["page"], to_page=cell["page"])
        page = doc[0]
        w, h = page.rect.width, page.rect.height
        # Remove everything outside this card (other cards, cut lines, footer), then crop to it.
        for out in (pymupdf.Rect(0, 0, w, clip.y0), pymupdf.Rect(0, clip.y1, w, h),
                    pymupdf.Rect(0, clip.y0, clip.x0, clip.y1), pymupdf.Rect(clip.x1, clip.y0, w, clip.y1)):
            page.add_redact_annot(out)
        page.apply_redactions(images=pymupdf.PDF_REDACT_IMAGE_NONE, graphics=pymupdf.PDF_REDACT_LINE_ART_REMOVE_IF_TOUCHED,
                              text=pymupdf.PDF_REDACT_TEXT_REMOVE)
        page.set_cropbox(clip)
        svg = page.get_svg_image(text_as_path=True)
        # The book's blue-to-cyan card bar (a shading, which MuPDF writes as a PNG) becomes the site's
        # green-to-sand bar as a vector gradient, as on the text cards; modules/recolor.js re-themes it.
        image = r'<image x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*/>'
        bars = re.findall(image, svg)
        if len(bars) != 1:
            sys.exit(f"{cell['badge']}: expected one bar image on the front, found {len(bars)}")
        x, y, bw, bh = bars[0]
        svg = re.sub(image, f'<linearGradient id="card-bar"><stop offset="0" stop-color="#0B3D2E"/><stop offset="1" stop-color="#D8C3A5"/></linearGradient>'
                            f'<rect x="{x}" y="{y}" width="{bw}" height="{bh}" fill="url(#card-bar)"/>', svg)
        (IMG / (cell["badge"].lower().replace(".", "-") + "-front.svg")).write_text(svg)
    return len(want)


def write_requires(requires, order, registry):
    """Book edges, plus the edges already in neurons.js that still point to an earlier card."""
    path = DATA / "neurons.js"
    s = path.read_text()
    start = s.index("Site.neuronRequires = {") + len("Site.neuronRequires = ")
    end = s.index("\n  };", start) + len("\n  }")
    pos = {registry[k]: i for k, i in order.items() if k in registry}
    merged = {k: list(v) for k, v in requires.items()}
    for k, v in re.findall(r"'([^']+)':\s*\[([^\]]*)\]", s[start:end]):
        for d in re.findall(r"'([^']+)'", v):
            if k in pos and d in pos and pos[d] < pos[k] and d not in merged.setdefault(k, []):
                merged[k].append(d)
    merged = {k: merged[k] for k in sorted(merged, key=lambda k: pos[k]) if merged[k]}
    out, row, prefix = [], [], None
    for k in merged:
        if k.split(".")[0] != prefix:
            if row:
                out.append("    " + " ".join(row))
            row, prefix = [], k.split(".")[0]
            out.append(f"    // {prefix}")
        item = f"'{k}': [{', '.join(repr(d) for d in merged[k])}],"
        if sum(len(x) + 1 for x in row) + len(item) > 104:
            out.append("    " + " ".join(row))
            row = []
        row.append(item)
    if row:
        out.append("    " + " ".join(row))
    path.write_text(s[:start] + "{\n" + "\n".join(out) + "\n  }" + s[end:])
    return merged


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--source", type=Path, default=ROOT.parents[1] / "math-review-2nd-edition-source")
    ap.add_argument("--pdf", type=Path, default=ROOT.parents[1] / "resources/source/Math_Comprehensive_Review_Second_Edition.pdf")
    ap.add_argument("--implementations", type=Path, default=DATA / "stated.js",
                    help="stated.js to keep implementations (and non-concept entries) from, matched by each entry's key")
    args = ap.parse_args()

    prev = {e["key"]: e for e in read_js(args.implementations, "Site.statedEquations = ").values() if e.get("key")}
    cards, registry, order, decks, stated, requires = build(args.source, prev)
    if conv.errors:
        sys.exit("Temml could not convert:\n" + "\n".join(f"  {e}: {t}" for t, e in conv.errors))
    cells = check_order(cards, args.pdf)

    subject = [d for d in decks.values() if not d["ref"]]
    ref = [d for d in decks.values() if d["ref"]]
    out = []
    for n, d in enumerate(subject + ref, 1):
        out.append({"name": d["name"], "num": n, "cards": d["cards"], **({"ref": True} if d["ref"] else {})})
    total = sum(len(d["cards"]) for d in out)
    dump = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    (DATA / "flashcards.js").write_text(f"""/**
 * Flashcard decks (My Flashcards tab), generated from Mathematics: A Comprehensive Review (Second Edition)
 * by tools/gen_flashcards.py: {len(subject)} subject decks in chapter order, then {len(ref)} reference decks; {total} cards,
 * the same cards as the book's print sheets. Do not edit by hand.
 *
 * A concept card is one part of a concept ("C1.4 (2/3)"): its front gives the title and the numbered
 * names of up to three formulas (names), its back the numbered formulas (body), the key terms (terms)
 * and the memory aid (note). "concept" is the concept's ID; cards with "stated" have an entry in
 * data/stated.js. Key-topic cards carry the topic's name in "keytopic". Symbol and letter cards show
 * "glyphs" (MathML) on the front; gallery and schematic cards a drawing ("front").
 */
(function (Site) {{
  Site.flashcards = {dump(out)};
}})(window.Site = window.Site || {{}});
""")
    (DATA / "stated.js").write_text(f"""/**
 * Stated equations, keyed by concept ID, generated from the Second Edition by tools/gen_flashcards.py.
 * For each concept: its stable key in the book's source (key), every term in its formulas (terms), the
 * read-aloud stated equation (spoken), each named formula and what it does (formulas), the summary
 * (explanation), origin and uses (context), method steps and decision point where the book has them,
 * and library implementations (kept across regenerations by key). HTML with inline MathML.
 * Loaded on demand by modules/stated.js.
 */
(function (Site) {{
  Site.statedEquations = {dump(stated)};
}})(window.Site = window.Site || {{}});
""")
    fronts = write_fronts(cards, cells, args.pdf)
    merged = write_requires(requires, order, registry)
    print(f"flashcards.js: {total} cards in {len(out)} decks ({len(subject)} subject, {len(ref)} reference)")
    print(f"stated.js: {len(stated)} entries, {sum(1 for e in stated.values() if e.get('implementations'))} with implementations")
    print(f"img/flashcards: {fronts} picture fronts")
    print(f"neurons.js: prerequisites for {len(merged)} cards, {sum(map(len, merged.values()))} edges")


if __name__ == "__main__":
    main()
