import type { Catalog } from '../calc';
import { ACTIVE_SLOTS, INV_MAX } from '../constants';
import type { BuildState, Item } from '../types';
import { ContextMenu, useContextMenu } from './ContextMenu';
import { setMenuItem } from './GearPanel';
import { ItemCard } from './ItemCard';
import { ItemIcon, Panel, useTip } from './common';

/** Slot an inventory item goes to: a free one of its type, else the first. */
function targetSlot(s: BuildState, it: Item) {
  const slots = ACTIVE_SLOTS.filter(sl => sl.type === it.slot);
  return slots.find(x => !s.gear[x.id]) || slots[0];
}

/** Equips inventory item k; whatever was in that slot goes to the inventory in its place. */
export function equipFromInv(s: BuildState, k: number, cat: Catalog): BuildState {
  const g = s.inv[k], it = g && cat.items[g.id];
  const sl = it && targetSlot(s, it);
  if (!sl) return s;
  const old = s.gear[sl.id];
  const inv = [...s.inv];
  if (old) inv[k] = old; else inv.splice(k, 1);
  return { ...s, gear: { ...s.gear, [sl.id]: g }, inv };
}

export function InventoryPanel({ state, cat, update, onOpen, ensureItems }: {
  state: BuildState; cat: Catalog; update: (fn: (s: BuildState) => BuildState) => void;
  onOpen: (slotId: string) => void; ensureItems: (ids: string[]) => Promise<Record<string, Item>>;
}) {
  const tip = useTip();
  const cm = useContextMenu();
  const drop = (k: number) => update(s => ({ ...s, inv: s.inv.filter((_, i) => i !== k) }));
  return (
    <Panel id="p-inv" title="Інвентар" note={`${state.inv.length} з ${INV_MAX}`}>
      <div className="grid min-h-11 grid-cols-[repeat(auto-fill,44px)] gap-1.5">
        {state.inv.length === 0 && <span className="text-sm text-muted">Порожньо</span>}
        {state.inv.map((g, k) => {
          const it = cat.items[g.id];
          if (!it) return null;
          return (
            <div key={k} role="button" tabIndex={0} aria-label={it.name + (g.r ? ' +' + g.r : '')}
              className="group relative h-11 w-11 cursor-pointer rounded border border-line bg-well p-[3px]"
              onClick={() => { tip.hide(); update(s => equipFromInv(s, k, cat)); }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); update(s => equipFromInv(s, k, cat)); } }}
              onContextMenu={e => {
                tip.hide();
                cm.open(e, [
                  { label: 'Вдягнути', onClick: () => update(s => equipFromInv(s, k, cat)) },
                  { label: 'Вдягнути й змінити стати…', onClick: () => {
                    const sl = targetSlot(state, it);
                    update(s => equipFromInv(s, k, cat));
                    if (sl) onOpen(sl.id);
                  } },
                  ...setMenuItem(it, cat, ensureItems, update),
                  { label: 'Викинути', onClick: () => drop(k), danger: true },
                ]);
              }}
              onPointerEnter={e => tip.show(e.currentTarget, <ItemCard it={it} g={g} state={state} cat={cat} />)}
              onPointerLeave={tip.hide}>
              <ItemIcon it={it} className="h-full w-full" />
              {g.r > 0 && <span className="absolute -right-1.5 -bottom-1.5 rounded border border-ok bg-panel px-1 text-[0.68rem] leading-tight font-bold text-ok">+{g.r}</span>}
              <button type="button" aria-label="Викинути"
                className="absolute -top-2 -right-2 hidden h-[18px] w-[18px] cursor-pointer rounded-full border border-bad bg-panel p-0 text-xs leading-4 text-bad group-hover:block group-focus-within:block [@media(hover:none)]:block"
                onClick={e => { e.stopPropagation(); tip.hide(); drop(k); }}>×</button>
            </div>
          );
        })}
      </div>
      <p className="mt-3.5 text-sm text-muted">Зняті предмети потрапляють сюди разом із заточкою й каменями. Клік — вдягнути (поточний предмет піде в інвентар), права кнопка — меню, × — викинути. Біля характеристик видно, як вони змінились: «було → стало».</p>
      <ContextMenu menu={cm.menu} onClose={cm.close} />
    </Panel>
  );
}
