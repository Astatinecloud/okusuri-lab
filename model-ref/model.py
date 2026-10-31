"""Reference implementation of the Okusuri Hatsumei Lab model (Python, numpy).

The TypeScript game model must reproduce these numbers (golden tests).
Units: time [h], bacteria [cells in the virtual infection site],
drug concentration C [multiples of the reference MIC-like scale, dimensionless].

States per patient (all >= 0):
  S  normal (susceptible) bacteria, active state
  Sq normal bacteria, temporarily tolerant / hard-to-reach state
  R  genetically resistant bacteria, active state
  Rq genetically resistant bacteria, temporarily tolerant / hard-to-reach state
Genetic resistance (S vs R) is inherited and fixed during the run.
Tolerance (active vs q) is a reversible phenotypic state that BOTH strains can enter.
"""
import math, itertools, json, sys
import numpy as np

with open(__file__.replace('model.py', 'params.json'), encoding='utf-8') as f:
    P = json.load(f)


def conc(t, lvl, p):
    k = math.log(2) / p['halfLife'][lvl - 1]
    n = int(t // p['doseInterval'])
    return sum(p['Cpeak'] * math.exp(-k * (t - i * p['doseInterval'])) for i in range(n + 1))


def hillf(c, ec50, h):
    if c <= 0:
        return 0.0
    x = (c / ec50) ** h
    return x / (1 + x)


def kill_rates(t, d, p):
    c = conc(t, d['dur'], p)
    ec = p['ec50S'][d['pot'] - 1]
    kS = p['Emax'] * hillf(c, ec, p['hill'])
    kR = p['Emax'] * hillf(c, ec * p['resistFold'][d['mech'] - 1], p['hill'])
    return c, kS, kR


def rhs(t, y, d, p, m):
    S, Sq, R, Rq = y
    c, kS, kR = kill_rates(t, d, p)
    N = S + Sq + R + Rq
    crowd = np.maximum(0.0, 1 - N / p['K'])
    gS = p['gS'] * crowd
    gR = p['gR'] * crowd
    imm = m * p['Ki'] / (p['Ki'] + N)            # per-cell immune clearance, saturating
    immQ = imm * p['immuneTolFrac']               # protected cells are cleared less
    a, b, e = p['a'], p['b'], p['tolKillFrac']
    return np.array([
        gS * S - kS * S - a * S + b * Sq - imm * S,
        a * S - b * Sq - e * kS * Sq - immQ * Sq,
        gR * R - kR * R - a * R + b * Rq - imm * R,
        a * R - b * Rq - e * kR * Rq - immQ * Rq,
    ])


def norm_ppf(q):
    lo, hi = -10.0, 10.0
    for _ in range(80):
        mid = (lo + hi) / 2
        if 0.5 * (1 + math.erf(mid / math.sqrt(2))) < q:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def patients(p):
    n = p['nPat']
    z = np.array([norm_ppf((i + 0.5) / n) for i in range(n)])
    perm2 = [(i * 37) % n for i in range(n)]
    perm3 = [(i * 61 + 17) % n for i in range(n)]
    immune = p['immuneMean'] * np.exp(p['immuneSd'] * z)
    log10R0 = p['log10R0Mean'] + p['log10R0Sd'] * z[perm2]
    seTol = p['seTolMean'] * np.exp(p['seTolSd'] * z[perm3])
    return immune, log10R0, seTol


def simulate(d, p, immune, log10R0, dt=None, record_every=None):
    dt = dt or p['dt']
    f = p['tolFrac0']
    S0 = p['S0']
    R0 = 10.0 ** np.asarray(log10R0, dtype=float)
    y = np.array([np.full_like(R0, S0 * (1 - f)), np.full_like(R0, S0 * f), R0 * (1 - f), R0 * f])
    m = np.asarray(immune, dtype=float)
    n = int(round(p['T'] / dt))
    rec = [(0.0, y.copy())]
    every = record_every or max(1, int(round(1.0 / dt)))
    for i in range(n):
        t = i * dt
        k1 = rhs(t, y, d, p, m)
        k2 = rhs(t + dt / 2, y + dt / 2 * k1, d, p, m)
        k3 = rhs(t + dt / 2, y + dt / 2 * k2, d, p, m)
        k4 = rhs(t + dt, y + dt * k3, d, p, m)
        y = np.maximum(0.0, y + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4))
        if (i + 1) % every == 0:
            rec.append(((i + 1) * dt, y.copy()))
    return y, rec


