// Roguelike run state machine. Pure functions that mutate a plain, JSON-serialisable run
// object (saved after every step, so a run can be resumed after closing the app).
//
// phases: map -> quiz -> (pick)* -> battle -> reward -> map ... -> boss -> victory | defeat
//         map -> rest | treasure | quiz(lesson) -> (pick) -> map
import { RUN, SCORE } from './data/balance.js';
import { UPGRADES, SYNERGIES, RARITY_WEIGHT, activeSynergies } from './data/upgrades.js';
import { GROUPS } from './data/enemies.js';
import { makeRng, buildHero } from './combat.js';
import { heroDef, DEFAULT_HERO } from './data/heroes.js';

export const NODE_INFO = {
  battle: { py: 'zhàn dòu', zh: '战斗', name: 'Battle', desc: 'Answer 3 questions, then fight.' },
  elite: { py: 'jīng yīng', zh: '精英', name: 'Elite', desc: 'Tougher foe, rare treasure.' },
  rest: { py: 'gōu huǒ', zh: '篝火', name: 'Campfire', desc: 'Heal, or meditate on words for power.' },
  treasure: { py: 'bǎo xiāng', zh: '宝箱', name: 'Treasure', desc: 'A free upgrade, rarer finds.' },
  lesson: { py: 'lǎo shī', zh: '老师', name: 'Teacher', desc: '5 questions: heal and gain sparks.' },
  boss: { py: 'dà wáng', zh: '大王', name: 'Boss', desc: 'The ink dragon awaits.' },
};

/** A fresh RNG for each random decision, derived from the run seed and a counter. */
function rng(run) {
  run.rngN = (run.rngN || 0) + 1;
  return makeRng(run.seed * 7919 + run.rngN * 104729);
}

function weighted(r, items, weightOf) {
  const total = items.reduce((s, x) => s + weightOf(x), 0);
  let roll = r() * total;
  for (const x of items) {
    roll -= weightOf(x);
    if (roll <= 0) return x;
  }
  return items[items.length - 1];
}

export function generateMap(seed) {
  const r = makeRng(seed);
  const floors = [];
  for (let f = 1; f < RUN.floors; f++) {
    const types = Object.keys(RUN.nodeWeights).filter(
      (t) => !(t === 'elite' && f < RUN.eliteFromFloor) && !(t === 'rest' && f < RUN.restFromFloor),
    );
    const count = f === 1 ? 2 : r() < 0.45 ? 2 : 3;
    const opts = [];
    while (opts.length < count) {
      const t = weighted(r, types, (x) => RUN.nodeWeights[x]);
      if (opts.filter((o) => o === t).length < (t === 'battle' ? 2 : 1)) opts.push(t);
    }
    if (!opts.some((t) => t === 'battle' || t === 'elite')) opts[0] = 'battle';
    if (f === 1) opts.splice(0, 2, 'battle', 'lesson');
    floors.push(opts);
  }
  floors.push(['boss']);
  return floors;
}

export function newRun({ seed = (Date.now() % 1e9) | 0, accountLevel = 1, heroId = DEFAULT_HERO } = {}) {
  const hero = buildHero({ heroId, accountLevel });
  return {
    seed,
    heroId,
    startedAt: Date.now(),
    floor: 1,
    hp: hero.maxHp,
    upgrades: [],
    sparks: 0,
    map: generateMap(seed),
    phase: 'map',
    node: null,
    quiz: null,
    choices: null,
    afterPick: null,
    battle: null,
    reward: null,
    bonusPick: false,
    inspirations: [], // [{wordId, element}] from correct answers since the last pick
    stats: { correct: 0, wrong: 0, kills: 0, dealt: 0, battles: 0, xp: 0, words: [] },
    synergiesSeen: [],
  };
}

export function heroFor(run, accountLevel, blessings = []) {
  return buildHero({ heroId: run.heroId || DEFAULT_HERO, upgrades: run.upgrades, accountLevel, blessings });
}

export function maxHpOf(run, accountLevel) {
  return heroFor(run, accountLevel).maxHp;
}

export function enemiesFor(type, floor, r) {
  const band = GROUPS[type].find((g) => floor >= g.floors[0] && floor <= g.floors[1]) || GROUPS[type][GROUPS[type].length - 1];
  return band.sets[Math.floor(r() * band.sets.length)];
}

// ---- transitions ---------------------------------------------------------------------

