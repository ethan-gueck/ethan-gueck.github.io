"""Independent answers for practice/physics.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the physics answer and every value the steps show (p["vals"]), and asserts what the
problem promises (physical plausibility, the regime it claims, consistent units). Exact fractions where the
numbers are exact, floating point where a calculator is needed, SymPy to confirm the mathematics.
Nothing here is copied from the JavaScript."""
from fractions import Fraction as F
import math

import sympy as sp

G0 = F("9.81")  # g, m/s²
g = 9.81


def fr(q):
    q = F(q)
    return {"n": q.numerator, "d": q.denominator}


def Fd(x):
    """A decimal param (≤ 4 places) as an exact fraction."""
    return F(round(x * 10000), 10000)


def sci(out, name, v, dp=3):
    """Mantissa/exponent pair, the mantissa rounded to dp places in [1, 10)."""
    v = float(v)
    e = math.floor(math.log10(abs(v)))
    m = v / 10 ** e
    if abs(m) >= 10:
        m /= 10
        e += 1
    if abs(m) < 1:
        m *= 10
        e -= 1
    if abs(round(m, dp)) >= 10:
        m /= 10
        e += 1
    out[name + "M"] = m
    out[name + "E"] = e


def sind(d):
    return math.sin(math.radians(d))


def cosd(d):
    return math.cos(math.radians(d))


def tand(d):
    return math.tan(math.radians(d))


def asind(x):
    return math.degrees(math.asin(x))


def terminating(q, places=4):
    return (10 ** places) % F(q).denominator == 0


# ---- P.1 -------------------------------------------------------------------------------------------
BASE = {  # [M, L, T]
    "T": (0, 0, 1), "t": (0, 0, 1), "L": (0, 1, 0), "m": (1, 0, 0), "g": (0, 1, -2), "F": (1, 1, -2), "mu": (1, -1, 0),
    "lam": (0, 1, 0), "k": (1, 0, -2), "h": (0, 1, 0), "r": (0, 1, 0), "G": (-1, 3, -2), "Ms": (1, 0, 0),
    "rho": (1, -3, 0), "v": (0, 1, -1), "A": (0, 2, 0), "E": (1, 2, -2), "R": (0, 1, 0),
}
SCEN = {
    "pendulum": ("T", ["L", "m", "g"]), "string": ("v", ["F", "mu"]), "deep": ("v", ["g", "lam"]),
    "spring": ("T", ["m", "k"]), "fall": ("t", ["h", "g", "m"]), "orbit": ("T", ["r", "G", "Ms"]),
    "drag": ("F", ["rho", "v", "A"]), "escape": ("v", ["G", "Ms", "R"]), "ke": ("E", ["m", "v"]),
}
# known physical results, to confirm the dimensional analysis lands on the textbook formula
KNOWN = {
    "pendulum": (F(1, 2), 0, F(-1, 2)), "string": (F(1, 2), F(-1, 2)), "deep": (F(1, 2), F(1, 2)),
    "spring": (F(1, 2), F(-1, 2)), "fall": (F(1, 2), F(-1, 2), 0), "orbit": (F(3, 2), F(-1, 2), F(-1, 2)),
    "drag": (1, 2, 1), "escape": (F(1, 2), F(1, 2), F(-1, 2)), "ke": (1, 2),
}


