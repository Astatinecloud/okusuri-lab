"""Vectorised sweep of every affordable design (same equations as model.py).

Usage: python sweep.py [params.json] [--dt 0.05] [--out sweep.json]
"""
import json, math, sys, itertools, collections
import numpy as np
from model import patients, side_effect, cost, P as P0

args = sys.argv[1:]
p = dict(P0)
if args and args[0].endswith('.json'):
    p.update(json.load(open(args[0], encoding='utf-8')))
dt = float(args[args.index('--dt') + 1]) if '--dt' in args else p['dt']
out = args[args.index('--out') + 1] if '--out' in args else 'sweep.json'

designs = [dict(zip(('pot', 'mech', 'dur', 'gentle'), v)) for v in itertools.product(range(1, 6), repeat=4)]
designs = [d for d in designs if cost(d, p) <= p['budget']]
immune, log10R0, seTol = patients(p)
npat = len(immune)
# columns: for each design, npat patients + 1 representative
imm = np.concatenate([np.append(immune, p['immuneMean']) for _ in designs])
lr0 = np.concatenate([np.append(log10R0, p['repLog10R0']) for _ in designs])
pot = np.repeat([d['pot'] for d in designs], npat + 1)
mech = np.repeat([d['mech'] for d in designs], npat + 1)
dur = np.repeat([d['dur'] for d in designs], npat + 1)
ecS = np.array(p['ec50S'])[pot - 1]
ecR = ecS * np.array(p['resistFold'])[mech - 1]
kel = np.log(2) / np.array(p['halfLife'])[dur - 1]


def conc(t):
    n = int(t // p['doseInterval'])
    return sum(p['Cpeak'] * np.exp(-kel * (t - i * p['doseInterval'])) for i in range(n + 1))


def hill(c, ec):
    x = (c / ec) ** p['hill']
    return x / (1 + x)


def rhs(t, y):
    S, Sq, R, Rq = y
    c = conc(t)
    kS = p['Emax'] * hill(c, ecS)
    kR = p['Emax'] * hill(c, ecR)
    N = S + Sq + R + Rq
    crowd = np.maximum(0.0, 1 - N / p['K'])
    im = imm * p['Ki'] / (p['Ki'] + N)
    imq = im * p['immuneTolFrac']
    a, b, e = p['a'], p['b'], p['tolKillFrac']
    return np.array([
        p['gS'] * crowd * S - kS * S - a * S + b * Sq - im * S,
        a * S - b * Sq - e * kS * Sq - imq * Sq,
        p['gR'] * crowd * R - kR * R - a * R + b * Rq - im * R,
        a * R - b * Rq - e * kR * Rq - imq * Rq,
    ])


f = p['tolFrac0']
R0 = 10.0 ** lr0
y = np.array([np.full_like(R0, p['S0'] * (1 - f)), np.full_like(R0, p['S0'] * f), R0 * (1 - f), R0 * f])
n = int(round(p['T'] / dt))
ymin = y.min()
for i in range(n):
    t = i * dt
    k1 = rhs(t, y); k2 = rhs(t + dt / 2, y + dt / 2 * k1)
    k3 = rhs(t + dt / 2, y + dt / 2 * k2); k4 = rhs(t + dt, y + dt * k3)
    y = np.maximum(0.0, y + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4))
y = y.reshape(4, len(designs), npat + 1)
rows = []
for j, d in enumerate(designs):
    pat = y[:, j, :npat]
    rep = y[:, j, npat]
    cured = (pat[0] + pat[2]) < p['cureThreshold']
    se = side_effect(d, p)
    rec = int(np.sum(cured & (se < seTol)))
    R0r = 10 ** p['repLog10R0']
    rows.append(dict(levels=[d['pot'], d['mech'], d['dur'], d['gentle']], cost=cost(d, p), rec=rec,
                     cured=int(cured.sum()), se=se,
                     normEnd=float(rep[0] + rep[1]), resEnd=float(rep[2] + rep[3]), resTolEnd=float(rep[3]),
                     normRed=float(1 - (rep[0] + rep[1]) / p['S0']), resRed=float(1 - (rep[2] + rep[3]) / R0r)))
json.dump(rows, open(out, 'w'), indent=0)
rows.sort(key=lambda r: -r['rec'])
print('designs', len(rows), 'dt', dt)
for r in rows[:10]:
    print(r['levels'], 'cost', r['cost'], 'rec', r['rec'], f"resEnd {r['resEnd']:.3g}")
hist = collections.Counter(min(9, r['rec'] // 10) * 10 for r in rows)
print('rec histogram:', sorted(hist.items()))
print('min rep resEnd:', min(r['resEnd'] for r in rows), 'min rep normEnd:', min(r['normEnd'] for r in rows))
by = lambda key, val: [r['rec'] for r in rows if r['levels'][key] == val]
for k, name in enumerate(['pot', 'mech', 'dur', 'gentle']):
    print(name, 'best rec by level:', [max(by(k, v)) for v in range(1, 6)])
print('base 1111:', [r['rec'] for r in rows if r['levels'] == [1, 1, 1, 1]])
