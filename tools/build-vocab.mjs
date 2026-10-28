// Build src/data/vocab.json from the open-source "complete-hsk-vocabulary" dataset
// (https://github.com/drkameleon/complete-hsk-vocabulary, MIT licence).
//
// Usage:  npm run vocab            (downloads the source if missing, then builds)
//
// Selection: every word listed in new HSK 1-3 or old HSK 1-3, ordered by the dataset's
// corpus frequency rank. Nothing is invented: entries without usable meanings are dropped.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC_URL = 'https://cdn.jsdelivr.net/gh/drkameleon/complete-hsk-vocabulary@main/complete.min.json';
const SRC = path.join(here, 'source', 'complete.min.json');
const OUT = path.join(here, '..', 'src', 'data', 'vocab.json');
const LEVELS = new Set(['n1', 'n2', 'n3', 'o1', 'o2', 'o3']);

if (!fs.existsSync(SRC)) {
  console.log('Downloading source dataset…');
  const res = await fetch(SRC_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  fs.mkdirSync(path.dirname(SRC), { recursive: true });
  fs.writeFileSync(SRC, await res.text());
}
const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));

// ICTCLAS-style POS tags used by the dataset -> our categories
const POS_CATEGORY = {
  n: 'noun', nr: 'name', ns: 'place', nt: 'noun', nz: 'noun', s: 'place', f: 'place',
  t: 'time', v: 'verb', vd: 'verb', vn: 'verb', a: 'adjective', ad: 'adjective', an: 'adjective',
  d: 'adverb', p: 'preposition', c: 'conjunction', u: 'particle', y: 'particle', e: 'interjection',
  o: 'interjection', r: 'pronoun', m: 'number', q: 'measure word', mq: 'measure word', i: 'idiom', l: 'phrase',
};

// Hand corrections where the dataset's first-listed reading/meaning is not the everyday one.
// These only choose among readings/meanings the dataset already contains.
const PRIMARY_READING = { 着: 'zhe', 啊: 'a', 了: 'le', 地: 'de', 得: 'de', 的: 'de', 长: 'cháng', 还: 'hái', 都: 'dōu', 行: 'xíng', 觉: 'jué', 乐: 'lè', 重: 'zhòng', 少: 'shǎo', 好: 'hǎo', 为: 'wèi', 只: 'zhǐ', 便宜: 'pián yi', 差: 'chà', 教: 'jiāo', 数: 'shù', 空: 'kòng', 正: 'zhèng', 种: 'zhǒng', 发: 'fā', 干: 'gàn', 场: 'chǎng', 更: 'gèng', 没: 'méi', 要: 'yào', 吗: 'ma', 呢: 'ne', 吧: 'ba', 一会儿: 'yī huì r', 哪儿: 'nǎ r', 那儿: 'nà r', 这儿: 'zhè r' };
// Everyday sense to show first. If the keyword matches an existing meaning that meaning is moved
// to the front; otherwise the text is used as the gloss (these are standard dictionary senses).
const MEANING_FIRST = {
  云: 'cloud', 热: 'hot', 雨: 'rain', 很: 'very', 个: 'general measure word', 着: 'ongoing-action particle',
  了: 'completed-action particle', 吧: 'suggestion particle', 吗: 'question particle', 呢: 'follow-up question particle',
  的: "possessive particle (~'s)", 地: 'adverb-forming particle', 得: 'complement particle', 被: 'by (passive marker)',
  在: 'at; in; to be at', 年: 'year', 等: 'to wait', 次: 'time (occurrence)', 才: 'only then; just', 跟: 'with; to follow',
  里: 'inside', 话: 'speech; words', 和平: 'peace', 夏: 'summer', 啊: 'ah (sentence particle)', 谁: 'who',
  点: "o'clock; point; a bit", 过: 'to pass; (experienced) particle', 当: 'when; to act as', 下: 'down; below; next',
  上: 'up; above; previous', 中: 'middle; in', 事: 'matter; thing', 后: 'after; behind', 前: 'before; front',
  老: 'old', 场: 'measure word for events', 些: 'some', 第: 'ordinal prefix (-th)', 起来: 'to get up; (start of action)',
  会: 'can; will; meeting', 告诉: 'to tell', 干: 'to do', 刚: 'just (now)', 先生: 'mister; husband', 别: "don't; other",
  所: 'place; (relative particle)', 周: 'week', 一直: 'always; straight on', 当然: 'of course', 正在: 'in the middle of (doing)',
  管: 'to manage; to care about', 带: 'to bring; to carry', 种: 'kind; type', 本: 'measure word for books; origin', 让: 'to let; to allow', 比: 'than; to compare', 把: 'object marker; to hold',
};

