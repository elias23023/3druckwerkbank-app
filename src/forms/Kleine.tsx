import { useState } from 'react';
import { useStore, printProgress, printRemainingMin, availableGrams } from '../store';
import { Sheet } from '../ui/Sheet';
import { Field, Progress, Seg, Stat, Check } from '../ui/Glass';
import { CALIBRATIONS, type VersionStatus } from '../types';
import { fmtDate, fmtDuration, fmtEur, fmtGrams, fmtNum, fmtTime, relTime } from '../lib/format';
import { useNow } from '../lib/time';
import { navigate } from '../router';
import { IPrinter, IGit, IArchive, IWrench, ILayers } from '../ui/Icons';

export function GeraetSheet({ deviceId }: { deviceId: string }) {
  const s = useStore(); const now = useNow(1000);
  const d = s.devices.find((x) => x.id === deviceId); if (!d) return null;
  const job = s.prints.find((p) => p.printerId === d.id && p.status === 'läuft');
  const history = s.prints.filter((p) => p.printerId === d.id && p.status === 'fertig').sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? '')).slice(0, 5);
  return (
    <Sheet title={`${d.name} · ${d.model}`} icon={d.kind === 'ams' ? <ILayers /> : <IPrinter />} onClose={s.closeSheet}>
      <div className="grid3"><Stat value={d.status} label="Status" /><Stat value={`${fmtNum(d.hoursTotal)} h`} label="Betriebsstunden" /><Stat value={d.nozzle ?? '–'} label="Düse" /></div>
      <p className="small muted">Standort: {d.location}{d.wattage ? ` · ≈ ${d.wattage} W im Druck (Annahme)` : ''}{d.notes ? ` · ${d.notes}` : ''}</p>
      {job ? <div className="col" style={{ gap: 4 }}><b className="small">Läuft: {job.name}</b><Progress value={printProgress(job, now.getTime()) * 100} /><span className="xs muted">noch {fmtDuration(printRemainingMin(job, now.getTime()))}</span></div> : null}
      {d.slots ? (
        <Field label="AMS-Slots · Rolle zuweisen">
          {d.slots.map((sl) => { const sp = s.spools.find((x) => x.id === sl.spoolId); return (
            <div key={sl.index} className="row small"><span className="pill xs">Slot {sl.index}</span><span className="swatch" style={{ background: sp?.colorHex ?? 'transparent', width: 16, height: 16 }} />
              <select className="select" value={sl.spoolId ?? ''} onChange={(e) => s.assignSlot(d.id, sl.index, e.target.value || undefined)}><option value="">leer</option>{s.spools.map((x) => <option key={x.id} value={x.id}>{x.label} ({fmtGrams(availableGrams(x))})</option>)}</select></div>
          ); })}
        </Field>
      ) : null}
      {d.kind === 'drucker' ? <Field label="Kalibrierung planen (Referenzzeiten, gerätebezogen prüfen)"><div className="pills">{CALIBRATIONS.map((c) => <button key={c.title} className="pill xs" onClick={() => { s.addMaintenance(d.id, `${c.title} (≈ ${c.minutes} min)`, new Date().toISOString()); s.toast('Kalibrierung eingeplant'); }}>+ {c.title} · {c.minutes} min</button>)}</div></Field> : null}
      {d.maintenance.length ? <Field label="Wartung">{d.maintenance.map((m) => <div key={m.id} className="row small"><Check on={m.done} onClick={() => s.toggleMaintenance(d.id, m.id)} /><span className="grow" style={{ textDecoration: m.done ? 'line-through' : undefined }}>{m.title}</span><span className="xs muted">{relTime(m.due, now.getTime())}</span></div>)}</Field> : null}
      {history.length ? <Field label="Letzte Drucke">{history.map((p) => <div key={p.id} className="row small"><span className={`pill xs ${p.result === 'erfolg' ? 'pill--ok' : p.result === 'fehldruck' ? 'pill--bad' : 'pill--warn'}`}>{p.result}</span><span className="grow ellipsis">{p.name}</span><span className="xs muted">{fmtDate(p.finishedAt)}</span></div>)}</Field> : null}
      <p className="xs faint">Gerätestatus und Fortschritt sind in diesem Entwurf simuliert; es besteht keine Verbindung zum Drucker.</p>
    </Sheet>
  );
}

