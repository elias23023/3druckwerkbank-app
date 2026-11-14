import { useEffect, useMemo, useState } from 'react';
import type { Project } from '../types';
import { useStore, availableGrams, printProgress, printRemainingMin } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { navigate } from '../router';
import { Panel } from '../ui/Glass';
import { IChevL, IChevR, IPlus, IStar, IArrowR, ICopy, IPrinter, ISpool, IClock, IGit, ICheck, ISun, IBolt } from '../ui/Icons';
import { islandSrc } from '../scene/Island';
import { useNow } from '../lib/time';
import { fmtDuration, fmtGrams } from '../lib/format';
import { bestPvWindow } from '../lib/weather';

type StatusF = 'alle' | 'aktiv' | 'geplant' | 'blockiert' | 'fav';
type Filter = { status: StatusF; typ?: string; bereich?: string };
const STAGE_COLOR: Record<string, string> = { Idee: '#c59bff', Konstruktion: '#7cc6ff', Planung: '#7cc6ff', Vorbereitung: '#ffe29a', Druck: '#4ccf7a', Nacharbeit: '#ffb547', 'Qualität': '#ffb547', Abgeschlossen: '#8a8f96' };

export function Projekte({ index, setIndex, projects }: { index: number; setIndex: (i: number) => void; projects: Project[] }) {
  const now = useNow(1000);
  const { tasks, prints, spools, devices, settings, weather } = useStore(useShallow((s) => ({ tasks: s.tasks, prints: s.prints, spools: s.spools, devices: s.devices, settings: s.settings, weather: s.weather })));
  const toggleFavorite = useStore((s) => s.toggleFavorite); const openSheet = useStore((s) => s.openSheet); const duplicateProject = useStore((s) => s.duplicateProject);
  const [filter, setFilter] = useState<Filter>({ status: 'alle' });
  const types = useMemo(() => [...new Set(projects.map((p) => p.type))], [projects]);
  const areas = useMemo(() => [...new Set(projects.flatMap((p) => p.areas))], [projects]);
  const isBlocked = (p: Project) => p.requiredSpools.some((r) => { const sp = spools.find((x) => x.id === r.spoolId); return sp && availableGrams(sp) < r.grams; }) || prints.some((pr) => pr.projectId === p.id && pr.status === 'wartend' && devices.find((d) => d.id === pr.printerId)?.maintenance.some((m) => !m.done && new Date(m.due).getTime() < now.getTime()));
  const isPlanned = (p: Project) => p.stage === 'Idee' || p.stage === 'Planung';
  const matches = (p: Project) => (filter.status === 'alle' ? true : filter.status === 'fav' ? p.favorite : filter.status === 'blockiert' ? isBlocked(p) : filter.status === 'geplant' ? isPlanned(p) : !isPlanned(p)) && (!filter.typ || p.type === filter.typ) && (!filter.bereich || p.areas.includes(filter.bereich));
  const p = projects[index];
  const total = projects.length;
  const go = (dir: -1 | 1) => { if (!total) return; let i = index; for (let k = 0; k < total; k++) { i = (i + dir + total) % total; if (matches(projects[i])) break; } setIndex(i); };
  useEffect(() => {
    const on = (e: KeyboardEvent) => { const t = e.target as HTMLElement; const ui = useStore.getState().ui; if (ui.sheet || ui.commandOpen) return; if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || (e.key === 'Enter' && t.closest?.('button, a, [role="button"]')))) return; if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); if (e.key === 'Enter' && p) navigate({ world: 'projekte', projectId: p.id }); };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  });
  useEffect(() => { if (p && !matches(p)) go(1); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = { alle: projects.length, aktiv: projects.filter((x) => !isPlanned(x)).length, geplant: projects.filter(isPlanned).length, blockiert: projects.filter(isBlocked).length, fav: projects.filter((x) => x.favorite).length };
  const job = p ? prints.find((pr) => pr.projectId === p.id && (pr.status === 'läuft' || pr.status === 'wartend')) : undefined;
  const nextTask = p ? tasks.find((t) => t.projectId === p.id && !t.done && !t.skipped) : undefined;
  const curVersion = p?.versions.find((v) => v.status === 'aktuell') ?? p?.versions.find((v) => v.status === 'beste') ?? p?.versions[0];
  const needSpool = p?.requiredSpools[0] ? spools.find((s) => s.id === p.requiredSpools[0].spoolId) : undefined;
  const shortage = p ? p.requiredSpools.map((r) => { const sp = spools.find((x) => x.id === r.spoolId); return sp && availableGrams(sp) < r.grams ? { sp, missing: r.grams - availableGrams(sp) } : null; }).find(Boolean) : null;
  const pv = weather?.data.hourly.length ? bestPvWindow(weather.data.hourly, settings.pvKwp, Math.max(2, Math.ceil((job?.estimatedMinutes ?? 120) / 60)), now) : null;
  const similar = p ? projects.filter((x) => x.id !== p.id && (x.type === p.type || x.areas.some((a) => p.areas.includes(a)))).slice(0, 3) : [];
  const stageLabel = (x: Project) => (prints.some((pr) => pr.projectId === x.id && pr.status === 'läuft') ? 'Wird gedruckt' : isBlocked(x) ? 'Blockiert' : x.stage);
  const pillOn = (s: StatusF) => filter.status === s ? ' pill--on' : '';

  return (
    <>
      <div className="world-title">
        <h1>Projekte</h1><p>Deine Ideen. Schritt für Schritt.</p>
        {total > 0 ? <div className="pills" style={{ marginTop: 14 }}>
          {([['alle', 'Alle'], ['aktiv', 'Aktiv'], ['geplant', 'Geplant'], ['blockiert', 'Blockiert'], ['fav', 'Favoriten']] as [StatusF, string][]).map(([k, l]) => <button key={k} className={`glass pill${pillOn(k)}`} style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setFilter({ ...filter, status: k })}>{k === 'fav' ? <IStar width={12} height={12} /> : null}{l} <span className="pill xs" style={{ padding: '0 6px', background: 'rgba(255,255,255,.14)' }}>{counts[k]}</span></button>)}
        </div> : null}
        {types.length + areas.length > 1 ? <div className="pills" style={{ marginTop: 8 }}>
          {types.length > 1 ? <select className={`glass select filter-select${filter.typ ? ' on' : ''}`} value={filter.typ ?? ''} aria-label="Nach Projektart filtern" onChange={(e) => setFilter({ ...filter, typ: e.target.value || undefined })}><option value="">Alle Arten</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select> : null}
          {areas.length > 1 ? <select className={`glass select filter-select${filter.bereich ? ' on' : ''}`} value={filter.bereich ?? ''} aria-label="Nach Bereich filtern" onChange={(e) => setFilter({ ...filter, bereich: e.target.value || undefined })}><option value="">Alle Bereiche</option>{areas.map((a) => <option key={a} value={a}>{a}</option>)}</select> : null}
        </div> : null}
        {total > 0 ? (projects.some(matches) ? <p className="xs faint" style={{ marginTop: 6 }}>{projects.filter(matches).length} von {total}{total > 1 ? ' · ← → blättern · Enter öffnen' : ' · Enter öffnen'}</p> : <p className="xs" style={{ marginTop: 6 }}>Kein Projekt passt zu diesem Filter. <button className="link" onClick={() => setFilter({ status: 'alle' })}>Filter zurücksetzen</button></p>) : null}
      </div>
      {total > 1 ? <><button className="glass carousel-nav desktop-only" style={{ left: '29%' }} onClick={() => go(-1)} aria-label="Vorheriges Projekt"><IChevL /></button>
      <button className="glass carousel-nav desktop-only" style={{ right: '29%' }} onClick={() => go(1)} aria-label="Nächstes Projekt"><IChevR /></button></> : null}
      <div className="mobile-only carousel-mobile"><button className="btn" onClick={() => go(-1)}><IChevL /> Zurück</button><button className="btn" onClick={() => go(1)}>Weiter <IChevR /></button></div>

      {p ? (
        <>
          <div className="project-hero">
            <h2>{p.name}</h2>
            <p className="desc">{p.description}</p>
            <div className="status-row">
              <span className={`pill ${job?.status === 'läuft' ? 'pill--ok' : isBlocked(p) ? 'pill--bad' : 'pill--acc'}`} style={{ textShadow: 'none' }}><i className="dot" style={{ background: job?.status === 'läuft' ? '#4ccf7a' : STAGE_COLOR[p.stage] }} />{stageLabel(p)}</span>
              <div className="progress"><i style={{ width: `${p.progress}%` }} /></div>
              <b>{p.progress} %</b>
            </div>
            <div className="chips">
              {job ? <span className="glass chip"><IPrinter width={14} height={14} />{devices.find((d) => d.id === job.printerId)?.name}</span> : null}
              {needSpool ? <span className="glass chip"><ISpool width={14} height={14} />{needSpool.material}</span> : null}
              {job ? <span className="glass chip"><IClock width={14} height={14} />{job.status === 'läuft' ? `noch ${fmtDuration(printRemainingMin(job, now.getTime()))}` : fmtDuration(job.estimatedMinutes)}</span> : null}
              {curVersion ? <span className="glass chip"><IGit width={14} height={14} />{curVersion.label}</span> : null}
              <span className="glass chip">{p.type}</span>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <button className="btn btn--primary" onClick={() => navigate({ world: 'projekte', projectId: p.id })}>Projekt öffnen <IArrowR width={14} height={14} /></button>
              <button className="glass btn btn--sm" onClick={() => openSheet({ kind: 'projektForm', projectId: p.id })}>Bearbeiten</button>
              <button className="glass btn btn--sm btn--icon" title="Duplizieren" aria-label="Projekt duplizieren" onClick={() => { duplicateProject(p.id); setIndex(0); }}><ICopy width={14} height={14} /></button>
              <button className="glass btn btn--sm btn--icon" title="Favorit" aria-label={p.favorite ? 'Favorit entfernen' : 'Als Favorit merken'} aria-pressed={p.favorite} onClick={() => toggleFavorite(p.id)} style={{ color: p.favorite ? '#ffd77a' : undefined }}><IStar width={14} height={14} fill={p.favorite ? 'currentColor' : 'none'} /></button>
              <button className="glass btn btn--sm" onClick={() => openSheet({ kind: 'projektForm' })}><IPlus width={14} height={14} /> Neu</button>
            </div>
          </div>

          <Panel title="Aktuelles im Projekt" icon={<IBolt />} className="side-panel-l" delay={120}>
            {job ? <div className="row small"><span className="thumb" style={{ width: 32, height: 32, background: 'rgba(76,207,122,.2)', color: '#4ccf7a' }}><IPrinter width={16} height={16} /></span><div className="col" style={{ gap: 0 }}><b>{job.status === 'läuft' ? `Druck läuft auf ${devices.find((d) => d.id === job.printerId)?.name}` : `Druck geplant: ${job.name}`}</b><span className="xs muted">{job.status === 'läuft' ? `${Math.round(printProgress(job, now.getTime()) * 100)} % – noch ${fmtDuration(printRemainingMin(job, now.getTime()))}` : fmtDuration(job.estimatedMinutes)}</span></div></div> : null}
            {nextTask ? <div className="row small"><span className="thumb thumb--naechstes" style={{ width: 32, height: 32 }}><ICheck width={16} height={16} /></span><div className="col" style={{ gap: 0 }}><b>Nächstes: {nextTask.title}</b><span className="xs muted">{nextTask.kind}</span></div></div> : null}
            {needSpool ? <div className="row small"><span className="thumb" style={{ width: 32, height: 32, background: shortage ? 'rgba(255,107,107,.2)' : 'rgba(197,155,255,.2)', color: shortage ? '#ff6b6b' : '#c59bff' }}><ISpool width={16} height={16} /></span><div className="col" style={{ gap: 0 }}><b>{shortage ? `Material fehlt: ${fmtGrams(shortage.missing)}` : 'Material ausreichend'}</b><span className="xs muted">{needSpool.label} – {fmtGrams(availableGrams(needSpool))} verfügbar</span></div></div> : null}
            <div className="row small"><span className="thumb" style={{ width: 32, height: 32, background: 'rgba(255,215,122,.2)', color: '#ffd77a' }}><ISun width={16} height={16} /></span><div className="col" style={{ gap: 0 }}><b>{pv ? 'Wetter passt' : 'Kein Solarfenster'}</b><span className="xs muted">{pv ? `Ideales Druckfenster ab ${new Date(pv.start).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit' })} Uhr` : 'Druck über Netzstrom möglich'}</span></div></div>
          </Panel>

          <Panel title="Ähnliche Projekte" icon={<IStar />} className="side-panel-r" delay={160}>
            {similar.length === 0 ? <p className="muted small">Keine ähnlichen Projekte.</p> : similar.map((x) => <div key={x.id} className="sim-item" role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setIndex(projects.findIndex((y) => y.id === x.id)); } }} onClick={() => setIndex(projects.findIndex((y) => y.id === x.id))}><img src={islandSrc(x.island.libraryId, 256)} alt="" /><div className="col grow" style={{ gap: 0 }}><b className="small ellipsis">{x.name}</b><span className="xs muted">{x.areas[0] ?? x.type} · {x.stage}</span></div><IChevR width={14} height={14} className="muted" /></div>)}
          </Panel>
        </>
      ) : (
        <Panel className="project-card" strong><h2>Dein erstes Projekt</h2><p className="small">Jedes Projekt bekommt eine eigene Insel: mit Meilensteinen, Versionen, Drucken, Material und Notizen. Eine Idee und ein Name reichen für den Anfang.</p><div className="row" style={{ gap: 8, flexWrap: 'wrap' }}><button className="btn btn--primary" onClick={() => openSheet({ kind: 'projektForm' })}><IPlus width={14} height={14} /> Neues Projekt</button>{devices.every((d) => d.kind !== 'drucker') ? <button className="btn" onClick={() => openSheet({ kind: 'geraetForm', deviceKind: 'drucker' })}><IPrinter width={14} height={14} /> Drucker anlegen</button> : null}</div></Panel>
      )}
      <div className="hand hand--tr">{'„Aus Ideen\nentstehen Lieblingsstücke.“'}</div>
    </>
  );
}
