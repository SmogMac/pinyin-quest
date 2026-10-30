// Passive items and synergies, checked against the real combat engine for all six heroes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Battle, buildHero, simulateBattle } from '../src/game/combat.js';
import { COMBAT } from '../src/game/data/balance.js';
import { ITEMS } from '../src/game/data/items.js';
import { SYNERGIES } from '../src/game/data/synergies.js';
import { HEROES } from '../src/game/data/heroes.js';
import { ITEM_ART } from '../src/assets/itemArt.js';
import { itemEffect, synergyEffect } from './itemAudit.js';

const HERO_IDS = Object.keys(HEROES);
const vocab = new Set(JSON.parse(fs.readFileSync('src/data/vocab.json', 'utf8')).map((w) => w.id));

test('every item has an icon, a description, valid unlock words and a known category', () => {
  const cats = new Set(['attack', 'movement', 'dodge', 'defense', 'signature', 'momentum', 'positioning', 'status', 'conditional', 'strange']);
  for (const [id, it] of Object.entries(ITEMS)) {
    assert.ok(ITEM_ART[id], `${id} has an icon`);
    assert.ok(fs.existsSync(`public/${ITEM_ART[id]}`), `${id} icon file`);
    assert.ok(it.desc && it.en && it.py && it.zh, `${id} names and description`);
    assert.ok(cats.has(it.category), `${id} category`);
    for (const w of it.requires || []) assert.ok(vocab.has(w), `${id} unlock word ${w} exists`);
  }
});

test('every item changes real fights for every hero (in at least 2 of: one enemy, a group, a boss)', () => {
  const weak = [];
  for (const id of Object.keys(ITEMS)) {
    for (const h of HERO_IDS) {
      const s = itemEffect(id, h, { seeds: [3, 11, 19] });
      if (s.length < 2) weak.push(`${id}/${h}: ${s.join('+') || 'nothing'}`);
    }
  }
  assert.deepEqual(weak, []);
});

test('every synergy has existing requirements and changes real fights for every hero', () => {
  for (const [id, s] of Object.entries(SYNERGIES)) {
    assert.ok(s.requires.length >= 2, `${id} needs 2+ items`);
    for (const r of s.requires) assert.ok(ITEMS[r], `${id} requires a real item (${r})`);
  }
  const keys = Object.values(SYNERGIES).map((s) => [...s.requires].sort().join('+'));
  assert.equal(new Set(keys).size, keys.length, 'no two synergies need exactly the same items');
  const dead = [];
  for (const id of Object.keys(SYNERGIES)) for (const h of HERO_IDS) if (!synergyEffect(id, h).length) dead.push(`${id}/${h}`);
  assert.deepEqual(dead, []);
});