export function DruckSheet({ printId }: { printId: string }) {
  const s = useStore(); const now = useNow(1000);
  const p = s.prints.find((x) => x.id === printId); if (!p) return null;
  const pr = s.projects.find((x) => x.id === p.projectId); const sp = s.spools.find((x) => x.id === p.spoolId); const dev = s.devices.find((x) => x.id === p.printerId);
  const [grams, setGrams] = useState(String(p.gramsPlanned));
  return (
    <Sheet title={p.name} icon={<IPrinter />} onClose={s.closeSheet}
      foot={p.status === 'läuft' || p.status === 'wartend' ? <>
        {p.status === 'läuft' ? <><input className="input" type="number" style={{ width: 80 }} value={grams} onChange={(e) => setGrams(e.target.value)} title="tatsächlich verbrauchte Gramm" /><button className="btn btn--primary btn--sm" onClick={() => { s.finishPrint(p.id, 'erfolg', Number(grams)); s.closeSheet(); }}>Erfolg</button><button className="btn btn--sm" onClick={() => { s.finishPrint(p.id, 'nacharbeit', Number(grams)); s.closeSheet(); }}>Nacharbeit nötig</button><button className="btn btn--sm btn--danger" onClick={() => { s.finishPrint(p.id, 'fehldruck', Number(grams)); s.closeSheet(); }}>Fehldruck</button></> : null}
        <button className="btn btn--sm btn--ghost" onClick={() => { s.cancelPrint(p.id); s.closeSheet(); }}>Abbrechen</button>
      </> : undefined}>
      <div className="grid3"><Stat value={p.status === "fertig" ? (p.result ?? "fertig") : p.status} label="Status" /><Stat value={fmtDuration(p.estimatedMinutes)} label="Dauer" /><Stat value={`${p.gramsUsed ?? p.gramsPlanned} g`} label={p.booked ? 'verbraucht' : 'geplant'} /></div>
      {p.status === 'läuft' ? <><Progress value={printProgress(p, now.getTime()) * 100} /><span className="xs muted">Start {fmtTime(p.startedAt!)} · noch {fmtDuration(printRemainingMin(p, now.getTime()))} · simuliert</span></> : null}
      <div className="col small" style={{ gap: 4 }}>
        <span>{p.kind === 'test' ? 'Testdruck' : 'Finaldruck'} auf <b>{dev?.name}</b></span>
        {pr ? <span>Projekt: <button className="btn btn--sm" onClick={() => { s.closeSheet(); navigate({ world: 'projekte', projectId: pr.id }); }}>{pr.name}</button> {p.versionId ? `· ${pr.versions.find((v) => v.id === p.versionId)?.label ?? ''}` : ''}</span> : null}
        {sp ? <span className="row" style={{ gap: 6 }}><span className="swatch" style={{ background: sp.colorHex, width: 14, height: 14 }} />{sp.label}</span> : null}
        {p.notes ? <span className="muted">{p.notes}</span> : null}
        <span className="muted">≈ {fmtNum(((p.estimatedMinutes / 60) * s.settings.printerWatts) / 1000, 2)} kWh · {fmtEur((((p.estimatedMinutes / 60) * s.settings.printerWatts) / 1000) * s.settings.pricePerKwh)} Strom (Schätzung)</span>
      </div>
    </Sheet>
  );
}

