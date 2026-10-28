// Upgrade and synergy definitions. Shown as pinyin (py) first, then Hanzi (zh) and English (name).
// Add new entries here – the combat engine only reads the
// generic fields returned by `mods(level)`, and the UI reads name/desc/icon.
//
// mods fields (all optional, summed across upgrades):
//   atk, def, maxHp, aspdPct, crit, critDmg, dodge, dr (damage reduction 0-1), lifesteal,
//   healMult, shieldMult, cdPct (cooldown reduction), doubleStrike, berserk, lowHpHeal,
//   burnOnHit {dps, dur}, ally {dmg, interval}, abilities [ {id, kind, cd, amount, target, element} ]
//   ability kinds: 'damage' (target 'front' | 'all'), 'shield', 'heal'
// unlockLevel: account level required before the upgrade can appear in runs.
// needsAbility: only offered once the hero owns an upgrade with active abilities.

export const UPGRADES = {
  fireball: {
    py: 'huǒ qiú', zh: '火球', name: 'Fireball', element: 'fire', rarity: 'common', icon: 'fireball', maxLevel: 5,
    desc: (l) => `Hurl a fireball every 3s for ${10 + 6 * l} fire damage.`,
    mods: (l) => ({ abilities: [{ id: 'fireball', kind: 'damage', cd: 3, amount: 10 + 6 * l, target: 'front', element: 'fire' }] }),
  },
  ember_blade: {
    py: 'huǒ jiàn', zh: '火剑', name: 'Ember Blade', element: 'fire', rarity: 'common', icon: 'ember_blade', maxLevel: 4,
    desc: (l) => `Attacks burn for ${2 * l + 1} damage/s over 3s.`,
    mods: (l) => ({ burnOnHit: { dps: 2 * l + 1, dur: 3 } }),
  },
  water_shield: {
    py: 'shuǐ dùn', zh: '水盾', name: 'Water Shield', element: 'water', rarity: 'common', icon: 'water_shield', maxLevel: 5,
    desc: (l) => `Start battles with a ${12 + 8 * l} shield and refresh it every 7s.`,
    mods: (l) => ({ startShield: 12 + 8 * l, abilities: [{ id: 'water_shield', kind: 'shield', cd: 7, amount: 12 + 8 * l, element: 'water' }] }),
  },
  healing_spring: {
    py: 'quán shuǐ', zh: '泉水', name: 'Healing Spring', element: 'water', rarity: 'rare', icon: 'healing_spring', maxLevel: 4,
    desc: (l) => `Restore ${4 + 3 * l} HP every 2.5s.`,
    mods: (l) => ({ abilities: [{ id: 'healing_spring', kind: 'heal', cd: 2.5, amount: 4 + 3 * l, element: 'water' }] }),
  },
  wind_spirit: {
    py: 'fēng líng', zh: '风灵', name: 'Wind Spirit', element: 'wind', rarity: 'common', icon: 'wind_spirit', maxLevel: 5,
    desc: (l) => `+${12 * l}% attack speed.`,
    mods: (l) => ({ aspdPct: 0.12 * l }),
  },
  gale_slash: {
    py: 'shuāng jī', zh: '双击', name: 'Gale Slash', element: 'wind', rarity: 'rare', icon: 'gale_slash', maxLevel: 4,
    desc: (l) => `${15 * l}% chance to strike twice.`,
    mods: (l) => ({ doubleStrike: 0.15 * l }),
  },
  mountain_armor: {
    py: 'shān jiǎ', zh: '山甲', name: 'Mountain Armor', element: 'earth', rarity: 'common', icon: 'mountain_armor', maxLevel: 5,
    desc: (l) => `+${3 * l} defense and +${15 * l} max HP.`,
    mods: (l) => ({ def: 3 * l, maxHp: 15 * l }),
  },
  stone_skin: {
    py: 'shí pí', zh: '石皮', name: 'Stone Skin', element: 'earth', rarity: 'rare', icon: 'stone_skin', maxLevel: 4,
    desc: (l) => `Take ${8 * l}% less damage.`,
    mods: (l) => ({ dr: 0.08 * l }),
  },
  sunburst: {
    py: 'tài yáng', zh: '太阳', name: 'Sunburst', element: 'light', rarity: 'rare', icon: 'sunburst', maxLevel: 4,
    desc: (l) => `Every 6s, scorch ALL enemies for ${16 + 10 * l} light damage.`,
    mods: (l) => ({ abilities: [{ id: 'sunburst', kind: 'damage', cd: 6, amount: 16 + 10 * l, target: 'all', element: 'light' }] }),
  },
  radiant_heal: {
    py: 'guāng míng', zh: '光明', name: 'Radiant Prayer', element: 'light', rarity: 'common', icon: 'radiant_heal', maxLevel: 3,
    desc: (l) => `Once per battle, heal ${15 + 10 * l}% HP when below 40%.`,
    mods: (l) => ({ lowHpHeal: 0.15 + 0.1 * l }),
  },
  moon_veil: {
    py: 'yuè guāng', zh: '月光', name: 'Moon Veil', element: 'shadow', rarity: 'common', icon: 'moon_veil', maxLevel: 4,
    desc: (l) => `${8 * l}% chance to dodge attacks.`,
    mods: (l) => ({ dodge: 0.08 * l }),
  },
  night_fang: {
    py: 'yè yá', zh: '夜牙', name: 'Night Fang', element: 'shadow', rarity: 'rare', icon: 'night_fang', maxLevel: 4,
    desc: (l) => `+${5 * l}% crit chance, crits deal +${20 * l}% damage.`,
    mods: (l) => ({ crit: 0.05 * l, critDmg: 0.2 * l }),
  },
  vital_heart: {
    py: 'ài xīn', zh: '爱心', name: 'Vital Heart', element: 'life', rarity: 'common', icon: 'vital_heart', maxLevel: 5,
    desc: (l) => `+${25 * l} max HP (and heal that much now).`,
    mods: (l) => ({ maxHp: 25 * l }),
    onPick: { healFlat: 25 },
  },
  vampiric_bloom: {
    py: 'xuè huā', zh: '血花', name: 'Blood Bloom', element: 'life', rarity: 'rare', icon: 'vampiric_bloom', maxLevel: 4,
    desc: (l) => `Heal for ${7 * l}% of damage dealt.`,
    mods: (l) => ({ lifesteal: 0.07 * l }),
  },
  power_strike: {
    py: 'lì liàng', zh: '力量', name: 'Power Strike', element: 'might', rarity: 'common', icon: 'power_strike', maxLevel: 5,
    desc: (l) => `+${4 * l} attack.`,
    mods: (l) => ({ atk: 4 * l }),
  },
  berserker: {
    py: 'shēng qì', zh: '生气', name: 'Berserker', element: 'might', rarity: 'rare', icon: 'berserker', maxLevel: 3,
    desc: (l) => `Deal +${25 * l}% damage while below half HP.`,
    mods: (l) => ({ berserk: 0.25 * l }),
  },
  rune_battery: {
    py: 'fú wén', zh: '符文', name: 'Rune Battery', element: 'arcane', rarity: 'common', icon: 'rune_battery', maxLevel: 4, needsAbility: true,
    desc: (l) => `Abilities recharge ${10 * l}% faster.`,
    mods: (l) => ({ cdPct: 0.1 * l }),
  },
  echo_cast: {
    py: 'huí shēng', zh: '回声', name: 'Echo Cast', element: 'arcane', rarity: 'epic', icon: 'echo_cast', maxLevel: 3, unlockLevel: 3, needsAbility: true,
    desc: (l) => `Abilities have a ${20 * l}% chance to cast twice.`,
    mods: (l) => ({ echo: 0.2 * l }),
  },
  keen_eye: {
    py: 'yǎn jing', zh: '眼睛', name: 'Keen Eye', element: 'focus', rarity: 'common', icon: 'keen_eye', maxLevel: 5,
    desc: (l) => `+${7 * l}% critical chance.`,
    mods: (l) => ({ crit: 0.07 * l }),
  },
  companion: {
    py: 'hú li', zh: '狐狸', name: 'Fox Spirit', element: 'kin', rarity: 'rare', icon: 'companion', maxLevel: 5,
    desc: (l) => `A fox spirit companion bites for ${3 + 3 * l} every 1.2s.`,
    mods: (l) => ({ ally: { dmg: 3 + 3 * l, interval: 1.2 } }),
  },
};

