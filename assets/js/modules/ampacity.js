(function (Site) {
'use strict';
/**
 * Simplified IEEE Std 738-2012 steady-state thermal rating for 795 kcmil 26/7 "Drake" ACSR.
 * Heat balance per meter: I^2 R(Tc) = qc + qr - qs
 * Assumptions: wind perpendicular to the conductor, sea level, emissivity = absorptivity = 0.8,
 * solar incidence normal to the conductor. For illustration only.
 */
const D = 0.02814;          // outside diameter, m
const R25 = 7.283e-5;       // ohm/m at 25 C
const R75 = 8.688e-5;       // ohm/m at 75 C
const EMISS = 0.8, ABSORB = 0.8, ELEV = 0;

function resistance(tc) {
  return R25 + ((R75 - R25) / 50) * (tc - 25);
}

function airProperties(tFilm) {
  const mu = (1.458e-6 * (tFilm + 273) ** 1.5) / (tFilm + 383.4);                 // dynamic viscosity
  const rho = (1.293 - 1.525e-4 * ELEV + 6.379e-9 * ELEV ** 2) / (1 + 0.00367 * tFilm); // density
  const k = 2.424e-2 + 7.477e-5 * tFilm - 4.407e-9 * tFilm ** 2;                  // thermal conductivity
  return { mu, rho, k };
}

Site.heatBalance = function heatBalance({ ta, vw, qs: solar, tc }) {
  const dT = Math.max(tc - ta, 0);
  const { mu, rho, k } = airProperties((tc + ta) / 2);
  const re = (D * rho * vw) / mu;

  const qc1 = (1.01 + 1.35 * re ** 0.52) * k * dT;
  const qc2 = 0.754 * re ** 0.6 * k * dT;
  const qcn = 3.645 * Math.sqrt(rho) * D ** 0.75 * dT ** 1.25;
  const qc = Math.max(qc1, qc2, qcn);

  const qr = 17.8 * D * EMISS * (((tc + 273) / 100) ** 4 - ((ta + 273) / 100) ** 4);
  const qsun = ABSORB * solar * D;

  const net = qc + qr - qsun;
  const amps = net > 0 ? Math.sqrt(net / resistance(tc)) : 0;
  return { qc, qr, qsun, amps };
}

Site.initAmpacity = function initAmpacity(root) {
  if (!root) return;
  const inputs = [...root.querySelectorAll('input[type="range"]')];
  const out = name => root.querySelector(`[data-out="${name}"]`);
  const bar = name => root.querySelector(`[data-bar="${name}"]`);
  const fmt = {
    ta: v => `${v} °C`,
    vw: v => `${v.toFixed(1)} m/s`,
    qs: v => `${v} W/m²`,
    tc: v => `${v} °C`,
  };

  function update() {
    const vals = Object.fromEntries(inputs.map(i => [i.name, Number(i.value)]));
    Object.entries(vals).forEach(([k, v]) => { out(k).textContent = fmt[k](v); });
    const r = Site.heatBalance(vals);
    out('amps').textContent = Math.round(r.amps).toLocaleString();
    const max = Math.max(r.qc, r.qr, r.qsun, 1);
    ['qc', 'qr', 'qsun'].forEach(k => { bar(k).style.width = `${(r[k] / max) * 100}%`; });
  }

  inputs.forEach(i => i.addEventListener('input', update));
  update();
}

})(window.Site = window.Site || {});
