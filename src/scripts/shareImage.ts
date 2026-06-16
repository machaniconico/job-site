import { FACTORS, FACTOR_DISPLAY_ORDER } from '../data/dimensions';
import { displayScore } from '../lib/scoring';
import type { OccupationMatch, PersonalityType, Profile } from '../lib/types';

const SHARE_CARD_SITE_URL = 'https://machaniconico.github.io/job-site/';
const SHARE_CARD_SIZE = 1080;
const SHARE_CARD_SCALE = 2;

const PALETTE = {
  accent: '#2563eb',
  accentDark: '#1d4ed8',
  accentViolet: '#7c3aed',
  warm: '#f97316',
  text: '#0f172a',
  textSoft: '#475569',
  textMute: '#64748b',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  border: 'rgba(15, 23, 42, 0.10)',
  primarySoft: 'rgba(37, 99, 235, 0.12)',
  warmSoft: 'rgba(249, 115, 22, 0.12)',
  shadow: 'rgba(15, 23, 42, 0.12)',
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
  const pad = 72;

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height);

  ctx.fillStyle = PALETTE.surface;
  roundedRect(ctx, 44, 44, width - 88, height - 88, 40);
  ctx.shadowColor = PALETTE.shadow;
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 16;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  drawHeader(ctx, model, pad);
  drawTypeBlock(ctx, model, pad);
  drawFactors(ctx, model, pad, 430);
  drawJobs(ctx, model, pad, 780);
  drawFooter(ctx, model, pad, height - 86);

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
  bg.addColorStop(0, '#eff6ff');
  bg.addColorStop(0.56, '#ffffff');
  bg.addColorStop(1, '#fff7ed');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  drawCircle(ctx, 140, 116, 220, 'rgba(37, 99, 235, 0.13)');
  drawCircle(ctx, 946, 160, 230, 'rgba(249, 115, 22, 0.11)');
  drawCircle(ctx, 870, 950, 260, 'rgba(124, 58, 237, 0.10)');
}

function drawHeader(ctx: CanvasRenderingContext2D, model: ShareCardModel, pad: number): void {
  drawPill(ctx, pad, 76, 360, 48, PALETTE.primarySoft);
  setFont(ctx, 24, 700);
  ctx.fillStyle = PALETTE.accentDark;
  ctx.fillText(ellipsize(ctx, model.title, 296), pad + 24, 107);

  ctx.textAlign = 'right';
  setFont(ctx, 24, 700);
  ctx.fillStyle = PALETTE.textMute;
  ctx.fillText('Big Five Result', SHARE_CARD_SIZE - pad, 107);
  ctx.textAlign = 'left';
}

function drawTypeBlock(ctx: CanvasRenderingContext2D, model: ShareCardModel, pad: number): void {
  const top = 164;
  const iconSize = 156;
  const iconGradient = ctx.createLinearGradient(pad, top, pad + iconSize, top + iconSize);
  iconGradient.addColorStop(0, PALETTE.accent);
  iconGradient.addColorStop(1, PALETTE.accentViolet);
  roundedRect(ctx, pad, top, iconSize, iconSize, 34);
  ctx.fillStyle = iconGradient;
  ctx.fill();

  setFont(ctx, 82, 700);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.surface;
  ctx.fillText(model.typeIcon, pad + iconSize / 2, top + iconSize / 2 + 4);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  setFont(ctx, 30, 700);
  ctx.fillStyle = PALETTE.warm;
  ctx.fillText('あなたのタイプ', pad + iconSize + 34, top + 36);

  setFont(ctx, 74, 800);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(ellipsize(ctx, model.typeName, 680), pad + iconSize + 34, top + 104);

  setFont(ctx, 32, 700);
  ctx.fillStyle = PALETTE.textSoft;
  drawSingleLine(ctx, model.catch, pad + iconSize + 34, top + 154, 680);
}

function drawFactors(ctx: CanvasRenderingContext2D, model: ShareCardModel, pad: number, top: number): void {
  setFont(ctx, 32, 800);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('5因子スコア', pad, top);

  const barX = pad + 210;
  const valueX = SHARE_CARD_SIZE - pad;
  const rowTop = top + 34;
  model.factors.forEach((factor, index) => {
    const y = rowTop + index * 58;
    setFont(ctx, 23, 700);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(ellipsize(ctx, factor.label, 170), pad, y + 22);

    setFont(ctx, 15, 600);
    ctx.fillStyle = PALETTE.textMute;
    ctx.fillText(ellipsize(ctx, factor.englishName, 170), pad, y + 43);

    roundedRect(ctx, barX, y + 6, 610, 24, 12);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();

    const fillWidth = Math.max(14, Math.min(610, (factor.score / 100) * 610));
    const gradient = ctx.createLinearGradient(barX, y, barX + 610, y);
    gradient.addColorStop(0, PALETTE.accent);
    gradient.addColorStop(1, PALETTE.accentViolet);
    roundedRect(ctx, barX, y + 6, fillWidth, 24, 12);
    ctx.fillStyle = gradient;
    ctx.fill();

    setFont(ctx, 25, 800);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(String(factor.score), valueX, y + 29);
    ctx.textAlign = 'left';
  });
}

function drawJobs(ctx: CanvasRenderingContext2D, model: ShareCardModel, pad: number, top: number): void {
  setFont(ctx, 32, 800);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('向いていそうな仕事 TOP3', pad, top);

  const cardWidth = (SHARE_CARD_SIZE - pad * 2 - 28 * 2) / 3;
  model.jobs.forEach((job, index) => {
    const x = pad + index * (cardWidth + 28);
    const y = top + 34;
    roundedRect(ctx, x, y, cardWidth, 134, 24);
    ctx.fillStyle = index === 0 ? PALETTE.primarySoft : index === 1 ? PALETTE.warmSoft : PALETTE.surfaceAlt;
    ctx.fill();
    ctx.strokeStyle = PALETTE.border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    drawPill(ctx, x + 18, y + 18, 54, 34, index === 0 ? PALETTE.accent : index === 1 ? PALETTE.warm : PALETTE.textMute);
    setFont(ctx, 18, 800);
    ctx.fillStyle = PALETTE.surface;
    ctx.fillText(`#${index + 1}`, x + 31, y + 41);

    setFont(ctx, 24, 800);
    ctx.fillStyle = PALETTE.text;
    drawSingleLine(ctx, job.title, x + 18, y + 84, cardWidth - 36);

    setFont(ctx, 22, 800);
    ctx.fillStyle = index === 0 ? PALETTE.accentDark : PALETTE.textSoft;
    ctx.fillText(`マッチ ${job.matchScore}%`, x + 18, y + 116);
  });
}

function drawFooter(ctx: CanvasRenderingContext2D, model: ShareCardModel, pad: number, y: number): void {
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad, y - 38);
  ctx.lineTo(SHARE_CARD_SIZE - pad, y - 38);
  ctx.stroke();

  setFont(ctx, 24, 700);
  ctx.fillStyle = PALETTE.textMute;
  ctx.fillText(ellipsize(ctx, model.siteUrl, 690), pad, y);

  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.accentDark;
  ctx.fillText(model.hashTag, SHARE_CARD_SIZE - pad, y);
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

function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string): void {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
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
