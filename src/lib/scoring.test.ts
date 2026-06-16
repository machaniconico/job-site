import { describe, it, expect } from 'vitest';
import { QUESTIONS } from '../data/questions';
import {
  computeProfile,
  computeFacetScores,
  applyReverse,
  normalize,
  levelOf,
  displayScore,
  LEVEL_HIGH_THRESHOLD,
  LEVEL_LOW_THRESHOLD,
} from './scoring';
import type { Answers, FactorKey } from './types';

const FACTORS: FactorKey[] = ['O', 'C', 'E', 'A', 'N'];
const NOW = '2026-06-16T00:00:00.000Z';

function answerAll(value: number): Answers {
  return Object.fromEntries(QUESTIONS.map((q) => [q.id, value as Answers[string]]));
}

function facetScore(factor: FactorKey, facet: string, answers: Answers) {
  const score = computeFacetScores(QUESTIONS, answers)[factor].find((item) => item.facet === facet);
  expect(score).toBeDefined();
  return score!;
}

describe('question bank integrity', () => {
  it('has exactly 50 questions, 10 per factor, 5 reverse each', () => {
    expect(QUESTIONS).toHaveLength(50);
    for (const f of FACTORS) {
      const items = QUESTIONS.filter((q) => q.factor === f);
      expect(items, `factor ${f} count`).toHaveLength(10);
      expect(items.filter((q) => q.reverse), `factor ${f} reverse count`).toHaveLength(5);
    }
  });

  it('uses varied facets within each factor (no paraphrase-spam)', () => {
    for (const f of FACTORS) {
      const facets = new Set(QUESTIONS.filter((q) => q.factor === f).map((q) => q.facet));
      // 10問で最低4ファセットは別物であること
      expect(facets.size, `factor ${f} distinct facets`).toBeGreaterThanOrEqual(4);
    }
  });

  it('has unique question ids', () => {
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(QUESTIONS.length);
  });
});

describe('reverse scoring (the core fix)', () => {
  it('applyReverse flips on a 5-point scale', () => {
    expect(applyReverse(5, true)).toBe(1);
    expect(applyReverse(1, true)).toBe(5);
    expect(applyReverse(4, false)).toBe(4);
  });

  it('all-5 answers do NOT max out any factor — they land at the midpoint (50)', () => {
    const profile = computeProfile(QUESTIONS, answerAll(5), { now: NOW });
    for (const f of FACTORS) {
      expect(profile.scores[f], `factor ${f}`).toBe(50);
    }
  });

  it('all-1 answers also land at 50 (acquiescence cancels out)', () => {
    const profile = computeProfile(QUESTIONS, answerAll(1), { now: NOW });
    for (const f of FACTORS) {
      expect(profile.scores[f]).toBe(50);
    }
  });

  it('answering true-high on a factor pushes it to 100', () => {
    // O を真に高くする: 正項目=5, 逆転項目=1。他因子は中立(3)。
    const answers: Answers = {};
    for (const q of QUESTIONS) {
      if (q.factor === 'O') answers[q.id] = (q.reverse ? 1 : 5) as Answers[string];
      else answers[q.id] = 3 as Answers[string];
    }
    const profile = computeProfile(QUESTIONS, answers, { now: NOW });
    expect(profile.scores.O).toBe(100);
    expect(profile.levels.O).toBe('high');
    expect(profile.scores.C).toBe(50);
  });
});

describe('normalize', () => {
  it('maps all-min to 0 and all-max to 100', () => {
    expect(normalize(10, 10)).toBe(0); // 全項目1
    expect(normalize(50, 10)).toBe(100); // 全項目5
    expect(normalize(30, 10)).toBe(50); // 全項目3
  });
  it('returns 0 for zero count', () => {
    expect(normalize(0, 0)).toBe(0);
  });
});

