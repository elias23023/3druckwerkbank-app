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
export const PROJECT_TYPES = ['Reparatur / Ersatzteil', 'Halterung / Befestigung', 'Organizer / Aufbewahrung', 'Werkzeug / Hilfsmittel', 'Gehäuse / Elektronik', 'Mechanisches Bauteil', 'Prototyp / Testteil', 'Deko / Geschenk', 'Modell / Miniatur', 'Experiment / Neue Idee', 'Sonstiges / Universal'];
export const AREAS = ['Werkstatt', 'Garten & Outdoor', 'Haushalt', 'Elektronik & Smart Home', 'Fahrzeug & Mobilität', 'Büro & Arbeitsplatz', 'Hobby & Freizeit', 'Technik & Maschinen', 'Deko & Persönliches', 'Prototyping & Entwicklung', 'Schule / Lernen', 'Universal / Sonstiges'];
/** Milestone templates per project type (Nachtrag 9.2). */
export const MILESTONE_TEMPLATES: Record<string, string[]> = {
  default: ['Idee', 'Konstruktion', 'Testdruck', 'Anpassen', 'Finaldruck', 'Fertig'],
  'Reparatur / Ersatzteil': ['Schaden aufnehmen', 'Teil vermessen', 'Konstruktion', 'Testdruck', 'Passung prüfen', 'Finaldruck', 'Einbau'],
  'Halterung / Befestigung': ['Idee & Maße', 'Konstruktion', 'Testdruck', 'Klemmung/Passung', 'Finaldruck', 'Montage'],
  'Organizer / Aufbewahrung': ['Raster & Maße', 'Konstruktion', 'Probeeinsatz', 'Serie drucken', 'Einräumen'],
  'Gehäuse / Elektronik': ['Platine vermessen', 'Belüftung & Kabel', 'Konstruktion', 'Testdruck', 'Passung & Einbau', 'Finaldruck'],
  'Prototyp / Testteil': ['Idee', 'Schnellentwurf', 'Testdruck', 'Bewerten', 'Iteration', 'Entscheidung'],
  'Deko / Geschenk': ['Idee', 'Modell wählen/konstruieren', 'Druck', 'Nacharbeit & Finish', 'Fertig'],
};
/** Checklist templates (Fachübersicht 5). */
export const CHECKLISTS: Record<string, string[]> = {
  Druckvorbereitung: ['3D-Modell auf Fehler prüfen', 'Slicer-Einstellungen kontrollieren', 'Druckbett reinigen und ausrichten', 'Passendes Filament vorbereiten', 'Düse und Werkzeug kontrollieren', 'Freien, einsatzbereiten Drucker sicherstellen'],
  Druckstart: ['Druckdatei übertragen', 'Druck starten', 'Erste Schicht beobachten', 'Haftung kontrollieren', 'Voraussichtliches Druckende prüfen'],
  Nachbearbeitung: ['Abkühlen lassen', 'Sichere Entnahme', 'Stützen entfernen', 'Oberfläche bearbeiten', 'Reinigung', 'Bett und Düse kontrollieren', 'Qualitätsprüfung', 'Abschlussfotos'],
};
/** Calibration templates with historic reference times (Fachübersicht 13). */
export const CALIBRATIONS: { title: string; minutes: number }[] = [
  { title: 'Motorgeräuschunterdrückung', minutes: 16 }, { title: 'Vibrationskompensation', minutes: 4 }, { title: 'Automatische Bettnivellierung', minutes: 23 }, { title: 'Hochtemperatur-Bettnivellierung', minutes: 14 }, { title: 'Düsenversatz', minutes: 3.5 },
];
/** Filament product references from the master plan (historic values, not re-verified). */
export interface FilamentRef { product: string; material: string; nozzle: string; bed: string; speed: string; fan: string; dry: string }
export const FILAMENT_CATALOG: FilamentRef[] = [
  { product: 'Bambu Lab PETG HF', material: 'PETG', nozzle: '—', bed: '—', speed: '—', fan: '—', dry: '65 °C, 8 h (Produkt) / 12 h (Gerät)' },
  { product: 'Bambu Lab PLA Basic', material: 'PLA', nozzle: '—', bed: '—', speed: '—', fan: '—', dry: '45 °C, 12 h (Gerät)' },
  { product: 'Bambu Lab PLA Matte', material: 'PLA', nozzle: '—', bed: '—', speed: '—', fan: '—', dry: '45 °C, 12 h (Gerät)' },
  { product: 'eSUN PLA+ / PLA Pro', material: 'PLA', nozzle: '210–230', bed: '45–60', speed: 'bis 300', fan: '100 %', dry: '50 °C, 8–12 h' },
  { product: 'eSUN PLA Basic', material: 'PLA', nozzle: '210–230', bed: '45–60', speed: 'bis 300', fan: '100 %', dry: '50 °C, 8–12 h' },
  { product: 'eSUN PLA+HS', material: 'PLA', nozzle: '210–230', bed: '45–60', speed: 'bis 350', fan: '100 %', dry: '—' },
  { product: 'SUNLU PLA Meta', material: 'PLA', nozzle: '185–225', bed: '50–60', speed: '50–200', fan: '—', dry: '50 °C, Dauer unbekannt' },
  { product: 'SUNLU PLA+ 2.0', material: 'PLA', nozzle: '205–245', bed: '—', speed: '50–300', fan: '—', dry: '—' },
  { product: 'Prusament PLA', material: 'PLA', nozzle: '200–220', bed: '40–60', speed: '—', fan: '100 %', dry: '—' },
  { product: 'Prusament PETG', material: 'PETG', nozzle: '240–260', bed: '70–90', speed: '—', fan: '50 %', dry: '—' },
  { product: 'Prusament PLA High Speed', material: 'PLA', nozzle: '190–230', bed: '40–60', speed: '—', fan: '—', dry: '—' },
  { product: 'Polymaker PolyTerra PLA', material: 'PLA', nozzle: '190–230', bed: '25–50', speed: '50–300', fan: 'ein', dry: '55 °C, 6 h' },
  { product: 'Polymaker PETG', material: 'PETG', nozzle: '240–260', bed: '60–70', speed: 'bis 300', fan: '20–60 %', dry: '—' },
  { product: 'Polymaker PolyLite PETG', material: 'PETG', nozzle: '230–240', bed: '70–80', speed: '30–50', fan: '20 %', dry: '—' },
  { product: 'Overture PLA Professional', material: 'PLA', nozzle: '190–230', bed: '—', speed: '—', fan: '—', dry: '—' },
  { product: 'Overture PETG', material: 'PETG', nozzle: '230–250', bed: '80–90', speed: '—', fan: '30–50 %', dry: '65 °C, 7 h' },
];
export const DRYING_PROFILES: { name: string; temp: number; hours: number; note?: string }[] = [
  { name: 'PLA Basic', temp: 45, hours: 12 }, { name: 'PLA Matte', temp: 45, hours: 12 }, { name: 'PLA-CF', temp: 45, hours: 12 }, { name: 'PETG Basic', temp: 65, hours: 12 }, { name: 'PETG HF', temp: 65, hours: 12 }, { name: 'PETG Matte', temp: 65, hours: 12 }, { name: 'PETG-CF', temp: 65, hours: 12 }, { name: 'TPU for AMS', temp: 65, hours: 12, note: 'Trocknung in AMS-A möglicherweise unvollständig' }, { name: 'Support For PLA/PETG', temp: 60, hours: 12 },
];
export const COLOR_REFS: { name: string; hex: string }[] = [
  { name: 'PETG HF Yellow', hex: '#FFD00B' }, { name: 'PETG HF Orange', hex: '#F75403' }, { name: 'PETG HF Green', hex: '#00AE42' }, { name: 'PETG HF Red', hex: '#EB3A3A' }, { name: 'PETG HF Blue', hex: '#002E96' }, { name: 'PETG HF Black', hex: '#000000' }, { name: 'PETG HF White', hex: '#FFFFFF' },
  { name: 'PLA Marble White Marble', hex: '#F7F3F0' }, { name: 'PLA Marble Red Granite', hex: '#AD4E38' }, { name: 'ABS Beige', hex: '#DFD1A7' }, { name: 'ABS Lavender', hex: '#7248BD' }, { name: 'ABS Olive', hex: '#789D4A' }, { name: 'ABS Tangerine Yellow', hex: '#FFC72C' }, { name: 'ABS Azure', hex: '#489FDF' },
];

