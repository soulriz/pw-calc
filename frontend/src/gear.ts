// Moving items between the doll and the inventory (pure: build -> new build).
import { ACTIVE_SLOTS, INV_MAX } from './constants';
import type { BuildState, Gear, Item } from './types';

const fresh = (id: string): Gear => ({ id, r: 0, n: 0, s: [], a: [], c: [] });

/** Takes off one item into the inventory (stays on when the inventory is full). */
export function unequip(s: BuildState, slotId: string): BuildState {
  const g = s.gear[slotId];
  if (!g || s.inv.length >= INV_MAX) return s;
  const gear = { ...s.gear };
  delete gear[slotId];
  return { ...s, gear, inv: [...s.inv, g] };
}

/** Takes off everything that fits into the inventory. */
export function unequipAll(s: BuildState): BuildState {
  let r = s;
  for (const sl of ACTIVE_SLOTS) r = unequip(r, sl.id);
  return r;
}

/** Puts on the given items (a set): each goes to its slot, rings to both ring slots; replaced items go to the inventory. */
export function equipItems(s: BuildState, items: Item[]): BuildState {
  const gear = { ...s.gear };
  const inv = [...s.inv];
  const used = new Set<string>();
  for (const it of items) {
    const sl = ACTIVE_SLOTS.find(x => x.type === it.slot && !used.has(x.id));
    if (!sl) continue;
    used.add(sl.id);
    if (gear[sl.id]?.id === it.id) continue;
    if (gear[sl.id] && inv.length < INV_MAX) inv.push(gear[sl.id]);
    gear[sl.id] = fresh(it.id);
  }
  return { ...s, gear, inv };
}

// self-check of the slot rules (runs once at import, costs nothing)
{
  const b = { gear: {}, inv: [] } as unknown as BuildState;
  const r = equipItems(b, [{ id: 'a', slot: 'ring' }, { id: 'b', slot: 'ring' }, { id: 'c', slot: 'weapon' }] as Item[]);
  console.assert(r.gear.ring1?.id === 'a' && r.gear.ring2?.id === 'b' && r.gear.weapon?.id === 'c', 'equipItems slots');
  console.assert(unequipAll(r).inv.length === 3 && !Object.keys(unequipAll(r).gear).length, 'unequipAll');
}
