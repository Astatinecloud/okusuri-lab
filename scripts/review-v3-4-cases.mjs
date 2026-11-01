// Run after npm run build. Executes the application's built worker, with a Node
// transport adapter, so recommendation timings include the actual production code.
import { readdir, appendFile } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
const assets = new URL('../dist/assets/',import.meta.url);
const bundle = (await readdir(assets)).find(name=>/^investment\.worker-.*\.js$/.test(name));
if(!bundle) throw new Error('Run npm run build first');
const workerUrl = new URL(bundle,assets).href;
const bridge = `
const {parentPort}=require('node:worker_threads');
globalThis.self=globalThis;
globalThis.postMessage=data=>parentPort.postMessage(data);
import(${JSON.stringify(workerUrl)}).then(()=>{
 parentPort.on('message',data=>self.onmessage({data}));
 parentPort.postMessage({type:'ready'});
});`;
const cases = [[5,1,2,4],[2,4,2,4],[2,5,1,4],[3,3,3,1],[2,4,2,5],[3,4,2,4],[2,4,2,5]];
for(const [index,levels] of cases.entries()) {
    const design=Object.fromEntries(['pot','bar','dur','gentle'].map((key,i)=>[key,levels[i]]));
    const start=performance.now();
    const advice=await new Promise((resolve,reject)=>{
        const worker=new Worker(bridge,{eval:true});
        worker.on('error',reject);
        worker.on('message',message=>{
            if(message.type==='ready')worker.postMessage({type:'advice',design,seed:1});
            else {worker.terminate();message.type==='advice-complete'?resolve(message.advice):reject(new Error('Advice worker failed'))}
        });
    });
    const wallMs=performance.now()-start;
    console.log(JSON.stringify({case:index+1,design,seed:1,wallMs,...advice}));
    if(process.argv.includes('--report')) {
        const m=advice.metrics,e=advice.evaluation,r=advice.recommendation;
        const coins=levels.reduce((total,level)=>total+level-1,0);
        const formatDesign=d=>['pot','bar','dur','gentle'].map(key=>d[key]).join(',');
        const report=[
            '',`### ケース${index+1}: (${levels.join(',')})、seed=1`,
            '',`- 使用コイン ${coins}/9。回復 ${m.well}人、治りきらない ${m.ill}人、治療中の耐性 ${m.emerged}人、耐性菌感染 ${m.resistant}人、副作用 ${m.side}人。`,
            `- 体内治癒割合 ${m.sCure.toFixed(3)}、年末の広がり ${m.spread?'あり':'なし'}。共通31回の平均回復 ${e.meanRecovered.toFixed(3)}人、広がる割合 ${(e.spreadProbability*100).toFixed(2)}%。`,
            `- 最良候補の平均回復差 ${r.gain.toFixed(3)}人。提案設計 ${r.candidate?'('+formatDesign(r.candidate)+')':'回復人数の明確な改善なし'}。${r.secondaryCandidate?'補足提案設計 ('+formatDesign(r.secondaryCandidate)+')。':''}`,
            `- Workerのrecommend ${advice.recommendMs.toFixed(1)}ms、診断を含む計算全体 ${advice.elapsedMs.toFixed(1)}ms、起動込み ${wallMs.toFixed(1)}ms。`,
            ...(advice.limiting?[`- 内部反実仮想: gainDur=${advice.limiting.gainDur.toFixed(3)}、gainPot=${advice.limiting.gainPot.toFixed(3)}。`]:[]),
            '', '**今回のお薬はどうだった？**', '', ...advice.diagnosis.map(text=>'- '+text),
            '', '**次に改良するなら？**', '', ...(r.parameter?['- '+r.parameter]:[]),...r.sentences.map(text=>'- '+text),'',
        ].join('\n');
        await appendFile(new URL('../docs/codex-report.md',import.meta.url),report,'utf8');
    }
}
