// Whole-run simulation: plays many runs with a simulated learner to check balance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newRun, chooseNode, startQuiz, answerQuiz, finishQuiz, pickUpgrade, resolveBattle, continueAfterReward, restHeal, openTreasure, heroFor } from '../src/game/run.js';
import { simulateBattle, makeRng } from '../src/game/combat.js';
import { RUN } from '../src/game/data/balance.js';

const ELEMS = ['fire', 'water', 'wind', 'earth', 'light', 'shadow', 'life', 'might', 'arcane', 'focus', 'kin', null, null, null];

export function playRun(seed, accuracy, accountLevel = 1, heroId = 'xinyi') {
  const r = makeRng(seed);
  const run = newRun({ seed, accountLevel, heroId });
  const durations = [];
  for (let guard = 0; guard < 200; guard++) {
    if (run.phase === 'map') {
      const opts = run.map[run.floor - 1];
      const type = chooseNode(run, Math.floor(r() * opts.length));
      if (type === 'rest') {
        if (run.hp < heroFor(run, accountLevel).maxHp * 0.6) restHeal(run, accountLevel);
        else startQuiz(run, 'rest', [1, 2, 3]);
      } else if (type === 'treasure') openTreasure(run, accountLevel);
      else startQuiz(run, type, Array.from({ length: RUN.questions[type] }, (_, i) => i));
    } else if (run.phase === 'quiz') {
      for (const _ of run.quiz.tasks) answerQuiz(run, { wordId: 'x' + r(), element: ELEMS[Math.floor(r() * ELEMS.length)], correct: r() < accuracy }, accountLevel);
      finishQuiz(run, accountLevel);
    } else if (run.phase === 'pick') {
      pickUpgrade(run, run.choices[0].id, accountLevel);
    } else if (run.phase === 'battle') {
      const hero = heroFor(run, accountLevel, run.battle.blessings);
      const sim = simulateBattle({ hero, heroHp: run.hp, enemies: run.battle.enemies, floor: run.floor, seed: run.battle.seed, empower: run.battle.empower });
      durations.push([run.battle.type, sim.duration]);
      resolveBattle(run, sim);
    } else if (run.phase === 'reward') continueAfterReward(run, accountLevel);
    else break;
  }
  return { run, durations };
}

test('runs finish and balance is in a sensible band', () => {
  const report = {};
  for (const acc of [0.6, 0.8, 0.95]) {
    let wins = 0;
    let floors = 0;
    const durs = { battle: [], elite: [], boss: [] };
    const N = 150;
    for (let s = 1; s <= N; s++) {
      const { run, durations } = playRun(s * 31 + Math.round(acc * 100), acc);
      assert.ok(['victory', 'defeat'].includes(run.phase), `run ended in ${run.phase}`);
      if (run.phase === 'victory') wins++;
      floors += run.phase === 'victory' ? 10 : run.floor;
      for (const [t, d] of durations) durs[t].push(d);
    }
    const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-');
    report[acc] = { winRate: wins / N, avgFloor: (floors / N).toFixed(1), battleSec: avg(durs.battle), eliteSec: avg(durs.elite), bossSec: avg(durs.boss) };
  }
  console.table(report);
  assert.ok(report[0.95].winRate > report[0.6].winRate, 'better answers should win more');
  assert.ok(report[0.8].winRate > 0.2 && report[0.8].winRate < 0.9, `80% accuracy win rate ${report[0.8].winRate}`);
});

test('every hero is viable at 80% accuracy', () => {
  const report = {};
  for (const heroId of ['xinyi', 'mei', 'huohuo']) {
    let wins = 0;
    const N = 200;
    for (let s = 1; s <= N; s++) if (playRun(s * 17, 0.8, 3, heroId).run.phase === 'victory') wins++;
    report[heroId] = wins / N;
  }
  console.table(report);
  for (const [h, w] of Object.entries(report)) assert.ok(w > 0.3 && w < 0.85, `${h} win rate ${w}`);
});
