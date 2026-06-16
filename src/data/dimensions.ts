import type { Factor, FactorKey } from '../lib/types';

/**
 * Big Five（5因子）の定義。
 * 内部スコアは常に「素の因子」基準（N が高い = 神経症傾向が強い = 不安定）。
 * 表示のみ N を反転し「情緒安定性」として見せる（inverted: true）。
 * highBlurb / lowBlurb は displayLabel 基準で書く（= 表示でそのまま使える）。
 */
export const FACTORS: Record<FactorKey, Factor> = {
  O: {
    key: 'O',
    label: '開放性',
    englishName: 'Openness',
    displayLabel: '開放性',
    inverted: false,
    highBlurb: '好奇心が強く、新しいアイデアや美しいもの、抽象的な概念に惹かれる。変化や未知を楽しめる。',
    lowBlurb: '現実的で地に足がついていて、慣れた確実なやり方を好む。奇抜さより実用を取る。',
    description: '新しい経験・アイデア・美への開かれ方。想像力、知的好奇心、美的感性の強さ。',
  },
  C: {
    key: 'C',
    label: '誠実性',
    englishName: 'Conscientiousness',
    displayLabel: '誠実性',
    inverted: false,
    highBlurb: '計画的で責任感が強く、コツコツ最後までやり遂げる。秩序・締切・準備を大切にする。',
    lowBlurb: '柔軟で自由、その場の状況に合わせて動く。型にはめるより即興と臨機応変を好む。',
    description: '計画性・自己統制・勤勉さ。目標に向けて段取りし、やり抜く力。',
  },
  E: {
    key: 'E',
    label: '外向性',
    englishName: 'Extraversion',
    displayLabel: '外向性',
    inverted: false,
    highBlurb: '社交的でエネルギッシュ。人と関わることで活力を得て、話す・前に出るのが得意。',
    lowBlurb: '物静かで落ち着いた環境を好む。一人や少人数で深く取り組む方が力を発揮する。',
    description: '社交性・活動性・刺激の求め方。エネルギーが外に向くか内に向くか。',
  },
  A: {
    key: 'A',
    label: '協調性',
    englishName: 'Agreeableness',
    displayLabel: '協調性',
    inverted: false,
    highBlurb: '思いやりがあり協力的。人を信頼し、衝突よりも調和とチームの和を選ぶ。',
    lowBlurb: '率直で独立的。情よりも論理、馴れ合いよりも是々非々で物事を判断する。',
    description: '思いやり・信頼・協力性。他者との関わりで競争より協調をどれだけ取るか。',
  },
  N: {
    key: 'N',
    label: '神経症傾向',
    englishName: 'Neuroticism',
    displayLabel: '情緒安定性',
    inverted: true,
    highBlurb: '感情が安定していて、プレッシャーやトラブルの中でも落ち着きを保ちやすい。',
    lowBlurb: '感受性が高く気分の波を感じやすい。ストレスや不安の影響を受けやすい一方で、危険察知や共感に敏感。',
    description: 'ストレスや否定的感情への反応しやすさ。本サイトでは反転し「情緒安定性」として表示する。',
  },
};

/** 表示順（結果画面でのバー並び順）。 */
export const FACTOR_DISPLAY_ORDER: readonly FactorKey[] = ['O', 'C', 'E', 'A', 'N'] as const;
