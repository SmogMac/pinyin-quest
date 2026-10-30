// Sprite-sheet VFX player. Pure CSS playback: the sheet image slides inside a frame-sized window
// using a stepped keyframe animation generated once per sheet at runtime, so an effect costs no
// React render or JavaScript per frame. Position, size, mirroring and layer come from the caller
// (playLayer in BattleScreen); looks come from the live FX config (src/fx/config.js).
import { memo } from 'react';
import { fx, effectDef, VFX_FPS } from '../fx/config.js';

const asset = (src) => `${import.meta.env.BASE_URL}${src}`;

/** Where a sheet's image is: the packed file (recoloured copy when baked), or the raw pack in dev. */
export function sheetSrc(key, sh, hue = 0) {
  if (sh.pending) return `/__fx/raw/${sh.path}/spritesheet.png`;
  const baked = hue && sh.baked?.includes(hue);
  return asset(`assets/vfx/${key}${baked ? `@${hue}` : ''}.png`);
}
/** CSS hue filter still needed (recolours not baked into a file yet, e.g. while editing). */
const hueFilter = (sh, hue) => (hue && !(sh.baked?.includes(hue) && !sh.pending) ? `hue-rotate(${hue}deg)` : '');

// one @keyframes rule per sheet layout, added the first time the sheet plays
const made = new Set();
let styleEl = null;
function animFor(key, sh) {
  const name = `vfx-${key.replace(/[^\w-]/g, '_')}-${sh.cols}x${sh.rows}-${sh.frames}`;
  if (made.has(name) || typeof document === 'undefined') return name;
  made.add(name);
  styleEl ||= document.head.appendChild(document.createElement('style'));
  // the image is sw × sh px (packed: exactly the grid; raw pack sheets are padded), so a frame step
  // is w/sw of the image width
  const fw = (sh.w / (sh.sw || sh.cols * sh.w)) * 100;
  const fh = (sh.h / (sh.sh || sh.rows * sh.h)) * 100;
  let css = `@keyframes ${name} {`;
  for (let i = 0; i <= sh.frames; i++) {
    const f = Math.min(i, sh.frames - 1);
    css += `${((i / sh.frames) * 100).toFixed(3)}%{transform:translate(${-(f % sh.cols) * fw}%,${-Math.floor(f / sh.cols) * fh}%)}`;
  }
  styleEl.appendChild(document.createTextNode(`${css}}\n`));
  return name;
}

/** Duration of one play-through in ms. */
export function vfxDuration(name, speed = 1) {
  const def = effectDef(name);
  const sh = def && fx().sheets[def.sheet];
  if (!sh) return 0;
  return (sh.frames / ((def.fps || VFX_FPS) * speed)) * 1000;
}
/** Displayed frame size in px for a given camera scale. */
export function vfxSize(name, cam = 1, scale = 1) {
  const def = effectDef(name);
  const sh = def && fx().sheets[def.sheet];
  if (!sh) return { w: 0, h: 0 };
  const k = def.scale * cam * scale;
  return { w: sh.w * k, h: sh.h * k };
}

/** Starts loading every packed sheet so the first hit never waits on the network. */
let preloaded = false;
export function preloadVfx() {
  if (preloaded || typeof Image === 'undefined') return;
  preloaded = true;
  const { sheets, effects } = fx();
  for (const e of Object.values(effects)) {
    const sh = sheets[e.sheet];
    if (!sh) continue;
    const img = new Image();
    img.decoding = 'async';
    img.src = sheetSrc(e.sheet, sh, e.hue || 0);
  }
}

/** The moving picture of one sheet inside a window of the given size (no positioning). */
export function SheetFrames({ sheetKey, sh, hue = 0, dur, loops = Infinity, style }) {
  const anim = animFor(sheetKey, sh);
  return (
    <img
      src={sheetSrc(sheetKey, sh, hue)}
      alt=""
      loading="lazy"
      draggable="false"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        maxWidth: 'none',
        width: `${((sh.sw || sh.cols * sh.w) / sh.w) * 100}%`,
        height: `${((sh.sh || sh.rows * sh.h) / sh.h) * 100}%`,
        animation: `${anim} calc(var(--slow, 1) * ${dur}ms) steps(1, end) ${loops === Infinity ? 'infinite' : loops} both`,
        filter: hueFilter(sh, hue) || undefined,
        ...style,
      }}
    />
  );
}

/**
 * One effect. `e`: { name, left, bottom (CSS lengths), w, h, flip, rotate, loops, speed, opacity,
 * hue (added to the effect's own) }. Memoised: an effect never changes after it is created.
 */
export const VfxSprite = memo(function VfxSprite({ e }) {
  const def = effectDef(e.name);
  const sh = def && fx().sheets[def.sheet];
  if (!sh) return null;
  const dur = (sh.frames / ((def.fps || VFX_FPS) * (e.speed || 1))) * 1000;
  const loops = e.loops ?? def.loops ?? 1;
  const transform = `${e.flip ? 'scaleX(-1) ' : ''}${e.rotate ? `rotate(${e.rotate}deg)` : ''}`.trim();
  return (
    <div
      className={`vfx vfx-layer-${def.layer || 'unit'}`}
      style={{
        left: e.left, bottom: e.bottom, width: e.w, height: e.h, marginLeft: -e.w / 2, transform: transform || undefined,
        mixBlendMode: def.blend || undefined, opacity: e.opacity ?? def.opacity,
      }}
      aria-hidden="true"
    >
      <SheetFrames sheetKey={def.sheet} sh={sh} hue={(def.hue || 0) + (e.hue || 0)} dur={dur} loops={loops} />
    </div>
  );
});
