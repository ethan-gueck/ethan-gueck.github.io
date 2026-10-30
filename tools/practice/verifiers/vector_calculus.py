"""Independent answers for practice/vector-calculus.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]), with SymPy. Polynomials travel as
sorted term lists [i, j, (k,) {n, d}]. Wherever a problem uses a theorem (Green, Stokes, divergence, the
fundamental theorem for line integrals, a product rule), the other side of the theorem is computed directly
too (line integrals by parametrization, surface integrals face by face or in spherical angles) and the two
are asserted equal. Nothing here is copied from the JavaScript."""
from fractions import Fraction
from functools import lru_cache
from math import exp, isqrt

import sympy as sp

x, y, z, t, r = sp.symbols("x y z t r")
X2, X3, T1 = (x, y), (x, y, z), (t,)
CT, ST, CP, SP = sp.symbols("CT ST CP SP")   # cos θ (or cos t), sin θ, cos φ, sin φ
pi = sp.pi


# ---- helpers ------------------------------------------------------------------------------------------------
def fr(q):
    q = sp.Rational(q)
    return {"n": int(q.p), "d": int(q.q)}


def poly(rows, gens):
    if not rows:
        return sp.Integer(0)
    return sp.Add(*[sp.Rational(row[-1]["n"], row[-1]["d"]) * sp.Mul(*[g ** e for g, e in zip(gens, row[:-1])]) for row in rows])


def pv(expr, gens):
    e = sp.expand(expr)
    if e == 0:
        return []
    P = sp.Poly(e, *gens)
    rows = [[*m, fr(c)] for m, c in P.terms() if c != 0]
    return sorted(rows, key=lambda row: tuple(row[:-1]), reverse=True)


def at(expr, gens, pt):
    return sp.Rational(sp.expand(expr).subs(dict(zip(gens, pt)), simultaneous=True))


def F3(q):
    return [poly(q["P"], X3), poly(q["Q"], X3), poly(q["R"], X3)]


def div3(Fs):
    return sp.expand(sp.diff(Fs[0], x) + sp.diff(Fs[1], y) + sp.diff(Fs[2], z))


def curl3(Fs):
    P_, Q_, R_ = Fs
    return [sp.expand(sp.diff(R_, y) - sp.diff(Q_, z)), sp.expand(sp.diff(P_, z) - sp.diff(R_, x)), sp.expand(sp.diff(Q_, x) - sp.diff(P_, y))]


def curl_parts(Fs):
    P_, Q_, R_ = Fs
    return {"Ry": pv(sp.diff(R_, y), X3), "Qz": pv(sp.diff(Q_, z), X3), "Pz": pv(sp.diff(P_, z), X3),
            "Rx": pv(sp.diff(R_, x), X3), "Qx": pv(sp.diff(Q_, x), X3), "Py": pv(sp.diff(P_, y), X3)}


def is_rat(v):
    return sp.Rational(v) == v


def circle_int(expr):
    """∫ over a full turn (0 to 2π) of a polynomial in CT = cos t, ST = sin t."""
    e = sp.expand(expr)
    if e == 0:
        return sp.Integer(0)
    tot = sp.Integer(0)
    for (m, k), c in sp.Poly(e, CT, ST).terms():
        if m % 2 == 0 and k % 2 == 0:
            tot += c * 2 * pi * sp.factorial2(m - 1) * sp.factorial2(k - 1) / sp.factorial2(m + k)
    return sp.nsimplify(tot)


def phi_int(m, k, full):
    """∫ cos^m φ sin^k φ dφ over [0, π/2] (or [0, π] when full)."""
    half = sp.gamma(sp.Rational(m + 1, 2)) * sp.gamma(sp.Rational(k + 1, 2)) / (2 * sp.gamma(sp.Rational(m + k, 2) + 1))
    if full:
        return sp.Integer(0) if m % 2 else 2 * half
    return half


def sphere_int(expr, full):
    """∫∫ over θ in [0, 2π] and φ in [0, π/2] (or [0, π]) of a polynomial in CT, ST, CP, SP."""
    e = sp.expand(expr)
    if e == 0:
        return sp.Integer(0)
    tot = sp.Integer(0)
    for (a, b, c, d), co in sp.Poly(e, CT, ST, CP, SP).terms():
        th = circle_int(CT ** a * ST ** b)
        if th != 0:
            tot += co * th * phi_int(c, d, full)
    return sp.nsimplify(sp.simplify(tot))


def sphere_flux(Fs, a, full):
    """Outward flux of a polynomial field through the sphere of radius a (upper half unless full)."""
    pos = [a * SP * CT, a * SP * ST, a * CP]
    N = [a ** 2 * SP * SP * CT, a ** 2 * SP * SP * ST, a ** 2 * SP * CP]   # r_φ × r_θ, outward
    sub = {x: pos[0], y: pos[1], z: pos[2]}
    integrand = sum(sp.expand(Fc.subs(sub, simultaneous=True)) * Nc for Fc, Nc in zip(Fs, N))
    return sphere_int(integrand, full)


def sphere_scalar(f, a, full):
    pos = {x: a * SP * CT, y: a * SP * ST, z: a * CP}
    return sphere_int(sp.expand(f.subs(pos, simultaneous=True)) * a ** 2 * SP, full)


def seg_line_integral(P_, Q_, A, B, flux=False):
    """∫ P dx + Q dy (or the flux P dy − Q dx) along the straight segment A → B, parametrized on [0, 1]."""
    s = sp.Symbol("s")
    X = A[0] + s * (B[0] - A[0])
    Y = A[1] + s * (B[1] - A[1])
    sub = {x: X, y: Y}
    Pt, Qt = P_.subs(sub, simultaneous=True), Q_.subs(sub, simultaneous=True)
    ig = Pt * sp.diff(Y, s) - Qt * sp.diff(X, s) if flux else Pt * sp.diff(X, s) + Qt * sp.diff(Y, s)
    return sp.integrate(sp.expand(ig), (s, 0, 1))


