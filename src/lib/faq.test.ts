import { describe, expect, it } from 'vitest';
import { faqPageJsonLd } from './faq';

describe('faqPageJsonLd', () => {
  const sample = [
    { question: '無料ですか？', answer: 'はい、すべて無料です。' },
    { question: '何分かかりますか？', answer: '約5分です。' },
  ];

  it('@context と @type が schema.org の FAQPage になる', () => {
    const ld = faqPageJsonLd(sample);
    expect(ld['@context']).toBe('https://schema.org');
    expect(ld['@type']).toBe('FAQPage');
  });

  it('各 FAQ が Question + acceptedAnswer(Answer) に変換され順序を保つ', () => {
    const ld = faqPageJsonLd(sample);
    expect(ld.mainEntity).toHaveLength(2);
    expect(ld.mainEntity.map((e) => e.name)).toEqual([
      '無料ですか？',
      '何分かかりますか？',
    ]);
    for (const entry of ld.mainEntity) {
      expect(entry['@type']).toBe('Question');
      expect(entry.acceptedAnswer['@type']).toBe('Answer');
      expect(typeof entry.acceptedAnswer.text).toBe('string');
    }
    expect(ld.mainEntity[1].acceptedAnswer.text).toBe('約5分です。');
  });

  it('空配列なら mainEntity も空', () => {
    expect(faqPageJsonLd([]).mainEntity).toEqual([]);
  });

  // Google の FAQPage ポリシー: JSON-LD の回答文は可視の回答文と一致している必要がある。
  // 可視アコーディオンも JSON-LD も同じ faqItems から描くため、ヘルパーが入力の
  // question/answer をそのまま name/acceptedAnswer.text に写すことを不変条件として固定する。
  it('入力の question/answer を変換せずそのまま name/text に写す', () => {
    const ld = faqPageJsonLd(sample);
    sample.forEach((item, i) => {
      expect(ld.mainEntity[i].name).toBe(item.question);
      expect(ld.mainEntity[i].acceptedAnswer.text).toBe(item.answer);
    });
  });
});
