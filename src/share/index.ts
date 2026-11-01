import { canAfford, keys, type Design } from '../model';
export const trimName = (name: string) => Array.from(name).slice(0, 16).join('');
export function encode(design: Design, name: string, seed: number): string {
    return '#r=' + keys.map(key => design[key]).join('') + '&n=' + encodeURIComponent(trimName(name)) + '&s=' + (seed >>> 0);
}
export function decode(hash: string) {
    try {
        const query = new URLSearchParams(hash.replace(/^#/, ''));
        const levels = query.get('r');
        if (!levels || !/^([1-5]){4}$/.test(levels))
            return null;
        const design = Object.fromEntries(keys.map((key, index) => [key, Number(levels[index])])) as Design;
        if (!canAfford(design))
            return null;
        const raw = query.get('s');
        if (raw !== null && (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > 0xffffffff))
            return null;
        return { design, name: trimName(query.get('n') || 'AMR-1111'), seed: raw === null ? 1000 + Number(levels) : Number(raw) };
    }
    catch {
        return null;
    }
}
