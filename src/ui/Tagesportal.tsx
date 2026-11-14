import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useNow, hourOf } from '../lib/time';
import { fmtTime } from '../lib/format';
import { sunTurn, sunTurnAt } from '../lib/sun';
import { todayDaily } from '../lib/weather';

/** Angle on the portal: 00:00 at the bottom, 06:00 left, 12:00 at the top, 18:00 right: the sun's path as seen through a window facing south (rises east = left, sets west = right). */
const ang = (h: number) => (90 + (h / 24) * 360) * (Math.PI / 180);
const pt = (h: number, r: number) => [100 + Math.cos(ang(h)) * r, 100 + Math.sin(ang(h)) * r] as const;
const f = (n: number) => n.toFixed(2);
function arc(from: number, to: number, r: number) {
  if (to <= from) to = from + 0.01;
  const [x1, y1] = pt(from, r); const [x2, y2] = pt(to, r);
  return `M ${f(x1)} ${f(y1)} A ${r} ${r} 0 ${to - from > 12 ? 1 : 0} 1 ${f(x2)} ${f(y2)}`;
}
/** Night-side stars on the inner band (fixed hours, only those outside daylight are drawn). */
const STAR_HOURS = [0.6, 1.8, 3.1, 4.4, 20.4, 21.7, 22.9];

/**
 * The Tagesportal: the wooden ring is painted in the Heute island image (wood band, slate channel inside, on a stand). The app only lays the
 * living part into it: the sun's path in the slate channel from sunrise (left) to sunset (right) glowing like amber, the passed part bright,
 * the night side dark with small stars; a warm sun or a pale moon marks now; 24 notches and hour numbers engraved on the wood; the clock and
 * (not in compact mode) the next change of light in the centre. Position and size follow the painted ring (global.css .portal).
 */
