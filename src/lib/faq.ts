/**
 * よくある質問（FAQ）の表示と schema.org FAQPage 構造化データを組み立てるヘルパー。
 *
 * 可視のアコーディオンと JSON-LD で同じ Q&A 配列を共有するため、
 * ページ側は {@link FaqItem} の配列を1つ用意すればよい。
 */

import type { PersonalityType } from './types';

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

/**
 * 性格タイプ詳細ページ向けの FAQ を、タイプ定義から組み立てる。
 *
 * 検索からタイプページに着地したユーザーがまず抱く問い（どんな性格か / 強み /
 * 気をつけたい点 / 向く仕事）を、タイプの既存フィールドだけで埋める。可視の
 * アコーディオンと FAQPage JSON-LD の両方に同じ配列を渡すため、回答は HTML を
 * 含まないプレーンテキストにする（Google の「可視回答と一致」ポリシー順守）。
 *
 * @param type 対象の性格タイプ
 * @param topJobTitles 「向きやすい仕事 TOP5」の職業名（表示順）。空配列なら仕事の設問は省く
 * @returns 表示順そのままの FAQ 配列
 */
export function buildTypeFaq(
  type: Pick<PersonalityType, 'name' | 'catch' | 'summary' | 'strengths' | 'cautions'>,
  topJobTitles: string[],
): FaqItem[] {
  const { name } = type;
  const quote = (items: string[]) => items.map((item) => `「${item}」`).join('');

  const items: FaqItem[] = [
    {
      question: `「${name}」タイプはどんな性格ですか？`,
      answer: `${type.catch}と表現されるタイプです。${type.summary}`,
    },
  ];

  // strengths/cautions/仕事 は空配列だと「「」といった…」と文面が壊れるため、
  // 中身があるときだけ設問を足す（topJobTitles と同じ防御）。
  if (type.strengths.length > 0) {
    items.push({
      question: `「${name}」タイプの強みは何ですか？`,
      answer: `${quote(type.strengths)}といった点が強みとして表れやすいタイプです。`,
    });
  }

  if (type.cautions.length > 0) {
    items.push({
      question: `「${name}」タイプが気をつけたい点はありますか？`,
      answer: `${quote(type.cautions)}などが挙げられます。弱点というより、意識しておくと活きやすいクセです。`,
    });
  }

  if (topJobTitles.length > 0) {
    items.push({
      question: `「${name}」タイプに向いている仕事は何ですか？`,
      answer: `${quote(topJobTitles)}などと相性が良い傾向があります。マッチ度はあくまで目安で、当てはまらなくても活躍できます。`,
    });
  }

  return items;
}
