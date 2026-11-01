import { formatNumber, populationChange, residualMessage } from '../../game/presentation';
import { Info } from './Info';
import { Germ } from './Visuals';

export function BacteriaCard({ resistant, start, end }: { resistant: boolean; start: number; end: number }) {
    const change = populationChange(start, end);
    return (
        <section className="card">
            <h2><Germ res={resistant} />{resistant ? '薬剤耐性菌' : '薬剤感受性菌'} <Info term={resistant ? '薬剤耐性' : '薬剤感受性菌'} /></h2>
            <p>{formatNumber(start)} → <strong>{formatNumber(end)}</strong></p>
            <h3>{change.fold}</h3>
            {resistant && <p className="remain">{residualMessage(start, end)}</p>}
        </section>
    );
}
