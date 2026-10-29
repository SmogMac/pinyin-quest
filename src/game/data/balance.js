// All numbers that tune difficulty live here.

// Limited permanent progression: +2 max HP per account level, capped.
export const ACCOUNT_HP_PER_LEVEL = 2;
export const ACCOUNT_HP_CAP = 30;

// Each passive item held adds this much basic-attack damage (keeps passive-only builds viable).
export const COLLECTION_ATK_PER_ITEM = 0.06;

export const RUN = {
  // rows per act (the last row of acts 1-2 is the biome guardian; act 3/4 end with the boss)
  actRows: { 1: 6, 2: 6, 3: 3, 4: 4 },
  dragonWinsForBeyond: 3,
  victoryHealPct: 0.15, // after each won battle
  actHealPct: 1, // beating a guardian fully heals you for the next act
  restHealPct: 0.4,
  lessonHealPct: 0.04, // per correct answer at a teacher node
  inkPerBattle: [14, 22],
  inkPerElite: 40,
  inkPerCast: 3, // successful signature move
  inkPerAnswer: 8, // correct answer at teacher/rest/event nodes
  prices: { common: 55, rare: 90, epic: 150, heal: 40 },
  questions: { lesson: 5, rest: 3, event: 1 },
  maxNewWordsPerQuiz: 2, // new words are always taught first with a teaching card
};

export const SCALING = {
  hpPerFloor: 0.055,
  atkPerFloor: 0.04,
  defPerFloor: 0.2, // flat def added per floor
  // global knobs applied to every enemy (bosses use their own)
  enemyHp: 1.0,
  enemyAtk: 0.38,
  bossHp: 0.85,
  bossAtk: 0.56,
};

export const COMBAT = {
  dt: 0.05, // seconds per simulation tick
  defenseK: 60, // damage * K/(K + def*4)
  maxDuration: 150,
  maxDr: 0.7,
  maxDodge: 0.6,
  maxHookDepth: 6, // chain reactions stop recursing past this depth
  maxProcsPerStep: 400, // safety valve for absurd builds
  // positioning (world units; the camera maps the world onto the stage separately)
  worldW: 130, // battlefield width; the Hero Zone is the left half, the Enemy Zone the right
  zoneBuffer: 3, // Momentum hysteresis around the midpoint, so standing on the line can't flicker
  momentumAspd: 0.25, // attack speed while standing in the opposing zone
  kbDecay: 9, // knockback slides out smoothly over ~0.3s instead of teleporting
  kbRecover: 0.18, // seconds of recovery after a heavy knockback before moving/attacking again
  heavyKb: 3, // pushes at least this far stagger; lighter taps only nudge
  dodgeHop: 7, // distance a successful dodge hops back
  heroSpeed: 19, // base hero move speed (units/s)
  enemySpeedMult: 1.5, // enemy data speeds were tuned for the old, smaller field
  rangedReach: 1.2, // ranged attack ranges stretch with the wider field
  minGap: 11, // ground enemies never stand closer than this (about two-thirds of a body)
};

export const SCORE = { floor: 60, kill: 8, cast: 6, guardian: 200, boss: 500, wordeater: 1000 };
