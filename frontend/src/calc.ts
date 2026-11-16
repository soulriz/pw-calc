// Character formulas (from mypers.world) and item rules, as pure functions of the build and the catalog.
import { ACTIVE_SLOTS, CLASSES, CLASS_BIT, CUSTOM, FIST, RANGED, REF, REQ_SHORT, STAT_KEYS } from './constants';
import { dec } from './format';
import type { BuffLevel, BuffSkill, BuildState, Gear, Item, Meta, Stone, StoneSide } from './types';

export interface Catalog {
  items: Record<string, Item>;
  stones: Record<string, Stone>;
  meta: Meta;
}

export const classOk = (it: Item, cls: string) => !it.cm || ((it.cm >> CLASS_BIT[cls]) & 1) === 1;
export const refineAdd = (it: Item, r: number) => (it.ref && r > 0 ? Math.round(it.ref.v * REF[r]) : 0);
export const stoneSide = (st: Stone | undefined, it: Item): StoneSide | null | undefined => st && (it.slot === 'weapon' ? st.w : st.a);
export const freePoints = (s: BuildState) => (s.level - 1) * 5 - STAT_KEYS.reduce((sum, k) => sum + s.stats[k] - 5, 0);
export const custText = (c: { k: string; v: number }) =>
  `${CUSTOM[c.k]} ${c.v >= 0 ? '+' : ''}${dec(c.v, Number.isInteger(c.v) ? 0 : 2)}${/^pct_|^crit/.test(c.k) && !CUSTOM[c.k].endsWith('%') ? '%' : ''}`;

export interface Problem { type: 'class' | 'req'; text?: string }
export function problems(it: Item, s: BuildState): Problem[] {
  const p: Problem[] = [];
  if (!classOk(it, s.cls)) p.push({ type: 'class' });
  if (it.lvl > s.level) p.push({ type: 'req', text: 'рівень ' + it.lvl });
  for (const k of STAT_KEYS) {
    const need = it.req?.[k];
    if (need && s.stats[k] < need) p.push({ type: 'req', text: REQ_SHORT[k] + ' ' + need });
  }
  return p;
}

/** Buff value at a level, or at the sage/demon variant ('rs'/'je'): base + step * (level - 1) + level extra. */
export function buffValue(sk: BuffSkill, k: string, lv: BuffLevel): number {
  const v11 = typeof lv === 'string';
  const L = v11 ? sk.var!.lv : lv;
  let x = +sk.lm[k] || 0;
  const q = sk.qc?.[k];
  if (q) {
    const step = Array.isArray(q) ? q[0] : (q['0'] as number);
    x += (+step || 0) * (L - 1);
    const extra = Array.isArray(q) ? null : q[L];
    if (extra != null) x += typeof extra === 'object' ? (v11 ? +(extra as Record<string, number>)[lv] || 0 : 0) : +extra || 0;
  }
  return Math.round(x * 10) / 10;
}
export const buffOk = (sk: BuffSkill | undefined, lv: unknown): lv is BuffLevel => {
  if (!sk) return false;
  if (typeof lv === 'string') return !!sk.var && sk.var.types.includes(lv as 'rs' | 'je');
  return Number.isInteger(lv) && (lv as number) >= 1 && (lv as number) <= sk.ue;
};
export const shownBuffs = (meta: Meta, cls: string) => [...(meta.buffs.classes[cls] || []), ...meta.buffs.debuffs].map(String);

export interface Output {
  hp: number; mp: number; pmin: number; pmax: number; mmin: number; mmax: number; aspd: number;
  crit: number; critDmg: number; acc: number; eva: number; atkLvl: number; defLvl: number; pdef: number; mdef: number;
  eMetal: number; eWood: number; eWater: number; eFire: number; eEarth: number; speed: number; cast: number;
  physRed: number; magRed: number; spirit: number; soul: number; stealth: number; detect: number;
  dmgMon: number; defMon: number; pPen: number; mPen: number;
}
export interface Result { out: Output; status: Record<string, Problem[]>; equipped: number; G: Record<string, number> }

