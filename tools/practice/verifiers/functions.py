"""Independent answers for practice/functions.js (chapter 18's graph gallery: functions F.*, distributions D.*).

Each function recomputes, from the problem's inputs (p["params"]) alone, the answer and every value the steps
show (p["vals"]), with exact fractions, SymPy and math (math.erf for the normal). Graph problems are also
checked against the drawn curve: the curve in p["graph"] must be the correct option's function, and every
distractor's graph must differ visibly from it. Nothing here is copied from the JavaScript."""
import math
from fractions import Fraction as F
from math import comb, exp, log, sqrt

import sympy as sp
import sympy.stats  # noqa: F401

X = sp.symbols("x")


def fr(q):
    q = F(q)
    return {"n": q.numerator, "d": q.denominator}


def Q(d):  # {n, d} -> Fraction
    return F(d["n"], d["d"])


def Phi(z):
    return 0.5 * (1 + math.erf(z / sqrt(2)))


def rd(v, dp):
    return round(v + 0.0, dp)


# ---- the drawn curve ------------------------------------------------------------------------------------
NS = {"abs": abs, "sqrt": math.sqrt, "exp": math.exp, "ln": math.log, "log": math.log10, "sin": math.sin, "cos": math.cos,
      "tan": math.tan, "atan": math.atan, "floor": math.floor, "pi": math.pi, "e": math.e,
      "cbrt": lambda v: math.copysign(abs(v) ** (1 / 3), v)}


def curve(p, i=0):
    """The i-th "fn" item of the graph as a Python function (None where undefined)."""
    fns = [it for it in p["graph"]["items"] if it["t"] == "fn"]
    src = fns[i]["e"].replace("^", "**")

    def f(x):
        try:
            v = eval(src, {"__builtins__": {}}, dict(NS, x=x))  # noqa: S307 - our own generator's expression
            return float(v) if not isinstance(v, complex) else None
        except (ValueError, ZeroDivisionError, OverflowError):
            return None
    return f


def grid(lo, hi, steps=200):
    return [lo + (hi - lo) * i / steps for i in range(steps + 1)]


def check_choice(p, truth, fn_of, xs, min_gap):
    """truth: the correct option; fn_of(option) -> python function. The drawn curve equals fn_of(truth);
    every other option differs from it by at least min_gap somewhere in xs. Returns the correct index."""
    opts = [tuple(o) if isinstance(o, list) else o for o in p["params"]["opts"]]
    truth = tuple(truth) if isinstance(truth, list) else truth
    assert len(set(map(str, opts))) == len(opts), "duplicate options"
    idx = [str(o) for o in opts].index(str(truth))
    drawn = curve(p) if p.get("graph") and any(it["t"] == "fn" for it in p["graph"]["items"]) else fn_of(truth)
    ft = fn_of(truth)
    for xv in xs:
        a, b = drawn(xv), ft(xv)
        if a is not None and b is not None:
            assert abs(a - b) < 1e-6 * max(1, abs(b)), f"drawn curve differs from the answer at x = {xv}"
    for j, o in enumerate(opts):
        if j == idx:
            continue
        fo = fn_of(o)
        gaps = [abs(fo(xv) - ft(xv)) for xv in xs if fo(xv) is not None and ft(xv) is not None]
        assert gaps and max(gaps) >= min_gap, f"option {o} looks the same as the answer"
    return idx


def trig_exact(fn, deg):
    """sympy value of fn at deg degrees as [n, d, rad] with value n/d·√rad (rad 1, 2 or 3)."""
    th = sp.pi * sp.Rational(deg, 180)
    v = {"sin": sp.sin, "cos": sp.cos, "tan": sp.tan, "sec": sp.sec}[fn](th)
    v = sp.nsimplify(sp.simplify(v))
    for rad in (1, 2, 3):
        q = sp.nsimplify(sp.simplify(v / sp.sqrt(rad)))
        if q.is_Rational:
            if q == 0:
                return [0, 1, 1], 0.0
            return [int(q.p), int(q.q), rad], float(v)
    raise AssertionError(f"{fn}({deg}°) is not a simple surd")


def trig_steps_vals(fn, deg):
    d = deg % 360
    if d % 90 == 0:
        return {"pt": [int(sp.cos(sp.pi * d / 180)), int(sp.sin(sp.pi * d / 180))]}
    ref = d if d < 90 else 180 - d if d < 180 else d - 180 if d < 270 else 360 - d
    m, _ = trig_exact(fn, ref)
    return {"rho": fr(F(ref, 180)), "mag": m}


def piv(q):
    return float(q) * math.pi


# ---- functions ------------------------------------------------------------------------------------------
def f1(p):
    q, L = p["params"], p["level"]
    if L == 1:
        m, b = q["m"], q["b"]
        idx = check_choice(p, [m, b], lambda o: (lambda x: o[0] * x + o[1]), grid(-8, 8), 1)
        return {"answer": idx, "vals": {"y1": b + m}}
    if L == 2:
        b, d, c = q["b"], q["d"], q["c"]
        m = F(c, d)
        g = curve(p)
        assert abs(g(0) - b) < 1e-9 and abs(g(d) - (b + c)) < 1e-9
        xi = sp.solve(sp.Rational(c, d) * X + b, X)[0]
        return {"answer": float(xi), "vals": {"y2": b + c, "m": fr(m), "nb": -b, "xint": fr(F(int(xi.p), int(xi.q)))}}
    r, f = sp.symbols("r f")
    sol = sp.solve([r * q["h1"] + f - q["C1"], r * q["h2"] + f - q["C2"]], [r, f])
    R, Fee = int(sol[r]), int(sol[f])
    assert R > 0 and Fee > 0
    return {"answer": R * q["h3"] + Fee, "vals": {"dC": q["C2"] - q["C1"], "dH": q["h2"] - q["h1"], "R": R, "Rh1": R * q["h1"], "Fee": Fee,
                                              "Rh3": R * q["h3"], "cost": R * q["h3"] + Fee}}


def vertex_choice(p, kind):
    q = p["params"]
    a, h, k = q["a"], q["h"], q["k"]
    g = curve(p)
    assert abs(g(h) - k) < 1e-9 and abs(g(h + 1) - (k + a)) < 1e-9, "drawn curve's vertex"
    shape = (lambda u: u * u) if kind == "sq" else abs
    return check_choice(p, [a, h, k], lambda o: (lambda x: o[0] * shape(x - o[1]) + o[2]), grid(-8, 8), 1)


def f2(p):
    q, L = p["params"], p["level"]
    if L == 1:
        return {"answer": vertex_choice(p, "sq"), "vals": {}}
    if L == 2:
        a, b, c = q["a"], q["b"], q["c"]
        f = a * X ** 2 + b * X + c
        h = sp.solve(sp.diff(f, X), X)[0]
        k = f.subs(X, h)
        H, K = F(int(h.p), int(h.q)), F(int(k.p), int(k.q))
        return {"answer": [float(H), float(K)], "vals": {"h": fr(H), "hh": fr(H * H), "ah": fr(a * H * H), "bh": fr(b * H), "k": fr(K)}}
    v, h0 = q["v"], q["h0"]
    t = sp.symbols("t")
    hf = -5 * t ** 2 + v * t + h0
    tm = sp.solve(sp.diff(hf, t), t)[0]
    H = hf.subs(t, tm)
    tmF = F(int(tm.p), int(tm.q))
    return {"answer": float(H), "vals": {"tm": float(tmF), "tt": float(tmF ** 2), "m5": float(-5 * tmF ** 2), "vt": float(v * tmF), "H": float(H)}}


END = ["left down right up", "left up right down", "both up", "both down"]


def end_index(poly):
    right = sp.limit(poly, X, sp.oo)
    left = sp.limit(poly, X, -sp.oo)
    key = ("up" if right == sp.oo else "down", "up" if left == sp.oo else "down")
    return {("up", "down"): 0, ("down", "up"): 1, ("up", "up"): 2, ("down", "down"): 3}[key]


def f3(p):
    q, L = p["params"], p["level"]
    if L == 1:
        return {"answer": end_index(q["a"] * X ** 3 + q["b"] * X ** 2 + q["c"] * X + q["d"]), "vals": {}}
    if L == 2:
        a, roots = q["a"], q["roots"]
        fn = lambda o: (lambda x: o[0] * (x - o[1]) * (x - o[2]) * (x - o[3]))  # noqa: E731
        for z in roots:
            assert abs(curve(p)(z)) < 1e-9
        return {"answer": check_choice(p, [a, *roots], fn, grid(-4, 4), 1), "vals": {}}
    pp, qq, s = q["p"], q["q"], q["s"]
    a = F(q["an"], q["ad"])
    g = curve(p)
    d = g(0)
    assert abs(d - round(d)) < 1e-9
    d = round(d)
    for z in (pp, qq, s):
        assert abs(g(z)) < 1e-9
    a_solved = sp.solve(sp.Symbol("a") * (0 - pp) * (0 - qq) * (0 - s) - d, sp.Symbol("a"))[0]
    assert F(int(a_solved.p), int(a_solved.q)) == a
    Pr = -pp * qq * s
    return {"answer": float(a), "vals": {"d": d, "mp": -pp, "mq": -qq, "ms": -s, "Pr": Pr, "a": fr(a)}}


def f4(p):
    q, L = p["params"], p["level"]
    if L == 1:
        return {"answer": vertex_choice(p, "abs"), "vals": {}}
    if L == 2:
        a, h, k, c = q["a"], q["h"], q["k"], q["c"]
        sols = sorted(float(s) for s in sp.solve(sp.Eq(a * sp.Abs(sp.Symbol("x", real=True) - h) + k, c), sp.Symbol("x", real=True)))
        m = F(c - k, a)
        assert m > 0 and m.denominator == 1
        m = int(m)
        assert sols == sorted([h + m, h - m])
        return {"answer": [h + m, h - m], "vals": {"ck": c - k, "m": m, "x1": h + m, "x2": h - m}}
    a, h, k = q["a"], q["h"], q["k"]
    w = F(-k, a)
    assert w > 0 and w.denominator == 1
    w = int(w)
    xr = sp.Symbol("x", real=True)
    area = sp.integrate(sp.Abs(a * sp.Abs(xr - h) + k), (xr, h - w, h + w))
    assert area == w * abs(k)
    return {"answer": int(area), "vals": {"nk": -k, "absk": abs(k), "w": w, "x1": h - w, "x2": h + w, "base": 2 * w, "area": int(area)}}


