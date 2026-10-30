// The live FX config: every sprite effect, cue, projectile and character pose the battle uses,
// edited in the FX Studio (editor.html, dev only) and saved to fx.json by its Compile button.
//
//   sheets       packed sprite sheets: key → { path (in the VFX pack), w, h (frame), frames, cols,
//                rows, baked: [hues recoloured at pack time] }. `pending` sheets are not packed yet
//                (the editor previews them straight from the pack).
//   effects      named looks: { sheet, scale, anchor, dir, layer, hue, blend, loops, fps, opacity }
//   cues         what plays on each battle event: { label, group, layers: [...] } where a layer is
//                effect · pose (a character animation) · classic (built-in CSS effect) · shake ·
//                punch · sound, each with its own delay (see playLayer in BattleScreen.jsx)
//   projectiles  flight of each projectile type (speed, arc, spin, tilt, launch point, sprite)
//   poses        character action animations as keyframes (see poses.js)
//
// The game reads the config through `fx()` on every event, so the editor's live edits show at once.
import data from './fx.json';

let current = data;
const listeners = new Set();

export const fx = () => current;

/** Replaces the live config (the editor's draft); everything listening re-renders. */
export function setFx(next) {
  current = next;
  for (const l of listeners) l(current);
}
export function onFx(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const VFX_FPS = 15; // the pack's guide recommends 15 FPS for every animation

export const effectDef = (name) => current.effects[name];
export const sheetOf = (name) => current.sheets[current.effects[name]?.sheet];
export const cueDef = (name) => current.cues[name];
export const projDef = (type) => current.projectiles[type];
export const poseDef = (state) => current.poses[state];
/** How long a pose lasts (ms), for keeping the unit in that state. */
export const poseMs = (state, fallback = 300) => current.poses[state]?.dur ?? fallback;

/** Enemy ids whose ranged attacks are thrown (arc) rather than fired. */
export const throwers = () => new Set(current.projectiles.thrown?.enemies || []);

// Hot reload: when fx.json changes on disk (Compile), take the new file.
if (import.meta.hot) {
  import.meta.hot.accept('./fx.json', (mod) => {
    if (mod?.default) setFx(mod.default);
  });
}
