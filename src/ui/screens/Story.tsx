import type { Screen } from '../../game/types';
export const story = [
    'あなたは、新薬開発の研究者！',
    'ある細菌による感染症が広がっています。',
    'しかし、まだ十分に有効な薬がありません。',
    'そこで、あなたは新しい抗菌薬を開発することになりました！',
    'ただし、薬が完成しても安心はできません。',
    '薬を使い続けるうちに、その薬が効きにくい「薬剤耐性菌」が増えてしまうことがあります。',
    'だからこそ、薬の殺菌力だけでなく、耐性菌が生じにくい薬を最初から設計することも大切です。',
    '限られた研究予算をうまく使って、強く、安全で、耐性菌が増えにくい新薬を開発しましょう！',
    'あなたの薬は、1年間で100人の患者のうち何人を救えるでしょうか？',
];
export function Story({ setScreen }: {
    setScreen: (screen: Screen) => void;
}) {
    return <section className="card"><h1>研究チームへの依頼</h1>{story.map(p => <p key={p}>{p}</p>)}<button className="primary wide" onClick={() => setScreen('develop')}>新薬の開発をはじめる</button></section>;
}
