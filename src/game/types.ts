import type { Design } from '../model';

export type Screen = 'title' | 'develop' | 'sim' | 'result' | 'save';
export const initial: Design = { pot: 1, mech: 1, dur: 1, gentle: 1 };
