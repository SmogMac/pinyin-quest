# Replacing art assets

All visuals are looked up by **key** in `src/assets/manifest.js`. The combat engine (`src/game/combat.js`) and run logic only ever store keys such as `'slime'` or `'fireball'`, so replacing art means editing the manifest and adding files. No game code changes.

Put image files under `public/assets/…`. Manifest paths are relative to `public/`, e.g. `assets/enemies/slime.webp`.

## Sprites (`SPRITES`)

Three entry forms are supported:

```js
// 1. Built-in vector component (current default)
slime: { component: Slime, w: 92, h: 83 },

// 2. Single still image (PNG / SVG / WebP / animated WebP)
slime: { src: 'assets/enemies/slime.webp', w: 92, h: 83 },

// 3. Sprite sheet: one row per animation state, frames left→right
slime: {
  w: 92, h: 83,
  sheet: {
    src: 'assets/enemies/slime-sheet.png',
    frameW: 184, frameH: 166, fps: 10,
    states: { idle: [0, 6], walk: [1, 6], attack: [2, 5], hurt: [3, 2], dead: [4, 6], victory: [0, 6], cast: [2, 5] },
  },
},
```

- `w` and `h` are the display size in CSS pixels at scale 1. The battle stage then scales each unit: hero 0.8, normal enemies 0.74, elites and the boss 0.78. Supply art at **2× the display size** for crisp phones, e.g. a 184×166 frame for a 92×83 slime.
- `states` maps each state to `[row, frameCount]`. Any missing state falls back to `idle`.
- Feet should touch the **bottom edge** of the frame; units stand on the ground line.
- Facing: the **hero faces right**, **enemies face left**. Add `flip` in `Sprite` if your art faces the other way.
- `flying: true` adds a hover bob (used for the bat and the wisp). `hop: true` adds a hopping bounce (the jiāng shī).

### Animation states

| State | When | Notes |
| --- | --- | --- |
| `idle` | default | loop |
| `walk` | units walk in before combat | loop |
| `attack` | basic attack (~260 ms) | play once |
| `cast` | ability cast (~380 ms) | play once |
| `hurt` | took damage (~220 ms) | play once |
| `dead` | defeated | hold last frame |
| `victory` | hero after winning | loop |

Built-in vector sprites also get CSS motion (lunge, shake, fade), keyed by the `st-<state>` class on `.sprite`. Sheet sprites get the same CSS motion on top of their frames. Turn that off by removing the `.st-*` rules in `src/styles/app.css`.

### Hero art pipeline

Put the original (transparent PNG/WebP, or a plain white background) in `tools/art-source/`, add a job to `JOBS` in `tools/process-art.mjs`, and run `npm run art`. Enemy art goes through the same script into `public/assets/enemies/`. The script removes a plain white background if there's no transparency, trims empty margins, resizes to 420px tall and writes WebP to `public/assets/characters/`. Then add a manifest entry with the same aspect ratio, e.g. `mei: { src: 'assets/characters/mei.webp', w: 96, h: 142 }`, and reference that key from the hero's `sprite` in `src/game/data/heroes.js`. Heroes should face the viewer or to the right, with feet at the bottom edge.

### Current keys and recommended sizes (display size, supply 2×)

| Key | Who | Display size |
| --- | --- | --- |
| `xinyi` | Xīn Yí (image) | 112×142 |
| `mei` | Méi (image) | 96×142 |
| `ruizhe` | Ruì Zhé (image) | 87×142 |
| `huojin` | Huǒ Jìn (image + animated flame layer) | 103×142 |
| `fuyun` | Fú Yún (image) | 107×142 |
| `lei` | Léi (image) | 100×142 |
| `companion` | Fox Spirit ally | 64×56 |
| `slime`, `sporecap`, `bat`, `goblin`, `golem` | normal enemies | ~90–130 square |
| `wisp`, `knight` | elites | ~115×125 |
| `crab` | páng xiè (image) | 124×80 |
| `zombie` | jiāng shī (image, `hop: true` bounces it) | 78×128 |
| `wyrm` | mò lóng, the Ink Dragon (image) | 170×230 |

Enemy definitions in `src/game/data/enemies.js` reference sprites through their `sprite` field, so a new enemy just needs a new manifest key.

### Passive item icons

89 passive items use painted art from the source pack in `icon_asset_pack/` (kept out of git; the originals are 1024×1024). `npm run item-art` (`tools/item-art.mjs`) holds the item → picture map, trims each picture, writes 128×128 WebP files to `public/assets/items/<item id>.webp`, and regenerates `src/assets/itemArt.js`. `ItemIcon` shows the art on a tile tinted by the item's element, with the rarity ring around it. Items without a picture keep their drawn glyph. To give one art, add a line to the map and run the script again.

