// Data shapes produced by calc_data/tools (build_calc.py, build_buffs.py) and served by the API.

export type Effect = Record<string, number>;

/** r: min–max of this stat over the item's pools, when the rolled value can differ */
export interface AddonOpt { t: string; p: number; e?: Effect; d?: string; r?: [number, number] }
export interface FixedProp { t: string; e?: Effect }

export interface Item {
  id: string;
  slot: string;
  img: string;
  name: string;
  sub?: string;
  lvl: number;
  q: number;
  cm: number;
  gr?: number;
  dur?: number;
  price?: number;
  col?: string;
  req?: Partial<Record<StatKey, number>>;
  sock?: number;
  // weapons
  maj?: string;
  speed?: number;
  rng?: number;
  pmin?: number;
  pmax?: number;
  mmin?: number;
  mmax?: number;
  // other gear
  stats?: Effect;
  ref?: { stat: string; v: number };
  add?: AddonOpt[];
  addMax?: number;
  fix?: FixedProp[];
  set?: number;
}

export interface StoneSide { t: string; e?: Effect }
export interface Stone { id: string; name: string; img: string; lvl: number; w?: StoneSide | null; a?: StoneSide | null }

export interface SetBonus { k: number; t: string; e?: Effect }
export interface ItemSet { name: string; n: number; items: string[]; b: SetBonus[] }

export interface BuffSkill {
  name: string;
  desc: string;
  icon: string;
  ue: number;
  lm: Record<string, number>;
  qc?: Record<string, number[] | Record<string, number | Record<string, number>>>;
  var?: { lv: number; types: ('rs' | 'je')[] };
  name_rs?: string;
  name_je?: string;
  desc_rs?: string;
  desc_je?: string;
  eff: Record<string, [string, number]>;
  fx: Record<string, string>;
  /** class of a debuff's caster (debuff picker filter) */
  cls?: string;
}

export interface Meta {
  stones: Stone[];
  sets: Record<string, ItemSet>;
  buffs: { skills: Record<string, BuffSkill>; classes: Record<string, number[]>; debuffs: number[] };
}

export type StatKey = 'vit' | 'str' | 'int' | 'dex';
export type BuffLevel = number | 'rs' | 'je';

/** An item as worn or kept: refine, sockets with stones, chosen and custom properties. */
/** v: rolled value of a chosen property (index in item.add), set by the user inside its range */
export interface Gear { id: string; r: number; n: number; s: (string | null)[]; a: number[]; c: { k: string; v: number }[]; m?: string; v?: Record<number, number> }

export interface BuildState {
  name: string;
  sex: 'm' | 'f';
  cls: string;
  level: number;
  stats: Record<StatKey, number>;
  saved: Record<StatKey, number>;
  gear: Record<string, Gear>;
  inv: Gear[];
  buffs: Record<string, BuffLevel>;
  bfl: Record<string, BuffLevel>;
}
