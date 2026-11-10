import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { STAGES } from './types';
import type { ArchiveReport, Device, DeviceKind, EnergyEntry, HistoryEvent, HistoryType, Milestone, PersistedState, PrintJob, Project, Settings, ShoppingItem, Spool, Task, Version, VersionStatus, WeatherCache } from './types';
import { makeSeed, makeEmptySeed, DEFAULT_SETTINGS } from './seed';
import { isDemo, storageName } from './lib/workspace';
import { id, nowIso, clamp } from './lib/format';

export type SheetKind =
  | { kind: 'projektForm'; projectId?: string }
  | { kind: 'spule'; spoolId?: string }
  | { kind: 'geraet'; deviceId: string }
  | { kind: 'geraetForm'; deviceId?: string; deviceKind?: DeviceKind; projectId?: string; returnTo?: 'geraete' | 'werkzeuge' }
  | { kind: 'geraete'; tab?: 'geraete' | 'werkzeuge' }
  | { kind: 'druck'; printId: string }
  | { kind: 'bericht'; reportId: string }
  | { kind: 'einstellungen' }
  | { kind: 'ueber' }
  | { kind: 'neuerDruck'; projectId: string }
  | { kind: 'version'; projectId: string; versionId?: string }
  | { kind: 'abschliessen'; projectId: string }
  | { kind: 'projektDetail'; projectId: string; tab: 'meilensteine' | 'aufgaben' | 'versionen' | 'drucke' | 'dateien' | 'material' | 'werkzeuge' | 'notizen' | 'historie' }
  | { kind: 'hinweise' }
  | { kind: 'konto'; resetToken?: string }
  | { kind: 'bereich' };

interface UiState { sheet?: SheetKind; commandOpen: boolean; drafts: Record<string, unknown>; toast?: { id: number; text: string; undo?: boolean }; recent: string[]; spotlight?: { projectId: string; until: number } }

export interface Store extends PersistedState {
  ui: UiState;
  // ui
  openSheet: (s: SheetKind) => void; closeSheet: () => void; setCommand: (open: boolean) => void;
  applyCloudState: (state: PersistedState) => void;
  setDraft: (key: string, value: unknown) => void; clearDraft: (key: string) => void; toast: (text: string) => void; undo: () => void;
  // settings / data mgmt
  setSettings: (patch: Partial<Settings>) => void; setLocation: (loc: Settings['location']) => void; setWeather: (w: WeatherCache) => void;
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
  upsertDevice: (d: Device) => void; deleteDevice: (deviceId: string) => { ok: boolean; error?: string }; deleteMaintenance: (deviceId: string, mid: string) => void;
  removeFile: (pid: string, fid: string) => void; deleteShopping: (sid: string) => void;
  toggleShopping: (sid: string) => void; addShopping: (s: Omit<ShoppingItem, 'id' | 'done'>) => void;
  assignPrint: (prid: string, projectId: string) => void; setProjectTools: (pid: string, toolIds: string[]) => void; setToolStatus: (toolId: string, status: Device['status']) => void;
  restoreProject: (pid: string) => void; purgeProject: (pid: string) => void; setTemplate: (pid: string, on: boolean) => void;
  addEnergy: (e: Omit<EnergyEntry, 'id'>) => void; deleteEnergy: (eid: string) => void;
  ignorePrint: (prid: string, on: boolean) => void; projectFromPrint: (prid: string) => string; setWaitReason: (prid: string, reason?: string) => void;
  touchRecent: (id: string) => void; spotlight: (projectId: string) => void; addMaintenance: (deviceId: string, title: string, dueIso: string) => void; addTasks: (pid: string, titles: string[], kind?: Task['kind']) => void;
}

