import { useEffect, useMemo, useState } from 'react';
import { compute } from './calc';
import { CLASSES } from './constants';
import { fmtOut, CharacterPanel } from './components/CharacterPanel';
import { BuffsPanel } from './components/BuffsPanel';
import { BuildsMenu } from './components/BuildsMenu';
import { GearPanel } from './components/GearPanel';
import { InventoryPanel } from './components/InventoryPanel';
import { ItemSheet } from './components/ItemSheet';
import { StatValue, TipProvider } from './components/common';
import { defaults, useCalc } from './store';

export default function App() {
  const { meta, cat, state, ready, error, update, replace, remember, ensureItems } = useCalc();
  const [sheet, setSheet] = useState<string | null>(null);
  const R = useMemo(() => (cat ? compute(state, cat) : null), [state, cat]);

  // parts of the sets you wear or keep, so set cards show names (only missing ones are fetched)
  useEffect(() => {
    if (!cat) return;
    const ids = new Set<string>();
    for (const g of [...Object.values(state.gear), ...state.inv]) {
      const set = cat.meta.sets[cat.items[g.id]?.set ?? ''];
      set?.items.forEach(id => ids.add(id));
    }
    if ([...ids].some(id => !cat.items[id])) ensureItems([...ids]).catch(() => {});
  }, [state.gear, state.inv, cat, ensureItems]);

  if (error) return <p className="p-8 text-bad">Не вдалося завантажити дані з сервера: {error}</p>;
  if (!ready || !cat || !meta || !R) return <p className="p-8 text-muted">Завантаження…</p>;
  const magic = !!CLASSES[state.cls].magic;

  return (
    <TipProvider>
      <div className="mx-auto max-w-[1120px] px-3.5 pt-5 pb-28 md:px-5 md:pt-8 md:pb-11">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-serif text-4xl leading-none font-semibold md:text-5xl">Калькулятор персонажа</h1>
            <p className="mt-2 max-w-[56ch] text-sm text-muted">Предмети, камені й комплекти — з клієнта гри, формули — з mypers.world. Збірки можна зберігати на сервері.</p>
          </div>
          <BuildsMenu state={state} replace={replace} onReset={() => replace(defaults())} />
        </header>

        <main className="flex flex-col gap-4.5 md:grid md:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)] md:items-start md:gap-5.5">
          <div className="flex flex-col gap-4.5 md:gap-5.5">
            <CharacterPanel state={state} R={R} update={update} />
          </div>
          <div className="flex flex-col gap-4.5 md:gap-5.5">
            <GearPanel state={state} R={R} cat={cat} update={update} onOpen={setSheet} ensureItems={ensureItems} />
            <InventoryPanel state={state} cat={cat} update={update} onOpen={setSheet} ensureItems={ensureItems} />
            <BuffsPanel state={state} meta={meta} update={update} />
          </div>
        </main>
        <p className="mt-5.5 max-w-[70ch] text-sm text-muted">Камені, вибрані й свої властивості враховуються, якщо для них є відповідна характеристика. Вміння предметів спрацьовують із шансом і в статах не враховуються.</p>
      </div>

      {/* summary bar on phones */}
      <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 gap-1 border-t border-line-strong bg-[rgba(22,20,18,.94)] px-2 py-2 backdrop-blur md:hidden">
        {[['ЖС', 'hp'], [magic ? 'Маг. атака' : 'Фіз. атака', 'atk'], ['Фіз. захист', 'pdef'], ['Маг. захист', 'mdef']].map(([l, k]) => (
          <div key={k} className="min-w-0 text-center">
            <span className="block truncate text-xs text-muted">{l}</span>
            <StatValue text={fmtOut(k, R.out, magic)} was={false} />
          </div>
        ))}
      </div>

      {sheet && <ItemSheet slotId={sheet} state={state} cat={cat} update={update} remember={remember} onClose={() => setSheet(null)} />}
    </TipProvider>
  );
}
