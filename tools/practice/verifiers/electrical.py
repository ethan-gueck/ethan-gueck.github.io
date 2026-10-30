"""Independent answers for practice/electrical.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]). Circuits are re-solved by
modified nodal analysis over exact fractions (or SymPy); signals and transforms with SymPy and cmath.
Nothing here is copied from the JavaScript."""
import cmath
import math
from fractions import Fraction as F
from itertools import product

import sympy as sp

S, T_, Z = sp.symbols("s t z")


def fr(q):  # a Fraction as the {n, d} the generator reports
    q = F(q)
    return {"n": q.numerator, "d": q.denominator}


def Fx(x):
    """An exact fraction from a JSON number (decimal inputs such as 1.5 or 0.0039 are exact decimals)."""
    if isinstance(x, dict):
        return F(x["n"], x["d"])
    return F(str(x)) if isinstance(x, float) else F(x)


# ---- Modified nodal analysis with exact fractions -----------------------------------------------
def solve_linear(A, b):
    """Gauss–Jordan elimination over Fractions; asserts a unique solution."""
    n = len(A)
    M = [list(map(F, row)) + [F(b[i])] for i, row in enumerate(A)]
    for c in range(n):
        piv = next((r for r in range(c, n) if M[r][c] != 0), None)
        assert piv is not None, "singular circuit equations"
        M[c], M[piv] = M[piv], M[c]
        for r in range(n):
            if r != c and M[r][c] != 0:
                f = M[r][c] / M[c][c]
                M[r] = [a - f * b_ for a, b_ in zip(M[r], M[c])]
    return [M[i][n] / M[i][i] for i in range(n)]


def mna(elements):
    """Solve a DC circuit. Elements: ("R", a, b, ohms), ("V", plus, minus, volts), ("I", frm, to, amps)
    (the source pushes current from `frm` to `to` through itself, i.e. into node `to`). Node "0" is ground.
    Returns (node voltages dict, voltage-source currents dict keyed by element index, flowing + → − inside
    the external circuit, i.e. out of the + terminal)."""
    nodes = sorted({x for e in elements for x in e[1:3]} - {"0"})
    idx = {nd: i for i, nd in enumerate(nodes)}
    vs = [k for k, e in enumerate(elements) if e[0] == "V"]
    N = len(nodes) + len(vs)
    A = [[F(0)] * N for _ in range(N)]
    b = [F(0)] * N
    for k, e in enumerate(elements):
        kind, a, c, val = e[0], e[1], e[2], Fx(e[3])
        if kind == "R":
            g = 1 / val
            for x, y in ((a, c), (c, a)):
                if x != "0":
                    A[idx[x]][idx[x]] += g
                    if y != "0":
                        A[idx[x]][idx[y]] -= g
        elif kind == "I":
            if c != "0":
                b[idx[c]] += val
            if a != "0":
                b[idx[a]] -= val
        elif kind == "V":
            j = len(nodes) + vs.index(k)
            # unknown: current through the source from + to − internally (i.e. entering + from the circuit)
            if a != "0":
                A[idx[a]][j] += 1
                A[j][idx[a]] += 1
            if c != "0":
                A[idx[c]][j] -= 1
                A[j][idx[c]] -= 1
            b[j] = val
    x = solve_linear(A, b)
    volt = {nd: x[idx[nd]] for nd in nodes}
    volt["0"] = F(0)
    cur = {k: -x[len(nodes) + vs.index(k)] for k in vs}  # current delivered out of the + terminal
    return volt, cur


def req(elements, a, b):
    """Equivalent resistance between nodes a and b: drive 1 A in and read the voltage."""
    ren = lambda x: "0" if x == b else ("_g" if x == "0" else x)  # b becomes the reference node
    els = [(e[0], ren(e[1]), ren(e[2]), e[3]) for e in elements]
    volt, _ = mna(els + [("I", "0", ren(a), 1)])
    return volt[ren(a)]


def isint(x):
    return F(x).denominator == 1


