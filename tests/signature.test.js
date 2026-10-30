// Signature moves: one per hero, each with its own Mandarin minigame and its own combat effect,
// plus the passive triggers that build on them. Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle, buildHero, makeRng } from '../src/game/combat.js';
import { COMBAT } from '../src/game/data/balance.js';
import { HEROES } from '../src/game/data/heroes.js';
import { ITEMS } from '../src/game/data/items.js';
import { SIGNATURES, FRUIT_EFFECTS } from '../src/game/data/signatures.js';
import { TEMPLATES, FRUITS, NUMBERS, CHEERS, NEGATIONS, BODY_PARTS, TONE_WORDS, generateSigPuzzle, checkSigAnswer, toneOptions, numberWord } from '../src/learn/signaturePuzzles.js';
import { scaleEnemy } from '../src/game/combat.js';
import { ASCENSION, highestAscension, recordAscensionWin } from '../src/game/data/ascension.js';
import { startRun } from '../src/game/runManager.js';
import { baseOf, toneOf } from '../src/learn/pinyinTools.js';
import { defaultSave } from '../src/store/store.js';

const steps = (b, s) => {
  const out = [];
  for (let t = 0; t < s && !b.result; t += COMBAT.dt) out.push(...b.step(COMBAT.dt));
  return out;
};
/** A battle where the hero's signature is ready right now. */
function ready(heroId, enemies, opts = {}) {
  const b = new Battle({ hero: buildHero({ heroId, items: opts.items || [] }), enemies, seed: opts.seed || 3, heroHp: opts.heroHp });
  steps(b, 0.5);
  b.sig.state = 'ready';
  return b;
}
const fire = (b, choice = null) => {
  assert.ok(b.beginCast(), 'puzzle opens');
  return b.finishCast(true, { choice });
};
/** The right answer for any puzzle. */
const solve = (p) => (p.kind === 'multi' ? p.answer : p.answer);
const wrong = (p) => (p.kind === 'multi' ? p.answer.slice(1) : p.options.find((o) => o.id !== p.answer).id);

test('every hero has exactly one signature move, each with its own minigame', () => {
  const templates = new Set();
  for (const [id, h] of Object.entries(HEROES)) {
    const sig = SIGNATURES[h.signature];
    assert.ok(sig, `${id} has a signature`);
    assert.equal(sig.hero, id);
    assert.ok(TEMPLATES[sig.template], `${id}: template exists`);
    templates.add(sig.template);
  }
  assert.equal(templates.size, Object.keys(HEROES).length, 'six heroes, six different minigames');
  assert.deepEqual(
    Object.fromEntries(Object.entries(HEROES).map(([id, h]) => [id, SIGNATURES[h.signature].template])),
    { xinyi: 'fruit', mei: 'number', ruizhe: 'negation', huojin: 'cheer', fuyun: 'body', lei: 'tone' },
  );
});

test('every puzzle template generates solvable, varied questions (with and without sound)', () => {
  for (const tpl of Object.keys(TEMPLATES)) {
    const rng = makeRng(tpl.length * 7);
    const save = defaultSave();
    const targets = new Set();
    let last = null;
    for (let i = 0; i < 40; i++) {
      const p = generateSigPuzzle(tpl, { save, rng, last, soundless: i % 2 === 0 });
      assert.notEqual(p.target, last, `${tpl}: never the same question twice in a row`);
      last = p.target;
      targets.add(p.target);
      assert.ok(checkSigAnswer(p, solve(p)), `${tpl}: the answer is accepted`);
      assert.ok(!checkSigAnswer(p, wrong(p)), `${tpl}: a wrong answer is rejected`);
      assert.ok(p.words.length >= 1 && p.reveal, `${tpl}: tracks words and explains the answer`);
      const ids = p.options.map((o) => o.id);
      assert.equal(new Set(ids).size, ids.length, `${tpl}: options are distinct`);
      // pretend it was practised, so later questions are tests rather than teaching
      for (const zh of p.words) save.gameWords[zh] = { seen: 3, ok: 2, bad: 1 };
    }
    assert.ok(targets.size >= 5, `${tpl}: questions vary (${targets.size} different)`);
  }
});

