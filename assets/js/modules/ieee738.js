/**
 * Simplified steady-state heat balance for 795 kcmil 26/7 "Drake" ACSR, following the method in
 * IEEE Std 738-2023. Solar-flux polynomial coefficients are the SI values tabulated in IEEE Std 738-2012.
 *   I^2 R(Tc) + qs = qc + qr   (all W/m)
 * Shared by the rating calculator and the COBYLA convergence demo.
 * Assumptions: sea level, wind perpendicular to the conductor, emissivity = absorptivity = 0.8,
 * and the sun's rays perpendicular to the conductor axis (worst-case orientation).
 */
(function (Site) {
'use strict';

var C = { D: 0.02814, R25: 7.283e-5, R75: 8.688e-5, emiss: 0.8, absorb: 0.8, elev: 0 };

function resistance(tc) { return C.R25 + ((C.R75 - C.R25) / 50) * (tc - 25); }

function air(tFilm) {
  return {
    mu: (1.458e-6 * Math.pow(tFilm + 273, 1.5)) / (tFilm + 383.4),
    rho: (1.293 - 1.525e-4 * C.elev + 6.379e-9 * C.elev * C.elev) / (1 + 0.00367 * tFilm),
    k: 2.424e-2 + 7.477e-5 * tFilm - 4.407e-9 * tFilm * tFilm,
  };
}

/**
 * Convective cooling, W/m. Forced convection at the wind speed is the larger of the low- and
 * high-wind forms; the governing value is the larger of that and natural convection.
 */
function convectionTerms(tc, ta, vw) {
  var dT = Math.max(tc - ta, 0);
  var a = air((tc + ta) / 2);
  var re = (C.D * a.rho * vw) / a.mu;
  var qc1 = (1.01 + 1.35 * Math.pow(re, 0.52)) * a.k * dT;
  var qc2 = 0.754 * Math.pow(re, 0.6) * a.k * dT;
  var qcn = 3.645 * Math.sqrt(a.rho) * Math.pow(C.D, 0.75) * Math.pow(dT, 1.25);
  var forced = Math.max(qc1, qc2);                 // q_c at the wind speed
  return { forced: forced, natural: qcn, qc: Math.max(qcn, forced), governs: qcn > forced ? 'natural' : 'forced' };
}
function convection(tc, ta, vw) { return convectionTerms(tc, ta, vw).qc; }

/** Radiative cooling, W/m. */
function radiation(tc, ta) {
  return 17.8 * C.D * C.emiss * (Math.pow((tc + 273) / 100, 4) - Math.pow((ta + 273) / 100, 4));
}

/** Total solar and sky heat flux polynomials, W/m^2, from IEEE 738 (SI coefficients A..G). */
var SOLAR = {
  clear:      [-42.2391, 63.8044, -1.9220, 3.46921e-2, -3.61118e-4, 1.94318e-6, -4.07608e-9],
  industrial: [53.1821, 14.2110, 6.6138e-1, -3.1658e-2, 5.4654e-4, -4.3446e-6, 1.3236e-8],
};

function dayOfYear(isoDate) {
  var p = String(isoDate).split('-').map(Number);
  var d = Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1);
  return Math.round((d - Date.UTC(p[0], 0, 0)) / 864e5);
}

/** True if a date falls in U.S. daylight saving time (second Sunday of March to first Sunday of November). */
function isUSDaylightTime(isoDate) {
  var p = String(isoDate).split('-').map(Number), y = p[0];
  var nthSunday = function (month, n) {
    var first = new Date(Date.UTC(y, month, 1)).getUTCDay();
    return 1 + ((7 - first) % 7) + (n - 1) * 7;
  };
  var start = Date.UTC(y, 2, nthSunday(2, 2)), end = Date.UTC(y, 10, nthSunday(10, 1));
  var d = Date.UTC(y, p[1] - 1, p[2]);
  return d >= start && d < end;
}

/**
 * Converts local clock time to solar time: removes daylight saving, corrects for longitude
 * relative to the time zone's standard meridian, and applies the equation of time.
 */
function solarHour(isoDate, clockHour, lonDeg, stdMeridianDeg) {
  var n = dayOfYear(isoDate);
  var b = (2 * Math.PI * (n - 81)) / 364;
  var eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);   // minutes
  var dst = isUSDaylightTime(isoDate) ? 1 : 0;
  return clockHour - dst + (4 * (lonDeg - stdMeridianDeg) + eot) / 60;
}

