import { keys, type Design } from '../model';
import type { Advice } from './advice';
export type AdvicePart = 'diagnosis' | 'recommendation';
export const ADVICE_TIMEOUT_MS = 30_000;
const cache = new Map<string, Promise<Advice[AdvicePart]>>();
/** Each part owns its worker, cache, timeout and retry lifecycle. */
export function requestAdvicePart<P extends AdvicePart>(design: Design, seed: number, part: P): Promise<Advice[P]> {
    const key = [part, seed >>> 0, ...keys.map(k => design[k])].join(':');
    const cached = cache.get(key);
    if (cached) return cached as Promise<Advice[P]>;
    const promise = new Promise<Advice[P]>((resolve, reject) => {
        const worker = new Worker(new URL('./investment.worker.ts', import.meta.url), {type: 'module'});
        let settled = false;
        const finish = (value?: Advice[P], error?: Error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            worker.terminate();
            if (error) reject(error); else resolve(value!);
        };
        const timer = setTimeout(() => finish(undefined, new Error('Advice calculation timed out')), ADVICE_TIMEOUT_MS);
        worker.onmessage = (event: MessageEvent<{type: string; part: AdvicePart; value: Advice[P]}>) => {
            if (event.data.part !== part) return;
            if (event.data.type === 'advice-complete') finish(event.data.value);
            else if (event.data.type === 'advice-error') finish(undefined, new Error('Advice calculation failed'));
        };
        worker.onerror = error => finish(undefined, new Error(error.message));
        worker.onmessageerror = () => finish(undefined, new Error('Advice message failed'));
        try { worker.postMessage({type: 'advice', part, design, seed}); }
        catch { finish(undefined, new Error('Advice calculation failed')); }
    }).catch(error => { cache.delete(key); throw error; });
    cache.set(key, promise);
    return promise;
}
