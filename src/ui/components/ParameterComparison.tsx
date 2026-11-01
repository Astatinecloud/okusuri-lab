import { canAfford, keys, type Design } from '../../model';
import { labels } from '../../config/game';
import { comparisonDesign, type Analysis, type Comparison, type Key } from '../../game/analysis';
import { comparisonRows } from '../../game/analysisPresentation';

type Props = {
    design: Design;
    analysis: Analysis | null;
    comparison: Comparison | null;
    attribute: Key;
    direction: number;
    loading: boolean;
    selectAttribute: (key: Key) => void;
    selectDirection: (direction: number) => void;
};

export function ParameterComparison({ design, analysis, comparison, attribute, direction, loading, selectAttribute, selectDirection }: Props) {
    const rows = comparison && analysis ? comparisonRows(design, analysis, comparison) : [];
    return (
        <section className="card">
            <h2>④ パラメータ比較</h2>
            <p>選択した性能だけを1段階変更し、他の性能と患者条件は固定します。</p>
            <div className="segments">
                {keys.map(key => <button key={key} aria-pressed={attribute === key} onClick={() => selectAttribute(key)}>{labels[key]}</button>)}
            </div>
            <div className="segments">
                {[-1, 1].map(value => (
                    <button key={value} aria-pressed={direction === value}
                        disabled={!comparisonDesign(design, attribute, value)} onClick={() => selectDirection(value)}>
                        {value < 0 ? '1段階下げる' : '1段階上げる'}
                    </button>
                ))}
            </div>
            {loading && <p role="status">計算しています…</p>}
            {comparison && !canAfford(comparison.design) && <p className="warning">参考：予算外の設計</p>}
            {!comparison && !loading && <p>この方向には比較できるレベルがありません。別の性能または方向を選択してください。</p>}
            {comparison && analysis && <div className="table-scroll">
                <table>
                    <thead><tr>
                        <th scope="col">比較項目</th>
                        <th scope="col">比較設定（レベル{comparison.design[attribute]}）</th>
                        <th scope="col">現在の設定（レベル{design[attribute]}）</th>
                        <th scope="col">差・変化（現在−比較）</th>
                    </tr></thead>
                    <tbody>{rows.map(row => <tr key={row.label}>
                        <th scope="row">{row.label}</th>
                        <td>{row.comparison}</td><td>{row.current}</td><td>{row.difference}</td>
                    </tr>)}</tbody>
                </table>
            </div>}
        </section>
    );
}
