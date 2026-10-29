// Character signature puzzles. Every hero always plays the same kind of Mandarin minigame (Xinyi
// names fruit, Mei reads number words, Lei hears tones…); only the question changes. Pure logic: the UI
// lives in components/SignaturePuzzle.jsx and the combat effect in game/data/signatures.js.
//
// A template has:   pool (curated, verified vocabulary) · generate({ save, rng, last, soundless })
//                    → puzzle · check(puzzle, answer) → boolean
// A puzzle has:      { template, kind: 'choice' | 'multi' | 'blank', prompt, options, answer,
//                      words (zh of every word practised), teach (first meeting: answer shown),
//                      choice (passed to the combat effect, e.g. the fruit that was named) }
//
// Pinyin is written the standard way (syllables of one word joined) with dictionary tones.
// Hanzi is always optional and secondary: no puzzle ever needs it.
import { baseOf, toneOf, withTone } from './pinyinTools.js';

// ------------------------------------------------------------------ vocabulary pools
export const FRUITS = [
  { id: 'apple', zh: '苹果', py: 'píngguǒ', en: 'apple', emoji: '🍎' },
  { id: 'banana', zh: '香蕉', py: 'xiāngjiāo', en: 'banana', emoji: '🍌' },
  { id: 'orange', zh: '橘子', py: 'júzi', en: 'orange (tangerine)', emoji: '🍊' },
  { id: 'grape', zh: '葡萄', py: 'pútao', en: 'grape', emoji: '🍇' },
  { id: 'watermelon', zh: '西瓜', py: 'xīguā', en: 'watermelon', emoji: '🍉' },
  { id: 'strawberry', zh: '草莓', py: 'cǎoméi', en: 'strawberry', emoji: '🍓' },
  { id: 'mango', zh: '芒果', py: 'mángguǒ', en: 'mango', emoji: '🥭' },
  { id: 'pear', zh: '梨', py: 'lí', en: 'pear', emoji: '🍐' },
  { id: 'peach', zh: '桃子', py: 'táozi', en: 'peach', emoji: '🍑' },
  { id: 'lemon', zh: '柠檬', py: 'níngméng', en: 'lemon', emoji: '🍋' },
];

export const NUMBERS = [
  { id: 'n1', zh: '一', py: 'yī', en: 'one', n: 1 },
  { id: 'n2', zh: '二', py: 'èr', en: 'two', n: 2 },
  { id: 'n3', zh: '三', py: 'sān', en: 'three', n: 3 },
  { id: 'n4', zh: '四', py: 'sì', en: 'four', n: 4 },
  { id: 'n5', zh: '五', py: 'wǔ', en: 'five', n: 5 },
  { id: 'n6', zh: '六', py: 'liù', en: 'six', n: 6 },
  { id: 'n7', zh: '七', py: 'qī', en: 'seven', n: 7 },
  { id: 'n8', zh: '八', py: 'bā', en: 'eight', n: 8 },
  { id: 'n9', zh: '九', py: 'jiǔ', en: 'nine', n: 9 },
  { id: 'n10', zh: '十', py: 'shí', en: 'ten', n: 10 },
];

// Clearly positive (praise / encouragement) vs clearly negative (criticism / discouragement).
// bù cuò and méi wèntí are deliberately included: they contain a negation but are positive.
export const CHEERS = [
  { id: 'hen_hao', zh: '很好', py: 'hěn hǎo', en: 'Very good', positive: true },
  { id: 'jia_you', zh: '加油', py: 'jiā yóu', en: 'Keep going! / You can do it!', positive: true },
  { id: 'tai_bang_le', zh: '太棒了', py: 'tài bàng le', en: 'Awesome!', positive: true },
  { id: 'chu_se', zh: '出色', py: 'chūsè', en: 'Outstanding', positive: true },
  { id: 'zhen_lihai', zh: '真厉害', py: 'zhēn lìhai', en: 'Really impressive!', positive: true },
  { id: 'hao_ji_le', zh: '好极了', py: 'hǎo jí le', en: 'Excellent!', positive: true },
  { id: 'gan_de_hao', zh: '干得好', py: 'gàn de hǎo', en: 'Well done!', positive: true },
  { id: 'ni_neng_xing', zh: '你能行', py: 'nǐ néng xíng', en: 'You can do it!', positive: true },
  { id: 'bu_cuo', zh: '不错', py: 'bùcuò', en: 'Pretty good (literally “not wrong”)', positive: true },
  { id: 'mei_wenti', zh: '没问题', py: 'méi wèntí', en: 'No problem!', positive: true },
  { id: 'bu_hao', zh: '不好', py: 'bù hǎo', en: 'Not good', positive: false },
  { id: 'zao_gao', zh: '糟糕', py: 'zāogāo', en: 'Terrible / Oh no', positive: false },
  { id: 'tai_cha_le', zh: '太差了', py: 'tài chà le', en: 'Awful (far too poor)', positive: false },
  { id: 'bu_xing', zh: '不行', py: 'bù xíng', en: 'No good / That won’t do', positive: false },
  { id: 'mei_yong', zh: '没用', py: 'méi yòng', en: 'Useless', positive: false },
  { id: 'fang_qi', zh: '放弃', py: 'fàngqì', en: 'Give up', positive: false },
  { id: 'hen_nanguo', zh: '很难过', py: 'hěn nánguò', en: 'Very sad', positive: false },
  { id: 'hai_pa', zh: '害怕', py: 'hàipà', en: 'Scared', positive: false },
];