export function compute(s: BuildState, cat: Catalog): Result {
  const C = CLASSES[s.cls];
  const L = s.level;
  const G: Record<string, number> = {};
  const g0 = (k: string) => G[k] || 0;
  const addG = (k: string, v: number) => { G[k] = g0(k) + v; };
  const status: Record<string, Problem[]> = {};
  let weapon: Item | null = null, wRefP = 0, wRefM = 0, equipped = 0;
  const setCount: Record<string, number> = {};

  for (const sl of ACTIVE_SLOTS) {
    const g = s.gear[sl.id];
    const it = g && cat.items[g.id];
    if (!it) continue;
    equipped++;
    const probs = problems(it, s);
    status[sl.id] = probs;
    if (probs.length) continue; // an item works only when its requirements are met
    for (const [k, v] of Object.entries(it.stats || {})) addG(k, v);
    for (const id of g.s) { const sd = stoneSide(cat.stones[id ?? ''], it); if (sd?.e) for (const [k, v] of Object.entries(sd.e)) addG(k, v); }
    for (const k of g.a) { const e = it.add?.[k]?.e; if (e) for (const [kk, v] of Object.entries(e)) addG(kk, g.v?.[k] ?? v); }
    for (const f of it.fix || []) if (f.e) for (const [k, v] of Object.entries(f.e)) addG(k, v);
    for (const c of g.c) addG(c.k, c.v);
    if (it.set) setCount[it.set] = (setCount[it.set] || 0) + 1;
    const add = refineAdd(it, g.r);
    if (it.slot === 'weapon') {
      weapon = it;
      if (add) { if (it.ref!.stat === 'patk') wRefP = add; else wRefM = add; }
    } else if (add) {
      for (const k of it.ref!.stat.split('+')) addG(k, add);
    }
  }

  for (const [id, n] of Object.entries(setCount))
    for (const b of cat.meta.sets[id]?.b || []) if (n >= b.k && b.e) for (const [k, v] of Object.entries(b.e)) addG(k, v);

  const wmaj = weapon?.maj;
  const shown = new Set(shownBuffs(cat.meta, s.cls));
  for (const [id, lv] of Object.entries(s.buffs)) {
    const sk = cat.meta.buffs.skills[id];
    if (!sk || !shown.has(id)) continue; // buffs of another class stay saved but do not count
    for (const [k, [stat, sign]] of Object.entries(sk.eff)) {
      const v = buffValue(sk, k, lv) * sign;
      const [st, grp] = stat.split('@');
      if (v && (!grp || grp === wmaj)) addG(st, v);
    }
  }

  const B = s.stats;
  const T = { vit: B.vit + g0('vit'), str: B.str + g0('str'), int: B.int + g0('int'), dex: B.dex + g0('dex') };
  const w = weapon || FIST;
  const P = (k: string) => g0('pct_' + k) / 100;
  const pct = (v: number, k: string) => Math.floor(v * (1 + P(k)));

  // physical attack: weapon + flat bonuses scaled by the main stat (strength, dexterity for ranged weapons)
  const ps = T[RANGED.includes(w.sub || '') ? 'dex' : 'str'];
  const pk = 1 + ps / 100 + P('patk');
  const pl = Math.round(L * C.pL);
  const pcut = Math.round(ps / 3);
  const phys = (x: number) => Math.max(1, Math.round(x * pk + pl * pk - ((x + pl) / 100) * pcut));
  const pmin = phys((w.pmin || 0) + wRefP + g0('patk'));
  const pmax = phys((w.pmax || 0) + wRefP + g0('patk') + g0('patkMax'));
  // magic attack: scaled by intellect
  const mk = 1 + T.int / 100 + P('matk');
  const mExtra = C.magic ? Math.round(T.int / 1720) : 0;
  const mag = (x: number) => Math.max(1, Math.round(mk * x) + Math.round(Math.round(L * C.mL) * mk + mExtra));
  const mmin = mag((w.mmin || 0) + wRefM + g0('matk'));
  const mmax = mag((w.mmax || 0) + wRefM + g0('matk') + g0('matkMax'));

  // defence: (a + b - 2) / 4 + gear * (1 + round((2a + 3b) / 25) / 100); physical uses vit+str, elements vit+int
  const def = (gear: number, a: number, b: number, base: number) =>
    Math.round((a + b - 2) / 4) + Math.round(gear * (1 + Math.round((2 * a + 3 * b) / 25) / 100)) + base;
  const pdef = def(g0('pdef'), T.vit, T.str, 1) + Math.round(g0('pdef') * P('pdef'));
  const EL = ['eMetal', 'eWood', 'eWater', 'eFire', 'eEarth'] as const;
  const el = {} as Record<(typeof EL)[number], number>;
  for (const k of EL) {
    const gear = g0('mdef') + g0(k);
    el[k] = def(gear, T.vit, T.int, 0) + Math.round(gear * (P('mdef') + P(k)));
  }
  const mdef = Math.round(EL.reduce((a, k) => a + el[k], 0) / 5);

  // attack speed: weapon interval minus reductions (not below 0.2 s), then percent, rounded to 0.05 s
  const iv0 = Math.round((1 / (w.speed || 1.25)) * 100) / 100;
  const ivr = g0('aspdIv');
  const iv = (ivr >= iv0 ? 0.2 : iv0 - ivr) * (1 - P('aspd'));
  const aspd = Math.min(5, 1 / (0.05 * Math.max(1, Math.round(iv / 0.05))));

  const r2 = (v: number) => Math.round(v * 100) / 100;
  const out: Output = {
    hp: pct(C.hpV * T.vit + C.hpL * (L - 1) + g0('hp'), 'hp'),
    mp: pct(C.mpI * T.int + C.mpL * (L - 1) + g0('mp'), 'mp'),
    pmin, pmax, mmin, mmax, aspd,
    crit: Math.min(100, r2(1 + Math.floor(T.dex / 20) + g0('crit'))),
    critDmg: 200 + g0('critDmg'),
    acc: Math.round((C.acc * T.dex + g0('acc')) * (1 + P('acc'))),
    eva: Math.round((C.eva * T.dex + g0('eva')) * (1 + P('eva'))),
    atkLvl: g0('atkLvl'), defLvl: g0('defLvl'), pdef, mdef, ...el,
    speed: Math.min(15, Math.round(((C.run + g0('speedB')) * (1 + P('speed')) + g0('speed')) * 10) / 10),
    cast: Math.min(100, r2(g0('cast'))), physRed: Math.min(100, r2(g0('physRed'))), magRed: Math.min(100, r2(g0('magRed'))),
    spirit: g0('spirit'), soul: (50 + L) * L + g0('soul'), stealth: g0('stealth'), detect: L + g0('detect'),
    dmgMon: g0('dmgMon'), defMon: g0('defMon'), pPen: g0('pPen'), mPen: g0('mPen'),
  };
  return { out, status, equipped, G };
}

