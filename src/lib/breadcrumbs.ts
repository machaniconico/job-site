/**
 * パンくず（Breadcrumb）の表示と schema.org 構造化データを組み立てるためのヘルパー。
 *
 * 表示用ナビと JSON-LD で同じ並び（ホーム→…→現在ページ）を共有するため、
 * ページ側は {@link Breadcrumb} の配列を1つだけ用意すればよい。
 */

export interface Breadcrumb {
  /** 表示名（例: 「タイプ一覧」） */
  name: string;
  /** サイト内の相対パス。BASE_URL 込み（例: `/job-site/types/`）。現在ページも含む。 */
  href: string;
}

/** schema.org BreadcrumbList の最小形（必要なフィールドのみ）。 */
export interface BreadcrumbListJsonLd {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: {
    '@type': 'ListItem';
    position: number;
    name: string;
    item: string;
  }[];
}

/**
 * BreadcrumbList 構造化データ（schema.org）を生成する。
 *
 * position は 1 始まりで、配列の順序（ホーム→…→現在ページ）をそのまま使う。
 *
 * @param crumbs 表示名と絶対URLの組。href ではなく、解決済みの絶対 URL を渡すこと。
 * @returns itemListElement を持つ BreadcrumbList オブジェクト
 */
export function breadcrumbListJsonLd(
  crumbs: { name: string; url: string }[]
): BreadcrumbListJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
