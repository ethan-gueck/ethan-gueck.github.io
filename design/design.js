/*
 * design.js — draws the Design Philosophy page from the site's colour tokens.
 *
 * The hex values below are copied from assets/css/tokens.css (light) and assets/css/dark.css (dark);
 * every number shown (HSL hue and lightness, OKLCH lightness, hue angles, WCAG contrast) is computed
 * here from those hex values, so the page cannot drift from the maths. Also wires the moon/sun
 * toggle, which shares the portfolio's saved choice (localStorage "pp-theme").
 */
(function () {
  "use strict";

  // ---- Tokens ------------------------------------------------------------------
  const LIGHT = [
    { token: "--green-900", hex: "#072A20", role: "Darkest brand: gradients, shadows" },
    { token: "--green-800", hex: "#0B3D2E", role: "Primary: masthead and tab bar, green ink for labels and rules" },
    { token: "--green-700", hex: "#125A43", role: "Links, gradient end" },
    { token: "--green-600", hex: "#1B6E53", role: "Lightest brand step" },
    { token: "--sand-200", hex: "#E6D7C2", role: "Pale accent" },
    { token: "--sand-300", hex: "#D8C3A5", role: "Accent: primary buttons, top borders, active tab edge, accents on green" },
    { token: "--sand-500", hex: "#9C8261", role: "Section numbers, list markers, dates on white" },
    { token: "--paper", hex: "#FFFFFF", role: "Cards and the article sheet" },
    { token: "--canvas", hex: "#EEF1EF", role: "Page background (green-tinted)" },
    { token: "--rule", hex: "#CFD6D2", role: "Lines and borders" },
    { token: "--ink-soft", hex: "#45524C", role: "Secondary text" },
    { token: "--ink", hex: "#17211D", role: "Body text" },
  ];
  const DARK = [
    { token: "--green-900 → blue 900", hex: "#102a43", role: "Darkest background; the page canvas" },
    { token: "--paper", hex: "#1b334c", role: "Cards: between 900 and 800" },
    { token: "--green-800 → blue 800", hex: "#243b53", role: "Tab bar and buttons; flashcard faces" },
    { token: "--green-700 → blue 700", hex: "#334e68", role: "Rules, gradient end" },
    { token: "--green-600 → blue 600", hex: "#486581", role: "Lightest background step" },
    { token: "--ink-green-600 → blue 400", hex: "#829ab1", role: "Lightest green-ink step" },
    { token: "--ink-green-700 → blue 300", hex: "#9fb3c8", role: "Links" },
    { token: "--ink-soft → blue 200", hex: "#bcccdc", role: "Secondary text; green ink for labels and rules" },
    { token: "--ink → blue 050", hex: "#f0f4f8", role: "Body text" },
    { token: "--sand-300 → yellow 400", hex: "#e5a93c", role: "Accent: primary buttons, top borders, focus ring" },
    { token: "--sand-500 → yellow 300", hex: "#edc378", role: "Section numbers, list markers, dates on dark" },
    { token: "--sand-200 → yellow 200", hex: "#f3d7a5", role: "Pale accent" },
  ];
  const BLUE = { "050": "#f0f4f8", 100: "#d9e2ec", 200: "#bcccdc", 300: "#9fb3c8", 400: "#829ab1", 500: "#627d98", 600: "#486581", 700: "#334e68", 800: "#243b53", 900: "#102a43" };
  const YELLOW = { "050": "#fcf8ef", 100: "#f9efdc", 200: "#f3d7a5", 300: "#edc378", 400: "#e5a93c", 500: "#d8961d", 600: "#b17b18", 700: "#875d12" };
  const STEPS = ["050", "100", "200", "300", "400", "500", "600", "700"]; // object keys like 100 would sort ahead of "050"
  const CONTRAST = [
    ["Light", "Body text on paper", "#17211D", "#FFFFFF"],
    ["Light", "Body text on canvas", "#17211D", "#EEF1EF"],
    ["Light", "Secondary text on paper", "#45524C", "#FFFFFF"],
    ["Light", "Headings green on paper", "#0B3D2E", "#FFFFFF"],
    ["Light", "Sand accent on green masthead", "#D8C3A5", "#0B3D2E"],
    ["Light", "Sand-500 marks on paper", "#9C8261", "#FFFFFF"],
    ["Dark", "Body text on canvas", "#f0f4f8", "#102a43"],
    ["Dark", "Body text on cards", "#f0f4f8", "#1b334c"],
    ["Dark", "Secondary text on cards", "#bcccdc", "#1b334c"],
    ["Dark", "Yellow accent on canvas", "#e5a93c", "#102a43"],
    ["Dark", "Canvas text on yellow buttons", "#102a43", "#e5a93c"],
    ["Dark", "Yellow-300 text on cards", "#edc378", "#1b334c"],
  ];
  const SCALE = [
    ["--fs-sm", 0.875, "Labels, captions, tabs, table headers"],
    ["--fs-base", 1.125, "Body text"],
    ["--fs-md", 1.3125, "Subsections, subtitles"],
    ["--fs-lg", 1.625, "Section headings"],
    ["--fs-xl", "clamp(2.5rem, 6vw, 4.25rem)", "The masthead name: grows with the window from 2.5 to 4.25rem"],
  ];

  // ---- Colour maths -----------------------------------------------------------------
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  function hsl(hex) {
    const [r, g, b] = rgb(hex);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    if (!d) return { h: null, s: 0, l: l * 100 };
    const s = d / (1 - Math.abs(2 * l - 1));
    let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    return { h, s: s * 100, l: l * 100 };
  }
  function oklch(hex) {
    const [r, g, b] = rgb(hex).map(toLinear);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return { L: L * 100, C: Math.hypot(A, B), h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
  }
  const luminance = (hex) => { const [r, g, b] = rgb(hex).map(toLinear); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const gap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
  const f1 = (n) => n.toFixed(1);
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  // The circular mean, so hues near 0° / 360° average correctly.
  const meanHue = (hs) => { const r = Math.PI / 180; const x = mean(hs.map((h) => Math.cos(h * r))), y = mean(hs.map((h) => Math.sin(h * r))); return ((Math.atan2(y, x) / r) + 360) % 360; };
  const textOn = (hex) => (contrast(hex, "#FFFFFF") >= contrast(hex, "#17211D") ? "#FFFFFF" : "#17211D");
  const $ = (sel) => document.querySelector(sel);

  // ---- The two schemes ---------------------------------------------------------------
  const SCHEMES = {
    light: {
      brand: LIGHT.slice(0, 4).map((t) => t.hex), accent: LIGHT.slice(4, 7).map((t) => t.hex), neutrals: LIGHT.slice(7).map((t) => t.hex),
      brandName: "forest green", accentName: "sand",
    },
    dark: {
      brand: Object.values(BLUE), accent: STEPS.map((k) => YELLOW[k]), neutrals: [],
      brandName: "blue-grey", accentName: "yellow",
    },
  };

  function relationship(angle) {
    const named = [[180, "complementary", "opposite sides of the wheel"], [150, "split-complementary", "beside the opposite"], [120, "triadic", "a third of the wheel"], [90, "square", "a quarter of the wheel"], [60, "hexadic", "a sixth of the wheel"], [30, "analogous", "neighbours"]];
    const [deg, name, gloss] = named.reduce((best, n) => (Math.abs(n[0] - angle) < Math.abs(best[0] - angle) ? n : best));
    return { deg, name, gloss, off: angle - deg };
  }

  /** A colour wheel with the brand and accent hues marked and the angle between them drawn. */
  function wheel(mode) {
    const s = SCHEMES[mode], R = 120, C = 150, ring = 22;
    const brandHue = meanHue(s.brand.map((h) => hsl(h).h)), accentHue = meanHue(s.accent.map((h) => hsl(h).h));
    const pt = (deg, r) => [C + r * Math.sin((deg * Math.PI) / 180), C - r * Math.cos((deg * Math.PI) / 180)]; // 0° at the top, clockwise
    let svg = `<svg viewBox="0 0 300 300" role="img" aria-label="Colour wheel: ${s.brandName} at ${f1(brandHue)}°, ${s.accentName} at ${f1(accentHue)}°, ${f1(gap(brandHue, accentHue))}° apart">`;
    for (let d = 0; d < 360; d += 5) {
      const [x1, y1] = pt(d, R), [x2, y2] = pt(d + 5.5, R), [x3, y3] = pt(d + 5.5, R - ring), [x4, y4] = pt(d, R - ring);
      svg += `<path d="M${x1} ${y1} A${R} ${R} 0 0 1 ${x2} ${y2} L${x3} ${y3} A${R - ring} ${R - ring} 0 0 0 ${x4} ${y4}Z" fill="hsl(${d + 2.5} 55% 55%)"/>`;
    }
    // The angle between the two hues, along the shorter arc.
    let a = brandHue, b = accentHue;
    if (((b - a + 360) % 360) > 180) [a, b] = [b, a];
    const r0 = R - ring - 18, [ax, ay] = pt(a, r0), [bx, by] = pt(b, r0);
    svg += `<path d="M${C} ${C} L${ax} ${ay} A${r0} ${r0} 0 0 1 ${bx} ${by}Z" class="wheel__angle"/>`;
    const mid = a + ((b - a + 360) % 360) / 2, [mx, my] = pt(mid, r0 * 0.55);
    svg += `<text x="${mx}" y="${my}" class="wheel__label" text-anchor="middle" dominant-baseline="middle">${f1(gap(brandHue, accentHue))}°</text>`;
    const marks = [...s.brand.map((h) => [h, "brand"]), ...s.accent.map((h) => [h, "accent"])];
    for (const [hex] of marks) {
      const { h } = hsl(hex);
      const [x, y] = pt(h, R - ring / 2);
      svg += `<circle cx="${x}" cy="${y}" r="7" fill="${hex}" class="wheel__dot"><title>${hex}: hue ${f1(h)}°</title></circle>`;
    }
    for (const [hue, name] of [[brandHue, s.brandName], [accentHue, s.accentName]]) {
      const [x1, y1] = pt(hue, R - ring - 2), [x2, y2] = pt(hue, R + 4), [lx, ly] = pt(hue, R + 18);
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="wheel__ray"/>`;
      svg += `<text x="${lx}" y="${ly}" class="wheel__name" text-anchor="middle" dominant-baseline="middle">${f1(hue)}°</text>`;
    }
    svg += "</svg>";
    $(`[data-wheel="${mode}"]`).innerHTML = svg + `<figcaption>HSL hue wheel (0° at the top, clockwise). Dots are every ${s.brandName} and ${s.accentName} step; the wedge is the angle between the two families.</figcaption>`;
    return { brandHue, accentHue };
  }

  function geometry(mode, { brandHue, accentHue }) {
    const s = SCHEMES[mode];
    const angle = gap(brandHue, accentHue), rel = relationship(angle);
    const okAngle = gap(meanHue(s.brand.map((h) => oklch(h).h)), meanHue(s.accent.map((h) => oklch(h).h)));
    const spread = (hexes) => { const hs = hexes.map((h) => hsl(h).h); const m = meanHue(hs); return Math.max(...hs.map((h) => gap(h, m))); };
    const items = [
      `<strong>Two hue families, ${f1(angle)}° apart.</strong> The ${s.brandName} family averages ${f1(brandHue)}° and the ${s.accentName} family ${f1(accentHue)}°. That is ${Math.abs(rel.off) < 1 ? "" : `${f1(Math.abs(rel.off))}° ${rel.off > 0 ? "past" : "short of"} `}a ${rel.name} pair (${rel.deg}°, ${rel.gloss}). Measured perceptually (OKLCH hue) the gap is ${f1(okAngle)}°.`,
      `<strong>Each family is one hue.</strong> Every ${s.brandName} step stays within ${f1(spread(s.brand))}° of its average and every ${s.accentName} step within ${f1(spread(s.accent))}°; the steps differ only in lightness and saturation.`,
    ];
    if (s.neutrals.length) {
      const tinted = s.neutrals.filter((h) => hsl(h).h !== null);
      items.push(`<strong>Tinted neutrals.</strong> The canvas, rules and inks sit at hues ${tinted.map((h) => f1(hsl(h).h) + "°").join(", ")}, within ${f1(Math.max(...tinted.map((h) => gap(hsl(h).h, brandHue))))}° of the brand green, at only ${f1(Math.min(...tinted.map((h) => hsl(h).s)))}–${f1(Math.max(...tinted.map((h) => hsl(h).s)))}% saturation: grey with a trace of green.`);
    } else {
      items.push(`<strong>Neutrals come from the brand family.</strong> The canvas, cards, rules and text are all blue-grey steps, so in dark mode there is no separate grey at all.`);
    }
    $(`[data-geometry="${mode}"]`).innerHTML = `<ul class="prose-list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  }

  function swatches(mode) {
    const list = mode === "light" ? LIGHT : DARK;
    $(`[data-swatches="${mode}"]`).innerHTML = list.map((t) => {
      const h = hsl(t.hex), o = oklch(t.hex);
      return `<div class="swatch-card"><div class="swatch-card__chip" style="background:${t.hex};color:${textOn(t.hex)}">${t.hex.toUpperCase()}</div>
        <p class="swatch-card__token"><code>${t.token}</code></p><p class="swatch-card__role">${t.role}</p>
        <p class="swatch-card__nums">HSL ${h.h === null ? "–" : f1(h.h) + "°"} · ${f1(h.s)}% · ${f1(h.l)}%<br>OKLCH L ${f1(o.L)} · C ${o.C.toFixed(3)}</p></div>`;
    }).join("");
  }

  function ramp() {
    const steps = LIGHT.slice(0, 4); // 900 → 600: darkest to lightest
    const ls = steps.map((t) => hsl(t.hex).l);
    $("[data-ramp]").innerHTML = `<div class="ramp">${steps.map((t, i) => `<div class="ramp__step"><span class="ramp__bar" style="height:${ls[i] * 4}px;background:${t.hex}"></span><span class="ramp__label"><code>${t.token.slice(2)}</code><br>L ${f1(ls[i])}%${i ? ` (+${f1(ls[i] - ls[i - 1])})` : ""}</span></div>`).join("")}</div>
      <p>From darkest to lightest the greens climb ${ls.slice(1).map((l, i) => f1(l - ls[i])).join(", ")} points of HSL lightness while the hue moves only ${f1(gap(hsl(steps[0].hex).h, hsl(steps[3].hex).h))}°: a monochrome ladder, so any two greens always look related.</p>`;
  }

  function noteFor() {
    const keys = STEPS, d = (k) => hsl(YELLOW[k]).l - hsl(BLUE[k]).l;
    const close = keys.filter((k) => Math.abs(d(k)) <= 1), off = keys.filter((k) => Math.abs(d(k)) > 1);
    return `Highlighted rows are within one point of lightness: steps ${close.join(", ")}. ` +
      (off.length ? `The others differ by ${off.map((k) => `${f1(Math.abs(d(k)))} at ${k}`).join(", ")}; 400 is the source colour <code>#E5A93C</code> itself.` : "Every step matches.");
  }

  function ladder() {
    const rows = STEPS.map((k) => {
      const yl = hsl(YELLOW[k]).l, bl = hsl(BLUE[k]).l, d = yl - bl;
      return `<tr><td>${k}</td><td><span class="dot" style="background:${BLUE[k]}"></span>${f1(bl)}%</td><td><span class="dot" style="background:${YELLOW[k]}"></span>${f1(yl)}%</td><td class="num ${Math.abs(d) <= 1 ? "is-match" : ""}">${d >= 0 ? "+" : ""}${f1(d)}</td></tr>`;
    }).join("");
    $("[data-ladder]").innerHTML = `<table class="data-table"><thead><tr><th>Step</th><th>Blue-grey lightness</th><th>Yellow lightness</th><th class="num">Difference</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="design-note">${noteFor()}</p>`;
  }

  function contrastTable() {
    const rows = CONTRAST.map(([mode, label, fg, bg]) => {
      const r = contrast(fg, bg), grade = r >= 7 ? "AAA" : r >= 4.5 ? "AA" : r >= 3 ? "Large text only" : "Fails";
      return `<tr><td>${mode}</td><td>${label}</td><td><span class="pair" style="color:${fg};background:${bg}">Aa</span></td><td class="num">${r.toFixed(2)}:1</td><td>${grade}</td></tr>`;
    }).join("");
    $("[data-contrast]").innerHTML = `<table class="data-table"><thead><tr><th>Mode</th><th>Pair</th><th>Sample</th><th class="num">Ratio</th><th>WCAG</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function scale() {
    const rows = SCALE.map(([token, rem, use], i) => {
      const prev = i && typeof SCALE[i - 1][1] === "number" && typeof rem === "number" ? `×${(rem / SCALE[i - 1][1]).toFixed(3)}` : "";
      const size = typeof rem === "number" ? `${rem}rem (${rem * 16}px)` : rem;
      return `<tr><td><code>${token}</code></td><td>${size}</td><td class="num">${prev}</td><td>${use}</td></tr>`;
    }).join("");
    $("[data-scale]").innerHTML = `<table class="data-table"><thead><tr><th>Token</th><th>Size</th><th class="num">Step up</th><th>Used for</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  // ---- Theme toggle (shared with the portfolio) ----------------------------------------
  const button = document.querySelector("[data-theme-toggle]");
  const isDark = () => document.documentElement.dataset.theme === "dark";
  function apply(mode) {
    if (mode === "dark") document.documentElement.dataset.theme = "dark"; else delete document.documentElement.dataset.theme;
    document.querySelector('meta[name="theme-color"]').content = mode === "dark" ? "#102a43" : "#0B3D2E";
    button.setAttribute("aria-pressed", String(mode === "dark"));
    button.setAttribute("aria-label", mode === "dark" ? "Switch to light mode" : "Switch to dark mode");
    button.title = mode === "dark" ? "Light mode" : "Dark mode";
  }
  button.addEventListener("click", () => {
    const mode = isDark() ? "light" : "dark";
    try { localStorage.setItem("pp-theme", mode); } catch (e) { /* private mode */ }
    apply(mode);
  });
  window.addEventListener("storage", (e) => { if (e.key === "pp-theme") apply(e.newValue === "dark" ? "dark" : "light"); });
  apply(isDark() ? "dark" : "light");

  // ---- 6. Depth ---------------------------------------------------------------------
  // Shadows as written in the CSS (tokens.css, article.css, flashcards.css, modal.css, lightbox.css), lowest first.
  const ELEVATION = [
    { layer: "Page canvas", where: "body", shadow: "none", note: "The ground everything sits on." },
    { layer: "Article sheet", where: "--shadow-paper", shadow: "0 1px 2px rgba(var(--shade-rgb), 0.06), 0 8px 24px rgba(var(--shade-rgb), 0.06)", note: "Two layers: a tight contact shadow and a soft ambient one." },
    { layer: "Cards", where: "outcome and reference cards", shadow: "0 6px 16px rgba(var(--shade-rgb), 0.12)", note: "Lift 2px on hover." },
    { layer: "Flashcards", where: ".fcard__face", shadow: "0 10px 26px rgba(var(--shade-rgb), 0.14)", note: "The object you handle: the deepest resting shadow." },
    { layer: "Dialogs", where: ".modal", shadow: "0 24px 60px rgba(var(--shade-rgb), 0.35)", note: "Above everything; the page behind is dimmed by a 72% shade backdrop (92% for the image viewer)." },
  ];
  function depth() {
    $("[data-depth-demo]").innerHTML = ELEVATION.map((e, i) => `<div class="depth-demo__layer" style="box-shadow:${e.shadow === "none" ? "none" : e.shadow};z-index:${i};"><span>${i}</span>${e.layer}</div>`).join("");
    const rows = ELEVATION.map((e, i) => {
      const m = e.shadow.match(/0 (\d+)px (\d+)px rgba\(var\(--shade-rgb\), ([\d.]+)\)(?!.*0 \d+px \d+px rgba)/);
      return `<tr><td class="num">${i}</td><td>${e.layer}</td><td><code>${e.where}</code></td><td class="num">${m ? m[1] + "px" : "–"}</td><td class="num">${m ? m[2] + "px" : "–"}</td><td class="num">${m ? Math.round(m[3] * 100) + "%" : "–"}</td><td>${e.note}</td></tr>`;
    }).join("");
    $("[data-elevation]").innerHTML = `<table class="data-table"><thead><tr><th class="num">Level</th><th>Surface</th><th>Where</th><th class="num">Drop</th><th class="num">Blur</th><th class="num">Opacity</th><th>Note</th></tr></thead><tbody>${rows}</tbody></table>`;
    const dark = [["canvas", "#102a43"], ["paper (cards, the article sheet)", "#1b334c"], ["face (flashcards, buttons)", "#243b53"]];
    $("[data-dark-depth]").innerHTML = `<strong>In dark mode, height is also lightness.</strong> Shadows barely show on a dark ground, so each layer up is a lighter blue-grey: ${dark.map(([n, h]) => `${n} L ${f1(hsl(h).l)}%`).join(" → ")}. Light mode needs only a small step (canvas L ${f1(hsl("#EEF1EF").l)}% → paper ${f1(hsl("#FFFFFF").l)}%) because its shadows do the work.`;
  }

  // ---- 7. Information entropy, measured from the portfolio itself -----------------------
  const bits = (n) => Math.log2(n);
  const loadScript = (src) => new Promise((ok, fail) => { const t = document.createElement("script"); t.src = src; t.onload = ok; t.onerror = fail; document.head.appendChild(t); });
  const WPM = 238; // Brysbaert (2019): adult silent reading, non-fiction
  const BREADTH = 8; // Miller (1981), Kiger (1984): two levels of about eight

  async function entropy() {
    window.Site = window.Site || {};
    const [html] = await Promise.all([
      fetch("../index.html").then((r) => r.text()),
      loadScript("../assets/js/data/flashcards.js"), loadScript("../assets/js/data/neurons.js"), loadScript("../assets/js/data/symbols.js"),
    ]);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const tabs = [...doc.querySelectorAll(".tabs__tab")].map((a) => ({ label: a.textContent.trim(), panel: doc.getElementById("panel-" + a.dataset.tab) }));
    const decks = Site.flashcards, tracks = Site.neuronTracks, groups = Site.symbolGroups;
    const cardsTotal = decks.reduce((n, d) => n + d.cards.length, 0);
    const symbols = groups.map((g) => g.rows.reduce((n, r) => n + r.e.filter(Boolean).length, 0));
    const symbolsTotal = symbols.reduce((a, b) => a + b, 0);
    const symbolsUnique = new Set(groups.flatMap((g) => g.rows.flatMap((r) => r.e.filter(Boolean).map((e) => e.c)))).size; // a few appear in two groups
    const sections = tabs.map((t) => t.panel.querySelectorAll(":scope > h2").length);
    const words = tabs.map((t) => { const c = t.panel.cloneNode(true); c.querySelectorAll("script, style, svg, table").forEach((n) => n.remove()); return (c.textContent.match(/\S+/g) || []).length; });

    // Bits per decision
    const rowsB = [
      ["Pick a tab", tabs.length, `${tabs.length} tabs`],
      ["Pick a section in a tab", mean(sections), `${f1(mean(sections))} on average, ${Math.max(...sections)} at most`],
      ["Pick a flashcard deck", decks.length, `${decks.length} decks`],
      ["Pick a card in a deck", mean(decks.map((d) => d.cards.length)), `${f1(mean(decks.map((d) => d.cards.length)))} cards on average`],
      ["Pick a neuron track", tracks.length, `${tracks.length} tracks`],
      ["Pick a symbol group", groups.length, `${groups.length} groups`],
      ["Pick a symbol in a group", mean(symbols), `${f1(mean(symbols))} symbols on average`],
    ];
    $("[data-bits]").innerHTML = `<table class="data-table"><thead><tr><th>Decision</th><th>Options <var>n</var></th><th class="num">Bits, log<sub>2</sub> <var>n</var></th><th class="num">Hick–Hyman, log<sub>2</sub>(<var>n</var> + 1)</th></tr></thead><tbody>${
      rowsB.map(([what, n, desc]) => `<tr><td>${what}</td><td>${desc}</td><td class="num">${bits(n).toFixed(2)}</td><td class="num">${bits(n + 1).toFixed(2)}</td></tr>`).join("")
    }<tr class="is-final"><td>Single out one flashcard of all ${cardsTotal}</td><td>${cardsTotal} cards</td><td class="num">${bits(cardsTotal).toFixed(2)}</td><td class="num"></td></tr></tbody></table>`;

    // How much can someone absorb
    $("[data-absorb]").innerHTML = `<table class="data-table"><thead><tr><th>Tab</th><th class="num">Sections</th><th class="num">Words</th><th class="num">Reading time</th></tr></thead><tbody>${
      tabs.map((t, i) => `<tr><td>${t.label}</td><td class="num ${sections[i] > 4 ? "is-over" : ""}">${sections[i]}</td><td class="num">${words[i].toLocaleString()}</td><td class="num">${(words[i] / WPM).toFixed(1)} min</td></tr>`).join("")
    }<tr class="is-final"><td>All tabs</td><td class="num">${sections.reduce((a, b) => a + b, 0)}</td><td class="num">${words.reduce((a, b) => a + b, 0).toLocaleString()}</td><td class="num">${(words.reduce((a, b) => a + b, 0) / WPM).toFixed(0)} min</td></tr></tbody></table>`;
    const over = tabs.filter((t, i) => sections[i] > 4).map((t) => t.label);
    $("[data-absorb-note]").innerHTML = `Words count the page's own text; the flashcards, the network and the symbol reference are drawn by script and come on top. ${over.length
      ? `${over.length} of ${tabs.length} tabs (${over.join(", ")}) have more than four sections, more than working memory holds as a map at once; on those the Contents sidebar keeps the outline on screen, so it is read rather than remembered.`
      : "Every tab has four sections or fewer, which fits in working memory as a map."} The tab bar's ${tabs.length} options exceed four too, but stay visible.`;

    // Clicks to each kind of detail
    // Flashcards: arrows wrap, so the shortest walk to the card j places from the first is min(j, n − j).
    const walk = decks.reduce((sum, d) => { const n = d.cards.length; let s = 0; for (let j = 0; j < n; j++) s += Math.min(j, n - j); return sum + s; }, 0) / cardsTotal;
    const longest = Math.max(...decks.map((d) => Math.floor(d.cards.length / 2)));
    const greekShare = symbols[0] / symbolsTotal;
    const ideal = (N) => Math.max(1, Math.ceil(Math.log(N) / Math.log(BREADTH)));
    const paths = [
      ["A summary of Ethan's work", 0, "The Summary tab opens first", 1],
      ["Any section of a tab", 1, "Tab, then scroll or the Contents sidebar", sections.reduce((a, b) => a + b, 0)],
      ["A symbol's shortcut", 3 + (1 - greekShare), "Misc → open the reference → open its group (Greek starts open) → select to copy", symbolsUnique],
      ["A section of the Math Review", 3, "Misc → the card (new tab) → Jump to section", 17],
      ["An interactive neuron page", 4, "Ethan's NN → track → neuron → See how it works (new tab)", cardsTotal],
      ["A flashcard's answer", 2 + walk, `My Flashcards → arrows to the card (${f1(walk)} on average, ${longest} at most) → flip`, cardsTotal],
      ["A card's stated equation", 3 + walk, "As above, then the ? button", cardsTotal],
    ];
    $("[data-clicks]").innerHTML = `<table class="data-table"><thead><tr><th>Detail</th><th class="num">Clicks</th><th>Path</th><th class="num">Items <var>N</var></th><th class="num">⌈log<sub>8</sub> <var>N</var>⌉</th></tr></thead><tbody>${
      paths.map(([what, c, how, N]) => `<tr><td>${what}</td><td class="num ${c > ideal(N) + 1 ? "is-over" : ""}">${Number.isInteger(c) ? c : f1(c)}</td><td>${how}</td><td class="num">${N}</td><td class="num">${N > 1 ? ideal(N) : 0}</td></tr>`).join("")
    }</tbody></table>`;
    $("[data-clicks-note]").innerHTML = `The last column is the depth a breadth of ${BREADTH} would need for that many items. Most branches sit at or within one click of it. The exception is the flashcard walk: a deck is a line, not a tree, so reaching one card takes ${f1(walk)} arrow presses on average, which suits studying a deck in order but not looking one card up. The section numbers in the Math Review come from its outline (17 sections); everything else is counted from the live site.`;
  }

  for (const mode of ["light", "dark"]) { geometry(mode, wheel(mode)); swatches(mode); }
  ramp(); ladder(); contrastTable(); scale(); depth();
  entropy().catch((e) => { console.error(e); document.querySelectorAll("[data-bits], [data-absorb], [data-clicks]").forEach((el) => { el.textContent = "Could not load the portfolio's pages to measure them."; }); });
})();
