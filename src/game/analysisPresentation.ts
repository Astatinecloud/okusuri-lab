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

function timeTransition(before: number, after: number): string {
    return formatPercent(before) + ' → ' + formatPercent(after);
}

export function causalNarrative(key: Key, evidence: Evidence): string {
    const { before, after, beforeIndicators: low, afterIndicators: high, afterDesign } = evidence;
    const previous = before.representative;
    const current = after.representative;
    const interruptions = after.seDrop - before.seDrop;
    const expense = (cost(evidence.afterDesign) - cost(evidence.beforeDesign)) * 10;
    const tradeoff = '一方、研究開発費は +' + expense + ' pt、副作用で中断した患者は '
        + signed(interruptions) + '人でした。';
    switch (key) {
        case 'mech':
            return '薬剤耐性菌への作用を高めたことで、耐性菌に効かせるのに必要な濃度が下がり、耐性菌の最終数の変化は'
                + formatChange(previous.resEnd, current.resEnd) + 'でした。' + tradeoff;
        case 'pot': {
            const duration = high.timeAboveS > low.timeAboveS ? 'に伸びました。' : 'でした。';
            let narrative = '薬剤感受性菌への効果を高めたことで、薬が感受性菌の増殖を上回る時間は '
                + timeTransition(low.timeAboveS, high.timeAboveS) + duration;
            if (afterDesign.mech >= 3 && current.resEnd < previous.resEnd / 10) {
                narrative += '耐性菌への作用が十分なため、効果の向上が耐性菌にも及びました（耐性菌に必要な濃度＝EC50 × F）。';
            } else if (afterDesign.mech <= 2) {
                narrative += current.resEnd / previous.resEnd >= .98
                    ? '耐性菌への作用が低いため、耐性菌にはほとんど影響しませんでした。'
                    : '耐性菌への作用が低いため、耐性菌に必要な濃度は高いままです。';
            }
            return narrative;
        }
        case 'dur':
            return '作用持続時間を延ばしたことで、薬が増殖を上回る時間は感受性菌で '
                + timeTransition(low.timeAboveS, high.timeAboveS) + '、耐性菌で '
                + timeTransition(low.timeAboveR, high.timeAboveR) + 'になり、副作用で中断した患者は '
                + before.seDrop + '人 → ' + after.seDrop + '人（' + signed(interruptions) + '人）になりました。';
        case 'gentle':
            return '細菌数は変わりません。副作用で中断した患者が ' + before.seDrop + '人 → ' + after.seDrop + '人になりました。';
    }
}

export function evidenceNotes(evidence: Evidence, key: Key): string[] {
    const notes: string[] = [];
    const { before, after } = evidence;
    const normFold = after.representative.normEnd / before.representative.normEnd;
    const resFold = after.representative.resEnd / before.representative.resEnd;
    if (before.recovered === after.recovered) {
        const reason = Math.abs(normFold - 1) < .02 && Math.abs(resFold - 1) < .02
            ? '他の性能が律速しています。'
            : '細菌数の変化が回復判定の閾値を越えなかった、または副作用と相殺されたためです。';
        notes.push('この条件では回復数に差は出ませんでした。' + reason);
    }
    if (after.seDrop > before.seDrop) {
        notes.push('デメリット：副作用による中断が' + (after.seDrop - before.seDrop) + '人増えました。');
    }
    if (key === 'mech' && normFold >= 2) {
        notes.push('耐性菌が減ったことで、感受性菌が増殖できる余地が生まれました（競合の解放）。感受性菌への効果も必要です。');
    }
    return notes;
}

export const analysisCaveat = '各性能の効果は他の性能の設定に依存します（例：感受性菌への効果は、耐性菌への作用が十分なときにだけ耐性菌にも及びます）。1つずつ変えた比較なので、効果の合計は全体の差と一致しません。';

export function strongestSummary(analysis: Analysis): string {
    return analysis.strongest
        ? '特に効果が大きかったパラメータ：' + labels[analysis.strongest] + '（レベル1との差で評価）'
        : 'すべてレベル1のため比較対象がありません';
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
        difference: signed((before - after) / start * 100) + ' ポイント',
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
        counts('研究開発費（pt）', cost(comparison.design) * 10, cost(design) * 10),
    ];
}
