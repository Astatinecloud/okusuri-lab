import { cost, params, type Design, type Result } from '../model';
import { labels } from '../config/game';
import { type Analysis, type Key, type Comparison } from './analysis';
import { formatChange, formatNumber, formatPercent, formatScalar, populationChange } from './presentation';

type Indicators = Analysis['indicators'];
export type Evidence = {
    beforeDesign: Design;
    afterDesign: Design;
    before: Result;
    after: Result;
    beforeIndicators: Indicators;
    afterIndicators: Indicators;
    preview: boolean;
};

/** All prose describes the lower level -> higher level, including upward previews. */
export function parameterEvidence(design: Design, key: Key, analysis: Analysis): Evidence {
    const parameter = analysis.parameters[key];
    if (parameter.minus1) {
        return {
            beforeDesign: parameter.minus1.design,
            afterDesign: design,
            before: parameter.minus1.result,
            after: analysis.current,
            beforeIndicators: parameter.minus1.indicators,
            afterIndicators: analysis.indicators,
            preview: false,
        };
    }
    const next = parameter.plus1!;
    return {
        beforeDesign: design,
        afterDesign: next.design,
        before: analysis.current,
        after: next.result,
        beforeIndicators: analysis.indicators,
        afterIndicators: next.indicators,
        preview: true,
    };
}

export function signed(value: number): string {
    return (value > 0 ? '+' : value < 0 ? '−' : '±') + formatScalar(Math.abs(value));
}

export function internalTransition(key: Key, before: number, after: number): string {
    const from = before - 1;
    const to = after - 1;
    switch (key) {
        case 'pot': return 'EC50：' + params.ec50S[from] + ' → ' + params.ec50S[to] + '（低いほど少ない濃度で効く）';
        case 'mech': return '耐性による必要濃度の倍率 F：' + params.resistFold[from] + ' → ' + params.resistFold[to] + ' 倍';
        case 'dur': return '半減期：' + params.halfLife[from] + ' → ' + params.halfLife[to] + ' 時間';
        case 'gentle': return '副作用係数：×' + params.seGentle[from] + ' → ×' + params.seGentle[to];
    }
}

/** Match the verb to the unrounded change; hypothetical examples use present/future tense. */
export function timeExplanation(subject: string, before: number, after: number, preview: boolean): string {
    const transition = formatPercent(before) + ' → ' + formatPercent(after);
    if (after > before) return subject + 'は ' + transition + (preview ? ' に伸びます。' : ' に伸びました。');
    if (after < before) return subject + 'は ' + transition + (preview ? ' に短くなります。' : ' に短くなりました。');
    if (before === 100) {
        return subject + 'はすでに 100% に達しているため、この指標は' + (preview ? '変わりません。' : '変わりませんでした。');
    }
    if (before === 0) return subject + 'は 0% のまま' + (preview ? 'です。' : 'でした。');
    return subject + 'は ' + formatPercent(before) + (preview ? ' のまま変わりません。' : ' のまま変わりませんでした。');
}

function resistantPopulationExplanation(evidence: Evidence): string {
    const before = evidence.before.representative.resEnd;
    const after = evidence.after.representative.resEnd;
    const change = formatChange(before, after);
    if (change === 'ほぼ変化なし') {
        return '耐性菌の最終数はほぼ' + (evidence.preview ? '変わりません。' : '変わりませんでした。');
    }
    if (after < before) return '耐性菌の最終数が' + change + (evidence.preview ? 'になります。' : 'になりました。');
    return '耐性菌の最終数が' + change + (evidence.preview ? 'します。' : 'しました。');
}

export function causalNarrative(key: Key, evidence: Evidence): string {
    const { before, after, beforeIndicators: low, afterIndicators: high, afterDesign, preview } = evidence;
    const previous = before.representative;
    const current = after.representative;
    const interruptions = after.seDrop - before.seDrop;
    const expense = cost(evidence.afterDesign) - cost(evidence.beforeDesign);
    const recovery = preview ? '回復患者は ' + before.recovered + '人 → ' + after.recovered + '人になります。' : '';
    const tradeoff = '一方、研究コインは +' + expense + '枚、副作用で中断した患者は '
        + signed(interruptions) + (preview ? '人の変化になります。' : '人でした。');
    const increased = preview ? 'を1段階高めると、' : 'を高めたことで、';
    switch (key) {
        case 'mech':
            return '薬剤耐性菌への作用' + increased + '耐性菌に効かせるのに必要な濃度が下がり、'
                + resistantPopulationExplanation(evidence) + recovery + tradeoff;
        case 'pot': {
            let narrative = '薬剤感受性菌への効果' + increased
                + timeExplanation('薬が感受性菌の増殖を上回る時間', low.timeAboveS, high.timeAboveS, preview);
            if (afterDesign.mech >= 3 && current.resEnd < previous.resEnd / 10) {
                narrative += '耐性菌への作用が十分なため、効果の向上が耐性菌にも'
                    + (preview ? '及びます' : '及びました') + '（耐性菌に必要な濃度＝EC50 × F）。';
            } else if (afterDesign.mech <= 2) {
                narrative += current.resEnd / previous.resEnd >= .95
                    ? '耐性菌への作用が低いため、耐性菌にはほとんど' + (preview ? '影響しません。' : '影響しませんでした。')
                    : '耐性菌への作用が低いため、耐性菌に必要な濃度は高いままです。';
            }
            return narrative + recovery;
        }
        case 'dur':
            return '作用持続時間' + (preview ? 'を1段階延ばすと、' : 'を延ばしたことで、')
                + timeExplanation('薬が感受性菌の増殖を上回る時間', low.timeAboveS, high.timeAboveS, preview)
                + timeExplanation('薬が耐性菌の増殖を上回る時間', low.timeAboveR, high.timeAboveR, preview)
                + '副作用で中断した患者は ' + before.seDrop + '人 → ' + after.seDrop + '人（' + signed(interruptions) + '人）'
                + (preview ? 'になります。' : 'になりました。') + recovery;
        case 'gentle':
            return '安全性' + increased + '細菌数は変わりません。副作用で中断した患者が '
                + before.seDrop + '人 → ' + after.seDrop + '人' + (preview ? 'になります。' : 'になりました。') + recovery;
    }
}

