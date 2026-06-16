/**
 * 診断フローのクライアントロジック。
 * 設問描画 → 回答収集 → スコア計算 → タイプ判定 → 職業マッチ → 結果描画。
 * 回答は localStorage にのみ保存し、サーバーへは一切送信しない。
 */
import { QUESTIONS, QUESTION_COUNT } from '../data/questions';
import { FACTORS, FACTOR_DISPLAY_ORDER } from '../data/dimensions';
import { OCCUPATIONS } from '../data/occupations';
import { computeProfile, computeFacetScores, displayScore } from '../lib/scoring';
import { determineType, topTypes } from '../lib/typing';
import { rankOccupations } from '../lib/matching';
import { createShareCardBlob } from './shareImage';
import type {
  Answers,
  FacetScore,
  FactorKey,
  FactorScores,
  LikertValue,
  OccupationMatch,
  PersonalityType,
  Profile,
} from '../lib/types';

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

/**
 * 各因子が「日常でどう出るか」の補強コピー（displayLabel 基準の高低）。
 * 既存の highBlurb/lowBlurb（傾向の説明）に、具体的な場面の一言を足して厚みを出す。
 */
const FACTOR_DAILY_BLURB: Record<FactorKey, { high: string; low: string }> = {
  O: {
    high: '日常では、新しい店やテーマにすぐ興味が向き、雑談でも「なぜ?」と話を広げがち。',
    low: '日常では、慣れた段取りや定番を選び、実証ずみのやり方で着実に進めるのが快適。',
  },
  C: {
    high: '日常では、ToDoや締切を先に押さえ、やるべきことを片づけてから動くと落ち着く。',
    low: '日常では、その時の気分や流れで動き、計画より即興でうまく回せる場面が多い。',
  },
  E: {
    high: '日常では、人と話すと充電され、集まりや雑談の輪の中心になりやすい。',
    low: '日常では、一人や少人数の静かな時間で回復し、深い対話の方が心地よい。',
  },
  A: {
    high: '日常では、まわりの様子に気を配り、もめごとは穏便に収めようと動きがち。',
    low: '日常では、思ったことを率直に伝え、馴れ合いより筋や合理を優先しやすい。',
  },
  N: {
    high: '日常では、強い緊張やトラブルの中でも比較的落ち着いていられ、引きずりにくい。',
    low: '日常では、先の心配や人の反応に敏感で、その分リスクや機微にもよく気づける。',
  },
};

interface State {
  answers: Answers;
  page: number;
}
const state: State = { answers: {}, page: 0 };

let lastProfile: Profile | null = null;
let lastType: PersonalityType | null = null;
let lastJobs: OccupationMatch[] = [];
let lastTypeName = '';
let lastTypeIcon = '';
let lastTypeId = '';

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
  lastType = null;
  lastJobs = [];
  lastTypeName = '';
  lastTypeIcon = '';
  lastTypeId = '';
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

