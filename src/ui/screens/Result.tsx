import { useEffect, useMemo, useState } from 'react';
import { cost, keys, yearOutcome, type Design, type Result as ModelResult, type PatientStatus } from '../../model';
import { labels, science } from '../../config/game';
import { rank } from '../../game/result';
import { investmentStatistics, type InvestmentRow } from '../../game/investment';
import { initial, type Screen } from '../../game/types';
import { YearChart } from '../components/YearChart';
import { PatientIcon, patientLabels } from '../components/PatientIcon';
import { Glossary } from '../components/Info';
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
    return <section className={'rank-ribbon rank-' + value.stars} aria-label="研究者ランク"><p>あなたの研究者ランク</p><div className="researcher-rank"><span>{'★'.repeat(value.stars)}</span><strong>{value.name}</strong></div></section>;
}
export function Result({ r, name, design, save, setScreen, setDesign }: Props) {
    const [stats, setStats] = useState<InvestmentRow[] | null>(null), [error, setError] = useState('');
    const comparison = useMemo(() => yearOutcome({ ...design, bar: 1 }, r.seed), [design, r.seed]);
    useEffect(() => { let active = true; setStats(null); setError(''); investmentStatistics(design).then(rows => { if (active)
        setStats(rows); }).catch(() => { if (active)
        setError('統計を計算できませんでした。結果画面を開き直してください。'); }); return () => { active = false; }; }, [design]);
    const months = r.community.months, first = months[0], last = months[11], currentStats = stats?.[design.bar - 1];
    function replay(reset: boolean) { if (reset)
        setDesign(initial); history.replaceState(null, '', location.pathname + location.search); setScreen(reset ? 'title' : 'develop'); }
    return <>
 <ResearcherRank recovered={r.recovered}/>
 <div className="heading"><small>RESEARCH REPORT · 1年間 / 12か月</small><h1>「{name}」の評価</h1></div>
 <section className="card"><h2>① 1年間の細菌の変化</h2><YearChart months={months}/>
 <p>1か月目の地域の月平均感染者数は、新薬が効く菌が{first.YS.toFixed(1)}人、耐性菌が{first.YR.toFixed(1)}人でした。12か月目はそれぞれ{last.YS.toFixed(1)}人、{last.YR.toFixed(1)}人で、耐性菌の割合は{percent(last.frac)}でした。</p><p>地域で治療中に耐性が成立した件数は、1年間で{r.community.emergences}件です。下の100人は、この地域の各月の割合に応じた感染を治療した結果です。</p></section>
 <section className="card"><h2>② 100人の患者の回復人数</h2><p className="recovered-total"><strong>{r.recovered}</strong> / 100人が回復</p>
 <div className="patient-grid" aria-label="100人の治療結果">{r.outcomes.map((status, i) => <span key={i} title={(i + 1) + '人目・' + (Math.floor(i * 12 / 100) + 1) + 'か月目：' + patientLabels[status]}><PatientIcon status={status}/></span>)}</div>
 <div className="legend patient-legend">{(Object.keys(patientLabels) as PatientStatus[]).map(s => <span key={s}><PatientIcon status={s}/>{patientLabels[s]}：{r.outcomes.filter(v => v === s).length}人</span>)}</div><p className="tiny">副作用で中断した患者は、感染の種類によらず「副作用で中断」に分類しています。</p></section>
 <section className="card"><h2>③ 耐性対策への研究投資の効果</h2><p>耐性の生じにくさだけをレベル1に戻した参考比較です。他の性能は同じで、比較には研究コインの上限を適用しません。</p>
 <div className="table-scroll"><table><caption>同じシード（{r.seed}）での結果</caption><thead><tr><th>設計</th><th>回復人数</th><th>12か月目の耐性菌割合</th></tr></thead><tbody><tr><th>現在（レベル{design.bar}）</th><td>{r.recovered}人</td><td>{percent(last.frac)}</td></tr><tr><th>レベル1</th><td>{comparison.recovered}人</td><td>{percent(comparison.community.months[11].frac)}</td></tr></tbody></table></div>
 <p>200シード（0〜199）での統計。「広がった」は12か月目の耐性菌割合が10%以上になった場合です。1回の結果と統計は異なることがあります。</p>
 {stats && currentStats ? <><div className="table-scroll"><table><caption>200シードの統計</caption><thead><tr><th>設計</th><th>広がった確率</th><th>平均回復人数</th></tr></thead><tbody>{[currentStats, stats[0]].map((v, i) => <tr key={i}><th>{i ? 'レベル1' : '現在（レベル' + design.bar + '）'}</th><td>{percent(v.spread)}</td><td>{v.meanRecovered.toFixed(1)}人</td></tr>)}</tbody></table></div><div className="investment-bars" role="img" aria-label="耐性の生じにくさレベル1〜5の広がった確率">{stats.map(s => <div key={s.level}><span>レベル{s.level}</span><div className="bar-track"><div style={{ width: percent(s.spread) }}/></div><strong>{percent(s.spread)}</strong></div>)}</div></> : <p role="status">{error || '各レベル200シードの統計を計算しています…'}</p>}</section>
 <section className="card"><p className="coin-summary">研究コインの使用枚数：{cost(design)} / 9枚</p>{keys.map(k => <p key={k}>{labels[k]}：レベル{design[k]}</p>)}</section>
 <section className="card"><details><summary>科学的な解説</summary>{science.map(([title, text]) => <article className="science-card" key={title}><h3>{title}</h3><p>{text}</p></article>)}<Glossary /></details></section>
 <div className="actions"><button className="primary" onClick={save}>結果を保存・共有</button><button onClick={() => replay(false)}>もう一度つくる（設定を保持）</button><button onClick={() => replay(true)}>最初から</button></div>
 </>;
}
