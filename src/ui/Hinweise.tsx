import { useMemo } from 'react';
import { useStore, availableGrams } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { Sheet } from './Sheet';
import { navigate } from '../router';
import { IBolt } from './Icons';
import { fmtGrams, relTime } from '../lib/format';

export interface Hint { id: string; level: 'warn' | 'bad' | 'info'; title: string; detail: string; go: () => void }

export function useHints(): Hint[] {
  const { devices, spools, projects, prints, tasks } = useStore(useShallow((s) => ({ devices: s.devices, spools: s.spools, projects: s.projects, prints: s.prints, tasks: s.tasks })));
  const openSheet = useStore((s) => s.openSheet);
  return useMemo(() => {
    const now = Date.now(); const out: Hint[] = [];
    devices.forEach((d) => d.maintenance.filter((m) => !m.done && new Date(m.due).getTime() < now).forEach((m) => out.push({ id: `m-${m.id}`, level: 'warn', title: `Wartung überfällig: ${d.name}`, detail: `${m.title} · ${relTime(m.due, now)}`, go: () => { navigate({ world: 'druck' }); openSheet({ kind: 'geraet', deviceId: d.id }); } })));
    projects.filter((p) => !p.archivedAt && !p.deletedAt).forEach((p) => p.requiredSpools.forEach((r) => { const sp = spools.find((x) => x.id === r.spoolId); if (sp && availableGrams(sp) < r.grams) out.push({ id: `s-${p.id}-${sp.id}`, level: 'bad', title: `Material fehlt: ${p.name}`, detail: `${sp.label}: ${fmtGrams(r.grams - availableGrams(sp))} zu wenig`, go: () => navigate({ world: 'projekte', projectId: p.id }) }); }));
    prints.filter((pr) => pr.result === 'fehldruck' && pr.projectId && !tasks.some((t) => t.projectId === pr.projectId && !t.done && /Ursache|Nacharbeit/.test(t.title))).forEach((pr) => out.push({ id: `f-${pr.id}`, level: 'warn', title: `Fehldruck ohne Folgeaufgabe`, detail: pr.name, go: () => navigate({ world: 'projekte', projectId: pr.projectId }) }));
    spools.filter((s) => availableGrams(s) < 100).forEach((s) => out.push({ id: `low-${s.id}`, level: 'info', title: `Rolle fast leer: ${s.label}`, detail: `${fmtGrams(availableGrams(s))} verfügbar`, go: () => { navigate({ world: 'material' }); openSheet({ kind: 'spule', spoolId: s.id }); } }));
    prints.filter((pr) => pr.imported).forEach((pr) => out.push({ id: `in-${pr.id}`, level: 'info', title: 'Druck im Eingang', detail: `${pr.name} ist noch keinem Projekt zugeordnet`, go: () => navigate({ world: 'druck' }) }));
    projects.filter((p) => !p.archivedAt && !p.deletedAt && p.versions.some((v) => v.status === 'final')).forEach((p) => out.push({ id: `fin-${p.id}`, level: 'info', title: `Abschluss vorschlagen: ${p.name}`, detail: 'Eine Version ist als final markiert', go: () => { navigate({ world: 'projekte', projectId: p.id }); openSheet({ kind: 'abschliessen', projectId: p.id }); } }));
    const t = devices.find((d) => d.kind === 'werkzeug' && d.status === 'fehlt'); if (t) out.push({ id: `tool-${t.id}`, level: 'info', title: `Werkzeug fehlt: ${t.name}`, detail: t.notes ?? '', go: () => navigate({ world: 'druck' }) });
    return out;
  }, [devices, spools, projects, prints, tasks, openSheet]);
}

export function HinweiseSheet() {
  const s = useStore(); const hints = useHints();
  const col: Record<string, string> = { warn: 'pill--warn', bad: 'pill--bad', info: 'pill--on' };
  return (
    <Sheet title="Hinweise" icon={<IBolt />} onClose={s.closeSheet}>
      {hints.length === 0 ? <p className="muted small">Alles in Ordnung. Keine Konflikte, nichts überfällig.</p> : hints.map((h) => (
        <div key={h.id} className="item item--click" onClick={() => { s.closeSheet(); h.go(); }}>
          <span className={`pill xs ${col[h.level]}`}>{h.level === 'bad' ? 'Konflikt' : h.level === 'warn' ? 'Achtung' : 'Hinweis'}</span>
          <div className="col grow" style={{ gap: 0 }}><b className="small">{h.title}</b><span className="xs muted">{h.detail}</span></div>
        </div>
      ))}
      <p className="xs faint">Hinweise entstehen aus Wartung, Materialbedarf, Fehldrucken, Rollenbestand und dem Eingang.</p>
    </Sheet>
  );
}
