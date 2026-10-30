# FX Studio

A small editor for everything that *looks* like something in a fight: sprite effects, what plays on each battle event, how projectiles fly and how characters move when they attack, get hit, cast and so on. It edits one file, `src/fx/fx.json`, and previews every change on the real battle screen.

```bash
npm run studio
```

That starts the dev server and opens **http://localhost:5173/editor.html**. (With `npm run dev` already running, just open that address.) The studio exists only on your computer: it is not part of the built game, and its endpoints answer only requests from this computer.

## The screen

- **Left:** the list for the current tab, with search, **New**, **Duplicate** and **Delete**.
- **Middle:** the live stage, which is the game's own battle screen with nothing simulated.
  - Pick the hero, the enemy (flying ones show air anchoring) and the map.
  - **▶ Play** (or Space) plays the selection.
  - **Loop** repeats it.
  - **Enemy → hero** swaps who does it and who it happens to.
  - **Speed** gives slow motion (½× to ⅒×).
  - **Distance** sets how far apart the hero and enemy stand.
- **Right:** the inspector for the selected item.
- **Top:**
  - Undo and redo (Ctrl+Z, Ctrl+Y).
  - The compile state.
  - **Test fight:** a real battle using your current, even uncompiled, effects.
  - **Compile** and **Publish**.

## Scrubbing frame by frame

Under the stage is a scrubber for whatever is selected:

- Drag it, or drag along the ruler above a cue's timeline, to freeze the preview at any moment.
- ◀ ▶ (or ← → and , .) step one frame (1/30 s), and Shift steps five.
- A frozen frame stays frozen while you edit, so you can tune an effect at the exact frame you are looking at.
- **● Live** (or Play) goes back to real time.

The frozen frame is exact: the preview replays from the start on a virtual clock and stops every animation (sprite effects, character poses, projectiles, trails, built-in effects) at its own age.

## Tabs

### Cues

A cue is what plays on one battle event; the game calls it by name (`hit.fire`, `wall.hit`, `sig.knockback.blast`, `fruit.watermelon`…).

**Layers.** A cue is a timeline of layers, each with its own delay. Drag a bar to retime it, and use ● to switch a layer off, ⧉ to duplicate it and ✕ to delete it. A layer is one of:

| Layer | Settings |
| --- | --- |
| **Effect** | a sprite effect; the settings are listed under "Effect layer settings" |
| **Animation** | a character pose on the target, source or hero, and how long to hold it |
| **Classic** | the built-in CSS effects (sword arcs, rings, slams, guard), on a unit or at the stage centre |
| **Shake** / **Punch** | screen shake or a camera punch (skipped for players with Reduced motion) |
| **Sound** | one of the game's sounds |

**Effect layer settings:**

- Attachment: target, source, hero, or a fixed spot in the world.
- Anchor override:
  - mid: centre of the body
  - ground: feet
  - head: above the head
  - beside: next to the shoulder, for buffs
  - front: ahead of the unit
- Offsets in body widths and heights. **Drag on the stage** to move the selected effect.
- Scale, speed, loops, rotation, opacity and hue shift.
- Mirroring:
  - auto: points along the action
  - reverse: points against it
  - facing: points where the unit looks
  - never
- **Follow the unit:** the effect moves with its unit, for auras.

**Browse pack…** swaps the layer to any animation in the pack. That creates a new named effect, so other cues don't change.

#### Signature moves

Each hero's move has its own group of cues (e.g. *Lei · Knockback!*). Picking one switches the preview to that hero.

- **`sig.<move>.cast`: the cast animation, with the 💥 impact.** It plays the moment the puzzle is solved. Build it from animation layers (your own poses, see Animations), effects, shake and sounds.

  The red **💥 impact** marker on the ruler (or **Impact at** in the inspector) says when the move actually takes effect: its damage, shields, knockback, fruit and so on. Until then the hero holds still, and only this cue's animations play on them. The preview plays the cast, then the move's own cues from the impact on.

  All six start at 0 ms (the move lands at once, exactly as before), so nothing changes until you set an impact.
