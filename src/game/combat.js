// Deterministic autobattle simulation. Pure logic: no DOM, no React.
// simulateBattle() runs the whole fight up front and returns a timestamped event log that the
// BattleView replays (at any speed, or skipped). Same inputs + seed => same result.
import { HERO_BASE, COMBAT, SCALING, ACCOUNT_HP_PER_LEVEL, ACCOUNT_HP_CAP } from './data/balance.js';
import { UPGRADES, SYNERGIES, activeSynergies } from './data/upgrades.js';
import { ENEMIES } from './data/enemies.js';
import { BLESSINGS } from './data/elements.js';
import { heroDef, DEFAULT_HERO } from './data/heroes.js';

export function makeRng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function applyMods(u, m) {
  for (const [k, v] of Object.entries(m)) {
    if (k === 'abilities') u.abilities.push(...v.map((a) => ({ ...a })));
    else if (k === 'burnOnHit') u.burnOnHit = u.burnOnHit ? { dps: u.burnOnHit.dps + v.dps, dur: Math.max(u.burnOnHit.dur, v.dur) } : { ...v };
    else if (k === 'ally') u.ally = u.ally ? { ...u.ally, dmg: u.ally.dmg + v.dmg } : { ...v };
    else if (typeof v === 'number') u[k] = (u[k] || 0) + v;
  }
}

/**
 * Hero stats for a run: base + account bonus + upgrades + synergies + this battle's blessings.
 * blessings: array of element keys earned from correct answers.
 */
export function buildHero({ heroId = DEFAULT_HERO, upgrades = [], accountLevel = 1, blessings = [] } = {}) {
  const def = heroDef(heroId);
  const base = { ...HERO_BASE, ...def.stats };
  const u = {
    id: 'hero', side: 0, name: def.en, sprite: def.sprite, heroId, passive: def.passive,
    ...base,
    maxHp: base.maxHp + Math.min(ACCOUNT_HP_CAP, (accountLevel - 1) * ACCOUNT_HP_PER_LEVEL),
    dr: 0, lifesteal: 0, healMult: 1, shieldMult: 1, cdPct: 0, doubleStrike: 0, berserk: 0, lowHpHeal: 0,
    echo: 0, startShield: 0, aspdPct: 0, burnOnHit: null, ally: null, abilities: [], allyDmg: 0, healPct: 0,
  };
  for (const { id, level } of upgrades) {
    const def = UPGRADES[id];
    if (def) applyMods(u, def.mods(level));
  }
  // Kindling (Huo Huo): fire-word blessings count twice
  const allBlessings = def.passive.id === 'kindling' ? blessings.flatMap((el) => (el === 'fire' ? [el, el] : [el])) : blessings;
  for (const el of allBlessings) applyMods(u, BLESSINGS[el || 'none']?.mods || BLESSINGS.none.mods);
  u.synergies = activeSynergies(upgrades);
  for (const s of u.synergies) SYNERGIES[s].patch(u);
  u.aspd *= 1 + u.aspdPct;
  if (u.ally) u.ally.dmg += u.allyDmg;
  else if (u.allyDmg) u.atk += u.allyDmg;
  u.dr = Math.min(COMBAT.maxDr, u.dr);
  u.dodge = Math.min(COMBAT.maxDodge, u.dodge);
  u.crit = Math.min(0.75, u.crit);
  u.cdPct = Math.min(0.6, u.cdPct);
  return u;
}

export function buildEnemy(enemyId, floor, empower = 0, uid = enemyId) {
  const def = ENEMIES[enemyId];
  const f = def.fixedStats ? 0 : floor - 1;
  const s = def.stats;
  return {
    id: uid, enemyId, side: 1, name: def.name, sprite: def.sprite, boss: !!def.boss, elite: !!def.elite,
    maxHp: Math.round(s.maxHp * (1 + SCALING.hpPerFloor * f)),
    atk: s.atk * (1 + SCALING.atkPerFloor * f) * (1 + empower),
    def: (s.def || 0) + Math.floor(SCALING.defPerFloor * f),
    aspd: s.aspd, crit: s.crit || 0, critDmg: 1.5,
    dodge: def.traits?.dodge || 0, dr: 0, lifesteal: def.traits?.drain || 0,
    poison: def.traits?.poison || null, thorns: def.traits?.thorns || 0, enrage: def.traits?.enrage || null,
    abilities: (def.traits?.abilities || []).map((a) => ({ ...a })),
  };
}

