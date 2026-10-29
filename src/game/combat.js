// Real-time combat engine. Pure logic: no DOM, no React.
//
//   const b = new Battle({ hero, heroHp, enemies, biome, floor, seed, runState });
//   each frame:  const events = b.step(dt);       // advance the simulation
//   player input: b.beginCast(slot) -> puzzle -> b.finishCast(slot, success) | b.cancelCast(slot)
//
// Spellcasting never pauses the simulation: the UI keeps calling step() while a puzzle is open.
// Items, synergies and hero passives are data with hook functions (see data/items.js); the
// engine fires triggers (onHit, onCrit, onDodge, onShieldBreak, onReaction, onCast, onKill, …)
// with a recursion depth limit and a per-step proc budget so chain reactions can't lock up.
import { COMBAT, SCALING, ACCOUNT_HP_PER_LEVEL, ACCOUNT_HP_CAP, COLLECTION_ATK_PER_ITEM } from './data/balance.js';
import { STATUSES, REACTIONS, STATUS_REACTIONS, TERRAIN_REACTIONS, AFFINITY, BOSS_MIN_AFFINITY } from './data/elements.js';
import { ITEMS } from './data/items.js';
import { SYNERGIES, activeSynergies } from './data/synergies.js';
import { SPELLS } from './data/spells.js';
import { ENEMIES } from './data/enemies.js';
import { BIOMES } from './data/biomes.js';
import { heroDef, DEFAULT_HERO, ITEM_ELEMENT } from './data/heroes.js';
import { registerSpellTags } from './data/items.js';

// cross-references filled at load time (avoids circular imports between data files)
registerSpellTags(SPELLS);
for (const [id, it] of Object.entries(ITEMS)) ITEM_ELEMENT[id] = it.element;

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

const STAT_KEYS = [
  'atk', 'atkPct', 'aspdPct', 'crit', 'critDmg', 'maxHp', 'maxHpPct', 'def', 'dodge', 'block', 'dr', 'lifesteal',
  'speedPct', 'spellPower', 'cdr', 'healMult', 'shieldMult', 'statusDur', 'pierce', 'bounce', 'split', 'dmgPct',
  'kbPct', 'kbRes', 'momentumAspd',
];
const MID = COMBAT.worldW / 2;
const reach = (r) => (r > 20 ? r * COMBAT.rangedReach : r);

/** Hero stats for a run: base + account bonus + passive item stats. */
export function buildHero({ heroId = DEFAULT_HERO, items = [], spells = null, accountLevel = 1 } = {}) {
  const def = heroDef(heroId);
  const s = { ...def.stats };
  for (const k of STAT_KEYS) s[k] = s[k] || 0;
  s.maxHp += Math.min(ACCOUNT_HP_CAP, (accountLevel - 1) * ACCOUNT_HP_PER_LEVEL);
  for (const id of items) {
    const it = ITEMS[id];
    if (!it?.stats) continue;
    for (const [k, v] of Object.entries(it.stats)) s[k] = (s[k] || 0) + v;
  }
  const synergies = activeSynergies(items, (spells || [def.signature]).filter(Boolean));
  for (const sid of synergies) for (const [k, v] of Object.entries(SYNERGIES[sid].stats || {})) s[k] = (s[k] || 0) + v;
  const maxHp = Math.max(30, Math.round(s.maxHp * (1 + s.maxHpPct)));
  return {
    heroId, hdef: def, items: [...items], synergies,
    spells: (spells || [def.signature]).filter(Boolean),
    maxHp,
    // every passive item adds a little basic-attack power, so big item collections carry runs
    // even for players who rarely cast (Basic Attack Specialist builds)
    atk: s.atk * (1 + s.atkPct + COLLECTION_ATK_PER_ITEM * items.length),
    def: s.def,
    aspd: s.aspd * (1 + s.aspdPct),
    crit: Math.min(0.8, s.crit),
    critDmg: s.critDmg,
    dodge: Math.min(COMBAT.maxDodge, s.dodge),
    block: Math.min(0.6, s.block),
    dr: Math.min(COMBAT.maxDr, s.dr),
    lifesteal: s.lifesteal,
    speed: COMBAT.heroSpeed * (1 + s.speedPct),
    spellPower: s.spellPower,
    cdr: Math.min(0.6, s.cdr),
    healMult: 1 + s.healMult,
    shieldMult: 1 + s.shieldMult,
    statusDur: 1 + s.statusDur,
    pierce: s.pierce, bounce: s.bounce, split: s.split,
    dmgPct: s.dmgPct,
    range: reach(def.attack.range),
    attackElement: def.attack.element,
    // knockback dealt by basic attacks (heavier weapons push further) and resistance to being pushed
    kb: (def.attack.kb ?? (def.attack.range <= 20 ? 3 : 1.5)) * (1 + s.kbPct),
    kbRes: Math.min(0.9, s.kbRes),
    momentumAspd: s.momentumAspd,
  };
}

export function scaleEnemy(id, floor, empower = 0) {
  const def = ENEMIES[id];
  const f = def.fixedStats ? 0 : Math.max(0, floor - 1);
  const st = def.stats;
  const aff = {};
  for (const [el, v] of Object.entries(def.affinity || {})) {
    let m = typeof v === 'number' ? v : AFFINITY[v];
    if (def.boss) m = Math.max(BOSS_MIN_AFFINITY, m);
    aff[el] = m;
  }
  return {
    enemyId: id, edef: def, name: def.name, py: def.py, sprite: def.sprite,
    boss: !!def.boss, elite: !!def.elite, flying: !!def.flying,
    maxHp: Math.round(st.maxHp * (1 + SCALING.hpPerFloor * f) * (def.boss ? SCALING.bossHp : SCALING.enemyHp)),
    atk: st.atk * (1 + SCALING.atkPerFloor * f) * (1 + empower) * (def.boss ? SCALING.bossAtk : SCALING.enemyAtk),
    def: (st.def || 0) + Math.floor(SCALING.defPerFloor * f),
    aspd: st.aspd, crit: st.crit || 0, critDmg: 1.5, dodge: st.dodge || 0, block: 0, dr: 0,
    lifesteal: st.drain || 0, range: reach(def.ai?.range ?? 9), speed: (def.ai?.speed ?? 11) * COMBAT.enemySpeedMult,
    attackElement: def.element || 'physical', affinity: aff,
    // knockback: bosses and big bodies resist it and hit harder; stance shapes positioning
    // (telegraphed charge attacks push 2.5× further: that's where bosses really shove the hero)
    kb: def.kb ?? (def.boss ? 3.2 : def.guardian ? 2.6 : (def.ai?.range ?? 9) > 20 ? 1 : 1.8),
    kbRes: def.kbRes ?? (def.boss ? 0.7 : def.guardian ? 0.5 : def.elite ? 0.3 : 0),
    stance: def.stance || 'normal',
  };
}

const r2 = (n) => Math.round(n * 100) / 100;

