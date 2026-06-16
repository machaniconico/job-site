import { describe, it, expect } from 'vitest';
import { QUESTIONS } from '../data/questions';
import { computeProfile } from './scoring';
import { determineType, rankTypes, fitForType, BALANCED_FALLBACK_THRESHOLD } from './typing';
import { PERSONALITY_TYPES, BALANCED_TYPE } from '../data/personalityTypes';
import { OCCUPATIONS } from '../data/occupations';
import { FACTOR_KEYS } from './types';
import type { Answers, FactorKey, Profile } from './types';

const NOW = '2026-06-16T00:00:00.000Z';

/** 指定因子を真に高く/低くした回答を作る（normal=high なら5, reverse は1 で素スコアを上げる）。 */
function profileWith(high: FactorKey[], low: FactorKey[] = []): Profile {
  const answers: Answers = {};
  for (const q of QUESTIONS) {
    let want: 'high' | 'low' | 'mid' = 'mid';
    if (high.includes(q.factor)) want = 'high';
    else if (low.includes(q.factor)) want = 'low';
    let value = 3;
    if (want === 'high') value = q.reverse ? 1 : 5;
    else if (want === 'low') value = q.reverse ? 5 : 1;
    answers[q.id] = value as Answers[string];
  }
  return computeProfile(QUESTIONS, answers, { now: NOW });
}

describe('type catalog integrity', () => {
  it('has 20 named types + a balanced fallback, all with unique ids', () => {
    expect(PERSONALITY_TYPES).toHaveLength(20);
    const ids = PERSONALITY_TYPES.map((t) => t.id).concat(BALANCED_TYPE.id);
    expect(new Set(ids).size).toBe(21);
  });
  it('every type icon is unique', () => {
    const icons = [...PERSONALITY_TYPES, BALANCED_TYPE].map((t) => t.icon);
    expect(new Set(icons).size).toBe(icons.length);
  });
  it('every type pattern combination is unique', () => {
    const keys = [...PERSONALITY_TYPES, BALANCED_TYPE].map((t) =>
      (Object.keys(t.pattern) as (keyof typeof t.pattern)[])
        .sort()
        .map((k) => `${k}:${t.pattern[k]}`)
        .join(','),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
  it('every type has name, catch, icon, summary, strengths, cautions', () => {
    for (const t of [...PERSONALITY_TYPES, BALANCED_TYPE]) {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.catch.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
      expect(t.summary.length).toBeGreaterThan(10);
      expect(t.strengths.length).toBeGreaterThanOrEqual(2);
      expect(t.cautions.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('fitForType', () => {
  it('scores high-pattern by the score, low-pattern by its complement', () => {
    const scores = { O: 90, C: 80, E: 50, A: 50, N: 20 };
    // 探究者 {O:high,C:high} → (90+80)/2 = 85
    const investigator = PERSONALITY_TYPES.find((t) => t.id === 'investigator')!;
    expect(fitForType(investigator, scores)).toBe(85);
    // 挑戦者 {E:high,N:low} → (50 + (100-20))/2 = 65
    const challenger = PERSONALITY_TYPES.find((t) => t.id === 'challenger')!;
    expect(fitForType(challenger, scores)).toBe(65);
  });
  it('returns neutral 50 for an empty pattern', () => {
    expect(fitForType(BALANCED_TYPE, { O: 99, C: 99, E: 99, A: 99, N: 99 })).toBe(50);
  });
});

describe('determineType', () => {
  it('maps high O + high C to the Investigator', () => {
    const match = determineType(profileWith(['O', 'C']));
    expect(match.type.id).toBe('investigator');
    expect(match.fitScore).toBeGreaterThanOrEqual(BALANCED_FALLBACK_THRESHOLD);
  });

  it('maps high E + high A to the Entertainer', () => {
    const match = determineType(profileWith(['E', 'A']));
    expect(match.type.id).toBe('entertainer');
  });

  it('falls back to Balanced when everything is middling', () => {
    const allMid = computeProfile(
      QUESTIONS,
      Object.fromEntries(QUESTIONS.map((q) => [q.id, 3 as Answers[string]])),
      { now: NOW },
    );
    expect(determineType(allMid).type.id).toBe('balanced');
  });

  it('maps high E + low O to the newly added Mover', () => {
    const match = determineType(profileWith(['E'], ['O']));
    expect(match.type.id).toBe('mover');
    expect(match.fitScore).toBeGreaterThanOrEqual(BALANCED_FALLBACK_THRESHOLD);
  });

  it('maps high C + low N to the newly added Realist', () => {
    const match = determineType(profileWith(['C'], ['N']));
    expect(match.type.id).toBe('realist');
    expect(match.fitScore).toBeGreaterThanOrEqual(BALANCED_FALLBACK_THRESHOLD);
  });

  it('rankTypes returns all 20 sorted descending by fit', () => {
    const ranked = rankTypes(profileWith(['O', 'E']));
    expect(ranked).toHaveLength(20);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].fitScore).toBeGreaterThanOrEqual(ranked[i].fitScore);
    }
  });
});

describe('occupation catalog integrity', () => {
  it('has 48 occupations with unique ids', () => {
    expect(OCCUPATIONS).toHaveLength(48);
    expect(new Set(OCCUPATIONS.map((o) => o.id)).size).toBe(48);
  });
  it('every occupation fully satisfies the Occupation shape', () => {
    for (const o of OCCUPATIONS) {
      expect(o.title.length).toBeGreaterThan(0);
      expect(o.category.length).toBeGreaterThan(0);
      expect(o.description.length).toBeGreaterThan(10);
      expect(o.skillThemes).toHaveLength(5);
      expect(o.cautions).toHaveLength(2);
      expect(o.nextActions).toHaveLength(2);
    }
  });
  it('every profile value stays in a non-extreme range (25-85)', () => {
    for (const o of OCCUPATIONS) {
      for (const k of FACTOR_KEYS) {
        expect(o.profile[k]).toBeGreaterThanOrEqual(25);
        expect(o.profile[k]).toBeLessThanOrEqual(85);
      }
    }
  });
});
