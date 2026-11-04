import { afterEach, it, expect, vi } from 'vitest';
import { requestAdvicePart, ADVICE_TIMEOUT_MS } from './adviceClient';
const d = {pot: 2, bar: 4, dur: 2, gentle: 5};
class FakeWorker {
    static all: FakeWorker[] = [];
    onmessage: ((event: {data: unknown}) => void) | null = null;
    onerror: ((event: {message: string}) => void) | null = null;
    onmessageerror: (() => void) | null = null;
    postMessage = vi.fn(); terminate = vi.fn();
    constructor(public url: URL) {FakeWorker.all.push(this);}
    complete(part: string, value: unknown) {this.onmessage!({data: {type: 'advice-complete', part, value}});}
}
afterEach(() => {vi.unstubAllGlobals(); vi.useRealTimers(); FakeWorker.all = [];});
it('parts cache by design and seed and complete independently', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const diagnosis = requestAdvicePart(d, 3401, 'diagnosis');
    expect(requestAdvicePart({...d}, 3401, 'diagnosis')).toBe(diagnosis);
    const recommendation = requestAdvicePart(d, 3401, 'recommendation');
    const other = requestAdvicePart(d, 3402, 'diagnosis');
    const [a, b, c] = FakeWorker.all;
    expect(a.url.pathname).toContain('investment.worker.ts');
    expect(a.postMessage).toHaveBeenCalledExactlyOnceWith({type: 'advice', part: 'diagnosis', design: d, seed: 3401});
    a.complete('diagnosis', ['done']);
    expect(await diagnosis).toEqual(['done']);
    expect(a.terminate).toHaveBeenCalledOnce();
    expect(b.terminate).not.toHaveBeenCalled();
    b.complete('recommendation', {sentences: ['next'], gain: 0});
    c.complete('diagnosis', ['other']);
    expect((await recommendation).sentences).toEqual(['next']);
    expect(await other).toEqual(['other']);
});
it('errors evict only the failed part; retry starts a new worker', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const success = requestAdvicePart(d, 3500, 'diagnosis');
    FakeWorker.all[0].complete('diagnosis', ['done']);
    await success;
    const failed = requestAdvicePart(d, 3500, 'recommendation');
    const assertion = expect(failed).rejects.toThrow('failed');
    FakeWorker.all[1].onerror!({message: 'failed'});
    await assertion;
    const retry = requestAdvicePart(d, 3500, 'recommendation');
    expect(FakeWorker.all).toHaveLength(3);
    expect(requestAdvicePart(d, 3500, 'diagnosis')).toBe(success);
    FakeWorker.all[2].complete('recommendation', {sentences: [], gain: 0});
    await retry;
});
it('times out after thirty seconds, stops the worker, and allows retry', async () => {
    vi.useFakeTimers(); vi.stubGlobal('Worker', FakeWorker);
    const failed = requestAdvicePart(d, 3600, 'diagnosis');
    const assertion = expect(failed).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(ADVICE_TIMEOUT_MS - 1);
    expect(FakeWorker.all[0].terminate).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1); await assertion;
    expect(FakeWorker.all[0].terminate).toHaveBeenCalledOnce();
    const retry = requestAdvicePart(d, 3600, 'diagnosis');
    FakeWorker.all[1].complete('diagnosis', ['retried']);
    expect(await retry).toEqual(['retried']);
});
it('handles worker response errors and unreadable messages', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    for (const [index, seed] of [3700, 3701].entries()) {
        const request = requestAdvicePart(d, seed, 'recommendation');
        const assertion = expect(request).rejects.toThrow();
        if (index === 0) FakeWorker.all[index].onmessage!({data: {type: 'advice-error', part: 'recommendation'}});
        else FakeWorker.all[index].onmessageerror!();
        await assertion;
        expect(FakeWorker.all[index].terminate).toHaveBeenCalledOnce();
    }
});
