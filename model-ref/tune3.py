import numpy as np, copy, sys, json
import model3 as M
designs=[dict(pot=1,bar=1,dur=1,gentle=1),dict(pot=5,bar=1,dur=2,gentle=4),dict(pot=5,bar=1,dur=3,gentle=3),dict(pot=3,bar=3,dur=2,gentle=4),dict(pot=2,bar=5,dur=2,gentle=3),
         dict(pot=3,bar=4,dur=2,gentle=3),dict(pot=4,bar=2,dur=2,gentle=4),dict(pot=2,bar=3,dur=3,gentle=4),dict(pot=2,bar=4,dur=2,gentle=4),dict(pot=1,bar=5,dur=2,gentle=4),dict(pot=3,bar=3,dur=1,gentle=5)]
tabs={json.dumps(d):M.patient_table(d) for d in designs}
def run(cp, seeds=40, cost=None):
    p3=copy.deepcopy(M.P3); p3['community'].update(cp)
    if cost: p3['cost']=cost
    for d in designs:
        tab=tabs[json.dumps(d)]
        res=[M.year_outcome(d,s,tab,p3) for s in range(seeds)]
        fr=np.array([r['community']['months'][-1]['frac'] for r in res])
        rec=np.array([r['recovered'] for r in res])
        print(f"  {d['pot']}{d['bar']}{d['dur']}{d['gentle']} qE={res[0]['community']['qE']:.1e} eS={res[0]['community']['eS']:.2f} spread={np.mean(fr>=0.1):.2f} frac12={np.mean(fr):.2f} rec={rec.mean():.0f}[{rec.min()}-{rec.max()}]")
run({},seeds=60)
