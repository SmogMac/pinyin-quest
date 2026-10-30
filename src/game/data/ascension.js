// Ascension: per-hero difficulty levels 0–10. Each hero unlocks their own levels: defeating the Ink
// Dragon on a hero's highest unlocked level opens the next one for that hero. A run's level is fixed
// when it starts. Higher levels make enemies tougher and the hero's Mandarin puzzle harder (bigger
// vocabulary, closer distractors; see learn/signaturePuzzles.js), never a different kind of puzzle.
import { ASCENSION_PUZZLE_TEXT, puzzleTier } from '../../learn/signaturePuzzles.js';
import { heroDef } from './heroes.js';
import { SIGNATURES } from './signatures.js';

export const ASCENSION = {
  max: 10,
  // enemy HP multiplier per level, cumulative (A10 = +100%); change here to retune every level
  enemyHpPerLevel: 0.1,
};

export const ascensionHpMult = (level = 0) => 1 + ASCENSION.enemyHpPerLevel * Math.max(0, Math.min(ASCENSION.max, level));

/** The highest level a hero has unlocked (0 when they have never beaten the dragon). */
export const highestAscension = (save, heroId) => Math.max(0, Math.min(ASCENSION.max, save?.adventure?.ascension?.[heroId] || 0));

/** A level the player may start at: clamped to what this hero has unlocked. */
export const allowedAscension = (save, heroId, level) => Math.max(0, Math.min(highestAscension(save, heroId), level | 0));

/**
 * A dragon win on the hero's highest unlocked level opens the next level. Returns the newly unlocked
 * level, or null.
 */
export function recordAscensionWin(save, heroId, level) {
  const a = save.adventure;
  a.ascension ||= {};
  const hi = highestAscension(save, heroId);
  if ((level || 0) < hi || hi >= ASCENSION.max) return null;
  a.ascension[heroId] = hi + 1;
  return hi + 1;
}

/** One line on what a level changes for a hero (the picker shows it). */
export function ascensionSummary(heroId, level) {
  const tpl = SIGNATURES[heroDef(heroId).signature]?.template;
  const puzzle = ASCENSION_PUZZLE_TEXT[tpl]?.[puzzleTier(level)] || '';
  const hp = Math.round((ascensionHpMult(level) - 1) * 100);
  return { hp, puzzle };
}
