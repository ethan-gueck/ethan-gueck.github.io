/**
 * References tab. Two kinds of panel:
 *   - In-page (data-ref-toggle="id"): opens a reference below the panels, here on the page.
 *     The keyboard reference is built from data/symbols.js the first time it opens: every symbol
 *     with its Unicode code point and how to type it on Windows or Mac (a switch shows one), in
 *     collapsible groups with only the first open, paired forms (capital and lowercase,
 *     superscript and subscript) on one line, searchable, and a click on a symbol copies it.
 *   - New tab: a plain link (target="_blank") to a resource on its own page.
 */
(function (Site) {
'use strict';

function esc(text) {
  return String(text).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

var OS_KEY = 'pp-keys-os';

// VS Code (the default) works the same on every system once the keybindings file is installed.
function defaultOs() {
  try { var saved = localStorage.getItem(OS_KEY); if (saved === 'vs' || saved === 'mac' || saved === 'win') return saved; } catch (e) {}
  return 'vs';
}

var KEY_NAMES = { right: '→', left: '←', up: '↑', down: '↓', '`': '`' };

/** "alt+l shift+a" → two keys to press in turn: Alt+L, then Shift+A. */
function chordHtml(chord) {
  return chord.split(' ').map(function (part) {
    return '<kbd>' + esc(part.split('+').map(function (k) {
      if (KEY_NAMES[k]) return KEY_NAMES[k];
      return k.length === 1 ? k.toUpperCase() : k.charAt(0).toUpperCase() + k.slice(1);
    }).join('+')) + '</kbd>';
  }).join('<span class="kx__then" aria-label="then">›</span>');
}

/**
 * One line per view (the switch shows one): VS Code the Alt shortcut, Windows the Unicode code,
 * Mac the Option key or, without one, Option + hex (Unicode Hex Input).
 */
function keysFor(entry) {
  var mac = entry.mac ? '<kbd>' + esc(entry.mac) + '</kbd>' : '<kbd>' + esc(entry.hex) + '</kbd>';
  return '<span class="kx__key" data-os-only="vs">' + chordHtml(entry.vs) + '</span>' +
    '<span class="kx__code" data-os-only="win">U+' + entry.u + '</span>' +
    '<span class="kx__key" data-os-only="mac">' + mac + '</span>';
}

function entryHtml(entry) {
  if (!entry) return '<div class="kx kx--none" aria-hidden="true"><span class="kx__none">–</span></div>';
  // Superscripts and subscripts sit on a faint x (x², x₁) so the raise or drop is visible; only the symbol is copied.
  var base = /^(Super|Sub)script /.test(entry.n) ? '<span class="keys__base" aria-hidden="true">x</span>' : '';
  return '<div class="kx">' +
    '<button class="keys__sym" type="button" data-copy="' + esc(entry.c) + '" title="Copy ' + esc(entry.n) + '" aria-label="Copy ' + esc(entry.n) + '">' + base + esc(entry.c) + '</button>' +
    '<div class="kx__info">' + keysFor(entry) + '</div></div>';
}

function group(g, open) {
  var cols = g.cols || [];
  var tiles = g.rows.map(function (row) {
    var search = [row.n, g.title].concat(row.e.filter(Boolean).map(function (e) { return e.c + ' ' + e.n + ' ' + e.u; })).join(' ').toLowerCase();
    return '<li class="kt" data-search="' + esc(search) + '">' +
      '<p class="kt__name">' + esc(row.n) + '</p><div class="kt__entries">' +
      row.e.map(entryHtml).join('') + '</div>' +
      // Look-alike warnings (Mac Option keys, Windows Alt codes) run across the bottom of the tile, not inside a column.
      '</li>';
  }).join('');
  var count = g.rows.reduce(function (n, row) { return n + row.e.filter(Boolean).length; }, 0);
  return '<details class="keys__group" id="keys-' + g.id + '"' + (open ? ' open' : '') + ' data-group>' +
    '<summary class="keys__title"><span>' + esc(g.title) + '</span><span class="keys__count">' + count + '</span></summary>' +
    '<p class="keys__intro">' + esc(g.intro) + '</p>' +
    (cols.length ? '<p class="keys__legend">Each line: ' + cols.map(esc).join(' · ') + '</p>' : '') +
    '<ul class="kt-grid' + (cols.length ? ' kt-grid--pair' : '') + '">' + tiles + '</ul></details>';
}

function buildKeys(root, groups) {
  var body = root.querySelector('[data-keys]');
  var jump = root.querySelector('[data-keys-jump]');
  // Only the first group starts open; the rest are minimized.
  body.innerHTML = groups.map(function (g, i) { return group(g, i === 0); }).join('');
  jump.innerHTML = groups.map(function (g) { return '<a href="#keys-' + g.id + '">' + esc(g.title) + '</a>'; }).join('');
  var sections = Array.prototype.slice.call(body.querySelectorAll('[data-group]'));

  jump.addEventListener('click', function (e) {
    var link = e.target.closest('a');
    if (!link) return;
    e.preventDefault();
    var section = document.getElementById(link.hash.slice(1));
    section.open = true;
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  root.querySelectorAll('[data-keys-all]').forEach(function (button) {
    button.addEventListener('click', function () {
      var open = button.dataset.keysAll === 'open';
      sections.forEach(function (s) { s.open = open; });
    });
  });

  // VS Code / Windows / Mac switch: shows one way of typing, remembered for next time.
  var switcher = root.querySelector('[data-keys-os]');
  function setOs(os) {
    root.dataset.os = os;
    switcher.querySelectorAll('input').forEach(function (input) { input.checked = input.value === os; });
  }
  setOs(defaultOs());
  switcher.addEventListener('change', function (e) {
    setOs(e.target.value);
    try { localStorage.setItem(OS_KEY, e.target.value); } catch (err) { /* private mode */ }
  });

  // Search opens the groups with matches; clearing it restores what was open before.
  var status = root.querySelector('[data-keys-status]');
  var search = root.querySelector('[data-keys-search]');
  var before = null;
  search.addEventListener('input', function () {
    var q = search.value.trim().toLowerCase();
    if (q && !before) before = sections.map(function (s) { return s.open; });
    var shown = 0;
    sections.forEach(function (section, i) {
      var any = false;
      section.querySelectorAll('[data-search]').forEach(function (tile) {
        var hit = !q || tile.dataset.search.indexOf(q) !== -1;
        tile.hidden = !hit;
        if (hit) { any = true; shown += 1; }
      });
      section.hidden = !any;
      if (q) section.open = any;
      else if (before) section.open = before[i];
    });
    if (!q) before = null;
    status.textContent = q ? shown + (shown === 1 ? ' match' : ' matches') + ' for “' + search.value.trim() + '”' : '';
  });

  body.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var text = btn.dataset.copy;
    var done = function () {
      status.textContent = 'Copied ' + text;
      btn.classList.add('is-copied');
      setTimeout(function () { btn.classList.remove('is-copied'); }, 900);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { status.textContent = 'Select the symbol to copy it: ' + text; });
    else status.textContent = 'Select the symbol to copy it: ' + text;
  });
}

Site.initReferences = function initReferences(panel, groups) {
  if (!panel) return;
  var built = {};

  panel.querySelectorAll('[data-ref-toggle]').forEach(function (button) {
    var target = document.getElementById(button.dataset.refToggle);
    if (!target) return;
    button.addEventListener('click', function () {
      var open = target.hidden;
      // One in-page reference open at a time.
      panel.querySelectorAll('[data-ref-toggle]').forEach(function (b) {
        b.setAttribute('aria-expanded', 'false');
        var t = document.getElementById(b.dataset.refToggle);
        if (t) t.hidden = true;
      });
      if (!open) return;
      if (!built[target.id] && target.querySelector('[data-keys]')) { buildKeys(target, groups || []); built[target.id] = true; }
      target.hidden = false;
      button.setAttribute('aria-expanded', 'true');
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  panel.querySelectorAll('[data-ref-close]').forEach(function (button) {
    button.addEventListener('click', function () {
      var target = button.closest('.ref-view');
      target.hidden = true;
      var opener = panel.querySelector('[data-ref-toggle="' + target.id + '"]');
      if (opener) { opener.setAttribute('aria-expanded', 'false'); opener.focus(); }
    });
  });

};

})(window.Site = window.Site || {});
