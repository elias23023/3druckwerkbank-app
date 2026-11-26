import { useId } from 'react';
import { wmo } from '../lib/weather';

/**
 * A small living picture of the weather right now: sun with turning rays, moon with stars, drifting clouds, falling rain or
 * snow, fog, a flash of lightning. Drawn as SVG and moved with CSS only (rules `.wb*` in `src/styles/global.css`, block
 * „Wetterbild“). It stands still where motion is not wanted and rests with the water look (`--wa-lauf`).
 * The same kinds as `WeatherIcon` (from `wmo(code).icon`); `width` in px, the picture is 4:3.
 */
export function WetterBild({ code, isDay = true, width = 84, label }: { code: number; isDay?: boolean; width?: number; label?: string }) {
  const id = useId().replace(/:/g, '');
  const kind = wmo(code).icon;
  const wet = kind === 'regen' || kind === 'schauer';
  const storm = !['sonne', 'teils', 'wolke', 'nebel', 'regen', 'schauer', 'schnee'].includes(kind);
  const dark = wet || storm;
  const sky = kind === 'sonne' || kind === 'teils';
  const cloud = (cls: string, x: number, y: number, s: number, fill: string) => (
    <g className={cls}><g transform={`translate(${x} ${y}) scale(${s})`} fill={fill}><circle cx="14" cy="20" r="11" /><circle cx="30" cy="13" r="15" /><circle cx="46" cy="19" r="12" /><rect x="3" y="18" width="55" height="14" rx="7" /></g></g>
  );
  return (
    <svg className={`wb wb--${storm ? 'gewitter' : kind}${isDay ? '' : ' wb--nacht'}`} width={width} height={width * 0.75} viewBox="0 0 96 72" role="img" aria-label={label ?? wmo(code).label}>
      <defs>
        <radialGradient id={`${id}s`} cx="40%" cy="38%" r="70%"><stop offset="0" stopColor="#fff6cf" /><stop offset="1" stopColor="#ffbe45" /></radialGradient>
        <radialGradient id={`${id}g`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#ffd77a" stopOpacity=".55" /><stop offset="1" stopColor="#ffd77a" stopOpacity="0" /></radialGradient>
        <radialGradient id={`${id}m`} cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#dfe9ff" stopOpacity=".34" /><stop offset="1" stopColor="#dfe9ff" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#c9d6ea" /></linearGradient>
        <linearGradient id={`${id}d`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9c4d6" /><stop offset="1" stopColor="#74829a" /></linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e9eef7" /><stop offset="1" stopColor="#9aa9c2" /></linearGradient>
      </defs>
      {sky && isDay ? (
        <g className="wb__sun" transform={kind === 'teils' ? 'translate(60 24)' : 'translate(48 34)'}>
          <circle className="wb__glow" r="27" fill={`url(#${id}g)`} />
          <g className="wb__rays" stroke="#ffd77a" strokeWidth="2.6" strokeLinecap="round">{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <line key={a} x1="0" y1="-18" x2="0" y2={a % 90 ? -22 : -24.5} transform={`rotate(${a})`} />)}</g>
          <circle r="13" fill={`url(#${id}s)`} />
        </g>
      ) : null}
      {sky && !isDay ? (
        <g className="wb__moon" transform={kind === 'teils' ? 'translate(60 24)' : 'translate(50 34)'}>
          <circle className="wb__glow" r="25" fill={`url(#${id}m)`} />
          <path d="M6 -14a15 15 0 1 0 9 25a12.5 12.5 0 0 1 -9 -25z" fill="#eef3ff" />
          <g fill="#fff">{[[-30, -16, 1.5], [-20, 8, 1.1], [-36, 4, 1], [26, -20, 1.2], [-8, -24, .9]].map(([x, y, r], i) => <circle key={i} className="wb__star" style={{ animationDelay: `${i * -0.9}s` }} cx={x} cy={y} r={r} />)}</g>
        </g>
      ) : null}
      {kind === 'teils' ? cloud('wb__cloud wb__cloud--a', 12, 26, .95, `url(#${id}c)`) : null}
      {kind === 'wolke' ? <>{cloud('wb__cloud wb__cloud--b', 34, 8, .72, `url(#${id}b)`)}{cloud('wb__cloud wb__cloud--a', 10, 24, 1.05, `url(#${id}c)`)}</> : null}
      {kind === 'nebel' ? <>{cloud('wb__cloud wb__cloud--a', 18, 6, 1, `url(#${id}b)`)}<g className="wb__fog" stroke="#dfe6f2" strokeWidth="3.4" strokeLinecap="round">{[[16, 46, 78], [24, 55, 86], [12, 64, 66]].map(([x1, y, x2], i) => <line key={i} style={{ animationDelay: `${i * -1.7}s` }} x1={x1} y1={y} x2={x2} y2={y} />)}</g></> : null}
      {dark || kind === 'schnee' ? <>{cloud('wb__cloud wb__cloud--b', 38, 2, .66, `url(#${id}${dark ? 'd' : 'b'})`)}{cloud('wb__cloud wb__cloud--a', 12, 10, 1.08, `url(#${id}${dark ? 'd' : 'c'})`)}</> : null}
      {dark ? <g className="wb__rain" stroke="#9fd4ff" strokeWidth="2.4" strokeLinecap="round">{[24, 36, 48, 60, 72].map((x, i) => (storm && i === 2 ? null : <line key={x} style={{ animationDelay: `${[-.1, -.55, -.3, -.8, -.45][i]}s` }} x1={x} y1="46" x2={x - 3} y2="54" />))}</g> : null}
      {storm ? <path className="wb__bolt" d="M52 42 42 57h7l-4 13 13-18h-7l5-10z" fill="#ffd77a" stroke="#fff3c4" strokeWidth=".8" strokeLinejoin="round" /> : null}
      {kind === 'schnee' ? <g className="wb__snow" fill="#fff">{[22, 34, 46, 58, 70].map((x, i) => <circle key={x} style={{ animationDelay: `${[-.2, -1.5, -.8, -2.2, -1.1][i]}s` }} cx={x} cy="48" r={i % 2 ? 2 : 2.5} />)}</g> : null}
    </svg>
  );
}
