# Review v3-7 (Claude Code → Codex): story text, barrier text, germ panel with fixed scale, loading spinners

Display/text changes only. Do NOT change src/model/, params*.json, model-ref/, golden3.json, advice logic results, ranks, coin rules, colors/design.

## 1. Title dialog card 1 (src/config/game.ts `titleScience[0]`)
Heading stays 「なぜ新しい薬が必要なの？」. Body becomes exactly:
「ある日、これまで知られていなかった細菌が見つかりました。この細菌に効く薬はまだありません。そこで、あなたは新しい薬の開発に挑戦することになりました！」
Do not mention resistant bacteria as the reason in this card. (Leave cards 2 and 3 as they are.)

## 2. 「耐性の生じにくさ」 texts (lab card)
- main description (`descriptions.bar`): 「薬が効かない「耐性菌」が生まれにくくなるように、薬の仕組みを工夫する研究です。すでにいる耐性菌を直接倒す効果はありません。」
- 詳しく → メリット (`benefits.bar`): 「耐性菌が生まれる可能性を下げられます。耐性菌が増えにくくなるので、地域への広がりも抑えられます。」
- 詳しく → デメリット (`drawbacks.bar`): 「研究コインが必要で、副作用も少し増えます。また、どれだけ研究しても、耐性菌の出現を完全に防ぐことはできません。」
- No arrows, no 「複数の標的」「出現頻度」「増殖上の負担」 wording anywhere in the UI. Impact tags for bar may stay (耐性菌の出現・地域での広がり).
(Claude verified these statements match the model: bar lowers the emergence frequency/mutation rate, raises the fitness cost which lowers in-host growth and transmission, adds a small side-effect term, and freq > 0 at level 5.)

## 3. Germ panel (`src/ui/components/Body.tsx`, used on the simulation screen)
Keep the existing `Germ` SVG (round faces, green = 新薬が効く菌, purple = 耐性菌), background, icon size. Do not use emoji or new art.
- Title text: 「その月の地域の菌のようす」.
- Input: the month's `YS` and `YR` (regional monthly means from `community.months`), plus an initial frame before month 1 using the initial state (YS = params3.community.Y0, YR = 0).
- **Fixed scale for the whole game: 1 icon = 10 people (PEOPLE_PER_ICON = 10, export as a constant).** Claude checked all 435 designs × 10 seeds: initial = 390 (→ 39 icons), monthly means up to ~920; most months < 200.
  - icons(n) = n <= 0 ? 0 : Math.max(1, Math.round(n / 10)) — a small positive amount shows at least one icon (never looks extinct); zero shows none.
  - Capacity 40 slots. If green + purple > 40: show 40 icons split proportionally (keep at least 1 purple if YR > 0) and show a small badge 「表示の上限です（実際はもっと多い）」. Never change the scale per month.
- Under the panel, show the actual numbers (numbers are fine here): 「新薬が効く菌に感染している人：約◯人　耐性菌に感染している人：約◯人」 (round to integers; if 0 < value < 1 show 「1人未満」). And the scale note: 「菌のイラスト1つ ＝ 感染している人 約10人（少しでもいれば1つ表示）」.
- Stable layout: 40 fixed slot positions (deterministic, like the current formula). Each icon keeps its slot across months; when a color decreases, remove that color's icons from the end of its list; when it increases, place new icons in free slots (deterministic order). Free slots show background (no refill).
- Animation (CSS, ~400 ms): removal = scale down + fade out; appearance = start small/transparent and grow/fade in. Keep the existing gentle floating motion. Respect `prefers-reduced-motion` (no scale animation).
- aria-label summarising the numbers.
- Tests: icons() mapping (0→0, 0.03→1, 4→1, 15→2, 390→39), capacity/proportional split with badge, a decreasing month removes icons but keeps the remaining icons' slots, an increasing month adds icons without moving existing ones, title text.

## 4. Loading spinners on the result screen (`ResultAdvice.tsx`, `adviceClient.ts`, worker)
- While computing: a 32–40 px circular spinner in a soft green matching the palette (CSS border spinner, smooth `linear` rotation; with reduced motion use a slow pulse instead) next to the text:
  - 「今回のお薬はどうだった？」: 「お薬の結果をまとめています…」
  - 「次に改良するなら？」: 「次の改良ポイントを考えています…」
  Use `role="status"` / `aria-live="polite"`.
- Make the two parts independent: the worker posts the diagnosis as soon as it is ready and the recommendation separately; each section hides its own spinner when its own result arrives. No artificial delays.
- Errors / timeouts: if the worker errors or no result arrives within 30 s, stop the spinner and show 「うまく計算できませんでした。」 with a 「もう一度ためす」 button that retries that part. Never spin forever.
- Tests: spinner + message rendered while pending for each section; one section done while the other still pending; error state shows retry button and retry restarts the computation.

## 5. Checks
npm test + npm run build must pass. Leave uncommitted; append 'Review v3-7' to docs/codex-report.md (files changed, what you verified). Report in Japanese.
