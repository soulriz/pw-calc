import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Catalog } from '../calc';
import { CLASSES, SLOTS } from '../constants';
import { sanitize } from '../store';
import type { BuildState } from '../types';
import { ItemCard } from './ItemCard';
import { ItemIcon, TipProvider, useTip } from './common';

// Gear "dolls" of PvP teams as they could look on the Valor tournament page (open /#teams).
// Teams come from ClanDossier's "→ Команда 1/2" buttons (public/mock/pvp_teams.json); without it, the test set below.
const FILES = ['Klonyara_61', 'AnalogowNET_59', 'Jane_73', 'Ar41k_32', 'GuruWarrior_69'];
const TEAMS = [[0, 1, 2], [3, 4]];
type Raw = Record<string, unknown> & { clan?: string };
type Pvp = { format: string; teams: Raw[][] };

async function loadTeams(): Promise<{ format: string; teams: Raw[][] }> {
  const r = await fetch('/mock/pvp_teams.json', { cache: 'no-store' }).catch(() => null);
  const pvp: Pvp | null = r?.ok && (r.headers.get('content-type') || '').includes('json') ? await r.json() : null;
  if (pvp && pvp.teams.some(t => t.length)) {
    const size = parseInt(pvp.format, 10) || 3;
    return { format: pvp.format, teams: pvp.teams.slice(0, 2).map(t => t.slice(0, size)) };
  }
  const raw: Raw[] = await Promise.all(FILES.map(f => fetch(`/mock/${f}.json`).then(x => x.json())));
  return { format: '3x3', teams: TEAMS.map(t => t.map(j => raw[j])) };
}

/** Game-sized inspect window: the 324×222 inventory layout at 1:1, so icons are ~32 px like in the client. */
function Doll({ s, cat, clan }: { s: BuildState; cat: Catalog; clan?: string }) {
  const tip = useTip();
  return (
    <div className="w-fit rounded-md border border-line bg-[#14110e] p-2">
      <div className="mb-1 grid grid-cols-2 gap-x-3 px-1 text-[13px] leading-5">
        <span><span className="text-pw-gold">Ім'я:</span> {s.name}</span>
        <span><span className="text-pw-gold">Рівень:</span> {s.level}</span>
        <span><span className="text-pw-gold">Клас:</span> {CLASSES[s.cls].name}</span>
        <span><span className="text-pw-gold">Клан:</span> {clan || '—'}</span>
      </div>
      <div className="relative h-[222px] w-[324px] bg-[url(/ui/bg.png)] bg-[length:100%_100%]">
        <div className="pointer-events-none absolute top-[50px] left-[125px] h-[150px] w-[79px] bg-contain bg-center bg-no-repeat"
             style={{ backgroundImage: `url(/ui/figure_${s.sex}.png)` }} />
        {SLOTS.map(sl => {
          const g = s.gear[sl.id], it = g && cat.items[g.id];
          return (
            <div key={sl.id} className={'absolute h-[38px] w-[38px] rounded-[3px] bg-[length:100%_100%] ' + (sl.off ? 'opacity-60' : '')}
              style={{ left: sl.x - 5, top: sl.y - 30, backgroundImage: `url(/ui/slot_${sl.img || sl.id}.png)`, boxShadow: it?.col ? `inset 0 0 0 1px ${it.col}` : undefined }}
              aria-label={`${sl.title || sl.name}: ${it ? it.name + (g.r ? ' +' + g.r : '') : 'порожньо'}`}
              onPointerEnter={e => { if (it) tip.show(e.currentTarget, <ItemCard it={it} g={g} state={s} cat={cat} />); }}
              onPointerLeave={tip.hide}>
              {it && <ItemIcon it={it} className="absolute top-[3px] left-[3px] h-[32px] w-[32px] rounded-sm" />}
              {it && g.r > 0 && <span className="absolute -right-1 -bottom-1 z-10 rounded border border-ok bg-panel px-0.5 text-[10px] leading-tight font-bold text-ok">+{g.r}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TeamsMock() {
  const [data, setData] = useState<{ format: string; teams: { s: BuildState; clan?: string }[][]; cat: Catalog } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { format, teams: raw } = await loadTeams();
      // exports carry no real stats: max them so tooltips don't flag stat requirements
      const teams = raw.map(t => t.map(b => ({ s: { ...sanitize(b), stats: { vit: 1000, str: 1000, int: 1000, dex: 1000 } }, clan: b.clan })));
      const ids = [...new Set(teams.flat().flatMap(x => Object.values(x.s.gear).map(g => g.id)))];
      const [meta, list] = await Promise.all([api.meta(), api.itemsByIds(ids)]);
      setData({ format, teams, cat: { meta, items: Object.fromEntries(list.map(i => [i.id, i])), stones: Object.fromEntries(meta.stones.map(x => [x.id, x])) } });
    })().catch(e => setError(String(e)));
  }, []);
  if (error) return <p className="p-8 text-bad">Не вдалося завантажити: {error}</p>;
  if (!data) return <p className="p-8 text-muted">Завантаження…</p>;
  return (
    <TipProvider>
      <div className="mx-auto max-w-[1100px] px-4 py-8">
        <h1 className="mb-4 font-serif text-3xl text-pw-gold">Команди · {data.format.replace('x', '×')}</h1>
        <div className="flex flex-col gap-6">
          {data.teams.map((t, i) => (
            <section key={i} className="rounded-md border border-line bg-panel">
              <h2 className="border-b border-line px-4 py-2 font-serif text-lg font-semibold">Команда {i + 1}</h2>
              <div className="flex flex-wrap gap-3 p-3">
                {t.length ? t.map((x, j) => <Doll key={j} s={x.s} cat={data.cat} clan={x.clan} />)
                  : <p className="px-1 text-sm text-muted">Порожньо — додайте гравців у ClanDossier кнопкою «→ Команда {i + 1}».</p>}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">Тестовий макет: збірки з ClanDossier, без статів. Наведіть на предмет — підказка як у грі.</p>
      </div>
    </TipProvider>
  );
}
