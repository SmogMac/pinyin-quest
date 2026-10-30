// Writes docs/ITEMS.md: every passive item and synergy, straight from the game data, so the list
// can never drift from the game. Run after changing items: npm run items-doc
import fs from 'node:fs';
import { ITEMS } from '../src/game/data/items.js';
import { SYNERGIES } from '../src/game/data/synergies.js';
import { ELEMENTS } from '../src/game/data/elements.js';
import { ITEM_ART } from '../src/assets/itemArt.js';

const vocab = JSON.parse(fs.readFileSync(new URL('../src/data/vocab.json', import.meta.url)));
const word = Object.fromEntries(vocab.map((w) => [w.id, w]));
const esc = (s) => String(s).replace(/\|/g, '\\|');
const unlock = (req) =>
  req?.length
    ? req
        .filter((zh) => word[zh])
        .map((zh) => `${word[zh].pinyin} ${zh}`)
        .join(' or ')
    : 'always';

const CATEGORIES = [
  ['attack', 'Basic attacks'],
  ['movement', 'Movement'],
  ['dodge', 'Dodging'],
  ['defense', 'Defence'],
  ['signature', 'Signature moves'],
  ['momentum', 'Momentum'],
  ['positioning', 'Positioning and knockback'],
  ['status', 'Statuses and elements'],
  ['conditional', 'Conditional'],
  ['strange', 'Strange and build-changing'],
];
const RARITY = { common: 0, rare: 1, epic: 2 };
const items = Object.entries(ITEMS);
const counts = { common: 0, rare: 0, epic: 0 };
for (const [, it] of items) counts[it.rarity] += 1;

let out = `# All passive items

${items.length} passive items (${counts.common} common, ${counts.rare} rare, ${counts.epic} epic) and ${Object.keys(SYNERGIES).length} synergies. Every item works for every hero.

**Generated from the game data** by \`tools/list-items.mjs\` (\`npm run items-doc\`); don't edit by hand. In the game, the same list is in **Adventure → Codex → Items** (locked items show the word that unlocks them).

**Unlock**: an item can only turn up once you have learned one of these words ("always" = from the start). Learning never gives an item directly; it only adds it to what you can find.

`;
for (const [cat, title] of CATEGORIES) {
  const list = items.filter(([, it]) => it.category === cat).sort((a, b) => RARITY[a[1].rarity] - RARITY[b[1].rarity] || a[1].en.localeCompare(b[1].en));
  if (!list.length) continue;
  out += `## ${title} (${list.length})\n\n| | Item | Rarity | Element | Effect | Unlock |\n| --- | --- | --- | --- | --- | --- |\n`;
  for (const [id, it] of list) {
    const icon = ITEM_ART[id] ? `<img src="../public/${ITEM_ART[id]}" width="36" alt="">` : '';
    const el = ELEMENTS[it.element];
    out += `| ${icon} | **${esc(it.en)}**<br>${it.py} ${it.zh} | ${it.rarity} | ${el.name} | ${esc(it.desc)} | ${unlock(it.requires)} |\n`;
  }
  out += '\n';
}
out += `## Synergies (${Object.keys(SYNERGIES).length})

A synergy switches on by itself when you own all the items it lists.

| Synergy | Needs | Effect |
| --- | --- | --- |
`;
for (const sy of Object.values(SYNERGIES).sort((a, b) => a.en.localeCompare(b.en))) {
  out += `| **${esc(sy.en)}**<br>${sy.py} ${sy.zh} | ${sy.requires.map((r) => ITEMS[r]?.en || r).join(' + ')} | ${esc(sy.desc)} |\n`;
}
fs.writeFileSync('docs/ITEMS.md', out);
console.log(`docs/ITEMS.md: ${items.length} items, ${Object.keys(SYNERGIES).length} synergies`);
