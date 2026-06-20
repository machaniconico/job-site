/**
 * 一覧ページ（タイプ一覧・職業一覧）向けの schema.org ItemList 構造化データを
 * 組み立てるヘルパー。
 *
 * ページに並ぶカードと同じ並び順・同じリンク先を JSON-LD でも宣言することで、
 * 検索エンジンに「このページは N 件の項目を集めた一覧である」と伝える。
 * 可視のカードと ItemList が同じ配列から生まれるよう、ページ側は {@link ItemListEntry}
 * の配列を1つ用意すればよい。
 */

export interface ItemListEntry {
  /** 項目の表示名（例: 「探究者」「エンジニア」） */
  name: string;
  /** 項目の詳細ページの絶対URL。href ではなく解決済みの絶対 URL を渡すこと。 */
  url: string;
}

/** schema.org ItemList の最小形（必要なフィールドのみ）。 */
export interface ItemListJsonLd {
  '@context': 'https://schema.org';
  '@type': 'ItemList';
  /** 項目数（itemListElement の長さと一致させる）。 */
  numberOfItems: number;
  itemListElement: {
    '@type': 'ListItem';
    position: number;
    name: string;
    url: string;
  }[];
}

/**
 * ItemList 構造化データ（schema.org）を生成する。
 *
 * position は 1 始まりで、配列の順序（ページ上のカードの並び）をそのまま使う。
 * numberOfItems は要素数から導出するため、入力と必ず一致する。
 *
 * @param entries 表示名と絶対URLの組（表示順）
 * @returns itemListElement を持つ ItemList オブジェクト
 */
export function itemListJsonLd(entries: ItemListEntry[]): ItemListJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    numberOfItems: entries.length,
    itemListElement: entries.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      url: entry.url,
    })),
  };
}
