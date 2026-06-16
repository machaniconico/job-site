/**
 * 診断フローのクライアントロジック。
 * 設問描画 → 回答収集 → スコア計算 → タイプ判定 → 職業マッチ → 結果描画。
 * 回答は localStorage にのみ保存し、サーバーへは一切送信しない。
 */
import { QUESTIONS, QUESTION_COUNT } from '../data/questions';
import { FACTORS, FACTOR_DISPLAY_ORDER } from '../data/dimensions';
import { OCCUPATIONS } from '../data/occupations';
import { computeProfile, displayScore } from '../lib/scoring';
import { determineType } from '../lib/typing';
import { rankOccupations } from '../lib/matching';
import type { Answers, LikertValue, Profile } from '../lib/types';

const STORAGE_KEY = 'personality-quiz-v1';
const PAGE_SIZE = 5;
const TOTAL_PAGES = Math.ceil(QUESTIONS.length / PAGE_SIZE);

const ANSWER_OPTIONS: { value: LikertValue; label: string; pole: string }[] = [
  { value: 1, label: '違う', pole: 'neg2' },
  { value: 2, label: 'やや違う', pole: 'neg1' },
  { value: 3, label: 'どちらとも', pole: 'mid' },
  { value: 4, label: 'やや そう', pole: 'pos1' },
  { value: 5, label: 'そう', pole: 'pos2' },
];

interface State {
  answers: Answers;
  page: number;
}
const state: State = { answers: {}, page: 0 };

let lastProfile: Profile | null = null;
let lastTypeName = '';
let lastTypeIcon = '';

function $<T extends HTMLElement = HTMLElement>(sel: string): T | null {
  return document.querySelector(sel);
}
function $$(sel: string): Element[] {
  return Array.from(document.querySelectorAll(sel));
}
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function answeredCount(): number {
  return QUESTIONS.filter((q) => state.answers[q.id] != null).length;
}
function save(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: state.answers, page: state.page }));
  } catch {
    /* localStorage 不可でも続行 */
  }
}
function load(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<State>;
    if (parsed && typeof parsed === 'object') {
      state.answers = parsed.answers ?? {};
      state.page = Number(parsed.page) || 0;
    }
  } catch {
    /* 壊れた保存は無視 */
  }
}
function clearAll(): void {
  state.answers = {};
  state.page = 0;
  lastProfile = null;
  lastTypeName = '';
  lastTypeIcon = '';
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
}
function show(sel: string, visible: boolean): void {
  const el = $(sel);
  if (el) el.hidden = !visible;
}
function scrollToSel(sel: string): void {
  $(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

function animateIntegerText(el: HTMLElement, target: number): void {
  const finalValue = Math.round(target);
  el.textContent = prefersReducedMotion() ? String(finalValue) : '0';
  if (prefersReducedMotion()) return;

  const duration = 620;
  const start = performance.now();
  const step = (now: number): void => {
    const progress = Math.min((now - start) / duration, 1);
    el.textContent = String(Math.round(finalValue * easeOutCubic(progress)));
    if (progress < 1) {
      requestAnimationFrame(step);
      return;
    }
    el.textContent = String(finalValue);
  };
  requestAnimationFrame(step);
}

function animateResultNumbers(): void {
  $$('#factorBars .bar-value, #jobList .match-score strong').forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const target = Number(el.textContent?.trim());
    if (!Number.isFinite(target)) return;
    animateIntegerText(el, target);
  });
}