export function evidenceNotes(evidence: Evidence, key: Key): string[] {
    const notes: string[] = [];
    const { before, after, preview } = evidence;
    const normFold = after.representative.normEnd / before.representative.normEnd;
    const resFold = after.representative.resEnd / before.representative.resEnd;
    if (before.recovered === after.recovered) {
        const reason = Math.abs(normFold - 1) < .05 && Math.abs(resFold - 1) < .05
            ? '他の性能が律速しています。'
            : '細菌数の変化が回復判定の閾値を越えないか、副作用と相殺されるためです。';
        notes.push((preview ? 'この条件では回復数に差は出ません。' : 'この条件では回復数に差は出ませんでした。') + reason);
    }
    if (after.seDrop > before.seDrop) {
        notes.push('デメリット：副作用による中断が' + (after.seDrop - before.seDrop) + (preview ? '人増えます。' : '人増えました。'));
    }
    if (key === 'mech' && normFold >= 2) {
        notes.push(preview
            ? '耐性菌が減ることで、感受性菌が増殖できる余地が生まれます（競合の解放）。感受性菌への効果も必要です。'
            : '耐性菌が減ったことで、感受性菌が増殖できる余地が生まれました（競合の解放）。感受性菌への効果も必要です。');
    }
    return notes;
}

export const analysisCaveat = '各性能の効果は他の性能の設定に依存します（例：感受性菌への効果は、耐性菌への作用が十分なときにだけ耐性菌にも及びます）。1つずつ変えた比較なので、効果の合計は全体の差と一致しません。';

export function strongestSummary(analysis: Analysis): string {
    if (analysis.strongest) {
        return '特に効果が大きかったパラメータ：' + labels[analysis.strongest] + '（レベル1との差で評価）';
    }
    const hasBaseline = Object.values(analysis.parameters).some(parameter => parameter.baseline !== null);
    return hasBaseline
        ? 'この設計では、どの性能もレベル1と比べて回復数を増やしていません。'
        : 'すべてレベル1のため比較対象がありません';
}

export function nextStepHint(analysis: Analysis): string {
    const step = analysis.nextStep;
    if (!step) return '次の一手：どの性能を1段階上げても回復数は増えません。別の性能を下げる組み合わせも検討してください。';
    const reference = step.affordable
        ? '研究コインの範囲内です。予算の配分を変える場合は、他の性能を下げる必要も考慮してください。'
        : '参考：研究コインが足りない設計です。実際に設計するには、他の性能を下げて研究コインを確保する必要があります。';
    return '次の一手：次に1段階上げると最も回復数が増えるのは〈' + labels[step.key] + '〉（+'
        + step.gain + '人：' + analysis.current.recovered + '人 → ' + step.comparison.result.recovered + '人）。' + reference;
}

export type ComparisonRow = { label: string; comparison: string; current: string; difference: string };

export function comparisonRows(design: Design, analysis: Analysis, comparison: Comparison): ComparisonRow[] {
    const now = analysis.current;
    const other = comparison.result;
    const current = now.representative;
    const previous = other.representative;
    const counts = (label: string, before: number, after: number): ComparisonRow => ({
        label, comparison: String(before), current: String(after), difference: signed(after - before),
    });
    const population = (label: string, before: number, after: number): ComparisonRow => ({
        label, comparison: formatNumber(before), current: formatNumber(after), difference: formatChange(before, after),
    });
    const reduction = (label: string, start: number, before: number, after: number): ComparisonRow => ({
        label,
        comparison: populationChange(start, before).fold,
        current: populationChange(start, after).fold,
        difference: reductionDifference(start, before, after),
    });
    const time = (label: string, before: number, after: number): ComparisonRow => ({
        label, comparison: formatPercent(before), current: formatPercent(after),
        difference: signed(after - before) + ' ポイント',
    });
    return [
        counts('回復した患者数', other.recovered, now.recovered),
        counts('感染が残存', 100 - other.recovered - other.seDrop, 100 - now.recovered - now.seDrop),
        counts('副作用で中断', other.seDrop, now.seDrop),
        population('感受性菌の最終数', previous.normEnd, current.normEnd),
        population('耐性菌の最終数', previous.resEnd, current.resEnd),
        reduction('感受性菌の減少率', current.normStart, previous.normEnd, current.normEnd),
        reduction('耐性菌の減少率', current.resStart, previous.resEnd, current.resEnd),
        time('増殖を上回る時間・感受性菌', comparison.indicators.timeAboveS, analysis.indicators.timeAboveS),
        time('増殖を上回る時間・耐性菌', comparison.indicators.timeAboveR, analysis.indicators.timeAboveR),
        counts('研究コイン（枚）', cost(comparison.design), cost(design)),
    ];
}

/** Difference of two reduction rates in percentage points; increases are compared via final counts instead. */
export function reductionDifference(start: number, before: number, after: number): string {
    if (before > start || after > start) return '最終数の行を参照';
    const points = (before - after) / start * 100;
    if (Math.abs(points) < 0.005) return 'ほぼ変化なし';
    return (points > 0 ? '+' : '−') + Math.abs(points).toFixed(2) + ' ポイント';
}
