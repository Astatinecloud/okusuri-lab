# Review v3-3 (Claude Code → Codex): no formulas on the result screen either

User request: the result screen's collapsible 「科学的な解説」 should not show formula/parameter explanations either.

1. In `src/ui/screens/Result.tsx`, replace the content of the 「科学的な解説」 section with the same three cards as the title dialog (`titleScience`) followed by `titleScienceNote` (class `tiny`). Keep it collapsible (details/summary) and keep the existing card style.
2. Remove the formula-based `science` array from `src/config/game.ts` and the `<Glossary />` from the result screen. Also remove any remaining UI text anywhere in the app containing formulas or model symbols (μ, f×c, EC50, G(t), Hill, ロジスティック, βR, gR, crowd, Ki, tau-leaping, etc.) — e.g. ⓘ tooltips / glossary entries / internal-value lines on the lab cards. Replace with one plain-language sentence where an explanation is still useful, or delete. The detailed model stays only in docs/v3-model.md.
3. Update tests: the previous test "the result screen still contains the detailed science section" must change to: the result screen's science section shows exactly the three plain-language headings + note and no formula symbols; add a test scanning all UI strings/components for the banned symbols listed above.
4. Do NOT change src/model/, src/config/params*.json, model-ref/, golden3.json, game balance, rank logic. npm test + npm run build must pass. Leave uncommitted; append 'Review v3-3' to docs/codex-report.md. Report in Japanese.
