import { useEffect, useRef, useState } from 'react';
import { CHECKLISTS, type FileRef, type Project } from '../types';
import { liveMode } from '../lib/cloud';
import { useStore, suggestedProgress, availableGrams, printProgress } from '../store';
import { Sheet } from '../ui/Sheet';
import { Check, Progress, Stack } from '../ui/Glass';
import { IPlus, IUp, IDown, IFlag, ICheck, IGit, IPrinter, IFile, ILayers, IHistory, ISkip, ISparkle, IImage, IWrench, ITrash } from '../ui/Icons';
import { fmtDate, fmtDuration, fmtGrams, relTime, id, nowIso } from '../lib/format';
import { useNow } from '../lib/time';

export type DetailTab = 'meilensteine' | 'aufgaben' | 'versionen' | 'drucke' | 'dateien' | 'material' | 'werkzeuge' | 'notizen' | 'historie';
export const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
  { id: 'meilensteine', label: 'Meilensteine', icon: <IFlag /> }, { id: 'aufgaben', label: 'Aufgaben', icon: <ICheck /> }, { id: 'versionen', label: 'Versionen', icon: <IGit /> }, { id: 'drucke', label: 'Drucke', icon: <IPrinter /> },
  { id: 'dateien', label: 'Dateien', icon: <IFile /> }, { id: 'material', label: 'Material', icon: <ILayers /> }, { id: 'werkzeuge', label: 'Werkzeuge', icon: <IWrench /> }, { id: 'notizen', label: 'Notizen', icon: <ISparkle /> }, { id: 'historie', label: 'Historie', icon: <IHistory /> },
];
export const VSTAT: Record<string, string> = { aktuell: 'pill--on', beste: 'pill--ok', final: 'pill--acc', verworfen: '' };
export const HCOL: Record<string, string> = { angelegt: '#7cc6ff', meilenstein: '#4ccf7a', version: '#c59bff', druck: '#ffbd6b', entscheidung: '#9fd4ff', fehler: '#ff6b6b', erfahrung: '#ffe29a', material: '#8fd1a0', abgeschlossen: '#ffd77a', notiz: '#cfd6e0' };

export function MilestonesFull({ p }: { p: Project }) {
  const s = useStore(); const [newMs, setNewMs] = useState('');
  const sug = suggestedProgress(p); const ms = [...p.milestones].sort((a, b) => a.order - b.order);
  return (
    <>
      <div className="row small"><span className="grow">Fortschritt {p.progress} %{p.progressManual ? ' (manuell)' : ''} · Vorschlag {sug} %</span>{p.progressManual ? <button className="btn btn--sm btn--ghost" onClick={() => s.setProgress(p.id, sug, false)}>Auto</button> : null}</div>
      <input className="range" type="range" min={0} max={100} value={p.progress} onChange={(e) => s.setProgress(p.id, Number(e.target.value))} aria-label="Fortschritt korrigieren" />
      <div className="list">
        {ms.map((m, i) => (
          <div key={m.id} className="item" style={{ padding: '6px 8px' }}>
            <Check on={m.done} skip={m.skipped} onClick={() => s.setMilestone(p.id, m.id, { done: !m.done, skipped: false })} />
            <span className="grow small" style={{ textDecoration: m.skipped ? 'line-through' : undefined }}>{m.title}</span>
            <button className="btn btn--icon btn--ghost" style={{ width: 24, height: 24 }} title="Überspringen" aria-label="Überspringen" onClick={() => s.setMilestone(p.id, m.id, { skipped: !m.skipped, done: false })}><ISkip width={12} height={12} /></button>
            <button className="btn btn--icon btn--ghost" style={{ width: 24, height: 24 }} disabled={i === 0} aria-label="Nach oben" onClick={() => s.moveMilestone(p.id, m.id, -1)}><IUp width={12} height={12} /></button>
            <button className="btn btn--icon btn--ghost" style={{ width: 24, height: 24 }} disabled={i === ms.length - 1} aria-label="Nach unten" onClick={() => s.moveMilestone(p.id, m.id, 1)}><IDown width={12} height={12} /></button>
          </div>
        ))}
      </div>
      <input className="input" placeholder="Neuer Meilenstein … (Enter)" value={newMs} onChange={(e) => setNewMs(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newMs.trim()) { s.addMilestone(p.id, newMs.trim()); setNewMs(''); } }} />
    </>
  );
}

