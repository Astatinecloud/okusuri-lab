import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { keys, canAfford, type Design } from '../model';
import { analyzeDesign, cachedRun, prepareAnalysis } from './analysis';
import { causalNarrative, evidenceNotes, nextStepHint, parameterEvidence, strongestSummary, timeExplanation } from './analysisPresentation';
import { formatChange } from './presentation';
import { PerformanceAnalysis } from '../ui/components/PerformanceAnalysis';
import { labels } from '../config/game';

const minimum: Design = { pot: 1, mech: 1, dur: 1, gentle: 1 };

describe('review 3 conditional analysis', () => {
    it('uses conditional language and actual recovery transitions for every level-one preview', () => {
        const analysis = analyzeDesign(minimum);
        for (const key of keys) {
            const evidence = parameterEvidence(minimum, key, analysis);
            const narrative = causalNarrative(key, evidence);
            expect(evidence.preview).toBe(true);
            expect(narrative).toContain('と、');
            expect(narrative).not.toMatch(/たことで|でした|ました/);
            expect(narrative).toContain('回復患者は ' + evidence.before.recovered + '人 → ' + evidence.after.recovered + '人になります');
            expect(evidenceNotes(evidence, key).join('')).not.toMatch(/たことで|でした|ました/);
        }
    });

    it('keeps past tense and natural reciprocal wording for completed mechanism comparisons', () => {
        const design = { pot: 3, mech: 4, dur: 1, gentle: 5 };
        const evidence = parameterEvidence(design, 'mech', analyzeDesign(design));
        const narrative = causalNarrative('mech', evidence);
        expect(narrative).toContain('高めたことで');
        expect(narrative).toContain('耐性菌の最終数が');
        expect(narrative).toContain('分の1になりました');
        expect(narrative).not.toContain('最終数の変化は');
    });

    it.each([false, true])('chooses increasing, decreasing, saturated and unchanged time verbs (preview=%s)', preview => {
        const increasing = timeExplanation('時間', 20, 40, preview);
        const decreasing = timeExplanation('時間', 40, 20, preview);
        const saturated = timeExplanation('時間', 100, 100, preview);
        const zero = timeExplanation('時間', 0, 0, preview);
        const unchanged = timeExplanation('時間', 40, 40, preview);
        expect(increasing).toContain(preview ? '伸びます' : '伸びました');
        expect(decreasing).toContain(preview ? '短くなります' : '短くなりました');
        expect(saturated).toContain('すでに 100% に達しているため');
        expect(saturated).toContain(preview ? '変わりません。' : '変わりませんでした。');
        expect(zero).toContain(preview ? '0% のままです' : '0% のままでした');
        expect(unchanged).toContain(preview ? '変わりません。' : '変わりませんでした。');
        for (const value of [saturated, zero, unchanged]) expect(value).not.toContain('伸び');
    });

    it('uses the no-change rule in the actual duration narrative at a saturated or zero time window', () => {
        const design = { pot: 5, mech: 1, dur: 2, gentle: 2 };
        const analysis = analyzeDesign(design);
        const evidence = parameterEvidence(design, 'dur', analysis);
        const narrative = causalNarrative('dur', evidence);
        for (const key of ['timeAboveS', 'timeAboveR'] as const) {
            if (evidence.beforeIndicators[key] === evidence.afterIndicators[key]) {
                const expected = evidence.beforeIndicators[key] === 0 ? '0% のままでした' : '変わりませんでした';
                expect(narrative).toContain(expected);
            }
        }
    });
});

