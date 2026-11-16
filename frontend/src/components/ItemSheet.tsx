import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { classOk, problems, stoneSide, type Catalog } from '../calc';
import { CLASSES, CLASS_BIT, CUSTOM, INV_MAX, RANGED, SLOT } from '../constants';
import { dec, nf, norm } from '../format';
import type { BuildState, Gear, Item } from '../types';
import { ItemCard } from './ItemCard';
import { ItemIcon } from './common';

const MAX_ROWS = 300;

function summary(it: Item) {
  if (it.slot === 'ammo') return `Фіз. атака +${nf(it.dmg || 0)}, ранг зброї ${it.gr}–${it.grMax}`;
  if (it.fix) return it.fix.slice(0, 2).map(f => f.t).join(', ');
  if (it.slot === 'weapon')
    return (it.mmax || 0) > (it.pmax || 0) ? `Маг. атака ${nf(it.mmin || 0)}–${nf(it.mmax || 0)}` : `Фіз. атака ${nf(it.pmin || 0)}–${nf(it.pmax || 0)}`;
  const first = Object.entries(it.stats || {})[0];
  const L: Record<string, string> = { hp: "Здоров'я", mp: 'Мана', patk: 'Фіз. атака', matk: 'Маг. атака', pdef: 'Фіз. захист', mdef: 'Маг. захист', eva: 'Ухилення' };
  return first ? `${L[first[0]] || first[0]} +${nf(first[1])}` : '';
}