// Negation sentences. The English meaning is always shown, so exactly one choice fits:
//   bù negates the present/future, habits, wishes, adjectives, shì and huì;
//   méi negates the past (didn't / haven't) and yǒu (have).
// Sentences where méi and méiyǒu would both be correct only offer one of them.
export const NEGATIONS = [
  { id: 'wo_bu_yao', zh: '我不要。', before: 'wǒ', after: 'yào.', en: 'I don’t want it.', answer: 'bù', options: ['bù', 'méi'], why: 'Not wanting (now) → bù.' },
  { id: 'ta_bu_shi_laoshi', zh: '他不是老师。', before: 'tā', after: 'shì lǎoshī.', en: 'He isn’t a teacher.', answer: 'bù', options: ['bù', 'méi'], why: 'shì (to be) is always negated with bù.' },
  { id: 'wo_mei_you_qian', zh: '我没有钱。', before: 'wǒ', after: 'yǒu qián.', en: 'I don’t have money.', answer: 'méi', options: ['bù', 'méi'], why: 'yǒu (to have) is always negated with méi.' },
  { id: 'ta_zuotian_mei_lai', zh: '他昨天没来。', before: 'tā zuótiān', after: 'lái.', en: 'He didn’t come yesterday.', answer: 'méi', options: ['bù', 'méi'], why: 'Something that didn’t happen in the past → méi.' },
  { id: 'wo_bu_chi_rou', zh: '我不吃肉。', before: 'wǒ', after: 'chī ròu.', en: 'I don’t eat meat.', answer: 'bù', options: ['bù', 'méi'], why: 'Habits → bù.' },
  { id: 'wo_hai_mei_chi', zh: '我还没吃饭。', before: 'wǒ hái', after: 'chī fàn.', en: 'I haven’t eaten yet.', answer: 'méi', options: ['bù', 'méi'], why: '“Not yet” (hái méi) → méi.' },
  { id: 'zhege_bu_gui', zh: '这个不贵。', before: 'zhège', after: 'guì.', en: 'This isn’t expensive.', answer: 'bù', options: ['bù', 'méi'], why: 'Adjectives are negated with bù.' },
  { id: 'wo_bu_xihuan', zh: '我不喜欢咖啡。', before: 'wǒ', after: 'xǐhuan kāfēi.', en: 'I don’t like coffee.', answer: 'bù', options: ['bù', 'méi'], why: 'Likes and wishes → bù.' },
  { id: 'ta_mei_quguo', zh: '她没去过北京。', before: 'tā', after: 'qùguo Běijīng.', en: 'She has never been to Beijing.', answer: 'méi', options: ['bù', 'méi'], why: 'Experiences with guo → méi.' },
  { id: 'jintian_bu_leng', zh: '今天不冷。', before: 'jīntiān', after: 'lěng.', en: 'It isn’t cold today.', answer: 'bù', options: ['bù', 'méi'], why: 'Adjectives are negated with bù.' },
  { id: 'wo_mei_kanjian', zh: '我没看见他。', before: 'wǒ', after: 'kànjiàn tā.', en: 'I didn’t see him.', answer: 'méi', options: ['bù', 'méi'], why: 'Something that didn’t happen → méi.' },
  { id: 'zher_meiyou_ren', zh: '这儿没有人。', before: 'zhèr', after: 'rén.', en: 'There’s nobody here.', answer: 'méiyǒu', options: ['bù', 'méiyǒu'], why: '“There is no…” → méiyǒu.' },
  { id: 'wo_bu_hui_riyu', zh: '我不会说日语。', before: 'wǒ', after: 'huì shuō Rìyǔ.', en: 'I can’t speak Japanese.', answer: 'bù', options: ['bù', 'méi'], why: 'huì (can, know how to) takes bù.' },
  { id: 'wo_meiyou_shijian', zh: '我没有时间。', before: 'wǒ', after: 'shíjiān.', en: 'I don’t have time.', answer: 'méiyǒu', options: ['bù', 'méiyǒu'], why: 'Not having something → méiyǒu.' },
  { id: 'mingtian_bu_qu', zh: '我明天不去。', before: 'wǒ míngtiān', after: 'qù.', en: 'I’m not going tomorrow.', answer: 'bù', options: ['bù', 'méi'], why: 'The future → bù.' },
  { id: 'zuotian_mei_shangban', zh: '我昨天没上班。', before: 'wǒ zuótiān', after: 'shàngbān.', en: 'I didn’t go to work yesterday.', answer: 'méi', options: ['bù', 'méi'], why: 'The past → méi.' },
  { id: 'ta_bu_shi_zhongguoren', zh: '他不是中国人。', before: 'tā', after: 'shì Zhōngguó rén.', en: 'He isn’t Chinese.', answer: 'bù', options: ['bù', 'méi'], why: 'shì (to be) is always negated with bù.' },
  { id: 'wo_meiyou_gege', zh: '我没有哥哥。', before: 'wǒ', after: 'gēge.', en: 'I don’t have an older brother.', answer: 'méiyǒu', options: ['bù', 'méiyǒu'], why: 'Not having something → méiyǒu.' },
];

