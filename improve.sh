#!/usr/bin/env bash
# improve.sh — job-site 継続的改善ループ起動ショートカット
#
# 使い方:
#   ./improve.sh                 # 既定のフォーカスで fullralph & ultracode 継続的改善を起動
#   ./improve.sh "職業検索UIを追加"   # フォーカスを指定して起動
#
# 何をするか:
#   このリポジトリで Claude Code を起動し、fullralph(ハブ&スポーク多エージェント)
#   + ultracode(Workflow オーケストレーション)による継続的改善イテレーションを
#   開始するプロンプトを投入する。前回の到達点(SEO構造化データ / a11y / OG / 型クリーン)
#   を踏まえ、新機能・データ拡充・UX 向上の高 ROI 改善を自走で回す。
#
# 前提:
#   - claude CLI が PATH 上にあること(Claude Code)
#   - このスクリプトはリポジトリ直下に置かれていること

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

FOCUS="${*:-高〜中価値 backlog はほぼ枯渇のため、新機能/データ拡充/UX 向上の ROI が高いものを優先}"

PROMPT="fullralph&ultracode で継続的改善。job-site の継続的改善を継続。前セッションまでの到達点(SEO 構造化データ JSON-LD / a11y 包括化 / OG 画像生成 / 型クリーン化)を踏まえ、次の Iter から再開。フォーカス: ${FOCUS}"

if ! command -v claude >/dev/null 2>&1; then
  echo "エラー: claude CLI が見つかりません。Claude Code をインストール/PATH 設定してください。" >&2
  exit 1
fi

echo "▶ job-site 継続的改善ループを起動します"
echo "  リポジトリ: $REPO_DIR"
echo "  フォーカス: $FOCUS"
echo

exec claude "$PROMPT"
