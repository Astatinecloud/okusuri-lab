# Review v3-5 (Claude Code → Codex): explanation must not contradict the numbers

Claude reviewed the 7 case outputs in docs/codex-report.md. Two contradictions:

1. **Case 3 (2,5,1,4), recovered 3, sCure 0.03.** The success sentence 「薬が効きにくい細菌は…あまり広がりませんでした。耐性が生じにくい設計が役に立ったようです。」 is misleading: resistance did not spread because the drug barely cleared susceptible infections (little selection), not thanks to the barrier.
   - Rule: the no-spread success sentences (with or without attribution) are allowed only when `sCure >= 0.5`. Attribution to the barrier additionally requires `design.bar >= 3`.
   - Also, diagnosis said duration-limited while the recommendation was potency (gainDur 0.970 vs gainPot 0.960 is a tie). Rule: if `|gainDur − gainPot| < 0.05`, use the neutral sentence 「薬の殺菌力や効果が続く時間が足りず、新薬が効く細菌が残ってしまった患者さんがいました。」. When not a tie and the recommendation is pot or dur, keep them consistent: if the recommended key is pot or dur, the ill-sentence must name the same factor (prefer the recommendation's factor).
2. **Case 6 (3,4,2,4), side = 3.** The gentle reason 「細菌を減らす効果はありましたが、体への負担が回復のさまたげになりました。…」 states a past problem that did not happen in this result.
   - General rule for ALL reason texts: a sentence that states a past problem (「〜が今回の課題でした」「〜残っていました」「〜さまたげになりました」「〜抑えきれませんでした」) may be used only if that problem category is ≥ 5 people in the current result. Otherwise use a forward-looking version without a past claim, e.g.
     - gentle: 「安全性を高めると、副作用で治療をやめる人が減り、より多くの患者さんが回復できる見込みです。」
     - bar: 「耐性が生じにくい薬にすると、薬が効きにくい細菌が生まれにくく、広がりにくくなり、治療の効果を保ちやすくなる見込みです。」
     - pot: 「殺菌力を高めると、細菌をより確実に減らせる見込みです。」
     - dur: 「効果が続く時間をのばすと、細菌をより長く抑えられる見込みです。」
3. Add tests for both rules (case 3 and case 6 outputs; and a property test over all 435 designs × seed 1: if a past-problem sentence appears, the matching category count ≥ 5; if a no-spread success sentence appears, sCure ≥ 0.5). Regenerate the 7-case report section with the new outputs.

Do NOT change the model, params, golden3, ranks, coin rules. npm test + npm run build must pass. Leave uncommitted; append 'Review v3-5'. Report in Japanese.
