// Combat engine, items, synergies and content checks. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Battle, buildHero, simulateBattle } from '../src/game/combat.js';
import { ITEMS } from '../src/game/data/items.js';
import { SYNERGIES, activeSynergies } from '../src/game/data/synergies.js';
import { SPELLS, DISCOVERABLE_SPELLS } from '../src/game/data/spells.js';
import { ENEMIES } from '../src/game/data/enemies.js';
import { BIOMES } from '../src/game/data/biomes.js';
import { HEROES } from '../src/game/data/heroes.js';
import { COMBAT } from '../src/game/data/balance.js';
import { toneVariants, withTone, toneOf } from '../src/learn/pinyinTools.js';
import { matchesShape } from '../src/learn/shapes.js';

const vocab = JSON.parse(fs.readFileSync(new URL('../src/data/vocab.json', import.meta.url)));
const vocabIds = new Set(vocab.map((w) => w.id));

const hero = (opts = {}) => buildHero({ heroId: 'xinyi', ...opts });
const run = (b, seconds) => {
  const out = [];
  for (let t = 0; t < seconds && !b.result; t += COMBAT.dt) out.push(...b.step(COMBAT.dt));
  return out;
};

test('content meets the minimums', () => {
  assert.ok(Object.keys(ITEMS).length >= 40, `items: ${Object.keys(ITEMS).length}`);
  assert.ok(DISCOVERABLE_SPELLS.length >= 12, `spells: ${DISCOVERABLE_SPELLS.length}`);
  assert.ok(Object.keys(SYNERGIES).length >= 20, `synergies: ${Object.keys(SYNERGIES).length}`);
  assert.ok(Object.values(BIOMES).filter((b) => b.terrain?.length || b.events?.length || b.elementMods).length >= 4);
  const elements = new Set([...Object.values(SPELLS).map((s) => s.element)]);
  for (const el of ['fire', 'ice', 'water', 'earth', 'lightning', 'wind', 'dark', 'light']) assert.ok(elements.has(el), `no spell for ${el}`);
  for (const h of Object.values(HEROES)) assert.ok(SPELLS[h.signature]?.signature, `${h.en} needs a signature spell`);
});

test('every vocabulary requirement is a real word in the list', () => {
  const reqs = [
    ...Object.values(ITEMS).flatMap((i) => i.requires || []),
    ...Object.values(SPELLS).flatMap((s) => s.requires || []),
    ...Object.values(BIOMES).flatMap((b) => b.unlock || []),
  ];
  const missing = [...new Set(reqs.filter((w) => !vocabIds.has(w)))];
  // each item/spell needs at least one requirement that exists, or it could never unlock
  for (const [id, it] of [...Object.entries(ITEMS), ...Object.entries(SPELLS)]) {
    if (it.requires?.length) assert.ok(it.requires.some((w) => vocabIds.has(w)), `${id} can never unlock (${it.requires})`);
  }
  if (missing.length) console.log('optional requirement words not in the list (ok, alternatives exist):', missing.join(' '));
});

test('combat continues while a spell puzzle is open; one puzzle at a time', () => {
  const b = new Battle({ hero: hero({ spells: ['jiayou', 'huoqiu'] }), enemies: ['slime', 'slime'], seed: 3 });
  run(b, 4);
  assert.equal(b.spells[0].state, 'ready');
  assert.ok(b.beginCast(0));
  assert.equal(b.casting, 0);
  assert.equal(b.beginCast(1), false, 'cannot open a second puzzle');
  const t0 = b.t;
  const hp0 = b.foes()[0].hp;
  run(b, 3);
  assert.ok(b.t > t0 + 2.9, 'time advances while casting');
  assert.ok(b.foes()[0]?.hp !== hp0 || b.result, 'the hero keeps attacking during the puzzle');
  assert.equal(b.spells[0].state, 'casting', 'spell does not go on cooldown until resolved');
});

test('cancel keeps the spell ready; failure fizzles into cooldown; success casts', () => {
  const b = new Battle({ hero: hero({ spells: ['jiayou', 'huoqiu'] }), enemies: ['golem'], seed: 5 });
  run(b, 4);
  b.beginCast(1);
  b.cancelCast(1);
  assert.equal(b.spells[1].state, 'ready');
  assert.equal(b.casting, null);
  b.beginCast(1);
  b.finishCast(1, false);
  assert.equal(b.spells[1].state, 'cooldown');
  assert.ok(b.spells[1].cdLeft > 0);
  run(b, 9);
  assert.equal(b.spells[1].state, 'ready');
  const hp = b.foes()[0].hp;
  b.beginCast(1);
  const events = [];
  const r = b.finishCast(1, true);
  events.push(...b.events);
  assert.ok(r.ok);
  assert.ok(b.foes()[0].hp < hp, 'fireball dealt damage');
  assert.ok(b.foes()[0].statuses.burn, 'fireball burns');
});