def rect_loop(P_, Q_, x0, y0, x1, y1, flux=False):
    corners = [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)]
    return sum(seg_line_integral(P_, Q_, corners[i], corners[i + 1], flux) for i in range(4))


def box_flux(Fs, a, b, c):
    """Outward flux through the six faces of [0, a] × [0, b] × [0, c], face by face."""
    P_, Q_, R_ = Fs
    tot = sp.integrate(P_.subs(x, a) - P_.subs(x, 0), (y, 0, b), (z, 0, c))
    tot += sp.integrate(Q_.subs(y, b) - Q_.subs(y, 0), (x, 0, a), (z, 0, c))
    tot += sp.integrate(R_.subs(z, c) - R_.subs(z, 0), (x, 0, a), (y, 0, b))
    return sp.nsimplify(tot)


def circle_line_integral(Fs, R, zfun=None):
    """∮ F · dr counterclockwise around x = R cos t, y = R sin t, z = zfun(x, y) (2-D when Fs has two components)."""
    X, Y = R * CT, R * ST
    dX, dY = -R * ST, R * CT
    if len(Fs) == 2:
        sub = {x: X, y: Y}
        ig = Fs[0].subs(sub, simultaneous=True) * dX + Fs[1].subs(sub, simultaneous=True) * dY
    else:
        Z = zfun(X, Y)
        # dZ/dt by the chain rule on the polynomial in CT, ST: d(CT) = −ST, d(ST) = CT
        Zp = sp.expand(sp.diff(Z, CT) * (-ST) + sp.diff(Z, ST) * CT)
        sub = {x: X, y: Y, z: Z}
        ig = sum(Fc.subs(sub, simultaneous=True) * d for Fc, d in zip(Fs, (dX, dY, Zp)))
    return circle_int(ig)


def num(v):
    return float(v)


# ---- V.8 line integrals ----------------------------------------------------------------------------------------
def v8(p):
    q, L = p["params"], p["level"]
    if L == 1:
        P_, Q_ = poly(q["P"], X2), poly(q["Q"], X2)
        X, Y = (t ** 2, t) if q["swap"] else (t, t ** 2)
        Pt, Qt = sp.expand(P_.subs({x: X, y: Y}, simultaneous=True)), sp.expand(Q_.subs({x: X, y: Y}, simultaneous=True))
        dX, dY = sp.diff(X, t), sp.diff(Y, t)
        ig = sp.expand(Pt * dX + Qt * dY)
        an = sp.integrate(ig, t)
        ans = sp.integrate(ig, (t, 0, 1))
        return {"answer": num(ans), "vals": {"dX": pv(dX, T1), "dY": pv(dY, T1), "Pt": pv(Pt, T1), "Qt": pv(Qt, T1), "ig": pv(ig, T1), "an": pv(an, T1), "ans": fr(ans)}}
    if L == 2:
        f = poly(q["f"], X2)
        x0, y0, x1, y1 = q["x0"], q["y0"], q["x1"], q["y1"]
        dx, dy = x1 - x0, y1 - y0
        sqs = dx * dx + dy * dy
        Ln = isqrt(sqs)
        assert Ln * Ln == sqs, "segment length is not whole"
        ft = sp.expand(f.subs({x: x0 + dx * t, y: y0 + dy * t}, simultaneous=True))
        an = sp.integrate(ft, t)
        I1 = an.subs(t, 1)
        ans = Ln * I1
        # f is linear, so ∫ f ds = length × f(midpoint)
        assert ans == Ln * f.subs({x: sp.Rational(x0 + x1, 2), y: sp.Rational(y0 + y1, 2)})
        return {"answer": num(ans), "vals": {"dx": dx, "dy": dy, "sqs": sqs, "L": Ln, "ft": pv(ft, T1), "an": pv(an, T1), "I1": fr(I1), "ans": fr(ans)}}
    P_, Q_ = poly(q["P"], X2), poly(q["Q"], X2)
    a, c = q["a"], q["c"]
    if q["xFirst"]:
        g1, hi1 = P_.subs({x: t, y: 0}), a
        g2, hi2 = Q_.subs({x: a, y: t}), c
        corner = (a, 0)
    else:
        g1, hi1 = Q_.subs({x: 0, y: t}), c
        g2, hi2 = P_.subs({x: t, y: c}), a
        corner = (0, c)
    g1, g2 = sp.expand(g1), sp.expand(g2)
    A1, A2 = sp.integrate(g1, t), sp.integrate(g2, t)
    w1, w2 = A1.subs(t, hi1), A2.subs(t, hi2)
    ans = w1 + w2
    direct = seg_line_integral(P_, Q_, (0, 0), corner) + seg_line_integral(P_, Q_, corner, (a, c))
    assert direct == ans
    return {"answer": num(ans), "vals": {"g1": pv(g1, T1), "g2": pv(g2, T1), "A1": pv(A1, T1), "A2": pv(A2, T1), "w1": fr(w1), "w2": fr(w2), "ans": fr(ans)}}


