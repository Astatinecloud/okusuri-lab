import type { Design, Result } from '../../model';
import type { Screen } from '../../game/types';
import { simulationNarration } from '../../game/presentation';
import { Body, Chart, Germ } from '../components/Visuals';
import { Glossary } from '../components/Info';
export function Simulation({ r, hour, design, setScreen }: {
    r: Result;
    hour: number;
    design: Design;
    setScreen: (s: Screen) => void;
}) { return <>
        <div className="heading">
        <small>STEP 02 / シミュレーション</small>
        <h1>
        {Math.floor(hour)} 時間 / 72 時間</h1>
        {simulationNarration(design, hour).map(s => <p key={s}>
        {s}</p>)}</div>
        <div className="sim-grid">
        <section className="card">
        <Body point={r.representative.trace[Math.min(72, Math.floor(hour))]} design={design}/>
        <p className="tiny">図の1つは多数の細菌を表します（対数スケール）</p>
        <div className="legend">
        <span>
        <Germ />薬剤感受性菌</span>
        <span>
        <Germ res/>薬剤耐性菌</span>
        <span>
        <Germ sleep/>一時的耐性状態</span></div></section>
        <section className="card">
        <Chart trace={r.representative.trace} hour={hour}/>
        <progress max="72" value={hour}/></section></div>
        <Glossary />
        <button className="primary wide" onClick={() => setScreen('result')}>スキップして結果を見る</button></>; }
