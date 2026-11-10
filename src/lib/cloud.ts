/**
 * Konto und Synchronisation direkt auf Hostinger: kleine PHP-Schnittstelle unter /api (gleiche Domain, Sitzung per httpOnly-Cookie),
 * Daten in MySQL auf demselben Server. Anmeldung mit E-Mail/Passwort oder mit Google (ID-Token per Google Identity Services,
 * serverseitig geprüft). Ist die Schnittstelle nicht eingerichtet (kein Server, keine Konfiguration), bleibt alles aus und die
 * Daten liegen wie bisher nur im Browser. Synchronisiert wird nur „Meine Werkstatt“.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { useStore } from '../store';
import type { PersistedState } from '../types';
import { isDemo, storageName } from './workspace';
import { makeEmptySeed } from '../seed';

export interface CloudUser { id: number; email: string; name?: string | null; avatar?: string | null; provider: 'google' | 'email' }
export interface CloudHealth { configured: boolean; google: boolean; googleClientId?: string | null; user: CloudUser | null }

const API = '/api';
// Umstieg von PHP auf den Node.js-Server: gleiche Aufrufe, andere Adressen (/auth.php?a=login wird /auth/login). Gesteuert beim Build über VITE_API=node.
const NODE_API = import.meta.env.VITE_API === 'node';
const route = (p: string) => (NODE_API ? p.replace(/\.php\?a=/, '/').replace(/\.php$/, '') : p);
async function call<T = Record<string, unknown>>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const r = await fetch(`${API}${route(path)}`, { method: init?.method ?? (init?.json !== undefined ? 'POST' : 'GET'), credentials: 'same-origin', headers: init?.json !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: init?.json !== undefined ? JSON.stringify(init.json) : undefined });
  let j: Record<string, unknown> | null = null;
  try { j = await r.json(); } catch { j = null; }
  if (!j || typeof j !== 'object') { const e = new Error('Konto-Dienst nicht erreichbar.') as Error & { kind?: string; status?: number }; e.kind = 'no_api'; e.status = r.status; throw e; } // z. B. SPA-Fallback statt PHP
  if (!r.ok || j.ok === false) { const e = new Error(String(j.error ?? `Fehler ${r.status}`)) as Error & { kind?: string; status?: number }; e.kind = String(j.kind ?? ''); e.status = r.status; throw e; }
  return j as T;
}

// ---- Status (Health + Nutzer), app-weit geteilt ----
export interface AuthState { ready: boolean; configured: boolean; google: boolean; googleClientId?: string | null; user: CloudUser | null }
let auth: AuthState = { ready: false, configured: false, google: false, user: null };
const authListeners = new Set<() => void>();
const setAuth = (patch: Partial<AuthState>) => { auth = { ...auth, ...patch }; authListeners.forEach((l) => l()); };
export function useAuth(): AuthState { return useSyncExternalStore((l) => { authListeners.add(l); return () => authListeners.delete(l); }, () => auth); }
let healthPromise: Promise<void> | null = null;
export function loadHealth(): Promise<void> {
  if (healthPromise) return healthPromise;
  healthPromise = call<CloudHealth>('/health.php').then((h) => setAuth({ ready: true, configured: !!h.configured, google: !!h.google, googleClientId: h.googleClientId ?? null, user: h.user ?? null })).catch((e: Error & { kind?: string; status?: number }) => {
    setAuth({ ready: true, configured: false, google: false, user: null });
    // Netzfehler (offline, Zeitüberschreitung) sind nicht endgültig: später noch einmal fragen. Ohne Server oder ohne Konfiguration bleibt es aus.
    if (e.kind === undefined) { healthPromise = null; const again = () => { window.removeEventListener('online', again); clearTimeout(t); void loadHealth(); }; const t = setTimeout(again, 30_000); window.addEventListener('online', again); }
  });
  return healthPromise;
}
/** Beim ersten Einbinden einmal laden. */
export function useCloudBoot() { useEffect(() => { void loadHealth(); }, []); }
export const cloudConfigured = () => auth.configured;

