import { useState } from 'react';
import type { Project } from '../types';
import { STAGES } from '../types';
import { useStore, availableGrams, printProgress } from '../store';
import { navigate } from '../router';
import { Panel, Progress, Stack } from '../ui/Glass';
import { IArrowL, IPlus, IFlag, ICheck, IGit, IPrinter, IFile, ILayers, IHistory, ICopy, IArchive, IImage, IWrench, ISparkle, IChevR } from '../ui/Icons';
import { fmtDate, fmtDuration, fmtGrams } from '../lib/format';
import { useNow } from '../lib/time';
import { HCOL, VSTAT, useAddPhoto, type DetailTab } from '../forms/ProjektDetail';
import { Check } from '../ui/Glass';

export function ProjektInnen({ project: p }: { project: Project }) {
  const now = useNow(1000);
  const s = useStore();
  const tasks = s.tasks.filter((t) => t.projectId === p.id).sort((a, b) => a.order - b.order);
  const prints = s.prints.filter((pr) => pr.projectId === p.id).sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? '') || a.queueOrder - b.queueOrder);
  const [tab, setTab] = useState<'bilder' | '3d' | 'notizen'>('bilder');
  const [newTask, setNewTask] = useState('');
  const addPhoto = useAddPhoto(p);
  const ms = [...p.milestones].sort((a, b) => a.order - b.order);
  const curMs = ms.find((m) => !m.done && !m.skipped);
  const open = (t: DetailTab) => s.openSheet({ kind: 'projektDetail', projectId: p.id, tab: t });
  const More = ({ t }: { t: DetailTab }) => <button className="btn btn--icon btn--ghost" style={{ width: 24, height: 24 }} title="Alles anzeigen" onClick={() => open(t)}><IChevR width={14} height={14} /></button>;
  const tools = s.devices.filter((d) => d.kind === 'werkzeug' && (p.toolIds ?? []).includes(d.id));
  const toolCol: Record<string, string> = { 'verfügbar': '#4ccf7a', 'im Einsatz': '#ffb547', fehlt: '#ff6b6b' };
  const photos = p.files.filter((f) => f.dataUrl || f.kind === 'foto' || f.kind === 'skizze');

  return (
    <>
      <div className="world-title" style={{ maxWidth: '26%', top: '10%' }}>
        <button className="back" onClick={() => navigate({ world: 'projekte' })}><IArrowL width={14} height={14} /> Projekte</button>
        <h1 style={{ fontSize: 'clamp(22px, 2.5cqw, 36px)' }}>{p.name}{p.favorite ? <span style={{ color: '#ffd77a', marginLeft: 8 }}>★</span> : null}</h1>
        <p className="small">{p.description}</p>
        <div className="pills" style={{ marginTop: 8 }}>
          <select className="glass select" style={{ width: 'auto', padding: '3px 8px', fontSize: 12 }} value={p.stage} onChange={(e) => s.setStage(p.id, e.target.value as Project['stage'])} aria-label="Entwicklungsstation">{STAGES.map((st) => <option key={st}>{st}</option>)}</select>
          <span className="glass pill xs">{p.type}</span>{p.areas.slice(0, 2).map((a) => <span key={a} className="glass pill xs">{a}</span>)}{p.areas.length > 2 ? <span className="glass pill xs" title={p.areas.slice(2).join(', ')}>+{p.areas.length - 2}</span> : null}
        </div>
        <div className="row" style={{ marginTop: 8, gap: 6, flexWrap: 'wrap' }}>
          <button className="glass btn btn--sm" onClick={() => s.openSheet({ kind: 'projektForm', projectId: p.id })}>Bearbeiten</button>
          <button className="glass btn btn--sm" onClick={() => { const nid = s.duplicateProject(p.id); if (nid) navigate({ world: 'projekte', projectId: nid }); }}><ICopy width={13} height={13} /> Duplizieren</button>
          <button className="glass btn btn--sm" onClick={() => s.setTemplate(p.id, !p.isTemplate)}>{p.isTemplate ? '★ Vorlage' : 'Als Vorlage'}</button>
          {!p.archivedAt ? <button className="btn btn--sm btn--primary" onClick={() => s.openSheet({ kind: 'abschliessen', projectId: p.id })}><IArchive width={13} height={13} /> Abschließen</button> : <span className="pill pill--acc">Archiviert {fmtDate(p.archivedAt)}</span>}
        </div>
      </div>

      {/* top centre: milestones */}
      <Panel title="Meilensteine" icon={<IFlag />} right={<><span className="xs muted">{p.progress} %</span><More t="meilensteine" /></>} style={{ left: '30%', top: '10%', width: '40%' }} delay={40}>
        <div className="milestone-path">
          {ms.map((m) => <div key={m.id} className={`ms${m.done ? ' done' : ''}${m.skipped ? ' skip' : ''}${curMs?.id === m.id ? ' cur' : ''}`}><button className="ms__btn" onClick={() => s.setMilestone(p.id, m.id, { done: !m.done, skipped: false })} title={m.done ? 'Als offen markieren' : 'Als erreicht markieren'} aria-label={`${m.title}: ${m.done ? 'als offen markieren' : 'als erreicht markieren'}`} aria-pressed={m.done}><i /></button><span style={{ textDecoration: m.skipped ? 'line-through' : undefined }}>{m.title}</span></div>)}
        </div>
        <Progress value={p.progress} />
      </Panel>

      {/* left column */}
      <Panel title="Versionen" icon={<IGit />} right={<More t="versionen" />} style={{ left: '3.2%', top: '40%', width: '22%' }} delay={80}>
        {p.versions.length === 0 ? <p className="muted small">Noch keine Version.</p> : (
          <div className="row" style={{ gap: 6 }}>
            {p.versions.slice(-3).map((v) => <button key={v.id} className={`col glass`} style={{ flex: 1, padding: 8, borderRadius: 10, alignItems: 'center', gap: 3, border: v.status === 'aktuell' ? '1px solid #7cc6ff' : undefined }} onClick={() => open('versionen')}><IGit width={18} height={18} /><b className="small">{v.label}</b><span className={`pill xs ${VSTAT[v.status]}`}>{v.status}</span></button>)}
          </div>
        )}
        <button className="btn btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => open('versionen')}>Versionen vergleichen <IChevR width={12} height={12} /></button>
      </Panel>
      <Panel title="Material" icon={<ILayers />} right={<More t="material" />} style={{ left: '3.2%', top: '62%', width: '22%' }} delay={120}>
        {p.requiredSpools.length === 0 ? <p className="muted small">Kein Bedarf hinterlegt.</p> : p.requiredSpools.slice(0, 2).map((r) => { const sp = s.spools.find((x) => x.id === r.spoolId); if (!sp) return null; const avail = availableGrams(sp); const short = avail < r.grams; return (
          <div key={r.spoolId} className="row small"><span className="swatch" style={{ background: sp.colorHex, width: 30, height: 30 }} /><div className="col grow" style={{ gap: 2 }}><b>{sp.label}</b><span className="xs muted">{fmtGrams(avail)} verfügbar · {r.grams} g benötigt</span><Stack parts={[{ value: avail, color: '#4ccf7a' }, { value: sp.reservedGrams, color: '#ffb547' }, { value: sp.initialGrams - sp.remainingGrams, color: 'rgba(255,255,255,.15)' }]} /><span className={`pill xs ${short ? 'pill--bad' : 'pill--ok'}`} style={{ alignSelf: 'flex-start' }}>{short ? `fehlen ${fmtGrams(r.grams - avail)}` : 'reserviert für Druck'}</span></div></div>
        ); })}
      </Panel>

      {/* right column */}
      <Panel title="Drucke" icon={<IPrinter />} right={<More t="drucke" />} style={{ right: '3.2%', top: '28%', width: '22%' }} delay={100}
        foot={<button className="btn btn--sm" onClick={() => s.openSheet({ kind: 'neuerDruck', projectId: p.id })}><IPlus width={12} height={12} /> Neuen Druck planen</button>}>
        {prints.length === 0 ? <p className="muted small">Noch kein Druck.</p> : prints.slice(0, 3).map((pr) => (
          <div key={pr.id} className="row small item--click" style={{ gap: 8 }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') s.openSheet({ kind: 'druck', printId: pr.id }); }} onClick={() => s.openSheet({ kind: 'druck', printId: pr.id })}>
            <span className="dot" style={{ background: pr.status === 'läuft' ? '#7cc6ff' : pr.result === 'erfolg' ? '#4ccf7a' : pr.result === 'fehldruck' ? '#ff6b6b' : pr.result === 'nacharbeit' ? '#ffb547' : '#8a8f96' }} />
            <span className="grow ellipsis">{pr.name}</span>
            <span className="xs muted" style={{ flex: 'none', whiteSpace: 'nowrap' }}>{pr.status === 'läuft' ? (pr.resultDue ? 'Ergebnis buchen' : `${Math.round(printProgress(pr, now.getTime()) * 100)} %`) : pr.status === 'fertig' ? fmtDate(pr.finishedAt).slice(0, 6) : pr.status}</span>
            <span className="xs faint" style={{ flex: 'none', whiteSpace: 'nowrap', textAlign: 'right' }}>{fmtDuration(pr.estimatedMinutes)}</span>
          </div>
        ))}
      </Panel>
      <Panel title="Dateien" icon={<IFile />} right={<More t="dateien" />} style={{ right: '3.2%', top: '53%', width: '22%' }} delay={140}>
        {p.files.length === 0 ? <p className="muted small">Noch keine Dateien.</p> : p.files.filter((f) => !f.dataUrl).slice(0, 3).map((f) => <div key={f.id} className="row small"><IFile width={14} height={14} className="muted" /><span className="grow ellipsis">{f.name}</span><span className="xs muted">{f.size ? `${(f.size / 1e6).toFixed(1)} MB` : f.kind}</span></div>)}
        <button className="btn btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => open('dateien')}>Dateien verwalten <IChevR width={12} height={12} /></button>
      </Panel>

      {/* bottom row */}
      <div className="bottom-row">
        <Panel title="Aufgaben" icon={<ICheck />} right={<More t="aufgaben" />} delay={180}
          foot={<input className="input" style={{ padding: '4px 8px', fontSize: 12 }} placeholder="Aufgabe hinzufügen … (Enter)" value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newTask.trim()) { s.addTask({ projectId: p.id, title: newTask.trim(), kind: 'allgemein' }); setNewTask(''); } }} />}>
          {tasks.filter((t) => !t.done && !t.skipped).slice(0, 3).map((t) => <div key={t.id} className="row small"><Check on={t.done} onClick={() => s.toggleTask(t.id)} /><span className="grow ellipsis">{t.title}</span>{t.due ? <span className="xs muted" style={{ flex: 'none' }}>{fmtDate(t.due).slice(0, 6)}</span> : null}</div>)}
          {tasks.filter((t) => !t.done && !t.skipped).length === 0 ? <p className="muted small">Keine offenen Aufgaben.</p> : null}
        </Panel>
        <Panel title="Werkzeuge" icon={<IWrench />} right={<More t="werkzeuge" />} delay={220}>
          {tools.length === 0 ? <div className="col" style={{ gap: 4 }}><p className="muted small">Keine Werkzeuge zugeordnet.</p><button className="btn btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => open('werkzeuge')}><IPlus width={12} height={12} /> Werkzeug zuordnen</button></div> : tools.slice(0, 3).map((t) => <div key={t.id} className="row small"><IWrench width={14} height={14} className="muted" /><span className="grow ellipsis">{t.name}</span><span className="row xs" style={{ gap: 4 }}><i className="dot" style={{ background: toolCol[t.status] ?? '#8a8f96' }} />{t.status}</span></div>)}
        </Panel>
        <Panel title={tab === 'bilder' ? 'Bilder' : tab === '3d' ? '3D-Ansicht' : 'Notizen'} icon={tab === 'notizen' ? <ISparkle /> : <IImage />} right={<div className="tabs" style={{ padding: 2 }}><button className={tab === 'bilder' ? 'on' : ''} onClick={() => setTab('bilder')} style={{ padding: '2px 8px' }}>Bilder</button><button className={tab === '3d' ? 'on' : ''} onClick={() => setTab('3d')} style={{ padding: '2px 8px' }}>3D</button><button className={tab === 'notizen' ? 'on' : ''} onClick={() => setTab('notizen')} style={{ padding: '2px 8px' }}>Notizen</button></div>} delay={260}>
          {tab === 'bilder' ? (
            <div className="row" style={{ gap: 6, overflow: 'auto' }}>
              {photos.slice(0, 4).map((f) => <div key={f.id} className="thumb" style={{ width: 50, height: 50 }} title={f.name}>{f.dataUrl ? <img src={f.dataUrl} alt="" /> : <IImage width={18} height={18} className="muted" />}</div>)}
              <label className="thumb" style={{ width: 50, height: 50, cursor: 'pointer' }} title="Foto hinzufügen"><IPlus width={18} height={18} /><input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.currentTarget.value = ''; }} /></label>
            </div>
          ) : tab === '3d' ? <p className="muted small">STL/3MF-Betrachter folgt später. {p.files.filter((f) => f.kind === 'stl' || f.kind === '3mf').map((f) => f.name).join(', ') || 'Kein Modell hinterlegt.'}</p> : (
            <><p className="small ellipsis" style={{ whiteSpace: 'normal', maxHeight: 40, overflow: 'hidden' }}>{p.notes || 'Keine Notizen.'}</p>{p.experiences[0] ? <span className="xs muted"><ISparkle width={11} height={11} style={{ color: '#ffe29a' }} /> {p.experiences[p.experiences.length - 1]}</span> : null}<button className="btn btn--sm btn--ghost" style={{ alignSelf: 'flex-start' }} onClick={() => open('notizen')}>Bearbeiten</button></>
          )}
        </Panel>
        <Panel title="Historie" icon={<IHistory />} right={<More t="historie" />} delay={300}>
          {p.history.slice(0, 3).map((h) => <div key={h.id} className="row small"><span className="dot" style={{ background: HCOL[h.type] ?? '#fff' }} /><span className="grow ellipsis">{h.title}</span><span className="xs muted" style={{ flex: 'none' }}>{fmtDate(h.at).slice(0, 6)}</span></div>)}
        </Panel>
      </div>
      <div className="hand hand--tr" style={{ top: '10%' }}>{'„Aus Ideen\nentstehen Lieblingsstücke.“'}</div>
    </>
  );
}
