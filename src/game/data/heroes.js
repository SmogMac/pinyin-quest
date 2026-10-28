// Playable heroes. `sprite` is a key in src/assets/manifest.js. Names are shown in pinyin first.
// Each passive is implemented by id in combat.js (battle effects) or run.js (quiz effects);
// its numbers live here so they can be tuned without touching the engine.

export const HEROES = {
  xinyi: {
    py: 'Xīn Yí', zh: '欣怡', en: 'Xin Yi', title: 'Cheerful Wanderer', sprite: 'xinyi',
    blurb: 'Always smiling, always learning. Her good mood is contagious, and it keeps her on her feet.',
    stats: { maxHp: 120, atk: 10, def: 2, aspd: 0.9, crit: 0.05, critDmg: 1.5, dodge: 0 },
    passive: {
      id: 'good_cheer', py: 'kāi xīn', zh: '开心', en: 'Good Cheer',
      desc: 'Every correct answer heals her 4% HP. Answer a whole quiz without mistakes for +1 bonus spark.',
      healPct: 0.04, perfectSparks: 1,
    },
    unlock: null,
  },
  mei: {
    py: 'Méi', zh: '梅', en: 'Mei', title: 'Silent Blade', sprite: 'mei',
    blurb: 'A quiet swordswoman. She strikes first, and every spell she weaves sharpens her blade.',
    stats: { maxHp: 100, atk: 12, def: 1, aspd: 0.85, crit: 0.1, critDmg: 1.6, dodge: 0.05 },
    passive: {
      id: 'plum_blossom', py: 'méi huā', zh: '梅花', en: 'Plum Blossom',
      desc: 'Opens every battle with a sword draw (bá dāo) for 200% damage. Each ability she casts makes her next attack a guaranteed crit that also cuts every other enemy for 50%.',
      openerMult: 2, splash: 0.5,
    },
    unlock: { level: 3, text: 'Reach account level 3' },
  },
  ruizhe: {
    py: 'Ruì Zhé', zh: '睿哲', en: 'Ruizhe', title: 'Nervous Scholar', sprite: 'ruizhe',
    blurb: 'Has read every book and is terrified of all of them. Fights with scrolls, and panics brilliantly.',
    stats: { maxHp: 105, atk: 8, def: 2, aspd: 0.9, crit: 0.05, critDmg: 1.5, dodge: 0 },
    // Innate ability: every hero def may list abilities it always has (same shape as upgrade abilities)
    abilities: [{ id: 'scroll', kind: 'damage', cd: 4, amount: 12, target: 'front', element: 'arcane' }],
    passive: {
      id: 'nervous_genius', py: 'jǐn zhāng', zh: '紧张', en: 'Nervous Genius',
      desc: 'Throws a scroll every 4s (12 damage). Well-read: each different element among his upgrades makes all his abilities 10% stronger. Panic: the first time he drops below half HP in a battle, he casts every ability at once and attacks 30% faster.',
      perElement: 0.1, panicBelow: 0.5, panicAspd: 0.3,
    },
    unlock: { level: 5, text: 'Reach account level 5' },
  },
  huohuo: {
    py: 'Huǒ Huǒ', zh: '火火', en: 'Huo Huo', title: 'Ember Apprentice', sprite: 'hero', usesRobes: true,
    blurb: 'A tiny pyromancer with a very big hat. Loves anything that burns.',
    stats: { maxHp: 110, atk: 9, def: 2, aspd: 1.0, crit: 0.05, critDmg: 1.5, dodge: 0 },
    passive: {
      id: 'kindling', py: 'diǎn huǒ', zh: '点火', en: 'Kindling',
      desc: 'Every 4th attack is a fire bolt for double damage that sets the target burning. Blessings from fire words count twice.',
      every: 4, mult: 2, burn: { dps: 3, dur: 3 },
    },
    unlock: { level: 8, text: 'Reach account level 8' },
  },
};

export const DEFAULT_HERO = 'xinyi';
export const heroDef = (id) => HEROES[id] || HEROES[DEFAULT_HERO];
