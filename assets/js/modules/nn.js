/**
 * Ethan's NN: every flashcard as a neuron, grouped into tracks that branch off the brain.
 *
 * Cards come from data/flashcards.js; tracks, edges and short titles from data/neurons.js.
 * One track is open at a time. A neuron is filled when a topic in a domain repo lists its card
 * id in `cards` (read from each domain site's api/v1/manifest.json the first time the tab opens);
 * its popup then links to the topic's interactive page. Every other neuron is drawn as an
 * outline and its popup shows the flashcard with "Coming soon".
 */
(function (Site) {
'use strict';

var NS = 'http://www.w3.org/2000/svg';
var SOMA = 24;

function el(name, attrs, parent) {
  var n = document.createElementNS(NS, name);
  Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
  if (parent) parent.appendChild(n);
  return n;
}

function hash(text) {
  var h = 7;
  for (var i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 9973;
  return h;
}

function curve(x1, y1, x2, y2) {
  var my = (y1 + y2) / 2;
  return 'M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' C' + x1.toFixed(1) + ' ' + my.toFixed(1) + ' ' +
    x2.toFixed(1) + ' ' + my.toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1);
}

function wrap(text, max) {
  var lines = [''];
  text.split(' ').forEach(function (word) {
    var last = lines[lines.length - 1];
    if (last && (last + ' ' + word).length > max) lines.push(word);
    else lines[lines.length - 1] = last ? last + ' ' + word : word;
  });
  if (lines.length > 2) lines = [lines[0], lines.slice(1).join(' ')];
  if (lines[1] && lines[1].length > max) lines[1] = lines[1].slice(0, max - 1).trim() + '…';
  return lines;
}

/** Base URL of every track's domain site: the local preview servers on localhost, GitHub Pages otherwise. */
function siteUrls(config, trackDefs) {
  var local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if (local && config.projectsLocal) {
    return Object.keys(config.projectsLocal).map(function (site) { return config.projectsLocal[site]; });
  }
  var seen = {};
  return trackDefs.filter(function (t) { return t.site && !seen[t.site] && (seen[t.site] = true); })
    .map(function (t) { return new URL(t.site + '/', config.projects).href; });
}

/* ---------- model ---------- */

function cardTitle(card) {
  if ((Site.neuronTitles || {})[card.id]) return Site.neuronTitles[card.id];
  if (card.title) return card.title;
  var name = /fcard__name">([\s\S]*?)<\/strong>/.exec((card.body || [])[0] || '');
  return name ? name[1].replace(/<[^>]+>/g, '').trim() : card.id;
}

function buildModel(decks, trackDefs, requires) {
  var byDeck = {};
  decks.forEach(function (d) { byDeck[d.name] = d; });
  var named = {};
  var tracks = trackDefs.map(function (t) {
    t.decks.forEach(function (n) { named[n] = true; });
    return { name: t.name, decks: t.decks.filter(function (n) { return byDeck[n]; }) };
  });
  decks.forEach(function (d) { if (!named[d.name]) tracks.push({ name: d.name, decks: [d.name] }); });

  var nodes = {};
  tracks = tracks.filter(function (t) { return t.decks.length; });
  tracks.forEach(function (track, ti) {
    track.index = ti;
    track.nodes = [];
    track.decks.forEach(function (name) {
      byDeck[name].cards.forEach(function (card) {
        var n = { id: card.id, card: card, title: cardTitle(card), track: track, requires: [], usedBy: [], url: '' };
        nodes[card.id] = n;
        track.nodes.push(n);
      });
    });
  });
  Object.keys(requires).forEach(function (id) {
    if (!nodes[id]) return;
    requires[id].forEach(function (r) {
      if (!nodes[r] || r === id) return;
      nodes[id].requires.push(r);
      nodes[r].usedBy.push(id);
    });
  });
  return { tracks: tracks, nodes: nodes };
}

function markBuilt(model, manifest, base) {
  var topics = manifest.topics || {};
  Object.keys(topics).forEach(function (slug) {
    var t = topics[slug];
    var page = t.pages && manifest.pages[t.pages[0]];
    if (!page) return;
    var url = new URL(page.path, base).href;
    (t.cards || []).forEach(function (id) { if (model.nodes[id]) model.nodes[id].url = url; });
  });
}

/* ---------- track layout ---------- */

// Layer the track by prerequisite depth (edges inside the track only), order each layer by where
// its parents sit, and wrap long layers onto extra rows.
function layout(track, nodes, width) {
  var compact = width < 480;
  var spacing = compact ? 78 : 116;
  var rowGap = compact ? 104 : 150;
  var perRow = Math.max(3, Math.floor((width - 20) / spacing));
  var local = function (n) { return n.requires.filter(function (r) { return nodes[r].track === track; }); };
  var depth = {};
  function depthOf(n) {
    if (depth[n.id] !== undefined) return depth[n.id];
    depth[n.id] = 0;
    depth[n.id] = local(n).reduce(function (d, r) { return Math.max(d, depthOf(nodes[r]) + 1); }, 0);
    return depth[n.id];
  }
  var layers = [];
  track.nodes.forEach(function (n, i) {
    n.order = i;
    var d = depthOf(n);
    (layers[d] = layers[d] || []).push(n);
  });

  var y = 50;
  layers.forEach(function (layer) {
    if (!layer) return;
    layer.forEach(function (n) {
      var parents = local(n).map(function (r) { return nodes[r].x; });
      n.key = parents.length ? parents.reduce(function (a, b) { return a + b; }, 0) / parents.length : n.order * 1000;
    });
    layer.sort(function (a, b) { return a.key - b.key || a.order - b.order; });
    for (var start = 0; start < layer.length; start += perRow) {
      var row = layer.slice(start, start + perRow);
      row.forEach(function (n, i) {
        n.x = width / 2 + (i - (row.length - 1) / 2) * spacing;
        n.y = y;
      });
      y += rowGap;
    }
  });
  return { height: y - rowGap + (compact ? 60 : 90), compact: compact, local: local };
}

/* ---------- drawing ---------- */

function drawNeuron(layer, n, compact) {
  var built = !!n.url;
  var g = el('g', {
    class: 'nn__neuron' + (built ? ' is-built' : ''), tabindex: '0', role: 'button', 'data-id': n.id,
    'aria-label': n.id + ': ' + n.title + (built ? ' (interactive page)' : ''),
    transform: 'translate(' + n.x.toFixed(1) + ' ' + n.y.toFixed(1) + ')',
  }, layer);
  el('title', {}, g).textContent = n.id + ' ' + n.title;
  // Dendrites: short forked strokes around the cell body, skipping the top where the axon arrives.
  var seed = hash(n.id);
  for (var i = 0; i < 7; i++) {
    var a = Math.PI * (-0.2 + (i / 6) * 1.4) + ((seed >> i) % 5 - 2) * 0.06;
    var len = (compact ? 9 : 12) + ((seed >> (i + 2)) % 3) * 2;
    var x2 = Math.cos(a) * (SOMA + len), y2 = Math.sin(a) * (SOMA + len);
    var d = 'M' + (Math.cos(a) * SOMA).toFixed(1) + ' ' + (Math.sin(a) * SOMA).toFixed(1) + ' L' + x2.toFixed(1) + ' ' + y2.toFixed(1);
    [-0.45, 0.45].forEach(function (f) {
      d += ' M' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' l' + (Math.cos(a + f) * 7).toFixed(1) + ' ' + (Math.sin(a + f) * 7).toFixed(1);
    });
    el('path', { class: 'nn__dendrite', d: d }, g);
  }
  el('circle', { class: 'nn__halo', r: SOMA + 8 }, g);
  el('circle', { class: 'nn__soma', r: SOMA }, g);
  el('text', { class: 'nn__code', y: 4 }, g).textContent = n.id;
  if (!compact) {
    var label = el('text', { class: 'nn__label', y: SOMA + 38 }, g);
    wrap(n.title, 17).forEach(function (line, li) {
      el('tspan', { x: 0, dy: li ? '1.2em' : 0 }, label).textContent = line;
    });
  }
}

function drawTrack(svg, track, nodes, width) {
  svg.replaceChildren();
  var plan = layout(track, nodes, width);
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + plan.height);
  var edges = el('g', {}, svg);
  var cells = el('g', {}, svg);
  track.nodes.forEach(function (n) {
    plan.local(n).forEach(function (r) {
      var p = nodes[r];
      var below = plan.compact ? SOMA + 8 : SOMA + 30 + 15 * wrap(p.title, 17).length;
      var d = curve(p.x, p.y + below, n.x, n.y - SOMA);
      el('path', { class: 'nn__edge', d: d, 'data-a': r, 'data-b': n.id }, edges);
      el('path', { class: 'nn__pulse', d: d, style: 'animation-delay:-' + (hash(d) % 24) / 10 + 's' }, edges);
    });
  });
  track.nodes.forEach(function (n) { drawNeuron(cells, n, plan.compact); });
}

/* ---------- popup ---------- */

function linkList(dd, ids, nodes, onPick) {
  dd.replaceChildren();
  if (!ids.length) { dd.textContent = 'None'; return; }
  ids.forEach(function (id) {
    var n = nodes[id];
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'nn-modal__link' + (n.url ? ' is-built' : '');
    b.textContent = n.id + ' ' + n.title;
    b.title = n.track.name;
    b.addEventListener('click', function () { onPick(id); });
    dd.appendChild(b);
  });
}

function fillPopup(dlg, n, nodes, onPick) {
  dlg.querySelector('[data-nn-code]').textContent = n.id;
  dlg.querySelector('[data-nn-title]').textContent = n.title;
  dlg.querySelector('[data-nn-track]').textContent = n.track.name;
  // Card backs are this site's own MathML/HTML (data/flashcards.js).
  var body = dlg.querySelector('[data-nn-body]');
  body.innerHTML = (n.card.body || []).map(function (line) { return '<p>' + line + '</p>'; }).join('') +
    (n.card.note ? '<p class="nn-modal__note">' + n.card.note + '</p>' : '');
  linkList(dlg.querySelector('[data-nn-requires]'), n.requires, nodes, onPick);
  linkList(dlg.querySelector('[data-nn-used]'), n.usedBy, nodes, onPick);
  var link = dlg.querySelector('[data-nn-launch]');
  link.hidden = !n.url;
  link.href = n.url || '#';
  dlg.querySelector('[data-nn-pending]').hidden = !!n.url;
  if (!dlg.open) dlg.showModal();
  dlg.querySelector('.modal__body').scrollTop = 0;
}

/* ---------- tracks ---------- */

function trackItem(track) {
  var li = document.createElement('li');
  li.className = 'nn-track';
  var id = 'nn-track-' + track.index;
  li.innerHTML =
    '<button class="nn-track__head" type="button" aria-expanded="false" aria-controls="' + id + '">' +
      '<span class="nn-track__name"></span><span class="nn-track__count"></span>' +
      '<svg class="nn-track__chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>' +
    '</button>' +
    '<div class="nn-track__body" id="' + id + '" hidden><svg class="nn__svg" role="group"></svg></div>';
  li.querySelector('.nn-track__name').textContent = track.name;
  li.querySelector('svg.nn__svg').setAttribute('aria-label', track.name + ' neurons');
  return li;
}

function countText(track) {
  var built = track.nodes.filter(function (n) { return n.url; }).length;
  return track.nodes.length + ' neurons' + (built ? ' · ' + built + ' built' : '');
}

Site.initNN = function initNN(root, options) {
  if (!root) return null;
  var config = options.config || {};
  var model = buildModel(options.decks || [], options.tracks || [], options.requires || {});
  var nodes = model.nodes;
  var list = root.querySelector('[data-nn-tracks]');
  var status = root.querySelector('[data-nn-status]');
  var dlg = document.getElementById('nn-modal');
  var sites = siteUrls(config, options.tracks || []);
  var open = null;
  var touched = false;
  var loading = null;

  model.tracks.forEach(function (track) {
    var li = trackItem(track);
    track.li = li;
    track.head = li.querySelector('.nn-track__head');
    track.body = li.querySelector('.nn-track__body');
    track.svg = li.querySelector('svg.nn__svg');
    track.head.addEventListener('click', function () { touched = true; toggle(track); });
    wireNeurons(track);
    list.appendChild(li);
  });
  refreshCounts();

  function refreshCounts() {
    model.tracks.forEach(function (t) {
      t.li.querySelector('.nn-track__count').textContent = countText(t);
      t.li.classList.toggle('has-built', t.nodes.some(function (n) { return n.url; }));
    });
  }

  // Drawn at the panel's own pixel width so labels stay at their real size.
  function trackWidth(track) {
    var cs = getComputedStyle(track.body);
    return Math.max(300, Math.round(track.body.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)));
  }

  function draw(track) {
    track.width = trackWidth(track);
    drawTrack(track.svg, track, nodes, track.width);
  }

  function setOpen(track, on) {
    track.head.setAttribute('aria-expanded', String(on));
    track.body.hidden = !on;
    track.li.classList.toggle('is-open', on);
    if (on) draw(track);
  }

  // Opening a track minimizes whichever track was open; `keep` opens without toggling closed.
  function toggle(track, keep) {
    var opening = keep || open !== track;
    if (open && open !== track) setOpen(open, false);
    setOpen(track, opening);
    open = opening ? track : null;
  }

  function select(id) {
    var n = nodes[id];
    if (open !== n.track) toggle(n.track, true);
    fillPopup(dlg, n, nodes, select);
  }

  function light(track, id) {
    track.li.classList.toggle('is-focused', !!id);
    track.svg.querySelectorAll('.nn__edge').forEach(function (p) {
      p.classList.toggle('is-lit', !!id && (p.dataset.a === id || p.dataset.b === id));
    });
    track.svg.querySelectorAll('.nn__neuron').forEach(function (g) { g.classList.toggle('is-lit', g.dataset.id === id); });
  }

  function wireNeurons(track) {
    var svg = track.svg;
    var pick = function (e) { var g = e.target.closest && e.target.closest('.nn__neuron'); return g && g.dataset.id; };
    svg.addEventListener('click', function (e) { var id = pick(e); if (id) select(id); });
    svg.addEventListener('keydown', function (e) {
      var id = pick(e);
      if (id && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); select(id); }
    });
    ['mouseover', 'focusin'].forEach(function (type) {
      svg.addEventListener(type, function (e) { light(track, pick(e)); });
    });
    svg.addEventListener('mouseleave', function () { light(track, null); });
    svg.addEventListener('focusout', function () { light(track, null); });
  }

  function load() {
    if (loading) return loading;
    status.textContent = 'Checking which neurons have pages…';
    // One manifest per domain site; a site that can't be read just leaves its neurons as outlines.
    loading = Promise.all(sites.map(function (base) {
      return fetch(new URL('api/v1/manifest.json', base))
        .then(function (r) {
          if (!r.ok) throw new Error(base + ': manifest request failed (' + r.status + ')');
          return r.json();
        })
        .then(function (manifest) { markBuilt(model, manifest, base); return true; })
        .catch(function (err) { console.warn('[nn]', err); return false; });
    }))
      .then(function (results) {
        var built = Object.keys(nodes).filter(function (id) { return nodes[id].url; }).length;
        status.textContent = results.some(Boolean)
          ? built + ' of ' + Object.keys(nodes).length + ' neurons have an interactive page.'
          : 'Interactive pages could not be checked right now; every neuron still shows its flashcard.';
        refreshCounts();
        // Open the first track with a built neuron, unless the reader has already chosen one.
        var first = model.tracks.filter(function (t) { return t.li.classList.contains('has-built'); })[0] || model.tracks[0];
        if (!touched && first) toggle(first, true);
        else if (open) draw(open);
      });
    return loading;
  }

  var resizing = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizing);
    resizing = setTimeout(function () {
      if (open && open.body.clientWidth && Math.abs(trackWidth(open) - open.width) > 8) draw(open);
    }, 120);
  });

  return {
    setActive: function (active) {
      if (!active) return;
      if (open && trackWidth(open) !== open.width) draw(open);
      load();
    },
  };
};

})(window.Site = window.Site || {});
