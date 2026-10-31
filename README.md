# おくすり発明ラボ

日本語の科学教育ゲーム。React 18 / TypeScript / Vite。計算はすべて端末内で行い、サーバーや個人情報の収集は不要です。

## 開発

Node.js 22.18 以降（または24以降）を使用してください。

```sh
npm install
npm run dev
npm test
npm run build
```

Windows PowerShell で npm.ps1 が実行ポリシーにより拒否される場合は `npm.cmd` を使用できます。ビルド成果物は `dist/` に出ます。Vite の `base` は `./` です。デプロイは行っていません。

## 構成

- `docs/implementation-brief.md`: 実装仕様
- `docs/model-spec.md`: 数理モデル仕様
- `src/config/params.json`: Python参照実装と共通の変更していないパラメータ
- `src/model/`: DOMに依存しない計算とPython golden・科学ルールテスト
- `src/ui/`: 自前のSVGイラスト・グラフ・体内アニメーション
- `src/share/`: 検証付きURLハッシュ、QR、1080×1350のcanvas画像
- `docs/codex-report.md`: 実装・検証状況と環境による未完了事項

公開前にはレポートの未確認事項を解消し、実端末で共有・画像保存・QR読み取りを確認してください。
