export type Id = string;
export type ISODate = string;

export type WorldId = 'heute' | 'projekte' | 'druck' | 'material' | 'wetter' | 'archiv';

export const WORLDS: { id: WorldId; label: string; sub: string; key: string }[] = [
  { id: 'heute', label: 'Heute', sub: 'Dein Tag auf einen Blick', key: '1' },
  { id: 'projekte', label: 'Projekte', sub: 'Deine Ideen, Schritt für Schritt', key: '2' },
  { id: 'druck', label: '3D-Druck', sub: 'Drucker, Bauteile, Materialfluss', key: '3' },
  { id: 'material', label: 'Material', sub: 'Rollen, Bestand, Lagerorte', key: '4' },
  { id: 'wetter', label: 'Wetter', sub: 'Lage, Prognose, Zeitfenster', key: '5' },
  { id: 'archiv', label: 'Archiv', sub: 'Bewahrt. Wiederentdeckt.', key: '6' },
];

export type Stage = 'Idee' | 'Konstruktion' | 'Planung' | 'Vorbereitung' | 'Druck' | 'Nacharbeit' | 'Qualität' | 'Abgeschlossen';
export const STAGES: Stage[] = ['Idee', 'Konstruktion', 'Planung', 'Vorbereitung', 'Druck', 'Nacharbeit', 'Qualität', 'Abgeschlossen'];
export const PROJECT_TYPES = ['Reparatur', 'Halterung', 'Organizer', 'Werkzeug', 'Gehäuse', 'Mechanisches Teil', 'Prototyp', 'Experiment'];
export const AREAS = ['Werkstatt', 'Elektronik', 'Garten', 'Haushalt', 'Fahrzeug', 'Büro', 'Energie'];

export type LibraryIsland = 'werkstatt' | 'elektronik' | 'ideen' | 'rahmen';
export interface IslandImageConfig {
  kind: 'bibliothek' | 'eigenes';
  libraryId: LibraryIsland;
  photoDataUrl?: string;
  frame: { ratio: 'quer' | 'hoch' | 'quadrat'; offsetX: number; offsetY: number; zoom: number; style: 'holz' | 'metall' };
}

export interface Milestone { id: Id; title: string; done: boolean; skipped?: boolean; order: number }
export type TaskKind = 'allgemein' | 'druck' | 'wartung' | 'nacharbeit' | 'einkauf' | 'trocknung';
export interface Task { id: Id; projectId?: Id; deviceId?: Id; title: string; done: boolean; skipped?: boolean; due?: ISODate; kind: TaskKind; order: number; createdAt: ISODate }
export type VersionStatus = 'aktuell' | 'beste' | 'final' | 'verworfen';
export interface Version { id: Id; label: string; status: VersionStatus; createdAt: ISODate; notes?: string; changes: string[]; dims?: string; material?: string; settings?: string }
export type PrintStatus = 'geplant' | 'wartend' | 'läuft' | 'fertig' | 'fehlgeschlagen' | 'abgebrochen';
export interface PrintJob {
  id: Id; projectId?: Id; versionId?: Id; printerId: Id; spoolId?: Id; name: string; kind: 'test' | 'final';
  status: PrintStatus; result?: 'erfolg' | 'fehldruck' | 'nacharbeit';
  estimatedMinutes: number; startedAt?: ISODate; finishedAt?: ISODate;
  gramsPlanned: number; gramsUsed?: number; booked?: boolean; notes?: string; queueOrder: number;
}
export interface FileRef { id: Id; name: string; kind: 'foto' | 'skizze' | 'stl' | '3mf' | 'zeitraffer' | 'sonstiges'; createdAt: ISODate; dataUrl?: string; size?: number }
export type HistoryType = 'angelegt' | 'meilenstein' | 'version' | 'druck' | 'entscheidung' | 'fehler' | 'erfahrung' | 'material' | 'abgeschlossen' | 'notiz';
export interface HistoryEvent { id: Id; at: ISODate; type: HistoryType; title: string; detail?: string }

export interface Project {
  id: Id; name: string; description: string; type: string; areas: string[]; tags: string[];
  priority: 1 | 2 | 3; difficulty: 1 | 2 | 3 | 4 | 5; stage: Stage; progress: number; progressManual?: boolean;
  favorite: boolean; createdAt: ISODate; updatedAt: ISODate; archivedAt?: ISODate;
  island: IslandImageConfig;
  milestones: Milestone[]; versions: Version[]; files: FileRef[]; notes: string; experiences: string[];
  history: HistoryEvent[]; requiredSpools: { spoolId: Id; grams: number }[]; plannedHours?: number;
  templateOf?: Id;
}

export type DeviceKind = 'drucker' | 'ams' | 'trockner' | 'werkzeug';
export interface MaintenanceItem { id: Id; title: string; due: ISODate; done: boolean }
export interface Device {
  id: Id; name: string; model: string; kind: DeviceKind; status: 'bereit' | 'druckt' | 'wartung' | 'offline' | 'trocknet';
  location: string; nozzle?: string; slots?: { index: number; spoolId?: Id }[]; hoursTotal: number;
  maintenance: MaintenanceItem[]; notes?: string; parentId?: Id; wattage?: number;
}

export interface Spool {
  id: Id; label: string; material: string; brand: string; colorName: string; colorHex: string;
  initialGrams: number; remainingGrams: number; reservedGrams: number; price?: number; location: string;
  openedAt?: ISODate; lastDriedAt?: ISODate; profile?: string; notes?: string; reorderUrl?: string;
}

export interface ArchiveReport {
  id: Id; projectId: Id; completedAt: ISODate; result: string; versionsUsed: string[];
  printsTotal: number; printsFailed: number; gramsUsed: number; hours: number; costEur: number; lessons: string[];
}

export interface Appointment { id: Id; title: string; at: ISODate; kind: 'termin' | 'erinnerung' }

export interface ShoppingItem { id: Id; title: string; qty: string; price?: number; url?: string; projectId?: Id; done: boolean; auto?: boolean }

export interface Settings {
  theme: 'auto' | 'hell' | 'dunkel'; motion: 'auto' | 'reduziert' | 'voll'; showQuote: boolean;
  location: { name: string; lat: number; lon: number; tz: string };
  pvKwp: number; pricePerKwh: number; printerWatts: number;
}

export interface WeatherHour { time: string; temp: number; code: number; precipProb: number; precip: number; cloud: number; ghi: number; isDay: boolean; wind: number }
export interface WeatherDay { date: string; code: number; tmax: number; tmin: number; sunrise: string; sunset: string; daylightSec: number; precipSum: number; ghiSum: number }
export interface WeatherData {
  current: { time: string; temp: number; feels: number; humidity: number; precip: number; code: number; cloud: number; wind: number; isDay: boolean };
  hourly: WeatherHour[]; daily: WeatherDay[];
}
export interface WeatherCache { fetchedAt: ISODate; data: WeatherData; error?: string }

export interface PersistedState {
  version: number; seededAt?: ISODate;
  projects: Project[]; devices: Device[]; spools: Spool[]; tasks: Task[]; prints: PrintJob[];
  reports: ArchiveReport[]; appointments: Appointment[]; shopping: ShoppingItem[]; settings: Settings; weather?: WeatherCache;
}
