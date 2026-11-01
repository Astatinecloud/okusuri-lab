import type { Design } from '../model';
import { calculateAdvice } from './advice';
self.onmessage = async (event: MessageEvent<{type:'advice';design:Design;seed:number}>) => {
    if (event.data.type === 'advice') {
        try {
            const advice = await calculateAdvice(event.data.design,event.data.seed);
            self.postMessage({type:'advice-complete',advice});
        } catch {
            self.postMessage({type:'advice-error'});
        }
        return;
    }
};
