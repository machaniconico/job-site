import { FACTORS, FACTOR_DISPLAY_ORDER } from '../data/dimensions';
import { displayScore } from '../lib/scoring';
import type { OccupationMatch, PersonalityType, Profile } from '../lib/types';

const SHARE_CARD_SITE_URL = 'https://machaniconico.github.io/job-site/';
const SHARE_CARD_SIZE = 1080;
const SHARE_CARD_SCALE = 2;

const PALETTE = {
  accent: '#2563eb',
  accentDark: '#1d4ed8',
  accentDeep: '#1e3a8a',
  accentLight: '#60a5fa',
  accentViolet: '#7c3aed',
  accentVioletSoft: '#ede9fe',
  warm: '#f97316',
  warmDeep: '#c2410c',
  text: '#0f172a',
  textSoft: '#475569',
  textMute: '#64748b',
  surface: '#ffffff',
  border: 'rgba(15, 23, 42, 0.09)',
  borderStrong: 'rgba(37, 99, 235, 0.18)',
  primarySoft: 'rgba(37, 99, 235, 0.12)',
  primaryWash: 'rgba(37, 99, 235, 0.06)',
  violetWash: 'rgba(124, 58, 237, 0.07)',
  warmSoft: 'rgba(249, 115, 22, 0.12)',
  warmWash: 'rgba(249, 115, 22, 0.07)',
  shadow: 'rgba(15, 23, 42, 0.14)',
};

const FONT_FAMILY =
  '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, system-ui, sans-serif';

interface ShareCardFactor {
  label: string;
  englishName: string;
  score: number;
}

interface ShareCardJob {
  title: string;
  matchScore: number;
}

interface ShareCardModel {
  title: string;
  typeName: string;
  typeIcon: string;
  catch: string;
  factors: ShareCardFactor[];
  jobs: ShareCardJob[];
  siteUrl: string;
  hashTag: string;
}

function buildShareCardModel(
  profile: Profile,
  type: Pick<PersonalityType, 'name' | 'icon' | 'catch'>,
  jobs: readonly Pick<OccupationMatch, 'title' | 'matchScore'>[],
): ShareCardModel {
  return {
    title: 'やさしい Big Five 性格診断',
    typeName: type.name,
    typeIcon: type.icon,
    catch: type.catch,
    factors: FACTOR_DISPLAY_ORDER.map((key) => ({
      label: FACTORS[key].displayLabel,
      englishName: FACTORS[key].englishName,
      score: Math.round(displayScore(profile.scores[key], FACTORS[key].inverted)),
    })),
    jobs: jobs.slice(0, 3).map((job) => ({
      title: job.title,
      matchScore: Math.round(job.matchScore),
    })),
    siteUrl: SHARE_CARD_SITE_URL,
    hashTag: '#性格診断',
  };
}

function drawShareCard(ctx: CanvasRenderingContext2D, model: ShareCardModel): void {
  const width = SHARE_CARD_SIZE;
  const height = SHARE_CARD_SIZE;
  const pad = 76;

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height);

  ctx.fillStyle = PALETTE.surface;
  roundedRect(ctx, 42, 42, width - 84, height - 84, 42);
  ctx.shadowColor = PALETTE.shadow;
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 18;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
  ctx.lineWidth = 2;
  ctx.stroke();

  drawCardWash(ctx, width, height);

  drawHeader(ctx, model, pad);
  drawTypeBlock(ctx, model, pad);
  drawFactors(ctx, model, pad, 408);
  drawJobs(ctx, model, pad, 748);
  drawFooter(ctx, model, pad, height - 78);

  ctx.restore();
}

export async function createShareCardBlob(
  profile: Profile,
  type: Pick<PersonalityType, 'name' | 'icon' | 'catch'>,
  jobs: readonly Pick<OccupationMatch, 'title' | 'matchScore'>[],
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = SHARE_CARD_SIZE * SHARE_CARD_SCALE;
  canvas.height = SHARE_CARD_SIZE * SHARE_CARD_SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  ctx.scale(SHARE_CARD_SCALE, SHARE_CARD_SCALE);
  drawShareCard(ctx, buildShareCardModel(profile, type, jobs));

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('PNG generation failed.'));
    }, 'image/png');
  });
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#dbeafe');
  bg.addColorStop(0.42, '#f5f3ff');
  bg.addColorStop(0.72, '#ffffff');
  bg.addColorStop(1, '#ffedd5');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  drawMeshGlow(ctx, 132, 106, 320, 'rgba(37, 99, 235, 0.22)', 'rgba(37, 99, 235, 0)');
  drawMeshGlow(ctx, 922, 156, 310, 'rgba(124, 58, 237, 0.18)', 'rgba(124, 58, 237, 0)');
  drawMeshGlow(ctx, 860, 940, 360, 'rgba(249, 115, 22, 0.18)', 'rgba(249, 115, 22, 0)');
  drawMeshGlow(ctx, 250, 910, 250, 'rgba(96, 165, 250, 0.13)', 'rgba(96, 165, 250, 0)');

  ctx.save();
  ctx.strokeStyle = 'rgba(30, 58, 138, 0.055)';
  ctx.lineWidth = 1;
  for (let x = -120; x < width + 120; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 220, height);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCardWash(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const wash = ctx.createLinearGradient(42, 42, width - 42, height - 42);
  wash.addColorStop(0, 'rgba(239, 246, 255, 0.68)');
  wash.addColorStop(0.44, 'rgba(255, 255, 255, 0)');
  wash.addColorStop(1, 'rgba(255, 247, 237, 0.72)');
  roundedRect(ctx, 42, 42, width - 84, height - 84, 42);
  ctx.fillStyle = wash;
  ctx.fill();
}

