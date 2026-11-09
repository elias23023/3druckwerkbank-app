import { useMemo, useState } from 'react';
import './mobile.css';
import { useStore, availableGrams, activeProjects, archivedProjects, printProgress, printRemainingMin, liveProjects } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { navigate, useRoute } from '../router';
import { useNow, greeting, quoteOfDay, sameDay } from '../lib/time';
import { fmtLongDate, fmtTime, fmtNum, fmtGrams, fmtDuration, relTime, fmtDate, fmtDayShort } from '../lib/format';
import { NotesField } from '../forms/ProjektDetail';
import { STATUS_COLOR } from '../forms/GeraetForm';
import { bestPvWindow, todayDaily, wmo, pvKw } from '../lib/weather';
import { sceneLook, type Look } from '../scene/looks';
import { resolveSeason, SEASON_META, daysUntilNextSeason } from '../lib/season';
import { islandSrc } from '../scene/Island';
import { workspace, WORKSPACE_META } from '../lib/workspace';
import { Logo } from '../ui/TopBar';
import { Check, Progress, Stack } from '../ui/Glass';
import { WeatherIcon } from '../ui/WeatherIcon';
import { SheetHost } from '../ui/SheetHost';
import { CommandBar } from '../ui/CommandBar';
import { Toast } from '../ui/Toast';
import { useHints } from '../ui/Hinweise';
import { STAGES, type Project } from '../types';
import { IHome, IClock, IFlag, ILayers, IList, ISearch, IBolt, IGear, IUser, IPrinter, ISun, IArchive, IArrowL, IChevR, IPlus, ISkip, IPlay, ISpool, IWrench, ICal, ICart, ITrash } from '../ui/Icons';

type Tab = 'start' | 'heute' | 'projekte' | 'material' | 'mehr';
/** Uhrzeit für heute, „Morgen“ für den Folgetag, sonst Wochentag und Datum. */
function dayLabel(iso: string, now: Date): string {
  const d = new Date(iso); if (sameDay(d, now)) return fmtTime(iso);
  return sameDay(d, new Date(now.getTime() + 86400_000)) ? 'Morgen' : `${fmtDayShort(iso)} ${d.getDate()}.${d.getMonth() + 1}.`;
}
const STAGE_COLOR: Record<string, string> = { Idee: '#c59bff', Konstruktion: '#7cc6ff', Planung: '#7cc6ff', Vorbereitung: '#ffe29a', Druck: '#4ccf7a', Nacharbeit: '#ffb547', 'Qualität': '#ffb547', Abgeschlossen: '#8a8f96' };

function Card({ title, icon, count, children, onMore }: { title?: string; icon?: React.ReactNode; count?: number | string; children: React.ReactNode; onMore?: () => void }) {
  return <section className="glass m-card">{title ? <h3>{icon}{title}{count !== undefined ? <span className="cnt pill xs">{count}</span> : null}{onMore ? <button className="btn btn--icon btn--ghost" style={{ marginLeft: count === undefined ? 'auto' : 0 }} onClick={onMore} aria-label={`${title}: alles anzeigen`}><IChevR /></button> : null}</h3> : null}{children}</section>;
}

