/**
 * Konto und Synchronisation über Supabase (Auth mit Google oder E-Mail, Postgres mit Row Level Security).
 * Die App bleibt statisch: der Browser spricht direkt mit Supabase. Ohne konfigurierte Umgebung (VITE_SUPABASE_URL,
 * VITE_SUPABASE_ANON_KEY) ist alles aus und die Daten bleiben wie bisher nur im Browser.
 *
 * Datenmodell in Supabase: Tabelle `werkstatt` (user_id uuid primary key, state jsonb, updated_at timestamptz).
 * Jede Nutzerin sieht nur ihre Zeile (Policy auth.uid() = user_id). Der gesamte persistierte Zustand liegt als ein JSON-Dokument darin.
 */
import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useStore } from '../store';
import type { PersistedState } from '../types';
import { isDemo } from './workspace';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const cloudConfigured = !!(URL && KEY);
export const supabase: SupabaseClient | null = cloudConfigured ? createClient(URL!, KEY!, { auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true, autoRefreshToken: true } }) : null;

const TABLE = 'werkstatt';
const META_KEY = '3druckwerkbank:cloud';
interface CloudMeta { lastSyncAt?: string; dirty?: boolean; remoteUpdatedAt?: string }
const readMeta = (): CloudMeta => { try { return JSON.parse(localStorage.getItem(META_KEY) ?? '{}'); } catch { return {}; } };
const writeMeta = (m: CloudMeta) => { try { localStorage.setItem(META_KEY, JSON.stringify(m)); } catch { /* voll oder gesperrt */ } };

// ---- Session ----
export function useSession(): { session: Session | null; ready: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!cloudConfigured);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);
  return { session, ready };
}

const redirectTo = () => `${window.location.origin}${window.location.pathname}`;
export const signInWithGoogle = () => supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectTo(), queryParams: { prompt: 'select_account' } } });
export const signInWithEmail = (email: string, password: string) => supabase!.auth.signInWithPassword({ email, password });
export const signUpWithEmail = (email: string, password: string) => supabase!.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo() } });
export const sendPasswordReset = (email: string) => supabase!.auth.resetPasswordForEmail(email, { redirectTo: redirectTo() });
export const updatePassword = (password: string) => supabase!.auth.updateUser({ password });
export const signOut = () => supabase!.auth.signOut();

/** Deutsche Meldung für die häufigsten Auth-Fehler. */
export function authMessage(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-Mail oder Passwort stimmen nicht.';
  if (m.includes('email not confirmed')) return 'Bitte zuerst den Bestätigungslink aus der E-Mail anklicken.';
  if (m.includes('user already registered')) return 'Für diese E-Mail gibt es schon ein Konto. Bitte anmelden.';
  if (m.includes('password should be at least')) return 'Das Passwort braucht mindestens 6 Zeichen.';
  if (m.includes('rate limit')) return 'Zu viele Versuche. Bitte kurz warten.';
  if (m.includes('provider is not enabled')) return 'Google-Anmeldung ist in Supabase noch nicht aktiviert.';
  return msg;
}

// ---- Sync ----
export type SyncStatus = 'aus' | 'bereit' | 'lädt' | 'speichert' | 'fehler';
export interface SyncState { status: SyncStatus; lastSyncAt?: string; error?: string; email?: string }
let syncState: SyncState = { status: 'aus' };
const listeners = new Set<() => void>();
const setSync = (patch: Partial<SyncState>) => { syncState = { ...syncState, ...patch }; listeners.forEach((l) => l()); };
export function useSyncState(): SyncState { return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => syncState); }

/** Der Teil des Zustands, der synchronisiert wird (wie Export/Import, ohne Wetter-Cache und UI). */
function snapshot(): PersistedState {
  const s = useStore.getState();
  return { version: 1, seededAt: s.seededAt, projects: s.projects, devices: s.devices, spools: s.spools, tasks: s.tasks, prints: s.prints, reports: s.reports, appointments: s.appointments, shopping: s.shopping, settings: s.settings, energy: s.energy };
}

let unsubscribe: (() => void) | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastSerialized = '';
let applying = false;
let currentUser: string | null = null;

