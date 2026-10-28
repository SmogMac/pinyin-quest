// Roguelike run state machine (v2). Pure functions that mutate a plain, JSON-serialisable run
// object, saved after every step so a run can be resumed between encounters.
//
// Structure: Act 1 (choose a biome) → Act 2 (choose a biome; some need vocabulary) →
//            Act 3 Ink Dragon's Lair → [Act 4 The Forgotten Beyond, after 3 dragon victories]
// Each act is a branching scroll map of rows; the last row is the act's guardian / boss.
// phases: biome → map → battle → reward → map … → victory | defeat
//         map → rest | treasure | shrine | merchant | lesson | event → map
import { RUN, SCORE } from './data/balance.js';
import { ITEMS, RARITY_WEIGHT } from './data/items.js';
import { SPELLS, SPELL_SLOTS, SIGNATURE_LOCKED } from './data/spells.js';
import { BIOMES, ACT_BIOMES } from './data/biomes.js';
import { synergiesCompletedBy, activeSynergies } from './data/synergies.js';
import { heroDef, DEFAULT_HERO } from './data/heroes.js';
import { makeRng, buildHero } from './combat.js';

export const RUN_VERSION = 2;

export const NODE_INFO = {
  battle: { py: 'zhàn dòu', zh: '战斗', name: 'Battle', desc: 'A fight. Win a passive item or spell.' },
  elite: { py: 'jīng yīng', zh: '精英', name: 'Elite', desc: 'Dangerous foe, rare rewards.' },
  rest: { py: 'gōu huǒ', zh: '篝火', name: 'Campfire', desc: 'Heal, or study words for ink.' },
  treasure: { py: 'bǎo xiāng', zh: '宝箱', name: 'Treasure', desc: 'Choose a rare item.' },
  shrine: { py: 'shén miào', zh: '神庙', name: 'Shrine', desc: 'An elemental blessing.' },
  merchant: { py: 'shāng rén', zh: '商人', name: 'Merchant', desc: 'Spend ink on items and spells.' },
  lesson: { py: 'lǎo shī', zh: '老师', name: 'Teacher', desc: '5 questions: heal and earn ink.' },
  event: { py: 'qí yù', zh: '奇遇', name: 'Encounter', desc: 'Something strange happens…' },
  secret: { py: 'mì mì', zh: '秘密', name: 'Secret', desc: 'A hidden place, revealed by a word you know.' },
  guardian: { py: 'shǒu wèi', zh: '守卫', name: 'Guardian', desc: 'The biome’s guardian. Leads to the next act.' },
  boss: { py: 'dà wáng', zh: '大王', name: 'Boss', desc: 'The final battle of this path.' },
  secretboss: { py: 'yù tù', zh: '玉兔', name: 'Moon Gate', desc: 'Something shines behind the moon…' },
};

const NODE_WEIGHTS = { battle: 44, elite: 12, rest: 9, treasure: 8, shrine: 7, merchant: 6, lesson: 8, event: 9 };

function rng(run) {
  run.rngN = (run.rngN || 0) + 1;
  return makeRng(run.seed * 7919 + run.rngN * 104729);
}
function weighted(r, items, w) {
  const total = items.reduce((s, x) => s + w(x), 0);
  let roll = r() * total;
  for (const x of items) {
    roll -= w(x);
    if (roll <= 0) return x;
  }
  return items[items.length - 1];
}

