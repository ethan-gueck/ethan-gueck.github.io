/**
 * Experience and education drawn as a git graph (About Me tab).
 * Cards are laid out by CSS grid in three lanes: soft skills work, technical work, and education.
 * This module draws the connecting lines in an SVG behind the cards: each edge runs from the older
 * card's top to the newer card's bottom, curving when it changes lanes. Education branches off from
 * work and merges back into it.
 */
(function (Site) {
'use strict';

// [from (older), to (newer), kind]
var EDGES = [
  ['emt', 'congress', 'work'], ['congress', 'ail', 'work'], ['ail', 'sales', 'work'],
  ['sales', 'tso', 'work'], ['tso', 'apb', 'work'], ['apb', 'ds', 'work'],
  ['emt', 'bs', 'branch'], ['bs', 'apb', 'merge'],
  ['apb', 'ms', 'branch', 'start'], ['ms', 'ds', 'merge'],
];

Site.initGitGraph = function initGitGraph(root) {
  if (!root) return;
  var body = root.querySelector('.gg__body');
  var svg = root.querySelector('.gg__edges');
  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }

  function draw() {
    svg.replaceChildren();
    var box = body.getBoundingClientRect();
    if (!box.width || getComputedStyle(svg).display === 'none') return;
    svg.setAttribute('width', box.width);
    svg.setAttribute('height', box.height);
    svg.setAttribute('viewBox', '0 0 ' + box.width + ' ' + box.height);

    var rect = {};
    root.querySelectorAll('[data-node]').forEach(function (c) {
      var r = c.getBoundingClientRect();
      rect[c.dataset.node] = { cx: r.left - box.left + r.width / 2, top: r.top - box.top, bottom: r.bottom - box.top };
    });

    EDGES.forEach(function (e) {
      var a = rect[e[0]], b = rect[e[1]];
      if (!a || !b) return;
      var x1 = a.cx, y1 = a.top, x2 = b.cx, y2 = b.bottom;
      var d;
      if (e[3] === 'start') {
        // branch from the start of the older card, so the two run side by side (concurrent)
        y1 = a.bottom;
        d = 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + (y1 + 22) + ' ' + x2 + ' ' + (y2 + 22) + ' ' + x2 + ' ' + y2;
      } else if (Math.abs(x1 - x2) < 1) d = 'M' + x1 + ' ' + y1 + ' L' + x2 + ' ' + y2;
      else {
        var my = (y1 + y2) / 2;
        d = 'M' + x1 + ' ' + y1 + ' C' + x1 + ' ' + my + ' ' + x2 + ' ' + my + ' ' + x2 + ' ' + y2;
      }
      svg.append(el('path', { d: d, class: 'gg__edge gg__edge--' + e[2] }));
      svg.append(el('circle', { cx: x1, cy: y1, r: 5, class: 'gg__dot gg__dot--' + e[2] }));
      svg.append(el('circle', { cx: x2, cy: y2, r: 5, class: 'gg__dot gg__dot--' + e[2] }));
    });
  }

  if ('ResizeObserver' in window) new ResizeObserver(draw).observe(body);
  window.addEventListener('resize', draw);
  draw();
  return { redraw: draw };
};

})(window.Site = window.Site || {});