export function TasksFull({ p }: { p: Project }) {
  const s = useStore(); const [newTask, setNewTask] = useState('');
  const tasks = s.tasks.filter((t) => t.projectId === p.id).sort((a, b) => a.order - b.order);
  return (
    <>
      <div className="list">
        {tasks.length === 0 ? <p className="muted small">Keine Aufgaben.</p> : tasks.map((t, i) => (
          <div key={t.id} className="item" style={{ padding: '6px 8px' }}>
            <Check on={t.done} skip={t.skipped} onClick={() => s.toggleTask(t.id)} />
            <span className="grow small ellipsis" style={{ textDecoration: t.skipped ? 'line-through' : undefined, opacity: t.done || t.skipped ? .6 : 1 }}>{t.title}{t.kind !== 'allgemein' ? <span className="xs faint"> · {t.kind}</span> : null}</span>
            <button className="btn btn--icon btn--ghost" style={{ width: 24, height: 24 }} title="Überspringen" aria-label="Überspringen" onClick={() => s.skipTask(t.id)}><ISkip width={12} height={12} /></button>
            <button className="btn btn--icon btn--ghost" style={{ width: 24, height: 24 }} disabled={i === 0} aria-label="Nach oben" onClick={() => s.moveTask(t.id, -1)}><IUp width={12} height={12} /></button>
            <button className="btn btn--icon btn--ghost" style={{ width: 24, height: 24 }} disabled={i === tasks.length - 1} aria-label="Nach unten" onClick={() => s.moveTask(t.id, 1)}><IDown width={12} height={12} /></button>
            <button className="btn btn--icon btn--ghost" style={{ width: 24, height: 24 }} title="Löschen" aria-label={`Aufgabe „${t.title}“ löschen`} onClick={() => s.deleteTask(t.id)}><ITrash width={12} height={12} /></button>
          </div>
        ))}
      </div>
      <input className="input" placeholder="Aufgabe hinzufügen … (Enter)" value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newTask.trim()) { s.addTask({ projectId: p.id, title: newTask.trim(), kind: 'allgemein' }); setNewTask(''); } }} />
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}><span className="xs muted">Checkliste einfügen:</span>{Object.entries(CHECKLISTS).map(([k, items]) => <button key={k} className="pill xs" onClick={() => { s.addTasks(p.id, items.filter((t) => !tasks.some((x) => x.title === t)), k === 'Nachbearbeitung' ? 'nacharbeit' : 'druck'); s.toast(`Checkliste „${k}“ eingefügt`); }}>+ {k} ({items.length})</button>)}</div>
      <span className="xs faint">Nicht zutreffende Punkte überspringen statt abhaken; eine leere Liste hat keinen Fortschritt.</span>
    </>
  );
}

