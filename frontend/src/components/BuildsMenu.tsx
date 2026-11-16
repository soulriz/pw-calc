import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { BuildState } from '../types';

/** Saved builds in Postgres for the active tab: save it, load another into it, delete. */
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
      })}>{current ? 'Зберегти' : 'Зберегти на сервері'}</button>
      {current && <button className="btn" disabled={busy} onClick={() => run(async () => { setCurrent((await api.createBuild(name, state)).id); await refresh(); flash('Збережено як нову'); })}>Як нову</button>}
      {current && <button className="btn" disabled={busy} onClick={() => run(async () => { await api.deleteBuild(current); setCurrent(null); await refresh(); flash('Видалено'); })}>Видалити</button>}
      <button className={'btn ' + (armed ? 'border-bad text-bad' : '')} onClick={() => { if (!armed) { setArmed(true); return; } setArmed(false); setCurrent(null); onReset(); }}>
        {armed ? 'Точно скинути?' : 'Скинути все'}
      </button>
      {msg && <span className="text-sm text-muted" role="status">{msg}</span>}
    </div>
  );
}
