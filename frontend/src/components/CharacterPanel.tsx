import { useEffect, useRef, useState } from 'react';
import { freePoints, type Output, type Result } from '../calc';
import { ABBR, CLASSES, classIcon, MAX_LEVEL, MIN_STAT, STAT_KEYS, STAT_NAME } from '../constants';
import { dec, nf } from '../format';
import type { BuildState, StatKey } from '../types';
import { Panel, StatValue } from './common';

export function fmtOut(k: string, o: Output, magic: boolean): string {
  switch (k) {
    case 'patk': return `${nf(o.pmin)}–${nf(o.pmax)}`;
    case 'matk': return `${nf(o.mmin)}–${nf(o.mmax)}`;
    case 'atk': return magic ? fmtOut('matk', o, magic) : fmtOut('patk', o, magic);
    case 'hpFull': return `${nf(o.hp)}/${nf(o.hp)}`;
    case 'mpFull': return `${nf(o.mp)}/${nf(o.mp)}`;
    case 'aspd': return `${dec(o.aspd, 2)} уд/сек`;
    case 'crit': case 'cast': case 'physRed': case 'magRed': case 'critDmg': return `${o[k]}%`;
    case 'speed': return `${dec(o.speed, 1)} м/сек`;
    default: return nf(o[k as keyof Output] as number);
  }
}

// two-column table as in the game "Персонаж" window
const PAIRS: [string, string, string | null, string | null][] = [
  ['patk', 'Фіз. атака', 'pdef', 'Фіз. захист'],
  ['matk', 'Маг. атака', 'mdef', 'Маг. захист'],
  ['crit', 'Шанс крит. удару', 'critDmg', 'Крит. шкода'],
  ['aspd', 'Атак/сек', 'speed', 'Швидкість'],
  ['acc', 'Влучність', 'eva', 'Ухилення'],
  ['atkLvl', 'Показник атаки', 'defLvl', 'Показник захисту'],
  ['spirit', 'Бойовий дух', 'soul', 'Сила духу'],
  ['stealth', 'Прихованість', 'detect', 'Виявлення'],
  ['dmgMon', 'Шкода монстрам', 'defMon', 'Захист від монстрів'],
  ['pPen', 'Фізич. пробивання', 'mPen', 'Магіч. пробивання'],
  ['physRed', 'Зменш. фіз. шкоди', 'magRed', 'Зменш. маг. шкоди'],
  ['cast', 'Час співу', null, null],
];
const ELEMENTS: [string, string, string | null, string | null][] = [
  ['eMetal', 'Метал', 'eWood', 'Дерево'], ['eWater', 'Вода', 'eFire', 'Вогонь'], ['eEarth', 'Земля', null, null],
];

/** +/- button that repeats while held. */
function StepButton({ label, disabled, onStep }: { label: string; disabled: boolean; onStep: (n: number) => void }) {
  const timers = useRef<{ t1?: number; t2?: number; ticks: number }>({ ticks: 0 });
  const stop = () => { clearTimeout(timers.current.t1); clearInterval(timers.current.t2); };
  useEffect(() => stop, []);
  useEffect(() => { if (disabled) stop(); }, [disabled]);
  return (
    <button type="button" aria-label={label} disabled={disabled}
      className="h-6 w-6 cursor-pointer select-none rounded border border-line bg-panel leading-none text-gold hover:bg-win disabled:cursor-default disabled:opacity-35"
      onPointerDown={e => {
        if (e.button !== 0 || disabled) return;
        e.preventDefault();
        stop();
        timers.current.ticks = 0;
        onStep(1);
        timers.current.t1 = window.setTimeout(() => {
          timers.current.t2 = window.setInterval(() => { timers.current.ticks++; onStep(timers.current.ticks > 25 ? 5 : 1); }, 60);
        }, 380);
      }}
      onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onClick={e => { if (e.detail === 0) onStep(1); }}
      onContextMenu={e => e.preventDefault()}>
      {label.startsWith('Збільшити') ? '+' : '−'}
    </button>
  );
}

