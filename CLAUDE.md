# おくすり発明ラボ

## 言語ルール
- ユーザーへの進捗報告・作業説明・レビュー結果・最終回答は、すべて日本語で書く。
- Claude と Codex の内部処理、ソースコード、変数名、技術的に必要なログは英語でもよい。
- Codex が英語で結果を返した場合も、Claude がその内容を日本語で要約・説明してからユーザーに伝える。

## 開発体制
- Claude Code が設計・レビュー、Codex（`codex-companion.mjs task --write`）が実装。Codex のサンドボックスはネットワークと git 書き込みが不可のため、`npm install` とコミットは Claude が行う。
- `model-ref/model3.py`・`src/config/params.json`・`src/config/params3.json`（= `model-ref/params3.json`）はモデルの正。変更したら `model-ref/golden3.py` で `src/model/__tests__/golden3.json` を再生成し、全設計の検証（`docs/v3-model.md` §6）をやり直す。
- v3（1年間の耐性菌モデル）: 仕様 `docs/v3-spec.md`、モデル `docs/v3-model.md`、参照実装 `model-ref/model3.py`。
- `main` に push すると GitHub Actions がテスト・ビルドして GitHub Pages（https://tomoalemon-cloud.github.io/okusuri-lab/）へ公開する。
