"""Independent answers for practice/calculus2.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]). SymPy does the calculus
(integrate, series, summation, dsolve, limit) and exact fractions do the arithmetic; the two are
checked against each other. Nothing here is copied from the JavaScript."""
from fractions import Fraction as F
from math import comb, factorial, gcd, isqrt
import math

import sympy as sp

X, Y, T, S, TH, U = sp.symbols("x y t s theta u", real=True)
N_ = sp.symbols("n", integer=True, positive=True)
POS = sp.symbols("xp", positive=True)


def fr(q):
    """A Fraction (or SymPy rational / int) as the {n, d} the generator reports."""
    q = F(q) if not isinstance(q, sp.Basic) else F(int(sp.numer(q)), int(sp.denom(q)))
    return {"n": q.numerator, "d": q.denominator}


def Fz(v):
    """SymPy rational -> Fraction."""
    if isinstance(v, sp.Basic):
        v = sp.simplify(v) if not v.is_Rational else v
    if isinstance(v, (int, F)):
        return F(v)
    assert v.is_Rational, f"not rational: {v}"
    return F(int(v.p), int(v.q))


def R(q):
    q = F(q)
    return sp.Rational(q.numerator, q.denominator)


def frac_of(d):
    return F(d["n"], d["d"]) if isinstance(d, dict) else F(d)


def parts(expr, keys):
    """Split an exact value into rational coefficients of the given basis monomials (1 for the
    rational part). Asserts nothing else is left over."""
    e = sp.expand(sp.expand_log(sp.sympify(expr), force=True))
    cd = e.as_coefficients_dict()
    out = []
    used = set()
    for k in keys:
        k = sp.sympify(k)
        c = cd.get(k, 0)
        used.add(k)
        out.append(Fz(c))
    left = {k: v for k, v in cd.items() if k not in used and v != 0}
    assert not left, f"unexpected terms {left} in {e}"
    return out


def same_value(a, b):
    return abs(float(sp.N(a, 30)) - float(sp.N(b, 30))) < 1e-9 * max(1, abs(float(sp.N(b, 30))))


def poly(coefs, v=X):
    """Coefficient list, lowest power first (Fractions / ints) -> SymPy polynomial."""
    return sum(R(c) * v ** i for i, c in enumerate(coefs))


def js(e):
    """A SymPy expression in the practice parser's syntax."""
    s = str(e).replace("**", "^").replace("log(", "ln(")
    s = s.replace("E", "e")
    return s


def p_of(p, name):
    return frac_of(p["params"][name])



# ==== Techniques of integration ======================================================================
def num_int(expr, lo, hi, v=X):
    return float(sp.Integral(expr, (v, lo, hi)).evalf(30))


def close(a, b):
    a, b = float(a), float(b)
    return abs(a - b) <= 1e-10 * max(1, abs(b))


def log_parts(I, extra=()):
    """An exact value Σ c·ln p (+ c·extra): ([(p, c), ...] for primes in order, [c for extra])."""
    e = sp.expand(sp.expand_log(sp.sympify(I), force=True))
    acc, rest = {}, {}
    for term in sp.Add.make_args(e):
        c, f_ = term.as_coeff_Mul()
        if isinstance(f_, sp.log):
            arg = sp.nsimplify(f_.args[0])
            assert arg.is_Rational and arg > 0, f"log of {arg}"
            for pr, ee in sp.factorint(int(arg.p)).items():
                acc[pr] = acc.get(pr, 0) + c * ee
            for pr, ee in sp.factorint(int(arg.q)).items():
                acc[pr] = acc.get(pr, 0) - c * ee
        else:
            rest[f_] = rest.get(f_, 0) + c
    logs = sorted((pr, Fz(c)) for pr, c in acc.items() if c != 0)
    keys = [sp.sympify(k) for k in extra]
    left = {k: v for k, v in rest.items() if k not in keys and v != 0}
    assert not left, f"unexpected {left}"
    return logs, [Fz(rest.get(k, 0)) for k in keys]


def c2_1(p):
    q, L = p["params"], p["level"]
    if L == 1:
        k, b = q["k"], q["b"]
        I = sp.integrate(X * sp.exp(k * X), (X, 0, b))
        ik, bk, c0 = F(1, k), F(b, k), F(1, k * k)
        c1 = bk - c0
        assert sp.simplify(I - (R(c1) * sp.exp(k * b) + R(c0))) == 0
        return {"answer": float(I), "vals": {"kb": k * b, "k2": k * k, "ik": fr(ik), "bk": fr(bk), "c0": fr(c0), "c1": fr(c1), "nik": fr(-ik)}}
    if L == 2:
        kind = q["kind"]
        if kind == "exp":
            k, b = q["k"], q["b"]
            I = sp.integrate(X ** 2 * sp.exp(k * X), (X, 0, b))
            d1, d2, d3 = F(1, k), F(2, k * k), F(2, k ** 3)
            G = sp.exp(k * X) * (R(d1) * X ** 2 - R(d2) * X + R(d3))
            assert sp.simplify(sp.diff(G, X) - X ** 2 * sp.exp(k * X)) == 0
            A = d1 * b * b - d2 * b + d3
            assert sp.simplify(I - (R(A) * sp.exp(k * b) - R(d3))) == 0
            return {"answer": float(I), "vals": {"kb": k * b, "bb": b * b, "d1": fr(d1), "d2": fr(d2), "d3": fr(d3), "i2": fr(F(1, k * k)), "i3": fr(F(1, k ** 3)), "A": fr(A)}}
        if kind == "trig":
            fn = sp.sin if q["g"] == "sin" else sp.cos
            beta = R(frac_of(q["q"])) * sp.pi
            G = sp.integrate(X ** 2 * fn(X), X)
            assert sp.simplify(sp.diff(G, X) - X ** 2 * fn(X)) == 0
            Gb, G0 = G.subs(X, beta), G.subs(X, 0)
            c2, c1, c0 = parts(Gb, [sp.pi ** 2, sp.pi, 1])
            g0 = Fz(G0)
            I = sp.integrate(X ** 2 * fn(X), (X, 0, beta))
            assert sp.simplify(I - (Gb - G0)) == 0
            return {"answer": float(I), "vals": {"c2": fr(c2), "c1": fr(c1), "c0": fr(c0), "g0": fr(g0), "c0f": fr(c0 - g0), "cb": int(sp.cos(beta)), "sb": int(sp.sin(beta))}}
        m = q["m"]
        I = sp.integrate(X ** m * sp.log(X), (X, 1, sp.E))
        m1 = m + 1
        c0, ce = F(1, m1 * m1), F(m, m1 * m1)
        assert sp.simplify(I - (R(ce) * sp.exp(m1) + R(c0))) == 0
        return {"answer": float(I), "vals": {"m1": m1, "mm": m1 * m1, "im": fr(F(1, m1)), "c0": fr(c0), "ce": fr(ce)}}
    a, b, g = q["a"], q["b"], q["g"]
    fn = sp.sin if g == "sin" else sp.cos
    I = sp.integrate(sp.exp(a * X) * fn(b * X), (X, 0, sp.pi))
    D, sg = a * a + b * b, (-1) ** b
    if g == "sin":
        G = sp.exp(a * X) * (a * sp.sin(b * X) - b * sp.cos(b * X)) / D
        cE, at0 = F(-b * sg, D), F(-b, D)
    else:
        G = sp.exp(a * X) * (a * sp.cos(b * X) + b * sp.sin(b * X)) / D
        cE, at0 = F(a * sg, D), F(a, D)
    assert sp.simplify(sp.diff(G, X) - sp.exp(a * X) * fn(b * X)) == 0
    assert sp.simplify(G.subs(X, 0) - R(at0)) == 0 and sp.simplify(G.subs(X, sp.pi) - R(cE) * sp.exp(a * sp.pi)) == 0
    assert sp.simplify(I - (R(cE) * sp.exp(a * sp.pi) - R(at0))) == 0
    aa = a * a
    return {"answer": float(I), "vals": {"D": D, "aa": aa, "sg": sg, "ia": fr(F(1, a)), "ba": fr(F(b, a)), "ba2": fr(F(b, aa)), "bba2": fr(F(b * b, aa)),
                                         "Da": fr(F(D, aa)), "aD": fr(F(aa, D)), "cE": fr(cE), "at0": fr(at0), "c0": fr(-at0)}}


def c2_2(p):
    q, L = p["params"], p["level"]
    kind = q.get("kind")
    if L == 1 or kind == "five":
        m, nn, odd = q["m"], q["nn"], q["odd"]
        assert m == (3 if L == 1 else 5)
        so, sother = (sp.sin, sp.cos) if odd == "sin" else (sp.cos, sp.sin)
        I = sp.integrate(so(X) ** m * sother(X) ** nn, (X, 0, sp.pi / 2))
        half = (m - 1) // 2
        Iu = sp.integrate((1 - U ** 2) ** half * U ** nn, (U, 0, 1))
        assert sp.simplify(I - Iu) == 0
        coefs = [(1, nn), (-1, nn + 2)] if half == 1 else [(1, nn), (-2, nn + 2), (1, nn + 4)]
        ans = sum(F(c, k + 1) for c, k in coefs)
        assert Fz(I) == ans
        return {"answer": float(ans), "vals": {"ks": [k for _, k in coefs], "ks1": [k + 1 for _, k in coefs], "terms": [fr(F(c, k + 1)) for c, k in coefs], "ans": fr(ans)}}
    if L == 2:
        qq = frac_of(q["q"])
        beta = R(qq) * sp.pi
        if kind == "tan":
            I = sp.integrate(sp.tan(X) ** 2, (X, 0, beta))
            tq1, tq3 = parts(sp.tan(beta), [1, sp.sqrt(3)])
            assert sp.simplify(I - (R(tq1) + R(tq3) * sp.sqrt(3) - beta)) == 0
            return {"answer": float(I), "vals": {"tq1": fr(tq1), "tq3": fr(tq3), "q": fr(qq)}}
        g = q["g"]
        fn = sp.sin if g == "sin" else sp.cos
        sgn = -1 if g == "sin" else 1
        I = sp.integrate(fn(X) ** 2, (X, 0, beta))
        s1, s3 = parts(sp.sin(2 * beta), [1, sp.sqrt(3)])
        c1, c3 = s1 * sgn / 4, s3 * sgn / 4
        assert sp.simplify(I - (R(qq / 2) * sp.pi + R(c1) + R(c3) * sp.sqrt(3))) == 0
        return {"answer": float(I), "vals": {"q": fr(qq), "q2": fr(qq / 2), "s1": fr(s1), "s3": fr(s3), "twoq": fr(2 * qq), "c1": fr(c1), "c3": fr(c3)}}
    a, b = q["a"], q["b"]
    assert a != b and (a + b) % 2 == 1
    I = sp.integrate(sp.sin(a * X) * sp.cos(b * X), (X, 0, sp.pi))
    ans = Fz(I)
    assert ans == F(1, a + b) + F(1 if a > b else -1, abs(a - b))
    return {"answer": float(ans), "vals": {"sum": a + b, "diff": abs(a - b), "amb": a - b, "ans": fr(ans)}}


