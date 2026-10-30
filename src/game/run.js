// Roguelike run state machine (v3: continuous exploration). Pure functions that mutate a plain,
// JSON-serialisable run object, saved after every step so a run resumes exactly where it was.
//
// Structure: Act 1 area → Act 2 area (some biomes need vocabulary) → Act 3 Ink Dragon's Lair →
//            [Act 4 The Forgotten Beyond, after 3 dragon victories]. The biome of each area is
//            picked at random; the player never chooses a route.
//
// Each area's encounters are generated ONCE, when the area begins (generateArea), as a hidden,
// pre-rolled sequence saved with the run: refreshing can't reroll anything. The hero walks right;
// reaching the next encounter starts it (arrive), finishing it moves on (finishEncounter). The
// last encounter of every area is its guardian or boss.
//
// phases:  areaIntro → explore → battle | merchant | chest | stranger | spring | shrine
//          battle → reward (one item, take or leave) → explore …
//          guardian beaten → areaClear → (fade) → areaIntro (next act)
//          dragon beaten → victory → [enterBeyond] · word eater beaten → complete · lost → defeat
import { RUN, SCORE } from './data/balance.js';
import { ITEMS, RARITY_WEIGHT } from './data/items.js';
import { BIOMES, ACT_BIOMES } from './data/biomes.js';
import { AREA_PACING, WALK_SECONDS, STRANGERS, ENCOUNTERS } from './data/encounters.js';
import { BLESSINGS, BLESSING_IDS } from './data/blessings.js';
import { synergiesCompletedBy, activeSynergies } from './data/synergies.js';
import { heroDef, DEFAULT_HERO } from './data/heroes.js';
import { makeRng, buildHero } from './combat.js';

export const RUN_VERSION = 3;
export { ENCOUNTERS };

