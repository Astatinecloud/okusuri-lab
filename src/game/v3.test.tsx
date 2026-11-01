import { readFileSync, readdirSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { labels, ranks } from '../config/game';
import { initial } from './types';
import { rank } from './result';
import { encode, decode } from '../share';
import { makeQR, resultImage } from '../share/card';
import { ResearcherRank, Result } from '../ui/screens/Result';
import { Title } from '../ui/screens/Title';
import { Story } from '../ui/screens/Story';
import { Simulation } from '../ui/screens/Simulation';
import { Lab } from '../ui/screens/Lab';
import { YearChart, monthNarration } from '../ui/components/YearChart';
import { Body } from '../ui/components/Body';
import { ResearchCoinBudget } from '../ui/components/Coin';
import { yearOutcome } from '../model';
const noop = () => { };
const source = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
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
        const lab = render(<Lab design={initial} busy={false} shake={false} change={noop} newName={noop} setModal={noop}/>);
        for (const text of Object.values(labels))
            expect(lab).toContain(text);
        expect((lab.match(/aria-pressed=/g) || [])).toHaveLength(20);
        expect((render(<ResearchCoinBudget design={initial}/>).match(/coin-icon/g) || [])).toHaveLength(9);
    });
    it('year result, five outcomes, solid charts and data-based narration', () => {
        const r = yearOutcome(initial, 42);
        const result = render(<Result r={r} name="test" design={initial} save={noop} setScreen={noop} setDesign={noop} setModal={noop}/>);
        expect(result.indexOf('研究者ランク')).toBeLessThan(result.indexOf('RESEARCH REPORT'));
        expect((result.match(/class="patient-icon /g) || [])).toHaveLength(105);
        for (const label of Object.values(labels))
            expect(result).toContain(label);
        expect(result).toContain('もう一度つくる（設定を保持）');
        expect(result).toContain('結果を保存・共有');
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
            expect(calls.filter(c => !c.text.startsWith('★')).every(c => parseInt(c.font.split(' ')[1]) <= 64)).toBe(true);
            expect(calls.some(c => c.text.includes('12か月目の耐性菌割合'))).toBe(true);
            for (const label of Object.values(labels))
                expect(calls.some(c => c.text.includes(label))).toBe(true);
            expect(ctx.fillRect.mock.calls.length).toBeGreaterThan(100);
        }
        finally {
            vi.unstubAllGlobals();
        }
    });
});