test('fruit: emoji + four pinyin options; the named fruit is the one summoned', () => {
  assert.equal(FRUITS.filter((f) => !f.tier).length, 10, 'ten fruit before Ascension');
  assert.deepEqual(FRUITS.filter((f) => !f.tier).map((f) => f.id).sort(), Object.keys(FRUIT_EFFECTS).sort(), 'every base fruit has its own combat effect');
  const p = generateSigPuzzle('fruit', { save: defaultSave(), rng: makeRng(2) });
  assert.equal(p.options.length, 4);
  assert.ok(p.prompt.emoji);
  assert.equal(p.choice, p.answer);
});

test('number: shows the pinyin, the player picks the digit from 1–10', () => {
  assert.deepEqual(NUMBERS.map((n) => n.py), ['yī', 'èr', 'sān', 'sì', 'wǔ', 'liù', 'qī', 'bā', 'jiǔ', 'shí']);
  const p = generateSigPuzzle('number', { save: defaultSave(), rng: makeRng(3) });
  assert.equal(p.options.length, 10);
  assert.deepEqual(p.options.map((o) => o.py), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], 'digits, in order');
  assert.equal(NUMBERS.find((n) => n.id === p.answer).py, p.prompt.word, 'the prompt is the pinyin');
  assert.ok(!/\d/.test(p.prompt.word), 'no digit in the prompt');
});

test('cheer: pick every encouraging phrase; partial or wrong picks fail', () => {
  assert.ok(CHEERS.filter((c) => c.positive).length >= 6 && CHEERS.filter((c) => !c.positive).length >= 6);
  for (let s = 1; s < 30; s++) {
    const p = generateSigPuzzle('cheer', { save: defaultSave(), rng: makeRng(s) });
    assert.equal(p.options.length, 6);
    const pos = p.options.filter((o) => o.positive).map((o) => o.id);
    assert.ok(pos.length >= 2 && pos.length <= 4);
    assert.ok(checkSigAnswer(p, [...pos].reverse()), 'order does not matter');
    const neg = p.options.find((o) => !o.positive).id;
    assert.ok(!checkSigAnswer(p, [...pos, neg]), 'a negative phrase spoils it');
  }
});

test('negation: one grammatical answer per sentence, and the English meaning disambiguates', () => {
  for (const n of NEGATIONS) {
    for (const a of [n.answer].flat()) assert.ok(n.options.includes(a), n.id);
    if (n.parts) assert.equal(n.parts.length - 1, n.answer.length, `${n.id}: one answer per blank`);
    assert.ok(!(n.options.includes('méi') && n.options.includes('méiyǒu')), `${n.id}: never méi and méiyǒu together`);
    assert.ok(n.en && n.why, `${n.id}: has a meaning and a rule`);
    // grammar spot-checks: shì and huì take bù; yǒu takes méi
    if (/^(shì|huì)\b/.test(n.after || '')) assert.equal(n.answer, 'bù', n.id);
    if (/^yǒu\b/.test(n.after || '')) assert.equal(n.answer, 'méi', n.id);
  }
  const p = generateSigPuzzle('negation', { save: defaultSave(), rng: makeRng(5) });
  assert.equal(p.kind, 'blank');
  assert.ok(p.prompt.en);
});

test('body parts: look-alike parts are never offered together', () => {
  for (let s = 1; s < 60; s++) {
    const p = generateSigPuzzle('body', { save: defaultSave(), rng: makeRng(s) });
    const ids = p.options.map((o) => o.id);
    assert.ok(!(ids.includes('leg') && ids.includes('foot')) || ![p.answer].some((a) => a === 'leg' || a === 'foot'));
    const part = BODY_PARTS.find((b) => b.id === p.answer);
    assert.ok(part.emoji || part.figure, 'drawn clearly');
  }
});

test('tones: options differ only in the tone mark; Soundless Mode shows a tone clue', () => {
  for (const w of TONE_WORDS) {
    const opts = toneOptions(w.py);
    assert.equal(new Set(opts).size, 4, w.py);
    assert.ok(opts.includes(w.py), `${w.py} among its own variants`);
    assert.equal(new Set(opts.map(baseOf)).size, 1, `${w.py}: same letters, different tones`);
    assert.ok(toneOf(w.py) >= 1);
  }
  const quiet = generateSigPuzzle('tone', { save: defaultSave(), rng: makeRng(1), soundless: true });
  assert.equal(quiet.prompt.audio, false);
  assert.ok(quiet.prompt.tone >= 1 && quiet.prompt.en, 'tone number + meaning are enough to answer without audio');
});

