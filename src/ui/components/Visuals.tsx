import { type Design, type Point } from '../../model';
import { chartTicks, chartY, formatNumber } from '../../game/presentation';

export function Germ({ res = false, sleep = false }: { res?: boolean; sleep?: boolean }) {
    const color = sleep ? '#697586' : res ? '#2563EB' : '#0F9D76';
    return (
        <svg viewBox="0 0 50 50" aria-hidden="true" className="germ">
            <circle cx="25" cy="25" r={res && !sleep ? 17 : 22} fill={sleep ? 'none' : color}
                stroke={color} strokeDasharray={sleep ? '4 4' : undefined} />
            {res && !sleep && <circle cx="25" cy="25" r="22" fill="none" stroke={color} strokeWidth="2" />}
        </svg>
    );
}

export function Flask() {
    return <Germ />;
}

export function chartSeries(trace: Point[]) {
    return trace.map(point => ({ t: point.t, s: point.S + point.Sq, r: point.R + point.Rq, q: point.Rq }));
}

type Series = 's' | 'r' | 'q';
const colors = { s: '#0F9D76', r: '#2563EB', q: '#697586' };
const chartX = (hour: number) => 55 + hour / 72 * 430;

function LineSample({ series, comparison = false }: { series: Series; comparison?: boolean }) {
    const dash = comparison ? series === 's' ? '10 6' : '2 5' : undefined;
    return (
        <svg className="line-sample" viewBox="0 0 40 12" aria-hidden="true">
            <path d="M1 6H39" stroke={colors[series]} strokeWidth="2" strokeDasharray={dash} />
            {series === 'r' && <circle cx="20" cy="6" r="3" fill={comparison ? 'white' : colors.r} stroke={colors.r} />}
        </svg>
    );
}

function ChartLines({ trace, hour, comparison = false, showQ }: {
    trace: Point[];
    hour: number;
    comparison?: boolean;
    showQ: boolean;
}) {
    const data = chartSeries(trace).filter(point => point.t <= hour);
    const series: Series[] = showQ ? ['s', 'r', 'q'] : ['s', 'r'];
    return <>{series.map(key => {
        const path = data.map((point, index) => (index ? 'L' : 'M') + chartX(point.t) + ',' + chartY(point[key])).join(' ');
        const dash = comparison ? key === 's' ? '10 6' : '2 5' : undefined;
        return (
            <g key={key}>
                <path className="line" stroke={colors[key]} strokeWidth={key === 'q' ? 1 : 2.5} strokeDasharray={dash} d={path} />
                {key === 'r' && data.filter(point => point.t % 12 === 0).map(point => (
                    <circle key={point.t} cx={chartX(point.t)} cy={chartY(point.r)} r="3"
                        fill={comparison ? 'white' : colors.r} stroke={colors.r}>
                        <title>{point.t}時間：{formatNumber(point.r)}</title>
                    </circle>
                ))}
            </g>
        );
    })}</>;
}

export function Chart({ trace, hour = 72, comparison, showQ = false }: {
    trace: Point[];
    hour?: number;
    comparison?: Point[];
    showQ?: boolean;
}) {
    return (
        <>
            <svg className="chart" viewBox="0 0 510 265" role="img" aria-label="細菌数（個）の推移。1から10億の対数目盛、経過時間0から72時間。">
                <text x="8" y="16">細菌数（個・対数）</text>
                {chartTicks.map(({ value, label }) => (
                    <g key={value}>
                        <path d={'M55 ' + chartY(value) + 'H485'} stroke="#dde3e8" />
                        <text x="48" y={chartY(value) + 4} textAnchor="end">{label}</text>
                    </g>
                ))}
                {[0, 24, 48, 72].map(hour => <text key={hour} x={chartX(hour)} y="231" textAnchor="middle">{hour}</text>)}
                <text x="270" y="258" textAnchor="middle">経過時間（h）</text>
                {comparison && <ChartLines trace={comparison} hour={hour} comparison showQ={showQ} />}
                <ChartLines trace={trace} hour={hour} showQ={showQ} />
            </svg>
            <div className="legend chart-legend">
                <span><LineSample series="s" />現在・薬剤感受性菌（実線）</span>
                <span><LineSample series="r" />現在・薬剤耐性菌（実線＋丸）</span>
                {comparison && <>
                    <span><LineSample series="s" comparison />比較・感受性菌（破線）</span>
                    <span><LineSample series="r" comparison />比較・耐性菌（点線＋丸）</span>
                </>}
                {showQ && <span><LineSample series="q" />一時的耐性状態（Rq）</span>}
                {showQ && comparison && <span><LineSample series="q" comparison />比較・一時的耐性状態（Rq）</span>}
            </div>
        </>
    );
}

function characterCount(population: number): number {
    return Math.max(0, Math.ceil(Math.log10(Math.max(1, population)) * 2));
}

export function Body({ point }: { point: Point; design: Design }) {
    return (
        <div className="body-world">
            <p>代表患者の感染部位</p>
            {[false, true].map(resistant => Array.from({ length: characterCount(resistant ? point.R : point.S) }, (_, index) => (
                <span className="microbe" key={String(resistant) + index} style={{
                    left: (5 + (index * 19 + (resistant ? 11 : 0)) % 85) + '%',
                    top: (25 + (index * 29 + (resistant ? 17 : 0)) % 45) + '%',
                }}>
                    <Germ res={resistant} />
                </span>
            )))}
            <div className="hideout">
                <small>一時的耐性状態</small>
                <div>{Array.from({ length: characterCount(point.Rq + point.Sq) }, (_, index) => <Germ sleep key={index} />)}</div>
            </div>
        </div>
    );
}
