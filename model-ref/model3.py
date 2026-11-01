"""v3 reference model: within-host treatment (hours) + regional spread (days) over one year.

Design keys: pot (殺菌力), bar (耐性の生じにくさ), dur (効果が続く時間), gentle (安全性).

Short-term (per patient, hours): the v1/v2 four-state ODE (S, Sq, R, Rq) with logistic growth,
Hill PD, half-life PK, saturating immunity and a reversible drug-tolerant state.
  * drug given every 12 h for Ttreat = 72 h, then Tpost = 72 h without drug (immune only).
  * resistant mutant: EC50 x resistFoldMutant (fixed; NOT changed by 'bar'),
    growth gR = gS * (1 - cost[bar]).
Emergence in a patient infected with the susceptible strain:
  * standing variation at treatment start: S0 * freq[bar] resistant cells (freq = frequency of
    resistant mutants in an untreated population; Silver 2011: 1e-6..1e-9 for single targets).
  * de novo: mutants arise from dividing active S cells at rate mu = freq * cost per division
    (mutation-selection balance f = mu / c, so mu is derived, not chosen separately).
  * each new mutant lineage is a time-inhomogeneous birth-death process with
    b(t) = gR * crowd(t), d(t) = kR(t) + imm(t); its probability of being alive at
    H = Ttreat + Tpost is 1/G(t0), G(t0) = 1 + int_{t0}^{H} d(s) exp(-rho(s)) ds,
    rho(s) = int_{t0}^{s} (b-d) (Kendall 1948). Discretised backwards:
        G(t) = 1 + d(t) dt + exp(-(b-d)(t) dt) * (G(t+dt) - 1),  G(H) = 1.
  * expected surviving lineages E = sum mu * gS*crowd*S * dt / G(t) + standing / G(0);
    P(emergence) = 1 - exp(-E).
Long-term (region, days): stochastic SIS-type model with treatment (tau-leaping, 1 day):
  infections by drug-susceptible (Y_S) and resistant (Y_R) strains among N at-risk people.
"""
import json, math, os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
P1 = json.load(open(os.path.join(HERE, 'params.json'), encoding='utf-8'))
P3 = json.load(open(os.path.join(HERE, 'params3.json'), encoding='utf-8'))
KEYS = ('pot', 'bar', 'dur', 'gentle')


def patients(p=P1):
    from model import norm_ppf
    n = p['nPat']
    z = np.array([norm_ppf((i + 0.5) / n) for i in range(n)])
    immune = p['immuneMean'] * np.exp(p['immuneSd'] * z)
    seTol = p['seTolMean'] * np.exp(p['seTolSd'] * z[[(i * 61 + 17) % n for i in range(n)]])
    return immune, seTol


def conc(t, dur, p=P1, p3=P3):
    """Doses at 0, 12, ..., < Ttreat."""
    k = math.log(2) / p['halfLife'][dur - 1]
    c = 0.0
    i = 0
    while i * p['doseInterval'] <= t and i * p['doseInterval'] < p3['Ttreat']:
        c += p['Cpeak'] * math.exp(-k * (t - i * p['doseInterval']))
        i += 1
    return c


def hill(c, ec50, p=P1):
    if c <= 0:
        return 0.0
    x = (c / ec50) ** p['hill']
    return p['Emax'] * x / (1 + x)


