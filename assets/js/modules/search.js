/**
 * Site search: one box for everything. The magnifier in the tab bar (or the / key) opens it.
 * Finds, as you type:
 *   - sections of every tab (their headings), which open in place;
 *   - flashcards by ID, name or deck, which open on the card (#flashcards/<ID>);
 *   - math symbols by name, character or code, which copy to the clipboard and show their
 *     VS Code shortcut;
 *   - the reference pages (Math Review, Design philosophy) in a new tab, and IEEE Std 738 in brief.
 * Picking a section or a card is one step, where browsing took a tab, a deck and a walk.
 */
(function (Site) {
'use strict';

var PAGES = [
  { title: 'IEEE Std 738 in brief', text: 'ieee 738 heat balance conductor temperature thermal rating ampacity method', href: '#portfolio/ieee738', here: true },
  { title: 'Mathematics: A Comprehensive Review', text: 'math review pdf study edition flashcards print download', href: 'https://ethan-gueck.github.io/resources/math-review/' },
  { title: 'Design philosophy', text: 'design colour color palette typography fonts depth entropy contrast', href: 'design/' },
  { title: 'VS Code math symbol shortcuts (keybindings.json)', text: 'vs code vscode keyboard shortcuts download keybindings', href: 'assets/data/vscode-math-keybindings.json' },
];

function esc(text) {
  return String(text).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

/** 0 = exact, 1 = starts with, 2 = a word starts with, 3 = contains, -1 = no match. */
function score(q, fields) {
  var best = -1;
  fields.forEach(function (f) {
    if (!f) return;
    f = String(f).toLowerCase();
    var s = f === q ? 0 : f.indexOf(q) === 0 ? 1 : (' ' + f).indexOf(' ' + q) >= 0 ? 2 : f.indexOf(q) >= 0 ? 3 : -1;
    if (s >= 0 && (best < 0 || s < best)) best = s;
  });
  return best;
}

function chord(vs) {
  return vs.split(' ').map(function (part) {
    return part.split('+').map(function (k) { return k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1); }).join('+');
  }).join(' › ');
}

Site.initSearch = function initSearch() {
  var dlg = document.getElementById('site-search');
  var open = document.querySelector('[data-search-open]');
  if (!dlg || !open) return;
  var input = dlg.querySelector('input'), out = dlg.querySelector('[data-search-results]'), status = dlg.querySelector('[data-search-status]');

  function sections() {
    var tabLabel = {};
    document.querySelectorAll('[data-tab]').forEach(function (t) { tabLabel[t.dataset.tab] = t.textContent.trim(); });
    return Array.prototype.slice.call(document.querySelectorAll('[data-panel] h2[id]')).map(function (h) {
      var num = h.querySelector('.sec-num'), panel = h.closest('[data-panel]');
      return { id: h.id, title: h.textContent.replace(num ? num.textContent : '', '').trim(), tab: tabLabel[panel.dataset.panel] || '' };
    }).filter(function (s) { return s.id.indexOf('fc-') !== 0; });   // decks are found through their cards
  }

  function symbols() {
    var seen = {}, list = [];
    (Site.symbolGroups || []).forEach(function (g) {
      g.rows.forEach(function (r) {
        r.e.forEach(function (e) { if (e && !seen[e.c]) { seen[e.c] = 1; list.push({ c: e.c, n: e.n, u: e.u, vs: e.vs, group: g.title }); } });
      });
    });
    return list;
  }

  function top(items, q, fields, n) {
    return items.map(function (it) { return { it: it, s: score(q, fields(it)) }; })
      .filter(function (m) { return m.s >= 0; })
      .sort(function (a, b) { return a.s - b.s; })
      .slice(0, n).map(function (m) { return m.it; });
  }

  function draw() {
    var q = input.value.trim().toLowerCase();
    if (!q) { out.innerHTML = ''; status.textContent = 'Type a section, a flashcard ID or name, or a symbol (theta, ≤, 2208).'; return; }
    var groups = [
      ['Sections', top(sections(), q, function (s) { return [s.title, s.tab]; }, 5).map(function (s) {
        return '<li><a href="#' + esc(s.id) + '" data-close><span class="search__main">' + esc(s.title) + '</span><span class="search__meta">' + esc(s.tab) + '</span></a></li>';
      })],
      ['Flashcards', top(Site.flashcardIndex || [], q, function (c) { return [c.id, c.title, c.deck]; }, 6).map(function (c) {
        return '<li><a href="#flashcards/' + encodeURIComponent(c.id) + '" data-close><span class="search__id">' + esc(c.id) + '</span><span class="search__main">' + esc(c.title) + '</span><span class="search__meta">' + esc(c.deck) + '</span></a></li>';
      })],
      ['Symbols', top(symbols(), q, function (s) { return [s.c, s.n, s.u, 'u+' + s.u]; }, 6).map(function (s) {
        return '<li><button type="button" data-copy="' + esc(s.c) + '"><span class="search__sym">' + esc(s.c) + '</span><span class="search__main">' + esc(s.n) + '</span><span class="search__meta">U+' + s.u + (s.vs ? ' · VS Code ' + esc(chord(s.vs)) : '') + '</span></button></li>';
      })],
      ['Pages', top(PAGES, q, function (p) { return [p.title, p.text]; }, 3).map(function (p) {
        return p.here
          ? '<li><a href="' + esc(p.href) + '" data-close><span class="search__main">' + esc(p.title) + '</span><span class="search__meta">Pop-up</span></a></li>'
          : '<li><a href="' + esc(p.href) + '" target="_blank" rel="noopener"><span class="search__main">' + esc(p.title) + '</span><span class="search__meta">New tab</span></a></li>';
      })],
    ].filter(function (g) { return g[1].length; });
    var count = groups.reduce(function (n, g) { return n + g[1].length; }, 0);
    status.textContent = count ? count + (count === 1 ? ' result' : ' results') : 'Nothing matches “' + input.value.trim() + '”.';
    out.innerHTML = groups.map(function (g) { return '<li class="search__group"><p class="search__heading">' + g[0] + '</p><ul>' + g[1].join('') + '</ul></li>'; }).join('');
  }

  function show() {
    if (!dlg.open) dlg.showModal();
    input.value = '';
    draw();
    input.focus();
  }

  open.addEventListener('click', show);
  document.addEventListener('keydown', function (e) {
    var t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); show(); }
  });
  input.addEventListener('input', draw);
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { var first = out.querySelector('a, button'); if (first) { e.preventDefault(); first.click(); } }
  });
  out.addEventListener('click', function (e) {
    var copy = e.target.closest('[data-copy]');
    if (copy) {
      var text = copy.dataset.copy;
      var done = function () { status.textContent = 'Copied ' + text; };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { status.textContent = 'Select to copy: ' + text; });
      return;
    }
    if (e.target.closest('[data-close]')) dlg.close();
  });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });   // the backdrop
  dlg.querySelector('[data-modal-close]').addEventListener('click', function () { dlg.close(); });
};

})(window.Site = window.Site || {});