test('Xinyi · Fruit Salad!: thrown fruit hurt enemies, eaten fruit help her', () => {
  const thrown = ready('xinyi', ['golem']);
  const hp = thrown.foes()[0].hp;
  fire(thrown, 'apple');
  assert.ok(thrown.foes()[0].hp < hp, 'apple hits');
  const shield = ready('xinyi', ['golem']);
  fire(shield, 'strawberry');
  assert.ok(shield.hero.shield >= 30, 'strawberry shields');
  const fast = ready('xinyi', ['golem']);
  fire(fast, 'mango');
  assert.ok(fast.buffActive('mango') && fast.sigBuffActive(), 'mango speeds her up');
  const peel = ready('xinyi', ['slime']);
  fire(peel, 'banana');
  assert.ok(peel.zones.some((z) => z.kind === 'peel'), 'banana leaves a peel');
  const sour = ready('xinyi', ['slime', 'slime']);
  fire(sour, 'lemon');
  assert.ok(sour.foes().every((f) => f.statuses.weaken), 'lemon weakens');
  const splash = ready('xinyi', ['slime', 'slime']);
  fire(splash, 'watermelon');
  assert.ok(splash.foes().some((f) => f.statuses.wet), 'watermelon soaks');
  for (const id of ['orange', 'grape', 'pear', 'peach']) {
    const b = ready('xinyi', ['golem'], { heroHp: 40 });
    const before = { hp: b.hero.hp, foe: b.foes()[0].hp };
    fire(b, id);
    steps(b, 3);
    assert.ok(b.hero.hp > before.hp || b.foes()[0].hp < before.foe || b.buffActive('pear'), `${id} does something`);
  }
});

test('Mei · Patient Blade: a composed stance, then one slash hits every enemy', () => {
  const b = ready('mei', ['golem', 'golem', 'turtle']);
  const foes = b.foes();
  const hp = foes.map((f) => f.hp);
  fire(b);
  assert.deepEqual(foes.map((f) => f.hp), hp, 'anticipation: nothing yet');
  const ev = steps(b, 0.6);
  assert.ok(ev.some((e) => e.type === 'sig' && e.phase === 'strike'));
  const cuts = ev.filter((e) => e.type === 'hit' && e.kind === 'spell' && e.crit);
  foes.forEach((f) => assert.ok(cuts.some((e) => e.tgt === f.id), `${f.id} cut by a critical slash`));
  assert.ok(b.buffActive('composure'), 'on guard afterwards');
});

test('Huojin · Burning Passion!: basic attacks Burn and leave flame trails for ~8s', () => {
  const b = ready('huojin', ['wyrm', 'golem']); // a long fight, so the buff can run out
  fire(b);
  assert.ok(b.buffActive('passion'));
  steps(b, 4);
  assert.ok(b.foes().some((f) => f.statuses.burn), 'targets burn');
  assert.ok(b.zones.some((z) => z.kind === 'flame') || b.events.some((e) => e.type === 'zone'), 'flame trails');
  steps(b, 5);
  assert.ok(!b.buffActive('passion'), 'wears off');
});

test('Ruizhe · Deny Danger!: a strong shield and a shockwave that throws enemies far back', () => {
  const b = ready('ruizhe', ['slime', 'goblin']);
  for (const f of b.foes()) f.x = b.hero.x + 15;
  const x0 = b.foes().map((f) => f.x);
  const hp = b.foes().map((f) => f.hp);
  fire(b);
  b.foes().forEach((f, i) => assert.ok(hp[i] - f.hp <= 5, 'the shockwave itself does little or no damage'));
  assert.ok(b.hero.shield >= 30, 'shielded');
  steps(b, 0.8);
  b.foes().forEach((f, i) => assert.ok(f.x - x0[i] > 12, `enemy ${i} repelled ${(f.x - x0[i]).toFixed(1)}`));
});

test('Fuyun · Go All Out!: every hit crits and she has Momentum anywhere for ~5s', () => {
  const b = ready('fuyun', ['golem']);
  b.hero.x = 10; // deep in her own half
  b.updateMomentum();
  assert.ok(!b.hero.momentum);
  fire(b);
  assert.ok(b.hero.momentum, 'granted Momentum');
  assert.ok(!b.hero.invading, 'separate from positional Momentum');
  const ev = steps(b, 3);
  const hits = ev.filter((e) => e.type === 'hit' && e.src === 'hero' && e.kind === 'attack');
  assert.ok(hits.length >= 2 && hits.every((e) => e.crit), 'all crits');
  steps(b, 3);
  assert.ok(!b.buffActive('frenzy'));
});

