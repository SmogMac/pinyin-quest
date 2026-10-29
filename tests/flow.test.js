// Battle completion, signature moves, Lei, save migration and route-map regression tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle, buildHero } from '../src/game/combat.js';
import { COMBAT } from '../src/game/data/balance.js';
import { generateActMap, newRun } from '../src/game/run.js';
import { hydrate } from '../src/store/store.js';

const ends = (evs) => evs.filter((e) => e.type === 'end');
/** Steps like the UI: one step per frame, plus a drain for events emitted outside steps. */
function play(b, seconds) {
  const out = [];
  for (let t = 0; t < seconds && !b.result; t += COMBAT.dt) out.push(...b.step(COMBAT.dt));
  out.push(...b.drain());
  return out;
}
const battle = (enemies, opts = {}) => new Battle({ hero: buildHero({ heroId: 'xinyi', ...opts }), enemies, seed: 3, ...opts.battle });

test('victory: final enemy killed by a signature move outside a step is delivered by drain()', () => {
  const b = battle(['slime']);
  play(b, 1);
  const e = b.foes()[0];
  e.hp = 1;
  b.sig.state = 'ready';
  b.beginCast();
  b.finishCast(true, { choice: 'apple' }); // an apple to the face
  assert.equal(b.result, 'win');
  assert.equal(b.result, 'win');
  const evs = b.drain();
  assert.equal(ends(evs).length, 1, 'exactly one end event, available without another step');
  assert.equal(b.step(COMBAT.dt).length, 0, 'a finished battle emits nothing more');
});

test('victory: last enemy dies from burn (damage over time)', () => {
  const b = battle(['slime']);
  const e = b.foes()[0];
  e.hp = 3;
  b.applyStatus(e, 'burn', { dps: 50, dur: 3, src: b.hero });
  const evs = play(b, 3);
  assert.equal(b.result, 'win');
  assert.equal(ends(evs).length, 1);
});

test('victory: several enemies dying at once ends the battle exactly once', () => {
  const b = battle(['slime', 'slime', 'bat']);
  const evs = [];
  for (const f of b.foes()) f.hp = 1;
  for (const f of [...b.foes()]) b.damage(b.hero, f, 99, { element: 'fire', kind: 'spell' });
  evs.push(...b.drain(), ...play(b, 1));
  assert.equal(b.result, 'win');
  assert.equal(ends(evs).length, 1);
});

test('victory: last kill happens inside an elemental chain reaction', () => {
  const b = battle(['slime', 'slime']);
  for (const f of b.foes()) {
    f.hp = 2;
    b.applyStatus(f, 'wet', { dur: 5, src: b.hero });
  }
  // lightning on a Wet target conducts to every Wet enemy
  b.damage(b.hero, b.foes()[0], 5, { element: 'lightning', kind: 'spell' });
  const evs = [...b.drain(), ...play(b, 1)];
  assert.equal(b.result, 'win');
  assert.equal(ends(evs).length, 1);
});

test('hero and last enemy falling together resolves to one outcome', () => {
  const b = battle(['golem']);
  const e = b.foes()[0];
  e.hp = 1;
  b.hero.hp = 1;
  b.damage(e, b.hero, 999, { kind: 'attack' });
  b.damage(b.hero, e, 999, { kind: 'proc' });
  const evs = [...b.drain(), ...play(b, 1)];
  assert.ok(['win', 'lose'].includes(b.result));
  assert.equal(ends(evs).length, 1);
});

test('boss killed during a phase transition still wins', () => {
  const b = battle(['wyrm']);
  const boss = b.foes()[0];
  // take it right through every phase threshold in one blow
  b.damage(b.hero, boss, boss.maxHp * 5, { element: 'fire', kind: 'spell' });
  const evs = [...b.drain(), ...play(b, 2)];
  assert.equal(b.result, 'win', 'no summon or phase can keep a dead boss fighting');
  assert.equal(ends(evs).length, 1);
});

