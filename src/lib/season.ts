/** Seasons (meteorological: Mär–Mai, Jun–Aug, Sep–Nov, Dez–Feb) with everything the scene and the worlds need. */
export type Season = 'fruehling' | 'sommer' | 'herbst' | 'winter';
export type SeasonSetting = 'auto' | Season;
export const SEASONS: Season[] = ['fruehling', 'sommer', 'herbst', 'winter'];

export function seasonOf(date: Date): Season {
  const m = date.getMonth(); // 0 = Jan
  if (m >= 2 && m <= 4) return 'fruehling';
  if (m >= 5 && m <= 7) return 'sommer';
  if (m >= 8 && m <= 10) return 'herbst';
  return 'winter';
}

/** Start of the next season (local time). */
export function nextSeasonStart(date: Date): Date {
  const m = date.getMonth(); const y = date.getFullYear();
  const starts = [2, 5, 8, 11]; // Mar, Jun, Sep, Dec
  const next = starts.find((s) => s > m);
  return next !== undefined ? new Date(y, next, 1) : new Date(y + 1, 2, 1);
}

export function daysUntilNextSeason(date: Date): number {
  return Math.max(0, Math.round((nextSeasonStart(date).getTime() - date.getTime()) / 86400000));
}

export interface SeasonMeta {
  label: string; next: string; particles: 'petal' | 'pollen' | 'leaf' | 'flake';
  /** CSS filter for the islands (vegetation mood) and the scene tint */
  islandFilter: string; tint: string;
  /** workshop tips for 3D printing in this season */
  tips: string[];
  /** one line for the start world */
  motto: string;
}

export const SEASON_META: Record<Season, SeasonMeta> = {
  fruehling: {
    label: 'Frühling', next: 'Sommer', particles: 'petal',
    islandFilter: 'saturate(1.1) hue-rotate(-4deg) brightness(1.03)',
    tint: 'linear-gradient(180deg, rgba(255,245,200,.0) 0%, rgba(200,255,180,.35) 70%, rgba(255,230,200,.45) 100%)',
    tips: ['Pollen und Staub: Lüfter und Luftfilter am Drucker prüfen.', 'Gartenprojekte planen: ASA oder PETG für Teile im Freien.', 'Tageslicht wird länger: Solarfenster ab dem Nachmittag nutzen.'],
    motto: 'Aus Ideen wächst Neues.',
  },
  sommer: {
    label: 'Sommer', next: 'Herbst', particles: 'pollen',
    islandFilter: 'saturate(1.12) brightness(1.05)',
    tint: 'linear-gradient(180deg, rgba(255,230,160,.25) 0%, rgba(255,215,140,.2) 60%, rgba(255,200,120,.35) 100%)',
    tips: ['PLA-Teile nicht im Auto lassen, ab 55 °C verformen sie sich.', 'Werkstatt morgens lüften, Drucker nicht in die Sonne stellen.', 'Lange Tage: die meisten Solarstunden des Jahres für große Drucke.'],
    motto: 'Lange Tage, große Drucke.',
  },
  herbst: {
    label: 'Herbst', next: 'Winter', particles: 'leaf',
    islandFilter: 'sepia(.22) hue-rotate(-10deg) saturate(1.15) brightness(1.02)',
    tint: 'linear-gradient(180deg, rgba(255,190,120,.1) 0%, rgba(255,160,80,.35) 65%, rgba(200,110,50,.45) 100%)',
    tips: ['Luftfeuchte steigt: PETG, TPU und Nylon vor dem Druck trocknen.', 'Indoor-Projekte vorziehen, Außenteile vor dem Frost montieren.', 'Solarfenster werden kurz: Drucke um die Mittagszeit legen.'],
    motto: 'Zeit für Projekte drinnen.',
  },
  winter: {
    label: 'Winter', next: 'Frühling', particles: 'flake',
    islandFilter: 'saturate(.8) hue-rotate(8deg) brightness(1.06) contrast(1.02)',
    tint: 'linear-gradient(180deg, rgba(200,220,255,.3) 0%, rgba(220,235,255,.3) 60%, rgba(240,246,255,.45) 100%)',
    tips: ['Zugluft vermeiden: ABS und ASA brauchen ein geschlossenes Gehäuse.', 'Kalte Werkstatt: Druckbett vorheizen, erste Schicht langsamer.', 'Filament trocken lagern, Heizungsluft hilft gegen Feuchte.'],
    motto: 'Warm bleiben, weiterbauen.',
  },
};

export function resolveSeason(setting: SeasonSetting | undefined, date: Date): Season {
  return setting && setting !== 'auto' ? setting : seasonOf(date);
}
