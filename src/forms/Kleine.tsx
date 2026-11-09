import { useState } from 'react';
import { useStore, printProgress, printRemainingMin, availableGrams } from '../store';
import { Sheet } from '../ui/Sheet';
import { Field, Progress, Seg, Stat, Check } from '../ui/Glass';
import { CALIBRATIONS, type Project, type VersionStatus } from '../types';
import { fmtDate, fmtDuration, fmtEur, fmtGrams, fmtNum, fmtTime, relTime } from '../lib/format';
import { useNow } from '../lib/time';
import { navigate } from '../router';
import { IPrinter, IGit, IArchive, IWrench, ITrash } from '../ui/Icons';
import { DeviceIcon } from './GeraetForm';

export function GeraetSheet({ deviceId }: { deviceId: string }) {
  const s = useStore(); const now = useNow(1000);
  const [mt, setMt] = useState(''); const [md, setMd] = useState(() => new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10));
  const d = s.devices.find((x) => x.id === deviceId); if (!d) return null;
  const job = s.prints.find((p) => p.printerId === d.id && p.status === 'läuft');
  const history = s.prints.filter((p) => p.printerId === d.id && p.status === 'fertig').sort((a, b) => (b.finishedAt ?? '').localeCompare(a.finishedAt ?? '')).slice(0, 5);
  const parent = d.parentId ? s.devices.find((x) => x.id === d.parentId) : undefined;
  const addMaint = () => { if (!mt.trim()) return; s.addMaintenance(d.id, mt.trim(), new Date(`${md || new Date().toISOString().slice(0, 10)}T12:00:00`).toISOString()); setMt(''); };
  const inWeek = () => new Date(Date.now() + 7 * 86400_000).toISOString();
  return (
    <Sheet title={d.model ? `${d.name} · ${d.model}` : d.name} icon={<DeviceIcon kind={d.kind} />} onClose={s.closeSheet}
      foot={<><button className="btn btn--primary" onClick={() => s.openSheet({ kind: 'geraetForm', deviceId: d.id })}>Bearbeiten</button><button className="btn" onClick={() => s.openSheet({ kind: 'geraete', tab: d.kind === 'werkzeug' ? 'werkzeuge' : 'geraete' })}>Alle Geräte</button></>}>
      <div className="grid3"><Stat value={d.status} label="Status" />{d.kind === 'werkzeug' ? <Stat value={d.location || '–'} label="Ort" /> : <Stat value={`${fmtNum(d.hoursTotal)} h`} label="Betriebsstunden" />}{d.kind === 'drucker' ? <Stat value={d.nozzle ?? '–'} label="Düse" /> : d.kind === 'ams' ? <Stat value={parent?.name ?? '–'} label="Drucker" /> : null}</div>
      <p className="small muted">{[d.location ? `Standort: ${d.location}` : '', d.wattage ? `≈ ${d.wattage} W im Druck` : '', d.notes ?? ''].filter(Boolean).join(' · ') || 'Noch keine weiteren Angaben. Über „Bearbeiten“ ergänzen.'}</p>
      {job ? <div className="col" style={{ gap: 4 }}><b className="small">Läuft: {job.name}</b><Progress value={printProgress(job, now.getTime()) * 100} /><span className="xs muted">{job.resultDue ? 'Druckzeit abgelaufen, Ergebnis noch nicht gebucht' : `noch ${fmtDuration(printRemainingMin(job, now.getTime()))}`}</span><button className="btn btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => s.openSheet({ kind: 'druck', printId: job.id })}>Ergebnis buchen</button></div> : null}
      {d.slots ? (
        <Field label="Slots · Rolle zuweisen">
          {s.spools.length === 0 ? <span className="xs muted">Noch keine Rollen angelegt. Rollen legst du in der Welt „Material“ an.</span> : null}
          {d.slots.map((sl) => { const sp = s.spools.find((x) => x.id === sl.spoolId); return (
            <div key={sl.index} className="row small"><span className="pill xs">Slot {sl.index}</span><span className="swatch" style={{ background: sp?.colorHex ?? 'transparent', width: 16, height: 16 }} />
              <select className="select" value={sp ? sl.spoolId : ''} aria-label={`Rolle in Slot ${sl.index}`} onChange={(e) => s.assignSlot(d.id, sl.index, e.target.value || undefined)}><option value="">leer</option>{s.spools.map((x) => <option key={x.id} value={x.id}>{x.label} ({fmtGrams(availableGrams(x))})</option>)}</select></div>
          ); })}
        </Field>
      ) : null}
      {d.kind !== 'werkzeug' ? (
        <Field label="Wartung">
          {d.maintenance.length === 0 ? <span className="xs muted">Noch keine Wartung geplant.</span> : d.maintenance.map((m) => <div key={m.id} className="row small"><Check on={m.done} onClick={() => s.toggleMaintenance(d.id, m.id)} /><span className="grow" style={{ textDecoration: m.done ? 'line-through' : undefined }}>{m.title}</span><span className={`xs ${!m.done && new Date(m.due).getTime() < now.getTime() ? 'pill pill--warn' : 'muted'}`}>{m.done ? 'erledigt' : relTime(m.due, now.getTime())}</span><button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} aria-label={`Wartung „${m.title}“ löschen`} title="Löschen" onClick={() => s.deleteMaintenance(d.id, m.id)}><ITrash width={11} height={11} /></button></div>)}
          <div className="row" style={{ gap: 6 }}><input className="input grow" placeholder="Neue Wartung, z. B. Düse prüfen" value={mt} maxLength={80} onChange={(e) => setMt(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addMaint(); }} /><input className="input" type="date" style={{ width: 140 }} value={md} aria-label="Fällig am" onChange={(e) => setMd(e.target.value)} /><button className="btn btn--sm" disabled={!mt.trim()} onClick={addMaint}>Planen</button></div>
        </Field>
      ) : null}
      {d.kind === 'drucker' ? <Field label="Kalibrierung planen (fällig in einer Woche, Referenzzeiten)"><div className="pills">{CALIBRATIONS.map((c) => <button key={c.title} className="pill xs" onClick={() => { s.addMaintenance(d.id, `${c.title} (≈ ${c.minutes} min)`, inWeek()); s.toast('Kalibrierung eingeplant'); }}>+ {c.title} · {c.minutes} min</button>)}</div></Field> : null}
      {history.length ? <Field label="Letzte Drucke">{history.map((p) => <div key={p.id} className="row small"><span className={`pill xs ${p.result === 'erfolg' ? 'pill--ok' : p.result === 'fehldruck' ? 'pill--bad' : 'pill--warn'}`}>{p.result}</span><span className="grow ellipsis">{p.name}</span><span className="xs muted">{fmtDate(p.finishedAt)}</span></div>)}</Field> : null}
      {d.kind === 'drucker' ? <p className="xs faint">Es besteht keine Verbindung zum Drucker. Der Fortschritt wird aus der geschätzten Druckzeit berechnet, das Ergebnis buchst du selbst.</p> : null}
    </Sheet>
  );
}

