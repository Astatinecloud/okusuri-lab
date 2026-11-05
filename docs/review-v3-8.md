# Review v3-8 (Claude Code → Codex): show the rank scale; move 「一時的耐性状態」 to its own small card

Display only. Do NOT change the model, params, golden3, rank names/thresholds/count, coin rules, advice logic.

## 1. Researcher rank: make the total number of stages visible
In `ResearcherRank` (result screen) and on the saved card image:
- Stars: show 5 star positions — filled ★ for the achieved stages and outline ☆ (same size, lighter color from the palette) for the rest, e.g. ★★★☆☆.
- Under the rank name: 「全5段階中 3段階目」 (computed from `ranks`; do not hard-code 5 — use `ranks.length`).
- Add a compact ladder of all stage names in order from lowest to highest (研修生 → 研究補助員 → 研究員 → 主任研究員 → 創薬プロジェクトリーダー), current one highlighted (bold + accent background), others muted. Must wrap nicely at 360 px (no horizontal scroll). The ladder can be a single row of small pills or a vertical list on narrow screens.
- Keep the big rank name as the most prominent text. Keep the existing chance note.
- Saved card image: draw ★★★☆☆ and 「全5段階中 3段階目」 under the rank name.
- Tests: for recovered values 0, 30, 60, 80, 95 the stage index and filled/empty star counts are 1/4, 2/3, 3/2, 4/1, 5/0; ranks array unchanged; ladder lists all names in ascending order with exactly one highlighted.

## 2. 「一時的耐性状態」
The model does include it, but only inside each patient's treatment (the within-host model: a small share of bacteria are dormant / hard to reach, the drug cannot act on them until they wake up, and they wake slowly; this is why a few bacteria can remain after treatment). The regional panel and charts do not show it, so the glossary entry currently floats without context.
- Remove 「一時的耐性状態」 from the glossary (`glossary` in game.ts and the special case in `Info.tsx`).
- Add a separate small card in 「くわしい結果」 (after the 100-patient breakdown), title 「体の中の“眠っている菌”」, with the existing sleeping germ icon (`<Germ sleep/>`) and this text (no numbers):
  「治療中、体の中には眠っていたり薬が届きにくい場所にいたりして、一時的に薬が効きにくい菌が少しいます。これは耐性菌とはちがい、目をさますと薬が効くようになります。治療のあとに少し菌が残ることがあるのはこのためで、多くは体の守る力で片づけられます。」
- Tests: glossary no longer contains 一時的耐性状態; the result screen contains the new card title and the sleeping germ.

npm test + npm run build must pass. Leave uncommitted; append 'Review v3-8' to docs/codex-report.md. Report in Japanese.
