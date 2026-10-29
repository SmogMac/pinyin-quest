# Adventure Mode design

**Six characters. Six Mandarin minigames. One signature move each. Passive items decide the build.**

Basic combat is automatic. Each hero has exactly one manually activated **signature move**, powered by their own learning minigame. Most rewards are **passive items** that can change almost every part of how a hero fights.

## The loop

1. Pick a hero (swipe the Home line-up), then a **biome** for Act 1 on the route screen.
2. Travel up a **branching scroll map**: battles, elites, campfires, treasure, shrines, merchants, teachers, encounters, and secret nodes revealed by words you know.
3. **Battles are real-time.** The hero moves, attacks, dodges and blocks automatically; enemies move, charge, summon, shield and curse.
4. Your hero has one **signature move** (it can never be replaced). When it's charged, tap the big button (or press 1 / Space) and that hero's own Mandarin puzzle slides up while the **fight keeps going**. Solve it → the move fires and goes on cooldown. A wrong answer → it fizzles, shows the answer, and goes on cooldown. Cancel → it stays ready. There is no timer.
5. Win → choose 1 of 3 **passive items**, plus ink (墨) for merchants. There are no spells to find.
6. Beat the biome **guardian** → full heal, next act. Act 3 is the **Ink Dragon's Lair**. After 3 dragon victories you can continue into **The Forgotten Beyond** and face the **Word Eater**.

Runs save after every step, so you can close the app between encounters and resume later. A battle is saved as finished the moment it ends (before the Victory/Defeat screen), so reloading never replays a completed fight.

### Starting, continuing and abandoning runs