export function DruckSheet({ printId }: { printId: string }) {
  const s = useStore(); const now = useNow(1000);
  const [gramsIn, setGrams] = useState<string | null>(null);
  const p = s.prints.find((x) => x.id === printId); if (!p) return null;
  const pr = s.projects.find((x) => x.id === p.projectId); const sp = s.spools.find((x) => x.id === p.spoolId); const dev = s.devices.find((x) => x.id === p.printerId);
  const grams = gramsIn ?? String(p.gramsPlanned);
  const used = Number(grams) >= 0 && grams !== '' ? Number(grams) : p.gramsPlanned;
  const busy = s.prints.some((x) => x.printerId === p.printerId && x.status === 'läuft');
  const first = s.prints.filter((x) => x.printerId === p.printerId && x.status === 'wartend').sort((a, b) => a.queueOrder - b.queueOrder)[0]?.id === p.id;
  const cancel = () => { if (confirm(p.status === 'läuft' ? `Laufenden Druck „${p.name}“ abbrechen? Es wird kein Material gebucht.` : `„${p.name}“ aus der Warteschlange entfernen?`)) { s.cancelPrint(p.id); s.closeSheet(); } };
  return (
    <Sheet title={p.name} icon={<IPrinter />} onClose={s.closeSheet}
      foot={p.status === 'läuft' || p.status === 'wartend' ? <>
        {p.status === 'läuft' ? <><input className="input" type="number" min={0} style={{ width: 80 }} value={grams} onChange={(e) => setGrams(e.target.value)} title="tatsächlich verbrauchte Gramm" aria-label="Tatsächlich verbrauchte Gramm" /><button className="btn btn--primary btn--sm" onClick={() => { s.finishPrint(p.id, 'erfolg', used); s.closeSheet(); }}>Erfolg</button><button className="btn btn--sm" onClick={() => { s.finishPrint(p.id, 'nacharbeit', used); s.closeSheet(); }}>Nacharbeit nötig</button><button className="btn btn--sm btn--danger" onClick={() => { s.finishPrint(p.id, 'fehldruck', used); s.closeSheet(); }}>Fehldruck</button></> : null}
        {p.status === 'wartend' && dev ? <button className="btn btn--primary btn--sm" disabled={busy || !first} title={busy ? `${dev.name} druckt gerade` : !first ? 'Davor stehen noch andere Drucke in der Warteschlange' : undefined} onClick={() => { s.startNextPrint(p.printerId); s.closeSheet(); }}>Jetzt starten</button> : null}
        <button className="btn btn--sm btn--ghost btn--danger" style={{ marginLeft: 'auto' }} onClick={cancel}>{p.status === 'läuft' ? 'Druck abbrechen' : 'Aus Warteschlange entfernen'}</button>
      </> : undefined}>
      <div className="grid3"><Stat value={p.status === "fertig" ? (p.result ?? "fertig") : p.status} label="Status" /><Stat value={fmtDuration(p.estimatedMinutes)} label="Dauer" /><Stat value={`${p.gramsUsed ?? p.gramsPlanned} g`} label={p.booked ? 'verbraucht' : 'geplant'} /></div>
      {p.status === 'läuft' ? <><Progress value={printProgress(p, now.getTime()) * 100} /><span className="xs muted">Start {p.startedAt ? fmtTime(p.startedAt) : '–'} · {p.resultDue ? 'geschätzte Druckzeit abgelaufen. Bitte unten das Ergebnis buchen.' : `noch ${fmtDuration(printRemainingMin(p, now.getTime()))} (Schätzung)`}</span></> : null}
      <div className="col small" style={{ gap: 4 }}>
        <span>{p.kind === 'test' ? 'Testdruck' : 'Finaldruck'} auf <b>{dev?.name ?? 'gelöschtem Drucker'}</b></span>
        {pr ? <span>Projekt: <button className="btn btn--sm" onClick={() => { s.closeSheet(); navigate({ world: 'projekte', projectId: pr.id }); }}>{pr.name}</button> {p.versionId ? `· ${pr.versions.find((v) => v.id === p.versionId)?.label ?? ''}` : ''}</span> : null}
        {sp ? <span className="row" style={{ gap: 6 }}><span className="swatch" style={{ background: sp.colorHex, width: 14, height: 14 }} />{sp.label}</span> : null}
        {p.notes ? <span className="muted">{p.notes}</span> : null}
        <span className="muted">≈ {fmtNum(((p.estimatedMinutes / 60) * (dev?.wattage ?? s.settings.printerWatts)) / 1000, 2)} kWh · {fmtEur((((p.estimatedMinutes / 60) * (dev?.wattage ?? s.settings.printerWatts)) / 1000) * s.settings.pricePerKwh)} Strom (Schätzung)</span>
      </div>
    </Sheet>
  );
}

