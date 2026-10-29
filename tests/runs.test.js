// Run management: New Run / Continue / Abandon never touch permanent progress.
import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave, hydrate } from '../src/store/store.js';
import { activeRun, startRun, abandonRun, finishRun } from '../src/game/runManager.js';
import { chooseBiome, chooseNode, reachableNodes, RUN_VERSION } from '../src/game/run.js';
import { HEROES } from '../src/game/data/heroes.js';

/** A save with learning progress, unlocks and a run deep in progress (mid-battle). */
function playedSave() {
  const s = defaultSave();
  s.profile.xp = 50000;
  s.words['你好'] = { rec: { reps: 4, interval: 9, ease: 2.6, due: 123, lapses: 0 }, seen: 6, ok: 6 };
  s.gameWords['火球'] = { seen: 3, ok: 2, bad: 1 };
  s.achievements.first_word = 111;
  s.adventure.dragonWins = 2;
  s.adventure.wordEaterWins = 1;
  s.adventure.storySeen.intro = 1;
  s.adventure.discovered.items.ember_tip = 3;
  s.adventure.synergies.firestorm = 1;
  s.adventure.runs = 4;
  s.adventure.bestFloor = 9;
  s.cosmetics.hero = 'mei';
  const r = startRun(s, { heroId: 'mei', accountLevel: 10, seed: 42 });
  chooseBiome(r, 'bamboo');
  chooseNode(r, reachableNodes(r)[0].id); // into a battle
  r.items.push('ember_tip', 'heavy_hand');
  r.spells.push('huoqiu');
  r.ink = 77;
  return s;
}
const permanent = (s) => JSON.stringify({ words: s.words, gameWords: s.gameWords, profile: s.profile, achievements: s.achievements, cosmetics: s.cosmetics, settings: s.settings, a: { ...s.adventure, current: undefined, runs: undefined, abandoned: undefined, bestFloor: undefined, bestScore: undefined } });

test('a new run starts clean: base hero, signature spell only, empty pickup slot, no items or battle', () => {
  for (const heroId of Object.keys(HEROES)) {
    const s = playedSave();
    const r = startRun(s, { heroId, accountLevel: 10, seed: 7 });
    assert.equal(r.heroId, heroId);
    assert.deepEqual(r.spells, [HEROES[heroId].signature], 'signature + empty pickup slot');
    assert.deepEqual(r.items, []);
    assert.equal(r.phase, 'biome');
    assert.equal(r.battle ?? null, null, 'no stale battle');
    assert.equal(r.map ?? null, null, 'no stale route');
    assert.equal(r.floor, 0);
    assert.equal(r.ink, 0);
    assert.equal(r.v, RUN_VERSION);
    assert.equal(s.adventure.current, r, 'exactly one active run');
  }
});

test('abandoning (mid-battle) clears only the run and keeps every permanent thing', () => {
  const s = playedSave();
  assert.equal(activeRun(s).phase, 'battle');
  const before = permanent(s);
  assert.equal(abandonRun(s), true);
  assert.equal(s.adventure.current, null);
  assert.equal(activeRun(s), null, 'Continue / Abandon disappear');
  assert.equal(permanent(s), before, 'learning, unlocks, story, victories, discoveries untouched');
  assert.equal(s.adventure.runs, 5, 'lifetime stats only grow');
  assert.equal(s.adventure.abandoned, 1);
  assert.equal(abandonRun(s), false, 'abandoning twice is harmless');
});

test('starting a new run over an unfinished one replaces it and keeps permanent progress', () => {
  const s = playedSave();
  const before = permanent(s);
  const old = s.adventure.current;
  const r = startRun(s, { heroId: 'lei', accountLevel: 12, seed: 99 });
  assert.notEqual(r, old);
  assert.equal(permanent(s), before);
  assert.deepEqual(r.items, [], 'no items carried over');
  assert.deepEqual(r.spells, ['leiting'], 'no pickup spell carried over');
});

test('finishing a run records it and clears it', () => {
  const s = playedSave();
  finishRun(s, true);
  assert.equal(s.adventure.current, null);
  assert.equal(s.adventure.wins, 1);
});

test('an abandoned run does not come back after a reload (save → JSON → load)', () => {
  const s = playedSave();
  abandonRun(s);
  const reloaded = hydrate(JSON.parse(JSON.stringify(s)));
  assert.equal(reloaded.adventure.current, null);
  assert.equal(reloaded.words['你好'].ok, 6, 'learning progress reloads intact');
});

test('a continued run reloads exactly as saved', () => {
  const s = playedSave();
  const r = s.adventure.current;
  const reloaded = hydrate(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(reloaded.adventure.current, JSON.parse(JSON.stringify(r)));
});
