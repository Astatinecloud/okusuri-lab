import { cost, type Design, type Result } from '../model';
import { ranks } from '../config/game';
export const rank = (n: number) => ranks.find(r => n >= r.min)!;
export function comments(d: Design, r: Result) {
    const a: string[] = [];
    const v = r.representative;
    if (d.mech <= 2 && v.resEnd / v.resStart >= .9)
        a.push('ふつうのばい菌はへったけど、薬がききにくいばい菌がのこっちゃった！ つぎは、新しいしくみを研究してみよう！');
    if (d.pot <= 2 && v.actEnd >= 1e4)
        a.push('つよいばい菌にはきいたけど、ふつうのばい菌がまだ多いね。ふつうのばい菌への強さも大切だよ。');
    if (r.seDrop >= 30)
        a.push('薬が体に合わなかった人が多かったみたい。体へのやさしさや、はたらく時間を見なおしてみよう！');
    if (d.dur === 1 && r.cured < 80)
        a.push('薬がはやくきれちゃったかも。はたらく時間をのばしてみよう！');
    if (d.gentle >= 4)
        a.push('体にやさしい薬をつくれたね！');
    if (v.normEnd / v.normStart <= .001)
        a.push('ふつうのばい菌をたくさんへらせたね！');
    if (v.resEnd / v.resStart <= .01)
        a.push('新しいしくみで、つよいばい菌もたくさんへったよ！');
    if (r.recovered >= 95)
        a.push('すばらしい！ いろいろな性能をうまく組み合わせたね！');
    return [...a.slice(0, r.recovered < 95 ? 2 : 3), ...(r.recovered < 95 ? ['もっとよい薬をつくるには、どんな工夫ができるかな？'] : [])];
}
export const badge = (d: Design, r: Result) => r.recovered >= 80 && cost(d) < 9;
