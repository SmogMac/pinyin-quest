// Playable heroes. `sprite` is a key in src/assets/manifest.js. Names are shown pinyin first.
// Each hero has: base stats · a basic attack style · exactly one signature move (data/signatures.js,
// with its own Mandarin minigame; it can never be replaced) · a passive (hooks run by the combat
// engine, like items; passives are never silenced). `quizHealPct` is used for teacher/rest questions.
// attack.fx picks the attack visuals: melee 'slash' | 'dagger' | 'chain', ranged 'orb' | 'dart' | 'fire'.
// passive.meter { key, max, color } shows a charge meter over the hero (read from the hook state).
// attack.kb is how far basic attacks push (world units); stats.speedPct / kbRes shape positioning.

export const HEROES = {
  xinyi: {
    py: 'Xīn Yí', zh: '欣怡', en: 'Xin Yi', title: 'Cheerful Wanderer', sprite: 'xinyi',
    blurb: 'Always smiling, always learning. Her good mood is contagious, and it keeps her on her feet.',
    stats: { maxHp: 135, atk: 14, def: 2, aspd: 0.9, crit: 0.05, critDmg: 1.5, dodge: 0 },
    attack: { range: 48, element: 'physical', style: 'Ranged qi orbs', fx: 'orb', kb: 1.5 },
    signature: 'fruit_salad',
    strength: 'Versatile: every fruit does something different, and each success heals her.',
    weakness: 'Unpredictable; average damage until her build comes together.',
    passive: {
      id: 'good_cheer', py: 'kāi xīn', zh: '开心', en: 'Good Cheer', quizHealPct: 0.04,
      desc: 'Every successful Fruit Salad! heals 6% HP; the first each battle also grants a 15 shield. Correct answers outside battle heal 4%.',
      hooks: {
        onSignature(b, c, s) {
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
    blurb: 'A quiet swordswoman. She strikes first, and every Patient Blade sharpens her next cut.',
    stats: { maxHp: 125, atk: 16, def: 2, aspd: 0.85, crit: 0.12, critDmg: 1.6, dodge: 0.05, speedPct: 0.15 },
    attack: { range: 11, element: 'physical', style: 'Melee sword', fx: 'slash', kb: 3.5 },
    signature: 'patient_blade',
    strength: 'Huge burst that hits the whole battlefield.',
    weakness: 'Fragile and must fight up close.',
    passive: {
      id: 'plum_blossom', py: 'méi huā', zh: '梅花', en: 'Plum Blossom',
      desc: 'Opens each battle with a sword draw for 200% damage. After each Patient Blade, her next attack is a guaranteed crit that also cuts every other enemy for 50%.',
      hooks: {
        onBattleStart(b) {
          b.schedule(0.4, () => {
            const t = b.front();
            if (!t) return;
            b.emit({ type: 'cast', spell: 'iaido', element: 'dark' });
            b.label(b.hero, 'bá dāo!', 'good');
            b.damage(b.hero, t, b.hero.atk * 2, { element: 'physical', kind: 'proc', canCrit: true });
          });
        },
        onSignature: (b, c, s) => !c.echo && (s.petal = true),
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
    stats: { maxHp: 125, atk: 12, def: 2, aspd: 1.0, crit: 0.05, critDmg: 1.5, dodge: 0 },
    attack: { range: 50, element: 'physical', style: 'Ranged paper darts', fx: 'dart', kb: 1 },
    signature: 'deny_danger',
    strength: 'Controls space: shields himself and throws enemies far away; panic saves him.',
    weakness: 'Weak basic attacks; his signature deals almost no damage.',
    passive: {
      id: 'nervous_genius', py: 'jǐn zhāng', zh: '紧张', en: 'Nervous Genius',
      desc: 'Well-read: every different element among his items makes Deny Danger! 10% stronger. Panic: the first time he drops below half HP each battle, his signature recharges instantly and he attacks 30% faster.',
      hooks: {
        onBattleStart(b, p, s) {
          const els = new Set();
          for (const id of b.hero.items) {
            const e = ITEM_ELEMENT[id];
            if (e && e !== 'physical') els.add(e);
          }
          s.mult = 1 + 0.1 * els.size;
        },
        modSignature: (b, c, s) => (c.power *= s.mult || 1),
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
    stats: { maxHp: 135, atk: 14, def: 2, aspd: 1.0, crit: 0.05, critDmg: 1.5, dodge: 0, speedPct: -0.05 },
    attack: { range: 46, element: 'fire', style: 'Ranged fire bolts', fx: 'fire', kb: 2 },
    signature: 'burning_passion',
    strength: 'Fire everywhere; Burn builds come naturally and hit harder.',
    weakness: 'Slow-moving, and needs his Burning Passion to really get going.',
    poolBias: { fire: 2 },
    passive: {
      id: 'perfect_heat', py: 'huǒ hou', zh: '火候', en: 'Perfect Heat',
      desc: 'Basic attacks are fire. Every 4th attack is a fire bolt for double damage that blasts the target back and sets it Burning. Burning enemies take 20% more damage from him. Fire items show up twice as often.',
      hooks: {
        onAttack(b, p, s) {
          if (p.count % 4 !== 0) return;
          p.mult *= 2;
          p.kbMult = 2.5;
          s.bolt = true;
        },
        onHit(b, p, s) {
          if (!s.bolt || p.sub) return;
          s.bolt = false;
          b.applyStatus(p.target, 'burn', { dps: 3, src: b.hero });
        },
        modDamage(b, c) {
          if (c.tgt.statuses.burn) c.mult *= 1.2;
        },
      },
    },
    unlock: { level: 8, text: 'Reach account level 8' },
  },
  fuyun: {
    py: 'Fú Yún', zh: '浮云', en: 'Fuyun', title: 'Lucky Assassin', sprite: 'fuyun',
    blurb: 'Smiles like she knows something you don’t. Blades drift where the wind takes them, and luck always seems to be on her side.',
    stats: { maxHp: 125, atk: 12, def: 2, aspd: 1.25, crit: 0.15, critDmg: 1.7, dodge: 0.17, speedPct: 0.3 },
    attack: { range: 11, element: 'physical', style: 'Twin daggers', fx: 'dagger', kb: 1.5 },
    signature: 'go_all_out',
    strength: 'Dodges a lot; short, explosive frenzies of guaranteed crits.',
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
  lei: {
    py: 'Léi', zh: '雷', en: 'Lei', title: 'Thunder Brawler', sprite: 'lei',
    blurb: 'Cocky, impatient and always spoiling for a fight. Swings a ball and chain and dares the storm to keep up.',
    stats: { maxHp: 160, atk: 18, def: 5, aspd: 0.7, crit: 0.05, critDmg: 1.6, dodge: 0, speedPct: -0.1, kbRes: 0.35 },
    attack: { range: 20, element: 'physical', style: 'Ball and chain (slow, heavy, hits around the target, knocks foes far back)', fx: 'chain', kb: 7 },
    signature: 'knockback',
    strength: 'Heavy hits that splash; controls the whole battlefield with Knockback!.',
    weakness: 'Slow swings; must get in close.',
    passive: {
      id: 'static_temper', py: 'pí qi', zh: '脾气', en: 'Static Temper',
      meter: { key: 'charge', max: 4, color: '#ffe14a' },
      desc: 'His ball and chain also hits enemies next to the target for 40%. Each hit builds static charge; at 4 charges his next swing releases a lightning burst (100% attack as lightning to the target and everything nearby, plus Shock). Chain Pull: every 3rd swing hooks the target and drags it toward him instead of knocking it away.',
      hooks: {
        onAttack(b, p, s) {
          if (p.count % 3 === 0) {
            p.kbMult = 0;
            s.pull = true;
          }
          if ((s.charge || 0) < 4) return;
          s.charge = 0;
          s.burst = true;
        },
        onHit(b, p, s) {
          if (p.sub) return;
          if (s.pull) {
            s.pull = false;
            b.pull(p.target, 9, { src: b.hero });
          }
          for (const f of b.near(p.target, 12)) b.damage(b.hero, f, p.dealt * 0.4, { element: 'physical', kind: 'proc' });
          if (s.burst) {
            s.burst = false;
            b.label(b.hero, 'pī lì!', 'good');
            b.emit({ type: 'burst', tgt: p.target.id, element: 'lightning' });
            for (const f of [p.target, ...b.near(p.target, 14)]) {
              b.damage(b.hero, f, b.hero.atk, { element: 'lightning', kind: 'proc' });
              b.applyStatus(f, 'shock', { dur: 2, src: b.hero });
            }
          } else s.charge = Math.min(4, (s.charge || 0) + 1);
        },
      },
    },
    unlock: { level: 12, text: 'Reach account level 12' },
  },
};

// Filled in by combat.js to avoid a circular import (heroes -> items -> …).
export const ITEM_ELEMENT = {};

export const DEFAULT_HERO = 'xinyi';
export const heroDef = (id) => HEROES[id] || HEROES[DEFAULT_HERO];
