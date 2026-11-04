import { useMemo } from 'react';
import { useStore, printProgress, printRemainingMin } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useNow, greeting, quoteOfDay, hourOf, sameDay, type DayPhase } from '../lib/time';
import { fmtDuration, fmtNum, fmtTime, relTime } from '../lib/format';
import { bestPvWindow, pvKw, todayDaily, wmo } from '../lib/weather';
import { Panel, Check, Progress } from '../ui/Glass';
import { Tagesring, type RingArc, type RingDot } from '../ui/Tagesring';
import { WeatherIcon } from '../ui/WeatherIcon';
import { ICal, ICheck, IEnergy, IPlay, IPrinter, ISun, IWind, IDrop, ISkip } from '../ui/Icons';
import { navigate } from '../router';

const PRINTER_COLORS = ['#7cc6ff', '#c59bff', '#4ccf7a'];

export function Heute({ phase }: { phase: DayPhase }) {
  const now = useNow(1000);
  const { tasks, prints, projects, devices, appointments, settings, weather } = useStore(useShallow((s) => ({ tasks: s.tasks, prints: s.prints, projects: s.projects, devices: s.devices, appointments: s.appointments, settings: s.settings, weather: s.weather })));
  const toggleTask = useStore((s) => s.toggleTask); const skipTask = useStore((s) => s.skipTask); const startNextPrint = useStore((s) => s.startNextPrint); const openSheet = useStore((s) => s.openSheet);
  const today = todayDaily(weather?.data, now);
  const sunrise = today ? hourOf(today.sunrise) : undefined; const sunset = today ? hourOf(today.sunset) : undefined;
  const open = tasks.filter((t) => !t.done && !t.skipped).sort((a, b) => a.order - b.order);
  const running = prints.filter((p) => p.status === 'läuft');
  const queued = prints.filter((p) => p.status === 'wartend').sort((a, b) => a.queueOrder - b.queueOrder);
  const printers = devices.filter((d) => d.kind === 'drucker');
  const pname = (id?: string) => projects.find((p) => p.id === id)?.name;

  const pv = useMemo(() => (weather?.data.hourly.length ? bestPvWindow(weather.data.hourly, settings.pvKwp, 3, now) : null), [weather, settings.pvKwp, now]);
  const pvHoursToday = useMemo(() => (weather?.data.hourly ?? []).filter((h) => sameDay(new Date(h.time), now) && pvKw(h.ghi, settings.pvKwp) > settings.pvKwp * 0.3), [weather, settings.pvKwp, now]);

  const arcs: RingArc[] = [];
  if (pvHoursToday.length) arcs.push({ from: hourOf(pvHoursToday[0].time), to: hourOf(pvHoursToday[pvHoursToday.length - 1].time) + 1, color: 'rgba(255,214,110,.75)', title: 'Solarstrom-Fenster (Schätzung)', r: 70 });
  prints.forEach((p) => {
    const pi = Math.max(0, printers.findIndex((d) => d.id === p.printerId));
    if (p.status === 'läuft' && p.startedAt) { const s = hourOf(p.startedAt); arcs.push({ from: s, to: s + p.estimatedMinutes / 60, color: PRINTER_COLORS[pi % 3], title: `${p.name} (läuft)`, r: 62 - pi * 7 }); }
  });
  let cursor = running[0]?.startedAt ? hourOf(running[0].startedAt) + running[0].estimatedMinutes / 60 : now.getHours() + now.getMinutes() / 60;
  queued.slice(0, 2).forEach((p) => { const pi = Math.max(0, printers.findIndex((d) => d.id === p.printerId)); arcs.push({ from: cursor, to: cursor + p.estimatedMinutes / 60, color: PRINTER_COLORS[pi % 3] + '88', title: `${p.name} (geplant)`, r: 62 - pi * 7 }); cursor += p.estimatedMinutes / 60; });
  const dots: RingDot[] = [];
  tasks.filter((t) => t.due && sameDay(new Date(t.due), now)).forEach((t) => dots.push({ hour: hourOf(t.due!), color: t.kind === 'wartung' ? '#ffb547' : '#4ccf7a', title: t.title, done: t.done }));
  appointments.filter((a) => sameDay(new Date(a.at), now)).forEach((a) => dots.push({ hour: hourOf(a.at), color: '#c59bff', title: a.title }));
  devices.forEach((d) => d.maintenance.filter((m) => !m.done && sameDay(new Date(m.due), now)).forEach((m) => dots.push({ hour: 9, color: '#ffb547', title: `${d.name}: ${m.title}` })));

  const cur = weather?.data.current;
  const nextHours = (weather?.data.hourly ?? []).filter((h) => new Date(h.time).getTime() >= now.getTime() - 3600_000).slice(0, 6);
  const rainSoon = nextHours.find((h) => h.precipProb >= 50);
  const upcoming = appointments.filter((a) => new Date(a.at).getTime() > now.getTime() - 3600_000).sort((a, b) => a.at.localeCompare(b.at)).slice(0, 3);
  const due = devices.flatMap((d) => d.maintenance.filter((m) => !m.done && new Date(m.due).getTime() < now.getTime() + 86400_000 * 2).map((m) => ({ d, m })));

  return (
    <>
      <div className="heute-greet">
        <h1>{greeting(now)}</h1>
        <p>{settings.showQuote ? `„${quoteOfDay(now)}“` : 'Heute ist ein guter Tag, etwas zu erschaffen.'}</p>
        <p className="small faint" style={{ marginTop: 8 }}>{settings.location.name}</p>
      </div>

      <div className="heute-ring">
        <Tagesring now={now} sunrise={sunrise} sunset={sunset} arcs={arcs} dots={dots} size={300}
          centre={<><b>{fmtTime(now)}</b><span>{phase === 'nacht' ? 'Nacht' : phase === 'tag' ? 'Tag' : phase === 'morgen' ? 'Morgen' : 'Abend'} · {open.length} offen · {running.length} Druck{running.length === 1 ? '' : 'e'}</span></>} />
      </div>

      <Panel title="Heute dran" icon={<ICheck />} style={{ left: '3.2%', top: '30%', width: '24%', maxHeight: '36%' }} delay={60}
        foot={<><span className="small muted">{open.length} offen</span><button className="btn btn--sm" style={{ marginLeft: 'auto' }} onClick={() => navigate({ world: 'projekte' })}>Projekte</button></>}>
        {open.length === 0 ? <p className="muted small">Alles erledigt. Schöner Tag.</p> : open.slice(0, 6).map((t) => (
          <div key={t.id} className="item">
            <Check on={t.done} onClick={() => toggleTask(t.id)} />
            <div className="grow col" style={{ gap: 1 }}>
              <span className="ellipsis">{t.title}</span>
              <span className="xs muted ellipsis">{pname(t.projectId) ?? (t.deviceId ? devices.find((d) => d.id === t.deviceId)?.name : t.kind)}{t.due ? ` · ${relTime(t.due, now.getTime())}` : ''}</span>
            </div>
            <button className="btn btn--icon btn--ghost btn--sm" title="Überspringen" onClick={() => skipTask(t.id)}><ISkip width={14} height={14} /></button>
          </div>
        ))}
      </Panel>

      <Panel title="Drucke" icon={<IPrinter />} style={{ left: '3.2%', top: '68%', width: '24%', maxHeight: '24%' }} delay={140}
        foot={<>{printers.map((d) => <button key={d.id} className="btn btn--sm" disabled={prints.some((p) => p.printerId === d.id && p.status === 'läuft') || !queued.some((p) => p.printerId === d.id)} onClick={() => startNextPrint(d.id)}><IPlay width={12} height={12} /> {d.name}</button>)}<button className="btn btn--sm btn--ghost" style={{ marginLeft: 'auto' }} onClick={() => navigate({ world: 'druck' })}>Alle</button></>}>
        {running.length === 0 ? <p className="muted small">Kein Druck läuft gerade.</p> : running.map((p) => (
          <div key={p.id} className="item item--click" onClick={() => openSheet({ kind: 'druck', printId: p.id })}>
            <div className="grow col" style={{ gap: 4 }}>
              <div className="row row--between"><span className="ellipsis">{p.name}</span><b className="small">{fmtNum(printProgress(p, now.getTime()) * 100)} %</b></div>
              <Progress value={printProgress(p, now.getTime()) * 100} />
              <span className="xs muted">{devices.find((d) => d.id === p.printerId)?.name} · noch {fmtDuration(printRemainingMin(p, now.getTime()))} · {pname(p.projectId)}</span>
            </div>
          </div>
        ))}
        {queued[0] ? <p className="xs muted">Nächster: {queued[0].name} ({fmtDuration(queued[0].estimatedMinutes)})</p> : null}
      </Panel>

      <Panel title="Wetter jetzt" icon={<ISun />} style={{ right: '3.2%', top: '30%', width: '22%' }} delay={100}
        foot={<><span className="xs faint">{weather ? `Open-Meteo · ${fmtTime(weather.fetchedAt)}` : ''}</span><button className="btn btn--sm btn--ghost" style={{ marginLeft: 'auto' }} onClick={() => navigate({ world: 'wetter' })}>Mehr</button></>}>
        {cur && weather?.data.hourly.length ? (
          <>
            <div className="row"><WeatherIcon code={cur.code} isDay={cur.isDay} size={36} /><div className="col"><b style={{ fontSize: 26, lineHeight: 1 }}>{fmtNum(cur.temp)} °C</b><span className="small muted">{wmo(cur.code).label} · gefühlt {fmtNum(cur.feels)} °C</span></div></div>
            <div className="row small muted" style={{ gap: 14 }}><span className="row" style={{ gap: 4 }}><IWind width={14} height={14} />{fmtNum(cur.wind)} km/h</span><span className="row" style={{ gap: 4 }}><IDrop width={14} height={14} />{cur.humidity} %</span>{today ? <span className="row" style={{ gap: 4 }}><ISun width={14} height={14} />{fmtTime(today.sunrise)}–{fmtTime(today.sunset)}</span> : null}</div>
            <p className="small">{rainSoon ? `Regen wahrscheinlich ab ${fmtTime(rainSoon.time)} (${rainSoon.precipProb} %).` : nextHours.length ? 'In den nächsten Stunden voraussichtlich trocken.' : ''}</p>
          </>
        ) : <p className="muted small">{weather?.error ? 'Wetter nicht verfügbar. Letzter Stand wird angezeigt, sobald vorhanden.' : 'Wetter wird geladen …'}</p>}
      </Panel>

      <Panel title="Energie-Fenster" icon={<IEnergy />} style={{ right: '3.2%', top: '53%', width: '22%' }} delay={160}>
        {pv ? (
          <>
            <p className="small"><b>{fmtTime(pv.start)}–{fmtTime(new Date(new Date(pv.end).getTime() + 3600_000))} Uhr</b>: bestes 3-h-Fenster mit ≈ {fmtNum(pv.kwh, 1)} kWh Solarstrom.</p>
            <p className="xs muted">Reicht rechnerisch für ≈ {fmtDuration((pv.kwh * 1000) / settings.printerWatts * 60)} Druckzeit bei {settings.printerWatts} W.</p>
          </>
        ) : <p className="small muted">Kein nennenswertes Solarfenster in den nächsten 48 h.</p>}
        <span className="pill pill--warn xs" style={{ alignSelf: 'flex-start' }}>Schätzung, keine Messung · {settings.pvKwp} kWp</span>
      </Panel>

      <Panel title="Termine & Wartung" icon={<ICal />} style={{ right: '3.2%', top: '73%', width: '22%', maxHeight: '19%' }} delay={220}>
        {upcoming.map((a) => <div key={a.id} className="row small"><span className="dot" style={{ background: '#c59bff' }} /><span className="muted" style={{ width: 54 }}>{sameDay(new Date(a.at), now) ? fmtTime(a.at) : 'Morgen'}</span><span className="ellipsis">{a.title}</span></div>)}
        {due.map(({ d, m }) => <div key={m.id} className="row small item--click" onClick={() => openSheet({ kind: 'geraet', deviceId: d.id })}><span className="dot" style={{ background: '#ffb547' }} /><span className="muted" style={{ width: 54 }}>{d.name}</span><span className="ellipsis">{m.title}</span></div>)}
        {upcoming.length + due.length === 0 ? <p className="muted small">Nichts anstehend.</p> : null}
      </Panel>
    </>
  );
}
