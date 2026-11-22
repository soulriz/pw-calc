import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { BuildState } from '../types';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const isBuild = (v: unknown): v is BuildState => isObj(v) && ('gear' in v || 'cls' in v || 'stats' in v);

/** Builds from an imported file: our export [{ name, data }], { builds: [...] }, the tabs from localStorage
 *  ({ list: [{ title, build }] }) or a bare build state; anything else is skipped. */
function toBuilds(raw: unknown, fallback: string): { name: string; data: BuildState }[] {
  if (Array.isArray(raw)) return raw.flatMap(x => toBuilds(x, fallback));
  if (!isObj(raw)) return [];
  if (Array.isArray(raw.builds)) return toBuilds(raw.builds, fallback);
  if (Array.isArray(raw.list)) return raw.list.flatMap(t => isObj(t) && isBuild(t.build)
    ? [{ name: String(t.build.name || t.title || fallback), data: t.build }] : []);
  if (isBuild(raw.data)) return [{ name: String(raw.name || raw.data.name || fallback), data: raw.data }];
  if (isBuild(raw)) return [{ name: String(raw.name || fallback), data: raw }];
  return [];
}

/** Saved builds (Postgres, or localStorage on the static site) for the active tab: save, load, delete, export / import a JSON file. */
export function BuildsMenu({ state, title, current, setCurrent, replace, onReset }: {
  state: BuildState; title: string; current: string | null; setCurrent: (id: string | null) => void;
  replace: (raw: unknown) => Promise<void>; onReset: () => void;
}) {
  const [list, setList] = useState<{ id: string; name: string; updatedAt: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [armed, setArmed] = useState(false);

  const refresh = useCallback(async () => { try { setList(await api.builds()); } catch { /* server down */ } }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t); }, [armed]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 2500); };
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { flash('Помилка: ' + String(e)); } finally { setBusy(false); } };
  const name = [state.name.trim() || 'Без імені', title.trim()].filter(Boolean).join(' · ');

  // file backup: all saved builds as [{ name, data }]; import adds them as new saved builds
  const exportAll = () => run(async () => {
    const all = await Promise.all(list.map(b => api.build(b.id).then(x => ({ name: x.name, data: x.data }))));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(all.length ? all : [{ name, data: state }], null, 1)], { type: 'application/json' }));
    a.download = 'pw-calc-builds.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  const importFile = (f: File) => run(async () => {
    let raw: unknown;
    try { raw = JSON.parse((await f.text()).replace(/^﻿/, '')); } catch { throw new Error(`«${f.name}» — не JSON-файл`); }
    const arr = toBuilds(raw, f.name.replace(/\.json$/i, ''));
    if (!arr.length) throw new Error(`у «${f.name}» немає збірок калькулятора`);
    for (const b of arr) await api.createBuild(b.name, b.data);
    await refresh();
    flash(`Імпортовано: ${arr.length}`);
  });

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select className="input w-auto max-w-56" aria-label="Збережені збірки" value={current ?? ''} disabled={busy}
        onChange={e => { const id = e.target.value; if (!id) { setCurrent(null); return; } run(async () => { const b = await api.build(id); await replace(b.data); setCurrent(id); flash('Завантажено'); }); }}>
        <option value="">— збережені збірки —</option>
        {list.map(b => <option key={b.id} value={b.id}>{b.name} · {new Date(b.updatedAt).toLocaleDateString('uk-UA')}</option>)}
      </select>
      <button className="btn" disabled={busy} onClick={() => run(async () => {
        if (current && list.some(b => b.id === current)) await api.updateBuild(current, name, state);
        else setCurrent((await api.createBuild(name, state)).id);
        await refresh();
        flash('Збережено');
      })}>{current || import.meta.env.VITE_STATIC ? 'Зберегти' : 'Зберегти на сервері'}</button>
      {current && <button className="btn" disabled={busy} onClick={() => run(async () => { setCurrent((await api.createBuild(name, state)).id); await refresh(); flash('Збережено як нову'); })}>Як нову</button>}
      {current && <button className="btn" disabled={busy} onClick={() => run(async () => { await api.deleteBuild(current); setCurrent(null); await refresh(); flash('Видалено'); })}>Видалити</button>}
      <button className="btn" disabled={busy} title="Усі збережені збірки у файл .json" onClick={exportAll}>Експорт</button>
      <label className={'btn cursor-pointer ' + (busy ? 'pointer-events-none opacity-50' : '')} title="Додати збірки з файлу .json">
        Імпорт<input type="file" accept=".json,application/json" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importFile(f); }} />
      </label>
      <button className={'btn ' + (armed ? 'border-bad text-bad' : '')} onClick={() => { if (!armed) { setArmed(true); return; } setArmed(false); setCurrent(null); onReset(); }}>
        {armed ? 'Точно скинути?' : 'Скинути все'}
      </button>
      {msg && <span className="text-sm text-muted" role="status">{msg}</span>}
    </div>
  );
}