export class Battle {
  constructor({ hero, heroHp, enemies, biome = 'bamboo', floor = 1, seed = 1, empower = 0, runState = {}, extraTerrain = [] }) {
    this.rng = makeRng(seed);
    this.t = 0;
    this.events = [];
    this.floor = floor;
    this.biome = BIOMES[biome] || BIOMES.bamboo;
    this.runState = runState; // persists across battles (e.g. once-per-run items)
    this.flags = {}; // per-battle scratch space for items
    this.itemState = {};
    this.depth = 0;
    this.procs = 0;
    this.later = [];
    this.result = null;
    this.uid = 0;
    this.kills = 0;
    this.dealt = 0;
    this.taken = 0;
    this.casting = null; // slot index of an open puzzle
    this.castsThisBattle = 0;

    const H = {
      id: 'hero', side: 0, name: hero.hdef.en, sprite: hero.hdef.sprite, x: 22, vx: 0, hp: Math.min(heroHp ?? hero.maxHp, hero.maxHp),
      ...hero, statuses: {}, shield: 0, atkTimer: 0.5, alive: true, still: 0, buffs: [], attackCount: 0, immune: {},
    };
    this.hero = H;
    this.hooks = this.collectHooks(hero);
    this.spells = hero.spells.map((id, i) => ({
      slot: i, id, def: SPELLS[id], cdLeft: SPELLS[id] ? SPELLS[id].cd * 0.35 : 0,
      signature: Boolean(SPELLS[id]?.signature), state: 'cooldown', corrupted: false,
    }));

    this.units = [H];
    // both sides start the same distance from the midpoint
    enemies.forEach((id, i) => this.spawnEnemy(id, COMBAT.worldW - 22 + i * 8, empower));
    this.terrain = {};
    for (const tr of [...(this.biome.terrain || []), ...extraTerrain]) this.terrain[tr] = Infinity;
    this.biomeTimers = (this.biome.events || []).map((e) => ({ ...e, timer: e.every * 0.7 }));
    this.tickTimer = 1;
    this.terrainTick = 1;
    this.initial = {
      hero: { hp: H.hp, maxHp: H.maxHp, sprite: H.sprite },
      enemies: this.foes().map((f) => ({ id: f.id, enemyId: f.enemyId, sprite: f.sprite, hp: f.hp, maxHp: f.maxHp })),
    };
    this.emit({ type: 'start' });
    this.trigger('onBattleStart', {});
  }

  // ---------------------------------------------------------------- setup helpers
  collectHooks(hero) {
    const list = [];
    if (hero.hdef.passive?.hooks) list.push({ id: `passive:${hero.heroId}`, hooks: hero.hdef.passive.hooks, passive: true, src: hero.hdef.passive });
    for (const id of hero.items) if (ITEMS[id]?.hooks) list.push({ id, hooks: ITEMS[id].hooks, src: ITEMS[id] });
    for (const id of hero.synergies) if (SYNERGIES[id]?.hooks) list.push({ id: `syn:${id}`, hooks: SYNERGIES[id].hooks, src: SYNERGIES[id], synergy: true });
    return list;
  }

  spawnEnemy(id, x, empower = 0, extra = {}) {
    const s = scaleEnemy(id, this.floor, empower);
    const u = {
      id: `e${this.uid++}`, side: 1, ...s, ...extra, x: Math.min(COMBAT.worldW - 3, x), vx: 0, hp: s.maxHp, statuses: {}, shield: 0, alive: true,
      atkTimer: 0.8 + this.rng() * 0.6, buffs: [], immune: {},
      ai: { ...(s.edef.ai || {}) }, aiTimers: {}, phase: 0, charging: null, baseAffinity: { ...s.affinity },
    };
    for (const [k, v] of Object.entries(u.ai)) if (v && typeof v === 'object' && v.every) u.aiTimers[k] = v.every * (0.5 + this.rng() * 0.4);
    this.units.push(u);
    return u;
  }

  // ---------------------------------------------------------------- queries
  foes() {
    return this.units.filter((u) => u.side === 1 && u.alive);
  }
  allies() {
    return this.units.filter((u) => u.side === 0 && u.alive && u !== this.hero);
  }
  dist(a, b) {
    return Math.abs(a.x - b.x);
  }
  front() {
    let best = null;
    for (const f of this.foes()) if (!best || f.x < best.x) best = f;
    return best;
  }
  furthest() {
    let best = null;
    for (const f of this.foes()) if (!best || f.x > best.x) best = f;
    return best;
  }
  randomFoe(except = []) {
    const list = this.foes().filter((f) => !except.includes(f));
    return list.length ? list[Math.floor(this.rng() * list.length)] : null;
  }
  near(unit, radius) {
    return this.foes().filter((f) => f !== unit && Math.abs(f.x - unit.x) <= radius);
  }
  has(id) {
    return this.hero.items.includes(id) || this.hero.synergies.includes(id);
  }
  state(id) {
    if (!this.itemState[id]) this.itemState[id] = {};
    return this.itemState[id];
  }
  hasStatus(u, id) {
    return Boolean(u.statuses[id]);
  }
  hasTerrain(id) {
    return (this.terrain[id] || 0) > 0;
  }
  silenced() {
    return (this.hero.silencedUntil || 0) > this.t;
  }

  // ---------------------------------------------------------------- events & hooks
  emit(e) {
    this.events.push({ t: r2(this.t), ...e });
  }
  label(unit, text, kind = 'proc') {
    this.emit({ type: 'label', tgt: unit?.id || 'hero', text, kind });
  }

  trigger(name, payload = {}) {
    if (this.depth > COMBAT.maxHookDepth || this.procs > COMBAT.maxProcsPerStep) return payload;
    this.depth++;
    const silenced = this.silenced();
    for (const h of this.hooks) {
      const fn = h.hooks[name];
      if (!fn || (silenced && !h.passive)) continue;
      this.procs++;
      try {
        fn(this, payload, this.state(h.id));
      } catch (err) {
        // A broken item must never crash a battle.
        if (typeof console !== 'undefined') console.error(`hook ${h.id}.${name}`, err);
      }
    }
    this.depth--;
    return payload;
  }

