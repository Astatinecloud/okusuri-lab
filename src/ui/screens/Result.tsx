import { useEffect, useState } from 'react';
import { cost, type Design, type Result as ModelResult } from '../../model';
import { ranks, science } from '../../config/game';
import { rank, badge } from '../../game/result';
import { prepareAnalysis, compareDesigns, comparisonDesign, type Analysis, type Comparison, type Key } from '../../game/analysis';
import { formatNumber, formatPercent } from '../../game/presentation';
import { initial, type Screen } from '../../game/types';
import { Chart } from '../components/Visuals';
import { PatientIcon, PatientLegend } from '../components/PatientIcon';
import { BacteriaCard } from '../components/BacteriaCard';
import { Glossary, Info } from '../components/Info';
import { PerformanceAnalysis } from '../components/PerformanceAnalysis';
import { ParameterComparison } from '../components/ParameterComparison';

type Props = {
    r: ModelResult;
    name: string;
    design: Design;
    save: () => void;
    setScreen: (screen: Screen) => void;
    setDesign: (design: Design) => void;
    setModal: (modal: string) => void;
};

function ResultSummary({ result, design }: { result: ModelResult; design: Design }) {
    const representative = result.representative;
    const researcher = rank(result.recovered);
    const remaining = 100 - result.recovered - result.seDrop;
    return (
        <section className="card">
            <h2>① シミュレーション結果</h2>
            <h3>回復した患者数 <em>{result.recovered}</em> / 100</h3>
            <p>回復 {result.recovered}人 / 感染が残存 {remaining}人 / 副作用で中断 {result.seDrop}人 <Info term="副作用" /></p>
            <div className="people" role="img" aria-label={'回復 ' + result.recovered + '人、感染が残存 ' + remaining + '人、副作用により治療継続が困難 ' + result.seDrop + '人'}>
                {result.outcomes.map((status, index) => <PatientIcon key={index} status={status as 'well' | 'ill' | 'side'} />)}
            </div>
            <PatientLegend />
            <div className="stats">
                <BacteriaCard resistant={false} start={representative.normStart} end={representative.normEnd} />
                <BacteriaCard resistant start={representative.resStart} end={representative.resEnd} />
            </div>
            <p>使った研究コイン {cost(design)} / 9</p>
            <p>{'★'.repeat(researcher.stars)} {researcher.name} {badge(design, result) && ' · コスト効率賞'}</p>
            <details>
                <summary>ランクの基準</summary>
                {ranks.map((value, index) => <p key={value.min}>
                    {value.min}〜{index === 0 ? 100 : ranks[index - 1].min - 1}人：{'★'.repeat(value.stars)} {value.name}
                </p>)}
                <p>80人以上かつ研究コインに余りがあるとコスト効率賞。</p>
            </details>
            <p className="tiny">代表患者＝免疫が平均的で、耐性菌が初期に10万個（感受性菌の1000分の1）含まれる患者 <Info term="免疫" /></p>
        </section>
    );
}

export function Result({ r, name, design, save, setScreen, setDesign }: Props) {
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [attribute, setAttribute] = useState<Key>('pot');
    const [direction, setDirection] = useState(-1);
    const [comparison, setComparison] = useState<Comparison | null>(null);
    const [loading, setLoading] = useState(false);
    const [overlay, setOverlay] = useState(true);
    const [showQ, setShowQ] = useState(false);

    useEffect(() => {
        let active = true;
        setAnalysis(null);
        prepareAnalysis(design).then(result => {
            if (!active) return;
            const selected = result.strongest ?? 'pot';
            setAnalysis(result);
            setAttribute(selected);
            setDirection(design[selected] === 1 ? 1 : -1);
        });
        return () => { active = false; };
    }, [design]);

    useEffect(() => {
        setComparison(null);
        const other = comparisonDesign(design, attribute, direction);
        if (!other) {
            setLoading(false);
            return;
        }
        setLoading(true);
        const timer = setTimeout(() => {
            setComparison(compareDesigns(design, other));
            setLoading(false);
        }, 0);
        return () => clearTimeout(timer);
    }, [design, attribute, direction]);

    function replay(reset: boolean) {
        if (reset) setDesign(initial);
        history.replaceState(null, '', location.pathname + location.search);
        setScreen(reset ? 'title' : 'develop');
    }

    const representative = r.representative;
    const sixHours = representative.trace.find(point => point.t === 6)!;
    const final = representative.trace.at(-1)!;
    const priority = r.seDrop >= 20 ? 5 : representative.resEnd / representative.resStart > .01 ? 1 : 2;

    return (
        <>
            <div className="heading"><small>RESEARCH REPORT</small><h1>「{name}」の評価</h1></div>
            <ResultSummary result={r} design={design} />
            <section className="card">
                <h2>② 細菌数の推移 <Info term="薬剤耐性" /></h2>
                <label className="check">
                    <input type="checkbox" checked={overlay} onChange={event => setOverlay(event.target.checked)} />
                    比較を重ねて表示（④の比較設定）
                </label>
                <div className="inline-help">
                    <label className="check">
                        <input type="checkbox" checked={showQ} onChange={event => setShowQ(event.target.checked)} />
                        一時的耐性状態も表示
                    </label>
                    <Info term="一時的耐性状態" />
                </div>
                <Chart trace={representative.trace} comparison={overlay ? comparison?.result.representative.trace : undefined} showQ={showQ} />
                <p>
                    感受性菌は最初の6時間で{formatNumber(representative.normStart)}から{formatNumber(sixHours.S + sixHours.Sq)}になりました。
                    耐性菌は72時間後に{formatNumber(representative.resEnd)}残りました。
                    残った耐性菌の{formatPercent(final.Rq / representative.resEnd * 100)}は一時的耐性状態です。
                </p>
            </section>
            <PerformanceAnalysis design={design} analysis={analysis} />
            <ParameterComparison design={design} analysis={analysis} comparison={comparison} attribute={attribute}
                direction={direction} loading={loading} selectAttribute={setAttribute} selectDirection={setDirection} />
            <section className="card">
                <h2>⑤ 科学的な解説</h2>
                <article className="science-card"><h3>{science[priority][0]}</h3><p>{science[priority][1]}</p></article>
                <details>
                    <summary>その他の科学的背景とモデルの限界</summary>
                    {science.filter((_, index) => index !== priority).map(([title, text]) => (
                        <article className="science-card" key={title}><h3>{title}</h3><p>{text}</p></article>
                    ))}
                </details>
                <Glossary />
            </section>
            <div className="actions">
                <button className="primary" onClick={save}>結果を保存・共有</button>
                <button onClick={() => replay(false)}>設計を変えて再挑戦</button>
                <button onClick={() => replay(true)}>最初から</button>
            </div>
        </>
    );
}