# ---- V.line-flux -------------------------------------------------------------------------------------------------
def v_line_flux(p):
    q, L = p["params"], p["level"]
    if L == 1:
        a, c = q["a"], q["c"]
        A, B = (q["x0"], q["y0"]), (q["x1"], q["y1"])
        ans = seg_line_integral(sp.Integer(a), sp.Integer(c), A, B, flux=bool(q["flux"]))
        assert ans != 0
        return {"answer": int(ans), "vals": {"dx": B[0] - A[0], "dy": B[1] - A[1], "ans": int(ans)}}
    if L == 2:
        R, a, b, c, d = q["R"], q["a"], q["b"], q["c"], q["d"]
        P_, Q_ = a * x + b * y, c * x + d * y
        X, Y, dX, dY = R * CT, R * ST, -R * ST, R * CT
        Pc, Qc = P_.subs({x: X, y: Y}, simultaneous=True), Q_.subs({x: X, y: Y}, simultaneous=True)
        ig = sp.expand(Pc * dY - Qc * dX) if q["flux"] else sp.expand(Pc * dX + Qc * dY)
        Pl = sp.Poly(ig, CT, ST)
        cCS, cC2, cS2 = Pl.coeff_monomial(CT * ST), Pl.coeff_monomial(CT ** 2), Pl.coeff_monomial(ST ** 2)
        assert sp.expand(ig - (cCS * CT * ST + cC2 * CT ** 2 + cS2 * ST ** 2)) == 0
        total = circle_int(ig)
        coef = total / pi
        # Green's theorem: flux = (P_x + Q_y)·area, circulation = (Q_x − P_y)·area
        assert coef == ((a + d) if q["flux"] else (c - b)) * R * R and coef != 0
        if q["flux"]:
            k1, k2, k3 = cC2, cCS, cS2
        else:
            k1, k2, k3 = cCS, cC2, cS2
        return {"answer": num(total), "vals": {"RR2": R * R, "aR": a * R, "bR": b * R, "cR": c * R, "dR": d * R, "k1": int(k1), "k2": int(k2), "k3": int(k3), "coef": fr(coef)}}
    rho = poly(q["rho"], X2)
    x0, y0, x1, y1 = q["x0"], q["y0"], q["x1"], q["y1"]
    dx, dy = x1 - x0, y1 - y0
    Ln = isqrt(dx * dx + dy * dy)
    assert Ln * Ln == dx * dx + dy * dy
    X, Y = x0 + dx * t, y0 + dy * t
    rt = sp.expand(rho.subs({x: X, y: Y}, simultaneous=True))
    assert all(rt.subs(t, s) > 0 for s in (0, 1)), "density must be positive along the wire"
    an0 = sp.integrate(rt, t)
    I0 = an0.subs(t, 1)
    W = X if q["useX"] else Y
    prod = sp.expand(W * rt)
    an1 = sp.integrate(prod, t)
    I1 = an1.subs(t, 1)
    mass, mom = Ln * I0, Ln * I1
    ans = mom / mass
    return {"answer": num(ans), "vals": {"dx": dx, "dy": dy, "L": Ln, "rt": pv(rt, T1), "an0": pv(an0, T1), "I0": fr(I0), "mass": fr(mass),
                                         "prod": pv(prod, T1), "an1": pv(an1, T1), "I1": fr(I1), "mom": fr(mom), "ans": fr(ans)}}


# ---- potentials ----------------------------------------------------------------------------------------------------
def potential2(P_, Q_):
    assert sp.expand(sp.diff(P_, y) - sp.diff(Q_, x)) == 0, "field is not conservative"
    I = sp.integrate(P_, x)
    Iy = sp.diff(I, y)
    gp = sp.expand(Q_ - Iy)
    assert not gp.has(x)
    g = sp.integrate(gp, y)
    f = sp.expand(I + g)
    assert sp.expand(sp.diff(f, x) - P_) == 0 and sp.expand(sp.diff(f, y) - Q_) == 0
    assert f.subs({x: 0, y: 0}) == 0
    return f, {"I": pv(I, X2), "Iy": pv(Iy, X2), "gp": pv(gp, X2), "g": pv(g, X2), "phi": pv(f, X2)}


def v_ftli(p):
    q, L = p["params"], p["level"]
    A, B = q["A"], q["B"]
    vals = {}
    if L == 1:
        f = poly(q["f"], X2)
        P_, Q_ = sp.diff(f, x), sp.diff(f, y)
    else:
        P_, Q_ = poly(q["P"], X2), poly(q["Q"], X2)
        f, vals = potential2(P_, Q_)
        vals.update({"Py": pv(sp.diff(P_, y), X2), "Qx": pv(sp.diff(Q_, x), X2)})
    fA, fB = at(f, X2, A), at(f, X2, B)
    work = fB - fA
    # path independence: the straight segment gives the same value
    assert seg_line_integral(P_, Q_, A, B) == work
    vals.update({"fA": fr(fA), "fB": fr(fB), "work": fr(work)})
    if L < 3:
        return {"answer": num(work), "vals": vals}
    KB = q["KA"] + work
    assert KB > 0
    vals["KB"] = fr(KB)
    return {"answer": num(KB), "vals": vals}


