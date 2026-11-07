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

/**
 * The Tagesportal: a turned oak ring with a brass inlay, standing on the stone pedestal of the Heute island. The inside stays
 * transparent (the real landscape shows through). Natural materials only: oak with real grain (turbulence filter), a soft sheen,
 * brass edge; inside the inlay the sun's path from sunrise (left) to sunset (right) glows like amber, the passed part bright,
 * the night side dark slate with small stars; a warm sun or a pale moon marks now. Centre: the clock, and (not in compact mode) the next change of light.
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
  const glow = isDay ? 'rgba(255,190,110,.5)' : 'rgba(150,175,230,.35)';
  return (
    <div className={`portal${compact ? ' portal--compact' : ''}`} data-testid="portal" data-kind={isDay ? 'sonne' : 'mond'} data-day={isDay ? 'true' : 'false'}>
      <div className="portal__pool" />
      <div className="portal__tilt" style={{ transform: `rotate(${lean}deg) rotateY(${turn}deg)` }}>
        <svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label={`Tagesportal, jetzt ${fmtTime(now)}`} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="portalOak" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d6a96a" /><stop offset=".25" stopColor="#9c6a34" /><stop offset=".55" stopColor="#5f3b19" /><stop offset=".8" stopColor="#8d5c2b" /><stop offset="1" stopColor="#c99a5c" /></linearGradient>
            <linearGradient id="portalOakHi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="rgba(255,236,200,.75)" /><stop offset=".4" stopColor="rgba(255,236,200,.08)" /><stop offset="1" stopColor="rgba(255,255,255,0)" /></linearGradient>
            <linearGradient id="portalBrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3dca0" /><stop offset=".4" stopColor="#b98a3e" /><stop offset=".7" stopColor="#7d561c" /><stop offset="1" stopColor="#dcb86a" /></linearGradient>
            <filter id="portalGrain" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.012 0.28" numOctaves="3" seed="7" result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.14  0 0 0 0 0.05  0 0 0 0.9 0" result="g" />
              <feComposite in="g" in2="SourceAlpha" operator="in" />
            </filter>
            <linearGradient id="portalDay" gradientUnits="userSpaceOnUse" x1={f(pt(sr, R)[0])} y1={f(pt(sr, R)[1])} x2={f(pt(ss, R)[0])} y2={f(pt(ss, R)[1])}><stop offset="0" stopColor="#ff9c7a" /><stop offset=".3" stopColor="#ffe08a" /><stop offset=".55" stopColor="#fff6cc" /><stop offset=".8" stopColor="#ffc872" /><stop offset="1" stopColor="#ff8a4a" /></linearGradient>
            <linearGradient id="portalNight" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1b2a6b" /><stop offset="1" stopColor="#3b5bc4" /></linearGradient>
            <radialGradient id="portalText" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="rgba(8,14,30,.55)" /><stop offset=".7" stopColor="rgba(8,14,30,.22)" /><stop offset="1" stopColor="rgba(8,14,30,0)" /></radialGradient>
            <filter id="portalSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" /></filter>
            <filter id="portalBloom" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" /></filter>
            <filter id="portalGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          {/* a faint warm halo: the light of the inlay spilling out, not a neon glow */}
          <circle cx="100" cy="100" r="92" fill="none" stroke={glow} strokeWidth="12" filter="url(#portalBloom)" opacity=".5" />
          <circle cx="100" cy="100" r="93" fill="none" stroke="rgba(0,0,0,.38)" strokeWidth="12" filter="url(#portalSoft)" />

          {/* the oak ring: turned wood with grain, a soft sheen on the upper left, bevel edges, brass on the inner lip */}
          <circle cx="100" cy="100" r="93" fill="none" stroke="url(#portalOak)" strokeWidth="11" />
          <circle cx="100" cy="100" r="93" fill="none" stroke="#000" strokeWidth="11" filter="url(#portalGrain)" opacity=".55" />
          <circle cx="100" cy="100" r="93" fill="none" stroke="url(#portalOakHi)" strokeWidth="9" />
          <circle cx="100" cy="100" r="98.2" fill="none" stroke="rgba(255,235,200,.55)" strokeWidth=".9" />
          <circle cx="100" cy="100" r="98.8" fill="none" stroke="rgba(40,22,6,.5)" strokeWidth=".6" />
          <circle cx="100" cy="100" r="87.2" fill="none" stroke="url(#portalBrass)" strokeWidth="2.2" />
          <circle cx="100" cy="100" r="88.4" fill="none" stroke="rgba(255,245,215,.6)" strokeWidth=".5" />
          <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(40,22,6,.6)" strokeWidth=".6" />

          {/* inside stays transparent; only a soft dark centre keeps the clock readable */}
          <circle cx="100" cy="100" r="46" fill="url(#portalText)" />

          {/* the sun's path in the inlay: a dark slate channel, the daylight glowing like amber, the passed part bright; stars on the night side */}
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(14,18,30,.55)" strokeWidth="6" />
          <circle cx="100" cy="100" r={R} fill="none" stroke="#2b3447" strokeWidth="3.8" opacity=".85" />
          {STAR_HOURS.filter((s) => s < sr || s > ss).map((s) => { const [x, y] = pt(s, R); return <circle key={s} className="portal__star" cx={f(x)} cy={f(y)} r=".75" fill="#e8eefb" />; })}
          <path d={arc(sr, ss, R)} fill="none" stroke="url(#portalDay)" strokeWidth="3.8" strokeLinecap="round" opacity=".4" />
          {h > sr ? <path d={arc(sr, Math.min(h, ss), R)} fill="none" stroke="#ffd48a" strokeWidth="8" strokeLinecap="round" opacity=".4" filter="url(#portalBloom)" /> : null}
          {h > sr ? <path d={arc(sr, Math.min(h, ss), R)} fill="none" stroke="url(#portalDay)" strokeWidth="3.8" strokeLinecap="round" filter="url(#portalGlow)" /> : null}
          {[sr, ss].map((t, i) => { const [x1, y1] = pt(t, R - 4.5); const [x2, y2] = pt(t, R + 4.5); return <line key={i} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} stroke="rgba(255,240,205,.9)" strokeWidth="1.2" />; })}

          {/* now: a radiant sun by day, a glowing moon by night */}
          <g className="portal__now" data-kind={isDay ? 'sonne' : 'mond'}>
            <circle className="portal__halo" cx={f(bx)} cy={f(by)} r="12" fill={isDay ? 'rgba(255,205,120,.6)' : 'rgba(200,215,245,.45)'} filter="url(#portalBloom)" />
            {isDay ? (
              <g className="portal__rays" style={{ transformOrigin: `${f(bx)}px ${f(by)}px` }}>
                {Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5; const l = i % 2 ? 6.8 : 8.4; return <line key={i} x1={f(bx + Math.cos(a) * 5.5)} y1={f(by + Math.sin(a) * 5.5)} x2={f(bx + Math.cos(a) * l)} y2={f(by + Math.sin(a) * l)} stroke="#ffcf7a" strokeWidth="1" strokeLinecap="round" opacity=".75" />; })}
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
