import { useEffect, useMemo, useState } from 'react';
import type { Project } from '../types';
import { useStore } from '../store';
import { navigate } from '../router';
import { Panel, Progress } from '../ui/Glass';
import { IChevL, IChevR, IPlus, IStar, IArrowR, ICopy } from '../ui/Icons';
import { fmtDate } from '../lib/format';

type Filter = { kind: 'alle' } | { kind: 'fav' } | { kind: 'typ'; v: string } | { kind: 'bereich'; v: string } | { kind: 'station'; v: string };

export function Projekte({ index, setIndex, projects }: { index: number; setIndex: (i: number) => void; projects: Project[] }) {
  const toggleFavorite = useStore((s) => s.toggleFavorite); const openSheet = useStore((s) => s.openSheet); const duplicateProject = useStore((s) => s.duplicateProject);
  const tasks = useStore((s) => s.tasks);
  const [filter, setFilter] = useState<Filter>({ kind: 'alle' });
  const types = useMemo(() => [...new Set(projects.map((p) => p.type))], [projects]);
  const areas = useMemo(() => [...new Set(projects.flatMap((p) => p.areas))], [projects]);
  const matches = (p: Project) => filter.kind === 'alle' ? true : filter.kind === 'fav' ? p.favorite : filter.kind === 'typ' ? p.type === filter.v : filter.kind === 'bereich' ? p.areas.includes(filter.v) : p.stage === filter.v;
  const p = projects[index];
  const total = projects.length;
  const go = (dir: -1 | 1) => { if (!total) return; let i = index; for (let k = 0; k < total; k++) { i = (i + dir + total) % total; if (matches(projects[i])) break; } setIndex(i); };
  useEffect(() => {
    const on = (e: KeyboardEvent) => { const t = e.target as HTMLElement; if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return; if (e.key === 'ArrowLeft') go(-1); if (e.key === 'ArrowRight') go(1); if (e.key === 'Enter' && p) navigate({ world: 'projekte', projectId: p.id }); };
    window.addEventListener('keydown', on); return () => window.removeEventListener('keydown', on);
  });
  useEffect(() => { if (p && !matches(p)) go(1); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextTask = p ? tasks.find((t) => t.projectId === p.id && !t.done && !t.skipped) : undefined;
  const matchCount = projects.filter(matches).length;
  const pillOn = (f: Filter) => JSON.stringify(f) === JSON.stringify(filter) ? ' pill--on' : '';

  return (
    <>
      <div className="world-title"><h1>Projekte</h1><p>Deine Ideen. Schritt für Schritt.</p></div>
      <div className="glass filters">
        <div className="pills" style={{ marginBottom: 6 }}>
          <button className={`pill${pillOn({ kind: 'alle' })}`} onClick={() => setFilter({ kind: 'alle' })}>Alle {projects.length}</button>
          <button className={`pill${pillOn({ kind: 'fav' })}`} onClick={() => setFilter({ kind: 'fav' })}><IStar width={12} height={12} /> Favoriten</button>
          {['Idee', 'Konstruktion', 'Planung', 'Druck', 'Nacharbeit'].filter((s) => projects.some((x) => x.stage === s)).map((s) => <button key={s} className={`pill${pillOn({ kind: 'station', v: s })}`} onClick={() => setFilter({ kind: 'station', v: s })}>{s}</button>)}
        </div>
        <div className="pills">
          {types.map((t) => <button key={t} className={`pill xs${pillOn({ kind: 'typ', v: t })}`} onClick={() => setFilter({ kind: 'typ', v: t })}>{t}</button>)}
          {areas.map((a) => <button key={a} className={`pill xs${pillOn({ kind: 'bereich', v: a })}`} onClick={() => setFilter({ kind: 'bereich', v: a })} style={{ opacity: .85 }}>{a}</button>)}
        </div>
        <p className="xs faint" style={{ marginTop: 6 }}>{matchCount} von {total} · ← → blättern · Enter öffnen</p>
      </div>
      <button className="glass carousel-nav desktop-only" style={{ left: '30%' }} onClick={() => go(-1)} aria-label="Vorheriges Projekt"><IChevL /></button>
      <button className="glass carousel-nav desktop-only" style={{ right: '30%' }} onClick={() => go(1)} aria-label="Nächstes Projekt"><IChevR /></button>

      <div className="mobile-only carousel-mobile">
        <button className="btn" onClick={() => go(-1)}><IChevL /> Zurück</button><button className="btn" onClick={() => go(1)}>Weiter <IChevR /></button>
      </div>

      {p ? (
        <Panel className="project-card" strong delay={80}
          foot={<>
            <button className="btn btn--primary" onClick={() => navigate({ world: 'projekte', projectId: p.id })}>Projekt öffnen <IArrowR width={14} height={14} /></button>
            <button className="btn btn--sm" onClick={() => openSheet({ kind: 'projektForm', projectId: p.id })}>Bearbeiten</button>
            <button className="btn btn--sm btn--icon" title="Duplizieren" onClick={() => { duplicateProject(p.id); setIndex(0); }}><ICopy width={14} height={14} /></button>
            <button className="btn btn--sm btn--icon" title="Favorit" onClick={() => toggleFavorite(p.id)} style={{ color: p.favorite ? '#ffd77a' : undefined }}><IStar width={14} height={14} fill={p.favorite ? 'currentColor' : 'none'} /></button>
            <button className="btn btn--sm" style={{ marginLeft: 'auto' }} onClick={() => openSheet({ kind: 'projektForm' })}><IPlus width={14} height={14} /> Neu</button>
          </>}>
          <div className="row row--between"><h2>{p.name}</h2><span className="pill pill--acc">{p.stage}</span></div>
          <p className="small muted">{p.description}</p>
          <div className="row small"><span className="grow">Fortschritt</span><b>{p.progress} %</b></div>
          <Progress value={p.progress} />
          <div className="pills"><span className="pill xs">{p.type}</span>{p.areas.map((a) => <span key={a} className="pill xs" style={{ opacity: .8 }}>{a}</span>)}{p.tags.map((t) => <span key={t} className="pill xs faint">#{t}</span>)}</div>
          <p className="xs muted">{nextTask ? `Nächste Aufgabe: ${nextTask.title}` : 'Keine offene Aufgabe'} · zuletzt {fmtDate(p.updatedAt)} · Priorität {['hoch', 'mittel', 'niedrig'][p.priority - 1]} · Schwierigkeit {p.difficulty}/5</p>
        </Panel>
      ) : (
        <Panel className="project-card" strong><h2>Noch keine Projekte</h2><p className="muted small">Leg dein erstes Projekt an.</p><button className="btn btn--primary" onClick={() => openSheet({ kind: 'projektForm' })}><IPlus width={14} height={14} /> Neues Projekt</button></Panel>
      )}
    </>
  );
}
