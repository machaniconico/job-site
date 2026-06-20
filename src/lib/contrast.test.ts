import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  parseHex,
  relativeLuminance,
  contrastRatio,
  AA_NORMAL,
} from './contrast';

describe('contrast helpers', () => {
  it('parseHex handles #rrggbb and shorthand #rgb', () => {
    expect(parseHex('#ffffff')).toEqual([255, 255, 255]);
    expect(parseHex('#000000')).toEqual([0, 0, 0]);
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#0f0')).toEqual([0, 255, 0]);
  });

  it('parseHex rejects malformed input', () => {
    expect(() => parseHex('#xyz')).toThrow();
    expect(() => parseHex('0f172a')).not.toThrow(); // leading # optional
    expect(() => parseHex('#12')).toThrow();
  });

  it('relativeLuminance is 0 for black and 1 for white', () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
  });

  it('contrastRatio matches known WCAG values and is order-independent', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 2);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 2);
    expect(contrastRatio('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    // light-gray on white: a classic low-contrast pair (~1.5)
    expect(contrastRatio('#cbd5e1', '#ffffff')).toBeCloseTo(1.48, 1);
  });
});

/**
 * Iter34 regression lock for the Iter33 fix: the SELECTED Likert circle fills
 * with `--pole-*-color` and paints its digit in `--pole-*-on`. Both pairs must
 * clear AA (>=4.5:1) in BOTH themes. tokens.css is the source of truth, so we
 * read it directly. Rather than rely on document order, we slice the file into
 * its theme scopes by selector and extract within each — so reordering the
 * scopes cannot silently swap light for dark.
 */
describe('Likert selected-digit contrast (reads tokens.css)', () => {
  const css = readFileSync(new URL('../styles/tokens.css', import.meta.url), 'utf8');
  const POLES = ['neg2', 'neg1', 'mid', 'pos1', 'pos2'] as const;

  // Light = everything before the first dark scope; dark = the explicit
  // `:root[data-theme="dark"]` block onward. Both markers must exist.
  const darkSelectorAt = css.indexOf(':root[data-theme="dark"]');
  const mediaDarkAt = css.indexOf('@media (prefers-color-scheme: dark)');
  const lightSlice = css.slice(0, mediaDarkAt);
  const darkSlice = css.slice(darkSelectorAt);

  /** Hex value assigned to `--pole-<pole>-<field>` within a CSS slice (or undefined). */
  function valueIn(slice: string, pole: string, field: 'color' | 'on'): string | undefined {
    const m = slice.match(new RegExp(`--pole-${pole}-${field}\\s*:\\s*(#[0-9a-fA-F]{3,8})`));
    return m?.[1];
  }

  /** All hex values for `--pole-<pole>-<field>` across the whole file (scope count). */
  function allValues(pole: string, field: 'color' | 'on'): string[] {
    const re = new RegExp(`--pole-${pole}-${field}\\s*:\\s*(#[0-9a-fA-F]{3,8})`, 'g');
    return [...css.matchAll(re)].map((m) => m[1]);
  }

  it('tokens.css exposes both dark scope markers', () => {
    expect(mediaDarkAt).toBeGreaterThanOrEqual(0);
    expect(darkSelectorAt).toBeGreaterThan(mediaDarkAt);
  });

  it('every pole defines color + on in all 3 theme scopes', () => {
    for (const pole of POLES) {
      expect(allValues(pole, 'color'), `${pole}-color scopes`).toHaveLength(3);
      expect(allValues(pole, 'on'), `${pole}-on scopes`).toHaveLength(3);
    }
  });

  for (const pole of POLES) {
    it(`${pole}: selected digit meets AA in light and dark`, () => {
      const lc = valueIn(lightSlice, pole, 'color');
      const lo = valueIn(lightSlice, pole, 'on');
      const dc = valueIn(darkSlice, pole, 'color');
      const don = valueIn(darkSlice, pole, 'on');
      expect([lc, lo, dc, don], `${pole} tokens resolved`).not.toContain(undefined);
      const light = contrastRatio(lc!, lo!);
      const dark = contrastRatio(dc!, don!);
      expect(light, `${pole} light fill ${lc} on-text ${lo}`).toBeGreaterThanOrEqual(AA_NORMAL);
      expect(dark, `${pole} dark fill ${dc} on-text ${don}`).toBeGreaterThanOrEqual(AA_NORMAL);
    });
  }
});
