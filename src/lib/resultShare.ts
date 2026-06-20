/**
 * 診断結果を共有用URLに載せるための、回答のエンコード/デコード。
 *
 * 回答（各設問 1〜5）を設問順に1桁ずつ並べた固定長コードに変換する。
 * 未回答は `0`。先頭1文字はフォーマット版（将来の設問変更を検知するため）。
 * 例: 版 `a` + 50桁 → `"a531...2"`。URL のハッシュ（`#r=...`）にそのまま載せられる。
 *
 * コードは設問の「並び順」に依存する（位置 i ↔ questionIds[i]）。設問の順序が
 * 変わると過去のコードは別の設問にマップされうるため、順序を変えるときは版を上げること。
 */
import type { Answers, LikertValue } from './types';

/** 現行フォーマット版。設問の順序・数を変えたら更新する。 */
export const SHARE_VERSION = 'a';

/**
 * 回答を共有用コードにエンコードする。
 *
 * @param answers 設問id→回答(1〜5)のレコード
 * @param questionIds 設問idの配列（出題順）
 * @returns 版1文字 + `questionIds.length` 桁（各 0〜5）のコード
 */
export function encodeAnswers(answers: Answers, questionIds: string[]): string {
  const digits = questionIds
    .map((id) => {
      const v = answers[id];
      return v != null && v >= 1 && v <= 5 ? String(v) : '0';
    })
    .join('');
  return SHARE_VERSION + digits;
}

/**
 * 共有用コードを回答へデコードする。フォーマット不正なら null。
 *
 * @param code エンコード済みコード
 * @param questionIds 設問idの配列（出題順。エンコード時と同一であること）
 * @returns 回答レコード（未回答桁=0 は含めない）。版違い/長さ違い/不正文字なら null
 */
export function decodeAnswers(code: unknown, questionIds: string[]): Answers | null {
  if (typeof code !== 'string') return null;
  if (code.length !== 1 + questionIds.length) return null;
  if (code[0] !== SHARE_VERSION) return null;
  const body = code.slice(1);
  if (!/^[0-5]+$/.test(body)) return null;

  const answers: Answers = {};
  for (let i = 0; i < questionIds.length; i += 1) {
    const digit = body.charCodeAt(i) - 48; // '0' → 0
    if (digit >= 1 && digit <= 5) {
      answers[questionIds[i]] = digit as LikertValue;
    }
  }
  return answers;
}
