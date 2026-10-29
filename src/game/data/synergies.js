// Synergies: activate automatically when you own every requirement (passive items, and for
// hero-specific ones the hero's signature move id). They work through the same hook system as
// items, often by setting battle flags that the item hooks read (e.g. b.flags.shieldFreeze makes
// Bursting Shield freeze enemies). Rare, absurd combinations are allowed on purpose; the engine's
// depth/proc limits and the items' own internal cooldowns keep them from looping forever.
const pick = (b, list) => list[Math.floor(b.rng() * list.length)];

export const SYNERGIES = {
  // ---------------------------------------------------------------- positioning & momentum
  vanguard_charge: {
    py: 'chōng fēng', zh: '冲锋', en: 'Vanguard Charge', requires: ['reckless_charge', 'swift_pursuit'], archetype: 'Fast Fighter',
    desc: 'Gaining Momentum also grants +40% attack speed for 4s.',
    hooks: { onMomentum: (b, p) => p.on && b.addBuff(b.hero, { id: 'vanguard', dur: 4, stats: { aspdPct: 0.4 } }) },
  },
  line_breaker: {
    py: 'pò zhèn', zh: '破阵', en: 'Line Breaker', requires: ['thunder_impact', 'heavy_frame'], archetype: 'Heavy Bruiser',
    desc: 'Enemies you knock back at least 6 are Stunned for 0.6s.',
    hooks: { onKnockback: (b, p) => !p.pull && p.dist >= 6 && b.applyStatus(p.target, 'stun', { dur: 0.6, src: b.hero }) },
  },
  wind_rider: {
    py: 'yíng fēng', zh: '迎风', en: 'Wind Rider', requires: ['countercurrent', 'hit_and_run'], archetype: 'Wind Dancer',
    desc: 'Every dodge also grants a 12 shield and +25% dodge for 1.5s.',
    hooks: {
      onDodge(b) {
        b.addShield(b.hero, 12);
        b.addBuff(b.hero, { id: 'wind_rider', dur: 1.5, stats: { dodge: 0.25 } });
      },
    },
  },
  hold_the_line: {
    py: 'shǒu chéng', zh: '守城', en: 'Hold the Line', requires: ['territorial_guardian', 'iron_roots'], archetype: 'Earth Guardian',
    desc: 'In your own half you cannot be knocked back, and melee attackers take 30% of their damage back.',
    hooks: {
      modKnockback: (b, p) => b.inOwnZone(b.hero) && (p.dist = 0),
      onDamaged(b, p) {
        if (p.kind === 'attack' && p.src?.alive && (p.src.range || 0) <= 20 && b.inOwnZone(b.hero)) b.damage(b.hero, p.src, p.dealt * 0.3, { element: 'earth', kind: 'thorns' });
      },
    },
  },
  fighting_spirit: {
    py: 'zhàn yì', zh: '战意', en: 'Fighting Spirit', requires: ['battle_standard', 'relentless'], archetype: 'Fast Fighter',
    desc: 'While you have Momentum: +15% critical chance and 20% less knockback taken.',
    hooks: {
      onTick: (b) => b.hero.momentum && b.addBuff(b.hero, { id: 'spirit', dur: 1.1, stats: { crit: 0.15 } }),
      modKnockback: (b, p) => b.hero.momentum && (p.dist *= 0.8),
    },
  },
  border_wall: {
    py: 'jiè qiáng', zh: '界墙', en: 'Border Wall', requires: ['boundary_stone', 'territorial_guardian'], archetype: 'Earth Guardian',
    desc: 'Every 6 seconds, any enemy standing in your half is driven back across the midpoint.',
    hooks: {
      onTick(b, p, s) {
        s.t = (s.t || 0) + 1;
        if (s.t < 6) return;
        s.t = 0;
        for (const f of b.foes()) if (!b.inOwnZone(f)) b.knockback(f, Math.max(4, b.mid - f.x + 6), { src: b.hero });
      },
    },
  },
  storm_hammer: {
    py: 'léi chuí', zh: '雷锤', en: 'Storm Hammer', requires: ['thunder_impact', 'knockback'], archetype: 'Heavy Bruiser',
    desc: 'Lei’s Knockback! Shocks every enemy it launches, and Shocked enemies that hit the wall pass the Shock to their neighbours.',
    hooks: {
      onLaunch: (b, p) => p.targets.forEach((f) => b.applyStatus(f, 'shock', { dur: 3, src: b.hero })),
      onWallHit(b, p) {
        if (p.target.statuses.shock) for (const g of b.near(p.target, 12)) b.applyStatus(g, 'shock', { dur: 2, src: b.hero });
      },
    },
  },
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
    desc: 'Echoing Soul’s copy takes a random element and soaks every enemy in that element’s status.',
    hooks: { onBattleStart: (b) => (b.flags.chaosEcho = true) },
  },
  firestorm: {
    py: 'huǒ fēng bào', zh: '火风暴', en: 'Firestorm', requires: ['burning_passion', 'wind_step'], archetype: 'Burning Swarm',
    desc: 'Dodging during Burning Passion whips up a firestorm that sets every enemy Burning.',
    hooks: {
      onDodge(b, p, s) {
        if (!b.buffActive('passion') || (s.at || -9) > b.t - 1) return;
        s.at = b.t;
        b.label(b.hero, 'huǒ fēng bào!', 'good');
        for (const f of b.foes()) b.applyStatus(f, 'burn', { dps: 5, src: b.hero });
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
    py: 'biān zhī', zh: '编织', en: 'Ink Weaver', requires: ['quick_ink', 'resonance'], archetype: 'Signature Weaver',
    desc: 'Resonance bursts every 2nd signature move instead of every 3rd.',
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
    py: 'chāo zài', zh: '超载', en: 'Overcharge', requires: ['reservoir', 'charged_strike'], archetype: 'Signature Weaver',
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
    py: 'bì léi', zh: '避雷', en: 'Lightning Rod', requires: ['conductive_ink', 'tide_tip'], archetype: 'Storm Conductor',
    desc: 'Every 3 seconds, lightning strikes a Wet enemy for 30 and Conducts to every other Wet enemy.',
    hooks: {
      onTick(b, p, s) {
        s.t = (s.t || 0) + 1;
        if (s.t < 3) return;
        s.t = 0;
        const f = b.foes().find((x) => x.statuses.wet);
        if (!f) return;
        b.emit({ type: 'biome', kind: 'lightning', tgt: f.id });
        b.damage(b.hero, f, 30, { element: 'lightning', kind: 'proc' });
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
    py: 'àn qì', zh: '暗器', en: 'Hidden Blades', requires: ['patient_blade', 'shadow_double'], archetype: 'Wind Dancer',
    desc: 'Patient Blade also summons a shadow illusion that keeps cutting.',
    hooks: {
      onBlade(b, p) {
        if (!p.wave && b.allies().length < 4) b.spawnAlly({ sprite: 'shade', ttl: 3, interval: 0.5, dmg: b.hero.atk * 0.5, element: 'dark' });
      },
    },
  },
  scholars_storm: {
    py: 'bó xué', zh: '博学', en: 'Erudite Storm', requires: ['deny_danger', 'chain_reaction'], archetype: 'Chaos Alchemist',
    desc: 'Deny Danger!’s shockwave also leaves a random status on every enemy it throws.',
    hooks: { onRepel: (b, p) => p.targets.forEach((f) => b.applyStatus(f, pick(b, ['burn', 'chill', 'wet', 'shock', 'curse']), { src: b.hero, dps: 3 })) },
  },
  cheer_squad: {
    py: 'yì qǐ', zh: '一起', en: 'All Together', requires: ['fruit_salad', 'resonance'], archetype: 'Radiant Guardian',
    desc: 'Bonus and echoed fruit count toward Resonance too, and each Resonance burst also serves a strawberry shield.',
    hooks: {
      onBattleStart: (b) => (b.flags.resonanceEcho = true),
      onFruit: (b, p) => p.bonus && b.addShield(b.hero, 6),
    },
  },

  // ---------------------------------------------------------------- deep combinations
  thunder_counter: {
    py: 'léi jī', zh: '雷击', en: 'Thunder Counter', requires: ['counterstrike', 'spark_arc'], archetype: 'Storm Conductor',
    desc: 'Counterattacks are always critical hits, so every dodge ends in a lightning arc.',
    hooks: { onAttack: (b, p) => p.counter && (p.forceCrit = true) },
  },
  demolition: {
    py: 'chāi chú', zh: '拆除', en: 'Demolition', requires: ['wallbreaker', 'chain_collision'], archetype: 'Heavy Bruiser',
    desc: 'Wall slams explode: enemies near the impact take damage too and are Stunned.',
    hooks: { onBattleStart: (b) => (b.flags.demolition = true) },
  },
  shatter_wall: {
    py: 'bīng bēng', zh: '冰崩', en: 'Avalanche', requires: ['wallbreaker', 'frost_tip'], archetype: 'Frost Fortress',
    desc: 'Enemies you slam into the wall are Chilled, and Frozen ones Shatter (they always shatter on a wall slam).',
    hooks: { onWallHit: (b, p) => p.target.alive && b.applyStatus(p.target, 'chill', { src: b.hero, dur: 3 }) },
  },
  fruit_frenzy: {
    py: 'guǒ kuáng', zh: '果狂', en: 'Fruit Frenzy', requires: ['fruit_basket', 'bouncy_fruit'], archetype: 'Fruit Salad',
    desc: 'Every seed from Fruit Basket bounces on to a second enemy.',
    hooks: { onBattleStart: (b) => (b.flags.fruitFrenzy = true) },
  },
  echo_fruit: {
    py: 'shuāng guǒ', zh: '双果', en: 'Double Helping', requires: ['fruit_salad', 'echo_cast'], archetype: 'Fruit Salad',
    desc: 'Echoing Soul serves a second, different fruit at full power instead of a weak copy.',
    hooks: { onBattleStart: (b) => (b.flags.echoFruit = true) },
  },
  fruit_wave: {
    py: 'guǒ bō', zh: '果波', en: 'Juice Wave', requires: ['fruit_salad', 'overflowing_ink'], archetype: 'Fruit Salad',
    desc: 'Healing from fruit releases a shockwave: 20 damage to nearby enemies and pushes them back.',
    hooks: {
      onHeal(b, p, s) {
        if (!p.fruit || (s.at || -9) > b.t - 0.8) return;
        s.at = b.t;
        b.emit({ type: 'cast', spell: 'gust', element: 'light' });
        for (const f of b.foes().filter((x) => x.x - b.hero.x <= 32)) {
          b.damage(b.hero, f, 20, { element: 'light', kind: 'proc' });
          b.knockback(f, 6, { src: b.hero });
        }
      },
    },
  },
  peel_dancer: {
    py: 'huá bù', zh: '滑步', en: 'Peel Dancer', requires: ['fruit_salad', 'ghost_step'], archetype: 'Fruit Salad',
    desc: 'Banana peels last twice as long and work 6 times, and every enemy that slips triggers your dodge effects.',
    hooks: {
      onBattleStart: (b) => (b.flags.peelLong = true),
      onSlip(b, p, s) {
        if ((s.at || -9) > b.t - 0.4) return;
        s.at = b.t;
        b.trigger('onDodge', { src: p.target, ranged: false, slip: true });
      },
    },
  },
  ghost_army: {
    py: 'yīn bīng', zh: '阴兵', en: 'Ghost Army', requires: ['ghost_step', 'twin_shadows'], archetype: 'Wind Dancer',
    desc: 'Ghost Step’s illusions fight back, and your shadow twin’s strikes Curse.',
    hooks: { onBattleStart: (b) => (b.flags.ghostArmy = true) },
  },
  crimson_tide: {
    py: 'xuè cháo', zh: '血潮', en: 'Crimson Tide', requires: ['bleeding_edge', 'hemorrhage'], archetype: 'Shadow Parasite',
    desc: 'Bleeding enemies take 25% more damage from critical hits, and Bleed heals you a little.',
    hooks: {
      modDamage(b, c) {
        if (c.tgt.statuses.bleed && c.crit) c.mult *= 1.25;
        if (c.kind === 'dot' && c.element === 'physical') b.heal(b.hero, c.amount * 0.2, { silent: true });
      },
    },
  },
  blood_crown: {
    py: 'xuè guān', zh: '血冠', en: 'Blood Crown', requires: ['cursed_crown', 'overextension'], archetype: 'Fast Fighter',
    desc: 'While you have Momentum, 12% of the damage you deal heals you.',
    hooks: { onTick: (b) => b.hasMomentum() && b.addBuff(b.hero, { id: 'blood_crown', dur: 1.1, stats: { lifesteal: 0.12 } }) },
  },
  tidal_storm: {
    py: 'bào yǔ', zh: '暴雨', en: 'Downpour', requires: ['rain_dancer', 'spark_arc'], archetype: 'Storm Conductor',
    desc: 'Crit arcs seek Wet enemies, and dodging also electrifies Wet ground.',
    hooks: {
      onBattleStart: (b) => (b.flags.arcWet = true),
      onDodge: (b) => b.hasTerrain('wet') && b.terrainElement('lightning'),
    },
  },
  clockwork: {
    py: 'fā tiáo', zh: '发条', en: 'Clockwork', requires: ['broken_hourglass', 'quick_ink'], archetype: 'Signature Weaver',
    desc: 'Each Broken Hourglass surge also recharges your signature 1s faster.',
    hooks: { onBattleStart: (b) => (b.flags.clockwork = true) },
  },
  parasite_bloom: {
    py: 'mò huā', zh: '墨花', en: 'Ink Bloom', requires: ['ink_parasite', 'wild_brush'], archetype: 'Chaos Alchemist',
    desc: 'Ink Parasite spreads statuses 60% of the time, and Wild Brush hits 4 enemies.',
    hooks: {
      onBattleStart(b) {
        b.flags.parasiteAll = true;
        b.flags.wildAll = true;
      },
    },
  },
  lucky_star: {
    py: 'fú xīng', zh: '福星', en: 'Lucky Star', requires: ['go_all_out', 'lucky_cat'], archetype: 'Wind Dancer',
    desc: 'Go All Out! lasts 2s longer and starts with a 20 shield.',
    hooks: {
      onSignature(b, c) {
        if (c.echo) return;
        b.extendBuff(b.hero, 'frenzy', 2, 2);
        b.grantMomentum(b.hero, b.hero.buffs.find((x) => x.id === 'frenzy')?.until - b.t || 0);
        b.addShield(b.hero, 20);
      },
    },
  },
  storm_flail: {
    py: 'léi suǒ', zh: '雷锁', en: 'Storm Flail', requires: ['knockback', 'spark_arc'], archetype: 'Storm Conductor',
    desc: 'Every enemy that slams into the wall releases lightning that arcs to two other enemies (15 each).',
    hooks: {
      onWallHit(b, p) {
        const hit = [p.target];
        for (let i = 0; i < 2; i++) {
          const f = b.randomFoe(hit);
          if (!f) return;
          b.emit({ type: 'shot', src: p.target.id, tgt: f.id, element: 'lightning', bolt: true });
          b.damage(b.hero, f, 15, { element: 'lightning', kind: 'proc' });
          hit.push(f);
        }
      },
    },
  },
  final_verdict: {
    py: 'pàn jué', zh: '判决', en: 'Final Verdict', requires: ['deny_danger', 'final_word'], archetype: 'Earth Guardian',
    desc: 'Each Deny Danger! also arms 3 empowered attacks that Mark their target.',
    hooks: {
      onRepel: (b, p, s) => !p.second && (s.n = 3),
      onHit(b, p, s) {
        if (!(s.n > 0) || p.sub) return;
        s.n -= 1;
        b.applyStatus(p.target, 'mark', { src: b.hero, dur: 4 });
      },
    },
  },
  inferno_heart: {
    py: 'liè huǒ', zh: '烈火', en: 'Inferno', requires: ['burning_passion', 'ashes'], archetype: 'Burning Swarm',
    desc: 'During Burning Passion, Burning enemies that die explode twice as hard and reset 1s of your cooldown.',
    hooks: {
      onKill(b, p) {
        if (!b.buffActive('passion') || !p.statuses.burn) return;
        for (const f of b.near(p.target, 22)) b.damage(b.hero, f, 30, { element: 'fire', kind: 'proc' });
        b.reduceCooldowns(1);
      },
    },
  },
  blade_storm: {
    py: 'jiàn fēng', zh: '剑风', en: 'Blade Storm', requires: ['patient_blade', 'second_wave', 'blood_blossom'], archetype: 'Rare',
    desc: 'Patient Blade’s second wave also Bleeds, and every Bleeding enemy it hits takes double.',
    hooks: {
      modDamage: (b, c) => c.kind === 'spell' && c.element === 'wind' && c.tgt.statuses.bleed && (c.mult *= 2),
    },
  },
  repel_wall: {
    py: 'bù dòng', zh: '不动', en: 'Unshakeable', requires: ['deny_danger', 'iron_roots'], archetype: 'Earth Guardian',
    desc: 'While Deny Danger!’s shield holds, you can’t be knocked back and take 20% less damage.',
    hooks: {
      modKnockback: (b, p) => b.hero.sigShield > 0 && b.hero.shield > 0 && (p.dist = 0),
      modIncoming: (b, c) => b.hero.sigShield > 0 && b.hero.shield > 0 && (c.mult *= 0.8),
    },
  },
  thunder_god: {
    py: 'léi shén', zh: '雷神', en: 'Thunder God', requires: ['knockback', 'arc_flail', 'storm_barrier'], archetype: 'Rare',
    desc: 'Lei’s Knockback! comes back 3s sooner, and the storm barrier stays twice as long.',
    hooks: {
      onLaunch(b) {
        b.reduceCooldowns(3);
        for (const z of b.zones) if (z.kind === 'barrier') z.until += 6;
      },
    },
  },
};

/** Synergies whose requirements (item ids and the hero's signature id) are all owned. */
export function activeSynergies(items = [], signatures = []) {
  const owned = new Set([...items, ...signatures]);
  return Object.entries(SYNERGIES)
    .filter(([, s]) => s.requires.every((r) => owned.has(r)))
    .map(([id]) => id);
}

/** Synergies that would complete if `id` were added. */
export function synergiesCompletedBy(id, items = [], signatures = []) {
  const owned = new Set([...items, ...signatures]);
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
