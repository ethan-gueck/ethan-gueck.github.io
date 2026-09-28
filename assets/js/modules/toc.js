(function (Site) {
'use strict';
/**
 * Builds the sidebar table of contents from the h2 headings of the active panel
 * and highlights the section currently in view.
 */
let observer;

Site.buildToc = function buildToc(panel, listEl = document.getElementById('toc')) {
  if (!listEl) return;
  observer?.disconnect();
  listEl.replaceChildren();

  const headings = [...panel.querySelectorAll('h2[id]')];
  const links = headings.map(h => {
    const num = h.querySelector('.sec-num')?.textContent ?? '';
    const label = h.textContent.replace(num, '').trim();
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.innerHTML = `<span class="toc__num">${num}</span><span></span>`;
    a.lastElementChild.textContent = label;
    a.addEventListener('click', e => {
      e.preventDefault();
      h.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', `#${panel.dataset.panel}`);
    });
    li.append(a);
    listEl.append(li);
    return a;
  });

  const setActive = i => links.forEach((a, j) => a.setAttribute('aria-current', String(i === j)));
  setActive(0);

  observer = new IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting);
    if (!visible.length) return;
    const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    setActive(headings.indexOf(top.target));
  }, { rootMargin: '0px 0px -65% 0px' });
  headings.forEach(h => observer.observe(h));
}

})(window.Site = window.Site || {});