def v9(p):
    q, L = p["params"], p["level"]
    if L == 1:
        P_, Q_ = poly(q["P"], X2), poly(q["Q"], X2)
        Py, Qx = sp.diff(P_, y), sp.diff(Q_, x)
        cons = sp.expand(Py - Qx) == 0
        assert cons == bool(q["cons"])
        vals = {"Py": pv(Py, X2), "Qx": pv(Qx, X2)}
        if cons:
            f, _ = potential2(P_, Q_)
            vals["phi"] = pv(f, X2)
        return {"answer": 0 if cons else 1, "vals": vals}
    if L == 2:
        P_, Q_ = poly(q["P"], X2), poly(q["Q"], X2)
        f, vals = potential2(P_, Q_)
        vals.update({"Py": pv(sp.diff(P_, y), X2), "Qx": pv(sp.diff(Q_, x), X2)})
        return {"answer": str(f), "vals": vals}
    Fs = F3(q)
    assert all(c == 0 for c in curl3(Fs)), "curl is not zero"
    I = sp.integrate(Fs[0], x)
    Iy = sp.diff(I, y)
    h1 = sp.expand(Fs[1] - Iy)
    assert not h1.has(x)
    H1 = sp.integrate(h1, y)
    S = I + H1
    Sz = sp.diff(S, z)
    h2 = sp.expand(Fs[2] - Sz)
    assert not h2.has(x) and not h2.has(y)
    H2 = sp.integrate(h2, z)
    f = sp.expand(S + H2)
    assert all(sp.expand(sp.diff(f, g) - Fc) == 0 for g, Fc in zip(X3, Fs))
    vals = curl_parts(Fs)
    vals.update({"I": pv(I, X3), "Iy": pv(Iy, X3), "h1": pv(h1, X3), "H1": pv(H1, X3), "Sz": pv(Sz, X3), "h2": pv(h2, X3), "H2": pv(H2, X3), "phi": pv(f, X3)})
    return {"answer": str(f), "vals": vals}


# ---- V.10 divergence and curl ----------------------------------------------------------------------------------------
def v10(p):
    q, L = p["params"], p["level"]
    if L == 1:
        Fs = F3(q)
        parts = [sp.diff(Fs[0], x), sp.diff(Fs[1], y), sp.diff(Fs[2], z)]
        d = div3(Fs)
        assert d != 0
        return {"answer": str(d), "vals": {"Px": pv(parts[0], X3), "Qy": pv(parts[1], X3), "Rz": pv(parts[2], X3), "div": pv(d, X3)}}
    if L == 2:
        Fs = F3(q)
        c = curl3(Fs)
        vals_at = [at(ci, X3, q["p"]) for ci in c]
        vals = curl_parts(Fs)
        vals.update({"c1": pv(c[0], X3), "c2": pv(c[1], X3), "c3": pv(c[2], X3), "at": [fr(v) for v in vals_at]})
        return {"answer": [num(v) for v in vals_at], "vals": vals}
    if "kComp" in q:
        Fs = F3(q)
        k = sp.Symbol("k")
        kc = q["kComp"]
        kterm = poly(q["kMono"], X3)
        Fs_k = list(Fs)
        Fs_k[kc] = Fs_k[kc] + k * kterm
        d = div3(Fs_k)
        eqs = sp.Poly(d, *X3).coeffs()
        sol = sp.solve(eqs, k, dict=True)
        assert len(sol) == 1, "the constant is not unique"
        kval = sol[0][k]
        # roles: v1 is the k-component's variable; v0 is the other variable in the k-monomial
        mono_exp = q["kMono"][0][:3]
        v0 = [i for i in range(3) if mono_exp[i] > 0 and i != kc][0]
        v2 = [i for i in range(3) if i not in (v0, kc)][0]
        d0, d2 = sp.diff(Fs[v0], X3[v0]), sp.diff(Fs[v2], X3[v2])
        s = sp.Poly(sp.expand(d0 + d2), *X3).coeff_monomial(X3[v0])
        assert sp.expand(d0 + d2 - s * X3[v0]) == 0
        assert s == -kval and kval != 0
        return {"answer": int(kval), "vals": {"d0": pv(d0, X3), "d2": pv(d2, X3), "s": int(s), "k": int(kval)}}
    P_, Q_ = poly(q["P"], X2), poly(q["Q"], X2)
    Qx, Py = sp.diff(Q_, x), sp.diff(P_, y)
    cz = sp.expand(Qx - Py)
    cv = at(cz, X2, q["p"])
    w = cv / 2
    # the angular velocity of a small rotating disk equals half the circulation density: check with a tiny circle
    eps = sp.Rational(1, 1000)
    circ = circle_line_integral([P_.subs({x: x + q["p"][0], y: y + q["p"][1]}, simultaneous=True), Q_.subs({x: x + q["p"][0], y: y + q["p"][1]}, simultaneous=True)], eps)
    assert abs(float(circ / (pi * eps ** 2)) - float(cv)) < 1e-4
    return {"answer": num(w), "vals": {"Qx": pv(Qx, X2), "Py": pv(Py, X2), "cz": pv(cz, X2), "cv": fr(cv), "w": fr(w)}}


