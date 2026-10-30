// Item audit: does an item actually change a fight for a hero? The same seeded battle is run with
// the item and with an inert copy of it (same id, so the per-item collection bonus is identical,
// but no stats and no hooks). Any difference in damage dealt, damage taken, length, events or the
// hero's health means the item did something. Used by tests/items.test.js and `node
// tests/item-audit.mjs` (a full report).
import { simulateBattle, buildHero } from '../src/game/combat.js';
import { ITEMS } from '../src/game/data/items.js';
import { SYNERGIES } from '../src/game/data/synergies.js';

export const SCENARIOS = {
  single: { enemies: ['golem'], biome: 'bamboo', floor: 4 },
  group: { enemies: ['slime', 'goblin', 'bat'], biome: 'coast', floor: 4 },
  boss: { enemies: ['wyrm'], biome: 'lair', floor: 12, maxT: 35 },
};

const fingerprint = (r) => {
  const counts = {};
  for (const e of r.events) counts[e.type] = (counts[e.type] || 0) + 1;
  return JSON.stringify([r.result, r.dealt, r.taken, r.duration, r.heroHp, r.kills, counts]);
};

function fight(heroId, items, sc, seed) {
  const hero = buildHero({ heroId, items, accountLevel: 6 });
  return simulateBattle({ hero, heroHp: hero.maxHp, enemies: sc.enemies, biome: sc.biome, floor: sc.floor, seed, maxT: sc.maxT || 60, autoCast: { delay: 1, success: 1 } });
}

/** Runs `fn` with item `id` made inert (no stats, no hooks), then restores it. */
function inert(id, fn) {
  const it = ITEMS[id];
  const saved = { stats: it.stats, hooks: it.hooks };
  it.stats = undefined;
  it.hooks = {};
  try {
    return fn();
  } finally {
    it.stats = saved.stats;
    it.hooks = saved.hooks;
  }
}

/**
 * In which scenarios item `id` changes the fight for `heroId` (with `extra` items held too).
 * Returns e.g. ['single', 'group'] ([] = it did nothing anywhere).
 */
export function itemEffect(id, heroId, { extra = [], seeds = [3, 11], scenarios = Object.keys(SCENARIOS) } = {}) {
  const items = [...extra, id];
  const out = [];
  for (const name of scenarios) {
    const sc = SCENARIOS[name];
    const changed = seeds.some((seed) => fingerprint(fight(heroId, items, sc, seed)) !== inert(id, () => fingerprint(fight(heroId, items, sc, seed))));
    if (changed) out.push(name);
  }
  return out;
}

/** In which scenarios synergy `id` (with all its items held) changes the fight for `heroId`. */
export function synergyEffect(id, heroId, { seeds = [3, 11, 19], scenarios = Object.keys(SCENARIOS) } = {}) {
  const syn = SYNERGIES[id];
  const items = syn.requires.filter((r) => ITEMS[r]);
  const out = [];
  for (const name of scenarios) {
    const sc = SCENARIOS[name];
    const changed = seeds.some((seed) => {
      const on = fingerprint(fight(heroId, items, sc, seed));
      const saved = { stats: syn.stats, hooks: syn.hooks };
      syn.stats = undefined;
      syn.hooks = {};
      try {
        return on !== fingerprint(fight(heroId, items, sc, seed));
      } finally {
        syn.stats = saved.stats;
        syn.hooks = saved.hooks;
      }
    });
    if (changed) out.push(name);
  }
  return out;
}
