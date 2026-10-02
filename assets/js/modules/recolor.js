/**
 * Recolour SVG drawings (flashcard fronts) for the active theme, without a second set of images.
 *
 * A drawing is made for the light theme. For any other theme, its SVG text is fetched once and
 * every colour in it is swapped before it is shown:
 *   - colours listed in the theme's `colors` map (the brand green and sand) are replaced directly;
 *   - neutral greys are re-mapped by lightness between the theme's `ink` and `face`, so white
 *     paper becomes the card face and black lines become the text colour;
 *   - any other colour is left as drawn.
 * Adding a theme means adding an entry to Site.imagePalettes, nothing else.
 */
(function (Site) {
'use strict';

Site.imagePalettes = {
  dark: {
    face: '#243b53',   // the card face in dark mode (dark.css --face)
    ink: '#f0f4f8',
    // The drawings' top bar fades brand green into sand; as on the text cards, that becomes card blue into yellow.
    colors: { '#0b3d2e': '#243b53', '#d8c3a5': '#e5a93c' },
  },
};

var COLOR = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgb\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*\)/g;

function parse(text) {
  if (text[0] === '#') {
    var h = text.length === 4 ? text.slice(1).split('').map(function (c) { return c + c; }).join('') : text.slice(1);
    return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; });
  }
  return text.replace(/rgb\(|\)/g, '').split(',').map(function (part) {
    var v = parseFloat(part);
    return part.indexOf('%') >= 0 ? v / 100 : v / 255;
  });
}

function hex(rgb) {
  return '#' + rgb.map(function (v) { return Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0'); }).join('');
}

/** The SVG source with its colours swapped for `palette`. */
Site.recolorSvg = function recolorSvg(source, palette) {
  var face = parse(palette.face), ink = parse(palette.ink), map = palette.colors || {};
  return source.replace(COLOR, function (match) {
    var rgb = parse(match), key = hex(rgb);
    if (map[key]) return map[key];
    var lo = Math.min.apply(null, rgb), hi = Math.max.apply(null, rgb);
    if (hi - lo > 0.04) return match;                       // a real colour: keep it
    var light = (lo + hi) / 2;                              // 0 = black ink, 1 = white paper
    return hex(ink.map(function (c, i) { return c + (face[i] - c) * light; }));
  });
};

var cache = {};

/**
 * Call `use(url)` with `src` drawn for the current theme: the original file in light mode,
 * otherwise a recoloured copy (fetched and converted once per theme). Falls back to the
 * original if the file can't be fetched (e.g. the page was opened straight from disk).
 */
Site.themedImage = function themedImage(src, use) {
  var mode = document.documentElement.dataset.theme || 'light';
  var palette = Site.imagePalettes[mode];
  if (!palette || !/\.svg(\?|$)/.test(src)) { use(src); return; }
  var key = mode + ' ' + src;
  if (!cache[key]) {
    cache[key] = fetch(src)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then(function (text) { return URL.createObjectURL(new Blob([Site.recolorSvg(text, palette)], { type: 'image/svg+xml' })); })
      .catch(function () { return src; });
  }
  cache[key].then(use);
};

})(window.Site = window.Site || {});
