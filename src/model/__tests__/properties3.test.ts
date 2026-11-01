import { describe, it, expect } from 'vitest';
import { canAfford, cost, killRates, patients, patientTable, withinHost, yearOutcome, type Design } from '..';
import { statisticsForLevel } from '../../game/investment';
const design: Design = { pot: 3, bar: 1, dur: 2, gentle: 5 };
describe('v3 mathematical properties', () => {
    it('budget and five levels', () => {
        expect(cost({ pot: 5, bar: 4, dur: 3, gentle: 1 })).toBe(9);
        expect(canAfford({ pot: 5, bar: 4, dur: 3, gentle: 1 })).toBe(true);
        expect(canAfford({ pot: 5, bar: 5, dur: 3, gentle: 1 })).toBe(false);
        expect(canAfford({ ...design, bar: 0 })).toBe(false);
        expect(canAfford({ ...design, pot: 6 })).toBe(false);
    });
    it('bar never changes resistant killing', () => {
        for (const t of [0, 11.9, 12, 71, 72, 144])
            for (let bar = 1; bar <= 5; bar++)
                expect(killRates(t, { ...design, bar }).kR).toBe(killRates(t, design).kR);
    });
    it('all designs have non-increasing emergence across bar, including gentle-independent values', () => {
        const immune = patients().map(p => p.immune);
        // gentle only changes sideEffect(), so these 25 backgrounds cover all 625 designs.
        for (let pot = 1; pot <= 5; pot++)
            for (let dur = 1; dur <= 5; dur++) {
                let previous = Infinity;
                for (let bar = 1; bar <= 5; bar++) {
                    const s = withinHost({ pot, bar, dur, gentle: 1 }, immune, 'S');
                    const q = s.pEmerge.reduce((a, b) => a + b, 0) / 100;
                    expect(q).toBeGreaterThan(0);
                    expect(q).toBeLessThanOrEqual(previous + 1e-15);
                    previous = q;
                    for (const n of s.final.flat())
                        expect(Number.isFinite(n) && n >= 0).toBe(true);
                    for (const p of s.pEmerge)
                        expect(p >= 0 && p <= 1).toBe(true);
                }
            }
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
        expect(statisticsForLevel({ ...design, bar: 5 }).spread).toBeLessThan(statisticsForLevel(design).spread);
    }, 20000);
});
