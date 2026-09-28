/**
 * Flashcard decks (My Flashcards tab). Renders one section per deck with a single card viewer:
 * select the card (or press Space) to flip it, and use the arrows, keyboard arrows, or Shuffle to move
 * through the deck. Backs are HTML + MathML, so they stay sharp at any size.
 */
(function (Site) {
'use strict';

function slugify(s) { return s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

Site.initFlashcards = function initFlashcards(root, decks) {
  if (!root || !decks) return;
  var mount = root.querySelector('[data-decks]');
  var total = decks.reduce(function (n, d) { return n + d.cards.length; }, 0);
  var countEl = root.querySelector('[data-total]');
  // Which side each card opens on; remembered in this browser.
  var startBack = false;
  try { startBack = localStorage.getItem('fc-side') === 'back'; } catch (e) {}
  var renders = [];
  root.querySelectorAll('input[name="fc-side"]').forEach(function (r) {
    r.checked = (r.value === 'back') === startBack;
    r.addEventListener('change', function () {
      if (!r.checked) return;
      startBack = r.value === 'back';
      try { localStorage.setItem('fc-side', r.value); } catch (e) {}
      renders.forEach(function (fn) { fn(); });
    });
  });
  if (countEl) countEl.textContent = total + ' cards in ' + decks.length + ' decks';

  decks.forEach(function (deck, di) {
    var id = 'fc-' + slugify(deck.name);
    var sec = document.createElement('section');
    sec.className = 'deck';
    sec.innerHTML =
      '<h2 id="' + id + '"><span class="sec-num">' + (di + 1) + '</span>' + deck.name +
        ' <span class="deck__count">' + deck.cards.length + ' cards</span></h2>' +
      '<div class="deck__viewer">' +
        '<button class="deck__nav deck__nav--prev" type="button" aria-label="Previous card"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
        '<button class="fcard" type="button" aria-live="polite"><span class="fcard__inner">' +
          '<span class="fcard__face fcard__front"></span><span class="fcard__face fcard__back"></span>' +
        '</span></button>' +
        '<button class="deck__nav deck__nav--next" type="button" aria-label="Next card"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
      '</div>' +
      '<div class="deck__bar"><span class="deck__pos"></span>' +
        '<button class="text-btn text-btn--small" type="button" data-shuffle>Shuffle</button>' +
        '<button class="text-btn text-btn--small" type="button" data-reset>In order</button></div>';
    mount.append(sec);

    var order = deck.cards.map(function (_, i) { return i; });
    var idx = 0, flipped = false;
    var card = sec.querySelector('.fcard'), front = sec.querySelector('.fcard__front'), back = sec.querySelector('.fcard__back');
    var pos = sec.querySelector('.deck__pos');

    function img(src, alt) {
      var im = document.createElement('img');
      im.src = src; im.alt = alt; im.decoding = 'async';
      return im;
    }

    function frontHTML(c) {
      return '<span class="fcard__bar"></span><span class="fcard__top"><span class="fcard__id"></span><span class="fcard__sec"></span></span>' +
        '<span class="fcard__title"></span><span class="fcard__prompt"></span>';
    }

    function render() {
      var c = deck.cards[order[idx]];
      flipped = startBack;
      card.classList.toggle('is-flipped', flipped);
      front.replaceChildren();
      if (c.front) {
        front.classList.add('fcard__face--pic');
        front.append(img(c.front, 'Front of card ' + c.id));
      } else {
        front.classList.remove('fcard__face--pic');
        front.innerHTML = frontHTML(c);
        front.querySelector('.fcard__id').textContent = c.id;
        front.querySelector('.fcard__sec').textContent = deck.name;
        var t = front.querySelector('.fcard__title');
        if (c.glyphs) { t.textContent = c.glyphs; t.classList.add('fcard__title--glyphs'); }
        else t.textContent = c.title;
        front.querySelector('.fcard__prompt').textContent = c.prompt || 'State the formula or concept';
      }
      // Back: the guide's formulas and text, rebuilt as HTML + MathML (generated, trusted content).
      back.innerHTML = '<span class="fcard__body">' + c.body.map(function (l) { return '<span class="fcard__line">' + l + '</span>'; }).join('') + '</span>' +
        (c.note ? '<span class="fcard__note"></span>' : '') +
        '<span class="fcard__label"></span><span class="fcard__bar fcard__bar--bottom"></span>';
      if (c.note) back.querySelector('.fcard__note').innerHTML = c.note;   // generated HTML + MathML
      back.querySelector('.fcard__label').textContent = c.label;
      card.setAttribute('aria-label', 'Card ' + c.id + (c.title ? ', ' + c.title : '') + '. Select to flip.');
      pos.textContent = (idx + 1) + ' / ' + deck.cards.length;
      fit();
    }

    // Shrink any formula line that is wider than the card so nothing is clipped.
    function fit() {
      var body = back.querySelector('.fcard__body');
      if (!body || !body.clientWidth) return;
      var avail = body.clientWidth - 2;
      body.querySelectorAll('.fcard__line').forEach(function (l) {
        l.style.fontSize = '';
        l.classList.remove('is-wrap');
        // Prose lines wrap like a paragraph; formula lines stay on one line and shrink to fit.
        if (!l.querySelector('math') || l.textContent.length > 70 && l.querySelectorAll('math').length < 2) {
          l.classList.add('is-wrap'); return;
        }
        var w = l.getBoundingClientRect().width;
        if (w > avail) l.style.fontSize = (100 * avail / w).toFixed(1) + '%';
      });
    }
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(card);
    function go(step) { idx = (idx + step + order.length) % order.length; render(); }

    card.addEventListener('click', function () {
      flipped = !flipped; card.classList.toggle('is-flipped', flipped);
      card.setAttribute('aria-label', flipped ? 'Showing the answer. Select to flip back.' : 'Showing the prompt. Select to flip.');
    });
    sec.querySelector('.deck__nav--prev').addEventListener('click', function () { go(-1); });
    sec.querySelector('.deck__nav--next').addEventListener('click', function () { go(1); });
    sec.querySelector('.deck__viewer').addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });
    sec.querySelector('[data-shuffle]').addEventListener('click', function () {
      for (var i = order.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
      idx = 0; render();
    });
    sec.querySelector('[data-reset]').addEventListener('click', function () {
      order = deck.cards.map(function (_, i) { return i; }); idx = 0; render();
    });
    renders.push(render);
    render();
  });
};

})(window.Site = window.Site || {});
