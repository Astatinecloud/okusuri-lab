import { it, expect, vi } from 'vitest';
import { investmentStatistics } from './investment';
it('runs asynchronously in a worker and memoizes identical background designs', async () => {
    const workers: FakeWorker[] = [];
    class FakeWorker {
        onmessage: ((e: {
            data: unknown;
        }) => void) | null = null;
        onerror: ((e: {
            message: string;
        }) => void) | null = null;
        postMessage = vi.fn();
        terminate = vi.fn();
        constructor() { workers.push(this); }
    }
    vi.stubGlobal('Worker', FakeWorker);
    try {
        const d = { pot: 5, bar: 2, dur: 5, gentle: 5 }, first = investmentStatistics(d);
        expect(workers).toHaveLength(1);
        expect(workers[0].postMessage).toHaveBeenCalledWith(d);
        expect(investmentStatistics({ ...d, bar: 4 })).toBe(first);
        const rows = [1, 2, 3, 4, 5].map(level => ({ level, spread: .1, meanRecovered: 80 }));
        workers[0].onmessage!({ data: rows });
        expect(await first).toEqual(rows);
        expect(workers[0].terminate).toHaveBeenCalledOnce();
        expect(investmentStatistics(d)).toBe(first);
        expect(workers).toHaveLength(1);
    }
    finally {
        vi.unstubAllGlobals();
    }
});
it('allows retry after worker failure', async () => {
    const workers: {
        onerror: ((e: {
            message: string;
        }) => void) | null;
        terminate: ReturnType<typeof vi.fn>;
    }[] = [];
    class FailingWorker {
        onerror: ((e: {
            message: string;
        }) => void) | null = null;
        postMessage = vi.fn();
        terminate = vi.fn();
        constructor() { workers.push(this); }
    }
    vi.stubGlobal('Worker', FailingWorker);
    try {
        const d = { pot: 4, bar: 1, dur: 5, gentle: 5 }, first = investmentStatistics(d), assertion = expect(first).rejects.toThrow('failed');
        workers[0].onerror!({ message: 'failed' });
        await assertion;
        const retry = investmentStatistics(d), retryAssertion = expect(retry).rejects.toThrow('retry');
        expect(workers).toHaveLength(2);
        workers[1].onerror!({ message: 'retry' });
        await retryAssertion;
    }
    finally {
        vi.unstubAllGlobals();
    }
});
