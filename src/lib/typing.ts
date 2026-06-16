import type { FactorKey, FactorScores, PersonalityType, Profile, TypeMatch } from './types';
import { PERSONALITY_TYPES, BALANCED_TYPE } from '../data/personalityTypes';

/** 最良タイプの適合度がこの値未満なら、特徴が弱いとみなしてバランス型に倒す。 */
export const BALANCED_FALLBACK_THRESHOLD = 62;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * タイプの pattern とスコアの適合度（0-100）。
 * pattern が 'high' を求める因子はスコアそのもの、'low' を求める因子は (100 - スコア) を寄与とし、平均する。
 * 例: 探究者 {O:high,C:high} で O=90,C=80 → (90+80)/2 = 85。
 */
export function fitForType(type: PersonalityType, scores: FactorScores): number {
  const keys = Object.keys(type.pattern) as FactorKey[];
  if (keys.length === 0) return 50; // balanced は中立
  let total = 0;
  for (const key of keys) {
    const want = type.pattern[key];
    const score = scores[key];
    total += want === 'high' ? score : 100 - score;
  }
  return total / keys.length;
}

/** 全タイプを適合度の高い順に並べる。 */
export function rankTypes(profile: Profile): TypeMatch[] {
  return PERSONALITY_TYPES.map((type) => ({
    type,
    fitScore: round1(fitForType(type, profile.scores)),
  })).sort((a, b) => b.fitScore - a.fitScore);
}

/**
 * 最終的な代表タイプを1つ決める。
 * 最良適合度が閾値未満（=どのタイプにも強く当てはまらない）ならバランス型を返す。
 */
export function determineType(profile: Profile): TypeMatch {
  const ranked = rankTypes(profile);
  const best = ranked[0];
  if (!best || best.fitScore < BALANCED_FALLBACK_THRESHOLD) {
    return { type: BALANCED_TYPE, fitScore: best ? best.fitScore : 0 };
  }
  return best;
}

/** 上位 n 件のタイプ（「次に近いタイプ」表示などに使う）。 */
export function topTypes(profile: Profile, n = 3): TypeMatch[] {
  return rankTypes(profile).slice(0, n);
}
