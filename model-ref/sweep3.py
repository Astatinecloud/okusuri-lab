"""Full v3 verification sweep: all affordable designs x seeds, plus numerical checks."""
import itertools, json, math, copy, time
import numpy as np
import model3 as M

SEEDS = 50
rows = []
t0 = time.time()
designs = [dict(zip(M.KEYS, v)) for v in itertools.product(range(1, 6), repeat=4)]
designs = [d for d in designs if M.cost(d) <= M.P1['budget']]
neg = 0
for d in designs:
    tab = M.patient_table(d)
    res = [M.year_outcome(d, s, tab) for s in range(SEEDS)]
    fr = np.array([r['community']['months'][-1]['frac'] for r in res])
    for r in res:
        for m in r['community']['months']:
            if m['YS'] < 0 or m['YR'] < 0 or not (0 <= m['frac'] <= 1):
                neg += 1
    rec = np.array([r['recovered'] for r in res])
    rows.append(dict(levels=[d[k] for k in M.KEYS], cost=M.cost(d), qE=float(np.mean(tab['pEmerge'])),
                     recMean=float(rec.mean()), recMin=int(rec.min()), recMax=int(rec.max()),
                     spread=float(np.mean(fr >= M.P3['spreadThreshold'])), frac12=float(fr.mean())))
json.dump(rows, open('sweep3.json', 'w'), indent=0)
print('designs', len(rows), 'invalid month values', neg, 'time', round(time.time() - t0))
by = lambda i, v: [r for r in rows if r['levels'][i] == v]
for lv in range(1, 6):
    rr = by(1, lv)
    print('bar', lv, 'n', len(rr), 'spread mean', round(np.mean([r['spread'] for r in rr]), 3),
          'min', round(min(r['spread'] for r in rr), 3), 'recMean best', round(max(r['recMean'] for r in rr), 1))
rows.sort(key=lambda r: -r['recMean'])
print('top10', [(r['levels'], round(r['recMean'], 1), r['spread']) for r in rows[:10]])
# one-step monotonicity of spread in bar (others fixed)
idx = {tuple(r['levels']): r for r in rows}
viol = [(k, idx[k]['spread'], idx[(k[0], k[1] + 1, k[2], k[3])]['spread']) for k in idx
        if k[1] < 5 and (k[0], k[1] + 1, k[2], k[3]) in idx and idx[(k[0], k[1] + 1, k[2], k[3])]['qE'] > idx[k]['qE'] * 1.0001]
print('qE increases when bar rises (should be 0):', len(viol))
print('bar5 designs with spread > 0:', sum(1 for r in by(1, 5) if r['spread'] > 0), 'of', len(by(1, 5)))
