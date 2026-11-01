import { describe, it, expect } from 'vitest';
import { canAfford, cost, keys, killRates, patients, patientTable, withinHost, yearOutcome, type Design } from '..';
import { statisticsForLevel } from '../../game/investment';
const design: Design = { pot: 3, bar: 1, dur: 2, gentle: 5 };
describe('v3 mathematical properties', () => {
    it('budget and five levels', () => {
        expect(cost({ pot: 5, bar: 4, dur: 3, gentle: 1 })).toBe(9);
        expect(canAfford({ pot: 5, bar: 4, dur: 3, gentle: 1 })).toBe(true);
        expect(canAfford({ pot: 5, bar: 5, dur: 3, gentle: 1 })).toBe(false);
        expect(canAfford({ ...design, bar: 0 })).toBe(false);
        expect(canAfford({ ...design, pot: 6 })).toBe(false);
        for (const key of keys) {
            for (let level = 1; level <= 5; level++) {
                const d = {pot:1,bar:1,dur:1,gentle:1,[key]:level};
                expect(canAfford(d)).toBe(true);
                expect(cost(d)).toBe(level-1);
            }
            expect(canAfford({pot:1,bar:1,dur:1,gentle:1,[key]:1.5})).toBe(false);
        }
    });
    it('bar never changes resistant killing', () => {
        for (const t of [0, 11.9, 12, 71, 72, 144])
            for (let bar = 1; bar <= 5; bar++)
                expect(killRates(t, { ...design, bar }).kR).toBe(killRates(t, design).kR);
    });
    it('all designs have non-increasing emergence across bar, including gentle-independent values', () => {
        const immune = patients().map(p => p.immune);
        const probabilities = new Map<string,number>();
        // gentle only changes sideEffect(), so these 25 backgrounds cover all 625 designs.
        for (let pot = 1; pot <= 5; pot++)
            for (let dur = 1; dur <= 5; dur++) {
                let previous = Infinity;
                for (let bar = 1; bar <= 5; bar++) {
                    const s = withinHost({ pot, bar, dur, gentle: 1 }, immune, 'S');
                    const q = s.pEmerge.reduce((a, b) => a + b, 0) / 100;
                    probabilities.set([pot,bar,dur].join(':'),q);
                    expect(q).toBeGreaterThan(0);
                    expect(q).toBeLessThanOrEqual(previous + 1e-15);
                    previous = q;
                    for (const n of s.final.flat())
                        expect(Number.isFinite(n) && n >= 0).toBe(true);
                    for (const p of s.pEmerge)
                        expect(p >= 0 && p <= 1).toBe(true);
                }
            }
        // Explicitly enumerate every affordable design, including each gentle level.
        let checked=0;
        for(let pot=1;pot<=5;pot++)for(let dur=1;dur<=5;dur++)for(let gentle=1;gentle<=5;gentle++) {
            let previous=Infinity;
            for(let bar=1;bar<=5;bar++) {
                if(!canAfford({pot,bar,dur,gentle})) continue;
                const q=probabilities.get([pot,bar,dur].join(':'))!;
                expect(q).toBeLessThanOrEqual(previous+1e-15);
                previous=q;checked++;
            }
        }
        expect(checked).toBe(435);
    }, 180000);
    it('seed reproducibility, population bounds and exhaustive outcome partition', () => {
        const r = yearOutcome(design, 0xffffffff);
        expect(yearOutcome(design, 0xffffffff)).toEqual(r);
        expect(r.outcomes).toHaveLength(100);
        expect(r.recovered).toBeGreaterThanOrEqual(0);
        expect(r.recovered).toBeLessThanOrEqual(100);
        expect(r.outcomes.filter(v => v === 'well').length).toBe(r.recovered);
        expect(r.community.daily.flat().every(v => v >= 0 && Number.isInteger(v))).toBe(true);
        expect(r.community.months.every(m => m.frac >= 0 && m.frac <= 1)).toBe(true);
        expect(patientTable(design).pEmerge).toHaveLength(100);
    });
    it('200 seeds: level 5 reduces spread compared with level 1', () => {
        const d={pot:2,bar:1,dur:2,gentle:4};
        expect(statisticsForLevel({ ...d, bar: 5 }).spread).toBeLessThan(statisticsForLevel(d).spread);
    }, 20000);
    for(const d of [{pot:1,bar:1,dur:1,gentle:1},{pot:2,bar:5,dur:2,gentle:4},{pot:5,bar:1,dur:3,gentle:3}]) {
        it('bounds and replay across seeds: '+JSON.stringify(d),()=>{
            for(const seed of [0,1,42,0xffffffff]){
                const r=yearOutcome(d,seed);
                expect(yearOutcome(d,seed)).toEqual(r);
                expect(Number.isInteger(r.recovered)&&r.recovered>=0&&r.recovered<=100).toBe(true);
                expect(r.community.daily).toHaveLength(365);
                expect(r.community.daily.flat().every(v=>Number.isInteger(v)&&v>=0)).toBe(true);
                expect(r.community.months.every(m=>m.YS>=0&&m.YR>=0&&m.frac>=0&&m.frac<=1)).toBe(true);
                // Monthly means are computed from whole-day endpoint samples.
                const days=r.community.daily.slice(0,30);
                expect(r.community.months[0].YS).toBe(days.reduce((sum,v)=>sum+v[0],0)/30);
            }
        },20000);
    }
});