describe('facet scoring', () => {
  it('computes facet scores with stable factor-local facet order', () => {
    const answers: Answers = {
      q01: 5,
      q07: 1,
      q02: 1,
      q08: 5,
    };

    const facets = computeFacetScores(QUESTIONS, answers);

    expect(facets.O.map((item) => item.facet)).toEqual([
      '審美',
      'アイデア',
      '行動',
      '知的好奇心',
      '想像',
      '価値',
    ]);
    expect(facetScore('O', '審美', answers)).toEqual({
      facet: '審美',
      score: 100,
      answered: 2,
      total: 2,
    });
    expect(facetScore('O', 'アイデア', answers)).toEqual({
      facet: 'アイデア',
      score: 0,
      answered: 2,
      total: 2,
    });
  });

  it('applies reverse items before aggregating a facet', () => {
    const answers: Answers = {
      q11: 5,
      q16: 1,
      q14: 1,
      q18: 5,
    };

    expect(facetScore('C', '秩序', answers)).toEqual({
      facet: '秩序',
      score: 100,
      answered: 2,
      total: 2,
    });
    expect(facetScore('C', '慎重', answers)).toEqual({
      facet: '慎重',
      score: 0,
      answered: 2,
      total: 2,
    });
  });

  it('keeps unanswered facets measurable by answered and total without marking them low', () => {
    const answers: Answers = { q01: 4 };

    expect(facetScore('O', '審美', answers)).toEqual({
      facet: '審美',
      score: 75,
      answered: 1,
      total: 2,
    });
    expect(facetScore('O', 'アイデア', answers)).toEqual({
      facet: 'アイデア',
      score: 50,
      answered: 0,
      total: 2,
    });
  });

  it('aligns with the factor score when all facets in a factor are answered', () => {
    const answers = answerAll(3);
    const overrides: Answers = {
      q01: 5,
      q02: 4,
      q03: 3,
      q04: 2,
      q05: 1,
      q06: 1,
      q07: 2,
      q08: 3,
      q09: 4,
      q10: 5,
    };
    Object.assign(answers, overrides);

    const profile = computeProfile(QUESTIONS, answers, { now: NOW });
    const facets = computeFacetScores(QUESTIONS, answers).O;
    const weightedFacetScore =
      facets.reduce((sum, facet) => sum + facet.score * facet.answered, 0) /
      facets.reduce((sum, facet) => sum + facet.answered, 0);

    expect(weightedFacetScore).toBeCloseTo(profile.scores.O, 5);
  });
});

describe('levels', () => {
  it('classifies by threshold', () => {
    expect(levelOf(LEVEL_HIGH_THRESHOLD)).toBe('high');
    expect(levelOf(LEVEL_LOW_THRESHOLD)).toBe('low');
    expect(levelOf(50)).toBe('mid');
  });
});

describe('confidence', () => {
  it('is 低 when there are unanswered questions', () => {
    const partial: Answers = { q01: 4, q02: 5 };
    const profile = computeProfile(QUESTIONS, partial, { now: NOW });
    const answeredFactors = new Set(
      QUESTIONS.filter((q) => partial[q.id] !== undefined).map((q) => q.factor),
    );
    expect(profile.confidence).toBe('低');
    expect(profile.completionRate).toBeLessThan(100);
    for (const f of FACTORS.filter((factor) => !answeredFactors.has(factor))) {
      expect(profile.scores[f]).toBe(50);
      expect(profile.levels[f]).not.toBe('low');
    }
  });

  it('is 中 when fully answered but answers have no spread', () => {
    const profile = computeProfile(QUESTIONS, answerAll(4), { now: NOW });
    expect(profile.completionRate).toBe(100);
    expect(profile.confidence).toBe('中');
  });
});

describe('displayScore', () => {
  it('inverts only when inverted=true (N shown as emotional stability)', () => {
    expect(displayScore(30, true)).toBe(70);
    expect(displayScore(30, false)).toBe(30);
  });
});

describe('determinism', () => {
  it('uses injected now', () => {
    const profile = computeProfile(QUESTIONS, answerAll(3), { now: NOW });
    expect(profile.generatedAt).toBe(NOW);
  });
});
