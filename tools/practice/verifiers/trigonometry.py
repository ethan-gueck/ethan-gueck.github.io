"""Independent answers for practice/trigonometry.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]). SymPy's exact trigonometry
(sin(pi/12) = (sqrt(6) - sqrt(2))/4 and so on) and Fractions; nothing here is copied from the JavaScript.

Exact values are compared as the list [L, a1, r1, a2, r2, ...]: the value is (a1*sqrt(r1) + a2*sqrt(r2) + ...)/L
with square-free r, the rational term (r = 1) first and then larger radicands first."""
import json
import math
from fractions import Fraction as F
from math import gcd, isqrt

import sympy as sp

X = sp.Symbol("x", real=True)
PI = sp.pi
FN6 = ["sin", "cos", "tan", "csc", "sec", "cot"]
TF = {
    "sin": sp.sin, "cos": sp.cos, "tan": sp.tan,
    "csc": lambda a: 1 / sp.sin(a), "sec": lambda a: 1 / sp.cos(a), "cot": lambda a: sp.cos(a) / sp.sin(a),
}
TRIPLES = [(3, 4, 5), (5, 12, 13), (8, 15, 17), (7, 24, 25), (20, 21, 29)]


def fr(q):
    q = F(q)
    return {"n": q.numerator, "d": q.denominator}


def frac_of(d):
    return F(d["n"], d["d"])


def S(q):
    """A Fraction (or {n, d}) as a SymPy Rational."""
    if isinstance(q, dict):
        q = frac_of(q)
    q = F(q)
    return sp.Rational(q.numerator, q.denominator)


def lcm(a, b):
    return abs(a * b) // gcd(a, b)


def exact(e):
    e = sp.radsimp(sp.nsimplify(e) if e.has(sp.Float) else e)
    return sp.expand(e)


def rl(e):
    """An exact value c1*sqrt(r1) + ... as [L, a1, r1, ...]."""
    e = exact(e)
    if e == 0:
        return [1]
    terms = {}
    for t in sp.Add.make_args(e):
        c, rest = t.as_coeff_Mul()
        if rest == 1:
            r = 1
        else:
            r2 = sp.expand(rest ** 2)
            assert r2.is_Integer, f"not a single square root: {t}"
            r = int(r2)
        assert c.is_Rational, f"irrational coefficient in {t}"
        terms[r] = terms.get(r, 0) + sp.Rational(c)
    terms = {r: c for r, c in terms.items() if c != 0}
    order = sorted(terms, key=lambda r: (r != 1, -r))
    L = 1
    for r in order:
        L = lcm(L, int(terms[r].q))
    out = [L]
    for r in order:
        out += [int(terms[r] * L), r]
    return out


def from_rl(lst):
    L, rest = lst[0], lst[1:]
    return sum((sp.Integer(rest[i]) * sp.sqrt(rest[i + 1]) for i in range(0, len(rest), 2)), sp.Integer(0)) / L


def num(e):
    return float(sp.N(e, 30))


def deg(d):
    return PI * S(d) / 180


def trig(f, angle):
    v = sp.simplify(TF[f](angle))
    return exact(v)


