import { canAfford, keys, type Design } from '../model';
export const trimName = (s: string) => Array.from(s).slice(0, 10).join('');
export function encode(d: Design, name: string) { return '#r=' + keys.map(k => d[k]).join('') + '&n=' + encodeURIComponent(trimName(name)); }
export function decode(hash: string) { try {
    const q = new URLSearchParams(hash.replace(/^#/, '')), r = q.get('r');
    if (!r || !/^([1-5]){4}$/.test(r))
        return null;
    const d = Object.fromEntries(keys.map((k, i) => [k, Number(r[i])])) as Design;
    return canAfford(d) ? { design: d, name: trimName(q.get('n') || 'キラリン') } : null;
}
catch {
    return null;
} }
