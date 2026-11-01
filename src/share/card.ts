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

/** The original Germ's two circles, eyes and smile, drawn without external assets. */
function drawGerm(context: CanvasRenderingContext2D, x: number, y: number, resistant = false) {
    context.beginPath();
    context.arc(x, y, 35, 0, Math.PI * 2);
    context.fillStyle = resistant ? '#e6d6f8' : '#e3efbb';
    context.fill();
    if (resistant) {
        context.strokeStyle = '#ad8aca';
        context.lineWidth = 2;
        context.stroke();
    }
    context.beginPath();
    context.arc(x, y, 25, 0, Math.PI * 2);
    context.fillStyle = resistant ? '#b291cc' : '#acd266';
    context.fill();
    context.beginPath();
    context.strokeStyle = '#40534c';
    context.lineWidth = 2;
    context.moveTo(x - 11, y - 5);
    context.lineTo(x - 11, y);
    context.moveTo(x + 11, y - 5);
    context.lineTo(x + 11, y);
    context.moveTo(x - 8, y + 9);
    context.quadraticCurveTo(x, y + 17, x + 8, y + 9);
    context.stroke();
}

function drawQR(context: CanvasRenderingContext2D, url: string) {
    const qr = makeQR(url);
    const modules = qr.getModuleCount();
    const size = 240;
    const cell = size / (modules + 8);
    const left = (1080 - size) / 2;
    const top = 990;
    context.fillStyle = '#FFFFFF';
    context.fillRect(left, top, size, size);
    context.fillStyle = '#203e38';
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
    context.fillStyle = '#FFF8EC';
    context.fillRect(0, 0, 1080, 1350);
    drawGerm(context, 110, 135);
    drawGerm(context, 970, 135, true);
    context.textAlign = 'center';

    function text(value: string, y: number, size = 30, color = '#375a51') {
        context.fillStyle = color;
        context.font = '500 ' + size + 'px "Noto Sans JP", sans-serif';
        context.fillText(value, 540, y);
    }

    text('おくすり発明ラボ', 70, 36);
    text(name, 135, 48, '#39745e');
    text('回復した患者 ' + result.recovered + ' / 100 人', 220, 52, '#39745e');
    text('回復 ' + result.recovered + ' / 感染が残存 ' + (100 - result.recovered - result.seDrop)
        + ' / 副作用で中断 ' + result.seDrop, 275, 27);
    const representative = result.representative;
    text('薬剤感受性菌：' + populationChange(representative.normStart, representative.normEnd).fold, 330, 29);
    text('薬剤耐性菌：' + populationChange(representative.resStart, representative.resEnd).fold, 375, 29);
    text('使った研究コイン ' + cost(design) + ' / 9', 430, 30);

    keys.forEach((key, row) => {
        context.textAlign = 'left';
        context.font = '500 29px "Noto Sans JP", sans-serif';
        context.fillStyle = '#375a51';
        context.fillText(labels[key], 70, 535 + row * 55);
        for (let index = 0; index < 5; index++) {
            context.fillStyle = index < design[key] ? '#77b299' : '#e0e8df';
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
    text('研究コインはゲーム上の単位で、実際の費用ではありません。', 1294, 22);
    text(adult.split('。')[0] + '。', 1327, 23);
    return canvas.toDataURL('image/png');
}
