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
    .replace(/"/g, '&quot;');
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

function pageComplete(page: number): boolean {
  const start = page * PAGE_SIZE;
  return QUESTIONS.slice(start, start + PAGE_SIZE).every((q) => state.answers[q.id] != null);
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
    encourage.textContent =
      pct === 0
        ? 'リラックスして、直感で答えてね 🌱'
        : pct < 25
          ? 'いい調子！'
          : pct < 50
            ? 'その調子！もう少しで折り返し'
            : pct < 75
              ? '折り返し！半分こえたよ 🎉'
              : pct < 100
                ? 'もうすぐゴール！'
                : 'ぜんぶそろった！結果を見てみよう ✨';
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
      const opts = ANSWER_OPTIONS.map((o) => {
        const checked = Number(state.answers[q.id]) === o.value ? 'checked' : '';
        const inputId = `${q.id}-${o.value}`;
        return `<div class="answer-choice"><input id="${esc(inputId)}" type="radio" name="${esc(q.id)}" value="${o.value}" ${checked} aria-label="${esc(o.label)}"><label class="answer-circle" for="${esc(inputId)}" data-pole="${esc(o.pole)}" aria-label="${esc(o.label)}"><span class="sr-only">${esc(o.label)}</span></label></div>`;
      }).join('');
      return `<article class="question-card"><div class="question-meta"><span>Q${num}</span><span>${esc(FACTORS[q.factor].displayLabel)}</span></div><h3>${esc(q.text)}</h3><fieldset class="answer-scale" role="radiogroup" aria-label="${esc(q.text)}"><legend class="sr-only">${esc(q.text)}</legend><div class="answer-guides" aria-hidden="true"><span>当てはまらない ←</span><span>→ 当てはまる</span></div><div class="answer-row">${opts}</div></fieldset></article>`;
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
    hero.innerHTML = `<div class="type-hero"><div class="type-icon">${esc(t.icon)}</div><div><p class="eyebrow">あなたのタイプ</p><h2>${esc(t.name)}</h2><p class="type-catch">${esc(t.catch)}</p></div><div class="confidence-card"><span>結果の信頼度</span><strong>${esc(profile.confidence)}</strong><span>${esc(profile.confidenceReason)}</span></div></div><p>${esc(t.summary)}</p><div class="grid-2"><div><p class="eyebrow">強み</p><ul>${t.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div><div><p class="eyebrow">気をつけたい点</p><ul>${t.cautions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div></div>`;
  }

  const bars = $('#factorBars');
  if (bars) {
    bars.innerHTML = FACTOR_DISPLAY_ORDER.map((k) => {
      const f = FACTORS[k];
      const ds = displayScore(profile.scores[k], f.inverted);
      const blurb = ds >= 50 ? f.highBlurb : f.lowBlurb;
      return `<div class="bar-row"><div class="bar-label"><strong>${esc(f.displayLabel)}</strong><small>${esc(f.englishName)}</small></div><div class="bar-track"><span style="width:${ds}%"></span></div><div class="bar-value">${ds}</div></div><p style="grid-column:1/-1;margin:0 0 var(--space-2);font-size:var(--step--1);color:var(--color-text-soft)">${esc(blurb)}</p>`;
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
        return `<article class="job-card"><div class="job-rank">#${i + 1}</div><div><div class="job-heading"><div><p class="eyebrow">${esc(job.category)}</p><h3>${esc(job.title)}</h3></div><div class="match-score"><strong>${job.matchScore}</strong><span>%</span></div></div><p>${esc(job.description)}</p><div class="skill-tags">${skills}</div><details open><summary>なぜ合うか</summary><ul>${reasons}</ul></details><details><summary>気をつけたい点</summary><ul>${cautions}</ul></details><details><summary>適性を試すアクション</summary><ul>${actions}</ul></details></div></article>`;
      })
      .join('');
  }

  show('#result', true);
  scrollToSel('#result');
}

function summaryText(): string {
  if (!lastProfile) return '';
  const lines = FACTOR_DISPLAY_ORDER.map(
    (k) => `${FACTORS[k].displayLabel}: ${displayScore(lastProfile!.scores[k], FACTORS[k].inverted)}`,
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