def within_host(d, immune, strain, p=P1, p3=P3, dt=None):
    """Vectorised over patients (immune array). strain='S' or 'R' (infecting strain).
    Returns final active counts at Ttreat, and for strain S the emergence expectation E."""
    dt = dt or p['dt']
    m = np.asarray(immune, float)
    n = len(m)
    c_cost = p3['cost'][d['bar'] - 1]
    gS = p['gS']
    gR = gS * (1 - c_cost)
    ec = p['ec50S'][d['pot'] - 1]
    F = p3['resistFoldMutant']
    f = p['tolFrac0']
    S0 = p['S0']
    if strain == 'S':
        y = np.array([np.full(n, S0 * (1 - f)), np.full(n, S0 * f), np.zeros(n), np.zeros(n)])
    else:
        y = np.array([np.zeros(n), np.zeros(n), np.full(n, S0 * (1 - f)), np.full(n, S0 * f)])
    H = p3['Ttreat'] + p3['Tpost']
    steps = int(round(H / dt))
    tsteps = int(round(p3['Ttreat'] / dt))
    a, b = p['a'], p['b']
    K, Ki = p['K'], p['Ki']

    def rhs(t, y):
        S, Sq, R, Rq = y
        c = conc(t, d['dur'], p, p3)
        kS = hill(c, ec, p)
        kR = hill(c, ec * F, p)
        N = S + Sq + R + Rq
        crowd = np.maximum(0.0, 1 - N / K)
        imm = m * Ki / (Ki + N)
        return np.array([
            gS * crowd * S - kS * S - a * S + b * Sq - imm * S,
            a * S - b * Sq,
            gR * crowd * R - kR * R - a * R + b * Rq - imm * R,
            a * R - b * Rq,
        ])

    # record per-step quantities for the lineage calculation (left endpoints)
    birthS = np.zeros((steps, n))   # gS*crowd*S  (divisions per hour)
    bR = np.zeros((steps, n))
    dR = np.zeros((steps, n))
    endTreat = None
    for i in range(steps):
        t = i * dt
        S, Sq, R, Rq = y
        N = S + Sq + R + Rq
        crowd = np.maximum(0.0, 1 - N / K)
        c = conc(t, d['dur'], p, p3)
        birthS[i] = gS * crowd * S
        bR[i] = gR * crowd
        dR[i] = hill(c, ec * F, p) + m * Ki / (Ki + N)
        k1 = rhs(t, y)
        k2 = rhs(t + dt / 2, y + dt / 2 * k1)
        k3 = rhs(t + dt / 2, y + dt / 2 * k2)
        k4 = rhs(t + dt, y + dt * k3)
        y = np.maximum(0.0, y + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4))
        if i + 1 == tsteps:
            endTreat = y.copy()
    active_end = endTreat[0] + endTreat[2]
    out = dict(activeEnd=active_end, end=endTreat)
    if strain == 'S':
        G = np.ones(n)
        Gt = np.zeros((steps, n))
        for i in range(steps - 1, -1, -1):
            G = 1 + dR[i] * dt + np.exp(-(bR[i] - dR[i]) * dt) * (G - 1)
            Gt[i] = G
        freq = p3['freq'][d['bar'] - 1]          # standing frequency of resistant mutants (Silver 2011 range)
        mu = freq * c_cost                       # per-division rate from mutation-selection balance f = mu / c
        denovo = (mu * birthS * dt / Gt).sum(axis=0)
        standing = S0 * freq / Gt[0]
        out['E_denovo'] = denovo
        out['E_standing'] = standing
        out['pEmerge'] = 1 - np.exp(-(denovo + standing))
    return out


def side_effect(d, p=P1, p3=P3):
    return p['seBase'] * (1 + p['sePot'][d['pot'] - 1] + p3['seBarrier'][d['bar'] - 1]
                          + p['seDur'][d['dur'] - 1]) * p['seGentle'][d['gentle'] - 1]


def patient_table(d, p=P1, p3=P3, dt=None):
    immune, seTol = patients(p)
    s = within_host(d, immune, 'S', p, p3, dt)
    r = within_host(d, immune, 'R', p, p3, dt)
    se = side_effect(d, p, p3)
    okSE = se < seTol
    return dict(
        cureS=s['activeEnd'] < p['cureThreshold'], cureR=r['activeEnd'] < p['cureThreshold'],
        pEmerge=s['pEmerge'], okSE=okSE, se=se, E_denovo=s['E_denovo'], E_standing=s['E_standing'],
    )


class Rng:
    """mulberry32 — identical sequence in TS."""
    def __init__(self, seed):
        self.a = seed & 0xFFFFFFFF

    def random(self):
        self.a = (self.a + 0x6D2B79F5) & 0xFFFFFFFF
        t = self.a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    def poisson(self, lam):
        if lam <= 0:
            return 0
        if lam < 30:
            L, k, prod = math.exp(-lam), 0, self.random()
            while prod > L:
                k += 1
                prod *= self.random()
            return k
        # normal approximation for large means (rounded, non-negative)
        u1, u2 = max(self.random(), 1e-12), self.random()
        z = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
        return max(0, int(round(lam + math.sqrt(lam) * z)))

    def binomial(self, n, q):
        if n <= 0 or q <= 0:
            return 0
        if q >= 1:
            return n
        if n < 50:
            return sum(1 for _ in range(n) if self.random() < q)
        mean, var = n * q, n * q * (1 - q)
        if mean < 30:
            return min(n, self.poisson(mean))
        u1, u2 = max(self.random(), 1e-12), self.random()
        z = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
        return min(n, max(0, int(round(mean + math.sqrt(var) * z))))


