// All numbers that tune difficulty live here.

export const HERO_BASE = {
  maxHp: 120,
  atk: 10,
  def: 2,
  aspd: 0.9, // attacks per second
  crit: 0.05,
  critDmg: 1.5,
  dodge: 0,
};

// Limited permanent progression: +2 max HP per account level, capped.
export const ACCOUNT_HP_PER_LEVEL = 2;
export const ACCOUNT_HP_CAP = 30;

export const RUN = {
  floors: 10, // floor 10 is the boss
  questions: { battle: 3, elite: 4, boss: 5, lesson: 5, rest: 3 },
  sparksPerUpgrade: 2, // correct answers needed per upgrade pick
  restHealPct: 0.35,
  lessonHealPct: 0.04, // per correct answer in a learning challenge
  victoryHealPct: 0.15, // small heal after each won battle
  wrongAnswerEnemyBuff: 0.08, // enemy +8% attack per wrong answer (that battle only)
  maxNewWordsPerQuiz: 2, // new words are always taught first with a teaching card
  nodeWeights: { battle: 44, elite: 14, rest: 12, treasure: 12, lesson: 18 },
  eliteFromFloor: 3,
  restFromFloor: 3,
};

export const SCALING = {
  hpPerFloor: 0.13,
  atkPerFloor: 0.07,
  defPerFloor: 0.25, // flat def added per floor
};

export const COMBAT = {
  dt: 0.05, // seconds per simulation tick
  defenseK: 60, // damage * K/(K + def*4)
  enrageAfter: 28, // seconds; enemies then gain +12% attack per second
  bossEnrageAfter: 55,
  enrageRate: 0.12,
  maxDuration: 90,
  burnTick: 0.5,
  maxDr: 0.6,
  maxDodge: 0.5,
};

export const SCORE = { floor: 100, kill: 10, correct: 5, boss: 500 };