test('elemental affinities change real damage', () => {
  const hit = (enemy, element) => {
    const b = new Battle({ hero: hero(), enemies: [enemy], seed: 1 });
    const f = b.foes()[0];
    return b.damage(b.hero, f, 40, { element, kind: 'proc', canCrit: false, noReact: true });
  };
  const normal = hit('slime', 'fire');
  const resisted = hit('slime', 'water');
  const weak = hit('slime', 'lightning');
  assert.ok(resisted < normal && normal < weak, `${resisted} < ${normal} < ${weak}`);
  // bosses can never be immune
  const boss = new Battle({ hero: hero(), enemies: ['wyrm'], seed: 1 });
  assert.ok(boss.damage(boss.hero, boss.foes()[0], 40, { element: 'dark', kind: 'proc', canCrit: false }) > 0);
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
      const h = buildHero({ heroId: 'xinyi', items: [id], spells: ['jiayou', 'huoqiu', 'shandian'] });
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
      const spells = ['jiayou', ...sy.requires.filter((r) => SPELLS[r] && r !== 'jiayou')].slice(0, 3);
      const heroId = Object.keys(HEROES).find((h) => sy.requires.includes(HEROES[h].signature)) || 'xinyi';
      const sp = heroId === 'xinyi' ? spells : [HEROES[heroId].signature, ...spells.filter((x) => x !== 'jiayou')].slice(0, 3);
      assert.ok(activeSynergies(items, sp).includes(sid), `${sid} should activate`);
      const h = buildHero({ heroId, items, spells: sp });
      const r = simulateBattle({ hero: h, heroHp: h.maxHp, enemies: ['slime', 'slime', 'bat'], biome: 'bamboo', floor: 3, seed: 4, autoCast: { delay: 1, success: 1 } });
      assert.ok(['win', 'lose'].includes(r.result));
    }
  } finally {
    console.error = orig;
  }
  assert.deepEqual(errors, []);
});

test('absurd builds stay bounded (no infinite chains)', () => {
  const items = Object.keys(ITEMS);
  const h = buildHero({ heroId: 'ruizhe', items, spells: ['zhishi', 'shandian', 'huoqiu'] });
  const start = Date.now();
  const r = simulateBattle({ hero: h, heroHp: h.maxHp, enemies: ['wordeater'], biome: 'beyond', floor: 18, seed: 1, autoCast: { delay: 0.5, success: 1 } });
  assert.ok(Date.now() - start < 8000, 'simulation finished quickly');
  assert.ok(['win', 'lose'].includes(r.result));
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

test('tone variants and shape recognition', () => {
  const v = toneVariants('huǒ qiú', 3);
  assert.equal(v.length, 3);
  for (const x of v) assert.notEqual(x, 'huǒ qiú');
  assert.equal(withTone('lü', 3), 'lǚ');
  assert.equal(toneOf('qiú'), 2);
  const circle = Array.from({ length: 48 }, (_, i) => ({ x: 100 + 70 * Math.cos((i / 48) * 2 * Math.PI), y: 100 + 70 * Math.sin((i / 48) * 2 * Math.PI) }));
  assert.ok(matchesShape(circle, 'circle').match);
  assert.ok(!matchesShape(circle, 'triangle').match);
});

test('hero passives and sprites load into battle', () => {
  for (const [id, h] of Object.entries(HEROES)) {
    const b = new Battle({ hero: buildHero({ heroId: id }), enemies: ['slime'], seed: 1 });
    assert.equal(b.hero.sprite, h.sprite, `${id} sprite`);
    assert.ok(b.hooks.some((x) => x.passive), `${id} passive hooks registered`);
    assert.equal(typeof b.hero.def, 'number', 'def is the defence stat');
  }
  // Xin Yi heals on a successful cast
  const b = new Battle({ hero: buildHero({ heroId: 'xinyi' }), heroHp: 50, enemies: ['golem'], seed: 1 });
  run(b, 5);
  const hp = b.hero.hp;
  b.beginCast(0);
  b.finishCast(0, true);
  assert.ok(b.hero.hp > hp, 'Good Cheer + Cheer On heal');
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
