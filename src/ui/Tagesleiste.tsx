import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { fmtTime, fmtDuration, relTime } from '../lib/format';
import { pvKw } from '../lib/weather';
import { navigate } from '../router';

const HOUR = 3600_000;
/** The strip shows 24 hours: three hours back and 21 hours ahead, so "now" always stands at the same place. */
const BACK_H = 3; const SPAN_H = 24;
const PRINTER_COLORS = ['#2f80ed', '#7b61ff', '#0e9f9a'];
const KIND = {
  druck: { color: '#7cc6ff', label: 'Druck' }, aufgabe: { color: '#4ccf7a', label: 'Aufgabe' },
  termin: { color: '#c59bff', label: 'Termin' }, wartung: { color: '#ffb547', label: 'Wartung' },
} as const;
type Kind = keyof typeof KIND;
const weekday = new Intl.DateTimeFormat('de-AT', { weekday: 'short' });
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

interface Bar { id: string; lane: number; from: number; to: number; color: string; title: string; sub: string; state: 'läuft' | 'geplant' | 'buchen'; progress?: number; openEnd: boolean }
interface Mark { id: string; at: number; kind: Kind; title: string; sub: string; done?: boolean; row: number; projectId?: string }
interface Next { kind: Kind; at?: number; title: string; onClick?: () => void }
interface Tip { x: number; title: string; sub: string }

/**
 * The Tagesleiste of the Heute world: the next 21 hours (and the last three) as one strip under the island. Daylight and night as the
 * background, the estimated solar window as a golden line, one lane per printer (running print with progress, queued prints as a dashed plan),
 * tasks, appointments and maintenance as marks, and above it the one thing that comes next. Everything about queued prints and solar power
 * is an estimate and says so in its hint.
 */
