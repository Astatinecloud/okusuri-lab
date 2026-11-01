import { killRates, params, type Design } from '../model';
export function formatNumber(n: number): string {
    const format = (value: number) => value.toLocaleString('ja', { maximumFractionDigits: 2 });
    if (n >= 1e8)
        return `約${format(n / 1e8)}億個`;
    if (n >= 1e4)
        return `約${format(n / 1e4)}万個`;
    return `約${Math.round(n).toLocaleString('ja')}個`;
}
export function populationChange(start: number, end: number) { if (end < start)
    return { fold: ((1 - end / start) * 100).toFixed(2) + '% 減少', detail: '減少割合 ' + ((1 - end / start) * 100).toFixed(2) + '%' }; if (end > start)
    return { fold: '約' + (end / start).toLocaleString('ja', { maximumFractionDigits: 1 }) + '倍に増加', detail: '増加' }; return { fold: '変化なし', detail: '変化なし' }; }
export function residualMessage(start: number, end: number): string { return end > start ? '耐性菌が増加しています。耐性菌への作用を確認してください。' : end / start <= .01 ? '少数の耐性菌が残存しています。一時的耐性状態と観察期間が関係します。' : '耐性菌が残存しています。作用機序と持続時間を確認してください。'; }
export function simulationNarration(d: Design, hour: number): string[] { const k = killRates(hour, d); return [k.kS > params.gS ? '薬の作用が感受性菌の増殖を上回っています。' : '感受性菌の増殖を薬の作用だけでは上回れていません。', k.kR > params.gR ? '薬の作用が耐性菌の増殖を上回っています。' : '耐性菌には薬が十分に作用していません（耐性による必要濃度 ' + params.resistFold[d.mech - 1] + ' 倍）。']; }
export function barrierEffect(design: Design, hour: number) {
    const efficacy = killRates(hour, design).kR / params.Emax;
    return {
        kind: design.mech <= 2 ? 'bounce' : 'pass',
        // More successful interactions per second when current killing efficacy is higher.
        duration: design.mech <= 2 ? 1.6 : 0.7 + 2.5 * (1 - efficacy),
    } as const;
}
/** Keep Japanese closing punctuation with the preceding line. */
export function wrapJapanese(text: string, maxWidth: number, measure: (text: string) => number): string[] {
    const lines: string[] = [];
    let row = '';
    for (const char of text) {
        if (row && measure(row + char) > maxWidth && !'！、。？'.includes(char)) {
            lines.push(row);
            row = '';
        }
        row += char;
    }
    if (row)
        lines.push(row);
    return lines;
}
export const chartTicks = [
    { value: 1, label: '1' },
    { value: 1e2, label: '100' },
    { value: 1e4, label: '1万' },
    { value: 1e6, label: '100万' },
    { value: 1e8, label: '1億' },
    { value: 1e9, label: '10億' },
];
// Model values are passed directly; the log projection spans 10^0 through 10^9.
export function chartY(value: number): number {
    return 210 - Math.log10(value) / 9 * 180;
}
