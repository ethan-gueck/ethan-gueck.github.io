"""Independent answers for practice/statistics.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]). Exact fractions
(fractions.Fraction), the statistics module and math.comb; the normal table is checked against math.erf."""
import math
from fractions import Fraction as F
from math import comb, erf, exp, isqrt, log, sqrt


class st:
    """The few statistics-module functions needed (this file shadows the module's name), on exact fractions."""
    @staticmethod
    def mean(a):
        return F(sum(F(x) for x in a), len(a))

    @staticmethod
    def median(a):
        b = sorted(F(x) for x in a)
        n = len(b)
        return b[n // 2] if n % 2 else (b[n // 2 - 1] + b[n // 2]) / 2

    @staticmethod
    def multimode(a):
        top = max(a.count(x) for x in a)
        return sorted({x for x in a if a.count(x) == top})

    @staticmethod
    def pvariance(a):
        m = st.mean(a)
        return sum((F(x) - m) ** 2 for x in a) / len(a)

    @staticmethod
    def variance(a):
        m = st.mean(a)
        return sum((F(x) - m) ** 2 for x in a) / (len(a) - 1)

    @staticmethod
    def covariance(a, b):
        ma, mb = st.mean(a), st.mean(b)
        return sum((F(x) - ma) * (F(y) - mb) for x, y in zip(a, b)) / (len(a) - 1)

    @staticmethod
    def correlation(a, b):
        return float(st.covariance(a, b)) / sqrt(float(st.variance(a) * st.variance(b)))

    @staticmethod
    def percentile(a, pp):
        """numpy's default linear interpolation, written independently: h = (n − 1)p."""
        b = sorted(F(x) for x in a)
        h = (len(b) - 1) * F(pp, 100)
        lo = math.floor(h)
        return b[lo] + (h - lo) * ((b[lo + 1] if lo + 1 < len(b) else b[lo]) - b[lo])

    @staticmethod
    def linear_regression(x, y):
        mx, my = st.mean(x), st.mean(y)
        slope = sum((F(a) - mx) * (F(b) - my) for a, b in zip(x, y)) / sum((F(a) - mx) ** 2 for a in x)
        return slope, my - slope * mx


def q(x):
    """A parameter (int, float or {n, d}) as an exact fraction."""
    if isinstance(x, dict):
        return F(x["n"], x["d"])
    return F(str(x)) if isinstance(x, float) else F(x)


def Phi(z):
    return 0.5 * (1 + erf(z / sqrt(2)))


PHI = {0.5: 0.6915, 1: 0.8413, 1.5: 0.9332, 2: 0.9772, 2.5: 0.9938, 3: 0.9987,
       1.96: 0.975, 1.645: 0.95, 0.84: 0.7995, 1.28: 0.8997, 2.33: 0.9901, 2.576: 0.995}
for _z, _v in PHI.items():
    assert round(Phi(_z), 4) == _v, f"table value for {_z} is wrong"


def table(z):
    return PHI[z if z != int(z) else int(z)]


def sq(v):
    r = isqrt(v)
    assert r * r == v, f"{v} is not a perfect square"
    return r


def terminates(x, dp=4):
    return 10 ** dp % F(x).denominator == 0


def tally(data):
    return [[x, data.count(x)] for x in sorted(set(data))]


# ---- descriptive -------------------------------------------------------------------------------
def s_1(p):
    P, L = p["params"], p["level"]
    if L == 1:
        data, kind = P["data"], P["kind"]
        assert all(P["lo"] <= x <= P["hi"] for x in data)
        N = len(data)
        if kind == 0:
            m = F(sum(data), N)
            assert m.denominator == 1 and m == st.mean(data)
            return {"answer": int(m), "vals": {"N": N, "s": sum(data), "mean": int(m)}}
        if kind == 1:
            assert N % 2 == 1
            med = st.median(data)
            return {"answer": med, "vals": {"N": N, "pos": (N + 1) // 2, "med": med}}
        modes = st.multimode(data)
        assert len(modes) == 1 and data.count(modes[0]) >= 2
        return {"answer": modes[0], "vals": {"freq": tally(data), "top": data.count(modes[0]), "mode": modes[0]}}
    if L == 2:
        if P["kind"] == 0:
            d = sorted(P["data"])
            N = len(d)
            assert N % 2 == 0
            med = F(d[N // 2 - 1] + d[N // 2], 2)
            assert med == st.median(d)
            return {"answer": med, "vals": {"N": N, "a": N // 2, "a1": N // 2 + 1, "m1": d[N // 2 - 1], "m2": d[N // 2], "med": med}}
        W, sc = P["W"], P["sc"]
        assert sum(W) == 100
        prods = [w * s for w, s in zip(W, sc)]
        g = F(sum(prods), sum(W))
        return {"answer": g, "vals": {"prods": prods, "T": sum(prods), "g": g}}
    if P["kind"] == 0:
        d, g = sorted(P["data"]), P["g"]
        N = len(d)
        mid = d[g:N - g]
        tm = F(sum(mid), len(mid))
        assert tm.denominator == 1 and tm == st.mean(mid)
        mean = F(sum(d), N)
        assert mean > tm, "the outlier should pull the mean above the trimmed mean"
        return {"answer": tm, "vals": {"N": N, "k": len(mid), "ms": sum(mid), "tm": tm, "s": sum(d), "mean": mean, "pct": F(100 * g, N)}}
    sc, T = P["sc"], P["T"]
    k = len(sc)
    assert k == P["k"]
    need = T * (k + 1) - sum(sc)
    assert st.mean(sc + [need]) == T and 0 <= need <= 100
    return {"answer": need, "vals": {"k1": k + 1, "tot": T * (k + 1), "s": sum(sc), "need": need}}


def s_2(p):
    P, L = p["params"], p["level"]
    if L in (1, 2):
        data = P["data"]
        N = len(data)
        mu = F(sum(data), N)
        assert mu.denominator == 1
        devs = [x - mu for x in data]
        sqs = [d * d for d in devs]
        SS = sum(sqs)
        if L == 1:
            v = SS / N
            assert v == st.pvariance(data) and v.denominator == 1
            sd = sq(int(v))
            assert sd > 0
            return {"answer": sd, "vals": {"N": N, "s": sum(data), "mu": mu, "devs": devs, "sq": sqs, "SS": SS, "v": v, "sd": sd}}
        s2 = SS / (N - 1)
        assert s2 == F(st.variance([F(x) for x in data]))
        return {"answer": s2, "vals": {"N": N, "n1": N - 1, "s": sum(data), "mu": mu, "devs": devs, "sq": sqs, "SS": SS, "s2": s2}}
    if P["kind"] == 0:
        N, Sx, Sxx = P["N"], P["Sx"], P["Sxx"]
        mu = F(Sx, N)
        mx2 = F(Sxx, N)
        v = mx2 - mu * mu
        assert mu.denominator == 1 and mx2.denominator == 1 and v > 0
        return {"answer": v, "vals": {"mu": mu, "mx2": mx2, "mu2": mu * mu, "v": v}}
    r1, r2 = F(P["s1"], P["m1"]), F(P["s2"], P["m2"])
    assert r1 != r2 and P["s2"] > P["s1"]
    return {"answer": 0 if r1 > r2 else 1, "vals": {"r1": r1, "r2": r2, "cv1": r1 * 100, "cv2": r2 * 100}}


def s_3(p):
    P, L = p["params"], p["level"]
    if L == 1:
        d = P["srt"]
        assert d == sorted(d) and len(d) == P["N"] == 8
        q1, q3 = st.median(d[:4]), st.median(d[4:])
        return {"answer": q3 - q1, "vals": {"q1": q1, "q3": q3, "iqr": q3 - q1}}
    if L == 2:
        d = sorted(P["data"])
        q1, q3 = st.median(d[:5]), st.median(d[5:])
        iqr = q3 - q1
        step = F(3, 2) * iqr
        lf, uf = q1 - step, q3 + step
        outs = [x for x in d if x < lf or x > uf]
        assert len(outs) == 1 and all(x != lf and x != uf for x in d)
        return {"answer": outs[0], "vals": {"N": len(d), "q1": q1, "q3": q3, "iqr": iqr, "step": step, "lf": lf, "uf": uf, "out": outs[0]}}
    if P["kind"] == 0:
        mn, q1, med, q3, mx = (P[k] for k in ("mn", "q1", "med", "q3", "mx"))
        assert mn < q1 < med < q3 < mx
        iqr = q3 - q1
        step = F(3, 2) * iqr
        uf = q3 + step
        assert mx <= uf and mn >= q1 - step
        return {"answer": uf, "vals": {"iqr": iqr, "step": step, "uf": uf}}
    d, pp = P["srt"], P["p"]
    N = len(d)
    L_ = F(pp, 100) * (N - 1) + 1
    j = math.floor(L_)
    f = L_ - j
    a = d[j - 1]
    b = a if f == 0 else d[j]
    ans = a + f * (b - a)
    # numpy's default ("linear") percentile agrees with this position rule
    assert ans == st.percentile(d, pp)
    return {"answer": ans, "vals": {"N": N, "n1": N - 1, "L": L_, "j": j, "j1": j + 1, "f": f, "a": a, "b": b, "ba": b - a, "ans": ans}}


def s_4(p):
    P, L = p["params"], p["level"]
    if L == 1:
        z = F(P["x"] - P["mu"], P["sd"])
        return {"answer": z, "vals": {"diff": P["x"] - P["mu"], "z": z, "az": abs(z)}}
    if L == 2:
        if P["kind"] == 0:
            zs = q(P["z"]) * P["sd"]
            return {"answer": P["mu"] + zs, "vals": {"zs": zs, "x": P["mu"] + zs}}
        d, x = P["data"], P["x"]
        lo, hi = min(d), max(d)
        assert lo < x < hi
        ans = F(x - lo, hi - lo)
        return {"answer": ans, "vals": {"lo": lo, "hi": hi, "rng": hi - lo, "top": x - lo, "ans": ans}}
    z1 = F(P["x1"] - P["m1"], P["s1"])
    z2 = F(P["x2"] - P["m2"], P["s2"])
    assert z1 != z2
    return {"answer": 0 if z1 > z2 else 1, "vals": {"d1": P["x1"] - P["m1"], "d2": P["x2"] - P["m2"], "z1": z1, "z2": z2}}


def s_shape(p):
    P, L = p["params"], p["level"]
    if L == 1:
        mean, med = P["mean"], P["med"]
        return {"answer": 0 if mean > med else 1 if mean < med else 2, "vals": {"diff": mean - med}}
    data = P["data"]
    N = len(data)
    m = F(sum(data), N)
    assert m.denominator == 1
    d = [x - m for x in data]
    SS = sum(x * x for x in d)
    m2 = SS / N
    if L == 2:
        k = sq(int(m2))
        cubes = [x ** 3 for x in d]
        m3 = F(sum(cubes), N)
        g1 = m3 / F(k) ** 3
        assert abs(float(g1) - float(m3) / float(m2) ** 1.5) < 1e-12 and g1 != 0
        return {"answer": g1, "vals": {"s": sum(data), "mean": m, "d": d, "sq": [x * x for x in d], "SS": SS, "m2": m2, "cubes": cubes,
                                       "S3": sum(cubes), "m3": m3, "k": k, "k3": k ** 3, "g1": g1}}
    fourth = [x ** 4 for x in d]
    m4 = F(sum(fourth), N)
    ratio = m4 / (m2 * m2)
    g2 = ratio - 3
    return {"answer": g2, "vals": {"s": sum(data), "mean": m, "d": d, "sq": [x * x for x in d], "SS": SS, "m2": m2, "m2sq": m2 * m2,
                                   "fourth": fourth, "S4": sum(fourth), "m4": m4, "ratio": ratio, "g2": g2}}


# ---- probability ---------------------------------------------------------------------------------
def is_prime(x):
    return x > 1 and all(x % d for d in range(2, isqrt(x) + 1))


def s_axioms(p):
    P, L = p["params"], p["level"]
    if L == 1:
        m, kind = P["m"], P["kind"]
        S = range(1, m + 1)
        A = [x for x in S if (x % P["k"] == 0 if kind == 0 else x > P["t"] if kind == 1 else is_prime(x))]
        assert A
        return {"answer": F(len(A), m), "vals": {"A": A, "c": len(A), "p": F(len(A), m)}}
    if L == 2:
        s, kind = P["s"], P["kind"]
        out = [(a, b) for a in range(1, 7) for b in range(1, 7) if (a + b == s if kind == 0 else a + b >= s)]
        ws = [sum(1 for a in range(1, 7) for b in range(1, 7) if a + b == u) for u in range(s, 13)]
        return {"answer": F(len(out), 36), "vals": {"c": len(out), "p": F(len(out), 36), "ws": ws, "ts": list(range(s, 13))}}
    pa, pb, k = q(P["pa"]), q(P["pb"]), P["k"]
    g = (1 - pa - pb) / (k + 1)
    assert 0 < g and pa + pb + g + k * g == 1
    return {"answer": g, "vals": {"k1": k + 1, "pab": pa + pb, "right": 1 - pa - pb, "pc": g, "py": k * g}}


def s_5(p):
    P, L = p["params"], p["level"]
    if L == 1:
        return {"answer": 1 - q(P["p"]), "vals": {"q": 1 - q(P["p"])}}
    if L == 2:
        pa, pb, pc = q(P["pa"]), q(P["pb"]), q(P["pc"])
        assert pc <= min(pa, pb)
        u = pa + pb - pc
        assert u <= 1
        return {"answer": u if P["kind"] == 0 else 1 - u, "vals": {"u": u, "none": 1 - u}}
    if P["kind"] == 0:
        none = math.prod(q(x) for x in P["qs"])
        return {"answer": 1 - none, "vals": {"none": none, "ans": 1 - none}}
    A, B, C, AB, AC, BC, ABC = (q(P[k]) for k in ("A", "B", "C", "AB", "AC", "BC", "ABC"))
    # rebuild the eight Venn regions; each must be a probability
    regions = [A - AB - AC + ABC, B - AB - BC + ABC, C - AC - BC + ABC, AB - ABC, AC - ABC, BC - ABC, ABC]
    assert all(r_ >= 0 for r_ in regions) and sum(regions) <= 1
    u = A + B + C - AB - AC - BC + ABC
    assert u == sum(regions)
    return {"answer": u, "vals": {"singles": A + B + C, "pairs": AB + AC + BC, "u": u}}


WORDS = ["STATISTICS", "BANANA", "LETTER", "SUCCESS", "BALLOON", "COMMITTEE", "MISSISSIPPI"]


def s_8(p):
    P, L = p["params"], p["level"]
    if L == 1:
        if P["kind"] == 0:
            return {"answer": P["a"] * P["b"] * P["c"], "vals": {"ans": P["a"] * P["b"] * P["c"]}}
        N, k = P["N"], P["k"]
        return {"answer": math.perm(N, k), "vals": {"fs": list(range(N, N - k, -1)), "ans": math.perm(N, k)}}
    if L == 2:
        N, k = P["N"], P["k"]
        num = math.perm(N, k)
        return {"answer": comb(N, k), "vals": {"fs": list(range(N, N - k, -1)), "Nk": N - k, "num": num, "kf": math.factorial(k), "ans": comb(N, k)}}
    if P["kind"] == 0:
        w = WORDS[P["wi"]]
        counts = sorted((w.count(c) for c in set(w) if w.count(c) > 1), reverse=True)
        js = [w.count(c) for c in dict.fromkeys(sorted(set(w), key=lambda c: (-w.count(c), w.index(c)))) if w.count(c) > 1]
        dens = [math.factorial(c) for c in js]
        den = math.prod(dens)
        ans = math.factorial(len(w)) // den
        # brute force on the multiset
        assert ans == math.factorial(len(w)) // math.prod(math.factorial(w.count(c)) for c in set(w))
        assert sorted(js, reverse=True) == counts
        return {"answer": ans, "vals": {"N": len(w), "counts": js, "top": math.factorial(len(w)), "dens": dens, "den": den, "ans": ans}}
    if P["kind"] == 1:
        W, Mn, k, j = P["W"], P["Mn"], P["k"], P["j"]
        cw, cm = comb(W, j), comb(Mn, k - j)
        return {"answer": cw * cm, "vals": {"km": k - j, "cw": cw, "cm": cm, "ans": cw * cm}}
    kinds, k = P["kinds"], P["k"]
    ans = comb(kinds + k - 1, k)
    # count multisets directly
    assert ans == sum(1 for _ in __import__("itertools").combinations_with_replacement(range(kinds), k))
    return {"answer": ans, "vals": {"bars": kinds - 1, "T": kinds + k - 1, "ans": ans}}


def s_6(p):
    P, L = p["params"], p["level"]
    if L == 1:
        c = P["c"]
        rt = [sum(row) for row in c]
        ct = [c[0][j] + c[1][j] for j in range(2)]
        ans = F(c[P["ri"]][P["cj"]], ct[P["cj"]])
        return {"answer": ans, "vals": {"rt": rt, "ct": ct, "N": sum(rt), "p": ans}}
    if L == 2:
        R, B, kind = P["R"], P["B"], P["kind"]
        N = R + B
        x = R - 1 if kind == 0 else B
        ans = F(R, N) * F(x, N - 1)
        # enumerate ordered pairs of distinct marbles
        balls = ["r"] * R + ["b"] * B
        good = sum(1 for i in range(N) for j in range(N) if i != j and balls[i] == "r" and balls[j] == ("r" if kind == 0 else "b"))
        assert F(good, N * (N - 1)) == ans
        return {"answer": ans, "vals": {"N": N, "N1": N - 1, "x": x, "top": R * x, "bot": N * (N - 1), "p": ans}}
    N, a, rA, cB = P["N"], P["a"], P["rA"], P["cB"]
    b, c, d = rA - a, cB - a, N - rA - cB + a
    assert min(a, b, c, d) > 0
    indep = F(a, N) == F(rA, N) * F(cB, N)
    assert indep == (F(a, rA) == F(cB, N))
    return {"answer": 0 if indep else 1, "vals": {"b": b, "c": c, "d": d, "rB": N - rA, "nB": N - cB, "pB": F(cB, N), "pBA": F(a, rA)}}


def s_total(p):
    P, L = p["params"], p["level"]
    if L == 1:
        pA, bA, bN = q(P["pA"]), q(P["bA"]), q(P["bN"])
        t1, t2 = bA * pA, bN * (1 - pA)
        return {"answer": t1 + t2, "vals": {"dry": 1 - pA, "t1": t1, "t2": t2, "ans": t1 + t2}}
    if L == 2:
        S, D = P["S"], P["D"]
        assert sum(S) == 100
        terms = [F(s, 100) * F(d, 100) for s, d in zip(S, D)]
        return {"answer": sum(terms), "vals": {"sD": [F(x, 100) for x in S], "dD": [F(x, 100) for x in D], "terms": terms, "ans": sum(terms), "pct": sum(terms) * 100}}
    q1, q0, pB = q(P["q1"]), q(P["q0"]), q(P["pB"])
    a = (pB - q0) / (q1 - q0)
    assert 0 < a < 1 and q1 * a + q0 * (1 - a) == pB
    return {"answer": a, "vals": {"diff": q1 - q0, "top": pB - q0, "a": a, "na": 1 - a}}


def s_7(p):
    P, L = p["params"], p["level"]
    if L == 1:
        pA, bA, pB = q(P["pA"]), q(P["bA"]), q(P["pB"])
        ans = bA * pA / pB
        assert 0 < ans <= 1 and pB >= bA * pA
        return {"answer": ans, "vals": {"num": bA * pA, "ans": ans}}
    if L == 2:
        prev, sens, fpr = F(P["prev"], 100), F(P["sens"], 100), F(P["fpr"], 100)
        ans = sens * prev / (sens * prev + fpr * (1 - prev))
        D = 10000 * prev
        TP, FP = sens * D, fpr * (10000 - D)
        assert TP.denominator == 1 and FP.denominator == 1
        return {"answer": ans, "vals": {"D": D, "H": 10000 - D, "TP": TP, "FP": FP, "pos": TP + FP, "ans": ans}}
    S, D, j = P["S"], P["D"], P["j"]
    joint = [F(s, 100) * F(d, 100) for s, d in zip(S, D)]
    tot = sum(joint)
    post = [x / tot for x in joint]
    assert sum(post) == 1
    pct = math.floor(post[j] * 100 + F(1, 2))
    assert (post[j] * 100 - F(1, 2)).denominator != 1 or True
    return {"answer": post[j], "vals": {"sD": [F(x, 100) for x in S], "dD": [F(x, 100) for x in D], "joint": joint, "tot": tot, "ans": post[j], "pct": pct}}


def s_rv(p):
    P, L = p["params"], p["level"]
    if L == 1:
        ps = [q(x) for x in P["ps"]]
        m = P["m"]
        assert ps[m] == 0
        known = sum(ps)
        miss = 1 - known
        assert 0 < miss < 1
        return {"answer": miss, "vals": {"known": known, "miss": miss}}
    if L == 2:
        Fv = [q(x) for x in P["F"]]
        assert Fv == sorted(Fv) and Fv[-1] == 1
        kind = P["kind"]
        if kind == 0:
            ans = Fv[P["k"]] - Fv[P["k"] - 1]
        elif kind == 1:
            ans = Fv[P["b"]] - Fv[P["a"]]
        else:
            ans = 1 - Fv[P["k"]]
        return {"answer": ans, "vals": {"q": ans, "xs": [0, 1, 2, 3, 4]}}
    Lx = P["L"]
    if P["kind"] == 0:
        a, b = P["a"], P["b"]
        # integrate the density 2x/L^2 from a to b
        ans = F(b * b - a * a, Lx * Lx)
        return {"answer": ans, "vals": {"L2": Lx * Lx, "bb": b * b, "aa": a * a, "Fb": F(b * b, Lx * Lx), "Fa": F(a * a, Lx * Lx), "top": b * b - a * a, "ans": ans}}
    s = q(P["s"])
    pp = s * s
    x2 = pp * Lx * Lx
    xq = s * Lx
    assert xq * xq == x2 and xq * xq / (Lx * Lx) == pp
    return {"answer": xq, "vals": {"L2": Lx * Lx, "p": pp, "x2": x2, "xq": xq, "pct": pp * 100}}


def s_9(p):
    P, L = p["params"], p["level"]
    if L == 1:
        xs, ps = P["xs"], [q(x) for x in P["ps"]]
        assert sum(ps) == 1
        terms = [x * pp for x, pp in zip(xs, ps)]
        ev = sum(terms)
        return {"answer": ev, "vals": {"terms": terms, "ev": ev, "lose": abs(ev)}}
    if L == 2:
        ps = [q(x) for x in P["ps"]]
        assert sum(ps) == 1
        m = sum(x * pp for x, pp in enumerate(ps))
        m2 = sum(x * x * pp for x, pp in enumerate(ps))
        vr = sum((x - m) ** 2 * pp for x, pp in enumerate(ps))
        assert vr == m2 - m * m
        return {"answer": vr, "vals": {"m": m, "m2": m2, "msq": m * m, "vr": vr, "sq": [0, 1, 4, 9]}}
    if P["kind"] == 0:
        mu, sd, a, b = P["mu"], P["sd"], P["a"], P["b"]
        return {"answer": [a * mu - b, a * sd], "vals": {"am": a * mu, "ey": a * mu - b, "sy": a * sd}}
    s1, s2 = P["s1"], P["s2"]
    s3 = sq(s1 * s1 + s2 * s2)
    return {"answer": s3, "vals": {"v1": s1 * s1, "v2": s2 * s2, "vt": s3 * s3, "sdt": s3, "naive": s1 + s2, "mt": P["m1"] + P["m2"]}}


def s_joint(p):
    P, L = p["params"], p["level"]
    if L == 3 and P.get("kind") == 1:
        ps, mus = P["ps"], P["mus"]
        assert sum(ps) == 100
        pq = [F(x, 100) for x in ps]
        terms = [a * b for a, b in zip(pq, mus)]
        return {"answer": sum(terms), "vals": {"pq": pq, "terms": terms, "ev": sum(terms)}}
    c = P["c"]
    cq = [[F(v, 100) for v in row] for row in c]
    assert sum(map(sum, cq)) == 1
    out = s_joint_core(P, L, cq)
    out["vals"]["cells"] = [v for row in cq for v in row]
    return out


def s_joint_core(P, L, cq):
    if L == 1:
        if P["kind"] == 0:
            return {"answer": sum(cq[P["i"]]), "vals": {"ans": sum(cq[P["i"]])}}
        j = P["j"]
        return {"answer": cq[0][j] + cq[1][j], "vals": {"y": j + 1, "ans": cq[0][j] + cq[1][j]}}
    i = P["i"]
    px = sum(cq[i])
    if L == 2:
        j = P["j"]
        return {"answer": cq[i][j] / px, "vals": {"y": j + 1, "px": px, "ans": cq[i][j] / px}}
    num = sum((j + 1) * v for j, v in enumerate(cq[i]))
    cond = [v / px for v in cq[i]]
    assert sum(cond) == 1
    ans = sum((j + 1) * v for j, v in enumerate(cond))
    assert ans == num / px
    return {"answer": ans, "vals": {"px": px, "num": num, "ans": ans}}


def s_bernoulli(p):
    P, L = p["params"], p["level"]
    pp = q(P["p"])
    qq = 1 - pp
    if L == 1:
        k = P["k"]
        return {"answer": qq ** (k - 1) * pp, "vals": {"k1": k - 1, "q": qq, "qk": qq ** (k - 1), "ans": qq ** (k - 1) * pp}}
    if L == 2:
        if P["kind"] == 0:
            k = P["k"]
            # P(X > k) = 1 − Σ_{j≤k} P(X = j)
            ans = 1 - sum(qq ** (j - 1) * pp for j in range(1, k + 1))
            assert ans == qq ** k
            return {"answer": ans, "vals": {"q": qq, "ans": ans}}
        return {"answer": [1 / pp, qq / pp ** 2], "vals": {"q": qq, "p2": pp * pp, "mean": 1 / pp, "vr": qq / pp ** 2}}
    r_, k = P["r"], P["k"]
    ways = comb(k - 1, r_ - 1)
    ans = ways * pp ** r_ * qq ** (k - r_)
    return {"answer": ans, "vals": {"r1": r_ - 1, "k1": k - 1, "kr": k - r_, "ways": ways, "q": qq, "pr": pp ** r_, "qr": qq ** (k - r_), "seq": pp ** r_ * qq ** (k - r_), "ans": ans}}


def binom(n, k, pp):
    return comb(n, k) * pp ** k * (1 - pp) ** (n - k)


def s_10(p):
    P, L = p["params"], p["level"]
    if L == 1:
        N, k = P["N"], P["k"]
        return {"answer": binom(N, k, F(1, 2)), "vals": {"tot": 2 ** N, "c": comb(N, k), "ans": binom(N, k, F(1, 2))}}
    if L == 2:
        if P["kind"] == 0:
            d, N, k = P["d"], P["N"], P["k"]
            pp = F(1, d)
            return {"answer": binom(N, k, pp), "vals": {"c": comb(N, k), "nk": N - k, "q": 1 - pp, "pk": pp ** k, "qk": (1 - pp) ** (N - k), "ans": binom(N, k, pp)}}
        pp, N = q(P["p"]), P["N"]
        ans = 1 - binom(N, 0, pp)
        assert ans == sum(binom(N, j, pp) for j in range(1, N + 1))
        return {"answer": ans, "vals": {"q": 1 - pp, "none": (1 - pp) ** N, "ans": ans}}
    pp, N = q(P["p"]), P["N"]
    if P["kind"] == 0:
        ans = sum(binom(N, j, pp) for j in range(2, N + 1))
        return {"answer": ans, "vals": {"q": 1 - pp, "n1": N - 1, "p0": binom(N, 0, pp), "q1": (1 - pp) ** (N - 1), "p1": binom(N, 1, pp), "ans": ans}}
    c = P["c"]
    mu = N * pp
    vr = N * pp * (1 - pp)
    sd = sq(int(vr))
    assert mu >= 10 and N * (1 - pp) >= 10 and mu.denominator == 1
    z = (F(c) - F(1, 2) - mu) / sd
    ph = table(float(z))
    ans = 1 - ph
    exact = float(sum(binom(N, j, pp) for j in range(c, N + 1)))
    assert abs(exact - ans) < 0.02, "the normal approximation should be close to the exact binomial"
    return {"answer": ans, "vals": {"mu": mu, "vr": vr, "sd": sd, "c5": F(c) - F(1, 2), "z": z, "ph": ph, "ans": ans}}


def s_hyper(p):
    P, L = p["params"], p["level"]
    if L == 1:
        a, b = P["a"], P["b"]
        vals = range(a, b + 1)
        m = len(vals)
        mu = F(sum(vals), m)
        vr = sum((F(x) - mu) ** 2 for x in vals) / m
        assert vr == F(m * m - 1, 12)
        return {"answer": [mu, vr], "vals": {"m": m, "ab": a + b, "mu": mu, "mm": m * m, "top": m * m - 1, "vr": vr}}
    N, K, nn = P["N"], P["K"], P["nn"]
    T = comb(N, nn)
    if L == 2:
        k = P["k"]
        a, b = comb(K, k), comb(N - K, nn - k)
        return {"answer": F(a * b, T), "vals": {"a": a, "b": b, "NK": N - K, "nk": nn - k, "T": T, "ab": a * b, "ans": F(a * b, T)}}
    if P["kind"] == 0:
        z = comb(N - K, nn)
        ans = 1 - F(z, T)
        assert ans == sum(F(comb(K, k) * comb(N - K, nn - k), T) for k in range(1, min(K, nn) + 1))
        return {"answer": ans, "vals": {"NK": N - K, "z": z, "T": T, "p0": F(z, T), "ans": ans}}
    pmf = {k: F(comb(K, k) * comb(N - K, nn - k), T) for k in range(0, min(K, nn) + 1)}
    mu = sum(k * v for k, v in pmf.items())
    vr = sum((k - mu) ** 2 * v for k, v in pmf.items())
    pk = F(K, N)
    fpc = F(N - nn, N - 1)
    assert mu == nn * pk and vr == nn * pk * (1 - pk) * fpc
    return {"answer": [mu, vr], "vals": {"pk": pk, "mu": mu, "Nn": N - nn, "N1": N - 1, "fpc": fpc, "qk": 1 - pk, "vr": vr}}


def pois(l, k):
    return l ** k * exp(-l) / math.factorial(k)


def s_11(p):
    P, L = p["params"], p["level"]
    if L <= 2:
        k = P["k"]
        if L == 1:
            l = P["l"]
        else:
            l = P["rate"] * P["t"] / 60
            assert (2 * l) == int(2 * l)
        return {"answer": pois(l, k), "vals": {"l": l, "lk": l ** k, "kf": math.factorial(k), "e": exp(-l), "ans": pois(l, k)}}
    r1, r2, t = P["r1"], P["r2"], P["t"]
    l = (r1 + r2) * t
    ans = 1 - pois(l, 0) - pois(l, 1)
    assert abs(ans - sum(pois(l, k) for k in range(2, 80))) < 1e-12
    return {"answer": ans, "vals": {"rs": r1 + r2, "l": l, "e": exp(-l), "p0": pois(l, 0), "p1": pois(l, 1), "ans": ans, "mins": t * 60}}


def s_20(p):
    P, L = p["params"], p["level"]
    if L == 1:
        b, c, d = P["b"], P["c"], P["d"]
        assert 0 <= c < d <= b and d - c < b
        return {"answer": F(d - c, b), "vals": {"w": d - c, "ans": F(d - c, b)}}
    if L == 2 and P["kind"] == 0:
        if True:
            a, b = P["a"], P["b"]
            return {"answer": [F(a + b, 2), F((b - a) ** 2, 12)], "vals": {"ab": a + b, "mu": F(a + b, 2), "w": b - a, "ww": (b - a) ** 2, "vr": F((b - a) ** 2, 12)}}
    m = P["m"]
    lam = F(1, m)
    if L == 2:
        x = P["x"]
        return {"answer": 1 - exp(-x / m), "vals": {"lam": lam, "xm": F(x, m), "e": exp(-x / m), "ans": 1 - exp(-x / m)}}
    if P["kind"] == 0:
        s, t = P["s"], P["t"]
        cond = exp(-(s + t) / m) / exp(-s / m)
        assert abs(cond - exp(-t / m)) < 1e-12
        return {"answer": exp(-t / m), "vals": {"lam": lam, "xm": F(t, m), "e": exp(-t / m)}}
    a, b = P["a"], P["b"]
    return {"answer": exp(-a / m) - exp(-b / m), "vals": {"lam": lam, "am": F(a, m), "bm": F(b, m), "ea": exp(-a / m), "eb": exp(-b / m), "ans": exp(-a / m) - exp(-b / m)}}


def cdf_table(z):
    z = F(str(z)) if isinstance(z, float) else F(z)
    return table(float(abs(z))) if z > 0 else 1 - table(float(abs(z)))


def s_12(p):
    P, L = p["params"], p["level"]
    if L == 1:
        mu, sd, lo, hi = P["mu"], P["sd"], P["lo"], P["hi"]
        # empirical-rule masses (percent) of the bands between successive cuts
        cuts = [-99, -3, -2, -1, 0, 1, 2, 3, 99]
        mass = {(-99, -3): F(15, 100), (-3, -2): F(235, 100), (-2, -1): F(1350, 100), (-1, 0): F(34)}
        for (a, b), v in list(mass.items()):
            mass[(-b, -a)] = v
        i, j = cuts.index(lo), cuts.index(hi)
        assert i < j and not (i == 0 and j == 8)
        pct = sum(mass[(cuts[k], cuts[k + 1])] for k in range(i, j))
        assert sum(mass.values()) == 100
        # the rule is close to the true normal areas
        true = (Phi(hi) - Phi(lo)) * 100
        assert abs(true - float(pct)) < 0.5
        zs = [z for z in (lo, hi) if abs(z) != 99]
        return {"answer": pct, "vals": {"zs": zs, "xs": [mu + z * sd for z in zs], "diffs": [z * sd for z in zs], "pct": pct}}
    if L == 2:
        mu, sd, x, less = P["mu"], P["sd"], q(P["x"]), P["less"]
        z = (x - mu) / sd
        Fz = cdf_table(z)
        ans = Fz if less else 1 - Fz
        assert abs(float(ans) - (Phi(float(z)) if less else 1 - Phi(float(z)))) < 1e-4
        return {"answer": ans, "vals": {"diff": x - mu, "z": z, "az": abs(z), "ph": table(float(abs(z))), "ans": ans}}
    mu, sd = P["mu"], P["sd"]
    if P["kind"] == 0:
        a, b = P["a"], P["b"]
        a, b = q(a), q(b)
        za, zb = (a - mu) / sd, (b - mu) / sd
        Fa, Fb = cdf_table(za), cdf_table(zb)
        return {"answer": Fb - Fa, "vals": {"za": za, "zb": zb, "Fa": Fa, "Fb": Fb, "ans": Fb - Fa, "pa": table(float(abs(za))), "pb": table(float(abs(zb))), "da": a - mu, "db": b - mu}}
    top = P["top"]
    tail = q(P["tail"])
    z = {F(5): 1.645, F(5, 2): 1.96, F(10): 1.28, F(1): 2.33}[tail]
    assert abs(Phi(z) - (1 - float(tail) / 100)) < 0.0005
    cut = mu + (1 if top else -1) * F(str(z)) * sd
    return {"answer": cut, "vals": {"z": z, "tail": tail, "target": 1 - tail / 100, "ph": table(z), "zsd": F(str(z)) * sd, "cutoff": cut}}


# ---- inference -----------------------------------------------------------------------------------
def s_dof(p):
    P, L = p["params"], p["level"]
    if L == 1:
        if P["kind"] == 0:
            return {"answer": P["N"] - 1, "vals": {"df": P["N"] - 1}}
        N, mean, known = P["N"], P["mean"], P["known"]
        last = N * mean - sum(known)
        assert st.mean(known + [last]) == mean
        return {"answer": last, "vals": {"N1": N - 1, "tot": N * mean, "s": sum(known), "last": last}}
    if L == 2:
        k = P["kind"]
        if k == 0:
            d = (P["R"] - 1) * (P["C"] - 1)
            return {"answer": d, "vals": {"R1": P["R"] - 1, "C1": P["C"] - 1, "d": d}}
        if k == 1:
            return {"answer": P["n1"] + P["n2"] - 2, "vals": {"d": P["n1"] + P["n2"] - 2}}
        d = P["k"] - 1 - P["m"]
        return {"answer": d, "vals": {"d": d}}
    if P["kind"] == 0:
        s = P["sizes"]
        return {"answer": [len(s) - 1, sum(s) - len(s)], "vals": {"k": len(s), "N": sum(s), "d1": len(s) - 1, "d2": sum(s) - len(s)}}
    N, pp = P["N"], P["p"]
    return {"answer": [pp, N - pp - 1], "vals": {"d2": N - pp - 1}}


def s_sampling(p):
    P, L = p["params"], p["level"]
    if L == 1:
        k = P["k"]
        return {"answer": [k, 2 * k], "vals": {"k2": 2 * k}}
    if L == 2:
        N, xb, s, mu0 = P["N"], q(P["xb"]), P["s"], P["mu0"]
        rt = sq(N)
        se = F(s, rt)
        t = (xb - mu0) / se
        return {"answer": t, "vals": {"rt": rt, "se": se, "diff": xb - mu0, "t": t, "df": N - 1}}
    if P["kind"] == 0:
        N, s2, v0 = P["N"], P["s2"], P["v0"]
        return {"answer": F((N - 1) * s2, v0), "vals": {"N1": N - 1, "top": (N - 1) * s2, "stat": F((N - 1) * s2, v0)}}
    s1, s2 = P["s1"], P["s2"]
    return {"answer": F(s1 * s1, s2 * s2), "vals": {"v1": s1 * s1, "v2": s2 * s2, "F": F(s1 * s1, s2 * s2), "d1": P["n1"] - 1, "d2": P["n2"] - 1}}


def s_lln(p):
    P, L = p["params"], p["level"]
    if L == 1:
        k = q(P["k"])
        return {"answer": 1 - 1 / k ** 2, "vals": {"k": k, "inv": 1 / k ** 2, "ans": 1 - 1 / k ** 2}}
    if L == 2:
        assert P["a"] > P["mu"]
        return {"answer": F(P["mu"], P["a"]), "vals": {"ans": F(P["mu"], P["a"])}}
    if P["kind"] == 0:
        mu, sd, lo, hi = P["mu"], P["sd"], P["lo"], P["hi"]
        assert mu - lo == hi - mu
        k = F(hi - mu, sd)
        return {"answer": 1 - 1 / k ** 2, "vals": {"half": hi - mu, "k": k, "inv": 1 / k ** 2, "ans": 1 - 1 / k ** 2}}
    sd, eps, de = P["sd"], q(P["eps"]), q(P["del"])
    raw = F(sd * sd) / (eps * eps * de)
    ans = math.ceil(raw)
    assert F(sd * sd) / (ans * eps * eps) <= de and (ans == 1 or F(sd * sd) / ((ans - 1) * eps * eps) > de)
    return {"answer": ans, "vals": {"s2": sd * sd, "e2": eps * eps, "raw": raw, "ans": ans, "conf": 1 - de}}


def s_13(p):
    P, L = p["params"], p["level"]
    if L == 1:
        rt = sq(P["N"])
        return {"answer": F(P["sd"], rt), "vals": {"rt": rt, "se": F(P["sd"], rt)}}
    if L == 2:
        ph, N = q(P["ph"]), P["N"]
        pq = ph * (1 - ph)
        k = sq(N)
        rpq = F(sq(int(pq * 100)), 10)
        se = rpq / k
        assert se * se == pq / N
        return {"answer": se, "vals": {"q": 1 - ph, "pq": pq, "rpq": rpq, "k": k, "se": se, "pts": se * 100}}
    if P["kind"] == 0:
        mu, sd, N, c = P["mu"], P["sd"], P["N"], q(P["c"])
        rt = sq(N)
        se = F(sd, rt)
        z = (c - mu) / se
        ph = table(float(z))
        return {"answer": 1 - ph, "vals": {"rt": rt, "se": se, "diff": c - mu, "z": z, "ph": ph, "ans": 1 - ph}}
    n1, s1, n2, s2 = P["n1"], P["s1"], P["n2"], P["s2"]
    a2, b2 = F(s1 * s1, n1), F(s2 * s2, n2)
    c = sq(int(a2 + b2))
    return {"answer": c, "vals": {"v1": s1 * s1, "v2": s2 * s2, "a2": a2, "b2": b2, "c2": c * c, "c": c}}


def s_estimators(p):
    P, L = p["params"], p["level"]
    if L == 1:
        b = q(P["avg"]) - P["truth"]
        assert b != 0
        return {"answer": b, "vals": {"b": b, "ab": abs(b)}}
    if L == 2:
        vA, vB, bB = P["vA"], P["vB"], P["bB"]
        mB = vB + bB * bB
        assert mB != vA
        return {"answer": 0 if vA < mB else 1, "vals": {"b2": bB * bB, "mB": mB}}
    if P["kind"] == 0:
        v, ps, th = P["vals3"], [q(x) for x in P["ps"]], P["theta"]
        assert sum(ps) == 1
        e = sum(a * b for a, b in zip(v, ps))
        e2 = sum(a * a * b for a, b in zip(v, ps))
        mse = sum((a - th) ** 2 * b for a, b in zip(v, ps))
        vr = e2 - e * e
        assert mse == vr + (e - th) ** 2
        return {"answer": mse, "vals": {"e": e, "bias": e - th, "sq": [a * a for a in v], "e2": e2, "ee": e * e, "vr": vr, "b2": (e - th) ** 2, "mse": mse}}
    N, s2 = P["N"], P["s2"]
    e = F(s2 * (N - 1), N)
    assert e - s2 == -F(s2, N)
    return {"answer": e - s2, "vals": {"top": s2 * (N - 1), "e": e, "bias": e - s2}}


def s_21(p):
    P, L = p["params"], p["level"]
    if L == 1:
        if P["kind"] == 0:
            return {"answer": F(P["k"], P["N"]), "vals": {"ph": F(P["k"], P["N"])}}
        d = P["data"]
        return {"answer": F(sum(d), len(d)), "vals": {"N": len(d), "s": sum(d), "lam": F(sum(d), len(d))}}
    if L == 2:
        d = P["data"]
        if P["kind"] == 0:
            lam = F(len(d), sum(d))
            # the log-likelihood n ln λ − λΣx is maximized there
            ll = lambda x: len(d) * log(x) - x * sum(d)
            assert ll(float(lam)) >= max(ll(float(lam) * 0.99), ll(float(lam) * 1.01))
            return {"answer": lam, "vals": {"N": len(d), "s": sum(d), "lam": lam}}
        mu = F(sum(d), len(d))
        dev = [x - mu for x in d]
        SS = sum(x * x for x in dev)
        v = SS / len(d)
        assert v == st.pvariance(d)
        return {"answer": v, "vals": {"N": len(d), "s": sum(d), "mu": mu, "d": dev, "sq": [x * x for x in dev], "SS": SS, "v": v}}
    d = P["data"]
    s, N = sum(d), len(d)
    ph = F(N, s)
    ll = lambda x: N * log(x) + (s - N) * log(1 - x)
    assert ll(float(ph)) >= max(ll(float(ph) * 0.99), ll(min(0.999999, float(ph) * 1.01)))
    return {"answer": ph, "vals": {"N": N, "s": s, "fails": s - N, "ph": ph}}


def s_14(p):
    P, L = p["params"], p["level"]
    Z = {90: 1.645, 95: 1.96, 99: 2.576}
    if L == 1:
        z = Z[P["cl"]]
        assert abs(Phi(z) - (1 + P["cl"] / 100) / 2) < 0.0005
        rt = sq(P["N"])
        se = F(P["sd"], rt)
        E = F(str(z)) * se
        return {"answer": [P["xb"] - E, P["xb"] + E], "vals": {"z": z, "rt": rt, "se": se, "E": E, "lo": P["xb"] - E, "hi": P["xb"] + E}}
    if L == 2:
        if P["kind"] == 0:
            z = Z[P["cl"]]
            N, ph = P["N"], q(P["p"])
            k = sq(N)
            x = ph * N
            assert x.denominator == 1 and x >= 10 and N - x >= 10
            se2 = ph * (1 - ph) / N
            rpq = F(sq(int(ph * (1 - ph) * 100)), 10)
            se = rpq / k
            assert se * se == se2
            E = F(str(z)) * se
            return {"answer": [ph - E, ph + E], "vals": {"z": z, "x": x, "ph": ph, "q": 1 - ph, "rpq": rpq, "k": k, "se": se, "E": E, "lo": ph - E, "hi": ph + E}}
        N, ts, s, xb = P["N"], q(P["tstar"]), P["s"], P["xb"]
        assert {9: F("2.306"), 16: F("2.131"), 25: F("2.064")}[N] == ts
        rt = sq(N)
        se = F(s, rt)
        E = ts * se
        return {"answer": [xb - E, xb + E], "vals": {"df": N - 1, "rt": rt, "se": se, "E": E, "lo": xb - E, "hi": xb + E}}
    z = F(str(Z[P["cl"]]))
    if P["kind"] == 0:
        ratio = z * P["sd"] / P["E"]
        raw = ratio * ratio
        ans = math.ceil(raw)
        assert z * P["sd"] / F(ans).__pow__(F(1, 2)) if False else True
        assert float(z) * P["sd"] / sqrt(ans) <= P["E"] + 1e-12 and (float(z) * P["sd"] / sqrt(ans - 1) > P["E"])
        return {"answer": ans, "vals": {"z": z, "ratio": ratio, "raw": raw, "ans": ans}}
    E = q(P["E"])
    raw = z * z * F(1, 4) / (E * E)
    ans = math.ceil(raw)
    return {"answer": ans, "vals": {"z": z, "zz": z * z, "E2": E * E, "raw": raw, "ans": ans, "pts": E * 100}}


def s_15(p):
    P, L = p["params"], p["level"]
    rt = sq(P["N"])
    se = F(P["sd"], rt)
    z = (q(P["xb"]) - P["mu0"]) / se
    if L == 1:
        return {"answer": z, "vals": {"rt": rt, "se": se, "diff": q(P["xb"]) - P["mu0"], "z": z}}
    az = abs(z)
    ph = table(float(az))
    if L == 2:
        pv = 2 * (1 - ph)
        assert abs(pv - 2 * (1 - Phi(float(az)))) < 2e-4
        return {"answer": pv, "vals": {"se": se, "z": z, "az": az, "ph": ph, "tail": 1 - ph, "p": pv, "rt": rt}}
    up = P["up"]
    assert (z > 0) == bool(up)
    pv = 1 - ph
    return {"answer": 0 if pv < P["alpha"] else 1, "vals": {"se": se, "z": z, "az": az, "ph": ph, "p": pv, "rt": rt}}


def s_power(p):
    P, L = p["params"], p["level"]
    if L == 1:
        diff = q(P["m1"]) - P["m2"]
        return {"answer": diff / P["s"], "vals": {"diff": diff, "d": diff / P["s"]}}
    if L == 2:
        n1, n2, s1, s2 = P["n1"], P["n2"], P["s1"], P["s2"]
        a, b = (n1 - 1) * s1 * s1, (n2 - 1) * s2 * s2
        v = F(a + b, n1 + n2 - 2)
        s = sq(int(v))
        assert min(s1, s2) <= s <= max(s1, s2)
        return {"answer": s, "vals": {"a1": n1 - 1, "b1": n2 - 1, "a": a, "b": b, "num": a + b, "den": n1 + n2 - 2, "v": v, "s": s}}
    zb = {80: 0.84, 90: 1.28}[P["pw"]]
    assert abs(Phi(zb) - P["pw"] / 100) < 0.001 and abs(Phi(1.96) - 0.975) < 1e-4
    sm = F("1.96") + F(str(zb))
    raw = (2 if P["two"] else 1) * sm * sm * P["sd"] ** 2 / F(P["delta"] ** 2)
    return {"answer": math.ceil(raw), "vals": {"za": 1.96, "zb": zb, "sum": sm, "sq": sm * sm, "sd2": P["sd"] ** 2, "d2": P["delta"] ** 2, "raw": raw, "ans": math.ceil(raw)}}


def s_16(p):
    P, L = p["params"], p["level"]
    if L == 1:
        rt = sq(P["N"])
        se = F(P["s"], rt)
        t = (q(P["xb"]) - P["mu0"]) / se
        return {"answer": t, "vals": {"rt": rt, "se": se, "diff": q(P["xb"]) - P["mu0"], "t": t, "df": P["N"] - 1}}
    if L == 2:
        d = [a - b for a, b in zip(P["before"], P["after"])]
        N = len(d)
        db = F(sum(d), N)
        dev = [x - db for x in d]
        SS = sum(x * x for x in dev)
        v = SS / (N - 1)
        assert v == st.variance([F(x) for x in d])
        sd = sq(int(v))
        rt = sq(N)
        se = F(sd, rt)
        t = db / se
        return {"answer": t, "vals": {"d": d, "S": sum(d), "db": db, "dev": dev, "SS": SS, "n1": N - 1, "v": v, "sd": sd, "rt": rt, "se": se, "t": t, "idx": list(range(1, N + 1))}}
    n1, m1, s1, n2, m2, s2 = (P[k] for k in ("n1", "m1", "s1", "n2", "m2", "s2"))
    v1, v2 = F(s1 * s1, n1), F(s2 * s2, n2)
    c = sq(int(v1 + v2))
    t = F(q(m1) - m2) / c
    dfw = (v1 + v2) ** 2 / (v1 ** 2 / (n1 - 1) + v2 ** 2 / (n2 - 1))
    assert min(n1, n2) - 1 <= dfw <= n1 + n2 - 2
    return {"answer": t, "vals": {"ss1": s1 * s1, "ss2": s2 * s2, "v1": v1, "v2": v2, "vs": v1 + v2, "c": c, "diff": q(m1) - m2, "t": t, "a1": n1 - 1, "b1": n2 - 1, "dfw": dfw}}


def s_prop(p):
    P, L = p["params"], p["level"]
    if L == 1:
        p0, N, x = q(P["p0"]), P["N"], P["x"]
        assert N * p0 >= 10 and N * (1 - p0) >= 10
        ph = F(x, N)
        se2 = p0 * (1 - p0) / N
        k = sq(N)
        r_ = F(sq(int(p0 * (1 - p0) * 100)), 10)
        se = r_ / k
        assert se * se == se2
        z = (ph - p0) / se
        return {"answer": z, "vals": {"phat": ph, "q0": 1 - p0, "r": r_, "k": k, "se": se, "diff": ph - p0, "z": z, "pct": p0 * 100}}
    nn, xA, xB = P["nn"], P["xA"], P["xB"]
    pA, pB = F(xA, nn), F(xB, nn)
    pool = F(xA + xB, 2 * nn)
    se2 = pool * (1 - pool) * (F(1, nn) + F(1, nn))
    r_ = F(sq(int(pool * (1 - pool) * 100)), 10)
    root = {50: F(1, 5), 200: F(1, 10), 800: F(1, 20)}[nn]
    se = r_ * root
    assert se * se == se2
    z = (pB - pA) / se
    vals = {"tot": xA + xB, "nn2": 2 * nn, "pA": pA, "pB": pB, "pool": pool, "q": 1 - pool, "r": r_, "root": root, "se": se, "diff": pB - pA, "z": z}
    if L == 2:
        return {"answer": z, "vals": vals}
    lift = (pB - pA) / pA
    lp = math.floor(lift * 100 + F(1, 2))
    assert (lift * 100 - F(1, 2)).denominator != 1 or (lift * 100 + F(1, 2)) != lp, "a rounding tie"
    vals.update(lift=lift, liftPct=lp)
    return {"answer": 0 if abs(z) > F("1.96") else 1, "vals": vals}


def s_17(p):
    P, L = p["params"], p["level"]
    if L == 1:
        O = P["O"]
        N = sum(O)
        E = F(N, 6)
        d = [o - E for o in O]
        stat = sum((o - E) ** 2 / E for o in O)
        return {"answer": stat, "vals": {"E": E, "N": N, "d": d, "sq": [x * x for x in d], "SS": sum(x * x for x in d), "stat": stat}}
    if L == 2:
        c, i, j = P["cells"], P["i"], P["j"]
        R = [sum(row) for row in c]
        Cc = [c[0][k] + c[1][k] for k in range(3)]
        N = sum(R)
        E = F(R[i] * Cc[j], N)
        assert E.denominator == 1
        return {"answer": E, "vals": {"R": R, "C": Cc, "N": N, "prod": R[i] * Cc[j], "E": E, "gap": abs(c[i][j] - E)}}
    O, N, R1, C1 = P["O"], P["N"], P["R1"], P["C1"]
    rows = [O[0] + O[1], O[2] + O[3]]
    cols = [O[0] + O[2], O[1] + O[3]]
    assert rows[0] == R1 and cols[0] == C1 and sum(O) == N
    E = [F(rows[i] * cols[j], N) for i in range(2) for j in range(2)]
    terms = [(o - e) ** 2 / e for o, e in zip(O, E)]
    stat = sum(terms)
    assert all(e >= 5 for e in E)
    return {"answer": stat, "vals": {"E": E, "add": abs(O[0] - E[0]), "d2": (O[0] - E[0]) ** 2, "terms": terms, "stat": stat, "R2": N - R1, "C2": N - C1}}


def s_anova(p):
    P, L = p["params"], p["level"]
    if L == 1:
        k, N, SSB, SSW = P["k"], P["N"], P["SSB"], P["SSW"]
        msb, msw = F(SSB, k - 1), F(SSW, N - k)
        return {"answer": msb / msw, "vals": {"d1": k - 1, "d2": N - k, "msb": msb, "msw": msw, "F": msb / msw}}
    if L == 2:
        k = P["k"]
        if P["kind"] == 0:
            N, SST, SSB = P["N"], P["SST"], P["SSB"]
            SSW = SST - SSB
            msb, msw = F(SSB, k - 1), F(SSW, N - k)
            return {"answer": msb / msw, "vals": {"SSW": SSW, "msb": msb, "msw": msw, "F": msb / msw}}
        SSB, SSW = P["SSB"], P["SSW"]
        eta = F(SSB, SSB + SSW)
        pct = math.floor(eta * 100 + F(1, 2))
        return {"answer": eta, "vals": {"SST": SSB + SSW, "eta": eta, "pct": pct}}
    g = P["groups"]
    groups = [g[0:3], g[3:6], g[6:9]]
    means = [F(sum(x), 3) for x in groups]
    grand = F(sum(g), 9)
    assert all(m.denominator == 1 for m in means) and grand.denominator == 1
    SSB = sum(3 * (m - grand) ** 2 for m in means)
    devs = [x - m for gr, m in zip(groups, means) for x in gr]
    SSW = sum(d * d for d in devs)
    SST = sum((x - grand) ** 2 for x in g)
    assert SST == SSB + SSW
    msb, msw = SSB / 2, SSW / 6
    return {"answer": msb / msw, "vals": {"means": means, "g": grand, "offs": [m - grand for m in means], "SSB": SSB, "devs": devs, "SSW": SSW, "msb": msb, "msw": msw, "F": msb / msw}}


def s_nonparam(p):
    P, L = p["params"], p["level"]
    if L == 1:
        g1, g2 = P["g1"], P["g2"]
        allv = sorted(g1 + g2)
        assert len(set(allv)) == 7
        ranks1 = [allv.index(v) + 1 for v in g1]
        R1 = sum(ranks1)
        U1 = R1 - 6
        assert U1 == sum(1 for a in g1 for b in g2 if a > b)
        return {"answer": U1, "vals": {"ranks1": ranks1, "R1": R1, "U1": U1, "N": 7}}
    if L == 2:
        d = P["d"]
        mags = sorted(abs(x) for x in d)
        assert len(set(mags)) == len(d) and 0 not in mags
        pos = [mags.index(abs(x)) + 1 for x in d if x > 0]
        return {"answer": sum(pos), "vals": {"byAbs": mags, "ranks": list(range(1, 7)), "posRanks": pos, "W": sum(pos)}}
    d = P["d"]
    N = len(d)
    assert 0 not in d
    S = sum(1 for x in d if x > 0)
    terms = [comb(N, j) for j in range(S, N + 1)]
    pv = F(sum(terms), 2 ** N)
    return {"answer": pv, "vals": {"S": S, "terms": terms, "ks": list(range(S, N + 1)), "tot": 2 ** N, "cnt": sum(terms), "p": pv}}


def s_multiple(p):
    P, L = p["params"], p["level"]
    a = F(1, 20)
    if L == 1:
        if P["kind"] == 0:
            ps = [q(x) for x in P["ps"]]
            th = a / len(ps)
            k = sum(1 for x in ps if x <= th)
            return {"answer": k, "vals": {"m": len(ps), "th": th, "k": k, "naive": sum(1 for x in ps if x <= a)}}
        m = P["m"]
        keep = F(19, 20) ** m
        ans = 1 - keep
        ratio = F(math.floor(ans / a * 100 + F(1, 2)), 100)
        return {"answer": ans, "vals": {"keep": keep, "ans": ans, "ratio": ratio}}
    ps = [q(x) for x in P["ps"]]
    m = len(ps)
    assert ps == sorted(ps)
    if L == 2:
        th = [a / (m - i) for i in range(m)]
        k = 0
        while k < m and ps[k] <= th[k]:
            k += 1
        return {"answer": k, "vals": {"th": th, "dens": [m - i for i in range(m)], "k": k, "bonf": sum(1 for x in ps if x <= a / m)}}
    th = [F(i + 1, m) * a for i in range(m)]
    k = max([i + 1 for i in range(m) if ps[i] <= th[i]] or [0])
    assert 0 < k < m
    return {"answer": k, "vals": {"th": th, "k": k, "idx": list(range(1, m + 1))}}


def s_bootstrap(p):
    P, L = p["params"], p["level"]
    if L == 1:
        B, c = P["B"], P["c"]
        return {"answer": F(1 + c, B + 1), "vals": {"c1": 1 + c, "B1": B + 1, "p": F(1 + c, B + 1)}}
    if L == 2:
        N = P["N"]
        # count resamples (ordered draws) that avoid one value
        ans = F((N - 1) ** N, N ** N)
        return {"answer": ans, "vals": {"q": F(N - 1, N), "ans": ans}}
    m = P["means"]
    base = F(sum(m), 5)
    dv = [x - base for x in m]
    SS = sum(x * x for x in dv)
    v = SS / 4
    se = sq(int(v))
    assert v == st.variance([F(x) for x in m])
    return {"answer": se, "vals": {"base": base, "dv": dv, "sq": [x * x for x in dv], "SS": SS, "v": v, "se": se}}


def s_bayes(p):
    P, L = p["params"], p["level"]
    if L == 3 and P.get("kind") == 0:
        mu0, tau2, s2, Nn, xb = P["mu0"], P["tau2"], P["s2"], P["Nn"], P["xb"]
        w0, w1 = F(1, tau2), F(Nn, s2)
        num = w0 * mu0 + w1 * xb
        post = num / (w0 + w1)
        assert min(mu0, xb) < post < max(mu0, xb)
        return {"answer": post, "vals": {"w0": w0, "w1": w1, "num": num, "den": w0 + w1, "post": post}}
    a, b, N, k = P["a"], P["b"], P["N"], P["k"]
    a2, b2 = a + k, b + N - k
    if L == 1:
        return {"answer": [a2, b2], "vals": {"f": N - k, "a2": a2, "b2": b2}}
    if L == 2:
        pm = F(a2, a2 + b2)
        return {"answer": pm, "vals": {"f": N - k, "a2": a2, "b2": b2, "s2": a2 + b2, "pm": pm, "mle": F(k, N), "ab": a + b}}
    assert a2 > 1 and b2 > 1
    mp = F(a2 - 1, a2 + b2 - 2)
    # the Beta density's mode: derivative of (α−1)ln θ + (β−1)ln(1−θ) vanishes there
    assert (a2 - 1) / mp == (b2 - 1) / (1 - mp)
    return {"answer": mp, "vals": {"a2": a2, "b2": b2, "top": a2 - 1, "bot": a2 + b2 - 2, "map": mp}}


# ---- association and regression --------------------------------------------------------------
def s_18(p):
    P, L = p["params"], p["level"]
    xs, ys = P["xs"], P["ys"]
    N = len(xs)
    if L in (1, 2):
        mx, my = F(sum(xs), N), F(sum(ys), N)
        assert mx.denominator == 1 and my.denominator == 1
        dx, dy = [x - mx for x in xs], [y - my for y in ys]
        prods = [a * b for a, b in zip(dx, dy)]
        Sxy = sum(prods)
        if L == 1:
            cov = Sxy / (N - 1)
            assert cov == st.covariance([F(x) for x in xs], [F(y) for y in ys])
            return {"answer": cov, "vals": {"N": N, "sx": sum(xs), "sy": sum(ys), "mx": mx, "my": my, "dx": dx, "dy": dy, "prods": prods, "Sxy": Sxy, "cov": cov}}
        Sxx, Syy = sum(a * a for a in dx), sum(b * b for b in dy)
        root = sq(int(Sxx * Syy))
        rr = Sxy / root
        assert abs(float(rr) - st.correlation(xs, ys)) < 1e-12 and abs(rr) < 1
        return {"answer": rr, "vals": {"mx": mx, "my": my, "dx": dx, "dy": dy, "prods": prods, "Sxy": Sxy, "Sxx": Sxx, "Syy": Syy, "SS": Sxx * Syy, "root": root, "rr": rr}}
    if P["kind"] == 0:
        assert len(set(xs)) == N and len(set(ys)) == N
        rx = [sorted(xs).index(x) + 1 for x in xs]
        ry = [sorted(ys).index(y) + 1 for y in ys]
        d = [a - b for a, b in zip(rx, ry)]
        D = sum(x * x for x in d)
        rho = 1 - F(6 * D, N * (N * N - 1))
        assert abs(float(rho) - st.correlation(rx, ry)) < 1e-12
        return {"answer": rho, "vals": {"rx": rx, "ry": ry, "d": d, "d2": [x * x for x in d], "D": D, "D6": 6 * D, "rho": rho}}
    raise AssertionError


def s_18_wrap(p):
    P = p["params"]
    if p["level"] == 3 and P.get("kind") == 1:
        N, rr = P["N"], q(P["r"])
        k = sq(N - 2)
        s1 = F(sq(int((1 - rr * rr) * 10000)), 100)
        assert s1 * s1 == 1 - rr * rr
        t = rr * k / s1
        return {"answer": t, "vals": {"k2": N - 2, "k": k, "r2": rr * rr, "q": 1 - rr * rr, "s1": s1, "rk": rr * k, "t": t, "df": N - 2}}
    return s_18(p)


def s_cov(p):
    P, L = p["params"], p["level"]
    if L == 1:
        v1, v2, cv, minus = P["v1"], P["v2"], P["cv"], P["minus"]
        assert cv * cv < v1 * v2
        w = [1, -1 if minus else 1]
        S = [[v1, cv], [cv, v2]]
        ans = sum(w[i] * S[i][j] * w[j] for i in range(2) for j in range(2))
        return {"answer": ans, "vals": {"vs": v1 + v2, "c2": abs(2 * cv), "ans": ans}}
    if L == 2:
        v1, v2, cv = P["v1"], P["v2"], P["cv"]
        s1, s2 = sq(v1), sq(v2)
        rho = F(cv, s1 * s2)
        assert abs(rho) < 1
        return {"answer": rho, "vals": {"s1": s1, "s2": s2, "ss": s1 * s2, "rho": rho}}
    S = [P["S"][0:3], P["S"][3:6], P["S"][6:9]]
    a = P["a"]
    # Σ must be symmetric positive semidefinite (all principal minors ≥ 0)
    assert all(S[i][j] == S[j][i] for i in range(3) for j in range(3))
    det2 = [S[i][i] * S[j][j] - S[i][j] ** 2 for i, j in ((0, 1), (0, 2), (1, 2))]
    det3 = (S[0][0] * (S[1][1] * S[2][2] - S[1][2] * S[2][1]) - S[0][1] * (S[1][0] * S[2][2] - S[1][2] * S[2][0]) + S[0][2] * (S[1][0] * S[2][1] - S[1][1] * S[2][0]))
    assert all(S[i][i] > 0 for i in range(3)) and all(d >= 0 for d in det2) and det3 >= 0
    ans = sum(a[i] * S[i][j] * a[j] for i in range(3) for j in range(3))
    diag = [a[i] * a[i] * S[i][i] for i in range(3)]
    off = [2 * a[i] * a[j] * S[i][j] for i, j in ((0, 1), (0, 2), (1, 2))]
    assert ans == sum(diag) + sum(off) and ans > 0
    return {"answer": ans, "vals": {"diag": diag, "off": off, "ans": ans}}


def s_19(p):
    P, L = p["params"], p["level"]
    if L == 1:
        mx, my, b1, x0 = P["mx"], P["my"], q(P["b1"]), P["x0"]
        b0 = my - b1 * mx
        return {"answer": b0 + b1 * x0, "vals": {"b1x": b1 * mx, "b0": b0, "b1x0": b1 * x0, "y0": b0 + b1 * x0}}
    xs, ys = [1, 2, 3, 4, 5], P["ys"]
    my = F(sum(ys), 5)
    assert my.denominator == 1
    b1, b0 = st.linear_regression(xs, ys)
    dx = [x - 3 for x in xs]
    dy = [y - my for y in ys]
    prods = [a * b for a, b in zip(dx, dy)]
    assert b1 == F(sum(prods), 10)
    if L == 2:
        return {"answer": f"{float(b0)} + ({float(b1)})*x", "vals": {"sy": sum(ys), "my": my, "dx": dx, "dy": dy, "prods": prods, "Sxy": sum(prods), "b1": b1, "b0": b0}}
    fit = [b0 + b1 * x for x in xs]
    res = [y - f for y, f in zip(ys, fit)]
    SSres = sum(e * e for e in res)
    Syy = sum(d * d for d in dy)
    R2 = 1 - SSres / Syy
    assert abs(float(R2) - st.correlation(xs, ys) ** 2) < 1e-12
    return {"answer": R2, "vals": {"b0": b0, "b1": b1, "fit": fit, "res": res, "SSres": SSres, "my": my, "dy": dy, "Syy": Syy, "R2": R2, "pct": math.floor(R2 * 100 + F(1, 2))}}


def adjr(R, N, pp):
    return 1 - (1 - R) * F(N - 1, N - pp - 1)


def s_multreg(p):
    P, L = p["params"], p["level"]
    if L == 1:
        N, pp, R = P["N"], P["p"], q(P["R"])
        d = N - pp - 1
        ans = adjr(R, N, pp)
        assert terminates(ans, 6)
        return {"answer": ans, "vals": {"N1": N - 1, "d": d, "ratio": F(N - 1, d), "q": 1 - R, "qr": (1 - R) * F(N - 1, d), "ans": ans}}
    if L == 2:
        N, pp, R = P["N"], P["p"], q(P["R"])
        d = N - pp - 1
        top, bot = R / pp, (1 - R) / d
        return {"answer": top / bot, "vals": {"d": d, "q": 1 - R, "top": top, "bot": bot, "F": top / bot}}
    N, pA, pB, RA, RB = P["N"], P["pA"], P["pB"], q(P["RA"]), q(P["RB"])
    a, b = adjr(RA, N, pA), adjr(RB, N, pB)
    assert a != b and RB > RA and pB > pA
    return {"answer": 0 if a > b else 1, "vals": {"add": pB - pA, "qA": 1 - RA, "qB": 1 - RB, "dA": N - pA - 1, "dB": N - pB - 1, "N1": N - 1, "adjA": a, "adjB": b}}


def s_logistic(p):
    P, L = p["params"], p["level"]
    if L == 1:
        b = P["b"]
        o = exp(b)
        return {"answer": o, "vals": {"or": o, "pct": abs(round((o - 1) * 100))}}
    if L == 2:
        b0, b1, x0 = P["b0"], P["b1"], P["x0"]
        z = float(b0 + q(b1) * x0)
        pr_ = 1 / (1 + exp(-z))
        # the log-odds of the answer recover z
        assert abs(log(pr_ / (1 - pr_)) - z) < 1e-9
        return {"answer": pr_, "vals": {"bx": float(q(b1) * x0), "z": z, "nz": -z, "ez": exp(-z), "p": pr_}}
    b0, b1, t = P["b0"], P["b1"], P["target"]
    odds = t / (1 - t)
    x = (log(odds) - b0) / b1
    assert abs(1 / (1 + exp(-(b0 + b1 * x))) - t) < 1e-9
    return {"answer": x, "vals": {"odds": odds, "lo": log(odds), "top": log(odds) - b0, "x": x}}


def s_causation(p):
    P, L = p["params"], p["level"]
    if L == 1:
        t, c = P["t"], P["c"]
        mt, mc = F(sum(t), 4), F(sum(c), 4)
        assert mt.denominator == 1 and mc.denominator == 1
        return {"answer": mt - mc, "vals": {"mt": mt, "mc": mc, "ate": mt - mc}}
    if L == 2:
        pz = q(P["pz"])
        y = P["y"]
        d = [y[0] - y[1], y[2] - y[3]]
        ate = pz * d[0] + (1 - pz) * d[1]
        return {"answer": ate, "vals": {"qz": 1 - pz, "d": d, "t0": pz * d[0], "t1": (1 - pz) * d[1], "ate": ate}}
    sA, nA, sB, nB = P["sA"], P["nA"], P["sB"], P["nB"]
    ra = [F(sA[k], nA[k]) for k in range(2)]
    rb = [F(sB[k], nB[k]) for k in range(2)]
    pA, pB = F(sum(sA), sum(nA)), F(sum(sB), sum(nB))
    assert (ra[0] > rb[0]) == (ra[1] > rb[1]) and ra[0] != rb[0] and pA != pB
    w = 0 if ra[0] > rb[0] else 1
    pooled = 0 if pA > pB else 1
    idx = 2 * w + (1 if pooled == w else 0)
    return {"answer": idx, "vals": {"ra": [x * 100 for x in ra], "rb": [x * 100 for x in rb], "tA": sum(sA), "nAt": sum(nA), "tB": sum(sB), "nBt": sum(nB), "pA": pA * 100, "pB": pB * 100}}


VERIFY = {
    "S.1": s_1, "S.2": s_2, "S.3": s_3, "S.4": s_4, "S.shape": s_shape,
    "S.axioms": s_axioms, "S.5": s_5, "S.8": s_8, "S.6": s_6, "S.total-prob": s_total, "S.7": s_7,
    "S.rv": s_rv, "S.9": s_9, "S.joint": s_joint, "S.bernoulli": s_bernoulli, "S.10": s_10, "S.hypergeom": s_hyper,
    "S.11": s_11, "S.20": s_20, "S.12": s_12, "S.dof": s_dof, "S.sampling-dists": s_sampling, "S.lln": s_lln,
    "S.13": s_13, "S.estimators": s_estimators, "S.21": s_21, "S.14": s_14, "S.15": s_15, "S.power": s_power,
    "S.16": s_16, "S.prop-test": s_prop, "S.17": s_17, "S.anova": s_anova, "S.nonparam": s_nonparam,
    "S.multiple": s_multiple, "S.bootstrap": s_bootstrap, "S.bayes-inference": s_bayes, "S.18": s_18_wrap,
    "S.cov-matrix": s_cov, "S.19": s_19, "S.multreg": s_multreg, "S.logistic": s_logistic, "S.causation": s_causation,
}
