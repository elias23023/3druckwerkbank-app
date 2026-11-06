import { fmtTime } from '../lib/format';

export interface RingArc { from: number; to: number; color: string; title: string; r?: number }
export interface RingDot { hour: number; color: string; title: string; done?: boolean }

/** Angle: 00:00 at bottom (front), 06:00 right, 12:00 top (back), 18:00 left. */
export const ringAngle = (h: number) => (90 - (h / 24) * 360) * (Math.PI / 180);
export const pt = (h: number, r: number, c = 100) => [c + Math.cos(ringAngle(h)) * r, c + Math.sin(ringAngle(h)) * r] as const;
function arcPath(from: number, to: number, r: number) {
  if (to <= from) to = from + 0.01;
  if (to - from >= 24) { from = 0; to = 23.999; }
  const [x1, y1] = pt(from, r); const [x2, y2] = pt(to, r);
  const large = to - from > 12 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}
const f = (n: number) => n.toFixed(2);

/** Night sky "stars" on the ring (fixed hours, only those outside daylight are drawn). */
const STAR_HOURS = [0.7, 1.9, 3.4, 4.6, 20.9, 22.2, 23.4];

/**
 * The 24-hour ring. `inlay` = thin light ring, `glass` = wide translucent band for the floating Heute info ring: groove with light edge,
 * daylight arc as a sunrise→noon→sunset gradient (passed part brighter), night arc with stars, glowing event inlays,
 * pearls for tasks/appointments and a sun or moon as the "now" marker. Plain mode = compact standalone ring.
 */
