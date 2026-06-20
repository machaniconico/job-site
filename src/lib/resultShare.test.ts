import { describe, expect, it } from 'vitest';
import { encodeAnswers, decodeAnswers, SHARE_VERSION } from './resultShare';
import type { Answers } from './types';

const ids = ['q1', 'q2', 'q3', 'q4'];

describe('encodeAnswers / decodeAnswers', () => {
  it('版1文字 + 設問数ぶんの桁を出力する', () => {
    const code = encodeAnswers({ q1: 5, q2: 3, q3: 1, q4: 4 }, ids);
    expect(code).toBe(`${SHARE_VERSION}5314`);
    expect(code.length).toBe(1 + ids.length);
  });

  it('未回答は 0 桁になり、デコードで欠落する', () => {
    const code = encodeAnswers({ q1: 5, q3: 2 }, ids);
    expect(code).toBe(`${SHARE_VERSION}5020`);
    const decoded = decodeAnswers(code, ids);
    expect(decoded).toEqual({ q1: 5, q3: 2 });
    expect(decoded && 'q2' in decoded).toBe(false);
  });

  it('エンコード→デコードで往復一致する', () => {
    const answers: Answers = { q1: 1, q2: 2, q3: 3, q4: 4 };
    expect(decodeAnswers(encodeAnswers(answers, ids), ids)).toEqual(answers);
  });

  it('長さ違い・版違い・不正文字・非文字列は null', () => {
    expect(decodeAnswers('a531', ids)).toBeNull(); // 桁不足
    expect(decodeAnswers('b5314', ids)).toBeNull(); // 版違い
    expect(decodeAnswers('a5319', ids)).toBeNull(); // 9 は範囲外
    expect(decodeAnswers('a53x4', ids)).toBeNull(); // 不正文字
    expect(decodeAnswers(null, ids)).toBeNull();
    expect(decodeAnswers(undefined, ids)).toBeNull();
  });

  it('全 0（全未回答）は空レコードとして有効デコード', () => {
    expect(decodeAnswers(`${SHARE_VERSION}0000`, ids)).toEqual({});
  });
});