// Body parts. `emoji` where an emoji is unambiguous; `figure` draws a body with that part lit.
export const BODY_PARTS = [
  { id: 'hand', zh: '手', py: 'shǒu', en: 'hand', emoji: '✋' },
  { id: 'eye', zh: '眼睛', py: 'yǎnjing', en: 'eye', emoji: '👁️' },
  { id: 'mouth', zh: '嘴巴', py: 'zuǐba', en: 'mouth', emoji: '👄' },
  { id: 'foot', zh: '脚', py: 'jiǎo', en: 'foot', emoji: '🦶' },
  { id: 'head', zh: '头', py: 'tóu', en: 'head', figure: 'head' },
  { id: 'nose', zh: '鼻子', py: 'bízi', en: 'nose', emoji: '👃' },
  { id: 'ear', zh: '耳朵', py: 'ěrduo', en: 'ear', emoji: '👂' },
  { id: 'leg', zh: '腿', py: 'tuǐ', en: 'leg', emoji: '🦵' },
  { id: 'tooth', zh: '牙齿', py: 'yáchǐ', en: 'tooth', emoji: '🦷' },
  { id: 'belly', zh: '肚子', py: 'dùzi', en: 'belly', figure: 'belly' },
];

// Single syllables whose four tone variants are all real pinyin syllables; options differ only
// in tone. `tone` is the correct one (verified dictionary tone).
export const TONE_WORDS = [
  { id: 'ma3', zh: '马', py: 'mǎ', en: 'horse' },
  { id: 'ma1', zh: '妈', py: 'mā', en: 'mum' },
  { id: 'shu1', zh: '书', py: 'shū', en: 'book' },
  { id: 'huo3', zh: '火', py: 'huǒ', en: 'fire' },
  { id: 'mi3', zh: '米', py: 'mǐ', en: 'rice (uncooked)' },
  { id: 'cha2', zh: '茶', py: 'chá', en: 'tea' },
  { id: 'mao1', zh: '猫', py: 'māo', en: 'cat' },
  { id: 'yu2', zh: '鱼', py: 'yú', en: 'fish' },
  { id: 'niu2', zh: '牛', py: 'niú', en: 'cow' },
  { id: 'tang2', zh: '糖', py: 'táng', en: 'sugar, sweets' },
  { id: 'tang1', zh: '汤', py: 'tāng', en: 'soup' },
  { id: 'da4', zh: '大', py: 'dà', en: 'big' },
  { id: 'qi2', zh: '骑', py: 'qí', en: 'to ride' },
  { id: 'bi3', zh: '笔', py: 'bǐ', en: 'pen' },
  { id: 'ge1', zh: '歌', py: 'gē', en: 'song' },
  { id: 'hao3', zh: '好', py: 'hǎo', en: 'good' },
  { id: 'fan4', zh: '饭', py: 'fàn', en: 'meal, cooked rice' },
  { id: 'zhu1', zh: '猪', py: 'zhū', en: 'pig' },
  { id: 'ye4', zh: '夜', py: 'yè', en: 'night' },
  { id: 'xue3', zh: '雪', py: 'xuě', en: 'snow' },
  { id: 'bao1', zh: '包', py: 'bāo', en: 'bag' },
];
export const TONE_SHAPES = {
  1: { name: 'high and level', path: 'M4 6 L36 6' },
  2: { name: 'rising', path: 'M4 30 L36 6' },
  3: { name: 'dipping, then rising', path: 'M4 14 Q14 38 24 30 T36 10' },
  4: { name: 'falling sharply', path: 'M4 6 L36 32' },
};

