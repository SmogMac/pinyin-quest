// Biomes (battlefields). Each one changes combat: starting terrain, periodic events, element
// modifiers and its own enemies. Acts pick from these; locked biomes need vocabulary.
//
// terrain: terrain states present all battle · events: periodic {kind, every, text}
// elementMods: damage multiplier by element (both sides) · reflect: chance enemy shots bounce back
// pools: enemy groups for battle / elite nodes · guardian: act boss · unlock: vocabulary (any one)

export const BIOMES = {
  bamboo: {
    py: 'zhú lín', zh: '竹林', en: 'Bamboo Forest', act: 1, theme: 'bamboo',
    desc: 'Gusts of wind push enemies and spread fire between them. Wind and fire +15%.',
    events: [{ kind: 'gust', every: 9, text: 'fēng · Gust' }],
    elementMods: { wind: 1.15, fire: 1.15 },
    pools: {
      battle: [['slime'], ['panda'], ['kite', 'slime'], ['bat', 'bat'], ['panda', 'kite'], ['slime', 'slime', 'kite']],
      elite: [['wisp'], ['knight']],
    },
    guardian: 'panda_king',
  },
  coast: {
    py: 'hǎi biān', zh: '海边', en: 'Coastal Ruins', act: 1, theme: 'coast',
    desc: 'Waves soak everyone (Wet). Lightning +20%, fire −15%.',
    events: [{ kind: 'wave', every: 7, text: 'hǎi làng · Wave' }],
    elementMods: { lightning: 1.2, fire: 0.85 },
    pools: {
      battle: [['crab'], ['slime', 'slime'], ['crab', 'slime'], ['turtle'], ['bat', 'crab'], ['turtle', 'slime']],
      elite: [['knight'], ['wisp', 'crab']],
    },
    guardian: 'crab_queen',
  },
  caves: {
    py: 'shān dòng', zh: '山洞', en: 'Earthen Caves', act: 1, theme: 'caves',
    desc: 'The ground trembles (random stuns). Earth +20%.',
    terrain: ['unstable'],
    elementMods: { earth: 1.2 },
    pools: {
      battle: [['golem'], ['bat', 'bat'], ['turtle', 'bat'], ['golem', 'goblin'], ['goblin', 'goblin'], ['sporecap', 'bat'], ['zombie', 'bat']],
      elite: [['knight'], ['wisp']],
    },
    guardian: 'stone_king',
  },
  frozen: {
    py: 'xuě shān', zh: '雪山', en: 'Frozen Mountain', act: 2, theme: 'frozen', unlock: ['冷', '雪', '冬天'],
    desc: 'Frozen ground slows and Chills. Fire melts it into water, which lightning can electrify. Ice +20%.',
    terrain: ['frozen'],
    events: [{ kind: 'snow', every: 11, text: 'xià xuě · Snow' }],
    elementMods: { ice: 1.2 },
    pools: {
      battle: [['snowman'], ['snowman', 'bat'], ['golem', 'snowman'], ['snowman', 'snowman'], ['kite', 'snowman']],
      elite: [['knight', 'snowman'], ['wisp', 'snowman']],
    },
    guardian: 'frost_matriarch',
  },
  thunder: {
    py: 'léi yǔ', zh: '雷雨', en: 'Thunder Highlands', act: 2, theme: 'thunder', unlock: ['电', '雨'],
    desc: 'Lightning strikes the battlefield (more often enemies). Wet ground becomes Electrified. Lightning +25%.',
    events: [{ kind: 'lightning', every: 6, text: 'dǎ léi · Thunder' }],
    elementMods: { lightning: 1.25 },
    pools: {
      battle: [['thunderbird'], ['thunderbird', 'goblin'], ['golem', 'thunderbird'], ['kite', 'thunderbird'], ['slime', 'slime', 'thunderbird']],
      elite: [['knight', 'thunderbird'], ['wisp', 'thunderbird']],
    },
    guardian: 'thunder_qilin',
  },
  marsh: {
    py: 'zhǎo zé', zh: '沼泽', en: 'Shadow Marsh', act: 2, theme: 'marsh', unlock: ['黑', '夜'],
    desc: 'Corrupted ground: healing −40%, Dark +30%, shadows regenerate. Light purifies it.',
    terrain: ['corrupted'],
    events: [{ kind: 'mist', every: 12, text: 'mí wù · Mist' }],
    elementMods: { dark: 1.15 },
    pools: {
      battle: [['shadow'], ['shadow', 'bat'], ['sporecap', 'shadow'], ['zombie', 'zombie'], ['shadow', 'goblin'], ['zombie', 'sporecap']],
      elite: [['wisp', 'shadow'], ['knight', 'shadow']],
    },
    guardian: 'bog_witch',
  },
  temple: {
    py: 'sì miào', zh: '寺庙', en: 'Lantern Temple', act: 2, theme: 'temple', unlock: ['光', '灯', '阳光'],
    desc: 'Blessed ground: light and healing +25%. Polished floors reflect 20% of enemy shots.',
    terrain: ['blessed'],
    reflect: 0.2,
    elementMods: { light: 1.1 },
    pools: {
      battle: [['lantern'], ['lantern', 'turtle'], ['lantern', 'lantern'], ['zombie', 'lantern'], ['goblin', 'lantern']],
      elite: [['knight', 'lantern'], ['wisp']],
    },
    guardian: 'lantern_king',
  },
  lair: {
    py: 'mò lóng dòng', zh: '墨龙洞', en: "Ink Dragon's Lair", act: 3, theme: 'inklair',
    desc: 'Ink rains down and Curses you. The dragon waits at the end.',
    events: [{ kind: 'inkrain', every: 9, text: 'mò yǔ · Ink rain' }],
    pools: {
      battle: [['goblin', 'bat'], ['wisp', 'goblin'], ['golem', 'goblin', 'bat'], ['shadow', 'goblin'], ['zombie', 'zombie', 'bat']],
      elite: [['wisp', 'knight']],
    },
    boss: 'wyrm',
  },
  beyond: {
    py: 'yí wàng zhī dì', zh: '遗忘之地', en: 'The Forgotten Beyond', act: 4, theme: 'beyond', secretUnlock: 'dragonWins3',
    desc: 'A land of lost meanings. Tremors, mist and ink rain. The Word Eater lives here.',
    terrain: ['unstable'],
    events: [{ kind: 'mist', every: 10, text: 'mí wù · Mist' }, { kind: 'inkrain', every: 11, text: 'mò yǔ · Ink rain' }],
    pools: {
      battle: [['wraith', 'wraith', 'shadow'], ['knight', 'wraith'], ['wisp', 'thunderbird'], ['snowman', 'crab', 'wraith']],
      elite: [['knight', 'wisp'], ['thunder_qilin']],
    },
    boss: 'wordeater',
  },
};

export const ACT_BIOMES = {
  1: ['bamboo', 'coast', 'caves'],
  2: ['frozen', 'thunder', 'marsh', 'temple'],
  3: ['lair'],
  4: ['beyond'],
};
