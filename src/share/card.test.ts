import { afterEach, expect, it, vi } from 'vitest';
import { runDesign } from '../model';
import { rank } from '../game/result';
import { resultImage } from './card';

afterEach(() => vi.unstubAllGlobals());

it('draws a 1080×1350 card with rank stars, four five-step bars, and QR instructions', async () => {
    const context = {
        fillStyle: '',
        font: '',
        textAlign: '',
        fillRect: vi.fn(),
        fillText: vi.fn(),
        measureText: (text: string) => ({ width: Array.from(text).length * 28 }),
    };
    const canvas = {
        width: 0,
        height: 0,
        getContext: () => context,
        toDataURL: vi.fn(() => 'data:image/png;base64,test'),
    };
    vi.stubGlobal('document', {
        fonts: { ready: Promise.resolve() },
        createElement: () => canvas,
    });
    const design = { pot: 5, mech: 1, dur: 2, gentle: 2 };
    const result = runDesign(design);
    const image = await resultImage(design, result, 'キラリン', 'https://example.test/#r=5122');
    expect(image).toBe('data:image/png;base64,test');
    expect(canvas.width).toBe(1080);
    expect(canvas.height).toBe(1350);
    expect(canvas.toDataURL).toHaveBeenCalledWith('image/png');
    const texts = context.fillText.mock.calls.map(call => call[0] as string);
    expect(texts).toContain('★'.repeat(rank(result.recovered).stars));
    expect(texts).toContain('このカードのQRで けっかを見られるよ');
    expect(texts).toContain('教育用の簡単なモデルです');
    const commentLines = context.fillText.mock.calls.filter(call => Number(call[2]) >= 775 && Number(call[2]) < 1030);
    expect(commentLines.length).toBeGreaterThan(0);
    expect(commentLines.every(call => !/^[！、。？]/.test(String(call[0])))).toBe(true);
    for (let row = 0; row < 4; row++) {
        const bars = context.fillRect.mock.calls.filter(call => call[1] === 516 + row * 55 && call[2] === 52 && call[3] === 24);
        expect(bars).toHaveLength(5);
    }
});
