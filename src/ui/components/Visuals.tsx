import { conc, type Design, type Point } from '../../model';
import { chartTicks, chartY, formatNumber, barrierEffect } from '../../game/presentation';

export function Germ({ res = false, sleep = false }: { res?: boolean; sleep?: boolean }) {
    return (
        <svg viewBox="0 0 50 50" aria-hidden="true" className={`germ ${sleep ? 'sleep' : ''}`}>
            <circle cx="25" cy="25" r="22" fill={res ? '#e6d6f8' : '#e3efbb'} stroke={res ? '#ad8aca' : '#b7d075'} strokeWidth={res ? 2 : 0} />
            <circle cx="25" cy="25" r="16" fill={res ? '#b291cc' : '#acd266'} />
            {sleep ? <text x="14" y="29" fontSize="12">zzz</text> : (
                <path d="M18 22v3m14-3v3M20 31q5 5 10 0" fill="none" stroke="#40534c" strokeWidth="2" strokeLinecap="round" />
            )}
        </svg>
    );
}

export function Flask() {
    return (
        <svg className="flask" viewBox="0 0 200 200" aria-hidden="true">
            <ellipse cx="100" cy="177" rx="65" ry="9" fill="#dce7da" />
            <path d="M77 20h46v12h-9v55l49 66q12 18-10 18H47q-22 0-10-18l49-66V32h-9z" fill="#e6f6f0" stroke="#4a7569" strokeWidth="5" />
            <path d="M59 124h82l21 31q5 10-10 10H48q-15 0-10-10z" fill="#a7d8ba" />
            <circle cx="88" cy="142" r="8" fill="#e9f6b8" />
            <circle cx="115" cy="116" r="6" fill="#b5d7bd" />
            <path d="M82 66h15" stroke="white" strokeWidth="7" strokeLinecap="round" />
        </svg>
    );
}

export function chartSeries(trace: Point[]) {
    return trace.map(point => ({ t: point.t, s: point.S + point.Sq, r: point.R + point.Rq, q: point.Rq }));
}

type Series = 's' | 'r' | 'q';
const colors = { s: '#86ad39', r: '#9870bc', q: '#68756d' };
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
                        <path d={'M55 ' + chartY(value) + 'H485'} stroke="#e4e6de" />
                        <text x="48" y={chartY(value) + 4} textAnchor="end">{label}</text>
                    </g>
                ))}
                {[0, 24, 48, 72].map(hour => <text key={hour} x={chartX(hour)} y="231" textAnchor="middle">{hour}</text>)}
                <text x="270" y="258" textAnchor="middle">経過時間（h）</text>
                {comparison && <ChartLines trace={comparison} hour={hour} comparison showQ={showQ} />}
                <ChartLines trace={trace} hour={hour} showQ={showQ} />
            </svg>
            <div className="legend chart-legend">
                <span><LineSample series="s" /><Germ />現在・薬剤感受性菌（実線）</span>
                <span><LineSample series="r" /><Germ res />現在・薬剤耐性菌（実線＋丸）</span>
                {comparison && <>
                    <span><LineSample series="s" comparison /><Germ />比較・感受性菌（破線）</span>
                    <span><LineSample series="r" comparison /><Germ res />比較・耐性菌（点線＋丸）</span>
                </>}
                {showQ && <span><LineSample series="q" /><Germ sleep />一時的耐性状態（Rq）</span>}
                {showQ && comparison && <span><LineSample series="q" comparison /><Germ sleep />比較・一時的耐性状態（Rq）</span>}
            </div>
        </>
    );
}

function characterCount(population: number) {
    return Math.max(0, Math.ceil(Math.log10(Math.max(1, population)) * 2));
}

export function Body({ point, design }: { point: Point; design: Design }) {
    const effect = barrierEffect(design, point.t);
    return (
        <div className="body-world">
            <span className="body-label">代表患者の感染部位</span>
            {[false, true].map(resistant => Array.from({ length: characterCount(resistant ? point.R : point.S) }, (_, i) => (
                <span key={`${resistant}${i}`} className="microbe" style={{
                    left: `${5 + (i * 19 + (resistant ? 11 : 0)) % 85}%`,
                    top: `${22 + (i * 29 + (resistant ? 17 : 0)) % 45}%`,
                    animationDelay: `-${i * .31}s`,
                }}><Germ res={resistant} /></span>
            )))}
            <div className="hideout">
                <small>一時的耐性状態（薬が届きにくい部位・休眠）</small>
                <div>
                    {[false, true].map(resistant => Array.from({ length: Math.min(6, characterCount(resistant ? point.Rq : point.Sq)) }, (_, i) => (
                        <Germ key={`${resistant}${i}`} res={resistant} sleep />
                    )))}
                </div>
            </div>
            {Array.from({ length: Math.round(conc(point.t, design.dur) * 2) }, (_, i) => (
                <i className="capsule particle" key={i} style={{
                    left: `${8 + i * 31 % 85}%`,
                    top: `${30 + i * 23 % 40}%`,
                    animationDelay: `-${i * .2}s`,
                }} />
            ))}
            <span className={`effect barrier-${effect.kind}`} style={{ animationDuration: `${effect.duration}s` }}>
                {effect.kind === 'bounce' ? 'キン：耐性機構による効きにくさ' : '🔑 新しい作用機序で通過'}
            </span>

        </div>
    );
}