export function chooseNode(run, index) {
  const type = run.map[run.floor - 1][index];
  run.node = { type, index };
  if (type === 'rest') run.phase = 'rest';
  else if (type === 'treasure') run.phase = 'treasure';
  else run.phase = 'prequiz'; // UI generates questions (needs the learner's save) then calls startQuiz
  return type;
}

/** tasks: [{id, kind:'intro'|'quiz', mode}] chosen by learn/adventurePicker.js */
export function startQuiz(run, kind, tasks) {
  run.quiz = { kind, tasks, i: 0, results: [] };
  run.phase = 'quiz';
}

/** Returns { healed } (HP restored by passives, if any). */
export function answerQuiz(run, { wordId, element, correct }, accountLevel = 1) {
  const q = run.quiz;
  q.results.push({ wordId, element, correct });
  let healed = 0;
  const passive = heroDef(run.heroId).passive;
  if (correct && passive.id === 'good_cheer') {
    const maxHp = maxHpOf(run, accountLevel);
    healed = Math.min(maxHp - run.hp, Math.round(maxHp * passive.healPct));
    run.hp += healed;
  }
  if (!run.stats.words.includes(wordId)) run.stats.words.push(wordId);
  if (correct) {
    run.sparks += 1;
    run.stats.correct += 1;
    run.inspirations.push({ wordId, element });
    if (run.inspirations.length > 8) run.inspirations.shift();
  } else run.stats.wrong += 1;
  return { healed };
}

export function nextQuizTask(run) {
  run.quiz.i += 1;
}

export function finishQuiz(run, accountLevel) {
  const q = run.quiz;
  const correct = q.results.filter((x) => x.correct);
  const wrong = q.results.length - correct.length;
  const passive = heroDef(run.heroId).passive;
  if (passive.perfectSparks && wrong === 0 && q.results.length) {
    run.sparks += passive.perfectSparks;
    q.perfectBonus = passive.perfectSparks;
  }
  if (q.kind === 'lesson') {
    const maxHp = maxHpOf(run, accountLevel);
    run.hp = Math.min(maxHp, run.hp + Math.round(maxHp * RUN.lessonHealPct * correct.length));
    if (wrong === 0 && q.results.length) run.sparks += 2;
    return goPickOr(run, 'map', accountLevel);
  }
  if (q.kind === 'rest') return goPickOr(run, 'map', accountLevel);
  // battle / elite / boss
  const r = rng(run);
  run.battle = {
    type: q.kind,
    enemies: enemiesFor(q.kind, run.floor, r),
    seed: Math.floor(r() * 1e9),
    empower: wrong * RUN.wrongAnswerEnemyBuff,
    blessings: correct.map((x) => x.element || 'none'),
  };
  return goPickOr(run, 'battle', accountLevel);
}

function goPickOr(run, after, accountLevel) {
  run.quiz = null;
  if (run.sparks >= RUN.sparksPerUpgrade) {
    run.choices = upgradeChoices(run, accountLevel);
    run.choicesFree = false;
    run.afterPick = after;
    run.phase = 'pick';
  } else enterPhase(run, after);
}

function enterPhase(run, phase) {
  if (phase === 'map') advanceFloor(run);
  else run.phase = phase;
}

function advanceFloor(run) {
  run.floor += 1;
  run.node = null;
  run.battle = null;
  run.reward = null;
  run.phase = 'map';
}

