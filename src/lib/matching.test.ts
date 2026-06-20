import { describe, expect, it } from 'vitest';
import { matchScore, buildMatchReasons, rankOccupations } from './matching';
import { OCCUPATIONS } from '../data/occupations';
import type { FactorScores, Occupation, Profile } from './types';

/** scores だけを持つ最小の Profile（buildMatchReasons / matchScore は scores しか見ない）。 */
function profileOf(scores: FactorScores): Profile {
  return {
    scores,
    levels: { O: 'mid', C: 'mid', E: 'mid', A: 'mid', N: 'mid' },
    answeredCount: 0,
    totalQuestions: 0,
    completionRate: 0,
    confidence: '低',
    confidenceReason: '',
    generatedAt: '',
  };
}

const occ = (profile: FactorScores): Occupation => ({
  id: 'x',
  title: 'テスト職',
  category: 'テスト',
  profile,
  description: '',
  skillThemes: [],
  cautions: [],
  nextActions: [],
});

// Iter31 で除去した「高 N=強み」根拠文。今後どの職業でも生成されてはならない。
const REMOVED_HIGH_N = '細やかな感受性や気づきが、この仕事の質を支えます。';
const LOW_N_STABILITY = 'プレッシャーのかかる場面でも落ち着ける、情緒の安定が活きます。';

describe('matchScore', () => {
  it('0〜99 に収まり 100 は出さない（適職を断定しない）', () => {
    const p = profileOf({ O: 50, C: 50, E: 50, A: 50, N: 50 });
    for (const o of OCCUPATIONS) {
      const s = matchScore(p, o);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(99);
    }
  });
});

describe('buildMatchReasons — N は低い側のみ根拠化する', () => {
  it('高 N の根拠文はどの実職業でも生成されない（全因子 high のユーザーでも）', () => {
    const allHigh = profileOf({ O: 100, C: 100, E: 100, A: 100, N: 100 });
    for (const o of OCCUPATIONS) {
      expect(buildMatchReasons(allHigh, o)).not.toContain(REMOVED_HIGH_N);
    }
  });

  it('職業 N が高くてもユーザー高 N でも、高 N 根拠は出さない（データ非依存でロック）', () => {
    const syntheticHighN = occ({ O: 50, C: 50, E: 50, A: 50, N: 70 });
    const userHighN = profileOf({ O: 50, C: 50, E: 50, A: 50, N: 75 });
    expect(buildMatchReasons(userHighN, syntheticHighN)).not.toContain(REMOVED_HIGH_N);
  });

  it('職業 N 低 × ユーザー N 低 では情緒安定の根拠が出る', () => {
    const lowNOcc = occ({ O: 50, C: 50, E: 50, A: 50, N: 35 });
    const lowNUser = profileOf({ O: 50, C: 50, E: 50, A: 50, N: 30 });
    expect(buildMatchReasons(lowNUser, lowNOcc)).toContain(LOW_N_STABILITY);
  });

  it('高 O 職業 × 高 O ユーザーでは開放性の根拠が出る', () => {
    const highOOcc = occ({ O: 75, C: 50, E: 50, A: 50, N: 50 });
    const highOUser = profileOf({ O: 80, C: 50, E: 50, A: 50, N: 50 });
    expect(buildMatchReasons(highOUser, highOOcc)).toContain(
      '好奇心や発想力が求められる場面が多く、開放性の高さが活きます。',
    );
  });

  it('方向一致が無ければ総合的な近さのフォールバック文を返す', () => {
    const mid = profileOf({ O: 50, C: 50, E: 50, A: 50, N: 50 });
    const midOcc = occ({ O: 50, C: 50, E: 50, A: 50, N: 50 });
    const reasons = buildMatchReasons(mid, midOcc);
    expect(reasons).toEqual(['5つの factor の総合的な近さから、比較的相性が良いと出ています。']);
  });

  it('根拠は最大4件に絞られる（5因子すべて一致する入力で実際に切り詰める）', () => {
    // O/C/E/A は高一致（各 high 根拠）、N は低一致（情緒安定の根拠）→ 候補5件 → 4件に絞る。
    const user = profileOf({ O: 80, C: 80, E: 80, A: 80, N: 30 });
    const occHighOCEA_lowN = occ({ O: 70, C: 70, E: 70, A: 70, N: 35 });
    const reasons = buildMatchReasons(user, occHighOCEA_lowN);
    expect(reasons).toHaveLength(4);
  });
});

describe('rankOccupations', () => {
  it('matchScore 降順で全職業を返す', () => {
    const p = profileOf({ O: 70, C: 65, E: 45, A: 55, N: 40 });
    const ranked = rankOccupations(OCCUPATIONS, p);
    expect(ranked).toHaveLength(OCCUPATIONS.length);
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i - 1].matchScore).toBeGreaterThanOrEqual(ranked[i].matchScore);
    }
  });
});
