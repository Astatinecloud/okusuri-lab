# Review 3 (Claude Code → Codex)

Verified: 81 tests pass, build OK, Playwright runs of (3,4,1,5), (5,1,2,2), (1,5,1,4) on phone+PC: no errors, no overflow, downloads OK, competitive-release note appears for (1,5,1,4). Remaining issues in ③ 新薬の性能分析:

1. **Tense for hypothetical comparisons.** When a parameter is at level 1 and the card shows the "+1 参考比較", the narrative must be conditional, not past: 「〜を1段階高めると、…が ◯% → ◯% に伸び、回復患者は ◯人 → ◯人 になります。」 Past tense (「高めたことで…でした」) only for real −1 comparisons.
2. **No-change wording.** If a time-above value is unchanged and already 100% (or 0%), do not say 「伸びました」. Use 「すでに 100% に達しているため、この指標は変わりませんでした」 / 「0% のままでした」. Generally: verbs 伸びた/短くなった/変わらなかった chosen from the sign of the difference.
3. **Strongest parameter when nothing mattered.** If the largest recovery gain vs level 1 is ≤ 0, do not name a parameter (current output names 安全性 for design (1,5,1,4) with 0 recovered). Show 「この設計では、どの性能もレベル1と比べて回復数を増やしていません。」
4. **Add 「次の一手」 hint** (new, small): compute the +1 comparison for every parameter below level 5 (mark 予算外 when not affordable; for affordable ones also consider that the player would need to lower another parameter — just state it), and show the one with the largest recovery gain: 「次に1段階上げると最も回復数が増えるのは〈名前〉（+n人）。」 If none increases, say so. Use cachedRun so results are reused. Put it right after the strongest-parameter box.
5. **Wording.** 「耐性菌の最終数の変化は約1.21分の1でした」 → 「耐性菌の最終数が約1.21分の1になりました」. Raise the 「ほぼ変化なし」 band in formatChange to ±5% (currently 「約1.02分の1」 appears). Update its tests.
6. Add tests: (a) level-1 hypothetical narrative contains 「と、」 conditional and not 「たことで」; (b) design all chosen so max gain ≤ 0 → no parameter named; (c) next-step hint picks the max-gain parameter for (5,1,2,2) — it must be 薬剤耐性菌への作用 (+37 people: 8→45); (d) formatChange band.

No model/params/golden changes. npm test + npm run build must pass. Leave uncommitted; append 'Review 3 fixes' to docs/codex-report.md.
