import type { Design, Result } from '../../model';
import type { Screen } from '../../game/types';
import { YearChart, monthNarration } from '../components/YearChart';
import { Body } from '../components/Body';
export function Simulation({ r, elapsedMonths, setScreen }: {
    r: Result;
    elapsedMonths: number;
    design: Design;
    setScreen: (s: Screen) => void;
}) {
    const index = Math.min(11, Math.floor(elapsedMonths)), months = r.community.months;
    return <><div className="heading"><small>STEP 02 / シミュレーション</small><h1>{index + 1}か月目 / 12か月</h1><p>{monthNarration(months, index)}</p></div><div className="sim-grid"><section className="card"><Body fraction={months[index].frac}/><p className="tiny">菌の絵は地域の割合を40個で近似した模式図です。</p></section><section className="card"><YearChart months={months} visible={index + 1}/><progress max="12" value={elapsedMonths}/></section></div><button className="primary wide" onClick={() => setScreen('result')}>スキップして結果を見る</button></>;
}
