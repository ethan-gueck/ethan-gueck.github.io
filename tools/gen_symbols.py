"""Generate assets/js/data/symbols.js (the References tab's keyboard reference) from the lists below.

    python3 tools/gen_symbols.py && python3 tools/validate_symbol_keys.py

Each symbol carries its Unicode code (the Windows view), a VS Code Alt chord (the VS Code view) and
its Mac combination: the U.S.-layout Option key listed by hand in MAC, or Option + hex otherwise. It fails if a symbol on the flashcards
(assets/js/data/flashcards.js) is missing from the reference, so add new symbols to GROUPS.
"""
import html, json, sys, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FLASHCARDS = ROOT / "assets/js/data/flashcards.js"
OUT = ROOT / "assets/js/data/symbols.js"
KEYBINDINGS = ROOT / "assets/data/vscode-math-keybindings.json"

GREEK = [("Alpha","Α","α"),("Beta","Β","β"),("Gamma","Γ","γ"),("Delta","Δ","δ"),("Epsilon","Ε","ε"),("Zeta","Ζ","ζ"),
         ("Eta","Η","η"),("Theta","Θ","θ"),("Iota","Ι","ι"),("Kappa","Κ","κ"),("Lambda","Λ","λ"),("Mu","Μ","μ"),
         ("Nu","Ν","ν"),("Xi","Ξ","ξ"),("Omicron","Ο","ο"),("Pi","Π","π"),("Rho","Ρ","ρ"),("Sigma","Σ","σ"),
         ("Tau","Τ","τ"),("Upsilon","Υ","υ"),("Phi","Φ","φ"),("Chi","Χ","χ"),("Psi","Ψ","ψ"),("Omega","Ω","ω")]
# Variant lowercase forms used in mathematics: (row name, character).
GREEK_VARIANTS = [("Epsilon (lunate)","\u03f5"),("Theta (script)","\u03d1"),("Phi (straight)","\u03d5"),("Sigma (final)","\u03c2"),("Pi (varpi)","\u03d6"),("Rho (varrho)","\u03f1")]

# Superscript and subscript forms side by side: (row name, superscript, subscript); None where Unicode has none.
SCRIPTS = [(str(i), chr(0x2070 + i) if i not in (1, 2, 3) else "¹²³"[i - 1], chr(0x2080 + i)) for i in range(10)] + [
  ("Plus","⁺","₊"),("Minus","⁻","₋"),("Equals","⁼","₌"),("Left parenthesis","⁽","₍"),("Right parenthesis","⁾","₎"),
  ("a","\u1d43","ₐ"),("c (complement)","ᶜ",None),("e","\u1d49","ₑ"),("h","\u02b0","ₕ"),("i","ⁱ","ᵢ"),("j","\u02b2","ⱼ"),("k","\u1d4f","ₖ"),
  ("l","\u02e1","ₗ"),("m","\u1d50","ₘ"),("n","ⁿ","ₙ"),("o","\u1d52","ₒ"),("p","\u1d56","ₚ"),("s","\u02e2","ₛ"),("t","\u1d57","ₜ"),
  ("x","ˣ","ₓ"),("T (transpose, Aᵀ)","ᵀ",None)]

