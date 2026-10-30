// Full item audit report: node tests/item-audit.mjs [itemId…]
// For every item and hero, the scenarios in which holding the item changes the fight.
import { itemEffect, SCENARIOS } from './itemAudit.js';
import { ITEMS } from '../src/game/data/items.js';
import { HEROES } from '../src/game/data/heroes.js';

const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(ITEMS);
const heroes = Object.keys(HEROES);
const dead = [];
const weak = [];
for (const id of ids) {
  const row = heroes.map((h) => [h, itemEffect(id, h)]);
  const none = row.filter(([, s]) => !s.length).map(([h]) => h);
  const partial = row.filter(([, s]) => s.length && s.length < Object.keys(SCENARIOS).length).map(([h, s]) => `${h}:${s.join('+')}`);
  if (none.length) dead.push(`${id} (${ITEMS[id].en}): nothing for ${none.join(', ')}`);
  else if (partial.length) weak.push(`${id}: only ${partial.join(' ')}`);
}
console.log(`DEAD (${dead.length})\n${dead.join('\n')}\n\nPARTIAL (${weak.length})\n${weak.join('\n')}`);
