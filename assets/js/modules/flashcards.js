/**
 * Flashcard decks (My Flashcards tab). Renders one section per deck with a single card viewer:
 * select the card (or press Space) to flip it, and use the arrows, keyboard arrows, or Shuffle to move
 * through the deck. Backs are HTML + MathML, so they stay sharp at any size.
 * When a card's equation side is showing, a ? button in its corner opens the
 * stated-equation popup (modules/stated.js): terms, how it is read aloud, explanation, implementations.
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
      '<h2 id="' + id + '"><span class="sec-num">' + (deck.num || di + 1) + '</span>' + deck.name +
        ' <span class="deck__count">' + deck.cards.length + ' cards</span></h2>' +
      '<div class="deck__viewer">' +
        '<button class="deck__nav deck__nav--prev" type="button" aria-label="Previous card"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
        '<div class="fcard-wrap">' +
          '<button class="fcard" type="button" aria-live="polite"><span class="fcard__inner">' +
            '<span class="fcard__face fcard__front"></span><span class="fcard__face fcard__back"></span>' +
          '</span></button>' +
          // Outside the card button (buttons can't nest); shown over its top-right corner.
          '<span class="fcard__tools" hidden>' +
            '<button class="fcard__tool" type="button" data-stated="terms" aria-label="Explain this equation" title="Explain this equation">?</button>' +
          '</span>' +
        '</div>' +
        '<button class="deck__nav deck__nav--next" type="button" aria-label="Next card"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
      '</div>' +
      '<div class="deck__bar"><span class="deck__pos"></span>' +
        '<button class="text-btn text-btn--small" type="button" data-shuffle>Shuffle</button>' +
        '<button class="text-btn text-btn--small" type="button" data-reset>In order</button></div>';
    if (deck.ref && !(decks[di - 1] || {}).ref) {
      var div = document.createElement('p');
      div.className = 'deck__divider';
      div.textContent = 'Reference decks';
      mount.append(div);
    }
    mount.append(sec);

    var order = deck.cards.map(function (_, i) { return i; });
    var idx = 0, flipped = false;
    var card = sec.querySelector('.fcard'), front = sec.querySelector('.fcard__front'), back = sec.querySelector('.fcard__back');
    var pos = sec.querySelector('.deck__pos');
    var tools = sec.querySelector('.fcard__tools');

    function hasEquation(c) { return c.body.some(function (l) { return l.indexOf('<math') >= 0; }) && !c.glyphs; }
    function setTools() {
      var c = deck.cards[order[idx]];
      tools.hidden = !(flipped && hasEquation(c));
      card.classList.toggle('has-stated', hasEquation(c));
    }
    tools.querySelectorAll('[data-stated]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (Site.openStated) Site.openStated(deck.cards[order[idx]], deck.name, b.dataset.stated);
      });
    });

    // Picture fronts are drawn for the light theme; other themes recolour them (modules/recolor.js).
    function img(src, alt) {
      var im = document.createElement('img');
      im.alt = alt; im.decoding = 'async';
      im.dataset.src = src;
      if (Site.themedImage) Site.themedImage(src, function (url) { if (im.dataset.src === src) im.src = url; });
      else im.src = src;
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
        '<span class="fcard__bar fcard__bar--bottom"></span>';
      if (c.note) back.querySelector('.fcard__note').innerHTML = c.note;   // generated HTML + MathML
      card.setAttribute('aria-label', 'Card ' + c.id + (c.title ? ', ' + c.title : '') + '. Select to flip.');
      pos.textContent = (idx + 1) + ' / ' + deck.cards.length;
      setTools();
      fit();
    }

    // A formula line too wide for the card first breaks between whole phrases (at ", ", "; ",
    // ": " or " — "), never inside an equation; only if a phrase is still too wide does it shrink.
    var SEP = /([,;:]\s+|\s+[—–]\s+)/;
    function phrase(l) {
      if (!l.dataset.phrased) {
        l.dataset.phrased = '1';
        var groups = [[]];
        Array.prototype.slice.call(l.childNodes).forEach(function (n) {
          if (n.nodeType !== 3) { groups[groups.length - 1].push(n); return; }
          n.textContent.split(SEP).forEach(function (part, i) {
            if (!part) return;
            groups[groups.length - 1].push(document.createTextNode(i % 2 ? part.replace(/\s+$/, '') : part));
            if (i % 2) groups.push([]);   // the punctuation ends a phrase; the space after it is where the line may break
          });
        });
        groups = groups.filter(function (g) { return g.length; });
        if (groups.length > 1) {
          l.replaceChildren();
          groups.forEach(function (g, i) {
            var span = document.createElement('span');
            span.className = 'fcard__phrase';
            g.forEach(function (n) { span.append(n); });
            l.append(span);
            if (i < groups.length - 1) l.append(' ');
          });
        }
      }
      return l.querySelectorAll('.fcard__phrase').length > 1;
    }

    // Fit every line inside the card's margins so nothing is clipped.
    function fit() {
      var body = back.querySelector('.fcard__body');
      if (!body || !body.clientWidth) return;
      var cs = getComputedStyle(body);
      // A little short of the full width, so rounding never pushes a line into the margin.
      var avail = (body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * 0.97;
      body.querySelectorAll('.fcard__line').forEach(function (l) {
        l.style.fontSize = '';
        l.classList.remove('is-wrap', 'is-phrased');
        // Prose lines (a sentence with at most a symbol or two of math) wrap like a paragraph;
        // one still holding an equation wider than the card shrinks to fit it.
        var mathText = 0;
        l.querySelectorAll('math').forEach(function (m) { mathText += m.textContent.length; });
        var prose = l.textContent.length - mathText;
        if (!l.querySelector('math') || prose > 40 && mathText <= 6 || l.textContent.length > 70 && l.querySelectorAll('math').length < 2) {
          l.classList.add('is-wrap');
          var mathWidth = 0;
          l.querySelectorAll('math').forEach(function (m) { mathWidth = Math.max(mathWidth, m.getBoundingClientRect().width); });
          if (mathWidth > avail) l.style.fontSize = (100 * avail / mathWidth).toFixed(1) + '%';
          return;
        }
        var w = l.getBoundingClientRect().width;
        if (w <= avail) return;
        if (phrase(l)) {
          l.classList.add('is-phrased');
          var widest = 0;
          l.querySelectorAll('.fcard__phrase').forEach(function (p) { widest = Math.max(widest, p.getBoundingClientRect().width); });
          if (widest > avail) l.style.fontSize = (100 * avail / widest).toFixed(1) + '%';
          return;
        }
        l.style.fontSize = (100 * avail / w).toFixed(1) + '%';
      });
    }
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(card);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);   // widths change once web fonts load
    function go(step) { idx = (idx + step + order.length) % order.length; render(); }

    card.addEventListener('click', function () {
      flipped = !flipped; card.classList.toggle('is-flipped', flipped);
      card.setAttribute('aria-label', flipped ? 'Showing the answer. Select to flip back.' : 'Showing the prompt. Select to flip.');
      setTools();
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
    document.addEventListener('site:theme', function () {
      var pic = front.querySelector('img[data-src]');
      if (pic && Site.themedImage) Site.themedImage(pic.dataset.src, function (url) { pic.src = url; });
    });
  });
};

})(window.Site = window.Site || {});
