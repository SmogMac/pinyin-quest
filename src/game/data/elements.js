// Elements, status effects, elemental reactions and battlefield terrain.
// Everything here is data; the combat engine (src/game/combat.js) interprets it.

// The eight combat elements (+ physical). Names are shown pinyin-first for passive learning.
export const ELEMENTS = {
  fire: { py: 'huǒ', zh: '火', name: 'Fire', color: '#ff7a3d', glow: '#ffd36b' },
  ice: { py: 'bīng', zh: '冰', name: 'Ice', color: '#7fe3ff', glow: '#e3fbff' },
  water: { py: 'shuǐ', zh: '水', name: 'Water', color: '#3f8cff', glow: '#b8d6ff' },
  earth: { py: 'tǔ', zh: '土', name: 'Earth', color: '#c8955a', glow: '#f2d7a8' },
  lightning: { py: 'diàn', zh: '电', name: 'Lightning', color: '#ffe14a', glow: '#fff7c4' },
  wind: { py: 'fēng', zh: '风', name: 'Wind', color: '#62e0b4', glow: '#d3fff0' },
  dark: { py: 'àn', zh: '暗', name: 'Dark', color: '#9b6bff', glow: '#d9c4ff' },
  light: { py: 'guāng', zh: '光', name: 'Light', color: '#ffd27a', glow: '#fff4d6' },
  physical: { py: 'lì', zh: '力', name: 'Physical', color: '#e8e2f0', glow: '#ffffff' },
};
export const COMBAT_ELEMENTS = ['fire', 'ice', 'water', 'earth', 'lightning', 'wind', 'dark', 'light'];

// Affinity multipliers used by enemy definitions (weak/normal/resist/immune).
export const AFFINITY = { weak: 1.5, normal: 1, resist: 0.5, immune: 0 };
// Bosses can never be fully immune or heavily resistant, so no build is hard-locked.
export const BOSS_MIN_AFFINITY = 0.6;

// Status effects. `dur` is the default duration (s); engine applies effects by id.
export const STATUSES = {
  burn: { py: 'rán shāo', zh: '燃烧', name: 'Burn', element: 'fire', color: '#ff7a3d', dur: 3, desc: 'Takes fire damage every 0.5s.' },
  chill: { py: 'hán lěng', zh: '寒冷', name: 'Chill', element: 'ice', color: '#9fe8ff', dur: 3, desc: 'Attacks and moves 35% slower.' },
  frozen: { py: 'bīng dòng', zh: '冰冻', name: 'Frozen', element: 'ice', color: '#c9f4ff', dur: 1.8, desc: 'Cannot act.' },
  wet: { py: 'shī', zh: '湿', name: 'Wet', element: 'water', color: '#3f8cff', dur: 5, desc: 'Lightning deals more and chains; ice freezes.' },
  shock: { py: 'diàn jī', zh: '电击', name: 'Shock', element: 'lightning', color: '#ffe14a', dur: 3, desc: 'Takes 20% more damage.' },
  curse: { py: 'zǔ zhòu', zh: '诅咒', name: 'Curse', element: 'dark', color: '#9b6bff', dur: 5, desc: 'Takes 15% more damage; hitting it drains life.' },
  stun: { py: 'yūn', zh: '晕', name: 'Stun', element: 'earth', color: '#e8c48a', dur: 1, desc: 'Cannot act.' },
  dazzle: { py: 'yǎn huā', zh: '眼花', name: 'Dazzle', element: 'light', color: '#fff0a0', dur: 3, desc: 'Attacks miss 35% of the time.' },
};

