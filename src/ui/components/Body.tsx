import { useEffect, useState } from 'react';
import { Germ } from './Visuals';

export const PEOPLE_PER_ICON = 10;
export const CAPACITY = 40;
export const icons = (n: number) => n <= 0 ? 0 : Math.max(1, Math.round(n / PEOPLE_PER_ICON));
export function iconCounts(YS: number, YR: number) {
    let green = icons(YS), purple = icons(YR);
    const capped = green + purple > CAPACITY;
    if (capped) {
        purple = YR > 0 ? Math.max(1, Math.round(CAPACITY * YR / (YS + YR))) : 0;
        if (YS > 0) purple = Math.min(CAPACITY - 1, purple);
        green = CAPACITY - purple;
    }
    return {green, purple, capped};
}
export type GermSlot = {slot: number; res: boolean};
/** Retain each color's oldest slots, then allocate free slots in ascending order. */
export function reconcileSlots(previous: GermSlot[], green: number, purple: number): GermSlot[] {
    const kept = [false, true].flatMap(res => previous.filter(g => g.res === res).slice(0, res ? purple : green));
    for (const res of [false, true]) {
        let needed = (res ? purple : green) - kept.filter(g => g.res === res).length;
        for (let slot = 0; slot < CAPACITY && needed > 0; slot++) {
            if (!kept.some(g => g.slot === slot)) { kept.push({slot, res}); needed--; }
        }
    }
    return kept;
}
export const peopleText = (n: number) => n > 0 && n < 1 ? '1人未満' : `約${Math.round(n)}人`;
export function Body({YS, YR}: {YS: number; YR: number}) {
    const {green, purple, capped} = iconCounts(YS, YR);
    const [frame, setFrame] = useState(() => ({active: reconcileSlots([], green, purple), leaving: [] as GermSlot[]}));
    useEffect(() => {
        setFrame(previous => {
            const active = reconcileSlots(previous.active, green, purple);
            const leaving = previous.active.filter(g => !active.some(a => a.slot === g.slot && a.res === g.res));
            return {active, leaving};
        });
    }, [green, purple]);
    useEffect(() => {
        if (!frame.leaving.length) return;
        const timer = setTimeout(() => setFrame(previous => ({...previous, leaving: []})), 400);
        return () => clearTimeout(timer);
    }, [frame.leaving]);
    const summary = `新薬が効く菌に感染している人：${peopleText(YS)}　耐性菌に感染している人：${peopleText(YR)}`;
    return <>
        <div className="body-world" role="img" aria-label={summary}>
            <span className="body-label">その月の地域の菌のようす</span>
            {[...frame.active.map(g => ({...g, leaving: false})), ...frame.leaving.map(g => ({...g, leaving: true}))].map(g =>
                <span key={`${g.slot}-${g.res}`} data-slot={g.slot} data-resistant={g.res} className={'germ-slot' + (g.leaving ? ' germ-leaving' : '')} style={{left: (5 + g.slot * 19 % 85) + '%', top: (22 + g.slot * 29 % 55) + '%'}}>
                    <span className="microbe" style={{animationDelay: '-' + g.slot * .31 + 's'}}><Germ res={g.res}/></span>
                </span>)}
            {capped && <span className="germ-capacity">表示の上限です（実際はもっと多い）</span>}
        </div>
        <p className="tiny">{summary}</p>
        <p className="tiny">菌のイラスト1つ ＝ 感染している人 約10人（少しでもいれば1つ表示）</p>
    </>;
}
