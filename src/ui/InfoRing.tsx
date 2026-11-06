import { useMemo } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useNow, hourOf, sameDay } from '../lib/time';
import { fmtTime } from '../lib/format';
import { pvKw, todayDaily } from '../lib/weather';
import { RingSvg, ringAngle, type RingArc, type RingDot } from './Tagesring';

const PRINTER_COLORS = ['#7cc6ff', '#c59bff', '#4ccf7a'];

export interface RingEvent { hour: number; text: string; color: string; kind: 'druck' | 'aufgabe' | 'termin' | 'wartung' }

/** Everything the info ring shows today: daylight, PV window, prints per printer, tasks and appointments, plus the next events. */
export function useRingData(now: Date) {
  const { tasks, prints, devices, appointments, settings, weather } = useStore(useShallow((s) => ({ tasks: s.tasks, prints: s.prints, devices: s.devices, appointments: s.appointments, settings: s.settings, weather: s.weather })));
  return useMemo(() => {
    const today = todayDaily(weather?.data, now);
    const sunrise = today ? hourOf(today.sunrise) : undefined; const sunset = today ? hourOf(today.sunset) : undefined;
    const printers = devices.filter((d) => d.kind === 'drucker');
    const running = prints.filter((p) => p.status === 'läuft');
    const queued = prints.filter((p) => p.status === 'wartend').sort((a, b) => a.queueOrder - b.queueOrder);
    const pvHours = (weather?.data.hourly ?? []).filter((h) => sameDay(new Date(h.time), now) && pvKw(h.ghi, settings.pvKwp) > settings.pvKwp * 0.3);
    const arcs: RingArc[] = [];
    if (pvHours.length) arcs.push({ from: hourOf(pvHours[0].time), to: hourOf(pvHours[pvHours.length - 1].time) + 1, color: 'rgba(255,214,110,.8)', title: 'Solarstrom-Fenster (Schätzung)', r: 70 });
    const events: RingEvent[] = [];
    running.forEach((p) => {
      if (!p.startedAt) return;
      const pi = Math.max(0, printers.findIndex((d) => d.id === p.printerId));
      const s = hourOf(p.startedAt); const e = s + p.estimatedMinutes / 60;
      arcs.push({ from: s, to: e, color: PRINTER_COLORS[pi % 3], title: `${p.name} (läuft)`, r: 62 - pi * 7 });
      events.push({ hour: e, text: `Druck fertig: ${p.name}`, color: PRINTER_COLORS[pi % 3], kind: 'druck' });
    });
    let cursor = running[0]?.startedAt ? hourOf(running[0].startedAt) + running[0].estimatedMinutes / 60 : now.getHours() + now.getMinutes() / 60;
    queued.slice(0, 2).forEach((p) => { const pi = Math.max(0, printers.findIndex((d) => d.id === p.printerId)); arcs.push({ from: cursor, to: cursor + p.estimatedMinutes / 60, color: PRINTER_COLORS[pi % 3] + '88', title: `${p.name} (geplant)`, r: 62 - pi * 7 }); cursor += p.estimatedMinutes / 60; });
    const dots: RingDot[] = [];
    tasks.filter((t) => t.due && sameDay(new Date(t.due), now)).forEach((t) => { dots.push({ hour: hourOf(t.due!), color: t.kind === 'wartung' ? '#ffb547' : '#4ccf7a', title: t.title, done: t.done }); if (!t.done && !t.skipped) events.push({ hour: hourOf(t.due!), text: t.title, color: t.kind === 'wartung' ? '#ffb547' : '#4ccf7a', kind: t.kind === 'wartung' ? 'wartung' : 'aufgabe' }); });
    appointments.filter((a) => sameDay(new Date(a.at), now)).forEach((a) => { dots.push({ hour: hourOf(a.at), color: '#c59bff', title: a.title }); events.push({ hour: hourOf(a.at), text: a.title, color: '#c59bff', kind: 'termin' }); });
    const h = now.getHours() + now.getMinutes() / 60;
    const upcoming = events.filter((e) => e.hour >= h - 0.25).sort((a, b) => a.hour - b.hour);
    return { sunrise, sunset, arcs, dots, events, upcoming };
  }, [tasks, prints, devices, appointments, settings.pvKwp, weather, now]);
}

/**
 * The Heute info ring: a glass ring floating over the island platform (perspective), with the daylight arc, event inlays,
 * pearls, a sun/moon "now" marker, upright hour marks, the clock in its centre and the next events as upright tags
 * attached to their position on the ring. Rendered as a child of the island (it floats and scales with it).
 */
export function InfoRing({ tilt = 70 }: { tilt?: number }) {
  const now = useNow(1000);
  const { sunrise, sunset, arcs, dots, upcoming } = useRingData(now);
  const { tasks, prints } = useStore(useShallow((s) => ({ tasks: s.tasks, prints: s.prints })));
  const open = tasks.filter((t) => !t.done && !t.skipped).length;
  const running = prints.filter((p) => p.status === 'läuft').length;
  const cosT = Math.cos((tilt * Math.PI) / 180);
  // ring point in box percent (the box is square; the ring is tilted, so y is foreshortened)
  const at = (hour: number, r: number) => { const a = ringAngle(hour); return { x: 50 + Math.cos(a) * 50 * r, y: 50 + Math.sin(a) * 50 * r * cosT }; };
  // up to three upcoming events as tags; keep them apart on the ring (min 1.6 h spacing)
  const tags: RingEvent[] = [];
  for (const e of upcoming) { if (tags.length >= 3) break; if (tags.every((t) => Math.abs(t.hour - e.hour) >= 1.6)) tags.push(e); }
  return (
    <div className="inforing" data-testid="inforing">
      <div className="inforing__shadow" />
      <div className="inforing__tilt" style={{ transform: `perspective(1400px) rotateX(${tilt}deg)` }}>
        <RingSvg now={now} sunrise={sunrise} sunset={sunset} arcs={arcs} dots={dots} labels={false} inlay glass />
      </div>
      {[0, 6, 12, 18].map((t) => { const p = at(t, 0.86); return <span key={t} className="inforing__h" style={{ left: `${p.x}%`, top: `${p.y}%` }}>{String(t).padStart(2, '0')}</span>; })}
      <div className="inforing__centre"><b>{fmtTime(now)}</b><span>{open} offen · {running} Druck{running === 1 ? '' : 'e'}</span></div>
      {tags.map((e, i) => { const p = at(e.hour, 0.81); const side = p.x > 50 ? 'r' : 'l'; const tagX = side === 'r' ? Math.min(118, p.x + 16) : Math.max(-18, p.x - 16); const tagY = p.y - 10 - i * 2; return (
        <div key={i} className={`inforing__tagwrap inforing__tagwrap--${side}`}>
          <svg className="inforing__lead" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1={p.x} y1={p.y} x2={tagX} y2={tagY} stroke="rgba(255,255,255,.7)" strokeWidth=".5" vectorEffect="non-scaling-stroke" /><circle cx={p.x} cy={p.y} r=".9" fill="#fff" /></svg>
          <div className="glass inforing__tag" style={{ left: `${tagX}%`, top: `${tagY}%`, ['--c' as string]: e.color }}><i className="dot" /><b>{fmtTime(new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.floor(e.hour), Math.round((e.hour % 1) * 60)))}</b><span>{e.text}</span></div>
        </div>
      ); })}
    </div>
  );
}