function renderFactorChart(profile: Profile): string {
  const cx = 160;
  const cy = 160;
  const radius = 120;
  const factors = FACTOR_DISPLAY_ORDER.map((k, i) => {
    const angleRad = (-90 + i * 72) * (Math.PI / 180);
    const ds = displayScore(profile.scores[k], FACTORS[k].inverted);
    const score = Math.round(ds);
    return {
      angleRad,
      label: FACTORS[k].displayLabel,
      score,
      x: cx + radius * (score / 100) * Math.cos(angleRad),
      y: cy + radius * (score / 100) * Math.sin(angleRad),
      axisX: cx + radius * Math.cos(angleRad),
      axisY: cy + radius * Math.sin(angleRad),
      labelX: cx + (radius + 16) * Math.cos(angleRad),
      labelY: cy + (radius + 16) * Math.sin(angleRad),
    };
  });
  const polygonPoints = factors.map((f) => `${f.x.toFixed(1)},${f.y.toFixed(1)}`).join(' ');
  const grid = [0.25, 0.5, 0.75, 1]
    .map((scale) => {
      const points = factors
        .map((f) => `${(cx + radius * scale * Math.cos(f.angleRad)).toFixed(1)},${(cy + radius * scale * Math.sin(f.angleRad)).toFixed(1)}`)
        .join(' ');
      return `<polygon points="${points}" fill="none" stroke="var(--color-border)" stroke-width="1" />`;
    })
    .join('');
  const axes = factors
    .map(
      (f) =>
        `<line x1="${cx}" y1="${cy}" x2="${f.axisX.toFixed(1)}" y2="${f.axisY.toFixed(1)}" stroke="var(--color-border)" stroke-width="1" />`,
    )
    .join('');
  const points = factors
    .map(
      (f) =>
        `<circle cx="${f.x.toFixed(1)}" cy="${f.y.toFixed(1)}" r="3.5" fill="var(--color-primary)" />`,
    )
    .join('');
  const labels = factors
    .map((f, i) => {
      const anchor = i === 0 ? 'middle' : f.labelX > cx ? 'start' : 'end';
      return `<text x="${f.labelX.toFixed(1)}" y="${f.labelY.toFixed(1)}" text-anchor="${anchor}" dominant-baseline="middle" font-size="12" fill="var(--color-text-soft)">${esc(f.label)}</text>`;
    })
    .join('');
  const ariaLabel = factors.map((f) => `${f.label}: ${f.score}`).join(', ');

  return `<svg role="img" aria-label="${esc(`5因子スコア: ${ariaLabel}`)}" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">${grid}${axes}<polygon points="${polygonPoints}" fill="var(--color-primary)" fill-opacity="0.18" stroke="var(--color-primary)" stroke-width="2" />${points}${labels}</svg>`;
}

function pageComplete(page: number): boolean {
  const start = page * PAGE_SIZE;
  return QUESTIONS.slice(start, start + PAGE_SIZE).every((q) => state.answers[q.id] != null);
}

function handleNumericAnswerKey(event: KeyboardEvent): void {
  if (event.isComposing || !/^[1-5]$/.test(event.key)) return;

  const target = event.target;
  if (!(target instanceof Element)) return;
  const scale = target.closest('.answer-scale');
  if (!(scale instanceof HTMLElement)) return;

  const input = scale.querySelector<HTMLInputElement>(`input[type="radio"][value="${event.key}"]`);
  if (!input) return;

  event.preventDefault();
  input.checked = true;
  input.dispatchEvent(new Event('change', { bubbles: true }));
  input.focus({ preventScroll: true });
}

function renderProgress(): void {
  const count = answeredCount();
  const pct = Math.round((count / QUESTION_COUNT) * 100);
  const bar = $('#progressBar');
  if (bar) bar.style.width = `${pct}%`;
  const text = $('#progressText');
  if (text) text.textContent = `${count} / ${QUESTION_COUNT} 問`;
  const encourage = $('#encourageText');
  if (encourage) {
    const message: { text: string; emoji?: string } =
      pct === 0
        ? { text: 'リラックスして、直感で答えてね', emoji: '🌱' }
        : pct < 25
          ? { text: 'いい調子！' }
          : pct < 50
            ? { text: 'その調子！もう少しで折り返し' }
            : pct < 75
              ? { text: '折り返し！半分こえたよ', emoji: '🎉' }
              : pct < 100
                ? { text: 'もうすぐゴール！' }
                : { text: 'ぜんぶそろった！結果を見てみよう', emoji: '✨' };
    encourage.innerHTML = `${esc(message.text)}${message.emoji ? ` <span aria-hidden="true">${esc(message.emoji)}</span>` : ''}`;
  }
  const pageText = $('#pageText');
  if (pageText) pageText.textContent = `ページ ${state.page + 1} / ${TOTAL_PAGES}`;
}

