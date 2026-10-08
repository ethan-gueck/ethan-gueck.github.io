(function (Site) {
'use strict';
/**
 * Builds the sidebar table of contents from the h2 headings of the active panel
 * and highlights the section currently in view. On phones, where the sidebar is hidden,
 * the same outline fills the collapsible "On this page" menu above the panel.
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

  // Highlight the section in view, and keep its link visible when the list scrolls.
  const setActive = i => {
    links.forEach((a, j) => a.setAttribute('aria-current', String(i === j)));
    const a = links[i];
    if (!a) return;
    const top = a.offsetTop - listEl.offsetTop, bottom = top + a.offsetHeight;
    if (top < listEl.scrollTop) listEl.scrollTop = top - 8;
    else if (bottom > listEl.scrollTop + listEl.clientHeight) listEl.scrollTop = bottom - listEl.clientHeight + 24;
  };
  // Drop the bottom fade once the end of the list is in view.
  const atEnd = () => listEl.classList.toggle('is-end', listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 2);
  listEl.onscroll = atEnd;
  listEl.scrollTop = 0;
  setActive(0);
  requestAnimationFrame(atEnd);

  buildMobile(panel, headings);

  observer = new IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting);
    if (!visible.length) return;
    const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    setActive(headings.indexOf(top.target));
  }, { rootMargin: '0px 0px -65% 0px' });
  headings.forEach(h => observer.observe(h));
}

function buildMobile(panel, headings) {
  const box = document.getElementById('toc-mobile');
  const list = box?.querySelector('[data-toc-mobile]');
  if (!list) return;
  box.open = false;
  box.hidden = headings.length < 2;   // nothing to choose between
  list.replaceChildren(...headings.map(h => {
    const num = h.querySelector('.sec-num')?.textContent ?? '';
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `#${h.id}`;
    a.innerHTML = `<span class="toc__num">${num}</span><span></span>`;
    a.lastElementChild.textContent = h.textContent.replace(num, '').trim();
    a.addEventListener('click', e => {
      e.preventDefault();
      box.open = false;
      h.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', `#${panel.dataset.panel}`);
    });
    li.append(a);
    return li;
  }));
}

})(window.Site = window.Site || {});
