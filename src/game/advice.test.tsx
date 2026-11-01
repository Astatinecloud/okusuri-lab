import {describe,it,expect,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {canAfford,cost,keys,patientTable,yearOutcome,Rng,type Design} from '../model';
import {candidates,createEvaluator,diagnose,evaluate,evaluationSeeds,illSentence,limitingFactor,mainIssue,metrics,recommend,recommendationReason,type Evaluation,type Metrics} from './advice';
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
        if(index===2){
            const factors=limitingFactor(d,table);
            expect(mainIssue(m)).toBe('ill');expect(m.well).toBe(3);expect(m.sCure).toBe(.03);
            expect(Math.abs(factors.gainDur-factors.gainPot)).toBeLessThan(.05);
            expect(diagnosis.join('')).toContain('殺菌力や効果が続く時間が足りず');
            expect(diagnosis.join('')).not.toMatch(/あまり広が|設計が役に立った|効果が長続きせず/);
        }
        if(index===3){expect(mainIssue(m)).toBe('side');expect(rec.parameter).toBe('安全性')}
        if(index===4){expect(result.recovered).toBeGreaterThanOrEqual(90);expect(diagnosis.join('')).toContain('多くの患者さんを助ける')}
        if(index===5){expect(cost(d)).toBe(9);expect(rec.candidate).toBeDefined();expect(keys.some(k=>rec.candidate![k]===d[k]-1)).toBe(true);expect(rec.sentences.join('')).toContain('かわりに');expect(m.side).toBe(3);expect(rec.parameter).toBe('安全性');expect(rec.sentences[0]).toContain('安全性を高めると');expect(rec.sentences[0]).not.toContain('さまたげになりました')}
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
        const observed:Metrics={...current.counts,sCure:1,spread:true};
        expect(recommendationReason('pot',current,next,observed)).toContain('まだ残っていました');
        expect(recommendationReason('dur',current,next,observed)).toContain('長続き');
        expect(recommendationReason('bar',current,next,observed)).not.toContain('生まれたり広がったりしたこと');
        expect(recommendationReason('gentle',current,next,observed)).not.toContain('体への負担');
        expect(recommendationReason('bar',current,{...current,counts:{...current.counts,resistant:5}},observed)).not.toMatch(/直接|たおす/);
    });
    it('past claims require five observed patients, not just a mean status decrease',()=>{
        const current:Evaluation={meanRecovered:0,counts:{well:0,ill:25,emerged:25,resistant:25,side:25},spreadProbability:.5};
        for(const key of keys){
            const status=key==='gentle'?'side':key==='bar'?'resistant':'ill';
            const next={...current,counts:{...current.counts,[status]:0}};
            const observed:Metrics={well:96,ill:0,emerged:0,resistant:0,side:0,sCure:1,spread:false,[status]:4};
            expect(recommendationReason(key,current,next,observed)).not.toMatch(/残っていました|今回の課題でした|さまたげになりました|抑えきれませんでした/);
            expect(recommendationReason(key,current,next,{...observed,[status]:5})).toMatch(/残っていました|今回の課題でした|さまたげになりました|抑えきれませんでした/);
        }
    });
    it('near ties are neutral; otherwise prefer the recommended potency or duration',()=>{
        for(const preferred of [undefined,'pot','dur'] as const)expect(illSentence(.97,.96,preferred)).toContain('殺菌力や効果が続く時間');
        expect(illSentence(.8,.1,'pot')).toContain('殺菌力が足りず');
        expect(illSentence(.1,.8,'dur')).toContain('効果が長続きせず');
        expect(illSentence(.8,.1)).toContain('効果が長続きせず');
        expect(illSentence(.1,.8)).toContain('殺菌力が足りず');
    });
    it('no-spread success requires sufficient host cure, even without barrier attribution',()=>{
        const base=yearOutcome(cases[0],1),table=patientTable(cases[0]);
        const noSpread={...base,community:{...base.community,months:base.community.months.map(month=>({...month,frac:0}))}};
        for(const bar of [1,3])for(const cured of [49,50]){
            const d={...cases[0],bar},t={...table,cureS:table.cureS.map((_,i)=>i<cured)};
            const text=diagnose(d,noSpread,t).join('');
            expect(text.includes('あまり広がりませんでした')).toBe(cured>=50);
            expect(text.includes('設計が役に立った')).toBe(cured>=50&&bar>=3);
        }
    });
    it('all 435 designs at seed one: every past problem and no-spread success matches observations',async()=>{
        let checked=0;
        for(let pot=1;pot<=5;pot++)for(let bar=1;bar<=5;bar++)for(let dur=1;dur<=5;dur++)for(let gentle=1;gentle<=5;gentle++){
            const d={pot,bar,dur,gentle};if(!canAfford(d))continue;
            const table=patientTable(d),result=yearOutcome(d,1,table),m=metrics(d,result,table);
            const rec=await recommend(d,1),diagnosis=diagnose(d,result,table);
            const text=[...diagnosis,...rec.sentences].join('');
            const context=JSON.stringify(d);
            if(/あまり広が/.test(text)){expect(m.sCure,context).toBeGreaterThanOrEqual(.5);expect(m.spread,context).toBe(false)}
            if(text.includes('設計が役に立った'))expect(bar,context).toBeGreaterThanOrEqual(3);
            if(/残っていました|残ってしまった患者|抑えきれませんでした|抑えきれなかった患者/.test(text))expect(m.ill,context).toBeGreaterThanOrEqual(5);
            if(/さまたげになりました|治療を続けられなかった患者/.test(text))expect(m.side,context).toBeGreaterThanOrEqual(5);
            if(/今回の課題でした|生き残り、広がってしまいました|回復をさまたげてしまいました/.test(text))expect(m.emerged+m.resistant,context).toBeGreaterThanOrEqual(5);
            if(text.includes('治療中に、薬が効きにくい細菌が生まれてしまった'))expect(m.emerged,context).toBeGreaterThanOrEqual(5);
            if(text.includes('感染し、治療が難しくなった'))expect(m.resistant,context).toBeGreaterThanOrEqual(5);
            if(mainIssue(m)==='ill'){
                const gains=limitingFactor(d,table);
                if(Math.abs(gains.gainDur-gains.gainPot)<.05)expect(diagnosis.join(''),context).toContain('殺菌力や効果が続く時間');
                else if(rec.candidate){
                    if(rec.candidate.pot>pot)expect(diagnosis.join(''),context).toContain('殺菌力が足りず');
                    if(rec.candidate.dur>dur)expect(diagnosis.join(''),context).toContain('効果が長続きせず');
                }
            }
            checkJapanese(diagnosis);checkJapanese(rec);checked++;
        }
        expect(checked).toBe(435);
    },900000);
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
