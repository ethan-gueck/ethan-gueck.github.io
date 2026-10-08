"""Check every shortcut in assets/js/data/symbols.js against an independent source, by simulating it.

    python3 tools/validate_symbol_keys.py

  Unicode   Every code shown (the Windows view) is the character's own code point.
  Mac       Asks macOS itself (UCKeyTranslate on the U.S. layout) what each Option / Shift-Option key
            types. Fails on a mismatch, a dead key, or an exact Option key the reference leaves out.
            Runs on macOS only.
  VS Code   Parses the generated keybindings file like VS Code would (modifiers + one key per part),
            and fails on a duplicate chord, or a prefix VS Code already binds by default on Windows,
            Mac or Linux (from github.com/codebling/vs-code-default-keybindings) or a Windows menu letter.

Downloads land in tools/.cache/ (git-ignored). Exits 1 if anything is wrong.
"""

from __future__ import annotations

import ctypes
import ctypes.util
import json
import platform
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SYMBOLS = ROOT / "assets/js/data/symbols.js"
KEYBINDINGS = ROOT / "assets/data/vscode-math-keybindings.json"
CACHE = Path(__file__).resolve().parent / ".cache"
SOURCES = {
    **{f"vscode-{os}.json": f"https://raw.githubusercontent.com/codebling/vs-code-default-keybindings/master/{os}.keybindings.json" for os in ("windows", "macos", "linux")},
}
MENU_LETTERS = set("fesvgrth")  # File Edit Selection View Go Run Terminal Help (Alt+letter opens them on Windows/Linux)
problems: list[str] = []


def fetch(name: str) -> Path:
    path = CACHE / name
    if not path.exists():
        CACHE.mkdir(exist_ok=True)
        with urllib.request.urlopen(SOURCES[name]) as response:
            path.write_bytes(response.read())
    return path


def entries() -> list[dict]:
    text = SYMBOLS.read_text(encoding="utf-8")
    groups = json.loads(text[text.index("Site.symbolGroups = [") + len("Site.symbolGroups = "): text.rindex("];") + 1])
    seen, out = set(), []
    for group in groups:
        for row in group["rows"]:
            for entry in row["e"]:
                if entry and entry["c"] not in seen:
                    seen.add(entry["c"])
                    out.append(entry)
    return out


def jsonc(path: Path):
    text = re.sub(r'("(?:\\.|[^"\\])*")|//[^\n]*', lambda m: m.group(1) or "", path.read_text(encoding="utf-8"))
    return json.loads(re.sub(r",\s*([\]}])", r"\1", text))


# ---- Unicode (the Windows view) -----------------------------------------------

def check_unicode(items: list[dict]) -> None:
    for e in items:
        if e.get("u") != f"{ord(e['c']):04X}":
            problems.append(f"Unicode: {e['c']} ({e['n']}) shows U+{e.get('u')}, but it is U+{ord(e['c']):04X}")
    print(f"Unicode: {len(items)} code points checked against the characters themselves")


# ---- Mac -----------------------------------------------------------------------

# ANSI virtual key codes of the keys printed on a U.S. keyboard.
VK = {"A": 0, "S": 1, "D": 2, "F": 3, "H": 4, "G": 5, "Z": 6, "X": 7, "C": 8, "V": 9, "B": 11, "Q": 12, "W": 13, "E": 14, "R": 15, "Y": 16, "T": 17,
      "1": 18, "2": 19, "3": 20, "4": 21, "6": 22, "5": 23, "=": 24, "9": 25, "7": 26, "-": 27, "8": 28, "0": 29, "]": 30, "O": 31, "U": 32, "[": 33,
      "I": 34, "P": 35, "L": 37, "J": 38, "'": 39, "K": 40, ";": 41, "\\": 42, ",": 43, "/": 44, "N": 45, "M": 46, ".": 47, "`": 50}


