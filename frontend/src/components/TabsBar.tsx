import { CLASSES } from '../constants';
import type { Tab } from '../store';

/** Tabs above the calculator: several builds (of one character or of different ones). */
export function TabsBar({ tabs, active, onSelect, onAdd, onClose, onRename }: {
  tabs: Tab[]; active: number; onSelect: (i: number) => void; onAdd: (copy: boolean) => void;
  onClose: (i: number) => void; onRename: (i: number, title: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-1 border-b border-line" role="tablist" aria-label="Збірки">
      {tabs.map((t, i) => {
        const b = t.build;
        const label = (b.name.trim() || 'Без імені') + (t.title ? ` · ${t.title}` : ` · ${CLASSES[b.cls]?.name ?? ''} ${b.level}`);
        const on = i === active;
        return (
          <div key={i} role="tab" aria-selected={on} tabIndex={0} title="Подвійний клік — назва вкладки (напр. «ПвП», «ПвЕ»)"
            className={'group -mb-px flex max-w-56 cursor-pointer items-center gap-1.5 rounded-t-md border px-3 py-1.5 text-sm ' +
              (on ? 'border-line-strong border-b-panel bg-panel text-text' : 'border-line bg-panel2 text-muted hover:text-text')}
            onClick={() => onSelect(i)}
            onKeyDown={e => { if (e.key === 'Enter') onSelect(i); }}
            onDoubleClick={() => { const v = window.prompt('Назва вкладки (порожньо — клас і рівень):', t.title); if (v != null) onRename(i, v); }}>
            <span className="truncate">{label}</span>
            {tabs.length > 1 && (
              <button type="button" aria-label="Закрити вкладку" className="cursor-pointer text-muted hover:text-bad"
                onClick={e => { e.stopPropagation(); if (window.confirm(`Закрити вкладку «${label}»? Збірка з неї зникне (збережена на сервері лишиться).`)) onClose(i); }}>×</button>
            )}
          </div>
        );
      })}
      <button type="button" className="btn mb-1 ml-1 min-h-8" title="Нова вкладка з копією поточної збірки" onClick={() => onAdd(true)}>+ Копія</button>
      <button type="button" className="btn mb-1 min-h-8" title="Нова порожня вкладка" onClick={() => onAdd(false)}>+ Нова</button>
    </div>
  );
}
