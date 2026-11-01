import { keys, type Design } from '../model';
import type { Advice } from './advice';
const cache = new Map<string, Promise<Advice>>();
/** Use the existing worker entry point; no model evaluation runs during rendering. */
export function requestAdvice(design: Design, seed: number): Promise<Advice> {
    const key = [seed >>> 0,...keys.map(k=>design[k])].join(':');
    const cached = cache.get(key);
    if (cached) return cached;
    const promise = new Promise<Advice>((resolve,reject)=>{
        const worker = new Worker(new URL('./investment.worker.ts',import.meta.url),{type:'module'});
        worker.onmessage = (event: MessageEvent<{type:'advice-complete';advice:Advice}|{type:'advice-error'}>)=>{
            worker.terminate();
            if(event.data.type==='advice-complete') resolve(event.data.advice);
            else reject(new Error('Advice calculation failed'));
        };
        worker.onerror = error=>{worker.terminate();reject(new Error(error.message))};
        worker.postMessage({type:'advice',design,seed});
    }).catch(error=>{cache.delete(key);throw error});
    cache.set(key,promise);
    return promise;
}
