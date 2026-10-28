# Pinyin Quest

Learn to **speak and understand** Mandarin with flashcards, spaced repetition and a cute roguelike autobattler. Every correct answer powers up your hero, and the *meaning* of the word decides the reward: 水 shuǐ (water) brings shields, 火 huǒ (fire) sets enemies ablaze.

- Pinyin first, with tone marks. Hanzi stays small and can be hidden entirely.
- Mandarin audio on every card (normal and slow) via the browser's zh-CN voice, with a slot for recorded clips.
- Five study modes: teaching card, flashcard (Again/Hard/Good/Easy), multiple choice, **listening**, recall (English → pinyin), plus optional speaking practice.
- SM-2-style spaced repetition, tracked **separately** for recognition, listening, recall and speaking.
- Roguelike adventure: a 10-floor run with battles, elites, campfires, treasure, teacher challenges and a boss. It has 4 heroes with signature passives, 20 upgrades, 8 synergies, 7 enemies and the 墨龙 mò lóng (Ink Dragon) boss.
- Passive learning in the game: every enemy, upgrade, synergy, map node and element is named in pinyin first (e.g. 石头人 shí tou rén, "stone person"), with Hanzi and English beside it. Tap a name to hear it; picking an upgrade speaks its name.
- Installable PWA that works offline. All progress stays on the device, with JSON export and import.

---

## Run it

**Just want to play?** Double-click `Play Pinyin Quest.bat`. For your phone (install, APK, automatic updates), see **[docs/INSTALL.md](docs/INSTALL.md)**.

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
| `npm test` | Combat, synergy and whole-run balance tests |
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
  components/              StudyCard (all study modes), BattleView, Sprite, AudioButtons, ui
  learn/                   vocab loader, srs.js (scheduler), session.js (what to study next),
                           questions.js (distractors), grading.js (grades/XP), adventurePicker.js
  game/
    combat.js              deterministic battle simulation (no UI)
    run.js                 roguelike run state machine (no UI)
    achievements.js        achievements + cosmetic robes
    data/                  balance.js, upgrades.js, enemies.js, elements.js  ← tuning lives here
  audio/                   speech.js (TTS/recorded/speech recognition), sfx.js, music.js
  store/                   store.js (localStorage save, export/import), progress.js (XP, streaks)
  assets/                  manifest.js + characters/, enemies/, backgrounds/, icons/
  data/                    vocab.json (generated), wordThemes.json, examples.json