export function ItemSheet({ slotId, state, cat, update, remember, onClose }: {
  slotId: string; state: BuildState; cat: Catalog;
  update: (fn: (s: BuildState) => BuildState) => void; remember: (items: Item[]) => void; onClose: () => void;
}) {
  const slot = SLOT[slotId];
  const g = state.gear[slotId];
  const it = g && cat.items[g.id];
  const [q, setQ] = useState('');
  const [onlyCls, setOnlyCls] = useState(true);
  const [minLvl, setMinLvl] = useState('');
  const [maxLvl, setMaxLvl] = useState('');
  // ammo: start with the kind that fits the worn bow / crossbow / sling
  const [sub, setSub] = useState(() => slotId === 'ammo' && RANGED.includes(cat.items[state.gear.weapon?.id ?? '']?.sub ?? '') ? cat.items[state.gear.weapon!.id].sub! : '');
  const [subs, setSubs] = useState<{ sub: string; count: number }[]>([]);
  const [list, setList] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stoneQ, setStoneQ] = useState('');
  const [fillAll, setFillAll] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => { dlg.current?.showModal(); }, []);

  // server-side list for the slot (debounced search)
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const lvl = (v: string) => (/^\d+$/.test(v.trim()) ? parseInt(v, 10) : undefined);
        const r = await api.items({ slot: slot.type!, q: q.trim() || undefined, classBit: onlyCls ? CLASS_BIT[state.cls] : undefined, level: state.level, take: MAX_ROWS,
          minLvl: lvl(minLvl), maxLvl: lvl(maxLvl), sub: sub || undefined });
        remember(r.items);
        setList(r.items);
        setTotal(r.total);
      } finally { setLoading(false); }
    }, 200);
    return () => clearTimeout(t);
  }, [q, onlyCls, minLvl, maxLvl, sub, slot.type, state.cls, state.level, remember]);

  // categories of the slot (heavy / light / robe, weapon types…) for the filter
  useEffect(() => {
    api.subs(slot.type!, onlyCls ? CLASS_BIT[state.cls] : undefined).then(setSubs).catch(() => setSubs([]));
  }, [slot.type, onlyCls, state.cls]);

  const setGear = (fn: (g: Gear) => Gear) => update(s => (s.gear[slotId] ? { ...s, gear: { ...s.gear, [slotId]: fn(s.gear[slotId]) } } : s));
  const choose = (id: string) => update(s => {
    const prev = s.gear[slotId], nit = cat.items[id];
    const n = Math.min(nit.sock || 0, prev ? prev.n : 0);
    return { ...s, gear: { ...s.gear, [slotId]: { id, r: prev && nit.ref ? prev.r : 0, n, s: Array.from({ length: n }, (_, k) => prev?.s[k] ?? null), a: [], c: prev?.c ?? [] } } };
  });
  const toInventory = () => update(s => {
    const cur = s.gear[slotId];
    const gear = { ...s.gear };
    delete gear[slotId];
    return { ...s, gear, inv: cur && s.inv.length < INV_MAX ? [...s.inv, cur] : s.inv };
  });

  const C = CLASSES[state.cls];
  const sq = norm(stoneQ);
  const stoneOptions = (keep: string | null) => cat.meta.stones.filter(st => {
    const sd = it && stoneSide(st, it);
    return sd && (!sq || st.id === keep || norm(st.name + ' ' + sd.t).includes(sq));
  });

  return (
    <dialog ref={dlg} onClose={onClose} onClick={e => { if (e.target === dlg.current) dlg.current?.close(); }}
      className="m-auto mb-0 w-full max-w-[560px] rounded-t-md border border-line bg-panel p-0 text-text backdrop:bg-black/65 md:mb-auto md:rounded-md">
      <div className="flex max-h-[88vh] flex-col">
        <div className="flex items-center justify-between gap-2.5 border-b border-line px-5 pt-5 pb-2.5">
          <h2 className="font-serif text-2xl font-semibold">{slot.title || slot.name}</h2>
          <button className="btn" onClick={() => dlg.current?.close()}>Готово</button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto overscroll-contain px-4 pt-3.5 pb-5">
          {it ? <ItemCard it={it} g={g} state={state} cat={cat} />
              : <p className="rounded-lg border border-dashed border-line p-3.5 text-muted">Слот порожній. Виберіть предмет зі списку нижче.</p>}

          {it?.ref && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-line bg-panel2 px-3.5 py-2.5">
              <label htmlFor="ref" className="font-bold">Заточка</label>
              <input id="ref" type="range" min={0} max={12} value={g.r} className="h-8 min-w-0 flex-1 accent-deco"
                onChange={e => setGear(x => ({ ...x, r: parseInt(e.target.value, 10) || 0 }))} />
              <output className="min-w-10 text-right text-lg font-bold text-ok">+{g.r}</output>
            </div>
          )}

          {it && (it.sock || 0) > 0 && (
            <div className="mt-3 rounded-lg border border-line bg-panel2 px-3.5 pt-2.5 pb-3">
              <div className="flex items-center justify-between gap-2.5 font-bold">
                <label htmlFor="sockn">Осередки</label>
                <select id="sockn" className="input w-auto" value={g.n}
                  onChange={e => { const n = parseInt(e.target.value, 10) || 0; setGear(x => ({ ...x, n, s: Array.from({ length: n }, (_, k) => x.s[k] ?? null) })); }}>
                  {Array.from({ length: (it.sock || 0) + 1 }, (_, k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                <input className="input min-w-[180px] flex-1" type="search" placeholder="Пошук каменя" aria-label="Пошук каменя" value={stoneQ} onChange={e => setStoneQ(e.target.value)} />
                <label className="flex items-center gap-1.5 text-sm whitespace-nowrap"><input type="checkbox" checked={fillAll} onChange={e => setFillAll(e.target.checked)} /> У всі осередки</label>
              </div>
              <div className="mt-2 grid gap-1.5">
                {g.s.map((sid, k) => {
                  const st = sid ? cat.stones[sid] : undefined;
                  return (
                    <div key={k} className="grid grid-cols-[26px_minmax(0,1fr)] items-center gap-2">
                      {st ? <img src={'/' + st.img} alt="" className="pixel h-[26px] w-[26px] rounded-[3px]" /> : <span className="h-[26px] w-[26px] rounded-[3px] border border-dashed border-line" />}
                      <select className="input" aria-label={`Осередок ${k + 1}`} value={sid ?? ''}
                        onChange={e => { const v = cat.stones[e.target.value] ? e.target.value : null; setGear(x => ({ ...x, s: fillAll ? x.s.map(() => v) : x.s.map((y, i) => (i === k ? v : y)) })); }}>
                        <option value="">Порожньо</option>
                        {stoneOptions(sid).map(o => <option key={o.id} value={o.id}>{o.name} — {stoneSide(o, it)!.t}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {it?.add && it.add.length > 0 && (
            <div className="mt-3 rounded-lg border border-line bg-panel2 px-3.5 pt-2.5 pb-3">
              <div className="flex items-center justify-between gap-2.5 font-bold">Додаткові властивості <span className="text-sm font-normal text-muted">{it.addMax ? `у грі до ${it.addMax}` : ''}</span></div>
              <div className="mt-1.5 grid max-h-[260px] gap-0.5 overflow-auto">
                {it.add.map((a, k) => (
                  <label key={k} className="flex cursor-pointer items-baseline gap-2 px-0.5 py-1 text-sm">
                    <input type="checkbox" className="flex-none translate-y-0.5 accent-deco" checked={g.a.includes(k)}
                      onChange={e => setGear(x => {
                        if (e.target.checked) return { ...x, a: [...new Set([...x.a, k])] };
                        const v = { ...x.v };
                        delete v[k];
                        return { ...x, a: x.a.filter(i => i !== k), v };
                      })} />
                    <span>{a.t}{!a.e && <span className="text-xs text-muted"> (не рахується)</span>}{a.d && <span className="block text-xs text-muted">{a.d}</span>}</span>
                    {a.r && g.a.includes(k) && (
                      // the rolled value inside the min–max of the item's pools
                      <input type="number" step="any" min={a.r[0]} max={a.r[1]} aria-label={`Значення: ${a.t}`} title={`від ${a.r[0]} до ${a.r[1]}`}
                        className="input h-7 min-h-7 w-20 flex-none px-1.5"
                        key={g.v?.[k] ?? 'base'} defaultValue={g.v?.[k] ?? Object.values(a.e!)[0]}
                        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        onBlur={e => {
                          // applied on leave, so typing "95" is not clamped after the first digit
                          const n = parseFloat(e.target.value.replace(',', '.'));
                          const clamped = Number.isFinite(n) ? Math.min(a.r![1], Math.max(a.r![0], n)) : (g.v?.[k] ?? Object.values(a.e!)[0]);
                          e.target.value = String(clamped);
                          setGear(x => ({ ...x, v: { ...x.v, [k]: clamped } }));
                        }} />
                    )}
                    <span className="ml-auto text-xs whitespace-nowrap text-muted">{dec(a.p * 100, 2)}%</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {it && (
            <div className="mt-3 rounded-lg border border-line bg-panel2 px-3.5 pt-2.5 pb-3">
              <div className="flex items-center justify-between gap-2.5 font-bold">Свої властивості <span className="text-sm font-normal text-muted">будь-які й скільки завгодно</span></div>
              <div className="mt-2 grid gap-1.5">
                {g.c.map((c, k) => (
                  <div key={`${k}-${g.c.length}`} className="grid grid-cols-[minmax(0,1fr)_96px_34px] items-center gap-1.5">
                    <select className="input" aria-label="Характеристика" value={c.k}
                      onChange={e => setGear(x => ({ ...x, c: x.c.map((y, i) => (i === k ? { ...y, k: e.target.value } : y)) }))}>
                      {Object.entries(CUSTOM).map(([key, l]) => <option key={key} value={key}>{l}</option>)}
                    </select>
                    <input className="input" type="number" step="any" aria-label="Значення" defaultValue={c.v}
                      onChange={e => { const v = parseFloat(e.target.value.replace(',', '.')); if (Number.isFinite(v)) setGear(x => ({ ...x, c: x.c.map((y, i) => (i === k ? { ...y, v } : y)) })); }} />
                    <button type="button" aria-label="Прибрати" className="min-h-9 cursor-pointer rounded-md border border-line bg-panel text-lg text-bad"
                      onClick={() => setGear(x => ({ ...x, c: x.c.filter((_, i) => i !== k) }))}>×</button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn mt-2" onClick={() => setGear(x => ({ ...x, c: [...x.c, { k: 'patk', v: 0 }] }))}>+ Додати властивість</button>
            </div>
          )}

          {it && <div className="mt-2.5"><button className="btn" onClick={toInventory}>Зняти в інвентар</button></div>}

          <h3 className="mt-4.5 font-serif text-xl font-semibold text-gold">Предмети для цього слоту</h3>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <select className="input" aria-label="Категорія" value={sub} onChange={e => setSub(e.target.value)}>
              <option value="">Усі категорії</option>
              {subs.map(x => <option key={x.sub} value={x.sub}>{x.sub} ({x.count})</option>)}
            </select>
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <span>Рівень</span>
              <input className="input w-16" type="number" min={0} placeholder="від" aria-label="Рівень від" value={minLvl} onChange={e => setMinLvl(e.target.value)} />
              <span>–</span>
              <input className="input w-16" type="number" min={0} placeholder="до" aria-label="Рівень до" value={maxLvl} onChange={e => setMaxLvl(e.target.value)} />
            </div>
          </div>
          <input className="input mt-2" type="search" placeholder="Пошук за назвою" aria-label="Пошук предмета" value={q} onChange={e => setQ(e.target.value)} autoFocus />
          <label className="mt-2 flex items-center gap-2 text-sm text-muted"><input type="checkbox" checked={onlyCls} onChange={e => setOnlyCls(e.target.checked)} /> Лише для мого класу</label>
          <ul className={'mt-2 grid gap-1.5 ' + (loading ? 'opacity-60' : '')}>
            {list.map(i => {
              const probs = problems(i, state, cat.items);
              const reqs = probs.filter(p => p.type === 'req').map(p => p.text);
              const warn = !classOk(i, state.cls) ? `Недоступно для класу «${C.name}»` : reqs.length ? 'Не вистачає: ' + reqs.join(', ') : '';
              const on = it?.id === i.id;
              return (
                <li key={i.id}>
                  <button type="button" aria-pressed={on} onClick={() => choose(i.id)}
                    className={'flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-left ' + (on ? 'border-line-strong bg-win' : 'border-line bg-panel2 hover:border-line-strong')}>
                    <span className="grid h-[40px] w-[40px] flex-none place-items-center rounded-md border border-line bg-well"><ItemIcon it={i} className="h-[32px] w-[32px]" /></span>
                    <span className="min-w-0">
                      <span className="block leading-tight font-bold [text-shadow:0_1px_1px_rgba(0,0,0,.6)]" style={{ color: i.col || '#fff' }}>{i.name}</span>
                      <span className="block text-sm text-muted">{i.slot === 'ammo' ? i.sub : `Рівень ${i.slot === 'book' ? i.gr : i.lvl}`}, {summary(i)}</span>
                      {warn && <span className="block text-sm text-bad">{warn}</span>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {total > list.length && <p className="mt-2 text-sm text-muted">Показано {list.length} з {nf(total)}. Уточніть пошук.</p>}
          {!loading && list.length === 0 && <p className="mt-2 rounded-lg border border-dashed border-line p-3.5 text-muted">Нічого не знайдено{q.trim() ? ` за запитом «${q.trim()}»` : ''}.</p>}
        </div>
      </div>
    </dialog>
  );
}