function drawHeader(ctx: CanvasRenderingContext2D, model: ShareCardModel, pad: number): void {
  drawPill(ctx, pad, 76, 382, 48, PALETTE.primarySoft);
  setFont(ctx, 23, 800);
  ctx.fillStyle = PALETTE.accentDeep;
  ctx.fillText(ellipsize(ctx, model.title, 316), pad + 24, 107);

  ctx.textAlign = 'right';
  setFont(ctx, 22, 800);
  ctx.fillStyle = PALETTE.textMute;
  ctx.fillText('Big Five Result Card', SHARE_CARD_SIZE - pad, 107);
  ctx.textAlign = 'left';
}

function drawTypeBlock(ctx: CanvasRenderingContext2D, model: ShareCardModel, pad: number): void {
  const top = 152;
  const iconSize = 162;
  const iconGradient = ctx.createLinearGradient(pad, top, pad + iconSize, top + iconSize);
  iconGradient.addColorStop(0, PALETTE.accentLight);
  iconGradient.addColorStop(0.48, PALETTE.accent);
  iconGradient.addColorStop(1, PALETTE.accentViolet);
  roundedRect(ctx, pad, top, iconSize, iconSize, 38);
  ctx.fillStyle = iconGradient;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.68)';
  ctx.lineWidth = 2;
  ctx.stroke();

  setFont(ctx, 82, 800);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.surface;
  ctx.fillText(model.typeIcon, pad + iconSize / 2, top + iconSize / 2 + 4);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  const textX = pad + iconSize + 34;
  drawPill(ctx, textX, top + 4, 168, 40, PALETTE.warmSoft);
  setFont(ctx, 21, 800);
  ctx.fillStyle = PALETTE.warmDeep;
  ctx.fillText('あなたのタイプ', textX + 20, top + 31);

  setFont(ctx, 70, 800);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(ellipsize(ctx, model.typeName, 672), textX, top + 104);

  roundedRect(ctx, textX, top + 126, 676, 72, 24);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.fill();
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  setFont(ctx, 30, 800);
  ctx.fillStyle = PALETTE.textSoft;
  drawSingleLine(ctx, model.catch, textX + 24, top + 172, 626);
}

function drawFactors(ctx: CanvasRenderingContext2D, model: ShareCardModel, pad: number, top: number): void {
  drawSectionPanel(ctx, pad - 14, top - 26, SHARE_CARD_SIZE - pad * 2 + 28, 306);

  setFont(ctx, 31, 800);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('5因子スコア', pad, top + 16);

  const labelX = pad;
  const barX = pad + 244;
  const scoreChipX = SHARE_CARD_SIZE - pad - 120;
  const barWidth = scoreChipX - barX - 18;
  const valueX = SHARE_CARD_SIZE - pad - 4;
  const rowTop = top + 42;

  setFont(ctx, 17, 800);
  ctx.fillStyle = PALETTE.textMute;
  ctx.textAlign = 'right';
  ctx.fillText('0', barX + 10, top + 16);
  ctx.fillText('50', barX + barWidth / 2 + 12, top + 16);
  ctx.fillText('100', barX + barWidth, top + 16);
  ctx.textAlign = 'left';

  model.factors.forEach((factor, index) => {
    const y = rowTop + index * 48;
    setFont(ctx, 22, 800);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(ellipsize(ctx, factor.label, 196), labelX, y + 20);

    setFont(ctx, 14, 700);
    ctx.fillStyle = PALETTE.textMute;
    ctx.fillText(ellipsize(ctx, factor.englishName, 196), labelX, y + 39);

    roundedRect(ctx, barX, y + 10, barWidth, 18, 9);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();

    const fillWidth = Math.max(14, Math.min(barWidth, (factor.score / 100) * barWidth));
    const gradient = ctx.createLinearGradient(barX, y, barX + barWidth, y);
    gradient.addColorStop(0, PALETTE.accent);
    gradient.addColorStop(0.62, PALETTE.accentViolet);
    gradient.addColorStop(1, PALETTE.warm);
    roundedRect(ctx, barX, y + 10, fillWidth, 18, 9);
    ctx.fillStyle = gradient;
    ctx.fill();

    drawScoreChip(ctx, scoreChipX, y + 1, 74, 36, `${factor.score}`);
    setFont(ctx, 14, 800);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.textMute;
    // スコアチップ右・パネル内側に '/100' を収める（valueX=1000、パネル右端1018の内側）。
    ctx.fillText('/100', valueX, y + 25);
    ctx.textAlign = 'left';
  });
}

