// Static site data: splits data/items_calc.js + buffs_calc.js into JSON files the static api (src/api.static.ts) reads.
// Usage: node scripts/export-static.mjs <outDir>   (writes <outDir>/data/...)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = join(process.argv[2] ?? 'dist', 'data');
const src = new URL('../../data/', import.meta.url);
const g = {};
for (const f of ['items_calc.js', 'buffs_calc.js'])
  for (const line of readFileSync(new URL(f, src), 'utf8').split('\n')) {
    const m = line.match(/^window\.(\w+) = (.*?);?\s*$/);
    if (m) g[m[1]] = JSON.parse(m[2]);
  }

mkdirSync(join(out, 'items'), { recursive: true });
const write = (f, v) => writeFileSync(join(out, f), JSON.stringify(v));

// same shape as GET /api/meta
const b = g.PW_BUFFS;
write('meta.json', { stones: g.PW_STONES, sets: g.PW_SETS, buffs: { skills: b.skills, classes: b.classes, debuffs: b.debuffs } });

// one file per slot, loaded when that slot is opened; ids.json maps item id -> slot for saved builds
const bySlot = {}, ids = {};
for (const it of g.PW_ITEMS) { (bySlot[it.slot] ??= []).push(it); ids[it.id] = it.slot; }
for (const [slot, list] of Object.entries(bySlot)) write(`items/${slot}.json`, list);
write('ids.json', ids);
console.log(`static data: ${g.PW_ITEMS.length} items in ${Object.keys(bySlot).length} slots -> ${out}`);