export function Mobile() {
  const route = useRoute();
  const now = useNow(1000);
  const s = useStore(useShallow((st) => ({ settings: st.settings, weather: st.weather, sheet: st.ui.sheet, commandOpen: st.ui.commandOpen, projects: st.projects })));
  const openSheet = useStore((st) => st.openSheet); const setCommand = useStore((st) => st.setCommand);
  const hints = useHints();
  const today = todayDaily(s.weather?.data, now);
  const look: Look = sceneLook(now, today?.sunrise, today?.sunset, s.weather?.data.hourly.length ? s.weather.data.current.code : undefined);
  const tab: Tab = route.world === 'heute' ? 'heute' : route.world === 'projekte' ? 'projekte' : route.world === 'material' ? 'material' : route.world === 'start' ? 'start' : 'mehr';
  const project = route.world === 'projekte' && route.projectId ? s.projects.find((p) => p.id === route.projectId && !p.deletedAt) : undefined;
  const go = (t: Tab) => navigate({ world: t === 'mehr' ? 'druck' : t });
  // background: one of the eight painted scenes (island over the lake), chosen by tab / view
  const scene = project ? 'innen' : tab === 'mehr' ? (route.world === 'wetter' ? 'wetter' : route.world === 'archiv' ? 'archiv' : 'druck') : tab;
  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [{ id: 'start', label: 'Start', icon: <IHome /> }, { id: 'heute', label: 'Heute', icon: <IClock /> }, { id: 'projekte', label: 'Projekte', icon: <IFlag /> }, { id: 'material', label: 'Material', icon: <ILayers /> }, { id: 'mehr', label: 'Mehr', icon: <IList /> }];

  return (
    <div className="m-shell" data-look={look}>
      <div className="m-bg" aria-hidden><img key={scene} src={`/img/szene-${scene}-1280.webp`} srcSet={`/img/szene-${scene}-640.webp 640w, /img/szene-${scene}-1280.webp 1280w`} sizes="100vw" alt="" /></div>
      <header className="m-head">
        <button className="brand" onClick={() => navigate({ world: 'start' })}><Logo size={30} /><div><b>3Druckwerkbank</b><span className={`ws-chip ws-chip--${workspace} ws-chip--mini`} role="button" aria-label={`Bereich: ${WORKSPACE_META[workspace].label}. Wechseln`} onClick={(e) => { e.stopPropagation(); openSheet({ kind: 'bereich' }); }}><i className="dot" />{WORKSPACE_META[workspace].short}</span></div></button>
        <span className="spacer" />
        <button className="glass m-ico" onClick={() => setCommand(true)} aria-label="Suche"><ISearch /></button>
        <button className="glass m-ico" onClick={() => openSheet({ kind: 'hinweise' })} aria-label={`Hinweise (${hints.length})`}><IBolt />{hints.length ? <span className="badge">{hints.length}</span> : null}</button>
        <button className="glass m-ico" onClick={() => openSheet({ kind: 'konto' })} aria-label="Konto"><IUser /></button>
        <button className="glass m-ico" onClick={() => openSheet({ kind: 'einstellungen' })} aria-label="Einstellungen"><IGear /></button>
      </header>
      <main className="m-main" key={tab + (project?.id ?? '')}>
        {tab === 'start' ? <MStart now={now} /> : tab === 'heute' ? <MHeute now={now} /> : tab === 'projekte' ? (project ? <MProjekt p={project} now={now} /> : <MProjekte />) : tab === 'material' ? <MMaterial /> : <MMehr now={now} />}
      </main>
      <nav className="glass glass--strong m-tabs" aria-label="Bereiche">
        {TABS.map((t) => <button key={t.id} className={t.id === tab ? 'on' : ''} onClick={() => go(t.id)} aria-current={t.id === tab ? 'page' : undefined}>{t.icon}<span>{t.label}</span></button>)}
      </nav>
      {s.sheet ? <SheetHost sheet={s.sheet} /> : null}
      {s.commandOpen ? <CommandBar /> : null}
      <Toast />
    </div>
  );
}

