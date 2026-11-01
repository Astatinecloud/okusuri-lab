import defaults from '../config/params.json';
import v3 from '../config/params3.json';
import { normPpf } from './normal';
export { normPpf, erf } from './normal';
export const params = defaults;
export const params3 = v3;
export type Design = {
    pot: number;
    bar: number;
    dur: number;
    gentle: number;
};
export const keys = ['pot', 'bar', 'dur', 'gentle'] as const;
export function patients() {
    const p = params, z = Array.from({ length: p.nPat }, (_, i) => normPpf((i + .5) / p.nPat));
    return z.map((v, i) => ({ immune: p.immuneMean * Math.exp(p.immuneSd * v), seTol: p.seTolMean * Math.exp(p.seTolSd * z[(i * 61 + 17) % p.nPat]) }));
}
export function conc(t: number, dur: number) {
    const p = params, k = Math.LN2 / p.halfLife[dur - 1];
    let c = 0;
    for (let i = 0; i * p.doseInterval <= t && i * p.doseInterval < v3.Ttreat; i++)
        c += p.Cpeak * Math.exp(-k * (t - i * p.doseInterval));
    return c;
}
export function killRates(t: number, d: Design) {
    const c = conc(t, d.dur), ec = params.ec50S[d.pot - 1];
    const hill = (e: number) => { const x = (c / e) ** params.hill; return params.Emax * x / (1 + x); };
    return { c, kS: hill(ec), kR: hill(ec * v3.resistFoldMutant) };
}
export function cost(d: Design) { return keys.reduce((s, k) => s + params.levelCost[d[k] - 1], 0); }
export function canAfford(d: Design) { return keys.every(k => Number.isInteger(d[k]) && d[k] >= 1 && d[k] <= 5) && cost(d) <= params.budget; }
export function sideEffect(d: Design) { return params.seBase * (1 + params.sePot[d.pot - 1] + v3.seBarrier[d.bar - 1] + params.seDur[d.dur - 1]) * params.seGentle[d.gentle - 1]; }
/** RK4 on the reference four-state ODE; emergence uses left-endpoint rates. */
export function withinHost(d: Design, immune: number[], strain: 'S' | 'R') {
    const p = params, dt = p.dt, steps = Math.round((v3.Ttreat + v3.Tpost) / dt), gR = p.gS * (1 - v3.cost[d.bar - 1]);
    // Retain decaying concentrations after the last dose, exactly as model3.conc.
    const rates = Array.from({ length: steps }, (_, i) => [0, .5, 1].map(f => killRates(i * dt + f * dt, d)));
    const activeEnd: number[] = [], pEmerge: number[] = [], E_denovo: number[] = [], E_standing: number[] = [], final: number[][] = [];
    for (const m of immune) {
        let y = strain === 'S' ? [p.S0 * (1 - p.tolFrac0), p.S0 * p.tolFrac0, 0, 0] : [0, 0, p.S0 * (1 - p.tolFrac0), p.S0 * p.tolFrac0];
        const births = new Float64Array(steps), bs = new Float64Array(steps), ds = new Float64Array(steps);
        const rhs = (v: number[], r: ReturnType<typeof killRates>) => {
            const [S, Sq, R, Rq] = v, N = S + Sq + R + Rq, crowd = Math.max(0, 1 - N / p.K), im = m * p.Ki / (p.Ki + N);
            return [p.gS * crowd * S - r.kS * S - p.a * S + p.b * Sq - im * S, p.a * S - p.b * Sq, gR * crowd * R - r.kR * R - p.a * R + p.b * Rq - im * R, p.a * R - p.b * Rq];
        };
        for (let i = 0; i < steps; i++) {
            const N = y[0] + y[1] + y[2] + y[3], crowd = Math.max(0, 1 - N / p.K);
            births[i] = p.gS * crowd * y[0];
            bs[i] = gR * crowd;
            ds[i] = rates[i][0].kR + m * p.Ki / (p.Ki + N);
            const k1 = rhs(y, rates[i][0]), k2 = rhs(y.map((v, j) => v + dt / 2 * k1[j]), rates[i][1]), k3 = rhs(y.map((v, j) => v + dt / 2 * k2[j]), rates[i][1]), k4 = rhs(y.map((v, j) => v + dt * k3[j]), rates[i][2]);
            y = y.map((v, j) => Math.max(0, v + dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])));
            if (i + 1 === Math.round(v3.Ttreat / dt))
                activeEnd.push(y[0] + y[2]);
        }
        final.push(y);
        if (strain === 'S') {
            // Backward lineage survival: terminal G(H)=1, survival at birth is 1/G(t).
            let G = 1;
            const gt = new Float64Array(steps);
            for (let i = steps - 1; i >= 0; i--) {
                G = 1 + ds[i] * dt + Math.exp(-(bs[i] - ds[i]) * dt) * (G - 1);
                gt[i] = G;
            }
            const freq = v3.freq[d.bar - 1], mu = freq * v3.cost[d.bar - 1];
            let de = 0;
            for (let i = 0; i < steps; i++)
                de += mu * births[i] * dt / gt[i];
            const st = p.S0 * freq / gt[0];
            E_denovo.push(de);
            E_standing.push(st);
            pEmerge.push(1 - Math.exp(-(de + st)));
        }
    }
    return { activeEnd, pEmerge, E_denovo, E_standing, final };
}
export type PatientTable = {
    cureS: boolean[];
    cureR: boolean[];
    okSE: boolean[];
    pEmerge: number[];
    E_denovo: number[];
    E_standing: number[];
    se: number;
};
const tables = new Map<string, PatientTable>();
export function patientTable(d: Design): PatientTable {
    const key = keys.map(k => d[k]).join('');
    const cached = tables.get(key);
    if (cached)
        return cached;
    const pats = patients(), immune = pats.map(p => p.immune), s = withinHost(d, immune, 'S'), r = withinHost(d, immune, 'R'), se = sideEffect(d);
    const tab = { cureS: s.activeEnd.map(n => n < params.cureThreshold), cureR: r.activeEnd.map(n => n < params.cureThreshold), okSE: pats.map(p => se < p.seTol), pEmerge: s.pEmerge, E_denovo: s.E_denovo, E_standing: s.E_standing, se };
    tables.set(key, tab);
    return tab;
}
// Match Python's ties-to-even rounding for the normal approximations.
const round = (v: number) => { const f = Math.floor(v); return v - f === .5 ? (f % 2 === 0 ? f : f + 1) : Math.round(v); };
export class Rng {
    constructor(private a: number) { this.a = a >>> 0; }
    random() { this.a = (this.a + 0x6D2B79F5) >>> 0; let t = this.a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
    normal() { const u1 = Math.max(this.random(), 1e-12), u2 = this.random(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); }
    poisson(lam: number) { if (lam <= 0)
        return 0; if (lam < 30) {
        const L = Math.exp(-lam);
        let k = 0, prod = this.random();
        while (prod > L) {
            k++;
            prod *= this.random();
        }
        return k;
    } return Math.max(0, round(lam + Math.sqrt(lam) * this.normal())); }
    binomial(n: number, q: number) { if (n <= 0 || q <= 0)
        return 0; if (q >= 1)
        return n; if (n < 50) {
        let s = 0;
        for (let i = 0; i < n; i++)
            if (this.random() < q)
                s++;
        return s;
    } const mean = n * q; if (mean < 30)
        return Math.min(n, this.poisson(mean)); return Math.min(n, Math.max(0, round(mean + Math.sqrt(n * q * (1 - q)) * this.normal()))); }
}
export type Month = {
    month: number;
    YS: number;
    YR: number;
    frac: number;
    emergences: number;
};
/** One-day stochastic tau leaps. RNG draw order is part of the shared-seed contract. */
export function community(d: Design, tab: PatientTable, seed: number) {
    const cp = v3.community, mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const qE = mean(tab.pEmerge), eS = mean(tab.cureS.map((v, i) => v && tab.okSE[i] ? 1 - tab.pEmerge[i] : 0)), eR = mean(tab.cureR.map((v, i) => +(v && tab.okSE[i]))), rng = new Rng(seed);
    let YS = cp.Y0, YR = 0, emergences = 0;
    const daily: number[][] = [];
    for (let i = 0; i < cp.days; i++) {
        const X = Math.max(0, cp.N - YS - YR), newS = rng.poisson(cp.beta * X * YS / cp.N + cp.importRate), newR = rng.poisson(cp.beta * (1 - v3.cost[d.bar - 1]) * X * YR / cp.N), pT = 1 - Math.exp(-cp.tau), pG = 1 - Math.exp(-cp.gamma);
        const treatS = rng.binomial(YS, pT), emerg = rng.binomial(treatS, qE), curedS = rng.binomial(treatS - emerg, eS / Math.max(1e-12, 1 - qE)), natS = rng.binomial(YS - treatS, pG), treatR = rng.binomial(YR, pT), curedR = rng.binomial(treatR, eR), natR = rng.binomial(YR - treatR, pG);
        YS = Math.max(0, YS + newS - emerg - curedS - natS);
        YR = Math.max(0, YR + newR + emerg - curedR - natR);
        emergences += emerg;
        daily.push([YS, YR, emerg]);
    }
    const months: Month[] = Array.from({ length: 12 }, (_, m) => { const seg = daily.slice(Math.floor(m * cp.days / 12), Math.floor((m + 1) * cp.days / 12)), YS = mean(seg.map(x => x[0])), YR = mean(seg.map(x => x[1])); return { month: m + 1, YS, YR, frac: YS + YR > 0 ? YR / (YS + YR) : 0, emergences: seg.reduce((s, x) => s + x[2], 0) }; });
    return { months, eS, eR, qE, emergences, daily };
}
export type PatientStatus = 'well' | 'ill' | 'emerged' | 'resistant' | 'side';
export function yearOutcome(d: Design, seed: number, tab = patientTable(d)) {
    const com = community(d, tab, seed), rng = new Rng(seed ^ 0x9E3779B9), kinds: string[] = [], outcomes: PatientStatus[] = [];
    for (let k = 0; k < 100; k++) {
        const resistant = rng.random() < com.months[Math.floor(k * 12 / 100)].frac, emerged = resistant ? false : rng.random() < tab.pEmerge[k];
        kinds.push(resistant ? 'R' : emerged ? 'E' : 'S');
        outcomes.push(!tab.okSE[k] ? 'side' : resistant ? (tab.cureR[k] ? 'well' : 'resistant') : emerged ? 'emerged' : tab.cureS[k] ? 'well' : 'ill');
    }
    return { seed: seed >>> 0, recovered: outcomes.filter(v => v === 'well').length, community: com, kinds, outcomes, seDrop: outcomes.filter(v => v === 'side').length };
}
export const runDesign = yearOutcome;
export type Result = ReturnType<typeof yearOutcome>;
