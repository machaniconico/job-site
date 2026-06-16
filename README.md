# 性格診断 (personality-quiz)

Big Five（5因子モデル）で性格を測定し、性格タイプ・5因子スコア・**性格に基づいた適職**を提案する静的サイトです。Astro v6 製で、GitHub Pages に GitHub Actions でデプロイします。診断は完全にクライアント側で動き、回答はブラウザの `localStorage` にのみ保存され、サーバーへ送信されません。

- 公開URL（予定）: `https://machaniconico.github.io/personality-quiz/`
- 設問: 50問（5因子 × 10問、各因子に逆転項目を5問）
- 出力: 12の代表タイプ＋5因子スコアバー＋適職24職種のマッチング

## 必要環境

- Node.js >= 22.12
- pnpm（`corepack enable pnpm` でも可）

## セットアップ（別マシンでもこれだけで再現可能）

```bash
git clone <this repo>
cd personality-quiz   # ローカルのフォルダ名は任意
pnpm install          # esbuild / sharp のビルドは package.json の onlyBuiltDependencies で許可済み
pnpm dev              # http://localhost:4321/personality-quiz/ で確認
```

> `node_modules` と `dist` は生成物なのでリポジトリには含めません。`pnpm install` で再構築されます。

## スクリプト

| コマンド | 内容 |
|---|---|
| `pnpm dev` | 開発サーバー起動 |
| `pnpm build` | 本番ビルド（`dist/` を生成） |
| `pnpm preview` | ビルド結果をローカル配信 |
| `pnpm test` | ロジックのユニットテスト（vitest） |
| `pnpm typecheck` | 型チェック（astro check） |

## ディレクトリ構成

```text
src/
├── data/
│   ├── dimensions.ts        # Big Five 5因子の定義（表示メタ・N反転設定）
│   ├── questions.ts         # 50問（factor / reverse / facet 付き）
│   ├── personalityTypes.ts  # 12タイプ + バランス型
│   └── occupations.ts       # 24職種の Big Five 期待プロファイル
├── lib/
│   ├── types.ts             # ドメイン型
│   ├── scoring.ts           # 逆転処理・正規化・信頼度（+ test）
│   ├── typing.ts            # 性格タイプ判定（+ test）
│   └── matching.ts          # 性格→適職マッチング（+ test）
├── scripts/app.ts           # 診断フローのクライアントロジック
├── layouts/Base.astro       # 共通レイアウト（メタ・OGP・ヘッダ/フッタ）
├── pages/
│   ├── index.astro          # トップ＋診断＋結果
│   ├── about.astro          # 診断モデルの解説
│   └── privacy.astro        # プライバシーポリシー
├── styles/
│   ├── tokens.css           # design-system（astro-blog 由来のデザイントークン）
│   └── global.css           # アプリ全体スタイル
└── assets/fonts/            # Atkinson Hyperlegible
```

## スコアリングの要点

- 各設問は5件法。`reverse` 項目は `6 - value` で反転してから集計（黙従バイアス対策）。
  - このため「全部5」でも全因子が満点にならず中央（50）に寄る。健全性をテストで担保（`src/lib/scoring.test.ts`）。
- 因子スコアは `((sum - count) / (4 * count)) * 100` で 0〜100 に正規化。**規範データに基づく偏差値ではなく、回答内の相対値**。
- 神経症傾向(N)は内部では素のまま扱い、表示時のみ反転して「情緒安定性」として見せる。
- 適職は、ユーザーの5因子と各職種の期待プロファイルの RMSE 距離でマッチ（`matchScore` は 0〜99、100＝断定はしない）。

## デプロイ（GitHub Pages）

1. リポジトリ名を **`personality-quiz`** にする（`astro.config.mjs` の `base: '/personality-quiz'` と一致させること。変える場合は両方変更）。
2. リポジトリの Settings → Pages → Build and deployment → Source を **GitHub Actions** にする。
3. `main` に push すると `.github/workflows/deploy.yml`（`withastro/action`）がビルドして Pages へ公開。

`site` / `base`（`astro.config.mjs`）はプロジェクトページ配信に必須。これらを変えるとアセットURLが変わります。

## 注意

本診断は自己理解のための簡易ツールです。医療・心理判定・採用選考・合否判断の根拠には使用できません。職種の資格・求人・収入などは変動するため、別途公的情報で確認してください。