export function NeuerDruckSheet({ projectId }: { projectId: string }) {
  const s = useStore();
  const p = s.projects.find((x) => x.id === projectId)!;
  const printers = s.devices.filter((d) => d.kind === 'drucker');
  const [d, setD] = useState({ name: `${p.name} ${p.versions.find((v) => v.status === 'aktuell')?.label ?? ''}`.trim(), kind: 'test' as 'test' | 'final', printerId: printers[0]?.id ?? '', versionId: (p.versions.find((v) => v.status === 'aktuell')?.id ?? p.versions[0]?.id) as string | undefined, spoolId: (p.requiredSpools[0]?.spoolId ?? s.spools[0]?.id) as string | undefined, minutes: 90, grams: p.requiredSpools[0]?.grams ?? 30 });
  const sp = s.spools.find((x) => x.id === d.spoolId);
  const short = sp ? availableGrams(sp) < d.grams : false;
  return (
    <Sheet title="Druck planen" icon={<IPrinter />} onClose={s.closeSheet}
      foot={<><button className="btn btn--primary" disabled={!d.name || !d.printerId} onClick={() => { s.enqueuePrint({ projectId, versionId: d.versionId, printerId: d.printerId, spoolId: d.spoolId, name: d.name, kind: d.kind, estimatedMinutes: d.minutes, gramsPlanned: d.grams }); s.closeSheet(); }}>In Warteschlange</button><button className="btn" onClick={s.closeSheet}>Abbrechen</button></>}>
      <Field label="Bezeichnung"><input className="input" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
      <Field label="Art"><Seg value={d.kind} options={[{ v: 'test', l: 'Testdruck' }, { v: 'final', l: 'Finaldruck' }]} onChange={(v) => setD({ ...d, kind: v })} /></Field>
      <div className="grid2">
        <Field label="Drucker"><select className="select" value={d.printerId} onChange={(e) => setD({ ...d, printerId: e.target.value })}>{printers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Version"><select className="select" value={d.versionId ?? ''} onChange={(e) => setD({ ...d, versionId: e.target.value || undefined })}><option value="">–</option>{p.versions.map((v) => <option key={v.id} value={v.id}>{v.label} ({v.status})</option>)}</select></Field>
        <Field label="Dauer (min)"><input className="input" type="number" min={1} value={d.minutes} onChange={(e) => setD({ ...d, minutes: Number(e.target.value) })} /></Field>
        <Field label="Material (g)"><input className="input" type="number" min={1} value={d.grams} onChange={(e) => setD({ ...d, grams: Number(e.target.value) })} /></Field>
      </div>
      <Field label="Rolle"><select className="select" value={d.spoolId ?? ''} onChange={(e) => setD({ ...d, spoolId: e.target.value || undefined })}>{s.spools.map((x) => <option key={x.id} value={x.id}>{x.label} · {fmtGrams(availableGrams(x))} frei</option>)}</select></Field>
      {short ? <span className="pill pill--bad xs">Nur {fmtGrams(availableGrams(sp!))} verfügbar. Alternative: {s.spools.find((x) => x.material === sp!.material && x.id !== sp!.id && availableGrams(x) >= d.grams)?.label ?? 'keine passende Rolle'}</span> : <span className="xs muted">{d.grams} g werden reserviert, verbraucht wird erst beim Abschluss des Drucks.</span>}
      <p className="xs faint">Der Druck läuft in diesem Entwurf simuliert nach Zeit ab.</p>
    </Sheet>
  );
}

export function VersionSheet({ projectId, versionId }: { projectId: string; versionId?: string }) {
  const s = useStore();
  const p = s.projects.find((x) => x.id === projectId)!;
  const ex = versionId ? p.versions.find((v) => v.id === versionId) : undefined;
  const [d, setD] = useState({ label: ex?.label ?? `v${p.versions.length + 1}`, status: (ex?.status ?? 'aktuell') as VersionStatus, changes: ex?.changes.join(', ') ?? '', dims: ex?.dims ?? '', material: ex?.material ?? '', settings: ex?.settings ?? '', notes: ex?.notes ?? '' });
  return (
    <Sheet title={ex ? `Version ${ex.label}` : 'Neue Version'} icon={<IGit />} onClose={s.closeSheet}
      foot={<><button className="btn btn--primary" disabled={!d.label} onClick={() => { const v = { label: d.label, status: d.status, changes: d.changes.split(',').map((x) => x.trim()).filter(Boolean), dims: d.dims || undefined, material: d.material || undefined, settings: d.settings || undefined, notes: d.notes || undefined }; if (ex) s.updateVersion(projectId, ex.id, v); else s.addVersion(projectId, v); s.closeSheet(); }}>Speichern</button><button className="btn" onClick={s.closeSheet}>Abbrechen</button></>}>
      <div className="grid2"><Field label="Bezeichnung"><input className="input" value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} /></Field><Field label="Status"><select className="select" value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as VersionStatus })}><option value="aktuell">aktuell</option><option value="beste">beste</option><option value="final">final</option><option value="verworfen">verworfen</option></select></Field></div>
      <Field label="Änderungen (Komma-getrennt)"><input className="input" value={d.changes} onChange={(e) => setD({ ...d, changes: e.target.value })} placeholder="Klemmung 1,5 mm dicker, Kabelkanal" /></Field>
      <div className="grid2"><Field label="Maße"><input className="input" value={d.dims} onChange={(e) => setD({ ...d, dims: e.target.value })} placeholder="48 × 34 × 22 mm" /></Field><Field label="Material"><input className="input" value={d.material} onChange={(e) => setD({ ...d, material: e.target.value })} /></Field></div>
      <Field label="Druckeinstellungen"><input className="input" value={d.settings} onChange={(e) => setD({ ...d, settings: e.target.value })} placeholder="0,2 mm, 25 % Infill, 4 Wände" /></Field>
      <Field label="Notizen"><textarea className="textarea" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></Field>
    </Sheet>
  );
}

