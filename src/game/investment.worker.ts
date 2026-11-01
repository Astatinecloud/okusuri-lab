import { calculateInvestment, type InvestmentMessage } from './investment';
import type { Design } from '../model';
self.onmessage = (event: MessageEvent<Design>) => {
    const send = (message: InvestmentMessage) => self.postMessage(message);
    const result = calculateInvestment(event.data, completed => send({ type: 'progress', completed }));
    send({ type: 'complete', ...result });
};
