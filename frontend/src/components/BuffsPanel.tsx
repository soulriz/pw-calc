import { useEffect, useRef, useState } from 'react';
import { buffOk, buffValue } from '../calc';
import { BUFF_TYPES, CLASSES, classIcon } from '../constants';
import type { BuffLevel, BuffSkill, BuildState, Meta } from '../types';
import { Panel, useTip } from './common';

const buffLv = (s: BuildState, id: string, sk: BuffSkill): BuffLevel => s.buffs[id] ?? s.bfl[id] ?? sk.ue;

function BuffCard({ sk, lv }: { sk: BuffSkill; lv: BuffLevel }) {
  const v11 = typeof lv === 'string';
  const fill = (t: string) => t.replace(/\{(\w+)\}/g, (_, k) => (sk.lm[k] != null ? String(buffValue(sk, k, lv)) : ''));
  const desc = (v11 && sk[`desc_${lv}`]) || sk.desc; // the variant text from the client is complete
  return (
    <div className="card-game">
      <div className="font-bold text-pw-gold">{(v11 && sk[`name_${lv}`]) || sk.name}</div>
      <div>Рівень {v11 ? `${sk.var!.lv} (${BUFF_TYPES[lv].toLowerCase()})` : lv}</div>
      {desc && <div className="text-[#e8dcc0]">{fill(desc)}</div>}
      {Object.entries(sk.fx).filter(([k]) => buffValue(sk, k, lv)).map(([k, t]) => (
        <div key={k} className={sk.eff[k] ? 'text-pw-blue' : 'text-[#8a8a8a]'}>{fill(t)}{sk.eff[k] ? '' : ' (не рахується)'}</div>
      ))}
    </div>
  );
}

function BuffGrid({ ids, state, meta, update }: { ids: string[]; state: BuildState; meta: Meta; update: (fn: (s: BuildState) => BuildState) => void }) {
  const tip = useTip();
  return (
    <div className="flex flex-wrap gap-x-1.5 gap-y-2">
      {ids.map(id => {
        const sk = meta.buffs.skills[id];
        if (!sk) return null;
        const on = state.buffs[id] != null;
        const lv = buffLv(state, id, sk);
        return (
          <div key={id} className="flex w-[46px] flex-col items-center gap-[3px]">
            <button type="button" aria-pressed={on} aria-label={sk.name}
              className={'h-[38px] w-[38px] cursor-pointer rounded border bg-well p-0.5 ' + (on ? 'border-pw-gold shadow-[0_0_0_1px_#ffdc50]' : 'border-line')}
              onClick={() => update(s => {
                const buffs = { ...s.buffs };
                if (on) delete buffs[id]; else buffs[id] = lv;
                return { ...s, buffs };
              })}
              onPointerEnter={e => tip.show(e.currentTarget, <BuffCard sk={sk} lv={lv} />)}
              onPointerLeave={tip.hide}>
              <img src={import.meta.env.BASE_URL + sk.icon} alt="" className={'block h-[32px] w-[32px] ' + (on ? '' : 'brightness-75 grayscale-[.85]')} />
            </button>
            <select aria-label={'Рівень: ' + sk.name} value={String(lv)}
              className="min-h-6 w-[46px] rounded border border-line bg-panel2 px-0.5 text-xs text-text"
              onChange={e => {
                const v = /^\d+$/.test(e.target.value) ? parseInt(e.target.value, 10) : (e.target.value as BuffLevel);
                if (!buffOk(sk, v)) return;
                update(s => ({ ...s, bfl: { ...s.bfl, [id]: v }, buffs: s.buffs[id] != null ? { ...s.buffs, [id]: v } : s.buffs }));
              }}>
              {Array.from({ length: sk.ue }, (_, k) => <option key={k} value={k + 1}>{k + 1}</option>)}
              {sk.var?.types.map(t => <option key={t} value={t}>{sk.var!.lv} {BUFF_TYPES[t]}</option>)}
            </select>
          </div>
        );
      })}
    </div>
  );
}

