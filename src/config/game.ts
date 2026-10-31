import { cost, type Design, type Result } from '../model';
export const labels = { pot: 'ふつうのばい菌への強さ', mech: '新しいしくみ', dur: '薬がはたらく時間', gentle: '体へのやさしさ' };
export const descriptions = { pot: 'ふつうのばい菌をへらす力だよ！ 薬の量をふやすのではなく、薬そのものの力をみがくよ。', mech: '薬がききにくいばい菌にも、きくように工夫しよう！', dur: '薬がどのくらい長くはたらくかを決めよう！ 長いほど体への負担もふえるよ。', gentle: '体にやさしい薬をめざそう！' };
export const ranks = [{ min: 95, stars: 5, name: 'でんせつの おくすり博士' }, { min: 80, stars: 4, name: 'スーパー博士' }, { min: 60, stars: 3, name: 'おくすり博士' }, { min: 30, stars: 2, name: '研究員' }, { min: 0, stars: 1, name: '見ならい研究員' }];
export const rank = (n: number) => ranks.find(r => n >= r.min)!;
export function comments(d: Design, r: Result) {
    const a: string[] = [], v = r.representative;
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
export const science = [['薬がききにくいって？', 'ある薬がききにくくなる、ばい菌の性質のことだよ。'], ['なぜ新しい薬がいるの？', '薬がききにくいばい菌には、新しいしくみの薬が役立つことがあるよ。'], ['なぜばい菌がのこるの？', '薬がとどきにくい場所や、薬がききにくい状態のばい菌が、まだのこっていることがあるよ。でも、時間がたつと目をさまして、薬がきくようになるものもいるよ。'], ['強いだけではだめ？', '薬のつよさだけでなく、どんなしくみでばい菌にきくかが大切なんだ。'], ['体へのやさしさも大切？', '薬は病気をなおすためのものだけど、体への負担も考えることが大切なんだ。'], ['菌がのこってもなおる？', '体には、のこった少しのばい菌をやっつける「守る力（めんえき）」があるよ。']];
export const adult = 'このゲームは科学を学ぶための簡単なモデルです。実際の薬の開発や治療を正確に再現したものではありません。薬は決められた量・回数を守って使いましょう。たくさん飲んでも薬がききにくいばい菌に効くようにはなりません。';
export const badge = (d: Design, r: Result) => r.recovered >= 80 && cost(d) < 9;
