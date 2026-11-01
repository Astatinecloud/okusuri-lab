// Run after npm run build. Executes the actual Vite worker bundle in an isolated
// Node worker with only the browser message transport adapted to worker_threads.
import { readdir, readFile } from 'node:fs/promises';
import { Worker } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
const assets = new URL('../dist/assets/', import.meta.url);
const bundle = (await readdir(assets)).find(name => /^investment\.worker-.*\.js$/.test(name));
if (!bundle) throw new Error('Build the application before benchmarking.');
const workerUrl = new URL(bundle, assets).href;
const params=JSON.parse(await readFile(new URL('../src/config/params3.json',import.meta.url),'utf8'));
const bridge = `
    const { parentPort } = require('node:worker_threads');
    globalThis.self = globalThis;
    globalThis.postMessage = data => parentPort.postMessage(data);
    import(${JSON.stringify(workerUrl)}).then(() => {
        parentPort.on('message', data => self.onmessage({data}));
        parentPort.postMessage({type:'ready'});
    });
`;
const worker = new Worker(bridge, {eval:true});
const design={pot:2,bar:3,dur:2,gentle:4};
const started=performance.now();
worker.on('message', message => {
    if(message.type==='ready') worker.postMessage(design);
    else if(message.type==='progress') console.log(`${message.completed}/5 levels at ${(performance.now()-started).toFixed(1)} ms`);
    else {
        console.log(JSON.stringify({design,dt:params.community.dt,seedsPerLevel:params.nSeedsStats,workerElapsedMs:message.elapsedMs,wallElapsedMs:performance.now()-started,rows:message.rows},null,2));
        worker.terminate();
    }
});
worker.on('error', error => {console.error(error);process.exitCode=1});
