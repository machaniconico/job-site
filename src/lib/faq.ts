/**
 * よくある質問（FAQ）の表示と schema.org FAQPage 構造化データを組み立てるヘルパー。
 *
 * 可視のアコーディオンと JSON-LD で同じ Q&A 配列を共有するため、
 * ページ側は {@link FaqItem} の配列を1つ用意すればよい。
 */

export interface FaqItem {
  /** 質問文 */
  question: string;
  /** 回答（プレーンテキスト。HTML タグは入れない） */
  answer: string;
}

/** schema.org FAQPage の最小形（必要なフィールドのみ）。 */
export interface FaqPageJsonLd {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: {
    '@type': 'Question';
    name: string;
    acceptedAnswer: {
      '@type': 'Answer';
      text: string;
    };
  }[];
}

/**
 * FAQPage 構造化データ（schema.org）を生成する。
 *
 * 各 FAQ を Question + acceptedAnswer(Answer) に変換する。
 *
 * @param items 質問と回答の組（表示順をそのまま使う）
 * @returns mainEntity を持つ FAQPage オブジェクト
 */
export function faqPageJsonLd(items: FaqItem[]): FaqPageJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}
