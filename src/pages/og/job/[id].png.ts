import type { APIRoute, GetStaticPaths } from 'astro';
import sharp from 'sharp';

import { OCCUPATIONS } from '../../../data/occupations';
import type { Occupation } from '../../../lib/types';

const width = 1200;
const height = 630;
const fontFamily =
  'Hiragino Sans, Hiragino Kaku Gothic ProN, Yu Gothic, Meiryo, system-ui, sans-serif';

export const getStaticPaths = (() =>
  OCCUPATIONS.map((occupation) => ({
    params: { id: occupation.id },
  }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ params }) => {
  const occupation = OCCUPATIONS.find((candidate) => candidate.id === params.id);

  if (!occupation) {
    return new Response(null, { status: 404 });
  }

  const svg = buildSvg(occupation);
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

function buildSvg(occupation: Occupation): string {
  const titleText = truncateText(occupation.title, 22);
  const titleSize = shrinkFontSize(titleText, 74, 44, 6);
  const categoryText = truncateText(occupation.category, 20);
  const categorySize = shrinkFontSize(categoryText, 34, 28, 14);
  const descriptionText = truncateText(occupation.description, 24);
  const descriptionSize = shrinkFontSize(descriptionText, 32, 26, 18);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(occupation.title)} | Big Five 性格診断</title>
  <desc id="desc">${escapeXml(occupation.category)}の職業ガイド</desc>
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
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.40"/>
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
  <text x="144" y="294" fill="#0f172a" font-family="${fontFamily}" font-size="${titleSize}" font-weight="700">${escapeXml(titleText)}</text>
  <text x="144" y="372" fill="#475569" font-family="${fontFamily}" font-size="${descriptionSize}" font-weight="700">${escapeXml(descriptionText)}</text>
  <text x="144" y="502" fill="#64748b" font-family="${fontFamily}" font-size="24" font-weight="700">Big Five 性格診断 / machaniconico.github.io/job-site</text>
  <g transform="translate(768 128)">
    <circle cx="142" cy="138" r="134" fill="#dbeafe"/>
    <circle cx="270" cy="234" r="86" fill="#ede9fe"/>
    <circle cx="76" cy="282" r="66" fill="#ffedd5"/>
    <path d="M100 96h210c20 0 36 16 36 36v176c0 20-16 36-36 36H100c-20 0-36-16-36-36V132c0-20 16-36 36-36Z" fill="#2563eb" opacity="0.88"/>
    <path d="M146 96V76c0-26 21-47 47-47h42c26 0 47 21 47 47v20h-34V76c0-7-6-13-13-13h-42c-7 0-13 6-13 13v20h-34Z" fill="#7c3aed" opacity="0.90"/>
    <path d="M64 190h282v54H64z" fill="#ffffff" opacity="0.28"/>
    <circle cx="205" cy="216" r="24" fill="#f97316"/>
    <rect x="106" y="138" width="198" height="22" rx="11" fill="#ffffff" opacity="0.34"/>
    <text x="205" y="408" text-anchor="middle" fill="#1e293b" font-family="${fontFamily}" font-size="${categorySize}" font-weight="700">${escapeXml(categoryText)}</text>
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

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
