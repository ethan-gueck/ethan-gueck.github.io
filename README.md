# ethan-gueck.github.io

Personal portfolio for Ethan Gueck, Data Scientist. Static HTML, CSS, and vanilla JavaScript (plain scripts), with no build step.

## Structure

```
.
├── index.html                  # Launcher: header, four tab panels, footer
├── .nojekyll                   # Serve files as-is on GitHub Pages
├── games/
│   └── conduit-carl/
│       └── conduit-carl.html   # Conduit Carl arcade game (opened from the Fun and Games tab)
└── assets/
    ├── css/
    │   ├── tokens.css          # Colors, type, spacing (edit brand here)
    │   ├── base.css            # Reset and element defaults
    │   ├── layout.css          # Container, two-column page, contents sidebar
    │   └── components/
    │       ├── header.css      # Masthead and tabs
    │       ├── article.css     # Paper sheet, sections, tables, timeline
    │       ├── gallery.css     # Dashboard carousel
    │       ├── lightbox.css    # Full-size image viewer
    │       ├── ampacity.css    # Fun and Games calculator
│       ├── solver.css      # COBYLA demo inputs, scene, and stage
│       ├── arcade.css      # Conduit Carl cabinet
    │       └── footer.css
    ├── js/
    │   ├── main.js             # Entry point, wires modules together
    │   ├── data/
    │   │   ├── dashboards.js   # Gallery images and captions
    │   │   ├── books.js        # Book list and quotes (fill in)
    │   │   └── flashcards.js   # 480 flashcards in 22 decks (text + MathML backs)
    │   └── modules/
    │       ├── tabs.js         # Tab router (#summary, #portfolio, #fun, #about, #technical); #about is labeled "About Me"
    │       ├── toc.js          # Sidebar contents for the open tab
    │       ├── gallery.js      # Carousel: arrows, dots, autoplay, swipe
    │       ├── lightbox.js     # <dialog> image viewer
│       ├── modal.js        # Dialogs (IEEE 738 calculations, book list)
│       ├── booklist.js     # Fills the book list from data/books.js
│       ├── gitgraph.js     # Experience and education git graph (About Me)
│       ├── flashcards.js   # Flashcard decks (My Flashcards)
    │       └── ampacity.js     # Simplified IEEE 738 heat balance
    └── img/
        ├── favicon.svg
        ├── flashcards/*.svg     # vector fronts for symbol and distribution cards
        ├── profile/headshot.webp
        └── portfolio/dashboard-*.webp
```

## Common edits

| Task | Where |
| --- | --- |
| Change brand colors or fonts | `assets/css/tokens.css` |
| Edit page text | `index.html`, inside the matching `data-panel` section |
| Add, remove, or reorder dashboards | `assets/js/data/dashboards.js` |
| Add favorite books and quotes | `assets/js/data/books.js` |
| Change slideshow speed | `interval` in `assets/js/main.js` (milliseconds) |
| Add a tab | Add a link with `data-tab="name"` and a `<section data-panel="name">` in `index.html` |

Sidebar contents are generated from each panel's `<h2 id="...">` headings.

## Run locally

Open `index.html` directly in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy

1. Create a repository named `ethan-gueck.github.io` under the `ethan-gueck` account.
2. Push these files to the `main` branch.
3. In **Settings > Pages**, set the source to **Deploy from a branch**, branch `main`, folder `/ (root)`.

The site will be live at `https://ethan-gueck.github.io`.