async function push(userId: string) {
  if (!supabase) return;
  const state = snapshot(); const serialized = JSON.stringify(state);
  if (serialized === lastSerialized) return;
  setSync({ status: 'speichert' });
  const now = new Date().toISOString();
  const { error } = await supabase.from(TABLE).upsert({ user_id: userId, state, updated_at: now }, { onConflict: 'user_id' });
  if (error) { setSync({ status: 'fehler', error: error.message }); writeMeta({ ...readMeta(), dirty: true }); return; }
  lastSerialized = serialized;
  writeMeta({ lastSyncAt: now, remoteUpdatedAt: now, dirty: false });
  setSync({ status: 'bereit', lastSyncAt: now, error: undefined });
}

function applyRemote(state: PersistedState) {
  applying = true;
  try { useStore.getState().applyCloudState(state); lastSerialized = JSON.stringify(snapshot()); } finally { applying = false; }
}

/** Beim Start einer Sitzung: Stand aus dem Konto holen oder den lokalen Stand hochladen; danach jede Änderung zeitversetzt speichern. */
export async function startSync(userId: string, email?: string) {
  if (!supabase || currentUser === userId || isDemo) { if (isDemo) setSync({ status: 'aus', email }); return; }
  stopSync();
  currentUser = userId;
  setSync({ status: 'lädt', email, error: undefined });
  const meta = readMeta();
  const { data, error } = await supabase.from(TABLE).select('state, updated_at').eq('user_id', userId).maybeSingle();
  if (error) { setSync({ status: 'fehler', error: error.message }); }
  else if (data?.state) {
    const remoteNewer = !meta.remoteUpdatedAt || data.updated_at > meta.remoteUpdatedAt;
    if (meta.dirty && !remoteNewer) { await push(userId); useStore.getState().toast('Lokale Änderungen ins Konto gespeichert'); }
    else { applyRemote(data.state as PersistedState); writeMeta({ lastSyncAt: new Date().toISOString(), remoteUpdatedAt: data.updated_at, dirty: false }); setSync({ status: 'bereit', lastSyncAt: data.updated_at }); if (remoteNewer && meta.remoteUpdatedAt) useStore.getState().toast('Neuerer Stand aus deinem Konto geladen'); }
  } else {
    lastSerialized = '';
    await push(userId);
    useStore.getState().toast('Deine Werkstatt ist jetzt in deinem Konto gespeichert');
  }
  unsubscribe = useStore.subscribe(() => {
    if (applying || currentUser !== userId) return;
    if (JSON.stringify(snapshot()) === lastSerialized) return;
    writeMeta({ ...readMeta(), dirty: true });
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => { pushTimer = null; void push(userId); }, 1500);
  });
  const onVisible = () => { if (document.visibilityState === 'visible') void pullIfNewer(userId); };
  document.addEventListener('visibilitychange', onVisible);
  const prev = unsubscribe; unsubscribe = () => { prev(); document.removeEventListener('visibilitychange', onVisible); };
}

/** Beim Zurückkehren in den Tab: holt einen neueren Stand von einem anderen Gerät, wenn hier nichts Ungespeichertes liegt. */
export async function pullIfNewer(userId: string) {
  if (!supabase || currentUser !== userId) return;
  const meta = readMeta(); if (meta.dirty || pushTimer) return;
  const { data } = await supabase.from(TABLE).select('state, updated_at').eq('user_id', userId).maybeSingle();
  if (data?.state && meta.remoteUpdatedAt && data.updated_at > meta.remoteUpdatedAt) {
    applyRemote(data.state as PersistedState);
    writeMeta({ lastSyncAt: new Date().toISOString(), remoteUpdatedAt: data.updated_at, dirty: false });
    setSync({ status: 'bereit', lastSyncAt: data.updated_at });
    useStore.getState().toast('Neuerer Stand aus deinem Konto geladen');
  }
}

export async function syncNow() { if (currentUser) { lastSerialized = ''; await push(currentUser); } }

export function stopSync() {
  if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
  currentUser = null; lastSerialized = '';
  setSync({ status: cloudConfigured ? 'aus' : 'aus', email: undefined, lastSyncAt: undefined, error: undefined });
}
