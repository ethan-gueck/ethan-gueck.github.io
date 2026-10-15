"""LaTeX math -> how it is read aloud, the way the book's stated equations read: 'f prime of x equals …'."""
from __future__ import annotations

import re

GREEK = {
    "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta", "theta", "vartheta", "iota", "kappa",
    "lambda", "mu", "nu", "xi", "pi", "varpi", "rho", "varrho", "sigma", "varsigma", "tau", "upsilon", "phi", "varphi",
    "chi", "psi", "omega", "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi", "Psi", "Omega",
}
FUNCS = {
    "sin": "sine", "cos": "cosine", "tan": "tangent", "csc": "cosecant", "sec": "secant", "cot": "cotangent",
    "arcsin": "arcsine", "arccos": "arccosine", "arctan": "arctangent", "sinh": "hyperbolic sine", "cosh": "hyperbolic cosine",
    "tanh": "hyperbolic tangent", "ln": "the natural log", "log": "log", "exp": "e to the", "det": "the determinant",
    "max": "the maximum", "min": "the minimum", "arg": "the argument", "gcd": "the greatest common divisor", "deg": "the degree",
    "dim": "the dimension", "ker": "the kernel", "Pr": "the probability", "sup": "the supremum", "inf": "the infimum",
    "lim": "the limit", "limsup": "the limit superior",
}
SYMBOLS = {
    "+": "plus", "-": "minus", "=": "equals", "<": "is less than", ">": "is greater than", "/": "over", "!": "factorial",
    ",": ",", ";": ";", ":": ":", "'": "prime", "|": "|", "*": "times", "&": "", ".": "point",
    "le": "is less than or equal to", "leq": "is less than or equal to", "ge": "is greater than or equal to",
    "geq": "is greater than or equal to", "ne": "is not equal to", "neq": "is not equal to", "approx": "is approximately",
    "equiv": "is equivalent to", "cong": "is congruent to", "sim": "is distributed as", "simeq": "is similar to",
    "propto": "is proportional to", "ll": "is much less than", "gg": "is much greater than", "cdot": "times",
    "times": "times", "div": "divided by", "pm": "plus or minus", "mp": "minus or plus", "to": "goes to",
    "rightarrow": "goes to", "longrightarrow": "goes to", "leftarrow": "gets", "mapsto": "maps to", "Rightarrow": "implies",
    "implies": "implies", "Leftarrow": "is implied by", "iff": "if and only if", "Leftrightarrow": "if and only if",
    "leftrightarrow": "if and only if", "in": "is in", "notin": "is not in", "subset": "is a subset of",
    "subseteq": "is a subset of or equal to", "supset": "is a superset of", "cup": "union", "cap": "intersect",
    "setminus": "minus", "emptyset": "the empty set", "varnothing": "the empty set", "infty": "infinity",
    "partial": "partial", "nabla": "del", "forall": "for all", "exists": "there exists", "neg": "not", "land": "and",
    "lor": "or", "wedge": "and", "vee": "or", "oplus": "x-or", "otimes": "tensor", "odot": "element-wise times",
    "circ": "composed with", "perp": "is perpendicular to", "parallel": "is parallel to", "angle": "angle",
    "triangle": "triangle", "mid": "given", "nmid": "does not divide", "colon": ":", "ell": "ell", "hbar": "h bar",
    "dots": "dot dot dot", "ldots": "dot dot dot", "cdots": "dot dot dot", "vdots": "", "ddots": "", "top": "transpose",
    "prime": "prime", "therefore": "therefore", "because": "because", "succ": "is preferred to", "succeq": "is at least as good as",
    "coloneqq": "is defined as", "triangleq": "is defined as", "lesssim": "is at most about", "gtrsim": "is at least about",
    "bmod": "mod", "uparrow": "up", "downarrow": "down", "nearrow": "rising", "searrow": "falling", "bot": "false",
    "square": "square", "blacksquare": "end of proof", "checkmark": "check", "langle": "the inner product of", "rangle": "",
    "lfloor": "the floor of", "rfloor": "", "lceil": "the ceiling of", "rceil": "", "imath": "i", "jmath": "j", "vdash": "proves",
    "models": "models", "Re": "the real part of", "Im": "the imaginary part of", "aleph": "aleph", "star": "star",
}
SPACES = {"quad": ", ", "qquad": ", ", ",": " ", ";": " ", ":": " ", "!": "", " ": " ", "enspace": " ", "thinspace": " "}
DROP = {"left", "right", "big", "Big", "bigg", "Bigg", "bigl", "bigr", "Bigl", "Bigr", "biggl", "biggr", "displaystyle",
        "textstyle", "scriptstyle", "limits", "nolimits", "middle", "bigm", "mathrel", "mathbin", "mathop", "scriptsize",
        "small", "tiny", "hline", "phantom", "vphantom", "hphantom", "strut", "notag", "nonumber"}