// ------------------------------------------------------------------ map generation
/** Branching map: 3 random walks across 4 columns, merged. Last row = guardian/boss. */
export function generateActMap(seed, act, biome, { secrets = [] } = {}) {
  const r = makeRng(seed);
  const rows = RUN.actRows[act];
  const COLS = 4;
  const nodes = {};
  const key = (row, col) => `${row}-${col}`;
  const ensure = (row, col) => (nodes[key(row, col)] ||= { id: key(row, col), row, col, next: [], type: null });
  const fightRows = rows - 1;
  for (let p = 0; p < 3; p++) {
    let col = p === 0 ? 0 : p === 1 ? COLS - 1 : Math.floor(r() * COLS);
    for (let row = 0; row < fightRows; row++) {
      const n = ensure(row, col);
      if (row < fightRows - 1) {
        const nextCol = Math.max(0, Math.min(COLS - 1, col + Math.floor(r() * 3) - 1));
        const nn = ensure(row + 1, nextCol);
        if (!n.next.includes(nn.id)) n.next.push(nn.id);
        col = nextCol;
      }
    }
  }
  const finalId = `${fightRows}-final`;
  nodes[finalId] = { id: finalId, row: fightRows, col: 1.5, next: [], type: act >= 3 ? 'boss' : 'guardian' };
  for (const n of Object.values(nodes)) if (n.row === fightRows - 1) n.next = [finalId];

  // node types
  for (const n of Object.values(nodes)) {
    if (n.type) continue;
    if (n.row === 0) n.type = 'battle';
    else if (n.row === fightRows - 1 && fightRows > 2) n.type = r() < 0.6 ? 'rest' : 'battle';
    else {
      const types = Object.keys(NODE_WEIGHTS).filter((t) => !(t === 'elite' && n.row < 2) && !(t === 'merchant' && n.row < 1));
      n.type = weighted(r, types, (t) => NODE_WEIGHTS[t]);
    }
  }
  // the row before the guardian always offers at least one campfire
  const pre = Object.values(nodes).filter((n) => n.row === fightRows - 1);
  if (fightRows > 2 && pre.length && !pre.some((n) => n.type === 'rest')) pre[0].type = 'rest';

  // secret nodes appear only when their condition is met
  const middle = Object.values(nodes).filter((n) => n.row >= 1 && n.row < fightRows - 1);
  for (const s of secrets) {
    const n = middle.splice(Math.floor(r() * middle.length), 1)[0];
    if (n) {
      n.type = s.type;
      n.secret = s.id;
    }
  }
  return { act, biome, rows, nodes };
}

// ------------------------------------------------------------------ run lifecycle
export function newRun({ seed = (Date.now() % 1e9) | 0, accountLevel = 1, heroId = DEFAULT_HERO, beyondUnlocked = false } = {}) {
  const def = heroDef(heroId);
  const hero = buildHero({ heroId, accountLevel });
  return {
    v: RUN_VERSION,
    seed,
    heroId,
    startedAt: Date.now(),
    act: 1,
    biome: null,
    map: null,
    pos: null,
    floor: 0,
    hp: hero.maxHp,
    items: [],
    spells: [def.signature],
    ink: 0,
    bonus: { spellPower: 0, maxHp: 0 },
    phase: 'biome',
    node: null,
    battle: null,
    reward: null,
    shop: null,
    quiz: null,
    beyondUnlocked,
    runState: { phoenixUsed: false },
    stats: { kills: 0, casts: 0, fizzles: 0, correct: 0, wrong: 0, battles: 0, words: [], guardians: 0, inkEarned: 0 },
    newlyFound: [],
  };
}

export function heroFor(run, accountLevel) {
  const h = buildHero({ heroId: run.heroId, items: run.items, spells: run.spells, accountLevel });
  h.maxHp += run.bonus?.maxHp || 0;
  h.spellPower += run.bonus?.spellPower || 0;
  return h;
}
export const maxHpOf = (run, accountLevel) => heroFor(run, accountLevel).maxHp;
export const healRun = (run, accountLevel, pct) => {
  const max = maxHpOf(run, accountLevel);
  run.hp = Math.min(max, run.hp + Math.round(max * pct));
};

/** Enter an act after choosing its biome. `secrets` are hidden nodes unlocked by vocabulary. */
export function chooseBiome(run, biomeId, secrets = []) {
  run.biome = biomeId;
  run.map = generateActMap(run.seed * 13 + run.act * 101, run.act, biomeId, { secrets });
  run.pos = null;
  run.phase = 'map';
}

export function reachableNodes(run) {
  if (!run.map) return [];
  const nodes = run.map.nodes;
  if (!run.pos) return Object.values(nodes).filter((n) => n.row === 0);
  return (nodes[run.pos]?.next || []).map((id) => nodes[id]);
}

