"""Independent answers for practice/machine-learning.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]), straight from the ML formulas.
Exact fractions where the arithmetic is exact, math.log / math.exp where the prompt asks for rounding, and
SymPy to confirm closed forms (minimizers, linear systems, eigenvalues). Nothing here is copied from the
JavaScript; the asserts check each problem's promises."""
from fractions import Fraction as F
from math import exp, isqrt, log, log2, sqrt

import sympy as sp


def fr(q):  # a Fraction as the {n, d} the generator reports
    q = F(q)
    return {"n": q.numerator, "d": q.denominator}


def frs(qs):
    return [fr(q) for q in qs]


def Q(v):  # a param back to an exact Fraction
    if isinstance(v, dict):
        return F(v["n"], v["d"])
    return F(v)


def Qs(vs):
    return [Q(v) for v in vs]


def h2(p):
    return 0.0 if p in (0, 1) else -p * log2(p) - (1 - p) * log2(1 - p)


def not_near(x, dp):
    s = abs(x) * 10 ** dp
    assert abs((s - int(s)) - 0.5) >= 0.1, "answer too close to a rounding boundary"


# ---- ML.1 ----------------------------------------------------------------------------------------------
def ml_1(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        m = sum(a != b for a, b in zip(q["y"], q["yh"]))
        assert len(q["y"]) == q["N"] and 0 < m
        risk = F(m, q["N"])
        return {"answer": float(risk), "vals": {"m": m, "risk": fr(risk)}}
    if lv == 2:
        w, lam = q["w"], Q(q["lam"])
        res = [y - w * x for x, y in zip(q["xs"], q["ys"])]
        sq = [t * t for t in res]
        mse = F(sum(sq), len(res))
        # SymPy: the objective evaluated at w
        W = sp.Symbol("w")
        J_sym = sp.Rational(1, len(res)) * sum((y - W * x) ** 2 for x, y in zip(q["xs"], q["ys"])) + sp.Rational(lam.numerator, lam.denominator) * W ** 2
        J = mse + lam * w * w
        assert sp.Rational(J.numerator, J.denominator) == J_sym.subs(W, w)
        return {"answer": float(J), "vals": {"res": res, "sq": sq, "SSE": sum(sq), "mse": fr(mse), "w2": w * w, "pen": fr(lam * w * w), "J": fr(J)}}
    a, b = q["a"], q["b"]
    rtr = [y - (a + b * x) for x, y in zip(q["xtr"], q["ytr"])]
    rte = [y - (a + b * x) for x, y in zip(q["xte"], q["yte"])]
    mtr, mte = F(sum(t * t for t in rtr), 4), F(sum(t * t for t in rte), 4)
    assert mte > mtr
    assert not set(q["xtr"]) & set(q["xte"])
    return {"answer": float(mte - mtr), "vals": {"rtr": rtr, "rte": rte, "str": sum(t * t for t in rtr), "ste": sum(t * t for t in rte),
                                                "mtr": fr(mtr), "mte": fr(mte), "gap": fr(mte - mtr)}}


# ---- ML.2 ----------------------------------------------------------------------------------------------
def ml_2(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        e = [y - yh for y, yh in zip(q["y"], q["yh"])]
        terms = [t * t for t in e] if q["useMSE"] else [abs(t) for t in e]
        return {"answer": float(F(sum(terms), 4)), "vals": {"e": e, "terms": terms, "S": sum(terms), "L": fr(F(sum(terms), 4))}}
    if lv == 2:
        if q["kind"] == 0:
            d = q["delta"]
            Ls = [F(r * r, 2) if abs(r) <= d else d * (abs(r) - F(d, 2)) for r in q["res"]]
            assert any(abs(r) <= d for r in q["res"]) and any(abs(r) > d for r in q["res"])
            # Huber is continuous at |r| = delta
            assert F(d * d, 2) == d * (d - F(d, 2))
            S = sum(Ls)
            return {"answer": float(S / 4), "vals": {"Ls": frs(Ls), "S": fr(S), "L": fr(S / 4), "hd": fr(F(d, 2))}}
        if q["kind"] == 1:
            fs = Qs(q["fs"])
            marg = [y * f for y, f in zip(q["ys"], fs)]
            Ls = [max(F(0), 1 - m) for m in marg]
            S = sum(Ls)
            return {"answer": float(S / 4), "vals": {"marg": frs(marg), "Ls": frs(Ls), "S": fr(S), "L": fr(S / 4)}}
        tau = Q(q["tau"])
        e = [y - yh for y, yh in zip(q["y"], q["yh"])]
        Ls = [max(tau * r, (tau - 1) * r) for r in e]
        S = sum(Ls)
        return {"answer": float(S / 4), "vals": {"e": e, "tm1": fr(tau - 1), "Ls": frs(Ls), "S": fr(S), "L": fr(S / 4)}}
    ps, ys = Qs(q["ps"]), q["ys"]
    pt = [pp if y == 1 else 1 - pp for pp, y in zip(ps, ys)]
    terms = [-(y * log(pp) + (1 - y) * log(1 - pp)) for pp, y in zip(map(float, ps), ys)]
    L = sum(terms) / len(terms)
    not_near(L, 3)
    return {"answer": L, "vals": {"terms": terms, "S": sum(terms), "L": L, "pTrue": frs(pt)}}


# ---- ML.3 ----------------------------------------------------------------------------------------------
def ml_3(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        ps = Qs(q["ps"])
        assert sum(ps) == 1
        ks = []
        for pp in ps:
            k = int(round(-log2(pp)))
            assert F(1, 2 ** k) == pp
            ks.append(k)
        H = sp.nsimplify(sum(-sp.Rational(pp.numerator, pp.denominator) * sp.log(sp.Rational(pp.numerator, pp.denominator), 2) for pp in ps))
        Hf = sum(pp * k for pp, k in zip(ps, ks))
        assert sp.simplify(H - sp.Rational(Hf.numerator, Hf.denominator)) == 0
        return {"answer": float(Hf), "vals": {"ks": ks, "terms": frs([pp * k for pp, k in zip(ps, ks)]), "H": fr(Hf), "p3": fr(F(1, 8)), "K": len(ps)}}
    if lv == 2:
        ps, qs = Qs(q["ps"]), Qs(q["qs"])
        assert sum(ps) == 1 and sum(qs) == 1 and ps != qs
        kp = [int(round(-log2(x))) for x in ps]
        kq = [int(round(-log2(x))) for x in qs]
        Hpq = sum(a * k for a, k in zip(ps, kq))
        Hp = sum(a * k for a, k in zip(ps, kp))
        KL = sum(float(a) * log2(float(a) / float(b)) for a, b in zip(ps, qs))
        assert abs(KL - float(Hpq - Hp)) < 1e-12 and KL > 0
        return {"answer": float(Hpq - Hp), "vals": {"kp": kp, "kq": kq, "Hpq": fr(Hpq), "Hp": fr(Hp), "KL": fr(Hpq - Hp)}}
    a, b, c, d = q["a"], q["b"], q["c"], q["d"]
    N = a + b + c + d
    # mutual information straight from the joint distribution
    joint = {(0, 1): a / N, (0, 0): b / N, (1, 1): c / N, (1, 0): d / N}
    px = {0: (a + b) / N, 1: (c + d) / N}
    py = {1: (a + c) / N, 0: (b + d) / N}
    I_direct = sum(pxy * log2(pxy / (px[x] * py[y])) for (x, y), pxy in joint.items())
    HY, H1, H2 = h2((a + c) / N), h2(a / (a + b)), h2(c / (c + d))
    HYX = (a + b) / N * H1 + (c + d) / N * H2
    I = HY - HYX
    assert abs(I - I_direct) < 1e-12
    not_near(I, 3)
    return {"answer": I, "vals": {"N": N, "n1": a + b, "n2": c + d, "cl": a + c, "HY": HY, "H1": H1, "H2": H2, "HYX": HYX, "I": I}}


# ---- ML.4 ----------------------------------------------------------------------------------------------
def bv(preds, T):
    m = F(sum(preds), len(preds))
    assert m.denominator == 1
    var = sum((F(x) - m) ** 2 for x in preds) / len(preds)
    return m, m - T, var


def ml_4(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        b, v, s2 = Q(q["bias"]), Q(q["vr"]), Q(q["s2"])
        return {"answer": float(b * b + v + s2), "vals": {"b2": fr(b * b), "E": fr(b * b + v + s2)}}
    s2 = Q(q["s2"])
    if lv == 2:
        m, b, var = bv(q["p"], q["T"])
        E = b * b + var + s2
        return {"answer": float(E), "vals": {"mean": int(m), "bias": int(b), "b2": int(b * b), "dev": [int(x - m) for x in q["p"]], "vr": fr(var), "E": fr(E)}}
    mA, bA, vA = bv(q["pa"], q["T"])
    mB, bB, vB = bv(q["pb"], q["T"])
    EA, EB = bA ** 2 + vA + s2, bB ** 2 + vB + s2
    assert abs(EA - EB) >= 1
    idx = 0 if EA < EB else 1
    return {"answer": idx, "vals": {"mA": int(mA), "mB": int(mB), "bA": int(bA), "bB": int(bB), "b2A": int(bA ** 2), "b2B": int(bB ** 2),
                                    "dA": [int(x - mA) for x in q["pa"]], "dB": [int(x - mB) for x in q["pb"]], "vA": fr(vA), "vB": fr(vB),
                                    "EA": fr(EA), "EB": fr(EB), "idx": idx}}


# ---- ML.6 ----------------------------------------------------------------------------------------------
def ml_6(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        N, k = q["N"], q["k"]
        assert N % k == 0
        return {"answer": N * (k - 1) // k, "vals": {"val": N // k, "train": N * (k - 1) // k}}
    if lv == 2:
        errs = Qs(q["errs"])
        return {"answer": float(sum(errs) / q["k"]), "vals": {"S": fr(sum(errs)), "cv": fr(sum(errs) / q["k"])}}
    errs = [Qs(e) for e in q["errs"]]
    means = [sum(e) / len(e) for e in errs]
    best = min(range(3), key=lambda j: means[j])
    assert sorted(means).count(means[best]) == 1
    dev = [e - means[best] for e in errs[best]]
    ss = sum(d * d for d in dev)
    s = sqrt(float(ss) / (len(dev) - 1))
    import statistics
    assert abs(s - statistics.stdev([float(e) for e in errs[best]])) < 1e-12
    SE = s / sqrt(len(dev))
    thr = float(means[best]) + SE
    assert all(abs(float(m) - thr) >= 0.0015 for m in means)
    pick = next(j for j in range(3) if float(means[j]) <= thr)
    return {"answer": pick, "vals": {"mF": frs(means), "devs": frs(dev), "ssd": fr(ss), "s": s, "SE": SE, "thr": thr, "pick": pick, "best": best}}


# ---- ML.features --------------------------------------------------------------------------------------------
def ml_features(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        z = F(q["x"] - q["mu"], q["sd"])
        return {"answer": float(z), "vals": {"diff": q["x"] - q["mu"], "z": fr(z), "az": fr(abs(z))}}
    if lv == 2:
        if q["robust"]:
            iqr = q["q3"] - q["q1"]
            s = F(q["x"] - q["med"], iqr)
            return {"answer": float(s), "vals": {"iqr": iqr, "top": q["x"] - q["med"], "s": fr(s)}}
        lo, hi = min(q["vs"]), max(q["vs"])
        assert lo < q["x"] < hi
        s = F(q["x"] - lo, hi - lo)
        return {"answer": float(s), "vals": {"lo": lo, "hi": hi, "rng": hi - lo, "top": q["x"] - lo, "s": fr(s)}}
    m, yb, nc, kc = q["m"], Q(q["yb"]), q["nc"], q["kc"]
    ybc = F(kc, nc)
    enc = (nc * ybc + m * yb) / (nc + m)
    # the encoding lies between the raw rate and the overall rate
    assert min(ybc, yb) <= enc <= max(ybc, yb)
    return {"answer": float(enc), "vals": {"my": fr(m * yb), "num": fr(kc + m * yb), "den": nc + m, "enc": fr(enc), "raw": fr(ybc)}}


# ---- ML.linreg ---------------------------------------------------------------------------------------------
def ml_linreg(p):
    q, lv = p["params"], p["level"]
    b0s, b1s = sp.symbols("b0 b1")
    if lv == 1:
        xs, ys = q["xs"], q["ys"]
        k = len(xs)
        xb, yb = F(sum(xs), k), F(sum(ys), k)
        assert xb.denominator == 1 and yb.denominator == 1
        dx, dy = [x - xb for x in xs], [y - yb for y in ys]
        Sxy, Sxx = sum(a * b for a, b in zip(dx, dy)), sum(a * a for a in dx)
        J = sum((y - b0s - b1s * x) ** 2 for x, y in zip(xs, ys))
        sol = sp.solve([sp.diff(J, b0s), sp.diff(J, b1s)], [b0s, b1s])
        b1, b0 = F(str(sol[b1s])), F(str(sol[b0s]))
        assert b1 == Sxy / Sxx and b0 == yb - b1 * xb
        return {"answer": [float(b0), float(b1)], "vals": {"k": k, "xb": int(xb), "yb": int(yb), "dx": [int(t) for t in dx], "dy": [int(t) for t in dy],
                                                         "Sxy": int(Sxy), "Sxx": int(Sxx), "b1": fr(b1), "b0": fr(b0)}}
    if lv == 2:
        xs, ys, c0, c1, eta = q["xs"], q["ys"], q["c0"], q["c1"], Q(q["eta"])
        n = len(xs)
        J = sp.Rational(1, n) * sum((y - b0s - b1s * x) ** 2 for x, y in zip(xs, ys))
        g0 = F(str(sp.diff(J, b0s).subs({b0s: c0, b1s: c1})))
        g1 = F(str(sp.diff(J, b1s).subs({b0s: c0, b1s: c1})))
        pred = [c0 + c1 * x for x in xs]
        res = [y - t for y, t in zip(ys, pred)]
        xr = [x * t for x, t in zip(xs, res)]
        assert g0 == F(-2 * sum(res), n) and g1 == F(-2 * sum(xr), n)
        n0, n1 = c0 - eta * g0, c1 - eta * g1
        return {"answer": [float(n0), float(n1)], "vals": {"pred": pred, "res": res, "S0": sum(res), "xr": xr, "S1": sum(xr), "g0": fr(g0), "g1": fr(g1), "n0": fr(n0), "n1": fr(n1)}}
    xs, ys, xn = q["xs"], q["ys"], q["xn"]
    Xm = sp.Matrix([[1, x] for x in xs])
    yv = sp.Matrix(ys)
    beta = (Xm.T * Xm).solve(Xm.T * yv)
    b0, b1 = F(str(beta[0])), F(str(beta[1]))
    Sx, Sxx, Sy, Sxy = sum(xs), sum(x * x for x in xs), sum(ys), sum(x * y for x, y in zip(xs, ys))
    assert xn not in xs
    pred = b0 + b1 * xn
    return {"answer": float(pred), "vals": {"Sx": Sx, "Sxx": Sxx, "Sy": Sy, "Sxy": Sxy, "det": 4 * Sxx - Sx * Sx, "b1": fr(b1), "b0": fr(b0), "pred": fr(pred)}}


# ---- ML.5 ----------------------------------------------------------------------------------------------
def ml_5(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        beta, lam = Qs(q["beta"]), Q(q["lam"])
        l1, l2 = sum(abs(b) for b in beta), sum(b * b for b in beta)
        a = F(1, 2)
        pen = {"ridge": lam * l2, "lasso": lam * l1, "enet": lam * (a * l1 + (1 - a) * l2)}[q["kind"]]
        return {"answer": float(pen), "vals": {"l1": fr(l1), "l2": fr(l2), "sq": frs([b * b for b in beta]), "pen": fr(pen), "al": fr(a)}}
    xs, ys, lam = q["xs"], q["ys"], q["lam"]
    b = sp.Symbol("b", real=True)
    s, Qx = sum(x * y for x, y in zip(xs, ys)), sum(x * x for x in xs)
    if lv == 2:
        J = sum((y - b * x) ** 2 for x, y in zip(xs, ys)) + lam * b ** 2
        sol = sp.solve(sp.diff(J, b), b)
        assert len(sol) == 1
        ridge = F(str(sol[0]))
        return {"answer": float(ridge), "vals": {"s": s, "Qx": Qx, "ridge": fr(ridge), "ols": fr(F(s, Qx)), "den": Qx + lam}}
    # lasso: minimize the convex objective by checking both smooth branches and 0
    J = lambda t: sum((y - t * x) ** 2 for x, y in zip(xs, ys)) + lam * abs(t)
    cands = [F(0), F(2 * s - lam, 2 * Qx), F(2 * s + lam, 2 * Qx)]
    best = min(cands, key=J)
    # optimality: J is no smaller a little to either side
    for d in (F(1, 1000), F(-1, 1000)):
        assert J(best + d) > J(best)
    return {"answer": float(best), "vals": {"s": s, "Qx": Qx, "as": abs(s), "half": F(lam, 2), "beta": fr(best), "ols": fr(F(s, Qx))}}


# ---- ML.7 ----------------------------------------------------------------------------------------------
def ml_7(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        b0, b1 = q["b0"], Q(q["b1"])
        if q["sig"]:
            z = b0 + b1 * q["x"]
            assert z.denominator == 1
            pr = 1 / (1 + exp(-float(z)))
            not_near(pr, 3)
            return {"answer": pr, "vals": {"z": int(z), "e": exp(-float(z)), "p": pr}}
        xs = F(-b0) / b1
        assert b0 + b1 * xs == 0
        return {"answer": float(xs), "vals": {"xs": fr(xs), "half": fr(F(1, 2)), "nb0": -b0}}
    if lv == 2:
        k, m, p0 = q["k"], q["m"], Q(q["p0"])
        o0 = p0 / (1 - p0)
        o1 = o0 * k ** m
        p1 = o1 / (1 + o1)
        # check on the log-odds scale with floats
        z = log(float(p0) / (1 - float(p0))) + m * log(k)
        assert abs(1 / (1 + exp(-z)) - float(p1)) < 1e-12
        return {"answer": float(p1), "vals": {"lnk": log(k), "q0": fr(1 - p0), "o0": fr(o0), "fac": k ** m, "o1": fr(o1), "o1p": fr(o1 + 1), "p1": fr(p1)}}
    xs, ys, eta = q["xs"], q["ys"], Q(q["eta"])
    b0, b1 = sp.symbols("b0 b1")
    L = sp.Rational(1, len(xs)) * sum(-(y * sp.log(1 / (1 + sp.exp(-(b0 + b1 * x)))) + (1 - y) * sp.log(1 - 1 / (1 + sp.exp(-(b0 + b1 * x))))) for x, y in zip(xs, ys))
    g0 = sp.nsimplify(sp.simplify(sp.diff(L, b0).subs({b0: 0, b1: 0})))
    g1 = sp.nsimplify(sp.simplify(sp.diff(L, b1).subs({b0: 0, b1: 0})))
    g0, g1 = F(str(g0)), F(str(g1))
    d = [F(1, 2) - y for y in ys]
    assert g0 == sum(d) / 4 and g1 == sum(x * t for x, t in zip(xs, d)) / 4
    return {"answer": [float(-eta * g0), float(-eta * g1)], "vals": {"d": frs(d), "xd": frs([x * t for x, t in zip(xs, d)]), "g0": fr(g0), "g1": fr(g1),
                                                                   "n0": fr(-eta * g0), "n1": fr(-eta * g1)}}


# ---- ML.10 ---------------------------------------------------------------------------------------------
def ml_10(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        ps, a, b = Q(q["ps"]), Q(q["a"]), Q(q["b"])
        ss, sh = ps * a, (1 - ps) * b
        assert ss != sh
        idx = 0 if ss > sh else 1
        return {"answer": idx, "vals": {"ph": fr(1 - ps), "ss": fr(ss), "sh": fr(sh), "idx": idx}}
    if lv == 2:
        pr = F(q["n"] + 1, q["ny"] + q["Vs"])
        return {"answer": float(pr), "vals": {"top": q["n"] + 1, "bot": q["ny"] + q["Vs"], "p": fr(pr)}}
    ps, a, b, c, d = (Q(q[k]) for k in ("ps", "a", "b", "c", "d"))
    ss, sh = ps * a * b, (1 - ps) * c * d
    # Bayes' theorem with the naive factorization
    post = ps * a * b / (ps * a * b + (1 - ps) * c * d)
    return {"answer": float(post), "vals": {"ph": fr(1 - ps), "ss": fr(ss), "sh": fr(sh), "tot": fr(ss + sh), "post": fr(post)}}


# ---- ML.9 ----------------------------------------------------------------------------------------------
def ml_9(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b = q["a"], q["b"]
        dl = [y - x for x, y in zip(a, b)]
        sq = sum(t * t for t in dl)
        e = isqrt(sq)
        assert e * e == sq
        man = sum(abs(t) for t in dl)
        ans = e if q["euclid"] else man
        return {"answer": ans, "vals": {"dl": dl, "sq": sq, "ans": ans, "man": man}}
    if lv == 2:
        u, v = q["u"], q["v"]
        nu, nv = sqrt(sum(t * t for t in u)), sqrt(sum(t * t for t in v))
        assert nu == int(nu) and nv == int(nv)
        dot = sum(a * b for a, b in zip(u, v))
        cos = F(dot, int(nu) * int(nv))
        return {"answer": float(cos), "vals": {"dot": dot, "nu": int(nu), "nv": int(nv), "nn": int(nu * nv), "cos": fr(cos)}}
    pts, cls, qq, k = q["pts"], q["cls"], q["q"], q["k"]
    d2 = [(x - qq[0]) ** 2 + (y - qq[1]) ** 2 for x, y in pts]
    order = sorted(range(len(pts)), key=lambda i: sqrt(d2[i]))
    assert d2[order[k - 1]] < d2[order[k]], "tie at the k-th neighbor"
    votes = sum(1 for i in order[:k] if cls[i] == 0)
    pick = 0 if votes > k - votes else 1
    return {"answer": pick, "vals": {"d2": d2, "votes": votes, "other": k - votes, "pick": pick}}


# ---- ML.11 ---------------------------------------------------------------------------------------------
def gini(*counts):
    n = sum(counts)
    return 1 - sum(F(c, n) ** 2 for c in counts)


def ml_11(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b = q["a"], q["b"]
        g = gini(a, b)
        # Gini is the chance two draws (with replacement) disagree
        assert g == 2 * F(a, a + b) * F(b, a + b)
        return {"answer": float(g), "vals": {"N": a + b, "aa": a * a, "bb": b * b, "NN": (a + b) ** 2, "g": fr(g)}}
    a1, b1, a2, b2 = q["a1"], q["b1"], q["a2"], q["b2"]
    a, b, n1, n2 = a1 + a2, b1 + b2, a1 + b1, a2 + b2
    N = a + b
    if lv == 2:
        gp, g1, g2 = gini(a, b), gini(a1, b1), gini(a2, b2)
        wc = F(n1, N) * g1 + F(n2, N) * g2
        assert gp - wc > 0
        return {"answer": float(gp - wc), "vals": {"a": a, "b": b, "N": N, "n1": n1, "n2": n2,
                                                   "sq": [a * a, b * b, N * N, a1 * a1, b1 * b1, n1 * n1, a2 * a2, b2 * b2, n2 * n2],
                                                   "gp": fr(gp), "g1": fr(g1), "g2": fr(g2), "wc": fr(wc), "gain": fr(gp - wc)}}
    Hp, H1, H2 = h2(a / N), h2(a1 / n1), h2(a2 / n2)
    wc = n1 / N * H1 + n2 / N * H2
    IG = Hp - wc
    not_near(IG, 3)
    return {"answer": IG, "vals": {"a": a, "b": b, "N": N, "n1": n1, "n2": n2, "Hp": Hp, "H1": H1, "H2": H2, "wc": wc, "IG": IG}}


# ---- ML.12 ---------------------------------------------------------------------------------------------
def ml_12(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if "preds" in q:
            pr = Qs(q["preds"])
            return {"answer": float(sum(pr) / q["B"]), "vals": {"S": fr(sum(pr)), "avg": fr(sum(pr) / q["B"])}}
        n = q["n"]
        oob = (1 - F(1, n)) ** n
        return {"answer": float(oob), "vals": {"base": fr(1 - F(1, n)), "oob": fr(oob), "einv": exp(-1)}}
    if lv == 2:
        rho, s2, B = Q(q["rho"]), q["s2"], q["B"]
        # Var of the mean of B equicorrelated variables: (1/B²)[B σ² + B(B−1) ρ σ²]
        v = F(1, B * B) * (B * s2 + B * (B - 1) * rho * s2)
        assert v == rho * s2 + (1 - rho) * s2 / B
        return {"answer": float(v), "vals": {"t1": fr(rho * s2), "t2": fr((1 - rho) * s2 / B), "vr": fr(v)}}
    N, m = q["N"], q["m"]
    eps = F(m, N)
    alpha = 0.5 * log((1 - eps) / eps)
    k = round(exp(alpha))
    assert abs(exp(alpha) - k) < 1e-12
    w = [F(1, N)] * N
    wrong = set(range(m))
    new = [wi * (k if i in wrong else F(1, k)) for i, wi in enumerate(w)]
    Z = sum(new)
    neww = new[0] / Z
    assert sum(new[i] / Z for i in wrong) == F(1, 2)
    return {"answer": float(neww), "vals": {"eps": fr(eps), "ratio": fr((1 - eps) / eps), "lnk": log(k), "k": k, "wm": fr(new[0]), "wc": fr(F(1, N * k)),
                                            "nc": N - m, "Z": fr(Z), "neww": fr(neww)}}


# ---- ML.boosting ------------------------------------------------------------------------------------------
def ml_boosting(p):
    q, lv = p["params"], p["level"]
    c = sp.Symbol("c")
    if lv == 1:
        ys = q["ys"]
        F0 = sp.solve(sp.diff(sum((y - c) ** 2 for y in ys), c), c)[0]
        assert F0 == int(F0)
        return {"answer": [y - int(F0) for y in ys], "vals": {"F0": int(F0), "res": [y - int(F0) for y in ys]}}
    if lv == 2:
        xs, ys, t, nu, j = q["xs"], q["ys"], q["t"], Q(q["nu"]), q["j"]
        F0 = F(sum(ys), len(ys))
        assert F0.denominator == 1
        res = [y - F0 for y in ys]
        L = [r_ for x, r_ in zip(xs, res) if x <= t]
        R = [r_ for x, r_ in zip(xs, res) if x > t]
        hl, hr = sum(L) / len(L), sum(R) / len(R)
        F1 = F0 + nu * (hl if xs[j] <= t else hr)
        return {"answer": float(F1), "vals": {"S": sum(ys), "F0": int(F0), "res": [int(t_) for t_ in res], "hl": fr(hl), "hr": fr(hr), "F1": fr(F1)}}
    lam, ys = q["lam"], q["ys"]
    w = sp.Symbol("w")
    if q["logl"]:
        # second-order Taylor of the log-loss at score 0, plus (λ/2) w², minimized over w
        L = sum(-(y * sp.log(1 / (1 + sp.exp(-w))) + (1 - y) * sp.log(1 - 1 / (1 + sp.exp(-w)))) for y in ys)
        g = sp.diff(L, w).subs(w, 0)
        h = sp.diff(L, w, 2).subs(w, 0)
        wstar = F(str(sp.nsimplify(-g / (h + lam))))
        gs = [F(1, 2) - y for y in ys]
        assert sp.nsimplify(g) == sp.Rational(sum(gs).numerator, sum(gs).denominator)
        return {"answer": float(wstar), "vals": {"g": frs(gs), "hh": fr(F(1, 4)), "G": fr(sum(gs)), "H": fr(F(len(ys), 4)), "w": fr(wstar), "cnt": len(ys)}}
    Fc = q["Fc"]
    obj = sum(sp.Rational(1, 2) * (y - (Fc + w)) ** 2 for y in ys) + sp.Rational(lam, 2) * w ** 2
    wstar = F(str(sp.solve(sp.diff(obj, w), w)[0]))
    g = [Fc - y for y in ys]
    return {"answer": float(wstar), "vals": {"g": g, "G": sum(g), "w": fr(wstar), "mr": fr(F(-sum(g), len(ys))), "cnt": len(ys)}}


# ---- ML.13 ---------------------------------------------------------------------------------------------
def ml_13(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        w = q["w"]
        nn = sum(t * t for t in w)
        c = isqrt(nn)
        assert c * c == nn
        return {"answer": float(F(2, c)), "vals": {"c": c, "cc": nn, "mg": fr(F(2, c))}}
    if lv == 2:
        w, b, C = Qs(q["w"]), Q(q["b"]), Q(q["C"])
        f = [w[0] * x + w[1] * y + b for x, y in q["pts"]]
        marg = [t * y for t, y in zip(f, q["ys"])]
        xi = [max(F(0), 1 - m) for m in marg]
        ww = w[0] ** 2 + w[1] ** 2
        obj = ww / 2 + C * sum(xi)
        return {"answer": float(obj), "vals": {"f": frs(f), "marg": frs(marg), "xi": frs(xi), "Sxi": fr(sum(xi)), "w0": fr(w[0] ** 2), "w1": fr(w[1] ** 2),
                                               "half": fr(ww / 2), "obj": fr(obj)}}
    sv, ys, al, b, xq = q["sv"], q["ys"], Qs(q["al"]), q["b"], q["xq"]
    xv = sp.Matrix(xq)
    K = [int(((sp.Matrix(s).T * xv)[0] + 1) ** 2) for s in sv]
    terms = [a * y * k for a, y, k in zip(al, ys, K)]
    f = sum(terms) + b
    assert f != 0
    return {"answer": float(f), "vals": {"dots": [s[0] * xq[0] + s[1] * xq[1] for s in sv], "K": K, "terms": frs(terms), "f": fr(f), "cls": 1 if f > 0 else -1}}


# ---- ML.kernels ------------------------------------------------------------------------------------------
def ml_kernels(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        x, z, c, pw = q["x"], q["z"], q["c"], q["p"]
        dot = x[0] * z[0] + x[1] * z[1]
        return {"answer": (dot + c) ** pw, "vals": {"dot": dot, "base": dot + c, "K": (dot + c) ** pw}}
    if lv == 2:
        x, z = q["x"], q["z"]
        phi = lambda v: sp.Matrix([v[0] ** 2, sp.sqrt(2) * v[0] * v[1], v[1] ** 2])
        tot = sp.simplify((phi(x).T * phi(z))[0])
        dot = x[0] * z[0] + x[1] * z[1]
        assert tot == dot ** 2
        px, pz = [x[0] ** 2, x[0] * x[1], x[1] ** 2], [z[0] ** 2, z[0] * z[1], z[1] ** 2]
        return {"answer": int(tot), "vals": {"px": px, "pz": pz, "t": [px[0] * pz[0], 2 * px[1] * pz[1], px[2] * pz[2]], "tot": int(tot), "dot": dot, "dd": dot * dot}}
    x1, x2, y1, y2, lam, xs = q["x1"], q["x2"], q["y1"], q["y2"], q["lam"], q["xs"]
    Kf = lambda a, b: a * b + 1
    K = sp.Matrix([[Kf(x1, x1), Kf(x1, x2)], [Kf(x2, x1), Kf(x2, x2)]])
    A = K + lam * sp.eye(2)
    alpha = A.inv() * sp.Matrix([y1, y2])
    a1, a2 = F(str(alpha[0])), F(str(alpha[1]))
    pred = a1 * Kf(x1, xs) + a2 * Kf(x2, xs)
    return {"answer": float(pred), "vals": {"k11": Kf(x1, x1), "k12": Kf(x1, x2), "k22": Kf(x2, x2), "A": Kf(x1, x1) + lam, "D": Kf(x2, x2) + lam,
                                            "det": int(A.det()), "a1": fr(a1), "a2": fr(a2), "ks1": Kf(x1, xs), "ks2": Kf(x2, xs), "pred": fr(pred)}}


# ---- ML.8 ----------------------------------------------------------------------------------------------
def ml_8(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        TP, FN, FP, TN = q["TP"], q["FN"], q["FP"], q["TN"]
        top, bot = {"precision": (TP, TP + FP), "recall": (TP, TP + FN), "accuracy": (TP + TN, TP + FN + FP + TN), "FPR": (FP, FP + TN)}[q["kind"]]
        return {"answer": float(F(top, bot)), "vals": {"top": top, "bot": bot, "q": fr(F(top, bot))}}
    if lv == 2:
        TP, FN, FP, TN = q["TP"], q["FN"], q["FP"], q["TN"]
        Pr, Re = F(TP, TP + FP), F(TP, TP + FN)
        F1 = 2 * Pr * Re / (Pr + Re)
        assert F1 == F(2 * TP, 2 * TP + FP + FN)
        return {"answer": float(F1), "vals": {"pp": TP + FP, "rr": TP + FN, "Pr": fr(Pr), "Re": fr(Re), "num": fr(2 * Pr * Re), "den": fr(Pr + Re), "F1": fr(F1), "tt": 2 * TP}}
    N, pct, rec, fpr = q["N"], q["pct"], Q(q["rec"]), Q(q["fpr"])
    # Bayes: P(disease | +) = π·TPR / (π·TPR + (1−π)·FPR)
    pi = F(pct, 100)
    prec = pi * rec / (pi * rec + (1 - pi) * fpr)
    pos, neg = N * pi, N * (1 - pi)
    TP, FP = rec * pos, fpr * neg
    assert pos.denominator == 1 and TP.denominator == 1 and FP.denominator == 1
    assert TP / (TP + FP) == prec
    return {"answer": float(prec), "vals": {"pos": int(pos), "neg": int(neg), "TP": int(TP), "FP": int(FP), "tot": int(TP + FP), "prec": fr(prec),
                                            "rp": fr(rec * 100), "fp": fr(fpr * 100)}}


# ---- ML.21 ---------------------------------------------------------------------------------------------
def ml_21(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        pos, neg, tau = Qs(q["pos"]), Qs(q["neg"]), Q(q["tau"])
        TP, FP = sum(s >= tau for s in pos), sum(s >= tau for s in neg)
        return {"answer": [float(F(FP, len(neg))), float(F(TP, len(pos)))], "vals": {"TP": TP, "FP": FP, "tpr": fr(F(TP, 4)), "fpr": fr(F(FP, 4))}}
    if lv == 2:
        pos, neg = Qs(q["pos"]), Qs(q["neg"])
        assert len(set(pos + neg)) == len(pos + neg)
        wins = [sum(a > b for b in neg) for a in pos]
        # AUC as the area under the empirical ROC curve, by sweeping thresholds
        ths = sorted(set(pos + neg), reverse=True)
        pts = [(F(0), F(0))] + [(F(sum(b >= t for b in neg), len(neg)), F(sum(a >= t for a in pos), len(pos))) for t in ths]
        area = sum((x2 - x1) * (y1 + y2) / 2 for (x1, y1), (x2, y2) in zip(pts, pts[1:]))
        auc = F(sum(wins), len(pos) * len(neg))
        assert area == auc
        return {"answer": float(auc), "vals": {"pairs": len(pos) * len(neg), "wins": wins, "W": sum(wins), "auc": fr(auc)}}
    pts = [Qs(pt) for pt in q["pts"]]
    x, y = sp.Symbol("x"), None
    # integrate the piecewise-linear curve with SymPy
    area = 0
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        assert x2 > x1 and y2 >= y1
        line = sp.Rational(y1.numerator, y1.denominator) + (sp.Rational((y2 - y1).numerator, (y2 - y1).denominator) / sp.Rational((x2 - x1).numerator, (x2 - x1).denominator)) * (x - sp.Rational(x1.numerator, x1.denominator))
        area += sp.integrate(line, (x, sp.Rational(x1.numerator, x1.denominator), sp.Rational(x2.numerator, x2.denominator)))
    auc = F(str(area))
    traps = [(x2 - x1) * (y1 + y2) / 2 for (x1, y1), (x2, y2) in zip(pts, pts[1:])]
    assert sum(traps) == auc and pts[0] == [0, 0] and pts[-1] == [1, 1]
    return {"answer": float(auc), "vals": {"widths": frs([b[0] - a[0] for a, b in zip(pts, pts[1:])]), "traps": frs(traps), "auc": fr(auc), "half": fr(F(1, 2))}}


# ---- ML.22 ---------------------------------------------------------------------------------------------
def ml_22(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        e = [a - b for a, b in zip(q["y"], q["yh"])]
        S = sum(t * t for t in e)
        mse = F(S, len(e))
        rt = isqrt(int(mse))
        assert mse.denominator == 1 and rt * rt == mse
        return {"answer": rt, "vals": {"e": e, "sq": [t * t for t in e], "S": S, "mse": int(mse), "rt": rt}}
    if lv == 2:
        y, yh = q["y"], q["yh"]
        yb = F(sum(y), len(y))
        SSE = sum((a - b) ** 2 for a, b in zip(y, yh))
        SST = sum((a - yb) ** 2 for a in y)
        R2 = 1 - SSE / SST
        return {"answer": float(R2), "vals": {"SSE": SSE, "yb": int(yb), "dev": [int(a - yb) for a in y], "SST": int(SST), "ratio": fr(SSE / SST), "R2": fr(R2), "k": len(y)}}
    if q["mode"] == 1:
        y, yh = q["y"], q["yh"]
        pct = [F(abs(a - b) * 100, a) for a, b in zip(y, yh)]
        mape = sum(pct) / len(pct)
        return {"answer": float(mape), "vals": {"ae": [abs(a - b) for a, b in zip(y, yh)], "pct": frs(pct), "mape": fr(mape)}}
    n, p1, p2, R1, R2 = q["n"], q["p1"], q["p2"], Q(q["R1"]), Q(q["R2"])
    adj = lambda R, k: 1 - (1 - R) * F(n - 1, n - k - 1)
    a1, a2 = adj(R1, p1), adj(R2, p2)
    assert abs(float(a1 - a2)) >= 0.002 and R2 > R1
    idx = 0 if a1 > a2 else 1
    return {"answer": idx, "vals": {"u1": fr(1 - R1), "u2": fr(1 - R2), "d1": n - p1 - 1, "d2": n - p2 - 1, "nm1": n - 1, "a1": fr(a1), "a2": fr(a2), "add": p2 - p1, "idx": idx}}


# ---- ML.23 ---------------------------------------------------------------------------------------------
def ml_23(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        ps, ys = Qs(q["ps"]), q["ys"]
        d = [a - y for a, y in zip(ps, ys)]
        B = sum(t * t for t in d) / len(d)
        assert sum((F(1, 2) - y) ** 2 for y in ys) / len(ys) == F(1, 4)
        return {"answer": float(B), "vals": {"d": frs(d), "sq": frs([t * t for t in d]), "B": fr(B), "half": fr(F(1, 2)), "q": fr(F(1, 4))}}
    if lv == 2:
        TP, FN, FP, TN = q["TP"], q["FN"], q["FP"], q["TN"]
        prod = (TP + FP) * (TP + FN) * (TN + FP) * (TN + FN)
        rt = isqrt(prod)
        assert rt * rt == prod
        mcc = F(TP * TN - FP * FN, rt)
        # MCC is the Pearson correlation of the 0/1 actual and predicted labels
        act = [1] * (TP + FN) + [0] * (FP + TN)
        pred = [1] * TP + [0] * FN + [1] * FP + [0] * TN
        n = len(act)
        ma, mp = F(sum(act), n), F(sum(pred), n)
        cov = sum((a - ma) * (b - mp) for a, b in zip(act, pred))
        va, vp = sum((a - ma) ** 2 for a in act), sum((b - mp) ** 2 for b in pred)
        assert abs(float(cov) / sqrt(float(va * vp)) - float(mcc)) < 1e-12
        return {"answer": float(mcc), "vals": {"tt": TP * TN, "ff": FP * FN, "num": TP * TN - FP * FN, "sums": [TP + FP, TP + FN, TN + FP, TN + FN], "prod": prod, "rt": rt, "mcc": fr(mcc)}}
    ps, ys, n = Qs(q["ps"]), q["ys"], q["n"]
    sq = [(a - y) ** 2 for a, y in zip(ps, ys)]
    B = sum(sq) / n
    pi = F(sum(ys), n)
    Bref = sum((pi - y) ** 2 for y in ys) / n
    assert Bref == pi * (1 - pi)
    return {"answer": float(1 - B / Bref), "vals": {"sq": frs(sq), "S": fr(sum(sq)), "B": fr(B), "k": sum(ys), "pi": fr(pi), "q": fr(1 - pi), "Bref": fr(Bref),
                                                    "ratio": fr(B / Bref), "BSS": fr(1 - B / Bref)}}


# ---- ML.calibration ----------------------------------------------------------------------------------------
def ml_calibration(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        yb = F(q["k"], q["nb"])
        gap = abs(yb - Q(q["pb"]))
        assert gap > 0 and 0 <= q["k"] <= q["nb"]
        return {"answer": float(gap), "vals": {"yb": fr(yb), "gap": fr(gap)}}
    if lv == 2:
        ns, pb, ks = q["ns"], Qs(q["pb"]), q["ks"]
        N = sum(ns)
        yb = [F(k, n) for k, n in zip(ks, ns)]
        gaps = [abs(a - b) for a, b in zip(yb, pb)]
        ece = sum(F(n, N) * g for n, g in zip(ns, gaps))
        return {"answer": float(ece), "vals": {"yb": frs(yb), "gaps": frs(gaps), "N": N, "ece": fr(ece)}}
    if q["mode"] == 0:
        z, T = Qs(q["z"]), Q(q["T"])
        zs = [float(t) / float(T) for t in z]
        pT = exp(zs[0]) / (exp(zs[0]) + exp(zs[1]))
        p1 = exp(float(z[0])) / (exp(float(z[0])) + exp(float(z[1])))
        not_near(pT, 3)
        d = z[0] - z[1]
        return {"answer": pT, "vals": {"d": fr(d), "dT": fr(d / T), "e": exp(-float(d / T)), "pT": pT, "p1": p1}}
    a, b, sc = Q(q["a"]), Q(q["b"]), Q(q["sc"])
    u = a * sc + b
    pp = 1 / (1 + exp(-float(u)))
    not_near(pp, 3)
    return {"answer": pp, "vals": {"u": fr(u), "e": exp(-float(u)), "pp": pp}}


# ---- ML.14 ---------------------------------------------------------------------------------------------
def ml_14(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        prods = [a * b for a, b in zip(q["x"], q["w"])]
        z = sum(prods) + q["b"]
        return {"answer": max(0, z), "vals": {"prods": prods, "z": z, "a": max(0, z)}}
    if lv == 2:
        w, x, y, eta = Q(q["w"]), q["x"], q["y"], Q(q["eta"])
        W = sp.Symbol("w")
        g = F(str(sp.diff(sp.Rational(1, 2) * (W * x - y) ** 2, W).subs(W, sp.Rational(w.numerator, w.denominator))))
        return {"answer": float(w - eta * g), "vals": {"yh": fr(w * x), "err": fr(w * x - y), "g": fr(g), "nw": fr(w - eta * g)}}
    x, w1, b1, w2, b2, y = (q[k] for k in ("x", "w1", "b1", "w2", "b2", "y"))
    W1 = sp.Symbol("W1")
    z1 = w1 * x + b1
    assert z1 != 0
    # differentiate the network symbolically (ReLU as the branch it is on)
    h = (W1 * x + b1) if z1 > 0 else sp.Integer(0)
    L = sp.Rational(1, 2) * (w2 * h + b2 - y) ** 2
    gw1 = int(sp.diff(L, W1).subs(W1, w1))
    hv = max(0, z1)
    yh = w2 * hv + b2
    d = yh - y
    rel = 1 if z1 > 0 else 0
    return {"answer": gw1, "vals": {"z1": z1, "h": hv, "yh": yh, "d": d, "gw2": d * hv, "dh": w2 * d, "rel": rel, "dz": w2 * d * rel, "gw1": gw1}}


# ---- ML.activations ----------------------------------------------------------------------------------------
def ml_activations(p):
    q, lv = p["params"], p["level"]
    Z = sp.Symbol("z")
    if lv == 1:
        if q["kind"] == "leaky":
            z, al = Q(q["z"]), Q(q["al"])
            out = max(al * z, z)
            slope = F(1) if z > 0 else al
            return {"answer": [float(out), float(slope)], "vals": {"out": fr(out), "slope": fr(slope)}}
        sv = Q(q["sv"])
        if q["kind"] == "sigmoid":
            # σ'(z) at the z where σ(z) = sv, via SymPy
            z0 = sp.log(sp.Rational(sv.numerator, sv.denominator) / (1 - sp.Rational(sv.numerator, sv.denominator)))
            dv = sp.nsimplify(sp.simplify(sp.diff(1 / (1 + sp.exp(-Z)), Z).subs(Z, z0)))
            assert F(str(dv)) == sv * (1 - sv)
            return {"answer": float(sv * (1 - sv)), "vals": {"sv2": fr(1 - sv), "dv": fr(sv * (1 - sv))}}
        z0 = sp.atanh(sp.Rational(sv.numerator, sv.denominator))
        dv = sp.nsimplify(sp.simplify(sp.diff(sp.tanh(Z), Z).subs(Z, z0)))
        assert F(str(dv)) == 1 - sv * sv
        return {"answer": float(1 - sv * sv), "vals": {"sv2": fr(sv * sv), "dv": fr(1 - sv * sv)}}
    if lv == 2:
        s, k, j = Qs(q["s"]), q["k"], q["j"]
        assert sum(s) == 1
        # Jacobian of softmax from SymPy at logits z = ln s
        zs = sp.symbols("z0:3")
        sm = [sp.exp(zz) / sum(sp.exp(t) for t in zs) for zz in zs]
        sub = {zs[i]: sp.log(sp.Rational(s[i].numerator, s[i].denominator)) for i in range(3)}
        val = F(str(sp.nsimplify(sp.simplify(sp.diff(sm[k], zs[j]).subs(sub)))))
        assert val == (s[k] * (1 - s[k]) if k == j else -s[k] * s[j])
        return {"answer": float(val), "vals": {"s": frs(s), "one": fr(1 - s[k]), "val": fr(val)}}
    ss, L = Qs(q["ss"]), q["L"]
    ds = [t * (1 - t) for t in ss]
    prod = F(1)
    for d in ds:
        prod *= d
        assert d <= F(1, 4)
    return {"answer": float(prod), "vals": {"one": frs([1 - t for t in ss]), "ds": frs(ds), "prod": fr(prod), "bound": fr(F(1, 4 ** L))}}


# ---- ML.15 ---------------------------------------------------------------------------------------------
def softmax(z):
    m = max(z)
    e = [exp(t - m) for t in z]
    return [t / sum(e) for t in e]


def ml_15(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        ps = Qs(q["ps"])
        assert sum(ps) == 1
        L = -log(float(ps[q["t"]]))
        not_near(L, 3)
        return {"answer": L, "vals": {"L": L}}
    z, t = q["z"], q["t"]
    m = max(z)
    ex_ = [exp(v - m) for v in z]
    pr = softmax(z)
    # softmax is shift-invariant: compare with the unshifted formula
    assert all(abs(a - exp(v) / sum(exp(u) for u in z)) < 1e-12 for a, v in zip(pr, z))
    if lv == 2:
        not_near(pr[t], 3)
        return {"answer": pr[t], "vals": {"m": m, "sh": [v - m for v in z], "ex": ex_, "S": sum(ex_), "p": pr}}
    if q["mode"] == 1:
        g = [a - (1 if i == t else 0) for i, a in enumerate(pr)]
        # check against the derivative of −ln softmax_t
        zs = sp.symbols("z0:3")
        L = -sp.log(sp.exp(zs[t]) / sum(sp.exp(v) for v in zs))
        for i in range(3):
            assert abs(float(sp.diff(L, zs[i]).subs({zs[k]: z[k] for k in range(3)})) - g[i]) < 1e-12
        for v in g:
            not_near(v, 3)
        return {"answer": g, "vals": {"m": m, "ex": ex_, "S": sum(ex_), "p": pr, "g": g}}
    T = Q(q["T"])
    zt = [F(v) / T for v in z]
    mt = max(float(v) for v in zt)
    et = [exp(float(v) - mt) for v in zt]
    pt = [v / sum(et) for v in et]
    not_near(pt[t], 3)
    return {"answer": pt[t], "vals": {"zt": frs(zt), "mt": mt, "et": et, "St": sum(et), "pt": pt}}


# ---- ML.init -------------------------------------------------------------------------------------------
def ml_init(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        nin, nout = q["nin"], q["nout"]
        v = F(2, nin) if q["he"] else F(2, nin + nout)
        return {"answer": float(v), "vals": {"v": fr(v), "s": nin + nout}}
    if lv == 2:
        tot = q["nin"] + q["nout"]
        a = sp.sqrt(sp.Rational(6, tot))
        assert a.is_rational
        af = F(str(a))
        # the uniform's variance a²/3 equals the Xavier variance
        assert af * af / 3 == F(2, tot)
        return {"answer": float(af), "vals": {"tot": tot, "kk": int(1 / (af * af)), "a": fr(af), "v": fr(F(2, tot))}}
    nin, vw, L, vx = q["nin"], Q(q["vw"]), q["L"], q["vx"]
    v = F(vx)
    for _ in range(L):
        v = nin * vw * v
    return {"answer": float(v), "vals": {"fac": fr(nin * vw), "gain": fr((nin * vw) ** L), "vz": fr(v)}}


# ---- ML.dropout ----------------------------------------------------------------------------------------
def ml_dropout(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        pp, h, m = Q(q["p"]), Qs(q["h"]), q["m"]
        out = [hi * mi / (1 - pp) for hi, mi in zip(h, m)]
        return {"answer": [float(o) for o in out], "vals": {"keep": fr(1 - pp), "out": frs(out)}}
    xs = q["xs"]
    mu = F(sum(xs), len(xs))
    var = sum((F(x) - mu) ** 2 for x in xs) / len(xs)
    sd = isqrt(int(var))
    assert mu.denominator == 1 and var.denominator == 1 and sd * sd == var
    d = [int(x - mu) for x in xs]
    if lv == 2:
        i, gam, bet = q["i"], Q(q["gam"]), Q(q["bet"])
        xh = F(d[i], sd)
        return {"answer": float(gam * xh + bet), "vals": {"mu": int(mu), "d": d, "s2": int(var), "sd": sd, "xh": fr(xh), "y": fr(gam * xh + bet)}}
    gam, bet = Qs(q["gam"]), Qs(q["bet"])
    xh = [F(t, sd) for t in d]
    assert sum(xh) == 0 and sum(t * t for t in xh) / len(xh) == 1
    y = [g * t + b for g, t, b in zip(gam, xh, bet)]
    return {"answer": [float(t) for t in y], "vals": {"mu": int(mu), "d": d, "s2": int(var), "sd": sd, "xh": frs(xh), "y": frs(y)}}


# ---- ML.16 ---------------------------------------------------------------------------------------------
def ml_16(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        th, g, eta = Qs(q["th"]), Qs(q["g"]), Q(q["eta"])
        nt = [a - eta * b for a, b in zip(th, g)]
        return {"answer": [float(t) for t in nt], "vals": {"st": frs([eta * b for b in g]), "nt": frs(nt)}}
    if lv == 2:
        th, g1, g2, beta, eta = (Q(q[k]) for k in ("th", "g1", "g2", "beta", "eta"))
        v, t = F(0), th
        hist = []
        for g in (g1, g2):
            v = beta * v + g
            t = t - eta * v
            hist.append((v, t))
        return {"answer": float(t), "vals": {"v1": fr(hist[0][0]), "t1": fr(hist[0][1]), "bv": fr(beta * hist[0][0]), "v2": fr(hist[1][0]), "t2": fr(hist[1][1])}}
    th, g, eta, lam, b1, b2 = Qs(q["th"]), Qs(q["g"]), Q(q["eta"]), Q(q["lam"]), Q(q["b1"]), Q(q["b2"])
    m = [(1 - b1) * x for x in g]
    v = [(1 - b2) * x * x for x in g]
    mh = [x / (1 - b1) for x in m]
    vh = [x / (1 - b2) for x in v]
    ratio = []
    for a, b in zip(mh, vh):
        rb = sp.sqrt(sp.Rational(b.numerator, b.denominator))
        ratio.append(F(str(sp.nsimplify(sp.Rational(a.numerator, a.denominator) / rb))))
    nt = [t - eta * (rr + lam * t) for t, rr in zip(th, ratio)]
    return {"answer": [float(t) for t in nt], "vals": {"m": frs(m), "v": frs(v), "mh": frs(mh), "vh": frs(vh), "ratio": frs(ratio), "nt": frs(nt)}}


# ---- ML.training -----------------------------------------------------------------------------------------
def ml_training(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        e0, gam, st, t = Q(q["e0"]), Q(q["gam"]), q["st"], q["t"]
        k = t // st
        return {"answer": float(e0 * gam ** k), "vals": {"k": k, "gk": fr(gam ** k), "et": fr(e0 * gam ** k)}}
    if lv == 2:
        g, cap = q["g"], q["cap"]
        nrm = sqrt(sum(t * t for t in g))
        c = int(round(nrm))
        assert c * c == sum(t * t for t in g) and c > cap
        out = [F(t * cap, c) for t in g]
        assert sum(o * o for o in out) == cap * cap
        return {"answer": [float(o) for o in out], "vals": {"c": c, "sc": fr(F(cap, c)), "out": frs(out)}}
    if q["mode"] == 0:
        T, t, emax, emin = q["T"], q["t"], Q(q["emax"]), Q(q["emin"])
        frac = F(t, T)
        cosv = sp.nsimplify(sp.cos(sp.pi * sp.Rational(frac.numerator, frac.denominator)))
        assert cosv.is_rational, "cos(πt/T) must be exact"
        cf = F(str(cosv))
        eta = emin + F(1, 2) * (emax - emin) * (1 + cf)
        return {"answer": float(eta), "vals": {"cosv": fr(cf), "num": frac.numerator, "den": frac.denominator, "diff": fr(emax - emin), "part": fr(eta - emin), "eta": fr(eta)}}
    loss, Pt = Qs(q["loss"]), q["Pt"]
    best, stop, wait = 0, None, 0
    for e in range(1, len(loss)):
        if loss[e] < loss[best]:
            best, wait = e, 0
        else:
            wait += 1
            if wait == Pt:
                stop = e
                break
    assert stop is not None
    return {"answer": [stop + 1, best + 1], "vals": {"stop": stop + 1, "best": best + 1, "epochs": list(range(1, stop + 2)), "bestL": fr(loss[best])}}


# ---- ML.cnn --------------------------------------------------------------------------------------------
def conv_out(W, Fk, Pd, S):
    return (W - Fk + 2 * Pd) // S + 1


def ml_cnn(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        O = conv_out(q["W"], q["Fk"], q["Pd"], q["S"])
        # brute force: count valid window positions on the padded input
        assert O == len(range(0, q["W"] + 2 * q["Pd"] - q["Fk"] + 1, q["S"]))
        return {"answer": O, "vals": {"num": q["W"] - q["Fk"] + 2 * q["Pd"], "O": O}}
    if lv == 2:
        per = q["Fk"] ** 2 * q["Cin"]
        return {"answer": (per + 1) * q["Cout"], "vals": {"per": per, "params": (per + 1) * q["Cout"]}}
    if q["mode"] == 0:
        W, F1, P1, S1, C1, F2, P2 = (q[k] for k in ("W", "F1", "P1", "S1", "C1", "F2", "P2"))
        O1 = conv_out(W, F1, P1, S1)
        O2 = conv_out(O1, 2, 0, 2)
        O3 = conv_out(O2, F2, P2, 1)
        return {"answer": [O3, 2 * C1], "vals": {"n1": W - F1 + 2 * P1, "O1": O1, "n2": O1 - 2, "O2": O2, "n3": O2 - F2 + 2 * P2, "O3": O3, "C2": 2 * C1}}
    Fs, Ss = q["Fs"], q["Ss"]
    # receptive field by tracking the input span of one top unit backward through the stack
    span = 1
    for Fk, S in reversed(list(zip(Fs, Ss))):
        span = (span - 1) * S + Fk
    jumps, rs, rr, j = [], [], 1, 1
    for Fk, S in zip(Fs, Ss):
        jumps.append(j)
        rr += (Fk - 1) * j
        rs.append(rr)
        j *= S
    assert span == rs[-1]
    return {"answer": span, "vals": {"jumps": jumps, "rs": rs}}


# ---- ML.rnn --------------------------------------------------------------------------------------------
def ml_rnn(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        wh, wx, b, h = float(Q(q["wh"])), float(Q(q["wx"])), float(Q(q["b"])), float(Q(q["h0"]))
        as_, hs = [], []
        for x in Qs(q["xs"]):
            a = wh * h + wx * float(x) + b
            h = __import__("math").tanh(a)
            as_.append(a)
            hs.append(h)
        not_near(h, 3)
        return {"answer": h, "vals": {"as": as_, "hs": hs}}
    wh, hs = Q(q["wh"]), Qs(q["hs"])
    hsym = sp.Symbol("h")
    dtanh = sp.diff(sp.tanh(hsym), hsym)  # 1 − tanh²
    fac = []
    for h in hs:
        hv = sp.Rational(h.numerator, h.denominator)
        f = sp.nsimplify(dtanh.subs(hsym, sp.atanh(hv))) * sp.Rational(wh.numerator, wh.denominator) if abs(hv) < 1 else None
        fac.append(F(str(sp.simplify(f))))
    assert all(f == (1 - h * h) * wh for f, h in zip(fac, hs))
    prod = F(1)
    for f in fac:
        prod *= f
    return {"answer": float(prod), "vals": {"hh": frs([h * h for h in hs]), "fac": frs(fac), "prod": fr(prod)}}


# ---- ML.lstm -------------------------------------------------------------------------------------------
def ml_lstm(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        f, i, c0, ct = Qs(q["f"]), Qs(q["i"]), Qs(q["c0"]), Qs(q["ct"])
        fc = [a * b for a, b in zip(f, c0)]
        ic = [a * b for a, b in zip(i, ct)]
        c1 = [a + b for a, b in zip(fc, ic)]
        return {"answer": [float(t) for t in c1], "vals": {"fc": frs(fc), "ic": frs(ic), "c1": frs(c1)}}
    if lv == 2:
        z, h0, ht = Qs(q["z"]), Qs(q["h0"]), Qs(q["ht"])
        one = [1 - t for t in z]
        a = [o * h for o, h in zip(one, h0)]
        b = [zz * h for zz, h in zip(z, ht)]
        h1 = [x + y for x, y in zip(a, b)]
        return {"answer": [float(t) for t in h1], "vals": {"one": frs(one), "a": frs(a), "b": frs(b), "h1": frs(h1)}}
    from math import tanh
    sg = lambda x: 1 / (1 + exp(-x))
    f, i, ct, o = sg(float(Q(q["af"]))), sg(float(Q(q["ai"]))), tanh(float(Q(q["ac"]))), sg(float(Q(q["ao"])))
    c1 = f * float(Q(q["c0"])) + i * ct
    h1 = o * tanh(c1)
    not_near(h1, 3)
    return {"answer": h1, "vals": {"f": f, "i": i, "ct": ct, "o": o, "c1": c1, "tc": tanh(c1), "h1": h1}}


# ---- ML.embeddings ---------------------------------------------------------------------------------------
def ml_embeddings(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        u, v = sp.Matrix(q["u"]), sp.Matrix(q["v"])
        cos = u.dot(v) / (u.norm() * v.norm())
        assert cos.is_rational
        nu, nv = int(u.norm()), int(v.norm())
        return {"answer": float(cos), "vals": {"dot": int(u.dot(v)), "nu": nu, "nv": nv, "n2": [nu * nu, nv * nv], "cos": fr(F(str(cos)))}}
    if lv == 2:
        k, m, w = q["king"], q["man"], q["woman"]
        tgt = [a - b + c for a, b, c in zip(k, m, w)]
        d2 = [(c[0] - tgt[0]) ** 2 + (c[1] - tgt[1]) ** 2 for c in q["cands"]]
        best = min(range(3), key=lambda i: sqrt(d2[i]))
        assert d2.count(d2[best]) == 1
        return {"answer": best, "vals": {"tgt": tgt, "d2": d2, "best": best}}
    vc, us, o = q["vc"], q["us"], q["o"]
    dots = [u[0] * vc[0] + u[1] * vc[1] for u in us]
    pr = exp(dots[o]) / sum(exp(d) for d in dots)
    m = max(dots)
    es = [exp(d - m) for d in dots]
    not_near(pr, 3)
    return {"answer": pr, "vals": {"dots": dots, "m": m, "es": es, "S": sum(es), "pr": pr}}


# ---- ML.attention ----------------------------------------------------------------------------------------
def ml_attention(p):
    q, lv = p["params"], p["level"]
    dk = q["dk"]
    rt = isqrt(dk)
    assert rt * rt == dk
    if lv == 1:
        dot = sum(a * b for a, b in zip(q["q"], q["k"]))
        return {"answer": float(F(dot, rt)), "vals": {"dot": dot, "sc": fr(F(dot, rt)), "rt": rt}}
    Qm = sp.Matrix([q["q"]])
    Km = sp.Matrix(q["K"])
    scores = (Qm * Km.T) / sp.sqrt(dk)
    dots = [int(x) for x in (Qm * Km.T)]
    sc = [float(x) for x in scores]
    w = softmax(sc)
    m = max(sc)
    es = [exp(x - m) for x in sc]
    vals = {"dots": dots, "sc": frs([F(d, rt) for d in dots]), "m": fr(F(max(dots), rt)), "es": es, "S": sum(es), "w": w, "rt": rt}
    if lv == 2:
        not_near(w[q["j"]], 3)
        return {"answer": w[q["j"]], "vals": vals}
    Vv = q["Vv"]
    out = [sum(a * v[c] for a, v in zip(w, Vv)) for c in range(2)]
    for t in out:
        not_near(t, 3)
    vals["out"] = out
    return {"answer": out, "vals": vals}


# ---- ML.transformer ----------------------------------------------------------------------------------------
def ml_transformer(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        d, H = q["d"], q["H"]
        assert d % H == 0
        return {"answer": d // H, "vals": {"dh": d // H, "ff": 4 * d}}
    if lv == 2:
        d = q["d"]
        if q["ffn"]:
            W1, b1, W2, b2 = 4 * d * d, 4 * d, d * 4 * d, d
            return {"answer": W1 + b1 + W2 + b2, "vals": {"a": W1, "b": b1, "c": W1 + W2, "e": b1 + b2, "ans": W1 + b1 + W2 + b2}}
        return {"answer": 4 * (d * d + d), "vals": {"a": d * d + d, "ans": 4 * (d * d + d)}}
    pp, d = q["p"], 4
    from math import sin, cos
    v = []
    for i in range(d // 2):
        ang = pp / 10000 ** (2 * i / d)
        v += [sin(ang), cos(ang)]
    for t in v:
        not_near(t, 3)
    return {"answer": v, "vals": {"vals": v, "pp": fr(F(pp, 100))}}


# ---- ML.17 ---------------------------------------------------------------------------------------------
def ml_17(p):
    q, lv = p["params"], p["level"]
    d2 = lambda a, b: (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
    if lv == 1:
        ds = [d2(q["x"], c) for c in q["cs"]]
        best = min(range(3), key=lambda i: ds[i])
        assert ds.count(ds[best]) == 1
        return {"answer": best, "vals": {"ds": ds, "best": best}}
    if lv == 2:
        c, X = q["c"], q["X"]
        ds = [[d2(x, m) for m in c] for x in X]
        assert all(a != b for a, b in ds)
        asg = [0 if a < b else 1 for a, b in ds]
        C1 = [x for x, g in zip(X, asg) if g == 0]
        mu = [F(sum(x[0] for x in C1), len(C1)), F(sum(x[1] for x in C1), len(C1))]
        return {"answer": [float(mu[0]), float(mu[1])], "vals": {"ds": ds, "asg": asg, "n1": len(C1), "mu": frs(mu), "sx": sum(x[0] for x in C1), "sy": sum(x[1] for x in C1)}}
    X, t = q["X"], q["target"]
    D = [d2(x, X[0]) for x in X]
    return {"answer": float(F(D[t], sum(D))), "vals": {"D": D, "S": sum(D), "prob": fr(F(D[t], sum(D)))}}


# ---- ML.18 ---------------------------------------------------------------------------------------------
def ml_18(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b = Q(q["a"]), Q(q["b"])
        s = (b - a) / max(a, b)
        assert -1 <= s <= 1
        return {"answer": float(s), "vals": {"diff": fr(b - a), "mx": fr(max(a, b)), "s": fr(s)}}
    if lv == 2:
        A, B, x = q["A"], q["B"], q["x"]
        dA = [abs(t - x) for t in A if t != x]
        assert len(dA) == len(A) - 1
        dB = [abs(t - x) for t in B]
        a, b = F(sum(dA), len(dA)), F(sum(dB), len(dB))
        s = (b - a) / max(a, b)
        return {"answer": float(s), "vals": {"dA": dA, "dB": dB, "a": fr(a), "b": fr(b), "mx": fr(max(a, b)), "s": fr(s)}}
    cl, link = q["cl"], q["link"]
    def dist(A, B):
        ds = [abs(a - b) for a in A for b in B]
        return {"single": F(min(ds)), "complete": F(max(ds)), "average": F(sum(ds), len(ds))}[link]
    ds = [dist(cl[0], cl[1]), dist(cl[0], cl[2]), dist(cl[1], cl[2])]
    best = min(range(3), key=lambda k: ds[k])
    assert ds.count(ds[best]) == 1
    return {"answer": best, "vals": {"ds": frs(ds), "best": best}}


# ---- ML.20 ---------------------------------------------------------------------------------------------
def ml_20(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        g = Qs(q["g"])
        return {"answer": float(sum(g) / q["k"]), "vals": {"Nk": fr(sum(g)), "pi": fr(sum(g) / q["k"])}}
    if lv == 2:
        g, xs = Qs(q["g"]), q["xs"]
        # the weighted mean minimizes Σ γ (x − μ)²
        mu_s = sp.Symbol("mu")
        sol = sp.solve(sp.diff(sum(sp.Rational(a.numerator, a.denominator) * (x - mu_s) ** 2 for a, x in zip(g, xs)), mu_s), mu_s)[0]
        gx = [a * x for a, x in zip(g, xs)]
        mu = sum(gx) / sum(g)
        assert F(str(sol)) == mu
        return {"answer": float(mu), "vals": {"gx": frs(gx), "S": fr(sum(gx)), "Nk": fr(sum(g)), "mu": fr(mu)}}
    mu1, mu2, x, pi1 = q["mu1"], q["mu2"], q["x"], Q(q["pi1"])
    from math import pi as PI
    N = lambda x, m: exp(-(x - m) ** 2 / 2) / sqrt(2 * PI)
    full = float(pi1) * N(x, mu1) / (float(pi1) * N(x, mu1) + float(1 - pi1) * N(x, mu2))
    n1, n2 = float(pi1) * exp(-(x - mu1) ** 2 / 2), float(1 - pi1) * exp(-(x - mu2) ** 2 / 2)
    assert abs(full - n1 / (n1 + n2)) < 1e-12
    not_near(full, 3)
    return {"answer": full, "vals": {"pi2": fr(1 - pi1), "e1": fr(F(-(x - mu1) ** 2, 2)), "e2": fr(F(-(x - mu2) ** 2, 2)), "n1": n1, "n2": n2, "gam": full}}


# ---- ML.19 ---------------------------------------------------------------------------------------------
def ml_19(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        lam, k = sorted(q["lam"], reverse=True), q["k"]
        return {"answer": float(F(sum(lam[:k]), sum(lam))), "vals": {"T": sum(lam), "top": sum(lam[:k]), "q": fr(F(sum(lam[:k]), sum(lam)))}}
    if lv == 2:
        a, b, c = q["a"], q["b"], q["c"]
        ev = sorted(sp.Matrix([[a, b], [b, c]]).eigenvals().keys(), reverse=True)
        assert all(e.is_integer for e in ev) and len(ev) == 2
        l1, l2 = int(ev[0]), int(ev[1])
        tr, det = a + c, a * c - b * b
        return {"answer": float(F(l1, tr)), "vals": {"tr": tr, "det": det, "disc": tr * tr - 4 * det, "sd": l1 - l2, "l1": l1, "l2": l2, "q": fr(F(l1, tr))}}
    v, mb, x = Qs(q["v"]), q["mb"], q["x"]
    assert v[0] ** 2 + v[1] ** 2 == 1
    dx = [x[0] - mb[0], x[1] - mb[1]]
    z = v[0] * dx[0] + v[1] * dx[1]
    xh = [mb[0] + z * v[0], mb[1] + z * v[1]]
    # residual is orthogonal to v (closest point on the line)
    assert (x[0] - xh[0]) * v[0] + (x[1] - xh[1]) * v[1] == 0
    return {"answer": [float(xh[0]), float(xh[1])], "vals": {"dx": dx, "z": fr(z), "xh": frs(xh)}}


# ---- ML.tsne -------------------------------------------------------------------------------------------
def ml_tsne(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b = q["a"], q["b"]
        d2 = (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
        return {"answer": float(F(1, 1 + d2)), "vals": {"d2": d2, "w": fr(F(1, 1 + d2)), "den": 1 + d2}}
    if lv == 2:
        ys = q["ys"]
        n = len(ys)
        W = {(i, j): F(1, 1 + (ys[i] - ys[j]) ** 2) for i in range(n) for j in range(n) if i != j}
        Z = sum(W.values())
        qq = W[(0, 1)] / Z
        pairs = [(0, 1), (0, 2), (1, 2)]
        return {"answer": float(qq), "vals": {"d": [(ys[i] - ys[j]) ** 2 for i, j in pairs], "w": frs([W[pr] for pr in pairs]), "Z": fr(Z), "q": fr(qq)}}
    pp, qq = Qs(q["p"]), Qs(q["q"])
    assert sum(pp) == F(1, 2) and sum(qq) == F(1, 2)
    terms = [float(a) * log(float(a) / float(b)) for a, b in zip(pp, qq)]
    # full ordered-pair sum
    C = sum(float(a) * log(float(a) / float(b)) for a, b in zip(pp + pp, qq + qq))
    not_near(C, 3)
    return {"answer": C, "vals": {"terms": terms, "half": sum(terms), "C": C, "h": fr(F(1, 2))}}


# ---- ML.autoencoder ----------------------------------------------------------------------------------------
def ml_autoencoder(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        x, xh = Qs(q["x"]), Qs(q["xh"])
        d = [a - b for a, b in zip(x, xh)]
        return {"answer": float(sum(t * t for t in d)), "vals": {"d": frs(d), "sq": frs([t * t for t in d]), "L": fr(sum(t * t for t in d))}}
    if lv == 2:
        mu, s2 = Qs(q["mu"]), Qs(q["s2"])
        terms = [float(m) ** 2 + float(v) - log(float(v)) - 1 for m, v in zip(mu, s2)]
        KL = sum(terms) / 2
        # check against the general KL between normals, dimension by dimension
        kl2 = sum(0.5 * (float(v) + float(m) ** 2 - 1 - log(float(v))) for m, v in zip(mu, s2))
        assert abs(KL - kl2) < 1e-12
        not_near(KL, 3)
        return {"answer": KL, "vals": {"mu2": frs([m * m for m in mu]), "ln": [log(float(v)) for v in s2], "terms": terms, "KL": KL}}
    mu, sg, eps, w, b, x = Qs(q["mu"]), Qs(q["sg"]), Qs(q["eps"]), q["w"], q["b"], Q(q["x"])
    z = [m + s * e for m, s, e in zip(mu, sg, eps)]
    xh = w[0] * z[0] + w[1] * z[1] + b
    return {"answer": float((x - xh) ** 2), "vals": {"z": frs(z), "xh": fr(xh), "diff": fr(x - xh), "L": fr((x - xh) ** 2), "aw": abs(w[1]), "ab": abs(b)}}


# ---- ML.gan --------------------------------------------------------------------------------------------
def ml_gan(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        pd, pg = Q(q["pd"]), Q(q["pg"])
        # D* maximizes pd·ln D + pg·ln(1 − D)
        Ds = sp.Symbol("D")
        sol = sp.solve(sp.diff(sp.Rational(pd.numerator, pd.denominator) * sp.log(Ds) + sp.Rational(pg.numerator, pg.denominator) * sp.log(1 - Ds), Ds), Ds)[0]
        D = pd / (pd + pg)
        assert F(str(sol)) == D
        return {"answer": float(D), "vals": {"s": fr(pd + pg), "D": fr(D), "half": fr(F(1, 2))}}
    if lv == 2:
        if q["ns"] == 0:
            dr, df = Qs(q["dr"]), Qs(q["df"])
            tr = [log(float(t)) for t in dr]
            tf = [log(1 - float(t)) for t in df]
            Vv = sum(tr) / 2 + sum(tf) / 2
            not_near(Vv, 3)
            return {"answer": Vv, "vals": {"tr": tr, "tf": tf, "mr": sum(tr) / 2, "mf": sum(tf) / 2, "Vv": Vv, "one": frs([1 - t for t in df])}}
        fk = Qs(q["fk"])
        t = [-log(float(x)) for x in fk]
        sat = [log(1 - float(x)) for x in fk]
        Lg = sum(t) / 3
        not_near(Lg, 3)
        return {"answer": Lg, "vals": {"t": t, "Lg": Lg, "sat": sat, "Ls": sum(sat) / 3}}
    pp, qq = Qs(q["p"]), Qs(q["q"])
    m = [(a + b) / 2 for a, b in zip(pp, qq)]
    kl = lambda u: sum(float(a) * log2(float(a) / float(c)) for a, c in zip(u, m) if a > 0)
    JS = (kl(pp) + kl(qq)) / 2
    # JS via entropies: H(m) − (H(p) + H(q))/2
    H = lambda u: -sum(float(a) * log2(float(a)) for a in u if a > 0)
    assert abs(JS - (H(m) - (H(pp) + H(qq)) / 2)) < 1e-12 and 0 <= JS <= 1
    not_near(JS, 3)
    return {"answer": JS, "vals": {"m": frs(m), "kp": kl(pp), "kq": kl(qq), "JS": JS}}


# ---- ML.mdp --------------------------------------------------------------------------------------------
def ml_mdp(p):
    q, lv = p["params"], p["level"]
    g = Q(q["g"])
    if lv == 1:
        rw = q["rw"]
        terms = [g ** i * x for i, x in enumerate(rw)]
        return {"answer": float(sum(terms)), "vals": {"gp": frs([g ** i for i in range(len(rw))]), "terms": frs(terms), "G": fr(sum(terms))}}
    if lv == 2:
        ra, rb = q["ra"], q["rb"]
        A, B = sp.symbols("A B")
        gs = sp.Rational(g.numerator, g.denominator)
        sol = sp.solve([A - (ra + gs * B), B - (rb + gs * A)], [A, B])
        VA, VB = F(str(sol[A])), F(str(sol[B]))
        return {"answer": float(VA), "vals": {"top": fr(ra + g * rb), "gg": fr(g * g), "bot": fr(1 - g * g), "VA": fr(VA), "VB": fr(VB)}}
    Vn, acts = q["Vn"], q["acts"]
    Qs_ = []
    for R, pr, s1, s2 in acts:
        pr = Q(pr)
        Qs_.append(pr * (R + g * Vn[s1]) + (1 - pr) * (R + g * Vn[s2]))
    assert Qs_[0] != Qs_[1]
    best = 0 if Qs_[0] > Qs_[1] else 1
    return {"answer": float(Qs_[best]), "vals": {"Qs": frs(Qs_), "q": frs([1 - Q(a[1]) for a in acts]), "best": best}}


# ---- ML.rl ---------------------------------------------------------------------------------------------
def ml_rl(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        qq, rw, g, nxt = Q(q["q"]), q["rw"], Q(q["g"]), Qs(q["nxt"])
        tgt = rw + g * max(nxt)
        delta = tgt - qq
        vals = {"mx": fr(max(nxt)), "tgt": fr(tgt), "delta": fr(delta)}
        if lv == 1:
            return {"answer": float(delta), "vals": vals}
        al = Q(q["al"])
        nq = (1 - al) * qq + al * tgt
        vals["nq"] = fr(nq)
        return {"answer": float(nq), "vals": vals}
    qs, eps, a = q["qs"], Q(q["eps"]), q["a"]
    nA = len(qs)
    gi = qs.index(max(qs))
    assert qs.count(max(qs)) == 1 and a != gi
    pi = [eps / nA + (1 - eps if i == gi else 0) for i in range(nA)]
    assert sum(pi) == 1
    Vs = sum(pp * x for pp, x in zip(pi, qs))
    return {"answer": float(qs[a] - Vs), "vals": {"pOther": fr(eps / nA), "om": fr(1 - eps), "pGreedy": fr(pi[gi]), "Vs": fr(Vs), "adv": fr(qs[a] - Vs), "gi": gi, "nA": nA}}


VERIFY = {
    "ML.1": ml_1, "ML.2": ml_2, "ML.3": ml_3, "ML.4": ml_4, "ML.6": ml_6, "ML.features": ml_features,
    "ML.linreg": ml_linreg, "ML.5": ml_5, "ML.7": ml_7, "ML.10": ml_10, "ML.9": ml_9, "ML.11": ml_11, "ML.12": ml_12,
    "ML.boosting": ml_boosting, "ML.13": ml_13, "ML.kernels": ml_kernels,
    "ML.8": ml_8, "ML.21": ml_21, "ML.22": ml_22, "ML.23": ml_23, "ML.calibration": ml_calibration, "ML.14": ml_14,
    "ML.activations": ml_activations, "ML.15": ml_15, "ML.init": ml_init, "ML.dropout": ml_dropout, "ML.16": ml_16, "ML.training": ml_training,
    "ML.cnn": ml_cnn, "ML.rnn": ml_rnn, "ML.lstm": ml_lstm, "ML.embeddings": ml_embeddings, "ML.attention": ml_attention,
    "ML.transformer": ml_transformer, "ML.17": ml_17, "ML.18": ml_18, "ML.20": ml_20, "ML.19": ml_19, "ML.tsne": ml_tsne,
    "ML.autoencoder": ml_autoencoder, "ML.gan": ml_gan, "ML.mdp": ml_mdp, "ML.rl": ml_rl,
}
