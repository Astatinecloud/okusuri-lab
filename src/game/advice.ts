import { canAfford, cost, keys, params3, patientTable, yearOutcome, type Design, type PatientStatus, type PatientTable, type Result } from '../model';
import { labels } from '../config/game';

export type Key = typeof keys[number];
export type Counts = Record<PatientStatus, number>;
const emptyCounts = (): Counts => ({well: 0, ill: 0, emerged: 0, resistant: 0, side: 0});
const meanCure = (table: PatientTable) => table.cureS.filter(Boolean).length / table.cureS.length;
export function metrics(_design: Design, result: Result, table: PatientTable) {
    const counts = emptyCounts();
    result.outcomes.forEach(status => counts[status]++);
    return {...counts, sCure: meanCure(table), spread: result.community.months[11].frac >= params3.spreadThreshold};
}
export type Metrics = ReturnType<typeof metrics>;

export const evaluationSeeds = (currentSeed: number) => [currentSeed >>> 0, ...Array.from({length: 30}, (_, i) => i)];
export type Evaluation = {meanRecovered: number; counts: Counts; spreadProbability: number};
/** Each evaluator fixes the seed list once for the current design and all candidates. */
export function createEvaluator(currentSeed: number, getTable = patientTable, run = yearOutcome) {
    const seeds = evaluationSeeds(currentSeed), cache = new Map<string, Evaluation>();
    return (design: Design): Evaluation => {
        const key = keys.map(k => design[k]).join(':');
        const cached = cache.get(key);
        if (cached) return cached;
        const table = getTable(design), counts = emptyCounts();
        let spread = 0;
        for (const seed of seeds) {
            const m = metrics(design,run(design,seed,table),table);
            for (const status of Object.keys(counts) as PatientStatus[]) counts[status] += m[status];
            spread += Number(m.spread);
        }
        // Accumulate integer totals first, so exact recovery ties stay exact.
        for (const status of Object.keys(counts) as PatientStatus[]) counts[status] /= seeds.length;
        const result = {meanRecovered:counts.well,counts,spreadProbability:spread/seeds.length};
        cache.set(key,result);
        return result;
    };
}
const evaluators = new Map<number, ReturnType<typeof createEvaluator>>();
/** The current seed is intentionally retained even when duplicated in the fixed set. */
export function evaluate(design: Design, currentSeed = 1): Evaluation {
    const seed = currentSeed >>> 0;
    let evaluator = evaluators.get(seed);
    if (!evaluator) {evaluator = createEvaluator(seed);evaluators.set(seed,evaluator)}
    return evaluator(design);
}

