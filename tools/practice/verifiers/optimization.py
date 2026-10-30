"""Independent answers for practice/optimization.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]), and asserts what the problem
promises (an LP optimum really is optimal and unique, a descent step really decreases f, a KKT point
satisfies every condition, ...). Exact fractions, brute-force enumeration and SymPy; nothing here is
copied from the JavaScript."""
import heapq
import math
from fractions import Fraction as F
from itertools import combinations, permutations, product

import sympy as sp

X, Y = sp.symbols("x y", real=True)


def fr(q):  # a Fraction as the {n, d} the generator reports
    q = F(q)
    return {"n": q.numerator, "d": q.denominator}


def to_f(v):
    if isinstance(v, dict):
        return F(v["n"], v["d"])
    if isinstance(v, float):
        return F(v).limit_denominator(10 ** 9)
    return F(v)


def S(v):  # a SymPy rational from an int / float / {n, d}
    q = to_f(v)
    return sp.Rational(q.numerator, q.denominator)


def frs(v):  # a SymPy rational as a Fraction
    v = sp.sympify(v)
    assert v.is_Rational, v
    return F(int(v.p), int(v.q))


def corners(cons):
    """Every vertex of {x, y >= 0, a x + b y (<= or >=) c}: intersections of two boundary lines that satisfy all constraints."""
    allc = list(cons) + [(1, 0, 0, "ge"), (0, 1, 0, "ge")]

    def ok(px, py):
        return all((a * px + b * py <= c) if s == "le" else (a * px + b * py >= c) for a, b, c, s in allc)

    pts = []
    for (a1, b1, c1, _), (a2, b2, c2, _) in combinations(allc, 2):
        M_ = sp.Matrix([[S(a1), S(b1)], [S(a2), S(b2)]])
        if M_.det() == 0:
            continue
        sol = M_.LUsolve(sp.Matrix([S(c1), S(c2)]))
        px, py = frs(sol[0]), frs(sol[1])
        if ok(px, py) and (px, py) not in pts:
            pts.append((px, py))
    return pts


def lp_opt(cons, cx, cy, sense="max"):
    """The unique optimal corner and value (asserting uniqueness and, for min, positive costs)."""
    pts = corners(cons)
    vals = [cx * a + cy * b for a, b in pts]
    best = max(vals) if sense == "max" else min(vals)
    if sense == "min":
        assert cx > 0 and cy > 0, "a minimization over an unbounded region needs positive costs"
    else:
        # bounded: every corner of a max problem lies in a box, since all constraints have positive coefficients
        assert all(a > 0 and b > 0 for a, b, c, s in cons if s == "le")
    at = [pt for pt, v in zip(pts, vals) if v == best]
    assert len(at) == 1, "the optimum is not unique"
    return at[0], best, pts


