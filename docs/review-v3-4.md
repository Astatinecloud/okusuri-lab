# Review v3-4 (Claude Code → Codex): 「今回のお薬はどうだった？」と「次に改良するなら？」

Goal: explanations on the result screen are generated from the model output (not unconditional templates), and are written in plain Japanese **without any digits, percentages or technical terms**. Model, rules, balance and the main design stay unchanged.

## 1. Result screen order
① 診断結果（既存の大きなランク、回復人数「◯ / 100人」、主な結果1行＝例「この1年で、薬が効きにくい細菌が広がりました／あまり広がりませんでした」）
② 今回のお薬はどうだった？
③ 次に改良するなら？
その後に既存の詳しい結果（1年間のグラフ、100人の内訳、耐性対策の効果、研究コイン、科学的な解説）を「くわしい結果」としてそのまま残す。Numbers are allowed in ① and in the detailed sections; **not in ② and ③**.

## 2. Pure functions (new file `src/game/advice.ts`, no React)
### 2.1 Metrics
`metrics(design, result, table)` from the existing model outputs (`yearOutcome` result `outcomes: PatientStatus[]`, `patientTable`):
- counts per status: well, ill (新薬が効く菌の感染が治りきらない), emerged (治療中に耐性菌), resistant (耐性菌の感染), side (副作用)
- `sCure` = mean of `table.cureS` (how well the drug clears drug-susceptible infections in hosts)
- `spread` = `result.community.months[11].frac >= params3.spreadThreshold`

### 2.2 Common evaluation set (fair comparison)
`evaluate(design)` = run `yearOutcome(design, s, patientTable(design))` for seeds `Z = [currentSeed, 0, 1, …, 29]` (same Z for every design) and return mean recovered, mean of each status count, spread probability. Cache by design key.

### 2.3 「今回のお薬はどうだった？」 `diagnose(design, result, table)` → string[] (2–3 short sentences)
Order: one success sentence (if any) → main issue (if any) → overall sentence.
Success (pick the first that holds):
- `sCure >= 0.9` → 「新薬が効く細菌は、しっかり減らすことができました。」
- `!spread && design.bar >= 3` → 「薬が効きにくい細菌は、この1年ではあまり広がりませんでした。耐性が生じにくい設計が役に立ったようです。」
- `!spread && design.bar <= 2` → 「この1年では、薬が効きにくい細菌はあまり広がりませんでした。」（no attribution to the barrier）
- `side <= 2 && design.gentle >= 3` → 「体への負担が少なく、副作用で治療をやめた人はほとんどいませんでした。」
Main issue = the largest of {resistance = emerged + resistant, side, ill}, only if it is ≥ 5 people:
- resistance & `spread` → 「新薬が効く細菌は減りましたが、薬が効きにくい細菌が生き残り、広がってしまいました。」
- resistance & !spread → 「治療中に、薬が効きにくい細菌が生まれてしまった患者さんがいました。」
- side → 「細菌を減らすことはできましたが、薬が体に合わず、治療を続けられなかった患者さんもいました。」
- ill → decide the limiting factor with internal counterfactual patient tables (ignore budget, internal only): gainDur = sCure(dur+1) − sCure, gainPot = sCure(pot+1) − sCure (0 if already level 5).
  - gainDur > gainPot → 「薬は細菌に作用しましたが、効果が長続きせず、細菌を抑えきれなかった患者さんがいました。」
  - otherwise → 「薬の殺菌力が足りず、新薬が効く細菌が残ってしまった患者さんがいました。」
Overall: `recovered >= 90` → 「薬のさまざまな性能がうまく組み合わさり、多くの患者さんを助けることができました！」; `recovered < 30` and no main issue → 「残念ながら、多くの患者さんを助けることはできませんでした。」
Luck note: if `result.recovered <= evaluate(design).meanRecovered − 15` → 「今回は、薬が効きにくい細菌が早めに現れる不運もありました。」 (and the reverse "幸運" if ≥ +15).