// ---- Auth ----
export async function signInWithEmail(email: string, password: string) { const r = await call<{ user: CloudUser }>('/auth.php?a=login', { json: { email, password } }); setAuth({ user: r.user }); return r.user; }
export async function signUpWithEmail(email: string, password: string) { const r = await call<{ user: CloudUser }>('/auth.php?a=register', { json: { email, password } }); setAuth({ user: r.user }); return r.user; }
export async function signInWithGoogleCredential(credential: string) { const r = await call<{ user: CloudUser }>('/auth.php?a=google', { json: { credential } }); setAuth({ user: r.user }); return r.user; }
export async function sendPasswordReset(email: string) { await call('/auth.php?a=reset-request', { json: { email } }); }
export async function resetPassword(token: string, password: string) { const r = await call<{ user: CloudUser }>('/auth.php?a=reset', { json: { token, password } }); setAuth({ user: r.user }); return r.user; }
/** Abmelden gilt erst, wenn der Server die Sitzung beendet hat (sonst wäre man nach dem Neuladen wieder angemeldet). */
export async function signOut() { await flushSync(); await call('/auth.php?a=logout', { json: {} }); setAuth({ user: null }); stopSync(); }

/** Überall abmelden: beendet die Sitzungen auf allen Geräten (nur mit dem Node.js-Server). */
export const canSignOutEverywhere = NODE_API;
export async function signOutEverywhere() { await flushSync(); await call('/auth.php?a=logout-all', { json: {} }); setAuth({ user: null }); stopSync(); }

/** Google Identity Services laden und den offiziellen Knopf in ein Element rendern. */
export function renderGoogleButton(el: HTMLElement, clientId: string, onCredential: (c: string) => void): () => void {
  let cancelled = false;
  const w = window as unknown as { google?: { accounts: { id: { initialize: (o: object) => void; renderButton: (el: HTMLElement, o: object) => void } } } };
  const render = () => { if (cancelled || !w.google) return; w.google.accounts.id.initialize({ client_id: clientId, callback: (resp: { credential: string }) => onCredential(resp.credential), ux_mode: 'popup', auto_select: false }); w.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', text: 'signin_with', shape: 'pill', width: Math.min(360, Math.max(220, Math.round(el.clientWidth || 300))), locale: 'de' }); };
  if (w.google) render();
  else {
    let s = document.getElementById('gis-script') as HTMLScriptElement | null;
    if (!s) { s = document.createElement('script'); s.id = 'gis-script'; s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true; document.head.appendChild(s); }
    s.addEventListener('load', render, { once: true });
  }
  return () => { cancelled = true; };
}

// ---- Sync ----
export type SyncStatus = 'aus' | 'bereit' | 'lädt' | 'speichert' | 'fehler' | 'konflikt';
export interface SyncCounts { projects: number; spools: number; devices: number; updatedAt?: string }
export interface SyncState { status: SyncStatus; lastSyncAt?: string; error?: string; local?: SyncCounts; remote?: SyncCounts }
let syncState: SyncState = { status: 'aus' };
const listeners = new Set<() => void>();
const setSync = (patch: Partial<SyncState>) => { syncState = { ...syncState, ...patch }; listeners.forEach((l) => l()); };
export function useSyncState(): SyncState { return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => syncState); }

const META_KEY = '3druckwerkbank:cloud';
const BACKUP_KEY = '3druckwerkbank:echt:sicherung';
/** remoteUpdatedAt: zuletzt bekannter Stand im Konto; syncedHash: Prüfsumme des zuletzt abgeglichenen lokalen Standes (erkennt Änderungen, die ohne Verbindung oder in einem anderen Tab entstanden sind). */
interface CloudMeta { remoteUpdatedAt?: string; dirty?: boolean; userId?: number; syncedHash?: string }
const readMeta = (): CloudMeta => { try { return JSON.parse(localStorage.getItem(META_KEY) ?? '{}') ?? {}; } catch { return {}; } };
const writeMeta = (m: CloudMeta) => { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* voll oder gesperrt */ } };
const hash = (str: string): string => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return `${(h >>> 0).toString(36)}.${str.length}`; };