export function VersionsFull({ p }: { p: Project }) {
  const s = useStore(); const [cmp, setCmp] = useState<string[]>([]);
  const toggleCmp = (vid: string) => setCmp((c) => (c.includes(vid) ? c.filter((x) => x !== vid) : [...c.slice(-1), vid]));
  const cmpV = cmp.map((vid) => p.versions.find((v) => v.id === vid)!).filter(Boolean);
  return (
    <>
      <div className="list">
        {p.versions.length === 0 ? <p className="muted small">Noch keine Version.</p> : p.versions.map((v) => (
          <div key={v.id} className={`item item--click${cmp.includes(v.id) ? ' item--on' : ''}`} style={{ padding: '6px 8px' }} onClick={() => toggleCmp(v.id)}>
            <div className="grow col" style={{ gap: 2 }}>
              <div className="row"><b className="small">{v.label}</b><span className={`pill xs ${VSTAT[v.status]}`}>{v.status}</span><span className="xs faint" style={{ marginLeft: 'auto' }}>{fmtDate(v.createdAt)}</span></div>
              <span className="xs muted">{v.changes.join(' · ')}{v.dims ? ` · ${v.dims}` : ''}{v.material ? ` · ${v.material}` : ''}</span>
            </div>
            <select className="select" style={{ width: 'auto', padding: '2px 6px', fontSize: 11 }} value={v.status} onClick={(e) => e.stopPropagation()} onChange={(e) => s.setVersionStatus(p.id, v.id, e.target.value as typeof v.status)} aria-label="Status"><option value="aktuell">aktuell</option><option value="beste">beste</option><option value="final">final</option><option value="verworfen">verworfen</option></select>
            <button className="btn btn--sm btn--ghost" onClick={(e) => { e.stopPropagation(); s.openSheet({ kind: 'version', projectId: p.id, versionId: v.id }); }}>Bearbeiten</button>
          </div>
        ))}
      </div>
      <div className="row"><button className="btn btn--sm" onClick={() => s.openSheet({ kind: 'version', projectId: p.id })}><IPlus width={12} height={12} /> Version anlegen</button><span className="xs faint">{cmp.length === 2 ? 'Vergleich:' : 'Zwei Versionen anklicken zum Vergleichen'}</span></div>
      {cmpV.length === 2 ? (
        <div className="grid2 small" style={{ background: 'rgba(0,0,0,.2)', borderRadius: 10, padding: 8 }}>
          {cmpV.map((v) => <div key={v.id} className="col"><b>{v.label} <span className={`pill xs ${VSTAT[v.status]}`}>{v.status}</span></b><span className="xs muted">Maße: {v.dims ?? '–'}</span><span className="xs muted">Material: {v.material ?? '–'}</span><span className="xs muted">Einstellungen: {v.settings ?? '–'}</span><span className="xs">{v.changes.map((c) => <span key={c} className="pill xs" style={{ margin: '2px 2px 0 0', background: cmpV.every((o) => o.changes.includes(c)) ? undefined : 'rgba(255,189,107,.25)' }}>{c}</span>)}</span>{v.notes ? <span className="xs">{v.notes}</span> : null}</div>)}
        </div>
      ) : null}
    </>
  );
}

