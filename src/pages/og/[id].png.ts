import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';

import { BALANCED_TYPE, PERSONALITY_TYPES } from '../../data/personalityTypes';
import type { PersonalityType } from '../../lib/types';

const width = 1200;
const height = 630;
const allTypes = [...PERSONALITY_TYPES, BALANCED_TYPE];
const fontFamily =
  'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Meiryo, system-ui, sans-serif';

export const getStaticPaths = (() =>
  allTypes.map((type) => ({
    params: { id: type.id },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const type = allTypes.find((candidate) => candidate.id === params.id);

  if (!type) {
    return new Response(null, { status: 404 });
  }

  const svg = buildSvg(type);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const body = new Uint8Array(png.byteLength);
  body.set(png);

  return new Response(body.buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

function buildSvg(type: PersonalityType): string {
  const nameSize = shrinkFontSize(type.name, 92, 58, 8);
  const catchText = truncateText(type.catch, 28);
  const catchSize = shrinkFontSize(catchText, 38, 30, 24);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(type.name)} | Big Five 性格診断</title>
  <desc id="desc">${escapeXml(type.catch)}</desc>
  <defs>
    <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <linearGradient id="accentLine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="68%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
    <radialGradient id="warm" cx="84%" cy="18%" r="58%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.38"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blueGlow" cx="12%" cy="10%" r="48%">
      <stop offset="0%" stop-color="#dbeafe" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#dbeafe" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0f172a" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#hero)"/>
  <rect width="${width}" height="${height}" fill="url(#warm)"/>
  <rect width="${width}" height="${height}" fill="url(#blueGlow)"/>
  <circle cx="108" cy="92" r="174" fill="#ffffff" opacity="0.13"/>
  <circle cx="1102" cy="542" r="226" fill="#ffffff" opacity="0.11"/>
  <circle cx="1012" cy="126" r="58" fill="#f97316" opacity="0.18"/>
  <circle cx="188" cy="552" r="74" fill="#ffffff" opacity="0.10"/>
  <g filter="url(#softShadow)">
    <rect x="88" y="82" width="1024" height="466" rx="42" fill="#ffffff" opacity="0.95"/>
  </g>
  <rect x="144" y="454" width="354" height="12" rx="6" fill="url(#accentLine)"/>
  <text x="144" y="184" fill="#2563eb" font-family="${fontFamily}" font-size="32" font-weight="700" letter-spacing="5">BIG FIVE QUIZ</text>
  <text x="144" y="306" fill="#0f172a" font-family="${fontFamily}" font-size="${nameSize}" font-weight="700">${escapeXml(type.name)}</text>
  <text x="144" y="392" fill="#475569" font-family="${fontFamily}" font-size="${catchSize}" font-weight="700">${escapeXml(catchText)}</text>
  <text x="144" y="502" fill="#64748b" font-family="${fontFamily}" font-size="24" font-weight="700">Big Five 性格診断 / machaniconico.github.io/job-site</text>
  <g transform="translate(798 142)">
    <circle cx="126" cy="126" r="126" fill="#dbeafe"/>
    <circle cx="244" cy="224" r="82" fill="#ede9fe"/>
    <circle cx="78" cy="268" r="62" fill="#ffedd5"/>
    <path d="M138 72c62 28 104 82 122 162c-88-8-154-40-196-96c-22-30-28-58-16-84c26-6 56 0 90 18Z" fill="#2563eb" opacity="0.88"/>
    <path d="M160 236c52-42 112-60 180-50c-20 74-66 126-138 154c-34 14-66 14-94 0c0-38 18-72 52-104Z" fill="#7c3aed" opacity="0.84"/>
    <circle cx="164" cy="164" r="96" fill="#ffffff" opacity="0.90"/>
    <text x="164" y="206" text-anchor="middle" font-family="${fontFamily}" font-size="116" font-weight="800" fill="#2563eb">${escapeXml(monogram(type.name))}</text>
  </g>
</svg>`;
}

function shrinkFontSize(text: string, max: number, min: number, fullSizeChars: number): number {
  const length = Array.from(text).length;

  if (length <= fullSizeChars) {
    return max;
  }

  return Math.max(min, max - (length - fullSizeChars) * 4);
}

function truncateText(text: string, maxLength: number): string {
  const chars = Array.from(text);

  if (chars.length <= maxLength) {
    return text;
  }

  return `${chars.slice(0, maxLength - 1).join('')}…`;
}

/**
 * OG カードの円内に置く一文字モノグラム。タイプ名の先頭文字を使う。
 * 絵文字アイコン（type.icon）は OG をラスタライズする sharp/librsvg に
 * 絵文字フォントが無く豆腐（コードポイント）化するため、確実に描画できる
 * 日本語フォントの頭文字で代替する（画面上の絵文字表示はブラウザ任せで不変）。
 */
function monogram(name: string): string {
  return Array.from(name)[0] ?? '・';
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
