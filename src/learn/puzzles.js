// Spellcasting puzzles. Short Mandarin challenges solved while combat keeps running.
// Only uses words the learner has already met (or the spell's own name / shape words, which are
// taught first), so powerful spells are harder through longer words and closer distractors —
// never through unknown vocabulary.
//
// Types: syllables (connect pinyin syllables) · meaning (pinyin -> English) · recall (English -> pinyin)
//        picture (pinyin -> picture) · shape (draw it) · listen (audio -> English) · tone (audio -> tones)
//        phrase (arrange a sentence)
// Soundless Mode removes audio types from the rotation (never counted as failures).
import { VOCAB, getWord } from './vocab.js';
import { makeQuestion, shuffle } from './questions.js';
import { splitSyllables, toneVariants, syllableDistractors } from './pinyinTools.js';
import { SHAPE_WORDS } from './shapes.js';
import { isDue, masteryOf, SKILLS } from './srs.js';
import pictures from '../data/pictures.json';
import { SPELLS } from '../game/data/spells.js';

export const PUZZLE_TYPES = {
  syllables: { name: 'Connect the syllables', audio: false, mode: 'reverse' },
  meaning: { name: 'What does it mean?', audio: false, mode: 'mc' },
  recall: { name: 'Which word is it?', audio: false, mode: 'reverse' },
  picture: { name: 'Pick the picture', audio: false, mode: 'mc' },
  shape: { name: 'Draw the shape', audio: false, mode: null },
  listen: { name: 'Listen', audio: true, mode: 'listen' },
  tone: { name: 'Which tones?', audio: true, mode: 'listen' },
  phrase: { name: 'Build the sentence', audio: false, mode: 'reverse' },
};

const PICTURE_WORDS = Object.keys(pictures).filter((k) => !k.startsWith('_') && getWord(k));
const ALL_SYLLABLES = [...new Set(VOCAB.slice(0, 600).flatMap((w) => splitSyllables(w.pinyin)))];

function weightedPick(rng, list, w) {
  const total = list.reduce((s, x) => s + w(x), 0);
  let roll = rng() * total;
  for (const x of list) {
    roll -= w(x);
    if (roll <= 0) return x;
  }
  return list[list.length - 1];
}

/** Words the learner can be asked about: met and answered correctly at least once. */
function knownWords(save) {
  return Object.entries(save.words)
    .filter(([, r]) => (r.ok || 0) >= 1)
    .map(([id, r]) => ({ w: getWord(id), r }))
    .filter((x) => x.w);
}

function chooseWord(save, spell, rng, filter = () => true) {
  const now = Date.now();
  const list = knownWords(save).filter(({ w }) => filter(w));
  if (!list.length) return null;
  return weightedPick(rng, list, ({ w, r }) => {
    let x = 1;
    if (w.element && w.element === spell.element) x *= 3; // fire spells tend to ask fire words
    if (SKILLS.some((k) => isDue(r.skills[k], now))) x *= 2.5;
    if (masteryOf(r) <= 1) x *= 1.5;
    return x;
  }).w;
}

function phraseTokens(example) {
  return example.py
    .replace(/[.,!?，。！？]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.toLowerCase());
}

export function availableTypes(save, spell, soundless) {
  const known = knownWords(save);
  const tier = spell.tier || 1;
  const maxTokens = tier === 1 ? 4 : tier === 2 ? 5 : 7;
  return {
    syllables: splitSyllables(spell.py).length >= 2 || known.some(({ w }) => splitSyllables(w.pinyin).length >= 2),
    meaning: known.length >= 1,
    recall: known.length >= 1,
    picture: known.some(({ w }) => PICTURE_WORDS.includes(w.id)),
    shape: true,
    listen: !soundless && known.length >= 1,
    tone: !soundless && known.length >= 1,
    phrase: known.some(({ w }) => w.example && phraseTokens(w.example).length <= maxTokens && phraseTokens(w.example).length >= 2),
  };
}

/**
 * Builds a puzzle for casting `spellId`. `last` avoids repeating the previous type.
 * Returns { type, spellId, …type-specific data, source: {kind:'vocab'|'game', id} }.
 */
export function generatePuzzle({ spellId, save, soundless = false, rng = Math.random, last = null }) {
  const spell = SPELLS[spellId];
  const tier = spell.tier || 1;
  const avail = availableTypes(save, spell, soundless);
  let types = Object.keys(PUZZLE_TYPES).filter((t) => avail[t]);
  if (types.length > 1) types = types.filter((t) => t !== last);
  const pref = spell.puzzles || [];
  const type = weightedPick(rng, types, (t) => (pref.includes(t) ? 4 - pref.indexOf(t) * 0.5 : 1));
  const build = BUILDERS[type];
  return build({ spell, spellId, save, rng, tier }) || BUILDERS.shape({ spell, spellId, save, rng, tier });
}

