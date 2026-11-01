import qrcode from 'qrcode-generator';
import { cost, keys, type Design, type Result } from '../model';
import { labels, adult } from '../config/game';
import { rank } from '../game/result';
export function makeQR(url: string) {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return qr;
}
export async function resultImage(design: Design, result: Result, name: string, url: string) {
    await document.fonts.ready;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const context = canvas.getContext('2d');
    if (!context)
        throw new Error('Canvas unavailable');
    context.fillStyle = '#FFF8EC';
    context.fillRect(0, 0, 1080, 1350);
    context.textAlign = 'center';
    const text = (value: string, y: number, size: number, bold = false) => {
        context.fillStyle = '#375a51';
        context.font = (bold ? '700 ' : '500 ') + size + 'px "Noto Sans JP", sans-serif';
        context.fillText(value, 540, y, 960);
    };
    text('おくすり発明ラボ · 1年間の研究結果', 65, 32);
    const researcher = rank(result.recovered);
    context.fillStyle = ['#f5ecdb', '#e8edf0', '#e5efdf', '#e1eee6', '#f6e8b8'][researcher.stars - 1];
    context.fillRect(25, 95, 1030, 210);
    text('★'.repeat(researcher.stars), 175, 64, true);
    text(researcher.name, 265, 64, true);
    drawGerm(context, 95, 375);
    drawGerm(context, 985, 375, true);
    text(name, 375, 42, true);
    text('回復した患者 ' + result.recovered + ' / 100 人', 460, 48, true);
    text('12か月目の耐性菌割合 ' + (result.community.months[11].frac * 100).toFixed(1) + '%', 525, 36);
    text('使った研究コイン ' + cost(design) + ' / 9枚', 590, 30);
    keys.forEach((key, i) => text(labels[key] + '：レベル' + design[key], 665 + i * 58, 30));
    text('シード：' + result.seed, 935, 26);
    drawQR(context, url);
    text('QRから同じ設計・同じシードの結果を確認できます', 1260, 24);
    text('研究コインはゲーム上の単位で、実際の費用ではありません。', 1294, 22);
    text(adult.split('。')[0] + '。', 1327, 23);
    return canvas.toDataURL('image/png');
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
