import { useMemo } from 'react';
import { useStore, printProgress, printRemainingMin, availableGrams } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useNow, greeting, quoteOfDay, sameDay, type DayPhase } from '../lib/time';
import { fmtDuration, fmtNum, fmtTime, relTime, fmtGrams } from '../lib/format';
import { bestPvWindow, todayDaily, wmo, dryWindow } from '../lib/weather';
import { Panel, Check, Progress } from '../ui/Glass';
import { WeatherIcon } from '../ui/WeatherIcon';
import { ICal, ICheck, IEnergy, IPlay, IPrinter, ISun, IWind, IDrop, ISkip, ISpool, IWrench, IClock, ICube } from '../ui/Icons';
import { navigate } from '../router';

export function Heute({ phase }: { phase: DayPhase }) {
  const now = useNow(1000);
  const { tasks, prints, projects, devices, appointments, settings, weather, spools } = useStore(useShallow((s) => ({ tasks: s.tasks, prints: s.prints, projects: s.projects, devices: s.devices, appointments: s.appointments, settings: s.settings, weather: s.weather, spools: s.spools })));
  const toggleTask = useStore((s) => s.toggleTask); const skipTask = useStore((s) => s.skipTask); const startNextPrint = useStore((s) => s.startNextPrint); const openSheet = useStore((s) => s.openSheet); const toggleMaintenance = useStore((s) => s.toggleMaintenance);
  const today = todayDaily(weather?.data, now);
  const open = tasks.filter((t) => !t.done && !t.skipped).sort((a, b) => a.order - b.order);
  const running = prints.filter((p) => p.status === 'läuft');
  const queued = prints.filter((p) => p.status === 'wartend').sort((a, b) => a.queueOrder - b.queueOrder);
  const printers = devices.filter((d) => d.kind === 'drucker');
  const pname = (id?: string) => projects.find((p) => p.id === id)?.name;

  const pv = useMemo(() => (weather?.data.hourly.length ? bestPvWindow(weather.data.hourly, settings.pvKwp, 3, now) : null), [weather, settings.pvKwp, now]);
  const dry = useMemo(() => (weather?.data.hourly.length ? dryWindow(weather.data.hourly, 3, now) : null), [weather, now]);
  const cur = weather?.data.hourly.length ? weather.data.current : undefined;
  const nextHours = (weather?.data.hourly ?? []).filter((h) => new Date(h.time).getTime() >= now.getTime() - 3600_000).slice(0, 6);
  const rainSoon = nextHours.find((h) => h.precipProb >= 50);
  const upcoming = appointments.filter((a) => new Date(a.at).getTime() > now.getTime() - 3600_000).sort((a, b) => a.at.localeCompare(b.at)).slice(0, 2);
  const due = devices.flatMap((d) => d.maintenance.filter((m) => !m.done && new Date(m.due).getTime() < now.getTime() + 86400_000 * 3).map((m) => ({ d, m }))).sort((a, b) => a.m.due.localeCompare(b.m.due)).slice(0, 2);
  const matJob = running[0] ?? queued[0];
  const matSpool = matJob ? spools.find((s) => s.id === matJob.spoolId) : undefined;
  const windowText = pv ? (sameDay(new Date(pv.start), now) ? `Heute gutes Druckfenster` : `Morgen gutes Druckfenster`) : 'Kein Solarfenster in Sicht';

  return (
    <>
      <div className="heute-greet">
        <h1>{greeting(now)}</h1>
        <p>{settings.showQuote ? `„${quoteOfDay(now)}“` : 'Heute ist ein guter Tag, etwas zu erschaffen.'}</p>
        <p className="small faint" style={{ marginTop: 8 }}>{settings.location.name}</p>
      </div>

      <div className="heute-time"><b>{fmtTime(now)}</b><span>{phase === 'nacht' ? 'Nacht' : phase === 'tag' ? 'Tag' : phase === 'morgen' ? 'Morgen' : 'Abend'} · {open.length} offen · {running.length} Druck{running.length === 1 ? '' : 'e'} läuft</span></div>
      <div className="ring-legend"><span><i className="dot" style={{ background: '#ffd36e' }} />Tageslicht · PV</span><span><i className="dot" style={{ background: '#7cc6ff' }} />Drucke</span><span><i className="dot" style={{ background: '#4ccf7a' }} />Aufgaben</span><span><i className="dot" style={{ background: '#c59bff' }} />Termine</span><span><i className="dot" style={{ background: '#ffb547' }} />Wartung</span></div>

      <Panel title="Aktive Drucke" icon={<IPrinter />} right={<span className="pill xs">{running.length}</span>} style={{ left: '3.2%', top: '29%', width: '23%' }} delay={60}
        foot={<>{printers.map((d) => <button key={d.id} className="btn btn--sm" disabled={prints.some((p) => p.printerId === d.id && p.status === 'läuft') || !queued.some((p) => p.printerId === d.id)} onClick={() => startNextPrint(d.id)}><IPlay width={12} height={12} /> {d.name}</button>)}<button className="btn btn--sm btn--ghost" style={{ marginLeft: 'auto' }} onClick={() => navigate({ world: 'druck' })}>Alle</button></>}>
        {running.length === 0 ? <p className="muted small">Kein Druck läuft gerade.{queued[0] ? ` Nächster: ${queued[0].name}.` : ''}</p> : running.map((p) => (
          <div key={p.id} className="item item--click" onClick={() => openSheet({ kind: 'druck', printId: p.id })}>
            <div className="thumb--part"><ICube width={28} height={28} style={{ color: '#9fd4ff' }} /></div>
            <div className="grow col" style={{ gap: 4 }}>
              <div className="row row--between"><b className="small ellipsis">{p.name}</b><b className="small">{fmtNum(printProgress(p, now.getTime()) * 100)} %</b></div>
              <Progress value={printProgress(p, now.getTime()) * 100} />
              <span className="xs muted">noch {fmtDuration(printRemainingMin(p, now.getTime()))} · {devices.find((d) => d.id === p.printerId)?.name} · {spools.find((s) => s.id === p.spoolId)?.label ?? pname(p.projectId)}</span>
            </div>
          </div>
        ))}
      </Panel>

      <Panel title="Aufgaben heute" icon={<ICheck />} right={<span className="pill xs">{open.length}</span>} style={{ left: '3.2%', top: '51%', width: '23%', maxHeight: '27%' }} delay={120}>
        {open.length === 0 ? <p className="muted small">Alles erledigt. Schöner Tag.</p> : open.slice(0, 5).map((t) => (
          <div key={t.id} className="item" style={{ padding: '6px 8px' }}>
            <Check on={t.done} onClick={() => toggleTask(t.id)} />
            <div className="grow col" style={{ gap: 1 }}>
              <span className="small ellipsis">{t.title}</span>
              <span className="xs muted ellipsis">{pname(t.projectId) ?? (t.deviceId ? devices.find((d) => d.id === t.deviceId)?.name : t.kind)}{t.due ? ` · ${relTime(t.due, now.getTime())}` : ''}</span>
            </div>
            <button className="btn btn--icon btn--ghost btn--sm" title="Überspringen" onClick={() => skipTask(t.id)}><ISkip width={14} height={14} /></button>
          </div>
        ))}
      </Panel>

      <Panel title={`Wetter · ${settings.location.name.split(',')[0]}`} icon={<ISun />} style={{ right: '3.2%', top: '29%', width: '23%' }} delay={100}
        foot={<><span className="xs faint">{weather ? `Open-Meteo · ${fmtTime(weather.fetchedAt)}` : ''}</span><button className="btn btn--sm btn--ghost" style={{ marginLeft: 'auto' }} onClick={() => navigate({ world: 'wetter' })}>Mehr</button></>}>
        {cur ? (
          <>
            <div className="row"><WeatherIcon code={cur.code} isDay={cur.isDay} size={40} /><div className="col"><b style={{ fontSize: 28, lineHeight: 1 }}>{fmtNum(cur.temp)} °C</b><span className="small muted">{wmo(cur.code).label}</span></div>
              <div className="col xs muted" style={{ marginLeft: 'auto', gap: 3 }}><span className="row" style={{ gap: 4 }}><IDrop width={13} height={13} />Luftfeuchte {cur.humidity} %</span><span className="row" style={{ gap: 4 }}><IWind width={13} height={13} />Wind {fmtNum(cur.wind)} km/h</span>{today ? <span className="row" style={{ gap: 4 }}><ISun width={13} height={13} />{fmtTime(today.sunrise)}–{fmtTime(today.sunset)}</span> : null}</div></div>
            <p className="small">{rainSoon ? `Regen wahrscheinlich ab ${fmtTime(rainSoon.time)} (${rainSoon.precipProb} %).` : nextHours.length ? 'In den nächsten Stunden voraussichtlich trocken.' : ''}</p>
          </>
        ) : <p className="muted small">{weather?.error ? 'Wetter nicht verfügbar.' : 'Wetter wird geladen …'}</p>}
      </Panel>

      <Panel title="Wetterentwicklung" icon={<IClock />} style={{ right: '3.2%', top: '51%', width: '23%' }} delay={160}>
        {nextHours.length ? <div className="hours-mini">{nextHours.map((h, i) => <div key={h.time}><span className="muted">{i === 0 ? 'jetzt' : fmtTime(h.time).slice(0, 5)}</span><WeatherIcon code={h.code} isDay={h.isDay} size={16} /><b>{fmtNum(h.temp)}°</b><span className="muted" style={{ fontSize: 10 }}>{h.precipProb} %</span></div>)}</div> : <p className="muted small">–</p>}
      </Panel>

      <div className="bottom-row">
        <Panel title="Nächste Termine" icon={<ICal />} delay={200}>
          {upcoming.map((a) => <div key={a.id} className="row small"><span className="dot" style={{ background: '#c59bff' }} /><span className="muted" style={{ width: 52 }}>{sameDay(new Date(a.at), now) ? fmtTime(a.at) : 'Morgen'}</span><span className="ellipsis">{a.title}</span></div>)}
          {upcoming.length === 0 ? <p className="muted small">Keine Termine.</p> : null}
        </Panel>
        <Panel title="Materialhinweis" icon={<ISpool />} delay={240}>
          {matSpool ? <div className="row"><span className="swatch" style={{ background: matSpool.colorHex, width: 28, height: 28 }} /><div className="col grow" style={{ gap: 2 }}><b className="small">{matSpool.label}</b><span className="xs muted">{fmtGrams(availableGrams(matSpool))} frei · für {matJob?.name}</span><Progress value={(availableGrams(matSpool) / matSpool.initialGrams) * 100} /></div></div> : <p className="muted small">Kein Druck geplant.</p>}
          <button className="btn btn--sm btn--ghost" style={{ alignSelf: 'flex-start' }} onClick={() => navigate({ world: 'material' })}>Material ansehen</button>
        </Panel>
        <Panel title="Wartung" icon={<IWrench />} delay={280}>
          {due.length === 0 ? <p className="muted small">Nichts fällig.</p> : due.map(({ d, m }) => <div key={m.id} className="row small"><Check on={m.done} onClick={() => toggleMaintenance(d.id, m.id)} /><div className="col grow" style={{ gap: 0 }}><span className="ellipsis">{d.name}: {m.title}</span><span className={`xs ${new Date(m.due).getTime() < now.getTime() ? 'pill pill--warn' : 'muted'}`} style={{ alignSelf: 'flex-start' }}>{new Date(m.due).getTime() < now.getTime() ? 'überfällig' : relTime(m.due, now.getTime())}</span></div></div>)}
        </Panel>
        <Panel title="Druckfenster" icon={<IEnergy />} delay={320}>
          <div className="row"><ISun width={30} height={30} style={{ color: '#ffd77a' }} /><div className="col" style={{ gap: 1 }}><b className="small">{windowText}</b><span className="xs muted">{pv ? `ab ${fmtTime(pv.start)} Uhr · ≈ ${fmtNum(pv.kwh, 1)} kWh Solar` : dry ? `Trocken ab ${fmtTime(dry.start)}` : 'PV-Schätzung aus Globalstrahlung'}</span></div></div>
          <span className="pill pill--warn xs" style={{ alignSelf: 'flex-start' }}>Schätzung · {settings.pvKwp} kWp</span>
        </Panel>
      </div>
      <div className="hand hand--tr">{'Kleine Dinge\nkönnen Großes\nbewirken.'}</div>
    </>
  );
}