- **`sig.<move>.hit`:** what each enemy hit by the move shows (by default the same as before).
- **The move's own phase cues** (e.g. `sig.knockback.swing` and `sig.knockback.blast`) play when the move takes effect, as before.

Add any effect, animation, shake or sound to any of these.

#### Items

The **Items** group holds one cue per passive-item visual (`item.bomb`, `item.thread`, `item.bell`, `item.swap`…). Item effects placed on the ground (seals, lanterns, pools) use the cue at that spot.

**Test fight** can give the hero no items, 10 random items, every epic item or every item, to see them in a real battle.

### Effects

Named looks, shared by every cue that uses them:

- the animation (**Swap animation…** changes it everywhere it's used);
- scale, anchor, the direction the art points, layer, frame rate, loops, hue (recolour), blend and opacity.

The panel lists the cues that use the effect. **New** creates an effect from any animation in the pack.

### Projectiles

For each projectile type (each hero style and element, enemy throws, Xinyi's fruit):

- **Look:** the built-in drawing, or a looping sprite effect flown instead.
- **Size.**
- **Flight time:** milliseconds per percent of stage crossed, with a shortest and a longest time.
- **Release delay:** how long after the throw animation starts the projectile leaves (for thrown fruit).
- **Path:** arc or straight. Arcs have a height and a spin; straight shots can point along their path.
- **Trail:** copies that fly the exact same path a little later, smaller and fainter, so a trail always follows the real route, arcs included. They are drawn separately from the projectile art.
  - Styles: *glow dots* in a colour you pick, or *echoes* of the projectile itself.
  - Settings: length, spacing, size, opacity and glow.
  - **Built-in tail** switches off the short tail that is part of some projectile drawings. It is off wherever a trail replaces it (orb, fire, ice, water, dark, light).
- **Launch:** the launch point, measured from the shooter's body, and the launch cue (e.g. the muzzle flash).
- **Throwers:** which enemies throw rather than fire.

### Animations

The characters' action poses (attack, shoot, smash, cast, hurt, dodge, block, knocked, pulled, land, eat, throw, stance, windup, slammed) as keyframes:

- **Pose settings:** length, easing, pivot, and whether to hold the last frame.
- **Keyframe values:** move, rotate, stretch, brightness and opacity.
- **Editing the track:** drag keyframes on the track, and double-click the track to add one.
- **Direction:** values are for the hero facing right; enemies are mirrored automatically.
- **Groups:** give poses a group (e.g. *Signature · Lei*) to keep a hero's own animations together, then use them in that hero's cast cue.
- **Scrubbing:** the slider under the keyframe track scrubs through the animation.

## Compile

**Compile** makes your changes part of the game:

1. It checks the config: every effect, pose, sheet and cue reference has to resolve.
2. It packs only the sheets the effects use into `public/assets/vfx/`, cropped to their frames. Each recolour is baked into its own file (`<sheet>@<hue>.png`), so the game needs no colour filters.
3. It deletes sheets nothing uses.
4. It writes `src/fx/fx.json`.

The running game hot-reloads with the result.

Work in progress is kept in the browser until you compile, so a reload or crash doesn't lose it. **Revert** throws away everything since the last compile.

`npm run vfx` runs the same packing from the command line.

## Publish

**Publish** shows the branch and every changed file. It then:

1. compiles, if needed;
2. runs `npm test` and `npm run build`;
3. commits **all** changed files with your message;
4. pushes.

It stops at the first failing step, and nothing after that step runs.

Pushing to `main` deploys the live site through GitHub Actions. Publish uses your own git identity and credentials, the same as pushing from a terminal.

## Notes

- **The VFX pack:** the Super Pixel Effects Gigapack (free version) by Will Tice / unTied Games lives in `vfx/` and is not committed. Its license allows shipping the effects in the game, but not redistributing the pack. The studio browses the whole pack, and Compile copies in only what the game uses.
- **Gameplay is unchanged:** the studio changes visuals and timing only. When something plays (thresholds, rate limits, which event fires) stays in `BattleScreen.jsx`.
- **Tests:** `tests/fx.test.js` checks the following, and fails if you forget to compile:
  - every cue the battle screen plays exists;
  - every reference resolves;
  - every sheet is packed.
