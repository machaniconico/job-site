/**
 * 職業一覧ページのクライアントサイド検索 / カテゴリ絞り込み。
 *
 * プログレッシブエンハンスメント: JS 無しでは全職業がそのまま表示される。
 * JS が動くと、検索ボックス・カテゴリチップ・件数表示が有効になり、
 * カード(data-search / data-category)を即時フィルタする。
 *
 * マッチ規則:
 *   - カテゴリ: 「すべて」または選択カテゴリと一致
 *   - キーワード: 空白(半角/全角)区切りの全語を AND で含む(部分一致・大文字小文字無視)
 * 検索対象は data-search(職業名 + 説明 + スキル + カテゴリを連結・正規化済み)。
 */

function normalize(value: string): string {
  // 全角空白を半角化し、小文字化してトリム。data-search 側も同じ正規化で生成する。
  return value.replace(/　/g, ' ').toLowerCase().trim();
}

function init(): void {
  const root = document.querySelector<HTMLElement>('[data-job-search]');
  if (!root) return;

  const input = root.querySelector<HTMLInputElement>('#job-search-input');
  const chips = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-category-chip]'));
  const count = document.querySelector<HTMLElement>('#job-search-count');
  const empty = document.querySelector<HTMLElement>('#job-search-empty');
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.job-grid-card[data-search]'));
  const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-job-group]'));

  if (!input || cards.length === 0) return;

  // 絞り込みコントロールは JS が動いて初めて意味を持つので、ここで表示する。
  root.hidden = false;

  let activeCategory = '';

  const apply = (): void => {
    const terms = normalize(input.value).split(/\s+/).filter(Boolean);
    let visible = 0;

    for (const card of cards) {
      const haystack = card.dataset.search ?? '';
      const matchesCategory = activeCategory === '' || card.dataset.category === activeCategory;
      const matchesQuery = terms.every((term) => haystack.includes(term));
      const show = matchesCategory && matchesQuery;
      card.hidden = !show;
      if (show) visible += 1;
    }

    // カードが 1 枚も残らないカテゴリ見出しは丸ごと隠す。
    for (const group of groups) {
      const anyVisible = group.querySelector('.job-grid-card:not([hidden])') !== null;
      group.hidden = !anyVisible;
    }

    if (count) count.textContent = `${visible}件の職業`;
    if (empty) empty.hidden = visible !== 0;
  };

  input.addEventListener('input', apply);

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      activeCategory = chip.dataset.categoryChip ?? '';
      for (const other of chips) {
        other.setAttribute('aria-pressed', other === chip ? 'true' : 'false');
      }
      apply();
    });
  }

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
