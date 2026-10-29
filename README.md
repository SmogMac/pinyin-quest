# Moyu Rumble

Learn to **speak and understand** Mandarin with flashcards, spaced repetition and a cute roguelike. **Learning words gives you power:** each hero has one signature move, fired by solving their own Mandarin minigame while the fight runs in real time; passive items transform how they fight, and learning more vocabulary unlocks new items and lands.

- Pinyin first, with tone marks. Hanzi stays small and can be hidden entirely.
- Mandarin audio on every card (normal and slow) via the browser's zh-CN voice, with a slot for recorded clips.
- Study modes: teaching card, flashcard (Again/Hard/Good/Easy), multiple choice, **listening**, recall (English → pinyin), plus optional speaking practice.
- SM-2-style spaced repetition, tracked **separately** for recognition, listening, recall and speaking.
- **Adventure:** real-time autobattles; six heroes, each with one signature move and its own Mandarin minigame (fruit, numbers, encouraging phrases, negation, body parts, tones; combat never pauses); positional combat (knockback, wall slams, dodge hops, a Hero Zone and an Enemy Zone, and **Momentum** for whoever holds the other side's half); 141 passive items, 54 synergies; 8 elements with status reactions and no elemental resistances; 9 biomes with battlefield effects; branching scroll-map routes; the Ink Dragon and the Word Eater. Full design in **[docs/ADVENTURE.md](docs/ADVENTURE.md)**.
- **Soundless Mode:** play 100% of the game without audio; listening exercises are swapped for text and picture ones and never counted as missed.
- Passive learning everywhere: enemies, items, moves, reactions and places are named in pinyin first (e.g. 石头人 shí tou rén, "stone person"), with Hanzi and English beside them. Tap a name to hear it.
- Installable PWA that works offline. All progress stays on the device, with JSON export and import.

---

## Run it

**Just want to play?** Double-click `Play Moyu Rumble.bat`. For your phone (install, APK, automatic updates), see **[docs/INSTALL.md](docs/INSTALL.md)**.

Requires Node 18+ (tested with Node 24).

```bash
npm install
```

```bash
npm run dev
```

Open the printed URL (http://localhost:5173). `--host` is on, so the URL also works from a phone on the same Wi‑Fi. Note that over plain-HTTP LAN the app runs, but it can't be installed.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the production build (http://localhost:4173) |
| `npm test` | Engine, items, synergies, content and whole-run balance tests |
| `node tests/sweep.mjs` | Balance report: win rate and battle lengths per hero |
| `npm run vocab` | Rebuild `src/data/vocab.json` from the source dataset |
| `npm run icons` | Rebuild the app icons from `tools/art-source/icon.webp` |
| `npm run art` | Trim and resize character art from `tools/art-source/` into `public/assets/characters/` |

## Install on Android (PWA)

Browsers only install PWAs from **HTTPS** (or `localhost`). So:

1. Run `npm run build`.
2. Upload the `dist/` folder to any static host, such as GitHub Pages, Netlify Drop, Cloudflare Pages or Vercel. The build uses relative paths, so a sub-folder works too.
3. On the phone, open the URL in **Chrome**, then tap ⋮ → **Install app** (or "Add to Home screen").
4. After the first load it works offline (service worker in `public/sw.js`). Pages are fetched network-first, so a new deploy shows up on the next open.

The repo includes `.github/workflows/deploy.yml`, which runs the tests, builds, and publishes to GitHub Pages on every push to `main` (set **Settings → Pages → Source: GitHub Actions** once).

**Mandarin voice on Android:** Settings → System → Languages → Text-to-speech → Google → install **Chinese (Mandarin)**. The app shows a banner when no Mandarin voice is available. On Windows: Settings → Time & language → Speech → add Chinese (Simplified).

---

## Project structure

```
src/
  app/App.jsx              screen routing, toasts, audio unlock, error boundary
  screens/                 Home, Learn (Quick Learn + summary), Adventure, Collection, Progress, Settings
  components/              StudyCard (study modes), BattleScreen (real-time battle), SignaturePuzzle (minigames),
                           ScrollMap (route map), HeroCarousel, Sprite, AudioButtons, ui
  learn/                   vocab, srs (scheduler), session (what to study next), questions (distractors),
                           signaturePuzzles (the six minigames and their vocabulary), pinyinTools (tones)
  game/
    combat.js              real-time combat engine + event/hook system (no UI)
    run.js                 run state machine: acts, maps, rewards, shops (no UI)
    unlocks.js             vocabulary → which items and lands can appear
    achievements.js        achievements + hero unlocks
    data/                  everything tunable: heroes, signatures, items, synergies, enemies, biomes,
                           elements (statuses, reactions, terrain), balance, story, events
  audio/                   speech.js (TTS/recorded/speech recognition), sfx.js, music.js
  store/                   store.js (localStorage save, export/import), progress.js (XP, streaks)
  assets/                  manifest.js + characters/, enemies/, backgrounds/, icons/
  data/                    vocab.json (generated), wordThemes.json, examples.json, pictures.json
tools/                     build-vocab.mjs, make-icons.mjs, process-art.mjs, art-source/
tests/                     node:test suites + sim.js (simulated player) + sweep.mjs
public/                    manifest, service worker, icons, audio/, assets/characters/
```

## Vocabulary

**Source:** the open-source [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) dataset (MIT). Its English meanings come from CC-CEDICT (CC BY-SA 4.0). `tools/build-vocab.mjs` picks every word in **HSK 1–3** (new or old syllabus), 2,267 words in all, and orders them by the dataset's corpus **frequency rank**. It then cleans the data:

- Merges multi-reading entries and keeps the most common reading as primary. Other readings appear under "Also read".
- Drops non-meanings ("variant of…", "surname…") and pushes archaic, dialect and place-name senses to the end.
- Applies a small correction table (`PRIMARY_READING`, `MEANING_FIRST`) where the everyday sense wasn't listed first. Example: 年 = *year*, not "grain".

Nothing is invented. Example sentences (`src/data/examples.json`, about 95 common words) are authored for this app. Words without one simply show none.

**New learners** start with concrete high-frequency words (I, you, to be, to have…). Abstract particles like 的 and 了 are held back until about 20 words are known.

### Adding vocabulary

- **More words from the dataset:** edit `LEVELS` in `tools/build-vocab.mjs` (e.g. add `'n4'`), then run `npm run vocab`.
- **Your own words:** append objects to `src/data/vocab.json` in the same shape:
  `{ "id": "熊猫", "hanzi": "熊猫", "pinyin": "xióng māo", "meanings": ["panda"], "gloss": "panda", "other": [], "pos": "noun", "hsk": 4, "freq": null, "rank": 2268 }`.
  `id` must be unique; it keys the saved progress.
- **Example sentences:** add `"熊猫": ["我喜欢熊猫。", "Wǒ xǐhuan xióngmāo.", "I like pandas."]` to `examples.json`. They appear on study cards.
- **Element:** add the Hanzi to an element list in `wordThemes.json`. Learning element words unlocks that element's items and lands.
- **Picture puzzles:** add `"熊猫": "🐼"` to `pictures.json` (or an illustration in `PICTURE_IMAGES` in the asset manifest).

### Recorded audio (optional)

Put clips in `public/audio/` and map Hanzi to file names in `public/audio/manifest.json`:

```json
{ "你好": "nihao.mp3", "水": "shui3.mp3" }
```

Recorded clips take priority over TTS, play at 0.7× in slow mode, and fall back to TTS if a file fails. None are bundled yet.

---

## Learning system

- **Scheduler (`src/learn/srs.js`):** SM-2 with learning steps (1m, 10m), then day intervals. Again → lapse (ease −0.2, interval halved, relearn). Reviewing a card *before* it's due never grows its interval, so cramming can't inflate mastery.
- **Separate skills:** recognition (flashcard/MC), listening, recall and speaking each keep their own card. Listening and recall unlock after the first correct recognition.
- **Mastery:** New → Learning → Familiar (recognition interval ≥2d) → Strong (≥7d + another skill ≥3d) → Mastered (≥21d + another skill ≥10d). Mastery only grows through spaced, successful recall over days.
- **Sessions:** 2, 5 or 10 minutes, or Endless. Due words come first, with recently missed words at the front. New words are introduced with a teaching card and quizzed again two cards later. Missed words return three cards later.
- **Signature puzzles count:** the first time a word comes up in a battle it updates that word's schedule and earns XP, like a Quick Learn card (repeats in the same battle don't, so a small pool can't be farmed).
- **XP:** a correct answer earns 8–15 XP depending on difficulty. Wrong answers earn nothing but are scheduled sooner. Answers under 0.7s earn 1 XP, and repeats within a session earn less.
- **Streaks:** any study keeps the day. Every 7-day block earns a shield (max 2) that covers one missed day.
- **Soundless Mode (Settings):** mutes everything; listening cards become recognition cards, audio puzzles are replaced, and listening reviews simply wait until audio is back (never marked missed). Toggle any time, even mid-battle; an open audio puzzle is swapped without counting as a failure.

## Adventure (summary)

**The hero fights automatically; you fire one signature move by solving that hero's own Mandarin minigame while the fight keeps going; passive items transform how the hero fights; learning words widens what you can find.** See **[docs/ADVENTURE.md](docs/ADVENTURE.md)** for the full design and how to add heroes, minigames, items, synergies, enemies and biomes.

| Hero | Unlock | Signature move (minigame) | Passive |
| --- | --- | --- | --- |
| **Xīn Yí** 欣怡, Cheerful Wanderer | from the start | **Fruit Salad!** (name the fruit): the fruit is thrown or eaten, each with its own effect | **kāi xīn 开心:** every successful move heals 6% (first one also shields) |
| **Méi** 梅, Silent Blade | account level 3 | **Patient Blade** (read a number in pinyin, pick the digit): a critical sword arc across every enemy, then a moment on guard | **méi huā 梅花:** sword-draw opener; each move makes her next attack a splashing crit |
| **Ruì Zhé** 睿哲, Nervous Scholar | account level 5 | **Deny Danger!** (bù / méi / méiyǒu): a strong shield and a shockwave that throws enemies far back | **jǐn zhāng 紧张:** +10% signature power per different element among his items; panics at half HP (signature recharges) |
| **Huǒ Jìn** 火烬, Grumpy Fire Master | account level 8 | **Burning Passion!** (pick every encouraging phrase): 8s of faster, harder, burning attacks and flame trails | **huǒ hou 火候:** fire attacks, every 4th is a burning bolt that blasts the target back; +20% damage to Burning enemies; fire items appear twice as often |
| **Fú Yún** 浮云, Lucky Assassin | account level 10 | **Go All Out!** (name the body part): 5s frenzy, every hit a crit, Momentum anywhere | **yùn qi 运气:** every dodge sets up a guaranteed crit with a wind slash on all other enemies; once per battle survives a knockout at 1 HP |
| **Léi** 雷, Thunder Brawler | account level 12 | **Knockback!** (pick the right tone): flings every enemy into the far wall, no damage | **pí qi 脾气 (Static Temper):** heavy swings also hit enemies beside the target; every 4 hits charge a lightning burst (charge pips shown over Léi) |

### Changing battle balance

Everything tunable is data: `src/game/data/balance.js` (global knobs: enemy HP/attack, per-floor scaling, boss strength, heals, ink, prices, per-item attack bonus), `heroes.js`, `signatures.js`, `enemies.js`, `items.js`, `synergies.js`, `biomes.js`. After changes run `npm test` (includes 240+ simulated full runs) or `node tests/sweep.mjs` for a quick table. Current results with a simulated player who picks items at random and solves 85% of signature puzzles: the dragon is beaten in 50–68% of runs depending on the hero (Huǒ Jìn lowest, Ruì Zhé highest). Cooldowns differ per hero and are the main balance knob (Fruit Salad! and Patient Blade 5.5s, Knockback! 7s, Deny Danger! 10s, Burning Passion! and Go All Out! 11s); normal battles last 8–15s, elites 11–27s, guardians 15–29s, the dragon 25–51s.

## Replacing art

Gameplay code only refers to **asset keys**. All art is resolved in `src/assets/manifest.js`, so swapping in a PNG, WebP or sprite sheet never touches the combat engine. See **[docs/ASSETS.md](docs/ASSETS.md)** for sizes, animation states and naming.

---

## Status and known limitations

- **Audio** depends on the device having a Mandarin TTS voice. Without one, the app says so; it doesn't fail silently. No recorded clips are bundled yet; drop them in as described above.
- **Speaking practice** (off by default, in Settings) uses the browser's speech recognition when available (Chrome/Edge). It can only check whether the recognised characters match. It **cannot judge tones**, so self-grading is always offered.
- **Never using the signature move** is possible but much harder; the tests check that solving more puzzles wins more often.
- **Performance:** measured in desktop Chrome (dev build, 375×812 viewport): steady 120 fps on a 120 Hz display during a 2× speed boss fight, worst frame 9 ms, no long tasks, about 1.5 ms of rendering per frame. Not yet measured on a real Android phone. Turn on **Settings → Performance overlay** to see FPS, frame time and effect counts on your device.
- **Fruit and body-part puzzles** use emoji (and a simple drawn figure for the head and belly) until illustrations are added; emoji look slightly different on each platform.
- Characters and enemies are original vector art made for this project (plus your hero art); the manifest is ready for replacement art.
- Progress lives in this browser's storage. Use **Settings → Export JSON** to back up or move devices.