export function NeuerDruckSheet({ projectId }: { projectId: string }) {
  const p = useStore((st) => st.projects.find((x) => x.id === projectId));
  return p ? <NeuerDruckInner p={p} /> : null;
}
function NeuerDruckInner({ p }: { p: Project }) {
  const s = useStore();
  const projectId = p.id;
  const printers = s.devices.filter((d) => d.kind === 'drucker');
  const [d, setD] = useState({ name: `${p.name} ${p.versions.find((v) => v.status === 'aktuell')?.label ?? ''}`.trim(), kind: 'test' as 'test' | 'final', printerId: (printers.find((x) => x.id === s.settings.defaultPrinterId) ?? printers[0])?.id ?? '', versionId: (p.versions.find((v) => v.status === 'aktuell')?.id ?? p.versions[0]?.id) as string | undefined, spoolId: (p.requiredSpools.find((r) => s.spools.some((x) => x.id === r.spoolId))?.spoolId ?? s.spools[0]?.id) as string | undefined, minutes: 90, grams: p.requiredSpools[0]?.grams ?? 30 });
  const sp = s.spools.find((x) => x.id === d.spoolId);
  const short = sp ? availableGrams(sp) < d.grams : false;
  const printerId = printers.some((x) => x.id === d.printerId) ? d.printerId : printers[0]?.id ?? '';
  const valid = !!d.name.trim() && !!printerId && d.minutes >= 1 && d.grams >= 0;
  if (printers.length === 0) return (
    <Sheet title="Druck planen" icon={<IPrinter />} onClose={s.closeSheet} foot={<><button className="btn btn--primary" onClick={() => s.openSheet({ kind: 'geraetForm', deviceKind: 'drucker' })}>Drucker anlegen</button><button className="btn" onClick={s.closeSheet}>Später</button></>}>
      <p className="small">Für einen Druck brauchst du zuerst einen Drucker. Leg deinen Drucker mit Name und Modell an, danach kannst du Drucke planen und in die Warteschlange legen.</p>
    </Sheet>
  );
  return (
    <Sheet title="Druck planen" icon={<IPrinter />} onClose={s.closeSheet}
      foot={<><button className="btn btn--primary" disabled={!valid} onClick={() => { s.enqueuePrint({ projectId, versionId: d.versionId, printerId, spoolId: sp?.id, name: d.name.trim(), kind: d.kind, estimatedMinutes: Math.max(1, Math.round(d.minutes)), gramsPlanned: Math.max(0, Math.round(d.grams)) }); s.closeSheet(); }}>In Warteschlange</button><button className="btn" onClick={s.closeSheet}>Abbrechen</button></>}>
      <Field label="Bezeichnung"><input className="input" value={d.name} maxLength={80} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
      <Field label="Art"><Seg value={d.kind} options={[{ v: 'test', l: 'Testdruck' }, { v: 'final', l: 'Finaldruck' }]} onChange={(v) => setD({ ...d, kind: v })} /></Field>
      <div className="grid2">
        <Field label="Drucker"><select className="select" value={printerId} onChange={(e) => setD({ ...d, printerId: e.target.value })}>{printers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Version"><select className="select" value={d.versionId ?? ''} onChange={(e) => setD({ ...d, versionId: e.target.value || undefined })}><option value="">–</option>{p.versions.map((v) => <option key={v.id} value={v.id}>{v.label} ({v.status})</option>)}</select></Field>
        <Field label="Dauer (min)"><input className="input" type="number" min={1} value={d.minutes} onChange={(e) => setD({ ...d, minutes: Number(e.target.value) })} /></Field>
        <Field label="Material (g)"><input className="input" type="number" min={0} value={d.grams} onChange={(e) => setD({ ...d, grams: Number(e.target.value) })} /></Field>
      </div>
      <Field label="Rolle"><select className="select" value={sp?.id ?? ''} onChange={(e) => setD({ ...d, spoolId: e.target.value || undefined })}><option value="">ohne Rolle</option>{s.spools.map((x) => <option key={x.id} value={x.id}>{x.label} · {fmtGrams(availableGrams(x))} frei</option>)}</select></Field>
      {!sp ? <span className="xs muted">Ohne Rolle wird kein Material reserviert oder gebucht.</span> : short ? <span className="pill pill--bad xs">Nur {fmtGrams(availableGrams(sp))} verfügbar. Alternative: {s.spools.find((x) => x.material === sp.material && x.id !== sp.id && availableGrams(x) >= d.grams)?.label ?? 'keine passende Rolle'}</span> : <span className="xs muted">{d.grams} g werden reserviert, verbraucht wird erst beim Abschluss des Drucks.</span>}
      <p className="xs faint">Der Fortschritt läuft nach der geschätzten Dauer mit. Das Ergebnis buchst du selbst.</p>
    </Sheet>
  );
}

export function VersionSheet({ projectId, versionId }: { projectId: string; versionId?: string }) {
  const p = useStore((st) => st.projects.find((x) => x.id === projectId));
  return p ? <VersionInner p={p} versionId={versionId} /> : null;
}
function VersionInner({ p, versionId }: { p: Project; versionId?: string }) {
  const s = useStore(); const projectId = p.id;
  const ex = versionId ? p.versions.find((v) => v.id === versionId) : undefined;
  const [d, setD] = useState({ label: ex?.label ?? `v${p.versions.length + 1}`, status: (ex?.status ?? 'aktuell') as VersionStatus, changes: ex?.changes.join(', ') ?? '', dims: ex?.dims ?? '', material: ex?.material ?? '', settings: ex?.settings ?? '', notes: ex?.notes ?? '' });
  return (
    <Sheet title={ex ? `Version ${ex.label}` : 'Neue Version'} icon={<IGit />} onClose={s.closeSheet}
      foot={<><button className="btn btn--primary" disabled={!d.label.trim()} onClick={() => { const v = { label: d.label.trim(), status: d.status, changes: d.changes.split(',').map((x) => x.trim()).filter(Boolean), dims: d.dims || undefined, material: d.material || undefined, settings: d.settings || undefined, notes: d.notes || undefined }; if (ex) s.updateVersion(projectId, ex.id, v); else s.addVersion(projectId, v); s.closeSheet(); }}>Speichern</button><button className="btn" onClick={s.closeSheet}>Abbrechen</button></>}>
      <div className="grid2"><Field label="Bezeichnung"><input className="input" value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} /></Field><Field label="Status"><select className="select" value={d.status} onChange={(e) => setD({ ...d, status: e.target.value as VersionStatus })}><option value="aktuell">aktuell</option><option value="beste">beste</option><option value="final">final</option><option value="verworfen">verworfen</option></select></Field></div>
      <Field label="Änderungen (Komma-getrennt)"><input className="input" value={d.changes} onChange={(e) => setD({ ...d, changes: e.target.value })} placeholder="Klemmung 1,5 mm dicker, Kabelkanal" /></Field>
      <div className="grid2"><Field label="Maße"><input className="input" value={d.dims} onChange={(e) => setD({ ...d, dims: e.target.value })} placeholder="48 × 34 × 22 mm" /></Field><Field label="Material"><input className="input" value={d.material} onChange={(e) => setD({ ...d, material: e.target.value })} /></Field></div>
      <Field label="Druckeinstellungen"><input className="input" value={d.settings} onChange={(e) => setD({ ...d, settings: e.target.value })} placeholder="0,2 mm, 25 % Infill, 4 Wände" /></Field>
      <Field label="Notizen"><textarea className="textarea" value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></Field>
    </Sheet>
  );
}

