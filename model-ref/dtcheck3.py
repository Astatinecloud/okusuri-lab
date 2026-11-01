"""Time-step sensitivity, reproducibility and seed-count checks for v3."""
import copy, numpy as np, model3 as M
d = dict(pot=2, bar=4, dur=2, gentle=4)
im, se = M.patients()
for dt in (0.1, 0.05, 0.025):
    s = M.within_host(d, im, 'S', dt=dt)
    r = M.within_host(d, im, 'R', dt=dt)
    print(f'within-host dt={dt}: qE={s["pEmerge"].mean():.4e} cureS={np.mean(s["activeEnd"]<1e4):.2f} cureR={np.mean(r["activeEnd"]<1e4):.2f}')
tab = M.patient_table(d)
for cdt in (1.0, 0.5, 0.25):
    p3 = copy.deepcopy(M.P3); p3['community']['dt'] = cdt
    res = [M.year_outcome(d, s, tab, p3) for s in range(200)]
    fr = np.array([r['community']['months'][-1]['frac'] for r in res])
    rec = np.array([r['recovered'] for r in res])
    print(f'community dt={cdt}: spread={np.mean(fr>=0.1):.3f} (se {np.sqrt(np.mean(fr>=0.1)*(1-np.mean(fr>=0.1))/200):.3f}) rec={rec.mean():.1f}')
a = M.year_outcome(d, 12345, tab); b = M.year_outcome(d, 12345, tab)
print('same seed identical:', a['recovered'] == b['recovered'] and a['community']['months'] == b['community']['months'])
