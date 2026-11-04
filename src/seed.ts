import type { ArchiveReport, Appointment, Device, EnergyEntry, HistoryEvent, PersistedState, Project, PrintJob, Settings, ShoppingItem, Spool, Task } from './types';

const h = (hours: number, from: Date) => new Date(from.getTime() + hours * 3600_000).toISOString();
const d = (days: number, from: Date) => new Date(from.getTime() + days * 86400_000).toISOString();

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto', motion: 'auto', showQuote: true,
  location: { name: 'Weitra, Niederösterreich', lat: 48.7037, lon: 14.9088, tz: 'Europe/Vienna' },
  pvKwp: 5, pricePerKwh: 0.22, printerWatts: 120, parallax: 1, notifications: 'alle', defaultPrinterId: 'd-x1c', preferredMaterials: ['PETG', 'PLA'],
};

function hist(now: Date, items: [number, HistoryEvent['type'], string, string?][]): HistoryEvent[] {
  return items.map(([days, type, title, detail], i) => ({ id: `h-${title.slice(0, 6)}-${i}`, at: d(days, now), type, title, detail }));
}

export function makeSeed(now = new Date()): PersistedState {
  const spools: Spool[] = [
    { id: 's-petg-schwarz-1', label: 'PETG Schwarz #1', material: 'PETG', brand: 'Prusament', colorName: 'Jet Black', colorHex: '#1b1b1f', initialGrams: 1000, remainingGrams: 420, reservedGrams: 120, price: 29.9, location: 'Regal A1', openedAt: d(-40, now), lastDriedAt: d(-6, now), profile: 'PETG 0.2 mm' },
    { id: 's-petg-schwarz-2', label: 'PETG Schwarz #2', material: 'PETG', brand: 'Prusament', colorName: 'Jet Black', colorHex: '#1b1b1f', initialGrams: 1000, remainingGrams: 1000, reservedGrams: 0, price: 29.9, location: 'Regal A1', profile: 'PETG 0.2 mm' },
    { id: 's-pla-weiss', label: 'PLA Weiß', material: 'PLA', brand: 'Bambu', colorName: 'Jade White', colorHex: '#efeee8', initialGrams: 1000, remainingGrams: 640, reservedGrams: 0, price: 24.9, location: 'AMS Slot 1', openedAt: d(-20, now), profile: 'PLA 0.2 mm' },
    { id: 's-pla-indigo', label: 'PLA Mat Indigo', material: 'PLA', brand: 'Bambu', colorName: 'Matte Indigo', colorHex: '#2f4a8a', initialGrams: 1000, remainingGrams: 310, reservedGrams: 60, price: 26.9, location: 'AMS Slot 2', openedAt: d(-55, now) },
    { id: 's-pla-bronze', label: 'PLA Mat Bronze', material: 'PLA', brand: 'Bambu', colorName: 'Matte Bronze', colorHex: '#9a6a3c', initialGrams: 1000, remainingGrams: 880, reservedGrams: 0, price: 26.9, location: 'AMS Slot 3', openedAt: d(-10, now) },
    { id: 's-petg-gruen', label: 'PETG Grün', material: 'PETG', brand: 'Sunlu', colorName: 'Waldgrün', colorHex: '#2f7a4a', initialGrams: 1000, remainingGrams: 970, reservedGrams: 0, price: 19.9, location: 'AMS Slot 4', openedAt: d(-3, now) },
    { id: 's-tpu-schwarz', label: 'TPU Schwarz', material: 'TPU', brand: 'Sunlu', colorName: 'Schwarz', colorHex: '#262626', initialGrams: 500, remainingGrams: 120, reservedGrams: 0, price: 22.5, location: 'Regal B1', openedAt: d(-120, now), lastDriedAt: d(-30, now), notes: 'Langsam drucken, 25 mm/s. Direkt aus dem Trockner.' },
    { id: 's-abs-grau', label: 'ABS Grau', material: 'ABS', brand: 'Polymaker', colorName: 'Grau', colorHex: '#8a8f96', initialGrams: 1000, remainingGrams: 90, reservedGrams: 0, price: 27.9, location: 'Regal B2', openedAt: d(-200, now) },
    { id: 's-asa-weiss', label: 'ASA Weiß', material: 'ASA', brand: 'Polymaker', colorName: 'Weiß', colorHex: '#f2f2f0', initialGrams: 1000, remainingGrams: 760, reservedGrams: 0, price: 31.9, location: 'Trockner', openedAt: d(-15, now), lastDriedAt: d(-1, now), notes: 'Für Außenteile (UV-stabil).' },
  ];

  const devices: Device[] = [
    { id: 'd-x1c', name: 'X1C', model: 'Bambu Lab X1 Carbon', kind: 'drucker', status: 'druckt', location: 'Werkbank links', nozzle: '0,4 mm gehärtet', hoursTotal: 1432, wattage: 120,
      maintenance: [ { id: 'm-x1c-1', title: 'Z-Spindeln schmieren', due: d(2, now), done: false }, { id: 'm-x1c-2', title: 'Düse prüfen', due: d(14, now), done: false } ] },
    { id: 'd-p1s', name: 'P1S', model: 'Bambu Lab P1S', kind: 'drucker', status: 'bereit', location: 'Werkbank rechts', nozzle: '0,4 mm', hoursTotal: 611, wattage: 110,
      maintenance: [ { id: 'm-p1s-1', title: 'Druckbett reinigen', due: d(-1, now), done: false } ] },
    { id: 'd-ams', name: 'AMS', model: 'Bambu AMS', kind: 'ams', status: 'bereit', location: 'auf X1C', hoursTotal: 1432, parentId: 'd-x1c', maintenance: [],
      slots: [ { index: 1, spoolId: 's-pla-weiss' }, { index: 2, spoolId: 's-pla-indigo' }, { index: 3, spoolId: 's-pla-bronze' }, { index: 4, spoolId: 's-petg-gruen' } ] },
    { id: 'd-trockner', name: 'Trockner', model: 'Sunlu S2', kind: 'trockner', status: 'trocknet', location: 'Regal C', hoursTotal: 380, maintenance: [], notes: 'ASA Weiß seit gestern, 55 °C' },
    { id: 'w-seitenschneider', name: 'Seitenschneider', model: 'Knipex 78 61 125', kind: 'werkzeug', status: 'verfügbar', location: 'Werkbank Schublade 1', hoursTotal: 0, maintenance: [] },
    { id: 'w-bohrer3', name: 'Bohrer 3 mm', model: 'HSS', kind: 'werkzeug', status: 'verfügbar', location: 'Bohrerkassette', hoursTotal: 0, maintenance: [] },
    { id: 'w-schraubendreher', name: 'Schraubendreher-Set', model: 'Wera Kraftform', kind: 'werkzeug', status: 'im Einsatz', location: 'Werkbank', hoursTotal: 0, maintenance: [] },
    { id: 'w-feile', name: 'Nadelfeilen', model: '6er-Set', kind: 'werkzeug', status: 'verfügbar', location: 'Werkbank Schublade 2', hoursTotal: 0, maintenance: [] },
    { id: 'w-messschieber', name: 'Messschieber', model: 'Mitutoyo 150 mm', kind: 'werkzeug', status: 'verfügbar', location: 'Werkbank Schublade 1', hoursTotal: 0, maintenance: [] },
    { id: 'w-gewindeschneider', name: 'Gewindeschneider M3', model: 'HSS', kind: 'werkzeug', status: 'fehlt', location: '–', hoursTotal: 0, maintenance: [], notes: 'Verliehen an Markus' },
  ];

  const projects: Project[] = [
    {
      id: 'p-sensorhalter', name: 'Sensorhalter Garten', description: 'Halterung für den Bodenfeuchtesensor am Hochbeet. Wetterfest, schnell abnehmbar, Kabelführung nach unten.',
      type: 'Halterung / Befestigung', areas: ['Garten & Outdoor', 'Elektronik & Smart Home'], tags: ['Hochbeet', 'ASA', 'Außen'], priority: 1, difficulty: 3, stage: 'Druck', progress: 68, favorite: true,
      createdAt: d(-21, now), updatedAt: h(-3, now), island: { kind: 'bibliothek', libraryId: 'elektronik', frame: { ratio: 'quer', offsetX: 0, offsetY: 0, zoom: 1, style: 'holz' } },
      milestones: [
        { id: 'ms-1', title: 'Idee & Maße', done: true, order: 0 }, { id: 'ms-2', title: 'Konstruktion v1', done: true, order: 1 }, { id: 'ms-3', title: 'Testdruck', done: true, order: 2 },
        { id: 'ms-4', title: 'Klemmung verbessern (v2)', done: true, order: 3 }, { id: 'ms-5', title: 'Finaldruck in ASA', done: false, order: 4 }, { id: 'ms-6', title: 'Montage am Hochbeet', done: false, order: 5 },
      ],
      versions: [
        { id: 'v-sh-1', label: 'v1', status: 'verworfen', createdAt: d(-18, now), changes: ['Erste Form', 'Klemmung zu schwach'], dims: '48 × 32 × 22 mm', material: 'PLA Weiß', settings: '0,2 mm, 15 % Infill' },
        { id: 'v-sh-2', label: 'v2', status: 'beste', createdAt: d(-9, now), changes: ['Klemmung 1,5 mm dicker', 'Kabelkanal unten', 'Fase an der Aufnahme'], dims: '48 × 34 × 22 mm', material: 'PETG Schwarz', settings: '0,2 mm, 25 % Infill, 4 Wände' },
        { id: 'v-sh-3', label: 'v3 (ASA)', status: 'aktuell', createdAt: d(-2, now), changes: ['Material ASA für UV', 'Ablaufloch'], dims: '48 × 34 × 22 mm', material: 'ASA Weiß', settings: '0,2 mm, 25 % Infill, Gehäuse geschlossen' },
      ],
      files: [
        { id: 'f-sh-1', name: 'sensorhalter_v3.3mf', kind: '3mf', createdAt: d(-2, now), size: 1_240_000 }, { id: 'f-sh-2', name: 'sensorhalter_v2.stl', kind: 'stl', createdAt: d(-9, now), size: 880_000 },
        { id: 'f-sh-3', name: 'Skizze Hochbeet.jpg', kind: 'skizze', createdAt: d(-21, now) }, { id: 'f-sh-4', name: 'Testdruck v2.jpg', kind: 'foto', createdAt: d(-8, now) },
      ],
      notes: 'Sensor sitzt 12 cm über dem Boden. Kabel nach unten, Steckverbinder muss zugänglich bleiben.',
      experiences: ['PLA im Garten wurde nach zwei Wochen weich – ASA nehmen.', 'Klemmung: 1,5 mm Wandstärke reicht nicht, 3 mm hält.'],
      history: hist(now, [[-21, 'angelegt', 'Projekt angelegt'], [-18, 'version', 'v1 konstruiert'], [-15, 'druck', 'Testdruck v1 fertig', 'Klemmung zu schwach'], [-15, 'fehler', 'Klemme gebrochen', 'Wandstärke 1,5 mm'], [-9, 'version', 'v2 mit stärkerer Klemmung'], [-8, 'druck', 'Testdruck v2 erfolgreich'], [-8, 'erfahrung', 'PLA im Garten wird weich'], [-2, 'version', 'v3 für ASA angelegt'], [-2, 'entscheidung', 'Finaldruck in ASA Weiß']]),
      requiredSpools: [{ spoolId: 's-asa-weiss', grams: 38 }], plannedHours: 6, toolIds: ['w-seitenschneider', 'w-bohrer3', 'w-schraubendreher'],
    },
    {
      id: 'p-bewaesserung', name: 'Bewässerungsclip', description: 'Clip für den 6-mm-Tropfschlauch am Hochbeetrand, mit Abstandhalter.',
      type: 'Halterung / Befestigung', areas: ['Garten & Outdoor'], tags: ['Schlauch', 'Clip'], priority: 2, difficulty: 2, stage: 'Nacharbeit', progress: 80, favorite: false,
      createdAt: d(-14, now), updatedAt: h(-1, now), island: { kind: 'bibliothek', libraryId: 'ideen', frame: { ratio: 'quer', offsetX: 0, offsetY: 0, zoom: 1, style: 'holz' } },
      milestones: [ { id: 'ms-b1', title: 'Maße nehmen', done: true, order: 0 }, { id: 'ms-b2', title: 'Konstruktion', done: true, order: 1 }, { id: 'ms-b3', title: 'Testdruck ×3', done: true, order: 2 }, { id: 'ms-b4', title: 'Grat entfernen', done: false, order: 3 }, { id: 'ms-b5', title: '12 Stück drucken', done: false, order: 4 } ],
      versions: [ { id: 'v-b-1', label: 'v1', status: 'final', createdAt: d(-10, now), changes: ['Grundform'], dims: '22 × 14 × 10 mm', material: 'PETG Schwarz', settings: '0,16 mm' } ],
      files: [ { id: 'f-b-1', name: 'clip_v1.3mf', kind: '3mf', createdAt: d(-10, now), size: 410_000 } ],
      notes: 'Beim Druck Brim verwenden, sonst löst sich der Clip.', experiences: [],
      history: hist(now, [[-14, 'angelegt', 'Projekt angelegt'], [-10, 'version', 'v1'], [-6, 'druck', 'Testdruck erfolgreich'], [-1, 'druck', 'Serie 12 Stück läuft']]),
      requiredSpools: [{ spoolId: 's-petg-schwarz-1', grams: 120 }], toolIds: ['w-seitenschneider', 'w-feile'],
    },
    {
      id: 'p-organizer', name: 'Werkzeug-Organizer', description: 'Einsatz für die Schublade: Bits, Inbus und Schraubendreher griffbereit.',
      type: 'Organizer / Aufbewahrung', areas: ['Werkstatt'], tags: ['Schublade', 'Gridfinity'], priority: 2, difficulty: 2, stage: 'Konstruktion', progress: 30, favorite: true,
      createdAt: d(-5, now), updatedAt: d(-1, now), island: { kind: 'bibliothek', libraryId: 'werkstatt', frame: { ratio: 'quer', offsetX: 0, offsetY: 0, zoom: 1, style: 'holz' } },
      milestones: [ { id: 'ms-o1', title: 'Schublade vermessen', done: true, order: 0 }, { id: 'ms-o2', title: 'Raster festlegen', done: true, order: 1 }, { id: 'ms-o3', title: 'Einsätze konstruieren', done: false, order: 2 }, { id: 'ms-o4', title: 'Probeeinsatz drucken', done: false, order: 3 } ],
      versions: [ { id: 'v-o-1', label: 'v1', status: 'aktuell', createdAt: d(-2, now), changes: ['Raster 42 mm'], dims: '252 × 168 × 40 mm', material: 'PLA Indigo' } ],
      files: [ { id: 'f-o-1', name: 'Schublade.jpg', kind: 'foto', createdAt: d(-5, now) } ], notes: '', experiences: [],
      history: hist(now, [[-5, 'angelegt', 'Projekt angelegt'], [-2, 'version', 'v1 begonnen']]),
      requiredSpools: [{ spoolId: 's-pla-indigo', grams: 260 }], toolIds: ['w-messschieber'],
    },
    {
      id: 'p-gehaeuse', name: 'ESP32-Wettergehäuse', description: 'Gehäuse für den Außensensor mit Lüftungsschlitzen und Dach.',
      type: 'Gehäuse / Elektronik', areas: ['Elektronik & Smart Home', 'Technik & Maschinen'], tags: ['ESP32', 'Außen', 'Lüftung'], priority: 3, difficulty: 4, stage: 'Planung', progress: 20, favorite: false,
      createdAt: d(-9, now), updatedAt: d(-3, now), island: { kind: 'bibliothek', libraryId: 'elektronik', frame: { ratio: 'quer', offsetX: 0, offsetY: 0, zoom: 1, style: 'metall' } },
      milestones: [ { id: 'ms-g1', title: 'Platine vermessen', done: true, order: 0 }, { id: 'ms-g2', title: 'Belüftung planen', done: false, order: 1 }, { id: 'ms-g3', title: 'Konstruktion', done: false, order: 2 }, { id: 'ms-g4', title: 'Testdruck', done: false, order: 3 } ],
      versions: [], files: [], notes: 'Stevenson-Screen-Prinzip für die Lüftung.', experiences: [],
      history: hist(now, [[-9, 'angelegt', 'Projekt angelegt'], [-3, 'notiz', 'Belüftung nach Stevenson-Prinzip']]),
      requiredSpools: [{ spoolId: 's-asa-weiss', grams: 140 }], toolIds: ['w-gewindeschneider', 'w-bohrer3'],
    },
    {
      id: 'p-zahnrad', name: 'Zahnrad Mixer', description: 'Ersatzzahnrad für den Küchenmixer, Modul 1, 24 Zähne.',
      type: 'Reparatur / Ersatzteil', areas: ['Haushalt'], tags: ['Ersatzteil', 'Zahnrad'], priority: 1, difficulty: 3, stage: 'Idee', progress: 5, favorite: false,
      createdAt: d(-1, now), updatedAt: d(-1, now), island: { kind: 'bibliothek', libraryId: 'werkstatt', frame: { ratio: 'quer', offsetX: 0, offsetY: 0, zoom: 1, style: 'metall' } },
      milestones: [ { id: 'ms-z1', title: 'Altes Zahnrad vermessen', done: false, order: 0 }, { id: 'ms-z2', title: 'Konstruktion', done: false, order: 1 }, { id: 'ms-z3', title: 'Testdruck PETG', done: false, order: 2 } ],
      versions: [], files: [], notes: '', experiences: [],
      history: hist(now, [[-1, 'angelegt', 'Projekt angelegt']]), requiredSpools: [],
    },
    {
      id: 'p-schluesselhalter', name: 'Schlüsselhalter v2', description: 'Wandhalter für fünf Schlüssel mit Ablage.',
      type: 'Halterung / Befestigung', areas: ['Haushalt'], tags: ['Wand', 'Deko'], priority: 3, difficulty: 1, stage: 'Abgeschlossen', progress: 100, favorite: true,
      createdAt: d(-70, now), updatedAt: d(-30, now), archivedAt: d(-30, now), island: { kind: 'bibliothek', libraryId: 'ideen', frame: { ratio: 'quer', offsetX: 0, offsetY: 0, zoom: 1, style: 'holz' } },
      milestones: [ { id: 'ms-s1', title: 'Konstruktion', done: true, order: 0 }, { id: 'ms-s2', title: 'Druck', done: true, order: 1 }, { id: 'ms-s3', title: 'Montage', done: true, order: 2 } ],
      versions: [ { id: 'v-s-1', label: 'v1', status: 'verworfen', createdAt: d(-60, now), changes: ['Zu schmal'] }, { id: 'v-s-2', label: 'v2', status: 'final', createdAt: d(-40, now), changes: ['Breiter', 'Ablage'] } ],
      files: [ { id: 'f-s-1', name: 'Montiert.jpg', kind: 'foto', createdAt: d(-30, now) } ], notes: '', experiences: ['Dübel 6 mm reichen.'],
      history: hist(now, [[-70, 'angelegt', 'Projekt angelegt'], [-40, 'version', 'v2'], [-32, 'druck', 'Finaldruck'], [-30, 'abgeschlossen', 'Projekt abgeschlossen']]), requiredSpools: [],
    },
    {
      id: 'p-pflanzgefaess', name: 'Pflanzgefäß Wabe', description: 'Sechseckiger Übertopf mit Wassersammler.',
      type: 'Experiment / Neue Idee', areas: ['Haushalt', 'Garten & Outdoor'], tags: ['Vase-Mode', 'Deko'], priority: 3, difficulty: 2, stage: 'Abgeschlossen', progress: 100, favorite: false,
      createdAt: d(-50, now), updatedAt: d(-12, now), archivedAt: d(-12, now), island: { kind: 'bibliothek', libraryId: 'ideen', frame: { ratio: 'quer', offsetX: 0, offsetY: 0, zoom: 1, style: 'holz' } },
      milestones: [ { id: 'ms-p1', title: 'Form', done: true, order: 0 }, { id: 'ms-p2', title: 'Druck', done: true, order: 1 } ],
      versions: [ { id: 'v-p-1', label: 'v1', status: 'final', createdAt: d(-20, now), changes: ['Vase-Mode, 0,6 mm Düse'] } ],
      files: [], notes: '', experiences: ['Vase-Mode mit 0,6-mm-Düse ist dicht genug für Wasser.'],
      history: hist(now, [[-50, 'angelegt', 'Projekt angelegt'], [-14, 'druck', 'Druck 4 h 20 min'], [-12, 'abgeschlossen', 'Projekt abgeschlossen']]), requiredSpools: [],
    },
  ];

  const prints: PrintJob[] = [
    { id: 'pr-1', projectId: 'p-bewaesserung', versionId: 'v-b-1', printerId: 'd-x1c', spoolId: 's-petg-schwarz-1', name: 'Bewässerungsclip ×12', kind: 'final', status: 'läuft', estimatedMinutes: 184, startedAt: h(-1.4, now), gramsPlanned: 120, queueOrder: 0 },
    { id: 'pr-2', projectId: 'p-sensorhalter', versionId: 'v-sh-3', printerId: 'd-x1c', spoolId: 's-asa-weiss', name: 'Sensorhalter v3 (ASA)', kind: 'final', status: 'wartend', estimatedMinutes: 96, gramsPlanned: 38, queueOrder: 1 },
    { id: 'pr-3', projectId: 'p-organizer', versionId: 'v-o-1', printerId: 'd-p1s', spoolId: 's-pla-indigo', name: 'Organizer Probeeinsatz', kind: 'test', status: 'wartend', estimatedMinutes: 142, gramsPlanned: 60, queueOrder: 2 },
    { id: 'pr-4', projectId: 'p-sensorhalter', versionId: 'v-sh-2', printerId: 'd-x1c', spoolId: 's-petg-schwarz-1', name: 'Sensorhalter v2 Test', kind: 'test', status: 'fertig', result: 'erfolg', estimatedMinutes: 88, startedAt: d(-8.4, now), finishedAt: d(-8.3, now), gramsPlanned: 34, gramsUsed: 36, booked: true, queueOrder: 90 },
    { id: 'pr-5', projectId: 'p-sensorhalter', versionId: 'v-sh-1', printerId: 'd-p1s', spoolId: 's-pla-weiss', name: 'Sensorhalter v1 Test', kind: 'test', status: 'fertig', result: 'fehldruck', estimatedMinutes: 80, startedAt: d(-15.3, now), finishedAt: d(-15.2, now), gramsPlanned: 30, gramsUsed: 31, booked: true, queueOrder: 91, notes: 'Klemme gebrochen beim Einrasten.' },
    { id: 'pr-7', printerId: 'd-p1s', spoolId: 's-pla-weiss', name: 'Kabelclip_v2.gcode', kind: 'test', status: 'fertig', result: 'erfolg', estimatedMinutes: 22, startedAt: d(-0.6, now), finishedAt: d(-0.58, now), gramsPlanned: 9, gramsUsed: 9, booked: true, queueOrder: 93, imported: true, notes: 'Vom Drucker importiert, noch keinem Projekt zugeordnet.' },
    { id: 'pr-6', projectId: 'p-bewaesserung', versionId: 'v-b-1', printerId: 'd-p1s', spoolId: 's-petg-schwarz-1', name: 'Clip Test ×3', kind: 'test', status: 'fertig', result: 'nacharbeit', estimatedMinutes: 40, startedAt: d(-6.2, now), finishedAt: d(-6.1, now), gramsPlanned: 28, gramsUsed: 29, booked: true, queueOrder: 92, notes: 'Grat an der Unterseite.' },
  ];

  const tasks: Task[] = [
    { id: 't-1', projectId: 'p-sensorhalter', title: 'ASA Weiß aus dem Trockner holen', done: false, kind: 'trocknung', order: 0, createdAt: d(-1, now), due: h(1, now) },
    { id: 't-2', projectId: 'p-bewaesserung', title: 'Grat an den Clips entfernen', done: false, kind: 'nacharbeit', order: 1, createdAt: d(-5, now), due: h(3.5, now) },
    { id: 't-3', projectId: 'p-organizer', title: 'Einsätze für Bits konstruieren', done: false, kind: 'allgemein', order: 2, createdAt: d(-2, now), due: d(1, now) },
    { id: 't-4', deviceId: 'd-p1s', title: 'Druckbett P1S reinigen', done: false, kind: 'wartung', order: 3, createdAt: d(-3, now), due: h(-2, now) },
    { id: 't-5', projectId: 'p-zahnrad', title: 'Altes Zahnrad fotografieren und vermessen', done: false, kind: 'allgemein', order: 4, createdAt: d(-1, now), due: d(2, now) },
    { id: 't-6', title: 'ABS Grau nachbestellen', done: false, kind: 'einkauf', order: 5, createdAt: d(-2, now) },
    { id: 't-7', projectId: 'p-bewaesserung', title: 'Testclips am Hochbeet prüfen', done: true, kind: 'allgemein', order: 6, createdAt: d(-6, now) },
  ];

  const appointments: Appointment[] = [
    { id: 'a-1', title: 'Community-Call 3D-Druck', at: h(2.5, now), kind: 'termin' },
    { id: 'a-2', title: 'Garten: Bewässerungshalter montieren', at: d(1, now), kind: 'termin' },
    { id: 'a-3', title: 'Filament-Bestellung prüfen', at: h(5, now), kind: 'erinnerung' },
  ];

  const reports: ArchiveReport[] = [
    { id: 'r-1', projectId: 'p-schluesselhalter', completedAt: d(-30, now), result: 'Hängt seit vier Wochen, hält fünf Schlüssel plus Ablage.', versionsUsed: ['v2'], printsTotal: 3, printsFailed: 1, gramsUsed: 142, hours: 7.5, costEur: 5.2, lessons: ['v1 war zu schmal für dicke Schlüsselbünde.', 'Dübel 6 mm reichen.'] },
    { id: 'r-2', projectId: 'p-pflanzgefaess', completedAt: d(-12, now), result: 'Dicht, steht auf der Fensterbank.', versionsUsed: ['v1'], printsTotal: 1, printsFailed: 0, gramsUsed: 96, hours: 4.3, costEur: 3.4, lessons: ['Vase-Mode mit 0,6-mm-Düse ist dicht genug für Wasser.'] },
  ];

  const shopping: ShoppingItem[] = [
    { id: 'sh-1', title: 'ABS Grau 1 kg', qty: '1', price: 27.9, done: false, auto: true },
    { id: 'sh-2', title: 'M3 Einpressmuttern', qty: '100 Stk', price: 8.5, projectId: 'p-gehaeuse', done: false },
  ];

  const energy: EnergyEntry[] = [
    { id: 'e-1', at: d(-8, now), projectId: 'p-sensorhalter', wh: 180, pricePerKwh: 0.22, source: 'messung', note: 'Steckdosenmesser X1C' },
    { id: 'e-2', at: d(-6, now), projectId: 'p-bewaesserung', wh: 95, pricePerKwh: 0.22, source: 'messung' },
    { id: 'e-3', at: d(-1, now), projectId: 'p-bewaesserung', wh: 370, pricePerKwh: 0.22, source: 'schaetzung', note: 'aus Druckdauer × 120 W' },
  ];
  return { version: 1, seededAt: now.toISOString(), projects, devices, spools, tasks, prints, reports, appointments, shopping, settings: DEFAULT_SETTINGS, energy };
}