export function AbschliessenSheet({ projectId }: { projectId: string }) {
  const s = useStore();
  const p = s.projects.find((x) => x.id === projectId)!;
  const [result, setResult] = useState(''); const [lessons, setLessons] = useState(''); const [asTemplate, setAsTemplate] = useState(false);
  const open = s.tasks.filter((t) => t.projectId === p.id && !t.done && !t.skipped).length;
  const running = s.prints.some((pr) => pr.projectId === p.id && (pr.status === 'läuft' || pr.status === 'wartend'));
  return (
    <Sheet title="Projekt abschließen" icon={<IArchive />} onClose={s.closeSheet}
      foot={<><button className="btn btn--primary" disabled={!result.trim()} onClick={() => { s.archiveProject(p.id, result.trim(), lessons.split('\n').map((x) => x.trim()).filter(Boolean)); if (asTemplate) s.setTemplate(p.id, true); s.spotlight(p.id); s.closeSheet(); navigate({ world: 'archiv' }); }}>Bewusst abschließen</button><button className="btn" onClick={s.closeSheet}>Noch nicht</button></>}>
      <p className="small">„{p.name}“ wird abgeschlossen und ins Archiv übernommen. Es entsteht ein Bericht mit Versionen, Drucken, Material, Zeit und Kosten. Das Projekt bleibt vollständig erhalten.</p>
      {open ? <span className="pill pill--warn xs">{open} offene Aufgabe(n) bleiben offen</span> : null}
      {running ? <span className="pill pill--warn xs">Es gibt noch laufende oder wartende Drucke</span> : null}
      <Field label="Ergebnis in einem Satz"><input className="input" value={result} onChange={(e) => setResult(e.target.value)} placeholder="Hält, ist montiert, Ziel erreicht." autoFocus /></Field>
      <Field label="Erfahrungen (eine je Zeile)"><textarea className="textarea" value={lessons} onChange={(e) => setLessons(e.target.value)} placeholder={'PLA im Garten wird weich.\n3 mm Wandstärke reichen.'} /></Field>
      <label className="row small" style={{ cursor: 'pointer' }}><input type="checkbox" checked={asTemplate} onChange={(e) => setAsTemplate(e.target.checked)} /> Als Vorlage speichern (Meilensteine, Tags, Notizen wiederverwendbar)</label>
      <span className="xs faint">Der Bericht enthält Versionen, Drucke, Materialverbrauch, Dauer, Kosten und {p.files.length} Dateien.</span>
    </Sheet>
  );
}

export function BerichtSheet({ reportId }: { reportId: string }) {
  const s = useStore();
  const r = s.reports.find((x) => x.id === reportId); if (!r) return null;
  const p = s.projects.find((x) => x.id === r.projectId);
  return (
    <Sheet title={p?.name ?? 'Bericht'} icon={<IArchive />} onClose={s.closeSheet}
      foot={<><button className="btn btn--primary" onClick={() => { const nid = s.projectFromTemplate(r.projectId); s.closeSheet(); navigate({ world: 'projekte', projectId: nid }); }}>Als Ausgangspunkt für neues Projekt</button>{p ? <button className="btn" onClick={() => { s.closeSheet(); navigate({ world: 'projekte', projectId: p.id }); }}>Projekt ansehen</button> : null}</>}>
      <p className="small">{r.result}</p>
      <div className="grid3"><Stat value={r.printsTotal} label={`Drucke (${r.printsFailed} Fehldruck)`} /><Stat value={fmtGrams(r.gramsUsed)} label="Material" /><Stat value={`${fmtNum(r.hours, 1)} h`} label="Druckzeit" /><Stat value={fmtEur(r.costEur)} label="Kosten (Schätzung)" /><Stat value={r.versionsUsed.join(', ') || '–'} label="Versionen" /><Stat value={fmtDate(r.completedAt)} label="Abgeschlossen" /></div>
      {r.lessons.length ? <Field label="Erfahrungen">{r.lessons.map((l, i) => <span key={i} className="small">• {l}</span>)}</Field> : null}
      {p?.history.length ? <Field label="Historie">{p.history.slice(0, 8).map((h) => <span key={h.id} className="small"><span className="muted">{fmtDate(h.at)}</span> {h.title}</span>)}</Field> : null}
    </Sheet>
  );
}

export function WartungIcon() { return <IWrench />; }
