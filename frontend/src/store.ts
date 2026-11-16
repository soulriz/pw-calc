// Build state (kept in localStorage) and the item cache loaded from the API.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { buffOk, cleanGear, type Catalog } from './calc';
import { ACTIVE_SLOTS, CLASSES, MAX_LEVEL, MIN_STAT, STAT_KEYS, STORAGE_KEY } from './constants';
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
    if (v >= MIN_STAT && v <= 1000) d.stats[k] = v;
    const w = parseInt(String(s.saved?.[k]), 10);
    d.saved[k] = w >= MIN_STAT && w <= 1000 ? w : d.stats[k];
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

/** A tab: one build of a character; serverId = the saved build it was loaded from / saved to. */
export interface Tab { title: string; build: BuildState; serverId: string | null }
const TABS_KEY = 'pw-calc-web-tabs';
const CURRENT_KEY = 'pw-calc-web-current-build';  // the single-build layout before tabs

function loadTabs(): { list: Tab[]; active: number } {
  try {
    const raw = JSON.parse(localStorage.getItem(TABS_KEY) || 'null');
    if (raw && Array.isArray(raw.list) && raw.list.length) {
      const list: Tab[] = raw.list.slice(0, 20).map((t: Partial<Tab>) => ({
        title: typeof t.title === 'string' ? t.title.slice(0, 30) : '',
        build: sanitize(t.build), serverId: typeof t.serverId === 'string' ? t.serverId : null,
      }));
      return { list, active: Math.min(Math.max(0, parseInt(raw.active, 10) || 0), list.length - 1) };
    }
  } catch { /* fall back to the old single build */ }
  let serverId: string | null = null;
  try { serverId = localStorage.getItem(CURRENT_KEY); } catch { /* storage unavailable */ }
  return { list: [{ title: '', build: load(), serverId }], active: 0 };
}

export function useCalc() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [items, setItems] = useState<Record<string, Item>>({});
  const [tabs, setTabs] = useState(loadTabs);
  const state = tabs.list[tabs.active].build;
  const setStateRaw = useCallback((fn: (s: BuildState) => BuildState) =>
    setTabs(t => ({ ...t, list: t.list.map((x, i) => (i === t.active ? { ...x, build: fn(x.build) } : x)) })), []);
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

  /** Loads the items not cached yet; returns all requested items that exist. */
  const ensureItems = useCallback(async (ids: string[]) => {
    const missing = [...new Set(ids)].filter(id => !itemsRef.current[id]);
    const got = missing.length ? await api.itemsByIds(missing) : [];
    if (got.length) remember(got);
    const all: Record<string, Item> = { ...itemsRef.current, ...Object.fromEntries(got.map(i => [i.id, i])) };
    return Object.fromEntries(ids.filter(id => all[id]).map(id => [id, all[id]]));
  }, [remember]);

  // first load: meta + the items the saved build uses
  useEffect(() => {
    (async () => {
      try {
        const m = await api.meta();
        const t0 = loadTabs();
        const ids = t0.list.flatMap(t => [...Object.values(t.build.gear).map(g => g.id), ...t.build.inv.map(g => g.id)]);
        const list = await api.itemsByIds([...new Set(ids)]);
        const map = Object.fromEntries(list.map(i => [i.id, i]));
        const c = { items: map, stones: Object.fromEntries(m.stones.map(x => [x.id, x])), meta: m };
        setMeta(m);
        setItems(map);
        setTabs({ ...t0, list: t0.list.map(t => ({ ...t, build: fit(t.build, c) })) });
        setReady(true);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));  // the active build, as before tabs
    } catch { /* storage unavailable */ }
  }, [tabs, state, ready]);

  const update = setStateRaw;

  // tabs: several builds side by side
  const selectTab = useCallback((i: number) => setTabs(t => ({ ...t, active: Math.min(Math.max(0, i), t.list.length - 1) })), []);
  const addTab = useCallback((copy: boolean) => setTabs(t => {
    if (t.list.length >= 20) return t;
    const cur = t.list[t.active];
    const tab: Tab = copy ? { title: cur.title, build: structuredClone(cur.build), serverId: null } : { title: '', build: defaults(), serverId: null };
    return { list: [...t.list, tab], active: t.list.length };
  }), []);
  const closeTab = useCallback((i: number) => setTabs(t => {
    if (t.list.length <= 1) return t;
    const list = t.list.filter((_, k) => k !== i);
    return { list, active: Math.min(t.active > i ? t.active - 1 : t.active, list.length - 1) };
  }), []);
  const renameTab = useCallback((i: number, title: string) =>
    setTabs(t => ({ ...t, list: t.list.map((x, k) => (k === i ? { ...x, title: title.slice(0, 30) } : x)) })), []);
  const setServerId = useCallback((id: string | null) =>
    setTabs(t => ({ ...t, list: t.list.map((x, k) => (k === t.active ? { ...x, serverId: id } : x)) })), []);

  /** Replaces the whole build (load from server, reset); loads its items first. */
  const replace = useCallback(async (raw: unknown) => {
    if (!meta) return;
    const s = sanitize(raw);
    const ids = [...Object.values(s.gear).map(g => g.id), ...s.inv.map(g => g.id)];
    const list = await api.itemsByIds([...new Set(ids)].filter(id => !itemsRef.current[id]));
    const map = { ...itemsRef.current, ...Object.fromEntries(list.map(i => [i.id, i])) };
    setItems(map);
    setStateRaw(() => fit(s, { items: map, stones, meta }));
  }, [meta, stones, setStateRaw]);

  const setStat = useCallback((k: StatKey, v: number) => update(s => ({ ...s, stats: { ...s.stats, [k]: v } })), [update]);

  return { meta, cat, state, ready, error, update, replace, remember, ensureItems, setStat,
           tabs, selectTab, addTab, closeTab, renameTab, setServerId };
}