function drawJobs(ctx: CanvasRenderingContext2D, model: ShareCardModel, pad: number, top: number): void {
  drawSectionPanel(ctx, pad - 14, top - 22, SHARE_CARD_SIZE - pad * 2 + 28, 212);

  setFont(ctx, 31, 800);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('向いていそうな仕事 TOP3', pad, top + 16);

  const cardWidth = (SHARE_CARD_SIZE - pad * 2 - 28 * 2) / 3;
  model.jobs.forEach((job, index) => {
    const x = pad + index * (cardWidth + 28);
    const y = top + 46;
    const cardGradient = ctx.createLinearGradient(x, y, x + cardWidth, y + 138);
    cardGradient.addColorStop(0, index === 0 ? PALETTE.primaryWash : index === 1 ? PALETTE.warmWash : PALETTE.violetWash);
    cardGradient.addColorStop(1, 'rgba(255, 255, 255, 0.84)');
    roundedRect(ctx, x, y, cardWidth, 138, 26);
    ctx.fillStyle = cardGradient;
    ctx.fill();
    ctx.strokeStyle = PALETTE.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const rankFill = index === 0 ? PALETTE.accent : index === 1 ? PALETTE.warm : PALETTE.accentViolet;
    drawPill(ctx, x + 18, y + 18, 56, 34, rankFill);
    setFont(ctx, 18, 900);
    ctx.fillStyle = PALETTE.surface;
    ctx.fillText(`#${index + 1}`, x + 31, y + 41);

    setFont(ctx, 25, 800);
    ctx.fillStyle = PALETTE.text;
    drawSingleLine(ctx, job.title, x + 18, y + 86, cardWidth - 36);

    drawMatchChip(ctx, x + 18, y + 102, cardWidth - 36, job.matchScore, index);
  });
}

function drawFooter(ctx: CanvasRenderingContext2D, model: ShareCardModel, pad: number, y: number): void {
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, y - 40);
  ctx.lineTo(SHARE_CARD_SIZE - pad, y - 40);
  ctx.stroke();

  setFont(ctx, 23, 800);
  ctx.fillStyle = PALETTE.textMute;
  ctx.fillText(ellipsize(ctx, model.siteUrl, 676), pad, y);

  ctx.textAlign = 'right';
  drawPill(ctx, SHARE_CARD_SIZE - pad - 142, y - 31, 142, 42, PALETTE.accentVioletSoft);
  setFont(ctx, 22, 900);
  ctx.fillStyle = PALETTE.accentDark;
  ctx.fillText(model.hashTag, SHARE_CARD_SIZE - pad - 18, y - 3);
  ctx.textAlign = 'left';
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight: number): void {
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
}

function drawSingleLine(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number): void {
  ctx.fillText(ellipsize(ctx, text, maxWidth), x, y);
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;

  const ellipsis = '…';
  let left = 0;
  let right = text.length;
  while (left < right) {
    const mid = Math.ceil((left + right) / 2);
    const candidate = `${text.slice(0, mid)}${ellipsis}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      left = mid;
    } else {
      right = mid - 1;
    }
  }
  return `${text.slice(0, left)}${ellipsis}`;
}

function drawPill(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill: string): void {
  roundedRect(ctx, x, y, width, height, height / 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawSectionPanel(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  const panelGradient = ctx.createLinearGradient(x, y, x + width, y + height);
  panelGradient.addColorStop(0, 'rgba(255, 255, 255, 0.82)');
  panelGradient.addColorStop(1, 'rgba(248, 250, 252, 0.72)');
  roundedRect(ctx, x, y, width, height, 30);
  ctx.fillStyle = panelGradient;
  ctx.fill();
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawScoreChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  score: string,
): void {
  roundedRect(ctx, x, y, width, height, 18);
  ctx.fillStyle = PALETTE.surface;
  ctx.fill();
  ctx.strokeStyle = PALETTE.borderStrong;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  setFont(ctx, 22, 900);
  ctx.fillStyle = PALETTE.accentDeep;
  ctx.textAlign = 'center';
  ctx.fillText(score, x + width / 2, y + 25);
  ctx.textAlign = 'left';
}

function drawMatchChip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  matchScore: number,
  index: number,
): void {
  const fill = index === 0 ? PALETTE.primarySoft : index === 1 ? PALETTE.warmSoft : PALETTE.accentVioletSoft;
  roundedRect(ctx, x, y, width, 34, 17);
  ctx.fillStyle = fill;
  ctx.fill();

  setFont(ctx, 18, 900);
  ctx.fillStyle = index === 1 ? PALETTE.warmDeep : PALETTE.accentDeep;
  ctx.fillText(`マッチ ${matchScore}%`, x + 16, y + 23);
}

function drawMeshGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  inner: string,
  outer: string,
): void {
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
  glow.addColorStop(0, inner);
  glow.addColorStop(1, outer);
  ctx.fillStyle = glow;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