const r2 = (n) => Math.round(n * 100) / 100;

/**
 * hero: unit from buildHero; heroHp: current HP carried through the run.
 * enemies: enemy ids. Returns { result, events, duration, heroHp, kills, dealt, taken, initial }.
 */
export function simulateBattle({ hero, heroHp, enemies, floor = 1, seed = 1, empower = 0 }) {
  const rng = makeRng(seed);
  const events = [];
  let t = 0;
  const emit = (e) => events.push({ t: r2(t), ...e });

  const H = { ...hero, hp: Math.min(heroHp ?? hero.maxHp, hero.maxHp), shield: 0, statuses: [], lowHealUsed: false };
  if (hero.healPct) H.hp = Math.min(H.maxHp, H.hp + Math.round(H.maxHp * hero.healPct * H.healMult));
  H.shield = Math.round((hero.startShield || 0) * H.shieldMult);
  H.atkTimer = 0.45;
  H.abilities = hero.abilities.map((a) => ({ ...a, cdEff: a.cd * (1 - H.cdPct), timer: a.cd * (1 - H.cdPct) * 0.5 }));
  const ally = hero.ally ? { ...hero.ally, timer: 0.8 } : null;

  let uidN = 0;
  const foes = enemies.map((id) => {
    const e = buildEnemy(id, floor, empower, `e${uidN++}`);
    return {
      ...e, hp: e.maxHp, shield: 0, statuses: [], atkTimer: 0.7 + uidN * 0.25, enraged: false,
      abilities: e.abilities.map((a) => ({ ...a, timer: a.cd ? a.cd * 0.8 : 0, used: false })),
    };
  });
  const initial = {
    hero: { hp: H.hp, maxHp: H.maxHp, shield: H.shield, sprite: H.sprite },
    ally: !!ally,
    enemies: foes.map((f) => ({ id: f.id, enemyId: f.enemyId, name: f.name, sprite: f.sprite, hp: f.hp, maxHp: f.maxHp, boss: f.boss, elite: f.elite })),
  };
  let dealt = 0;
  let taken = 0;
  let kills = 0;

  const alive = () => foes.filter((f) => f.hp > 0);
  const front = () => alive()[0];

  function heal(u, amount) {
    const amt = Math.round(Math.min(u.maxHp - u.hp, amount * (u.healMult || 1)));
    if (amt <= 0) return;
    u.hp += amt;
    emit({ type: 'heal', tgt: u.id, amount: amt, hp: u.hp });
  }

  function damage(src, tgt, raw, { kind = 'attack', element = null, canCrit = true, forceCrit = false, dodgeable = true } = {}) {
    if (tgt.hp <= 0) return 0;
    if (dodgeable && kind === 'attack' && rng() < tgt.dodge) {
      emit({ type: 'dodge', src: src?.id, tgt: tgt.id });
      if (tgt.dodgeCounter && src && src.hp > 0) {
        emit({ type: 'cast', src: tgt.id, ability: 'moonflash', element: 'shadow', targets: [src.id] });
        damage(tgt, src, tgt.dodgeCounter, { kind: 'spell', element: 'shadow', canCrit: false });
      }
      return 0;
    }
    let mult = 1;
    const crit = canCrit && src && (forceCrit || rng() < src.crit);
    if (crit) mult *= src.critDmg;
    if (src?.berserk && src.hp < src.maxHp * 0.5) mult *= 1 + src.berserk;
    const def = tgt.def + (tgt.shield > 0 && tgt.shieldDef ? tgt.shieldDef : 0);
    const mitig = kind === 'dot' ? 1 : COMBAT.defenseK / (COMBAT.defenseK + Math.max(0, def) * 4);
    let dmg = Math.max(1, Math.round(raw * mult * mitig * (1 - (tgt.dr || 0))));
    let absorbed = 0;
    if (tgt.shield > 0) {
      absorbed = Math.min(tgt.shield, dmg);
      tgt.shield -= absorbed;
      dmg -= absorbed;
    }
    tgt.hp = Math.max(0, tgt.hp - dmg);
    emit({ type: 'hit', src: src?.id, tgt: tgt.id, amount: dmg, absorbed, crit, element, kind, hp: tgt.hp, shield: tgt.shield });
    const total = dmg + absorbed;
    if (src && src.side === 0) dealt += total;
    if (tgt === H) taken += total;
    if (src && src.lifesteal && src.hp > 0 && kind !== 'dot') heal(src, total * src.lifesteal);
    if (tgt.thorns && src && kind === 'attack' && src.hp > 0) damage(tgt, src, total * tgt.thorns, { kind: 'thorns', canCrit: false, dodgeable: false });
    if (kind === 'attack' && src) {
      const burn = src.burnOnHit || src.poison;
      if (burn && tgt.hp > 0) {
        const dps = burn.dps * (crit && src.critBurnMult ? src.critBurnMult : 1);
        tgt.statuses.push({ type: 'burn', dps, left: burn.dur, tick: COMBAT.burnTick, src: src.id });
        emit({ type: 'status', tgt: tgt.id, status: src.poison ? 'poison' : 'burn' });
      }
    }
    // reactive triggers
    if (tgt === H && H.hp > 0 && H.lowHpHeal && !H.lowHealUsed && H.hp < H.maxHp * 0.4) {
      H.lowHealUsed = true;
      emit({ type: 'cast', src: 'hero', ability: 'radiant_heal', element: 'light', targets: ['hero'] });
      heal(H, H.maxHp * H.lowHpHeal);
    }
    if (tgt.side === 1 && tgt.hp > 0) {
      if (tgt.enrage && !tgt.enraged && tgt.hp < tgt.maxHp * tgt.enrage.below) {
        tgt.enraged = true;
        tgt.aspd *= tgt.enrage.aspdMult;
        emit({ type: 'enrage', tgt: tgt.id });
      }
      for (const a of tgt.abilities) {
        if (a.kind === 'summon' && !a.used && tgt.hp < tgt.maxHp * a.atHp) {
          a.used = true;
          const s = buildEnemy(a.summon, floor, empower, `e${uidN++}`);
          const unit = { ...s, hp: s.maxHp, shield: 0, statuses: [], atkTimer: 1, abilities: [] };
          foes.push(unit);
          emit({ type: 'summon', src: tgt.id, unit: { id: unit.id, enemyId: unit.enemyId, name: unit.name, sprite: unit.sprite, hp: unit.hp, maxHp: unit.maxHp } });
        }
      }
    }
    if (tgt.hp <= 0) {
      emit({ type: 'death', tgt: tgt.id });
      if (tgt.side === 1) kills++;
    }
    return total;
  }

  const P = H.passive || {};
  let attackCount = 0;
  let petalReady = false; // Plum Blossom: next attack crits and splashes
  let openerDone = P.id !== 'plum_blossom';

  function heroAttack(forceCrit = false) {
    const target = front();
    if (!target) return;
    attackCount += 1;
    if (P.id === 'kindling' && attackCount % P.every === 0) {
      emit({ type: 'cast', src: 'hero', ability: 'kindling', element: 'fire', targets: [target.id] });
      damage(H, target, H.atk * P.mult, { forceCrit, element: 'fire' });
      if (target.hp > 0) {
        target.statuses.push({ type: 'burn', dps: P.burn.dps, left: P.burn.dur, tick: COMBAT.burnTick, src: 'hero' });
        emit({ type: 'status', tgt: target.id, status: 'burn' });
      }
      return;
    }
    emit({ type: 'attack', src: 'hero', tgt: target.id });
    if (petalReady) {
      petalReady = false;
      const dealt = damage(H, target, H.atk, { forceCrit: true });
      const others = alive().filter((f) => f !== target);
      if (others.length) {
        emit({ type: 'cast', src: 'hero', ability: 'plum_cut', element: 'shadow', targets: others.map((o) => o.id) });
        for (const o of others) damage(H, o, dealt * P.splash, { kind: 'spell', element: 'shadow', canCrit: false });
      }
      return;
    }
    damage(H, target, H.atk, { forceCrit });
  }

  function castHero(a) {
    const targets = a.kind === 'damage' ? (a.target === 'all' ? alive() : [front()].filter(Boolean)) : [H];
    if (!targets.length) return;
    emit({ type: 'cast', src: 'hero', ability: a.id, element: a.element, fx: a.fx, targets: targets.map((x) => x.id) });
    if (P.id === 'plum_blossom') petalReady = true;
    if (a.kind === 'damage') for (const x of targets) damage(H, x, a.amount, { kind: 'spell', element: a.element });
    else if (a.kind === 'heal') heal(H, a.amount);
    else if (a.kind === 'shield') {
      const amt = Math.round(a.amount * H.shieldMult);
      H.shield = Math.max(H.shield, amt);
      emit({ type: 'shield', tgt: 'hero', amount: amt, shield: H.shield });
    }
  }

  const dt = COMBAT.dt;
  let enrageAnnounced = false;
  const enrageAfter = foes.some((f) => f.boss) ? COMBAT.bossEnrageAfter : COMBAT.enrageAfter;
  while (t < COMBAT.maxDuration) {
    t += dt;
    const enrageMult = t > enrageAfter ? 1 + COMBAT.enrageRate * (t - enrageAfter) : 1;
    if (enrageMult > 1 && !enrageAnnounced) {
      enrageAnnounced = true;
      for (const f of alive()) emit({ type: 'enrage', tgt: f.id, timeout: true });
    }

    // damage over time
    for (const u of [H, ...foes]) {
      if (u.hp <= 0 || !u.statuses.length) continue;
      for (const s of u.statuses) {
        s.tick -= dt;
        if (s.tick <= 0 && s.left > 0) {
          s.tick += COMBAT.burnTick;
          s.left -= COMBAT.burnTick;
          const src = s.src === 'hero' ? H : foes.find((f) => f.id === s.src);
          damage(src || null, u, s.dps * COMBAT.burnTick, { kind: 'dot', element: 'fire', canCrit: false });
        }
      }
      u.statuses = u.statuses.filter((s) => s.left > 0);
    }

    // hero side
    if (!openerDone && t >= 0.3 && front()) {
      openerDone = true; // Plum Blossom: sword-draw opener
      const target = front();
      emit({ type: 'cast', src: 'hero', ability: 'iaido', element: 'shadow', targets: [target.id] });
      damage(H, target, H.atk * P.openerMult, { kind: 'spell', element: 'shadow' });
    }
    if (H.hp > 0) {
      for (const a of H.abilities) {
        a.timer -= dt;
        if (a.timer <= 0 && alive().length) {
          a.timer += a.cdEff;
          castHero(a);
          if (H.echo && rng() < H.echo) castHero(a);
        }
      }
      if (ally && alive().length) {
        ally.timer -= dt;
        if (ally.timer <= 0) {
          ally.timer += ally.interval;
          const target = front();
          emit({ type: 'attack', src: 'ally', tgt: target.id });
          damage({ id: 'ally', side: 0, crit: 0.1, critDmg: 1.5 }, target, ally.dmg, { kind: 'spell', element: 'kin' });
        }
      }
      H.atkTimer -= dt;
      if (H.atkTimer <= 0 && alive().length) {
        H.atkTimer += 1 / H.aspd;
        heroAttack();
        if (H.doubleStrike && rng() < H.doubleStrike) heroAttack(!!H.doubleCrit);
      }
    }

    // enemy side
    for (const f of alive()) {
      if (H.hp <= 0) break;
      for (const a of f.abilities) {
        if (!a.cd) continue;
        a.timer -= dt;
        if (a.timer <= 0) {
          a.timer += a.cd;
          emit({ type: 'cast', src: f.id, ability: a.id, element: 'shadow', targets: a.kind === 'shield' ? [f.id] : ['hero'] });
          if (a.kind === 'nuke') damage(f, H, f.atk * enrageMult * a.mult, { kind: 'spell', element: 'shadow' });
          if (a.kind === 'shield') {
            f.shield = Math.max(f.shield, Math.round(f.atk * a.mult));
            emit({ type: 'shield', tgt: f.id, amount: f.shield, shield: f.shield });
          }
        }
      }
      f.atkTimer -= dt;
      if (f.atkTimer <= 0 && H.hp > 0) {
        f.atkTimer += 1 / f.aspd;
        emit({ type: 'attack', src: f.id, tgt: 'hero' });
        const atk = f.atk * enrageMult;
        const saved = f.atk;
        f.atk = atk;
        damage(f, H, atk);
        f.atk = saved;
      }
    }

    if (H.hp <= 0 || !alive().length) break;
  }
  const result = H.hp > 0 && !alive().length ? 'win' : 'lose';
  emit({ type: 'end', result });
  return { result, events, duration: r2(t), heroHp: Math.max(0, Math.round(H.hp)), kills, dealt: Math.round(dealt), taken: Math.round(taken), initial };
}
