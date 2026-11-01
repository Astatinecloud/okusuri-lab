import type { Screen } from '../../game/types';
export const story = [
    'あなたは創薬研究チームのリーダーです。',
    '限られた研究コインで4つの性能を設計し、100人の患者を対象としたシミュレーションで新薬を評価します。',
    '新薬が効く菌を減らしながら、偶然生じた耐性菌が選ばれて増えることや、人から人へ広がることも考える必要があります。',
    '新薬の使用開始から1年間、あなたの設計は何人の患者を救えるでしょうか。開発・承認にかかる期間は、この1年間には含みません。',
];
export function Story({ setScreen }: {
    setScreen: (screen: Screen) => void;
}) {
    return <section className="card"><h1>研究チームへの依頼</h1>{story.map(p => <p key={p}>{p}</p>)}<button className="primary wide" onClick={() => setScreen('develop')}>新薬の開発をはじめる</button></section>;
}
