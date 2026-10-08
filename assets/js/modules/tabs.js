/**
 * Tab router. Each tab link has data-tab="name"; each panel has data-panel="name".
 * Clicking a tab updates the URL hash (so /#portfolio deep links work and the back
 * button moves between tabs) without jumping the page. A hash can also name a section
 * (#p-ieee), or a tab and a detail inside it (#flashcards/A1.13), which is announced as a
 * "site:detail" event for the tab's module to open. Hashes of tabs that were merged still work.
 */
(function (Site) {
'use strict';

Site.initTabs = function initTabs(options) {
  var onChange = (options && options.onChange) || function () {};
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
  var panels = {};
  document.querySelectorAll('[data-panel]').forEach(function (p) { panels[p.dataset.panel] = p; });
  var fallback = tabs[0].dataset.tab;
  var bar = document.querySelector('.tabs');
  var list = document.querySelector('.tabs__list');
  var current = null;
  // Tabs merged in October 2026: old links land where their content now lives.
  var MOVED = { 't-ieee738': 'portfolio/ieee738', technical: 't-stack', misc: 'margins', notes: 'margins', articles: 'w-articles', 't-refs': 'p-refs', 't-ref-1': 'p-ref-1', 'r-new-window': 'r-new-tab' };

  function show(name) {
    if (!panels[name]) name = fallback;
    if (name === current) return;
    var first = current === null;

    tabs.forEach(function (t) {
      var active = t.dataset.tab === name;
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
    });
    Object.keys(panels).forEach(function (key) {
      var panel = panels[key];
      var active = key === name;
      panel.hidden = !active;
      if (active && !first) {
        panel.classList.remove('is-entering');
        void panel.offsetWidth; // restart the entrance animation
        panel.classList.add('is-entering');
      }
    });

    current = name;
    // On narrow screens the tab bar scrolls sideways: bring the selected tab into view.
    var activeTab = tabs.filter(function (t) { return t.dataset.tab === name; })[0];
    if (list && activeTab && list.scrollWidth > list.clientWidth) {
      list.scrollTo({ left: activeTab.offsetLeft - (list.clientWidth - activeTab.offsetWidth) / 2, behavior: first ? 'auto' : 'smooth' });
    }
    var label = tabs.filter(function (t) { return t.dataset.tab === name; })[0].textContent;
    document.title = label + ' | Ethan Gueck';

    // If the reader has scrolled into the page, open the new tab at its top with the tab bar pinned.
    // If the header is still in view, leave the scroll position alone so the page doesn't jump.
    if (!first && bar) {
      // The bar is sticky, so measure where it sits in the flow: directly below the masthead.
      var head = document.querySelector('.masthead');
      var barTop = head ? head.getBoundingClientRect().bottom + window.scrollY : 0;
      if (window.scrollY > barTop) window.scrollTo({ top: barTop, behavior: 'instant' });
    }
    onChange(name, panels[name]);
  }

  function hashName() {
    try { return decodeURIComponent(location.hash.slice(1)); } catch (e) { return ''; }
  }

  // A hash can name a tab (#portfolio) or a section inside one (#p-projects).
  function route() {
    var hash = hashName();
    if (MOVED[hash]) { hash = MOVED[hash]; try { history.replaceState(null, '', '#' + hash); } catch (e) { /* sandboxed */ } }
    var slash = hash.indexOf('/');
    if (slash > 0 && panels[hash.slice(0, slash)]) {
      var tab = hash.slice(0, slash), detail = hash.slice(slash + 1);
      show(tab);
      document.dispatchEvent(new CustomEvent('site:detail', { detail: { tab: tab, id: detail } }));
      return;
    }
    if (!hash || panels[hash]) return show(hash || fallback);
    var target = document.getElementById(hash);
    var owner = target && target.closest('[data-panel]');
    if (owner) {
      show(owner.dataset.panel);
      requestAnimationFrame(function () { target.scrollIntoView(); });
    } else {
      show(fallback);
    }
  }

  function select(name, focusTab) {
    try { history.pushState(null, '', '#' + name); } catch (e) { /* sandboxed viewers */ }
    show(name);
    if (focusTab) tabs.filter(function (t) { return t.dataset.tab === name; })[0].focus();
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function (e) {
      e.preventDefault();
      select(tab.dataset.tab);
    });
    tab.addEventListener('keydown', function (e) {
      var step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      e.preventDefault();
      select(tabs[(i + step + tabs.length) % tabs.length].dataset.tab, true);
    });
  });

  window.addEventListener('popstate', route);
  window.addEventListener('hashchange', route);
  route();

  return { show: select };
};

})(window.Site = window.Site || {});
