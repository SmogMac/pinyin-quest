// Combat engine, items, synergies and content checks. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Battle, buildHero, simulateBattle } from '../src/game/combat.js';
import { ITEMS } from '../src/game/data/items.js';
import { SYNERGIES, activeSynergies } from '../src/game/data/synergies.js';
import { SIGNATURES } from '../src/game/data/signatures.js';
import { ENEMIES } from '../src/game/data/enemies.js';
import { BIOMES } from '../src/game/data/biomes.js';
import { HEROES } from '../src/game/data/heroes.js';
import { COMBAT } from '../src/game/data/balance.js';
import { toneVariants, withTone, toneOf } from '../src/learn/pinyinTools.js';

const vocab = JSON.parse(fs.readFileSync(new URL('../src/data/vocab.json', import.meta.url)));
const vocabIds = new Set(vocab.map((w) => w.id));

const hero = (opts = {}) => buildHero({ heroId: 'xinyi', ...opts });
const run = (b, seconds) => {
  const out = [];
  for (let t = 0; t < seconds && !b.result; t += COMBAT.dt) out.push(...b.step(COMBAT.dt));
  return out;
};

test('content meets the minimums', () => {
  assert.ok(Object.keys(ITEMS).length >= 50, `items: ${Object.keys(ITEMS).length}`);
  assert.ok(Object.keys(SYNERGIES).length >= 25, `synergies: ${Object.keys(SYNERGIES).length}`);
  assert.ok(Object.values(BIOMES).filter((b) => b.terrain?.length || b.events?.length || b.elementMods).length >= 4);
  const elements = new Set(Object.values(ITEMS).map((s) => s.element));
  for (const el of ['fire', 'ice', 'water', 'earth', 'lightning', 'wind', 'dark', 'light']) assert.ok(elements.has(el), `no item for ${el}`);
  for (const h of Object.values(HEROES)) assert.ok(SIGNATURES[h.signature], `${h.en} needs a signature move`);
  // every hero has signature-specific items
  for (const id of Object.keys(HEROES)) assert.ok(Object.values(ITEMS).filter((i) => i.hero === id).length >= 4, `${id} signature items`);
});

test('every vocabulary requirement is a real word in the list', () => {
  const reqs = [
    ...Object.values(ITEMS).flatMap((i) => i.requires || []),
    ...Object.values(BIOMES).flatMap((b) => b.unlock || []),
  ];
  const missing = [...new Set(reqs.filter((w) => !vocabIds.has(w)))];
  // each item/spell needs at least one requirement that exists, or it could never unlock
  for (const [id, it] of Object.entries(ITEMS)) {
    if (it.requires?.length) assert.ok(it.requires.some((w) => vocabIds.has(w)), `${id} can never unlock (${it.requires})`);
  }
  if (missing.length) console.log('optional requirement words not in the list (ok, alternatives exist):', missing.join(' '));
});

test('combat continues while the signature puzzle is open; one puzzle at a time', () => {
  const b = new Battle({ hero: hero(), enemies: ['slime', 'slime'], seed: 3 });
  run(b, 4);
  assert.equal(b.sig.state, 'ready');
  assert.ok(b.beginCast());
  assert.equal(b.casting, true);
  assert.equal(b.beginCast(), false, 'cannot open a second puzzle');
  const t0 = b.t;
  const hp0 = b.foes()[0].hp;
  run(b, 3);
  assert.ok(b.t > t0 + 2.9, 'time advances while solving');
  assert.ok(b.foes()[0]?.hp !== hp0 || b.result, 'the hero keeps attacking during the puzzle');
  assert.equal(b.sig.state, 'casting', 'no cooldown until resolved');
});

test('cancel keeps the move ready; a wrong answer fizzles into cooldown; success fires it', () => {
  const b = new Battle({ hero: hero(), enemies: ['golem'], seed: 5 });
  run(b, 4);
  b.beginCast();
  b.cancelCast();
  assert.equal(b.sig.state, 'ready');
  assert.equal(b.casting, false);
  b.beginCast();
  b.finishCast(false);
  assert.equal(b.sig.state, 'cooldown');
  assert.ok(Math.abs(b.sig.cdLeft - SIGNATURES.fruit_salad.cd) < 1e-9, 'full cooldown after a fizzle');
  run(b, SIGNATURES.fruit_salad.cd + 0.2);
  assert.equal(b.sig.state, 'ready');
  const hp = b.foes()[0].hp;
  b.beginCast();
  const r = b.finishCast(true, { choice: 'apple' });
  assert.ok(r.ok);
  assert.ok(b.foes()[0].hp < hp, 'the apple hit');
  assert.equal(b.sig.state, 'cooldown');
});