def community(d, tab, seed, p3=P3, dt=None):
    cp = p3['community']
    dt = dt or cp['dt']
    c_cost = p3['cost'][d['bar'] - 1]
    okSE = tab['okSE']
    eS = float(np.mean(tab['cureS'] & okSE & True) - 0)  # cured & completed
    qE = float(np.mean(tab['pEmerge']))
    # a susceptible-strain treatment either: emerges resistance (qE), else cured (cureS&okSE), else fails
    eS = float(np.mean((tab['cureS'] & okSE) * (1 - tab['pEmerge'])))
    eR = float(np.mean(tab['cureR'] & okSE))
    rng = Rng(seed)
    N = cp['N']
    YS, YR = cp['Y0'], 0
    days = cp['days']
    steps = int(round(days / dt))
    daily = []
    emerg_total = 0
    for i in range(steps):
        X = max(0, N - YS - YR)
        newS = rng.poisson((cp['beta'] * X * YS / N + cp['importRate']) * dt)
        newR = rng.poisson(cp['beta'] * (1 - c_cost) * X * YR / N * dt)
        pT = 1 - math.exp(-cp['tau'] * dt)
        pG = 1 - math.exp(-cp['gamma'] * dt)
        treatS = rng.binomial(YS, pT)
        emerg = rng.binomial(treatS, qE)
        curedS = rng.binomial(treatS - emerg, eS / max(1e-12, 1 - qE))
        natS = rng.binomial(YS - treatS, pG)
        treatR = rng.binomial(YR, pT)
        curedR = rng.binomial(treatR, eR)
        natR = rng.binomial(YR - treatR, pG)
        YS = max(0, YS + newS - emerg - curedS - natS)
        YR = max(0, YR + newR + emerg - curedR - natR)
        emerg_total += emerg
        if (i + 1) * dt % 1 < 1e-9:
            daily.append((YS, YR, emerg))
    months = []
    for mth in range(12):
        lo, hi = int(mth * days / 12), int((mth + 1) * days / 12)
        seg = daily[lo:hi]
        ys = float(np.mean([x[0] for x in seg]))
        yr = float(np.mean([x[1] for x in seg]))
        months.append(dict(month=mth + 1, YS=ys, YR=yr, frac=yr / (ys + yr) if ys + yr > 0 else 0.0,
                           emergences=sum(x[2] for x in seg)))
    return dict(months=months, eS=eS, eR=eR, qE=qE, emergences=emerg_total)


def year_outcome(d, seed, tab=None, p3=P3):
    tab = tab or patient_table(d)
    com = community(d, tab, seed, p3)
    rng = Rng(seed ^ 0x9E3779B9)
    rec = 0
    detail = []
    for k in range(100):
        mth = k * 12 // 100
        frac = com['months'][mth]['frac']
        resistantInfection = rng.random() < frac
        if resistantInfection:
            ok = bool(tab['cureR'][k] and tab['okSE'][k])
            kind = 'R'
        else:
            emerged = rng.random() < tab['pEmerge'][k]
            ok = bool(tab['cureS'][k] and tab['okSE'][k] and not emerged)
            kind = 'E' if emerged else 'S'
        rec += ok
        detail.append(kind)
    return dict(recovered=rec, community=com, kinds=detail)


def cost(d, p=P1):
    return sum(p['levelCost'][d[k] - 1] for k in KEYS)


if __name__ == '__main__':
    import sys
    designs = [dict(pot=5, bar=1, dur=3, gentle=3), dict(pot=2, bar=5, dur=2, gentle=3),
               dict(pot=3, bar=3, dur=2, gentle=4), dict(pot=1, bar=1, dur=1, gentle=1),
               dict(pot=3, bar=1, dur=2, gentle=5), dict(pot=2, bar=4, dur=3, gentle=3)]
    for d in designs:
        tab = patient_table(d)
        res = [year_outcome(d, s, tab) for s in range(40)]
        recs = [r['recovered'] for r in res]
        fr = [r['community']['months'][-1]['frac'] for r in res]
        spread = np.mean([f >= P3['spreadThreshold'] for f in fr])
        c = res[0]['community']
        print(d, 'cost', cost(d), f"eS={c['eS']:.2f} eR={c['eR']:.2f} qE={c['qE']:.2e}",
              f"rec mean={np.mean(recs):.1f} [{min(recs)}-{max(recs)}] spread={spread:.2f} frac12 mean={np.mean(fr):.3f}")
        print('   month YS/YR seed0:', [(round(m['YS']), round(m['YR'])) for m in c['months']])
