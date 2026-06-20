/**
 * OG（Open Graph）画像の寸法を一元管理する定数。
 *
 * 画像を生成するエンドポイント（`/og/[id].png`, `/og/job/[id].png`）と、
 * その寸法を宣言する `<meta property="og:image:width|height">`（Base.astro）が
 * 同じ値を参照することで、片方だけ変えてメタが嘘になるドリフトを防ぐ。
 *
 * 既定の静的画像 `public/og.png` も同じ 1200×630 で用意している。
 */

/** OG 画像の横幅（px）。 */
export const OG_WIDTH = 1200;

/** OG 画像の高さ（px）。og:image 推奨の 1.91:1 に合わせた 1200×630。 */
export const OG_HEIGHT = 630;
