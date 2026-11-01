import { calculateInvestment, type InvestmentMessage } from './investment';
import type { Design } from '../model';
import { calculateAdvice } from './advice';
self.onmessage = async (event: MessageEvent<Design | {type:'advice';design:Design;seed:number}>) => {
    if ('type' in event.data) {
        try {
            const advice = await calculateAdvice(event.data.design,event.data.seed);
            self.postMessage({type:'advice-complete',advice});
        } catch {
            self.postMessage({type:'advice-error'});
        }
        return;
    }
    const send = (message: InvestmentMessage) => self.postMessage(message);
    const result = calculateInvestment(event.data, completed => send({ type: 'progress', completed }));
    send({ type: 'complete', ...result });
};
