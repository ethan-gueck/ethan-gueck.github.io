/**
 * One-dimensional COBYLA-style solver (Constrained Optimization BY Linear Approximation).
 *
 * Problem: find x in the normalized search space where the residual r(x) = 0, subject to
 * inequality constraints c_i(x) >= 0. Bounds (0 <= x <= 1) are treated as constraints too.
 *
 * Like Powell's COBYLA it uses only function values:
 *   1. Linear models. r and every c_i are approximated by straight lines through the two
 *      most recent points (the current best and the last other point).
 *   2. Trust region. The step zeroes the linear model of r, is limited to |d| <= rho, and is
 *      pulled back so the linearized constraints stay satisfied.
 *   3. Penalized merit. Points are compared with  phi(x) = |r(x)| + sigma * violation(x),
 *      so leaving the feasible search space is penalized instead of forbidden outright.
 *   4. rho only shrinks: halved when the model predicts poorly or the step is short.
 *
 * Stopping rules:
 *   xtol: the trust region radius rho falls below xtol.
 *   ftol: an accepted step improves phi by less than ftol.
 * Every evaluation is recorded so the demo can replay the search.
 */
(function (Site) {
'use strict';

Site.cobyla1d = function cobyla1d(r, opts) {
  var rho = opts.rhobeg, xtol = opts.xtol, ftol = opts.ftol;
  var sigma = opts.sigma || 1e3, maxEval = opts.maxEval || 500;
  var constraints = [function (x) { return x; }, function (x) { return 1 - x; }].concat(opts.constraints || []);
  var history = [], evals = 0;

  function evaluate(x) {
    evals++;
    var rv = r(x);
    var cv = constraints.map(function (c) { return c(x); });
    var viol = cv.reduce(function (s, c) { return s + Math.max(0, -c); }, 0);
    return { x: x, r: rv, c: cv, viol: viol, phi: Math.abs(rv) + sigma * viol };
  }

  function record(p, best, accepted) {
    history.push({ x: p.x, r: p.r, phi: p.phi, viol: p.viol, rho: rho, best: best.x, accepted: accepted,
                   active: best.c.slice(2).some(function (c) { return c < 1e-9; }) });
  }

  // Initial simplex: the starting guess and one point a trust radius away.
  var p0 = evaluate(opts.x0);
  var p1 = evaluate(opts.x0 + rho);
  var best = p1.phi < p0.phi ? p1 : p0, other = best === p0 ? p1 : p0;
  record(p0, p0, true);
  record(p1, best, best === p1);

  var reason = 'maxEval';
  while (evals < maxEval) {
    var dx = other.x - best.x;
    var slope = (other.r - best.r) / dx;

    // 1. Step that zeroes the linear model of r, limited to the trust region.
    var d = isFinite(slope) && slope !== 0 ? -best.r / slope : rho;
    if (Math.abs(d) > rho) d = d > 0 ? rho : -rho;

    // 2. Keep the linearized constraints satisfied: c_i + g_i * d >= 0.
    for (var i = 0; i < constraints.length; i++) {
      var g = (other.c[i] - best.c[i]) / dx;
      var ci = best.c[i];
      if (!isFinite(g) || g === 0) continue;
      var limit = -ci / g;                                 // step where the linear model hits zero
      if (g < 0 && d > limit) d = Math.max(limit, -rho);   // constraint decreasing: cap forward step
      if (g > 0 && d < limit) d = Math.min(limit, rho);    // constraint increasing: cap backward step
    }

    if (Math.abs(d) < 1e-15) {                             // pinned against an active constraint
      rho *= 0.5;
      if (rho < xtol) { reason = 'xtol'; break; }
      continue;
    }

    var trial = evaluate(best.x + d);
    var predR = Math.abs(best.r) - Math.abs(best.r + slope * d);
    var predicted = predR + sigma * best.viol;             // linearized violation is zeroed by the step
    var actual = best.phi - trial.phi;
    var ratio = predicted > 0 ? actual / predicted : -1;
    var accepted = trial.phi < best.phi;

    if (accepted) { other = best; best = trial; } else { other = trial; }
    if (ratio < 0.1 || Math.abs(d) < 0.5 * rho) rho *= 0.5;
    record(trial, best, accepted);

    if (accepted && actual < ftol) { reason = 'ftol'; break; }
    if (rho < xtol) { reason = 'xtol'; break; }
  }

  var active = best.c.slice(2).some(function (c) { return c < 1e-6; });
  return {
    x: best.x, r: best.r, phi: best.phi, rmse: Math.abs(best.r), constraintActive: active,
    evaluations: evals, iterations: history.length, history: history, reason: reason,
    merit: function (x) { return evaluate(x).phi; },
  };
};

})(window.Site = window.Site || {});
