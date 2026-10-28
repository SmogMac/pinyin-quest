// Enemy definitions. Names are shown in pinyin (py) first, with Hanzi (zh) and English (name).
// `sprite` is a key in src/assets/manifest.js.
// Stats are at floor 1; balance.js scales them per floor (unless fixedStats).
// traits: poison {dps,dur} (attacks burn), drain (lifesteal), dodge, enrage {below, aspdMult},
//         abilities [{id, kind:'nuke'|'summon'|'shield', cd|atHp, mult, summon}]

export const ENEMIES = {
  slime: {
    py: 'shǐ lái mǔ', zh: '史莱姆', name: 'Slime', sprite: 'slime', tier: 1,
    stats: { maxHp: 75, atk: 4, def: 0, aspd: 0.8 },
    blurb: 'Wobbly and harmless. Mostly.',
  },
  sporecap: {
    py: 'mó gu', zh: '蘑菇', name: 'Mushroom', sprite: 'sporecap', tier: 1,
    stats: { maxHp: 78, atk: 3, def: 1, aspd: 0.75 },
    traits: { poison: { dps: 2, dur: 3 } },
    blurb: 'Its spores make you itchy (poison).',
  },
  bat: {
    py: 'biān fú', zh: '蝙蝠', name: 'Bat', sprite: 'bat', tier: 1,
    stats: { maxHp: 52, atk: 3, def: 0, aspd: 1.3 },
    traits: { dodge: 0.2 },
    blurb: 'Fast and hard to hit.',
  },
  goblin: {
    py: 'xiǎo yāo', zh: '小妖', name: 'Goblin', sprite: 'goblin', tier: 2,
    stats: { maxHp: 96, atk: 6, def: 2, aspd: 0.9, crit: 0.15 },
    blurb: 'Steals your brush and your homework.',
  },
  golem: {
    py: 'shí tou rén', zh: '石头人', name: 'Stone Golem', sprite: 'golem', tier: 2,
    stats: { maxHp: 140, atk: 8, def: 6, aspd: 0.5 },
    blurb: 'Slow, heavily armored.',
  },
  wisp: {
    py: 'guǐ huǒ', zh: '鬼火', name: 'Ghost Fire', sprite: 'wisp', tier: 3, elite: true,
    stats: { maxHp: 190, atk: 7, def: 2, aspd: 0.95 },
    traits: { drain: 0.4, abilities: [{ id: 'hex', kind: 'nuke', cd: 5, mult: 1.8 }] },
    blurb: 'Elite. Drains life and casts hexes.',
  },
  knight: {
    py: 'qí shì', zh: '骑士', name: 'Knight', sprite: 'knight', tier: 3, elite: true,
    stats: { maxHp: 240, atk: 8, def: 7, aspd: 0.7 },
    traits: { thorns: 0.15, abilities: [{ id: 'bulwark', kind: 'shield', cd: 6, mult: 2.5 }] },
    blurb: 'Elite. Thorny armor reflects damage; raises a bulwark.',
  },
  wyrm: {
    py: 'mò lóng', zh: '墨龙', name: 'Ink Dragon', sprite: 'wyrm', tier: 4, boss: true, fixedStats: true,
    stats: { maxHp: 800, atk: 11, def: 5, aspd: 0.65 },
    traits: {
      enrage: { below: 0.35, aspdMult: 1.6 },
      abilities: [
        { id: 'inkfire', kind: 'nuke', cd: 7, mult: 2.4 },
        { id: 'brood', kind: 'summon', atHp: 0.6, summon: 'bat' },
      ],
    },
    blurb: 'Boss. The ink dragon that erases words. Breathes inkfire, calls bats, enrages.',
  },
};

// Encounter groups by type and floor band. Each entry is a list of enemy ids.
export const GROUPS = {
  battle: [
    { floors: [1, 2], sets: [['slime'], ['bat'], ['sporecap'], ['slime', 'slime']] },
    { floors: [3, 5], sets: [['slime', 'bat'], ['sporecap', 'slime'], ['goblin'], ['golem'], ['bat', 'bat']] },
    { floors: [6, 9], sets: [['goblin', 'bat'], ['golem', 'sporecap'], ['goblin', 'goblin'], ['golem', 'slime', 'bat']] },
  ],
  elite: [
    { floors: [1, 5], sets: [['wisp'], ['knight']] },
    { floors: [6, 9], sets: [['wisp', 'bat'], ['knight', 'sporecap']] },
  ],
  boss: [{ floors: [10, 10], sets: [['wyrm']] }],
};
