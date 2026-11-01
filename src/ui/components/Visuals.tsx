import { type Design, type Point } from '../../model';
import { chartTicks, chartY, formatNumber } from '../../game/presentation';
export function Germ({ res = false, sleep = false }: {
    res?: boolean;
    sleep?: boolean;
}) { return <svg viewBox="0 0 50 50" aria-hidden="true" className="germ">
        <circle cx="25" cy="25" r={res && !sleep ? 17 : 22} fill={sleep ? 'none' : res ? '#2563EB' : '#0F9D76'} stroke={sleep ? '#697586' : res ? '#2563EB' : '#0F9D76'} strokeDasharray={sleep ? '4 4' : undefined}/>
        {res && !sleep && <circle cx="25" cy="25" r="22" fill="none" stroke="#2563EB" strokeWidth="2"/>}</svg>; }
export function Flask() { return <Germ />; }
export function chartSeries(trace: Point[]) { return trace.map(p => ({ t: p.t, s: p.S + p.Sq, r: p.R + p.Rq, q: p.Rq })); }
export function Chart({ trace, hour = 72, comparison, showQ = false }: {
    trace: Point[];
    hour?: number;
    comparison?: Point[];
    showQ?: boolean;
}) {
    function lines(tr: Point[], compare = false) { const data = chartSeries(tr).filter(p => p.t <= hour); return (['s', 'r', ...(showQ ? ['q'] : [])] as ('s' | 'r' | 'q')[]).map(k => <g key={k}>
        <path className="line" stroke={k === 's' ? '#0F9D76' : k === 'r' ? '#2563EB' : '#697586'} strokeWidth={k === 'q' ? 1 : 2.5} strokeDasharray={compare ? (k === 's' ? '10 6' : '2 5') : undefined} d={data.map((p, i) => (i ? 'L' : 'M') + (55 + p.t / 72 * 430) + ',' + chartY(p[k])).join(' ')}/>
        {k === 'r' && data.filter(p => p.t % 12 === 0).map(p => <circle key={p.t} cx={55 + p.t / 72 * 430} cy={chartY(p.r)} r="3" fill={compare ? 'white' : '#2563EB'} stroke="#2563EB">
        <title>
        {p.t}時間：{formatNumber(p.r)}</title></circle>)}</g>); }
    return <>
        <svg className="chart" viewBox="0 0 510 265" role="img" aria-label="細菌数（個）の推移。1から10億の対数目盛、経過時間0から72時間。">
        <text x="8" y="16">細菌数（個・対数）</text>
        {chartTicks.map(({ value, label }) => <g key={value}>
        <path d={'M55 ' + chartY(value) + 'H485'} stroke="#dde3e8"/>
        <text x="48" y={chartY(value) + 4} textAnchor="end">
        {label}</text></g>)}{[0, 24, 48, 72].map(h => <text key={h} x={55 + h / 72 * 430} y="231" textAnchor="middle">
        {h}</text>)}<text x="270" y="258" textAnchor="middle">経過時間（h）</text>
        {comparison && lines(comparison, true)}{lines(trace)}</svg>
        <div className="legend chart-legend">
        <span>
        <i className="sample green"/>薬剤感受性菌</span>
        <span>
        <i className="sample blue"/>薬剤耐性菌（丸）</span>
        {comparison && <>
        <span>
        <i className="sample green dashed"/>比較・感受性菌</span>
        <span>
        <i className="sample blue dotted"/>比較・耐性菌（丸）</span></>}{showQ && <span>
        <i className="sample gray"/>一時的耐性状態（Rq）</span>}</div></>;
}
const count = (n: number) => Math.max(0, Math.ceil(Math.log10(Math.max(1, n)) * 2));
export function Body({ point }: {
    point: Point;
    design: Design;
}) { return <div className="body-world">
        <p>代表患者の感染部位</p>
        {[false, true].map(res => Array.from({ length: count(res ? point.R : point.S) }, (_, i) => <span className="microbe" key={String(res) + i} style={{ left: (5 + (i * 19 + (res ? 11 : 0)) % 85) + '%', top: (25 + (i * 29 + (res ? 17 : 0)) % 45) + '%' }}>
        <Germ res={res}/></span>))}<div className="hideout">
        <small>一時的耐性状態</small>
        <div>
        {Array.from({ length: count(point.Rq + point.Sq) }, (_, i) => <Germ sleep key={i}/>)}</div></div></div>; }
