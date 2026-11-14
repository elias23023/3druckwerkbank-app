import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { greeting, quoteOfDay, sameDay } from '../lib/time';
import { fmtLongDate, fmtTime, fmtNum } from '../lib/format';
import { todayDaily, wmo } from '../lib/weather';
import { resolveSeason, SEASON_META, daysUntilNextSeason, type Season } from '../lib/season';
import { WeatherIcon } from './WeatherIcon';
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
 * sentence of the day that used to hang loose under the weather on the right.
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
  const rise = today ? dayFrac(today.sunrise) : 0; const set = today ? dayFrac(today.sunset) : 0;
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
          {cur ? <><div className="tk__temp"><WeatherIcon code={cur.code} isDay={cur.isDay} size={desktop ? 26 : 30} /><b>{fmtNum(cur.temp)} °C</b></div><span className="small">{wmo(cur.code).label}</span><span className="xs muted">{[settings.location.name.split(',')[0], 'Open-Meteo'].filter(Boolean).join(' · ')}</span>{motto ? <p className="tk__motto">{motto}</p> : null}</> : <span className="muted small">{weather?.error ? 'Wetter nicht verfügbar' : 'Wetter …'}</span>}
        </div>
      </div>
      {today ? (
        <div className="tk-day" role="img" aria-label={`Tageslicht von ${fmtTime(today.sunrise)} bis ${fmtTime(today.sunset)} Uhr`}>
          <div className="tk-day__track"><i className="tk-day__light" style={{ left: `${rise * 100}%`, width: `${Math.max(0, set - rise) * 100}%` }} /><i className="tk-day__now" style={{ left: `${dayFrac(now) * 100}%` }} /></div>
          <span className="tk-day__lbl" style={{ left: `${rise * 100}%` }}>↑ {fmtTime(today.sunrise)}</span>
          <span className="tk-day__lbl" style={{ left: `${set * 100}%` }}>↓ {fmtTime(today.sunset)}</span>
        </div>
      ) : null}
      <div className="tk-facts">
        <div className={tile}><SeasonIcon /><div><b>{SEASON_META[season].label}</b><span>{SEASON_META[season].next} in {days} {days === 1 ? 'Tag' : 'Tagen'}</span></div></div>
        {cur ? <div className={tile}><IEnergy /><div><b>Solarfenster</b><span>{pvStart ? `${sameDay(new Date(pvStart), now) ? 'heute' : 'morgen'} ab ${fmtTime(pvStart)}` : 'keines in 48 h'}</span></div></div> : null}
      </div>
      {settings.showQuote ? <p className="tk__quote">„{quoteOfDay(now)}“</p> : null}
    </>
  );
  return desktop
    ? <section className="glass panel tk tk--desk" aria-label="Heute"><div className="panel__body">{inner}</div></section>
    : <section className="glass m-card m-today tk">{inner}</section>;
}