const BAD_MEANING = /^(variant of|old variant|surname|see |CL:|abbr\. for|used in |\(old\)|archaic|Japanese variant|erhua variant)/i;

const DEMOTE = /(old|classical|literary|dialect|District|County|dynasty|Province|surname|Buddhism|Taiwan pr)|\(Tw\)/i;

function cleanMeaning(m) {
  return m
    .replace(/,?\s*also pr\..*$/, '')
    .replace(/\s*\[[^\]]*\]/g, '') // strip embedded pinyin like [ni3]
    .replace(/\|[^\s,;)]+/g, '') // 這|这 -> 這
    .replace(/\s+/g, ' ')
    .trim();
}

// Short gloss for quiz options: first meaning, trimmed to something readable.
function makeGloss(meanings) {
  let g = meanings[0];
  const stripped = g.replace(/\([^)]*\)/g, '').replace(/\s+/g, ' ').replace(/^[;,\s]+|[;,\s]+$/g, '');
  if (stripped.length >= 2) g = stripped;
  if (g.length > 34) {
    const cut = g.split(/[;,]/)[0].trim();
    g = cut.length >= 3 ? cut : g.slice(0, 34) + '…';
  }
  if (meanings.length > 1 && g.length < 12 && meanings[1].length < 14 && !meanings[1].includes(g)) {
    g = `${g}, ${meanings[1]}`;
  }
  return g;
}

const picked = raw.filter((w) => w.l?.some((l) => LEVELS.has(l)));
picked.sort((a, b) => (a.q ?? 1e9) - (b.q ?? 1e9));

const seen = new Set();
const out = [];
for (const w of picked) {
  if (seen.has(w.s)) continue;
  const forms = (w.f || [])
    .map((f) => ({
      pinyin: f.i?.y?.trim(),
      meanings: (f.m || []).map(cleanMeaning).filter((m) => m && !BAD_MEANING.test(m)),
    }))
    .filter((f) => f.pinyin && f.meanings.length);
  for (const f of forms) f.meanings.sort((a, b) => DEMOTE.test(a) - DEMOTE.test(b));
  if (!forms.length) continue;
  // Primary reading: the form with the most meanings (first wins ties)
  const forced = PRIMARY_READING[w.s] && forms.find((f) => f.pinyin === PRIMARY_READING[w.s]);
  const primary = forced || forms.reduce((best, f) => (f.meanings.length > best.meanings.length ? f : best), forms[0]);
  if (MEANING_FIRST[w.s]) {
    const want = MEANING_FIRST[w.s];
    const key = want.split(/[ ;(]/)[0].toLowerCase();
    const hit = primary.meanings.findIndex((m) => m.toLowerCase().split(/[^a-z']+/).includes(key));
    if (hit > 0) primary.meanings.unshift(...primary.meanings.splice(hit, 1));
    if (hit < 0) primary.meanings.unshift(want);
  }
  const pos = (w.p || [])[0] || '';
  const levels = w.l.filter((l) => LEVELS.has(l));
  const hsk = Math.min(...levels.map((l) => +l.slice(1)));
  seen.add(w.s);
  out.push({
    id: w.s,
    hanzi: w.s,
    pinyin: primary.pinyin.replace(/\s+/g, ' '),
    meanings: primary.meanings.slice(0, 6),
    gloss: MEANING_FIRST[w.s] || makeGloss(primary.meanings),
    other: forms.filter((f) => f !== primary).map((f) => ({ pinyin: f.pinyin, meanings: f.meanings.slice(0, 3) })),
    pos: POS_CATEGORY[pos] || 'other',
    hsk,
    freq: w.q ?? null,
  });
}
out.forEach((w, i) => (w.rank = i + 1));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const byPos = out.reduce((a, w) => ((a[w.pos] = (a[w.pos] || 0) + 1), a), {});
console.log(`Wrote ${out.length} words to ${path.relative(process.cwd(), OUT)}`);
console.log(byPos);