test('safety net: a unit left at 0 HP is resolved on the next tick', () => {
  const b = battle(['slime']);
  b.foes()[0].hp = 0; // e.g. HP changed directly by an item effect
  play(b, 0.2);
  assert.equal(b.result, 'win');
});

test('a run has no spells: the hero brings exactly one signature move', () => {
  const run = newRun({ seed: 5, heroId: 'lei' });
  assert.equal(run.spells, undefined);
  const b = new Battle({ hero: buildHero({ heroId: 'lei' }), enemies: ['slime'], seed: 1 });
  assert.equal(b.sig.id, 'knockback');
  assert.equal(b.spells, undefined, 'no spell slots exist');
});

test('saved runs with pickup spells migrate: spells removed, refunded as ink, nothing else lost', () => {
  const s = hydrate({
    words: { 你好: { ok: 3 } },
    adventure: { dragonWins: 2, current: { v: 2, heroId: 'xinyi', spells: ['jiayou', 'huoqiu'], ink: 5, items: ['ember_tip'], reward: { kind: 'spell', spell: 'dafeng', ink: 12 }, shop: { stock: [{ kind: 'spell', id: 'x' }, { kind: 'item', id: 'vitality' }] } } },
  });
  const cur = s.adventure.current;
  assert.equal(cur.spells, undefined);
  assert.equal(cur.ink, 45, 'one found spell refunded');
  assert.equal(cur.notice.kind, 'signatures');
  assert.deepEqual(cur.items, ['ember_tip']);
  assert.equal(cur.reward.kind, 'items', 'a pending spell reward becomes an item choice');
  assert.deepEqual(cur.shop.stock.map((x) => x.kind), ['item'], 'spells leave the shop');
  assert.equal(s.words['你好'].ok, 3, 'learning progress intact');
  assert.equal(s.adventure.dragonWins, 2, 'story progress intact');
  // the migrated run can be played
  const b = new Battle({ hero: buildHero({ heroId: cur.heroId, items: cur.items }), enemies: ['slime'], seed: 1 });
  assert.equal(b.sig.id, 'fruit_salad');
});

test('Lei: Static Temper still bursts; Knockback! flings enemies to the far wall without damage', () => {
  const b = new Battle({ hero: buildHero({ heroId: 'lei' }), enemies: ['golem', 'golem'], seed: 2 });
  const evs = play(b, 25);
  assert.ok(evs.some((e) => e.type === 'burst'), 'a charged swing releases a burst');
  const c = new Battle({ hero: buildHero({ heroId: 'lei' }), enemies: ['slime', 'goblin'], seed: 2 });
  play(c, 1);
  const hp = c.foes().map((f) => f.hp);
  const x0 = c.foes().map((f) => f.x);
  c.sig.state = 'ready';
  c.beginCast();
  c.finishCast(true);
  const out = [...c.drain()];
  for (let i = 0; i < 30; i++) out.push(...c.step(COMBAT.dt));
  assert.deepEqual(c.foes().map((f) => f.hp), hp, 'no direct damage');
  c.foes().forEach((f, i) => assert.ok(f.x > x0[i] + 10, `enemy ${i} flew back (${x0[i].toFixed(0)} → ${f.x.toFixed(0)})`));
  assert.ok(c.foes().some((f) => f.x > COMBAT.worldW - 15), 'reaches the far wall');
  assert.ok(out.some((e) => e.type === 'wallHit'), 'slams into it');
  // enemies slide, they don't teleport
  const d = new Battle({ hero: buildHero({ heroId: 'lei' }), enemies: ['slime'], seed: 2 });
  const s0 = d.foes()[0].x;
  d.sig.state = 'ready';
  d.beginCast();
  d.finishCast(true);
  for (let i = 0; i < 9; i++) d.step(COMBAT.dt); // swing wind-up (0.35s) + one tick
  assert.ok(d.foes()[0].x - s0 < 20, 'still travelling, not teleported');
});