const touch = (p: Project): Project => ({ ...p, updatedAt: nowIso() });
const ev = (type: HistoryType, title: string, detail?: string): HistoryEvent => ({ id: id('h'), at: nowIso(), type, title, detail });

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as T[]) : []);
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback);
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
/** Bilder nur als eingebettete Bilddaten: eine fremde Adresse würde beim Anzeigen von jedem Browser abgerufen. */
const IMAGE_DATA = /^data:image\/(jpeg|png|webp|gif|avif);base64,/;
const imageData = (v: unknown) => (typeof v === 'string' && IMAGE_DATA.test(v) ? v : undefined);
const DEFAULT_ISLAND: Project['island'] = { kind: 'bibliothek', libraryId: 'werkstatt', frame: { ratio: 'quer', offsetX: 0, offsetY: 0, zoom: 1, style: 'holz' } };
/** Fremde Daten (Import, Konto, alter Speicher) so ergänzen, dass die Oberfläche nie auf fehlende Felder trifft. */
export function normalizeState(j: Partial<PersistedState> | null | undefined): Omit<PersistedState, 'weather'> {
  const o = (j ?? {}) as Partial<PersistedState>;
  const projects = arr<Project>(o.projects).filter((p) => typeof p.id === 'string').map((p) => ({
    ...p, name: str(p.name, 'Ohne Namen'), description: str(p.description), type: str(p.type, 'Sonstiges / Universal'), areas: arr<string>(undefined).concat(Array.isArray(p.areas) ? p.areas.filter((x) => typeof x === 'string') : []), tags: Array.isArray(p.tags) ? p.tags.filter((x) => typeof x === 'string') : [],
    stage: (STAGES.includes(p.stage) ? p.stage : 'Idee') as Project['stage'], progress: clamp(num(p.progress), 0, 100), favorite: !!p.favorite, createdAt: str(p.createdAt, nowIso()), updatedAt: str(p.updatedAt, nowIso()),
    island: p.island && typeof p.island === 'object' && typeof p.island.libraryId === 'string' ? { ...DEFAULT_ISLAND, ...p.island, photoDataUrl: imageData(p.island.photoDataUrl), kind: (p.island.kind === 'eigenes' && imageData(p.island.photoDataUrl) ? 'eigenes' : 'bibliothek') as Project['island']['kind'], frame: { ...DEFAULT_ISLAND.frame, ...(p.island.frame ?? {}) } } : DEFAULT_ISLAND,
    milestones: arr<Milestone>(p.milestones), versions: arr<Version>(p.versions).map((v) => ({ ...v, changes: Array.isArray(v.changes) ? v.changes : [] })), files: arr<Project['files'][number]>(p.files).map((f) => ({ ...f, name: str(f.name, 'Datei'), dataUrl: imageData(f.dataUrl) })), notes: str(p.notes), experiences: Array.isArray(p.experiences) ? p.experiences.filter((x) => typeof x === 'string') : [],
    history: arr<HistoryEvent>(p.history), requiredSpools: arr<{ spoolId: string; grams: number }>(p.requiredSpools), toolIds: Array.isArray(p.toolIds) ? p.toolIds.filter((x) => typeof x === 'string') : undefined,
  }));
  const devices = arr<Device>(o.devices).filter((d) => typeof d.id === 'string').map((d) => ({ ...d, name: str(d.name, 'Gerät'), model: str(d.model), location: str(d.location), kind: (['drucker', 'ams', 'trockner', 'werkzeug'].includes(d.kind) ? d.kind : 'werkzeug') as DeviceKind, hoursTotal: Math.max(0, num(d.hoursTotal)), maintenance: arr<Device['maintenance'][number]>(d.maintenance), slots: Array.isArray(d.slots) ? arr<{ index: number; spoolId?: string }>(d.slots) : undefined }));
  const spools = arr<Spool>(o.spools).filter((x) => typeof x.id === 'string').map((x) => ({ ...x, label: str(x.label, 'Rolle'), material: str(x.material, 'PLA'), brand: str(x.brand), colorName: str(x.colorName), colorHex: str(x.colorHex, '#888888'), location: str(x.location), initialGrams: Math.max(1, num(x.initialGrams, 1000)), remainingGrams: Math.max(0, num(x.remainingGrams)), reservedGrams: Math.max(0, num(x.reservedGrams)) }));
  const prints = arr<PrintJob>(o.prints).filter((x) => typeof x.id === 'string').map((x) => ({ ...x, name: str(x.name, 'Druck'), estimatedMinutes: Math.max(1, num(x.estimatedMinutes, 60)), gramsPlanned: Math.max(0, num(x.gramsPlanned)), queueOrder: num(x.queueOrder) }));
  return {
    version: 1, seededAt: typeof o.seededAt === 'string' ? o.seededAt : undefined, projects, devices, spools, prints,
    tasks: arr<Task>(o.tasks).filter((t) => typeof t.id === 'string').map((t) => ({ ...t, title: str(t.title, 'Aufgabe'), order: num(t.order), kind: t.kind ?? 'allgemein' })),
    reports: arr<ArchiveReport>(o.reports).map((r) => ({ ...r, lessons: Array.isArray(r.lessons) ? r.lessons : [], versionsUsed: Array.isArray(r.versionsUsed) ? r.versionsUsed : [] })),
    appointments: arr<PersistedState['appointments'][number]>(o.appointments).filter((a) => typeof a.at === 'string'), shopping: arr<ShoppingItem>(o.shopping).map((x) => ({ ...x, title: str(x.title, 'Eintrag'), qty: str(x.qty, '1'), url: typeof x.url === 'string' && /^https?:\/\//i.test(x.url) ? x.url : undefined })),
    settings: { ...DEFAULT_SETTINGS, ...(o.settings && typeof o.settings === 'object' ? o.settings : {}), location: { ...DEFAULT_SETTINGS.location, ...(o.settings?.location ?? {}) } }, energy: arr<EnergyEntry>(o.energy),
  };
}

export function suggestedProgress(p: Project): number {
  const ms = p.milestones.filter((m) => !m.skipped);
  if (ms.length === 0) return p.progress;
  return Math.round((ms.filter((m) => m.done).length / ms.length) * 100);
}

/** localStorage, das bei vollem Speicher nicht die laufende Aktion abbricht, sondern einmal deutlich warnt. */
let quotaWarned = 0;
const safeStorage = {
  getItem: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k: string, v: string) => {
    try { localStorage.setItem(k, v); }
    catch { if (Date.now() - quotaWarned > 60_000) { quotaWarned = Date.now(); setTimeout(() => useStore.getState().toast('Speicher des Browsers ist voll: Änderungen werden nicht mehr gesichert. Bitte Fotos entfernen oder Daten exportieren.'), 0); } }
  },
  removeItem: (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } },
};

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const updProject = (pid: string, fn: (p: Project) => Project) => set((s) => ({ projects: s.projects.map((p) => (p.id === pid ? touch(fn(p)) : p)) }));
      const updSpool = (sid: string, fn: (sp: Spool) => Spool) => set((s) => ({ spools: s.spools.map((sp) => (sp.id === sid ? fn(sp) : sp)) }));
      const updDevice = (did: string, fn: (d: Device) => Device) => set((s) => ({ devices: s.devices.map((d) => (d.id === did ? fn(d) : d)) }));
      let toastN = 0;
      const showToast = (text: string, ms = 3200, undo = false) => { toastN += 1; const n = toastN; set((s) => ({ ui: { ...s.ui, toast: { id: n, text, undo: undo || undefined } } })); setTimeout(() => set((s) => (s.ui.toast?.id === n ? { ui: { ...s.ui, toast: undefined } } : {})), ms); return n; };
      // Löschen und Abbrechen lassen sich einige Sekunden lang zurücknehmen: der Stand davor wird als Ganzes gemerkt (unveränderliche Listen, also nur Verweise)
      const UNDO_KEYS = ['projects', 'devices', 'spools', 'tasks', 'prints', 'reports', 'appointments', 'shopping', 'settings', 'energy'] as const;
      let undoSnap: { id: number; data: Partial<PersistedState> } | null = null; let undoDepth = 0;
      const undoable = <T,>(label: string, fn: () => T): T => {
        if (undoDepth > 0) return fn();
        const before = get(); const data: Record<string, unknown> = {}; for (const k of UNDO_KEYS) data[k] = before[k];
        undoDepth += 1; let r: T; try { r = fn(); } finally { undoDepth -= 1; }
        const after = get(); if (UNDO_KEYS.every((k) => after[k] === data[k])) return r; // nichts geändert (z. B. abgelehnt)
        undoSnap = { id: showToast(label, 8000, true), data: data as Partial<PersistedState> };
        return r;
      };
      const api: Store = {
        ...(isDemo ? makeSeed() : makeEmptySeed()),
        ui: { commandOpen: false, drafts: {}, recent: [] },

        openSheet: (sheet) => set((s) => ({ ui: { ...s.ui, sheet } })),
        closeSheet: () => set((s) => ({ ui: { ...s.ui, sheet: undefined } })),
        setCommand: (commandOpen) => set((s) => ({ ui: { ...s.ui, commandOpen } })),
        setDraft: (key, value) => set((s) => ({ ui: { ...s.ui, drafts: { ...s.ui.drafts, [key]: value } } })),
        clearDraft: (key) => set((s) => { const drafts = { ...s.ui.drafts }; delete drafts[key]; return { ui: { ...s.ui, drafts } }; }),
        toast: (text) => { showToast(text); },
        // Rückgängig: gilt nur, solange der Hinweis mit dem Knopf sichtbar ist
        undo: () => { const t = get().ui.toast; if (!undoSnap || !t || t.id !== undoSnap.id) return; const data = undoSnap.data; undoSnap = null; set((s) => ({ ...data, ui: { ...s.ui, toast: undefined } })); showToast('Wiederhergestellt'); },
        setLocation: (location) => set((s) => ({ settings: { ...s.settings, location }, weather: undefined })),

        setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        setWeather: (weather) => set({ weather }),
        resetDemo: () => {
          const seed = isDemo ? makeSeed() : makeEmptySeed();
          // „Meine Werkstatt“ leeren: eigene Geräte, Werkzeuge und Einstellungen bleiben, nur Belegung und Status werden zurückgesetzt
          const keep = isDemo ? {} : { settings: get().settings, devices: get().devices.map((d) => ({ ...d, status: d.kind === 'werkzeug' ? d.status : ('bereit' as const), slots: d.slots?.map((sl) => ({ index: sl.index })) })) };
          set({ ...seed, ...keep, weather: get().weather, ui: { commandOpen: false, drafts: {}, recent: [] } }); get().toast(isDemo ? 'Demodaten zurückgesetzt' : 'Werkstatt geleert');
        },
        exportJson: () => {
          const s = get();
          const data: PersistedState = { version: 1, seededAt: s.seededAt, projects: s.projects, devices: s.devices, spools: s.spools, tasks: s.tasks, prints: s.prints, reports: s.reports, appointments: s.appointments, shopping: s.shopping, settings: s.settings, energy: s.energy };
          return JSON.stringify(data, null, 2);
        },
        applyCloudState: (j) => set((s) => ({ ...normalizeState(j), ui: { ...s.ui, sheet: s.ui.sheet && ['konto', 'einstellungen', 'bereich', 'ueber'].includes(s.ui.sheet.kind) ? s.ui.sheet : undefined } })),
        importJson: (text) => {
          try {
            const j = JSON.parse(text);
            if (!j || j.version !== 1 || !Array.isArray(j.projects)) return { ok: false, error: 'Keine gültige 3Druckwerkbank-Datei (version 1 erwartet).' };
            try { localStorage.setItem(`${storageName}:vor-import`, get().exportJson()); } catch { /* Speicher voll: ohne Kopie */ }
            set((s) => ({ ...normalizeState(j), ui: { ...s.ui, sheet: undefined, drafts: {} } }));
            get().toast('Daten importiert');
            return { ok: true };
          } catch (e) { return { ok: false, error: (e as Error).message }; }
        },

        upsertProject: (p) => set((s) => {
          const exists = s.projects.some((x) => x.id === p.id);
          const np = touch(exists ? p : { ...p, history: [ev('angelegt', 'Projekt angelegt'), ...p.history] });
          return { projects: exists ? s.projects.map((x) => (x.id === p.id ? np : x)) : [np, ...s.projects] };
        }),
        deleteProject: (pid) => { for (const pr of get().prints) if (pr.projectId === pid && (pr.status === 'wartend' || pr.status === 'geplant')) get().cancelPrint(pr.id); updProject(pid, (p) => ({ ...p, deletedAt: nowIso() })); get().toast('In den Papierkorb verschoben'); },
        restoreProject: (pid) => updProject(pid, (p) => ({ ...p, deletedAt: undefined, history: [ev('entscheidung', 'Aus dem Papierkorb wiederhergestellt'), ...p.history] })),
        purgeProject: (pid) => {
          // offene Drucke des Projekts abbrechen (gibt Reservierungen frei), fertige wandern ohne Projekt in den Eingang
          for (const pr of get().prints) if (pr.projectId === pid && (pr.status === 'wartend' || pr.status === 'läuft' || pr.status === 'geplant')) get().cancelPrint(pr.id);
          set((s) => ({ projects: s.projects.filter((p) => p.id !== pid), tasks: s.tasks.filter((t) => t.projectId !== pid), reports: s.reports.filter((r) => r.projectId !== pid), prints: s.prints.filter((p) => p.projectId !== pid || p.status === 'fertig').map((p) => (p.projectId === pid ? { ...p, projectId: undefined, imported: true } : p)) }));
        },
        setTemplate: (pid, on) => { updProject(pid, (p) => ({ ...p, isTemplate: on, history: on ? [ev('entscheidung', 'Als Vorlage gespeichert'), ...p.history] : p.history })); if (on) get().toast('Als Vorlage gespeichert'); },
        addEnergy: (e) => set((s) => ({ energy: [{ ...e, id: id('e') }, ...(s.energy ?? [])] })),
        deleteEnergy: (eid) => set((s) => ({ energy: (s.energy ?? []).filter((x) => x.id !== eid) })),
        ignorePrint: (prid, on) => set((s) => ({ prints: s.prints.map((p) => (p.id === prid ? { ...p, ignored: on } : p)) })),
        projectFromPrint: (prid) => {
          const pr = get().prints.find((x) => x.id === prid); if (!pr) return ''; const nid = id('p');
          const name = pr.name.replace(/\.(gcode|3mf|stl)$/i, '').replace(/_/g, ' ');
          const p: Project = { id: nid, name, description: `Aus importiertem Druck „${pr.name}“ angelegt.`, type: 'Sonstiges / Universal', areas: [], tags: [], priority: 2, difficulty: 2, stage: 'Druck', progress: 50, favorite: false, createdAt: nowIso(), updatedAt: nowIso(), island: { kind: 'bibliothek', libraryId: 'werkstatt', frame: { ratio: 'quer', offsetX: 0, offsetY: 0, zoom: 1, style: 'holz' } }, milestones: ['Idee', 'Konstruktion', 'Testdruck', 'Anpassen', 'Finaldruck', 'Fertig'].map((t, i) => ({ id: id('ms'), title: t, done: i < 3, order: i })), versions: [], files: [], notes: '', experiences: [], history: [ev('angelegt', 'Projekt aus Druck erstellt', pr.name)], requiredSpools: [] };
          set((s) => ({ projects: [p, ...s.projects], prints: s.prints.map((x) => (x.id === prid ? { ...x, projectId: nid, imported: false } : x)) }));
          get().toast('Neues Projekt aus Druck erstellt'); return nid;
        },
        setWaitReason: (prid, reason) => set((s) => ({ prints: s.prints.map((p) => (p.id === prid ? { ...p, waitReason: reason } : p)) })),
        touchRecent: (rid) => set((s) => ({ ui: { ...s.ui, recent: [rid, ...s.ui.recent.filter((x) => x !== rid)].slice(0, 20) } })),
        spotlight: (projectId) => set((s) => ({ ui: { ...s.ui, spotlight: { projectId, until: Date.now() + 2600 } } })),
        addMaintenance: (deviceId, title, dueIso) => updDevice(deviceId, (d) => ({ ...d, maintenance: [...d.maintenance, { id: id('m'), title, due: dueIso, done: false }] })),
        addTasks: (pid, titles, kind = 'allgemein') => set((s) => ({ tasks: [...s.tasks, ...titles.map((title, i) => ({ id: id('t'), projectId: pid, title, done: false, kind, order: s.tasks.length + i, createdAt: nowIso() }))] })),
        duplicateProject: (pid) => {
          const src = get().projects.find((p) => p.id === pid); if (!src) return '';
          const nid = id('p');
          const copy: Project = { ...src, id: nid, name: `${src.name} (Kopie)`, favorite: false, isTemplate: false, deletedAt: undefined, plannedStart: undefined, plannedEnd: undefined, createdAt: nowIso(), updatedAt: nowIso(), archivedAt: undefined, stage: 'Idee', progress: 0, progressManual: false,
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
          const m = milestones.find((x) => x.id === mid); if (!m) return p;
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
            if ((status === 'aktuell' || status === 'beste' || status === 'final') && v.status === status) return { ...v, status: 'verworfen' as VersionStatus };
            return v;
          });
          const v = p.versions.find((x) => x.id === vid);
          return { ...p, versions, history: v ? [ev('entscheidung', `${v.label} als „${status}“ markiert`), ...p.history] : p.history };
        }),
        updateVersion: (pid, vid, patch) => updProject(pid, (p) => ({ ...p, versions: p.versions.map((v) => (v.id === vid ? { ...v, ...patch } : v)) })),
        setNotes: (pid, notes) => updProject(pid, (p) => ({ ...p, notes })),
        addExperience: (pid, text) => updProject(pid, (p) => ({ ...p, experiences: [...p.experiences, text], history: [ev('erfahrung', text), ...p.history] })),
        addFile: (pid, f) => updProject(pid, (p) => ({ ...p, files: [f, ...p.files] })),
        setRequiredSpool: (pid, spoolId, grams) => updProject(pid, (p) => ({ ...p, requiredSpools: grams <= 0 ? p.requiredSpools.filter((r) => r.spoolId !== spoolId) : p.requiredSpools.some((r) => r.spoolId === spoolId) ? p.requiredSpools.map((r) => (r.spoolId === spoolId ? { ...r, grams } : r)) : [...p.requiredSpools, { spoolId, grams }] })),
        archiveProject: (pid, result, lessons) => {
          const s = get(); const p = s.projects.find((x) => x.id === pid); if (!p) return;
          for (const pr of s.prints) if (pr.projectId === pid && (pr.status === 'wartend' || pr.status === 'geplant')) get().cancelPrint(pr.id);
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
          const src = get().projects.find((p) => p.id === pid); if (!src) return ''; const nid = id('p');
          const copy: Project = { ...src, id: nid, name: `${src.name} – neu`, favorite: false, isTemplate: false, deletedAt: undefined, plannedStart: undefined, plannedEnd: undefined, createdAt: nowIso(), updatedAt: nowIso(), archivedAt: undefined, stage: 'Idee', progress: 0, progressManual: false, templateOf: src.id,
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
          if (!next || !s.devices.some((d) => d.id === printerId && d.kind === 'drucker')) return {};
          return { prints: s.prints.map((p) => (p.id === next.id ? { ...p, status: 'läuft', startedAt: nowIso(), waitReason: undefined } : p)), devices: s.devices.map((d) => (d.id === printerId ? { ...d, status: 'druckt' } : d)) };
        }),
        movePrint: (prid, dir) => set((s) => {
          const q = s.prints.filter((p) => p.status === 'wartend').sort((a, b) => a.queueOrder - b.queueOrder); const i = q.findIndex((p) => p.id === prid); const j = i + dir;
          if (i < 0 || j < 0 || j >= q.length) return {}; [q[i], q[j]] = [q[j], q[i]];
          const orders = new Map(q.map((p, k) => [p.id, k]));
          return { prints: s.prints.map((p) => (orders.has(p.id) ? { ...p, queueOrder: orders.get(p.id)! } : p)) };
        }),
        cancelPrint: (prid) => {
          const p = get().prints.find((x) => x.id === prid); if (!p || p.booked || !(p.status === 'wartend' || p.status === 'läuft' || p.status === 'geplant')) return;
          set((s) => ({ prints: s.prints.map((x) => (x.id === prid ? { ...x, status: 'abgebrochen', finishedAt: nowIso() } : x)), devices: s.devices.map((d) => (d.id === p.printerId && p.status === 'läuft' ? { ...d, status: 'bereit' } : d)) }));
          if (p.spoolId && !p.booked) updSpool(p.spoolId, (sp) => ({ ...sp, reservedGrams: Math.max(0, sp.reservedGrams - p.gramsPlanned) }));
        },
        finishPrint: (prid, result, gramsUsed) => {
          const p = get().prints.find((x) => x.id === prid); if (!p || p.booked || p.status !== 'läuft') return;
          const used = Number.isFinite(gramsUsed) && (gramsUsed as number) >= 0 ? (gramsUsed as number) : p.gramsPlanned;
          set((s) => ({ prints: s.prints.map((x) => (x.id === prid ? { ...x, status: 'fertig', result, finishedAt: nowIso(), gramsUsed: used, booked: true } : x)), devices: s.devices.map((d) => (d.id === p.printerId ? { ...d, status: 'bereit', hoursTotal: d.hoursTotal + p.estimatedMinutes / 60 } : d)) }));
          if (p.spoolId) updSpool(p.spoolId, (sp) => ({ ...sp, remainingGrams: Math.max(0, sp.remainingGrams - used), reservedGrams: Math.max(0, sp.reservedGrams - p.gramsPlanned) }));
          if (p.projectId) {
            const label = result === 'erfolg' ? 'erfolgreich' : result === 'fehldruck' ? 'Fehldruck' : 'mit Nacharbeit';
            get().addHistory(p.projectId, result === 'fehldruck' ? 'fehler' : 'druck', `Druck ${label}: ${p.name}`, `${used} g verbraucht`);
            if (result === 'nacharbeit') get().addTask({ projectId: p.projectId, title: `Nacharbeit: ${p.name}`, kind: 'nacharbeit' });
            if (result === 'fehldruck') get().addTask({ projectId: p.projectId, title: `Ursache prüfen: ${p.name}`, kind: 'allgemein' });
          }
        },
        // Die Zeit läuft nur als Schätzung mit: ist sie um, wartet der Druck auf das Ergebnis. Gebucht wird erst, wenn der Nutzer es bestätigt.
        tickPrints: (now) => {
          const due = get().prints.filter((p) => p.status === 'läuft' && !p.resultDue && p.startedAt && now - new Date(p.startedAt).getTime() >= p.estimatedMinutes * 60_000);
          if (!due.length) return;
          const ids = new Set(due.map((p) => p.id));
          set((s) => ({ prints: s.prints.map((p) => (ids.has(p.id) ? { ...p, resultDue: true } : p)) }));
          get().toast(`Druckzeit abgelaufen: ${due[0].name}. Bitte Ergebnis buchen.`);
        },

        upsertSpool: (sp) => set((s) => ({ spools: s.spools.some((x) => x.id === sp.id) ? s.spools.map((x) => (x.id === sp.id ? sp : x)) : [...s.spools, sp] })),
        deleteSpool: (sid) => set((s) => ({ spools: s.spools.filter((x) => x.id !== sid), devices: s.devices.map((d) => (d.slots?.some((sl) => sl.spoolId === sid) ? { ...d, slots: d.slots.map((sl) => (sl.spoolId === sid ? { index: sl.index } : sl)) } : d)), projects: s.projects.map((p) => (p.requiredSpools.some((r) => r.spoolId === sid) ? { ...p, requiredSpools: p.requiredSpools.filter((r) => r.spoolId !== sid) } : p)), prints: s.prints.map((p) => (p.spoolId === sid ? { ...p, spoolId: undefined } : p)) })),
        bookConsumption: (sid, grams, note) => { if (!(grams > 0)) return; updSpool(sid, (sp) => ({ ...sp, remainingGrams: Math.max(0, sp.remainingGrams - grams), notes: note ? `${sp.notes ? sp.notes + '\n' : ''}${new Date().toLocaleDateString('de-AT')}: ${grams} g gebucht – ${note}` : sp.notes })); get().toast(`${grams} g verbucht`); },
        markDried: (sid) => updSpool(sid, (sp) => ({ ...sp, lastDriedAt: nowIso() })),
        assignSlot: (deviceId, index, spoolId) => { set((s) => ({ devices: s.devices.map((d) => (d.id === deviceId ? { ...d, slots: (d.slots ?? []).map((sl) => (sl.index === index ? { ...sl, spoolId } : sl)) } : spoolId && d.slots?.some((sl) => sl.spoolId === spoolId) ? { ...d, slots: d.slots.map((sl) => (sl.spoolId === spoolId ? { index: sl.index } : sl)) } : d)) })); if (spoolId) { const d = get().devices.find((x) => x.id === deviceId); updSpool(spoolId, (sp) => ({ ...sp, location: `${d?.name ?? 'AMS'} Slot ${index}` })); } },
        upsertDevice: (dev) => set((s) => ({ devices: s.devices.some((x) => x.id === dev.id) ? s.devices.map((x) => (x.id === dev.id ? dev : x)) : [...s.devices, dev] })),
        deleteDevice: (deviceId) => {
          const s = get(); const dev = s.devices.find((x) => x.id === deviceId); if (!dev) return { ok: false, error: 'Gerät nicht gefunden.' };
          if (s.prints.some((p) => p.printerId === deviceId && p.status === 'läuft')) return { ok: false, error: 'Auf diesem Drucker läuft gerade ein Druck. Bitte zuerst das Ergebnis buchen oder den Druck abbrechen.' };
          for (const p of s.prints) if (p.printerId === deviceId && (p.status === 'wartend' || p.status === 'geplant')) get().cancelPrint(p.id);
          set((st) => ({
            devices: st.devices.filter((d) => d.id !== deviceId).map((d) => (d.parentId === deviceId ? { ...d, parentId: undefined } : d)),
            projects: st.projects.map((p) => (p.toolIds?.includes(deviceId) ? { ...p, toolIds: p.toolIds.filter((x) => x !== deviceId) } : p)),
            tasks: st.tasks.map((t) => (t.deviceId === deviceId ? { ...t, deviceId: undefined } : t)),
            settings: st.settings.defaultPrinterId === deviceId ? { ...st.settings, defaultPrinterId: st.devices.find((d) => d.kind === 'drucker' && d.id !== deviceId)?.id } : st.settings,
          }));
          get().toast(`„${dev.name}“ gelöscht`);
          return { ok: true };
        },
        deleteMaintenance: (deviceId, mid) => updDevice(deviceId, (d) => ({ ...d, maintenance: d.maintenance.filter((m) => m.id !== mid) })),
        removeFile: (pid, fid) => updProject(pid, (p) => ({ ...p, files: p.files.filter((f) => f.id !== fid) })),
        deleteShopping: (sid) => set((s) => ({ shopping: s.shopping.filter((x) => x.id !== sid) })),
        toggleMaintenance: (deviceId, mid) => updDevice(deviceId, (d) => ({ ...d, maintenance: d.maintenance.map((m) => (m.id === mid ? { ...m, done: !m.done } : m)) })),
        assignPrint: (prid, projectId) => { set((s) => ({ prints: s.prints.map((p) => (p.id === prid ? { ...p, projectId, imported: false } : p)) })); const p = get().prints.find((x) => x.id === prid); if (p) get().addHistory(projectId, 'druck', `Druck zugeordnet: ${p.name}`, p.result); get().toast('Druck dem Projekt zugeordnet'); },
        setProjectTools: (pid, toolIds) => updProject(pid, (p) => ({ ...p, toolIds })),
        setToolStatus: (toolId, status) => updDevice(toolId, (d) => ({ ...d, status })),
        toggleShopping: (sid) => set((s) => ({ shopping: s.shopping.map((x) => (x.id === sid ? { ...x, done: !x.done } : x)) })),
        addShopping: (item) => set((s) => (s.shopping.some((x) => !x.done && x.title.trim().toLowerCase() === item.title.trim().toLowerCase()) ? {} : { shopping: [...s.shopping, { ...item, id: id('sh'), done: false }] })),
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wrap = <K extends keyof Store>(key: K, label: (...a: any[]) => string) => { const orig = api[key] as unknown as (...a: unknown[]) => unknown; (api as unknown as Record<string, unknown>)[key] = (...a: unknown[]) => undoable(label(...a), () => orig(...a)); };
      wrap('deleteProject', () => 'In den Papierkorb verschoben');
      wrap('purgeProject', () => 'Projekt endgültig gelöscht');
      wrap('archiveProject', () => 'Projekt abgeschlossen und archiviert');
      wrap('deleteSpool', () => 'Rolle gelöscht');
      wrap('deleteDevice', (did: string) => `„${get().devices.find((d) => d.id === did)?.name ?? 'Gerät'}“ gelöscht`);
      wrap('deleteTask', () => 'Aufgabe gelöscht');
      wrap('cancelPrint', (prid: string) => (get().prints.find((p) => p.id === prid)?.status === 'läuft' ? 'Druck abgebrochen' : 'Aus der Warteschlange entfernt'));
      wrap('deleteMaintenance', () => 'Wartung gelöscht');
      wrap('removeFile', () => 'Datei entfernt');
      wrap('deleteShopping', () => 'Von der Einkaufsliste entfernt');
      wrap('deleteEnergy', () => 'Eintrag gelöscht');
      wrap('resetDemo', () => (isDemo ? 'Demodaten zurückgesetzt' : 'Werkstatt geleert'));
      wrap('importJson', () => 'Daten importiert');
      return api;
    },
    {
      name: storageName,
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ version: s.version, seededAt: s.seededAt, projects: s.projects, devices: s.devices, spools: s.spools, tasks: s.tasks, prints: s.prints, reports: s.reports, appointments: s.appointments, shopping: s.shopping, settings: s.settings, weather: s.weather, energy: s.energy, ui: { drafts: s.ui.drafts, recent: s.ui.recent } }) as unknown as Store,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Store>;
        // demo projects created before the project-world islands existed: move them onto the new motifs once
        const DEMO_ISLANDS: Record<string, [string, Project['island']['libraryId']]> = { 'p-sensorhalter': ['elektronik', 'projekt-garten'], 'p-zahnrad': ['werkstatt', 'projekt-haushalt'], 'p-schluesselhalter': ['ideen', 'projekt-haushalt'], 'p-pflanzgefaess': ['ideen', 'projekt-deko'] };
        if (Array.isArray(p.projects)) p.projects = p.projects.map((pr) => { const m = DEMO_ISLANDS[pr?.id]; return m && pr.island?.kind === 'bibliothek' && pr.island.libraryId === m[0] ? { ...pr, island: { ...pr.island, libraryId: m[1] } } : pr; });
        if (!p.projects && !p.devices && !p.spools) return { ...current, ui: { ...current.ui, drafts: p.ui?.drafts ?? {}, recent: Array.isArray(p.ui?.recent) ? p.ui.recent : [] } };
        return { ...current, ...normalizeState(p), weather: p.weather && p.weather.data && Array.isArray(p.weather.data.hourly) ? p.weather : undefined, ui: { ...current.ui, drafts: p.ui?.drafts && typeof p.ui.drafts === 'object' ? p.ui.drafts : {}, recent: Array.isArray(p.ui?.recent) ? p.ui.recent : [] } };
      },
    },
  ),
);

export const availableGrams = (sp: Spool) => Math.max(0, sp.remainingGrams - sp.reservedGrams);
export const activeProjects = (projects: Project[]) => projects.filter((p) => !p.archivedAt && !p.deletedAt);
export const archivedProjects = (projects: Project[]) => projects.filter((p) => !!p.archivedAt && !p.deletedAt);
export const liveProjects = (projects: Project[]) => projects.filter((p) => !p.deletedAt);
export function printProgress(p: PrintJob, now = Date.now()): number {
  if (p.status === 'fertig') return 1;
  if (p.status !== 'läuft' || !p.startedAt) return 0;
  return clamp((now - new Date(p.startedAt).getTime()) / (Math.max(1, p.estimatedMinutes) * 60_000), 0, 1);
}
export function printRemainingMin(p: PrintJob, now = Date.now()): number {
  return Math.max(0, p.estimatedMinutes * (1 - printProgress(p, now)));
}
