"""Parse the Second Edition LaTeX sources into a card list mirroring mathreview.sty's \\addcard calls."""
from __future__ import annotations

import re
from pathlib import Path



def strip_comments(s: str) -> str:
    out = []
    for line in s.split("\n"):
        i = 0
        while True:
            j = line.find("%", i)
            if j < 0:
                break
            k, bs = j - 1, 0
            while k >= 0 and line[k] == "\\":
                bs += 1
                k -= 1
            if bs % 2 == 0:
                line = line[:j]
                break
            i = j + 1
        out.append(line)
    return "\n".join(out)


def skip_ws(s, i):
    while i < len(s) and s[i] in " \t\n":
        i += 1
    return i


def group(s, i):
    """s[i] (after whitespace) is '{' -> (content, index after '}')."""
    i = skip_ws(s, i)
    if i >= len(s) or s[i] != "{":
        raise ValueError(f"expected {{ at {i}: {s[i:i+60]!r}")
    depth, j = 0, i
    while j < len(s):
        c = s[j]
        if c == "\\":
            j += 2
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return s[i + 1 : j], j + 1
        j += 1
    raise ValueError("unbalanced")


def opt(s, i):
    j = skip_ws(s, i)
    if j < len(s) and s[j] == "[":
        depth, k = 0, j
        while k < len(s):
            if s[k] == "{":
                depth += 1
            elif s[k] == "}":
                depth -= 1
            elif s[k] == "]" and depth == 0:
                return s[j + 1 : k], k + 1
            k += 1
    return None, i


def args(s, i, n):
    out = []
    for _ in range(n):
        a, i = group(s, i)
        out.append(a)
    return out, i


def find_env_end(s, i, env):
    """Index of the matching \\end{env} starting after a \\begin{env} body start i."""
    depth = 1
    pat = re.compile(r"\\(begin|end)\{" + re.escape(env) + r"\}")
    for m in pat.finditer(s, i):
        depth += 1 if m.group(1) == "begin" else -1
        if depth == 0:
            return m.start(), m.end()
    raise ValueError("no end " + env)


CONCEPT_MACROS = {
    "cardtitle": 1, "summary": 1, "fitem": 3, "fitemwide": 3, "cardbreak": 0, "stated": 1, "memory": 1,
    "method": 1, "decide": 1, "extra": 1, "terms": 1, "context": 4, "cardterms": 1, "card": 2,
}


def parse_concept(body: str):
    c = {"fitems": [], "chunks": [], "extra": ""}
    chunk, chunkitems = 0, 0
    i = 0
    pat = re.compile(r"\\(" + "|".join(sorted(CONCEPT_MACROS, key=len, reverse=True)) + r"|fig)(?![A-Za-z])")
    while True:
        m = pat.search(body, i)
        if not m:
            break
        name = m.group(1)
        j = m.end()
        if name == "fig":
            _, j = opt(body, j)
            a, j = args(body, j, 1)
            c["fig"] = a[0]
            i = j
            continue
        a, j = args(body, j, CONCEPT_MACROS[name])
        if name in ("fitem", "fitemwide"):
            if chunkitems == 3:
                chunk += 1
                chunkitems = 0
            if chunk == 0:
                chunk = 1
            chunkitems += 1
            item = {"name": a[0], "formula": a[1], "explain": a[2], "wide": name == "fitemwide", "chunk": chunk, "n": chunkitems}
            c["fitems"].append(item)
        elif name == "cardbreak":
            if chunkitems > 0:
                chunkitems = 3
        elif name == "context":
            c["context"] = a
        elif name == "card":
            c["cardback"], c["cardmemo"] = a
        elif name == "extra":
            c["extra"] = a[0]
        else:
            c[name] = a[0]
        i = j
    c["parts"] = max((f["chunk"] for f in c["fitems"]), default=0)
    return c


TOP = re.compile(
    r"\\(chapteropener|begin\{concept\}|begin\{keytopic\}|end\{keytopic\}|ktcard|sym|greek|gtile|symtile|gentry|subhead"
    r"|renewcommand\\CurCardCatTitle|renewcommand\\CurCardCat)(?![A-Za-z])"
)


def symtiles(s: str):
    out = []
    for m in re.finditer(r"\\symtile(?![A-Za-z])", s):
        a, _ = args(s, m.end(), 5)
        out.append(a)
    return out