export function AbschliessenSheet({ projectId }: { projectId: string }) {
  const p = useStore((st) => st.projects.find((x) => x.id === projectId));
  return p ? <AbschliessenInner p={p} /> : null;
}
function AbschliessenInner({ p }: { p: Project }) {
  const s = useStore();
  const [result, setResult] = useState(''); const [lessons, setLessons] = useState(''); const [asTemplate, setAsTemplate] = useState(false);
  const open = s.tasks.filter((t) => t.projectId === p.id && !t.done && !t.skipped).length;
  const running = s.prints.some((pr) => pr.projectId === p.id && (pr.status === 'läuft' || pr.status === 'wartend'));
  return (
    <Sheet title="Projekt abschließen" icon={<IArchive />} onClose={s.closeSheet}
      foot={<><button className="btn btn--primary" disabled={!result.trim()} onClick={() => { s.archiveProject(p.id, result.trim(), lessons.split('\n').map((x) => x.trim()).filter(Boolean)); if (asTemplate) s.setTemplate(p.id, true); s.spotlight(p.id); s.closeSheet(); navigate({ world: 'archiv' }); }}>Bewusst abschließen</button><button className="btn" onClick={s.closeSheet}>Noch nicht</button></>}>
      <p className="small">„{p.name}“ wird abgeschlossen und ins Archiv übernommen. Es entsteht ein Bericht mit Versionen, Drucken, Material, Zeit und Kosten. Das Projekt bleibt vollständig erhalten.</p>
      {open ? <span className="pill pill--warn xs">{open} offene Aufgabe(n) bleiben offen</span> : null}
      {running ? <span className="pill pill--warn xs">Wartende Drucke werden beim Abschluss aus der Warteschlange entfernt, ein laufender Druck bleibt bestehen</span> : null}
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