function MStart({ now }: { now: Date }) {
  const { settings, weather, prints, devices, appointments, tasks, projects } = useStore(useShallow((st) => ({ settings: st.settings, weather: st.weather, prints: st.prints, devices: st.devices, appointments: st.appointments, tasks: st.tasks, projects: st.projects })));
  const openSheet = useStore((st) => st.openSheet);
  const cur = weather?.data.hourly.length ? weather.data.current : undefined;
  const running = prints.filter((p) => p.status === 'läuft');
  const pv = weather?.data.hourly.length ? bestPvWindow(weather.data.hourly, settings.pvKwp, 3, now) : null;
  const events = useMemo(() => {
    const ev: { at: number; t: string; text: string; color: string }[] = [];
    running.filter((p) => p.startedAt).forEach((p) => { const end = new Date(p.startedAt!).getTime() + p.estimatedMinutes * 60_000; ev.push({ at: end, t: p.resultDue ? 'Jetzt' : fmtTime(new Date(end)), text: p.resultDue ? `Ergebnis buchen: ${p.name}` : `Druck fertig: ${p.name}`, color: '#7cc6ff' }); });
    appointments.filter((a) => new Date(a.at).getTime() > now.getTime() - 3600_000).forEach((a) => ev.push({ at: new Date(a.at).getTime(), t: dayLabel(a.at, now), text: a.title, color: '#c59bff' }));
    devices.forEach((d) => d.maintenance.filter((m) => !m.done && new Date(m.due).getTime() < now.getTime() + 86400_000).forEach((m) => ev.push({ at: Math.max(now.getTime(), new Date(m.due).getTime()), t: 'Heute', text: `${d.name}: ${m.title}`, color: '#ffb547' })));
    tasks.filter((t) => !t.done && !t.skipped && t.due && sameDay(new Date(t.due), now)).forEach((t) => ev.push({ at: new Date(t.due!).getTime(), t: fmtTime(t.due!), text: t.title, color: '#4ccf7a' }));
    return ev.sort((a, b) => a.at - b.at).slice(0, 3);
  }, [running, appointments, devices, tasks, now]);
  return (
    <>
      <div className="m-clock"><b>{fmtTime(now)}</b><span>{fmtLongDate(now)}</span><span className="xs" style={{ color: 'rgba(255,255,255,.8)' }}>{SEASON_META[resolveSeason(settings.season, now)].label} · noch {daysUntilNextSeason(now)} Tage bis {SEASON_META[resolveSeason(settings.season, now)].next}</span><span style={{ color: '#fff', fontSize: 16, marginTop: 8 }}>{greeting(now)}{settings.userName ? `, ${settings.userName}` : ''}</span>{settings.showQuote ? <p className="q">„{quoteOfDay(now)}“</p> : null}</div>
      <Card>
        {cur ? <div className="row" style={{ gap: 12 }}><WeatherIcon code={cur.code} isDay={cur.isDay} size={40} /><div className="col grow" style={{ gap: 1 }}><b className="m-big">{fmtNum(cur.temp)} °C</b><span className="small muted">{wmo(cur.code).label} · {settings.location.name.split(',')[0]}</span></div><div className="col xs muted" style={{ textAlign: 'right' }}><span>{pv ? `Solarfenster ${fmtTime(pv.start)}` : 'kein Solarfenster'}</span><span>Open-Meteo</span></div></div> : <span className="muted small">{weather?.error ? 'Wetter nicht verfügbar' : 'Wetter …'}</span>}
      </Card>
      <Card title="Läuft gerade" icon={<IPrinter />} count={running.length} onMore={() => navigate({ world: 'druck' })}>
        {running.length === 0 ? <span className="muted small">Kein Druck läuft.</span> : running.map((p) => (
          <div key={p.id} className="m-row m-row--click" onClick={() => openSheet({ kind: 'druck', printId: p.id })}>
            <div className="col grow" style={{ gap: 5 }}><div className="row row--between"><b className="small">{p.name}</b><b className="small">{fmtNum(printProgress(p, now.getTime()) * 100)} %</b></div><Progress value={printProgress(p, now.getTime()) * 100} /><span className="xs muted">{[p.resultDue ? 'Zeit abgelaufen, Ergebnis buchen' : `noch ${fmtDuration(printRemainingMin(p, now.getTime()))}`, devices.find((d) => d.id === p.printerId)?.name, projects.find((x) => x.id === p.projectId)?.name].filter(Boolean).join(' · ')}</span></div>
          </div>
        ))}
      </Card>
      <Card title="Als Nächstes" icon={<ICal />} onMore={() => navigate({ world: 'heute' })}>
        {events.length === 0 ? <span className="muted small">Nichts anstehend.</span> : events.map((e, i) => <div key={i} className="m-row"><i className="dot" style={{ background: e.color }} /><span className="muted" style={{ width: 52 }}>{e.t}</span><span className="grow ellipsis">{e.text}</span></div>)}
      </Card>
    </>
  );
}

