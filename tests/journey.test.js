// The continuous journey: hidden pre-generated areas, encounters, rewards, blessings, area
// transitions and saving. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  newRun, generateArea, enterArea, arrive, finishEncounter, resolveBattle, afterReward, takeItem, takeBlessing, buy, finishSpring,
  nextArea, enterBeyond, nextEncounter, heroFor, draftItem, RUN_VERSION,
} from '../src/game/run.js';
import { ITEMS } from '../src/game/data/items.js';
import { BLESSINGS, BLESSING_IDS } from '../src/game/data/blessings.js';
import { STRANGERS, AREA_PACING } from '../src/game/data/encounters.js';
import { ACT_BIOMES, BIOMES } from '../src/game/data/biomes.js';
import { HEROES } from '../src/game/data/heroes.js';
import { simulateBattle, buildHero } from '../src/game/combat.js';
import { TEMPLATES } from '../src/learn/signaturePuzzles.js';
import { hydrate } from '../src/store/store.js';
import { playRun } from './sim.js';

const pool = Object.keys(ITEMS);
const NONCOMBAT = ['merchant', 'chest', 'stranger', 'spring', 'shrine'];
const fresh = (seed = 7, heroId = 'xinyi') => {
  const r = newRun({ seed, heroId });
  enterArea(r, { unlocked: ['bamboo'] });
  return r;
};

test('each area is generated once, ends with its boss, and follows the pacing rules', () => {
  for (let seed = 1; seed <= 400; seed++) {
    for (const act of [1, 2, 3, 4]) {
      const biome = ACT_BIOMES[act][seed % ACT_BIOMES[act].length];
      const a = generateArea(seed, { act, biome });
      const types = a.seq.map((e) => e.type);
      const last = types[types.length - 1];
      assert.equal(last, BIOMES[biome].boss ? 'boss' : 'guardian', 'boss last');
      assert.equal(types.filter((t) => t === 'guardian' || t === 'boss').length, 1, 'exactly one boss, never mid-area');
      assert.equal(types[0], 'battle', 'every area opens with a fight');
      const pace = AREA_PACING[act];
      const n = (t) => types.filter((x) => x === t).length;
      assert.ok(n('battle') >= pace.battle[0] && n('battle') <= pace.battle[1] + 2, 'battle count (extra fights only to keep calm stretches short)');
      assert.ok(n('merchant') <= 1 && n('shrine') <= 1);
      // no long stretches without combat, no back-to-back repeats of a special encounter
      let calm = 0;
      types.forEach((t, i) => {
        calm = NONCOMBAT.includes(t) ? calm + 1 : 0;
        assert.ok(calm <= 2, `seed ${seed} act ${act}: ${types}`);
        if (i && NONCOMBAT.includes(t)) assert.notEqual(types[i - 1], t);
      });
      for (const e of a.seq) assert.ok(e.walk >= 4 && e.walk <= 12, 'an encounter every few seconds of walking');
      for (const e of a.seq.filter((x) => ['battle', 'elite', 'guardian', 'boss'].includes(x.type))) assert.ok(e.enemies?.length && e.seed, 'fights are fixed in advance');
    }
  }
  // same seed, same area: reproducible for debugging
  assert.deepEqual(generateArea(42, { act: 2, biome: 'marsh' }), generateArea(42, { act: 2, biome: 'marsh' }));
});

test('shrines are rare; merchants, chests and strangers appear regularly', () => {
  const tally = {};
  let areas = 0;
  for (let seed = 1; seed <= 500; seed++) {
    for (const t of generateArea(seed, { act: 1, biome: 'coast' }).seq.map((e) => e.type)) tally[t] = (tally[t] || 0) + 1;
    areas++;
  }
  assert.ok(tally.shrine / areas < 0.25 && tally.shrine > 0, `shrines ${tally.shrine}/${areas}`);
  assert.ok(tally.chest / areas >= 1, 'about one or two chests per area');
  assert.ok(tally.battle > tally.chest && tally.battle > tally.stranger, 'battles are the most common');
});

test('the sequence is hidden and saved: reloading never rerolls, rewards are granted once', () => {
  const r = fresh();
  const saved = JSON.stringify(r.area);
  // a "reload" (save → JSON → load) keeps the exact same encounters and position
  const s = hydrate({ adventure: { current: JSON.parse(JSON.stringify(r)) } });
  assert.equal(JSON.stringify(s.adventure.current.area), saved);
  // the next encounter starts only once
  const before = r.area.idx;
  const t = arrive(r, { itemPool: pool });
  assert.equal(t, 'battle');
  assert.equal(arrive(r, { itemPool: pool }), null, 'arriving twice does nothing');
  finishEncounter(r);
  assert.equal(r.area.idx, before + 1);
  assert.ok(r.area.seq[before].done);
});

