// Simulated player for balance tests and sweeps.
import {
  newRun, chooseBiome, reachableNodes, chooseNode, battleReward, takeItem, takeSpell, replaceableSlots, resolveBattle, afterReward,
  enterLair, enterBeyond, leaveNode, openShop, draftItems, heroFor, healRun,
} from '../src/game/run.js';
import { simulateBattle, makeRng } from '../src/game/combat.js';
import { ITEMS } from '../src/game/data/items.js';
import { DISCOVERABLE_SPELLS } from '../src/game/data/spells.js';
import { ACT_BIOMES } from '../src/game/data/biomes.js';
import { RUN } from '../src/game/data/balance.js';

const itemPool = Object.keys(ITEMS);
const spellPool = DISCOVERABLE_SPELLS;

/** Plays a full run. castSuccess: how often the simulated player solves spell puzzles. */
export function playRun(seed, { heroId = 'xinyi', castSuccess = 0.85, accountLevel = 4, beyond = false, eliteBias = 0.3, pickItem = null } = {}) {
  const r = makeRng(seed);
  const run = newRun({ seed, accountLevel, heroId, beyondUnlocked: beyond });
  const durations = { battle: [], elite: [], guardian: [], boss: [] };
  for (let guard = 0; guard < 400; guard++) {
    const p = run.phase;
    if (p === 'biome') {
      const opts = ACT_BIOMES[run.act];
      chooseBiome(run, opts[Math.floor(r() * opts.length)]);
    } else if (p === 'lairIntro') enterLair(run);
    else if (p === 'map') {
      const opts = reachableNodes(run);
      const safe = opts.filter((n) => n.type !== 'elite');
      const pick = r() < eliteBias || !safe.length ? opts[Math.floor(r() * opts.length)] : safe[Math.floor(r() * safe.length)];
      const t = chooseNode(run, pick.id);
      if (t === 'merchant' || t === 'secret') openShop(run, itemPool, spellPool);
      if (t === 'treasure') run.reward = { kind: 'items', choices: draftItems(run, itemPool, 2, { minRarity: 'rare' }) };
    } else if (p === 'battle') {
      const hero = heroFor(run, accountLevel);
      const sim = simulateBattle({
        hero, heroHp: run.hp, enemies: run.battle.enemies, biome: run.battle.biome, floor: run.floor, seed: run.battle.seed,
        runState: run.runState, autoCast: { delay: 3, success: castSuccess },
      });
      durations[run.battle.type]?.push(sim.duration);
      run.runState = { ...run.runState, phoenixUsed: sim.battle.runState.phoenixUsed };
      resolveBattle(run, sim, accountLevel);
      if (run.phase === 'reward') {
        run.reward = battleReward(run, { itemPool, spellPool });
        if (!run.reward) afterReward(run);
      }
    } else if (p === 'reward') {
      const rw = run.reward;
      if (rw.kind === 'items' && rw.choices.length) takeItem(run, pickItem ? pickItem(rw.choices, run) : rw.choices[0], accountLevel);
      if (rw.kind === 'spell') {
        if (run.spells.length < 3) takeSpell(run, rw.spell);
        else if (r() < 0.5) takeSpell(run, rw.spell, replaceableSlots(run)[0]);
      }
      afterReward(run);
    } else if (p === 'treasure') {
      if (run.reward?.choices?.length) takeItem(run, run.reward.choices[0], accountLevel);
      leaveNode(run);
    } else if (p === 'rest') {
      if (run.hp < heroFor(run, accountLevel).maxHp * 0.7) healRun(run, accountLevel, RUN.restHealPct);
      else run.ink += 30;
      leaveNode(run);
    } else if (p === 'lesson') {
      for (let i = 0; i < 5; i++) if (r() < 0.8) healRun(run, accountLevel, RUN.lessonHealPct);
      leaveNode(run);
    } else if (p === 'shrine') {
      run.bonus.spellPower += 0.15;
      leaveNode(run);
    } else if (p === 'merchant') {
      const st = run.shop.stock.find((x) => x.kind === 'item' && x.price <= run.ink);
      if (st) {
        run.ink -= st.price;
        takeItem(run, st.id, accountLevel);
      }
      leaveNode(run);
    } else if (p === 'event') {
      if (r() < 0.8) run.ink += 30;
      leaveNode(run);
    } else if (p === 'victory') {
      if (beyond) enterBeyond(run);
      else break;
    } else break;
  }
  return { run, durations };
}

