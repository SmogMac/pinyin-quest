# Passive item overhaul: changelog

153 passive items (140 kept with their ids, 13 new) and 60 synergies (54 fixed or upgraded, 6 new). The full list is generated from the game data in **[ITEMS.md](ITEMS.md)** (`npm run items-doc`).

## How every item now works for every hero

Before the overhaul, an audit ran the same seeded battles with and without each item, for all six heroes, against one enemy, a group and the dragon. **56 of the 140 items did nothing at all for at least one hero**, and 34 more only mattered in some fights.

The causes:

- **Dodge items on heroes who never dodge.** Five of the six heroes have 0% dodge.
- **Knockback items needing pushes of 6–8.** Only Lei pushes that far.
- **Wall-slam items.** Only Lei's signature slams enemies into the wall.
- **Signature items that scaled "power".** Power means nothing for Ruizhe's shield, Fuyun's frenzy or Lei's push.
- **Shield, heal, Burn, Freeze and Curse items.** Nothing created their condition.
- **Kill-based items.** They never paid off against a boss.
- **"Other enemy" effects.** They vanished when the enemy fought alone.

What changed:

| Before | Now |
| --- | --- |
| Dodge items needed a hero who dodges | every dodge item adds 6–10% dodge |
| Knockback items waited for big pushes | every knockback item has its own shove, stacks or "every Nth attack" blow; thresholds start at 3–4 |
| Conditional items waited for their condition | each creates it: shield items grow shields, status items apply statuses, heal items have small heals of their own |
| Signature items scaled power | they react to a successful move, never to its damage |
| Item projectiles needed a ranged attack | they are separate secondary projectiles, so melee heroes fire them too |
| Area effects missed their centre | they include it, so a lone boss is hit |
| Kill-based items ignored bosses | bosses, guardians and elites give a "milestone" every 10% of their health |
| Periodic effects came late in short fights | they start early in each battle |

**Tests.** `tests/items.test.js` now checks the following (`node tests/item-audit.mjs` prints the full report):

- every item changes real fights for every hero in at least 2 of the 3 situations;
- every synergy changes fights for every hero;
- descriptions match behaviour for the redesigned items;
- every item visual has an FX cue;
- holding all 153 items at once stays finite and bounded.

**Result:** 0 dead items; every item and synergy does something for every hero.

## Engine additions

- **Copied attacks.** Clones, mirrors, afterimages and echoes make real copies of the basic attack, with every on-hit item effect. Copies never count toward "every Nth attack" and are never copied again (`COMBAT.maxCopyDepth`).
- **Clone and spirit limit.** At most 6 on the field at once (`COMBAT.maxAllies`). They can strike as the hero, and their strikes can be forced to crit.
- **New `onDeal` trigger.** It fires on any damage you deal; shared damage and damage over time are excluded so it can't loop.
- **Momentum check.** Signature items can see whether you had Momentum before the move (`c.momentum`).
- **Signature echoes.** Each signature defines its own echo for Echoing Soul.
- **Item visuals.** `b.fx(kind)` plays FX Studio cue `item.<kind>`. There are 49 new cues in the Items group, all editable.
- **Studio Test fight.** It can give the hero no items, 10 random, every epic, or every item.

## Signature items, redesigned for utility moves

- **Afterglow:** 5s glowing aura after a signature: every attack also fires an energy pulse, and you take 10% less damage.
- **Ink Reflection:** a reflection that draws enemy attacks and copies your next basic attack.
- **Chain Reaction:** your next 3 attacks set off elemental reactions (Conduct, Explosion, Shatter, Purify, Eclipse), or soak the target so the next one reacts.
- **Echoing Soul:** each hero echoes differently, with no second puzzle.
  - Xinyi: a second random fruit.
  - Mei: a follow-up slash.
  - Huojin: +3s of Burning Passion and a fire pulse.
  - Ruizhe: another shield pulse and shockwave.
  - Fuyun: a clone whose strikes all crit.
  - Lei: a second shockwave during which collisions crackle with lightning.
