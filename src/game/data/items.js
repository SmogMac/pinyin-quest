// Passive items: the main source of build complexity. Items are unique (no duplicates) and
// stack freely with each other. Each item can have:
//   stats: flat bonuses applied when the hero is built (see STAT_KEYS in combat.js)
//   hooks: functions called by the combat engine: (battle, payload, state) => void
//          onBattleStart onAttack onHit onCrit onSpellHit onDamaged onDodge onBlock onShieldBreak
//          onStatus onReaction onCast onCastFail onKill onMove onHeal onTick onLowHp onFatal
//          onKnockback (you pushed/pulled an enemy) onKnocked (you were pushed) onRecover
//          onMomentum ({on}) · modDamage modIncoming modSpellPower modHeal
//          modKnockback (push you receive) modKnockOut (push you deal)
//   stats also include kbPct (push further), kbRes (resist pushes), momentumAspd
//   requires: vocabulary (any one learned Hanzi word unlocks the item for discovery)
//   category: attack | movement | defense | spell | conditional | strange
// Names are shown pinyin-first. Add new items freely; the engine never needs changing.

const R = { common: 'common', rare: 'rare', epic: 'epic' };
const nearHero = (b, r = 30) => b.foes().filter((f) => f.x - b.hero.x <= r);
/** Countercurrent's gust (at most twice a second, so chained knockbacks can't loop). */
function gust(b, s) {
  if ((s.at || -9) > b.t - 0.5) return;
  s.at = b.t;
  b.emit({ type: 'cast', spell: 'gust', element: 'wind' });
  for (const f of nearHero(b, 26)) {
    b.damage(b.hero, f, b.hero.atk * 0.25, { element: 'wind', kind: 'proc' });
    b.knockback(f, 7, { src: b.hero });
  }
}
const pick = (b, list) => list[Math.floor(b.rng() * list.length)];
const RANDOM_STATUSES = ['burn', 'chill', 'wet', 'shock', 'curse', 'dazzle'];
const STATUS_ELEMENT = { burn: 'fire', chill: 'ice', frozen: 'ice', wet: 'water', shock: 'lightning', curse: 'dark', dazzle: 'light', stun: 'earth' };

