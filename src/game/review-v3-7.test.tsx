import {it, expect, vi} from 'vitest';
import {renderToStaticMarkup as render} from 'react-dom/server';
import {isValidElement, type ReactElement, type ReactNode} from 'react';
import {Body, PEOPLE_PER_ICON, icons, iconCounts, reconcileSlots} from '../ui/components/Body';
import {ResultAdvice} from '../ui/components/ResultAdvice';
import {descriptions, benefits, drawbacks} from '../config/game';
import {Simulation} from '../ui/screens/Simulation';
import {params3, type Result} from '../model';

it('uses a fixed ten-person scale including small nonzero populations', () => {
    expect(PEOPLE_PER_ICON).toBe(10);
    expect([0, .03, 4, 15, 390].map(icons)).toEqual([0, 1, 1, 2, 39]);
    const html = render(<Body YS={390} YR={0}/>);
    expect(html).toContain('その月の地域の菌のようす');
    expect((html.match(/data-slot=/g) || [])).toHaveLength(39);
    expect(html).toContain('新薬が効く菌に感染している人：約390人');
    expect(html).toContain('耐性菌に感染している人：約0人');
    expect(html).not.toContain('表示の上限です');
    expect(render(<Body YS={.03} YR={.7}/>)).toContain('耐性菌に感染している人：1人未満');
    expect((render(<Body YS={0} YR={0}/>).match(/data-slot=/g) || [])).toHaveLength(0);
});
it('caps at forty proportionally, retaining visible resistant bacteria', () => {
    expect(iconCounts(600, 200)).toEqual({green: 30, purple: 10, capped: true});
    expect(iconCounts(920, .03)).toEqual({green: 39, purple: 1, capped: true});
    expect(iconCounts(0, 920)).toEqual({green: 0, purple: 40, capped: true});
    expect(iconCounts(400, 0).capped).toBe(false);
    const html = render(<Body YS={600} YR={200}/>);
    expect((html.match(/data-slot=/g) || [])).toHaveLength(40);
    expect((html.match(/data-resistant="true"/g) || [])).toHaveLength(10);
    expect(html).toContain('表示の上限です（実際はもっと多い）');
});
it('removes from the end of each color and adds in free slots without moving survivors', () => {
    const initial = reconcileSlots([], 30, 10);
    const less = reconcileSlots(initial, 12, 2);
    expect(less.filter(g => !g.res)).toEqual(initial.filter(g => !g.res).slice(0, 12));
    expect(less.filter(g => g.res)).toEqual(initial.filter(g => g.res).slice(0, 2));
    expect(less).toHaveLength(14);
    const more = reconcileSlots(less, 20, 6);
    for (const germ of less) expect(more).toContainEqual(germ);
    expect(new Set(more.map(g => g.slot)).size).toBe(26);
    expect(more).toEqual(reconcileSlots(less, 20, 6));
    expect(reconcileSlots(more, 0, 0)).toEqual([]);
});
it('shows initial state before month one and then the actual monthly populations', () => {
    const months = Array.from({length: 12}, (_, i) => ({month: i + 1, YS: 15 + i, YR: .03, frac: .001, emergences: 0}));
    const r = {community: {months}} as Result;
    const props = {r, design: {pot: 1, bar: 1, dur: 1, gentle: 1}, setScreen: () => {}};
    expect(render(<Simulation {...props} elapsedMonths={0}/>)).toContain(`新薬が効く菌に感染している人：約${params3.community.Y0}人`);
    expect(render(<Simulation {...props} elapsedMonths={1}/>)).toContain('新薬が効く菌に感染している人：約15人');
    expect(render(<Simulation {...props} elapsedMonths={12}/>)).toContain('新薬が効く菌に感染している人：約26人');
    expect(render(<Simulation {...props} elapsedMonths={11.9}/>)).toContain('12か月目 / 12か月');
});
it('uses the exact barrier descriptions', () => {
    expect(descriptions.bar).toBe('薬が効かない「耐性菌」が生まれにくくなるように、薬の仕組みを工夫する研究です。すでにいる耐性菌を直接倒す効果はありません。');
    expect(benefits.bar).toBe('耐性菌が生まれる可能性を下げられます。耐性菌が増えにくくなるので、地域への広がりも抑えられます。');
    expect(drawbacks.bar).toBe('研究コインが必要で、副作用も少し増えます。また、どれだけ研究しても、耐性菌の出現を完全に防ぐことはできません。');
});
it('renders independent spinners and completed sections in either order', () => {
    const pending = render(<ResultAdvice/>);
    expect((pending.match(/class="loading-spinner"/g) || [])).toHaveLength(2);
    expect(pending).toContain('お薬の結果をまとめています…');
    expect(pending).toContain('次の改良ポイントを考えています…');
    expect((pending.match(/role="status" aria-live="polite"/g) || [])).toHaveLength(2);
    const diagnosis = render(<ResultAdvice diagnosis={{value: ['診断が完了しました。'], error: false}}/>);
    expect(diagnosis).toContain('診断が完了しました。');
    expect(diagnosis).not.toContain('お薬の結果をまとめています…');
    expect(diagnosis).toContain('次の改良ポイントを考えています…');
    const recommendation = render(<ResultAdvice recommendation={{value: {sentences: ['提案が完了しました。'], gain: 0}, error: false}}/>);
    expect(recommendation).toContain('お薬の結果をまとめています…');
    expect(recommendation).not.toContain('次の改良ポイントを考えています…');
});
it('renders an error without a spinner and wires retry to only the failed part', () => {
    const retryDiagnosis = vi.fn(), retryRecommendation = vi.fn();
    const props = {diagnosis: {value: null, error: true}, recommendation: {value: {sentences: ['提案済み'], gain: 0}, error: false}, retryDiagnosis, retryRecommendation};
    const html = render(<ResultAdvice {...props}/>);
    expect(html).toContain('うまく計算できませんでした。');
    expect(html).toContain('もう一度ためす');
    expect(html).not.toContain('loading-spinner');
    // Walk the functional element tree to exercise the actual button callback.
    function clickRetry(node: ReactNode): void {
        if (Array.isArray(node)) {node.forEach(clickRetry); return;}
        if (!isValidElement(node)) return;
        const element = node as ReactElement<{children?: ReactNode; onClick?: () => void}>;
        if (typeof element.type === 'function') {
            clickRetry((element.type as (props: unknown) => ReactNode)(element.props));
        } else if (element.type === 'button') element.props.onClick?.();
        else clickRetry(element.props.children);
    }
    clickRetry(ResultAdvice(props));
    expect(retryDiagnosis).toHaveBeenCalledOnce();
    expect(retryRecommendation).not.toHaveBeenCalled();
    const restarting = render(<ResultAdvice {...props} diagnosis={{value: null, error: false}}/>);
    expect(restarting).toContain('お薬の結果をまとめています…');
    expect(restarting).toContain('提案済み');
    expect(restarting).not.toContain('うまく計算できませんでした。');
});
