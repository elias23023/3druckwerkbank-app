import type { Spool, WeatherData } from '../types';
import { wmo } from '../lib/weather';

/* Props are drawn in a 100×100 box positioned over the wooden disc of the frame island. */

export function TagesringProp({ hour, isDay }: { hour: number; isDay: boolean }) {
  const a = (90 - (hour / 24) * 360) * (Math.PI / 180);
  const cx = 50 + Math.cos(a) * 40, cy = 87 + Math.sin(a) * 9.6;
  return (
    <svg viewBox="0 0 100 100" className="prop" preserveAspectRatio="none">
      <defs>
        <linearGradient id="ringG" x1="0" x2="1"><stop offset="0" stopColor="#ffb14d" /><stop offset=".55" stopColor="#ffe29a" /><stop offset="1" stopColor="#7cc6ff" /></linearGradient>
        <radialGradient id="glow"><stop offset="0" stopColor={isDay ? '#ffe9b0' : '#cfe6ff'} stopOpacity=".9" /><stop offset="1" stopColor={isDay ? '#ffb14d' : '#7cc6ff'} stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="50" cy="87" rx="40" ry="9.6" fill="none" stroke="url(#ringG)" strokeWidth="1.8" opacity=".95" style={{ filter: "drop-shadow(0 0 3px rgba(255,200,120,.8))" }} />
      <ellipse cx="50" cy="87" rx="31" ry="7.4" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth=".5" />
      <circle cx={cx} cy={cy} r="7" fill="url(#glow)" />
      <circle cx={cx} cy={cy} r="2.2" fill="#fff" />
      <ellipse cx="50" cy="86" rx="7" ry="2.4" fill="#4a3a2a" />
      <path d="M45 86 C44 76 47 70 50 62 C53 70 56 76 55 86 Z" fill="#e9dcc3" opacity=".95" />
      <path d="M47.5 84 C47 76 48.5 71 50 66 C51.5 71 53 76 52.5 84 Z" fill="#fff6e3" opacity=".6" />
      <ellipse cx="50" cy="66" rx="9" ry="6" fill="#ffe29a" opacity=".35" style={{ filter: 'blur(3px)' }} />
    </svg>
  );
}

export function MaterialProp({ spools }: { spools: Spool[] }) {
  const show = spools.slice(0, 10);
  return (
    <svg viewBox="0 0 100 100" className="prop" preserveAspectRatio="none">
      <rect x="22" y="52" width="56" height="3" rx="1" fill="#7a5533" />
      <rect x="22" y="70" width="56" height="3" rx="1" fill="#7a5533" />
      <rect x="22" y="46" width="2.5" height="41" fill="#5c3f26" /><rect x="75.5" y="46" width="2.5" height="41" fill="#5c3f26" />
      <rect x="22" y="44" width="56" height="2.5" rx="1" fill="#8a6440" />
      {show.map((s, i) => {
        const row = i < 5 ? 0 : 1; const col = i % 5;
        const cx = 30 + col * 10, cy = row === 0 ? 47 : 64.5;
        const fill = Math.max(0.15, s.remainingGrams / s.initialGrams);
        return (
          <g key={s.id}>
            <ellipse cx={cx} cy={cy} rx="4.6" ry="5.4" fill="#1d1d22" />
            <ellipse cx={cx} cy={cy} rx={4.6 * fill} ry={5.4 * fill} fill={s.colorHex} stroke="rgba(255,255,255,.35)" strokeWidth=".5" />
            <ellipse cx={cx} cy={cy} rx="1.3" ry="1.5" fill="#0a0a0c" />
          </g>
        );
      })}
      <rect x="28" y="77" width="12" height="9" rx="1.5" fill="#8a6440" /><rect x="44" y="77" width="12" height="9" rx="1.5" fill="#8a6440" /><rect x="60" y="77" width="12" height="9" rx="1.5" fill="#8a6440" />
    </svg>
  );
}

export function WetterProp({ data }: { data?: WeatherData }) {
  const icon = data ? wmo(data.current.code).icon : 'teils';
  const isDay = data?.current.isDay ?? true;
  return (
    <svg viewBox="0 0 100 100" className="prop" preserveAspectRatio="none">
      <rect x="48.6" y="34" width="2.8" height="53" fill="#3a3f47" />
      <rect x="40" y="40" width="20" height="1.8" fill="#4a5059" />
      <circle cx="40" cy="40" r="2.2" fill="#9aa3ad" /><circle cx="60" cy="40" r="2.2" fill="#9aa3ad" />
      <path d="M50 34 l9 3 -9 3z" fill="#ffbd6b" />
      <rect x="44" y="56" width="12" height="8" rx="1.5" fill="#2b3038" stroke="#8d96a1" strokeWidth=".6" />
      <ellipse cx="50" cy="87" rx="9" ry="2.4" fill="rgba(0,0,0,.3)" />
      <rect x="24" y="74" width="20" height="12" rx="1.5" fill="#1b2a44" stroke="#7cc6ff" strokeWidth=".6" />
      <path d="M26 76.5 h16 M26 79.5 h16 M26 82.5 h16" stroke="#7cc6ff" strokeWidth=".5" opacity=".6" />
      {icon === 'sonne' || icon === 'teils' ? <circle cx="74" cy="34" r={isDay ? 5.5 : 4} fill={isDay ? '#ffe08a' : '#dfe9ff'} style={{ filter: 'drop-shadow(0 0 6px rgba(255,220,120,.9))' }} /> : null}
      {icon !== 'sonne' ? <path d="M66 44a5.5 5.5 0 0 1 .8-10.9A7 7 0 0 1 80 35a4.7 4.7 0 0 1-.8 9z" fill="#ffffff" opacity=".92" /> : null}
      {icon === 'regen' || icon === 'schauer' || icon === 'gewitter' ? <path d="M68 45l-2 5M74 45l-2 5M80 45l-2 5" stroke="#7cc6ff" strokeWidth="1.4" strokeLinecap="round" /> : null}
      {icon === 'schnee' ? <path d="M68 47h.1M74 49h.1M80 47h.1" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" /> : null}
    </svg>
  );
}

export function PrinterProp({ name, progress, busy }: { name: string; progress: number; busy: boolean }) {
  return (
    <svg viewBox="0 0 100 100" className="prop" preserveAspectRatio="none">
      <rect x="32" y="48" width="36" height="38" rx="3" fill="#2b2f36" stroke="#5a6068" strokeWidth=".8" />
      <rect x="36" y="53" width="28" height="22" rx="1.5" fill="#101418" />
      <rect x="37" y="54" width="26" height="20" rx="1" fill="#1a2a3a" opacity={busy ? 1 : .5} />
      {busy ? <rect x="43" y={72 - 14 * progress} width="14" height={14 * progress} fill="#dfe9ff" opacity=".9" /> : null}
      <rect x="40" y="56" width="20" height="1.4" fill={busy ? '#7cc6ff' : '#444'} />
      <rect x="34" y="78" width="32" height="5" rx="1" fill="#1b1f25" />
      <circle cx="64" cy="81" r="1.2" fill={busy ? '#4ccf7a' : '#8a8f96'} />
      <text x="50" y="92" fontSize="6" textAnchor="middle" fill="#fff" fontWeight="700">{name}</text>
      <rect x="31" y="46" width="38" height="2.5" rx="1" fill="#3a3f47" />
      <ellipse cx="50" cy="87" rx="20" ry="3" fill="rgba(0,0,0,.3)" />
    </svg>
  );
}
