import { describe, it, expect } from 'vitest';
import golden from './golden.json';
import { canAfford, cost, keys, params, patients, runDesign, simulate, type Design } from '..';
const close = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(Math.max(1, Math.abs(b)) * 1e-6);
describe('Python reference', () => {
    it('all 100 deterministic patients within 1e-9', () => { patients().forEach((p, i) => { for (const k of ['immune', 'log10R0', 'seTol'] as const)
        expect(Math.abs(p[k] - golden.patients[k][i])).toBeLessThan(1e-9); }); });
    for (const [i, g] of golden.cases.entries())
        it(`golden case ${i + 1}: ${JSON.stringify(g.levels)}`, () => { const r = runDesign(g.levels); expect(cost(g.levels)).toBe(g.cost); for (const k of ['recovered', 'cured', 'seDrop'] as const)
            expect(r[k]).toBe(g[k]); close(r.se, g.se); for (const k of ['normEnd', 'resEnd', 'resTolEnd', 'actEnd'] as const)
            close(r.representative[k], g[k]); expect(r.representative.trace).toHaveLength(73); r.representative.trace.forEach((p, j) => { for (const k of ['t', 'S', 'Sq', 'R', 'Rq'] as const)
            close(p[k], g.trace[j][k]); }); });
});
const designs: Design[] = [];
for (let pot = 1; pot <= 5; pot++)
    for (let mech = 1; mech <= 5; mech++)
        for (let dur = 1; dur <= 5; dur++)
            for (let gentle = 1; gentle <= 5; gentle++) {
                const d = { pot, mech, dur, gentle };
                if (canAfford(d))
                    designs.push(d);
            }
describe('science rules', () => {
    it('A/E strength alone cannot remove resistant bacteria at any duration', () => { for (let dur = 1; dur <= 5; dur++) {
        const low = runDesign({ pot: 1, mech: 1, dur, gentle: 1 }).representative, high = runDesign({ pot: 5, mech: 1, dur, gentle: 1 }).representative;
        expect(high.normEnd / high.normStart).toBeLessThanOrEqual(.01);
        expect(high.resEnd).toBeGreaterThanOrEqual(high.resStart);
        expect(low.resEnd / high.resEnd).toBeLessThan(10);
    } });
    it('B new mechanism suppresses resistant bacteria', () => { const r = runDesign({ pot: 1, mech: 5, dur: 2, gentle: 2 }).representative; expect(r.resEnd / r.resStart).toBeLessThanOrEqual(.01); });
    it('C combined strength and mechanism consume 8 coins and suppress both', () => { const d = { pot: 5, mech: 5, dur: 1, gentle: 1 }, r = runDesign(d).representative; expect(cost(d)).toBe(8); expect(r.normEnd / r.normStart).toBeLessThanOrEqual(.001); expect(r.resEnd / r.resStart).toBeLessThanOrEqual(.001); });
    it('D protected bacteria persist despite long duration and mechanism', () => { const r = runDesign({ pot: 1, mech: 5, dur: 5, gentle: 1 }).representative; expect(r.resEnd / r.resStart).toBeLessThanOrEqual(.001); expect(r.resEnd).toBeGreaterThan(10); });
    it('all 435 affordable designs are finite, nonnegative and deterministic', () => { expect(designs).toHaveLength(435); for (const d of designs) {
        const r = runDesign(d);
        expect(Number.isInteger(r.recovered)).toBe(true);
        expect(r.recovered).toBeGreaterThanOrEqual(0);
        expect(r.recovered).toBeLessThanOrEqual(100);
        expect(r.representative.resEnd).toBeGreaterThanOrEqual(10);
        for (const point of r.representative.trace)
            for (const v of Object.values(point)) {
                expect(Number.isFinite(v)).toBe(true);
                expect(v).toBeGreaterThanOrEqual(0);
            }
        expect(runDesign(d)).toEqual(r);
    } }, 120000);
    it('halving dt changes recovery by at most two in 30 spread designs', () => { for (let i = 0; i < 30; i++) {
        const d = designs[Math.floor(i * (designs.length - 1) / 29)];
        expect(Math.abs(runDesign(d).recovered - runDesign(d, { ...params, dt: .025 }).recovered)).toBeLessThanOrEqual(2);
    } }, 30000);
    it('mechanism improvement is monotone with every other level fixed', () => { for (let pot = 1; pot <= 5; pot++)
        for (let dur = 1; dur <= 5; dur++) {
            let prev = Infinity;
            for (let mech = 1; mech <= 5; mech++) {
                const tr = simulate({ pot, mech, dur, gentle: 1 }), e = tr[72], n = e.R + e.Rq;
                expect(n).toBeLessThanOrEqual(prev);
                prev = n;
            }
        } });
    it('rejects all over-budget or invalid designs', () => { for (let pot = 1; pot <= 5; pot++)
        for (let mech = 1; mech <= 5; mech++)
            for (let dur = 1; dur <= 5; dur++)
                for (let gentle = 1; gentle <= 5; gentle++) {
                    const d = { pot, mech, dur, gentle };
                    expect(canAfford(d)).toBe(cost(d) <= 9);
                } for (const k of keys)
        for (const value of [0, 6, 1.5, NaN])
            expect(canAfford({ pot: 1, mech: 1, dur: 1, gentle: 1, [k]: value })).toBe(false); });
});
