/**
 * WCAG 2.x relative-luminance & contrast-ratio helpers (pure, dependency-free).
 *
 * Used by the accessibility regression test to lock the Likert "selected"
 * digit colors (Iter33) at AA (>=4.5:1) so a future pole-palette tweak that
 * silently drops below the threshold fails CI instead of shipping.
 *
 * Reference: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

export type RGB = readonly [number, number, number];

/** Parse a `#rgb` or `#rrggbb` hex string into 0-255 RGB. Throws on garbage. */
export function parseHex(hex: string): RGB {
  const h = hex.trim().replace(/^#/, '');
  const full = h.length === 3 ? h.replace(/(.)/g, '$1$1') : h;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) {
    throw new Error(`invalid hex color: ${hex}`);
  }
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Linearize one 0-255 sRGB channel to its 0-1 light value. */
function linearize(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance (0 = black, 1 = white) of an RGB triple. */
export function relativeLuminance(rgb: RGB): number {
  const [r, g, b] = rgb;
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * WCAG contrast ratio between two opaque colors, in [1, 21].
 * Accepts hex strings or RGB triples; order does not matter.
 */
export function contrastRatio(a: string | RGB, b: string | RGB): number {
  const la = relativeLuminance(typeof a === 'string' ? parseHex(a) : a);
  const lb = relativeLuminance(typeof b === 'string' ? parseHex(b) : b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/** AA threshold for normal-size text (the Likert digit is small). */
export const AA_NORMAL = 4.5;
/** AA threshold for large text / graphical objects. */
export const AA_LARGE = 3;