  // ---------------------------------------------------------------- combat primitives
  /**
   * Central damage function. opts: { element, kind:'attack'|'spell'|'dot'|'proc'|'reaction'|'terrain'|'thorns',
   * canCrit, forceCrit, noReact, sub, label }
   */
  damage(src, tgt, amount, opts = {}) {
    if (!tgt || !tgt.alive || this.result) return 0;
    const element = opts.element || 'physical';
    const kind = opts.kind || 'proc';
    const H = this.hero;
    // evasion
    if (kind === 'attack') {
      let miss = 0;
      if (src?.statuses?.dazzle) miss += 0.35;
      if (this.hasTerrain('obscured')) miss += 0.15;
      if (this.rng() < miss) {
        this.emit({ type: 'miss', src: src?.id, tgt: tgt.id });
        return 0;
      }
      if (this.rng() < (tgt.dodge || 0) + this.buffSum(tgt, 'dodge')) {
        this.emit({ type: 'dodge', src: src?.id, tgt: tgt.id });
        // a dodge is a real hop backwards: no damage, but ground is given up
        this.knockback(tgt, COMBAT.dodgeHop, { hop: true });
        if (tgt === H) this.trigger('onDodge', { src, ranged: (src?.range || 0) > 20 });
        return 0;
      }
    }
    const ctx = { src, tgt, amount, element, kind, crit: false, mult: 1, sub: opts.sub, reaction: null };
    // crit
    const canCrit = opts.canCrit ?? (kind === 'attack' || kind === 'spell');
    if (canCrit && src && (opts.forceCrit || this.rng() < (src.crit || 0) + this.buffSum(src, 'crit'))) {
      ctx.crit = true;
      ctx.mult *= src.critDmg || 1.5;
    }
    // reactions (element vs target status)
    if (!opts.noReact && element !== 'physical') this.react(ctx);
    // generic modifiers
    if (src && src.dmgPct) ctx.mult *= 1 + src.dmgPct;
    if (src) ctx.mult *= 1 + this.buffSum(src, 'dmgPct');
    if (tgt.statuses.shock) ctx.mult *= 1.2;
    if (tgt.statuses.curse) ctx.mult *= 1.15;
    ctx.mult *= this.biome.elementMods?.[element] || 1;
    if (this.hasTerrain('corrupted') && element === 'dark') ctx.mult *= 1.3;
    if (this.hasTerrain('blessed') && element === 'light') ctx.mult *= 1.25;
    let eff = null;
    if (tgt.side === 1) {
      const a = tgt.affinity?.[element];
      if (a !== undefined) {
        ctx.mult *= a;
        eff = a > 1 ? 'weak' : a === 0 ? 'immune' : a < 1 ? 'resist' : null;
      }
    }
    if (src === H) this.trigger('modDamage', ctx);
    if (tgt === H) this.trigger('modIncoming', ctx);
    // block (hero)
    if (tgt === H && kind === 'attack' && this.rng() < (H.block || 0) + this.buffSum(H, 'block')) {
      ctx.mult *= 0.3;
      this.emit({ type: 'block', tgt: 'hero' });
      this.trigger('onBlock', { src });
    }
    // mitigation
    const def = Math.max(0, (tgt.def || 0) + this.buffSum(tgt, 'def'));
    const mitig = kind === 'dot' || kind === 'terrain' ? 1 : COMBAT.defenseK / (COMBAT.defenseK + def * 4);
    const dr = Math.min(COMBAT.maxDr, (tgt.dr || 0) + this.buffSum(tgt, 'dr'));
    let dmg = Math.round(amount * ctx.mult * mitig * (1 - dr));
    if (ctx.mult > 0) dmg = Math.max(1, dmg);
    let absorbed = 0;
    if (tgt.shield > 0 && dmg > 0) {
      absorbed = Math.min(tgt.shield, dmg);
      tgt.shield -= absorbed;
      dmg -= absorbed;
      if (tgt.shield <= 0) {
        tgt.shield = 0;
        this.emit({ type: 'shieldBreak', tgt: tgt.id });
        if (tgt === H) this.trigger('onShieldBreak', { absorbed });
      }
    }
    tgt.hp = Math.max(0, tgt.hp - dmg);
    tgt.lastElement = element;
    const total = dmg + absorbed;
    this.emit({
      type: 'hit', src: src?.id, tgt: tgt.id, amount: dmg, absorbed, crit: ctx.crit, element, kind, eff,
      reaction: ctx.reaction?.id, hp: tgt.hp, shield: tgt.shield,
    });
    if (src?.side === 0) this.dealt += total;
    // impact: basic attacks push by their weight (crits and heavy weapons push further)
    if (kind === 'attack' && total > 0 && src && !opts.sub && !opts.noKnock && tgt.alive) {
      this.knockback(tgt, (src.kb || 0) * (ctx.crit ? 1.5 : 1) * (opts.kbMult ?? 1), { src });
    }
    if (tgt === H) this.taken += total;
    // lifesteal / curse drain
    if (src && src.alive && kind !== 'dot' && total > 0) {
      const ls = (src.lifesteal || 0) + this.buffSum(src, 'lifesteal') + (tgt.statuses.curse && src.side === 0 ? 0.1 : 0);
      if (ls > 0) this.heal(src, total * ls, { silent: true });
    }
    // triggers
    if (src === H && total > 0) {
      if (kind === 'attack') this.trigger('onHit', { target: tgt, dealt: total, crit: ctx.crit, element, sub: opts.sub });
      if (ctx.crit && (kind === 'attack' || kind === 'spell')) this.trigger('onCrit', { target: tgt, dealt: total, kind });
      if (kind === 'spell') this.trigger('onSpellHit', { target: tgt, dealt: total, element });
    }
    if (tgt === H && total > 0) this.trigger('onDamaged', { src, dealt: total, kind });
    if (ctx.reaction) this.runReaction(ctx.reaction, ctx);
    // enemy reactive AI
    if (tgt.side === 1 && tgt.alive) this.enemyOnHit(tgt, kind);
    if (tgt.hp <= 0) this.kill(tgt, src);
    else if (tgt === H) this.checkLowHp();
    return total;
  }

  react(ctx) {
    const { tgt, element } = ctx;
    for (const r of REACTIONS) {
      if (r.element === element && tgt.statuses[r.has]) {
        ctx.mult *= r.mult;
        ctx.reaction = r;
        for (const c of r.consume) delete tgt.statuses[c];
        return;
      }
    }
  }

  runReaction(r, ctx) {
    const { tgt } = ctx;
    this.emit({ type: 'reaction', tgt: tgt.id, id: r.id, text: r.py });
    const H = this.hero;
    switch (r.id) {
      case 'conduct':
        for (const f of this.foes()) if (f !== tgt && f.statuses.wet) this.damage(ctx.src, f, ctx.amount * 0.5, { element: 'lightning', kind: 'reaction', noReact: true });
        break;
      case 'melt':
        this.applyStatus(tgt, 'wet', { src: ctx.src, noReact: true });
        break;
      case 'steam':
        this.applyStatus(tgt, 'dazzle', { src: ctx.src });
        break;
      case 'wildfire': {
        const b = tgt.statuses.burn;
        for (const f of this.foes()) if (f !== tgt) this.applyStatus(f, 'burn', { dps: b?.dps || 3, src: ctx.src });
        break;
      }
      case 'purge':
        this.heal(H, H.maxHp * 0.04);
        break;
      case 'plasma':
        for (const f of this.near(tgt, 18)) this.damage(ctx.src, f, ctx.amount * 0.4, { element: 'fire', kind: 'reaction', noReact: true });
        break;
      case 'eclipse':
        this.applyStatus(tgt, 'curse', { src: ctx.src });
        break;
      default:
    }
    if (ctx.src === H) this.trigger('onReaction', { target: tgt, reaction: r.id });
  }

