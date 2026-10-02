/**
 * Light / dark mode. The moon/sun button in the tab bar sets <html data-theme="dark"> (dark.css)
 * and remembers the choice in localStorage under "pp-theme". The topic sites
 * (ethan-gueck.github.io/<domain>/…) share this origin and read the same key, so a neuron
 * opened in dark mode opens dark. A small inline script in <head> applies the saved choice
 * before first paint; this module wires the button and tells canvases to recolour.
 */
(function (Site) {
'use strict';

var KEY = 'pp-theme';

function current() { return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'; }

function apply(mode) {
  if (mode === 'dark') document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = mode === 'dark' ? '#102a43' : '#0B3D2E';
  document.dispatchEvent(new CustomEvent('site:theme', { detail: mode }));
}

Site.initTheme = function initTheme() {
  var button = document.querySelector('[data-theme-toggle]');
  function label() {
    var dark = current() === 'dark';
    if (!button) return;
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    button.title = dark ? 'Light mode' : 'Dark mode';
  }
  apply(current());
  label();
  if (button) button.addEventListener('click', function () {
    var mode = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, mode); } catch (e) { /* private mode: still switch for this visit */ }
    apply(mode);
    label();
  });
  // Another tab (or a topic page) changed the setting.
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { apply(e.newValue === 'dark' ? 'dark' : 'light'); label(); }
  });
};

})(window.Site = window.Site || {});