# ---- V.identities ------------------------------------------------------------------------------------------------------
def v_identities(p):
    q, L = p["params"], p["level"]
    if L < 3:
        f = poly(q["f"], X3)
        Fs = F3(q)
        pt = q["p"]
        fp0 = at(f, X3, pt)
        grad = [sp.diff(f, g) for g in X3]
        gp = [at(g, X3, pt) for g in grad]
        Fp = [at(c, X3, pt) for c in Fs]
        base = {"fp0": fr(fp0), "grad": [pv(g, X3) for g in grad], "gp": [fr(v) for v in gp], "Fp": [fr(v) for v in Fp]}
        if L == 1:
            d = div3(Fs)
            dv = at(d, X3, pt)
            dot = sum(a * b for a, b in zip(gp, Fp))
            ans = fp0 * dv + dot
            assert ans == at(div3([f * c for c in Fs]), X3, pt), "product rule disagrees with the direct divergence"
            base.update({"div": pv(d, X3), "dv": fr(dv), "dot": fr(dot), "fd": fr(fp0 * dv), "ans": fr(ans)})
            return {"answer": num(ans), "vals": base}
        c = curl3(Fs)
        cp = [at(ci, X3, pt) for ci in c]
        cr = list(sp.Matrix(gp).cross(sp.Matrix(Fp)))
        ans = [fp0 * a + b for a, b in zip(cp, cr)]
        direct = [at(ci, X3, pt) for ci in curl3([f * comp for comp in Fs])]
        assert ans == direct, "product rule disagrees with the direct curl"
        base.update(curl_parts(Fs))
        base.update({"curl": [pv(ci, X3) for ci in c], "cp": [fr(v) for v in cp], "fc": [fr(fp0 * v) for v in cp], "cr": [fr(v) for v in cr], "ans": [fr(v) for v in ans]})
        return {"answer": [num(v) for v in ans], "vals": base}
    fields = [[poly(c, X3) for c in fl] for fl in q["fields"]]
    if q["curlKind"]:
        divs = [div3(fl) for fl in fields]
        bad = [i for i, d in enumerate(divs) if d != 0]
        vals = {"divs": [pv(d, X3) for d in divs], "dparts": [[pv(sp.diff(c, g), X3) for c, g in zip(fl, X3)] for fl in fields]}
    else:
        curls = [curl3(fl) for fl in fields]
        bad = [i for i, c in enumerate(curls) if any(ci != 0 for ci in c)]
        vals = {"curls": [[pv(ci, X3) for ci in c] for c in curls],
                "cparts": [[pv(sp.diff(R_, y), X3), pv(sp.diff(Q_, z), X3), pv(sp.diff(P_, z), X3), pv(sp.diff(R_, x), X3), pv(sp.diff(Q_, x), X3), pv(sp.diff(P_, y), X3)] for P_, Q_, R_ in fields]}
    assert len(bad) == 1, "exactly one field must fail the test"
    return {"answer": bad[0], "vals": vals}


# ---- V.11 Green's theorem ------------------------------------------------------------------------------------------------
def v11(p):
    q, L = p["params"], p["level"]
    if L == 1 and q["ellipse"]:
        a, c = q["a"], q["c"]
        # Area = ½∮(x dy − y dx) along x = a cos t, y = c sin t
        area = circle_int(sp.Rational(1, 2) * ((a * CT) * (c * CT) - (c * ST) * (-a * ST)))
        assert area == a * c * pi
        return {"answer": num(area), "vals": {"ab": a * c}}
    P_, Q_ = poly(q["P"], X2), poly(q["Q"], X2)
    if L == 1:
        x0, y0, x1, y1 = q["x0"], q["y0"], q["x1"], q["y1"]
        k = sp.expand(sp.diff(Q_, x) - sp.diff(P_, y))
        assert k.is_number and k != 0
        w, h = x1 - x0, y1 - y0
        ans = k * w * h
        assert rect_loop(P_, Q_, x0, y0, x1, y1) == ans, "Green's theorem check failed"
        return {"answer": int(ans), "vals": {"x1": x1, "y1": y1, "w": w, "h": h, "k": int(k), "area": w * h, "ans": int(ans)}}
    if L == 2:
        a, c, flux = q["a"], q["c"], q["flux"]
        d1 = sp.diff(P_, x) if flux else sp.diff(Q_, x)
        d2 = sp.diff(Q_, y) if flux else sp.diff(P_, y)
        g = sp.expand(d1 + d2 if flux else d1 - d2)
        inner = sp.integrate(g, (y, 0, c))
        A2 = sp.integrate(inner, x)
        ans = sp.integrate(g, (y, 0, c), (x, 0, a))
        assert A2.subs(x, a) - A2.subs(x, 0) == ans
        assert rect_loop(P_, Q_, 0, 0, a, c, flux=bool(flux)) == ans, "Green's theorem check failed"
        return {"answer": num(ans), "vals": {"d1": pv(d1, X2), "d2": pv(d2, X2), "g": pv(g, X2), "inner": pv(inner, X2), "A2": pv(A2, X2), "ans": fr(ans)}}
    R = q["R"]
    Qx, Py = sp.diff(Q_, x), sp.diff(P_, y)
    cz = sp.expand(Qx - Py)
    polar = sp.expand(cz.subs({x: r, y: 0}))
    assert sp.expand(polar.subs(r, sp.sqrt(x ** 2 + y ** 2)) - cz) == 0, "integrand is not radial"
    an = sp.integrate(polar * r, r)
    inner = an.subs(r, R)
    coef = 2 * inner
    assert circle_line_integral([P_, Q_], R) == coef * pi, "Green's theorem check failed"
    return {"answer": num(coef * pi), "vals": {"RR2": R * R, "Qx": pv(Qx, X2), "Py": pv(Py, X2), "cz": pv(cz, X2), "polar": pv(polar, (r,)), "an": pv(an, (r,)), "inner": fr(inner), "coef": fr(coef)}}


# ---- V.param-surf ---------------------------------------------------------------------------------------------------------
@lru_cache(maxsize=None)
def paraboloid_area(h):
    return sp.nsimplify(2 * pi * sp.integrate(sp.sqrt(1 + 4 * r ** 2) * r, (r, 0, sp.sqrt(h))))


