import { killRates, params, type Design } from '../model';

export function formatNumber(n: number): string {
    const format = (value: number) => value.toLocaleString('ja', { maximumFractionDigits: 2 });
    if (n >= 1e8) return `約${format(n / 1e8)}億個`;
    if (n >= 1e4) return `約${format(n / 1e4)}万個`;
    return `約${Math.round(n).toLocaleString('ja')}個`;
}

export function populationChange(start: number, end: number) {
    if (end < start) {
        return {
            fold: `約${Math.round(start / end).toLocaleString('ja')}分の1にへった！`,
            detail: `減少割合 ${((1 - end / start) * 100).toFixed(2)}%`,
        };
    }
    if (end > start) {
        return {
            fold: `約${(end / start).toLocaleString('ja', { maximumFractionDigits: 1 })}倍にふえちゃった…`,
            detail: 'ふえた',
        };
    }
    return { fold: 'はじめと同じくらいだね。', detail: 'かわらない' };
}

export function residualMessage(start: number, end: number): string {
    if (end > start) {
        return 'ふつうのばい菌がへったすきに、薬がききにくいばい菌がふえちゃった。';
    }
    if (end / start <= 0.01) {
        return 'でも、薬がとどきにくいところに、まだ少しのこっているみたい。';
    }
    return '薬がききにくいばい菌が、まだたくさんのこっているよ。';
}

export function simulationNarration(design: Design, hour: number): string[] {
    const dayLine = hour < 24
        ? '薬がはたらきはじめたよ。'
        : hour < 48
            ? 'かくれがのばい菌も、少しずつ目をさますよ。'
            : 'もうすぐけっかがでるよ。';
    const mechanismLine = design.mech <= 2
        ? 'つよいばい菌のバリアに、薬がはね返されているよ。'
        : '新しいしくみで、バリアをくぐりぬけたよ！';
    return [dayLine, mechanismLine];
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
    if (row) lines.push(row);
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
