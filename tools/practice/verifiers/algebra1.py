"""Independent answers for practice/algebra1.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]). Exact fractions and SymPy;
nothing here is copied from the JavaScript."""
from fractions import Fraction as F
from math import gcd, isqrt, sqrt

import sympy as sp

X, Y = sp.symbols("x y")


def fr(q):  # a Fraction as the {n, d} the generator reports
    q = F(q)
    return {"n": q.numerator, "d": q.denominator}


def lcm(a, b):
    return abs(a * b) // gcd(a, b)


def a1_1(p):
    q = p["params"]
    if p["level"] == 1:
        prod = q["b"] * q["c"]
        return {"answer": q["a"] + prod, "vals": {"prod": prod, "ans": q["a"] + prod}}
    if p["level"] == 2:
        s = q["c"] + q["d"]
        return {"answer": q["a"] - q["b"] * s, "vals": {"sum": s, "prod": q["b"] * s, "ans": q["a"] - q["b"] * s}}
    diff = q["c"] - q["d"]
    sq = q["b"] ** 2
    prod = sq * diff
    assert prod % q["e"] == 0, "division is not exact"
    ans = q["a"] + F(prod, q["e"])
    assert ans.denominator == 1
    return {"answer": int(ans), "vals": {"diff": diff, "sq": sq, "prod": prod, "quot": prod // q["e"], "ans": int(ans)}}


def a1_fractions(p):
    q = p["params"]
    if p["level"] == 1:
        ans = F(q["a"], q["d"]) + F(q["c"], q["d"])
        s = q["a"] + q["c"]
        return {"answer": float(ans), "vals": {"sumN": s, "g": gcd(s, q["d"]), "ans": fr(ans)}}
    if p["level"] == 2:
        L = lcm(q["b"], q["d"])
        an, cn = q["a"] * L // q["b"], q["c"] * L // q["d"]
        top = an - cn if q["sub"] else an + cn
        ans = F(q["a"], q["b"]) - F(q["c"], q["d"]) if q["sub"] else F(q["a"], q["b"]) + F(q["c"], q["d"])
        assert F(top, L) == ans
        return {"answer": float(ans), "vals": {"L": L, "ka": L // q["b"], "kc": L // q["d"], "an": an, "cn": cn, "topN": top, "g": gcd(abs(top), L), "ans": fr(ans)}}
    t1 = q["w1"] * q["b"] + q["a"]
    t2 = q["w2"] * q["d"] + q["c"]
    ans = (q["w1"] + F(q["a"], q["b"])) / (q["w2"] + F(q["c"], q["d"]))
    whole = ans.numerator // ans.denominator
    return {"answer": float(ans), "vals": {"t1": t1, "t2": t2, "num": t1 * q["d"], "den": q["b"] * t2, "whole": whole,
                                          "rem": ans.numerator - whole * ans.denominator, "ans": fr(ans)}}


def a1_2(p):
    q = p["params"]
    if p["level"] == 1:
        s = q["a"] + q["b"]
        assert sp.simplify(X ** q["a"] * X ** q["b"] - X ** s) == 0
        return {"answer": f"x^{s}", "vals": {"s": s}}
    if p["level"] == 2:
        e = q["a"] * q["b"] - q["c"]
        assert sp.simplify((X ** q["a"]) ** q["b"] / X ** q["c"] - X ** e) == 0
        return {"answer": f"x^({e})", "vals": {"pa": q["a"] * q["b"], "e": e}}
    k, a, b, c, d, e, m = (q[n] for n in "kabcdem")
    expr = sp.simplify((k * X ** a * Y ** b) ** c / (m * X ** d * Y ** e))
    coef = F(k ** c, m)
    assert coef.denominator == 1
    ex, ey = a * c - d, b * c - e
    assert sp.simplify(expr - int(coef) * X ** ex * Y ** ey) == 0
    return {"answer": f"{int(coef)}*x^({ex})*y^({ey})", "vals": {"kc": k ** c, "coef": int(coef), "ac": a * c, "bc": b * c, "ex": ex, "ey": ey}}


def squarefree_split(n):
    k, s = 1, n
    f = 2
    while f * f <= s:
        while s % (f * f) == 0:
            s //= f * f
            k *= f
        f += 1
    return k, s


def a1_3(p):
    q = p["params"]
    if p["level"] <= 2:
        N, s = q["N"], q["s"]
        k, s2 = squarefree_split(N)
        assert s2 == s, "the radicand left is not square-free"
        return {"answer": k * sqrt(s), "vals": {"sq": k * k, "k": k}}
    c, d = q["c"], q["d"]
    k, s = squarefree_split(d)
    coef = F(c, k * s)
    assert sp.simplify(sp.Integer(c) / sp.sqrt(d) - sp.Rational(coef.numerator, coef.denominator) * sp.sqrt(s)) == 0
    return {"answer": float(coef) * sqrt(s), "vals": {"k": k, "s": s, "den": k * s, "g": gcd(c, k * s), "coef": fr(coef)}}


def a1_sci(p):
    q = p["params"]
    a, b, m, k = F(str(q["a"])), F(str(q["b"])), q["m"], q["k"]
    if p["level"] < 3:
        prod = a * b
        val = prod * F(10) ** (m + k)
        mant, e = prod, m + k
        while mant >= 10:
            mant /= 10
            e += 1
        assert 1 <= mant < 10
        return {"answer": float(val), "vals": {"raw": float(prod), "sumExp": m + k, "mant": float(mant), "e": e}}
    assert 1 <= a < 10 and 1 <= b < 10
    quo = a / b
    assert 1 <= quo < 10
    return {"answer": float(quo * F(10) ** (m - k)), "vals": {"q": float(quo), "e": m - k}}


def a1_4(p):
    q = p["params"]
    rise, run = q["y2"] - q["y1"], q["x2"] - q["x1"]
    m = F(rise, run)
    return {"answer": float(m), "vals": {"rise": rise, "run": run, "m": fr(m)}}


def a1_5(p):
    q = p["params"]
    if p["level"] == 1:
        mi, bi = q["mi"], q["bi"]
        return {"answer": f"{mi}*x + ({bi})", "vals": {"m": mi, "b": bi, "y1": bi + mi}}
    x1, y1, x2, y2 = q["x1"], q["y1"], q["x2"], q["y2"]
    m = F(y2 - y1, x2 - x1)
    b = y1 - m * x1
    # the line must pass through both points
    assert m * x2 + b == y2
    return {"answer": f"({m.numerator}/{m.denominator})*x + ({b.numerator}/{b.denominator})",
            "vals": {"rise": y2 - y1, "run": x2 - x1, "m": fr(m), "mx1": fr(m * x1), "b": fr(b)}}


def a1_6(p):
    q = p["params"]
    px, py = q["px"], q["py"]
    if p["level"] <= 2:
        m0 = F(q["m0"]["n"], q["m0"]["d"])
        m = -1 / m0 if q["perp"] else m0
        if q["perp"]:
            assert m * m0 == -1
        b = py - m * px
        return {"answer": f"({m.numerator}/{m.denominator})*x + ({b.numerator}/{b.denominator})", "vals": {"m": fr(m), "mpx": fr(m * px), "b": fr(b)}}
    A, B, C = q["A"], q["B"], q["C"]
    m0 = F(-A, B)
    m = F(B, A)
    assert m * m0 == -1
    b = py - m * px
    return {"answer": f"({m.numerator}/{m.denominator})*x + ({b.numerator}/{b.denominator})",
            "vals": {"m0": fr(m0), "cb": fr(F(C, B)), "m": fr(m), "mpx": fr(m * px), "b": fr(b)}}


def a1_func(p):
    q = p["params"]
    t = q["t"]
    if p["level"] == 1:
        return {"answer": q["a"] * t + q["b"], "vals": {"prod": q["a"] * t, "ans": q["a"] * t + q["b"]}}
    if p["level"] == 2:
        ans = q["a"] * t ** 2 + q["b"] * t + q["c"]
        return {"answer": ans, "vals": {"sq": t * t, "A": q["a"] * t * t, "B": q["b"] * t, "ans": ans}}
    inner = q["c"] * t ** 2 + q["d"]
    outer = q["a"] * inner + q["b"]
    return {"answer": outer, "vals": {"tt": t * t, "inner": inner, "ai": q["a"] * inner, "outer": outer}}


def a1_solve(p):
    q = p["params"]
    if p["level"] == 1:
        sol = sp.solve(sp.Eq(q["a"] * X + q["b"], q["c"]), X)[0]
        return {"answer": int(sol), "vals": {"cb": q["c"] - q["b"], "sol": int(sol)}}
    if p["level"] == 2:
        a, b, c, d = q["a"], q["b"], q["c"], q["d"]
        sol = sp.solve(sp.Eq(a * (X + b), c * X + d), X)[0]
        return {"answer": int(sol), "vals": {"ab": a * b, "k": a - c, "rhs": d - a * b, "sol": int(sol)}}
    f1, r1, f2, r2 = q["f1"], q["r1"], q["f2"], q["r2"]
    m = sp.solve(sp.Eq(f1 + r1 * X, f2 + r2 * X), X)[0]
    assert m > 0 and m == int(m)
    return {"answer": int(m), "vals": {"diffF": f1 - f2, "diffR": r2 - r1, "months": int(m)}}


def a1_7(p):
    q = p["params"]
    a, b, c, d = q["a"], q["b"], q["c"], q["d"]
    sols = sp.solve(sp.Abs(a * X + b) - c, X) if False else [sp.Rational(c - b, a), sp.Rational(-c - b, a)]
    for s in sols:
        assert abs(a * s + b) == c
    return {"answer": [float(sols[0]), float(sols[1])],
            "vals": {"rhs": c, "cb1": c - b, "cb2": -c - b, "s1": fr(F(c - b, a)), "s2": fr(F(-c - b, a)), "total": c + d}}


def a1_8(p):
    q = p["params"]
    if p["level"] == 3:
        pa, pc, N, T = q["pa"], q["pc"], q["N"], q["T"]
        a, c = sp.symbols("a c")
        sol = sp.solve([a + c - N, pa * a + pc * c - T], [a, c])
        A, C = int(sol[a]), int(sol[c])
        assert A > 0 and C > 0
        return {"answer": A, "vals": {"N": N, "T": T, "pcN": pc * N, "diff": T - pc * N, "dp": pa - pc, "A": A, "C": C}}
    a1, b1, a2, b2, c1, c2 = (q[k] for k in ("a1", "b1", "a2", "b2", "c1", "c2"))
    sol = sp.solve([a1 * X + b1 * Y - c1, a2 * X + b2 * Y - c2], [X, Y])
    sx, sy = int(sol[X]), int(sol[Y])
    return {"answer": [sx, sy], "vals": {"c1": c1, "c2": c2, "A1": a1 * b2, "C1": c1 * b2, "A2": a2 * b1, "C2": c2 * b1, "bb": b1 * b2,
                                        "k": a1 * b2 - a2 * b1, "rhs": c1 * b2 - c2 * b1, "back": c1 - a1 * sx, "sx": sx, "sy": sy}}


def a1_9(p):
    q = p["params"]
    if p["level"] <= 2:
        a, b, c, d = q["a"], q["b"], q["c"], q["d"]
        e = sp.expand((a * X + b) * (c * X + d))
        F_, mid, L = (int(e.coeff(X, 2)), int(e.coeff(X, 1)), int(e.coeff(X, 0)))
        return {"answer": f"{F_}*x^2 + ({mid})*x + ({L})", "vals": {"F": a * c, "O": a * d, "I": b * c, "L": b * d, "mid": mid}}
    a, b = q["a"], q["b"]
    if q["square"]:
        e = sp.expand((a * X + b) ** 2)
        A2, twoAB, B2 = int(e.coeff(X, 2)), int(e.coeff(X, 1)), int(e.coeff(X, 0))
        return {"answer": f"{A2}*x^2 + ({twoAB})*x + ({B2})", "vals": {"A2": A2, "twoAB": twoAB, "absTwoAB": abs(twoAB), "B2": B2, "absB": abs(b)}}
    e = sp.expand((a * X + b) * (a * X - b))
    assert e.coeff(X, 1) == 0
    return {"answer": f"{int(e.coeff(X, 2))}*x^2 - {-int(e.coeff(X, 0))}", "vals": {"A2": a * a, "B2": b * b, "aB": a * b, "absB": b}}


def a1_10(p):
    q = p["params"]
    if p["level"] == 1:
        fac = sp.factor_list(X ** 2 + q["B"] * X + q["C"])
        roots = sp.solve(X ** 2 + q["B"] * X + q["C"], X)
        assert len(roots) in (1, 2) and all(r == int(r) for r in roots)
        pq = sorted(-int(r) for r in roots) if len(roots) == 2 else [-int(roots[0])] * 2
        gp, gq = p["vals"]["p"], p["vals"]["q"]
        assert sorted([gp, gq]) == pq, f"factors {gp}, {gq} but the roots give {pq}"
        assert fac
        return {"answer": f"(x + ({gp}))*(x + ({gq}))", "vals": {"p": gp, "q": gq, "B": q["B"], "C": q["C"]}}
    if p["level"] == 2:
        a, pp, qq = q["a"], q["p"], q["q"]
        A, B, C = a, a * qq + pp, pp * qq
        assert sp.expand((a * X + pp) * (X + qq)) == sp.expand(A * X ** 2 + B * X + C)
        u, v = a * qq, pp
        assert u + v == B and u * v == A * C
        return {"answer": f"({a}*x + ({pp}))*(x + ({qq}))", "vals": {"A": A, "B": B, "C": C, "AC": A * C, "u": u, "v": v, "p": pp, "q": qq}}
    A, C = q["A"], q["C"]
    g = gcd(A, C)
    s2, k2 = A // g, C // g
    s, k = isqrt(s2), isqrt(k2)
    assert s * s == s2 and k * k == k2, "not a difference of squares after the GCF"
    assert sp.expand(g * (s * X - k) * (s * X + k) - (A * X ** 2 - C)) == 0
    return {"answer": f"{g}*({s}*x - {k})*({s}*x + {k})", "vals": {"g": g, "ss": s2, "kk": k2, "s": s, "k": k}}


def a1_11(p):
    q = p["params"]
    a, b, c = q["a"], q["b"], q["c"]
    D = b * b - 4 * a * c
    roots = sp.solve(a * X ** 2 + b * X + c, X)
    if p["level"] <= 2:
        sD = isqrt(D)
        assert sD * sD == D
        r1, r2 = F(-b + sD, 2 * a), F(-b - sD, 2 * a)
        assert {sp.Rational(r1.numerator, r1.denominator), sp.Rational(r2.numerator, r2.denominator)} == set(roots)
        return {"answer": [float(r1), float(r2)],
                "vals": {"bb": b * b, "ac4": 4 * a * c, "D": D, "sD": sD, "twoA": 2 * a, "nb": -b, "top1": -b + sD, "top2": -b - sD, "r1": fr(r1), "r2": fr(r2)}}
    k, s = squarefree_split(D)
    g = gcd(gcd(abs(b), k), 2 * a)
    vals = sorted(float(r) for r in roots)
    # the shown simplified form must equal the roots
    for sign in (1, -1):
        shown = (sp.Rational(-b, g) + sign * sp.Rational(k, g) * sp.sqrt(s)) / sp.Rational(2 * a, g)
        assert any(sp.simplify(shown - r) == 0 for r in roots)
    return {"answer": [float((-b + sqrt(D)) / (2 * a)), float((-b - sqrt(D)) / (2 * a))],
            "vals": {"D": D, "k": k, "s": s, "kk2": k * k, "g": g, "top": -b // g if b % g == 0 else F(-b, g), "kk": k // g, "den": 2 * a // g, "twoA": 2 * a, "nb": -b}}


def a1_12(p):
    q = p["params"]
    a, b, c = q["a"], q["b"], q["c"]
    h = F(-b, 2 * a)
    k = a * h * h + b * h + c
    # the vertex is the turning point: the derivative 2ax + b is zero there
    assert 2 * a * h + b == 0
    return {"answer": [float(h), float(k)], "vals": {"nb": -b, "twoA": 2 * a, "h": fr(h), "hh": fr(h * h), "ah": fr(a * h * h), "bh": fr(b * h), "k": fr(k)}}


def a1_quadineq(p):
    q = p["params"]
    expr = q["s"] * X ** 2 + q["B"] * X + q["C"]
    roots = sorted(int(r) for r in sp.solve(expr, X))
    assert len(roots) == 2
    sol = sp.solve_univariate_inequality(expr > 0 if q["greater"] else expr < 0, X, relational=False)
    if sol == sp.Interval.open(roots[0], roots[1]):
        inside = 1
    elif sol == sp.Union(sp.Interval.open(-sp.oo, roots[0]), sp.Interval.open(roots[1], sp.oo)):
        inside = 0
    else:
        raise AssertionError(f"unexpected solution set {sol}")
    assert inside == q["inside"], "the prompt's form (between / outside) does not match the solution set"
    return {"answer": roots, "vals": {"p": roots[0], "q": roots[1]}}


def a1_13(p):
    q = p["params"]
    if p["level"] == 1:
        k = F(q["y1"], q["x1"])
        return {"answer": float(k * q["x2"]), "vals": {"k": float(k), "y2": float(k * q["x2"])}}
    if p["level"] == 2:
        kk = q["w1"] * q["days1"]
        d2 = F(kk, q["w2"])
        assert d2.denominator == 1
        return {"answer": int(d2), "vals": {"kk": kk, "days2": int(d2)}}
    k = F(q["z1"], q["x1"] * q["y1"])
    z2 = k * q["x2"] * q["y2"]
    return {"answer": float(z2), "vals": {"xy": q["x1"] * q["y1"], "k": float(k), "z2": float(z2)}}


def a1_14(p):
    q = p["params"]
    if p["level"] == 1:
        part = F(q["pct"] * q["whole"], 100)
        return {"answer": float(part), "vals": {"pw": q["pct"] * q["whole"], "part": float(part)}}
    if p["level"] == 2:
        change = q["nw"] - q["old"]
        pct = F(str(change)) / F(str(q["old"])) * 100
        return {"answer": float(pct), "vals": {"change": change, "pct": float(pct), "nw": q["nw"]}}
    price, p1, p2 = q["price"], q["p1"], q["p2"]
    after1 = F(price) * (100 + p1) / 100
    after2 = after1 * (100 - p2) / 100
    net = (after2 - price) / price * 100
    return {"answer": float(after2), "vals": {"m1": float(F(100 + p1, 100)), "m2": float(F(100 - p2, 100)), "after1": float(after1), "after2": float(after2), "net": float(net)}}


def a1_15(p):
    q = p["params"]
    oi = q["oi"]
    ops = [sp.StrictLessThan, sp.LessThan, sp.StrictGreaterThan, sp.GreaterThan]
    if q["level"] <= 2:
        a, b, c = q["a"], q["b"], q["c"]
        lhs, rhs_ = a * X + b, c
        vals = {"cb": c - b}
    else:
        a, b, cc, d = q["a"], q["b"], q["cc"], q["d"]
        lhs, rhs_ = a * (X - b), cc * X + d
        vals = {"ab": a * b, "k": a - cc, "rhs": d + a * b, "negab": -a * b}
    sol = sp.solve_univariate_inequality(ops[oi](lhs, rhs_), X, relational=False)
    bound = sol.inf if sol.inf != -sp.oo else sol.sup
    assert bound == int(bound)
    bound = int(bound)
    want = [sp.Interval.open(-sp.oo, bound), sp.Interval(-sp.oo, bound), sp.Interval.open(bound, sp.oo), sp.Interval(bound, sp.oo)]
    fi = want.index(sol)
    vals.update({"sol": bound, "fi": fi})
    return {"answer": fi, "vals": vals}


def a1_16(p):
    q = p["params"]
    if p["level"] == 1:
        return {"answer": q["A"] + q["B"] - q["both"], "vals": {"union": q["A"] + q["B"] - q["both"]}}
    if p["level"] == 2:
        return {"answer": q["A"] + q["B"] - q["union"], "vals": {"both": q["A"] + q["B"] - q["union"]}}
    union = q["A"] + q["B"] - q["both"]
    return {"answer": q["U"] - union, "vals": {"union": union, "neither": q["U"] - union}}


VERIFY = {
    "A1.1": a1_1, "A1.fractions": a1_fractions, "A1.2": a1_2, "A1.3": a1_3, "A1.sci": a1_sci, "A1.4": a1_4, "A1.5": a1_5,
    "A1.6": a1_6, "A1.func": a1_func, "A1.solve": a1_solve, "A1.7": a1_7, "A1.8": a1_8, "A1.9": a1_9, "A1.10": a1_10,
    "A1.11": a1_11, "A1.12": a1_12, "A1.quadineq": a1_quadineq, "A1.13": a1_13, "A1.14": a1_14, "A1.15": a1_15, "A1.16": a1_16,
}
