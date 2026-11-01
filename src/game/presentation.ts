import { killRates, params, type Design } from '../model';

/** Three significant digits, with Japanese large-number units. */
export function formatMagnitude(value: number): string {
    const rounded = Number(value.toPrecision(3));
    const magnitude = Math.abs(rounded);
    const format = (n: number) => n.toLocaleString('ja', { maximumSignificantDigits: 3 });
    if (magnitude >= 1e8) return format(rounded / 1e8) + '億';
    if (magnitude >= 1e4) return format(rounded / 1e4) + '万';
    return format(rounded);
}

export function formatNumber(value: number): string {
    const count = Math.abs(value) < 1000 ? Math.round(value) : value;
    return '約' + formatMagnitude(count) + '個';
}

export function formatScalar(value: number): string {
    return value.toLocaleString('ja', { maximumSignificantDigits: 3 });
}

/** Never rounds a value below 100 up to "100%" (that would read as complete elimination). */
export function formatPercent(value: number): string {
    if (value >= 100) return '100%';
    if (value >= 99) {
        const fine = value.toFixed(2);
        return fine === '100.00' ? '99.99%超' : fine + '%';
    }
    return value.toFixed(1) + '%';
}

export function formatChange(before: number, after: number): string {
    if (before === after) return 'ほぼ変化なし';
    const ratio = after / before;
    if (Math.abs(ratio - 1) <= .050000000001) return 'ほぼ変化なし';
    if (after === 0) return '0個まで減少';
    if (before === 0) return formatNumber(after) + 'に増加';
    if (ratio < 1) return '約' + formatMagnitude(1 / ratio) + '分の1';
    return '約' + formatMagnitude(ratio) + '倍に増加';
}

export function populationChange(start: number, end: number) {
    if (end < start) {
        const reduction = formatPercent((1 - end / start) * 100);
        return { fold: reduction + ' 減少', detail: '減少割合 ' + reduction };
    }
    if (end > start) return { fold: formatChange(start, end), detail: '増加' };
    return { fold: '変化なし', detail: '変化なし' };
}

export function residualMessage(start: number, end: number): string {
    if (end > start) return '耐性菌が増加しています。耐性菌への作用を確認してください。';
    if (end / start <= .01) return '少数の耐性菌が残存しています。一時的耐性状態と観察期間が関係します。';
    return '耐性菌が残存しています。作用機序と持続時間を確認してください。';
}

export function simulationNarration(design: Design, hour: number): string[] {
    const rates = killRates(hour, design);
    const susceptible = rates.kS > params.gS
        ? '薬の作用が感受性菌の増殖を上回っています。'
        : '感受性菌の増殖を薬の作用だけでは上回れていません。';
    const resistant = rates.kR > params.gR
        ? '薬の作用が耐性菌の増殖を上回っています。'
        : '耐性菌には薬が十分に作用していません（耐性による必要濃度 '
            + params.resistFold[design.mech - 1] + ' 倍）。';
    return [susceptible, resistant];
}

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
