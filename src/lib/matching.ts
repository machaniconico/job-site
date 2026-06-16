import type { FactorKey, FactorScores, Occupation, OccupationMatch, Profile } from './types';
import { FACTOR_KEYS } from './types';
import { clamp, levelOf } from './scoring';

/**
 * 距離→適合度の変換係数。
 * profile 値はおよそ 38-82 に収まるため、素の (100 - RMSE) だと差が出にくい。係数で広げる。
 * 注意: matchScore は「相対的な近さ」の目安であって、適性の断定ではない。
 */
export const DISTANCE_SCALE = 1.4;

/** 2つの Big Five ベクトル間の二乗平均平方根誤差（0 に近いほど似ている）。 */
export function rmse(a: FactorScores, b: FactorScores): number {
  let total = 0;
  for (const key of FACTOR_KEYS) {
    total += (a[key] - b[key]) ** 2;
  }
  return Math.sqrt(total / FACTOR_KEYS.length);
}

/** 適合度 0-99（100 は出さない＝適職を断定しない）。 */
export function matchScore(profile: Profile, occupation: Occupation): number {
  const distance = rmse(profile.scores, occupation.profile);
  return clamp(Math.round(100 - distance * DISTANCE_SCALE), 0, 99);
}

// 因子が同方向（ユーザーも職業も高い／低い）に一致したときの根拠文。
const REASON_HIGH: Record<FactorKey, string> = {
  O: '好奇心や発想力が求められる場面が多く、開放性の高さが活きます。',
  C: '正確さや計画性が重視され、誠実性の高さが信頼につながります。',
  E: '人と関わり前に出る場面が多く、外向性の高さが強みになります。',
  A: '思いやりや協力が求められ、協調性の高さが信頼関係を築きます。',
  N: '細やかな感受性や気づきが、この仕事の質を支えます。',
};
const REASON_LOW: Record<FactorKey, string> = {
  O: '決まった手順を着実にこなす場面が多く、現実的で地に足のついた進め方が合います。',
  C: '型にはまらない柔軟さや即興が活きる場面が多い仕事です。',
  E: '一人で集中する時間が多く、落ち着いて深く取り組む内向的な強みが活きます。',
  A: '情に流されず是々非々で判断する場面が多く、独立した判断力が活きます。',
  N: 'プレッシャーのかかる場面でも落ち着ける、情緒の安定が活きます。',
};

/** その職業が因子をどの方向に要求するか（職業プロファイル基準）。 */
const OCC_HIGH = 60;
const OCC_LOW = 40;

/**
 * 「なぜこの性格に合うか」を、ユーザーの際立った因子と職業プロファイルの方向一致から生成する。
 * N（神経症傾向）は素スコア基準: 職業が N 低（情緒安定を要する）×ユーザーも低 → 安定の理由、
 * 職業が N 高（繊細さ許容）×ユーザーも高 → 感受性の理由。
 */
export function buildMatchReasons(profile: Profile, occupation: Occupation): string[] {
  const reasons: string[] = [];
  for (const key of FACTOR_KEYS) {
    const userLevel = levelOf(profile.scores[key]);
    const occScore = occupation.profile[key];
    if (occScore >= OCC_HIGH && userLevel === 'high') {
      reasons.push(REASON_HIGH[key]);
    } else if (occScore <= OCC_LOW && userLevel === 'low') {
      reasons.push(REASON_LOW[key]);
    }
  }
  if (reasons.length === 0) {
    reasons.push('5つの factor の総合的な近さから、比較的相性が良いと出ています。');
  }
  return reasons.slice(0, 4);
}

/** 職業を適合度の高い順に並べ、根拠文を添えて返す。 */
export function rankOccupations(occupations: Occupation[], profile: Profile): OccupationMatch[] {
  return occupations
    .map((occupation) => ({
      ...occupation,
      matchScore: matchScore(profile, occupation),
      matchReasons: buildMatchReasons(profile, occupation),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
}