export type LibraryIsland = 'werkstatt' | 'elektronik' | 'ideen' | 'rahmen' | 'heute' | 'material' | 'wetter' | 'archiv' | 'drucker';
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
  gramsPlanned: number; gramsUsed?: number; booked?: boolean; notes?: string; queueOrder: number; imported?: boolean; ignored?: boolean; waitReason?: string;
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
  templateOf?: Id; toolIds?: Id[]; deletedAt?: ISODate; isTemplate?: boolean; plannedStart?: ISODate; plannedEnd?: ISODate; difficultyReason?: string;
}

export type DeviceKind = 'drucker' | 'ams' | 'trockner' | 'werkzeug';
export interface MaintenanceItem { id: Id; title: string; due: ISODate; done: boolean }
export interface Device {
  id: Id; name: string; model: string; kind: DeviceKind; status: 'bereit' | 'druckt' | 'wartung' | 'offline' | 'trocknet' | 'verfügbar' | 'im Einsatz' | 'fehlt';
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

export interface EnergyEntry { id: Id; at: ISODate; projectId?: Id; wh: number; pricePerKwh: number; source: 'messung' | 'schaetzung'; note?: string }

export interface ShoppingItem { id: Id; title: string; qty: string; price?: number; url?: string; projectId?: Id; done: boolean; auto?: boolean }

export interface Settings {
  theme: 'auto' | 'hell' | 'dunkel'; motion: 'auto' | 'reduziert' | 'voll'; showQuote: boolean;
  location: { name: string; lat: number; lon: number; tz: string };
  pvKwp: number; pricePerKwh: number; printerWatts: number; userName?: string;
  parallax?: number; notifications?: 'alle' | 'wichtig' | 'aus'; defaultPrinterId?: Id; preferredMaterials?: string[];
  /** Jahreszeit: automatisch nach Datum oder fest (Vorschau) */
  season?: 'auto' | 'fruehling' | 'sommer' | 'herbst' | 'winter';
}

export interface WeatherHour { time: string; temp: number; code: number; precipProb: number; precip: number; cloud: number; ghi: number; isDay: boolean; wind: number; gust?: number; pressure?: number; uv?: number }
export interface WeatherDay { date: string; code: number; tmax: number; tmin: number; sunrise: string; sunset: string; daylightSec: number; precipSum: number; ghiSum: number; gustMax?: number; uvMax?: number }
export interface WeatherData {
  current: { time: string; temp: number; feels: number; humidity: number; precip: number; code: number; cloud: number; wind: number; isDay: boolean; pressure?: number; uv?: number };
  hourly: WeatherHour[]; daily: WeatherDay[];
}
export interface WeatherCache { fetchedAt: ISODate; data: WeatherData; error?: string }

export interface PersistedState {
  version: number; seededAt?: ISODate;
  projects: Project[]; devices: Device[]; spools: Spool[]; tasks: Task[]; prints: PrintJob[];
  reports: ArchiveReport[]; appointments: Appointment[]; shopping: ShoppingItem[]; settings: Settings; weather?: WeatherCache; energy?: EnergyEntry[];
}
