/**
 * Konto und Synchronisation direkt auf Hostinger: kleine PHP-Schnittstelle unter /api (gleiche Domain, Sitzung per httpOnly-Cookie),
 * Daten in MySQL auf demselben Server. Anmeldung mit E-Mail/Passwort oder mit Google (ID-Token per Google Identity Services,
 * serverseitig geprüft). Ist die Schnittstelle nicht eingerichtet (kein Server, keine Konfiguration), bleibt alles aus und die
 * Daten liegen wie bisher nur im Browser. Synchronisiert wird nur „Meine Werkstatt“.
 */
import { useEffect, useSyncExternalStore } from 'react';
import { useStore } from '../store';
import type { PersistedState } from '../types';
import { isDemo } from './workspace';

export interface CloudUser { id: number; email: string; name?: string | null; avatar?: string | null; provider: 'google' | 'email' }
export interface CloudHealth { configured: boolean; google: boolean; googleClientId?: string | null; user: CloudUser | null }

const API = '/api';
async function call<T = Record<string, unknown>>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const r = await fetch(`${API}${path}`, { method: init?.method ?? (init?.json !== undefined ? 'POST' : 'GET'), credentials: 'same-origin', headers: init?.json !== undefined ? { 'Content-Type': 'application/json' } : undefined, body: init?.json !== undefined ? JSON.stringify(init.json) : undefined });
  let j: Record<string, unknown> = {};
  try { j = await r.json(); } catch { /* keine JSON-Antwort */ }
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
  healthPromise = call<CloudHealth>('/health.php').then((h) => setAuth({ ready: true, configured: true, google: !!h.google, googleClientId: h.googleClientId ?? null, user: h.user ?? null })).catch(() => setAuth({ ready: true, configured: false, google: false, user: null }));
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
export async function signOut() { try { await call('/auth.php?a=logout', { json: {} }); } finally { setAuth({ user: null }); stopSync(); } }

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
export interface SyncState { status: SyncStatus; lastSyncAt?: string; error?: string }
let syncState: SyncState = { status: 'aus' };
const listeners = new Set<() => void>();
const setSync = (patch: Partial<SyncState>) => { syncState = { ...syncState, ...patch }; listeners.forEach((l) => l()); };
export function useSyncState(): SyncState { return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => syncState); }

const META_KEY = '3druckwerkbank:cloud';
interface CloudMeta { remoteUpdatedAt?: string; dirty?: boolean; userId?: number }
const readMeta = (): CloudMeta => { try { return JSON.parse(localStorage.getItem(META_KEY) ?? '{}'); } catch { return {}; } };
const writeMeta = (m: CloudMeta) => { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* voll oder gesperrt */ } };

function snapshot(): PersistedState {
  const s = useStore.getState();
  return { version: 1, seededAt: s.seededAt, projects: s.projects, devices: s.devices, spools: s.spools, tasks: s.tasks, prints: s.prints, reports: s.reports, appointments: s.appointments, shopping: s.shopping, settings: s.settings, energy: s.energy };
}

let unsubscribe: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastSerialized = '';
let applying = false;
let currentUser: number | null = null;

async function push(userId: number, force = false) {
  const state = snapshot(); const serialized = JSON.stringify(state);
  if (!force && serialized === lastSerialized) return;
  setSync({ status: 'speichert' });
  const meta = readMeta();
  try {
    const r = await call<{ updatedAt: string }>('/state.php', { method: 'PUT', json: { state, ifUpdatedAt: force ? undefined : meta.remoteUpdatedAt } });
    lastSerialized = serialized;
    writeMeta({ userId, remoteUpdatedAt: r.updatedAt, dirty: false });
    setSync({ status: 'bereit', lastSyncAt: r.updatedAt, error: undefined });
  } catch (e) {
    const err = e as Error & { kind?: string; status?: number };
    if (err.kind === 'conflict') { setSync({ status: 'konflikt', error: err.message }); writeMeta({ ...meta, dirty: true }); return; }
    if (err.status === 401) { setAuth({ user: null }); stopSync(); return; }
    setSync({ status: 'fehler', error: err.message }); writeMeta({ ...meta, dirty: true });
  }
}

