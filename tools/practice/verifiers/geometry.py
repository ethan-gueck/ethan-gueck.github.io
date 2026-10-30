"""Independent answers for practice/geometry.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]), and asserts what the problem
promises (a real triangle, integer answers, points on the circle, the classification claimed). Exact
Fractions and SymPy (geometry objects, exact trigonometry, solve); nothing here is copied from the
JavaScript."""
from fractions import Fraction as F
from math import comb, gcd, isqrt

import sympy as sp

X, Y = sp.symbols("x y")
PI = sp.pi


def fr(q):
    q = F(q)
    return {"n": q.numerator, "d": q.denominator}


def F_(v):  # a {n, d} param back to a Fraction
    return F(v["n"], v["d"]) if isinstance(v, dict) else F(v)


def fl(e):
    return float(sp.N(e, 30))


def solve1(lhs, rhs):
    """The single solution of a linear equation in x."""
    sol = sp.solve(sp.Eq(lhs, rhs), X)
    assert len(sol) == 1, sol
    return sol[0]


def as_int(v):
    v = sp.radsimp(sp.simplify(v))
    assert v.is_integer, f"{v} is not an integer"
    return int(v)


def collect(a, b, c, d):
    """a x + b = c x + d written with x on the side of the larger coefficient: (k, rhs)."""
    assert a != c
    return (a - c, d - b) if a > c else (c - a, b - d)


def root_split(N):
    """√N = k√s with s square-free (SymPy does the simplifying)."""
    e = sp.sqrt(N)
    k, rest = e.as_coeff_Mul()
    s = 1 if rest == 1 else int(rest ** 2)
    assert k ** 2 * s == N
    return int(k), s


def tri_ok(a, b, c):
    a, b, c = sorted((a, b, c))
    return a > 0 and a + b > c


def ang_between(u, v):
    """Angle between two vectors in degrees (SymPy, exact where possible)."""
    u, v = sp.Matrix(u), sp.Matrix(v)
    return sp.deg(sp.acos(u.dot(v) / (u.norm() * v.norm())))


