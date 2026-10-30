"""Independent answers for practice/linear-algebra.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]), with exact fractions and SymPy
(Matrix, det, inv, eigenvals, rref, nullspace, cholesky, QR, pinv), and asserts what each problem promises.
Row reductions that the steps show one snapshot at a time are repeated by `reduce` below and then checked
against SymPy's own results."""
from fractions import Fraction as F
from math import gcd, isqrt

import sympy as sp

X, Y, K = sp.symbols("x y k")


# ---- helpers ------------------------------------------------------------------------------------------
def pf(v):
    """A JS value ({n, d} fractions, nested lists) as Fractions."""
    if isinstance(v, dict) and set(v) == {"n", "d"}:
        return F(v["n"], v["d"])
    if isinstance(v, list):
        return [pf(e) for e in v]
    return v


def fq(x):
    """A SymPy rational (or int) as a Fraction."""
    x = sp.nsimplify(x)
    assert x.is_rational, f"{x} is not rational"
    return F(int(x.p), int(x.q))


def tolist(Mx):
    return [[fq(e) for e in row] for row in Mx.tolist()]


def vlist(Mx):
    return [fq(e) for e in Mx]


def flat(A):
    return [e for row in A for e in row]


def isint(x):
    return F(x).denominator == 1


def Mt(A):
    return sp.Matrix([[sp.Rational(F(e).numerator, F(e).denominator) for e in row] for row in A])


def Vc(v):
    return sp.Matrix([sp.Rational(F(e).numerator, F(e).denominator) for e in v])


def dot(u, v):
    return sum(F(a) * b for a, b in zip(u, v))


def sqf(N):
    k, s, f = 1, N, 2
    while f * f <= s:
        while s % (f * f) == 0:
            s //= f * f
            k *= f
        f += 1
    return k, s


def isq(N):
    r = isqrt(N)
    assert r * r == N, f"{N} is not a perfect square"
    return r


def det2(A):
    return F(A[0][0]) * A[1][1] - F(A[0][1]) * A[1][0]


def minor(A, i, j):
    return [[e for c, e in enumerate(row) if c != j] for r, row in enumerate(A) if r != i]


def cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


def cross_prods(a, b):
    return [[a[1] * b[2], a[2] * b[1]], [a[2] * b[0], a[0] * b[2]], [a[0] * b[1], a[1] * b[0]]]


def igcd(xs):
    g = 0
    for x in xs:
        g = gcd(g, int(x))
    return g


def reduce(A0, aug=0, rref=False):
    """The same recorded elimination as reduce() in the JavaScript (pivot order, swaps, scaling)."""
    A = [[F(e) for e in row] for row in A0]
    m, nc = len(A), len(A[0]) - aug
    snaps, mults, scales, pivots = [], [], [], []
    row = swaps = 0
    for c in range(nc):
        if row >= m:
            break
        p = row
        while p < m and A[p][c] == 0:
            p += 1
        if p == m:
            continue
        did = False
        if p != row:
            A[p], A[row] = A[row], A[p]
            swaps += 1
            did = True
        if rref and A[row][c] != 1:
            s = A[row][c]
            A[row] = [e / s for e in A[row]]
            scales.append(s)
            did = True
        for i in (range(m) if rref else range(row + 1, m)):
            if i == row or A[i][c] == 0:
                continue
            f = A[i][c] / A[row][c]
            A[i] = [e - f * g for e, g in zip(A[i], A[row])]
            mults.append(f)
            did = True
        if did:
            snaps.append([r[:] for r in A])
        pivots.append(c)
        row += 1
    return {"A": A, "snaps": snaps, "mults": mults, "scales": scales, "pivots": pivots, "swaps": swaps}


def red_vals(red):
    return {"snaps": red["snaps"], "mults": red["mults"], "scales": red["scales"]}


def det3_vals(A):
    m = [det2(minor(A, 0, j)) for j in range(3)]
    t = [F(A[0][j]) * m[j] * (-1 if j % 2 else 1) for j in range(3)]
    d = sum(t)
    assert d == fq(Mt(A).det())
    return {"mins": m, "terms": t, "det": d}, d


def back_sub(U):
    """Back substitution on an upper-triangular augmented matrix: the reduced right sides and the solution."""
    k = len(U)
    sol, rhs = [None] * k, [None] * k
    for i in range(k - 1, -1, -1):
        rest = F(U[i][k]) - sum(F(U[i][j]) * sol[j] for j in range(i + 1, k))
        rhs[i] = rest
        sol[i] = rest / U[i][i]
    return rhs, sol


def char2(A):
    t = A[0][0] + A[1][1]
    d = A[0][0] * A[1][1] - A[0][1] * A[1][0]
    ev = sorted(Mt(A).eigenvals(multiple=True), reverse=True)
    assert all(e.is_integer for e in ev) and len(set(ev)) == 2, "eigenvalues are not distinct integers"
    l1, l2 = int(ev[0]), int(ev[1])
    assert l1 + l2 == t and l1 * l2 == d
    return t, d, l1, l2


