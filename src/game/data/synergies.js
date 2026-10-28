// Synergies: activate automatically when you own every requirement (items and/or spells).
// They work through the same hook system as items, often by setting battle flags that the
// item hooks read (e.g. b.flags.shieldFreeze makes Bursting Shield freeze enemies).

export const SYNERGIES = {
  chain_explosion: {
    py: 'bào zhà', zh: '爆炸', en: 'Chain Explosion', requires: ['ember_tip', 'split_ink'], archetype: 'Burning Swarm',
    desc: 'Burning enemies explode on death: 30 fire damage to nearby enemies and spread their Burn.',
    hooks: {
      onKill(b, p) {
        if (!p.statuses.burn) return;
        b.emit({ type: 'reaction', tgt: p.target.id, id: 'explode', text: 'bào zhà' });
        for (const f of b.near(p.target, 20)) {
          b.damage(b.hero, f, 30, { element: 'fire', kind: 'proc' });
          b.applyStatus(f, 'burn', { dps: p.statuses.burn.dps, src: b.hero });
        }
      },
    },
  },
  storm_conductor: {
    py: 'léi diàn', zh: '雷电', en: 'Storm Conductor', requires: ['tide_tip', 'spark_arc'], archetype: 'Storm Conductor',
    desc: 'Crit arcs seek Wet enemies, and every Conduct reaction triggers an extra basic attack.',
    hooks: {
      onBattleStart: (b) => (b.flags.arcWet = true),
      onReaction(b, p, s) {
        if (p.reaction !== 'conduct' || (s.until || 0) > b.t) return;
        s.until = b.t + 0.4;
        b.heroAttack();
      },
    },
  },
  frost_fortress: {
    py: 'bīng chéng', zh: '冰城', en: 'Frost Fortress', requires: ['ice_spikes', 'shield_burst'], archetype: 'Frost Fortress',
    desc: 'Bursting Shield explosions also Freeze enemies.',
    hooks: { onBattleStart: (b) => (b.flags.shieldFreeze = true) },
  },
  shatter_smash: {
    py: 'fěn suì', zh: '粉碎', en: 'Shatter Smash', requires: ['frost_tip', 'heavy_hand'], archetype: 'Frost Fortress',
    desc: 'Your heavy attacks count as Earth, so they Shatter Frozen enemies (×2.5).',
    hooks: { onAttack: (b, p) => p.target?.statuses.frozen && (p.element = 'earth') },
  },
  wildfire_dance: {
    py: 'yě huǒ', zh: '野火', en: 'Wildfire Dance', requires: ['wind_step', 'ember_trail'], archetype: 'Wind Dancer',
    desc: 'Wind Step gusts carry your fire: every enemy they hit starts Burning.',
    hooks: { onBattleStart: (b) => (b.flags.gustFire = true) },
  },
  chaos_echo: {
    py: 'hùn luàn', zh: '混乱', en: 'Chaos Echo', requires: ['echo_cast', 'wild_brush'], archetype: 'Chaos Alchemist',
    desc: 'Echo Casting triggers 50% of the time and each echo takes a random element.',
    hooks: { onBattleStart: (b) => (b.flags.chaosEcho = true) },
  },
  firestorm: {
    py: 'huǒ fēng bào', zh: '火风暴', en: 'Firestorm', requires: ['huoqiu', 'dafeng'], archetype: 'Spell Weaver',
    desc: 'Casting Fireball or Great Gale whips up a firestorm that sets every enemy Burning.',
    hooks: {
      onCast(b, c) {
        if (c.spell !== 'huoqiu' && c.spell !== 'dafeng') return;
        b.label(b.hero, 'huǒ fēng bào!', 'good');
        for (const f of b.foes()) b.applyStatus(f, 'burn', { dps: 4 * c.power, src: b.hero });
      },
    },
  },
  radiant_guardian: {
    py: 'shǒu hù', zh: '守护', en: 'Radiant Guardian', requires: ['sun_mirror', 'overflow'], archetype: 'Radiant Guardian',
    desc: 'While shielded, reflect 30% of incoming hits as light damage.',
    hooks: {
      onDamaged(b, p) {
        if (b.hero.shield > 0 && p.src?.alive && p.src.side === 1) b.damage(b.hero, p.src, p.dealt * 0.3, { element: 'light', kind: 'thorns' });
      },
    },
  },
  shadow_parasite: {
    py: 'jì shēng', zh: '寄生', en: 'Shadow Parasite', requires: ['blood_moon', 'hex_mark'], archetype: 'Shadow Parasite',
    desc: 'Hitting a Cursed enemy heals you 2% HP.',
    hooks: {
      onHit(b, p, s) {
        if (!p.target.statuses.curse || (s.cd || 0) > b.t) return;
        s.cd = b.t + 0.3;
        b.heal(b.hero, b.hero.maxHp * 0.02, { silent: true });
      },
    },
  },
  wind_dancer: {
    py: 'fēng wǔ', zh: '风舞', en: 'Wind Dancer', requires: ['qinggong', 'shadow_double'], archetype: 'Wind Dancer',
    desc: '+15% attack speed, +5% dodge, and shadow illusions last twice as long.',
    stats: { aspdPct: 0.15, dodge: 0.05 },
    hooks: { onBattleStart: (b) => (b.flags.illusionTtl = 5.2) },
  },
  spell_weaver: {
    py: 'biān zhī', zh: '编织', en: 'Spell Weaver', requires: ['quick_ink', 'resonance'], archetype: 'Spell Weaver',
    desc: 'Resonance triggers after only 2 different spells.',
    hooks: { onBattleStart: (b) => (b.flags.resonanceN = 2) },
  },
  glass_phoenix: {
    py: 'fèng huáng', zh: '凤凰', en: 'Glass Phoenix', requires: ['paper_phoenix', 'glass_brush'], archetype: 'Rare',
    desc: 'Paper Phoenix revives you at full health.',
    hooks: { onBattleStart: (b) => (b.flags.phoenixFull = true) },
  },
  gluttony: {
    py: 'tān lán', zh: '贪婪', en: 'Gluttony', requires: ['hungry_lantern', 'blood_moon'], archetype: 'Shadow Parasite',
    desc: 'The Hungry Lantern feeds you: no healing penalty, and it heals you for 30% of its damage.',
    hooks: { onBattleStart: (b) => (b.flags.lanternFeeds = true) },
  },
  static_field: {
    py: 'jìng diàn', zh: '静电', en: 'Static Field', requires: ['storm_guard', 'iron_skin'], archetype: 'Storm Conductor',
    desc: 'Storm Guard discharges every 2 blocks and stuns instead of shocking.',
    hooks: {
      onBattleStart(b) {
        b.flags.staticN = 2;
        b.flags.staticStun = true;
      },
    },
  },
  ember_fortress: {
    py: 'huǒ chéng', zh: '火城', en: 'Ember Fortress', requires: ['ember_armor', 'ember_trail'], archetype: 'Burning Swarm',
    desc: 'While the ground is burning, gain a 3 shield every second.',
    hooks: { onTick: (b) => b.hasTerrain('burning') && b.addShield(b.hero, 3) },
  },
  twin_mirrors: {
    py: 'shuāng jìng', zh: '双镜', en: 'Twin Mirrors', requires: ['mirror_ink', 'broken_compass'], archetype: 'Basic Attack Specialist',
    desc: 'Mirror Ink fires every 2nd attack at full damage.',
    hooks: { onBattleStart: (b) => (b.flags.mirrorEvery = 2) },
  },
  deep_freeze: {
    py: 'bīng fēng', zh: '冰封', en: 'Deep Freeze', requires: ['frost_tip', 'frost_hunter'], archetype: 'Frost Fortress',
    desc: 'Frost Tip freezes 25% of the time, and Frozen enemies take +75% from Frost Hunter.',
    hooks: {
      onBattleStart(b) {
        b.flags.freezeChance = 0.25;
        b.flags.deepFreeze = true;
      },
    },
  },
  overcharge: {
    py: 'chāo zài', zh: '超载', en: 'Overcharge', requires: ['reservoir', 'charged_strike'], archetype: 'Spell Weaver',
    desc: 'Stored Reservoir charges also empower basic attacks (+20% per charge).',
    hooks: {
      modDamage(b, c) {
        if (c.kind === 'attack') c.mult *= 1 + 0.2 * (b.state('reservoir').stacks || 0);
      },
    },
  },
  rooted_mountain: {
    py: 'shān yuè', zh: '山岳', en: 'Rooted Mountain', requires: ['rooted', 'stone_bulwark'], archetype: 'Frost Fortress',
    desc: 'While standing still, Stone Bulwark shields you every 5s instead of 10s.',
    hooks: { onBattleStart: (b) => (b.flags.bulwarkFast = true) },
  },
  golden_light: {
    py: 'jīn guāng', zh: '金光', en: 'Golden Light', requires: ['golden_bell', 'vitality'], archetype: 'Radiant Guardian',
    desc: 'Golden Bell rings twice per battle.',
    hooks: { onBattleStart: (b) => (b.flags.bellCharges = 2) },
  },
  lightning_rod: {
    py: 'bì léi', zh: '避雷', en: 'Lightning Rod', requires: ['shandian', 'tide_tip'], archetype: 'Storm Conductor',
    desc: 'Lightning Strike chains 3 more times without losing power.',
    hooks: {
      onBattleStart(b) {
        b.flags.extraChain = (b.flags.extraChain || 0) + 3;
        b.flags.chainNoDecay = true;
      },
    },
  },
  bouncing_bomb: {
    py: 'tán bào', zh: '弹爆', en: 'Bouncing Bomb', requires: ['bouncing_ball', 'triple_blast'], archetype: 'Burning Swarm',
    desc: 'Bounced and split attacks have a 30% chance to explode for 12 fire damage around the target.',
    hooks: {
      onHit(b, p) {
        if (!p.sub || b.rng() >= 0.3) return;
        for (const f of [p.target, ...b.near(p.target, 12)]) b.damage(b.hero, f, 12, { element: 'fire', kind: 'proc' });
      },
    },
  },
  spark_storm: {
    py: 'léi bào', zh: '雷暴', en: 'Spark Storm', requires: ['forked_bolt', 'spark_arc'], archetype: 'Storm Conductor',
    desc: 'Spark Arc releases two arcs per critical hit.',
    hooks: { onBattleStart: (b) => (b.flags.arcCount = 2) },
  },
  echo_brushwork: {
    py: 'huí yīn', zh: '回音', en: 'Echo Brushwork', requires: ['echo_brush', 'five_petals'], archetype: 'Basic Attack Specialist',
    desc: 'Echo Brush also echoes extra projectiles, pierces and bounces.',
    hooks: { onBattleStart: (b) => (b.flags.echoAll = true) },
  },
  hidden_blade: {
    py: 'àn qì', zh: '暗器', en: 'Hidden Blades', requires: ['badao', 'shadow_double'], archetype: 'Wind Dancer',
    desc: 'Casting Sword Draw also summons a shadow illusion.',
    hooks: {
      onCast(b, c) {
        if (c.spell === 'badao' && b.allies().length < 4) b.spawnAlly({ sprite: 'shade', ttl: 3, interval: 0.5, dmg: b.hero.atk * 0.5, element: 'dark' });
      },
    },
  },
  scholars_storm: {
    py: 'bó xué', zh: '博学', en: 'Erudite Storm', requires: ['zhishi', 'chain_reaction'], archetype: 'Chaos Alchemist',
    desc: 'Knowledge throws 2 extra scrolls.',
    hooks: {
      onCast(b, c) {
        if (c.spell !== 'zhishi') return;
        for (let i = 0; i < 2; i++) {
          const f = b.randomFoe();
          if (f) b.damage(b.hero, f, 14 * c.power, { element: 'lightning', kind: 'proc' });
        }
      },
    },
  },
  cheer_squad: {
    py: 'yì qǐ', zh: '一起', en: 'All Together', requires: ['jiayou', 'resonance'], archetype: 'Radiant Guardian',
    desc: 'Cheer On also cuts your other spells’ cooldowns by 4s.',
    hooks: { onCast: (b, c) => c.spell === 'jiayou' && b.reduceCooldowns(4, c.slot) },
  },
};

/** Synergies whose requirements (item and spell ids) are all owned. */
export function activeSynergies(items = [], spells = []) {
  const owned = new Set([...items, ...spells]);
  return Object.entries(SYNERGIES)
    .filter(([, s]) => s.requires.every((r) => owned.has(r)))
    .map(([id]) => id);
}

/** Synergies that would complete if `id` were added. */
export function synergiesCompletedBy(id, items = [], spells = []) {
  const owned = new Set([...items, ...spells]);
  if (owned.has(id)) return [];
  return Object.entries(SYNERGIES)
    .filter(([, s]) => s.requires.includes(id) && s.requires.every((r) => r === id || owned.has(r)))
    .map(([sid]) => sid);
}

/** Synergies that `id` takes part in (for "works with" hints). */
export function synergiesWith(id) {
  return Object.entries(SYNERGIES)
    .filter(([, s]) => s.requires.includes(id))
    .map(([sid, s]) => ({ id: sid, other: s.requires.filter((r) => r !== id) }));
}
