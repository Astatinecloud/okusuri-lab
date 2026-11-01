import { canAfford, params, type Design, keys } from '../../model';
import { descriptions, labels, benefits, drawbacks, impacts, subtitles } from '../../config/game';
import { Info } from './Info';
export function internalValue(key: typeof keys[number], level: number) { const i = level - 1; return key === 'pot' ? 'EC50 = ' + params.ec50S[i] + '（低いほど少ない濃度で効く）' : key === 'mech' ? '耐性による必要濃度の倍率 F = ' + params.resistFold[i] + ' 倍' : key === 'dur' ? '半減期 ' + params.halfLife[i] + ' 時間' : '副作用係数 ×' + params.seGentle[i]; }
export function PerformanceSetting({ attribute, design, change }: {
    attribute: typeof keys[number];
    design: Design;
    change: (k: typeof keys[number], l: number) => void;
    icon?: string;
    setModal?: (s: string) => void;
}) { const level = design[attribute]; return <section className="card setting">
        <h2>
        {labels[attribute]}</h2><small>{subtitles[attribute]}</small>
        <strong>レベル {level} / 5 · {(level - 1) * 10} pt</strong>
        <p>
        {descriptions[attribute]}</p>
        <div className="levels">
        {[1, 2, 3, 4, 5].map(v => { const locked = !canAfford({ ...design, [attribute]: v }); return <button key={v} disabled={locked} title={locked ? '研究開発費が不足しています。他の性能を下げると選べます。' : (v - 1) * 10 + ' pt'} aria-pressed={level === v} onClick={() => change(attribute, v)}>
        {v}{locked && <small> 🔒</small>}</button>; })}</div>
        <small>選択できない段階は研究開発費が不足しています。</small>
        <details>
        <summary>詳しく</summary>
        <p>メリット：{benefits[attribute]}</p>
        <p>デメリット：{drawbacks[attribute]}</p>
        <div>
        {impacts[attribute].map(v => <span className="tag" key={v}>
        {v}</span>)}</div>
        <p className="tiny">
        {internalValue(attribute, level)}</p>
        <Info term={attribute === 'pot' ? 'EC50' : attribute === 'dur' ? '半減期' : '作用機序'}/></details></section>; }