# ---- concepts ----------------------------------------------------------------------------------------------
def vec_basics(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        d = [b - a for a, b in zip(q["p"], q["q"])]
        return {"answer": d, "vals": {"d": d}}
    if lv == 2:
        v = q["v"]
        sq = [e * e for e in v]
        N = sum(sq)
        L = isq(N)
        u = [F(e, L) for e in v]
        uu = [e * e for e in u]
        assert sum(uu) == 1 and sp.simplify(Vc(u).norm() - 1) == 0
        return {"answer": u, "vals": {"sq": sq, "N": N, "L": L, "u": u, "uu": uu}}
    if q["kind"] == 0:
        d, Fm = q["d"], q["Fm"]
        sq = [e * e for e in d]
        N = sum(sq)
        ln = isq(N)
        m = F(Fm, ln)
        assert isint(m)
        f = [int(m) * e for e in d]
        assert Vc(f).norm() == Fm
        return {"answer": f, "vals": {"sq": sq, "N": N, "len": ln, "m": int(m), "f": f}}
    d = [b - a for a, b in zip(q["p"], q["q"])]
    sq = [e * e for e in d]
    N = sum(sq)
    dist = Vc(d).norm()
    assert dist.is_integer
    return {"answer": int(dist), "vals": {"d": d, "sq": sq, "N": N, "dist": int(dist)}}


def la_1(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        au = [q["a"] * e for e in q["u"]]
        bw = [q["b"] * e for e in q["v"]]
        w = [x + y for x, y in zip(au, bw)]
        return {"answer": w, "vals": {"au": au, "bw": bw, "w": w}}
    if lv == 2:
        sc = [[c * e for e in v] for c, v in zip(q["c"], q["vs"])]
        res = [sum(s[j] for s in sc) for j in range(3)]
        return {"answer": res, "vals": {"sc": sc, "res": res}}
    v1, v2, w = q["v1"], q["v2"], q["w"]
    sol = Mt([[v1[0], v2[0]], [v1[1], v2[1]]]).solve(Vc(w))
    c1, c2 = fq(sol[0]), fq(sol[1])
    assert isint(c1) and isint(c2)
    Dt = v1[0] * v2[1] - v2[0] * v1[1]
    return {"answer": [c1, c2], "vals": {"Dt": Dt, "num1": w[0] * v2[1] - v2[0] * w[1], "num2": v1[0] * w[1] - w[0] * v1[1], "c1": c1, "c2": c2}}


def la_dot(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        prods = [a * b for a, b in zip(q["u"], q["v"])]
        return {"answer": sum(prods), "vals": {"prods": prods, "s": sum(prods)}}
    if lv == 2:
        u, v = q["u"], q["v"]
        prods = [a * b for a, b in zip(u, v)]
        dp = sum(prods)
        ang = sp.acos(sp.Integer(dp) / (Vc(u).norm() * Vc(v).norm())) * 180 / sp.pi
        ang = sp.nsimplify(sp.simplify(ang))
        assert ang.is_integer, f"angle {ang} is not a whole number of degrees"
        ang = int(ang)
        if dp == 0:
            return {"answer": ang, "vals": {"prods": prods, "dp": dp, "ang": ang}}
        sqU, sqV = [e * e for e in u], [e * e for e in v]
        N1, N2 = sum(sqU), sum(sqV)
        k, rs = sqf(N1 * N2)
        assert rs in (1, 2)
        return {"answer": ang, "vals": {"prods": prods, "dp": dp, "sqU": sqU, "sqV": sqV, "N1": N1, "N2": N2, "NN": N1 * N2, "k": k, "rs": rs, "ang": ang}}
    if q["kind"] == 0:
        d = [b - a for a, b in zip(q["p"], q["q"])]
        prods = [a * b for a, b in zip(q["f"], d)]
        W = sum(prods)
        assert W > 0
        return {"answer": W, "vals": {"d": d, "prods": prods, "W": W}}
    j, u, v = q["j"], list(q["u"]), q["v"]
    rest = sum(u[i] * v[i] for i in range(3) if i != j)
    kk = sp.solve(sum((K if i == j else u[i]) * v[i] for i in range(3)), K)
    assert len(kk) == 1 and kk[0].is_integer
    k = int(kk[0])
    u[j] = k
    prods = [a * b for a, b in zip(u, v)]
    assert sum(prods) == 0
    return {"answer": k, "vals": {"rest": rest, "nrest": -rest, "k": k, "prods": prods}}


def la_projection(p):
    q, lv = p["params"], p["level"]
    a, b = q["a"], q["b"]
    prods = [x * y for x, y in zip(a, b)]
    ab, aa = sum(prods), dot(a, a)
    if lv == 1:
        sq = [e * e for e in a]
        c = isq(sum(sq))
        comp = F(ab, c)
        assert sp.Rational(ab) / Vc(a).norm() == sp.Rational(comp.numerator, comp.denominator)
        return {"answer": comp, "vals": {"prods": prods, "ab": ab, "sq": sq, "c": c, "comp": comp}}
    t = F(ab) / aa
    proj = [t * e for e in a]
    P = Vc(a) * Vc(a).T / (Vc(a).T * Vc(a))[0]
    assert vlist(P * Vc(b)) == proj
    if lv == 2:
        return {"answer": proj, "vals": {"ab": ab, "aa": aa, "t": t, "proj": proj}}
    perp = [x - y for x, y in zip(b, proj)]
    chk = [x * y for x, y in zip(a, perp)]
    assert sum(chk) == 0 and isint(t) and aa == 25
    sq = [e * e for e in perp]
    speed = isq(int(sum(sq)))
    return {"answer": perp, "vals": {"prods": prods, "ab": ab, "aa": aa, "t": t, "proj": proj, "perp": perp, "chk": chk, "sq": sq, "N": sum(sq), "speed": speed}}


def la_cross(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b = q["a"], q["b"]
        c = vlist(Vc(a).cross(Vc(b)))
        assert c == [F(e) for e in cross(a, b)]
        return {"answer": c, "vals": {"prods": cross_prods(a, b), "c": c, "chkA": [x * y for x, y in zip(a, c)], "chkB": [x * y for x, y in zip(b, c)]}}
    if lv == 2:
        P0, Q, R = q["P"], q["Q"], q["R"]
        e = [x - y for x, y in zip(Q, P0)]
        f = [x - y for x, y in zip(R, P0)]
        c = cross(e, f)
        sq = [x * x for x in c]
        N = sum(sq)
        k, rs = sqf(N)
        area = Vc(c).norm() / 2
        # Heron-free check: half |e||f| sin θ, via the Gram determinant
        gram = (Mt([e, f]) * Mt([e, f]).T).det()
        assert sp.simplify(area - sp.sqrt(gram) / 2) == 0
        return {"answer": float(area), "vals": {"e": e, "f": f, "prods": cross_prods(e, f), "c": c, "sq": sq, "N": N, "k": k, "rs": rs, "kh": F(k, 2)}}
    a, b, c3 = q["a"], q["b"], q["c"]
    bc = cross(b, c3)
    tprods = [x * y for x, y in zip(a, bc)]
    trip = sum(tprods)
    assert trip == Mt([a, b, c3]).det() != 0
    return {"answer": abs(trip), "vals": {"prods": cross_prods(b, c3), "bc": bc, "tprods": tprods, "trip": trip, "vol": abs(trip)}}


def classify(member, pts, zero):
    """0 subspace, 1 no zero vector, 2 not closed under addition only, 3 not closed under scaling only."""
    for pt in pts:
        assert member(pt), f"sample {pt} is not in the set"
    if not member(zero):
        return 1
    add = all(member([a + b for a, b in zip(u, v)]) for u in pts for v in pts)
    scale = all(member([c * a for a in u]) for u in pts for c in (F(-1), F(2), F(1, 2), F(-3), F(1, 3)))
    if add and scale:
        return 0
    if scale and not add:
        return 2
    if add and not scale:
        return 3
    raise AssertionError("fails both closure tests")


def la_subspace(p):
    q, lv = p["params"], p["level"]
    rng = [F(t) for t in range(-3, 4)]
    if lv == 1:
        if q["kind"] == 0:
            m, b = q["m"], q["b"]
            pts = [[t, m * t + b] for t in rng]
            return {"answer": classify(lambda v: v[1] == m * v[0] + b, pts, [0, 0]), "vals": {}}
        a, b, c, d = q["a"], q["b"], q["c"], q["d"]
        pts = [[s, t, (d - a * s - b * t) / c] for s in rng for t in rng[:3]]
        return {"answer": classify(lambda v: a * v[0] + b * v[1] + c * v[2] == d, pts, [0, 0, 0]), "vals": {}}
    if lv == 2:
        kind = q["kind"]
        if kind == 0:
            k = q["k"]
            pts = [[s, k * s + t] for s in rng for t in (F(0), F(1), F(3))]
            return {"answer": classify(lambda v: v[1] >= k * v[0], pts, [0, 0]), "vals": {}}
        if kind == 1:
            a, b = q["a"], q["b"]
            pts = [[t, a * t] for t in rng] + [[t, b * t] for t in rng]
            ans = classify(lambda v: v[1] == a * v[0] or v[1] == b * v[0], pts, [0, 0])
            assert not (a + b == 2 * a or a + b == 2 * b)
            return {"answer": ans, "vals": {"s": a + b, "a2": 2 * a, "b2": 2 * b}}
        if kind == 2:
            pts = [[s, t] for s in rng for t in rng]
            return {"answer": classify(lambda v: isint(v[0]) and isint(v[1]), pts, [0, 0]), "vals": {}}
        if kind == 3:
            a, b = q["a"], q["b"]
            pts = [[s, t, a * s + b * t] for s in rng for t in rng]
            return {"answer": classify(lambda v: v[2] == a * v[0] + b * v[1], pts, [0, 0, 0]), "vals": {}}
        if kind == 4:
            pts = [[s, t] for s in rng if s >= 0 for t in rng if t >= 0]
            return {"answer": classify(lambda v: v[0] >= 0 and v[1] >= 0, pts, [0, 0]), "vals": {}}
        pts = [[F(0), s, t] for s in rng for t in rng[:2]] + [[s, F(0), t] for s in rng for t in rng[:2]]
        return {"answer": classify(lambda v: v[0] == 0 or v[1] == 0, pts, [0, 0, 0]), "vals": {}}
    u, v, order = q["u"], q["v"], q["order"]
    ns = Mt([u, v]).nullspace()
    assert len(ns) == 1
    c = cross(u, v)
    g = igcd(c)
    w = [e // g for e in c]
    e = [w[0], -w[1], w[2]]
    cands = [w, u, v, e]
    for i, cand in enumerate(cands):
        par = Vc(cand).cross(ns[0]) == sp.zeros(3, 1)
        assert par == (i == 0), "only the first candidate may span the complement"
    return {"answer": order.index(0), "vals": {"prods": cross_prods(u, v), "c": c, "g": g, "w": w, "e": e,
                                             "cu": [a * b for a, b in zip(w, u)], "cv": [a * b for a, b in zip(w, v)]}}


def la_2(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        v1, v2 = q["v1"], q["v2"]
        ad, cb = v1[0] * v2[1], v2[0] * v1[1]
        rank = Mt([v1, v2]).rank()
        if q["dep"]:
            assert v2 == [q["k"] * e for e in v1]
        return {"answer": 0 if rank == 2 else 1, "vals": {"ad": ad, "cb": cb, "Dt": ad - cb}}
    if lv == 2:
        v1, v2, v3 = q["v1"], q["v2"], q["v3"]
        A = [[v1[i], v2[i], v3[i]] for i in range(3)]
        vals, d = det3_vals(A)
        if q["dep"]:
            assert v3 == [q["al"] * a + q["be"] * b for a, b in zip(v1, v2)]
        return {"answer": 0 if Mt(A).rank() == 3 else 1, "vals": vals}
    A, j = q["A"], q["j"]
    m = [int(det2(minor(A, 0, c))) for c in range(3)]
    sg = [1, -1, 1]
    coefK = sg[j] * m[j]
    rest = sum(sg[c] * A[0][c] * m[c] for c in range(3) if c != j)
    Ms = sp.Matrix(A)
    Ms[0, j] = K
    sol = sp.solve(Ms.det(), K)
    assert len(sol) == 1 and sol[0].is_integer
    return {"answer": int(sol[0]), "vals": {"m": m, "coefK": coefK, "rest": rest, "nrest": -rest, "k": int(sol[0])}}


def la_3(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        b1, b2, c = q["b1"], q["b2"], q["c"]
        s1 = [c[0] * e for e in b1]
        s2 = [c[1] * e for e in b2]
        v = vlist(Mt([[b1[0], b2[0]], [b1[1], b2[1]]]) * Vc(c))
        return {"answer": v, "vals": {"s1": s1, "s2": s2, "v": v}}
    if lv == 2:
        b1, b2, v = q["b1"], q["b2"], q["v"]
        P = Mt([[b1[0], b2[0]], [b1[1], b2[1]]])
        c = vlist(P.inv() * Vc(v))
        assert all(isint(e) for e in c)
        adj = tolist(P.adjugate())
        w = [dot(r, v) for r in adj]
        return {"answer": c, "vals": {"Dt": fq(P.det()), "adj": adj, "w": w, "c": c}}
    A, P = Mt(q["A"]), Mt(q["P"])
    Bm = P.inv() * A * P
    assert Bm.trace() == A.trace() and Bm.det() == A.det()
    assert sorted(Bm.eigenvals(multiple=True), key=str) == sorted(A.eigenvals(multiple=True), key=str)
    return {"answer": flat(tolist(Bm)), "vals": {"Pi": tolist(P.inv()), "AP": tolist(A * P), "Bm": tolist(Bm), "trA": fq(A.trace()),
                                                 "dA": fq(A.det()), "trB": fq(Bm.trace()), "dB": fq(Bm.det()), "dP": fq(P.det())}}


def la_4(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        t1, t2, v = q["t1"], q["t2"], q["v"]
        A = Mt([[t1[0], t2[0]], [t1[1], t2[1]]])
        res = vlist(A * Vc(v))
        return {"answer": res, "vals": {"s1": [v[0] * e for e in t1], "s2": [v[1] * e for e in t2], "res": res}}
    if lv == 2:
        t1, t2, w, h = q["t1"], q["t2"], q["w"], q["h"]
        A = Mt([[t1[0], t2[0]], [t1[1], t2[1]]])
        corners = [A * Vc(c) for c in ([0, 0], [w, 0], [w, h], [0, h])]
        img = abs(sp.Polygon(*[sp.Point(c[0], c[1]) for c in corners]).area)
        ad, bc = t1[0] * t2[1], t2[0] * t1[1]
        assert img == abs(ad - bc) * w * h
        return {"answer": int(img), "vals": {"ad": ad, "bc": bc, "Dt": ad - bc, "ab": abs(ad - bc), "area": w * h, "img": int(img)}}
    u, v, pp, qq, w = q["u"], q["v"], q["p"], q["q"], q["w"]
    B = Mt([[u[0], v[0]], [u[1], v[1]]])
    T = Mt([[pp[0], qq[0]], [pp[1], qq[1]]]) * B.inv()
    res = vlist(T * Vc(w))
    al, be = vlist(B.inv() * Vc(w))
    assert isint(al) and isint(be)
    sp_, sq_ = [al * e for e in pp], [be * e for e in qq]
    assert [a + b for a, b in zip(sp_, sq_)] == res
    return {"answer": res, "vals": {"Dt": fq(B.det()), "num1": w[0] * v[1] - v[0] * w[1], "num2": u[0] * w[1] - w[0] * u[1],
                                    "al": al, "be": be, "sp": sp_, "sq": sq_, "res": res}}


def la_matmul(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        A, v = q["A"], q["v"]
        res = vlist(Mt(A) * Vc(v))
        return {"answer": res, "vals": {"prods": [[a * b for a, b in zip(row, v)] for row in A], "res": res}}
    if lv == 2:
        C = tolist(Mt(q["A"]) * Mt(q["B"]))
        return {"answer": flat(C), "vals": {"C": C}}
    Q, pr = q["Q"], q["p"]
    rev = vlist(Mt(Q) * Vc(pr))
    return {"answer": rev, "vals": {"prods": [[a * b for a, b in zip(row, pr)] for row in Q], "rev": rev}}


def la_14(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        c, A, B = q["c"], Mt(q["A"]), Mt(q["B"])
        S = c * A + B
        assert S.T == c * A.T + B.T
        return {"answer": flat(tolist(S.T)), "vals": {"cA": tolist(c * A), "S": tolist(S), "St": tolist(S.T)}}
    if lv == 2:
        Xm, Ym = Mt(q["X"]), Mt(q["Y"])
        if q["kind"] == 0:
            A, B = Xm.inv(), Ym.inv()
            Z = (A * B).inv()
        else:
            A, B = Xm.T, Ym.T
            Z = (A * B).T
        assert Z == Ym * Xm
        return {"answer": flat(tolist(Z)), "vals": {"Z": tolist(Z)}}
    A, B = Mt(q["A"]), Mt(q["B"])
    Dm = (A + B) ** 2 - (A ** 2 + 2 * A * B + B ** 2)
    assert Dm != sp.zeros(2, 2)
    return {"answer": flat(tolist(Dm)), "vals": {"AB": tolist(A * B), "BA": tolist(B * A), "Dm": tolist(Dm)}}


def kron(A, B):
    return sp.Matrix(sp.BlockMatrix([[A[i, j] * B for j in range(A.cols)] for i in range(A.rows)]).as_explicit())


def la_16(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == 0:
            H = sp.matrix_multiply_elementwise(Mt(q["A"]), Mt(q["B"]))
            return {"answer": flat(tolist(H)), "vals": {"H": tolist(H)}}
        O = Vc(q["u"]) * Vc(q["v"]).T
        assert O.rank() == 1
        return {"answer": flat(tolist(O)), "vals": {"O": tolist(O)}}
    if lv == 2:
        A, B, i, j = q["A"], q["B"], q["i"], q["j"]
        Kr = kron(Mt(A), Mt(B))
        e = fq(Kr[i - 1, j - 1])
        bi, bj = (i + 1) // 2, (j + 1) // 2
        ii, jj = i - 2 * (bi - 1), j - 2 * (bj - 1)
        assert e == A[bi - 1][bj - 1] * B[ii - 1][jj - 1]
        return {"answer": e, "vals": {"bi": bi, "bj": bj, "ii": ii, "jj": jj, "a": A[bi - 1][bj - 1], "b": B[ii - 1][jj - 1], "e": e}}
    A, B, E, Fm = (Mt(q[k]) for k in ("A", "B", "E", "F"))
    Mbig = sp.Matrix(sp.BlockMatrix([[A, B], [sp.zeros(2, 2), sp.eye(2)]]).as_explicit())
    Nbig = sp.Matrix(sp.BlockMatrix([[E], [Fm]]).as_explicit())
    prod = Mbig * Nbig
    top = prod[:2, :]
    assert prod[2:, :] == Fm and top == A * E + B * Fm
    return {"answer": flat(tolist(top)), "vals": {"AE": tolist(A * E), "BF": tolist(B * Fm), "top": tolist(top)}}


def la_det(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        A = q["A"]
        ad, bc = A[0][0] * A[1][1], A[0][1] * A[1][0]
        d = int(Mt(A).det())
        assert d == ad - bc
        return {"answer": d, "vals": {"ad": ad, "bc": bc, "d": d, "ab": abs(d)}}
    if lv == 2:
        A = q["A"]
        lines = [(True, i, sum(1 for e in A[i] if e == 0)) for i in range(3)] + [(False, j, sum(1 for r in A if r[j] == 0)) for j in range(3)]
        best = lines[0]
        for ln in lines[1:]:
            if ln[2] > best[2]:
                best = ln
        isrow, idx, _ = best
        mins, terms = [], []
        for k in range(3):
            i, j = (idx, k) if isrow else (k, idx)
            if A[i][j] == 0:
                continue
            mval = int(det2(minor(A, i, j)))
            mins.append(mval)
            terms.append((-1) ** (i + j) * A[i][j] * mval)
        d = int(Mt(A).det())
        assert sum(terms) == d
        return {"answer": d, "vals": {"mins": mins, "terms": terms, "d": d}}
    P0, Q, R, A = q["P"], q["Q"], q["R"], q["A"]
    e = [Q[0] - P0[0], Q[1] - P0[1]]
    f = [R[0] - P0[0], R[1] - P0[1]]
    t1, t2 = e[0] * f[1], f[0] * e[1]
    area0 = abs(sp.Polygon(sp.Point(*P0), sp.Point(*Q), sp.Point(*R)).area)
    Am = Mt(A)
    imgs = [Am * Vc(v) for v in (P0, Q, R)]
    img = abs(sp.Polygon(*[sp.Point(v[0], v[1]) for v in imgs]).area)
    assert fq(area0) == F(abs(t1 - t2), 2)
    ad, bc = A[0][0] * A[1][1], A[0][1] * A[1][0]
    return {"answer": fq(img), "vals": {"e": e, "f": f, "t1": t1, "t2": t2, "D0": t1 - t2, "absD0": abs(t1 - t2), "area0": fq(area0),
                                        "ad": ad, "bc": bc, "dA": ad - bc, "absA": abs(ad - bc), "img": fq(img)}}


def mat_with_det(dA, n):
    """A concrete n × n matrix with the given determinant (not diagonal, to keep the checks honest)."""
    Mx = sp.eye(n)
    Mx[0, 0] = dA
    for i in range(n):
        for j in range(i + 1, n):
            Mx[i, j] = i + j + 1
    return Mx


def la_det_props(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        kind, dA, nn = q["kind"], q["dA"], q["nn"]
        A = mat_with_det(dA, nn)
        if kind == 0:
            B = mat_with_det(q["dB"], nn).T
            ans = fq((A * B).det())
            return {"answer": ans, "vals": {"ans": ans}}
        if kind == 1:
            ans = fq(A.inv().det())
            return {"answer": ans, "vals": {"ans": ans}}
        c = q["c"]
        ans = fq((c * A).det())
        return {"answer": ans, "vals": {"cn": c ** nn, "ans": ans}}
    if lv == 2:
        if q["kind"] == 0:
            dA, dB, c = q["dA"], q["dB"], q["c"]
            A, B = mat_with_det(dA, 3), mat_with_det(dB, 3).T
            ans = fq((c * A.T * B.inv()).det())
            return {"answer": ans, "vals": {"cn": c ** 3, "ans": ans}}
        dA, ops, k, m, i, j = q["dA"], q["ops"], q["k"], q["m"], q["i"] - 1, q["j"] - 1
        A = mat_with_det(dA, 3)
        trail = []
        for o in ops:
            if o == 0:
                A.row_swap(i, j)
            elif o == 1:
                A[j, :] = k * A[j, :]
            else:
                A[i, :] = A[i, :] + m * A[j, :]
            trail.append(int(A.det()))
        return {"answer": trail[-1], "vals": {"trail": trail, "ans": trail[-1]}}
    A = q["A"]
    red = reduce(A)
    assert all(isint(f) for f in red["mults"])
    diag = [red["A"][i][i] for i in range(3)]
    prod = diag[0] * diag[1] * diag[2]
    d = -prod if red["swaps"] % 2 else prod
    assert d == fq(Mt(A).det())
    return {"answer": d, "vals": {**red_vals(red), "diag": diag, "prod": prod, "d": d}}


def la_inverse(p):
    q, lv = p["params"], p["level"]
    A = Mt(q["A"])
    if lv == 1:
        assert abs(A.det()) == 1
        return {"answer": flat(tolist(A.inv())), "vals": {"d": int(A.det()), "adj": tolist(A.adjugate()), "Ai": tolist(A.inv())}}
    if lv == 2:
        b = q["b"]
        sol = vlist(A.inv() * Vc(b))
        assert all(isint(e) for e in sol)
        adj = A.adjugate()
        return {"answer": sol, "vals": {"d": int(A.det()), "adj": tolist(adj), "w": vlist(adj * Vc(b)), "sol": sol}}
    aug = [row + [1 if i == j else 0 for j in range(3)] for i, row in enumerate(q["A"])]
    red = reduce(aug, aug=3, rref=True)
    Ai = [row[3:] for row in red["A"]]
    assert Ai == tolist(A.inv())
    return {"answer": flat(Ai), "vals": {**red_vals(red), "Ai": Ai}}


def la_15(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        A = Mt(q["A"])
        flags = [A == A.T, A == -A.T, A.is_upper, A.T * A == sp.eye(3)]
        assert sum(flags) == 1
        Ai = q["A"]
        return {"answer": flags.index(True), "vals": {"T": tolist(A.T), "ATA": tolist(A.T * A), "below": [Ai[1][0], Ai[2][0], Ai[2][1]]}}
    if lv == 2:
        N = Mt(q["N"])
        assert N != sp.zeros(3, 3)
        k = next(k for k in range(1, 5) if N ** k == sp.zeros(3, 3))
        return {"answer": k, "vals": {"N2": tolist(N ** 2), "N3": tolist(N ** 3), "k": k, "ac": q["N"][0][1] * q["N"][1][2]}}
    A = Mt(q["A"])
    Kx, S = (A - A.T) / 2, (A + A.T) / 2
    assert Kx.T == -Kx and S.T == S and S + Kx == A
    return {"answer": [fq(Kx[0, 1]), fq(Kx[0, 2]), fq(Kx[1, 2])], "vals": {"T": tolist(A.T), "Dm": tolist(A - A.T), "K": tolist(Kx), "S": tolist(S)}}


def la_5(p):
    q, lv = p["params"], p["level"]
    A, b = q["A"], q["b"]
    aug = [row + [b[i]] for i, row in enumerate(A)]
    red = reduce(aug, aug=1)
    if lv <= 2:
        rhs, sol = back_sub(red["A"])
        assert sol == vlist(Mt(A).solve(Vc(b))) and all(isint(e) for e in sol)
        return {"answer": sol, "vals": {**red_vals(red), "rhs": rhs, "sol": sol}}
    rA, rAug = Mt(A).rank(), Mt(aug).rank()
    ans = 0 if rA == 3 else (1 if rAug > rA else 2)
    sols = sp.linsolve((Mt(A), Vc(b)), *sp.symbols("a b c"))
    assert (ans == 1) == (sols == sp.EmptySet)
    return {"answer": ans, "vals": {**red_vals(red), "cval": red["A"][2][3]}}


def la_lu(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        A = q["A"]
        l = F(A[1][0], A[0][0])
        u22 = A[1][1] - l * A[0][1]
        assert Mt([[1, 0], [l, 1]]) * Mt([[A[0][0], A[0][1]], [0, u22]]) == Mt(A)
        return {"answer": [l, u22], "vals": {"l": l, "lb": l * A[0][1], "u22": u22}}
    if lv == 2:
        A = q["A"]
        red = reduce(A)
        assert red["swaps"] == 0 and len(red["mults"]) == 3
        ls = red["mults"]
        L = Mt([[1, 0, 0], [ls[0], 1, 0], [ls[1], ls[2], 1]])
        assert L * Mt(red["A"]) == Mt(A)
        return {"answer": ls, "vals": {**red_vals(red), "ls": ls}}
    if q["kind"] == 0:
        A = Mt(q["A"])
        L = A.cholesky(hermitian=False)
        Ai = q["A"]
        l = tolist(L)
        assert all(l[i][i] > 0 for i in range(3)) and L * L.T == A
        v22 = Ai[1][1] - l[1][0] ** 2
        n32 = Ai[2][1] - l[2][0] * l[1][0]
        v33 = Ai[2][2] - l[2][0] ** 2 - l[2][1] ** 2
        ans = [l[0][0], l[1][0], l[1][1], l[2][0], l[2][1], l[2][2]]
        return {"answer": ans, "vals": {"v22": v22, "n32": n32, "v33": v33, "ans": ans}}
    L, U, b = Mt(q["L"]), Mt(q["U"]), q["b"]
    yv = vlist(L.inv() * Vc(b))
    Uaug = [row + [yv[i]] for i, row in enumerate(q["U"])]
    rhs, sol = back_sub(Uaug)
    assert sol == vlist((L * U).solve(Vc(b)))
    return {"answer": sol, "vals": {"yv": yv, "y2r": yv[1], "y3r": yv[2], "rhs": rhs, "sol": sol}}


def la_6(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == 0:
            assert q["rk"] <= min(q["m"], q["nc"])
            return {"answer": q["nc"] - q["rk"], "vals": {"nul": q["nc"] - q["rk"]}}
        R = Mt(q["R"])
        rr, piv = R.rref()
        assert rr == R
        nul = len(R.nullspace())
        assert nul + len(piv) == R.cols
        return {"answer": nul, "vals": {"rk": len(piv), "nul": nul, "pc": [c + 1 for c in piv], "nc": R.cols}}
    A = q["A"]
    if lv == 2:
        red = reduce(A)
        rk = Mt(A).rank()
        assert len(red["pivots"]) == rk
        return {"answer": rk - 1, "vals": {**red_vals(red), "rk": rk}}
    red = reduce(A, rref=True)
    assert Mt(red["A"]) == Mt(A).rref()[0]
    ns = Mt(A).nullspace()
    assert len(ns) == 1 and ns[0][2] != 0
    v = vlist(ns[0] / ns[0][2])
    return {"answer": v, "vals": {**red_vals(red), "chk": vlist(Mt(A) * Vc(v))}}


def la_7(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        vs = q["vs"]
        dots = [dot(vs[i], vs[j]) for i, j in ((0, 1), (0, 2), (1, 2))]
        return {"answer": 0 if all(d == 0 for d in dots) else 1, "vals": {"dots": dots}}
    if lv == 2:
        u1, u2, b = q["u1"], q["u2"], q["b"]
        assert dot(u1, u2) == 0
        A = Mt([[u1[i], u2[i]] for i in range(3)])
        bh = vlist(A * (A.T * A).inv() * A.T * Vc(b))
        d1, n1, d2, n2 = dot(u1, b), dot(u1, u1), dot(u2, b), dot(u2, u2)
        al, be = d1 / n1, d2 / n2
        assert isint(al) and isint(be)
        s1, s2 = [al * e for e in u1], [be * e for e in u2]
        assert [x + y for x, y in zip(s1, s2)] == bh
        res = [x - y for x, y in zip(b, bh)]
        return {"answer": bh, "vals": {"d1": d1, "n1": n1, "d2": d2, "n2": n2, "al": al, "be": be, "s1": s1, "s2": s2, "bh": bh, "res": res,
                                       "c1": [x * y for x, y in zip(res, u1)], "c2": [x * y for x, y in zip(res, u2)]}}
    xs, ys = q["xs"], q["ys"]
    A = Mt([[1, xv] for xv in xs])
    c, m = vlist((A.T * A).inv() * A.T * Vc(ys))
    assert isint(c) and isint(m)
    Sx, Sxx, Sy, Sxy = sum(xs), sum(v * v for v in xs), sum(ys), sum(a * b for a, b in zip(xs, ys))
    nn = len(xs)
    res = [yv - c - m * xv for xv, yv in zip(xs, ys)]
    assert sum(res) == 0
    return {"answer": [c, m], "vals": {"npts": nn, "Sx": Sx, "Sxx": Sxx, "Sy": Sy, "Sxy": Sxy, "Dt": nn * Sxx - Sx * Sx, "cn": Sy * Sxx - Sx * Sxy,
                                       "mn": nn * Sxy - Sx * Sy, "c": c, "m": m, "res": res}}


def la_8(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        v1, v2 = q["v1"], q["v2"]
        d, nn = dot(v1, v2), dot(v1, v1)
        t = d / nn
        tv = [t * e for e in v1]
        perp = [a - b for a, b in zip(v2, tv)]
        gs = sp.GramSchmidt([Vc(v1), Vc(v2)])
        assert vlist(gs[1]) == perp
        return {"answer": perp, "vals": {"d": d, "nn": nn, "t": t, "tv": tv, "perp": perp, "chk": [a * b for a, b in zip(v1, perp)]}}
    if lv == 2:
        v1, v2, v3 = q["v1"], q["v2"], q["v3"]
        gs = sp.GramSchmidt([Vc(v1), Vc(v2), Vc(v3)])
        d12, n1 = dot(v1, v2), dot(v1, v1)
        a = d12 / n1
        av1 = [a * e for e in v1]
        u2 = [x - y for x, y in zip(v2, av1)]
        d13, d23, n2 = dot(v1, v3), dot(u2, v3), dot(u2, u2)
        b, c = d13 / n1, d23 / n2
        p1, p2 = [b * e for e in v1], [c * e for e in u2]
        u3 = [x - y - z for x, y, z in zip(v3, p1, p2)]
        assert vlist(gs[1]) == u2 and vlist(gs[2]) == u3 and all(isint(e) for e in [a, b, c])
        return {"answer": u3, "vals": {"d12": d12, "n1": n1, "a": a, "av1": av1, "u2": u2, "d13": d13, "d23": d23, "n2": n2, "b": b, "c": c, "p1": p1, "p2": p2, "u3": u3}}
    A = Mt(q["A"])
    Q, R = A.QRdecomposition()
    a1, a2 = [row[0] for row in q["A"]], [row[1] for row in q["A"]]
    sq1 = [e * e for e in a1]
    r11 = isq(sum(sq1))
    q1 = [F(e, r11) for e in a1]
    p12 = dot(a1, a2)
    r12 = p12 / r11
    u2 = [x - r12 * y for x, y in zip(a2, q1)]
    sq2 = [e * e for e in a2]
    N2 = sum(sq2)
    v22 = N2 - r12 * r12
    r22 = isq(int(v22))
    assert [fq(R[0, 0]), fq(R[0, 1]), fq(R[1, 1])] == [r11, r12, r22]
    return {"answer": [r11, r12, r22], "vals": {"sq1": sq1, "N1": sum(sq1), "r11": r11, "q1": q1, "p12": p12, "r12": r12, "u2": u2, "sq2": sq2,
                                                "N2": N2, "rr": r12 * r12, "v22": v22, "r22": r22}}


def rotm(deg):
    t = sp.rad(deg)
    return sp.Matrix([[sp.cos(t), -sp.sin(t)], [sp.sin(t), sp.cos(t)]])


def la_orthogonal(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        Rm = rotm(q["t"])
        w = vlist(Rm * Vc(q["v"]))
        assert Vc(w).norm() == Vc(q["v"]).norm()
        return {"answer": w, "vals": {"Rm": tolist(Rm), "w": w}}
    if lv == 2:
        Qn, c, b = q["Qn"], q["c"], q["b"]
        Q = Mt(Qn) / c
        assert Q.T * Q == sp.eye(2)
        sol = vlist(Q.solve(Vc(b)))
        assert sol == vlist(Q.T * Vc(b)) and all(isint(e) for e in sol)
        return {"answer": sol, "vals": {"sq": [Qn[0][0] ** 2, Qn[1][0] ** 2, c * c], "Qt": tolist(Q.T), "sol": sol, "dQ": fq(Q.det())}}
    v, al, be, Fm = q["v"], q["al"], q["be"], Mt(q["Fm"])
    assert Fm.det() == -1 and Fm * Fm == sp.eye(2) and Fm.T * Fm == sp.eye(2)
    total = sp.simplify(rotm(be) * rotm(al))
    Rm = rotm(al + be)
    assert sp.simplify(total - Rm) == sp.zeros(2, 2)
    w = vlist(Rm * Vc(v))
    res = vlist(Fm * Vc(w))
    return {"answer": res, "vals": {"Rm": tolist(Rm), "w": w, "res": res}}


def la_9(p):
    q, lv = p["params"], p["level"]
    A = q["A"]
    if lv == 1:
        t, d, l1, l2 = char2(A)
        return {"answer": [l1, l2], "vals": {"t": t, "d": d, "l1": l1, "l2": l2}}
    if lv == 2:
        l = q["l"]
        Bm = [[A[0][0] - l, A[0][1]], [A[1][0], A[1][1] - l]]
        row = 0 if Bm[0][1] != 0 else 1
        pp, qq = Bm[row]
        yy = F(-pp, qq)
        Av = vlist(Mt(A) * Vc([1, yy]))
        assert Av == [l, l * yy] and isint(yy)
        return {"answer": [1, yy], "vals": {"Bm": Bm, "p": pp, "q": qq, "np_": -pp, "yy": yy, "Av": Av}}
    if q["variant"] == 0:
        assert A[0][2] == 0 and A[1][2] == 0
        B, g = [A[0][:2], A[1][:2]], A[2][2]
    else:
        assert A[0][1] == 0 and A[0][2] == 0
        B, g = [A[1][1:], A[2][1:]], A[0][0]
    t, d, l1, l2 = char2(B)
    ev = sorted(Mt(A).eigenvals(multiple=True))
    assert ev == sorted([g, l1, l2]) and len(set(ev)) == 3
    return {"answer": [g, l1, l2], "vals": {"t": t, "d": d, "l1": l1, "l2": l2, "g": g}}


def la_eig_props(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        lams = q["lams"]
        A = sp.diag(*lams)
        # a similar, non-diagonal matrix with the same spectrum, to exercise the rules honestly
        S = sp.Matrix([[1, 1, 0], [0, 1, 1], [0, 0, 1]])
        A = S * A * S.inv()
        I = sp.eye(3)
    if lv == 1:
        kind = q["kind"]
        B = A ** 2 if kind == 0 else (A + q["c"] * I if kind == 1 else A.inv())
        out = [l * l for l in lams] if kind == 0 else ([l + q["c"] for l in lams] if kind == 1 else [F(1, l) for l in lams])
        assert sorted(fq(e) for e in B.eigenvals(multiple=True)) == sorted(out)
        return {"answer": out, "vals": {"out": out}}
    if lv == 2:
        kind = q["kind"]
        if kind == 0:
            c = q["c"]
            prod = fq((A + c * I).det())
            return {"answer": prod, "vals": {"sh": [l + c for l in lams], "prod": prod}}
        if kind == 1:
            s = fq((A ** 2).trace())
            return {"answer": s, "vals": {"sq": [l * l for l in lams], "s": s}}
        s = fq(A.inv().trace())
        return {"answer": s, "vals": {"rec": [F(1, l) for l in lams], "s": s}}
    A = q["A"]
    Am = Mt(A)
    t, d = A[0][0] + A[1][1], int(Am.det())
    if q["kind"] == 0:
        k1, k2 = t * t - d, t * d
        A3 = Am ** 3
        assert A3 == k1 * Am - k2 * sp.eye(2)
        return {"answer": flat(tolist(A3)), "vals": {"t": t, "d": d, "k1": k1, "k2": k2, "kA": tolist(k1 * Am), "A3": tolist(A3)}}
    x0 = Vc(q["x0"])
    x1 = Am * x0
    Ax1 = Am * x1
    num, den = (x1.T * Ax1)[0], (x1.T * x1)[0]
    R = fq(num / den)
    t2, d2, l1, l2 = char2(A)
    assert abs(l1) > abs(l2) and l2 <= R <= l1
    return {"answer": R, "vals": {"x1": vlist(x1), "Ax1": vlist(Ax1), "num": fq(num), "den": fq(den), "R": R, "t": t, "d": d, "l1": l1, "l2": l2}}


def la_10(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        P, D = Mt(q["P"]), Mt(q["D"])
        A = P * D * P.inv()
        return {"answer": flat(tolist(A)), "vals": {"dP": int(P.det()), "Pi": tolist(P.inv()), "PD": tolist(P * D), "Am": tolist(A)}}
    if lv == 2:
        P, D, k = Mt(q["P"]), Mt(q["D"]), q["k"]
        Ak = (P * D * P.inv()) ** k
        Dk = D ** k
        assert P * Dk * P.inv() == Ak
        return {"answer": flat(tolist(Ak)), "vals": {"p1": int(Dk[0, 0]), "p2": int(Dk[1, 1]), "Pi": tolist(P.inv()), "PDk": tolist(P * Dk), "Ak": tolist(Ak), "dP": int(P.det())}}
    A, x0, k = q["A"], q["x0"], q["k"]
    t, d, l1, l2 = char2(A)
    eig = []
    for l in (l1, l2):
        Bm = [[A[0][0] - l, A[0][1]], [A[1][0], A[1][1] - l]]
        row = 0 if (Bm[0][0] != 0 or Bm[0][1] != 0) else 1
        pp, qq = Bm[row]
        v = [qq, -pp]
        g = igcd(v)
        v = [e // g for e in v]
        if v[0] < 0 or (v[0] == 0 and v[1] < 0):
            v = [-e for e in v]
        assert Mt(A) * Vc(v) == l * Vc(v)
        eig.append([Bm, row + 1, pp, qq, v])
    v1, v2 = eig[0][4], eig[1][4]
    Dt = v1[0] * v2[1] - v2[0] * v1[1]
    n1 = x0[0] * v2[1] - v2[0] * x0[1]
    n2 = v1[0] * x0[1] - x0[0] * v1[1]
    c1, c2 = F(n1, Dt), F(n2, Dt)
    assert isint(c1) and isint(c2)
    p1, p2 = l1 ** k, l2 ** k
    w1, w2 = [c1 * p1 * e for e in v1], [c2 * p2 * e for e in v2]
    res = vlist(Mt(A) ** k * Vc(x0))
    assert [a + b for a, b in zip(w1, w2)] == res
    return {"answer": res, "vals": {"t": t, "d": d, "l1": l1, "l2": l2, "eig": eig, "Dt": Dt, "n1": n1, "n2": n2, "c1": c1, "c2": c2,
                                    "cp1": c1 * p1, "cp2": c2 * p2, "w1": w1, "w2": w2, "res": res}}


def stationary(P):
    Pm = Mt(P)
    ns = (Pm.T - sp.eye(Pm.rows)).nullspace()
    assert len(ns) == 1
    v = ns[0] / sum(ns[0])
    return vlist(v)


def la_markov(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, pp = pf(q["a"]), pf(q["b"]), pf(q["p"])
        a1, b1, p1 = 1 - a, 1 - b, 1 - pp
        P = Mt([[a1, a], [b, b1]])
        nxt = vlist((Vc([pp, p1]).T * P).T)
        t = [pp * a1, p1 * b, pp * a, p1 * b1]
        assert nxt == [t[0] + t[1], t[2] + t[3]]
        return {"answer": nxt, "vals": {"a1": a1, "b1": b1, "p1": p1, "t": t, "s1": nxt[0], "s2": nxt[1]}}
    if lv == 2:
        a, b = F(q["ap"], 100), F(q["bp"], 100)
        pi = stationary([[1 - a, a], [b, 1 - b]])
        assert pi == [b / (a + b), a / (a + b)]
        return {"answer": pi, "vals": {"a": a, "b": b, "a1": 1 - a, "b1": 1 - b, "ab": a + b, "pi1": pi[0], "pi2": pi[1]}}
    pp, qq, rr, s = (pf(q[k]) for k in ("p", "q", "r", "s"))
    P = [[1 - pp, pp, F(0)], [qq, 1 - qq - rr, rr], [F(0), s, 1 - s]]
    assert all(e >= 0 for row in P for e in row)
    pi = stationary(P)
    r1, r3 = qq / pp, rr / s
    tot = r1 + 1 + r3
    assert pi == [r1 / tot, 1 / tot, r3 / tot]
    return {"answer": pi, "vals": {"P": P, "r1": r1, "r3": r3, "tot": tot, "pi": pi}}


def la_11(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        A, v = q["A"], q["v"]
        Av = vlist(Mt(A) * Vc(v))
        qv = int((Vc(v).T * Mt(A) * Vc(v))[0])
        terms = [A[0][0] * v[0] ** 2, 2 * A[0][1] * v[0] * v[1], A[1][1] * v[1] ** 2]
        assert sum(terms) == qv
        return {"answer": qv, "vals": {"Av": Av, "q": qv, "terms": terms}}
    if lv == 2:
        a, B, c = q["a"], q["B"], q["c"]
        h = F(B, 2)
        A = Mt([[a, h], [h, c]])
        assert sp.expand((sp.Matrix([X, Y]).T * A * sp.Matrix([X, Y]))[0] - (a * X ** 2 + B * X * Y + c * Y ** 2)) == 0
        ev = [sp.nsimplify(e) for e in A.eigenvals(multiple=True)]
        if all(e > 0 for e in ev):
            ans = 0
        elif all(e < 0 for e in ev):
            ans = 1
        elif any(e > 0 for e in ev) and any(e < 0 for e in ev):
            ans = 2
        else:
            assert sorted(ev) [0] == 0 and sorted(ev)[1] > 0
            ans = 3
        D2 = a * c - h * h
        return {"answer": ans, "vals": {"h": h, "h2": h * h, "ac": a * c, "D2": D2, "trA": a + c}}
    a, b, c, d = q["a"], q["b"], q["c"], q["d"]

    def pd(k):
        return Mt([[a, b, 0], [b, c, d], [0, d, k]]).is_positive_definite

    D2, ad2 = a * c - b * b, a * d * d
    kmin = next(k for k in range(-20, 200) if pd(k))
    assert not pd(kmin - 1) and all(pd(k) for k in range(kmin, kmin + 5))
    return {"answer": kmin, "vals": {"D2": D2, "ad2": ad2, "thr": F(ad2, D2), "kmin": kmin}}


def sing_vals(A):
    return sorted((sp.sqrt(e) for e in (A.T * A).eigenvals(multiple=True)), key=lambda e: -float(e))


def la_12(p):
    q, lv = p["params"], p["level"]
    A = Mt(q["A"])
    G = A.T * A
    if lv == 1:
        assert G.is_diagonal()
        sig = [int(s) for s in sing_vals(A)]
        return {"answer": sig, "vals": {"G": tolist(G), "sig": sig, "sq": [s * s for s in sig]}}
    t, d = int(G.trace()), int(G.det())
    ev = sorted((int(e) for e in G.eigenvals(multiple=True)), reverse=True)
    l1, l2 = ev
    k1, s1 = sqf(l1)
    k2, s2 = sqf(l2)
    if lv == 2:
        sv = sing_vals(A)
        assert sp.simplify(sv[0] - k1 * sp.sqrt(s1)) == 0 and sp.simplify(sv[1] - k2 * sp.sqrt(s2)) == 0
        return {"answer": [float(sv[0]), float(sv[1])], "vals": {"G": tolist(G), "t": t, "d": d, "l1": l1, "l2": l2, "k1": k1, "s1": s1, "k2": k2, "s2": s2}}
    sg1, sg2 = isq(l1), isq(l2)
    Gl = tolist(G)
    Bm = [[Gl[0][0] - l1, Gl[0][1]], [Gl[1][0], Gl[1][1] - l1]]
    row = 0 if (Bm[0][0] != 0 or Bm[0][1] != 0) else 1
    bp, bq = Bm[row]
    dr = [bq, -bp]
    g = igcd(dr)
    dr = [int(e / g) for e in dr]
    if dr[0] < 0:
        dr = [-e for e in dr]
    c = isq(dr[0] ** 2 + dr[1] ** 2)
    v1 = [F(e, c) for e in dr]
    Av = vlist(A * Vc(v1))
    u1 = [e / sg1 for e in Av]
    A1 = [[sg1 * ui * vj for vj in v1] for ui in u1]
    assert sp.sqrt(sum(e ** 2 for e in (A - Mt(A1)))) == sg2
    assert [s for s in sing_vals(A)] == [sg1, sg2] and Mt(A1).rank() == 1
    return {"answer": flat(A1), "vals": {"G": Gl, "t": t, "d": d, "l1": l1, "l2": l2, "s1": sg1, "s2": sg2, "Bm": Bm, "dir": dr, "c": c,
                                         "v1": v1, "Av": Av, "u1": u1, "A1": A1}}


def la_13(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        v = q["v"]
        ab = [abs(e) for e in v]
        sq = [e * e for e in v]
        ln = isq(sum(sq))
        x = Vc(v)
        assert x.norm(1) == sum(ab) and x.norm(sp.oo) == max(ab) and x.norm() == ln
        return {"answer": [sum(ab), ln, max(ab)], "vals": {"ab": ab, "n1": sum(ab), "sq": sq, "N": sum(sq), "len": ln, "ninf": max(ab)}}
    if lv == 2:
        A = Mt(q["A"])
        sq = [e * e for e in flat(q["A"])]
        N = sum(sq)
        assert A.norm("fro") ** 2 == N == (A.T * A).trace()
        k, s = sqf(N)
        return {"answer": float(sp.sqrt(N)), "vals": {"sq": sq, "N": N, "k": k, "s": s}}
    A = Mt(q["A"])
    eps = pf(q["eps"])
    t, dt, l1, l2 = char2(q["A"])
    sv = sing_vals(A)
    kap = sv[0] / sv[-1]
    assert kap.is_integer
    big, small = max(abs(l1), abs(l2)), min(abs(l1), abs(l2))
    assert big == sv[0] and small == sv[-1]
    bound = eps * int(kap)
    return {"answer": bound, "vals": {"t": t, "dt": dt, "l1": l1, "l2": l2, "big": big, "small": small, "kap": int(kap), "eps": eps, "bound": bound}}


def grad_at(f, at):
    return [fq(sp.diff(f, s).subs({X: at[0], Y: at[1]})) for s in (X, Y)]


def la_17(p):
    q, lv = p["params"], p["level"]
    xv = sp.Matrix([X, Y])
    if lv == 1:
        x0 = q["x0"]
        if q["kind"] == 0:
            a = q["a"]
            g = grad_at(a[0] * X + a[1] * Y + X ** 2 + Y ** 2, x0)
            return {"answer": g, "vals": {"tx": [2 * e for e in x0], "g": g}}
        A = Mt(q["A"])
        g = grad_at((xv.T * A * xv)[0], x0)
        return {"answer": g, "vals": {"Ax": vlist(A * Vc(x0)), "g": g}}
    if lv == 2:
        A, b, x0 = Mt(q["A"]), q["b"], q["x0"]
        g = grad_at((xv.T * A * xv)[0] + b[0] * X + b[1] * Y, x0)
        S = A + A.T
        return {"answer": g, "vals": {"S": tolist(S), "Sx": vlist(S * Vc(x0)), "g": g}}
    a, h, c, b2, k = q["a"], q["h"], q["c"], q["b2"], q["k"]
    f = a * X ** 2 + 2 * h * X * Y + c * Y ** 2 + b2[0] * X + b2[1] * Y + k
    sol = sp.solve([sp.diff(f, X), sp.diff(f, Y)], [X, Y], dict=True)
    assert len(sol) == 1
    s = [fq(sol[0][X]), fq(sol[0][Y])]
    assert sp.hessian(f, (X, Y)).is_positive_definite and all(isint(e) for e in s)
    b = [F(-b2[0], 2), F(-b2[1], 2)]
    return {"answer": s, "vals": {"b": b, "h2": 2 * h, "Dt": a * c - h * h, "n1": b[0] * c - h * b[1], "n2": a * b[1] - h * b[0], "sol": s}}


def la_18(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a = q["a"]
        ap = vlist(Vc(a).pinv().T)
        sq = [e * e for e in a]
        return {"answer": ap, "vals": {"sq": sq, "aa": sum(sq), "ap": ap}}
    if lv == 2:
        A = Mt(q["A"])
        G = A.T * A
        Ap = A.pinv()
        assert Ap == G.inv() * A.T and G.is_diagonal() and Ap * A == sp.eye(2)
        return {"answer": flat(tolist(Ap)), "vals": {"G": tolist(G), "Gi": tolist(G.inv()), "Ap": tolist(Ap)}}
    A, u, v = Mt(q["A"]), Vc(q["u"]), Vc(q["v"])
    Ai = A.inv()
    w, zt = Ai * u, Ai.T * v
    vw = (v.T * w)[0]
    den = 1 + vw
    assert den != 0
    res = (A + u * v.T).inv()
    O = w * zt.T
    assert res == Ai - O / den
    return {"answer": flat(tolist(res)), "vals": {"Ai": tolist(Ai), "w": vlist(w), "zt": vlist(zt), "vw": fq(vw), "den": fq(den), "O": tolist(O), "res": tolist(res)}}


VERIFY = {
    "LA.vec-basics": vec_basics, "LA.1": la_1, "LA.dot": la_dot, "LA.projection": la_projection, "LA.cross-product": la_cross,
    "LA.subspace": la_subspace, "LA.2": la_2, "LA.3": la_3, "LA.4": la_4, "LA.matmul": la_matmul, "LA.14": la_14, "LA.16": la_16,
    "LA.det": la_det, "LA.det-props": la_det_props, "LA.inverse": la_inverse, "LA.15": la_15, "LA.5": la_5, "LA.lu": la_lu,
    "LA.6": la_6, "LA.7": la_7, "LA.8": la_8, "LA.orthogonal": la_orthogonal, "LA.9": la_9, "LA.eig-props": la_eig_props,
    "LA.10": la_10, "LA.markov": la_markov, "LA.11": la_11, "LA.12": la_12, "LA.13": la_13, "LA.17": la_17, "LA.18": la_18,
}
