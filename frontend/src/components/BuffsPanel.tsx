import { buffOk, buffValue } from '../calc';
import { BUFF_TYPES } from '../constants';
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
              <img src={'/' + sk.icon} alt="" className={'block h-8 w-8 ' + (on ? '' : 'brightness-75 grayscale-[.85]')} />
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
  return (
    <Panel id="p-buffs" title="Бафи">
      {head(buffs, 'Бафи')}
      <BuffGrid ids={buffs} state={state} meta={meta} update={update} />
      <div className="mt-4">{head(debuffs, 'Дебафи')}</div>
      <BuffGrid ids={debuffs} state={state} meta={meta} update={update} />
      <p className="mt-3.5 text-sm text-muted">Клік по іконці вмикає баф, під іконкою — рівень. Назви й описи — з клієнта гри, формули — з mypers.world.</p>
    </Panel>
  );
}