export function limitingFactor(design: Design, table = patientTable(design)) {
    const current = meanCure(table);
    const gainDur = design.dur < 5 ? meanCure(patientTable({...design, dur: design.dur + 1})) - current : 0;
    const gainPot = design.pot < 5 ? meanCure(patientTable({...design, pot: design.pot + 1})) - current : 0;
    return {gainDur, gainPot};
}
export function mainIssue(m: ReturnType<typeof metrics>): 'resistance' | 'side' | 'ill' | null {
    // Stable order resolves exact count ties without inventing extra issues.
    const issues = [{kind:'resistance' as const, count:m.emerged + m.resistant}, {kind:'side' as const,count:m.side}, {kind:'ill' as const,count:m.ill}];
    const largest = issues.sort((a,b) => b.count-a.count)[0];
    return largest.count >= 5 ? largest.kind : null;
}
export function illSentence(gainDur: number, gainPot: number, preferred?: 'pot'|'dur'): string {
    if (Math.abs(gainDur-gainPot) < .05)
        return '薬の殺菌力や効果が続く時間が足りず、新薬が効く細菌が残ってしまった患者さんがいました。';
    return (preferred ?? (gainDur > gainPot ? 'dur' : 'pot')) === 'dur'
        ? '薬は細菌に作用しましたが、効果が長続きせず、細菌を抑えきれなかった患者さんがいました。'
        : '薬の殺菌力が足りず、新薬が効く細菌が残ってしまった患者さんがいました。';
}
export function diagnose(design: Design, result: Result, table = patientTable(design)): string[] {
    const m = metrics(design, result, table), issue = mainIssue(m), sentences: string[] = [];
    if (m.sCure >= .9) sentences.push('新薬が効く細菌は、しっかり減らすことができました。');
    else if (m.sCure >= .5 && !m.spread && design.bar >= 3) sentences.push('薬が効きにくい細菌は、この一年ではあまり広がりませんでした。耐性が生じにくい設計が役に立ったようです。');
    else if (m.sCure >= .5 && !m.spread && design.bar <= 2) sentences.push('この一年では、薬が効きにくい細菌はあまり広がりませんでした。');
    else if (m.side <= 2 && design.gentle >= 3) sentences.push('体への負担が少なく、副作用で治療をやめた人はほとんどいませんでした。');

    if (issue === 'resistance') {
        if (m.spread) sentences.push(m.sCure >= .5
            ? '新薬が効く細菌は減りましたが、薬が効きにくい細菌が生き残り、広がってしまいました。'
            : '薬が効きにくい細菌が生き残り、広がってしまいました。');
        else if (m.emerged >= 5) sentences.push('治療中に、薬が効きにくい細菌が生まれてしまった患者さんがいました。');
        else if (m.resistant >= 5) sentences.push('薬が効きにくい細菌に感染し、治療が難しくなった患者さんがいました。');
        else sentences.push('薬が効きにくい細菌が、患者さんの回復をさまたげてしまいました。');
    }
    else if (issue === 'side') sentences.push(m.sCure >= .5
        ? '細菌を減らすことはできましたが、薬が体に合わず、治療を続けられなかった患者さんもいました。'
        : '薬が体に合わず、治療を続けられなかった患者さんがいました。');
    else if (issue === 'ill') {
        const {gainDur, gainPot} = limitingFactor(design, table);
        const proposal = Math.abs(gainDur-gainPot) < .05 ? undefined : selectRecommendation(design,result.seed).candidate;
        const preferred = proposal && (['pot','dur'] as const).find(key=>proposal[key]>design[key]);
        sentences.push(illSentence(gainDur,gainPot,preferred));
    }
    // When there is no main issue, retain the high-priority clearance sentence
    // and add the observed no-spread context requested by the review's case two.
    if (!issue && m.sCure >= .9 && !m.spread && design.bar >= 3)
        sentences.push('薬が効きにくい細菌もあまり広がらず、耐性が生じにくい設計が役に立ったようです。');
    if (result.recovered >= 90) sentences.push('薬のさまざまな性能がうまく組み合わさり、多くの患者さんを助けることができました！');
    else if (result.recovered < 30 && !issue) sentences.push('残念ながら、多くの患者さんを助けることはできませんでした。');
    const average = evaluate(design, result.seed).meanRecovered;
    const luck = result.recovered <= average - 15 ? '今回は、薬が効きにくい細菌が早めに現れる不運もありました。'
        : result.recovered >= average + 15 ? '今回は、薬が効きにくい細菌の広がりが遅くなる幸運もありました。' : '';
    if (luck) {
        if (sentences.length < 3) sentences.push(luck);
        else sentences[2] += luck;
    }
    if (sentences.length < 2) sentences.push('今回の結果を手がかりに、お薬の改良を考えてみましょう。');
    return sentences;
}