test('no elemental resistances or weaknesses: every element deals the same to every enemy', () => {
  const hit = (enemy, element) => {
    const b = new Battle({ hero: hero(), enemies: [enemy], biome: 'bamboo', seed: 1 });
    b.biome = { ...b.biome, elementMods: {} }; // biomes may favour an element for everyone; enemies never do
    const f = b.foes()[0];
    return b.damage(b.hero, f, 40, { element, kind: 'proc', canCrit: false, noReact: true });
  };
  for (const enemy of ['slime', 'snowman', 'crab', 'golem', 'wyrm', 'thunderbird']) {
    const base = hit(enemy, 'physical');
    for (const el of ['fire', 'ice', 'water', 'earth', 'lightning', 'dark', 'light']) assert.equal(hit(enemy, el), base, `${enemy} vs ${el}`);
    assert.equal(ENEMIES[enemy].affinity, undefined);
  }
});

test('elemental reactions fire through the engine', () => {
  const b = new Battle({ hero: hero(), enemies: ['slime', 'slime'], seed: 2 });
  const [a, c] = b.foes();
  b.applyStatus(a, 'wet', { src: b.hero });
  b.applyStatus(c, 'wet', { src: b.hero });
  b.events = [];
  b.damage(b.hero, a, 20, { element: 'lightning', kind: 'spell' });
  assert.ok(b.events.some((e) => e.type === 'reaction' && e.id === 'conduct'));
  assert.ok(b.events.some((e) => e.type === 'hit' && e.tgt === c.id), 'conduct chains to the other wet enemy');
  // chill on wet freezes
  b.applyStatus(c, 'wet', { src: b.hero });
  b.applyStatus(c, 'chill', { src: b.hero });
  assert.ok(c.statuses.frozen, 'flash freeze');
  b.events = [];
  b.damage(b.hero, c, 10, { element: 'fire', kind: 'spell' });
  assert.ok(b.events.some((e) => e.id === 'melt'));
  assert.ok(c.statuses.wet, 'melting leaves the target wet');
});

test('terrain reacts to elements (frozen + fire -> water -> electrified)', () => {
  const b = new Battle({ hero: hero(), enemies: ['slime'], biome: 'frozen', seed: 1 });
  assert.ok(b.hasTerrain('frozen'));
  b.terrain.frozen = 5; // make it temporary so it can melt
  b.terrainElement('fire');
  assert.ok(b.hasTerrain('wet') && !b.hasTerrain('frozen'));
  b.terrainElement('lightning');
  assert.ok(b.hasTerrain('electrified'));
});

test('every passive item runs in battle without errors', () => {
  const errors = [];
  const orig = console.error;
  console.error = (...a) => errors.push(a.join(' '));
  try {
    for (const id of Object.keys(ITEMS)) {
      const heroId = ITEMS[id].hero || 'xinyi';
      const h = buildHero({ heroId, items: [id] });
      const r = simulateBattle({ hero: h, heroHp: h.maxHp, enemies: ['slime', 'crab', 'bat'], biome: 'coast', floor: 4, seed: 9, autoCast: { delay: 1, success: 0.8 } });
      assert.ok(['win', 'lose'].includes(r.result), id);
    }
  } finally {
    console.error = orig;
  }
  assert.deepEqual(errors, []);
});

test('every synergy activates and runs without errors', () => {
  const errors = [];
  const orig = console.error;
  console.error = (...a) => errors.push(a.join(' '));
  try {
    for (const [sid, sy] of Object.entries(SYNERGIES)) {
      const items = sy.requires.filter((r) => ITEMS[r]);
      for (const r of sy.requires) assert.ok(ITEMS[r] || SIGNATURES[r], `${sid} requires unknown ${r}`);
      const heroId =
        Object.keys(HEROES).find((h) => sy.requires.includes(HEROES[h].signature)) || items.map((i) => ITEMS[i].hero).find(Boolean) || 'xinyi';
      const heroItems = items.map((i) => ITEMS[i].hero).filter(Boolean);
      assert.ok(heroItems.every((x) => x === heroId), `${sid} mixes items of different heroes`);
      assert.ok(activeSynergies(items, [HEROES[heroId].signature]).includes(sid), `${sid} should activate`);
      const h = buildHero({ heroId, items });
      const r = simulateBattle({ hero: h, heroHp: h.maxHp, enemies: ['slime', 'slime', 'bat'], biome: 'bamboo', floor: 3, seed: 4, autoCast: { delay: 1, success: 1 } });
      assert.ok(['win', 'lose'].includes(r.result));
    }
  } finally {
    console.error = orig;
  }
  assert.deepEqual(errors, []);
});

