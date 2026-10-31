import defaults from '../config/params.json';
export type Params = typeof defaults;
export type Design = {
    pot: number;
    mech: number;
    dur: number;
    gentle: number;
};
export type Patient = {
    immune: number;
    log10R0: number;
    seTol: number;
};
export type Point = {
    t: number;
    S: number;
    Sq: number;
    R: number;
    Rq: number;
};
export const params = defaults;
export const keys = ['pot', 'mech', 'dur', 'gentle'] as const;
// Convergent power series near zero; incomplete-gamma continued fraction in the tail.
export function erf(x: number): number {
    if (Math.abs(x) > 2) {
        const z = x * x;
        let b = z + .5, c = 1e300, d = 1 / b, h = d;
        for (let i = 1; i < 200; i++) {
            const a = -i * (i - .5);
            b += 2;
            d = a * d + b;
            if (Math.abs(d) < 1e-300)
                d = 1e-300;
            c = b + a / c;
            if (Math.abs(c) < 1e-300)
                c = 1e-300;
            d = 1 / d;
            const delta = d * c;
            h *= delta;
            if (Math.abs(delta - 1) < 2e-16)
                break;
        }
        return Math.sign(x) * (1 - Math.exp(-z + .5 * Math.log(z) - Math.log(Math.PI) / 2) * h);
    }
    let term = x, sum = x;
    for (let n = 1; n < 150; n++) {
        term *= -x * x / n;
        const add = term / (2 * n + 1);
        sum += add;
        if (Math.abs(add) < 1e-17)
            break;
    }
    return 2 / Math.sqrt(Math.PI) * sum;
}
export function normPpf(q: number) { let lo = -10, hi = 10; for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (.5 * (1 + erf(mid / Math.SQRT2)) < q)
        lo = mid;
    else
        hi = mid;
} return (lo + hi) / 2; }
export function patients(p: Params = defaults): Patient[] { const z = Array.from({ length: p.nPat }, (_, i) => normPpf((i + .5) / p.nPat)); return z.map((v, i) => ({ immune: p.immuneMean * Math.exp(p.immuneSd * v), log10R0: p.log10R0Mean + p.log10R0Sd * z[i * 37 % p.nPat], seTol: p.seTolMean * Math.exp(p.seTolSd * z[(i * 61 + 17) % p.nPat]) })); }
export function conc(t: number, dur: number, p: Params = defaults) { const k = Math.LN2 / p.halfLife[dur - 1]; let c = 0; for (let i = 0; i <= Math.floor(t / p.doseInterval); i++)
    c += p.Cpeak * Math.exp(-k * (t - i * p.doseInterval)); return c; }
export function killRates(t: number, d: Design, p: Params = defaults) { const c = conc(t, d.dur, p), ec = p.ec50S[d.pot - 1]; const hill = (e: number) => { const x = (c / e) ** p.hill; return p.Emax * x / (1 + x); }; return { c, kS: hill(ec), kR: hill(ec * p.resistFold[d.mech - 1]) }; }
export function cost(d: Design, p: Params = defaults) { return keys.reduce((s, k) => s + p.levelCost[d[k] - 1], 0); }
export function canAfford(d: Design, p: Params = defaults) { return keys.every(k => Number.isInteger(d[k]) && d[k] >= 1 && d[k] <= 5) && cost(d, p) <= p.budget; }
export function sideEffect(d: Design, p: Params = defaults) { return p.seBase * (1 + p.sePot[d.pot - 1] + p.seMech[d.mech - 1] + p.seDur[d.dur - 1]) * p.seGentle[d.gentle - 1]; }
type Rates = ReturnType<typeof killRates>;
function schedule(d: Design, p: Params) { return Array.from({ length: Math.round(p.T / p.dt) }, (_, i) => [0, .5, 1].map(f => killRates(i * p.dt + f * p.dt, d, p))); }
function integrate(p: Params, pat: Patient, rates: Rates[][]): Point[] {
    const r = 10 ** pat.log10R0, f = p.tolFrac0, y = new Float64Array([p.S0 * (1 - f), p.S0 * f, r * (1 - f), r * f]);
    const point = (t: number): Point => ({ t, S: y[0], Sq: y[1], R: y[2], Rq: y[3] });
    const trace = [point(0)];
    const rhs = (v: Float64Array, k: Rates, out: Float64Array) => { const S = v[0], Sq = v[1], R = v[2], Rq = v[3], N = S + Sq + R + Rq, c = Math.max(0, 1 - N / p.K), im = pat.immune * p.Ki / (p.Ki + N), iq = im * p.immuneTolFrac; out[0] = p.gS * c * S - k.kS * S - p.a * S + p.b * Sq - im * S; out[1] = p.a * S - p.b * Sq - p.tolKillFrac * k.kS * Sq - iq * Sq; out[2] = p.gR * c * R - k.kR * R - p.a * R + p.b * Rq - im * R; out[3] = p.a * R - p.b * Rq - p.tolKillFrac * k.kR * Rq - iq * Rq; };
    const k1 = new Float64Array(4), k2 = new Float64Array(4), k3 = new Float64Array(4), k4 = new Float64Array(4), tmp = new Float64Array(4), dt = p.dt, every = Math.max(1, Math.round(1 / dt));
    for (let i = 0; i < rates.length; i++) {
        rhs(y, rates[i][0], k1);
        for (let j = 0; j < 4; j++)
            tmp[j] = y[j] + dt / 2 * k1[j];
        rhs(tmp, rates[i][1], k2);
        for (let j = 0; j < 4; j++)
            tmp[j] = y[j] + dt / 2 * k2[j];
        rhs(tmp, rates[i][1], k3);
        for (let j = 0; j < 4; j++)
            tmp[j] = y[j] + dt * k3[j];
        rhs(tmp, rates[i][2], k4);
        for (let j = 0; j < 4; j++)
            y[j] = Math.max(0, y[j] + dt / 6 * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j]));
        for (let j = 0; j < 4; j++)
            if (!Number.isFinite(y[j]) || y[j] < 0)
                throw new Error("Non-finite or negative model state");
        if ((i + 1) % every === 0)
            trace.push(point((i + 1) * dt));
    }
    return trace;
}
export function simulate(d: Design, p: Params = defaults, patient: Patient = { immune: p.immuneMean, log10R0: p.repLog10R0, seTol: 1 }) { return integrate(p, patient, schedule(d, p)); }
export function runDesign(d: Design, p: Params = defaults) { const rates = schedule(d, p), se = sideEffect(d, p); let recovered = 0, cured = 0, seDrop = 0; const outcomes = patients(p).map(pat => { const tr = integrate(p, pat, rates), end = tr[tr.length - 1], ok = end.S + end.R < p.cureThreshold, bad = se >= pat.seTol; if (ok)
    cured++; if (bad)
    seDrop++; if (ok && !bad)
    recovered++; return bad ? 'side' : ok ? 'well' : 'ill'; }); const trace = integrate(p, { immune: p.immuneMean, log10R0: p.repLog10R0, seTol: 1 }, rates), e = trace[trace.length - 1]; return { recovered, cured, seDrop, se, outcomes, representative: { trace, normEnd: e.S + e.Sq, resEnd: e.R + e.Rq, resTolEnd: e.Rq, actEnd: e.S + e.R, normStart: p.S0, resStart: 10 ** p.repLog10R0 } }; }
export type Result = ReturnType<typeof runDesign>;