def parse_book(src: Path):
    main = (src / "main.tex").read_text()
    files = re.findall(r"\\InputIfFileExists\{(sections/[^}]+)\}", main)
    chapters, cards, registry = [], [], {}
    for f in files:
        s = strip_comments((src / (f + ".tex")).read_text())
        ch = None
        cat = cattitle = ""
        cnum = ktnum = 0
        kt = None
        sub = ""
        i = 0
        while True:
            m = TOP.search(s, i)
            if not m:
                break
            name, j = m.group(1), m.end()
            if name == "chapteropener":
                short, j = opt(s, j)
                (num, title, code, intro), j = args(s, j, 4)
                ch = {"num": num, "title": title, "code": code, "short": short or title, "intro": intro, "file": f}
                chapters.append(ch)
                cat = title
                cnum = ktnum = 0
            elif name.startswith("renewcommand"):
                a, j = args(s, j, 1)
                if name.endswith("Title"):
                    cattitle = a[0]
                else:
                    cat = a[0]
            elif name == "subhead":
                a, j = args(s, j, 1)
                sub = a[0]
            elif name == "begin{concept}":
                (key, title), j = args(s, j, 2)
                end0, end1 = find_env_end(s, j, "concept")
                c = parse_concept(s[j:end0])
                cnum += 1
                did = f"{ch['code']}.{cnum}"
                registry[key] = did
                c.update(kind="concept", key=key, id=did, title=title, chapter=ch["num"], cat=cat, sub=sub)
                cards.append(c)
                for t in symtiles(c["extra"]):
                    registry[t[0]] = t[0]
                    cards.append({"kind": "symtile", "id": t[0], "key": t[0], "name": t[1], "tikz": t[2], "caption": t[3], "back": t[4], "chapter": ch["num"], "cat": "EE Symbols", "parent": did})
                j = end1
            elif name == "begin{keytopic}":
                (key, title, intro), j = args(s, j, 3)
                ktnum += 1
                kid = f"{ch['code']}.K{ktnum}"
                registry[key] = kid
                kt = {"key": key, "id": kid, "title": title, "n": 0}
            elif name == "end{keytopic}":
                kt = None
            elif name == "ktcard":
                (front, back), j = args(s, j, 2)
                kt["n"] += 1
                cards.append({"kind": "ktcard", "id": kt["id"], "key": kt["key"], "kt_title": kt["title"], "front": front, "back": back, "n": kt["n"], "chapter": ch["num"], "cat": cat})
            elif name == "sym":
                key, j = opt(s, j)
                (sym, nm, meaning, ex), j = args(s, j, 4)
                cnum += 1
                sid = f"{ch['code']}.{cnum}"
                registry[key or sid] = sid
                cards.append({"kind": "sym", "id": sid, "key": key or sid, "sym": sym, "name": nm, "meaning": meaning, "example": ex, "chapter": ch["num"], "cat": cat, "sub": sub})
            elif name == "greek":
                (gid, nm, cap, low, pron, uses), j = args(s, j, 6)
                registry[gid] = gid
                cards.append({"kind": "greek", "id": gid, "key": gid, "name": nm, "cap": cap, "low": low, "pron": pron, "uses": uses, "chapter": ch["num"], "cat": "Greek Alphabet"})
            elif name == "gtile":
                (gid, nm, tikz, formula, note), j = args(s, j, 5)
                registry[gid] = gid
                cards.append({"kind": "gtile", "id": gid, "key": gid, "name": nm, "tikz": tikz, "formula": formula, "note": note, "chapter": ch["num"], "cat": cat})
            elif name == "symtile":
                a, j = args(s, j, 5)  # outside a concept's \extra (none expected)
                registry[a[0]] = a[0]
                cards.append({"kind": "symtile", "id": a[0], "key": a[0], "name": a[1], "tikz": a[2], "caption": a[3], "back": a[4], "chapter": ch["num"], "cat": "EE Symbols"})
            elif name == "gentry":
                (gid, nm, d), j = args(s, j, 3)
                registry[gid] = gid
                cards.append({"kind": "gentry", "id": gid, "key": gid, "name": nm, "def": d, "chapter": ch["num"], "cat": cat, "cattitle": cattitle})
            i = j
    return chapters, cards, registry
