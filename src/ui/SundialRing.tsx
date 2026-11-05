import { useMemo } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useNow, hourOf, sameDay } from '../lib/time';
import { pvKw, todayDaily } from '../lib/weather';
import { sunPosition, shadowLength } from '../lib/sun';
import { weatherLook } from '../scene/looks';
import { RingSvg, ringAngle, pt, type RingArc, type RingDot } from './Tagesring';
import zeigerUrl from '../assets/zeiger-gnomon.webp';

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
    const weatherCode = weather?.data.hourly.length ? weather.data.current.code : undefined;
    return { sunrise, sunset, arcs, dots, weatherCode, location: settings.location };
  }, [tasks, prints, devices, appointments, settings.pvKwp, settings.location, weather, now]);
}

/** Gnomon geometry on the dial plane (viewBox 0..200, centre 100/100, plate radius ≈ 83). */
const TIP_HEIGHT = 46; // height of the blade tip above the plate, in plane units
const MAX_SHADOW = 135; // may run off the plate onto the deck
const LANTERN = { x: 116, y: -59 }; // the island's lantern, projected onto the dial plane (back-right, off the plate)

/**
 * The gnomon's shadow on the plate. Sun: direction = sundial convention (points at the current hour mark), length from the
 * real solar elevation (long and pale at low sun, short at noon), soft penumbra growing with distance, dimmed by clouds.
 * Night: a warm, slightly flickering shadow cast by the lantern plus a faint pool of lantern light on the plate.
 */
function SundialShadow({ now, lat, lon, weatherCode, sunrise, sunset }: { now: Date; lat: number; lon: number; weatherCode?: number; sunrise?: number; sunset?: number }) {
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const sun = sunPosition(now, lat, lon);
  const look = weatherLook(weatherCode, 'mittag');
  const cloud = look === 'nebel' ? 0.12 : look === 'bedeckt' ? 0.22 : look === 'regen' ? 0.18 : 1;
  const daylight = sunrise !== undefined && sunset !== undefined ? h >= sunrise && h <= sunset : sun.elevation > 0;
  const night = !daylight || sun.elevation <= 0.5;
  // direction (degrees, CSS rotate) and length of the shadow
  let deg: number, len: number, alpha: number;
  if (!night) {
    deg = (ringAngle(h) * 180) / Math.PI;
    len = shadowLength(sun.elevation, TIP_HEIGHT, MAX_SHADOW);
    const lowSun = Math.min(1, Math.max(0.5, sun.elevation / 16)); // low sun → slightly paler shadow
    alpha = 0.92 * lowSun * cloud;
  } else {
    deg = (Math.atan2(100 - LANTERN.y, 100 - LANTERN.x) * 180) / Math.PI; // away from the lantern
    len = 64; alpha = 0.8;
  }
  // tip of the blade sits a little behind the centre (towards 12)
  const [bx, by] = pt(12, 10);
  const spread = Math.min(1, len / 60); // penumbra widens with length
  const core = `-4,-9 ${len.toFixed(1)},-${(2 + spread * 1.6).toFixed(2)} ${len.toFixed(1)},${(2 + spread * 1.6).toFixed(2)} -4,9`;
  const soft = `-6,-13 ${(len * 1.05).toFixed(1)},-${(4 + spread * 5).toFixed(2)} ${(len * 1.05).toFixed(1)},${(4 + spread * 5).toFixed(2)} -6,13`;
  const colour = night ? '52,22,4' : '18,9,2';
  return (
    <svg className={`sundial-shadow${night ? ' sundial-shadow--lantern' : ''}`} viewBox="0 0 200 200" width="100%" height="100%" style={{ overflow: 'visible' }} aria-hidden>
      <defs>
        <filter id="shadowSoft" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation={(1.2 + spread * 2.2).toFixed(2)} /></filter>
        <radialGradient id="lanternPool" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffd28a" stopOpacity="1" /><stop offset=".5" stopColor="#ffb85a" stopOpacity=".45" /><stop offset="1" stopColor="#ffb04f" stopOpacity="0" /></radialGradient>
      </defs>
      {night ? <ellipse cx={LANTERN.x - 20} cy={LANTERN.y + 95} rx="120" ry="95" fill="url(#lanternPool)" className="lantern-pool" /> : null}
      <g className="shadow-g" style={{ transform: `translate(${bx.toFixed(1)}px, ${by.toFixed(1)}px) rotate(${deg.toFixed(2)}deg)`, opacity: alpha }}>
        <polygon className="shadow-soft" points={soft} fill={`rgba(${colour},.5)`} filter="url(#shadowSoft)" />
        <polygon className="shadow-core" points={core} fill={`rgba(${colour},.9)`} />
      </g>
    </svg>
  );
}

/**
 * Sundial on the Heute island: rotating dial plate (user image), the gnomon's shadow, the Tagesring on the rim and the
 * user's gnomon on top. Rendered as a child of the island, so it floats, scales and parallaxes with the image.
 * Disc centre measured in the island image: 38.7 % / 40.7 %, tilt ≈ 62°.
 */
export function SundialRing({ tilt = 62 }: { tilt?: number }) {
  const now = useNow(1000);
  const { sunrise, sunset, arcs, dots, weatherCode, location } = useRingData(now);
  const cosT = Math.cos((tilt * Math.PI) / 180);
  const lab = (t: number) => { const a = ringAngle(t); return { left: `${50 + Math.cos(a) * 50 * 0.93}%`, top: `${50 + Math.sin(a) * 50 * 0.93 * cosT}%` }; };
  const h = now.getHours() + now.getMinutes() / 60;
  const tiltStyle = { transform: `perspective(1400px) rotateX(${tilt}deg)` };
  return (
    <div className="sundial-ring" data-testid="sundial-ring" style={{ ['--dial-rot' as string]: `${(h * 15).toFixed(2)}deg` }}>
      <div className="sundial-dial-wrap"><div className="sundial-ring__tilt" style={tiltStyle}><img className="sundial-dial" src="/img/sonnenuhr-scheibe-640.webp" alt="" draggable={false} /></div></div>
      <div className="sundial-shadow-wrap"><div className="sundial-ring__tilt" style={tiltStyle}><SundialShadow now={now} lat={location.lat} lon={location.lon} weatherCode={weatherCode} sunrise={sunrise} sunset={sunset} /></div></div>
      <div className="sundial-ring-wrap"><div className="sundial-ring__tilt" style={tiltStyle}><RingSvg now={now} sunrise={sunrise} sunset={sunset} arcs={arcs} dots={dots} labels={false} inlay /></div></div>
      {/* The user's gnomon as the top layer: dial, shadow and ring pass behind it; it also covers the painted blade of the island. */}
      <img className="sundial-gnomon" src={zeigerUrl} alt="" draggable={false} />
      {[0, 6, 12, 18].map((t) => <span key={t} className="sundial-ring__h" style={lab(t)}>{String(t).padStart(2, '0')}</span>)}
    </div>
  );
}
