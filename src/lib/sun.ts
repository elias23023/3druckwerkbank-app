import type { WeatherData } from '../types';
import { todayDaily } from './weather';
import { fmtDuration, fmtTime } from './format';

/** The next change of light: sunset while the sun is up, otherwise the next sunrise (after sunset: tomorrow's). */
export interface SunTurn {
  kind: 'untergang' | 'aufgang';
  /** time of the change */
  at: Date;
  /** whole minutes until then, rounded up ("in 1 min" until the moment itself, never "in 0 min") */
  minutes: number;
  /** "Sonnenuntergang" / "Sonnenaufgang" */
  label: string;
  /** "in 4 h 05 min" */
  rest: string;
  /** "Sonnenuntergang in 4 h 05 min": the one line used by the weather panels and the card of the day */
  text: string;
}

const valid = (iso?: string) => { if (!iso) return undefined; const d = new Date(iso); return Number.isFinite(d.getTime()) ? d : undefined; };

/**
 * The single calculation behind every "Sonnenuntergang in …" of the app (ring of the Heute island, weather panels, card of the day),
 * so all of them say the same and tick with the same clock. Without weather data (no sunrise and sunset known) it returns null:
 * the weather panels and the card of the day then show nothing, never a made-up time.
 * `fallback`: only the ring of the Heute island, which without data draws its daylight from 07:00 to 17:00 (Tagesportal.tsx)
 * and says the same in words, as it always did.
 */
export function sunTurn(data: WeatherData | undefined, now: Date, fallback?: { rise: number; set: number }): SunTurn | null {
  const today = todayDaily(data, now);
  let rise = valid(today?.sunrise); let set = valid(today?.sunset);
  if ((!rise || !set) && fallback) { const at = (h: number) => new Date(new Date(now).setHours(h, 0, 0, 0)); rise = at(fallback.rise); set = at(fallback.set); }
  if (!rise || !set) return null;
  let kind: SunTurn['kind']; let at: Date;
  if (now < rise) { kind = 'aufgang'; at = rise; }
  else if (now < set) { kind = 'untergang'; at = set; }
  else {
    // after sunset: tomorrow's sunrise; without tomorrow in the forecast, today's time a day later (minutes off at most)
    const i = today && data ? data.daily.indexOf(today) : -1;
    kind = 'aufgang'; at = (i >= 0 ? valid(data?.daily[i + 1]?.sunrise) : undefined) ?? new Date(rise.getTime() + 86400_000);
  }
  const minutes = Math.max(1, Math.ceil((at.getTime() - now.getTime()) / 60000));
  const label = kind === 'untergang' ? 'Sonnenuntergang' : 'Sonnenaufgang';
  const rest = `in ${fmtDuration(minutes)}`;
  return { kind, at, minutes, label, rest, text: `${label} ${rest}` };
}

/** "Sonnenuntergang 16:18" – the change with its clock time (the ring's first line). */
export const sunTurnAt = (t: SunTurn) => `${t.label} ${fmtTime(t.at)}`;