# ---- G.1 --------------------------------------------------------------------------------------------
def points_lines(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["whole"]:
            return {"answer": q["a"] + q["b"], "vals": {"ac": q["a"] + q["b"]}}
        b = q["ac"] - q["a"]
        assert b > 0
        return {"answer": b, "vals": {"b": b}}
    if lv == 2:
        P_, Q_, R_, S_ = q["p"], q["q"], q["r"], q["s"]
        if not q["mid"]:
            x = as_int(solve1(P_ * X + Q_ + R_ * X + S_, q["AC"]))
            AB, BC = P_ * x + Q_, R_ * x + S_
            assert AB > 0 and BC > 0 and AB + BC == q["AC"]
            return {"answer": BC, "vals": {"X": x, "k": P_ + R_, "qs": Q_ + S_, "rhs": q["AC"] - Q_ - S_, "AB": AB, "BC": BC}}
        x = as_int(solve1(P_ * X + Q_, R_ * X + S_))
        AM = P_ * x + Q_
        assert AM > 0 and P_ > R_
        return {"answer": 2 * AM, "vals": {"X": x, "k": P_ - R_, "rhs": S_ - Q_, "AM": AM, "AC": 2 * AM}}
    x1, y1, x2, y2, x3 = (q[k] for k in ("x1", "y1", "x2", "y2", "x3"))
    K = sp.Symbol("K")
    k = sp.solve(sp.Matrix([[x1, y1, 1], [x2, y2, 1], [x3, K, 1]]).det(), K)
    assert len(k) == 1
    k = as_int(k[0])
    assert sp.Point(x1, y1).is_collinear(sp.Point(x2, y2), sp.Point(x3, k))
    dx, dy = x2 - x1, y2 - y1
    assert dy % dx != 0
    return {"answer": k, "vals": {"dx": dx, "dy": dy, "m": fr(F(dy, dx)), "d3": x3 - x1, "prod": k - y1, "k": k}}


# ---- G.2 --------------------------------------------------------------------------------------------
def angle_types(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        th = q["th"]
        kind = 0 if th < 90 else 1 if th == 90 else 2 if th < 180 else 3 if th == 180 else 4
        assert 0 < th < 360
        return {"answer": kind, "vals": {"kind": kind, "rest": 360 - th}}
    if lv == 2:
        P_, Q_, R_, S_ = q["p"], q["q"], q["r"], q["s"]
        if q["bis"]:
            x = as_int(solve1(P_ * X + Q_, R_ * X + S_))
            a1 = P_ * x + Q_
            ck, crhs = collect(P_, Q_, R_, S_)
            assert 0 < 2 * a1 < 180
            return {"answer": 2 * a1, "vals": {"X": x, "ck": ck, "crhs": crhs, "a1": a1, "total": 2 * a1}}
        x = as_int(solve1(P_ * X + Q_ + R_ * X + S_, q["total"]))
        a1, a2 = P_ * x + Q_, R_ * x + S_
        assert a1 > 0 and a2 > 0 and a1 + a2 == q["total"] < 180
        return {"answer": a1, "vals": {"X": x, "k": P_ + R_, "qs": Q_ + S_, "rhs": q["total"] - Q_ - S_, "a1": a1, "a2": a2}}
    h, m = q["h"], q["m"]
    minute = F(360, 60) * m                       # degrees clockwise from 12
    hour = F(360, 12) * (h % 12) + F(30, 60) * m
    diff = abs(hour - minute)
    small = min(diff, 360 - diff)
    alt = abs(F(30) * (h % 12) - F(11, 2) * m) % 360   # the textbook formula |30H − 5.5M|
    assert small == min(alt, 360 - alt)
    assert 0 < small < 180
    ans = 360 - small if q["reflex"] else small
    return {"answer": ans, "vals": {"minA": minute, "H": h % 12, "H30": 30 * (h % 12), "half": F(m, 2), "hourA": hour, "diff": diff, "small": small, "ans": ans}}


# ---- G.3 --------------------------------------------------------------------------------------------
def transversal_angle(k, phi):
    """Angle k (1–4 at line ℓ, 5–8 at line m; clockwise from top left) when the transversal rises at φ."""
    up = [sp.cos(sp.rad(phi)), sp.sin(sp.rad(phi))]
    down = [-up[0], -up[1]]
    east, west = [1, 0], [-1, 0]
    rays = {1: (up, west), 2: (up, east), 3: (down, east), 4: (down, west)}[(k - 1) % 4 + 1]
    a = fl(ang_between(*rays))
    assert abs(a - round(a)) < 1e-9
    return round(a)


def angle_rel(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if "tot" in q:
            assert 0 < q["th"] < q["tot"]
            return {"answer": q["tot"] - q["th"], "vals": {"ans": q["tot"] - q["th"]}}
        ans = q["th"] if q["vert"] else 180 - q["th"]
        return {"answer": ans, "vals": {"ans": ans}}
    i, j = q["i"], q["j"]
    assert (i <= 4) != (j <= 4), "the pair spans the two parallel lines"
    if lv == 2:
        ai = q["ai"]
        # find the transversal's slope angle φ that gives angle i = ai, then measure angle j
        phi = ai if transversal_angle(i, 60) == 60 else 180 - ai
        assert transversal_angle(i, phi) == ai
        aj = transversal_angle(j, phi)
        return {"answer": int(aj), "vals": {"aj": int(aj)}}
    P_, Q_, R_, S_ = q["p"], q["q"], q["r"], q["s"]
    equal = transversal_angle(i, 70) == transversal_angle(j, 70)
    if equal:
        x = as_int(solve1(P_ * X + Q_, R_ * X + S_))
        ck, crhs = collect(P_, Q_, R_, S_)
        extra = {"ck": ck, "crhs": crhs}
    else:
        x = as_int(solve1(P_ * X + Q_ + R_ * X + S_, 180))
        extra = {"k": P_ + R_, "qs": Q_ + S_, "rhs": 180 - Q_ - S_}
    ai, aj = P_ * x + Q_, R_ * x + S_
    phi = ai if transversal_angle(i, 60) == 60 else 180 - ai
    assert 0 < phi < 180 and transversal_angle(j, phi) == aj
    return {"answer": aj, "vals": {"X": x, "ai": ai, "aj": aj, **extra}}


# ---- G.4 --------------------------------------------------------------------------------------------
def triangle_class(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        C = 180 - q["A"] - q["B"]
        assert C > 0
        mx = max(q["A"], q["B"], C)
        cls = 0 if mx < 90 else 1 if mx == 90 else 2
        return {"answer": cls, "vals": {"C": C, "mx": mx, "cls": cls}}
    if lv == 2:
        if "a" in q:
            a, b, c = q["a"], q["b"], q["c"]
            assert tri_ok(a, b, c) and len({a, b, c}) == 3
            # angles by the law of cosines
            angs = [sp.acos(sp.Rational(b * b + c * c - a * a, 2 * b * c)), sp.acos(sp.Rational(c * c + a * a - b * b, 2 * c * a)), sp.acos(sp.Rational(a * a + b * b - c * c, 2 * a * b))]
            big = max(range(3), key=lambda k: fl(angs[k]))
            return {"answer": big, "vals": {"big": big, "longest": max(a, b, c)}}
        if "apex" in q:
            beta = F(180 - q["apex"], 2)
            assert beta.denominator == 1 and 0 < beta < 90
            return {"answer": int(beta), "vals": {"rest": 180 - q["apex"], "beta": int(beta)}}
        apex = 180 - 2 * q["beta"]
        assert apex > 0
        return {"answer": apex, "vals": {"twob": 2 * q["beta"], "apex": apex}}
    if not q["back"]:
        s = F(q["P"], 3)
        assert s.denominator == 1
        area = sp.sqrt(3) / 4 * int(s) ** 2
        coef = area / sp.sqrt(3)
        assert coef.is_integer
        return {"answer": fl(area), "vals": {"s": int(s), "s2": int(s) ** 2, "area": int(coef)}}
    S = sp.Symbol("S", positive=True)
    s = sp.solve(sp.Eq(sp.sqrt(3) / 4 * S ** 2, q["area"] * sp.sqrt(3)), S)
    assert len(s) == 1
    s = as_int(s[0])
    return {"answer": 3 * s, "vals": {"s": s, "s2": s * s, "P": 3 * s}}


# ---- G.5 --------------------------------------------------------------------------------------------
def tri_sum(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if not q["tri"]:
            C = 180 - q["A"] - q["B"]
            assert C > 0
            return {"answer": C, "vals": {"C": C}}
        a, b, c = sorted((q["a"], q["b"], q["c"]))
        # a triangle exists exactly when all three strict inequalities hold
        ok = q["a"] < q["b"] + q["c"] and q["b"] < q["a"] + q["c"] and q["c"] < q["a"] + q["b"]
        return {"answer": "yes" if ok else "no", "vals": {"lo": a, "md": b, "hi": c, "sum": a + b}}
    if lv == 2:
        P_, Q_, R_, S_, T_, U_ = (q[k] for k in "pqrstu")
        x = as_int(solve1(T_ * X + U_, (P_ + R_) * X + Q_ + S_))
        A, B, ext = P_ * x + Q_, R_ * x + S_, T_ * x + U_
        assert A > 0 and B > 0 and ext == A + B and ext < 180
        ck, crhs = collect(T_, U_, P_ + R_, Q_ + S_)
        return {"answer": ext, "vals": {"k": P_ + R_, "qs": Q_ + S_, "ck": ck, "crhs": crhs, "X": x, "A": A, "B": B, "ext": ext}}
    a, b = q["a"], q["b"]
    ok = [c for c in range(1, a + b + 10) if tri_ok(a, b, c)]
    return {"answer": len(ok), "vals": {"diff": abs(a - b), "sum": a + b, "lo": min(ok), "hi": max(ok), "count": len(ok)}}


# ---- G.6 --------------------------------------------------------------------------------------------
def classify_parts(parts):
    sides = [k for k in parts if len(k) == 2]
    angs = [k for k in parts if len(k) == 1]
    if len(sides) == 3:
        return 0
    if len(sides) == 2 and len(angs) == 1:
        a = angs[0]
        if a in set(sides[0]) & set(sides[1]):
            return 1
        if parts[a] == 90 and any(a not in s for s in sides) and any(a in s for s in sides):
            return 4
        return 5
    if len(sides) == 1 and len(angs) == 2:
        return 2 if set(sides[0]) == set(angs) else 3
    return 5


def congruence(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        parts = q["parts"]
        idx = classify_parts(parts)
        sides = {k: v for k, v in parts.items() if len(k) == 2}
        angs = {k: v for k, v in parts.items() if len(k) == 1}
        if len(sides) == 3:
            assert tri_ok(*sides.values())
        if len(angs) >= 2:
            assert sum(angs.values()) < 180 or (len(angs) == 3 and sum(angs.values()) == 180)
        if idx == 4:
            hyp = [v for k, v in sides.items() if "C" not in k][0]
            leg = [v for k, v in sides.items() if "C" in k][0]
            assert hyp > leg
        if idx == 5 and len(sides) == 2:   # SSA: AB = c, BC = a, angle A; two triangles exist when c·sin A < a < c
            c, a, A = parts["AB"], parts["BC"], parts["A"]
            assert fl(c * sp.sin(sp.rad(A))) < a < c
        return {"answer": idx, "vals": {"idx": idx}}
    if lv == 2:
        idx = classify_parts(q["parts"])
        if q["kind"].startswith("kite"):
            assert isqrt(144 + q["ha"] ** 2) ** 2 == 144 + q["ha"] ** 2 and q["ha"] != q["hc"]
        if q["kind"] == "altHL":
            assert q["AB"] ** 2 == 144 + q["h"] ** 2
        return {"answer": idx, "vals": {"idx": idx}}
    perm = q["perm"]
    corr = dict(zip("ABC", perm))
    P_, Q_, R_, S_ = q["p"], q["q"], q["r"], q["s"]
    x = as_int(solve1(P_ * X + Q_, R_ * X + S_))
    ck, crhs = collect(P_, Q_, R_, S_)
    if q["ang"]:
        A = P_ * x + Q_
        C = 180 - A - q["B"]
        assert A > 0 and C > 0
        assert corr["C"] == perm[2]          # the angle asked for is C's partner
        return {"answer": C, "vals": {"X": x, "ck": ck, "crhs": crhs, "A": A, "C": C}}
    AB = P_ * x + Q_
    assert tri_ok(AB, q["BC"], q["CA"])
    per = AB + q["BC"] + q["CA"]
    return {"answer": per, "vals": {"X": x, "ck": ck, "crhs": crhs, "AB": AB, "per": per}}


# ---- G.7 --------------------------------------------------------------------------------------------
def pythag(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b = q["a"], q["b"]
        c = as_int(sp.sqrt(a * a + b * b))
        return {"answer": c, "vals": {"aa": a * a, "bb": b * b, "cc": c * c, "c": c}}
    if lv == 2:
        if q["kind"] == "leg":
            a, c = q["a"], q["c"]
            b = as_int(sp.sqrt(c * c - a * a))
            return {"answer": b, "vals": {"aa": a * a, "bb": b * b, "cc": c * c, "b": b}}
        if q["kind"] == "root":
            a, b = q["a"], q["b"]
            N = a * a + b * b
            k, s = root_split(N)
            assert s > 1
            return {"answer": fl(sp.sqrt(N)), "vals": {"aa": a * a, "bb": b * b, "N": N, "k": k, "kk": k * k, "s": s}}
        m, n = q["m"], q["n"]
        a, b, c = m * m - n * n, 2 * m * n, m * m + n * n
        assert a * a + b * b == c * c and m > n > 0
        return {"answer": [a, b, c], "vals": {"mm": m * m, "nn2": n * n, "a": a, "b": b, "c": c, "aa": a * a, "bb": b * b, "cc": c * c}}
    if q["kind"] == "ladder":
        L, d = q["L"], q["d"]
        h = as_int(sp.sqrt(L * L - d * d))
        return {"answer": h, "vals": {"LL": L * L, "dd": d * d, "hh": h * h, "h": h}}
    if q["kind"] == "screen":
        w, h = q["w"], q["h"]
        d = as_int(sp.sqrt(w * w + h * h))
        return {"answer": d, "vals": {"ww": w * w, "hh": h * h, "dd": d * d, "d": d}}
    a, b, c = sorted((q["a"], q["b"], q["c"]))
    assert tri_ok(a, b, c)
    cosC = sp.Rational(a * a + b * b - c * c, 2 * a * b)       # law of cosines for the largest angle
    idx = 0 if cosC > 0 else 1 if cosC == 0 else 2
    return {"answer": idx, "vals": {"cc": c * c, "aa": a * a, "bb": b * b, "lhs": a * a + b * b, "idx": idx}}


# ---- G.8 --------------------------------------------------------------------------------------------
def special_right(p):
    q, lv = p["params"], p["level"]
    s30, s45, s60 = sp.sin(sp.pi / 6), sp.sin(sp.pi / 4), sp.sin(sp.pi / 3)
    if lv == 1:
        k = q["k"]
        if q["kind"] == "45":
            return {"answer": fl(k / s45), "vals": {"k": k}}
        hyp = k / s30                                  # short leg = hyp · sin 30°
        assert hyp == 2 * k
        ans = hyp if q["kind"] == "30hyp" else hyp * s60
        return {"answer": fl(ans), "vals": {"k": k, "h": 2 * k}}
    if lv == 2:
        if q["kind"] == "45hyp":
            leg = q["h"] * s45
            k = sp.radsimp(leg / sp.sqrt(2))
            return {"answer": fl(leg), "vals": {"k": as_int(k)}}
        if q["kind"] == "30long":
            hyp = q["k"] * sp.sqrt(3) / s60
            return {"answer": as_int(hyp), "vals": {"h": as_int(hyp)}}
        short = q["h"] * s30
        return {"answer": fl(q["h"] * s60), "vals": {"k": as_int(short)}}
    if q["kind"] == "park":
        s = q["s"]
        diag = sp.sqrt(2 * s * s)
        save = 2 * s - diag
        return {"answer": fl(save), "vals": {"two": 2 * s, "approx": round(fl(save), 1)}}
    L = q["L"]
    h = L * s60                       # truss height (side·sin 60°) or ladder top (ladder·sin 60°)
    return {"answer": fl(h), "vals": {"k": as_int(h / sp.sqrt(3))}}


# ---- G.9 --------------------------------------------------------------------------------------------
def scale(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, c = q["a"], q["b"], q["c"]
        assert tri_ok(a, b, c)
        k = F(q["DE"], a)
        ans = k * (b if q["ask"] == "BC" else c)
        assert ans.denominator == 1
        return {"answer": int(ans), "vals": {"DE": q["DE"], "k": fr(k), "ans": int(ans)}}
    if lv == 2:
        if q["kind"] == "area":
            k = F(q["s2"], q["s1"])
            A2 = q["A1"] * k * k
            assert A2.denominator == 1
            return {"answer": int(A2), "vals": {"k": fr(k), "k2": fr(k * k), "A2": int(A2)}}
        k2 = F(q["A2"], q["A1"])
        k = F(sp.sqrt(sp.Rational(k2.numerator, k2.denominator)))
        assert k * k == k2
        P2 = q["P1"] * k
        assert P2.denominator == 1
        return {"answer": int(P2), "vals": {"k": fr(k), "k2": fr(k2), "P2": int(P2)}}
    if q["kind"] == "vol":
        k = F(q["h2"], q["h1"])
        V2 = q["V1"] * k ** 3
        assert V2.denominator == 1
        return {"answer": int(V2), "vals": {"k": fr(k), "k3": fr(k ** 3), "V2": int(V2)}}
    k3 = F(q["V2"], q["V1"])
    num, den = sp.integer_nthroot(k3.numerator, 3), sp.integer_nthroot(k3.denominator, 3)
    assert num[1] and den[1]
    k = F(int(num[0]), int(den[0]))
    S2 = q["S1"] * k * k
    assert S2.denominator == 1
    return {"answer": int(S2), "vals": {"k": fr(k), "k3": fr(k3), "k2": fr(k * k), "S2": int(S2), "qqq": k.numerator ** 3, "ppp": k.denominator ** 3}}


# ---- G.10 -------------------------------------------------------------------------------------------
def similarity(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        t = F(q["s2"], q["s1"])
        H = q["h1"] * t
        assert H.denominator == 1 and t.denominator == 1
        return {"answer": int(H), "vals": {"t": int(t), "H": int(H)}}
    if lv == 2:
        if q["kind"] == "splitter":
            a, b, c = q["a"], q["b"], q["c"]
            ec = F(c * b, a)
            assert ec.denominator == 1
            # D, E at the same fraction of AB and AC: DE ∥ BC (checked with coordinates)
            A, B, C = sp.Point(0, 7), sp.Point(-3, 0), sp.Point(10, 0)
            f = sp.Rational(a, a + b)
            D, E = A + (B - A) * f, A + (C - A) * sp.Rational(c, c + int(ec))
            assert sp.Line(D, E).is_parallel(sp.Line(B, C))
            return {"answer": int(ec), "vals": {"num": c * b, "ec": int(ec)}}
        AB, AC, m = q["AB"], q["AC"], q["m"]
        dc = F(m * AC, AB)
        assert dc.denominator == 1
        BC = m + int(dc)
        assert tri_ok(AB, AC, BC)
        # the bisector of A, built with SymPy, meets BC at distance m from B
        A = sp.Point(0, 0)
        Bp = sp.Point(AB, 0)
        cx = sp.Rational(AC * AC + AB * AB - BC * BC, 2 * AB)
        Cp = sp.Point(cx, sp.sqrt(AC * AC - cx * cx))
        bis = sp.Line(A, A + (Bp - A) / AB + (Cp - A) / AC)
        D = bis.intersection(sp.Line(Bp, Cp))[0]
        assert sp.simplify(Bp.distance(D) - m) == 0
        return {"answer": int(dc), "vals": {"num": m * AC, "dc": int(dc)}}
    if q["kind"] == "fwd":
        pp, qq = q["p"], q["q"]
        N = pp * qq
        h = sp.sqrt(N)
        # right angle at C = (p, h) over A = (0, 0), B = (p + q, 0)
        assert sp.simplify((sp.Matrix([-pp, -h])).dot(sp.Matrix([qq, -h]))) == 0
        k, s = root_split(N)
        return {"answer": fl(h), "vals": {"N": N, "k": k, "kk": k * k, "s": s}}
    k, pp = q["k"], q["p"]
    qq = F(k * k, pp)
    assert qq.denominator == 1
    return {"answer": int(qq), "vals": {"N": k * k, "q": int(qq)}}


# ---- G.11 -------------------------------------------------------------------------------------------
def centers(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        T = sp.Triangle(*[sp.Point(*v) for v in q["pts"]])
        G = T.centroid
        gx, gy = as_int(G.x), as_int(G.y)
        return {"answer": [gx, gy], "vals": {"sx": 3 * gx, "sy": 3 * gy, "gx": gx, "gy": gy}}
    if lv == 2:
        if q["kind"] == "inr":
            a, b, c = q["a"], q["b"], q["c"]
            T = sp.Triangle(sp.Point(0, 0), sp.Point(a, 0), sp.Point(0, b))
            assert sp.Point(a, 0).distance(sp.Point(0, b)) == c
            rin = as_int(T.inradius)
            area = F(a * b, 2)
            return {"answer": rin, "vals": {"area": area, "per": a + b + c, "s": F(a + b + c, 2), "rin": rin}}
        if q["kind"] == "circR":
            a, b, c, K = q["a"], q["b"], q["c"], q["K"]
            s = sp.Rational(a + b + c, 2)
            assert sp.sqrt(s * (s - a) * (s - b) * (s - c)) == K       # the stated area is right
            cosA = sp.Rational(b * b + c * c - a * a, 2 * b * c)
            R = sp.radsimp(sp.simplify(a / (2 * sp.sqrt(1 - cosA ** 2))))
            assert R.is_Rational       # law of sines: a = 2R sin A
            Rf = F(int(sp.fraction(R)[0]), int(sp.fraction(R)[1]))
            assert Rf == F(a * b * c, 4 * K)
            return {"answer": float(Rf), "vals": {"abc": a * b * c, "K4": 4 * K, "R": fr(Rf)}}
        G, O = q["G"], q["O"]
        H = [3 * G[0] - 2 * O[0], 3 * G[1] - 2 * O[1]]
        # G divides HO with HG = 2 GO
        assert sp.Point(*G) == sp.Point(*H) + (sp.Point(*O) - sp.Point(*H)) * sp.Rational(2, 3)
        return {"answer": H, "vals": {"g3x": 3 * G[0], "g3y": 3 * G[1], "o2x": 2 * O[0], "o2y": 2 * O[1], "hx": H[0], "hy": H[1]}}
    A, B, C = q["pts"]
    T = sp.Triangle(sp.Point(*A), sp.Point(*B), sp.Point(*C))
    O = T.circumcenter
    h, k = as_int(O.x), as_int(O.y)
    assert T.circumradius == 5

    def eq(Q):
        a, b, c = 2 * (Q[0] - A[0]), 2 * (Q[1] - A[1]), Q[0] ** 2 + Q[1] ** 2 - A[0] ** 2 - A[1] ** 2
        g = gcd(gcd(a, b), c) or 1
        return a // g, b // g, c // g

    a1, b1, c1 = eq(B)
    a2, b2, c2 = eq(C)
    det = a1 * b2 - a2 * b1
    assert sp.Matrix([[a1, b1], [a2, b2]]).solve(sp.Matrix([c1, c2])) == sp.Matrix([h, k])
    return {"answer": [h, k], "vals": {"a1": a1, "b1": b1, "c1": c1, "a2": a2, "b2": b2, "c2": c2, "det": det, "nx": c1 * b2 - c2 * b1, "ny": a1 * c2 - a2 * c1,
                                       "h": h, "k": k, "dax": A[0] - h, "day": A[1] - k}}


# ---- G.12 -------------------------------------------------------------------------------------------
def dist_mid(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        M = sp.Segment(sp.Point(q["x1"], q["y1"]), sp.Point(q["x2"], q["y2"])).midpoint
        mx, my = as_int(M.x), as_int(M.y)
        return {"answer": [mx, my], "vals": {"sx": q["x1"] + q["x2"], "sy": q["y1"] + q["y2"], "mx": mx, "my": my}}
    if lv == 2:
        d = sp.Point(q["x1"], q["y1"]).distance(sp.Point(q["x2"], q["y2"]))
        dx, dy = q["x2"] - q["x1"], q["y2"] - q["y1"]
        N = dx * dx + dy * dy
        k, s = root_split(N)
        assert sp.simplify(d - k * sp.sqrt(s)) == 0
        return {"answer": fl(d), "vals": {"dx": dx, "dy": dy, "dxx": dx * dx, "dyy": dy * dy, "N": N, "k": k, "kk": k * k, "s": s}}
    kind = q["kind"]
    if kind == "endpoint":
        Bx, By = sp.symbols("Bx By")
        sol = sp.solve([sp.Eq((q["ax"] + Bx) / 2, q["mx"]), sp.Eq((q["ay"] + By) / 2, q["my"])], [Bx, By])
        bx, by = as_int(sol[Bx]), as_int(sol[By])
        return {"answer": [bx, by], "vals": {"mx2": 2 * q["mx"], "my2": 2 * q["my"], "bx": bx, "by": by}}
    if kind == "section":
        A, B = sp.Point(q["ax"], q["ay"]), sp.Point(q["bx"], q["by"])
        m, n = q["m"], q["n"]
        P_ = A + (B - A) * sp.Rational(m, m + n)
        assert sp.simplify(A.distance(P_) / P_.distance(B) - sp.Rational(m, n)) == 0
        px, py = as_int(P_.x), as_int(P_.y)
        return {"answer": [px, py], "vals": {"mn": m + n, "tx": px * (m + n), "ty": py * (m + n), "px": px, "py": py}}
    if kind == "space":
        pp, qq = q["p"], q["q"]
        d = sp.Point3D(*pp).distance(sp.Point3D(*qq))
        D = as_int(d)
        ds = [b - a for a, b in zip(pp, qq)]
        return {"answer": D, "vals": {"d0": ds[0], "d1": ds[1], "d2": ds[2], "s0": ds[0] ** 2, "s1": ds[1] ** 2, "s2": ds[2] ** 2, "S": D * D, "D": D}}
    a, b = q["a"], q["b"]
    c = as_int(sp.Point(0, 0).distance(sp.Point(a, b)))
    return {"answer": a + b - c, "vals": {"d1": a + b, "cc": c * c, "c": c, "diff": a + b - c}}


# ---- G.13 -------------------------------------------------------------------------------------------
def polygons(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        n = q["n"]
        S = (n - 2) * 180
        assert sp.Polygon(*[sp.Point(sp.cos(2 * sp.pi * i / n), sp.sin(2 * sp.pi * i / n)) for i in range(n)]).is_convex() if n <= 8 else True
        if not q["each"]:
            return {"answer": S, "vals": {"t": n - 2, "S": S}}
        each = sp.deg(sp.RegularPolygon(sp.Point(0, 0), 1, n).interior_angle)
        assert each == F(S, n)
        return {"answer": int(each), "vals": {"t": n - 2, "S": S, "each": int(each)}}
    if lv == 2:
        if q["kind"] == "diag":
            n = q["n"]
            d = comb(n, 2) - n                # all pairs of vertices minus the sides
            return {"answer": d, "vals": {"k3": n - 3, "prod": n * (n - 3), "d": d}}
        if q["kind"] == "ext":
            k = F(360, q["e"])
            assert k.denominator == 1
            return {"answer": int(k), "vals": {"k": int(k)}}
        e = 180 - q["i"]
        k = F(360, e)
        assert k.denominator == 1 and sp.deg(sp.RegularPolygon(sp.Point(0, 0), 1, int(k)).interior_angle) == q["i"]
        return {"answer": int(k), "vals": {"e": e, "k": int(k)}}
    if q["kind"] == "diag":
        D = q["D"]
        N = sp.Symbol("N")
        sols = [s for s in sp.solve(sp.Eq(N * (N - 3) / 2, D), N) if s > 0]
        assert len(sols) == 1
        k = as_int(sols[0])
        disc = 9 + 8 * D
        sd = isqrt(disc)
        assert sd * sd == disc
        return {"answer": k, "vals": {"D2": 2 * D, "disc": disc, "sd": sd, "top": 3 + sd, "k": k, "k3": k - 3}}
    n, angs = q["n"], q["angs"]
    S = (n - 2) * 180
    assert len(angs) == n - 2
    rest = S - sum(angs)
    xe = F(rest, 2)
    assert xe.denominator == 1 and all(0 < a < 180 for a in angs + [int(xe)])
    return {"answer": int(xe), "vals": {"S": S, "ksum": sum(angs), "rest": rest, "xe": int(xe), "k2": n - 2}}


# ---- G.14 -------------------------------------------------------------------------------------------
def quads(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a = q["a"]
        A, B = sp.Point(0, 0), sp.Point(6, 0)
        D = sp.Point(sp.cos(sp.rad(a)), sp.sin(sp.rad(a))) * 3
        C = B + D
        vtx = {"B": (B, A, C), "C": (C, B, D), "D": (D, C, A)}[q["ask"]]
        ans = sp.nsimplify(sp.simplify(ang_between(vtx[1] - vtx[0], vtx[2] - vtx[0])))
        ans = round(fl(ans))
        assert ans == (a if q["ask"] == "C" else 180 - a)
        return {"answer": ans, "vals": {"ans": ans}}
    if lv == 2:
        kind = q["kind"]
        if kind == "mid":
            if q["back"]:
                b2 = 2 * q["m"] - q["b1"]
                assert b2 > 0 and F(q["b1"] + b2, 2) == q["m"]
                return {"answer": b2, "vals": {"m2": 2 * q["m"], "b2": b2}}
            m = F(q["b1"] + q["b2"], 2)
            assert m.denominator == 1
            return {"answer": int(m), "vals": {"sum": q["b1"] + q["b2"], "m": int(m)}}
        P_, Q_, R_, S_ = q["p"], q["q"], q["r"], q["s"]
        x = as_int(solve1(P_ * X + Q_, R_ * X + S_))
        L = P_ * x + Q_
        assert L > 0
        ck, crhs = collect(P_, Q_, R_, S_)
        if kind == "bisect":
            return {"answer": 2 * L, "vals": {"ck": ck, "crhs": crhs, "X": x, "L": L, "AC": 2 * L}}
        return {"answer": L, "vals": {"ck": ck, "crhs": crhs, "X": x, "L": L}}
    kind = q["kind"]
    if kind == "rhombus":
        d1, d2 = q["d1"], q["d2"]
        rh = sp.Polygon(sp.Point(-d1 / 2, 0), sp.Point(0, -d2 / 2), sp.Point(d1 / 2, 0), sp.Point(0, d2 / 2))
        side = as_int(rh.sides[0].length)
        assert as_int(rh.perimeter) == 4 * side
        a, b = d1 // 2, d2 // 2
        return {"answer": 4 * side, "vals": {"a": a, "b": b, "aa": a * a, "bb": b * b, "cc": side * side, "c": side, "per": 4 * side}}
    if kind == "kite":
        a1, a2, b = q["a1"], q["a2"], q["b"]
        K = sp.Polygon(sp.Point(0, a1), sp.Point(-b, 0), sp.Point(0, -a2), sp.Point(b, 0))
        h1, h2 = as_int(sp.Point(0, a1).distance(sp.Point(-b, 0))), as_int(sp.Point(0, -a2).distance(sp.Point(-b, 0)))
        per = as_int(K.perimeter)
        return {"answer": per, "vals": {"a1a1": a1 * a1, "bb": b * b, "a2a2": a2 * a2, "h1": h1, "h2": h2, "per": per}}
    P_, Q_, R_, S_, T_, U_ = (q[k] for k in "pqrstu")
    x = as_int(solve1(T_ * X + U_, ((P_ + R_) * X + Q_ + S_) / 2))
    b1, b2, m = P_ * x + Q_, R_ * x + S_, T_ * x + U_
    assert b1 > 0 and b2 > 0 and 2 * m == b1 + b2
    ck, crhs = collect(2 * T_, 2 * U_, P_ + R_, Q_ + S_)
    return {"answer": m, "vals": {"t2": 2 * T_, "u2": 2 * U_, "pr": P_ + R_, "qs": Q_ + S_, "ck": ck, "crhs": crhs, "X": x, "b1": b1, "b2": b2, "m": m}}


# ---- G.15 -------------------------------------------------------------------------------------------
def area(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        b, h = q["b"], q["h"]
        if q["kind"] == "tri":
            A = abs(sp.Triangle(sp.Point(0, 0), sp.Point(b, 0), sp.Point(1, h)).area)
            Af = F(int(sp.fraction(A)[0]), int(sp.fraction(A)[1]))
            return {"answer": float(Af), "vals": {"bh": b * h, "A": fr(Af)}}
        shift = 0 if q["kind"] == "rect" else 3
        A = as_int(abs(sp.Polygon(sp.Point(0, 0), sp.Point(b, 0), sp.Point(b + shift, h), sp.Point(shift, h)).area))
        return {"answer": A, "vals": {"A": A}}
    if lv == 2:
        if q["kind"] == "trap":
            b1, b2, h = q["b1"], q["b2"], q["h"]
            A = as_int(abs(sp.Polygon(sp.Point(0, 0), sp.Point(b1, 0), sp.Point(1 + b2, h), sp.Point(1, h)).area))
            return {"answer": A, "vals": {"sum": b1 + b2, "A": A}}
        d1, d2 = q["d1"], q["d2"]
        A = as_int(abs(sp.Polygon(sp.Point(-sp.Rational(d1, 2), 0), sp.Point(0, -sp.Rational(d2, 3)), sp.Point(sp.Rational(d1, 2), 0), sp.Point(0, sp.Rational(2 * d2, 3))).area))
        return {"answer": A, "vals": {"prod": d1 * d2, "A": A}}
    kind = q["kind"]
    if kind == "gable":
        w, h, t, ww, wh = (q[k] for k in ("w", "h", "t", "ww", "wh"))
        wall = abs(sp.Polygon(sp.Point(0, 0), sp.Point(w, 0), sp.Point(w, h), sp.Point(sp.Rational(w, 2), h + t), sp.Point(0, h)).area)
        paint = as_int(wall - ww * wh)
        return {"answer": paint, "vals": {"rect": w * h, "triA": as_int(sp.Rational(w * t, 2)), "win": ww * wh, "paint": paint}}
    if kind == "ell":
        W, H, cw, ch = q["W"], q["H"], q["cw"], q["ch"]
        A = as_int(abs(sp.Polygon(sp.Point(0, 0), sp.Point(W, 0), sp.Point(W, H - ch), sp.Point(W - cw, H - ch), sp.Point(W - cw, H), sp.Point(0, H)).area))
        return {"answer": A, "vals": {"big": W * H, "cut": cw * ch, "A": A}}
    s = q["s"]
    hexa = sp.RegularPolygon(sp.Point(0, 0), s, 6)          # circumradius = side for a hexagon
    assert hexa.length == s
    A = sp.simplify(hexa.area)
    coef = A / sp.sqrt(3)
    assert sp.simplify(hexa.apothem - sp.Rational(s, 2) * sp.sqrt(3)) == 0
    return {"answer": fl(A), "vals": {"k": s // 2, "per": 6 * s, "coef": as_int(coef)}}


# ---- G.16 -------------------------------------------------------------------------------------------
def heron(p):
    q, lv = p["params"], p["level"]

    def heron_parts(a, b, c):
        assert tri_ok(a, b, c)
        s = F(a + b + c, 2)
        assert s.denominator == 1
        s = int(s)
        prod = s * (s - a) * (s - b) * (s - c)
        A = as_int(sp.sqrt(prod))
        # cross-check with coordinates
        cx = sp.Rational(b * b + c * c - a * a, 2 * c)
        T = sp.Triangle(sp.Point(0, 0), sp.Point(c, 0), sp.Point(cx, sp.sqrt(b * b - cx * cx)))
        assert sp.simplify(abs(T.area) - A) == 0
        return s, prod, A

    if lv == 1:
        a, b, C = q["a"], q["b"], q["C"]
        A = sp.Rational(1, 2) * a * b * sp.sin(sp.rad(C))
        assert A.is_rational
        Af = F(int(sp.fraction(A)[0]), int(sp.fraction(A)[1]))
        return {"answer": float(Af), "vals": {"A": fr(Af)}}
    if lv == 2:
        a, b, c = q["a"], q["b"], q["c"]
        s, prod, A = heron_parts(a, b, c)
        return {"answer": A, "vals": {"per": a + b + c, "s": s, "sa": s - a, "sb": s - b, "sc": s - c, "prod": prod, "A": A}}
    kind = q["kind"]
    if kind == "shoelace":
        (x1, y1), (x2, y2), (x3, y3) = q["pts"]
        A = abs(sp.Triangle(sp.Point(x1, y1), sp.Point(x2, y2), sp.Point(x3, y3)).area)
        Af = F(int(sp.fraction(A)[0]), int(sp.fraction(A)[1]))
        t1, t2, t3 = x1 * (y2 - y3), x2 * (y3 - y1), x3 * (y1 - y2)
        return {"answer": float(Af), "vals": {"t1": t1, "t2": t2, "t3": t3, "S": t1 + t2 + t3, "A": fr(Af)}}
    if kind == "inradius":
        a, b, c = q["a"], q["b"], q["c"]
        s, prod, A = heron_parts(a, b, c)
        cx = sp.Rational(b * b + c * c - a * a, 2 * c)
        rin = sp.Triangle(sp.Point(0, 0), sp.Point(c, 0), sp.Point(cx, sp.sqrt(b * b - cx * cx))).inradius
        rf = F(A, s)
        assert sp.simplify(rin - sp.Rational(rf.numerator, rf.denominator)) == 0
        return {"answer": float(rf), "vals": {"per": a + b + c, "s": s, "sa": s - a, "sb": s - b, "sc": s - c, "prod": prod, "A": A, "rin": fr(rf)}}
    a, b, C = q["a"], q["b"], q["C"]
    A = sp.Rational(1, 2) * a * b * sp.sin(sp.rad(C))
    rt = 2 if C in (45, 135) else 3
    coef = sp.radsimp(sp.simplify(A / sp.sqrt(rt)))
    assert coef.is_rational
    return {"answer": fl(A), "vals": {"rt": rt, "ab": a * b, "coef": fr(F(int(sp.fraction(coef)[0]), int(sp.fraction(coef)[1]))), "sup": 180 - C}}


# ---- G.17 -------------------------------------------------------------------------------------------
def circles(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        rad = q["rad"] if "rad" in q else F(q["d"], 2)
        assert F(rad).denominator == 1
        rad = int(rad)
        c = sp.Circle(sp.Point(0, 0), rad)
        if q["area"]:
            A = c.area / PI
            return {"answer": fl(c.area), "vals": {"rad": rad, "A": as_int(A)}}
        return {"answer": fl(c.circumference), "vals": {"C": as_int(c.circumference / PI)}}
    if lv == 2:
        rad = q["rad"]
        if q["rads"]:
            th = F_(q["th"])
            t = sp.Rational(th.numerator, th.denominator) * PI
            res = (sp.Rational(1, 2) * rad ** 2 * t) if q["sector"] else rad * t
            rq = res / PI
            return {"answer": fl(res), "vals": {"rr": rad * rad, "res": fr(F(int(sp.fraction(rq)[0]), int(sp.fraction(rq)[1]))), "th": fr(th)}}
        th = q["th"]
        frac = F(th, 360)
        res = frac * (rad * rad if q["sector"] else 2 * rad)
        # the same through radians: s = rθ, A = ½r²θ
        t = sp.rad(th)
        alt = sp.Rational(1, 2) * rad ** 2 * t if q["sector"] else rad * t
        assert sp.simplify(alt - sp.Rational(res.numerator, res.denominator) * PI) == 0
        return {"answer": fl(alt), "vals": {"f": fr(frac), "whole": rad * rad if q["sector"] else 2 * rad, "res": fr(res)}}
    kind = q["kind"]
    if kind == "segment":
        rad, th = q["rad"], q["th"]
        t = sp.rad(th)
        seg = sp.Rational(1, 2) * rad ** 2 * (t - sp.sin(t))
        sec = F(th * rad * rad, 360)
        out = {"rr": rad * rad, "sec": fr(sec), "approx": round(fl(seg), 2)}
        if th == 90:
            out["triA"] = rad * rad // 2
        else:
            out["kk"] = (rad // 2) ** 2
        return {"answer": fl(seg), "vals": out}
    if kind == "wheel":
        d, N = q["d"], q["N"]
        dist_cm = N * PI * d
        m = dist_cm / 100 / PI
        return {"answer": fl(dist_cm / 100), "vals": {"cm": N * d, "m": as_int(m), "approx": round(fl(dist_cm / 100), 1)}}
    rad, th = q["rad"], q["th"]
    O = sp.Point(0, 0)
    A, B = sp.Point(rad, 0), sp.Point(rad * sp.cos(sp.rad(th)), rad * sp.sin(sp.rad(th)))
    assert sp.simplify(O.distance(B) - rad) == 0
    return {"answer": fl(A.distance(B)), "vals": {"half": F(th, 2)}}


# ---- G.18 -------------------------------------------------------------------------------------------
def circle_thm(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        kind = q["kind"]
        if kind in ("c2i", "i2c"):
            # an actual circle: A, B on it with central angle 2θ; C on the major arc; angle ACB
            cen = q["cen"] if kind == "c2i" else 2 * q["th"]
            a0 = 210
            A = sp.Point(sp.cos(sp.rad(a0)), sp.sin(sp.rad(a0)))
            B = sp.Point(sp.cos(sp.rad(a0 + cen)), sp.sin(sp.rad(a0 + cen)))
            C = sp.Point(sp.cos(sp.rad(a0 + cen + 100)), sp.sin(sp.rad(a0 + cen + 100))) if 360 - cen > 120 else sp.Point(sp.cos(sp.rad(a0 + 180 + cen / 2)), sp.sin(sp.rad(a0 + 180 + cen / 2)))
            ins = round(fl(ang_between(A - C, B - C)), 9)
            assert abs(ins - cen / 2) < 1e-9
            return {"answer": cen // 2 if kind == "c2i" else cen, "vals": {"th": cen // 2} if kind == "c2i" else {"cen": cen}}
        a = q["a"]
        A, B = sp.Point(-1, 0), sp.Point(1, 0)
        C = sp.Point(sp.cos(sp.rad(2 * a)), sp.sin(sp.rad(2 * a)))
        assert abs(fl(ang_between(B - A, C - A)) - a) < 1e-9 and abs(fl(ang_between(A - C, B - C)) - 90) < 1e-9
        b = round(fl(ang_between(A - B, C - B)))
        assert b == 90 - a
        return {"answer": b, "vals": {"b": b}}
    if lv == 2:
        kind = q["kind"]
        if kind == "chords":
            a, b, c = q["a"], q["b"], q["c"]
            d = F(a * b, c)
            assert d.denominator == 1
            # the four endpoints really lie on one circle (power of the point E)
            phi = sp.rad(70)
            A, B, Cp, D = sp.Point(-a, 0), sp.Point(b, 0), sp.Point(-c * sp.cos(phi), -c * sp.sin(phi)), sp.Point(int(d) * sp.cos(phi), int(d) * sp.sin(phi))
            circ = sp.Circle(A, B, Cp)
            assert abs(fl(circ.center.distance(D) - circ.radius)) < 1e-9
            return {"answer": int(d), "vals": {"num": a * b, "d": int(d)}}
        if kind == "secant":
            a = q["a"]
            if q["fwd"]:
                w = q["w"]
                t = as_int(sp.sqrt(a * w))
                return {"answer": t, "vals": {"pw": a * w, "t": t}}
            t = q["t"]
            w = F(t * t, a)
            assert w.denominator == 1 and w > a
            return {"answer": int(w) - a, "vals": {"pw": t * t, "w": int(w), "ab": int(w) - a}}
        P_, Q_, R_, S_ = q["p"], q["q"], q["r"], q["s"]
        x = as_int(solve1(P_ * X + Q_, R_ * X + S_))
        L = P_ * x + Q_
        assert L > 0
        ck, crhs = collect(P_, Q_, R_, S_)
        return {"answer": L, "vals": {"ck": ck, "crhs": crhs, "X": x, "L": L}}
    if q["kind"] == "tangent":
        rad, t = q["rad"], q["t"]
        circ = sp.Circle(sp.Point(0, 0), rad)
        d = as_int(sp.sqrt(rad * rad + t * t))
        P_ = sp.Point(d, 0)
        T = circ.tangent_lines(P_)[0].intersection(circ)[0]
        assert sp.simplify(P_.distance(T) - t) == 0
        gap = d - rad
        return {"answer": gap, "vals": {"rr": rad * rad, "tt": t * t, "dd": d * d, "d": d, "gap": gap}}
    P_, Q_, R_, S_ = q["p"], q["q"], q["r"], q["s"]
    x = as_int(solve1(P_ * X + Q_ + R_ * X + S_, 180))
    A, C = P_ * x + Q_, R_ * x + S_
    assert 0 < A < 180 and 0 < C < 180
    return {"answer": C, "vals": {"k": P_ + R_, "qs": Q_ + S_, "rhs": 180 - Q_ - S_, "X": x, "A": A, "C": C}}


# ---- G.19 -------------------------------------------------------------------------------------------
def circle_eq(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        h, k, R2 = q["h"], q["k"], q["R2"]
        expr = sp.expand((X - h) ** 2 + (Y - k) ** 2 - R2)
        c = sp.Circle(sp.Point(h, k), sp.sqrt(R2))
        assert sp.expand(c.equation(X, Y) - expr) == 0
        R = as_int(c.radius)
        return {"answer": [h, k, R], "vals": {"h": h, "k": k, "R": R}}

    def from_general(D, E, F_):
        h, k = sp.Rational(-D, 2), sp.Rational(-E, 2)
        R2 = h ** 2 + k ** 2 - F_
        assert R2 > 0
        assert sp.expand((X - h) ** 2 + (Y - k) ** 2 - R2 - (X ** 2 + Y ** 2 + D * X + E * Y + F_)) == 0
        return as_int(h), as_int(k), as_int(R2)

    if lv == 2:
        h, k, R2 = from_general(q["D"], q["E"], q["F"])
        R = as_int(sp.sqrt(R2))
        return {"answer": [h, k, R], "vals": {"hh": h * h, "kk": k * k, "negF": -q["F"], "R2": R2, "h": h, "k": k, "R": R}}
    if "x0" in q and "R2" in q:
        h, k, R2, x0, y0 = q["h"], q["k"], q["R2"], q["x0"], q["y0"]
        assert (x0 - h) ** 2 + (y0 - k) ** 2 == R2
        c = sp.Circle(sp.Point(h, k), sp.sqrt(R2))
        tl = c.tangent_lines(sp.Point(x0, y0))
        assert len(tl) == 1
        yline = sp.solve(tl[0].equation(X, Y), Y)[0]
        m = sp.Poly(yline, X).coeff_monomial(X)
        b = yline.subs(X, 0)
        mf = F(int(sp.fraction(m)[0]), int(sp.fraction(m)[1]))
        bf = F(int(sp.fraction(b)[0]), int(sp.fraction(b)[1]))
        vx, vy = x0 - h, y0 - k
        return {"answer": f"({mf.numerator}/{mf.denominator})*x + ({bf.numerator}/{bf.denominator})",
                "vals": {"vx": vx, "vy": vy, "mr": fr(F(vy, vx)), "m": fr(mf), "mx0": fr(mf * x0), "b": fr(bf)}}
    h, k, R2 = from_general(q["D"], q["E"], q["F"])
    x0, y0 = q["x0"], q["y0"]
    c = sp.Circle(sp.Point(h, k), sp.sqrt(R2))
    P_ = sp.Point(x0, y0)
    where = 1 if c.encloses_point(P_) is False and P_ in c else 0 if c.encloses_point(P_) else 2
    dx, dy = x0 - h, y0 - k
    return {"answer": where, "vals": {"h": h, "k": k, "hh": h * h, "kk": k * k, "negF": -q["F"], "R2": R2, "dx": dx, "dy": dy, "dxx": dx * dx, "dyy": dy * dy, "d2": dx * dx + dy * dy, "where": where}}


# ---- G.20 -------------------------------------------------------------------------------------------
def coord_proofs(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        A, B, C, D = (sp.Point(*q[k]) for k in "ABCD")
        l1, l2 = sp.Line(A, B), sp.Line(C, D)
        assert not l1.equals(l2)
        kind = 0 if l1.is_parallel(l2) else 1 if l1.is_perpendicular(l2) else 2
        m1, m2 = F(int(l1.slope.p), int(l1.slope.q)), F(int(l2.slope.p), int(l2.slope.q))
        (ax, ay), (bx, by), (cx, cy), (dx_, dy_) = (q[k] for k in "ABCD")
        return {"answer": kind, "vals": {"dx": bx - ax, "dy": by - ay, "ex": dx_ - cx, "ey": dy_ - cy, "m1": fr(m1), "m2": fr(m2), "prod": fr(m1 * m2), "kind": kind}}
    if lv == 2:
        A, B, C, D = (sp.Point(*q[k]) for k in "ABCD")
        assert A + C == B + D, "a parallelogram"
        sides = [A.distance(B), B.distance(C), C.distance(D), D.distance(A)]
        right = (B - A).dot(D - A) == 0
        rhomb = len(set(sides)) == 1
        idx = 3 if right and rhomb else 1 if right else 2 if rhomb else 0
        ac, bd = C - A, D - B
        mac = (A + C) / 2
        return {"answer": idx, "vals": {"mACx": fr(F(int(2 * mac.x), 2)), "mACy": fr(F(int(2 * mac.y), 2)), "acx": int(ac.x), "acy": int(ac.y), "bdx": int(bd.x), "bdy": int(bd.y),
                                        "AC2": int(ac.dot(ac)), "BD2": int(bd.dot(bd)), "dd": int(ac.dot(bd)), "idx": idx}}
    if "c0" in q:
        A, B, c0 = q["A"], q["B"], q["c0"]
        K = sp.Symbol("K")
        sol = sp.solve(sp.Eq((B[0] - A[0]) * (K - A[0]) + (B[1] - A[1]) * (c0 - A[1]), 0), K)
        k = as_int(sol[0])
        assert sp.Line(sp.Point(*A), sp.Point(*B)).is_perpendicular(sp.Line(sp.Point(*A), sp.Point(k, c0)))
        bx, by, cy = B[0] - A[0], B[1] - A[1], c0 - A[1]
        return {"answer": k, "vals": {"bx": bx, "by": by, "cy": cy, "num": -by * cy, "cx": k - A[0], "k": k}}
    A, B, C = (sp.Point(*q[k]) for k in "ABC")
    D = A + C - B
    assert sp.Line(A, B).is_parallel(sp.Line(D, C)) and sp.Line(B, C).is_parallel(sp.Line(A, D))
    sx, sy = int((A + C).x), int((A + C).y)
    return {"answer": [int(D.x), int(D.y)], "vals": {"sx": sx, "sy": sy, "mx": fr(F(sx, 2)), "my": fr(F(sy, 2)), "dx": int(D.x), "dy": int(D.y)}}


# ---- G.21 -------------------------------------------------------------------------------------------
def prisms(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["cube"]:
            return {"answer": q["s"] ** 3, "vals": {"Vv": q["s"] ** 3}}
        l, w, h = q["l"], q["w"], q["h"]
        return {"answer": l * w * h, "vals": {"lw": l * w, "Vv": l * w * h}}
    if lv == 2:
        if q["kind"] == "cyl":
            rad = q["rad"] if "rad" in q else F(q["d"], 2)
            assert F(rad).denominator == 1
            rad = int(rad)
            Vv = sp.integrate(PI * rad ** 2, (X, 0, q["h"]))   # stack of disks
            return {"answer": fl(Vv), "vals": {"rad": rad, "B": rad * rad, "Vv": as_int(Vv / PI)}}
        a, b, L = q["a"], q["b"], q["L"]
        B = abs(sp.Triangle(sp.Point(0, 0), sp.Point(a, 0), sp.Point(0, b)).area)
        return {"answer": as_int(B * L), "vals": {"B": as_int(B), "Vv": as_int(B * L)}}
    if q["kind"] == "tank":
        cm3 = q["l"] * q["w"] * q["h"]
        Lt = F(cm3, 1000)
        t = Lt / q["q"]
        assert Lt.denominator == 1 and t.denominator == 1
        return {"answer": int(t), "vals": {"cm3": cm3, "Lt": int(Lt), "t": int(t)}}
    l, w, h = q["l"], q["w"], q["h"]
    D = as_int(sp.Point3D(0, 0, 0).distance(sp.Point3D(l, w, h)))
    return {"answer": D, "vals": {"ll": l * l, "ww": w * w, "hh": h * h, "base2": l * l + w * w, "DD": D * D, "D": D}}


# ---- G.22 -------------------------------------------------------------------------------------------
def frac_of(e):
    e = sp.simplify(e)
    assert e.is_Rational, e
    n, d = sp.fraction(e)
    return F(int(n), int(d))


def solids(p):
    q, lv = p["params"], p["level"]
    Z = sp.Symbol("z")
    if lv == 1:
        if q["kind"] == "sphereV":
            rad = q["rad"]
            Vv = sp.integrate(PI * (rad ** 2 - Z ** 2), (Z, -rad, rad))   # disks across the ball
            return {"answer": fl(Vv), "vals": {"r3": rad ** 3, "r34": 4 * rad ** 3, "Vq": fr(frac_of(Vv / PI))}}
        if q["kind"] == "sphereA":
            rad = q["rad"]
            S = sp.diff(sp.Rational(4, 3) * PI * Z ** 3, Z).subs(Z, rad)  # dV/dr
            return {"answer": fl(S), "vals": {"rr": rad * rad, "A": as_int(S / PI)}}
        rad, h = q["rad"], q["h"]
        Vv = sp.integrate(PI * (rad * Z / h) ** 2, (Z, 0, h))
        return {"answer": fl(Vv), "vals": {"rr": rad * rad, "rrh": rad * rad * h, "Vv": as_int(Vv / PI)}}
    if lv == 2:
        if q["kind"] == "pyramid":
            s, h = q["s"], q["h"]
            Vv = sp.integrate((s * Z / h) ** 2, (Z, 0, h))
            return {"answer": fl(Vv), "vals": {"B": s * s, "Bh": s * s * h, "Vq": fr(frac_of(Vv))}}
        rad, l = q["rad"], q["l"]
        h = as_int(sp.sqrt(l * l - rad * rad))
        if q["kind"] == "coneSA":
            S = PI * rad ** 2 + PI * rad * l
            return {"answer": fl(S), "vals": {"base": rad * rad, "lat": rad * l, "S": as_int(S / PI)}}
        Vv = sp.integrate(PI * (rad * Z / h) ** 2, (Z, 0, h))
        return {"answer": fl(Vv), "vals": {"ll": l * l, "rr": rad * rad, "hh": h * h, "h": h, "rrh": rad * rad * h, "Vq": fr(frac_of(Vv / PI))}}
    kind = q["kind"]
    if kind == "frustum":
        R, r, h = q["R"], q["r"], q["h"]
        Vv = sp.integrate(PI * (r + (R - r) * Z / h) ** 2, (Z, 0, h))   # radius grows linearly from r to R
        s = R * R + R * r + r * r
        return {"answer": fl(Vv), "vals": {"RR": R * R, "Rr": R * r, "rr": r * r, "sum": s, "hs": h * s, "Vq": fr(frac_of(Vv / PI))}}
    if kind == "melt":
        a, R = q["a"], q["R"]
        H = sp.Symbol("H")
        h = sp.solve(sp.Eq(PI * R ** 2 * H, sp.Rational(4, 3) * PI * a ** 3), H)[0]
        return {"answer": fl(h), "vals": {"a3": a ** 3, "sv": fr(F(4 * a ** 3, 3)), "RR": R * R, "hq": fr(frac_of(h))}}
    rad, h = q["rad"], q["h"]
    cone = sp.integrate(PI * (rad * Z / h) ** 2, (Z, 0, h))
    hemi = sp.integrate(PI * (rad ** 2 - Z ** 2), (Z, 0, rad))
    tot = cone + hemi
    return {"answer": fl(tot), "vals": {"rr": rad * rad, "r3": rad ** 3, "cone": fr(frac_of(cone / PI)), "hemi": fr(frac_of(hemi / PI)), "tot": fr(frac_of(tot / PI))}}


# ---- G.23 -------------------------------------------------------------------------------------------
def surface(p):
    q, lv = p["params"], p["level"]
    Z = sp.Symbol("z")
    if lv == 1:
        if q["cube"]:
            s = q["s"]
            return {"answer": 6 * s * s, "vals": {"f": s * s, "S": 6 * s * s}}
        l, w, h = q["l"], q["w"], q["h"]
        faces = [l * w, l * w, l * h, l * h, w * h, w * h]
        return {"answer": sum(faces), "vals": {"lw": l * w, "lh": l * h, "wh": w * h, "sum": sum(faces) // 2, "S": sum(faces)}}
    if lv == 2:
        kind = q["kind"]
        if kind == "cyl":
            rad, h = q["rad"], q["h"]
            S = 2 * PI * rad ** 2 + sp.Circle(sp.Point(0, 0), rad).circumference * h
            return {"answer": fl(S), "vals": {"disks": 2 * rad * rad, "side": 2 * rad * h, "S": as_int(S / PI)}}
        if kind == "coneL":
            rad, l = q["rad"], q["l"]
            # unrolled: a sector of radius l whose arc is the base circumference 2πr
            L = sp.Rational(1, 2) * l * (2 * PI * rad)
            return {"answer": fl(L), "vals": {"L": as_int(L / PI)}}
        if kind == "hemi":
            rad = q["rad"]
            curved = sp.integrate(2 * PI * rad * rad * sp.sin(Z), (Z, 0, PI / 2))   # surface of revolution
            S = curved + PI * rad ** 2
            return {"answer": fl(S), "vals": {"rr": rad * rad, "curved": as_int(curved / PI), "S": as_int(S / PI)}}
        k = q["k"]
        Vn, E, Fc = (2 * k, 3 * k, k + 2) if q["prism"] else (k + 1, 2 * k, k + 1)
        assert Vn - E + Fc == 2
        return {"answer": {"V": Vn, "E": E, "F": Fc}[q["ask"]], "vals": {"Vn": Vn, "E": E, "F": Fc}}
    kind = q["kind"]
    if kind == "pyramid":
        s, h = q["s"], q["h"]
        a = s // 2
        l = as_int(sp.Point3D(0, 0, h).distance(sp.Point3D(a, 0, 0)))   # apex to the middle of an edge
        face = abs(sp.Triangle(sp.Point(-a, 0), sp.Point(a, 0), sp.Point(0, l)).area)
        S = s * s + 4 * face
        return {"answer": as_int(S), "vals": {"a": a, "hh": h * h, "aa": a * a, "ll": l * l, "l": l, "lat": as_int(4 * face), "base": s * s, "S": as_int(S)}}
    if kind == "openbox":
        l, w, h, cov = q["l"], q["w"], q["h"], q["cov"]
        faces = [l * w, l * h, l * h, w * h, w * h]
        S = sum(faces)
        cans = F(S, cov)
        assert cans.denominator == 1
        return {"answer": int(cans), "vals": {"bottom": l * w, "long": 2 * l * h, "ends": 2 * w * h, "S": S, "cans": int(cans)}}
    a, b, L = q["a"], q["b"], q["L"]
    c = as_int(sp.sqrt(a * a + b * b))
    ends = 2 * abs(sp.Triangle(sp.Point(0, 0), sp.Point(a, 0), sp.Point(0, b)).area)
    S = ends + (a + b + c) * L
    return {"answer": as_int(S), "vals": {"cc": c * c, "c": c, "ends": as_int(ends), "per": a + b + c, "lat": (a + b + c) * L, "S": as_int(S)}}


# ---- G.24 / G.25 --------------------------------------------------------------------------------------
def rot(th):
    t = sp.rad(th)
    return sp.Matrix([[sp.cos(t), -sp.sin(t)], [sp.sin(t), sp.cos(t)]])


def refl(theta):
    """Reflection in the line through the origin at angle theta (degrees)."""
    t = sp.rad(2 * theta)
    return sp.Matrix([[sp.cos(t), sp.sin(t)], [sp.sin(t), -sp.cos(t)]])


def ipt(v):
    return [as_int(v[0]), as_int(v[1])]


def transforms(p):
    q, lv = p["params"], p["level"]
    P_ = sp.Matrix([q["px"], q["py"]])
    if lv == 1:
        kind = q["kind"]
        if kind == "trans":
            Q = P_ + sp.Matrix([q["a"], q["b"]])
        else:
            Q = refl(0 if kind == "xaxis" else 90) * P_
        qx, qy = ipt(Q)
        return {"answer": [qx, qy], "vals": {"qx": qx, "qy": qy}}
    if lv == 2:
        if q["kind"] == "dil":
            k = F_(q["k"])
            Q = sp.Rational(k.numerator, k.denominator) * P_
            qx, qy = ipt(Q)
            return {"answer": [qx, qy], "vals": {"k": fr(k), "qx": qx, "qy": qy}}
        Q = refl(45 if q["kind"] == "yx" else -45) * P_
        qx, qy = ipt(Q)
        return {"answer": [qx, qy], "vals": {"qx": qx, "qy": qy}}
    if q["kind"] == "dilc":
        k = F_(q["k"])
        Cc = sp.Matrix([q["cx"], q["cy"]])
        d = P_ - Cc
        kd = sp.Rational(k.numerator, k.denominator) * d
        Q = Cc + kd
        qx, qy = ipt(Q)
        return {"answer": [qx, qy], "vals": {"dx": int(d[0]), "dy": int(d[1]), "kx": as_int(kd[0]), "ky": as_int(kd[1]), "qx": qx, "qy": qy}}
    th = q["th"]
    Rm = rot(th)
    Q = Rm * P_
    qx, qy = ipt(Q)
    return {"answer": [qx, qy], "vals": {"c": as_int(Rm[0, 0]), "s": as_int(Rm[1, 0]), "qx": qx, "qy": qy}}


def rotations(p):
    q, lv = p["params"], p["level"]
    P_ = sp.Matrix([q["px"], q["py"]])
    if lv == 1:
        Q = rot(q["th"]) * P_
        qx, qy = ipt(Q)
        return {"answer": [qx, qy], "vals": {"qx": qx, "qy": qy}}
    MOVES = {"rx": refl(0), "ry": refl(90), "rd": refl(45), "r90": rot(90), "r180": rot(180), "r270": rot(270)}
    if lv == 2:
        a = MOVES[q["m1"]] * P_
        b = MOVES[q["m2"]] * a
        ax, ay = ipt(a)
        bx, by = ipt(b)
        assert [bx, by] != [q["px"], q["py"]]
        return {"answer": [bx, by], "vals": {"ax": ax, "ay": ay, "bx": bx, "by": by}}
    kind = q["kind"]
    if kind == "about":
        Cc = sp.Matrix([q["cx"], q["cy"]])
        d = P_ - Cc
        t = rot(q["th"]) * d
        Q = t + Cc
        return {"answer": ipt(Q), "vals": {"dx": int(d[0]), "dy": int(d[1]), "tx": as_int(t[0]), "ty": as_int(t[1]), "qx": as_int(Q[0]), "qy": as_int(Q[1])}}
    if kind == "parallel":
        a, b = q["a"], q["b"]
        m1 = 2 * a - q["px"]
        m2 = 2 * b - m1
        assert m2 == q["px"] + 2 * (b - a)       # the composition is a translation by twice the gap
        return {"answer": [m2, q["py"]], "vals": {"m1": m1, "m2": m2, "shift": 2 * (b - a)}}
    a = refl(0) * P_
    b = refl(45) * a
    assert refl(45) * refl(0) == rot(90)        # two mirrors at 45° make a 90° rotation
    ax, ay = ipt(a)
    bx, by = ipt(b)
    return {"answer": [bx, by], "vals": {"ax": ax, "ay": ay, "bx": bx, "by": by}}


VERIFY = {
    "G.points-lines": points_lines, "G.angle-types": angle_types, "G.1": angle_rel, "G.triangle-class": triangle_class, "G.2": tri_sum,
    "G.congruence": congruence, "G.3": pythag, "G.4": special_right, "G.5": scale, "G.similarity": similarity, "G.centers": centers,
    "G.6": dist_mid, "G.7": polygons, "G.quadrilaterals": quads, "G.8": area, "G.heron": heron, "G.9": circles, "G.10": circle_thm,
    "G.circle-eq": circle_eq, "G.coord-proofs": coord_proofs, "G.11": prisms, "G.12": solids, "G.surface-area": surface,
    "G.13": transforms, "G.rotations": rotations,
}