- **Perfect Memory:** the first signature each battle summons a memory spirit for 8s.
- **Signature Reservoir:** stored charges become spectral water blades (2 per charge).
- **Still Water:** a signature cast without Momentum makes a tranquil pool: it heals you, and Slows and soaks enemies (Wet, which reacts with Ice and Lightning).
- **Honed Edge:** crits leave blade marks; the next signature launches one piercing blade per mark.
- **Reckless Magic:** two offensive shockwaves per signature; cooldown 35% longer.
- **Lingering Power:** longer statuses and bonuses, and a damaging field after each signature.
- **Also changed:**
  - Poised Mind: dodge stat, faster recharge, and a calm wave.
  - Second Thought: a chance of a faster recharge after right answers.
  - Resonance: bursts on the first signature, then every 2nd.
  - Patient Reward: always gives a shield.
  - Bitter Lesson: right answers Weaken an enemy.
  - Charged Up: a shield if you already had Momentum.
  - Storm Barrier: the barrier zaps every second.

## Conditional items, now with standalone effects

- **Shields:**
  - Bursting Shield: a brittle shield that explodes even unbroken.
  - Barbed Seal, Thorn Shell, Second Refusal, Ember Shield: grow their own shields.
- **Heals:**
  - Overflowing Cup: sips, and turns healing into shield.
  - Overflowing Ink: ink sips; heals fire ink and overheals fire a lance.
  - Sun Mirror: a periodic beam.
  - Hearty Meal and Sugar Rush: snacks and sweets.
- **Statuses:**
  - Frost Hunter: Chills every 4th attack.
  - Ashes: ignites attacks, and drops healing embers.
  - Ink Parasite: Curses every 5th attack.
  - Holy Water: radiant marks every 3rd attack.
  - Conductive Ink: Wet and lightning arcs.
  - Glacier Fist: crits Chill, Freeze and Shatter.
  - Adaptation: applies a random status every 5s.
  - Contagion (new): see below.
- **Fire and Momentum:**
  - Ember Armor: base defence, and your attackers ignite.
  - Fanned Flames: a dodge fire gust, and new Burns spread.
  - Cinder Heart: embers and stronger damage over time.
  - Blood Moon: dark crescents.
  - Bottled Storm: recurring Wet ground with lightning strikes.
- **Melee and ranged alike:**
  - Splitting Ink, Five Petals, Long Spear, Bouncing Ball, Mirror Ink (now a full copied attack).
  - Rebound: reflects ranged attacks, and counter-fires at melee attackers.
  - Ember Trail: flame ground while moving, ember rings while standing.
  - Rooted Stance: armour from holding ground, which crumbles gradually.
- **Knockback:**
  - Momentum Swing: every 4th attack is a big swing.
  - Sticky Ink: stacks that pushes consume into Slows.
  - Arc Flail: chain lashes.
  - Ink Trail: ink patches when walking.
  - Hemorrhage: rending shoves.
  - Pile-Up: shockwaves on strong hits.
  - Wallbreaker and Stunning Blow: an effect on heavy blows as well as wall slams.
  - Chain Collision: body-checks.
- **Small stat items** now have an effect of their own: Vitality, Iron Skin, Heavy Frame, Qinggong, Lucky Cat, Glass Brush, Desperate Pace and Lingering Spirit.

## New build-defining items (all epic)

- **The Red Thread:** hit enemies are tied together. They share 30% of the damage, and knocking one back drags the other.
- **Borrowed Time:** dodges (and every 7th attack) leave frozen afterimages. Each repeats your last attack a second later, and they pile up.
- **Trickster's Mask:** gaining Momentum swaps you with the nearest enemy, leaving it dazed behind you; your next attack crits.
- **Thunderclap Drum:** every 5th push booms, repeating the push on everything nearby, so collision chains form.
- **Mirror World:** your mirror self copies every attack from the far side of the battlefield and pulls the target toward you.
- **Turtle's Revenge:** hits and knockbacks store kinetic energy; your next attack releases it.

## New rare items

