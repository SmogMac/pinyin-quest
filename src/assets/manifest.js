// CENTRAL ASSET MANIFEST
// Gameplay code only refers to asset *keys* (e.g. 'slime', 'hero', 'fireball'). To replace art,
// change the entry here — the combat engine and game logic never need to change.
//
// Sprite entry forms (see docs/ASSETS.md for sizes and conventions):
//   { component: ReactSvgComponent, w, h }                       built-in vector art (default)
//   { src: 'assets/enemies/slime.webp', w, h }                   single image (PNG/SVG/WebP), path relative to /public
//   { src, w, h, fx: { src, kind, origin } }                     image plus an animated effect layer drawn on top
//                                                                 (same canvas size; `origin` is the effect's base)
//   { sheet: { src, frameW, frameH, fps, states: { idle: [row, frames], attack: [...], hurt, dead, walk } }, w, h }
//                                                                 sprite sheet: one row per animation state
// w/h are the on-stage display size in CSS pixels (before the stage's responsive scale).
import Companion from './characters/Companion.jsx';
import { Slime, Sporecap, Bat, Goblin, Golem, Wisp, Knight } from './enemies/Enemies.jsx';
import { Panda, Kite, Turtle, Snowman, Thunderbird, ShadowSprite, Lantern, Wraith, WordEater, Rabbit } from './enemies/EnemiesExtra.jsx';

export const SPRITES = {
  // Playable heroes (see src/game/data/heroes.js). Image art is prepared by `npm run art`.
  xinyi: { src: 'assets/characters/xinyi.webp', w: 112, h: 142 },
  mei: { src: 'assets/characters/mei.webp', w: 96, h: 142 },
  ruizhe: { src: 'assets/characters/ruizhe.webp', w: 87, h: 142 },
  huojin: { src: 'assets/characters/huojin.webp', w: 103, h: 142, fx: { src: 'assets/characters/huojin-fire.webp', kind: 'flame', origin: '84% 44%' } },
  fuyun: { src: 'assets/characters/fuyun.webp', w: 107, h: 142 },
  companion: { component: Companion, w: 64, h: 56, anchor: 'bottom' },
  slime: { component: Slime, w: 92, h: 83 },
  sporecap: { component: Sporecap, w: 90, h: 99 },
  bat: { component: Bat, w: 96, h: 78, flying: true },
  goblin: { component: Goblin, w: 104, h: 113 },
  golem: { component: Golem, w: 130, h: 130 },
  wisp: { component: Wisp, w: 112, h: 122, flying: true },
  knight: { component: Knight, w: 124, h: 134 },
  wyrm: { src: 'assets/enemies/inkdragon.webp', w: 170, h: 230 },
  panda: { component: Panda, w: 110, h: 110 },
  kite: { component: Kite, w: 84, h: 92, flying: true },
  crab: { src: 'assets/enemies/crab.webp', w: 124, h: 80 },
  zombie: { src: 'assets/enemies/zombie.webp', w: 78, h: 128, hop: true },
  turtle: { component: Turtle, w: 120, h: 90 },
  snowman: { component: Snowman, w: 96, h: 115 },
  thunderbird: { component: Thunderbird, w: 112, h: 94, flying: true },
  shadow: { component: ShadowSprite, w: 96, h: 115 },
  lantern: { component: Lantern, w: 90, h: 108, flying: true },
  wraith: { component: Wraith, w: 76, h: 84, flying: true },
  wordeater: { component: WordEater, w: 240, h: 207 },
  rabbit: { component: Rabbit, w: 120, h: 130 },
};

// Picture-puzzle illustrations: { '水': 'assets/pictures/water.png' }. Words not listed use the
// emoji placeholder from src/data/pictures.json.
export const PICTURE_IMAGES = {};

// Ability / upgrade icons: glyph name from Icons.jsx + element (for colour).
// Replace with { src: 'assets/icons/fireball.png' } to use a custom image.
export const ABILITY_ICONS = {
  fireball: { glyph: 'flame' },
  scroll: { glyph: 'book' },
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
  guardian: 'crown',
  shrine: 'sun',
  merchant: 'coin',
  event: 'sparkle',
  secret: 'eye',
  secretboss: 'moon',
};

// Spell icons (glyph from Icons.jsx, coloured by the spell's element). Replace with { src }.
export const SPELL_ICONS = {
  jiayou: { glyph: 'heart' }, badao: { glyph: 'slash' }, zhishi: { glyph: 'book' }, dianhuo: { glyph: 'flame' }, xuanfeng: { glyph: 'wind' },
  huoqiu: { glyph: 'flame' }, dongtian: { glyph: 'snow' }, shandian: { glyph: 'bolt' }, xiayu: { glyph: 'drop' },
  qiang: { glyph: 'mountain' }, heiye: { glyph: 'moon' }, dafeng: { glyph: 'wind' }, yangguang: { glyph: 'sun' },
  dahai: { glyph: 'wave' }, dizhen: { glyph: 'mountain' }, xixue: { glyph: 'drop' }, xingxing: { glyph: 'star' },
  kuaipao: { glyph: 'wind' },
};

// Spell effect styles keyed by element; the BattleScreen draws these with CSS.
// Set `src` to an image/animated WebP to replace the procedural effect.
export const EFFECTS = {
  projectile: { size: 26 },
  burst: { size: 90 },
  slash: { size: 70 },
};
