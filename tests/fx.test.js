// The FX config (src/fx/fx.json, edited in the FX Studio) must match the game: every cue the battle
// screen plays exists, every reference resolves, and every sheet is packed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validate } from '../tools/fx-editor-plugin.mjs';
import { poseCss } from '../src/fx/poses.js';
import { FRUITS } from '../src/learn/signaturePuzzles.js';

const fx = JSON.parse(fs.readFileSync('src/fx/fx.json', 'utf8'));
const battle = fs.readFileSync('src/components/BattleScreen.jsx', 'utf8');
const combat = fs.readFileSync('src/game/data/signatures.js', 'utf8');

test('the FX config is valid (every effect, pose, sheet, launch cue and sprite resolves)', () => {
  assert.deepEqual(validate(fx), []);
});

test('every cue the battle screen plays by name exists', () => {
  const names = [...battle.matchAll(/cue\('([\w.]+)'/g)].map((m) => m[1]);
  names.push(...[...battle.matchAll(/'((?:attack|hit|move|wall|unit)\.[\w.]+)'/g)].map((m) => m[1]));
  assert.ok(names.length > 20);
  for (const n of new Set(names)) assert.ok(fx.cues[n], `missing cue ${n}`);
  // signature moves: sig.<id>.<phase> for every phase the moves emit
  for (const m of combat.matchAll(/type: 'sig', id: '(\w+)', phase: '(\w+)'/g)) assert.ok(fx.cues[`sig.${m[1]}.${m[2]}`], `missing cue sig.${m[1]}.${m[2]}`);
  for (const f of FRUITS) assert.ok(fx.cues[`fruit.${f.id}`], `missing cue fruit.${f.id}`);
  for (const p of ['orb', 'thrown', 'fruit.shot', 'fruit.throw']) assert.ok(fx.projectiles[p], `missing projectile ${p}`);
});

test('every sheet an effect uses is packed (with its baked recolours), and nothing is left pending', () => {
  for (const [name, e] of Object.entries(fx.effects)) {
    const sh = fx.sheets[e.sheet];
    assert.ok(!sh.pending, `${e.sheet} is not packed: Compile in the FX Studio`);
    assert.ok(fs.existsSync(`public/assets/vfx/${e.sheet}.png`), `${name}: public/assets/vfx/${e.sheet}.png`);
    if (e.hue) assert.ok(sh.baked?.includes(e.hue) && fs.existsSync(`public/assets/vfx/${e.sheet}@${e.hue}.png`), `${name}: hue ${e.hue} not baked`);
  }
});

test('poses become CSS for both sides (enemies mirrored)', () => {
  const css = poseCss(fx.poses);
  for (const name of Object.keys(fx.poses)) {
    assert.ok(css.includes(`@keyframes fxpose-${name}-hero`) && css.includes(`@keyframes fxpose-${name}-enemy`), name);
  }
  assert.match(css, /fxpose-attack-enemy\{[^}]*translate\(6px/, 'an enemy lunges the other way');
});

test('a signature with an impact frame lands then, and the hero holds still until it does', async () => {
  const { Battle, buildHero } = await import('../src/game/combat.js');
  const make = (sigImpact) => {
    const hero = buildHero({ heroId: 'ruizhe', accountLevel: 5 });
    const b = new Battle({ hero, heroHp: hero.maxHp, enemies: ['golem'], biome: 'caves', floor: 1, seed: 3, sigImpact });
    b.sig.state = 'ready';
    return b;
  };
  const b = make(0.6);
  assert.ok(b.beginCast());
  b.finishCast(true);
  const evs = b.drain();
  assert.ok(evs.some((e) => e.type === 'sigCast' && e.impact === 0.6), 'the cast animation starts at once');
  assert.ok(!evs.some((e) => e.type === 'sig'), 'the move has not happened yet');
  assert.equal(b.sig.state, 'casting');
  const heroX = b.hero.x;
  const during = [];
  for (let i = 0; i < 10; i++) during.push(...b.step(0.05));
  assert.ok(!during.some((e) => e.type === 'sig'), 'nothing before the impact');
  assert.ok(!during.some((e) => e.type === 'attack' && e.src === 'hero'), 'the hero does not attack meanwhile');
  assert.equal(b.hero.x, heroX, 'the hero holds still');
  const after = [];
  for (let i = 0; i < 6; i++) after.push(...b.step(0.05));
  assert.ok(after.some((e) => e.type === 'sig' && e.id === 'deny_danger'), 'the move lands at the impact');
  assert.equal(b.sig.state, 'cooldown');
  // without an impact frame nothing changes: the move resolves at once
  const c = make(0);
  c.beginCast();
  c.finishCast(true);
  assert.ok(c.drain().some((e) => e.type === 'sig'));
});
