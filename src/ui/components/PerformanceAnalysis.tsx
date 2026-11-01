import { canAfford, cost, keys, type Design } from '../../model';
import { labels } from '../../config/game';
import { type Analysis, type Key } from '../../game/analysis';
import { analysisCaveat, causalNarrative, evidenceNotes, internalTransition, parameterEvidence, strongestSummary, nextStepHint } from '../../game/analysisPresentation';
import { formatChange, formatNumber, formatPercent, formatScalar } from '../../game/presentation';
import { Info } from './Info';
import { parameterTerms } from './PerformanceSetting';

function ParameterAnalysis({ design, attribute, analysis }: { design: Design; attribute: Key; analysis: Analysis }) {
    const evidence = parameterEvidence(design, attribute, analysis);
    const { before, after, beforeDesign, afterDesign, beforeIndicators: low, afterIndicators: high } = evidence;
    const previous = before.representative;
    const current = after.representative;
    return (
        <article className="analysis-card">
            <h3>{labels[attribute]}：レベル{design[attribute]} <Info term={parameterTerms[attribute]} /></h3>
            <p className="causal-narrative">{causalNarrative(attribute, evidence)}</p>
            {evidence.preview && <p className="tiny">レベル1 → 2 に上げた場合の参考比較です。</p>}
            {evidence.preview && !canAfford(afterDesign) && <p className="warning">参考：予算外の設計</p>}
            <p>{internalTransition(attribute, beforeDesign[attribute], afterDesign[attribute])}</p>
            <p>
                増殖を上回る時間：感受性菌 {formatPercent(low.timeAboveS)} → {formatPercent(high.timeAboveS)}、
                耐性菌 {formatPercent(low.timeAboveR)} → {formatPercent(high.timeAboveR)}。
                副作用指数 {formatScalar(low.se)} → {formatScalar(high.se)}。
            </p>
            <p>
                感受性菌 {formatNumber(previous.normEnd)} → {formatNumber(current.normEnd)}（{formatChange(previous.normEnd, current.normEnd)}）、
                耐性菌 {formatNumber(previous.resEnd)} → {formatNumber(current.resEnd)}（{formatChange(previous.resEnd, current.resEnd)}）。
                回復患者 {before.recovered}人 → {after.recovered}人。
                研究開発費 +{(cost(afterDesign) - cost(beforeDesign)) * 10} pt。
            </p>
            {evidenceNotes(evidence, attribute).map(note => <p key={note} className="analysis-note">{note}</p>)}
        </article>
    );
}

export function PerformanceAnalysis({ design, analysis }: { design: Design; analysis: Analysis | null }) {
    return (
        <section className="card">
            <h2>③ 新薬の性能分析 <Info term="作用機序" /></h2>
            {!analysis ? <p role="status">比較設計を計算しています…</p> : <>
                <p className="highlight">{strongestSummary(analysis)}</p>
                <p className="next-step">{nextStepHint(analysis)}</p>
                <p className="tiny">{analysisCaveat}</p>
                {keys.map(key => <ParameterAnalysis key={key} design={design} attribute={key} analysis={analysis} />)}
                <h3>研究開発費の内訳</h3>
                <div className="cost-bar" aria-hidden="true">
                    {keys.map((key, index) => <span key={key} style={{
                        width: ((design[key] - 1) * 10 / 90 * 100) + '%',
                        background: ['#2563EB', '#0F9D76', '#697586', '#C2410C'][index],
                    }} />)}
                </div>
                {keys.map(key => <p className="tiny" key={key}>{labels[key]}：{(design[key] - 1) * 10} pt</p>)}
            </>}
        </section>
    );
}
