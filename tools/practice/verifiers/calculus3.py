"""Independent answers for practice/calculus3.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]). Exact fractions and SymPy:
every derivative, integral, limit, cross product, critical point and extremum is confirmed with SymPy."""
from fractions import Fraction as Fr
from functools import lru_cache
from math import gcd, isqrt

import mpmath
import sympy as sp

X, Y, Z, T, S_, U, W = sp.symbols("x y z t s u v")
R_, TH, PH, RHO = sp.symbols("r theta phi rho", nonnegative=True)
NAMES = {1: (X,), 2: (X, Y), 3: (X, Y, Z)}


def F(v):
    if isinstance(v, dict):
        return Fr(v["n"], v["d"])
    if isinstance(v, float):
        return Fr(str(v))
    return Fr(v)


def fr(q):
    q = Fr(q)
    return {"n": q.numerator, "d": q.denominator}


def R(q):
    q = Fr(q)
    return sp.Rational(q.numerator, q.denominator)


def isq(n):
    r = isqrt(n)
    assert r * r == n, f"{n} is not a perfect square"
    return r


def surd(N):
    k, s, p = 1, N, 2
    while p * p <= s:
        while s % (p * p) == 0:
            s //= p * p
            k *= p
        p += 1
    assert sp.sqrt(N) == k * sp.sqrt(s)
    return k, s


# ---- terms: (c, e, k) meaning c · Π v^e · exp(Σ k v) ------------------------------------------------
def dec(rows, nv):
    return [(F(r[0]), tuple(r[1:1 + nv]), tuple(r[1 + nv:1 + 2 * nv])) for r in rows]


def norm(terms):
    acc = {}
    for c, e, k in terms:
        acc[(e, k)] = acc.get((e, k), Fr(0)) + c
    out = [(c, e, k) for (e, k), c in acc.items() if c != 0]
    return sorted(out, key=lambda t: (-sum(t[1]), tuple(-v for v in t[1]), tuple(-v for v in t[2])))


def tsym(terms, vs):
    return sum((R(c) * sp.Mul(*[v ** p for v, p in zip(vs, e)]) * sp.exp(sum(kk * v for v, kk in zip(vs, k))) for c, e, k in terms), sp.Integer(0))


def pdiff(terms, i, vs=None):
    out = []
    for c, e, k in terms:
        if k[i]:
            out.append((c * k[i], e, k))
        elif e[i]:
            e2 = list(e)
            e2[i] -= 1
            out.append((c * e[i], tuple(e2), k))
    d = norm(out)
    nv = len(terms[0][1]) if terms else 1
    vs = vs or NAMES[nv]
    if terms:
        assert sp.simplify(tsym(d, vs) - sp.diff(tsym(terms, vs), vs[i])) == 0
    return d


def enc(terms):
    return [[fr(c), *e, *k] for c, e, k in terms]


def tval(t, pt):
    c, e, k = t
    assert not any(k)
    v = c
    for x, p in zip(pt, e):
        v *= Fr(x) ** p
    return v


def ev(terms, pt, vs=None):
    tv = [tval(t, pt) for t in terms]
    tot = sum(tv, Fr(0))
    if terms:
        vs = vs or NAMES[len(terms[0][1])]
        assert R(tot) == tsym(terms, vs).subs(dict(zip(vs, [R(x) for x in pt])))
    return tv, tot


def frl(lst):
    return [fr(v) for v in lst]


def estr(terms, vs):
    return str(tsym(terms, vs)) if terms else "0"


