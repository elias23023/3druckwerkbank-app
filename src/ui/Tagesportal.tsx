import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useNow, hourOf } from '../lib/time';
import { fmtTime, fmtDuration } from '../lib/format';
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
/** Iridescent sheen on the brass: colour + start hour + length (hours), like light on a soap bubble; the group turns slowly. */
const SHEEN: [string, number, number][] = [['#7af5ff', 9.2, 2.2], ['#ff7ad9', 13.6, 2.4], ['#8dff9a', 19.5, 1.6], ['#ffe27a', 2.5, 1.8], ['#9fb3ff', 6.4, 1.2]];

/**
 * The Tagesportal: a brass ring standing on the pedestal of the Heute island, the eye-catcher of the world. The inside stays
 * transparent (the real landscape shows through). On the ring: an iridescent sheen that turns slowly, a light bloom, and inside the
 * tube the sun's path from sunrise (left) to sunset (right): the passed part burns bright, the night side is deep blue with stars;
 * a radiant sun or a glowing moon marks now, sparkles sit on the brass. Centre: the clock, and (not in compact mode) the next change of light.
 */
export function Tagesportal({ compact = false, turn = 28, lean = 0 }: { compact?: boolean; turn?: number; lean?: number }) {
  const now = useNow(1000);
  const weather = useStore(useShallow((s) => s.weather));
  const today = todayDaily(weather?.data, now);
  const sr = today ? hourOf(today.sunrise) : 7; const ss = today ? hourOf(today.sunset) : 17;
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const isDay = h >= sr && h <= ss;
  const R = 81; const [bx, by] = pt(h, R);
  const tomorrow = weather?.data.daily?.[1];
  const at = (iso: string | undefined, fallbackHour: number) => fmtTime(iso ? new Date(iso) : new Date(new Date(now).setHours(fallbackHour, 0, 0, 0)));
  const line = h < sr ? [`Sonnenaufgang ${at(today?.sunrise, 7)}`, `noch ${fmtDuration(Math.round((sr - h) * 60))}`]
    : h <= ss ? [`Sonnenuntergang ${at(today?.sunset, 17)}`, `noch ${fmtDuration(Math.round((ss - h) * 60))}`]
    : [`Sonnenaufgang ${at(tomorrow?.sunrise ?? today?.sunrise, 7)}`, 'Nacht'];
  const glow = isDay ? 'rgba(255,196,110,.55)' : 'rgba(150,180,255,.45)';
  return (
    <div className={`portal${compact ? ' portal--compact' : ''}`} data-testid="portal" data-kind={isDay ? 'sonne' : 'mond'} data-day={isDay ? 'true' : 'false'}>
      <div className="portal__pool" />
      <div className="portal__tilt" style={{ transform: `rotate(${lean}deg) rotateY(${turn}deg)` }}>
        <svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label={`Tagesportal, jetzt ${fmtTime(now)}`} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="portalBrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1bf" /><stop offset=".3" stopColor="#d9a84f" /><stop offset=".6" stopColor="#8d5c1e" /><stop offset=".82" stopColor="#c8964a" /><stop offset="1" stopColor="#f7dc98" /></linearGradient>
            <linearGradient id="portalBrassHi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="rgba(255,252,235,1)" /><stop offset=".45" stopColor="rgba(255,240,200,.1)" /><stop offset="1" stopColor="rgba(255,255,255,0)" /></linearGradient>
            <linearGradient id="portalDay" gradientUnits="userSpaceOnUse" x1={f(pt(sr, R)[0])} y1={f(pt(sr, R)[1])} x2={f(pt(ss, R)[0])} y2={f(pt(ss, R)[1])}><stop offset="0" stopColor="#ff9c7a" /><stop offset=".3" stopColor="#ffe08a" /><stop offset=".55" stopColor="#fff6cc" /><stop offset=".8" stopColor="#ffc872" /><stop offset="1" stopColor="#ff8a4a" /></linearGradient>
            <linearGradient id="portalNight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1b2a6b" /><stop offset="1" stopColor="#3b5bc4" /></linearGradient>
            <radialGradient id="portalText" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="rgba(8,14,30,.55)" /><stop offset=".7" stopColor="rgba(8,14,30,.22)" /><stop offset="1" stopColor="rgba(8,14,30,0)" /></radialGradient>
            <filter id="portalSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" /></filter>
            <filter id="portalBloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
            <filter id="portalGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          {/* bloom around the whole ring: warm by day, cool by night */}
          <circle className="portal__bloom" cx="100" cy="100" r="93" fill="none" stroke={glow} strokeWidth="16" filter="url(#portalBloom)" />
          <circle cx="100" cy="100" r="93" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="11" filter="url(#portalSoft)" />

          {/* the brass tube with light edge, shadow edge and a slowly turning iridescent sheen */}
          <circle cx="100" cy="100" r="93" fill="none" stroke="url(#portalBrass)" strokeWidth="9" />
          <circle cx="100" cy="100" r="96.3" fill="none" stroke="url(#portalBrassHi)" strokeWidth="1.8" />
          <circle cx="100" cy="100" r="89.6" fill="none" stroke="rgba(60,35,10,.6)" strokeWidth="1" />
          <g className="portal__sheen">
            {SHEEN.map(([c, from, len], i) => <path key={i} d={arc(from, from + len, 93)} fill="none" stroke={c} strokeWidth="7" strokeLinecap="round" opacity=".55" filter="url(#portalSoft)" />)}
            {SHEEN.map(([c, from, len], i) => <path key={`c${i}`} d={arc(from + len * .3, from + len * .7, 94.5)} fill="none" stroke={c} strokeWidth="1.6" strokeLinecap="round" opacity=".9" />)}
          </g>

          {/* inside stays transparent; only a soft dark centre keeps the clock readable */}
          <circle cx="100" cy="100" r="46" fill="url(#portalText)" />

          {/* the sun's path inside the tube: night band with stars, daylight band, the passed part burning bright */}
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(6,10,26,.5)" strokeWidth="6.5" />
          <circle cx="100" cy="100" r={R} fill="none" stroke="url(#portalNight)" strokeWidth="4" opacity=".75" />
          {STAR_HOURS.filter((s) => s < sr || s > ss).map((s) => { const [x, y] = pt(s, R); return <circle key={s} className="portal__star" cx={f(x)} cy={f(y)} r=".8" fill="#eaf2ff" />; })}
          <path d={arc(sr, ss, R)} fill="none" stroke="url(#portalDay)" strokeWidth="4.4" strokeLinecap="round" opacity=".45" />
          {h > sr ? <path d={arc(sr, Math.min(h, ss), R)} fill="none" stroke="#ffe9b0" strokeWidth="10" strokeLinecap="round" opacity=".45" filter="url(#portalBloom)" /> : null}
          {h > sr ? <path d={arc(sr, Math.min(h, ss), R)} fill="none" stroke="url(#portalDay)" strokeWidth="4.4" strokeLinecap="round" filter="url(#portalGlow)" /> : null}
          {[sr, ss].map((t, i) => { const [x1, y1] = pt(t, R - 5.5); const [x2, y2] = pt(t, R + 5.5); return <line key={i} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} stroke="rgba(255,248,225,.95)" strokeWidth="1.4" />; })}

          {/* sparkles on the brass (turn with the sheen) */}
          <g className="portal__sheen">
            {[[4.1, 1], [11.2, .8], [16.9, .7]].map(([t, s], i) => { const [x, y] = pt(t, 93); return <path key={i} className="portal__spark" style={{ animationDelay: `${i * 1.3}s` }} d={`M ${f(x)} ${f(y - 4 * s)} L ${f(x + 1 * s)} ${f(y - 1 * s)} L ${f(x + 4 * s)} ${f(y)} L ${f(x + 1 * s)} ${f(y + 1 * s)} L ${f(x)} ${f(y + 4 * s)} L ${f(x - 1 * s)} ${f(y + 1 * s)} L ${f(x - 4 * s)} ${f(y)} L ${f(x - 1 * s)} ${f(y - 1 * s)} Z`} fill="#fff" />; })}
          </g>

          {/* now: a radiant sun by day, a glowing moon by night */}
          <g className="portal__now" data-kind={isDay ? 'sonne' : 'mond'}>
            <circle className="portal__halo" cx={f(bx)} cy={f(by)} r="14" fill={isDay ? 'rgba(255,214,120,.75)' : 'rgba(200,220,255,.55)'} filter="url(#portalBloom)" />
            {isDay ? (
              <g className="portal__rays" style={{ transformOrigin: `${f(bx)}px ${f(by)}px` }}>
                {Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5; const l = i % 2 ? 7.5 : 9.5; return <line key={i} x1={f(bx + Math.cos(a) * 5.5)} y1={f(by + Math.sin(a) * 5.5)} x2={f(bx + Math.cos(a) * l)} y2={f(by + Math.sin(a) * l)} stroke="#ffd36e" strokeWidth="1.1" strokeLinecap="round" opacity=".9" />; })}
              </g>
            ) : null}
            {isDay ? <circle cx={f(bx)} cy={f(by)} r="4.8" fill="#fff8dc" stroke="#ffb347" strokeWidth="1.2" filter="url(#portalGlow)" />
              : <path d={`M ${f(bx)} ${f(by - 4.8)} A 4.8 4.8 0 1 1 ${f(bx)} ${f(by + 4.8)} A 3.5 3.5 0 1 0 ${f(bx)} ${f(by - 4.8)} Z`} fill="#f2f6ff" stroke="rgba(0,0,0,.3)" strokeWidth=".5" filter="url(#portalGlow)" />}
          </g>
        </svg>
      </div>
      <div className="portal__foot" />
      <div className="portal__centre"><b>{fmtTime(now)}</b>{compact ? null : <><span>{line[0]}</span><span className="portal__sub">{line[1]}</span></>}</div>
    </div>
  );
}
