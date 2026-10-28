// Enemy definitions. Names are pinyin-first. `sprite` is a key in src/assets/manifest.js.
// Stats are at floor 1; balance.js scales them per floor (unless fixedStats).
//
// affinity: { element: 'weak' | 'resist' | 'immune' | number } (see AFFINITY in elements.js)
// element: the element of the enemy's basic attack
// onHitStatus: status its basic attacks apply to the hero
// ai: behaviour config. Keys with `every` run on a timer:
//   range, speed · charge {every, windup, mult, text} (telegraphed big hit; Freeze/Stun interrupts)
//   summon {every, id, count} · guard {every, amount} (shield weakest ally) · hex {every, status, dur, dmg}
//   shift {every} (random new resistance/weakness) · flip {every} (weaknesses become resistances)
//   silence {every, dur} (disables your passive items) · hazard {every, terrain, dur}
//   shell {every, dur, dr} · corrupt {every} (corrupts one of your spells) · devour {every} (eats your shield)
//   regen {every, pct, terrain?} · nuke {every, mult, element, status}
//   onSpellHit: 'shield' | 'enrage' (reacts to your spells)
// phases: [{at: hp fraction, text, ai, aspd, terrain, shield, summon}] — boss phase changes

export const ENEMIES = {
  // ----------------------------------------------------------- common
  slime: {
    py: 'shǐ lái mǔ', zh: '史莱姆', name: 'Slime', sprite: 'slime', element: 'water',
    stats: { maxHp: 70, atk: 4, aspd: 0.8 },
    affinity: { water: 'resist', lightning: 'weak' },
    blurb: 'Wobbly and harmless. Mostly. Conducts electricity beautifully.',
  },
  sporecap: {
    py: 'mó gu', zh: '蘑菇', name: 'Mushroom', sprite: 'sporecap', element: 'dark',
    stats: { maxHp: 74, atk: 3, def: 1, aspd: 0.75 },
    onHitStatus: { id: 'curse', dur: 2 },
    affinity: { fire: 'weak', earth: 'resist' },
    blurb: 'Its spores Curse you. Burns nicely.',
  },
  bat: {
    py: 'biān fú', zh: '蝙蝠', name: 'Bat', sprite: 'bat', element: 'dark', flying: true,
    stats: { maxHp: 48, atk: 3, aspd: 1.3, dodge: 0.2 },
    ai: { speed: 16 },
    affinity: { light: 'weak', dark: 'resist' },
    blurb: 'Fast, flying (ignores ground effects) and hard to hit.',
  },
  goblin: {
    py: 'xiǎo yāo', zh: '小妖', name: 'Goblin', sprite: 'goblin', element: 'dark',
    stats: { maxHp: 84, atk: 6, def: 2, aspd: 0.85, crit: 0.15 },
    ai: { range: 36 },
    affinity: { light: 'weak' },
    blurb: 'Throws ink from range. Steals your homework.',
  },
  golem: {
    py: 'shí tou rén', zh: '石头人', name: 'Stone Golem', sprite: 'golem', element: 'earth',
    stats: { maxHp: 140, atk: 8, def: 6, aspd: 0.5 },
    ai: { speed: 7, charge: { every: 7, windup: 1.6, mult: 2.6, text: 'Slam!' } },
    affinity: { earth: 'resist', physical: 0.7, ice: 'weak', water: 'weak' },
    blurb: 'Slow and armored. Winds up huge slams; Freeze or Stun interrupts them.',
  },
  panda: {
    py: 'xióng māo', zh: '熊猫', name: 'Panda', sprite: 'panda', element: 'physical',
    stats: { maxHp: 118, atk: 7, def: 2, aspd: 0.8 },
    ai: { charge: { every: 6, windup: 1.2, mult: 2.2, text: 'Rolling!' } },
    affinity: { fire: 'weak', wind: 'resist' },
    blurb: 'Adorable. Rolls into you at full speed.',
  },
  kite: {
    py: 'fēng zheng', zh: '风筝', name: 'Kite Spirit', sprite: 'kite', element: 'wind', flying: true,
    stats: { maxHp: 54, atk: 5, aspd: 1.1, dodge: 0.15 },
    ai: { range: 34, speed: 15 },
    affinity: { wind: 'resist', lightning: 'weak', fire: 'weak' },
    blurb: 'A runaway kite. Flies, dodges, shoots gusts.',
  },
  crab: {
    py: 'páng xiè', zh: '螃蟹', name: 'Crab', sprite: 'crab', element: 'water',
    stats: { maxHp: 108, atk: 6, def: 4, aspd: 0.8 },
    ai: { shell: { every: 6, dur: 2.5, dr: 0.6 } },
    affinity: { fire: 'resist', water: 'resist', lightning: 'weak' },
    blurb: 'Pulls into its shell (−60% damage) every few seconds.',
  },
  turtle: {
    py: 'wū guī', zh: '乌龟', name: 'Turtle', sprite: 'turtle', element: 'earth',
    stats: { maxHp: 150, atk: 5, def: 8, aspd: 0.6 },
    ai: { speed: 6, guard: { every: 7, amount: 0.15 } },
    affinity: { earth: 'resist', lightning: 'weak' },
    blurb: 'Slow, sturdy, shields its weakest friend.',
  },
  snowman: {
    py: 'xuě rén', zh: '雪人', name: 'Snowman', sprite: 'snowman', element: 'ice',
    stats: { maxHp: 100, atk: 6, def: 2, aspd: 0.8 },
    onHitStatus: { id: 'chill', dur: 2 },
    affinity: { ice: 0.25, fire: 'weak' },
    blurb: 'Its punches Chill. Nearly immune to ice; melts in fire.',
  },
  thunderbird: {
    py: 'léi niǎo', zh: '雷鸟', name: 'Thunderbird', sprite: 'thunderbird', element: 'lightning', flying: true,
    stats: { maxHp: 70, atk: 6, aspd: 1 },
    ai: { range: 38, speed: 15 },
    onHitStatus: { id: 'shock', dur: 2 },
    affinity: { lightning: 0.3, earth: 'weak' },
    blurb: 'Shocks you from the sky.',
  },
  shadow: {
    py: 'yǐng zi', zh: '影子', name: 'Shadow', sprite: 'shadow', element: 'dark',
    stats: { maxHp: 95, atk: 7, aspd: 0.9 },
    ai: { regen: { every: 1, pct: 0.02, terrain: 'corrupted' } },
    affinity: { dark: 'resist', light: 'weak' },
    blurb: 'Regenerates on corrupted ground. Light purifies it.',
  },
  lantern: {
    py: 'dēng long', zh: '灯笼', name: 'Lantern Spirit', sprite: 'lantern', element: 'light',
    stats: { maxHp: 80, atk: 5, aspd: 0.9 },
    ai: { range: 34, hex: { every: 7, status: 'dazzle', dur: 3 } },
    affinity: { light: 'resist', dark: 'weak', water: 'weak' },
    blurb: 'Dazzles you so your attacks miss.',
  },
  wraith: {
    py: 'zì líng', zh: '字灵', name: 'Word Wraith', sprite: 'wraith', element: 'dark', flying: true,
    stats: { maxHp: 42, atk: 4, aspd: 1 },
    affinity: { light: 'weak' },
    blurb: 'A stolen word given form. Free it with light.',
  },

  // ----------------------------------------------------------- elites
  wisp: {
    py: 'guǐ huǒ', zh: '鬼火', name: 'Ghost Fire', sprite: 'wisp', element: 'dark', elite: true, flying: true,
    stats: { maxHp: 140, atk: 7, def: 2, aspd: 0.95, drain: 0.3 },
    ai: { range: 34, hex: { every: 6, status: 'curse', dur: 4, dmg: 1.5 } },
    affinity: { dark: 'resist', light: 'weak', water: 'weak' },
    blurb: 'Elite. Drains life and casts curses.',
  },
  knight: {
    py: 'qí shì', zh: '骑士', name: 'Knight', sprite: 'knight', element: 'physical', elite: true,
    stats: { maxHp: 170, atk: 8, def: 5, aspd: 0.7 },
    ai: { guard: { every: 8, amount: 0.12 }, charge: { every: 8, windup: 1.5, mult: 2.4, text: 'Lance charge!' }, onSpellHit: 'shield' },
    affinity: { physical: 0.7, lightning: 'weak' },
    blurb: 'Elite. Shields allies, charges, and raises a guard when hit by spells.',
  },

  // ----------------------------------------------------------- biome guardians (act bosses)
  panda_king: {
    py: 'xióng māo wáng', zh: '熊猫王', name: 'Panda King', sprite: 'panda', scale: 1.5, element: 'physical', elite: true, guardian: true,
    stats: { maxHp: 230, atk: 9, def: 2, aspd: 0.8 },
    ai: { charge: { every: 7, windup: 1.4, mult: 2.1, text: 'Rolling!' }, summon: { every: 12, id: 'kite' } },
    phases: [{ at: 0.5, text: 'Bamboo fury!', aspd: 1.4 }],
    affinity: { fire: 'weak', wind: 'resist' },
    blurb: 'Guardian of the bamboo forest.',
  },
  crab_queen: {
    py: 'xiè hòu', zh: '蟹后', name: 'Crab Queen', sprite: 'crab', scale: 1.5, element: 'water', elite: true, guardian: true,
    stats: { maxHp: 240, atk: 8, def: 3, aspd: 0.8 },
    ai: { shell: { every: 8, dur: 2.5, dr: 0.5 }, nuke: { every: 8, mult: 1.6, element: 'water', status: 'wet', id: 'tide' } },
    phases: [{ at: 0.5, text: 'High tide!', summon: { id: 'slime', count: 2 } }],
    affinity: { fire: 0.7, lightning: 'weak' },
    blurb: 'Guardian of the coast. Soaks you, then hides in her shell.',
  },
  stone_king: {
    py: 'shí tou wáng', zh: '石头王', name: 'Stone King', sprite: 'golem', scale: 1.5, element: 'earth', elite: true, guardian: true,
    stats: { maxHp: 260, atk: 10, def: 5, aspd: 0.5 },
    ai: { speed: 6, charge: { every: 7, windup: 1.8, mult: 2.4, text: 'Avalanche!' }, hazard: { every: 12, terrain: 'unstable', dur: 6 } },
    affinity: { earth: 'resist', physical: 0.7, water: 'weak', ice: 'weak' },
    blurb: 'Guardian of the caves. Its avalanches can be interrupted.',
  },
  frost_matriarch: {
    py: 'xuě nǚ', zh: '雪女', name: 'Snow Maiden', sprite: 'snowman', scale: 1.5, element: 'ice', elite: true, guardian: true,
    stats: { maxHp: 270, atk: 9, def: 3, aspd: 0.8 },
    ai: { hex: { every: 6, status: 'chill', dur: 3, dmg: 1.2 }, summon: { every: 9, id: 'snowman' } },
    phases: [{ at: 0.5, text: 'Blizzard!', terrain: ['frozen'] }],
    affinity: { ice: 0.3, fire: 'weak' },
    blurb: 'Guardian of the snow mountain.',
  },
  thunder_qilin: {
    py: 'léi qí lín', zh: '雷麒麟', name: 'Thunder Qilin', sprite: 'thunderbird', scale: 1.6, element: 'lightning', elite: true, guardian: true,
    stats: { maxHp: 260, atk: 9, aspd: 1 },
    ai: { range: 30, nuke: { every: 5, mult: 1.6, element: 'lightning', status: 'shock', id: 'thunder' }, shift: { every: 9 } },
    affinity: { lightning: 0.3, earth: 'weak' },
    blurb: 'Guardian of the storm. Changes its weakness as it fights.',
  },
  bog_witch: {
    py: 'wū pó', zh: '巫婆', name: 'Bog Witch', sprite: 'shadow', scale: 1.5, element: 'dark', elite: true, guardian: true,
    stats: { maxHp: 270, atk: 8, aspd: 0.9, drain: 0.2 },
    ai: { silence: { every: 12, dur: 3 }, regen: { every: 1, pct: 0.012, terrain: 'corrupted' }, hex: { every: 7, status: 'curse', dur: 4 } },
    affinity: { dark: 'resist', light: 'weak' },
    blurb: 'Guardian of the marsh. Silences your passive items.',
  },
  lantern_king: {
    py: 'dēng long wáng', zh: '灯笼王', name: 'Lantern King', sprite: 'lantern', scale: 1.6, element: 'light', elite: true, guardian: true,
    stats: { maxHp: 260, atk: 9, aspd: 0.9 },
    ai: { range: 30, nuke: { every: 6, mult: 1.5, element: 'light', status: 'dazzle', id: 'glare' }, onSpellHit: 'shield' },
    affinity: { light: 'resist', dark: 'weak' },
    blurb: 'Guardian of the temple. Answers your spells with shields.',
  },

  // ----------------------------------------------------------- bosses
  wyrm: {
    py: 'mò lóng', zh: '墨龙', name: 'Ink Dragon', sprite: 'wyrm', element: 'dark', boss: true, fixedStats: true,
    stats: { maxHp: 1150, atk: 13, def: 5, aspd: 0.7 },
    ai: { range: 14, charge: { every: 8, windup: 2, mult: 2.4, text: 'Ink breath!', element: 'dark' }, summon: { every: 14, id: 'bat' } },
    phases: [
      { at: 0.66, text: 'The ink spreads…', terrain: ['corrupted', 'obscured'], ai: { shift: { every: 8 } } },
      { at: 0.33, text: 'The dragon rages!', aspd: 1.3, ai: { nuke: { every: 6, mult: 1, element: 'dark', status: 'curse', id: 'inkrain' } } },
    ],
    affinity: { dark: 'resist', light: 'weak' },
    blurb: 'Boss. The dragon that stole the words. Three phases: ink breath, spreading ink and rage.',
  },
  wordeater: {
    py: 'tūn zì shòu', zh: '吞字兽', name: 'Word Eater', sprite: 'wordeater', element: 'dark', boss: true, fixedStats: true,
    stats: { maxHp: 1600, atk: 16, def: 6, aspd: 0.7 },
    ai: { range: 16, corrupt: { every: 14 }, summon: { every: 10, id: 'wraith', count: 2 } },
    phases: [
      { at: 0.66, text: 'It devours meaning…', terrain: ['obscured'], ai: { silence: { every: 12, dur: 4 } } },
      { at: 0.33, text: 'Words turn inside out!', aspd: 1.3, terrain: ['corrupted'], ai: { flip: { every: 15 }, devour: { every: 6 } } },
    ],
    affinity: { dark: 'resist', light: 'weak' },
    blurb: 'Final boss. Eats meanings: corrupts spells, silences passives, reverses weaknesses, makes enemies out of stolen words.',
  },
  jade_rabbit: {
    py: 'yù tù', zh: '玉兔', name: 'Jade Rabbit', sprite: 'rabbit', element: 'light', boss: true, fixedStats: true, secret: true,
    stats: { maxHp: 750, atk: 12, aspd: 1.2, dodge: 0.25 },
    ai: { range: 30, regen: { every: 1, pct: 0.008 }, nuke: { every: 6, mult: 1.5, element: 'light', status: 'dazzle', id: 'moonbeam' } },
    phases: [{ at: 0.5, text: 'Moonlight!', shield: 0.2, summon: { id: 'lantern', count: 2 } }],
    affinity: { light: 'resist', dark: 'weak' },
    blurb: 'Secret boss of the moon. Rewards an epic item.',
  },
};