function applyRemote(state: PersistedState) {
  applying = true;
  try { useStore.getState().applyCloudState(state); lastSerialized = JSON.stringify(snapshot()); } finally { applying = false; }
}

/** Nach der Anmeldung: Stand aus dem Konto holen oder den lokalen hochladen; danach jede Änderung zeitversetzt speichern. */
export async function startSync(userId: number) {
  if (currentUser === userId) return;
  stopSync();
  if (isDemo) { setSync({ status: 'aus' }); return; }
  currentUser = userId;
  setSync({ status: 'lädt', error: undefined });
  const meta = readMeta(); const sameUser = meta.userId === userId;
  try {
    const r = await call<{ state: PersistedState | null; updatedAt: string | null }>('/state.php');
    if (r.state) {
      const remoteNewer = !sameUser || !meta.remoteUpdatedAt || (r.updatedAt ?? '') > meta.remoteUpdatedAt;
      if (sameUser && meta.dirty && !remoteNewer) { lastSerialized = ''; await push(userId, true); useStore.getState().toast('Lokale Änderungen ins Konto gespeichert'); }
      else { applyRemote(r.state); writeMeta({ userId, remoteUpdatedAt: r.updatedAt ?? undefined, dirty: false }); setSync({ status: 'bereit', lastSyncAt: r.updatedAt ?? undefined }); useStore.getState().toast(remoteNewer && sameUser && meta.remoteUpdatedAt ? 'Neuerer Stand aus deinem Konto geladen' : 'Stand aus deinem Konto geladen'); }
    } else {
      lastSerialized = ''; writeMeta({ userId, dirty: false });
      await push(userId, true);
      useStore.getState().toast('Deine Werkstatt ist jetzt in deinem Konto gespeichert');
    }
  } catch (e) { setSync({ status: 'fehler', error: (e as Error).message }); }
  unsubscribe = useStore.subscribe(() => {
    if (applying || currentUser !== userId) return;
    if (JSON.stringify(snapshot()) === lastSerialized) return;
    writeMeta({ ...readMeta(), userId, dirty: true });
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { pushTimer = null; void push(userId); }, 1500);
  });
  const onVisible = () => { if (document.visibilityState === 'visible') void pullIfNewer(userId); };
  document.addEventListener('visibilitychange', onVisible);
  const prev = unsubscribe; unsubscribe = () => { prev(); document.removeEventListener('visibilitychange', onVisible); };
}

/** Beim Zurückkehren in den Tab: neueren Stand eines anderen Geräts übernehmen, wenn hier nichts Ungespeichertes liegt. */
export async function pullIfNewer(userId: number) {
  if (currentUser !== userId) return;
  const meta = readMeta(); if (meta.dirty || pushTimer) return;
  try {
    const r = await call<{ state: PersistedState | null; updatedAt: string | null }>('/state.php');
    if (r.state && meta.remoteUpdatedAt && (r.updatedAt ?? '') > meta.remoteUpdatedAt) {
      applyRemote(r.state); writeMeta({ userId, remoteUpdatedAt: r.updatedAt ?? undefined, dirty: false }); setSync({ status: 'bereit', lastSyncAt: r.updatedAt ?? undefined });
      useStore.getState().toast('Neuerer Stand aus deinem Konto geladen');
    }
  } catch { /* beim nächsten Mal */ }
}

/** Jetzt speichern; bei Konflikt entscheidet der Nutzer: lokalen Stand erzwingen oder den Stand aus dem Konto übernehmen. */
export async function syncNow(force = false) { if (currentUser) { lastSerialized = ''; await push(currentUser, force); } }
export async function takeRemote() { if (!currentUser) return; const uid = currentUser; const r = await call<{ state: PersistedState | null; updatedAt: string | null }>('/state.php'); if (r.state) { applyRemote(r.state); writeMeta({ userId: uid, remoteUpdatedAt: r.updatedAt ?? undefined, dirty: false }); setSync({ status: 'bereit', lastSyncAt: r.updatedAt ?? undefined, error: undefined }); } }

export function stopSync() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  currentUser = null; lastSerialized = '';
  setSync({ status: 'aus', lastSyncAt: undefined, error: undefined });
}
