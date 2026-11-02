// What a character's statuses look like on the character itself (no floating icons): flames for
// Burn, an ice block for Freeze, circling stars for Stun, droplets for Wet, arcs for Shock, ink
// wisps for Curse… Only the two most important overlays and one tint show at once, so stacked
// statuses stay readable. Looping sprite effects come from the FX config (effects look_*), so the
// FX Studio can swap them.
import { memo } from 'react';
import { fx, VFX_FPS } from '../fx/config.js';
import { SheetFrames } from './Vfx.jsx';

// most important first
const OVERLAY_ORDER = ['frozen', 'stun', 'burn', 'shock', 'curse', 'wet', 'bleed', 'dazzle'];
const TINT_ORDER = ['frozen', 'burn', 'curse', 'shock', 'chill', 'wet', 'slow', 'weaken'];

/** The overlays (up to 2) and the tint for a set of statuses. */
export function lookOf(statuses) {
  const has = (k) => Boolean(statuses[k]);
  return { overlays: OVERLAY_ORDER.filter(has).slice(0, 2), tint: TINT_ORDER.find(has) || null };
}

/** How much a unit's statuses slow its animations (Chill and Slow match their gameplay effect). */
export function animSpeed(statuses) {
  let m = 1;
  if (statuses.chill) m *= 0.65;
  if (statuses.slow) m *= 0.55;
  return m;
}

/** A looping sheet effect sized to the character (width as a share of the sprite width). */
function Loop({ name, w, share, bottom, alpha = 1, blend, back = false, dx = 0 }) {
  const def = fx().effects[name];
  const sh = def && fx().sheets[def.sheet];
  if (!sh) return null;
  const bw = w * share;
  const bh = (bw * sh.h) / sh.w;
  return (
    <span className={`look-loop ${back ? 'back' : ''}`} style={{ width: bw, height: bh, marginLeft: -bw / 2 + dx * w, bottom: typeof bottom === 'function' ? bottom(bh) : bottom, opacity: alpha, mixBlendMode: blend || def.blend || undefined }}>
      <SheetFrames sheetKey={def.sheet} sh={sh} hue={def.hue || 0} dur={(sh.frames / (def.fps || VFX_FPS)) * 1000} />
    </span>
  );
}

/** The status overlays for one character (w, h: its sprite size in px). */
export const StatusLook = memo(function StatusLook({ overlays, w, h, hot }) {
  return overlays.split(' ').map((k) => {
    switch (k) {
      case 'burn':
        // a soft flame behind the body and a small one licking at the feet: burning, still readable
        return (
          <span key={k} className="look-burn-wrap">
            <Loop name="look_burn" w={w} share={hot ? 1.05 : 0.9} bottom={(bh) => -bh * 0.08} alpha={0.75} back />
            <Loop name="look_burn" w={w} share={hot ? 0.42 : 0.34} bottom={(bh) => h * 0.18 - bh * 0.2} dx={-0.3} alpha={0.9} />
            <Loop name="look_burn" w={w} share={hot ? 0.38 : 0.3} bottom={(bh) => h * 0.32 - bh * 0.2} dx={0.28} alpha={0.85} />
            <Loop name="look_burn" w={w} share={hot ? 0.5 : 0.4} bottom={(bh) => -bh * 0.18} alpha={0.95} />
          </span>
        );
      case 'shock':
        return <Loop key={k} name="look_shock" w={w} share={0.85} bottom={(bh) => h * 0.5 - bh / 2} alpha={0.75} />;
      case 'dazzle':
        return <Loop key={k} name="look_dazzle" w={w} share={0.6} bottom={h * 0.8} />;
      case 'frozen':
        return (
          <span key={k} className="look-ice" style={{ width: w * 1.05, height: h * 1.02, marginLeft: (-w * 1.05) / 2 }}>
            <i />
            <i />
            <i />
          </span>
        );
      case 'stun':
        return (
          <span key={k} className="look-stars" style={{ bottom: h * 0.98, width: w * 0.7, marginLeft: (-w * 0.7) / 2 }}>
            <i>✦</i>
            <i>✦</i>
            <i>✦</i>
          </span>
        );
      case 'wet':
        return (
          <span key={k} className="look-drops" style={{ width: w * 0.8, height: h * 0.9, marginLeft: (-w * 0.8) / 2 }}>
            <i />
            <i />
            <i />
            <i />
          </span>
        );
      case 'bleed':
        return (
          <span key={k} className="look-bleed" style={{ width: w * 0.6, height: h * 0.6, marginLeft: (-w * 0.6) / 2, bottom: h * 0.25 }}>
            <i />
            <i />
          </span>
        );
      case 'curse':
        return (
          <span key={k} className="look-curse" style={{ width: w * 0.9, height: h, marginLeft: (-w * 0.9) / 2 }}>
            <i>墨</i>
            <i>咒</i>
            <b />
            <b />
          </span>
        );
      default:
        return null;
    }
  });
});
