import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { firstNum, nf } from '../format';
import type { Item } from '../types';

/** Item icon from the client atlas (public/icons). */
export const ItemIcon = ({ it, className = '' }: { it: Pick<Item, 'img'>; className?: string }) =>
  <img src={'/' + it.img} alt="" loading="lazy" className={'pixel block ' + className} />;

// ---------- hover tooltip ----------
interface TipApi { show: (el: HTMLElement, content: ReactNode) => void; hide: () => void }
const TipCtx = createContext<TipApi>({ show: () => {}, hide: () => {} });
export const useTip = () => useContext(TipCtx);
export const canHover = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function TipProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<{ content: ReactNode; rect: DOMRect } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<TipApi>({
    show: (el, content) => { if (canHover()) setTip({ content, rect: el.getBoundingClientRect() }); },
    hide: () => setTip(null),
  });
  useEffect(() => {
    if (!tip || !ref.current) { setPos(null); return; }
    const w = ref.current.offsetWidth, h = ref.current.offsetHeight, r = tip.rect;
    let x = r.right + 10;
    if (x + w > window.innerWidth - 8) x = r.left - w - 10;
    setPos({ x: Math.max(8, x), y: Math.max(8, Math.min(r.top, window.innerHeight - h - 8)) });
  }, [tip]);
  useEffect(() => {
    const off = () => setTip(null);
    window.addEventListener('scroll', off, { passive: true });
    return () => window.removeEventListener('scroll', off);
  }, []);
  return (
    <TipCtx.Provider value={api.current}>
      {children}
      {tip && (
        <div ref={ref} className="pointer-events-none fixed z-50 w-[300px] shadow-2xl"
             style={{ left: pos?.x ?? -9999, top: pos?.y ?? -9999 }}>
          {tip.content}
        </div>
      )}
    </TipCtx.Provider>
  );
}

/** A stat value that flashes and shows the change (+/−) for a few seconds after it changes. */
export function StatValue({ text, className = '', was = true }: { text: string; className?: string; was?: boolean }) {
  const prev = useRef(text);
  const [delta, setDelta] = useState<{ d: number; from: string } | null>(null);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (prev.current === text) return;
    const d = Math.round((firstNum(text) - firstNum(prev.current)) * 100) / 100;
    const from = prev.current;
    prev.current = text;
    setFlash(f => f + 1);
    if (!d || !Number.isFinite(d)) return;
    setDelta({ d, from });
    const t = setTimeout(() => setDelta(null), 8000);
    return () => clearTimeout(t);
  }, [text]);
  return (
    <span className="whitespace-nowrap" title={delta ? `було ${delta.from} → стало ${text}` : undefined}>
      {delta && was && <span className="mr-1 text-[0.7rem] text-muted line-through">{delta.from}</span>}
      <span key={flash} className={'rounded px-0.5 font-bold ' + (flash ? 'bump ' : '') + className}>{text}</span>
      {delta && <span className={'ml-1 text-xs font-bold ' + (delta.d > 0 ? 'text-ok' : 'text-bad')}>{(delta.d > 0 ? '+' : '−') + nf(Math.abs(delta.d))}</span>}
    </span>
  );
}

/** Panel with the gold corner ornaments. */
export function Panel({ id, title, note, children, className = '' }: { id?: string; title: ReactNode; note?: ReactNode; children: ReactNode; className?: string }) {
  const corner = 'pointer-events-none absolute -top-[3px] h-[34px] w-[34px] text-deco';
  const svg = (
    <svg viewBox="0 0 40 40" fill="none" stroke="currentColor"><path d="M2.5 38V13Q2.5 2.5 13 2.5h25" strokeWidth="3.5" /><path d="M15 8l7 7-7 7-7-7z" strokeWidth="2.4" /></svg>
  );
  return (
    <section id={id} className={'panel ' + className}>
      <span className={corner + ' -left-[3px]'}>{svg}</span>
      <span className={corner + ' -right-[3px] -scale-x-100'}>{svg}</span>
      <h2 className="panel-title"><span>{title}</span>{note && <span className="font-sans text-sm font-normal text-muted">{note}</span>}</h2>
      <div className="px-5 pt-3 pb-5">{children}</div>
    </section>
  );
}
