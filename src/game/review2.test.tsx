import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { keys, type Design } from '../model';
import { analyzeDesign, cachedRun, compareDesigns } from './analysis';
import { formatChange, formatNumber, formatPercent } from './presentation';
import { analysisCaveat, causalNarrative, comparisonRows, evidenceNotes, internalTransition, parameterEvidence, strongestSummary, type Evidence } from './analysisPresentation';
import { PerformanceSetting } from '../ui/components/PerformanceSetting';
import { PerformanceAnalysis } from '../ui/components/PerformanceAnalysis';
import { BacteriaCard } from '../ui/components/BacteriaCard';
import { Glossary, Info } from '../ui/components/Info';
import { labels } from '../config/game';

const minimum: Design = { pot: 1, mech: 1, dur: 1, gentle: 1 };

/** Explicit rule-selection fixtures; integration assertions below use real model outputs. */
function evidenceFixture(): Evidence {
    const result = cachedRun(minimum);
    return {
        beforeDesign: { ...minimum },
        afterDesign: { ...minimum },
        before: { ...result, representative: { ...result.representative } },
        after: { ...result, representative: { ...result.representative } },
        beforeIndicators: { timeAboveS: 20, timeAboveR: 0, se: 1 },
        afterIndicators: { timeAboveS: 40, timeAboveR: 10, se: 1.05 },
        preview: false,
    };
}

describe('review 2 formatting', () => {
    it.each([
        [252307.98, '約25.2万個'],
        [796168986.81, '約7.96億個'],
        [53.97, '約54個'],
        [12500, '約1.25万個'],
    ])('formats population %i with at most three significant digits', (value, expected) => {
        expect(formatNumber(value as number)).toBe(expected);
    });

    it.each([
        [1e-7, '約1,000万分の1'],
        [.5, '約2分の1'],
        [.99, 'ほぼ変化なし'],
        [1, 'ほぼ変化なし'],
        [1.5, '約1.5倍に増加'],
        [7961, '約7,960倍に増加'],
    ])('formats fold ratio %s without a zero multiplier', (ratio, expected) => {
        expect(formatChange(1, ratio as number)).toBe(expected);
    });

    it('uses one decimal for time percentages and numeric percentage-point differences', () => {
        expect(formatPercent(53.97)).toBe('54.0%');
        const design = { pot: 3, mech: 4, dur: 1, gentle: 5 };
        const analysis = analyzeDesign(design);
        const comparison = compareDesigns(design, { ...design, pot: 2 });
        const rows = comparisonRows(design, analysis, comparison);
        for (const row of rows.filter(row => row.label.includes('最終数'))) {
            expect(row.current).toBe(formatNumber(row.label.startsWith('感受性')
                ? analysis.current.representative.normEnd : analysis.current.representative.resEnd));
            expect(row.current).not.toMatch(/\d,\d{3}\.\d/);
        }
        for (const row of rows.filter(row => row.label.includes('減少率'))) {
            expect(row.difference).toMatch(/ポイント|ほぼ変化なし|最終数の行を参照/);
            expect(row.difference).not.toContain('→');
        }
        const normal = rows.find(row => row.label === '感受性菌の減少率')!;
        const difference = (comparison.result.representative.normEnd - analysis.current.representative.normEnd)
            / analysis.current.representative.normStart * 100;
        expect(normal.difference.startsWith(difference > 0 ? '+' : difference < 0 ? '−' : '±')).toBe(true);
    });

    it('shows a reduction only once in each population card', () => {
        const html = renderToStaticMarkup(<BacteriaCard resistant={false} start={10000} end={4} />);
        expect(html.match(/%/g)).toHaveLength(1);
        expect(html).not.toContain('減少割合');
    });

    it.each([
        ['pot', 2, 3, 'EC50：2.2 → 1.5（低いほど少ない濃度で効く）'],
        ['mech', 3, 4, '耐性による必要濃度の倍率 F：3 → 1.6 倍'],
        ['dur', 2, 3, '半減期：4.5 → 6.5 時間'],
        ['gentle', 4, 5, '副作用係数：×0.47 → ×0.35'],
    ] as const)('writes the %s internal-value label once', (key, before, after, expected) => {
        expect(internalTransition(key, before, after)).toBe(expected);
    });
});

