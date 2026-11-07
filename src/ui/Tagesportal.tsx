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

/**
 * The Tagesportal: the painted standing ring of the Heute island becomes a window on the day. Inside it stays transparent,
 * the real landscape and weather show through. On the rim: one luminous arc, the sun's path from sunrise (left) to sunset (right);
 * the passed part glows, a sun or moon bead marks now. Centre: the clock, and (not in compact mode) when the sun sets or rises next.
 */
export function Tagesportal({ compact = false, turn = 33, lean = 7 }: { compact?: boolean; turn?: number; lean?: number }) {
  const now = useNow(1000);
  const weather = useStore(useShallow((s) => s.weather));
  const today = todayDaily(weather?.data, now);
  const sr = today ? hourOf(today.sunrise) : 7; const ss = today ? hourOf(today.sunset) : 17;
  const h = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const isDay = h >= sr && h <= ss;
  const R = 90; const [bx, by] = pt(h, R);
  // what the centre line says: the next change of light
  const tomorrow = weather?.data.daily?.[1];
  const at = (iso: string | undefined, fallbackHour: number) => fmtTime(iso ? new Date(iso) : new Date(new Date(now).setHours(fallbackHour, 0, 0, 0)));
  const line = h < sr ? [`Sonnenaufgang ${at(today?.sunrise, 7)}`, `noch ${fmtDuration(Math.round((sr - h) * 60))}`]
    : h <= ss ? [`Sonnenuntergang ${at(today?.sunset, 17)}`, `noch ${fmtDuration(Math.round((ss - h) * 60))}`]
    : [`Sonnenaufgang ${at(tomorrow?.sunrise ?? today?.sunrise, 7)}`, 'Nacht'];
  return (
    <div className={`portal${compact ? ' portal--compact' : ''}`} data-testid="portal" data-kind={isDay ? 'sonne' : 'mond'}>
      <div className="portal__tilt" style={{ transform: `rotate(${lean}deg) rotateY(${turn}deg)` }}>
        <svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label={`Tagesportal, jetzt ${fmtTime(now)}`} style={{ overflow: 'visible' }}>
          <defs>
            <linearGradient id="portalDay" gradientUnits="userSpaceOnUse" x1={f(pt(sr, R)[0])} y1={f(pt(sr, R)[1])} x2={f(pt(ss, R)[0])} y2={f(pt(ss, R)[1])}><stop offset="0" stopColor="#ffb08a" /><stop offset=".5" stopColor="#fff1c2" /><stop offset="1" stopColor="#ffa052" /></linearGradient>
            <radialGradient id="portalText" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="rgba(8,14,30,.55)" /><stop offset=".7" stopColor="rgba(8,14,30,.25)" /><stop offset="1" stopColor="rgba(8,14,30,0)" /></radialGradient>
            <filter id="portalSoft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2" /></filter>
            <filter id="portalGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.8" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          {/* inside stays transparent: the real landscape and weather show through; only a soft dark centre keeps the clock readable */}
          <circle cx="100" cy="100" r="46" fill="url(#portalText)" />
          <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth=".7" />

          {/* the rim: the sun's path. Night part faint, daylight as a warm arc, the passed part glowing */}
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(10,16,34,.45)" strokeWidth="5.5" />
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(140,170,255,.4)" strokeWidth="2.2" />
          <path d={arc(sr, ss, R)} fill="none" stroke="url(#portalDay)" strokeWidth="4.2" strokeLinecap="round" opacity=".5" />
          {h > sr ? <path d={arc(sr, Math.min(h, ss), R)} fill="none" stroke="#ffe9b0" strokeWidth="7" strokeLinecap="round" opacity=".35" filter="url(#portalSoft)" /> : null}
          {h > sr ? <path d={arc(sr, Math.min(h, ss), R)} fill="none" stroke="url(#portalDay)" strokeWidth="4.2" strokeLinecap="round" filter="url(#portalGlow)" /> : null}
          {[sr, ss].map((t, i) => { const [x1, y1] = pt(t, R - 5); const [x2, y2] = pt(t, R + 5); return <line key={i} x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} stroke="rgba(255,245,220,.95)" strokeWidth="1.3" />; })}

          {/* now: sun by day, moon by night */}
          <g className="portal__now" data-kind={isDay ? 'sonne' : 'mond'}>
            <circle className="portal__halo" cx={f(bx)} cy={f(by)} r="12" fill={isDay ? 'rgba(255,214,120,.7)' : 'rgba(200,220,255,.5)'} filter="url(#portalSoft)" />
            {isDay ? <circle cx={f(bx)} cy={f(by)} r="4.6" fill="#fff7d6" stroke="#ffb347" strokeWidth="1.1" />
              : <path d={`M ${f(bx)} ${f(by - 4.4)} A 4.4 4.4 0 1 1 ${f(bx)} ${f(by + 4.4)} A 3.2 3.2 0 1 0 ${f(bx)} ${f(by - 4.4)} Z`} fill="#eef3ff" stroke="rgba(0,0,0,.3)" strokeWidth=".5" />}
          </g>
        </svg>
      </div>
      <div className="portal__centre"><b>{fmtTime(now)}</b>{compact ? null : <><span>{line[0]}</span><span className="portal__sub">{line[1]}</span></>}</div>
    </div>
  );
}