// Elemental reactions: damage of `element` hitting a target that has status `has`.
// The first matching reaction applies. `consume` removes statuses. Effects are run by the engine
// (see REACTION_EFFECTS in combat.js) so they can chain through the event system.
export const REACTIONS = [
  { id: 'conduct', py: 'dǎo diàn', zh: '导电', name: 'Conduct', element: 'lightning', has: 'wet', mult: 1.5, consume: ['wet'], desc: 'Lightning on Wet: +50% and chains to every other Wet enemy.' },
  { id: 'melt', py: 'róng huà', zh: '融化', name: 'Melt', element: 'fire', has: 'frozen', mult: 2, consume: ['frozen'], desc: 'Fire on Frozen: double damage, leaves the target Wet.' },
  { id: 'shatter', py: 'fěn suì', zh: '粉碎', name: 'Shatter', element: 'earth', has: 'frozen', mult: 2.5, consume: ['frozen'], desc: 'Earth on Frozen: ×2.5 damage.' },
  { id: 'steam', py: 'zhēng qì', zh: '蒸汽', name: 'Steam', element: 'fire', has: 'wet', mult: 1.2, consume: ['wet'], desc: 'Fire on Wet: blinding steam (Dazzle).' },
  { id: 'wildfire', py: 'yě huǒ', zh: '野火', name: 'Wildfire', element: 'wind', has: 'burn', mult: 1.2, consume: [], desc: 'Wind on Burning: spreads Burn to every enemy.' },
  { id: 'purge', py: 'jìng huà', zh: '净化', name: 'Purify', element: 'light', has: 'curse', mult: 2, consume: ['curse'], desc: 'Light on Cursed: double damage and heals you.' },
  { id: 'plasma', py: 'bào zhà', zh: '爆炸', name: 'Explosion', element: 'lightning', has: 'burn', mult: 1.3, consume: ['burn'], desc: 'Lightning on Burning: explodes onto nearby enemies.' },
  { id: 'eclipse', py: 'rì shí', zh: '日食', name: 'Eclipse', element: 'dark', has: 'dazzle', mult: 1.6, consume: ['dazzle'], desc: 'Dark on Dazzled: +60% and Curse.' },
];

// Applying a status to a unit that already has another status can also react.
export const STATUS_REACTIONS = [
  { id: 'flashfreeze', py: 'bīng dòng', zh: '冰冻', name: 'Flash Freeze', apply: 'chill', has: 'wet', result: 'frozen', consume: ['wet'], desc: 'Chill on Wet: freezes solid.' },
  { id: 'douse', py: 'miè huǒ', zh: '灭火', name: 'Douse', apply: 'wet', has: 'burn', result: null, consume: ['burn'], desc: 'Wet puts out Burn.' },
];

// Battlefield terrain states. Each biome starts with some; spells, enemies and reactions change them.
export const TERRAIN = {
  wet: { py: 'shī dì', zh: '湿地', name: 'Wet ground', color: '#3f8cff', desc: 'Everyone standing here becomes Wet.' },
  frozen: { py: 'bīng miàn', zh: '冰面', name: 'Frozen ground', color: '#c9f4ff', desc: 'Everyone moves slower and is periodically Chilled.' },
  burning: { py: 'huǒ hǎi', zh: '火海', name: 'Burning ground', color: '#ff7a3d', desc: 'Enemies on it catch fire.' },
  electrified: { py: 'dài diàn', zh: '带电', name: 'Electrified', color: '#ffe14a', desc: 'Pulses Shock and damage through everyone.' },
  corrupted: { py: 'wū rǎn', zh: '污染', name: 'Corrupted', color: '#6b3fb0', desc: 'Healing −40%, Dark damage +30%.' },
  blessed: { py: 'zhù fú', zh: '祝福', name: 'Blessed', color: '#ffe8a0', desc: 'Light damage and healing +25%.' },
  obscured: { py: 'mí wù', zh: '迷雾', name: 'Mist', color: '#b8b8c8', desc: 'All attacks miss 15% of the time.' },
  unstable: { py: 'dì dòng', zh: '地动', name: 'Tremors', color: '#c8955a', desc: 'Tremors stun a random unit every few seconds.' },
};

// Terrain changes when hit by an element: [terrain present, element] -> {remove, add, dur}
export const TERRAIN_REACTIONS = [
  { has: 'frozen', element: 'fire', remove: 'frozen', add: 'wet', dur: 8, label: 'róng huà · Ice melts' },
  { has: 'wet', element: 'lightning', remove: null, add: 'electrified', dur: 6, label: 'dài diàn · Electrified!' },
  { has: 'wet', element: 'ice', remove: 'wet', add: 'frozen', dur: 8, label: 'bīng dòng · Ground freezes' },
  { has: 'burning', element: 'water', remove: 'burning', add: null, dur: 0, label: 'miè huǒ · Fire out' },
  { has: 'burning', element: 'ice', remove: 'burning', add: 'wet', dur: 6, label: 'miè huǒ · Fire out' },
  { has: 'corrupted', element: 'light', remove: 'corrupted', add: 'blessed', dur: 10, label: 'jìng huà · Purified' },
  { has: 'obscured', element: 'wind', remove: 'obscured', add: null, dur: 0, label: 'Mist blown away' },
];

// Map vocabulary words to elements (src/data/wordThemes.json uses these keys).
export const WORD_ELEMENTS = COMBAT_ELEMENTS;
