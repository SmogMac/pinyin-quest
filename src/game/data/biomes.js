// Biomes (battlefields, called maps in the game). Each one changes combat: starting terrain,
// periodic events, element modifiers and its own enemies. Every act has three maps; a run picks one
// per act at random when it starts (hidden until the act begins), so a run is one of 27 journeys.
//
// terrain: terrain states present all battle · events: periodic {kind, every, text}
// elementMods: damage multiplier by element (both sides) · reflect: chance enemy shots bounce back
// pools: enemy groups for battle / elite nodes · guardian: act boss · boss: final boss (acts 3, 4)

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
    py: 'xuě shān', zh: '雪山', en: 'Frozen Mountain', act: 2, theme: 'frozen',
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
    py: 'léi yǔ', zh: '雷雨', en: 'Thunder Highlands', act: 2, theme: 'thunder',
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
    py: 'zhǎo zé', zh: '沼泽', en: 'Shadow Marsh', act: 2, theme: 'marsh',
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
  // ----------------------------------------------------------- act 3: the Dragon's Dominion
  // every act-3 map ends with the Ink Dragon
  temple: {
    py: 'dēng lóng sì', zh: '灯笼寺', en: 'Lantern Temple', act: 3, theme: 'temple',
    desc: 'Blessed ground: light and healing +25%. Polished floors reflect 20% of enemy shots. The dragon waits behind the last gate.',
    terrain: ['blessed'],
    reflect: 0.2,
    elementMods: { light: 1.1 },
    pools: {
      battle: [['lantern', 'lantern'], ['lantern', 'turtle'], ['zombie', 'zombie', 'lantern'], ['goblin', 'lantern', 'bat'], ['ink_knight']],
      elite: [['lantern_king'], ['knight', 'lantern'], ['wisp', 'zombie']],
    },
    boss: 'wyrm',
  },
  volcano: {
    py: 'huǒ shān', zh: '火山', en: 'Burning Highlands', act: 3, theme: 'volcano',
    desc: 'The ground erupts under random fighters (fire damage and Burn). Fire +25%, ice −20%. The dragon waits at the summit.',
    events: [{ kind: 'eruption', every: 7, text: 'pēn fā · Eruption' }],
    elementMods: { fire: 1.25, ice: 0.8 },
    pools: {
      battle: [['ember_imp', 'cinder_bat'], ['magma_golem'], ['ember_imp', 'ember_imp'], ['magma_golem', 'cinder_bat'], ['cinder_bat', 'cinder_bat', 'ember_imp']],
      elite: [['magma_golem', 'ember_imp'], ['knight', 'cinder_bat'], ['wisp', 'ember_imp']],
    },
    boss: 'wyrm',
  },
  lair: {
    py: 'mò rǎn shān gǔ', zh: '墨染山谷', en: 'Ink-Corrupted Valley', act: 3, theme: 'inklair',
    desc: 'Ink rains down and Curses you; the corrupted ground lets shadows regenerate. The dragon’s lair is at the valley’s end.',
    terrain: ['corrupted'],
    events: [{ kind: 'inkrain', every: 9, text: 'mò yǔ · Ink rain' }],
    pools: {
      battle: [['goblin', 'bat'], ['shadow', 'goblin'], ['ink_knight', 'bat'], ['shadow', 'shadow'], ['zombie', 'zombie', 'bat']],
      elite: [['wisp', 'knight'], ['ink_knight', 'shadow']],
    },
    boss: 'wyrm',
  },
  beyond: {
    py: 'yí wàng zhī dì', zh: '遗忘之地', en: 'The Forgotten Beyond', act: 4, theme: 'beyond', secretUnlock: 'dragonWins3',
    desc: 'Torn scrolls, fading ink and drifting characters: a land of lost meanings. Tremors, mist and ink rain. The Word Eater lives here.',
    terrain: ['unstable'],
    events: [{ kind: 'mist', every: 10, text: 'mí wù · Mist' }, { kind: 'inkrain', every: 11, text: 'mò yǔ · Ink rain' }],
    pools: {
      battle: [['wraith', 'wraith', 'shadow'], ['knight', 'wraith'], ['wisp', 'thunderbird'], ['snowman', 'crab', 'wraith']],
      elite: [['knight', 'wisp'], ['thunder_qilin']],
    },
    boss: 'wordeater',
  },
};

/** The act names shown when an act begins. */
export const ACTS = {
  1: { py: 'yí wàng jiāo yě', zh: '遗忘郊野', en: 'The Forgotten Outskirts' },
  2: { py: 'pò suì zhī dì', zh: '破碎之地', en: 'The Fractured Lands' },
  3: { py: 'lóng zhī lǐng yù', zh: '龙之领域', en: "The Dragon's Dominion" },
  4: { py: 'tūn zì zhī lù', zh: '吞字之路', en: 'The Word Eater’s Road' },
};

export const ACT_BIOMES = {
  1: ['bamboo', 'coast', 'caves'],
  2: ['frozen', 'thunder', 'marsh'],
  3: ['temple', 'volcano', 'lair'],
  4: ['beyond'],
};