# ---- O.1 ------------------------------------------------------------------------------------------
def o_1(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        l1 = q["a1"] * q["x0"] + q["b1"] * q["y0"]
        l2 = q["a2"] * q["x0"] + q["b2"] * q["y0"]
        idx = (1 if l1 > q["c1"] else 0) + (2 if l2 > q["c2"] else 0)
        return {"answer": idx, "vals": {"l1": l1, "l2": l2, "o1": l1 - q["c1"], "o2": l2 - q["c2"]}}
    if lv == 2:
        L1 = [q["a1"] * a + q["b1"] * b for a, b in q["plans"]]
        L2 = [q["a2"] * a + q["b2"] * b for a, b in q["plans"]]
        prof = [q["px"] * a + q["py"] * b for a, b in q["plans"]]
        feas = [L1[i] <= q["c1"] and L2[i] <= q["c2"] for i in range(4)]
        best = max(prof[i] for i in range(4) if feas[i])
        win = [i for i in range(4) if feas[i] and prof[i] == best]
        assert len(win) == 1
        assert any(not feas[i] and prof[i] > best for i in range(4)), "no tempting infeasible plan"
        assert len(set(map(tuple, q["plans"]))) == 4
        return {"answer": win[0], "vals": {"L1": L1, "L2": L2, "prof": prof, "best": best}}
    pp, c, lo, hi = q["p"], q["c"], q["lo"], q["hi"]
    f = X ** 3 - 3 * pp ** 2 * X + c
    crit = sorted(int(t) for t in sp.solve(sp.diff(f, X), X))
    cands = sorted({lo, hi} | {t for t in crit if lo < t < hi})
    vals = [int(f.subs(X, t)) for t in cands]
    best = min(vals)
    assert vals.count(best) == 1, "tie for the global minimum"
    at = cands[vals.index(best)]
    assert sp.diff(f, X, 2).subs(X, pp) > 0
    return {"answer": best, "vals": {"p3": 3 * pp * pp, "pp": pp * pp, "fv": vals, "best": best, "at": at}}


# ---- O.8 ------------------------------------------------------------------------------------------
def o_8(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        k, a, b = q["k"], q["a"], q["b"]
        f = lambda t: k * t * t  # noqa: E731
        m = F(a + b, 2)
        assert m.denominator == 1
        lam = sp.Rational(1, 2)
        chord = lam * f(a) + (1 - lam) * f(b)
        gap = chord - f(m)
        assert gap > 0
        return {"answer": int(gap), "vals": {"m": int(m), "fm": int(f(m)), "fa": f(a), "fb": f(b), "chord": int(chord), "gap": int(gap)}}
    if lv == 2:
        A, C = q["A"], q["C"]
        k = sp.symbols("k", real=True)
        Hm = sp.hessian(A * X ** 2 + k * X * Y + C * Y ** 2, (X, Y))
        kmax = max(sp.solve(Hm.det(), k))
        assert kmax.is_integer
        assert all(ev >= 0 for ev in Hm.subs(k, kmax).eigenvals())
        assert any(ev < 0 for ev in Hm.subs(k, kmax + sp.Rational(1, 100)).eigenvals())
        return {"answer": int(kmax), "vals": {"H11": 2 * A, "H22": 2 * C, "prod": 4 * A * C, "kmax": int(kmax)}}
    A, B, C = q["A"], q["B"], q["C"]
    Hm = sp.hessian(A * X ** 2 + B * X * Y + C * Y ** 2, (X, Y))
    evs = sorted(int(e) for e in Hm.eigenvals())
    lo, hi = evs[0], evs[-1]
    return {"answer": lo, "vals": {"H11": int(Hm[0, 0]), "H22": int(Hm[1, 1]), "tr": int(Hm.trace()), "det": int(Hm.det()), "h2": hi - lo, "hi": hi, "lo": lo}}


# ---- O.2 / O.3 linear programs ---------------------------------------------------------------------
def lp_from(q, sense):
    cons = [(q["a1"], q["b1"], q["c1"], sense), (q["a2"], q["b2"], q["c2"], sense)]
    return cons


def lp_vals(q, sense):
    """The generator's corner order: le: origin, x-axis corner, P, y-axis corner; ge: y-axis corner, P, x-axis corner."""
    cons = lp_from(q, sense)
    X1, Y1, X2, Y2 = F(q["c1"], q["a1"]), F(q["c1"], q["b1"]), F(q["c2"], q["a2"]), F(q["c2"], q["b2"])
    for v in (X1, Y1, X2, Y2):
        assert v.denominator == 1
    sol = sp.solve([q["a1"] * X + q["b1"] * Y - q["c1"], q["a2"] * X + q["b2"] * Y - q["c2"]], [X, Y])
    P = (frs(sol[X]), frs(sol[Y]))
    assert P[0] > 0 and P[1] > 0 and P[0].denominator == 1 and P[1].denominator == 1
    if sense == "le":
        order = [(F(0), F(0)), (min(X1, X2), F(0)), P, (F(0), min(Y1, Y2))]
    else:
        order = [(F(0), max(Y1, Y2)), P, (max(X1, X2), F(0))]
    opt, best, pts = lp_opt(cons, q["cx"], q["cy"], "max" if sense == "le" else "min")
    assert set(order) == set(pts), "the listed corners are not the region's corners"
    z = [q["cx"] * a + q["cy"] * b for a, b in order]
    D = q["a1"] * q["b2"] - q["a2"] * q["b1"]
    return {"X1": X1, "Y1": Y1, "X2": X2, "Y2": Y2, "D": D, "px": P[0], "py": P[1], "z": z, "best": best}, opt


def o_2(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        cons = lp_from(q, "le")
        opt, best, pts = lp_opt(cons, q["cx"], q["cy"])
        listed = [tuple(F(v) for v in c) for c in q["corners"]]
        assert set(listed) == set(pts) and len(listed) == len(pts)
        return {"answer": best, "vals": {"z": [q["cx"] * a + q["cy"] * b for a, b in listed], "best": best}}
    sense = "le" if lv == 2 or q["sense"] == 1 else "ge"
    vals, opt = lp_vals(q, sense)
    return {"answer": [opt[0], opt[1]] if lv == 2 else vals["best"], "vals": vals}


def o_3(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        c, rows = q["c"], q["rows"]
        assert c[0] != c[1]
        j = 0 if c[0] > c[1] else 1
        ratios = [F(b, row[j]) for row in rows for b in [row[2]] if row[j] > 0]
        mn = min(ratios)
        assert ratios.count(mn) == 1
        leave = [i for i, row in enumerate(rows) if row[j] > 0 and F(row[2], row[j]) == mn][0]
        # the new vertex: x_j = mn, the other 0; feasible, and tight exactly on the leaving row
        pt = [F(0), F(0)]
        pt[j] = mn
        assert all(row[0] * pt[0] + row[1] * pt[1] <= row[2] for row in rows)
        assert rows[leave][0] * pt[0] + rows[leave][1] * pt[1] == rows[leave][2]
        return {"answer": mn, "vals": {"ratios": ratios, "mn": mn, "leave": leave + 1, "z1": c[j] * mn}}
    cons = lp_from(q, "le")
    opt, best, _ = lp_opt(cons, q["cx"], q["cy"])
    if lv == 2:
        y1, y2 = q["y1"], q["y2"]
        g1, g2 = q["a1"] * y1 + q["a2"] * y2, q["b1"] * y1 + q["b2"] * y2
        assert g1 >= q["cx"] and g2 >= q["cy"] and y1 >= 0 and y2 >= 0
        bound = q["c1"] * y1 + q["c2"] * y2
        assert bound > best, "weak duality (strict here)"
        return {"answer": bound, "vals": {"g1": g1, "g2": g2, "bound": bound, "best": best, "opt": [opt[0], opt[1]]}}
    vals, opt = lp_vals(q, "le")
    assert opt == (vals["px"], vals["py"])
    u1, u2 = sp.symbols("u1 u2")
    sol = sp.solve([q["a1"] * u1 + q["a2"] * u2 - q["cx"], q["b1"] * u1 + q["b2"] * u2 - q["cy"]], [u1, u2])
    yv = [frs(sol[u1]), frs(sol[u2])]
    assert all(v > 0 for v in yv)
    assert q["c1"] * yv[0] + q["c2"] * yv[1] == vals["best"], "strong duality"
    # the shadow price really is the rate of change of the optimum
    eps = F(1, 1000)
    cs = [q["c1"], q["c2"]]
    cs[q["k"]] += eps
    cons2 = [(q["a1"], q["b1"], cs[0], "le"), (q["a2"], q["b2"], cs[1], "le")]
    _, best2, _ = lp_opt(cons2, q["cx"], q["cy"])
    assert (best2 - vals["best"]) / eps == yv[q["k"]]
    vals.update({"D": q["a1"] * q["b2"] - q["b1"] * q["a2"], "y1": yv[0], "y2": yv[1]})
    return {"answer": yv[q["k"]], "vals": vals}


# ---- O.qp ---------------------------------------------------------------------------------------------
def o_qp(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, c, d, e = q["a"], q["c"], q["d"], q["e"]
        f = a * X ** 2 + c * Y ** 2 + d * X + e * Y
        sol = sp.solve([sp.diff(f, X), sp.diff(f, Y)], [X, Y])
        Hm = sp.hessian(f, (X, Y))
        assert Hm.is_positive_definite
        h, k = int(sol[X]), int(sol[Y])
        return {"answer": [h, k], "vals": {"q1": int(Hm[0, 0]), "q2": int(Hm[1, 1]), "h": h, "k": k}}
    if lv == 2:
        a, c, al, be, de = q["a"], q["c"], q["al"], q["be"], q["de"]
        lam = sp.symbols("lam")
        f = a * X ** 2 + c * Y ** 2
        Lg = f - lam * (al * X + be * Y - de)
        sol = sp.solve([sp.diff(Lg, X), sp.diff(Lg, Y), al * X + be * Y - de], [X, Y, lam], dict=True)[0]
        # independent check: eliminate y and minimize in one variable
        f1 = f.subs(Y, (de - al * X) / be)
        x1 = sp.solve(sp.diff(f1, X), X)[0]
        assert x1 == sol[X] and sp.diff(f1, X, 2) > 0
        kx = F(al * al, 2 * a) + F(be * be, 2 * c)
        return {"answer": [frs(sol[X]), frs(sol[Y])], "vals": {"a2": 2 * a, "c2": 2 * c, "cx": F(al, 2 * a), "cy": F(be, 2 * c), "kx": kx, "lam": frs(sol[lam]),
                                                               "xs": frs(sol[X]), "ys": frs(sol[Y])}}
    a, b, pp, qq, s = q["a"], q["b"], q["p"], q["q"], q["s"]
    assert a * pp + b * qq > s, "the unconstrained minimum must be infeasible"
    mu = sp.symbols("mu")
    f = (X - pp) ** 2 + (Y - qq) ** 2
    sol = sp.solve([sp.diff(f, X) + mu * a, sp.diff(f, Y) + mu * b, a * X + b * Y - s], [X, Y, mu], dict=True)[0]
    xs, ys, m = frs(sol[X]), frs(sol[Y]), frs(sol[mu])
    assert m > 0 and xs > 0 and ys > 0  # KKT with the sign constraints inactive: the global optimum of a convex QP, inside an edge
    return {"answer": [xs, ys], "vals": {"lhs": a * pp + b * qq, "g": a * pp + b * qq - s, "nn": a * a + b * b, "half": F(a * a + b * b, 2), "ha": F(a, 2), "hb": F(b, 2), "mu": m, "mh": m / 2, "xs": xs, "ys": ys}}


# ---- O.4 -------------------------------------------------------------------------------------------------
def o_4(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        I, B = to_f(q["I"]), to_f(q["B"])
        ratio = (B - I) / I
        return {"answer": ratio * 100, "vals": {"diff": B - I, "ratio": ratio, "g": ratio * 100}}
    if lv == 2:
        a1, b1, c1, a2, b2, c2, cx, cy = (q[k] for k in ("a1", "b1", "c1", "a2", "b2", "c2", "cx", "cy"))
        cons = [(a1, b1, c1, "le"), (a2, b2, c2, "le")]
        cs = sorted(corners(cons))
        zc = [cx * u + cy * v for u, v in cs]
        zb = max(zc)
        assert zc.count(zb) == 1
        opt = cs[zc.index(zb)]
        assert opt[0].denominator > 1 or opt[1].denominator > 1, "the LP optimum should be fractional"
        xmax = min(c1 // a1, c2 // a2)
        lim1 = [F(c1 - a1 * t, b1) for t in range(xmax + 1)]
        lim2 = [F(c2 - a2 * t, b2) for t in range(xmax + 1)]
        yb = [math.floor(min(lim1[t], lim2[t])) for t in range(xmax + 1)]
        zi = [cx * t + cy * yb[t] for t in range(xmax + 1)]
        brute = max(cx * u + cy * v for u in range(40) for v in range(40) if a1 * u + b1 * v <= c1 and a2 * u + b2 * v <= c2)
        assert brute == max(zi) and brute < zb
        return {"answer": brute, "vals": {"xs": list(range(xmax + 1)), "cs": [list(c) for c in cs], "zc": zc, "zb": zb, "lim1": lim1, "lim2": lim2, "yb": yb, "zi": zi, "best": brute, "at": zi.index(brute)}}
    pr, t, H, u, Fc = q["p"], q["t"], q["H"], q["u"], q["Fc"]
    # the mixed-integer optimum by brute force: pay a setup exactly when a product is made
    brute = max(pr[0] * a + pr[1] * b - Fc[0] * (a > 0) - Fc[1] * (b > 0)
                for a in range(u[0] + 1) for b in range(u[1] + 1) if t[0] * a + t[1] * b <= H)
    single = [min(u[i], H // t[i]) for i in range(2)]
    sv = [pr[i] * single[i] - Fc[i] for i in range(2)]
    f = 0 if F(pr[0], t[0]) > F(pr[1], t[1]) else 1
    s2 = 1 - f
    xf = min(u[f], H // t[f])
    rem = H - t[f] * xf
    xs2 = min(u[s2], rem // t[s2])
    both = max(pr[0] * a + pr[1] * b for a in range(1, u[0] + 1) for b in range(1, u[1] + 1) if t[0] * a + t[1] * b <= H)
    assert both == pr[f] * xf + pr[s2] * xs2, "greedy fill is optimal in the both-products case"
    bv = both - Fc[0] - Fc[1]
    cand = [0, sv[0], sv[1], bv]
    assert max(cand) == brute and cand.count(brute) == 1
    return {"answer": brute, "vals": {"single": single, "sv": sv, "xf": xf, "rem": rem, "xs2": xs2, "bv": bv, "best": brute}}


# ---- O.5 -------------------------------------------------------------------------------------------------
def subsets(k):
    for m in range(1, k + 1):
        yield from combinations(range(k), m)


def o_5(p):
    q, lv = p["params"], p["level"]
    w, v, W = q["w"], q["v"], q["W"]
    if lv == 1:
        subs = list(subsets(3))
        sw = [sum(w[i] for i in s) for s in subs]
        sv = [sum(v[i] for i in s) for s in subs]
        best = max(sv[k] for k in range(len(subs)) if sw[k] <= W)
        assert sum(1 for k in range(len(subs)) if sw[k] <= W and sv[k] == best) == 1
        return {"answer": best, "vals": {"sw": sw, "sv": sv, "best": best}}
    if lv == 2:
        rate = [F(v[i], w[i]) for i in range(len(w))]
        assert all(r_.denominator == 1 for r_ in rate) and len(set(rate)) == len(rate)
        order = sorted(range(len(w)), key=lambda i: -rate[i])
        room, take, parts = W, [], []
        for i in order:
            a = min(room, w[i])
            take.append(a)
            parts.append(a * rate[i])
            room -= a
        total = sum(parts)
        best01 = max(sum(v[i] for i in s) for s in subsets(len(w)) if sum(w[i] for i in s) <= W)
        assert room == 0 and total >= best01
        return {"answer": total, "vals": {"rate": rate, "take": take, "total": total, "parts": parts}}
    k = len(w)
    T = [[max([sum(v[j] for j in s) for s in subsets(i) if sum(w[j] for j in s) <= c] + [0]) for c in range(W + 1)] for i in range(k + 1)]
    taken, c = [], W
    for i in range(k, 0, -1):
        if T[i][c] != T[i - 1][c]:
            taken.insert(0, i)
            c -= w[i - 1]
    assert sum(w[i - 1] for i in taken) <= W and sum(v[i - 1] for i in taken) == T[k][W]
    wl = w[k - 1]
    return {"answer": T[k][W], "vals": {"T": T[1:], "ans": T[k][W], "wl": W - wl, "prev": T[k - 1][W], "prevW": T[k - 1][W - wl] if wl <= W else 0, "taken": taken}}


# ---- O.6 -------------------------------------------------------------------------------------------------
def o_6(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        k = q["k"]
        # count directly: Hamiltonian cycles on k labelled cities, up to rotation and reflection
        if k <= 7:
            seen = set()
            for perm in permutations(range(1, k)):
                cyc = (0,) + perm
                rev = (0,) + tuple(reversed(perm))
                seen.add(min(cyc, rev))
            assert len(seen) == math.factorial(k - 1) // 2
        return {"answer": math.factorial(k - 1) // 2, "vals": {"km1": k - 1, "fact": math.factorial(k - 1), "tours": math.factorial(k - 1) // 2}}
    dist = q["dist"]
    k = len(dist)
    assert all(dist[i][j] == dist[j][i] and dist[i][j] > 0 for i in range(k) for j in range(k) if i != j)
    if lv == 2:
        tour, legs, dss = [0], [], []
        while len(tour) < k:
            u = tour[-1]
            rest = [i for i in range(k) if i not in tour]
            ds = [dist[u][i] for i in rest]
            m = min(ds)
            assert ds.count(m) == 1
            dss.append(ds)
            legs.append(m)
            tour.append(rest[ds.index(m)])
        legs.append(dist[tour[-1]][0])
        return {"answer": sum(legs), "vals": {"legs": legs, "total": sum(legs), "ds": dss}}
    t = list(range(k))
    length = lambda tt: sum(dist[tt[i]][tt[(i + 1) % k]] for i in range(k))  # noqa: E731
    L0 = length(t)
    deltas, news = [], []
    for i, j in [(0, 2), (0, 3), (1, 3), (1, 4), (2, 4)]:
        nt = t[: i + 1] + list(reversed(t[i + 1: j + 1])) + t[j + 1:]
        news.append(length(nt))
        deltas.append(length(nt) - L0)
    best = min(news)
    assert news.count(best) == 1 and best < L0
    return {"answer": best, "vals": {"len": L0, "deltas": deltas, "newLen": best}}


# ---- O.7 -------------------------------------------------------------------------------------------------
NODES = ["s", "a", "b", "c", "e", "t"]
EDGES = [("s", "a"), ("s", "b"), ("a", "b"), ("a", "c"), ("a", "e"), ("b", "e"), ("c", "e"), ("c", "t"), ("e", "t")]


def maxflow(cap, s, t):
    """Edmonds–Karp on a dict {(u, v): capacity}."""
    res = {}
    for (u, v), c in cap.items():
        res[(u, v)] = res.get((u, v), 0) + c
        res.setdefault((v, u), 0)
    flow = 0
    while True:
        prev, queue = {s: None}, [s]
        while queue:
            u = queue.pop(0)
            for (a, b), c in res.items():
                if a == u and c > 0 and b not in prev:
                    prev[b] = u
                    queue.append(b)
        if t not in prev:
            return flow
        path, v = [], t
        while prev[v] is not None:
            path.append((prev[v], v))
            v = prev[v]
        aug = min(res[e] for e in path)
        for a, b in path:
            res[(a, b)] -= aug
            res[(b, a)] += aug
        flow += aug


def o_7(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        tot = [a + b for a, b in zip(q["du"], q["w"])]
        assert tot.count(min(tot)) == 1
        return {"answer": min(tot), "vals": {"tot": tot, "m": min(tot)}}
    if lv == 2:
        w = q["w"]
        INF = 10 ** 9
        dist = {u: {v: (0 if u == v else INF) for v in NODES} for u in NODES}
        for (u, v), wt in zip(EDGES, w):
            dist[u][v] = dist[v][u] = min(dist[u][v], wt)
        for k_ in NODES:  # Floyd–Warshall
            for i in NODES:
                for j in NODES:
                    dist[i][j] = min(dist[i][j], dist[i][k_] + dist[k_][j])
        # Dijkstra stops once t is settled: the nodes it has reached by then are those adjacent to a settled node
        T_ = dist["s"]["t"]
        settled = [v for v in NODES if dist["s"][v] <= T_]
        assert len(set(dist["s"][v] for v in settled)) == len(settled)  # no ties in the settle order
        ds = sorted(dist["s"][v] for v in settled)
        # the shortest s-t path is unique: count simple paths of minimum length
        adj = {u: [] for u in NODES}
        for (u, v), wt in zip(EDGES, w):
            adj[u].append((v, wt))
            adj[v].append((u, wt))
        best, cnt = [INF], [0]

        def walk(u, seen, L):
            if u == "t":
                if L < best[0]:
                    best[0], cnt[0] = L, 1
                elif L == best[0]:
                    cnt[0] += 1
                return
            for v, wt in adj[u]:
                if v not in seen:
                    walk(v, seen | {v}, L + wt)
        walk("s", {"s"}, 0)
        assert best[0] == dist["s"]["t"] and cnt[0] == 1
        # the candidate distances Dijkstra computes, in settle order (settle order = increasing distance)
        order = sorted(settled, key=lambda v: dist["s"][v])
        cands = []
        for i, u in enumerate(order[:-1]):
            cands.append([dist["s"][u] + wt for v, wt in adj[u] if v not in order[: i + 1]])
        cands.append([])
        return {"answer": dist["s"]["t"], "vals": {"dist": ds, "cands": cands}}
    cap = {("s", "a"): q["sa"], ("s", "b"): q["sb"], ("a", "b"): q["ab"], ("a", "t"): q["at"], ("b", "t"): q["bt"]}
    mf = maxflow(cap, "s", "t")
    cuts = []
    for S_ in (["s"], ["s", "a"], ["s", "b"], ["s", "a", "b"]):
        cuts.append(sum(c for (u, v), c in cap.items() if u in S_ and v not in S_))
    assert min(cuts) == mf
    f1 = min(q["sa"], q["at"])
    f2 = min(q["sb"], q["bt"])
    f3 = min(q["sa"] - f1, q["ab"], q["bt"] - f2)
    assert f1 + f2 + f3 == mf and f3 > 0
    return {"answer": mf, "vals": {"cuts": cuts, "mc": mf, "f1": f1, "f2": f2, "f3": f3}}


# ---- O.17 ------------------------------------------------------------------------------------------------
def o_17(p):
    q, lv = p["params"], p["level"]
    nn = sp.symbols("n", positive=True)
    if lv == 1:
        terms = [sp.Integer(1), sp.log(nn), nn, nn * sp.log(nn), nn ** 2, nn ** 3, 2 ** nn]
        T = sum(c * terms[k] for k, c in zip(q["kinds"], q["co"]))
        # the class g with T/g tending to a positive constant
        hits = [i for i, g in enumerate(terms) if (lambda L: L.is_positive and L.is_finite)(sp.limit(T / g, nn, sp.oo))]
        assert len(hits) == 1
        return {"answer": hits[0], "vals": {"top": hits[0]}}
    if lv == 2:
        if "k" in q:
            k, m, t0, n0 = q["k"], q["m"], q["t0"], q["n0"]
            T = sp.Rational(t0) * ((m * nn) ** k / nn ** k)
            return {"answer": int(T), "vals": {"m": m, "factor": m ** k, "T": int(T), "m2": m * n0}}
        t0, n0, dn = q["t0"], q["n0"], q["dn"]
        T = t0 * sp.Integer(2) ** (n0 + dn) / sp.Integer(2) ** n0
        return {"answer": int(T), "vals": {"dn": dn, "factor": 2 ** dn, "T": int(T), "n1": n0 + dn}}
    a, b, c, C = q["a"], q["b"], q["c"], q["C"]
    g = (C - a) * nn ** 2 - b * nn - c
    root = max(sp.solve(g, nn))
    n0 = int(sp.ceiling(root))
    f = lambda t: a * t * t + b * t + c  # noqa: E731
    assert f(n0) <= C * n0 * n0 and f(n0 - 1) > C * (n0 - 1) ** 2
    assert all(f(t) <= C * t * t for t in range(n0, 200))
    gg = lambda t: (C - a) * t * t - b * t - c  # noqa: E731
    return {"answer": n0, "vals": {"dl": C - a, "vert": F(b, 2 * (C - a)), "n0": n0, "nm1": n0 - 1, "gm": gg(n0 - 1), "g0": gg(n0)}}


# ---- O.gradient-descent ----------------------------------------------------------------------------------
def quad_eigs(A, B, C):
    Hm = sp.hessian(A * X ** 2 + B * X * Y + C * Y ** 2, (X, Y))
    evs = sorted(int(e) for e in Hm.eigenvals())
    return Hm, evs[0], evs[-1]


def eig_vals(A, B, C):
    Hm, lo, hi = quad_eigs(A, B, C)
    return {"H11": int(Hm[0, 0]), "H22": int(Hm[1, 1]), "tr": int(Hm.trace()), "det": int(Hm.det()), "h2": hi - lo, "hi": hi, "lo": lo}


def o_gd(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        A, B, C, x0, eta = q["A"], q["B"], q["C"], q["x0"], S(q["eta"])
        f = A * X ** 2 + B * X + C
        g = sp.diff(f, X).subs(X, x0)
        x1 = x0 - eta * g
        f0, f1 = f.subs(X, x0), f.subs(X, x1)
        assert f1 < f0, "the step must decrease f"
        return {"answer": frs(x1), "vals": {"A2": 2 * A, "g": int(g), "x1": frs(x1), "f0": frs(f0), "f1": frs(f1)}}
    if lv == 2:
        a, c, d, e, eta = q["a"], q["c"], q["d"], q["e"], S(q["eta"])
        f = a * X ** 2 + c * Y ** 2 + d * X + e * Y
        grad = [sp.diff(f, X), sp.diff(f, Y)]
        pt = (sp.Integer(q["x0"]), sp.Integer(q["y0"]))
        g0 = [gi.subs({X: pt[0], Y: pt[1]}) for gi in grad]
        p1 = (pt[0] - eta * g0[0], pt[1] - eta * g0[1])
        g1 = [gi.subs({X: p1[0], Y: p1[1]}) for gi in grad]
        p2 = (p1[0] - eta * g1[0], p1[1] - eta * g1[1])
        fs = [f.subs({X: u, Y: v}) for u, v in (pt, p1, p2)]
        assert fs[0] > fs[1] > fs[2]
        mn = sp.solve(grad, [X, Y])
        assert (mn[X], mn[Y]) == (q["h"], q["k"])
        fstar = f.subs({X: mn[X], Y: mn[Y]})
        L = lambda v: [frs(t) for t in v]  # noqa: E731
        return {"answer": L(p2), "vals": {"a2": 2 * a, "c2": 2 * c, "g0": L(g0), "p1": L(p1), "g1": L(g1), "p2": L(p2), "fs": L(fs), "fstar": frs(fstar)}}
    A, B, C = q["A"], q["B"], q["C"]
    v = eig_vals(A, B, C)
    lo, hi = v["lo"], v["hi"]
    assert lo > 0
    v.update({"kap": F(hi, lo), "lim": F(2, hi), "inv": F(1, hi), "fac": 1 - F(lo, hi)})
    return {"answer": F(hi, lo), "vals": v}


# ---- O.line-search ---------------------------------------------------------------------------------------
def o_ls(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        A, B, x0, c1 = q["A"], q["B"], q["x0"], S(q["c1"])
        f = A * X ** 2 + B * X
        g = sp.diff(f, X).subs(X, x0)
        pdir = -g
        f0 = f.subs(X, x0)
        slope = g * pdir

        def trial(al):
            xt = x0 + al * pdir
            return xt, f.subs(X, xt), f0 + c1 * al * slope

        base = {"A2": 2 * A, "g": int(g), "f0": frs(f0), "slope": int(slope), "gg": int(g * g)}
        if lv == 1:
            al = S(q["al"])
            xt, phi, rhs = trial(al)
            base.update({"xt": frs(xt), "phi": frs(phi), "rhs": frs(rhs)})
            return {"answer": 0 if phi <= rhs else 1, "vals": base}
        als, xts, phis, rhss = [], [], [], []
        al = sp.Integer(1)
        while True:
            xt, phi, rhs = trial(al)
            als.append(frs(al)), xts.append(frs(xt)), phis.append(frs(phi)), rhss.append(frs(rhs))
            if phi <= rhs:
                break
            al /= 2
        base.update({"als": als, "xt": xts, "phi": phis, "rhs": rhss})
        return {"answer": als[-1], "vals": base}
    a, b, c, x0, y0 = q["a"], q["b"], q["c"], q["x0"], q["y0"]
    f = a * X ** 2 + b * X * Y + c * Y ** 2
    Hm = sp.hessian(f, (X, Y))
    assert Hm.is_positive_definite
    g = sp.Matrix([sp.diff(f, X), sp.diff(f, Y)]).subs({X: x0, Y: y0})
    al = sp.symbols("al")
    phi = f.subs({X: x0 - al * g[0], Y: y0 - al * g[1]})
    ast = sp.solve(sp.diff(phi, al), al)[0]
    assert sp.diff(phi, al, 2) > 0 and ast > 0
    Hg = Hm * g
    return {"answer": frs(ast), "vals": {"g": [int(g[0]), int(g[1])], "Hg": [int(Hg[0]), int(Hg[1])], "gg": int((g.T * g)[0]), "gHg": int((g.T * Hg)[0]), "al": frs(ast),
                                         "x1": [frs(x0 - ast * g[0]), frs(y0 - ast * g[1])], "a2": 2 * a, "c2": 2 * c}}


# ---- O.9 Newton ------------------------------------------------------------------------------------------------
def o_9(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, c, x0 = q["a"], q["b"], q["c"], q["x0"]
        f = a * X ** 3 + b * X ** 2 + c * X
        g, h = sp.diff(f, X).subs(X, x0), sp.diff(f, X, 2).subs(X, x0)
        assert h > 0
        x1 = x0 - g / h
        return {"answer": frs(x1), "vals": {"a3": 3 * a, "b2": 2 * b, "a6": 6 * a, "g": int(g), "h": int(h), "x1": frs(x1)}}
    if lv == 2:
        k, c, m = q["k"], q["c"], q["m"]
        f = X ** 3 - 3 * k * k * X + c * Y ** 2 - 2 * c * m * Y
        pts = sp.solve([sp.diff(f, X), sp.diff(f, Y)], [X, Y], dict=True)
        Hm = sp.hessian(f, (X, Y))
        mins = [(s_[X], s_[Y]) for s_ in pts if Hm.subs(s_).is_positive_definite]
        assert len(mins) == 1 and len(pts) == 2
        return {"answer": [int(mins[0][0]), int(mins[0][1])], "vals": {"k3": 3 * k * k, "c2": 2 * c, "cm": 2 * c * m, "k": k, "m": m, "k6": 6 * k}}
    c, d, x0, y0 = q["c"], q["d"], q["x0"], q["y0"]
    f = X ** 4 + c * Y ** 2 + d * X * Y
    g = sp.Matrix([sp.diff(f, X), sp.diff(f, Y)]).subs({X: x0, Y: y0})
    Hm = sp.hessian(f, (X, Y)).subs({X: x0, Y: y0})
    assert Hm.is_positive_definite
    pv = -Hm.LUsolve(g)
    return {"answer": [frs(x0 + pv[0]), frs(y0 + pv[1])], "vals": {"g": [int(g[0]), int(g[1])], "H11": int(Hm[0, 0]), "c2": 2 * c, "det": int(Hm.det()),
                                                                   "p": [frs(pv[0]), frs(pv[1])], "x1": [frs(x0 + pv[0]), frs(y0 + pv[1])], "ng": [-int(g[0]), -int(g[1])]}}


# ---- O.quasi-newton -------------------------------------------------------------------------------------------
def o_qn(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        x0, x1, g0, g1 = q["x0"], q["x1"], q["g0"], q["g1"]
        s, yv = x1 - x0, g1 - g0
        Hs = F(s, yv)
        assert Hs * yv == s  # the secant condition
        return {"answer": x1 - Hs * g1, "vals": {"s": s, "yv": yv, "Hs": Hs, "x2": x1 - Hs * g1}}
    if lv == 2:
        a, c, al = q["a"], q["c"], S(q["al"])
        f = a * X ** 2 + c * Y ** 2
        grad = sp.Matrix([sp.diff(f, X), sp.diff(f, Y)])
        x0 = sp.Matrix([q["x0"], q["y0"]])
        g0 = grad.subs({X: x0[0], Y: x0[1]})
        s = al * (-sp.eye(2) * g0)
        x1 = x0 + s
        g1 = grad.subs({X: x1[0], Y: x1[1]})
        yy = g1 - g0
        ys = (yy.T * s)[0]
        assert ys > 0
        L = lambda v: [frs(t) for t in v]  # noqa: E731
        return {"answer": frs(1 / ys), "vals": {"g0": [int(t) for t in g0], "s": L(s), "x1": L(x1), "g1": L(g1), "yy": L(yy), "ys": frs(ys), "rho": frs(1 / ys),
                                                "a2": 2 * a, "c2": 2 * c, "ng": [-int(t) for t in g0]}}
    s = sp.Matrix(q["s"])
    yv = sp.Matrix(q["y"])
    ys = (yv.T * s)[0]
    assert ys > 0
    rho = sp.Rational(1, ys)
    I2 = sp.eye(2)
    H1 = (I2 - rho * s * yv.T) * I2 * (I2 - rho * yv * s.T) + rho * s * s.T
    assert H1 * yv == s and H1.is_positive_definite and H1 == H1.T
    yy = (yv.T * yv)[0]
    ss = s * s.T
    sym = yv * s.T + s * yv.T
    L2 = lambda M_: [[int(M_[i, j]) for j in range(2)] for i in range(2)]  # noqa: E731
    return {"answer": [frs(H1[0, 0]), frs(H1[0, 1]), frs(H1[1, 1])],
            "vals": {"ys": int(ys), "rho": frs(rho), "yy": int(yy), "k1": frs(rho + rho ** 2 * yy), "ss": L2(ss), "sym": L2(sym),
                     "Hn": [[frs(H1[i, j]) for j in range(2)] for i in range(2)], "Hy": [frs(t) for t in H1 * yv]}}


# ---- O.coordinate-descent ---------------------------------------------------------------------------------------
def o_cd(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        a, b, c, d, e, x0, y0 = (q[k] for k in ("a", "b", "c", "d", "e", "x0", "y0"))
        f = a * X ** 2 + b * X * Y + c * Y ** 2 + d * X + e * Y
        x1 = sp.solve(sp.diff(f, X).subs(Y, y0), X)[0]
        if lv == 1:
            return {"answer": frs(x1), "vals": {"a2": 2 * a, "x1": frs(x1)}}
        y1 = sp.solve(sp.diff(f, Y).subs(X, x1), Y)[0]
        fs = [f.subs({X: x0, Y: y0}), f.subs({X: x1, Y: y0}), f.subs({X: x1, Y: y1})]
        assert fs[0] >= fs[1] >= fs[2]
        return {"answer": [frs(x1), frs(y1)], "vals": {"a2": 2 * a, "c2": 2 * c, "x1": frs(x1), "y1": frs(y1), "fs": [frs(t) for t in fs]}}
    xj, rr, lam = q["xj"], q["r"], q["lam"]
    z = sum(u * v for u, v in zip(xj, rr))
    xx = sum(u * u for u in xj)
    Sz = (1 if z > 0 else -1) * max(abs(z) - lam, 0)
    beta = F(Sz, xx)
    # subgradient optimality of 1/2 |r - x b|^2 + lam |b| at b = beta
    if beta != 0:
        assert xx * beta - z + lam * (1 if beta > 0 else -1) == 0
    else:
        assert abs(z) <= lam
    return {"answer": beta, "vals": {"z": z, "az": abs(z), "Sz": Sz, "xx": xx, "beta": beta}}


# ---- O.stochastic --------------------------------------------------------------------------------------------------
def o_sgd(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        xi, x = q["xi"], F(q["x0"])
        xs = [x]
        for k, v in enumerate(xi, start=1):
            x = x - F(1, k) * (x - v)  # gradient of (x - xi)^2 / 2 is x - xi
            xs.append(x)
        mean = F(sum(xi), len(xi))
        assert x == mean
        return {"answer": x, "vals": {"xs": xs, "mean": mean}}
    if lv == 2:
        w = sp.symbols("w")
        xs, ys, w0, eta = q["xs"], q["ys"], q["w0"], to_f(q["eta"])
        loss = [sp.Rational(1, 2) * (w * a - b) ** 2 for a, b in zip(xs, ys)]
        gi = [int(sp.diff(L_, w).subs(w, w0)) for L_ in loss]
        g = F(sum(gi), len(gi))
        assert g != 0
        return {"answer": w0 - eta * g, "vals": {"res": [w0 * a - b for a, b in zip(xs, ys)], "gi": gi, "g": g, "w1": w0 - eta * g}}
    sigma, s, tex = q["sigma"], to_f(q["s"]), to_f(q["tex"])
    need = (F(sigma) / s) ** 2
    B = math.ceil(need)
    assert sigma ** 2 / F(B) <= s ** 2 and (B == 1 or sigma ** 2 / F(B - 1) > s ** 2)
    return {"answer": B, "vals": {"ratio": F(sigma) / s, "need": need, "B": B, "ms": tex * B}}


# ---- O.10 Lagrange ---------------------------------------------------------------------------------------------
def o_10(p):
    q, lv = p["params"], p["level"]
    lam = sp.symbols("lam")
    if lv == 1:
        a, b, c = q["a"], q["b"], q["c"]
        Lg = X * Y - lam * (a * X + b * Y - c)
        sol = sp.solve([sp.diff(Lg, X), sp.diff(Lg, Y), a * X + b * Y - c], [X, Y, lam], dict=True)[0]
        # check it is the maximum on the segment: 1-D after eliminating y
        f1 = X * (c - a * X) / b
        assert sp.diff(f1, X, 2) < 0
        fs = sol[X] * sol[Y]
        return {"answer": int(fs), "vals": {"ab2": 2 * a * b, "lam": frs(sol[lam]), "xs": int(sol[X]), "ys": int(sol[Y]), "fs": int(fs)}}
    if lv == 2:
        al, be, R2 = q["al"], q["be"], q["R2"]
        sols = sp.solve([al - lam * 2 * X, be - lam * 2 * Y, X ** 2 + Y ** 2 - R2], [X, Y, lam], dict=True)
        best = max(sols, key=lambda s_: al * s_[X] + be * s_[Y])
        fmax = al * best[X] + be * best[Y]
        R = int(sp.sqrt(R2))
        h = int(sp.sqrt(al * al + be * be))
        return {"answer": int(fmax), "vals": {"hh": h * h, "lam": frs(best[lam]), "xs": frs(best[X]), "ys": frs(best[Y]), "fmax": int(fmax), "R": R, "h": h}}
    a, b, B = q["a"], q["b"], q["B"]
    Bs = sp.symbols("B", positive=True)
    sol = sp.solve([Y - lam * 2 * a, X - lam * b, 2 * a * X + b * Y - Bs], [X, Y, lam], dict=True)[0]
    Astar = (sol[X] * sol[Y])
    dA = sp.diff(Astar, Bs).subs(Bs, B)
    assert sp.simplify(dA - sol[lam].subs(Bs, B)) == 0  # the multiplier is the sensitivity dA*/dB
    xs, ys = sol[X].subs(Bs, B), sol[Y].subs(Bs, B)
    return {"answer": frs(dA), "vals": {"a2": 2 * a, "ab4": 4 * a * b, "lam": frs(dA), "xs": int(xs), "ys": int(ys), "A": int(xs * ys), "sides": int(2 * a * xs), "front": int(b * ys)}}


# ---- O.11 KKT ----------------------------------------------------------------------------------------------------
def kkt_brute(f, gs, vars_):
    """All KKT points of min f s.t. g_i <= 0, by enumerating active sets."""
    out = []
    n_ = len(gs)
    for mask in range(2 ** n_):
        act = [i for i in range(n_) if mask >> i & 1]
        mus = sp.symbols(f"m0:{n_}")
        Lg = f + sum(mus[i] * gs[i] for i in act)
        eqs = [sp.diff(Lg, v) for v in vars_] + [gs[i] for i in act]
        unknowns = list(vars_) + [mus[i] for i in act]
        for s_ in sp.solve(eqs, unknowns, dict=True):
            pt = [s_[v] for v in vars_]
            mv = [s_[mus[i]] if i in act else 0 for i in range(n_)]
            if all(g.subs(dict(zip(vars_, pt))) <= 0 for g in gs) and all(m >= 0 for m in mv):
                out.append((pt, mv, act))
    return out


def o_11(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a, b, up = q["a"], q["b"], q["upper"]
        g = X - b if up else b - X
        pts = kkt_brute((X - a) ** 2, [g], [X])
        assert len(pts) == 1
        xs, mu = pts[0][0][0], pts[0][1][0]
        return {"answer": [int(xs), int(mu)], "vals": {"xs": int(xs), "mu": int(mu)}}
    if lv == 2:
        pp, qq, s = q["p"], q["q"], q["s"]
        pts = kkt_brute((X - pp) ** 2 + (Y - qq) ** 2, [X + Y - s], [X, Y])
        assert len(pts) == 1
        (xs, ys), (mu,), _ = pts[0]
        return {"answer": [frs(xs), frs(ys), int(mu)], "vals": {"pq": pp + qq, "mu": int(mu), "xs": frs(xs), "ys": frs(ys)}}
    pp, qq, s = q["p"], q["q"], q["s"]
    pts = kkt_brute((X - pp) ** 2 + (Y - qq) ** 2, [X + Y - s, -X], [X, Y])
    assert len(pts) == 1
    pt, mv, act = pts[0]
    assert act and all(mv[i] > 0 for i in act)  # nondegenerate
    a1 = pp + qq - s
    return {"answer": [int(mv[0]), int(mv[1])], "vals": {"pq": pp + qq, "a1": a1, "x1": F(2 * pp - a1, 2), "y1": F(2 * qq - a1, 2), "a2": -2 * pp,
                                                         "b1": 2 * (qq - s), "b2": 2 * (qq - s) - 2 * pp, "ans": [int(mv[0]), int(mv[1])]}}


# ---- O.lagrange-duality ------------------------------------------------------------------------------------------
def o_ld(p):
    q, lv = p["params"], p["level"]
    mu = sp.symbols("mu", nonnegative=True)
    if lv <= 2:
        a, b = q["a"], q["b"]
        Lg = a * X ** 2 + mu * (b - X)
        xm = sp.solve(sp.diff(Lg, X), X)[0]
        qf = sp.expand(Lg.subs(X, xm))
        pstar = a * b * b  # primal: increasing for x >= b > 0
        if lv == 1:
            q0 = qf.subs(mu, q["mu0"])
            assert q0 <= pstar
            return {"answer": frs(q0), "vals": {"a2": 2 * a, "a4": 4 * a, "q0": frs(q0), "pstar": pstar, "mb": q["mu0"] * b}}
        mus = sp.solve(sp.diff(qf, mu), mu)[0]
        ds = qf.subs(mu, mus)
        assert ds == pstar
        return {"answer": [int(mus), int(ds)], "vals": {"a2": 2 * a, "a4": 4 * a, "mus": int(mus), "pstar": pstar, "mb": int(mus) * b, "ms2": int(mus) ** 2}}
    al, be, c = q["al"], q["be"], q["c"]
    Lg = X ** 2 + Y ** 2 + mu * (c - al * X - be * Y)
    s_ = sp.solve([sp.diff(Lg, X), sp.diff(Lg, Y)], [X, Y])
    qf = sp.expand(Lg.subs(s_))
    mus = sp.solve(sp.diff(qf, mu), mu)[0]
    ds = qf.subs(mu, mus)
    # primal by projection: min |x|^2 on the line al x + be y = c
    pr = kkt_brute(X ** 2 + Y ** 2, [c - al * X - be * Y], [X, Y])
    assert len(pr) == 1 and pr[0][0][0] ** 2 + pr[0][0][1] ** 2 == ds
    return {"answer": frs(ds), "vals": {"nn": al * al + be * be, "n4": F(al * al + be * be, 4), "n2": F(al * al + be * be, 2), "mus": frs(mus), "ds": frs(ds), "xs": frs(pr[0][0][0]), "ys": frs(pr[0][0][1])}}


# ---- O.penalty-barrier ---------------------------------------------------------------------------------------------
def o_pb(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        u, pp, qq, x0, y0, eta = q["u"], q["p"], q["q"], q["x0"], q["y0"], to_f(q["eta"])
        gx, gy = 2 * (x0 - pp), 2 * (y0 - qq)
        z = [x0 - eta * gx, y0 - eta * gy]
        xn = [min(max(v, F(0)), F(u)) for v in z]
        assert xn != z
        return {"answer": xn, "vals": {"gx": gx, "gy": gy, "z": z, "xn": xn}}
    if lv == 2:
        c, b, mu = q["c"], q["b"], S(q["mu"])
        Bf = c * X - mu * sp.log(X - b)
        xm = sp.solve(sp.diff(Bf, X), X)[0]
        assert sp.diff(Bf, X, 2).subs(X, xm) > 0
        return {"answer": frs(xm), "vals": {"xm": frs(xm), "gap": frs(c * xm - c * b), "cb": c * b}}
    a, b, eps = q["a"], q["b"], to_f(q["eps"])
    rho = sp.symbols("rho", positive=True)
    xr = sp.solve(sp.diff((X - a) ** 2 + rho / 2 * (b - X) ** 2, X), X)[0]
    viol = sp.simplify(b - xr)
    rmin = sp.solve(sp.Eq(viol, S(eps)), rho)[0]
    assert rmin.is_integer and rmin > 0
    xv = xr.subs(rho, rmin)
    assert xv < b
    return {"answer": int(rmin), "vals": {"a2": 2 * a, "ba2": 2 * (b - a), "rho2": int(rmin) + 2, "rho": int(rmin), "xr": frs(xv), "viol": frs(b - xv)}}


# ---- O.12 DP ----------------------------------------------------------------------------------------------------------
def o_12(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        rw, g = q["rw"], to_f(q["g"])
        t = sp.symbols("t", integer=True, nonnegative=True)
        V0 = sp.summation(rw * S(g) ** t, (t, 0, sp.oo))
        V0 = frs(V0)
        assert rw + g * V0 == V0
        return {"answer": V0, "vals": {"om": 1 - g, "V0": V0, "gV": g * V0}}
    if lv == 2:
        cA, cBC, cZ = q["cA"], q["cBC"], q["cZ"]
        routes = {(i, j): cA[i] + cBC[i][j] + cZ[j] for i in range(2) for j in range(2)}
        best = min(routes.values())
        assert list(routes.values()).count(best) == 1
        VB = [min(cBC[i][j] + cZ[j] for j in range(2)) for i in range(2)]
        b = 0 if cA[0] < cA[1] else 1
        c = 0 if cBC[b][0] < cBC[b][1] else 1
        return {"answer": best, "vals": {"VB": VB, "VA": best, "sB": [[cBC[i][j] + cZ[j] for j in range(2)] for i in range(2)], "sA": [cA[i] + VB[i] for i in range(2)],
                                         "greedy": cA[b] + cBC[b][c] + cZ[c]}}
    g, V0, rw, pr = to_f(q["g"]), q["V0"], q["rw"], [to_f(v) for v in q["pr"]]
    e = [pr[k] * V0[0] + (1 - pr[k]) * V0[1] for k in range(2)]
    Q = [rw[k] + g * e[k] for k in range(2)]
    assert Q[0] != Q[1]
    return {"answer": max(Q), "vals": {"Q": Q, "q1": 1 - pr[0], "q2": 1 - pr[1], "e": e}}


# ---- O.13 SA ------------------------------------------------------------------------------------------------------------
def o_13(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        r_ = q["dl"] / q["T"]
        return {"answer": math.exp(-r_), "vals": {"ratio": r_, "pa": math.exp(-r_)}}
    if lv == 2:
        dl = q["fnw"] - q["fc"]
        pa = 1.0 if dl < 0 else math.exp(-dl / q["T"])
        assert abs(pa - q["U"]) >= 0.02
        return {"answer": 0 if (dl < 0 or q["U"] < pa) else 1, "vals": {"dl": dl, "ratio": dl / q["T"], "pa": pa}}
    Tk = float(to_f(q["T0"]) * to_f(q["al"]) ** q["k"])
    r_ = q["dl"] / Tk
    return {"answer": math.exp(-r_), "vals": {"Tk": Tk, "ratio": r_, "pa": math.exp(-r_), "p0": math.exp(-q["dl"] / q["T0"])}}


# ---- O.local-search ---------------------------------------------------------------------------------------------
def o_local(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        f, cur = q["f"], q["x0"]
        path = [cur]
        while True:
            nb = [t for t in (cur - 1, cur + 1) if 1 <= t <= 9]
            best = max(nb, key=lambda t: f[t - 1])
            if f[best - 1] <= f[cur - 1]:
                break
            cur = best
            path.append(cur)
        assert all(f[t - 1] < f[cur - 1] for t in (cur - 1, cur + 1) if 1 <= t <= 9)  # a local maximum
        return {"answer": cur, "vals": {"cur": cur, "gmax": f.index(max(f)) + 1, "path": path}}
    if lv == 2:
        w, v, W = q["w"], q["v"], q["W"]
        order = sorted(range(4), key=lambda i: -F(v[i], w[i]))
        room, val, rooms = W, 0, []
        for i in order:
            rooms.append(room)
            if w[i] <= room:
                room -= w[i]
                val += v[i]
        opt = max(sum(v[i] for i in s) for s in subsets(4) if sum(w[i] for i in s) <= W)
        assert val <= opt
        return {"answer": val, "vals": {"val": val, "opt": opt, "rooms": rooms, "rt": [v[i] / w[i] for i in range(4)]}}
    f, x0 = q["f"], tuple(q["x0"])
    fb = lambda b: f[b[0] * 4 + b[1] * 2 + b[2]]  # noqa: E731
    flip = lambda b, i: tuple(1 - t if j == i else t for j, t in enumerate(b))  # noqa: E731
    assert len(set(f)) == 8 and all(fb(flip(x0, i)) > fb(x0) for i in range(3))
    cur, best, last, picks = x0, fb(x0), {}, []
    for t in range(1, 4):
        allowed = [(fb(flip(cur, i)), i) for i in range(3) if not (i in last and t - last[i] <= 2) or fb(flip(cur, i)) < best]
        val, i = min(allowed)
        picks.append(val)
        cur, best, last[i] = flip(cur, i), min(best, val), t
    assert best < fb(x0)
    return {"answer": best, "vals": {"f0": fb(x0), "best": best, "picks": picks}}


# ---- O.genetic -----------------------------------------------------------------------------------------------------
def o_gen(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        tot = sum(q["Fs"])
        return {"answer": F(q["Fs"][q["k"]], tot), "vals": {"tot": tot, "pk": F(q["Fs"][q["k"]], tot)}}
    if lv == 2:
        a, b, c = q["a"], q["b"], q["c"]
        c1, c2 = a[:c] + b[c:], b[:c] + a[c:]
        return {"answer": [sum(c1), sum(c2)], "vals": {"o1": sum(c1), "o2": sum(c2), "sa": sum(a), "sb": sum(b)}}
    w, c1, r1, r2 = to_f(q["w"]), to_f(q["c1"]), to_f(q["r1"]), to_f(q["r2"])
    X0, V0, Pb, G = q["X0"], q["V0"], q["Pb"], q["G"]
    vn = [w * V0[i] + c1 * r1 * (Pb[i] - X0[i]) + c1 * r2 * (G[i] - X0[i]) for i in range(2)]
    xn = [X0[i] + vn[i] for i in range(2)]
    return {"answer": xn, "vals": {"d1": [Pb[i] - X0[i] for i in range(2)], "d2": [G[i] - X0[i] for i in range(2)], "k1": c1 * r1, "k2": c1 * r2, "vn": vn, "xn": xn}}


# ---- O.rng -----------------------------------------------------------------------------------------------------------
def o_rng(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        m, a, c, X0 = q["m"], q["a"], q["c"], q["X0"]
        X, raw = [X0], []
        for _ in range(3):
            raw.append(a * X[-1] + c)
            X.append(raw[-1] % m)
        return {"answer": X[1:], "vals": {"X": X[1:], "raw": raw, "U": [F(t, m) for t in X[1:]]}}
    if lv == 2:
        m, c, opts = q["m"], q["c"], q["opts"]

        def period(a):
            x, seen = 0, {}
            for t in range(2 * m + 2):
                if x in seen:
                    return t - seen[x]
                seen[x] = t
                x = (a * x + c) % m
        full = [i for i, a in enumerate(opts) if period(a) == m]
        assert len(full) == 1
        return {"answer": full[0], "vals": {"pf": [int(t) for t in sp.primefactors(m)], "am1": [a - 1 for a in opts]}}
    U1, U2, mu, sg = q["U1"], to_f(q["U2"]), q["mu"], q["sg"]
    lnU = math.log(U1)
    R = math.sqrt(-2 * lnU)
    cs = float(sp.cos(2 * sp.pi * S(U2)))
    Z = R * cs
    return {"answer": mu + sg * Z, "vals": {"lnU": lnU, "m2ln": -2 * lnU, "R": R, "ang": 2 * U2, "cs": cs, "Z": Z, "Xv": mu + sg * Z}}


# ---- O.15 ----------------------------------------------------------------------------------------------------------------
def o_15(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if "lo" in q:
            Xv = q["lo"] + (q["hi"] - q["lo"]) * q["U"]
            return {"answer": Xv, "vals": {"span": q["hi"] - q["lo"], "Xv": Xv}}
        Xv = -math.log(1 - q["U"]) / q["lam"]
        assert abs((1 - math.exp(-q["lam"] * Xv)) - q["U"]) < 1e-12  # F(X) = U: the inverse transform
        return {"answer": Xv, "vals": {"om": round(1 - q["U"], 6), "ln": math.log(1 - q["U"]), "Xv": Xv}}
    if lv == 2:
        pm, U = [to_f(v) for v in q["pm"]], to_f(q["U"])
        assert sum(pm) == 1 and all(v > 0 for v in pm)
        cum = [sum(pm[: i + 1]) for i in range(len(pm))]
        assert U not in cum
        kk = next(i for i, c in enumerate(cum) if U <= c)
        return {"answer": kk, "vals": {"cum": cum, "kk": kk}}
    fs = [lambda t: 2 * t, lambda t: 3 * t * t, lambda t: 6 * t * (1 - t)]
    Mv = [2, 3, 1.5][q["kind"]]
    f = fs[q["kind"]]
    tt = sp.symbols("tt")
    expr = f(tt)
    assert sp.integrate(expr, (tt, 0, 1)) == 1 and abs(float(sp.maximum(expr, tt, sp.Interval(0, 1))) - Mv) < 1e-12
    rs = [f(F(x_).limit_denominator(100)) / F(Mv).limit_denominator(10) for x_ in q["xs"]]
    acc = [F(u).limit_denominator(100) <= r_ for u, r_ in zip(q["Us"], rs)]
    return {"answer": sum(acc), "vals": {"rs": rs, "na": sum(acc), "rate": 1 / F(Mv).limit_denominator(10)}}


# ---- O.14 ----------------------------------------------------------------------------------------------------------------
FUNS_S = [X ** 2, 2 * X + 1, X ** 3, 4 - X ** 2]


def o_14(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        f, a, b = FUNS_S[q["fi"]], q["a"], q["b"]
        us = [S(u) for u in q["us"]]
        fs = [frs(f.subs(X, u)) for u in us]
        est = sum(fs) * F(b - a, len(us))
        return {"answer": est, "vals": {"fs": fs, "sm": sum(fs), "est": est, "tru": frs(sp.integrate(f, (X, a, b))), "len": b - a}}
    if lv == 2:
        d2 = [round(a * a + b * b, 6) for a, b in q["pts"]]
        assert all(abs(v - 1) > 0.1 for v in d2)
        k = sum(1 for v in d2 if v <= 1)
        return {"answer": F(4 * k, q["N"]), "vals": {"d2": d2, "k": k, "est": F(4 * k, q["N"])}}
    N0, sig, eps = q["N0"], q["sig"], to_f(q["eps"])
    rt = math.isqrt(N0)
    assert rt * rt == N0
    z = F(196, 100)
    need = (z * sig / eps) ** 2
    Nn = math.ceil(need)
    assert z * sig / math.sqrt(Nn) <= eps + 1e-12 and z * sig / math.sqrt(Nn - 1) > eps
    return {"answer": Nn, "vals": {"hw": z * sig / rt, "zs": z * sig / eps, "need": need, "Nn": Nn, "rt": rt}}


# ---- O.variance-reduction -------------------------------------------------------------------------------------------------
def o_vr(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        f = FUNS_S[q["fi"]]
        us = [to_f(u) for u in q["us"]]
        val = lambda t: frs(f.subs(X, S(t)))  # noqa: E731
        pairs = [[val(u), val(1 - u)] for u in us]
        avg = [(a + b) / 2 for a, b in pairs]
        return {"answer": sum(avg) / 3, "vals": {"pairs": pairs, "avg": avg, "est": sum(avg) / 3, "tru": frs(sp.integrate(f, (X, 0, 1))), "mir": [1 - u for u in us]}}
    if lv == 2:
        ws = [to_f(w) for w in q["ws"]]
        assert sum(ws) == 1
        parts = [w * m for w, m in zip(ws, q["means"])]
        return {"answer": sum(parts), "vals": {"ws": ws, "pct": [w * 100 for w in ws], "parts": parts, "est": sum(parts)}}
    sx, sy, rho = q["sx"], q["sy"], to_f(q["rho"])
    cov = rho * sx * sy
    c = cov / (sx * sx)
    xbar, ybar, muX = to_f(q["xbar"]), to_f(q["ybar"]), q["muX"]
    est = ybar - c * (xbar - muX)
    # the optimal c minimizes Var(Y - c X) = vy - 2c cov + c^2 vx
    cc = sp.symbols("cc")
    copt = sp.solve(sp.diff(sy * sy - 2 * cc * S(cov) + cc ** 2 * sx * sx, cc), cc)[0]
    assert frs(copt) == c
    return {"answer": est, "vals": {"cov": cov, "c": c, "dx": xbar - muX, "est": est, "rho": cov / (sx * sy), "red": 1 - rho ** 2, "vx": sx * sx, "vy": sy * sy}}


# ---- O.16 MCMC ---------------------------------------------------------------------------------------------------------------
def o_16(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        wts = q["wts"]
        al = lambda a, b: min(F(1), F(wts[b - 1], wts[a - 1]))  # noqa: E731
        if lv == 1:
            return {"answer": al(q["xa"], q["xb"]), "vals": {"al": al(q["xa"], q["xb"])}}
        cur, als = q["x0"], []
        for pr, U in zip(q["props"], q["Us"]):
            assert abs(pr - cur) == 1
            a = al(cur, pr)
            assert abs(float(a) - U) >= 0.02
            als.append(float(a))
            if F(U).limit_denominator(100) <= a:
                cur = pr
        return {"answer": cur, "vals": {"als": als, "cur": cur}}
    if q["mode"] == 0:
        px, py, qf, qb = q["px"], q["py"], to_f(q["qf"]), to_f(q["qb"])
        ratio = (py * qb) / (px * qf)
        return {"answer": min(F(1), ratio), "vals": {"a": qb * py, "b": qf * px, "ratio": ratio, "al": min(F(1), ratio)}}
    N, rho = q["N"], to_f(q["rho"])
    k = sp.symbols("k", integer=True, positive=True)
    s = frs(sp.summation(S(rho) ** k, (k, 1, sp.oo)))
    ess = N / (1 + 2 * s)
    assert ess.denominator == 1
    return {"answer": ess, "vals": {"om": 1 - rho, "s": s, "den": 1 + 2 * s, "ess": ess}}


# ---- O.queueing ---------------------------------------------------------------------------------------------------------------
def o_q(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        k = q["k"]
        if k == 0:
            Wh = F(q["Wm"], 60)
            return {"answer": q["lam"] * Wh, "vals": {"Wh": Wh, "L": q["lam"] * Wh}}
        L = to_f(q["L"])
        if k == 1:
            Wh = F(q["Wm"], 60)
            return {"answer": L / Wh, "vals": {"Wh": Wh, "L": L, "lam": L / Wh}}
        Wh = L / q["lam"]
        return {"answer": Wh * 60, "vals": {"Wh": Wh, "L": L, "Wm": Wh * 60}}
    if lv == 2:
        lam, mu, k = q["lam"], q["mu"], q["k"]
        rho = F(lam, mu)
        assert rho < 1
        # L from the stationary distribution P(N = n) = (1 - rho) rho^n
        nn = sp.symbols("nn", integer=True, nonnegative=True)
        L = frs(sp.summation(nn * (1 - S(rho)) * S(rho) ** nn, (nn, 0, sp.oo)))
        Lq = L - rho
        W = L / lam * 60
        Wq = Lq / lam * 60
        assert Wq == rho * W
        return {"answer": [L, Lq, W, Wq][k], "vals": {"rho": rho, "om": 1 - rho, "L": L, "Lq": Lq, "W": W, "Wq": Wq, "gap": mu - lam}}
    if q["mode"] == 0:
        lam, Wm = q["lam"], q["Wm"]
        mu = lam + F(60, Wm)
        assert F(1) / (mu - lam) * 60 == Wm
        return {"answer": mu, "vals": {"Wh": F(Wm, 60), "inv": F(60, Wm), "mu": mu}}
    rho = F(q["lam"], q["mu"])
    pr = 1 - sum((1 - rho) * rho ** n_ for n_ in range(q["nn"]))
    return {"answer": pr, "vals": {"rho": rho, "pr": pr}}


# ---- O.des -------------------------------------------------------------------------------------------------------------------
def o_des(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        A = [sum(q["T"][: i + 1]) for i in range(len(q["T"]))]
        return {"answer": A[q["k"] - 1], "vals": {"A": A}}
    if lv == 2:
        S_, T = q["S"], q["T"]
        # direct simulation: arrival times, service starts
        arr = [0]
        for t in T:
            arr.append(arr[-1] + t)
        free, W = 0, []
        for a, s in zip(arr, S_):
            start = max(a, free)
            W.append(start - a)
            free = start + s
        raw = [W[i] + S_[i] - T[i] for i in range(4)]
        return {"answer": F(sum(W), 5), "vals": {"W": W, "raw": raw, "sumW": sum(W), "avg": F(sum(W), 5)}}
    A, S_ = q["A"], q["S"]
    Dd, free = [], 0
    for a, s in zip(A, S_):
        free = max(a, free) + s
        Dd.append(free)
    T = Dd[-1]
    # integrate N(t) over [0, T] directly, unit step by unit step at midpoints
    area = sum(sum(1 for a, d in zip(A, Dd) if a <= t + F(1, 2) < d) for t in range(T))
    soj = [d - a for a, d in zip(A, Dd)]
    assert area == sum(soj)
    return {"answer": F(area, T), "vals": {"Dd": Dd, "soj": soj, "area": area, "Tend": T, "Lbar": F(area, T)}}


VERIFY = {
    "O.1": o_1, "O.8": o_8, "O.2": o_2, "O.3": o_3, "O.qp": o_qp, "O.4": o_4, "O.5": o_5, "O.6": o_6, "O.7": o_7, "O.17": o_17,
    "O.gradient-descent": o_gd, "O.line-search": o_ls, "O.9": o_9, "O.quasi-newton": o_qn, "O.coordinate-descent": o_cd, "O.stochastic": o_sgd,
    "O.10": o_10, "O.11": o_11, "O.lagrange-duality": o_ld, "O.penalty-barrier": o_pb, "O.12": o_12, "O.13": o_13,
    "O.local-search": o_local, "O.genetic": o_gen, "O.rng": o_rng, "O.15": o_15, "O.14": o_14, "O.variance-reduction": o_vr,
    "O.16": o_16, "O.queueing": o_q, "O.des": o_des,
}
