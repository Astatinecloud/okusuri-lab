import { Germ } from './Visuals';
export function Body({ fraction }: {
    fraction: number;
}) {
    const resistant = Math.round(40 * fraction);
    return <div className="body-world" role="img" aria-label={'地域の耐性菌の割合 ' + (fraction * 100).toFixed(1) + '%'}>
 <span className="body-label">その月の地域の菌の割合</span>
 {Array.from({ length: 40 }, (_, i) => <span key={i} className="microbe" style={{ left: (5 + i * 19 % 85) + '%', top: (22 + i * 29 % 55) + '%', animationDelay: '-' + i * .31 + 's' }}><Germ res={i < resistant}/></span>)}
 </div>;
}
