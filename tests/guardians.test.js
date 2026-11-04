// Act guardians: three per act-1/2 map, each its own boss with its own art.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BIOMES } from '../src/game/data/biomes.js';
import { ENEMIES } from '../src/game/data/enemies.js';
import { generateArea } from '../src/game/run.js';
import fs from 'node:fs';
import { playRun } from './sim.js';

const guardianMaps = Object.entries(BIOMES).filter(([, b]) => !b.boss);

test('every map without the dragon or the Word Eater has three different guardians', () => {
  assert.equal(guardianMaps.length, 6);
  const all = [];
  for (const [id, b] of guardianMaps) {
    assert.equal(b.guardians?.length, 3, `${id} has three guardians`);
    assert.equal(new Set(b.guardians).size, 3, `${id}'s guardians are all different`);
    for (const g of b.guardians) assert.ok(ENEMIES[g]?.guardian, `${g} is a guardian`);
    all.push(...b.guardians);
  }
  assert.equal(new Set(all).size, all.length, 'no guardian guards two maps');
});

test('guardians have their own art, never a common enemy reused', () => {
  // the manifest is JSX-importing, so read its keys from the file
  const manifest = fs.readFileSync(new URL('../src/assets/manifest.js', import.meta.url), 'utf8');
  const commonSprites = new Set(Object.values(ENEMIES).filter((e) => !e.guardian && !e.boss).map((e) => e.sprite));
  const guardians = Object.values(ENEMIES).filter((e) => e.guardian);
  const sprites = guardians.map((e) => e.sprite);
  assert.equal(new Set(sprites).size, sprites.length, 'every guardian has a sprite of its own');
  for (const g of guardians) {
    assert.ok(!commonSprites.has(g.sprite), `${g.name} doesn't reuse a common enemy's sprite (${g.sprite})`);
    assert.match(manifest, new RegExp(`\n  ${g.sprite}: \{ component: `), `${g.name}'s sprite exists`);
  }
});

test('which guardian you meet varies between runs', () => {
  for (const [id, b] of guardianMaps) {
    const met = new Set();
    for (let seed = 1; seed <= 60; seed++) met.add(generateArea(seed * 977, { act: b.act, biome: id }).seq.at(-1).enemies[0]);
    assert.equal(met.size, 3, `${id}: all three guardians appear (${[...met]})`);
  }
});

test('every guardian is a fair fight in real runs (none beats the player much more often than the rest)', () => {
  const heroes = ['xinyi', 'mei', 'ruizhe', 'huojin', 'fuyun', 'lei'];
  const stat = {};
  for (let s = 1; s <= 150; s++) {
    let cur = null;
    playRun(s * 7919 + 13, {
      heroId: heroes[s % 6],
      log: (p, run) => {
        if (cur && p !== 'battle') {
          stat[cur] = stat[cur] || { met: 0, lost: 0 };
          stat[cur].met++;
          if (p === 'defeat') stat[cur].lost++;
          cur = null;
        }
        if (p === 'battle' && run.battle?.type === 'guardian') cur = run.battle.enemies[0];
      },
    });
  }
  for (const [, b] of guardianMaps) for (const g of b.guardians) assert.ok(stat[g]?.met >= 5, `${g} is met in runs`);
  for (const [g, x] of Object.entries(stat)) assert.ok(x.lost / x.met <= 0.3, `${g} beats the player in ${x.lost}/${x.met} fights`);
});