test('a wrong answer starts the full cooldown for every hero; cancelling keeps it ready', () => {
  for (const id of Object.keys(HEROES)) {
    const b = ready(id, ['golem']);
    b.beginCast();
    b.cancelCast();
    assert.equal(b.sig.state, 'ready', `${id}: cancel`);
    b.beginCast();
    const r = b.finishCast(false);
    assert.equal(r.ok, false);
    assert.equal(b.sig.state, 'cooldown', `${id}: fizzle`);
    assert.ok(b.sig.cdLeft >= SIGNATURES[HEROES[id].signature].cd * 0.99);
  }
});

test('passive triggers modify the real simulation', () => {
  // dodge → counterattack
  const c = new Battle({ hero: buildHero({ heroId: 'fuyun', items: ['counterstrike'] }), enemies: ['goblin'], seed: 1 });
  c.hero.dodge = 1;
  c.damage(c.foes()[0], c.hero, 10, { kind: 'attack' });
  const counter = steps(c, 0.3).filter((e) => e.type === 'attack' && e.src === 'hero');
  assert.ok(counter.length >= 1, 'counterstrike swings');
  // knockback into the wall → collision damage
  const w = new Battle({ hero: buildHero({ heroId: 'lei', items: ['wallbreaker'] }), enemies: ['slime'], seed: 1 });
  const f = w.foes()[0];
  w.knockback(f, 200, { src: w.hero });
  const hp = f.hp;
  steps(w, 1);
  assert.ok(f.hp < hp, 'wall slam hurts');
  // signature success → echo
  const e = ready('mei', ['golem'], { items: ['echo_cast'] });
  fire(e);
  const after = steps(e, 1.5);
  assert.ok(after.some((x) => x.type === 'sig' && x.phase === 'wave'), 'Echoing Soul repeats the move (Mei: a follow-up slash)');
  // Momentum lost → shield
  const m = new Battle({ hero: buildHero({ heroId: 'mei', items: ['second_wind'] }), enemies: ['golem'], seed: 1 });
  m.hero.x = COMBAT.worldW / 2 + 10;
  m.updateMomentum();
  m.hero.x = 10;
  m.updateMomentum();
  assert.ok(m.hero.shield >= 20, 'Second Wind');
  // signature success → Momentum anywhere (works the same for every hero)
  for (const heroId of Object.keys(HEROES)) {
    const x = ready(heroId, ['golem'], { items: ['charge_up'] });
    x.hero.x = 10;
    x.updateMomentum();
    fire(x, 'apple');
    assert.ok(x.hero.momentum, `${heroId}: Charged Up grants Momentum`);
  }
  // failed signature → Bitter Lesson lashes out
  const bl = ready('mei', ['slime'], { items: ['bitter_lesson'] });
  const h0 = bl.foes()[0].hp;
  bl.beginCast();
  bl.finishCast(false);
  assert.ok(bl.foes()[0].hp < h0, 'on failed signature');
});

test('elemental status interactions still work (no resistances needed)', () => {
  const b = new Battle({ hero: buildHero({ heroId: 'xinyi' }), enemies: ['slime', 'slime'], seed: 2 });
  const [a, c] = b.foes();
  // Frozen + heavy impact → Shatter
  b.applyStatus(a, 'frozen', { src: b.hero });
  b.events = [];
  b.knockback(a, 10, { src: b.hero });
  assert.ok(b.events.some((e) => e.type === 'reaction' && e.id === 'shatter'), 'shatter');
  // Burn + Wind → Wildfire spreads
  b.applyStatus(a, 'burn', { dps: 3, src: b.hero });
  b.damage(b.hero, a, 5, { element: 'wind', kind: 'proc' });
  assert.ok(c.statuses.burn, 'wind spreads burn');
  // Curse + Light → purifying explosion
  b.applyStatus(a, 'curse', { src: b.hero });
  b.events = [];
  b.damage(b.hero, a, 10, { element: 'light', kind: 'proc' });
  assert.ok(b.events.some((e) => e.id === 'purge'));
  assert.ok(b.events.some((e) => e.type === 'hit' && e.tgt === c.id && e.element === 'light'), 'explosion hits the neighbour');
});

