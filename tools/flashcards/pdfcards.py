"""Read card IDs (badges) from the PDF's flashcard FRONT pages, in sheet order, with their cell rects."""
import re, pymupdf
IN = 72
def front_cells(pdf):
    d = pymupdf.open(pdf)
    out = []
    for pno in range(d.page_count):
        p = d[pno]
        foot = [b for b in p.get_text("blocks") if b[1] > 770 and "FRONT (print" in b[4]]
        if not foot:
            continue
        words = p.get_text("words")
        for r in range(4):
            for c in range(3):
                x0, y0 = 0.5 * IN + 2.5 * IN * c, 0.5 * IN + 2.5 * IN * r
                rect = pymupdf.Rect(x0, y0, x0 + 2.5 * IN, y0 + 2.5 * IN)
                # badge sits at (0.2in, 0.27in) from the cell's top-left
                badge = [w for w in words if rect.x0 + 0.15 * IN <= w[0] <= rect.x0 + 1.2 * IN and rect.y0 + 0.2 * IN <= w[1] <= rect.y0 + 0.5 * IN]
                if not badge:
                    continue
                badge.sort(key=lambda w: w[0])
                text = " ".join(w[4] for w in badge)
                out.append({"page": pno, "rect": rect, "badge": text})
    return out
