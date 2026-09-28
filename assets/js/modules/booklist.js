/** Fills the book list popup from Site.books (assets/js/data/books.js). */
(function (Site) {
'use strict';

Site.initBookList = function initBookList(data) {
  var list = document.querySelector('[data-books]');
  var quotes = document.querySelector('[data-quotes]');
  if (!list || !quotes) return;
  data = data || { books: [], quotes: [] };

  function empty(el, text) {
    var p = document.createElement('p');
    p.className = 'empty-note';
    p.textContent = text;
    el.replaceWith(p);
  }

  if (!data.books.length) empty(list, 'Coming soon.');
  data.books.forEach(function (b) {
    var li = document.createElement('li');
    var t = document.createElement('em'); t.textContent = b.title;
    li.append(t, document.createTextNode(b.author ? ', ' + b.author : ''));
    if (b.note) { var n = document.createElement('span'); n.className = 'books__note'; n.textContent = b.note; li.append(n); }
    list.append(li);
  });

  if (!data.quotes.length) empty(quotes, 'Coming soon.');
  data.quotes.forEach(function (q) {
    var fig = document.createElement('figure'); fig.className = 'quote';
    var bq = document.createElement('blockquote'); bq.textContent = q.text;
    fig.append(bq);
    if (q.source) { var c = document.createElement('figcaption'); c.textContent = q.source; fig.append(c); }
    quotes.append(fig);
  });
};

})(window.Site = window.Site || {});
