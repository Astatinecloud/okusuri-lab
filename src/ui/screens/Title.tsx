import type { Screen } from '../../game/types';
import { Flask, Germ } from '../components/Visuals';

type Props = {
    setScreen: (screen: Screen) => void;
    setModal: (modal: string) => void;
};

export function Title({ setScreen, setModal }: Props) {
    return (
        <section className="hero">
            <div className="eyebrow">ようこそ、きみの けんきゅう室へ</div>
            <div className="hero-art">
                <span className="hero-germ"><Germ /></span>
                <Flask />
                <i className="capsule hero-capsule" />
                <span className="hero-res"><Germ res /></span>
                <span className="spark">✧</span>
            </div>
            <h1>おくすり<span>発明ラボ</span></h1>
            <h2>きみだけの薬で100人を助けよう！</h2>
            <p>きみは今日からおくすり研究者！<br />薬のつよさやしくみを工夫して、<br />たくさんの人を元気にしよう！</p>
            <button className="primary start" onClick={() => setScreen('develop')}>はじめる <span>→</span></button>
            <div className="links">
                <button onClick={() => setModal('how')}>あそびかた</button>
                <button onClick={() => setModal('science')}>ばい菌と薬のおはなし</button>
            </div>
            <small>あそびながら、薬のひみつを見つけよう。</small>
        </section>
    );
}