// ------------------------------------------------------------------ helpers
const shuffle = (arr, rng) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Practice record of a word: signature puzzles track it under gameWords; met words also have SRS. */
function practice(save, zh) {
  const g = save?.gameWords?.[zh] || {};
  const w = save?.words?.[zh];
  return { seen: (g.seen || 0) + (w?.seen || 0), ok: (g.ok || 0) + (w?.ok || 0), bad: (g.bad || 0) + (w?.bad || 0), met: Boolean(g.seen || w) };
}

/**
 * Picks the next target, weighting weaker and newer words higher (the spaced-repetition idea:
 * shaky words come back sooner), never repeating the previous one, and introducing at most one
 * brand-new word at a time (it's taught on the spot instead of tested).
 */
export function pickTarget(pool, save, rng, last = null) {
  const list = pool.length > 1 ? pool.filter((x) => x.id !== last) : pool;
  const known = list.filter((x) => practice(save, x.zh).met);
  // until a few words are familiar, keep the set small so the first meetings stick
  const fresh = list.filter((x) => !practice(save, x.zh).met);
  const allowNew = known.length < 4 || rng() < 0.25;
  const cands = allowNew || !known.length ? list : known;
  const w = (x) => {
    const p = practice(save, x.zh);
    if (!p.met) return fresh.length ? 2.2 : 1;
    const acc = (p.ok + 1) / (p.seen + 2);
    return 0.6 + (1 - acc) * 3 + (p.seen < 3 ? 0.8 : 0);
  };
  const total = cands.reduce((s, x) => s + w(x), 0);
  let roll = rng() * total;
  for (const x of cands) {
    roll -= w(x);
    if (roll <= 0) return x;
  }
  return cands[cands.length - 1];
}
const isNew = (save, zh) => !practice(save, zh).met;

/** Four tone variants of a single syllable (all differ only in the tone mark). */
export function toneOptions(py) {
  const base = baseOf(py);
  return [1, 2, 3, 4].map((t) => withTone(base, t));
}

