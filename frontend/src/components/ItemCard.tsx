import type { ReactNode } from 'react';
import { classOk, custText, problems, refineAdd, stoneSide, type Catalog } from '../calc';
import { ACTIVE_SLOTS, CLASSES, CLASS_NAMES, REQ_GAME, TYPE_NAME } from '../constants';
import { dec, nf } from '../format';
import type { BuildState, Gear, Item } from '../types';

/** Item tooltip in the style of the game client. */
export function ItemCard({ it, g, state, cat }: { it: Item; g?: Gear; state: BuildState; cat: Catalog }) {
  const r = g?.r || 0, n = g?.n || 0;
  const L: ReactNode[] = [];
  const line = (t: ReactNode, cls = '') => L.push(<div key={L.length} className={cls}>{t}</div>);
  const refAdd = refineAdd(it, r);
  const refS = it.ref ? it.ref.stat.split('+') : [];
  const plus = (k: string) => (refS.includes(k) ? refAdd : 0);

  L.push(<div key="t" className="font-bold" style={{ color: it.col || '#fff' }}>{it.name}{it.sock ? ` (осередків: ${n})` : ''}{r ? ' +' + r : ''}</div>);
  line(it.sub || TYPE_NAME[it.slot]);
  if (it.gr) line(`Рівень ${it.gr}`);
  if (it.slot === 'weapon') {
    line(`Швидкість атаки (раз на секунду) ${dec(it.speed || 0, 2)}`);
    if (it.rng) line(`Дальність ${dec(it.rng, 2)}`);
    if (it.pmax) line(`Фізична атака ${nf((it.pmin || 0) + plus('patk'))}-${nf(it.pmax + plus('patk'))}`);
    if (it.mmax) line(`Магічна атака ${nf((it.mmin || 0) + plus('matk'))}-${nf(it.mmax + plus('matk'))}`);
  } else {
    const S = it.stats || {};
    const v = (k: string) => (S[k] || 0) + plus(k);
    const rows: [string, string][] = [['patk', 'Фізична атака'], ['matk', 'Магічна атака'], ['pdef', 'Фізичний захист'], ['hp', "Здоров'я"], ['mp', 'Мана'], ['eva', 'Ухилення']];
    for (const [k, l] of rows) if (v(k)) line(`${l} +${nf(v(k))}`);
    for (const [k, nm] of [['eMetal', 'металу'], ['eWood', 'дерева'], ['eWater', 'води'], ['eFire', 'вогню'], ['eEarth', 'землі']]) {
      const x = v('mdef') + v(k);
      if (x) line(`Захист від ${nm} +${nf(x)}`);
    }
  }
  if (it.dur) line(`Міцність ${nf(it.dur)}/${nf(it.dur)}`);
  if (it.cm && it.cm !== 4095)
    line('Обмеження за класом: ' + [0, 1, 3, 4, 6, 7].filter(i => (it.cm >> i) & 1).map(i => CLASS_NAMES[i]).join('  '), classOk(it, state.cls) ? '' : 'text-bad');
  line(`Необхідний рівень: ${it.lvl}`, state.level >= it.lvl ? '' : 'text-bad');
  for (const k of ['str', 'dex', 'int', 'vit'] as const) {
    const need = it.req?.[k];
    if (need) line(`${REQ_GAME[k]}: ${nf(need)}`, state.stats[k] >= need ? '' : 'text-bad');
  }
  for (const k of g?.a || []) {
    const a = it.add?.[k];
    if (!a) continue;
    const ov = g?.v?.[k];
    line(ov != null && a.e ? custText({ k: Object.keys(a.e)[0], v: ov }) : a.t, 'text-pw-blue');
    if (a.d) line(a.d, 'pl-2.5 text-xs text-[#c8bfa8]');
  }
  for (const f of it.fix || []) line(f.t, 'text-pw-blue');
  for (const c of g?.c || []) if (c.v) line(custText(c), 'text-pw-blue');
  for (const id of g?.s || []) {
    const st = id ? cat.stones[id] : undefined, sd = stoneSide(st, it);
    if (st && sd) line(`${st.name} ${sd.t}`, 'text-pw-stone');
  }
  const set = it.set ? cat.meta.sets[it.set] : undefined;
  if (set) {
    const worn = new Set(ACTIVE_SLOTS.map(sl => state.gear[sl.id]?.id).filter(Boolean));
    const cnt = set.items.filter(id => worn.has(id)).length;
    line(`${set.name} (${cnt}/${set.n})`, 'mt-1 text-pw-gold');
    for (const id of set.items) { const m = cat.items[id]; line(m ? m.name : id, worn.has(id) ? 'text-ok' : 'text-[#8a8a8a]'); }
    for (const b of set.b) line(`(${b.k}) ${b.t}`, cnt >= b.k ? 'text-ok' : 'text-[#8a8a8a]');
  }
  if (it.price) line(`Ціна: ${nf(it.price)}`);
  if (g?.m) line(`Творець: ${g.m}`, 'text-ok');
  if (!classOk(it, state.cls)) line(`Недоступно для класу «${CLASSES[state.cls].name}»`, 'text-bad');
  if (problems(it, state).length) line('Предмет не діє, доки не виконано вимоги.', 'text-bad');
  return <div className="card-game">{L}</div>;
}