export function chooseNode(run, nodeId) {
  if (run.phase !== 'map' || !reachableNodes(run).some((n) => n.id === nodeId)) return null;
  const node = run.map.nodes[nodeId];
  run.pos = nodeId;
  node.visited = true;
  run.floor += 1;
  run.node = { id: nodeId, type: node.type, secret: node.secret || null };
  const r = rng(run);
  const biome = BIOMES[run.biome];
  const t = node.type;
  if (['battle', 'elite', 'guardian', 'boss', 'secretboss'].includes(t)) {
    let enemies;
    if (t === 'guardian') enemies = [biome.guardian];
    else if (t === 'boss') enemies = [biome.boss];
    else if (t === 'secretboss') enemies = ['jade_rabbit'];
    else {
      const pool = biome.pools[t === 'elite' ? 'elite' : 'battle'];
      enemies = pool[Math.floor(r() * pool.length)];
    }
    run.battle = { type: t, enemies, seed: Math.floor(r() * 1e9), biome: run.biome };
    run.phase = 'battle';
  } else if (t === 'rest') run.phase = 'rest';
  else if (t === 'treasure') run.phase = 'treasure';
  else if (t === 'shrine') run.phase = 'shrine';
  else if (t === 'merchant' || (t === 'secret' && node.secret === 'merchant')) run.phase = 'merchant';
  else if (t === 'lesson') run.phase = 'lesson';
  else run.phase = 'event';
  return t;
}

export function leaveNode(run) {
  run.node = null;
  run.battle = null;
  run.reward = null;
  run.shop = null;
  run.quiz = null;
  run.phase = 'map';
}

// ------------------------------------------------------------------ rewards
/** Weighted draft of passive items, biased toward completing synergies and the biome's element. */
export function draftItems(run, pool, n = 3, { minRarity = null, r = rng(run) } = {}) {
  const owned = new Set(run.items);
  const def = heroDef(run.heroId);
  const biomeEl = Object.keys(BIOMES[run.biome]?.elementMods || {});
  let candidates = pool.filter((id) => !owned.has(id) && ITEMS[id]);
  if (minRarity === 'rare') candidates = candidates.filter((id) => ITEMS[id].rarity !== 'common');
  if (!candidates.length) candidates = pool.filter((id) => !owned.has(id));
  const w = (id) => {
    const it = ITEMS[id];
    let x = RARITY_WEIGHT[it.rarity] || 5;
    if (def.poolBias?.[it.element]) x *= def.poolBias[it.element];
    if (biomeEl.includes(it.element)) x *= 1.3;
    if (synergiesCompletedBy(id, run.items, run.spells).length) x *= 2;
    return x;
  };
  const out = [];
  const list = candidates.slice();
  while (out.length < n && list.length) {
    const p = weighted(r, list, w);
    out.push(p);
    list.splice(list.indexOf(p), 1);
  }
  return out;
}

export function offerSpell(run, unlockedSpellIds, r = rng(run)) {
  const choices = unlockedSpellIds.filter((id) => !run.spells.includes(id));
  return choices.length ? choices[Math.floor(r() * choices.length)] : null;
}

/** After a won battle, prepare the reward screen. Pools come from unlocks.js (vocabulary). */
export function battleReward(run, { itemPool, spellPool }) {
  const t = run.battle.type;
  const r = rng(run);
  const inkMult = run.items.includes('lucky_cat') ? 1.25 : 1;
  let ink = t === 'elite' || t === 'guardian' ? RUN.inkPerElite : RUN.inkPerBattle[0] + Math.floor(r() * (RUN.inkPerBattle[1] - RUN.inkPerBattle[0]));
  ink = Math.round(ink * inkMult);
  run.ink += ink;
  run.stats.inkEarned += ink;
  if (t === 'boss') return null;
  if (t === 'secretboss') {
    const epics = itemPool.filter((id) => ITEMS[id].rarity === 'epic' && !run.items.includes(id));
    return { kind: 'items', choices: epics.length ? epics.slice(0, 1) : draftItems(run, itemPool, 2, { minRarity: 'rare', r }), ink };
  }
  const spell = t === 'battle' && r() < RUN.spellOfferChance ? offerSpell(run, spellPool, r) : null;
  if (spell) return { kind: 'spell', spell, ink };
  return {
    kind: 'items',
    choices: draftItems(run, itemPool, 3, { minRarity: t === 'elite' || t === 'guardian' ? 'rare' : null, r }),
    ink,
  };
}

