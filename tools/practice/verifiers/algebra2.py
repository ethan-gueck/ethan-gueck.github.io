"""Independent answers for practice/algebra2.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]), and asserts the promises
each problem makes (integer answers, a valid domain, a unique matching option, ...). Exact fractions
and SymPy; nothing here is copied from the JavaScript."""
from fractions import Fraction as F
from math import ceil, comb, factorial, floor, gcd, isqrt, log, exp
import math

import sympy as sp
from sympy.calculus.util import continuous_domain, function_range

X = sp.symbols("x", real=True)
Yv = sp.symbols("y", real=True)
T = sp.symbols("t", positive=True)


def fr(q):  # a Fraction (or SymPy rational) as the {n, d} the generator reports
    if isinstance(q, sp.Basic):
        q = sp.Rational(q)
        q = F(int(q.p), int(q.q))
    q = F(q)
    return {"n": q.numerator, "d": q.denominator}


def Q(v):  # a {n, d} or number param as a Fraction
    if isinstance(v, dict):
        return F(v["n"], v["d"])
    return F(str(v)) if isinstance(v, float) else F(v)


def S(q):  # a Fraction as a SymPy Rational
    q = F(q)
    return sp.Rational(q.numerator, q.denominator)


def ex(e):  # a SymPy expression in the parser's syntax
    return str(e).replace("**", "^").replace("Abs(", "abs(")


def coeffs(e, deg, var=X):  # coefficients of a polynomial, highest power first, zeros kept
    e = sp.expand(e)
    return [e.coeff(var, k) for k in range(deg, -1, -1)]


def ilist(cs):
    return [int(c) for c in cs]


