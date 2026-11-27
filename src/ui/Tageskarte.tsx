import { useId, useLayoutEffect, useRef } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { greeting, quoteOfDay, sameDay } from '../lib/time';
import { fmtLongDate, fmtTime, fmtNum } from '../lib/format';
import { todayDaily, wmo } from '../lib/weather';
import { resolveSeason, SEASON_META, daysUntilNextSeason, type Season } from '../lib/season';
import { sunTurn } from '../lib/sun';
import { WetterBild } from './WetterBild';
import { wmo as wmoKind } from '../lib/weather';
import { ASSET_VERSION } from '../scene/Island';

/** The living sky behind the card: one short silent loop per kind of weather (the user's films, public/img/wetter/himmel-<kind>.mp4
 *  with a still picture .webp of its first frame; made by scripts/optimize-himmel.mjs). Kinds without a film keep the drawn
 *  picture (WetterBild). Where motion is not wanted only the still picture shows (CSS, block „Wetterbild“). */
const HIMMEL = new Set<string>(['sonne', 'teils', 'wolke', 'nebel', 'regen', 'schnee', 'gewitter', 'nacht', 'nacht-teils']);
export const himmelKind = (code: number, isDay: boolean): string | null => {
  const i = wmoKind(code).icon; const k = i === 'schauer' ? 'regen' : i === 'sonne' && !isDay ? 'nacht' : i === 'teils' && !isDay ? 'nacht-teils' : ['sonne', 'teils', 'wolke', 'nebel', 'regen', 'schnee'].includes(i) ? i : 'gewitter';
  return HIMMEL.has(k) ? k : null;
};
export function Himmel({ kind }: { kind: string }) {
  const src = `/img/wetter/himmel-${kind}`;
  const film = (cls: string) => <video key={cls + kind} className={cls} src={`${src}.mp4?v=${ASSET_VERSION}`} poster={`${src}.webp?v=${ASSET_VERSION}`} autoPlay muted loop playsInline preload="auto" disablePictureInPicture onError={(e) => { e.currentTarget.style.display = 'none'; }} />;
  return <div className="tk-himmel" aria-hidden>{film('tk-himmel__weit')}</div>;
}
import { ISun, ISparkle, ISnow, IEnergy } from './Icons';

const ILeaf = (p: React.SVGProps<SVGSVGElement>) => <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="ico" {...p}><path d="M5 19c0-9 5-14 15-14 0 10-5 15-14 14"/><path d="M5 19 14 10"/></svg>;
const SEASON_ICON: Record<Season, (p: React.SVGProps<SVGSVGElement>) => React.ReactNode> = { fruehling: ISparkle, sommer: ISun, herbst: ILeaf, winter: ISnow };
/** Fraction of the day (0–1) of an ISO time or Date. */
const dayFrac = (t: string | Date) => { const d = typeof t === 'string' ? new Date(t) : t; return (d.getHours() * 60 + d.getMinutes()) / 1440; };

/** The day as a curve (24 hours from left to right): the sun's way rises from sunrise to its height at noon and sinks to sunset;
 *  the field under it is lit hour by hour as much as the sun really shines (`marks`, from the forecast's cloud cover); the night
 *  runs on as a low line with a few stars. What is past is bright, what is to come is fainter; the sun (by night the moon) stands
 *  on the curve at the hour it is. Drawn in a fixed 320 x 66 field that scales with the card. Rules `.tb*` in global.css. */