# ---- concepts ----------------------------------------------------------------------------------------------
def space(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        d = [b - a for a, b in zip(q["A"], q["B"])]
        sq = [v * v for v in d]
        S = sum(sq)
        D = isq(S)
        assert sp.Point3D(*q["A"]).distance(sp.Point3D(*q["B"])) == D
        return {"answer": D, "vals": {"d": d, "sq": sq, "S": S, "D": D}}
    if lv == 2:
        s = [a + b for a, b in zip(q["A"], q["B"])]
        C = [Fr(v, 2) for v in s]
        assert sp.Point3D(*q["A"]).midpoint(sp.Point3D(*q["B"])) == sp.Point3D(*[R(c) for c in C])
        return {"answer": [float(c) for c in C], "vals": {"s": s, "C": frl(C)}}
    G, J = q["G"], q["J"]
    assert all(g % 2 == 0 for g in G)
    c = [-g // 2 for g in G]
    sqs = [v * v for v in c]
    r2 = -J + sum(sqs)
    rad = isq(r2)
    lhs = X**2 + Y**2 + Z**2 + G[0] * X + G[1] * Y + G[2] * Z + J
    assert sp.expand((X - c[0])**2 + (Y - c[1])**2 + (Z - c[2])**2 - r2 - lhs) == 0 and rad > 0
    return {"answer": rad, "vals": {"negJ": -J, "sqs": sqs, "r2": r2, "rad": rad, "c": c}}


def cross(a, b):
    return [int(v) for v in sp.Matrix(a).cross(sp.Matrix(b))]


def vectors(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a = q["a"]
        if "b" not in q:
            sq = [v * v for v in a]
            ln = isq(sum(sq))
            assert sp.Matrix(a).norm() == ln
            return {"answer": ln, "vals": {"sq": sq, "S": sum(sq), "len": ln}}
        prods = [x * y for x, y in zip(a, q["b"])]
        d = int(sp.Matrix(a).dot(sp.Matrix(q["b"])))
        return {"answer": d, "vals": {"prods": prods, "d": d}}
    if lv == 2:
        a, b = q["a"], q["b"]
        c = cross(a, b)
        pp = [[a[1] * b[2], a[2] * b[1]], [a[2] * b[0], a[0] * b[2]], [a[0] * b[1], a[1] * b[0]]]
        pa = [x * y for x, y in zip(c, a)]
        pb = [x * y for x, y in zip(c, b)]
        assert sum(pa) == 0 and sum(pb) == 0 and any(c)
        return {"answer": c, "vals": {"p": pp, "c": c, "pa": pa, "pb": pb}}
    if "A" in q:
        A, B, C = q["A"], q["B"], q["C"]
        u = [b - a for a, b in zip(A, B)]
        w = [c - a for a, c in zip(A, C)]
        c = cross(u, w)
        sq = [v * v for v in c]
        N = sum(sq)
        k, s = surd(N)
        area = sp.Triangle(sp.Point3D(*A), sp.Point3D(*B), sp.Point3D(*C)).area if False else sp.sqrt(N) / 2
        assert sp.simplify(area - sp.Rational(k, 2) * sp.sqrt(s)) == 0
        return {"answer": float(area), "vals": {"u": u, "w": w, "c": c, "sq": sq, "N": N, "k": k, "s": s, "area": fr(Fr(k, 2))}}
    a, b, c = q["a"], q["b"], q["c"]
    bc = cross(b, c)
    prods = [x * y for x, y in zip(a, bc)]
    tr = int(sp.Matrix([a, b, c]).det())
    assert tr == sum(prods) and tr != 0
    return {"answer": abs(tr), "vals": {"bc": bc, "prods": prods, "tr": tr, "vol": abs(tr)}}


def lines(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        P0, d, i = q["P0"], q["d"], q["i"]
        ts = sp.solve(P0[i] + d[i] * T, T)
        assert len(ts) == 1 and ts[0].is_integer
        ts = int(ts[0])
        Pt = [a + b * ts for a, b in zip(P0, d)]
        assert Pt[i] == 0
        return {"answer": Pt, "vals": {"ts": ts, "prod": [b * ts for b in d], "Pt": Pt}}
    if lv == 2:
        nn, dd, A = q["nn"], q["dd"], q["A"]
        prods = [a * b for a, b in zip(nn, A)]
        top = sum(prods) - dd
        sq = [v * v for v in nn]
        ln = isq(sum(sq))
        D = Fr(abs(top), ln)
        # SymPy: distance from A to the plane, using a point on it
        i = next(j for j in range(3) if nn[j])
        pt = [0, 0, 0]
        pt[i] = sp.Rational(dd, nn[i])
        assert sp.Plane(sp.Point3D(*pt), normal_vector=nn).distance(sp.Point3D(*A)) == R(D)
        return {"answer": float(D), "vals": {"prods": prods, "top": top, "abs": abs(top), "sq": sq, "S": sum(sq), "len": ln, "D": fr(D)}}
    if "A" in q:
        A, B, C = q["A"], q["B"], q["C"]
        u = [b - a for a, b in zip(A, B)]
        w = [c - a for a, c in zip(A, C)]
        c = cross(u, w)
        prods = [x * y for x, y in zip(c, A)]
        dd = sum(prods)
        for P_ in (B, C):
            assert sum(x * y for x, y in zip(c, P_)) == dd
        pl = sp.Plane(sp.Point3D(*A), sp.Point3D(*B), sp.Point3D(*C))
        zi = sp.solve(pl.equation(X, Y, Z).subs({X: 0, Y: 0}), Z)[0]
        assert R(Fr(dd, c[2])) == zi
        return {"answer": float(zi), "vals": {"u": u, "w": w, "c": c, "prods": prods, "dd": dd, "zi": fr(Fr(dd, c[2]))}}
    P0, P1, d = q["P0"], q["P1"], q["d"]
    w = [b - a for a, b in zip(P0, P1)]
    c = cross(w, d)
    sq = [v * v for v in c]
    N = sum(sq)
    k, s = surd(N)
    dsq = [v * v for v in d]
    ln = isq(sum(dsq))
    D = Fr(k, ln)
    dist = sp.Line3D(sp.Point3D(*P0), direction_ratio=d).distance(sp.Point3D(*P1))
    assert sp.simplify(dist - R(D) * sp.sqrt(s)) == 0
    return {"answer": float(dist), "vals": {"w": w, "c": c, "sq": sq, "N": N, "k": k, "s": s, "dsq": dsq, "len": ln, "D": fr(D)}}


def classify(sq, lin, k):
    """0 ellipsoid, 1 elliptic paraboloid, 2 hyperbolic paraboloid, 3 one sheet, 4 two sheets, 5 cone, 6 cylinder; and the axis."""
    squared = [i for i in range(3) if sq[i] != 0]
    linear = [i for i in range(3) if sq[i] == 0 and lin[i] != 0]
    missing = [i for i in range(3) if sq[i] == 0 and lin[i] == 0]
    if missing:
        assert len(missing) == 1 and not linear
        return 6, missing[0]
    if linear:
        assert len(linear) == 1 and k == 0
        i, j = squared
        return (1 if sq[i] * sq[j] > 0 else 2), linear[0]
    signs = [1 if sq[i] > 0 else -1 for i in range(3)]
    if k == 0:
        lone = [i for i in range(3) if signs.count(signs[i]) == 1]
        assert len(lone) == 1, "a cone needs mixed signs"
        return 5, lone[0]
    ks = 1 if k > 0 else -1
    agree = [i for i in range(3) if signs[i] == ks]
    if len(agree) == 3:
        return 0, 2
    if len(agree) == 2:
        return 3, next(i for i in range(3) if signs[i] != ks)
    assert len(agree) == 1, "empty surface"
    return 4, agree[0]


def quadrics(p):
    q = p["params"]
    sq = [F(v) for v in q["sq"]]
    lin, k = q["lin"], F(q["k"])
    typ, axis = classify(sq, lin, k)
    if p["level"] <= 2:
        std = [fr(c / k) for c in sq] if k not in (0, 1) else []
        return {"answer": typ, "vals": {"type": typ, "axis": axis, "std": std}}
    h = q["h"]
    assert sq[0] == sq[1] != 0 and axis == 2
    r2 = (k - sq[2] * h * h - lin[2] * h) / sq[0]
    assert r2.denominator == 1
    rad = isq(int(r2))
    eq = R(sq[0]) * (X**2 + Y**2) + R(sq[2]) * Z**2 + lin[2] * Z - R(k)
    assert sp.expand(eq.subs({Z: h, Y: 0, X: rad})) == 0
    return {"answer": rad, "vals": {"type": typ, "axis": axis, "hh": h * h, "r2": int(r2), "rad": rad}}


def vvf(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        cs = [dec(c, 1) for c in q["cs"]]
        d1 = [pdiff(c, 0) for c in cs]
        d2 = [pdiff(c, 0) if c else [] for c in d1]
        use = d2 if q["acc"] else d1
        res = [ev(c, [q["t0"]]) for c in use]
        val = [r[1] for r in res]
        for c, v in zip(cs, val):
            assert R(v) == sp.diff(tsym(c, (X,)), X, 2 if q["acc"] else 1).subs(X, q["t0"])
        return {"answer": [float(v) for v in val], "vals": {"d1": [enc(c) for c in d1], "d2": [enc(c) for c in d2], "tv": [frl(r[0]) for r in res], "val": frl(val)}}
    if lv == 2:
        cs = [dec(c, 1) for c in q["cs"]]
        b = q["b"]
        anti = [norm([(c / (e[0] + 1), (e[0] + 1,), k) for c, e, k in comp]) for comp in cs]
        res = [ev(a, [b]) for a in anti]
        val = [r[1] for r in res]
        for comp, v in zip(cs, val):
            assert sp.integrate(tsym(comp, (X,)), (X, 0, b)) == R(v)
        return {"answer": [float(v) for v in val], "vals": {"anti": [enc(a) for a in anti], "tv": [frl(r[0]) for r in res], "val": frl(val)}}
    vx, vy, h = q["vx"], F(q["vy"]), q["h"]
    g = Fr("9.8")
    yt = h + R(vy) * T - R(g) / 2 * T**2
    if q["top"]:
        k = vy / g
        assert k.denominator == 1
        A, B = vy * k, Fr("4.9") * k * k
        yTop = h + A - B
        tt = sp.solve(sp.diff(yt, T), T)[0]
        assert tt == int(k) and yt.subs(T, tt) == R(yTop)
        return {"answer": float(yTop), "vals": {"k": int(k), "A": fr(A), "B": fr(B), "yTop": fr(yTop)}}
    assert h == 0
    roots = [r for r in sp.solve(yt, T) if r > 0]
    tl = roots[0]
    assert tl.is_integer
    return {"answer": int(vx * tl), "vals": {"tl": int(tl), "range": int(vx * tl)}}


def curvature(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, c, turns = q["a"], q["c"], q["turns"]
        r = sp.Matrix([a * sp.cos(T), a * sp.sin(T), c * T])
        speed = sp.simplify(sp.sqrt(sum(v**2 for v in r.diff(T))))
        s = isq(a * a + c * c)
        assert sp.simplify(speed - s) == 0
        L = s * 2 * turns
        assert sp.integrate(speed, (T, 0, 2 * turns * sp.pi)) == L * sp.pi
        return {"answer": float(L * sp.pi), "vals": {"a2": a * a, "c2": c * c, "S": a * a + c * c, "s": s, "T": 2 * turns, "L": L}}
    if lv == 2:
        f = dec(q["f"], 1)
        x0 = q["x0"]
        d1 = pdiff(f, 0)
        d2 = pdiff(d1, 0)
        tv1, m = ev(d1, [x0])
        tv2, fpp = ev(d2, [x0])
        A = abs(int(fpp))
        qq = 1 + int(m) ** 2
        g = gcd(A, qq)
        fs = tsym(f, (X,))
        kap = sp.Abs(sp.diff(fs, X, 2)) / (1 + sp.diff(fs, X)**2)**sp.Rational(3, 2)
        kap = sp.nsimplify(kap.subs(X, x0))
        assert sp.simplify(kap - sp.Rational(A // g, qq // g) / sp.sqrt(qq)) == 0 and A > 0
        return {"answer": float(kap), "vals": {"d1": enc(d1), "d2": enc(d2), "tv1": frl(tv1), "tv2": frl(tv2), "m": int(m), "fpp": int(fpp), "A": A, "q": qq,
                                               "num": A // g, "den": qq // g, "radius": float(1 / kap)}}
    a, c = q["a"], q["c"]
    r = sp.Matrix([a * sp.cos(T), a * sp.sin(T), c * T])
    r1, r2 = r.diff(T), r.diff(T, 2)
    nrm = lambda v: sp.sqrt(sp.simplify(sum(c**2 for c in v)))
    kap = sp.simplify(nrm(r1.cross(r2)) / nrm(r1)**3)
    qq = a * a + c * c
    assert sp.simplify(kap - sp.Rational(a, qq)) == 0
    return {"answer": a / qq, "vals": {"ca": c * a, "a2": a * a, "c2": c * c, "ca2": c * c * a * a, "a4": a**4, "S": c * c * a * a + a**4, "q": qq,
                                       "kap": fr(Fr(a, qq)), "rc": fr(Fr(qq, a))}}


def functions(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        f = dec(q["f"], 2)
        pt = q["pt"] if lv == 1 else ([q["R0"], 0] if "R0" in q else [0, q["v0"]])
        tv, c = ev(f, pt)
        if lv == 2 and "R0" in q:  # the circle of radius R0 is a level curve: f is constant on it
            fs = tsym(f, (X, Y))
            assert sp.simplify(fs.subs({X: q["R0"] * sp.cos(T), Y: q["R0"] * sp.sin(T)}) - R(c)) == 0
        if lv == 2 and "v0" in q:
            fs = tsym(f, (X, Y))
            assert sp.simplify(fs.subs(Y, R(F(q["a"])) * X**2 + q["v0"]) - R(c)) == 0
        return {"answer": float(c), "vals": {"tv": frl(tv), "c": fr(c)}}
    T0, a, b, x0, y0 = q["T0"], q["a"], q["b"], q["x0"], q["y0"]
    Tf = T0 - a * X**2 - b * Y**2
    Tc = int(Tf.subs({X: x0, Y: y0}))
    sols = [s for s in sp.solve(Tf.subs(Y, 0) - Tc, X) if s > 0]
    assert len(sols) == 1 and sols[0].is_integer
    pp = int(sols[0])
    K = T0 - Tc
    return {"answer": pp, "vals": {"A": a * x0 * x0, "B": b * y0 * y0, "Tc": Tc, "K": K, "p2": K // a, "p": pp}}


def limits(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        num, den, pt = dec(q["num"], 2), dec(q["den"], 2), q["pt"]
        tvn, N = ev(num, pt)
        tvd, D = ev(den, pt)
        assert D != 0
        L = N / D
        fs = tsym(num, (X, Y)) / tsym(den, (X, Y))
        assert sp.limit(sp.limit(fs, X, pt[0]), Y, pt[1]) == R(L)
        return {"answer": float(L), "vals": {"tvn": frl(tvn), "tvd": frl(tvd), "N": fr(N), "D": fr(D), "L": fr(L)}}
    if lv == 2:
        if q["fam"] == 0:
            k, a0, b0 = q["k"], q["a0"], q["b0"]
            num = norm([(Fr(1), (2, 0), (0, 0)), (Fr(-k * k), (0, 2), (0, 0))])
            den = norm([(Fr(1), (1, 0), (0, 0)), (Fr(-k), (0, 1), (0, 0))])
            lin = norm([(Fr(1), (1, 0), (0, 0)), (Fr(k), (0, 1), (0, 0))])
            pt = [a0, b0]
            tvn, N = ev(num, pt)
            tvd, D = ev(den, pt)
            tvl, L = ev(lin, pt)
            assert N == 0 and D == 0
            assert sp.cancel(tsym(num, (X, Y)) / tsym(den, (X, Y))) == tsym(lin, (X, Y))
            return {"answer": float(L), "vals": {"tvn": frl(tvn), "tvd": frl(tvd), "tvl": frl(tvl), "L": fr(L), "kk": k * k}}
        a, bb, y0 = q["a"], q["bb"], q["y0"]
        num = norm([(Fr(1), (1, 1), (0, 0)), (Fr(a), (1, 0), (0, 0)), (Fr(-bb), (0, 1), (0, 0)), (Fr(-a * bb), (0, 0), (0, 0))])
        den = norm([(Fr(1), (1, 0), (0, 0)), (Fr(-bb), (0, 0), (0, 0))])
        tvn, N = ev(num, [bb, y0])
        tvd, D = ev(den, [bb, y0])
        assert N == 0 and D == 0
        red = sp.cancel(tsym(num, (X, Y)) / tsym(den, (X, Y)))
        L = red.subs({X: bb, Y: y0})
        assert sp.expand(red - (Y + a)) == 0
        return {"answer": int(L), "vals": {"tvn": frl(tvn), "tvd": frl(tvd), "L": int(L)}}
    fam, a, k, c, order = q["fam"], q["a"], q["k"], q["c"], q["order"]
    m = sp.symbols("m")
    fs = [a * X * Y / (X**2 + Y**2), (X**2 - k * Y**2) / (X**2 + k * Y**2), a * X**2 * Y / (X**4 + Y**2),
          c + a * X**2 * Y / (X**2 + Y**2), c + a * X * Y**2 / (X**2 + Y**2), c + a * X**3 / (X**2 + Y**2)][fam]
    along = lambda yexpr: sp.limit(fs.subs(Y, yexpr), X, 0)
    line = sp.simplify(along(m * X))
    if fam in (0, 1, 2):
        paths = {0: [along(0), along(X)], 1: [along(0), sp.limit(fs.subs(X, 0), Y, 0)], 2: [line, along(X**2)]}[fam]
        assert paths[0] != paths[1], "the two paths must disagree"
        if fam == 2:
            assert line == 0
        L = {0: Fr(a, 2), 1: Fr(1), 2: Fr(a, 2)}[fam]
        assert R(L) == paths[1] if fam != 1 else R(L) == paths[0]
        correct = 2
    else:
        polar = sp.simplify((fs - c).subs({X: R_ * sp.cos(TH), Y: R_ * sp.sin(TH)}) / R_)
        assert not polar.has(R_) and not sp.denom(sp.together(polar)).has(TH), "the polar bound must be |a| r"
        assert line == c
        L = Fr(c) if c else Fr(a)
        correct = 0 if c == 0 else 1
    assert L != 0
    return {"answer": order.index(correct), "vals": {"L": fr(L), "correct": correct}}


def v1(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        f = dec(q["f"], 2)
        d = pdiff(f, q["i"])
        return {"answer": estr(d, (X, Y)), "vals": {"d": enc(d)}}
    if q["shape"] in (0, 1):
        r_, h_ = sp.symbols("r h")
        Vf = (1 if q["shape"] == 0 else sp.Rational(1, 3)) * sp.pi * r_**2 * h_
        dv = sp.diff(Vf, r_ if q["wrt"] == 0 else h_).subs({r_: q["r0"], h_: q["h0"]})
        K = dv / sp.pi
        return {"answer": float(dv), "vals": {"K": fr(Fr(int(K.p), int(K.q)))}}
    f = dec(q["f"], 2)
    d = pdiff(f, q["i"])
    tv, val = ev(d, q["pt"])
    return {"answer": float(val), "vals": {"d": enc(d), "tv": frl(tv), "val": fr(val)}}


def mixed(p):
    q, lv = p["params"], p["level"]
    f = dec(q["f"], 2)
    if lv == 1:
        d1 = pdiff(f, q["i"])
        d2 = pdiff(d1, q["i"])
        return {"answer": estr(d2, (X, Y)), "vals": {"d1": enc(d1), "d2": enc(d2)}}
    if lv == 2:
        fx = pdiff(f, 0)
        fxy = pdiff(fx, 1)
        fy = pdiff(f, 1)
        fyx = pdiff(fy, 0)
        assert fxy == fyx
        return {"answer": estr(fxy, (X, Y)), "vals": {"fx": enc(fx), "fxy": enc(fxy), "fy": enc(fy), "fyx": enc(fyx)}}
    fx, fy = pdiff(f, 0), pdiff(f, 1)
    fxx, fyy = pdiff(fx, 0), pdiff(fy, 1)
    lap = norm(fxx + fyy)
    fs = tsym(f, (X, Y))
    assert sp.expand(sp.diff(fs, X, 2) + sp.diff(fs, Y, 2) - tsym(lap, (X, Y))) == 0
    return {"answer": estr(lap, (X, Y)), "vals": {"fx": enc(fx), "fxx": enc(fxx), "fy": enc(fy), "fyy": enc(fyy), "lap": enc(lap)}}


def first_order(f, pt):
    fx, fy = pdiff(f, 0), pdiff(f, 1)
    tv0, f0 = ev(f, pt)
    tvx, A = ev(fx, pt)
    tvy, B = ev(fy, pt)
    return f0, A, B, {"fx": enc(fx), "fy": enc(fy), "tv0": frl(tv0), "tvx": frl(tvx), "tvy": frl(tvy), "f0": fr(f0), "A": fr(A), "B": fr(B)}


def tangent(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        f = dec(q["f"], 2)
        pt = q["pt"]
        f0, A, B, vals = first_order(f, pt)
        fs = tsym(f, (X, Y))
        plane = fs.subs({X: pt[0], Y: pt[1]}) + sp.diff(fs, X).subs({X: pt[0], Y: pt[1]}) * (X - pt[0]) + sp.diff(fs, Y).subs({X: pt[0], Y: pt[1]}) * (Y - pt[1])
        if lv == 1:
            Aa, Bb = A * pt[0], B * pt[1]
            vals.update({"Aa": fr(Aa), "Bb": fr(Bb), "C0": fr(f0 - Aa - Bb)})
            return {"answer": str(sp.expand(plane)), "vals": vals}
        dx, dy = F(q["dx"]), F(q["dy"])
        x1, y1 = pt[0] + dx, pt[1] + dy
        assert x1 == F(q["x1"]) and y1 == F(q["y1"])
        L = plane.subs({X: R(x1), Y: R(y1)})
        exact = fs.subs({X: R(x1), Y: R(y1)})
        vals.update({"Adx": fr(A * dx), "Bdy": fr(B * dy), "L": fr(Fr(int(L.p), int(L.q))), "exact": fr(Fr(int(exact.p), int(exact.q)))})
        return {"answer": float(L), "vals": vals}
    if q["kind"] == 0:
        r_, h_ = sp.symbols("r h")
        Vf = sp.pi * r_**2 * h_
        er, eh = F(q["er"]), F(q["eh"])
        Vr = sp.diff(Vf, r_).subs({r_: q["r0"], h_: q["h0"]}) / sp.pi
        Vh = sp.diff(Vf, h_).subs({r_: q["r0"], h_: q["h0"]}) / sp.pi
        p1, p2 = Fr(int(Vr)) * er, Fr(int(Vh)) * eh
        K = p1 + p2
        return {"answer": float(R(K) * sp.pi), "vals": {"A": int(Vr), "B": int(Vh), "p1": fr(p1), "p2": fr(p2), "K": fr(K)}}
    l, w, h, e = q["l"], q["w"], q["h"], F(q["e"])
    a, b, c = sp.symbols("a b c")
    Vf = a * b * c
    grads = [sp.diff(Vf, v).subs({a: l, b: w, c: h}) for v in (a, b, c)]
    S = int(sum(grads))
    return {"answer": float(S * e), "vals": {"wh": w * h, "lh": l * h, "lw": l * w, "S": S, "err": fr(S * e)}}


def grad_vals(f, pt, nv):
    vs = NAMES[nv]
    ds = [pdiff(f, i, vs) for i in range(nv)]
    res = [ev(d, pt, vs) for d in ds]
    g = [r[1] for r in res]
    fs = tsym(f, vs)
    assert [R(v) for v in g] == [sp.diff(fs, v).subs(dict(zip(vs, pt))) for v in vs]
    return g, {"ds": [enc(d) for d in ds], "tv": [frl(r[0]) for r in res], "g": frl(g)}


def v2(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        g, vals = grad_vals(dec(q["f"], 2), q["pt"], 2)
        return {"answer": [float(v) for v in g], "vals": vals}
    if lv == 2:
        pt, vv = q["pt"], q["vv"]
        g, vals = grad_vals(dec(q["f"], 2), pt, 2)
        S = vv[0]**2 + vv[1]**2
        m = isq(S)
        Av, Bv = g[0] * vv[0], g[1] * vv[1]
        D = (Av + Bv) / m
        u = sp.Matrix(vv) / sp.Matrix(vv).norm()
        assert sp.Matrix([R(c) for c in g]).dot(u) == R(D)
        vals.update({"vv": vv, "S": S, "m": m, "Av": fr(Av), "Bv": fr(Bv), "top": fr(Av + Bv), "D": fr(D), "Qp": [pt[0] + vv[0], pt[1] + vv[1]]})
        return {"answer": float(D), "vals": vals}
    nv = q["nv"]
    g, vals = grad_vals(dec(q["f"], nv), q["pt"], nv)
    sq = [int(v * v) for v in g]
    N = sum(sq)
    k, s = surd(N)
    assert sp.Matrix([R(c) for c in g]).norm() == k * sp.sqrt(s)
    vals.update({"sq": sq, "N": N, "k": k, "s": s})
    return {"answer": float(k * sp.sqrt(s)), "vals": vals}


def v3(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        nv, wv = q["nv"], q["wv"]
        PV = (T,) if nv == 1 else (S_, T)
        zf, xp, yp, p0 = dec(q["z"], 2), dec(q["x"], nv), dec(q["y"], nv), q["p0"]
        tvx, X0 = ev(xp, p0, PV)
        tvy, Y0 = ev(yp, p0, PV)
        zx, zy = pdiff(zf, 0), pdiff(zf, 1)
        xd, yd = pdiff(xp, wv, PV), pdiff(yp, wv, PV)
        tzx, A = ev(zx, [X0, Y0])
        tzy, C = ev(zy, [X0, Y0])
        txd, B = ev(xd, p0, PV)
        tyd, Dd = ev(yd, p0, PV)
        ans = A * B + C * Dd
        comp = tsym(zf, (X, Y)).subs({X: tsym(xp, PV), Y: tsym(yp, PV)}, simultaneous=True)
        assert sp.diff(comp, PV[wv]).subs(dict(zip(PV, p0))) == R(ans)
        return {"answer": float(ans), "vals": {"zx": enc(zx), "zy": enc(zy), "xd": enc(xd), "yd": enc(yd), "tvx": frl(tvx), "tvy": frl(tvy), "X0": fr(X0), "Y0": fr(Y0),
                                               "tzx": frl(tzx), "tzy": frl(tzy), "txd": frl(txd), "tyd": frl(tyd), "A": fr(A), "B": fr(B), "C": fr(C), "Dd": fr(Dd),
                                               "p1": fr(A * B), "p2": fr(C * Dd), "ans": fr(ans)}}
    if q["kind"] == 0:
        r0, h0, rd, hd = q["r0"], q["h0"], q["rd"], q["hd"]
        rt, ht = r0 + rd * T, h0 + hd * T
        dV = sp.diff(sp.pi * rt**2 * ht, T).subs(T, 0)
        K = int(dV / sp.pi)
        return {"answer": float(dV), "vals": {"A": 2 * r0 * h0 * rd, "B": r0 * r0 * hd, "K": K}}
    Xc, Yc, a, b = q["X"], q["Y"], q["a"], q["b"]
    Dt = sp.sqrt((Xc + a * T)**2 + (Yc + b * T)**2)
    rate = sp.diff(Dt, T).subs(T, 0)
    D = isq(Xc * Xc + Yc * Yc)
    assert sp.simplify(rate - sp.Rational(Xc * a + Yc * b, D)) == 0
    return {"answer": float(rate), "vals": {"D": D, "D2": D * D, "P1": Xc * a, "P2": Yc * b, "rate": fr(Fr(Xc * a + Yc * b, D))}}


def implicit(p):
    q, lv = p["params"], p["level"]
    if lv in (1, 3):
        f, pt = dec(q["f"], 2), q["pt"]
        _, c = ev(f, pt)
        Fx, Fy = pdiff(f, 0), pdiff(f, 1)
        tvx, A = ev(Fx, pt)
        tvy, B = ev(Fy, pt)
        assert A != 0 and B != 0
        m = -A / B
        fs = tsym(f, (X, Y))
        assert sp.idiff(fs - R(c), Y, X).subs({X: pt[0], Y: pt[1]}) == R(m)
        vals = {"c": fr(c), "Fx": enc(Fx), "Fy": enc(Fy), "tvx": frl(tvx), "tvy": frl(tvy), "A": fr(A), "B": fr(B), "m": fr(m)}
        if lv == 1:
            return {"answer": float(m), "vals": vals}
        mv = dec(q["mv"], 2)[0]
        left = [t for t in f if t != mv]
        assert len(left) == len(f) - 1 and sum(mv[1]) < 3
        right = norm([(-mv[0], mv[1], mv[2]), (c, (0, 0), (0, 0))])
        assert sp.expand(tsym(left, (X, Y)) - tsym(right, (X, Y)) - (fs - R(c))) == 0
        tv0, c2 = ev(f, pt)
        b = pt[1] - m * pt[0]
        line = R(m) * X + R(b)
        assert line.subs(X, pt[0]) == pt[1]
        vals.update({"tv0": frl(tv0), "mx0": fr(m * pt[0]), "b": fr(b), "right": enc(right)})
        return {"answer": str(line), "vals": vals}
    f, pt, i = dec(q["f"], 3), q["pt"], q["i"]
    _, c = ev(f, pt)
    Fi, Fz = pdiff(f, i), pdiff(f, 2)
    tvi, A = ev(Fi, pt)
    tvz, B = ev(Fz, pt)
    m = -A / B
    fs = tsym(f, (X, Y, Z))
    zf = sp.Function("zf")(X, Y)
    eq = fs.subs(Z, zf)
    var = (X, Y)[i]
    dz = sp.solve(sp.diff(eq, var), sp.diff(zf, var))[0].subs(zf, Z)
    assert dz.subs({X: pt[0], Y: pt[1], Z: pt[2]}) == R(m)
    return {"answer": float(m), "vals": {"c": fr(c), "Fi": enc(Fi), "Fz": enc(Fz), "tvi": frl(tvi), "tvz": frl(tvz), "A": fr(A), "B": fr(B), "m": fr(m)}}


def v4(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, c, d = q["a"], q["b"], q["c"], q["d"]
        det = sp.Matrix([a * U + b * W, c * U + d * W]).jacobian([U, W]).det()
        return {"answer": int(det), "vals": {"ad": a * d, "bc": b * c, "det": int(det), "abs": abs(int(det))}}
    UV = (U, W)
    if lv == 2:
        xp, yp, pt = dec(q["x"], 2), dec(q["y"], 2), q["pt"]
        ds = [pdiff(xp, 0, UV), pdiff(xp, 1, UV), pdiff(yp, 0, UV), pdiff(yp, 1, UV)]
        res = [ev(d, pt, UV) for d in ds]
        J = [r[1] for r in res]
        p1, p2 = J[0] * J[3], J[1] * J[2]
        det = sp.Matrix([tsym(xp, UV), tsym(yp, UV)]).jacobian(UV).det().subs({U: pt[0], W: pt[1]})
        assert det == R(p1 - p2) and det != 0
        return {"answer": float(det), "vals": {"ds": [enc(d) for d in ds], "tv": [frl(r[0]) for r in res], "J": frl(J), "p1": fr(p1), "p2": fr(p2), "det": fr(p1 - p2)}}
    f1, f2, pt = dec(q["f1"], 2), dec(q["f2"], 2), q["pt"]
    h, k = F(q["h"]), F(q["k"])
    assert F(q["x1"]) == pt[0] + h and F(q["y1"]) == pt[1] + k
    e1, e2 = ev(f1, pt), ev(f2, pt)
    ds = [pdiff(f1, 0), pdiff(f1, 1), pdiff(f2, 0), pdiff(f2, 1)]
    res = [ev(d, pt) for d in ds]
    J = [r[1] for r in res]
    prods = [J[0] * h, J[1] * k, J[2] * h, J[3] * k]
    Jh = [prods[0] + prods[1], prods[2] + prods[3]]
    G = [e1[1] + Jh[0], e2[1] + Jh[1]]
    Jm = sp.Matrix([tsym(f1, (X, Y)), tsym(f2, (X, Y))]).jacobian([X, Y]).subs({X: pt[0], Y: pt[1]})
    lin = sp.Matrix([R(e1[1]), R(e2[1])]) + Jm * sp.Matrix([R(h), R(k)])
    assert list(lin) == [R(v) for v in G]
    return {"answer": [float(v) for v in G], "vals": {"tv1": frl(e1[0]), "tv2": frl(e2[0]), "F0": [fr(e1[1]), fr(e2[1])], "ds": [enc(d) for d in ds],
                                                      "tvd": [frl(r[0]) for r in res], "J": frl(J), "prods": frl(prods), "Jh": frl(Jh), "G": frl(G)}}


def classify_cp(fs, pt):
    H = sp.hessian(fs, (X, Y)).subs({X: pt[0], Y: pt[1]})
    D = H.det()
    return (2 if D < 0 else 3 if D == 0 else 0 if H[0, 0] > 0 else 1), H, D


def v5(p):
    q, lv = p["params"], p["level"]
    f = dec(q["f"], 2)
    fs = tsym(f, (X, Y))
    P_ = sp.Poly(fs, X, Y)
    A, B, C = P_.coeff_monomial(X**2), P_.coeff_monomial(X * Y), P_.coeff_monomial(Y**2)
    if lv == 1:
        sol = sp.solve([sp.diff(fs, X), sp.diff(fs, Y)], [X, Y], dict=True)
        assert len(sol) == 1 and B == 0
        h, k = int(sol[0][X]), int(sol[0][Y])
        return {"answer": [h, k], "vals": {"fx": enc(pdiff(f, 0)), "fy": enc(pdiff(f, 1)), "h": h, "k": k, "h2": int(2 * A * h), "k2": int(2 * C * k), "A2": int(2 * A), "C2": int(2 * C)}}
    if lv == 2:
        h, k = q["h"], q["k"]
        fx, fy = pdiff(f, 0), pdiff(f, 1)
        tvx, gx = ev(fx, [h, k])
        tvy, gy = ev(fy, [h, k])
        assert gx == 0 and gy == 0
        idx, H, D = classify_cp(fs, [h, k])
        assert D == 4 * A * C - B * B
        return {"answer": idx, "vals": {"fx": enc(fx), "fy": enc(fy), "tvx": frl(tvx), "tvy": frl(tvy), "A2": int(2 * A), "C2": int(2 * C), "P1": int(4 * A * C), "P2": int(B * B), "D": int(D), "idx": idx}}
    sols = [s for s in sp.solve([sp.diff(fs, X), sp.diff(fs, Y)], [X, Y], dict=True) if s[X].is_real and s[Y].is_real]
    cps = sorted([[int(s[X]), int(s[Y])] for s in sols], key=lambda c: (-abs(c[0]) if q["fam"] == 0 else abs(c[0]), -c[0]))
    if q["fam"] == 0:
        cps = sorted(cps, key=lambda c: -c[0])
    assert len(cps) == 2
    fxx, fyy, fxy = pdiff(pdiff(f, 0), 0), pdiff(pdiff(f, 1), 1), pdiff(pdiff(f, 0), 1)
    hess, kinds = [], []
    for c in cps:
        idx, H, D = classify_cp(fs, c)
        hess.append([fr(Fr(int(H[0, 0]))), fr(Fr(int(H[1, 1]))), fr(Fr(int(H[0, 1]))), fr(Fr(int(D)))])
        kinds.append(idx)
    ext = [c for c, kd in zip(cps, kinds) if kd < 2]
    assert len(ext) == 1 and sorted(kinds)[1] == 2
    kk = cps[1][0] if q["fam"] else 0
    return {"answer": ext[0], "vals": {"fx": enc(pdiff(f, 0)), "fy": enc(pdiff(f, 1)), "fxx": enc(fxx), "fyy": enc(fyy), "fxy": enc(fxy), "cps": cps,
                                       "hess": hess, "kinds": kinds, "k3": kk**3, "kk": kk**2 if q["fam"] else cps[0][0]**2}}


def absext(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        f = dec(q["f"], 2)
        x1, x2, y1, y2 = q["x1"], q["x2"], q["y1"], q["y2"]
        corners = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]
        res = [ev(f, c) for c in corners]
        cv = [r[1] for r in res]
        best = max(cv) if q["max"] else min(cv)
        fs = tsym(f, (X, Y))
        grid = [fs.subs({X: x1 + sp.Rational(i * (x2 - x1), 8), Y: y1 + sp.Rational(j * (y2 - y1), 8)}) for i in range(9) for j in range(9)]
        assert R(best) == (max(grid) if q["max"] else min(grid))
        return {"answer": int(best), "vals": {"tv": [frl(r[0]) for r in res], "cv": frl(cv), "best": int(best)}}
    if lv == 2:
        A, C, h, k, c0 = q["A"], q["C"], q["h"], q["k"], q["c0"]
        x1, x2, y1, y2 = q["x1"], q["x2"], q["y1"], q["y2"]
        assert x1 < h < x2 and y1 < k < y2
        fs = A * (X - h)**2 + C * (Y - k)**2 + c0
        pts = [[h, k], [h, y1], [h, y2], [x1, k], [x2, k], [x1, y1], [x2, y1], [x2, y2], [x1, y2]]
        cv = [int(fs.subs({X: a, Y: b})) for a, b in pts]
        xs = sorted({x1 + sp.Rational(i * (x2 - x1), 12) for i in range(13)} | {h})
        ys = sorted({y1 + sp.Rational(j * (y2 - y1), 12) for j in range(13)} | {k})
        grid = [fs.subs({X: a_, Y: b_}) for a_ in xs for b_ in ys]
        mx, mn = max(cv), min(cv)
        assert mx == max(grid) and mn == min(grid)
        f_terms = norm([(Fr(A), (2, 0), (0, 0)), (Fr(C), (0, 2), (0, 0)), (Fr(-2 * A * h), (1, 0), (0, 0)), (Fr(-2 * C * k), (0, 1), (0, 0)), (Fr(A * h * h + C * k * k + c0), (0, 0), (0, 0))])
        assert sp.expand(tsym(f_terms, (X, Y)) - fs) == 0
        d = [[a - h, b - k, (a - h)**2, (b - k)**2] for a, b in pts]
        return {"answer": [mx, mn], "vals": {"cpts": pts, "d": d, "cv": cv, "mx": mx, "mn": mn, "f": enc(f_terms)}}
    pp, qq, Rr = q["p"], q["q"], q["R"]
    fs = X**2 + Y**2 + pp * X + qq * Y
    N = isq(pp * pp + qq * qq)
    cp = [Fr(-pp, 2), Fr(-qq, 2)]
    assert cp[0]**2 + cp[1]**2 < Rr * Rr
    tv = [Fr(cp[0])**2, Fr(cp[1])**2, pp * cp[0], qq * cp[1]]
    fmin = sum(tv)
    # boundary by Lagrange with SymPy
    lam = sp.symbols("lam")
    sols = sp.solve([sp.diff(fs, X) - 2 * lam * X, sp.diff(fs, Y) - 2 * lam * Y, X**2 + Y**2 - Rr * Rr], [X, Y, lam], dict=True)
    bvals = sorted(fs.subs(s) for s in sols)
    gmax, gmin = Rr * Rr + Rr * N, Rr * Rr - Rr * N
    assert bvals[-1] == gmax and bvals[0] == gmin and R(fmin) < gmin
    assert fs.subs({X: R(cp[0]), Y: R(cp[1])}) == R(fmin)
    Pm = [Fr(Rr * pp, N), Fr(Rr * qq, N)]
    # the shown term values follow the generator's term order: x², y², x, y (zero terms dropped)
    f_terms = norm([(Fr(1), (2, 0), (0, 0)), (Fr(1), (0, 2), (0, 0)), (Fr(pp), (1, 0), (0, 0)), (Fr(qq), (0, 1), (0, 0))])
    tv, _ = ev(f_terms, cp)
    return {"answer": [gmax, float(fmin)], "vals": {"N": N, "R2": Rr * Rr, "cp": frl(cp), "tv": frl(tv), "fmin": fr(fmin), "pR": pp * Rr, "qR": qq * Rr,
                                                    "gmax": gmax, "gmin": gmin, "Pm": frl(Pm)}}


def lagrange(p):
    q, lv = p["params"], p["level"]
    lam = sp.symbols("lam")
    if lv == 1:
        a, b, c = q["a"], q["b"], q["c"]
        s = sp.solve([Y - lam * a, X - lam * b, a * X + b * Y - c], [X, Y, lam], dict=True)[0]
        xs, ys, m = int(s[X]), int(s[Y]), int(s[lam])
        return {"answer": xs * ys, "vals": {"ab": a * b, "ab2": 2 * a * b, "m": m, "xs": xs, "ys": ys, "fm": xs * ys}}
    if lv == 2:
        a, b, C = q["a"], q["b"], q["C"]
        s = sp.solve([Y - lam * (a + b), X - lam * 2 * b, (a + b) * X + 2 * b * Y - C], [X, Y, lam], dict=True)[0]
        xs, ys, lm = s[X], s[Y], s[lam]
        assert xs.is_integer and ys.is_integer and lm.is_integer
        return {"answer": int(xs * ys), "vals": {"ab": a + b, "b2": 2 * b, "coef": 4 * b * (a + b), "lam": int(lm), "xs": int(xs), "ys": int(ys), "area": int(xs * ys)}}
    a, b, Rr = q["a"], q["b"], q["R"]
    sols = sp.solve([a - 2 * lam * X, b - 2 * lam * Y, X**2 + Y**2 - Rr * Rr], [X, Y, lam], dict=True)
    vals_ = sorted(a * s[X] + b * s[Y] for s in sols)
    N = isq(a * a + b * b)
    RN = Rr * N
    assert vals_ == [-RN, RN]
    best = [s for s in sols if a * s[X] + b * s[Y] == RN][0]
    Pm = [Fr(Rr * a, N), Fr(Rr * b, N)]
    assert [best[X], best[Y]] == [R(v) for v in Pm] and best[lam] == sp.Rational(N, 2 * Rr)
    return {"answer": [RN, -RN], "vals": {"a2": a * a, "b2": b * b, "R2": Rr * Rr, "NN": N * N, "R4": 4 * Rr * Rr, "lam2": fr(Fr(N * N, 4 * Rr * Rr)),
                                          "lam": fr(Fr(N, 2 * Rr)), "Pm": frl(Pm), "RN": RN}}


def toF(e):
    e = sp.nsimplify(e)
    return Fr(int(e.p), int(e.q))


def v6(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, c, x1, x2, y1, y2 = (q[k] for k in ("a", "b", "c", "x1", "x2", "y1", "y2"))
        I = sp.integrate(a * X + b * Y + c, (Y, y1, y2), (X, x1, x2))
        inner = sp.expand(sp.integrate(a * X + b * Y + c, (Y, y1, y2)))
        dy, dx = y2 - y1, x2 - x1
        Pc = int(inner.coeff(X, 1))
        Q0 = toF(inner.coeff(X, 0))
        X1 = Fr(Pc * (x2 * x2 - x1 * x1), 2)
        X2 = Q0 * dx
        assert R(X1 + X2) == I
        area = dx * dy
        av = toF(I) / area
        return {"answer": float(av if q["avg"] else toF(I)), "vals": {"dy": dy, "dx": dx, "y22": y2 * y2, "y12": y1 * y1, "x22": x2 * x2, "x12": x1 * x1, "Pc": Pc,
                                                                     "Q0": fr(Q0), "X1": fr(X1), "X2": fr(X2), "I": fr(toF(I)), "area": area, "av": fr(av)}}
    if lv == 2:
        pp, m, L, i, j, K = (q[k] for k in ("p", "m", "L", "i", "j", "K"))
        inner = sp.integrate(K * X**i * Y**j, (Y, 0, m * X**pp))
        Pw = pp * (j + 1) + i
        Cc = toF(sp.simplify(inner / X**Pw))
        I = sp.integrate(inner, (X, 0, L))
        return {"answer": float(I), "vals": {"Cc": fr(Cc), "Pw": Pw, "P1": Pw + 1, "Lp": L**(Pw + 1), "I": fr(toF(I))}}
    pp, qq, h = q["p"], q["q"], q["h"]
    top = h * (1 - X / pp - Y / qq)
    Vol = sp.integrate(1, (Z, 0, top), (Y, 0, qq * (1 - X / pp)), (X, 0, pp))
    mid = sp.integrate(top, (Y, 0, qq * (1 - X / pp)))
    assert sp.simplify(mid - sp.Rational(h * qq, 2) * (1 - X / pp)**2) == 0
    assert sp.integrate((1 - X / pp)**2, (X, 0, pp)) == sp.Rational(pp, 3)
    return {"answer": float(Vol), "vals": {"q2": 2 * qq, "rq": fr(Fr(h * qq, 2)), "p3": fr(Fr(pp, 3)), "pqh": pp * qq * h, "Vol": fr(toF(Vol))}}


@lru_cache(maxsize=None)
def swapped(fam, k, b, c):
    if fam == 0:
        orig = mpmath.quad(lambda xx: mpmath.quad(lambda yy: mpmath.exp(yy**2), [xx / k, b]), [0, k * b])
        new = sp.integrate(sp.integrate(sp.exp(Y**2), (X, 0, k * Y)), (Y, 0, b))
    else:
        orig = mpmath.quad(lambda xx: mpmath.quad(lambda yy: mpmath.exp(yy**3), [mpmath.sqrt(xx / c), 1]), [0, c])
        new = sp.integrate(sp.integrate(sp.exp(Y**3), (X, 0, c * Y**2)), (Y, 0, 1))
    assert abs(orig - float(new)) < 1e-8 * max(1, abs(orig))
    return new


def fubini(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        K, m, n_, a1, b1, a2, b2 = (q[k] for k in ("K", "m", "n", "a1", "b1", "a2", "b2"))
        A = toF(sp.integrate(X**m, (X, a1, b1)))
        B = toF(sp.integrate(Y**n_, (Y, a2, b2)))
        I = sp.integrate(K * X**m * Y**n_, (Y, a2, b2), (X, a1, b1))
        assert R(K * A * B) == I
        return {"answer": float(I), "vals": {"A": fr(A), "B": fr(B), "AH": b1**(m + 1) if m else 0, "AL": a1**(m + 1) if m else 0,
                                             "BH": b2**(n_ + 1) if n_ else 0, "BL": a2**(n_ + 1) if n_ else 0, "m1": m + 1, "n1": n_ + 1, "I": fr(K * A * B)}}
    if lv == 2:
        Tt, a, m = q["T"], q["a"], q["m"]
        lin = Tt < 2
        curve = m * X if lin else X**2
        top = m * a if lin else a * a
        below = Tt in (0, 2)
        ylo, yhi = (0, curve) if below else (curve, top)
        tests = [sp.Integer(1), X**2 * Y + 3 * X + 1]
        want = [sp.integrate(g, (Y, ylo, yhi), (X, 0, a)) for g in tests]
        hits = []
        for i, o in enumerate(q["opts"]):
            lo, hi, ilo, ihi = (sp.sympify(s, locals={"y": Y}) for s in o)
            got = [sp.integrate(g, (X, ilo, ihi), (Y, lo, hi)) for g in tests]
            if all(sp.simplify(g - w) == 0 for g, w in zip(got, want)):
                hits.append(i)
        assert len(hits) == 1, f"options matching: {hits}"
        return {"answer": hits[0], "vals": {"top": top}}
    if q["fam"] == 0:
        k, b = q["k"], q["b"]
        val = swapped(0, k, b, 0)
        assert sp.simplify(val - sp.Rational(k, 2) * (sp.exp(b * b) - 1)) == 0
        return {"answer": float(val), "vals": {"kb": k * b, "bb": b * b, "half": fr(Fr(k, 2))}}
    c = q["c"]
    val = swapped(1, 0, 0, c)
    assert sp.simplify(val - sp.Rational(c, 3) * (sp.E - 1)) == 0
    return {"answer": float(val), "vals": {"third": fr(Fr(c, 3))}}


def v7(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, Rr = q["a"], q["b"], q["R"]
        I = sp.integrate((a + b * R_**2) * R_, (R_, 0, Rr), (TH, 0, 2 * sp.pi))
        R2, R4 = Rr * Rr, Rr**4
        S1, S2 = Fr(a * R2, 2), Fr(b * R4, 4)
        K = 2 * (S1 + S2)
        assert I == R(K) * sp.pi
        return {"answer": float(I), "vals": {"R2": R2, "R4": R4, "S1": fr(S1), "S2": fr(S2), "S": fr(S1 + S2), "K": fr(K)}}
    if lv == 2:
        reg, ig, cc, Rr = q["reg"], q["ig"], q["cc"], q["R"]
        lo, hi = [(0, sp.pi / 2), (0, sp.pi), (-sp.pi / 2, sp.pi / 2)][reg]
        g = [X, Y, X * Y][ig]
        I = sp.integrate((cc * g).subs({X: R_ * sp.cos(TH), Y: R_ * sp.sin(TH)}) * R_, (R_, 0, Rr), (TH, lo, hi))
        trig = [sp.cos(TH), sp.sin(TH), sp.sin(TH) * sp.cos(TH)][ig]
        Tv = toF(sp.integrate(trig, (TH, lo, hi)))
        rp = 3 if ig == 2 else 2
        Rv = Fr(Rr**(rp + 1), rp + 1)
        assert I == R(cc * Tv * Rv)
        return {"answer": float(I), "vals": {"R2": Rr * Rr, "Tv": fr(Tv), "rp": rp, "rp1": rp + 1, "Rp": Rr**(rp + 1), "Rv": fr(Rv), "I": fr(cc * Tv * Rv)}}
    if q["kind"] == 0:
        k, Rr = q["k"], q["R"]
        Mm = sp.integrate(k * RHO * RHO**2 * sp.sin(PH), (RHO, 0, Rr), (PH, 0, sp.pi), (TH, 0, 2 * sp.pi))
        assert Mm == k * Rr**4 * sp.pi
        return {"answer": float(Mm), "vals": {"R4": Rr**4, "q": fr(Fr(Rr**4, 4)), "K": k * Rr**4}}
    a, rm = q["a"], q["rm"]
    H = a * rm * rm
    assert sp.solve(H - a * R_**2, R_) == [rm]
    Vv = sp.integrate((H - a * R_**2) * R_, (R_, 0, rm), (TH, 0, 2 * sp.pi))
    S1, S2 = Fr(H * rm * rm, 2), Fr(a * rm**4, 4)
    assert Vv == 2 * R(S1 - S2) * sp.pi
    return {"answer": float(Vv), "vals": {"H": H, "rm2": rm * rm, "rm4": rm**4, "S1": fr(S1), "S2": fr(S2), "S": fr(S1 - S2), "K": fr(2 * (S1 - S2))}}


def changevars(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        a, b, c, d, pp, qq, kind = (q[k] for k in ("a", "b", "c", "d", "p", "q", "kind"))
        J = sp.Matrix([a * X + b * Y, c * X + d * Y]).jacobian([X, Y]).det()
        assert J != 0
        g = [sp.Integer(1), U, U * W][kind]
        val = sp.integrate(g / sp.Abs(J), (W, 0, qq), (U, 0, pp))
        if kind == 0:  # the parallelogram's area by the shoelace formula agrees
            inv = sp.Matrix([[a, b], [c, d]]).inv()
            vs = [inv * sp.Matrix(v) for v in ([0, 0], [pp, 0], [pp, qq], [0, qq])]
            assert sp.Polygon(*[sp.Point(v[0], v[1]) for v in vs]).area.__abs__() == val
        return {"answer": float(val), "vals": {"ad": a * d, "bc": b * c, "J": int(J), "aJ": abs(int(J)), "val": fr(toF(val)), "p2": pp * pp, "q2": qq * qq}}
    a, b, D = q["a"], q["b"], q["D"]
    Jac = sp.Matrix([a * U, b * W]).jacobian([U, W]).det()
    Vv = sp.integrate(D * (1 - R_**2) * R_ * Jac, (R_, 0, 1), (TH, 0, 2 * sp.pi))
    K = Fr(a * b * D, 2)
    assert Vv == R(K) * sp.pi
    return {"answer": float(Vv), "vals": {"a2": a * a, "b2": b * b, "ab": a * b, "Dab": D * a * b, "K": fr(K)}}


def mass(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, k = q["a"], q["b"], q["k"]
        if q["kind"] == 0:
            m = sp.integrate(k * X * Y, (Y, 0, b), (X, 0, a))
            return {"answer": float(m), "vals": {"X": fr(Fr(a * a, 2)), "Y": fr(Fr(b * b, 2)), "m": fr(toF(m))}}
        c = q["c"]
        m = sp.integrate(c + k * X, (Y, 0, b), (X, 0, a))
        return {"answer": float(m), "vals": {"A1": b * c, "A2": b * k, "T1": a * b * c, "T2": fr(Fr(b * k * a * a, 2)), "m": fr(toF(m))}}
    if lv == 2:
        i, j, a, b, k = (q[s] for s in ("i", "j", "a", "b", "k"))
        rho = k * X**i * Y**j
        I = lambda g: sp.integrate(g, (Y, 0, b), (X, 0, a))
        m, My, Mx = I(rho), I(X * rho), I(Y * rho)
        xb, yb = My / m, Mx / m
        vals = {"X1": fr(Fr(a**(i + 1), i + 1)), "X2": fr(Fr(a**(i + 2), i + 2)), "Y1": fr(Fr(b**(j + 1), j + 1)), "Y2": fr(Fr(b**(j + 2), j + 2)),
                "m": fr(toF(m)), "My": fr(toF(My)), "Mx": fr(toF(Mx)), "xb": fr(toF(xb)), "yb": fr(toF(yb))}
        return {"answer": [float(xb), float(yb)], "vals": vals}
    k, a = q["k"], q["a"]
    I = lambda g: sp.integrate(g, (Y, 0, k * X**2), (X, 0, a))
    A, My, Mx = I(1), I(X), I(Y)
    return {"answer": [float(My / A), float(Mx / A)], "vals": {"kk": k * k, "A": fr(toF(A)), "My": fr(toF(My)), "Mx": fr(toF(Mx)), "xb": fr(toF(My / A)),
                                                             "yb": fr(toF(Mx / A)), "a3": a**3, "a4": a**4, "a5": a**5}}


def surface(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        a, b, c0 = q["a"], q["b"], q["c0"]
        fs = a * X + b * Y + c0
        st = sp.sqrt(1 + sp.diff(fs, X)**2 + sp.diff(fs, Y)**2)
        S = 1 + a * a + b * b
        k, s = surd(S)
        base = {"a2": a * a, "b2": b * b, "S": S, "k": k}
        if lv == 1:
            assert s == 1
            A = sp.integrate(st, (Y, 0, q["q"]), (X, 0, q["p"]))
            base["A"] = int(A)
            return {"answer": int(A), "vals": base}
        base["s"] = s
        if q["disk"]:
            Rr = q["R"]
            A = sp.integrate(st * R_, (R_, 0, Rr), (TH, 0, 2 * sp.pi))
            assert sp.simplify(A - k * Rr * Rr * sp.sqrt(s) * sp.pi) == 0
            base.update({"R2": Rr * Rr, "coef": k * Rr * Rr})
            return {"answer": float(A), "vals": base}
        pp, qq = q["p"], q["q"]
        A = sp.integrate(st, (Y, 0, qq * (1 - X / pp)), (X, 0, pp))
        Tt = Fr(pp * qq, 2)
        assert sp.simplify(A - R(Tt * k) * sp.sqrt(s)) == 0
        base.update({"T": fr(Tt), "coef": fr(Tt * k)})
        return {"answer": float(A), "vals": base}
    a, H, dome = q["a"], q["H"], q["dome"]
    fs = (H - a * (X**2 + Y**2)) if dome else a * (X**2 + Y**2)
    st = sp.sqrt(1 + sp.diff(fs, X)**2 + sp.diff(fs, Y)**2)
    stp = sp.simplify(st.subs({X: R_ * sp.cos(TH), Y: R_ * sp.sin(TH)}))
    rm2 = sp.Rational(H, a)
    A = sp.integrate(stp * R_, (R_, 0, sp.sqrt(rm2)), (TH, 0, 2 * sp.pi))
    w = isq(1 + 4 * a * H)
    K = Fr(w**3 - 1, 6 * a * a)
    assert sp.simplify(A - R(K) * sp.pi) == 0
    return {"answer": float(A), "vals": {"a2": 2 * a, "a4": 4 * a * a, "a8": 8 * a * a, "a6": 6 * a * a, "rm2": fr(Fr(H, a)), "w2": w * w, "w3": w**3, "K": fr(K)}}


VERIFY = {
    "C3.space": space, "C3.vectors": vectors, "C3.lines-planes": lines, "C3.quadrics": quadrics, "C3.vvf": vvf, "C3.curvature": curvature,
    "C3.functions": functions, "C3.limits": limits, "V.1": v1, "C3.mixed": mixed, "C3.tangent-plane": tangent, "V.2": v2, "V.3": v3,
    "C3.implicit": implicit, "V.4": v4, "V.5": v5, "C3.abs-extrema": absext, "C3.lagrange": lagrange, "V.6": v6, "C3.fubini": fubini,
    "V.7": v7, "C3.change-vars": changevars, "C3.mass": mass, "C3.surface-area": surface,
}
