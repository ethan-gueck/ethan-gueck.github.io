"""LaTeX (the Second Edition's card fields) -> HTML with inline MathML (Temml)."""
from __future__ import annotations

import html
import json
import re
import unicodedata
from pathlib import Path

from py_mini_racer import MiniRacer

TEMML_VERSION = "0.11.11"
CACHE = Path(__file__).resolve().parents[1] / ".cache"


def _temml() -> str:
    """Temml (MIT), downloaded once into tools/.cache/."""
    path = CACHE / f"temml-{TEMML_VERSION}.min.js"
    if not path.exists():
        import urllib.request
        CACHE.mkdir(exist_ok=True)
        urllib.request.urlretrieve(f"https://cdn.jsdelivr.net/npm/temml@{TEMML_VERSION}/dist/temml.min.js", path)
    return path.read_text()

MACROS = {
    r"\smat": r"\left[\begin{smallmatrix}#1\end{smallmatrix}\right]",
}

_ctx = MiniRacer()
_ctx.eval(_temml())
_ctx.eval("var MAC = " + json.dumps(MACROS) + ";"
          "function tm(s, strict) { return temml.renderToString(s, {displayMode: false, macros: Object.assign({}, MAC), throwOnError: strict, annotate: false}); }")

errors: list[tuple[str, str]] = []
_cache: dict[tuple[str, bool], str] = {}


def math(tex: str, display: bool = False) -> str:
    tex = tex.strip()
    key = (tex, display)
    if key in _cache:
        return _cache[key]
    # \scalebox{f}{$x$} only shrinks a wide symbol for print: keep x.
    tex = re.sub(r"\\scalebox\{[^}]*\}\{\$((?:\\.|[^$])*)\$\}", r"{\1}", tex)
    tex = re.sub(r"\\scalebox\{[^}]*\}", "", tex)
    src = (r"\displaystyle " + tex) if display else tex
    try:
        out = _ctx.call("tm", src, True)
    except Exception as e:  # keep going; report at the end
        errors.append((tex, str(e).split("\n")[0][:160]))
        out = _ctx.call("tm", src, False)
    _cache[key] = out
    return out


ACCENTS = {"'": "\u0301", "`": "\u0300", "^": "\u0302", '"': "\u0308", "~": "\u0303", "c": "\u0327", "v": "\u030c", "u": "\u0306", "=": "\u0304", ".": "\u0307"}
SYMBOLS = {
    "&": "&amp;", "%": "%", "$": "$", "#": "#", "_": "_", "{": "{", "}": "}",
    ",": "\u2009", " ": " ", ";": " ", ":": " ", "!": "", "-": "", "/": "",
    "quad": "\u2003", "qquad": "\u2003\u2003", "enspace": "\u2002", "thinspace": "\u2009",
    "dots": "…", "ldots": "…", "cdots": "⋯", "checkmark": "✓", "textdegree": "°", "textasciitilde": "~",
    "textbar": "|", "textbullet": "•", "textendash": "–", "textemdash": "—", "i": "ı", "O": "Ø", "o": "ø", "ss": "ß", "aa": "å",
    "S": "§", "P": "¶", "copyright": "©", "textless": "&lt;", "textgreater": "&gt;", "slash": "/",
}
DROP = {"small", "Large", "large", "footnotesize", "scriptsize", "normalsize", "tiny", "huge", "itshape", "bfseries", "upshape",
        "centering", "noindent", "hfill", "raggedright", "selectfont", "sffamily", "rmfamily", "ttfamily", "unskip", "relax",
        "nobreak", "allowbreak", "newline_dummy", "strut", "vfill", "medskip", "smallskip", "bigskip"}
WRAP = {"emph": "em", "textit": "em", "textbf": "strong", "texttt": "code", "underline": "u", "textsc": None, "textsf": None,
        "textrm": None, "text": None, "mbox": None, "textup": None, "textnormal": None, "hbox": None, "mathrm": None}
SKIP1 = {"vspace", "hspace", "vspace*", "hspace*", "color", "fontsize", "label"}


class Ctx:
    def __init__(self, xref):
        self.xref = xref  # key -> display ID
        self.unknown: dict[str, int] = {}


def _group(s, i):
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
    raise ValueError("unbalanced: " + s[i : i + 80])


def _arg(s, i):
    while i < len(s) and s[i] in " \t\n":
        i += 1
    if i < len(s) and s[i] == "{":
        return _group(s, i)
    if i < len(s) and s[i] == "\\":
        m = re.match(r"\\([A-Za-z]+|.)", s[i:])
        return m.group(0), i + m.end()
    return s[i : i + 1], i + 1