def v_param_surf(p):
    q, L = p["params"], p["level"]
    if L == 1:
        uu, vv = sp.symbols("u v")
        g = poly(q["g"], (uu, vv))
        comps = [uu, vv]
        comps.insert(q["slot"], g)
        rv = sp.Matrix(comps)
        ru, rw = rv.diff(uu), rv.diff(vv)
        sub = {uu: q["p"][0], vv: q["p"][1]}
        N = [sp.Rational(c.subs(sub)) for c in ru.cross(rw)]
        assert any(c != 0 for c in N)
        gu, gv = sp.diff(g, uu), sp.diff(g, vv)
        return {"answer": [num(c) for c in N], "vals": {"gu": pv(gu, (uu, vv)), "gv": pv(gv, (uu, vv)), "A": fr(gu.subs(sub)), "Bv": fr(gv.subs(sub)), "N": [fr(c) for c in N]}}
    if L == 2:
        g = poly(q["g"], X2)
        a, b = sp.diff(g, x), sp.diff(g, y)
        tot = 1 + a ** 2 + b ** 2
        s = sp.sqrt(tot)
        assert is_rat(s), "area factor is not rational"
        pq = q["p"] * q["q"]
        rv = sp.Matrix([x, y, g])
        N = rv.diff(x).cross(rv.diff(y))
        area = sp.integrate(sp.sqrt(N.dot(N)), (x, 0, q["p"]), (y, 0, q["q"]))
        assert area == s * pq
        return {"answer": num(area), "vals": {"a2": fr(a ** 2), "b2": fr(b ** 2), "tot": fr(tot), "s": fr(s), "pq": pq, "ans": fr(area)}}
    if q["cap"]:
        a, c = q["a"], q["c"]
        ph_, th_ = sp.symbols("ph th")
        rv = sp.Matrix([a * sp.sin(ph_) * sp.cos(th_), a * sp.sin(ph_) * sp.sin(th_), a * sp.cos(ph_)])
        Nn = rv.diff(ph_).cross(rv.diff(th_))
        # ‖N‖² = a⁴ sin² φ, so ‖N‖ = a² sin φ for 0 ≤ φ ≤ π
        assert sp.simplify(sp.expand(Nn.dot(Nn)) - a ** 4 * sp.sin(ph_) ** 2) == 0
        area = 2 * pi * sp.integrate(a * a * sp.sin(ph_), (ph_, 0, sp.acos(sp.Rational(c, a))))
        ratio = sp.Rational(c, a)
        coef = 2 * a * a * (1 - ratio)
        assert sp.simplify(area - coef * pi) == 0 and coef == 2 * a * (a - c)
        return {"answer": num(coef * pi), "vals": {"a2": a * a, "ratio": fr(ratio), "one": fr(1 - ratio), "coef": fr(coef)}}
    h = q["h"]
    Wt = 1 + 4 * h
    S = isqrt(Wt)
    assert S * S == Wt
    inner = sp.Rational(S ** 3 - 1, 12)
    coef = 2 * inner
    assert paraboloid_area(h) == coef * pi
    return {"answer": num(coef * pi), "vals": {"Wt": Wt, "S": S, "S3": S ** 3, "inner": fr(inner), "coef": fr(coef)}}


# ---- V.surf-scalar -----------------------------------------------------------------------------------------------------------
def v_surf_scalar(p):
    q, L = p["params"], p["level"]
    if L == 1:
        g, f = poly(q["g"], X2), poly(q["f"], X2)
        a, b = sp.diff(g, x), sp.diff(g, y)
        tot = 1 + a ** 2 + b ** 2
        s = sp.sqrt(tot)
        assert is_rat(s)
        inner = sp.integrate(f, (y, 0, q["q"]))
        A2 = sp.integrate(inner, x)
        I = A2.subs(x, q["p"]) - A2.subs(x, 0)
        ans = s * I
        rv = sp.Matrix([x, y, g])
        N = rv.diff(x).cross(rv.diff(y))
        direct = sp.integrate(f.subs(z, g) * sp.sqrt(N.dot(N)), (y, 0, q["q"]), (x, 0, q["p"]))
        assert direct == ans
        return {"answer": num(ans), "vals": {"a2": fr(a ** 2), "b2": fr(b ** 2), "tot": fr(tot), "s": fr(s), "inner": pv(inner, X2), "A2": pv(A2, X2), "I": fr(I), "ans": fr(ans)}}
    if L == 2:
        a, k, al, be = q["a"], q["k"], q["al"], q["be"]
        total = sphere_scalar(al + be * z ** k, a, full=False)
        coef = total / pi
        t1 = sp.Integer(al * a * a)
        t2 = sp.Rational(be * a ** (k + 2), k + 1)
        assert coef == 2 * (t1 + t2) and coef != 0
        return {"answer": num(total), "vals": {"a2": a * a, "ak": a ** k, "bak": be * a ** k, "kp1": k + 1, "t1": fr(t1), "t2": fr(t2), "inner": fr(t1 + t2), "coef": fr(coef)}}
    a, c, k = q["a"], q["c"], q["k"]
    mass = sphere_scalar(c + k * z, a, full=False)
    mom = sphere_scalar(z * (c + k * z), a, full=False)
    ans = sp.nsimplify(mom / mass)
    m1, m2 = sp.Integer(c * a * a), sp.Rational(k * a ** 3, 2)
    z1, z2 = sp.Rational(c * a ** 3, 2), sp.Rational(k * a ** 4, 3)
    assert mass == 2 * pi * (m1 + m2) and mom == 2 * pi * (z1 + z2)
    assert 0 < ans < a
    return {"answer": num(ans), "vals": {"a2": a * a, "m1": fr(m1), "m2": fr(m2), "mI": fr(m1 + m2), "z1": fr(z1), "z2": fr(z2), "zI": fr(z1 + z2), "ans": fr(ans)}}


