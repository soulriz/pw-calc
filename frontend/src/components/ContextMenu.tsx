import { useCallback, useEffect, useState, type MouseEvent } from 'react';

/** Menu state for one panel: open(e, items) on right click. */
export function useContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null);
  const open = useCallback((e: MouseEvent, items: MenuItem[]) => { e.preventDefault(); setMenu({ x: e.clientX, y: e.clientY, items }); }, []);
  const close = useCallback(() => setMenu(null), []);
  return { menu, open, close };
}

export interface MenuItem { label: string; onClick: () => void; danger?: boolean }
export interface MenuState { x: number; y: number; items: MenuItem[] }

/** Right-click menu at the cursor; closes on any click, scroll or Escape. */
export function ContextMenu({ menu, onClose }: { menu: MenuState | null; onClose: () => void }) {
  useEffect(() => {
    if (!menu) return;
    const close = () => onClose();
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, { passive: true });
    window.addEventListener('keydown', esc);
    return () => { window.removeEventListener('click', close); window.removeEventListener('scroll', close); window.removeEventListener('keydown', esc); };
  }, [menu, onClose]);
  if (!menu) return null;
  return (
    <div role="menu" className="fixed z-50 min-w-48 rounded-md border border-line-strong bg-panel py-1 shadow-2xl"
         style={{ left: Math.min(menu.x, window.innerWidth - 200), top: Math.min(menu.y, window.innerHeight - 40 * menu.items.length) }}
         onContextMenu={e => e.preventDefault()}>
      {menu.items.map(m => (
        <button key={m.label} role="menuitem" type="button"
          className={'block w-full cursor-pointer px-3 py-1.5 text-left text-sm hover:bg-win ' + (m.danger ? 'text-bad' : 'text-text')}
          onClick={() => { onClose(); m.onClick(); }}>{m.label}</button>
      ))}
    </div>
  );
}