### 2.4 「次に改良するなら？」 `recommend(design, seed)` (async, in the existing Web Worker; show 「考え中…」 while computing)
Candidates (all must satisfy `canAfford`):
- for each key X with level < 5: if `cost(design)+1 <= 9` → design with X+1;
- otherwise, for each Y ≠ X with level ≥ 2 → design with X+1 and Y−1 (coin swap).
Evaluate all with `evaluate` (same Z). Best = max mean recovered; tie → no swap preferred, then lower spread probability.
- If best gain ≥ 1.0 person: show the parameter name (big) and reason text, then the coin text.
  - Reason = based on the parameter AND on which status count decreased the most between current and best (from `evaluate` means). Use only sentences whose premise is true:
    - pot & ill decreased most → 「新薬が効く細菌がまだ残っていました。殺菌力を高めると、さらに細菌を減らせる可能性があります。」
    - pot & resistance decreased most → 「殺菌力を高めると、治療中に薬が効きにくい細菌が増える前に細菌を減らしやすくなり、結果がよくなる見込みです。」
    - bar → 「薬が効きにくい細菌が生まれたり広がったりしたことが、今回の課題でした。耐性が生じにくい薬にすると、そうした細菌が生まれにくく、広がりにくくなり、治療の効果を保ちやすくなります。」（Never say it kills already-existing resistant bacteria.）
    - dur & (ill or emerged decreased most) → 「薬の効果が途中で弱まり、細菌を抑えきれませんでした。効果を長続きさせることが改善につながりそうです。」
    - gentle (side decreased most) → 「細菌を減らす効果はありましたが、体への負担が回復のさまたげになりました。安全性を高めることで、より多くの患者さんが回復できる可能性があります。」
    - fallback for any other combination → 「〈名前〉を高めると、今回より多くの患者さんが回復できる見込みです。」
  - Coin text: free coin → 「まだ使っていない研究コインで強化できます。」; swap → 「研究コインが足りないので、かわりに〈Y の名前〉を一段階下げてみましょう。」
  - Always hedge (「可能性があります」「見込みです」「〜そうです」). Never promise recovery.
- If no candidate gains ≥ 1.0: 「どの性能を一段階変えても、回復する人数ははっきりとは増えませんでした。」 Then, only if true, ONE secondary note: spread probability drops by ≥ 0.1 with some candidate → 「ただし、〈名前〉を高めると、薬が効きにくい細菌が広がりにくくなる見込みです。」; else side count drops by ≥ 2 → 「ただし、〈名前〉を高めると、副作用で治療をやめる人が減る見込みです。」
- If all levels are already maxed within budget and nothing improves, same "no clear improvement" message.

## 3. Tests (Vitest)
- No digits / %, no ASCII letters, no technical words (EC50, μ, 突然変異率, シード, 確率) in any string returned by `diagnose`/`recommend` for all designs in the case list below and for 30 random affordable designs.
- Every recommended design is affordable and differs from the current design in exactly one +1 (and at most one −1).
- `evaluate` uses the same seed list for all candidates.
- Case checks (seed 1; assert the classification, not the exact text):
  1. (5,1,2,4) normal bacteria reduced but resistant remain → main issue = resistance; recommendation = bar (with a swap since coins are 9/9? check cost; it is 4+0+1+3=8 → free coin).
  2. (2,4,2,4) resistance countermeasure effective → success sentence about no spread with barrier attribution.
  3. a duration-limited design (find one where gainDur > gainPot and ill is the main issue, e.g. (3,3,1,…); document which one) → duration sentence.
  4. (3,3,3,1) low safety → main issue = side; recommendation = gentle (or justify).
  5. a balanced design with recovered ≥ 90 (e.g. (2,4,2,5)) → overall success sentence.
  6. budget exhausted design (cost 9, e.g. (3,4,1,4)) → recommendation uses a swap.
  7. a design where no single change improves recovery (search the affordable space for one; document it) → "はっきりとは増えませんでした" message.
- Report the actual sentences produced for the 7 cases in docs/codex-report.md (Claude will review them against the numbers).

## 4. Constraints
Do NOT change src/model/, params*.json, model-ref/, golden3.json, ranks, coin rules. npm test + npm run build must pass. Leave uncommitted; append 'Review v3-4' to docs/codex-report.md with timings for `recommend` (worker). Report in Japanese.
