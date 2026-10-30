// Synergies: activate automatically when you own every passive item they list. Like items, every
// synergy works for every hero, against one enemy or many (tests/items.test.js checks each one
// changes fights for all six heroes). They use the same hook system as items, often by setting
// battle flags that the item hooks read (e.g. b.flags.shieldFreeze makes Bursting Shield freeze).
// Rare, absurd combinations are allowed on purpose; the engine's depth/proc/ally limits, copied
// attacks never copying themselves, and the items' own internal cooldowns keep them finite.
import { pick, RANDOM_STATUSES, ready, around, burst, clone, strike } from './itemKit.js';

export const SYNERGIES = {
  // ---------------------------------------------------------------- positioning & momentum
  vanguard_charge: {
    py: 'chōng fēng', zh: '冲锋', en: 'Vanguard Charge', requires: ['reckless_charge', 'swift_pursuit'], archetype: 'Fast Fighter',
    desc: 'Gaining Momentum also grants +40% attack speed for 4s.',
    hooks: { onMomentum: (b, p) => p.on && b.addBuff(b.hero, { id: 'vanguard', dur: 4, stats: { aspdPct: 0.4 } }) },
  },
  line_breaker: {
    py: 'pò zhèn', zh: '破阵', en: 'Line Breaker', requires: ['thunder_impact', 'heavy_frame'], archetype: 'Heavy Bruiser',
    desc: 'Enemies you knock back at least 4 are Stunned for 0.6s.',
    hooks: { onKnockback: (b, p) => !p.pull && p.dist >= 4 && b.applyStatus(p.target, 'stun', { dur: 0.6, src: b.hero }) },
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
    desc: 'Every 6 seconds, any enemy standing in your half is driven back across the midpoint, and the boundary stone grows a 15 shield on you.',
    hooks: {
      onTick(b, p, s) {
        s.t = (s.t || 0) + 1;
        if (s.t < 6) return;
        s.t = 0;
        b.addShield(b.hero, 15);
        for (const f of b.foes()) if (!b.inOwnZone(f)) b.knockback(f, Math.max(4, b.mid - f.x + 6), { src: b.hero });
      },
    },
  },
  storm_hammer: {
    py: 'léi chuí', zh: '雷锤', en: 'Storm Hammer', requires: ['thunder_impact', 'arc_flail'], archetype: 'Heavy Bruiser',
    desc: 'Every push of 2 or more Shocks its target, and Shocked enemies that hit the wall or another enemy pass the Shock (and 20% attack) to their neighbours.',
    hooks: {
      onKnockback: (b, p) => !p.pull && p.dist >= 2 && b.applyStatus(p.target, 'shock', { dur: 3, src: b.hero }),
      onWallHit: (b, p) => p.target.statuses.shock && passShock(b, p.target),
      onCollide: (b, p) => p.other.statuses.shock && passShock(b, p.other),
    },
  },
  chain_explosion: {
    py: 'bào zhà', zh: '爆炸', en: 'Chain Explosion', requires: ['ember_tip', 'split_ink'], archetype: 'Burning Swarm',
    desc: 'Burning enemies explode on death (30 fire to everything nearby, spreading their Burn), and ink shards that hit a Burning enemy explode too (20% attack).',
    hooks: {
      onKill(b, p) {
        if (!p.statuses.burn) return;
        b.emit({ type: 'reaction', tgt: p.target.id, id: 'explode', text: 'bào zhà' });
        for (const f of b.near(p.target, 20)) {
          b.damage(b.hero, f, 30, { element: 'fire', kind: 'proc' });
          b.applyStatus(f, 'burn', { dps: p.statuses.burn.dps, src: b.hero });
        }
      },
      onDeal(b, p, s) {
        if (p.kind === 'proc' && p.target.statuses.burn && ready(b, s, 0.3)) burst(b, p.target, 10, b.hero.atk * 0.2, 'fire', { fx: 'bomb' });
      },
    },
  },
  storm_conductor: {
    py: 'léi diàn', zh: '雷电', en: 'Storm Conductor', requires: ['tide_tip', 'spark_arc'], archetype: 'Storm Conductor',
    desc: 'Crit arcs seek Wet enemies, and every Conduct reaction triggers an extra basic attack.',
    hooks: {
      onBattleStart: (b) => (b.flags.arcWet = true),
      onReaction(b, p, s) {
        if (p.reaction !== 'conduct' || !ready(b, s, 0.4)) return;
        b.heroAttack({ counter: true });
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
    desc: 'Your heavy attacks count as Earth against Frozen enemies, so they Shatter them (×2.5).',
    hooks: { onAttack: (b, p) => p.target?.statuses.frozen && (p.element = 'earth') },
  },
  wildfire_dance: {
    py: 'yě huǒ', zh: '野火', en: 'Wildfire Dance', requires: ['wind_step', 'ember_trail'], archetype: 'Wind Dancer',
    desc: 'Wind Step gusts carry your fire: every enemy they hit starts Burning, and every ember ring also releases a gust.',
    hooks: {
      onBattleStart: (b) => (b.flags.gustFire = true),
      onTick(b, p, s) {
        if (b.hero.still >= 1 && (b.flags.flameUntil || 0) > b.t && ready(b, s, 3)) {
          b.emit({ type: 'cast', spell: 'gust', element: 'wind' });
          for (const f of around(b, b.hero.x, 30)) {
            b.knockback(f, 6, { src: b.hero });
            b.applyStatus(f, 'burn', { dps: 3, src: b.hero });
          }
        }
      },
    },
  },
  chaos_echo: {
    py: 'hùn luàn', zh: '混乱', en: 'Chaos Echo', requires: ['echo_cast', 'wild_brush'], archetype: 'Chaos Alchemist',
    desc: 'Echoing Soul’s echo takes a random element and soaks every enemy in that element’s status.',
    hooks: { onBattleStart: (b) => (b.flags.chaosEcho = true) },
  },
  firestorm: {
    py: 'huǒ fēng bào', zh: '火风暴', en: 'Firestorm', requires: ['wind_step', 'ember_tip'], archetype: 'Burning Swarm',
    desc: 'Dodging whips up a firestorm that sets every enemy Burning (at most every 3s).',
    hooks: {
      onDodge(b, p, s) {
        if (!ready(b, s, 3)) return;
        b.label(b.hero, 'huǒ fēng bào!', 'good');
        b.fx('firestorm', { tgt: 'hero' });
        for (const f of b.foes()) b.applyStatus(f, 'burn', { dps: 4, src: b.hero });
      },
    },
  },
  radiant_guardian: {
    py: 'shǒu hù', zh: '守护', en: 'Radiant Guardian', requires: ['sun_mirror', 'overflow'], archetype: 'Radiant Guardian',
    desc: 'Every 5 seconds the mirror catches the light (10 shield), and while shielded you reflect 30% of incoming hits as light damage.',
    hooks: {
      onTick(b, p, s) {
        s.n = (s.n || 0) + 1;
        if (s.n % 5 === 0) b.addShield(b.hero, 10);
      },
      onDamaged(b, p) {
        if (b.hero.shield > 0 && p.src?.alive && p.src.side === 1) b.damage(b.hero, p.src, p.dealt * 0.3, { element: 'light', kind: 'thorns' });
      },
    },
  },
  shadow_parasite: {
    py: 'jì shēng', zh: '寄生', en: 'Shadow Parasite', requires: ['blood_moon', 'hex_mark'], archetype: 'Shadow Parasite',
    desc: 'Hitting a Cursed enemy heals you 2% HP, and Blood Moon crescents Curse what they cut.',
    hooks: {
      onHit(b, p, s) {
        if (!p.target.statuses.curse || !ready(b, s, 0.3)) return;
        b.heal(b.hero, b.hero.maxHp * 0.02, { silent: true });
      },
      onDeal(b, p) {
        if (p.kind === 'proc' && p.element === 'dark' && p.target.alive) b.applyStatus(p.target, 'curse', { src: b.hero, dur: 3 });
      },
    },
  },
  wind_dancer: {
    py: 'fēng wǔ', zh: '风舞', en: 'Wind Dancer', requires: ['qinggong', 'shadow_double'], archetype: 'Wind Dancer',
    desc: '+15% attack speed, +5% dodge, and shadow doubles last twice as long.',
    stats: { aspdPct: 0.15, dodge: 0.05 },
    hooks: { onBattleStart: (b) => (b.flags.illusionTtl = 5.2) },
  },
  spell_weaver: {
    py: 'biān zhī', zh: '编织', en: 'Ink Weaver', requires: ['quick_ink', 'resonance'], archetype: 'Signature Weaver',
    desc: 'Resonance bursts on every successful signature move.',
    hooks: { onBattleStart: (b) => (b.flags.resonanceN = 1) },
  },
  glass_phoenix: {
    py: 'fèng huáng', zh: '凤凰', en: 'Glass Phoenix', requires: ['paper_phoenix', 'glass_brush'], archetype: 'Rare',
    desc: 'Paper Phoenix revives you at full health, and its swoops shatter into glass shards (3 more hits at 25%).',
    hooks: {
      onBattleStart: (b) => (b.flags.phoenixFull = true),
      onDeal(b, p, s) {
        if (p.kind === 'proc' && p.element === 'fire' && !b.runState.phoenixUsed && ready(b, s, 5)) for (let i = 0; i < 3; i++) b.damage(b.hero, b.randomFoe() || p.target, b.hero.atk * 0.25, { kind: 'proc', element: 'physical', noKnock: true });
      },
    },
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
    desc: 'While your burning ground or ember rings are alight, gain a 3 shield every second.',
    hooks: { onTick: (b) => (b.flags.flameUntil || 0) > b.t && b.addShield(b.hero, 3) },
  },
  twin_mirrors: {
    py: 'shuāng jìng', zh: '双镜', en: 'Twin Mirrors', requires: ['mirror_ink', 'broken_compass'], archetype: 'Basic Attack Specialist',
    desc: 'Mirror Ink fires every 2nd attack at full damage, and a second reflection strikes from the other side at the nearest enemy at the same time: attacks rain in from both ends of the battlefield.',
    hooks: {
      onBattleStart: (b) => (b.flags.mirrorEvery = 2),
      onAttack(b, p) {
        if (p.copy || p.count % 2) return;
        const near = b.front();
        b.schedule(0.1, () => !b.result && b.heroAttack({ copy: true, target: near, mult: 0.8 }));
      },
    },
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
    py: 'shān yuè', zh: '山岳', en: 'Rooted Mountain', requires: ['rooted', 'stone_bulwark'], archetype: 'Earth Guardian',
    desc: 'Holding your ground raises a stone fortress: Stone Bulwark shields every 5s while you stand still, and while Rooted Stance has 6+ armor, rock walls burst up in front of you every 4s (80% attack to everything there, push 6, and an 8 shield).',
    hooks: { onBattleStart: (b) => (b.flags.mountain = true) },
  },
  golden_light: {
    py: 'jīn guāng', zh: '金光', en: 'Golden Light', requires: ['golden_bell', 'vitality'], archetype: 'Radiant Guardian',
    desc: 'Golden Bell rings twice per battle, and every ring brings a giant golden bell crashing down on the enemies: 250% attack to everything under it and a 1.5s Stun.',
    hooks: {
      onBattleStart(b) {
        b.flags.bellCharges = 2;
        b.flags.goldenLight = true;
      },
    },
  },
  lightning_rod: {
    py: 'bì léi', zh: '避雷', en: 'Lightning Rod', requires: ['conductive_ink', 'tide_tip'], archetype: 'Storm Conductor',
    desc: 'Every 3 seconds, lightning strikes a Wet enemy for 30 and Conducts to every other Wet enemy.',
    hooks: {
      onTick(b, p, s) {
        s.t = (s.t || 0) + 1;
        if (s.t < 3) return;
        s.t = 0;
        strike(b, b.foes().find((x) => x.statuses.wet), 30, { status: null });
      },
    },
  },
  bouncing_bomb: {
    py: 'tán bào', zh: '弹爆', en: 'Bouncing Bomb', requires: ['bouncing_ball', 'triple_blast'], archetype: 'Burning Swarm',
    desc: 'Bouncing Balls become bombs: every bounce explodes (40% attack to everything around it) and splits into 2 fragments that seek enemies (15% each).',
    hooks: { onBattleStart: (b) => (b.flags.bounceBomb = true) },
  },
  spark_storm: {
    py: 'léi bào', zh: '雷暴', en: 'Spark Storm', requires: ['forked_bolt', 'spark_arc'], archetype: 'Storm Conductor',
    desc: 'Spark Arc releases two arcs each time.',
    hooks: { onBattleStart: (b) => (b.flags.arcCount = 2) },
  },
  echo_brushwork: {
    py: 'huí yīn', zh: '回音', en: 'Echo Brushwork', requires: ['echo_brush', 'five_petals'], archetype: 'Basic Attack Specialist',
    desc: 'Echo Brush also echoes extra hits, and every item projectile or burst that hits the same enemy twice in a row echoes too (40%).',
    hooks: {
      onBattleStart: (b) => (b.flags.echoAll = true),
      onDeal(b, p, s) {
        if (p.kind !== 'proc' || s.lock) return;
        s.last ||= {};
        const again = s.last[p.target.id] === p.element;
        s.last[p.target.id] = p.element;
        if (!again || !ready(b, s, 0.2)) return;
        s.lock = true;
        b.damage(b.hero, p.target, p.dealt * 0.4, { element: p.element, kind: 'proc', noReact: true, noKnock: true });
        s.lock = false;
      },
    },
  },
  hidden_blade: {
    py: 'àn qì', zh: '暗器', en: 'Hidden Blades', requires: ['shadow_double', 'second_wave'], archetype: 'Wind Dancer',
    desc: 'Every successful signature move also summons a shadow double that keeps copying your attacks for 3s.',
    hooks: {
      onSignature(b, c) {
        if (!c.echo) clone(b, { ttl: 3, interval: 0.5, asHero: true, mult: 0.5 });
      },
    },
  },
  scholars_storm: {
    py: 'bó xué', zh: '博学', en: 'Erudite Storm', requires: ['chain_reaction', 'storm_edge'], archetype: 'Chaos Alchemist',
    desc: 'Every successful signature move whips up a storm of elements: every enemy gains 2 different random statuses. Your critical hits spread every status on their target to another enemy.',
    hooks: {
      onSignature(b, c) {
        if (c.echo) return;
        b.fx('elements', { tgt: 'hero' });
        for (const f of b.foes()) {
          const a = pick(b, RANDOM_STATUSES);
          const d = pick(b, RANDOM_STATUSES.filter((x) => x !== a));
          b.applyStatus(f, a, { src: b.hero, dps: 3 });
          b.applyStatus(f, d, { src: b.hero, dps: 3 });
        }
      },
      onCrit(b, p, s) {
        const g = b.randomFoe([p.target]);
        if (!g || s.lock || !ready(b, s, 0.3)) return;
        s.lock = true;
        for (const [id, st] of Object.entries(p.target.statuses)) b.applyStatus(g, id, { src: b.hero, dps: st.dps || 3 });
        s.lock = false;
      },
    },
  },
  cheer_squad: {
    py: 'yì qǐ', zh: '一起', en: 'All Together', requires: ['resonance', 'patient_reward'], archetype: 'Radiant Guardian',
    desc: 'Every successful signature move counts double toward Resonance (so it bursts every time), and each burst also grants a 20 shield and calls two spirit companions to fight beside you for 5s.',
    hooks: {
      onBattleStart(b) {
        b.flags.resonanceDouble = true;
        b.flags.allTogether = true;
      },
    },
  },
  thunder_counter: {
    py: 'léi jī', zh: '雷击', en: 'Thunder Counter', requires: ['counterstrike', 'spark_arc'], archetype: 'Storm Conductor',
    desc: 'Counterattacks are always critical hits, so every dodge ends in a lightning arc.',
    hooks: { onAttack: (b, p) => p.counter && (p.forceCrit = true) },
  },
  demolition: {
    py: 'chāi chú', zh: '拆除', en: 'Demolition', requires: ['wallbreaker', 'chain_collision'], archetype: 'Heavy Bruiser',
    desc: 'Wall slams explode: enemies near the impact take damage too and are Stunned. Chain Collision’s body-check detonates as well (40% attack around the target, Stun 0.5s).',
    hooks: {
      onBattleStart: (b) => (b.flags.demolition = true),
      onAttack(b, p) {
        if (p.copy || p.count % 6) return;
        const t = p.target;
        b.schedule(0.2, () => {
          if (b.result || !t.alive) return;
          burst(b, t, 14, b.hero.atk * 0.4, 'earth', { fx: 'bomb' });
          for (const f of around(b, t, 14)) b.applyStatus(f, 'stun', { dur: 0.5, src: b.hero });
        });
      },
    },
  },
  shatter_wall: {
    py: 'bīng bēng', zh: '冰崩', en: 'Avalanche', requires: ['wallbreaker', 'frost_tip'], archetype: 'Frost Fortress',
    desc: 'Enemies you slam into the wall or push 2 or more are Chilled, and Frozen ones Shatter.',
    hooks: {
      onWallHit: (b, p) => p.target.alive && b.applyStatus(p.target, 'chill', { src: b.hero, dur: 3 }),
      onKnockback(b, p) {
        if (p.pull || p.dist < 2 || !p.target.alive) return;
        if (p.target.statuses.frozen) b.shatter(p.target, b.hero);
        else b.applyStatus(p.target, 'chill', { src: b.hero, dur: 2 });
      },
    },
  },
  chain_blast: {
    py: 'lián bào', zh: '连爆', en: 'Chain Blast', requires: ['explosive_impact', 'split_ink'], archetype: 'Burning Swarm',
    desc: 'Explosive Impact explosions throw shrapnel at another enemy too.',
    hooks: { onBattleStart: (b) => (b.flags.chainBlast = true) },
  },
  echo_fruit: {
    py: 'huí xiǎng', zh: '回响', en: 'Resounding Echo', requires: ['echo_cast', 'lingering'], archetype: 'Signature Weaver',
    desc: 'Echoing Soul’s echo is as strong as the original move.',
    hooks: { onBattleStart: (b) => (b.flags.echoPower = 1) },
  },
  fruit_wave: {
    py: 'quán bō', zh: '泉波', en: 'Healing Wave', requires: ['overflowing_ink', 'spring_tea'], archetype: 'Radiant Guardian',
    desc: 'Every 4th sip of Spring Tea ripples outward as a healing wave (12 water damage and a push to every enemy near you). Healing 5% or more at once releases a bigger wave that grows with the heal.',
    hooks: {
      onBattleStart: (b) => (b.flags.healingWave = true),
      onHeal(b, p, s) {
        if (p.amount < b.hero.maxHp * 0.05 || !ready(b, s, 1.5)) return;
        const scale = 1 + (p.amount / b.hero.maxHp) * 10;
        b.fx('healwave', { tgt: 'hero' });
        for (const f of around(b, b.hero.x, 34 * Math.min(1.6, scale))) {
          b.damage(b.hero, f, 12 * scale, { element: 'water', kind: 'proc', noKnock: true });
          b.knockback(f, 4 * Math.min(2, scale), { src: b.hero });
        }
      },
    },
  },
  peel_dancer: {
    py: 'huàn wǔ', zh: '幻舞', en: 'Phantom Dance', requires: ['ghost_step', 'slipstream'], archetype: 'Wind Dancer',
    desc: 'Every dodge also grants an 8 shield, and Ghost Step’s illusions explode for 25 when they fade.',
    hooks: {
      onDodge(b, p, s) {
        b.addShield(b.hero, 8);
        if (!ready(b, s, 1.6)) return;
        b.schedule(1.6, () => {
          if (b.result) return;
          burst(b, b.hero.x, 30, 25, 'dark', { fx: 'bomb' });
        });
      },
    },
  },
  ghost_army: {
    py: 'yīn bīng', zh: '阴兵', en: 'Ghost Army', requires: ['ghost_step', 'twin_shadows'], archetype: 'Wind Dancer',
    desc: 'Ghost Step’s illusions fight back (copying your attacks), and your shadow twin’s strikes Curse.',
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
    desc: 'Spark arcs seek Wet enemies, and dodging electrifies the ground (Wet ground becomes Electrified).',
    hooks: {
      onBattleStart: (b) => (b.flags.arcWet = true),
      onDodge(b) {
        b.setTerrain('wet', 3);
        b.terrainElement('lightning');
      },
    },
  },
  clockwork: {
    py: 'fā tiáo', zh: '发条', en: 'Clockwork', requires: ['broken_hourglass', 'quick_ink'], archetype: 'Signature Weaver',
    desc: 'Each Broken Hourglass surge recharges your signature 1s faster, and during the surge every attack leaves a delayed spectral copy of itself (50%) that strikes a moment later.',
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
    py: 'fú xīng', zh: '福星', en: 'Lucky Star', requires: ['lucky_cat', 'lucky_charm'], archetype: 'Wind Dancer',
    desc: '+10% critical chance. A quarter of your critical hits call down a falling star: 60% attack as light to everything where it lands, and it heals you 2%.',
    stats: { crit: 0.1 },
    hooks: {
      onCrit(b, p, s) {
        if (b.rng() >= 0.25 || !ready(b, s, 0.5)) return;
        b.fx('star', { tgt: p.target });
        burst(b, p.target, 12, b.hero.atk * 0.6, 'light');
        b.heal(b.hero, b.hero.maxHp * 0.02);
      },
    },
  },
  storm_flail: {
    py: 'léi suǒ', zh: '雷锁', en: 'Storm Flail', requires: ['wallbreaker', 'spark_arc'], archetype: 'Storm Conductor',
    desc: 'Every enemy that slams into the wall, and every push of 2 or more (every 0.8s), releases lightning that arcs to two other enemies (15 each; struck from the sky if alone).',
    hooks: {
      onWallHit: (b, p) => flailArcs(b, p.target),
      onKnockback: (b, p, s) => !p.pull && p.dist >= 2 && ready(b, s, 0.8) && flailArcs(b, p.target),
    },
  },
  final_verdict: {
    py: 'pàn jué', zh: '判决', en: 'Final Verdict', requires: ['final_word', 'invaders_mark'], archetype: 'Earth Guardian',
    desc: 'Final Word’s empowered attacks also Mark their targets (they take 20% more from you).',
    hooks: {
      onSignature: (b, c, s) => !c.echo && (s.n = 3),
      onHit(b, p, s) {
        if (!(s.n > 0) || p.sub) return;
        s.n -= 1;
        b.applyStatus(p.target, 'mark', { src: b.hero, dur: 4 });
      },
    },
  },
  inferno_heart: {
    py: 'liè huǒ', zh: '烈火', en: 'Inferno', requires: ['ashes', 'cinder_heart'], archetype: 'Burning Swarm',
    desc: 'Burning enemies explode when they die (30 to enemies nearby) and recharge your signature 1s faster; every healing ember also sparks a small explosion (20% attack).',
    hooks: {
      onKill(b, p) {
        if (!p.statuses.burn) return;
        for (const f of b.near(p.target, 22)) b.damage(b.hero, f, 30, { element: 'fire', kind: 'proc' });
        b.reduceCooldowns(1);
      },
      onHeal(b, p, s) {
        if (p.amount > 0 && ready(b, s, 3)) {
          const f = b.foes().find((x) => x.statuses.burn);
          if (f) burst(b, f, 12, b.hero.atk * 0.2, 'fire', { fx: 'ember' });
        }
      },
    },
  },
  blade_storm: {
    py: 'jiàn fēng', zh: '剑风', en: 'Blade Storm', requires: ['second_wave', 'blood_blossom'], archetype: 'Rare',
    desc: 'Second Wave deals double damage to Bleeding enemies and makes the others Bleed.',
    hooks: {
      modDamage(b, c) {
        if (c.kind !== 'proc' || c.element !== 'wind' || !c.tgt) return;
        if (c.tgt.statuses.bleed) c.mult *= 2;
        else b.applyStatus(c.tgt, 'bleed', { dps: 4, src: b.hero });
      },
    },
  },
  repel_wall: {
    py: 'bù dòng', zh: '不动', en: 'Unshakeable', requires: ['iron_roots', 'stone_bulwark'], archetype: 'Earth Guardian',
    desc: 'While you have a shield you can’t be knocked back and take 20% less damage.',
    hooks: {
      modKnockback: (b, p) => b.hero.shield > 0 && (p.dist = 0),
      modIncoming: (b, c) => b.hero.shield > 0 && (c.mult *= 0.8),
    },
  },
  thunder_god: {
    py: 'léi shén', zh: '雷神', en: 'Thunder God', requires: ['arc_flail', 'storm_barrier', 'charge_up'], archetype: 'Rare',
    desc: 'Storm Barriers become the wrath of heaven: they last twice as long, zap harder, call down lightning on everything near them every 2s (80% attack), and every enemy that crosses one is struck by lightning (100% attack, long Shock) and recharges your signature 1s.',
    hooks: { onBattleStart: (b) => (b.flags.thunderGod = true) },
  },

  // ---------------------------------------------------------------- build-defining combinations
  puppet_strings: {
    py: 'kuǐ lěi', zh: '傀儡', en: 'Puppet Strings', requires: ['red_thread', 'chain_collision'], archetype: 'Rare',
    desc: 'Red threads last 10s, and threaded enemies knocked into each other or into the wall burst at the seams (50% attack to everything around them).',
    hooks: {
      onBattleStart: (b) => (b.flags.threadLong = true),
      onCollide: (b, p, s) => (p.target.thread?.until > b.t || p.other.thread?.until > b.t) && ready(b, s, 0.3) && burst(b, p.target, 12, b.hero.atk * 0.5, 'physical', { fx: 'thread' }),
      onWallHit: (b, p, s) => p.target.thread?.until > b.t && ready(b, s, 0.3, 'w') && burst(b, p.target, 12, b.hero.atk * 0.5, 'physical', { fx: 'thread' }),
    },
  },
  time_loop: {
    py: 'xún huán', zh: '循环', en: 'Time Loop', requires: ['borrowed_time', 'afterimage'], archetype: 'Rare',
    desc: 'Every Borrowed Time afterimage repeats your attack twice, and every Afterimage clone leaves a frozen afterimage of its own.',
    hooks: {
      onBattleStart: (b) => (b.flags.timeLoop = true),
      onDodge(b, p, s) {
        if (b.state('afterimage').n % 2 === 0 && ready(b, s, 1)) b.schedule(0.3, () => !b.result && b.heroAttack({ copy: true, mult: 1 }));
      },
    },
  },
  hall_of_mirrors: {
    py: 'jìng gōng', zh: '镜宫', en: 'Hall of Mirrors', requires: ['mirror_world', 'mirror_ink'], archetype: 'Basic Attack Specialist',
    desc: 'Your mirror self strikes at 80% instead of 50%, and every one of its strikes is a critical hit.',
    hooks: { onBattleStart: (b) => (b.flags.hallMirrors = true) },
  },
  avalanche_of_bodies: {
    py: 'rén làng', zh: '人浪', en: 'Human Wave', requires: ['thunderclap_drum', 'pileup'], archetype: 'Heavy Bruiser',
    desc: 'The Thunderclap Drum booms every 3rd push instead of every 5th, and every boom sends the target crashing into whoever stands behind it.',
    hooks: {
      onBattleStart: (b) => (b.flags.drumEvery = 3),
      onKnockback(b, p, s) {
        if (p.pull || p.dist < 6 || !ready(b, s, 0.5)) return;
        for (const f of b.foes()) if (f !== p.target && f.x > p.target.x && f.x - p.target.x < 14) b.knockback(f, p.dist * 0.6, { src: b.hero });
      },
    },
  },
  unmovable_shell: {
    py: 'tiě ké', zh: '铁壳', en: 'Iron Shell', requires: ['turtles_revenge', 'heavy_frame'], archetype: 'Earth Guardian',
    desc: 'Hits store twice as much energy in Turtle’s Revenge, and releasing 30 or more also grants you a shield worth half of it.',
    hooks: { onBattleStart: (b) => (b.flags.shellDouble = true) },
  },
  black_hole: {
    py: 'hēi dòng', zh: '黑洞', en: 'Black Hole', requires: ['gravity_seal', 'explosive_impact'], archetype: 'Chaos Alchemist',
    desc: 'Gravity Seals open every 6s instead of 9s, and their detonation Stuns everything caught for 1s.',
    hooks: { onBattleStart: (b) => (b.flags.blackHole = true) },
  },
};

/** Storm Hammer: a Shocked enemy passes its Shock on. */
function passShock(b, u) {
  for (const g of b.near(u, 12)) {
    b.applyStatus(g, 'shock', { dur: 2, src: b.hero });
    b.damage(b.hero, g, b.hero.atk * 0.2, { element: 'lightning', kind: 'proc', noKnock: true });
  }
}
/** Storm Flail: two arcs from an impact (lightning from the sky on a lone enemy). */
function flailArcs(b, from) {
  const hit = [from];
  for (let i = 0; i < 2; i++) {
    const f = b.randomFoe(hit);
    if (!f) {
      strike(b, from, 15, { status: null });
      return;
    }
    b.emit({ type: 'shot', src: from.id, tgt: f.id, element: 'lightning', bolt: true });
    b.damage(b.hero, f, 15, { element: 'lightning', kind: 'proc' });
    hit.push(f);
  }
}

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