GROUPS = [
  ("greek", "Greek alphabet", "All 24 letters, capital and lowercase on one line, plus the variant forms used in mathematics.", ("Capital", "Lowercase"), None),
  ("scripts", "Superscripts & subscripts", "Raised characters for powers (x², e⁻ˣ, 10⁻³) beside lowered ones for indices (x₁, aₙ). Each is its own character, not formatting, so it survives copy and paste.", ("Superscript", "Subscript"), None),
  ("arith", "Arithmetic & comparison", "Operators and relations. Note the true minus sign (−) is not the hyphen (-) on the keyboard.", None,
     [("+","Plus"),("−","Minus sign"),("×","Multiplication"),("÷","Division"),("·","Middle dot (product)"),("∙","Bullet operator"),("±","Plus-minus"),("∓","Minus-plus"),("/","Solidus (slash)"),("⁄","Fraction slash"),
      ("=","Equals"),("≠","Not equal"),("≈","Approximately equal"),("≡","Identical to / congruent (mod)"),("≅","Congruent (geometry)"),("∼","Similar to / distributed as"),("∝","Proportional to"),
      ("<","Less than"),(">","Greater than"),("≤","Less than or equal"),("≥","Greater than or equal"),("≪","Much less than"),("≫","Much greater than"),
      ("√","Square root"),("∛","Cube root"),("∜","Fourth root"),("∞","Infinity"),("%","Percent"),("‰","Per mille"),("°","Degree"),("′","Prime (f′, feet, minutes)"),("″","Double prime"),("!","Factorial"),
      ("|","Vertical line (absolute value)"),("∣","Divides / given (P(A ∣ B))"),("‖","Double vertical line (norm ‖x‖)"),("⌊","Left floor"),("⌋","Right floor"),("⌈","Left ceiling"),("⌉","Right ceiling"),("…","Ellipsis"),("⋯","Midline ellipsis (a₁ + ⋯ + aₙ)")]),
  ("sets", "Sets & logic", "Union, intersection, membership, quantifiers and number sets.", None,
     [("∪","Union"),("∩","Intersection"),("∈","Element of"),("∉","Not an element of"),("⊂","Proper subset"),("⊆","Subset or equal"),("⊃","Proper superset"),("⊇","Superset or equal"),("∅","Empty set"),("∖","Set minus"),("\u29f5","Reverse solidus operator (set minus, A ⧵ B)"),
      ("∀","For all"),("∃","There exists"),("∄","There does not exist"),("¬","Not"),("∧","And"),("∨","Or"),("⊕","Exclusive or / direct sum"),("⊗","Tensor / Kronecker product"),("⊙","Element-wise (Hadamard) product"),("∘","Composition (f ∘ g)"),
      ("∴","Therefore"),("∵","Because"),("ℕ","Natural numbers"),("ℤ","Integers"),("ℚ","Rationals"),("ℝ","Real numbers"),("ℂ","Complex numbers"),("≻","Succeeds (preference)"),("⪰","Succeeds or equal")]),
  ("calc", "Calculus, vectors & matrices", "Derivatives, integrals, sums and the symbols around them.", None,
     [("∂","Partial derivative"),("∇","Nabla (gradient, del)"),("\u2206","Increment (change, Δx); Greek Δ is in the alphabet above"),("∫","Integral"),("∬","Double integral"),("∭","Triple integral"),("∮","Contour integral"),("∑","Summation"),("∏","Product"),
      ("˙","Dot above (time derivative ẋ)"),("¯","Macron (mean x̄)"),("ˆ","Circumflex (estimate ŷ)"),("⊤","Transpose (Aᵀ, A⊤)"),("⊥","Perpendicular / orthogonal"),("⟂","Perpendicular"),("∥","Parallel"),("ℓ","Script small l (length, loss)"),("ℒ","Script L (Lagrangian, Laplace)"),("ℰ","Script E"),("ℏ","h-bar (reduced Planck)"),("\u2126","Ohm sign; prefer Greek Ω (U+03A9)"),("\u00b5","Micro sign; prefer Greek μ (U+03BC)"),("Å","Ångström")]),
  ("arrows", "Arrows", "Implication, limits, maps and directions.", None,
     [("→","Right arrow (tends to, maps to)"),("←","Left arrow (assignment)"),("↑","Up arrow"),("↓","Down arrow"),("↔","Left-right arrow"),("↕","Up-down arrow"),("⇒","Implies"),("⇐","Is implied by"),("⇔","If and only if"),("⟹","Long implies"),("⟸","Long implied by"),("⟺","Long if and only if"),("↦","Maps to (x ↦ x²)"),("⟶","Long right arrow"),("↗","North-east arrow (increasing)"),("↘","South-east arrow (decreasing)")]),
  ("geom", "Geometry", "Angles, shapes and relations between figures.", None,
     [("∠","Angle"),("∡","Measured angle"),("△","Triangle"),("□","Square"),("○","Circle"),("⌒","Arc"),("≅","Congruent"),("∼","Similar"),("⊥","Perpendicular"),("∥","Parallel"),("°","Degree"),("π","Pi")]),
  ("type", "Typography", "Dashes, quotes and marks used in the notes on the flashcards.", None,
     [("–","En dash (ranges, 1–10)"),("—","Em dash"),("“","Left double quote"),("”","Right double quote"),("‘","Left single quote"),("’","Right single quote / apostrophe"),("•","Bullet"),("†","Dagger"),("§","Section"),("¶","Pilcrow (paragraph)"),("©","Copyright"),("é","e acute"),("ô","o circumflex")]),
  ("bold", "Bold vector letters", "Bold mathematical letters (𝐱, 𝐯, 𝐅) live outside the 4-digit range: in Word type the 5-digit code, then Alt+X; on a Mac use the two-part code with Unicode Hex Input, or the Character Viewer.", ("Capital", "Lowercase"), None),
]