function snapshot(): PersistedState {
  const s = useStore.getState();
  return { version: 1, seededAt: s.seededAt, projects: s.projects, devices: s.devices, spools: s.spools, tasks: s.tasks, prints: s.prints, reports: s.reports, appointments: s.appointments, shopping: s.shopping, settings: s.settings, energy: s.energy };
}
const refs = () => { const s = useStore.getState(); return [s.projects, s.devices, s.spools, s.tasks, s.prints, s.reports, s.appointments, s.shopping, s.settings, s.energy]; };
const hasData = (s: PersistedState | null | undefined) => !!s && [s.projects, s.spools, s.prints, s.tasks, s.devices, s.reports, s.appointments, s.shopping].some((a) => Array.isArray(a) && a.length > 0);
const counts = (s: PersistedState, updatedAt?: string | null): SyncCounts => ({ projects: (s.projects ?? []).filter((p) => !p.deletedAt).length, spools: (s.spools ?? []).length, devices: (s.devices ?? []).length, updatedAt: updatedAt ?? undefined });
/** Kopie des lokalen Standes, bevor er durch den Stand aus dem Konto ersetzt wird (eine Kopie, wird überschrieben). */
function backupLocal(reason: string) {
  const state = snapshot(); if (!hasData(state)) return;
  try { localStorage.setItem(BACKUP_KEY, JSON.stringify({ at: new Date().toISOString(), reason, state })); } catch { /* Speicher voll: ohne Kopie weiter */ }
}
export function readBackup(): { at: string; reason: string; state: PersistedState } | null { try { const b = JSON.parse(localStorage.getItem(BACKUP_KEY) ?? 'null'); return b && b.state ? b : null; } catch { return null; } }

type Remote = { state: PersistedState | null; updatedAt: string | null };
let unsubscribe: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let lastSerialized = '';
let lastRefs: unknown[] = [];
let applying = false;
let currentUser: number | null = null;
let gen = 0;                              // steigt bei jedem Start/Stopp: verspätete Antworten werden verworfen
let knownRemote: string | undefined;      // Stand im Konto, den DIESER Tab geladen oder geschrieben hat
let armed = false;                        // erst nach erfolgreichem Laden werden Änderungen hochgeschoben
let pushing: Promise<void> | null = null;
let again = false, againForce = false;

const fail401 = (err: { status?: number }) => { if (err.status === 401) { setAuth({ user: null }); stopSync(); return true; } return false; };
const markSynced = (userId: number, serialized: string, updatedAt?: string | null) => { lastSerialized = serialized; lastRefs = refs(); knownRemote = updatedAt ?? undefined; writeMeta({ userId, remoteUpdatedAt: knownRemote, dirty: false, syncedHash: hash(serialized) }); };

async function pushOnce(userId: number, force: boolean) {
  const g = gen; const state = snapshot(); const serialized = JSON.stringify(state);
  if (!force && serialized === lastSerialized) { if (syncState.status === 'speichert') setSync({ status: 'bereit' }); return; }
  setSync({ status: 'speichert', error: undefined });
  try {
    const r = await call<{ updatedAt: string }>('/state.php', { method: 'PUT', json: { state, ifUpdatedAt: knownRemote, force } });
    if (g !== gen) return;
    markSynced(userId, serialized, r.updatedAt);
    if (refs().some((x, i) => x !== lastRefs[i]) && JSON.stringify(snapshot()) !== serialized) { writeMeta({ ...readMeta(), dirty: true }); again = true; } // während des Speicherns weitergearbeitet
    armed = true;
    setSync({ status: 'bereit', lastSyncAt: r.updatedAt, error: undefined, local: undefined, remote: undefined });
  } catch (e) {
    if (g !== gen) return;
    const err = e as Error & { kind?: string; status?: number };
    writeMeta({ ...readMeta(), userId, dirty: true });
    if (err.kind === 'conflict') { again = false; setSync({ status: 'konflikt', error: err.message, local: counts(state) }); return; }
    if (fail401(err)) return;
    setSync({ status: 'fehler', error: err.message });
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { retryTimer = null; if (g === gen) void push(userId); }, 20_000);
  }
}
/** Es läuft immer nur ein Speichervorgang; was währenddessen dazukommt, wird direkt danach gespeichert. */
function push(userId: number, force = false): Promise<void> {
  if (pushing) { again = true; againForce = againForce || force; return pushing; }
  pushing = (async () => {
    let f = force;
    do { again = false; await pushOnce(userId, f); f = againForce; againForce = false; } while (again && currentUser === userId && syncState.status !== 'konflikt');
  })().finally(() => { pushing = null; });
  return pushing;
}

function applyRemote(userId: number, r: Remote) {
  if (!r.state) return;
  applying = true;
  try { useStore.getState().applyCloudState(r.state); } finally { applying = false; }
  markSynced(userId, JSON.stringify(snapshot()), r.updatedAt);
  armed = true;
  setSync({ status: 'bereit', lastSyncAt: r.updatedAt ?? undefined, error: undefined, local: undefined, remote: undefined });
}

