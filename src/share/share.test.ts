import { it, expect } from 'vitest';
import { decode, encode, trimName } from '.';
it('round trips Japanese names and designs', () => { const design = { pot: 4, mech: 3, dur: 2, gentle: 3 }, name = 'まもりやぶり'; expect(decode(encode(design, name))).toEqual({ design, name }); });
it('rejects malformed, invalid and over-budget hashes', () => { for (const h of ['#r=5555', '#r=0111', '#r=1116', '#r=111', '#r=11111', '#r=<svg>', '#r=1e11'])
    expect(decode(h)).toBeNull(); expect(trimName('あいうえおかきくけこさしすせそたち')).toBe('あいうえおかきくけこさしすせそた'); expect(decode('#r=1111&n=%3Cscript%3E')).toEqual({ design: { pot: 1, mech: 1, dur: 1, gentle: 1 }, name: '<script>' }); });
