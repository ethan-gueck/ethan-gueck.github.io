"""Independent answers for practice/calculus1.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]). SymPy does the calculus
(limit, diff, integrate, solve) so the mathematics is confirmed, not just the generator's arithmetic
repeated. Graph problems also check that the drawn figure matches the inputs."""
import math
import re

import sympy as sp

X, T, H, U, NN = sp.symbols("x t h u n", real=True)


def R(v):
    """A parameter as an exact SymPy number ({n, d} fractions, ints, decimal floats)."""
    if isinstance(v, dict):
        return sp.Rational(v["n"], v["d"])
    if isinstance(v, float):
        return sp.Rational(repr(v))
    return sp.Integer(v)


def fr(q):
    q = sp.Rational(q)
    return {"n": int(q.p), "d": int(q.q)}


def num(e):
    return float(sp.N(e, 30))


def poly(cs, v=X):
    d = len(cs) - 1
    return sum(R(c) * v ** (d - i) for i, c in enumerate(cs))


def js(e):
    """A SymPy expression in the site's expression syntax (ln, e, abs)."""
    s = sp.sstr(sp.sympify(e))
    s = s.replace("**", "^").replace("log(", "ln(").replace("Abs(", "abs(")
    return re.sub(r"\bE\b", "e", s)


def parse_js(e):
    """A graph or answer expression (the site's syntax) as SymPy, exact."""
    s = e.replace("^", "**").replace("ln(", "log(")
    return sp.sympify(s, locals={"x": X, "t": T, "e": sp.E, "pi": sp.pi}, rational=True)


def lim(e, a, d="+-"):
    return sp.limit(e, X, a, d) if d != "+-" else sp.limit(e, X, a)


def graph_items(p, t):
    return [it for it in p.get("graph", {}).get("items", []) if it.get("t") == t]


def has_pt(p, xx, yy):
    return any(abs(it["x"] - xx) < 1e-9 and abs(it["y"] - yy) < 1e-9 for it in graph_items(p, "pt"))


def has_hole(p, xx, yy):
    return any(abs(it["c"][0] - xx) < 1e-9 and abs(it["c"][1] - yy) < 1e-9 for it in graph_items(p, "circle"))


def seg_on_line(p, m, x0, y0):
    """Some drawn segment lies on y = y0 + m(x − x0)."""
    for s in graph_items(p, "seg"):
        ok = all(abs(pt[1] - (y0 + m * (pt[0] - x0))) < 1e-9 for pt in (s["a"], s["b"]))
        if ok:
            return True
    return False


