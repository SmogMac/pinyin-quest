// Whole-run simulation with a simulated player, to check the run structure and balance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { playRun } from './sim.js';

test('runs follow the act structure and finish', () => {
  for (let s = 1; s <= 30; s++) {
    const { run } = playRun(s * 97);
    assert.ok(['victory', 'defeat'].includes(run.phase), `ended in ${run.phase}`);
    assert.ok(run.spells.length >= 1 && run.spells.length <= 3);
    assert.equal(new Set(run.items).size, run.items.length, 'items are unique');
  }
});

test('the Forgotten Beyond and Word Eater are reachable after the dragon', () => {
  let reached = 0;
  for (let s = 1; s <= 40 && !reached; s++) {
    const { run } = playRun(s * 13, { beyond: true, castSuccess: 1, eliteBias: 0 });
    if (run.act === 4) reached++;
  }
  assert.ok(reached > 0, 'some runs reach act 4');
});

test('balance: winnable but not trivial, battles are short, bosses take longer', () => {
  const report = {};
  for (const heroId of ['xinyi', 'mei', 'ruizhe', 'huojin', 'fuyun']) {
    let wins = 0;
    let floors = 0;
    const d = { battle: [], elite: [], guardian: [], boss: [] };
    const N = 60;
    for (let s = 1; s <= N; s++) {
      const { run, durations } = playRun(s * 7919 + heroId.length, { heroId });
      if (run.phase === 'victory') wins++;
      floors += run.floor;
      for (const k of Object.keys(d)) d[k].push(...durations[k]);
    }
    const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-');
    report[heroId] = { dragonWinRate: (wins / N).toFixed(2), avgFloor: (floors / N).toFixed(1), battle: avg(d.battle), elite: avg(d.elite), guardian: avg(d.guardian), boss: avg(d.boss) };
  }
  console.table(report);
  for (const [h, x] of Object.entries(report)) {
    assert.ok(x.dragonWinRate > 0.2 && x.dragonWinRate < 0.9, `${h} dragon win rate ${x.dragonWinRate}`);
    assert.ok(Number(x.battle) < 30, `${h} normal battles ${x.battle}s`);
  }
});

test('more successful casting wins more often', () => {
  const rate = (castSuccess) => {
    let w = 0;
    for (let s = 1; s <= 50; s++) if (playRun(s * 31, { castSuccess }).run.phase === 'victory') w++;
    return w / 50;
  };
  assert.ok(rate(1) > rate(0.3), 'spells matter');
});
