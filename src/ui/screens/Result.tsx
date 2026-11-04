import { useEffect, useMemo, useState } from 'react';
import { cost, keys, yearOutcome, params3, type Design, type Result as ModelResult, type PatientStatus } from '../../model';
import { labels, chanceNote } from '../../config/game';
import { rank } from '../../game/result';
import { initial, type Screen } from '../../game/types';
import { YearChart } from '../components/YearChart';
import { PatientIcon, patientLabels } from '../components/PatientIcon';
import { requestAdvicePart, type AdvicePart } from '../../game/adviceClient';
import type { Advice } from '../../game/advice';
import { ResultAdvice, type PartState } from '../components/ResultAdvice';

function useAdvicePart<P extends AdvicePart>(design: Design, seed: number, part: P) {
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState<PartState<Advice[P]>>({value: null, error: false});
    useEffect(() => {
        let active = true;
        setState({value: null, error: false});
        requestAdvicePart(design, seed, part).then(value => {
            if (active) setState({value, error: false});
        }).catch(() => { if (active) setState({value: null, error: true}); });
        return () => { active = false; };
    }, [design, seed, part, attempt]);
    return [state, () => {setState({value: null, error: false});setAttempt(value => value + 1);}] as const;
}
type Props = {
    r: ModelResult;
    name: string;
    design: Design;
    save: () => void;
    setScreen: (s: Screen) => void;
    setDesign: (d: Design) => void;
    setModal: (m: string) => void;
};
const percent = (fraction: number) => (fraction * 100).toFixed(1) + '%';
export function ResearcherRank({ recovered }: {
    recovered: number;
}) {
    const value = rank(recovered);
    return <section className={'rank-ribbon rank-' + value.stars} aria-label="研究者ランク"><p>あなたの研究者ランク</p><div className="researcher-rank"><span>{'★'.repeat(value.stars)}</span><strong>{value.name}</strong></div><p className="tiny chance-note">{chanceNote}</p></section>;
}
export function Result({ r, name, design, save, setScreen, setDesign }: Props) {
    const [diagnosis, retryDiagnosis] = useAdvicePart(design, r.seed, 'diagnosis');
    const [recommendation, retryRecommendation] = useAdvicePart(design, r.seed, 'recommendation');
    const comparison = useMemo(() => yearOutcome({ ...design, bar: 1 }, r.seed), [design, r.seed]);
    const months = r.community.months, first = months[0], last = months[11];
    function replay(reset: boolean) { if (reset)
        setDesign(initial); history.replaceState(null, '', location.pathname + location.search); setScreen(reset ? 'title' : 'develop'); }
    return <>
 <ResearcherRank recovered={r.recovered}/>
 <div className="heading"><small>診断結果</small><h1>「{name}」の評価</h1><p className="recovered-total"><strong>{r.recovered}</strong> / 100人が回復</p><p>{last.frac>=params3.spreadThreshold?'この1年で、薬が効きにくい細菌が広がりました。':'この1年で、薬が効きにくい細菌はあまり広がりませんでした。'}</p></div>
 <ResultAdvice diagnosis={diagnosis} recommendation={recommendation} retryDiagnosis={retryDiagnosis} retryRecommendation={retryRecommendation}/>
 <h2 className="details-heading">くわしい結果</h2>
 <section className="card"><h2>① 1年間の細菌の変化</h2><YearChart months={months}/>
 <p>1か月目の地域の月平均感染者数は、新薬が効く菌が{first.YS.toFixed(1)}人、耐性菌が{first.YR.toFixed(1)}人でした。12か月目はそれぞれ{last.YS.toFixed(1)}人、{last.YR.toFixed(1)}人で、耐性菌の割合は{percent(last.frac)}でした。</p><p>地域で治療中に耐性が成立した件数は、1年間で{r.community.emergences}件です。下の100人は、この地域の各月の割合に応じた感染を治療した結果です。</p></section>
 <section className="card"><h2>② 100人の患者の回復人数</h2><p className="recovered-total"><strong>{r.recovered}</strong> / 100人が回復</p>
 <div className="patient-grid" aria-label="100人の治療結果">{r.outcomes.map((status, i) => <span key={i} title={(i + 1) + '人目・' + (Math.floor(i * 12 / 100) + 1) + 'か月目：' + patientLabels[status]}><PatientIcon status={status}/></span>)}</div>
 <div className="legend patient-legend">{(Object.keys(patientLabels) as PatientStatus[]).map(s => <span key={s}><PatientIcon status={s}/>{patientLabels[s]}：{r.outcomes.filter(v => v === s).length}人</span>)}</div><p className="tiny">副作用で中断した患者は、感染の種類によらず「副作用で中断」に分類しています。</p></section>
 <section className="card"><h2>③ 耐性対策への研究投資の効果</h2><p className="chance-note">{chanceNote}</p><p>耐性の生じにくさだけをレベル1に戻した参考比較です。他の性能は同じで、比較には研究コインの上限を適用しません。</p>
 <div className="table-scroll"><table><caption>同じシード（{r.seed}）での結果</caption><thead><tr><th>設計</th><th>回復人数</th><th>12か月目の耐性菌割合</th></tr></thead><tbody><tr><th>現在（レベル{design.bar}）</th><td>{r.recovered}人</td><td>{percent(last.frac)}</td></tr><tr><th>レベル1</th><td>{comparison.recovered}人</td><td>{percent(comparison.community.months[11].frac)}</td></tr></tbody></table></div></section>
 <section className="card"><p className="coin-summary">研究コインの使用枚数：{cost(design)} / 9枚</p>{keys.map(k => <p key={k}>{labels[k]}：レベル{design[k]}</p>)}</section>
 <div className="actions"><button className="primary" onClick={save}>結果を保存・共有</button><button onClick={() => replay(false)}>もう一度つくる（設定を保持）</button><button onClick={() => replay(true)}>最初から</button></div>
 </>;
}
