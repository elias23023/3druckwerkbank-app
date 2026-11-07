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
/** Wooden mount holding the ring: a trestle on the stone pedestal (sill, two posts, cross bar), a beam on top, two curved oak cheeks hugging the ring from outside, two short slats inside, brass bolts at every joint. */
const sector = (h1: number, h2: number, r1: number, r2: number) => { const [ax, ay] = pt(h1, r2); const [bx, by] = pt(h2, r2); const [cx, cy] = pt(h2, r1); const [dx, dy] = pt(h1, r1); return `M ${f(ax)} ${f(ay)} A ${r2} ${r2} 0 0 1 ${f(bx)} ${f(by)} L ${f(cx)} ${f(cy)} A ${r1} ${r1} 0 0 0 ${f(dx)} ${f(dy)} Z`; };
const CRADLE = (() => {
  const beam = 'M 42 191 L 158 191 L 158 198.5 L 42 198.5 Z';
  const slat = (hour: number, bx: number, w = 3.2) => { const [rx, ry] = pt(hour, 92); const dx = rx - bx, dy = ry - 191.5; const L = Math.hypot(dx, dy); const nx = (-dy / L) * w, ny = (dx / L) * w; return `M ${f(bx + nx)} ${f(191.5 + ny)} L ${f(rx + nx)} ${f(ry + ny)} L ${f(rx - nx)} ${f(ry - ny)} L ${f(bx - nx)} ${f(191.5 - ny)} Z`; };
  // the trestle under the beam, down to the stone pedestal: sill, two slanted posts, a cross bar; low, with top and side faces so it reads as solid wood
  const postL = 'M 56 198 L 63 198 L 69 218 L 62 218 Z'; const postR = 'M 144 198 L 137 198 L 131 218 L 138 218 Z';
  const cross = 'M 58 206 L 142 206 L 142 210 L 58 210 Z';
  const sill = 'M 52 218 L 148 218 L 148 223 L 52 223 Z';
  const parts = [sill, postL, postR, cross, beam, sector(1.4, 4.9, 97.5, 106), sector(19.1, 22.6, 97.5, 106), slat(3.6, 66), slat(20.4, 134)];
  // oblique faces (offset +4 / -3): lit tops and shaded right sides, plus the rear pair of posts
  const tops = ['M 52 218 L 148 218 L 152 215 L 56 215 Z', 'M 58 206 L 142 206 L 146 203 L 62 203 Z', 'M 42 191 L 158 191 L 162 188 L 46 188 Z', 'M 56 198 L 63 198 L 67 195 L 60 195 Z', 'M 137 198 L 144 198 L 148 195 L 141 195 Z'];
  const sides = ['M 148 218 L 152 215 L 152 220 L 148 223 Z', 'M 142 206 L 146 203 L 146 207 L 142 210 Z', 'M 158 191 L 162 188 L 162 195.5 L 158 198.5 Z', 'M 63 198 L 67 195 L 73 215 L 69 218 Z', 'M 144 198 L 148 195 L 142 215 L 138 218 Z'];
  const rear = ['M 60 195 L 67 195 L 73 215 L 66 215 Z', 'M 148 195 L 141 195 L 135 215 L 142 215 Z', 'M 56 215 L 152 215 L 152 220 L 56 220 Z'];
  return { parts, tops, sides, rear, bolts: [[66, 194.8], [134, 194.8], pt(3.6, 92), pt(20.4, 92), pt(2.2, 102), pt(4.1, 102), pt(19.9, 102), pt(21.8, 102), [64, 208], [136, 208], [58, 220.5], [142, 220.5]] as [number, number][] };
})();
/** Night-side stars on the inner band (fixed hours, only those outside daylight are drawn). */
const STAR_HOURS = [0.6, 1.8, 3.1, 4.4, 20.4, 21.7, 22.9];

/**
 * The Tagesportal: a turned oak ring with a brass inlay, standing on the stone pedestal of the Heute island. The inside stays
 * transparent (the real landscape shows through). Natural materials only: oak with real grain (turbulence filter), a soft sheen,
 * brass edge; inside the inlay the sun's path from sunrise (left) to sunset (right) glows like amber, the passed part bright,
 * the night side dark slate with small stars; a warm sun or a pale moon marks now. Centre: the clock, and (not in compact mode) the next change of light.
 */