function renderQuestions(): void {
  state.page = Math.max(0, Math.min(TOTAL_PAGES - 1, state.page));
  const start = state.page * PAGE_SIZE;
  const items = QUESTIONS.slice(start, start + PAGE_SIZE);
  const list = $('#questionList');
  if (!list) return;
  const title = $('#pageTitle');
  if (title) title.textContent = `診断 ${state.page + 1} / ${TOTAL_PAGES}`;

  list.innerHTML = items
    .map((q, i) => {
      const num = start + i + 1;
      const hintId = `${q.id}-key-hint`;
      const opts = ANSWER_OPTIONS.map((o) => {
        const checked = Number(state.answers[q.id]) === o.value ? 'checked' : '';
        const inputId = `${q.id}-${o.value}`;
        return `<div class="answer-choice"><input id="${esc(inputId)}" type="radio" name="${esc(q.id)}" value="${o.value}" ${checked} aria-label="${esc(o.label)}"><label class="answer-circle" for="${esc(inputId)}" data-pole="${esc(o.pole)}" aria-label="${esc(o.label)}"><span class="answer-digit" aria-hidden="true">${o.value}</span><span class="sr-only">${esc(o.label)}</span></label></div>`;
      }).join('');
      return `<article class="question-card"><div class="question-meta"><span>Q${num}</span><span>${esc(FACTORS[q.factor].displayLabel)}</span></div><h3>${esc(q.text)}</h3><fieldset class="answer-scale" aria-describedby="${esc(hintId)}"><legend class="sr-only">${esc(q.text)}</legend><div class="answer-guides" aria-hidden="true"><span>当てはまらない ←</span><span>→ 当てはまる</span></div><div class="answer-row">${opts}</div><p class="answer-key-hint" id="${esc(hintId)}">数字キー 1〜5 でも選べます</p></fieldset></article>`;
    })
    .join('');

  $$('#questionList input[type=radio]').forEach((input) => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      state.answers[target.name] = Number(target.value) as LikertValue;
      save();
      renderProgress();
      updateNav();
    });
  });

  renderProgress();
  updateNav();
}

function updateNav(): void {
  const prev = $<HTMLButtonElement>('#prevBtn');
  const next = $<HTMLButtonElement>('#nextBtn');
  const finish = $<HTMLButtonElement>('#finishBtn');
  const isLast = state.page >= TOTAL_PAGES - 1;
  if (prev) prev.disabled = state.page <= 0;
  if (next) {
    next.hidden = isLast;
    next.disabled = !pageComplete(state.page);
  }
  if (finish) {
    finish.hidden = !isLast;
    finish.disabled = answeredCount() !== QUESTION_COUNT;
  }
}

function startDiagnosis(): void {
  show('#diagnosis', true);
  show('#result', false);
  renderQuestions();
  scrollToSel('#diagnosis');
}

function renderResult(): void {
  const profile = computeProfile(QUESTIONS, state.answers);
  const typeMatch = determineType(profile);
  const jobs = rankOccupations(OCCUPATIONS, profile).slice(0, 8);
  lastProfile = profile;
  lastTypeName = typeMatch.type.name;
  lastTypeIcon = typeMatch.type.icon;

  const hero = $('#typeHero');
  if (hero) {
    const t = typeMatch.type;
    hero.innerHTML = `<div class="type-hero"><div class="type-icon" aria-hidden="true">${esc(t.icon)}</div><div><p class="eyebrow">あなたのタイプ</p><h2>${esc(t.name)}</h2><p class="type-catch">${esc(t.catch)}</p></div><div class="confidence-card"><span>結果の信頼度</span><strong>${esc(profile.confidence)}</strong><span>${esc(profile.confidenceReason)}</span></div></div><p>${esc(t.summary)}</p><div class="grid-2"><div><p class="eyebrow">強み</p><ul>${t.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div><div><p class="eyebrow">気をつけたい点</p><ul>${t.cautions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div></div>`;
  }

  const chart = $('#factorChart');
  if (chart) {
    chart.innerHTML = renderFactorChart(profile);
  }

  const bars = $('#factorBars');
  if (bars) {
    bars.innerHTML = FACTOR_DISPLAY_ORDER.map((k) => {
      const f = FACTORS[k];
      const ds = displayScore(profile.scores[k], f.inverted);
      const roundedScore = Math.round(ds);
      const blurb = roundedScore >= 50 ? f.highBlurb : f.lowBlurb;
      return `<div class="bar-row"><div class="bar-label"><strong>${esc(f.displayLabel)}</strong><small>${esc(f.englishName)}</small></div><div class="bar-track"><span style="width:${roundedScore}%"></span></div><div class="bar-value">${roundedScore}</div></div><p style="grid-column:1/-1;margin:0 0 var(--space-2);font-size:var(--step--1);color:var(--color-text-soft)">${esc(blurb)}</p>`;
    }).join('');
  }
  const note = $('#factorNote');
  if (note) {
    note.textContent =
      'スコアは規範データに基づく偏差値ではなく、あなたの回答内での相対的な高さ（0〜100）です。情緒安定性は神経症傾向を反転して表示しています。';
  }

  const jobList = $('#jobList');
  if (jobList) {
    jobList.innerHTML = jobs
      .map((job, i) => {
        const reasons = job.matchReasons.map((r) => `<li>${esc(r)}</li>`).join('');
        const cautions = job.cautions.map((r) => `<li>${esc(r)}</li>`).join('');
        const actions = job.nextActions.map((r) => `<li>${esc(r)}</li>`).join('');
        const skills = job.skillThemes.map((s) => `<span>${esc(s)}</span>`).join('');
        const rankClass = i < 3 ? `rank-${i + 1}` : 'rank-other';
        return `<article class="job-card"><div class="job-rank"><span class="rank-medal ${rankClass}">${i + 1}</span></div><div><div class="job-heading"><div><p class="eyebrow"><span class="job-category">${esc(job.category)}</span></p><h3>${esc(job.title)}</h3></div><div class="match-score"><div class="score-gauge" style="--p:${job.matchScore}" aria-hidden="true"></div><strong>${job.matchScore}</strong><span>%</span></div></div><p>${esc(job.description)}</p><div class="skill-tags">${skills}</div><details open><summary>なぜ合うか</summary><ul>${reasons}</ul></details><details><summary>気をつけたい点</summary><ul>${cautions}</ul></details><details><summary>適性を試すアクション</summary><ul>${actions}</ul></details></div></article>`;
      })
      .join('');
  }

  animateResultNumbers();
  show('#result', true);
  scrollToSel('#result');
}

