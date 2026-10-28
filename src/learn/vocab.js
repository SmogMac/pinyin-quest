// Merges the generated frequency data with the hand-authored enrichment files.
import raw from '../data/vocab.json';
import themes from '../data/wordThemes.json';
import examples from '../data/examples.json';
import { POS_ELEMENT } from '../game/data/elements.js';

const themeOf = {};
for (const [element, list] of Object.entries(themes)) {
  if (element.startsWith('_')) continue;
  for (const hanzi of list) themeOf[hanzi] = element;
}

export const VOCAB = raw.map((w) => {
  const ex = examples[w.id];
  return {
    ...w,
    element: themeOf[w.id] || POS_ELEMENT[w.pos] || null,
    themed: Boolean(themeOf[w.id]),
    example: ex ? { zh: ex[0], py: ex[1], en: ex[2] } : null,
  };
});

export const BY_ID = new Map(VOCAB.map((w) => [w.id, w]));
export const getWord = (id) => BY_ID.get(id);

const TONE_STRIP = /[̀-ͯ]/g;
/** "nǐ hǎo" -> "ni hao" (ü kept as u for comparison) */
export const toneless = (pinyin) => pinyin.normalize('NFD').replace(TONE_STRIP, '').replace(/ü/g, 'u').toLowerCase();

/** Lower-cased meaning fragments used to detect synonyms between words. */
export function meaningKeys(word) {
  const keys = new Set();
  for (const m of [word.gloss, ...word.meanings]) {
    for (const part of m.toLowerCase().split(/[;,/]/)) {
      const k = part.replace(/\(.*?\)/g, '').replace(/^\s*(to|a|an|the)\s+/, '').trim();
      if (k.length > 1) keys.add(k);
    }
  }
  return keys;
}
