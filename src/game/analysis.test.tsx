/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { analyzeDesign, comparisonDesign, compareDesigns, indicators } from './analysis';
import { keys, cost, canAfford, runDesign, killRates, params, type Design } from '../model';
import { populationChange, simulationNarration } from './presentation';
import { Chart, chartSeries, Germ } from '../ui/components/Visuals';
import { decode } from '../share';
const design: Design = { pot: 3, mech: 3, dur: 3, gentle: 3 };
describe('v2 causal analysis', () => {
    it('changes only the requested key, handles boundaries, and does not mutate input', () => {
        const before = { ...design };
        for (const key of keys) {
            for (const dir of [-1, 1]) {
                const d = comparisonDesign(design, key, dir)!;
                expect(d[key]).toBe(design[key] + dir);
                for (const k of keys.filter(k => k !== key))
                    expect(d[k]).toBe(design[k]);
            }
        }
        expect(comparisonDesign({ ...design, pot: 1 }, 'pot', -1)).toBeNull();
        expect(comparisonDesign({ ...design, pot: 5 }, 'pot', 1)).toBeNull();
        expect(design).toEqual(before);
    });
    it('returns exact runDesign differences and level-one baselines', () => {
        const a = analyzeDesign(design), now = runDesign(design);
        for (const key of keys) {
            const x = a.parameters[key];
            for (const [item, level] of [[x.minus1, 2], [x.baseline, 1]] as const) {
                expect(item).not.toBeNull();
                const d = { ...design, [key]: level };
                expect(item!.design).toEqual(d);
                const r = runDesign(d);
                expect(item!.result).toEqual(r);
                expect(item!.delta).toEqual({ recovered: now.recovered - r.recovered, seDrop: now.seDrop - r.seDrop, normFold: now.representative.normEnd / r.representative.normEnd, resFold: now.representative.resEnd / r.representative.resEnd, cost: (cost(design) - cost(d)) * 10 });
            }
        }
        const minimal = analyzeDesign({ pot: 1, mech: 1, dur: 1, gentle: 1 });
        for (const k of keys)
            {
                expect(minimal.parameters[k].minus1).toBeNull();
                expect(minimal.parameters[k].baseline).toBeNull();
                expect(minimal.parameters[k].plus1!.design[k]).toBe(2);
            }
    });
    it('is deterministic, supports over-budget reference designs and follows the dt mechanism grid', () => {
        const other = comparisonDesign(design, 'mech', 1)!;
        expect(compareDesigns(design, other)).toEqual(compareDesigns(design, other));
        expect(canAfford({ ...design, pot: 5 })).toBe(false);
        expect(compareDesigns(design, { ...design, pot: 5 }).result).toEqual(runDesign({ ...design, pot: 5 }));
        let s = 0, r = 0;
        const steps = Math.round(params.T / params.dt);
        for (let i = 0; i < steps; i++) {
            const k = killRates(i * params.dt, design);
            s += Number(k.kS > params.gS);
            r += Number(k.kR > params.gR);
        }
        expect(indicators(design)).toEqual({ timeAboveS: s / steps * 100, timeAboveR: r / steps * 100, se: runDesign(design).se });
        for (const h of [0, 11, 24, 48, 72]) {
            const k = killRates(h, design), text = simulationNarration(design, h);
            expect(text[0].includes('上回っています')).toBe(k.kS > params.gS);
            expect(text[1].includes('上回っています')).toBe(k.kR > params.gR);
        }
    });
    it('analyzes every affordable design and never formats a negative reduction percentage', () => {
        let n = 0;
        for (let pot = 1; pot <= 5; pot++)
            for (let mech = 1; mech <= 5; mech++)
                for (let dur = 1; dur <= 5; dur++)
                    for (let gentle = 1; gentle <= 5; gentle++) {
                        const d = { pot, mech, dur, gentle };
                        if (!canAfford(d))
                            continue;
                        n++;
                        const a = analyzeDesign(d);
                        for (const x of [a.indicators, ...keys.flatMap(k => [a.parameters[k].minus1?.indicators, a.parameters[k].baseline?.indicators]).filter(x => !!x)]) {
                            expect(x!.timeAboveS).toBeGreaterThanOrEqual(0);
                            expect(x!.timeAboveS).toBeLessThanOrEqual(100);
                            expect(x!.timeAboveR).toBeGreaterThanOrEqual(0);
                            expect(x!.timeAboveR).toBeLessThanOrEqual(100);
                        }
                        const v = a.current.representative;
                        for (const [start, end] of [[v.normStart, v.normEnd], [v.resStart, v.resEnd]])
                            expect(JSON.stringify(populationChange(start, end))).not.toMatch(/-\d+(?:\.\d+)?%/);
                    }
        expect(n).toBe(435);
    }, 300000);
});
it('plots trace sums without changing them, and distinguishes overlay line styles', () => {
    const trace = runDesign(design).representative.trace, before = JSON.stringify(trace), series = chartSeries(trace);
    trace.forEach((p, i) => expect(series[i]).toEqual({ t: p.t, s: p.S + p.Sq, r: p.R + p.Rq, q: p.Rq }));
    const html = renderToStaticMarkup(<Chart trace={trace} comparison={trace} showQ/>);
    expect(html).toContain('stroke-dasharray="10 6"');
    expect(html).toContain('stroke-dasharray="2 5"');
    expect(html).toContain('一時的耐性状態');
    expect(html).toContain('72');
    expect(JSON.stringify(trace)).toBe(before);
    expect(renderToStaticMarkup(<Germ res/>).match(/<circle/g)).toHaveLength(2);
    expect(renderToStaticMarkup(<Germ sleep/>)).toContain('stroke-dasharray="4 4"');
});
it('has no v1 terminology, corrupted literals, or random generation in user-facing sources', () => {
    const sources = import.meta.glob<string>(['../ui/**/*.tsx', '../config/game.ts', '../App.tsx', '../share/card.ts', './presentation.ts', './result.ts'], { query: '?raw', import: 'default', eager: true });
    for (const [file, s] of Object.entries(sources)) {
        expect(s, file).not.toMatch(/ばい菌|だよ|ふえちゃった|けんきゅうコイン|Math\.random|\?{3,}/);
    }
});
it('opens unversioned v1 share URLs and keeps their design and Japanese name', () => { expect(decode('#r=4323&n=%E3%81%BE%E3%82%82%E3%82%8A%E3%82%84%E3%81%B6%E3%82%8A')).toEqual({ design: { pot: 4, mech: 3, dur: 2, gentle: 3 }, name: 'まもりやぶり' }); });
