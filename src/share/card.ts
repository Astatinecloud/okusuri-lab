import qrcode from 'qrcode-generator';
import { cost, keys, type Design, type Result } from '../model';
import { labels, adult } from '../config/game';
import { rank } from '../game/result';
import { prepareAnalysis } from '../game/analysis';
import { populationChange, wrapJapanese } from '../game/presentation';
export function makeQR(url: string) { const qr = qrcode(0, 'M'); qr.addData(url); qr.make(); return qr; }
export async function resultImage(d: Design, r: Result, name: string, url: string) { await document.fonts.ready; const analysis = await prepareAnalysis(d); const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350; const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 1080, 1350); ctx.textAlign = 'center'; function text(s: string, y: number, size = 30, color = '#1F2933') { ctx.fillStyle = color; ctx.font = '500 ' + size + 'px "Noto Sans JP", sans-serif'; ctx.fillText(s, 540, y); } text('おくすり発明ラボ', 70, 36); text(name, 135, 48, '#2563EB'); text('回復した患者 ' + r.recovered + ' / 100 人', 220, 52, '#0F9D76'); text('回復 ' + r.recovered + ' / 感染が残存 ' + (100 - r.recovered - r.seDrop) + ' / 副作用で中断 ' + r.seDrop, 275, 27); const rep = r.representative; text('薬剤感受性菌：' + populationChange(rep.normStart, rep.normEnd).fold, 330, 29); text('薬剤耐性菌：' + populationChange(rep.resStart, rep.resEnd).fold, 375, 29); text('研究開発費 ' + cost(d) * 10 + ' / 90 pt', 430, 30); keys.forEach((k, row) => { ctx.textAlign = 'left'; ctx.font = '500 29px "Noto Sans JP", sans-serif'; ctx.fillStyle = '#1F2933'; ctx.fillText(labels[k], 70, 535 + row * 55); for (let j = 0; j < 5; j++) {
    ctx.fillStyle = j < d[k] ? '#2563EB' : '#E3E8ED';
    ctx.fillRect(700 + j * 60, 516 + row * 55, 52, 24);
} }); ctx.textAlign = 'center'; const researcher = rank(r.recovered); text('★'.repeat(researcher.stars), 765, 32); text(researcher.name, 812, 34); const summary = '特に効果が大きかった性能：' + labels[analysis.strongest] + '（レベル1との比較）'; ctx.font = '500 28px "Noto Sans JP", sans-serif'; wrapJapanese(summary, 920, v => ctx.measureText(v).width).forEach((line, i) => text(line, 865 + i * 40, 28)); const qr = makeQR(url), n = qr.getModuleCount(), size = 240, cell = size / (n + 8), left = (1080 - size) / 2, top = 990; ctx.fillStyle = '#1F2933'; for (let row = 0; row < n; row++)
    for (let col = 0; col < n; col++)
        if (qr.isDark(row, col))
            ctx.fillRect(left + (col + 4) * cell, top + (row + 4) * cell, Math.ceil(cell), Math.ceil(cell)); text('QRから同じ設計の結果を確認できます', 1260, 24); text(adult.split('。')[0] + '。', 1310, 25); return canvas.toDataURL('image/png'); }
