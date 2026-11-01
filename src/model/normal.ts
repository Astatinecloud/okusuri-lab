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
export function normPpf(q: number) {
    let lo = -10, hi = 10;
    for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (.5 * (1 + erf(mid / Math.SQRT2)) < q)
            lo = mid;
        else
            hi = mid;
    }
    return (lo + hi) / 2;
}
