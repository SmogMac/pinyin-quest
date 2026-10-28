# Adventure Mode design

**Learning words gives you magic. Passive items transform that magic. Your decisions decide the route.**

## The loop

1. Pick a hero (swipe the Home line-up), then a **biome** for Act 1 on the route screen.
2. Travel up a **branching scroll map**: battles, elites, campfires, treasure, shrines, merchants, teachers, encounters, and secret nodes revealed by words you know.
3. **Battles are real-time.** The hero moves, attacks, dodges and blocks automatically; enemies move, charge, summon, shield and curse.
4. You hold **up to 3 active spells**. Tap a charged spell and a compact Mandarin puzzle slides up while the **fight keeps going**. Solve it → the spell fires and goes on cooldown. Get it wrong → it fizzles, shows the answer, and goes on cooldown. Cancel → the spell stays ready. Only one puzzle can be open; there is no timer.
5. Win → choose 1 of 3 **passive items** (or sometimes a new spell, which you can take, swap in or leave), plus ink (墨) for merchants.
6. Beat the biome **guardian** → full heal, next act. Act 3 is the **Ink Dragon's Lair**. After 3 dragon victories you can continue into **The Forgotten Beyond** and face the **Word Eater**.

Runs save after every step, so you can close the app between encounters and resume later. **Relaxed casting** (Settings) slows combat to 40% while a puzzle is open; normal play never pauses or slows.

## Spellcasting puzzles (`src/learn/puzzles.js`, `src/components/CastPuzzle.jsx`)

| Type | What you do | Audio? |
| --- | --- | --- |
| syllables | Connect pinyin syllables in order (tap or drag) to say a word or the spell's own name | no |
| meaning | Pinyin → pick the English meaning | no |
| recall | English → pick the pinyin | no |
| picture | Pinyin → pick the matching picture | no |
| shape | Read a shape word (yuán xíng, fāng xíng, sān jiǎo xíng, xīng xíng) and draw it | no |
| phrase | Arrange a known sentence from its words | no |
| listen | Hear a word, pick the meaning | yes |
| tone | Hear a word, pick the correct tones | yes |

- Puzzles only use words you've met and answered correctly at least once, plus the spell's own name (taught on the spell card) and shape words (shown with an English hint until learned). Brand-new players get spell-name and shape puzzles.
- Words are chosen with a bias toward **due/weak words** and the **spell's element** (fire spells tend to ask fire words). Answers update the spaced-repetition schedule.
- Harder spells (★★★) use longer words, more distractors (tone twins like huǒ/huò) and longer sentences, never unknown vocabulary.
- Spells prefer certain puzzle types but other types appear for variety.
- Soundless Mode removes listen/tone from the rotation; toggling it mid-puzzle swaps the puzzle without penalty.

## Elements, statuses, reactions, terrain (`data/elements.js`)

Eight elements: fire, ice, water, earth, lightning, wind, dark, light (+ physical). Enemies have **affinities** (weak ×1.5, resist ×0.5, immune ×0; bosses never below ×0.6) shown above their heads.

Statuses: Burn, Chill, Frozen, Wet, Shock, Curse, Stun, Dazzle.

Reactions (element hitting a status): **dǎo diàn** Conduct (lightning + wet, chains to all wet), **róng huà** Melt (fire + frozen ×2), **fěn suì** Shatter (earth + frozen ×2.5), **zhēng qì** Steam (fire + wet → dazzle), **yě huǒ** Wildfire (wind + burn spreads), **jìng huà** Purify (light + curse ×2, heals), **bào zhà** Explosion (lightning + burn), **rì shí** Eclipse (dark + dazzle). Chill on Wet → **Flash Freeze**; Wet douses Burn.

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

- **mò lóng 墨龙 Ink Dragon** (3 phases): telegraphed ink breath (interrupt with freeze/stun or tank with shields) and bat summons → spreading ink (corrupted + misty ground, shifting weakness) → rage (faster, ink rain curses).
- **tūn zì shòu 吞字兽 Word Eater** (3 phases): corrupts your spells (weaker, slower), summons **Word Wraiths** labelled with words you've learned → silences your passive items → reverses weaknesses into resistances and devours your shields.
- Biome guardians (panda king, crab queen, stone king, snow maiden, thunder qilin, bog witch, lantern king) each have a signature behaviour.

## Extending the game

Everything below is data; the engine never needs to change for normal content.

- **Passive item** (`data/items.js`): add an entry with `py/zh/en`, `element`, `rarity`, `category`, `desc`, optional `stats` (see `STAT_KEYS` in combat.js) and/or `hooks`. Hooks receive `(battle, payload, state)`; available triggers: `onBattleStart onAttack onHit onCrit onSpellHit onDamaged onDodge onBlock onShieldBreak onStatus onReaction onCast onCastFail onKill onMove onHeal onTick onLowHp onFatal modDamage modIncoming modSpellPower modHeal`. Use the Battle API: `damage, applyStatus, heal, addShield, knockback, addBuff, setTerrain, spawnAlly, schedule, castEffect, reduceCooldowns, label, emit`. Add `requires: ['火']` to gate it behind vocabulary.
- **Synergy** (`data/synergies.js`): `requires` lists item and/or spell ids; give it `hooks` and/or `stats`, or set `battle.flags` that item hooks read.
- **Spell** (`data/spells.js`): `py/zh/en`, `element`, `cd`, `tier` (puzzle difficulty), `tags`, `puzzles` (preferred types), `requires`, and `cast(battle, ctx)` using `ctx.power`. `signature: true` makes it a hero's starting spell; `SIGNATURE_LOCKED` in the same file controls whether that slot can be replaced.
- **Hero** (`data/heroes.js`): stats, `attack` style, `signature` spell id, `passive` with hooks (passives are never silenced), unlock rule, sprite key.
- **Enemy** (`data/enemies.js`): stats, `affinity`, `element`, `onHitStatus`, `ai` behaviours (charge, summon, guard, hex, shift, flip, silence, hazard, shell, corrupt, devour, regen, nuke, onSpellHit) and boss `phases`.
- **Biome** (`data/biomes.js`): terrain, periodic events, element modifiers, enemy pools, guardian/boss, unlock words; add it to `ACT_BIOMES`.
- **Puzzle type**: add a builder in `learn/puzzles.js` (`BUILDERS`) and a body component in `components/CastPuzzle.jsx` (`BODIES`).
- **Story / events**: `data/story.js` (beats shown once) and `data/events.js` (encounter questions and rewards).

Safety: hooks run with a recursion depth limit (`COMBAT.maxHookDepth`) and a per-step proc budget (`COMBAT.maxProcsPerStep`), and a crashing hook is logged instead of breaking the battle. `npm test` runs every item and synergy in a real battle and checks a build holding *every* item at once still resolves quickly.

## Old saves

Learning progress, levels, heroes and achievements carry over. Your Ink Dragon victories from the old version count toward the Word Eater unlock. An adventure run that was in progress under the old system is retired with a short notice.