// Owning both requirements activates the synergy. `patch` edits the computed unit.
export const SYNERGIES = {
  firestorm: {
    py: 'huǒ fēng bào', zh: '火风暴', name: 'Firestorm', requires: ['fireball', 'wind_spirit'], icon: 'firestorm',
    desc: 'huǒ qiú (Fireball) becomes a storm: hits ALL enemies for +40% damage.',
    patch: (u) => editAbility(u, 'fireball', (a) => ({ ...a, target: 'all', amount: Math.round(a.amount * 1.4), fx: 'firestorm' })),
  },
  stone_guardian: {
    py: 'shān shén', zh: '山神', name: 'Stone Guardian', requires: ['water_shield', 'mountain_armor'], icon: 'stone_guardian',
    desc: 'Shields are 60% stronger and grant +4 defense while up.',
    patch: (u) => {
      u.shieldMult += 0.6;
      u.shieldDef = (u.shieldDef || 0) + 4;
    },
  },
  eclipse: {
    py: 'rì shí', zh: '日食', name: 'Eclipse', requires: ['sunburst', 'moon_veil'], icon: 'eclipse',
    desc: 'Sunburst recharges 30% faster; dodging releases a 12 damage moonflash.',
    patch: (u) => {
      editAbility(u, 'sunburst', (a) => ({ ...a, cd: a.cd * 0.7, fx: 'eclipse' }));
      u.dodgeCounter = (u.dodgeCounter || 0) + 12;
    },
  },
  fountain_of_life: {
    py: 'shēng mìng', zh: '生命', name: 'Fountain of Life', requires: ['healing_spring', 'vital_heart'], icon: 'fountain_of_life',
    desc: 'All healing is 50% stronger.',
    patch: (u) => {
      u.healMult += 0.5;
    },
  },
  war_band: {
    py: 'péng you men', zh: '朋友们', name: 'War Band', requires: ['companion', 'power_strike'], icon: 'war_band',
    desc: 'Your fox spirit deals double damage.',
    patch: (u) => {
      if (u.ally) u.ally.dmg *= 2;
    },
  },
  hellfire: {
    py: 'dì yù huǒ', zh: '地狱火', name: 'Hellfire', requires: ['ember_blade', 'night_fang'], icon: 'hellfire',
    desc: 'Critical hits apply triple burn.',
    patch: (u) => {
      u.critBurnMult = 3;
    },
  },
  arcane_overflow: {
    py: 'mó fǎ', zh: '魔法', name: 'Arcane Overflow', requires: ['rune_battery', 'echo_cast'], icon: 'arcane_overflow',
    desc: 'Abilities recharge a further 20% faster.',
    patch: (u) => {
      u.cdPct += 0.2;
    },
  },
  tempest_eye: {
    py: 'fēng yǎn', zh: '风眼', name: 'Tempest Eye', requires: ['keen_eye', 'gale_slash'], icon: 'tempest_eye',
    desc: 'Second strikes always crit.',
    patch: (u) => {
      u.doubleCrit = true;
    },
  },
};

function editAbility(u, id, fn) {
  u.abilities = u.abilities.map((a) => (a.id === id ? fn(a) : a));
}

export const RARITY_WEIGHT = { common: 10, rare: 6, epic: 3 };

export function activeSynergies(owned) {
  const ids = new Set(owned.map((o) => o.id));
  return Object.entries(SYNERGIES)
    .filter(([, s]) => s.requires.every((r) => ids.has(r)))
    .map(([id]) => id);
}
