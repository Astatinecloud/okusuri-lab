import { ranks } from '../config/game';
export const rank = (n: number) => ranks.find(r => n >= r.min)!;
