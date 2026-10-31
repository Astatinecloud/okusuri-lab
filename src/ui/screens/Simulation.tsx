import type { Design, Result } from '../../model';
import type { Screen } from '../../game/types';
import { simulationNarration } from '../../game/presentation';
import { Body, Chart } from '../components/Visuals';

type Props = {
    r: Result;
    hour: number;
    design: Design;
    setScreen: (screen: Screen) => void;
};

export function Simulation({ r, hour, design, setScreen }: Props) {
    return (
        <>
            <div className="heading">
                <small>STEP 02 / ためしてみよう</small>
                <h1>{Math.min(3, Math.floor(hour / 24) + 1)}日目のようす</h1>
                {simulationNarration(design, hour).map(line => <p key={line}>{line}</p>)}
            </div>
            <section className="card">
                <Body point={r.representative.trace[Math.min(72, Math.floor(hour))]} design={design} />
                <p className="tiny">画面のばい菌1ぴきは、本当はたくさんのばい菌をあらわしているよ</p>
                <div className="legend">
                    <span>🟢 ふつうのばい菌</span>
                    <span>🟣 薬がききにくいばい菌</span>
                </div>
                <p className="tiny">つよいわけじゃなくて、薬がききにくいだけ</p>
                <Chart trace={r.representative.trace} hour={hour} />
                <progress max="72" value={hour} />
            </section>
            <button className="primary wide" onClick={() => setScreen('result')}>けっかを見る →</button>
        </>
    );
}
