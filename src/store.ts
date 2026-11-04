import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ArchiveReport, Device, HistoryEvent, HistoryType, Milestone, PersistedState, PrintJob, Project, Settings, ShoppingItem, Spool, Task, Version, VersionStatus, WeatherCache } from './types';
import { makeSeed, DEFAULT_SETTINGS } from './seed';
import { id, nowIso, clamp } from './lib/format';

export type SheetKind =
  | { kind: 'projektForm'; projectId?: string }
  | { kind: 'spule'; spoolId?: string }
  | { kind: 'geraet'; deviceId: string }
  | { kind: 'druck'; printId: string }
  | { kind: 'bericht'; reportId: string }
  | { kind: 'einstellungen' }
  | { kind: 'ueber' }
  | { kind: 'neuerDruck'; projectId: string }
  | { kind: 'version'; projectId: string; versionId?: string }
  | { kind: 'abschliessen'; projectId: string };

interface UiState { sheet?: SheetKind; commandOpen: boolean; drafts: Record<string, unknown>; toast?: { id: number; text: string } }

export interface Store extends PersistedState {
  ui: UiState;
  // ui
  openSheet: (s: SheetKind) => void; closeSheet: () => void; setCommand: (open: boolean) => void;
  setDraft: (key: string, value: unknown) => void; clearDraft: (key: string) => void; toast: (text: string) => void;
  // settings / data mgmt
  setSettings: (patch: Partial<Settings>) => void; setWeather: (w: WeatherCache) => void;
  resetDemo: () => void; exportJson: () => string; importJson: (text: string) => { ok: boolean; error?: string };
  // projects
  upsertProject: (p: Project) => void; deleteProject: (pid: string) => void; duplicateProject: (pid: string) => string;
  toggleFavorite: (pid: string) => void; setProgress: (pid: string, progress: number, manual?: boolean) => void; setStage: (pid: string, stage: Project['stage']) => void;
  addHistory: (pid: string, type: HistoryType, title: string, detail?: string) => void;
  setMilestone: (pid: string, mid: string, patch: Partial<Milestone>) => void; addMilestone: (pid: string, title: string) => void; moveMilestone: (pid: string, mid: string, dir: -1 | 1) => void;
  addVersion: (pid: string, v: Omit<Version, 'id' | 'createdAt'>) => void; setVersionStatus: (pid: string, vid: string, status: VersionStatus) => void; updateVersion: (pid: string, vid: string, patch: Partial<Version>) => void;
  setNotes: (pid: string, notes: string) => void; addExperience: (pid: string, text: string) => void; addFile: (pid: string, f: Project['files'][number]) => void;
  setRequiredSpool: (pid: string, spoolId: string, grams: number) => void;
  archiveProject: (pid: string, result: string, lessons: string[]) => void; projectFromTemplate: (pid: string) => string;
  // tasks
  addTask: (t: Omit<Task, 'id' | 'createdAt' | 'order' | 'done'>) => void; toggleTask: (tid: string) => void; skipTask: (tid: string) => void; moveTask: (tid: string, dir: -1 | 1) => void; deleteTask: (tid: string) => void;
  // prints
  enqueuePrint: (p: Omit<PrintJob, 'id' | 'status' | 'queueOrder'>) => void; startNextPrint: (printerId: string) => void; movePrint: (prid: string, dir: -1 | 1) => void; cancelPrint: (prid: string) => void;
  finishPrint: (prid: string, result: PrintJob['result'], gramsUsed?: number) => void; tickPrints: (now: number) => void;
  // spools & devices
  upsertSpool: (s: Spool) => void; deleteSpool: (sid: string) => void; bookConsumption: (sid: string, grams: number, note?: string) => void; markDried: (sid: string) => void;
  assignSlot: (deviceId: string, index: number, spoolId?: string) => void; toggleMaintenance: (deviceId: string, mid: string) => void;
  toggleShopping: (sid: string) => void; addShopping: (s: Omit<ShoppingItem, 'id' | 'done'>) => void;
}