  applyStatus(tgt, id, opts = {}) {
    if (!tgt || !tgt.alive || !STATUSES[id]) return false;
    const src = opts.src;
    let dur = opts.dur ?? STATUSES[id].dur;
    if (src === this.hero || src?.side === 0) dur *= this.hero.statusDur || 1;
    if ((id === 'frozen' || id === 'stun') && tgt.boss) dur *= 0.5;
    if ((tgt.immune[id] || 0) > this.t) return false;
    // status reactions (e.g. chill on wet -> freeze)
    if (!opts.noReact) {
      for (const r of STATUS_REACTIONS) {
        if (r.apply === id && tgt.statuses[r.has]) {
          for (const c of r.consume) delete tgt.statuses[c];
          this.emit({ type: 'reaction', tgt: tgt.id, id: r.id, text: r.py });
          if (r.result) return this.applyStatus(tgt, r.result, { ...opts, dur: undefined, noReact: true });
          return false;
        }
      }
    }
    const isNew = !tgt.statuses[id];
    const cur = tgt.statuses[id] || {};
    tgt.statuses[id] = { left: Math.max(cur.left || 0, dur), dps: Math.max(cur.dps || 0, opts.dps || 0), tick: cur.tick ?? 0.5, src: src?.id || cur.src };
    if (id === 'frozen' || id === 'stun') {
      if (tgt.charging) {
        tgt.charging = null;
        this.label(tgt, 'Interrupted!', 'good');
      }
    }
    this.emit({ type: 'status', tgt: tgt.id, status: id, isNew });
    if ((src === this.hero || src?.side === 0) && tgt.side === 1) this.trigger('onStatus', { target: tgt, id, isNew });
    return true;
  }

  heal(unit, amount, opts = {}) {
    if (!unit?.alive) return 0;
    let mult = unit === this.hero ? this.hero.healMult : 1;
    if (this.hasTerrain('corrupted')) mult *= 0.6;
    if (this.hasTerrain('blessed')) mult *= 1.25;
    const payload = { amount: amount * mult, mult: 1 };
    if (unit === this.hero) this.trigger('modHeal', payload);
    const want = payload.amount * payload.mult;
    const amt = Math.round(Math.min(unit.maxHp - unit.hp, want));
    const overflow = Math.max(0, want - Math.max(0, amt));
    if (amt > 0) {
      unit.hp += amt;
      if (!opts.silent || amt >= 3) this.emit({ type: 'heal', tgt: unit.id, amount: amt, hp: unit.hp });
    }
    if (unit === this.hero && (amt > 0 || overflow > 0)) this.trigger('onHeal', { amount: Math.max(0, amt), overflow });
    return amt;
  }

  addShield(unit, amount) {
    const mult = unit === this.hero ? this.hero.shieldMult : 1;
    const amt = Math.round(amount * mult);
    unit.shield = Math.min(unit.maxHp * 1.5, unit.shield + amt);
    this.emit({ type: 'shield', tgt: unit.id, amount: amt, shield: unit.shield });
    return amt;
  }

  /**
   * Physical knockback: the unit slides `d` units away from the other side over ~0.3s (resisted by
   * kbRes), then needs a short recovery before moving or attacking. `pull` drags it the other way.
   * Returns the distance actually applied.
   */
  knockback(unit, d, { src = null, pull = false, hop = false } = {}) {
    if (!unit?.alive || !(d > 0)) return 0;
    let dist = d;
    if (!hop) {
      const res = Math.min(0.9, (unit.kbRes || 0) + this.buffSum(unit, 'kbRes'));
      dist *= 1 - res;
      if (unit === this.hero) dist = this.trigger('modKnockback', { dist, src, pull }).dist;
      if (src === this.hero && unit.side === 1) dist = this.trigger('modKnockOut', { dist, target: unit, pull }).dist;
    }
    if (dist < 0.4) return 0;
    const dir = (unit.side === 1 ? 1 : -1) * (pull ? -1 : 1);
    // initial speed chosen so the slide covers exactly `dist` with the fixed-step decay
    const k = 1 - Math.exp(-COMBAT.kbDecay * COMBAT.dt);
    unit.vx = (unit.vx || 0) + (dir * dist * k) / COMBAT.dt;
    unit.hopping = hop;
    // light taps only nudge; real pushes (3+) interrupt movement and attacks until recovered
    unit.kbHeavy = !hop && (unit.kbHeavy || dist >= COMBAT.heavyKb);
    if (unit.charging && dist >= 6 && !hop) unit.charging.left += 0.4;
    this.emit({ type: hop ? 'hop' : 'knock', tgt: unit.id, d: r2(dist), pull });
    if (!hop && src === this.hero && unit.side === 1) this.trigger('onKnockback', { target: unit, dist, pull });
    if (!hop && unit === this.hero) this.trigger('onKnocked', { dist, src });
    return dist;
  }
  pull(unit, d, opts = {}) {
    return this.knockback(unit, d, { ...opts, pull: true });
  }
  /** The midpoint between the Hero Zone (left) and the Enemy Zone (right). */
  get mid() {
    return MID;
  }
  /** Sliding from a knockback or dodge, or recovering from one: no moving or attacking. */
  staggered(u) {
    return (Boolean(u.vx) && (u.kbHeavy || u.hopping)) || (u.recover || 0) > 0;
  }
  /** True while the unit stands in the opposing team's half (with hysteresis). */
  inOwnZone(u) {
    return u.side === 0 ? u.x < MID : u.x > MID;
  }
  attackSpeed(u) {
    const momentum = u.momentum ? COMBAT.momentumAspd + (u.momentumAspd || 0) : 0;
    return u.aspd * (1 + this.buffSum(u, 'aspdPct') + momentum) * (u.statuses.chill ? 0.65 : 1);
  }

  /** Knockback slides, recovery, overlap and bounds; runs every tick before movement AI. */
  physics(dt) {
    const H = this.hero;
    const W = COMBAT.worldW;
    const decay = Math.exp(-COMBAT.kbDecay * dt);
    for (const u of this.units) {
      if (!u.alive) continue;
      if (u.recover > 0) u.recover = Math.max(0, u.recover - dt);
      if (!u.vx) continue;
      u.x += u.vx * dt;
      u.vx *= decay;
      let stop = Math.abs(u.vx) < 1.2;
      // pulled enemies stop in front of the hero; nothing leaves the arena
      if (u.side === 1 && u.x < H.x + 5) {
        u.x = H.x + 5;
        stop = true;
      }
      if (u.x < 2 || u.x > W - 2) {
        u.x = Math.max(2, Math.min(W - 2, u.x));
        stop = true;
      }
      if (stop) {
        u.vx = 0;
        if (u.kbHeavy) {
          u.recover = COMBAT.kbRecover;
          if (u === H) this.trigger('onRecover', {});
        }
        u.kbHeavy = false;
        this.emit({ type: 'land', tgt: u.id, hop: !!u.hopping });
        u.hopping = false;
      }
    }
    this.separate();
  }
  /** Ground enemies keep a body-width apart (a knocked enemy shoves the one behind it). */
  separate() {
    const W = COMBAT.worldW;
    const ground = this.foes()
      .filter((f) => !f.flying)
      .sort((a, b) => a.x - b.x);
    for (let i = 1; i < ground.length; i++) {
      const min = ground[i - 1].x + COMBAT.minGap;
      if (ground[i].x < min) ground[i].x = min;
    }
    // squeezed against the right wall: shift the line back left instead
    for (let i = ground.length - 1; i >= 0; i--) {
      const max = i === ground.length - 1 ? W - 2 : ground[i + 1].x - COMBAT.minGap;
      if (ground[i].x > max) ground[i].x = max;
    }
  }

