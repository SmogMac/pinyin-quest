// The one place that starts, abandons and finishes adventure runs.
//
// Only `save.adventure.current` (the run: hero build, passive items, route, encounter,
// in-battle state) is ever replaced or cleared here. Everything permanent lives elsewhere in the
// save and is never touched: vocabulary and spaced-repetition data (words, gameWords), profile and
// XP, heroes unlocked, achievements, story beats seen, dragon/Word Eater victories, discovered items,
// synergies found, and lifetime statistics (which only ever grow).
import { RUN } from './data/balance.js';
import { RUN_VERSION, newRun, scoreOf } from './run.js';

/** An unfinished run the player can continue (runs from an older version don't count). */
export function activeRun(save) {
  const r = save.adventure.current;
  return r && r.v === RUN_VERSION ? r : null;
}

/** Lifetime statistics from a run that is ending (finished or abandoned). */
function recordRun(save, run, { won = false, abandoned = false } = {}) {
  const a = save.adventure;
  a.runs += 1;
  if (won) a.wins += 1;
  if (abandoned) a.abandoned = (a.abandoned || 0) + 1;
  a.bestFloor = Math.max(a.bestFloor, run.floor || 0);
  if (!abandoned) a.bestScore = Math.max(a.bestScore, scoreOf(run));
}

/**
 * Starts a fresh run for `heroId`, abandoning any run in progress (callers confirm first).
 * The new run always begins from the hero's base build: their signature move, no items, no route,
 * no battle.
 */
export function startRun(save, { heroId, accountLevel, seed } = {}) {
  abandonRun(save);
  save.adventure.current = newRun({
    heroId,
    accountLevel,
    seed,
    beyondUnlocked: (save.adventure.dragonWins || 0) >= RUN.dragonWinsForBeyond,
  });
  return save.adventure.current;
}

/** Ends the current run without a result. Safe to call with no run, mid-battle or on the map. */
export function abandonRun(save) {
  const r = save.adventure.current;
  if (!r) return false;
  if (r.v === RUN_VERSION) recordRun(save, r, { abandoned: true });
  save.adventure.current = null;
  return true;
}

/** Ends the current run with a result (victory screens, defeat). */
export function finishRun(save, won) {
  const r = save.adventure.current;
  if (!r) return;
  recordRun(save, r, { won });
  save.adventure.current = null;
}