def p1(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "kmh":
            mph = q["kmh"] * 1000
            ms = F(mph, 3600)
            return {"answer": float(ms), "vals": {"mph": mph, "ms": float(ms)}}
        if q["kind"] == "ms":
            mph = q["s"] * 3600
            return {"answer": mph / 1000, "vals": {"mph": mph, "kmh": mph / 1000}}
        si = Fd(q["rho"]) * 1000  # 1 g/cm³ = 10⁻³ kg / 10⁻⁶ m³
        return {"answer": float(si), "vals": {"si": float(si)}}
    if lv == 2:
        # derived units built from their definitions, as (kg, m, s) exponents
        N = (1, 1, -2)
        J = tuple(a + b for a, b in zip(N, (0, 1, 0)))
        W = tuple(a + b for a, b in zip(J, (0, 0, -1)))
        Pa = tuple(a + b for a, b in zip(N, (0, -2, 0)))
        units = {"N": N, "J": J, "W": W, "Pa": Pa, "p": (1, 1, -1)}
        want = units[q["q"]]
        hits = [i for i, k in enumerate(q["opts"]) if units[k] == want]
        assert len(hits) == 1
        return {"answer": hits[0], "vals": {}}
    qty, vars_ = SCEN[q["id"]]
    syms = sp.symbols("a b c")[: len(vars_)]
    eqs = [sp.Eq(BASE[qty][d], sum(BASE[v][d] * s for v, s in zip(vars_, syms))) for d in range(3)]
    sol = sp.solve(eqs, syms, dict=True)
    assert len(sol) == 1, "the exponents are not unique"
    ex = [F(str(sol[0][s])) for s in syms]
    assert tuple(F(x) for x in KNOWN[q["id"]]) == tuple(ex), "dimensional analysis disagrees with the known law"
    return {"answer": [float(x) for x in ex], "vals": {l: fr(x) for l, x in zip("abc", ex)}}


# ---- P.2 -------------------------------------------------------------------------------------------
def poly_area(pts):
    """Shoelace area of a polygon with exact coordinates."""
    s = F(0)
    for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
        s += F(x1) * F(y2) - F(x2) * F(y1)
    return abs(s) / 2


def p2(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "vt":
            at = Fd(q["a"]) * q["t"]
            v = q["v0"] + at
            return {"answer": float(v), "vals": {"at": float(at), "v": float(v)}}
        s = q["v0"] + q["v"]
        d = F(s * q["t"], 2)
        return {"answer": float(d), "vals": {"sum": s, "d": float(d)}}
    if lv == 2:
        sq = q["v0"] ** 2
        if q["kind"] == "dist":
            a = Fd(q["a"])
            d = F(sq) / (2 * a)
            assert terminating(d)
            return {"answer": float(d), "vals": {"sq": sq, "twoA": float(2 * a), "d": float(d)}}
        d = Fd(q["d"])
        a = F(sq) / (2 * d)  # 0 = v0² − 2 a d
        assert 0 < a <= 10, "implausible braking"
        return {"answer": float(a), "vals": {"sq": sq, "twoD": float(2 * d), "a": float(a)}}
    t1, t2, t3, Y = q["t1"], q["t2"], q["t3"], q["Y"]
    assert 0 < t1 < t2 < t3
    if q["kind"] == "dist":
        tot = poly_area([(0, 0), (t1, Y), (t2, Y), (t3, 0)])
        vals = {"A1": F(t1 * Y, 2), "w": t2 - t1, "A2": (t2 - t1) * Y, "b": t3 - t2, "A3": F((t3 - t2) * Y, 2), "tot": tot}
        assert vals["A1"] + vals["A2"] + vals["A3"] == tot
        return {"answer": float(tot), "vals": {k: float(v) for k, v in vals.items()}}
    if q["phase"] == "up":
        acc = F(Y, t1)
        return {"answer": float(acc), "vals": {"acc": fr(acc)}}
    acc = F(0 - Y, t3 - t2)
    return {"answer": float(acc), "vals": {"b": t3 - t2, "acc": fr(acc)}}


# ---- P.projectile ----------------------------------------------------------------------------------
def pproj(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        h, u = q["h"], q["u"]
        t = math.sqrt(2 * h / g)
        x = u * t
        assert 0 < x < 200
        return {"answer": x, "vals": {"ratio": 2 * h / g, "t": t, "x": x}}
    th, v0 = q["th"], q["v0"]
    vx, vy = v0 * cosd(th), v0 * sind(th)
    if lv == 2:
        tf = 2 * v0 * sind(th) / g
        if q["kind"] == "height":
            Hh = v0 ** 2 * sind(th) ** 2 / (2 * g)
            return {"answer": Hh, "vals": {"vx": vx, "vy": vy, "Hh": Hh}}
        if q["kind"] == "time":
            return {"answer": tf, "vals": {"vx": vx, "vy": vy, "tf": tf}}
        R = v0 ** 2 * sind(2 * th) / g  # range formula
        assert math.isclose(R, vx * tf, rel_tol=1e-12)
        return {"answer": R, "vals": {"vx": vx, "vy": vy, "tf": tf, "R": R}}
    h = q["h"]
    disc = vy ** 2 + 2 * g * h
    t = 2 * h / (math.sqrt(disc) - vy)  # the positive root, rationalized form
    x = vx * t
    y_land = h + x * tand(th) - g * x ** 2 / (2 * v0 ** 2 * cosd(th) ** 2)  # trajectory equation
    assert abs(y_land) < 1e-9
    return {"answer": x, "vals": {"vx": vx, "vy": vy, "vy2": vy ** 2, "twogh": 2 * g * h, "sq": math.sqrt(disc), "t": t, "x": x}}


# ---- P.3 -------------------------------------------------------------------------------------------
def p3(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        net = q["Fe"] - q["Fw"]
        a = F(abs(net), q["m"])
        assert net != 0 and terminating(a)
        return {"answer": float(a), "vals": {"net": net, "a": float(a)}}
    if lv == 2:
        m, mu, Fp = q["m"], Fd(q["mu"]), q["F"]
        N = m * G0
        f = mu * N
        a = (Fp - f) / m
        assert a > 0
        return {"answer": float(a), "vals": {"Nf": float(N), "f": float(f), "net": float(Fp - f), "a": float(a)}}
    if "th" in q:
        th, mu, m = q["th"], q["mu"], q["m"]
        W = m * g
        Wpar, Wperp = W * sind(th), W * cosd(th)
        f = mu * Wperp
        a = g * (sind(th) - mu * cosd(th))  # mass cancels
        assert a > 0 and math.isclose(a, (Wpar - f) / m, rel_tol=1e-12)
        assert tand(th) > mu, "the box must slide"
        return {"answer": a, "vals": {"W": W, "Wpar": Wpar, "Wperp": Wperp, "f": f, "net": Wpar - f, "a": a}}
    m1, m2, mu = q["m1"], q["m2"], Fd(q["mu"])
    a = (m2 - mu * m1) * G0 / (m1 + m2)
    T = m2 * (G0 - a)
    assert a > 0 and T - mu * m1 * G0 == m1 * a  # table block's equation holds too
    vals = {"W2": float(m2 * G0), "f": float(mu * m1 * G0), "net": float((m2 - mu * m1) * G0), "mt": m1 + m2, "a": float(a)}
    if q["ask"] == "T":
        vals.update({"gma": float(G0 - a), "T": float(T)})
        return {"answer": float(T), "vals": vals}
    return {"answer": float(a), "vals": vals}


# ---- P.hooke ---------------------------------------------------------------------------------------
def phooke(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "k":
            xm = F(q["x"], 100)
            k = q["F"] / xm
            return {"answer": float(k), "vals": {"xm": float(xm), "k": float(k)}}
        xm = F(q["F"], q["k"])
        return {"answer": float(xm * 100), "vals": {"xm": float(xm), "xcm": float(xm * 100)}}
    if lv == 2:
        k1, k2, m = q["k1"], q["k2"], Fd(q["m"])
        keq = 1 / (F(1, k1) + F(1, k2)) if q["series"] else F(k1 + k2)
        W = m * G0
        xm = W / keq
        vals = {"keq": float(keq), "W": float(W), "xm": float(xm), "xcm": float(xm * 100)}
        if q["series"]:
            assert keq.denominator == 1
            vals.update({"prod": k1 * k2, "sum": k1 + k2})
        return {"answer": float(xm * 100), "vals": vals}
    if q["kind"] == "graph":
        k, x1, x2 = q["k"], q["x1"], q["x2"]
        F1 = F(k * x1, 100)
        assert F1.denominator == 1, "the marked point must sit on a whole newton"
        x2m = F(x2, 100)
        U = poly_area([(0, 0), (x2m, 0), (x2m, k * x2m)])  # area under F = kx
        assert U == F(k) * x2m ** 2 / 2
        return {"answer": float(U), "vals": {"F1": float(F1), "x1m": x1 / 100, "k": k, "x2m": float(x2m), "x2sq": float(x2m ** 2), "U": float(U)}}
    L0, d, m = q["L0"], q["d"], q["m"]
    Fw = m * g
    dm = d / 1000
    A = math.pi * dm ** 2 / 4
    assert Fw / A <= 2.5e8, "beyond the elastic range of steel"
    EA = 2.00e11 * A
    dL = Fw * L0 / EA
    out = {"F": Fw, "dm": dm, "EA": EA, "dLm": dL, "dLmm": dL * 1000}
    sci(out, "A", A, 3)
    return {"answer": dL * 1000, "vals": out}


# ---- P.4 -------------------------------------------------------------------------------------------
def p4(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "work":
            cosv = {0: F(1), 60: F(1, 2)}[q["th"]]
            assert math.isclose(float(cosv), cosd(q["th"]), abs_tol=1e-12)
            W = q["F"] * q["d"] * cosv
            return {"answer": float(W), "vals": {"cosv": float(cosv), "W": float(W)}}
        KE = F(q["m"] * q["v"] ** 2, 2)
        vals = {"v2": q["v"] ** 2, "KE": float(KE)}
        if q["kj"]:
            vals["KEk"] = float(KE / 1000)
            return {"answer": float(KE / 1000), "vals": vals}
        return {"answer": float(KE), "vals": vals}
    if lv == 2:
        if q["kind"] == "slide":
            twogh = 2 * G0 * Fd(q["h"])
            v = math.sqrt(twogh)
            return {"answer": v, "vals": {"twogh": float(twogh), "v": v}}
        v02 = q["v0"] ** 2
        Hh = v02 / (2 * g)
        return {"answer": Hh, "vals": {"v02": v02, "Hh": Hh}}
    if q["kind"] == "loss":
        m, h, d, f = q["m"], q["h"], q["d"], q["f"]
        PE = m * G0 * h
        loss = f * d
        KE = PE - loss
        assert 0 < loss <= F(8, 10) * PE
        v = math.sqrt(2 * KE / m)
        return {"answer": v, "vals": {"PE": float(PE), "loss": loss, "KE": float(KE), "v": v}}
    m, h, t, eta = q["m"], q["h"], q["t"], q["eta"]
    W = m * G0 * h
    Pout = W / t
    e = F(eta, 100)
    assert 0 < e < 1
    Pin = Pout / e
    return {"answer": float(Pin / 1000), "vals": {"W": float(W), "Pout": float(Pout), "e": float(e), "Pin": float(Pin), "Pk": float(Pin / 1000)}}


# ---- P.5 -------------------------------------------------------------------------------------------
def p5(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        dts, mkg = F(q["dt"], 1000), F(q["mg"], 1000)
        J = q["F"] * dts
        v = J / mkg
        assert v.denominator == 1 and 5 <= v <= 60
        return {"answer": float(v), "vals": {"dts": float(dts), "mkg": float(mkg), "J": float(J), "v": float(v)}}
    if lv == 2:
        m1, m2, v1, v2 = q["m1"], q["m2"], q["v1"], q["v2"]
        assert v1 > v2, "the carts must meet"
        vf = sp.Symbol("vf")
        sol = sp.solve(sp.Eq(m1 * v1 + m2 * v2, (m1 + m2) * vf), vf)[0]
        vfq = F(str(sol))
        return {"answer": float(vfq), "vals": {"p1": m1 * v1, "p2": m2 * v2, "p": m1 * v1 + m2 * v2, "mt": m1 + m2, "vf": fr(vfq)}}
    if q["kind"] == "elastic":
        m1, m2, v1, v2 = q["m1"], q["m2"], q["v1"], q["v2"]
        a, b = sp.symbols("a b")
        sols = sp.solve([sp.Eq(m1 * v1 + m2 * v2, m1 * a + m2 * b),
                         sp.Eq(sp.Rational(m1, 2) * v1 ** 2 + sp.Rational(m2, 2) * v2 ** 2, sp.Rational(m1, 2) * a ** 2 + sp.Rational(m2, 2) * b ** 2)], [a, b], dict=True)
        sols = [s_ for s_ in sols if s_[a] != v1]  # drop the trivial "no collision" root
        assert len(sols) == 1
        v1f, v2f = F(str(sols[0][a])), F(str(sols[0][b]))
        p_ = m1 * v1 + m2 * v2
        dv = v1 - v2
        return {"answer": [float(v1f), float(v2f)], "vals": {"p": p_, "dv": dv, "m2dv": m2 * dv, "rhs": p_ - m2 * dv, "mt": m1 + m2,
                                                           "v1f": fr(v1f), "v2f": fr(v2f), "KE": float(F(m1 * v1 ** 2 + m2 * v2 ** 2, 2))}}
    t1, t2, t3, Fm, m, u = q["t1"], q["t2"], q["t3"], q["Fm"], q["m"], q["u"]
    J = poly_area([(0, 0), (t1, Fm), (t2, Fm), (t3, 0)])
    dv = J / m
    vals = {"A1": F(t1 * Fm, 2), "w": t2 - t1, "A2": (t2 - t1) * Fm, "b": t3 - t2, "A3": F((t3 - t2) * Fm, 2), "tot": J, "dv": dv, "v": u + dv}
    return {"answer": float(u + dv), "vals": {k: float(v) for k, v in vals.items()}}


# ---- P.6 -------------------------------------------------------------------------------------------
GN = 6.674e-11


def p6(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "a":
            a = F(q["v"] ** 2, q["rr"])
            return {"answer": float(a), "vals": {"v2": q["v"] ** 2, "a": float(a)}}
        Fc = F(q["m"] * q["v"] ** 2) / Fd(q["rr"])
        assert terminating(Fc, 2)
        return {"answer": float(Fc), "vals": {"mv2": q["m"] * q["v"] ** 2, "Fc": float(Fc)}}
    if lv == 2:
        if q["kind"] == "curve":
            prod = Fd(q["mu"]) * G0 * q["rr"]
            v = math.sqrt(prod)
            return {"answer": v, "vals": {"prod": float(prod), "v": v}}
        m, rr, v = Fd(q["m"]), Fd(q["rr"]), q["v"]
        W = m * G0
        Fc = m * v * v / rr
        return {"answer": float(W + Fc), "vals": {"W": float(W), "Fc": float(Fc), "T": float(W + Fc)}}
    if q["kind"] == "surface":
        Mp = q["a"] * 10 ** q["e"]
        R = q["Rkm"] * 1000
        rho = Mp / (4 / 3 * math.pi * R ** 3)
        assert 700 <= rho <= 12000, "implausible planet density"
        gg = GN * Mp / R ** 2
        out = {"gg": gg}
        sci(out, "R", R)
        sci(out, "R2", R ** 2)
        sci(out, "GM", GN * Mp)
        return {"answer": gg, "vals": out}
    h = q["h"]
    rkm = 6371 + h
    R = rkm * 1000
    GM = GN * 5.972e24
    v = math.sqrt(GM / R)
    out = {"rkm": rkm, "v": v, "vk": v / 1000}
    sci(out, "r", R)
    sci(out, "GM", GM)
    assert 6500 < v < 7900, "orbits 200–2000 km up have speeds of 6.9–7.8 km/s"
    if q["kind"] == "T":
        Ts = 2 * math.pi * math.sqrt(R ** 3 / GM)  # Kepler's third law directly
        out.update({"Ts": Ts, "Tmin": Ts / 60})
        return {"answer": Ts / 60, "vals": out}
    return {"answer": v / 1000, "vals": out}


# ---- P.orbits --------------------------------------------------------------------------------------
def porbits(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "k":
            k = q["k"]
            gr = g / k ** 2
            vals = {"k2": k * k, "gr": gr}
            if k != 2:
                vals["alt"] = k - 1
            return {"answer": gr, "vals": vals}
        rkm = 6371 + q["h"]
        ratio = 6371 / rkm
        return {"answer": g * ratio ** 2, "vals": {"rkm": rkm, "ratio": ratio, "ratio2": ratio ** 2, "gr": g * ratio ** 2}}
    if lv == 2:
        Mp = q["a"] * 10 ** q["e"]
        R = q["Rkm"] * 1000
        assert 700 <= Mp / (4 / 3 * math.pi * R ** 3) <= 12000
        v = math.sqrt(2 * GN * Mp / R)
        # escape speed is √2 times the orbital speed at the surface
        assert math.isclose(v, math.sqrt(2) * math.sqrt(GN * Mp / R))
        out = {"v": v, "vk": v / 1000}
        sci(out, "twoGM", 2 * GN * Mp)
        sci(out, "R", R)
        sci(out, "ratio", 2 * GN * Mp / R, 4)
        return {"answer": v / 1000, "vals": out}
    if q["kind"] == "sun":
        a = sp.nsimplify(q["a"])
        T = sp.sqrt(a ** 3)  # T² = a³ in years and AU
        assert T.is_rational
        Tq = F(str(T))
        return {"answer": float(Tq), "vals": {"sqa": float(F(str(sp.sqrt(a)))), "T": float(Tq)}}
    ratio = F(q["aB"], q["aA"])
    s = F(str(sp.sqrt(sp.Rational(ratio.numerator, ratio.denominator))))
    T2 = q["T1"] * s ** 3
    assert (T2 / q["T1"]) ** 2 == ratio ** 3  # Kepler's third law
    return {"answer": float(T2), "vals": {"ratio": fr(ratio), "s": fr(s), "s3": fr(s ** 3), "T2": fr(T2)}}


# ---- P.rot-kinematics ------------------------------------------------------------------------------
def protk(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "rpm":
            k = F(q["rpm"] * 2, 60)  # ω/π
            return {"answer": float(k) * math.pi, "vals": {"k": fr(k), "w": float(k) * math.pi}}
        rm = F(q["rc"], 100)
        return {"answer": float(rm * q["w"]), "vals": {"rm": float(rm), "v": float(rm * q["w"])}}
    if lv == 2:
        a = Fd(q["a"])
        th = F(q["w0"] ** 2) / (2 * a)
        return {"answer": float(th) / (2 * math.pi), "vals": {"sq": q["w0"] ** 2, "twoA": float(2 * a), "th": float(th), "rev": float(th) / (2 * math.pi)}}
    t1, t2, t3, Y = q["t1"], q["t2"], q["t3"], q["Y"]
    if q["kind"] == "rev":
        tot = poly_area([(0, 0), (t1, Y), (t2, Y), (t3, 0)])
        vals = {"A1": F(t1 * Y, 2), "w": t2 - t1, "A2": (t2 - t1) * Y, "b": t3 - t2, "A3": F((t3 - t2) * Y, 2), "tot": tot}
        vals = {k: float(v) for k, v in vals.items()}
        vals["rev"] = float(tot) / (2 * math.pi)
        return {"answer": vals["rev"], "vals": vals}
    if q["phase"] == "up":
        acc = F(Y, t1)
        return {"answer": float(acc), "vals": {"acc": fr(acc)}}
    acc = F(-Y, t3 - t2)
    return {"answer": float(acc), "vals": {"b": t3 - t2, "acc": fr(acc)}}


# ---- P.torque --------------------------------------------------------------------------------------
def ptorque(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        sinv = F(str(sp.sin(sp.pi * q["phi"] / 180)))
        T = Fd(q["rr"]) * q["F"] * sinv
        return {"answer": float(T), "vals": {"sinv": float(sinv), "T": float(T)}}
    if lv == 2:
        m1, d1 = q["m1"], Fd(q["d1"])
        prod = m1 * d1
        if q["kind"] == "d":
            d2 = prod / q["m2"]
            assert 0 < d2 <= 3, "the child must fit on a 3 m half-plank"
            return {"answer": float(d2), "vals": {"prod": float(prod), "d2": float(d2)}}
        m2 = prod / Fd(q["d2"])
        assert 15 <= m2 <= 80
        return {"answer": float(m2), "vals": {"prod": float(prod), "m2": float(m2)}}
    Lp, Wp, W, x = q["Lp"], q["Wp"], q["W"], Fd(q["x"])
    A, B = sp.symbols("A B")
    sol = sp.solve([sp.Eq(A + B, Wp + W), sp.Eq(B * Lp - Wp * sp.Rational(Lp, 2) - W * sp.nsimplify(float(x)), 0)], [A, B])
    Aq, Bq = F(str(sol[A])), F(str(sol[B]))
    assert Aq > 0 and Bq > 0
    vals = {"half": Lp / 2, "t1": float(Wp * F(Lp, 2)), "t2": float(W * x), "sum": float(Wp * F(Lp, 2) + W * x), "B": float(Bq)}
    if q["ask"] == "A":
        vals.update({"tot": Wp + W, "A": float(Aq)})
        return {"answer": float(Aq), "vals": vals}
    return {"answer": float(Bq), "vals": vals}


# ---- P.inertia -------------------------------------------------------------------------------------
def pinertia(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        vals = {}
        I = F(0)
        for i, (m, x) in enumerate(zip(q["ms"], q["pos"])):
            m, x = Fd(m), Fd(x)
            vals[f"sq{i}"] = float(x * x)
            vals[f"t{i}"] = float(m * x * x)
            I += m * x * x
        vals["I"] = float(I)
        return {"answer": float(I), "vals": vals}
    if lv == 2:
        Mk, L = q["M"], Fd(q["len"])
        x = sp.Symbol("x")
        if q["shape"] == "rod":
            # integrate r² dm along the rod about its center
            Icm = F(str(sp.integrate(x ** 2 * sp.Rational(Mk) / sp.Rational(L.numerator, L.denominator), (x, -sp.Rational(L.numerator, 2 * L.denominator), sp.Rational(L.numerator, 2 * L.denominator)))))
            d = L / 2 if q["end"] else L / 4  # axis through an end, or a quarter of the way along
        else:
            c = F(1, 2) if q["shape"] == "disk" else F(2, 5)
            Icm = c * Mk * L * L
            d = L
        I = Icm + Mk * d * d
        return {"answer": float(I), "vals": {"dd": fr(d), "Icm": fr(Icm), "Md2": fr(Mk * d * d), "I": fr(I)}}
    Mk, L, m, m2 = q["M"], Fd(q["L"]), Fd(q["m"]), Fd(q["m2"])
    Icm = Mk * L * L / 12
    Irod = Icm + Mk * (L / 2) ** 2
    assert Irod == Mk * L * L / 3
    Im, Im2 = m * L * L, m2 * (L / 2) ** 2
    I = Irod + Im + Im2
    Mt = Mk + m + m2
    vals = {"Icm": float(Icm), "half": float(L / 2), "shift": float(Mk * (L / 2) ** 2), "Irod": float(Irod), "Im": float(Im), "I": float(I), "Mt": float(Mt), "Rg": math.sqrt(I / Mt)}
    if m2:
        vals["Im2"] = float(Im2)
    return {"answer": vals["Rg"], "vals": vals}


# ---- P.rot-dynamics --------------------------------------------------------------------------------
def protd(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "direct":
            a = q["T"] / Fd(q["I"])
            return {"answer": float(a), "vals": {"a": float(a)}}
        R = Fd(q["R"])
        T, I = q["F"] * R, F(q["M"]) * R * R / 2
        return {"answer": float(T / I), "vals": {"T": float(T), "I": float(I), "a": float(T / I)}}
    if lv == 2:
        m, Mk, R = Fd(q["m"]), q["M"], Fd(q["R"])
        a, T = sp.symbols("a T")
        I = sp.Rational(Mk, 2) * sp.nsimplify(float(R)) ** 2
        mm = sp.nsimplify(float(m))
        sol = sp.solve([sp.Eq(mm * sp.nsimplify("9.81") - T, mm * a), sp.Eq(T * sp.nsimplify(float(R)), I * a / sp.nsimplify(float(R)))], [a, T])
        aq = F(str(sol[a]))
        return {"answer": float(aq), "vals": {"halfM": Mk / 2, "W": float(m * G0), "den": float(m + F(Mk, 2)), "a": float(aq)}}
    if q["kind"] == "clay":
        Mk, R, w1, m = q["M"], Fd(q["R"]), q["w1"], Fd(q["m"])
        I1 = F(Mk, 2) * R * R
        I2 = I1 + m * R * R
        w2 = w1 * I1 / I2
        assert w2 < w1
        return {"answer": float(w2), "vals": {"I1": float(I1), "mr2": float(m * R * R), "I2": float(I2), "w2": float(w2)}}
    I1, f1, I2 = Fd(q["I1"]), Fd(q["f1"]), Fd(q["I2"])
    return {"answer": float(f1 * I1 / I2), "vals": {"ratio": float(I1 / I2), "f2": float(f1 * I1 / I2)}}


# ---- P.rolling -------------------------------------------------------------------------------------
CSHAPE = {"hoop": F(1), "disk": F(1, 2), "sphere": F(2, 5), "shell": F(2, 3)}


def prolling(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        w = q["w"]
        if q["kind"] == "I":
            KE = Fd(q["I"]) * w * w / 2
            return {"answer": float(KE), "vals": {"KE": float(KE)}}
        I = F(q["M"]) * Fd(q["R"]) ** 2 / 2
        return {"answer": float(I * w * w / 2), "vals": {"I": float(I), "KE": float(I * w * w / 2)}}
    c = CSHAPE[q["shape"]]
    if lv == 2:
        h = Fd(q["h"])
        num2 = 2 * G0 * h
        v = math.sqrt(num2 / (1 + c))
        # direct energy check: Mgh = ½Mv² + ½(cMR²)(v/R)²
        Mk = q["M"]
        assert math.isclose(Mk * g * float(h), 0.5 * Mk * v * v + 0.5 * float(c) * Mk * v * v)
        return {"answer": v, "vals": {"c": fr(c), "opc": fr(1 + c), "num2": float(num2), "v": v}}
    gs = g * sind(q["th"])
    a = gs / float(1 + c)
    t = math.sqrt(2 * q["d"] / a)
    return {"answer": t, "vals": {"c": fr(c), "opc": fr(1 + c), "gs": gs, "a": a, "t": t}}


# ---- P.7 -------------------------------------------------------------------------------------------
def p7(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        ratio = q["m"] / q["k"]
        T = 2 * math.pi * math.sqrt(ratio)
        return {"answer": T, "vals": {"ratio": ratio, "sq": math.sqrt(ratio), "T": T}}
    if lv == 2:
        m, k, A, x = Fd(q["m"]), Fd(q["k"]), q["A"], q["x"]
        w2 = k / m
        w = sp.sqrt(sp.Rational(w2.numerator, w2.denominator))
        assert w.is_integer
        diff = A * A - x * x
        s = sp.sqrt(diff)
        assert s.is_integer
        v = F(int(w)) * F(int(s), 100)
        # energy check: ½kA² = ½mv² + ½kx² (lengths in m)
        assert k * F(A, 100) ** 2 == m * v * v + k * F(x, 100) ** 2
        return {"answer": float(v), "vals": {"w2": float(w2), "w": int(w), "diff": diff, "s": int(s), "sm": int(s) / 100, "v": float(v)}}
    A, T, m = q["A"], q["T"], q["m"]
    if q["kind"] == "k":
        k = m * (2 * math.pi / T) ** 2
        return {"answer": k, "vals": {"T2": T * T, "kk": k}}
    return {"answer": A * 2 * math.pi / T, "vals": {"vmax": A * 2 * math.pi / T}}


# ---- P.pendulum ------------------------------------------------------------------------------------
def ppend(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "T":
            L = q["L"]
            T = 2 * math.pi * math.sqrt(L / g)
            return {"answer": T, "vals": {"ratio": L / g, "sq": math.sqrt(L / g), "T": T}}
        T = q["T"]
        L = g * T * T / (4 * math.pi ** 2)
        assert math.isclose(2 * math.pi * math.sqrt(L / g), T)
        return {"answer": L * 100, "vals": {"T2": T * T, "nm": g * T * T, "den": 4 * math.pi ** 2, "L": L, "Lcm": L * 100}}
    if lv == 2:
        L, nsw, t = q["L"], q["nsw"], q["t"]
        T = t / nsw
        gm = 4 * math.pi ** 2 * L / T ** 2
        assert 9.6 < gm < 10.0, "a plausible measurement of g"
        return {"answer": gm, "vals": {"T": T, "T2": T * T, "nm": 4 * math.pi ** 2 * L, "gm": gm}}
    shape, Mk, ln = q["shape"], q["M"], q["len"]
    table = {  # (I_cm / (M ln²), d / ln)
        "rodEnd": (F(1, 12), F(1, 2)), "rodQuarter": (F(1, 12), F(1, 4)), "hoop": (F(1), F(1)), "diskRim": (F(1, 2), F(1)),
    }
    ci, cd = table[shape]
    Icm = float(ci) * Mk * ln * ln
    d = float(cd) * ln
    I = Icm + Mk * d * d
    mgd = Mk * g * d
    T = 2 * math.pi * math.sqrt(I / mgd)
    if shape == "rodEnd":  # textbook result: T = 2π√(2L/(3g))
        assert math.isclose(T, 2 * math.pi * math.sqrt(2 * ln / (3 * g)))
    return {"answer": T, "vals": {"d": d, "Icm": Icm, "I": I, "mgd": mgd, "ratio": I / mgd, "T": T}}


# ---- P.waves ---------------------------------------------------------------------------------------
def pwaves(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "rope":
            L = F(q["v"]) / Fd(q["f"])
            return {"answer": float(L), "vals": {"L": float(L)}}
        if q["kind"] == "radio":
            L = F(3 * 10 ** 8, q["f"] * 10 ** 6)
            return {"answer": float(L), "vals": {"L": float(L)}}
        v = F(q["L"], q["T"])
        return {"answer": float(v), "vals": {"v": float(v)}}
    if lv == 2:
        mukg = F(q["mu"], 1000)
        v2 = Fd(q["F"]) / mukg
        v = sp.sqrt(sp.Rational(v2.numerator, v2.denominator))
        assert v.is_integer
        f = q["nh"] * F(int(v)) / (2 * Fd(q["L"]))
        return {"answer": float(f), "vals": {"mukg": float(mukg), "v2": float(v2), "v": int(v), "f": float(f)}}
    if q["kind"] == "graph":
        L = Fd(q["lamP"])
        x = sp.Symbol("x")
        # crests of A sin(2πx/λ): where the derivative vanishes and the value is +A
        crests = sorted(F(str(c)) for c in sp.solve(sp.cos(2 * sp.pi * x / sp.nsimplify(float(L))), x) if sp.sin(2 * sp.pi * c / sp.nsimplify(float(L))) == 1)
        c1 = crests[0]
        c2 = c1 + L
        assert c1 == L / 4
        return {"answer": float(q["f"] * L), "vals": {"c1": float(c1), "c2": float(c2), "L": float(L), "v": float(q["f"] * L)}}
    sp_ = F(q["w"], q["k"])
    vel = -q["sgn"] * sp_  # kx − ωt moves toward +x
    return {"answer": float(vel), "vals": {"sp": float(sp_), "vel": float(vel)}}


# ---- P.sound ---------------------------------------------------------------------------------------
def psound(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        I = q["cc"] * 10.0 ** (-q["k"])
        b = 10 * math.log10(I / 1e-12)
        e = 12 - q["k"]
        if q["cc"] == 1:
            return {"answer": b, "vals": {"e": e, "b": b}}
        return {"answer": b, "vals": {"e": e, "sum": math.log10(q["cc"]) + e, "b": b}}
    if lv == 2:
        b1 = q["b1"]
        if q["kind"] == "n":
            I1 = 1e-12 * 10 ** (b1 / 10)
            b = 10 * math.log10(q["nn"] * I1 / 1e-12)
            return {"answer": b, "vals": {"add": b - b1, "b": b}}
        r1, r2 = Fd(q["r1"]), Fd(q["r2"])
        qq = (r1 / r2) ** 2
        I2 = 1e-12 * 10 ** (b1 / 10) * float(qq)
        b2 = 10 * math.log10(I2 / 1e-12)
        return {"answer": b2, "vals": {"q": fr(qq), "dd": b2 - b1, "b2": b2}}
    f, vs, v = q["f"], q["vs"], 343
    if q["kind"] == "obs":
        f1 = f * (v + vs) / v
        return {"answer": f1, "vals": {"num2": v + vs, "f1": f1}}
    fA, fR = f * v / (v - vs), f * v / (v + vs)
    assert fA > f > fR
    if q["kind"] == "pass":
        return {"answer": fA - fR, "vals": {"dA": v - vs, "fA": fA, "dR": v + vs, "fR": fR, "df": fA - fR}}
    if q["kind"] == "app":
        return {"answer": fA, "vals": {"dA": v - vs, "fA": fA}}
    return {"answer": fR, "vals": {"dR": v + vs, "fR": fR}}


# ---- P.8 -------------------------------------------------------------------------------------------
def p8(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "depth":
            Pa = q["dens"] * G0 * q["h"]
            return {"answer": float(Pa / 1000), "vals": {"Pa": float(Pa), "kPa": float(Pa / 1000)}}
        Fw = q["m"] * G0
        Pa = Fw / (q["A"] * F(1, 10000))
        return {"answer": float(Pa / 10 ** 6), "vals": {"F": float(Fw), "Pa": float(Pa), "MPa": float(Pa / 10 ** 6)}}
    if lv == 2:
        if q["kind"] == "hyd":
            W = q["M"] * G0
            A1, A2 = sp.pi * q["d1"] ** 2 / 4, sp.pi * q["d2"] ** 2 / 4
            ratio = F(str(sp.nsimplify(A1 / A2)))
            return {"answer": float(W * ratio), "vals": {"W": float(W), "q": fr(ratio), "F1": float(W * ratio)}}
        dP = G0 * q["h"]  # kPa, since ρ = 1000
        return {"answer": float(F("101.3") + dP), "vals": {"dP": float(dP), "P": float(F("101.3") + dP)}}
    if q["kind"] == "float":
        frac_ = F(q["rw"], 1000)
        assert frac_ < 1, "the block must float"
        d = q["H"] * frac_
        return {"answer": float(q["H"] - d), "vals": {"fr_": float(frac_), "d": float(d), "above": float(q["H"] - d)}}
    Wair, Wwat = Fd(q["Wair"]), Fd(q["Wwat"])
    FB = Wair - Wwat
    ratio = Wair / FB
    rho = 1000 * ratio
    assert 2000 < rho < 12500, "a plausible metal"
    return {"answer": float(rho), "vals": {"FB": float(FB), "ratio": float(ratio), "rhoS": float(rho)}}


# ---- P.9 -------------------------------------------------------------------------------------------
def p9(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        A1, A2 = sp.pi * q["d1"] ** 2 / 4, sp.pi * q["d2"] ** 2 / 4
        v2 = F(str(sp.nsimplify(q["v1"] * A1 / A2)))
        return {"answer": float(v2), "vals": {"q": fr(F(q["d1"] ** 2, q["d2"] ** 2)), "v2": fr(v2)}}
    if lv == 2:
        h, d = q["h"], q["d"]
        v = math.sqrt(2 * g * h)
        A = math.pi * (d / 100) ** 2 / 4
        QL = A * v * 1000
        return {"answer": QL, "vals": {"x": 2 * g * h, "v": v, "Acm": A * 1e4, "QL": QL}}
    d1, d2, v1, P1, rise = q["d1"], q["d2"], q["v1"], q["P1"], q["rise"]
    v2 = v1 * F(d1 * d1, d2 * d2)
    rho = 1000
    P2 = F(P1 * 1000) + F(rho, 2) * (v1 ** 2 - v2 ** 2) - rho * G0 * rise  # Pa
    vals = {"q": fr(F(d1 * d1, d2 * d2)), "v2": float(v2), "v12": v1 ** 2, "v22": float(v2 ** 2), "dP": float(F(rho, 2) * (v1 ** 2 - v2 ** 2)),
            "dPk": float(F(rho, 2) * (v1 ** 2 - v2 ** 2) / 1000), "P2": float(P2 / 1000)}
    if rise:
        vals["rg"] = float(rho * G0 * rise / 1000)
    assert P2 > 0
    return {"answer": float(P2 / 1000), "vals": vals}


# ---- P.10 ------------------------------------------------------------------------------------------
def p10(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        hm = Fd(q["h"]) / 1000
        grad = Fd(q["U"]) / hm
        return {"answer": float(Fd(q["mu"]) * grad), "vals": {"hm": float(hm), "grad": float(grad), "tau": float(Fd(q["mu"]) * grad)}}
    if lv == 2:
        Re = q["dens"] * q["v"] * (q["D"] / 100) / q["mu"]
        reg = 0 if Re < 2300 else 1 if Re <= 4000 else 2
        assert abs(Re - 2300) > 50 and abs(Re - 4000) > 50
        return {"answer": reg, "vals": {"Dm": q["D"] / 100, "Re": Re}}
    a, b = q["a"], q["b"]
    r1, r2 = sp.Integer(b), sp.Integer(a)  # r2/r1 = a/b
    if q["kind"] == "dP":
        Q = sp.symbols("Q")
        dP = lambda r: 8 * Q / (sp.pi * r ** 4)  # from Poiseuille with μ = L = 1
        fac = F(str(sp.simplify(dP(r2) / dP(r1))))
        return {"answer": float(fac), "vals": {"fac": fr(fac)}}
    f4 = F(a, b) ** 4
    return {"answer": float(q["Q1"] * f4), "vals": {"f4": fr(f4), "Q2": float(q["Q1"] * f4)}}


# ---- P.11 ------------------------------------------------------------------------------------------
def p11(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        Fd_ = F(1, 2) * F("1.2") * Fd(q["Cd"]) * Fd(q["A"]) * q["v"] ** 2
        return {"answer": float(Fd_), "vals": {"v2": q["v"] ** 2, "F": float(Fd_)}}
    if lv == 2:
        m, Cd, A = q["m"], q["Cd"], q["A"]
        v = math.sqrt(2 * m * g / (1.2 * Cd * A))
        assert math.isclose(0.5 * 1.2 * Cd * A * v * v, m * g)
        return {"answer": v, "vals": {"num2": 2 * m * g, "den": 1.2 * Cd * A, "q": v * v, "v": v}}
    if q["kind"] == "power":
        qq = F(q["v2"], q["v1"])
        return {"answer": float(q["P1"] * qq ** 3), "vals": {"q": fr(qq), "q3": fr(qq ** 3), "P2": float(q["P1"] * qq ** 3)}}
    rm = q["rr"] * 1e-6
    v = (4 / 3 * math.pi * rm ** 3 * 1000 * g) / (6 * math.pi * 1.8e-5 * rm)  # weight = Stokes drag
    out = {"v": v, "vmm": v * 1000}
    sci(out, "r2", rm * rm)
    sci(out, "num2", 2 * rm * rm * 1000 * g)
    sci(out, "den", 9 * 1.8e-5)
    Re = 1.2 * v * 2 * rm / 1.8e-5
    assert Re < 1, "Stokes drag needs a small Reynolds number"
    return {"answer": v * 1000, "vals": out}


# ---- P.12 ------------------------------------------------------------------------------------------
def p12(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        dT = q["T2"] - q["T1"]
        Q = Fd(q["m"]) * q["cc"] * dT
        return {"answer": float(Q / 1000), "vals": {"dT": dT, "Q": float(Q), "Qk": float(Q / 1000)}}
    if lv == 2:
        Tf = sp.Symbol("Tf")
        m1, c1, T1, m2, T2 = sp.nsimplify(q["m1"]), q["c1"], q["T1"], sp.nsimplify(q["m2"]), q["T2"]
        sol = F(str(sp.solve(sp.Eq(m1 * c1 * (T1 - Tf), m2 * 4186 * (Tf - T2)), Tf)[0]))
        assert T2 < sol < T1
        C1, C2 = Fd(q["m1"]) * c1, Fd(q["m2"]) * 4186
        return {"answer": float(sol), "vals": {"C1": float(C1), "C2": float(C2), "a": float(C1 * T1), "b": float(C2 * T2), "ab": float(C1 * T1 + C2 * T2), "den": float(C1 + C2), "Tf": float(sol)}}
    m = Fd(q["m"])
    if q["kind"] == "ice":
        Q1, Q2, Q3 = m * 2100 * (0 - q["Ti"]), m * 334000, m * 4186 * q["Tf"]
        Q = Q1 + Q2 + Q3
        return {"answer": float(Q / 1000), "vals": {"Q1": float(Q1), "Q2": float(Q2), "Q3": float(Q3), "Q": float(Q), "Qk": float(Q / 1000)}}
    Q1, Q2 = m * 4186 * (100 - q["T"]), m * 2260000
    return {"answer": float((Q1 + Q2) / 1000), "vals": {"Q1": float(Q1), "Q2": float(Q2), "Q": float(Q1 + Q2), "Qk": float((Q1 + Q2) / 1000)}}


# ---- P.13 ------------------------------------------------------------------------------------------
def p13(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        Lm = Fd(q["L"]) / 1000
        Q = F("0.8") * Fd(q["A"]) * q["d"] / Lm
        return {"answer": float(Q), "vals": {"Lm": float(Lm), "Q": float(Q)}}
    k1, L1, k2, L2, A, Tin, Tout = q["k1"], q["L1"], q["k2"], q["L2"], q["A"], q["Tin"], q["Tout"]
    R1, R2 = L1 / (k1 * A), L2 / (k2 * A)
    Qd = (Tin - Tout) / (R1 + R2)
    vals = {"R1": R1, "R2": R2, "Rt": R1 + R2, "d": Tin - Tout, "Q": Qd}
    if lv == 2:
        return {"answer": Qd, "vals": vals}
    # the same flux through layer 2 must take the boundary down to Tout
    Ti = Tin - Qd * R1
    assert math.isclose(Ti - Qd * R2, Tout, abs_tol=1e-9) and Tout < Ti < Tin
    vals.update({"drop": Qd * R1, "Ti": Ti})
    return {"answer": Ti, "vals": vals}


# ---- P.14 ------------------------------------------------------------------------------------------
def p14(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        d = q["Ts"] - q["Tinf"]
        Q = q["h"] * Fd(q["A"]) * d
        return {"answer": float(Q), "vals": {"d": d, "Q": float(Q)}}
    if lv == 2:
        D = q["T0"] - q["Tinf"]
        x = q["t"] / q["tau"]
        return {"answer": q["Tinf"] + D * math.exp(-x), "vals": {"D": D, "x": x, "ex": math.exp(-x), "T": q["Tinf"] + D * math.exp(-x)}}
    t1, Tinf, T0 = q["t1"], q["Tinf"], q["T0"]
    D = T0 - Tinf
    tau = t1 / math.log(2)
    base = {"D": D, "half": D / 2, "T1": Tinf + D / 2, "tau": tau}
    if q["kind"] == "time":
        # solve Tinf + D·e^(−t/τ) = Tk for t, then confirm it lands on the target
        t = tau * math.log(D / (q["Tk"] - Tinf))
        assert math.isclose(Tinf + D * math.exp(-t / tau), q["Tk"])
        k = round(t / t1)
        assert abs(t - k * t1) < 1e-6
        gap = q["Tk"] - Tinf
        base.update({"gap": gap, "k": k, "p2": 2 ** k, "t": k * t1})
        return {"answer": k * t1, "vals": base}
    k = q["t"] // t1
    assert q["t"] == k * t1
    T = Tinf + D * math.exp(-q["t"] / tau)
    base.update({"gap": T - Tinf, "k": k, "p2": 2 ** k, "Tk": T})
    return {"answer": T, "vals": base}


# ---- P.15 ------------------------------------------------------------------------------------------
def p15_ratio(shape):
    r = sp.Symbol("r", positive=True)
    V, A = {"sphere": (sp.Rational(4, 3) * sp.pi * r ** 3, 4 * sp.pi * r ** 2), "cylinder": (sp.pi * r ** 2, 2 * sp.pi * r), "cube": (r ** 3, 6 * r ** 2)}[shape]
    return F(str(sp.simplify(V / A / r)))


def p15(p):
    q, lv = p["params"], p["level"]
    cf = p15_ratio(q["shape"])
    if lv == 1:
        return {"answer": float(cf * q["x"]), "vals": {"Lc": fr(cf * q["x"])}}
    k, h = Fd(q["k"]), q["h"]
    if lv == 2:
        Lc = cf * q["x"] / 1000
        Bi = h * Lc / k
        return {"answer": float(Bi), "vals": {"Lc": float(Lc), "Bi": float(Bi)}}
    Lc = F(1, 10) * k / h
    x = Lc / cf
    assert h * (cf * x) / k == F(1, 10)
    return {"answer": float(x * 1000), "vals": {"Lc": float(Lc), "inv": float(1 / cf), "x": float(x), "xmm": float(x * 1000)}}


# ---- P.16 ------------------------------------------------------------------------------------------
def ra_air(dT, L):
    return g * (1 / 300) * dT * L ** 3 / (1.6e-5 * 2.2e-5)


def p16(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        h = Fd(q["Nu"]) * Fd(q["k"]) / Fd(q["L"])
        return {"answer": float(h), "vals": {"h": float(h)}}
    if lv == 2:
        L = q["Lmm"] / 1000
        Ra = ra_air(q["d"], L)
        out = {"L": L, "Ra": Ra}
        sci(out, "L3", L ** 3)
        sci(out, "num2", g * q["d"] * L ** 3 / 300)
        sci(out, "na", 1.6e-5 * 2.2e-5)
        assert abs(Ra - 1708) > 0.05 * 1708
        return {"answer": Ra, "vals": out}
    L, w, d = q["L"], q["w"], q["d"]
    Ra = ra_air(d, L)
    root = Ra ** 0.25 if Ra < 1e9 else Ra ** (1 / 3)
    Nu = (0.59 if Ra < 1e9 else 0.10) * root
    h = Nu * 0.026 / L
    Q = h * L * w * d
    out = {"root": root, "Nu": Nu, "h": h, "A": L * w, "Q": Q}
    sci(out, "Ra", Ra)
    assert 1 < h < 20, "natural-convection coefficients in air are a few W/(m²·K)"
    return {"answer": Q, "vals": out}


# ---- P.17 ------------------------------------------------------------------------------------------
SB = 5.670e-8


def p17(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "lam":
            L = 2.898e-3 / q["T"] * 1e9
            return {"answer": L, "vals": {"L": L}}
        T = 2.898e-3 / (q["L"] * 1e-9)
        return {"answer": T, "vals": {"T": T}}
    if lv == 2:
        P = q["e"] * SB * q["A"] * q["T"] ** 4
        out = {"Pw": P}
        sci(out, "T4", q["T"] ** 4, 4)
        return {"answer": P, "vals": out}
    TsK, TrK = q["Ts"] + 273.15, q["Tr"] + 273.15
    P = 0.97 * SB * q["A"] * (TsK ** 4 - TrK ** 4)
    assert 50 < P < 250
    out = {"TsK": TsK, "TrK": TrK, "Pn": P}
    sci(out, "Ts4", TsK ** 4, 4)
    sci(out, "Tr4", TrK ** 4, 4)
    sci(out, "diff", TsK ** 4 - TrK ** 4, 4)
    return {"answer": P, "vals": out}


# ---- P.18 ------------------------------------------------------------------------------------------
RG = 8.314


def p18(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "P":
            TK, Vm = q["Tc"] + 273.15, q["Vl"] / 1000
            Pa = q["nm"] * RG * TK / Vm
            return {"answer": Pa / 1000, "vals": {"TK": TK, "Vm": Vm, "Pa": Pa, "kPa": Pa / 1000}}
        TK = q["Tc"] + 273.15
        PV = q["P"] * 1000 * q["Vl"] / 1000
        nm = PV / (RG * TK)
        return {"answer": nm, "vals": {"Ppa": q["P"] * 1000, "Vm": q["Vl"] / 1000, "TK": TK, "PV": PV, "nm": nm}}
    if lv == 2:
        dV = q["V2"] - q["V1"]
        W = q["P"] * dV  # kPa·L = J
        return {"answer": q["Q"] - W, "vals": {"dV": dV, "W": W, "dU": q["Q"] - W}}
    V1, V2, P1, P2 = q["V1"], q["V2"], q["P1"], q["P2"]
    pts = [(V1, P1), (V1, P2), (V2, P1)] if q["tri"] else [(V1, P1), (V1, P2), (V2, P2), (V2, P1)]
    if not q["cw"]:
        pts = [pts[0]] + pts[1:][::-1]
    # work by the gas = ∮ P dV, summed edge by edge (trapezoids)
    W = sum(F(a[1] + b[1], 2) * (b[0] - a[0]) for a, b in zip(pts, pts[1:] + pts[:1]))
    area = poly_area(pts)
    assert abs(W) == area
    return {"answer": float(W), "vals": {"dV": V2 - V1, "dP": P2 - P1, "area": float(area), "W": float(W)}}


# ---- P.entropy -------------------------------------------------------------------------------------
def pentropy(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "K":
            Th, Tc = q["Th"], q["Tc"]
            vals = {}
        else:
            Th, Tc = q["thc"] + 273.15, q["tcc"] + 273.15
            vals = {"Th": Th, "Tc": Tc}
        eta = 1 - Tc / Th
        vals.update({"ratio": Tc / Th, "eta": eta, "pct": 100 * eta})
        return {"answer": 100 * eta, "vals": vals}
    if lv == 2:
        if q["kind"] == "melt":
            Q = Fd(q["m"]) * 334000
            return {"answer": float(Q) / 273.15, "vals": {"Q": float(Q), "dS": float(Q) / 273.15}}
        Q, Th, Tc = q["Q"], q["Th"], q["Tc"]
        tot = -Q / Th + Q / Tc
        assert tot > 0, "second law"
        return {"answer": tot, "vals": {"sH": Q / Th, "sC": Q / Tc, "tot": tot}}
    if q["kind"] in ("pump", "fridge"):
        if q["kind"] == "pump":
            Th, Tc = q["tin"] + 273.15, q["tout"] + 273.15
        else:
            Th, Tc = q["tout"] + 273.15, q["tin"] + 273.15
        dT = Th - Tc
        if q["kind"] == "pump":
            cop = Th / dT
            W = q["PH"] / cop
            assert math.isclose(q["PH"] - W, q["PH"] * Tc / Th)  # heat drawn from outside, Carnot balance
            return {"answer": W, "vals": {"Th": Th, "Tc": Tc, "dT": dT, "cop": cop, "Wk": W}}
        cop = Tc / dT
        W = q["PC"] / cop
        return {"answer": W, "vals": {"Th": Th, "Tc": Tc, "dT": dT, "cop": cop, "Ww": W}}
    Th, Tc = q["Th"], q["Tc"]
    carnot = 100 * (1 - Tc / Th)
    return {"answer": "yes" if q["claim"] < carnot else "no", "vals": {"ratio": Tc / Th, "carnot": carnot}}


# ---- P.19 ------------------------------------------------------------------------------------------
def p19(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        D, ue = q["D"], q["ue"]
        out = {}
        if q["kind"] == "L":
            x = 2 * D * q["t"]
            sci(out, "x", x)
            out["Lu"] = math.sqrt(x) * 10 ** ue
            return {"answer": out["Lu"], "vals": out}
        L = q["Lum"] * 10.0 ** (-ue)
        t = L * L / (2 * D)
        sci(out, "L2", L * L)
        sci(out, "twoD", 2 * D)
        out.update({"t": t, "tms": t * 1000})
        assert math.isclose(math.sqrt(2 * D * t), L)
        return {"answer": t * 1000, "vals": out}
    if lv == 2:
        dm = q["dmm"] / 1000
        grad = (q["C2"] - q["C1"]) / dm
        J = -q["D"] * grad
        out = {"dm": dm, "grad": grad, "Jmu": J * 1e6}
        sci(out, "J", J)
        assert J > 0
        return {"answer": J * 1e6, "vals": out}
    x, t = sp.symbols("x t")
    al, dx = q["al"], q["dx"]
    # the quadratic through the three points, and α times its second derivative
    xs, Ts = [-dx, 0, dx], [q["Tl"], q["Tm"], q["Tr"]]
    poly = sp.interpolate(list(zip(xs, Ts)), x)
    rate = F(str(sp.Rational(al) * sp.diff(poly, x, 2)))
    s_ = q["Tl"] - 2 * q["Tm"] + q["Tr"]
    return {"answer": float(rate), "vals": {"s": s_, "dx2": dx * dx, "rate": float(rate)}}


# ---- P.coulomb -------------------------------------------------------------------------------------
KC = 8.99e9


def pcoulomb(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        q1, q2, rm = q["q1"] * 1e-6, q["q2"] * 1e-6, q["rc"] / 100
        Fc = KC * abs(q1 * q2) / rm ** 2
        return {"answer": Fc, "vals": {"prod": abs(q["q1"] * q["q2"]), "kq": KC * abs(q1 * q2), "rm": rm, "r2": rm * rm, "F": Fc}}
    if lv == 2:
        if q["kind"] == "plates":
            dm = F(q["dmm"], 1000)
            E = q["Vv"] / dm
            Fm = q["q"] * F(1, 10 ** 9) * E * 1000  # N → mN
            return {"answer": float(Fm), "vals": {"dm": float(dm), "E": float(E), "FmN": float(Fm)}}
        Vv = KC * q["q"] * 1e-6 / q["rr"]
        return {"answer": Vv / 1000, "vals": {"kq": KC * q["q"] * 1e-6, "Vv": Vv, "kV": Vv / 1000}}
    q1, q2, D, x = q["q1"] * 1e-6, q["q2"] * 1e-6, q["D"], q["p"]
    # field as a vector sum: E = k q (x − x_i)/|x − x_i|³
    Ex = sum(KC * qi * (x - xi) / abs(x - xi) ** 3 for qi, xi in ((q1, 0), (q2, D)))
    r1, r2 = abs(x), abs(x - D)
    return {"answer": Ex / 1000, "vals": {"r1": r1, "r2": r2, "E1": KC * abs(q1) / r1 ** 2, "E2": KC * abs(q2) / r2 ** 2, "Ex": Ex, "Exk": Ex / 1000}}


# ---- P.20 ------------------------------------------------------------------------------------------
def p20(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "I":
            I = Fd(q["Vv"]) / q["R"]
            return {"answer": float(I), "vals": {"I": float(I)}}
        if q["kind"] == "P":
            Pw = F(q["Vv"] ** 2, q["R"])
            return {"answer": float(Pw), "vals": {"V2": q["Vv"] ** 2, "Pw": float(Pw)}}
        I = Fd(q["I"])
        return {"answer": float(I * I * q["R"]), "vals": {"I2": float(I * I), "Pw": float(I * I * q["R"])}}
    if lv == 2:
        R1, R2, R3, Vv = q["R1"], q["R2"], q["R3"], q["Vv"]
        Rp = 1 / (F(1, R2) + F(1, R3))
        I = Vv / (R1 + Rp)
        # Kirchhoff check: branch currents add up
        Vp = I * Rp
        assert Vp / R2 + Vp / R3 == I
        vals = {"prod": R2 * R3, "sum": R2 + R3, "Rp": float(Rp), "Rt": float(R1 + Rp), "I": float(I)}
        if q["ask"] == "P":
            vals["Pw"] = float(I * Vv)
            return {"answer": float(I * Vv), "vals": vals}
        return {"answer": float(I), "vals": vals}
    if q["kind"] == "cost":
        kW = F(q["Pw"], 1000)
        ht = Fd(q["hrs"]) * q["days"]
        E = kW * ht
        cost = E * Fd(q["price"])
        return {"answer": float(cost), "vals": {"kW": float(kW), "ht": float(ht), "E": float(E), "cost": float(cost)}}
    dm = q["d"] / 1000
    A = math.pi * dm ** 2 / 4
    R = 1.68e-8 * q["L"] / A
    out = {"dm": dm, "R": R}
    sci(out, "A", A, 4)
    return {"answer": R, "vals": out}


# ---- P.refraction ----------------------------------------------------------------------------------
def prefr(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "n":
            nn = 3.00e8 / (q["vm"] * 1e8)
            return {"answer": nn, "vals": {"nn": nn}}
        if q["kind"] == "v":
            vk = 3.00e8 / q["nn"] / 1000
            return {"answer": vk, "vals": {"vk": vk}}
        return {"answer": q["L0"] / q["nn"], "vals": {"Ln": q["L0"] / q["nn"]}}
    if lv == 2:
        n1, n2, t1 = q["n1"], q["n2"], q["t1"]
        s2 = n1 * sind(t1) / n2
        assert s2 < 1, "no refracted ray"
        t2 = asind(s2)
        assert math.isclose(n1 * sind(t1), n2 * sind(t2))
        return {"answer": t2, "vals": {"s1": sind(t1), "s2": s2, "t2": t2}}
    if q["kind"] == "fiber":
        n1, n2 = q["n1"], q["n2"]
        tc = asind(n2 / n1)
        tm = 90 - tc
        ta = asind(n1 * sind(tm))
        # numerical aperture identity: sin θa = √(n1² − n2²)
        assert math.isclose(sind(ta), math.sqrt(n1 ** 2 - n2 ** 2))
        return {"answer": ta, "vals": {"ratio": n2 / n1, "tc": tc, "tm": tm, "sm": sind(tm), "sa": n1 * sind(tm), "ta": ta}}
    tc = asind(1 / 1.33)
    R = q["d"] * tand(tc)
    return {"answer": R, "vals": {"ratio": 1 / 1.33, "tc": tc, "tc_": tand(tc), "R": R}}


# ---- P.lenses --------------------------------------------------------------------------------------
def image(f, do):
    di = sp.Symbol("di")
    return F(str(sp.solve(sp.Eq(sp.Rational(1) / sp.nsimplify(f), 1 / sp.nsimplify(do) + 1 / di), di)[0]))


def plenses(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        f, do = q["f"], q["dob"]
        di = image(f, do)
        assert di.denominator == 1 and di > 0
        return {"answer": float(di), "vals": {"k": do - f, "prod": f * do, "di": float(di)}}
    if lv == 2:
        f, do, ho = q["f"], q["dob"], q["ho"]
        di = image(f, do)
        m = -di / do
        return {"answer": float(m * ho), "vals": {"inv": fr(F(1, f) - F(1, do)), "di": fr(di), "m": fr(m), "hi": fr(m * ho)}}
    if q["kind"] == "maker":
        R1, R2, do = q["R1"], q["R2"], q["dob"]
        pw = F(1, 2) * (F(1, R1) - (F(-1, R2) if R2 else 0))  # back face of a biconvex lens has R = −R2
        f = 1 / pw
        di = image(f, do)
        assert di > 0
        return {"answer": float(di), "vals": {"pw": fr(pw), "f": fr(f), "inv": fr(pw - F(1, do)), "di": fr(di)}}
    f1, f2, do = q["f1"], q["f2"], q["dob"]
    P1, P2 = F(100, f1), F(100, f2)
    f = 100 / (P1 + P2)
    di = image(f, do)
    return {"answer": float(di), "vals": {"P1": fr(P1), "P2": fr(P2), "Pt": fr(P1 + P2), "f": fr(f), "inv": fr(1 / f - F(1, do)), "di": fr(di)}}


# ---- P.relativity ----------------------------------------------------------------------------------
def prel(p):
    q, lv = p["params"], p["level"]
    out = {}
    if "a" in q:
        beta = sp.Rational(q["a"], q["hyp"])
        gam = 1 / sp.sqrt(1 - beta ** 2)
        assert gam.is_rational
        gq = F(str(gam))
        b2 = F(str(beta ** 2))
        out = {"b2": fr(b2), "om": fr(1 - b2), "s": fr(1 / gq), "gam": fr(gq)}
    if lv == 1:
        return {"answer": float(gq), "vals": out}
    if lv == 2:
        if q["kind"] == "time":
            out["dt"] = float(gq) * 2.2
            return {"answer": out["dt"], "vals": out}
        L = q["L0"] / gq
        out["L"] = fr(L)
        return {"answer": float(L), "vals": out}
    if q["kind"] == "add":
        u1, v1 = F(q["u1"]["n"], q["u1"]["d"]), F(q["v1"]["n"], q["v1"]["d"])
        u = (u1 + v1) / (1 + u1 * v1)
        assert u < 1
        return {"answer": float(u), "vals": {"sum": fr(u1 + v1), "prod": fr(u1 * v1), "den": fr(1 + u1 * v1), "u": fr(u)}}
    if q["kind"] == "emc":
        pc, mc2 = q["pc"], q["mc2"]
        E = sp.sqrt(pc ** 2 + mc2 ** 2)
        assert E.is_integer
        return {"answer": int(E) - mc2, "vals": {"pc2": pc * pc, "mc4": mc2 * mc2, "E2": pc * pc + mc2 * mc2, "E": int(E), "KE": int(E) - mc2}}
    KE = float(gq - 1) * 938.3
    out.update({"gm1": fr(gq - 1), "KE": KE})
    return {"answer": KE, "vals": out}


# ---- P.quantum -------------------------------------------------------------------------------------
def pquantum(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "lam":
            E = F(1240, q["L"])
            return {"answer": float(E), "vals": {"E": float(E)}}
        E = 4.136e-15 * q["fm"] * 1e14
        return {"answer": E, "vals": {"E": E}}
    if lv == 2:
        E = F(1240, q["L"])
        KE = E - Fd(q["phi"])
        assert KE > 0, "the photon must beat the work function"
        return {"answer": float(KE), "vals": {"E": float(E), "KE": float(KE)}}
    if q["kind"] == "dB":
        v = q["vm"] * 1e6
        pm = 9.109e-31 * v
        out = {"Lnm": 6.626e-34 / pm * 1e9}
        sci(out, "p", pm)
        sci(out, "L", 6.626e-34 / pm)
        return {"answer": out["Lnm"], "vals": out}
    dp = 1.055e-34 / (2 * q["dx"] * 1e-9)
    out = {"dv": dp / 9.109e-31, "dvk": dp / 9.109e-31 / 1000}
    sci(out, "dp", dp)
    return {"answer": out["dvk"], "vals": out}


VERIFY = {
    "P.1": p1,
    "P.2": p2,
    "P.projectile": pproj,
    "P.3": p3,
    "P.hooke": phooke,
    "P.4": p4,
    "P.5": p5,
    "P.6": p6,
    "P.orbits": porbits,
    "P.rot-kinematics": protk,
    "P.torque": ptorque,
    "P.inertia": pinertia,
    "P.rot-dynamics": protd,
    "P.rolling": prolling,
    "P.7": p7,
    "P.pendulum": ppend,
    "P.waves": pwaves,
    "P.sound": psound,
    "P.8": p8,
    "P.9": p9,
    "P.10": p10,
    "P.11": p11,
    "P.12": p12,
    "P.13": p13,
    "P.14": p14,
    "P.15": p15,
    "P.16": p16,
    "P.17": p17,
    "P.18": p18,
    "P.entropy": pentropy,
    "P.19": p19,
    "P.coulomb": pcoulomb,
    "P.20": p20,
    "P.refraction": prefr,
    "P.lenses": plenses,
    "P.relativity": prel,
    "P.quantum": pquantum,
}
