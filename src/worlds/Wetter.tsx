import { useMemo } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useNow, hourOf } from '../lib/time';
import { fmtDayShort, fmtDuration, fmtNum, fmtTime, relTime } from '../lib/format';
import { bestPvWindow, dryWindow, pvKw, todayDaily, wmo } from '../lib/weather';
import { Panel, Stat } from '../ui/Glass';
import { WeatherIcon } from '../ui/WeatherIcon';
import { ISun, IClock, ICal, IEnergy, IRefresh, IWind, IDrop } from '../ui/Icons';

export function Wetter() {
  const now = useNow(1000);
  const { weather, settings, prints } = useStore(useShallow((s) => ({ weather: s.weather, settings: s.settings, prints: s.prints })));
  const setWeather = useStore((s) => s.setWeather);
  const d = weather?.data; const cur = d?.current; const today = todayDaily(d, now);
  const hours = useMemo(() => (d?.hourly ?? []).filter((h) => new Date(h.time).getTime() >= now.getTime() - 3600_000).slice(0, 24), [d, now]);
  const maxPv = Math.max(0.01, ...hours.map((h) => pvKw(h.ghi, settings.pvKwp)));
  const queued = prints.filter((p) => p.status === 'wartend');
  const dur = Math.max(2, Math.ceil((queued[0]?.estimatedMinutes ?? 120) / 60));
  const pv = d?.hourly.length ? bestPvWindow(d.hourly, settings.pvKwp, dur, now) : null;
  const dry = d?.hourly.length ? dryWindow(d.hourly, 3, now) : null;
  const refresh = () => { if (weather) setWeather({ ...weather, fetchedAt: new Date(0).toISOString() }); };
  const sunX = today ? ((now.getHours() + now.getMinutes() / 60 - hourOf(today.sunrise)) / Math.max(0.1, hourOf(today.sunset) - hourOf(today.sunrise))) : 0.5;

  return (
    <>
      <div className="world-title"><h1>Wetter</h1><p>Aktuell. Präzise. Lokal.</p></div>

      <Panel title="Aktuell" icon={<ISun />} style={{ left: '3.2%', top: '24%', width: '22%' }} delay={60}
        foot={<><span className="xs faint">Quelle: Open-Meteo{weather ? ` · ${relTime(weather.fetchedAt, now.getTime())}` : ''}</span><button className="btn btn--sm btn--ghost" style={{ marginLeft: 'auto' }} onClick={refresh} title="Aktualisieren"><IRefresh width={13} height={13} /></button></>}>
        {cur && d?.hourly.length ? (
          <>
            <div className="row"><WeatherIcon code={cur.code} isDay={cur.isDay} size={44} /><div className="col"><b style={{ fontSize: 32, lineHeight: 1 }}>{fmtNum(cur.temp, 1)} °C</b><span className="small muted">{wmo(cur.code).label}</span></div></div>
            <div className="grid2 small">
              <span className="row" style={{ gap: 5 }}><IWind width={14} height={14} />{fmtNum(cur.wind)} km/h</span><span className="row" style={{ gap: 5 }}><IDrop width={14} height={14} />{cur.humidity} % Luftfeuchte</span>
              <span className="muted">Gefühlt {fmtNum(cur.feels)} °C</span><span className="muted">Bewölkung {cur.cloud} %</span>
            </div>
            <p className="xs muted">{settings.location.name} · Stand {fmtTime(cur.time)}</p>
          </>
        ) : <p className="muted small">{weather?.error ? `Wetter nicht verfügbar (${weather.error}).` : 'Wetter wird geladen …'}</p>}
      </Panel>

      <Panel title="Tageslicht" icon={<IClock />} style={{ left: '3.2%', top: '58%', width: '22%' }} delay={120}>
        {today ? (
          <>
            <svg className="sunarc" viewBox="0 0 200 70">
              <path d="M10 60 Q100 -30 190 60" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2" strokeDasharray="3 4" />
              <path d="M10 60 Q100 -30 190 60" fill="none" stroke="#ffbd6b" strokeWidth="2" pathLength={1} strokeDasharray={`${Math.max(0, Math.min(1, sunX))} 1`} />
              {sunX >= 0 && sunX <= 1 ? <circle cx={10 + sunX * 180} cy={60 - 4 * (1 - (2 * sunX - 1) ** 2) * 22.5} r="5" fill="#ffe08a" style={{ filter: 'drop-shadow(0 0 6px rgba(255,220,120,.9))' }} /> : null}
              <text x="10" y="69" fontSize="8" fill="rgba(255,255,255,.7)">{fmtTime(today.sunrise)}</text><text x="190" y="69" fontSize="8" fill="rgba(255,255,255,.7)" textAnchor="end">{fmtTime(today.sunset)}</text>
            </svg>
            <div className="grid2"><Stat value={fmtDuration(today.daylightSec / 60)} label="Tageslicht" /><Stat value={`${fmtNum(today.ghiSum, 1)} MJ/m²`} label="Einstrahlung heute" /></div>
          </>
        ) : <p className="muted small">–</p>}
      </Panel>

      <Panel title="Nächste 24 Stunden" icon={<IClock />} style={{ left: '27%', bottom: '11%', width: '46%' }} delay={100} right={<span className="xs faint">Balken: Solarstrom-Schätzung ({settings.pvKwp} kWp)</span>}>
        <div className="hours">
          {hours.map((h, i) => (
            <div key={h.time} className={`hour${i === 0 ? ' now' : ''}`} title={`${wmo(h.code).label}, ${h.precipProb} % Regen, ${fmtNum(pvKw(h.ghi, settings.pvKwp), 1)} kW PV (Schätzung)`}>
              <span className="muted">{i === 0 ? 'jetzt' : fmtTime(h.time)}</span>
              <WeatherIcon code={h.code} isDay={h.isDay} size={18} />
              <b>{fmtNum(h.temp)}°</b>
              <span className="muted" style={{ color: h.precipProb >= 50 ? '#9fd4ff' : undefined }}>{h.precipProb} %</span>
              <div className="pvbar"><i style={{ height: `${(pvKw(h.ghi, settings.pvKwp) / maxPv) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="7 Tage" icon={<ICal />} style={{ right: '3.2%', top: '24%', width: '24%' }} delay={140}>
        <div className="days">
          {(d?.daily ?? []).map((day, i) => <div key={day.date}><span className="muted">{i === 0 ? 'Heute' : fmtDayShort(day.date)}</span><WeatherIcon code={day.code} size={18} /><span className="xs muted ellipsis">{wmo(day.code).label}</span><span><b>{fmtNum(day.tmax)}°</b> <span className="muted">{fmtNum(day.tmin)}°</span></span><span className="xs muted" style={{ textAlign: 'right' }}>{fmtNum(day.precipSum, 1)} mm</span></div>)}
        </div>
      </Panel>

      <Panel title="Zeitfenster" icon={<IEnergy />} style={{ right: '3.2%', top: '62%', width: '24%' }} delay={200}>
        {pv ? <div className="col" style={{ gap: 2 }}><b className="small">Druck mit Solarstrom</b><span className="small">{fmtTime(pv.start)}–{fmtTime(new Date(new Date(pv.end).getTime() + 3600_000))} Uhr ({fmtDayShort(pv.start)}), ≈ {fmtNum(pv.kwh, 1)} kWh</span><span className="xs muted">für {queued[0] ? `„${queued[0].name}“ (${fmtDuration(queued[0].estimatedMinutes)})` : `einen ${dur}-h-Druck`}, gesamte Druckdauer berücksichtigt</span></div> : <p className="small muted">Kein gutes Solarfenster in 48 h.</p>}
        {dry ? <div className="col" style={{ gap: 2 }}><b className="small">Trocken & windstill für Außenarbeit</b><span className="small">{fmtDayShort(dry.start)} {fmtTime(dry.start)}–{fmtTime(new Date(new Date(dry.end).getTime() + 3600_000))} Uhr</span></div> : <p className="small muted">Kein trockenes Tagesfenster in Sicht.</p>}
        <span className="pill pill--warn xs" style={{ alignSelf: 'flex-start' }}>PV-Werte sind Schätzungen aus Globalstrahlung</span>
      </Panel>
    </>
  );
}