const touch = (p: Project): Project => ({ ...p, updatedAt: nowIso() });
const ev = (type: HistoryType, title: string, detail?: string): HistoryEvent => ({ id: id('h'), at: nowIso(), type, title, detail });

export function suggestedProgress(p: Project): number {
  const ms = p.milestones.filter((m) => !m.skipped);
  if (ms.length === 0) return p.progress;
  return Math.round((ms.filter((m) => m.done).length / ms.length) * 100);
}

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const updProject = (pid: string, fn: (p: Project) => Project) => set((s) => ({ projects: s.projects.map((p) => (p.id === pid ? touch(fn(p)) : p)) }));
      const updSpool = (sid: string, fn: (sp: Spool) => Spool) => set((s) => ({ spools: s.spools.map((sp) => (sp.id === sid ? fn(sp) : sp)) }));
      const updDevice = (did: string, fn: (d: Device) => Device) => set((s) => ({ devices: s.devices.map((d) => (d.id === did ? fn(d) : d)) }));
      let toastN = 0;
      return {
        ...makeSeed(),
        ui: { commandOpen: false, drafts: {} },

        openSheet: (sheet) => set((s) => ({ ui: { ...s.ui, sheet } })),
        closeSheet: () => set((s) => ({ ui: { ...s.ui, sheet: undefined } })),
        setCommand: (commandOpen) => set((s) => ({ ui: { ...s.ui, commandOpen } })),
        setDraft: (key, value) => set((s) => ({ ui: { ...s.ui, drafts: { ...s.ui.drafts, [key]: value } } })),
        clearDraft: (key) => set((s) => { const drafts = { ...s.ui.drafts }; delete drafts[key]; return { ui: { ...s.ui, drafts } }; }),
        toast: (text) => { toastN += 1; const n = toastN; set((s) => ({ ui: { ...s.ui, toast: { id: n, text } } })); setTimeout(() => set((s) => (s.ui.toast?.id === n ? { ui: { ...s.ui, toast: undefined } } : {})), 3200); },

        setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        setWeather: (weather) => set({ weather }),
        resetDemo: () => { const seed = makeSeed(); set({ ...seed, weather: get().weather, ui: { commandOpen: false, drafts: {} } }); get().toast('Demodaten zurückgesetzt'); },
        exportJson: () => {
          const s = get();
          const data: PersistedState = { version: 1, seededAt: s.seededAt, projects: s.projects, devices: s.devices, spools: s.spools, tasks: s.tasks, prints: s.prints, reports: s.reports, appointments: s.appointments, shopping: s.shopping, settings: s.settings };
          return JSON.stringify(data, null, 2);
        },
        importJson: (text) => {
          try {
            const j = JSON.parse(text);
            if (!j || j.version !== 1 || !Array.isArray(j.projects)) return { ok: false, error: 'Keine gültige 3Druckwerkbank-Datei (version 1 erwartet).' };
            set({ version: 1, projects: j.projects, devices: j.devices ?? [], spools: j.spools ?? [], tasks: j.tasks ?? [], prints: j.prints ?? [], reports: j.reports ?? [], appointments: j.appointments ?? [], shopping: j.shopping ?? [], settings: { ...DEFAULT_SETTINGS, ...(j.settings ?? {}) } });
            get().toast('Daten importiert');
            return { ok: true };
          } catch (e) { return { ok: false, error: (e as Error).message }; }
        },

        upsertProject: (p) => set((s) => {
          const exists = s.projects.some((x) => x.id === p.id);
          const np = touch(exists ? p : { ...p, history: [ev('angelegt', 'Projekt angelegt'), ...p.history] });
          return { projects: exists ? s.projects.map((x) => (x.id === p.id ? np : x)) : [np, ...s.projects] };
        }),
        deleteProject: (pid) => set((s) => ({ projects: s.projects.filter((p) => p.id !== pid), tasks: s.tasks.filter((t) => t.projectId !== pid), prints: s.prints.filter((p) => p.projectId !== pid || p.status === 'fertig') })),
        duplicateProject: (pid) => {
          const src = get().projects.find((p) => p.id === pid)!;
          const nid = id('p');
          const copy: Project = { ...src, id: nid, name: `${src.name} (Kopie)`, favorite: false, createdAt: nowIso(), updatedAt: nowIso(), archivedAt: undefined, stage: 'Idee', progress: 0, progressManual: false,
            milestones: src.milestones.map((m) => ({ ...m, id: id('ms'), done: false, skipped: false })), versions: [], files: [], history: [ev('angelegt', `Dupliziert aus „${src.name}“`)], requiredSpools: [] };
          set((s) => ({ projects: [copy, ...s.projects] }));
          return nid;
        },
        toggleFavorite: (pid) => updProject(pid, (p) => ({ ...p, favorite: !p.favorite })),
        setProgress: (pid, progress, manual = true) => updProject(pid, (p) => ({ ...p, progress: clamp(Math.round(progress), 0, 100), progressManual: manual })),
        setStage: (pid, stage) => updProject(pid, (p) => ({ ...p, stage, history: [ev('entscheidung', `Station: ${stage}`), ...p.history] })),
        addHistory: (pid, type, title, detail) => updProject(pid, (p) => ({ ...p, history: [ev(type, title, detail), ...p.history] })),
        setMilestone: (pid, mid, patch) => updProject(pid, (p) => {
          const milestones = p.milestones.map((m) => (m.id === mid ? { ...m, ...patch } : m));
          const m = milestones.find((x) => x.id === mid)!;
          const np = { ...p, milestones };
          const hist = patch.done ? [ev('meilenstein', `Meilenstein erreicht: ${m.title}`), ...p.history] : patch.skipped ? [ev('entscheidung', `Meilenstein übersprungen: ${m.title}`), ...p.history] : p.history;
          return { ...np, history: hist, progress: p.progressManual ? p.progress : suggestedProgress(np) };
        }),
        addMilestone: (pid, title) => updProject(pid, (p) => ({ ...p, milestones: [...p.milestones, { id: id('ms'), title, done: false, order: p.milestones.length }] })),
        moveMilestone: (pid, mid, dir) => updProject(pid, (p) => {
          const arr = [...p.milestones].sort((a, b) => a.order - b.order);
          const i = arr.findIndex((m) => m.id === mid); const j = i + dir;
          if (i < 0 || j < 0 || j >= arr.length) return p;
          [arr[i], arr[j]] = [arr[j], arr[i]];
          return { ...p, milestones: arr.map((m, k) => ({ ...m, order: k })) };
        }),
        addVersion: (pid, v) => updProject(pid, (p) => {
          const nv: Version = { ...v, id: id('v'), createdAt: nowIso() };
          const versions = v.status === 'aktuell' ? p.versions.map((x) => (x.status === 'aktuell' ? { ...x, status: 'verworfen' as VersionStatus } : x)) : p.versions;
          return { ...p, versions: [...versions, nv], history: [ev('version', `Version ${nv.label} angelegt`, nv.changes.join(', ')), ...p.history] };
        }),
        setVersionStatus: (pid, vid, status) => updProject(pid, (p) => {
          const versions = p.versions.map((v) => {
            if (v.id === vid) return { ...v, status };
            if ((status === 'aktuell' || status === 'beste' || status === 'final') && v.status === status) return { ...v, status: status === 'aktuell' ? ('verworfen' as VersionStatus) : ('aktuell' as VersionStatus) };
            return v;
          });
          const v = p.versions.find((x) => x.id === vid)!;
          return { ...p, versions, history: [ev('entscheidung', `${v.label} als „${status}“ markiert`), ...p.history] };
        }),
        updateVersion: (pid, vid, patch) => updProject(pid, (p) => ({ ...p, versions: p.versions.map((v) => (v.id === vid ? { ...v, ...patch } : v)) })),
        setNotes: (pid, notes) => updProject(pid, (p) => ({ ...p, notes })),
        addExperience: (pid, text) => updProject(pid, (p) => ({ ...p, experiences: [...p.experiences, text], history: [ev('erfahrung', text), ...p.history] })),
        addFile: (pid, f) => updProject(pid, (p) => ({ ...p, files: [f, ...p.files] })),
        setRequiredSpool: (pid, spoolId, grams) => updProject(pid, (p) => ({ ...p, requiredSpools: grams <= 0 ? p.requiredSpools.filter((r) => r.spoolId !== spoolId) : p.requiredSpools.some((r) => r.spoolId === spoolId) ? p.requiredSpools.map((r) => (r.spoolId === spoolId ? { ...r, grams } : r)) : [...p.requiredSpools, { spoolId, grams }] })),
        archiveProject: (pid, result, lessons) => {
          const s = get(); const p = s.projects.find((x) => x.id === pid)!;
          const prints = s.prints.filter((pr) => pr.projectId === pid && pr.status === 'fertig');
          const grams = prints.reduce((a, pr) => a + (pr.gramsUsed ?? 0), 0);
          const hours = prints.reduce((a, pr) => a + pr.estimatedMinutes / 60, 0);
          const matCost = prints.reduce((a, pr) => { const sp = s.spools.find((x) => x.id === pr.spoolId); return a + ((pr.gramsUsed ?? 0) / (sp?.initialGrams || 1000)) * (sp?.price ?? 25); }, 0);
          const kwh = (hours * s.settings.printerWatts) / 1000;
          const report: ArchiveReport = { id: id('r'), projectId: pid, completedAt: nowIso(), result, versionsUsed: p.versions.filter((v) => v.status !== 'verworfen').map((v) => v.label), printsTotal: prints.length, printsFailed: prints.filter((pr) => pr.result === 'fehldruck').length, gramsUsed: grams, hours: Math.round(hours * 10) / 10, costEur: Math.round((matCost + kwh * s.settings.pricePerKwh) * 100) / 100, lessons };
          set((st) => ({ reports: [report, ...st.reports], projects: st.projects.map((x) => (x.id === pid ? touch({ ...x, stage: 'Abgeschlossen', progress: 100, archivedAt: nowIso(), experiences: [...x.experiences, ...lessons], history: [ev('abgeschlossen', 'Projekt abgeschlossen', result), ...x.history] }) : x)) }));
          get().toast('Projekt abgeschlossen und archiviert');
        },
        projectFromTemplate: (pid) => {
          const src = get().projects.find((p) => p.id === pid)!; const nid = id('p');
          const copy: Project = { ...src, id: nid, name: `${src.name} – neu`, favorite: false, createdAt: nowIso(), updatedAt: nowIso(), archivedAt: undefined, stage: 'Idee', progress: 0, progressManual: false, templateOf: src.id,
            milestones: src.milestones.map((m) => ({ ...m, id: id('ms'), done: false, skipped: false })), versions: [], files: [], notes: src.notes, experiences: [], history: [ev('angelegt', `Aus Vorlage „${src.name}“ angelegt`)], requiredSpools: [] };
          set((s) => ({ projects: [copy, ...s.projects] })); get().toast('Neues Projekt aus Vorlage angelegt'); return nid;
        },

        addTask: (t) => set((s) => ({ tasks: [...s.tasks, { ...t, id: id('t'), done: false, createdAt: nowIso(), order: s.tasks.length }] })),
        toggleTask: (tid) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === tid ? { ...t, done: !t.done, skipped: false } : t)) })),
        skipTask: (tid) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === tid ? { ...t, skipped: !t.skipped, done: false } : t)) })),
        moveTask: (tid, dir) => set((s) => {
          const arr = [...s.tasks].sort((a, b) => a.order - b.order); const i = arr.findIndex((t) => t.id === tid); const j = i + dir;
          if (i < 0 || j < 0 || j >= arr.length) return {}; [arr[i], arr[j]] = [arr[j], arr[i]]; return { tasks: arr.map((t, k) => ({ ...t, order: k })) };
        }),
        deleteTask: (tid) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== tid) })),

        enqueuePrint: (p) => {
          set((s) => ({ prints: [...s.prints, { ...p, id: id('pr'), status: 'wartend', queueOrder: Math.max(0, ...s.prints.filter((x) => x.status === 'wartend' || x.status === 'läuft').map((x) => x.queueOrder + 1)) }] }));
          if (p.spoolId) updSpool(p.spoolId, (sp) => ({ ...sp, reservedGrams: sp.reservedGrams + p.gramsPlanned }));
          if (p.projectId) get().addHistory(p.projectId, 'druck', `${p.kind === 'test' ? 'Testdruck' : 'Finaldruck'} geplant: ${p.name}`);
          get().toast('Druck in die Warteschlange gelegt');
        },
        startNextPrint: (printerId) => set((s) => {
          if (s.prints.some((p) => p.printerId === printerId && p.status === 'läuft')) return {};
          const next = s.prints.filter((p) => p.printerId === printerId && p.status === 'wartend').sort((a, b) => a.queueOrder - b.queueOrder)[0];
          if (!next) return {};
          return { prints: s.prints.map((p) => (p.id === next.id ? { ...p, status: 'läuft', startedAt: nowIso() } : p)), devices: s.devices.map((d) => (d.id === printerId ? { ...d, status: 'druckt' } : d)) };
        }),
        movePrint: (prid, dir) => set((s) => {
          const q = s.prints.filter((p) => p.status === 'wartend').sort((a, b) => a.queueOrder - b.queueOrder); const i = q.findIndex((p) => p.id === prid); const j = i + dir;
          if (i < 0 || j < 0 || j >= q.length) return {}; [q[i], q[j]] = [q[j], q[i]];
          const orders = new Map(q.map((p, k) => [p.id, k]));
          return { prints: s.prints.map((p) => (orders.has(p.id) ? { ...p, queueOrder: orders.get(p.id)! } : p)) };
        }),
        cancelPrint: (prid) => {
          const p = get().prints.find((x) => x.id === prid); if (!p) return;
          set((s) => ({ prints: s.prints.map((x) => (x.id === prid ? { ...x, status: 'abgebrochen', finishedAt: nowIso() } : x)), devices: s.devices.map((d) => (d.id === p.printerId && p.status === 'läuft' ? { ...d, status: 'bereit' } : d)) }));
          if (p.spoolId && !p.booked) updSpool(p.spoolId, (sp) => ({ ...sp, reservedGrams: Math.max(0, sp.reservedGrams - p.gramsPlanned) }));
        },
        finishPrint: (prid, result, gramsUsed) => {
          const p = get().prints.find((x) => x.id === prid); if (!p || p.booked) return;
          const used = gramsUsed ?? p.gramsPlanned;
          set((s) => ({ prints: s.prints.map((x) => (x.id === prid ? { ...x, status: 'fertig', result, finishedAt: nowIso(), gramsUsed: used, booked: true } : x)), devices: s.devices.map((d) => (d.id === p.printerId ? { ...d, status: 'bereit', hoursTotal: d.hoursTotal + p.estimatedMinutes / 60 } : d)) }));
          if (p.spoolId) updSpool(p.spoolId, (sp) => ({ ...sp, remainingGrams: Math.max(0, sp.remainingGrams - used), reservedGrams: Math.max(0, sp.reservedGrams - p.gramsPlanned) }));
          if (p.projectId) {
            const label = result === 'erfolg' ? 'erfolgreich' : result === 'fehldruck' ? 'Fehldruck' : 'mit Nacharbeit';
            get().addHistory(p.projectId, result === 'fehldruck' ? 'fehler' : 'druck', `Druck ${label}: ${p.name}`, `${used} g verbraucht`);
            if (result === 'nacharbeit') get().addTask({ projectId: p.projectId, title: `Nacharbeit: ${p.name}`, kind: 'nacharbeit' });
            if (result === 'fehldruck') get().addTask({ projectId: p.projectId, title: `Ursache prüfen: ${p.name}`, kind: 'allgemein' });
          }
          get().startNextPrint(p.printerId);
        },
        tickPrints: (now) => {
          for (const p of get().prints) {
            if (p.status === 'läuft' && p.startedAt && now - new Date(p.startedAt).getTime() >= p.estimatedMinutes * 60_000) get().finishPrint(p.id, 'erfolg');
          }
        },

        upsertSpool: (sp) => set((s) => ({ spools: s.spools.some((x) => x.id === sp.id) ? s.spools.map((x) => (x.id === sp.id ? sp : x)) : [...s.spools, sp] })),
        deleteSpool: (sid) => set((s) => ({ spools: s.spools.filter((x) => x.id !== sid) })),
        bookConsumption: (sid, grams, note) => { updSpool(sid, (sp) => ({ ...sp, remainingGrams: Math.max(0, sp.remainingGrams - grams), notes: note ? `${sp.notes ? sp.notes + '\n' : ''}${new Date().toLocaleDateString('de-AT')}: ${grams} g gebucht – ${note}` : sp.notes })); get().toast(`${grams} g verbucht`); },
        markDried: (sid) => updSpool(sid, (sp) => ({ ...sp, lastDriedAt: nowIso() })),
        assignSlot: (deviceId, index, spoolId) => { updDevice(deviceId, (d) => ({ ...d, slots: (d.slots ?? []).map((sl) => (sl.index === index ? { ...sl, spoolId } : sl)) })); if (spoolId) { const d = get().devices.find((x) => x.id === deviceId); updSpool(spoolId, (sp) => ({ ...sp, location: `${d?.name ?? 'AMS'} Slot ${index}` })); } },
        toggleMaintenance: (deviceId, mid) => updDevice(deviceId, (d) => ({ ...d, maintenance: d.maintenance.map((m) => (m.id === mid ? { ...m, done: !m.done } : m)) })),
        toggleShopping: (sid) => set((s) => ({ shopping: s.shopping.map((x) => (x.id === sid ? { ...x, done: !x.done } : x)) })),
        addShopping: (item) => set((s) => ({ shopping: [...s.shopping, { ...item, id: id('sh'), done: false }] })),
      };
    },
    {
      name: '3druckwerkbank:v1',
      version: 1,
      partialize: (s) => ({ version: s.version, seededAt: s.seededAt, projects: s.projects, devices: s.devices, spools: s.spools, tasks: s.tasks, prints: s.prints, reports: s.reports, appointments: s.appointments, shopping: s.shopping, settings: s.settings, weather: s.weather, ui: { drafts: s.ui.drafts } }) as unknown as Store,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Store>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...(p.settings ?? {}) }, ui: { ...current.ui, drafts: p.ui?.drafts ?? {} } };
      },
    },
  ),
);

export const availableGrams = (sp: Spool) => Math.max(0, sp.remainingGrams - sp.reservedGrams);
export const activeProjects = (projects: Project[]) => projects.filter((p) => !p.archivedAt);
export const archivedProjects = (projects: Project[]) => projects.filter((p) => !!p.archivedAt);
export function printProgress(p: PrintJob, now = Date.now()): number {
  if (p.status === 'fertig') return 1;
  if (p.status !== 'läuft' || !p.startedAt) return 0;
  return clamp((now - new Date(p.startedAt).getTime()) / (p.estimatedMinutes * 60_000), 0, 1);
}
export function printRemainingMin(p: PrintJob, now = Date.now()): number {
  return Math.max(0, p.estimatedMinutes * (1 - printProgress(p, now)));
}