/** Sunrise and sunset in solar hours for a date and latitude. */
function sunriseSunset(isoDate, latDeg) {
  var rad = Math.PI / 180;
  var decl = 23.46 * Math.sin(((284 + dayOfYear(isoDate)) / 365) * 2 * Math.PI);
  var c = -Math.tan(latDeg * rad) * Math.tan(decl * rad);
  var w0 = Math.acos(Math.max(-1, Math.min(1, c))) / rad;   // hour angle at sunrise, degrees
  return { rise: 12 - w0 / 15, set: 12 + w0 / 15 };
}

/** Solar altitude in degrees for a date, latitude, and local solar hour (12 = solar noon). */
function solarAltitude(isoDate, latDeg, hour) {
  var rad = Math.PI / 180;
  var n = dayOfYear(isoDate);
  var decl = 23.46 * Math.sin(((284 + n) / 365) * 2 * Math.PI);
  var omega = (hour - 12) * 15;
  var s = Math.cos(latDeg * rad) * Math.cos(decl * rad) * Math.cos(omega * rad) +
          Math.sin(latDeg * rad) * Math.sin(decl * rad);
  return Math.asin(Math.max(-1, Math.min(1, s))) / rad;
}

function solarFlux(altDeg, atmosphere) {
  if (altDeg <= 0) return 0;
  var k = SOLAR[atmosphere] || SOLAR.clear, q = 0;
  for (var i = k.length - 1; i >= 0; i--) q = q * altDeg + k[i];
  return Math.max(0, q);
}

/** Solar heat gain per meter for a flux in W/m^2. */
function solarGain(flux) { return C.absorb * flux * C.D; }

/** Heat balance residual, W/m: positive means the conductor is still heating up. */
function residual(tc, p) {
  return p.current * p.current * resistance(tc) + p.qs - convection(tc, p.ta, p.vw) - radiation(tc, p.ta);
}

/** Current (A) that would hold the conductor at temperature tc under the given weather. */
function currentAt(tc, p) {
  var net = convection(tc, p.ta, p.vw) + radiation(tc, p.ta) - p.qs;
  return net > 0 ? Math.sqrt(net / resistance(tc)) : 0;
}

/**
 * Signed version of currentAt for the solver: below the temperature where cooling first exceeds solar
 * gain the supported current is imaginary, so return -sqrt(|net| / R) there. This keeps the amperage
 * residual monotonic across the whole search space instead of flat at zero.
 */
function signedCurrentAt(tc, p) {
  var net = convection(tc, p.ta, p.vw) + radiation(tc, p.ta) - p.qs;
  var i = Math.sqrt(Math.abs(net) / resistance(tc));
  return net >= 0 ? i : -i;
}

/** Steady-state rating (A) at a maximum conductor temperature. */
function rating(p) {
  var qc = convection(p.tc, p.ta, p.vw), qr = radiation(p.tc, p.ta), qs = p.qs;
  var net = qc + qr - qs;
  return { qc: qc, qr: qr, qsun: qs, amps: net > 0 ? Math.sqrt(net / resistance(p.tc)) : 0 };
}

Site.ieee738 = {
  conductor: C, resistance: resistance, convection: convection, convectionTerms: convectionTerms, radiation: radiation,
  solarAltitude: solarAltitude, solarFlux: solarFlux, solarGain: solarGain,
  residual: residual, rating: rating, currentAt: currentAt, signedCurrentAt: signedCurrentAt, dayOfYear: dayOfYear,
  solarHour: solarHour, isUSDaylightTime: isUSDaylightTime, sunriseSunset: sunriseSunset,
};

})(window.Site = window.Site || {});
