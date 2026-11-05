import { useMemo } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useNow, hourOf, sameDay } from '../lib/time';
import { pvKw, todayDaily } from '../lib/weather';
import { RingSvg, ringAngle, type RingArc, type RingDot } from './Tagesring';

const PRINTER_COLORS = ['#7cc6ff', '#c59bff', '#4ccf7a'];

/** Everything the Tagesring shows today: daylight, PV window, prints per printer, tasks and appointments as dots. */
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
    running.forEach((p) => {
      if (!p.startedAt) return;
      const pi = Math.max(0, printers.findIndex((d) => d.id === p.printerId));
      const s = hourOf(p.startedAt); arcs.push({ from: s, to: s + p.estimatedMinutes / 60, color: PRINTER_COLORS[pi % 3], title: `${p.name} (läuft)`, r: 62 - pi * 7 });
    });
    let cursor = running[0]?.startedAt ? hourOf(running[0].startedAt) + running[0].estimatedMinutes / 60 : now.getHours() + now.getMinutes() / 60;
    queued.slice(0, 2).forEach((p) => { const pi = Math.max(0, printers.findIndex((d) => d.id === p.printerId)); arcs.push({ from: cursor, to: cursor + p.estimatedMinutes / 60, color: PRINTER_COLORS[pi % 3] + '88', title: `${p.name} (geplant)`, r: 62 - pi * 7 }); cursor += p.estimatedMinutes / 60; });
    const dots: RingDot[] = [];
    tasks.filter((t) => t.due && sameDay(new Date(t.due), now)).forEach((t) => dots.push({ hour: hourOf(t.due!), color: t.kind === 'wartung' ? '#ffb547' : '#4ccf7a', title: t.title, done: t.done }));
    appointments.filter((a) => sameDay(new Date(a.at), now)).forEach((a) => dots.push({ hour: hourOf(a.at), color: '#c59bff', title: a.title }));
    return { sunrise, sunset, arcs, dots };
  }, [tasks, prints, devices, appointments, settings.pvKwp, weather, now]);
}

/**
 * The Tagesring laid onto the sundial disc of the Heute island. Rendered as a child of the island, so it floats,
 * scales and parallaxes with the image. Disc centre measured in the island image: 38.7 % / 40.7 %, tilt ≈ 64°.
 */
export function SundialRing({ tilt = 62 }: { tilt?: number }) {
  const now = useNow(1000);
  const { sunrise, sunset, arcs, dots } = useRingData(now);
  const cosT = Math.cos((tilt * Math.PI) / 180);
  const lab = (t: number) => { const a = ringAngle(t); return { left: `${50 + Math.cos(a) * 50 * 0.93}%`, top: `${50 + Math.sin(a) * 50 * 0.93 * cosT}%` }; };
  const h = now.getHours() + now.getMinutes() / 60;
  return (
    <div className="sundial-ring" data-testid="sundial-ring" style={{ ['--dial-rot' as string]: `${(h * 15).toFixed(2)}deg` }}>
      {/* The gnomon cut-out is a pixel mask (public/img/zeiger-maske.png, built by scripts/blade-mask.mjs) applied to the untilted wrappers. */}
      <div className="sundial-dial-wrap"><div className="sundial-ring__tilt" style={{ transform: `perspective(1400px) rotateX(${tilt}deg)` }}><img className="sundial-dial" src="/img/sonnenuhr-scheibe-640.webp" alt="" draggable={false} /></div></div>
      <div className="sundial-ring-wrap"><div className="sundial-ring__tilt" style={{ transform: `perspective(1400px) rotateX(${tilt}deg)` }}><RingSvg now={now} sunrise={sunrise} sunset={sunset} arcs={arcs} dots={dots} labels={false} inlay shadow /></div></div>
      {[0, 6, 12, 18].map((t) => <span key={t} className="sundial-ring__h" style={lab(t)}>{String(t).padStart(2, '0')}</span>)}
    </div>
  );
}