test('every item visual has an FX cue', () => {
  const fx = JSON.parse(fs.readFileSync('src/fx/fx.json', 'utf8'));
  const src = ['src/game/data/items.js', 'src/game/data/synergies.js', 'src/game/data/itemKit.js', 'src/game/data/signatures.js'].map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  const kinds = new Set([...src.matchAll(/fx\('([a-z_]+)'/g), ...src.matchAll(/fx: '([a-z_]+)'/g)].map((m) => m[1]));
  kinds.add('clone');
  kinds.add('spirit');
  for (const k of kinds) assert.ok(fx.cues[`item.${k}`], `cue item.${k}`);
});

// ------------------------------------------------------------------ behaviour spot checks
const make = (heroId, items, enemies = ['golem'], extra = {}) => new Battle({ hero: buildHero({ heroId, items, accountLevel: 6 }), enemies, seed: 5, ...extra });
const run = (b, sec) => {
  const out = [];
  for (let t = 0; t < sec && !b.result; t += COMBAT.dt) out.push(...b.step(COMBAT.dt));
  return out;
};

test('projectile items fire secondary projectiles for melee heroes too, and come back to a lone boss', () => {
  for (const heroId of ['mei', 'lei', 'fuyun']) {
    const b = make(heroId, ['split_ink', 'five_petals'], ['wyrm']);
    const ev = run(b, 8);
    const extra = ev.filter((e) => e.type === 'shot' && e.small);
    assert.ok(extra.length >= 3, `${heroId}: ${extra.length} ink shards / petals at the lone boss`);
  }
});

test('signature items work for utility signatures (Ruizhe shield, Fuyun frenzy, Lei push)', () => {
  for (const heroId of ['ruizhe', 'fuyun', 'lei']) {
    for (const id of ['afterglow', 'perfect_memory', 'reckless_magic', 'still_water', 'ink_reflection', 'reservoir', 'honed_edge']) {
      assert.ok(itemEffect(id, heroId, { scenarios: ['single', 'boss'] }).length, `${id} with ${heroId}`);
    }
  }
});

test('Echoing Soul echoes each hero’s move in its own way, without another puzzle', () => {
  const sign = {
    xinyi: (ev) => ev.filter((e) => e.type === 'fruit').length >= 2,
    mei: (ev) => ev.some((e) => e.type === 'sig' && e.phase === 'wave'),
    huojin: (ev) => ev.some((e) => e.type === 'cast' && e.spell === 'burst'),
    ruizhe: (ev) => ev.filter((e) => e.type === 'sig' && e.phase === 'repel').length >= 2,
    fuyun: (ev) => ev.some((e) => e.type === 'spawn' && e.unit.ally),
    lei: (ev) => ev.filter((e) => e.type === 'sig' && e.phase === 'blast').length >= 2,
  };
  for (const heroId of HERO_IDS) {
    const b = make(heroId, ['echo_cast'], ['golem', 'slime']);
    b.sig.state = 'ready';
    b.beginCast();
    b.finishCast(true);
    const ev = [...b.drain(), ...run(b, 1.5)];
    assert.ok(sign[heroId](ev), `${heroId} echo`);
    assert.ok(!b.casting, 'no second puzzle');
  }
});

test('shield items make their own shields, and Bursting Shield explodes even unbroken', () => {
  const b = make('xinyi', ['shield_burst'], ['golem']);
  b.hero.def = 999; // nothing breaks it
  const ev = run(b, 13);
  assert.ok(ev.some((e) => e.type === 'shield'), 'grows a brittle shield');
  assert.ok(ev.some((e) => e.type === 'itemFx' && e.kind === 'shieldblast'), 'explodes when it runs out');
  for (const id of ['thorn_shell', 'barbed_seal', 'second_refusal', 'ember_shield']) {
    const c = make('lei', [id], ['golem']);
    assert.ok(run(c, 11).some((e) => e.type === 'shield'), `${id} shields without help`);
  }
});

test('The Red Thread shares damage between linked enemies and drags them together', () => {
  const b = make('lei', ['red_thread'], ['golem', 'slime']);
  const [g, s] = b.foes();
  const hp = s.hp;
  b.damage(b.hero, g, 50, { kind: 'attack', noKnock: true });
  assert.ok(s.hp < hp, 'the partner shares the damage');
  const x = s.x;
  b.knockback(g, 10, { src: b.hero });
  run(b, 0.6);
  assert.ok(s.x > x + 3, 'the partner is dragged along');
});

test('Borrowed Time afterimages repeat your attack; Mirror World strikes from the far side', () => {
  const b = make('mei', ['borrowed_time'], ['golem']);
  b.hero.attackCount = 6; // the next attack is the 7th
  b.heroAttack();
  const ev = run(b, 1.4);
  const img = b.units.find((u) => u.frozen);
  assert.ok(img, 'an afterimage stands where you were');
  assert.ok(ev.some((e) => e.type === 'shot' && e.src === img.id && e.copy), 'it repeats the attack');
  const m = make('xinyi', ['mirror_world'], ['golem', 'slime']);
  const twin = m.units.find((u) => u.mirror);
  m.heroAttack();
  const mev = run(m, 0.4);
  assert.ok(twin && twin.x > COMBAT.worldW - 6, 'the mirror self stands at the far wall');
  assert.ok(mev.some((e) => e.type === 'shot' && e.src === twin.id), 'it attacks from there');
});

test('Trickster’s Mask swaps places with the nearest enemy (with a cooldown, no loops)', () => {
  const b = make('fuyun', ['tricksters_mask'], ['golem']);
  const f = b.foes()[0];
  const fx = f.x;
  b.grantMomentum(b.hero, 5);
  assert.ok(Math.abs(b.hero.x - fx) < 0.01, 'the hero took the enemy’s place');
  b.drain();
  const swaps = run(b, 3.9).filter((e) => e.type === 'itemFx' && e.kind === 'swap').length;
  assert.equal(swaps, 0, 'no second swap within 4s');
});

test('copied attacks never copy themselves: every item at once stays finite and bounded', () => {
  const all = Object.keys(ITEMS);
  for (const heroId of HERO_IDS) {
    // every item and synergy at once (no real run gets there), against a wall of bosses with 50×
    // health, so every chain (clones, mirrors, afterimages, threads, drums, bombs) runs flat out
    const b = new Battle({ hero: buildHero({ heroId, items: all, accountLevel: 10 }), enemies: ['wordeater', 'wyrm', 'knight', 'goblin', 'slime'], biome: 'beyond', floor: 20, seed: 2 });
    for (const f of b.foes()) f.hp = f.maxHp * 50;
    let events = 0;
    let maxStep = 0;
    for (let t = 0; t < 15 && !b.result; t += COMBAT.dt) {
      if (b.sig.state === 'ready') {
        b.beginCast();
        b.finishCast(true);
      }
      const n = b.step(COMBAT.dt).length;
      events += n;
      maxStep = Math.max(maxStep, n);
      assert.ok(b.allies().length <= COMBAT.maxAllies, `${heroId}: ally cap`);
      assert.ok(b.zones.length <= 14, `${heroId}: zone cap`);
    }
    assert.ok(b.t >= 2, `${heroId}: the chains ran (${b.t.toFixed(1)}s)`);
    assert.ok(Number.isFinite(b.dealt) && Number.isFinite(b.hero.hp), `${heroId}: finite numbers`);
    for (const u of b.units) assert.ok(Number.isFinite(u.x) && Number.isFinite(u.hp), `${heroId}: positions and health stay numbers`);
    assert.ok(maxStep < 3000, `${heroId}: at most ${maxStep} events in one 50ms step`);
    assert.ok(events < 120000, `${heroId}: ${events} events in 15s`);
  }
});

test('a powerful build can become absurd (rare synergies stack up)', () => {
  const build = ['mirror_world', 'mirror_ink', 'twin_shadows', 'split_ink', 'explosive_impact', 'red_thread', 'chain_collision', 'thunderclap_drum', 'pileup'];
  const hero = buildHero({ heroId: 'xinyi', items: build, accountLevel: 6 });
  const plain = buildHero({ heroId: 'xinyi', items: [], accountLevel: 6 });
  const go = (h) => simulateBattle({ hero: h, heroHp: h.maxHp, enemies: ['golem', 'slime', 'goblin', 'bat'], biome: 'bamboo', floor: 8, seed: 4, maxT: 60 });
  const a = go(hero);
  const p = go(plain);
  assert.ok(hero.synergies.includes('hall_of_mirrors') && hero.synergies.includes('puppet_strings'), 'synergies switch on');
  assert.ok(a.dealt / a.duration > (p.dealt / p.duration) * 2.5, `the build hits far harder (${(a.dealt / a.duration).toFixed(0)}/s vs ${(p.dealt / p.duration).toFixed(0)}/s)`);
});
