// Simulated player for balance tests and sweeps: walks a whole journey (areas, encounters, battles).
import {
  newRun, enterArea, arrive, finishEncounter, resolveBattle, afterReward, takeItem, takeBlessing, buy, finishSpring,
  nextArea, enterBeyond, heroFor, gainInk,
} from '../src/game/run.js';
import { simulateBattle, makeRng } from '../src/game/combat.js';
import { ITEMS } from '../src/game/data/items.js';
import { ACT_BIOMES } from '../src/game/data/biomes.js';
import { STRANGERS, STRANGER_CONSOLATION } from '../src/game/data/encounters.js';

const itemPool = Object.keys(ITEMS);

/**
 * Plays a full run. castSuccess: how often the simulated player solves signature puzzles;
 * quizSuccess: strangers' questions; takeChance: how often an offered item is taken.
 */
export function playRun(seed, { heroId = 'xinyi', castSuccess = 0.85, quizSuccess = 0.8, accountLevel = 4, beyond = false, takeChance = 0.9, log = null, ascension = 0 } = {}) {
  const r = makeRng(seed);
  const run = newRun({ seed, accountLevel, heroId, beyondUnlocked: beyond, ascension });
  const durations = { battle: [], elite: [], guardian: [], boss: [], secretboss: [] };
  const counts = {};
  for (let guard = 0; guard < 600; guard++) {
    const p = run.phase;
    log?.(p, run);
    if (p === 'areaIntro') enterArea(run, { unlocked: ACT_BIOMES[run.act] || ACT_BIOMES[1] });
    else if (p === 'explore') {
      const t = arrive(run, { itemPool, accountLevel });
      counts[t] = (counts[t] || 0) + 1;
    } else if (p === 'battle') {
      const hero = heroFor(run, accountLevel);
      const sim = simulateBattle({
        hero, heroHp: run.hp, enemies: run.battle.enemies, biome: run.battle.biome, floor: run.floor, seed: run.battle.seed,
        runState: run.runState, autoCast: { delay: 3, success: castSuccess }, ascension: run.ascension || 0,
      });
      durations[run.battle.type]?.push(sim.duration);
      sim.runState = { phoenixUsed: sim.battle.runState.phoenixUsed, blessPhoenixUsed: sim.battle.runState.blessPhoenixUsed };
      resolveBattle(run, sim, accountLevel, { itemPool });
    } else if (p === 'reward') {
      if (run.offer?.id && r() < takeChance) takeItem(run, run.offer.id, accountLevel);
      afterReward(run);
    } else if (p === 'chest') {
      if (run.offer?.id && r() < takeChance) takeItem(run, run.offer.id, accountLevel);
      finishEncounter(run);
    } else if (p === 'merchant') {
      // buy whatever is affordable, cheapest first
      const order = run.shop.stock.map((s, i) => [s, i]).filter(([s]) => s.kind === 'item').sort((a, b) => a[0].price - b[0].price);
      for (const [, i] of order) {
        const got = buy(run, i, accountLevel);
        if (got && got !== 'heal') takeItem(run, got, accountLevel);
      }
      finishEncounter(run);
    } else if (p === 'stranger') {
      const st = STRANGERS.find((x) => x.id === run.stranger.id);
      if (r() < quizSuccess) {
        if (st.reward.kind === 'ink') gainInk(run, st.reward.amount);
        else if (run.stranger.item) takeItem(run, run.stranger.item, accountLevel);
      } else gainInk(run, STRANGER_CONSOLATION.amount);
      finishEncounter(run);
    } else if (p === 'spring') finishSpring(run, accountLevel);
    else if (p === 'shrine') {
      if (run.offer?.id) takeBlessing(run, run.offer.id, accountLevel);
      finishEncounter(run);
    } else if (p === 'areaClear') nextArea(run);
    else if (p === 'victory') {
      if (beyond) enterBeyond(run);
      else break;
    } else break;
  }
  return { run, durations, counts };
}
