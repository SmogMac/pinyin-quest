// Builds passive-item icons from the source pack: node tools/item-art.mjs
// Source: icon_asset_pack/<Name>.png (1024×1024, lots of empty margin) → trimmed, 128×128 WebP in
// public/assets/items/<item id>.webp, plus a few scenery props in public/assets/props/. Also writes src/assets/itemArt.js (the id → file map the game
// reads). Items not listed here keep their drawn glyph icon.
import fs from 'node:fs';
import sharp from 'sharp';

const SRC = 'icon_asset_pack';
const OUT = 'public/assets/items';

// item id → source picture. A plain name uses the picture as is (each at most once); an object
// { from, hue, sat, tint } recolours a picture so items that share artwork still look distinct.
export const ITEM_ART = {
  split_ink: 'Ink_Stone',
  long_spear: 'Hairpin1',
  bouncing_ball: 'Ornate_Red_Bead',
  five_petals: 'Plum_Blossom_Vase',
  ember_tip: 'Engraved_Fire_Stone',
  frost_tip: 'Sacred_Stone',
  tide_tip: 'Engraved_Water_Stone',
  spark_arc: 'Crane_Coin',
  heavy_hand: 'Iron_Coin',
  mirror_ink: 'Galaxy_Mirror',
  broken_compass: 'Cracked_Plain_Medallion',
  echo_brush: 'Wood_Chime',
  wind_step: 'White_Feather',
  ember_trail: 'Brazier_Coin',
  rooted: 'Bonsai',
  shadow_double: 'Ominous_Spectre1',
  rebound: 'Silver_Coin',
  qinggong: 'Folding_Fan',
  shield_burst: 'Bronze_Button',
  ice_spikes: 'Gem2',
  overflow: 'Wine_Goblet',
  storm_guard: 'Silver_Ornate_Badge',
  ember_armor: 'Cloth_Bolt1',
  stone_bulwark: 'Engraved_Earth_Stone',
  iron_skin: 'Card_Backing',
  vitality: 'UI_Heal_Leaf',
  golden_bell: 'Bell',
  triple_blast: 'Red_Chest',
  forked_bolt: 'Pixiu_Beast_Talisman',
  wild_brush: 'Manuscript_Orange',
  quick_ink: 'Bamboo_Slips',
  impatience: 'Sewing_Needle',
  charged_strike: 'Medallion',
  poised_mind: 'Water_Bowl',
  echo_cast: 'Ivory_Dragon',
  lingering: 'Incense_Burner',
  perfect_memory: 'Manuscript_Blue',
  second_thought: 'Manuscript_Green',
  resonance: 'Gold_Lotus',
  reservoir: 'Jade_Chest',
  ink_reflection: 'Plain_Black_Bead',
  chain_reaction: 'Endless_Knot',
  final_word: 'Imperial_Decree1',
  ink_resonance: 'Banner2',
  patient_reward: 'Hands_With_Peach',
  reckless_magic: 'Manuscript_Dirty_Purple',
  afterglow: 'Gold_Ornate_Badge',
  bitter_lesson: 'Tea_Brick2',
  back_to_water: 'Two_Tail_Banner',
  hex_mark: 'Stamp_Mark',
  adaptation: 'Engraved_Plant_Stone',
  hungry_lantern: 'Pavillion1',
  paper_phoenix: 'Pheonix_Feather',
  glass_brush: 'Gem1',
  storm_bottle: 'Vial',
  lucky_cat: 'Gold_Sycee',
  ink_brush: 'Banner1',
  relentless: 'Banner3',
  thunder_impact: 'Cracked_Stone',
  battle_standard: 'Pheonix_Banner',
  countercurrent: 'Embroidered_Cloth',
  reckless_charge: 'Cloth_Bolt2',
  territorial_guardian: 'Pavillion2',
  swift_pursuit: 'Heron_Pouch',
  heavy_frame: 'Throne',
  hit_and_run: 'Pouch',
  boundary_stone: 'Wood_Token',
  spring_tea: 'Tea_Brick1',
  counterstrike: 'Vertical_Badge',
  last_stand: 'Folding_Screen',
  invaders_mark: 'Imperial_Badge',
  cursed_crown: 'Ominous_Stone',
  ghost_step: 'Ominous_Spectre2',
  ink_parasite: 'Dull_Black_Bead',
  holy_water: 'Precious_White_Bead',
  chaotic_scroll: 'Scroll',
  twin_shadows: 'Yin_Yang_Koi',
  war_drum: 'Badge1',
  soul_lantern: 'Obscured_Pavillion',
  thorn_shell: 'Bronze_Coin',
  bumper_crop: 'Wood_Chest2',
  still_water: 'Jade_Fish_Medallion',
  eternal_flame: 'Sacred_Egg',
  barbed_seal: 'Stamp',
  ink_trail: 'Manuscript_Purple',
  lucky_charm: 'Ruyi_Cloud_Seal',
  steel_veil: 'Necklace_Choker',
  momentum_swing: 'Jade_Ring',
  // recoloured or remaining pictures, so every item has art
  sugar_rush: 'Spiritual_Peaches',
  hearty_meal: 'Bamboo_Chest',
  desperate_pace: 'UI_Continue',
  sun_mirror: 'UI_Icon2',
  hunters_instinct: 'UI_Icon1',
  thousand_cuts: 'UI_Button2',
  endless_storm: 'UI_Icon5',
  sword_intent: 'UI_Icon3',
  second_wave: 'UI_Scroll1',
  second_wind: 'UI_Headdress',
  four_sides: 'Engraved_Jade1',
  sticky_ink: 'Letter',
  pileup: 'Wood_Chest1',
  hemorrhage: { from: 'Poison', hue: 250 },
  frost_hunter: { from: 'Sacred_Stone', hue: 40 },
  ashes: { from: 'Brazier_Coin', sat: 0.2 },
  blood_moon: { from: 'UI_Icon6', tint: [200, 40, 50] },
  thunder_drum: { from: 'Badge1', tint: [255, 220, 70] },
  iron_roots: { from: 'Bonsai', sat: 0.35 },
  chain_hook: { from: 'Endless_Knot', hue: 200 },
  long_stride: { from: 'White_Feather', hue: 100 },
  slipstream: { from: 'Embroidered_Cloth', tint: [110, 235, 195] },
  afterimage: { from: 'Ominous_Spectre1', tint: [140, 200, 255] },
  rain_dancer: { from: 'Water_Bowl', hue: 40 },
  fierce_assault: { from: 'Engraved_Fire_Stone', hue: 25 },
  overextension: { from: 'Cloth_Bolt2', hue: 290 },
  wallbreaker: { from: 'Engraved_Earth_Stone', hue: 200 },
  chain_collision: { from: 'Bronze_Coin', hue: 180 },
  bleeding_edge: { from: 'Hairpin1', tint: [220, 50, 60] },
  conductive_ink: { from: 'Ink_Stone', tint: [255, 225, 80] },
  glacier_fist: { from: 'Iron_Coin', tint: [140, 220, 255] },
  rage: { from: 'Ominous_Stone', tint: [255, 90, 60] },
  overflowing_ink: { from: 'Wine_Goblet', tint: [150, 90, 230] },
  mirror_brush: { from: 'Galaxy_Mirror', hue: 120 },
  broken_hourglass: { from: 'Cracked_Plain_Medallion', tint: [240, 200, 90] },
  explosive_impact: { from: 'Red_Chest', hue: 25 },
  blood_blossom: { from: 'Plum_Blossom_Vase', tint: [255, 100, 120] },
  honed_edge: { from: 'Medallion', hue: 200 },
  roaring_spirit: { from: 'Pheonix_Banner', hue: 30 },
  charge_up: { from: 'Gem1', hue: 60 },
  storm_barrier: { from: 'Folding_Screen', tint: [255, 230, 110] },
  cinder_heart: { from: 'Ornate_Red_Bead', hue: 25 },
  flame_mantle: { from: 'Embroidered_Cloth', tint: [255, 110, 60] },
  blade_dance: { from: 'Folding_Fan', tint: [170, 120, 255] },
  storm_edge: { from: 'Crane_Coin', tint: [255, 225, 80] },
  gale_strike: { from: 'Two_Tail_Banner', hue: 120 },
  ember_shield: { from: 'Bronze_Button', hue: 15 },
  second_refusal: { from: 'Stamp_Mark', hue: 200 },
  emphatic_no: { from: 'Cracked_Stone', tint: [255, 160, 90] },
  arc_flail: { from: 'Necklace_Choker', hue: 60 },
  stunning_blow: { from: 'Silver_Coin', tint: [255, 220, 90] },
  fanned_flames: { from: 'Folding_Fan', tint: [255, 140, 70] },
  // build-defining items (recoloured so each one reads as its own thing)
  red_thread: { from: 'Endless_Knot', tint: [255, 40, 60] },
  borrowed_time: { from: 'Incense_Burner', hue: 190 },
  tricksters_mask: { from: 'Ominous_Spectre2', hue: 120 },
  thunderclap_drum: { from: 'Wood_Token', tint: [255, 225, 90] },
  mirror_world: { from: 'Galaxy_Mirror', hue: 300 },
  turtles_revenge: { from: 'Sacred_Egg', tint: [110, 190, 120] },
  gravity_seal: { from: 'Ruyi_Cloud_Seal', hue: 250 },
  ink_mine: { from: 'Dull_Black_Bead', tint: [170, 110, 255] },
  paper_lanterns: { from: 'Pavillion2', tint: [255, 170, 90] },
  ebb_tide: { from: 'Yin_Yang_Koi', hue: 170 },
  contagion: { from: 'Poison', hue: 260 },
  sword_ring: { from: 'Jade_Ring', sat: 0.15 },
  blood_pact: { from: 'Vial', tint: [220, 40, 60] },
};

