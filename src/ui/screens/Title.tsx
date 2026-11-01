import { Flask, Germ } from '../components/Visuals';
import type { Screen } from '../../game/types';

type Props = {
    setScreen: (screen: Screen) => void;
    setModal: (modal: string) => void;
};

export function Title({ setScreen, setModal }: Props) {
    return (
        <section className="hero">
            <div className="eyebrow">iGEM Waseda · AMR SCIENCE</div>
            <div className="hero-art">
                <span className="hero-germ"><Germ /></span>
                <Flask />
                <i className="capsule hero-capsule" />
                <span className="hero-res"><Germ res /></span>
                <span className="spark">✧</span>
            </div>
            <h1>おくすり<span>発明ラボ</span></h1>
            <h2>薬剤耐性菌にも作用する新薬を設計しよう</h2>
            <p>
                あなたは創薬研究チームのリーダーです。<br />
                限られた研究コインで4つの性能を設計し、100人の患者を対象としたシミュレーションで新薬を評価します。<br />
                既存薬を強くするのではなく、薬剤耐性菌にも作用する新しい薬を設計することが目標です。
            </p>
            <button className="primary" onClick={() => setScreen('develop')}>設計をはじめる</button>
            <p className="tiny">1回 約3分</p>
            <div className="links">
                <button onClick={() => setModal('science')}>このゲームの科学的背景</button>
                <button onClick={() => setModal('how')}>遊び方</button>
            </div>
        </section>
    );
}