/** タイプ別ページの絶対URL（location.origin + BASE_URL 正規化 + type/<id>/）。 */
function typePageUrl(typeId: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${location.origin}${base}/type/${typeId}/`;
}

/** 職業詳細ページの絶対URL（location.origin + BASE_URL 正規化 + job/<id>/）。 */
function jobPageUrl(jobId: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/+$/, '');
  return `${location.origin}${base}/job/${jobId}/`;
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

/**
 * タイプの pattern から「そのタイプに表れやすい素の FactorScores」を導く。
 * 規則は Iter10 タイプページと同一: high→75 / low→25 / 指定なし→50。
 * 返すのは素スコア（N が高い=神経症傾向が強い）。表示時は displayScore で反転される。
 */
function expectedScoresFromPattern(type: PersonalityType): FactorScores {
  const scores = {} as FactorScores;
  for (const k of FACTOR_DISPLAY_ORDER) {
    const want = type.pattern[k];
    scores[k] = want === 'high' ? 75 : want === 'low' ? 25 : 50;
  }
  return scores;
}

/**
 * 5因子レーダー。ユーザー profile の polygon を必ず描き、
 * typeExpected（判定タイプの期待プロファイル）が渡されたときだけ、
 * 破線アウトラインの2系列目を重ねて「あなた」と「タイプの典型」を見比べられるようにする。
 * 値はどちらも displayScore(値, inverted) を通す（N は情緒安定性として反転）。
 */
function renderFactorChart(profile: Profile, typeExpected?: FactorScores): string {
  const cx = 160;
  const cy = 160;
  const radius = 120;
  const factors = FACTOR_DISPLAY_ORDER.map((k, i) => {
    const angleRad = (-90 + i * 72) * (Math.PI / 180);
    const ds = displayScore(profile.scores[k], FACTORS[k].inverted);
    const score = Math.round(ds);
    const expected =
      typeExpected != null ? Math.round(displayScore(typeExpected[k], FACTORS[k].inverted)) : null;
    return {
      angleRad,
      label: FACTORS[k].displayLabel,
      score,
      expected,
      x: cx + radius * (score / 100) * Math.cos(angleRad),
      y: cy + radius * (score / 100) * Math.sin(angleRad),
      ex: expected != null ? cx + radius * (expected / 100) * Math.cos(angleRad) : 0,
      ey: expected != null ? cy + radius * (expected / 100) * Math.sin(angleRad) : 0,
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

  // タイプの典型 polygon は塗りなし・破線アウトライン（var(--color-text-soft)）で重ね、
  // ユーザー塗り（var(--color-primary)）と視覚的に区別する。grid と axes の上、ユーザーの下に置く。
  const expectedPolygon =
    typeExpected != null
      ? `<polygon class="factor-chart-expected" points="${factors.map((f) => `${f.ex.toFixed(1)},${f.ey.toFixed(1)}`).join(' ')}" fill="none" stroke="var(--color-text-soft)" stroke-width="1.75" stroke-dasharray="5 4" stroke-linejoin="round" />`
      : '';

  const youAria = factors.map((f) => `${f.label} ${f.score}`).join('、');
  const ariaLabel =
    typeExpected != null
      ? `5因子スコア。あなた: ${youAria}。タイプの典型は破線で重ねて表示しています。`
      : `5因子スコア。あなた: ${youAria}。`;

  return `<svg role="img" aria-label="${esc(ariaLabel)}" viewBox="0 0 320 320" xmlns="http://www.w3.org/2000/svg">${grid}${axes}${expectedPolygon}<polygon points="${polygonPoints}" fill="var(--color-primary)" fill-opacity="0.18" stroke="var(--color-primary)" stroke-width="2" />${points}${labels}</svg>`;
}

/**
 * #factorChart 直下に置く凡例。色サンプルは aria-hidden とし、テキスト（あなた / タイプの典型）で
 * 意味を担保する。typeName が与えられたときだけタイプ系列の凡例を出す（BALANCED 時は重ねないので呼ばれない）。
 */
function renderFactorLegend(typeName?: string): string {
  if (!typeName) return '';
  return `<ul class="factor-legend"><li class="factor-legend-item"><span class="factor-legend-swatch factor-legend-you" aria-hidden="true"></span>あなた</li><li class="factor-legend-item"><span class="factor-legend-swatch factor-legend-type" aria-hidden="true"></span>${esc(typeName)}の典型</li></ul>`;
}

/**
 * 「近いタイプ」セクション。主タイプを除いた次点上位2件を fit% とリンク付きで描画する。
 * BALANCED は rankTypes に含まれないため topTypes には現れない。
 */
function renderNearbyTypes(profile: Profile, mainTypeId: string, mainTypeName: string): string {
  // 主タイプを除外し、フィットが弱すぎる（50%未満）ものは「近い」とは言えないので落とす。
  // バランス型のときは候補が軒並み低フィットになりやすく、これで誤解を避ける。
  const others = topTypes(profile, 4)
    .filter((match) => match.type.id !== mainTypeId && match.fitScore >= 50)
    .slice(0, 2);
  if (others.length === 0) return '';

  const cards = others
    .map((match) => {
      const t = match.type;
      const fit = Math.round(match.fitScore);
      return `<li class="nearby-card"><a class="nearby-link" href="${esc(typePageUrl(t.id))}"><span class="nearby-icon" aria-hidden="true">${esc(t.icon)}</span><span class="nearby-body"><span class="nearby-name">${esc(t.name)}</span><span class="nearby-catch">${esc(t.catch)}</span></span><span class="nearby-fit"><strong>${fit}</strong><span>% フィット</span></span></a></li>`;
    })
    .join('');

  const otherNames = others.map((match) => match.type.name);
  const relation =
    otherNames.length === 2
      ? `主に「${mainTypeName}」。${otherNames[0]}・${otherNames[1]}の一面もあわせ持っています。`
      : `主に「${mainTypeName}」。${otherNames[0]}の一面もあわせ持っています。`;

  return `<article class="panel" style="margin-top: var(--space-5)"><p class="eyebrow">あなたに近いタイプ</p><h2>主タイプの隣にいる顔</h2><p>${esc(relation)}</p><ul class="nearby-list">${cards}</ul></article>`;
}

/**
 * 因子のファセット内訳。各因子バーの下に折りたたみでミニバーを並べる。
 * - 未測定（answered=0）の facet は淡色で「—（未測定）」と表示し 0=low と誤解させない。
 * - N（神経症傾向）因子は素スコア表示（高い=神経症傾向が強い）とし、注記で
 *   情緒安定性バーとは向きが逆である旨を明示する（一貫方針）。
 */
function renderFacetBreakdown(facetsByFactor: Record<FactorKey, FacetScore[]>, factorKey: FactorKey): string {
  const facets = facetsByFactor[factorKey];
  if (!facets || facets.length === 0) return '';
  const isNeuro = factorKey === 'N';

  const rows = facets
    .map((f) => {
      if (f.answered === 0) {
        return `<div class="facet-row facet-unmeasured"><div class="facet-name">${esc(f.facet)}</div><div class="facet-track" aria-hidden="true"><span style="width:0%"></span></div><div class="facet-value">—<small>未測定</small></div></div>`;
      }
      const score = Math.round(f.score);
      return `<div class="facet-row"><div class="facet-name">${esc(f.facet)}</div><div class="facet-track"><span style="width:${score}%"></span></div><div class="facet-value">${score}</div></div>`;
    })
    .join('');

  const note = isNeuro
    ? `<p class="facet-note">この内訳は神経症傾向の素の高さ（高いほど反応しやすい）で表示しています。上の「情緒安定性」バーとは向きが逆になります。</p>`
    : '';

  return `<details class="facet-details"><summary>ファセット内訳を見る</summary>${note}<div class="facet-bars">${rows}</div></details>`;
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
  lastType = typeMatch.type;
  lastJobs = jobs;
  lastTypeName = typeMatch.type.name;
  lastTypeIcon = typeMatch.type.icon;
  lastTypeId = typeMatch.type.id;

  const hero = $('#typeHero');
  if (hero) {
    const t = typeMatch.type;
    hero.innerHTML = `<div class="type-hero"><div class="type-icon" aria-hidden="true">${esc(t.icon)}</div><div><p class="eyebrow">あなたのタイプ</p><h2>${esc(t.name)}</h2><p class="type-catch">${esc(t.catch)}</p></div><div class="confidence-card"><span>結果の信頼度</span><strong>${esc(profile.confidence)}</strong><span>${esc(profile.confidenceReason)}</span></div></div><p>${esc(t.summary)}</p><div class="grid-2"><div><p class="eyebrow">強み</p><ul>${t.strengths.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div><div><p class="eyebrow">気をつけたい点</p><ul>${t.cautions.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div></div><p style="margin-top:var(--space-4)"><a href="${esc(typePageUrl(t.id))}">このタイプのページを見る</a></p>`;
  }

  const nearby = $('#nearbyTypes');
  if (nearby) {
    nearby.innerHTML = renderNearbyTypes(profile, typeMatch.type.id, typeMatch.type.name);
  }

  const chart = $('#factorChart');
  if (chart) {
    // BALANCED（pattern={}→全50）は情報量が乏しいので典型を重ねない。
    // それ以外の判定タイプは pattern から期待プロファイルを導いて2系列目に重ねる。
    const overlayType = typeMatch.type.id !== 'balanced';
    const expected = overlayType ? expectedScoresFromPattern(typeMatch.type) : undefined;
    chart.innerHTML = renderFactorChart(profile, expected) + renderFactorLegend(overlayType ? typeMatch.type.name : undefined);
  }

  const facetsByFactor = computeFacetScores(QUESTIONS, state.answers);
  const bars = $('#factorBars');
  if (bars) {
    bars.innerHTML = FACTOR_DISPLAY_ORDER.map((k) => {
      const f = FACTORS[k];
      const ds = displayScore(profile.scores[k], f.inverted);
      const roundedScore = Math.round(ds);
      const blurb = roundedScore >= 50 ? f.highBlurb : f.lowBlurb;
      const daily = FACTOR_DAILY_BLURB[k][roundedScore >= 50 ? 'high' : 'low'];
      const breakdown = renderFacetBreakdown(facetsByFactor, k);
      return `<div class="bar-row"><div class="bar-label"><strong>${esc(f.displayLabel)}</strong><small>${esc(f.englishName)}</small></div><div class="bar-track"><span style="width:${roundedScore}%"></span></div><div class="bar-value">${roundedScore}</div></div><div class="bar-detail"><p class="bar-blurb">${esc(blurb)}</p><p class="bar-daily">${esc(daily)}</p>${breakdown}</div>`;
    }).join('');
  }
  const note = $('#factorNote');
  if (note) {
    note.textContent =
      'スコアは規範データに基づく偏差値ではなく、あなたの回答内での相対的な高さ（0〜100）です。情緒安定性は神経症傾向を反転して表示しています。各因子の「ファセット内訳を見る」を開くと、より細かい下位特性のスコアを確認できます。';
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
        return `<article class="job-card"><div class="job-rank"><span class="rank-medal ${rankClass}">${i + 1}</span></div><div><div class="job-heading"><div><p class="eyebrow"><span class="job-category">${esc(job.category)}</span></p><h3>${esc(job.title)}</h3></div><div class="match-score"><div class="score-gauge" style="--p:${job.matchScore}" aria-hidden="true"></div><strong>${job.matchScore}</strong><span>%</span></div></div><p>${esc(job.description)}</p><div class="skill-tags">${skills}</div><details open><summary>なぜ合うか</summary><ul>${reasons}</ul></details><details><summary>気をつけたい点</summary><ul>${cautions}</ul></details><details><summary>適性を試すアクション</summary><ul>${actions}</ul></details><p class="job-detail-link"><a href="${esc(jobPageUrl(job.id))}">この仕事を詳しく見る</a></p></div></article>`;
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

function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 大きな Blob（PNG など）で同期 revoke するとダウンロードが中断する環境があるため次tickで解放する。
  setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
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
    // 結果タイプの型ページURLを共有する（未判定時はトップURLにフォールバック）。
    const url = lastTypeId ? typePageUrl(lastTypeId) : location.href.split('#')[0];
    const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(summaryText())}&url=${encodeURIComponent(url)}`;
    window.open(intent, '_blank', 'noopener');
  });
  $('#saveImageBtn')?.addEventListener('click', async () => {
    if (!lastProfile || !lastType) return;
    const btn = $<HTMLButtonElement>('#saveImageBtn');
    // 生成中の二重クリックでラベルが固着しないよう、処理中はボタンを無効化する。
    if (btn?.disabled) return;
    const original = btn?.textContent ?? '';
    if (btn) {
      btn.disabled = true;
      btn.textContent = '画像を生成中...';
      btn.setAttribute('aria-busy', 'true');
    }
    try {
      const blob = await createShareCardBlob(lastProfile, lastType, lastJobs);
      downloadBlob(blob, `personality-result-${new Date().toISOString().slice(0, 10)}.png`);
    } catch {
      alert('画像の保存に失敗しました。お使いのブラウザの設定をご確認ください。');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = original;
        btn.removeAttribute('aria-busy');
      }
    }
  });
  $('#jsonBtn')?.addEventListener('click', () => {
    if (!lastProfile) return;
    const payload = { type: lastTypeName, profile: lastProfile, answers: state.answers };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `personality-result-${new Date().toISOString().slice(0, 10)}.json`);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
