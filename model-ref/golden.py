"""Generate golden values for the TS implementation."""
import json
from model import P, patients, simulate, outcome, side_effect, cost
designs = [(1,1,1,1),(5,1,2,2),(1,5,2,2),(5,5,1,2),(1,5,5,1),(5,1,5,1),(2,4,2,5),(3,4,1,5),(4,4,1,4),(1,5,3,4),(3,3,3,4),(2,2,2,2),(1,2,3,4),(5,2,1,3),(3,1,3,4)]
out=[]
for v in designs:
    d=dict(zip(('pot','mech','dur','gentle'),v))
    o=outcome(d)
    trace=[dict(t=t, S=float(y[0,0]), Sq=float(y[1,0]), R=float(y[2,0]), Rq=float(y[3,0])) for t,y in o['trace']]
    out.append(dict(levels=dict(d), cost=cost(d), recovered=o['recovered'], cured=o['cured'], seDrop=o['seDrop'], se=o['se'],
        normEnd=float(o['normEnd']), resEnd=float(o['resEnd']), resTolEnd=float(o['resTolEnd']), actEnd=float(o['actEnd']), trace=trace))
im, lr, st = patients(P)
json.dump(dict(patients=dict(immune=im.tolist(), log10R0=lr.tolist(), seTol=st.tolist()), cases=out),
          open('../okusuri-lab/src/model/__tests__/golden.json','w'))
print('ok', [(c['levels'], c['recovered']) for c in out])
