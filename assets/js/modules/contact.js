/**
 * Contact links and call to action.
 * - Fills in every <a data-link="email|linkedin|github"> from Site.config.
 * - Appends the same call-to-action block to the end of every tab panel.
 */
(function (Site) {
'use strict';

function urls(cfg) {
  return {
    email: 'mailto:' + cfg.email,
    github: cfg.github,
    linkedin: cfg.linkedin ||
      'https://www.linkedin.com/search/results/people/?keywords=' + encodeURIComponent(cfg.name),
  };
}

function labels(cfg) {
  return { email: cfg.email, github: cfg.github.replace(/^https?:\/\//, '') };
}

Site.initContact = function initContact(cfg) {
  var href = urls(cfg);
  var text = labels(cfg);

  function hydrate(scope) {
    scope.querySelectorAll('a[data-link]').forEach(function (a) {
      var key = a.dataset.link;
      if (!href[key]) return;
      a.href = href[key];
      if (key !== 'email') a.target = '_blank';
      if (a.dataset.label === 'address' && text[key]) a.textContent = text[key];
    });
  }

  var tpl =
    '<h2 class="cta__title">Let\u2019s work together</h2>' +
    '<p class="cta__text">Working on utility, telecom, or industrial data, or want to compare notes on a project? ' +
    'Reach out to me directly or connect with me on LinkedIn.</p>' +
    '<div class="cta__actions">' +
      '<a class="cta__btn cta__btn--primary" data-link="email" href="#">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3z"/><path d="M3 7l9 6 9-6"/></svg>Email me</a>' +
      '<a class="cta__btn cta__btn--secondary" data-link="linkedin" href="#" rel="noopener">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.05c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.78 2.65 4.78 6.1V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7V21h-4z"/></svg>' +
        'Connect on LinkedIn</a>' +
    '</div>';

  document.querySelectorAll('[data-panel]').forEach(function (panel) {
    var box = document.createElement('aside');
    box.className = 'cta';
    box.setAttribute('aria-label', 'Contact');
    box.innerHTML = tpl;
    panel.appendChild(box);
  });

  hydrate(document);
};

})(window.Site = window.Site || {});