describe('review 3 strongest parameter and next step', () => {
    it('does not name a strongest parameter when all recovery gains are nonpositive', () => {
        const design = { pot: 1, mech: 5, dur: 1, gentle: 4 };
        const analysis = analyzeDesign(design);
        const gains = keys.flatMap(key => analysis.parameters[key].baseline?.delta.recovered ?? []);
        expect(Math.max(...gains)).toBeLessThanOrEqual(0);
        expect(analysis.strongest).toBeNull();
        const summary = strongestSummary(analysis);
        expect(summary).toBe('この設計では、どの性能もレベル1と比べて回復数を増やしていません。');
        for (const label of Object.values(labels)) expect(summary).not.toContain(label);
    });

    it('selects the true maximum one-step gain: mechanism gives 8 -> 45 (+37)', () => {
        const design = { pot: 5, mech: 1, dur: 2, gentle: 2 };
        const analysis = analyzeDesign(design);
        expect(analysis.current.recovered).toBe(8);
        expect(analysis.nextStep?.key).toBe('mech');
        expect(analysis.nextStep?.gain).toBe(37);
        expect(analysis.nextStep?.comparison.result.recovered).toBe(45);
        const gains = keys.filter(key => design[key] < 5).map(key =>
            cachedRun({ ...design, [key]: design[key] + 1 }).recovered - analysis.current.recovered);
        expect(analysis.nextStep?.gain).toBe(Math.max(...gains));
        const hint = nextStepHint(analysis);
        expect(hint).toContain('薬剤耐性菌への作用');
        expect(hint).toContain('+37人');
        expect(hint).toContain('8人 → 45人');
        expect(hint).toContain('他の性能を下げる');
        const html = renderToStaticMarkup(<PerformanceAnalysis design={design} analysis={analysis} />);
        expect(html.indexOf('class="next-step"')).toBeGreaterThan(html.indexOf('class="highlight"'));
        expect(html.indexOf('class="next-step"')).toBeLessThan(html.indexOf('class="analysis-card"'));
    });

    it('prepares every upward candidate with the shared cache and labels over-budget advice', async () => {
        const design = { pot: 5, mech: 1, dur: 2, gentle: 5 };
        const analysis = await prepareAnalysis(design);
        for (const key of keys) {
            const comparison = analysis.parameters[key].plus1;
            if (design[key] === 5) {
                expect(comparison).toBeNull();
            } else {
                expect(comparison!.design).toEqual({ ...design, [key]: design[key] + 1 });
                expect(comparison!.result).toBe(cachedRun(comparison!.design));
            }
        }
        expect(analysis.nextStep).not.toBeNull();
        expect(canAfford(analysis.nextStep!.comparison.design)).toBe(false);
        expect(analysis.nextStep!.affordable).toBe(false);
        expect(nextStepHint(analysis)).toContain('参考：研究コインが足りない設計');
        expect(nextStepHint(analysis)).toContain('他の性能を下げて');
    });

    it('explains when no upward change increases recovery and when all parameters are at the ceiling', () => {
        const analysis = analyzeDesign(minimum);
        expect(analysis.nextStep).toBeNull();
        expect(nextStepHint(analysis)).toContain('どの性能を1段階上げても回復数は増えません');
        const ceiling = analyzeDesign({ pot: 5, mech: 5, dur: 5, gentle: 5 });
        expect(ceiling.nextStep).toBeNull();
        for (const key of keys) expect(ceiling.parameters[key].plus1).toBeNull();
    });
});

describe('review 3 five-percent change band', () => {
    it.each([.95, .96, .98, 1, 1.02, 1.04, 1.05])('treats ratio %s as almost unchanged', ratio => {
        expect(formatChange(100, ratio * 100)).toBe('ほぼ変化なし');
    });

    it.each([.949, 1.051])('keeps ratio %s outside the unchanged band', ratio => {
        expect(formatChange(100, ratio * 100)).not.toBe('ほぼ変化なし');
    });
});

import { formatPercent as formatPercentFinal } from './presentation';
describe('formatPercent never implies elimination', () => {
    it('keeps sub-100 reductions below 100%', () => {
        expect(formatPercentFinal(99.9646)).toBe('99.96%');
        expect(formatPercentFinal(99.99999)).toBe('99.99%超');
        expect(formatPercentFinal(100)).toBe('100%');
        expect(formatPercentFinal(42.04)).toBe('42.0%');
    });
});

import { reductionDifference } from './analysisPresentation';
describe('reduction-rate difference', () => {
    it('is readable for tiny, normal and increasing cases', () => {
        expect(reductionDifference(1e8, 4.1e4, 4.0e4)).toBe('ほぼ変化なし');
        expect(reductionDifference(1e5, 5e4, 1e3)).toBe('+49.00 ポイント');
        expect(reductionDifference(1e5, 8e8, 54)).toBe('最終数の行を参照');
    });
});
