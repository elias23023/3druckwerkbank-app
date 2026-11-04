import { fmtTime } from '../lib/format';

export interface RingArc { from: number; to: number; color: string; title: string; r?: number }
export interface RingDot { hour: number; color: string; title: string; done?: boolean }

/** Angle: 00:00 at bottom, 06:00 right, 12:00 top, 18:00 left (sun rises right, sets left). */
const ang = (h: number) => (90 - (h / 24) * 360) * (Math.PI / 180);
const pt = (h: number, r: number, c = 100) => [c + Math.cos(ang(h)) * r, c + Math.sin(ang(h)) * r] as const;
function arcPath(from: number, to: number, r: number) {
  if (to <= from) to = from + 0.01;
  if (to - from >= 24) { from = 0; to = 23.999; }
  const [x1, y1] = pt(from, r); const [x2, y2] = pt(to, r);
  const large = to - from > 12 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function Tagesring({ now, sunrise, sunset, arcs, dots, size = 320, centre }: { now: Date; sunrise?: number; sunset?: number; arcs: RingArc[]; dots: RingDot[]; size?: number; centre?: React.ReactNode }) {
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const [nx, ny] = pt(h, 86);
  return (
    <div className="tagesring" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`Tagesring, jetzt ${fmtTime(now)}`}>
        <defs>
          <linearGradient id="dayG" x1="0" x2="1"><stop offset="0" stopColor="#ffb14d" /><stop offset=".5" stopColor="#ffe29a" /><stop offset="1" stopColor="#ff9a5c" /></linearGradient>
          <radialGradient id="discG"><stop offset="0" stopColor="rgba(12,18,32,.55)" /><stop offset=".85" stopColor="rgba(12,18,32,.55)" /><stop offset="1" stopColor="rgba(12,18,32,0)" /></radialGradient>
        </defs>
        <circle cx="100" cy="100" r="98" fill="url(#discG)" />
        <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="10" />
        {sunrise !== undefined && sunset !== undefined ? <path d={arcPath(sunrise, sunset, 86)} fill="none" stroke="url(#dayG)" strokeWidth="10" strokeLinecap="round" opacity=".9"><title>Tageslicht {sunrise.toFixed(0)}–{sunset.toFixed(0)} Uhr</title></path> : null}
        {[0, 6, 12, 18].map((t) => { const [x, y] = pt(t, 72); return <text key={t} x={x} y={y + 3} fontSize="7.5" textAnchor="middle" fill="rgba(255,255,255,.7)" fontWeight="600">{String(t).padStart(2, '0')}</text>; })}
        {Array.from({ length: 24 }, (_, i) => { const [x1, y1] = pt(i, 79); const [x2, y2] = pt(i, i % 6 === 0 ? 76 : 77.5); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,.45)" strokeWidth={i % 6 === 0 ? 1.2 : .6} />; })}
        {arcs.map((a, i) => <path key={i} d={arcPath(a.from, a.to, a.r ?? 62)} fill="none" stroke={a.color} strokeWidth="6" strokeLinecap="round" opacity=".95"><title>{a.title}</title></path>)}
        {dots.map((d, i) => { const [x, y] = pt(d.hour, 52); return <g key={i}><circle cx={x} cy={y} r="3.6" fill={d.done ? 'rgba(255,255,255,.3)' : d.color} stroke="rgba(0,0,0,.4)" strokeWidth=".8" /><title>{d.title}</title></g>; })}
        <line x1="100" y1="100" x2={nx} y2={ny} stroke="#fff" strokeWidth="1.2" opacity=".8" />
        <circle cx={nx} cy={ny} r="4.5" fill="#fff" style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,.9))' }} />
        <circle cx="100" cy="100" r="3" fill="#fff" />
      </svg>
      {centre ? <div className="tagesring__centre">{centre}</div> : null}
    </div>
  );
}