  /** Momentum: in the opposing half → attack speed. A small buffer stops flicker on the line. */
  updateMomentum() {
    const b = COMBAT.zoneBuffer;
    for (const u of this.units) {
      if (!u.alive || (u.side === 0 && u !== this.hero)) continue;
      const deep = u.side === 0 ? u.x - MID : MID - u.x; // >0 = inside the opposing half
      const on = u.momentum ? deep > -b : deep > b;
      if (on === !!u.momentum) continue;
      u.momentum = on;
      this.emit({ type: 'momentum', tgt: u.id, on });
      if (u === this.hero) this.trigger('onMomentum', { on });
    }
  }

  addBuff(unit, buff) {
    unit.buffs = unit.buffs.filter((b) => b.id !== buff.id);
    unit.buffs.push({ ...buff, until: this.t + buff.dur });
    this.emit({ type: 'buff', tgt: unit.id, id: buff.id });
  }
  buffSum(unit, key) {
    let s = 0;
    for (const b of unit.buffs || []) if (b.until > this.t && b.stats?.[key]) s += b.stats[key];
    return s;
  }

  setTerrain(id, dur) {
    const cur = this.terrain[id] || 0;
    if (cur === Infinity) return;
    this.terrain[id] = Math.max(cur, dur);
    this.emit({ type: 'terrain', id, on: true });
  }
  clearTerrain(id) {
    if (this.terrain[id]) {
      delete this.terrain[id];
      this.emit({ type: 'terrain', id, on: false });
    }
  }
  /** An element touching the battlefield can change terrain (melt ice, electrify water, …). */
  terrainElement(element) {
    for (const r of TERRAIN_REACTIONS) {
      if (r.element === element && this.hasTerrain(r.has)) {
        if (r.remove) this.clearTerrain(r.remove);
        if (r.add) this.setTerrain(r.add, r.dur);
        this.emit({ type: 'label', tgt: 'field', text: r.label, kind: 'terrain' });
        return;
      }
    }
  }

  spawnAlly(spec) {
    const u = {
      id: `a${this.uid++}`, side: 0, alive: true, statuses: {}, shield: 0, buffs: [], immune: {}, crit: 0.1, critDmg: 1.5,
      def: 0, dodge: 0, maxHp: 1, hp: 1, x: this.hero.x - 6, ...spec, timer: 0.3,
    };
    this.units.push(u);
    this.emit({ type: 'spawn', unit: { id: u.id, sprite: u.sprite, x: u.x, ally: true, hp: 1, maxHp: 1 } });
    return u;
  }

  schedule(delay, fn) {
    this.later.push({ at: this.t + delay, fn });
  }

  kill(u, src) {
    if (!u.alive) return;
    // undead get back up once unless burned or finished with fire/light
    const rise = u.side === 1 && u.edef?.ai?.rise;
    if (rise && !u.risen && !u.statuses.burn && u.lastElement !== 'fire' && u.lastElement !== 'light') {
      u.risen = true;
      u.hp = Math.round(u.maxHp * rise.pct);
      u.statuses = {};
      this.emit({ type: 'revive', tgt: u.id, hp: u.hp });
      this.label(u, rise.text, 'enemy');
      return;
    }
    u.alive = false;
    const statuses = { ...u.statuses };
    this.emit({ type: 'death', tgt: u.id });
    if (u === this.hero) {
      const save = this.trigger('onFatal', { prevented: false });
      if (save.prevented) {
        u.alive = true;
        this.emit({ type: 'revive', tgt: 'hero', hp: u.hp });
        return;
      }
      this.finish('lose');
      return;
    }
    if (u.side === 1) {
      this.kills++;
      this.trigger('onKill', { target: u, statuses, src });
      if (!this.foes().length) this.finish('win');
    }
  }

  checkLowHp() {
    const H = this.hero;
    if (!H.lowFired && H.hp < H.maxHp * 0.5) {
      H.lowFired = true;
      this.trigger('onLowHp', {});
    }
  }

  finish(result) {
    if (this.result) return;
    this.result = result;
    if (this.casting !== null) this.casting = null;
    this.emit({ type: 'end', result });
  }

