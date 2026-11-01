/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { cost } from '../model';
import { analyzeDesign, cachedRun, compareDesigns } from './analysis';
import { causalNarrative, comparisonRows, parameterEvidence } from './analysisPresentation';
import { Body, Chart, Germ, Flask } from '../ui/components/Visuals';
import { ResearchCoinBudget } from '../ui/components/Coin';
import { PatientIcon, PatientLegend } from '../ui/components/PatientIcon';
import { Glossary } from '../ui/components/Info';
import { Title } from '../ui/screens/Title';
import { PerformanceAnalysis } from '../ui/components/PerformanceAnalysis';

const design = { pot: 5, mech: 1, dur: 2, gentle: 2 };

describe('review 4 coins', () => {
    it('shows nine illustrated coins with spent ones faded and the correct remainder', () => {
        const markup = renderToStaticMarkup(<ResearchCoinBudget design={design} />);
        expect(markup).toContain('研究コイン 残り 3 / 9');
        expect(markup.match(/class="coin-icon"/g)).toHaveLength(9);
        expect(markup.match(/class="spent"/g)).toHaveLength(cost(design));
        expect(markup).toContain('研究コインはゲーム上の単位で、実際の費用ではありません。');
    });

    it('uses model coin units for analysis, table differences, breakdown and causal prose', () => {
        const analysis = analyzeDesign(design);
        const comparison = compareDesigns(design, { ...design, pot: 4 });
        expect(comparison.delta.cost).toBe(1);
        const row = comparisonRows(design, analysis, comparison).find(row => row.label === '研究コイン（枚）')!;
        expect(row).toEqual({ label: '研究コイン（枚）', comparison: '5', current: '6', difference: '+1' });
        const mechanism = parameterEvidence(design, 'mech', analysis);
        expect(causalNarrative('mech', mechanism)).toContain('研究コインは +1枚');
        const html = renderToStaticMarkup(<PerformanceAnalysis design={design} analysis={analysis} />);
        expect(html).toContain('研究コインの内訳');
        expect(html).toContain('width:44.44444444444444%');
        expect(html).toContain('研究コイン +1枚');
    });

    it('contains no point or old budget literals in UI strings', () => {
        const sources = import.meta.glob<string>([
            '../ui/**/*.tsx', '../config/game.ts', '../App.tsx', '../share/card.ts',
            './analysisPresentation.ts', './presentation.ts', './result.ts',
        ], { query: '?raw', import: 'default', eager: true });
        for (const [file, source] of Object.entries(sources)) {
            const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true,
                file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
            function visit(node: ts.Node) {
                if (ts.isStringLiteralLike(node) || ts.isJsxText(node)) {
                    const value = node.text;
                    expect(value, file + ': ' + value).not.toMatch(/ pt|90|研究開発費|予算外/);
                }
                ts.forEachChild(node, visit);
            }
            visit(tree);
        }
    });
});

describe('review 4 restored v1 illustrations', () => {
    it('restores original round germ faces, purple barrier and translucent sleeping state', () => {
        const normal = renderToStaticMarkup(<Germ />);
        const resistant = renderToStaticMarkup(<Germ res />);
        const sleeping = renderToStaticMarkup(<Germ sleep />);
        expect(normal).toContain('#e3efbb');
        expect(normal).toContain('#acd266');
        expect(normal).toContain('M18 22v3m14-3v3M20 31q5 5 10 0');
        expect(resistant).toContain('#b291cc');
        expect(resistant).toContain('stroke="#ad8aca"');
        for (const html of [normal, resistant]) expect(html).toContain('r="22"');
        expect(sleeping).toContain('class="germ sleep"');
        expect(sleeping).toContain('zzz');
    });

    it('restores the person SVG states and keeps the v2 outcome labels', () => {
        const well = renderToStaticMarkup(<PatientIcon status="well" />);
        const ill = renderToStaticMarkup(<PatientIcon status="ill" />);
        const side = renderToStaticMarkup(<PatientIcon status="side" />);
        expect(well).toContain('#c5e4ce');
        expect(well).toContain('M15 22q5 6 10 0');
        expect(ill).toContain('M16 23h8');
        expect(side).toContain('rotate(-25 27 30)');
        const legend = renderToStaticMarkup(<PatientLegend />);
        for (const label of ['回復', '感染が残存', '副作用で中断']) expect(legend).toContain(label);
        expect(legend.match(/<svg/g)).toHaveLength(3);
    });

    it('keeps the restored title art, glossary art and trace-driven simulation effects', () => {
        const title = renderToStaticMarkup(<Title setScreen={() => {}} setModal={() => {}} />);
        expect(title).toContain('hero-art');
        expect(title).toContain('hero-capsule');
        expect(title).toContain('薬剤耐性菌にも作用する新薬を設計しよう');
        expect(renderToStaticMarkup(<Flask />)).toContain('class="flask"');
        const point = cachedRun(design).representative.trace[0];
        const body = renderToStaticMarkup(<Body point={point} design={design} />);
        expect(body).toContain('barrier-bounce');
        expect(body).toContain('capsule particle');
        expect(body).toContain('一時的耐性状態（薬が届きにくい部位・休眠）');
        expect(renderToStaticMarkup(<Body point={point} design={{ ...design, mech: 4 }} />)).toContain('barrier-pass');
        expect(renderToStaticMarkup(<Glossary />).match(/class="germ/g)).toHaveLength(3);
    });

    it('uses original chart colors without losing overlay dashes and markers', () => {
        const trace = cachedRun(design).representative.trace;
        const html = renderToStaticMarkup(<Chart trace={trace} comparison={trace} />);
        for (const color of ['#86ad39', '#9870bc']) expect(html).toContain(color);
        for (const dash of ['10 6', '2 5']) expect(html).toContain('stroke-dasharray="' + dash + '"');
        expect(html).toContain('circle');
    });
});

it('keeps AA text contrast in the warm palette', () => {
    function luminance(hex: string): number {
        const channels = hex.match(/[a-f0-9]{2}/gi)!.map(value => parseInt(value, 16) / 255)
            .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
        return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
    }
    const pairs = [
        ['375a51', 'fff8ec'], ['56685f', 'edf0e7'], ['ffffff', '39745e'],
        ['294d46', 'cdb7df'], ['375a51', 'efc4a6'], ['a04b2a', 'fff8ec'], ['665078', 'fffaf1'],
    ];
    for (const [foreground, background] of pairs) {
        const a = luminance(foreground);
        const b = luminance(background);
        expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toBeGreaterThanOrEqual(4.5);
    }
});
