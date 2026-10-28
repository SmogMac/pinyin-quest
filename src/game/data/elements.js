// Gameplay elements. A word's meaning maps to an element (src/data/wordThemes.json), which
// decides the battle blessing it grants when answered correctly and which upgrades it inspires.

export const ELEMENTS = {
  fire: { py: 'huǒ', zh: '火', name: 'Fire', color: '#ff7a3d', glow: '#ffd36b' },
  water: { py: 'shuǐ', zh: '水', name: 'Water', color: '#4cb8ff', glow: '#b8ecff' },
  wind: { py: 'fēng', zh: '风', name: 'Wind', color: '#62e0b4', glow: '#d3fff0' },
  earth: { py: 'tǔ', zh: '土', name: 'Earth', color: '#c8955a', glow: '#f2d7a8' },
  light: { py: 'guāng', zh: '光', name: 'Light', color: '#ffd84a', glow: '#fff6c4' },
  shadow: { py: 'yǐng', zh: '影', name: 'Shadow', color: '#9b7bff', glow: '#d9ccff' },
  life: { py: 'shēng', zh: '生', name: 'Life', color: '#ff7eb6', glow: '#ffd2e6' },
  might: { py: 'lì', zh: '力', name: 'Might', color: '#ff5a5a', glow: '#ffc2c2' },
  arcane: { py: 'fǎ', zh: '法', name: 'Arcane', color: '#7f8cff', glow: '#d0d5ff' },
  focus: { py: 'zhǔn', zh: '准', name: 'Focus', color: '#4fd6e8', glow: '#c9f7ff' },
  kin: { py: 'jiā', zh: '家', name: 'Kin', color: '#ffa94d', glow: '#ffe1bf' },
};

// Fallbacks for words without a hand-picked theme: grammar words power arcane utility,
// numbers sharpen focus, pronouns call on kin. Other words stay neutral (generic rewards).
export const POS_ELEMENT = {
  number: 'focus',
  'measure word': 'focus',
  pronoun: 'kin',
  particle: 'arcane',
  conjunction: 'arcane',
  preposition: 'arcane',
};

// One-battle bonus from each correctly answered word, by element.
// Keys are the stat-bonus fields understood by the combat engine (see combat.js buildUnit).
export const BLESSINGS = {
  fire: { text: '+3 attack, attacks burn', mods: { atk: 3, burnOnHit: { dps: 2, dur: 3 } } },
  water: { text: '+15 shield at battle start', mods: { startShield: 15 } },
  wind: { text: '+10% attack speed', mods: { aspdPct: 0.1 } },
  earth: { text: '+3 defense', mods: { def: 3 } },
  light: { text: '+30% critical damage', mods: { critDmg: 0.3 } },
  shadow: { text: '+6% dodge', mods: { dodge: 0.06 } },
  life: { text: 'Heal 8% HP now', mods: { healPct: 0.08 } },
  might: { text: '+4 attack', mods: { atk: 4 } },
  arcane: { text: 'Abilities 8% faster', mods: { cdPct: 0.08 } },
  focus: { text: '+5% critical chance', mods: { crit: 0.05 } },
  kin: { text: '+2 attack, companion +2', mods: { atk: 2, allyDmg: 2 } },
  none: { text: '+2 attack', mods: { atk: 2 } },
};
