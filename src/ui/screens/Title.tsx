import type { Screen } from '../../game/types';
export function Title({ setScreen, setModal }: {
    setScreen: (s: Screen) => void;
    setModal: (s: string) => void;
}) { return <section className="hero">
        <div className="eyebrow">iGEM Waseda · AMR SCIENCE</div>
        <h1>おくすり発明ラボ</h1>
        <h2>薬剤耐性菌にも作用する新薬を設計しよう</h2>
        <p>あなたは創薬研究チームのリーダーです。<br />限られた研究開発費で4つの性能を設計し、100人の患者を対象としたシミュレーションで新薬を評価します。<br />既存薬を強くするのではなく、薬剤耐性菌にも作用する新しい薬を設計することが目標です。</p>
        <button className="primary" onClick={() => setScreen('develop')}>設計をはじめる</button>
        <p className="tiny">1回 約3分</p>
        <div className="links">
        <button onClick={() => setModal('science')}>このゲームの科学的背景</button>
        <button onClick={() => setModal('how')}>遊び方</button></div></section>; }
