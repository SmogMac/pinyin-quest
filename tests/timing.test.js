// Combat timing: what the player sees and what the engine does happen at the same moment.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle, buildHero } from '../src/game/combat.js';
import { COMBAT } from '../src/game/data/balance.js';

const near = (a, b, tol = COMBAT.dt + 1e-9) => Math.abs(a - b) <= tol;
function record(b, sec) {
  const ev = [];
  for (let t = 0; t < sec && !b.result; t += COMBAT.dt) ev.push(...b.step(COMBAT.dt));
  return ev;
}
const make = (heroId, enemies = ['golem'], extra = {}) => new Battle({ hero: buildHero({ heroId }), enemies, seed: 4, ...extra });

test('melee: damage, knockback and the hit happen at the contact moment of the swing, not when it starts', () => {
  const b = make('mei');
  const ev = record(b, 6);
  const swing = ev.find((e) => e.type === 'attack' && e.src === 'hero');
  assert.ok(swing?.dur > 0, 'the swing says how long it lasts');
  const hit = ev.find((e) => e.type === 'hit' && e.src === 'hero' && e.kind === 'attack' && e.t >= swing.t);
  const contact = swing.t + swing.dur * COMBAT.timing.melee.contact;
  assert.ok(hit.t > swing.t, 'not on the first frame of the swing');
  assert.ok(near(hit.t, contact), `hit at ${hit.t}, contact at ${contact.toFixed(2)}`);
  const knock = ev.find((e) => e.type === 'knock' && e.tgt === hit.tgt && e.t >= hit.t);
  assert.ok(knock && near(knock.t, hit.t, 1e-9), 'the push starts with the hit');
});

test('projectiles: released at the contact moment, damage and statuses land when they arrive', () => {
  const b = make('xinyi', ['golem'], { hero: buildHero({ heroId: 'xinyi', items: ['ember_tip'] }) });
  const ev = record(b, 6);
  const shot = ev.find((e) => e.type === 'shot' && e.src === 'hero' && e.timed);
  assert.ok(shot?.ms >= COMBAT.timing.flight.min, 'the shot carries its flight time');
  const hit = ev.find((e) => e.type === 'hit' && e.src === 'hero' && e.kind === 'attack' && e.t >= shot.t);
  assert.ok(near(hit.t, shot.t + shot.ms / 1000), `lands at ${hit.t} (shot ${shot.t} + ${shot.ms}ms)`);
  const burn = ev.find((e) => e.type === 'status' && e.status === 'burn' && e.t >= shot.t);
  assert.ok(burn && near(burn.t, hit.t, 1e-9), 'its status is applied on impact, not on release');
});

test('attack animations speed up with attack speed, so contact stays in sync', () => {
  const slow = make('mei');
  const fast = make('mei');
  fast.hero.aspd *= 4;
  const d1 = record(slow, 4).find((e) => e.type === 'attack' && e.src === 'hero').dur;
  const d2 = record(fast, 4).find((e) => e.type === 'attack' && e.src === 'hero').dur;
  assert.ok(d2 < d1, `faster attacks play faster (${d2} < ${d1})`);
  assert.ok(d2 <= COMBAT.timing.maxAnimShare / (fast.hero.aspd * 1.0001) + 0.01, 'never longer than the time between attacks');
});

test('a stunned or defeated enemy never finishes its attack', () => {
  const b = make('ruizhe', ['golem']);
  b.hero.x = b.foes()[0].x - 8; // within reach
  let ev = [];
  let swing = null;
  for (let i = 0; i < 200 && !swing; i++) {
    ev = b.step(COMBAT.dt);
    swing = ev.find((e) => e.type === 'attack' && e.src !== 'hero');
  }
  assert.ok(swing, 'the golem swings');
  const g = b.foes()[0];
  b.applyStatus(g, 'stun', { dur: 2 });
  const after = record(b, 1);
  assert.ok(!after.some((e) => e.type === 'hit' && e.src === g.id), 'the interrupted swing does no damage');
});

test('Xinyi’s thrown fruit takes effect when it lands', () => {
  const b = make('xinyi', ['golem']);
  record(b, 0.5);
  b.sig.state = 'ready';
  const hp = b.foes()[0].hp;
  b.beginCast();
  b.finishCast(true, { choice: 'apple' });
  assert.equal(b.foes()[0].hp, hp, 'nothing while it flies');
  record(b, COMBAT.timing.fruitLand + COMBAT.dt);
  assert.ok(b.foes()[0].hp < hp, 'it hits on landing');
});

test('projectiles fly at a constant speed: twice the distance takes twice as long', () => {
  const b = make('xinyi');
  const at = (d) => b.flightTime({ x: 10 }, { x: 10 + d });
  assert.ok(Math.abs(at(60) / at(30) - 2) < 1e-9, `${at(30)}s at 30, ${at(60)}s at 60`);
  assert.ok(Math.abs(at(100) / at(50) - 2) < 1e-9, 'no cap on long shots');
});

test('nobody attacks while moving, mid swing or right after blocking', () => {
  for (const heroId of ['mei', 'xinyi']) {
    const b = make(heroId, ['goblin', 'sporecap', 'bat']);
    const hero = b.hero;
    let swings = 0;
    for (let t = 0; t < 20 && !b.result; t += COMBAT.dt) {
      const ev = b.step(COMBAT.dt);
      for (const e of ev.filter((x) => x.type === 'attack')) {
        const u = e.src === 'hero' ? hero : b.units.find((x) => x.id === e.src);
        assert.ok(!u.moving, `${e.src} moved and attacked at ${e.t}`);
        assert.ok(u.actUntil > b.t - 1e-9, 'the swing occupies the attacker');
        swings++;
      }
      // mid swing: nobody walks
      for (const u of b.units) if (u.alive && b.t < (u.actUntil || 0) && !b.staggered(u)) assert.ok(!u.moving, `${u.id} walked mid swing`);
      if (ev.some((e) => e.type === 'block')) assert.ok(hero.actUntil > b.t, 'a block occupies the hero');
    }
    assert.ok(swings > 5, 'the fight had attacks to check');
  }
});

test('units hold their maximum range, stepping past the midpoint only when there is room', () => {
  const b = make('xinyi', ['golem']);
  const g = b.foes()[0];
  const H = b.hero;
  // the golem stands deep in the hero's half: no room for Momentum, so Xinyi keeps max range
  g.x = 40;
  assert.ok(Math.abs(b.holdX(H, g.x, 9.5) - (g.x - (H.range - 1))) < 1e-9);
  // the golem far back in its own half: room to stand just past the midpoint (closer than max range)
  g.x = 125;
  const x = b.holdX(H, g.x, 9.5);
  assert.ok(x > b.mid && x >= g.x - H.range, `stands at ${x}, midpoint ${b.mid}`);
});