function MHeute({ now }: { now: Date }) {
  const { tasks, appointments, devices, projects, prints, settings, weather } = useStore(useShallow((st) => ({ tasks: st.tasks, appointments: st.appointments, devices: st.devices, projects: st.projects, prints: st.prints, settings: st.settings, weather: st.weather })));
  const a = useStore(useShallow((st) => ({ toggleTask: st.toggleTask, skipTask: st.skipTask, toggleMaintenance: st.toggleMaintenance, startNextPrint: st.startNextPrint, openSheet: st.openSheet })));
  const open = tasks.filter((t) => !t.done && !t.skipped).sort((x, y) => x.order - y.order);
  const done = tasks.filter((t) => t.done).length;
  const due = devices.flatMap((d) => d.maintenance.filter((m) => !m.done && new Date(m.due).getTime() < now.getTime() + 86400_000 * 3).map((m) => ({ d, m })));
  const upcoming = appointments.filter((x) => new Date(x.at).getTime() > now.getTime() - 3600_000).sort((x, y) => x.at.localeCompare(y.at)).slice(0, 3);
  const queued = prints.filter((p) => p.status === 'wartend');
  const printers = devices.filter((d) => d.kind === 'drucker');
  const pv = weather?.data.hourly.length ? bestPvWindow(weather.data.hourly, settings.pvKwp, 3, now) : null;
  return (
    <>
      <Card title="Aufgaben" icon={<IClock />} count={`${open.length} offen`}>
        {open.length === 0 ? <span className="muted small">{done ? `Alles erledigt (${done}).` : 'Noch keine Aufgaben. Aufgaben legst du im Projekt an.'}</span> : open.map((t) => (
          <div key={t.id} className="m-row"><Check on={t.done} onClick={() => a.toggleTask(t.id)} /><div className="col grow" style={{ gap: 1 }}><span>{t.title}</span><span className="xs muted">{projects.find((p) => p.id === t.projectId)?.name ?? devices.find((d) => d.id === t.deviceId)?.name ?? t.kind}{t.due ? ` · ${relTime(t.due, now.getTime())}` : ''}</span></div><button className="btn btn--icon btn--ghost" onClick={() => a.skipTask(t.id)} aria-label="Überspringen"><ISkip width={16} height={16} /></button></div>
        ))}
      </Card>
      <Card title="Drucker" icon={<IPrinter />}>
        {printers.length === 0 ? <div className="col" style={{ gap: 8 }}><span className="muted small">Noch kein Drucker angelegt.</span><button className="btn btn--primary" onClick={() => a.openSheet({ kind: 'geraetForm', deviceKind: 'drucker' })}><IPlus width={14} height={14} /> Drucker anlegen</button></div> : null}
        {printers.map((d) => { const job = prints.find((p) => p.printerId === d.id && p.status === 'läuft'); return <div key={d.id} className="m-row m-row--click" onClick={() => a.openSheet(job ? { kind: 'druck', printId: job.id } : { kind: 'geraet', deviceId: d.id })}><i className="dot" style={{ background: job ? '#7cc6ff' : STATUS_COLOR[d.status] ?? '#4ccf7a' }} /><div className="col grow" style={{ gap: 1 }}><b className="small">{d.name}</b><span className="xs muted">{job ? (job.resultDue ? `${job.name} · Ergebnis buchen` : `${job.name} · ${fmtNum(printProgress(job, now.getTime()) * 100)} %`) : d.status}</span></div>{!job && d.status === 'bereit' && queued.some((q) => q.printerId === d.id) ? <button className="btn btn--sm btn--primary" onClick={(e) => { e.stopPropagation(); a.startNextPrint(d.id); }}><IPlay width={12} height={12} /> Start</button> : null}</div>; })}
        <span className="xs muted">{pv ? `Solarfenster ${fmtTime(pv.start)} Uhr, ≈ ${fmtNum(pv.kwh, 1)} kWh (Schätzung)` : 'Kein Solarfenster in 48 h.'}</span>
      </Card>
      <Card title="Termine & Wartung" icon={<ICal />}>
        {upcoming.map((x) => <div key={x.id} className="m-row"><i className="dot" style={{ background: '#c59bff' }} /><span className="muted" style={{ width: 62 }}>{dayLabel(x.at, now)}</span><span className="grow ellipsis">{x.title}</span></div>)}
        {due.map(({ d, m }) => <div key={m.id} className="m-row"><Check on={m.done} onClick={() => a.toggleMaintenance(d.id, m.id)} /><div className="col grow" style={{ gap: 1 }}><span>{d.name}: {m.title}</span><span className="xs muted">{new Date(m.due).getTime() < now.getTime() ? 'überfällig' : relTime(m.due, now.getTime())}</span></div></div>)}
        {upcoming.length + due.length === 0 ? <span className="muted small">Nichts anstehend.</span> : null}
      </Card>
    </>
  );
}

function MProjekte() {
  const projects = useStore((st) => st.projects); const spools = useStore((st) => st.spools); const openSheet = useStore((st) => st.openSheet);
  const list = activeProjects(projects);
  const blocked = (p: Project) => p.requiredSpools.some((r) => { const sp = spools.find((x) => x.id === r.spoolId); return sp && availableGrams(sp) < r.grams; });
  return (
    <Card title="Projekte" icon={<IFlag />} count={list.length}>
      {list.length === 0 ? <span className="muted small">Noch kein Projekt. Leg dein erstes Projekt an: eine Idee und ein Name reichen für den Anfang.</span> : null}
      {list.map((p) => (
        <div key={p.id} className="m-row m-row--click" onClick={() => navigate({ world: 'projekte', projectId: p.id })}>
          <div className="thumb"><img src={p.island.kind === 'eigenes' && p.island.photoDataUrl ? p.island.photoDataUrl : islandSrc(p.island.libraryId, 256)} alt="" style={{ objectFit: 'contain' }} /></div>
          <div className="col grow" style={{ gap: 4 }}><div className="row"><b className="small ellipsis grow">{p.name}</b>{p.favorite ? <span style={{ color: '#ffd77a' }}>★</span> : null}</div><Progress value={p.progress} /><span className="xs" style={{ color: blocked(p) ? '#ff9a9a' : 'var(--text-2)' }}><i className="dot" style={{ background: blocked(p) ? '#ff6b6b' : STAGE_COLOR[p.stage], marginRight: 5 }} />{blocked(p) ? 'Blockiert' : p.stage} · {p.progress} %</span></div>
          <IChevR className="muted" />
        </div>
      ))}
      <button className="btn btn--primary" onClick={() => openSheet({ kind: 'projektForm' })}><IPlus width={14} height={14} /> Neues Projekt</button>
    </Card>
  );
}