/** Returns newly completed synergy ids. */
export function takeItem(run, id, accountLevel) {
  if (run.items.includes(id)) return [];
  const before = activeSynergies(run.items, run.spells);
  const maxBefore = maxHpOf(run, accountLevel);
  run.items.push(id);
  const maxAfter = maxHpOf(run, accountLevel);
  if (maxAfter > maxBefore) run.hp += maxAfter - maxBefore;
  run.hp = Math.min(run.hp, maxAfter);
  return activeSynergies(run.items, run.spells).filter((s) => !before.includes(s));
}

export const replaceableSlots = (run) =>
  run.spells.map((id, i) => ({ id, i, locked: SIGNATURE_LOCKED && SPELLS[id]?.signature })).filter((s) => !s.locked).map((s) => s.i);

/** slot: index to replace, or null to add into a free slot. Returns newly completed synergies. */
export function takeSpell(run, spellId, slot = null) {
  const before = activeSynergies(run.items, run.spells);
  if (run.spells.length < SPELL_SLOTS && slot === null) run.spells.push(spellId);
  else if (slot !== null && replaceableSlots(run).includes(slot)) run.spells[slot] = spellId;
  else return [];
  return activeSynergies(run.items, run.spells).filter((s) => !before.includes(s));
}

export function resolveBattle(run, sim, accountLevel) {
  run.hp = Math.max(0, Math.round(sim.heroHp));
  run.stats.kills += sim.kills;
  run.stats.battles += 1;
  const t = run.battle.type;
  if (sim.result !== 'win') {
    run.phase = 'defeat';
    return;
  }
  healRun(run, accountLevel, RUN.victoryHealPct);
  if (t === 'guardian') {
    run.stats.guardians += 1;
    healRun(run, accountLevel, RUN.actHealPct);
  }
  if (t === 'boss') {
    run.phase = run.biome === 'beyond' ? 'complete' : 'victory';
    return;
  }
  run.phase = 'reward';
}

/** After the reward: guardians lead to the next act, otherwise back to the map. */
export function afterReward(run) {
  const wasGuardian = run.battle?.type === 'guardian';
  leaveNode(run);
  if (wasGuardian) {
    run.act += 1;
    run.biome = null;
    run.map = null;
    run.pos = null;
    run.phase = run.act >= 3 ? 'lairIntro' : 'biome';
  }
}

export function enterLair(run) {
  chooseBiome(run, 'lair');
}
export function enterBeyond(run) {
  run.act = 4;
  chooseBiome(run, 'beyond');
}

// ------------------------------------------------------------------ merchant & shrine
export function openShop(run, itemPool, spellPool, { secret = false } = {}) {
  const r = rng(run);
  const items = draftItems(run, itemPool, secret ? 4 : 3, { minRarity: secret ? 'rare' : null, r });
  const spell = offerSpell(run, spellPool, r);
  const disc = secret ? 0.8 : 1;
  run.shop = {
    secret,
    stock: [
      ...items.map((id) => ({ kind: 'item', id, price: Math.round(RUN.prices[ITEMS[id].rarity] * disc), sold: false })),
      ...(spell ? [{ kind: 'spell', id: spell, price: Math.round(RUN.prices.spell * disc), sold: false }] : []),
      { kind: 'heal', id: 'heal', price: Math.round(RUN.prices.heal * disc), sold: false },
    ],
  };
}

export function shrineOptions(run, itemPool) {
  const biome = BIOMES[run.biome];
  const element = Object.keys(biome.elementMods || {})[0] || 'light';
  const gifts = itemPool.filter((id) => ITEMS[id].element === element && !run.items.includes(id));
  return { element, gift: gifts.length ? gifts[Math.floor(rng(run)() * gifts.length)] : null };
}

export function scoreOf(run) {
  const won = run.phase === 'victory' || run.phase === 'complete';
  return (
    run.floor * SCORE.floor +
    run.stats.kills * SCORE.kill +
    run.stats.casts * SCORE.cast +
    run.stats.guardians * SCORE.guardian +
    (won ? SCORE.boss : 0) +
    (run.phase === 'complete' ? SCORE.wordeater : 0)
  );
}

export const actBiomes = (act) => ACT_BIOMES[act] || [];
