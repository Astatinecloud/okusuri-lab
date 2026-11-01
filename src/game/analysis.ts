import { cost, keys, killRates, params, runDesign, sideEffect, type Design, type Result } from '../model';
export type Key = typeof keys[number];
const cache = new Map<string, Result>();
export function cachedRun(d: Design): Result { const id = keys.map(k => d[k]).join(''); let r = cache.get(id); if (!r) {
    r = runDesign(d);
    cache.set(id, r);
} return r; }
export function comparisonDesign(d: Design, key: Key, direction: number): Design | null { const level = d[key] + direction; return level < 1 || level > 5 ? null : { ...d, [key]: level }; }
export function indicators(d: Design) { let s = 0, r = 0; const steps = Math.round(params.T / params.dt); for (let i = 0; i < steps; i++) {
    const k = killRates(i * params.dt, d);
    s += Number(k.kS > params.gS);
    r += Number(k.kR > params.gR);
} return { timeAboveS: s / steps * 100, timeAboveR: r / steps * 100, se: sideEffect(d) }; }
export function compareDesigns(current: Design, other: Design) { const result = cachedRun(other), now = cachedRun(current); return { design: { ...other }, result, indicators: indicators(other), delta: { recovered: now.recovered - result.recovered, seDrop: now.seDrop - result.seDrop, normFold: now.representative.normEnd / result.representative.normEnd, resFold: now.representative.resEnd / result.representative.resEnd, cost: (cost(current) - cost(other)) * 10 } }; }
export function analyzeDesign(design: Design) {
    const current = cachedRun(design);
    const parameters = Object.fromEntries(keys.map(key => [key, { minus1: design[key] === 1 ? null : compareDesigns(design, { ...design, [key]: design[key] - 1 }), baseline: design[key] === 1 ? null : compareDesigns(design, { ...design, [key]: 1 }) }])) as Record<Key, {
        minus1: ReturnType<typeof compareDesigns> | null;
        baseline: ReturnType<typeof compareDesigns> | null;
    }>;
    const strongest = [...keys].sort((a, b) => { const x = parameters[a].baseline?.delta, y = parameters[b].baseline?.delta; return (y?.recovered ?? 0) - (x?.recovered ?? 0) || ((1 - (y?.normFold ?? 1)) + (1 - (y?.resFold ?? 1))) - ((1 - (x?.normFold ?? 1)) + (1 - (x?.resFold ?? 1))); })[0];
    return { current, indicators: indicators(design), parameters, strongest };
}
export async function prepareAnalysis(d: Design) { for (const item of [d, ...keys.flatMap(k => d[k] === 1 ? [] : [{ ...d, [k]: d[k] - 1 }, { ...d, [k]: 1 }])]) {
    await new Promise(resolve => setTimeout(resolve, 0));
    cachedRun(item);
} return analyzeDesign(d); }