/** Normalised gear entry; drops stones/properties the item cannot have. */
export function cleanGear(g: Partial<Gear> & { id: string }, it: Item | undefined, stones: Record<string, Stone>): Gear {
  const r = Math.min(12, Math.max(0, parseInt(String(g.r), 10) || 0));
  const n = Math.min(it?.sock || 0, Math.max(0, parseInt(String(g.n), 10) || 0));
  const s = Array.from({ length: n }, (_, k) => (Array.isArray(g.s) && g.s[k] && stones[g.s[k]!] ? g.s[k]! : null));
  const a = Array.isArray(g.a) ? [...new Set(g.a.map(Number))].filter(k => it?.add && k >= 0 && k < it.add.length) : [];
  const c = (Array.isArray(g.c) ? g.c : []).filter(x => x && CUSTOM[x.k] && Number.isFinite(+x.v)).slice(0, 40).map(x => ({ k: x.k, v: +x.v }));
  const m = typeof g.m === 'string' ? g.m.trim().slice(0, 32) : '';  // crafter's nick (from Clan Dossier)
  // rolled values: only for chosen properties that have a range, kept inside it
  const v: Record<number, number> = {};
  for (const [k, x] of Object.entries(g.v || {})) {
    const rg = it?.add?.[+k]?.r;
    if (rg && a.includes(+k) && Number.isFinite(+x)) v[+k] = Math.min(rg[1], Math.max(rg[0], +x));
  }
  return { id: g.id, r: it?.ref ? r : 0, n, s, a, c, ...(m ? { m } : {}), ...(Object.keys(v).length ? { v } : {}) };
}
