import { cost, keys, type Design, type Result as ModelResult } from '../../model';
import { labels, ranks } from '../../config/game';
import { rank, comments, badge } from '../../game/result';
import { initial, type Screen } from '../../game/types';
import { Chart } from '../components/Visuals';
import { PatientIcon, PatientLegend } from '../components/PatientIcon';
import { BacteriaCard } from '../components/BacteriaCard';

type Props = {
    r: ModelResult;
    name: string;
    design: Design;
    save: () => void;
    setScreen: (screen: Screen) => void;
    setDesign: (design: Design) => void;
    setModal: (modal: string) => void;
};

export function Result({ r, name, design, save, setScreen, setDesign, setModal }: Props) {
    const rep = r.representative;
    const researcher = rank(r.recovered);

    function replay(reset: boolean) {
        if (reset) setDesign(initial);
        history.replaceState(null, '', location.pathname + location.search);
        setScreen('develop');
    }

    return (
        <>
            <div className="heading">
                <small>けんきゅう けっか</small>
                <h1>100人中、<em>{r.recovered}</em>人が<br />元気になった！</h1>
                <p>「{name}」の発明、おめでとう！</p>
            </div>
            <section className="card result-main">
                <div className="people" role="img" aria-label={`元気 ${r.recovered}人、薬が体に合わなかった ${r.seDrop}人、まだなおらない ${100 - r.recovered - r.seDrop}人`}>
                    {r.outcomes.map((outcome, i) => (
                        <PatientIcon key={i} status={outcome as 'well' | 'ill' | 'side'} />
                    ))}
                </div>
                <PatientLegend />
                <div className="rank">
                    <div>{'★'.repeat(researcher.stars)}</div>
                    <h2>{researcher.name}</h2>
                    {badge(design, r) && <p>🏅 せつやく名人</p>}
                </div>
                <details>
                    <summary>ランクのきまり</summary>
                    {ranks.map((value, i) => (
                        <p key={value.min}>{value.min}〜{i === 0 ? 100 : ranks[i - 1].min - 1}人：{'★'.repeat(value.stars)} {value.name}</p>
                    ))}
                </details>
            </section>
            <section className="card feedback">
                <h2>🔎 はっけんしたこと</h2>
                {comments(design, r).map((comment, i) => <p key={i}>{comment}</p>)}
            </section>
            <div className="stats">
                <BacteriaCard resistant={false} start={rep.normStart} end={rep.normEnd} />
                <BacteriaCard resistant start={rep.resStart} end={rep.resEnd} />
            </div>
            <section className="card">
                <h2>⚗ {name}</h2>
                <p>使ったコイン {cost(design)} / 9</p>
                {keys.map(key => (
                    <div className="spec" key={key}>
                        <span>{labels[key]}</span>
                        <b>{'●'.repeat(design[key])}{'○'.repeat(5 - design[key])}</b>
                    </div>
                ))}
                <Chart trace={rep.trace} />
            </section>
            <div className="actions">
                <button className="primary" onClick={save}>けっかを保存する</button>
                <button onClick={() => replay(false)}>もう一度つくる</button>
                <button onClick={() => replay(true)}>さいしょから</button>
                <button onClick={() => setModal('science')}>もっと知りたい</button>
            </div>
        </>
    );
}