def f5(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, h, k, x0 = q["a"], q["h"], q["k"], q["x0"]
        s = math.isqrt(x0 - h)
        assert s * s == x0 - h
        ans = a * sp.sqrt(x0 - h) + k
        return {"answer": int(ans), "vals": {"x0": x0, "s2": x0 - h, "s": s, "as": a * s, "ans": int(ans)}}
    if L == 2:
        a, b = q["a"], q["b"]
        xr = sp.Symbol("x", real=True)
        dom = sp.solve_univariate_inequality(a * xr + b >= 0, xr, relational=False)
        c = F(-b, a)
        truth = [1 if dom.sup == sp.oo else 0, [c.numerator, c.denominator]]
        assert (dom.inf if truth[0] else dom.sup) == sp.Rational(c.numerator, c.denominator)
        opts = [str(o) for o in q["opts"]]
        assert len(set(opts)) == 4
        return {"answer": opts.index(str(truth)), "vals": {"nb": -b, "c": fr(c)}}
    a, h, k, c = q["a"], q["h"], q["k"], q["c"]
    sols = sp.solve(sp.Eq(a * sp.sqrt(X - h) + k, c), X)
    assert len(sols) == 1
    x0 = int(sols[0])
    s = F(c - k, a)
    assert s > 0
    return {"answer": x0, "vals": {"ck": c - k, "s": int(s), "s2": int(s) ** 2, "x0": x0}}


def f6(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, h, k = q["a"], q["h"], q["k"]
        g = curve(p)
        assert abs(g(h + 1) - (k + a)) < 1e-9
        return {"answer": check_choice(p, [a, h, k], lambda o: (lambda x: None if x == o[1] else o[0] / (x - o[1]) + o[2]), [v + 0.37 for v in range(-8, 8)], 0.5), "vals": {}}
    if L == 2:
        a, h, k = q["a"], q["h"], q["k"]
        xi = sp.solve(sp.Rational(a) / (X - h) + k, X)[0]
        qv = F(a, -k)
        return {"answer": float(xi), "vals": {"nk": -k, "q": fr(qv), "xint": fr(F(int(xi.p), int(xi.q)))}}
    Fx, v, c = q["Fx"], F(str(q["v"])), F(str(q["c"]))
    nsym = sp.symbols("n", positive=True)
    nn = sp.solve(sp.Eq(sp.Rational(Fx) / nsym + sp.Rational(v.numerator, v.denominator), sp.Rational(c.numerator, c.denominator)), nsym)[0]
    assert nn == int(nn)
    return {"answer": int(nn), "vals": {"d": float(c - v), "nn": int(nn)}}


def f7(p):
    q, L = p["params"], p["level"]
    if L == 1:
        bx = q["b"] ** q["x0"]
        return {"answer": q["a"] * bx, "vals": {"bx": bx, "ans": q["a"] * bx}}
    if L == 2:
        a, b = q["a"], q["b"]
        g = curve(p)
        assert abs(g(0) - a) < 1e-9 and abs(g(1) - a * b) < 1e-9
        return {"answer": check_choice(p, [a, b, 1], lambda o: (lambda x: o[0] * (o[1] / o[2]) ** x), grid(-2, 2), 0.5), "vals": {"ab": a * b}}
    if "N0" in q:
        m = F(q["tH"], q["d"])
        assert m.denominator == 1
        m = int(m)
        return {"answer": q["N0"] * 2 ** m, "vals": {"m": m, "pm": 2 ** m, "N": q["N0"] * 2 ** m}}
    rate = F(q["rp"], 100)
    rt = rate * q["tY"]
    A = q["Pr"] * exp(float(rt))
    return {"answer": A, "vals": {"rate": float(rate), "rt": float(rt), "ert": exp(float(rt)), "A": A}}


def f8(p):
    q, L = p["params"], p["level"]
    if L == 1:
        bx = q["b"] ** q["x0"]
        ans = F(q["a"], bx)
        return {"answer": float(ans), "vals": {"bx": bx, "ans": fr(ans)}}
    if L == 2:
        if "k" in q:
            T = log(2) / q["k"]
            assert abs(exp(-q["k"] * T) - 0.5) < 1e-12
            return {"answer": T, "vals": {"ln2": log(2), "T": T}}
        k = log(2) / q["T"]
        return {"answer": k, "vals": {"ln2": log(2), "k": k}}
    if "D" in q:
        m = F(q["tH"], q["h"])
        assert m.denominator == 1
        rem = F(q["D"], 2 ** int(m))
        return {"answer": float(rem), "vals": {"m": int(m), "pm": 2 ** int(m), "rem": float(rem)}}
    m = round(log(q["pm"], 2))
    assert 2 ** m == q["pm"]
    return {"answer": m * q["hl"], "vals": {"m": m, "age": m * q["hl"]}}


def f9(p):
    q, L = p["params"], p["level"]
    if L == 1:
        h = q["h"]
        if q["ask"] == 0:
            s = sp.solve(sp.log(X - h), X)[0]
            return {"answer": int(s), "vals": {"ans": int(s)}}
        assert sp.limit(sp.log(X - h), X, h, "+") == -sp.oo
        return {"answer": h, "vals": {}}
    if L == 2:
        a, h, k = q["a"], q["h"], q["k"]
        u = F(-k, a)
        xi = sp.solve(a * sp.log(X - h) + k, X)[0]
        return {"answer": float(xi), "vals": {"nk": -k, "u": fr(u), "ev": exp(float(u)), "xi": float(xi)}}
    ratio = q["A"] / q["Pr"]
    rate = q["rp"] / 100
    t = sp.symbols("t", real=True)
    tY = float(sp.solveset(q["Pr"] * sp.exp(sp.Rational(q["rp"], 100) * t) - q["A"], t, sp.S.Reals).args[0])
    return {"answer": tY, "vals": {"ratio": ratio, "rate": rate, "L": log(ratio), "tY": tY}}


def eval_trig(p, fn):
    deg = p["params"]["deg"]
    v, val = trig_exact(fn, deg)
    return {"answer": val, "vals": {"th": fr(F(deg, 180)), "v": v, **trig_steps_vals(fn, deg)}}


def solve_trig(p):
    q = p["params"]
    alpha, pos, isSec = q["alpha"], q["pos"], q["fn"] == 1
    base = "cos" if isSec else "sin"
    mag, magv = trig_exact(base, alpha)
    target = magv if pos else -magv
    f = sp.cos if isSec else sp.sin
    sols = sorted(sp.solveset(sp.Eq(f(X), sp.nsimplify(target)), X, sp.Interval.Ropen(0, 2 * sp.pi)))
    assert len(sols) == 2
    s1, s2 = (F(int((s / sp.pi).p), int((s / sp.pi).q)) for s in sols)
    w = mag if pos else [-mag[0], mag[1], mag[2]]
    if isSec:
        sv, _ = trig_exact("sec", alpha)
        v = sv if pos else [-sv[0], sv[1], sv[2]]
    else:
        v = w
    return {"answer": [piv(s1), piv(s2)], "vals": {"v": v, "w": w, "alpha": fr(F(alpha, 180)), "mag": mag, "s1": fr(s1), "s2": fr(s2)}}


def wave_fn(o):
    T, a, bn, bd = o
    f = math.cos if T else math.sin
    return lambda x: a * f(bn / bd * x)


def f10(p):
    q, L = p["params"], p["level"]
    if L == 1:
        return eval_trig(p, "sin")
    if L == 2:
        per = F(2 * q["Bd"], q["Bn"])
        g = curve(p)
        assert abs(g(per * math.pi + 0.3) - g(0.3)) < 1e-9  # the drawn period
        idx = check_choice(p, [0, q["A"], q["Bn"], q["Bd"]], wave_fn, grid(-7, 7), 0.5)
        return {"answer": idx, "vals": {"per": fr(per)}}
    return solve_trig(p)


def f11(p):
    q, L = p["params"], p["level"]
    if L == 1:
        return eval_trig(p, "cos")
    if L == 2:
        A, Bn, Bd, D = q["A"], q["Bn"], q["Bd"], q["D"]
        f = A * sp.cos(sp.Rational(Bn, Bd) * X) + D
        crit = sp.solveset(sp.diff(f, X), X, sp.Interval.Lopen(0, 4 * sp.pi * Bd / Bn))
        mins = sorted(c for c in crit if sp.simplify(f.subs(X, c) - (D - abs(A))) == 0)
        xm = mins[0] / sp.pi
        return {"answer": float(mins[0]), "vals": {"xm": fr(F(int(xm.p), int(xm.q))), "absA": abs(A), "ymin": D - abs(A)}}
    A, T, tt, deg = q["A"], q["T"], q["tt"], q["deg"]
    th = F(2) * F(str(tt)) / T
    assert th == F(deg, 180)
    cv, cvv = trig_exact("cos", deg)
    pos = sp.nsimplify(A * sp.cos(sp.pi * sp.Rational(deg, 180)))
    pv, _ = trig_exact("cos", deg)
    posl = [pv[0] * A, pv[1], pv[2]]
    g = math.gcd(abs(posl[0]), posl[1]) or 1
    posl = [posl[0] // g, posl[1] // g, posl[2]] if posl[0] else [0, 1, 1]
    return {"answer": float(pos), "vals": {"th": fr(th), "v": cv, "pos": posl, "posv": float(pos), **trig_steps_vals("cos", deg)}}


def f12(p):
    q, L = p["params"], p["level"]
    if L == 1:
        return eval_trig(p, "tan")
    if L == 2:
        Bn, Bd = q["Bn"], q["Bd"]
        B = sp.Rational(Bn, Bd)
        if q["ask"] == 0:
            poles = sp.solveset(sp.cos(B * X), X, sp.Interval.open(0, 10))
            a = min(poles) / sp.pi
        else:
            a = sp.pi / B / sp.pi
            assert sp.simplify(sp.tan(B * (X + sp.pi / B)) - sp.tan(B * X)) == 0
        a = F(int(a.p), int(a.q))
        return {"answer": piv(a), "vals": {"ans": fr(a)}}
    d, deg, eye = q["d"], q["deg"], q["eye"]
    tv, tvv = trig_exact("tan", deg)
    top = sp.nsimplify(d * sp.tan(sp.pi * sp.Rational(deg, 180)))
    topl = [tv[0] * d, tv[1], tv[2]]
    g = math.gcd(topl[0], topl[1])
    topl = [topl[0] // g, topl[1] // g, topl[2]]
    return {"answer": eye + float(top), "vals": {"tv": tv, "top": topl, "topv": float(top), "h": eye + float(top)}}


def f13(p):
    q, L = p["params"], p["level"]
    if L == 1:
        deg = q["deg"]
        v, vv = trig_exact("tan", deg)
        ang = sp.atan(sp.nsimplify(vv)) / sp.pi
        angF = F(int(ang.p), int(ang.q))
        assert angF == F(deg, 180)
        av, _ = trig_exact("tan", abs(deg))
        return {"answer": piv(angF), "vals": {"ang": fr(angF), "aang": fr(abs(angF)), "v": v, "av": av}}
    if L == 2:
        A, D = q["A"], q["D"]
        up = sp.limit(A * sp.atan(X) + D, X, sp.oo)
        lo = sp.limit(A * sp.atan(X) + D, X, -sp.oo)
        return {"answer": [float(up), float(lo)], "vals": {"q": fr(F(A, 2)), "up": float(up), "lo": float(lo)}}
    ratio = q["rise"] / q["run"]
    rad = math.atan(ratio)
    return {"answer": math.degrees(rad), "vals": {"ratio": ratio, "rad": rad, "deg": math.degrees(rad)}}


def sigma(z):
    return 1 / (1 + sp.exp(-z))


def f14(p):
    q, L = p["params"], p["level"]
    if L == 1:
        k, s = q["k"], q["s"]
        v = sp.simplify(sigma(s * sp.log(k)))
        return {"answer": float(v), "vals": {"k1": k + 1, "ans": fr(F(int(v.p), int(v.q)))}}
    if L == 2:
        pv = F(q["pn"], q["pd"])
        sol = sp.solve(sp.Eq(sigma(X), sp.Rational(pv.numerator, pv.denominator)), X)[0]
        inv = 1 / pv
        return {"answer": float(sol), "vals": {"p": float(pv), "inv": fr(inv), "em": fr(inv - 1), "odds": fr(pv / (1 - pv)), "xv": float(sol)}}
    b0, b1 = F(q["b0t"], 10), F(q["b1t"], 10)
    z = b0 + b1 * q["h"]
    pv = 1 / (1 + exp(-float(z)))
    return {"answer": pv, "vals": {"b0": float(b0), "b1": float(b1), "b1h": float(b1 * q["h"]), "z": float(z), "nz": float(-z), "em": exp(-float(z)), "p": pv}}


def f15(p):
    q, L = p["params"], p["level"]
    if L == 1:
        k, s = q["k"], q["s"]
        v = sp.simplify(sp.tanh(s * sp.log(k)).rewrite(sp.exp))
        vF = F(int(v.p), int(v.q))
        return {"answer": float(vF), "vals": {"kk": k * k, "num": k * k - 1, "den": k * k + 1, "pos": fr(abs(vF)), "ans": fr(vF)}}
    if L == 2:
        v = F(q["vn"], q["vd"])
        sol = float(sp.atanh(sp.Rational(v.numerator, v.denominator)))
        u = (1 + v) / (1 - v)
        assert abs(math.tanh(sol) - float(v)) < 1e-12
        return {"answer": sol, "vals": {"v": float(v), "onep": float(1 + v), "onem": float(1 - v), "u": fr(u), "L": log(float(u)), "xv": sol}}
    pv = F(q["ph"], 100)
    a = sp.Symbol("a")
    # tanh(a) = 2σ(2a) − 1 as an identity
    assert sp.simplify((2 * sigma(2 * a) - 1 - sp.tanh(a)).rewrite(sp.exp)) == 0
    t = 2 * pv - 1
    ans = -t if q["neg"] else t
    return {"answer": float(ans), "vals": {"p": float(pv), "tp": float(2 * pv), "t": float(t), "ans": float(ans)}}


def relu(v):
    return max(0, v)


def f16(p):
    q, L = p["params"], p["level"]
    if L == 1:
        rel = [relu(u) for u in q["us"]]
        return {"answer": sum(rel), "vals": {"rel": rel, "sum": sum(rel)}}
    if L == 2:
        z = q["w1"] * q["x1"] + q["w2"] * q["x2"] + q["b"]
        return {"answer": relu(z), "vals": {"p1": q["w1"] * q["x1"], "p2": q["w2"] * q["x2"], "z": z, "out": relu(z)}}
    a, b = q["a"], q["b"]
    fn = lambda o: (lambda x: relu(x - o[1]) + o[0] * relu(x - o[2]))  # noqa: E731
    return {"answer": check_choice(p, [-1, a, b], fn, grid(-6, 6, 240), 0.5), "vals": {"hgt": b - a}}


def f17(p):
    q, L = p["params"], p["level"]
    if L == 1:
        A, mu = q["A"], q["mu"]
        f = A * sp.exp(-(X - mu) ** 2)
        crit = sp.solve(sp.diff(f, X), X)
        assert crit == [mu]
        return {"answer": [mu, int(f.subs(X, mu))], "vals": {}}
    if L == 2:
        mu, c, x0 = q["mu"], q["c"], q["x0"]
        d = x0 - mu
        ex = F(-d * d, c)
        return {"answer": exp(float(ex)), "vals": {"x0": x0, "d": d, "dd": d * d, "ex": fr(ex), "yv": exp(float(ex))}}
    s = q["s"]
    xr = sp.Symbol("x", real=True)
    sols = list(sp.solveset(sp.Eq(sp.exp(-xr ** 2 / (2 * sp.nsimplify(s) ** 2)), sp.Rational(1, 2)), xr, sp.S.Reals))
    W = float(max(sols) - min(sols))
    xh = W / 2
    return {"answer": W, "vals": {"ss2": 2 * s * s, "x2": xh * xh, "xh": xh, "W": W, "kc": 2 * sqrt(2 * log(2))}}


def f18(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, b = F(str(q["a"])), F(str(q["b"]))
        fa, fb = math.floor(a), math.floor(b)
        return {"answer": fa + fb, "vals": {"fa": fa, "fa1": fa + 1, "fb": fb, "fb1": fb + 1, "ans": fa + fb}}
    if L == 2:
        a = F(str(q["a"]))
        fneg, w = math.floor(-a), q["p"] // q["q"]
        assert sp.floor(sp.Rational(q["p"], q["q"])) == w
        return {"answer": fneg + w, "vals": {"fneg": fneg, "fneg1": fneg + 1, "w": w, "rem": q["p"] - w * q["q"], "ans": fneg + w}}
    t1 = q["h1"] * 60 + q["m1"]
    t2 = q["h2"] * 60 + q["m2"]
    T = t2 - t1
    nb = math.floor(F(T, 15))
    assert T % 15 != 0
    return {"answer": nb * q["rate"], "vals": {"t1": t1, "t2": t2, "T": T, "nb": nb, "rem": T - 15 * nb, "pay": nb * q["rate"]}}


def icbrt(n):
    r = round(abs(n) ** (1 / 3))
    assert r ** 3 == abs(n)
    return r if n >= 0 else -r


def f19(p):
    q, L = p["params"], p["level"]
    if L == 1:
        s1, s2 = icbrt(q["N1"]), icbrt(q["N2"])
        return {"answer": s1 + s2, "vals": {"s1": s1, "s2": s2, "ans": s1 + s2}}
    if L == 2:
        a, h, k, x0 = q["a"], q["h"], q["k"], q["x0"]
        s = icbrt(x0 - h)
        return {"answer": a * s + k, "vals": {"x0": x0, "s3": x0 - h, "s": s, "as": a * s, "ans": a * s + k}}
    a, h, k, c = q["a"], q["h"], q["k"], q["c"]
    s = F(c - k, a)
    assert s.denominator == 1 and s != 0
    s = int(s)
    x0 = h + s ** 3
    assert abs(a * math.copysign(abs(x0 - h) ** (1 / 3), x0 - h) + k - c) < 1e-9
    return {"answer": x0, "vals": {"ck": c - k, "s": s, "s3": s ** 3, "x0": x0}}


def f20(p):
    q, L = p["params"], p["level"]
    if L == 1:
        return {"answer": end_index(q["a"] * X ** q["nn"] + q["b"] * X ** q["m"]), "vals": {}}
    if L == 2:
        a, b, m, k = q["a"], q["b"], q["m"], q["k"]
        f = a * X ** m + b * X ** k
        fm = f.subs(X, -X)
        idx = 0 if sp.expand(fm - f) == 0 else 1 if sp.expand(fm + f) == 0 else 2
        return {"answer": idx, "vals": {"asm": int(sp.expand(fm).coeff(X, m)) if m else a, "bsk": int(sp.expand(fm).coeff(X, k)) if k else b}}
    a, nn = F(q["an"], q["ad"]), q["nn"]
    fn = lambda o: (lambda x: o[0] / o[1] * x ** o[2])  # noqa: E731
    idx = check_choice(p, [q["an"], q["ad"], nn], fn, grid(-2.5, 2.5), 0.5)
    return {"answer": idx, "vals": {"Y": float(a * 2 ** nn), "Yl": float(a * (-2) ** nn), "pow": 2 ** nn}}


def f21(p):
    q, L = p["params"], p["level"]
    if L == 1:
        x0 = q["x0"]
        vals = [sp.Rational(1, 2) ** x0, sp.Integer(2) ** x0, sp.exp(x0), sp.Integer(10) ** x0]
        fl = [float(v) for v in vals]
        target = fl.index(max(fl)) if q["largest"] else fl.index(min(fl))
        opts = q["opts"]
        assert sorted(opts) == [0, 1, 2, 3]
        return {"answer": opts.index(target), "vals": {"v0": fr(F(1, 2) ** x0), "v1": fr(F(2) ** x0), "v2": exp(x0), "v3": fr(F(10) ** x0)}}
    if L == 2:
        b, pp, qq = q["b"], q["p"], q["q"]
        v = sp.Integer(b) ** sp.Rational(pp, qq)
        assert v.is_Rational
        r0 = round(b ** (1 / qq))
        assert r0 ** qq == b
        return {"answer": float(v), "vals": {"r0": r0, "ans": fr(F(int(v.p), int(v.q)))}}
    b, cq = q["b"], F(q["cn"], q["cd"])
    sol = sp.solve(sp.Eq(sp.Integer(b) ** X, sp.Rational(cq.numerator, cq.denominator)), X)
    sol = [s for s in sol if s.is_real][0]
    xs = F(int(sp.nsimplify(sol).p), int(sp.nsimplify(sol).q))
    g = min(gg for gg in (2, 3, 5) if b % gg == 0)
    u = round(log(b, g))
    v = round(log(float(cq), g))
    assert g ** u == b and F(g) ** v == cq and F(v, u) == xs
    return {"answer": float(xs), "vals": {"g": g, "u": u, "v": v, "cq": fr(cq), "xs": fr(xs)}}


def f22(p):
    q, L = p["params"], p["level"]
    if L == 1:
        b, k = q["b"], q["k"]
        c = F(b) ** k
        ans = sp.log(sp.Rational(c.numerator, c.denominator), b)
        return {"answer": int(sp.simplify(ans)), "vals": {"c": fr(c)}}
    if L == 2:
        b, xv = q["b"], q["xv"]
        ans = log(xv) / log(b)
        k = math.floor(ans)
        assert b ** k < xv < b ** (k + 1)
        return {"answer": ans, "vals": {"lx": log(xv), "lb": log(b), "ans": ans, "k": k, "k1": k + 1, "bk": b ** k, "bk1": b ** (k + 1)}}
    m, k = q["m"], q["k"]
    L10 = math.log10(m)
    if q["kind"] == 0:
        pH = -math.log10(m * 10.0 ** (-k))
        return {"answer": pH, "vals": {"L": L10, "pH": pH}}
    dB = 10 * math.log10(m * 10.0 ** (-k) / 1e-12)
    return {"answer": dB, "vals": {"e": 12 - k, "L": L10, "Le": L10 + 12 - k, "dB": dB}}


def f23(p):
    q, L = p["params"], p["level"]
    if L == 1:
        A, Bn, Bd, C, D, f = q["A"], q["Bn"], q["Bd"], F(q["Cn"], q["Cd"]), q["D"], q["f"]
        y = A * sp.sin(sp.Rational(Bn, Bd) * (X - sp.pi * sp.Rational(C.numerator, C.denominator))) + D
        yf = sp.lambdify(X, y, "math")
        perF = F(2 * Bd, Bn)
        pts = [0.13 * i for i in range(40)]
        assert all(abs(yf(t + piv(perF)) - yf(t)) < 1e-9 for t in pts)  # it repeats after the period
        for j in (2, 3, 4):  # and not after any shorter fraction of it
            assert any(abs(yf(t + piv(perF) / j) - yf(t)) > 1e-6 for t in pts)
        mx, mn = A * 1 + D if A > 0 else -A + D, D - abs(A)
        amp = F(abs(A))
        assert (mx - mn) / 2 == amp
        # the phase shift: the start of a rising cycle (argument 0) is at x = C
        assert sp.simplify(y.subs(X, sp.pi * sp.Rational(C.numerator, C.denominator)) - D) == 0
        ans = [abs(A), piv(perF), piv(C), D][f]
        return {"answer": ans, "vals": {"absA": abs(A), "per": fr(perF), "C": fr(C)}}
    if L == 2:
        A, Bn, Bd, D = q["A"], q["Bn"], q["Bd"], q["D"]
        fn = lambda o: (lambda x: o[0] * math.sin(o[1] / o[2] * x) + o[3])  # noqa: E731
        idx = check_choice(p, [A, Bn, Bd, D], fn, grid(-7, 7), 0.5)
        g = curve(p)
        xs = grid(-7, 7, 2000)
        assert abs(max(g(v) for v in xs) - (D + A)) < 1e-3 and abs(min(g(v) for v in xs) - (D - A)) < 1e-3
        return {"answer": idx, "vals": {"Mx": D + A, "mn": D - A, "half": fr(F(Bd, Bn)), "qx": fr(F(Bd, 2 * Bn)), "per": fr(F(2 * Bd, Bn))}}
    R, pl, T, tt, deg = q["R"], q["pl"], q["T"], q["tt"], q["deg"]
    H = R + pl
    t = sp.Symbol("t")
    h = H - R * sp.cos(2 * sp.pi * t / T)
    assert h.subs(t, 0) == pl and h.subs(t, sp.Rational(T, 2)) == H + R
    th = 2 * F(str(tt)) / T
    assert th == F(deg, 180)
    hv = float(h.subs(t, sp.nsimplify(str(tt))))
    cv, _ = trig_exact("cos", deg)
    prod = [cv[0] * R, cv[1], cv[2]]
    g = math.gcd(abs(prod[0]), prod[1]) or 1
    prod = [prod[0] // g, prod[1] // g, prod[2]] if prod[0] else [0, 1, 1]
    return {"answer": hv, "vals": {"D2": 2 * R, "H": H, "th": fr(th), "v": cv, "prod": prod, "hv": hv, **trig_steps_vals("cos", deg)}}


def f24(p):
    q, L = p["params"], p["level"]
    if L == 1:
        return eval_trig(p, "sec")
    if L == 2:
        A, D = q["A"], q["D"]
        hi, lo = A / math.cos(0) + D, A / math.cos(math.pi) + D
        ys = [A / math.cos(v) + D for v in grid(0, 2 * math.pi, 5000) if abs(math.cos(v)) > 1e-9]
        assert all(v <= lo + 1e-9 or v >= hi - 1e-9 for v in ys)
        return {"answer": [D - A, D + A], "vals": {"lo": D - A, "hi": D + A}}
    return solve_trig(p)


def f25(p):
    q, L = p["params"], p["level"]
    if L == 1:
        k, s, f = q["k"], q["s"], q["f"]
        fn = sp.cosh if f == 0 else sp.sinh
        v = sp.nsimplify(sp.simplify(fn(s * sp.log(k)).rewrite(sp.exp)))
        vF = F(int(v.p), int(v.q))
        num = k * k + 1 if f == 0 else k * k - 1
        return {"answer": float(vF), "vals": {"kk": k * k, "num": num, "den": 2 * k, "pos": fr(F(num, 2 * k)), "ans": fr(vF)}}
    if L == 2:
        sv = F(q["sn"], q["sd"])
        xv = math.asinh(float(sv))
        c = math.cosh(xv)
        c2 = 1 + sv * sv
        cF = F(math.isqrt(c2.numerator), math.isqrt(c2.denominator))
        assert cF * cF == c2 and abs(float(cF) - c) < 1e-12
        return {"answer": float(cF), "vals": {"s2": fr(sv * sv), "c2": fr(c2), "c": fr(cF)}}
    a, w = q["a"], q["w"]
    sag = a * math.cosh(w / a) - a * math.cosh(0)
    return {"answer": sag, "vals": {"w2": 2 * w, "u": w / a, "ch": math.cosh(w / a), "sag": sag}}


def f26(p):
    q, L = p["params"], p["level"]
    if L == 1:
        k = q["k"]
        v = log(1 + exp(log(k)))
        return {"answer": v, "vals": {"k1": k + 1, "ans": v}}
    if L == 2:
        k, s = q["k"], q["s"]
        d = sp.diff(sp.log(1 + sp.exp(X)), X).subs(X, s * sp.log(k))
        d = sp.nsimplify(sp.simplify(d))
        return {"answer": float(d), "vals": {"k1": k + 1, "ans": fr(F(int(d.p), int(d.q)))}}
    a = q["a"]
    sp_ = log(1 + exp(a))
    gap = sp_ - relu(a)
    assert abs(gap - log(1 + exp(-abs(a)))) < 1e-12
    return {"answer": gap, "vals": {"ea": exp(a), "sp": sp_, "relu": relu(a), "gap": gap}}


def H(v):
    return 1 if v >= 0 else 0


def f27(p):
    q, L = p["params"], p["level"]
    if L == 1:
        hs = [H(u) for u in q["us"]]
        return {"answer": sum(hs), "vals": {"hs": hs, "sum": sum(hs)}}
    if L == 2:
        d = q["t0"] - q["c"]
        return {"answer": q["a"] + q["b"] * H(d), "vals": {"d": d, "Hd": H(d), "Pw": q["a"] + q["b"] * H(d)}}
    Vh, pp, qq = q["Vh"], q["p"], q["q"]
    segs = [it for it in p["graph"]["items"] if it["t"] == "seg"]
    assert segs[1]["a"] == [pp, Vh] and segs[1]["b"] == [qq, Vh]
    fn = lambda o: (lambda x: o[0] * (H(x - o[1]) - H(x - o[2])))  # noqa: E731
    return {"answer": check_choice(p, [Vh, pp, qq], fn, [v / 4 for v in range(-24, 25)], 0.5), "vals": {"width": qq - pp}}


def sgn(v):
    return (v > 0) - (v < 0)


def f28(p):
    q, L = p["params"], p["level"]
    if L == 1:
        ss = [sgn(u) for u in q["us"]]
        return {"answer": sum(ss), "vals": {"ss": ss, "sum": sum(ss)}}
    if L == 2:
        a, h, x0 = q["a"], q["h"], q["x0"]
        xr = sp.Symbol("x", real=True)
        slope = sp.diff(a * sp.Abs(xr - h), xr).subs(xr, x0)
        return {"answer": int(slope), "vals": {"d": x0 - h, "s": sgn(x0 - h), "slope": int(slope), "y0": a * abs(x0 - h)}}
    pp, qq, xs = q["p"], q["q"], q["xs"]
    f1 = [v - pp for v in xs]
    f2 = [v - qq for v in xs]
    prods = [a * b for a, b in zip(f1, f2)]
    ss = [sgn(v) for v in prods]
    return {"answer": sum(ss), "vals": {"f1": f1, "f2": f2, "prods": prods, "ss": ss, "sum": sum(ss)}}


def f29(p):
    q, L = p["params"], p["level"]
    xv = F(str(q.get("xv", 0)))
    if L == 1:
        w = math.floor(xv)
        return {"answer": float(xv - w), "vals": {"w": w, "fr": float(xv - w)}}
    if L == 2:
        fl = math.floor(xv)
        assert 0 <= xv - fl < 1
        return {"answer": float(xv - fl), "vals": {"fl0": fl, "fl1": fl + 1, "nfl": -fl, "fr": float(xv - fl)}}
    A, T, t = q["A"], q["T"], q["t"]
    cyc = F(t, T)
    frac = cyc - math.floor(cyc)
    return {"answer": float(A * frac), "vals": {"cyc": float(cyc), "w": math.floor(cyc), "fr": float(frac), "v": float(A * frac)}}


def f30(p):
    q, L = p["params"], p["level"]
    if L == 1:
        K, P0 = q["K"], q["P0"]
        Asym = sp.solve(sp.Eq(sp.Integer(K) / (1 + sp.Symbol("A")), P0), sp.Symbol("A"))[0]
        A = F(int(Asym.p), int(Asym.q))
        return {"answer": float(A), "vals": {"ratio": fr(F(K, P0)), "A": fr(A)}}
    K, A, rr = q["K"], q["A"], q["rr"]
    if L == 2:
        rt = rr * q["tY"]
        Pv = K / (1 + A * exp(-rt))
        return {"answer": Pv, "vals": {"rt": rt, "e": exp(-rt), "den": 1 + A * exp(-rt), "Pv": Pv}}
    t = sp.Symbol("t")
    Pt = K / (1 + A * sp.exp(-sp.nsimplify(rr) * t))
    infl = sp.solve(sp.diff(Pt, t, 2), t)
    ts = float([s for s in infl if s.is_real][0])
    assert abs(float(Pt.subs(t, ts)) - K / 2) < 1e-6
    return {"answer": ts, "vals": {"half": K / 2, "lnA": log(A), "ts": ts}}


def f31(p):
    q, L = p["params"], p["level"]
    if L == 1:
        Cc, pp, qq, xv = q["Cc"], q["p"], q["q"], q["xv"]
        v = sp.Integer(xv) ** sp.Rational(pp, qq)
        assert v.is_Rational
        r0 = round(xv ** (1 / qq))
        assert r0 ** qq == xv
        return {"answer": float(Cc * v), "vals": {"r0": r0, "pv": fr(F(int(v.p), int(v.q))), "ans": fr(Cc * F(int(v.p), int(v.q)))}}
    if L == 2:
        x1, y1, x2, y2 = q["x1"], q["y1"], q["x2"], q["y2"]
        k = sp.nsimplify(sp.log(sp.Rational(y2, y1)) / sp.log(sp.Rational(x2, x1)))
        kF = F(int(k.p), int(k.q))
        xr = x2 // x1
        assert xr * x1 == x2
        g = 2 if xr % 2 == 0 else 3
        u = round(log(xr, g))
        v = round(log(y2 / y1, g))
        assert g ** u == xr and F(g) ** v == F(y2, y1) and F(v, u) == kF
        # both points on y = C x^k with one C
        assert sp.simplify(y1 / sp.Integer(x1) ** k - y2 / sp.Integer(x2) ** k) == 0
        return {"answer": float(kF), "vals": {"xr": xr, "yr": fr(F(y2, y1)), "g": g, "u": u, "v": v, "k": fr(kF)}}
    s, M1, M2 = q["s"], q["M1"], q["M2"]
    ratio = F(M2, M1)
    if "B1" in q:
        mult = sp.Rational(ratio.numerator, ratio.denominator) ** sp.Rational(3, 4)
        assert mult.is_Integer
        return {"answer": q["B1"] * int(mult), "vals": {"ratio": int(ratio), "mult": int(mult), "B2": q["B1"] * int(mult)}}
    mult = sp.Rational(ratio.numerator, ratio.denominator) ** sp.Rational(2, 3)
    assert mult.is_Integer
    A2 = F(str(q["A1"])) * int(mult)
    return {"answer": float(A2), "vals": {"ratio": int(ratio), "mult": int(mult), "A2": float(A2)}}


def f32(p):
    q, L = p["params"], p["level"]
    pp, qq, s, t, c = q["p"], q["q"], q["s"], q["t"], q["c"]
    left, right = pp * X ** 2 + qq, s * X + t
    f = sp.Piecewise((left, X < c), (right, True))
    if L == 1:
        x0 = q["x0"]
        return {"answer": int(f.subs(X, x0)), "vals": {"x0sq": x0 * x0, "val": int(f.subs(X, x0))}}
    if L == 2:
        Lc = left.subs(X, c)  # the left piece is a polynomial, so its limit at c is its value
        assert f.subs(X, c - sp.Rational(1, 10 ** 9)) == left.subs(X, c - sp.Rational(1, 10 ** 9))
        Rc = f.subs(X, c)
        return {"answer": int(Rc - Lc), "vals": {"csq": c * c, "Lc": int(Lc), "Rc": int(Rc), "jump": int(Rc - Lc)}}
    v = q["v"]
    xr = sp.Symbol("x", real=True)
    fr_ = sp.Piecewise((pp * xr ** 2 + qq, xr < c), (s * xr + t, True))
    sols = sorted(int(z) for z in sp.solveset(sp.Eq(fr_, v), xr, sp.S.Reals))
    S = (v - qq) * pp
    rt = math.isqrt(S)
    assert rt * rt == S
    xr2 = F(v - t, s)
    assert xr2.denominator == 1
    cand = [-rt, rt] if rt else [0]
    rejected = len([z for z in cand if z >= c]) + (0 if xr2 >= c else 1)
    assert sols and rejected >= 1
    return {"answer": sols, "vals": {"S": S, "rt": rt, "xr": int(xr2), "sols": sols}}


def f33(p):
    q, L = p["params"], p["level"]
    Y = sp.Symbol("y")
    if L == 1:
        h, k, R2 = q["h"], q["k"], q["R2"]
        rr = math.isqrt(R2)
        assert rr * rr == R2
        if q["ask"] == 0:
            return {"answer": [h, k], "vals": {}}
        return {"answer": rr, "vals": {"rr": rr}}
    if L == 2:
        D, E, Fc = q["D"], q["E"], q["Fc"]
        expr = X ** 2 + Y ** 2 + D * X + E * Y + Fc
        h, k = F(-D, 2), F(-E, 2)
        R2 = h * h + k * k - Fc
        assert sp.expand((X - sp.Rational(h)) ** 2 + (Y - sp.Rational(k)) ** 2 - sp.Rational(R2) - expr) == 0
        rr = math.isqrt(int(R2))
        assert rr * rr == R2 and h.denominator == 1 and k.denominator == 1
        return {"answer": rr, "vals": {"hh": int(h * h), "kk": int(k * k), "R2": int(R2), "h": int(h), "k": int(k), "rr": rr}}
    h, k, a, b = q["h"], q["k"], q["a"], q["b"]
    R2 = a * a + b * b
    circ = [it for it in p["graph"]["items"] if it["t"] == "circle"][0]
    assert circ["c"] == [h, k] and abs(circ["r"] ** 2 - R2) < 1e-9
    opts = [tuple(o) for o in q["opts"]]
    assert len(set(opts)) == 4
    idx = opts.index((h, k, R2))
    for o in opts:
        if o != (h, k, R2):
            assert (o[0], o[1]) != (h, k) or abs(sqrt(o[2]) - sqrt(R2)) >= 0.5
    return {"answer": idx, "vals": {"px": h + a, "py": k + b, "aa": a * a, "bb": b * b, "R2": R2}}


def f34(p):
    q, L = p["params"], p["level"]
    A, B = q["A"], q["B"]
    a, b = math.isqrt(A), math.isqrt(B)
    assert a * a == A and b * b == B
    if L == 1:
        Y = sp.Symbol("y")
        ell = X ** 2 / sp.Integer(A) + Y ** 2 / sp.Integer(B) - 1
        xints = sorted(int(v) for v in sp.solve(ell.subs(Y, 0), X))
        yints = sorted(int(v) for v in sp.solve(ell.subs(X, 0), Y))
        if q["ask"] == 0:
            L_ = max(xints[1] - xints[0], yints[1] - yints[0])
            return {"answer": L_, "vals": {"a": a, "b": b, "L": L_}}
        return {"answer": [xints[1], xints[0]], "vals": {"a": a, "b": b}}
    big, small = max(A, B), min(A, B)
    c = math.isqrt(big - small)
    assert c * c == big - small
    if L == 2:
        return {"answer": c, "vals": {"c2": c * c, "c": c}}
    if q["kind"] == 0:
        ans = a + c if q["far"] else a - c
        return {"answer": ans, "vals": {"a": a, "b": b, "c2": c * c, "c": c, "ans": ans}}
    d1 = q["d1"]
    assert a - c <= d1 <= a + c
    return {"answer": 2 * a - d1, "vals": {"a": a, "a2": 2 * a, "d2": 2 * a - d1}}


def f35(p):
    q, L = p["params"], p["level"]
    A, B = q["A"], q["B"]
    a, b = math.isqrt(A), math.isqrt(B)
    assert a * a == A and b * b == B
    if L == 1:
        Y = sp.Symbol("y")
        yy = sp.solve(X ** 2 / A - Y ** 2 / B - 1, Y)
        m = sp.limit(max(yy, key=lambda e: e.subs(X, 10)) / X, X, sp.oo)
        return {"answer": float(m), "vals": {"a": a, "b": b, "m": fr(F(int(m.p), int(m.q)))}}
    c = math.isqrt(A + B)
    assert c * c == A + B
    if L == 2:
        return {"answer": c, "vals": {"c2": c * c, "c": c}}
    assert q["c"] == c and q["d1"] >= c + a
    return {"answer": q["d1"] - 2 * a, "vals": {"a": a, "a2": 2 * a, "d2": q["d1"] - 2 * a}}


def petals(k):
    # count the lobes of r = cos(kθ) numerically: maxima of |r| over [0, 2π) with distinct tip points
    tips = set()
    for i in range(4 * k):
        th = i * math.pi / k / 2
        r = math.cos(k * th)
        if abs(abs(r) - 1) < 1e-9:
            tips.add((round(r * math.cos(th), 6) + 0.0, round(r * math.sin(th), 6) + 0.0))
    return len(tips)


def f36(p):
    q, L = p["params"], p["level"]
    k = q["k"]
    P_ = petals(k)
    if L == 1:
        return {"answer": P_, "vals": {"P": P_}}
    if L == 2:
        opts = q["opts"]
        poly = [it for it in p["graph"]["items"] if it["t"] == "poly"][0]["p"]
        for i in (0, 37, 123, 400):
            th = i * math.pi / 360
            r = math.cos(k * th)
            assert abs(poly[i][0] - r * math.cos(th)) < 1e-3 and abs(poly[i][1] - r * math.sin(th)) < 1e-3
        counts = sorted(petals(j) for j in opts)
        assert len(set(counts)) == 4
        return {"answer": opts.index(k), "vals": {"P": P_, "counts": [petals(j) for j in sorted(opts)]}}
    ang = F(2, P_)
    return {"answer": piv(ang), "vals": {"P": P_, "ang": fr(ang)}}


# ---- distributions --------------------------------------------------------------------------------------
def d1(p):
    q, L = p["params"], p["level"]
    if L == 1:
        pv = F(q["pn"], q["pd"])
        Xs = sp.stats.Bernoulli("X", sp.Rational(pv.numerator, pv.denominator))
        v = sp.stats.variance(Xs)
        return {"answer": float(v), "vals": {"q": fr(1 - pv), "v": fr(F(int(v.p), int(v.q)))}}
    if L == 2:
        pv = F(str(q["p"]))
        v = pv * (1 - pv)
        return {"answer": sqrt(float(v)), "vals": {"q": float(1 - pv), "v": float(v), "sd": sqrt(float(v))}}
    pv, W, Ls = F(str(q["p"])), q["W"], q["L"]
    E = W * pv + (-Ls) * (1 - pv)
    Var = (W - E) ** 2 * pv + (-Ls - E) ** 2 * (1 - pv)
    if q["askVar"] == 0:
        return {"answer": float(E), "vals": {"q": float(1 - pv), "pW": float(pv * W), "qL": float((1 - pv) * Ls), "E": float(E)}}
    assert Var == (W + Ls) ** 2 * pv * (1 - pv)
    return {"answer": float(Var), "vals": {"q": float(1 - pv), "WL": W + Ls, "pq": float(pv * (1 - pv)), "WL2": (W + Ls) ** 2, "Var": float(Var)}}


def binom(nn, k, pv):
    return comb(nn, k) * pv ** k * (1 - pv) ** (nn - k)


def d2(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        pv = F(q["pn"], q["pd"])
        nn = q["nn"]
        if L == 1:
            k = q["k"]
            ans = binom(nn, k, pv)
            return {"answer": float(ans), "vals": {"q": fr(1 - pv), "c": comb(nn, k), "pk": fr(pv ** k), "qk": fr((1 - pv) ** (nn - k)), "ans": fr(ans), "nk": nn - k}}
        if q["ask"] == 0:
            ans = sum(binom(nn, k, pv) for k in range(1, nn + 1))
            return {"answer": float(ans), "vals": {"q": fr(1 - pv), "q0": fr((1 - pv) ** nn), "ans": fr(ans)}}
        ans = binom(nn, 0, pv) + binom(nn, 1, pv)
        return {"answer": float(ans), "vals": {"q": fr(1 - pv), "p0": fr(binom(nn, 0, pv)), "q1": fr((1 - pv) ** (nn - 1)), "p1": fr(binom(nn, 1, pv)), "ans": fr(ans), "n1": nn - 1}}
    nn, pv = q["nn"], F(str(q["p"]))
    base = {"pct": int(pv * 100), "q": float(1 - pv), "mean": float(nn * pv)}
    if q["ask"] == 0:
        p0, p1 = binom(nn, 0, pv), binom(nn, 1, pv)
        return {"answer": float(p0 + p1), "vals": {**base, "p0": float(p0), "p1": float(p1), "ans": float(p0 + p1), "n1": nn - 1}}
    ans = binom(nn, 2, pv)
    return {"answer": float(ans), "vals": {**base, "c": comb(nn, 2), "pp": float(pv * pv), "qq": float((1 - pv) ** (nn - 2)), "ans": float(ans), "n2": nn - 2}}


def d3(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        pv = F(q["pn"], q["pd"])
        G = sp.stats.Geometric("G", sp.Rational(pv.numerator, pv.denominator))
        if L == 1:
            k = q["k"]
            ans = sp.stats.P(sp.Eq(G, k))
            return {"answer": float(ans), "vals": {"q": fr(1 - pv), "k1": k - 1, "qk": fr((1 - pv) ** (k - 1)), "ans": fr(F(int(ans.p), int(ans.q)))}}
        if q["ask"] == 0:
            k = q["k"]
            ans = (1 - pv) ** k
            assert ans == 1 - sum((1 - pv) ** (j - 1) * pv for j in range(1, k + 1))
            return {"answer": float(ans), "vals": {"q": fr(1 - pv), "ans": fr(ans)}}
        v = sp.stats.variance(G)
        return {"answer": float(v), "vals": {"q": fr(1 - pv), "p2": fr(pv * pv), "mean": fr(1 / pv), "ans": fr(F(int(v.p), int(v.q)))}}
    pv, s, m = F(str(q["p"])), q["s"], q["m"]
    qv = 1 - pv
    ans = qv ** (s + m) / qv ** s
    return {"answer": float(ans), "vals": {"q": float(qv), "sm": s + m, "ans": float(ans)}}


def pois(lam, k):
    return lam ** k * exp(-lam) / math.factorial(k)


def d4(p):
    q, L = p["params"], p["level"]
    if L == 1:
        lam, k = q["lam"], q["k"]
        return {"answer": pois(lam, k), "vals": {"lk": lam ** k, "kf": math.factorial(k), "e": exp(-lam), "ans": pois(lam, k)}}
    if L == 2:
        lam = q["lam"]
        ans = sum(pois(lam, k) for k in range(3))
        return {"answer": ans, "vals": {"s": 1 + lam + lam * lam / 2, "e": exp(-lam), "ans": ans}}
    lam = float(F(q["lh"] * q["mins"], 60))
    if q["ask"] == 0:
        return {"answer": 1 - pois(lam, 0), "vals": {"lam": lam, "e": exp(-lam), "ans": 1 - pois(lam, 0)}}
    k = q["k"]
    return {"answer": pois(lam, k), "vals": {"lam": lam, "lk": lam ** k, "kf": math.factorial(k), "e": exp(-lam), "ans": pois(lam, k)}}


def d5(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        a, b = q["a"], q["b"]
        U = sp.stats.Uniform("U", a, b)
        w = b - a
        if L == 1:
            ask = q["ask"]
            if ask == 0:
                m = sp.stats.E(U)
                return {"answer": float(m), "vals": {"mu": fr(F(int(m.p), int(m.q)))}}
            if ask == 1:
                h = sp.stats.density(U)(sp.Rational(a + b, 2))
                return {"answer": float(h), "vals": {"w": w, "h": fr(F(int(h.p), int(h.q)))}}
            v = sp.stats.variance(U)
            return {"answer": float(v), "vals": {"w": w, "ww": w * w, "v": fr(F(int(v.p), int(v.q)))}}
        c, d = q["c"], q["d"]
        pr = sp.stats.P(sp.And(U > c, U < d))
        lo, hi = max(a, c), min(b, d)
        return {"answer": float(pr), "vals": {"w": w, "lo": lo, "hi": hi, "len": hi - lo, "ans": fr(F(int(pr.p), int(pr.q)))}}
    T, s, w = q["T"], q["s"], q["w"]
    pS, pW = F(T - s, T), F(T - w, T)
    return {"answer": float(pW / pS), "vals": {"Ts": T - s, "Tw": T - w, "pS": fr(pS), "pW": fr(pW), "ans": fr(pW / pS)}}


def d6(p):
    q, L = p["params"], p["level"]
    mu, sg = q["mu"], q["sg"]
    if L == 1:
        kind, k = q["kind"], q["k"]
        W = [68, 95, 99.7][k - 1]
        # the rule's numbers are the normal's within-k-SD mass, rounded
        assert abs(100 * (Phi(k) - Phi(-k)) - W) < 0.6
        if kind == 0:
            bnd, ans = [mu - k * sg, mu + k * sg], W
        elif kind in (1, 2):
            bnd, ans = [mu + k * sg if kind == 1 else mu - k * sg], (100 - W) / 2
        elif kind == 3:
            bnd, ans = [mu, mu + k * sg], W / 2
        else:
            bnd, ans = [mu - sg, mu + 2 * sg], 68 / 2 + 95 / 2
        return {"answer": ans, "vals": {"bnd": bnd, "W": W, "ans": ans, "rest": 100 - W}}
    if L == 2:
        z = (q["xv"] - mu) / sg
        ph = Phi(z)
        ans = ph if q["below"] else 1 - ph
        return {"answer": ans, "vals": {"z": z, "ph": ph, "ans": ans}}
    z1, z2 = (q["a"] - mu) / sg, (q["b"] - mu) / sg
    p1, p2 = Phi(z1), Phi(z2)
    route = rd(p2, 4) - rd(p1, 4)
    assert round(route, 3) == round(p2 - p1, 3)
    return {"answer": p2 - p1, "vals": {"z1": z1, "z2": z2, "p1": p1, "p2": p2, "route": route, "ans": p2 - p1}}


def d7(p):
    q, L = p["params"], p["level"]
    if L == 1:
        nu = q["nu"]
        import mpmath
        dens = sp.lambdify(sp.Symbol("t"), sp.stats.density(sp.stats.StudentT("T", nu))(sp.Symbol("t")), "mpmath")
        num = float(mpmath.quad(lambda t: t * t * dens(t), [-mpmath.inf, 0, mpmath.inf]))
        v = F(nu, nu - 2)
        assert abs(num - float(v)) < 1e-8 * float(v)
        return {"answer": float(v), "vals": {"nu2": nu - 2, "v": fr(v)}}
    if L == 2:
        nn, s, xbar, mu0 = q["nn"], q["s"], F(str(q["xbar"])), q["mu0"]
        t = (xbar - mu0) / (s / sp.sqrt(nn))
        t = sp.nsimplify(t)
        return {"answer": float(t), "vals": {"diff": float(xbar - mu0), "rn": math.isqrt(nn), "t": float(t), "df": nn - 1}}
    m = q["m"]
    Vv = 1 + F(1, m)
    nu = next(n for n in range(3, 10000) if F(n, n - 2) <= Vv)
    return {"answer": nu, "vals": {"Vv": float(Vv), "num": float(2 * Vv), "den": float(Vv - 1), "nu": nu, "nu2": nu - 2}}


def d8(p):
    q, L = p["params"], p["level"]
    if L == 1:
        mins = F(60, q["lam"])
        return {"answer": float(mins), "vals": {"mins": float(mins)}}
    if L == 2:
        u = F(q["xm"], q["mean"])
        Ex = sp.stats.Exponential("E", sp.Rational(1, q["mean"]))
        ans = float(sp.stats.cdf(Ex)(q["xm"]))
        return {"answer": ans, "vals": {"u": fr(u), "e": exp(-float(u)), "ans": ans}}
    mean, s, t = q["mean"], q["s"], q["t"]
    surv = lambda x: exp(-x / mean)  # noqa: E731
    ans = surv(s + t) / surv(s)
    return {"answer": ans, "vals": {"st": s + t, "u": t / mean, "ans": ans}}


def d9(p):
    q, L = p["params"], p["level"]
    if L == 1:
        k, th = q["k"], F(str(q["th"]))
        G = sp.stats.Gamma("G", k, sp.Rational(th.numerator, th.denominator))
        m, v = sp.stats.E(G), sp.stats.variance(G)
        return {"answer": float(v if q["askVar"] else m), "vals": {"mean": float(m), "th2": float(th * th), "v": float(v)}}
    if L == 2:
        mean, v = F(str(q["mean"])), F(str(q["v"]))
        k, th = sp.symbols("k th", positive=True)
        sol = sp.solve([k * th - sp.Rational(mean.numerator, mean.denominator), k * th ** 2 - sp.Rational(v.numerator, v.denominator)], [k, th], dict=True)[0]
        return {"answer": float(sol[k] if q["askK"] else sol[th]), "vals": {"th": float(sol[th]), "k": float(sol[k])}}
    lam, k = q["lam"], q["k"]
    th = 60 / lam
    G = sp.stats.Gamma("G", k, sp.Rational(60, lam))
    sd = float(sp.sqrt(sp.stats.variance(G)))
    return {"answer": sd, "vals": {"th": th, "mean": k * th, "rk": sqrt(k), "sd": sd}}


def d10(p):
    q, L = p["params"], p["level"]
    a, b = q["a"], q["b"]
    if L == 1:
        m = sp.stats.E(sp.stats.Beta("B", a, b))
        m = sp.nsimplify(sp.simplify(m))
        return {"answer": float(m), "vals": {"s": a + b, "mu": fr(F(int(m.p), int(m.q)))}}
    if L == 2:
        v = sp.nsimplify(sp.simplify(sp.stats.variance(sp.stats.Beta("B", a, b))))
        s = a + b
        return {"answer": float(v), "vals": {"s": s, "s2": s * s, "s1": s + 1, "ab": a * b, "den": s * s * (s + 1), "v": fr(F(int(v.p), int(v.q)))}}
    nn, k = q["nn"], q["k"]
    th = sp.Symbol("th", positive=True)
    post = th ** (a - 1 + k) * (1 - th) ** (b - 1 + nn - k)
    pm = sp.integrate(th * post, (th, 0, 1)) / sp.integrate(post, (th, 0, 1))
    A, B = a + k, b + nn - k
    assert pm == sp.Rational(A, A + B)
    return {"answer": float(pm), "vals": {"prior": fr(F(a, a + b)), "fails": nn - k, "A": A, "B": B, "AB": A + B, "post": fr(F(A, A + B))}}


def d11(p):
    q, L = p["params"], p["level"]
    if L == 1:
        k = q["k"]
        v = sp.stats.variance(sp.stats.ChiSquared("C", k))
        if q["ask"] == 0:
            return {"answer": int(v), "vals": {"v": int(v)}}
        sd = math.isqrt(int(v))
        assert sd * sd == v
        return {"answer": sd, "vals": {"v": int(v), "sd": sd}}
    if L == 2:
        xv = q["xv"]
        ans = 1 - float(sp.stats.cdf(sp.stats.ChiSquared("C", 2))(sp.nsimplify(str(xv))))
        return {"answer": ans, "vals": {"half": xv / 2, "ans": ans}}
    N, k, O = q["N"], q["k"], q["O"]
    assert sum(O) == N
    E = F(N, k)
    assert E.denominator == 1
    chi = sum(F((o - E) ** 2) / E for o in O)
    d = [int(o - E) for o in O]
    sq = [x * x for x in d]
    return {"answer": float(chi), "vals": {"E": int(E), "d": d, "sq": sq, "ss": sum(sq), "chi": float(chi), "df": k - 1}}


def d12(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        mu, sg = q["mu"], q["sg"]
        med = exp(mu)
        if L == 1:
            return {"answer": med, "vals": {"med": med}}
        import mpmath
        mean = float(mpmath.quad(lambda x: x * mpmath.npdf(mpmath.log(x), mu, sg) / x, [0, exp(mu), mpmath.inf]))
        assert abs(mean - exp(mu + sg * sg / 2)) < 1e-9 * mean
        mean = exp(mu + sg * sg / 2)
        return {"answer": mean, "vals": {"s2": sg * sg, "h": sg * sg / 2, "ex": mu + sg * sg / 2, "mean": mean, "med": med}}
    m, sg, ratio = q["m"], q["sg"], q["ratio"]
    xv = m * ratio
    z = (log(xv) - log(m)) / sg
    ans = 1 - Phi(z)
    z2 = rd(z, 2)
    return {"answer": ans, "vals": {"xv": xv, "L": log(ratio), "z": z, "z2": z2, "tab": 1 - Phi(z2), "ans": ans}}


def d13(p):
    q, L = p["params"], p["level"]
    if L == 1:
        al, xm, xv = q["al"], q["xm"], q["xv"]
        P_ = sp.stats.Pareto("P", xm, al)
        ans = sp.stats.P(P_ > xv)
        k = xv // xm
        return {"answer": float(ans), "vals": {"k": k, "ans": fr(F(int(ans.p), int(ans.q)))}}
    if L == 2:
        al, xm = F(str(q["al"])), q["xm"]
        P_ = sp.stats.Pareto("P", xm, sp.Rational(al.numerator, al.denominator))
        m = sp.nsimplify(sp.simplify(sp.stats.E(P_)))
        return {"answer": float(m), "vals": {"num": float(al * xm), "den": float(al - 1), "mean": fr(F(int(m.p), int(m.q)))}}
    al, a, b = sp.nsimplify(str(q["al"])), q["a"], q["b"]
    surv = lambda x: (sp.Integer(1) / x) ** al  # noqa: E731
    ans = sp.nsimplify(sp.simplify(surv(b) / surv(a)))
    assert ans.is_Rational
    return {"answer": float(ans), "vals": {"rat": b // a, "ans": fr(F(int(ans.p), int(ans.q)))}}


def d14(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        pv = F(q["pn"], q["pd"])
        rr = q["rr"]
        if L == 1:
            # mean of the trials to the r-th success, by summing the series
            mean = sum(k * comb(k - 1, rr - 1) * float(pv) ** rr * float(1 - pv) ** (k - rr) for k in range(rr, 4000))
            assert abs(mean - rr / float(pv)) < 1e-6
            return {"answer": float(F(rr) / pv), "vals": {"inv": fr(1 / pv), "mean": fr(F(rr) / pv)}}
        k = q["k"]
        ans = comb(k - 1, rr - 1) * pv ** rr * (1 - pv) ** (k - rr)
        return {"answer": float(ans), "vals": {"k1": k - 1, "r1": rr - 1, "c": comb(k - 1, rr - 1), "pr": fr(pv ** rr), "qk": fr((1 - pv) ** (k - rr)), "kr": k - rr, "ans": fr(ans), "q": fr(1 - pv)}}
    pv, rr, k = F(str(q["p"])), q["rr"], q["k"]
    ans = comb(k - 1, rr - 1) * pv ** rr * (1 - pv) ** (k - rr)
    return {"answer": float(ans), "vals": {"q": float(1 - pv), "k1": k - 1, "r1": rr - 1, "kr": k - rr, "c": comb(k - 1, rr - 1), "pr": float(pv ** rr), "qk": float((1 - pv) ** (k - rr)), "ans": float(ans)}}


def d15(p):
    q, L = p["params"], p["level"]
    N, K, nn = q["N"], q["K"], q["nn"]
    Hg = sp.stats.Hypergeometric("H", N, K, nn)
    if L == 1:
        m = sp.stats.E(Hg)
        return {"answer": float(m), "vals": {"nK": nn * K, "mean": fr(F(int(m.p), int(m.q)))}}
    if L == 2:
        k = q["k"]
        ans = sp.stats.P(sp.Eq(Hg, k))
        a, b, t = comb(K, k), comb(N - K, nn - k), comb(N, nn)
        return {"answer": float(ans), "vals": {"NK": N - K, "nk": nn - k, "a": a, "b": b, "t": t, "ab": a * b, "ans": fr(F(int(ans.p), int(ans.q)))}}
    ans = sp.stats.P(Hg >= 1)
    g, t = comb(N - K, nn), comb(N, nn)
    return {"answer": float(ans), "vals": {"NK": N - K, "g": g, "t": t, "none": fr(F(g, t)), "ans": fr(F(int(ans.p), int(ans.q)))}}


def d16(p):
    q, L = p["params"], p["level"]
    if L <= 2:
        nn = q["nn"]
        D = sp.stats.DiscreteUniform("D", list(range(1, nn + 1)))
        if L == 1:
            m = sp.stats.E(D)
            return {"answer": float(m), "vals": {"n1": nn + 1, "mu": fr(F(int(m.p), int(m.q)))}}
        v = sp.stats.variance(D)
        return {"answer": float(v), "vals": {"sq1": nn * nn - 1, "v": fr(F(int(v.p), int(v.q)))}}
    m, s = q["m"], q["s"]
    pairs = [[i, s - i] for i in range(1, m + 1) if 1 <= s - i <= m]
    return {"answer": float(F(len(pairs), m * m)), "vals": {"sq": m * m, "pairs": pairs, "cnt": len(pairs), "ans": fr(F(len(pairs), m * m))}}


def d17(p):
    q, L = p["params"], p["level"]
    lam, k = q["lam"], q["k"]
    if L == 1:
        hz = lambda x: (k / lam) * (x / lam) ** (k - 1)  # noqa: E731
        d = hz(2.0) - hz(1.0)
        idx = 0 if d < -1e-12 else 1 if abs(d) < 1e-12 else 2
        return {"answer": idx, "vals": {"km1": k - 1}}
    if L == 2:
        t = q["t"]
        W = sp.stats.Weibull("W", lam, sp.nsimplify(str(k)))
        ans = 1 - float(sp.stats.cdf(W)(sp.nsimplify(str(t))))
        uu = t / lam
        return {"answer": ans, "vals": {"uu": uu, "uk": uu ** k, "ans": ans}}
    med = lam * log(2) ** (1 / k)
    assert abs(exp(-(med / lam) ** k) - 0.5) < 1e-12
    return {"answer": med, "vals": {"inv": fr(1 / F(str(k))), "base": log(2) ** (1 / k), "med": med}}


def d18(p):
    q, L = p["params"], p["level"]
    if L == 1:
        b = sp.nsimplify(str(q["b"]))
        v = sp.stats.variance(sp.stats.Laplace("L", 0, b))
        return {"answer": float(v), "vals": {"bb": q["b"] ** 2, "v": float(v)}}
    if L == 2:
        mu, b, xv = q["mu"], q["b"], q["xv"]
        dens = float(sp.stats.density(sp.stats.Laplace("L", mu, sp.nsimplify(str(b))))(xv))
        d = abs(xv - mu)
        return {"answer": dens, "vals": {"d": d, "u": d / b, "c": 1 / (2 * b), "e": exp(-d / b), "ans": dens}}
    b, t = q["b"], q["t"]
    Lp = sp.stats.Laplace("L", 0, sp.nsimplify(str(b)))
    one = 1 - float(sp.stats.cdf(Lp)(t))
    ans = 2 * one if q["two"] else one
    return {"answer": ans, "vals": {"u": t / b, "e": exp(-t / b), "ans": ans}}


def cauchy_cdf(x, x0, g):
    return 0.5 + math.atan((x - x0) / g) / math.pi


def d19(p):
    q, L = p["params"], p["level"]
    if L == 1:
        g, x0 = q["g"], q["x0"]
        dens = float(sp.stats.density(sp.stats.Cauchy("C", x0, sp.nsimplify(str(g))))(x0))
        return {"answer": dens, "vals": {"pg": math.pi * g, "ans": dens}}
    if L == 2:
        g, x0, xv = q["g"], q["x0"], q["xv"]
        ans = float(sp.stats.cdf(sp.stats.Cauchy("C", x0, g))(xv))
        u = (xv - x0) / g
        return {"answer": ans, "vals": {"u": u, "at": math.atan(u), "ans": ans}}
    q1, q3, c = q["q1"], q["q3"], q["c"]
    x0, g = F(q1 + q3, 2), F(q3 - q1, 2)
    assert x0.denominator == 1 and g.denominator == 1
    assert abs(cauchy_cdf(q1, float(x0), float(g)) - 0.25) < 1e-12 and abs(cauchy_cdf(q3, float(x0), float(g)) - 0.75) < 1e-12
    u = F(c, 1) - x0
    u = u / g
    ans = 1 - cauchy_cdf(c, float(x0), float(g))
    return {"answer": ans, "vals": {"x0": int(x0), "g": int(g), "u": fr(u), "at": math.atan(float(u)), "ans": ans}}


def d20(p):
    q, L = p["params"], p["level"]
    if L == 1:
        d1_, d2_ = q["d1"], q["d2"]
        import mpmath
        dens = sp.lambdify(sp.Symbol("u"), sp.stats.density(sp.stats.FDistribution("F", d1_, d2_))(sp.Symbol("u")), "mpmath")
        num = float(mpmath.quad(lambda u: u * dens(u), [0, 1, mpmath.inf]))
        m = F(d2_, d2_ - 2)
        assert abs(num - float(m)) < 1e-7 * float(m)
        return {"answer": float(m), "vals": {"d22": d2_ - 2, "mu": fr(m)}}
    if L == 2:
        s1, s2 = q["s1"], q["s2"]
        Fv = F(s1 * s1, s2 * s2)
        return {"answer": float(Fv), "vals": {"v1": s1 * s1, "v2": s2 * s2, "F": fr(Fv), "df1": q["n1"] - 1, "df2": q["n2"] - 1}}
    k, per, SSB, SSW = q["k"], q["per"], q["SSB"], q["SSW"]
    N = k * per
    msb, msw = F(SSB, k - 1), F(SSW, N - k)
    assert msb.denominator == 1 and msw.denominator == 1
    return {"answer": float(msb / msw), "vals": {"N": N, "dfb": k - 1, "dfw": N - k, "msb": int(msb), "msw": int(msw), "F": fr(msb / msw)}}


def beta_dens(a, b):
    c = math.gamma(a + b) / (math.gamma(a) * math.gamma(b))
    return lambda x: c * x ** (a - 1) * (1 - x) ** (b - 1) if 0 < x < 1 else None


def d21(p):
    q, L = p["params"], p["level"]
    a, b = q["a"], q["b"]
    if L == 1:
        f = beta_dens(a, b)
        e0, e1, mid = f(1e-6), f(1 - 1e-6), f(0.5)
        if a == 1 and b == 1:
            idx = 1
        elif e0 > mid and e1 > mid:
            idx = 0
        elif a == b:
            idx = 2
        else:
            idx = 3 if F(a) / (F(a) + F(b)) < F(1, 2) else 4
        mean = F(str(a)) / (F(str(a)) + F(str(b))) if idx >= 3 else F(1, 2)
        return {"answer": idx, "vals": {"mean": fr(mean)}}
    if L == 2:
        x = sp.Symbol("x")
        mo = sp.solve(sp.diff((a - 1) * sp.log(x) + (b - 1) * sp.log(1 - x), x), x)[0]
        return {"answer": float(mo), "vals": {"a1": a - 1, "s2": a + b - 2, "mo": fr(F(int(mo.p), int(mo.q)))}}
    mode = lambda o: F(o[0] - 1, o[0] + o[1] - 2)  # noqa: E731
    fn = lambda o: beta_dens(o[0], o[1])  # noqa: E731
    idx = check_choice(p, [a, b], fn, grid(0.02, 0.98, 96), 0.3)
    opts = q["opts"]
    ms = [mode(o) for o in opts]
    assert all(abs(float(m1 - m2)) >= 0.12 for i, m1 in enumerate(ms) for m2 in ms[i + 1:])
    g = curve(p)
    xs = grid(0.001, 0.999, 4000)
    peak = max(xs, key=g)
    assert abs(peak - float(mode([a, b]))) < 1e-3
    return {"answer": idx, "vals": {"m0": float(mode([a, b])), "modes": [fr(m) for m in ms]}}


VERIFY = {
    "F.1": f1, "F.2": f2, "F.3": f3, "F.4": f4, "F.5": f5, "F.6": f6, "F.7": f7, "F.8": f8, "F.9": f9, "F.10": f10,
    "F.11": f11, "F.12": f12, "F.13": f13, "F.14": f14, "F.15": f15, "F.16": f16, "F.17": f17, "F.18": f18, "F.19": f19,
    "F.20": f20, "F.21": f21, "F.22": f22, "F.23": f23, "F.24": f24, "F.25": f25, "F.26": f26, "F.27": f27, "F.28": f28,
    "F.29": f29, "F.30": f30, "F.31": f31, "F.32": f32, "F.33": f33, "F.34": f34, "F.35": f35, "F.36": f36,
    "D.1": d1, "D.2": d2, "D.3": d3, "D.4": d4, "D.5": d5, "D.6": d6, "D.7": d7, "D.8": d8, "D.9": d9, "D.10": d10,
    "D.11": d11, "D.12": d12, "D.13": d13, "D.14": d14, "D.15": d15, "D.16": d16, "D.17": d17, "D.18": d18, "D.19": d19,
    "D.20": d20, "D.21": d21,
}

