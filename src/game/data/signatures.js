// Signature moves: every hero has exactly one, manually activated, which can never be replaced.
// Activating it opens that hero's own Mandarin minigame (see src/learn/signaturePuzzles.js) while
// the battle keeps running; solving it fires the move, a wrong answer fizzles it into cooldown.
//
// The pieces are kept apart so a new hero can bring a completely different minigame:
//   template  → which puzzle is generated and how it is checked (learn/signaturePuzzles.js)
//   cast(b,c) → the combat effect, using the Battle API in combat.js. c = { sig, power, element,
//               first, echo, choice (from the puzzle, e.g. the fruit named), hp (fraction) }
//   hooks     → always-on engine hooks belonging to the move (e.g. Burning Passion's burning hits)
//   cd        → cooldown in seconds (Battle handles cooldowns, cancelling and failure)
// Passive items react through the engine triggers onSignature / onSignatureFail / modSignature /
// onSigHit and the move-specific ones emitted here (onFruit, onRepel, onWallHit …).

const pick = (b, list) => list[Math.floor(b.rng() * list.length)];

// ------------------------------------------------------------------ Xinyi's fruit
// Thrown fruit hit enemies; eaten fruit help Xinyi. Each one is worth naming.
export const FRUIT_EFFECTS = {
  apple: { thrown: true, desc: 'Thrown hard: heavy impact damage and a big knockback (shatters Frozen foes).' },
  banana: { thrown: true, desc: 'Leaves a slippery peel: enemies walking onto it stumble (stunned and shoved).' },
  orange: { thrown: false, desc: 'Eaten: restores health.' },
  grape: { thrown: true, desc: 'A handful of grapes pelt random enemies.' },
  watermelon: { thrown: true, desc: 'Smashes down on a crowd: area damage, knockback and soaks them (Wet).' },
  strawberry: { thrown: false, desc: 'Eaten: a sweet shield.' },
  mango: { thrown: false, desc: 'Eaten: attack much faster for a while.' },
  lemon: { thrown: true, desc: 'Sour spray on every enemy: they deal less damage (Weaken).' },
  pear: { thrown: false, desc: 'Eaten: tougher skin (defence and block) for a while.' },
  peach: { thrown: false, desc: 'Eaten: heals steadily over a few seconds.' },
};
export const FRUIT_IDS = Object.keys(FRUIT_EFFECTS);
// Ascension fruit (learned on higher Ascensions) act like a base fruit (`as`)
const FRUIT_ALIAS = { pineapple: 'apple', green_apple: 'apple', cherry: 'grape', blueberry: 'grape', coconut: 'watermelon', kiwi: 'peach', cantaloupe: 'orange' };

/**
 * Summons one fruit and resolves it. `bonus` fruit (from items) don't trigger "every Nth fruit"
 * effects again, so fruit can never summon fruit forever.
 */
