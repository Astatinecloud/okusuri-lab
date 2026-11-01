import { params3, yearOutcome, type Design } from '../model';
// Mathematical regression helper only; not imported by the application or worker.
export type InvestmentRow = { level: number; spread: number; meanRecovered: number };
export function statisticsForLevel(d: Design): InvestmentRow {
    let spread = 0, total = 0;
    for (let seed = 0; seed < params3.nSeedsStats; seed++) {
        const r = yearOutcome(d, seed);
        spread += +(r.community.months[11].frac >= params3.spreadThreshold);
        total += r.recovered;
    }
    return { level: d.bar, spread: spread / params3.nSeedsStats, meanRecovered: total / params3.nSeedsStats };
}
