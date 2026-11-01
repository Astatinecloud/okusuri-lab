# Review v3-2 (Claude Code → Codex): simplify the title-screen "このゲームの科学的背景"

Audience: general festival visitors. Change ONLY the dialog opened from the title screen button 「このゲームの科学的背景」 (GameDialog, modal === 'science').

1. Show exactly three cards (existing `.science-card` style), in this order, text verbatim:
   1. 見出し「なぜ新しい薬が必要なの？」 本文「細菌の中には、これまでの薬が効きにくいものもいます。そこで、新しい薬の開発が必要になります。」
   2. 見出し「薬剤耐性菌ってなに？」 本文「特定の薬が効きにくい細菌のことです。薬を使うことで、耐性菌が生き残り、増えてしまうことがあります。」
   3. 見出し「このゲームでは？」 本文「研究予算を使って、薬の強さ・耐性の生じにくさ・効果が続く時間・安全性を工夫し、100人の患者を救う新薬を開発します。」
   Then a small note (class `tiny`): 「このゲームは科学を学ぶための簡略化したシミュレーションです。実際の治療結果を予測するものではありません。」 and the existing とじる button.
2. Remove from this dialog: the 「モデルについて」 heading, the `adult` text, the Glossary, and every formula / parameter explanation. Put the new texts in `src/config/game.ts` as a new export (e.g. `titleScience` and `titleScienceNote`); keep the existing detailed `science` array unchanged — it is still used in the result screen's collapsible 「科学的な解説」.
3. Delete the unreachable `modal === 'mechanism'` branch in GameDialog (no caller; its text is outdated).
4. On phones (360px) the three cards must fit without horizontal scroll; keep the dialog scrollable if needed.
5. Tests: the title science dialog renders exactly the three headings and the note, and contains none of 「μ」「EC50」「G(t)」「Hill」「ロジスティック」; the result screen still contains the detailed science section.
6. Do NOT change src/model/, src/config/params*.json, model-ref/, golden3.json, game balance or rank logic. npm test + npm run build must pass. Leave uncommitted; append 'Review v3-2' to docs/codex-report.md.