# Mac, U.S. keyboard layout: Option (⌥) and Shift-Option (⇧⌥) characters, exactly as typed.
MAC = {
  "π":"⌥P","Ω":"⌥Z","∑":"⌥W","∏":"⇧⌥P","∆":"⌥J","∂":"⌥D","∫":"⌥B","√":"⌥V","∞":"⌥5","≠":"⌥=","≈":"⌥X","≤":"⌥,","≥":"⌥.",
  "÷":"⌥/","±":"⇧⌥=","°":"⇧⌥8","·":"⇧⌥9","•":"⌥8","µ":"⌥M","¬":"⌥L","–":"⌥-","—":"⇧⌥-","…":"⌥;","“":"⌥[","”":"⇧⌥[",
  "‘":"⌥]","’":"⇧⌥]","‰":"⇧⌥R","⁄":"⇧⌥1","†":"⌥T","§":"⌥6","¶":"⌥7","©":"⌥G","˙":"⌥H","¯":"⇧⌥,","ˆ":"⇧⌥I","Å":"⇧⌥A",
}

# VS Code: every symbol gets an Alt chord (Alt+prefix, then a key), installed from the generated
# keybindings file with the editor's "type" command, so it works the same on Windows and Mac (Alt = Option).
# Every prefix is an Alt key VS Code 1.140 leaves unbound on Windows, Mac and Linux, and none is a menu
# letter (F, E, S, V, G, R, T, H); tools/validate_symbol_keys.py checks this against the default keybindings.
VS_PREFIX = {"greek": "alt+j", "scripts": None, "arith": "alt+o", "sets": "alt+u", "calc": "alt+d", "arrows": "alt+/", "geom": "alt+m", "type": "alt+q", "bold": "alt+b"}
SUPER_PREFIX, SUB_PREFIX = "alt+'", "alt+,"  # the high mark (') for powers, the low mark (,) for indices
# Greek: the key each letter has on the standard Greek keyboard layout; Shift for the capital.
GREEK_KEYS = {"Alpha":"a","Beta":"b","Gamma":"g","Delta":"d","Epsilon":"e","Zeta":"z","Eta":"h","Theta":"u","Iota":"i","Kappa":"k","Lambda":"l","Mu":"m",
              "Nu":"n","Xi":"j","Omicron":"o","Pi":"p","Rho":"r","Sigma":"s","Tau":"t","Upsilon":"y","Phi":"f","Chi":"x","Psi":"c","Omega":"v"}