def quadrant(d):
    d = d % 360
    assert d % 90 != 0
    return 1 + int(d // 90)


def ref_angle(d):
    """Acute angle to the x-axis, by geometry: arctan(|y| / |x|) of the terminal point."""
    a = deg(d)
    v = sp.atan(sp.Abs(sp.sin(a)) / sp.Abs(sp.cos(a)))
    return sp.nsimplify(v * 180 / PI)


def rational(e):
    e = sp.nsimplify(sp.simplify(e))
    assert e.is_Rational, f"{e} is not rational"
    return F(int(e.p), int(e.q))


# ---- T.1 ----------------------------------------------------------------------------------
def t1(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        adj, opp, hyp = q["adj"], q["opp"], q["hyp"]
        assert adj ** 2 + opp ** 2 == hyp ** 2
        th = sp.atan(sp.Rational(opp, adj))
        f = FN6[q["f"]]
        val = rational(TF[f](th))
        vals = {"ans": fr(val)}
        if q["unk"] == 2:
            ss = adj ** 2 + opp ** 2
            assert isqrt(ss) ** 2 == ss
            vals.update(aa=adj ** 2, bb=opp ** 2, ss=ss, side=isqrt(ss))
        elif q["unk"] in (0, 1):
            known = adj if q["unk"] == 0 else opp
            ss = hyp ** 2 - known ** 2
            assert isqrt(ss) ** 2 == ss
            vals.update(hh=hyp ** 2, kk=known ** 2, ss=ss, side=isqrt(ss))
        return {"answer": float(val), "vals": vals}
    kind, d = q["kind"], q["d"]
    if kind == 3:
        h, x = sp.symbols("h x", positive=True)
        sol = sp.solve([sp.tan(PI / 3) * x - h, sp.tan(PI / 6) * (x + d) - h], [h, x], dict=True)
        assert len(sol) == 1
        H = sol[0][h]
        return {"answer": num(H), "vals": {"H": rl(H), "Hn": num(H)}}
    a = deg(q["al"])
    if kind == 0:
        t = sp.tan(a)
        H = d * t
    elif kind == 1:
        t = sp.tan(a)
        H = d / t
    else:
        t = sp.sin(a)
        H = d * t
    return {"answer": num(H), "vals": {"t": rl(t), "H": rl(H), "Hn": num(H)}}


# ---- T.2 ----------------------------------------------------------------------------------
def t2(p):
    q, L = p["params"], p["level"]
    if L == 1:
        qq = frac_of(q["q"])
        d = qq * 180
        assert d.denominator == 1
        d = int(d)
        if q["dir"] == 0:
            return {"answer": float(qq) * math.pi, "vals": {"g": gcd(d, 180), "q": fr(qq), "d": d}}
        return {"answer": d, "vals": {"top": qq.numerator * 180, "d": d}}
    if L == 2:
        th = sp.Rational(q["d"], 180)  # angle / pi
        R = q["R"]
        if q["arc"]:
            s = R * th
            return {"answer": num(s * PI), "vals": {"q": fr(F(q["d"], 180)), "s": fr(F(int(s.p), int(s.q)))}}
        A = sp.Rational(1, 2) * R ** 2 * th
        return {"answer": num(A * PI), "vals": {"q": fr(F(q["d"], 180)), "rr": R * R, "A": fr(F(int(A.p), int(A.q)))}}
    rc, N = q["rc"], q["N"]
    omega = 2 * PI * sp.Rational(N, 60)          # rad/s
    v = sp.Rational(rc, 100) * omega              # m/s
    qq = sp.Rational(N, 30)
    assert qq.is_Integer
    return {"answer": num(v), "vals": {"q": int(qq), "rm": rc / 100, "c": float(F(rc, 100) * int(qq)), "v": num(v)}}


# ---- T.angles -----------------------------------------------------------------------------
def t_angles(p):
    q, L = p["params"], p["level"]
    if L == 1:
        if q["rad"] == 0:
            a = q["a"]
            base = a % 360
            K = abs(a - base) // 360
            assert 0 <= base < 360 and K in (1, 2)
            return {"answer": base, "vals": {"K": K, "kk": 360 * K, "base": base}}
        qq = frac_of(q["q"])
        base = qq % 2
        K = abs(qq - base) / 2
        assert K.denominator == 1 and K in (1, 2)
        return {"answer": float(base) * math.pi, "vals": {"twoK": int(2 * K), "inDen": int(2 * K) * q["den"], "base": fr(base)}}
    if L == 2:
        if q["rad"] == 0:
            base = q["a"] % 360
            ref = int(ref_angle(base))
            return {"answer": ref, "vals": {"base": base, "ref": ref}}
        qq = frac_of(q["q"])
        base = qq % 2
        ref = F(str(ref_angle(base * 180))) / 180
        qd = quadrant(base * 180)
        return {"answer": float(ref) * math.pi, "vals": {"base": fr(base), "ref": fr(ref), "lo": fr(F(qd - 1, 2)), "hi": fr(F(qd, 2))}}
    rad = q["rad"]
    a = frac_of(q["a"]) * 180 if rad else F(q["a"])
    f = FN6[q["f"]]
    base = a % 360
    turn = abs(a - base)
    ref = F(str(ref_angle(base)))
    v = trig(f, deg(a))
    vref = trig(f, deg(ref))
    assert abs(num(vref)) == abs(num(v))
    out = {"turn": int(turn / 180) if rad else int(turn), "base": fr(base / 180) if rad else int(base),
           "ref": fr(ref / 180) if rad else int(ref), "vref": rl(vref), "v": rl(v)}
    return {"answer": num(v), "vals": out}


# ---- T.3 ----------------------------------------------------------------------------------
def t3(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        d = q["d"]
        a = deg(d)
        c, s = exact(sp.cos(a)), exact(sp.sin(a))
        vals = {"c": rl(c), "s": rl(s)}
        if d % 90:
            ref = int(ref_angle(d))
            vals.update(cr=rl(sp.cos(deg(ref))), sr=rl(sp.sin(deg(ref))), ref=ref if L == 1 else fr(F(ref, 180)))
        if L == 1:
            return {"answer": [num(c), num(s)], "vals": vals}
        f = FN6[q["f"]]
        v = trig(f, a)
        vals.update(q=fr(F(d, 180)), v=rl(v))
        return {"answer": num(v), "vals": vals}
    x, y = q["x"], q["y"]
    rr = x * x + y * y
    h = isqrt(rr)
    assert h * h == rr
    th = sp.atan2(y, x)
    f = FN6[q["f"]]
    val = rational(TF[f](th))
    return {"answer": float(val), "vals": {"xx": x * x, "yy": y * y, "rr": rr, "h": h, "ans": fr(val)}}


# ---- T.basic-graphs -----------------------------------------------------------------------
def t_basic_graphs(p):
    q, L = p["params"], p["level"]
    if L == 1:
        opts = q["opts"]
        assert len(set(opts)) == 4 and q["fi"] in opts
        return {"answer": opts.index(q["fi"]), "vals": {}}
    if L == 2:
        f = FN6[q["f"]]
        iv = sp.Interval.Ropen(q["lo"] * PI, (q["lo"] + 2) * PI)
        if q["zeros"]:
            assert f in ("sin", "cos", "tan", "cot")
            sols = sp.solveset(TF[f](X), X, iv)
        else:
            assert f in ("tan", "cot", "sec", "csc")
            sols = sp.singularities(TF[f](X), X, iv)
        sols = sorted(sols, key=lambda v: float(v))
        assert len(sols) == 2
        fr_s = [fr(F(str(sp.nsimplify(v / PI)))) for v in sols]
        return {"answer": [num(v) for v in sols], "vals": {"sols": fr_s}}
    f = FN6[q["f"]]
    qq = frac_of(q["q"])
    per = 1 if f in ("tan", "cot") else 2
    assert sp.simplify(TF[f](X + per * PI) - TF[f](X)) == 0
    q0 = qq % per
    v = trig(f, qq * PI)
    vals = {"kp": int(abs(qq - q0)), "q0": fr(q0), "v": rl(v)}
    d0 = q0 * 180
    if d0 % 90 != 0 and quadrant(d0) != 1:
        ref = F(str(ref_angle(d0)))
        vals.update(ref=fr(ref / 180), vref=rl(trig(f, deg(ref))))
    return {"answer": num(v), "vals": vals}


# ---- T.4 ----------------------------------------------------------------------------------
TRANS = [lambda t: -t, lambda t: PI - t, lambda t: t + PI, lambda t: t + 2 * PI]


def t4(p):
    q, L = p["params"], p["level"]
    v = S(q["v"])
    if L == 1:
        th = sp.asin(v) if q["given"] == 0 else sp.acos(v)
        assert 0 < num(th) < math.pi / 2
        other = rational(sp.cos(th) if q["given"] == 0 else sp.sin(th))
        pp, hh = int(v.p) ** 2, int(v.q) ** 2
        return {"answer": float(other), "vals": {"pp": pp, "hh": hh, "qq": hh - pp, "ans": fr(other)}}
    if L == 2:
        qd = q["qd"]
        sx = -1 if qd in (2, 3) else 1
        sy = -1 if qd in (3, 4) else 1
        if q["given"] == 0:
            sn = v
            cs = sx * sp.sqrt(1 - v ** 2)
        elif q["given"] == 1:
            cs = v
            sn = sy * sp.sqrt(1 - v ** 2)
        else:
            cs = sx / sp.sqrt(1 + v ** 2)
            sn = v * cs
        assert sp.sign(sn) == sy and sp.sign(cs) == sx
        th = sp.atan2(sn, cs)
        assert num(sp.tan(th) if q["given"] == 2 else (sp.sin(th) if q["given"] == 0 else sp.cos(th))) == float(v) or \
            abs(num((sp.tan(th) if q["given"] == 2 else (sp.sin(th) if q["given"] == 0 else sp.cos(th))) - v)) < 1e-12
        ans = rational(TF[FN6[q["asked"]]](th))
        sr, cr = rational(sp.sin(th)), rational(sp.cos(th))
        h = sr.denominator
        assert cr.denominator == h
        return {"answer": float(ans), "vals": {"xx": cr.numerator ** 2, "yy": sr.numerator ** 2, "hh": h * h, "ax": abs(cr.numerator), "by": abs(sr.numerator), "h": h,
                                              "sinv": fr(sr), "cosv": fr(cr), "tanv": fr(sr / cr), "ans": fr(ans)}}
    th = sp.asin(v) if q["given"] == 0 else sp.acos(v)
    assert 0 < num(th) < math.pi / 2
    f1, f2 = FN6[q["f1"]], FN6[q["f2"]]
    t1 = rational(TF[f1](TRANS[q["i1"]](th)))
    t2 = rational(TF[f2](TRANS[q["i2"]](th)))
    ans = t1 + t2 if q["plus"] else t1 - t2
    other = rational(sp.cos(th) if q["given"] == 0 else sp.sin(th))
    pp, hh = int(v.p) ** 2, int(v.q) ** 2
    return {"answer": float(ans), "vals": {"pp": pp, "hh": hh, "qq": hh - pp, "other": fr(other), "tanv": fr(rational(sp.tan(th))),
                                          "t1": fr(t1), "t2": fr(t2), "ans": fr(ans)}}


# ---- T.cofunction -------------------------------------------------------------------------
PAIRS = [("sin", "cos"), ("cos", "sin"), ("tan", "cot"), ("cot", "tan"), ("sec", "csc"), ("csc", "sec")]
_s, _c = sp.sin(X), sp.cos(X)
_t, _sec, _csc, _cot = _s / _c, 1 / _c, 1 / _s, _c / _s
SIMP = [_s * _sec, _c * _csc, _t * _c, _cot * _s, _sec * _cot, _csc * _t, _s / _t, _c / _cot, _t / _s, _cot / _c,
        (1 - _s ** 2) * _sec, (1 - _c ** 2) * _csc, (_sec ** 2 - 1) * _cot, (1 + _cot ** 2) * _s, _sec - _t * _s, _csc - _cot * _c]
SIX = [_s, _c, _t, _csc, _sec, _cot]


def same_fn(e1, e2):
    pts = [sp.Rational(k, 7) for k in (1, 3, 5, 9, 11, 13, 17, 19)]
    return all(abs(num(e1.subs(X, a) - e2.subs(X, a))) < 1e-12 for a in pts)


def t_cofunction(p):
    q, L = p["params"], p["level"]
    f, g = PAIRS[q.get("pair", 0)]
    if L == 1:
        if q["rad"] == 0:
            al = q["al"]
            ans = 90 - al
            assert 0 < ans < 90
            assert abs(num(TF[f](deg(ans)) - TF[g](deg(al)))) < 1e-12
            return {"answer": ans, "vals": {"ans": ans}}
        qq = frac_of(q["q"])
        ans = F(1, 2) - qq
        assert 0 < ans < F(1, 2)
        assert abs(num(TF[f](S(ans) * PI) - TF[g](S(qq) * PI))) < 1e-12
        Lc = lcm(2, qq.denominator)
        return {"answer": float(ans) * math.pi, "vals": {"L": Lc, "hN": Lc // 2, "qN": qq.numerator * Lc // qq.denominator, "ans": fr(ans)}}
    if L == 2:
        e = SIMP[q["ei"]]
        hits = [i for i, o in enumerate(q["opts"]) if same_fn(e, SIX[o])]
        assert len(hits) == 1, f"options equal to the expression: {hits}"
        assert sp.simplify(e - SIX[q["opts"][hits[0]]]) == 0
        return {"answer": hits[0], "vals": {}}
    a, b, c, d = q["a"], q["b"], q["c"], q["d"]
    sol = sp.solve(sp.Eq(a * X + b + c * X + d, 90), X)
    assert len(sol) == 1
    x0 = sol[0]
    A1, A2 = a * x0 + b, c * x0 + d
    assert 0 < A1 < 90 and 0 < A2 < 90 and x0.is_Integer
    assert abs(num(TF[f](deg(A1)) - TF[g](deg(A2)))) < 1e-12
    return {"answer": int(x0), "vals": {"s1": a + c, "s2": b + d, "Rt": 90 - b - d, "x0": int(x0), "A1": int(A1), "A2": int(A2)}}


# ---- T.5 ----------------------------------------------------------------------------------
def rat_part(e):
    lst = rl(e)
    Lc, rest = lst[0], lst[1:]
    return sum((sp.Rational(rest[i], Lc) for i in range(0, len(rest), 2) if rest[i + 1] == 1), sp.Integer(0))


def rationalize(N, D):
    N, D = exact(N), exact(D)
    Lc = lcm(rl(N)[0], rl(D)[0])
    N1, D1 = exact(N * Lc), exact(D * Lc)
    Dc = exact(2 * rat_part(D1) - D1)
    num2, den2 = exact(N1 * Dc), exact(D1 * Dc)
    assert den2.is_Rational and den2 != 0
    ans = exact(N / D)
    assert sp.simplify(ans - num2 / den2) == 0
    return ans, {"L": Lc, "N1": rl(N1), "D1": rl(D1), "Dc": rl(Dc), "num2": rl(num2), "den2": int(den2)}


def t5(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        rad = q["rad"]
        T = int(frac_of(q["T"]) * 180) if rad else q["T"]
        A, B, sg = (45, 30, -1) if T == 15 else (T - 45, 45, 1)
        assert A + sg * B == T and A % 15 == 0
        f = FN6[q["f"]]
        a, b = deg(A), deg(B)
        vals = {"A": fr(F(A, 180)) if rad else A, "B": fr(F(B, 180)) if rad else B}
        truth = trig(f, deg(T))
        if f == "tan":
            ta, tb = trig("tan", a), trig("tan", b)
            N = ta + sg * tb
            D = 1 - sg * ta * tb
            ans, rz = rationalize(N, D)
            vals.update(ta=rl(ta), tb=rl(tb), N=rl(N), D=rl(D), **rz)
        else:
            sa, ca, sb, cb = trig("sin", a), trig("cos", a), trig("sin", b), trig("cos", b)
            if f == "sin":
                p1, p2 = exact(sa * cb), exact(ca * sb)
                ans = p1 + sg * p2
            else:
                p1, p2 = exact(ca * cb), exact(sa * sb)
                ans = p1 - sg * p2
            vals.update(sa=rl(sa), ca=rl(ca), sb=rl(sb), cb=rl(cb), p1=rl(p1), p2=rl(p2))
        assert sp.simplify(ans - truth) == 0
        vals["ans"] = rl(truth)
        return {"answer": num(truth), "vals": vals}
    sa, cb, qa, qb = S(q["sa"]), S(q["cb"]), q["qa"], q["qb"]
    ca = (-1 if qa in (2, 3) else 1) * sp.sqrt(1 - sa ** 2)
    sb = (-1 if qb in (3, 4) else 1) * sp.sqrt(1 - cb ** 2)
    al, be = sp.atan2(sa, ca), sp.atan2(sb, cb)
    for ang_, qd in ((al, qa), (be, qb)):
        v = num(ang_) % (2 * math.pi)
        assert (qd - 1) * math.pi / 2 < v < qd * math.pi / 2
    plus = q["plus"]
    tot = al + be if plus else al - be
    f = "sin" if q["f"] == 0 else "cos"
    ans = rational(sp.expand_trig(TF[f](tot)))
    car, sbr, sar, cbr = rational(ca), rational(sb), F(int(sa.p), int(sa.q)), F(int(cb.p), int(cb.q))
    if f == "sin":
        p1, p2 = sar * cbr, car * sbr
    else:
        p1, p2 = car * cbr, sar * sbr
    return {"answer": float(ans), "vals": {"yy1": sar.numerator ** 2, "xx1": car.numerator ** 2, "hh1": sar.denominator ** 2,
                                          "xx2": cbr.numerator ** 2, "yy2": sbr.numerator ** 2, "hh2": cbr.denominator ** 2,
                                          "ca": fr(car), "sb": fr(sbr), "p1": fr(p1), "p2": fr(p2), "ans": fr(ans)}}


def value_vals(f, d, rad):
    """The ref/vref values the reference-angle step shows (only outside quadrant I and the axes)."""
    d = F(d) % 360
    if d % 90 == 0 or quadrant(d) == 1:
        return {}
    ref = F(str(ref_angle(d)))
    return {"ref": fr(ref / 180) if rad else int(ref), "vref": rl(trig(f, deg(ref)))}


def signed(qd):
    return (-1 if qd in (2, 3) else 1), (-1 if qd in (3, 4) else 1)


# ---- T.6 ----------------------------------------------------------------------------------
def t6(p):
    q, L = p["params"], p["level"]
    if L == 1:
        v = S(q["v"])
        th = sp.asin(v) if q["given"] == 0 else sp.acos(v)
        sn, cs = rational(sp.sin(th)), rational(sp.cos(th))
        pp, qq, hh = sn.numerator ** 2, cs.numerator ** 2, sn.denominator ** 2
        vals = {"pp": pp, "qq": qq, "hh": hh}
        if q["ask"] == 0:
            ans = rational(sp.expand_trig(sp.sin(2 * th)))
            vals.update(ov=fr(cs if q["given"] == 0 else sn), top=2 * sn.numerator * cs.numerator)
        else:
            ans = rational(sp.expand_trig(sp.cos(2 * th)))
            if q["given"] == 0:
                vals.update(twoS=2 * pp, top=hh - 2 * pp)
            else:
                vals.update(twoS=2 * qq, top=2 * qq - hh)
        vals["ans"] = fr(ans)
        return {"answer": float(ans), "vals": vals}
    if L == 2 and "A2" in q:
        A2, rad, form = q["A2"], q["rad"], q["form"]
        a = deg(F(A2, 2))
        s_, c_, t_ = sp.sin(a), sp.cos(a), sp.tan(a)
        f, expr = [("sin", 2 * s_ * c_), ("cos", c_ ** 2 - s_ ** 2), ("cos", 2 * c_ ** 2 - 1), ("cos", 1 - 2 * s_ ** 2), ("tan", 2 * t_ / (1 - t_ ** 2))][form]
        v = trig(f, deg(A2))
        assert abs(num(expr - v)) < 1e-12
        vals = {"A": fr(F(A2, 360)) if rad else A2 / 2, "A2": fr(F(A2, 180)) if rad else A2, "v": rl(v), **value_vals(f, A2, rad)}
        return {"answer": num(v), "vals": vals}
    if L == 2:
        v, qd = S(q["v"]), q["qd"]
        sx, sy = signed(qd)
        if q["given"] == 0:
            sn, cs = v, sx * sp.sqrt(1 - v ** 2)
        else:
            cs, sn = v, sy * sp.sqrt(1 - v ** 2)
        assert sp.sign(sn) == sy and sp.sign(cs) == sx
        th = sp.atan2(sn, cs)
        snr, csr = rational(sn), rational(cs)
        ov = csr if q["given"] == 0 else snr
        vals = {"gg": int(v.p) ** 2, "oo": ov.numerator ** 2, "hh": snr.denominator ** 2, "ov": fr(ov)}
        if q["ask"] == 0:
            ans = rational(sp.expand_trig(sp.sin(2 * th)))
        else:
            ans = rational(sp.expand_trig(sp.tan(2 * th)))
            t = snr / csr
            vals.update(tanv=fr(t), t2=fr(t * t), den=fr(1 - t * t), top=fr(2 * t))
        vals["ans"] = fr(ans)
        return {"answer": float(ans), "vals": vals}
    if "k" in q:
        c, k = S(q["c"]), q["k"]
        th = sp.acos(c) if k <= 1 else 2 * PI - sp.acos(c)
        assert k * math.pi / 2 < num(th) < (k + 1) * math.pi / 2, "cos θ does not fit the stated interval"
        hf = th / 2
        sH, cH = rational(sp.sin(hf)), rational(sp.cos(hf))
        g = FN6[q["g"]]
        ans = {"sin": sH, "cos": cH, "tan": sH / cH}[g]
        cf = F(int(c.p), int(c.q))
        return {"answer": float(ans), "vals": {"oneM": fr(1 - cf), "oneP": fr(1 + cf), "sH2": fr((1 - cf) / 2), "cH2": fr((1 + cf) / 2),
                                              "sH": fr(sH), "cH": fr(cH), "tH": fr(sH / cH), "lo": fr(F(k, 2)), "hi": fr(F(k + 1, 2)), "q0": fr(F(k, 4)), "q1": fr(F(k + 1, 4))}}
    v = S(q["v"])
    th = sp.asin(v) if q["f"] == 0 else sp.acos(v)
    ans = rational(sp.expand_trig(sp.sin(3 * th) if q["f"] == 0 else sp.cos(3 * th)))
    vf = F(int(v.p), int(v.q))
    return {"answer": float(ans), "vals": {"v3": fr(vf ** 3), "v34": fr(4 * vf ** 3), "v3x": fr(3 * vf), "ans": fr(ans)}}


# ---- T.power-reduction --------------------------------------------------------------------
def t_power(p):
    q, L = p["params"], p["level"]
    if L == 1:
        A2, rad, f = q["A2"], q["rad"], FN6[q["f"]]
        a = deg(F(A2, 2))
        truth = exact(TF[f](a) ** 2)
        c2 = trig("cos", deg(A2))
        vals = {"A": fr(F(A2, 360)) if rad else A2 / 2, "A2": fr(F(A2, 180)) if rad else A2, "c2": rl(c2), **value_vals("cos", A2, rad)}
        if f == "tan":
            ans, rz = rationalize(1 - c2, 1 + c2)
            vals.update(N=rl(1 - c2), D=rl(1 + c2), **rz)
        else:
            ans = exact((1 - c2) / 2 if f == "sin" else (1 + c2) / 2)
        assert sp.simplify(ans - truth) == 0
        vals["ans"] = rl(truth)
        return {"answer": num(truth), "vals": vals}
    if L == 2:
        k, m = q["k"], q["m"]
        h = sp.Rational(k, 2)
        lhs = k * (sp.sin(m * X) if q["f"] == 0 else sp.cos(m * X)) ** 2
        sg = -1 if q["f"] == 0 else 1
        cands = [h + sg * h * sp.cos(2 * m * X), h - sg * h * sp.cos(2 * m * X), h + sg * h * sp.cos(m * X), k + sg * k * sp.cos(2 * m * X)]
        hits = [i for i, c in enumerate(cands) if same_fn(lhs, c)]
        assert len(hits) == 1
        assert sp.simplify(lhs - cands[hits[0]]) == 0
        return {"answer": q["order"].index(hits[0]), "vals": {"h": int(h), "m2": 2 * m}}
    kind, k = q["kind"], q["k"]
    f = k * [sp.cos(X) ** 4, sp.sin(X) ** 4, sp.sin(X) ** 2 * sp.cos(X) ** 2][kind]
    a = sp.integrate(f, (X, 0, 2 * PI)) / (2 * PI)
    b = sp.integrate(f * sp.cos(2 * X), (X, 0, 2 * PI)) / PI
    c = sp.integrate(f * sp.cos(4 * X), (X, 0, 2 * PI)) / PI
    assert same_fn(f, a + b * sp.cos(2 * X) + c * sp.cos(4 * X))
    a, b, c = (F(int(v.p), int(v.q)) for v in (sp.nsimplify(a), sp.nsimplify(b), sp.nsimplify(c)))
    return {"answer": [float(a), float(b), float(c)], "vals": {"a": fr(a), "b": fr(b), "c": fr(c)}}


# ---- T.product-sum ------------------------------------------------------------------------
def t_product_sum(p):
    q, L = p["params"], p["level"]
    if L == 1:
        A, B, ty = q["A"], q["B"], q["type"]
        Sg, D = A + B, A - B
        a, b = deg(A), deg(B)
        truth = exact([sp.sin(a) * sp.cos(b), sp.cos(a) * sp.cos(b), sp.sin(a) * sp.sin(b)][ty])
        if ty == 0:
            v1, v2 = trig("sin", deg(Sg)), trig("sin", deg(D))
            sm = v1 + v2
        else:
            v1, v2 = trig("cos", deg(D)), trig("cos", deg(Sg))
            sm = v1 + v2 if ty == 1 else v1 - v2
        assert sp.simplify(sm / 2 - truth) == 0
        return {"answer": num(truth), "vals": {"S": Sg, "D": D, "v1": rl(v1), "v2": rl(v2), "sum": rl(sm), "ans": rl(truth)}}
    if L == 2:
        A, B, ty = q["A"], q["B"], q["type"]
        a, b = deg(A), deg(B)
        truth = exact([sp.sin(a) + sp.sin(b), sp.sin(a) - sp.sin(b), sp.cos(a) + sp.cos(b), sp.cos(a) - sp.cos(b)][ty])
        M1, M2 = (A + B) // 2, (A - B) // 2
        assert M1 * 2 == A + B and M2 * 2 == A - B
        f1, f2 = [("sin", "cos"), ("cos", "sin"), ("cos", "cos"), ("sin", "sin")][ty]
        v1, v2 = trig(f1, deg(M1)), trig(f2, deg(M2))
        return {"answer": num(truth), "vals": {"M1": M1, "M2": M2, "sAB": A + B, "dAB": A - B, "v1": rl(v1), "v2": rl(v2), "ans": rl(truth)}}
    pp, qq, ty = q["p"], q["q"], q["type"]
    s_, d_ = sp.sin, sp.cos
    sn = lambda k: sp.sin(k * X)
    cs = lambda k: sp.cos(k * X)
    sv, dv = sp.Rational(pp + qq, 2), sp.Rational(pp - qq, 2)
    lhs = [sn(pp) + sn(qq), sn(pp) - sn(qq), cs(pp) + cs(qq), cs(pp) - cs(qq), 2 * sn(pp) * cs(qq)][ty]
    cands = [
        [2 * sn(sv) * cs(dv), 2 * cs(sv) * sn(dv), 2 * sn(pp + qq) * cs(pp - qq), -2 * sn(sv) * cs(dv)],
        [2 * cs(sv) * sn(dv), 2 * sn(sv) * cs(dv), 2 * cs(pp + qq) * sn(pp - qq), -2 * cs(sv) * sn(dv)],
        [2 * cs(sv) * cs(dv), 2 * sn(sv) * sn(dv), 2 * cs(pp + qq) * cs(pp - qq), -2 * cs(sv) * cs(dv)],
        [-2 * sn(sv) * sn(dv), 2 * sn(sv) * sn(dv), -2 * cs(sv) * cs(dv), -2 * sn(pp + qq) * sn(pp - qq)],
        [sn(pp + qq) + sn(pp - qq), sn(pp + qq) - sn(pp - qq), cs(pp + qq) + cs(pp - qq), sn(sv) + sn(dv)],
    ][ty]
    hits = [i for i, c in enumerate(cands) if same_fn(lhs, c)]
    assert len(hits) == 1
    return {"answer": q["order"].index(hits[0]), "vals": {"s": int(sv), "d": int(dv), "pq": pp + qq, "pmq": pp - qq}}


# ---- T.9 ----------------------------------------------------------------------------------
def t9(p):
    q, L = p["params"], p["level"]
    if L == 1:
        A, B, D = q["A"], S(q["B"]), q["D"]
        fn = sp.sin if q["f"] == 0 else sp.cos
        y = A * fn(B * X) + D
        per = 2 / abs(B)
        assert sp.simplify(y.subs(X, X + per * PI) - y) == 0
        amp = abs(A)
        ans = [amp, per * PI, D, D + amp, D - amp][q["ask"]]
        perf = F(int(per.p), int(per.q))
        return {"answer": num(ans), "vals": {"amp": amp, "per": fr(perf), "ans": fr(perf) if q["ask"] == 1 else int(ans)}}
    if L == 2:
        A, Pd, D = q["A"], q["Pd"], q["D"]
        fn = sp.sin if q["f"] == 0 else sp.cos
        B = sp.Rational(2, Pd)
        y = A * fn(B * PI * X) + D
        xs = [sp.Rational(j * Pd, 4) for j in range(9)]
        ys = [y.subs(X, x) for x in xs]
        mx, mn = max(ys), min(ys)
        p0 = next(x for x, v in zip(xs, ys) if v == mx)
        tr = next(x for x, v in zip(xs, ys) if v == mn and x > p0)
        vals = {"mx": int(mx), "mn": int(mn), "amp": int((mx - mn) / 2), "D": int((mx + mn) / 2), "Pd": Pd, "B": fr(F(2, Pd)),
                "p0": float(p0), "p1": float(p0 + Pd), "tr": float(tr)}
        if "order" in q:
            other = sp.cos if q["f"] == 0 else sp.sin
            cands = [y, A * other(B * PI * X) + D, A * fn(2 * B * PI * X) + D,
                     (D * fn(B * PI * X) + A) if (D != A and D != 0) else (-A * fn(B * PI * X) + D)]
            hits = [i for i, c in enumerate(cands) if same_fn(y, c)]
            assert hits == [0]
            vals["B2"] = fr(F(4, Pd))
            return {"answer": q["order"].index(0), "vals": vals}
        ans = [vals["amp"], Pd, vals["D"]][q["ask"]]
        return {"answer": ans, "vals": vals}
    if q["kind"] == 0:
        Bv, phi = q["Bv"], S(q["phi"])
        C = phi / Bv
        assert same_fn(sp.sin(Bv * X - phi * PI), sp.sin(Bv * (X - C * PI)))
        return {"answer": num(C * PI), "vals": {"C": fr(F(int(C.p), int(C.q)))}}
    Am, c0, Pm = q["Am"], q["c0"], q["Pm"]
    Dm = Am + c0
    t = sp.Symbol("t", real=True)
    h = Dm - Am * sp.cos(2 * PI * t / Pm)
    assert h.subs(t, 0) == c0 and sp.simplify(h.subs(t, sp.Rational(Pm, 2))) == c0 + 2 * Am
    if q["kind"] == 1:
        j = q["j"]
        tv = sp.Rational(Pm * j, 12)
        H = exact(h.subs(t, tv))
        angD = 30 * j
        return {"answer": num(H), "vals": {"Dm": Dm, "d2": 2 * Am, "t": float(tv), "q": fr(F(angD, 180)), "cv": rl(trig("cos", deg(angD))),
                                          "H": rl(H), "Hn": num(H), **value_vals("cos", angD, True)}}
    kq = S(q["kq"])
    H = Dm + kq * Am
    assert H.is_Integer
    sols = sp.solveset(sp.Eq(h, H), t, sp.Interval(0, Pm))
    tv = min(sols, key=lambda v: float(v))
    return {"answer": num(tv), "vals": {"Dm": Dm, "d2": 2 * Am, "H": int(H), "cval": fr(F(int((Dm - H) * 1), Am)), "angQ": fr(F(str(sp.nsimplify(2 * tv / Pm)))), "t": num(tv)}}


# ---- T.harmonic ---------------------------------------------------------------------------
def t_harmonic(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b = q["a"], q["b"]
        f = a * sp.sin(X) + b * sp.cos(X)
        R = sp.sqrt(a * a + b * b)
        assert R.is_Integer
        fl = sp.lambdify(X, f, "math")
        ys = [fl(2 * math.pi * i / 20000) for i in range(20000)]
        assert abs(max(ys) - int(R)) < 1e-6 and abs(min(ys) + int(R)) < 1e-6
        ans = [R, R, -R][q["ask"]]
        return {"answer": int(ans), "vals": {"aa": a * a, "bb": b * b, "ss": a * a + b * b, "h": int(R)}}
    a, b = from_rl(q["a"]), from_rl(q["b"])
    R = exact(sp.sqrt(exact(a * a + b * b)))
    phi = sp.atan2(b, a)
    phd = sp.nsimplify(phi * 180 / PI)
    assert phd.is_Integer and -180 < phd <= 180
    assert same_fn(a * sp.sin(X) + b * sp.cos(X), R * sp.sin(X + phi))
    ref = F(str(ref_angle(int(phd) % 360)))
    vals = {"aa": rl(a * a), "bb": rl(b * b), "ss": rl(a * a + b * b), "R": rl(R), "cph": rl(a / R), "sph": rl(b / R),
            "ref": fr(ref / 180), "phi": fr(F(int(phd), 180))}
    if L == 2:
        return {"answer": [num(R), num(phi)], "vals": vals}
    c = from_rl(q["c"])
    # SymPy's solveset stalls on some surd coefficients: test every multiple of pi/12 exactly instead, then
    # confirm the count (a sinusoid meets a level line twice per period, or once when the line touches a peak).
    f = a * sp.sin(X) + b * sp.cos(X) - c
    sols = [k * PI / 12 for k in range(24) if sp.simplify(exact(f.subs(X, k * PI / 12))) == 0]
    fl = sp.lambdify(X, f, "math")
    changes = sum(1 for i in range(7200) if fl(2 * math.pi * i / 7200) * fl(2 * math.pi * (i + 1) / 7200) < 0)
    assert len(sols) == 2 or (len(sols) == 1 and abs(abs(num(c)) - num(R)) < 1e-12), sols
    assert changes <= len(sols)
    Sv = exact(c / R)
    us = sorted(sp.solveset(sp.sin(X) - Sv, X, sp.Interval.Ropen(0, 2 * PI)), key=num)
    vals.update(S=rl(Sv), us=[fr(F(str(sp.nsimplify(u / PI)))) for u in us], xs=[fr(F(str(sp.nsimplify(x / PI)))) for x in sols])
    return {"answer": [num(x) for x in sols], "vals": vals}


# ---- T.10 ---------------------------------------------------------------------------------
INV = [sp.asin, sp.acos, sp.atan]


def t10(p):
    q, L = p["params"], p["level"]
    if L == 1:
        v = from_rl(q["v"])
        ang_ = INV[q["g"]](v)
        return {"answer": num(ang_), "vals": {"q": fr(F(str(sp.nsimplify(ang_ / PI))))}}
    if L == 2:
        v = S(q["v"])
        th = INV[q["g"]](v)
        f = FN6[q["f"]]
        ans = rational(TF[f](th))
        x, y = rational(sp.cos(th)), rational(sp.sin(th))
        h = x.denominator
        assert y.denominator == h
        X_, Y_ = x.numerator, y.numerator
        pp, qq = (abs(Y_), abs(X_)) if q["g"] in (0, 2) else (abs(X_), abs(Y_))
        return {"answer": float(ans), "vals": {"x": X_, "y": Y_, "h": h, "p": pp, "q": qq, "ans": fr(ans)}}
    if "d" in q:
        g = q["g"]
        d = S(q["d"]) * PI
        v = exact([sp.sin, sp.cos, sp.tan][g](d))
        ans = INV[g](v)
        assert sp.simplify(ans - d) != 0
        return {"answer": num(ans), "vals": {"v": rl(v), "ans": fr(F(str(sp.nsimplify(ans / PI))))}}
    h, Ln = q["h"], q["L"]
    ratio = h / Ln
    A = math.degrees(math.atan(ratio) if q["kind"] == 0 else math.asin(ratio))
    return {"answer": A, "vals": {"ratio": ratio, "A": A}}


# ---- T.solve-equations --------------------------------------------------------------------
def solve_in(expr, lo, hi):
    return sorted(sp.solveset(expr, X, sp.Interval.Ropen(lo, hi)), key=num)


def t_solve(p):
    q, L = p["params"], p["level"]
    f = FN6[q["f"]]
    if L <= 2:
        v = from_rl(q["v"])
        m = 1 if L == 1 else q["m"]
        sols = solve_in(TF[f](m * X) - v, 0, 2 * PI)
        vals = {}
        base = solve_in(TF[f](X) - v, 0, 2 * PI)
        if not (v == 0 or all(sp.nsimplify(b * 2 / PI).is_Integer for b in base)):
            refr = sp.nsimplify(sp.atan(sp.Abs(sp.sin(base[0])) / sp.Abs(sp.cos(base[0]))) * 180 / PI)
            rad = L == 2 or q["rad"]
            vals.update(ref=fr(F(int(refr), 180)) if rad else int(refr), vref=rl(trig(f, deg(int(refr)))))
        if L == 1:
            if q["rad"]:
                vals["xs"] = [fr(F(str(sp.nsimplify(x / PI)))) for x in sols]
                return {"answer": [num(x) for x in sols], "vals": vals}
            ds = [int(sp.nsimplify(x * 180 / PI)) for x in sols]
            vals["xs"] = ds
            return {"answer": ds, "vals": vals}
        Lc = rl(v)[0]
        us = solve_in(TF[f](X) - v, 0, 2 * m * PI)
        vals.update(L=Lc, top=rl(v * Lc), v=rl(v), m2=2 * m, us=[fr(F(str(sp.nsimplify(u / PI)))) for u in us], xs=[fr(F(str(sp.nsimplify(x / PI)))) for x in sols])
        assert len(us) == len(sols)
        return {"answer": [num(x) for x in sols], "vals": vals}
    A, B, C = q["A"], q["B"], q["C"]
    u = sp.Symbol("u")
    roots = sorted(sp.solve(A * u ** 2 + B * u + C, u), key=num)
    assert len(roots) == 2
    sols = []
    for rr in roots:
        if abs(num(rr)) <= 1:
            sols += solve_in(TF[f](X) - rr, 0, 2 * PI)
    sols = sorted(set(sols), key=num)
    assert sols
    for x in sols:
        assert abs(num(A * TF[f](x) ** 2 + B * TF[f](x) + C)) < 1e-12
    r1, r2 = (F(int(rr.p), int(rr.q)) for rr in roots)
    rv1, rv2 = fr(r1), fr(r2)
    # the generator reports the roots in its factor order; compare as a set
    gv = [p["vals"]["r1"], p["vals"]["r2"]]
    assert sorted([frac_of(x) for x in gv]) == [r1, r2]
    return {"answer": [num(x) for x in sols], "vals": {"r1": gv[0], "r2": gv[1], "xs": [fr(F(str(sp.nsimplify(x / PI)))) for x in sols]}}


# ---- T.7 ----------------------------------------------------------------------------------
def t7(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b, C = q["a"], q["b"], q["C"]
        K = exact(sp.Rational(1, 2) * a * b * sp.sin(deg(C)))
        return {"answer": num(K), "vals": {"ab2": fr(F(a * b, 2)), "sC": rl(sp.sin(deg(C))), "K": rl(K), "Kn": num(K)}}
    if L == 2:
        A, B, a = q["A"], q["B"], q["a"]
        assert A + B < 180
        b = sp.Symbol("b", positive=True)
        sol = sp.solve(sp.Eq(b / sp.sin(deg(B)), a / sp.sin(deg(A))), b)
        bv = exact(sol[0])
        return {"answer": num(bv), "vals": {"sA": rl(sp.sin(deg(A))), "sB": rl(sp.sin(deg(B))), "aSB": rl(a * sp.sin(deg(B))), "b": rl(bv), "bn": num(bv)}}
    if q["kind"] == 0:
        A, a, b = q["A"], q["a"], q["b"]
        x = b * sp.sin(deg(A)) / a        # sin B
        count = 0
        if num(x) <= 1:
            B1 = sp.asin(x)
            for Bc in {B1, PI - B1}:
                if num(deg(A) + Bc) < math.pi - 1e-12 and num(Bc) > 1e-12:
                    count += 1
        assert A != 30 or b * sp.sin(deg(A)) == b // 2
        return {"answer": count, "vals": {"h": b // 2, "count": count}}
    d, al, be = q["d"], q["al"], q["be"]
    Fd = 180 - al - be
    AF = d * math.sin(math.radians(be)) / math.sin(math.radians(Fd))
    # check with coordinates: the two sight lines meet at the fire
    xF = AF * math.cos(math.radians(al))
    yF = AF * math.sin(math.radians(al))
    assert abs(math.degrees(math.atan2(yF, d - xF)) - be) < 1e-9
    return {"answer": AF, "vals": {"F": Fd, "sb": math.sin(math.radians(be)), "sF": math.sin(math.radians(Fd)), "AF": AF}}


# ---- T.8 ----------------------------------------------------------------------------------
def t8(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b, C = q["a"], q["b"], q["C"]
        c2 = exact(a * a + b * b - 2 * a * b * sp.cos(deg(C)))
        c = sp.sqrt(c2)
        assert c.is_Integer
        return {"answer": int(c), "vals": {"aa": a * a, "bb": b * b, "ab2": 2 * a * b, "ab": a * b, "cc": int(c2), "c": int(c), "cosC": rl(sp.cos(deg(C)))}}
    if L == 2:
        a, b, c = q["a"], q["b"], q["c"]
        cosC = F(a * a + b * b - c * c, 2 * a * b)
        C = sp.nsimplify(sp.acos(S(cosC)) * 180 / PI)
        assert C.is_Integer
        return {"answer": int(C), "vals": {"aa": a * a, "bb": b * b, "cc": c * c, "top": a * a + b * b - c * c, "ab2": 2 * a * b, "cosC": fr(cosC), "C": int(C)}}
    if q["kind"] == 0:
        t = q["t"]
        d1, d2 = q["v1"] * t, q["v2"] * t
        th0 = q["b2"] - q["b1"]
        # positions from bearings (east = sin, north = cos)
        P1 = (d1 * math.sin(math.radians(q["b1"])), d1 * math.cos(math.radians(q["b1"])))
        P2 = (d2 * math.sin(math.radians(q["b2"])), d2 * math.cos(math.radians(q["b2"])))
        c = math.dist(P1, P2)
        return {"answer": c, "vals": {"d1": d1, "d2": d2, "th0": th0, "c2": c * c, "c": c}}
    a, b, c = q["a"], q["b"], q["c"]
    assert c > b >= a and a + b > c
    cs = (a * a + b * b - c * c) / (2 * a * b)
    C = math.degrees(math.acos(cs))
    return {"answer": C, "vals": {"top": a * a + b * b - c * c, "ab2": 2 * a * b, "cs": cs, "C": C}}


def pi_fr(v):
    """A multiple of pi as {n, d}."""
    return fr(F(str(sp.nsimplify(v / PI))))


# ---- T.triangle-area ----------------------------------------------------------------------
def t_area(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        a, b, c = q["a"], q["b"], q["c"]
        s2 = sp.Rational(a + b + c, 2)
        assert s2.is_Integer
        sv = int(s2)
        prod = sv * (sv - a) * (sv - b) * (sv - c)
        K = sp.sqrt(prod)
        assert K.is_Integer
        C = sp.acos(sp.Rational(a * a + b * b - c * c, 2 * a * b))
        assert sp.simplify(sp.Rational(1, 2) * a * b * sp.sin(C) - K) == 0
        K = int(K)
        vals = {"s": sv, "sa": sv - a, "sb": sv - b, "sc": sv - c, "prod": prod, "K": K}
        if L == 1:
            return {"answer": K, "vals": vals}
        if q["inr"]:
            ans = F(K, sv)
        else:
            ans = F(a * b * c, 4 * K)
            assert sp.simplify(sp.Rational(c, 1) / (2 * sp.sin(C)) - S(ans)) == 0
        vals.update(abc=a * b * c, K4=4 * K, ans=fr(ans))
        return {"answer": float(ans), "vals": vals}
    a, B, C = q["a"], q["B"], q["C"]
    A = 180 - B - C
    sA, sB, sC = (math.sin(math.radians(x)) for x in (A, B, C))
    b = a * sB / sA
    # shoelace with the side a on the x-axis
    P3 = (a - b * math.cos(math.radians(C)), b * math.sin(math.radians(C)))
    K = abs(a * P3[1]) / 2
    return {"answer": K, "vals": {"A": A, "aa": a * a, "sA": sA, "sB": sB, "sC": sC, "K": K}}


# ---- T.11 ---------------------------------------------------------------------------------
def t11(p):
    q, L = p["params"], p["level"]
    if L == 1:
        rr, th = q["r"], S(q["q"]) * PI
        x, y = exact(rr * sp.cos(th)), exact(rr * sp.sin(th))
        return {"answer": [num(x), num(y)], "vals": {"c": rl(sp.cos(th)), "s": rl(sp.sin(th)), "x": rl(x), "y": rl(y)}}
    if L == 2:
        x, y = from_rl(q["x"]), from_rl(q["y"])
        rr = exact(sp.sqrt(exact(x * x + y * y)))
        th = sp.atan2(y, x)
        if num(th) < 0:
            th = th + 2 * PI
        t = exact(y / x)
        ref = sp.atan(sp.Abs(t))
        return {"answer": [num(rr), num(th)], "vals": {"xx": rl(x * x), "yy": rl(y * y), "ss": rl(x * x + y * y), "r": rl(rr), "t": rl(t),
                                                     "ref": pi_fr(ref), "tr": rl(sp.tan(ref)), "q": pi_fr(th)}}
    a, b = q["a"], q["b"]
    h, k = F(a, 2), F(b, 2)
    Sv = h * h + k * k
    R = sp.sqrt(S(Sv))
    assert R.is_Integer
    for t in (0.3, 1.1, 2.0, 2.9):
        rr = a * math.cos(t) + b * math.sin(t)
        x, y = rr * math.cos(t), rr * math.sin(t)
        assert abs((x - h) ** 2 + (y - k) ** 2 - float(Sv)) < 1e-9
    ans = [float(h), float(k)] if q["askC"] else int(R)
    return {"answer": ans, "vals": {"h": float(h), "k2": float(k), "S": float(Sv), "rad": int(R)}}


# ---- T.vectors-polar ----------------------------------------------------------------------
def t_vectors(p):
    q, L = p["params"], p["level"]
    if L == 1:
        m, d = q["m"], q["d"]
        vx, vy = exact(m * sp.cos(deg(d))), exact(m * sp.sin(deg(d)))
        return {"answer": [num(vx), num(vy)], "vals": {"c": rl(sp.cos(deg(d))), "s": rl(sp.sin(deg(d))), "vx": rl(vx), "vy": rl(vy)}}
    if L == 2 and q["kind"] == 0:
        vx, vy = q["vx"], q["vy"]
        m = isqrt(vx * vx + vy * vy)
        assert m * m == vx * vx + vy * vy
        d = math.degrees(math.atan2(vy, vx)) % 360
        return {"answer": [m, d], "vals": {"vxx": vx * vx, "vyy": vy * vy, "mm": m * m, "m": m, "refA": math.degrees(math.atan(abs(vy) / abs(vx))), "dir": d}}
    if L == 2:
        x, y, al = q["x"], q["y"], deg(q["al"])
        Rm = sp.Matrix([[sp.cos(al), -sp.sin(al)], [sp.sin(al), sp.cos(al)]])
        img = Rm * sp.Matrix([x, y])
        xr, yr = exact(img[0]), exact(img[1])
        assert sp.simplify(xr ** 2 + yr ** 2 - x * x - y * y) == 0
        return {"answer": [num(xr), num(yr)], "vals": {"c": rl(sp.cos(al)), "s": rl(sp.sin(al)), "xr": rl(xr), "yr": rl(yr)}}
    F1, a1, F2, a2 = q["F1"], q["a1"], q["F2"], q["a2"]
    c1, s1 = F1 * math.cos(math.radians(a1)), F1 * math.sin(math.radians(a1))
    c2, s2 = F2 * math.cos(math.radians(a2)), F2 * math.sin(math.radians(a2))
    Rx, Ry = c1 + c2, s1 + s2
    mag = math.hypot(Rx, Ry)
    # law of cosines check on the magnitude
    assert abs(mag ** 2 - (F1 ** 2 + F2 ** 2 + 2 * F1 * F2 * math.cos(math.radians(a2 - a1)))) < 1e-6
    d = math.degrees(math.atan2(Ry, Rx)) % 360
    return {"answer": [mag, d], "vals": {"c1": c1, "s1": s1, "c2": c2, "s2": s2, "Rx": Rx, "Ry": Ry, "mag": mag, "dir": d}}


# ---- T.12 ---------------------------------------------------------------------------------
def t12(p):
    q, L = p["params"], p["level"]
    if L == 1:
        if q["kind"] == 0:
            A, B = sp.Matrix(q["A"]), sp.Matrix(q["B"])
            return {"answer": int(A.dot(B)), "vals": {"prods": [a * b for a, b in zip(q["A"], q["B"])], "dot": int(A.dot(B))}}
        a, b, c = q["a"], q["b"], q["c"]
        k = sp.Symbol("k")
        kv = sp.solve(a * k + b * c, k)[0]
        assert kv.is_Integer and kv != 0
        return {"answer": int(kv), "vals": {"bc": b * c, "nbc": -b * c, "k": int(kv)}}
    if L == 2:
        A, B = sp.Matrix(q["A"]), sp.Matrix(q["B"])
        dot, N1, N2 = A.dot(B), A.dot(A), B.dot(B)
        cs = exact(dot / (sp.sqrt(N1) * sp.sqrt(N2)))
        ang_ = sp.nsimplify(sp.acos(cs) * 180 / PI)
        assert ang_.is_Integer and 0 < ang_ < 180
        return {"answer": int(ang_), "vals": {"dot": int(dot), "N1": int(N1), "N2": int(N2), "N12": int(N1 * N2), "nu": rl(sp.sqrt(N1)), "nv": rl(sp.sqrt(N2)), "cos": rl(cs), "ang": int(ang_)}}
    if q["kind"] == 0:
        A, B = sp.Matrix(q["A"]), sp.Matrix(q["B"])
        proj = (A.dot(B) / B.dot(B)) * B
        assert (A - proj).dot(B) == 0
        k = F(int(A.dot(B)), int(B.dot(B)))
        return {"answer": [float(proj[0]), float(proj[1])], "vals": {"dot": int(A.dot(B)), "NB": int(B.dot(B)), "k": fr(k), "p1": fr(k * q["B"][0]), "p2": fr(k * q["B"][1])}}
    Fv, d, al = q["F"], q["d"], q["al"]
    Fvec = sp.Matrix([Fv * sp.cos(deg(al)), Fv * sp.sin(deg(al))])
    W = exact(Fvec.dot(sp.Matrix([d, 0])))
    return {"answer": num(W), "vals": {"Fd": Fv * d, "c": rl(sp.cos(deg(al))), "W": rl(W), "Wn": num(W)}}


# ---- T.complex-polar ----------------------------------------------------------------------
I_ = sp.I


def polar_vals(a, b):
    z = a + I_ * b
    rr = exact(sp.Abs(z))
    th = sp.arg(z)
    ref = sp.atan(sp.Abs(b) / sp.Abs(a))
    return [rl(a * a + b * b), rl(rr), pi_fr(ref), pi_fr(th)], rr, th


def t_complex(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b = from_rl(q["a"]), from_rl(q["b"])
        pv, rr, th = polar_vals(a, b)
        return {"answer": [num(rr), num(th)], "vals": {"p": pv}}
    if L == 2:
        r1, t1, r2, t2, div = q["r1"], q["t1"], q["r2"], q["t2"], q["div"]
        z1 = r1 * (sp.cos(deg(t1)) + I_ * sp.sin(deg(t1)))
        z2 = r2 * (sp.cos(deg(t2)) + I_ * sp.sin(deg(t2)))
        w = sp.expand(sp.simplify(z1 / z2 if div else z1 * z2))
        a, b = exact(sp.re(w)), exact(sp.im(w))
        tot = t1 - t2 if div else t1 + t2
        m = tot % 360
        rr = F(r1, r2) if div else F(r1 * r2)
        return {"answer": [num(a), num(b)], "vals": {"rr": fr(rr), "tot": tot, "m": m, "c": rl(sp.cos(deg(m))), "s": rl(sp.sin(deg(m))), "a": rl(a), "b": rl(b)}}
    a1, b1, a2, b2 = (from_rl(q[k]) for k in ("a1", "b1", "a2", "b2"))
    p1, r1, th1 = polar_vals(a1, b1)
    p2, r2, th2 = polar_vals(a2, b2)
    z1, z2 = a1 + I_ * b1, a2 + I_ * b2
    w = sp.expand(sp.radsimp(z1 / z2)) if q["div"] else sp.expand(z1 * z2)
    rr = exact(sp.Abs(w))
    th = sp.arg(w)
    assert sp.simplify(rr - (r1 / r2 if q["div"] else r1 * r2)) == 0
    tot = th1 - th2 if q["div"] else th1 + th2
    assert abs(math.remainder(num(tot - th), 2 * math.pi)) < 1e-9
    return {"answer": [num(rr), num(th)], "vals": {"p1": p1, "p2": p2, "rr": rl(rr), "tot": pi_fr(tot), "fin": pi_fr(th)}}


# ---- T.13 ---------------------------------------------------------------------------------
def t13(p):
    q, L = p["params"], p["level"]
    if L == 1:
        th = S(q["q"]) * PI
        w = sp.expand(q["r"] * sp.exp(I_ * th))
        a, b = exact(sp.re(w)), exact(sp.im(w))
        return {"answer": [num(a), num(b)], "vals": {"c": rl(sp.cos(th)), "s": rl(sp.sin(th)), "a": rl(a), "b": rl(b)}}
    if L == 2:
        a0, b0, nn = from_rl(q["a0"]), from_rl(q["b0"]), q["n"]
        z = a0 + I_ * b0
        w = sp.expand(z ** nn)
        a, b = exact(sp.re(w)), exact(sp.im(w))
        r0 = exact(sp.Abs(z))
        d = sp.arg(z)
        tot = nn * d
        m = sp.Mod(tot, 2 * PI)
        assert sp.simplify(exact(r0 ** nn) * sp.cos(m) - a) == 0
        return {"answer": [num(a), num(b)], "vals": {"R2": int(exact(r0 ** 2)), "r0": rl(r0), "rn": rl(r0 ** nn), "tot": pi_fr(tot), "m": pi_fr(m), "c": rl(sp.cos(m)), "s": rl(sp.sin(m)),
                                                   "a": rl(a), "b": rl(b), "d": pi_fr(d)}}
    a, b, nn = from_rl(q["a"]), from_rl(q["b"]), q["n"]
    w = a + I_ * b
    z = sp.Symbol("z")
    roots = sp.solve(z ** nn - w, z)
    assert len(roots) == nn
    args = sorted((num(sp.arg(rt_)) % (2 * math.pi) for rt_ in roots))
    Rw = exact(sp.Abs(w))
    th = sp.arg(w)
    if num(th) < 0:
        th += 2 * PI
    rho = sp.root(Rw, nn)
    assert rho.is_Integer
    args_fr = [fr(F(str(sp.nsimplify(x / math.pi, tolerance=1e-12, rational=True)))) for x in args]
    return {"answer": args, "vals": {"Rw": int(Rw), "rho": int(rho), "th": pi_fr(th), "sp": fr(F(2, nn)), "nm1": nn - 1, "args": args_fr}}


# ---- T.hyperbolic -------------------------------------------------------------------------
def t_hyper(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a = S(q["a"])
        x = sp.log(a)
        f = [sp.sinh, sp.cosh, sp.tanh][q["f"]]
        ans = rational(sp.simplify(f(x).rewrite(sp.exp)))
        return {"answer": float(ans), "vals": {"ia": fr(1 / F(int(a.p), int(a.q))), "ans": fr(ans)}}
    if L == 2:
        v = S(q["v"])
        if q["given"] == 0:
            x = sp.asinh(v)
            ch = rational(sp.cosh(x))
            ans = ch if q["ask"] == 1 else rational(sp.tanh(x))
            return {"answer": float(ans), "vals": {"pp": int(v.p) ** 2, "qq": int(v.q) ** 2, "hh": ch.numerator ** 2, "cv": fr(ch), "ans": fr(ans)}}
        x = q["sg"] * sp.acosh(v)
        sh = rational(sp.sinh(x))
        ans = sh if q["ask"] == 0 else rational(sp.tanh(x))
        return {"answer": float(ans), "vals": {"pp": sh.numerator ** 2, "qq": sh.denominator ** 2, "hh": int(v.p) ** 2, "sv": fr(sh), "ans": fr(ans),
                                              "p": abs(sh.numerator), "q": sh.denominator}}
    if "tanh" in q:
        v = S(q["v"])
        val = sp.atanh(v) if q["tanh"] else sp.asinh(v)
        Fv = rational(sp.simplify(sp.exp(val)))
        vf = F(int(v.p), int(v.q))
        if q["tanh"]:
            vals = {"t1": fr(1 + vf), "t2": fr(1 - vf), "t3": fr((1 + vf) / (1 - vf)), "F": fr(Fv)}
        else:
            pp, qq = vf.numerator ** 2, vf.denominator ** 2
            h = isqrt(pp + qq)
            assert h * h == pp + qq
            vals = {"pp": pp, "qq": qq, "hh": h * h, "h": h, "q": vf.denominator, "ph": vf.numerator + h, "F": fr(Fv)}
        return {"answer": math.log(float(Fv)), "vals": vals}
    a, w = q["a"], q["w"]
    ch = math.cosh(w / a)
    return {"answer": a * ch - a, "vals": {"ch": ch, "y1": a * ch, "sag": a * ch - a}}


VERIFY = {
    "T.1": t1, "T.2": t2, "T.angles": t_angles, "T.3": t3, "T.basic-graphs": t_basic_graphs, "T.4": t4,
    "T.cofunction": t_cofunction, "T.5": t5,
    "T.6": t6, "T.power-reduction": t_power, "T.product-sum": t_product_sum, "T.9": t9,
    "T.harmonic": t_harmonic, "T.10": t10, "T.solve-equations": t_solve, "T.7": t7, "T.8": t8,
    "T.triangle-area": t_area, "T.11": t11, "T.vectors-polar": t_vectors, "T.12": t12, "T.complex-polar": t_complex,
    "T.13": t13, "T.hyperbolic": t_hyper,
}


def _no_ties(fn):
    """Rounded answers must not sit on a rounding tie (x.xx5), where two roundings would both be defensible.
    Results are cached by (level, params): the same inputs always give the same answer, and SymPy is slow."""
    cache = {}

    def run(p):
        key = (p["level"], json.dumps(p["params"], sort_keys=True), json.dumps(p.get("vals", {}).get("r1")), json.dumps(p.get("vals", {}).get("r2")))
        if key not in cache:
            cache[key] = fn(p)
        out = cache[key]
        dp = p["answer"].get("dp")
        if dp is not None:
            for v in (out["answer"] if isinstance(out["answer"], list) else [out["answer"]]):
                frac_part = abs(v) * 10 ** dp % 1
                assert abs(frac_part - 0.5) > 1e-6, f"{v} is a rounding tie at {dp} decimals"
        return out
    return run


VERIFY = {k: _no_ties(f) for k, f in VERIFY.items()}
