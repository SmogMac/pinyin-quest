// Hero passives. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHero, simulateBattle } from '../src/game/combat.js';
import { newRun, startQuiz, answerQuiz, finishQuiz } from '../src/game/run.js';

const sim = (heroId, upgrades, enemies, floor = 3, seed = 9) => {
  const hero = buildHero({ heroId, upgrades });
  return simulateBattle({ hero, heroHp: hero.maxHp, enemies, floor, seed });
};

test('Xin Yi (Good Cheer): correct answers heal, perfect quiz grants a bonus spark', () => {
  const run = newRun({ heroId: 'xinyi' });
  run.hp = 50;
  startQuiz(run, 'battle', [1, 2, 3]);
  const r = answerQuiz(run, { wordId: 'a', element: null, correct: true });
  assert.equal(r.healed, Math.round(120 * 0.04));
  assert.equal(run.hp, 50 + r.healed);
  answerQuiz(run, { wordId: 'b', element: null, correct: true });
  answerQuiz(run, { wordId: 'c', element: null, correct: true });
  finishQuiz(run, 1);
  assert.equal(run.sparks, 4, '3 correct + 1 perfect bonus');
  const plain = newRun({ heroId: 'mei' });
  startQuiz(plain, 'battle', [1]);
  assert.equal(answerQuiz(plain, { wordId: 'a', correct: true }).healed, 0, 'other heroes do not heal from answers');
});

test('Mei (Plum Blossom): opens with a sword draw; abilities empower a splashing crit', () => {
  const r = sim('mei', [{ id: 'fireball', level: 1 }], ['slime', 'bat', 'slime']);
  const opener = r.events.find((e) => e.type === 'cast' && e.ability === 'iaido');
  assert.ok(opener && opener.t < 0.5, 'opener fires at the start');
  const cut = r.events.find((e) => e.type === 'cast' && e.ability === 'plum_cut');
  assert.ok(cut, 'plum cut happens after an ability');
  const fireballT = r.events.find((e) => e.type === 'cast' && e.ability === 'fireball').t;
  assert.ok(cut.t > fireballT);
  assert.ok(!sim('xinyi', [], ['slime']).events.some((e) => e.ability === 'iaido'));
});

test('Huo Huo (Kindling): every 4th attack is a burning fire bolt; fire blessings count twice', () => {
  const r = sim('huohuo', [], ['golem'], 2);
  const bolts = r.events.filter((e) => e.type === 'cast' && e.ability === 'kindling');
  const swings = r.events.filter((e) => e.type === 'attack' && e.src === 'hero');
  assert.ok(bolts.length >= 1);
  assert.ok(Math.abs(swings.length / bolts.length - 3) <= 1, 'roughly 3 swings per bolt');
  const once = buildHero({ heroId: 'xinyi', blessings: ['fire'] });
  const twice = buildHero({ heroId: 'huohuo', blessings: ['fire'] });
  assert.equal(once.atk - 10, 3);
  assert.equal(twice.atk - 9, 6);
});