GREEK_VARIANT_KEYS = {"\u03f5":"alt+e","\u03d1":"alt+u","\u03d5":"alt+f","\u03c2":"w","\u03d6":"alt+p","\u03f1":"alt+r"}
SCRIPT_KEYS = {"Plus":"shift+=","Minus":"-","Equals":"=","Left parenthesis":"shift+9","Right parenthesis":"shift+0","c (complement)":"c","T (transpose, Aᵀ)":"shift+t"}
# Everything else: the second key, chosen to look like or spell the symbol.
VS_KEYS = {
  "arith": {"−":"-","×":"x","÷":"/","·":"8","∙":"shift+8","±":"=","∓":"shift+=","⁄":"shift+/","≠":"n","≈":"a","≡":"e","≅":"c","∼":"`","∝":"p",
            "≤":",","≥":".","≪":"shift+,","≫":"shift+.","√":"r","∛":"3","∜":"4","∞":"i","‰":"5","°":"0","′":"'","″":"shift+'",
            "∣":"\\","‖":"shift+\\","⌊":"[","⌋":"]","⌈":"shift+[","⌉":"shift+]","…":"l","⋯":"shift+l"},
  "sets": {"∪":"u","∩":"n","∈":"e","∉":"shift+e","⊂":"s","⊆":"shift+s","⊃":"p","⊇":"shift+p","∅":"0","∖":"\\","\u29f5":"shift+\\","∀":"a","∃":"x","∄":"shift+x",
           "¬":"1","∧":"6","∨":"v","⊕":"o","⊗":"shift+o","⊙":".","∘":"c","∴":"t","∵":"b","ℕ":"shift+n","ℤ":"shift+z","ℚ":"shift+q","ℝ":"shift+r","ℂ":"shift+c","≻":"g","⪰":"shift+g"},
  "calc": {"∂":"d","∇":"n","\u2206":"shift+d","∫":"i","∬":"2","∭":"3","∮":"o","∑":"s","∏":"p","˙":".","¯":"-","ˆ":"6","⊤":"t","⊥":"shift+t","⟂":"/","∥":"\\",
           "ℓ":"l","ℒ":"shift+l","ℰ":"shift+e","ℏ":"h","\u2126":"shift+o","\u00b5":"m","Å":"shift+a"},
  "arrows": {"→":"right","←":"left","↑":"up","↓":"down","↔":"h","↕":"v","⇒":"shift+right","⇐":"shift+left","⇔":"shift+h","⟹":"]","⟸":"[","⟺":"=","↦":"m","⟶":"l","↗":"u","↘":"d"},
  "geom": {"∠":"a","∡":"shift+a","△":"t","□":"s","○":"c","⌒":"r","≅":"=","∼":"`","⊥":"p","∥":"\\","°":"0","π":"3"},
  "type": {"–":"-","—":"shift+-","“":"[","”":"]","‘":"shift+[","’":"shift+]","•":"8","†":"t","§":"s","¶":"p","©":"c","é":"e","ô":"o"},
}

# Characters already on the keyboard still get a chord, so every symbol has one: the group prefix, then
# that key with Alt held (no other second key in a group uses Alt, so these never collide).
KEYBOARD_KEYS = {"+": "shift+=", "/": "/", "=": "=", "<": "shift+,", ">": "shift+.", "%": "shift+5", "!": "shift+1", "|": "shift+\\"}

def vs_chord(group_id, row_name, index, entry):
    """The VS Code chord for one entry: every symbol has one."""
    c = entry["c"]
    if entry.get("key"): return f"{VS_PREFIX[group_id]} alt+{KEYBOARD_KEYS[c]}"
    if group_id == "greek":
        if row_name in GREEK_KEYS:
            key = GREEK_KEYS[row_name]
            return f"alt+j shift+{key}" if index == 0 else f"alt+j {key}"
        return f"alt+j {GREEK_VARIANT_KEYS[c]}"
    if group_id == "scripts":
        key = SCRIPT_KEYS.get(row_name) or row_name[0].lower()
        return f"{SUPER_PREFIX if index == 0 else SUB_PREFIX} {key}"
    if group_id == "bold":
        return f"alt+b shift+{row_name.lower()}" if index == 0 else f"alt+b {row_name.lower()}"
    return f"{VS_PREFIX[group_id]} {VS_KEYS[group_id][c]}"

def hexcode(ch): return f"{ord(ch):04X}"

def mac_hex(ch):
    cp = ord(ch)
    if cp <= 0xFFFF: return f"⌥ {cp:04X}"
    cp -= 0x10000
    return f"⌥ {0xD800 + (cp >> 10):04X} ⌥ {0xDC00 + (cp & 0x3FF):04X}"

def row(ch, name):
    r = {"c": ch, "n": name, "u": hexcode(ch), "hex": mac_hex(ch)}
    if ord(ch) < 128:  # on the keyboard already
        r["key"] = True
    elif ch in MAC:
        r["mac"] = MAC[ch]
    return r

def pair(name, *chars, names=None):
    names = names or [name] * len(chars)
    return {"n": name, "e": [row(c, n) if c else None for c, n in zip(chars, names)]}

groups = []
for key, title, intro, cols, items in GROUPS:
    if key == "greek":
        rows = [pair(name, cap, low, names=[f"Capital {name.lower()}", name]) for name, cap, low in GREEK]
        rows += [pair(name, None, c, names=[None, name]) for name, c in GREEK_VARIANTS]
    elif key == "scripts":
        rows = [pair(name, sup, sub, names=[f"Superscript {name}", f"Subscript {name}"]) for name, sup, sub in SCRIPTS]
    elif key == "bold":
        rows = [pair(c, chr(0x1D400 + i), chr(0x1D41A + i), names=[f"Bold {c}", f"Bold {c.lower()}"]) for i, c in enumerate("ABCDEFGHIJKLMNOPQRSTUVWXYZ")]
    else:
        rows = [pair(n, c) for c, n in items]
    group = {"id": key, "title": title, "intro": intro, "rows": rows}
    if cols: group["cols"] = list(cols)
    groups.append(group)