FONT = {"mathbf", "mathrm", "mathit", "mathsf", "mathtt", "boldsymbol", "bm", "mathcal", "mathscr", "operatorname",
        "mathfrak", "text", "textbf", "textit", "textrm", "mbox", "emph", "pmb"}
ACCENT_AFTER = {"hat": "hat", "widehat": "hat", "bar": "bar", "overline": "bar", "tilde": "tilde", "widetilde": "tilde",
                "dot": "dot", "ddot": "double dot", "vec": "vector", "check": "check"}
BLACKBOARD = {"R": "the real numbers", "N": "the natural numbers", "Z": "the integers", "Q": "the rationals", "C": "the complex numbers",
              "E": "the expected value of", "P": "the probability of", "1": "the indicator of"}
POWER = {"2": "squared", "3": "cubed", "-1": "inverse", "T": "transpose", "\\top": "transpose", "\\circ": "degrees", "\\prime": "prime",
         "'": "prime", "*": "star", "c": "complement", "+": "plus", "-": "minus", "\\dagger": "dagger", "H": "conjugate transpose"}
ORDINAL = {"2": "square", "3": "cube", "4": "fourth", "5": "fifth", "n": "n-th", "k": "k-th"}


_TEXT = re.compile(r"\\(?:text|textbf|textit|textrm|mbox|operatorname\*?)\s*\{([^{}]*)\}")
_texts: list[str] = []


def tokenize(s: str) -> list[str]:
    """Tokens; the words of \\text{…} stay whole (with their spaces) as one \\TEXTn token."""
    def keep(m):
        _texts.append(m.group(1))
        return f"\\TEXT{len(_texts) - 1} "
    s = _TEXT.sub(keep, s)
    s = re.sub(r"\\([dt]?frac)\s*(\d)(\d)", r"\\\1{\2}{\3}", s)   # \tfrac32 is 3/2, not 32
    return re.findall(r"\\TEXT\d+|\\[A-Za-z]+|\\.|[A-Za-z]|\d+(?:\.\d+)?|\S", s)


class Reader:
    def __init__(self, tokens: list[str]):
        self.t, self.i = tokens, 0

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else None

    def take(self):
        tok = self.peek()
        self.i += 1
        return tok

    def group(self) -> list[str]:
        """The next argument: a {…} group or a single token."""
        tok = self.take()
        if tok == "{":
            depth, out = 1, []
            while self.peek() is not None:
                t = self.take()
                if t == "{":
                    depth += 1
                elif t == "}":
                    depth -= 1
                    if depth == 0:
                        break
                out.append(t)
            return out
        return [] if tok is None else [tok]

    def optional(self) -> list[str] | None:
        if self.peek() != "[":
            return None
        self.take()
        out = []
        while self.peek() not in (None, "]"):
            out.append(self.take())
        self.take()
        return out


def raw(tokens: list[str]) -> str:
    """A group's text as written (for \\text{…} and named sets)."""
    return "".join(t[1:] if t.startswith("\\") and len(t) == 2 else (" " if t == "~" else t) for t in tokens)


WRAP = FONT | set(ACCENT_AFTER) | {"mathbb"}


def simple(tokens: list[str]) -> bool:
    """One term (a letter or number, with any sub- or superscript, accent or font): read without 'the quantity'."""
    r, atoms = Reader(tokens), 0
    while r.peek() is not None:
        t = r.take()
        if t in ("_", "^"):
            r.group()
            continue
        if t == "(":
            _until(r, "(", ")")
            atoms += 1
            continue
        if t == "|":
            _until(r, "|", "|")
            atoms += 1
            continue
        if t in ("{", "}") or t in ("\\,", "\\!", "\\;"):
            continue
        if t.startswith("\\") and t[1:] in WRAP:
            r.group()
        elif t.startswith("\\") and t[1:] in DROP:
            continue
        atoms += 1
    return atoms <= 1 or (atoms == 2 and tokens[:1] == ["-"])


def speak(latex: str) -> str:
    words = read(tokenize(latex))
    text = re.sub(r"\s+", " ", words).strip()
    text = re.sub(r"\s+([,;:])", r"\1", text)
    text = re.sub(r"(,\s*){2,}", ", ", text)
    text = re.sub(r";\s*,", ";", text)
    text = re.sub(r",\s*([;:])", r"\1", text)
    return text.strip(" ,;")