test('chests hold exactly one item that can be taken or left; nothing is equipped before Take', () => {
  const r = fresh(3);
  r.area.seq[r.area.idx] = { ...r.area.seq[r.area.idx], type: 'chest' };
  arrive(r, { itemPool: pool });
  assert.equal(r.phase, 'chest');
  assert.equal(typeof r.offer.id, 'string', 'one item, not a choice of three');
  assert.equal(r.items.length, 0, 'not equipped yet');
  const id = r.offer.id;
  finishEncounter(r); // leave it
  assert.ok(!r.items.includes(id));
  assert.equal(r.phase, 'explore');
});

test('battle rewards: ink, and at most one item (always after elites and guardians)', () => {
  for (const type of ['battle', 'elite', 'guardian']) {
    const r = fresh(11);
    const e = r.area.seq[r.area.idx];
    Object.assign(e, { type, enemies: ['slime'], seed: 5 });
    arrive(r, { itemPool: pool });
    const ink = r.ink;
    resolveBattle(r, { result: 'win', heroHp: 50, kills: 1 }, 1, { itemPool: pool });
    assert.equal(r.phase, 'reward');
    assert.ok(r.ink > ink, `${type} pays ink`);
    if (type !== 'battle') assert.ok(ITEMS[r.offer.id], `${type} offers an item`);
    assert.ok(!Array.isArray(r.offer.id), 'never a list');
  }
});

test('merchants sell items you can afford; bought items leave the stock; you can always leave', () => {
  const r = fresh(5);
  r.area.seq[r.area.idx].type = 'merchant';
  r.ink = 1000;
  arrive(r, { itemPool: pool });
  assert.equal(r.phase, 'merchant');
  const first = r.shop.stock.findIndex((s) => s.kind === 'item');
  const id = buy(r, first, 1);
  takeItem(r, id, 1);
  assert.ok(r.items.includes(id));
  assert.ok(r.shop.stock[first].sold);
  assert.equal(buy(r, first, 1), null, 'can’t buy it twice');
  const second = r.shop.stock.findIndex((s, i) => s.kind === 'item' && !s.sold && i !== first);
  assert.ok(buy(r, second, 1), 'can buy several');
  r.ink = 0;
  const third = r.shop.stock.findIndex((s) => s.kind === 'item' && !s.sold);
  assert.equal(buy(r, third, 1), null, 'can’t buy without ink');
  finishEncounter(r);
  assert.equal(r.phase, 'explore');
});

test('strangers use Mandarin puzzles that work without sound, and are not repeated within a run', () => {
  for (const s of STRANGERS) assert.ok(s.template === 'vocab' || TEMPLATES[s.template], s.id);
  const r = fresh(9);
  const seen = new Set();
  for (let i = 0; i < STRANGERS.length; i++) {
    r.phase = 'explore';
    r.area.seq[r.area.idx] = { ...r.area.seq[r.area.idx], type: 'stranger', done: false };
    arrive(r, { itemPool: pool });
    assert.ok(!seen.has(r.stranger.id), 'no repeats');
    seen.add(r.stranger.id);
    r.phase = 'explore';
  }
});

test('hot springs heal (or invigorate at full health) exactly once', () => {
  const r = fresh(4);
  const max = heroFor(r, 1).maxHp;
  r.hp = Math.round(max * 0.3);
  r.area.seq[r.area.idx].type = 'spring';
  arrive(r, { itemPool: pool, accountLevel: 1 });
  finishSpring(r, 1);
  assert.ok(r.hp > max * 0.6, `healed to ${r.hp}/${max}`);
  const hp = r.hp;
  finishSpring(r, 1);
  assert.equal(r.hp, hp, 'no double heal');
  // full health: max HP instead
  const f = fresh(4);
  f.area.seq[f.area.idx].type = 'spring';
  const m0 = heroFor(f, 1).maxHp;
  arrive(f, { itemPool: pool, accountLevel: 1 });
  finishSpring(f, 1);
  assert.ok(heroFor(f, 1).maxHp > m0);
});

