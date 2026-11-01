export type PatientStatus = 'well' | 'ill' | 'side';
export function PatientIcon({ status }: {
    status: PatientStatus;
}) { return <span aria-hidden="true" className={'patient-icon ' + status}>{status === 'well' ? '＋' : status === 'side' ? '×' : '・'}</span>; }
export function PatientLegend() { return <div className="legend">{(['well', 'ill', 'side'] as const).map((s, i) => <span key={s}><PatientIcon status={s}/>{['回復', '感染が残存', '副作用で中断'][i]}</span>)}</div>; }
