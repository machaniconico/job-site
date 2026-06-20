/**
 * サイト内リンクを組み立てるための共通 URL ヘルパー。
 *
 * 各ページ・レイアウトで重複していた `withBase` をここに一本化する。
 * `import.meta.env.BASE_URL`（astro.config の base）を前置し、末尾/先頭スラッシュを
 * 正規化して二重スラッシュを防ぐ。挙動は従来の各ページ内定義と同一。
 */
const base = import.meta.env.BASE_URL;

/**
 * BASE_URL を前置したサイト内の絶対パスを返す。
 *
 * @param path ベースからの相対パス（先頭スラッシュは任意）。例: `'types/'`, `'/about/'`, `''`
 * @returns 例: base が `/job-site` のとき `withBase('types/')` → `/job-site/types/`
 */
export function withBase(path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
