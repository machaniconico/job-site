import { describe, expect, it } from 'vitest';
import { buildJobFaq, buildTypeFaq, faqPageJsonLd } from './faq';
import { PERSONALITY_TYPES, BALANCED_TYPE } from '../data/personalityTypes';
import { OCCUPATIONS } from '../data/occupations';

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

describe('buildTypeFaq', () => {
  const investigator = PERSONALITY_TYPES.find((t) => t.id === 'investigator')!;
  const jobs = ['研究者', 'データサイエンティスト'];

  it('指定ありタイプは4問（性格/強み/弱み/仕事）を表示順で返す', () => {
    const faq = buildTypeFaq(investigator, jobs);
    expect(faq).toHaveLength(4);
    expect(faq[0].question).toContain('どんな性格');
    expect(faq[1].question).toContain('強み');
    expect(faq[2].question).toContain('気をつけたい');
    expect(faq[3].question).toContain('向いている仕事');
  });

  it('質問にはタイプ名が、回答にはタイプの実データが埋め込まれる', () => {
    const faq = buildTypeFaq(investigator, jobs);
    for (const item of faq) {
      expect(item.question).toContain(investigator.name);
    }
    expect(faq[0].answer).toContain(investigator.summary);
    expect(faq[0].answer).toContain(investigator.catch);
    expect(faq[1].answer).toContain(investigator.strengths[0]);
    expect(faq[2].answer).toContain(investigator.cautions[0]);
    expect(faq[3].answer).toContain(jobs[0]);
  });

  it('仕事リストが空なら仕事の設問を省き3問になる', () => {
    const faq = buildTypeFaq(investigator, []);
    expect(faq).toHaveLength(3);
    expect(faq.some((item) => item.question.includes('仕事'))).toBe(false);
  });

  it('strengths/cautions が空なら該当設問を省く（文面が壊れない）', () => {
    const bare = { ...investigator, strengths: [], cautions: [] };
    const faq = buildTypeFaq(bare, jobs);
    expect(faq).toHaveLength(2); // 性格 + 仕事 のみ
    expect(faq.some((item) => item.question.includes('強み'))).toBe(false);
    expect(faq.some((item) => item.question.includes('気をつけたい'))).toBe(false);
    for (const item of faq) expect(item.answer).not.toContain('「」');
  });

  it('回答は HTML タグを含まないプレーンテキスト（FAQPage ポリシー順守）', () => {
    const faq = buildTypeFaq(BALANCED_TYPE, jobs);
    for (const item of faq) {
      expect(item.answer).not.toMatch(/<[^>]+>/);
      expect(item.answer.length).toBeGreaterThan(0);
    }
  });

  it('全タイプで生成でき、FAQPage JSON-LD に矛盾なく流せる', () => {
    for (const type of [...PERSONALITY_TYPES, BALANCED_TYPE]) {
      const faq = buildTypeFaq(type, ['仕事A', '仕事B']);
      const ld = faqPageJsonLd(faq);
      expect(ld.mainEntity).toHaveLength(faq.length);
      faq.forEach((item, i) => {
        expect(ld.mainEntity[i].name).toBe(item.question);
        expect(ld.mainEntity[i].acceptedAnswer.text).toBe(item.answer);
      });
    }
  });
});

describe('buildJobFaq', () => {
  const job = OCCUPATIONS[0];
  const typeNames = ['探究者', '革新者'];

  it('指定ありは4問（仕事/スキル/注意/向く性格タイプ）を表示順で返す', () => {
    const faq = buildJobFaq(job, typeNames);
    expect(faq).toHaveLength(4);
    expect(faq[0].question).toContain('どんな仕事');
    expect(faq[1].question).toContain('スキル');
    expect(faq[2].question).toContain('気をつけたい');
    expect(faq[3].question).toContain('性格タイプ');
  });

  it('質問に職業名、回答に職業の実データと性格タイプ名が埋まる', () => {
    const faq = buildJobFaq(job, typeNames);
    for (const item of faq) expect(item.question).toContain(job.title);
    expect(faq[0].answer).toContain(job.description);
    expect(faq[0].answer).toContain(job.category);
    expect(faq[1].answer).toContain(job.skillThemes[0]);
    expect(faq[2].answer).toContain(job.cautions[0]);
    expect(faq[3].answer).toContain(typeNames[0]);
  });

  it('性格タイプ名が空なら該当設問を省き3問になる', () => {
    const faq = buildJobFaq(job, []);
    expect(faq).toHaveLength(3);
    expect(faq.some((item) => item.question.includes('性格タイプ'))).toBe(false);
  });

  it('全60職業で生成でき、HTMLを含まず FAQPage JSON-LD に矛盾なく流せる', () => {
    for (const occ of OCCUPATIONS) {
      const faq = buildJobFaq(occ, typeNames);
      const ld = faqPageJsonLd(faq);
      expect(ld.mainEntity).toHaveLength(faq.length);
      faq.forEach((item, i) => {
        expect(item.answer).not.toMatch(/<[^>]+>/);
        expect(item.answer).not.toContain('「」');
        expect(ld.mainEntity[i].name).toBe(item.question);
        expect(ld.mainEntity[i].acceptedAnswer.text).toBe(item.answer);
      });
    }
  });
});
