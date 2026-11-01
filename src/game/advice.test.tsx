import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {canAfford,cost,keys,patientTable,yearOutcome,Rng,type Design} from '../model';
import {candidates,createEvaluator,diagnose,evaluate,evaluationSeeds,limitingFactor,mainIssue,metrics,recommend,recommendationReason,type Evaluation} from './advice';
import {ResultAdvice} from '../ui/components/ResultAdvice';

const cases:Design[]=[
    {pot:5,bar:1,dur:2,gentle:4},
    {pot:2,bar:4,dur:2,gentle:4},
    {pot:2,bar:5,dur:1,gentle:4},
    {pot:3,bar:3,dur:3,gentle:1},
    {pot:2,bar:4,dur:2,gentle:5},
    {pot:3,bar:4,dur:2,gentle:4},
    {pot:2,bar:4,dur:2,gentle:5},
];
function checkJapanese(value:unknown) {
    if(typeof value==='string') {
        expect(value).not.toMatch(/[\p{Nd}A-Za-z%％]/u);
        for(const word of ['突然変異率','シード','確率','パラメータ','係数'])expect(value).not.toContain(word);
    } else if(Array.isArray(value))value.forEach(checkJapanese);
    else if(value&&typeof value==='object')Object.values(value).forEach(checkJapanese);
}
function checkStep(current:Design,next:Design) {
    expect(canAfford(next)).toBe(true);
    const diffs=keys.map(key=>next[key]-current[key]);
    expect(diffs.filter(n=>n===1)).toHaveLength(1);
    expect(diffs.filter(n=>n===-1).length).toBeLessThanOrEqual(1);
    expect(diffs.every(n=>n===0||n===1||n===-1)).toBe(true);
    expect(diffs.includes(-1)).toBe(cost(current)===9);
}
async function checkAdvice(d:Design) {
    const table=patientTable(d),result=yearOutcome(d,1,table),diagnosis=diagnose(d,result,table),rec=await recommend(d,1);
    checkJapanese(diagnosis);checkJapanese(rec);
    expect(diagnosis.length).toBeGreaterThanOrEqual(2);expect(diagnosis.length).toBeLessThanOrEqual(3);
    const current=evaluate(d,1);
    if(rec.candidate) {
        checkStep(d,rec.candidate);
        expect(evaluate(rec.candidate,1).meanRecovered-current.meanRecovered).toBeGreaterThanOrEqual(1);
        expect(rec.sentences[0]).toMatch(/可能性があります|見込みです|そうです/);
        const all=candidates(d).map(c=>evaluate(c.design,1));
        expect(evaluate(rec.candidate,1).meanRecovered).toBe(Math.max(...all.map(e=>e.meanRecovered)));
    } else {
        expect(rec.sentences[0]).toContain('はっきりとは増えませんでした');
        expect(candidates(d).every(c=>evaluate(c.design,1).meanRecovered-current.meanRecovered<1)).toBe(true);
    }
    if(rec.secondaryCandidate) {
        checkStep(d,rec.secondaryCandidate);
        const next=evaluate(rec.secondaryCandidate,1);
        expect(current.spreadProbability-next.spreadProbability>=.1||current.counts.side-next.counts.side>=2).toBe(true);
    }
    return {table,result,diagnosis,rec,m:metrics(d,result,table)};
}
describe('model-driven advice',()=>{
    it('fixed common seeds and memoization by design and seed context',()=>{
        const base=yearOutcome(cases[0],1),table=patientTable(cases[0]);
        const run=vi.fn((d:Design,seed:number)=>({...base,seed}));
        const evaluator=createEvaluator(123,()=>table,run);
        const first=evaluator(cases[0]);evaluator(cases[1]);
        expect(run.mock.calls.slice(0,31).map(call=>call[1])).toEqual(evaluationSeeds(123));
        expect(run.mock.calls.slice(31).map(call=>call[1])).toEqual(evaluationSeeds(123));
        expect(evaluator({...cases[0]})).toBe(first);expect(run).toHaveBeenCalledTimes(62);
        expect(evaluationSeeds(1)).toEqual([1,...Array.from({length:30},(_,i)=>i)]);
        expect(evaluate(cases[0],1)).not.toBe(evaluate(cases[0],2));
    });
    for(const [index,d] of cases.entries())it('review case '+(index+1),async()=>{
        const {m,rec,diagnosis,result,table}=await checkAdvice(d);
        if(index===0){expect(mainIssue(m)).toBe('resistance');expect(rec.parameter).toBe('耐性の生じにくさ');expect(cost(d)).toBe(8);expect(cost(rec.candidate!)).toBe(9)}
        if(index===1){expect(m.spread).toBe(false);expect(diagnosis.join('')).toContain('設計が役に立ったようです')}
        if(index===2){const factors=limitingFactor(d,table);expect(mainIssue(m)).toBe('ill');expect(factors.gainDur).toBeGreaterThan(factors.gainPot);expect(diagnosis.join('')).toContain('効果が長続きせず')}
        if(index===3){expect(mainIssue(m)).toBe('side');expect(rec.parameter).toBe('安全性')}
        if(index===4){expect(result.recovered).toBeGreaterThanOrEqual(90);expect(diagnosis.join('')).toContain('多くの患者さんを助ける')}
        if(index===5){expect(cost(d)).toBe(9);expect(rec.candidate).toBeDefined();expect(keys.some(k=>rec.candidate![k]===d[k]-1)).toBe(true);expect(rec.sentences.join('')).toContain('かわりに')}
        if(index===6){expect(rec.candidate).toBeUndefined();expect(rec.sentences[0]).toContain('はっきりとは増えませんでした')}
    },180000);
    it('thirty random affordable designs: Japanese text, truthful gains and legal steps',async()=>{
        const rng=new Rng(3404),selected=new Map<string,Design>();
        while(selected.size<30){const d=Object.fromEntries(keys.map(k=>[k,1+Math.floor(rng.random()*5)])) as Design;if(canAfford(d))selected.set(JSON.stringify(d),d)}
        for(const d of selected.values())await checkAdvice(d);
    },600000);
    it('all affordable candidate moves preserve coin and level rules',()=>{
        for(let pot=1;pot<=5;pot++)for(let bar=1;bar<=5;bar++)for(let dur=1;dur<=5;dur++)for(let gentle=1;gentle<=5;gentle++){
            const d={pot,bar,dur,gentle};if(canAfford(d))for(const c of candidates(d))checkStep(d,c.design);
        }
        expect(candidates({pot:5,bar:5,dur:5,gentle:5})).toEqual([]);
    });
    it('reasons require the matching status decrease; otherwise use a hedged fallback',()=>{
        const current:Evaluation={meanRecovered:40,counts:{well:40,ill:30,emerged:10,resistant:10,side:10},spreadProbability:.5};
        const next:Evaluation={...current,counts:{...current.counts,ill:20}};
        expect(recommendationReason('pot',current,next)).toContain('まだ残っていました');
        expect(recommendationReason('dur',current,next)).toContain('長続き');
        expect(recommendationReason('bar',current,next)).not.toContain('生まれたり広がったりしたこと');
        expect(recommendationReason('gentle',current,next)).not.toContain('体への負担');
        expect(recommendationReason('bar',current,{...current,counts:{...current.counts,resistant:5}})).not.toMatch(/直接|たおす/);
    });
    it('no automatic barrier attribution at low barrier; unlucky and lucky notes follow the comparison',()=>{
        const d=cases[0],table=patientTable(d),base=yearOutcome(d,1,table),average=evaluate(d,1).meanRecovered;
        const noSpread={...base,community:{...base.community,months:base.community.months.map(m=>({...m,frac:0}))}};
        const lowCure={...table,cureS:table.cureS.map(()=>false)};
        expect(diagnose(d,noSpread,lowCure).join('')).not.toContain('設計が役に立った');
        expect(diagnose(d,{...base,recovered:Math.floor(average-15)},table).join('')).toContain('不運');
        expect(diagnose(d,{...base,recovered:Math.ceil(average+15)},table).join('')).toContain('幸運');
    });
    it('loading and loaded advice sections have no numbers, Latin letters or technical text',async()=>{
        const {diagnosis,rec}=await checkAdvice(cases[0]);
        for(const advice of [null,{diagnosis,recommendation:rec}]){
            const html=renderToStaticMarkup(<ResultAdvice advice={advice}/>);
            const text=html.replace(/<[^>]*>/g,'');checkJapanese(text);
            expect(text).toContain('今回のお薬はどうだった？');expect(text).toContain('次に改良するなら？');
            if(!advice)expect(text).toContain('考え中…');else expect(html).toContain('recommendation-name');
        }
    });
});