export type Candidate = {design: Design; increase: Key; decrease?: Key};
export function candidates(design: Design): Candidate[] {
    const result: Candidate[] = [];
    for (const increase of keys) {
        if (design[increase] >= 5) continue;
        if (cost(design) + 1 <= 9) {
            const next = {...design, [increase]:design[increase]+1};
            if (canAfford(next)) result.push({design:next,increase});
        } else for (const decrease of keys) {
            if (decrease === increase || design[decrease] < 2) continue;
            const next = {...design,[increase]:design[increase]+1,[decrease]:design[decrease]-1};
            if (canAfford(next)) result.push({design:next,increase,decrease});
        }
    }
    return result;
}
export type Recommendation = {
    parameter?: string;
    sentences: string[];
    candidate?: Design;
    secondaryCandidate?: Design;
    gain: number;
};
export function recommendationReason(key: Key, current: Evaluation, next: Evaluation, observed: Metrics): string {
    const forward = {
        pot:'殺菌力を高めると、細菌をより確実に減らせる見込みです。',
        bar:'耐性が生じにくい薬にすると、薬が効きにくい細菌が生まれにくく、広がりにくくなり、治療の効果を保ちやすくなる見込みです。',
        dur:'効果が続く時間をのばすと、細菌をより長く抑えられる見込みです。',
        gentle:'安全性を高めると、副作用で治療をやめる人が減り、より多くの患者さんが回復できる見込みです。',
    };
    const decreases = {
        ill:current.counts.ill-next.counts.ill,
        emerged:current.counts.emerged-next.counts.emerged,
        resistant:current.counts.resistant-next.counts.resistant,
        side:current.counts.side-next.counts.side,
    };
    const largest = (Object.keys(decreases) as (keyof typeof decreases)[]).sort((a,b)=>decreases[b]-decreases[a])[0];
    const resistance = current.counts.emerged+current.counts.resistant-next.counts.emerged-next.counts.resistant;
    const resistanceMost = resistance > 0 && resistance >= Math.max(decreases.ill,decreases.side);
    if (key === 'pot' && decreases.ill > 0 && decreases.ill >= Math.max(resistance,decreases.side))
        return observed.ill >= 5 ? '新薬が効く細菌がまだ残っていました。殺菌力を高めると、さらに細菌を減らせる可能性があります。' : forward.pot;
    if (key === 'pot' && resistanceMost)
        return '殺菌力を高めると、治療中に薬が効きにくい細菌が増える前に細菌を減らしやすくなり、結果がよくなる見込みです。';
    if (key === 'bar' && resistance > 0)
        return observed.emerged+observed.resistant >= 5 ? '薬が効きにくい細菌が生まれたり広がったりしたことが、今回の課題でした。耐性が生じにくい薬にすると、そうした細菌が生まれにくく、広がりにくくなり、治療の効果を保ちやすくなる見込みです。' : forward.bar;
    if (key === 'dur' && decreases[largest] > 0 && (largest === 'ill' || largest === 'emerged'))
        return observed.ill >= 5 ? '薬の効果が途中で弱まり、細菌を抑えきれませんでした。効果を長続きさせることが改善につながりそうです。' : forward.dur;
    if (key === 'gentle' && largest === 'side' && decreases.side > 0)
        return observed.side >= 5 ? '細菌を減らす効果はありましたが、体への負担が回復のさまたげになりました。安全性を高めることで、より多くの患者さんが回復できる可能性があります。' : forward.gentle;
    return labels[key]+'を高めると、今回より多くの患者さんが回復できる見込みです。';
}
const recommendations = new Map<string,Recommendation>();
function selectRecommendation(design: Design, seed: number): Recommendation {
    const cacheKey = [seed >>> 0,...keys.map(key=>design[key])].join(':');
    const cached = recommendations.get(cacheKey);
    if (cached) return cached;
    const selected = chooseRecommendation(design,seed);
    recommendations.set(cacheKey,selected);
    return selected;
}
function chooseRecommendation(design: Design, seed: number): Recommendation {
    const current = evaluate(design, seed);
    const options = candidates(design).map(candidate=>({...candidate, evaluation:evaluate(candidate.design,seed)}));
    options.sort((a,b)=>b.evaluation.meanRecovered-a.evaluation.meanRecovered
        || Number(Boolean(a.decrease))-Number(Boolean(b.decrease))
        || a.evaluation.spreadProbability-b.evaluation.spreadProbability);
    const best = options[0], gain = best ? best.evaluation.meanRecovered-current.meanRecovered : 0;
    if (best && gain >= 1) {
        const {design:next,increase,decrease} = best;
        const coin = decrease ? '研究コインが足りないので、かわりに'+labels[decrease]+'を一段階下げてみましょう。' : 'まだ使っていない研究コインで強化できます。';
        const table = patientTable(design), observed = metrics(design,yearOutcome(design,seed,table),table);
        return {parameter:labels[increase],candidate:next,gain,sentences:[recommendationReason(increase,current,best.evaluation,observed),coin]};
    }
    const sentences = ['どの性能を一段階変えても、回復する人数ははっきりとは増えませんでした。'];
    const spreadOption = options.find(option=>current.spreadProbability-option.evaluation.spreadProbability>=.1);
    const sideOption = options.find(option=>current.counts.side-option.evaluation.counts.side>=2);
    const secondary = spreadOption ?? sideOption;
    if (secondary) sentences.push('ただし、'+labels[secondary.increase]+'を高めると、'+(spreadOption
        ? '薬が効きにくい細菌が広がりにくくなる見込みです。'
        : '副作用で治療をやめる人が減る見込みです。'));
    if (secondary?.decrease) sentences[sentences.length-1] += '研究コインが足りないので、かわりに'+labels[secondary.decrease]+'を一段階下げてみましょう。';
    return {sentences,gain,secondaryCandidate:secondary?.design};
}
export async function recommend(design: Design, seed: number): Promise<Recommendation> {
    return selectRecommendation(design,seed);
}

export async function calculateAdvice(design: Design, seed: number) {
    const start = performance.now(), table = patientTable(design), result = yearOutcome(design,seed,table);
    const recommendStart = performance.now();
    const recommendation = await recommend(design,seed);
    const recommendMs = performance.now()-recommendStart;
    const diagnosis = diagnose(design,result,table);
    return {diagnosis,recommendation,metrics:metrics(design,result,table),evaluation:evaluate(design,seed),
        limiting:mainIssue(metrics(design,result,table))==='ill'?limitingFactor(design,table):undefined,
        recommendMs,elapsedMs:performance.now()-start};
}
export type Advice = Awaited<ReturnType<typeof calculateAdvice>>;