export function PrintsFull({ p }: { p: Project }) {
  const s = useStore(); const now = useNow(1000);
  const prints = s.prints.filter((pr) => pr.projectId === p.id).sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? '') || a.queueOrder - b.queueOrder);
  return (
    <>
      <div className="list">
        {prints.length === 0 ? <p className="muted small">Noch kein Druck.</p> : prints.map((pr) => (
          <div key={pr.id} className="item item--click" style={{ padding: '6px 8px' }} onClick={() => s.openSheet({ kind: 'druck', printId: pr.id })}>
            <div className="grow col" style={{ gap: 2 }}>
              <div className="row"><span className="small ellipsis grow">{pr.name}</span><span className={`pill xs ${pr.status === 'läuft' ? 'pill--on' : pr.result === 'erfolg' ? 'pill--ok' : pr.result === 'fehldruck' ? 'pill--bad' : pr.result === 'nacharbeit' ? 'pill--warn' : ''}`}>{pr.status === 'fertig' ? pr.result : pr.status}</span></div>
              {pr.status === 'läuft' ? <Progress value={printProgress(pr, now.getTime()) * 100} /> : <span className="xs muted">{pr.kind === 'test' ? 'Testdruck' : 'Finaldruck'} · {s.devices.find((d) => d.id === pr.printerId)?.name ?? 'Drucker'} · {fmtDuration(pr.estimatedMinutes)} · {pr.gramsUsed ?? pr.gramsPlanned} g{pr.finishedAt ? ` · ${relTime(pr.finishedAt, now.getTime())}` : ''}{pr.notes ? ` · ${pr.notes}` : ''}</span>}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => s.openSheet({ kind: 'neuerDruck', projectId: p.id })}><IPlus width={12} height={12} /> Neuen Druck planen</button>
    </>
  );
}

/** Im Node-Build mit Konto landen Fotos und Dateien als echte Dateien auf dem Server, sonst als kleines Bild im Browser. */
const upload = async (file: Blob, name: string) => (liveMode ? (await import('../lib/live')).uploadFile(file, name) : null);
const KIND: Record<string, FileRef['kind']> = { stl: 'stl', '3mf': '3mf', mp4: 'zeitraffer', webm: 'zeitraffer', mov: 'zeitraffer' };

export function useAddPhoto(p: Project) {
  const s = useStore();
  return (file: File) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onerror = () => { URL.revokeObjectURL(url); s.toast('Das Bild konnte nicht gelesen werden.'); };
    img.onload = async () => {
      const draw = (max: number) => { const c = document.createElement('canvas'); const k = Math.min(1, max / Math.max(img.width, img.height)); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); return c; };
      const add = (dataUrl: string, size: number) => { s.addFile(p.id, { id: id('f'), name: file.name, kind: 'foto', createdAt: nowIso(), dataUrl, size }); s.addHistory(p.id, 'notiz', `Foto hinzugefügt: ${file.name}`); };
      try {
        const big = await new Promise<Blob | null>((ok) => draw(2000).toBlob(ok, 'image/jpeg', .86));
        const up = big ? await upload(big, file.name) : null;
        if (up) add(up.url, up.size); else add(draw(640).toDataURL('image/jpeg', .8), file.size);
      } catch (e) { s.toast(e instanceof Error ? e.message : 'Das Foto konnte nicht gespeichert werden.'); }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };
}
export function useAddFile(p: Project) {
  const s = useStore();
  return async (file: File) => {
    if (file.size > 25 * 1024 * 1024) { s.toast('Die Datei ist zu groß (über 25 MB).'); return; }
    try {
      const up = await upload(file, file.name);
      if (!up) { s.toast('Dateien lassen sich nur speichern, wenn du angemeldet und verbunden bist.'); return; }
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      s.addFile(p.id, { id: id('f'), name: file.name, kind: up.image ? 'foto' : KIND[ext] ?? 'sonstiges', createdAt: nowIso(), ...(up.image ? { dataUrl: up.url } : {}), url: up.url, size: up.size });
      s.addHistory(p.id, 'notiz', `Datei hinzugefügt: ${file.name}`);
    } catch (e) { s.toast(e instanceof Error ? e.message : 'Die Datei konnte nicht hochgeladen werden.'); }
  };
}

export function FilesFull({ p }: { p: Project }) {
  const addPhoto = useAddPhoto(p); const addFile = useAddFile(p); const removeFile = useStore((st) => st.removeFile);
  return (
    <>
      {p.files.length === 0 ? <p className="muted small">Noch keine Dateien.</p> : (
        <div className="grid3">
          {p.files.map((f) => <div key={f.id} className="col" style={{ alignItems: 'center', gap: 3 }} title={f.name}><div className="thumb" style={{ width: '100%', height: 64, borderRadius: 8 }}>{f.dataUrl ? <img src={f.dataUrl} alt="" /> : <span className="xs muted" style={{ textTransform: 'uppercase' }}>{f.kind}</span>}</div>{f.url ? <a className="xs ellipsis" style={{ maxWidth: '100%' }} href={f.url} download={f.name} title="Herunterladen">{f.name}</a> : <span className="xs ellipsis" style={{ maxWidth: '100%' }}>{f.name}</span>}<span className="row xs faint" style={{ gap: 4 }}>{f.size ? `${(f.size / 1e6).toFixed(1)} MB` : fmtDate(f.createdAt)}<button className="btn btn--icon btn--ghost" style={{ width: 20, height: 20 }} title="Datei entfernen" aria-label={`${f.name} entfernen`} onClick={() => { if (confirm(`„${f.name}“ aus dem Projekt entfernen?`)) removeFile(p.id, f.id); }}><ITrash width={11} height={11} /></button></span></div>)}
        </div>
      )}
      <div className="row" style={{ flexWrap: 'wrap' }}>
        <label className="btn btn--sm"><IImage width={12} height={12} /> Foto hinzufügen<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) addPhoto(f); e.currentTarget.value = ''; }} /></label>
        {liveMode ? <label className="btn btn--sm"><IFile width={12} height={12} /> Datei hinzufügen<input type="file" aria-label="Datei hinzufügen" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void addFile(f); e.currentTarget.value = ''; }} /></label> : null}
      </div>
      <p className="xs faint">{liveMode ? 'Mit Konto liegen Fotos und Dateien (STL, 3MF, bis 25 MB) auf dem Server. Eine 3D-Ansicht folgt später.' : 'STL/3MF-Ansicht folgt später; Modelle sind hier Platzhalter.'}</p>
    </>
  );
}