/** Erster Abgleich nach der Anmeldung. Entscheidet nie stillschweigend gegen Daten: liegen auf beiden Seiten unterschiedliche Stände, wählt der Nutzer. */
async function initialLoad(userId: number, g: number) {
  setSync({ status: 'lädt', error: undefined });
  let r: Remote;
  try { r = await call<Remote>('/state.php'); }
  catch (e) {
    if (g !== gen) return;
    const err = e as Error & { status?: number };
    if (fail401(err)) return;
    setSync({ status: 'fehler', error: `${err.message} Neuer Versuch folgt automatisch.` });
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { retryTimer = null; if (g === gen) void initialLoad(userId, g); }, 15_000);
    return;
  }
  if (g !== gen) return;
  const meta = readMeta(); const local = snapshot(); const localSer = JSON.stringify(local); const toast = useStore.getState().toast;
  const remoteHas = hasData(r.state);
  if (meta.userId !== undefined && meta.userId !== userId) {
    // anderes Konto als zuletzt: der lokale Stand gehört zum vorigen Konto, er wird gesichert und nicht ins neue Konto geschrieben
    backupLocal('Kontowechsel');
    if (r.state) { applyRemote(userId, r); toast('Stand aus deinem Konto geladen'); }
    else { applying = true; try { useStore.getState().applyCloudState(makeEmptySeed()); } finally { applying = false; } lastSerialized = ''; lastRefs = []; knownRemote = undefined; writeMeta({ userId, dirty: false }); await push(userId, true); }
    return;
  }
  if (meta.userId === undefined) {
    // erste Anmeldung in diesem Browser
    if (!remoteHas) { lastSerialized = ''; knownRemote = r.updatedAt ?? undefined; await push(userId, true); if (g === gen && syncState.status === 'bereit' && hasData(local)) toast('Deine Werkstatt ist jetzt in deinem Konto gespeichert'); return; }
    if (!hasData(local) || JSON.stringify(r.state) === localSer) { applyRemote(userId, r); toast('Stand aus deinem Konto geladen'); return; }
    knownRemote = r.updatedAt ?? undefined;
    setSync({ status: 'konflikt', error: 'In deinem Konto und in diesem Browser liegen unterschiedliche Stände.', local: counts(local), remote: counts(r.state!, r.updatedAt) });
    return;
  }
  // gleiches Konto wie zuletzt
  const localDirty = !!meta.dirty || (meta.syncedHash !== undefined && hash(localSer) !== meta.syncedHash);
  const remoteNewer = !!r.state && (!meta.remoteUpdatedAt || (r.updatedAt ?? '') > meta.remoteUpdatedAt);
  if (!r.state) { lastSerialized = ''; knownRemote = undefined; await push(userId, true); return; }
  if (localDirty && remoteNewer) { knownRemote = meta.remoteUpdatedAt; setSync({ status: 'konflikt', error: 'Auf einem anderen Gerät gibt es einen neueren Stand, und hier liegen ungespeicherte Änderungen.', local: counts(local), remote: counts(r.state, r.updatedAt) }); return; }
  if (localDirty) { knownRemote = r.updatedAt ?? undefined; lastSerialized = ''; await push(userId); if (g === gen && syncState.status === 'bereit') toast('Lokale Änderungen ins Konto gespeichert'); return; }
  if (remoteNewer) { applyRemote(userId, r); toast('Neuerer Stand aus deinem Konto geladen'); return; }
  markSynced(userId, localSer, r.updatedAt); armed = true;
  setSync({ status: 'bereit', lastSyncAt: r.updatedAt ?? undefined });
}

/** Nach der Anmeldung: Stand abgleichen; danach jede Änderung zeitversetzt speichern. */
export async function startSync(userId: number) {
  if (currentUser === userId) return;
  stopSync();
  if (isDemo) { setSync({ status: 'aus' }); return; }
  currentUser = userId; const g = ++gen;
  lastRefs = refs();
  const unsub = useStore.subscribe(() => {
    if (applying || currentUser !== userId) return;
    const now = refs(); if (now.every((x, i) => x === lastRefs[i])) return; // nur Oberfläche oder Wetter geändert
    lastRefs = now;
    const m = readMeta(); if (!m.dirty && m.userId === userId) writeMeta({ ...m, dirty: true });
    if (!armed || syncState.status === 'konflikt') return; // erst nach erfolgreichem Abgleich bzw. nach der Entscheidung des Nutzers
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { pushTimer = null; void push(userId); }, 1500);
  });
  const onVisible = () => { if (document.visibilityState === 'visible') void pullIfNewer(userId); };
  const onOnline = () => { if (!armed && syncState.status === 'fehler') void initialLoad(userId, g); else if (syncState.status === 'fehler') void push(userId); };
  const onHide = () => { if (pushTimer && armed) { clearTimeout(pushTimer); pushTimer = null; void push(userId); } };
  document.addEventListener('visibilitychange', onVisible); window.addEventListener('online', onOnline); window.addEventListener('pagehide', onHide);
  unsubscribe = () => { unsub(); document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('online', onOnline); window.removeEventListener('pagehide', onHide); };
  await initialLoad(userId, g);
}

