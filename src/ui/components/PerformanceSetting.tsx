import { canAfford, type Design, keys } from '../../model';
import { descriptions, labels, benefits, drawbacks, impacts, subtitles } from '../../config/game';
import { Info, type Term } from './Info';
export const parameterTerms: Record<typeof keys[number], Term> = {
    pot: '新薬が効く菌',
    bar: '作用機序',
    dur: '効果が続く時間',
    gentle: '副作用',
};
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
            </details>
        </section>);
}
