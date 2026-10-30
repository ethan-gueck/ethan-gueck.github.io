"""Independent answers for practice/finance.js: each function recomputes, from the problem's inputs
(p["params"]) alone, the answer and every value the steps show (p["vals"]). Exact fractions for
rational arithmetic and 40-digit mpmath for powers, roots, logs, exponentials and the normal CDF;
nothing here is copied from the JavaScript. Each function also asserts the problem's promises
(a positive NPV is called "accept", a payback year really is the first, an IRR really zeroes NPV, …)."""
from fractions import Fraction as F
from math import isqrt

import mpmath as mm
import sympy as sp

mm.mp.dps = 40


def D(x):
    """A JSON number as the exact decimal it was meant to be (0.1 → 1/10)."""
    return F(str(x))


def m(x):
    """An exact value as a 40-digit mpmath number."""
    if isinstance(x, F):
        return mm.mpf(x.numerator) / x.denominator
    return mm.mpf(x)


def fl(x):
    if isinstance(x, (list, tuple)):
        return [fl(y) for y in x]
    if isinstance(x, dict):
        return x
    return float(x)


def out(answer, **vals):
    return {"answer": fl(answer), "vals": {k: fl(v) for k, v in vals.items()}}


def cents(x):
    """Round half up to the cent (the payment a lender would quote)."""
    return F(int(mm.floor(m(x) * 100 + mm.mpf(1) / 2)), 100) if m(x) >= 0 else -cents(-x)


def frac(q):
    q = F(q)
    return {"n": q.numerator, "d": q.denominator}


def Phi(z):
    return mm.ncdf(m(z))


def table(z):
    """A normal-table value N(z) to 4 decimals."""
    v = Phi(z)
    return F(int(mm.floor(v * 10000 + mm.mpf(1) / 2)), 10000)


