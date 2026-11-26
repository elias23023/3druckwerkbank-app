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
    const stops: string[] = []; let hours = 0;
    for (const h of weather.data.hourly) {
      const d = new Date(h.time); if (!sameDay(d, now)) continue;
      const f = (d.getHours() + .5) / 24; if (f < rise - .5 / 24 || f > set + .5 / 24) continue;
      const sun = Math.max(0, Math.min(1, 1 - (h.cloud ?? 0) / 100)); const pos = Math.max(0, Math.min(1, (f - rise) / (set - rise)));
      const low = Math.min(1, Math.min(pos, 1 - pos) / .16);   // near sunrise and sunset the light is warmer and lower
      const bright = mix([255, 150, 84], [255, 226, 122], low); const top = mix(bright, [255, 246, 204], sun * low * .6);
      const c = h.precip > 0.05 ? mix([88, 122, 168], [120, 138, 164], sun) : mix([124, 134, 152], top, Math.pow(sun, .8));
      stops.push(`rgb(${c.join(' ')}) ${(pos * 100).toFixed(1)}%`);
      if (f >= rise && f <= set) hours += sun;
    }
    return stops.length > 1 ? { css: `linear-gradient(90deg, ${stops.join(', ')})`, hours: Math.round(hours * 2) / 2 } : null;
  })();
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
          <div className="tk-day__track"><i className="tk-day__light" style={{ left: `${rise * 100}%`, width: `${Math.max(0, set - rise) * 100}%`, ...(sunny ? { backgroundImage: sunny.css } : null) }} /><i className={`tk-day__now${cur && !cur.isDay ? ' tk-day__now--nacht' : ''}`} style={{ left: `${dayFrac(now) * 100}%` }} /></div>
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
    ? <section className={`glass panel tk tk--desk${himmel ? ' tk--himmel' : ''}`} aria-label="Heute">{himmel ? <Himmel kind={himmel} /> : null}<div className="panel__body">{inner}</div></section>
    : <section className={`glass m-card m-today tk${himmel ? ' tk--himmel' : ''}`}>{himmel ? <Himmel kind={himmel} /> : null}{inner}</section>;
}
