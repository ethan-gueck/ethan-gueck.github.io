(function (Site) {
'use strict';
/**
 * Carousel: arrow buttons, centered dots, autoplay, swipe, and keyboard support.
 * Autoplay pauses on hover, keyboard focus, hidden tab, or when the user presses pause.
 * Starts paused for users who prefer reduced motion.
 */
Site.createGallery = function createGallery(root, slides, { interval = 6000, onOpen } = {}) {
  const track = root.querySelector('.gallery__track');
  const dotsEl = root.querySelector('.gallery__dots');
  const caption = root.querySelector('.gallery__caption');
  const count = root.querySelector('.gallery__count');
  const toggle = root.querySelector('.gallery__toggle');
  const figOffset = Number(root.dataset.figureOffset || 0); // figures that precede the gallery on the page
  const viewport = root.querySelector('.gallery__viewport');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let index = 0;
  let timer = null;
  let userPaused = reduceMotion;
  let hoverPaused = false;
  let active = false; // gallery is on screen (its tab is open)

  // Build slides and dots.
  slides.forEach((s, i) => {
    const li = document.createElement('li');
    li.className = 'gallery__slide';
    li.setAttribute('role', 'group');
    li.setAttribute('aria-roledescription', 'slide');
    li.setAttribute('aria-label', `${i + 1} of ${slides.length}: ${s.title}`);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('aria-label', `View ${s.title} full size`);
    const img = document.createElement('img');
    img.src = s.src;
    img.alt = `${s.title}. ${s.caption}`;
    img.loading = i < 2 ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.width = 2000; img.height = 1125;
    btn.append(img);
    btn.addEventListener('click', () => onOpen?.(s, i));
    li.append(btn);
    track.append(li);

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'gallery__dot';
    dot.setAttribute('aria-label', `Show ${s.title}`);
    dot.addEventListener('click', () => { go(i); restart(); });
    dotsEl.append(dot);
  });

  const slideEls = [...track.children];
  const dotEls = [...dotsEl.children];

  function go(i) {
    index = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    slideEls.forEach((el, j) => {
      el.inert = j !== index; // keep off-screen slides out of tab order
    });
    dotEls.forEach((d, j) => d.setAttribute('aria-current', String(j === index)));
    const s = slides[index];
    caption.innerHTML = `<span class="caption-label">Dashboard ${index + 1}.</span><strong></strong> <span></span>`;
    caption.children[1].textContent = `${s.title}.`;
    caption.children[2].textContent = s.caption;
    count.textContent = `${index + 1} / ${slides.length}`;
  }

  const next = () => go(index + 1);
  const prev = () => go(index - 1);

  function running() { return active && !userPaused && !hoverPaused && !document.hidden; }
  function stop() { clearInterval(timer); timer = null; }
  function restart() {
    stop();
    if (running()) timer = setInterval(next, interval);
    root.classList.toggle('is-paused', userPaused);
    toggle.setAttribute('aria-label', userPaused ? 'Play slideshow' : 'Pause slideshow');
  }

  root.querySelector('.gallery__arrow--next').addEventListener('click', () => { next(); restart(); });
  root.querySelector('.gallery__arrow--prev').addEventListener('click', () => { prev(); restart(); });
  toggle.addEventListener('click', () => { userPaused = !userPaused; restart(); });

  viewport.addEventListener('mouseenter', () => { hoverPaused = true; restart(); });
  viewport.addEventListener('mouseleave', () => { hoverPaused = false; restart(); });
  root.addEventListener('focusin', () => { hoverPaused = true; restart(); });
  root.addEventListener('focusout', e => { if (!root.contains(e.relatedTarget)) { hoverPaused = false; restart(); } });
  document.addEventListener('visibilitychange', restart);

  root.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { next(); restart(); }
    if (e.key === 'ArrowLeft') { prev(); restart(); }
  });

  // Swipe
  let startX = null;
  viewport.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') startX = e.clientX; });
  viewport.addEventListener('pointerup', e => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); restart(); }
  });

  go(0);
  restart();

  return {
    setActive(isActive) { active = isActive; restart(); },
    pause() { hoverPaused = true; restart(); },
    resume() { hoverPaused = false; restart(); },
  };
}

})(window.Site = window.Site || {});