export function CharacterPanel({ state, R, update }: { state: BuildState; R: Result; update: (fn: (s: BuildState) => BuildState) => void }) {
  const C = CLASSES[state.cls];
  const free = freePoints(state);
  const setStat = (k: StatKey, v: number) => update(s => {
    const cur = s.stats[k];
    const max = Math.max(cur, cur + freePoints(s));
    const nv = Math.max(MIN_STAT, Math.min(Math.round(v), max));
    return nv === cur ? s : { ...s, stats: { ...s.stats, [k]: nv } };
  });
  const same = STAT_KEYS.every(k => state.stats[k] === state.saved[k]);
  const out = R.out;
  const cell = (k: string | null, l: string | null) => k ? (
    <div className="flex min-w-0 items-baseline justify-between gap-1.5 px-2 py-1">
      <span className={'min-w-0 ' + ((k === 'patk' && !C.magic) || (k === 'matk' && C.magic) ? 'font-bold text-pw-gold' : 'text-gold')}>{l}</span>
      <StatValue text={fmtOut(k, out, !!C.magic)} />
    </div>
  ) : <div />;
  const table = (rows: typeof PAIRS) => rows.map(([a, la, b, lb]) => (
    <div key={a} className="grid grid-cols-2 even:bg-[rgba(255,220,160,.05)] [&>*+*]:border-l [&>*+*]:border-line">{cell(a, la)}{cell(b, lb)}</div>
  ));

  return (
    <Panel id="p-char" title={<span className="block text-center">Персонаж</span>} className="bg-gradient-to-b from-[#2b2117] to-[#1a130c] [--color-line:#5a4526]">
      <div className="grid grid-cols-[92px_minmax(0,1fr)] gap-3.5">
        <div>
          <div className="grid h-[106px] w-[92px] place-items-center rounded-md border border-line-strong bg-[radial-gradient(circle_at_50%_38%,#3b2d1c,#140f0a_78%)]"><img src={classIcon(state.cls)} alt={C.name} className="pixel h-[72px] w-[72px]" /></div>
          <div className="mt-1.5 whitespace-nowrap text-center text-sm text-gold">Рів. {state.level} {C.name}</div>
        </div>
        <div>
          <input className="mb-1 block w-full border-b border-transparent bg-transparent pb-1 text-center font-serif text-2xl font-bold text-gold placeholder:text-gold/60 hover:border-line focus:border-line-strong focus:outline-none"
            maxLength={24} placeholder="Без імені" aria-label="Ім’я персонажа" value={state.name}
            onChange={e => update(s => ({ ...s, name: e.target.value.slice(0, 24) }))} />
          <div className="mt-1.5 grid grid-cols-[58px_minmax(0,1fr)] items-center gap-2">
            <span className="text-gold" id="cls-label">Клас</span>
            <div role="radiogroup" aria-labelledby="cls-label" className="flex flex-wrap gap-1">
              {Object.entries(CLASSES).map(([id, c]) => (
                <button key={id} type="button" role="radio" aria-checked={state.cls === id} title={c.name} aria-label={c.name}
                  onClick={() => update(s => ({ ...s, cls: id }))}
                  className={'cursor-pointer rounded-full p-px ' + (state.cls === id ? 'ring-2 ring-gold' : 'opacity-55 hover:opacity-100')}>
                  <img src={classIcon(id)} alt="" className="block h-[30px] w-[30px]" />
                </button>
              ))}
            </div>
          </div>
          <label className="mt-1.5 grid grid-cols-[58px_minmax(0,1fr)] items-center gap-2">
            <span className="text-gold">Рівень</span>
            <input className="input" type="number" min={1} max={MAX_LEVEL} value={state.level}
              onChange={e => { const v = parseInt(e.target.value, 10); if (v >= 1 && v <= MAX_LEVEL) update(s => ({ ...s, level: v })); }} />
          </label>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap justify-between gap-x-4 gap-y-1 rounded-md border border-line bg-panel2 px-3 py-1.5 text-gold">
        <span>ЖС: <b className="text-text"><StatValue text={fmtOut('hpFull', out, false)} /></b></span>
        <span>МЕ: <b className="text-text"><StatValue text={fmtOut('mpFull', out, false)} /></b></span>
      </div>

      <div className="mt-3 rounded-lg border border-line bg-panel2 p-3">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3">
          <span>Доступно очок: <strong className={'text-lg ' + (free < 0 ? 'text-bad' : 'text-gold')}>{nf(free)}</strong></span>
          <span className="font-serif text-xl font-bold text-gold">Характеристики</span>
        </div>
        {free < 0 && <p className="mb-2 text-sm text-bad">Для {state.level} рівня розподілено забагато. Зменште характеристики на {nf(-free)}.</p>}
        {/* as in the game window: total with gear in green, two columns, small +/- */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {(['vit', 'int', 'str', 'dex'] as StatKey[]).map(k => (
            <div key={k} className="flex items-center gap-1">
              <label htmlFor={'st-' + k} className="w-9 flex-none font-bold text-gold" title={STAT_NAME[k]}>{ABBR[k]}</label>
              <StatField id={'st-' + k} label={STAT_NAME[k]} base={state.stats[k]} bonus={R.G[k] || 0} onSet={v => setStat(k, v)} />
              <StepButton label={'Збільшити: ' + STAT_NAME[k]} disabled={free <= 0} onStep={n => setStat(k, state.stats[k] + n)} />
              <StepButton label={'Зменшити: ' + STAT_NAME[k]} disabled={state.stats[k] <= MIN_STAT} onStep={n => setStat(k, state.stats[k] - n)} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button className="btn" onClick={() => update(s => ({ ...s, stats: { vit: MIN_STAT, str: MIN_STAT, int: MIN_STAT, dex: MIN_STAT } }))}>Обнулити</button>
          <button className="btn" disabled={same} onClick={() => update(s => ({ ...s, stats: { ...s.saved } }))}>Скасувати</button>
          <button className="btn border-line-strong bg-win" disabled={same} onClick={() => update(s => ({ ...s, saved: { ...s.stats } }))}>Зберегти</button>
        </div>
      </div>

      <div className="mt-3.5 overflow-hidden rounded-md border border-line text-sm">
        {table(PAIRS)}
        <div className="border-y border-line bg-head px-2 py-1.5 font-serif font-bold">Опір стихіям</div>
        {table(ELEMENTS)}
      </div>
    </Panel>
  );
}

/** Shows the total (base + gear, green when gear adds); while focused it edits the base points. */
function StatField({ id, label, base, bonus, onSet }: { id: string; label: string; base: number; bonus: number; onSet: (v: number) => void }) {
  const [edit, setEdit] = useState(false);
  return (
    <input id={id} type="number" min={MIN_STAT} aria-label={label} value={edit ? base : base + bonus}
      title={bonus ? `${base} очок ${bonus > 0 ? '+' : '−'} ${Math.abs(bonus)} від екіпіровки` : ''}
      className={'h-7 w-14 flex-none border-0 border-b border-line bg-transparent text-center font-bold focus:border-line-strong focus:bg-well focus:text-text focus:outline-none '
        + (bonus > 0 ? 'text-ok' : bonus < 0 ? 'text-bad' : '')}
      onFocus={e => { setEdit(true); const t = e.target; requestAnimationFrame(() => t.select()); }}
      onBlur={() => setEdit(false)}
      onChange={e => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v) && v >= MIN_STAT) onSet(v); }} />
  );
}