export function MaterialFull({ p }: { p: Project }) {
  const s = useStore();
  return (
    <>
      {p.requiredSpools.length === 0 ? <p className="muted small">Kein Materialbedarf hinterlegt.</p> : p.requiredSpools.map((r) => {
        const sp = s.spools.find((x) => x.id === r.spoolId); if (!sp) return null;
        const avail = availableGrams(sp); const short = avail < r.grams;
        return (
          <div key={r.spoolId} className="col" style={{ gap: 3 }}>
            <div className="row small"><span className="swatch" style={{ background: sp.colorHex, width: 16, height: 16 }} /><span className="grow ellipsis">{sp.label}</span><b>{r.grams} g</b></div>
            <Stack parts={[{ value: avail, color: '#4ccf7a', title: 'verfügbar' }, { value: sp.reservedGrams, color: '#ffb547', title: 'reserviert' }, { value: sp.initialGrams - sp.remainingGrams, color: 'rgba(255,255,255,.15)', title: 'verbraucht' }]} />
            <span className={`xs ${short ? 'pill pill--bad' : 'muted'}`} style={{ alignSelf: 'flex-start' }}>{short ? `Fehlen ${fmtGrams(r.grams - avail)} – Alternative: ${s.spools.find((x) => x.material === sp.material && x.id !== sp.id && availableGrams(x) >= r.grams)?.label ?? 'keine'}` : `${fmtGrams(avail)} verfügbar · ${sp.location}`}</span>
          </div>
        );
      })}
      <button className="btn btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => s.openSheet({ kind: 'projektForm', projectId: p.id })}>Bedarf bearbeiten</button>
    </>
  );
}

export function ToolsFull({ p }: { p: Project }) {
  const s = useStore();
  const tools = s.devices.filter((d) => d.kind === 'werkzeug').sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const ids = p.toolIds ?? [];
  const col: Record<string, string> = { 'verfügbar': 'pill--ok', 'im Einsatz': 'pill--warn', fehlt: 'pill--bad' };
  return (
    <>
      {tools.length === 0 ? <p className="muted small">Noch kein Werkzeug angelegt. Leg dein erstes Werkzeug an, es wird diesem Projekt gleich zugeordnet.</p> : (
        <div className="list">
          {tools.map((t) => (
            <div key={t.id} className="item" style={{ padding: '6px 8px' }}>
              <label className="row grow" style={{ cursor: 'pointer', minWidth: 0 }}>
                <input type="checkbox" checked={ids.includes(t.id)} onChange={(e) => s.setProjectTools(p.id, e.target.checked ? [...ids, t.id] : ids.filter((x) => x !== t.id))} />
                <div className="grow col" style={{ gap: 0, minWidth: 0 }}><b className="small">{t.name}</b><span className="xs muted ellipsis">{[t.model, t.location, t.notes].filter(Boolean).join(' · ') || 'ohne Angaben'}</span></div>
              </label>
              <select className={`select pill xs ${col[t.status] ?? ''}`} style={{ width: 'auto', padding: '2px 6px' }} value={t.status} aria-label={`Status ${t.name}`} onChange={(e) => s.setToolStatus(t.id, e.target.value as typeof t.status)}><option value="verfügbar">verfügbar</option><option value="im Einsatz">im Einsatz</option><option value="fehlt">fehlt</option></select>
              <button className="btn btn--sm btn--ghost" onClick={() => s.openSheet({ kind: 'geraetForm', deviceId: t.id, projectId: p.id })}>Bearbeiten</button>
            </div>
          ))}
        </div>
      )}
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}><button className="btn btn--sm btn--primary" onClick={() => s.openSheet({ kind: 'geraetForm', deviceKind: 'werkzeug', projectId: p.id })}><IPlus width={12} height={12} /> Neues Werkzeug</button><button className="btn btn--sm" onClick={() => s.openSheet({ kind: 'geraete', tab: 'werkzeuge' })}>Alle Werkzeuge verwalten</button></div>
      <p className="xs faint">Haken setzen, um ein Werkzeug diesem Projekt zuzuordnen. Werkzeuge sind wiederverwendbar und werden nicht wie Material verbraucht.</p>
    </>
  );
}

