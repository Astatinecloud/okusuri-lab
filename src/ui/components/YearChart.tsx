import type { Month } from '../../model';
import { Germ } from './Visuals';
/** 1/2/2.5/5 decade steps keep labels round without rounding plotted means. */
export function niceAxis(maximum: number) {
    const rough = Math.max(10, maximum) / 4;
    const scale = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].find(n => n * scale >= rough)! * scale;
    const max = Math.ceil(Math.max(10, maximum) / step) * step;
    return { max, ticks: Array.from({length: Math.round(max / step) + 1}, (_, i) => i * step) };
}
export function YearChart({ months, visible = 12 }: {
    months: Month[];
    visible?: number;
}) {
    const data = months.slice(0, visible), { max, ticks } = niceAxis(Math.max(...months.flatMap(m => [m.YS, m.YR])));
    const x = (i: number) => 55 + i / 11 * 430, y = (v: number) => 205 - v / max * 165;
    return <>
 <svg className="chart" viewBox="0 0 520 260" role="img" aria-label="地域の月平均感染者数（人）、1〜12か月">
 <text x="8" y="20">地域の感染者数（人）</text>
 {ticks.map(value => <g key={value}><path d={'M55 ' + y(value) + 'H485'} stroke="#e4e6de"/><text x="48" y={y(value) + 4} textAnchor="end">{value}</text></g>)}
 {['YS', 'YR'].map((k, j) => <g key={k}><path fill="none" stroke={j ? '#9870bc' : '#86ad39'} strokeWidth="3" d={data.map((m, i) => (i ? 'L' : 'M') + x(i) + ',' + y(m[k as 'YS' | 'YR'])).join(' ')}/>{data.map((m, i) => <circle key={i} cx={x(i)} cy={y(m[k as 'YS' | 'YR'])} r="3" fill={j ? '#9870bc' : '#86ad39'}><title>{m.month+'か月目：'+m[k as 'YS' | 'YR'].toFixed(1)+'人'}</title></circle>)}</g>)}
 {months.map((m, i) => <text key={i} x={x(i)} y="229" textAnchor="middle">{m.month}</text>)}<text x="270" y="254" textAnchor="middle">経過月（か月）</text>
 </svg>
 <div className="legend"><span><Germ />新薬が効く菌</span><span><Germ res/>耐性菌</span></div>
 <svg className="chart fraction-chart" viewBox="0 0 520 155" role="img" aria-label="耐性菌の割合（%）、1〜12か月">
 <text x="8" y="18">耐性菌の割合（%）</text>
 {[0, 50, 100].map(v => <g key={v}><path d={'M55 ' + (115 - v * .8) + 'H500'} stroke="#e4e6de"/><text x="48" y={119 - v * .8} textAnchor="end">{v}</text></g>)}
 {data.map((m, i) => <g key={i}><rect x={x(i) - 10} y={115 - m.frac * 80} width="20" height={m.frac * 80} fill="#b291cc"><title>{m.month+'か月目：'+(m.frac * 100).toFixed(1)+'%'}</title></rect><text x={x(i)} y="138" textAnchor="middle">{m.month}</text></g>)}
 </svg></>;
}
export function monthNarration(months: Month[], index: number) {
    const m = months[index];
    if (m.emergences > 0 && !months.slice(0, index).some(v => v.emergences > 0))
        return m.month + 'か月目：治療中に耐性菌が生まれた患者さんが出ました。';
    if (m.frac >= .1 && !months.slice(0, index).some(v => v.frac >= .1))
        return m.month + 'か月目：耐性菌が広がりはじめました。';
    return m.month + 'か月目：耐性菌の割合は' + (m.frac * 100).toFixed(1) + '%、治療中の耐性成立は' + m.emergences + '件でした。';
}