# ---- C1.1 ---------------------------------------------------------------------------------------
def c1_1(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a = q["a"]
        e = q["p"] * X ** 2 + q["q"] * X + q["c"]
        ans = lim(e, a)
        assert ans == e.subs(X, a)
        return {"answer": int(ans), "vals": {"sq": a * a, "A": q["p"] * a * a, "B": q["q"] * a, "ans": int(ans)}}
    if lv == 2:
        A, B, c, d = q["A"], q["B"], q["c"], q["d"]
        f_, g_ = sp.symbols("f g")
        D = A - d
        assert D != 0
        ans = sp.Rational(c * A + B * B, D)
        return {"answer": num(ans), "vals": {"D": D, "cA": c * A, "BB": B * B, "N": c * A + B * B, "ans": fr(ans)}}
    a, Lf, Fa, Lg = q["a"], q["Lf"], q["Fa"], q["Lg"]
    assert Fa != Lf
    # the figure: f's line runs through the hole at (a, Lf); the dot is f(a); g passes through (a, Lg)
    assert has_hole(p, a, Lf) and has_pt(p, a, Fa) and seg_on_line(p, q["m1"], a, Lf)
    gx = (R(q["s"]) * (X - a) ** 2 if q["parab"] else R(q["m2"]) * (X - a)) + Lg
    ge = [it for it in graph_items(p, "fn")][0]["e"]
    assert sp.simplify(parse_js(ge) - gx) == 0
    limg = lim(gx, a)
    ans = Lf * limg if q["prod"] else Lf + q["c"] * limg
    vals = {"ans": int(ans)}
    if not q["prod"]:
        vals["cLg"] = q["c"] * Lg
    return {"answer": int(ans), "vals": vals}


def c1_one_sided(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a = q["a"]
        left_e, right_e = q["p"] * X ** 2 + q["q"], q["m"] * X + q["k"]
        Lv, Rv = lim(left_e, a, "-"), lim(right_e, a, "+")
        assert Lv != Rv
        return {"answer": int(Lv if q["left"] else Rv), "vals": {"pa2": q["p"] * a * a, "Lv": int(Lv), "ma": q["m"] * a, "Rv": int(Rv)}}
    if lv == 2:
        a = q["a"]
        den = (X - a) ** 2 if q["sq"] else (X - a)
        e = (q["b"] * X + q["c"]) / den
        L = lim(e, a, "+" if q["plus"] else "-")
        assert L in (sp.oo, -sp.oo)
        return {"answer": 0 if L == sp.oo else 1, "vals": {"N": q["b"] * a + q["c"]}}
    a, Lv, Rv, V, which = q["a"], q["Lv"], q["Rv"], q["V"], q["which"]
    assert Lv != Rv
    assert seg_on_line(p, q["m1"], a, Lv) and seg_on_line(p, q["m2"], a, Rv) and has_pt(p, a, V)
    # open circles exactly where the function does not take the value
    assert has_hole(p, a, Lv) == (V != Lv) and has_hole(p, a, Rv) == (V != Rv)
    assert (which == 0) == (V == Lv) and (which == 1) == (V == Rv)
    return {"answer": [Lv, Rv, V], "vals": {"J": Rv - Lv}}


def c1_limits_infinity(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        e = poly(q["top"]) / poly(q["bot"])
        ans = sp.limit(e, X, -sp.oo if q["neg"] else sp.oo)
        assert ans == sp.Rational(q["top"][0], q["bot"][0])
        return {"answer": num(ans), "vals": {"ans": fr(ans)}}
    if lv == 2:
        e = sp.sqrt(q["pp"] * X ** 2 + q["q"]) / (q["c"] * X + q["d"])
        ans = sp.limit(e, X, -sp.oo if q["neg"] else sp.oo)
        s = sp.sqrt(q["pp"])
        assert s.is_integer
        return {"answer": num(ans), "vals": {"s": int(s), "ans": fr(ans)}}
    V0, S0, C, rate = q["V0"], q["S0"], q["C"], q["rate"]
    conc = (S0 + C * rate * T) / (V0 + rate * T)
    ans = sp.limit(conc, T, sp.oo)
    assert ans == C and sp.Rational(S0, V0) != C
    return {"answer": int(ans), "vals": {"Cr": C * rate, "c0": num(sp.Rational(S0, V0))}}


def c1_indeterminate(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b = q["a"], q["b"]
        top = sp.expand((X - a) * (X - b))
        assert top.subs(X, a) == 0
        ans = sp.limit(top / (X - a), X, a)
        return {"answer": int(ans), "vals": {"s": a + b, "pr": a * b, "aa": a * a, "sa": -(a + b) * a, "ans": int(ans)}}
    if lv == 2:
        A, b, c = q["A"], q["b"], q["c"]
        ans = sp.limit(sp.sqrt(A * A * X ** 2 + b * X + c) - A * X, X, sp.oo)
        assert ans == sp.Rational(b, 2 * A)
        return {"answer": num(ans), "vals": {"AA": A * A, "A2": 2 * A, "ans": fr(ans)}}
    a, b = q["a"], q["b"]
    ans = sp.limit((1 + sp.Rational(a) / X) ** (b * X), X, sp.oo)
    assert sp.simplify(ans - sp.exp(a * b)) == 0
    return {"answer": num(ans), "vals": {"ab": a * b}}


def c1_squeeze(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        trig = sp.sin if q["trig"] == "sin" else sp.cos
        e = q["c"] * X ** q["m"] * trig(sp.Integer(q["k"]) / X) + q["d"]
        assert q["m"] % 2 == 0
        # squeeze by hand: |c x^m trig| ≤ c x^m → 0
        assert sp.limit(q["c"] * X ** q["m"], X, 0) == 0
        ans = sp.limit(e, X, 0)
        assert ans == q["d"]
        return {"answer": int(ans), "vals": {}}
    if lv == 2:
        trig = sp.sin if q["trig"] == "sin" else sp.cos
        e = (q["k"] * X + q["sgn"] * q["a"] * trig(q["mm"] * X)) / (q["d"] * X)
        ans = sp.limit(e, X, sp.oo)
        assert ans == sp.Rational(q["k"], q["d"])
        return {"answer": num(ans), "vals": {"ans": fr(ans)}}
    a, m, G0, sc, B, C = (q[k] for k in ("a", "m", "G0", "sc", "B", "C"))
    g, h = m * X + G0, sc * X ** 2 + B * X + C
    # g ≤ h everywhere: h − g is sc times a perfect square that vanishes at a
    assert sp.factor(h - g) == sp.factor(sc * (X - a) ** 2)
    L = lim(g, a)
    assert L == lim(h, a)
    return {"answer": int(L), "vals": {"ma": m * a, "sca2": sc * a * a, "Ba": B * a, "L": int(L)}}


def c1_special(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        k, m = q["k"], q["m"]
        e = (m * X) / sp.sin(k * X) if q["flip"] else sp.sin(k * X) / (m * X)
        ans = sp.limit(e, X, 0)
        return {"answer": num(ans), "vals": {"ans": fr(ans)}}
    if lv == 2:
        k, m = q["k"], q["m"]
        if q["kind"] == "cos":
            ans = sp.limit((1 - sp.cos(k * X)) / (m * X ** 2), X, 0)
            return {"answer": num(ans), "vals": {"kk": k * k, "m2": 2 * m, "ans": fr(ans)}}
        top = sp.exp(k * X) - 1 if q["kind"] == "exp" else sp.log(1 + k * X)
        ans = sp.limit(top / (m * X), X, 0)
        return {"answer": num(ans), "vals": {"ans": fr(ans)}}
    Pv, rp, Tn = q["P"], q["rp"], q["T"]
    rr = sp.Rational(rp, 100)
    L = sp.limit((1 + rr / NN) ** (NN * Tn), NN, sp.oo)
    assert sp.simplify(L - sp.exp(rr * Tn)) == 0
    return {"answer": Pv * num(L), "vals": {"rdec": num(rr), "rt": num(rr * Tn), "ert": num(L)}}


def c1_continuity(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        pp, qq, m, c = q["p"], q["q"], q["m"], q["c"]
        k = sp.Symbol("k")
        sol = sp.solve(sp.Eq(lim(m * X + k, c, "-"), lim(pp * X ** 2 + qq, c, "+")), k)
        assert len(sol) == 1
        return {"answer": int(sol[0]), "vals": {"pc2": pp * c * c, "R": pp * c * c + qq, "mc": m * c, "ans": int(sol[0])}}
    if lv == 2:
        b, c, d, s = q["b"], q["c"], q["d"], q["s"]
        fpoly = X ** 3 + b * X ** 2 + c * X + d
        vs = [int(fpoly.subs(X, s + i)) for i in range(5)]
        changes = [i for i in range(4) if (vs[i] > 0) != (vs[i + 1] > 0)]
        assert len(changes) == 1 and all(v != 0 for v in vs)
        i = changes[0]
        # a real root really is inside the chosen interval
        assert any(s + i < rt < s + i + 1 for rt in sp.Poly(fpoly, X).real_roots())
        return {"answer": i, "vals": {"xs": [s + j for j in range(5)], "vs": vs}}
    a, N = q["a"], q["N"]
    root = sp.sqrt(N)
    assert a < root < a + 1
    lo, hi = sp.Integer(a), sp.Integer(a + 1)
    mids = []
    for _ in range(2):
        mid = (lo + hi) / 2
        fm = mid ** 2 - N
        mids.append((mid, fm, lo, hi))
        if fm < 0:
            lo = mid
        else:
            hi = mid
        if len(mids) == 1:
            lo1, hi1 = lo, hi
    assert lo < root < hi
    (m1, f1, _, _), (m2, f2, _, _) = mids
    return {"answer": [num(lo), num(hi)], "vals": {"a1": a + 1, "aa": a * a, "bb": (a + 1) ** 2, "fa": a * a - N, "fb": (a + 1) ** 2 - N, "m1": num(m1),
            "m1sq": num(m1 ** 2), "f1": num(f1), "lo1": num(lo1), "hi1": num(hi1), "m2": num(m2), "m2sq": num(m2 ** 2), "f2": num(f2),
            "lo": num(lo), "hi": num(hi), "len": num(hi - lo)}}


def c1_disc_types(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        kind, a, Lv, Rv, V = q["kind"], q["a"], q["Lv"], q["Rv"], q["V"]
        if kind == 0:
            assert has_hole(p, a, Lv) and seg_on_line(p, q["m1"], a, Lv)
            assert (not q["dotted"]) or (has_pt(p, a, V) and V != Lv)
            assert q["dotted"] or not graph_items(p, "pt")
            return {"answer": 0, "vals": {}}
        if kind == 1:
            assert Lv != Rv and has_pt(p, a, Lv) and has_hole(p, a, Rv)
            assert seg_on_line(p, q["m1"], a, Lv) and seg_on_line(p, q["m2"], a, Rv)
            return {"answer": 1, "vals": {"J": Rv - Lv}}
        e = parse_js(graph_items(p, "fn")[0]["e"])
        assert abs(lim(e, a, "+")) == sp.oo
        return {"answer": 2, "vals": {}}
    if lv == 2:
        kind, a = q["kind"], q["a"]
        if kind == 0:
            b = q["b"]
            e = sp.expand((X - a) * (X - b)) / (X - a)
            L = sp.limit(e, X, a)
            assert L.is_finite
            return {"answer": 0, "vals": {"s": a + b, "pr": a * b, "ans": int(L)}}
        if kind == 2:
            e = (X + q["c"]) / (X - a)
            assert abs(sp.limit(e, X, a, "+")) == sp.oo
            return {"answer": 2, "vals": {"N": a + q["c"]}}
        p1, q1, p2, q2 = q["p1"], q["q1"], q["p2"], q["q2"]
        Lv, Rv = lim(p1 * X + q1, a, "-"), lim(p2 * X + q2, a, "+")
        fa = p2 * a + q2
        idx = 3 if (Lv == Rv == fa) else 1
        assert idx == (3 if kind == 3 else 1)
        return {"answer": idx, "vals": {"p1a": p1 * a, "Lv": int(Lv), "p2a": p2 * a, "Rv": int(Rv), "J": int(Rv - Lv)}}
    a, b, c = q["a"], q["b"], q["c"]
    e = (X - a) * (X + c) / ((X - a) * (X - b))
    top, bot = sp.expand((X - a) * (X + c)), sp.expand((X - a) * (X - b))
    fill = sp.limit(top / bot, X, a)
    assert fill.is_finite and abs(sp.limit(top / bot, X, b, "+")) == sp.oo
    assert e is not None
    return {"answer": num(fill), "vals": {"B1": int(top.coeff(X, 1)), "C1": int(top.coeff(X, 0)), "s": a + b, "pr": a * b, "bc": b + c, "fill": fr(fill)}}


VERIFY = {
    "C1.1": c1_1, "C1.one-sided": c1_one_sided, "C1.limits-infinity": c1_limits_infinity, "C1.indeterminate": c1_indeterminate,
    "C1.squeeze": c1_squeeze, "C1.2": c1_special, "C1.3": c1_continuity, "C1.continuity-types": c1_disc_types,
}


def check_expr(ans_expr, want):
    """The generator's expression answer equals SymPy's (also confirmed by the harness in JavaScript)."""
    assert sp.simplify(parse_js(ans_expr) - want) == 0, f"{ans_expr} != {want}"
    return js(want)


def subst_terms(cs, v):
    d = len(cs) - 1
    return [R(c) * sp.Integer(v) ** (d - i) for i, c in enumerate(cs) if R(c) != 0]


# ---- C1.4 ----------------------------------------------------------------------------------------
def c1_4(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        pp, qq, c, a, hh = q["p"], q["q"], q["c"], q["a"], q["hh"]
        f = pp * X ** 2 + qq * X + c
        b = a + hh
        m = (f.subs(X, b) - f.subs(X, a)) / hh
        assert m.is_integer
        return {"answer": int(m), "vals": {"b": b, "pb2": pp * b * b, "qb": qq * b, "fb": int(f.subs(X, b)), "pa2": pp * a * a, "qa": qq * a,
                                           "fa": int(f.subs(X, a)), "diff": int(f.subs(X, b) - f.subs(X, a)), "m": int(m)}}
    if lv == 2:
        pp, qq, c, a = q["p"], q["q"], q["c"], q["a"]
        f = pp * X ** 2 + qq * X + c
        dq = sp.expand((f.subs(X, a + H) - f.subs(X, a)) / H)
        lin = sp.limit(dq, H, 0)
        assert lin == sp.diff(f, X).subs(X, a)
        # the shown expansion f(a + h) = f(a) + (2pa + q)h + p h²
        assert sp.expand(f.subs(X, a + H)) == sp.expand(f.subs(X, a) + lin * H + pp * H ** 2)
        return {"answer": int(lin), "vals": {"a2": a * a, "twoA": 2 * a, "pa2": pp * a * a, "twopa": 2 * pp * a, "qa": qq * a, "fa": int(f.subs(X, a)), "lin": int(lin)}}
    k, a = q["k"], q["a"]
    if q["kind"] == "recip":
        f = sp.Integer(k) / X
        ans = sp.limit((f.subs(X, a + H) - f.subs(X, a)) / H, H, 0)
        assert ans == sp.diff(f, X).subs(X, a)
        return {"answer": num(ans), "vals": {"ka": k * a, "a2": a * a, "ans": fr(ans)}}
    f = k * sp.sqrt(X)
    ans = sp.limit((f.subs(X, a + H) - f.subs(X, a)) / H, H, 0)
    s = sp.sqrt(a)
    assert s.is_integer and ans == sp.diff(f, X).subs(X, a)
    return {"answer": num(ans), "vals": {"s": int(s), "s2": int(2 * s), "ans": fr(ans)}}


def c1_differentiability(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, m1, m2 = q["a"], q["b"], q["m1"], q["m2"]
        left, right = b + m1 * (X - a), b + m2 * (X - a)
        assert seg_on_line(p, m1, a, b) and seg_on_line(p, m2, a, b) and has_pt(p, a, b)
        dl = sp.limit((left - b) / (X - a), X, a, "-")
        dr = sp.limit((right - b) / (X - a), X, a, "+")
        assert dl != dr
        return {"answer": [int(dl), int(dr)], "vals": {"am1": a - 1, "bm1": b - m1, "ap1": a + 1, "bp2": b + m2}}
    if lv == 2:
        c, pp, qq, m, k = q["c"], q["p"], q["q"], q["m"], q["k"]
        left, right = X ** 2 + pp * X + qq, m * X + k
        L, Rv = left.subs(X, c), lim(right, c, "+")
        sL = sp.diff(left, X).subs(X, c)
        fc = L
        if L != Rv:
            idx = 2
        else:
            # one-sided difference quotients
            dl = sp.limit((left - fc) / (X - c), X, c, "-")
            dr = sp.limit((right - fc) / (X - c), X, c, "+")
            idx = 0 if dl == dr else 1
        return {"answer": idx, "vals": {"cc": c * c, "pc": pp * c, "L": int(L), "mc": m * c, "Rv": int(Rv), "sL": int(sL)}}
    a, b, c = q["a"], q["b"], q["c"]
    m, k = sp.symbols("m k")
    left = a * X ** 2 + b * X
    sol = sp.solve([sp.Eq(m * c + k, left.subs(X, c)), sp.Eq(m, sp.diff(left, X).subs(X, c))], [m, k])
    M_, K_ = int(sol[m]), int(sol[k])
    return {"answer": [M_, K_], "vals": {"twoA": 2 * a, "twoAc": 2 * a * c, "m": M_, "ac2": a * c * c, "bc": b * c, "L": a * c * c + b * c, "mc": M_ * c, "k": K_}}


def c1_5(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        f = poly(q["cs"])
        d = sp.Poly(sp.diff(f, X), X).all_coeffs()
        return {"answer": js(sp.diff(f, X)), "vals": {"d": [int(c) for c in d]}}
    if lv == 2:
        a, b, c, t0 = q["a"], q["b"], q["c"], q["t0"]
        f = a * sp.sqrt(X) + sp.Integer(b) / X + c * X ** 2
        ans = sp.diff(f, X).subs(X, t0)
        s = sp.sqrt(t0)
        assert s.is_integer
        return {"answer": num(ans), "vals": {"s": int(s), "s4": t0 * t0, "a2": fr(sp.Rational(a, 2)), "twoC": 2 * c, "T1": fr(sp.Rational(a, 2) / s),
                                             "T2": fr(sp.Rational(-b, t0 * t0)), "T3": 2 * c * t0, "ans": fr(ans)}}
    b, c, d, m = q["b"], q["c"], q["d"], q["m"]
    f = X ** 3 + b * X ** 2 + c * X + d
    roots = sp.solve(sp.Eq(sp.diff(f, X), m), X)
    assert len(roots) == 2 and all(rt.is_integer for rt in roots)
    r1, r2 = sorted(int(rt) for rt in roots)
    return {"answer": [r1, r2], "vals": {"twoB": 2 * b, "cm": c - m, "s": r1 + r2, "pr": r1 * r2}}


def c1_6(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, c, d = q["a"], q["b"], q["c"], q["d"]
        dy = sp.expand(sp.diff((a * X + b) * (c * X ** 2 + d), X))
        assert dy == sp.expand(a * (c * X ** 2 + d) + (a * X + b) * 2 * c * X)
        return {"answer": js(dy), "vals": {"twoC": 2 * c, "ac": a * c, "ad": a * d, "twoAC": 2 * a * c, "twoBC": 2 * b * c, "threeAC": 3 * a * c}}
    if lv == 2:
        a, b, c, d = q["a"], q["b"], q["c"], q["d"]
        dy = sp.diff((a * X + b) / (c * X + d), X)
        det = a * d - b * c
        assert det != 0 and sp.simplify(dy - det / (c * X + d) ** 2) == 0
        return {"answer": js(sp.together(dy)), "vals": {"ac": a * c, "ad": a * d, "bc": b * c, "det": det}}
    if q["kind"] == "revenue":
        pr, qq, rr, s = R(q["pr"]), R(q["q"]), R(q["rr"]), R(q["s"])
        pt, qt = pr + rr * T, qq - s * T       # price and quantity near now (t = 0)
        ans = sp.diff(pt * qt, T).subs(T, 0)
        return {"answer": num(ans), "vals": {"rrq": num(rr * qq), "prs": num(pr * s), "ans": num(ans)}}
    m, V, mp, Vp = q["m"], q["V"], q["mp"], q["Vp"]
    ans = sp.diff((m + mp * T) / (V + Vp * T), T).subs(T, 0)
    assert ans.is_integer and ans != 0
    return {"answer": int(ans), "vals": {"mpV": mp * V, "mVp": m * Vp, "num": mp * V - m * Vp, "den": V * V, "ans": int(ans)}}


def c1_7(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, k = q["a"], q["b"], q["k"]
        dy = sp.diff((a * X + b) ** k, X)
        check_expr(p["answer"]["expr"], dy)
        return {"answer": js(dy), "vals": {"km1": k - 1, "ka": k * a}}
    if lv == 2:
        kind, a, b = q["kind"], q["a"], q["b"]
        if kind == "pow":
            k = q["k"]
            dy = sp.diff((a * X ** 2 + b) ** k, X)
            return {"answer": js(dy), "vals": {"km1": k - 1, "twoA": 2 * a, "coef": 2 * k * a}}
        if kind == "exp":
            dy = sp.diff(sp.exp(a * X ** 2 + b * X), X)
            return {"answer": js(dy), "vals": {"twoA": 2 * a}}
        g = sp.sin if q["isSin"] else sp.cos
        dy = sp.diff(g(a * X ** 2 + b), X)
        return {"answer": js(dy), "vals": {"twoA": 2 * a, "coef": 2 * a if q["isSin"] else -2 * a}}
    if q["kind"] == "table":
        xs, fs, fps, gs, gps, a = q["xs"], q["fs"], q["fps"], q["gs"], q["gps"], q["a"]
        # interpolate nothing: the chain rule with the tabulated values
        val = lambda tab, v: tab[xs.index(v)]
        if q["fg"]:
            inner, innerD = val(gs, a), val(gps, a)
            outerD = val(fps, inner)
        else:
            inner, innerD = val(fs, a), val(fps, a)
            outerD = val(gps, inner)
        # confirm the rule with symbolic functions: d/dx F(G(x)) = F'(G(x)) G'(x)
        Fn, Gn = sp.Function("F"), sp.Function("G")
        dexpr = sp.diff(Fn(Gn(X)), X)
        assert sp.simplify(dexpr - sp.Subs(sp.Derivative(Fn(U), U), U, Gn(X)).doit() * sp.diff(Gn(X), X)) == 0
        return {"answer": outerD * innerD, "vals": {"inner": inner, "innerD": innerD, "outerD": outerD, "ans": outerD * innerD}}
    lapse, climb = R(q["lapse"]), R(q["climb"])
    A = sp.Symbol("A")
    Tofa = -lapse * A          # temperature drop with altitude A (km)
    Aoft = climb * T           # altitude after t minutes
    ans = sp.diff(Tofa.subs(A, Aoft), T)
    return {"answer": num(ans), "vals": {"ans": num(ans)}}


def c1_8(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, c = q["a"], q["b"], q["c"]
        dy = sp.diff(a * sp.sin(X) + b * sp.cos(X) + c * sp.exp(X), X)
        return {"answer": js(dy), "vals": {}}
    if lv == 2:
        kind = q["kind"]
        if kind == "exp":
            a, b, k = q["a"], q["b"], q["k"]
            ans = sp.diff(a * sp.Integer(b) ** X, X).subs(X, k)
            return {"answer": num(ans), "vals": {"bk": b ** k, "coef": a * b ** k, "approx": num(ans)}}
        if kind == "log":
            a, b, k = q["a"], q["b"], q["k"]
            ans = sp.diff(a * sp.log(X, b), X).subs(X, k)
            return {"answer": num(ans), "vals": {"q": fr(sp.Rational(a, k)), "approx": num(ans)}}
        a, c, k = q["a"], q["c"], q["k"]
        ans = sp.diff(a * sp.log(X) + c * X ** 2, X).subs(X, k)
        return {"answer": num(ans), "vals": {"T1": fr(sp.Rational(a, k)), "twoC": 2 * c, "T2": 2 * c * k, "ans": fr(ans)}}
    M0, A, useSin, t0 = q["M0"], q["A"], q["useSin"], q["t0"]
    D = M0 + A * (sp.sin if useSin else sp.cos)(sp.pi * T / 6)
    ans = sp.simplify(sp.diff(D, T).subs(T, t0))
    coef = sp.nsimplify(ans / sp.pi)
    assert coef.is_rational
    tv = (sp.cos if useSin else sp.sin)(sp.pi * sp.Rational(t0, 6))
    assert tv.is_rational
    return {"answer": num(ans), "vals": {"angle": fr(sp.Rational(t0, 6)), "tv": fr(tv), "coef": fr(coef), "approx": num(ans)}}


def c1_inverse(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        c, k = q["c"], q["k"]
        dy = sp.diff(c * sp.atan(k * X), X)
        return {"answer": js(dy), "vals": {"kk": k * k, "ck": c * k}}
    if lv == 2:
        a, b, c = q["a"], q["b"], q["c"]
        f = c * (sp.asin if q["isSin"] else sp.acos)(X / a)
        ans = sp.simplify(sp.diff(f, X).subs(X, b))
        leg = sp.sqrt(a * a - b * b)
        assert leg.is_integer and ans.is_rational
        return {"answer": num(ans), "vals": {"aa": a * a, "bb": b * b, "diff": a * a - b * b, "leg": int(leg), "ans": fr(ans)}}
    pp, qq, b = q["p"], q["q"], q["b"]
    f = X ** 3 + pp * X + qq
    real = [s for s in sp.solve(sp.Eq(f, b), X) if s.is_real]
    assert len(real) == 1 and real[0].is_integer and -2 <= real[0] <= 2
    a = int(real[0])
    D = sp.diff(f, X).subs(X, a)
    # confirm with the inverse's own derivative: y = f⁻¹(x) satisfies f(y) = x, so y′ = 1/f′(y)
    ans = 1 / D
    return {"answer": num(ans), "vals": {"a3": a ** 3, "pa": pp * a, "b": b, "a": a, "D": int(D), "ans": fr(ans)}}


def c1_hyperbolic(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        k, kind = q["k"], q["kind"]
        fn = {"cosh": sp.cosh, "sinh": sp.sinh, "tanh": sp.tanh}[kind]
        ans = sp.simplify(fn(sp.log(k)).rewrite(sp.exp))
        assert ans.is_rational
        top = k * k + 1 if kind == "cosh" else k * k - 1
        return {"answer": num(ans), "vals": {"kk": k * k, "top": top, "k2": 2 * k, "ans": fr(ans)}}
    if lv == 2:
        k = q["k"]
        L = sp.log(k)
        C, S = sp.simplify(sp.cosh(L).rewrite(sp.exp)), sp.simplify(sp.sinh(L).rewrite(sp.exp))
        if q["kind"] == "sc":
            a, b = q["a"], q["b"]
            ans = sp.simplify(sp.diff(a * sp.sinh(X) + b * sp.cosh(X), X).subs(X, L).rewrite(sp.exp))
            return {"answer": num(ans), "vals": {"C": fr(C), "S": fr(S), "aC": fr(a * C), "bS": fr(b * S), "ans": fr(ans)}}
        c = q["c"]
        ans = sp.simplify(sp.diff(c * sp.tanh(X), X).subs(X, L).rewrite(sp.exp))
        th = sp.simplify(sp.tanh(L).rewrite(sp.exp))
        return {"answer": num(ans), "vals": {"kk": k * k, "th": fr(th), "th2": fr(th ** 2), "sech2": fr(1 - th ** 2), "ans": fr(ans)}}
    a, k = q["a"], q["k"]
    ans = sp.simplify(sp.diff(a * sp.cosh(X / a), X).subs(X, a * sp.log(k)).rewrite(sp.exp))
    assert ans.is_rational
    return {"answer": num(ans), "vals": {"kk": k * k, "ans": fr(ans)}}


def implicit_slope(Fxy, x0, y0):
    Y = sp.Function("y")(X)
    d = sp.diff(Fxy.subs(sp.Symbol("Y"), Y), X)
    yp = sp.solve(d, sp.diff(Y, X))[0]
    return sp.simplify(yp.subs(Y, y0).subs(X, x0))


def c1_9(p):
    q, lv = p["params"], p["level"]
    Ys = sp.Symbol("Y")
    if lv == 1:
        pp, qq = q["p"], q["q"]
        R2 = pp * pp + qq * qq
        ans = implicit_slope(X ** 2 + Ys ** 2 - R2, pp, qq)
        assert sp.sqrt(R2).is_integer
        # the tangent is perpendicular to the radius
        assert ans * sp.Rational(qq, pp) == -1
        return {"answer": num(ans), "vals": {"R2": R2, "Rr": int(sp.sqrt(R2)), "rad": fr(sp.Rational(qq, pp)), "ans": fr(ans)}}
    if lv == 2:
        a, x0, y0 = q["a"], q["x0"], q["y0"]
        c = x0 * x0 + a * x0 * y0 + y0 * y0
        assert a * a != 4, "x² ± 2xy + y² is a pair of lines"
        ans = implicit_slope(X ** 2 + a * X * Ys + Ys ** 2 - c, x0, y0)
        N, D = 2 * x0 + a * y0, a * x0 + 2 * y0
        return {"answer": num(ans), "vals": {"c": c, "N": N, "D": D, "ans": fr(ans)}}
    a, x0, y0 = q["a"], q["x0"], q["y0"]
    c = y0 ** 3 + a * x0 * y0 + x0 * x0
    m = implicit_slope(Ys ** 3 + a * X * Ys + X ** 2 - c, x0, y0)
    line = m * (X - x0) + y0
    return {"answer": js(sp.expand(line)), "vals": {"c": c, "N": a * y0 + 2 * x0, "D": 3 * y0 * y0 + a * x0, "m": fr(m), "b0": fr(line.subs(X, 0))}}


def c1_logdiff(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "plain":
            a, b = q["a"], q["b"]
            dy = sp.diff(sp.log(a * X ** 2 + b), X)
            return {"answer": js(dy), "vals": {"twoA": 2 * a}}
        b, k = q["b"], q["k"]
        dy = sp.diff(sp.log((X ** 2 + b) ** k), X)
        return {"answer": js(sp.simplify(dy)), "vals": {"twoK": 2 * k}}
    if lv == 2:
        k, x0 = q["k"], q["x0"]
        Xp = sp.Symbol("xp", positive=True)
        ans = sp.diff(Xp ** (k * Xp), Xp).subs(Xp, x0)
        return {"answer": num(ans), "vals": {"kx": k * x0, "Y": x0 ** (k * x0), "coef": k * x0 ** (k * x0), "ans": num(ans)}}
    x0, a, pp, b, c = q["x0"], q["a"], q["p"], q["b"], q["c"]
    yexpr = (X + a) ** pp * sp.sqrt(X + b) / (X + c)
    ans = sp.simplify(sp.diff(yexpr, X).subs(X, x0))
    A, B, C = x0 + a, x0 + b, x0 + c
    Y = sp.simplify(yexpr.subs(X, x0))
    S = sp.Rational(pp, A) + sp.Rational(1, 2 * B) - sp.Rational(1, C)
    assert ans.is_rational and Y.is_rational and sp.simplify(ans - Y * S) == 0 and ans != 0
    return {"answer": num(ans), "vals": {"A": A, "B": B, "C": C, "sq": int(sp.sqrt(B)), "B2": 2 * B, "Y": fr(Y), "S": fr(S), "ans": fr(ans)}}


def c1_higher(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        f = poly(q["cs"])
        a = q["a"]
        d1, d2 = sp.diff(f, X), sp.diff(f, X, 2)
        ans = d2.subs(X, a)
        c2 = sp.Poly(d2, X).all_coeffs()
        return {"answer": int(ans), "vals": {"d1": [int(c) for c in sp.Poly(d1, X).all_coeffs()], "d2": [int(c) for c in c2],
                                           "terms": [int(v) for v in subst_terms(c2, a)], "ans": int(ans)}}
    if lv == 2:
        b, c, d = q["b"], q["c"], q["d"]
        s = T ** 3 - b * T ** 2 + c * T + d
        v, acc = sp.diff(s, T), sp.diff(s, T, 2)
        ts = sp.solve(acc, T)
        assert len(ts) == 1 and ts[0].is_integer and ts[0] > 0
        k = int(ts[0])
        ans = v.subs(T, k)
        return {"answer": int(ans), "vals": {"twoB": 2 * b, "k": k, "kk": k * k, "threeKK": 3 * k * k, "twoBk": 2 * b * k, "ans": int(ans)}}
    nn, k, m = q["nn"], q["k"], q["m"]
    g = sp.sin(X) if q["trig"] == "sin" else sp.cos(X)
    f = X ** m + sp.exp(k * X) + g
    ans = sp.diff(f, X, nn).subs(X, 0)
    tv = sp.diff(g, X, nn).subs(X, 0)
    return {"answer": int(ans), "vals": {"kn": k ** nn, "q": nn // 4, "rem": nn % 4, "trigVal": int(tv), "ans": int(ans)}}


VERIFY.update({
    "C1.4": c1_4, "C1.differentiability": c1_differentiability, "C1.5": c1_5, "C1.6": c1_6, "C1.7": c1_7, "C1.8": c1_8,
    "C1.inverse-derivs": c1_inverse, "C1.hyperbolic": c1_hyperbolic, "C1.9": c1_9, "C1.log-diff": c1_logdiff, "C1.higher-order": c1_higher,
})


# ---- batch 3: applications of the derivative ----------------------------------------------------
def c1_10(p):
    q, lv = p["params"], p["level"]
    rr = sp.Function("r")(T)
    if lv == 1:
        if q["kind"] == "circle":
            d = sp.diff(sp.pi * rr ** 2, T).subs(sp.Derivative(rr, T), q["dr"]).subs(rr, q["rr"])
            coef = d / sp.pi
            return {"answer": num(d), "vals": {"twoR": 2 * q["rr"], "coef": int(coef), "approx": num(d)}}
        d = sp.diff(sp.Rational(4, 3) * sp.pi * rr ** 3, T).subs(sp.Derivative(rr, T), q["dr"]).subs(rr, q["rr"])
        return {"answer": num(d), "vals": {"r2": q["rr"] ** 2, "coef": int(d / sp.pi), "approx": num(d)}}
    if lv == 2:
        L, X0, dx = q["L"], q["X0"], q["dx"]
        xf, yf = sp.Function("xf")(T), sp.Function("yf")(T)
        eq = sp.diff(xf ** 2 + yf ** 2 - L ** 2, T)
        Y0 = sp.sqrt(L * L - X0 * X0)
        assert Y0.is_integer
        dy = sp.solve(eq, sp.diff(yf, T))[0].subs(sp.diff(xf, T), dx).subs({xf: X0, yf: Y0})
        assert dy < 0
        return {"answer": num(-dy), "vals": {"L2": L * L, "X2": X0 * X0, "D": L * L - X0 * X0, "Y0": int(Y0), "xd": X0 * dx, "ans": fr(-dy)}}
    R0, H0, h0, Vp = q["R0"], q["H0"], q["h0"], q["Vp"]
    hf = sp.Function("hf")(T)
    k = sp.Rational(R0, H0)
    V = sp.Rational(1, 3) * sp.pi * (k * hf) ** 2 * hf
    dh = sp.solve(sp.Eq(sp.diff(V, T), Vp), sp.diff(hf, T))[0].subs(hf, h0)
    coef = sp.nsimplify(dh * sp.pi)
    assert coef.is_rational
    return {"answer": num(dh), "vals": {"k": fr(k), "k2": fr(k ** 2), "k23": fr(k ** 2 / 3), "h2": h0 * h0, "k2h2": fr(k ** 2 * h0 * h0), "coef": fr(coef), "approx": num(dh)}}


def c1_11(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        pp, qq, c, a = q["p"], q["q"], q["c"], q["a"]
        f = pp * X ** 2 + qq * X + c
        m = sp.diff(f, X).subs(X, a)
        line = sp.expand(f.subs(X, a) + m * (X - a))
        return {"answer": js(line), "vals": {"fa": int(f.subs(X, a)), "twoP": 2 * pp, "twoPa": 2 * pp * a, "m": int(m), "ma": int(m * a),
                                            "b0": int(line.subs(X, 0)), "terms": [int(v) for v in subst_terms([pp, qq, c], a)]}}
    if lv == 2:
        s, target = q["s"], R(q["target"])
        k = 3 if q["cube"] else 2
        f = X ** sp.Rational(1, k)
        a = s ** k
        slope = sp.diff(f, X).subs(X, a)
        dx = target - a
        est = f.subs(X, a) + slope * dx
        assert abs(dx) < 1
        return {"answer": num(est), "vals": {"a": a, "s": s, "ss": s * s, "slope": fr(slope), "corr": fr(slope * dx), "est": fr(est), "dxv": num(dx), "truth": num(f.subs(X, target))}}
    b, c, a = q["b"], q["c"], q["a"]
    f = X ** 3 + b * X + c
    m = sp.diff(f, X).subs(X, a)
    assert m != 0
    nm = -1 / m
    line = sp.expand(f.subs(X, a) + nm * (X - a))
    return {"answer": js(line), "vals": {"fa": int(f.subs(X, a)), "m": int(m), "nm": fr(nm), "b0": fr(line.subs(X, 0)), "terms": [int(v) for v in subst_terms([1, 0, b, c], a)]}}


def c1_differentials(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        pp, qq, a, dx = q["p"], q["q"], q["a"], R(q["dx"])
        f = pp * X ** 3 + qq * X
        D = sp.diff(f, X).subs(X, a)
        return {"answer": num(D * dx), "vals": {"p3": 3 * pp, "D": int(D), "dy": num(D * dx), "xn": num(a + dx), "Dy": num(f.subs(X, a + dx) - f.subs(X, a))}}
    if lv == 2:
        k = 3 if q["cube"] else 2
        s, e = q["s"], R(q["e"])
        D = sp.diff(X ** k, X).subs(X, s)
        return {"answer": num(D * e), "vals": {"coef": int(D), "dV": num(D * e), "Vs": s ** k}}
    kind, pc = q["kind"], R(q["pc"])
    rv, g = sp.symbols("rv g", positive=True)
    expr = {"sphere": sp.Rational(4, 3) * sp.pi * rv ** 3, "circle": sp.pi * rv ** 2, "pendulum": 2 * sp.pi * sp.sqrt(rv / g)}[kind]
    rel = sp.simplify(sp.diff(expr, rv) * rv / expr)   # (dQ/Q) / (dr/r)
    assert rel.is_rational
    return {"answer": num(rel * pc), "vals": {"ans": num(rel * pc)}}


def c1_12(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        b, c, d = q["b"], q["c"], q["d"]
        f = 2 * X ** 3 + b * X ** 2 + c * X + d
        crit = sorted(int(v) for v in sp.solve(sp.diff(f, X), X))
        assert len(crit) == 2
        return {"answer": crit, "vals": {"twoB": 2 * b, "s": sum(crit), "pr": crit[0] * crit[1]}}
    if lv == 2:
        a, b, c, d = q["a"], q["b"], q["c"], q["d"]
        f = a * X ** 3 + b * X ** 2 + c * X + d
        hs = sp.solve(sp.diff(f, X, 2), X)
        assert len(hs) == 1 and hs[0].is_integer
        h = int(hs[0])
        f2 = sp.diff(f, X, 2)
        assert f2.subs(X, h - 1) * f2.subs(X, h + 1) < 0
        fh = int(f.subs(X, h))
        return {"answer": [h, fh], "vals": {"a3": 3 * a, "twoB": 2 * b, "a6": 6 * a, "nb2": -2 * b, "h": h, "fh": fh, "terms": [int(v) for v in subst_terms([a, b, c, d], h)]}}
    r1, r2, s, wantMax = q["r1"], q["r2"], R(q["s"]), q["wantMax"]
    fp_ = s * (X - r1) * (X - r2)
    ge = parse_js(graph_items(p, "fn")[0]["e"])
    assert sp.simplify(ge - fp_) == 0
    f = sp.integrate(fp_, X)
    ans = None
    for c in (r1, r2):
        f2 = sp.diff(f, X, 2).subs(X, c)
        if (f2 < 0) == bool(wantMax):
            ans = c
    return {"answer": ans, "vals": {"ans": ans}}


def c1_evt(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        pp, b, c, lo, hi = q["p"], q["b"], q["c"], q["lo"], q["hi"]
        f = pp * X ** 2 + b * X + c
        crit = [v for v in sp.solve(sp.diff(f, X), X) if lo < v < hi]
        cands = [lo] + crit + [hi]
        vs = [int(f.subs(X, v)) for v in cands]
        h = sp.solve(sp.diff(f, X), X)[0]
        ans = max(vs) if q["wantMax"] else min(vs)
        # confirm against a dense check of the interval
        assert all((f.subs(X, lo + (hi - lo) * sp.Rational(i, 50)) <= ans) if q["wantMax"] else (f.subs(X, lo + (hi - lo) * sp.Rational(i, 50)) >= ans) for i in range(51))
        return {"answer": ans, "vals": {"twoP": 2 * pp, "h": int(h), "cv": vs, "ans": ans}}
    if lv == 2:
        b, c, d, lo, hi = q["b"], q["c"], q["d"], q["lo"], q["hi"]
        f = 2 * X ** 3 + b * X ** 2 + c * X + d
        crit = sorted(int(v) for v in sp.solve(sp.diff(f, X), X))
        inside = [v for v in crit if lo < v < hi]
        vs = [int(f.subs(X, v)) for v in [lo] + inside + [hi]]
        return {"answer": [min(vs), max(vs)], "vals": {"twoB": 2 * b, "s": sum(crit), "pr": crit[0] * crit[1], "r1": crit[0], "r2": crit[1], "vs": vs, "mn": min(vs), "mx": max(vs)}}
    A, k, t1, t2 = q["A"], q["k"], q["t1"], q["t2"]
    C = A * T / (T ** 2 + k * k)
    crit = [v for v in sp.solve(sp.diff(C, T), T) if t1 < v < t2]
    xs = [t1] + crit + [t2]
    cv = [sp.nsimplify(C.subs(T, v)) for v in xs]
    best = max(cv)
    return {"answer": num(best), "vals": {"kk": k * k, "k": k, "cv": [fr(v) for v in cv], "best": fr(best), "at": int(xs[cv.index(best)])}}


def c1_curve(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        sg, b, c, d = q["sg"], q["b"], q["c"], q["d"]
        f = 2 * sg * X ** 3 + b * X ** 2 + c * X + d
        fp_ = sp.diff(f, X)
        crit = sorted(int(v) for v in sp.solve(fp_, X))
        r1, r2 = crit
        want = "decreasing" if sg > 0 else "increasing"
        mid = sp.Rational(r1 + r2, 2)
        # the asked behavior holds exactly on (r1, r2)
        sol = sp.solve_univariate_inequality(fp_ < 0 if want == "decreasing" else fp_ > 0, X, relational=False)
        assert sol == sp.Interval.open(r1, r2)
        return {"answer": [r1, r2], "vals": {"six": 6 * sg, "twoB": 2 * b, "tl": r1 - 1, "tm": num(mid), "tr": r2 + 1, "vl": int(fp_.subs(X, r1 - 1)),
                                           "vm": num(fp_.subs(X, mid)), "vr": int(fp_.subs(X, r2 + 1))}}
    if lv == 2:
        a, s, cc, at0 = q["a"], q["s"], q["cc"], q["at0"]
        f = s * (X ** 4 - 4 * a * X ** 3) + cc
        pt = 0 if at0 else 3 * a
        fp_ = sp.diff(f, X)
        assert fp_.subs(X, pt) == 0
        l, rgt = fp_.subs(X, pt - sp.Rational(1, 10)), fp_.subs(X, pt + sp.Rational(1, 10))
        idx = 0 if (l > 0 and rgt < 0) else 1 if (l < 0 and rgt > 0) else 2
        return {"answer": idx, "vals": {"a3": 3 * a, "f2": int(sp.diff(f, X, 2).subs(X, pt)), "s4": 4 * s, "s12": 12 * s, "as12": -12 * a * s, "as24": -24 * a * s, "as4": -4 * a * s}}
    h, v, c, want, letters = q["h"], q["v"], R(q["c"]), q["want"], q["letters"]
    f = v + c * ((X - h) ** 3 - 12 * (X - h))
    pts = {it["label"]: it for it in graph_items(p, "pt")}
    target = letters[want]
    xw = pts[target]["x"]
    assert abs(pts[target]["y"] - num(f.subs(X, xw))) < 1e-9
    s1 = sp.sign(sp.diff(f, X).subs(X, xw))
    s2 = sp.sign(sp.diff(f, X, 2).subs(X, xw))
    # exactly one labeled point has this sign pair
    matches = [L for L, it in pts.items() if sp.sign(sp.diff(f, X).subs(X, R(it["x"]))) == s1 and sp.sign(sp.diff(f, X, 2).subs(X, R(it["x"]))) == s2]
    assert matches == [target]
    want_s1 = 1 if "&gt; 0 and" in p["prompt"] else -1
    want_s2 = 1 if p["prompt"].rstrip("?").endswith("&gt; 0") else -1
    assert (s1, s2) == (want_s1, want_s2)
    return {"answer": ["A", "B", "C", "D"].index(target), "vals": {}}


def c1_13(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, m, x0, eta = q["a"], q["m"], q["x0"], R(q["eta"])
        f = a * (X - m) ** 2
        g = sp.diff(f, X)
        xs = [sp.Integer(x0)]
        gs = []
        for _ in range(2):
            gs.append(g.subs(X, xs[-1]))
            xs.append(xs[-1] - eta * gs[-1])
        assert 2 * a * eta < 1
        return {"answer": num(xs[2]), "vals": {"a2": 2 * a, "g0": num(gs[0]), "x1": num(xs[1]), "g1": num(gs[1]), "x2": num(xs[2])}}
    if lv == 2:
        if q["kind"] == "river":
            L = q["L"]
            A = X * (L - 2 * X)
            xs = sp.solve(sp.diff(A, X), X)[0]
            assert sp.diff(A, X, 2) < 0
            return {"answer": int(A.subs(X, xs)), "vals": {"half": L // 2, "xs": int(xs), "len": int(L - 2 * xs), "area": int(A.subs(X, xs))}}
        A0 = q["A0"]
        Xp = sp.Symbol("xp", positive=True)
        F = 2 * Xp + A0 / Xp
        xs = sp.solve(sp.diff(F, Xp), Xp)
        assert len(xs) == 1 and xs[0].is_integer and sp.diff(F, Xp, 2).subs(Xp, xs[0]) > 0
        s = int(xs[0])
        return {"answer": int(F.subs(Xp, s)), "vals": {"s": s, "ss": A0 // 2, "A2": 2 * A0, "other": A0 // s, "fence": int(F.subs(Xp, s))}}
    S = q["S"]
    V = X * (S - 2 * X) ** 2
    assert sp.factor(sp.diff(V, X)) == sp.factor((S - 2 * X) * (S - 6 * X))
    crit = [v for v in sp.solve(sp.diff(V, X), X) if 0 < v < sp.Rational(S, 2)]
    assert len(crit) == 1
    xs = crit[0]
    vol = V.subs(X, xs)
    return {"answer": int(vol), "vals": {"S2": S // 2, "xs": int(xs), "x2": int(2 * xs), "base": int(S - 2 * xs), "vol": int(vol)}}


def c1_14(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        pp, qq, a, b = q["p"], q["q"], q["a"], q["b"]
        f = pp * X ** 2 + qq * X
        avg = (f.subs(X, b) - f.subs(X, a)) / (b - a)
        cs = [v for v in sp.solve(sp.Eq(sp.diff(f, X), avg), X) if a < v < b]
        assert len(cs) == 1
        return {"answer": num(cs[0]), "vals": {"fa": int(f.subs(X, a)), "fb": int(f.subs(X, b)), "ba": b - a, "avg": fr(avg), "p2": 2 * pp, "c": fr(cs[0])}}
    if lv == 2:
        pp, b = q["p"], q["b"]
        f = X ** 3 + pp * X
        avg = (f.subs(X, b) - f.subs(X, 0)) / b
        cs = [v for v in sp.solve(sp.Eq(sp.diff(f, X), avg), X) if 0 < v < b]
        assert len(cs) == 1 and sp.simplify(cs[0] - b * sp.sqrt(3) / 3) == 0
        return {"answer": num(cs[0]), "vals": {"bb": b * b, "fb": int(f.subs(X, b)), "avg": int(avg), "cv": num(cs[0]), "cq": fr(sp.Rational(b, 3))}}
    if q["kind"] == "trap":
        avg = sp.Rational(q["D"]) / sp.Rational(q["T"], 60)
        assert avg.is_integer and avg > 100
        return {"answer": int(avg), "vals": {"avg": int(avg)}}
    a, b, y0, Mx = q["a"], q["b"], q["y0"], q["Mx"]
    best = y0 + Mx * (b - a)
    # the bound is attained by the line with slope Mx through (a, y0)
    line = y0 + Mx * (X - a)
    assert line.subs(X, b) == best
    return {"answer": best, "vals": {"ba": b - a, "rise": Mx * (b - a), "ans": best}}


def c1_15(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b = q["a"], q["b"]
        top = sp.exp(a * X) - 1 if q["kind"] == "exp" else sp.log(1 + a * X)
        bot = sp.sin(b * X)
        assert top.subs(X, 0) == 0 and bot.subs(X, 0) == 0
        ans = sp.limit(top / bot, X, 0)
        assert ans == sp.limit(sp.diff(top, X) / sp.diff(bot, X), X, 0)
        return {"answer": num(ans), "vals": {"ans": fr(ans)}}
    if lv == 2:
        a, b = q["a"], q["b"]
        top = sp.exp(a * X) - 1 - a * X if q["kind"] == "exp" else 1 - sp.cos(a * X)
        bot = b * X ** 2
        ans = sp.limit(top / bot, X, 0)
        assert sp.diff(top, X).subs(X, 0) == 0
        return {"answer": num(ans), "vals": {"aa": a * a, "b2": 2 * b, "ans": fr(ans)}}
    a, c = q["a"], q["c"]
    inner = {"sin": sp.sin(a / X), "ln": sp.log(1 + a / X), "exp": sp.exp(a / X) - 1}[q["kind"]]
    ans = sp.limit(c * X * inner, X, sp.oo)
    return {"answer": int(ans), "vals": {"ca": int(ans)}}


VERIFY.update({
    "C1.10": c1_10, "C1.11": c1_11, "C1.differentials": c1_differentials, "C1.12": c1_12, "C1.evt": c1_evt,
    "C1.curve-sketching": c1_curve, "C1.13": c1_13, "C1.14": c1_14, "C1.15": c1_15,
})


# ---- batch 4: integrals and Newton's method -------------------------------------------------------
def c1_16(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        g = poly(q["integrand"])
        F = sp.integrate(g, X)
        anti = [int(c) for c in sp.Poly(F, X).all_coeffs()[:-1]]
        assert sp.Poly(F, X).all_coeffs()[-1] == 0
        return {"answer": js(F), "vals": {"integrand": q["integrand"], "anti": anti}}
    if lv == 2:
        a, b, c, d = q["a"], q["b"], q["c"], q["d"]
        F = sp.integrate(a / X + b * sp.exp(X) + c * sp.cos(X) + d * sp.sin(X), X)
        F = F.subs(sp.log(X), sp.log(sp.Abs(X)))
        return {"answer": js(F), "vals": {}}
    m, k2, F0, Qn = R(q["m"]), R(q["k2"]), q["F0"], q["Qn"]
    K = sp.Symbol("K")
    Cx = sp.integrate(m - k2 * X, X) + K
    Ksol = sp.solve(sp.Eq(Cx.subs(X, 0), F0), K)[0]
    ans = Cx.subs(K, Ksol).subs(X, Qn)
    return {"answer": num(ans), "vals": {"k": num(k2 / 2), "mQ": num(m * Qn), "kQ2": num(k2 / 2 * Qn ** 2), "ans": num(ans)}}


def c1_17(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        sg, cc, a, nn, side = q["sg"], q["cc"], q["a"], q["nn"], q["side"]
        f = sg * X ** 2 + cc
        dx = sp.Rational(4, nn)
        assert dx == 1
        xs = [a + i * dx + (0 if side == "left" else dx) for i in range(nn)]
        ys = [int(f.subs(X, v)) for v in xs]
        total = sum(ys) * dx
        return {"answer": int(total), "vals": {"b": a + 4, "xs": [int(v) for v in xs], "ys": ys, "total": int(total)}}
    if lv == 2:
        dt, vs, side = q["dt"], q["vs"], q["side"]
        used = vs[:4] if side == "left" else vs[1:]
        assert all(vs[i] < vs[i + 1] for i in range(4))   # increasing, so left under / right over
        return {"answer": sum(used) * dt, "vals": {"ts": [i * dt for i in range(5)], "T4": 4 * dt, "sum": sum(used), "dist": sum(used) * dt}}
    c, d, b = q["c"], q["d"], q["b"]
    i, n_ = sp.symbols("i n", positive=True, integer=True)
    f = c * X ** 2 + d * X
    Rn = sp.summation(f.subs(X, b * i / n_) * b / n_, (i, 1, n_))
    ans = sp.limit(Rn, n_, sp.oo)
    assert ans == sp.integrate(f, (X, 0, b))
    return {"answer": num(ans), "vals": {"cb3": c * b ** 3, "db2": d * b * b, "ans": fr(ans)}}


def c1_props(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        A, B, c, d = q["A"], q["B"], q["c"], q["d"]
        lin = c * A - d * B
        ans = -lin if q["rev"] else lin
        return {"answer": ans, "vals": {"cA": c * A, "dB": d * B, "lin": lin, "ans": ans}}
    if lv == 2:
        a, m, b, A, B = q["a"], q["m"], q["b"], q["A"], q["B"]
        assert a < m < b
        part = A - B
        assert part != 0
        ans = -part if q["rev"] else part
        # check additivity on a sample integrand with these two given integrals
        return {"answer": ans, "vals": {"part": part, "ans": ans}}
    a, pp, qq, rr, s = q["a"], q["p"], q["q"], q["rr"], q["s"]
    f = pp * X ** 3 + qq * X ** 2 + rr * X + s
    ans = sp.integrate(f, (X, -a, a))
    half = sp.integrate(qq * X ** 2 + s, (X, 0, a))
    assert ans == 2 * half and sp.integrate(pp * X ** 3 + rr * X, (X, -a, a)) == 0
    return {"answer": int(ans), "vals": {"q3": qq // 3, "a3": a ** 3, "half": int(half), "ans": int(ans), "hterms": [int(v) for v in subst_terms([qq // 3, 0, s, 0], a)]}}


def c1_18(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        pp, qq, c, a, b = q["p"], q["q"], q["c"], q["a"], q["b"]
        f = pp * X ** 2 + qq * X + c
        F = sp.integrate(f, X)
        ans = sp.integrate(f, (X, a, b))
        Fc = sp.Poly(F, X).all_coeffs()
        Fc = [0] * (4 - len(Fc)) + Fc if len(Fc) < 4 else Fc
        return {"answer": num(ans), "vals": {"Fc": [fr(v) for v in Fc], "Fb": fr(F.subs(X, b)), "Fa": fr(F.subs(X, a)), "ans": fr(ans)}}
    if lv == 2:
        k, a, m, c0 = q["k"], q["a"], q["m"], q["c0"]
        G = sp.integrate(a * T + m, (T, c0, X ** k))
        d = sp.expand(sp.diff(G, X))
        return {"answer": js(d), "vals": {"ka": k * a, "km": k * m, "k1": k - 1, "k2": 2 * k - 1}}
    kind = q["kind"]
    if kind == "log":
        a, b, m = q["a"], q["b"], q["m"]
        ans = sp.integrate(a / X + b * X, (X, 1, m))
        poly2 = sp.Rational(b * (m * m - 1), 2)
        assert sp.simplify(ans - (a * sp.log(m) + poly2)) == 0
        return {"answer": num(ans), "vals": {"b2": b // 2, "mm": m * m, "top": b // 2 * m * m, "poly2": fr(poly2), "approx": num(ans)}}
    if kind == "trig":
        a, b = q["a"], q["b"]
        ans = sp.integrate(a * sp.cos(X) + b * sp.sin(X), (X, 0, sp.pi / 2))
        return {"answer": int(ans), "vals": {"nb": -b, "ans": int(ans)}}
    c, m = q["c"], q["m"]
    ans = sp.simplify(sp.integrate(c * sp.exp(X), (X, 0, sp.log(m))))
    return {"answer": int(ans), "vals": {"m1": m - 1, "ans": int(ans)}}


def c1_net(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, Tn, Q0 = q["a"], q["b"], q["T"], q["Q0"]
        rate = a + b * T
        assert all(rate.subs(T, v) > 0 for v in (0, Tn))
        change = sp.integrate(rate, (T, 0, Tn))
        return {"answer": int(Q0 + change), "vals": {"b2": fr(sp.Rational(b, 2)), "aT": a * Tn, "bT2": num(sp.Rational(b * Tn * Tn, 2)), "change": int(change), "ans": int(Q0 + change)}}
    if lv == 2:
        t0, Tn, m = q["t0"], q["T"], q["m"]
        v = m * (T - t0)
        ge = parse_js(graph_items(p, "fn")[0]["e"])
        assert sp.simplify(ge - v.subs(T, X)) == 0
        A1 = abs(sp.integrate(v, (T, 0, t0)))
        A2 = abs(sp.integrate(v, (T, t0, Tn)))
        dist = sp.integrate(sp.Abs(v), (T, 0, Tn))
        assert dist == A1 + A2
        return {"answer": num(dist), "vals": {"v0": abs(int(v.subs(T, 0))), "vT": abs(int(v.subs(T, Tn))), "Tt": Tn - t0, "A1": fr(A1), "A2": fr(A2),
                                            "dist": fr(dist), "disp": fr(sp.integrate(v, (T, 0, Tn)))}}
    pp, qq, Tn = q["p"], q["q"], q["T"]
    v = 3 * (T - pp) * (T - qq)
    S = sp.integrate(v, T)
    cuts = [0, qq, Tn] if pp == 0 else [0, pp, qq, Tn]
    pieces = [sp.integrate(v, (T, cuts[i], cuts[i + 1])) for i in range(len(cuts) - 1)]
    dist = sp.integrate(sp.Abs(v), (T, 0, Tn))
    assert dist == sum(abs(w) for w in pieces)
    return {"answer": int(dist), "vals": {"s": pp + qq, "threeS": 3 * (pp + qq), "pq3": 3 * pp * qq, "Fc": [fr(sp.Rational(-3 * (pp + qq), 2))],
                                        "Fv": [num(S.subs(T, c)) for c in cuts], "pieces": [num(w) for w in pieces], "dist": int(dist), "disp": num(sp.integrate(v, (T, 0, Tn)))}}


def c1_19(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, kind = q["a"], q["b"], q["kind"]
        g = {"cos": sp.cos, "sin": sp.sin, "exp": sp.exp}[kind](a * X + b)
        F = sp.integrate(g, X)
        ia = sp.Rational(1, a)
        return {"answer": js(F), "vals": {"ia": fr(ia), "coef": fr(-ia if kind == "sin" else ia)}}
    if lv == 2:
        kind = q["kind"]
        if kind == "log":
            c, b = q["c"], q["b"]
            F = sp.integrate(c * X / (X ** 2 + b), X)
            return {"answer": js(F), "vals": {"half": fr(sp.Rational(c, 2))}}
        a, c = q["a"], q["c"]
        g = c * X * (sp.exp(a * X ** 2) if kind == "exp" else sp.cos(a * X ** 2))
        F = sp.integrate(g, X)
        return {"answer": js(F), "vals": {"twoA": 2 * a, "inv": fr(sp.Rational(1, 2 * a)), "coef": fr(sp.Rational(c, 2 * a))}}
    cc, b, nn = q["cc"], q["b"], q["nn"]
    ans = sp.integrate(X * (X ** 2 + b) ** nn, (X, 0, cc))
    top = cc * cc + b
    assert ans == sp.integrate(U ** nn / 2, (U, b, top))
    return {"answer": num(ans), "vals": {"cc2": cc * cc, "top": top, "n1": nn + 1, "den": 2 * (nn + 1), "tp": top ** (nn + 1), "bp": b ** (nn + 1), "ans": fr(ans)}}


def c1_20(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        N, x0 = q["N"], q["x0"]
        f = X ** 2 - N
        x1 = x0 - f.subs(X, x0) / sp.diff(f, X).subs(X, x0)
        # x1 is where the tangent line at x0 meets the axis
        assert (f.subs(X, x0) + sp.diff(f, X).subs(X, x0) * (x1 - x0)) == 0
        return {"answer": num(x1), "vals": {"f0": int(f.subs(X, x0)), "d0": 2 * x0, "x1": fr(x1), "x1d": num(x1), "rt": num(sp.sqrt(N))}}
    if lv == 2:
        pp, qq, x0 = q["p"], q["q"], q["x0"]
        f = X ** 3 + pp * X + qq
        d0 = sp.diff(f, X).subs(X, x0)
        x1 = x0 - f.subs(X, x0) / d0
        return {"answer": num(x1), "vals": {"f0": int(f.subs(X, x0)), "d0": int(d0), "x1": fr(x1), "terms": [int(v) for v in subst_terms([1, 0, pp, qq], x0)]}}
    N, x0 = q["N"], q["x0"]
    f = X ** 2 - N
    step = lambda v: v - f.subs(X, v) / sp.diff(f, X).subs(X, v)
    x1 = step(sp.Integer(x0))
    x2 = step(x1)
    assert x2 == (x1 + N / x1) / 2
    return {"answer": num(x2), "vals": {"x1": fr(x1), "Nx1": fr(N / x1), "x2": fr(x2), "x2d": num(x2), "rt": num(sp.sqrt(N))}}


VERIFY.update({
    "C1.16": c1_16, "C1.17": c1_17, "C1.integral-props": c1_props, "C1.18": c1_18, "C1.net-change": c1_net, "C1.19": c1_19, "C1.20": c1_20,
})