def mac_layout() -> dict[str, tuple[str, bool]]:
    """{"⌥P": ("π", False), ...}: what each Option / Shift-Option key types on the U.S. layout, and whether it is a dead key."""
    cf = ctypes.CDLL(ctypes.util.find_library("CoreFoundation"))
    carbon = ctypes.CDLL("/System/Library/Frameworks/Carbon.framework/Carbon")
    vp = ctypes.c_void_p
    cf.CFStringCreateWithCString.restype, cf.CFStringCreateWithCString.argtypes = vp, [vp, ctypes.c_char_p, ctypes.c_uint32]
    cf.CFDictionaryCreate.restype, cf.CFDictionaryCreate.argtypes = vp, [vp, ctypes.POINTER(vp), ctypes.POINTER(vp), ctypes.c_long, vp, vp]
    cf.CFArrayGetCount.restype, cf.CFArrayGetCount.argtypes = ctypes.c_long, [vp]
    cf.CFArrayGetValueAtIndex.restype, cf.CFArrayGetValueAtIndex.argtypes = vp, [vp, ctypes.c_long]
    cf.CFDataGetBytePtr.restype, cf.CFDataGetBytePtr.argtypes = vp, [vp]
    carbon.TISCreateInputSourceList.restype, carbon.TISCreateInputSourceList.argtypes = vp, [vp, ctypes.c_bool]
    carbon.TISGetInputSourceProperty.restype, carbon.TISGetInputSourceProperty.argtypes = vp, [vp, vp]
    carbon.LMGetKbdType.restype = ctypes.c_uint8
    us = cf.CFStringCreateWithCString(None, b"com.apple.keylayout.US", 0x08000100)
    keys = (vp * 1)(vp.in_dll(carbon, "kTISPropertyInputSourceID").value)
    values = (vp * 1)(us)
    query = cf.CFDictionaryCreate(None, keys, values, 1, ctypes.addressof(vp.in_dll(cf, "kCFTypeDictionaryKeyCallBacks")), ctypes.addressof(vp.in_dll(cf, "kCFTypeDictionaryValueCallBacks")))
    sources = carbon.TISCreateInputSourceList(query, True)
    if not sources or cf.CFArrayGetCount(sources) < 1:
        raise RuntimeError("macOS U.S. keyboard layout not found")
    layout = cf.CFDataGetBytePtr(carbon.TISGetInputSourceProperty(cf.CFArrayGetValueAtIndex(sources, 0), vp.in_dll(carbon, "kTISPropertyUnicodeKeyLayoutData").value))

    def press(vk: int, mods: int, no_dead_keys: bool) -> tuple[str, bool]:
        dead, length, buf = ctypes.c_uint32(0), ctypes.c_ulong(0), (ctypes.c_uint16 * 8)()
        err = carbon.UCKeyTranslate(vp(layout), ctypes.c_uint16(vk), ctypes.c_uint16(0), ctypes.c_uint32(mods), ctypes.c_uint32(carbon.LMGetKbdType()),
                                    ctypes.c_uint32(1 if no_dead_keys else 0), ctypes.byref(dead), ctypes.c_ulong(8), ctypes.byref(length), buf)
        if err:
            raise RuntimeError(f"UCKeyTranslate error {err}")
        return "".join(chr(buf[i]) for i in range(length.value)), dead.value != 0

    out = {}
    for key, vk in VK.items():
        for label, mods in (("⌥", 0x08), ("⇧⌥", 0x0A)):  # (EventRecord modifiers >> 8): option 0x08, shift 0x02
            text, _ = press(vk, mods, no_dead_keys=True)
            alone, is_dead = press(vk, mods, no_dead_keys=False)
            out[label + key] = (text, is_dead or alone == "")
    return out


def check_mac(items: list[dict]) -> None:
    if platform.system() != "Darwin":
        print("Mac: skipped (needs macOS)")
        return
    layout = mac_layout()
    exact = {}
    for key, (text, dead) in layout.items():
        if not dead:
            exact.setdefault(text, key)
    checked = 0
    for e in items:
        if e.get("mac"):
            checked += 1
            text, dead = layout[e["mac"]]
            if text != e["c"] or dead:
                problems.append(f"Mac: {e['mac']} types {text!r}{' (dead key)' if dead else ''}, not {e['c']} ({e['n']})")
        elif e["c"] in exact and not e.get("key"):
            problems.append(f"Mac: {e['c']} ({e['n']}) has an exact Option key {exact[e['c']]} that is not listed")
        elif not e.get("key"):
            # No Option key: the tile shows Option + hex (Unicode Hex Input), which must spell the UTF-16 code units.
            units = "".join(f"{e['c'].encode('utf-16-be')[i:i + 2].hex().upper()}" for i in range(0, len(e['c'].encode('utf-16-be')), 2))
            if e["hex"].replace("⌥", "").replace(" ", "") != units:
                problems.append(f"Mac: {e['c']} ({e['n']}) shows {e['hex']}, but Unicode Hex Input needs {units}")
    print(f"Mac: {checked} Option keys simulated on this Mac's U.S. layout ({len(layout)} keys read)")


# ---- VS Code -------------------------------------------------------------------

VS_MODS = {"ctrl", "shift", "alt", "cmd", "meta", "win"}
VS_KEYS = set("abcdefghijklmnopqrstuvwxyz0123456789") | set("`-=[]\\;',./") | {"left", "right", "up", "down"}


def check_vscode(items: list[dict]) -> None:
    ours = jsonc(KEYBINDINGS)
    chords = [b["key"] for b in ours]
    for chord in chords:
        for part in chord.split(" "):
            *mods, key = part.split("+")
            if not set(mods) <= VS_MODS or key not in VS_KEYS:
                problems.append(f"VS Code: {chord!r} is not a valid key")
    for chord in {c for c in chords if chords.count(c) > 1}:
        problems.append(f"VS Code: {chord!r} is bound twice")
    by_char = {b["args"]["text"]: b["key"] for b in ours}
    for e in items:
        if e.get("vs") and by_char.get(e["c"]) is None:
            problems.append(f"VS Code: {e['c']} shows {e['vs']} but the keybindings file has no entry for it")
    prefixes = {c.split(" ")[0] for c in chords}
    for os_name in ("windows", "macos", "linux"):
        for d in jsonc(fetch(f"vscode-{os_name}.json")):
            first = d["key"].split(" ")[0]
            if first in prefixes:
                problems.append(f"VS Code ({os_name}): prefix {first} is already bound to {d['command']} (when {d.get('when', 'always')})")
    for p in prefixes:
        if p.startswith("alt+") and p[4:] in MENU_LETTERS:
            problems.append(f"VS Code: prefix {p} opens a menu on Windows/Linux")
    print(f"VS Code: {len(chords)} chords parsed; {len(prefixes)} prefixes checked against the default keybindings on Windows, Mac and Linux")


if __name__ == "__main__":
    items = entries()
    check_unicode(items)
    check_mac(items)
    check_vscode(items)
    if problems:
        print(f"\n{len(problems)} problem(s):")
        print("\n".join("  " + p for p in problems))
        sys.exit(1)
    print("\nAll shortcuts verified.")
