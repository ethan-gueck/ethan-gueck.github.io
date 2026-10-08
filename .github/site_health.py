"""Draw the published site's size as a progress bar against GitHub Pages' 1 GB limit.

    python3 .github/site_health.py _site

Run by the Pages workflow after the build: sums every file in the built site and writes
_site/health.svg (the bar shown in README.md) and _site/health.json, so the bar is redrawn on
every deploy. Standard library only.
"""

import json
import sys
from pathlib import Path

LIMIT = 1024 ** 3  # GitHub Pages publishes sites of at most 1 GB


def size_text(n: int) -> str:
    for unit, scale in (("GB", 1024 ** 3), ("MB", 1024 ** 2), ("KB", 1024)):
        if n >= scale:
            return f"{n / scale:.1f} {unit}"
    return f"{n} B"


def main(site: Path) -> None:
    files = [p for p in site.rglob("*") if p.is_file() and p.name not in ("health.svg", "health.json")]
    used = sum(p.stat().st_size for p in files)
    share = used / LIMIT
    percent = f"{share * 100:.2f}%" if share >= 0.0001 else "<0.01%"
    colour = "#1B6E53" if share < 0.7 else "#B17B18" if share < 0.9 else "#B3261E"
    width, bar_x, bar_w = 520, 118, 260
    fill = max(2, round(bar_w * min(share, 1))) if used else 0
    label = f"{size_text(used)} of 1 GB · {percent}"
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="28" viewBox="0 0 {width} 28" role="img" aria-label="Published site: {label}">
  <title>Published site: {label} ({len(files)} files)</title>
  <style>text {{ font: 600 12px -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; fill: #45524C; }}</style>
  <text x="0" y="18">Published site</text>
  <rect x="{bar_x}" y="7" width="{bar_w}" height="14" rx="7" fill="#E6EBE8" stroke="#CFD6D2"/>
  <rect x="{bar_x}" y="7" width="{fill}" height="14" rx="7" fill="{colour}"/>
  <text x="{bar_x + bar_w + 10}" y="18">{label}</text>
</svg>
"""
    (site / "health.svg").write_text(svg, encoding="utf-8")
    (site / "health.json").write_text(json.dumps({"bytes": used, "files": len(files), "limit_bytes": LIMIT, "percent": round(share * 100, 4)}) + "\n", encoding="utf-8")
    print(f"Published site: {label} ({len(files)} files)")


if __name__ == "__main__":
    main(Path(sys.argv[1] if len(sys.argv) > 1 else "_site"))