function summaryText(): string {
  if (!lastProfile) return '';
  const lines = FACTOR_DISPLAY_ORDER.map(
    (k) => `${FACTORS[k].displayLabel}: ${Math.round(displayScore(lastProfile!.scores[k], FACTORS[k].inverted))}`,
  );
  return [`私の性格タイプは「${lastTypeIcon} ${lastTypeName}」でした！`, '', ...lines, '', '#性格診断'].join('\n');
}

function init(): void {
  load();
  const hasProgress = answeredCount() > 0;
  show('#resumeBtn', hasProgress);
  show('#resetBtn', hasProgress);

  $('#startBtn')?.addEventListener('click', () => {
    clearAll();
    show('#resumeBtn', false);
    show('#resetBtn', false);
    startDiagnosis();
  });
  $('#resumeBtn')?.addEventListener('click', () => startDiagnosis());
  $('#resetBtn')?.addEventListener('click', () => {
    if (confirm('回答をリセットしますか？')) {
      clearAll();
      show('#resumeBtn', false);
      show('#resetBtn', false);
      show('#diagnosis', false);
      show('#result', false);
    }
  });
  $('#prevBtn')?.addEventListener('click', () => {
    state.page -= 1;
    save();
    renderQuestions();
    scrollToSel('#diagnosis');
  });
  $('#nextBtn')?.addEventListener('click', () => {
    state.page += 1;
    save();
    renderQuestions();
    scrollToSel('#diagnosis');
  });
  $('#questionList')?.addEventListener('keydown', handleNumericAnswerKey);
  $('#finishBtn')?.addEventListener('click', () => renderResult());
  $('#retakeBtn')?.addEventListener('click', () => {
    clearAll();
    show('#result', false);
    startDiagnosis();
  });
  $('#printBtn')?.addEventListener('click', () => window.print());
  $('#copyBtn')?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(summaryText());
      const btn = $('#copyBtn');
      if (btn) {
        const original = btn.textContent;
        btn.textContent = 'コピーしました';
        setTimeout(() => {
          btn.textContent = original;
        }, 1500);
      }
    } catch {
      alert('コピーに失敗しました。お使いのブラウザの設定をご確認ください。');
    }
  });
  $('#shareBtn')?.addEventListener('click', () => {
    const url = location.href.split('#')[0];
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(summaryText())}&url=${encodeURIComponent(url)}`;
    window.open(intent, '_blank', 'noopener');
  });
  $('#jsonBtn')?.addEventListener('click', () => {
    if (!lastProfile) return;
    const payload = { type: lastTypeName, profile: lastProfile, answers: state.answers };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = `personality-result-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
