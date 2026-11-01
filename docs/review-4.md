# Review 4 (Claude Code → Codex) — restore v1 visuals, coins instead of pt

User feedback on v2: the bacteria illustrations, the patient (person) illustrations and the overall color scheme of the ORIGINAL v1 game are better. "90 pt" feels awkward; "9 coins" is better.

Keep everything else from v2: target audience, terminology (薬剤感受性菌／薬剤耐性菌／一時的耐性状態 …), text, tooltips/glossary, results sections ①〜⑤, analysis, comparison, chart line styles + overlay, next-step hint, tests. Do NOT touch src/model, params.json, golden.json, model-ref.

The v1 implementation is in git: `git show 3b060bc:<path>` (e.g. src/style.css, src/ui/components/Visuals.tsx, src/ui/components/PatientIcon.tsx, src/ui/screens/Simulation.tsx, src/ui/screens/Title.tsx, src/share/card.ts).

1. **Color scheme**: restore the v1 palette and feel across all screens (cream background #FFF8EC / #fffaf1, deep green text #375a51, green accent #579a80 / #39745e, mint #a9dbb8, soft yellow #ffefbe, lavender #cdb7df, peach, soft shadows, rounded cards ~20px, rounded buttons). Keep the v2 font (Noto Sans JP) for readability and keep the adult wording. Warning color for increases stays orange-ish but softened to fit the palette (e.g. #c9653b). Keep contrast AA for text.
2. **Bacteria illustrations**: restore the v1 `Germ` SVG (round faces: susceptible = yellow-green, resistant = lavender/purple with the thin barrier ring, same size; tolerant = translucent sleeping "zzz"). Use it in the simulation panel, result cards ①, legends, glossary. The v1 simulation body panel (pink-beige panel, drifting capsules, bounce "キン" vs pass-through key effect, hideout strip at the bottom) should come back, with the v2 adult captions (「一時的耐性状態（薬が届きにくい部位・休眠）」, log-scale note, real-time narration).
3. **Chart colors**: susceptible = v1 yellow-green, resistant = v1 purple (keep v2 line styles: solid/dashed/dotted + markers, legend with line samples, overlay default ON).
4. **Patient illustrations**: restore the v1 `PatientIcon` person SVGs in the 100-patient grid (回復 = mint with smile, 感染が残存 = gray with flat mouth, 副作用で中断 = light blue with bandage) + legend with the same icons. Keep v2 labels and aria-labels.
5. **Coins instead of pt**: replace 研究開発費 pt everywhere with 「研究コイン」: budget 9 coins, 1 level = 1 coin. Lab header: 「研究コイン 残り X / 9」 with 9 coin icons (v1 style: used coins faded). Locked levels: 「研究コインが不足しています。ほかの性能を下げると選べます。」 Results ①: 「使った研究コイン 6 / 9」. Analysis/comparison: 「研究コイン +1枚」, cost breakdown in coins, 予算外 → 「参考：研究コインが足りない設計」. Card image too. Keep the note 「研究コインはゲーム上の単位で、実際の費用ではありません。」 Update all tests that mention pt. Add a test that no UI string contains " pt" or "90".
6. Title screen: v1 look (flask/capsule/germ illustration, cream background) with the v2 title texts.
7. Saved card image: v1-style colors and germ icon; v2 content.

Run npm test and npm run build until both pass. Leave changes uncommitted; append 'Review 4 (v1 visuals + coins)' to docs/codex-report.md.