export function serveFruit(b, id, c, { bonus = false } = {}) {
  const H = b.hero;
  const p = c.power;
  const kind = FRUIT_ALIAS[id] || id;
  const fx = FRUIT_EFFECTS[kind] || FRUIT_EFFECTS.apple;
  const target = b.front();
  b.emit({ type: 'fruit', fruit: id, thrown: fx.thrown, tgt: target?.id, bonus });
  const dur = (s) => b.sigDur(s);
  const hit = (f, amount, opts = {}) => b.damage(H, f, amount, { kind: 'spell', element: 'physical', ...opts, fruit: id });
  switch (kind) {
    case 'apple':
      if (!target) break;
      hit(target, 45 * p, { element: 'earth' });
      b.knockback(target, 9, { src: H });
      break;
    case 'banana': {
      if (target) hit(target, 10 * p);
      const x = target ? target.x : H.x + 25;
      b.addZone({ kind: 'peel', x, w: 6, dur: dur(6) * (b.flags.peelLong ? 2 : 1), charges: b.flags.peelLong ? 6 : 3, hostile: true,
        onEnter(bb, u, z) {
          if (u.flying) return;
          z.charges -= 1;
          bb.label(u, 'huá!', 'good');
          bb.knockback(u, 4, { src: bb.hero });
          bb.applyStatus(u, 'stun', { dur: 0.9, src: bb.hero });
          bb.trigger('onSlip', { target: u });
          if (z.charges <= 0) z.until = 0;
        } });
      break;
    }
    case 'orange':
      b.heal(H, H.maxHp * 0.16 * p, { fruit: id });
      break;
    case 'grape':
      for (let i = 0; i < 6; i++) {
        const f = b.randomFoe();
        if (!f) break;
        b.emit({ type: 'shot', src: 'hero', tgt: f.id, element: 'physical', fruit: 'grape', small: true, spell: true });
        hit(f, 8 * p);
      }
      break;
    case 'watermelon': {
      if (!target) break;
      for (const f of [target, ...b.near(target, 24)]) {
        hit(f, 30 * p, { element: 'water' });
        b.applyStatus(f, 'wet', { src: H, dur: dur(5) });
        b.knockback(f, 6, { src: H });
      }
      break;
    }
    case 'strawberry':
      b.addShield(H, 30 * p);
      break;
    case 'mango':
      b.addBuff(H, { id: 'mango', sig: true, dur: dur(6), stats: { aspdPct: 0.5 } });
      break;
    case 'lemon':
      for (const f of b.foes()) {
        hit(f, 8 * p, { element: 'light' });
        b.applyStatus(f, 'weaken', { src: H, dur: dur(6) });
      }
      break;
    case 'pear':
      b.addBuff(H, { id: 'pear', sig: true, dur: dur(7), stats: { def: 8, block: 0.15 } });
      break;
    case 'peach':
      for (let i = 0; i < 6; i++) b.schedule(i + 0.2, () => b.heal(H, H.maxHp * 0.035 * p, { fruit: id, silent: true }));
      break;
    default:
  }
  b.trigger('onFruit', { fruit: kind, thrown: fx.thrown, target, power: p, bonus });
}

