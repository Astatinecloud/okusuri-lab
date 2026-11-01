import { useEffect, useState } from 'react';
import { cost, keys, canAfford, type Design, type Result as ModelResult } from '../../model';
import { labels, ranks, science } from '../../config/game';
import { rank, badge } from '../../game/result';
import { prepareAnalysis, compareDesigns, comparisonDesign, type Key } from '../../game/analysis';
import { formatNumber, populationChange } from '../../game/presentation';
import { initial, type Screen } from '../../game/types';
import { Chart } from '../components/Visuals';
import { PatientIcon, PatientLegend } from '../components/PatientIcon';
import { BacteriaCard } from '../components/BacteriaCard';
import { internalValue } from '../components/PerformanceSetting';
import { Glossary } from '../components/Info';
type Props = {
    r: ModelResult;
    name: string;
    design: Design;
    save: () => void;
    setScreen: (s: Screen) => void;
    setDesign: (d: Design) => void;
    setModal: (s: string) => void;
};
export function Result({ r, name, design, save, setScreen, setDesign }: Props) {
    const [analysis, setAnalysis] = useState<Awaited<ReturnType<typeof prepareAnalysis>> | null>(null);
    const [key, setKey] = useState<Key>('pot'), [direction, setDirection] = useState(-1), [comparison, setComparison] = useState<ReturnType<typeof compareDesigns> | null>(null), [loading, setLoading] = useState(false), [overlay, setOverlay] = useState(false), [showQ, setShowQ] = useState(false);
    useEffect(() => { let active = true; setAnalysis(null); prepareAnalysis(design).then(a => { if (active) {
        setAnalysis(a);
        setKey(a.strongest);
        setDirection(-1);
    } }); return () => { active = false; }; }, [design]);
    useEffect(() => { setComparison(null); const other = comparisonDesign(design, key, direction); if (!other) {
        setLoading(false);
        return;
    } setLoading(true); const timer = setTimeout(() => { setComparison(compareDesigns(design, other)); setLoading(false); }, 0); return () => clearTimeout(timer); }, [design, key, direction]);
    const rep = r.representative, researcher = rank(r.recovered), ill = 100 - r.recovered - r.seDrop;
    function replay(reset: boolean) { if (reset)
        setDesign(initial); history.replaceState(null, '', location.pathname + location.search); setScreen(reset ? 'title' : 'develop'); }
    const rows: [
        string,
        number | string,
        number | string
    ][] = [];
    if (comparison && analysis) {
        const c = comparison.result, v = c.representative;
        rows.push(['回復した患者数', c.recovered, r.recovered], ['感染が残存', 100 - c.recovered - c.seDrop, ill], ['副作用で中断', c.seDrop, r.seDrop], ['感受性菌の最終数（個）', v.normEnd, rep.normEnd], ['耐性菌の最終数（個）', v.resEnd, rep.resEnd], ['感受性菌の減少率', populationChange(v.normStart, v.normEnd).fold, populationChange(rep.normStart, rep.normEnd).fold], ['耐性菌の減少率', populationChange(v.resStart, v.resEnd).fold, populationChange(rep.resStart, rep.resEnd).fold], ['増殖を上回る時間・感受性菌（%）', comparison.indicators.timeAboveS, analysis.indicators.timeAboveS], ['増殖を上回る時間・耐性菌（%）', comparison.indicators.timeAboveR, analysis.indicators.timeAboveR], ['研究開発費（pt）', cost(comparison.design) * 10, cost(design) * 10]);
    }
    const fmt = (v: number | string) => typeof v === 'number' ? v.toLocaleString('ja', { maximumFractionDigits: 2 }) : v;
    const six = rep.trace.find(p => p.t === 6)!, last = rep.trace.at(-1)!;
    const priority = r.seDrop >= 20 ? 5 : rep.resEnd / rep.resStart > .01 ? 1 : 2;
    return <>
        <div className="heading">
        <small>RESEARCH REPORT</small>
        <h1>「{name}」の評価</h1></div>
        <section className="card">
        <h2>① シミュレーション結果</h2>
        <h3>回復した患者数 <em>
        {r.recovered}</em> / 100</h3>
        <p>回復 {r.recovered}人 / 感染が残存 {ill}人 / 副作用で中断 {r.seDrop}人</p>
        <div className="people" role="img" aria-label={'回復 ' + r.recovered + '人、感染が残存 ' + ill + '人、副作用により治療継続が困難 ' + r.seDrop + '人'}>
        {r.outcomes.map((s, i) => <PatientIcon key={i} status={s as 'well' | 'ill' | 'side'}/>)}</div>
        <PatientLegend />
        <div className="stats">
        <BacteriaCard resistant={false} start={rep.normStart} end={rep.normEnd}/>
        <BacteriaCard resistant start={rep.resStart} end={rep.resEnd}/></div>
        <p>研究開発費 {cost(design) * 10} / 90 pt</p>
        <p>
        {'★'.repeat(researcher.stars)} {researcher.name} {badge(design, r) && ' · コスト効率賞'}</p>
        <details>
        <summary>ランクの基準</summary>
        {ranks.map((v, i) => <p key={v.min}>
        {v.min}〜{i === 0 ? 100 : ranks[i - 1].min - 1}人：{'★'.repeat(v.stars)} {v.name}</p>)}<p>80人以上かつ研究開発費に余りがあるとコスト効率賞。</p></details>
        <p className="tiny">代表患者＝免疫が平均的で、耐性菌が初期に10万個（感受性菌の1000分の1）含まれる患者</p></section>
 <section className="card">
        <h2>② 細菌数の推移</h2>
        <label className="check">
        <input type="checkbox" checked={overlay} onChange={e => setOverlay(e.target.checked)}/>比較を重ねて表示（④の比較設定）</label>
        <label className="check">
        <input type="checkbox" checked={showQ} onChange={e => setShowQ(e.target.checked)}/>一時的耐性状態も表示</label>
        <Chart trace={rep.trace} comparison={overlay ? comparison?.result.representative.trace : undefined} showQ={showQ}/>
        <p>感受性菌は最初の6時間で{formatNumber(rep.normStart)}から{formatNumber(six.S + six.Sq)}になりました。耐性菌は72時間後に{formatNumber(rep.resEnd)}残りました。残った耐性菌の{(last.Rq / rep.resEnd * 100).toFixed(1)}%は一時的耐性状態です。</p></section>
 <section className="card">
        <h2>③ 新薬の性能分析</h2>
        {!analysis ? <p role="status">比較設計を計算しています…</p> : <>
        <p className="highlight">特に効果が大きかったパラメータ：{labels[analysis.strongest]}（レベル1との差で評価）</p>
        {keys.map(k => { const c = analysis.parameters[k].minus1; return <article className="analysis-card" key={k}>
        <h3>
        {labels[k]}：レベル{design[k]}</h3>
        {!c ? <p>レベル1のため、下の段階との比較はありません。</p> : <>
        <p>
        {internalValue(k, c.design[k])} → {internalValue(k, design[k])}。</p>
        <p>増殖を上回る時間：感受性菌 {c.indicators.timeAboveS.toFixed(1)}% → {analysis.indicators.timeAboveS.toFixed(1)}%、耐性菌 {c.indicators.timeAboveR.toFixed(1)}% → {analysis.indicators.timeAboveR.toFixed(1)}%。副作用指数 {c.indicators.se.toFixed(3)} → {analysis.indicators.se.toFixed(3)}。</p>
        <p>感受性菌 {formatNumber(c.result.representative.normEnd)} → {formatNumber(rep.normEnd)}（{c.delta.normFold.toFixed(3)}倍）、耐性菌 {formatNumber(c.result.representative.resEnd)} → {formatNumber(rep.resEnd)}（{c.delta.resFold.toFixed(3)}倍）。回復患者 {c.result.recovered}人 → {r.recovered}人。研究開発費 +{c.delta.cost} pt。</p>
        {c.delta.recovered === 0 && <p>この条件では回復数に差は出ませんでした。{Math.abs(c.delta.normFold - 1) < .01 && Math.abs(c.delta.resFold - 1) < .01 ? '他の性能が律速しています。' : '細菌数の変化が回復判定の閾値を越えなかった、または副作用と相殺されたためです。'}</p>}{c.delta.seDrop > 0 && <p className="warning">デメリット：副作用による中断が{c.delta.seDrop}人増えました。</p>}{k === 'mech' && c.delta.normFold >= 2 && <p className="warning">耐性菌が減ったことで、感受性菌が増殖できる余地が生まれました（競合の解放）。感受性菌への効果も必要です。</p>}</>}</article>; })}<h3>研究開発費の内訳</h3>
        <div className="cost-bar">
        {keys.map((k, i) => <span key={k} style={{ width: ((design[k] - 1) * 10 / 90 * 100) + '%', background: ['#2563EB', '#0F9D76', '#697586', '#C2410C'][i] }}/>)}</div>
        {keys.map(k => <p className="tiny" key={k}>
        {labels[k]}：{(design[k] - 1) * 10} pt</p>)}</>}</section>
 <section className="card">
        <h2>④ パラメータ比較</h2>
        <p>選択した性能だけを1段階変更し、他の性能と患者条件は固定します。</p>
        <div className="segments">
        {keys.map(k => <button key={k} aria-pressed={key === k} onClick={() => setKey(k)}>
        {labels[k]}</button>)}</div>
        <div className="segments">
        {[-1, 1].map(v => <button key={v} aria-pressed={direction === v} disabled={!comparisonDesign(design, key, v)} onClick={() => setDirection(v)}>
        {v < 0 ? '1段階下げる' : '1段階上げる'}</button>)}</div>
        {loading && <p role="status">計算しています…</p>}{comparison && !canAfford(comparison.design) && <p className="warning">参考：予算外の設計</p>}{!comparison && !loading && <p>この方向には比較できるレベルがありません。別の性能または方向を選択してください。</p>}{comparison && analysis && <div className="table-scroll">
        <table>
        <thead>
        <tr>
        <th>比較項目</th>
        <th>比較設定（レベル{comparison.design[key]}）</th>
        <th>現在の設定（レベル{design[key]}）</th>
        <th>差（現在−比較）</th></tr></thead>
        <tbody>
        {rows.map(([title, a, b]) => <tr key={title}>
        <th>
        {title}</th>
        <td>
        {fmt(a)}</td>
        <td>
        {fmt(b)}</td>
        <td>
        {typeof a === 'number' && typeof b === 'number' ? fmt(b - a) : String(a) === String(b) ? '変化なし' : a + ' → ' + b}</td></tr>)}</tbody></table></div>}</section>
 <section className="card">
        <h2>⑤ 科学的な解説</h2>
        <article className="science-card">
        <h3>
        {science[priority][0]}</h3>
        <p>
        {science[priority][1]}</p></article>
        <details>
        <summary>その他の科学的背景とモデルの限界</summary>
        {science.filter((_, i) => i !== priority).map(([t, s]) => <article className="science-card" key={t}>
        <h3>
        {t}</h3>
        <p>
        {s}</p></article>)}</details>
        <Glossary /></section>
        <div className="actions">
        <button className="primary" onClick={save}>結果を保存・共有</button>
        <button onClick={() => replay(false)}>設計を変えて再挑戦</button>
        <button onClick={() => replay(true)}>最初から</button></div></>;
}