export function Tagesleiste({ now }: { now: Date }) {
  const { tasks, prints, devices, appointments, settings, weather } = useStore(useShallow((s) => ({ tasks: s.tasks, prints: s.prints, devices: s.devices, appointments: s.appointments, settings: s.settings, weather: s.weather })));
  const openSheet = useStore((s) => s.openSheet);
  const [tip, setTip] = useState<Tip>();
  const t = Math.floor(now.getTime() / 20_000) * 20_000; // recompute three times a minute, not every second

  const model = useMemo(() => {
    const w0 = t - BACK_H * HOUR; const w1 = w0 + SPAN_H * HOUR;
    const x = (ms: number) => ((ms - w0) / (SPAN_H * HOUR)) * 100;
    const inWin = (ms: number) => ms >= w0 && ms <= w1;

    // daylight per calendar day in the window (sunrise/sunset from the weather data, 7:00/17:00 without)
    const days: { from: number; to: number; title: string }[] = [];
    for (let d = new Date(new Date(w0).setHours(0, 0, 0, 0)); d.getTime() < w1; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const day = weather?.data.daily.find((x) => x.date === dayKey(d));
      const sr = day ? new Date(day.sunrise).getTime() : new Date(d).setHours(7, 0, 0, 0); const ss = day ? new Date(day.sunset).getTime() : new Date(d).setHours(17, 0, 0, 0);
      if (ss > w0 && sr < w1) days.push({ from: x(sr), to: x(ss), title: `Tageslicht ${fmtTime(new Date(sr))}–${fmtTime(new Date(ss))}` });
    }

    // estimated solar window: consecutive hours with more than 30 % of the installed power
    const pv: { from: number; to: number; title: string }[] = [];
    if (settings.pvKwp > 0) for (const h of weather?.data.hourly ?? []) {
      const a = new Date(h.time).getTime(); if (a + HOUR <= w0 || a >= w1 || pvKw(h.ghi, settings.pvKwp) <= settings.pvKwp * 0.3) continue;
      const last = pv[pv.length - 1]; const from = Math.max(0, x(a)); const to = Math.min(100, x(a + HOUR));
      if (last && Math.abs(last.to - from) < 0.01) last.to = to; else pv.push({ from, to, title: '' });
    }
    pv.forEach((p) => { p.title = `Solarfenster ${fmtTime(new Date(w0 + (p.from / 100) * SPAN_H * HOUR))}–${fmtTime(new Date(w0 + (p.to / 100) * SPAN_H * HOUR))} (Schätzung)`; });

    // one lane per printer: the running print, then the queue as a plan from now on
    const bars: Bar[] = []; let lanes = 0;
    devices.filter((d) => d.kind === 'drucker').forEach((d) => {
      const mine: Bar[] = []; let cursor = t;
      const run = prints.find((p) => p.printerId === d.id && p.status === 'läuft' && p.startedAt);
      if (run) {
        const s = new Date(run.startedAt!).getTime(); const e = s + run.estimatedMinutes * 60_000;
        if (run.resultDue) mine.push({ id: run.id, lane: lanes, from: s, to: Math.max(e, t), color: '#ffb547', title: run.name, sub: `${d.name} · Zeit ist um, Ergebnis buchen`, state: 'buchen', openEnd: false });
        else { mine.push({ id: run.id, lane: lanes, from: s, to: e, color: PRINTER_COLORS[lanes % 3], title: run.name, sub: `${d.name} · läuft bis etwa ${fmtTime(new Date(e))}`, state: 'läuft', progress: Math.min(1, Math.max(0, (t - s) / Math.max(1, e - s))), openEnd: e > w1 }); cursor = Math.max(cursor, e); }
      }
      for (const q of prints.filter((p) => p.printerId === d.id && p.status === 'wartend' && !p.waitReason).sort((a, b) => a.queueOrder - b.queueOrder)) {
        if (cursor >= w1) break;
        const e = cursor + q.estimatedMinutes * 60_000;
        mine.push({ id: q.id, lane: lanes, from: cursor, to: e, color: PRINTER_COLORS[lanes % 3], title: q.name, sub: `${d.name} · in der Warteschlange, ${fmtDuration(q.estimatedMinutes)} (Plan)`, state: 'geplant', openEnd: e > w1 });
        cursor = e;
      }
      if (mine.length && lanes < 3) { bars.push(...mine); lanes += 1; }
    });

    // marks: tasks with a due time, appointments, maintenance
    const raw: Omit<Mark, 'row'>[] = [];
    tasks.forEach((k) => { if (!k.due || k.skipped) return; const at = new Date(k.due).getTime(); if (inWin(at)) raw.push({ id: `t-${k.id}`, at, kind: k.kind === 'wartung' ? 'wartung' : 'aufgabe', title: k.title, sub: k.done ? 'erledigt' : `Aufgabe · ${fmtTime(new Date(at))}`, done: k.done, projectId: k.projectId }); });
    appointments.forEach((a) => { const at = new Date(a.at).getTime(); if (inWin(at)) raw.push({ id: `a-${a.id}`, at, kind: 'termin', title: a.title, sub: `${a.kind === 'erinnerung' ? 'Erinnerung' : 'Termin'} · ${fmtTime(new Date(at))}` }); });
    devices.forEach((d) => d.maintenance.forEach((m) => { if (m.done) return; const at = new Date(m.due).getTime(); if (inWin(at)) raw.push({ id: `m-${m.id}`, at, kind: 'wartung', title: `${d.name}: ${m.title}`, sub: `Wartung · ${fmtTime(new Date(at))}` }); }));
    raw.sort((a, b) => a.at - b.at);
    const lastX = [-99, -99];
    const marks: Mark[] = raw.map((m) => { const px = x(m.at); const row = px - lastX[0] >= 2.2 ? 0 : px - lastX[1] >= 2.2 ? 1 : 0; lastX[row] = px; return { ...m, row }; });

    // hour ticks every three hours; midnight carries the weekday
    const ticks: { x: number; label: string; midnight: boolean }[] = [];
    for (let d = new Date(new Date(w0).setMinutes(0, 0, 0) + HOUR); d.getTime() < w1; d = new Date(d.getTime() + HOUR)) {
      if (d.getHours() % 3 === 0) ticks.push({ x: x(d.getTime()), label: d.getHours() === 0 ? weekday.format(d).replace('.', '') : String(d.getHours()).padStart(2, '0'), midnight: d.getHours() === 0 });
    }

    // the one thing that comes next
    const overdue = tasks.filter((k) => !k.done && !k.skipped && k.due && new Date(k.due).getTime() < t).length + devices.reduce((n, d) => n + d.maintenance.filter((m) => !m.done && new Date(m.due).getTime() < t).length, 0);
    const booking = bars.find((b) => b.state === 'buchen');
    const coming: Next[] = [
      ...bars.filter((b) => b.state === 'läuft' && b.to > t).map((b): Next => ({ kind: 'druck', at: b.to, title: `${b.title} ist fertig` })),
      ...marks.filter((m) => !m.done && m.at > t).map((m): Next => ({ kind: m.kind, at: m.at, title: m.title })),
    ].sort((a, b) => a.at! - b.at!);
    const next: Next | undefined = booking ? { kind: 'wartung', title: `Ergebnis buchen: ${booking.title}` } : coming[0];
    return { x, days, pv, bars, lanes, marks, ticks, next, booking, overdue, nowX: x(t) };
  }, [t, tasks, prints, devices, appointments, settings.pvKwp, weather]);

  const { x, days, pv, bars, lanes, marks, ticks, next, booking, overdue, nowX } = model;
  const open = tasks.filter((k) => !k.done && !k.skipped).length;
  const running = prints.filter((p) => p.status === 'läuft').length;
  const empty = bars.length === 0 && marks.length === 0;
  const hover = (px: number, title: string, sub: string) => ({ onMouseEnter: () => setTip({ x: px, title, sub }), onMouseLeave: () => setTip(undefined), onFocus: () => setTip({ x: px, title, sub }), onBlur: () => setTip(undefined) });
  const openMark = (m: Mark) => (m.projectId ? () => openSheet({ kind: 'projektDetail', projectId: m.projectId!, tab: 'aufgaben' }) : m.kind === 'wartung' ? () => navigate({ world: 'druck' }) : undefined);
  const nextClick = booking ? () => openSheet({ kind: 'druck', printId: booking.id }) : undefined;
  const nextBody = next ? (
    <>
      <i className="dot" style={{ background: KIND[next.kind].color }} />
      {next.at ? <b>{fmtTime(new Date(next.at))}</b> : null}
      <span className="ellipsis">{next.title}</span>
      {next.at ? <em>{relTime(new Date(next.at).toISOString(), now.getTime())}</em> : null}
    </>
  ) : <span className="ellipsis heute-leiste__calm">Nichts Dringendes. Zeit für Ideen.</span>;

  return (
    <section className="glass heute-leiste" data-testid="tagesleiste" aria-label="Tagesleiste: die nächsten Stunden">
      <header className="heute-leiste__head">
        <span className="heute-leiste__label">Als Nächstes</span>
        {nextClick ? <button className="heute-leiste__next heute-leiste__next--click" onClick={nextClick}>{nextBody}</button> : <div className="heute-leiste__next">{nextBody}</div>}
        <span className="heute-leiste__sum">{overdue > 0 ? <span className="pill pill--warn xs">{overdue} überfällig</span> : null}{open} offen · {running === 0 ? 'kein Druck läuft' : running === 1 ? '1 Druck läuft' : `${running} Drucke laufen`}</span>
      </header>

      <div className="heute-leiste__track" data-lanes={lanes}>
        <div className="heute-leiste__sky">
          {days.map((d, i) => <div key={`d${i}`} className="heute-leiste__day" style={{ left: `${d.from}%`, width: `${d.to - d.from}%` }} title={d.title} />)}
          {pv.map((p, i) => <div key={`p${i}`} className="heute-leiste__pv" style={{ left: `${p.from}%`, width: `${p.to - p.from}%` }} title={p.title} />)}
          {ticks.map((k) => <i key={k.x.toFixed(2)} className={`heute-leiste__tick${k.midnight ? ' heute-leiste__tick--day' : ''}`} style={{ left: `${k.x}%` }} />)}
          <div className="heute-leiste__past" style={{ width: `${nowX}%` }} />
        </div>

        {bars.map((b) => {
          const from = Math.max(0, x(b.from)); const to = Math.min(100, x(b.to)); if (to <= 0 || from >= 100) return null;
          return (
            <button key={b.id} className={`heute-leiste__bar heute-leiste__bar--${b.state === 'läuft' ? 'run' : b.state === 'buchen' ? 'due' : 'plan'}${b.openEnd ? ' heute-leiste__bar--open' : ''}`}
              style={{ ['--lane' as string]: b.lane, left: `${from}%`, width: `${Math.max(1.2, to - from)}%`, ['--c' as string]: b.color, ['--p' as string]: b.progress !== undefined ? `${Math.round(((Math.min(x(t), to) - from) / Math.max(0.01, to - from)) * 100)}%` : '0%' }}
              onClick={() => openSheet({ kind: 'druck', printId: b.id })} aria-label={`${b.title}, ${b.sub}`} {...hover((from + to) / 2, b.title, b.sub)}>
              <span>{b.title}</span>
            </button>
          );
        })}

        {marks.map((m) => {
          const click = openMark(m); const props = { className: `heute-leiste__mark heute-leiste__mark--${m.kind}${m.done ? ' heute-leiste__mark--done' : ''}`, style: { left: `${x(m.at)}%`, ['--c' as string]: KIND[m.kind].color, ['--row' as string]: m.row }, 'aria-label': `${m.title}, ${m.sub}`, ...hover(x(m.at), m.title, m.sub) };
          return click ? <button key={m.id} {...props} onClick={click} /> : <span key={m.id} {...props} tabIndex={0} />;
        })}

        {empty ? <p className="heute-leiste__empty">Noch nichts geplant. Drucke, Termine und Aufgaben mit Uhrzeit erscheinen hier.</p> : null}
        <div className="heute-leiste__now" style={{ left: `${nowX}%` }}><b>jetzt</b></div>
        {tip ? <div className="heute-leiste__tip" style={{ left: `${Math.min(86, Math.max(14, tip.x))}%` }} role="tooltip"><b>{tip.title}</b><span>{tip.sub}</span></div> : null}
      </div>

      <div className="heute-leiste__axis" aria-hidden>
        {ticks.filter((k) => Math.abs(k.x - nowX) > 3.4).map((k) => <span key={k.x.toFixed(2)} className={k.midnight ? 'heute-leiste__axis-day' : undefined} style={{ left: `${k.x}%` }}>{k.label}</span>)}
      </div>
    </section>
  );
}