bindings, seen = [], {}
for g in groups:
    for r in g["rows"]:
        for i, e in enumerate(r["e"]):
            if not e: continue
            chord = vs_chord(g["id"], r["n"], i, e)
            if not chord: continue
            if chord in seen and seen[chord] != e["c"]:
                sys.exit(f"VS Code chord {chord} is used for both {seen[chord]} and {e['c']}")
            e["vs"] = chord
            if chord not in seen:
                seen[chord] = e["c"]
                bindings.append((g["title"], chord, e["c"], e["n"]))

lines, last = [], None
for title, chord, c, name in bindings:
    if title != last:
        lines.append(f"  // {title}")
        last = title
    lines.append("  " + json.dumps({"key": chord, "command": "type", "args": {"text": c}, "when": "editorTextFocus"}, ensure_ascii=False) + f",  // {name}")
KEYBINDINGS.write_text("""// Math symbol shortcuts for VS Code, from https://ethan-gueck.github.io/#misc (Ethan Gueck).
// Install: Command Palette (Ctrl+Shift+P / Cmd+Shift+P) → "Preferences: Open Keyboard Shortcuts (JSON)",
// then paste these entries inside the [ ] already in that file. On a Mac, Alt is the Option key.
// Each shortcut is a chord: press Alt+<prefix>, let go, then press the second key.
//   Alt+J Greek (Greek keyboard layout; Shift = capital)   Alt+' superscript   Alt+, subscript
//   Alt+O operators   Alt+U sets & logic   Alt+D calculus   Alt+/ arrows   Alt+M geometry   Alt+Q typography   Alt+B bold
// Every prefix is an Alt key VS Code leaves unbound by default on Windows, Mac and Linux.
[
""" + "\n".join(lines) + "\n]\n", encoding="utf-8")

# Every non-ASCII character on the flashcards (except letters with accents in names and plain quotes) must appear.
covered = {e["c"] for g in groups for r in g["rows"] for e in r["e"] if e}
on_cards = {c for c in html.unescape(FLASHCARDS.read_text(encoding="utf-8")) if ord(c) > 127 and c != "\u00a0"}
missing = sorted(on_cards - covered, key=ord)
if missing:
    sys.exit("Missing from the reference: " + " ".join(f"{c} U+{ord(c):04X} {unicodedata.name(c, '?')}" for c in missing))

body = json.dumps(groups, ensure_ascii=False, indent=None, separators=(",", ":"))
body = body.replace('},{"n"', '},\n      {"n"').replace('"rows":[{', '"rows":[\n      {').replace('},{"id"', '},\n  {"id"').replace(']}],"cols"', ']}],\n    "cols"')
OUT.write_text("""/**
 * Keyboard reference: every symbol on the flashcards, plus other useful ones, with how to type it.
 * Rendered by modules/references.js on the References tab. Each group has rows {n: name, e: entries};
 * paired groups (cols, e.g. Capital / Lowercase) put both forms on one line, null where there is none.
 * Each entry:
 *   c    the character            n    its name            u    Unicode code point (hex; the Windows view)
 *   vs   VS Code chord (installed from assets/data/vscode-math-keybindings.json), e.g. "alt+j a" for α
 *   mac  Mac Option-key shortcut on the U.S. keyboard layout (⌥ Option, ⇧ Shift)
 *   hex  Mac "Unicode Hex Input": hold Option and type the code (works for every symbol)
 *   key  already on the keyboard
 */
(function (Site) {
'use strict';

Site.symbolGroups = [
  """ + body[1:-1] + """
];

})(window.Site = window.Site || {});
""", encoding="utf-8")
print(f"{KEYBINDINGS.relative_to(ROOT)}: {len(bindings)} VS Code shortcuts")
print(f"{OUT.relative_to(ROOT)}: {len(covered)} symbols, {sum(len(g['rows']) for g in groups)} lines in {len(groups)} groups")
