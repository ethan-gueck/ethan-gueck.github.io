/**
 * Stated-equation popup (#stated-equation), opened from a flashcard's ? button.
 *
 *   Terms            every symbol in the card's equations and what it means; terms that are
 *                    themselves functions (sin, Σ, f(x) …) are marked and explained.
 *   Stated-equations each equation written out the way it is said.
 *   Explanation      what the formula or algorithm does, and where it came from.
 *   Implementations  common library functions and tools that compute it (tab hidden when none).
 *
 * The wording lives in data/stated.js (Site.statedEquations, keyed by card id). It is
 * loaded the first time the popup opens, so the flashcards tab doesn't pay for it up front.
 */
(function (Site) {
'use strict';

var DATA_SRC = 'assets/js/data/stated.js';
var loading = null;

function loadData() {
  if (Site.statedEquations) return Promise.resolve(Site.statedEquations);
  if (!loading) {
    loading = new Promise(function (resolve, reject) {
      var tag = document.createElement('script');
      tag.src = DATA_SRC;
      tag.onload = function () { resolve(Site.statedEquations || {}); };
      tag.onerror = function () { loading = null; reject(new Error('Could not load ' + DATA_SRC)); };
      document.head.appendChild(tag);
    });
  }
  return loading;
}

function el(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

Site.initStated = function initStated() {
  var dlg = document.getElementById('stated-equation');
  if (!dlg) return;
  var tabs = dlg.querySelectorAll('[data-stated-tab]');
  var panels = {};
  dlg.querySelectorAll('[data-stated-panel]').forEach(function (p) { panels[p.dataset.statedPanel] = p; });
  var implTab = dlg.querySelector('[data-stated-tab="implementations"]');

  function show(mode) {
    tabs.forEach(function (t) {
      var on = t.dataset.statedTab === mode;
      t.setAttribute('aria-selected', String(on));
      panels[t.dataset.statedTab].hidden = !on;
    });
    dlg.querySelector('.modal__body').scrollTop = 0;
  }
  tabs.forEach(function (t) { t.addEventListener('click', function () { show(t.dataset.statedTab); }); });

  function fill(card, entry) {
    var terms = panels.terms, spoken = panels.spoken;
    Object.keys(panels).forEach(function (k) { panels[k].replaceChildren(); });
    implTab.hidden = !(entry && entry.implementations && entry.implementations.length);
    if (!entry) {
      Object.keys(panels).forEach(function (k) { panels[k].append(el('p', 'stated-empty', 'This card is still being written up.')); });
      return;
    }
    var dl = el('dl', 'stated-terms');
    entry.terms.forEach(function (t) {
      var dt = el('dt', '', t.term);
      var dd = el('dd', '', t.meaning);
      if (t.function) dd.prepend(el('span', 'is-function', 'function'), ' ');
      dl.append(dt, dd);
    });
    terms.append(dl);

    var list = el('ol', 'stated-spoken');
    entry.spoken.forEach(function (s) {
      var li = el('li');
      var math = el('span', 'stated-spoken__math');
      math.innerHTML = card.body[s.line] || '';   // the card's own generated HTML + MathML
      li.append(math, el('p', 'stated-spoken__text', '“' + s.text + '”'));
      list.append(li);
    });
    spoken.append(list);

    var about = panels.explanation;
    if (entry.explanation) about.append(el('p', 'stated-explain', entry.explanation));
    else about.append(el('p', 'stated-empty', 'The explanation for this card is still being written.'));
    if (entry.origin) {
      about.append(el('h3', 'stated-sub', 'Origin'), el('p', 'stated-explain', entry.origin));
    }

    if (entry.implementations && entry.implementations.length) {
      var impl = el('ul', 'stated-impl');
      entry.implementations.forEach(function (i) {
        var li = el('li');
        li.append(el('code', 'stated-impl__name', i.name), el('span', 'stated-impl__lib', i.library), el('p', 'stated-impl__note', i.note));
        impl.append(li);
      });
      panels.implementations.append(impl);
    }
  }

  /** Open the popup for `card` on the "terms" or "spoken" tab. */
  Site.openStated = function (card, deckName, mode) {
    dlg.querySelector('[data-stated-code]').textContent = card.id;
    var name = /fcard__name">([\s\S]*?)<\/strong>/.exec(card.body[0] || '');
    dlg.querySelector('[data-stated-title]').textContent = card.title || (name ? name[1].replace(/<[^>]+>/g, '') : deckName);
    Object.keys(panels).forEach(function (k) { panels[k].replaceChildren(); });
    panels.terms.append(el('p', 'stated-empty', 'Loading…'));
    show(mode === 'spoken' ? 'spoken' : 'terms');
    if (!dlg.open) dlg.showModal();
    loadData()
      .then(function (data) { fill(card, data[card.id]); })
      .catch(function (err) {
        console.error('[stated]', err);
        panels.terms.replaceChildren(el('p', 'stated-empty', 'This explanation could not be loaded right now.'));
      });
  };
};

})(window.Site = window.Site || {});