tools/                     build-vocab.mjs, make-icons.mjs, source/ (downloaded dataset)
tests/                     node:test suites
public/                    manifest, service worker, icons, audio/
```

## Vocabulary

**Source:** the open-source [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) dataset (MIT). Its English meanings come from CC-CEDICT (CC BY-SA 4.0). `tools/build-vocab.mjs` picks every word in **HSK 1–3** (new or old syllabus), 2,267 words in all, and orders them by the dataset's corpus **frequency rank**. It then cleans the data:

- Merges multi-reading entries and keeps the most common reading as primary. Other readings appear under "Also read".
- Drops non-meanings ("variant of…", "surname…") and pushes archaic, dialect and place-name senses to the end.
- Applies a small correction table (`PRIMARY_READING`, `MEANING_FIRST`) where the everyday sense wasn't listed first. Example: 年 = *year*, not "grain".

Nothing is invented. Example sentences (`src/data/examples.json`, about 95 common words) are authored for this app and marked as such. Words without one simply show none.

**New learners** start with concrete high-frequency words (I, you, to be, to have…). Abstract particles like 的 and 了 are held back until about 20 words are known.

### Adding vocabulary

- **More words from the dataset:** edit `LEVELS` in `tools/build-vocab.mjs` (e.g. add `'n4'`), then run `npm run vocab`.
- **Your own words:** append objects to `src/data/vocab.json` in the same shape:
  `{ "id": "熊猫", "hanzi": "熊猫", "pinyin": "xióng māo", "meanings": ["panda"], "gloss": "panda", "other": [], "pos": "noun", "hsk": 4, "freq": null, "rank": 2268 }`.
  `id` must be unique; it keys the saved progress.
- **Example sentences:** add `"熊猫": ["我喜欢熊猫。", "Wǒ xǐhuan xióngmāo.", "I like pandas."]` to `examples.json`.
- **Gameplay element:** add the Hanzi to a list in `wordThemes.json`. Unlisted words fall back to `POS_ELEMENT` in `src/game/data/elements.js`: numbers → Focus, pronouns → Kin, grammar words → Arcane, everything else neutral.

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
- **Sessions:** 2, 5 or 10 minutes, or Endless. Due words come first, with recently missed words at the front. New words are introduced with a teaching card and quizzed again two cards later, then once more by ear. Missed words return three cards later.
- **XP:** a correct answer earns 8–15 XP depending on difficulty. Wrong answers earn nothing but are scheduled sooner. Answers under 0.7s earn 1 XP, and repeats within a session earn less.
- **Streaks:** any study keeps the day. Every 7-day block earns a shield (max 2) that covers one missed day.

## Adventure

Each run: **choose a node → answer questions → draft upgrades → watch the autobattle → collect rewards → next floor**. Floor 10 is the boss.

- Every correct answer gives **+1 spark**, plus a one-battle **blessing** from the word's element (e.g. water: +15 shield, wind: +10% attack speed).
- Every 2 sparks lets you draft 1 of 3 upgrades. Drafts favour the elements of the words you just answered, and the card shows "Inspired by shuǐ (water)".
- Wrong answers give the enemies +8% attack for that battle and still update the word's schedule. They never end the run.
- New words are always taught with a teaching card before they're asked.
- Battles are simulated up front with a seeded RNG, then replayed with animations at 1×, 2× or 4×, or skipped. The run autosaves after every step and resumes after closing the app.
- Persistent progression is deliberately light: +2 max HP per account level (capped at +30), a few upgrades unlocked by level, and cosmetic robes from levels and achievements.

### Heroes

Heroes are defined in `src/game/data/heroes.js` (stats, passive numbers, unlock rule). The hero is picked on the Adventure start screen or in Settings and is fixed for the run.

| Hero | Unlock | Passive |
| --- | --- | --- |
| **Xīn Yí** 欣怡, Cheerful Wanderer | from the start | **kāi xīn 开心 (Good Cheer):** each correct answer heals 4% HP; a quiz with no mistakes gives +1 bonus spark. Simple, and it rewards learning directly. |
| **Méi** 梅, Silent Blade | account level 3 | **méi huā 梅花 (Plum Blossom):** opens each battle with a sword draw (bá dāo) for 200% damage. Each ability she casts makes her next attack a guaranteed crit that also cuts every other enemy for 50%. Synergises with abilities (huǒ qiú, tài yáng), cooldown and echo upgrades, crit damage, and dì yù huǒ (crit burns). Lower HP, higher attack and crit. |
| **Ruì Zhé** 睿哲, Nervous Scholar | account level 5 | **jǐn zhāng 紧张 (Nervous Genius):** throws a scroll every 4s from the start. Each *different* element among his upgrades makes all his abilities 10% stronger. The first time he drops below half HP in a battle, he panics: casts every ability at once and attacks 30% faster. Rewards varied, ability-heavy builds. |
| **Huǒ Huǒ** 火火, Ember Apprentice | account level 8 | **diǎn huǒ 点火 (Kindling):** every 4th attack is a burning fire bolt for double damage, and fire-word blessings count twice. Wears the unlockable robes. |

Passives are implemented by id: battle effects in `combat.js` (`plum_blossom`, `kindling`) and quiz effects in `run.js` (`good_cheer`); `nervous_genius` uses both `combat.js` and the hero's innate `abilities` list in `heroes.js`. To add a hero, add an entry to `HEROES`, add its sprite to the manifest, and, if the passive is new, handle its id in one of those two files. `tests/heroes.test.js` covers each passive, and `tests/run.test.js` checks every hero's win rate stays in a fair band. Currently all four heroes win 64–76% of simulated runs at 80% answer accuracy.

### Changing battle balance

All tuning lives in data files, so no engine changes are needed:

- `src/game/data/balance.js`: hero base stats, sparks per upgrade, heal amounts, wrong-answer penalty, per-floor enemy scaling, enrage timers, node weights.
- `src/game/data/enemies.js`: enemy stats, traits (poison, dodge, drain, thorns, enrage), abilities, and which groups appear on which floors.
- `src/game/data/upgrades.js`: upgrades (`mods(level)` returns stat changes and abilities) and synergies (`patch`).

Run `npm test` after changes. `tests/run.test.js` plays 450 simulated runs and prints win rate, average floor and battle lengths by answer accuracy. Current targets: about 50% wins at 80% accuracy, 10–20s battles, 18–25s boss fights.

## Replacing art

Gameplay code only refers to **asset keys**. All art is resolved in `src/assets/manifest.js`, so swapping in a PNG, WebP or sprite sheet never touches the combat engine. See **[docs/ASSETS.md](docs/ASSETS.md)** for sizes, animation states and naming.

---

## Status and known limitations

- **Audio** depends on the device having a Mandarin TTS voice. Without one, the app says so; it doesn't fail silently. No recorded clips are bundled yet; drop them in as described above.
- **Speaking practice** (off by default, in Settings) uses the browser's speech recognition when available (Chrome/Edge). It can only check whether the recognised characters match. It **cannot judge tones**, so self-grading is always offered.
- **Example sentences** cover about 95 of the most common words. Other words show definitions only.
- Characters are original vector art made for this project, not professional illustration. The manifest is ready for replacement art.
- Progress lives in this browser's storage. Use **Settings → Export JSON** to back up or move devices.