- **Gravity Seal:** drags every enemy together, then detonates.
- **Ink Mine:** delayed ink seals.
- **Paper Lanterns:** battlefield objects that explode when an enemy touches them.
- **Ebb and Flow:** losing Momentum sends a tidal wave; gaining it makes your next attacks cleave.
- **Contagion:** statuses jump to every enemy when a carrier dies, and blight erupts from targets with 3+ statuses.
- **Ring of Swords:** orbiting swords; crits add more.
- **Blood Pact:** attacks cost health but fire blood darts; kills restore health.

## Synergies

**Fixed:**

- **All Together:** it mentioned echoed signatures without needing Echoing Soul. Now every signature counts double toward Resonance, and each burst brings a shield and two spirit companions.
- **Thunder God:** it used a flag nothing read any more. Now its barriers last twice as long, call down lightning every 2s, strike everything that crosses with lightning, and recharge your signature.
- **Healing Wave:** it now works with Spring Tea's regeneration (every 4th sip ripples outward), and big heals make bigger waves.
- **Erudite Storm:** each signature gives every enemy two statuses, and crits spread every status to another enemy.
- **Ember Fortress:** it used to check burning ground that Ember Trail no longer creates; it now follows your own flames.
- **Knockback thresholds:** lowered so every hero triggers them:
  - Line Breaker, Storm Hammer, Avalanche and Storm Flail;
  - Storm Hammer and Storm Flail also pass lightning on collisions.
- **Other heroes:** Radiant Guardian, Echo Brushwork and Demolition gained triggers that every hero reaches.

**Significantly improved:**

- **Bouncing Bomb:** bounces explode and split into fragments.
- **Golden Light:** a giant golden bell falls on the enemies (250% attack, Stun).
- **Clockwork:** delayed spectral copies of each attack during the Hourglass surge.
- **Rooted Mountain:** a stone fortress with rock walls that rise and crush enemies.
- **Lucky Star:** falling stars that damage and heal.
- **Twin Mirrors:** attacks from both ends of the battlefield.
- **Smaller additions:** Chain Explosion, Shadow Parasite, Wildfire Dance, Glass Phoenix, Inferno, Border Wall and Hidden Blades (now a real copying clone).
- **Resounding Echo:** a full-strength echo.

**New:**

- **Puppet Strings** (Red Thread + Chain Collision)
- **Time Loop** (Borrowed Time + Afterimage)
- **Hall of Mirrors** (Mirror World + Mirror Ink)
- **Human Wave** (Thunderclap Drum + Pile-Up)
- **Iron Shell** (Turtle's Revenge + Heavy Frame)
- **Black Hole** (Gravity Seal + Explosive Impact)

## Balance

Items do far more now, so the numbers around them moved. The simulated player takes nearly every item it is offered; its dragon win rate is now 60–85% across heroes and all three Act 3 maps.

| Setting | Before | Now |
| --- | --- | --- |
| Attack bonus per item held | +6% | +3% |
| Enemy health | ×1.0 | ×1.27 |
| Enemy attack | ×0.38 | ×0.44 |
| Boss health | ×1.2 | ×1.45 |
| Boss attack | ×0.66 | ×0.74 |
| Lei's base stats | 160 HP, 18 attack | 155 HP, 16.5 attack (he was already the strongest and gained most from knockback items) |

Individual outliers were also trimmed: Flame Mantle, Ring of Swords and Storm Barrier.

## Safety

- **The loop the audit found:** Overflowing Ink's overheal lance fed lifesteal, which fed bigger lances, so damage grew exponentially. The lance is now capped.
- **Every item at once:** a stress test holds all 153 items against bosses with 50× health. Numbers stay finite, the ally and zone limits hold, and the event count stays bounded. Hits grow huge because a dozen damage bonuses multiply, but no run can collect every item.

## Kept as they were

Stable ids, unlock words, save compatibility, icons for the 140 existing items, and the item and synergy hook system.

## Known limitations

- **Melee mirror copies:** Mirror World and Twin Mirrors copies are drawn as projectiles from the copy's position, even for melee heroes.
- **Trickster's Mask:** a swapped enemy walks back past you to its own side.
- **Balance simulator:** the simulator doesn't account for player skill at choosing items; real high-synergy builds can be much stronger, which is intended.
