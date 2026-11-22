// Static-site api (GitHub Pages, no server): same calls as api.ts, data from JSON files made by
// scripts/export-static.mjs, saved builds in localStorage.
import type { BuildState, Item, Meta } from './types';

const BASE = import.meta.env.BASE_URL + 'data/';
const cache = new Map<string, Promise<unknown>>();
function get<T>(file: string): Promise<T> {
  if (!cache.has(file)) {
    const p = fetch(BASE + file).then(r => { if (!r.ok) throw new Error(`${r.status} ${file}`); return r.json(); });
    p.catch(() => cache.delete(file));  // retry after a network error
    cache.set(file, p);
  }
  return cache.get(file) as Promise<T>;
}
const slotItems = (slot: string, classBit?: number) => get<Item[]>(`items/${slot}.json`).then(list =>
  classBit != null && classBit >= 0 && classBit < 31 ? list.filter(i => !i.cm || (i.cm & (1 << classBit)) !== 0) : list);

type Saved = { id: string; name: string; updatedAt: string; data: BuildState };
const KEY = 'pwcalc.builds';
const load = (): Saved[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]'); } catch { return []; } };
const store = (list: Saved[]) => localStorage.setItem(KEY, JSON.stringify(list));  // throws when full: the menu shows the error
const save = (id: string, name: string, data: BuildState) => {
  const b: Saved = { id, name: name.trim().slice(0, 60), updatedAt: new Date().toISOString(), data };
  store([b, ...load().filter(x => x.id !== id)]);
  return { id: b.id, name: b.name };
};

export const api = {
  meta: () => get<Meta>('meta.json'),
  items: async (p: { slot: string; q?: string; classBit?: number; level: number; take?: number; minLvl?: number; maxLvl?: number; sub?: string }) => {
    const q = p.q?.trim().toLowerCase();
    const list = (await slotItems(p.slot, p.classBit)).filter(i =>
      (p.minLvl == null || i.lvl >= p.minLvl) && (p.maxLvl == null || i.lvl <= p.maxLvl) &&
      (!p.sub || i.sub === p.sub) && (!q || i.name.toLowerCase().includes(q)));
    // same order as the server: wearable first, then level and grade down, then name
    list.sort((a, b) => +(a.lvl > p.level) - +(b.lvl > p.level) || b.lvl - a.lvl || (b.gr ?? 0) - (a.gr ?? 0) || a.name.localeCompare(b.name));
    return { total: list.length, items: list.slice(0, Math.min(Math.max(p.take ?? 300, 1), 1000)) };
  },
  subs: async (slot: string, classBit?: number) => {
    const n = new Map<string, number>();
    for (const i of await slotItems(slot, classBit)) if (i.sub) n.set(i.sub, (n.get(i.sub) ?? 0) + 1);
    return [...n].map(([sub, count]) => ({ sub, count })).sort((a, b) => b.count - a.count);
  },
  itemsByIds: async (ids: string[]) => {
    if (!ids.length) return [];
    const slots = await get<Record<string, string>>('ids.json');
    const files = await Promise.all([...new Set(ids.map(id => slots[id]).filter(Boolean))].map(s => get<Item[]>(`items/${s}.json`)));
    const want = new Set(ids);
    return files.flat().filter(i => want.has(i.id));
  },
  builds: async () => load().map(({ id, name, updatedAt }) => ({ id, name, updatedAt })),
  build: async (id: string) => { const b = load().find(x => x.id === id); if (!b) throw new Error('404 build'); return b; },
  createBuild: async (name: string, data: BuildState) => save(crypto.randomUUID(), name, data),
  updateBuild: async (id: string, name: string, data: BuildState) => save(id, name, data),
  deleteBuild: async (id: string) => store(load().filter(x => x.id !== id)),
};
