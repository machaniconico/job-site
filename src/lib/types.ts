/**
 * 性格診断サイトのドメイン型。
 * 主軸は Big Five（5因子）。職業はその性格プロファイルから派生して提示する従的出力。
 */

/** Big Five の因子キー。N は「神経症傾向」だが、UI では情緒安定性（反転）として見せる。 */
export type FactorKey = 'O' | 'C' | 'E' | 'A' | 'N';

export const FACTOR_KEYS: readonly FactorKey[] = ['O', 'C', 'E', 'A', 'N'] as const;

/** 因子の定義（表示用メタ情報）。 */
export interface Factor {
  key: FactorKey;
  /** 日本語ラベル（例: 開放性） */
  label: string;
  /** 英名（Openness など） */
  englishName: string;
  /** UI 表示上の軸名。N は「情緒安定性」として高低を反転表示する。 */
  displayLabel: string;
  /**
   * 表示時にスコアの高低を反転するか。内部スコアは常に素の因子基準だが、
   * N（神経症傾向）は inverted=true で「情緒安定性」として反転表示する。
   * highBlurb / lowBlurb は displayLabel（反転後）基準で記述する。
   */
  inverted: boolean;
  /** スコアが高い人の傾向（1〜2文） */
  highBlurb: string;
  /** スコアが低い人の傾向（1〜2文） */
  lowBlurb: string;
  /** 軸そのものの説明 */
  description: string;
}

/** 5件法の回答値。 */
export type LikertValue = 1 | 2 | 3 | 4 | 5;

/** 設問。reverse=true は逆転項目（黙従バイアス対策）。facet で下位特性を明示し、言い換えの羅列を防ぐ。 */
export interface Question {
  id: string;
  factor: FactorKey;
  text: string;
  reverse: boolean;
  /** 下位ファセット名（例: 好奇心 / 美的感性）。同一 factor 内で異なる facet を突く。 */
  facet: string;
}

/** 設問 id -> 回答値（未回答は undefined）。 */
export type Answers = Record<string, LikertValue | undefined>;

/** 因子ごとのスコア（0-100 に正規化）。 */
export type FactorScores = Record<FactorKey, number>;

/** スコア水準。閾値は scoring.ts で定義。 */
export type Level = 'high' | 'mid' | 'low';

export type Confidence = '高' | '中' | '低';

/** 診断プロファイル（測定結果の中核）。 */
export interface Profile {
  /** 0-100 の素点ベース相対スコア（規範データではない）。 */
  scores: FactorScores;
  /** 各因子の high/mid/low 判定。 */
  levels: Record<FactorKey, Level>;
  answeredCount: number;
  totalQuestions: number;
  /** 0-100 (%) */
  completionRate: number;
  confidence: Confidence;
  confidenceReason: string;
  /** ISO 文字列。テスト時は注入できるよう scoring 側で引数化する。 */
  generatedAt: string;
}

/** 性格タイプ（8〜12種の代表タイプ）。pattern に合致する因子水準で判定する。 */
export interface PersonalityType {
  id: string;
  /** タイプ名（日本語の通称） */
  name: string;
  /** 一言キャッチ */
  catch: string;
  /** 絵文字アイコン */
  icon: string;
  /**
   * 定義パターン。指定した因子が指定水準であるほどスコアが上がる。
   * 未指定の因子は判定に影響しない。
   */
  pattern: Partial<Record<FactorKey, Level>>;
  /** タイプの要約（2〜3文） */
  summary: string;
  strengths: string[];
  cautions: string[];
}

/** タイプ判定の結果。 */
export interface TypeMatch {
  type: PersonalityType;
  /** 一致度 0-100（pattern との合致から算出） */
  fitScore: number;
}

/** 職業マスタ。profile に「その職業に向いた人の Big Five 期待プロファイル」を持つ。 */
export interface Occupation {
  id: string;
  title: string;
  category: string;
  /** 職業ごとの Big Five 期待プロファイル（0-100）。 */
  profile: FactorScores;
  description: string;
  /** 強みになりやすいスキル領域 */
  skillThemes: string[];
  /** 注意点（しんどくなりやすい所） */
  cautions: string[];
  /** 次に取れる検証アクション */
  nextActions: string[];
}

/** マッチング結果（職業 + 適合度 + 根拠）。 */
export interface OccupationMatch extends Occupation {
  /** 適合度 0-99（性格プロファイルとの距離から算出） */
  matchScore: number;
  /** 「なぜこの性格に合うか」の根拠文（動的生成） */
  matchReasons: string[];
}