test('Ascension: harder vocabulary joins gradually, every new word is taught first, and puzzles stay fair', () => {
  const met = (zhs) => {
    const save = defaultSave();
    for (const zh of zhs) save.gameWords[zh] = { seen: 3, ok: 3, bad: 0 };
    return save;
  };
  const tiers = { fruit: FRUITS, body: BODY_PARTS, negation: NEGATIONS, cheer: CHEERS };
  for (const [tpl, pool] of Object.entries(tiers)) {
    // level 0 never shows a higher-tier word
    const tier0 = new Set(pool.filter((x) => !x.tier).map((x) => x.zh));
    for (let s = 1; s < 40; s++) {
      const p = generateSigPuzzle(tpl, { save: defaultSave(), rng: makeRng(s), level: 0 });
      for (const zh of p.words) assert.ok(tier0.has(zh), `${tpl} A0 showed ${zh}`);
    }
  }
  // a word never met is taught (answer shown), not tested
  for (const tpl of Object.keys(TEMPLATES)) {
    for (let s = 1; s < 25; s++) {
      const p = generateSigPuzzle(tpl, { save: defaultSave(), rng: makeRng(s), level: 10 });
      if (tpl !== 'cheer') assert.ok(p.teach, `${tpl}: a brand-new word is taught`);
      assert.ok(checkSigAnswer(p, p.answer), `${tpl}: the answer checks`);
      if (p.kind === 'choice') {
        assert.equal(new Set(p.options.map((o) => o.id)).size, p.options.length, `${tpl}: options are distinct`);
        assert.ok(p.options.some((o) => o.id === p.answer), `${tpl}: the answer is offered`);
      }
    }
  }
  // numbers: bigger numbers on higher levels, with four close options and no 2xx
  const save = met(['num:teens', 'num:tens', 'num:hundreds', ...NUMBERS.map((n) => n.zh)]);
  let big = 0;
  for (let s = 1; s < 60; s++) {
    const p = generateSigPuzzle('number', { save, rng: makeRng(s), level: 8 });
    if (!p.close) continue;
    big++;
    assert.equal(p.options.length, 4);
    for (const o of p.options) assert.ok(!/^2\d\d$/.test(o.py), 'no 2xx');
  }
  assert.ok(big > 20, 'most A8 number puzzles are big numbers');
  assert.equal(numberWord(12).py, "shí'èr");
  assert.equal(numberWord(350).py, 'sānbǎi wǔshí');
  // multi-blank negation: answers in order
  const nb = NEGATIONS.find((n) => n.parts);
  const p = { kind: 'blank', answer: nb.answer };
  assert.ok(checkSigAnswer(p, nb.answer));
  assert.ok(!checkSigAnswer(p, [nb.answer[0]]), 'every blank must be filled');
  // tones on Ascension 6+: some two-syllable and sandhi questions, soundless or not
  const seenKinds = new Set();
  for (let s = 1; s < 60; s++) {
    const q = generateSigPuzzle('tone', { save: defaultSave(), rng: makeRng(s), level: 7, soundless: true });
    seenKinds.add(q.prompt.sandhi ? 'sandhi' : q.prompt.tones ? 'two' : 'one');
    if (q.prompt.sandhi) assert.ok(q.why && q.prompt.written, 'sandhi explains its rule and shows the written form');
  }
  assert.deepEqual([...seenKinds].sort(), ['one', 'sandhi', 'two']);
});

test('Ascension: enemy HP +10% per level, and each hero unlocks levels independently', () => {
  assert.equal(scaleEnemy('slime', 1, 0, 0).maxHp * 2, scaleEnemy('slime', 1, 0, 10).maxHp);
  const save = defaultSave();
  assert.equal(highestAscension(save, 'mei'), 0);
  assert.equal(recordAscensionWin(save, 'mei', 0), 1);
  assert.equal(recordAscensionWin(save, 'mei', 0), null, 'a lower level than the highest unlocks nothing');
  assert.equal(highestAscension(save, 'lei'), 0, 'other heroes are unaffected');
  startRun(save, { heroId: 'mei', ascension: 5 });
  assert.equal(save.adventure.current.ascension, 1, 'clamped to what is unlocked');
  for (let i = 0; i < 20; i++) recordAscensionWin(save, 'mei', highestAscension(save, 'mei'));
  assert.equal(highestAscension(save, 'mei'), ASCENSION.max);
});
