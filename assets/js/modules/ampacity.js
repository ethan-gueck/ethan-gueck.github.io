/**
 * Steady-state rating calculator (Fun and Games tab), using the shared IEEE 738 module.
 * Rates 795 kcmil Drake ACSR for the weather the reader sets.
 */
(function (Site) {
'use strict';

Site.initAmpacity = function initAmpacity(root) {
  if (!root) return;
  var E = Site.ieee738;
  var inputs = Array.prototype.slice.call(root.querySelectorAll('input[type="range"]'));
  var out = function (name) { return root.querySelector('[data-out="' + name + '"]'); };
  var bar = function (name) { return root.querySelector('[data-bar="' + name + '"]'); };
  var fmt = {
    ta: function (v) { return v + ' °C'; },
    vw: function (v) { return v.toFixed(1) + ' m/s'; },
    qs: function (v) { return v + ' W/m²'; },
    tc: function (v) { return v + ' °C'; },
  };

  function update() {
    var v = {};
    inputs.forEach(function (i) { v[i.name] = Number(i.value); });
    Object.keys(v).forEach(function (k) { out(k).textContent = fmt[k](v[k]); });
    var r = E.rating({ tc: v.tc, ta: v.ta, vw: v.vw, qs: E.solarGain(v.qs) });
    out('amps').textContent = Math.round(r.amps).toLocaleString();
    var max = Math.max(r.qc, r.qr, r.qsun, 1);
    ['qc', 'qr', 'qsun'].forEach(function (k) { bar(k).style.width = (r[k] / max) * 100 + '%'; });
  }

  inputs.forEach(function (i) { i.addEventListener('input', update); });
  update();
};

})(window.Site = window.Site || {});
