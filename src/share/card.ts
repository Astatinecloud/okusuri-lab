import qrcode from 'qrcode-generator';
import { cost, keys, type Design, type Result } from '../model';
import { labels, rank, comments, badge } from '../config/game';
export function makeQR(url: string) {
    const qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return qr;
}
/** Draw directly to a canvas; never rasterize HTML or load external images. */
export async function resultImage(d: Design, r: Result, name: string, url: string) {
    await document.fonts.ready;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        throw Error('画像をつくれませんでした');
    ctx.fillStyle = '#FFF8EC';
    ctx.fillRect(0, 0, 1080, 1350);
    ctx.fillStyle = '#315c55';
    ctx.textAlign = 'center';
    function text(s: string, y: number, size = 40) {
        ctx!.font = `800 ${size}px "M PLUS Rounded 1c", system-ui`;
        ctx!.fillText(s, 540, y);
    }
    text('おくすり発明ラボ', 100, 56);
    text(name, 190, 52);
    text(`100人中 ${r.recovered}人が元気に！`, 300, 60);
    text('★'.repeat(rank(r.recovered).stars), 370, 44);
    text(rank(r.recovered).name, 430, 40);
    text(`使ったコイン ${cost(d)} / 9${badge(d, r) ? '　🏅 せつやく名人' : ''}`, 480, 26);
    keys.forEach((k, i) => text(`${labels[k]}  ${'●'.repeat(d[k])}${'○'.repeat(5 - d[k])}`, 540 + i * 55, 30));
    // Fit every comment above the QR, including the longest low-score explanation.
    let lines: string[] = [], fontSize = 28;
    for (; fontSize >= 18; fontSize--) {
        ctx.font = `500 ${fontSize}px "M PLUS Rounded 1c", system-ui`;
        lines = [];
        for (const paragraph of comments(d, r)) {
            let row = '';
            for (const char of paragraph) {
                if (ctx.measureText(row + char).width > 920) {
                    lines.push(row);
                    row = '';
                }
                row += char;
            }
            if (row)
                lines.push(row);
        }
        if (lines.length * (fontSize + 10) <= 230)
            break;
    }
    lines.forEach((line, i) => ctx.fillText(line, 540, 775 + i * (fontSize + 10)));
    const qr = makeQR(url), n = qr.getModuleCount(), size = 240, cell = size / (n + 8), left = (1080 - size) / 2, top = 1030;
    ctx.fillStyle = 'white';
    ctx.fillRect(left, top, size, size);
    ctx.fillStyle = '#203e38';
    for (let row = 0; row < n; row++)
        for (let col = 0; col < n; col++) {
            if (qr.isDark(row, col))
                ctx.fillRect(left + (col + 4) * cell, top + (row + 4) * cell, Math.ceil(cell), Math.ceil(cell));
        }
    text('教育用の簡単なモデルです', 1320, 24);
    return canvas.toDataURL('image/png');
}
