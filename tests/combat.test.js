// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHero, simulateBattle } from '../src/game/combat.js';

const run = (upgrades, enemies, floor, seed = 7, heroHp) => {
  const hero = buildHero({ upgrades });
  return simulateBattle({ hero, heroHp: heroHp ?? hero.maxHp, enemies, floor, seed });
};

test('a fresh hero beats a floor-1 slime in a short battle', () => {
  const r = run([], ['slime'], 1);
  assert.equal(r.result, 'win');
  assert.ok(r.duration < 25, `took ${r.duration}s`);
  assert.ok(r.heroHp < 120, 'slime should deal some damage');
});

test('simulation is deterministic for the same seed', () => {
  const a = run([{ id: 'fireball', level: 1 }], ['slime', 'bat'], 3, 42);
  const b = run([{ id: 'fireball', level: 1 }], ['slime', 'bat'], 3, 42);
  assert.deepEqual(a.events, b.events);
});

test('upgrades change combat outcomes', () => {
  const base = run([], ['golem'], 4, 3);
  const buffed = run([{ id: 'power_strike', level: 3 }, { id: 'wind_spirit', level: 2 }], ['golem'], 4, 3);
  assert.ok(buffed.duration < base.duration, 'stronger hero should win faster');
  const shield = buildHero({ upgrades: [{ id: 'water_shield', level: 2 }] });
  assert.equal(shield.startShield, 28);
  assert.ok(shield.abilities.some((a) => a.kind === 'shield'));
});

test('synergies activate and patch abilities', () => {
  const h = buildHero({ upgrades: [{ id: 'fireball', level: 1 }, { id: 'wind_spirit', level: 1 }] });
  assert.ok(h.synergies.includes('firestorm'));
  assert.equal(h.abilities.find((a) => a.id === 'fireball').target, 'all');
});

test('enemies can defeat an unprepared hero', () => {
  const r = run([], ['wyrm'], 10);
  assert.equal(r.result, 'lose');
  assert.equal(r.heroHp, 0);
});

test('a reasonable late-run build can beat the boss', () => {
  const build = [
    { id: 'power_strike', level: 3 }, { id: 'wind_spirit', level: 2 }, { id: 'fireball', level: 2 },
    { id: 'mountain_armor', level: 2 }, { id: 'vital_heart', level: 2 }, { id: 'healing_spring', level: 1 },
    { id: 'keen_eye', level: 2 },
  ];
  let wins = 0;
  for (let s = 1; s <= 20; s++) if (run(build, ['wyrm'], 10, s, 210).result === 'win') wins++;
  assert.ok(wins >= 8, `boss wins ${wins}/20`);
});
