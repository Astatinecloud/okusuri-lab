import { it, expect, vi } from 'vitest';
import { requestAdvice } from './adviceClient';
it('advice uses the existing worker entry, caches by design and seed, and retries failures',async()=>{
    const workers:FakeWorker[]=[];
    class FakeWorker {
        onmessage:((event:{data:unknown})=>void)|null=null;
        onerror:((event:{message:string})=>void)|null=null;
        postMessage=vi.fn();terminate=vi.fn();
        constructor(public url:URL){workers.push(this)}
    }
    vi.stubGlobal('Worker',FakeWorker);
    try {
        const d={pot:2,bar:4,dur:2,gentle:5};
        const first=requestAdvice(d,3401);
        expect(workers[0].url.pathname).toContain('investment.worker.ts');
        expect(workers[0].postMessage).toHaveBeenCalledExactlyOnceWith({type:'advice',design:d,seed:3401});
        expect(requestAdvice({...d},3401)).toBe(first);
        const other=requestAdvice(d,3402),failed=expect(other).rejects.toThrow('failed');
        expect(workers).toHaveLength(2);
        const advice={diagnosis:['お薬を振り返ります。'],recommendation:{sentences:['改良を考えましょう。'],gain:0}};
        workers[0].onmessage!({data:{type:'advice-complete',advice}});
        expect(await first).toEqual(advice);expect(workers[0].terminate).toHaveBeenCalledOnce();
        workers[1].onerror!({message:'failed'});await failed;
        const retry=requestAdvice(d,3402),retryAssertion=expect(retry).rejects.toThrow('Advice calculation failed');
        expect(workers).toHaveLength(3);
        workers[2].onmessage!({data:{type:'advice-error'}});await retryAssertion;
    } finally {vi.unstubAllGlobals()}
});
