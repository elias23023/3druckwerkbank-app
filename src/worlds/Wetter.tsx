import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useNow, hourOf } from '../lib/time';
import { fmtDayShort, fmtDuration, fmtNum, fmtTime, relTime } from '../lib/format';
import { bestPvWindow, bestHours, comfort, dryWindow, pvKw, todayDaily, weatherAlerts, wmo } from '../lib/weather';
import { resolveSeason, SEASON_META, daysUntilNextSeason } from '../lib/season';
import { Panel, Stat } from '../ui/Glass';
import { WeatherIcon } from '../ui/WeatherIcon';
import { ISun, IClock, ICal, IEnergy, IRefresh, IWind, IDrop, IThermo, IBolt, IInfo } from '../ui/Icons';

export function Wetter() {
  const now = useNow(1000);
  const { weather, settings, prints } = useStore(useShallow((s) => ({ weather: s.weather, settings: s.settings, prints: s.prints })));
  const setWeather = useStore((s) => s.setWeather);
  const [sortBy, setSortBy] = useState<'pv' | 'zeit'>('pv');
  const d = weather?.data; const cur = d?.hourly.length ? d.current : undefined; const today = todayDaily(d, now);
  const hours = useMemo(() => (d?.hourly ?? []).filter((h) => new Date(h.time).getTime() >= now.getTime() - 3600_000).slice(0, 24), [d, now]);
  const maxPv = Math.max(0.01, ...hours.map((h) => pvKw(h.ghi, settings.pvKwp)));
  const queued = prints.filter((p) => p.status === 'wartend');
  const dur = Math.max(2, Math.ceil((queued[0]?.estimatedMinutes ?? 120) / 60));
  const pv = d?.hourly.length ? bestPvWindow(d.hourly, settings.pvKwp, dur, now) : null;
  const dry = d?.hourly.length ? dryWindow(d.hourly, 3, now) : null;
  const best = useMemo(() => { const b = d?.hourly.length ? bestHours(d.hourly, settings.pvKwp, 8, now) : []; return sortBy === 'zeit' ? [...b].sort((a, c) => a.time.localeCompare(c.time)) : b; }, [d, settings.pvKwp, now, sortBy]);
  const alerts = d?.hourly.length ? weatherAlerts(d, now) : [];
  const refresh = () => { if (weather) setWeather({ ...weather, fetchedAt: new Date(0).toISOString() }); };
  const sunX = today ? ((now.getHours() + now.getMinutes() / 60 - hourOf(today.sunrise)) / Math.max(0.1, hourOf(today.sunset) - hourOf(today.sunrise))) : 0.5;
  const tmin = Math.min(...hours.map((h) => h.temp), 0), tmax = Math.max(...hours.map((h) => h.temp), 1);
  const curve = hours.map((h, i) => `${(i / Math.max(1, hours.length - 1)) * 200},${60 - ((h.temp - tmin) / Math.max(1, tmax - tmin)) * 50}`).join(' ');
  const chip = (dx: number, dy: number, icon: React.ReactNode, v: string, l: string, delay: number) => <div className="glass wchip" style={{ left: `calc(50% + ${dx}cqw)`, top: `calc(50% + ${dy}cqw)`, ['--delay' as string]: `${delay}ms` }}>{icon}<b>{v}</b><span className="muted">{l}</span></div>;

  return (
    <>
      <div className="world-title"><h1>Wetter</h1><p>Aktuell. Präzise. Lokal.</p></div>

      {cur ? (
        <>
          {chip(-23, -10, <IWind />, `${fmtNum(cur.wind)} km/h`, 'Wind', 80)}
          {chip(-19, 2, <IDrop />, `${cur.humidity} %`, 'Luftfeuchte', 140)}
          {chip(10, -16, <IThermo />, cur.pressure ? `${fmtNum(cur.pressure)} hPa` : '–', 'Luftdruck', 200)}
          {chip(16, -4, <ISun />, cur.uv !== undefined ? `UV ${fmtNum(cur.uv, 1)}` : 'UV –', 'UV-Index', 260)}
          {chip(-8, -16, <IDrop />, `${fmtNum(cur.precip, 1)} mm`, 'Niederschlag', 320)}
        </>
      ) : null}

      <Panel title="Aktuell" icon={<ISun />} style={{ left: '3.2%', top: '24%', width: '22%' }} delay={60}
        foot={<><span className="xs faint">Quelle: Open-Meteo{weather ? ` · ${relTime(weather.fetchedAt, now.getTime())}` : ''}</span><button className="btn btn--sm btn--ghost" style={{ marginLeft: 'auto' }} onClick={refresh} title="Aktualisieren"><IRefresh width={13} height={13} /></button></>}>
        {cur ? (
          <>
            <div className="row"><WeatherIcon code={cur.code} isDay={cur.isDay} size={44} /><div className="col"><b style={{ fontSize: 32, lineHeight: 1 }}>{fmtNum(cur.temp, 1)} °C</b><span className="small muted">{wmo(cur.code).label} · gefühlt {fmtNum(cur.feels)} °C</span></div></div>
            <div className="row small" style={{ gap: 10 }}><span className="pill xs">Wohlfühlfaktor {comfort(cur.temp, cur.humidity)} %</span><span className="muted">Bewölkung {cur.cloud} %</span></div>
            <p className="xs muted">{settings.location.name} · Stand {fmtTime(cur.time)}</p>
          </>
        ) : <p className="muted small">{weather?.error ? `Wetter nicht verfügbar (${weather.error}).` : 'Wetter wird geladen …'}</p>}
      </Panel>

      <Panel title="Tageslicht" icon={<IClock />} style={{ left: '3.2%', top: '53%', width: '22%' }} delay={120}>
        {today ? (
          <>
            <svg className="sunarc" viewBox="0 0 200 70">
              <path d="M10 60 Q100 -30 190 60" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="2" strokeDasharray="3 4" />
              <path d="M10 60 Q100 -30 190 60" fill="none" stroke="#ffbd6b" strokeWidth="2" pathLength={1} strokeDasharray={`${Math.max(0, Math.min(1, sunX))} 1`} />
              {sunX >= 0 && sunX <= 1 ? <circle cx={10 + sunX * 180} cy={60 - 4 * (1 - (2 * sunX - 1) ** 2) * 22.5} r="5" fill="#ffe08a" style={{ filter: 'drop-shadow(0 0 6px rgba(255,220,120,.9))' }} /> : null}
              <text x="10" y="69" fontSize="8" fill="currentColor" opacity=".8">{fmtTime(today.sunrise)}</text><text x="190" y="69" fontSize="8" fill="currentColor" opacity=".8" textAnchor="end">{fmtTime(today.sunset)}</text>
            </svg>
            <div className="grid2"><Stat value={fmtDuration(today.daylightSec / 60)} label="Tageslicht" /><Stat value={`${fmtNum(today.ghiSum, 1)} MJ/m²`} label="Einstrahlung heute" /></div>
          </>
        ) : <p className="muted small">–</p>}
      </Panel>

      <Panel title="Nächste 24 Stunden" icon={<IClock />} style={{ left: '27%', bottom: '10.5%', width: '46%' }} delay={100} right={<span className="xs faint">Kurve: Temperatur · Balken: Solarstrom-Schätzung ({settings.pvKwp} kWp)</span>}>
        {hours.length ? <svg className="tcurve" viewBox="0 0 200 70" preserveAspectRatio="none"><polyline points={curve} fill="none" stroke="#ffbd6b" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /><circle cx="0" cy={60 - ((hours[0].temp - tmin) / Math.max(1, tmax - tmin)) * 50} r="2.5" fill="#fff" /></svg> : null}
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

      <Panel title={`Jahreszeit · ${SEASON_META[resolveSeason(settings.season, now)].label}`} icon={<ISun />} style={{ left: '3.2%', bottom: '2.5%', width: '22%' }} delay={160} right={<span className="xs faint">noch {daysUntilNextSeason(now)} Tage</span>}>
        <div className="col" style={{ gap: 6 }}>{SEASON_META[resolveSeason(settings.season, now)].tips.map((t) => <span key={t} className="small">• {t}</span>)}</div>
      </Panel>
      <Panel title="7 Tage" icon={<ICal />} style={{ right: '3.2%', top: '24%', width: '24%' }} delay={140}>
        <div className="days">
          {(d?.daily ?? []).map((day, i) => <div key={day.date}><span className="muted">{i === 0 ? 'Heute' : fmtDayShort(day.date)}</span><WeatherIcon code={day.code} size={18} /><span className="xs muted ellipsis">{wmo(day.code).label}</span><span><b>{fmtNum(day.tmax)}°</b> <span className="muted">{fmtNum(day.tmin)}°</span></span><span className="xs muted" style={{ textAlign: 'right' }}>{fmtNum(day.precipSum, 1)} mm</span></div>)}
        </div>
      </Panel>

      <Panel title="Beste Stunden & Zeitfenster" icon={<IEnergy />} right={<div className="tabs" style={{ padding: 2 }}><button className={sortBy === 'pv' ? 'on' : ''} style={{ padding: '2px 8px' }} onClick={() => setSortBy('pv')}>nach PV</button><button className={sortBy === 'zeit' ? 'on' : ''} style={{ padding: '2px 8px' }} onClick={() => setSortBy('zeit')}>nach Zeit</button></div>} style={{ right: '3.2%', top: '53%', width: '24%', maxHeight: '36%' }} delay={200}>
        {best.length ? <div className="pills">{best.map((h) => <span key={h.time} className={`pill xs ${h.q === 'sehr gut' ? 'pill--ok' : h.q === 'gut' ? 'pill--acc' : ''}`} title={h.q}>{fmtDayShort(h.time)} {fmtTime(h.time)} · {fmtNum(h.kw, 1)} kW</span>)}</div> : <p className="small muted">Keine geeigneten Stunden (≥ 0,5 kW, ≤ 60 % Regen) in 48 h.</p>}
        {pv ? <div className="col" style={{ gap: 2 }}><b className="small">Druck mit Solarstrom</b><span className="small">{fmtTime(pv.start)}–{fmtTime(new Date(new Date(pv.end).getTime() + 3600_000))} Uhr ({fmtDayShort(pv.start)}), ≈ {fmtNum(pv.kwh, 1)} kWh</span><span className="xs muted">für {queued[0] ? `„${queued[0].name}“ (${fmtDuration(queued[0].estimatedMinutes)})` : `einen ${dur}-h-Druck`}, gesamte Druckdauer berücksichtigt</span></div> : null}
        {dry ? <div className="col" style={{ gap: 2 }}><b className="small">Trocken & windstill für Außenarbeit</b><span className="small">{fmtDayShort(dry.start)} {fmtTime(dry.start)}–{fmtTime(new Date(new Date(dry.end).getTime() + 3600_000))} Uhr</span></div> : null}
        {alerts.map((al, i) => <div key={i} className={`alert ${al.level}`}>{al.level === 'warn' ? <IBolt width={16} height={16} style={{ color: '#ffb547', flex: 'none' }} /> : <IInfo width={16} height={16} style={{ color: '#7cc6ff', flex: 'none' }} />}<div className="col" style={{ gap: 0 }}><b className="small">{al.title}</b><span className="xs muted">{al.detail}</span></div></div>)}
        <span className="pill pill--warn xs" style={{ alignSelf: 'flex-start' }}>PV = kWp × Einstrahlung / 1000 × 0,82 · Schätzung</span>
      </Panel>
      <div className="hand hand--tr">{'Ideen wachsen\nbei jedem Wetter.'}</div>
    </>
  );
}
