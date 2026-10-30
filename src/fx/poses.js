// Character action animations (attack, hurt, dodge, cast, throw …) from the FX config's `poses`.
// Each pose is keyframes for a hero facing right: { dur (ms), ease, origin (x % of the sprite,
// at its feet), hold (keep the last frame), keys: [{ at (0–1), x, y (px), rot (deg), sx, sy,
// bright, opacity }] }. Enemies face left, so their x, rotation and origin are mirrored.
// The CSS is generated in the page (and regenerated live while the FX Studio edits a pose).
// Pure (no config import) so tests can run it under Node; the battle screen installs it.

const num = (v, d) => (v === undefined || v === null ? d : v);

function frame(k, sign) {
  const t = `translate(${num(k.x, 0) * sign}px, ${num(k.y, 0)}px) rotate(${num(k.rot, 0) * sign}deg) scale(${num(k.sx, 1)}, ${num(k.sy, 1)})`;
  let s = `transform:${t};`;
  if (k.bright !== undefined) s += `filter:brightness(${k.bright});`;
  if (k.opacity !== undefined) s += `opacity:${k.opacity};`;
  return s;
}

/** The stylesheet for every pose (exported for tests and the editor). */
export function poseCss(poses) {
  let css = '';
  for (const [name, p] of Object.entries(poses)) {
    for (const [side, sign] of [['hero', 1], ['enemy', -1]]) {
      const kf = `fxpose-${name}-${side}`;
      css += `@keyframes ${kf}{`;
      for (const k of [...p.keys].sort((a, b) => a.at - b.at)) css += `${(k.at * 100).toFixed(2)}%{${frame(k, sign)}}`;
      css += '}';
      const origin = sign > 0 ? num(p.origin, 50) : 100 - num(p.origin, 50);
      // :where() keeps the specificity low, so aura speed-ups (.unit2.aura-frenzy …) still apply
      css += `:where(.side-${side}) .sprite.st-${name}{transform-origin:${origin}% 100%;animation:${kf} calc(var(--slow, 1) * ${p.dur}ms) ${p.ease || 'ease-out'} ${p.hold ? 'forwards' : 'none'};}`;
    }
  }
  // calm / reduced motion: no attack or hurt bounce (as before)
  css += '.calm .unit2 .sprite.st-attack,.calm .unit2 .sprite.st-hurt,.reduced-motion .unit2 .sprite.st-attack,.reduced-motion .unit2 .sprite.st-hurt{animation:none}';
  return css;
}

let el = null;
/** Adds the pose stylesheet to the page and keeps it in step with the live config. */
export function installPoses(config, subscribe) {
  if (el || typeof document === 'undefined') return;
  el = document.head.appendChild(document.createElement('style'));
  el.id = 'fx-poses';
  el.textContent = poseCss(config.poses);
  subscribe((c) => (el.textContent = poseCss(c.poses)));
}
