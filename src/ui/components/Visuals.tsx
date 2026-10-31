import { conc, type Design, type Point } from '../../model';
import { chartTicks, chartY, barrierEffect } from '../../game/presentation';

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

export function Chart({ trace, hour = 72 }: { trace: Point[]; hour?: number }) {
    function path(resistant: boolean) {
        return trace.filter(point => point.t <= hour).map((point, i) => {
            const value = resistant ? point.R + point.Rq : point.S + point.Sq;
            return `${i ? 'L' : 'M'}${55 + point.t / 72 * 430},${chartY(value)}`;
        }).join(' ');
    }

    return (
        <svg className="chart" viewBox="0 0 510 260" role="img" aria-label="3日間のばい菌の数。1から10億の対数目盛。ふつうのばい菌は黄緑、薬がききにくいばい菌は紫">
            <text x="10" y="18">ばい菌の数</text>
            {chartTicks.map(({ value, label }) => (
                <g key={value}>
                    <path d={`M55 ${chartY(value)}H485`} stroke="#e4e6de" />
                    <text x="48" y={chartY(value) + 4} textAnchor="end">{label}</text>
                </g>
            ))}
            {[0, 1, 2, 3].map(day => <text key={day} x={55 + day / 3 * 430} y="230" textAnchor="middle">{day}日</text>)}
            <text x="270" y="253" textAnchor="middle">じかん（日）</text>
            <path d={path(false)} stroke="#86ad39" className="line" />
            <path d={path(true)} stroke="#9870bc" className="line" />
        </svg>
    );
}

function characterCount(population: number) {
    return Math.max(0, Math.ceil(Math.log10(Math.max(1, population)) * 2));
}

export function Body({ point, design }: { point: Point; design: Design }) {
    const effect = barrierEffect(design, point.t);
    return (
        <div className="body-world">
            <span className="body-label">代表の患者さんの体の中</span>
            {[false, true].map(resistant => Array.from({ length: characterCount(resistant ? point.R : point.S) }, (_, i) => (
                <span key={`${resistant}${i}`} className="microbe" style={{
                    left: `${5 + (i * 19 + (resistant ? 11 : 0)) % 85}%`,
                    top: `${22 + (i * 29 + (resistant ? 17 : 0)) % 45}%`,
                    animationDelay: `-${i * .31}s`,
                }}><Germ res={resistant} /></span>
            )))}
            <div className="hideout">
                <small>かくれが（薬がとどきにくいところ）</small>
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
                {effect.kind === 'bounce' ? 'キン！ 🛡' : '🔑 まもりをくぐるよ'}
            </span>
            <span className="pop">ぽんっ ✧</span>
        </div>
    );
}
