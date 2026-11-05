/** Scene looks = the landscape images. Time looks follow the real sun; weather looks override daylight looks by WMO code. */
export type Look = 'daemmerung' | 'sonnenaufgang' | 'morgen' | 'mittag' | 'nachmittag' | 'golden' | 'sonnenuntergang' | 'blau' | 'nacht' | 'bedeckt' | 'nebel' | 'regen';
export const LOOKS: Look[] = ['daemmerung', 'sonnenaufgang', 'morgen', 'mittag', 'nachmittag', 'golden', 'sonnenuntergang', 'blau', 'nacht', 'bedeckt', 'nebel', 'regen'];
export const NIGHT_LOOKS = new Set<Look>(['blau', 'nacht']);
export const DARK_LOOKS = new Set<Look>(['blau', 'nacht', 'sonnenuntergang', 'regen', 'daemmerung', 'sonnenaufgang']);
/** Set to true once assets-src/landschaft-03-morgen.png exists and has been optimised. */
export const HAS_MORGEN = true;

export const LOOK_META: Record<Look, { sx: string; sy: string; glow: number; rays: number; sky: string; cloud: string; label: string }> = {
  daemmerung: { sx: '70%', sy: '46%', glow: .25, rays: 0, sky: 'linear-gradient(180deg,#0a1140 0%,#2a3a86 55%,#c98a6a 100%)', cloud: '170,180,220', label: 'Morgendämmerung' },
  sonnenaufgang: { sx: '72%', sy: '44%', glow: .9, rays: .18, sky: 'linear-gradient(180deg,#121a4a 0%,#4a4f93 50%,#f0a060 100%)', cloud: '255,205,170', label: 'Sonnenaufgang' },
  morgen: { sx: '66%', sy: '30%', glow: .5, rays: .12, sky: 'linear-gradient(180deg,#3d78c9 0%,#a9cbea 60%,#eef2f5 100%)', cloud: '255,250,240', label: 'Morgen' },
  mittag: { sx: '50%', sy: '8%', glow: .35, rays: .08, sky: 'linear-gradient(180deg,#2d6fd6 0%,#8fc0f0 60%,#e6eef6 100%)', cloud: '255,255,255', label: 'Mittag' },
  nachmittag: { sx: '55%', sy: '14%', glow: .4, rays: .12, sky: 'linear-gradient(180deg,#3a74c8 0%,#9fc3e8 60%,#e8edf3 100%)', cloud: '255,250,240', label: 'Nachmittag' },
  golden: { sx: '69%', sy: '33%', glow: 1, rays: .2, sky: 'linear-gradient(180deg,#2f3f8a 0%,#b6708a 40%,#f6a85a 60%,#f8c99a 100%)', cloud: '255,214,180', label: 'Goldene Stunde' },
  sonnenuntergang: { sx: '69%', sy: '32%', glow: .9, rays: .16, sky: 'linear-gradient(180deg,#5a1f4a 0%,#d8402e 45%,#ff8a3c 60%,#f7b27a 100%)', cloud: '255,190,150', label: 'Sonnenuntergang' },
  blau: { sx: '69%', sy: '32%', glow: .3, rays: .04, sky: 'linear-gradient(180deg,#0b1340 0%,#1e2d6e 55%,#5c4a6a 100%)', cloud: '150,170,220', label: 'Blaue Stunde' },
  nacht: { sx: '71%', sy: '14%', glow: .18, rays: .03, sky: 'linear-gradient(180deg,#050a24 0%,#0e1a4a 55%,#223262 100%)', cloud: '120,140,200', label: 'Mondnacht' },
  bedeckt: { sx: '50%', sy: '10%', glow: 0, rays: 0, sky: 'linear-gradient(180deg,#8d98a8 0%,#c8d0da 60%,#e5e9ee 100%)', cloud: '235,238,242', label: 'Bedeckt' },
  nebel: { sx: '60%', sy: '10%', glow: .3, rays: .05, sky: 'linear-gradient(180deg,#b9c2cf 0%,#dfe4ea 60%,#f2f4f6 100%)', cloud: '245,246,248', label: 'Nebel' },
  regen: { sx: '69%', sy: '12%', glow: .15, rays: .1, sky: 'linear-gradient(180deg,#3a4452 0%,#6d7886 60%,#9aa3ae 100%)', cloud: '170,180,195', label: 'Regen' },
};

const MIN = 60_000;

/** Look from the real sun position. Sunrise/sunset ISO strings from Open-Meteo; fallback 7:00 / 17:00. */
export function timeLook(now: Date, sunrise?: string, sunset?: string): Look {
  const t = now.getTime();
  const sr = sunrise ? new Date(sunrise).getTime() : new Date(now).setHours(7, 0, 0, 0);
  const ss = sunset ? new Date(sunset).getTime() : new Date(now).setHours(17, 0, 0, 0);
  if (t < sr - 70 * MIN) return 'nacht';
  if (t < sr - 20 * MIN) return 'daemmerung';
  if (t < sr + 35 * MIN) return 'sonnenaufgang';
  if (t < sr + 150 * MIN) return HAS_MORGEN ? 'morgen' : 'nachmittag';
  if (t > ss + 110 * MIN) return 'nacht';
  if (t > ss + 50 * MIN) return 'blau';
  if (t > ss + 12 * MIN) return 'sonnenuntergang';
  if (t > ss - 50 * MIN) return 'golden';
  const f = (t - sr) / Math.max(1, ss - sr);
  return f > 0.3 && f < 0.72 ? 'mittag' : 'nachmittag';
}

/** Weather override for daylight looks (WMO codes). */
export function weatherLook(code: number | undefined, base: Look): Look {
  if (code === undefined) return base;
  if (base !== 'mittag' && base !== 'nachmittag' && base !== 'morgen') return base;
  if (code === 45 || code === 48) return 'nebel';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'regen';
  if (code === 3 || (code >= 71 && code <= 77) || code === 85 || code === 86) return 'bedeckt';
  return base;
}

export const sceneLook = (now: Date, sunrise?: string, sunset?: string, code?: number): Look => weatherLook(code, timeLook(now, sunrise, sunset));
