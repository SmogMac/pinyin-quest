// Battle completion, two spell slots, Lei, save migration and route-map regression tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Battle, buildHero } from '../src/game/combat.js';
import { COMBAT } from '../src/game/data/balance.js';
import { SPELL_SLOTS } from '../src/game/data/spells.js';
import { generateActMap, newRun, takeSpell, replaceableSlots } from '../src/game/run.js';
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

test('victory: final enemy killed by a spell outside a step is delivered by drain()', () => {
  const b = battle(['slime']);
  play(b, 1);
  const e = b.foes()[0];
  e.hp = 1;
  b.spells[0].state = 'ready';
  b.beginCast(0);
  // Cheer On does no damage, so force the kill the way a damaging spell would
  b.damage(b.hero, e, 999, { element: 'fire', kind: 'spell' });
  b.finishCast(0, true);
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

test('two spell slots: signature is locked, one pickup slot', () => {
  assert.equal(SPELL_SLOTS, 2);
  const run = newRun({ seed: 5, heroId: 'lei' });
  assert.deepEqual(run.spells, ['leiting']);
  takeSpell(run, 'huoqiu');
  assert.deepEqual(run.spells, ['leiting', 'huoqiu']);
  takeSpell(run, 'dafeng'); // full and no slot chosen: rejected
  assert.deepEqual(run.spells, ['leiting', 'huoqiu']);
  assert.deepEqual(replaceableSlots(run), [1], 'only the pickup slot can be replaced');
  takeSpell(run, 'dafeng', 0); // signature can't be replaced
  takeSpell(run, 'dafeng', 1);
  assert.deepEqual(run.spells, ['leiting', 'dafeng']);
});

test('saved runs with three spells migrate to two (extra refunded as ink)', () => {
  const s = hydrate({ adventure: { current: { spells: ['jiayou', 'huoqiu', 'shandian'], ink: 5 } } });
  assert.deepEqual(s.adventure.current.spells, ['jiayou', 'shandian']);
  assert.equal(s.adventure.current.ink, 45);
  assert.equal(s.adventure.current.notice.kind, 'spellSlots');
});

test('Lei: Static Temper charges on hits and bursts with lightning; Thunder Crash shocks', () => {
  const b = new Battle({ hero: buildHero({ heroId: 'lei' }), enemies: ['golem', 'golem'], seed: 2 });
  const evs = play(b, 12);
  assert.ok(evs.some((e) => e.type === 'burst'), 'a charged swing releases a burst');
  assert.ok(evs.some((e) => e.type === 'hit' && e.element === 'lightning' && e.kind === 'proc'));
  const c = new Battle({ hero: buildHero({ heroId: 'lei' }), enemies: ['golem'], seed: 2 });
  play(c, 1);
  c.spells[0].state = 'ready';
  c.beginCast(0);
  c.finishCast(0, true);
  const ev = c.drain();
  assert.ok(ev.some((e) => e.type === 'slam'));
  assert.ok(c.foes().every((f) => f.statuses.shock));
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