The Adventure menu always offers **xīn mào xiǎn · New Run**; **jì xù mào xiǎn · Continue Run** and **fàng qì mào xiǎn · Abandon Run** appear while a run is in progress (Home's big button continues directly). Starting a new run over an unfinished one, or abandoning it (also from the in-run items menu, even mid-battle), always asks for confirmation first. All of it goes through `game/runManager.js`, which only ever replaces or clears `adventure.current`: vocabulary and review data, XP, heroes, achievements, story, boss victories, discoveries and lifetime statistics are never touched. Changes are written to storage immediately, so an abandoned run can't reappear after a refresh. `tests/runs.test.js` covers these rules.

### Battle flow

`FIGHTING → RESOLVED (result saved once) → Victory/Defeat overlay → Continue → rewards / map / end screen`

- The engine runs at a fixed 20 Hz (`COMBAT.dt`); the screen interpolates positions between steps, so motion is smooth at any display rate and the simulation never depends on frame rate.
- Pending engine events are drained every frame, including ones emitted by player actions between steps (a signature move that kills the last enemy). After every tick, `Battle.settle()` kills any unit at 0 HP and declares the winner, so simultaneous deaths, damage over time, chain reactions and phase changes can't leave a fight unresolved. `tests/flow.test.js` covers these cases.
- Saved runs from the spell versions carry on: every pickup spell is removed and refunded as 40 ink, a pending spell reward becomes an item choice, spells leave shops, and a one-time notice explains the change. Vocabulary, unlocks, story, achievements and statistics are untouched.

### Positioning, knockback and Momentum

Combat happens on a real battlefield in world units (`COMBAT.worldW` = 130, about 30% wider than before relative to the characters). The camera maps it onto the stage and adapts its zoom to the screen width; gameplay never depends on screen size or frame rate (fixed 20 Hz steps).

- **Two zones:** the left half is the Hero Zone, the right half the Enemy Zone. Anyone can cross; the zones are territory, not walls (a faint ground tint and a brush mark show the line).
- **Momentum:** standing in the *other* side's half gives +25% attack speed (`COMBAT.momentumAspd`) to basic attacks (not the signature cooldown). Effects can also *grant* Momentum for a while wherever you stand (Go All Out!, Juicy, War Drum, Charged Up); granted Momentum is tracked separately and drawn with gold chevrons. A ±3 buffer at the midpoint (`COMBAT.zoneBuffer`) stops it flickering. Shown as two orange chevrons beside the character (left of heroes, right of enemies).
- **Knockback:** every basic attack pushes by its weight (`attack.kb` for heroes, `kb` for enemies; crits ×1.5; Léi's ball and chain 7, a qi orb 1.5); Deny Danger!, Knockback! and many items launch harder; enemies flung into the **far wall** slam into it (`onWallHit`), and enemies knocked into each other collide (`onCollide`); a Frozen enemy hit by a heavy impact Shatters; bosses push hardest with telegraphed charge attacks. Pushes slide out smoothly over ~0.3s. Pushes of 3+ stagger (no moving or attacking until recovered, but the swing timer keeps counting). `kbRes` resists pushes (bosses 70%, guardians 50%, golems and turtles 50%, Léi 35%). Pulls are a separate effect (`battle.pull`), used by Léi's Chain Pull and the Chain Hook item.
- **Dodging** is a real hop backwards (`COMBAT.dodgeHop`): no damage, but ground is given up.
- **Movement speed matters:** fast heroes (Fú Yún +30%, Méi +15%) reach the line first, chase knocked-back enemies and win back ground after a dodge; slow bruisers (Léi −10%) hold it with heavy pushes and knockback resistance.
- **Positioning AI:** heroes press to a line just past the midpoint (or chase into range) and step back up to it after being pushed; ranged heroes stop at body contact and only give ground when an enemy is right on top of them. Enemies close to attack range; `stance: 'aggressive'` enemies move faster and their shooters press into your half, `'defensive'` shooters hold their own half. Movement uses hysteresis so nobody jitters, ground enemies keep a body-width apart (`COMBAT.minGap`), and nothing leaves the arena.
- **Items and synergies** for this: Relentless Advance, Thunderous Impact, Battle Standard, Countercurrent, Iron Roots, Reckless Charge, Territorial Guardian, Chain Hook, Swift Pursuit, Heavy Frame, Hit and Run, Boundary Stone, Long Stride; synergies Vanguard Charge, Line Breaker, Wind Rider, Hold the Line, Fighting Spirit, Border Wall, Storm Hammer. New hook triggers: `onKnockback`, `onKnocked`, `onRecover`, `onMomentum`, `modKnockback`, `modKnockOut`; new stats `kbPct`, `kbRes`, `momentumAspd`.

### Battle screen

The battlefield shows the characters, attacks, the hero's health bar over the hero, one boss bar at the top, status pips, Momentum chevrons (plus a Momentum chip in the HUD), ground effects (banana peels, flame trails, ink trails, storm barriers) and **one signature button**: the hero's own icon, a cooldown dial, a ready pulse, the compact pinyin name, and a timer while one of its buffs is running. Enemy names and health bars are not drawn on the field: tap an enemy (or the eye button) to inspect it. Passive items and synergies live in the chest panel.

### Route map

Every line on the scroll is drawn from the same graph the game navigates (`node.next`): solid ink for the route you took, red glowing paths with a flowing stroke for your next choices, dashed paths for routes still reachable later, and faint lines for routes no longer open. Generation never lets two routes cross. **Relaxed casting** (Settings) slows combat to 40% while a puzzle is open; normal play never pauses or slows.

## Signature moves (`data/signatures.js`, `learn/signaturePuzzles.js`, `components/SignaturePuzzle.jsx`)

Each hero always plays the same kind of minigame; only the question changes.

| Hero | Move | Minigame (learning focus) | Effect |
| --- | --- | --- | --- |
| Xīn Yí | **shuǐguǒ shālā · Fruit Salad!** (5.5s) | an emoji fruit → pick its pinyin from 4 (10 fruits) | the named fruit is summoned. Thrown: apple (heavy hit, shatters Frozen), grape (volley), watermelon (area + Wet), banana (slippery peel: enemies stumble), lemon (Weaken all). Eaten: orange (heal), strawberry (shield), mango (attack speed), pear (defence + block), peach (heal over time) |
| Méi | **nàixīn jiàn · Patient Blade** (5.5s) | a number word in pinyin (yī … shí) → pick its digit from 1–10 | a composed stance, then a great sword arc: 160% attack to every enemy as a guaranteed crit, a small push, and 3s on guard (block + defence) |
| Huǒ Jìn | **rèqíng ránshāo · Burning Passion!** (11s) | select every encouraging phrase among 6 (praise vs criticism; bùcuò and méi wèntí are positive) | 8s fire aura: +35% attack speed, +20% damage, basic attacks Burn and leave flame trails |
| Ruì Zhé | **jùjué wēixiǎn · Deny Danger!** (10s) | drag or tap bù / méi / méiyǒu into a sentence (the English meaning makes one answer correct) | unroll the scroll: a strong shield and a shockwave that throws every enemy far back, almost no damage |
| Fú Yún | **quánlì yǐfù · Go All Out!** (11s) | a body part (emoji, or a figure with the part lit) → pick its pinyin | 5s frenzy: every hit crits, faster attacks, Momentum anywhere |
| Léi | **jītuì · Knockback!** (7s) | an English word (and its audio) → pick the spelling with the right tone; options differ only in the tone mark | an overhead swing that blasts every enemy back into the far wall, no damage (guardians and bosses slide part of the way) |

- **Separation of concerns:** puzzle generation and validation (`TEMPLATES[...].generate`, `checkSigAnswer`) → activation and cooldown (`Battle.beginCast / finishCast / cancelCast`) → the combat effect (`SIGNATURES[...].cast`) → passive interactions (`modSignature`, `onSignature`, `onSignatureFail`, plus move-specific triggers). A new hero can bring a completely new minigame by adding a template, a body component and a move.
- **Vocabulary:** curated, verified pools with pinyin first; Hanzi is optional and secondary (hidden with *Hide Hanzi*), never needed to answer.
- **Teaching first:** the first time a word appears it is taught, not tested (the answer glows; unfamiliar phrases show their meaning; the negation rule is shown).
- **Spaced repetition:** targets are weighted toward weaker and newer words and never repeat back to back. Every word is tracked; words that are in the vocabulary list update their review schedule and earn XP, but only once per word per battle, so repeating a small pool mid-fight can't farm mastery.
- **Soundless Mode:** every minigame is visual except Léi's, which then shows the meaning plus a drawn tone contour and the tone number, so it can always be answered (with sound on, a hint button reveals the contour).
- **Relaxed casting** (Settings) slows combat to 40% while a puzzle is open; normal play never pauses or slows.

## Elements, statuses, reactions, terrain (`data/elements.js`)

Eight elements: fire, ice, water, earth, lightning, wind, dark, light (+ physical). Elements define how attacks look, which status they bring and how they react. **There are no elemental resistances, weaknesses or immunities:** no enemy takes less from fire because it lives in water. What changes damage is the target's *current state*.

Statuses: Burn, Chill, Frozen, Wet, Shock, Curse, Stun, Dazzle, Bleed, Slow, Weaken (deals 30% less), Marked (takes 20% more from you).

Reactions (element hitting a status): **dǎo diàn** Conduct (lightning + wet, chains to all wet), **róng huà** Melt (fire + frozen ×2), **fěn suì** Shatter (earth or any heavy impact, such as a big knockback or a wall slam, on frozen), **zhēng qì** Steam (fire + wet → dazzle), **yě huǒ** Wildfire (wind + burn spreads), **jìng huà** Purify (light + curse ×2, a purifying explosion, heals), **bào zhà** Explosion (lightning + burn), **rì shí** Eclipse (dark + dazzle). Chill on Wet → **Flash Freeze**; Wet douses Burn. Biomes can still favour an element slightly for everyone (e.g. wind and fire in the bamboo forest).

Terrain states: wet, frozen, burning, electrified, corrupted, blessed, obscured, unstable. Elements change terrain (frozen + fire → wet; wet + lightning → electrified; corrupted + light → blessed; …).

## Biomes (`data/biomes.js`)

| Act | Biome | Mechanics | Unlock |
| --- | --- | --- | --- |
| 1 | zhú lín 竹林 Bamboo Forest | wind gusts push enemies and spread fire; wind/fire +15% | always |
| 1 | hǎi biān 海边 Coastal Ruins | waves make everyone Wet; lightning +20%, fire −15% | always |
| 1 | shān dòng 山洞 Earthen Caves | tremors stun at random; earth +20% | always |
| 2 | xuě shān 雪山 Frozen Mountain | frozen ground slows and Chills; fire melts it to water | learn lěng / xuě / dōng tiān |
| 2 | léi yǔ 雷雨 Thunder Highlands | lightning strikes; wet ground electrifies | learn diàn / yǔ |
| 2 | zhǎo zé 沼泽 Shadow Marsh | corrupted ground: healing −40%, dark +30%, shadows regenerate | learn hēi / yè |
| 2 | sì miào 寺庙 Lantern Temple | blessed ground; floors reflect 20% of enemy shots | learn guāng / dēng / yáng guāng |
| 3 | mò lóng dòng 墨龙洞 Ink Dragon's Lair | ink rain Curses you | always |
| 4 | yí wàng zhī dì 遗忘之地 The Forgotten Beyond | tremors, mist, ink rain | 3 dragon victories |

If no Act-2 land is unlocked yet, Act-1 lands are offered again (harder), so nobody is stranded.

Secret nodes: a **secret merchant** (better stock, discounts) appears once you know qián (钱, money); the **Jade Rabbit** (玉兔, a secret boss with an epic reward) can appear in the Lantern Temple once you know yuè liang and have beaten the dragon.

## Bosses

- **mò lóng 墨龙 Ink Dragon** (3 phases): telegraphed ink breath (interrupt with freeze/stun or tank with shields) and bat summons → spreading ink (corrupted + misty ground, Weakening hexes) → rage (faster, ink rain curses).
- **tūn zì shòu 吞字兽 Word Eater** (3 phases): corrupts your signature move (weaker, slower to recharge), summons **Word Wraiths** labelled with words you've learned → silences your passive items → saps your strength (Weaken) and devours your shields.
- Biome guardians (panda king, crab queen, stone king, snow maiden, thunder qilin, bog witch, lantern king) each have a signature behaviour.

## Passive items and synergies (`data/items.js`, `data/synergies.js`)

141 passive items (35 of them hero-specific, offered only to that hero) and 54 synergies. Items are real gameplay triggers, not descriptions: on basic attack, crit, dodge, block, taking damage, healing, shield creation and break, knockback, wall slams and enemy collisions, entering the enemy half, while Momentum is active or inactive, when it expires, on signature success or failure, while a signature buff runs, on status application, on enemy death, on elemental reactions and on entering a new battlefield. Examples: Ghost Step (dodges leave a decoy), Counterstrike, Afterimage, Last Stand, Overextension, Second Wind, Invader's Mark, Cursed Crown, Echoing Soul, Lingering Power, Final Word, Ink Resonance, Reckless Magic, Wallbreaker, Chain Collision, Mirror Brush, Ink Parasite, Broken Hourglass, Chaotic Scroll, Twin Shadows, Overflowing Ink. Synergies chain them: e.g. Thunder Counter (counterattacks always crit → Spark Arc lightning), Demolition (wall slams explode), Double Helping (Echoing Soul serves a second fruit at full power), Storm Flail (wall slams arc lightning), Peel Dancer (slipping enemies trigger your dodge effects).

## Extending the game

Everything below is data; the engine never needs to change for normal content.

- **Passive item** (`data/items.js`): add an entry with `py/zh/en`, `element`, `rarity`, `category`, `desc`, optional `stats` (see `STAT_KEYS` in combat.js) and/or `hooks`, and `hero: 'mei'` to make it hero-specific. The full list of triggers is at the top of `items.js`. Use the Battle API: `damage, applyStatus, heal, addShield, knockback, pull, addBuff, extendBuff, grantMomentum, addZone, setTerrain, spawnAlly, schedule, castEffect, reduceCooldowns, shatter, label, emit`. Add `requires: ['火']` to gate it behind vocabulary.
- **Synergy** (`data/synergies.js`): `requires` lists item ids and optionally a hero's signature id; give it `hooks` and/or `stats`, or set `battle.flags` that item hooks read.
- **Signature move** (`data/signatures.js`): `hero`, `py/zh/en`, `template` (its minigame), `element`, `cd`, `icon` (drawn in `SigIcon.jsx`), `desc`, `cast(battle, ctx)` using `ctx.power` and `ctx.choice`, optional always-on `hooks`.
- **Minigame**: add a template in `learn/signaturePuzzles.js` (`TEMPLATES`: pool, `generate`) and, if it needs a new interaction, a body in `components/SignaturePuzzle.jsx` (`BODIES`).
- **Hero** (`data/heroes.js`): stats, `attack` style (`attack.fx` picks the attack visuals), `signature` move id, `passive` with hooks (passives are never silenced; optional `meter` shows a charge gauge), unlock rule, sprite key.
- **Enemy** (`data/enemies.js`): stats, `element`, `onHitStatus`, `ai` behaviours (charge, summon, guard, hex, silence, hazard, shell, corrupt, devour, regen, nuke, onSpellHit) and boss `phases`.
- **Biome** (`data/biomes.js`): terrain, periodic events, element modifiers, enemy pools, guardian/boss, unlock words; add it to `ACT_BIOMES`.
- **Story / events**: `data/story.js` (beats shown once) and `data/events.js` (encounter questions and rewards).

Safety: hooks run with a recursion depth limit (`COMBAT.maxHookDepth`) and a per-step proc budget (`COMBAT.maxProcsPerStep`), self-feeding items keep short internal cooldowns, ground effects are capped, and a crashing hook is logged instead of breaking the battle. `npm test` runs every item and synergy in a real battle and checks that, for every hero, a build holding *every* item at once still resolves quickly.

## Old saves

Learning progress, levels, heroes and achievements carry over. Your Ink Dragon victories from the old version count toward the Word Eater unlock. An adventure run that was in progress under the old system is retired with a short notice.
