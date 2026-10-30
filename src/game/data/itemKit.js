// Building blocks for passive items (and synergies): small, safe effects that work for every hero,
// against one enemy or many, melee or ranged. Secondary projectiles, bursts and clones never rely on
// the hero's own attack being a projectile, and area effects always include their centre, so they
// hit a lone boss too. Visuals: b.fx(kind) plays the FX Studio cue `item.<kind>`.

export const R = { common: 'common', rare: 'rare', epic: 'epic' };
export const pick = (b, list) => list[Math.floor(b.rng() * list.length)];
export const RANDOM_STATUSES = ['burn', 'chill', 'wet', 'shock', 'curse', 'dazzle'];
export const STATUS_ELEMENT = { burn: 'fire', chill: 'ice', frozen: 'ice', wet: 'water', shock: 'lightning', curse: 'dark', dazzle: 'light', stun: 'earth', bleed: 'physical', slow: 'water', weaken: 'dark', mark: 'light' };
export const ELEMENT_STATUS = { fire: 'burn', ice: 'chill', water: 'wet', earth: 'stun', lightning: 'shock', wind: 'slow', dark: 'curse', light: 'dazzle', physical: 'bleed' };
export const EIGHT = ['fire', 'ice', 'water', 'earth', 'lightning', 'wind', 'dark', 'light'];
// the element that reacts with each status (data/elements.js REACTIONS)
export const REACTS_WITH = { burn: 'lightning', wet: 'lightning', frozen: 'earth', curse: 'light', dazzle: 'dark' };

/** At most once every `sec` seconds (per item and key), so self-feeding items can't spiral. */
export const ready = (b, s, sec, key = 'at') => {
  if ((s[key] ?? -99) > b.t - sec) return false;
  s[key] = b.t;
  return true;
};
/** Every Nth real basic attack (copies from clones and mirrors don't count). */
export const nth = (p, n) => !p.copy && p.count % n === 0;
/** A push big enough to matter (most heroes' crits, heavy swings, items' shoves). */
export const strong = (p, d = 4) => !p.pull && p.dist >= d;
export const nearHero = (b, r = 30) => b.foes().filter((f) => Math.abs(f.x - b.hero.x) <= r);
/** Every enemy within `r` of a unit or an x position (the unit itself included). */
export const around = (b, at, r) => {
  const x = typeof at === 'number' ? at : at.x;
  return b.foes().filter((f) => Math.abs(f.x - x) <= r);
};

/** Damage everything within `radius` of a unit or x (centre included). Returns how many were hit. */
export function burst(b, at, radius, amount, element = 'physical', { fx = null, status = null, dps = 3, dur, kb = 0, exclude = [] } = {}) {
  if (fx) b.fx(fx, typeof at === 'number' ? { x: at } : { tgt: at });
  let n = 0;
  for (const f of around(b, at, radius)) {
    if (exclude.includes(f)) continue;
    b.damage(b.hero, f, amount, { element, kind: 'proc', noKnock: true });
    if (status) b.applyStatus(f, status, { src: b.hero, dps, dur });
    if (kb) b.knockback(f, kb, { src: b.hero });
    n++;
  }
  return n;
}

/** A secondary projectile from `from` (a unit, its id, or the hero) to `to`. Returns damage dealt. */
export function missile(b, from, to, amount, element = 'physical', { small = true, status = null, dps = 3, dur } = {}) {
  if (!to?.alive) return 0;
  b.emit({ type: 'shot', src: from?.id ?? from ?? 'hero', tgt: to.id, element, small });
  const d = b.damage(b.hero, to, amount, { element, kind: 'proc' });
  if (status) b.applyStatus(to, status, { src: b.hero, dps, dur });
  return d;
}

/** `n` seeking projectiles at random enemies; a lone enemy takes them all. */
export function seekers(b, n, amount, element = 'physical', { from = 'hero', except = [], status = null } = {}) {
  for (let i = 0; i < n; i++) {
    const f = b.randomFoe(except) || b.front();
    if (!f) return;
    missile(b, from, f, amount, element, { status });
  }
}

/** A lightning arc between two units. */
export function arc(b, from, to, amount) {
  if (!to?.alive) return 0;
  b.emit({ type: 'shot', src: from?.id ?? 'hero', tgt: to.id, element: 'lightning', bolt: true });
  return b.damage(b.hero, to, amount, { element: 'lightning', kind: 'proc' });
}

/** Lightning from the sky onto one enemy. */
export function strike(b, f, amount, { status = 'shock', dur = 2 } = {}) {
  if (!f?.alive) return 0;
  b.emit({ type: 'biome', kind: 'lightning', tgt: f.id });
  const d = b.damage(b.hero, f, amount, { element: 'lightning', kind: 'proc' });
  if (status) b.applyStatus(f, status, { src: b.hero, dur });
  return d;
}

/** A ground shockwave at x: damage and a push away from the hero for everything within `radius`. */
export function shockwave(b, x, radius, dist, amount, element = 'earth') {
  b.fx('shockwave', { x });
  for (const f of around(b, x, radius)) {
    if (amount) b.damage(b.hero, f, amount, { element, kind: 'proc', noKnock: true });
    b.knockback(f, dist, { src: b.hero });
  }
}

/** A clone or spirit beside the hero (capped by the engine); asHero clones copy real attacks. */
export function clone(b, spec) {
  const a = b.spawnAlly({ sprite: 'shade', ...spec });
  if (a) b.fx(spec.sprite === 'companion' ? 'spirit' : 'clone', { tgt: a });
  return a;
}

/**
 * Bosses, guardians and elites hand out "milestones" every 10% of health you take from them, so
 * kill-based items still pay off in a one-on-one fight. Returns true on a new milestone.
 */
export function milestone(b, s, target) {
  if (!(target.boss || target.elite || target.edef?.guardian)) return false;
  s.ms ||= {};
  const step = Math.floor((1 - target.hp / target.maxHp) / 0.1);
  if (step <= (s.ms[target.id] || 0)) return false;
  s.ms[target.id] = step;
  return true;
}