def read(tokens: list[str]) -> str:
    r = Reader(tokens)
    out: list[str] = []
    abs_open = False
    while r.peek() is not None:
        tok = r.take()
        word = atom(tok, r, out)
        if not (tok.startswith("\\") and tok[1:] in SPACES):
            r.aside = False
        if word == "|":
            word = "the absolute value of" if not abs_open else ""
            abs_open = not abs_open
        if word is None:
            continue
        # sub- and superscripts attach to what came before
        while r.peek() in ("_", "^"):
            kind = r.take()
            arg = r.group()
            if kind == "_":
                plain = len(arg) == 1 and arg[0].startswith("\\") and arg[0][1:] in (set(FUNCS) | {"max", "min"})
                word += " sub " + (arg[0][1:] if plain else read(arg))
            else:
                word += " " + power(arg)
        out.append(word)
    return " ".join(w for w in out if w)


def power(arg: list[str]) -> str:
    key = "".join(arg)
    if key in POWER:
        return POWER[key]
    if arg and arg[0] in ("\\prime", "'") and len(arg) <= 2:
        return "double prime" if len(arg) == 2 else "prime"
    inner = read(arg)
    return f"to the {inner}" if simple(arg) else f"to the power {inner}"


def atom(tok: str, r: Reader, out: list[str]) -> str | None:
    if tok in ("{", "}"):
        return "" if tok == "}" else read(_rest_of_group(r))
    if tok == "(":
        inner = _until(r, "(", ")")
        prev = next((w.strip() for w in reversed(out) if w.strip().strip(",;")), "")   # skip thin spaces
        said = read(inner)
        if r_aside(r):
            return f", where {said},"
        if prev.endswith(" of") or prev == "of":
            return said
        last = prev.split()[-1] if prev.split() else ""
        if last and (last in FUNCLIKE or last in ("prime", "hat", "bar", "star", "transpose", "inverse") or re.search(r"sub \w+$", prev) and prev.split()[0] in FUNCLIKE):
            return f"of {said}"
        if re.fullmatch(r"[a-z]", last) and simple(inner):
            return f"of {said}"
        if len(last) > 2 and last.isalnum() and last not in WORDS and not last.isdigit():
            # a named function, atan2(b, a) or σ(z); a Greek letter before a sum multiplies: λ(g − c)
            if last not in {g.replace("var", "") for g in GREEK} or simple(inner):
                return f"of {said}"
        if simple(inner):
            return said
        if last and (re.fullmatch(r"[A-Za-z]|\d+(\.\d+)?|[a-z]+", last) and last not in WORDS):
            return f"times the quantity {said},"
        return f"the quantity {said},"
    if tok in (")", "[", "]", "\\{", "\\}", "\\|"):
        return "the norm of" if tok == "\\|" and not any(o == "the norm of" for o in out[-6:]) else ""
    if tok == "\\\\":
        return ";"
    if re.fullmatch(r"\d+(\.\d+)?", tok) or re.fullmatch(r"[A-Za-z]", tok):
        return tok
    if not tok.startswith("\\"):
        return SYMBOLS.get(tok, tok)
    name = tok[1:]
    if re.fullmatch(r"TEXT\d+", name):
        return _texts[int(name[4:])].replace("\\", "").strip()
    if name in SPACES:
        r.aside = r.peek() == "(" and name == " "   # "x = 1\ (x ≠ 0)": a condition set off by a space
        return SPACES[name]
    if name in DROP:
        if name in ("phantom", "vphantom", "hphantom"):
            r.group()
        return None
    if name in GREEK:
        return name.replace("var", "")
    if name in ("frac", "dfrac", "tfrac", "cfrac"):
        top, bottom = r.group(), r.group()
        a, b = read(top), read(bottom)
        if top == ["1"] and simple(bottom):
            return f"one over {b}"
        if top in (["d"], ["\\partial"]) or (top and top[0] in ("d", "\\partial") and len(top) <= 4):
            return f"{a} {b}" if top in (["d"], ["\\partial"]) else f"{a} over {b}"
        if simple(top) and simple(bottom):
            return f"{a} over {b}"
        return f"the quantity {a}, over {b}," if not simple(top) else f"{a} over the quantity {b},"
    if name == "sqrt":
        index = r.optional()
        body = read(r.group())
        if index:
            k = "".join(index)
            return f"the {ORDINAL.get(k, read(index) + '-th')} root of {body}"
        return f"the square root of {body}"
    if name in ("binom", "dbinom", "tbinom"):
        return f"{read(r.group())} choose {read(r.group())}"
    if name in ACCENT_AFTER:
        body = read(r.group())
        return f"vector {body}" if name == "vec" else f"{body} {ACCENT_AFTER[name]}"
    if name in ("overrightarrow",):
        return f"ray {raw(r.group())}"
    if name in ("overleftrightarrow",):
        return f"line {raw(r.group())}"
    if name in ("underbrace", "overbrace", "underset", "overset", "stackrel", "xrightarrow"):
        if name in ("underset", "overset", "stackrel"):
            r.group()
            return read(r.group())
        if name == "xrightarrow":
            label = read(r.group())
            return f"goes, by {label}, to"
        body = read(r.group())
        return body
    if name in ("cancel", "bcancel", "xcancel", "boxed", "color", "textcolor", "scalebox", "mathstrut"):
        if name in ("color", "textcolor", "scalebox"):
            r.group()
        return read(r.group()) if name != "mathstrut" else None
    if name == "mathbb":
        k = raw(r.group())
        return BLACKBOARD.get(k, k)
    if name in FONT:
        arg = r.group()
        return raw(arg).replace("\\", "") if name.startswith("text") or name in ("mbox", "emph", "operatorname") else read(arg)
    if name in ("begin", "end"):
        env = raw(r.group())
        if name == "begin" and env in ("array", "tabular"):
            r.group()
        if name == "begin":
            return {"cases": "in cases:", "pmatrix": "the matrix", "bmatrix": "the matrix", "vmatrix": "the determinant of",
                    "smallmatrix": "the matrix", "matrix": "the matrix", "aligned": "", "gathered": ""}.get(env, "")
        return ""
    if name in ("sum", "prod", "int", "iint", "iiint", "oint", "lim", "max", "min", "sup", "inf", "argmax", "argmin", "bigcup", "bigcap"):
        what = {"sum": "the sum", "prod": "the product", "int": "the integral", "iint": "the double integral",
                "iiint": "the triple integral", "oint": "the contour integral", "lim": "the limit", "max": "the maximum",
                "min": "the minimum", "sup": "the supremum", "inf": "the infimum", "bigcup": "the union", "bigcap": "the intersection"}.get(name, name)
        lower = upper = None
        while r.peek() in ("_", "^", "\\limits"):
            t = r.take()
            if t == "\\limits":
                continue
            (lower := read(r.group())) if t == "_" else (upper := read(r.group()))
        if name == "lim" and lower:
            return f"the limit as {lower.replace('goes to', 'approaches')} of"
        if lower and upper:
            return f"{what} from {lower} to {upper} of"
        if lower:
            return f"{what} over {lower} of"
        return f"{what} of"
    if name == "arg" and r.peek() in ("\\min", "\\max"):
        which = r.take()[1:]
        lower = ""
        if r.peek() == "_":
            r.take()
            lower = read(r.group())
        return f"the arg {which} over {lower} of" if lower else f"the arg {which} of"
    if name in FUNCS:
        f = FUNCS[name]
        sup = ""
        if r.peek() == "_" and name == "log":
            r.take()
            return f"log base {read(r.group())} of"
        if r.peek() == "^":
            r.take()
            sup = " " + power(r.group())
        if name == "exp":
            return "e to the"
        return f"{f}{sup} of"
    if name in SYMBOLS:
        return SYMBOLS[name]
    if name == "not":
        nxt = r.take()
        word = atom(nxt, r, out) or ""
        return word.replace("is ", "is not ", 1) if word.startswith("is ") else f"not {word}"
    if name in ("%", "$", "#", "&", "_"):
        return {"%": "percent", "$": "dollars", "#": "number", "&": "and", "_": ""}[name]
    return name


FUNCLIKE = set("fghpquvyxzFGHPELNTSRCWVIQ") | {"phi", "psi", "Phi", "Gamma"}
WORDS = {"plus", "minus", "times", "equals", "over", "of", "is", "to", "than", "the", "and", "or", "given", "implies", "in"}


def r_aside(r: Reader) -> bool:
    """A parenthesis right after a space (a ≠ 0) is an aside; the reader marks it before calling."""
    return getattr(r, "aside", False)


def _until(r: Reader, opener: str, closer: str) -> list[str]:
    depth, out = 1, []
    while r.peek() is not None:
        t = r.take()
        if t == opener:
            depth += 1
        elif t == closer:
            depth -= 1
            if depth == 0:
                break
        out.append(t)
    return out


def _rest_of_group(r: Reader) -> list[str]:
    depth, out = 1, []
    while r.peek() is not None:
        t = r.take()
        if t == "{":
            depth += 1
        elif t == "}":
            depth -= 1
            if depth == 0:
                break
        out.append(t)
    return out