/** Notizfeld, das beim Verlassen des Felds und beim Schließen speichert (kein Verlust bei Esc oder Klick daneben). */
export function NotesField({ p, minHeight }: { p: Project; minHeight?: number }) {
  const [notes, setNotes] = useState(p.notes);
  const ref = useRef(notes); ref.current = notes;
  const save = () => { const cur = useStore.getState().projects.find((x) => x.id === p.id); if (cur && cur.notes !== ref.current) useStore.getState().setNotes(p.id, ref.current); };
  useEffect(() => save, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return <textarea className="textarea" value={notes} placeholder="Notizen zum Projekt …" onChange={(e) => setNotes(e.target.value)} onBlur={save} style={minHeight ? { minHeight } : undefined} />;
}

export function NotesFull({ p }: { p: Project }) {
  const s = useStore(); const [exp, setExp] = useState('');
  return (
    <>
      <NotesField p={p} key={p.id} minHeight={90} />
      <b className="small">Erfahrungen</b>
      {p.experiences.length === 0 ? <p className="muted small">Noch keine festgehalten.</p> : p.experiences.map((x, i) => <div key={i} className="row small"><ISparkle width={13} height={13} style={{ color: '#ffe29a', flex: 'none' }} /><span>{x}</span></div>)}
      <input className="input" placeholder="Erfahrung festhalten … (Enter)" value={exp} onChange={(e) => setExp(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && exp.trim()) { s.addExperience(p.id, exp.trim()); setExp(''); } }} />
    </>
  );
}

export function HistoryFull({ p, limit }: { p: Project; limit?: number }) {
  const items = limit ? p.history.slice(0, limit) : p.history;
  return (
    <div className="timeline">
      {items.map((h, i) => (
        <div key={h.id}>
          <div className="col" style={{ alignItems: 'center', gap: 0 }}><span className="tl-dot" style={{ background: HCOL[h.type] ?? '#fff' }} />{i < items.length - 1 ? <span className="tl-line" /> : null}</div>
          <div className="col grow" style={{ gap: 0, paddingBottom: 6 }}><span className="small">{h.title}</span><span className="xs muted">{h.detail ? `${h.detail} · ` : ''}{fmtDate(h.at)}</span></div>
        </div>
      ))}
    </div>
  );
}

export function ProjektDetailSheet({ projectId, tab: initial }: { projectId: string; tab: DetailTab }) {
  const s = useStore(); const p = s.projects.find((x) => x.id === projectId); const [tab, setTab] = useState<DetailTab>(initial);
  if (!p) return null;
  const t = TABS.find((x) => x.id === tab)!;
  return (
    <Sheet title={`${p.name} · ${t.label}`} icon={t.icon} onClose={s.closeSheet}>
      <div className="tabs" style={{ flexWrap: 'wrap' }}>{TABS.map((x) => <button key={x.id} className={x.id === tab ? 'on' : ''} onClick={() => setTab(x.id)}>{x.label}</button>)}</div>
      {tab === 'meilensteine' ? <MilestonesFull p={p} /> : tab === 'aufgaben' ? <TasksFull p={p} /> : tab === 'versionen' ? <VersionsFull p={p} /> : tab === 'drucke' ? <PrintsFull p={p} /> : tab === 'dateien' ? <FilesFull p={p} /> : tab === 'material' ? <MaterialFull p={p} /> : tab === 'werkzeuge' ? <ToolsFull p={p} /> : tab === 'notizen' ? <NotesFull p={p} /> : <HistoryFull p={p} />}
    </Sheet>
  );
}
