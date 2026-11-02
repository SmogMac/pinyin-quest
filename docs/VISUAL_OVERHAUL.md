# Visual direction, animation and game feel: report

What was audited, changed and verified, and what is still open. All 98 tests pass, and the changes were checked in the running game at desktop and phone size.

## Art assets: what I could and couldn't do

**There was no image-generation tool in this session**, so no new illustrated backgrounds, enemies or effects were painted.

The art I did add uses two existing sources:

- **Painted scenery:** the hand-painted artwork in `icon_asset_pack/`, the same style as the item icons and close to the hero sprites.
- **Status and impact visuals:** sprite animations from the effects pack.

The backgrounds and enemies are still SVG, but the enemies have been redrawn in the heroes' style (see section 6).

## 1. Combat timing (highest priority)

**Audit:**

1. **Damage was applied the instant an attack started.** The battle screen then hid this:
   - For projectiles, it delayed only the damage numbers until the shot arrived. The **knockback had already started at launch**.
   - For melee, damage numbers and the red flash appeared **about 150 ms before the sword lunge peaked**.
2. **Xinyi's thrown fruit** damaged, pushed and soaked enemies about 0.7 s before landing.
3. **Attack animations ran at a fixed 280 ms** regardless of attack speed.
4. **Stunned or killed enemies still landed** attacks the engine had already decided.

**Fix (in the engine, not with visual delays):**

- **Wind-up and contact.** Every attack has an animation length and a contact moment (`COMBAT.timing`). In the game these come from the FX Studio's attack animations, so the engine and the screen use the same numbers.
  - Melee damage, knockback and statuses happen at contact.
  - Projectiles are released at contact and fly for an engine-chosen time based on distance. They hit on arrival, and the screen animates the projectile for exactly that time.
- **Attack speed.** The animation plays faster for faster attackers (never longer than 85% of the time between attacks), and Chill slows the swing as much as it slows the attack rate. Contact stays in sync at any speed.
- **Interrupted attacks.** A stunned, frozen or defeated attacker never finishes its attack, and melee swings at a target pushed out of reach miss.
- **Xinyi's fruit.** Thrown fruit take effect when they land; grapes are timed projectiles.
- **FX Studio.** The Animations tab now shows each attack animation's 💥 **contact** moment and lets you move it. Moving it changes when attacks land in the game.

**Verified:**

- `tests/timing.test.js` covers melee contact, projectile arrival, statuses applied on impact, faster animations at higher attack speed, interrupted swings and fruit landing.
- In the running game, I recorded projectile start, flight and damage-number timestamps frame by frame. Damage appears within one 50 ms simulation step of the visual arrival (e.g. landed at 1026 ms, damage at 1078 ms).
- Balance barely moved: dragon wins are 62–82% across the six heroes.

## 2. Character animation states

- **Animation priorities** (in `BattleScreen`):
  1. defeated
  2. frozen
  3. stunned (dazed)
  4. a playing action
  5. sliding from a knockback
  6. victory
  7. charging
  8. walking
  9. idle
- **Within actions, lower-priority animations don't cut off higher ones.** A hurt flinch no longer cancels a swing, but a knockback does. Signature cast animations lock out everything else.
- **Frozen** stops all animation, including animation inside the sprite. **Stunned** has its own dazed wobble, so the two look distinct.
- **A sliding unit leans back** instead of walking in place.
- **Chill and Slow** slow idle, walk and attack animations by exactly their gameplay slowdown. Removing them restores the right speed, and other speed modifiers stay intact because each animation's speed is set from the current statuses every frame.
- **Ground shadows** under every unit, including flyers (cast on the floor below them).

## 3. Statuses shown on the character (floating icons removed)

| Status | Look |
| --- | --- |
| Burn | flames on both sides and at the feet, with a soft flame behind the body; orange glow; bigger for intense burns; smoke when it ends |
| Frozen | all animation stops; crystalline ice block with highlights; cyan tint; ice breaks when it ends |
| Stun | dazed wobble with gold stars circling the head |
| Wet | falling droplets and a damp blue sheen; splash when applied |
| Shock | flickering lightning arcs (yellow) |
| Bleed | occasional restrained red slashes |
| Curse | dark ink wisps with drifting 墨 and 咒 characters; darkened tint |
| Chill / Slow | cool tint and slowed animation |