function MProjekt({ p, now }: { p: Project; now: Date }) {
  const st = useStore();
  const [newTask, setNewTask] = useState('');
  const tasks = st.tasks.filter((t) => t.projectId === p.id).sort((a, b) => a.order - b.order);
  const prints = st.prints.filter((pr) => pr.projectId === p.id).sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? ''));
  const ms = [...p.milestones].sort((a, b) => a.order - b.order);
  return (
    <>
      <button className="m-back" onClick={() => navigate({ world: 'projekte' })}><IArrowL width={16} height={16} /> Projekte</button>
      <Card>
        <div className="m-hero"><img src={p.island.kind === 'eigenes' && p.island.photoDataUrl ? p.island.photoDataUrl : islandSrc(p.island.libraryId, 256)} alt="" /><div className="col grow" style={{ gap: 6 }}><h2>{p.name}</h2><span className="small muted">{p.description}</span></div></div>
        <div className="row" style={{ gap: 8 }}><select className="select" style={{ flex: 1 }} value={p.stage} onChange={(e) => st.setStage(p.id, e.target.value as Project['stage'])}>{STAGES.map((x) => <option key={x}>{x}</option>)}</select><b style={{ width: 54, textAlign: 'right' }}>{p.progress} %</b></div>
        <Progress value={p.progress} />
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}><button className="btn btn--sm" onClick={() => st.openSheet({ kind: 'projektForm', projectId: p.id })}>Bearbeiten</button><button className="btn btn--sm" onClick={() => st.openSheet({ kind: 'neuerDruck', projectId: p.id })}><IPrinter width={13} height={13} /> Druck planen</button>{!p.archivedAt ? <button className="btn btn--sm btn--primary" onClick={() => st.openSheet({ kind: 'abschliessen', projectId: p.id })}><IArchive width={13} height={13} /> Abschließen</button> : null}</div>
      </Card>
      <Card title="Meilensteine" icon={<IFlag />} onMore={() => st.openSheet({ kind: 'projektDetail', projectId: p.id, tab: 'meilensteine' })}>
        <div className="m-ms">{ms.map((m) => <div key={m.id} className="m-row"><Check on={m.done} skip={m.skipped} onClick={() => st.setMilestone(p.id, m.id, { done: !m.done, skipped: false })} /><span className="grow" style={{ textDecoration: m.skipped ? 'line-through' : undefined, opacity: m.done ? .7 : 1 }}>{m.title}</span></div>)}</div>
      </Card>
      <Card title="Aufgaben" icon={<IClock />} count={tasks.filter((t) => !t.done && !t.skipped).length} onMore={() => st.openSheet({ kind: 'projektDetail', projectId: p.id, tab: 'aufgaben' })}>
        {tasks.filter((t) => !t.done && !t.skipped).map((t) => <div key={t.id} className="m-row"><Check on={t.done} onClick={() => st.toggleTask(t.id)} /><span className="grow">{t.title}</span></div>)}
        <input className="input" placeholder="Aufgabe hinzufügen …" value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newTask.trim()) { st.addTask({ projectId: p.id, title: newTask.trim(), kind: 'allgemein' }); setNewTask(''); } }} />
      </Card>
      <Card title="Drucke" icon={<IPrinter />} count={prints.length} onMore={() => st.openSheet({ kind: 'projektDetail', projectId: p.id, tab: 'drucke' })}>
        {prints.length === 0 ? <span className="muted small">Noch kein Druck.</span> : prints.slice(0, 4).map((pr) => <div key={pr.id} className="m-row m-row--click" onClick={() => st.openSheet({ kind: 'druck', printId: pr.id })}><i className="dot" style={{ background: pr.status === 'läuft' ? '#7cc6ff' : pr.result === 'erfolg' ? '#4ccf7a' : pr.result === 'fehldruck' ? '#ff6b6b' : pr.result === 'nacharbeit' ? '#ffb547' : '#8a8f96' }} /><div className="col grow" style={{ gap: 1 }}><span className="small">{pr.name}</span><span className="xs muted">{pr.status === 'läuft' ? `${Math.round(printProgress(pr, now.getTime()) * 100)} % · noch ${fmtDuration(printRemainingMin(pr, now.getTime()))}` : pr.status === 'fertig' ? `${pr.result} · ${fmtDate(pr.finishedAt)}` : pr.status}</span></div></div>)}
      </Card>
      <Card title="Material" icon={<ILayers />} onMore={() => st.openSheet({ kind: 'projektDetail', projectId: p.id, tab: 'material' })}>
        {p.requiredSpools.length === 0 ? <span className="muted small">Kein Bedarf hinterlegt.</span> : p.requiredSpools.map((r) => { const sp = st.spools.find((x) => x.id === r.spoolId); if (!sp) return null; const avail = availableGrams(sp); return <div key={r.spoolId} className="m-row"><span className="swatch" style={{ background: sp.colorHex }} /><div className="col grow" style={{ gap: 3 }}><div className="row row--between small"><span>{sp.label}</span><b>{r.grams} g</b></div><Stack parts={[{ value: avail, color: '#4ccf7a' }, { value: sp.reservedGrams, color: '#ffb547' }, { value: sp.initialGrams - sp.remainingGrams, color: 'rgba(255,255,255,.15)' }]} /><span className={`xs ${avail < r.grams ? 'pill pill--bad' : 'muted'}`} style={{ alignSelf: 'flex-start' }}>{avail < r.grams ? `fehlen ${fmtGrams(r.grams - avail)}` : `${fmtGrams(avail)} verfügbar`}</span></div></div>; })}
      </Card>
      <Card title="Notizen" icon={<IList />} onMore={() => st.openSheet({ kind: 'projektDetail', projectId: p.id, tab: 'notizen' })}>
        <NotesField p={p} key={p.id} />
      </Card>
    </>
  );
}

