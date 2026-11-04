import { params3, type Design, type Result } from '../../model';
import type { Screen } from '../../game/types';
import { YearChart, monthNarration } from '../components/YearChart';
import { Body } from '../components/Body';
export function Simulation({ r, elapsedMonths, setScreen }: {
    r: Result;
    elapsedMonths: number;
    design: Design;
    setScreen: (s: Screen) => void;
}) {
    // Fit the initial frame and all twelve monthly frames into the existing duration.
    const completed = Math.min(12, Math.floor(elapsedMonths * 13 / 12)), months = r.community.months;
    const index = completed - 1;
    const current = completed === 0 ? {YS: params3.community.Y0, YR: 0} : months[index];
    return <><div className="heading"><small>STEP 02 / シミュレーション</small><h1>{completed === 0 ? '開始前' : `${completed}か月目 / 12か月`}</h1><p>{completed === 0 ? 'これから地域の菌の変化を見ていきましょう。' : monthNarration(months, index)}</p></div><div className="sim-grid"><section className="card"><Body YS={current.YS} YR={current.YR}/></section><section className="card"><YearChart months={months} visible={completed}/><progress max="12" value={elapsedMonths}/></section></div><button className="primary wide" onClick={() => setScreen('result')}>スキップして結果を見る</button></>;
}
