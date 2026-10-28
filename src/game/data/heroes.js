// Playable heroes. `sprite` is a key in src/assets/manifest.js. Names are shown pinyin first.
// Each hero has: base stats · a basic attack style · a signature spell (in data/spells.js, starts
// in a locked slot) · a passive (hooks run by the combat engine, like items; passives are never
// silenced). `quizHealPct` is used by run.js for teacher/rest questions.

export const HEROES = {
  xinyi: {
    py: 'Xīn Yí', zh: '欣怡', en: 'Xin Yi', title: 'Cheerful Wanderer', sprite: 'xinyi',
    blurb: 'Always smiling, always learning. Her good mood is contagious, and it keeps her on her feet.',
    stats: { maxHp: 135, atk: 14, def: 2, aspd: 0.9, crit: 0.05, critDmg: 1.5, dodge: 0 },
    attack: { range: 48, element: 'physical', style: 'Ranged qi orbs' },
    signature: 'jiayou',
    strength: 'Forgiving: heals from every successful cast.',
    weakness: 'Average damage until her build comes together.',
    passive: {
      id: 'good_cheer', py: 'kāi xīn', zh: '开心', en: 'Good Cheer', quizHealPct: 0.04,
      desc: 'Every successful spellcast heals 6% HP; the first each battle also grants a 15 shield. Correct answers outside battle heal 4%.',
      hooks: {
        onCast(b, c, s) {
          if (c.echo) return;
          b.heal(b.hero, b.hero.maxHp * 0.06);
          if (!s.firstDone) {
            s.firstDone = true;
            b.addShield(b.hero, 15);
          }
        },
      },
    },
    unlock: null,
  },
  mei: {
    py: 'Méi', zh: '梅', en: 'Mei', title: 'Silent Blade', sprite: 'mei',
    blurb: 'A quiet swordswoman. She strikes first, and every spell she weaves sharpens her blade.',
    stats: { maxHp: 125, atk: 16, def: 2, aspd: 0.85, crit: 0.12, critDmg: 1.6, dodge: 0.05 },
    attack: { range: 11, element: 'physical', style: 'Melee sword' },
    signature: 'badao',
    strength: 'Huge burst; rewards casting often.',
    weakness: 'Fragile and must fight up close.',
    passive: {
      id: 'plum_blossom', py: 'méi huā', zh: '梅花', en: 'Plum Blossom',
      desc: 'Opens each battle with a sword draw for 200% damage. After each spell, her next attack is a guaranteed crit that also cuts every other enemy for 50%.',
      hooks: {
        onBattleStart(b) {
          b.schedule(0.4, () => {
            const t = b.front();
            if (!t) return;
            b.emit({ type: 'cast', spell: 'iaido', element: 'dark' });
            b.label(b.hero, 'bá dāo!', 'good');
            b.damage(b.hero, t, b.hero.atk * 2, { element: 'physical', kind: 'spell' });
          });
        },
        onCast: (b, c, s) => !c.echo && (s.petal = true),
        onAttack(b, p, s) {
          if (!s.petal) return;
          s.petal = false;
          s.cutting = true;
          p.mult *= b.hero.critDmg; // guaranteed crit
        },
        onHit(b, p, s) {
          if (!s.cutting || p.sub) return;
          s.cutting = false;
          b.label(b.hero, 'méi huā!', 'good');
          for (const f of b.foes()) if (f !== p.target) b.damage(b.hero, f, p.dealt * 0.5, { element: 'physical', kind: 'proc' });
        },
      },
    },
    unlock: { level: 3, text: 'Reach account level 3' },
  },
  ruizhe: {
    py: 'Ruì Zhé', zh: '睿哲', en: 'Ruizhe', title: 'Nervous Scholar', sprite: 'ruizhe',
    blurb: 'Has read every book and is terrified of all of them. Fights with scrolls, and panics brilliantly.',
    stats: { maxHp: 125, atk: 12, def: 2, aspd: 0.95, crit: 0.05, critDmg: 1.5, dodge: 0 },
    attack: { range: 50, element: 'physical', style: 'Ranged paper darts' },
    signature: 'zhishi',
    strength: 'Spells grow stronger with varied builds; panic saves him.',
    weakness: 'Weak basic attacks.',
    passive: {
      id: 'nervous_genius', py: 'jǐn zhāng', zh: '紧张', en: 'Nervous Genius',
      desc: 'Well-read: every different element among his items and spells makes his spells 10% stronger. Panic: the first time he drops below half HP each battle, all spell cooldowns reset and he attacks 30% faster.',
      hooks: {
        onBattleStart(b, p, s) {
          const els = new Set();
          for (const id of b.hero.items) {
            const e = ITEM_ELEMENT[id];
            if (e && e !== 'physical') els.add(e);
          }
          for (const sp of b.spells) if (sp.def) els.add(sp.def.element);
          s.mult = 1 + 0.1 * els.size;
        },
        modSpellPower: (b, c, s) => (c.power *= s.mult || 1),
        onLowHp(b) {
          b.label(b.hero, 'jǐn zhāng!!', 'enemy');
          b.resetCooldowns();
          b.addBuff(b.hero, { id: 'panic', dur: 999, stats: { aspdPct: 0.3 } });
        },
      },
    },
    unlock: { level: 5, text: 'Reach account level 5' },
  },
  huojin: {
    py: 'Huǒ Jìn', zh: '火烬', en: 'Huojin', title: 'Grumpy Fire Master', sprite: 'huojin',
    blurb: 'A stern old master who keeps a flame in his palm and has no patience for slow learners, or for enemies.',
    stats: { maxHp: 130, atk: 13, def: 2, aspd: 1.0, crit: 0.05, critDmg: 1.5, dodge: 0 },
    attack: { range: 46, element: 'fire', style: 'Ranged fire bolts' },
    signature: 'dianhuo',
    strength: 'Fire everywhere; Burn builds come naturally and hit harder.',
    weakness: 'Fire-resistant enemies (crabs, turtles) slow him down.',
    poolBias: { fire: 2 },
    passive: {
      id: 'perfect_heat', py: 'huǒ hou', zh: '火候', en: 'Perfect Heat',
      desc: 'Basic attacks are fire. Every 4th attack is a fire bolt for double damage that sets the target Burning. Burning enemies take 15% more damage from him. Fire items show up twice as often.',
      hooks: {
        onAttack(b, p, s) {
          if (p.count % 4 !== 0) return;
          p.mult *= 2;
          s.bolt = true;
        },
        onHit(b, p, s) {
          if (!s.bolt || p.sub) return;
          s.bolt = false;
          b.applyStatus(p.target, 'burn', { dps: 3, src: b.hero });
        },
        modDamage(b, c) {
          if (c.tgt.statuses.burn) c.mult *= 1.15;
        },
      },
    },
    unlock: { level: 8, text: 'Reach account level 8' },
  },
  fuyun: {
    py: 'Fú Yún', zh: '浮云', en: 'Fuyun', title: 'Lucky Assassin', sprite: 'fuyun',
    blurb: 'Smiles like she knows something you don’t. Blades drift where the wind takes them, and luck always seems to be on her side.',
    stats: { maxHp: 125, atk: 12, def: 2, aspd: 1.25, crit: 0.15, critDmg: 1.7, dodge: 0.2 },
    attack: { range: 11, element: 'physical', style: 'Twin daggers' },
    signature: 'xuanfeng',
    strength: 'Dodges a lot; every dodge sets up a critical strike.',
    weakness: 'Lowest health; relies on luck and speed.',
    passive: {
      id: 'lucky_streak', py: 'yùn qi', zh: '运气', en: 'Lucky Streak',
      desc: 'After she dodges, her next attack is a guaranteed crit, and a gust of wind slices every other enemy for half that damage. Once per battle, a hit that would knock her out misses instead: she keeps 1 HP and dodges every attack for 1.5s.',
      hooks: {
        onDodge: (b, p, s) => (s.ready = true),
        onAttack(b, p, s) {
          if (!s.ready) return;
          s.ready = false;
          s.gust = true;
          p.mult *= b.hero.critDmg; // guaranteed crit
        },
        onHit(b, p, s) {
          if (!s.gust || p.sub) return;
          s.gust = false;
          b.label(b.hero, 'fēng!', 'good');
          for (const f of b.foes()) if (f !== p.target) b.damage(b.hero, f, p.dealt * 0.5, { element: 'wind', kind: 'proc' });
        },
        onFatal(b, p, s) {
          if (p.prevented || s.luckUsed) return;
          s.luckUsed = true;
          p.prevented = true;
          b.hero.hp = 1;
          b.addBuff(b.hero, { id: 'lucky', dur: 1.5, stats: { dodge: 1 } });
          b.label(b.hero, 'yùn qi hǎo!', 'good');
        },
      },
    },
    unlock: { level: 10, text: 'Reach account level 10' },
  },
};

// Filled in by combat.js to avoid a circular import (heroes -> items -> …).
export const ITEM_ELEMENT = {};

export const DEFAULT_HERO = 'xinyi';
export const heroDef = (id) => HEROES[id] || HEROES[DEFAULT_HERO];
