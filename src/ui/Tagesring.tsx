import { fmtTime } from '../lib/format';

export interface RingArc { from: number; to: number; color: string; title: string; r?: number }
export interface RingDot { hour: number; color: string; title: string; done?: boolean }

/** Angle: 00:00 at bottom (front), 06:00 right, 12:00 top (back), 18:00 left. */
export const ringAngle = (h: number) => (90 - (h / 24) * 360) * (Math.PI / 180);
const pt = (h: number, r: number, c = 100) => [c + Math.cos(ringAngle(h)) * r, c + Math.sin(ringAngle(h)) * r] as const;
function arcPath(from: number, to: number, r: number) {
  if (to <= from) to = from + 0.01;
  if (to - from >= 24) { from = 0; to = 23.999; }
  const [x1, y1] = pt(from, r); const [x2, y2] = pt(to, r);
  const large = to - from > 12 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

/** Flat ring graphic (no text). Used inside a perspective container on the Heute island, and plain on mobile. */
export function RingSvg({ now, sunrise, sunset, arcs, dots, labels = true }: { now: Date; sunrise?: number; sunset?: number; arcs: RingArc[]; dots: RingDot[]; labels?: boolean }) {
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const [nx, ny] = pt(h, 86);
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label={`Tagesring, jetzt ${fmtTime(now)}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="dayG" x1="0" x2="1"><stop offset="0" stopColor="#ffb14d" /><stop offset=".5" stopColor="#ffe29a" /><stop offset="1" stopColor="#ff9a5c" /></linearGradient>
        <linearGradient id="nightG" x1="0" x2="1"><stop offset="0" stopColor="#4a7fe0" /><stop offset="1" stopColor="#9fd4ff" /></linearGradient>
        <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(10,16,30,.55)" strokeWidth="14" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="url(#nightG)" strokeWidth="9" opacity=".55" />
      {sunrise !== undefined && sunset !== undefined ? <path d={arcPath(sunrise, sunset, 86)} fill="none" stroke="url(#dayG)" strokeWidth="9" strokeLinecap="round" filter="url(#ringGlow)" /> : null}
      {Array.from({ length: 24 }, (_, i) => { const [x1, y1] = pt(i, 78); const [x2, y2] = pt(i, i % 6 === 0 ? 74 : 76); return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,.55)" strokeWidth={i % 6 === 0 ? 1.4 : .7} />; })}
      {labels ? [0, 6, 12, 18].map((t) => { const [x, y] = pt(t, 66); return <text key={t} x={x} y={y + 3} fontSize="8" textAnchor="middle" fill="rgba(255,255,255,.8)" fontWeight="600">{String(t).padStart(2, '0')}</text>; }) : null}
      {arcs.map((a, i) => <path key={i} d={arcPath(a.from, a.to, a.r ?? 62)} fill="none" stroke={a.color} strokeWidth="6" strokeLinecap="round" opacity=".95"><title>{a.title}</title></path>)}
      {dots.map((d, i) => { const [x, y] = pt(d.hour, 52); return <g key={i}><circle cx={x} cy={y} r="3.8" fill={d.done ? 'rgba(255,255,255,.3)' : d.color} stroke="rgba(0,0,0,.4)" strokeWidth=".8" /><title>{d.title}</title></g>; })}
      <line x1="100" y1="100" x2={nx} y2={ny} stroke="rgba(255,255,255,.7)" strokeWidth="1.2" />
      <circle cx={nx} cy={ny} r="5" fill="#fff" filter="url(#ringGlow)" />
      <circle cx="100" cy="100" r="2.5" fill="rgba(255,255,255,.8)" />
    </svg>
  );
}

/** Mobile/compact variant with centre content. */
export function Tagesring(props: { now: Date; sunrise?: number; sunset?: number; arcs: RingArc[]; dots: RingDot[]; size?: number; centre?: React.ReactNode }) {
  const { size = 300, centre, ...rest } = props;
  return (
    <div className="tagesring" style={{ width: size, height: size }}>
      <RingSvg {...rest} />
      {centre ? <div className="tagesring__centre">{centre}</div> : null}
    </div>
  );
}

/** Perspective ring that lies on the island platform. `rx`/`ry` in cqw give the ellipse used for upright labels. */
export function PlatformRing({ now, sunrise, sunset, arcs, dots, tilt = 70 }: { now: Date; sunrise?: number; sunset?: number; arcs: RingArc[]; dots: RingDot[]; tilt?: number }) {
  const cosT = Math.cos((tilt * Math.PI) / 180);
  const lab = (t: number) => { const a = ringAngle(t); return { left: `${50 + Math.cos(a) * 50 * 0.78}%`, top: `${50 + Math.sin(a) * 50 * 0.78 * cosT}%` }; };
  return (
    <div className="platform-ring">
      <div className="platform-ring__tilt" style={{ transform: `perspective(1200px) rotateX(${tilt}deg)` }}><RingSvg now={now} sunrise={sunrise} sunset={sunset} arcs={arcs} dots={dots} labels={false} /></div>
      {[0, 6, 12, 18].map((t) => <span key={t} className="platform-ring__h" style={lab(t)}>{String(t).padStart(2, '0')}:00</span>)}
    </div>
  );
}
