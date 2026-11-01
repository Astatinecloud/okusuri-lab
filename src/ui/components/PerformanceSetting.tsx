import { canAfford, params, params3, type Design, keys } from '../../model';
import { descriptions, labels, benefits, drawbacks, impacts, subtitles } from '../../config/game';
import { Info, type Term } from './Info';
export const parameterTerms: Record<typeof keys[number], Term> = {
    pot: '新薬が効く菌',
    bar: '作用機序',
    dur: '半減期',
    gentle: '副作用',
};
export function internalValue(key: typeof keys[number], level: number): string {
    const index = level - 1;
    switch (key) {
        case 'pot': return 'EC50 = ' + params.ec50S[index] + '（低いほど少ない濃度で効く）';
        case 'bar': return '出現頻度 f = ' + params3.freq[index].toExponential(2) + ' / 増殖コスト c = ' + params3.cost[index] + ' / μ = f × c';
        case 'dur': return '半減期 ' + params.halfLife[index] + ' 時間';
        case 'gentle': return '副作用係数 ×' + params.seGentle[index];
    }
}
type Props = {
    attribute: typeof keys[number];
    design: Design;
    change: (key: typeof keys[number], level: number) => void;
};
export function PerformanceSetting({ attribute, design, change }: Props) {
    const level = design[attribute];
    return (<section className={"card setting setting-" + attribute} aria-labelledby={'parameter-' + attribute}>
            <div className="parameter-header">
                <h2 id={'parameter-' + attribute}>
                    {labels[attribute]} <Info term={parameterTerms[attribute]}/>
                </h2>
                {subtitles[attribute] && <p className="parameter-subtitle">{subtitles[attribute]}</p>}
                <strong>レベル {level} / 5 · {level - 1}枚</strong>
            </div>
            <p>{descriptions[attribute]}</p>
            <div className="levels">
                {[1, 2, 3, 4, 5].map(value => {
            const locked = !canAfford({ ...design, [attribute]: value });
            const accessibleName = labels[attribute] + ' レベル' + value
                + (locked ? '（研究コインが不足）' : '');
            return (<button key={value} disabled={locked} aria-label={accessibleName} aria-pressed={level === value} title={locked ? '研究コインが不足しています。ほかの性能を下げると選べます。' : value - 1 + '枚'} onClick={() => change(attribute, value)}>
                            {value}{locked && <small aria-hidden="true"> 🔒</small>}
                        </button>);
        })}
            </div>
            <small>選択できない段階は研究コインが不足しています。</small>
            <details>
                <summary>詳しく</summary>
                <p>メリット：{benefits[attribute]}</p>
                <p>デメリット：{drawbacks[attribute]}</p>
                <div>{impacts[attribute].map(value => <span className="tag" key={value}>{value}</span>)}</div>
                <p className="tiny">{internalValue(attribute, level)} <Info term={attribute === 'pot' ? 'EC50' : parameterTerms[attribute]}/></p>
            </details>
        </section>);
}
