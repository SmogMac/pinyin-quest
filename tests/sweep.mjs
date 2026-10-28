// Balance sweep helper (not part of npm test): node tests/sweep.mjs
import { playRun } from './sim.js';
const heroes = ['xinyi', 'mei', 'ruizhe', 'huojin', 'fuyun'];
const out = {};
for (const heroId of heroes) {
  let wins = 0, floors = 0; const d = { battle: [], elite: [], guardian: [], boss: [] };
  const N = 50;
  for (let s = 1; s <= N; s++) { const { run, durations } = playRun(s * 7919 + heroId.length, { heroId }); if (run.phase === 'victory') wins++; floors += run.floor; for (const k in d) d[k].push(...durations[k]); }
  const avg = (a) => (a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-');
  out[heroId] = { win: (wins / N).toFixed(2), floor: (floors / N).toFixed(1), battle: avg(d.battle), elite: avg(d.elite), guardian: avg(d.guardian), boss: avg(d.boss) };
}
console.table(out);
