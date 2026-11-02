import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { BuildState } from '../types';

const CURRENT_KEY = 'pw-calc-web-current-build';

/** Saved builds in Postgres: save the current one, load or delete others. */
export function BuildsMenu({ state, replace, onReset }: { state: BuildState; replace: (raw: unknown) => Promise<void>; onReset: () => void }) {
  const [list, setList] = useState<{ id: string; name: string; updatedAt: string }[]>([]);
  const [current, setCurrent] = useState<string | null>(() => { try { return localStorage.getItem(CURRENT_KEY); } catch { return null; } });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [armed, setArmed] = useState(false);

  const refresh = useCallback(async () => { try { setList(await api.builds()); } catch { /* server down */ } }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { try { if (current) localStorage.setItem(CURRENT_KEY, current); else localStorage.removeItem(CURRENT_KEY); } catch { /* ignore */ } }, [current]);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3000); return () => clearTimeout(t); }, [armed]);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(''), 2500); };
  const run = async (fn: () => Promise<void>) => { setBusy(true); try { await fn(); } catch (e) { flash('Помилка: ' + String(e)); } finally { setBusy(false); } };
  const name = state.name.trim() || 'Без імені';

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