def c2_trig_sub(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, full = q["a"], q["full"]
        lo = -a if full else 0
        I = sp.integrate(sp.sqrt(a * a - X ** 2), (X, lo, a))
        coef = Fz(sp.simplify(I / sp.pi))
        assert coef == F(a * a, 2 if full else 4)
        return {"answer": float(I), "vals": {"aa": a * a, "lo": lo, "coef": fr(coef)}}
    if L == 2:
        a, kind = q["a"], q["kind"]
        if kind == "tan":
            expr, lo, hi, closed, coef = 1 / (X ** 2 + a * a) ** sp.Rational(3, 2), 0, a, sp.sqrt(2) / (2 * a * a), F(1, 2 * a * a)
            vals = {"aa": a * a, "a3": a ** 3, "coef": fr(coef)}
        elif kind == "sec":
            expr, lo, hi, closed, coef = 1 / (X ** 2 * sp.sqrt(X ** 2 - a * a)), a, 2 * a, sp.sqrt(3) / (2 * a * a), F(1, 2 * a * a)
            vals = {"aa": a * a, "a2": 2 * a, "coef": fr(coef)}
        else:
            assert a % 2 == 0
            expr, lo, hi, closed, coef = 1 / (a * a - X ** 2) ** sp.Rational(3, 2), 0, sp.Rational(a, 2), sp.sqrt(3) / (3 * a * a), F(1, 3 * a * a)
            vals = {"aa": a * a, "a3": a ** 3, "ha": a // 2, "coef": fr(coef)}
        assert close(num_int(expr, lo, hi), sp.N(closed, 30))
        return {"answer": float(closed), "vals": vals}
    h, a, sym, pw = q["h"], q["a"], q["sym"], q["pw"]
    c = h * h + a * a
    lo, hi = (-h - a if sym else -h), -h + a
    expo = 1 if pw == 1 else sp.Rational(3, 2)
    expr = 1 / (X ** 2 + 2 * h * X + c) ** expo
    if pw == 1:
        closed = sp.pi / (2 * a) if sym else sp.pi / (4 * a)
        assert sp.simplify(sp.integrate(expr, (X, lo, hi)) - closed) == 0
    else:
        closed = sp.sqrt(2) / (a * a) if sym else sp.sqrt(2) / (2 * a * a)
        assert close(num_int(expr, lo, hi), sp.N(closed, 30))
    coef = Fz(closed / (sp.pi if pw == 1 else sp.sqrt(2)))
    return {"answer": float(closed), "vals": {"c": c, "hh": h * h, "aa": a * a, "a3": a ** 3, "lo": lo, "hi": hi, "wlo": lo + h, "twoh": 2 * h, "coef": fr(coef)}}


def residue_at(expr, r0, mult=1):
    return Fz(sp.limit(sp.simplify(expr * (X - r0) ** mult), X, r0))


def c2_3(p):
    q, L = p["params"], p["level"]
    if L == 1:
        pp, qq, r1, r2 = q["p"], q["q"], q["r1"], q["r2"]
        expr = (pp * X + qq) / ((X - r1) * (X - r2))
        A, B = residue_at(expr, r1), residue_at(expr, r2)
        assert sp.simplify(sp.apart(expr, X) - (R(A) / (X - r1) + R(B) / (X - r2))) == 0
        return {"answer": [float(A), float(B)], "vals": {"N1": pp * r1 + qq, "N2": pp * r2 + qq, "d12": r1 - r2, "d21": r2 - r1, "A": int(A), "B": int(B)}}
    if L == 2:
        pp, qq, bco, cco, lo, hi = (q[k] for k in ("p", "q", "bco", "cco", "lo", "hi"))
        roots = sorted(sp.solve(X ** 2 + bco * X + cco, X))
        assert len(roots) == 2 and all(rt.is_integer for rt in roots)
        r1, r2 = int(roots[0]), int(roots[1])
        assert r2 < lo  # no singularity on [lo, hi]
        expr = (pp * X + qq) / (X ** 2 + bco * X + cco)
        A, B = residue_at(expr, r1), residue_at(expr, r2)
        I = sp.integrate(expr, (X, lo, hi))
        logs, _ = log_parts(I)
        m = [hi - r1, lo - r1, hi - r2, lo - r2]
        uniq = []
        for v in m:
            if v > 1 and v not in uniq:
                uniq.append(v)
        facn = []
        for v in uniq:
            for pr, e in sorted(sp.factorint(v).items()):
                facn += [pr, e]
        assert logs, "the answer must not be 0"
        return {"answer": float(I), "vals": {"r1": r1, "r2": r2, "N1": pp * r1 + qq, "N2": pp * r2 + qq, "d12": r1 - r2, "nd12": r2 - r1, "A": int(A), "B": int(B),
                                             "m": m, "coefs": [fr(c) for _, c in logs], "primes": [pr for pr, _ in logs], "facNums": facn}}
    rr, n2, n1, n0 = q["r"], q["n2"], q["n1"], q["n0"]
    num = n2 * X ** 2 + n1 * X + n0
    if q["kind"] == "quad":
        expr = num / ((X - rr) * (X ** 2 + 1))
        A = residue_at(expr, rr)
        rest = sp.cancel(expr - R(A) / (X - rr))
        nm, dm = sp.fraction(sp.together(rest))
        assert sp.expand(dm - (X ** 2 + 1)) == 0 or sp.expand(dm + (X ** 2 + 1)) == 0
        sgn = 1 if sp.expand(dm - (X ** 2 + 1)) == 0 else -1
        Pn = sp.Poly(sgn * nm, X)
        B, C = Fz(Pn.coeff_monomial(X)), Fz(Pn.coeff_monomial(1))
        I = sp.integrate(expr, (X, 0, 1))
        logs, (cpi,) = log_parts(I, [sp.pi])
        assert cpi == C / 4
        return {"answer": float(I), "vals": {"A": int(A), "B": int(B), "C": int(C), "Nr": n2 * rr * rr + n1 * rr + n0, "rr1": rr * rr + 1, "m1": 1 - rr, "m0": -rr,
                                             "B2": fr(B / 2), "C4": fr(C / 4), "coefs": [fr(c) for _, c in logs] + [fr(cpi)], "primes": [pr for pr, _ in logs]}}
    lo, hi = q["lo"], q["hi"]
    expr = num / (X ** 2 * (X - rr))
    Bc = residue_at(expr, 0, 2)
    C = residue_at(expr, rr)
    A = Fz(n2) - C
    assert sp.simplify(sp.apart(expr, X) - (R(A) / X + R(Bc) / X ** 2 + R(C) / (X - rr))) == 0
    I = sp.integrate(expr, (X, lo, hi))
    logs, (rat,) = log_parts(I, [1])
    assert rat == Bc * (F(1, lo) - F(1, hi))
    return {"answer": float(I), "vals": {"A": int(A), "B": int(Bc), "C": int(C), "Nr": n2 * rr * rr + n1 * rr + n0, "rsq": rr * rr, "hr": hi - rr, "lr": lo - rr,
                                         "rat": fr(rat), "coefs": [fr(c) for _, c in logs], "primes": [pr for pr, _ in logs]}}


def c2_18(p):
    q, L = p["params"], p["level"]
    if L == 1:
        al, be, ga, a = q["al"], q["be"], q["ga"], q["a"]
        h = frac_of(q["hh"])
        fpol = lambda v: al * v * v + be * v + ga
        b = a + 4 * h
        xs = [a + i * h for i in range(5)]
        fs = [fpol(v) for v in xs]
        S = fs[0] + 2 * (fs[1] + fs[2] + fs[3]) + fs[4]
        T_ = h / 2 * S
        exact = sp.integrate(al * X ** 2 + be * X + ga, (X, a, R(b)))
        # the trapezoid error is exactly −(b − a)h²f″/12 for a quadratic
        assert Fz(exact) - T_ == -(b - a) * h * h * (2 * al) / 12
        return {"answer": float(T_), "vals": {"b": fr(b), "h": fr(h), "h2": fr(h / 2), "xs": [fr(v) for v in xs], "fs": [fr(v) for v in fs], "S": fr(S), "T": fr(T_)}}
    if L == 2:
        nn, h, data = q["nn"], q["h"], q["data"]
        assert nn % 2 == 0 and len(data) == nn + 1
        W = sum(v * (1 if i in (0, nn) else 4 if i % 2 else 2) for i, v in enumerate(data))
        Sv = F(h * W, 3)
        # independent: integrate the interpolating parabola on each pair of intervals
        tot = 0
        for j in range(0, nn, 2):
            pts = [(h * (j + i), data[j + i]) for i in range(3)]
            par = sp.interpolate(pts, X)
            tot += sp.integrate(par, (X, h * j, h * (j + 2)))
        assert Fz(tot) == Sv
        return {"answer": float(Sv), "vals": {"W": W, "Sv": fr(Sv), "approx": float(Sv), "times": [h * i for i in range(nn + 1)], "total": h * nn}}
    fcase, method, E = q["fcase"], q["method"], F(str(q["E"]))
    if fcase == "inv":
        fx, a, b = 1 / X, 1, q["b"]
    elif fcase == "sin":
        fx, a, b = sp.sin(X), 0, sp.pi
    else:
        fx, a, b = X ** 4, 0, q["b"]
    order, pw, cst, root = (2, 3, 12, 2) if method == "trap" else (4, 5, 180, 4)
    der = sp.diff(fx, X, order)
    dom = sp.Interval(a, b)
    K = sp.Max(sp.maximum(der, X, dom), -sp.minimum(der, X, dom))
    K = sp.nsimplify(K)
    Xv = K * (b - a) ** pw / (cst * R(E))
    nmin = 1
    while not (K * (b - a) ** pw / (cst * sp.Integer(nmin) ** root) <= R(E) and (method == "trap" or nmin % 2 == 0)):
        nmin += 1
    return {"answer": nmin, "vals": {"K": int(K), "X": float(Xv), "rt": float(sp.N(Xv ** sp.Rational(1, root), 30)), "N": nmin}}


def c2_4(p):
    q, L = p["params"], p["level"]
    if L == 1:
        if q["kind"] == "exp":
            c, k = q["c"], q["k"]
            I = sp.integrate(c * sp.exp(-k * X), (X, 0, sp.oo))
            return {"answer": float(I), "vals": {"ans": fr(Fz(I))}}
        c, pw, Lo = q["c"], q["p"], q["L"]
        I = sp.integrate(c / X ** pw, (X, Lo, sp.oo))
        return {"answer": float(I), "vals": {"p1": pw - 1, "Lp": Lo ** (pw - 1), "den": (pw - 1) * Lo ** (pw - 1), "ans": fr(Fz(I))}}
    if L == 2:
        kind, k, c = q["kind"], q["k"], q["c"]
        expo = {"half": sp.Rational(1, 2), "cbrt": sp.Rational(1, 3), "cbrt2": sp.Rational(2, 3)}[kind]
        B = k * k if kind == "half" else k ** 3
        I = sp.integrate(c * POS ** (-expo), (POS, 0, B))
        rootB = sp.Integer(B) ** (1 - expo)
        coef = Fz(c / (1 - expo))
        assert sp.simplify(I - R(coef) * rootB) == 0
        return {"answer": float(I), "vals": {"B": B, "rootB": int(rootB), "coef": fr(coef), "ans": fr(Fz(I)), "kk": k * k}}
    order = q["order"]
    if q["type"] == "inf":
        m, k, al, be = frac_of(q["m"]), q["k"], q["al"], q["be"]
        Pv, Qv = k - m, F(k)
        f_ = (POS ** R(m) + al) / (POS ** k + be)
        assert sp.limit(f_ * POS ** R(Pv), POS, sp.oo) == 1
        conv = Pv > 1
    else:
        a, be = frac_of(q["a"]), q["be"]
        Pv, Qv = a, a + 1
        f_ = 1 / (POS ** R(a) * (be + POS))
        assert sp.limit(f_ * POS ** R(a), POS, 0, "+") == sp.Rational(1, be)
        conv = Pv < 1
    index = order.index(0 if conv else 1)
    return {"answer": index, "vals": {"P": fr(Pv), "Q": fr(Qv), "index": index}}


VERIFY = dict({
    "C2.1": c2_1, "C2.2": c2_2, "C2.trig-sub": c2_trig_sub, "C2.3": c2_3, "C2.18": c2_18, "C2.4": c2_4,
})



# ==== Applications of integration =====================================================================
def plist(expr, v=X):
    """Polynomial coefficients, lowest power first, trailing zeros trimmed (as the generator keeps them)."""
    cs = [Fz(c) for c in reversed(sp.Poly(sp.expand(expr), v).all_coeffs())]
    while len(cs) > 1 and cs[-1] == 0:
        cs.pop()
    return cs


def frs(cs):
    return [fr(c) for c in cs]


def antider(cs):
    out = [F(0)] + [F(c) / (i + 1) for i, c in enumerate(cs)]
    while len(out) > 1 and out[-1] == 0:
        out.pop()
    return out


def peval_(cs, v):
    return sum(F(c) * F(v) ** i for i, c in enumerate(cs))


def c2_5(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        m, c = q["m"], q["c"]
        roots = sorted(int(r_) for r_ in sp.solve(X ** 2 - m * X - c, X))
        assert len(roots) == 2
        pp, qq = roots
        mid = F(pp + qq, 2)
        Lm, Qm = m * mid + c, mid * mid
        assert Lm > Qm
        G = [F(0), F(c), F(m, 2), F(-1, 3)]
        assert sp.expand(poly(G) - sp.integrate(m * X + c - X ** 2, X)) == 0
        A = Fz(sp.integrate(m * X + c - X ** 2, (X, pp, qq)))
        assert A == F((qq - pp) ** 3, 6)
        return {"answer": float(A), "vals": {"p": pp, "q": qq, "mid": fr(mid), "Lm": fr(Lm), "Qm": fr(Qm), "G": frs(G), "Gq": fr(peval_(G, qq)), "Gp": fr(peval_(G, pp)), "A": fr(A)}}
    s, pr, b = q["s"], q["pr"], q["b"]
    f_ = X ** 3 - s * X ** 2 + pr * X
    roots = sorted(sp.solve(f_, X))
    assert roots[0] == 0 and roots[2] == b
    a = int(roots[1])
    assert f_.subs(X, sp.Rational(a, 2)) > 0 and f_.subs(X, sp.Rational(a + b, 2)) < 0
    G = antider([0, pr, -s, 1])
    Ga, Gb = peval_(G, a), peval_(G, b)
    A1 = Fz(sp.integrate(f_, (X, 0, a)))
    A2 = Fz(sp.integrate(f_, (X, a, b)))
    assert A1 == Ga and A2 == Gb - Ga
    area = A1 - A2
    return {"answer": float(area), "vals": {"a": a, "G": frs(G), "Ga": fr(Ga), "Gb": fr(Gb), "A2": fr(A2), "area": fr(area)}}


def c2_6(p):
    q, L = p["params"], p["level"]
    if L == 1:
        kind, k, b = q["kind"], q["k"], q["b"]
        fx = {"sqrt": sp.sqrt(POS), "lin": k * POS, "sq": POS ** 2}[kind]
        R2 = plist((fx ** 2).subs(POS, X))
        G = antider(R2)
        val = peval_(G, b)
        V_ = sp.integrate(sp.pi * fx ** 2, (POS, 0, b))
        assert sp.simplify(V_ - R(val) * sp.pi) == 0
        return {"answer": float(V_), "vals": {"R2": frs(R2), "G": frs(G), "val": fr(val)}}
    if L == 2:
        m, k = q["m"], q["k"]
        assert sp.solve(X ** 2 - m * X, X) == [0, m]
        diff = plist((m * X + k) ** 2 - (X ** 2 + k) ** 2)
        G = antider(diff)
        V_ = sp.integrate(sp.pi * ((m * X + k) ** 2 - (X ** 2 + k) ** 2), (X, 0, m))
        val = Fz(V_ / sp.pi)
        assert val == peval_(G, m)
        return {"answer": float(V_), "vals": {"diff": frs(diff), "G": frs(G), "val": fr(val), "nk": -k}}
    shape, rad = q["shape"], q["rad"]
    s_ = 2 * sp.sqrt(rad ** 2 - X ** 2)
    A_ = {"square": s_ ** 2, "equi": sp.sqrt(3) / 4 * s_ ** 2, "semi": sp.pi / 2 * (s_ / 2) ** 2, "right": s_ ** 2 / 4}[shape]
    V_ = sp.integrate(sp.expand(A_), (X, -rad, rad))
    base = {"square": 1, "equi": sp.sqrt(3), "semi": sp.pi, "right": 1}[shape]
    coef = Fz(sp.simplify(V_ / base))
    four3 = F(4 * rad ** 3, 3)
    return {"answer": float(V_), "vals": {"rr": rad * rad, "r3": rad ** 3, "four3": fr(four3), "coef": fr(coef)}}


def c2_shell(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        c, arch, k, axis = q["c"], q["arch"], q["k"], q["axis"]
        h = c * X - X ** 2 if arch else X ** 2
        if L == 2:
            assert arch == 1
        if axis == "y":
            rho, axisX = X, 0
        elif axis == "left":
            rho, axisX = X + k, -k
        else:
            rho, axisX = c + k - X, c + k
        # the axis must not cut the region
        assert axisX <= 0 or axisX >= c
        integrand = plist(rho * h)
        G = antider(integrand)
        V_ = sp.integrate(2 * sp.pi * rho * h, (X, 0, c))
        val = Fz(V_ / (2 * sp.pi))
        assert val == peval_(G, c)
        return {"answer": float(V_), "vals": {"rho": frs(plist(rho)), "integrand": frs(integrand), "G": frs(G), "val": fr(val), "coef": fr(2 * val), "axisX": axisX if L == 2 else 0}}
    Rr, a = q["R"], q["a"]
    hh = Rr * Rr - a * a
    h = isqrt(hh)
    assert h * h == hh
    V_ = sp.integrate(2 * sp.pi * X * 2 * sp.sqrt(Rr ** 2 - X ** 2), (X, a, Rr))
    coef = Fz(V_ / sp.pi)
    assert coef == F(4 * h ** 3, 3)
    return {"answer": float(V_), "vals": {"RR": Rr * Rr, "aa": a * a, "hh": hh, "h": h, "h3": h ** 3, "coef": fr(coef)}}


def c2_7(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b = q["a"], q["b"]
        f_ = sp.Rational(2, 3) * POS ** sp.Rational(3, 2)
        Lv = sp.integrate(sp.sqrt(1 + sp.diff(f_, POS) ** 2), (POS, a, b))
        A, B = isqrt(1 + a), isqrt(1 + b)
        assert A * A == 1 + a and B * B == 1 + b
        return {"answer": float(Lv), "vals": {"A": A, "B": B, "A3": A ** 3, "B3": B ** 3, "a1": 1 + a, "b1": 1 + b, "L": fr(Fz(Lv))}}
    if L == 2:
        fam, b = q["fam"], q["b"]
        if fam == "cube":
            f_, Pp, Qp = POS ** 3 / 6 + 1 / (2 * POS), POS ** 2 / 2, 1 / (2 * POS ** 2)
        elif fam == "quart":
            f_, Pp, Qp = POS ** 4 / 8 + 1 / (4 * POS ** 2), POS ** 3 / 2, 1 / (2 * POS ** 3)
        else:
            f_, Pp, Qp = POS ** 2 / 4 - sp.log(POS) / 2, POS / 2, 1 / (2 * POS)
        d1 = sp.diff(f_, POS)
        assert sp.simplify(d1 - (Pp - Qp)) == 0 and sp.simplify(1 + d1 ** 2 - (Pp + Qp) ** 2) == 0
        G = sp.integrate(Pp + Qp, POS)
        Lv = sp.simplify(G.subs(POS, b) - G.subs(POS, 1))
        assert close(num_int(sp.sqrt(1 + d1 ** 2), 1, b, POS), sp.N(Lv, 30))
        if fam == "log":
            Gb, G1 = F(b * b, 4), F(1, 4)
            logs, (rat,) = log_parts(Lv, [1])
            coefs = [rat] + [c for _, c in logs]
        else:
            Gb, G1 = Fz(G.subs(POS, b)), Fz(G.subs(POS, 1))
            rat = Fz(Lv)
            coefs = [rat]
        assert rat == Gb - G1
        return {"answer": float(Lv), "vals": {"Gb": fr(Gb), "G1": fr(G1), "rat": fr(rat), "coefs": frs(coefs)}}
    if q["kind"] == "cycloid":
        Rr, frac = q["R"], frac_of(q["frac"])
        xt, yt = Rr * (T - sp.sin(T)), Rr * (1 - sp.cos(T))
        sq = sp.diff(xt, T) ** 2 + sp.diff(yt, T) ** 2
        assert sp.simplify(sp.expand_trig(sq - 4 * Rr ** 2 * sp.sin(T / 2) ** 2)) == 0
        Tend = R(frac) * sp.pi
        Lv = sp.integrate(2 * Rr * sp.sin(T / 2), (T, 0, Tend))
        assert close(num_int(sp.sqrt(sq), 0, Tend, T), sp.N(Lv, 30))
        cosv = Fz(sp.cos(Tend / 2))
        return {"answer": float(Lv), "vals": {"R2": 2 * Rr, "R4": 4 * Rr, "cosv": fr(cosv), "L": fr(Fz(Lv)), "frac": fr(frac), "half": fr(frac / 2)}}
    a = q["a"]
    rr = a * (1 + sp.cos(TH))
    Lv = num_int(sp.sqrt(rr ** 2 + sp.diff(rr, TH) ** 2), 0, 2 * sp.pi, TH)
    assert close(Lv, 8 * a)
    return {"answer": 8 * a, "vals": {"L": 8 * a, "a2": 2 * a, "a4": 4 * a}}


def c2_surface(p):
    q, L = p["params"], p["level"]
    if L == 1:
        mn, md, b = q["mn"], q["md"], q["b"]
        m = F(mn, md)
        S_ = sp.integrate(2 * sp.pi * R(m) * X * sp.sqrt(1 + R(m) ** 2), (X, 0, b))
        rt = Fz(sp.sqrt(1 + R(m) ** 2))
        rad, ell = m * b, b * rt
        assert rad.denominator == 1 and ell.denominator == 1
        coef = Fz(S_ / sp.pi)
        assert coef == rad * ell
        return {"answer": float(S_), "vals": {"m": fr(m), "sq": fr(1 + m * m), "rt": fr(rt), "bb": b * b, "rad": int(rad), "ell": int(ell), "coef": fr(coef)}}
    if L == 2:
        Rr, a, b = q["R"], q["a"], q["b"]
        f_ = sp.sqrt(Rr ** 2 - X ** 2)
        g = f_ * sp.sqrt(1 + sp.diff(f_, X) ** 2)
        for xv in (sp.Rational(a + b, 2), sp.Rational(2 * a + b, 3)):
            assert abs(float(g.subs(X, xv)) - Rr) < 1e-12
        S_ = 2 * sp.pi * Rr * (b - a)
        assert close(num_int(2 * sp.pi * g, a, b), sp.N(S_, 30))
        return {"answer": float(S_), "vals": {"RR": Rr * Rr, "w": b - a, "coef": 2 * Rr * (b - a)}}
    a, b = q["a"], q["b"]
    A, B = isqrt(4 * a + 1), isqrt(4 * b + 1)
    assert A * A == 4 * a + 1 and B * B == 4 * b + 1
    coef = F(B ** 3 - A ** 3, 6)
    g = 2 * sp.pi * sp.sqrt(POS) * sp.sqrt(1 + sp.diff(sp.sqrt(POS), POS) ** 2)
    assert sp.simplify(g - sp.pi * sp.sqrt(4 * POS + 1)) == 0
    assert sp.simplify(sp.integrate(sp.pi * sp.sqrt(4 * POS + 1), (POS, a, b)) - R(coef) * sp.pi) == 0
    return {"answer": float(R(coef) * sp.pi), "vals": {"A": A, "B": B, "A3": A ** 3, "B3": B ** 3, "a4": 4 * a + 1, "b4": 4 * b + 1, "coef": fr(coef)}}


def c2_8(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b = q["a"], q["b"]
        fpol = [frac_of(c) for c in q["fpol"]]
        G = antider(fpol)
        I = Fz(sp.integrate(poly(fpol), (X, a, b)))
        avg = I / (b - a)
        return {"answer": float(avg), "vals": {"b": b, "len": b - a, "G": frs(G), "Gb": fr(peval_(G, b)), "Ga": fr(peval_(G, a)), "I": fr(I), "avg": fr(avg)}}
    if L == 2:
        k, b = q["k"], q["b"]
        if q["kind"] == "sq":
            I = Fz(sp.integrate(k * X ** 2, (X, 0, b)))
            avg = I / b
            sols = [s_ for s_ in sp.solve(k * X ** 2 - R(avg), X) if 0 <= s_ <= b]
            assert len(sols) == 1
            j = b // 3
            assert sp.simplify(sols[0] - j * sp.sqrt(3)) == 0
            return {"answer": float(sols[0]), "vals": {"b": b, "I": int(I), "avg": int(avg), "cc": int(sols[0] ** 2), "j": j}}
        I = Fz(sp.integrate(k * sp.sqrt(POS), (POS, 0, b)))
        avg = I / b
        sols = [s_ for s_ in sp.solve(k * sp.sqrt(POS) - R(avg), POS) if 0 <= s_ <= b]
        assert len(sols) == 1
        c = int(sols[0])
        return {"answer": c, "vals": {"b": b, "rb": isqrt(b), "I": fr(I), "avg": fr(avg), "c": c, "rc": isqrt(c), "k2": 2 * k}}
    if q["kind"] == "rms":
        V0 = q["V0"]
        ms = sp.integrate((V0 * sp.sin(120 * sp.pi * T)) ** 2, (T, 0, sp.Rational(1, 60))) * 60
        rms = sp.sqrt(ms)
        return {"answer": float(rms), "vals": {"V2": V0 * V0, "half": F(V0 * V0, 2), "rms": float(rms)}}
    A, B = q["A"], q["B"]
    avg = sp.integrate(A + B * sp.sin(sp.pi * T / 12), (T, 0, 12)) / 12
    return {"answer": float(avg), "vals": {"avg": float(avg), "twoB": 2 * B}}


def c2_work(p):
    q, L = p["params"], p["level"]
    if L == 1:
        F0, d0, dcm = q["F0"], q["d0"], q["dcm"]
        k = F(F0) / F(d0, 100)
        W = Fz(sp.integrate(R(k) * X, (X, 0, sp.Rational(dcm, 100))))
        assert k.denominator == 1
        return {"answer": float(W), "vals": {"k": int(k), "d0m": fr(F(d0, 100)), "dm": fr(F(dcm, 100)), "W": fr(W)}}
    if L == 2:
        Wd, H = q["Wd"], q["H"]
        if q["kind"] == "rect":
            D = q["D"]
            Fz_ = sp.integrate(9800 * Y * Wd, (Y, D, D + H))
            return {"answer": int(Fz_), "vals": {"bot": D + H, "w98": 9800 * Wd, "w49": 4900 * Wd, "dd": (D + H) ** 2 - D * D, "Fz": int(Fz_)}}
        Fz_ = sp.integrate(9800 * Y * sp.Rational(Wd, H) * (H - Y), (Y, 0, H))
        assert Fz_.is_integer
        return {"answer": int(Fz_), "vals": {"Fz": int(Fz_)}}
    cone, Rr, H, sOut, Dp = q["cone"], q["R"], q["H"], q["sOut"], q["Dp"]
    Lh = H + sOut
    if cone:
        assert Dp == H
        W = sp.integrate(9800 * sp.pi * (sp.Rational(Rr, H) * Y) ** 2 * (Lh - Y), (Y, 0, H))
        bracket = F(Lh * H, 3) - F(H * H, 4)
    else:
        W = sp.integrate(9800 * sp.pi * Rr ** 2 * (Lh - Y), (Y, 0, Dp))
        bracket = F(Lh * Dp) - F(Dp * Dp, 2)
    coef = Fz(W / sp.pi)
    assert coef == 9800 * Rr * Rr * bracket and coef.denominator == 1
    return {"answer": float(W), "vals": {"L": Lh, "RR": Rr * Rr, "bracket": fr(bracket), "coef": fr(coef), "approx": float(W), "w98": 9800 * Rr * Rr, "HH": H * H}}


def c2_mass(p):
    q, L = p["params"], p["level"]
    if L == 1:
        ms, xs = q["ms"], q["xs"]
        Mt, mom = sum(ms), sum(m * x_ for m, x_ in zip(ms, xs))
        return {"answer": float(F(mom, Mt)), "vals": {"Mtot": Mt, "mom": mom, "xbar": fr(F(mom, Mt))}}
    if L == 2:
        al, be, Lr = q["al"], q["be"], q["L"]
        rho = al + be * X
        Mm = Fz(sp.integrate(rho, (X, 0, Lr)))
        Mo = Fz(sp.integrate(X * rho, (X, 0, Lr)))
        xb = Mo / Mm
        assert xb > F(Lr, 2)
        return {"answer": float(xb), "vals": {"Mm": fr(Mm), "Mo": fr(Mo), "xbar": fr(xb), "half": fr(F(Lr, 2)), "anti": frs(antider([al, be])), "anti2": frs(antider([0, al, be]))}}
    b = q["b"]
    fpol = [frac_of(c) for c in q["fpol"]]
    f_ = poly(fpol)
    assert all(f_.subs(X, sp.Rational(b * i, 7)) >= 0 for i in range(8))
    A = Fz(sp.integrate(f_, (X, 0, b)))
    My = Fz(sp.integrate(X * f_, (X, 0, b)))
    Mx = Fz(sp.integrate(f_ ** 2 / 2, (X, 0, b)))
    return {"answer": [float(My / A), float(Mx / A)], "vals": {"A": fr(A), "My": fr(My), "Mx": fr(Mx), "xb": fr(My / A), "yb": fr(Mx / A), "half2": frs(plist(f_ ** 2 / 2))}}


VERIFY.update({
    "C2.5": c2_5, "C2.6": c2_6, "C2.shell": c2_shell, "C2.7": c2_7, "C2.surface": c2_surface, "C2.8": c2_8, "C2.work": c2_work, "C2.mass": c2_mass,
})



# ==== Sequences and series =============================================================================
NN = sp.Symbol("N", positive=True, integer=True)


def c2_9(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b, c, dd, e = (q[k] for k in ("a", "b", "c", "dd", "e"))
        lim = sp.limit((a * N_ ** 2 + b * N_ + c) / (dd * N_ ** 2 + e), N_, sp.oo)
        return {"answer": float(lim), "vals": {"L": fr(Fz(lim))}}
    if L == 2:
        if q["kind"] == "e":
            a, b = q["a"], q["b"]
            lim = sp.limit((1 + sp.Rational(a) / N_) ** (b * N_), N_, sp.oo)
            assert sp.simplify(lim - sp.exp(a * b)) == 0
            return {"answer": float(lim), "vals": {"ab": a * b}}
        a = q["a"]
        lim = sp.limit(sp.sqrt(N_ ** 2 + a * N_) - N_, N_, sp.oo)
        return {"answer": float(lim), "vals": {"L": fr(Fz(lim))}}
    Ls = sp.Symbol("L", positive=True)
    if q["kind"] == "sqrt":
        c = q["c"]
        sols = sp.solve(sp.Eq(Ls, sp.sqrt(c + Ls)), Ls)
        assert len(sols) == 1
        m = int(sols[0])
        seq = [sp.Integer(1)]
        for _ in range(40):
            seq.append(sp.sqrt(c + seq[-1]))
        assert all(seq[i + 1] > seq[i] for i in range(10)) and abs(float(seq[-1]) - m) < 1e-9
        return {"answer": m, "vals": {"c": c, "m": m, "m1": m - 1, "nm": 1 - m}}
    rr, s0 = frac_of(q["rr"]), q["s0"]
    a_ = F(0)
    for _ in range(200):
        a_ = rr * a_ + s0
    Lv = F(s0) / (1 - rr)
    assert abs(float(a_ - Lv)) < 1e-9
    return {"answer": float(Lv), "vals": {"omr": fr(1 - rr), "L": fr(Lv)}}


def c2_10(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, rr, st = q["a"], frac_of(q["rr"]), q["start"]
        S_ = sp.summation(a * R(rr) ** N_, (N_, st, sp.oo)) if st == 1 else a + sp.summation(a * R(rr) ** N_, (N_, 1, sp.oo))
        first = a * rr ** st
        return {"answer": float(S_), "vals": {"first": fr(first), "omr": fr(1 - rr), "S": fr(Fz(S_))}}
    if L == 2:
        c, k = q["c"], q["k"]
        S_ = sp.summation(sp.Rational(c) / (N_ * (N_ + k)), (N_, 1, sp.oo))
        j = F(c, k)
        assert j.denominator == 1
        H = sum(F(1, i) for i in range(1, k + 1))
        assert Fz(sp.simplify(S_)) == j * H
        return {"answer": float(j * H), "vals": {"j": int(j), "H": fr(H), "S": fr(j * H), "ks": list(range(1, k + 1))}}
    h, rr = q["h"], frac_of(q["rr"])
    # total distance: the drop plus twice every rebound height
    tot = h + 2 * sp.summation(h * R(rr) ** N_, (N_, 1, sp.oo))
    up = F(h) * rr / (1 - rr)
    assert Fz(tot) == h + 2 * up
    return {"answer": float(tot), "vals": {"rh": fr(rr * h), "rrh": fr(rr * rr * h), "up": fr(up), "tot": fr(Fz(tot))}}


def c2_integral_test(p):
    q, L = p["params"], p["level"]
    if L == 1:
        m, k, j, order = q["m"], q["k"], q["j"], q["order"]
        pv = F(m * k + j, k)
        expr = N_ ** m * N_ ** sp.Rational(j, k)
        assert sp.simplify(expr - N_ ** R(pv)) == 0
        qd = F(j, k) if m >= 1 else F(k, j)
        assert qd != pv
        conv = sp.integrate(X ** -R(pv), (X, 1, sp.oo)).is_finite
        assert bool(conv) == (pv > 1)
        index = order.index(0 if pv > 1 else 1)
        return {"answer": index, "vals": {"p": fr(pv), "qd": fr(qd), "jk": fr(F(j, k)), "index": index}}
    if L == 2:
        kind = q["kind"]
        if kind == "rat":
            a = q["a"]
            I = sp.integrate(X / (X ** 2 + a) ** 2, (X, 1, sp.oo))
            return {"answer": float(I), "vals": {"a1": 1 + a, "ans": fr(Fz(I))}}
        if kind == "gauss":
            c = q["c"]
            I = sp.integrate(c * X * sp.exp(-X ** 2), (X, 1, sp.oo))
            assert sp.simplify(I - sp.Rational(c, 2) * sp.exp(-1)) == 0
            return {"answer": float(I), "vals": {"cc": fr(F(c, 2))}}
        I = sp.integrate(1 / (POS * sp.log(POS) ** 2), (POS, 2, sp.oo))
        assert sp.simplify(I - 1 / sp.log(2)) == 0
        return {"answer": float(I), "vals": {}}
    pw, E = q["p"], F(str(q["E"]))
    tail = sp.integrate(X ** -pw, (X, NN, sp.oo))
    Nm = 1
    while not (tail.subs(NN, Nm) <= R(E)):
        Nm += 1
    inv = int(1 / E)
    Xv = F(inv, pw - 1)
    return {"answer": Nm, "vals": {"p1": pw - 1, "inv": inv, "X": float(Xv), "rt": float(Xv) ** (1 / (pw - 1)), "N": Nm}}


def c2_comparison(p):
    q, L = p["params"], p["level"]
    if L == 1:
        pv = frac_of(q["p"])
        conv = pv > 1
        if q["kind"] == "plus":
            c = q["c"]
            a_ = 1 / (N_ ** R(pv) + c)
            # the comparison series: 1/n^p above (p > 1) or 1/((1 + c) n^p) below (p ≤ 1)
            for nv_ in range(1, 30):
                av = a_.subs(N_, nv_)
                assert av < sp.Integer(nv_) ** -R(pv) and av >= 1 / ((1 + c) * sp.Integer(nv_) ** R(pv))
            return {"answer": 0 if conv else 1, "vals": {"c1": 1 + c, "p": fr(pv), "index": 0 if conv else 1}}
        k = q["k"]
        assert k >= 2
        return {"answer": 0 if conv else 1, "vals": {"k1": k + 1, "km": k - 1, "p": fr(pv), "index": 0 if conv else 1}}
    if L == 2:
        a, dd, al, be, ga, de = (q[k] for k in ("a", "dd", "al", "be", "ga", "de"))
        b = a + dd
        an = (al * N_ ** a + be) / (ga * N_ ** b + de)
        c = sp.limit(an * N_ ** dd, N_, sp.oo)
        assert 0 < c < sp.oo
        return {"answer": float(c), "vals": {"b": b, "c": fr(Fz(c))}}
    order = q["order"]
    if q["kind"] == "root":
        k, al, be, ga, de = (q[kk] for kk in ("k", "al", "be", "ga", "de"))
        an = (al * N_ + be) / sp.sqrt(ga * ga * N_ ** k + de)
        Pv = F(k, 2) - 1
        ratio = sp.limit(an * N_ ** R(Pv), N_, sp.oo)
        assert ratio == sp.Rational(al, ga)
        Qv = F(k - 1)
        assert sp.limit(an * N_ ** R(Qv), N_, sp.oo) == sp.oo
        conv = Pv > 1
        index = order.index(0 if conv else 1)
        return {"answer": index, "vals": {"gg": ga * ga, "P": fr(Pv), "Q": fr(Qv), "kh": fr(F(k, 2)), "ratio": fr(F(al, ga)), "index": index}}
    A, B, c = q["A"], q["B"], q["c"]
    an = (sp.Integer(A) ** N_ + N_) / (sp.Integer(B) ** N_ + c)
    assert sp.limit(an / sp.Rational(A, B) ** N_, N_, sp.oo) == 1
    conv = A < B
    index = order.index(0 if conv else 1)
    return {"answer": index, "vals": {"rg": fr(F(A, B)), "rq": fr(F(B, A)), "index": index}}


def c2_11(p):
    q, L = p["params"], p["level"]
    if L == 1:
        if q["kind"] == "fact":
            b = q["b"]
            an = sp.Integer(b) ** N_ / sp.factorial(N_)
            Lv = sp.limit(sp.simplify(sp.combsimp(an.subs(N_, N_ + 1) / an)), N_, sp.oo)
            return {"answer": float(Lv), "vals": {}}
        k, c, dd = q["k"], q["c"], q["dd"]
        an = N_ ** k * sp.Rational(c, dd) ** N_
        Lv = sp.limit(sp.simplify(an.subs(N_, N_ + 1) / an), N_, sp.oo)
        return {"answer": float(Lv), "vals": {"L": fr(Fz(Lv))}}
    if L == 2:
        al, be, ga, de = (q[k] for k in ("al", "be", "ga", "de"))
        Lv = sp.limit((al * N_ + be) / (ga * N_ + de), N_, sp.oo)
        assert Lv != 1
        return {"answer": float(Lv), "vals": {"L": fr(Fz(Lv))}}
    kind, E = q["kind"], F(str(q["E"]))
    bfun = {"fact": lambda k: sp.factorial(k), "sq": lambda k: k * k, "cube": lambda k: k ** 3, "pow2": lambda k: 2 ** k}[kind]
    # smallest N with b_{N+1} ≤ E (the terms decrease to 0)
    Nm = 0
    while not (sp.Integer(1) / bfun(Nm + 1) <= R(E)):
        Nm += 1
    m = Nm + 1
    return {"answer": Nm, "vals": {"inv": int(1 / E), "m": m, "m0": m - 1, "bm": int(bfun(m)), "bm0": int(bfun(m - 1)), "N": Nm}}


def c2_abs_conv(p):
    q, L = p["params"], p["level"]
    if L == 1:
        pv = frac_of(q["p"])
        idx = 0 if pv > 1 else 1
        assert pv > 0
        return {"answer": idx, "vals": {"index": idx, "p": fr(pv)}}
    if L == 2:
        k, al, be, ga, de = (q[kk] for kk in ("k", "al", "be", "ga", "de"))
        b_ = (al * X + be) / (ga * X ** k + de)
        lim0 = sp.limit(b_, X, sp.oo)
        if k == 1:
            assert lim0 != 0
            idx = 2
        else:
            assert lim0 == 0
            # decreasing for x ≥ 1
            num = sp.numer(sp.together(sp.diff(b_, X)))
            if k == 2:
                assert all(num.subs(X, xv) < 0 for xv in range(1, 40)) and sp.Poly(num, X).LC() < 0
            absum = sp.limit(b_ * X ** (k - 1), X, sp.oo)
            assert 0 < absum < sp.oo
            idx = 1 if k == 2 else 0
        return {"answer": idx, "vals": {"index": idx, "ag": fr(F(al, ga)), "alga": al * ga, "bg2": 2 * be * ga, "alde": al * de}}
    kind = q["kind"]
    if kind == "geo":
        k, b = q["k"], q["b"]
        an = N_ ** k / sp.Integer(b) ** N_
        Lv = sp.limit(sp.simplify(an.subs(N_, N_ + 1) / an), N_, sp.oo)
        assert Lv < 1
        return {"answer": 0, "vals": {"index": 0, "L": fr(Fz(Lv))}}
    if kind == "grow":
        k, b = q["k"], q["b"]
        assert sp.limit(sp.Integer(b) ** N_ / N_ ** k, N_, sp.oo) == sp.oo
        return {"answer": 2, "vals": {"index": 2}}
    if kind == "fact":
        k = q["k"]
        assert sp.limit(sp.Integer(k) ** N_ / sp.factorial(N_), N_, sp.oo) == 0
        assert sp.simplify(sp.summation(sp.Integer(k) ** N_ / sp.factorial(N_), (N_, 1, sp.oo)) - (sp.exp(k) - 1)) == 0
        return {"answer": 0, "vals": {"index": 0}}
    if kind == "log":
        assert sp.limit(1 / sp.log(X + 1), X, sp.oo) == 0
        return {"answer": 1, "vals": {"index": 1}}
    assert sp.limit(sp.log(sp.log(POS)), POS, sp.oo) == sp.oo
    return {"answer": 1, "vals": {"index": 1}}


def c2_12(p):
    q, L = p["params"], p["level"]
    if L == 1:
        kind, k, b = q["kind"], q["k"], q["b"]
        c = {"npow": N_ ** k / sp.Integer(b) ** N_, "bpow": sp.Integer(b) ** N_ / N_ ** k, "over": 1 / (N_ ** k * sp.Integer(b) ** N_)}[kind]
        Rr = sp.limit(sp.simplify(c / c.subs(N_, N_ + 1)), N_, sp.oo)
        return {"answer": float(Rr), "vals": {"R": fr(Fz(Rr))}}
    if L == 2:
        a, b, k, sg = q["a"], q["b"], q["k"], q["sg"]
        lo, hi = a - b, a + b

        def conv_at(sign):   # Σ sign^n / n^k
            if k == 0:
                return False
            if k == 2:
                return True
            return sign < 0
        # check with SymPy's summation where it decides
        for sign, want in ((sg, conv_at(sg)), (-sg, conv_at(-sg))):
            if k >= 1:
                sval = sp.summation(sp.Integer(sign) ** N_ / N_ ** k, (N_, 1, sp.oo))
                assert sval.is_finite == want
        index = (1 if conv_at(-sg) else 0) + (2 if conv_at(sg) else 0)
        return {"answer": index, "vals": {"lo": lo, "hi": hi, "index": index}}
    kind = q["kind"]
    if kind == "lac":
        b = q["b"]
        sq = isqrt(b)
        assert sq * sq == b
        return {"answer": sq, "vals": {"sq": sq}}
    if kind == "nn":
        c = N_ ** N_ / sp.factorial(N_)
        Rr = sp.limit(sp.combsimp(c / c.subs(N_, N_ + 1)), N_, sp.oo)
        assert sp.simplify(Rr - sp.exp(-1)) == 0
        return {"answer": float(Rr), "vals": {}}
    c = sp.factorial(2 * N_) / sp.factorial(N_) ** 2
    if kind == "cbinv":
        c = 1 / c
    Rr = sp.limit(sp.combsimp(c / c.subs(N_, N_ + 1)), N_, sp.oo)
    return {"answer": float(Rr), "vals": {"R": fr(Fz(Rr))}}


def c2_13(p):
    q, L = p["params"], p["level"]
    if L == 1:
        fn, a, k = q["fn"], q["a"], q["k"]
        f_ = {"exp": sp.exp(a * X), "sin": sp.sin(a * X), "cos": sp.cos(a * X)}[fn]
        coef = sp.series(f_, X, 0, k + 1).removeO().coeff(X, k)
        deriv = sp.diff(f_, X, k).subs(X, 0)
        assert coef == deriv / sp.factorial(k)
        return {"answer": float(coef), "vals": {"ak": a ** k, "kf": factorial(k), "deriv": int(deriv), "coef": fr(Fz(coef))}}
    if L == 2:
        fn, a = q["fn"], q["a"]
        f_ = {"sqrt": sp.sqrt(POS), "inv": 1 / POS, "inv2": 1 / POS ** 2}[fn]
        f0, f1, f2 = (Fz(sp.diff(f_, POS, i).subs(POS, a)) for i in range(3))
        P2 = sp.series(f_, POS, a, 3).removeO()
        return {"answer": js(P2.subs(POS, X)), "vals": {"f0": fr(f0), "f1": fr(f1), "f2": fr(f2), "c2": fr(f2 / 2)}}
    cube, m, h = q["cube"], q["m"], q["h"]
    a = m ** 3 if cube else m * m
    f_ = POS ** (sp.Rational(1, 3) if cube else sp.Rational(1, 2))
    c1 = F(1, 3 * m * m) if cube else F(1, 2 * m)
    f2 = F(-2, 9 * m ** 5) if cube else F(-1, 4 * m ** 3)
    assert abs(float(sp.diff(f_, POS).subs(POS, a)) - float(c1)) < 1e-12 and abs(float(sp.diff(f_, POS, 2).subs(POS, a)) - float(f2)) < 1e-12
    approx = m + c1 * h + f2 / 2 * h * h
    P2 = sp.series(f_, POS, a, 3).removeO()
    assert abs(float(P2.subs(POS, a + h)) - float(approx)) < 1e-12
    truth = float(sp.N(f_.subs(POS, a + h), 30))
    assert abs(float(approx) - truth) < 0.01
    return {"answer": float(approx), "vals": {"a": a, "N": a + h, "c1": fr(c1), "c2": fr(f2 / 2), "f2": fr(f2), "hh": h * h, "approx": fr(approx), "truth": truth}}


def c2_maclaurin(p):
    q, L = p["params"], p["level"]
    if L == 1:
        kind, c, j = q["kind"], q["c"], q["j"]
        f_, pw = {"exp": (sp.exp(c * X ** 2), 2 * j), "geo": (1 / (1 - c * X ** 2), 2 * j), "geo1": (1 / (1 + c * X), j), "xexp": (X * sp.exp(c * X), j + 1)}[kind]
        coef = sp.series(f_, X, 0, pw + 1).removeO().coeff(X, pw)
        return {"answer": float(coef), "vals": {"pw": pw, "cj": c ** j, "mcj": (-c) ** j, "jf": factorial(j), "coef": fr(Fz(coef))}}
    if L == 2:
        k, nn, b = frac_of(q["k"]), q["nn"], q["b"]
        coef = sp.series((1 + b * X) ** R(k), X, 0, nn + 1).removeO().coeff(X, nn)
        factors = [k - i for i in range(nn)]
        top = F(1)
        for v in factors:
            top *= v
        binom = top / factorial(nn)
        assert Fz(coef) == binom * b ** nn
        return {"answer": float(coef), "vals": {"factors": frs(factors), "top": fr(top), "nf": factorial(nn), "binom": fr(binom), "bn": b ** nn, "coef": fr(Fz(coef))}}
    kind, a = q["kind"], q["a"]
    num, pw = {"exp": (sp.exp(a * X) - 1 - a * X, 2), "cos": (1 - sp.cos(a * X), 2), "sin": (sp.sin(a * X) - a * X, 3),
               "ln": (sp.log(1 + a * X) - a * X, 2), "atan": (sp.atan(a * X) - a * X, 3)}[kind]
    lim = sp.limit(num / X ** pw, X, 0)
    return {"answer": float(lim), "vals": {"a2": a * a, "a3": a ** 3, "lead": fr(Fz(lim))}}


def c2_taylor_remainder(p):
    q, L = p["params"], p["level"]
    if L == 1:
        fn, b, nn = q["fn"], frac_of(q["b"]), q["nn"]
        f_ = sp.sin(X) if fn == "sin" else sp.cos(X)
        d = sp.diff(f_, X, nn + 1)
        assert d in (sp.sin(X), -sp.sin(X), sp.cos(X), -sp.cos(X))
        bound = b ** (nn + 1) / factorial(nn + 1)
        # the true error really is within the bound
        err = abs(float(f_.subs(X, R(b)) - sp.series(f_, X, 0, nn + 1).removeO().subs(X, R(b))))
        assert err <= float(bound) + 1e-15
        return {"answer": float(bound), "vals": {"n1": nn + 1, "bp": fr(b ** (nn + 1)), "nf": factorial(nn + 1), "bound": fr(bound)}}
    if L == 2:
        b, Mb, E = frac_of(q["b"]), q["Mb"], F(str(q["E"]))
        assert sp.exp(R(b)) < Mb
        bnd = lambda k: Mb * b ** (k + 1) / factorial(k + 1)
        nn = 0
        while bnd(nn) > E:
            nn += 1
        return {"answer": nn, "vals": {"prev": fr(bnd(nn - 1)), "cur": fr(bnd(nn)), "prevd": float(bnd(nn - 1)), "curd": float(bnd(nn)), "nn": nn, "nm": nn - 1}}
    if q["kind"] == "sqrt":
        m, h = q["m"], q["h"]
        a = m * m
        d2 = sp.diff(sp.sqrt(POS), POS, 2)
        Mv = Fz(sp.maximum(sp.Abs(d2), POS, sp.Interval(a, a + h)))
        bound = Mv * h * h / 2
        return {"answer": float(bound), "vals": {"a": a, "ah": a + h, "m3": m ** 3, "M": fr(Mv), "bound": fr(bound)}}
    h, nn = frac_of(q["h"]), q["nn"]
    d = sp.diff(sp.log(POS), POS, nn + 1)
    Mv = Fz(sp.maximum(sp.Abs(d), POS, sp.Interval(1, 1 + R(h))))
    assert Mv == factorial(nn)
    bound = Mv * h ** (nn + 1) / factorial(nn + 1)
    return {"answer": float(bound), "vals": {"xv": fr(1 + h), "h": fr(h), "n1": nn + 1, "nf": factorial(nn), "bound": fr(bound)}}


VERIFY.update({
    "C2.9": c2_9, "C2.10": c2_10, "C2.integral-test": c2_integral_test, "C2.comparison": c2_comparison, "C2.11": c2_11,
    "C2.abs-conv": c2_abs_conv, "C2.12": c2_12, "C2.13": c2_13, "C2.maclaurin": c2_maclaurin, "C2.taylor-remainder": c2_taylor_remainder,
})



# ==== Parametric and polar curves, differential equations ===============================================
YF = sp.Function("y")


def c2_14(p):
    q, L = p["params"], p["level"]
    a, b, c, dd, t0 = (q[k] for k in ("a", "b", "c", "dd", "t0"))
    xt, yt = a * T ** 2 + b * T, c * T ** 3 + dd * T
    xd, yd = sp.diff(xt, T).subs(T, t0), sp.diff(yt, T).subs(T, t0)
    assert xd != 0
    m = Fz(yd / xd)
    vals = {"xd": int(xd), "yd": int(yd), "a2": 2 * a, "c3": 3 * c, "m": fr(m)}
    if L == 1:
        return {"answer": float(m), "vals": vals}
    x0, y0 = int(xt.subs(T, t0)), int(yt.subs(T, t0))
    if L == 2:
        bint = F(y0) - m * x0
        # the line touches the curve: y(t) − line(x(t)) has a double root at t0
        g = sp.expand(yt - (R(m) * xt + R(bint)))
        assert g.subs(T, t0) == 0 and sp.diff(g, T).subs(T, t0) == 0
        vals.update({"x0": x0, "y0": y0, "bint": fr(bint)})
        return {"answer": f"({m.numerator}/{m.denominator})*x + ({bint.numerator}/{bint.denominator})", "vals": vals}
    dydx = sp.diff(yt, T) / sp.diff(xt, T)
    d2 = Fz(sp.simplify((sp.diff(dydx, T) / sp.diff(xt, T)).subs(T, t0)))
    ydd, xdd = 6 * c * t0, 2 * a
    num, den = ydd * int(xd) - int(yd) * xdd, int(xd) ** 3
    assert F(num, den) == d2
    del vals["m"]
    vals.update({"ydd": ydd, "xdd": xdd, "num": num, "den": den, "d2": fr(d2)})
    return {"answer": float(d2), "vals": vals}


def c2_15(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a = q["a"]
        if q["kind"] == "limacon":
            b = q["b"]
            assert a > b > 0
            A = sp.integrate((a + b * sp.cos(TH)) ** 2, (TH, 0, 2 * sp.pi)) / 2
            coef = Fz(A / sp.pi)
            return {"answer": float(A), "vals": {"aa": a * a, "bb": b * b, "ab2": 2 * a * b, "aa2": 2 * a * a, "tot": 2 * a * a + b * b, "coef": fr(coef)}}
        k = q["k"]
        lim = sp.pi / (2 * k)
        assert sp.cos(k * lim) == 0
        A = sp.integrate((a * sp.cos(k * TH)) ** 2, (TH, -lim, lim)) / 2
        return {"answer": float(A), "vals": {"aa": a * a, "k2": 2 * k, "coef": fr(Fz(A / sp.pi))}}
    if L == 2:
        a, b, trig, ang = q["a"], q["b"], q["trig"], R(frac_of(q["ang"])) * sp.pi
        rr = a + b * (sp.sin(TH) if trig == "sin" else sp.cos(TH))
        xq, yq = rr * sp.cos(TH), rr * sp.sin(TH)
        den = sp.diff(xq, TH).subs(TH, ang)
        assert den != 0
        m = Fz(sp.simplify(sp.diff(yq, TH).subs(TH, ang) / den))
        rp = sp.diff(rr, TH).subs(TH, ang)
        return {"answer": float(m), "vals": {"sn": int(sp.sin(ang)), "cs": int(sp.cos(ang)), "rr": int(rr.subs(TH, ang)), "rp": int(rp), "num": int(sp.diff(yq, TH).subs(TH, ang)),
                                             "den": int(den), "m": fr(m), "ang": fr(frac_of(q["ang"]))}}
    a, b = q["a"], q["b"]
    assert a >= b
    A = sp.integrate(((a + b * sp.cos(TH)) ** 2 - a * a) / 2, (TH, -sp.pi / 2, sp.pi / 2))
    c1, cpi = parts(A, [1, sp.pi])
    assert c1 == 2 * a * b and cpi == F(b * b, 4)
    return {"answer": float(A), "vals": {"ab2": 2 * a * b, "bb": b * b, "c4": fr(F(b * b, 4))}}


def c2_ode_basics(p):
    q, L = p["params"], p["level"]
    if L == 1:
        sg, B, C = q["sg"], q["B"], q["C"]
        roots = sorted(int(v) for v in sp.solve(sg * Y ** 2 + B * Y + C, Y))
        assert len(roots) == 2
        return {"answer": roots, "vals": {"p": roots[0], "q": roots[1]}}
    if L == 2:
        pp, qq, c, semi = q["p"], q["q"], q["c"], q["semi"]
        f_ = c * (Y - pp) ** (2 if semi else 1) * (Y - qq)
        d1 = sp.diff(f_, Y).subs(Y, pp)
        if semi:
            assert d1 == 0 and sp.sign(f_.subs(Y, pp - sp.Rational(1, 2))) == sp.sign(f_.subs(Y, pp + sp.Rational(1, 2)))
            idx = 2
        else:
            idx = 0 if d1 < 0 else 1
        return {"answer": idx, "vals": {"index": idx}}
    K, rr, P0, H = q["K"], frac_of(q["rr"]), q["P0"], frac_of(q["H"])
    Pp = sp.Symbol("P")
    f_ = R(rr) * Pp * (1 - Pp / K) - R(H)
    eq = sorted(sp.solve(f_, Pp))
    assert len(eq) == 2 and all(e.is_integer for e in eq)
    P1, P2 = int(eq[0]), int(eq[1])
    assert sp.diff(f_, Pp).subs(Pp, P2) < 0 < sp.diff(f_, Pp).subs(Pp, P1)
    assert P0 > P1
    return {"answer": P2, "vals": {"H": fr(H), "P1": P1, "P2": P2, "pp": P1 * P2}}


def c2_16(p):
    q, L = p["params"], p["level"]
    if L == 1:
        T_, k = q["T"], q["k"]
        kk = sp.Symbol("kk")
        if q["kind"] == "grow":
            N0 = q["N0"]
            rate = sp.solve(sp.exp(kk * T_) - 2, kk)[0]
            sol = sp.dsolve(sp.Eq(YF(T).diff(T), rate * YF(T)), YF(T), ics={YF(0): N0}).rhs
            Nt = sp.simplify(sol.subs(T, T_ * k))
            return {"answer": int(Nt), "vals": {"k": k, "Nt": int(Nt), "tt": T_ * k}}
        m0 = q["m0"]
        rate = sp.solve(sp.exp(kk * T_) - sp.Rational(1, 2), kk)[0]
        sol = sp.dsolve(sp.Eq(YF(T).diff(T), rate * YF(T)), YF(T), ics={YF(0): m0}).rhs
        mt = Fz(sp.simplify(sol.subs(T, T_ * k)))
        return {"answer": float(mt), "vals": {"k": k, "tt": T_ * k, "pk": 2 ** k, "mt": fr(mt)}}
    if L == 2:
        kind = q["kind"]
        if kind == "circle":
            a, x1 = q["a"], q["x1"]
            sols = sp.dsolve(sp.Eq(YF(X).diff(X), X / YF(X)), YF(X), ics={YF(0): a})
            sols = sols if isinstance(sols, list) else [sols]
            v = [s_.rhs.subs(X, x1) for s_ in sols if s_.rhs.subs(X, 0) == a][0]
            c = int(v)
            return {"answer": c, "vals": {"aa": a * a, "xx": x1 * x1, "cc": c * c, "c": c}}
        if kind == "expo":
            m, k, y0, x1 = q["m"], q["k"], q["y0"], q["x1"]
            sol = sp.dsolve(sp.Eq(YF(X).diff(X), k * X ** m * YF(X)), YF(X), ics={YF(0): y0}).rhs
            v = sp.simplify(sol.subs(X, x1))
            E = F(k * x1 ** (m + 1), m + 1)
            assert E.denominator == 1 and sp.simplify(v - y0 * sp.exp(int(E))) == 0
            return {"answer": float(v), "vals": {"m1": m + 1, "km": fr(F(k, m + 1)), "E": int(E)}}
        y0, x1 = q["y0"], q["x1"]
        sol = sp.dsolve(sp.Eq(YF(X).diff(X), X * YF(X) ** 2), YF(X), ics={YF(0): y0}).rhs
        v = Fz(sp.simplify(sol.subs(X, x1)))
        kk_ = -y0
        # the solution exists on [0, x1]: its denominator never vanishes there
        assert all(sp.simplify(sp.denom(sp.together(sol))).subs(X, sp.Rational(i * x1, 10)) != 0 for i in range(11))
        return {"answer": float(v), "vals": {"C": fr(F(1, kk_)), "k2": -2 * kk_, "xx": x1 * x1, "den": 2 + kk_ * x1 * x1, "ans": fr(v)}}
    Ta, t1 = q["Ta"], q["t1"]
    kk = sp.Symbol("kk", positive=True)
    if q["kind"] == "exact":
        D0, rho, m = q["D0"], frac_of(q["rho"]), q["m"]
        T0, T1 = Ta + D0, Ta + rho * D0
        sol = sp.dsolve(sp.Eq(YF(T).diff(T), -kk * (YF(T) - Ta)), YF(T), ics={YF(0): T0}).rhs
        kv_ = sp.solve(sp.Eq(sol.subs(T, t1), R(T1)), kk)[0]
        Tm = Fz(sp.simplify(sol.subs(kk, kv_).subs(T, m * t1)))
        Dm = Tm - Ta
        assert T0 <= 99
        return {"answer": float(Tm), "vals": {"T0": T0, "T1": fr(T1), "D1": fr(rho * D0), "rho": fr(rho), "Dm": fr(Dm), "Tm": fr(Tm), "mt": m * t1}}
    D0, D1, D2 = q["D0"], q["D1"], q["D2"]
    T0 = Ta + D0
    sol = sp.dsolve(sp.Eq(YF(T).diff(T), -kk * (YF(T) - Ta)), YF(T), ics={YF(0): T0}).rhs
    kv_ = sp.solve(sp.Eq(sol.subs(T, t1), Ta + D1), kk)[0]
    tt = sp.solve(sp.Eq(sol.subs(kk, kv_), Ta + D2), T)[0]
    return {"answer": float(tt), "vals": {"T0": T0, "T1": Ta + D1, "T2": Ta + D2, "k": float(kv_), "l1": math.log(D0 / D1), "l2": math.log(D0 / D2), "tt": float(tt)}}


def c2_17(p):
    q, L = p["params"], p["level"]
    kind = q["kind"]
    if kind == "lin":
        al, be, ga, y0, h, N = q["al"], q["be"], q["ga"], q["y0"], frac_of(q["h"]), q["N"]
        f_ = lambda tt, yy: al * tt + be * yy + ga
        ts, ys, ms = [F(0)], [F(y0)], []
        for _ in range(N):
            m = f_(ts[-1], ys[-1])
            ms.append(m)
            ys.append(ys[-1] + h * m)
            ts.append(ts[-1] + h)
        # independent route: each step must follow the tangent of SymPy's slope field exactly
        fs = al * T + be * Y + ga
        for i in range(N):
            assert R(ys[i + 1]) == R(ys[i]) + R(h) * fs.subs({T: R(ts[i]), Y: R(ys[i])})
        return {"answer": float(ys[-1]), "vals": {"ts": frs(ts), "ys": frs(ys), "ms": frs(ms), "idx": list(range(N))}}
    if kind == "cool":
        kk, h, Ta, T0 = frac_of(q["kk"]), q["h"], q["Ta"], q["T0"]
        Ts, ms = [F(T0)], []
        for _ in range(3):
            m = -kk * (Ts[-1] - Ta)
            ms.append(m)
            Ts.append(Ts[-1] + h * m)
        # closed form of the Euler recursion: T_n − Ta = (T0 − Ta)(1 − kh)^n
        assert Ts[3] - Ta == (T0 - Ta) * (1 - kk * h) ** 3
        return {"answer": float(Ts[3]), "vals": {"Ts": frs(Ts), "ms": frs(ms), "times": [0, h, 2 * h], "total": 3 * h}}
    al, be, y0 = q["al"], q["be"], q["y0"]
    f_ = lambda tt, yy: al * tt + be * yy
    if kind == "heun":
        h = F(1, 2)
        ts, ys, k1s, k2s, eul = [F(0)], [F(y0)], [], [], []
        for _ in range(2):
            k1 = f_(ts[-1], ys[-1])
            e_ = ys[-1] + h * k1
            k2 = f_(ts[-1] + h, e_)
            k1s.append(k1); k2s.append(k2); eul.append(e_)
            ys.append(ys[-1] + h / 2 * (k1 + k2))
            ts.append(ts[-1] + h)
        return {"answer": float(ys[-1]), "vals": {"ts": frs(ts), "ys": frs(ys), "k1s": frs(k1s), "k2s": frs(k2s), "eul": frs(eul), "h2": fr(h / 2)}}
    h = frac_of(q["h"])
    hh = h / 2
    k1 = f_(F(0), F(y0))
    yA = y0 + hh * k1
    k2 = f_(hh, yA)
    yB = y0 + hh * k2
    k3 = f_(hh, yB)
    yC = y0 + h * k3
    k4 = f_(h, yC)
    S_ = k1 + 2 * k2 + 2 * k3 + k4
    y1 = y0 + h / 6 * S_
    # RK4 agrees with the Taylor series of the exact solution through h⁴
    exact = sp.dsolve(sp.Eq(YF(T).diff(T), al * T + be * YF(T)), YF(T), ics={YF(0): y0}).rhs
    taylor = sp.series(exact, T, 0, 5).removeO().subs(T, R(h))
    assert Fz(sp.nsimplify(taylor)) == y1
    return {"answer": float(y1), "vals": {"h": fr(h), "hh": fr(hh), "k": frs([k1, k2, k3, k4]), "yA": fr(yA), "yB": fr(yB), "yC": fr(yC), "S": fr(S_), "y1": fr(y1)}}


def c2_linear_ode(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b, y0 = q["a"], q["b"], q["y0"]
        sol = sp.dsolve(sp.Eq(YF(X).diff(X) + a * YF(X), b), YF(X), ics={YF(0): y0}).rhs
        ss, C = F(b, a), F(y0) - F(b, a)
        assert sp.simplify(sol - (R(ss) + R(C) * sp.exp(-a * X))) == 0
        return {"answer": js(sol), "vals": {"ss": fr(ss), "C": fr(C), "na": -a}}
    if L == 2:
        k, m, c, y0 = q["k"], q["m"], q["c"], q["y0"]
        sol = sp.dsolve(sp.Eq(YF(POS).diff(POS) + sp.Rational(k) / POS * YF(POS), c * POS ** m), YF(POS), ics={YF(1): y0}).rhs
        dd = m + k + 1
        cq, C = F(c, dd), F(y0) - F(c, dd)
        assert sp.simplify(sol - (R(cq) * POS ** (m + 1) + R(C) * POS ** -k)) == 0
        return {"answer": js(sp.expand(sol).subs(POS, X)), "vals": {"dd": dd, "mk": m + k, "m1": m + 1, "cq": fr(cq), "C": fr(C)}}
    Vv, cin, rate, Tm, A0 = q["Vv"], F(str(q["cin"])), q["rate"], q["Tm"], q["A0"]
    Af = sp.Function("A")
    sol = sp.dsolve(sp.Eq(Af(T).diff(T), rate * R(cin) - sp.Rational(rate, Vv) * Af(T)), Af(T), ics={Af(0): A0}).rhs
    A = float(sol.subs(T, Tm))
    Vc = Vv * cin
    ex_ = F(rate * Tm, Vv)
    return {"answer": A, "vals": {"rin": float(rate * cin), "rv": rate / Vv, "Vc": float(Vc), "diff": float(A0 - Vc), "ex": float(ex_), "e": math.exp(-float(ex_)), "A": A}}


def c2_second_order(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        b, c = q["b"], q["c"]
        rs = sorted(int(v) for v in sp.solve(S ** 2 + b * S + c, S))
        assert len(rs) == 2
        if L == 1:
            return {"answer": rs, "vals": {"r1": rs[0], "r2": rs[1]}}
        y0, v0 = q["y0"], q["v0"]
        sol = sp.dsolve(YF(X).diff(X, 2) + b * YF(X).diff(X) + c * YF(X), YF(X), ics={YF(0): y0, YF(X).diff(X).subs(X, 0): v0}).rhs
        r1, r2 = rs
        c2 = F(v0 - r1 * y0, r2 - r1)
        c1 = y0 - c2
        assert sp.simplify(sol - (R(c1) * sp.exp(r1 * X) + R(c2) * sp.exp(r2 * X))) == 0 and c1.denominator == 1 and c2.denominator == 1
        return {"answer": js(sol), "vals": {"r1": r1, "r2": r2, "d": r2 - r1, "rhs": v0 - r1 * y0, "c1": int(c1), "c2": int(c2)}}
    cc, kk, x0, v0 = q["cc"], q["kk"], q["x0"], q["v0"]
    sol = sp.dsolve(YF(T).diff(T, 2) + cc * YF(T).diff(T) + kk * YF(T), YF(T), ics={YF(0): x0, YF(T).diff(T).subs(T, 0): v0}).rhs
    D = cc * cc - 4 * kk
    if q["kind"] == "crit":
        assert D == 0
        rr = F(-cc, 2)
        C2 = v0 - rr * x0
        assert sp.simplify(sol - (x0 + R(C2) * T) * sp.exp(R(rr) * T)) == 0
        return {"answer": js(sol), "vals": {"cc": cc, "kk": kk, "rr": int(rr), "C2": int(C2)}}
    assert D < 0
    al, be = F(-cc, 2), sp.sqrt(-D) / 2
    assert be.is_integer
    be = int(be)
    C2 = (v0 - al * x0) / be
    assert sp.simplify(sp.expand_complex(sol - sp.exp(R(al) * T) * (x0 * sp.cos(be * T) + R(C2) * sp.sin(be * T)))) == 0
    return {"answer": js(sol), "vals": {"cc": cc, "kk": kk, "D": D, "al": int(al), "be": be, "ax0": int(al * x0), "bc2": int(be * C2), "C2": int(C2), "ncc": -cc}}


def particular(lhs_coeffs, g):
    """A particular solution of y'' + b y' + c y = g found by SymPy's dsolve (homogeneous part removed)."""
    b, c = lhs_coeffs
    sol = sp.dsolve(YF(X).diff(X, 2) + b * YF(X).diff(X) + c * YF(X) - g, YF(X), hint="nth_linear_constant_coeff_undetermined_coefficients").rhs
    yp_ = sol.subs({s_: 0 for s_ in sol.free_symbols if str(s_).startswith("C")})
    return sp.simplify(yp_)


def c2_undetermined(p):
    q, L = p["params"], p["level"]
    if L == 1:
        b, c, k, K = q["b"], q["c"], q["k"], q["K"]
        Pk = k * k + b * k + c
        A = F(K, Pk)
        ypart = R(A) * sp.exp(k * X)
        assert sp.simplify(ypart.diff(X, 2) + b * ypart.diff(X) + c * ypart - K * sp.exp(k * X)) == 0
        return {"answer": js(ypart), "vals": {"kk": k * k, "bk": b * k, "Pk": Pk, "A": fr(A)}}
    if L == 2:
        b, c, pp, qq = q["b"], q["c"], q["p"], q["q"]
        Ac, Bc = sp.symbols("Ac Bc")
        trial = Ac * X + Bc
        sol = sp.solve(sp.Poly(sp.expand(b * Ac + c * trial - (pp * X + qq)), X).coeffs(), [Ac, Bc])
        ypart = trial.subs(sol)
        assert sp.simplify(ypart.diff(X, 2) + b * ypart.diff(X) + c * ypart - (pp * X + qq)) == 0
        return {"answer": js(ypart), "vals": {"A": fr(Fz(sol[Ac])), "B": fr(Fz(sol[Bc]))}}
    if q["kind"] == "res":
        w, K = q["w"], q["K"]
        ypart = sp.Rational(K, 2 * w) * X * sp.sin(w * X)
        assert sp.simplify(ypart.diff(X, 2) + w * w * ypart - K * sp.cos(w * X)) == 0
        return {"answer": js(ypart), "vals": {"ww": w * w, "w2": 2 * w, "coef": fr(F(K, 2 * w))}}
    b, c, w, K = q["b"], q["c"], q["w"], q["K"]
    Ac, Bc = sp.symbols("Ac Bc")
    trial = Ac * sp.cos(w * X) + Bc * sp.sin(w * X)
    resid = sp.expand(trial.diff(X, 2) + b * trial.diff(X) + c * trial - K * sp.cos(w * X))
    sol = sp.solve([resid.coeff(sp.cos(w * X)), resid.coeff(sp.sin(w * X))], [Ac, Bc])
    ypart = trial.subs(sol)
    assert sp.simplify(ypart.diff(X, 2) + b * ypart.diff(X) + c * ypart - K * sp.cos(w * X)) == 0
    cw, bw = c - w * w, b * w
    return {"answer": js(ypart), "vals": {"ww": w * w, "cw": cw, "bw": bw, "D": cw * cw + bw * bw, "A": fr(Fz(sol[Ac])), "B": fr(Fz(sol[Bc]))}}


TP = sp.Symbol("tp", positive=True)


def c2_laplace(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, k, kind, b, nn, w = q["a"], q["k"], q["kind"], q["b"], q["nn"], q["w"]
        g = {"pow": TP ** nn if nn else 1, "sin": sp.sin(w * TP), "cos": sp.cos(w * TP)}[kind]
        Fs = sp.laplace_transform(a * sp.exp(k * TP) + b * g, TP, S, noconds=True)
        if kind == "pow":
            vals = {"nf": factorial(nn), "cb": b * factorial(nn), "n1": nn + 1}
        else:
            vals = {"ww": w * w, "bw": b * w}
        return {"answer": js(sp.simplify(Fs)), "vals": vals}
    if L == 2:
        al, be, a, b = q["al"], q["be"], q["a"], q["b"]
        Fs = (al * S + be) / ((S - a) * (S - b))
        ft = sp.inverse_laplace_transform(Fs, S, TP)
        A, B = Fz(sp.limit(Fs * (S - a), S, a)), Fz(sp.limit(Fs * (S - b), S, b))
        assert sp.simplify(ft - (R(A) * sp.exp(a * TP) + R(B) * sp.exp(b * TP))) == 0
        return {"answer": js(ft.subs(TP, T)), "vals": {"a": a, "b": b, "A": int(A), "B": int(B)}}
    a, k, K, y0 = q["a"], q["k"], q["K"], q["y0"]
    Ys = (y0 + sp.Rational(K) / (S - k)) / (S + a)
    yt = sp.inverse_laplace_transform(Ys, S, TP)
    sol = sp.dsolve(sp.Eq(YF(T).diff(T) + a * YF(T), K * sp.exp(k * T)), YF(T), ics={YF(0): y0}).rhs
    assert sp.simplify(yt.subs(TP, T) - sol) == 0
    c = F(K, k + a)
    return {"answer": js(sol), "vals": {"c": fr(c), "C": fr(y0 - c), "na": -a, "ka": k + a}}


VERIFY.update({
    "C2.14": c2_14, "C2.15": c2_15, "C2.ode-basics": c2_ode_basics, "C2.16": c2_16, "C2.17": c2_17, "C2.linear-ode": c2_linear_ode,
    "C2.second-order": c2_second_order, "C2.undetermined": c2_undetermined, "C2.laplace": c2_laplace,
})
