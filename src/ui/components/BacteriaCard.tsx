import { formatNumber, populationChange, residualMessage } from '../../game/presentation';
import { Germ } from './Visuals';

export function BacteriaCard({ resistant, start, end }: { resistant: boolean; start: number; end: number }) {
    const change = populationChange(start, end);
    return (
        <section className="card">
            <h2><Germ res={resistant} />{resistant ? 'つよいばい菌' : 'ふつうのばい菌'}</h2>
            <p>{formatNumber(start)} → <strong>{formatNumber(end)}</strong></p>
            <h3>{change.fold}</h3>
            <small>{change.detail}</small>
            {resistant && <p className="remain">{residualMessage(start, end)}</p>}
        </section>
    );
}