describe('review 2 causal rules', () => {
    it('explains mechanism changes and their actual expense and dropout deltas', () => {
        const evidence = evidenceFixture();
        evidence.afterDesign.mech = 2;
        evidence.after.representative.resEnd = evidence.before.representative.resEnd / 2;
        evidence.after.seDrop += 3;
        const narrative = causalNarrative('mech', evidence);
        expect(narrative).toContain('必要な濃度が下がり');
        expect(narrative).toContain('約2分の1');
        expect(narrative).toContain('+1枚');
        expect(narrative).toContain('+3人');
    });

    it('selects the adequate-mechanism and low-mechanism potency explanations', () => {
        const evidence = evidenceFixture();
        evidence.afterDesign = { ...minimum, pot: 2, mech: 3 };
        evidence.beforeDesign.mech = 3;
        evidence.after.representative.resEnd = evidence.before.representative.resEnd / 100;
        const adequate = causalNarrative('pot', evidence);
        expect(adequate).toContain('20.0% → 40.0%');
        expect(adequate).toContain('に伸びました');
        expect(adequate).toContain('EC50 × F');
        evidence.afterDesign.mech = 1;
        evidence.after.representative.resEnd = evidence.before.representative.resEnd;
        expect(causalNarrative('pot', evidence)).toContain('耐性菌にはほとんど影響しませんでした');
        evidence.afterIndicators.timeAboveS = 20;
        expect(causalNarrative('pot', evidence)).not.toContain('に伸びました');
    });

    it('explains duration using both time windows and interruption changes', () => {
        const evidence = evidenceFixture();
        evidence.afterDesign.dur = 2;
        evidence.after.seDrop += 7;
        const narrative = causalNarrative('dur', evidence);
        expect(narrative).toContain('感受性菌の増殖を上回る時間は 20.0% → 40.0%');
        expect(narrative).toContain('耐性菌の増殖を上回る時間は 0.0% → 10.0%');
        expect(narrative).toContain('+7人');
    });

    it('explains safety without claiming a bacterial change, and explains zero recovery difference', () => {
        const evidence = evidenceFixture();
        evidence.afterDesign.gentle = 2;
        evidence.after.seDrop -= 5;
        expect(causalNarrative('gentle', evidence)).toContain('細菌数は変わりません');
        expect(causalNarrative('gentle', evidence)).toContain(evidence.before.seDrop + '人 → ' + evidence.after.seDrop + '人');
        expect(evidenceNotes(evidence, 'gentle').join('')).toContain('他の性能が律速');
        evidence.after.representative.normEnd /= 100;
        expect(evidenceNotes(evidence, 'pot').join('')).toContain('回復判定の閾値');
    });

    it('uses real model changes for competitive release and additional interruption warnings', () => {
        const design = { pot: 1, mech: 5, dur: 1, gentle: 1 };
        const evidence = parameterEvidence(design, 'mech', analyzeDesign(design));
        expect(evidence.after.representative.normEnd / evidence.before.representative.normEnd).toBeGreaterThan(2);
        expect(evidenceNotes(evidence, 'mech').join('')).toContain('競合の解放');
        const duration = { pot: 3, mech: 3, dur: 3, gentle: 1 };
        const durationEvidence = parameterEvidence(duration, 'dur', analyzeDesign(duration));
        expect(evidenceNotes(durationEvidence, 'dur').join('')).toContain('副作用による中断');
    });

    it('handles all-level-one analysis and offers evidence for each upward preview', () => {
        const analysis = analyzeDesign(minimum);
        expect(analysis.strongest).toBeNull();
        expect(strongestSummary(analysis)).toBe('すべてレベル1のため比較対象がありません');
        const html = renderToStaticMarkup(<PerformanceAnalysis design={minimum} analysis={analysis} />);
        expect(html).toContain('効果の合計は全体の差と一致しません');
        expect(html).toContain(analysisCaveat);
        expect(html.match(/レベル1 → 2 に上げた場合/g)).toHaveLength(4);
        for (const key of keys) {
            const evidence = parameterEvidence(minimum, key, analysis);
            expect(evidence.beforeDesign).toEqual(minimum);
            expect(evidence.afterDesign).toEqual({ ...minimum, [key]: 2 });
            expect(evidence.after).toEqual(cachedRun(evidence.afterDesign));
        }
    });

    it('marks over-budget upward evidence as a reference', () => {
        const design = { pot: 1, mech: 5, dur: 2, gentle: 5 };
        const html = renderToStaticMarkup(<PerformanceAnalysis design={design} analysis={analyzeDesign(design)} />);
        expect(html).toContain('参考：研究コインが足りない設計');
    });
});

describe('review 2 accessibility', () => {
    it('labels every level with the parameter and marks locked levels', () => {
        const design = { pot: 3, mech: 4, dur: 1, gentle: 5 };
        for (const key of keys) {
            const html = renderToStaticMarkup(<PerformanceSetting attribute={key} design={design} change={() => {}} />);
            for (let level = 1; level <= 5; level++) {
                const locked = level > design[key];
                const name = labels[key] + ' レベル' + level + (locked ? '（研究コインが不足）' : '');
                expect(html).toContain('aria-label="' + name + '"');
            }
            expect(html).toContain('aria-pressed="true"');
        }
    });

    it('uses one glossary disclosure with a definition list and labeled inline buttons', () => {
        const glossary = renderToStaticMarkup(<Glossary />);
        expect(glossary.match(/<summary/g)).toHaveLength(1);
        expect(glossary).toContain('用語集');
        expect(glossary).toContain('<dl>');
        expect(glossary).toContain('<dt>');
        expect(glossary).toContain('<dd>');
        const inline = renderToStaticMarkup(<Info term="EC50" />);
        expect(inline).toContain('<button');
        expect(inline).toContain('aria-label="EC50の説明"');
        expect(inline).toContain('aria-expanded="false"');
    });
});
