/**
 * Results tables (table[data-cards]) become flip cards. The front shows the highlighted value and
 * measure; the back shows its own title, a short list of what was involved, and where it happened.
 * Rows carry the back through data-back-title, data-back-items ("|"-separated), and data-back-source.
 * A flipped card turns back to its front after four seconds, but never while the pointer is over it. The table stays in the markup as the
 * source and as a no-JavaScript fallback.
 */
(function (Site) {
'use strict';

var FLIP_BACK_MS = 4000;

function el(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

Site.initOutcomeCards = function initOutcomeCards() {
  document.querySelectorAll('table[data-cards]').forEach(function (table) {
    var list = el('ul', 'outcome-cards');
    table.querySelectorAll('tbody tr').forEach(function (tr) {
      var cells = tr.querySelectorAll('td');
      if (cells.length < 3) return;
      var measure = cells[0].textContent, value = cells[1].textContent;
      var title = tr.dataset.backTitle || measure;
      var items = (tr.dataset.backItems || '').split('|').filter(Boolean);
      var source = tr.dataset.backSource || '';

      var btn = el('button', 'outcome'); btn.type = 'button';
      var inner = el('span', 'outcome__inner');
      var front = el('span', 'outcome__face outcome__front');
      var v = el('span', 'outcome__value', value);
      if (value.length > 10) v.classList.add('outcome__value--long');
      front.append(v, el('span', 'outcome__measure', measure));

      var back = el('span', 'outcome__face outcome__back');
      back.append(el('span', 'outcome__title', title));
      if (items.length) {
        var ul = el('ul', 'outcome__items');
        items.forEach(function (t) { ul.append(el('li', 'outcome__item', t)); });
        back.append(ul);
      }
      if (source) back.append(el('span', 'outcome__source', '(' + source + ')'));

      inner.append(front, back);
      btn.append(inner);

      var frontLabel = measure + ': ' + value + '. Select for details.';
      var backLabel = title + '. ' + items.join(', ') + (source ? '. ' + source : '');
      btn.setAttribute('aria-label', frontLabel);
      var timer = null, hovering = false;
      function arm() {
        clearTimeout(timer);
        if (btn.classList.contains('is-flipped') && !hovering) timer = setTimeout(function () { show(false); }, FLIP_BACK_MS);
      }
      function show(flipped) {
        btn.classList.toggle('is-flipped', flipped);
        btn.setAttribute('aria-label', flipped ? backLabel : frontLabel);
        arm();
      }
      btn.addEventListener('mouseenter', function () { hovering = true; clearTimeout(timer); });
      btn.addEventListener('mouseleave', function () { hovering = false; arm(); });
      btn.addEventListener('click', function () { show(!btn.classList.contains('is-flipped')); });

      var li = el('li'); li.append(btn); list.append(li);
    });
    var wrap = table.closest('.table-wrap');
    wrap.after(list);
    wrap.remove();
  });
};

})(window.Site = window.Site || {});
