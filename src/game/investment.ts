import { keys, params3, yearOutcome, type Design } from '../model';
export type InvestmentRow = {
    level: number;
    spread: number;
    meanRecovered: number;
};
export type InvestmentMessage =
    | { type: 'progress'; completed: number }
    | { type: 'complete'; rows: InvestmentRow[]; elapsedMs: number };
type CacheEntry = {
    promise: Promise<InvestmentRow[]>;
    completed: number;
    listeners: Set<(completed: number) => void>;
};
const cache = new Map<string, CacheEntry>();
export function investmentStatistics(d: Design, onProgress?: (completed: number) => void) {
    const key = [d.pot, d.dur, d.gentle].join(':');
    const cached = cache.get(key);
    if (cached) {
        onProgress?.(cached.completed);
        if (onProgress && cached.completed < 5) cached.listeners.add(onProgress);
        return cached.promise;
    }
    const entry: CacheEntry = { promise: null!, completed: 0, listeners: new Set(onProgress ? [onProgress] : []) };
    onProgress?.(0);
    // Module worker keeps both RK4 and the 1000 community runs off the UI thread.
    const promise = new Promise<InvestmentRow[]>((resolve, reject) => {
        const worker = new Worker(new URL('./investment.worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (e: MessageEvent<InvestmentMessage>) => {
            if (e.data.type === 'progress') {
                entry.completed = e.data.completed;
                entry.listeners.forEach(listener => listener(entry.completed));
            } else {
                entry.completed = 5;
                entry.listeners.forEach(listener => listener(5));
                entry.listeners.clear();
                worker.terminate();
                resolve(e.data.rows);
            }
        };
        worker.onerror = e => { worker.terminate(); reject(new Error(e.message)); };
        worker.postMessage(Object.fromEntries(keys.map(k => [k, d[k]])));
    }).catch(error => {
        entry.listeners.clear();
        cache.delete(key);
        throw error;
    });
    entry.promise = promise;
    cache.set(key, entry);
    return promise;
}
/** Called only in the worker (and benchmarks); progress is sent after each level. */
export function calculateInvestment(d: Design, progress: (completed: number) => void) {
    const start = performance.now();
    const rows = [1, 2, 3, 4, 5].map(bar => {
        const row = statisticsForLevel({ ...d, bar });
        progress(bar);
        return row;
    });
    return { rows, elapsedMs: performance.now() - start };
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
