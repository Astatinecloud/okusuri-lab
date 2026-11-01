import { readFileSync, readdirSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup as render } from 'react-dom/server';
import ts from 'typescript';
import { labels, ranks, chanceNote, titleScience, titleScienceNote, adult } from '../config/game';
import { initial } from './types';
import { rank } from './result';
import { encode, decode } from '../share';
import { makeQR, resultImage } from '../share/card';
import { ResearcherRank, Result, StatisticsProgress } from '../ui/screens/Result';
import { Title } from '../ui/screens/Title';
import { Story, story } from '../ui/screens/Story';
import { Simulation } from '../ui/screens/Simulation';
import { Lab } from '../ui/screens/Lab';
import { YearChart, monthNarration, niceAxis } from '../ui/components/YearChart';
import { Body } from '../ui/components/Body';
import { ResearchCoinBudget } from '../ui/components/Coin';
import { GameDialog } from '../ui/components/GameDialog';
import { yearOutcome } from '../model';
const noop = () => { };
const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const bannedModelText = ['μ', 'f×c', 'f × c', 'EC50', 'G(t)', 'Hill', 'ロジスティック', 'βR', 'gR', 'gS', 'crowd', 'Ki', 'tau-leaping', 'RK4', 'Emax', 'Poisson', 'SIS', 'Δt', 'S0', 'pEmerge', '副作用係数', '半減期'];
describe('v3 experience', () => {
    it('rank names and thresholds unchanged', () => {
        expect(ranks).toEqual([{ min: 95, stars: 5, name: '創薬プロジェクトリーダー' }, { min: 80, stars: 4, name: '主任研究員' }, { min: 60, stars: 3, name: '研究員' }, { min: 30, stars: 2, name: '研究補助員' }, { min: 0, stars: 1, name: '研修生' }]);
        for (const n of [0, 29, 30, 59, 60, 79, 80, 94, 95, 100])
            expect(render(<ResearcherRank recovered={n}/>)).toContain(rank(n).name);
        const css = source('style.css');
        expect(css).toContain('font-size: clamp(2.6rem, 6vw, 3rem)');
        expect(css).toContain('.coin-summary { font-size: 1rem; }');
    });
    it('share seed, Unicode, old URL and invalid URL handling', () => {
        const d = { pot: 3, bar: 3, dur: 2, gentle: 4 };
        const hash = encode(d, '新薬🌱', 0xffffffff);
        expect(decode(hash)).toEqual({ design: d, name: '新薬🌱', seed: 0xffffffff });
        expect(decode('#r=3324')?.seed).toBe(4324);
        expect(decode('#r=1111&s=0')?.seed).toBe(0);
        for (const value of ['-1', '1.5', 'NaN', '4294967296', ''])
            expect(decode('#r=1111&s=' + value)).toBe(null);
        expect(decode('#r=5555')).toBe(null);
        expect(decode('#r=1061')).toBe(null);
        expect(makeQR('http://localhost/' + hash).getModuleCount()).toBeGreaterThan(20);
    });
    it('intro, coins and consistent research labels', () => {
        expect(render(<Title setScreen={noop} setModal={noop}/>)).toContain('新薬を開発して、1年間で100人の患者を救おう');
        expect(render(<Story setScreen={noop}/>)).toContain('新薬の開発をはじめる');
        const brief=readFileSync(new URL('../../docs/review-v3-1.md',import.meta.url),'utf8');
        const exactStory=brief.split('2. **Story text')[1].split('3. **Statistics')[0].split('\n').slice(1).map(line=>line.trim()).filter(Boolean);
        expect(story).toEqual(exactStory);
        expect((render(<Story setScreen={noop}/>).match(/<p>/g)||[])).toHaveLength(9);
        const lab = render(<Lab design={initial} busy={false} shake={false} change={noop} newName={noop} setModal={noop}/>);
        for (const text of Object.values(labels))
            expect(lab).toContain(text);
        expect((lab.match(/aria-pressed=/g) || [])).toHaveLength(20);
        expect((render(<ResearchCoinBudget design={initial}/>).match(/coin-icon/g) || [])).toHaveLength(9);
    });
    it('year result, five outcomes, solid charts and data-based narration', () => {
        const r = yearOutcome(initial, 42);
        const result = render(<Result r={r} name="test" design={initial} save={noop} setScreen={noop} setDesign={noop} setModal={noop}/>);
        const scienceSection = result.match(/<details><summary>科学的な解説<\/summary>([\s\S]*?)<\/details>/)![1];
        expect((scienceSection.match(/class="science-card"/g)||[])).toHaveLength(3);
        expect([...scienceSection.matchAll(/<h3>(.*?)<\/h3>/g)].map(match=>match[1])).toEqual(titleScience.map(([title])=>title));
        for (const [heading, text] of titleScience) expect(scienceSection).toContain('<h3>'+heading+'</h3><p>'+text+'</p>');
        expect(scienceSection).toContain('<p class="tiny">'+titleScienceNote+'</p>');
        for (const term of [...bannedModelText,'用語集']) expect(scienceSection).not.toContain(term);
        const sections=['研究者ランク','診断結果','今回のお薬はどうだった？','次に改良するなら？','くわしい結果','① 1年間の細菌の変化','② 100人の患者の回復人数','③ 耐性対策への研究投資の効果'];
        sections.slice(1).forEach((heading,i)=>expect(result.indexOf(sections[i])).toBeLessThan(result.indexOf(heading)));
        expect(result).toContain(' / 100人が回復');
        expect(result).toContain('考え中…');
        expect((result.match(/class="patient-icon /g) || [])).toHaveLength(105);
        for (const label of Object.values(labels))
            expect(result).toContain(label);
        expect(result).toContain('もう一度つくる（設定を保持）');
        expect(result).toContain('結果を保存・共有');
        expect(result.split(chanceNote)).toHaveLength(3);
        expect(render(<Simulation r={r} design={initial} elapsedMonths={0} setScreen={noop}/>)).toContain('1か月目 / 12か月');
        expect(render(<Simulation r={r} design={initial} elapsedMonths={12} setScreen={noop}/>)).toContain('12か月目 / 12か月');
        const chart = render(<YearChart months={r.community.months}/>);
        expect(chart).not.toContain('stroke-dasharray');
        expect(chart).toContain('感染者数（人）');
        expect(chart).toContain('割合（%）');
        const custom = r.community.months.map((m, i) => ({ ...m, emergences: i === 2 ? 1 : 0, frac: i >= 4 ? .2 : 0 }));
        expect(monthNarration(custom, 2)).toContain('生まれた');
        expect(monthNarration(custom, 4)).toContain('広がりはじめ');
        expect(monthNarration(custom, 0)).not.toContain('生まれた');
        expect((render(<Body fraction={.25}/>).match(/#b291cc/g) || [])).toHaveLength(10);
    });
    it('removes obsolete UI terminology and analysis/comparison modules', () => {
        function scan(dir: string): string {
            return readdirSync(new URL('../' + dir, import.meta.url), { withFileTypes: true })
                .filter(f => !f.name.includes('.test.'))
                .map(f => f.isDirectory() ? scan(dir + '/' + f.name) : source(dir + '/' + f.name)).join('\n');
        }
        const all = scan('ui') + source('config/game.ts');
        for (const term of ['薬剤感受性菌', '殺菌力重視', 'パラメータ比較', '新薬の性能分析', '比較を重ねて表示'])
            expect(all).not.toContain(term);
        const literals:string[]=[];
        const ast=ts.createSourceFile('ui.tsx',all+source('App.tsx')+source('share/card.ts'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
        function visit(node:ts.Node){
            if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isJsxText(node))literals.push(node.text);
            ts.forEachChild(node,visit);
        }
        visit(ast);
        for(const term of ['薬剤感受性菌','感受性菌','pt']) expect(literals.filter(text=>text.includes(term))).toEqual([]);
        expect(source('App.tsx')).toContain('crypto.getRandomValues');
        expect(source('game/investment.ts')).toContain('new Worker');
        expect(source('game/investment.ts')).toContain('cache.set');
    });
    it('canvas card keeps QR and uses the largest centered rank', async () => {
        const calls: {
            text: string;
            y: number;
            font: string;
            align: string;
        }[] = [];
        const ctx = { font: '', textAlign: '', fillStyle: '', fillText: vi.fn((text: string, _x: number, y: number) => calls.push({ text, y, font: ctx.font, align: ctx.textAlign })), fillRect: vi.fn(), beginPath: noop, arc: noop, fill: noop, stroke: noop, moveTo: noop, lineTo: noop, quadraticCurveTo: noop };
        const toDataURL = vi.fn(() => 'data:image/png;base64,test');
        vi.stubGlobal('document', { fonts: { ready: Promise.resolve() }, createElement: () => ({ getContext: () => ctx, toDataURL }) });
        try {
            const r = yearOutcome(initial, 7);
            expect(await resultImage(initial, r, 'test', 'https://example.org/' + encode(initial, 'test', 7))).toContain('data:image/png');
            const title = calls.find(c => c.text === rank(r.recovered).name)!;
            expect(title.font).toContain('700 64px');
            expect(title.align).toBe('center');
            expect(calls.filter(c => c!==title&&!c.text.startsWith('★')).every(c => parseInt(c.font.split(' ')[1]) < 64)).toBe(true);
            expect(calls.some(c => c.text.includes('12か月目の耐性菌割合'))).toBe(true);
            for (const label of Object.values(labels))
                expect(calls.some(c => c.text.includes(label))).toBe(true);
            expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(100);
        }
        finally {
            vi.unstubAllGlobals();
        }
    });
    it('round chart ticks preserve actual monthly means',()=>{
        expect(niceAxis(91)).toEqual({max:100,ticks:[0,25,50,75,100]});
        expect(niceAxis(68)).toEqual({max:80,ticks:[0,20,40,60,80]});
        expect(niceAxis(0).ticks).toEqual([0,2.5,5,7.5,10]);
        const months=Array.from({length:12},(_,i)=>({month:i+1,YS:i===0?90.75:60.125,YR:23.625,frac:.2,emergences:0}));
        const before=JSON.stringify(months),html=render(<YearChart months={months}/>);
        const point=html.match(/<circle[^>]*cx="55"[^>]*cy="([^"]+)"/)!;
        expect(Number(point[1])).toBeCloseTo(55.2625,10); // actual mean, no rounding
        expect(JSON.stringify(months)).toBe(before);
    });
    it('progress text and phone table constraints',()=>{
        for(const count of [0,1,2,3,4,5])expect(render(<StatisticsProgress completed={count}/>)).toContain(count+'/5 レベル計算済み');
        const css=source('style.css');
        expect(css).toMatch(/\.table-scroll table\s*\{[^}]*min-width:\s*0[^}]*table-layout:\s*fixed/);
        expect(css).toMatch(/\.table-scroll caption\s*\{[^}]*white-space:\s*normal[^}]*overflow-wrap:\s*anywhere/);
    });
    it('title science dialog has exactly three verbatim cards and the small note',()=>{
        const expected = [
            ['なぜ新しい薬が必要なの？','細菌の中には、これまでの薬が効きにくいものもいます。そこで、新しい薬の開発が必要になります。'],
            ['薬剤耐性菌ってなに？','特定の薬が効きにくい細菌のことです。薬を使うことで、耐性菌が生き残り、増えてしまうことがあります。'],
            ['このゲームでは？','研究予算を使って、薬の強さ・耐性の生じにくさ・効果が続く時間・安全性を工夫し、100人の患者を救う新薬を開発します。'],
        ];
        expect(titleScience).toEqual(expected);
        expect(titleScienceNote).toBe('このゲームは科学を学ぶための簡略化したシミュレーションです。実際の治療結果を予測するものではありません。');
        const html=render(<GameDialog modal="science" setModal={noop} name="test" setName={noop} newName={noop} finish={noop}/>);
        expect((html.match(/class="science-card"/g)||[])).toHaveLength(3);
        expect([...html.matchAll(/<h3>(.*?)<\/h3>/g)].map(match=>match[1])).toEqual(expected.map(([title])=>title));
        for(const [title,text] of expected)expect(html).toContain('<h3>'+title+'</h3><p>'+text+'</p>');
        expect(html).toContain('<p class="tiny">'+titleScienceNote+'</p>');
        expect(html).toContain('>とじる</button>');
        for(const term of ['μ','EC50','G(t)','Hill','ロジスティック','モデルについて','用語集',adult])expect(html).not.toContain(term);
        expect(source('ui/components/GameDialog.tsx')).not.toContain("modal === 'mechanism'");
        const css=source('style.css');
        expect(css).toMatch(/\.title-science-dialog\s*\{[^}]*overflow-y:\s*auto[^}]*overflow-wrap:\s*anywhere/);
        expect(css).toContain('width:calc(100% - 32px)');
        expect(css).toContain('max-height:85dvh');
    });
    it('all UI text, tooltips, glossary and saved-card strings omit model formulas',()=>{
        function files(dir:string):string[] {
            return readdirSync(new URL('../'+dir,import.meta.url),{withFileTypes:true})
                .flatMap(file=>file.isDirectory()?files(dir+'/'+file.name):/\.(ts|tsx)$/.test(file.name)&&!file.name.includes('.test.')?[dir+'/'+file.name]:[]);
        }
        const paths=[...files('ui'),...files('share'),'config/game.ts','App.tsx'];
        const matches:string[]=[];
        for(const path of paths){
            const ast=ts.createSourceFile(path,source(path),ts.ScriptTarget.Latest,true,path.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
            function visit(node:ts.Node){
                if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node)||ts.isJsxText(node)||ts.isTemplateHead(node)||ts.isTemplateMiddle(node)||ts.isTemplateTail(node)) {
                    for(const token of bannedModelText) if(node.text.includes(token))matches.push(path+': '+token);
                }
                ts.forEachChild(node,visit);
            }
            visit(ast);
        }
        expect(matches).toEqual([]);
        expect(source('config/game.ts')).not.toMatch(/export const science\s*=/);
        expect(source('ui/components/PerformanceSetting.tsx')).not.toContain('internalValue');
    });
});