const BUILDERS = {
  syllables({ spell, spellId, save, rng, tier }) {
    const gw = save.gameWords?.[spell.zh];
    const nameSyl = splitSyllables(spell.py);
    // Use the spell's own name while it's still being learned (or for brand new learners)
    const useName = nameSyl.length >= 2 && (!gw || (gw.ok || 0) < 3 || rng() < 0.3);
    let target;
    let source;
    let prompt;
    if (useName) {
      target = nameSyl;
      source = { kind: 'game', id: spell.zh, py: spell.py, en: spell.en };
      prompt = { en: spell.en, sub: 'Say the spell’s name' };
    } else {
      const w = chooseWord(save, spell, rng, (x) => splitSyllables(x.pinyin).length >= 2 && splitSyllables(x.pinyin).length <= tier + 2);
      if (!w) return null;
      target = splitSyllables(w.pinyin);
      source = { kind: 'vocab', id: w.id };
      prompt = { en: w.gloss, sub: 'Connect the syllables in order' };
    }
    const extra = 2 + tier;
    const options = shuffle([...target, ...syllableDistractors(target, ALL_SYLLABLES, extra, rng)], rng).map((text, i) => ({ i, text }));
    return { type: 'syllables', spellId, prompt, target, options, source };
  },
  meaning({ spell, spellId, save, rng }) {
    const w = chooseWord(save, spell, rng);
    if (!w) return null;
    return { type: 'meaning', spellId, q: makeQuestion(w.id, 'mc', save, rng), source: { kind: 'vocab', id: w.id } };
  },
  recall({ spell, spellId, save, rng }) {
    const w = chooseWord(save, spell, rng);
    if (!w) return null;
    return { type: 'recall', spellId, q: makeQuestion(w.id, 'reverse', save, rng), source: { kind: 'vocab', id: w.id } };
  },
  listen({ spell, spellId, save, rng }) {
    const w = chooseWord(save, spell, rng);
    if (!w) return null;
    return { type: 'listen', spellId, q: makeQuestion(w.id, 'listen', save, rng), source: { kind: 'vocab', id: w.id } };
  },
  picture({ spell, spellId, save, rng }) {
    const w = chooseWord(save, spell, rng, (x) => PICTURE_WORDS.includes(x.id));
    if (!w) return null;
    const pic = pictures[w.id];
    const others = shuffle(PICTURE_WORDS.filter((k) => k !== w.id && pictures[k] !== pic), rng).slice(0, 3);
    const options = shuffle([w.id, ...others], rng).map((id) => ({ id, pic: pictures[id], correct: id === w.id }));
    return { type: 'picture', spellId, word: w, options, source: { kind: 'vocab', id: w.id } };
  },
  tone({ spell, spellId, save, rng }) {
    const w = chooseWord(save, spell, rng);
    if (!w) return null;
    const correct = splitSyllables(w.pinyin).join(' ');
    const options = shuffle([correct, ...toneVariants(w.pinyin, 3, rng)], rng).map((text) => ({ text, correct: text === correct }));
    return { type: 'tone', spellId, word: w, options, source: { kind: 'vocab', id: w.id } };
  },
  shape({ spellId, save, rng }) {
    const shape = SHAPE_WORDS[Math.floor(rng() * SHAPE_WORDS.length)];
    const gw = save.gameWords?.[shape.zh];
    return { type: 'shape', spellId, shape, showHint: !gw || (gw.ok || 0) < 2, source: { kind: 'game', id: shape.zh, py: shape.py, en: shape.en } };
  },
  phrase({ spell, spellId, save, rng, tier }) {
    const maxTokens = tier === 1 ? 4 : tier === 2 ? 5 : 7;
    const w = chooseWord(save, spell, rng, (x) => x.example && phraseTokens(x.example).length <= maxTokens && phraseTokens(x.example).length >= 2);
    if (!w) return null;
    const tokens = phraseTokens(w.example);
    let order = shuffle(tokens.map((text, i) => ({ i, text })), rng);
    if (order.every((t, i) => t.i === i)) order = order.reverse();
    return { type: 'phrase', spellId, word: w, example: w.example, answer: tokens, tokens: order, source: { kind: 'vocab', id: w.id } };
  },
};