test('Lei: bosses are pushed less, but still meaningfully', () => {
  const b = new Battle({ hero: buildHero({ heroId: 'lei' }), enemies: ['wyrm'], seed: 2 });
  const boss = b.foes()[0];
  boss.x = 60;
  b.sig.state = 'ready';
  b.beginCast();
  b.finishCast(true);
  for (let i = 0; i < 40; i++) b.step(COMBAT.dt);
  const moved = boss.x - 60;
  assert.ok(moved >= 10 && moved < COMBAT.worldW - 63, `boss moved ${moved.toFixed(1)}`);
});

test('route maps: every node is connected and no two routes cross', () => {
  for (let seed = 1; seed <= 300; seed++) {
    for (const act of [1, 2, 3]) {
      const map = generateActMap(seed, act, 'bamboo');
      const nodes = Object.values(map.nodes);
      const incoming = new Set(nodes.flatMap((n) => n.next));
      for (const n of nodes) {
        if (n.row > 0) assert.ok(incoming.has(n.id), `seed ${seed}: ${n.id} has a path leading to it`);
        if (n.type !== 'guardian' && n.type !== 'boss') assert.ok(n.next.length > 0, `seed ${seed}: ${n.id} leads somewhere`);
      }
      // a crossing is a→b' and a'→b between the same two rows with the columns swapped
      const edges = nodes.flatMap((n) => n.next.map((id) => [n, map.nodes[id]])).filter(([, m]) => typeof m.col === 'number' && Number.isInteger(m.col));
      for (const [a, b] of edges) {
        for (const [c, d] of edges) {
          if (a.row !== c.row) continue;
          assert.ok(!((a.col - c.col) * (b.col - d.col) < 0), `seed ${seed} act ${act}: ${a.id}>${b.id} crosses ${c.id}>${d.id}`);
        }
      }
    }
  }
});

// ------------------------------------------------------------------ positioning
const solo = (heroId, enemies, opts = {}) => new Battle({ hero: buildHero({ heroId, ...opts }), enemies, seed: 4, ...opts.battle });
const tick = (b, s) => {
  for (let t = 0; t < s; t += COMBAT.dt) b.step(COMBAT.dt);
};

test('knockback moves the target smoothly over several ticks, not instantly', () => {
  const b = solo('xinyi', ['slime']);
  const e = b.foes()[0];
  const x0 = e.x;
  b.knockback(e, 10, { src: b.hero });
  assert.equal(e.x, x0, 'no teleport on the hit itself');
  b.physics(COMBAT.dt);
  const first = e.x - x0;
  assert.ok(first > 0 && first < 6, `first tick covers part of it (${first.toFixed(2)})`);
  for (let i = 0; i < 30; i++) b.physics(COMBAT.dt);
  assert.ok(Math.abs(e.x - x0 - 10) < 1.5, `total ≈ 10 (${(e.x - x0).toFixed(2)})`);
});

test('knockback resistance, bosses and pulls', () => {
  const b = solo('xinyi', ['slime', 'golem']);
  const [slime, golem] = b.foes();
  assert.ok(b.knockback(golem, 10) < b.knockback(slime, 10), 'golems resist pushes');
  const boss = solo('xinyi', ['wyrm']).foes()[0];
  assert.ok(boss.kbRes >= 0.6, 'bosses are hard to move');
  const c = solo('lei', ['slime']);
  const e = c.foes()[0];
  const x0 = e.x;
  c.pull(e, 8, { src: c.hero });
  for (let i = 0; i < 30; i++) c.physics(COMBAT.dt);
  assert.ok(e.x < x0, 'pull drags the enemy toward the hero');
  assert.ok(e.x >= c.hero.x + 5, 'never through the hero');
});

test('nothing is pushed out of the arena', () => {
  const b = solo('xinyi', ['slime']);
  const e = b.foes()[0];
  b.knockback(e, 500);
  b.knockback(b.hero, 500);
  for (let i = 0; i < 60; i++) b.physics(COMBAT.dt);
  assert.ok(e.x <= COMBAT.worldW - 2 && b.hero.x >= 2);
});

