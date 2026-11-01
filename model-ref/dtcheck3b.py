import copy, numpy as np, model3 as M
d = dict(pot=2, bar=4, dur=2, gentle=4)
tab = M.patient_table(d)
for cdt in (0.25, 0.125, 0.0625):
    p3 = copy.deepcopy(M.P3); p3['community']['dt'] = cdt
    res = [M.year_outcome(d, s, tab, p3) for s in range(400)]
    fr = np.array([r['community']['months'][-1]['frac'] for r in res])
    sp = np.mean(fr >= 0.1)
    print(f'community dt={cdt}: spread={sp:.3f} (se {np.sqrt(sp*(1-sp)/400):.3f}) rec={np.mean([r["recovered"] for r in res]):.1f}', flush=True)
