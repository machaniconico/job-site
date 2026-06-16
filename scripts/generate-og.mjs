import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const width = 1200;
const height = 630;
const outFile = resolve('public/og.png');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">性格診断</title>
  <desc id="desc">Big Five でわかる、あなたらしさと適職</desc>
  <defs>
    <linearGradient id="hero" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#7c3aed"/>
    </linearGradient>
    <radialGradient id="warm" cx="84%" cy="18%" r="58%">
      <stop offset="0%" stop-color="#f97316" stop-opacity="0.36"/>
      <stop offset="100%" stop-color="#f97316" stop-opacity="0"/>
    </radialGradient>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#0f172a" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#hero)"/>
  <rect width="${width}" height="${height}" fill="url(#warm)"/>
  <circle cx="112" cy="88" r="172" fill="#ffffff" opacity="0.13"/>
  <circle cx="1088" cy="556" r="220" fill="#ffffff" opacity="0.10"/>
  <g filter="url(#softShadow)">
    <rect x="96" y="96" width="1008" height="438" rx="42" fill="#ffffff" opacity="0.94"/>
  </g>
  <text x="152" y="210" fill="#2563eb" font-family="Atkinson Hyperlegible, Hiragino Sans, Yu Gothic, Meiryo, system-ui, sans-serif" font-size="34" font-weight="700" letter-spacing="5">BIG FIVE QUIZ</text>
  <text x="152" y="326" fill="#0f172a" font-family="Atkinson Hyperlegible, Hiragino Sans, Yu Gothic, Meiryo, system-ui, sans-serif" font-size="92" font-weight="700">性格診断</text>
  <text x="152" y="408" fill="#475569" font-family="Atkinson Hyperlegible, Hiragino Sans, Yu Gothic, Meiryo, system-ui, sans-serif" font-size="34" font-weight="700">Big Five でわかる、あなたらしさと適職</text>
  <rect x="152" y="454" width="312" height="12" rx="6" fill="url(#hero)"/>
  <g transform="translate(842 166)">
    <circle cx="84" cy="84" r="84" fill="#dbeafe"/>
    <circle cx="188" cy="172" r="70" fill="#ede9fe"/>
    <circle cx="88" cy="258" r="52" fill="#ffedd5"/>
    <path d="M120 90c44 20 72 58 84 114c-62-6-108-28-138-68c-16-22-20-42-12-60c18-4 40 0 66 14Z" fill="#2563eb" opacity="0.92"/>
    <path d="M136 218c36-30 78-42 126-36c-14 52-46 88-96 108c-24 10-46 10-66 0c0-26 12-50 36-72Z" fill="#7c3aed" opacity="0.88"/>
  </g>
</svg>`;

await mkdir(dirname(outFile), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(outFile);

console.log(`Generated ${outFile}`);