function Tagesbogen({ rise, set, at, marks, flach }: { rise: number; set: number; at: number; marks?: { pos: number; color: string; sun: number }[]; flach?: boolean }) {
  const id = useId().replace(/:/g, '');
  const W = 320, H = flach ? 25 : 38, B = 12 + H, D = flach ? 5 : 7, T = B + 16;   // width, height of the day's curve, baseline, depth of the night's curve below it, total height (flach: the desktop's lower card)
  const day = at >= rise && at <= set;
  const y = (f: number) => (f >= rise && f <= set ? B - H * Math.sin(Math.PI * (f - rise) / (set - rise)) : B + D * Math.sin(Math.PI * (f < rise ? (f + 1 - set) : (f - set)) / (1 - (set - rise))));
  const line = (a: number, b: number) => { const n = Math.max(2, Math.round((b - a) * 96)); return Array.from({ length: n + 1 }, (_, i) => { const f = a + (b - a) * i / n; return `${i ? 'L' : 'M'}${(f * W).toFixed(1)} ${y(f).toFixed(1)}`; }).join(''); };
  const dayLine = line(rise, set), field = `${dayLine}L${(set * W).toFixed(1)} ${B}L${(rise * W).toFixed(1)} ${B}Z`;
  const stops = marks && marks.length > 1 ? marks : [{ pos: 0, color: 'rgb(255 138 60)', sun: 1 }, { pos: .2, color: 'rgb(255 204 51)', sun: 1 }, { pos: .8, color: 'rgb(255 204 51)', sun: 1 }, { pos: 1, color: 'rgb(255 138 60)', sun: 1 }];
  const x = at * W, yy = y(at);
  return (
    <svg className={`tb${day ? '' : ' tb--nacht'}`} viewBox={`0 0 ${W} ${T}`} aria-hidden>
      <defs>
        <linearGradient id={`${id}s`} gradientUnits="userSpaceOnUse" x1={rise * W} x2={set * W} y1="0" y2="0">{stops.map((m, i) => <stop key={i} offset={m.pos} stopColor={m.color} />)}</linearGradient>
        <linearGradient id={`${id}f`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".9" /><stop offset=".55" stopColor="#fff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity=".14" /></linearGradient>
        <mask id={`${id}m`}><rect x="0" y="0" width={W} height={T} fill={`url(#${id}f)`} /></mask>
        <clipPath id={`${id}p`}><rect x="0" y="0" width={x} height={T} /></clipPath>
        <filter id={`${id}g`} x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="3.2" /></filter>
        <radialGradient id={`${id}o`}><stop offset="0" stopColor="#fff" /><stop offset=".45" stopColor={day ? '#ffe9a6' : '#eef3ff'} /><stop offset="1" stopColor={day ? '#ffc247' : '#c9d8ff'} /></radialGradient>
      </defs>
      <line className="tb__grund" x1="0" x2={W} y1={B} y2={B} />
      {[.25, .5, .75].map((f) => <line key={f} className="tb__stunde" x1={f * W} x2={f * W} y1={B - 3} y2={B + 3} />)}
      <path className="tb__nacht" d={line(0, rise)} /><path className="tb__nacht" d={line(set, 1)} />
      {[[.05, 4], [.12, -3], [.2, 5], [.86, -2], [.92, 5], [.97, 1]].filter(([f]) => f < rise - .02 || f > set + .02).map(([f, dy], i) => <circle key={i} className="tb__stern" style={{ animationDelay: `${i * -.8}s` }} cx={f * W} cy={B - 9 + dy} r={i % 2 ? .9 : 1.2} />)}
      <g className="tb__kommt"><path d={field} fill={`url(#${id}s)`} mask={`url(#${id}m)`} /><path className="tb__weg" d={dayLine} stroke={`url(#${id}s)`} /></g>
      <g clipPath={`url(#${id}p)`}><path d={field} fill={`url(#${id}s)`} mask={`url(#${id}m)`} /><path className="tb__weg tb__weg--licht" d={dayLine} stroke={`url(#${id}s)`} filter={`url(#${id}g)`} /><path className="tb__weg" d={dayLine} stroke={`url(#${id}s)`} /></g>
      <circle className="tb__fuss" cx={rise * W} cy={B} r="2.6" /><circle className="tb__fuss" cx={set * W} cy={B} r="2.6" />
      <line className="tb__lot" x1={x} x2={x} y1={Math.min(yy, B) + 7} y2={Math.max(yy, B)} />
      <g className="tb__jetzt" transform={`translate(${x.toFixed(1)} ${yy.toFixed(1)})`}><circle className="tb__hof" r="13" fill={day ? '#ffcf66' : '#b9ccff'} /><circle r="6.2" fill={`url(#${id}o)`} /></g>
    </svg>
  );
}

/**
 * The card of the day, shared by the phone's start tab and the desktop start world: greeting, clock, date, weather, daylight track
 * over 24 hours, season and solar window, quote – one sheet instead of loose lines over the scene.
 * `variant="mobil"`: a `.glass.m-card` with `.m-row` tiles (the phone's blocks of the Wasser-Look: Becken, Mulde).
 * `variant="desktop"`: a `.glass.panel` with `.item` tiles (the desktop's blocks), meant for a `PanelColumn`; it also carries the
 * sentence of the day that used to hang loose under the weather on the right. The quote of the day is not in it on the desktop:
 * there it has a field of its own at the right edge (`src/ui/Spruchfeld.tsx`). Below the daylight track: the next change of light.
 * Rules: block „Tageskarte“ in `src/styles/global.css` (`.tk*`); the phone's own spacing stays in `mobile.css` (`.m-today`).
 */
export function Tageskarte({ now, pvStart, variant }: { now: Date; pvStart?: string; variant: 'mobil' | 'desktop' }) {
  const { settings, weather } = useStore(useShallow((st) => ({ settings: st.settings, weather: st.weather })));
  const desktop = variant === 'desktop';
  const cur = weather?.data.hourly.length ? weather.data.current : undefined;
  const today = todayDaily(weather?.data, now);
  const season = resolveSeason(settings.season, now);
  const SeasonIcon = SEASON_ICON[season];
  const days = daysUntilNextSeason(now);
  const [hh, mm] = fmtTime(now).split(':');
  const [weekday, ...rest] = fmtLongDate(now).split(', ');
  const turn = sunTurn(weather?.data, now);   // "Sonnenuntergang in …": the same helper as the ring and the weather panels
  const rise = today ? dayFrac(today.sunrise) : 0; const set = today ? dayFrac(today.sunset) : 0;
  const himmel = cur ? himmelKind(cur.code, cur.isDay) : null;
  // how much sun really comes through, hour by hour between sunrise and sunset (from the cloud cover of the forecast):
  // the light of the daylight track is painted with it - gold where the sun shines, grey-blue under clouds, blue where it rains
  const sunny = (() => {
    if (!today || !weather?.data.hourly.length || set <= rise) return null;
    const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const stops: string[] = []; const marks: { pos: number; color: string; sun: number }[] = []; let hours = 0;
    for (const h of weather.data.hourly) {
      const d = new Date(h.time); if (!sameDay(d, now)) continue;
      const f = (d.getHours() + .5) / 24; if (f < rise - .5 / 24 || f > set + .5 / 24) continue;
      const sun = Math.max(0, Math.min(1, 1 - (h.cloud ?? 0) / 100)); const pos = Math.max(0, Math.min(1, (f - rise) / (set - rise)));
      const low = Math.min(1, Math.min(pos, 1 - pos) / .16);   // near sunrise and sunset the light is warmer and lower
      // the colours: full sun is a strong gold (orange near sunrise and sunset), half sun a pale straw yellow, clouds a cool
      // grey-blue, rain a clear blue - so the day can be read from the curve at a glance
      const gold = mix([255, 138, 60], [255, 204, 51], low); const straw = mix([232, 196, 150], [233, 222, 170], low);
      const dry = sun >= .5 ? mix(straw, gold, (sun - .5) * 2) : mix([118, 134, 160], straw, sun * 2);
      const c = h.precip > 0.05 ? mix([64, 140, 235], [110, 170, 240], sun) : dry;
      stops.push(`rgb(${c.join(' ')}) ${(pos * 100).toFixed(1)}%`); marks.push({ pos, color: `rgb(${c.join(' ')})`, sun });
      if (f >= rise && f <= set) hours += sun;
    }
    return stops.length > 1 ? { marks, hours: Math.round(hours * 2) / 2 } : null;
  })();
  // Desktop: the column of the card is only as high as the stage leaves above the islands, and on a low window (a laptop, a
  // zoomed browser) that is less than the card needs. It never scrolls and never cuts: its contents are laid out wider and
  // shown smaller (CSS zoom) until they fit.
  const fitBody = useRef<HTMLDivElement>(null), fitInner = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const body = fitBody.current, inner = fitInner.current; if (!desktop || !body || !inner) return;
    const fit = () => { inner.style.zoom = '1'; const need = inner.scrollHeight, have = body.clientHeight; inner.style.zoom = need > have + 1 ? String(Math.max(.55, have / need)) : '1'; };
    fit(); const ro = new ResizeObserver(fit); ro.observe(body); return () => ro.disconnect();
  });
  const tile = desktop ? 'item tk-fact' : 'm-row tk-fact';
  const motto = !desktop || !cur ? null : cur.precip > 0 ? 'Drinnen ist heute Werkstatt-Wetter.' : pvStart ? 'Ein guter Tag für neue Projekte.' : 'Ein ruhiger Tag zum Planen.';
  const inner = (
    <>
      <div className="tk__top">
        <div className="tk__time">
          <span className="tk__hello">{greeting(now)}{settings.userName ? `, ${settings.userName}` : ''}</span>
          <b className="tk__clock">{hh}<i>:</i>{mm}</b>
          <span className="tk__date"><b>{weekday}</b><span>{rest.join(', ')}</span></span>
        </div>
        <div className="tk__wx">
          {cur ? <>{desktop ? null : himmel ? <span className="tk__luft" /> : <WetterBild code={cur.code} isDay={cur.isDay} width={88} />}<div className="tk__temp">{desktop ? <WetterBild code={cur.code} isDay={cur.isDay} width={46} /> : null}<b>{fmtNum(cur.temp)} °C</b></div><span className="small">{wmo(cur.code).label}</span><span className="xs muted">{[settings.location.name.split(',')[0], 'Open-Meteo'].filter(Boolean).join(' · ')}</span>{motto ? <p className="tk__motto">{motto}</p> : null}</> : <span className="muted small">{weather?.error ? 'Wetter nicht verfügbar' : 'Wetter …'}</span>}
        </div>
      </div>
      {today ? (
        <div className={`tk-day${turn ? ' tk-day--turn' : ''}`} role="img" aria-label={`Tageslicht von ${fmtTime(today.sunrise)} bis ${fmtTime(today.sunset)} Uhr${turn ? `, ${turn.text}` : ''}${sunny ? `, heute etwa ${fmtNum(sunny.hours, 1)} Stunden Sonne` : ''}`}>
          <Tagesbogen rise={rise} set={set} at={dayFrac(now)} marks={sunny?.marks} flach={desktop} />
          <span className="tk-day__lbl" style={{ left: `${rise * 100}%` }}>↑ {fmtTime(today.sunrise)}</span>
          <span className="tk-day__lbl" style={{ left: `${set * 100}%` }}>↓ {fmtTime(today.sunset)}</span>
          {turn ? <span className="tk-day__turn" aria-hidden>{turn.text}{sunny ? <span className="tk-day__sun"> · ≈ {fmtNum(sunny.hours, sunny.hours % 1 ? 1 : 0)} h Sonne</span> : null}</span> : null}
        </div>
      ) : null}
      <div className="tk-facts">
        <div className={tile}><SeasonIcon /><div><b>{SEASON_META[season].label}</b><span>{SEASON_META[season].next} in {days} {days === 1 ? 'Tag' : 'Tagen'}</span></div></div>
        {cur ? <div className={tile}><IEnergy /><div><b>Solarfenster</b><span>{pvStart ? `${sameDay(new Date(pvStart), now) ? 'heute' : 'morgen'} ab ${fmtTime(pvStart)}` : 'keines in 48 h'}</span></div></div> : null}
      </div>
      {settings.showQuote && !desktop ? <p className="tk__quote">„{quoteOfDay(now)}“</p> : null}
    </>
  );
  return desktop
    ? <section className={`glass panel tk tk--desk${himmel ? ' tk--himmel' : ''}`} aria-label="Heute">{himmel ? <Himmel kind={himmel} /> : null}<div className="panel__body" ref={fitBody}><div className="tk__fit" ref={fitInner}>{inner}</div></div></section>
    : <section className={`glass m-card m-today tk${himmel ? ' tk--himmel' : ''}`}>{himmel ? <Himmel kind={himmel} /> : null}{inner}</section>;
}
