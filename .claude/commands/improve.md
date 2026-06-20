---
description: job-site の継続的改善イテレーションを fullralph & ultracode で起動する
---

fullralph&ultracode で継続的改善を継続する。

これは job-site(Astro 製・日本語「性格タイプ別 適職診断」静的サイト、本番公開済み)の
継続的改善ループの起動コマンド。前セッションまでの到達点を踏まえて次の Iter から再開する。

## 到達済みの基盤(「未実装」と誤認しないこと)
- SEO 構造化データ: WebSite / BreadcrumbList / FAQPage / ItemList の JSON-LD 注入
- a11y: prefers-reduced-motion 包括リセット、Atkinson Hyperlegible フォント、aria-* 一式、skip-link
- OG 画像生成(type 別モノグラム + job 別)、ダークモード、型クリーン化(astro check 0/0/0)
- vitest によるロジック単体テスト(scoring / matching / typing / faq / itemList / breadcrumbs ほか)

## 進め方
1. fullralph のハブ(Claude)として PRD を設計し、各ストーリーを最適エンジンへ routing
2. ultracode(Workflow)で implement→review を 1 ウェーブ = 1 Workflow 呼び出しで回す
3. 独立 code-reviewer で承認 → vitest/build/astro check で実検証 → ブランチを切って push
4. 高〜中価値 backlog はほぼ枯渇のため、**新機能 / データ拡充 / UX 向上の ROI が高いもの**を優先

## フォーカス候補(ROI 順、状況に応じて HUB が選定)
- 診断履歴管理(localStorage 拡張で前回比較) / 結果ページのアクションプラン拡充
- 職業一覧のクライアント検索・フィルタ(小規模・高 ROI)
- 信頼度の詳細化、進捗ステージ可視化、因子別ガイドページ、タイプ×職業マトリックス

引数 `$ARGUMENTS` が与えられたら、それを今回の Iter のフォーカスとして最優先する。

作業の流儀: ブランチを切ってから着手 / build・test が緑のときだけ push / untracked scratch を
commit 前に git status で点検 / EROFS 等の false-FAIL に注意。
