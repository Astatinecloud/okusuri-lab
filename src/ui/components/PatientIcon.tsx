export type PatientStatus = 'well' | 'ill' | 'side';

const palettes = {
    well: { skin: '#c5e4ce', shirt: '#77b299', ink: '#375a51' },
    ill: { skin: '#e0e2df', shirt: '#b2bab4', ink: '#68756d' },
    side: { skin: '#d5eaf3', shirt: '#8abdd1', ink: '#446b7e' },
};

export function PatientIcon({ status }: { status: PatientStatus }) {
    const color = palettes[status];
    return (
        <svg viewBox="0 0 40 48" className={`patient-icon ${status}`} aria-hidden="true">
            <path d="M7 45v-8a13 13 0 0 1 26 0v8Z" fill={color.shirt} />
            <circle cx="20" cy="17" r="13" fill={color.skin} />
            <path d="M15 15v2m10-2v2" fill="none" stroke={color.ink} strokeWidth="2" strokeLinecap="round" />
            <path d={status === 'well' ? 'M15 22q5 6 10 0' : 'M16 23h8'} fill="none" stroke={color.ink} strokeWidth="1.8" strokeLinecap="round" />
            {status === 'side' && (
                <g transform="rotate(-25 27 30)">
                    <rect x="20" y="26" width="15" height="7" rx="2" fill="#fff5df" stroke="#729bad" />
                    <rect x="26" y="27" width="4" height="5" rx="1" fill="#d7c8af" />
                </g>
            )}
        </svg>
    );
}

export function PatientLegend() {
    return (
        <div className="legend patient-legend">
            <span><PatientIcon status="well" />回復</span>
            <span><PatientIcon status="ill" />感染が残存</span>
            <span><PatientIcon status="side" />副作用で中断</span>
        </div>
    );
}
