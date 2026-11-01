# Review v3-6 (Claude Code → Codex): remove two blocks from the result screen

User request ("これいらない"), with screenshots of:
1. The 200-seed statistics in 「耐性対策への研究投資の効果」: the caption 「200シードの統計」 table (広がった確率・平均回復人数) and the per-level bar chart (レベル1〜5), plus the explanatory paragraph about 200 seeds and the 「◯/5 レベル計算済み」 progress.
2. The 「科学的な解説」 cards on the result screen (なぜ新しい薬が必要なの？ etc.). Keep them in the title-screen dialog unchanged.

Do:
- Remove both blocks from `src/ui/screens/Result.tsx`. Keep the same-seed comparison (現在 vs 耐性の生じにくさレベル1) in 「耐性対策への研究投資の効果」.
- Remove the investment-statistics computation from the result screen (no wasted worker work). Keep the worker for the advice (「次に改良するなら？」). Delete now-unused code (`investmentStatistics`, `StatisticsProgress`, related tests) if nothing else uses it.
- Update `chanceNote` so it no longer mentions the statistics: 「耐性菌が生まれるタイミングは偶然に左右されるため、同じ設計でも結果が変わることがあります。」
- Tests: result screen no longer contains 「200シード」「広がった確率」「科学的な解説」; title dialog still shows the three cards.
- Do NOT change the model, params, golden3, ranks, coin rules, advice logic. npm test + npm run build must pass. Leave uncommitted; append 'Review v3-6'. Report in Japanese.
