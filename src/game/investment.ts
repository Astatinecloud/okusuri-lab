import { keys, params3, yearOutcome, type Design } from '../model';
export type InvestmentRow = {
    level: number;
    spread: number;
    meanRecovered: number;
};
const cache = new Map<string, Promise<InvestmentRow[]>>();
export function investmentStatistics(d: Design) {
    const key = [d.pot, d.dur, d.gentle].join(':');
    const cached = cache.get(key);
    if (cached)
        return cached;
    // Module worker keeps both RK4 and the 1000 community runs off the UI thread.
    const promise = new Promise<InvestmentRow[]>((resolve, reject) => {
        const worker = new Worker(new URL('./investment.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = e => { worker.terminate(); resolve(e.data); };
        worker.onerror = e => { worker.terminate(); cache.delete(key); reject(new Error(e.message)); };
        worker.postMessage(Object.fromEntries(keys.map(k => [k, d[k]])));
    });
    cache.set(key, promise);
    return promise;
}
export function statisticsForLevel(d: Design): InvestmentRow {
    let spread = 0, total = 0;
    for (let seed = 0; seed < params3.nSeedsStats; seed++) {
        const r = yearOutcome(d, seed);
        spread += +(r.community.months[11].frac >= params3.spreadThreshold);
        total += r.recovered;
    }
    return { level: d.bar, spread: spread / params3.nSeedsStats, meanRecovered: total / params3.nSeedsStats };
}
