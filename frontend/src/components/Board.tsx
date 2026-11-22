import { useEffect, useState, type DragEvent, type ReactNode } from 'react';

/** Two columns of panels the user can rearrange by dragging their grip; a lock hides the grips. Kept in localStorage. */
type Layout = { cols: string[][]; locked: boolean };
const KEY = 'pwcalc.layout';

function load(ids: string[], def: string[][]): Layout {
  try {
    const l = JSON.parse(localStorage.getItem(KEY) ?? '') as Layout;
    const got = l.cols.flat();
    // a saved layout from another version (panel added or removed) is dropped
    if (l.cols.length === 2 && got.length === ids.length && ids.every(id => got.includes(id))) return { cols: l.cols, locked: !!l.locked };
  } catch { /* none saved */ }
  return { cols: def, locked: true };
}

/** id moved to column c before index i (i = column length: at the end) */
export function moveTo(cols: string[][], id: string, c: number, i: number): string[][] {
  const from = cols.findIndex(col => col.includes(id));
  const at = cols[from].indexOf(id);
  const next = cols.map(col => col.filter(x => x !== id));
  next[c].splice(from === c && at < i ? i - 1 : i, 0, id);
  return next;
}

const Lock = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-2 [stroke-linecap:round]">
    <rect x="5" y="11" width="14" height="10" rx="2" /><path d={open ? 'M8 11V7a4 4 0 0 1 7.5-2' : 'M8 11V7a4 4 0 0 1 8 0v4'} />
  </svg>
);

export function Board({ panels, def }: { panels: Record<string, ReactNode>; def: string[][] }) {
  const [lay, setLay] = useState(() => load(Object.keys(panels), def));
  const [drag, setDrag] = useState<string | null>(null);
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(lay)); } catch { /* storage unavailable */ } }, [lay]);

  const drop = (e: DragEvent, c: number, i: number) => {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData('text/x-panel');
    if (id in panels) setLay(l => ({ ...l, cols: moveTo(l.cols, id, c, i) }));
    setDrag(null);
  };
  const over = (e: DragEvent) => { if (drag) e.preventDefault(); };

  return (
    <>
      <div className="mb-2 flex justify-end">
        <button type="button" className={'btn min-h-8 ' + (lay.locked ? 'text-muted hover:text-text' : 'btn-gold')} aria-pressed={!lay.locked}
          title={lay.locked ? 'Відкріпити, щоб переставити панелі' : 'Закріпити розташування панелей'}
          onClick={() => setLay(l => ({ ...l, locked: !l.locked }))}>
          <Lock open={!lay.locked} />{lay.locked ? 'Панелі закріплені' : 'Перетягуйте панелі за ⠿ — потім закріпіть'}
        </button>
      </div>
      <main className="flex flex-col gap-4.5 md:grid md:grid-cols-[minmax(0,.95fr)_minmax(0,1.05fr)] md:items-start md:gap-5.5">
        {lay.cols.map((col, c) => (
          <div key={c} className={'flex flex-col gap-4.5 md:gap-5.5 ' + (lay.locked ? '' : 'min-h-24 rounded-md outline-1 outline-dashed outline-offset-4 outline-line')}
            onDragOver={over} onDrop={e => drop(e, c, col.length)}>
            {col.map((id, i) => (
              <div key={id} className={'relative ' + (drag === id ? 'opacity-40' : '')} onDragOver={over}
                onDrop={e => { const r = e.currentTarget.getBoundingClientRect(); drop(e, c, e.clientY > r.top + r.height / 2 ? i + 1 : i); }}>
                {!lay.locked && (
                  <button type="button" draggable aria-label="Перетягнути панель" title="Перетягнути панель"
                    className="absolute top-1 left-1/2 z-10 -translate-x-1/2 cursor-grab rounded border border-line-strong bg-panel2 px-3 text-lg leading-6 text-gold active:cursor-grabbing"
                    onDragStart={e => { e.dataTransfer.setData('text/x-panel', id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setDragImage(e.currentTarget.parentElement!, 40, 20); setDrag(id); }}
                    onDragEnd={() => setDrag(null)}>⠿</button>
                )}
                {panels[id]}
              </div>
            ))}
          </div>
        ))}
      </main>
    </>
  );
}