# ---- EE.1 --------------------------------------------------------------------------------------------
def ee_1(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == 0:
            I = Fx(q["Q"]) / Fx(q["t"])
            return {"answer": float(I), "vals": {"I": float(I)}}
        if q["kind"] == 1:
            P = Fx(q["V"]) * Fx(q["I"])
            return {"answer": float(P), "vals": {"P": float(P)}}
        V = Fx(q["W"]) / Fx(q["Q"])
        return {"answer": float(V), "vals": {"V": float(V)}}
    if lv == 2:
        Wh = Fx(q["P"]) * q["h"]
        kwh = Wh / 1000 * q["d"]
        cost = kwh * q["c"] / 100  # dollars
        return {"answer": float(cost), "vals": {"Wh": float(Wh), "kwhDay": float(Wh / 1000), "kwh": float(kwh), "cents": float(kwh * q["c"]), "cost": float(cost)}}
    # charge: integrate the piecewise-linear current exactly with SymPy
    Im, t1, t2, t3 = q["Im"], q["t1"], q["t2"], q["t3"]
    i = sp.Piecewise((sp.Rational(Im, t1) * T_, T_ < t1), (Im, T_ < t2), (Im - sp.Rational(Im, t3 - t2) * (T_ - t2), T_ < t3), (0, True))
    Q = sp.integrate(i, (T_, 0, t3))
    q1 = F(Im * t1, 2)
    q2 = F(Im * (t2 - t1))
    q3 = F(Im * (t3 - t2), 2)
    assert Q == sp.Rational(q1 + q2 + q3)
    return {"answer": float(Q), "vals": {"q1": float(q1), "q2": float(q2), "q3": float(q3), "Q": float(Q), "d21": t2 - t1, "d32": t3 - t2}}


# ---- EE.resistance --------------------------------------------------------------------------------
def ee_resistance(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        k = q["kind"]
        if k == 0:
            volt, cur = mna([("V", "a", "0", q["V"]), ("R", "a", "0", q["R"])])
            I = cur[0]
            return {"answer": float(I), "vals": {"I": float(I)}}
        if k == 1:
            V = Fx(q["I"]) * F(1, 1000) * Fx(q["R"]) * 1000
            return {"answer": float(V), "vals": {"V": float(V)}}
        if k == 2:
            Rv = Fx(q["V"]) / Fx(q["I"])
            return {"answer": float(Rv), "vals": {"R": float(Rv)}}
        Rv = F(q["V0"]) / F(q["I0"])  # kΩ
        return {"answer": float(Rv), "vals": {"R": float(Rv)}}
    if lv == 2:
        k = q["kind"]
        if k == 0:
            Vs, Pw = F(q["V"]), F(q["P"])
            Rv = Vs * Vs / Pw
            I = Pw / Vs
            assert isint(Rv) and I * Rv == Vs
            return {"answer": float(Rv), "vals": {"R": float(Rv), "VV": float(Vs * Vs), "I": float(I), "P": float(Pw)}}
        if k == 1:
            I = Fx(q["I"]) / 1000
            Rv = Fx(q["R"]) * 1000
            Pmw = I * I * Rv * 1000
            return {"answer": float(Pmw), "vals": {"II": float(Fx(q["I"]) ** 2), "P": float(Pmw)}}
        G = 1 / F(q["R"])  # S
        Ima = G * q["V"] * 1000
        return {"answer": float(Ima), "vals": {"G": float(G * 1000), "I": float(Ima)}}
    if "rho" in q:
        rho = Fx(q["rho"]) * F(1, 10 ** 8)
        L = 2 * F(q["L"])
        A = Fx(q["A"]) * F(1, 10 ** 6)
        Rw = rho * L / A
        Pl = F(q["I"]) ** 2 * Rw
        return {"answer": float(Pl), "vals": {"len": float(L), "R": float(Rw), "Ploss": float(Pl)}}
    dT = q["T1"] - q["T0"]
    factor = 1 + F("0.0039") * dT
    R1 = q["R0"] * factor
    return {"answer": float(R1), "vals": {"dT": dT, "factor": float(factor), "R1": float(R1)}}




def par(*rs):
    return 1 / sum(1 / F(x) for x in rs)


# ---- EE.series-parallel ------------------------------------------------------------------------------
def ee_series_parallel(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        k = q["kind"]
        if k == 0:
            a, b = q["a"], q["b"]
            Req = req([("R", "a", "b", a), ("R", "a", "b", b)], "a", "b")
            assert Req < min(a, b) and isint(Req)
            return {"answer": float(Req), "vals": {"prod": a * b, "sum": a + b, "Req": float(Req)}}
        if k == 1:
            Req = req([("R", "a", "b", q["R"])] * q["N"], "a", "b")
            return {"answer": float(Req), "vals": {"Req": float(Req)}}
        Req = req([("R", "a", "x", q["a"]), ("R", "x", "y", q["b"]), ("R", "y", "b", q["c"])], "a", "b")
        return {"answer": float(Req), "vals": {"Req": float(Req)}}
    if lv == 2:
        k = q["kind"]
        a, b, c = (q.get(x) for x in "abc")
        if k == 0:
            Req = req([("R", "a", "m", a), ("R", "m", "b", b), ("R", "m", "b", c)], "a", "b")
            p_ = par(b, c)
            assert isint(Req)
            return {"answer": float(Req), "vals": {"bc": b * c, "bpc": b + c, "p": float(p_), "Req": float(Req)}}
        if k == 1:
            C1, C2, C3 = q["C1"], q["C2"], q["C3"]
            Cp = C1 + C2
            Ceq = 1 / (F(1, Cp) + F(1, C3))
            # a capacitor C behaves as impedance 1/(sC): combine 1/C "resistances" in the circuit solver
            inv = req([("R", "a", "m", F(1, C1)), ("R", "a", "m", F(1, C2)), ("R", "m", "b", F(1, C3))], "a", "b")
            assert 1 / inv == Ceq and isint(Ceq)
            return {"answer": float(Ceq), "vals": {"Cp": Cp, "prod": Cp * C3, "sum": Cp + C3, "Ceq": float(Ceq)}}
        Leq = req([("R", "a", "m", a), ("R", "m", "b", b), ("R", "m", "b", c)], "a", "b")
        return {"answer": float(Leq), "vals": {"bc": b * c, "bpc": b + c, "p": float(par(b, c)), "Leq": float(Leq)}}
    a, b, c, d, e = (q[x] for x in "abcde")
    els = [("R", "a", "m", a), ("R", "m", "b", b), ("R", "m", "k", c), ("R", "k", "b", d), ("R", "k", "b", e)]
    Req = req(els, "a", "b")
    p45 = par(d, e)
    s = c + p45
    p2 = par(b, s)
    assert isint(Req) and isint(p45) and isint(p2)
    return {"answer": float(Req), "vals": {"de": d * e, "dpe": d + e, "p45": float(p45), "s": float(s), "bs": float(b * s), "bps": float(b + s), "p2": float(p2), "Req": float(Req)}}


# ---- EE.2 Kirchhoff --------------------------------------------------------------------------------------
def ee_2(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == 0:
            I4 = sp.solve(sp.Eq(q["I1"] + q["I2"], q["I3"] + sp.Symbol("x")))[0]
            assert I4 > 0
            return {"answer": int(I4), "vals": {"I4": int(I4)}}
        V3 = q["Vs"] - q["V1"] - q["V2"]
        assert V3 > 0
        return {"answer": V3, "vals": {"V3": V3}}
    if lv == 2:
        V1, V2, R1, R2, R3 = q["V1"], q["V2"], q["R1"], q["R2"], q["R3"]
        # nodes: bottom-left 0, V1 top "t", R1 → "m", R2 → "r"; V2 on the right side between r and "br"; R3 from br to 0
        if q["aid"]:  # + at the bottom of V2
            v2 = ("V", "br", "r", V2)
        else:
            v2 = ("V", "r", "br", V2)
        els = [("V", "t", "0", V1), ("R", "t", "m", R1), ("R", "m", "r", R2), v2, ("R", "br", "0", R3)]
        volt, cur = mna(els)
        I = cur[0]  # out of V1's + terminal: clockwise
        VR2 = volt["m"] - volt["r"]
        net = V1 + V2 if q["aid"] else V1 - V2
        assert I > 0 and VR2 == I * R2
        return {"answer": float(VR2), "vals": {"net": net, "sum": R1 + R2 + R3, "I": float(I), "VR2": float(VR2)}}
    R1, R2, R3, I2 = q["R1"], q["R2"], q["R3"], Fx(q["I2"])
    # by linearity, solve with a 1 V source and scale so that R2 carries I2
    volt, _ = mna([("V", "s", "0", 1), ("R", "s", "a", R1), ("R", "a", "0", R2), ("R", "a", "0", R3)])
    i2_per_volt = volt["a"] / R2
    Vs = I2 / i2_per_volt
    volt, _ = mna([("V", "s", "0", Vs), ("R", "s", "a", R1), ("R", "a", "0", R2), ("R", "a", "0", R3)])
    Vp = volt["a"]
    I3 = Vp / R3
    I1 = (Vs - Vp) / R1
    assert I1 == I2 + I3
    return {"answer": float(Vs), "vals": {"Vp": float(Vp), "I3": float(I3), "I1": float(I1), "V1": float(I1 * R1), "Vs": float(Vs)}}


# ---- EE.3 dividers -----------------------------------------------------------------------------------------
def ee_3(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        volt, _ = mna([("V", "i", "0", q["Vin"]), ("R", "i", "o", q["R1"]), ("R", "o", "0", q["R2"])])
        return {"answer": float(volt["o"]), "vals": {"sum": q["R1"] + q["R2"], "Vout": float(volt["o"])}}
    if lv == 2:
        if q["kind"] == 0:
            volt, _ = mna([("I", "0", "a", q["It"]), ("R", "a", "0", q["R1"]), ("R", "a", "0", q["R2"])])
            I1, I2 = volt["a"] / q["R1"], volt["a"] / q["R2"]
            return {"answer": float(I1), "vals": {"sum": q["R1"] + q["R2"], "I1": float(I1), "I2": float(I2), "Vp": float(volt["a"])}}
        volt, _ = mna([("V", "i", "0", q["Vin"]), ("R", "i", "x", q["R1"]), ("R", "x", "y", q["R2"]), ("R", "y", "0", q["R3"])])
        V2 = volt["x"] - volt["y"]
        return {"answer": float(V2), "vals": {"sum": q["R1"] + q["R2"] + q["R3"], "V2": float(V2)}}
    Vin, R1, R2, RL = q["Vin"], q["R1"], q["R2"], q["RL"]
    v0, _ = mna([("V", "i", "0", Vin), ("R", "i", "o", R1), ("R", "o", "0", R2)])
    vl, _ = mna([("V", "i", "0", Vin), ("R", "i", "o", R1), ("R", "o", "0", R2), ("R", "o", "0", RL)])
    V0, VL = v0["o"], vl["o"]
    assert VL < V0
    return {"answer": float(VL), "vals": {"R12": R1 + R2, "V0": float(V0), "prodL": R2 * RL, "sumL": R2 + RL, "Rp": float(par(R2, RL)), "VL": float(VL), "drop": float(V0 - VL)}}


# ---- EE.sources ------------------------------------------------------------------------------------------------
def ee_sources(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == 0:
            # both forms must give the same open-circuit voltage and short-circuit current
            Vs, Rv = q["Vs"], q["R"]
            _, cur = mna([("V", "x", "0", Vs), ("R", "x", "a", Rv), ("V", "a", "0", 0)])
            Isc = cur[0]
            volt, _ = mna([("I", "0", "a", Isc), ("R", "a", "0", Rv)])
            assert volt["a"] == Vs
            return {"answer": [float(Isc), Rv], "vals": {"Is": float(Isc)}}
        Is, Rv = q["Is"], q["R"]
        volt, _ = mna([("I", "0", "a", Is), ("R", "a", "0", Rv)])
        return {"answer": [float(volt["a"]), Rv], "vals": {"Vs": float(volt["a"])}}
    if lv == 2:
        if q["kind"] == 0:
            E, rint, RL = Fx(q["E"]), Fx(q["rint"]), q["RL"]
            volt, cur = mna([("V", "x", "0", E), ("R", "x", "t", rint), ("R", "t", "0", RL)])
            I = cur[0]
            return {"answer": float(volt["t"]), "vals": {"rRL": float(rint + RL), "I": float(I), "drop": float(I * rint), "Vt": float(volt["t"])}}
        E, I, Vt = Fx(q["E"]), Fx(q["I"]), Fx(q["Vt"])
        rint = (E - Vt) / I
        return {"answer": float(rint), "vals": {"drop": float(E - Vt), "rint": float(rint)}}
    t, k, Rs, Rin, Ro, RL = q["type"], q["k"], q["Rs"], q["Rin"], q["Ro"], q["RL"]
    vs = F(q["vsm"], 1000)
    # solve the whole circuit at once with SymPy: unknown node voltages and controlled-source quantities
    a, o, b = sp.symbols("a o b")  # a: top of Rin; o: output node; b: node between source and Ro (voltage-source types)
    eqs = []
    vx = a
    ix = (sp.Rational(vs) - a) / Rs
    eqs.append(sp.Eq((a - sp.Rational(vs)) / Rs + a / Rin, 0))
    if t in ("VCVS", "CCVS"):
        ctrl = vx if t == "VCVS" else ix
        eqs.append(sp.Eq(b, k * ctrl))
        eqs.append(sp.Eq((o - b) / Ro + o / RL, 0))
        sol = sp.solve(eqs, [a, o, b], dict=True)[0]
    else:
        ctrl = vx if t == "VCCS" else ix
        eqs.append(sp.Eq(o / Ro + o / RL, k * ctrl))
        sol = sp.solve(eqs, [a, o], dict=True)[0]
    out = F(str(sol[o])) if not isinstance(sol[o], sp.Rational) else F(int(sol[o].p), int(sol[o].q))
    ctrl_v = sp.nsimplify(ctrl.subs(sol))
    ctrl_f = F(int(ctrl_v.p), int(ctrl_v.q))
    src = ctrl_f * k
    return {"answer": float(out), "vals": {"vs": float(vs), "ctrl": float(ctrl_f), "src": float(src), "out": float(out), "par": float(par(Ro, RL)),
                                           "gain": float(out / vs), "sumIn": Rs + Rin, "sumOut": Ro + RL}}




# ---- EE.5 nodal & mesh --------------------------------------------------------------------------------------------
def lcm(a, b):
    return abs(a * b) // math.gcd(a, b)


def ee_5(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        V1, V2, R1, R2, R3 = q["V1"], q["V2"], q["R1"], q["R2"], q["R3"]
        volt, _ = mna([("V", "l", "0", V1), ("R", "l", "a", R1), ("R", "a", "0", R3), ("R", "a", "r", R2), ("V", "r", "0", V2)])
        va = volt["a"]
        assert isint(va)
        D = lcm(lcm(R1, R2), R3)
        a, b, c = D // R1, D // R2, D // R3
        return {"answer": int(va), "vals": {"D": D, "a": a, "b": b, "c": c, "tot": a + b + c, "rhs": a * V1 + b * V2, "va": int(va)}}
    if lv == 2:
        V1, V2, R1, R2, R3 = q["V1"], q["V2"], q["R1"], q["R2"], q["R3"]
        # nodes: l (top of V1), m (top middle), r (top of V2); both sources + at top
        volt, cur = mna([("V", "l", "0", V1), ("R", "l", "m", R1), ("R", "m", "0", R3), ("R", "m", "r", R2), ("V", "r", "0", V2)])
        I1 = cur[0]  # out of V1's + terminal = clockwise left mesh current
        I2 = (volt["m"] - volt["r"]) / R2  # current rightward through R2 = clockwise right mesh current
        assert (volt["m"] - 0) / R3 == I1 - I2
        a, b, c = R1 + R3, R2 + R3, R3
        det = a * b - c * c
        return {"answer": [float(I1), float(I2)], "vals": {"a": a, "b": b, "c": c, "det": det, "num1": V1 * b - c * V2, "num2": c * V1 - a * V2, "I1": float(I1), "I2": float(I2)}}
    Vs, Is, R1, R2, R3, R4 = q["Vs"], Fx(q["Is"]), q["R1"], q["R2"], q["R3"], q["R4"]
    volt, _ = mna([("V", "s", "0", Vs), ("R", "s", "A", R1), ("R", "A", "0", R2), ("R", "A", "B", R3), ("R", "B", "0", R4), ("I", "0", "B", Is)])
    vA, vB = volt["A"], volt["B"]
    assert isint(vA) and isint(vB)
    DA = lcm(lcm(R1, R2), R3)
    a1, a2, a3 = DA // R1, DA // R2, DA // R3
    DB = lcm(R3, R4)
    b3, b4 = DB // R3, DB // R4
    eA, eB, gA, gB = a1 + a2 + a3, b3 + b4, a1 * Vs, DB * Is
    assert isint(gB)
    det = eA * eB - a3 * b3
    return {"answer": [float(vA), float(vB)], "vals": {"DA": DA, "a1": a1, "a2": a2, "a3": a3, "eA": eA, "gA": gA, "DB": DB, "b3": b3, "b4": b4, "eB": eB,
                                                    "gB": float(gB), "det": det, "numA": float(gA * eB + a3 * gB), "numB": float(eA * gB + b3 * gA), "vA": float(vA), "vB": float(vB)}}


# ---- EE.superposition -------------------------------------------------------------------------------------------
def ee_superposition(p):
    q, lv = p["params"], p["level"]
    R1, R2, Vs, Is = q["R1"], q["R2"], q["Vs"], q["Is"]
    isrc = ("I", "0", "a", Is) if q["up"] else ("I", "a", "0", Is)
    both, _ = mna([("V", "s", "0", Vs), ("R", "s", "a", R1), ("R", "a", "0", R2), isrc])
    vonly, _ = mna([("V", "s", "0", Vs), ("R", "s", "a", R1), ("R", "a", "0", R2)])               # current source open
    ionly, _ = mna([("V", "s", "0", 0), ("R", "s", "a", R1), ("R", "a", "0", R2), isrc])           # voltage source shorted
    va1, va2, va = vonly["a"], ionly["a"], both["a"]
    assert va1 + va2 == va
    Rp = par(R1, R2)
    if lv == 1:
        if q["which"] == "V":
            return {"answer": float(va1), "vals": {"sum": R1 + R2, "va1": float(va1)}}
        return {"answer": float(va2), "vals": {"Rp": float(Rp), "va2": float(va2), "prod": R1 * R2, "sum": R1 + R2}}
    vals = {"sum": R1 + R2, "va1": float(va1), "Rp": float(Rp), "va2": float(va2), "prod": R1 * R2, "va": float(va)}
    if lv == 2:
        return {"answer": float(va), "vals": vals}
    Pt = va * va / R2
    Psum = (va1 * va1 + va2 * va2) / R2
    assert Pt != Psum
    vals.update({"Pt": float(Pt), "Psum": float(Psum)})
    return {"answer": float(Pt), "vals": vals}


# ---- EE.4 Thévenin ---------------------------------------------------------------------------------------------------
def ee_4(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        k = q["kind"]
        vth, rth = q["vth"], q["rth"]
        if k == 2:
            _, cur = mna([("V", "t", "0", vth), ("R", "t", "a", rth), ("V", "a", "0", 0)])
            return {"answer": float(cur[0]), "vals": {"iN": float(cur[0])}}
        volt, cur = mna([("V", "t", "0", vth), ("R", "t", "a", rth), ("R", "a", "0", q["rl"])])
        if k == 0:
            return {"answer": float(cur[0]), "vals": {"sum": rth + q["rl"], "iL": float(cur[0])}}
        return {"answer": float(volt["a"]), "vals": {"sum": rth + q["rl"], "vL": float(volt["a"])}}
    if "Voc" in q:
        Voc, Isc = F(q["Voc"]), F(q["Isc"])
        rth = Voc / Isc
        RL = sp.Symbol("RL", positive=True)
        Pl = (sp.Rational(Voc) / (sp.Rational(rth) + RL)) ** 2 * RL
        best = sp.solve(sp.diff(Pl, RL), RL)
        assert len(best) == 1 and best[0] == sp.Rational(rth)
        Pmax = Pl.subs(RL, best[0])
        return {"answer": [float(rth), float(Pmax)], "vals": {"rth": float(rth), "half": float(Voc / 2), "ihalf": float(Isc / 2), "Pmax": float(Pmax)}}
    R1, R2, R3, Vs = q["R1"], q["R2"], q["R3"], q["Vs"]
    els = [("V", "s", "0", Vs), ("R", "s", "m", R1), ("R", "m", "0", R2), ("R", "m", "a", R3)]
    volt, _ = mna(els)
    vth = volt["a"]
    rth = req([("V", "s", "0", 0), ("R", "s", "m", R1), ("R", "m", "0", R2), ("R", "m", "a", R3)], "a", "0")
    vals = {"sum": R1 + R2, "vth": float(vth), "prod": R1 * R2, "p": float(par(R1, R2)), "rth": float(rth)}
    if lv == 2:
        return {"answer": [float(vth), float(rth)], "vals": vals}
    # maximum power: scan the load power over the exact optimum and its neighbours
    Pl = lambda RL: (vth / (rth + RL)) ** 2 * RL
    Pmax = Pl(rth)
    assert Pmax > Pl(rth * F(99, 100)) and Pmax > Pl(rth * F(101, 100))
    vals["Pmax"] = float(Pmax)
    return {"answer": [float(rth), float(Pmax)], "vals": vals}




# ---- EE.6 capacitors & inductors -------------------------------------------------------------------------------------
def ee_6(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        k = q["kind"]
        if k == 0:
            Q = Fx(q["C"]) * q["V"]
            return {"answer": float(Q), "vals": {"Q": float(Q)}}
        if k == 1:
            Cf = Fx(q["C"]) / 10 ** 6
            E = Cf * q["V"] ** 2 / 2  # joules
            return {"answer": float(E * 1000), "vals": {"VV": q["V"] ** 2, "Euj": float(E * 10 ** 6), "Emj": float(E * 1000)}}
        E = Fx(q["L"]) / 1000 * Fx(q["I"]) ** 2 / 2
        return {"answer": float(E * 1000), "vals": {"II": float(Fx(q["I"]) ** 2), "E": float(E * 1000)}}
    if lv == 2:
        ts = [0, q["t1"], q["t2"], q["t3"]]
        ys = [0, q["y1"], q["y2"], q["y3"]]
        # the waveform as a SymPy piecewise function of t (ms); differentiate it in the middle of the segment
        pieces = [(ys[i] + sp.Rational(ys[i + 1] - ys[i], ts[i + 1] - ts[i]) * (T_ - ts[i]), T_ < ts[i + 1]) for i in range(3)]
        w = sp.Piecewise(*pieces, (ys[3], True))
        k = q["seg"]
        mid = sp.Rational(ts[k - 1] + ts[k], 2)
        slope = sp.diff(w, T_).subs(T_, mid)  # units per ms
        out = q["k"] * slope  # μF·V/ms = mA, or mH·A/ms = V
        return {"answer": float(out), "vals": {"dy": ys[k] - ys[k - 1], "dt": ts[k] - ts[k - 1], "slope": float(slope), "out": float(out)}}
    C1, C2, V0 = q["C1"], q["C2"], q["V0"]
    Vf = sp.symbols("Vf")
    vf = sp.solve(sp.Eq(C1 * V0, (C1 + C2) * Vf), Vf)[0]
    E0 = sp.Rational(C1 * V0 ** 2, 2)
    E1 = sp.Rational(C1 + C2, 2) * vf ** 2
    lost = E0 - E1
    assert lost == sp.Rational(C1 * C2, 2 * (C1 + C2)) * V0 ** 2  # the closed form ½ (C₁C₂/(C₁+C₂)) V₀²
    return {"answer": [float(vf), float(lost)], "vals": {"Q": C1 * V0, "Ct": C1 + C2, "Vf": float(vf), "E0": float(E0), "E1": float(E1), "lost": float(lost)}}


def first_order(x0, xinf, tau, t):
    """Solve tau·x' + x = x_inf, x(0) = x0, with SymPy's ODE solver, and evaluate at t."""
    x = sp.Function("x")
    sol = sp.dsolve(sp.Eq(tau * x(T_).diff(T_) + x(T_), xinf), x(T_), ics={x(0): x0}).rhs
    return sol.subs(T_, t)


# ---- EE.7 RC & RL transients -----------------------------------------------------------------------------------------
def ee_7(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == 0:
            tau = Fx(q["R"]) * 1000 * Fx(q["C"]) / 10 ** 6 * 1000  # ms
            return {"answer": float(tau), "vals": {"tau": float(tau), "five": float(5 * tau)}}
        tau = Fx(q["L"]) / 1000 / Fx(q["R"]) * 1000
        return {"answer": float(tau), "vals": {"tau": float(tau)}}
    if lv == 2:
        k, t = q["kind"], sp.nsimplify(q["t"])
        if k in (0, 1):
            t0 = sp.nsimplify(q["t0"])
            x0, xinf = (0, q["Vs"]) if k == 0 else (q["Vs"], 0)
            val = first_order(x0, xinf, t0, t)
            extra = {}
        else:
            Rv, Lv = q["R"], q["L"]
            t0 = sp.Rational(Lv, Rv)  # mH/Ω = ms
            Ifin = sp.Rational(q["Vs"], Rv)
            val = first_order(0, Ifin, t0, t)
            extra = {"Ifin": float(Ifin)}
        x = t / t0
        return {"answer": float(val), "vals": {"x": float(x), "e": float(sp.exp(-x)), "val": float(val), "tau": float(t0), **extra}}
    if "VA" in q:
        t0 = sp.Integer(q["R"] * q["C"])
        t = sp.nsimplify(q["t"])
        val = first_order(q["VA"], q["VB"], t0, t)
        x = t / t0
        return {"answer": float(val), "vals": {"tau": float(t0), "diff": q["VA"] - q["VB"], "x": float(x), "e": float(sp.exp(-x)), "val": float(val)}}
    t0 = sp.nsimplify(q["R"]) * sp.nsimplify(q["C"])
    Vs = q["Vs"]
    Vth = sp.Rational(Vs * q["fn"], q["fd"])
    tt = sp.symbols("tt", positive=True)
    t = sp.solve(sp.Eq(Vs * (1 - sp.exp(-tt / t0)), Vth), tt)
    assert len(t) == 1
    t = t[0]
    ratio = sp.Rational(Vs) / (Vs - Vth)
    return {"answer": float(t), "vals": {"tau": float(t0), "Vth": float(Vth), "diff": float(Vs - Vth), "ratio": float(ratio), "lnr": float(sp.log(ratio)), "t": float(t)}}


# ---- EE.rlc-transient ---------------------------------------------------------------------------------------------------
def rlc(p):
    q = p["params"]
    R, L, C = sp.nsimplify(q["R"]), sp.nsimplify(q["L"]), sp.nsimplify(q["C"]) / 10 ** 6
    a = R / (2 * L)
    w = 1 / sp.sqrt(L * C)
    roots = sp.solve(L * C * S ** 2 + R * C * S + 1, S)  # LC v'' + RC v' + v = Vs
    return R, L, C, a, w, roots


def ee_rlc_transient(p):
    q, lv = p["params"], p["level"]
    R, L, C, a, w, roots = rlc(p) if "R" in q else (None,) * 6
    if lv == 1:
        z = a / w
        disc = a ** 2 - w ** 2
        idx = 0 if disc > 0 else (1 if disc == 0 else 2)
        assert (idx == 2) == any(sp.im(r_) != 0 for r_ in roots)
        return {"answer": idx, "vals": {"a": float(a), "w": float(w), "z": float(z)}}
    if lv == 2:
        assert w.is_integer
        d = sp.sqrt(abs(a ** 2 - w ** 2))
        assert d.is_integer
        vals = {"a": float(a), "w": float(w), "aa": float(a * a), "ww": float(w * w), "dd": float(d * d), "d": float(d)}
        if q["over"]:
            assert all(sp.im(r_) == 0 for r_ in roots)
            s1, s2 = sorted(roots, reverse=True)
            vals.update({"s1": float(s1), "s2": float(s2)})
            return {"answer": [float(s1), float(s2)], "vals": vals}
        assert all(sp.im(r_) != 0 for r_ in roots)
        assert sp.simplify(abs(sp.im(roots[0])) - d) == 0 and sp.simplify(-sp.re(roots[0]) - a) == 0
        return {"answer": [float(a), float(d)], "vals": vals}
    if "R" not in q:
        L, C = sp.nsimplify(q["L"]), sp.nsimplify(q["C"]) / 10 ** 6
        Rs = sp.symbols("Rs", positive=True)
        Rc = sp.solve(sp.Eq((Rs * C) ** 2 - 4 * L * C, 0), Rs)  # repeated root: discriminant of LC s² + RC s + 1 is zero
        assert len(Rc) == 1
        Rc = Rc[0]
        a = Rc / (2 * L)
        return {"answer": [float(Rc), float(4 / a * 1000)], "vals": {"LoC": float(L / C), "root": float(sp.sqrt(L / C)), "R": float(Rc), "a": float(a), "ts": float(4 / a * 1000)}}
    z = a / w
    assert 0 < z < 1
    # overshoot from the actual step response peak: v(t) = 1 − e^{−αt}(cos ω_d t + (α/ω_d) sin ω_d t), peak at t = π/ω_d
    wd = sp.sqrt(w ** 2 - a ** 2)
    tp = sp.pi / wd
    v = 1 - sp.exp(-a * T_) * (sp.cos(wd * T_) + a / wd * sp.sin(wd * T_))
    assert sp.simplify(sp.diff(v, T_).subs(T_, tp)) == 0
    os_ = float(100 * (v.subs(T_, tp) - 1))
    sq = math.sqrt(1 - float(z) ** 2)
    assert abs(os_ - 100 * math.exp(-math.pi * float(z) / sq)) < 1e-9
    return {"answer": os_, "vals": {"a": float(a), "w": float(w), "z": float(z), "sq": sq, "ex": math.pi * float(z) / sq, "os": os_, "ts": float(4 / a * 1000)}}


# ---- EE.8 AC signals & RMS -------------------------------------------------------------------------------------------------
def rms_of(expr, period):
    return sp.sqrt(sp.integrate(expr ** 2, (T_, 0, period)) / period)


def ee_8(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        k = q["kind"]
        if k == 0:
            f = sp.Rational(q["k"]) * sp.pi / (2 * sp.pi)
            return {"answer": float(f), "vals": {"f": float(f)}}
        if k == 1:
            T = F(1000, q["f"])
            return {"answer": float(T), "vals": {"T": float(T)}}
        rms = rms_of(q["A"] * sp.sin(2 * sp.pi * T_), 1)
        return {"answer": float(rms), "vals": {"rms": float(rms)}}
    if lv == 2:
        A, T = q["A"], q["T"]
        f = sp.Rational(1000, T)
        rms = rms_of(A * sp.sin(2 * sp.pi * T_ / T), T)
        return {"answer": [float(f), float(rms)], "vals": {"A": A, "T": T, "f": float(f), "rms": float(rms)}}
    A, Rv, shape = q["A"], q["R"], q["shape"]
    Tp = 4
    if shape == "sine":
        wave = A * sp.sin(2 * sp.pi * T_ / Tp)
        msq = sp.integrate(wave ** 2, (T_, 0, Tp)) / Tp
    elif shape == "square":
        msq = (sp.integrate(sp.Integer(A) ** 2, (T_, 0, 2)) + sp.integrate(sp.Integer(-A) ** 2, (T_, 2, 4))) / Tp
    else:  # triangle: rises 0 → A over a quarter period, symmetric
        piece = A * T_ / 1  # on [0, 1]: 0 → A; the four quarters have equal mean square
        msq = sp.integrate(piece ** 2, (T_, 0, 1)) / 1
    Pw = msq / Rv
    return {"answer": float(Pw), "vals": {"AA": A * A, "half": A * A / 2, "kR": q["k"] * Rv, "Pw": float(Pw), "Psq": A * A / Rv, "rms": float(sp.sqrt(msq))}}




# ---- EE.9 phasors & impedance ------------------------------------------------------------------------------------------
def deg(z):
    return math.degrees(cmath.phase(z))


def ee_9(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        k = q["kind"]
        if k == 0:
            Z = 1j * q["w"] * Fx(q["Lm"]) / 1000
            return {"answer": float(Z.imag) if isinstance(Z, complex) else float(Fx(q["w"]) * Fx(q["Lm"]) / 1000), "vals": {"X": float(F(q["w"]) * Fx(q["Lm"]) / 1000)}}
        if k == 1:
            Xc = 1 / (F(q["w"]) * Fx(q["Cu"]) / 10 ** 6)
            Z = 1 / (1j * q["w"] * float(Fx(q["Cu"])) * 1e-6)
            assert abs(abs(Z) - float(Xc)) < 1e-9 * float(Xc)
            return {"answer": float(Xc), "vals": {"wC": float(q["w"] * Fx(q["Cu"])), "X": float(Xc)}}
        Rv, X = q["R"], q["X"]
        Zm = sp.sqrt(Rv ** 2 + X ** 2)
        assert Zm.is_integer
        return {"answer": int(Zm), "vals": {"RR": Rv * Rv, "XX": X * X, "ZZ": int(Zm) ** 2, "Zm": int(Zm), "absX": abs(X)}}
    if lv == 2:
        w, Rv, Vm = q["w"], q["R"], q["Vm"]
        comp = float(Fx(q["comp"]))
        Z = Rv + (1j * w * comp * 1e-3 if q["isL"] else 1 / (1j * w * comp * 1e-6))
        Iph = Vm / Z
        X = abs(Z.imag)
        return {"answer": [abs(Iph), deg(Iph)], "vals": {"X": X, "Zm": abs(Z), "ratio": X / Rv, "thZ": abs(deg(Z)), "thI": deg(Iph), "Im": abs(Iph), "comp": comp}}
    w, Rv, Vm, ph = q["w"], q["R"], q["Vm"], q["ph"]
    Z = Rv + 1j * w * float(Fx(q["Lm"])) * 1e-3 + 1 / (1j * w * float(Fx(q["Cu"])) * 1e-6)
    V = cmath.rect(Vm, math.radians(ph))
    Iph = V / Z
    xl = w * float(Fx(q["Lm"])) * 1e-3
    xc = 1 / (w * float(Fx(q["Cu"])) * 1e-6)
    return {"answer": [abs(Iph), deg(Iph)], "vals": {"xl": xl, "xc": xc, "X": Z.imag, "absX": abs(Z.imag), "Zm": abs(Z), "thZ": deg(Z), "thI": deg(Iph), "Im": abs(Iph)}}


# ---- EE.10 AC power -------------------------------------------------------------------------------------------------------
def ee_10(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        k = q["kind"]
        S_ = F(q["V"]) * q["I"]
        if k == 0:
            # complex power S = Ṽ Ĩ* with the current lagging by θ = arccos(pf)
            th = math.acos(float(Fx(q["pf"])))
            Sc = cmath.rect(q["V"], 0) * cmath.rect(q["I"], -th).conjugate()
            assert abs(Sc.real - float(S_ * Fx(q["pf"]))) < 1e-6
            return {"answer": float(S_ * Fx(q["pf"])), "vals": {"S": float(S_), "P": float(S_ * Fx(q["pf"]))}}
        if k == 1:
            return {"answer": float(S_), "vals": {"S": float(S_)}}
        pf = Fx(q["P"]) / S_
        return {"answer": float(pf), "vals": {"S": float(S_), "P": float(Fx(q["P"])), "pf": float(pf)}}
    if lv == 2:
        if q["kind"] == 0:
            Pk, Qk = q["P"], q["Q"]
            Sk = sp.sqrt(Pk ** 2 + Qk ** 2)
            assert Sk.is_integer
            pf = F(Pk, int(Sk))
            return {"answer": [int(Sk), float(pf)], "vals": {"PP": Pk * Pk, "QQ": Qk * Qk, "SS": int(Sk) ** 2, "S": int(Sk), "pf": float(pf), "pfn": pf.numerator, "pfd": pf.denominator}}
        pf = F(q["pfn"], q["pfd"])
        th = sp.acos(sp.Rational(pf.numerator, pf.denominator))
        Q = q["P"] * sp.tan(th)
        sn = sp.sin(th)
        assert sp.nsimplify(Q).is_rational
        Sk = q["P"] / pf
        b = int(sp.nsimplify(sn * q["pfd"]))
        return {"answer": float(Q), "vals": {"Q": float(Q), "S": float(Sk), "pf": float(pf), "tn": float(sp.tan(th)), "sn": float(sn), "a": q["pfn"], "b": b, "h": q["pfd"]}}
    Pk, p1, p2, Vv, f = q["P"], q["p1"], q["p2"], q["V"], q["f"]
    t1 = math.tan(math.acos(p1))
    t2 = math.tan(math.acos(p2))
    Q1, Q2 = Pk * t1, Pk * t2
    Qc = Q1 - Q2
    w = 2 * math.pi * f
    C = Qc * 1000 / (w * Vv ** 2)
    # check: with C in parallel, the load's complex power plus the capacitor's has the target power factor
    Sload = complex(Pk * 1000, Q1 * 1000)
    Scap = complex(0, -w * C * Vv ** 2)
    tot = Sload + Scap
    assert abs(tot.real / abs(tot) - p2) < 1e-9
    return {"answer": C * 1e6, "vals": {"t1": t1, "Q1": Q1, "Q2": Q2, "Qc": Qc, "Qvar": Qc * 1000, "w": w, "Cuf": C * 1e6, "S1": Pk / p1, "S2": Pk / p2}}


# ---- EE.11 resonance ------------------------------------------------------------------------------------------------------------
def series_rlc_w0(Lm, Cn):
    """Resonance as the frequency where the series impedance is purely real (SymPy)."""
    w = sp.symbols("w", positive=True)
    L, C = sp.Rational(Lm, 1000), sp.Rational(Cn, 10 ** 9)
    sol = sp.solve(sp.Eq(w * L - 1 / (w * C), 0), w)
    assert len(sol) == 1
    return sol[0]


def ee_11(p):
    q, lv = p["params"], p["level"]
    if "fk" in q:
        w = 2 * math.pi * q["fk"] * 1000
        C = 1 / (w * w * q["Lu"] * 1e-6)
        return {"answer": C * 1e12, "vals": {"w": w, "Cp": C * 1e12, "Cn": C * 1e9}}
    Lm, Cn = q["Lm"], q["Cn"]
    w0 = series_rlc_w0(Lm, Cn)
    assert w0.is_integer
    pr = Lm * Cn
    sq = math.isqrt(pr)
    vals = {"pr": pr, "sq": sq, "w": int(w0)}
    if lv == 1:
        if q["kind"] == 0:
            return {"answer": int(w0), "vals": vals}
        f = float(w0 / (2 * sp.pi))
        vals["f"] = f
        return {"answer": f, "vals": vals}
    XL = w0 * sp.Rational(Lm, 1000)
    if lv == 2:
        Rv = q["R"]
        Q = XL / Rv
        # bandwidth from the half-power frequencies of the exact series RLC (ω₂ − ω₁ = R/L)
        w = sp.symbols("w", positive=True)
        L, C = sp.Rational(Lm, 1000), sp.Rational(Cn, 10 ** 9)
        half = sp.solve(sp.Eq((w * L - 1 / (w * C)) ** 2, Rv ** 2), w)
        assert len(half) == 2
        BW = sp.simplify(max(half) - min(half))
        assert BW == w0 / Q
        vals.update({"XL": int(XL), "Q": int(Q), "BW": int(BW)})
        return {"answer": [int(Q), int(BW)], "vals": vals}
    Vs, Rv = Fx(q["Vs"]), q["R"]
    L, C = F(Lm, 1000), F(Cn, 10 ** 9)
    w0f = F(int(w0))
    Z = complex(Rv, float(w0f * L - 1 / (w0f * C)))
    assert abs(Z.imag) < 1e-9
    I = Vs / Rv
    VC = I / (w0f * C)
    vals.update({"ImA": float(I * 1000), "I": float(I), "XL": int(XL), "VC": float(VC), "Q": float(XL / Rv)})
    return {"answer": float(VC), "vals": vals}


# ---- EE.12 filters ----------------------------------------------------------------------------------------------------------------
def ee_12(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        Rk, Cn = Fx(q["Rk"]), Fx(q["Cn"])
        RC = float(Rk * 1000 * Cn / 10 ** 9)
        f = 1 / (2 * math.pi * RC)
        H = 1 / (1 + 1j * 2 * math.pi * f * RC)
        assert abs(abs(H) - 1 / math.sqrt(2)) < 1e-12
        return {"answer": f, "vals": {"RC": float(Rk * Cn), "f": f}}
    if lv == 2:
        k, fc = float(Fx(q["k"])), q["fc"]
        RC = 1 / (2 * math.pi * fc)
        H = 1 / (1 + 1j * 2 * math.pi * k * fc * RC)
        return {"answer": 20 * math.log10(abs(H)), "vals": {"k": k, "kk": k * k, "mag": abs(H), "dB": 20 * math.log10(abs(H)), "ph": deg(H), "f": float(Fx(q["k"]) * fc)}}
    if "Cn" in q:
        Rk = 1 / (2 * math.pi * q["fc"] * q["Cn"] * 1e-9) / 1000
        return {"answer": Rk, "vals": {"Rk": Rk, "R": Rk * 1000}}
    k, fc, A = float(Fx(q["k"])), q["fc"], q["A"]
    RC = 1 / (2 * math.pi * fc)
    wRC = 2 * math.pi * k * fc * RC
    H = 1j * wRC / (1 + 1j * wRC)
    return {"answer": A * abs(H), "vals": {"k": k, "kk": k * k, "mag": abs(H), "out": A * abs(H), "inv": 1 / k, "ph": deg(H), "f": float(Fx(q["k"]) * fc)}}




# ---- EE.16 fields ------------------------------------------------------------------------------------------------------------
MU0 = 4 * sp.pi * sp.Rational(1, 10 ** 7)


def ee_16(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == 0:
            dm = Fx(q["d"]) / 1000
            E = q["V"] / dm
            return {"answer": float(E), "vals": {"dm": float(dm), "E": float(E)}}
        F_ = F(q["q"], 10 ** 6) * q["E"]
        return {"answer": float(F_ * 1000), "vals": {"FN": float(F_), "F": float(F_ * 1000)}}
    if lv == 2:
        if q["kind"] == 0:
            rm = sp.Rational(q["r"], 100)
            B = MU0 * q["I"] / (2 * sp.pi * rm)
            return {"answer": float(B * 10 ** 6), "vals": {"rm": float(rm), "B": float(B * 10 ** 6)}}
        Lm = Fx(q["L"]) / 100
        Fv = np_cross([float(Lm * q["I"]), 0, 0], [0, float(Fx(q["B"])), 0])
        return {"answer": abs(Fv[2]), "vals": {"Lm": float(Lm), "F": abs(Fv[2])}}
    N, A, B1, B2, dt = q["N"], F(q["A"], 10 ** 4), F(q["B1"], 1000), F(q["B2"], 1000), F(q["dt"], 1000)
    tt = sp.symbols("tt")
    phi = sp.Rational(A) * (sp.Rational(B1) + sp.Rational(B2 - B1) / sp.Rational(dt) * tt)
    emf = abs(-N * sp.diff(phi, tt))
    dPhi = A * (B2 - B1)
    return {"answer": float(emf), "vals": {"dB": q["B2"] - q["B1"], "dPhi": float(dPhi * 10 ** 6), "adPhi": float(abs(dPhi) * 10 ** 6), "emf": float(emf)}}


def np_cross(a, b):
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]


# ---- EE.15 transformers ------------------------------------------------------------------------------------------------------------
def ee_15(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        vs = F(q["vp"] * q["ns"], q["np"])
        return {"answer": float(vs), "vals": {"vs": float(vs)}}
    if lv == 2:
        if q["kind"] == 0:
            Pw = F(q["vs"]) * Fx(q["is"])
            ip = Pw / q["vp"]
            # turns ratio check: I_p/I_s = V_s/V_p
            assert ip / Fx(q["is"]) == F(q["vs"], q["vp"])
            return {"answer": float(ip), "vals": {"P": float(Pw), "ip": float(ip)}}
        # reflected impedance: drive the primary with 1 V; secondary at 1/k volts across Z_L
        k, ZL = q["k"], q["ZL"]
        Is = F(1, k) / ZL
        Ip = Is / k
        return {"answer": float(1 / Ip), "vals": {"kk": k * k, "Zin": float(1 / Ip)}}
    Pk, Rl, V1, mult = q["P"], Fx(q["R"]), q["V1"], q["mult"]
    V2 = V1 * mult
    I1, I2 = F(Pk * 1000, V1 * 1000), F(Pk * 1000, V2 * 1000)
    W1, W2 = I1 ** 2 * Rl, I2 ** 2 * Rl
    return {"answer": [float(W1 / 1000), float(W2 / 1000)], "vals": {"V2": V2, "I1": float(I1), "I2": float(I2), "W1": float(W1), "W2": float(W2), "L1": float(W1 / 1000), "L2": float(W2 / 1000), "m2": mult * mult}}


# ---- EE.three-phase ---------------------------------------------------------------------------------------------------------------------
def ee_three_phase(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == 0:
            Va, Vb = cmath.rect(q["vph"], 0), cmath.rect(q["vph"], math.radians(-120))
            vl = abs(Va - Vb)
            return {"answer": vl, "vals": {"vl": vl}}
        Iab, Ica = cmath.rect(q["iph"], 0), cmath.rect(q["iph"], math.radians(120))
        il = abs(Iab - Ica)
        return {"answer": il, "vals": {"il": il}}
    if lv == 2:
        vph = q["vl"] / math.sqrt(3)
        th = math.acos(q["pf"])
        S1 = cmath.rect(vph, 0) * cmath.rect(q["il"], -th).conjugate()
        Pw = 3 * S1.real
        return {"answer": Pw / 1000, "vals": {"Pw": Pw, "Pk": Pw / 1000}}
    Z = complex(q["R"], q["X"])
    tot = 0
    for k in range(3):
        V = cmath.rect(q["vph"], math.radians(-120 * k))
        I = V / Z
        tot += (V * I.conjugate()).real
    Zm = abs(Z)
    iph = q["vph"] / Zm
    assert abs(Zm - round(Zm)) < 1e-12
    pf = F(q["R"], round(Zm))
    return {"answer": tot, "vals": {"Zm": Zm, "iph": iph, "P1": tot / 3, "Pt": tot, "vl": q["vph"] * math.sqrt(3), "pf": float(pf), "pfq": fr(pf)}}


def _pf_parts(Rv, Zm):
    # the generator shows the triple's a/h (not reduced): a = R/m, h = |Z|/m with m = gcd-free scale of the triple
    for a, b, h in [(3, 4, 5), (4, 3, 5), (5, 12, 13), (12, 5, 13), (6, 8, 10), (8, 6, 10), (8, 15, 17), (15, 8, 17), (7, 24, 25), (24, 7, 25), (20, 21, 29), (21, 20, 29)]:
        if Rv * h == Zm * a and Rv % a == 0 and Zm % h == 0 and Rv // a == Zm // h:
            return {"pfn": a, "pfd": h}
    raise AssertionError("no triple")


# ---- EE.21 batteries -----------------------------------------------------------------------------------------------------------------------
def ee_21(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == 0:
            Ah = F(q["mAh"], 1000)
            Wh = Fx(q["V"]) * Ah
            return {"answer": float(Wh), "vals": {"Ah": float(Ah), "Wh": float(Wh)}}
        t = F(q["Ah"]) / Fx(q["I"])
        return {"answer": float(t), "vals": {"t": float(t)}}
    if lv == 2:
        Vc, Ac = Fx(q["Vc"]), Fx(q["Ac"])
        Vp, Ap = q["ns"] * Vc, q["np"] * Ac
        return {"answer": [float(Vp), float(Vp * Ap)], "vals": {"Vp": float(Vp), "Ap": float(Ap), "Wh": float(Vp * Ap), "cells": q["ns"] * q["np"], "cellWh": float(Vc * Ac)}}
    if q["kind"] == 0:
        Eb = F("3.7") * F(q["mAh"], 1000)
        Eo = Eb * Fx(q["eta"])
        return {"answer": float(Eo / q["ph"]), "vals": {"Ah": q["mAh"] / 1000, "Eb": float(Eb), "Eo": float(Eo), "nCh": float(Eo / q["ph"]), "pct": float(Fx(q["eta"]) * 100)}}
    usable = q["kWh"] * Fx(q["use"])
    km = usable * 1000 / q["cons"]
    return {"answer": float(km), "vals": {"usable": float(usable), "Wh": float(usable * 1000), "km": float(km), "pct": float(Fx(q["use"]) * 100)}}


# ---- EE.14 diodes ---------------------------------------------------------------------------------------------------------------------------
def diode_circuit(Vs, nd, R, reverse):
    """Constant-drop diodes: try both states, keep the consistent one."""
    on_I = (Vs - F("0.7") * nd) / R
    if not reverse and on_I > 0:
        return on_I
    return F(0)


def ee_14(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        Vs, Vf, I = Fx(q["Vs"]), Fx(q["Vf"]), F(q["I"], 1000)
        drop = Vs - Vf
        Rv = drop / I
        # with that resistor the loop current is exactly the target
        _, cur = mna([("V", "s", "0", Vs), ("R", "s", "a", Rv), ("V", "a", "0", Vf)])
        assert cur[0] == I
        return {"answer": float(Rv), "vals": {"drop": float(drop), "IA": float(I), "R": float(Rv), "P": float(drop * q["I"])}}
    if lv == 2:
        if q["kind"] == 0:
            return {"answer": float(F(q["Vm"]) - F("0.7")), "vals": {"pk": float(F(q["Vm"]) - F("0.7"))}}
        I = diode_circuit(F(q["Vs"]), q["nd"], Fx(q["Rk"]), q["rev"])
        if q["rev"]:
            return {"answer": 0.0, "vals": {"I": 0.0}}
        drop = F("0.7") * q["nd"]
        return {"answer": float(I), "vals": {"drop": float(drop), "VR": float(F(q["Vs"]) - drop), "I": float(I)}}
    Vm = q["Vrms"] * math.sqrt(2)
    drop = 1.4 if q["full"] else 0.7
    fr = 2 * q["f"] if q["full"] else q["f"]
    Vr = q["I"] / 1000 / (fr * q["Cu"] * 1e-6)
    return {"answer": Vm - drop - Vr, "vals": {"Vm": Vm, "pk": Vm - drop, "fr": fr, "IA": q["I"] / 1000, "Vr": Vr, "Vmin": Vm - drop - Vr}}


# ---- EE.transistor-regions ----------------------------------------------------------------------------------------------------------------
def mosfet_id(kn, Vt, Vgs, Vds):
    ov = Vgs - Vt
    if ov <= 0:
        return F(0), 0
    if Vds >= ov:
        return kn * ov * ov / 2, 2
    return kn * (ov * Vds - Vds * Vds / 2), 1


def ee_transistor_regions(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        ib = F(q["ib"], 1000)
        ic = q["beta"] * ib
        return {"answer": [float(ic), float(ic + ib)], "vals": {"icu": q["beta"] * q["ib"], "ic": float(ic), "ibm": float(ib), "ie": float(ic + ib)}}
    if lv == 2:
        kn, Vt, Vgs, Vds = (Fx(q[k]) for k in ("kn", "Vt", "Vgs", "Vds"))
        idv, reg = mosfet_id(kn, Vt, Vgs, Vds)
        ov = Vgs - Vt
        # continuity at the triode/saturation boundary is a sanity check of the two formulas
        assert mosfet_id(kn, Vt, Vgs, ov)[0] == kn * ov * ov / 2 or ov <= 0
        return {"answer": float(idv), "vals": {"ov": float(ov), "id": float(idv), "br": float(ov * Vds - Vds * Vds / 2)}}
    Vbb, Rb, beta, Vcc, Rc = F(q["Vbb"]), F(q["Rb"]), q["beta"], F(q["Vcc"]), Fx(q["Rc"])
    ib = (Vbb - F("0.7")) / Rb
    icA = beta * ib
    vceA = Vcc - icA * Rc
    vals = {"vbb7": float(Vbb - F("0.7")), "ib": float(ib), "ibu": float(ib * 1000), "icA": float(icA), "vceA": float(vceA)}
    if vceA >= F("0.2"):
        vals["vce"] = float(vceA)
        return {"answer": float(vceA), "vals": vals}
    icS = (Vcc - F("0.2")) / Rc
    assert icS < icA
    vals.update({"icS": float(icS), "vce": 0.2})
    return {"answer": 0.2, "vals": vals}


# ---- EE.13 op-amps ------------------------------------------------------------------------------------------------------------------------------
def opamp_noninv(rf, rg, vin, A=10 ** 7):
    """Solve the non-inverting amp with a finite open-loop gain A and take A → ∞ with SymPy."""
    Ag = sp.symbols("Ag", positive=True)
    vo = sp.symbols("vo")
    vminus = vo * sp.Rational(rg) / (sp.Rational(rf) + sp.Rational(rg))
    sol = sp.solve(sp.Eq(vo, Ag * (vin - vminus)), vo)[0]
    return sp.limit(sol, Ag, sp.oo)


def ee_13(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        vin = sp.nsimplify(q["vin"])
        if q["inv"]:
            # KCL at the virtual-ground − node: (vin − 0)/Rin + (vo − 0)/Rf = 0
            vo = sp.solve(sp.Eq(vin / q["ri"] + sp.Symbol("vo") / q["rf"], 0))[0]
            G = -sp.Rational(q["rf"], q["ri"])
        else:
            vo = opamp_noninv(q["rf"], q["ri"], vin)
            G = 1 + sp.Rational(q["rf"], q["ri"])
        return {"answer": float(vo), "vals": {"G": float(G), "vo": float(vo)}}
    if lv == 2:
        vin = sp.nsimplify(q["vin"])
        ideal = opamp_noninv(q["rf"], q["rg"], vin)
        vo = max(-q["rail"], min(q["rail"], ideal))
        return {"answer": float(vo), "vals": {"G": float(1 + sp.Rational(q["rf"], q["rg"])), "ideal": float(ideal), "vo": float(vo)}}
    bw = F(q["gbw"] * 1000, q["G"])
    return {"answer": float(bw), "vals": {"gbwk": q["gbw"] * 1000, "bw": float(bw), "Gmax": float(F(q["gbw"] * 1000, q["need"]))}}


def ee_opamp_configs(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        vo = sp.Symbol("vo")
        v1, v2 = sp.nsimplify(q["v1"]), sp.nsimplify(q["v2"])
        sol = sp.solve(sp.Eq(v1 / q["r1"] + v2 / q["r2"] + vo / q["rf"], 0), vo)[0]
        return {"answer": float(sol), "vals": {"t1": float(sp.Rational(q["rf"], q["r1"]) * v1), "t2": float(sp.Rational(q["rf"], q["r2"]) * v2), "vo": float(sol)}}
    if lv == 2:
        # difference amp: + node is a divider of V2 (R1 on top, R2 to ground); KCL at − node with V− = V+
        v1, v2 = sp.nsimplify(q["v1"]), sp.nsimplify(q["v2"])
        ra, rb = q["ra"], q["rb"]
        vp = v2 * sp.Rational(rb, ra + rb)
        vo = sp.Symbol("vo")
        sol = sp.solve(sp.Eq((v1 - vp) / ra + (vo - vp) / rb, 0), vo)[0]
        return {"answer": float(sol), "vals": {"G": rb / ra, "d": float(v2 - v1), "vo": float(sol)}}
    Rk, Cu, vin, rail = sp.nsimplify(q["Rk"]), sp.nsimplify(q["Cu"]), sp.nsimplify(q["vin"]), q["rail"]
    tau = Rk * Cu  # ms
    vout = -sp.integrate(vin, (T_, 0, T_)) / tau
    sat = -sp.sign(vin) * rail
    ts = sp.solve(sp.Eq(vout, sat), T_)[0]
    return {"answer": float(ts), "vals": {"tau": float(tau), "slope": float(-vin / tau), "ts": float(ts), "sat": float(sat), "absv": float(abs(vin))}}




# ---- EE.lti -------------------------------------------------------------------------------------------------------------------------
def ee_lti(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        x, h = q["x"], q["h"]
        # convolution as polynomial multiplication (the Z-transform's convolution theorem)
        Xz = sum(c * Z ** k for k, c in enumerate(x))
        Hz = sum(c * Z ** k for k, c in enumerate(h))
        Yp = sp.Poly(sp.expand(Xz * Hz), Z)
        L = len(x) + len(h) - 1
        y = [int(Yp.coeff_monomial(Z ** k)) for k in range(L)]
        return {"answer": y, "vals": {"L": L, "y": y, "sy": sum(y), "sx": sum(x), "sh": sum(h)}}
    A, rr = q["A"], F(q["r"]["n"], q["r"]["d"])
    k = sp.symbols("k", integer=True, nonnegative=True)
    total = sp.summation(A * abs(sp.Rational(rr.numerator, rr.denominator)) ** k, (k, 0, sp.oo))
    assert abs(rr) < 1
    pts = [[kk, float(A * rr ** kk)] for kk in range(6)]
    return {"answer": float(total), "vals": {"sum": fr(F(str(total))), "h1": fr(abs(rr) * A), "h2": fr(rr * rr * A), "ab": fr(abs(rr)), "pts": pts}}


# ---- EE.laplace -----------------------------------------------------------------------------------------------------------------------
def ee_laplace(p):
    q, lv = p["params"], p["level"]
    tp = sp.symbols("t", positive=True)
    if lv == 1:
        if q["kind"] == 0:
            Fs = sp.laplace_transform(q["A"] + q["B"] * sp.exp(-q["a"] * tp), tp, S, noconds=True)
            return {"answer": str(Fs).replace("**", "^"), "vals": {}}
        f = sp.inverse_laplace_transform(sp.Integer(q["K"]) / (S + q["a"]), S, tp)
        return {"answer": str(f.subs(sp.Heaviside(tp), 1)).replace("**", "^").replace("t", "t"), "vals": {}}
    if lv == 2:
        if q["kind"] == 0:
            Y = sp.Integer(q["K"]) / (S * (S + q["a"]))
            c = sp.Rational(q["K"], q["a"])
            vals = {"c": float(c), "nc": float(-c)}
        else:
            Y = sp.Integer(q["K"]) / ((S + q["a"]) * (S + q["b"]))
            c = sp.Rational(q["K"], q["b"] - q["a"])
            vals = {"c": float(c), "nc": float(-c), "ba": q["b"] - q["a"]}
        y = sp.inverse_laplace_transform(Y, S, tp).subs(sp.Heaviside(tp), 1)
        return {"answer": str(sp.simplify(y)).replace("**", "^"), "vals": vals}
    a, b, y0 = q["a"], q["b"], q["y0"]
    yf = sp.Function("y")
    sol = sp.dsolve(sp.Eq(yf(T_).diff(T_) + a * yf(T_), b), yf(T_), ics={yf(0): y0}).rhs
    fin = sp.Rational(b, a)
    assert fin.is_integer
    return {"answer": str(sol).replace("**", "^"), "vals": {"fin": int(fin), "d": int(y0 - fin)}}


# ---- EE.poles-zeros -------------------------------------------------------------------------------------------------------------------
def ee_poles_zeros(p):
    q, lv = p["params"], p["level"]
    b, c = q["b"], q["c"]
    roots = sp.solve(S ** 2 + b * S + c, S)
    if lv == 1:
        p1, p2 = sorted(int(x) for x in roots)[::-1]
        D = b * b - 4 * c
        return {"answer": [p1, p2], "vals": {"b": b, "c": c, "D": D, "sD": math.isqrt(D), "nb": -b, **_p12(p)}}
    if lv == 2:
        r_ = [x for x in roots if sp.im(x) > 0][0]
        al, be = -sp.re(r_), sp.im(r_)
        return {"answer": [float(-al), float(be)], "vals": {"al": float(al), "aa": float(al * al), "bb": float(be * be), "be": float(be), "nal": float(-al)}}
    re = [complex(x).real for x in roots]
    if max(re) < -1e-12:
        cls = 0
    elif max(re) > 1e-12:
        cls = 2
    else:
        cls = 1
    return {"answer": cls, "vals": {"b": b, "c": c, "nb": -b, "cls": cls}}


def _p12(p):
    # the generator's p1/p2 labels are its own draw order; check they are the two roots and report them back
    g1, g2 = p["vals"]["p1"], p["vals"]["p2"]
    q = p["params"]
    assert sorted([g1, g2]) == sorted(int(x) for x in sp.solve(S ** 2 + q["b"] * S + q["c"], S))
    return {"p1": g1, "p2": g2}


# ---- EE.bode ----------------------------------------------------------------------------------------------------------------------------
def asym_db(K, poles, w):
    """Straight-line magnitude: 20 log K minus 20 dB/decade per pole above its corner."""
    g = 20 * math.log10(K)
    for wp in poles:
        if w > wp:
            g -= 20 * math.log10(w / wp)
    return g


def ee_bode(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        H0 = q["K"] / abs(1 + 1j * 1e-9 / q["wp"])
        g = 20 * math.log10(H0)
        return {"answer": round(g), "vals": {"g": round(g), "lg": round(math.log10(q["K"]))}}
    if lv == 2:
        wq = q["wp"] * 10 ** q["m"]
        g = asym_db(q["K"], [q["wp"]], wq)
        true = 20 * math.log10(q["K"] / abs(1 + 1j * wq / q["wp"]))
        assert abs(true - g) < 0.05
        return {"answer": g, "vals": {"g0": 20 * math.log10(q["K"]), "g": g, "wq": wq}}
    K, w1, w2, two = q["K"], q["w1"], q["w2"], q["two"]
    poles = [w1, w2] if two else [w1]
    xs = [0, math.log10(w1)] + ([math.log10(w2)] if two else []) + [5]
    pts = [[x, asym_db(K, poles, 10 ** x)] for x in xs]
    # the drawn curve must match only option 0's asymptotes among the four candidates
    cands = [(K, poles), (100 if K == 10 else 10, poles), (K, [w * 10 for w in poles]), (K, [w1] if two else [w1, w1 * 100])]
    match = [all(abs(asym_db(k, ps, 10 ** x) - y) < 1e-9 for x, y in [[x, asym_db(K, poles, 10 ** x)] for x in [0.5, 1.5, 2.5, 3.5, 4.5]]) for k, ps in cands]
    assert match == [True, False, False, False]
    return {"answer": q["order"].index(0), "vals": {"g0": 20 * math.log10(K), "K": K, "w1": w1, "w2": w2, "lw1": math.log10(w1), "pts": pts, "alt": [w1 * 10, w2 * 10, w1 * 100]}}




# ---- EE.20 Fourier / DFT ---------------------------------------------------------------------------------------------------------------
def ee_20(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        df = F(q["fs"], q["N"])
        if q["kind"] == 0:
            return {"answer": float(df), "vals": {"df": float(df)}}
        # the generator chose k; recompute it from the shown tone only through df: tone f = k·df must be a bin
        f = F(str(p["vals"]["f"]))
        kk = f / df
        assert kk.denominator == 1 and 0 < kk < q["N"] // 2
        return {"answer": int(kk), "vals": {"df": float(df), "k": int(kk), "f": float(f)}}
    if lv == 2:
        x = q["x"]
        X = [sum(x[nn] * cmath.exp(-2j * math.pi * k * nn / 4) for nn in range(4)) for k in range(4)]
        re, im = round(X[1].real, 9), round(X[1].imag, 9)
        return {"answer": [re, im], "vals": {"re": re, "im": im, "aim": abs(im), "X0": round(X[0].real, 9)}}
    A, nh = q["A"], q["nh"]
    # Fourier sine coefficient of the ±A square wave of period 2π
    b = sp.integrate(A * sp.sin(nh * T_), (T_, 0, sp.pi)) * 2 / sp.pi
    return {"answer": float(b), "vals": {"amp": float(b), "fh": nh * q["f0"], "nh": nh}}


# ---- EE.18 sampling ----------------------------------------------------------------------------------------------------------------------
def ee_18(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        return {"answer": 2 * q["fm"], "vals": {"fmin": 2 * q["fm"]}}
    if lv == 2:
        f, fs = F(str(q["f"])), q["fs"]
        # the sampled tone: cos(2π f n / fs) equals cos(2π fa n / fs) with fa in [0, fs/2]
        fa = min((abs(f - k * fs) for k in range(0, 50)), key=lambda v: v)
        assert fa <= F(fs, 2)
        for nn in range(1, 6):
            assert abs(math.cos(2 * math.pi * float(f) * nn / fs) - math.cos(2 * math.pi * float(fa) * nn / fs)) < 1e-6
        k = round(f / fs)
        return {"answer": float(fa), "vals": {"ny": fs / 2, "ratio": float(f / fs), "k": k, "fa": float(fa), "ks": k * fs}}
    N, Vref, Vin = q["N"], Fx(q["Vref"]), Fx(q["Vin"])
    levels = 2 ** N
    ratio = Vin / Vref * levels
    D = math.floor(ratio)
    assert 0 <= D <= levels - 1
    return {"answer": D, "vals": {"levels": levels, "top": levels - 1, "lsb": float(Vref / levels * 1000), "ratio": float(ratio), "D": D, "sq": 6.02 * N + 1.76}}


# ---- EE.ztransform -----------------------------------------------------------------------------------------------------------------------
def ee_ztransform(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        X = sum(c * Z ** (-k) for k, c in enumerate(q["x"]))
        return {"answer": str(X).replace("**", "^"), "vals": {}}
    A, b0, b1 = F(q["A"]["n"], q["A"]["d"]), q["b0"], q["b1"]
    Ar = sp.Rational(A.numerator, A.denominator)
    Hz = (b0 + b1 / Z) / (1 - Ar / Z)
    if lv == 2:
        # impulse response from the power series of H in z^{-1}
        w = sp.symbols("w")  # w = z^{-1}
        ser = sp.series((b0 + b1 * w) / (1 - Ar * w), w, 0, 4).removeO()
        h = [F(str(ser.coeff(w, k))) for k in range(4)]
        return {"answer": [float(v) for v in h], "vals": {"h": [fr(v) for v in h]}}
    dc = Hz.subs(Z, 1)
    ny = Hz.subs(Z, -1)
    assert abs(Ar) < 1
    return {"answer": [float(dc), float(ny)], "vals": {"dc": fr(F(str(dc))), "ny": fr(F(str(ny)))}}


# ---- EE.19 decibels ----------------------------------------------------------------------------------------------------------------------
def ee_19(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == 0:
            d = 10 * math.log10(q["ratio"])
            return {"answer": d, "vals": {"d": d}}
        vr = 10 ** (q["g"] / 20)
        return {"answer": vr, "vals": {"e": q["g"] / 20, "vr": vr}}
    if lv == 2:
        mw_in = 10 ** (q["pin"] / 10)
        mw = mw_in * 10 ** (q["g1"] / 10) / 10 ** (q["loss"] / 10) * 10 ** (q["g2"] / 10)
        out = 10 * math.log10(mw)
        return {"answer": [out, mw], "vals": {"out": out, "mw": mw}}
    B = q["B"]
    if q["kind"] == 0:
        C_ = B * sp.log(1 + q["snr"], 2)
        return {"answer": float(C_), "vals": {"snr1": q["snr"] + 1, "k": float(sp.log(1 + q["snr"], 2)), "C": float(C_)}}
    lin = 10 ** (q["sdb"] / 10)
    l2 = math.log2(1 + lin)
    return {"answer": B * l2, "vals": {"lin": lin, "lin1": 1 + lin, "l2": l2, "C": B * l2}}


# ---- EE.feedback ---------------------------------------------------------------------------------------------------------------------------
def ee_feedback(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        g, h = F(q["g"]), F(1, q["m"])
        # solve the loop equations y = G e, e = r − H y with r = 1
        y, e = sp.symbols("y e")
        sol = sp.solve([sp.Eq(y, g * e), sp.Eq(e, 1 - sp.Rational(1, q["m"]) * y)], [y, e])
        T = F(str(sol[y]))
        return {"answer": float(T), "vals": {"gh": fr(g * h), "T": float(T), "m": q["m"]}}
    if lv == 2:
        K, a = q["K"], q["a"]
        G = sp.Integer(K) / (S + a)
        E = 1 / (1 + G) * (1 / S)
        ess = sp.limit(S * E, S, 0)
        return {"answer": float(ess), "vals": {"Kp": fr(F(K, a)), "ess": fr(F(str(ess))), "aK": a + K}}
    a, zt = q["a"], F(q["zt"]["n"], q["zt"]["d"])
    K = sp.symbols("K", positive=True)
    # zeta of s² + a s + K is a / (2√K)
    sol = sp.solve(sp.Eq(sp.Rational(a) / (2 * sp.sqrt(K)), sp.Rational(zt.numerator, zt.denominator)), K)
    assert len(sol) == 1
    Kv = F(str(sol[0]))
    return {"answer": float(Kv), "vals": {"wn": fr(F(a) / (2 * zt)), "K": fr(Kv), "zt": fr(zt)}}


# ---- EE.pid ------------------------------------------------------------------------------------------------------------------------------------
def ee_pid(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        kp, ki, kd = Fx(q["kp"]), Fx(q["ki"]), Fx(q["kd"])
        P_, I_, D_ = kp * q["e"], ki * q["ie"], kd * q["de"]
        return {"answer": float(P_ + I_ + D_), "vals": {"p": float(P_), "i": float(I_), "d": float(D_), "u": float(P_ + I_ + D_)}}
    if lv == 2:
        ku, tu = F(q["ku"]), Fx(q["tu"])
        kp, ti, td = F(6, 10) * ku, tu / 2, tu / 8
        return {"answer": [float(kp), float(kp / ti), float(kp * td)], "vals": {"kp": float(kp), "ti": float(ti), "td": float(td), "ki": float(kp / ti), "kd": float(kp * td)}}
    kp, ki, kd, ts, e = Fx(q["kp"]), Fx(q["ki"]), Fx(q["kd"]), Fx(q["ts"]), q["e"]
    P_ = kp * e[2]
    I_ = ki * ts * sum(e)
    D_ = kd * (e[2] - e[1]) / ts
    return {"answer": float(P_ + I_ + D_), "vals": {"sum": sum(e), "p": float(P_), "i": float(I_), "d": float(D_), "slope": float((e[2] - e[1]) / ts), "u": float(P_ + I_ + D_)}}




# ---- Digital logic (Boolean trees evaluated independently with SymPy's logic module) ----------------------------------------
A_, B_, C_, D_ = sp.symbols("A B C D")
SYM = {"A": A_, "B": B_, "C": C_, "D": D_}


def to_sym(e):
    if isinstance(e, str):
        return SYM[e]
    op, *a = e
    a = [to_sym(x) for x in a]
    return {"not": lambda: sp.Not(a[0]), "and": lambda: sp.And(*a), "or": lambda: sp.Or(*a), "xor": lambda: sp.Xor(*a)}[op]()


def truth(expr, names):
    return [bool(expr.subs({SYM[v]: bool((m >> (len(names) - 1 - i)) & 1) for i, v in enumerate(names)})) for m in range(2 ** len(names))]


def ee_17(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        v = int(q["b"], 2)
        terms = [2 ** i for i in range(7, -1, -1) if (v >> i) & 1]
        return {"answer": v, "vals": {"b": q["b"], "terms": terms, "v": v}}
    if lv == 2:
        tt = truth(to_sym(q["tree"]), "ABC")
        ones = [m for m in range(8) if tt[m]]
        return {"answer": len(ones), "vals": {"count": len(ones), "ones": ones}}
    target = sp.simplify_logic(to_sym(q["tree"]))
    eq = [sp.simplify_logic(sp.Equivalent(to_sym(o), target)) == sp.true for o in q["opts"]]
    assert sum(eq) == 1, eq
    return {"answer": eq.index(True), "vals": {}}


def ee_number_systems(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        v = int(q["hx"], 16)
        d1, d0 = divmod(v, 16)
        if p["answer"]["kind"] == "number":
            return {"answer": v, "vals": {"d1": d1, "d0": d0, "d16": d1 * 16, "v": v}}
        return {"answer": format(v, "08b"), "vals": {"d1": d1, "d0": d0, "b": format(v, "08b"), "v": v}}
    if lv == 2:
        if "b" in q:
            u = int(q["b"], 2)
            v = u - 256 if u >= 128 else u
            assert v < 0
            return {"answer": v, "vals": {"low": u - 128, "v": v, "nv": -v, "nb": format(-v, "08b")}}
        x = q["x"]
        nb = format((-x) & 0xFF, "08b")
        pb = format(x, "08b")
        inv = format(~x & 0xFF, "08b")
        assert int(nb, 2) == (int(inv, 2) + 1) & 0xFF
        return {"answer": nb, "vals": {"pb": pb, "inv": inv, "nb": nb, "low": int(nb, 2) - 128, "x": x}}
    a, b = q["a"], q["b"]
    raw = ((a & 0xFF) + (b & 0xFF)) & 0xFF
    val = raw - 256 if raw & 0x80 else raw
    return {"answer": val, "vals": {"sum": a + b, "wrapped": val, "ab": format(a & 0xFF, "08b"), "bb": format(b & 0xFF, "08b"), "sb": format(raw, "08b")}}


def cube_expr(c, names):
    lits = [SYM[names[i]] if ch == "1" else sp.Not(SYM[names[i]]) for i, ch in enumerate(c) if ch != "-"]
    return sp.And(*lits) if lits else sp.true


def ee_kmap(p):
    q = p["params"]
    nv, mins = q["nv"], q["mins"]
    names = "ABCD"[:nv]
    syms = [SYM[v] for v in names]
    f = sp.SOPform(syms, [[(m >> (nv - 1 - i)) & 1 for i in range(nv)] for m in mins])
    fn = truth(f, names)
    opts = [sp.Or(*[cube_expr(c, names) for c in o]) for o in q["opts"]]
    eq = [truth(o, names) == fn for o in opts]
    assert sum(eq) == 1, eq
    k = eq.index(True)
    # the correct option is minimal: same number of terms and literals as SymPy's minimal SOP
    terms = f.args if isinstance(f, sp.Or) else (f,)
    nl = sum(len(t.args) if isinstance(t, sp.And) else 1 for t in terms)
    mine = q["opts"][k]
    assert len(mine) == len(terms) and sum(sum(ch != "-" for ch in c) for c in mine) == nl
    return {"answer": k, "vals": {}}


def ee_flipflops(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        nb, fk = q["nb"], q["fk"]
        # simulate the counter's MSB over 2·2^n clock edges and measure its period
        msb = [(k >> (nb - 1)) & 1 for k in range(2 * 2 ** nb)]
        rises = [k for k in range(1, len(msb)) if msb[k] and not msb[k - 1]]
        period = 2 ** nb if len(rises) < 2 else rises[1] - rises[0]
        fq = F(fk, period)
        return {"answer": [2 ** nb, float(fq)], "vals": {"mod": 2 ** nb, "top": 2 ** nb - 1, "fq": float(fq), "i": nb - 1}}
    if lv == 2:
        tot = Fx(q["tcq"]) + Fx(q["tl"]) + Fx(q["ts"])
        return {"answer": float(1000 / tot), "vals": {"tot": float(tot), "fm": float(1000 / tot)}}
    qv, out = q["Q0"], ""
    for j, k in zip(q["J"], q["K"]):
        qv = (j & (1 - qv)) | ((1 - k) & qv)  # Q+ = J·Q̄ + K̄·Q
        out += str(qv)
    return {"answer": out, "vals": {"ans": out}}


def ee_22(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        V, P_ = F(q["V"]), F(q["P"])
        R_ = V * V / P_
        return {"answer": [float(R_), float(V / R_)], "vals": {"VV": int(V * V), "R": float(R_), "I": float(V / R_)}}
    if lv == 2:
        Vs, fuse, Pd = q["Vs"], q["fuse"], q["Pd"]
        each = F(Pd, Vs)
        nmax = 0
        while (nmax + 1) * each <= fuse:
            nmax += 1
        return {"answer": nmax, "vals": {"each": float(each), "W": fuse * Vs, "ratio": float(F(fuse * Vs, Pd)), "nmax": nmax, "over": float((nmax + 1) * each), "Pd": Pd}}
    Rl = F(q["Vr"] ** 2, q["Pr"])
    volt, cur = mna([("V", "s", "0", q["Vr"]), ("R", "s", "l", q["Rs"]), ("R", "l", "0", Rl)])
    Pl = volt["l"] ** 2 / Rl
    return {"answer": float(Pl), "vals": {"R": float(Rl), "sum": float(Rl + q["Rs"]), "I": float(cur[0]), "Pl": float(Pl)}}


def ee_23(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        volt, cur = mna([("V", "s", "0", q["Vs"]), ("V", "s", "m", 0), ("R", "m", "x", q["R1"]), ("R", "x", "0", q["R2"])])  # ammeter = 0 V source
        return {"answer": [float(cur[0]), float(volt["x"])], "vals": {"I": float(cur[0]), "V2": float(volt["x"])}}
    if lv == 2:
        Vs, R1, R2, Rm = q["Vs"], q["R1"], q["R2"], q["Rm"]
        v0, _ = mna([("V", "s", "0", Vs), ("R", "s", "x", R1), ("R", "x", "0", R2)])
        vm, _ = mna([("V", "s", "0", Vs), ("R", "s", "x", R1), ("R", "x", "0", R2), ("R", "x", "0", Rm)])
        return {"answer": float(vm["x"]), "vals": {"V0": float(v0["x"]), "sum": R1 + R2, "Rp": float(par(R2, Rm)), "Vm": float(vm["x"])}}
    Ig, Rg = Fx(q["Ig"]) / 1000, F(q["Rg"])
    if q["kind"] == 0:
        Rt = F(q["Vfs"]) / Ig
        Rs = Rt - Rg
        # at full-scale voltage the series string carries exactly Ig
        _, cur = mna([("V", "s", "0", q["Vfs"]), ("R", "s", "m", Rs), ("R", "m", "0", Rg)])
        assert cur[0] == Ig
        return {"answer": float(Rs), "vals": {"Rt": float(Rt), "Rs": float(Rs)}}
    Ifs = F(q["Ifs"])
    Vg = Ig * Rg
    Rsh = Vg / (Ifs - Ig)
    volt, _ = mna([("I", "0", "a", Ifs), ("R", "a", "0", Rg), ("R", "a", "0", Rsh)])
    assert volt["a"] / Rg == Ig
    return {"answer": float(Rsh * 1000), "vals": {"Vg": float(Vg), "Ig_A": float(Ig), "Ish": float(Ifs - Ig), "Rsh": float(Rsh * 1000)}}


def ee_24(p):
    q, lv = p["params"], p["level"]
    vz, vin = Fx(q["vz"]), F(q["vin"])
    if lv == 1:
        IR = (vin - vz) / q["R"] * 1000
        return {"answer": float(IR), "vals": {"drop": float(vin - vz), "IR": float(IR)}}
    if lv == 2:
        # the Zener as an ideal voltage source (breakdown); its current from MNA
        volt, cur = mna([("V", "s", "0", vin), ("R", "s", "z", q["R"]), ("V", "z", "0", vz), ("R", "z", "0", q["RL"])])
        iz = -cur[2] * 1000  # current into the Zener's + (cathode) terminal
        assert iz > 0
        return {"answer": float(iz), "vals": {"IR": float((vin - vz) / q["R"] * 1000), "IL": float(vz / q["RL"] * 1000), "iz": float(iz)}}
    tot = F(q["ILmax"] + q["Izmin"])
    Rd = (vin - vz) / tot * 1000
    Pz = vz * (vin - vz) / Rd * 1000
    return {"answer": [float(Rd), float(Pz)], "vals": {"tot": float(tot), "R": float(Rd), "P": float(Pz)}}


GATE_PY = {"AND": lambda a, b: sp.And(a, b), "OR": lambda a, b: sp.Or(a, b), "NAND": lambda a, b: sp.Nand(a, b), "NOR": lambda a, b: sp.Nor(a, b),
           "XOR": lambda a, b: sp.Xor(a, b), "XNOR": lambda a, b: sp.Not(sp.Xor(a, b))}


def ee_25(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        col = "".join("1" if v else "0" for v in truth(GATE_PY[q["g"]](A_, B_), "AB"))
        return {"answer": col, "vals": {"col": col}}
    if lv == 2:
        y = GATE_PY[q["g2"]](GATE_PY[q["g1"]](A_, B_), C_)
        col = "".join("1" if v else "0" for v in truth(y, "ABC"))
        return {"answer": col, "vals": {"ans": col}}
    s_ = q["a"] + q["b"]
    out = format(s_, "05b")
    return {"answer": out, "vals": {"out": out, "sum": s_}}


VERIFY = {
    "EE.1": ee_1,
    "EE.resistance": ee_resistance,
    "EE.series-parallel": ee_series_parallel,
    "EE.2": ee_2,
    "EE.3": ee_3,
    "EE.sources": ee_sources,
    "EE.5": ee_5,
    "EE.superposition": ee_superposition,
    "EE.4": ee_4,
    "EE.6": ee_6,
    "EE.7": ee_7,
    "EE.rlc-transient": ee_rlc_transient,
    "EE.8": ee_8,
    "EE.9": ee_9,
    "EE.10": ee_10,
    "EE.11": ee_11,
    "EE.12": ee_12,
    "EE.16": ee_16,
    "EE.15": ee_15,
    "EE.three-phase": ee_three_phase,
    "EE.21": ee_21,
    "EE.14": ee_14,
    "EE.transistor-regions": ee_transistor_regions,
    "EE.13": ee_13,
    "EE.opamp-configs": ee_opamp_configs,
    "EE.lti": ee_lti,
    "EE.laplace": ee_laplace,
    "EE.poles-zeros": ee_poles_zeros,
    "EE.bode": ee_bode,
    "EE.20": ee_20,
    "EE.18": ee_18,
    "EE.ztransform": ee_ztransform,
    "EE.19": ee_19,
    "EE.feedback": ee_feedback,
    "EE.pid": ee_pid,
    "EE.17": ee_17,
    "EE.number-systems": ee_number_systems,
    "EE.kmap": ee_kmap,
    "EE.flipflops": ee_flipflops,
    "EE.22": ee_22,
    "EE.23": ee_23,
    "EE.24": ee_24,
    "EE.25": ee_25,
}
