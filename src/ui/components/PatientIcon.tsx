export type PatientStatus = 'well' | 'ill' | 'side';
const symbols = { well: '＋', ill: '・', side: '×' };
const statusLabels = { well: '回復', ill: '感染が残存', side: '副作用で中断' };

export function PatientIcon({ status }: { status: PatientStatus }) {
    return <span aria-hidden="true" className={'patient-icon ' + status}>{symbols[status]}</span>;
}

export function PatientLegend() {
    const statuses: PatientStatus[] = ['well', 'ill', 'side'];
    return (
        <div className="legend">
            {statuses.map(status => (
                <span key={status}><PatientIcon status={status} />{statusLabels[status]}</span>
            ))}
        </div>
    );
}