export function RingSvg({ now, sunrise, sunset, arcs, dots, labels = true, inlay = false, glass = false }: { now: Date; sunrise?: number; sunset?: number; arcs: RingArc[]; dots: RingDot[]; labels?: boolean; inlay?: boolean; glass?: boolean }) {
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const R = inlay ? 81 : 86;
  const [nx, ny] = pt(h, R);
  const day = sunrise !== undefined && sunset !== undefined;
  const isDay = day && h >= sunrise! && h <= sunset!;
  const sw = inlay ? 3.2 : 9;
  const [sx1, sy1] = day ? pt(sunrise!, R) : [0, 0]; const [sx2, sy2] = day ? pt(sunset!, R) : [0, 0];
  const arcR = (a: RingArc) => (inlay ? 66 - (62 - (a.r ?? 62)) * 0.6 : a.r ?? 62);
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label={`Tagesring, jetzt ${fmtTime(now)}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="dayG" gradientUnits="userSpaceOnUse" x1={f(sx1)} y1={f(sy1)} x2={f(sx2)} y2={f(sy2)}><stop offset="0" stopColor="#ff9f7a" /><stop offset=".35" stopColor="#ffe6a8" /><stop offset=".65" stopColor="#fff2c4" /><stop offset="1" stopColor="#ff9a4d" /></linearGradient>
        <linearGradient id="nightG" x1="0" x2="1"><stop offset="0" stopColor="#2b3f86" /><stop offset="1" stopColor="#4d7bd8" /></linearGradient>
        <filter id="ringGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.2" /></filter>
        <radialGradient id="centreSheen" cx="35%" cy="25%" r="75%"><stop offset="0" stopColor="rgba(255,255,255,.22)" /><stop offset=".6" stopColor="rgba(255,255,255,.03)" /><stop offset="1" stopColor="rgba(0,0,0,.12)" /></radialGradient>
        <filter id="pearlGlow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.6" /></filter>
      </defs>

      {/* groove: dark inset with a light edge on the inside and a shadow edge on the outside */}
      {glass ? (
        <g>
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="15" />
          <circle cx="100" cy="100" r={R + 7.5} fill="none" stroke="rgba(255,255,255,.55)" strokeWidth=".8" />
          <circle cx="100" cy="100" r={R - 7.5} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".6" />
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(10,16,30,.35)" strokeWidth="6" />
          <circle cx="100" cy="100" r="60" fill="rgba(10,16,30,.62)" stroke="rgba(255,255,255,.3)" strokeWidth=".7" /><circle cx="100" cy="100" r="60" fill="url(#centreSheen)" />
        </g>
      ) : inlay ? (
        <g>
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(28,15,4,.58)" strokeWidth="6.2" />
          <circle cx="100" cy="100" r={R + 3.4} fill="none" stroke="rgba(0,0,0,.32)" strokeWidth=".7" />
          <circle cx="100" cy="100" r={R - 3.4} fill="none" stroke="rgba(255,232,180,.42)" strokeWidth=".7" />
        </g>
      ) : <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(10,16,30,.55)" strokeWidth="14" />}

      {/* night: cool arc with a few stars */}
      <circle cx="100" cy="100" r={R} fill="none" stroke="url(#nightG)" strokeWidth={sw} opacity={inlay ? .62 : .55} />
      {inlay && day ? STAR_HOURS.filter((s) => s < sunrise! || s > sunset!).map((s) => { const [x, y] = pt(s, R); return <circle key={s} cx={f(x)} cy={f(y)} r=".65" fill="#eaf2ff" opacity=".9" />; }) : null}

      {/* daylight: glow + gradient arc; the part of the day already passed is brighter */}
      {day ? (
        <g>
          <path d={arcPath(sunrise!, sunset!, R)} fill="none" stroke="#ffd98a" strokeWidth={sw + 4.5} strokeLinecap="round" opacity={inlay ? .28 : .35} filter="url(#softGlow)" />
          <path d={arcPath(sunrise!, sunset!, R)} fill="none" stroke="url(#dayG)" strokeWidth={sw} strokeLinecap="round" opacity={inlay ? .72 : 1} />
          {h > sunrise! ? <path d={arcPath(sunrise!, Math.min(h, sunset!), R)} fill="none" stroke="url(#dayG)" strokeWidth={sw} strokeLinecap="round" filter="url(#ringGlow)" /> : null}
        </g>
      ) : null}

      {/* engraved hour ticks: dark cut + light edge */}
      {Array.from({ length: 24 }, (_, i) => {
        const len = i % 6 === 0 ? 7 : i % 3 === 0 ? 5 : 3; const [x1, y1] = pt(i, R - 6); const [x2, y2] = pt(i, R - 6 - len);
        return <g key={i}><line x1={f(x1 + .5)} y1={f(y1 + .5)} x2={f(x2 + .5)} y2={f(y2 + .5)} stroke="rgba(255,240,200,.55)" strokeWidth={i % 6 === 0 ? 1.2 : .7} /><line x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} stroke="rgba(30,16,4,.7)" strokeWidth={i % 6 === 0 ? 1.2 : .7} /></g>;
      })}
      {labels ? [0, 6, 12, 18].map((t) => { const [x, y] = pt(t, 66); return <text key={t} x={x} y={y + 3} fontSize="8" textAnchor="middle" fill="rgba(255,255,255,.8)" fontWeight="600">{String(t).padStart(2, '0')}</text>; }) : null}

      {/* event inlays: dark bed, coloured glow, bright core */}
      {arcs.map((a, i) => (
        <g key={i}>
          <path d={arcPath(a.from, a.to, arcR(a))} fill="none" stroke="rgba(20,10,2,.4)" strokeWidth={inlay ? 4.6 : 7} strokeLinecap="round" />
          <path d={arcPath(a.from, a.to, arcR(a))} fill="none" stroke={a.color} strokeWidth={inlay ? 6.5 : 9} strokeLinecap="round" opacity=".38" filter="url(#softGlow)" />
          <path d={arcPath(a.from, a.to, arcR(a))} fill="none" stroke={a.color} strokeWidth={inlay ? 2.8 : 6} strokeLinecap="round" opacity=".98"><title>{a.title}</title></path>
          <path d={arcPath(a.from, a.to, arcR(a) + (inlay ? .9 : 1.6))} fill="none" stroke="rgba(255,255,255,.35)" strokeWidth=".6" strokeLinecap="round" />
        </g>
      ))}

      {/* pearls for tasks and appointments */}
      {dots.map((d, i) => { const [x, y] = pt(d.hour, inlay ? 54 : 52); const r = inlay ? 2.7 : 3.8; return (
        <g key={i}>
          {!d.done ? <circle cx={f(x)} cy={f(y)} r={r * 1.9} fill={d.color} opacity=".38" filter="url(#pearlGlow)" /> : null}
          <circle cx={f(x)} cy={f(y)} r={r} fill={d.done ? 'rgba(200,190,170,.45)' : d.color} stroke="rgba(0,0,0,.45)" strokeWidth=".7" />
          {!d.done ? <circle cx={f(x - r * .3)} cy={f(y - r * .3)} r={r * .32} fill="rgba(255,255,255,.75)" /> : null}
          <title>{d.title}</title>
        </g>
      ); })}

      {inlay ? null : <line x1="100" y1="100" x2={nx} y2={ny} stroke="rgba(255,255,255,.7)" strokeWidth="1.2" />}

      {/* now: a small sun by day, a crescent moon by night, both with a pulsing halo */}
      <g className="ring-now" data-kind={isDay ? 'sonne' : 'mond'}>
        <circle className="ring-now__halo" cx={f(nx)} cy={f(ny)} r={inlay ? 7 : 8} fill={isDay ? 'rgba(255,214,120,.45)' : 'rgba(200,220,255,.4)'} filter="url(#softGlow)" />
        {isDay ? (
          <g>
            {Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return <line key={i} x1={f(nx + Math.cos(a) * 4.2)} y1={f(ny + Math.sin(a) * 4.2)} x2={f(nx + Math.cos(a) * 6)} y2={f(ny + Math.sin(a) * 6)} stroke="#ffd36e" strokeWidth=".9" strokeLinecap="round" />; })}
            <circle cx={f(nx)} cy={f(ny)} r="3.1" fill="#fff6cf" stroke="#ffb347" strokeWidth=".8" />
          </g>
        ) : (
          <path d={`M ${f(nx)} ${f(ny - 3.4)} A 3.4 3.4 0 1 1 ${f(nx)} ${f(ny + 3.4)} A 2.5 2.5 0 1 0 ${f(nx)} ${f(ny - 3.4)} Z`} fill="#eef3ff" stroke="rgba(0,0,0,.35)" strokeWidth=".5" />
        )}
      </g>
      {inlay ? null : <circle cx="100" cy="100" r="2.5" fill="rgba(255,255,255,.8)" />}
    </svg>
  );
}

/** Compact standalone variant with centre content. */
export function Tagesring(props: { now: Date; sunrise?: number; sunset?: number; arcs: RingArc[]; dots: RingDot[]; size?: number; centre?: React.ReactNode }) {
  const { size = 300, centre, ...rest } = props;
  return (
    <div className="tagesring" style={{ width: size, height: size }}>
      <RingSvg {...rest} />
      {centre ? <div className="tagesring__centre">{centre}</div> : null}
    </div>
  );
}