  // ---------------------------------------------------------------- hero basic attack
  heroAttack() {
    const H = this.hero;
    const target = H.randomTarget ? this.randomFoe() : this.front();
    if (!target) return;
    H.attackCount += 1;
    const payload = { target, count: H.attackCount, mult: 1, extra: [], element: H.attackElement, kbMult: 1 };
    this.trigger('onAttack', payload);
    const hits = [{ t: payload.target, mult: payload.mult, primary: true }];
    // pierce: also hit the next enemies behind the target
    if (H.pierce > 0) {
      const behind = this.foes().filter((f) => f.x > payload.target.x).sort((a, b) => a.x - b.x).slice(0, H.pierce);
      for (const f of behind) hits.push({ t: f, mult: payload.mult * 0.8 });
    }
    // bounce: jump to other random enemies
    for (let i = 0; i < H.bounce; i++) {
      const f = this.randomFoe(hits.map((h) => h.t));
      if (f) hits.push({ t: f, mult: payload.mult * 0.7 });
    }
    for (const e of payload.extra) if (e.target?.alive) hits.push({ t: e.target, mult: e.mult, extra: true });
    this.emit({ type: 'attack', src: 'hero', tgt: payload.target.id });
    for (const h of hits) {
      if (!h.t.alive) continue;
      this.emit({ type: 'shot', src: 'hero', tgt: h.t.id, element: payload.element });
      const dealt = this.damage(H, h.t, H.atk * h.mult, { element: payload.element, kind: 'attack', sub: !h.primary, kbMult: h.primary ? payload.kbMult : 1 });
      if (dealt > 0 && H.split > 0 && h.primary) {
        for (let i = 0; i < H.split; i++) {
          const f = this.randomFoe([h.t]);
          if (f) {
            this.emit({ type: 'shot', src: h.t.id, tgt: f.id, element: payload.element, small: true });
            this.damage(H, f, H.atk * 0.35, { element: payload.element, kind: 'attack', sub: true, canCrit: false });
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------- spellcasting (player input)
  canCast(slot) {
    const s = this.spells[slot];
    return Boolean(s && !this.result && this.casting === null && s.state === 'ready');
  }
  beginCast(slot) {
    if (!this.canCast(slot)) return false;
    this.casting = slot;
    this.spells[slot].state = 'casting';
    return true;
  }
  cancelCast(slot) {
    const s = this.spells[slot];
    if (s && s.state === 'casting') s.state = 'ready';
    if (this.casting === slot) this.casting = null;
  }
  /** Returns { ok, retry } — retry is true when an item granted a free second attempt. */
  finishCast(slot, success) {
    const s = this.spells[slot];
    if (!s || this.casting !== slot) return { ok: false };
    this.casting = null;
    if (this.result) {
      s.state = 'ready';
      return { ok: false };
    }
    if (!success) {
      const p = this.trigger('onCastFail', { spell: s.id, retry: false });
      this.emit({ type: 'fizzle', slot, spell: s.id });
      if (p.retry) {
        s.state = 'ready';
        return { ok: false, retry: true };
      }
      this.startCooldown(s);
      return { ok: false };
    }
    this.castsThisBattle += 1;
    const ctx = { spell: s.id, slot, power: 1 + (this.hero.spellPower || 0), element: s.def.element, first: this.castsThisBattle === 1, echo: false };
    if (s.corrupted) ctx.power *= 0.7;
    this.trigger('modSpellPower', ctx);
    this.castEffect(s.id, ctx);
    this.trigger('onCast', ctx);
    this.startCooldown(s);
    this.settle();
    return { ok: true };
  }
  /** Runs a spell's effect (also used by echo/repeat items). */
  castEffect(id, ctx) {
    const def = SPELLS[id];
    if (!def || this.result) return;
    this.emit({ type: 'cast', spell: id, element: ctx.element || def.element, echo: !!ctx.echo, power: r2(ctx.power) });
    def.cast(this, { ...ctx, element: ctx.element || def.element });
    this.terrainElement(ctx.element || def.element);
  }
  startCooldown(s) {
    s.state = 'cooldown';
    s.cdLeft = s.def.cd * (1 - (this.hero.cdr || 0)) * (s.corrupted ? 1.5 : 1);
  }
  reduceCooldowns(sec, exceptSlot = -1) {
    for (const s of this.spells) if (s.slot !== exceptSlot && s.state === 'cooldown') s.cdLeft = Math.max(0, s.cdLeft - sec);
  }
  resetCooldowns() {
    for (const s of this.spells) if (s.state === 'cooldown') s.cdLeft = 0;
  }

  // ---------------------------------------------------------------- enemy AI
  enemyOnHit(u, kind) {
    if (kind === 'spell' && u.ai.onSpellHit && !u.reactedAt) {
      u.reactedAt = this.t;
      if (u.ai.onSpellHit === 'shield') this.addShield(u, u.maxHp * 0.15);
      if (u.ai.onSpellHit === 'enrage') this.addBuff(u, { id: 'rage', dur: 5, stats: { dmgPct: 0.3 } });
      this.label(u, u.ai.onSpellHit === 'shield' ? 'Guards!' : 'Enraged!', 'enemy');
      this.schedule(6, () => (u.reactedAt = null));
    }
    // boss phases
    const phases = u.edef.phases;
    if (phases) {
      while (u.phase < phases.length && u.hp / u.maxHp <= phases[u.phase].at) {
        const ph = phases[u.phase];
        u.phase += 1;
        this.emit({ type: 'phase', tgt: u.id, phase: u.phase, text: ph.text });
        if (ph.ai) Object.assign(u.ai, ph.ai);
        for (const [k, v] of Object.entries(ph.ai || {})) if (v && typeof v === 'object' && v.every) u.aiTimers[k] = 1;
        if (ph.aspd) u.aspd *= ph.aspd;
        if (ph.terrain) for (const tr of ph.terrain) this.setTerrain(tr, 20);
        if (ph.shield) this.addShield(u, u.maxHp * ph.shield);
        if (ph.summon) for (let i = 0; i < ph.summon.count; i++) this.summon(u, ph.summon.id);
      }
    }
  }

  summon(u, id) {
    if (this.foes().length >= 5) return;
    const m = this.spawnEnemy(id, u.x + 4 + this.rng() * 8);
    if (id === 'wraith') {
      const words = this.runState.wraithWords || [];
      m.label = words.length ? words[Math.floor(this.rng() * words.length)] : null;
    }
    this.emit({ type: 'spawn', unit: { id: m.id, enemyId: m.enemyId, sprite: m.sprite, x: m.x, hp: m.hp, maxHp: m.maxHp, label: m.label } });
  }

  enemyAi(u, dt) {
    const H = this.hero;
    for (const [key, timer] of Object.entries(u.aiTimers)) {
      const cfg = u.ai[key];
      if (!cfg) continue;
      u.aiTimers[key] = timer - dt;
      if (u.aiTimers[key] > 0) continue;
      u.aiTimers[key] = cfg.every;
      switch (key) {
        case 'charge':
          if (!u.charging && this.dist(u, H) <= u.range + 4) {
            u.charging = { left: cfg.windup, mult: cfg.mult, element: cfg.element || u.attackElement };
            this.emit({ type: 'telegraph', src: u.id, windup: cfg.windup, text: cfg.text || 'Charging!' });
          } else if (!u.charging) u.aiTimers[key] = 0.5; // out of reach: try again as soon as it closes in
          break;
        case 'summon':
          for (let i = 0; i < (cfg.count || 1); i++) this.summon(u, cfg.id);
          break;
        case 'guard': {
          const ally = this.foes().filter((f) => f !== u).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || u;
          this.addShield(ally, u.maxHp * cfg.amount);
          this.label(ally, 'Shielded', 'enemy');
          break;
        }
        case 'hex':
          this.emit({ type: 'cast', src: u.id, spell: 'hex', element: STATUSES[cfg.status].element, enemy: true });
          this.applyStatus(H, cfg.status, { src: u, dur: cfg.dur });
          if (cfg.dmg) this.damage(u, H, u.atk * cfg.dmg, { element: STATUSES[cfg.status].element, kind: 'spell' });
          break;
        case 'shift': {
          const els = ['fire', 'ice', 'water', 'earth', 'lightning', 'wind', 'dark', 'light'];
          const resist = els[Math.floor(this.rng() * els.length)];
          const weak = els.filter((e) => e !== resist)[Math.floor(this.rng() * 7)];
          u.affinity = { ...u.baseAffinity, [resist]: u.boss ? 0.6 : 0.4, [weak]: 1.6 };
          this.emit({ type: 'affinity', tgt: u.id, resist, weak });
          break;
        }
        case 'flip':
          u.affinity = Object.fromEntries(Object.entries(u.baseAffinity).map(([k, v]) => [k, v > 1 ? 0.7 : v < 1 ? 1.4 : v]));
          u.baseAffinity = { ...u.affinity };
          this.emit({ type: 'affinity', tgt: u.id, flipped: true });
          this.label(u, 'Meanings reversed!', 'enemy');
          break;
        case 'silence':
          H.silencedUntil = this.t + cfg.dur;
          this.emit({ type: 'silence', dur: cfg.dur });
          this.label(H, 'Passives silenced', 'enemy');
          break;
        case 'hazard':
          this.setTerrain(cfg.terrain, cfg.dur);
          break;
        case 'shell':
          this.addBuff(u, { id: 'shell', dur: cfg.dur, stats: { dr: cfg.dr } });
          this.label(u, 'Shell up', 'enemy');
          break;
        case 'corrupt': {
          const pool = this.spells.filter((s) => !s.corrupted);
          if (pool.length) {
            const s = pool[Math.floor(this.rng() * pool.length)];
            s.corrupted = true;
            this.emit({ type: 'corrupt', slot: s.slot });
            this.label(H, 'A spell was corrupted', 'enemy');
          }
          break;
        }
        case 'devour':
          if (H.shield > 0) {
            const amt = H.shield;
            H.shield = 0;
            this.emit({ type: 'shieldBreak', tgt: 'hero' });
            this.heal(u, amt);
            this.label(u, 'Devoured your shield', 'enemy');
          }
          break;
        case 'regen':
          if (!cfg.terrain || this.hasTerrain(cfg.terrain)) this.heal(u, u.maxHp * cfg.pct);
          break;
        case 'nuke':
          this.emit({ type: 'cast', src: u.id, spell: cfg.id || 'nuke', element: cfg.element || 'dark', enemy: true });
          this.damage(u, H, u.atk * cfg.mult, { element: cfg.element || 'dark', kind: 'spell' });
          if (cfg.status) this.applyStatus(H, cfg.status, { src: u });
          break;
        default:
      }
    }
  }

  // ---------------------------------------------------------------- main loop
  /** Advances the simulation by dt seconds and returns every event emitted since the last call
   *  (including events from casts/input that happened between steps). */
  step(dt) {
    this.advance(dt);
    return this.drain();
  }

  /**
   * Events emitted since the last call. Player actions (finishCast, skip) emit outside `step`,
   * e.g. a spell that kills the last enemy, so the UI must drain every frame, not only after a step.
   */
  drain() {
    const out = this.events;
    this.events = [];
    return out;
  }

  /**
   * Safety net run after every tick: a unit at 0 HP is always killed, and an empty enemy side
   * always wins. Guarantees no battle can sit "finished but unresolved".
   */
  settle() {
    if (this.result) return;
    for (const u of this.units) if (u.alive && u.hp <= 0) this.kill(u, null);
    if (this.result) return;
    if (!this.hero.alive) this.finish('lose');
    else if (!this.foes().length) this.finish('win');
  }

  advance(dt) {
    if (this.result) return;
    this.procs = 0;
    this.t += dt;
    const H = this.hero;

    // scheduled effects
    if (this.later.length) {
      const due = this.later.filter((l) => l.at <= this.t);
      this.later = this.later.filter((l) => l.at > this.t);
      for (const l of due) l.fn();
    }

    // terrain timers
    for (const [k, v] of Object.entries(this.terrain)) {
      if (v === Infinity) continue;
      this.terrain[k] = v - dt;
      if (this.terrain[k] <= 0) this.clearTerrain(k);
    }
    this.terrainTick -= dt;
    if (this.terrainTick <= 0) {
      this.terrainTick += 1;
      this.terrainPulse();
    }
    // biome events
    for (const ev of this.biomeTimers) {
      ev.timer -= dt;
      if (ev.timer <= 0) {
        ev.timer += ev.every;
        this.biomeEvent(ev);
      }
    }

    // statuses
    for (const u of this.units) {
      if (!u.alive) continue;
      for (const [id, s] of Object.entries(u.statuses)) {
        s.left -= dt;
        if (id === 'burn' && s.dps > 0) {
          s.tick -= dt;
          if (s.tick <= 0) {
            s.tick += 0.5;
            const src = this.units.find((x) => x.id === s.src) || null;
            this.damage(src, u, s.dps * 0.5, { element: 'fire', kind: 'dot', noReact: true });
          }
        }
        if (s.left <= 0) {
          delete u.statuses[id];
          if (id === 'frozen') u.immune.frozen = this.t + (u.boss ? 4 : 1.5);
          if (id === 'stun') u.immune.stun = this.t + (u.boss ? 3 : 0.5);
          this.emit({ type: 'statusEnd', tgt: u.id, status: id });
        }
      }
    }
    if (this.result) return;

    // per-second hooks
    this.tickTimer -= dt;
    if (this.tickTimer <= 0) {
      this.tickTimer += 1;
      this.trigger('onTick', {});
    }

    // spells cooldowns (an open puzzle doesn't stop other spells from recharging)
    for (const s of this.spells) {
      if (s.state === 'cooldown') {
        s.cdLeft -= dt;
        if (s.cdLeft <= 0) {
          s.cdLeft = 0;
          s.state = 'ready';
          this.emit({ type: 'spellReady', slot: s.slot });
        }
      }
    }

    // knockback slides, recovery and spacing (fixed-step, so identical at any frame rate)
    this.physics(dt);

    // hero
    if (H.alive && !this.disabled(H)) {
      const target = this.front();
      if (target && this.staggered(H)) {
        // the swing timer keeps counting, so the hero strikes right after recovering
        H.still = 0;
        H.atkTimer = Math.max(0, H.atkTimer - dt);
      } else if (target) {
        const d = target.x - H.x;
        const slow = this.moveSlow(H);
        const melee = H.range <= 20;
        // Heroes press to a line just past the midpoint (Momentum) or chase into attack range,
        // whichever is further forward, and step back up to it after being pushed, stopping at
        // body contact. Ranged heroes only back off when an enemy is right on top of them (never
        // past their rear line). Hysteresis (start beyond a margin, stop on arrival) avoids jitter.
        const tx = Math.min(Math.max(target.x - H.range * (melee ? 0.85 : 0.8), MID + 4), target.x - 9.5);
        const err = tx - H.x;
        let move = 0;
        if (err > (H.moving ? 0.2 : 1.5)) move = Math.min(H.speed * slow * dt, err);
        else if (!melee && d < 6 && H.x > COMBAT.worldW * 0.2) move = -H.speed * 0.5 * slow * dt;
        H.moving = Boolean(move);
        if (move) {
          H.x = Math.max(3, Math.min(COMBAT.worldW - 10, H.x + move));
          H.still = 0;
          H.moved = (H.moved || 0) + Math.abs(move);
          if (H.moved >= 4) {
            H.moved -= 4;
            this.trigger('onMove', { x: H.x });
          }
        } else H.still += dt;
        H.atkTimer -= dt;
        if (H.atkTimer <= 0 && d <= H.range + 1) {
          H.atkTimer += 1 / Math.max(0.2, this.attackSpeed(H));
          this.heroAttack();
        } else if (H.atkTimer < 0) H.atkTimer = 0;
      }
    }

    // allies (illusions, summons)
    for (const a of this.allies()) {
      a.ttl -= dt;
      if (a.ttl <= 0) {
        a.alive = false;
        this.emit({ type: 'death', tgt: a.id, ally: true });
        continue;
      }
      a.timer -= dt;
      const target = this.front();
      if (a.timer <= 0 && target) {
        a.timer += a.interval;
        this.emit({ type: 'shot', src: a.id, tgt: target.id, element: a.element || 'physical' });
        this.damage({ ...a, side: 0 }, target, a.dmg, { element: a.element || 'physical', kind: 'proc', canCrit: false });
        if (a.statusOnHit) this.applyStatus(target, a.statusOnHit, { src: H });
      }
    }

    // enemies (ground enemies queue up at least a body-width apart; flyers hover freely)
    let lastGroundX = -Infinity;
    for (const u of this.foes().sort((a, b) => a.x - b.x)) {
      if (this.result) break;
      this.enemyAi(u, dt);
      if (this.disabled(u) || this.staggered(u)) {
        if (!u.flying) lastGroundX = u.x;
        if (!this.disabled(u)) u.atkTimer = Math.max(0, u.atkTimer - dt);
        continue;
      }
      // charging attack
      if (u.charging) {
        u.charging.left -= dt;
        if (u.charging.left <= 0) {
          const c = u.charging;
          u.charging = null;
          this.emit({ type: 'attack', src: u.id, tgt: 'hero', big: true });
          this.damage(u, H, u.atk * c.mult, { element: c.element, kind: 'attack', kbMult: 2.5 });
        }
        continue;
      }
      let want = u.flying ? H.x + u.range : Math.max(H.x + u.range, lastGroundX + 15);
      const gap = want - (H.x + u.range); // queued enemies can still reach (spears, reach)
      // stance: defensive shooters hold their own half when they can still reach the hero from it;
      // aggressive shooters press into the hero's half to gain Momentum
      if (u.range > 20 && u.stance === 'defensive' && want < MID + 3 && MID + 3 - H.x <= u.range) want = MID + 3;
      if (u.range > 20 && u.stance === 'aggressive') want = Math.max(H.x + 12, Math.min(want, MID - 8));
      const spd = u.speed * this.moveSlow(u) * (u.stance === 'aggressive' ? 1.2 : 1) * dt;
      if (u.x > want + (u.moving ? 0.2 : 1)) {
        u.x = Math.max(want, u.x - spd);
        u.moving = true;
      } else if (u.range > 20 && u.x < want - 8 && u.x < COMBAT.worldW - 4) {
        u.x = Math.min(want, u.x + spd * 0.6); // shooters back away from a hero that got too close
        u.moving = true;
      } else u.moving = false;
      if (!u.flying) lastGroundX = u.x;
      u.atkTimer -= dt;
      if (u.atkTimer <= 0 && this.dist(u, H) <= u.range + gap + 1) {
        u.atkTimer += 1 / this.attackSpeed(u);
        this.emit({ type: 'attack', src: u.id, tgt: 'hero' });
        if (u.range > 20) this.emit({ type: 'shot', src: u.id, tgt: 'hero', element: u.attackElement });
        // reflective temple surfaces bounce some projectiles back
        if (u.range > 20 && this.biome.reflect && this.rng() < this.biome.reflect) {
          this.label(u, 'Reflected!', 'good');
          this.damage(H, u, u.atk * 1.2, { element: 'light', kind: 'proc' });
          continue;
        }
        this.damage(u, H, u.atk, { element: u.attackElement, kind: 'attack' });
        if (u.edef.onHitStatus && H.alive) this.applyStatus(H, u.edef.onHitStatus.id, { src: u, dur: u.edef.onHitStatus.dur, dps: u.edef.onHitStatus.dps });
      } else if (u.atkTimer < 0) u.atkTimer = 0;
    }

    this.separate();
    this.updateMomentum();
    this.settle();
    if (!this.result && this.t > COMBAT.maxDuration) this.finish('lose');
  }

  disabled(u) {
    return Boolean(u.statuses.frozen || u.statuses.stun);
  }
  moveSlow(u) {
    let m = u.statuses.chill ? 0.65 : 1;
    if (!u.flying && this.hasTerrain('frozen')) m *= 0.75;
    if (u === this.hero) m *= 1 + this.buffSum(u, 'speedPct');
    return m;
  }

  terrainPulse() {
    const H = this.hero;
    const grounded = this.units.filter((u) => u.alive && !u.flying);
    if (this.hasTerrain('wet')) for (const u of grounded) this.applyStatus(u, 'wet', { dur: 2, noReact: u.statuses.burn ? false : true });
    if (this.hasTerrain('frozen') && Math.floor(this.t) % 3 === 0) for (const u of grounded) this.applyStatus(u, 'chill', { dur: 1.5 });
    if (this.hasTerrain('burning')) for (const u of grounded) if (u.side === 1) this.applyStatus(u, 'burn', { dps: 3, dur: 2, src: H });
    if (this.hasTerrain('electrified') && Math.floor(this.t) % 2 === 0) {
      for (const u of grounded) {
        this.damage(null, u, u.maxHp * (u === H ? 0.015 : 0.03), { element: 'lightning', kind: 'terrain', noReact: true });
        this.applyStatus(u, 'shock', { dur: 2 });
      }
    }
    if (this.hasTerrain('unstable') && Math.floor(this.t) % 4 === 0) {
      const all = this.units.filter((u) => u.alive && !u.flying);
      const u = all[Math.floor(this.rng() * all.length)];
      if (u) {
        this.applyStatus(u, 'stun', { dur: 0.7 });
        this.label(u, 'Tremor', 'terrain');
      }
    }
  }

  biomeEvent(ev) {
    const H = this.hero;
    switch (ev.kind) {
      case 'wave':
        this.emit({ type: 'biome', kind: 'wave', text: ev.text });
        for (const u of this.units) if (u.alive && !u.flying) this.applyStatus(u, 'wet', { dur: 4 });
        this.terrainElement('water');
        break;
      case 'lightning': {
        const pool = this.units.filter((u) => u.alive);
        const u = this.rng() < 0.65 ? this.randomFoe() : H;
        const target = u || pool[0];
        if (!target) break;
        this.emit({ type: 'biome', kind: 'lightning', tgt: target.id, text: ev.text });
        this.damage(null, target, target.maxHp * (target === H ? 0.04 : 0.07), { element: 'lightning', kind: 'terrain' });
        this.applyStatus(target, 'shock', { dur: 3 });
        this.terrainElement('lightning');
        break;
      }
      case 'gust':
        this.emit({ type: 'biome', kind: 'gust', text: ev.text });
        for (const f of this.foes()) {
          this.knockback(f, 6);
          if (f.statuses.burn) for (const g of this.near(f, 15)) this.applyStatus(g, 'burn', { dps: f.statuses.burn.dps, src: H });
        }
        break;
      case 'snow':
        this.emit({ type: 'biome', kind: 'snow', text: ev.text });
        for (const u of this.units) if (u.alive) this.applyStatus(u, 'chill', { dur: 2 });
        break;
      case 'mist':
        this.setTerrain('obscured', 5);
        break;
      case 'inkrain':
        this.emit({ type: 'biome', kind: 'inkrain', text: ev.text });
        this.applyStatus(H, 'curse', { dur: 3 });
        break;
      default:
    }
  }
}

/**
 * Runs a whole battle without a UI. `autoCast` simulates a player: casts spells when ready after
 * `delay` seconds with `success` probability. Used by tests, balance sims and "Skip".
 */
export function simulateBattle({ hero, heroHp, enemies, biome, floor, seed = 1, empower = 0, runState = {}, autoCast = null, maxT = 120 }) {
  const b = new Battle({ hero, heroHp, enemies, biome, floor, seed, empower, runState });
  const castRng = makeRng(seed * 31 + 7);
  const all = [];
  const readySince = {};
  while (!b.result && b.t < maxT) {
    if (autoCast) {
      for (const s of b.spells) {
        if (s.state === 'ready') {
          readySince[s.slot] ??= b.t;
          if (b.casting === null && b.t - readySince[s.slot] >= autoCast.delay) {
            b.beginCast(s.slot);
            b.finishCast(s.slot, castRng() < autoCast.success);
            delete readySince[s.slot];
          }
        }
      }
    }
    all.push(...b.step(COMBAT.dt));
  }
  if (!b.result) b.finish('lose');
  all.push(...b.events);
  return { result: b.result, events: all, duration: r2(b.t), heroHp: Math.max(0, Math.round(b.hero.hp)), kills: b.kills, dealt: Math.round(b.dealt), taken: Math.round(b.taken), battle: b };
}
