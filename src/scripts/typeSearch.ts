/**
 * 性格タイプ一覧ページのクライアントサイド検索。
 *
 * プログレッシブエンハンスメント: JS 無しでは全タイプがそのまま表示される。
 * JS が動くと検索ボックスと件数表示が有効になり、カード(data-search)を即時フィルタ。
 * タイプにはカテゴリが無いため、ジョブ一覧と違いカテゴリチップ・グループ処理は持たない。
 *
 * マッチ規則: 空白(半角/全角)区切りの全語を AND で含む(部分一致・大文字小文字無視)。
 * 検索対象は data-search(タイプ名 + 一言キャッチを連結・正規化済み)。
 */

function normalize(value: string): string {
  return value.replace(/　/g, ' ').toLowerCase().trim();
}

function init(): void {
  const root = document.querySelector<HTMLElement>('[data-type-search]');
  if (!root) return;

  const input = root.querySelector<HTMLInputElement>('#type-search-input');
  const count = document.querySelector<HTMLElement>('#type-search-count');
  const empty = document.querySelector<HTMLElement>('#type-search-empty');
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.type-grid-card[data-search]'));

  if (!input || cards.length === 0) return;

  // 検索 UI は JS が動いて初めて意味を持つので、ここで表示する。
  root.hidden = false;

  const apply = (): void => {
    const terms = normalize(input.value).split(/\s+/).filter(Boolean);
    let visible = 0;

    for (const card of cards) {
      const haystack = card.dataset.search ?? '';
      const show = terms.every((term) => haystack.includes(term));
      card.hidden = !show;
      if (show) visible += 1;
    }

    if (count) count.textContent = `${visible}件のタイプ`;
    if (empty) empty.hidden = visible !== 0;
  };

  input.addEventListener('input', apply);
  apply();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

// この .ts をモジュール扱いにし、トップレベル関数をファイルスコープに閉じる
// （他のクライアントスクリプトと同名関数がグローバルで衝突するのを防ぐ）。
export {};