/** Beim Zurückkehren in den Tab: neueren Stand eines anderen Geräts übernehmen, wenn hier nichts Ungespeichertes liegt. */
export async function pullIfNewer(userId: number) {
  const g = gen;
  const busy = () => currentUser !== userId || g !== gen || !armed || syncState.status === 'konflikt' || !!pushTimer || !!pushing || !!readMeta().dirty || JSON.stringify(snapshot()) !== lastSerialized;
  if (busy()) return;
  try {
    const r = await call<Remote>('/state.php');
    if (busy()) return; // inzwischen wurde hier weitergearbeitet: nichts überschreiben
    if (r.state && (r.updatedAt ?? '') > (knownRemote ?? '')) { applyRemote(userId, r); useStore.getState().toast('Neuerer Stand aus deinem Konto geladen'); }
  } catch (e) { fail401(e as { status?: number }); }
}

/** Jetzt speichern. Im Konfliktfall entscheidet der Nutzer: `force` schreibt diesen Stand ins Konto. */
export async function syncNow(force = false) {
  if (!currentUser) return;
  const uid = currentUser;
  if (!armed && !force && syncState.status !== 'konflikt') { await initialLoad(uid, gen); return; }
  if (syncState.status === 'konflikt' && !force) return;
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  lastSerialized = ''; if (force) setSync({ status: 'speichert', error: undefined });
  await push(uid, force);
}
/** Konflikt: den Stand aus dem Konto übernehmen. Der lokale Stand wird vorher gesichert. */
export async function takeRemote() {
  if (!currentUser) return;
  const uid = currentUser; const g = gen;
  try {
    const r = await call<Remote>('/state.php');
    if (g !== gen) return;
    if (!r.state) { await syncNow(true); return; }
    backupLocal('Stand aus dem Konto übernommen');
    applyRemote(uid, r);
    useStore.getState().toast('Stand aus dem Konto übernommen. Der vorige Stand dieses Browsers ist gesichert.');
  } catch (e) { const err = e as Error & { status?: number }; if (!fail401(err)) setSync({ status: 'konflikt', error: `Laden nicht möglich: ${err.message}` }); }
}
/** Die Sicherung zurückholen (ersetzt den aktuellen Stand; im Konto landet er beim nächsten Speichern). */
export function restoreBackup(): boolean {
  const b = readBackup(); if (!b) return false;
  const cur = snapshot();
  useStore.getState().applyCloudState(b.state);
  try { localStorage.setItem(BACKUP_KEY, JSON.stringify({ at: new Date().toISOString(), reason: 'vor dem Wiederherstellen', state: cur })); } catch { /* ignore */ }
  return true;
}
/** Vor dem Abmelden: Ungespeichertes noch hochschieben (ohne Erfolgsgarantie). */
export async function flushSync() { if (currentUser && armed && syncState.status !== 'konflikt') { if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; } try { await push(currentUser); } catch { /* ignore */ } } }

// Zweiter Tab ohne Konto-Abgleich: Änderungen aus dem anderen Tab übernehmen, statt sie später mit einem alten Stand zu überschreiben.
// (Mit Konto läuft der Abgleich über den Server, sobald der Tab wieder sichtbar wird.)
if (typeof window !== 'undefined') window.addEventListener('storage', (e) => {
  if (e.key !== storageName || e.newValue === null || currentUser !== null) return;
  applying = true; Promise.resolve(useStore.persist.rehydrate()).finally(() => { applying = false; });
});

export function stopSync() {
  gen += 1;
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  currentUser = null; lastSerialized = ''; lastRefs = []; knownRemote = undefined; armed = false; again = false; againForce = false;
  setSync({ status: 'aus', lastSyncAt: undefined, error: undefined, local: undefined, remote: undefined });
}
