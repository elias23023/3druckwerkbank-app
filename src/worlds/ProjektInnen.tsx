import { useState } from 'react';
import type { Project } from '../types';
import { STAGES } from '../types';
import { useStore, suggestedProgress, availableGrams, printProgress } from '../store';
import { navigate } from '../router';
import { Panel, Check, Progress, Stack } from '../ui/Glass';
import { IArrowL, IPlus, IUp, IDown, IFlag, ICheck, IGit, IPrinter, IFile, ILayers, IHistory, ISkip, ISparkle, ICopy, IArchive, IImage } from '../ui/Icons';
import { fmtDate, fmtDuration, fmtGrams, relTime, id, nowIso } from '../lib/format';
import { useNow } from '../lib/time';

const VSTAT: Record<string, string> = { aktuell: 'pill--on', beste: 'pill--ok', final: 'pill--acc', verworfen: '' };
const HCOL: Record<string, string> = { angelegt: '#7cc6ff', meilenstein: '#4ccf7a', version: '#c59bff', druck: '#ffbd6b', entscheidung: '#9fd4ff', fehler: '#ff6b6b', erfahrung: '#ffe29a', material: '#8fd1a0', abgeschlossen: '#ffd77a', notiz: '#cfd6e0' };

export function ProjektInnen({ project: p }: { project: Project }) {
  const now = useNow(1000);
  const s = useStore();
  const tasks = s.tasks.filter((t) => t.projectId === p.id).sort((a, b) => a.order - b.order);
  const prints = s.prints.filter((pr) => pr.projectId === p.id).sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? '') || a.queueOrder - b.queueOrder);
  const [newTask, setNewTask] = useState(''); const [newMs, setNewMs] = useState(''); const [cmp, setCmp] = useState<string[]>([]); const [exp, setExp] = useState('');
  const sug = suggestedProgress(p);
  const ms = [...p.milestones].sort((a, b) => a.order - b.order);
  const curMs = ms.find((m) => !m.done && !m.skipped);
  const toggleCmp = (vid: string) => setCmp((c) => (c.includes(vid) ? c.filter((x) => x !== vid) : [...c.slice(-1), vid]));
  const cmpV = cmp.map((vid) => p.versions.find((v) => v.id === vid)!).filter(Boolean);
  const addPhoto = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const k = Math.min(1, 640 / Math.max(img.width, img.height)); c.width = img.width * k; c.height = img.height * k; c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); s.addFile(p.id, { id: id('f'), name: file.name, kind: 'foto', createdAt: nowIso(), dataUrl: c.toDataURL('image/jpeg', .8), size: file.size }); s.addHistory(p.id, 'notiz', `Foto hinzugefügt: ${file.name}`); };
      img.src = String(r.result);
    };
    r.readAsDataURL(file);
  };

  return (
    <>
      <div className="world-title" style={{ maxWidth: '36%' }}>
        <button className="back" onClick={() => navigate({ world: 'projekte' })}><IArrowL width={14} height={14} /> Zu den Projekten</button>
        <h1>{p.name}</h1>
        <p>{p.description}</p>
        <div className="pills" style={{ marginTop: 10 }}>
          <select className="select" style={{ width: 'auto', padding: '4px 8px', fontSize: 12 }} value={p.stage} onChange={(e) => s.setStage(p.id, e.target.value as Project['stage'])} aria-label="Entwicklungsstation">{STAGES.map((st) => <option key={st}>{st}</option>)}</select>
          <span className="pill xs">{p.type}</span>{p.areas.map((a) => <span key={a} className="pill xs">{a}</span>)}
        </div>
        <div className="row" style={{ marginTop: 10, gap: 6 }}>
          <button className="btn btn--sm" onClick={() => s.openSheet({ kind: 'projektForm', projectId: p.id })}>Bearbeiten</button>
          <button className="btn btn--sm" onClick={() => { const nid = s.duplicateProject(p.id); navigate({ world: 'projekte', projectId: nid }); }}><ICopy width={13} height={13} /> Duplizieren</button>
          {!p.archivedAt ? <button className="btn btn--sm btn--primary" onClick={() => s.openSheet({ kind: 'abschliessen', projectId: p.id })}><IArchive width={13} height={13} /> Abschließen</button> : <span className="pill pill--acc">Archiviert {fmtDate(p.archivedAt)}</span>}
        </div>
      </div>

      <div className="inner-cluster">
        <Panel className="panel--wide" title="Meilensteine" icon={<IFlag />} delay={40}
          right={<span className="xs muted">Fortschritt {p.progress} %{p.progressManual ? ' (manuell)' : ''} · Vorschlag {sug} %</span>}
          foot={<>
            <input className="input" style={{ flex: 1, padding: '5px 9px', fontSize: 13 }} placeholder="Neuer Meilenstein …" value={newMs} onChange={(e) => setNewMs(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newMs.trim()) { s.addMilestone(p.id, newMs.trim()); setNewMs(''); } }} />
            <input className="range" type="range" min={0} max={100} value={p.progress} onChange={(e) => s.setProgress(p.id, Number(e.target.value))} aria-label="Fortschritt korrigieren" style={{ width: 120 }} />
            {p.progressManual ? <button className="btn btn--sm btn--ghost" onClick={() => s.setProgress(p.id, sug, false)}>Auto</button> : null}
          </>}>
          <div className="milestone-path">
            {ms.map((m) => (
              <div key={m.id} className={`ms${m.done ? ' done' : ''}${m.skipped ? ' skip' : ''}${curMs?.id === m.id ? ' cur' : ''}`}>
                <button onClick={() => s.setMilestone(p.id, m.id, { done: !m.done, skipped: false })} title={m.done ? 'Als offen markieren' : 'Als erreicht markieren'} style={{ display: 'contents' }}><i /></button>
                <span style={{ textDecoration: m.skipped ? 'line-through' : undefined }}>{m.title}</span>
                <span className="row" style={{ gap: 2 }}>
                  <button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} title="Überspringen" onClick={() => s.setMilestone(p.id, m.id, { skipped: !m.skipped, done: false })}><ISkip width={11} height={11} /></button>
                  <button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} title="Nach links" onClick={() => s.moveMilestone(p.id, m.id, -1)}><IUp width={11} height={11} style={{ transform: 'rotate(-90deg)' }} /></button>
                  <button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} title="Nach rechts" onClick={() => s.moveMilestone(p.id, m.id, 1)}><IDown width={11} height={11} style={{ transform: 'rotate(-90deg)' }} /></button>
                </span>
              </div>
            ))}
          </div>
          <Progress value={p.progress} />
        </Panel>

        <Panel title="Aufgaben" icon={<ICheck />} delay={80}
          foot={<input className="input" style={{ padding: '5px 9px', fontSize: 13 }} placeholder="Aufgabe hinzufügen … (Enter)" value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newTask.trim()) { s.addTask({ projectId: p.id, title: newTask.trim(), kind: 'allgemein' }); setNewTask(''); } }} />}>
          {tasks.length === 0 ? <p className="muted small">Keine Aufgaben.</p> : tasks.map((t, i) => (
            <div key={t.id} className="item" style={{ padding: '5px 8px' }}>
              <Check on={t.done} skip={t.skipped} onClick={() => s.toggleTask(t.id)} />
              <span className="grow small ellipsis" style={{ textDecoration: t.skipped ? 'line-through' : undefined, opacity: t.done || t.skipped ? .6 : 1 }}>{t.title}{t.kind !== 'allgemein' ? <span className="xs faint"> · {t.kind}</span> : null}</span>
              <button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} title="Überspringen" onClick={() => s.skipTask(t.id)}><ISkip width={11} height={11} /></button>
              <button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} disabled={i === 0} onClick={() => s.moveTask(t.id, -1)}><IUp width={11} height={11} /></button>
              <button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} disabled={i === tasks.length - 1} onClick={() => s.moveTask(t.id, 1)}><IDown width={11} height={11} /></button>
            </div>
          ))}
        </Panel>

        <Panel title="Versionen" icon={<IGit />} delay={120}
          foot={<><button className="btn btn--sm" onClick={() => s.openSheet({ kind: 'version', projectId: p.id })}><IPlus width={12} height={12} /> Version</button>{cmp.length === 2 ? <span className="xs muted">Vergleich unten</span> : <span className="xs faint">Zwei anklicken zum Vergleichen</span>}</>}>
          {p.versions.length === 0 ? <p className="muted small">Noch keine Version. Lege die erste an, sobald es ein Modell gibt.</p> : p.versions.map((v) => (
            <div key={v.id} className={`item item--click${cmp.includes(v.id) ? ' item--on' : ''}`} style={{ padding: '6px 8px' }} onClick={() => toggleCmp(v.id)}>
              <div className="grow col" style={{ gap: 2 }}>
                <div className="row"><b className="small">{v.label}</b><span className={`pill xs ${VSTAT[v.status]}`}>{v.status}</span><span className="xs faint" style={{ marginLeft: 'auto' }}>{fmtDate(v.createdAt)}</span></div>
                <span className="xs muted ellipsis">{v.changes.join(' · ')}</span>
              </div>
              <select className="select" style={{ width: 'auto', padding: '2px 6px', fontSize: 11 }} value={v.status} onClick={(e) => e.stopPropagation()} onChange={(e) => s.setVersionStatus(p.id, v.id, e.target.value as typeof v.status)} aria-label="Status">
                <option value="aktuell">aktuell</option><option value="beste">beste</option><option value="final">final</option><option value="verworfen">verworfen</option>
              </select>
            </div>
          ))}
          {cmpV.length === 2 ? (
            <div className="grid2 small" style={{ background: 'rgba(0,0,0,.2)', borderRadius: 10, padding: 8 }}>
              {cmpV.map((v) => <div key={v.id} className="col"><b>{v.label}</b><span className="xs muted">Maße: {v.dims ?? '–'}</span><span className="xs muted">Material: {v.material ?? '–'}</span><span className="xs muted">Einstellungen: {v.settings ?? '–'}</span><span className="xs">{v.changes.map((c) => <span key={c} className="pill xs" style={{ margin: '2px 2px 0 0', background: cmpV.every((o) => o.changes.includes(c)) ? undefined : 'rgba(255,189,107,.25)' }}>{c}</span>)}</span></div>)}
            </div>
          ) : null}
        </Panel>

        <Panel title="Drucke" icon={<IPrinter />} delay={160}
          foot={<><button className="btn btn--sm" onClick={() => s.openSheet({ kind: 'neuerDruck', projectId: p.id })}><IPlus width={12} height={12} /> Druck planen</button><span className="xs faint">{prints.filter((x) => x.status === 'fertig').length} fertig · {prints.filter((x) => x.result === 'fehldruck').length} Fehldruck</span></>}>
          {prints.length === 0 ? <p className="muted small">Noch kein Druck.</p> : prints.slice(0, 6).map((pr) => (
            <div key={pr.id} className="item item--click" style={{ padding: '6px 8px' }} onClick={() => s.openSheet({ kind: 'druck', printId: pr.id })}>
              <div className="grow col" style={{ gap: 2 }}>
                <div className="row"><span className="small ellipsis grow">{pr.name}</span><span className={`pill xs ${pr.status === 'läuft' ? 'pill--on' : pr.result === 'erfolg' ? 'pill--ok' : pr.result === 'fehldruck' ? 'pill--bad' : pr.result === 'nacharbeit' ? 'pill--warn' : ''}`}>{pr.status === 'fertig' ? pr.result : pr.status}</span></div>
                {pr.status === 'läuft' ? <Progress value={printProgress(pr, now.getTime()) * 100} /> : <span className="xs muted">{pr.kind === 'test' ? 'Testdruck' : 'Finaldruck'} · {s.devices.find((d) => d.id === pr.printerId)?.name} · {fmtDuration(pr.estimatedMinutes)} · {pr.gramsUsed ?? pr.gramsPlanned} g{pr.finishedAt ? ` · ${relTime(pr.finishedAt, now.getTime())}` : ''}</span>}
              </div>
            </div>
          ))}
        </Panel>

        <Panel title="Dateien & Fotos" icon={<IFile />} delay={200}
          foot={<label className="btn btn--sm"><IImage width={12} height={12} /> Foto hinzufügen<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.currentTarget.value = ''; }} /></label>}>
          {p.files.length === 0 ? <p className="muted small">Noch keine Dateien.</p> : (
            <div className="grid3">
              {p.files.map((f) => (
                <div key={f.id} className="col" style={{ alignItems: 'center', gap: 3 }} title={f.name}>
                  <div className="thumb" style={{ width: '100%', height: 54, borderRadius: 8 }}>{f.dataUrl ? <img src={f.dataUrl} alt="" /> : <span className="xs muted" style={{ textTransform: 'uppercase' }}>{f.kind}</span>}</div>
                  <span className="xs ellipsis" style={{ maxWidth: '100%' }}>{f.name}</span>
                </div>
              ))}
            </div>
          )}
          <p className="xs faint">STL/3MF-Ansicht folgt später; Modelle sind hier Platzhalter.</p>
        </Panel>

        <Panel title="Material" icon={<ILayers />} delay={240} foot={<button className="btn btn--sm" onClick={() => s.openSheet({ kind: 'projektForm', projectId: p.id })}>Bedarf bearbeiten</button>}>
          {p.requiredSpools.length === 0 ? <p className="muted small">Kein Materialbedarf hinterlegt.</p> : p.requiredSpools.map((r) => {
            const sp = s.spools.find((x) => x.id === r.spoolId); if (!sp) return null;
            const avail = availableGrams(sp); const short = avail < r.grams;
            return (
              <div key={r.spoolId} className="col" style={{ gap: 3 }}>
                <div className="row small"><span className="swatch" style={{ background: sp.colorHex, width: 16, height: 16 }} /><span className="grow ellipsis">{sp.label}</span><b>{r.grams} g</b></div>
                <Stack parts={[{ value: sp.remainingGrams - sp.reservedGrams, color: '#4ccf7a', title: 'verfügbar' }, { value: sp.reservedGrams, color: '#ffb547', title: 'reserviert' }, { value: sp.initialGrams - sp.remainingGrams, color: 'rgba(255,255,255,.15)', title: 'verbraucht' }]} />
                <span className={`xs ${short ? 'pill pill--bad' : 'muted'}`} style={{ alignSelf: 'flex-start' }}>{short ? `Fehlen ${fmtGrams(r.grams - avail)} – Alternative: ${s.spools.find((x) => x.material === sp.material && x.id !== sp.id && availableGrams(x) >= r.grams)?.label ?? 'keine'}` : `${fmtGrams(avail)} verfügbar · ${sp.location}`}</span>
              </div>
            );
          })}
        </Panel>

        <Panel title="Notizen & Erfahrungen" icon={<ISparkle />} delay={280}
          foot={<input className="input" style={{ padding: '5px 9px', fontSize: 13 }} placeholder="Erfahrung festhalten … (Enter)" value={exp} onChange={(e) => setExp(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && exp.trim()) { s.addExperience(p.id, exp.trim()); setExp(''); } }} />}>
          <textarea className="textarea" defaultValue={p.notes} key={p.id} placeholder="Notizen zum Projekt …" onBlur={(e) => { if (e.target.value !== p.notes) s.setNotes(p.id, e.target.value); }} style={{ minHeight: 56 }} />
          {p.experiences.map((x, i) => <div key={i} className="row small"><ISparkle width={13} height={13} style={{ color: '#ffe29a', flex: 'none' }} /><span>{x}</span></div>)}
        </Panel>

        <Panel title="Historie" icon={<IHistory />} delay={320}>
          <div className="timeline">
            {p.history.slice(0, 12).map((h, i) => (
              <div key={h.id}>
                <div className="col" style={{ alignItems: 'center', gap: 0 }}><span className="tl-dot" style={{ background: HCOL[h.type] ?? '#fff' }} />{i < Math.min(p.history.length, 12) - 1 ? <span className="tl-line" /> : null}</div>
                <div className="col grow" style={{ gap: 0, paddingBottom: 6 }}><span className="small">{h.title}</span><span className="xs muted">{h.detail ? `${h.detail} · ` : ''}{fmtDate(h.at)}</span></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