/** Weighted draft of 3 upgrades, biased toward the elements of words just answered. */
export function upgradeChoices(run, accountLevel, { rareBoost = false } = {}) {
  const r = rng(run);
  const owned = Object.fromEntries(run.upgrades.map((u) => [u.id, u.level]));
  const inspCount = {};
  for (const i of run.inspirations) if (i.element) inspCount[i.element] = (inspCount[i.element] || 0) + 1;
  const ownedIds = new Set(Object.keys(owned));
  const hasAbility = Boolean(heroDef(run.heroId).abilities?.length) || run.upgrades.some((o) => UPGRADES[o.id]?.mods(1).abilities?.length);
  const eligible = Object.entries(UPGRADES).filter(
    ([id, u]) => (u.unlockLevel || 1) <= accountLevel && (owned[id] || 0) < u.maxLevel && (!u.needsAbility || hasAbility),
  );
  const weightOf = ([id, u]) => {
    let w = RARITY_WEIGHT[u.rarity];
    if (rareBoost && u.rarity !== 'common') w *= 2.2;
    if (owned[id]) w *= 1.3;
    w *= 1 + 2.5 * (inspCount[u.element] || 0);
    const completes = Object.values(SYNERGIES).some(
      (s) => s.requires.includes(id) && s.requires.every((q) => q === id || ownedIds.has(q)),
    );
    if (completes) w *= 1.8;
    return w;
  };
  const picks = [];
  const pool = eligible.slice();
  // guarantee one option inspired by an answered word when possible
  const inspiredPool = pool.filter(([, u]) => inspCount[u.element]);
  if (inspiredPool.length) {
    const p = weighted(r, inspiredPool, weightOf);
    picks.push(p);
    pool.splice(pool.indexOf(p), 1);
  }
  while (picks.length < 3 && pool.length) {
    const p = weighted(r, pool, weightOf);
    picks.push(p);
    pool.splice(pool.indexOf(p), 1);
  }
  return picks.map(([id, u]) => {
    const insp = [...run.inspirations].reverse().find((i) => i.element === u.element);
    const nextIds = [...ownedIds, id];
    const synergy = Object.entries(SYNERGIES).find(
      ([sid, s]) => s.requires.includes(id) && s.requires.every((q) => nextIds.includes(q)) && !activeSynergies(run.upgrades).includes(sid),
    );
    return { id, level: (owned[id] || 0) + 1, inspiredBy: insp?.wordId || null, synergy: synergy?.[0] || null };
  });
}

/** Returns newly activated synergy ids. */
export function pickUpgrade(run, id, accountLevel) {
  const before = activeSynergies(run.upgrades);
  const maxBefore = maxHpOf(run, accountLevel);
  const owned = run.upgrades.find((u) => u.id === id);
  if (owned) owned.level += 1;
  else run.upgrades.push({ id, level: 1 });
  const maxAfter = maxHpOf(run, accountLevel);
  // max HP gains also heal by the same amount
  if (maxAfter > maxBefore) run.hp = Math.min(maxAfter, run.hp + (maxAfter - maxBefore));
  if (!run.choicesFree) run.sparks -= RUN.sparksPerUpgrade;
  run.inspirations = [];
  run.choices = null;
  const fresh = activeSynergies(run.upgrades).filter((s) => !before.includes(s));
  run.synergiesSeen.push(...fresh);
  if (!run.choicesFree && run.sparks >= RUN.sparksPerUpgrade) {
    run.choices = upgradeChoices(run, accountLevel);
    return fresh;
  }
  const after = run.afterPick;
  run.afterPick = null;
  run.choicesFree = false;
  enterPhase(run, after);
  return fresh;
}

export function skipPick(run) {
  run.choices = null;
  const after = run.afterPick;
  run.afterPick = null;
  run.choicesFree = false;
  enterPhase(run, after);
}

export function resolveBattle(run, sim) {
  run.hp = sim.heroHp;
  run.stats.kills += sim.kills;
  run.stats.dealt += sim.dealt;
  run.stats.battles += 1;
  const type = run.battle.type;
  if (sim.result !== 'win') {
    run.phase = 'defeat';
    return;
  }
  if (type === 'boss') {
    run.phase = 'victory';
    return;
  }
  run.bonusPick = type === 'elite';
  run.reward = { type, kills: sim.kills, duration: sim.duration };
  run.phase = 'reward';
}

export function continueAfterReward(run, accountLevel) {
  const maxHp = maxHpOf(run, accountLevel);
  run.hp = Math.min(maxHp, run.hp + Math.round(maxHp * RUN.victoryHealPct));
  if (run.bonusPick) {
    run.bonusPick = false;
    openTreasure(run, accountLevel);
    return;
  }
  advanceFloor(run);
}

export function openTreasure(run, accountLevel) {
  run.choices = upgradeChoices(run, accountLevel, { rareBoost: true });
  run.choicesFree = true;
  run.afterPick = 'map';
  run.phase = 'pick';
}

export function restHeal(run, accountLevel) {
  const maxHp = maxHpOf(run, accountLevel);
  run.hp = Math.min(maxHp, run.hp + Math.round(maxHp * RUN.restHealPct));
  advanceFloor(run);
}

export function scoreOf(run) {
  const floorsCleared = run.phase === 'victory' ? RUN.floors : run.floor - 1;
  return (
    floorsCleared * SCORE.floor + run.stats.kills * SCORE.kill + run.stats.correct * SCORE.correct + (run.phase === 'victory' ? SCORE.boss : 0)
  );
}
