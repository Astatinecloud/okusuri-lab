# Codex implementation report

Date: 2026-10-31 (Asia/Tokyo)

## Status

The implementation is written, and all 26 automated tests pass. **The task is not fully complete:** this environment blocks downloading the required `qrcode-generator` dependency and writing Git metadata. Consequently the production build and requested commit have not succeeded. No deployment was performed. The game should not yet be described as a verified production release.

## Implemented

- Vite, React 18, TypeScript scaffold, relative Vite base, Japanese HTML metadata, SVG flask favicon, Google Fonts with system fallback, and development/test/build scripts. The scripts use native config loading to avoid an observed sandbox failure in esbuild's config bundler; Node 22.18+ or 24+ is required.
- Pure TypeScript RK4 model in `src/model`, independent of React and DOM. High precision erf uses a convergent series near zero and an incomplete-gamma continued fraction in the tails; inverse normal uses the specified 80 bisections. Drug concentrations and RK4 rates are shared across patients without changing their equations. Each state at every completed RK4 step is checked for finiteness and nonnegativity. Recovered, cured, and side-effect counts are computed independently for the 100 patients.
- Five state-driven Japanese screens: title, development, simulation, results, and saving. Development has nine coin indicators, five level buttons plus increment/decrement controls, locked-state feedback, refunds, a naming dialog, generated alternatives, and a ten Unicode-character name limit.
- Fourteen-second simulation, skip control, same-size susceptible/resistant germ SVGs, resistant barriers, sleeping protected germs, concentration-dependent capsule counts, simplified pop/barrier/key effects, logarithmic character counts, and synchronized hand-drawn SVG chart using the representative trace directly.
- Results: 100 outcome icons with legend, researcher ranks and criteria, savings badge, before/after counts and reduction percentages, residual protected-bacteria explanation, design summary, prioritized comments, replay, restart, and science explanation cards.
- Share URL validation and round trip, direct result entry from a valid hash, safe React rendering of names, QR module rendering through the specified `qrcode-generator` API, direct canvas drawing of a 1080×1350 result card, PNG download, long-press image preview, file sharing where supported, and URL copying with a fallback message.
- Pastel responsive CSS for phone/desktop layouts, native modal dialogs, visible focus styles, reduced-motion styles, and minimum 48px control targets. Phone level controls put increment/decrement on a second row so all five level buttons remain at least 48px wide at 360px.
- README with commands, structure, and verification caveats.

## Model integrity

Neither `src/config/params.json` nor `model-ref/params.json`, the equations in the specification, the Python reference, or `golden.json` was modified. The two parameter files retain the same SHA-256:

`4D976F44B1DEEF84E5A33AD6D075D9804C0614CAD72BF1C7E0A84BA3B4E13C5E`

There is no artificial lower bound on residual bacteria. Zero-clamping is only the reference's per-step `max(0, value)` operation.

## Verification results

Final full `npm.cmd test` run: **2 test files, 26 tests passed**, duration **37.49 seconds**. (`npm.cmd` is used because PowerShell blocks this machine's npm.ps1.)

- All 100 patient parameter triples match Python within absolute 1e-9.
- All 15 Python golden cases match recovery/cure/side-effect counts exactly and all hourly traces and representative endpoint quantities within the required relative tolerance.
- Science rules A, B, C, D, and E pass.
- All 435 affordable designs execute twice with identical outputs, integer recovery counts in [0,100], valid states, and representative resistant endpoints at least 10. Integration's runtime guard covers every patient's completed RK4 step; the tests also explicitly inspect representative hourly points.
- Thirty evenly spread affordable designs differ by at most two recovered patients with dt halved to 0.025.
- Resistant endpoints are monotone as mechanism improves across all strength/duration combinations.
- All 625 level combinations are checked against the budget, and invalid levels are rejected.
- Share URL round trips, malformed/over-budget input rejection, safe text handling, and name truncation pass.
- A warm Node timing check of ten runs averaged **33.0 ms per runDesign**. This is not a browser or phone performance measurement.

Final `npm.cmd run build`: **failed**, TypeScript TS2307 at `src/share/card.ts:1`, because `qrcode-generator` is unavailable. No other TypeScript diagnostic was emitted in that run, but this is not a successful typecheck or Vite production build.

## Environment blockers and remaining verification

1. `npm install` was attempted. Network requests to the npm registry were rejected with `EACCES`. Offline installation also failed because the specified QR dependency is not cached. React, Vite, TypeScript, Vitest, and their available dependencies were copied from an existing local installation only to run verification. This does **not** constitute a successful clean install; no lockfile was generated. The specified QR library was retained rather than replaced or mocked. A permitted network connection is needed to run `npm install`, generate/commit the lockfile, and rerun both commands successfully.
2. Git staging and commit were attempted with message `Implement Japanese medicine invention game and reference-matched model`. Both failed with `Permission denied` creating `.git/index.lock`. No commit was created. The implementation and this report remain in the working tree. Git write access is needed to stage and commit them. Existing unrelated untracked `docs/balance-report.md` and `docs/festival-operations.md` were not included in the attempted staging command or edited.
3. Browser visual QA, actual QR scanning, canvas layout/font verification, file-share behavior, iOS long-press/download behavior, and phone performance remain **unverified** because the required QR dependency prevents serving/building this implementation as written. Responsive behavior and accessibility were implemented in code, not confirmed by screenshots or device tests.
4. Germ interactions are illustrative timed SVG/CSS effects and trace-driven population changes; they are not a separate physical collision simulation. The ODE is authoritative for all reported numbers.

After the dependency and Git restrictions are resolved, run `npm install`, `npm test`, and `npm run build`; inspect all five screens at 360×640 and desktop, scan the displayed and exported QR codes, verify a shared result after refresh, and test PNG saving on iOS and Android before exhibition use. Commit the finished implementation and update this report with the actual results. Do not deploy without a separate instruction.
