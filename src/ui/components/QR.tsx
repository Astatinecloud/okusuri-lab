import { useMemo } from 'react';
import { makeQR } from '../../share/card';

export function QR({ url }: { url: string }) {
    const qr = useMemo(() => makeQR(url), [url]);
    const n = qr.getModuleCount();
    return (
        <svg className="qr" viewBox={`-4 -4 ${n + 8} ${n + 8}`} role="img" aria-label="この結果をひらくQRコード">
            <rect x="-4" y="-4" width={n + 8} height={n + 8} fill="white" />
            {Array.from({ length: n }, (_, row) => Array.from({ length: n }, (_, col) => (
                qr.isDark(row, col) ? <rect key={`${row}-${col}`} x={col} y={row} width="1" height="1" /> : null
            )))}
        </svg>
    );
}