# ---- V.surf-flux ------------------------------------------------------------------------------------------------------------
def v_surf_flux(p):
    q, L = p["params"], p["level"]
    if L == 1:
        g = poly(q["g"], X2)
        v = sp.Matrix([q["v1"], q["v2"], q["v3"]])
        rv = sp.Matrix([x, y, g])
        N = rv.diff(x).cross(rv.diff(y))
        assert N[2] == 1   # upward
        k = v.dot(N)
        ans = sp.integrate(k, (x, 0, q["p"]), (y, 0, q["q"]))
        assert k.is_number and k != 0
        return {"answer": int(ans), "vals": {"na": int(N[0]), "nb": int(N[1]), "k": int(k), "area": q["p"] * q["q"], "ans": int(ans)}}
    if L == 2:
        g = poly(q["g"], X2)
        Fs = F3(q)
        sub = [sp.expand(c.subs(z, g)) for c in Fs]
        rv = sp.Matrix([x, y, g])
        N = rv.diff(x).cross(rv.diff(y))
        assert N[2] == 1
        h = sp.expand(sp.Matrix(sub).dot(N))
        inner = sp.integrate(h, (y, 0, q["q"]))
        A2 = sp.integrate(inner, x)
        ans = sp.integrate(h, (y, 0, q["q"]), (x, 0, q["p"]))
        assert A2.subs(x, q["p"]) - A2.subs(x, 0) == ans
        return {"answer": num(ans), "vals": {"ngx": pv(N[0], X2), "ngy": pv(N[1], X2), "sub": [pv(s_, X2) for s_ in sub], "h": pv(h, X2), "inner": pv(inner, X2), "A2": pv(A2, X2), "ans": fr(ans)}}
    a = q["a"]
    if q["kind"] == 0:
        w, rho = q["w"], q["rho"]
        vol = sphere_flux([sp.Integer(0), sp.Integer(0), sp.Integer(w)], a, full=False)
        assert vol == w * a * a * pi   # all the flow through the base disk leaves through the dome
        mdot = rho * vol
        return {"answer": num(mdot), "vals": {"a2": a * a, "vol": fr(vol / pi), "coef": fr(mdot / pi)}}
    al, be = q["al"], q["be"]
    flux = sphere_flux([al * x, al * y, be * z], a, full=False)
    t1, t2 = sp.Rational(2 * al, 3), sp.Rational(be, 3)
    assert flux == 2 * pi * a ** 3 * (t1 + t2) and flux != 0
    return {"answer": num(flux), "vals": {"a2": a * a, "a3": a ** 3, "t1": fr(t1), "t2": fr(t2), "inner": fr(t1 + t2), "coef": fr(flux / pi)}}


# ---- V.12 divergence theorem -----------------------------------------------------------------------------------------------
def v12(p):
    q, L = p["params"], p["level"]
    Fs = F3(q)
    parts = [sp.diff(Fs[0], x), sp.diff(Fs[1], y), sp.diff(Fs[2], z)]
    d = div3(Fs)
    if L == 1:
        assert d.is_number and d != 0
        k = int(d)
        if q["ball"]:
            R = q["rad"]
            flux = sphere_flux(Fs, R, full=True)
            assert flux == k * sp.Rational(4, 3) * pi * R ** 3, "divergence theorem check failed"
            return {"answer": num(flux), "vals": {"parts": [pv(c, X3) for c in parts], "k": k, "RR2": R * R, "R3": R ** 3, "coef": fr(flux / pi)}}
        a, b, c = q["a"], q["b"], q["c"]
        flux = box_flux(Fs, a, b, c)
        assert flux == k * a * b * c, "divergence theorem check failed"
        return {"answer": int(flux), "vals": {"parts": [pv(c_, X3) for c_ in parts], "k": k, "vol": a * b * c, "ans": int(flux)}}
    if L == 2:
        a, b, c = q["a"], q["b"], q["c"]
        h1 = sp.integrate(d, (z, 0, c))
        h2 = sp.integrate(h1, (y, 0, b))
        H = sp.integrate(h2, x)
        ans = H.subs(x, a) - H.subs(x, 0)
        assert box_flux(Fs, a, b, c) == ans, "divergence theorem check failed"
        return {"answer": num(ans), "vals": {"parts": [pv(c_, X3) for c_ in parts], "div": pv(d, X3), "h1": pv(h1, X3), "h2": pv(h2, X3), "H": pv(H, X3), "ans": fr(ans)}}
    R1, R2 = q["R1"], q["R2"]
    rad = sp.expand(d.subs({x: r, y: 0, z: 0}))
    assert sp.expand(rad.subs(r, sp.sqrt(x ** 2 + y ** 2 + z ** 2)) - d) == 0, "divergence is not radial"
    an = sp.integrate(rad * r ** 2, r)
    inner = an.subs(r, R2) - an.subs(r, R1)
    coef = 4 * inner
    surf = sphere_flux(Fs, R2, full=True) - (sphere_flux(Fs, R1, full=True) if R1 else 0)
    assert surf == coef * pi, "divergence theorem check failed"
    return {"answer": num(coef * pi), "vals": {"parts": [pv(c_, X3) for c_ in parts], "div": pv(d, X3), "rad": pv(rad, (r,)), "an": pv(an, (r,)), "inner": fr(inner), "coef": fr(coef), "RR2": R2 * R2}}


