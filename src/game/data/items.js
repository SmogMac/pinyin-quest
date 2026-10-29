// Passive items: the main source of variety. With only one active move per hero, passives are what
// turn a run into a build. Items are unique (no duplicates) and stack freely. Each item can have:
//   stats: flat bonuses applied when the hero is built (see STAT_KEYS in combat.js), including
//          kbPct (push further) · kbRes · momentumAspd · spellPower (signature power) · cdr
//          (negative = longer cooldown) · sigDur (signature buffs/statuses last longer)
//   hooks: real gameplay triggers fired by the combat engine: (battle, payload, state) => void
//     basic attacks   onAttack {target, count, mult, extra, element, kbMult, counter, forceCrit}
//                     onHit {target, dealt, crit, element, sub} · onCrit {target, dealt, kind}
//     defence         onDodge {src, ranged} · onBlock · onDamaged {src, dealt, kind}
//                     onHeal {amount, overflow, fruit} · onShield {amount} · onShieldBreak {absorbed, sig}
//     positioning     onKnockback {target, dist, pull} · onKnocked · onRecover · onMove
//                     onWallHit {target, speed} · onCollide {target, other, speed}
//                     onZone {enemyZone} (entering/leaving the opposing half)
//                     onMomentum {on} (gained / expired) · while active: check b.hasMomentum()
//     signature       onSignature {sig, power, choice, echo, hp} · onSignatureFail {retry}
//                     modSignature (change power) · onSigHit · onBuffEnd {id, sig}
//                     while active: b.sigBuffActive() · move-specific: onFruit onBlade onRepel
//                     onSigShield onLaunch onSlip
//     statuses        onStatus {target, id, isNew} · onReaction {target, reaction}
//     battle          onBattleStart (entering a new battlefield) · onKill · onTick (1/s)
//                     onLowHp · onFatal {prevented}
//     modifiers       modDamage modIncoming modHeal modKnockback (push you take) modKnockOut
//   Loops are safe: the engine caps hook recursion depth and procs per step, and items that can
//   feed themselves keep their own short internal cooldowns.
//   requires: vocabulary (any one learned Hanzi word unlocks the item for discovery)
//   hero: only offered to that hero (signature-specific items)
//   category: attack | movement | dodge | defense | signature | momentum | positioning | status |
//             conditional | strange | hero
// Names are shown pinyin-first. Add new items freely; the engine never needs changing.
import { serveFruit, FRUIT_IDS, FRUIT_EFFECTS } from './signatures.js';

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
const STATUS_ELEMENT = { burn: 'fire', chill: 'ice', frozen: 'ice', wet: 'water', shock: 'lightning', curse: 'dark', dazzle: 'light', stun: 'earth', bleed: 'physical', slow: 'water', weaken: 'dark', mark: 'light' };
const ELEMENT_STATUS = { fire: 'burn', ice: 'chill', water: 'wet', earth: 'stun', lightning: 'shock', wind: 'slow', dark: 'curse', light: 'dazzle' };
const EIGHT = ['fire', 'ice', 'water', 'earth', 'lightning', 'wind', 'dark', 'light'];
/** At most once every `sec` seconds (per item), so self-feeding items can't spiral. */
const ready = (b, s, sec, key = 'at') => {
  if ((s[key] ?? -99) > b.t - sec) return false;
  s[key] = b.t;
  return true;
};
/** Ink Reflection's bolt. */
function bolt(b, s, amount) {
  if (!ready(b, s, 0.3)) return;
  const f = b.front();
  if (!f) return;
  b.emit({ type: 'shot', src: 'hero', tgt: f.id, element: 'dark', spell: true });
  b.damage(b.hero, f, 30 + amount * 0.5, { element: 'dark', kind: 'proc' });
}
/** Lei's wall-slam pile-up and the like: a quick lightning arc between two points. */
const arc = (b, from, to, amount) => {
  b.emit({ type: 'shot', src: from.id, tgt: to.id, element: 'lightning', bolt: true });
  b.damage(b.hero, to, amount, { element: 'lightning', kind: 'proc' });
};

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

  // ------------------------------------------------------------- signature modifiers (any hero)
  triple_blast: {
    py: 'sān bào', zh: '三爆', en: 'Triple Blast', element: 'fire', rarity: R.rare, category: 'signature', icon: 'flame', requires: ['三', '火'],
    desc: 'Every successful signature move also sets off 3 small fire explosions on random enemies (12 each).',
    hooks: {
      onSignature(b, c) {
        for (let i = 0; i < 3; i++) {
          const f = b.randomFoe();
          if (f) b.damage(b.hero, f, 12 * c.power, { element: 'fire', kind: 'proc' });
        }
      },
    },
  },
  forked_bolt: {
    py: 'fēn chà', zh: '分叉', en: 'Forked Bolt', element: 'lightning', rarity: R.common, category: 'signature', icon: 'bolt', requires: ['电'],
    desc: 'Every successful signature move strikes two random enemies with lightning (15 + Shock).',
    hooks: {
      onSignature(b, c) {
        for (let i = 0; i < 2; i++) {
          const f = b.randomFoe();
          if (!f) return;
          b.emit({ type: 'shot', src: 'hero', tgt: f.id, element: 'lightning', bolt: true });
          b.damage(b.hero, f, 15 * c.power, { element: 'lightning', kind: 'proc' });
          b.applyStatus(f, 'shock', { src: b.hero, dur: 2 });
        }
      },
    },
  },
  wild_brush: {
    py: 'kuáng bǐ', zh: '狂笔', en: 'Wild Brush', element: 'physical', rarity: R.rare, category: 'signature', icon: 'vortex',
    desc: 'Every successful signature move applies a random status to two enemies.',
    hooks: {
      onSignature(b) {
        for (let i = 0; i < (b.flags.wildAll ? 4 : 2); i++) {
          const f = b.randomFoe();
          if (f) b.applyStatus(f, pick(b, RANDOM_STATUSES), { src: b.hero, dps: 3 });
        }
      },
    },
  },
  quick_ink: {
    py: 'kuài mò', zh: '快墨', en: 'Quick Ink', element: 'physical', rarity: R.common, category: 'signature', icon: 'hourglass', requires: ['快'],
    desc: 'Each basic attack shortens your signature cooldown by 0.2s.',
    hooks: { onAttack: (b) => b.reduceCooldowns(0.2) },
  },
  impatience: {
    py: 'xīn jí', zh: '心急', en: 'Impatience', element: 'physical', rarity: R.common, category: 'signature', icon: 'hourglass',
    desc: '+3% crit. Critical hits shorten your signature cooldown by 0.5s.',
    stats: { crit: 0.03 },
    hooks: { onCrit: (b) => b.reduceCooldowns(0.5) },
  },
  charged_strike: {
    py: 'xù lì', zh: '蓄力', en: 'Charged Strike', element: 'physical', rarity: R.common, category: 'signature', icon: 'fist',
    desc: 'After a successful signature move, your next 2 basic attacks deal double damage.',
    hooks: {
      onSignature: (b, c, s) => !c.echo && (s.charges = 2),
      onAttack(b, p, s) {
        if (s.charges > 0) {
          s.charges -= 1;
          p.mult *= 2;
        }
      },
    },
  },
  poised_mind: {
    py: 'jìng xīn', zh: '静心', en: 'Poised Mind', element: 'wind', rarity: R.common, category: 'signature', icon: 'wind',
    desc: 'After a dodge, your next signature move is 50% stronger.',
    hooks: {
      onDodge: (b, p, s) => (s.ready = true),
      modSignature(b, c, s) {
        if (s.ready) {
          s.ready = false;
          c.power *= 1.5;
        }
      },
    },
  },
  echo_cast: {
    py: 'huí shēng', zh: '回声', en: 'Echoing Soul', element: 'physical', rarity: R.rare, category: 'signature', icon: 'echo',
    desc: 'A successful signature move echoes: a weaker copy of its effect (40% power) follows a moment later.',
    hooks: {
      onSignature(b, c) {
        if (c.echo) return;
        b.schedule(0.5, () => {
          if (b.result) return;
          b.label(b.hero, 'huí shēng', 'proc');
          // Chaos Echo: the copy takes a random element; Fruit Echo: a different fruit at full power
          const element = b.flags.chaosEcho ? pick(b, EIGHT) : c.element;
          let choice = c.choice;
          let power = c.power * 0.4;
          if (b.flags.echoFruit && FRUIT_EFFECTS[c.choice]) {
            choice = pick(b, FRUIT_IDS.filter((f) => f !== c.choice));
            power = c.power;
          }
          b.castEffect({ ...c, power, echo: true, element, choice });
          if (b.flags.chaosEcho) for (const f of b.foes()) b.applyStatus(f, ELEMENT_STATUS[element], { src: b.hero, dps: 3 });
        });
      },
    },
  },
  lingering: {
    py: 'chí jiǔ', zh: '持久', en: 'Lingering Power', element: 'physical', rarity: R.common, category: 'signature', icon: 'hourglass',
    desc: 'Statuses you apply last 50% longer, and your signature buffs and effects last 50% longer.',
    stats: { statusDur: 0.5, sigDur: 0.5 },
  },
  perfect_memory: {
    py: 'jì yì', zh: '记忆', en: 'Perfect Memory', element: 'light', rarity: R.common, category: 'signature', icon: 'book', requires: ['记得', '想'],
    desc: 'Your first successful signature move each battle has double power.',
    hooks: { modSignature: (b, c) => c.first && !c.echo && (c.power *= 2) },
  },
  second_thought: {
    py: 'zài xiǎng', zh: '再想', en: 'Second Thought', element: 'physical', rarity: R.rare, category: 'signature', icon: 'book', requires: ['想'],
    desc: 'Once per battle, a wrong answer can be retried without going on cooldown.',
    hooks: {
      onSignatureFail(b, p, s) {
        if (s.used) return;
        s.used = true;
        p.retry = true;
        b.label(b.hero, 'zài xiǎng · try again', 'good');
      },
    },
  },
  resonance: {
    py: 'gòng míng', zh: '共鸣', en: 'Resonance', element: 'light', rarity: R.rare, category: 'signature', icon: 'sparkle',
    desc: 'Every 3rd successful signature move releases a radiant burst: 40 light damage to all enemies and heal 10%.',
    hooks: {
      onSignature(b, c, s) {
        if (c.echo && !b.flags.resonanceEcho) return;
        s.n = (s.n || 0) + 1;
        if (s.n < (b.flags.resonanceN || 3)) return;
        s.n = 0;
        b.label(b.hero, 'gòng míng!', 'good');
        for (const f of b.foes()) b.damage(b.hero, f, 40, { element: 'light', kind: 'proc' });
        b.heal(b.hero, b.hero.maxHp * 0.1);
      },
    },
  },
  reservoir: {
    py: 'shuǐ kù', zh: '水库', en: 'Signature Reservoir', element: 'water', rarity: R.common, category: 'signature', icon: 'drop', requires: ['水'],
    desc: 'Every 8 basic attacks store a charge (max 3). Your next signature move gains +40% power per charge.',
    hooks: {
      onAttack(b, p, s) {
        s.n = (s.n || 0) + 1;
        if (s.n % 8 === 0) s.stacks = Math.min(3, (s.stacks || 0) + 1);
      },
      modSignature(b, c, s) {
        if (s.stacks && !c.echo) {
          c.power *= 1 + 0.4 * s.stacks;
          s.stacks = 0;
        }
      },
    },
  },
  ink_reflection: {
    py: 'mò yǐng', zh: '墨影', en: 'Ink Reflection', element: 'dark', rarity: R.common, category: 'signature', icon: 'moon',
    desc: 'Whenever your signature move heals you or shields you, a dark bolt hits the nearest enemy for 30 + half of it.',
    hooks: {
      onHeal(b, p, s) {
        if (b.sigActing || p.fruit) bolt(b, s, p.amount + p.overflow);
      },
      onShield(b, p, s) {
        if (b.sigActing) bolt(b, s, p.amount);
      },
    },
  },
  chain_reaction: {
    py: 'lián suǒ', zh: '连锁', en: 'Chain Reaction', element: 'physical', rarity: R.rare, category: 'signature', icon: 'echo',
    desc: 'Signature hits on an enemy with a status trigger a bonus burst of that status’ element (30%).',
    hooks: {
      onSigHit(b, p, s) {
        if (s.lock) return;
        const st = Object.keys(p.target.statuses)[0];
        if (!st) return;
        s.lock = true;
        b.damage(b.hero, p.target, Math.max(4, p.dealt * 0.3), { element: STATUS_ELEMENT[st] || 'physical', kind: 'proc' });
        s.lock = false;
      },
    },
  },
  final_word: {
    py: 'zuì hòu yī jù', zh: '最后一句', en: 'Final Word', element: 'dark', rarity: R.rare, category: 'signature', icon: 'scroll',
    desc: 'After a successful signature move, your next 3 basic attacks deal +40% damage and each applies a random status.',
    hooks: {
      onSignature: (b, c, s) => !c.echo && (s.n = 3),
      onAttack(b, p, s) {
        if (!(s.n > 0)) return;
        s.n -= 1;
        p.mult *= 1.4;
        s.pending = pick(b, RANDOM_STATUSES);
      },
      onHit(b, p, s) {
        if (!s.pending || p.sub) return;
        b.applyStatus(p.target, s.pending, { src: b.hero, dps: 3 });
        s.pending = null;
      },
    },
  },
  ink_resonance: {
    py: 'mò yùn', zh: '墨韵', en: 'Ink Resonance', element: 'physical', rarity: R.rare, category: 'signature', icon: 'wave',
    desc: 'Every successful signature move releases a wave of elemental energy (your attack’s element, or a random one): 18 damage and its status to every enemy.',
    hooks: {
      onSignature(b, c) {
        const el = b.hero.attackElement !== 'physical' ? b.hero.attackElement : pick(b, EIGHT);
        b.emit({ type: 'cast', spell: 'wave', element: el });
        for (const f of b.foes()) {
          b.damage(b.hero, f, 18 * c.power, { element: el, kind: 'proc' });
          b.applyStatus(f, ELEMENT_STATUS[el], { src: b.hero, dps: 3, dur: 2 });
        }
      },
    },
  },
  patient_reward: {
    py: 'hòu bào', zh: '厚报', en: 'Patient Reward', element: 'light', rarity: R.common, category: 'signature', icon: 'heart',
    desc: 'Completing your signature puzzle while below half health also grants a 30 shield and heals 10%.',
    hooks: {
      onSignature(b, c) {
        if (c.echo || c.hp >= 0.5) return;
        b.addShield(b.hero, 30);
        b.heal(b.hero, b.hero.maxHp * 0.1);
        b.label(b.hero, 'hòu bào', 'good');
      },
    },
  },
  reckless_magic: {
    py: 'kuáng fǎ', zh: '狂法', en: 'Reckless Magic', element: 'fire', rarity: R.rare, category: 'signature', icon: 'flame',
    desc: 'Your signature move is 60% stronger, but its cooldown is 35% longer.',
    stats: { spellPower: 0.6, cdr: -0.35 },
  },
  afterglow: {
    py: 'yú huī', zh: '余辉', en: 'Afterglow', element: 'light', rarity: R.common, category: 'signature', icon: 'sun',
    desc: 'While one of your signature buffs is running (Mango, Burning Passion, Frenzy…), deal +20% damage and take 10% less.',
    hooks: {
      modDamage: (b, c) => b.sigBuffActive() && (c.mult *= 1.2),
      modIncoming: (b, c) => b.sigBuffActive() && (c.mult *= 0.9),
    },
  },
  bitter_lesson: {
    py: 'jiào xun', zh: '教训', en: 'Bitter Lesson', element: 'dark', rarity: R.common, category: 'signature', icon: 'skull',
    desc: 'A wrong answer still lashes out: every enemy takes 15 dark damage, and your next attempt is 30% stronger.',
    hooks: {
      onSignatureFail(b, p, s) {
        if (p.retry) return;
        for (const f of b.foes()) b.damage(b.hero, f, 15, { element: 'dark', kind: 'proc' });
        s.boost = true;
      },
      modSignature(b, c, s) {
        if (s.boost && !c.echo) {
          s.boost = false;
          c.power *= 1.3;
        }
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

  // ------------------------------------------------------------- dodging
  ghost_step: {
    py: 'guǐ bù', zh: '鬼步', en: 'Ghost Step', element: 'dark', rarity: R.common, category: 'dodge', icon: 'moon',
    desc: 'Dodging leaves an illusion behind for 1.6s that draws most enemy attacks away from you.',
    hooks: {
      onDodge(b) {
        if (b.allies().some((a) => a.decoy)) return;
        b.spawnAlly({ sprite: 'shade', decoy: true, ttl: 1.6, interval: 99, dmg: b.flags.ghostArmy ? b.hero.atk * 0.4 : 0, element: 'dark' });
        if (b.flags.ghostArmy) b.allies().find((a) => a.decoy).interval = 0.4;
      },
    },
  },
  counterstrike: {
    py: 'fǎn jī', zh: '反击', en: 'Counterstrike', element: 'physical', rarity: R.rare, category: 'dodge', icon: 'swords', requires: ['打'],
    desc: 'After a successful dodge, instantly counterattack (90% of a basic attack, with all its effects).',
    hooks: {
      onDodge(b, p, s) {
        if (!ready(b, s, 0.3)) return;
        b.schedule(0.12, () => !b.result && b.heroAttack({ mult: 0.9, counter: true }));
      },
    },
  },
  slipstream: {
    py: 'liú fēng', zh: '流风', en: 'Slipstream', element: 'wind', rarity: R.common, category: 'dodge', icon: 'wind', requires: ['风'],
    desc: 'After a dodge: +40% move speed for 1.5s, and your next 2 basic attacks are Wind (they push further and fan Burning enemies into Wildfire).',
    hooks: {
      onDodge(b, p, s) {
        s.n = 2;
        b.addBuff(b.hero, { id: 'slipstream', dur: 1.5, stats: { speedPct: 0.4 } });
      },
      onAttack(b, p, s) {
        if (!(s.n > 0)) return;
        s.n -= 1;
        p.element = 'wind';
        p.kbMult *= 1.8;
      },
    },
  },
  afterimage: {
    py: 'shǎn yǐng', zh: '闪影', en: 'Afterimage', element: 'wind', rarity: R.rare, category: 'dodge', icon: 'wind',
    desc: 'Every 3rd dodge summons a clone of you that strikes 5 times for 60% attack.',
    hooks: {
      onDodge(b, p, s) {
        s.n = (s.n || 0) + 1;
        if (s.n % 3 !== 0 || b.allies().length >= 4) return;
        b.label(b.hero, 'shǎn yǐng!', 'good');
        b.spawnAlly({ sprite: 'shade', ttl: 2.6, interval: 0.5, dmg: b.hero.atk * 0.6, element: b.hero.attackElement });
      },
    },
  },
  rain_dancer: {
    py: 'yǔ wǔ', zh: '雨舞', en: 'Rain Dancer', element: 'water', rarity: R.common, category: 'dodge', icon: 'drop', requires: ['雨'],
    desc: 'Dodging splashes every enemy near you: they become Wet (lightning then conducts, ice freezes them).',
    hooks: {
      onDodge(b) {
        for (const f of nearHero(b, 32)) b.applyStatus(f, 'wet', { src: b.hero, dur: 4 });
      },
    },
  },

  // ------------------------------------------------------------- momentum
  fierce_assault: {
    py: 'měng gōng', zh: '猛攻', en: 'Relentless', element: 'fire', rarity: R.common, category: 'momentum', icon: 'fist',
    desc: 'While you have Momentum: +20% more attack speed and +10% critical chance.',
    stats: { momentumAspd: 0.2 },
    hooks: { onTick: (b) => b.hasMomentum() && b.addBuff(b.hero, { id: 'fierce', dur: 1.1, stats: { crit: 0.1 } }) },
  },
  last_stand: {
    py: 'sǐ shǒu', zh: '死守', en: 'Last Stand', element: 'earth', rarity: R.common, category: 'momentum', icon: 'shield',
    desc: 'While you do NOT have Momentum: +5 defence and take 15% less damage.',
    hooks: {
      onTick: (b) => !b.hasMomentum() && b.addBuff(b.hero, { id: 'last_stand', dur: 1.1, stats: { def: 5 } }),
      modIncoming: (b, c) => !b.hasMomentum() && (c.mult *= 0.85),
    },
  },
  overextension: {
    py: 'mào jìn', zh: '冒进', en: 'Overextension', element: 'fire', rarity: R.common, category: 'momentum', icon: 'swords',
    desc: 'While you have Momentum, deal 35% more damage, but take 15% more.',
    hooks: {
      modDamage: (b, c) => b.hasMomentum() && (c.mult *= 1.35),
      modIncoming: (b, c) => b.hasMomentum() && (c.mult *= 1.15),
    },
  },
  second_wind: {
    py: 'huí qì', zh: '回气', en: 'Second Wind', element: 'wind', rarity: R.common, category: 'momentum', icon: 'wind',
    desc: 'Losing Momentum immediately grants a 20 shield (at most every 4s).',
    hooks: { onMomentum: (b, p, s) => !p.on && ready(b, s, 4) && b.addShield(b.hero, 20) },
  },
  invaders_mark: {
    py: 'rù qīn', zh: '入侵', en: 'Invader’s Mark', element: 'light', rarity: R.rare, category: 'momentum', icon: 'eye',
    desc: 'Stepping into the enemy’s half Marks every enemy near you for 5s: they take 20% more damage from you.',
    hooks: {
      onZone(b, p) {
        if (!p.enemyZone) return;
        for (const f of nearHero(b, 40)) b.applyStatus(f, 'mark', { src: b.hero, dur: 5 });
      },
    },
  },
  cursed_crown: {
    py: 'zǔ guān', zh: '诅冠', en: 'Cursed Crown', element: 'dark', rarity: R.epic, category: 'momentum', icon: 'crown',
    desc: 'Momentum is twice as strong (double attack speed bonus, +15% damage), but you take 25% more damage while you have it.',
    hooks: {
      onBattleStart: (b) => (b.flags.momentumMult = (b.flags.momentumMult || 0) + 1),
      modDamage: (b, c) => b.hasMomentum() && (c.mult *= 1.15),
      modIncoming: (b, c) => b.hasMomentum() && (c.mult *= 1.25),
    },
  },
  war_drum: {
    py: 'zhàn gǔ', zh: '战鼓', en: 'War Drum', element: 'earth', rarity: R.common, category: 'momentum', icon: 'star', requires: ['打'],
    desc: 'Every new battlefield: start with a 25 shield and 4s of Momentum.',
    hooks: {
      onBattleStart(b) {
        b.addShield(b.hero, 25);
        b.grantMomentum(b.hero, 4);
      },
    },
  },

  // ------------------------------------------------------------- positioning & collisions
  wallbreaker: {
    py: 'pò qiáng', zh: '破墙', en: 'Wallbreaker', element: 'earth', rarity: R.common, category: 'positioning', icon: 'mountain', requires: ['墙'],
    desc: 'Enemies you knock into the far wall take collision damage (more the faster they fly).',
    hooks: {
      onWallHit(b, p) {
        b.damage(b.hero, p.target, 10 + p.speed * 0.35, { element: 'earth', kind: 'proc', noKnock: true });
        if (b.flags.demolition) {
          b.emit({ type: 'reaction', tgt: p.target.id, id: 'explode', text: 'bào zhà' });
          for (const f of b.near(p.target, 16)) {
            b.damage(b.hero, f, 10 + p.speed * 0.25, { element: 'earth', kind: 'proc', noKnock: true });
            b.applyStatus(f, 'stun', { dur: 0.5, src: b.hero });
          }
        }
      },
    },
  },
  chain_collision: {
    py: 'lián zhuàng', zh: '连撞', en: 'Chain Collision', element: 'physical', rarity: R.rare, category: 'positioning', icon: 'echo',
    desc: 'Enemies you knock into other enemies pass on 60% of the force, and both take 8 damage.',
    hooks: {
      onCollide(b, p) {
        b.damage(b.hero, p.other, 8, { element: 'physical', kind: 'proc', noKnock: true });
        b.damage(b.hero, p.target, 8, { element: 'physical', kind: 'proc', noKnock: true });
        b.knockback(p.target, (p.speed / 7.25) * 0.6, { src: b.hero });
      },
    },
  },
  hunters_instinct: {
    py: 'liè rén', zh: '猎人', en: 'Hunter’s Instinct', element: 'wind', rarity: R.common, category: 'positioning', icon: 'paw',
    desc: '+40% move speed while chasing enemies. Slowed, Chilled or Stunned enemies take 20% more damage from you.',
    hooks: {
      onTick: (b) => b.hero.moving && b.addBuff(b.hero, { id: 'hunt', dur: 1.1, stats: { speedPct: 0.4 } }),
      onMove: (b) => b.addBuff(b.hero, { id: 'hunt', dur: 1.1, stats: { speedPct: 0.4 } }),
      modDamage: (b, c) => (c.tgt.statuses.slow || c.tgt.statuses.chill || c.tgt.statuses.stun) && (c.mult *= 1.2),
    },
  },
  hemorrhage: {
    py: 'xuè bēng', zh: '血崩', en: 'Hemorrhage', element: 'physical', rarity: R.common, category: 'positioning', icon: 'skull',
    desc: 'Bleeding enemies you knock back tear open: 10 damage and their Bleed lasts 2s longer.',
    hooks: {
      onKnockback(b, p) {
        const bl = p.target.statuses.bleed;
        if (!bl || p.dist < 2) return;
        bl.left += 2;
        b.damage(b.hero, p.target, 10, { element: 'physical', kind: 'proc', noKnock: true });
      },
    },
  },

  // ------------------------------------------------------------- statuses & elemental interactions
  bleeding_edge: {
    py: 'xuè rèn', zh: '血刃', en: 'Bleeding Edge', element: 'physical', rarity: R.common, category: 'status', icon: 'slash',
    desc: 'Critical hits make the target Bleed (4/s for 4s).',
    stats: { crit: 0.03 },
    hooks: { onCrit: (b, p) => p.target.alive && b.applyStatus(p.target, 'bleed', { dps: 4, src: b.hero }) },
  },
  ink_parasite: {
    py: 'mò chóng', zh: '墨虫', en: 'Ink Parasite', element: 'dark', rarity: R.rare, category: 'status', icon: 'skull',
    desc: 'When you apply a status, 30% of the time it also spreads to another enemy.',
    hooks: {
      onStatus(b, p, s) {
        if (s.lock || b.rng() >= (b.flags.parasiteAll ? 0.6 : 0.3)) return;
        const f = b.randomFoe([p.target]);
        if (!f) return;
        s.lock = true;
        const st = p.target.statuses[p.id];
        b.applyStatus(f, p.id, { src: b.hero, dps: st?.dps || 3 });
        s.lock = false;
      },
    },
  },
  holy_water: {
    py: 'shèng shuǐ', zh: '圣水', en: 'Holy Water', element: 'light', rarity: R.common, category: 'status', icon: 'drop',
    desc: 'Your basic attacks against Cursed enemies turn to Light: they Purify (double damage, an explosion and a little healing).',
    hooks: { onAttack: (b, p) => p.target?.statuses.curse && (p.element = 'light') },
  },
  conductive_ink: {
    py: 'dǎo mò', zh: '导墨', en: 'Conductive Ink', element: 'lightning', rarity: R.common, category: 'status', icon: 'bolt', requires: ['电'],
    desc: 'Your lightning hits on Wet enemies also jump to the nearest other enemy for 60%, Wet or not.',
    hooks: {
      onHit(b, p, s) {
        if (p.element !== 'lightning' || !p.target.statuses.wet || !ready(b, s, 0.2)) return;
        const f = b.near(p.target, 30)[0];
        if (f) arc(b, p.target, f, p.dealt * 0.6);
      },
    },
  },
  glacier_fist: {
    py: 'bīng quán', zh: '冰拳', en: 'Glacier Fist', element: 'ice', rarity: R.rare, category: 'status', icon: 'snow', requires: ['冷', '雪', '冬天'],
    desc: 'Your critical hits on Frozen enemies Shatter them (heavy bonus damage).',
    hooks: { onCrit: (b, p) => p.target.statuses?.frozen && b.shatter(p.target, b.hero) },
  },

  // ------------------------------------------------------------- defence triggers
  soul_lantern: {
    py: 'hún dēng', zh: '魂灯', en: 'Soul Lantern', element: 'light', rarity: R.common, category: 'defense', icon: 'sun', requires: ['灯'],
    desc: 'Every enemy you defeat grants a 10 shield and recharges your signature 1s faster.',
    hooks: {
      onKill(b) {
        b.addShield(b.hero, 10);
        b.reduceCooldowns(1);
      },
    },
  },
  thorn_shell: {
    py: 'cì ké', zh: '刺壳', en: 'Thorn Shell', element: 'earth', rarity: R.common, category: 'defense', icon: 'shield',
    desc: 'Whenever you gain a shield, its thorns hit the nearest enemy for half of it (at least 4).',
    hooks: {
      onShield(b, p, s) {
        if (!ready(b, s, 0.4)) return;
        const f = b.front();
        if (f) b.damage(b.hero, f, Math.max(4, p.amount * 0.5), { element: 'earth', kind: 'thorns' });
      },
    },
  },
  rage: {
    py: 'nù qì', zh: '怒气', en: 'Rising Rage', element: 'fire', rarity: R.common, category: 'defense', icon: 'flame',
    desc: 'Every 5 hits you take, your next basic attack deals double damage and knocks the target far back.',
    hooks: {
      onDamaged(b, p, s) {
        s.n = (s.n || 0) + 1;
        if (s.n >= 5) {
          s.n = 0;
          s.armed = true;
          b.label(b.hero, 'nù!', 'good');
        }
      },
      onAttack(b, p, s) {
        if (!s.armed) return;
        s.armed = false;
        p.mult *= 2;
        p.kbMult *= 3;
      },
    },
  },
  overflowing_ink: {
    py: 'mò yì', zh: '墨溢', en: 'Overflowing Ink', element: 'dark', rarity: R.rare, category: 'defense', icon: 'drop',
    desc: 'Healing beyond your max HP becomes an ink projectile that hits the nearest enemy for 150% of the excess.',
    hooks: {
      onHeal(b, p, s) {
        if (p.overflow < 2 || !ready(b, s, 0.3)) return;
        const f = b.front();
        if (!f) return;
        b.emit({ type: 'shot', src: 'hero', tgt: f.id, element: 'dark', spell: true });
        b.damage(b.hero, f, p.overflow * 1.5, { element: 'dark', kind: 'proc' });
      },
    },
  },

  // ------------------------------------------------------------- strange & build-changing
  mirror_brush: {
    py: 'fǎn bǐ', zh: '反笔', en: 'Mirror Brush', element: 'dark', rarity: R.rare, category: 'strange', icon: 'echo',
    desc: '20% of your basic attacks repeat from the opposite direction: a 60% echo that yanks the target toward you.',
    hooks: {
      onHit(b, p) {
        if (p.sub || p.counter || b.rng() >= 0.2) return;
        const t = p.target;
        b.schedule(0.15, () => {
          if (!t.alive) return;
          b.emit({ type: 'mirror', tgt: t.id });
          b.damage(b.hero, t, p.dealt * 0.6, { element: 'dark', kind: 'proc' });
          b.pull(t, 4, { src: b.hero });
        });
      },
    },
  },
  broken_hourglass: {
    py: 'pò shā lòu', zh: '破沙漏', en: 'Broken Hourglass', element: 'physical', rarity: R.common, category: 'strange', icon: 'hourglass',
    desc: 'Every 6th basic attack, time slips: +80% attack speed for 2s.',
    hooks: {
      onAttack(b, p) {
        if (p.count % 6 !== 0) return;
        b.addBuff(b.hero, { id: 'hourglass', dur: 2, stats: { aspdPct: 0.8 } });
        if (b.flags.clockwork) b.reduceCooldowns(1);
      },
    },
  },
  chaotic_scroll: {
    py: 'luàn juàn', zh: '乱卷', en: 'Chaotic Scroll', element: 'physical', rarity: R.rare, category: 'strange', icon: 'scroll',
    desc: 'Whenever one of your passive items triggers, there’s a small chance of a random extra effect (a status, a shield, a lightning bolt or a shove).',
    hooks: { onBattleStart: (b) => (b.chaos = true) },
  },
  twin_shadows: {
    py: 'shuāng yǐng', zh: '双影', en: 'Twin Shadows', element: 'dark', rarity: R.epic, category: 'strange', icon: 'moon',
    desc: 'A shadow twin follows you all battle and copies each of your basic attacks at 35% strength.',
    hooks: {
      onBattleStart(b, p, s) {
        s.twin = b.spawnAlly({ sprite: 'shade', ttl: 9999, interval: 99, dmg: 0, follow: true });
      },
      onHit(b, p, s) {
        if (p.sub || p.counter || !s.twin?.alive) return;
        const t = p.target;
        b.schedule(0.15, () => {
          if (!t.alive || !s.twin.alive) return;
          b.emit({ type: 'shot', src: s.twin.id, tgt: t.id, element: p.element, small: true });
          b.damage({ ...s.twin, side: 0, atk: b.hero.atk }, t, b.hero.atk * 0.35, { element: p.element, kind: 'proc', canCrit: false });
          if (b.flags.ghostArmy) b.applyStatus(t, 'curse', { src: b.hero, dur: 2 });
        });
      },
    },
  },

  // ============================================================= hero-specific (signature) items
  // -------------------------------------------- Xinyi · Fruit Salad!
  fruit_basket: {
    py: 'guǒ lán', zh: '果篮', en: 'Fruit Basket', element: 'physical', rarity: R.common, category: 'hero', hero: 'xinyi', icon: 'chest',
    desc: 'Thrown fruit split open: 3 seeds fly at random enemies (12 each).',
    hooks: {
      onFruit(b, p) {
        if (!p.thrown) return;
        for (let i = 0; i < 3; i++) {
          const f = b.randomFoe();
          if (!f) return;
          b.emit({ type: 'shot', src: p.target?.id || 'hero', tgt: f.id, element: 'physical', small: true });
          b.damage(b.hero, f, 12 * p.power, { element: 'physical', kind: 'proc' });
          if (b.flags.fruitFrenzy) {
            const g = b.randomFoe([f]);
            if (g) b.damage(b.hero, g, 8 * p.power, { element: 'physical', kind: 'proc' });
          }
        }
      },
    },
  },
  bouncy_fruit: {
    py: 'tán tiào', zh: '弹跳', en: 'Bouncy Fruit', element: 'physical', rarity: R.common, category: 'hero', hero: 'xinyi', icon: 'echo',
    desc: 'Thrown fruit bounce on to 2 more enemies (15 each) and knock them back.',
    hooks: {
      onFruit(b, p) {
        if (!p.thrown) return;
        let from = p.target;
        const hit = [from];
        for (let i = 0; i < 2; i++) {
          const f = b.randomFoe(hit);
          if (!f) return;
          b.emit({ type: 'shot', src: from?.id || 'hero', tgt: f.id, element: 'physical', fruit: p.fruit });
          b.damage(b.hero, f, 15 * p.power, { element: 'physical', kind: 'proc' });
          b.knockback(f, 4, { src: b.hero });
          hit.push(f);
          from = f;
        }
      },
    },
  },
  juicy: {
    py: 'duō zhī', zh: '多汁', en: 'Juicy', element: 'fire', rarity: R.common, category: 'hero', hero: 'xinyi', icon: 'sun',
    desc: 'Eating fruit gives Momentum for 4s, wherever you stand.',
    hooks: { onFruit: (b, p) => !p.thrown && b.grantMomentum(b.hero, 4) },
  },
  sugar_rush: {
    py: 'táng fèn', zh: '糖分', en: 'Sugar Rush', element: 'light', rarity: R.common, category: 'hero', hero: 'xinyi', icon: 'star',
    desc: 'Eating fruit empowers your next basic attack: +150% damage.',
    hooks: {
      onFruit: (b, p, s) => !p.thrown && (s.armed = true),
      onAttack(b, p, s) {
        if (!s.armed) return;
        s.armed = false;
        p.mult *= 2.5;
        b.label(b.hero, 'táng!', 'good');
      },
    },
  },
  bumper_crop: {
    py: 'dà fēng shōu', zh: '大丰收', en: 'Bumper Crop', element: 'earth', rarity: R.rare, category: 'hero', hero: 'xinyi', icon: 'sparkle',
    desc: 'Every 3rd fruit summons a bonus random fruit too.',
    hooks: {
      onFruit(b, p, s) {
        if (p.bonus) return;
        s.n = (s.n || 0) + 1;
        if (s.n % 3 !== 0) return;
        b.label(b.hero, 'dà fēng shōu!', 'good');
        b.schedule(0.3, () => !b.result && serveFruit(b, pick(b, FRUIT_IDS), { power: p.power }, { bonus: true }));
      },
    },
  },
  // -------------------------------------------- Mei · Patient Blade
  blood_blossom: {
    py: 'xuè huā', zh: '血花', en: 'Blood Blossom', element: 'physical', rarity: R.common, category: 'hero', hero: 'mei', icon: 'slash',
    desc: 'Patient Blade makes every enemy it cuts Bleed (5/s for 5s).',
    hooks: { onBlade: (b, p) => p.targets.forEach((f) => b.applyStatus(f, 'bleed', { dps: 5 * p.power, dur: b.sigDur(5), src: b.hero })) },
  },
  second_wave: {
    py: 'èr dāo', zh: '二刀', en: 'Second Wave', element: 'wind', rarity: R.rare, category: 'hero', hero: 'mei', icon: 'doubleSlash',
    desc: 'Patient Blade sends a second wave across the battlefield half a second later (60% damage).',
    hooks: {
      onBlade(b, p) {
        if (p.echo || p.wave) return;
        b.schedule(0.5, () => {
          if (b.result) return;
          b.emit({ type: 'sig', id: 'patient_blade', phase: 'wave' });
          const targets = b.foes();
          for (const f of targets) b.damage(b.hero, f, b.hero.atk * 0.9 * p.power, { kind: 'spell', element: 'wind' });
          b.trigger('onBlade', { targets, power: p.power * 0.6, wave: true });
        });
      },
    },
  },
  steel_veil: {
    py: 'jiàn mù', zh: '剑幕', en: 'Steel Veil', element: 'earth', rarity: R.common, category: 'hero', hero: 'mei', icon: 'shield',
    desc: 'Every enemy Patient Blade hits grants you a 7 shield.',
    hooks: { onBlade: (b, p) => p.targets.length && b.addShield(b.hero, 7 * p.targets.length) },
  },
  honed_edge: {
    py: 'mó dāo', zh: '磨刀', en: 'Honed Edge', element: 'physical', rarity: R.rare, category: 'hero', hero: 'mei', icon: 'sword',
    desc: 'Each critical hit sharpens your next Patient Blade by 8% (up to +80%).',
    hooks: {
      onCrit: (b, p, s) => p.kind === 'attack' && (s.n = Math.min(10, (s.n || 0) + 1)),
      modSignature(b, c, s) {
        if (!s.n || c.echo) return;
        c.power *= 1 + 0.08 * s.n;
        s.n = 0;
      },
    },
  },
  still_water: {
    py: 'zhǐ shuǐ', zh: '止水', en: 'Still Water', element: 'water', rarity: R.common, category: 'hero', hero: 'mei', icon: 'drop',
    desc: 'Patient Blade is 60% stronger when you do NOT have Momentum (patience, not haste).',
    hooks: { modSignature: (b, c) => !b.hasMomentum() && (c.power *= 1.6) },
  },
  sword_intent: {
    py: 'jiàn yì', zh: '剑意', en: 'Sword Intent', element: 'physical', rarity: R.epic, category: 'hero', hero: 'mei', icon: 'swords',
    desc: 'Patient Blade counts as a basic-attack hit on every enemy it cuts: all your on-hit items trigger on each of them.',
    hooks: {
      onBlade(b, p, s) {
        if (s.lock) return;
        s.lock = true;
        for (const f of p.targets) if (f.alive) b.trigger('onHit', { target: f, dealt: b.hero.atk, crit: false, element: 'physical', sub: false, blade: true });
        s.lock = false;
      },
    },
  },
  // -------------------------------------------- Huojin · Burning Passion!
  cinder_heart: {
    py: 'huǒ xīn', zh: '火心', en: 'Cinder Heart', element: 'fire', rarity: R.common, category: 'hero', hero: 'huojin', icon: 'flame',
    desc: 'While you have Momentum, Burn damage is 50% higher.',
    hooks: { modDamage: (b, c) => c.kind === 'dot' && c.element === 'fire' && b.hasMomentum() && (c.mult *= 1.5) },
  },
  fanned_flames: {
    py: 'shān huǒ', zh: '扇火', en: 'Fanned Flames', element: 'wind', rarity: R.common, category: 'hero', hero: 'huojin', icon: 'wind',
    desc: 'Dodging fans the flames: Burning enemies spread their Burn to every enemy near them.',
    hooks: {
      onDodge(b) {
        for (const f of b.foes()) {
          const burn = f.statuses.burn;
          if (!burn) continue;
          for (const g of b.near(f, 25)) b.applyStatus(g, 'burn', { dps: burn.dps, src: b.hero });
        }
      },
    },
  },
  roaring_spirit: {
    py: 'hǒu shēng', zh: '吼声', en: 'Roaring Spirit', element: 'fire', rarity: R.rare, category: 'hero', hero: 'huojin', icon: 'crown',
    desc: 'Burning Passion also makes you attack 30% faster.',
    hooks: { onSignature: (b, c) => !c.echo && b.addBuff(b.hero, { id: 'roar', sig: true, dur: b.sigDur(8), stats: { aspdPct: 0.3 } }) },
  },
  eternal_flame: {
    py: 'cháng míng', zh: '长明', en: 'Eternal Flame', element: 'fire', rarity: R.rare, category: 'hero', hero: 'huojin', icon: 'sun',
    desc: 'Critical hits during Burning Passion extend it by 0.5s (up to +4s).',
    hooks: {
      onCrit(b) {
        if (b.extendBuff(b.hero, 'passion', 0.5, 4)) b.extendBuff(b.hero, 'roar', 0.5, 4);
      },
    },
  },
  flame_mantle: {
    py: 'huǒ pī', zh: '火披', en: 'Flame Mantle', element: 'fire', rarity: R.common, category: 'hero', hero: 'huojin', icon: 'shield',
    desc: 'Taking damage during Burning Passion releases a fire burst around you (15 + Burn).',
    hooks: {
      onDamaged(b, p, s) {
        if (!b.buffActive('passion') || !ready(b, s, 0.6)) return;
        b.emit({ type: 'cast', spell: 'burst', element: 'fire' });
        for (const f of nearHero(b, 26)) {
          b.damage(b.hero, f, 15, { element: 'fire', kind: 'proc' });
          b.applyStatus(f, 'burn', { dps: 3, src: b.hero });
        }
      },
    },
  },
  ember_shield: {
    py: 'huǒ dùn', zh: '火盾', en: 'Ember Shield', element: 'earth', rarity: R.common, category: 'hero', hero: 'huojin', icon: 'shield',
    desc: 'Every time an enemy starts Burning, you gain a 5 shield.',
    hooks: { onStatus: (b, p, s) => p.id === 'burn' && p.isNew && ready(b, s, 0.3) && b.addShield(b.hero, 5) },
  },
  // -------------------------------------------- Ruizhe · Deny Danger!
  sticky_ink: {
    py: 'nián mò', zh: '粘墨', en: 'Sticky Ink', element: 'water', rarity: R.common, category: 'hero', hero: 'ruizhe', icon: 'drop',
    desc: 'Enemies thrown back by Deny Danger! are Slowed for 4s.',
    hooks: { onRepel: (b, p) => p.targets.forEach((f) => b.applyStatus(f, 'slow', { dur: b.sigDur(4), src: b.hero })) },
  },
  barbed_seal: {
    py: 'cì yìn', zh: '刺印', en: 'Barbed Seal', element: 'earth', rarity: R.common, category: 'hero', hero: 'ruizhe', icon: 'rune',
    desc: 'Raising Deny Danger!’s shield cuts every enemy within reach for 25.',
    hooks: {
      onSigShield(b) {
        for (const f of nearHero(b, 40)) b.damage(b.hero, f, 25, { element: 'earth', kind: 'proc', noKnock: true });
      },
    },
  },
  emphatic_no: {
    py: 'jué bù', zh: '绝不', en: 'Emphatic No!', element: 'wind', rarity: R.common, category: 'hero', hero: 'ruizhe', icon: 'x',
    desc: 'Deny Danger! throws enemies 50% further.',
    hooks: { onBattleStart: (b) => (b.flags.denyKb = (b.flags.denyKb || 0) + 0.5) },
  },
  four_sides: {
    py: 'sì miàn', zh: '四面', en: 'Surrounded Scholar', element: 'earth', rarity: R.common, category: 'hero', hero: 'ruizhe', icon: 'shield',
    desc: 'Deny Danger!’s shield is 20% stronger for each enemy close to you.',
    hooks: { onBattleStart: (b) => (b.flags.surroundShield = 0.2) },
  },
  second_refusal: {
    py: 'zài jù', zh: '再拒', en: 'Second Refusal', element: 'earth', rarity: R.rare, category: 'hero', hero: 'ruizhe', icon: 'wave',
    desc: 'When Deny Danger!’s shield breaks, it releases a second shockwave that throws enemies back.',
    hooks: {
      onShieldBreak(b, p) {
        if (!p.sig) return;
        b.label(b.hero, 'bù!', 'good');
        b.emit({ type: 'sig', id: 'deny_danger', phase: 'repel' });
        const pushed = [];
        for (const f of nearHero(b, 50)) if (b.knockback(f, 16, { src: b.hero }) > 0) pushed.push(f);
        b.trigger('onRepel', { targets: pushed, power: 0.6, second: true });
      },
    },
  },
  ink_trail: {
    py: 'mò jì', zh: '墨迹', en: 'Ink Trail', element: 'dark', rarity: R.rare, category: 'hero', hero: 'ruizhe', icon: 'scroll',
    desc: 'Enemies thrown by Deny Danger! leave ink trails behind: enemies standing in them take 4 damage per second and are Cursed.',
    hooks: {
      onRepel(b, p) {
        for (const f of p.targets.slice(0, 4)) {
          b.addZone({ kind: 'ink', x: f.x + 6, w: 8, dur: b.sigDur(4), hostile: true, tickEvery: 0.5,
            tick(bb, u) {
              bb.damage(bb.hero, u, 2, { element: 'dark', kind: 'dot', noReact: true });
              bb.applyStatus(u, 'curse', { dur: 1.5, src: bb.hero });
            } });
        }
      },
    },
  },
  // -------------------------------------------- Fuyun · Go All Out!
  thousand_cuts: {
    py: 'qiān dāo', zh: '千刀', en: 'Thousand Cuts', element: 'wind', rarity: R.rare, category: 'hero', hero: 'fuyun', icon: 'doubleSlash',
    desc: 'During the frenzy, each critical hit also throws a wind blade at another enemy (40%).',
    hooks: {
      onCrit(b, p, s) {
        if (p.kind !== 'attack' || !b.buffActive('frenzy') || !ready(b, s, 0.12)) return;
        const f = b.randomFoe([p.target]) || p.target;
        if (!f?.alive) return;
        b.emit({ type: 'shot', src: 'hero', tgt: f.id, element: 'wind', small: true });
        b.damage(b.hero, f, p.dealt * 0.4, { element: 'wind', kind: 'proc' });
      },
    },
  },
  lucky_charm: {
    py: 'hù shēn fú', zh: '护身符', en: 'Lucky Charm', element: 'light', rarity: R.common, category: 'hero', hero: 'fuyun', icon: 'star',
    desc: 'Every critical hit grants a 3 shield.',
    hooks: { onCrit: (b, p, s) => ready(b, s, 0.2) && b.addShield(b.hero, 3) },
  },
  endless_storm: {
    py: 'wú jìn', zh: '无尽', en: 'Endless Storm', element: 'wind', rarity: R.rare, category: 'hero', hero: 'fuyun', icon: 'vortex',
    desc: 'Each critical hit extends the frenzy by 0.25s (up to +3s).',
    hooks: {
      onCrit(b) {
        const H = b.hero;
        if (!b.buffActive('frenzy')) return;
        const before = H.buffs.find((x) => x.id === 'frenzy').until;
        b.extendBuff(H, 'frenzy', 0.25, 3);
        const after = H.buffs.find((x) => x.id === 'frenzy').until;
        if (after > before) H.momentumGrant = Math.max(H.momentumGrant || 0, after);
      },
    },
  },
  storm_edge: {
    py: 'fēng rèn', zh: '风刃', en: 'Storm Edge', element: 'lightning', rarity: R.common, category: 'hero', hero: 'fuyun', icon: 'bolt',
    desc: 'Critical hits have a 30% chance to apply a random elemental status.',
    hooks: { onCrit: (b, p) => p.target.alive && b.rng() < 0.3 && b.applyStatus(p.target, pick(b, RANDOM_STATUSES), { src: b.hero, dps: 3 }) },
  },
  blade_dance: {
    py: 'jiàn wǔ', zh: '剑舞', en: 'Blade Dance', element: 'wind', rarity: R.rare, category: 'hero', hero: 'fuyun', icon: 'swords',
    desc: 'Dodging during the frenzy makes 2 extra attacks (70% each).',
    hooks: {
      onDodge(b, p, s) {
        if (!b.buffActive('frenzy') || !ready(b, s, 0.4)) return;
        b.schedule(0.1, () => !b.result && b.heroAttack({ mult: 0.7, counter: true }));
        b.schedule(0.25, () => !b.result && b.heroAttack({ mult: 0.7, counter: true }));
      },
    },
  },
  gale_strike: {
    py: 'jí fēng', zh: '疾风', en: 'Gale Strike', element: 'wind', rarity: R.common, category: 'hero', hero: 'fuyun', icon: 'wind',
    desc: 'Critical hits knock enemies back further (+4).',
    hooks: { onCrit: (b, p) => p.kind === 'attack' && p.target.alive && b.knockback(p.target, 4, { src: b.hero }) },
  },
  // -------------------------------------------- Lei · Knockback!
  stunning_blow: {
    py: 'zhèn yūn', zh: '震晕', en: 'Stunning Blow', element: 'earth', rarity: R.common, category: 'hero', hero: 'lei', icon: 'star',
    desc: 'Enemies sent flying by Knockback! are Stunned for 1.2s when they land.',
    hooks: {
      onLaunch(b, p) {
        b.schedule(0.35, () => p.targets.forEach((f) => b.applyStatus(f, 'stun', { dur: 1.2, src: b.hero })));
      },
    },
  },
  charge_up: {
    py: 'chōng diàn', zh: '充电', en: 'Charged Up', element: 'lightning', rarity: R.common, category: 'hero', hero: 'lei', icon: 'bolt',
    desc: 'After Knockback!, you have Momentum for 5s wherever you stand.',
    hooks: { onLaunch: (b) => b.grantMomentum(b.hero, 5) },
  },
  arc_flail: {
    py: 'diàn liàn', zh: '电链', en: 'Arc Flail', element: 'lightning', rarity: R.rare, category: 'hero', hero: 'lei', icon: 'bolt',
    desc: 'Knockback! releases lightning arcs: every enemy sent flying takes 20 lightning damage and is Shocked.',
    hooks: {
      onLaunch(b, p) {
        for (const f of p.targets) {
          arc(b, b.hero, f, 20 * p.power);
          b.applyStatus(f, 'shock', { dur: 3, src: b.hero });
        }
      },
    },
  },
  pileup: {
    py: 'duī zhuàng', zh: '堆撞', en: 'Pile-Up', element: 'earth', rarity: R.rare, category: 'hero', hero: 'lei', icon: 'mountain',
    desc: 'An enemy slammed into the wall knocks its neighbours into it too: they take 12 and are pushed back.',
    hooks: {
      onWallHit(b, p, s) {
        s.hit ||= {};
        for (const f of b.near(p.target, 16)) {
          if ((s.hit[f.id] || -9) > b.t - 1) continue;
          s.hit[f.id] = b.t;
          b.damage(b.hero, f, 12, { element: 'earth', kind: 'proc', noKnock: true });
          b.knockback(f, 6, { src: b.hero });
        }
      },
    },
  },
  momentum_swing: {
    py: 'guàn xìng', zh: '惯性', en: 'Momentum Swing', element: 'physical', rarity: R.common, category: 'hero', hero: 'lei', icon: 'fist',
    desc: 'Your next basic attack after Knockback! gains bonus damage based on how far you sent enemies (up to +150%).',
    hooks: {
      onLaunch: (b, p, s) => (s.bonus = Math.min(1.5, p.total / 60)),
      onAttack(b, p, s) {
        if (!s.bonus) return;
        p.mult *= 1 + s.bonus;
        s.bonus = 0;
        b.label(b.hero, 'guàn xìng!', 'good');
      },
    },
  },
  storm_barrier: {
    py: 'léi zhàng', zh: '雷障', en: 'Storm Barrier', element: 'lightning', rarity: R.rare, category: 'hero', hero: 'lei', icon: 'shield',
    desc: 'Knockback! leaves a crackling barrier behind the enemies for 6s: crossing it deals 12 lightning, Shocks and shoves them back.',
    hooks: {
      onLaunch(b) {
        b.addZone({ kind: 'barrier', x: b.worldW * 0.68, w: 3, dur: b.sigDur(6), hostile: true,
          onEnter(bb, u) {
            bb.damage(bb.hero, u, 12, { element: 'lightning', kind: 'proc', noKnock: true });
            bb.applyStatus(u, 'shock', { dur: 2, src: bb.hero });
            bb.knockback(u, 6, { src: bb.hero });
          } });
      },
    },
  },
};

export const ITEM_IDS = Object.keys(ITEMS);
export const RARITY_WEIGHT = { common: 10, rare: 5, epic: 1.5 };