/** A fresh deterministic RNG per call (seeded by the run and a counter that is saved with it). */
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
const between = (r, [a, b]) => a + Math.floor(r() * (b - a + 1));
const shuffle = (r, arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ------------------------------------------------------------------ area generation
const NONCOMBAT = new Set(['merchant', 'chest', 'stranger', 'spring', 'shrine']);
/** Pacing problems in an arrangement (lower is better). */
function pacingFaults(seq) {
  let faults = 0;
  if (seq[0] !== 'battle') faults += 5; // every area opens with a fight
  let calm = 0;
  seq.forEach((t, i) => {
    calm = NONCOMBAT.has(t) ? calm + 1 : 0;
    if (calm > 2) faults += 3; // no long stretches without combat
    if (i > 0 && NONCOMBAT.has(t) && seq[i - 1] === t) faults += 3; // no back-to-back repeats
    if (t === 'merchant' && i < 3) faults += 4; // money first, shopping later
    if (t === 'spring' && i < seq.length * 0.4) faults += 2; // healing helps more later on
    if (t === 'elite' && i < 2) faults += 3;
    if (t === 'shrine' && i < 2) faults += 1;
  });
  if (seq.length > 1 && seq[seq.length - 1] === 'chest') faults += 1;
  return faults;
}

/** Orders the encounter types: many random shuffles, keep the one with the fewest pacing faults. */
export function arrangeArea(r, types) {
  let best = types;
  let bestFaults = Infinity;
  for (let i = 0; i < 600 && bestFaults > 0; i++) {
    const s = shuffle(r, types);
    const f = pacingFaults(s);
    if (f < bestFaults) {
      best = s;
      bestFaults = f;
    }
  }
  return best;
}

/**
 * Generates an area's full, hidden encounter sequence. `secrets`: { merchant: bool (better
 * stock), jadeRabbit: bool }. Combat encounters get their enemies and battle seed now, so the
 * whole area is fixed from the moment it begins.
 */
export function generateArea(seed, { act, biome, secrets = {} }) {
  const r = makeRng(seed);
  const pace = AREA_PACING[act] || AREA_PACING[1];
  const b = BIOMES[biome];
  const types = [];
  for (const [t, v] of Object.entries(pace)) {
    const n = Array.isArray(v) ? between(r, v) : r() < v ? 1 : 0;
    for (let i = 0; i < n; i++) types.push(t);
  }
  // never more than two peaceful stops between fights: add fights if the roll needs them
  const calmCount = () => types.filter((t) => NONCOMBAT.has(t)).length;
  while (calmCount() > 2 * types.filter((t) => !NONCOMBAT.has(t)).length) types.push('battle');
  const order = arrangeArea(r, types);
  if (secrets.jadeRabbit && biome === 'temple') order.push('secretboss');
  order.push(b.boss ? 'boss' : 'guardian');
  const seq = order.map((type, i) => {
    const walk = WALK_SECONDS[type] || (ENCOUNTERS[type]?.boss ? WALK_SECONDS.boss : WALK_SECONDS.default);
    const e = { i, type, walk: Math.round((walk[0] + r() * (walk[1] - walk[0])) * 10) / 10, done: false };
    if (type === 'battle' || type === 'elite') {
      const pool = b.pools[type === 'elite' ? 'elite' : 'battle'];
      e.enemies = pool[Math.floor(r() * pool.length)];
    } else if (type === 'guardian') e.enemies = [b.guardian];
    else if (type === 'boss') e.enemies = [b.boss];
    else if (type === 'secretboss') e.enemies = ['jade_rabbit'];
    if (ENCOUNTERS[type]?.combat) e.seed = Math.floor(r() * 1e9);
    if (type === 'merchant' && secrets.merchant) e.secret = true;
    return e;
  });
  return { act, biome, seed, idx: 0, seq };
}

/**
 * Picks the run's map for each act (one of three per act, 27 combinations). Rolled once when the
 * run starts and saved; the player only learns an act's map when that act begins. A map already
 * entered (older saves) is kept.
 */
export function rollMaps(seed, current = {}) {
  const r = makeRng(seed * 7 + 3);
  const maps = {};
  for (const act of [1, 2, 3]) {
    const pool = ACT_BIOMES[act];
    const pick = pool[Math.floor(r() * pool.length)];
    maps[act] = current[act] && pool.includes(current[act]) ? current[act] : pick;
  }
  return maps;
}
/** The map an act uses in this run (act 4 is always the Forgotten Beyond). */
export function mapForAct(run, act = run.act) {
  if (act >= 4) return 'beyond';
  if (!run.maps) {
    const known = {};
    if (run.biome && BIOMES[run.biome]?.act === run.act) known[run.act] = run.biome;
    run.maps = rollMaps(run.seed, known);
  }
  return run.maps[act];
}

// ------------------------------------------------------------------ run lifecycle
export function newRun({ seed = (Date.now() % 1e9) | 0, accountLevel = 1, heroId = DEFAULT_HERO, beyondUnlocked = false, ascension = 0 } = {}) {
  const hero = buildHero({ heroId, accountLevel });
  return {
    v: RUN_VERSION,
    seed,
    heroId,
    ascension, // 0–10, fixed for the whole run (data/ascension.js)
    startedAt: Date.now(),
    act: 1,
    biome: null,
    area: null,
    floor: 0, // fights started (drives enemy scaling)
    hp: hero.maxHp,
    items: [],
    blessings: [],
    ink: 0,
    bonus: { spellPower: 0, maxHp: 0 },
    phase: 'areaIntro',
    battle: null,
    offer: null, // the single item (or blessing) on offer right now
    shop: null,
    stranger: null,
    spring: null,
    beyondUnlocked,
    maps: rollMaps(seed), // hidden: which map each act uses
    biomesSeen: [],
    strangersSeen: [],
    runState: { phoenixUsed: false },
    stats: { kills: 0, casts: 0, fizzles: 0, correct: 0, wrong: 0, battles: 0, words: [], guardians: 0, inkEarned: 0, areas: 0, encounters: 0 },
  };
}

/** The signature move id(s) a run owns, for synergy checks (heroes have exactly one). */
export const runSignatures = (run) => [heroDef(run.heroId).signature];
export const runSynergies = (run) => activeSynergies(run.items, runSignatures(run));
const blessingRun = (run, key) => (run.blessings || []).reduce((s, id) => s + (BLESSINGS[id]?.run?.[key] || 0), 0);

export function heroFor(run, accountLevel) {
  const h = buildHero({ heroId: run.heroId, items: run.items, accountLevel, blessings: run.blessings || [] });
  h.maxHp += (run.bonus?.maxHp || 0) + blessingRun(run, 'maxHp');
  h.spellPower += run.bonus?.spellPower || 0;
  return h;
}
export const maxHpOf = (run, accountLevel) => heroFor(run, accountLevel).maxHp;
export const healRun = (run, accountLevel, pct) => {
  const max = maxHpOf(run, accountLevel);
  run.hp = Math.max(1, Math.min(max, run.hp + Math.round(max * pct)));
};
/** Adds ink (Lucky Cat and the Blessing of Abundance increase it). Returns the amount gained. */
export function gainInk(run, base) {
  const mult = 1 + (run.items.includes('lucky_cat') ? 0.25 : 0) + blessingRun(run, 'inkMult');
  const ink = Math.round(base * mult);
  run.ink += ink;
  run.stats.inkEarned += ink;
  return ink;
}

/**
 * Begins the next area: reveals the act's map (rolled when the run started, never chosen by the
 * player) and pre-generates its hidden encounter sequence. Only ever called from areaIntro.
 */
export function enterArea(run, { secrets = {} } = {}) {
  if (run.phase !== 'areaIntro') return;
  const biome = mapForAct(run);
  run.biome = biome;
  run.biomesSeen = [...(run.biomesSeen || []), biome];
  run.area = generateArea(run.seed * 13 + run.act * 101 + (run.stats.areas || 0) * 7, { act: run.act, biome, secrets });
  run.stats.areas = (run.stats.areas || 0) + 1;
  run.phase = 'explore';
}

/** The encounter the hero is walking toward (never shown before it is reached). */
export const nextEncounter = (run) => run.area?.seq[run.area.idx] || null;

/**
 * The hero reached the next encounter: start it. Everything random about it (the chest's item, the
 * shop's stock, the stranger, the blessing) is rolled here from the run's saved seed, once.
 * `ctx`: { itemPool, accountLevel }.
 */
export function arrive(run, { itemPool, accountLevel = 1 }) {
  if (run.phase !== 'explore') return null;
  const e = nextEncounter(run);
  if (!e || e.done) return null;
  const t = e.type;
  run.stats.encounters = (run.stats.encounters || 0) + 1;
  if (ENCOUNTERS[t]?.combat) {
    run.floor += 1;
    run.battle = { type: t, enemies: e.enemies, seed: e.seed, biome: run.biome };
    run.phase = 'battle';
  } else if (t === 'merchant') {
    openShop(run, itemPool, { secret: !!e.secret });
    run.phase = 'merchant';
  } else if (t === 'chest') {
    run.offer = { kind: 'item', id: draftItem(run, itemPool, { r: rng(run) }), source: 'chest' };
    run.phase = 'chest';
  } else if (t === 'stranger') {
    const fresh = STRANGERS.filter((s) => !(run.strangersSeen || []).includes(s.id));
    const list = fresh.length ? fresh : STRANGERS;
    const s = list[Math.floor(rng(run)() * list.length)];
    run.strangersSeen = [...(run.strangersSeen || []), s.id];
    run.stranger = { id: s.id, item: s.reward.kind === 'item' ? draftItem(run, itemPool, { r: rng(run) }) : null, result: null };
    run.phase = 'stranger';
  } else if (t === 'spring') {
    // at (nearly) full health the spring invigorates instead, so it is never a wasted stop
    const max = maxHpOf(run, accountLevel);
    const full = run.hp >= max * 0.95;
    run.spring = { heal: full ? 0 : RUN.springHealPct, vigour: full ? RUN.springMaxHp : 0 };
    run.phase = 'spring';
  } else if (t === 'shrine') {
    const options = BLESSING_IDS.filter((id) => !(run.blessings || []).includes(id));
    run.offer = { kind: 'blessing', id: options.length ? options[Math.floor(rng(run)() * options.length)] : null };
    run.phase = 'shrine';
  }
  return t;
}

/** Marks the current encounter done (exactly once) and walks on. */
export function finishEncounter(run) {
  const e = nextEncounter(run);
  if (e) e.done = true;
  if (run.area) run.area.idx += 1;
  run.battle = null;
  run.offer = null;
  run.shop = null;
  run.stranger = null;
  run.spring = null;
  run.phase = run.area && run.area.idx < run.area.seq.length ? 'explore' : 'areaClear';
}

// ------------------------------------------------------------------ items
/** One random passive item (weighted by rarity, synergy potential, biome and Fortune). */
export function draftItem(run, pool, { minRarity = null, r = rng(run) } = {}) {
  return draftItems(run, pool, 1, { minRarity, r })[0] || null;
}

/** Weighted draft of distinct passive items, biased toward completing synergies and the biome's element. */
export function draftItems(run, pool, n = 1, { minRarity = null, r = rng(run) } = {}) {
  const owned = new Set(run.items);
  const def = heroDef(run.heroId);
  const biomeEl = Object.keys(BIOMES[run.biome]?.elementMods || {});
  const fortune = blessingRun(run, 'fortune') > 0;
  const fits = (id) => ITEMS[id] && !owned.has(id);
  let candidates = pool.filter(fits);
  if (minRarity === 'rare') candidates = candidates.filter((id) => ITEMS[id].rarity !== 'common');
  if (minRarity === 'epic') candidates = candidates.filter((id) => ITEMS[id].rarity === 'epic');
  if (!candidates.length) candidates = pool.filter(fits);
  const w = (id) => {
    const it = ITEMS[id];
    let x = RARITY_WEIGHT[it.rarity] || 5;
    if (fortune && it.rarity !== 'common') x *= 2.5;
    if (def.poolBias?.[it.element]) x *= def.poolBias[it.element];
    if (biomeEl.includes(it.element)) x *= 1.3;
    if (synergiesCompletedBy(id, run.items, runSignatures(run)).length) x *= 2;
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

/** Returns newly completed synergy ids. */
export function takeItem(run, id, accountLevel) {
  if (!ITEMS[id] || run.items.includes(id)) return [];
  const before = runSynergies(run);
  const maxBefore = maxHpOf(run, accountLevel);
  run.items.push(id);
  const maxAfter = maxHpOf(run, accountLevel);
  if (maxAfter > maxBefore) run.hp += maxAfter - maxBefore;
  run.hp = Math.min(run.hp, maxAfter);
  return runSynergies(run).filter((s) => !before.includes(s));
}

/** Grants a shrine blessing (applied exactly once). */
export function takeBlessing(run, id, accountLevel) {
  const def = BLESSINGS[id];
  if (!def || (run.blessings || []).includes(id)) return false;
  const maxBefore = maxHpOf(run, accountLevel);
  run.blessings = [...(run.blessings || []), id];
  const maxAfter = maxHpOf(run, accountLevel);
  if (maxAfter > maxBefore) run.hp += maxAfter - maxBefore;
  if (def.run?.healFull) run.hp = maxAfter;
  return true;
}

// ------------------------------------------------------------------ battles
/** Records a finished fight. Wins pay ink and may offer one item; bosses end the area. */
export function resolveBattle(run, sim, accountLevel, { itemPool = [] } = {}) {
  if (run.phase !== 'battle' || !run.battle) return;
  run.hp = Math.max(0, Math.round(sim.heroHp));
  run.stats.kills += sim.kills;
  run.stats.battles += 1;
  if (sim.runState) run.runState = { ...run.runState, ...sim.runState };
  const t = run.battle.type;
  if (sim.result !== 'win') {
    run.phase = 'defeat';
    return;
  }
  healRun(run, accountLevel, RUN.victoryHealPct + blessingRun(run, 'victoryHeal'));
  const r = rng(run);
  const base = t === 'elite' ? RUN.inkPerElite : t === 'guardian' || t === 'secretboss' ? RUN.inkPerGuardian : t === 'boss' ? 0 : RUN.inkPerBattle[0] + Math.floor(r() * (RUN.inkPerBattle[1] - RUN.inkPerBattle[0]));
  const ink = base ? gainInk(run, base) : 0;
  if (t === 'boss') {
    run.phase = run.biome === 'beyond' ? 'complete' : 'victory';
    return;
  }
  if (t === 'guardian') {
    run.stats.guardians += 1;
    healRun(run, accountLevel, RUN.actHealPct);
  }
  // one item, never a choice of three: always after elites, guardians and secret bosses,
  // sometimes after ordinary fights
  let item = null;
  if (t === 'secretboss') item = draftItem(run, itemPool, { minRarity: 'epic', r });
  else if (t === 'elite' || t === 'guardian') item = draftItem(run, itemPool, { minRarity: 'rare', r });
  else if (r() < RUN.battleItemChance) item = draftItem(run, itemPool, { r });
  run.offer = { kind: 'item', id: item, ink, source: t };
  run.phase = 'reward';
}

/** After the reward screen (item taken or left): walk on, or leave the area after its guardian. */
export function afterReward(run) {
  finishEncounter(run);
}

/** The guardian's area is behind us: the next act's area begins (biome chosen by enterArea). */
export function nextArea(run) {
  if (run.phase !== 'areaClear') return;
  run.act += 1;
  run.area = null;
  run.biome = null;
  run.phase = 'areaIntro';
}

/** After the dragon (3 victories across runs): continue into the Forgotten Beyond. */
export function enterBeyond(run) {
  run.act = 4;
  run.area = null;
  run.biome = null;
  run.phase = 'areaIntro';
}

// ------------------------------------------------------------------ merchant, spring
export function openShop(run, itemPool, { secret = false } = {}) {
  const r = rng(run);
  const items = draftItems(run, itemPool, secret ? 5 : 4, { minRarity: secret ? 'rare' : null, r });
  const disc = secret ? 0.8 : 1;
  run.shop = {
    secret,
    stock: [
      ...items.map((id) => ({ kind: 'item', id, price: Math.round(RUN.prices[ITEMS[id].rarity] * disc), sold: false })),
      { kind: 'heal', id: 'heal', price: Math.round(RUN.prices.heal * disc), sold: false },
    ],
  };
}

/** Buys stock line `i` if affordable. Returns the item id bought (or 'heal'), else null. */
export function buy(run, i, accountLevel) {
  const st = run.shop?.stock[i];
  if (!st || st.sold || run.ink < st.price) return null;
  run.ink -= st.price;
  st.sold = true;
  if (st.kind === 'heal') healRun(run, accountLevel, 0.3);
  return st.kind === 'heal' ? 'heal' : st.id;
}

/** The hot spring's soak is over: heal (or gain max HP at full health), exactly once. */
export function finishSpring(run, accountLevel) {
  if (run.phase !== 'spring' || !run.spring) return;
  if (run.spring.vigour) {
    run.bonus.maxHp += run.spring.vigour;
    run.hp += run.spring.vigour;
  }
  if (run.spring.heal) healRun(run, accountLevel, run.spring.heal);
  finishEncounter(run);
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