export const ITEMS = {
  // ------------------------------------------------------------- basic attack modifiers
  split_ink: {
    py: 'fēn mò', zh: '分墨', en: 'Splitting Ink', element: 'physical', rarity: R.common, category: 'attack', icon: 'doubleSlash',
    desc: 'Basic attacks split into 2 shards that hit other enemies for 35%.',
    stats: { split: 2 },
  },
  long_spear: {
    py: 'cháng qiāng', zh: '长枪', en: 'Long Spear', element: 'physical', rarity: R.common, category: 'attack', icon: 'sword',
    desc: 'Basic attacks pierce the enemy behind the target (80%).',
    stats: { pierce: 1 },
  },
  bouncing_ball: {
    py: 'tán qiú', zh: '弹球', en: 'Bouncing Ball', element: 'physical', rarity: R.common, category: 'attack', icon: 'echo',
    desc: 'Basic attacks bounce to another random enemy (70%).',
    stats: { bounce: 1 },
  },
  five_petals: {
    py: 'wǔ bàn', zh: '五瓣', en: 'Five Petals', element: 'physical', rarity: R.common, category: 'attack', icon: 'star', requires: ['五'],
    desc: 'Every 5th basic attack fires 2 extra projectiles at random enemies.',
    hooks: {
      onAttack(b, p) {
        if (p.count % 5 === 0) for (let i = 0; i < 2; i++) p.extra.push({ target: b.randomFoe(), mult: 0.7 });
      },
    },
  },
  ember_tip: {
    py: 'huǒ jiān', zh: '火尖', en: 'Ember Tip', element: 'fire', rarity: R.common, category: 'attack', icon: 'flame', requires: ['火'],
    desc: 'Basic attacks set enemies Burning (2/s).',
    hooks: { onHit: (b, p) => b.applyStatus(p.target, 'burn', { dps: 2, src: b.hero }) },
  },
  frost_tip: {
    py: 'bīng jiān', zh: '冰尖', en: 'Frost Tip', element: 'ice', rarity: R.common, category: 'attack', icon: 'snow', requires: ['冷', '雪', '冬天'],
    desc: 'Basic attacks Chill. Hitting an already-Chilled enemy has a 12% chance to Freeze it.',
    hooks: {
      onHit(b, p) {
        if (p.target.statuses.chill && b.rng() < (b.flags.freezeChance || 0.12)) b.applyStatus(p.target, 'frozen', { src: b.hero });
        else b.applyStatus(p.target, 'chill', { src: b.hero, dur: 2 });
      },
    },
  },
  tide_tip: {
    py: 'shuǐ jiān', zh: '水尖', en: 'Tide Tip', element: 'water', rarity: R.common, category: 'attack', icon: 'drop', requires: ['水'],
    desc: 'Basic attacks make enemies Wet.',
    hooks: { onHit: (b, p) => b.applyStatus(p.target, 'wet', { src: b.hero, dur: 3 }) },
  },
  spark_arc: {
    py: 'huǒ huā', zh: '火花', en: 'Spark Arc', element: 'lightning', rarity: R.rare, category: 'attack', icon: 'bolt', requires: ['电'],
    desc: 'Critical hits release a lightning arc to another enemy (40% of the hit).',
    hooks: {
      onCrit(b, p) {
        const n = b.flags.arcCount || 1;
        for (let i = 0; i < n; i++) {
          const f = b.flags.arcWet ? b.foes().find((x) => x !== p.target && x.statuses.wet) || b.randomFoe([p.target]) : b.randomFoe([p.target]);
          if (!f) return;
          b.emit({ type: 'shot', src: p.target.id, tgt: f.id, element: 'lightning', bolt: true });
          b.damage(b.hero, f, Math.max(6, p.dealt * 0.4), { element: 'lightning', kind: 'proc' });
        }
      },
    },
  },
  heavy_hand: {
    py: 'zhòng shǒu', zh: '重手', en: 'Heavy Hand', element: 'earth', rarity: R.common, category: 'attack', icon: 'fist',
    desc: 'Attacks are 30% slower but deal +60% damage and knock enemies back.',
    stats: { aspdPct: -0.3, atkPct: 0.6 },
    hooks: { onHit: (b, p) => !p.sub && b.knockback(p.target, 4) },
  },
  mirror_ink: {
    py: 'jìng mò', zh: '镜墨', en: 'Mirror Ink', element: 'dark', rarity: R.rare, category: 'strange', icon: 'moon',
    desc: 'Every 3rd attack also fires a mirrored shot at the furthest enemy.',
    hooks: {
      onAttack(b, p) {
        if (p.count % (b.flags.mirrorEvery || 3) === 0) {
          const far = b.furthest();
          p.extra.push({ target: far !== p.target ? far : b.randomFoe([p.target]) || far, mult: b.flags.mirrorEvery ? 1 : 0.8 });
        }
      },
    },
  },
  broken_compass: {
    py: 'pò luó pán', zh: '破罗盘', en: 'Broken Compass', element: 'physical', rarity: R.rare, category: 'strange', icon: 'vortex',
    desc: 'Attacks target random enemies, but deal +45% damage.',
    hooks: {
      onBattleStart: (b) => (b.hero.randomTarget = true),
      modDamage: (b, c) => c.kind === 'attack' && (c.mult *= 1.45),
    },
  },
  echo_brush: {
    py: 'huí bǐ', zh: '回笔', en: 'Echo Brush', element: 'physical', rarity: R.rare, category: 'strange', icon: 'echo',
    desc: 'Hitting the same enemy with the same element twice in a row adds a weaker echo hit (50%).',
    hooks: {
      onHit(b, p, s) {
        if (p.sub && !b.flags.echoAll) return;
        s.last = s.last || {};
        if (s.last[p.target.id] === p.element) b.damage(b.hero, p.target, p.dealt * 0.5, { element: p.element, kind: 'proc', noReact: true });
        s.last[p.target.id] = p.element;
      },
    },
  },

  // ------------------------------------------------------------- movement & evasion
  wind_step: {
    py: 'fēng bù', zh: '风步', en: 'Wind Step', element: 'wind', rarity: R.common, category: 'movement', icon: 'wind', requires: ['风'],
    desc: 'Dodging releases a gust: nearby enemies are pushed back and take 30% attack as wind damage.',
    hooks: {
      onDodge(b) {
        for (const f of nearHero(b, 30)) {
          b.damage(b.hero, f, b.hero.atk * 0.3, { element: 'wind', kind: 'proc' });
          b.knockback(f, 8);
          if (b.flags.gustFire) b.applyStatus(f, 'burn', { dps: 3, src: b.hero });
        }
      },
    },
  },
  ember_trail: {
    py: 'huǒ jì', zh: '火迹', en: 'Ember Trail', element: 'fire', rarity: R.common, category: 'movement', icon: 'flame', requires: ['火'],
    desc: 'Moving leaves burning ground behind you (2s).',
    hooks: {
      onMove(b, p, s) {
        s.n = (s.n || 0) + 1;
        if (s.n % 2 === 0) b.setTerrain('burning', 2);
      },
    },
  },
  rooted: {
    py: 'zhā gēn', zh: '扎根', en: 'Rooted Stance', element: 'earth', rarity: R.common, category: 'movement', icon: 'mountain', requires: ['树', '山'],
    desc: 'Standing still builds armor: +1 defense per second, up to +10. Moving resets it.',
    hooks: {
      onTick(b, p, s) {
        s.stack = b.hero.still >= 0.9 ? Math.min(10, (s.stack || 0) + 1) : 0;
        if (s.stack) b.addBuff(b.hero, { id: 'rooted', dur: 1.1, stats: { def: s.stack } });
      },
    },
  },
  shadow_double: {
    py: 'yǐng zi', zh: '影子', en: 'Shadow Double', element: 'dark', rarity: R.rare, category: 'movement', icon: 'moon', requires: ['黑', '夜'],
    desc: 'Every dodge summons a shadow illusion that strikes 4 times for 50% attack.',
    hooks: {
      onDodge(b) {
        if (b.allies().length >= 4) return;
        b.spawnAlly({ sprite: 'shade', ttl: b.flags.illusionTtl || 2.6, interval: 0.6, dmg: b.hero.atk * 0.5, element: 'dark' });
      },
    },
  },
  desperate_pace: {
    py: 'jí bù', zh: '急步', en: 'Desperate Pace', element: 'wind', rarity: R.common, category: 'movement', icon: 'wind', requires: ['快'],
    desc: 'Attack and move faster the more health you are missing (up to +50%).',
    hooks: {
      onTick(b) {
        const missing = 1 - b.hero.hp / b.hero.maxHp;
        if (missing > 0.05) b.addBuff(b.hero, { id: 'desperate', dur: 1.1, stats: { aspdPct: missing * 0.5, speedPct: missing * 0.5 } });
      },
    },
  },
  rebound: {
    py: 'fǎn tán', zh: '反弹', en: 'Rebound', element: 'light', rarity: R.rare, category: 'movement', icon: 'shield',
    desc: 'Dodging a ranged attack reflects it back for 150% damage.',
    hooks: {
      onDodge(b, p) {
        if (p.ranged && p.src?.alive) b.damage(b.hero, p.src, p.src.atk * 1.5, { element: 'light', kind: 'proc' });
      },
    },
  },
  qinggong: {
    py: 'qīng gōng', zh: '轻功', en: 'Qinggong', element: 'wind', rarity: R.common, category: 'movement', icon: 'wind',
    desc: '+10% dodge chance.',
    stats: { dodge: 0.1 },
  },

  // ------------------------------------------------------------- defense
  shield_burst: {
    py: 'dùn bào', zh: '盾爆', en: 'Bursting Shield', element: 'earth', rarity: R.common, category: 'defense', icon: 'shield',
    desc: 'When your shield breaks it explodes: 25 + half the shield as earth damage to nearby enemies.',
    hooks: {
      onShieldBreak(b, p) {
        for (const f of nearHero(b, 32)) {
          b.damage(b.hero, f, 25 + (p.absorbed || 0) * 0.5, { element: 'earth', kind: 'proc' });
          if (b.flags.shieldFreeze) b.applyStatus(f, 'frozen', { src: b.hero, dur: 1.5 });
        }
      },
    },
  },
  ice_spikes: {
    py: 'bīng cì', zh: '冰刺', en: 'Ice Spikes', element: 'ice', rarity: R.common, category: 'defense', icon: 'snow', requires: ['冷', '雪', '冬天'],
    desc: 'Taking damage fires ice spikes at the attacker: 8 ice damage and Chill.',
    hooks: {
      onDamaged(b, p, s) {
        if (!p.src?.alive || p.src.side !== 1 || (s.cd || 0) > b.t) return;
        s.cd = b.t + 0.5;
        b.damage(b.hero, p.src, 8, { element: 'ice', kind: 'proc' });
        b.applyStatus(p.src, 'chill', { src: b.hero, dur: 2 });
      },
    },
  },
  overflow: {
    py: 'mǎn yì', zh: '满溢', en: 'Overflowing Cup', element: 'water', rarity: R.common, category: 'defense', icon: 'drop', requires: ['水', '喝', '茶'],
    desc: 'Healing beyond max HP becomes a shield.',
    hooks: { onHeal: (b, p) => p.overflow >= 1 && b.addShield(b.hero, Math.min(p.overflow, b.hero.maxHp * 0.4 - b.hero.shield)) },
  },
  storm_guard: {
    py: 'léi dùn', zh: '雷盾', en: 'Storm Guard', element: 'lightning', rarity: R.rare, category: 'defense', icon: 'bolt', requires: ['电'],
    desc: '+8% block. Every 3rd block releases lightning at every enemy (20 damage + Shock).',
    stats: { block: 0.08 },
    hooks: {
      onBlock(b, p, s) {
        s.charge = (s.charge || 0) + 1;
        if (s.charge >= (b.flags.staticN || 3)) {
          s.charge = 0;
          for (const f of b.foes()) {
            b.damage(b.hero, f, 20, { element: 'lightning', kind: 'proc' });
            b.applyStatus(f, b.flags.staticStun ? 'stun' : 'shock', { src: b.hero, dur: 1 });
          }
        }
      },
    },
  },
  ember_armor: {
    py: 'huǒ jiǎ', zh: '火甲', en: 'Ember Armor', element: 'fire', rarity: R.common, category: 'defense', icon: 'shield', requires: ['火', '热'],
    desc: '+4 defense for every Burning enemy.',
    hooks: {
      onTick(b) {
        const n = b.foes().filter((f) => f.statuses.burn).length;
        if (n) b.addBuff(b.hero, { id: 'emberArmor', dur: 1.1, stats: { def: 4 * n } });
      },
    },
  },
  stone_bulwark: {
    py: 'shí bì', zh: '石壁', en: 'Stone Bulwark', element: 'earth', rarity: R.rare, category: 'defense', icon: 'mountain', requires: ['石头', '山', '墙'],
    desc: 'Every 10 seconds, gain a 20 shield.',
    hooks: {
      onTick(b, p, s) {
        s.t = (s.t || 0) + 1;
        const every = b.flags.bulwarkFast && b.hero.still >= 2 ? 5 : 10;
        if (s.t >= every) {
          s.t = 0;
          b.addShield(b.hero, 20);
        }
      },
    },
  },
  iron_skin: {
    py: 'tiě pí', zh: '铁皮', en: 'Iron Skin', element: 'earth', rarity: R.common, category: 'defense', icon: 'shield',
    desc: '+15% chance to block attacks (blocked hits deal 30%).',
    stats: { block: 0.15 },
  },
  vitality: {
    py: 'huó lì', zh: '活力', en: 'Vitality', element: 'light', rarity: R.common, category: 'defense', icon: 'heart',
    desc: '+30 max HP.',
    stats: { maxHp: 30 },
  },
  golden_bell: {
    py: 'jīn zhōng', zh: '金钟', en: 'Golden Bell', element: 'light', rarity: R.rare, category: 'defense', icon: 'crown',
    desc: 'Once per battle, a heavy hit is fully blocked and the attacker is stunned for 2s.',
    hooks: {
      modIncoming(b, c, s) {
        if ((s.used || 0) >= (b.flags.bellCharges || 1) || c.kind !== 'attack' || c.amount * c.mult < b.hero.maxHp * 0.06) return;
        s.used = (s.used || 0) + 1;
        c.mult = 0;
        b.label(b.hero, 'jīn zhōng!', 'good');
        if (c.src?.alive) b.applyStatus(c.src, 'stun', { src: b.hero, dur: 2 });
      },
    },
  },

  // ------------------------------------------------------------- spell modifiers
  triple_blast: {
    py: 'sān bào', zh: '三爆', en: 'Triple Blast', element: 'fire', rarity: R.rare, category: 'spell', icon: 'flame', requires: ['三', '火'],
    desc: 'Fire spells also set off 3 smaller explosions on random enemies (12 each).',
    hooks: {
      onCast(b, c) {
        if (c.element !== 'fire') return;
        for (let i = 0; i < 3; i++) {
          const f = b.randomFoe();
          if (f) b.damage(b.hero, f, 12 * c.power, { element: 'fire', kind: 'proc' });
        }
      },
    },
  },
  forked_bolt: {
    py: 'fēn chà', zh: '分叉', en: 'Forked Bolt', element: 'lightning', rarity: R.common, category: 'spell', icon: 'bolt', requires: ['电'],
    desc: 'Lightning spells strike one extra target.',
    hooks: {
      onBattleStart: (b) => (b.flags.extraChain = (b.flags.extraChain || 0) + 1),
      onCast(b, c) {
        if (c.element !== 'lightning' || c.spell === 'shandian') return;
        const f = b.randomFoe();
        if (f) b.damage(b.hero, f, 15 * c.power, { element: 'lightning', kind: 'proc' });
      },
    },
  },
  wild_brush: {
    py: 'kuáng bǐ', zh: '狂笔', en: 'Wild Brush', element: 'physical', rarity: R.rare, category: 'spell', icon: 'vortex',
    desc: 'Every spell also applies a random status to two enemies.',
    hooks: {
      onCast(b) {
        for (let i = 0; i < 2; i++) {
          const f = b.randomFoe();
          if (f) b.applyStatus(f, pick(b, RANDOM_STATUSES), { src: b.hero, dps: 3 });
        }
      },
    },
  },
  quick_ink: {
    py: 'kuài mò', zh: '快墨', en: 'Quick Ink', element: 'physical', rarity: R.common, category: 'spell', icon: 'hourglass', requires: ['快'],
    desc: 'A successful cast cuts your other spells’ cooldowns by 3s.',
    hooks: { onCast: (b, c) => !c.echo && b.reduceCooldowns(3, c.slot) },
  },
  impatience: {
    py: 'xīn jí', zh: '心急', en: 'Impatience', element: 'physical', rarity: R.common, category: 'spell', icon: 'hourglass',
    desc: 'Critical hits reduce spell cooldowns by 0.5s.',
    stats: { crit: 0.03 },
    hooks: { onCrit: (b) => b.reduceCooldowns(0.5) },
  },
  charged_strike: {
    py: 'xù lì', zh: '蓄力', en: 'Charged Strike', element: 'physical', rarity: R.common, category: 'spell', icon: 'fist',
    desc: 'After a successful cast, your next 2 basic attacks deal double damage.',
    hooks: {
      onCast: (b, c, s) => !c.echo && (s.charges = 2),
      onAttack(b, p, s) {
        if (s.charges > 0) {
          s.charges -= 1;
          p.mult *= 2;
        }
      },
    },
  },
  afterimage: {
    py: 'shǎn yǐng', zh: '闪影', en: 'Afterimage', element: 'wind', rarity: R.common, category: 'spell', icon: 'wind',
    desc: 'After a dodge, your next spell is 50% stronger.',
    hooks: {
      onDodge: (b, p, s) => (s.ready = true),
      modSpellPower(b, c, s) {
        if (s.ready) {
          s.ready = false;
          c.power *= 1.5;
        }
      },
    },
  },
  echo_cast: {
    py: 'huí shēng', zh: '回声', en: 'Echo Casting', element: 'physical', rarity: R.rare, category: 'spell', icon: 'echo',
    desc: 'Successful casts have a 30% chance to repeat at half power.',
    hooks: {
      onCast(b, c) {
        if (c.echo || b.rng() >= (b.flags.chaosEcho ? 0.5 : 0.3)) return;
        const element = b.flags.chaosEcho ? pick(b, ['fire', 'ice', 'water', 'earth', 'lightning', 'wind', 'dark', 'light']) : c.element;
        b.label(b.hero, 'huí shēng', 'proc');
        b.castEffect(c.spell, { ...c, power: c.power * 0.5, echo: true, element });
      },
    },
  },
  lingering: {
    py: 'chí jiǔ', zh: '持久', en: 'Lingering Script', element: 'physical', rarity: R.common, category: 'spell', icon: 'hourglass',
    desc: 'Statuses you apply last 50% longer.',
    stats: { statusDur: 0.5 },
  },
  perfect_memory: {
    py: 'jì yì', zh: '记忆', en: 'Perfect Memory', element: 'light', rarity: R.common, category: 'spell', icon: 'book', requires: ['记得', '想'],
    desc: 'Your first successful cast each battle has double power.',
    hooks: { modSpellPower: (b, c) => c.first && !c.echo && (c.power *= 2) },
  },
  second_thought: {
    py: 'zài xiǎng', zh: '再想', en: 'Second Thought', element: 'physical', rarity: R.rare, category: 'spell', icon: 'book', requires: ['想'],
    desc: 'Once per battle, a failed spell puzzle can be retried without going on cooldown.',
    hooks: {
      onCastFail(b, p, s) {
        if (s.used) return;
        s.used = true;
        p.retry = true;
        b.label(b.hero, 'zài xiǎng · try again', 'good');
      },
    },
  },
  resonance: {
    py: 'gòng míng', zh: '共鸣', en: 'Resonance', element: 'light', rarity: R.rare, category: 'spell', icon: 'sparkle',
    desc: 'Casting 3 different spells in a row releases a radiant burst: 40 light damage to all and heal 10%.',
    hooks: {
      onCast(b, c, s) {
        if (c.echo) return;
        s.seq = [...(s.seq || []), c.spell].slice(-3);
        const need = b.flags.resonanceN || 3;
        const recent = s.seq.slice(-need);
        if (recent.length === need && new Set(recent).size === need) {
          s.seq = [];
          b.label(b.hero, 'gòng míng!', 'good');
          for (const f of b.foes()) b.damage(b.hero, f, 40, { element: 'light', kind: 'proc' });
          b.heal(b.hero, b.hero.maxHp * 0.1);
        }
      },
    },
  },
  reservoir: {
    py: 'shuǐ kù', zh: '水库', en: 'Spell Reservoir', element: 'water', rarity: R.common, category: 'spell', icon: 'drop', requires: ['水'],
    desc: 'Every 8 basic attacks store a charge (max 3). Your next spell gains +40% power per charge.',
    hooks: {
      onAttack(b, p, s) {
        s.n = (s.n || 0) + 1;
        if (s.n % 8 === 0) s.stacks = Math.min(3, (s.stacks || 0) + 1);
      },
      modSpellPower(b, c, s) {
        if (s.stacks && !c.echo) {
          c.power *= 1 + 0.4 * s.stacks;
          s.stacks = 0;
        }
      },
    },
  },
  ink_reflection: {
    py: 'mò yǐng', zh: '墨影', en: 'Ink Reflection', element: 'dark', rarity: R.common, category: 'spell', icon: 'moon',
    desc: 'Healing and shield spells also fire a dark bolt at the nearest enemy (40 damage).',
    hooks: {
      onCast(b, c) {
        const tags = SPELL_TAGS[c.spell] || [];
        if (!tags.includes('defensive')) return;
        const f = b.front();
        if (f) {
          b.emit({ type: 'shot', src: 'hero', tgt: f.id, element: 'dark', spell: true });
          b.damage(b.hero, f, 40 * c.power, { element: 'dark', kind: 'proc' });
        }
      },
    },
  },
  chain_reaction: {
    py: 'lián suǒ', zh: '连锁', en: 'Chain Reaction', element: 'physical', rarity: R.rare, category: 'spell', icon: 'echo',
    desc: 'Spells that hit an enemy with a status trigger a bonus burst of that status’ element (30%).',
    hooks: {
      onSpellHit(b, p, s) {
        if (s.lock) return;
        const st = Object.keys(p.target.statuses)[0];
        if (!st) return;
        s.lock = true;
        b.damage(b.hero, p.target, p.dealt * 0.3, { element: STATUS_ELEMENT[st] || 'physical', kind: 'proc' });
        s.lock = false;
      },
    },
  },

  // ------------------------------------------------------------- conditional
  frost_hunter: {
    py: 'liè bīng', zh: '猎冰', en: 'Frost Hunter', element: 'ice', rarity: R.common, category: 'conditional', icon: 'snow', requires: ['冷', '雪', '冬天'],
    desc: '+50% damage against Chilled or Frozen enemies.',
    hooks: {
      modDamage(b, c) {
        if (c.tgt.statuses.frozen) c.mult *= b.flags.deepFreeze ? 1.75 : 1.5;
        else if (c.tgt.statuses.chill) c.mult *= 1.5;
      },
    },
  },
  ashes: {
    py: 'huī jìn', zh: '灰烬', en: 'Ashes', element: 'fire', rarity: R.common, category: 'conditional', icon: 'flame', requires: ['火'],
    desc: 'Heal 6% HP whenever a Burning enemy dies.',
    hooks: { onKill: (b, p) => p.statuses.burn && b.heal(b.hero, b.hero.maxHp * 0.06) },
  },
  back_to_water: {
    py: 'bèi shuǐ', zh: '背水', en: 'Back to the River', element: 'physical', rarity: R.common, category: 'conditional', icon: 'swords',
    desc: '+12% attack speed for each enemy beyond the first.',
    hooks: {
      onTick(b) {
        const n = b.foes().length - 1;
        if (n > 0) b.addBuff(b.hero, { id: 'surrounded', dur: 1.1, stats: { aspdPct: 0.12 * n } });
      },
    },
  },
  hex_mark: {
    py: 'zǔ zhòu', zh: '诅咒', en: 'Hex Mark', element: 'dark', rarity: R.common, category: 'conditional', icon: 'skull', requires: ['黑', '夜'],
    desc: 'Every 4th critical hit Curses the target.',
    stats: { crit: 0.04 },
    hooks: {
      onCrit(b, p, s) {
        s.n = (s.n || 0) + 1;
        if (s.n % 4 === 0) b.applyStatus(p.target, 'curse', { src: b.hero });
      },
    },
  },
  adaptation: {
    py: 'yìng biàn', zh: '应变', en: 'Adaptation', element: 'earth', rarity: R.common, category: 'conditional', icon: 'shield',
    desc: 'Gain a 4 shield whenever an enemy gains a new status.',
    hooks: { onStatus: (b, p) => p.isNew && b.addShield(b.hero, 4) },
  },
  blood_moon: {
    py: 'xuè yuè', zh: '血月', en: 'Blood Moon', element: 'dark', rarity: R.rare, category: 'conditional', icon: 'moon', requires: ['月', '月亮', '血'],
    desc: '+12% lifesteal and +20% dark damage.',
    stats: { lifesteal: 0.12 },
    hooks: { modDamage: (b, c) => c.element === 'dark' && (c.mult *= 1.2) },
  },
  sun_mirror: {
    py: 'rì jìng', zh: '日镜', en: 'Sun Mirror', element: 'light', rarity: R.rare, category: 'conditional', icon: 'sun', requires: ['太阳', '阳光', '光'],
    desc: 'Whenever you heal, deal that much light damage to the nearest enemy.',
    hooks: {
      onHeal(b, p) {
        const f = b.front();
        if (f && p.amount >= 1) b.damage(b.hero, f, p.amount, { element: 'light', kind: 'proc' });
      },
    },
  },

  // ------------------------------------------------------------- strange & experimental
  hungry_lantern: {
    py: 'è dēng', zh: '饿灯', en: 'Hungry Lantern', element: 'dark', rarity: R.rare, category: 'strange', icon: 'skull', requires: ['饿', '灯'],
    desc: 'Every enemy loses 1.5% max HP per second, but your healing is halved.',
    hooks: {
      onTick(b) {
        for (const f of b.foes()) {
          const d = b.damage(b.hero, f, f.maxHp * 0.015, { element: 'dark', kind: 'dot', noReact: true });
          if (b.flags.lanternFeeds && d > 0) b.heal(b.hero, d * 0.3, { silent: true });
        }
      },
      modHeal: (b, p) => !b.flags.lanternFeeds && (p.mult *= 0.5),
    },
  },
  paper_phoenix: {
    py: 'zhǐ fèng', zh: '纸凤', en: 'Paper Phoenix', element: 'fire', rarity: R.epic, category: 'strange', icon: 'flame',
    desc: 'Once per run, survive fatal damage: return with 40% HP and fiery attacks for the rest of the battle.',
    hooks: {
      onFatal(b, p) {
        if (b.runState.phoenixUsed) return;
        b.runState.phoenixUsed = true;
        p.prevented = true;
        b.hero.hp = Math.round(b.hero.maxHp * (b.flags.phoenixFull ? 1 : 0.4));
        b.hero.attackElement = 'fire';
        b.flags.phoenixFire = true;
        b.label(b.hero, 'zhǐ fèng · reborn!', 'good');
      },
      onHit: (b, p) => b.flags.phoenixFire && b.applyStatus(p.target, 'burn', { dps: 5, src: b.hero }),
    },
  },
  glass_brush: {
    py: 'bō li', zh: '玻璃', en: 'Glass Brush', element: 'physical', rarity: R.rare, category: 'strange', icon: 'slash',
    desc: '+60% damage, but −35% max HP.',
    stats: { dmgPct: 0.6, maxHpPct: -0.35 },
  },
  storm_bottle: {
    py: 'píng zi', zh: '瓶子', en: 'Bottled Storm', element: 'lightning', rarity: R.rare, category: 'strange', icon: 'bolt', requires: ['电', '雨'],
    desc: 'Battles start with Wet ground. Your lightning damage electrifies it.',
    hooks: { onBattleStart: (b) => b.setTerrain('wet', 8) },
  },
  lucky_cat: {
    py: 'zhāo cái māo', zh: '招财猫', en: 'Lucky Cat', element: 'light', rarity: R.common, category: 'strange', icon: 'paw', requires: ['猫'],
    desc: '+8% critical chance and +25% ink from battles.',
    stats: { crit: 0.08 },
  },
  ink_brush: {
    py: 'máo bǐ', zh: '毛笔', en: 'Calligraphy Brush', element: 'dark', rarity: R.common, category: 'attack', icon: 'slash', requires: ['字', '写'],
    desc: '+4 attack. Basic attacks that crit leave an ink Curse.',
    stats: { atk: 4 },
    hooks: { onCrit: (b, p) => p.kind === 'attack' && b.applyStatus(p.target, 'curse', { src: b.hero, dur: 3 }) },
  },
  thunder_drum: {
    py: 'léi gǔ', zh: '雷鼓', en: 'Thunder Drum', element: 'lightning', rarity: R.rare, category: 'conditional', icon: 'bolt', requires: ['电', '打'],
    desc: 'Every 4 seconds, lightning strikes the strongest enemy for 25 (more on Wet enemies).',
    hooks: {
      onTick(b, p, s) {
        s.t = (s.t || 0) + 1;
        if (s.t < 4) return;
        s.t = 0;
        const f = b.foes().sort((a, c) => c.hp - a.hp)[0];
        if (f) {
          b.emit({ type: 'biome', kind: 'lightning', tgt: f.id });
          b.damage(b.hero, f, 25, { element: 'lightning', kind: 'proc' });
        }
      },
    },
  },
  // ------------------------------------------------------------- positioning & momentum
  relentless: {
    py: 'bù tuì', zh: '不退', en: 'Relentless Advance', element: 'physical', rarity: R.common, category: 'movement', icon: 'fist', requires: ['走', '跑'],
    desc: 'Recovering from a knockback grants +35% attack speed and +25% move speed for 3s.',
    hooks: {
      onRecover(b) {
        b.addBuff(b.hero, { id: 'relentless', dur: 3, stats: { aspdPct: 0.35, speedPct: 0.25 } });
      },
    },
  },
  thunder_impact: {
    py: 'zhòng jī', zh: '重击', en: 'Thunderous Impact', element: 'earth', rarity: R.common, category: 'attack', icon: 'fist', requires: ['重', '打'],
    desc: 'Your hits push 50% further; critical hits push twice as far and Shock.',
    stats: { kbPct: 0.5 },
    hooks: {
      onCrit(b, p) {
        if (p.kind !== 'attack' || !p.target.alive) return;
        b.knockback(p.target, b.hero.kb, { src: b.hero });
        b.applyStatus(p.target, 'shock', { dur: 2, src: b.hero });
      },
    },
  },
  battle_standard: {
    py: 'zhàn qí', zh: '战旗', en: 'Battle Standard', element: 'physical', rarity: R.rare, category: 'conditional', icon: 'crown', requires: ['打', '前'],
    desc: 'Momentum also grants +18% damage and +10% more attack speed.',
    stats: { momentumAspd: 0.1 },
    hooks: { modDamage: (b, c) => b.hero.momentum && (c.mult *= 1.18) },
  },
  countercurrent: {
    py: 'nì liú', zh: '逆流', en: 'Countercurrent', element: 'wind', rarity: R.rare, category: 'movement', icon: 'wind', requires: ['风', '水'],
    desc: 'When you hop back from a dodge or get knocked back, a gust pushes every enemy within reach back as well (and deals 25% attack as wind).',
    hooks: {
      onDodge(b, p, s) {
        gust(b, s);
      },
      onKnocked(b, p, s) {
        gust(b, s);
      },
    },
  },
  iron_roots: {
    py: 'tiě gēn', zh: '铁根', en: 'Iron Roots', element: 'earth', rarity: R.common, category: 'defense', icon: 'mountain', requires: ['树', '地'],
    desc: '+2 defence. While standing still you take 70% less knockback.',
    stats: { def: 2 },
    hooks: { modKnockback: (b, p) => b.hero.still > 0.3 && (p.dist *= 0.3) },
  },
  reckless_charge: {
    py: 'měng chōng', zh: '猛冲', en: 'Reckless Charge', element: 'fire', rarity: R.common, category: 'conditional', icon: 'flame', requires: ['跑', '快'],
    desc: 'Each time you gain Momentum, your next attack deals +100% damage and knocks its target far back.',
    hooks: {
      onMomentum: (b, p, s) => p.on && (s.armed = true),
      onAttack(b, p, s) {
        if (!s.armed) return;
        s.armed = false;
        p.mult *= 2;
        p.kbMult = (p.kbMult ?? 1) * 3;
        b.label(b.hero, 'měng chōng!', 'good');
      },
    },
  },
  territorial_guardian: {
    py: 'shǒu tǔ', zh: '守土', en: 'Territorial Guardian', element: 'earth', rarity: R.common, category: 'defense', icon: 'shield', requires: ['家', '地'],
    desc: 'While you fight in your own half: +6 defence and take 12% less damage.',
    hooks: {
      onTick(b) {
        if (b.inOwnZone(b.hero)) b.addBuff(b.hero, { id: 'home_ground', dur: 1.1, stats: { def: 6 } });
      },
      modIncoming: (b, c) => b.inOwnZone(b.hero) && (c.mult *= 0.88),
    },
  },
  chain_hook: {
    py: 'gōu suǒ', zh: '钩锁', en: 'Chain Hook', element: 'physical', rarity: R.rare, category: 'attack', icon: 'vortex', requires: ['拉'],
    desc: 'Every 4th basic attack hooks its target and pulls it toward you instead of pushing it; pulled enemies take +25% damage for 2s.',
    hooks: {
      onAttack(b, p, s) {
        if (p.count % 4 !== 0) return;
        p.kbMult = 0;
        s.hook = true;
      },
      onHit(b, p, s) {
        if (!s.hook || p.sub) return;
        s.hook = false;
        b.pull(p.target, 10, { src: b.hero });
        p.target.hookedUntil = b.t + 2;
      },
      modDamage: (b, c) => c.tgt.hookedUntil > b.t && (c.mult *= 1.25),
    },
  },
  swift_pursuit: {
    py: 'shén xíng', zh: '神行', en: 'Swift Pursuit', element: 'wind', rarity: R.common, category: 'movement', icon: 'wind', requires: ['快', '跑'],
    desc: '+30% move speed. Your first attack after moving at least a body-length deals +30% damage.',
    stats: { speedPct: 0.3 },
    hooks: {
      onMove: (b, p, s) => (s.ready = true),
      onAttack(b, p, s) {
        if (!s.ready) return;
        s.ready = false;
        p.mult *= 1.3;
      },
    },
  },
  heavy_frame: {
    py: 'chén zhòng', zh: '沉重', en: 'Heavy Frame', element: 'earth', rarity: R.common, category: 'defense', icon: 'mountain', requires: ['重'],
    desc: '+50% knockback resistance and +3 defence, but 10% slower movement.',
    stats: { kbRes: 0.5, def: 3, speedPct: -0.1 },
  },
  hit_and_run: {
    py: 'yóu jī', zh: '游击', en: 'Hit and Run', element: 'wind', rarity: R.rare, category: 'movement', icon: 'wind', requires: ['走'],
    desc: 'After you dodge: +50% move speed for 2s and your next attack deals +60% damage.',
    hooks: {
      onDodge(b, p, s) {
        s.ready = true;
        b.addBuff(b.hero, { id: 'hit_and_run', dur: 2, stats: { speedPct: 0.5 } });
      },
      onAttack(b, p, s) {
        if (!s.ready) return;
        s.ready = false;
        p.mult *= 1.6;
      },
    },
  },
  boundary_stone: {
    py: 'jiè shí', zh: '界石', en: 'Boundary Stone', element: 'earth', rarity: R.common, category: 'conditional', icon: 'mountain', requires: ['石头', '山'],
    desc: 'Enemies standing in your half take +25% damage from you: drive them out and deny their Momentum.',
    hooks: { modDamage: (b, c) => c.tgt.side === 1 && !b.inOwnZone(c.tgt) && (c.mult *= 1.25) },
  },
  long_stride: {
    py: 'dà bù', zh: '大步', en: 'Long Stride', element: 'wind', rarity: R.common, category: 'movement', icon: 'wind', requires: ['走', '步'],
    desc: '+20% move speed and your dodge hop carries you less far back, so you keep your ground.',
    stats: { speedPct: 0.2 },
    hooks: { onDodge: (b) => b.hero.vx && (b.hero.vx *= 0.5) },
  },
  spring_tea: {
    py: 'chá', zh: '茶', en: 'Spring Tea', element: 'water', rarity: R.common, category: 'defense', icon: 'drop', requires: ['茶', '喝'],
    desc: 'Regenerate 1% max HP per second.',
    hooks: { onTick: (b) => b.heal(b.hero, b.hero.maxHp * 0.01, { silent: true }) },
  },
};

// Spell tags are looked up lazily to avoid a circular import with spells.js.
export const SPELL_TAGS = {};
export function registerSpellTags(spells) {
  for (const [id, s] of Object.entries(spells)) SPELL_TAGS[id] = s.tags || [];
}

export const ITEM_IDS = Object.keys(ITEMS);
export const RARITY_WEIGHT = { common: 10, rare: 5, epic: 1.5 };