def side_effect(d, p):
    return p['seBase'] * (1 + p['sePot'][d['pot'] - 1] + p['seMech'][d['mech'] - 1]
                          + p['seDur'][d['dur'] - 1]) * p['seGentle'][d['gentle'] - 1]


def outcome(d, p=P, dt=None):
    immune, log10R0, seTol = patients(p)
    y, _ = simulate(d, p, immune, log10R0, dt)
    active = y[0] + y[2]
    cured = active < p['cureThreshold']
    se = side_effect(d, p)
    okSE = se < seTol
    rec = int(np.sum(cured & okSE))
    # representative patient (median immune, fixed illustrative R0 = repLog10R0)
    yr, tr = simulate(d, p, np.array([p['immuneMean']]), np.array([p['repLog10R0']]), dt)
    S, Sq, R, Rq = yr[:, 0]
    actEnd = S + R
    R0 = 10 ** p['repLog10R0']
    return dict(
        recovered=rec, cured=int(cured.sum()), seDrop=int((~okSE).sum()), se=se,
        actEnd=actEnd, normEnd=S + Sq, resEnd=R + Rq, resTolEnd=Rq,
        normRed=1 - (S + Sq) / p['S0'], resRed=1 - (R + Rq) / R0,
        trace=tr,
    )


def cost(d, p=P):
    return sum(p['levelCost'][d[k] - 1] for k in ('pot', 'mech', 'dur', 'gentle'))


TESTS = {
    'A pot5 mech1': dict(pot=5, mech=1, dur=2, gentle=2),
    'B pot1 mech5': dict(pot=1, mech=5, dur=2, gentle=2),
    'C pot5 mech5': dict(pot=5, mech=5, dur=1, gentle=2),
    'D mech5 dur5': dict(pot=1, mech=5, dur=5, gentle=1),
    'E pot5 mech1 dur5': dict(pot=5, mech=1, dur=5, gentle=1),
    'base 1111': dict(pot=1, mech=1, dur=1, gentle=1),
}

if __name__ == '__main__':
    for k, d in TESTS.items():
        o = outcome(d)
        print(f"{k:18s} cost={cost(d):2d} rec={o['recovered']:3d} (cured {o['cured']}, seDrop {o['seDrop']}) "
              f"normRed={o['normRed']*100:8.4f}% resRed={o['resRed']*100:10.4f}% resEnd={o['resEnd']:.3g} "
              f"(tol {o['resTolEnd']:.3g}) normEnd={o['normEnd']:.3g} act={o['actEnd']:.3g} se={o['se']:.2f}")
    if '--all' in sys.argv:
        rows = []
        for v in itertools.product(range(1, 6), repeat=4):
            d = dict(zip(('pot', 'mech', 'dur', 'gentle'), v))
            if cost(d) > P['budget']:
                continue
            o = outcome(d)
            rows.append(dict(levels=v, rec=o['recovered'], resEnd=o['resEnd'], normEnd=o['normEnd'],
                             normRed=o['normRed'], resRed=o['resRed'], se=o['se']))
        rows.sort(key=lambda r: -r['rec'])
        print('affordable designs:', len(rows))
        for r in rows[:15]:
            print(r['levels'], r['rec'], f"{r['resEnd']:.3g}")
        print('...')
        for r in rows[-5:]:
            print(r['levels'], r['rec'], f"{r['resEnd']:.3g}")
        print('min resEnd (cells):', min(r['resEnd'] for r in rows))
        import collections
        hist = collections.Counter(r['rec'] // 10 * 10 for r in rows)
        print('rec histogram:', sorted(hist.items()))
        json.dump(rows, open('all_designs.json', 'w'), default=float)