test('absurd builds stay bounded (no infinite chains)', () => {
  for (const heroId of Object.keys(HEROES)) {
    const items = Object.keys(ITEMS).filter((id) => !ITEMS[id].hero || ITEMS[id].hero === heroId);
    const h = buildHero({ heroId, items });
    const start = Date.now();
    const r = simulateBattle({ hero: h, heroHp: h.maxHp, enemies: ['wordeater'], biome: 'beyond', floor: 18, seed: 1, autoCast: { delay: 0.5, success: 1 } });
    assert.ok(Date.now() - start < 8000, `${heroId}: simulation finished quickly`);
    assert.ok(['win', 'lose'].includes(r.result));
    const r2 = simulateBattle({ hero: h, heroHp: h.maxHp, enemies: ['slime', 'slime', 'golem', 'bat', 'goblin'], biome: 'coast', floor: 10, seed: 3, autoCast: { delay: 0.2, success: 1 } });
    assert.ok(['win', 'lose'].includes(r2.result), `${heroId} crowd`);
  }
});

test('enemies use behaviours: charge telegraphs, freezing interrupts, bosses change phase', () => {
  const b = new Battle({ hero: hero(), enemies: ['golem'], seed: 2 });
  const ev = run(b, 12);
  const tele = ev.find((e) => e.type === 'telegraph');
  assert.ok(tele, 'golem winds up a slam');
  const b2 = new Battle({ hero: hero(), enemies: ['golem'], seed: 2 });
  run(b2, tele.t + 0.1);
  const g = b2.foes()[0];
  assert.ok(g.charging);
  b2.applyStatus(g, 'frozen', { src: b2.hero });
  assert.equal(g.charging, null, 'freeze interrupts the charge');
  const boss = simulateBattle({ hero: buildHero({ heroId: 'mei', items: ['glass_brush', 'keen_eye'].filter((x) => ITEMS[x]) }), enemies: ['wyrm'], biome: 'lair', floor: 15, seed: 3, autoCast: { delay: 1, success: 1 } });
  assert.ok(boss.events.some((e) => e.type === 'phase') || boss.result === 'lose');
});

test('tone helpers', () => {
  const v = toneVariants('huǒ qiú', 3);
  assert.equal(v.length, 3);
  for (const x of v) assert.notEqual(x, 'huǒ qiú');
  assert.equal(withTone('lü', 3), 'lǚ');
  assert.equal(toneOf('qiú'), 2);
});

test('hero passives and sprites load into battle', () => {
  for (const [id, h] of Object.entries(HEROES)) {
    const b = new Battle({ hero: buildHero({ heroId: id }), enemies: ['slime'], seed: 1 });
    assert.equal(b.hero.sprite, h.sprite, `${id} sprite`);
    assert.ok(b.hooks.some((x) => x.passive), `${id} passive hooks registered`);
    assert.equal(typeof b.hero.def, 'number', 'def is the defence stat');
  }
  // Xin Yi heals on a successful signature
  const b = new Battle({ hero: buildHero({ heroId: 'xinyi' }), heroHp: 50, enemies: ['golem'], seed: 1 });
  run(b, 5);
  const hp = b.hero.hp;
  b.beginCast();
  b.finishCast(true, { choice: 'grape' });
  assert.ok(b.hero.hp > hp, 'Good Cheer heals');
  // Mei opens with a sword draw
  const m = new Battle({ hero: buildHero({ heroId: 'mei' }), enemies: ['golem'], seed: 1 });
  const ev = run(m, 1);
  assert.ok(ev.some((e) => e.type === 'cast' && e.spell === 'iaido'));
});

test('jiāng shī rises once unless finished with fire', () => {
  const b = new Battle({ hero: hero(), enemies: ['zombie'], seed: 1 });
  const z = b.foes()[0];
  b.damage(b.hero, z, 9999, { element: 'physical', kind: 'proc' });
  assert.ok(z.alive && z.risen && z.hp === Math.round(z.maxHp * 0.5), 'gets back up at half HP');
  b.damage(b.hero, z, 9999, { element: 'physical', kind: 'proc' });
  assert.ok(!z.alive, 'stays down the second time');
  const f = new Battle({ hero: hero(), enemies: ['zombie'], seed: 1 });
  const z2 = f.foes()[0];
  f.damage(f.hero, z2, 9999, { element: 'fire', kind: 'proc' });
  assert.ok(!z2.alive, 'fire keeps it down');
});
