import {it, expect, vi} from 'vitest';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {readFileSync} from 'node:fs';
import {ResearcherRank, Result} from '../ui/screens/Result';
import {Glossary} from '../ui/components/Info';
import {ranks, glossary, chanceNote} from '../config/game';
import {resultImage} from '../share/card';
import {yearOutcome} from '../model';
import {initial} from './types';

it.each([0, 30, 60, 80, 95])('shows the complete rank scale for %i recovered patients', recovered => {
    const stages = [...ranks].reverse(), stage = [0, 30, 60, 80, 95].indexOf(recovered) + 1;
    const html = render(<ResearcherRank recovered={recovered}/>);
    const stars = html.match(/class="rank-stars"[\s\S]*?<\/div>/)![0];
    expect((stars.match(/★/g) || [])).toHaveLength(stage);
    expect((stars.match(/☆/g) || [])).toHaveLength(ranks.length - stage);
    expect(html).toContain(`全${ranks.length}段階中 ${stage}段階目`);
    const ladder = html.match(/<ol class="rank-ladder"[\s\S]*?<\/ol>/)![0];
    expect([...ladder.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map(match => match[1])).toEqual(stages.map(item => item.name));
    expect((ladder.match(/aria-current="step"/g) || [])).toHaveLength(1);
    expect(ladder).toContain(`aria-current="step" class="rank-current">${stages[stage - 1].name}</li>`);
    expect(html).toContain(chanceNote);
});

it('keeps the ladder within narrow screens with wrapping and highlights the current stage', () => {
    const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.rank-ladder\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.rank-ladder li\s*\{[^}]*max-width:\s*100%[^}]*overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/\.rank-ladder \.rank-current\s*\{[^}]*font-weight:\s*700[^}]*background:/);
});

it('saves all five star positions, their colors, and the stage below the large rank name', async () => {
    const calls: {text: string; x: number; y: number; font: string; color: string}[] = [];
    const noop = () => {};
    const context = {font: '', fillStyle: '', textAlign: '',
        fillText: (text: string, x: number, y: number) => calls.push({text, x, y, font: context.font, color: context.fillStyle}),
        fillRect: noop, beginPath: noop, arc: noop, fill: noop, stroke: noop, moveTo: noop, lineTo: noop, quadraticCurveTo: noop};
    vi.stubGlobal('document', {fonts: {ready: Promise.resolve()}, createElement: () => ({getContext: () => context, toDataURL: () => 'data:image/png;base64,test'})});
    try {
        const base = yearOutcome(initial, 7), stages = [...ranks].reverse();
        for (const [i, recovered] of [0, 30, 60, 80, 95].entries()) {
            calls.length = 0;
            await resultImage(initial, {...base, recovered}, 'test', 'https://example.org/');
            const stars = calls.filter(call => /^[★☆]$/.test(call.text));
            expect(stars.map(call => call.text).join('')).toBe('★'.repeat(i + 1) + '☆'.repeat(ranks.length - i - 1));
            expect(new Set(stars.map(call => call.font)).size).toBe(1);
            expect(stars.every((call, j) => call.color === (j <= i ? '#375a51' : '#7caa94'))).toBe(true);
            expect((stars[0].x + stars.at(-1)!.x) / 2).toBe(540);
            const name = calls.find(call => call.text === stages[i].name)!;
            const stage = calls.find(call => call.text === `全${ranks.length}段階中 ${i + 1}段階目`)!;
            expect(stage.y).toBeGreaterThan(name.y);
            expect(name.font).toContain('700 64px');
            expect(calls.filter(call => call !== name).every(call => parseInt(call.font.split(' ')[1]) < 64)).toBe(true);
        }
    } finally {vi.unstubAllGlobals();}
});

it('moves the dormant explanation into its own small card after the patient breakdown', () => {
    expect(glossary).not.toHaveProperty('一時的耐性状態');
    expect(render(<Glossary/>)).not.toContain('一時的耐性状態');
    expect(readFileSync(new URL('../ui/components/Info.tsx', import.meta.url), 'utf8')).not.toContain('一時的耐性状態');
    const noop = () => {}, r = yearOutcome(initial, 42);
    const html = render(<Result r={r} name="test" design={initial} save={noop} setScreen={noop} setDesign={noop} setModal={noop}/>);
    const card = html.match(/<section class="card dormant-card">[\s\S]*?<\/section>/)![0];
    expect(card).toContain('体の中の“眠っている菌”');
    expect(card).toContain('class="germ sleep"');
    expect(card).toContain('治療中、体の中には眠っていたり薬が届きにくい場所にいたりして、一時的に薬が効きにくい菌が少しいます。これは耐性菌とはちがい、目をさますと薬が効くようになります。治療のあとに少し菌が残ることがあるのはこのためで、多くは体の守る力で片づけられます。');
    expect(card.replace(/<[^>]*>/g, '')).not.toMatch(/[0-9０-９]/);
    expect(html.indexOf('② 100人の患者の回復人数')).toBeLessThan(html.indexOf(card));
    expect(html.indexOf(card)).toBeLessThan(html.indexOf('③ 耐性対策への研究投資の効果'));
});
