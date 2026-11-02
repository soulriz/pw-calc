import type { Catalog, Result } from '../calc';
import { ACTIVE_SLOTS, CLASSES, SLOTS } from '../constants';
import type { BuildState } from '../types';
import { ItemCard } from './ItemCard';
import { ItemIcon, Panel, useTip } from './common';

/** The game inventory window: 24 cells around the character figure (images from the client). */
export function GearPanel({ state, R, cat, update, onOpen }: {
  state: BuildState; R: Result; cat: Catalog;
  update: (fn: (s: BuildState) => BuildState) => void; onOpen: (slotId: string) => void;
}) {
  const tip = useTip();
  return (
    <Panel id="p-gear" title="Екіпіровка" note={`${R.equipped} з ${ACTIVE_SLOTS.length}`}>
      <div className="relative mx-auto aspect-[324/222] w-full max-w-[486px] rounded-md bg-[url(/ui/bg.png)] bg-[length:100%_100%]">
        <div className="pointer-events-none absolute top-[22.52%] left-[38.58%] h-[67.57%] w-[24.38%] bg-contain bg-center bg-no-repeat"
             style={{ backgroundImage: `url(/ui/figure_${state.sex}.png)` }} />
        {SLOTS.map(s => {
          const g = state.gear[s.id];
          const it = g && cat.items[g.id];
          const bad = !!it && (R.status[s.id] || []).length > 0;
          return (
            <button key={s.id} type="button" disabled={s.off}
              className={'absolute h-[17.12%] w-[11.73%] rounded-[3px] bg-[length:100%_100%] bg-center enabled:cursor-pointer enabled:hover:brightness-125 disabled:opacity-70 ' +
                (bad ? 'after:absolute after:inset-px after:rounded-[3px] after:border-2 after:border-bad' : '')}
              style={{ left: ((s.x - 5) / 324 * 100).toFixed(2) + '%', top: ((s.y - 30) / 222 * 100).toFixed(2) + '%', backgroundImage: `url(/ui/slot_${s.img || s.id}.png)` }}
              title={s.off ? `${s.name}: поки без даних` : it ? undefined : s.title || s.name}
              aria-label={`${s.title || s.name}: ${it ? it.name + (g.r ? ' +' + g.r : '') + (bad ? ', не діє' : '') : 'порожньо'}`}
              onClick={() => onOpen(s.id)}
              onPointerEnter={e => { if (it) tip.show(e.currentTarget, <ItemCard it={it} g={g} state={state} cat={cat} />); }}
              onPointerLeave={tip.hide}>
              {it && <ItemIcon it={it} className="absolute top-[7.9%] left-[7.9%] h-[84.2%] w-[84.2%] rounded-sm" />}
              {it && g.r > 0 && <span className="absolute -right-1.5 -bottom-1.5 z-10 rounded border border-ok bg-panel px-1 text-[0.7rem] leading-tight font-bold text-ok">+{g.r}</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-serif text-xl font-bold">{state.name.trim() || 'Без імені'}</div>
          <div className="text-sm text-muted">{CLASSES[state.cls].name}, {state.level} рівень</div>
        </div>
        <div className="flex flex-none overflow-hidden rounded-lg border border-line" role="group" aria-label="Стать персонажа">
          {(['m', 'f'] as const).map(x => (
            <button key={x} type="button" aria-pressed={state.sex === x}
              className={'min-h-9 cursor-pointer px-3 text-sm ' + (state.sex === x ? 'bg-win text-text' : 'bg-panel2 text-muted') + (x === 'f' ? ' border-l border-line' : '')}
              onClick={() => update(s => ({ ...s, sex: x }))}>{x === 'm' ? 'Чоловік' : 'Жінка'}</button>
          ))}
        </div>
      </div>
      <p className="mt-3.5 text-sm text-muted">Натисніть на слот, щоб вибрати предмет і заточку. Затемнені слоти поки без даних.</p>
    </Panel>
  );
}