test('a dodge is a real hop backwards', () => {
  const b = solo('fuyun', ['goblin']);
  b.hero.dodge = 1; // always dodge
  const x0 = b.hero.x;
  const goblin = b.foes()[0];
  b.damage(goblin, b.hero, 10, { kind: 'attack' });
  for (let i = 0; i < 30; i++) b.physics(COMBAT.dt);
  assert.ok(x0 - b.hero.x > COMBAT.dodgeHop * 0.8, `hopped back ${(x0 - b.hero.x).toFixed(1)}`);
  assert.equal(b.hero.hp, b.hero.maxHp, 'and took no damage');
});

test('Momentum: gained in the opposing half, with a buffer at the line, and it speeds up attacks', () => {
  const b = solo('xinyi', ['golem']);
  const H = b.hero;
  const mid = COMBAT.worldW / 2;
  const at = (x) => {
    H.x = x;
    b.updateMomentum();
    return !!H.momentum;
  };
  assert.equal(at(mid - 10), false);
  assert.equal(at(mid + 1), false, 'not yet: inside the buffer');
  assert.equal(at(mid + COMBAT.zoneBuffer + 1), true, 'deep enough: Momentum');
  assert.equal(at(mid + 1), true, 'hysteresis: keeps it on the line');
  assert.equal(at(mid - COMBAT.zoneBuffer - 1), false, 'back home: lost');
  const base = b.attackSpeed(H);
  at(mid + 10);
  assert.ok(Math.abs(b.attackSpeed(H) / base - (1 + COMBAT.momentumAspd)) < 1e-9, 'attack speed +25%');
  // enemies mirror it in the hero's half
  const g = b.foes()[0];
  g.x = mid - 10;
  b.updateMomentum();
  assert.equal(!!g.momentum, true);
});

test('faster heroes reach the midpoint sooner', () => {
  const when = (heroId) => {
    const b = solo(heroId, ['turtle']);
    let t = 0;
    while (b.hero.x < COMBAT.worldW / 2 && t < 20) {
      b.step(COMBAT.dt);
      t += COMBAT.dt;
    }
    return t;
  };
  assert.ok(when('fuyun') < when('lei'), 'Fú Yún (fast) beats Léi (slow) to the line');
});

test('positioning is stable: no units overlap and nobody jitters back and forth', () => {
  const b = solo('mei', ['slime', 'goblin', 'golem']);
  let flips = 0;
  let lastDir = 0;
  let lastX = b.hero.x;
  for (let i = 0; i < 400 && !b.result; i++) {
    b.step(COMBAT.dt);
    const ground = b.foes().filter((f) => !f.flying).sort((a, c) => a.x - c.x);
    for (let j = 1; j < ground.length; j++) assert.ok(ground[j].x - ground[j - 1].x >= COMBAT.minGap - 1e-6, 'enemies keep a body-width apart');
    const dx = b.hero.x - lastX;
    const dir = Math.abs(dx) < 0.05 ? 0 : Math.sign(dx);
    if (dir && lastDir && dir !== lastDir && !b.hero.vx) flips++;
    if (dir) lastDir = dir;
    lastX = b.hero.x;
  }
  assert.ok(flips < 25, `self-driven direction changes: ${flips}`);
});

test('battles with positioning still always resolve', () => {
  for (const heroId of ['xinyi', 'mei', 'ruizhe', 'huojin', 'fuyun', 'lei']) {
    for (const enemies of [['slime', 'goblin', 'bat'], ['golem'], ['wyrm']]) {
      const b = new Battle({ hero: buildHero({ heroId, accountLevel: 8 }), enemies, seed: 9, floor: 8 });
      tick(b, COMBAT.maxDuration + 1);
      assert.ok(['win', 'lose'].includes(b.result), `${heroId} vs ${enemies}: ${b.result}`);
    }
  }
});