# ---- FN.1 ------------------------------------------------------------------------------------------
def fn_1(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        rate = D(q["rp"]) / 100
        I = q["P0"] * rate * q["t"]
        A = q["P0"] + I
        return out(A if q["ask"] == "balance" else I, rate=rate, I=I, A=A)
    if lv == 2:
        r = D(q["rp"]) / 100
        i = r / q["m"]
        N = q["m"] * q["t"]
        pows = [(1 + i) ** k for k in range(1, N + 1)]
        A = q["P0"] * (1 + i) ** N
        simpleF = 1 + r * q["t"]
        As = q["P0"] * simpleF
        assert A > As, "compounding must beat simple interest"
        return out(A - As if q["ask"] == "extra" else A, i=i, N=N, pows=pows, ks=list(range(1, N + 1)), A=A, simpleF=simpleF, As=As, extra=A - As, r=r)
    if q["kind"] == "time":
        i = D(q["rp"]) / 100 / q["m"]
        mult = D(q["mult"])
        lnM, lnG = mm.log(m(mult)), mm.log(m(1 + i))
        t = lnM / (q["m"] * lnG)
        # the balance really reaches A at that t
        assert abs(q["P0"] * m(1 + i) ** (q["m"] * t) - q["P0"] * m(mult)) < 1e-20
        return out(t, A=q["P0"] * mult, i=i, g=1 + i, mult=mult, lnM=lnM, lnG=lnG, mlnG=q["m"] * lnG, t=t)
    if q["kind"] == "rate":
        ratio = F(q["A"], q["P0"])
        root = m(ratio) ** (mm.mpf(1) / q["t"])
        return out((root - 1) * 100, ratio=ratio, root=root, rdec=root - 1, rr=(root - 1) * 100)
    rate = D(q["rp"]) / 100
    rt = rate * q["t"]
    ec, ga = mm.exp(m(rt)), (1 + rate) ** q["t"]
    Ac, Aa = q["P0"] * ec, q["P0"] * ga
    assert Ac > m(Aa)
    return out(Ac - m(Aa), rate=rate, a=1 + rate, rt=rt, ec=ec, ga=ga, Ac=Ac, Aa=Aa, diff=Ac - m(Aa))


# ---- FN.2 ------------------------------------------------------------------------------------------
def ear(apr, n):
    """EAR (decimal) of an APR in percent, compounded n times a year (0 = continuously)."""
    a = m(D(apr) / 100)
    return mm.exp(a) - 1 if n == 0 else (1 + a / n) ** n - 1


def fn_2(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a = D(q["apr"]) / 100
        i = a / q["m"]
        fac = (1 + i) ** q["m"]
        assert abs(m(fac - 1) - ear(q["apr"], q["m"])) < 1e-30
        return out((fac - 1) * 100, a=a, i=i, fac=fac, ear=fac - 1, earPct=(fac - 1) * 100)
    if lv == 2:
        e1, e2 = ear(q["a1"], q["m1"]), ear(q["a2"], q["m2"])
        best = max(e1, e2)
        assert abs(e1 - e2) >= 0.0001
        return out(best * 100, e1=e1, e2=e2, p1=e1 * 100, p2=e2 * 100, a1d=D(q["a1"]) / 100, a2d=D(q["a2"]) / 100)
    a = D(q["apr"]) / 100
    i = a / q["m"]
    if q["kind"] == "cont":
        lnG = mm.log(m(1 + i))
        rc = q["m"] * lnG
        assert abs(mm.exp(rc) - (1 + m(ear(q["apr"], q["m"])))) < 1e-30
        return out(rc * 100, a=a, i=i, g=1 + i, lnG=lnG, rcd=rc, rc=rc * 100)
    fac = (1 + i) ** q["m"]
    k = q["k"]
    per = m(fac) ** (mm.mpf(1) / k) - 1
    aprK = k * per
    # the new quote really has the same EAR
    assert abs((1 + aprK / k) ** k - m(fac)) < 1e-30
    return out(aprK * 100, a=a, i=i, g=1 + i, fac=fac, earPct=(fac - 1) * 100, per=per, aprKd=aprK, aprK=aprK * 100)


# ---- FN.3 ------------------------------------------------------------------------------------------
def fn_3(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "years":
            return out(F(72, q["rp"]), t=F(72, q["rp"]))
        return out(F(72, q["t"]), rp=F(72, q["t"]))
    if lv == 2:
        rate = D(q["rp"]) / 100
        ln2 = mm.log(2)
        if q["cont"]:
            t = ln2 / m(rate)
            assert abs(mm.exp(m(rate) * t) - 2) < 1e-30
            return out(t, rate=rate, ln2=ln2, t=t, est=D(69.3) / q["rp"])
        lg = mm.log(1 + m(rate))
        t = ln2 / lg
        assert abs((1 + m(rate)) ** t - 2) < 1e-30
        return out(t, rate=rate, ln2=ln2, lg=lg, t=t, est=F(72, q["rp"]), g=1 + rate)
    if q["kind"] == "doublings":
        td = F(72, q["rp"])
        k = q["T"] / td
        assert k.denominator == 1
        mult = 2 ** int(k)
        return out(q["P0"] * mult, td=td, k=k, mult=mult, A=q["P0"] * mult)
    rate = D(q["rp"]) / 100
    ln3, lg = mm.log(3), mm.log(1 + m(rate))
    t = ln3 / lg
    return out(t, rate=rate, g=1 + rate, ln3=ln3, lg=lg, t=t, est=F(114, q["rp"]))


# ---- FN.8 ------------------------------------------------------------------------------------------
def fn_8(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "approx":
            rr = q["i"] - q["pi"]
            assert rr != 0
            return out(rr, rr=rr)
        ratio = D(q["c1"]) / D(q["c0"])
        assert ratio > 1
        return out((ratio - 1) * 100, ratio=ratio, pid=ratio - 1, pi=(ratio - 1) * 100)
    if lv == 2:
        if q["kind"] == "exact":
            g, h = 1 + D(q["i"]) / 100, 1 + D(q["pi"]) / 100
            ratio = g / h
            rr = (ratio - 1) * 100
            assert rr < D(q["i"]) - D(q["pi"]), "the shortcut overstates the real rate"
            return out(rr, g=g, h=h, ratio=ratio, rd=ratio - 1, rr=rr, approx=D(q["i"]) - D(q["pi"]))
        a, b = 1 + F(q["real"], 100), 1 + F(q["pi"], 100)
        g = a * b
        return out((g - 1) * 100, a=a, b=b, g=g, nd=g - 1, nom=(g - 1) * 100, simple=q["real"] + q["pi"])
    if q["kind"] == "deflate":
        fac = (1 + D(q["pi"]) / 100) ** q["t"]
        real = q["X"] / fac
        return out(real, fac=fac, df=1 / fac, real=real, pid=D(q["pi"]) / 100)
    a, b = 1 + F(q["i"], 100), 1 + D(q["pi"]) / 100
    gi, gp = a ** q["t"], b ** q["t"]
    nomV = q["P0"] * gi
    real = nomV / gp
    # the same as growing at the exact real rate
    assert abs(m(real) - q["P0"] * m(a / b) ** q["t"]) < 1e-25
    return out(real, gi=gi, gp=gp, nomV=nomV, real=real, a=a, b=b)


# ---- FN.4 ------------------------------------------------------------------------------------------
def fn_4(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        fac = (1 + F(q["rp"], 100)) ** q["t"]
        PV = D(q["FV"]) / fac
        assert PV.denominator == 1, "the present value should come out whole"
        return out(PV, fac=fac, PV=PV, rd=F(q["rp"], 100))
    rate = D(q["rp"]) / 100
    if lv == 2:
        if q["cont"]:
            df = mm.exp(-m(rate * q["t"]))
            return out(q["FV"] * df, rate=rate, rt=rate * q["t"], df=df, PV=q["FV"] * df)
        g = (1 + rate) ** q["t"]
        return out(q["FV"] / g, g=g, df=1 / g, PV=q["FV"] / g, a=1 + rate)
    pvs = [F(c) / (1 + rate) ** (k + 1) for k, c in enumerate(q["cfs"])]
    total = sum(pvs)
    # SymPy agrees on the discounted sum
    x = sp.Rational(1) / (1 + sp.Rational(rate.numerator, rate.denominator))
    assert sp.Rational(total.numerator, total.denominator) == sum(c * x ** (k + 1) for k, c in enumerate(q["cfs"]))
    return out(total, g=[(1 + rate) ** (k + 1) for k in range(len(q["cfs"]))], pvs=pvs, total=total, a=1 + rate, rate=rate, years=list(range(1, len(q["cfs"]) + 1)))


# ---- FN.6 ------------------------------------------------------------------------------------------
def fn_6(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        rate = D(q["rp"]) / 100
        if q["kind"] == "pv":
            PV = q["C"] / rate
            assert (PV * 100).denominator == 1
            return out(PV, rate=rate, PV=PV)
        return out(q["PV"] * rate, rate=rate, C=q["PV"] * rate)
    if lv == 2:
        if q["kind"] == "pv":
            rate = F(q["rp"], 100)
            v = 1 / (1 + rate) ** q["N"]
            af = (1 - v) / rate
            # the closed form equals the sum of discounted payments
            assert af == sum(1 / (1 + rate) ** t for t in range(1, q["N"] + 1))
            return out(q["C"] * af, rate=rate, a=1 + rate, v=v, af=af, PV=q["C"] * af)
        a = D(q["apr"]) / 100
        i, N = a / 12, 12 * q["yrs"]
        g = (1 + i) ** N
        af = (g - 1) / i
        return out(q["C"] * af, i=i, N=N, g=g, af=af, FV=q["C"] * af, a=a)
    if q["kind"] == "growing":
        g, r = D(q["gp"]) / 100, D(q["rp"]) / 100
        assert r > g
        C1 = q["C0"] * (1 + g)
        return out(C1 / (r - g), C1=C1, sp=r - g, PV=C1 / (r - g), rd=r, gd=g, gf=1 + g)
    rate = F(q["rp"], 100)
    g = (1 + rate) ** q["N"]
    af = (g - 1) / rate
    C = q["goal"] / af
    assert sum(C * (1 + rate) ** (q["N"] - t) for t in range(1, q["N"] + 1)) == q["goal"]
    return out(C, rate=rate, g=g, af=af, C=C, a=1 + rate)


# ---- FN.growing-annuity ------------------------------------------------------------------------------
def fn_growing_annuity(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        a = 1 + F(q["rp"], 100)
        return out(q["X"] * a, a=a, due=q["X"] * a)
    if lv == 2:
        if q["kind"] == "pv":
            a = D(q["apr"]) / 100
            i = a / 12
            v = (1 + i) ** -q["N"]
            af = (1 - v) / i
            afd = af * (1 + i)
            assert afd == sum((1 + i) ** -t for t in range(0, q["N"]))  # first payment today
            return out(q["C"] * afd, i=i, a=a, g=1 + i, v=v, af=af, afd=afd, PV=q["C"] * afd)
        rate = F(q["rp"], 100)
        g = (1 + rate) ** q["N"]
        af = (g - 1) / rate
        afd = af * (1 + rate)
        assert afd == sum((1 + rate) ** (q["N"] - t) for t in range(0, q["N"]))  # deposits at t = 0 … N−1, valued at N
        return out(q["C"] * afd, rate=rate, a=1 + rate, g=g, af=af, afd=afd, FV=q["C"] * afd)
    if q["kind"] == "growing":
        r, g = F(q["rp"], 100), F(q["gp"], 100)
        qq = (1 + g) / (1 + r)
        qn = qq ** q["N"]
        base = q["C1"] / (r - g)
        PV = base * (1 - qn)
        assert PV == sum(q["C1"] * (1 + g) ** (t - 1) / (1 + r) ** t for t in range(1, q["N"] + 1))
        return out(PV, rate=r, gr=g, a=1 + g, b=1 + r, q=qq, qn=qn, spread=r - g, base=base, PV=PV)
    r = F(q["rp"], 100)
    PV = q["N"] * q["C1"] / (1 + r)
    assert PV == sum(q["C1"] * (1 + r) ** (t - 1) / (1 + r) ** t for t in range(1, q["N"] + 1))
    return out(PV, a=1 + r, tot=q["N"] * q["C1"], PV=PV)


# ---- FN.5 ------------------------------------------------------------------------------------------
def fn_5(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        cum, c, T = [], -q["C0"], None
        for k, x in enumerate(q["cfs"]):
            c += x
            cum.append(c)
            if c >= 0 and T is None:
                T = k + 1
        assert T is not None and T >= 2
        return out(T, cum=cum[:T], T=T, years=[1, 2, 3, 4, 5])
    if lv == 2:
        rate = F(q["rp"], 100)
        pvs = [F(c) / (1 + rate) ** (k + 1) for k, c in enumerate(q["cfs"])]
        pvIn = sum(pvs)
        npv, pi = pvIn - q["C0"], pvIn / q["C0"]
        assert (npv > 0) == (pi > 1)
        return out(npv if q["kind"] == "npv" else pi, pvs=pvs, pvIn=pvIn, npv=npv, pi=pi, a=1 + rate, years=list(range(1, len(q["cfs"]) + 1)))
    C0, C1, C2 = F(q["C0"], 1000), F(q["C1"], 1000), F(q["C2"], 1000)
    x = sp.symbols("x")
    roots = sp.solve(C0 * x ** 2 - C1 * x - C2, x)
    pos = [rt for rt in roots if rt > 0]
    neg = [rt for rt in roots if rt < 0]
    assert len(pos) == 1 and len(neg) == 1 and pos[0].is_rational
    X = F(int(sp.numer(pos[0])), int(sp.denom(pos[0])))
    Xn = F(int(sp.numer(neg[0])), int(sp.denom(neg[0])))
    irr = (X - 1) * 100
    # NPV at the IRR is zero, in dollars
    assert -q["C0"] + q["C1"] / X + q["C2"] / X ** 2 == 0
    disc = C1 ** 2 + 4 * C0 * C2
    assert disc.denominator == 1 and isqrt(int(disc)) ** 2 == disc
    assert irr != q["hurdle"]
    return out(irr, C0k=C0, C1k=C1, C2k=C2, disc=disc, root=isqrt(int(disc)), x=frac(X), xneg=frac(Xn), xv=X, irr=irr)


# ---- FN.7 ------------------------------------------------------------------------------------------
def payment(L, i, N):
    g = (1 + i) ** N
    return L * i * g / (g - 1)


def fn_7(p):
    q, lv = p["params"], p["level"]
    a = D(q["apr"]) / 100
    i = a / 12
    if lv == 2:
        N = 12 * q["yrs"]
        Mp = payment(q["L"], i, N)
        # the payment really retires the loan: PV of the payments equals the loan
        assert sum(Mp / (1 + i) ** t for t in range(1, N + 1)) == q["L"]
        return out(Mp, i=i, N=N, g=(1 + i) ** N, Mp=Mp, a=a)
    N = 12 * q["yrs"]
    Mp = D(q["Mp"])
    assert Mp == cents(payment(q["L"], i, N)), "the quoted payment is the true payment rounded to the cent"
    if lv == 1:
        if q["kind"] == "total":
            return out(N * Mp - q["L"], N=N, paid=N * Mp, ti=N * Mp - q["L"])
        I1 = i * q["L"]
        pr = Mp - I1
        B1 = q["L"] - pr
        return out(pr if q["kind"] == "principal" else B1, i=i, I1=I1, pr=pr, B1=B1, a=a)
    k = 12 * q["kyrs"]
    gk = (1 + i) ** k
    grown, sf = q["L"] * gk, (gk - 1) / i
    paid = Mp * sf
    Bk = grown - paid
    # row by row (unrounded) amortization gives the same balance
    B = F(q["L"])
    for _ in range(k):
        B = B + i * B - Mp
    assert B == Bk
    Inext = i * Bk
    return out(Bk if q["kind"] == "balance" else Inext, i=i, k=k, gk=gk, grown=grown, sf=sf, paid=paid, Bk=Bk, Inext=Inext, a=a, k1=k + 1)


# ---- FN.9 ------------------------------------------------------------------------------------------
def fn_9(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        dP = q["P1"] - q["P0"]
        gain = dP + D(q["Dv"])
        Rd = gain / q["P0"]
        return out(Rd * 100, dP=dP, gain=gain, Rd=Rd, R=Rd * 100)
    if lv == 2:
        gs = [1 + F(x, 100) for x in q["Rs"]]
        prod = F(1)
        for g in gs:
            prod *= g
        return out((prod - 1) * 100, gs=gs, prod=prod, pd=prod - 1, tot=(prod - 1) * 100, naive=sum(q["Rs"]), years=list(range(1, len(gs) + 1)))
    if q["kind"] == "cagr":
        ratio = F(q["V1"], q["V0"])
        root = m(ratio) ** (mm.mpf(1) / q["T"])
        assert abs(q["V0"] * root ** q["T"] - q["V1"]) < 1e-25
        return out((root - 1) * 100, ratio=ratio, root=root, cd=root - 1, cagr=(root - 1) * 100)
    gs = [1 + F(x, 100) for x in q["Rs"]]
    prod = gs[0] * gs[1] * gs[2]
    root = mm.cbrt(m(prod))
    ar = F(sum(q["Rs"]), 3)
    assert (root - 1) * 100 < m(ar), "geometric mean never exceeds the arithmetic mean"
    return out((root - 1) * 100, gs=gs, prod=prod, root=root, gd=root - 1, geo=(root - 1) * 100, ar=ar)


# ---- FN.10 -----------------------------------------------------------------------------------------
def fn_10(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "sqrt":
            rt = isqrt(q["T"])
            assert rt * rt == q["T"]
            return out(D(q["sd"]) * rt, rt=rt, sT=D(q["sd"]) * rt)
        return out(D(q["mu"]) * q["k"], ann=D(q["mu"]) * q["k"])
    if lv == 2:
        rk = mm.sqrt(q["k"])
        return out(m(D(q["sd"])) * rk, rk=rk, ann=m(D(q["sd"])) * rk)
    if "xs" in q:
        xs = q["xs"]
        s = sum(xs)
        mean = F(s, 5)
        dev = [x - mean for x in xs]
        sq = [d * d for d in dev]
        ss = sum(sq)
        vr = ss / 4
        assert vr == F(str(sp.Rational(sum((x - sp.Rational(s, 5)) ** 2 for x in xs), 4)))
        return out(mm.sqrt(m(vr)), s=s, mean=mean, dev=dev, sq=sq, ss=ss, vr=vr, sd=mm.sqrt(m(vr)))
    lam = F("0.94")
    s02, r02 = D(q["s0"]) ** 2, D(q["r0"]) ** 2
    a, b = lam * s02, (1 - lam) * r02
    v = a + b
    return out(mm.sqrt(m(v)), lam=lam, l1=1 - lam, s02=s02, r02=r02, a=a, b=b, v=v, s1=mm.sqrt(m(v)))


# ---- FN.11 -----------------------------------------------------------------------------------------
def fn_11(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "two":
            w1 = F(q["w"], 100)
            t1, t2 = w1 * q["R1"], (1 - w1) * q["R2"]
            return out(t1 + t2, w1=w1, w2=1 - w1, w2p=100 - q["w"], t1=t1, t2=t2, E=t1 + t2)
        tot = sum(q["amts"])
        ws = [F(a, tot) for a in q["amts"]]
        terms = [w * R for w, R in zip(ws, q["Rs"])]
        return out(sum(terms), tot=tot, ws=ws, terms=terms, E=sum(terms))
    if lv == 2:
        w, s1, s2, rho = D(q["w"]), q["s1"], q["s2"], D(q["rho"])
        w2 = 1 - w
        t1, t2, t3 = w * w * s1 * s1, w2 * w2 * s2 * s2, 2 * w * w2 * rho * s1 * s2
        v = t1 + t2 + t3
        # the quadratic form w'Σw agrees
        Wv = sp.Matrix([sp.nsimplify(str(w)), sp.nsimplify(str(w2))])
        S = sp.Matrix([[s1 * s1, sp.nsimplify(str(rho)) * s1 * s2], [sp.nsimplify(str(rho)) * s1 * s2, s2 * s2]])
        assert (Wv.T * S * Wv)[0] == sp.Rational(v.numerator, v.denominator)
        return out(mm.sqrt(m(v)), w2=w2, wp=w * 100, w2p=w2 * 100, t1=t1, t2=t2, t3=t3, v=v, sp=mm.sqrt(m(v)), avg=w * s1 + w2 * s2)
    if q["kind"] == "hedge":
        s1, s2 = q["s1"], q["s2"]
        w1, w2 = F(s2, s1 + s2), F(s1, s1 + s2)
        assert w1 * s1 - w2 * s2 == 0, "zero risk with rho = -1"
        E = w1 * q["E1"] + w2 * q["E2"]
        return out(E, w1=frac(w1), w2=frac(w2), E=frac(E), sum=s1 + s2)
    N, cov = q["N"], q["cov"]
    vbar = q["sd"] ** 2
    a, b = F(vbar, N), (1 - F(1, N)) * cov
    # direct double sum over an equal-weighted N-asset covariance matrix
    assert F(N * vbar + N * (N - 1) * cov, N * N) == a + b
    return out(mm.sqrt(m(a + b)), vbar=vbar, a=a, b=b, v=a + b, sp=mm.sqrt(m(a + b)), lim=mm.sqrt(cov), rho=F(cov, vbar))


# ---- FN.efficient-frontier ---------------------------------------------------------------------------
def fn_efficient_frontier(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        s1, s2, rho = q["s1"], q["s2"], D(q["rho"])
        c = rho * s1 * s2
        num, den = s2 * s2 - c, s1 * s1 + s2 * s2 - 2 * c
        w = num / den
        # calculus: d/dw of the two-asset variance vanishes at w
        x = sp.symbols("x")
        r_ = sp.Rational(rho.numerator, rho.denominator)
        var = x ** 2 * s1 ** 2 + (1 - x) ** 2 * s2 ** 2 + 2 * x * (1 - x) * r_ * s1 * s2
        sol = sp.solve(sp.diff(var, x), x)
        assert len(sol) == 1 and sol[0] == sp.Rational(w.numerator, w.denominator)
        assert 0 < w < 1
        return out(w * 100, a=s1 * s1, b=s2 * s2, c=c, num=num, den=den, w=w, wp=w * 100, rest=100 - w * 100)
    Rf, ET, sT = q["Rf"], q["ET"], q["sT"]
    prem = ET - Rf
    if q["kind"] == "return":
        E = Rf + F(prem, sT) * q["sp"]
        return out(E, prem=prem, E=E, y=F(q["sp"], sT) * 100)
    spv = F((q["Ep"] - Rf) * sT, prem)
    return out(spv, prem=prem, sp=spv, num=(q["Ep"] - Rf) * sT)


# ---- FN.13 -----------------------------------------------------------------------------------------
def fn_13(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        prem = q["Rm"] - D(q["Rf"])
        E = D(q["Rf"]) + D(q["b"]) * prem
        return out(E, prem=prem, bp=D(q["b"]) * prem, E=E)
    if lv == 2:
        prem = q["Rm"] - q["Rf"]
        if q["kind"] == "portfolio":
            tot = sum(q["amts"])
            ws = [F(a, tot) for a in q["amts"]]
            terms = [w * D(b) for w, b in zip(ws, q["bs"])]
            bp = sum(terms)
            return out(q["Rf"] + bp * prem, tot=tot, ws=ws, terms=terms, bp=bp, prem=prem, E=q["Rf"] + bp * prem)
        b = D(q["rho"]) * q["si"] / q["sm"]
        return out(q["Rf"] + b * prem, b=b, prem=prem, E=q["Rf"] + b * prem)
    if q["kind"] == "alpha":
        prem = q["Rm"] - q["Rf"]
        req = q["Rf"] + D(q["b"]) * prem
        return out(q["Ri"] - req, prem=prem, req=req, alpha=q["Ri"] - req)
    b, sm, si = D(q["b"]), q["sm"], q["si"]
    sys_, tot = b * b * sm * sm, si * si
    idio = tot - sys_
    assert idio > 0
    return out(mm.sqrt(m(idio)), b2=b * b, sm2=sm * sm, sys=sys_, tot=tot, idio=idio, se=mm.sqrt(m(idio)), share=sys_ / tot * 100)


# ---- FN.beta-estimation ------------------------------------------------------------------------------
def fn_beta_estimation(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "ols":
            b = D(q["sxy"]) / D(q["sx2"])
            return out(b, b=b)
        b = D(q["b"])
        return out(F("0.67") * b + F("0.33"), p=F("0.67") * b, adj=F("0.67") * b + F("0.33"))
    if lv == 2:
        t = F(q["T"], 100)
        f = 1 + (1 - t) * D(q["de"])
        if q["kind"] == "unlever":
            return out(D(q["bL"]) / f, t=t, t1=1 - t, f=f, bU=D(q["bL"]) / f)
        return out(D(q["bU"]) * f, t1=1 - t, f=f, bL=D(q["bU"]) * f)
    if q["kind"] == "ols":
        xs, ys = q["xs"], q["ys"]
        sx, sy = sum(xs), sum(ys)
        mx, my = F(sx, 5), F(sy, 5)
        dx, dy = [x - mx for x in xs], [y - my for y in ys]
        sxy, sxx = sum(a * b for a, b in zip(dx, dy)), sum(a * a for a in dx)
        b = sxy / sxx
        # least squares via SymPy: minimize the sum of squared residuals over (a, b)
        A, B = sp.symbols("A B")
        sse = sum((y - A - B * x) ** 2 for x, y in zip(xs, ys))
        sol = sp.solve([sp.diff(sse, A), sp.diff(sse, B)], [A, B])
        assert sol[B] == sp.Rational(b.numerator, b.denominator)
        return out(b, sx=sx, sy=sy, mx=mx, my=my, dx=dx, dy=dy, sxy=sxy, sxx=sxx, b=frac(b), months=[3, 4, 5])
    t1 = 1 - F(q["T"], 100)
    fC, fT = 1 + t1 * D(q["deC"]), 1 + t1 * D(q["deT"])
    bU = D(q["bC"]) / fC
    return out(bU * fT, t1=t1, fC=fC, bU=bU, fT=fT, bL=bU * fT)


# ---- FN.12 -----------------------------------------------------------------------------------------
def fn_12(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        return out(F(q["E"] - q["Rf"], q["s"]), ex=q["E"] - q["Rf"], S=F(q["E"] - q["Rf"], q["s"]))
    if lv == 2:
        if q["kind"] == "compare":
            SA, SB = F(q["EA"] - q["Rf"], q["sA"]), F(q["EB"] - q["Rf"], q["sB"])
            assert SA != SB and (q["EA"] > q["EB"]) != (SA > SB), "the higher-return fund must not also have the higher Sharpe ratio"
            return out(0 if SA > SB else 1, xA=q["EA"] - q["Rf"], xB=q["EB"] - q["Rf"], SA=SA, SB=SB)
        if q["kind"] == "treynor":
            Tr = (q["E"] - q["Rf"]) / D(q["b"])
            return out(Tr, ex=q["E"] - q["Rf"], Tr=Tr)
        act = D(q["Rp"]) - q["Rb"]
        return out(act / D(q["te"]), act=act, IR=act / D(q["te"]))
    xs = q["xs"]
    mean = F(sum(xs), 6)
    sq = [x * x for x in xs if x < 0]
    ssq = sum(sq)
    dd = mm.sqrt(m(F(ssq, 6)))
    assert ssq == sum(min(x, 0) ** 2 for x in xs)
    so = (m(mean) - m(D(q["Rf"]))) / dd
    return out(so, tot=sum(xs), mean=mean, sq=sq, ssq=ssq, dd=dd, so=so)


# ---- FN.wacc ---------------------------------------------------------------------------------------
def fn_wacc(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        we = D(q["we"])
        E = q["V"] * we
        Dd = q["V"] - E
        t = F(q["T"], 100)
        rDa = D(q["rD"]) * (1 - t)
        a, b = E / q["V"] * q["rE"], Dd / q["V"] * rDa
        return out(a + b, E=E, D=Dd, we=we, wd=1 - we, t=t, rDa=rDa, a=a, b=b, W=a + b)
    if lv == 2:
        E = q["sh"] * q["px"]
        V = E + q["D"]
        wE, wD = F(E, V), F(q["D"], V)
        rE = D(q["Rf"]) + D(q["b"]) * D(q["mrp"])
        t1 = 1 - F(q["T"], 100)
        rDa = D(q["rD"]) * t1
        W = wE * rE + wD * rDa
        return out(W, E=E, V=V, wE=wE, wD=wD, rE=rE, t1=t1, rDa=rDa, W=W)
    de = D(q["de"])
    wE = 1 / (1 + de)
    wD = 1 - wE
    assert wD / wE == de
    t1 = 1 - F(q["T"], 100)
    rDa = D(q["rD"]) * t1
    if q["kind"] == "target":
        rE = q["Rf"] + D(q["b"]) * q["mrp"]
        W = wE * rE + wD * rDa
        return out(W, wE=frac(wE), wD=frac(wD), rE=rE, t1=t1, rDa=rDa, W=W)
    rE = (D(q["W"]) - wD * rDa) / wE
    assert wE * rE + wD * rDa == D(q["W"])
    return out(rE, wE=frac(wE), wD=frac(wD), t1=t1, rDa=rDa, debtPart=wD * rDa, rE=rE)


# ---- FN.16 -----------------------------------------------------------------------------------------
def fn_16(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "pe":
            return out(D(q["eps"]) * q["pe"], px=D(q["eps"]) * q["pe"])
        sd = F(q["rq"] - q["g"], 100) if isinstance(q["rq"], int) else (D(q["rq"]) - D(q["g"])) / 100
        Pz = D(q["D1"]) / sd
        return out(Pz, rd=D(q["rq"]) / 100, gd=D(q["g"]) / 100, sd=sd, Pz=Pz)
    if lv == 2:
        g = F(q["g"], 100)
        if q["kind"] == "d0":
            D1 = D(q["D0"]) * (1 + g)
            sd = F(q["rq"], 100) - g
            return out(D1 / sd, gf=1 + g, D1=D1, rd=F(q["rq"], 100), gd=g, sd=sd, Pz=D1 / sd)
        dy = D(q["D1"]) / q["P0"] * 100
        # the Gordon price at that rate reproduces the market price
        assert D(q["D1"]) / ((dy + q["g"]) / 100 - g) == q["P0"]
        return out(dy + q["g"], dy=dy, rq=dy + q["g"])
    pay = D(q["pay"])
    b = 1 - pay
    g = q["roe"] * b
    assert q["rq"] > g
    D1 = D(q["eps"]) * pay
    sd = (q["rq"] - g) / 100
    Pz = D1 / sd
    return out(Pz, b=b, g=g, gd=g / 100, rd=F(q["rq"], 100), sd=sd, D1=D1, Pz=Pz, pe=cents(Pz) / D(q["eps"]), payPct=pay * 100)


# ---- FN.dcf ----------------------------------------------------------------------------------------
def fn_dcf(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        t = F(q["T"], 100)
        nopat = q["ebit"] * (1 - t)
        return out(nopat + q["da"] - q["capex"] - q["dnwc"], t=t, t1=1 - t, nopat=nopat, fcf=nopat + q["da"] - q["capex"] - q["dnwc"])
    if lv == 2:
        a = 1 + F(q["W"], 100)
        disc = a ** q["Tn"]
        if q["kind"] == "gordon":
            g = D(q["g"]) / 100
            nxt = q["f"] * (1 + g)
            TV = nxt / (F(q["W"], 100) - g)
            return out(TV / disc, next=nxt, TV=TV, disc=disc, pv=TV / disc, a=a, gf=1 + g, t6=q["Tn"] + 1, wd=F(q["W"], 100), gd=g)
        TV = q["e"] * q["mult"]
        return out(TV / disc, TV=TV, disc=disc, pv=TV / disc, a=a)
    W, g = F(q["W"], 100), D(q["g"]) / 100
    a = 1 + W
    ds = [a, a ** 2, a ** 3]
    pvs = [F(f) / d for f, d in zip(q["fs"], ds)]
    TV = q["fs"][2] * (1 + g) / (W - g)
    pvTV = TV / ds[2]
    EV = sum(pvs) + pvTV
    eq = EV - q["debt"] + q["cash0"]
    return out(eq / q["sh"], a=a, ds=ds, pvs=pvs, pvF=sum(pvs), gf=1 + g, wd=W, gd=g, TV=TV, pvTV=pvTV, EV=EV, eq=eq, ps=eq / q["sh"])


# ---- FN.20 -----------------------------------------------------------------------------------------
def fn_20(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "roe":
            return out(F(q["NI"], q["Eq"]) * 100, roe=F(q["NI"], q["Eq"]) * 100)
        return out(F(q["a"], q["b"]), x=F(q["a"], q["b"]))
    if lv == 2:
        md, turn, lev = F(q["m"], 100), D(q["turn"]), D(q["lev"])
        A = q["Eq"] * lev
        S = A * turn
        NI = S * md
        roe = NI / q["Eq"]
        assert roe == md * turn * lev
        return out(roe * 100, NI=NI, S=S, A=A, md=md, roed=roe, roe=roe * 100)
    md, turn, td = F(q["m"], 100), D(q["turn"]), F(q["target"], 100)
    rt = md * turn
    lev = td / rt
    assert lev > 1
    return out(lev - 1, md=md, rt=rt, td=td, lev=lev, de=lev - 1)


# ---- FN.ratios -------------------------------------------------------------------------------------
def fn_ratios(p):
    q, lv = p["params"], p["level"]
    k = q["kind"]
    if lv == 1:
        if k == "gross":
            gp = q["rev"] - q["cogs"]
            return out(F(gp, q["rev"]) * 100, gp=gp, x=F(gp, q["rev"]) * 100)
        if k == "roa":
            return out(F(q["NI"], q["TA"]) * 100, x=F(q["NI"], q["TA"]) * 100)
        if k == "quick":
            return out(F(q["CA"] - q["inv"], q["CL"]), qa=q["CA"] - q["inv"], x=F(q["CA"] - q["inv"], q["CL"]))
        if k == "cover":
            return out(F(q["ebit"], q["intr"]), x=F(q["ebit"], q["intr"]))
        if k == "yield":
            return out(D(q["dv"]) / q["px"] * 100, x=D(q["dv"]) / q["px"] * 100)
        return out(F(q["cap"], q["be"]), x=F(q["cap"], q["be"]))
    if lv == 2:
        if k == "turnover":
            avg = F(q["i0"] + q["i1"], 2)
            x = q["cogs"] / avg
            return out(x, avg=avg, x=x, days=365 / x)
        if k == "dso":
            return out(F(q["ar"], q["rev"]) * 365, x=F(q["ar"], q["rev"]) * 365)
        cap = q["sh"] * q["px"]
        ev = cap + q["debt"] - q["cs"]
        ebitda = q["ebit"] + q["da"]
        return out(F(ev, ebitda), cap=cap, ev=ev, ebitda=ebitda, x=F(ev, ebitda))
    ebit = q["rev"] - q["cogs"] - q["opex"]
    ebt = ebit - q["intr"]
    t1 = 1 - F(q["T"], 100)
    ni = ebt * t1
    nm, cov = ni / q["rev"] * 100, F(ebit, q["intr"])
    return out(nm if k == "margin" else cov, ebit=ebit, ebt=ebt, t1=t1, ni=ni, nm=nm, cov=cov)


# ---- FN.14 -----------------------------------------------------------------------------------------
def bond(C, y, N, Fv):
    return sum(F(C) / (1 + y) ** t for t in range(1, N + 1)) + F(Fv) / (1 + y) ** N


def fn_14(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "class":
            Pz = bond(q["c"] * 10, F(q["y"], 100), q["yrs"], 1000)
            idx = 0 if Pz > 1000 else 1 if Pz < 1000 else 2
            return out(idx)
        a = 1 + F(q["y"], 100)
        return out(1000 / a ** q["N"], g=a ** q["N"], Pz=1000 / a ** q["N"], a=a)
    if lv == 2:
        yd = F(q["y"], 100)
        C = F(q["c"] * q["F"], 100)
        v = 1 / (1 + yd) ** q["N"]
        af = (1 - v) / yd
        Pz = C * af + q["F"] * v
        assert Pz == bond(C, yd, q["N"], q["F"])
        return out(Pz, C=C, cd=F(q["c"], 100), v=v, af=af, pvC=C * af, pvF=q["F"] * v, Pz=Pz, a=1 + yd, yd=yd, cf=C + q["F"], years=list(range(1, q["N"] + 1)))
    if q["kind"] == "semi":
        i = F(q["y"], 200)
        C = F(q["c"] * q["F"], 200)
        N = 2 * q["yrs"]
        v = 1 / (1 + i) ** N
        af = (1 - v) / i
        Pz = C * af + q["F"] * v
        assert Pz == bond(C, i, N, q["F"])
        return out(Pz, C=C, cd=F(q["c"], 100), yd=F(q["y"], 100), i=i, N=N, v=v, af=af, pvC=C * af, pvF=q["F"] * v, Pz=Pz, a=1 + i)
    C = F(q["c"] * q["F"], 100)
    y1 = F(q["y1"], 100)
    y2 = y1 + D(q["dy"]) / 100
    P1, P2 = bond(C, y1, q["N"], q["F"]), bond(C, y2, q["N"], q["F"])
    assert (P2 - P1 < 0) == (y2 > y1), "price and yield move in opposite directions"
    return out(P2 - P1, C=C, y2=y2 * 100, v1=1 / (1 + y1) ** q["N"], v2=1 / (1 + y2) ** q["N"], P1=P1, P2=P2, d=P2 - P1, a1=1 + y1, a2=1 + y2, r1=y1, r2=y2)


# ---- FN.bond-yields ----------------------------------------------------------------------------------
def fn_bond_yields(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        C = q["c"] * 10
        return out(F(C, q["Pz"]) * 100, C=C, cd=F(q["c"], 100), cy=F(C, q["Pz"]) * 100)
    if lv == 2:
        if q["kind"] == "approx":
            C = q["c"] * 10
            pull = F(1000 - q["Pz"], q["N"])
            avg = F(1000 + q["Pz"], 2)
            return out((C + pull) / avg * 100, C=C, pull=pull, top=C + pull, avg=avg, y=(C + pull) / avg * 100)
        ys = D(q["bey"]) / 200
        g = (1 + ys) ** 2
        return out((g - 1) * 100, bd=D(q["bey"]) / 100, ys=ys, g=g, eay=(g - 1) * 100)
    if q["kind"] == "spots":
        a1, a2 = 1 + D(q["s1"]) / 100, 1 + D(q["s2"]) / 100
        g2 = a2 ** 2
        return out((g2 / a1 - 1) * 100, a1=a1, a2=a2, g2=g2, ratio=g2 / a1, f=(g2 / a1 - 1) * 100)
    s1 = (F(1000, q["P1"]) - 1) * 100
    s2 = (mm.sqrt(m(F(1000, q["P2"]))) - 1) * 100
    f = (F(q["P1"], q["P2"]) - 1) * 100
    assert abs((1 + s2 / 100) ** 2 - (1 + m(s1) / 100) * (1 + m(f) / 100)) < 1e-30
    return out(f, s1=s1, s2=s2, ratio=F(q["P1"], q["P2"]), f=f)


# ---- FN.15 -----------------------------------------------------------------------------------------
def fn_15(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        if q["kind"] == "first":
            dy = F(q["bp"], 10000)
            ch = -D(q["Dm"]) * dy * 100
            return out(ch, dy=dy, ch=ch, chd=ch / 100)
        return out(D(q["Dm"]) * q["V"] * F(1, 10000), dv=D(q["Dm"]) * q["V"] * F(1, 10000))
    if lv == 2:
        dy = D(q["d"]) / 100
        a, b = -D(q["Dm"]) * dy, F(1, 2) * q["Cx"] * dy * dy
        ch = a + b
        return out(q["P0"] * (1 + ch), dy=dy, a=a, b=b, ch=ch, g=1 + ch, P1=q["P0"] * (1 + ch))
    yd = F(q["y"], 100)
    cfs = [q["c"], q["c"], q["c"] + q["F"]]
    pvs = [F(c) / (1 + yd) ** (k + 1) for k, c in enumerate(cfs)]
    Pz = sum(pvs)
    tw = [(k + 1) * x for k, x in enumerate(pvs)]
    Dmac = sum(tw) / Pz
    Dmod = Dmac / (1 + yd)
    # modified duration is -(1/P) dP/dy
    y = sp.symbols("y")
    price = sum(c / (1 + y) ** (k + 1) for k, c in enumerate(cfs))
    yr = sp.Rational(q["y"], 100)
    assert sp.simplify(-sp.diff(price, y).subs(y, yr) / price.subs(y, yr) - sp.Rational(Dmod.numerator, Dmod.denominator)) == 0
    return out(Dmod, cfs=cfs, pvs=pvs, Pz=Pz, tw=tw, stw=sum(tw), Dmac=Dmac, Dmod=Dmod, a=1 + yd)


# ---- FN.17 -----------------------------------------------------------------------------------------
def fn_17(p):
    q, lv = p["params"], p["level"]
    if lv == 3:
        rT = F(q["rr"], 100) * D(q["T"])
        df = mm.exp(-m(rT))
        pvK = q["K"] * df
        ans = m(D(q["known"])) - q["S0"] + pvK if q["findPut"] else m(D(q["known"])) + q["S0"] - pvK
        assert ans > 0
        return out(ans, rT=rT, df=df, pvK=pvK, ans=ans)
    kind = q.get("kind", "long")
    if kind == "straddle":
        cost = D(q["c"]) + D(q["p"])
        pay = abs(q["ST"] - q["K"])
        return out(pay - cost, cost=cost, pay=pay, prof=pay - cost)
    if kind == "breakeven":
        be = q["K"] + D(q["prem"]) if q["call"] else q["K"] - D(q["prem"])
        payoff = max(be - q["K"], 0) if q["call"] else max(q["K"] - be, 0)
        assert payoff == D(q["prem"])
        return out(be, be=be)
    diff = q["ST"] - q["K"] if q["call"] else q["K"] - q["ST"]
    pay = max(diff, 0)
    prof = pay - D(q["prem"]) if kind == "long" else D(q["prem"]) - pay
    return out(prof, pay=pay, prof=prof, diff=diff)


# ---- FN.binomial -------------------------------------------------------------------------------------
def fn_binomial(p):
    q, lv = p["params"], p["level"]

    def payoff(S):
        return max(S - q["K"], 0) if q["call"] else max(q["K"] - S, 0)

    if q.get("kind") == "rate":
        u, d = D(q["u"]), D(q["d"])
        Su, Sd = q["S0"] * u, q["S0"] * d
        Vu, Vd = payoff(Su), payoff(Sd)
        rT = F(q["rr"], 100) * D(q["T"])
        g = mm.exp(m(rT))
        pr = (g - m(d)) / (m(u) - m(d))
        assert 0 < pr < 1
        ev = pr * m(Vu) + (1 - pr) * m(Vd)
        # replication gives the same price: delta shares plus a bond
        delta = F(Vu - Vd) / (Su - Sd)
        assert abs((m(Vd) - m(delta) * m(Sd)) / g + m(delta) * q["S0"] - ev / g) < 1e-30
        return out(ev / g, Su=Su, Sd=Sd, Vu=Vu, Vd=Vd, u=u, d=d, rT=rT, g=g, p=pr, q=1 - pr, ev=ev, V0=ev / g, rd=F(q["rr"], 100))
    u, d = F(q["u"]["n"], q["u"]["d"]), F(q["d"]["n"], q["d"]["d"])
    pr = (1 - d) / (u - d)
    if lv == 3:
        Suu, Sud, Sdd = q["S0"] * u * u, q["S0"] * u * d, q["S0"] * d * d
        Vuu, Vud, Vdd = payoff(Suu), payoff(Sud), payoff(Sdd)
        Vu, Vd = pr * Vuu + (1 - pr) * Vud, pr * Vud + (1 - pr) * Vdd
        V0 = pr * Vu + (1 - pr) * Vd
        # the binomial-expectation formula agrees
        assert V0 == pr ** 2 * Vuu + 2 * pr * (1 - pr) * Vud + (1 - pr) ** 2 * Vdd
        return out(V0, Suu=frac(Suu), Sud=frac(Sud), Sdd=frac(Sdd), Vuu=frac(Vuu), Vud=frac(Vud), Vdd=frac(Vdd), p=frac(pr), q=frac(1 - pr), Vu=frac(Vu), Vd=frac(Vd), V0=frac(V0), u=u, d=d)
    Su, Sd = q["S0"] * u, q["S0"] * d
    Vu, Vd = payoff(Su), payoff(Sd)
    V0 = pr * Vu + (1 - pr) * Vd
    hedge = (Vu - Vd) / (Su - Sd)
    B = V0 - hedge * q["S0"]
    assert hedge * Su + B == Vu and hedge * Sd + B == Vd, "the replicating portfolio matches both payoffs"
    if q["kind"] == "hedge":
        return out(hedge, Su=frac(Su), Sd=frac(Sd), Vu=frac(Vu), Vd=frac(Vd), hedge=frac(hedge), B=frac(B), V0=frac(V0), dS=Su - Sd, dV=Vu - Vd)
    return out(V0, Su=frac(Su), Sd=frac(Sd), Vu=frac(Vu), Vd=frac(Vd), p=frac(pr), q=frac(1 - pr), V0=frac(V0), u=u, d=d)


# ---- FN.22 -----------------------------------------------------------------------------------------
def fn_22(p):
    q, lv = p["params"], p["level"]
    mu, s = F(q["mu"], 100), F(q["sg"], 100)
    if lv == 1:
        T = D(q["T"])
        drift = mu - s * s / 2
        rt = mm.sqrt(m(T))
        return {"answer": [float(drift * T), float(s * rt)], "vals": {k: fl(v) for k, v in dict(m=mu, s=s, s2=s * s, drift=drift, mean=drift * T, rt=rt, sd=s * rt).items()}}
    if lv == 2:
        a, b = mu * q["T"], (mu - s * s / 2) * q["T"]
        ea, eb = mm.exp(m(a)), mm.exp(m(b))
        mean, med = q["S0"] * ea, q["S0"] * eb
        assert mean > med
        return out(mean if q["ask"] == "mean" else med, m=mu, s=s, s2=s * s, a=a, b=b, ea=ea, eb=eb, mean=mean, med=med)
    if q["kind"] == "step":
        dt = D(q["dt"])
        sq = mm.sqrt(m(dt))
        dr = (mu - s * s / 2) * dt
        sh = m(s) * sq * m(D(q["Z"]))
        ex = m(dr) + sh
        g = mm.exp(ex)
        return out(q["S0"] * g, m=mu, s=s, s2=s * s, sq=sq, dr=dr, sh=abs(sh), ex=ex, g=g, S1=q["S0"] * g)
    T = D(q["T"])
    mean, sd = (mu - s * s / 2) * T, m(s) * mm.sqrt(m(T))
    z = -m(mean) / sd
    zr = F(int(mm.nint(z * 100)), 100)
    return out(table(zr), m=mu, s=s, mean=mean, sd=sd, z=z, zr=zr, pr=table(zr))


# ---- FN.18 -----------------------------------------------------------------------------------------
def bs_call(S, K, r, s, T):
    S, K, r, s, T = (m(x) for x in (S, K, r, s, T))
    d1 = (mm.log(S / K) + (r + s * s / 2) * T) / (s * mm.sqrt(T))
    return S * mm.ncdf(d1) - K * mm.exp(-r * T) * mm.ncdf(d1 - s * mm.sqrt(T))


def fn_18(p):
    q, lv = p["params"], p["level"]
    s, rr, T = D(q["s"]), D(q["rr"]), D(q["T"])
    sq = F(isqrt(int(T * 16)), 4)
    assert sq * sq == T
    h = s * s / 2
    if lv <= 2:
        num, den = (rr + h) * T, s * sq
        d1 = num / den
        d2 = d1 - den
        assert (d1 * 100).denominator == 1 and (d2 * 100).denominator == 1
        if lv == 1:
            return {"answer": [float(d1), float(d2)], "vals": {k: fl(v) for k, v in dict(h=h, sq=sq, num=num, den=den, d1=d1, d2=d2).items()}}
        N1, N2 = table(d1), table(d2)
        pk = q["S0"] * mm.exp(-m(rr * T))
        a, b = q["S0"] * N1, pk * m(N2)
        C = m(a) - b
        assert abs(C - bs_call(q["S0"], q["S0"], rr, s, T)) < 0.005 * q["S0"], "the table-based price is close to the exact price"
        return out(C, h=h, sq=sq, num=num, den=den, d1=d1, d2=d2, N1=N1, N2=N2, rT=rr * T, pk=pk, a=a, b=b, C=C)
    S0, K = q["S0"], q["K"]
    lnSK = mm.log(m(F(S0, K)))
    d1 = (lnSK + m((rr + h) * T)) / m(s * sq)
    d1r = F(int(mm.nint(d1 * 100)), 100)
    d2r = d1r - s * sq
    Nm1, Nm2 = table(-d1r), table(-d2r)
    pk = K * mm.exp(-m(rr * T))
    a, b = pk * m(Nm2), S0 * Nm1
    Pp = a - m(b)
    exact = bs_call(S0, K, rr, s, T) - S0 + pk  # put by parity
    assert abs(Pp - exact) < 0.01 * S0
    return out(Pp, h=h, sq=sq, lnSK=lnSK, d1=d1, d1r=d1r, d2r=d2r, Nm1=Nm1, Nm2=Nm2, rT=rr * T, pk=pk, a=a, b=b, Pp=Pp, sqs=s * sq)


# ---- FN.greeks -------------------------------------------------------------------------------------
def fn_greeks(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        dc = D(q["dc"])
        delta = dc - 1 if q["put"] else dc
        return out(abs(delta) * 100 * q["Nc"], delta=delta, ad=abs(delta), pos=-delta * 100 * q["Nc"], sh=abs(delta) * 100 * q["Nc"])
    if lv == 2:
        dS = q["dS"]
        a, b = D(q["dl"]) * dS, F(1, 2) * D(q["G"]) * dS * dS
        return out(D(q["V"]) + a + b, a=a, b=b, dV=a + b, V1=D(q["V"]) + a + b, ds2=dS * dS)
    s, T, S0 = D(q["s"]), D(q["T"]), q["S0"]
    sq = mm.sqrt(m(T))
    d1 = m(s) * sq / 2
    ph = mm.npdf(d1)
    G, Vg = ph / (S0 * m(s) * sq), S0 * ph * sq
    # compare with numerical derivatives of the Black-Scholes call (r = 0, K = S0)
    assert abs(mm.diff(lambda x: bs_call(x, S0, 0, s, T), S0, 2) - G) < 1e-15
    assert abs(mm.diff(lambda v: bs_call(S0, S0, 0, v, T), m(s)) - Vg) < 1e-15
    return out(G if q["kind"] == "gamma" else Vg, sq=sq, d1=d1, ph=ph, G=G, Vg=Vg, v1=Vg / 100)


# ---- FN.19 -----------------------------------------------------------------------------------------
def fn_19(p):
    q, lv = p["params"], p["level"]
    if lv <= 2:
        z = {95: F("1.645"), 99: F("2.326")}[q["al"]]
        es = {95: F("2.063"), 99: F("2.665")}[q["al"]]
        # the tabulated constants match the normal distribution
        assert abs(mm.ncdf(m(z)) - m(F(q["al"], 100))) < 2e-4
        assert abs(mm.npdf(mm.sqrt(2) * mm.erfinv(2 * m(F(q["al"], 100)) - 1)) / (1 - m(F(q["al"], 100))) - m(es)) < 5e-4  # phi(z_alpha)/(1 - alpha) at the exact quantile
        sdd = D(q["sd"]) / 100
        rt = isqrt(q["t"])
        assert rt * rt == q["t"]
        k = es if q["kind"] == "es" else z
        x = k * sdd * rt * q["V"]
        return out(x, z=z, sdd=sdd, rt=rt, k=k, x=x, v=z * sdd * q["V"])
    k = q["N"] * (100 - q["al"]) // 100
    srt = sorted(q["losses"], reverse=True)
    worst = srt[:k]
    ES = F(sum(worst), k)
    assert ES >= srt[k - 1]
    return out(ES, a=F(q["al"], 100), k=k, VaR=srt[k - 1], tot=sum(worst), ES=ES, kk=k + 3)


# ---- FN.21 -----------------------------------------------------------------------------------------
def fn_21(p):
    q, lv = p["params"], p["level"]
    if lv == 1:
        pd = F(q["p"], 100)
        a, b = pd * q["W"], (1 - pd) * q["L"]
        return out(a - b, pd=pd, q=1 - pd, a=a, b=b, ev=a - b)
    if lv == 2:
        pr, b = D(q["p"]), D(q["b"])
        qq = 1 - pr
        f = pr - qq / b
        # f* maximizes expected log growth
        x = sp.symbols("x")
        G = sp.Rational(pr.numerator, pr.denominator) * sp.log(1 + sp.Rational(b.numerator, b.denominator) * x) + sp.Rational(qq.numerator, qq.denominator) * sp.log(1 - x)
        assert sp.solve(sp.diff(G, x), x) == [sp.Rational(f.numerator, f.denominator)]
        return out(f * q["bank"], q=frac(qq), f=frac(f), edge=b * pr - qq, stake=f * q["bank"], fv=f)
    if q["kind"] == "cont":
        ex = F(q["mu"] - q["rf"], 100)
        v = F(q["sg"], 100) ** 2
        return out(ex / v, m=F(q["mu"], 100), rr=F(q["rf"], 100), s=F(q["sg"], 100), ex=ex, v=v, f=ex / v, pos=ex / v * q["Wl"])
    pr = D(q["p"])
    qq = 1 - pr
    f = pr - qq
    l1, l2 = mm.log(m(1 + f)), mm.log(m(1 - f))
    G = m(pr) * l1 + m(qq) * l2
    Gh = m(pr) * mm.log(m(1 + f / 2)) + m(qq) * mm.log(m(1 - f / 2))
    assert G > Gh > 0
    return out(G, q=qq, f=f, l1=l1, l2=l2, G=G, Gh=Gh, a=1 + f, b1=1 - f)


VERIFY = {
    "FN.1": fn_1, "FN.2": fn_2, "FN.3": fn_3, "FN.8": fn_8, "FN.4": fn_4, "FN.6": fn_6,
    "FN.growing-annuity": fn_growing_annuity, "FN.5": fn_5, "FN.7": fn_7, "FN.9": fn_9, "FN.10": fn_10,
    "FN.11": fn_11, "FN.efficient-frontier": fn_efficient_frontier, "FN.13": fn_13, "FN.beta-estimation": fn_beta_estimation,
    "FN.12": fn_12, "FN.wacc": fn_wacc, "FN.16": fn_16, "FN.dcf": fn_dcf, "FN.20": fn_20, "FN.ratios": fn_ratios,
    "FN.14": fn_14, "FN.bond-yields": fn_bond_yields, "FN.15": fn_15, "FN.17": fn_17, "FN.binomial": fn_binomial,
    "FN.22": fn_22, "FN.18": fn_18, "FN.greeks": fn_greeks, "FN.19": fn_19, "FN.21": fn_21,
}
