import type { BuildState, Item, Meta } from './types';
import { api as staticApi } from './api.static';

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json() as Promise<T>;
}
async function send<T>(method: string, url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return (r.status === 204 ? undefined : await r.json()) as T;
}

const serverApi = {
  meta: () => get<Meta>('/api/meta'),
  items: (p: { slot: string; q?: string; classBit?: number; level: number; take?: number; minLvl?: number; maxLvl?: number; sub?: string }) => {
    const qs = new URLSearchParams({ slot: p.slot, level: String(p.level), take: String(p.take ?? 300) });
    if (p.q) qs.set('q', p.q);
    if (p.classBit != null) qs.set('classBit', String(p.classBit));
    if (p.minLvl != null) qs.set('minLvl', String(p.minLvl));
    if (p.maxLvl != null) qs.set('maxLvl', String(p.maxLvl));
    if (p.sub) qs.set('sub', p.sub);
    return get<{ total: number; items: Item[] }>('/api/items?' + qs);
  },
  subs: (slot: string, classBit?: number) =>
    get<{ sub: string; count: number }[]>(`/api/items/subs?slot=${slot}` + (classBit != null ? `&classBit=${classBit}` : '')),
  itemsByIds: (ids: string[]) => (ids.length ? get<Item[]>('/api/items/by-ids?ids=' + encodeURIComponent(ids.join(','))) : Promise.resolve([])),
  builds: () => get<{ id: string; name: string; updatedAt: string }[]>('/api/builds'),
  build: (id: string) => get<{ id: string; name: string; data: BuildState }>(`/api/builds/${id}`),
  createBuild: (name: string, data: BuildState) => send<{ id: string; name: string }>('POST', '/api/builds', { name, data }),
  updateBuild: (id: string, name: string, data: BuildState) => send<{ id: string; name: string }>('PUT', `/api/builds/${id}`, { name, data }),
  deleteBuild: (id: string) => send<void>('DELETE', `/api/builds/${id}`),
};

// `vite build --mode static` (GitHub Pages): JSON files + localStorage instead of the server; the other one is dropped from the bundle
export const api: typeof serverApi = import.meta.env.VITE_STATIC ? staticApi : serverApi;
