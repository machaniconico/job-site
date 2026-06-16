import type { Question } from '../lib/types';

/**
 * Big Five 50項目（5因子 × 10問）。
 * 設計方針:
 *  - 各因子に逆転項目(reverse)を5問ずつ入れ、黙従バイアス（とりあえず高評価を付ける癖）を相殺する。
 *  - 因子内は異なる facet（下位特性）を突く。同義文の言い換えを並べない。
 *  - N（神経症傾向）の素項目は「高得点 = 神経症傾向が強い」。逆転項目は情緒安定を測る。
 * 出題はシャッフルせず固定順だが、表示側でページングする。
 */
export const QUESTIONS: Question[] = [
  // ── O 開放性 ────────────────────────────────
  { id: 'q01', factor: 'O', facet: '審美', reverse: false, text: '美しい風景や音楽、芸術作品に強く心を動かされることがある。' },
  { id: 'q02', factor: 'O', facet: 'アイデア', reverse: false, text: '抽象的な考えや、答えのない問いについて考えるのが好きだ。' },
  { id: 'q03', factor: 'O', facet: '行動', reverse: false, text: '旅行先や食事では、定番よりも試したことのない方を選びたくなる。' },
  { id: 'q04', factor: 'O', facet: '知的好奇心', reverse: false, text: '物事の仕組みや背景が気になり、自分から深く調べることが多い。' },
  { id: 'q05', factor: 'O', facet: '想像', reverse: false, text: '頭の中でいろいろな場面を思い描く、想像の時間が好きだ。' },
  { id: 'q06', factor: 'O', facet: '行動', reverse: true, text: '慣れたやり方や定番が一番で、新しいことを試す必要は感じない。' },
  { id: 'q07', factor: 'O', facet: '審美', reverse: true, text: '詩や芸術作品の良さは、正直よく分からないことが多い。' },
  { id: 'q08', factor: 'O', facet: 'アイデア', reverse: true, text: '理論や抽象論よりも、目の前の実際的なことに関心が向く。' },
  { id: 'q09', factor: 'O', facet: '価値', reverse: true, text: '昔からのやり方や常識は、基本的にそのまま受け入れる方だ。' },
  { id: 'q10', factor: 'O', facet: '想像', reverse: true, text: '空想にふけるよりも、現実的なことに時間を使いたい。' },

  // ── C 誠実性 ────────────────────────────────
  { id: 'q11', factor: 'C', facet: '秩序', reverse: false, text: '物やデータは、決まった場所やルールで整理しておきたい。' },
  { id: 'q12', factor: 'C', facet: '達成追求', reverse: false, text: '目標を決めたら、計画を立てて着実に進める方だ。' },
  { id: 'q13', factor: 'C', facet: '自己鍛錬', reverse: false, text: '気が乗らない作業でも、やると決めたら最後までやり切る。' },
  { id: 'q14', factor: 'C', facet: '慎重', reverse: false, text: '何かを決める前に、起こりうる結果をよく考えてから動く。' },
  { id: 'q15', factor: 'C', facet: '良心性', reverse: false, text: '締切や約束は、多少無理してでもきちんと守りたい。' },
  { id: 'q16', factor: 'C', facet: '秩序', reverse: true, text: '整理整頓は苦手で、身の回りが散らかりがちだ。' },
  { id: 'q17', factor: 'C', facet: '自己鍛錬', reverse: true, text: 'やるべきことを後回しにして、ぎりぎりになりやすい。' },
  { id: 'q18', factor: 'C', facet: '慎重', reverse: true, text: '細かく計画するより、勢いやその場の判断で動く方だ。' },
  { id: 'q19', factor: 'C', facet: '達成追求', reverse: true, text: '一つのことをやり遂げる前に、興味が次へ移ることが多い。' },
  { id: 'q20', factor: 'C', facet: '良心性', reverse: true, text: '細かいルールや手順は、正直あまり気にしない。' },

  // ── E 外向性 ────────────────────────────────
  { id: 'q21', factor: 'E', facet: '群居性', reverse: false, text: '大人数で集まる場やにぎやかな場所にいると元気が出る。' },
  { id: 'q22', factor: 'E', facet: '自己主張', reverse: false, text: '集団の中では、自分から話を切り出したり引っ張る役になりやすい。' },
  { id: 'q23', factor: 'E', facet: '活動性', reverse: false, text: '予定を詰め込んで、忙しく動き回る方が性に合っている。' },
  { id: 'q24', factor: 'E', facet: '陽気さ', reverse: false, text: '楽しいことには声を上げて反応する、表情豊かなタイプだ。' },
  { id: 'q25', factor: 'E', facet: '温かさ', reverse: false, text: '初対面の人にも自分から話しかけ、すぐ打ち解けられる。' },
  { id: 'q26', factor: 'E', facet: '群居性', reverse: true, text: '大勢でいるより、一人で過ごす時間の方が落ち着く。' },
  { id: 'q27', factor: 'E', facet: '自己主張', reverse: true, text: '会議や集まりでは、自分から発言するより聞き役に回る。' },
  { id: 'q28', factor: 'E', facet: '刺激希求', reverse: true, text: '刺激の多い場よりも、静かで落ち着いた環境を好む。' },
  { id: 'q29', factor: 'E', facet: '活動性', reverse: true, text: '予定が少なく、ゆっくりできる日の方がありがたい。' },
  { id: 'q30', factor: 'E', facet: '温かさ', reverse: true, text: '知らない人と打ち解けるまでには、時間がかかる方だ。' },

  // ── A 協調性 ────────────────────────────────
  { id: 'q31', factor: 'A', facet: '利他性', reverse: false, text: '困っている人がいると、自分の手を止めてでも助けたくなる。' },
  { id: 'q32', factor: 'A', facet: '信頼', reverse: false, text: '基本的に、人は善意で動いていると思っている。' },
  { id: 'q33', factor: 'A', facet: '優しさ', reverse: false, text: '相手の気持ちや事情を、まず汲み取ろうとする方だ。' },
  { id: 'q34', factor: 'A', facet: '応諾', reverse: false, text: '対立しそうなときは、譲ってでも円満に収めたい。' },
  { id: 'q35', factor: 'A', facet: '実直', reverse: false, text: '駆け引きは苦手で、思ったことを正直に伝える方だ。' },
  { id: 'q36', factor: 'A', facet: '信頼', reverse: true, text: '人の言うことは、まず疑ってかかる方が安全だと思う。' },
  { id: 'q37', factor: 'A', facet: '利他性', reverse: true, text: '他人のことより、まず自分の利益を優先して考える。' },
  { id: 'q38', factor: 'A', facet: '応諾', reverse: true, text: '納得できないことには、相手が誰でもはっきり反論する。' },
  { id: 'q39', factor: 'A', facet: '優しさ', reverse: true, text: '物事は感情を交えず、冷静に損得で判断したい。' },
  { id: 'q40', factor: 'A', facet: '慎み深さ', reverse: true, text: '自分の手柄や能力は、はっきりアピールするべきだと思う。' },

  // ── N 神経症傾向（表示は情緒安定性） ──────────
  { id: 'q41', factor: 'N', facet: '不安', reverse: false, text: '先のことを考えて、不安になったり心配しすぎたりすることが多い。' },
  { id: 'q42', factor: 'N', facet: '抑うつ', reverse: false, text: '落ち込むと、なかなか気持ちを切り替えられない。' },
  { id: 'q43', factor: 'N', facet: '自意識', reverse: false, text: '人にどう思われているかが気になって、緊張しやすい。' },
  { id: 'q44', factor: 'N', facet: '傷つきやすさ', reverse: false, text: 'プレッシャーがかかると、頭が真っ白になりやすい。' },
  { id: 'q45', factor: 'N', facet: '衝動性', reverse: false, text: 'イライラや欲求を、その場で抑えるのが難しいことがある。' },
  { id: 'q46', factor: 'N', facet: '不安', reverse: true, text: 'たいていのことは「なんとかなる」と楽観的に構えられる。' },
  { id: 'q47', factor: 'N', facet: '平静', reverse: true, text: '感情の浮き沈みは少なく、いつも安定している方だ。' },
  { id: 'q48', factor: 'N', facet: '自意識', reverse: true, text: '人前でもあまり緊張せず、自分らしく振る舞える。' },
  { id: 'q49', factor: 'N', facet: '傷つきやすさ', reverse: true, text: 'トラブルが起きても、落ち着いて対処できる方だ。' },
  { id: 'q50', factor: 'N', facet: '敵意', reverse: true, text: '多少のことでは腹を立てず、おだやかでいられる。' },
];

/** 設問総数（健全性チェック・表示に使う）。 */
export const QUESTION_COUNT = QUESTIONS.length;