# ---- A2.1 ------------------------------------------------------------------------------------------
def a2_1(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b, c, d, t, op = (q[k] for k in ("a", "b", "c", "d", "t", "op"))
        f, g = a * X + b, c * X + d
        if op == 3:
            ans = int(f.subs(X, g).subs(X, t))
            return {"answer": ans, "vals": {"gval": int(g.subs(X, t)), "ans": ans}}
        ans = int([f + g, f - g, f * g][op].subs(X, t))
        return {"answer": ans, "vals": {"fval": int(f.subs(X, t)), "gval": int(g.subs(X, t)), "ans": ans}}
    if L == 2:
        if q["kind"] == 0:
            a, b = q["a"], q["b"]
            inv = sp.solve(sp.Eq(a * Yv + b, X), Yv)[0]
            assert sp.simplify((a * X + b).subs(X, inv) - X) == 0 and sp.simplify(inv.subs(X, a * X + b) - X) == 0
            m, c0 = inv.coeff(X, 1), inv.subs(X, 0)
            return {"answer": ex(inv), "vals": {"m": fr(m), "c0": fr(c0)}}
        h, k = q["h"], q["k"]
        assert h != 0 and k != 0
        f = lambda v: (v - h) ** 3 + k
        g = lambda v: math.copysign(abs(v - k) ** (1 / 3), v - k) + h
        for v in (-7.5, -2.0, 0.3, 1.0, 4.2, 9.9):
            assert abs(f(g(v)) - v) < 1e-9 and abs(g(f(v)) - v) < 1e-9
        return {"answer": f"cbrt(x - ({k})) + ({h})", "vals": {}}
    a, b, c, d, t = (q[k] for k in ("a", "b", "c", "d", "t"))
    comp = sp.expand((a * X + b).subs(X, c * X + d))
    s = sp.solve(sp.Eq(comp, t), X)
    assert len(s) == 1 and s[0].is_integer
    u = sp.solve(sp.Eq(a * X + b, t), X)[0]
    assert u.is_integer and sp.solve(sp.Eq(c * X + d, u), X)[0] == s[0]
    return {"answer": int(s[0]), "vals": {"tb": t - b, "u": int(u), "ud": int(u - d), "s": int(s[0])}}


# ---- A2.parent ---------------------------------------------------------------------------------------
PARENTS = [X, X ** 2, X ** 3, sp.Abs(X), sp.sqrt(X), 1 / X, sp.Integer(2) ** X, sp.log(X, 2)]
KEYPTS = [[(0, 0), (1, 1)], [(-1, 1), (0, 0), (1, 1)], [(-1, -1), (0, 0), (1, 1)], [(-1, 1), (0, 0), (1, 1)],
          [(0, 0), (1, 1), (4, 2)], [(-1, -1), (1, 1)], [(0, 1), (1, 2)], [(1, 0), (2, 1)]]
R0 = sp.Union(sp.Interval.open(-sp.oo, 0), sp.Interval.open(0, sp.oo))
DRSETS = [(sp.S.Reals, sp.S.Reals), (sp.S.Reals, sp.Interval(0, sp.oo)), (sp.Interval(0, sp.oo), sp.Interval(0, sp.oo)),
          (R0, R0), (sp.S.Reals, sp.Interval.open(0, sp.oo)), (sp.Interval.open(0, sp.oo), sp.S.Reals)]


def domain_range(k):
    f = PARENTS[k]
    if k == 6:  # SymPy's function_range mishandles 2**x; use 2**x = e^(x ln 2)
        f = sp.exp(X * sp.log(2))
    d = continuous_domain(f, X, sp.S.Reals)
    return d, function_range(f, X, d)


def classify(e, v):
    """The parent family of a formula in v: 0 linear ... 7 logarithmic."""
    if e.has(sp.log):
        return 7
    if any(isinstance(a, sp.Pow) and a.exp.has(v) for a in sp.preorder_traversal(e)):
        return 6
    if e.has(sp.Abs):
        return 3
    if e.is_polynomial(v):
        return {1: 0, 2: 1, 3: 2}[sp.degree(e, v)]
    if sp.simplify(e ** 2).is_polynomial(v) and sp.degree(sp.simplify(e ** 2), v) == 1:
        return 4
    if sp.simplify(1 / e).is_polynomial(v) and sp.degree(sp.simplify(1 / e), v) == 1:
        return 5
    raise AssertionError(f"unclassified {e}")


def a2_parent(p):
    q, L = p["params"], p["level"]
    if L == 1:
        k, opts = q["drawn"], q["opts"]
        assert len(set(opts)) == 4 and opts.count(k) == 1
        for (a, b) in KEYPTS[k]:
            assert sp.simplify(PARENTS[k].subs(X, a) - b) == 0
        return {"answer": opts.index(k), "vals": {}}
    if L == 2:
        k, opts = q["which"], q["opts"]
        dr = domain_range(k)
        match = [i for i, (d, r) in enumerate(DRSETS) if d == dr[0] and r == dr[1]]
        assert len(match) == 1, f"domain/range {dr}"
        assert len(set(opts)) == 4 and opts.count(match[0]) == 1
        return {"answer": opts.index(match[0]), "vals": {}}
    sc, opts = q["sc"], q["opts"]
    e = [lambda: q["s"] * T, lambda: sp.pi * T ** 2, lambda: T ** 3, lambda: sp.Abs(T - q["m"]), lambda: sp.sqrt(T),
         lambda: q["D"] / T, lambda: q["N0"] * sp.Integer(2) ** (T / q["hh"]), lambda: q["dd"] * sp.log(T, 2)][sc]()
    fam = classify(e, T)
    assert fam == sc
    assert len(set(opts)) == 4 and opts.count(fam) == 1
    return {"answer": opts.index(fam), "vals": {}}


# ---- A2.even-odd ---------------------------------------------------------------------------------------
def parity(f):
    """0 even, 1 odd, 2 neither, by exact values at sample points (and SymPy when it can simplify)."""
    pts = [sp.Rational(1, 3), sp.Rational(1, 2), 1, sp.Rational(5, 2), 3, 7]
    vals = [(sp.nsimplify(f.subs(X, s)), sp.nsimplify(f.subs(X, -s))) for s in pts]
    even = all(sp.simplify(m - v) == 0 for v, m in vals)
    odd = all(sp.simplify(m + v) == 0 for v, m in vals)
    assert not (even and odd)
    if even:
        assert sp.simplify(f.subs(X, -X) - f) == 0
        return 0
    if odd:
        assert sp.simplify(f.subs(X, -X) + f) == 0
        return 1
    return 2


def a2_even_odd(p):
    q, L = p["params"], p["level"]
    if L == 1:
        cs = q["coefs"]
        f = sum(c * X ** (len(cs) - 1 - i) for i, c in enumerate(cs))
        return {"answer": parity(f), "vals": {}}
    if L == 2:
        a, b, t = q["a"], q["b"], q["t"]
        f = [a * X ** 3 / (X ** 2 + b), a * X ** 2 + b * sp.Abs(X), a * X * sp.Abs(X), (a * X ** 2 + b) / X, sp.sqrt(X ** 2 + b),
             sp.Abs(X + b), X ** 3 + a, (X ** 3 + a * X) * (X ** 2 + b), (X ** 3 + a * X) * (X ** 3 - b * X)][t]
        return {"answer": parity(f), "vals": {}}
    if "ys" in q:
        ys, c, odd = q["ys"], q["c"], q["odd"]
        if odd:
            assert ys[0] == 0, "an odd graph through x = 0 must pass through the origin"
        fc = ys[c]
        assert fc != 0
        ans = -fc if odd else fc
        return {"answer": ans, "vals": {"fc": fc, "ans": ans}}
    cs, even = q["coefs"], q["even"]
    deg = len(cs) - 1
    f = sum(c * X ** (deg - i) for i, c in enumerate(cs))
    fneg = sp.expand(f.subs(X, -X))
    s = sp.expand(f + fneg if even else f - fneg)
    part = sp.expand(s / 2)
    assert parity(part) == (0 if even else 1)
    other = sp.expand(f - part)
    assert parity(other) == (1 if even else 0)
    return {"answer": ex(part), "vals": {"neg": ilist(coeffs(fneg, deg)), "sum": ilist(coeffs(s, deg)), "part": ilist(coeffs(part, deg))}}


# ---- A2.piecewise -----------------------------------------------------------------------------------------
def a2_piecewise(p):
    q, L = p["params"], p["level"]
    if L == 1:
        c, t = q["c"], q["t"]
        second = X ** 2 + q["e"] if q["quad"] else q["m2"] * X + q["b2"]
        f = sp.Piecewise((q["m1"] * X + q["b1"], X < c), (second, True))
        ans = int(f.subs(X, t))
        vals = {"ans": ans}
        if q["quad"] and t >= c:
            vals["tt"] = t * t
        return {"answer": ans, "vals": vals}
    if L == 2:
        fs = [sp.floor, sp.ceiling, sp.sign, lambda u: sp.Max(0, u)]
        vs = [S(F(str(u))) for u in q["us"]]
        vs = [fs[k](u) for k, u in zip(q["kinds"], vs)]
        ans = sum(s * v for s, v in zip(q["sg"], vs))
        return {"answer": float(ans), "vals": {"vs": [float(v) for v in vs], "ans": float(ans)}}
    if "H" in q:
        a, b, H, Mi, capV = Q(q["a"]), Q(q["b"]), q["H"], q["Mi"], Q(q["cap"])
        t = H + F(Mi, 60)
        extra = ceil(t - 1)
        assert extra == H and 0 < Mi < 60
        raw = a + b * extra
        cost = min(raw, capV)
        assert capV > a + b
        return {"answer": float(cost), "vals": {"Hm1": H - 1, "raw": float(raw), "cost": float(cost)}}
    a, b, c, k = q["a"], q["b"], q["c"], sp.symbols("k")
    left = (a * X + b).subs(X, c)
    if q["quad"]:
        kk = sp.solve(sp.Eq((X ** 2 + k).subs(X, c), left), k)[0]
        assert kk.is_integer
        f = sp.Piecewise((a * X + b, X < c), (X ** 2 + kk, True))
        vals = {"L": int(left), "cc": c * c, "k": int(kk)}
    else:
        kk = sp.solve(sp.Eq((k * X + q["d"]).subs(X, c), left), k)[0]
        assert kk.is_integer
        f = sp.Piecewise((a * X + b, X < c), (kk * X + q["d"], True))
        vals = {"L": int(left), "Ld": int(left - q["d"]), "k": int(kk)}
    assert sp.limit(f, X, c, "-") == sp.limit(f, X, c, "+") == f.subs(X, c)
    return {"answer": int(kk), "vals": vals}


# ---- A2.2 Transformations ------------------------------------------------------------------------------------
def a2_2(p):
    q, L = p["params"], p["level"]
    f = sp.Function("f")
    if L <= 2:
        p0, q0, h, k = q["p"], q["q"], q["h"], q["k"]
        a = S(Q(q["a"])) if L == 2 else 1
        b = q["b"] if L == 2 else 1
        inside = b * X - b * h
        # the new graph y = a f(inside) + k hits the known value f(p0) = q0 where inside = p0
        Xn = sp.solve(sp.Eq(inside, p0), X)[0]
        Yn = (a * f(inside) + k).subs(X, Xn).subs(f(p0), q0)
        assert not Yn.has(f)
        if L == 1:
            return {"answer": [int(Xn), int(Yn)], "vals": {"X": int(Xn), "Y": int(Yn)}}
        return {"answer": [float(Xn), float(Yn)],
                "vals": {"c0": -b * h, "pb": fr(sp.Rational(p0, b)), "X": fr(Xn), "aq": fr(a * q0), "Y": fr(Yn)}}
    par, pts = q["par"], q["pts"]
    (h, k), (x1, y1) = pts[0], pts[1]
    step = x1 - h
    parent = [sp.Abs(X), X ** 2, sp.sqrt(X)][par]
    rise = parent.subs(X, step)
    dy = S(F(str(y1))) - k
    a = dy / rise
    curve = a * parent.subs(X, X - h) + k
    for (u, v) in pts:
        assert sp.simplify(curve.subs(X, u) - S(F(str(v)))) == 0, "a marked point is off the curve"
        assert u == int(u) and F(str(v)).denominator == 1, "marked points must be grid points"
    vals = {"step": step, "rise": int(rise), "dy": fr(dy), "a": fr(a), "h": h, "k": k}
    if par == 2:
        return {"answer": [float(a), h, k], "vals": vals}
    return {"answer": ex(curve), "vals": vals}


# ---- A2.3 Complex numbers ----------------------------------------------------------------------------------------
def cstr(z):
    z = sp.nsimplify(sp.expand(z))
    return f"({sp.re(z)}) + ({sp.im(z)})*i"


def a2_3(p):
    q, L = p["params"], p["level"]
    I = sp.I
    if L == 1:
        if q["kind"] == 0:
            z = (q["a"] + q["b"] * I) + (-1 if q["sub"] else 1) * (q["c"] + q["d"] * I)
            return {"answer": cstr(z), "vals": {"re": int(sp.re(z)), "im": int(sp.im(z))}}
        N = q["N"]
        return {"answer": cstr(I ** N), "vals": {"q": N // 4, "m": N % 4}}
    if L == 2:
        a, b = q["a"], q["b"]
        if q["kind"] == 0:
            c, d = q["c"], q["d"]
            z = sp.expand((a + b * I) * (c + d * I))
            return {"answer": cstr(z), "vals": {"ac": a * c, "ad": a * d, "bc": b * c, "bd": b * d, "nbd": -b * d, "re": int(sp.re(z)), "im": int(sp.im(z))}}
        m = sp.Abs(a + b * I)
        assert m.is_integer
        return {"answer": int(m), "vals": {"a": a, "b": b, "aa": a * a, "bb": b * b, "mm": int(m) ** 2, "m": int(m)}}
    if q["kind"] == 0:
        a, b, c, d = q["a"], q["b"], q["c"], q["d"]
        z = sp.simplify((a + b * I) / (c + d * I))
        assert sp.simplify(z * (c + d * I) - (a + b * I)) == 0
        top = sp.expand((a + b * I) * (c - d * I))
        D = sp.expand((c + d * I) * (c - d * I))
        assert D.is_integer and D > 0
        re, im = sp.re(z), sp.im(z)
        assert re != 0 and im != 0
        return {"answer": cstr(z), "vals": {"ac": a * c, "ad": -a * d, "bc": b * c, "bd": -b * d, "D": int(D), "reN": int(sp.re(top)),
                                          "imN": int(sp.im(top)), "re": fr(re), "im": fr(im)}}
    a, b, c = q["a"], q["b"], q["c"]
    roots = sp.solve(a * X ** 2 + b * X + c, sp.symbols("z"))
    z = sp.symbols("z")
    roots = sp.solve(a * z ** 2 + b * z + c, z)
    assert len(roots) == 2 and all(sp.im(r) != 0 for r in roots)
    assert sp.simplify(roots[0] - sp.conjugate(roots[1])) == 0
    top = [r for r in roots if sp.im(r) > 0][0]
    D = b * b - 4 * a * c
    s = sp.sqrt(-D)
    assert s.is_integer
    return {"answer": cstr(top), "vals": {"BB": b * b, "ac4": 4 * a * c, "D": D, "nD": -D, "s": int(s), "nB": -b, "twoA": 2 * a,
                                         "h": int(sp.re(top)), "k": int(sp.im(top))}}


VERIFY = {
    "A2.1": a2_1, "A2.parent": a2_parent, "A2.even-odd": a2_even_odd, "A2.piecewise": a2_piecewise, "A2.2": a2_2, "A2.3": a2_3,
}


# ---- A2.poly-division ------------------------------------------------------------------------------------------
def synthetic_rows(coefs, c):
    """The products and sums rows of synthetic division, read off SymPy's quotient and remainder."""
    P = sp.Poly(coefs, X)
    q, rem = sp.div(P, sp.Poly(X - c, X))
    qc = q.all_coeffs() if not q.is_zero else [0]
    qc = [0] * (len(coefs) - 1 - len(qc)) + qc
    sums = [int(v) for v in qc] + [int(rem.as_expr())]
    prods = [sums[i + 1] - coefs[i + 1] for i in range(len(coefs) - 1)]
    assert all(prods[i] == c * sums[i] for i in range(len(prods)))
    return prods, sums, q.as_expr(), rem.as_expr()


def a2_poly_division(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        coefs, c = q["coefs"], q["c"]
        prods, sums, quo, rem = synthetic_rows(coefs, c)
        if L == 1:
            assert rem == 0
            return {"answer": ex(quo), "vals": {"prods": prods, "sums": sums}}
        assert rem != 0 and coefs.count(0) == 1 and coefs[3] != 0
        assert sp.expand((X - c) * quo + rem - sp.Poly(coefs, X).as_expr()) == 0
        return {"answer": ex(quo + rem / (X - c)), "vals": {"prods": prods, "sums": sums}}
    if "D" in q:
        Pc, Dc = q["P"], q["D"]
        P, D = sp.Poly(Pc, X).as_expr(), sp.Poly(Dc, X).as_expr()
        quo, rem = sp.div(P, D, X)
        assert sp.degree(rem, X) < 2 and rem != 0 and sp.degree(quo, X) == 1
        a, s_ = int(quo.coeff(X, 1)), int(quo.coeff(X, 0))
        assert s_ != 0
        m1 = sp.expand(a * X * D)
        r1 = sp.expand(P - m1)
        m2 = sp.expand(s_ * D)
        assert sp.expand(r1 - m2 - rem) == 0
        return {"answer": ex(quo + rem / D), "vals": {"Pc": Pc, "m1": ilist(coeffs(m1, 3)[:3]), "r1": ilist(coeffs(r1, 2)),
                                                      "m2": ilist(coeffs(m2, 2)), "Qc": [a, s_], "Rc": ilist(coeffs(rem, 1))}}
    pp, qq, V = q["p"], q["q"], q["V"]
    p1, s1, Q1, r1 = synthetic_rows(V, -pp)
    assert r1 == 0
    Q1c = ilist(coeffs(Q1, 2))
    p2, s2, H, r2 = synthetic_rows(Q1c, -qq)
    assert r2 == 0 and sp.degree(H, X) == 1 and H.coeff(X, 1) == 1
    h = int(H.coeff(X, 0))
    assert h > 0 and sp.expand((X + pp) * (X + qq) * H - sp.Poly(V, X).as_expr()) == 0
    return {"answer": ex(H), "vals": {"V": V, "p1": p1, "s1": s1, "p2": p2, "s2": s2, "h": h}}


# ---- A2.4 Remainder, factor, rational roots ------------------------------------------------------------------------
def a2_4(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b, c, d, t = (q[k] for k in "abcdt")
        P = a * X ** 3 + b * X ** 2 + c * X + d
        R = sp.rem(P, X - t, X)
        return {"answer": int(R), "vals": {"t2": t ** 2, "t3": t ** 3, "A": a * t ** 3, "B": b * t ** 2, "C": c * t, "R": int(R)}}
    if L == 2:
        k = sp.symbols("k")
        if "co" in q:
            co = q["co"]
            P = sp.Poly(co, X)
            rts = sp.roots(P)
            assert sum(rts.values()) == 3
            sm = sum(r * m for r, m in rts.items())
            pr = sp.prod([r ** m for r, m in rts.items()])
            assert sm == sp.Rational(-co[1], co[0]) and pr == sp.Rational(-co[3], co[0])
            return {"answer": [float(sm), float(pr)], "vals": {"sum": fr(sm), "prod": fr(pr)}}
        a, c = q["a"], q["c"]
        if q["pos"] == 0:
            b = q["b"]
            P = X ** 3 + a * X ** 2 + b * X + k
            K = sp.solve(sp.rem(P, X - c, X), k)[0]
            assert K.is_integer and sp.rem(P.subs(k, K), X - c, X) == 0
            S_ = c ** 3 + a * c ** 2 + b * c
            return {"answer": int(K), "vals": {"c3": c ** 3, "ac2": a * c * c, "bc": b * c, "S": S_, "K": int(K)}}
        d = q["d"]
        P = X ** 3 + a * X ** 2 + k * X + d
        K = sp.solve(sp.rem(P, X - c, X), k)[0]
        assert K.is_integer and K != 0 and sp.rem(P.subs(k, K), X - c, X) == 0
        S_ = c ** 3 + a * c ** 2 + d
        return {"answer": int(K), "vals": {"c3": c ** 3, "ac2": a * c * c, "S": S_, "nS": -S_, "K": int(K)}}
    co = q["co"]
    P = sp.Poly(co, X)
    rts = sp.roots(P)
    assert len(rts) == 3 and all(m == 1 and r.is_rational for r, m in rts.items())
    A, a0 = co[0], abs(co[3])
    cands = sorted({F(pn, qd) for pn in range(1, a0 + 1) if a0 % pn == 0 for qd in range(1, abs(A) + 1) if abs(A) % qd == 0})
    tests, root = [], None
    for c in cands:
        for sg in (1, -1):
            v = P.eval(S(c * sg))
            tests.append([fr(c * sg), fr(v)])
            if v == 0:
                root = c * sg
                break
        if root is not None:
            break
    assert root is not None and S(root) in rts
    quo, rem = sp.div(P.as_expr(), X - S(root), X)
    assert rem == 0
    qa, qb, qc = coeffs(quo, 2)
    Dq = qb ** 2 - 4 * qa * qc
    sD = sp.sqrt(Dq)
    assert sD.is_integer
    x1, x2 = (-qb + sD) / (2 * qa), (-qb - sD) / (2 * qa)
    assert {x1, x2, S(root)} == set(rts)
    return {"answer": [float(r) for r in rts], "vals": {"cands": [fr(c) for c in cands], "tests": tests, "root": fr(root),
                                                       "q": [fr(qa), fr(qb), fr(qc)], "Dq": int(Dq), "sD": int(sD), "x1": fr(x1), "x2": fr(x2)}}


# ---- A2.end-behavior ------------------------------------------------------------------------------------------------
def a2_end_behavior(p):
    q, L = p["params"], p["level"]
    if L == 1:
        P = sp.Poly(q["coefs"], X).as_expr()
        left, right = sp.limit(P, X, -sp.oo), sp.limit(P, X, sp.oo)
        idx = {(sp.oo, sp.oo): 0, (-sp.oo, -sp.oo): 1, (-sp.oo, sp.oo): 2, (sp.oo, -sp.oo): 3}[(left, right)]
        return {"answer": idx, "vals": {}}
    s, rts, ms = q["s"], q["rts"], q["ms"]
    P = s * sp.prod([(X - r) ** m for r, m in zip(rts, ms)])
    mult = sp.roots(sp.Poly(sp.expand(P), X))
    deg = sp.degree(sp.expand(P), X)
    if L == 2:
        even = [r for r in rts if mult[r] % 2 == 0]
        assert 0 < len(even) < len(rts)
        for r in rts:  # an even zero keeps the sign on both sides, an odd one flips it
            e = sp.Rational(1, 10)
            same = sp.sign(P.subs(X, r - e)) == sp.sign(P.subs(X, r + e))
            assert same == (mult[r] % 2 == 0)
        return {"answer": even, "vals": {"even": even, "deg": deg}}
    opts = q["opts"]
    match = [i for i, (ss, rr, mm) in enumerate(opts) if sp.expand(ss * sp.prod([(X - r) ** m for r, m in zip(rr, mm)]) - P) == 0]
    assert len(match) == 1
    return {"answer": match[0], "vals": {"deg": deg}}


# ---- A2.5 Rational functions -------------------------------------------------------------------------------------------
def a2_5(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b, c, d = (q[k] for k in "abcd")
        f = (a * X + b) / (c * X + d)
        va = sp.solve(c * X + d, X)[0]
        top = (a * X + b).subs(X, va)
        assert top != 0 and sp.limit(f, X, va, "+") in (sp.oo, -sp.oo)
        ha = sp.limit(f, X, sp.oo)
        return {"answer": [float(va), float(ha)], "vals": {"va": fr(va), "ha": fr(ha), "top": fr(top)}}
    if L == 2:
        num, den = sp.Poly(q["num"], X).as_expr(), sp.Poly(q["den"], X).as_expr()
        g = sp.gcd(num, den)
        assert sp.degree(g, X) == 1
        pp = sp.solve(g, X)[0]
        qq = sp.solve(sp.cancel(num / g), X)[0]
        ss = sp.solve(sp.cancel(den / g), X)[0]
        hy = sp.limit(num / den, X, pp)
        assert hy.is_finite and sp.limit(num / den, X, ss, "+") in (sp.oo, -sp.oo)
        return {"answer": [float(pp), float(hy)], "vals": {"p": int(pp), "q": int(qq), "s": int(ss), "B1": q["num"][1], "C1": q["num"][2], "B2": q["den"][1], "C2": q["den"][2],
                                                           "pq": int(pp - qq), "ps": int(pp - ss), "hy": fr(hy)}}
    if "B" in q:
        B, C, d = q["B"], q["C"], q["d"]
        f = (X ** 2 + B * X + C) / (X - d)
        quo, rem = sp.div(X ** 2 + B * X + C, X - d, X)
        assert rem != 0 and sp.limit(f - quo, X, sp.oo) == 0
        return {"answer": ex(quo), "vals": {"q1": int(quo.coeff(X, 0)), "dq1": int(d * quo.coeff(X, 0)), "R": int(rem)}}
    v, h, k, opts = q["v"], q["h"], q["k"], q["opts"]
    f = v + sp.Integer(k) / (X - h)
    match = [i for i, (vv, hh, kk) in enumerate(opts) if sp.simplify((vv * X + kk - vv * hh) / (X - hh) - f) == 0]
    assert len(match) == 1
    assert sp.limit(f, X, sp.oo) == v and sp.limit(f, X, h, "+") in (sp.oo, -sp.oo)
    tops = [int(sp.Poly(sp.cancel((vv * X + kk - vv * hh)), X).all_coeffs()[-1]) for vv, hh, kk in opts]
    return {"answer": match[0], "vals": {"top": k - v * h, "xp": h + 1, "yp": int(f.subs(X, h + 1)), "tops": tops}}


# ---- A2.rational-eq -------------------------------------------------------------------------------------------------------
def a2_rational_eq(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b, c, d = (q[k] for k in "abcd")
        sol = sp.solve(sp.Eq(sp.Integer(a) / (X + b), sp.Integer(c) / (X + d)), X)
        assert len(sol) == 1 and sol[0].is_integer
        s_ = int(sol[0])
        return {"answer": s_, "vals": {"nb": -b, "nd": -d, "ad": a * d, "cb": c * b, "k": a - c, "rhs": c * b - a * d, "s": s_}}
    if L == 2:
        a, Lc, Mm = q["a"], q["L"], q["Mm"]
        sol = sp.solve(sp.Eq(X ** 2 / (X - a), (Lc * X - Mm) / (X - a)), X)
        cands = sp.solve(X ** 2 - Lc * X + Mm, X)
        assert a in cands and len(sol) == 1 and sol[0] != a
        return {"answer": int(sol[0]), "vals": {"L": Lc, "Mm": Mm, "v": int(sol[0])}}
    if "t1" in q and q["find"] == 0:
        t1, t2 = q["t1"], q["t2"]
        Tt = sp.solve(sp.Eq(sp.Rational(1, t1) + sp.Rational(1, t2), 1 / T), T)[0]
        assert Tt.is_integer
        return {"answer": int(Tt), "vals": {"lcd": t1 * t2, "sum": t1 + t2, "T": int(Tt)}}
    if "t1" in q:
        t1, Tt = q["t1"], q["T"]
        t2 = sp.solve(sp.Eq(sp.Rational(1, t1) + 1 / T, sp.Rational(1, Tt)), T)[0]
        assert t2.is_integer and t2 > t1
        return {"answer": int(t2), "vals": {"lcd2": Tt * t1, "diff": t1 - Tt, "t2": int(t2)}}
    pp, qq, greater = q["p"], q["q"], q["greater"]
    e = (X - pp) / (X - qq)
    sol = sp.solve_univariate_inequality(e > 0 if greater else e < 0, X, relational=False)
    lo, hi = min(pp, qq), max(pp, qq)
    if sol == sp.Interval.open(lo, hi):
        inside = 1
    elif sol == sp.Union(sp.Interval.open(-sp.oo, lo), sp.Interval.open(hi, sp.oo)):
        inside = 0
    else:
        raise AssertionError(f"unexpected solution set {sol}")
    assert inside == q["inside"]
    return {"answer": [lo, hi], "vals": {"lo": lo, "hi": hi}}


# ---- A2.radical-eq ------------------------------------------------------------------------------------------------------------
def a2_radical_eq(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b, c, cube = q["a"], q["b"], q["c"], q["cube"]
        n_ = 3 if cube else 2
        sol = sp.solve(sp.Eq(a * X + b, sp.Integer(c) ** n_), X)
        assert len(sol) == 1 and sol[0].is_integer
        s_ = int(sol[0])
        assert sp.real_root(a * s_ + b, n_) == c  # the root of the original really equals c
        return {"answer": s_, "vals": {"pw": c ** n_, "pb": c ** n_ - b, "sol": s_}}
    if L == 2:
        b, c = q["b"], q["c"]
        cands = sp.solve(sp.expand((X + c) ** 2 - (X + b)), X)
        good = [v for v in cands if sp.sqrt(v + b) == v + c]
        bad = [v for v in cands if sp.sqrt(v + b) != v + c]
        assert len(good) == 1 and len(bad) == 1
        v, e = int(good[0]), int(bad[0])
        assert sp.solve(sp.Eq(sp.sqrt(X + b), X + c), X) == [v]
        return {"answer": v, "vals": {"c2": 2 * c, "cc": c * c, "k1": 2 * c - 1, "k0": c * c - b, "v": v, "e": e,
                                      "sqv": (v + c) ** 2, "sqe": (e + c) ** 2, "vc": v + c, "ec": e + c}}
    kind = q["kind"]
    if kind == 0:
        A, C = q["A"], q["C"]
        sol = sp.solve(sp.Eq(sp.sqrt(X + A) + sp.sqrt(X), C), X)
        assert len(sol) == 1 and sol[0].is_integer
        xv = int(sol[0])
        t = isqrt(xv)
        assert t * t == xv
        return {"answer": xv, "vals": {"A": A, "C": C, "CC": C * C, "C2": 2 * C, "top": C * C - A, "t": t, "tt": xv, "u": isqrt(xv + A)}}
    if kind == 1:
        s_, f = q["s"], Q(q["f"])
        d = sp.solve(sp.Eq(sp.sqrt(30 * X * S(f)), s_), X)
        assert len(d) == 1 and d[0].is_integer
        return {"answer": int(d[0]), "vals": {"ss": s_ * s_, "tf": float(30 * f), "d": int(d[0])}}
    m, nn, k = q["m"], q["nn"], q["k"]
    # real x with (real nn-th root of x)^m = k
    t = round(k ** (1 / m))
    assert t ** m == k
    cands = [t ** nn, -(t ** nn)]
    sols = []
    for c in cands:
        if c < 0 and nn % 2 == 0:
            continue
        if sp.real_root(c, nn) ** m == k:
            sols.append(c)
    return {"answer": sols, "vals": {"k": k, "t": t, "xv": t ** nn}}


VERIFY.update({"A2.poly-division": a2_poly_division, "A2.4": a2_4, "A2.end-behavior": a2_end_behavior, "A2.5": a2_5,
               "A2.rational-eq": a2_rational_eq, "A2.radical-eq": a2_radical_eq})


# ---- A2.6 Growth and decay ---------------------------------------------------------------------------------------------
def cents(v):
    """Round a positive exact value to cents, halves up (as a float)."""
    v = sp.Rational(v) if not isinstance(v, sp.Basic) else v
    c = sp.floor(v * 100 + sp.Rational(1, 2))
    return float(sp.Rational(c, 100))


def a2_6(p):
    q, L = p["params"], p["level"]
    if L == 1:
        y0, hl, Tt = q["y0"], q["hl"], q["T"]
        k = F(Tt, hl)
        assert k.denominator == 1
        k = int(k)
        ans = F(y0) * (F(1, 2) ** k if q["decay"] else 2 ** k)
        assert ans.denominator == 1
        return {"answer": int(ans), "vals": {"k": k, "pow2": 2 ** k, "ans": int(ans)}}
    if L == 2:
        Pp, rp, nper, years, cont = q["Pp"], q["rp"], q["nper"], q["years"], q["cont"]
        if cont:
            rt = sp.Rational(rp * years, 100)
            fac = sp.exp(rt).evalf(40)
            N = 0
        else:
            N = nper * years
            fac = (1 + sp.Rational(rp, 100 * nper)) ** N
            rt = 0
        exact = Pp * fac
        frac_c = (exact * 100 - sp.floor(exact * 100)).evalf(30)
        assert abs(frac_c - sp.Rational(1, 2)) > 0.04, "too close to a half cent"
        A = cents(sp.nsimplify(exact.evalf(40), rational=True))
        fac6 = sp.Rational(round(float(fac) * 10 ** 6), 10 ** 6)
        assert cents(Pp * fac6) == A, "the shown 6-decimal factor rounds to a different cent"
        return {"answer": A, "vals": {"rdec": rp / 100, "N": N, "rt": float(rt), "fac": float(fac), "A": A}}
    y0, y1, y2, t1 = q["y0"], q["y1"], q["y2"], q["t1"]
    r1, r2 = sp.Rational(y1, y0), sp.Rational(y2, y0)
    # model y = y0·r1^(t/t1); solve y = y2
    tt = sp.symbols("tt", positive=True)
    t2 = sp.solve(sp.Eq(y0 * r1 ** (tt / t1), y2), tt)
    assert len(t2) == 1
    t2 = sp.nsimplify(sp.simplify(t2[0]))
    assert t2.is_integer
    g = None
    for gg in (2, 3, sp.Rational(1, 2)):
        a = sp.log(r1) / sp.log(gg)
        if sp.simplify(a).is_integer:
            g, a = gg, int(sp.simplify(a))
            break
    a = abs(a)
    b = abs(int(sp.simplify(sp.log(r2) / sp.log(g))))
    ga, gb = (int(r1), int(r2)) if r1 > 1 else (int(1 / r1), int(1 / r2))
    k = float(sp.log(r1) / t1)
    return {"answer": int(t2), "vals": {"g": 3 if g == 3 else 2, "ga": ga, "gb": gb, "a": a, "b": b, "d": t1 // a, "t2": int(t2), "k": k}}


# ---- A2.7 Logarithms -----------------------------------------------------------------------------------------------------
def a2_7(p):
    q, L = p["params"], p["level"]
    if L == 1:
        b, k = q["b"], q["k"]
        kk = sp.Rational(1, 2) if k == 0.5 else sp.Integer(k)
        xv = sp.Integer(b) ** kk
        ans = sp.simplify(sp.log(xv, b))
        assert ans == kk
        bk = b if k == 0.5 else b ** abs(int(k))
        return {"answer": float(ans), "vals": {"bk": bk, "ans": fr(ans)}}
    if L == 2:
        b, kind = q["b"], q["kind"]
        if kind == 0:
            N = q["u"] * q["v"]
        elif kind == 1:
            N = sp.Rational(q["u"], q["v"])
        else:
            N = sp.Rational(q["u"] ** q["m"], q["v"])
        k = sp.simplify(sp.log(N) / sp.log(b))
        k = sp.nsimplify(k)
        assert k.is_integer and sp.Integer(b) ** k == N
        k = int(k)
        if kind == 0:
            return {"answer": k, "vals": {"N": int(N), "k": k}}
        if kind == 1:
            return {"answer": k, "vals": {"q": int(N), "k": k}}
        return {"answer": k, "vals": {"um": q["u"] ** q["m"], "bk": b ** k, "k": k}}
    i, j, form = q["i"], q["j"], q["form"]
    pp, qq = sp.symbols("p q")
    N = 2 ** i * 3 ** j
    target = [sp.log(N), sp.log(sp.Rational(2 ** i, 3 ** j)), sp.log(N) / 2, None][form]
    ans = [i * pp + j * qq, i * pp - j * qq, (i * pp + j * qq) / 2, 1 + i * pp + j * qq][form]
    for base in (7, sp.Rational(5, 2), 13):
        lb = sp.log(base)
        tv = target / lb if form != 3 else sp.log(N * base) / lb
        assert abs(float(tv) - float(ans.subs({pp: sp.log(2) / lb, qq: sp.log(3) / lb}))) < 1e-12
    return {"answer": ex(ans), "vals": {"i": i, "j": j, "N": N, "N2": 2 ** i, "N3": 3 ** j}}


# ---- A2.exp-log-graphs ------------------------------------------------------------------------------------------------------
def a2_exp_log_graphs(p):
    q, L = p["params"], p["level"]
    if L == 1:
        s_, v = q["s"], S(Q(q["pt"]))
        bs = sp.solve(sp.Eq(sp.Symbol("b", positive=True) ** s_, v))
        assert len(bs) == 1 and bs[0] != 1
        return {"answer": float(bs[0]), "vals": {"v": fr(v), "b": fr(bs[0])}}
    if L == 2:
        b, h, k = q["b"], q["h"], q["k"]
        if q["kind"] == 0:
            a = q["a"]
            f = a * sp.Integer(b) ** (X - h) + k
            assert sp.limit(f, X, -sp.oo) == k
            yi = f.subs(X, 0)
            return {"answer": [k, float(yi)], "vals": {"bh": fr(sp.Integer(b) ** (-h)), "yi": fr(yi), "nh": -h}}
        f = sp.log(X - h, b) + k
        assert continuous_domain(f, X, sp.S.Reals) == sp.Interval.open(h, sp.oo)
        xi = sp.solve(f, X)
        assert len(xi) == 1
        return {"answer": [h, float(xi[0])], "vals": {"nk": -k, "bk": fr(sp.Integer(b) ** (-k)), "xi": fr(xi[0])}}
    h, k, pts = q["h"], q["k"], q["pts"]
    (x0, y0), (x1, y1) = pts
    assert x0 == h and y0 == k + 1
    s_ = x1 - h
    b = sp.solve(sp.Eq(sp.Symbol("b", positive=True) ** s_, S(Q(y1)) - k))[0]
    f = b ** (X - h) + k
    far = h - 80 if b > 1 else h + 80
    assert abs(float(f.subs(X, far)) - k) < 1e-12  # the curve levels off at y = k
    return {"answer": f"({b})^(x - ({h})) + ({k})", "vals": {"kp1": k + 1, "hs": x1, "y2": fr(S(Q(y1))), "bs": fr(b ** s_), "b": fr(b)}}


# ---- A2.8 Exponential equations ----------------------------------------------------------------------------------------------
def a2_8(p):
    q, L = p["params"], p["level"]
    if L == 1:
        b, a, c, N = q["b"], q["a"], q["c"], q["N"]
        sol = sp.solve(sp.Eq(a * X + c, sp.log(N, b)), X)
        sol = [sp.nsimplify(sp.simplify(v)) for v in sol]
        assert len(sol) == 1 and sol[0].is_integer
        m = int(sp.nsimplify(sp.log(N, b)))
        assert b ** m == N
        return {"answer": int(sol[0]), "vals": {"m": m, "mc": m - c, "sol": int(sol[0])}}
    if L == 2:
        if q["kind"] == 0:
            A, b, d, e = q["A"], S(Q(q["b"])), q["d"], q["e"]
            c = sp.Rational(e - d, A)
            assert c.is_integer
            xv = sp.log(c) / sp.log(b)
            assert sp.simplify(A * b ** xv + d - e) == 0
            xf = float(xv)
            x2 = round(xf, 2)
            assert abs(xf * 100 - math.floor(xf * 100) - 0.5) > 0.04
            assert round(round(float(sp.log(c)), 4) / round(float(sp.log(b)), 4), 2) == x2
            return {"answer": xf, "vals": {"Ac": e - d, "c": int(c), "lc": float(sp.log(c)), "lb": float(sp.log(b)), "x2": x2}}
        g, pp, qq, c, e = (q[k] for k in ("g", "p", "q", "c", "e"))
        sol = sp.solve(sp.Eq((g ** pp) ** (X + c), (g ** qq) ** (X + e)), X)
        sol = [v for v in sol if v.is_real]
        assert len(sol) == 1
        return {"answer": float(sol[0]), "vals": {"B1": g ** pp, "B2": g ** qq, "pc": pp * c, "qe": qq * e, "top": qq * e - pp * c, "pq": pp - qq, "sol": fr(sol[0])}}
    if q["kind"] == 0:
        b, S_, Pr, m1 = q["b"], q["S"], q["Pr"], q["m1"]
        u = sp.symbols("u")
        us = sp.solve(u ** 2 - S_ * u + Pr, u)
        assert b ** m1 in us and len(us) == 2
        s2 = [v for v in us if v != b ** m1][0]
        sols = [sp.nsimplify(sp.log(v, b)) for v in us if v > 0]
        assert all(v.is_integer for v in sols)
        # SymPy on the original equation agrees
        orig = sp.solve(sp.Integer(b) ** (2 * X) - S_ * sp.Integer(b) ** X + Pr, X)
        assert sorted(sp.nsimplify(v) for v in orig if v.is_real) == sorted(sols)
        m2 = int(sp.nsimplify(sp.log(s2, b))) if s2 > 0 else 0
        return {"answer": [int(v) for v in sols], "vals": {"s1": b ** m1, "s2": int(s2), "S": S_, "Pr": Pr, "m1": m1, "m2": m2}}
    P0, rp, mult = q["P0"], q["rp"], q["mult"]
    g = 1 + sp.Rational(rp, 100)
    tv = sp.log(mult) / sp.log(g)
    assert abs(float(P0 * g ** tv) - P0 * mult) < 1e-6
    tf = float(tv)
    t2 = round(tf, 2)
    assert abs(tf * 100 - math.floor(tf * 100) - 0.5) > 0.04
    assert round(round(math.log(mult), 4) / round(math.log(float(g)), 6), 2) == t2
    return {"answer": tf, "vals": {"goal": P0 * mult, "rdec": rp / 100, "g": float(g), "mult": mult, "lm": math.log(mult), "lg": float(sp.log(g)), "t2": t2}}


# ---- A2.log-eq --------------------------------------------------------------------------------------------------------------
def a2_log_eq(p):
    q, L = p["params"], p["level"]
    xp = sp.symbols("xp", positive=True)
    if L == 1:
        b, a, c, k = q["b"], q["a"], q["c"], q["k"]
        sol = sp.solve(sp.Eq(sp.log(a * X + c, b), k), X)
        assert len(sol) == 1 and sol[0].is_integer and a * sol[0] + c > 0
        return {"answer": int(sol[0]), "vals": {"bk": b ** k, "bkc": b ** k - c, "sol": int(sol[0])}}
    if L == 2:
        b = q["b"]
        if q["kind"] == 0:
            a, c, d, e = q["a"], q["c"], q["d"], q["e"]
            sol = sp.solve(sp.Eq(a * X + c, d * X + e), X)
            assert len(sol) == 1 and sol[0].is_integer
            s_ = int(sol[0])
            A = a * s_ + c
            assert A > 0 and d * s_ + e == A
            return {"answer": s_, "vals": {"ad": a - d, "ec": e - c, "sol": s_, "A": A}}
        pp, k = q["p"], q["k"]
        sol = sp.solve(sp.Eq(sp.log(xp + pp, b) - sp.log(xp, b), k), xp)
        assert len(sol) == 1 and sol[0].is_integer
        s_ = int(sol[0])
        return {"answer": s_, "vals": {"bk": b ** k, "bk1": b ** k - 1, "sol": s_, "sp": s_ + pp}}
    if q["kind"] == 0:
        b, a, k = q["b"], q["a"], q["k"]
        cands = sp.solve(X * (X - a) - b ** k, X)
        good = [v for v in cands if v > 0 and v - a > 0]
        bad = [v for v in cands if not (v > 0 and v - a > 0)]
        assert len(good) == 1 and len(bad) == 1 and good[0].is_integer
        v = int(good[0])
        assert abs(math.log(v, b) + math.log(v - a, b) - k) < 1e-9
        return {"answer": v, "vals": {"a": a, "N": b ** k, "v": v, "w": int(-bad[0]), "nw": int(bad[0])}}
    L1, L2 = q["L1"], q["L2"]
    m = sp.Rational(L2 - L1, 10)
    assert m.is_integer and m >= 2
    ratio = 10 ** int(m)
    I1 = sp.Integer(1)
    assert 10 * sp.log(ratio * I1, 10) - 10 * sp.log(I1, 10) == L2 - L1
    return {"answer": ratio, "vals": {"dL": L2 - L1, "m": int(m), "ratio": ratio}}


# ---- A2.9 Arithmetic sequences ----------------------------------------------------------------------------------------------
def a2_9(p):
    q, L = p["params"], p["level"]
    nn_ = sp.symbols("n", integer=True)
    if L == 1:
        terms, N = q["terms"], q["nn"]
        d = terms[1] - terms[0]
        assert all(terms[i + 1] - terms[i] == d for i in range(len(terms) - 1))
        a1 = terms[0]
        an = a1 + (N - 1) * d
        if len(terms) == 5:
            return {"answer": an, "vals": {"terms": terms, "a1": a1, "d": d, "nm1": N - 1, "an": an}}
        return {"answer": an, "vals": {"terms": terms, "d": d, "nm1": N - 1, "prod": (N - 1) * d, "an": an}}
    if L == 2:
        a1, d, an = q["a1"], q["d"], q["an"]
        N = sp.Rational(an - a1, d) + 1
        assert N.is_integer
        N = int(N)
        S_ = sp.summation(a1 + (nn_ - 1) * d, (nn_, 1, N))
        return {"answer": int(S_), "vals": {"a2": a1 + d, "a3": a1 + 2 * d, "an": an, "d": d, "nm1": N - 1, "nn": N, "sum": a1 + an, "S": int(S_)}}
    if "r1" in q:
        r1, d, N = q["r1"], q["d"], q["nn"]
        S_ = sp.summation(r1 + (nn_ - 1) * d, (nn_, 1, N))
        last = r1 + (N - 1) * d
        return {"answer": int(S_), "vals": {"nm1": N - 1, "last": last, "sum": r1 + last, "S": int(S_)}}
    pp, qq, ap, aq, N = (q[k] for k in ("p", "q", "ap", "aq", "nn"))
    a1, d = sp.symbols("a1 d")
    sol = sp.solve([a1 + (pp - 1) * d - ap, a1 + (qq - 1) * d - aq], [a1, d])
    assert sol[d].is_integer
    an = sol[a1] + (N - 1) * sol[d]
    return {"answer": int(an), "vals": {"qp": qq - pp, "diff": aq - ap, "d": int(sol[d]), "nq": N - qq, "an": int(an)}}


# ---- A2.10 Geometric sequences ----------------------------------------------------------------------------------------------
def a2_10(p):
    q, L = p["params"], p["level"]
    k = sp.symbols("k", integer=True)
    if L == 1:
        a1, r, N = S(Q(q["a1"])), S(Q(q["r"])), q["nn"]
        an = a1 * r ** (N - 1)
        assert an.is_integer
        return {"answer": float(an), "vals": {"terms": [fr(a1 * r ** i) for i in range(3)], "r": fr(r), "nm1": N - 1, "rp": fr(r ** (N - 1)), "an": fr(an)}}
    if L == 2:
        if "ab" in q:
            ab = q["ab"]
            qv = sp.summation(sp.Rational(ab, 100) * sp.Rational(1, 100) ** k, (k, 0, sp.oo))
            assert abs(float(qv) - float("0." + (f"{ab:02d}" * 10))) < 1e-15
            return {"answer": float(qv), "vals": {"ab": ab, "abh": ab / 100, "g": gcd(ab, 99), "q": fr(qv)}}
        a1, r, N = q["a1"], q["r"], q["nn"]
        S_ = sp.summation(a1 * sp.Integer(r) ** k, (k, 0, N - 1))
        rn = r ** N
        return {"answer": int(S_), "vals": {"terms": [a1 * r ** i for i in range(3)], "last": a1 * r ** (N - 1), "rn": rn, "omr": 1 - r,
                                           "omrn": 1 - rn, "top": a1 * (1 - rn), "S": int(S_)}}
    r = S(Q(q["r"]))
    assert abs(r) < 1
    if "h" in q:
        h = q["h"]
        heights = sp.summation(h * r ** k, (k, 1, sp.oo))
        total = h + 2 * heights
        assert total.is_integer
        up = h * r
        return {"answer": float(total), "vals": {"up": fr(up), "up2": fr(up * r), "omr": fr(1 - r), "sumUp": fr(heights), "tail": fr(2 * heights), "total": fr(total)}}
    a1 = S(Q(q["a1"]))
    S_ = sp.summation(a1 * r ** k, (k, 0, sp.oo))
    return {"answer": float(S_), "vals": {"terms": [fr(a1 * r ** i) for i in range(4)], "r": fr(r), "omr": fr(1 - r), "S": fr(S_)}}


# ---- A2.means --------------------------------------------------------------------------------------------------------------
def a2_means(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b = q["a"], q["b"]
        gm = sp.sqrt(a * b)
        assert gm.is_integer and sp.Rational(a + b, 2) >= gm
        return {"answer": int(gm), "vals": {"prod": a * b, "gm": int(gm), "am": (a + b) / 2, "sum": a + b}}
    if L == 2:
        v1, v2, D = q["v1"], q["v2"], q["D"]
        t1, t2 = sp.Rational(D, v1), sp.Rational(D, v2)
        avg = 2 * D / (t1 + t2)
        hm = 2 / (sp.Rational(1, v1) + sp.Rational(1, v2))
        assert avg == hm and avg.is_integer and t1.is_integer and t2.is_integer
        return {"answer": int(avg), "vals": {"D": D, "t1": int(t1), "t2": int(t2), "tt": int(t1 + t2), "D2": 2 * D, "hm": int(hm), "am": (v1 + v2) / 2, "sum": v1 + v2}}
    if "p1" in q:
        p1, p2 = q["p1"], q["p2"]
        f1, f2 = sp.Rational(100 + p1, 100), sp.Rational(100 + p2, 100)
        g = sp.sqrt(f1 * f2)
        assert g.is_rational and g != 1
        avg = (g - 1) * 100
        assert avg.is_integer and (1 + avg / 100) ** 2 == f1 * f2
        return {"answer": int(avg), "vals": {"f1": float(f1), "f2": float(f2), "prod": float(f1 * f2), "g": float(g), "avg": int(avg), "am": (p1 + p2) / 2}}
    w1, w2, w3, s1, s2, T_ = (q[k] for k in ("w1", "w2", "w3", "s1", "s2", "T"))
    assert w1 + w2 + w3 == 100
    f = sp.symbols("f")
    s3 = sp.solve(sp.Eq((w1 * s1 + w2 * s2 + w3 * f) / 100, T_), f)[0]
    assert s3.is_integer and 0 <= s3 <= 100
    return {"answer": int(s3), "vals": {"ws1": w1 * s1, "ws2": w2 * s2, "T100": 100 * T_, "wsum": w1 * s1 + w2 * s2, "need": 100 * T_ - w1 * s1 - w2 * s2, "s3": int(s3)}}


VERIFY.update({"A2.6": a2_6, "A2.7": a2_7, "A2.exp-log-graphs": a2_exp_log_graphs, "A2.8": a2_8, "A2.log-eq": a2_log_eq,
               "A2.9": a2_9, "A2.10": a2_10, "A2.means": a2_means})


# ---- A2.11 Sigma ----------------------------------------------------------------------------------------------------------
def a2_11(p):
    q, L = p["params"], p["level"]
    i = sp.symbols("i", integer=True)
    if L == 1:
        m, a, b = q["m"], q["a"], q["b"]
        S_ = sp.summation(a * i + b, (i, 1, m))
        return {"answer": int(S_), "vals": {"is": list(range(1, m + 1)), "terms": [a * k + b for k in range(1, m + 1)], "S": int(S_)}}
    if L == 2:
        N, a, b = q["N"], q["a"], q["b"]
        if q["kind"] == 0:
            S_ = sp.summation(a * i + b, (i, 1, N))
            T_ = sp.summation(i, (i, 1, N))
            return {"answer": int(S_), "vals": {"N1": N + 1, "T": int(T_), "aT": int(a * T_), "bN": b * N, "S": int(S_)}}
        S_ = sp.summation(a * i ** 2 + b, (i, 1, N))
        Q2 = sp.summation(i ** 2, (i, 1, N))
        return {"answer": int(S_), "vals": {"N1": N + 1, "N2": 2 * N + 1, "Q2": int(Q2), "aQ": int(a * Q2), "bN": b * N, "S": int(S_)}}
    if q["kind"] == 0:
        m, N, sq_ = q["m"], q["N"], q["squares"]
        body = i ** 2 if sq_ else i
        S_ = sp.summation(body, (i, m, N))
        top, bot = sp.summation(body, (i, 1, N)), sp.summation(body, (i, 1, m - 1))
        assert top - bot == S_
        return {"answer": int(S_), "vals": {"mm1": m - 1, "m0": m, "N1": N + 1, "N2": 2 * N + 1, "m2": 2 * m - 1, "top": int(top), "bot": int(bot), "S": int(S_)}}
    c, N = q["c"], q["N"]
    S_ = sp.summation(sp.Integer(c) / (i * (i + 1)), (i, 1, N))
    assert sp.apart(1 / (i * (i + 1)), i) == 1 / i - 1 / (i + 1)
    return {"answer": float(S_), "vals": {"N1": N + 1, "S": fr(S_)}}


# ---- A2.induction ----------------------------------------------------------------------------------------------------------
def a2_induction(p):
    q, L = p["params"], p["level"]
    i, n_, k = sp.symbols("i n k", integer=True, positive=True)
    if L == 1:
        c, m = q["c"], q["m"]
        term = [2 * i - 1, i, i ** 2, 2 ** (i - 1), i * (i + 1)][c]
        rhs = [n_ ** 2, n_ * (n_ + 1) / 2, n_ * (n_ + 1) * (2 * n_ + 1) / 6, 2 ** n_ - 1, n_ * (n_ + 1) * (n_ + 2) / 3][c]
        assert sp.simplify(sp.summation(term, (i, 1, n_)) - rhs) == 0  # the claim is true
        terms = [int(term.subs(i, j)) for j in range(1, m + 1)]
        Lv, Rv = sum(terms), int(rhs.subs(n_, m))
        assert Lv == Rv
        return {"answer": Lv, "vals": {"terms": terms, "L": Lv, "R": Rv, "m1": m + 1, "m2": m + 2, "mm": 2 * m + 1, "pm": 2 ** m, "pm1": 2 ** (m - 1)}}
    if L == 2:
        if q["kind"] == 0:
            a, b = q["a"], q["b"]
            F_ = sp.summation(a * i + b, (i, 1, n_))
            s_ = sp.expand(F_.subs(n_, k) + a * (k + 1) + b)
            assert sp.expand(F_.subs(n_, k + 1) - s_) == 0
            Fk = sp.expand(F_.subs(n_, k))
            return {"answer": ex(s_).replace("k", "k"), "vals": {"h": int(Fk.coeff(k, 2)), "hb": int(Fk.coeff(k, 1)), "ab": a + b, "sum": ilist(coeffs(s_, 2, k))}}
        rr = q["r"]
        F_ = sp.summation(sp.Integer(rr) ** (i - 1), (i, 1, n_))
        s_ = sp.simplify(F_.subs(n_, k) + sp.Integer(rr) ** k)
        target = (sp.Integer(rr) ** (k + 1) - 1) / (rr - 1)
        assert sp.simplify(s_ - target) == 0
        return {"answer": f"({rr}^(k+1) - 1)/{rr - 1}", "vals": {"rm": rr - 1}}
    kind = q["kind"]
    if kind == 0:
        Lf, Rf = (lambda m: q["a"] ** m), (lambda m: m ** q["p"])
    elif kind == 1:
        Lf, Rf = factorial, (lambda m: q["a"] ** m)
    else:
        Lf, Rf = (lambda m: 2 ** m), (lambda m: 2 * m + 1)
    fails = [m for m in range(1, 200) if not Lf(m) > Rf(m)]
    n0 = max(fails) + 1
    # the inductive step: from n0 on, the left side's growth factor beats the right side's
    for m in range(n0, 200):
        assert Lf(m + 1) * Rf(m) > Lf(m) * Rf(m + 1) or Lf(m + 1) - Lf(m) >= Rf(m + 1) - Rf(m)
    ns = range(1, n0 + 1)
    return {"answer": n0, "vals": {"ns": list(ns), "lefts": [Lf(m) for m in ns], "rights": [Rf(m) for m in ns], "n0": n0, "nm": n0 - 1}}


# ---- A2.12 Binomial theorem ---------------------------------------------------------------------------------------------------
def a2_12(p):
    q, L = p["params"], p["level"]
    if L == 1:
        N, k = q["N"], q["k"]
        val = int(sp.expand((X + 1) ** N).coeff(X, k))
        assert val == comb(N, k)
        sm = min(k, N - k)
        num_ = math.prod(range(N - sm + 1, N + 1))
        return {"answer": val, "vals": {"nk": N - k, "small": sm, "tops": list(range(N, N - sm, -1)), "facs": list(range(sm, 0, -1)), "num": num_, "den": factorial(sm), "val": val}}
    if L == 2:
        N, a, c, j = q["N"], q["a"], q["c"], q["j"]
        coef = int(sp.expand((a * X + c) ** N).coeff(X, j))
        kk = N - j
        return {"answer": coef, "vals": {"kk": kk, "Cv": comb(N, kk), "aj": a ** j, "ck": c ** kk, "coef": coef}}
    pp, qq, N, c = q["p"], q["q"], q["N"], q["c"]
    e = sp.expand((X ** pp + c / X ** qq) ** N)
    const = e.as_coefficients_dict().get(sp.Integer(1), 0) if False else sp.expand(e).as_independent(X)[0]
    kk = sp.Rational(pp * N, pp + qq)
    assert kk.is_integer
    coef = comb(N, int(kk)) * c ** int(kk)
    assert const == coef
    return {"answer": int(const), "vals": {"pN": pp * N, "pq": pp + qq, "kk": int(kk), "Cv": comb(N, int(kk)), "ck": c ** int(kk), "coef": int(coef)}}


# ---- A2.13 Matrices ------------------------------------------------------------------------------------------------------------
def a2_13(p):
    q, L = p["params"], p["level"]
    if L == 1:
        A, B = sp.Matrix(q["A"]), sp.Matrix(q["B"])
        R = q["s"] * A + q["t"] * B
        return {"answer": [int(v) for v in R], "vals": {"R": [int(v) for v in R]}}
    if L == 2:
        A, B = sp.Matrix(q["A"]), sp.Matrix(q["B"])
        R = A * B
        P_ = [int(A[i, m] * B[m, j]) for i in range(2) for j in range(2) for m in range(2)]
        return {"answer": [int(v) for v in R], "vals": {"R": [int(v) for v in R], "P": P_}}
    if "price" in q:
        Qm = sp.Matrix(q["Q"])
        pr = sp.Matrix([S(Q(v)) for v in q["price"]])
        rev = Qm * pr
        parts = [[float(Qm[i, j] * pr[j]) for j in range(3)] for i in range(2)]
        return {"answer": [float(v) for v in rev], "vals": {"parts": parts, "rev": [float(v) for v in rev]}}
    A, B = sp.Matrix(q["A"]), sp.Matrix(q["B"])
    assert A.shape == (2, 3) and B.shape == (3, 2)
    R = A * B
    return {"answer": [int(v) for v in R], "vals": {"R": [int(v) for v in R]}}


# ---- A2.14 Determinants ----------------------------------------------------------------------------------------------------------
def a2_14(p):
    q, L = p["params"], p["level"]
    if L == 1:
        A = sp.Matrix(q["A"])
        D = int(A.det())
        return {"answer": D, "vals": {"ad": int(A[0, 0] * A[1, 1]), "bc": int(A[0, 1] * A[1, 0]), "D": D}}
    if L == 2:
        if q["kind"] == 0:
            a1, b1, a2, b2, c1, c2 = (q[k] for k in ("a1", "b1", "a2", "b2", "c1", "c2"))
            A = sp.Matrix([[a1, b1], [a2, b2]])
            D = A.det()
            Dx, Dy = sp.Matrix([[c1, b1], [c2, b2]]).det(), sp.Matrix([[a1, c1], [a2, c2]]).det()
            sol = A.LUsolve(sp.Matrix([c1, c2]))
            assert D != 0 and sol[0] == Dx / D and sol[1] == Dy / D and sol[0].is_integer and sol[1].is_integer
            return {"answer": [int(sol[0]), int(sol[1])], "vals": {"c1": c1, "c2": c2, "D": int(D), "Dx": int(Dx), "Dy": int(Dy), "sx": int(sol[0]), "sy": int(sol[1])}}
        A = sp.Matrix(q["A"])
        Ai = A.inv()
        assert A * Ai == sp.eye(2)
        return {"answer": [float(v) for v in Ai], "vals": {"D": int(A.det()), "adj": [int(v) for v in A.adjugate()], "inv": [fr(v) for v in Ai]}}
    if q["kind"] == 0:
        A = sp.Matrix(q["A"])
        D = int(A.det())
        m1, m2, m3 = (int(A.minor(0, j)) for j in range(3))
        assert A[0, 0] * m1 - A[0, 1] * m2 + A[0, 2] * m3 == D
        return {"answer": D, "vals": {"m1": m1, "m2": m2, "m3": m3, "am1": int(A[0, 0] * m1), "bm2": int(A[0, 1] * m2), "cm3": int(A[0, 2] * m3), "D": D}}
    u, v = q["u"], q["v"]
    A = sp.Matrix([[u[0], v[0]], [u[1], v[1]]])
    D = int(A.det())
    # the area of the parallelogram 0, u, u+v, v by the shoelace formula
    pts = [(0, 0), tuple(u), (u[0] + v[0], u[1] + v[1]), tuple(v)]
    area = abs(sum(pts[i][0] * pts[(i + 1) % 4][1] - pts[(i + 1) % 4][0] * pts[i][1] for i in range(4))) / 2
    assert area == abs(D) and D != 0
    return {"answer": abs(D), "vals": {"D": D, "area": abs(D)}}


# ---- A2.15 Conics -----------------------------------------------------------------------------------------------------------------
def a2_15(p):
    q, L = p["params"], p["level"]
    Y = Yv
    if L == 1:
        h, k = q["h"], q["k"]
        if q["kind"] == 0:
            rr = q["rr"]
            return {"answer": [h, k, rr], "vals": {"h": h, "k": k, "rr": rr, "top": k + rr, "r2": rr * rr}}
        r2 = q["r2"]
        rr = sp.sqrt(r2)
        assert rr.is_integer
        return {"answer": [h, k, int(rr)], "vals": {"h": h, "k": k, "rr": int(rr), "r2": r2}}
    if L == 2:
        if q["kind"] == 0:
            D, E, Fc = q["D"], q["E"], q["F"]
            h, k = sp.Rational(-D, 2), sp.Rational(-E, 2)
            r2 = h ** 2 + k ** 2 - Fc
            assert sp.expand((X - h) ** 2 + (Y - k) ** 2 - r2 - (X ** 2 + Y ** 2 + D * X + E * Y + Fc)) == 0
            rr = sp.sqrt(r2)
            assert rr.is_integer and rr > 0
            return {"answer": [int(h), int(k), int(rr)], "vals": {"nF": -Fc, "nh": int(-h), "nk": int(-k), "hh": int(h * h), "kk": int(k * k), "r2": int(r2), "h": int(h), "k": int(k), "rr": int(rr)}}
        A, C, D, E, Fc = (q[k] for k in "ACDEF")
        if C == 0:
            t = 3
            assert A != 0 and E != 0
        elif A == C:
            t = 0
        elif A * C > 0:
            t = 1
        else:
            t = 2
        # non-degenerate: complete the squares and check the constant
        if t != 3:
            h, k = sp.Rational(-D, 2 * A), sp.Rational(-E, 2 * C)
            rhs = A * h ** 2 + C * k ** 2 - Fc
            assert rhs != 0
            if t in (0, 1):
                assert rhs / A > 0
        return {"answer": t, "vals": {"AC": A * C}}
    h, k, kind = q["h"], q["k"], q["kind"]
    if kind == 2:
        fp, vert = q["fp"], q["vert"]
        pp = sp.Rational(fp, 4)
        focus = (h, k + pp) if vert else (h + pp, k)
        # every point on the curve is equidistant from the focus and the directrix
        for t in (1, 3, -2):
            if vert:
                px = h + t
                py = k + sp.Rational(t * t, fp)
                assert sp.simplify(sp.sqrt((px - focus[0]) ** 2 + (py - focus[1]) ** 2) - abs(py - (k - pp))) == 0
            else:
                py = k + t
                px = h + sp.Rational(t * t, fp)
                assert sp.simplify(sp.sqrt((px - focus[0]) ** 2 + (py - focus[1]) ** 2) - abs(px - (h - pp))) == 0
        return {"answer": [int(focus[0]), int(focus[1])], "vals": {"p": int(pp), "fx": int(focus[0]), "fy": int(focus[1]), "dl": int(k - pp if vert else h - pp)}}
    dx, dy, ell = q["dx"], q["dy"], q["ell"]
    if ell:
        a2, b2 = max(dx, dy), min(dx, dy)
        vert = dy > dx
        c2 = a2 - b2
    else:
        a2, b2, vert = dx, dy, False
        c2 = a2 + b2
    c = sp.sqrt(c2)
    assert c.is_integer
    c = int(c)
    focus = (h, k + c) if vert else (h + c, k)
    other = (h, k - c) if vert else (h - c, k)
    # check the defining property at a vertex: |d1 ± d2| = 2a
    a = isqrt(a2)
    vx, vy = (h, k + a) if vert else (h + a, k)
    d1 = sp.sqrt((vx - focus[0]) ** 2 + (vy - focus[1]) ** 2)
    d2 = sp.sqrt((vx - other[0]) ** 2 + (vy - other[1]) ** 2)
    assert (d1 + d2 if ell else abs(d1 - d2)) == 2 * a
    return {"answer": list(focus), "vals": {"a2": a2, "b2": b2, "c2": c2, "a": a, "b": isqrt(b2), "c": c, "fx": focus[0], "fy": focus[1], "ox": other[0], "oy": other[1]}}


VERIFY.update({"A2.11": a2_11, "A2.induction": a2_induction, "A2.12": a2_12, "A2.13": a2_13, "A2.14": a2_14, "A2.15": a2_15})
