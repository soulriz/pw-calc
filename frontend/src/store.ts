// Build state (kept in localStorage) and the item cache loaded from the API.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { buffOk, cleanGear, type Catalog } from './calc';
import { ACTIVE_SLOTS, CLASSES, MAX_LEVEL, STAT_KEYS, STORAGE_KEY } from './constants';
import type { BuffLevel, BuildState, Gear, Item, Meta, StatKey } from './types';

export const defaults = (): BuildState => ({
  name: '', sex: 'm', cls: 'warrior', level: 100,
  stats: { vit: 5, str: 5, int: 5, dex: 5 }, saved: { vit: 5, str: 5, int: 5, dex: 5 },
  gear: {}, inv: [], buffs: {}, bfl: {},
});

/** Shape check of saved data; item-dependent checks run later in `fit` once items are loaded. */
export function sanitize(raw: unknown): BuildState {
  const d = defaults();
  const s = raw as Partial<BuildState> | null;
  if (!s || typeof s !== 'object') return d;
  if (typeof s.name === 'string') d.name = s.name.slice(0, 24);
  if (s.cls && CLASSES[s.cls]) d.cls = s.cls;
  if (s.sex === 'f') d.sex = 'f';
  const lv = parseInt(String(s.level), 10);
  if (lv >= 1 && lv <= MAX_LEVEL) d.level = lv;
  for (const k of STAT_KEYS) {
    const v = parseInt(String(s.stats?.[k]), 10);
    if (v >= 5 && v <= 1000) d.stats[k] = v;
    const w = parseInt(String(s.saved?.[k]), 10);
    d.saved[k] = w >= 5 && w <= 1000 ? w : d.stats[k];
  }
  const okGear = (g: unknown): g is Gear => !!g && typeof (g as Gear).id === 'string';
  if (s.gear && typeof s.gear === 'object') for (const sl of ACTIVE_SLOTS) { const g = s.gear[sl.id]; if (okGear(g)) d.gear[sl.id] = g; }
  if (Array.isArray(s.inv)) d.inv = s.inv.filter(okGear).slice(0, 48);
  for (const key of ['buffs', 'bfl'] as const) {
    const src = s[key];
    if (src && typeof src === 'object') for (const [id, v] of Object.entries(src)) if (typeof v === 'number' || v === 'rs' || v === 'je') d[key][id] = v;
  }
  return d;
}

/** Drops gear that does not exist or does not fit its slot, and buffs with a bad level. */
function fit(s: BuildState, cat: Catalog): BuildState {
  const gear: Record<string, Gear> = {};
  for (const sl of ACTIVE_SLOTS) {
    const g = s.gear[sl.id];
    const it = g && cat.items[g.id];
    if (it && it.slot === sl.type) gear[sl.id] = cleanGear(g, it, cat.stones);
  }
  const inv = s.inv.filter(g => cat.items[g.id]).map(g => cleanGear(g, cat.items[g.id], cat.stones));
  const keep = (src: Record<string, BuffLevel>) =>
    Object.fromEntries(Object.entries(src).filter(([id, lv]) => buffOk(cat.meta.buffs.skills[id], lv)));
  return { ...s, gear, inv, buffs: keep(s.buffs), bfl: keep(s.bfl) };
}

function load(): BuildState {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? sanitize(JSON.parse(raw)) : defaults(); } catch { return defaults(); }
}

export function useCalc() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [state, setStateRaw] = useState<BuildState>(load);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const stones = useMemo(() => Object.fromEntries((meta?.stones || []).map(x => [x.id, x])), [meta]);
  const cat: Catalog | null = useMemo(() => (meta ? { items, stones, meta } : null), [items, stones, meta]);

  /** Adds items to the cache (from lists or by id). */
  const remember = useCallback((list: Item[]) => setItems(prev => {
    const next = { ...prev };
    for (const it of list) next[it.id] = it;
    return next;
  }), []);

  const ensureItems = useCallback(async (ids: string[]) => {
    const missing = [...new Set(ids)].filter(id => !itemsRef.current[id]);
    if (missing.length) remember(await api.itemsByIds(missing));
  }, [remember]);

  // first load: meta + the items the saved build uses
  useEffect(() => {
    (async () => {
      try {
        const m = await api.meta();
        const s = load();
        const ids = [...Object.values(s.gear).map(g => g.id), ...s.inv.map(g => g.id)];
        const list = await api.itemsByIds([...new Set(ids)]);
        const map = Object.fromEntries(list.map(i => [i.id, i]));
        setMeta(m);
        setItems(map);
        setStateRaw(fit(s, { items: map, stones: Object.fromEntries(m.stones.map(x => [x.id, x])), meta: m }));
        setReady(true);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  }, [state, ready]);

  const update = useCallback((fn: (s: BuildState) => BuildState) => setStateRaw(prev => fn(prev)), []);

  /** Replaces the whole build (load from server, reset); loads its items first. */
  const replace = useCallback(async (raw: unknown) => {
    if (!meta) return;
    const s = sanitize(raw);
    const ids = [...Object.values(s.gear).map(g => g.id), ...s.inv.map(g => g.id)];
    const list = await api.itemsByIds([...new Set(ids)].filter(id => !itemsRef.current[id]));
    const map = { ...itemsRef.current, ...Object.fromEntries(list.map(i => [i.id, i])) };
    setItems(map);
    setStateRaw(fit(s, { items: map, stones, meta }));
  }, [meta, stones]);

  const setStat = useCallback((k: StatKey, v: number) => update(s => ({ ...s, stats: { ...s.stats, [k]: v } })), [update]);

  return { meta, cat, state, ready, error, update, replace, remember, ensureItems, setStat };
}