def _math_end(s, i, closer):
    j = i
    while j < len(s):
        if s[j] == "\\":
            if s.startswith(closer, j):
                return j
            j += 2
            continue
        if s.startswith(closer, j):
            return j
        if s[j] == "{":
            _, j = _group(s, j)
            continue
        j += 1
    raise ValueError("unterminated math: " + s[i : i + 80])


def to_html(s: str, ctx: Ctx, br: str = "<br>") -> str:
    out = []
    i = 0
    n = len(s)
    while i < n:
        c = s[i]
        if c == "$":
            if s.startswith("$$", i):
                j = _math_end(s, i + 2, "$$")
                out.append(math(s[i + 2 : j], True))
                i = j + 2
            else:
                j = _math_end(s, i + 1, "$")
                out.append(math(s[i + 1 : j]))
                i = j + 1
            continue
        if c == "\\":
            if s.startswith("\\(", i):
                j = _math_end(s, i + 2, "\\)")
                out.append(math(s[i + 2 : j]))
                i = j + 2
                continue
            if s.startswith("\\[", i):
                j = _math_end(s, i + 2, "\\]")
                out.append(math(s[i + 2 : j], True))
                i = j + 2
                continue
            if s.startswith("\\\\", i):
                i += 2
                m = re.match(r"\s*\[[^\]]*\]", s[i:])
                if m:
                    i += m.end()
                out.append(br)
                continue
            m = re.match(r"\\([A-Za-z]+\*?|.)", s[i:])
            name = m.group(1)
            i += m.end()
            if name in ACCENTS and (len(name) == 1):
                a, i = _arg(s, i)
                base = "ı" if a == "\\i" else a
                out.append(unicodedata.normalize("NFC", base + ACCENTS[name]))
                continue
            if name in SYMBOLS:
                out.append(SYMBOLS[name])
                if name.isalpha() and i < n and s[i] == " ":
                    pass  # TeX eats the space after a control word; keep one for readability only if followed by a word
                if name.isalpha():
                    while i < n and s[i] == " ":
                        i += 1
                    if name in ("dots", "ldots", "checkmark", "textdegree") and i < n and s[i].isalnum():
                        out.append(" ")
                continue
            if name == "xref":
                a, i = _arg(s, i)
                out.append(f'<span class="fcard__ref">{html.escape(ctx.xref.get(a, a))}</span>')
                continue
            if name in WRAP:
                a, i = _arg(s, i)
                inner = to_html(a, ctx, br)
                tag = WRAP[name]
                out.append(f"<{tag}>{inner}</{tag}>" if tag else inner)
                continue
            if name in SKIP1:
                if name == "fontsize":
                    _, i = _arg(s, i)
                _, i = _arg(s, i)
                continue
            if name in DROP:
                continue
            if name == "par":
                out.append(br)
                continue
            if name in ("textsuperscript",):
                a, i = _arg(s, i)
                out.append(f"<sup>{to_html(a, ctx, br)}</sup>")
                continue
            if name in ("adjustbox",):
                _, i = _arg(s, i)
                a, i = _arg(s, i)
                out.append(to_html(a, ctx, br))
                continue
            # A math-only macro written in text: render it (with one argument for \frac-like ones).
            ctx.unknown[name] = ctx.unknown.get(name, 0) + 1
            out.append(math("\\" + name))
            continue
        if c == "{" or c == "}":
            i += 1
            continue
        if c == "~":
            out.append("\u00a0")
            i += 1
            continue
        if s.startswith("``", i):
            out.append("“"); i += 2; continue
        if s.startswith("''", i):
            out.append("”"); i += 2; continue
        if c == "`":
            out.append("‘"); i += 1; continue
        if c == "'":
            out.append("’"); i += 1; continue
        if s.startswith("---", i):
            out.append("—"); i += 3; continue
        if s.startswith("--", i):
            out.append("–"); i += 2; continue
        if c in "<>&":
            out.append(html.escape(c)); i += 1; continue
        if c == "\n":
            out.append(" "); i += 1; continue
        out.append(c)
        i += 1
    text = "".join(out)
    return re.sub(r"[ \t]{2,}", " ", text).strip()


def to_text(h: str) -> str:
    """Plain text of generated HTML (titles for search, aria labels)."""
    t = re.sub(r"<br>", " ", h)
    t = re.sub(r"<[^>]+>", "", t)
    t = html.unescape(t)
    return re.sub(r"\s+", " ", t).strip()


def split_terms(s: str):
    """\\term{a}{b}\\term{c}{d} -> [(a, b), ...]."""
    out = []
    for m in re.finditer(r"\\term(?![A-Za-z])", s):
        a, j = _arg(s, m.end())
        b, j = _arg(s, j)
        out.append((a, b))
    return out


def split_steps(s: str):
    out = []
    for m in re.finditer(r"\\step(?![A-Za-z])", s):
        a, _ = _arg(s, m.end())
        out.append(a)
    return out
