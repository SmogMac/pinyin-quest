// CENTRAL ASSET MANIFEST
// Gameplay code only refers to asset *keys* (e.g. 'slime', 'hero', 'fireball'). To replace art,
// change the entry here — the combat engine and game logic never need to change.
//
// Sprite entry forms (see docs/ASSETS.md for sizes and conventions):
//   { component: ReactSvgComponent, w, h }                       built-in vector art (default)
//   { src: 'assets/enemies/slime.webp', w, h }                   single image (PNG/SVG/WebP), path relative to /public
//   { sheet: { src, frameW, frameH, fps, states: { idle: [row, frames], attack: [...], hurt, dead, walk } }, w, h }
//                                                                 sprite sheet: one row per animation state
// w/h are the on-stage display size in CSS pixels (before the stage's responsive scale).
import Hero from './characters/Hero.jsx';
import Companion from './characters/Companion.jsx';
import { Slime, Sporecap, Bat, Goblin, Golem, Wisp, Knight, Wyrm } from './enemies/Enemies.jsx';

export const SPRITES = {
  // Playable heroes (see src/game/data/heroes.js). Image art is prepared by `npm run art`.
  xinyi: { src: 'assets/characters/xinyi.webp', w: 112, h: 142 },
  mei: { src: 'assets/characters/mei.webp', w: 96, h: 142 },
  hero: { component: Hero, w: 120, h: 150, anchor: 'bottom' }, // Huo Huo (vector, recoloured by robes)
  companion: { component: Companion, w: 64, h: 56, anchor: 'bottom' },
  slime: { component: Slime, w: 92, h: 83 },
  sporecap: { component: Sporecap, w: 90, h: 99 },
  bat: { component: Bat, w: 96, h: 78, flying: true },
  goblin: { component: Goblin, w: 104, h: 113 },
  golem: { component: Golem, w: 130, h: 130 },
  wisp: { component: Wisp, w: 112, h: 122, flying: true },
  knight: { component: Knight, w: 124, h: 134 },
  wyrm: { component: Wyrm, w: 230, h: 196 },
};

// Ability / upgrade icons: glyph name from Icons.jsx + element (for colour).
// Replace with { src: 'assets/icons/fireball.png' } to use a custom image.
export const ABILITY_ICONS = {
  fireball: { glyph: 'flame' },
  ember_blade: { glyph: 'sword' },
  water_shield: { glyph: 'shield' },
  healing_spring: { glyph: 'drop' },
  wind_spirit: { glyph: 'wind' },
  gale_slash: { glyph: 'doubleSlash' },
  mountain_armor: { glyph: 'mountain' },
  stone_skin: { glyph: 'shield' },
  sunburst: { glyph: 'sun' },
  radiant_heal: { glyph: 'sparkle' },
  moon_veil: { glyph: 'moon' },
  night_fang: { glyph: 'slash' },
  vital_heart: { glyph: 'heart' },
  vampiric_bloom: { glyph: 'drop' },
  power_strike: { glyph: 'fist' },
  berserker: { glyph: 'swords' },
  rune_battery: { glyph: 'rune' },
  echo_cast: { glyph: 'echo' },
  keen_eye: { glyph: 'eye' },
  companion: { glyph: 'paw' },
  // synergies
  firestorm: { glyph: 'vortex' },
  stone_guardian: { glyph: 'mountain' },
  eclipse: { glyph: 'moon' },
  fountain_of_life: { glyph: 'drop' },
  war_band: { glyph: 'paw' },
  hellfire: { glyph: 'flame' },
  arcane_overflow: { glyph: 'rune' },
  tempest_eye: { glyph: 'eye' },
};

// Encounter node icons on the adventure map.
export const NODE_ICONS = {
  battle: 'swords',
  elite: 'skull',
  rest: 'campfire',
  treasure: 'chest',
  lesson: 'book',
  boss: 'crown',
};

// Spell effect styles keyed by element; the BattleView draws these with CSS.
// Set `src` to an image/animated WebP to replace the procedural effect.
export const EFFECTS = {
  projectile: { size: 26 },
  burst: { size: 90 },
  slash: { size: 70 },
};