// ------------------------------------------------------------------ signature moves
export const SIGNATURES = {
  fruit_salad: {
    hero: 'xinyi', py: 'shuǐguǒ shālā', zh: '水果沙拉', en: 'Fruit Salad!', template: 'fruit', element: 'light', cd: 5.5, icon: 'fruit',
    blurb: 'Xinyi wants to summon a fruit, but she can’t remember what it’s called. Help her name it!',
    desc: 'Name the fruit and Xinyi summons it. Apples, grapes, watermelons, bananas and lemons are thrown at enemies; oranges, strawberries, mangoes, pears and peaches she eats.',
    cast(b, c) {
      serveFruit(b, FRUIT_EFFECTS[c.choice] || FRUIT_ALIAS[c.choice] ? c.choice : pick(b, FRUIT_IDS), c);
    },
    // Echoing Soul: a second, random fruit
    echo(b, c) {
      serveFruit(b, pick(b, FRUIT_IDS), c, { bonus: true });
    },
  },
  patient_blade: {
    hero: 'mei', py: 'nàixīn jiàn', zh: '耐心剑', en: 'Patient Blade', template: 'number', element: 'physical', cd: 5.5, icon: 'blade',
    blurb: 'Mei steadies her breath, counts, and unleashes one perfect strike across the whole battlefield.',
    desc: 'Read the number word in pinyin and pick its digit. Mei takes a composed stance, then a great sword arc cuts every enemy for 160% attack as a guaranteed critical hit and pushes them back a little; afterwards she stays on guard for 3s (parries far more blows).',
    cast(b, c) {
      b.emit({ type: 'sig', id: 'patient_blade', phase: 'windup' });
      b.schedule(0.45, () => {
        if (b.result) return;
        b.emit({ type: 'sig', id: 'patient_blade', phase: 'strike' });
        const targets = b.foes();
        // composure: after the strike Mei stays on guard, parrying many blows for a moment
        b.addBuff(b.hero, { id: 'composure', sig: true, dur: b.sigDur(3), stats: { block: 0.45, def: 4 } });
        for (const f of targets) {
          // precision: the patient strike always lands as a critical hit
          b.damage(b.hero, f, b.hero.atk * 1.6 * c.power, { kind: 'spell', element: 'physical', forceCrit: true, blade: true });
          b.knockback(f, 3, { src: b.hero });
        }
        b.trigger('onBlade', { targets, power: c.power, echo: c.echo });
      });
    },
    // Echoing Soul: a weaker follow-up sword slash across the field
    echo(b, c) {
      b.emit({ type: 'sig', id: 'patient_blade', phase: 'wave' });
      for (const f of b.foes()) {
        b.damage(b.hero, f, b.hero.atk * 0.8 * c.power, { kind: 'spell', element: 'physical', blade: true });
        b.knockback(f, 2, { src: b.hero });
      }
    },
  },

  burning_passion: {
    hero: 'huojin', py: 'rèqíng ránshāo', zh: '热情燃烧', en: 'Burning Passion!', template: 'cheer', element: 'fire', cd: 11, icon: 'flame',
    blurb: 'Huojin is fuelled by a fiery fighting spirit. Hype him up with every encouraging phrase!',
    desc: 'Pick out every encouraging phrase. Huojin blazes for 8 seconds: he attacks 35% faster and hits 20% harder, and his basic attacks set enemies Burning and leave small flame trails on the ground.',
    cast(b, c) {
      b.addBuff(b.hero, { id: 'passion', sig: true, dur: b.sigDur(8) * (c.echo ? 0.4 : 1), stats: { aspdPct: 0.35, dmgPct: 0.2 } });
      b.flags.passionPower = Math.max(b.flags.passionPower || 0, c.power);
      b.emit({ type: 'sig', id: 'burning_passion', phase: 'aura' });
    },
    hooks: {
      onHit(b, p, s) {
        if (!b.buffActive('passion') || !p.target.alive) return;
        b.applyStatus(p.target, 'burn', { dps: 6 * (b.flags.passionPower || 1), src: b.hero });
        if (p.sub || (s.trailAt || -9) > b.t - 0.6) return;
        s.trailAt = b.t;
        b.addZone({ kind: 'flame', x: p.target.x, w: 5, dur: 2.5, hostile: true, tickEvery: 0.5,
          tick: (bb, u) => bb.applyStatus(u, 'burn', { dps: 3, dur: 1.5, src: bb.hero }) });
      },
      onBuffEnd(b, p) {
        if (p.id === 'passion') b.flags.passionPower = 0;
      },
    },
    // Echoing Soul: the passion burns 3s longer and a fire pulse rolls across the field
    echo(b, c) {
      if (!b.extendBuff(b.hero, 'passion', 3, 6)) b.addBuff(b.hero, { id: 'passion', sig: true, dur: 3, stats: { aspdPct: 0.35, dmgPct: 0.2 } });
      b.emit({ type: 'cast', spell: 'burst', element: 'fire' });
      for (const f of b.foes()) {
        b.damage(b.hero, f, b.hero.atk * 0.5 * c.power, { kind: 'spell', element: 'fire' });
        b.applyStatus(f, 'burn', { dps: 5 * c.power, src: b.hero });
      }
    },
  },
  deny_danger: {
    hero: 'ruizhe', py: 'jùjué wēixiǎn', zh: '拒绝危险', en: 'Deny Danger!', template: 'negation', element: 'earth', cd: 10, icon: 'scroll',
    blurb: 'Ruizhe uses the power of language to reject danger itself. Find the right negation!',
    desc: 'Complete the sentence with bù, méi or méiyǒu. Ruizhe unrolls his scroll, raises a strong shield and a repelling shockwave throws every enemy far back (almost no damage).',
    cast(b, c) {
      const H = b.hero;
      b.emit({ type: 'sig', id: 'deny_danger', phase: 'scroll' });
      const near = b.foes().filter((f) => f.x - H.x <= 40).length;
      const amt = b.addShield(H, 38 * c.power * (1 + (b.flags.surroundShield || 0) * near));
      H.sigShield = amt;
      b.trigger('onSigShield', { amount: amt });
      b.emit({ type: 'sig', id: 'deny_danger', phase: 'repel' });
      const pushed = [];
      for (const f of b.foes()) {
        const d = f.x - H.x;
        const dist = (d < 45 ? 24 : 14) * (1 + (b.flags.denyKb || 0)) * (c.echo ? 0.5 : 1);
        b.damage(H, f, 3, { kind: 'spell', element: 'earth', noKnock: true });
        if (b.knockback(f, dist, { src: H }) > 0) pushed.push(f);
      }
      b.trigger('onRepel', { targets: pushed, power: c.power });
    },
    // Echoing Soul: another shield pulse and a second repelling shockwave
    echo(b, c) {
      const H = b.hero;
      b.emit({ type: 'sig', id: 'deny_danger', phase: 'repel' });
      b.addShield(H, 22 * c.power);
      for (const f of b.foes()) {
        b.damage(H, f, 6, { kind: 'spell', element: 'earth', noKnock: true });
        b.knockback(f, f.x - H.x < 45 ? 14 : 9, { src: H });
      }
    },
  },
  go_all_out: {
    hero: 'fuyun', py: 'quánlì yǐfù', zh: '全力以赴', en: 'Go All Out!', template: 'body', element: 'wind', cd: 11, icon: 'wind',
    blurb: 'Fuyun gathers herself for an overwhelming flurry, if you can name the body part first.',
    desc: 'Name the body part. For 5 seconds Fuyun goes into a frenzy: every hit is a critical strike, she attacks faster and she has Momentum wherever she stands.',
    cast(b, c) {
      const dur = b.sigDur(5) * (c.echo ? 0.4 : 1);
      b.addBuff(b.hero, { id: 'frenzy', sig: true, dur, stats: { crit: 1, aspdPct: 0.15, critDmg: 0.25 * Math.max(0, c.power - 1) } });
      b.grantMomentum(b.hero, dur);
      b.emit({ type: 'sig', id: 'go_all_out', phase: 'frenzy' });
    },
    // Echoing Soul: a shadow clone of Fuyun whose strikes are all critical hits
    echo(b, c) {
      b.spawnAlly({ sprite: 'shade', ttl: 3, interval: 0.32, asHero: true, mult: 0.5 * c.power, forceCrit: true });
      b.fx('clone', { tgt: 'hero' });
    },
  },
  knockback: {
    hero: 'lei', py: 'jītuì', zh: '击退', en: 'Knockback!', template: 'tone', element: 'lightning', cd: 7, icon: 'flail',
    blurb: 'Lei swings his ball and chain hard enough to send everyone flying, once he hears the right tone.',
    desc: 'Pick the spelling with the right tone. Lei whirls his ball and chain overhead and blasts every enemy back toward the far wall. No damage: pure positioning (bosses are pushed less).',
    cast(b, c) {
      const W = b.worldW;
      b.emit({ type: 'sig', id: 'knockback', phase: 'swing' });
      b.schedule(0.35, () => {
        if (b.result) return;
        b.emit({ type: 'sig', id: 'knockback', phase: 'blast' });
        const pushed = [];
        let total = 0;
        for (const f of b.foes()) {
          // ordinary enemies fly all the way into the far wall (slamming into it); guardians and
          // bosses are heavy and slide only part of the way, but always a meaningful distance
          const room = W - 3 - f.x;
          const full = f.boss ? Math.max(12, room * 0.45) : f.edef?.guardian ? Math.max(10, room * 0.7) : room + 7;
          const dist = Math.max(8, full * Math.min(1.4, c.power)) * (c.echo ? 0.5 : 1);
          const d = b.knockback(f, dist, { src: b.hero, force: true });
          if (d > 0) {
            pushed.push(f);
            total += d;
          }
        }
        b.trigger('onLaunch', { targets: pushed, total, power: c.power });
      });
    },
    // Echoing Soul: a second shockwave, and for a moment every collision crackles with lightning
    echo(b, c) {
      b.emit({ type: 'sig', id: 'knockback', phase: 'blast' });
      b.flags.collideBoost = b.t + 1.5;
      for (const f of b.foes()) {
        b.damage(b.hero, f, b.hero.atk * 0.3 * c.power, { kind: 'spell', element: 'lightning', noKnock: true });
        b.knockback(f, f.boss ? 8 : 14, { src: b.hero, force: true });
      }
    },
  },
};

export const SIGNATURE_IDS = Object.keys(SIGNATURES);
export const sigOf = (heroDef) => SIGNATURES[heroDef?.signature] || SIGNATURES.fruit_salad;
