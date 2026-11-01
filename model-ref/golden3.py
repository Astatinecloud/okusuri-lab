"""Golden values for the TS v3 implementation (patient tables + community runs)."""
import json, numpy as np, model3 as M
designs = [(1,1,1,1),(5,1,2,4),(3,3,2,4),(2,4,2,4),(2,5,2,3),(4,2,2,4)]
cases = []
for v in designs:
    d = dict(zip(M.KEYS, v))
    tab = M.patient_table(d)
    runs = []
    for seed in (1, 42, 2026):
        r = M.year_outcome(d, seed, tab)
        runs.append(dict(seed=seed, recovered=r['recovered'], kinds=''.join(r['kinds']),
                         months=r['community']['months'], emergences=r['community']['emergences']))
    cases.append(dict(levels=dict(d), cost=M.cost(d), se=tab['se'],
        cureS=tab['cureS'].astype(int).tolist(), cureR=tab['cureR'].astype(int).tolist(),
        okSE=tab['okSE'].astype(int).tolist(), pEmerge=tab['pEmerge'].tolist(),
        eS=runs and M.community(d, tab, 1)['eS'], eR=M.community(d, tab, 1)['eR'], qE=M.community(d, tab, 1)['qE'],
        runs=runs))
rng = M.Rng(7); seq = [rng.random() for _ in range(5)]
json.dump(dict(rngSeed7=seq, cases=cases), open('../src/model/__tests__/golden3.json', 'w'))
print('ok', [(c['levels'], [r['recovered'] for r in c['runs']]) for c in cases])