function MMaterial() {
  const { spools, projects, shopping } = useStore(useShallow((st) => ({ spools: st.spools, projects: st.projects, shopping: st.shopping })));
  const openSheet = useStore((st) => st.openSheet);
  const sh = useStore(useShallow((st) => ({ add: st.addShopping, toggle: st.toggleShopping, remove: st.deleteShopping })));
  const [mat, setMat] = useState('alle'); const [buy, setBuy] = useState('');
  const addBuy = () => { if (!buy.trim()) return; sh.add({ title: buy.trim(), qty: '1' }); setBuy(''); };
  const openItems = shopping.filter((x) => !x.done).length;
  const mats = [...new Set(spools.map((x) => x.material))];
  const list = spools.filter((x) => mat === 'alle' || x.material === mat).sort((a, b) => a.material.localeCompare(b.material) || a.label.localeCompare(b.label));
  const shortages = liveProjects(projects).filter((p) => !p.archivedAt).flatMap((p) => p.requiredSpools.map((r) => { const sp = spools.find((x) => x.id === r.spoolId); return sp && availableGrams(sp) < r.grams ? { sp, p, missing: r.grams - availableGrams(sp) } : null; }).filter((x): x is NonNullable<typeof x> => !!x));
  return (
    <>
      <div className="m-grid2"><div className="glass m-stat"><b>{spools.length}</b><span>Rollen</span></div><div className="glass m-stat"><b>{fmtGrams(spools.reduce((a, x) => a + availableGrams(x), 0))}</b><span>verfügbar</span></div></div>
      {shortages.length ? <Card title="Fehlmengen" icon={<IBolt />}>{shortages.map((x, i) => { const title = `${x.sp.label} nachkaufen`; const listed = shopping.some((it) => !it.done && it.title === title); return <div key={i} className="m-row"><div className="col grow" style={{ gap: 1 }}><span className="small" style={{ color: '#ffb0b0' }}>{x.sp.label}: fehlen {fmtGrams(x.missing)}</span><span className="xs muted">{x.p.name}</span></div><button className="btn btn--sm" disabled={listed} onClick={() => sh.add({ title, qty: '1', price: x.sp.price, projectId: x.p.id, url: x.sp.reorderUrl })}>{listed ? 'Auf der Liste' : '+ Liste'}</button></div>; })}</Card> : null}
      <Card title="Rollen" icon={<ISpool />}>
        <div className="pills"><button className={`pill${mat === 'alle' ? ' pill--on' : ''}`} onClick={() => setMat('alle')}>Alle</button>{mats.map((m) => <button key={m} className={`pill${mat === m ? ' pill--on' : ''}`} onClick={() => setMat(m)}>{m}</button>)}</div>
        {spools.length === 0 ? <span className="muted small">Noch keine Rolle angelegt. Mit deinen Rollen behältst du Bestand und Verbrauch im Blick.</span> : null}
        {list.map((x) => <div key={x.id} className="m-row m-row--click" onClick={() => openSheet({ kind: 'spule', spoolId: x.id })}><span className="swatch" style={{ background: x.colorHex }} /><div className="col grow" style={{ gap: 3 }}><div className="row row--between"><b className="small">{x.label}</b><span className="xs muted">{x.brand}</span></div><Stack parts={[{ value: availableGrams(x), color: '#4ccf7a' }, { value: x.reservedGrams, color: '#ffb547' }, { value: x.initialGrams - x.remainingGrams, color: 'rgba(255,255,255,.15)' }]} /><span className="xs muted">{fmtGrams(availableGrams(x))} frei · {x.location}</span></div><IChevR className="muted" /></div>)}
        <button className="btn" onClick={() => openSheet({ kind: 'spule' })}><IPlus width={14} height={14} /> Neue Rolle</button>
      </Card>
      <Card title="Einkaufsliste" icon={<ICart />} count={openItems}>
        {shopping.length === 0 ? <span className="muted small">Noch nichts auf der Liste.</span> : null}
        {[...shopping].sort((a, b) => Number(a.done) - Number(b.done)).map((it) => <div key={it.id} className="m-row m-shop"><Check on={it.done} onClick={() => sh.toggle(it.id)} label={it.done ? `${it.title}: erledigt` : `${it.title}: offen`} /><div className="col grow" style={{ gap: 1, minWidth: 0 }}><span className="ellipsis" style={{ textDecoration: it.done ? 'line-through' : undefined, opacity: it.done ? .6 : 1 }}>{it.title}</span><span className="xs muted">{[it.qty && it.qty !== '1' ? `× ${it.qty}` : '', it.price ? `${fmtNum(it.price, 2)} €` : '', projects.find((p) => p.id === it.projectId)?.name ?? ''].filter(Boolean).join(' · ') || 'ohne Angaben'}</span></div>{it.url && /^https?:\/\//i.test(it.url) ? <a className="btn btn--sm btn--ghost" href={it.url} target="_blank" rel="noreferrer noopener">Link</a> : null}<button className="btn btn--icon btn--ghost" aria-label={`${it.title} von der Liste entfernen`} onClick={() => sh.remove(it.id)}><ITrash width={18} height={18} /></button></div>)}
        <div className="row" style={{ gap: 8 }}><input className="input grow" placeholder="Was fehlt? z. B. PETG Schwarz" aria-label="Auf die Einkaufsliste" value={buy} maxLength={80} onChange={(e) => setBuy(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addBuy(); }} /><button className="btn" disabled={!buy.trim()} onClick={addBuy}><IPlus width={14} height={14} /> Dazu</button></div>
        <span className="xs faint">Produktlinks lösen keine Bestellung aus.</span>
      </Card>
    </>
  );
}

function MMehr({ now }: { now: Date }) {
  const { devices, prints, weather, settings, projects, reports } = useStore(useShallow((st) => ({ devices: st.devices, prints: st.prints, weather: st.weather, settings: st.settings, projects: st.projects, reports: st.reports })));
  const openSheet = useStore((st) => st.openSheet);
  const cur = weather?.data.hourly.length ? weather.data.current : undefined;
  const hours = (weather?.data.hourly ?? []).filter((h) => new Date(h.time).getTime() >= now.getTime() - 3600_000).slice(0, 12);
  const maxPv = Math.max(0.01, ...hours.map((h) => pvKw(h.ghi, settings.pvKwp)));
  const arch = archivedProjects(projects).sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? ''));
  const queue = prints.filter((p) => p.status === 'wartend').sort((a, b) => a.queueOrder - b.queueOrder);
  return (
    <>
      <Card title="Drucker & Warteschlange" icon={<IPrinter />} onMore={() => openSheet({ kind: 'geraete' })}>
        {devices.every((d) => d.kind === 'werkzeug') ? <span className="muted small">Noch kein Gerät angelegt.</span> : null}
        {devices.filter((d) => d.kind !== 'werkzeug').map((d) => <div key={d.id} className="m-row m-row--click" onClick={() => openSheet({ kind: 'geraet', deviceId: d.id })}><i className="dot" style={{ background: STATUS_COLOR[d.status] ?? '#ffb547' }} /><div className="col grow" style={{ gap: 1 }}><b className="small">{d.name}</b><span className="xs muted">{[d.model, d.status].filter(Boolean).join(' · ')}{d.maintenance.some((m) => !m.done && new Date(m.due).getTime() < now.getTime()) ? ' · Wartung fällig' : ''}</span></div><IChevR className="muted" /></div>)}
        {queue.map((q, i) => <div key={q.id} className="m-row m-row--click" onClick={() => openSheet({ kind: 'druck', printId: q.id })}><span className="xs muted" style={{ width: 16 }}>{i + 1}</span><div className="col grow" style={{ gap: 1 }}><span className="small">{q.name}</span><span className="xs muted">{devices.find((d) => d.id === q.printerId)?.name ?? 'Drucker fehlt'} · {fmtDuration(q.estimatedMinutes)} · {q.gramsPlanned} g</span></div></div>)}
        <button className="btn" onClick={() => openSheet({ kind: 'geraetForm', deviceKind: 'drucker' })}><IPlus width={14} height={14} /> Gerät hinzufügen</button>
      </Card>
      <Card title="Wetter" icon={<ISun />}>
        {cur ? <div className="row" style={{ gap: 12 }}><WeatherIcon code={cur.code} isDay={cur.isDay} size={36} /><div className="col grow"><b className="m-big">{fmtNum(cur.temp)} °C</b><span className="small muted">{wmo(cur.code).label} · Wind {fmtNum(cur.wind)} km/h · {cur.humidity} %</span></div></div> : <span className="muted small">Wetter nicht verfügbar</span>}
        <div className="m-hours hours">{hours.map((h, i) => <div key={h.time} className={`hour${i === 0 ? ' now' : ''}`}><span className="muted">{i === 0 ? 'jetzt' : fmtTime(h.time)}</span><WeatherIcon code={h.code} isDay={h.isDay} size={16} /><b>{fmtNum(h.temp)}°</b><div className="pvbar"><i style={{ height: `${(pvKw(h.ghi, settings.pvKwp) / maxPv) * 100}%` }} /></div></div>)}</div>
        <span className="xs faint">Balken: Solarstrom-Schätzung · Quelle Open-Meteo</span>
      </Card>
      <Card title="Archiv" icon={<IArchive />} count={arch.length}>
        {arch.length === 0 ? <span className="muted small">Noch nichts abgeschlossen. Fertige Projekte landen mit Bericht hier.</span> : null}
        {arch.map((p) => { const r = reports.find((x) => x.projectId === p.id); return <div key={p.id} className="m-row m-row--click" onClick={() => r ? openSheet({ kind: 'bericht', reportId: r.id }) : navigate({ world: 'projekte', projectId: p.id })}><div className="thumb"><img src={islandSrc(p.island.libraryId, 256)} alt="" style={{ objectFit: 'contain' }} /></div><div className="col grow" style={{ gap: 1 }}><b className="small">{p.name}</b><span className="xs muted">{fmtDate(p.archivedAt)}{r ? ` · ${r.result}` : ''}</span></div><IChevR className="muted" /></div>; })}
      </Card>
      <Card title="Werkzeuge" icon={<IWrench />} onMore={() => openSheet({ kind: 'geraete', tab: 'werkzeuge' })}>
        {devices.every((d) => d.kind !== 'werkzeug') ? <span className="muted small">Noch kein Werkzeug angelegt.</span> : null}
        {devices.filter((d) => d.kind === 'werkzeug').map((t) => <div key={t.id} className="m-row m-row--click" onClick={() => openSheet({ kind: 'geraetForm', deviceId: t.id })}><i className="dot" style={{ background: STATUS_COLOR[t.status] ?? '#ffb547' }} /><span className="grow small">{t.name}</span><span className="xs muted">{t.status}</span><IChevR className="muted" /></div>)}
        <button className="btn" onClick={() => openSheet({ kind: 'geraetForm', deviceKind: 'werkzeug' })}><IPlus width={14} height={14} /> Werkzeug anlegen</button>
      </Card>
      <div className="row" style={{ gap: 8 }}><button className="btn grow" onClick={() => openSheet({ kind: 'einstellungen' })}><IGear width={14} height={14} /> Einstellungen</button><button className="btn grow" onClick={() => openSheet({ kind: 'ueber' })}>Über diesen Entwurf</button></div>
      <p className="xs faint" style={{ textAlign: 'center', padding: '4px 0' }}>Mobiler Begleiter: Status, Aufgaben, Projekte, Material. Die vollständige räumliche Werkstatt gibt es am Desktop.</p>
    </>
  );
}