export function Tagesportal({ compact = false, turn = 0, lean = 0 }: { compact?: boolean; turn?: number; lean?: number }) {
  const now = useNow(1000);
  const weather = useStore(useShallow((s) => s.weather));
  const today = todayDaily(weather?.data, now);
  const sr = today ? hourOf(today.sunrise) : 7; const ss = today ? hourOf(today.sunset) : 17;
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const isDay = h >= sr && h <= ss;
  const R = 87; const [bx, by] = pt(h, R);
  // the next change of light: the same helper as the weather panels and the card of the day (src/lib/sun.ts); without weather data from the 07:00–17:00 the ring draws
  const change = sunTurn(weather?.data, now, { rise: 7, set: 17 });
  const glow = isDay ? 'rgba(255,190,110,.5)' : 'rgba(150,175,230,.35)';
  return (
    <div className={`portal${compact ? ' portal--compact' : ''}`} data-testid="portal" data-kind={isDay ? 'sonne' : 'mond'} data-day={isDay ? 'true' : 'false'}>
      <div className="portal__pool" />
      <div className="portal__tilt" style={{ transform: `rotate(${lean}deg) rotateY(${turn}deg)` }}>
        <svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label={`Tagesportal, jetzt ${fmtTime(now)}`} style={{ overflow: 'visible', position: 'relative' }}>
          <defs>
            <linearGradient id="portalDay" gradientUnits="userSpaceOnUse" x1={f(pt(sr, R)[0])} y1={f(pt(sr, R)[1])} x2={f(pt(ss, R)[0])} y2={f(pt(ss, R)[1])}><stop offset="0" stopColor="#ff9c7a" /><stop offset=".3" stopColor="#ffe08a" /><stop offset=".55" stopColor="#fff6cc" /><stop offset=".8" stopColor="#ffc872" /><stop offset="1" stopColor="#ff8a4a" /></linearGradient>
            <linearGradient id="portalNight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1b2a6b" /><stop offset="1" stopColor="#3b5bc4" /></linearGradient>
            <radialGradient id="portalText" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="rgba(8,14,30,.55)" /><stop offset=".7" stopColor="rgba(8,14,30,.22)" /><stop offset="1" stopColor="rgba(8,14,30,0)" /></radialGradient>
            <filter id="portalSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" /></filter>
            <filter id="portalBloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
            <filter id="portalGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          {/* the ring itself is painted in the island image (wood band with a slate channel inside); the app only lays light and scale into it */}
          <circle cx="100" cy="100" r={R} fill="none" stroke={glow} strokeWidth="9" filter="url(#portalBloom)" opacity=".35" />
          <circle cx="100" cy="100" r="46" fill="url(#portalText)" />

          {/* hour scale on the painted wood band: 24 notches (longer every 6 h), numbers every 3 h engraved into the wood */}
          {Array.from({ length: 24 }, (_, i) => { const major = i % 6 === 0; const mid = i % 3 === 0; const [x1, y1] = pt(i, 91.6); const [x2, y2] = pt(i, 91.6 + (major ? 3.8 : mid ? 2.8 : 1.7)); return <g key={i}><line x1={f(x1 + .3)} y1={f(y1 + .3)} x2={f(x2 + .3)} y2={f(y2 + .3)} stroke="rgba(255,245,215,.55)" strokeWidth={major ? .9 : .55} /><line x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} stroke="rgba(45,25,6,.9)" strokeWidth={major ? .9 : .55} /></g>; })}
          {[0, 3, 6, 9, 12, 15, 18, 21].map((t) => { const [x, y] = pt(t, 96.2); const major = t % 6 === 0; return <g key={t} fontFamily="Georgia, 'Times New Roman', serif" fontSize={major ? 7.4 : 6.2} fontWeight="700" textAnchor="middle"><text x={f(x)} y={f(y + 2.6)} fill="#2a1605" stroke="rgba(255,243,215,.85)" strokeWidth=".9" strokeLinejoin="round" style={{ paintOrder: 'stroke' }}>{t}</text></g>; })}

          {/* the sun's path in the painted slate channel: night side dark with stars, daylight glowing like amber, the passed part bright */}
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(10,14,28,.4)" strokeWidth="5" />
          <circle cx="100" cy="100" r={R} fill="none" stroke="#2b3447" strokeWidth="3.4" opacity=".8" />
          {STAR_HOURS.filter((s) => s < sr || s > ss).map((s) => { const [x, y] = pt(s, R); return <circle key={s} className="portal__star" cx={f(x)} cy={f(y)} r=".7" fill="#e8eefb" />; })}
          <path d={arc(sr, ss, R)} fill="none" stroke="url(#portalDay)" strokeWidth="3.4" strokeLinecap="round" opacity=".4" />
          {h > sr ? <path d={arc(sr, Math.min(h, ss), R)} fill="none" stroke="#ffd48a" strokeWidth="7" strokeLinecap="round" opacity=".4" filter="url(#portalBloom)" /> : null}
          {h > sr ? <path d={arc(sr, Math.min(h, ss), R)} fill="none" stroke="url(#portalDay)" strokeWidth="3.4" strokeLinecap="round" filter="url(#portalGlow)" /> : null}
          {[sr, ss].map((t, i) => { const [x1, y1] = pt(t, R - 4); const [x2, y2] = pt(t, R + 4); return <line key={i} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} stroke="rgba(255,240,205,.9)" strokeWidth="1.1" />; })}

          {/* now: a radiant sun by day, a glowing moon by night */}
          <g className="portal__now" data-kind={isDay ? 'sonne' : 'mond'}>
            <circle className="portal__halo" cx={f(bx)} cy={f(by)} r={isDay ? 12 : 14} fill={isDay ? 'rgba(255,205,120,.6)' : 'rgba(205,220,255,.6)'} filter="url(#portalBloom)" />
            {isDay ? (
              <g className="portal__rays" style={{ transformOrigin: `${f(bx)}px ${f(by)}px` }}>
                {Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5; const l = i % 2 ? 6.8 : 8.4; return <line key={i} x1={f(bx + Math.cos(a) * 5.5)} y1={f(by + Math.sin(a) * 5.5)} x2={f(bx + Math.cos(a) * l)} y2={f(by + Math.sin(a) * l)} stroke="#ffcf7a" strokeWidth="1" strokeLinecap="round" opacity=".75" />; })}
              </g>
            ) : null}
            {isDay ? <circle cx={f(bx)} cy={f(by)} r="4.8" fill="#fff8dc" stroke="#ffb347" strokeWidth="1.2" filter="url(#portalGlow)" />
              : (
                <g>
                  {/* the moon: a full pale disc with a soft glow and a crescent of brighter light on its right side */}
                  <circle cx={f(bx)} cy={f(by)} r="5.4" fill="#c9d4ee" stroke="rgba(10,16,40,.45)" strokeWidth=".6" />
                  <path d={`M ${f(bx + .4)} ${f(by - 5)} A 5 5 0 1 1 ${f(bx + .4)} ${f(by + 5)} A 6.8 6.8 0 0 0 ${f(bx + .4)} ${f(by - 5)} Z`} fill="#f6f8ff" filter="url(#portalGlow)" />
                  <circle cx={f(bx - 1.6)} cy={f(by - 1.2)} r=".9" fill="rgba(120,135,175,.55)" />
                  <circle cx={f(bx - .4)} cy={f(by + 1.8)} r=".6" fill="rgba(120,135,175,.5)" />
                </g>
              )}
          </g>
        </svg>
      </div>
      <div className="portal__centre"><b>{fmtTime(now)}</b>{compact || !change ? null : <><span>{sunTurnAt(change)}</span><span className="portal__sub">{change.rest}</span></>}</div>
    </div>
  );
}
