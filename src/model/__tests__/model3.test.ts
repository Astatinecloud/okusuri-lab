import { describe, it, expect } from 'vitest';
import golden from './golden3.json';
import { Rng, patientTable, yearOutcome } from '../index';
describe('v3 Python golden', () => {
    it('mulberry32 seed 7', () => { const rng = new Rng(7); expect(golden.rngSeed7.map(() => rng.random())).toEqual(golden.rngSeed7); });
    for (const c of golden.cases)
        it(JSON.stringify(c.levels), () => {
            const tab = patientTable(c.levels);
            for (const k of ['cureS', 'cureR', 'okSE'] as const)
                expect(tab[k].map(Number)).toEqual(c[k]);
            tab.pEmerge.forEach((v, i) => expect(Math.abs(v - c.pEmerge[i]) / Math.max(c.pEmerge[i], 1e-300)).toBeLessThanOrEqual(1e-6));
            for (const run of c.runs) {
                const r = yearOutcome(c.levels, run.seed, tab);
                expect(r.recovered).toBe(run.recovered);
                expect(r.kinds.join('')).toBe(run.kinds);
                expect(r.community.emergences).toBe(run.emergences);
                r.community.months.forEach((m, i) => { for (const k of ['YS', 'YR', 'frac', 'emergences'] as const)
                    expect(Math.abs(m[k] - run.months[i][k])).toBeLessThanOrEqual(1e-9); });
            }
        }, 20000);
});
