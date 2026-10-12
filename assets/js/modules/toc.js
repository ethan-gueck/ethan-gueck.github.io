(function (Site) {
'use strict';
/**
 * Builds the sidebar table of contents from the h2 headings of the active panel
 * and highlights the section currently in view. On phones, where the sidebar is hidden,
 * the same outline fills the collapsible "On this page" menu above the panel.
 */
let stopTracking = () => {};

Site.buildToc = function buildToc(panel, listEl = document.getElementById('toc')) {
  if (!listEl) return;
  stopTracking();
  listEl.replaceChildren();

  const headings = [...panel.querySelectorAll('h2[id]')];
  let chosen = null;   // index of a section picked from the contents, until the reader scrolls
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
      // A minimized section (a flashcard deck) opens as you go to it.
      const toggle = h.querySelector('button[aria-expanded="false"]');
      if (toggle) toggle.click();
      chosen = headings.indexOf(h);   // highlighted even if the page ends before it reaches the top
      setActive(chosen);
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

  // The section in view is the last heading that has reached the top of the page (just below the
  // tab bar, where a heading stops when you go to it). After a contents link, that section stays
  // highlighted until the reader scrolls on their own.
  let frame = 0;
  const track = () => {
    frame = 0;
    if (chosen !== null) { setActive(chosen); return; }
    const line = (parseFloat(getComputedStyle(headings[0] || document.body).scrollMarginTop) || 0) + 40;
    let current = 0;
    headings.forEach((h, j) => { if (h.getBoundingClientRect().top <= line) current = j; });
    setActive(current);
  };
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(track); };
  const release = () => { chosen = null; };
  addEventListener('scroll', onScroll, { passive: true });
  requestAnimationFrame(track);
  ['wheel', 'touchstart', 'keydown'].forEach(t => addEventListener(t, release, { passive: true }));
  stopTracking = () => {
    removeEventListener('scroll', onScroll);
    ['wheel', 'touchstart', 'keydown'].forEach(t => removeEventListener(t, release));
  };
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
      const toggle = h.querySelector('button[aria-expanded="false"]');
      if (toggle) toggle.click();
      h.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      history.replaceState(null, '', `#${panel.dataset.panel}`);
    });
    li.append(a);
    return li;
  }));
}

})(window.Site = window.Site || {});