### Signature move icons

Each hero's signature button shows painted art from `public/assets/signatures/<signature id>.webp` (200×200, transparent corners), listed in `SIGNATURE_ICONS` in `src/assets/manifest.js`. The cooldown is drawn over the art in CSS (a dark clockwise sweep plus the seconds left), so the art itself needs no states. A move without an entry falls back to the drawn SVG in `SigIcon.jsx`.

### Attack and signature visuals

Each hero's `attack.fx` in `heroes.js` picks how basic attacks look: melee `slash` (sword arc), `dagger` (crossing cuts) or `chain` (ball and chain slam); ranged `orb`, `dart` or `fire`. Elemental projectiles, impacts and lightning bolts are drawn per element, and each signature move has its own effects (`sigFx` in `BattleScreen.jsx`, styles in `src/styles/signature.css`). All of it is CSS and animates only transform and opacity.

### Effect layers

A sprite can carry an animated effect drawn on top of it, such as Huojin's palm flame:

```js
huojin: { src: 'assets/characters/huojin.webp', w: 103, h: 142, fx: { src: 'assets/characters/huojin-fire.webp', kind: 'flame', origin: '84% 44%' } },
```

The effect image has the **same canvas** as the character, so it lines up when stacked. In `tools/process-art.mjs`, list it under the character job's `layers` so both are cropped with the same box. `kind` picks the CSS animation (`.fx-flame` in `app.css`: a flicker plus the `#fx-flame-wave` SVG ripple filter from `Sprite.jsx`), and `origin` is the point the effect sways from (the flame's base). The effect stops on still or greyed heroes and hides on locked silhouettes and when the hero is defeated.

## Ability and upgrade icons (`ABILITY_ICONS`)

```js
fireball: { glyph: 'flame' },                          // built-in glyph on an element-coloured badge
fireball: { src: 'assets/icons/fireball.png' },        // your image (square, 128×128 recommended)
```

Glyph names are listed in `src/assets/icons/Icons.jsx`. Badge colours come from `ELEMENTS` in `src/game/data/elements.js`.

## Backgrounds

`src/assets/backgrounds/Backgrounds.jsx` draws four parallax layers per theme: sky, far hills, mid trees, near bushes and ground. Adventure maps use the ink-wash themes (`bamboo` … `volcano`, `inklair`, `beyond`), each with its own foreground decor in `BgDecor`; the quick-battle themes (`forest`, `dusk`, `ember`, `lair`) are chosen by floor in `themeForFloor`. To use painted backgrounds, replace the content of `BgSky`, `BgFar` and the rest with an `<img>` of your layer. Layers other than the sky are drawn twice side by side and scrolled by 50% during the walk-in, so each layer image must **tile horizontally**. Suggested layer size: 1600×800 (sky), 1600×400 (others), PNG or WebP with transparency.

## Effects

Battle effects are sprite sheets from the **Super Pixel Effects Gigapack (free version) by Will Tice / unTied Games**, plus a few CSS effects where the pack has nothing equivalent (sword arcs, lightning bolts, projectiles: the free pack has no travelling projectiles).

- Everything visual about a fight is data in `src/fx/fx.json`: sprite **effects** (sheet, scale, anchor, direction, layer, colour), **cues** (what plays on each battle event: effects, character animations, built-in CSS effects, shake, sounds, each with its own delay), **projectiles** (speed, arc, spin, launch point) and character **animations** (keyframed poses). Edit it with the **[FX Studio](FX_STUDIO.md)** (`npm run studio`), which previews on the real battle screen and packs the sheets on Compile.
- The pack lives in `vfx/` and is **not committed** (its license allows bundling with the game, not redistributing the pack). Compile (or `npm run vfx`, `tools/fx-pack.mjs`) copies only the sheets the effects use into `public/assets/vfx/`, cropped to their frames, with recolours baked into `<sheet>@<hue>.png`. Every animation plays at 15 FPS, as the pack recommends.
- `BattleScreen.jsx` decides *when* (which event, thresholds, rate limits) and plays cues by name; placement uses each unit's real sprite size, and a target's hit effects wait until the projectile actually arrives.

## Naming conventions

```
public/assets/characters/hero.webp          hero-sheet.png
public/assets/enemies/<key>.webp            <key>-sheet.png
public/assets/icons/<upgrade_or_synergy_id>.png
public/assets/backgrounds/<theme>-<layer>.webp   (forest-sky, forest-far, forest-mid, forest-near, forest-ground)
```

Use lowercase and hyphens, and match the manifest key.
