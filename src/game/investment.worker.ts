import { patientTable, yearOutcome, type Design } from '../model';
import { calculateAdvice, diagnose, recommend } from './advice';
import type { AdvicePart } from './adviceClient';
self.onmessage = async (event: MessageEvent<{type: 'advice'; part?: AdvicePart; design: Design; seed: number}>) => {
    const {type, part, design, seed} = event.data;
    if (type !== 'advice') return;
    try {
        // Retain the full response for the existing seven-case report script.
        // The result screen always requests the two parts independently.
        if (!part) {
            self.postMessage({type: 'advice-complete', advice: await calculateAdvice(design, seed)});
            return;
        }
        const value = part === 'diagnosis'
            ? diagnose(design, yearOutcome(design, seed, patientTable(design)))
            : await recommend(design, seed);
        self.postMessage({type: 'advice-complete', part, value});
    } catch {
        self.postMessage({type: 'advice-error', part});
    }
};