test('shrine blessings are positive, run-long, applied once, and useful for every hero', () => {
  for (const id of BLESSING_IDS) {
    const b = BLESSINGS[id];
    assert.ok(b.stats || b.hooks || b.run, id);
    for (const v of Object.values(b.stats || {})) assert.ok(v > 0, `${id}: no penalties`);
  }
  for (const heroId of Object.keys(HEROES)) {
    for (const id of BLESSING_IDS) {
      const r = newRun({ seed: 2, heroId });
      const before = heroFor(r, 1);
      assert.ok(takeBlessing(r, id, 1));
      assert.equal(takeBlessing(r, id, 1), false, 'once');
      const h = heroFor(r, 1);
      const hero = buildHero({ heroId, blessings: r.blessings });
      const r2 = simulateBattle({ hero, heroHp: hero.maxHp, enemies: ['slime', 'goblin'], seed: 3, autoCast: { delay: 1, success: 1 } });
      assert.ok(['win', 'lose'].includes(r2.result));
      const changed = JSON.stringify(h) !== JSON.stringify(before) || BLESSINGS[id].hooks || BLESSINGS[id].run;
      assert.ok(changed, `${id} does something for ${heroId}`);
    }
  }
});

test('beating a guardian leads to the next area (new random biome); the dragon ends with victory', () => {
  const r = fresh(21);
  r.area.idx = r.area.seq.length - 1;
  arrive(r, { itemPool: pool });
  assert.equal(r.battle.type, 'guardian');
  resolveBattle(r, { result: 'win', heroHp: 80, kills: 1 }, 1, { itemPool: pool });
  afterReward(r);
  assert.equal(r.phase, 'areaClear');
  nextArea(r);
  assert.equal(r.phase, 'areaIntro');
  assert.equal(r.act, 2);
  enterArea(r, { unlocked: ['frozen', 'thunder'] });
  assert.ok(['frozen', 'thunder'].includes(r.biome), 'random among unlocked; never chosen by the player');
  // lair and dragon
  r.phase = 'areaClear';
  nextArea(r);
  enterArea(r, {});
  assert.equal(r.biome, 'lair');
  r.area.idx = r.area.seq.length - 1;
  arrive(r, { itemPool: pool });
  assert.deepEqual(r.battle.enemies, ['wyrm']);
  resolveBattle(r, { result: 'win', heroHp: 80, kills: 1 }, 1, { itemPool: pool });
  assert.equal(r.phase, 'victory');
  enterBeyond(r);
  enterArea(r, {});
  assert.equal(r.biome, 'beyond');
  assert.equal(nextEncounter(r).type, 'battle');
});

test('biomes rarely repeat within a run', () => {
  let repeats = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const r = newRun({ seed });
    r.biomesSeen = ['bamboo'];
    enterArea(r, { unlocked: ['bamboo', 'coast', 'caves'] });
    if (r.biome === 'bamboo') repeats++;
  }
  assert.ok(repeats < 40, `repeat rate ${repeats}/200`);
});

test('whole journeys always finish, for every hero, and every encounter type resolves', () => {
  const seen = {};
  for (const heroId of Object.keys(HEROES)) {
    for (let s = 1; s <= 8; s++) {
      const { run, counts } = playRun(s * 101 + heroId.length, { heroId, beyond: s % 2 === 0 });
      assert.ok(['victory', 'defeat', 'complete'].includes(run.phase), `${heroId}: stuck in ${run.phase}`);
      assert.equal(run.v, RUN_VERSION);
      for (const [k, v] of Object.entries(counts)) seen[k] = (seen[k] || 0) + v;
    }
  }
  for (const t of ['battle', 'elite', 'merchant', 'chest', 'stranger', 'spring', 'guardian', 'boss']) assert.ok(seen[t] > 0, `met a ${t}`);
});

test('every passive item has an icon and works for every hero', async () => {
  const { ITEM_ART } = await import('../src/assets/itemArt.js');
  const fs = await import('node:fs');
  for (const id of Object.keys(ITEMS)) {
    assert.ok(ITEM_ART[id], `${id} has art`);
    assert.ok(fs.existsSync(new URL(`../public/${ITEM_ART[id]}`, import.meta.url)), `${id} art file exists`);
    assert.ok(!ITEMS[id].hero, `${id} is universal`);
    assert.ok(ITEMS[id].tags?.length, `${id} has tags`);
  }
  // an item offered by draftItem is never tied to a hero
  const r = newRun({ seed: 1, heroId: 'lei' });
  for (let i = 0; i < 50; i++) assert.ok(ITEMS[draftItem(r, pool)]);
});
