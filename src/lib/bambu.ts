/**
 * Bambu-Drucker über die Bambu-Cloud (nur im Node-Build, experimentell): Der Server hält die Verbindung,
 * die Oberfläche zeigt nur den gemeldeten Stand. Es wird nichts an den Drucker geschickt und nichts von selbst gebucht.
 */
import { useSyncExternalStore } from 'react';
import { internals } from './cloud';
import { fmtDuration } from './format';

export interface BambuLive { at: number; state?: string; percent?: number; remainingMin?: number; file?: string; nozzle?: number; bed?: number; layer?: number; layers?: number }
export interface BambuDevice { id: string; name: string; model: string; online: boolean; live: BambuLive | null }
export interface BambuState { wid: number | null; available: boolean; canManage: boolean; linked: boolean; account: string | null; status: 'aus' | 'verbindet' | 'verbunden' | 'getrennt' | 'anmeldung' | 'fehler'; devices: BambuDevice[] }

const EMPTY: BambuState = { wid: null, available: false, canManage: false, linked: false, account: null, status: 'aus', devices: [] };
let state = EMPTY; const subs = new Set<() => void>();
const set = (next: BambuState) => { state = next; subs.forEach((f) => f()); };
export function useBambu(): BambuState { return useSyncExternalStore((l) => { subs.add(l); return () => subs.delete(l); }, () => state); }

/** Stand der Werkstatt laden; `null` trennt (abgemeldet, andere Werkstatt). */
export async function loadBambu(wid: number | null = state.wid) {
  if (!wid) { set(EMPTY); return; }
  if (wid !== state.wid) set({ ...EMPTY, wid });
  try { const r = await internals.call<Omit<BambuState, 'wid'>>(`/workshops/${wid}/bambu`); if (state.wid === wid) set({ ...r, wid }); } catch { /* beim nächsten Hinweis des Servers */ }
}
const post = async <T = { ok: boolean }>(what: string, json: unknown) => { if (!state.wid) throw new Error('Keine Werkstatt geöffnet.'); return internals.call<T>(`/workshops/${state.wid}/bambu/${what}`, { json }); };
/** Anmelden; `need: 'code'` heißt: Bambu hat einen Code an die Adresse geschickt. */
export async function bambuLogin(account: string, password: string, code: string) { const r = await post<{ ok: boolean; need?: 'code'; devices?: number }>('login', { account, password: code ? '' : password, code }); if (!r.need) await loadBambu(); return r; }
export const bambuSendCode = (account: string) => post('code', { account });
export async function bambuLogout() { await post('logout', {}); await loadBambu(); }

const STATE: Record<string, string> = { RUNNING: 'druckt', PREPARE: 'bereitet vor', SLICING: 'bereitet vor', PAUSE: 'pausiert', FINISH: 'fertig', FAILED: 'Fehler', IDLE: 'bereit' };
export const STATUS_TEXT: Record<BambuState['status'], string> = { aus: 'nicht verbunden', verbindet: 'verbindet …', verbunden: 'verbunden', getrennt: 'getrennt, neuer Versuch läuft', anmeldung: 'Anmeldung abgelaufen', fehler: 'Bambu-Cloud nicht erreichbar' };
/** Eine Zeile für die Anzeige, z. B. „druckt 42 % · noch 1 h 10 min · Halter.3mf“. */
export function bambuLine(d: BambuDevice | undefined): string | null {
  if (!d) return null; const l = d.live;
  if (!l || !l.state) return d.online ? 'online, noch kein Stand' : 'offline';
  const busy = l.state === 'RUNNING' || l.state === 'PAUSE' || l.state === 'PREPARE';
  return [STATE[l.state] ?? l.state.toLowerCase(), busy && l.percent !== undefined ? `${Math.round(l.percent)} %` : null, busy && l.remainingMin ? `noch ${fmtDuration(l.remainingMin)}` : null, busy && l.file ? l.file : null,
    l.nozzle !== undefined && (busy || l.nozzle > 45) ? `Düse ${l.nozzle} °C` : null].filter(Boolean).join(' · ');
}
