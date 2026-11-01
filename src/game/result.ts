import { cost, type Design, type Result } from '../model';
import { ranks } from '../config/game';
export const rank = (n: number) => ranks.find(r => n >= r.min)!;
export function comments(_d: Design, r: Result) {
    return [
        '回復した患者は' + r.recovered + '人、副作用により治療継続が困難な患者は' + r.seDrop + '人です。', '性能分析で各パラメータの効果と副作用を確認できます。'
    ];
}
export const badge = (d: Design, r: Result) => r.recovered >= 80 && cost(d) < 9;
