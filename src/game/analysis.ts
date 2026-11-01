import { canAfford, cost, keys, killRates, params, runDesign, sideEffect, type Design, type Result } from '../model';

export type Key = typeof keys[number];
const cache = new Map<string, Result>();

export function cachedRun(design: Design): Result {
    const id = keys.map(key => design[key]).join('');
    let result = cache.get(id);
    if (!result) {
        result = runDesign(design);
        cache.set(id, result);
    }
    return result;
}

export function comparisonDesign(design: Design, key: Key, direction: number): Design | null {
    const level = design[key] + direction;
    if (level < 1 || level > 5) return null;
    return { ...design, [key]: level };
}

export function indicators(design: Design) {
    let susceptible = 0;
    let resistant = 0;
    const steps = Math.round(params.T / params.dt);
    for (let i = 0; i < steps; i++) {
        const rates = killRates(i * params.dt, design);
        susceptible += Number(rates.kS > params.gS);
        resistant += Number(rates.kR > params.gR);
    }
    return {
        timeAboveS: susceptible / steps * 100,
        timeAboveR: resistant / steps * 100,
        se: sideEffect(design),
    };
}

export function compareDesigns(current: Design, other: Design) {
    const result = cachedRun(other);
    const now = cachedRun(current);
    return {
        design: { ...other },
        result,
        indicators: indicators(other),
        delta: {
            recovered: now.recovered - result.recovered,
            seDrop: now.seDrop - result.seDrop,
            normFold: now.representative.normEnd / result.representative.normEnd,
            resFold: now.representative.resEnd / result.representative.resEnd,
            cost: (cost(current) - cost(other)) * 10,
        },
    };
}

export type Comparison = ReturnType<typeof compareDesigns>;
type ParameterAnalysis = { minus1: Comparison | null; baseline: Comparison | null; plus1: Comparison | null };

function bacterialReduction(comparison: Comparison | null): number {
    if (!comparison) return 0;
    return (1 - comparison.delta.normFold) + (1 - comparison.delta.resFold);
}

export function analyzeDesign(design: Design) {
    const current = cachedRun(design);
    const parameters = Object.fromEntries(keys.map(key => {
        const level = design[key];
        const minus1 = level === 1 ? null : compareDesigns(design, { ...design, [key]: level - 1 });
        const baseline = level === 1 ? null : compareDesigns(design, { ...design, [key]: 1 });
        const plus1 = level < 5 ? compareDesigns(design, { ...design, [key]: level + 1 }) : null;
        return [key, { minus1, baseline, plus1 }];
    })) as Record<Key, ParameterAnalysis>;
    const upgraded = keys.filter(key => design[key] > 1);
    const candidate = upgraded.length === 0 ? null : [...upgraded].sort((a, b) => {
        const before = parameters[a].baseline;
        const after = parameters[b].baseline;
        return (after?.delta.recovered ?? 0) - (before?.delta.recovered ?? 0)
            || bacterialReduction(after) - bacterialReduction(before);
    })[0] ?? null;
    const strongest = candidate && parameters[candidate].baseline!.delta.recovered > 0 ? candidate : null;
    const nextSteps = keys.flatMap(key => {
        const comparison = parameters[key].plus1;
        if (!comparison) return [];
        return [{
            key,
            comparison,
            gain: comparison.result.recovered - current.recovered,
            affordable: canAfford(comparison.design),
        }];
    });
    nextSteps.sort((a, b) => b.gain - a.gain);
    const nextStep = nextSteps.length > 0 && nextSteps[0].gain > 0 ? nextSteps[0] : null;
    return { current, indicators: indicators(design), parameters, strongest, nextStep };
}

export type Analysis = ReturnType<typeof analyzeDesign>;

/** Yield between complete model runs, including every available one-step increase. */
export async function prepareAnalysis(design: Design): Promise<Analysis> {
    const variants = keys.flatMap(key => {
        const level = design[key];
        const lower = level > 1 ? [{ ...design, [key]: level - 1 }, { ...design, [key]: 1 }] : [];
        const higher = level < 5 ? [{ ...design, [key]: level + 1 }] : [];
        return [...lower, ...higher];
    });
    for (const item of [design, ...variants]) {
        await new Promise(resolve => setTimeout(resolve, 0));
        cachedRun(item);
    }
    return analyzeDesign(design);
}