// ------------------------------------------------------------------ templates
export const TEMPLATES = {
  fruit: {
    name: 'Which fruit is this?',
    focus: 'Fruits',
    pool: FRUITS,
    generate({ save, rng, last }) {
      const t = pickTarget(FRUITS, save, rng, last);
      const others = shuffle(FRUITS.filter((f) => f.id !== t.id), rng).slice(0, 3);
      return {
        template: 'fruit', kind: 'choice', target: t.id, choice: t.id, words: [t.zh], teach: isNew(save, t.zh),
        prompt: { emoji: t.emoji, q: 'Which fruit is this?' },
        options: shuffle([t, ...others], rng).map((f) => ({ id: f.id, py: f.py, zh: f.zh, en: f.en })),
        answer: t.id, reveal: `${t.py} · ${t.en}`,
      };
    },
  },
  number: {
    name: 'Read the number',
    focus: 'Numbers 1–10',
    pool: NUMBERS,
    generate({ save, rng, last }) {
      const t = pickTarget(NUMBERS, save, rng, last);
      return {
        template: 'number', kind: 'choice', target: t.id, choice: t.n, words: [t.zh], teach: isNew(save, t.zh),
        // the pinyin is the clue: recognising it is the skill. The digits stay in order 1–10 so
        // finding the one you mean is instant once you know it.
        prompt: { word: t.py, q: 'Which number is this?' },
        options: NUMBERS.map((n) => ({ id: n.id, py: String(n.n), zh: n.zh, en: n.py })),
        answer: t.id, reveal: `${t.py} = ${t.n}`,
      };
    },
  },
  cheer: {
    name: 'Pick every encouraging phrase',
    focus: 'Encouraging vs negative expressions',
    pool: CHEERS,
    generate({ save, rng, last }) {
      const pos = CHEERS.filter((c) => c.positive);
      const neg = CHEERS.filter((c) => !c.positive);
      const nPos = 2 + Math.floor(rng() * 3); // 2–4 right answers out of 6
      // lead with the weakest phrase so practice goes where it's needed
      const lead = pickTarget(CHEERS, save, rng, last);
      const pickFrom = (list, n) => {
        const out = list.includes(lead) ? [lead] : [];
        for (const c of shuffle(list.filter((x) => x !== lead), rng)) if (out.length < n) out.push(c);
        return out;
      };
      const chosen = [...pickFrom(pos, nPos), ...pickFrom(neg, 6 - nPos)];
      const opts = shuffle(chosen, rng);
      return {
        template: 'cheer', kind: 'multi', target: lead.id, words: opts.map((c) => c.zh),
        // unfamiliar phrases show their meaning (they are being taught, not tested)
        teach: opts.some((c) => isNew(save, c.zh)),
        prompt: { q: 'Hype Huojin up! Select every encouraging phrase.' },
        options: opts.map((c) => ({ id: c.id, py: c.py, zh: c.zh, en: c.en, positive: c.positive, fresh: isNew(save, c.zh) })),
        answer: opts.filter((c) => c.positive).map((c) => c.id).sort(),
        reveal: opts.filter((c) => c.positive).map((c) => c.py).join(' · '),
      };
    },
  },
  negation: {
    name: 'Complete the sentence',
    focus: 'Negation: bù, méi, méiyǒu',
    pool: NEGATIONS,
    generate({ save, rng, last }) {
      const t = pickTarget(NEGATIONS, save, rng, last);
      return {
        template: 'negation', kind: 'blank', target: t.id, words: [t.zh], teach: isNew(save, t.zh),
        prompt: { before: t.before, after: t.after, en: t.en, zh: t.zh, q: 'Which negation fits?' },
        options: shuffle(t.options, rng).map((o) => ({ id: o, py: o })),
        answer: t.answer, reveal: `${t.before} ${t.answer} ${t.after}`, why: t.why,
      };
    },
  },
  body: {
    name: 'Name the body part',
    focus: 'Body parts',
    pool: BODY_PARTS,
    generate({ save, rng, last }) {
      const t = pickTarget(BODY_PARTS, save, rng, last);
      // never offer two parts that look alike side by side (leg/foot, mouth/tooth)
      const lookalike = { leg: 'foot', foot: 'leg', mouth: 'tooth', tooth: 'mouth', head: 'belly', belly: 'head' };
      const others = shuffle(BODY_PARTS.filter((p) => p.id !== t.id && p.id !== lookalike[t.id]), rng).slice(0, 3);
      return {
        template: 'body', kind: 'choice', target: t.id, words: [t.zh], teach: isNew(save, t.zh),
        prompt: { emoji: t.emoji, figure: t.figure, q: 'Which body part is this?' },
        options: shuffle([t, ...others], rng).map((p) => ({ id: p.id, py: p.py, zh: p.zh, en: p.en })),
        answer: t.id, reveal: `${t.py} · ${t.en}`,
      };
    },
  },
  tone: {
    name: 'Which tone?',
    focus: 'Mandarin tones',
    pool: TONE_WORDS,
    generate({ save, rng, last, soundless }) {
      const t = pickTarget(TONE_WORDS, save, rng, last);
      return {
        template: 'tone', kind: 'choice', target: t.id, words: [t.zh], teach: isNew(save, t.zh),
        prompt: { en: t.en, zh: t.zh, tone: toneOf(t.py), audio: !soundless, q: 'Which spelling has the right tone?' },
        options: toneOptions(t.py).map((p) => ({ id: p, py: p })),
        answer: t.py, reveal: `${t.py} · tone ${toneOf(t.py)} (${TONE_SHAPES[toneOf(t.py)].name}) · ${t.en}`,
      };
    },
  },
};

export function generateSigPuzzle(template, { save, rng = Math.random, last = null, soundless = false } = {}) {
  const T = TEMPLATES[template];
  if (!T) throw new Error(`unknown signature puzzle ${template}`);
  return T.generate({ save, rng, last, soundless });
}

/** answer: an option id ('choice' / 'blank') or a list of ids ('multi'). */
export function checkSigAnswer(puzzle, answer) {
  if (puzzle.kind === 'multi') {
    const a = [...new Set(answer || [])].sort();
    return a.length === puzzle.answer.length && a.every((x, i) => x === puzzle.answer[i]);
  }
  return answer === puzzle.answer;
}
