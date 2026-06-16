import type {
  Answers,
  Confidence,
  FactorKey,
  FactorScores,
  Level,
  Profile,
  Question,
} from './types';
import { FACTOR_KEYS } from './types';

/** high/low 判定の閾値（素点ベース。規範データではない目安）。 */
export const LEVEL_HIGH_THRESHOLD = 60;
export const LEVEL_LOW_THRESHOLD = 40;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * 逆転を適用した回答値を返す。reverse 項目は 6 - value（5件法の反転）。
 * これにより黙従バイアス（一律高評価）を打ち消す。
 */
export function applyReverse(value: number, reverse: boolean): number {
  return reverse ? 6 - value : value;
}

/**
 * 因子スコアを 0-100 に正規化する。
 *   normalized = ((sum - count) / (4 * count)) * 100
 * 逆転適用後の値で、全項目が最小(1)なら 0、最大(5)なら 100。
 */
export function normalize(sum: number, count: number): number {
  if (count === 0) return 0;
  return ((sum - count) / (4 * count)) * 100;
}

export function levelOf(score: number): Level {
  if (score >= LEVEL_HIGH_THRESHOLD) return 'high';
  if (score <= LEVEL_LOW_THRESHOLD) return 'low';
  return 'mid';
}

export interface ComputeOptions {
  /** 生成時刻を注入可能にする（テストの決定性のため）。未指定なら現在時刻。 */
  now?: string;
}

/**
 * 回答から Big Five プロファイルを計算する。
 * - 逆転処理を適用
 * - 因子ごとに 0-100 正規化
 * - high/mid/low 判定
 * - 完答状況と回答のばらつきから結果信頼度（測定上の信頼性係数ではなく解釈の目安）を出す
 */
export function computeProfile(
  questions: Question[],
  answers: Answers,
  options: ComputeOptions = {},
): Profile {
  const sums: Record<FactorKey, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  const counts: Record<FactorKey, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  const rawValues: number[] = [];
  let answeredCount = 0;

  for (const question of questions) {
    const raw = answers[question.id];
    if (raw === undefined || raw === null) continue;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) continue;
    const value = clamp(numeric, 1, 5);
    sums[question.factor] += applyReverse(value, question.reverse);
    counts[question.factor] += 1;
    rawValues.push(value); // 素の回答値（回答スタイルの偏り検出に使う）
    answeredCount += 1;
  }

  const scores = {} as FactorScores;
  const levels = {} as Record<FactorKey, Level>;
  for (const key of FACTOR_KEYS) {
    const score = counts[key] === 0 ? 50 : round1(normalize(sums[key], counts[key]));
    scores[key] = score;
    levels[key] = levelOf(score);
  }

  const total = questions.length;
  const completionRate = total === 0 ? 0 : round1((answeredCount / total) * 100);
  const sd = standardDeviation(rawValues);

  let confidence: Confidence = '高';
  let confidenceReason =
    '全問に回答され、回答にも適度なばらつきがあります。安定した目安として読めます。';
  if (answeredCount < total) {
    confidence = '低';
    confidenceReason = '未回答があるため、結果は暫定です。全問に答えると精度が上がります。';
  } else if (sd < 0.8) {
    confidence = '中';
    confidenceReason =
      '回答のばらつきが小さく（似た評価が続いています）、因子間の差が出にくい結果です。大まかな傾向としてご覧ください。';
  }

  return {
    scores,
    levels,
    answeredCount,
    totalQuestions: total,
    completionRate,
    confidence,
    confidenceReason,
    generatedAt: options.now ?? new Date().toISOString(),
  };
}

/**
 * 表示用スコア。inverted な因子（N）は 100 - score を返し「情緒安定性」として見せる。
 * 内部ロジック（タイプ判定・職業マッチ）は常に素のスコアを使うこと。
 */
export function displayScore(score: number, inverted: boolean): number {
  return inverted ? round1(100 - score) : round1(score);
}
