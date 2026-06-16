// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages のプロジェクトページとして配信する。
//   公開URL: https://machaniconico.github.io/job-site/
// site + base を必ず一致させること（アセット・リンクの絶対パス解決に使う）。
// base はリポジトリ名と一致させること。
export default defineConfig({
  site: 'https://machaniconico.github.io',
  base: '/job-site',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: {
    // 末尾スラッシュ無しでも index.html を引けるようにする
    format: 'directory',
  },
});