export function Tagesportal({ compact = false, turn = 0, lean = 0 }: { compact?: boolean; turn?: number; lean?: number }) {
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
        {/* the body of the ring: slices stacked behind the front face give it real thickness once the ring is turned in perspective */}
        {Array.from({ length: 7 }, (_, i) => (
          <svg key={i} className="portal__depth" viewBox="0 0 200 200" width="100%" height="100%" aria-hidden style={{ transform: `translateZ(${-(i + 1) * 1.4}px)` }}>
            {CRADLE.parts.map((d, k) => <path key={k} d={d} fill={`rgba(${58 - i * 5},${34 - i * 3},${12 - i},1)`} />)}
            <circle cx="100" cy="100" r="93" fill="none" stroke={i < 6 ? `rgba(${70 - i * 6},${40 - i * 4},${14 - i},1)` : 'rgba(30,16,4,1)'} strokeWidth="11" />
            <circle cx="100" cy="100" r="98.3" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth=".8" />
          </svg>
        ))}
        <svg viewBox="0 0 200 200" width="100%" height="100%" role="img" aria-label={`Tagesportal, jetzt ${fmtTime(now)}`} style={{ overflow: 'visible', position: 'relative' }}>
          <defs>
            <linearGradient id="portalOak" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#d6a96a" /><stop offset=".25" stopColor="#9c6a34" /><stop offset=".55" stopColor="#5f3b19" /><stop offset=".8" stopColor="#8d5c2b" /><stop offset="1" stopColor="#c99a5c" /></linearGradient>
            <linearGradient id="portalOakHi" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="rgba(255,236,200,.75)" /><stop offset=".4" stopColor="rgba(255,236,200,.08)" /><stop offset="1" stopColor="rgba(255,255,255,0)" /></linearGradient>
            <linearGradient id="portalFar" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="rgba(255,240,215,.1)" /><stop offset=".45" stopColor="rgba(0,0,0,0)" /><stop offset="1" stopColor="rgba(0,0,0,.38)" /></linearGradient>
            <linearGradient id="portalBrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f3dca0" /><stop offset=".4" stopColor="#b98a3e" /><stop offset=".7" stopColor="#7d561c" /><stop offset="1" stopColor="#dcb86a" /></linearGradient>
            {/* wood grain: coarse long fibres, fine short fibres and darker growth lines, each clipped to the ring */}
            <filter id="portalGrain" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.01 0.22" numOctaves="4" seed="7" result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.22  0 0 0 0 0.12  0 0 0 0 0.04  0 0 0 1.6 -0.35" result="g" />
              <feComposite in="g" in2="SourceAlpha" operator="in" />
            </filter>
            <filter id="portalGrainFine" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035 0.9" numOctaves="2" seed="3" result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.95  0 0 0 0 0.78  0 0 0 0 0.5  0 0 0 1.4 -0.45" result="g" />
              <feComposite in="g" in2="SourceAlpha" operator="in" />
            </filter>
            <filter id="portalGrainDark" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="turbulence" baseFrequency="0.006 0.5" numOctaves="2" seed="11" result="n" />
              <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.08  0 0 0 0 0.02  0 0 0 2.2 -0.9" result="g" />
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

          {/* the wooden mount: trestle on the pedestal (rear posts first), beam, cheeks and slats; oak with grain, lit top faces and shaded side faces */}
          <g>
            {CRADLE.rear.map((d, k) => <path key={k} d={d} fill="rgba(62,36,12,1)" />)}
            {CRADLE.parts.map((d, k) => <g key={k}><path d={d} fill="url(#portalOak)" /><path d={d} fill="#000" filter="url(#portalGrain)" opacity=".8" /><path d={d} fill="#000" filter="url(#portalGrainDark)" opacity=".6" /><path d={d} fill="none" stroke="rgba(255,236,200,.4)" strokeWidth=".7" /><path d={d} fill="none" stroke="rgba(30,15,3,.55)" strokeWidth=".5" transform="translate(.4 .6)" /></g>)}
            {CRADLE.tops.map((d, k) => <g key={k}><path d={d} fill="url(#portalOak)" /><path d={d} fill="rgba(255,232,185,.42)" /><path d={d} fill="none" stroke="rgba(60,34,10,.5)" strokeWidth=".4" /></g>)}
            {CRADLE.sides.map((d, k) => <g key={k}><path d={d} fill="url(#portalOak)" /><path d={d} fill="rgba(20,10,2,.48)" /><path d={d} fill="none" stroke="rgba(30,15,3,.5)" strokeWidth=".4" /></g>)}
          </g>

          {/* the oak ring: turned wood with grain, a soft sheen on the upper left, bevel edges, brass on the inner lip */}
          <circle cx="100" cy="100" r="93" fill="none" stroke="url(#portalOak)" strokeWidth="11" />
          <circle cx="100" cy="100" r="93" fill="none" stroke="#000" strokeWidth="11" filter="url(#portalGrain)" opacity=".85" />
          <circle cx="100" cy="100" r="93" fill="none" stroke="#000" strokeWidth="11" filter="url(#portalGrainFine)" opacity=".5" />
          <circle cx="100" cy="100" r="93" fill="none" stroke="#000" strokeWidth="11" filter="url(#portalGrainDark)" opacity=".7" />
          {/* growth rings of the turned wood: thin concentric lines, slightly uneven */}
          {[90.2, 91.6, 93.1, 94.7, 96.1].map((r, i) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="rgba(55,30,8,.42)" strokeWidth={i % 2 ? .35 : .55} strokeDasharray={i % 2 ? '14 6 22 4' : '30 5 12 8'} strokeDashoffset={i * 9} />)}
          {/* rounded tube: dark outer edge, bright ridge just inside it, shadow trough towards the inner lip, far side a little darker */}
          <circle cx="100" cy="100" r="97.9" fill="none" stroke="rgba(28,14,3,.6)" strokeWidth="1" />
          <circle cx="100" cy="100" r="95.6" fill="none" stroke="rgba(255,236,200,.42)" strokeWidth="1.8" filter="url(#portalSoft)" />
          <circle cx="100" cy="100" r="90.3" fill="none" stroke="rgba(22,10,2,.5)" strokeWidth="2.2" filter="url(#portalSoft)" />
          <circle cx="100" cy="100" r="93" fill="none" stroke="url(#portalFar)" strokeWidth="11" />
          <circle cx="100" cy="100" r="93" fill="none" stroke="url(#portalOakHi)" strokeWidth="9" opacity=".7" />
          {/* brass bolts at every joint of the mount */}
          {CRADLE.bolts.map(([x, y], k) => <g key={k}><circle cx={f(x)} cy={f(y)} r="2.1" fill="url(#portalBrass)" stroke="rgba(40,22,6,.6)" strokeWidth=".4" /><circle cx={f(x - .6)} cy={f(y - .6)} r=".7" fill="rgba(255,245,215,.8)" /></g>)}
          <circle cx="100" cy="100" r="98.2" fill="none" stroke="rgba(255,235,200,.55)" strokeWidth=".9" />
          <circle cx="100" cy="100" r="98.8" fill="none" stroke="rgba(40,22,6,.5)" strokeWidth=".6" />
          <circle cx="100" cy="100" r="87.2" fill="none" stroke="url(#portalBrass)" strokeWidth="2.2" />
          <circle cx="100" cy="100" r="88.4" fill="none" stroke="rgba(255,245,215,.6)" strokeWidth=".5" />
          <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(40,22,6,.6)" strokeWidth=".6" />

          {/* hour scale: 24 notches in the brass lip (longer every 6 h), hour numbers every 3 h engraved into the wood */}
          {Array.from({ length: 24 }, (_, i) => { const major = i % 6 === 0; const mid = i % 3 === 0; const [x1, y1] = pt(i, 88.4); const [x2, y2] = pt(i, 88.4 - (major ? 3.6 : mid ? 2.6 : 1.6)); return <g key={i}><line x1={f(x1 + .35)} y1={f(y1 + .35)} x2={f(x2 + .35)} y2={f(y2 + .35)} stroke="rgba(255,245,215,.55)" strokeWidth={major ? 1 : .6} /><line x1={f(x1)} y1={f(y1)} x2={f(x2)} y2={f(y2)} stroke="rgba(45,25,6,.9)" strokeWidth={major ? 1 : .6} /></g>; })}
          {[0, 3, 6, 9, 12, 15, 18, 21].map((t) => { const [x, y] = pt(t, 93.2); const major = t % 6 === 0; return <g key={t} fontFamily="Georgia, 'Times New Roman', serif" fontSize={major ? 8.6 : 6.8} fontWeight="700" textAnchor="middle"><text x={f(x + .5)} y={f(y + 3 + .5)} fill="rgba(255,242,215,.6)">{t}</text><text x={f(x)} y={f(y + 3)} fill="rgba(42,22,5,.95)">{t}</text></g>; })}

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
      <div className="portal__foot" />
      <div className="portal__centre"><b>{fmtTime(now)}</b>{compact ? null : <><span>{line[0]}</span><span className="portal__sub">{line[1]}</span></>}</div>
    </div>
  );
}
