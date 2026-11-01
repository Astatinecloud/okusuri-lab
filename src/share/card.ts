import qrcode from 'qrcode-generator';
import { cost, keys, type Design, type Result } from '../model';
import { labels, adult } from '../config/game';
import { rank } from '../game/result';
import { prepareAnalysis } from '../game/analysis';
import { strongestSummary } from '../game/analysisPresentation';
import { populationChange, wrapJapanese } from '../game/presentation';

export function makeQR(url: string) {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return qr;
}

function drawQR(context: CanvasRenderingContext2D, url: string) {
    const qr = makeQR(url);
    const modules = qr.getModuleCount();
    const size = 240;
    const cell = size / (modules + 8);
    const left = (1080 - size) / 2;
    const top = 990;
    context.fillStyle = '#1F2933';
    for (let row = 0; row < modules; row++) {
        for (let column = 0; column < modules; column++) {
            if (qr.isDark(row, column)) {
                context.fillRect(left + (column + 4) * cell, top + (row + 4) * cell, Math.ceil(cell), Math.ceil(cell));
            }
        }
    }
}

export async function resultImage(design: Design, result: Result, name: string, url: string) {
    await document.fonts.ready;
    const analysis = await prepareAnalysis(design);
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, 1080, 1350);
    context.textAlign = 'center';

    function text(value: string, y: number, size = 30, color = '#1F2933') {
        context.fillStyle = color;
        context.font = '500 ' + size + 'px "Noto Sans JP", sans-serif';
        context.fillText(value, 540, y);
    }

    text('おくすり発明ラボ', 70, 36);
    text(name, 135, 48, '#2563EB');
    text('回復した患者 ' + result.recovered + ' / 100 人', 220, 52, '#0F9D76');
    text('回復 ' + result.recovered + ' / 感染が残存 ' + (100 - result.recovered - result.seDrop)
        + ' / 副作用で中断 ' + result.seDrop, 275, 27);
    const representative = result.representative;
    text('薬剤感受性菌：' + populationChange(representative.normStart, representative.normEnd).fold, 330, 29);
    text('薬剤耐性菌：' + populationChange(representative.resStart, representative.resEnd).fold, 375, 29);
    text('研究開発費 ' + cost(design) * 10 + ' / 90 pt', 430, 30);

    keys.forEach((key, row) => {
        context.textAlign = 'left';
        context.font = '500 29px "Noto Sans JP", sans-serif';
        context.fillStyle = '#1F2933';
        context.fillText(labels[key], 70, 535 + row * 55);
        for (let index = 0; index < 5; index++) {
            context.fillStyle = index < design[key] ? '#2563EB' : '#E3E8ED';
            context.fillRect(700 + index * 60, 516 + row * 55, 52, 24);
        }
    });
    context.textAlign = 'center';
    const researcher = rank(result.recovered);
    text('★'.repeat(researcher.stars), 765, 32);
    text(researcher.name, 812, 34);
    context.font = '500 28px "Noto Sans JP", sans-serif';
    const summary = strongestSummary(analysis);
    const lines = wrapJapanese(summary, 920, value => context.measureText(value).width);
    lines.forEach((line, index) => text(line, 865 + index * 40, 28));
    drawQR(context, url);
    text('QRから同じ設計の結果を確認できます', 1260, 24);
    text(adult.split('。')[0] + '。', 1310, 25);
    return canvas.toDataURL('image/png');
}
