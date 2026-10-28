// Vocabulary-driven unlocks. Learning a word (met and answered correctly at least once)
// permanently adds matching items, spells and biomes to the pool of possible discoveries.
// It never grants them directly: what you actually find in a run is still random.
import { ITEMS } from './data/items.js';
import { SPELLS, DISCOVERABLE_SPELLS } from './data/spells.js';
import { BIOMES, ACT_BIOMES } from './data/biomes.js';
import { RUN } from './data/balance.js';
import { getWord } from '../learn/vocab.js';

export function learnedWords(save) {
  const set = new Set();
  for (const [id, r] of Object.entries(save.words || {})) if ((r.ok || 0) >= 1) set.add(id);
  return set;
}

export const isUnlocked = (requires, learned) => !requires || !requires.length || requires.some((w) => learned.has(w));

/** Human-readable hint: "learn huǒ (火, fire)". */
export function requirementHint(requires) {
  if (!requires?.length) return null;
  return requires
    .map((zh) => {
      const w = getWord(zh);
      return w ? `${w.pinyin} (${zh}, ${w.gloss})` : zh;
    })
    .join(' or ');
}

export function unlockedItems(save) {
  const learned = learnedWords(save);
  return Object.keys(ITEMS).filter((id) => isUnlocked(ITEMS[id].requires, learned));
}

export function unlockedSpells(save) {
  const learned = learnedWords(save);
  return DISCOVERABLE_SPELLS.filter((id) => isUnlocked(SPELLS[id].requires, learned));
}

export function biomeUnlocked(id, save) {
  const b = BIOMES[id];
  if (!b) return false;
  if (b.secretUnlock === 'dragonWins3') return (save.adventure.dragonWins || 0) >= RUN.dragonWinsForBeyond;
  return isUnlocked(b.unlock, learnedWords(save));
}

export function actBiomeOptions(act, save) {
  return (ACT_BIOMES[act] || []).map((id) => ({ id, unlocked: biomeUnlocked(id, save) }));
}

/** Overview for the codex: counts of unlocked content. */
export function codexSummary(save) {
  const learned = learnedWords(save);
  const items = Object.entries(ITEMS).map(([id, it]) => ({ id, ...it, unlocked: isUnlocked(it.requires, learned) }));
  const spells = DISCOVERABLE_SPELLS.map((id) => ({ id, ...SPELLS[id], unlocked: isUnlocked(SPELLS[id].requires, learned) }));
  const biomes = Object.entries(BIOMES).map(([id, b]) => ({ id, ...b, unlocked: biomeUnlocked(id, save) }));
  return { items, spells, biomes, learned: learned.size };
}

/** Learned words to show on Word Wraiths (stolen words). */
export function wraithWords(save) {
  return [...learnedWords(save)]
    .slice(0, 60)
    .map((id) => getWord(id)?.pinyin)
    .filter(Boolean);
}
