import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { canAfford, params, simulate, runDesign, type Design } from '../model';
import { rank, comments, badge } from './result';
import { barrierEffect, chartTicks, chartY, formatNumber, populationChange, residualMessage, simulationNarration, wrapJapanese } from './presentation';
import { Chart } from '../ui/components/Visuals';
import { PatientIcon, PatientLegend } from '../ui/components/PatientIcon';
import { BacteriaCard } from '../ui/components/BacteriaCard';

describe('result text', () => {
    it.each([[0, 1], [29, 1], [30, 2], [59, 2], [60, 3], [79, 3], [80, 4], [94, 4], [95, 5], [100, 5]])('ranks %i recovered with %i stars', (recovered, stars) => {
        expect(rank(recovered).stars).toBe(stars);
    });

    it('formats approximate counts and changes without negative percentages', () => {
        expect(formatNumber(1e8)).toBe('約1億個');
        expect(formatNumber(12500)).toBe('約1.25万個');
        expect(formatNumber(35.2)).toBe('約35個');
        expect(populationChange(10000, 1)).toEqual({ fold: '100% 減少', detail: '減少割合 100%' });
        expect(populationChange(100, 200)).toEqual({ fold: '約2倍に増加', detail: '増加' });
        expect(populationChange(100, 100).detail).toBe('変化なし');
    });

    it('chooses the three residual messages at the 99% reduction boundary', () => {
        expect(residualMessage(100, 101)).toContain('増加');
        expect(residualMessage(100, 1.01)).toContain('耐性菌が残存');
        expect(residualMessage(100, 1)).toContain('少数');
        expect(residualMessage(100, .5)).toContain('少数');
    });

    it('places the matching residual text inside only the resistant card', () => {
        for (const end of [200, 20, 1]) {
            const resistant = renderToStaticMarkup(<BacteriaCard resistant start={100} end={end} />);
            expect(resistant).toContain(residualMessage(100, end));
            expect(resistant).toMatch(/<section[\s\S]*class="remain"[\s\S]*<\/section>/);
            const normal = renderToStaticMarkup(<BacteriaCard resistant={false} start={100} end={end} />);
            expect(normal).not.toContain('class="remain"');
        }
    });

    it('retains comment priorities and savings badge conditions', () => {
        const design = { pot: 5, mech: 1, dur: 2, gentle: 2 };
        const result = runDesign(design);
        expect(comments(design, result)[0]).toContain('回復した患者');
        expect(comments(design, result).at(-1)).toContain('性能分析');
        expect(badge({ pot: 1, mech: 1, dur: 1, gentle: 1 }, { ...result, recovered: 80 })).toBe(true);
        expect(badge({ pot: 5, mech: 5, dur: 2, gentle: 1 }, { ...result, recovered: 80 })).toBe(false);
    });

    it('produces no negative percentage and keeps every trace point in the chart for all 435 designs', () => {
        let count = 0;
        for (let pot = 1; pot <= 5; pot++) {
            for (let mech = 1; mech <= 5; mech++) {
                for (let dur = 1; dur <= 5; dur++) {
                    for (let gentle = 1; gentle <= 5; gentle++) {
                        const design: Design = { pot, mech, dur, gentle };
                        if (!canAfford(design)) continue;
                        count++;
                        const trace = simulate(design);
                        const end = trace.at(-1)!;
                        for (const [start, finish] of [[params.S0, end.S + end.Sq], [10 ** params.repLog10R0, end.R + end.Rq]]) {
                            const change = populationChange(start, finish);
                            expect(change.detail).not.toMatch(/-\d/);
                            expect(change.detail.includes('%')).toBe(finish < start);
                        }
                        expect(trace.every(point => [point.S + point.Sq, point.R + point.Rq].every(value => chartY(value) >= 30 && chartY(value) <= 210))).toBe(true);
                    }
                }
            }
        }
        expect(count).toBe(435);
    });
});

describe('simulation presentation', () => {
    it('has a 10億 tick and projects raw trace values without clamping them', () => {
        expect(chartTicks.at(-1)).toEqual({ value: 1e9, label: '10億' });
        expect(chartY(1)).toBe(210);
        expect(chartY(1e9)).toBe(30);
        const trace = [{ t: 0, S: 1e8, Sq: 0, R: 9e8, Rq: 1e7 }];
        const original = JSON.stringify(trace);
        const svg = renderToStaticMarkup(<Chart trace={trace} />);
        expect(svg).toContain('10億');
        expect(svg).toContain(`M55,${chartY(9.1e8)}`);
        expect(JSON.stringify(trace)).toBe(original);
    });

    it('matches mechanism narration and effects across the level 2/3 boundary and all three days', () => {
        const low = { pot: 3, mech: 2, dur: 3, gentle: 3 };
        const high = { ...low, mech: 3 };
        for (const hour of [0, 24, 48]) {
            expect(simulationNarration(low, hour)[1]).toContain('耐性菌');
            expect(simulationNarration(high, hour)[1]).toContain('耐性菌');
            expect(barrierEffect(low, hour).kind).toBe('bounce');
            expect(barrierEffect(high, hour).kind).toBe('pass');
        }
        expect(simulationNarration(low, 0)[0]).toContain('感受性菌');
        expect(simulationNarration(high, 48)[0]).toContain('感受性菌');
        expect(barrierEffect(high, 0).duration).toBeLessThan(barrierEffect(high, 11).duration);
    });

    it('renders small outcome squares with distinct symbols and matching legend', () => {
        const icons = (['well','ill','side'] as const).map(status => renderToStaticMarkup(<PatientIcon status={status}/>));
        for (const icon of icons) { expect(icon).toContain('aria-hidden="true"'); expect(icon).not.toContain('<svg'); }
        expect(icons[0]).toContain('＋'); expect(icons[1]).toContain('・'); expect(icons[2]).toContain('×');
        expect(renderToStaticMarkup(<PatientLegend/>).match(/patient-icon/g)).toHaveLength(3);
    });
});

describe('canvas Japanese wrapping', () => {
    it.each(['！', '、', '。', '？'])('does not start a line with %s', punctuation => {
        const original = `あいう${punctuation}えおか${punctuation}きく`;
        const lines = wrapJapanese(original, 3, value => Array.from(value).length);
        expect(lines.join('')).toBe(original);
        expect(lines.every(line => !/^[！、。？]/.test(line))).toBe(true);
    });
});