// scenery for encounters on the road (bigger, used as props in the exploration scene)
const PROPS = { cart: 'UI_Store', chest: 'Wood_Chest1', shrine: 'Gold_Lotus', lantern: 'Pavillion1' };

const used = Object.values(ITEM_ART).filter((x) => typeof x === 'string');
const dupes = used.filter((x, i) => used.indexOf(x) !== i);
if (dupes.length) throw new Error(`pictures used twice: ${dupes}`);
const recolours = Object.values(ITEM_ART).filter((x) => typeof x !== 'string').map((x) => `${x.from}|${x.hue}|${x.sat}|${x.tint}`);
if (new Set(recolours).size !== recolours.length) throw new Error('two items share the same recolour');
fs.mkdirSync(OUT, { recursive: true });
for (const [id, spec] of Object.entries(ITEM_ART)) {
  const { from, hue, sat, tint } = typeof spec === 'string' ? { from: spec } : spec;
  const src = `${SRC}/${from}.png`;
  if (!fs.existsSync(src)) throw new Error(`missing ${src}`);
  let img = sharp(src).trim({ threshold: 2 });
  if (hue || sat !== undefined) img = img.modulate({ hue: hue || 0, saturation: sat ?? 1 });
  if (tint) img = img.tint({ r: tint[0], g: tint[1], b: tint[2] });
  await img.resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 84 }).toFile(`${OUT}/${id}.webp`);
}
fs.mkdirSync('public/assets/props', { recursive: true });
for (const [id, name] of Object.entries(PROPS)) {
  await sharp(`${SRC}/${name}.png`).trim({ threshold: 2 }).resize(256, 256, { fit: 'inside' }).webp({ quality: 84 }).toFile(`public/assets/props/${id}.webp`);
}
const map = Object.keys(ITEM_ART).map((id) => `  ${id}: 'assets/items/${id}.webp',`).join('\n');
fs.writeFileSync('src/assets/itemArt.js', `// Generated by tools/item-art.mjs: passive item id → icon image (relative to /public).\n// Items not listed keep their drawn glyph icon.\nexport const ITEM_ART = {\n${map}\n};\n`);
console.log(`${Object.keys(ITEM_ART).length} item icons written`);