# ---- V.13 Stokes' theorem -----------------------------------------------------------------------------------------------------
def v13(p):
    q, L = p["params"], p["level"]
    Fs = F3(q)
    c = curl3(Fs)
    R = q["rad"]
    if L == 1:
        assert all(ci.is_number for ci in c)
        coef = c[2] * R * R
        h = q["h"]
        assert circle_line_integral(Fs, R, lambda X, Y: sp.Integer(h)) == coef * pi, "Stokes check failed"
        assert coef != 0
        vals = curl_parts(Fs)
        vals.update({"curl": [fr(ci) for ci in c], "RR2": R * R, "coef": fr(coef)})
        return {"answer": num(coef * pi), "vals": vals}
    if L == 2:
        g = poly(q["g"], X2)
        al, be = sp.diff(g, x), sp.diff(g, y)
        K = -al * c[0] - be * c[1] + c[2]
        coef = K * R * R
        assert circle_line_integral(Fs, R, lambda X, Y: g.subs({x: X, y: Y}, simultaneous=True)) == coef * pi, "Stokes check failed"
        assert coef != 0
        vals = curl_parts(Fs)
        vals.update({"curl": [fr(ci) for ci in c], "na": int(-al), "nb": int(-be), "K": fr(K), "RR2": R * R, "coef": fr(coef)})
        return {"answer": num(coef * pi), "vals": vals}
    h = q["h"]
    assert R * R == h
    Qx, Py = sp.diff(Fs[1], x), sp.diff(Fs[0], y)
    cz = sp.expand(Qx - Py)
    polar = sp.expand(cz.subs({x: r, y: 0, z: 0}))
    assert sp.expand(polar.subs(r, sp.sqrt(x ** 2 + y ** 2)) - cz.subs(z, 0)) == 0
    an = sp.integrate(polar * r, r)
    inner = an.subs(r, R)
    coef = 2 * inner
    # boundary circle at z = 0
    assert circle_line_integral(Fs, R, lambda X, Y: sp.Integer(0)) == coef * pi, "Stokes check (boundary) failed"
    # the flux of the curl through the paraboloid itself, parametrized (r cos θ, r sin θ, h − r²), upward normal
    pos = {x: r * CT, y: r * ST, z: h - r ** 2}
    N = [2 * r ** 2 * CT, 2 * r ** 2 * ST, r]
    ig = sp.expand(sum(ci.subs(pos, simultaneous=True) * Ni for ci, Ni in zip(c, N)))
    tot = sp.Integer(0)
    for (a1, b1, k1), co in sp.Poly(ig, CT, ST, r).terms():
        tot += co * circle_int(CT ** a1 * ST ** b1) * sp.Rational(R ** (k1 + 1), k1 + 1)
    assert sp.nsimplify(tot) == coef * pi, "Stokes check (paraboloid) failed"
    assert coef != 0
    return {"answer": num(coef * pi), "vals": {"Qx": pv(Qx, X3), "Py": pv(Py, X3), "cz": pv(cz, X3), "polar": pv(polar, (r,)), "an": pv(an, (r,)), "inner": fr(inner), "coef": fr(coef)}}


# ---- V.14 Laplacian and PDEs ---------------------------------------------------------------------------------------------------
def v14(p):
    q, L = p["params"], p["level"]
    if L == 1:
        f = poly(q["f"], X3)
        sec = [sp.diff(f, g, 2) for g in X3]
        lap = sp.expand(sum(sec))
        assert lap != 0
        return {"answer": str(lap), "vals": {"fxx": pv(sec[0], X3), "fyy": pv(sec[1], X3), "fzz": pv(sec[2], X3), "lap": pv(lap, X3)}}
    if L == 2:
        u0, m = poly(q["u0"], X3), poly(q["m"], X3)
        uses = q["uses"]
        k = sp.Symbol("k")
        lap = lambda e: sp.expand(sum(sp.diff(e, X3[i], 2) for i in uses))
        assert all(not (u0.has(X3[i]) or m.has(X3[i])) for i in range(3) if i not in uses)
        full = sp.expand(sum(sp.diff(u0 + k * m, g, 2) for g in X3))
        sol = sp.solve(sp.Poly(full, *X3).coeffs(), k, dict=True)
        assert len(sol) == 1
        kv = sol[0][k]
        Lb, Lm = lap(u0), lap(m)
        lam = -kv
        assert sp.expand(Lb - lam * Lm) == 0
        return {"answer": num(kv), "vals": {"Lb": pv(Lb, X3), "Lm": pv(Lm, X3), "msecs": [pv(sp.diff(m, X3[i], 2), X3) for i in uses],
                                             "usecs": [pv(sp.diff(u0, X3[i], 2), X3) for i in uses], "lam": fr(lam), "k": fr(kv)}}
    if "C" in q:
        C, nb = q["C"], q["nb"]
        h = Fraction(q["h"]).limit_denominator(1000)
        s = sum(nb)
        diff = s - 4 * C
        ans = Fraction(diff) / (h * h)
        assert ans.denominator == 1
        return {"answer": float(ans), "vals": {"sum": s, "C4": 4 * C, "diff": diff, "h2": float(h * h), "ans": {"n": ans.numerator, "d": ans.denominator}}}
    A, nn, al = q["A"], q["n"], q["al"]
    t0 = sp.Rational(q["t0"]["n"], q["t0"]["d"])
    lam_s = sp.Symbol("lam")
    u = A * sp.exp(-lam_s * t) * sp.sin(nn * x)
    sol = sp.solve(sp.simplify((sp.diff(u, t) - al * sp.diff(u, x, 2)) / u), lam_s)
    assert len(sol) == 1
    lam = sol[0]
    assert u.subs({lam_s: lam, x: 0}) == 0 and sp.simplify(u.subs({lam_s: lam, x: pi})) == 0
    E = lam * t0
    assert E == int(E)
    val = sp.simplify(u.subs({lam_s: lam, x: pi / (2 * nn), t: t0}))
    assert sp.simplify(val - A * sp.exp(-E)) == 0
    return {"answer": A * exp(-int(E)), "vals": {"lam": int(lam), "E": int(E), "twoN": 2 * nn, "nn2": nn * nn, "val": A * exp(-int(E))}}


VERIFY = {
    "V.8": v8, "V.line-flux": v_line_flux, "V.ftli": v_ftli, "V.9": v9, "V.10": v10, "V.identities": v_identities, "V.11": v11,
    "V.param-surf": v_param_surf, "V.surf-scalar": v_surf_scalar, "V.surf-flux": v_surf_flux, "V.12": v12, "V.13": v13, "V.14": v14,
}