export function BuffsPanel({ state, meta, update }: { state: BuildState; meta: Meta; update: (fn: (s: BuildState) => BuildState) => void }) {
  const buffs = (meta.buffs.classes[state.cls] || []).map(String);
  const debuffs = meta.buffs.debuffs.map(String);
  const allOn = (ids: string[]) => ids.length > 0 && ids.every(id => state.buffs[id] != null);
  const toggleAll = (ids: string[], on: boolean) => update(s => {
    const b = { ...s.buffs };
    for (const id of ids) { const sk = meta.buffs.skills[id]; if (!sk) continue; if (on) b[id] = buffLv(s, id, sk); else delete b[id]; }
    return { ...s, buffs: b };
  });
  const head = (ids: string[], label: string) => (
    <label className="mt-1 mb-2 flex items-center gap-2 font-bold text-gold">
      <input type="checkbox" checked={allOn(ids)} onChange={e => toggleAll(ids, e.target.checked)} /> {label}
    </label>
  );
  const activeDebuffs = debuffs.filter(id => state.buffs[id] != null);
  return (
    <Panel id="p-buffs" title="Бафи">
      {head(buffs, 'Бафи')}
      <BuffGrid ids={buffs} state={state} meta={meta} update={update} />
      <div className="mt-4 mb-2 font-bold text-gold">Дебафи</div>
      <div className="flex flex-wrap items-start gap-x-1.5 gap-y-2">
        <BuffGrid ids={activeDebuffs} state={state} meta={meta} update={update} />
        <DebuffPicker ids={debuffs} state={state} meta={meta} update={update} />
      </div>
      <p className="mt-3.5 text-sm text-muted">Клік по іконці вмикає / вимикає баф, під іконкою — рівень. Дебаф додається кнопкою «+» (усіх класів, як на mypers.world). Назви й описи — з клієнта гри, формули — з mypers.world.</p>
    </Panel>
  );
}

/** "+" slot: list of every class's debuffs with search and class checkboxes; a click puts the debuff on. */
function DebuffPicker({ ids, state, meta, update }: { ids: string[]; state: BuildState; meta: Meta; update: (fn: (s: BuildState) => BuildState) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  // only the calculator's classes; debuffs of the others are not offered
  const own = new Set(Object.values(CLASSES).map(c => c.name));
  const classes = [...new Set(ids.map(id => meta.buffs.skills[id]?.cls))].filter((c): c is string => !!c && own.has(c));
  const [on, setOn] = useState<Set<string>>(() => new Set(classes));
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', away);
    return () => window.removeEventListener('mousedown', away);
  }, [open]);
  const n = q.trim().toLowerCase();
  const list = ids.filter(id => {
    const sk = meta.buffs.skills[id];
    return sk && state.buffs[id] == null && on.has(sk.cls ?? '') && (!n || sk.name.toLowerCase().includes(n));
  });
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-label="Додати дебаф" aria-expanded={open} onClick={() => setOpen(o => !o)}
        className="grid h-[38px] w-[38px] cursor-pointer place-items-center rounded border border-dashed border-line bg-well text-xl text-gold hover:border-line-strong">+</button>
      {open && (
        <div className="absolute top-11 left-0 z-40 w-[300px] rounded-md border border-line-strong bg-panel p-2.5 shadow-2xl">
          <input className="input" type="search" placeholder="Назва дебафу" aria-label="Пошук дебафу" value={q} onChange={e => setQ(e.target.value)} autoFocus />
          <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-sm">
            {classes.map(c => (
              <label key={c} className="flex items-center gap-1.5">
                <input type="checkbox" checked={on.has(c)} onChange={e => setOn(s => { const x = new Set(s); if (e.target.checked) x.add(c); else x.delete(c); return x; })} />
                {classIcon(c) && <img src={classIcon(c)} alt="" className="h-[18px] w-[18px]" />} {c}
              </label>
            ))}
          </div>
          <div className="mt-2 grid max-h-64 gap-1 overflow-auto">
            {list.length === 0 && <span className="text-sm text-muted">Нічого не знайдено</span>}
            {list.map(id => {
              const sk = meta.buffs.skills[id];
              return (
                <button key={id} type="button" className="flex cursor-pointer items-center gap-2 rounded border border-line bg-panel2 p-1 text-left hover:border-line-strong"
                  onClick={() => { update(s => ({ ...s, buffs: { ...s.buffs, [id]: buffLv(s, id, sk) } })); setOpen(false); }}>
                  <img src={import.meta.env.BASE_URL + sk.icon} alt="" className="h-[32px] w-[32px] flex-none" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{sk.name}</span>
                    <span className="block text-xs text-muted">{sk.cls}{Object.keys(sk.eff).length ? '' : ' · у статах не рахується'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