- **Readability:** at most two overlays and one tint show at once, in order of importance, and the red hit flash still wins.
- **Hero health:** the hero's status chips in the HUD stay as information.
- **FX Studio:** the looping sprite effects are FX config effects (`look_burn`, `look_shock`, `look_dazzle`), so the studio can swap them. Freeze and burn endings are editable cues (`status.thaw`, `status.burn_out`).
- **Checked in the game:** a burning hero, a frozen enemy, a stunned and wet enemy, and a cursed enemy.

## 4. Hit weight and camera

- **Hitstop:**
  - critical hits: 50 ms;
  - critical signature hits: 70 ms;
  - wall slams: 80 ms;
  - heavy blows on the hero (8%+ of health): 90 ms.

  The simulation pauses and the units involved hold their pose. It's rate-limited, so rapid multi-hits don't stutter.
- **Screen shake setting** (Settings → Screen shake: Full, Gentle, Off). Reduced motion turns it off. Shake was already reserved for big events (Lei's blast, boss slams, explosions, big knockbacks).
- **Red damage flash kept.**

## 5. Backgrounds and environment

**Everything is fully opaque.** Distance comes from colour (mixed toward the sky, or CSS filter tints on the painted props), never from see-through layers, so overlapping parallax layers don't show through each other. No sharp spikes: cave stalactites are rounded drips and the storm's lightning bolt is gone (the clouds are soft two-tone shapes).

**Painted scenery** (from the icon art, tinted by distance):

| Area | Scenery |
| --- | --- |
| Lantern Temple | a glowing pagoda in the distance, swaying phoenix banners |
| Ink-Corrupted Valley | a dark pagoda, a dragon banner |
| Burning Highlands | an ember-lit pagoda on the far hills |
| Forgotten Beyond | hanging calligraphy scrolls and an ink-wash pagoda |
| Shadow Marsh | a misty purple pagoda |

Sizes, positions and opacity were tuned in the game; each piece is drawn once in the scrolling road.

**Ambient motion:**

- Bamboo Forest: falling leaves.
- Frozen Mountain: falling snow.
- Shadow Marsh: fireflies.
- Earthen Caves: floating dust.
- Coastal Ruins: sea spray.
- Ink-Corrupted Valley: falling ink drips.
- Burning Highlands: rising embers.
- Forgotten Beyond: drifting characters.

Every particle has its own position, speed, start time, size, drift, sway and spin (stable pseudo-random values), so none fall in step. The particles are their own layer that doesn't scroll with the world, so they never jump when a scrolling layer loops. CSS only; hidden for Reduced motion.

**SVGs kept, and why:** the sky gradients, hill layers, ground and simple decor (bamboo, waves, lanterns) are readable and cheap, and parallax-friendly. They are the weakest art next to the hero sprites, but replacing them well needs painted backgrounds.

## 6. Enemy art

All 17 vector enemies and the fox companion were redrawn with a shared kit (`src/assets/enemies/ink.jsx`) that matches the hero sprites:

- thick near-black outlines (the heroes' line colour);
- two-tone cel shading on every shape, shadow away from the upper-left light;
- glossy highlights;
- big anime eyes with iris, lighter lower half, pupil and two shines (glowing eyes for constructs and spirits);
- blush, fangs, belts, buckles and similar small details.

The crab, zombie and ink dragon were already painted with outlines and are unchanged.

## 7. Still open

- **Painted backgrounds and enemies.** The vector enemies now share the heroes' outlines and shading, but they're still flatter than the painted heroes. Painted PNG/WebP art can replace any of them in `src/assets/manifest.js`, and painted backdrop layers can go in `public/assets`.
- **UI pass.** Menus, merchant, codex and the victory screen were not redesigned this round, only checked to work at phone width.
- **Timing granularity.** Hits land on the simulation's 50 ms steps, so damage can trail the visual contact by up to one step.
- **Melee contact timing with a fixed pose.** If you lengthen an attack animation in the FX Studio, contact moves with it. The animation itself is still a keyframed pose of the whole sprite, not frame-by-frame art.
