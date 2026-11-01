import { statisticsForLevel } from './investment';
import type { Design } from '../model';
self.onmessage = (event: MessageEvent<Design>) => {
    self.postMessage([1, 2, 3, 4, 5].map(bar => statisticsForLevel({ ...event.data, bar })));
};
