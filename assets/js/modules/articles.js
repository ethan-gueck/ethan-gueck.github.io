/**
 * Articles: cards read from the articles site's list (ethan-gueck.github.io/articles/articles.json,
 * kept in the separate "articles" repository). Each card shows the cover image, title, subtitle
 * and a preview quote, and opens the article in a new tab. With no articles yet (or offline),
 * it reads "Coming soon". The articles site's own index page uses this module too.
 */
(function (Site) {
'use strict';

var DEFAULT_BASE = 'https://ethan-gueck.github.io/articles/';

function el(tag, className, text) {
  var node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function card(article, base) {
  var item = el('li', 'article-card');
  var link = el('a', 'article-card__link');
  link.href = article.url || base + article.slug + '/';
  link.target = '_blank';
  link.rel = 'noopener';
  if (article.image) {
    var img = el('img', 'article-card__img');
    img.src = /^https?:/.test(article.image) ? article.image : base + article.image;
    img.alt = article.alt || '';
    img.loading = 'lazy';
    img.width = 640;
    img.height = 360;
    link.appendChild(img);
  }
  var body = el('div', 'article-card__body');
  body.appendChild(el('h3', 'article-card__title', article.title));
  if (article.subtitle) body.appendChild(el('p', 'article-card__subtitle', article.subtitle));
  if (article.quote) body.appendChild(el('blockquote', 'article-card__quote', '“' + article.quote + '”'));
  var open = el('span', 'article-card__open', 'Read the article');
  open.insertAdjacentHTML('beforeend', ' <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/></svg><span class="sr-only"> (opens in a new tab)</span>');
  body.appendChild(open);
  link.appendChild(body);
  item.appendChild(link);
  return item;
}

function comingSoon(container) {
  container.innerHTML = '<p class="articles__soon"><em>Coming soon</em></p>';
}

Site.initArticles = function initArticles(container, options) {
  if (!container) return;
  var base = (options && options.base) || DEFAULT_BASE;
  comingSoon(container);
  if (!window.fetch) return;
  fetch(base + 'articles.json', { cache: 'no-cache' })
    .then(function (response) { return response.ok ? response.json() : []; })
    .then(function (articles) {
      if (!Array.isArray(articles) || !articles.length) return;
      var list = el('ul', 'article-cards');
      articles.forEach(function (article) { if (article && article.title) list.appendChild(card(article, base)); });
      container.replaceChildren(list);
    })
    .catch(function () { /* offline or opened from disk: keep "Coming soon" */ });
};

})(window.Site = window.Site || {});
