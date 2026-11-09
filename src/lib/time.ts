import { useEffect, useState } from 'react';

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export type DayPhase = 'nacht' | 'morgen' | 'tag' | 'abend';

/** Phase from sunrise/sunset (ISO strings in local tz) with golden windows of ±45 min. */
export function dayPhase(now: Date, sunrise?: string, sunset?: string): DayPhase {
  const t = now.getTime();
  const sr = sunrise ? new Date(sunrise).getTime() : new Date(now).setHours(7, 0, 0, 0);
  const ss = sunset ? new Date(sunset).getTime() : new Date(now).setHours(18, 0, 0, 0);
  const g = 45 * 60 * 1000;
  if (t < sr - g || t > ss + g) return 'nacht';
  if (t < sr + g) return 'morgen';
  if (t > ss - g) return 'abend';
  return 'tag';
}

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return 'Gute Nacht';
  if (h < 11) return 'Guten Morgen';
  if (h < 17) return 'Guten Tag';
  if (h < 22) return 'Guten Abend';
  return 'Gute Nacht';
}

export const QUOTES = [
  'Kleine Ideen können große Dinge bewegen.',
  'Jeder Fehldruck ist ein Schritt näher am Teil.',
  'Aus Ideen wird morgen Realität.',
  'Mehr machen, mit Ideen, die bleiben.',
  'Erst messen, dann drucken.',
  'Ein ruhiger Drucker ist ein guter Drucker.',
  'Gute Ideen brauchen die richtigen Werkstoffe.',
  'Schicht für Schicht entsteht etwas.',
  'Das Beste entsteht beim zweiten Versuch.',
  'Werkstattzeit ist gute Zeit.',
];
export function quoteOfDay(now: Date): string {
  const dayN = Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / 86400000); // wechselt um Mitternacht Ortszeit
  return QUOTES[dayN % QUOTES.length];
}

/** Hour of day (0–24, fractional) of an ISO string. */
export const hourOf = (iso: string) => {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
};
export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
