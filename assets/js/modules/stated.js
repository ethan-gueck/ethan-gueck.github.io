/**
 * Stated-equation popup (#stated-equation), opened from a flashcard's ? button.
 *
 *   Terms            every symbol in the concept's formulas and what it means.
 *                    Every card has a popup: concepts from their stated equations, and key topics,
 *                    symbols, letters, curves and glossary terms from what the book says about them;
 *                    a tab with nothing for a card is hidden.
 *   Stated-equations the formulas read aloud, as the book states them.
 *   Explanation      the summary, each named formula and what it does, the method and decision
 *                    point where the book has them, then origin and uses.
 *   Implementations  common library functions and tools that compute it (tab hidden when none).
 *
 * The wording lives in data/stated.js (Site.statedEquations, keyed by concept ID, generated from the
 * Second Edition as HTML + MathML). It is loaded the first time the popup opens, so the flashcards
 * tab doesn't pay for it up front.
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
// The data file's own generated HTML + MathML (trusted content).
function rich(tag, cls, markup) {
  var n = el(tag, cls);
  n.innerHTML = markup;
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
    // A tab with nothing for this card (no symbols to define, nothing to read aloud) is hidden.
    tabs.forEach(function (t) {
      var key = t.dataset.statedTab;
      if (key === 'terms' || key === 'spoken') t.hidden = !!entry && !(entry[key] && entry[key].length);
    });
    if (!entry) {
      Object.keys(panels).forEach(function (k) { panels[k].append(el('p', 'stated-empty', 'This card is still being written up.')); });
      return;
    }
    var dl = el('dl', 'stated-terms');
    entry.terms.forEach(function (t) {
      dl.append(rich('dt', '', t.term), rich('dd', '', t.meaning));
    });
    terms.append(dl);

    var list = el('ol', 'stated-spoken');
    entry.spoken.forEach(function (s) {
      var li = el('li');
      li.append(rich('p', 'stated-spoken__text', '“' + s.text + '”'));
      list.append(li);
    });
    if (entry.spoken.length) spoken.append(list);
    else spoken.append(el('p', 'stated-empty', 'This concept has no stated equation.'));

    var about = panels.explanation;
    if (entry.explanation) about.append(rich('p', 'stated-explain', entry.explanation));
    if (entry.formulas && entry.formulas.length) {
      var fl = el('dl', 'stated-terms stated-formulas');
      entry.formulas.forEach(function (f) { fl.append(rich('dt', '', f.name), rich('dd', '', f.explain)); });
      about.append(el('h3', 'stated-sub', entry.formulas_label || 'Formulas'), fl);
    }
    if (entry.method) {
      var ol = el('ol', 'stated-method');
      entry.method.forEach(function (m) { ol.append(rich('li', '', m)); });
      about.append(el('h3', 'stated-sub', 'Method'), ol);
    }
    if (entry.decide) about.append(el('h3', 'stated-sub', 'Decision point'), rich('p', 'stated-explain stated-decide', entry.decide));
    if (entry.origin) about.append(el('h3', 'stated-sub', 'Origin'), rich('p', 'stated-explain', entry.origin));
    (entry.uses || []).forEach(function (u) {
      about.append(el('h3', 'stated-sub', u.label), rich('p', 'stated-explain', u.text));
    });

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
    dlg.querySelector('[data-stated-code]').textContent = card.concept || card.id;
    var name = /fcard__name">([\s\S]*?)<\/strong>/.exec(card.body[0] || '');
    dlg.querySelector('[data-stated-title]').textContent = card.keytopic || card.title || (name ? name[1].replace(/<[^>]+>/g, '') : deckName);
    Object.keys(panels).forEach(function (k) { panels[k].replaceChildren(); });
    panels.terms.append(el('p', 'stated-empty', 'Loading…'));
    show(mode === 'spoken' ? 'spoken' : 'terms');
    if (!dlg.open) dlg.showModal();
    loadData()
      .then(function (data) {
        fill(card, data[card.concept || card.id]);
        // If the tab asked for is hidden for this card, open the first one that has something.
        var asked = dlg.querySelector('[data-stated-tab="' + (mode === 'spoken' ? 'spoken' : 'terms') + '"]');
        if (asked.hidden) show([].filter.call(tabs, function (t) { return !t.hidden; })[0].dataset.statedTab);
      })
      .catch(function (err) {
        console.error('[stated]', err);
        panels.terms.replaceChildren(el('p', 'stated-empty', 'This explanation could not be loaded right now.'));
      });
  };
};

})(window.Site = window.Site || {});
