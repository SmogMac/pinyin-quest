// Builds multiple-choice style questions with plausible, non-ambiguous distractors.
import { VOCAB, getWord, toneless, meaningKeys } from './vocab.js';

const keyCache = new Map();
const keysOf = (w) => {
  if (!keyCache.has(w.id)) keyCache.set(w.id, meaningKeys(w));
  return keyCache.get(w.id);
};

const COMMON = VOCAB.filter((w) => w.rank <= 1600);
const byPos = new Map();
for (const w of COMMON) {
  if (!byPos.has(w.pos)) byPos.set(w.pos, []);
  byPos.get(w.pos).push(w);
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** True if two words could both be "right" for a question of this mode. */
function conflicts(target, other, mode) {
  if (other.id === target.id) return true;
  if (other.gloss.toLowerCase() === target.gloss.toLowerCase()) return true;
  const a = keysOf(target);
  for (const k of keysOf(other)) if (a.has(k)) return true;
  // For audio or pinyin answers, near-homophones would be unfair / ambiguous
  if ((mode === 'listen' || mode === 'reverse') && toneless(other.pinyin) === toneless(target.pinyin)) return true;
  if (mode === 'reverse' && other.pinyin === target.pinyin) return true;
  // Avoid two options that share a hanzi in compound words for reverse (e.g. 看 vs 看见)
  return false;
}

/**
 * Prefer distractors the learner has already met (same part of speech), then common words
 * of the same type close in frequency, then anything common.
 */
export function pickDistractors(target, mode, save, n = 3, rng = Math.random) {
  const chosen = [];
  const ok = (w) => !conflicts(target, w, mode) && !chosen.some((c) => conflicts(c, w, mode) || c.id === w.id);
  const learned = shuffle(
    Object.keys(save.words)
      .map(getWord)
      .filter((w) => w && w.pos === target.pos),
    rng,
  );
  for (const w of learned) if (chosen.length < n && ok(w)) chosen.push(w);
  const samePos = shuffle(
    (byPos.get(target.pos) || []).filter((w) => Math.abs(w.rank - target.rank) < 500),
    rng,
  );
  for (const w of samePos) if (chosen.length < n && ok(w)) chosen.push(w);
  for (const w of shuffle(COMMON, rng)) if (chosen.length < n && ok(w)) chosen.push(w);
  return chosen;
}

/** mode: 'mc' | 'listen' | 'reverse' */
export function makeQuestion(id, mode, save, rng = Math.random) {
  const word = getWord(id);
  const distractors = pickDistractors(word, mode, save, 3, rng);
  const options = shuffle([word, ...distractors], rng).map((w) => ({
    id: w.id,
    label: mode === 'reverse' ? w.pinyin : w.gloss,
    sub: mode === 'reverse' ? w.hanzi : null,
    correct: w.id === word.id,
  }));
  return { id, mode, word, options };
}
