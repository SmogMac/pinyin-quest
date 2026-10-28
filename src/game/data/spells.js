// Active spells. A hero holds at most 3 (one is their signature spell). Casting requires a short
// Mandarin puzzle while combat keeps running (see src/learn/puzzles.js).
//
// Fields: py/zh/en name · element · cd (seconds) · tier (1-3, puzzle difficulty) · tags
//         requires: vocabulary (Hanzi) — any one learned word puts the spell in the reward pool
//         puzzles: preferred puzzle types (others can still appear for variety)
//         cast(b, ctx): effect, using the Battle API in combat.js. ctx.power scales the effect.
// Names not in the HSK word list (e.g. 闪电) are taught on the spell card before they're used
// in a puzzle.

const front = (b) => b.front();

export const SPELLS = {
  // ------------------------------------------------------------------ signature spells
  jiayou: {
    py: 'jiā yóu', zh: '加油', en: 'Cheer On', element: 'light', cd: 10, tier: 1, signature: true, tags: ['heal', 'shield', 'buff', 'defensive'],
    puzzles: ['syllables', 'meaning'],
    desc: 'Heal 12% HP, gain a 15 shield and +30% attack speed for 5s.',
    cast(b, c) {
      b.heal(b.hero, b.hero.maxHp * 0.12 * c.power);
      b.addShield(b.hero, 15 * c.power);
      b.addBuff(b.hero, { id: 'jiayou', dur: 5, stats: { aspdPct: 0.3 } });
    },
  },
  badao: {
    py: 'bá dāo', zh: '拔刀', en: 'Sword Draw', element: 'dark', cd: 9, tier: 2, signature: true, tags: ['damage', 'aoe'],
    puzzles: ['syllables', 'shape'],
    desc: 'Slash every enemy for 160% attack as a guaranteed critical hit, and Curse them.',
    cast(b, c) {
      for (const f of b.foes()) {
        b.damage(b.hero, f, b.hero.atk * 1.6 * c.power, { element: c.element, kind: 'spell', forceCrit: true });
        b.applyStatus(f, 'curse', { src: b.hero });
      }
    },
  },
  zhishi: {
    py: 'zhī shi', zh: '知识', en: 'Knowledge', element: 'lightning', cd: 8, tier: 1, signature: true, tags: ['damage', 'chaos'],
    puzzles: ['phrase', 'meaning', 'syllables'],
    desc: 'Throw 3 scrolls at random enemies: 14 lightning damage each, plus a random status.',
    cast(b, c) {
      const statuses = ['burn', 'chill', 'wet', 'shock', 'curse'];
      for (let i = 0; i < 3; i++) {
        const f = b.randomFoe();
        if (!f) break;
        b.emit({ type: 'shot', src: 'hero', tgt: f.id, element: c.element, spell: true });
        b.damage(b.hero, f, 14 * c.power, { element: c.element, kind: 'spell' });
        b.applyStatus(f, statuses[Math.floor(b.rng() * statuses.length)], { src: b.hero, dps: 3 });
      }
    },
  },
  dianhuo: {
    py: 'diǎn huǒ', zh: '点火', en: 'Ignite', element: 'fire', cd: 9, tier: 1, signature: true, tags: ['damage', 'aoe', 'terrain'],
    puzzles: ['syllables', 'picture'],
    desc: 'Set every enemy Burning (4/s) and the ground ablaze for 6s.',
    cast(b, c) {
      for (const f of b.foes()) {
        b.damage(b.hero, f, 8 * c.power, { element: c.element, kind: 'spell' });
        b.applyStatus(f, 'burn', { dps: 4 * c.power, dur: 4, src: b.hero });
      }
      b.setTerrain('burning', 6);
    },
  },

  // ------------------------------------------------------------------ discoverable spells
  huoqiu: {
    py: 'huǒ qiú', zh: '火球', en: 'Fireball', element: 'fire', cd: 8, tier: 1, requires: ['火'], tags: ['damage'],
    puzzles: ['syllables', 'listen'],
    desc: 'A fireball hits the nearest enemy for 28 and Burns it; the blast hits nearby enemies for half.',
    cast(b, c) {
      const t = front(b);
      if (!t) return;
      b.emit({ type: 'shot', src: 'hero', tgt: t.id, element: c.element, spell: true, big: true });
      b.damage(b.hero, t, 28 * c.power, { element: c.element, kind: 'spell' });
      b.applyStatus(t, 'burn', { dps: 4 * c.power, src: b.hero });
      for (const f of b.near(t, 14)) b.damage(b.hero, f, 14 * c.power, { element: c.element, kind: 'spell' });
    },
  },
  dongtian: {
    py: 'dōng tiān', zh: '冬天', en: 'Winter Nova', element: 'ice', cd: 12, tier: 2, requires: ['冷', '雪', '冬天'], tags: ['damage', 'aoe', 'control'],
    puzzles: ['meaning', 'syllables', 'shape'],
    desc: '14 ice damage to all enemies and Chill them. Wet enemies freeze solid.',
    cast(b, c) {
      for (const f of b.foes()) {
        b.damage(b.hero, f, 14 * c.power, { element: c.element, kind: 'spell' });
        b.applyStatus(f, 'chill', { src: b.hero, dur: 4 });
      }
    },
  },
  shandian: {
    py: 'shǎn diàn', zh: '闪电', en: 'Lightning Strike', element: 'lightning', cd: 9, tier: 2, requires: ['电'], tags: ['damage', 'chain'],
    puzzles: ['listen', 'tone', 'syllables'],
    desc: 'Strike the nearest enemy for 32, then chain to 2 more (Wet enemies first).',
    cast(b, c) {
      let t = front(b);
      const hit = [];
      let dmg = 32 * c.power;
      const chains = 2 + (b.flags.extraChain || 0);
      for (let i = 0; i <= chains && t; i++) {
        hit.push(t);
        b.emit({ type: 'shot', src: i === 0 ? 'hero' : hit[i - 1].id, tgt: t.id, element: c.element, spell: true, bolt: true });
        b.damage(b.hero, t, dmg, { element: c.element, kind: 'spell' });
        dmg *= b.flags.chainNoDecay ? 1 : 0.7;
        const rest = b.foes().filter((f) => !hit.includes(f));
        t = rest.find((f) => f.statuses.wet) || rest[0] || null;
      }
    },
  },
  xiayu: {
    py: 'xià yǔ', zh: '下雨', en: 'Healing Rain', element: 'water', cd: 14, tier: 1, requires: ['雨', '下雨'], tags: ['heal', 'terrain', 'defensive'],
    puzzles: ['picture', 'meaning', 'listen'],
    desc: 'Heal 4% HP per second for 5s and soak the battlefield (Wet ground for 7s).',
    cast(b, c) {
      for (let i = 0; i < 5; i++) b.schedule(i + 0.1, () => b.heal(b.hero, b.hero.maxHp * 0.04 * c.power));
      b.setTerrain('wet', 7);
    },
  },
  qiang: {
    py: 'qiáng', zh: '墙', en: 'Stone Wall', element: 'earth', cd: 14, tier: 1, requires: ['墙', '石头', '山'], tags: ['shield', 'control', 'defensive'],
    puzzles: ['shape', 'picture', 'meaning'],
    desc: 'Raise a 35 shield, push melee enemies back and block 50% more attacks for 4s.',
    cast(b, c) {
      b.addShield(b.hero, 35 * c.power);
      for (const f of b.foes()) if (f.range < 20) b.knockback(f, 10);
      b.addBuff(b.hero, { id: 'wall', dur: 4, stats: { block: 0.5 } });
    },
  },
  heiye: {
    py: 'hēi yè', zh: '黑夜', en: 'Black Night', element: 'dark', cd: 11, tier: 2, requires: ['黑', '夜'], tags: ['damage', 'aoe', 'curse'],
    puzzles: ['meaning', 'listen', 'phrase'],
    desc: 'Curse every enemy for 6s (they take more damage and feed you life), and bring a blinding mist.',
    cast(b, c) {
      for (const f of b.foes()) {
        b.damage(b.hero, f, 10 * c.power, { element: c.element, kind: 'spell' });
        b.applyStatus(f, 'curse', { src: b.hero, dur: 6 });
      }
      b.setTerrain('obscured', 4);
    },
  },
  dafeng: {
    py: 'dà fēng', zh: '大风', en: 'Great Gale', element: 'wind', cd: 8, tier: 1, requires: ['风'], tags: ['damage', 'aoe', 'control'],
    puzzles: ['syllables', 'shape'],
    desc: '16 wind damage to every enemy and blow them back. Spreads fire from Burning enemies.',
    cast(b, c) {
      for (const f of b.foes()) {
        b.damage(b.hero, f, 16 * c.power, { element: c.element, kind: 'spell' });
        b.knockback(f, 12);
      }
    },
  },
  yangguang: {
    py: 'yáng guāng', zh: '阳光', en: 'Sunlight', element: 'light', cd: 13, tier: 2, requires: ['阳光', '太阳', '光'], tags: ['shield', 'cleanse', 'damage', 'defensive'],
    puzzles: ['picture', 'meaning', 'tone'],
    desc: 'Cleanse your statuses, gain a 20 shield, Dazzle all enemies and burn them with 12 light.',
    cast(b, c) {
      for (const k of Object.keys(b.hero.statuses)) delete b.hero.statuses[k];
      b.emit({ type: 'cleanse', tgt: 'hero' });
      b.addShield(b.hero, 20 * c.power);
      for (const f of b.foes()) {
        b.damage(b.hero, f, 12 * c.power, { element: c.element, kind: 'spell' });
        b.applyStatus(f, 'dazzle', { src: b.hero });
      }
    },
  },
  dahai: {
    py: 'dà hǎi', zh: '大海', en: 'Tidal Wave', element: 'water', cd: 12, tier: 2, requires: ['海', '大海'], tags: ['damage', 'aoe', 'control'],
    puzzles: ['picture', 'listen', 'syllables'],
    desc: '20 water damage to all enemies, soak them (Wet 6s) and wash them far back.',
    cast(b, c) {
      for (const f of b.foes()) {
        b.damage(b.hero, f, 20 * c.power, { element: c.element, kind: 'spell' });
        b.applyStatus(f, 'wet', { src: b.hero, dur: 6 });
        b.knockback(f, 18);
      }
    },
  },
  dizhen: {
    py: 'dì zhèn', zh: '地震', en: 'Earthquake', element: 'earth', cd: 16, tier: 3, requires: ['山', '地'], tags: ['damage', 'aoe', 'control', 'terrain'],
    puzzles: ['phrase', 'syllables', 'tone'],
    desc: '30 earth damage and a 1.5s stun to every grounded enemy; the ground keeps trembling.',
    cast(b, c) {
      for (const f of b.foes()) {
        if (f.flying) continue;
        b.damage(b.hero, f, 30 * c.power, { element: c.element, kind: 'spell' });
        b.applyStatus(f, 'stun', { src: b.hero, dur: 1.5 });
      }
      b.setTerrain('unstable', 5);
    },
  },
  xixue: {
    py: 'xī xuè', zh: '吸血', en: 'Life Drain', element: 'dark', cd: 10, tier: 2, requires: ['血'], tags: ['damage', 'heal'],
    puzzles: ['listen', 'meaning'],
    desc: 'Drain 30 life from the nearest enemy and heal for the damage dealt.',
    cast(b, c) {
      const t = front(b);
      if (!t) return;
      const dealt = b.damage(b.hero, t, 30 * c.power, { element: c.element, kind: 'spell' });
      b.heal(b.hero, dealt);
    },
  },
  xingxing: {
    py: 'xīng xing', zh: '星星', en: 'Falling Star', element: 'light', cd: 16, tier: 3, requires: ['星星'], tags: ['damage', 'aoe', 'delayed'],
    puzzles: ['shape', 'phrase', 'picture'],
    desc: 'After 1.2s a star crashes down: 55 light damage around the nearest enemy, setting the ground ablaze.',
    cast(b, c) {
      const t = front(b);
      if (!t) return;
      b.emit({ type: 'telegraph', src: t.id, windup: 1.2, text: 'xīng xing!', friendly: true });
      b.schedule(1.2, () => {
        const target = t.alive ? t : b.front();
        if (!target) return;
        for (const f of [target, ...b.near(target, 16)]) {
          b.damage(b.hero, f, 55 * c.power, { element: c.element, kind: 'spell' });
          b.applyStatus(f, 'burn', { dps: 3, src: b.hero });
        }
        b.setTerrain('burning', 5);
      });
    },
  },
  kuaipao: {
    py: 'kuài pǎo', zh: '快跑', en: 'Swift Steps', element: 'wind', cd: 12, tier: 1, requires: ['快', '跑'], tags: ['buff', 'defensive'],
    puzzles: ['syllables', 'meaning', 'listen'],
    desc: '+50% attack speed and +25% dodge for 6s.',
    cast(b, c) {
      b.addBuff(b.hero, { id: 'kuaipao', dur: 6 * Math.min(2, c.power), stats: { aspdPct: 0.5, dodge: 0.25 } });
    },
  },
};

export const SIGNATURE_SPELLS = Object.keys(SPELLS).filter((id) => SPELLS[id].signature);
export const DISCOVERABLE_SPELLS = Object.keys(SPELLS).filter((id) => !SPELLS[id].signature);
// How many slots a hero has, and whether the signature slot is locked (configurable for future items).
export const SPELL_SLOTS = 3;
export const SIGNATURE_LOCKED = true;
