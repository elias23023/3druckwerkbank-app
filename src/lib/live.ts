/**
 * Gemeinsame Werkstatt (Node.js-Server): Abgleich je Eintrag statt als ein großer Block, mit Live-Kanal.
 * Der Store ist die lokale Kopie der gerade gewählten Werkstatt. Geänderte Einträge gehen kurz nach der Eingabe einzeln zum Server
 * (`/workshops/:id/ops`); Änderungen anderer kommen über Server-Sent Events an und werden nachgeladen (`/items?since=`).
 * Regeln: Lokale, noch nicht gesendete Änderungen an einem Eintrag gewinnen gegen eine gleichzeitige fremde Änderung desselben Eintrags.
 * Beim ersten Abgleich der persönlichen Werkstatt mit Daten auf beiden Seiten entscheidet der Nutzer.
 */
import { useSyncExternalStore } from 'react';
import { useStore } from '../store';
import type { PersistedState } from '../types';
import { internals as c } from './cloud';

const COLLS = ['projects', 'devices', 'spools', 'tasks', 'prints', 'reports', 'appointments', 'shopping', 'energy'] as const;
export type Role = 'owner' | 'editor' | 'reader';
export const ROLE_LABEL: Record<Role, string> = { owner: 'Eigentümer', editor: 'Bearbeiter', reader: 'Leser' };
export interface Workshop { id: number; name: string; personal: boolean; role: Role; members: number }
export interface Member { id: number; email: string; name?: string | null; avatar?: string | null; role: Role }
export interface LiveState { on: boolean; workshops: Workshop[]; activeId: number | null; role: Role | null; members: Member[]; invites: { email: string; role: Role }[]; online: boolean }

let live: LiveState = { on: false, workshops: [], activeId: null, role: null, members: [], invites: [], online: false };
const subs = new Set<() => void>();
const setLive = (p: Partial<LiveState>) => { live = { ...live, ...p }; subs.forEach((l) => l()); };
export function useLive(): LiveState { return useSyncExternalStore((l) => { subs.add(l); return () => subs.delete(l); }, () => live); }

type Item = { coll: string; id: string; rev: number; value: Record<string, unknown> | null };
type ItemsAnswer = { rev: number; role: Role; items: Item[] };
type Values = Map<string, unknown>;
const META_KEY = '3druckwerkbank:live';
const INVITE_KEY = '3druckwerkbank:einladung';
interface Meta { userId: number; wid: number; rev: number; hashes: Record<string, string> }
const readMeta = (): Meta | null => { try { return JSON.parse(localStorage.getItem(META_KEY) ?? 'null'); } catch { return null; } };
const activeKey = (uid: number) => `3druckwerkbank:werkstatt:${uid}`;
const clientId = Math.random().toString(36).slice(2, 12);

let userId = 0, wid = 0, rev = 0, gen = 0;
let es: EventSource | null = null;
let unsub: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null, retry: ReturnType<typeof setTimeout> | null = null, pullTimer: ReturnType<typeof setTimeout> | null = null;
let pushing: Promise<void> | null = null, again = false, applying = false, armed = false;
const synced = new Map<string, string>();   // Eintrag -> zuletzt abgeglichener Inhalt (als Text), so wie er lokal aussieht
let lastObj = new Map<string, unknown>();    // Eintrag -> Objekt, das zuletzt geprüft wurde (erspart das Vergleichen unveränderter Einträge)
let pendingRemote: Values | null = null;     // Stand aus dem Konto, solange der Nutzer beim ersten Abgleich noch nicht gewählt hat

/** Alle Einträge des Stores als flache Liste: „liste/kennung“ -> Eintrag; die Einstellungen als eigener Eintrag je Mitglied. */
function items(): Values {
  const s = useStore.getState() as unknown as Record<string, unknown>; const m: Values = new Map();
  for (const coll of COLLS) for (const it of (s[coll] as { id: string }[] | undefined) ?? []) m.set(`${coll}/${it.id}`, it);
  m.set(`settings/u${userId}`, s.settings); return m;
}
function toState(m: Values): PersistedState {
  const out: Record<string, unknown> = { version: 1 }; for (const coll of COLLS) out[coll] = [];
  for (const [k, v] of m) { const i = k.indexOf('/'); const coll = k.slice(0, i); if (coll === 'settings') out.settings = v; else (out[coll] as unknown[]).push(v); }
  return out as unknown as PersistedState;
}
const fromAnswer = (r: ItemsAnswer): Values => { const m: Values = new Map(); for (const it of r.items) if (it.value !== null) m.set(`${it.coll}/${it.id}`, it.value); return m; };
const hasContent = (m: Values) => [...m.keys()].some((k) => !k.startsWith('settings/'));
const count = (m: Values) => { const n = (p: string) => [...m.keys()].filter((k) => k.startsWith(p)).length; return { projects: n('projects/'), spools: n('spools/'), devices: n('devices/') }; };

/** Stand in den Store legen; danach gilt alles außer `keep` als abgeglichen. */
function apply(m: Values, keep: Set<string> = new Set()) {
  applying = true; try { useStore.getState().applyLive(toState(m)); } finally { applying = false; }
  const cur = items(); lastObj = new Map();
  for (const k of [...synced.keys()]) if (!keep.has(k) && !cur.has(k)) synced.delete(k);
  for (const [k, v] of cur) if (!keep.has(k)) synced.set(k, JSON.stringify(v));
}
type Op = { key: string; value: unknown; text?: string };
function diff(): Op[] {
  const cur = items(); const ops: Op[] = [];
  for (const [k, v] of cur) { if (lastObj.get(k) === v && synced.has(k)) continue; const text = JSON.stringify(v); if (synced.get(k) !== text) ops.push({ key: k, value: v, text }); else lastObj.set(k, v); }
  for (const k of synced.keys()) if (!cur.has(k)) ops.push({ key: k, value: null });
  return ops;
}
function saveMeta() {
  const hashes: Record<string, string> = {}; for (const [k, v] of synced) hashes[k] = c.hash(v);
  try { localStorage.setItem(META_KEY, JSON.stringify({ userId, wid, rev, hashes } satisfies Meta)); } catch { /* voll: beim nächsten Start wird vollständig verglichen */ }
}
const base = () => `/workshops/${wid}`;
const toast = (t: string) => useStore.getState().toast(t);

async function pushOnce(g: number) {
  const ops = diff(); if (!ops.length) { if (c.getSync().status === 'speichert') c.setSync({ status: 'bereit' }); return; }
  c.setSync({ status: 'speichert', error: undefined });
  try {
    let newRev = rev;
    for (let i = 0; i < ops.length; i += 300) {
      const part = ops.slice(i, i + 300);
      const r = await c.call<{ rev: number }>(`${base()}/ops`, { json: { client: clientId, ops: part.map((o) => { const j = o.key.indexOf('/'); return { coll: o.key.slice(0, j), id: o.key.slice(j + 1), value: o.value }; }) } });
      if (g !== gen) return;
      for (const o of part) { if (o.value === null) { synced.delete(o.key); lastObj.delete(o.key); } else { synced.set(o.key, o.text!); lastObj.set(o.key, o.value); } }
      const gap = r.rev !== newRev + 1; newRev = r.rev; if (gap) { await pull(g, true); if (g !== gen) return; }
    }
    rev = Math.max(rev, newRev); saveMeta(); armed = true;
    c.setSync({ status: 'bereit', lastSyncAt: new Date().toISOString(), error: undefined, local: undefined, remote: undefined });
  } catch (e) {
    if (g !== gen) return;
    const err = e as Error & { kind?: string; status?: number };
    if (err.status === 401) { c.signedOut(); return; }
    if (err.status === 403 && err.kind === 'forbidden') { toast('Du hast in dieser Werkstatt nur Lesezugriff. Die Änderung wurde nicht gespeichert.'); await reload(g); return; }
    if (err.status === 404) { toast('Diese Werkstatt gibt es für dich nicht mehr.'); void start(userId); return; }
    if (err.status === 400 || err.status === 413) { c.setSync({ status: 'fehler', error: err.message }); return; } // ein Eintrag wird abgelehnt: nicht in Dauerschleife wiederholen
    c.setSync({ status: 'fehler', error: `${err.message} Neuer Versuch folgt automatisch.` });
    if (retry) clearTimeout(retry); retry = setTimeout(() => { retry = null; if (g === gen) void push(); }, 15_000);
  }
}
/** Immer nur ein Speichervorgang; was währenddessen dazukommt, folgt direkt danach. */
function push(): Promise<void> {
  if (pushing) { again = true; return pushing; }
  const g = gen;
  pushing = (async () => { do { again = false; await pushOnce(g); } while (again && g === gen && c.getSync().status !== 'fehler'); })().finally(() => { pushing = null; });
  return pushing;
}
/** Fremde Änderungen seit dem bekannten Stand holen. Einträge mit eigener, noch nicht gesendeter Änderung bleiben unberührt. */
async function pull(g: number, quiet = false) {
  try {
    const r = await c.call<ItemsAnswer>(`${base()}/items?since=${rev}`);
    if (g !== gen) return;
    if (live.role !== r.role) setLive({ role: r.role });
    if (r.items.length) {
      const pending = new Set(diff().map((o) => o.key)); const cur = items(); let changed = false;
      for (const it of r.items) { const k = `${it.coll}/${it.id}`; if (pending.has(k)) continue; changed = true; if (it.value === null) cur.delete(k); else cur.set(k, it.value); }
      if (changed) apply(cur, pending);
    }
    rev = Math.max(rev, r.rev); saveMeta();
    if (!quiet && c.getSync().status === 'fehler') c.setSync({ status: 'bereit', error: undefined });
  } catch (e) { const err = e as { status?: number }; if (err.status === 401) c.signedOut(); else if (err.status === 404) void start(userId); }
}
/** Alles neu vom Server (z. B. nach einer abgelehnten Änderung). */
async function reload(g: number) {
  try { const r = await c.call<ItemsAnswer>(`${base()}/items?since=0`); if (g !== gen) return; synced.clear(); apply(fromAnswer(r)); rev = r.rev; saveMeta(); setLive({ role: r.role }); c.setSync({ status: 'bereit', error: undefined }); }
  catch { c.setSync({ status: 'fehler', error: 'Der Stand konnte nicht neu geladen werden.' }); }
}

function arm(g: number) {
  armed = true;
  if (!unsub) {
    let refs = COLLS.map((k) => (useStore.getState() as unknown as Record<string, unknown>)[k]).concat(useStore.getState().settings);
    unsub = useStore.subscribe(() => {
      if (applying) return;
      const s = useStore.getState() as unknown as Record<string, unknown>; const now = COLLS.map((k) => s[k]).concat(s.settings);
      if (now.every((x, i) => x === refs[i])) return; refs = now;
      if (!armed || c.getSync().status === 'konflikt') return;
      if (timer) clearTimeout(timer); timer = setTimeout(() => { timer = null; void push(); }, 700);
    });
  }
  if (es) es.close();
  es = new EventSource(`/api${base()}/events`);
  es.onopen = () => { setLive({ online: true }); if (g === gen) void pull(g, true).then(() => { if (g === gen && diff().length) void push(); }); };
  es.onerror = () => setLive({ online: false });
  es.onmessage = (m) => {
    if (g !== gen) return; let d: { rev?: number; client?: string; members?: boolean; gone?: boolean; removed?: number } = {}; try { d = JSON.parse(m.data); } catch { return; }
    if (d.gone || d.removed === userId) { toast(d.gone ? 'Diese Werkstatt wurde gelöscht.' : 'Du bist nicht mehr Mitglied dieser Werkstatt.'); void start(userId); return; }
    if (d.members) void loadMembers();
    if (d.rev && d.rev > rev && d.client !== clientId) { if (pullTimer) clearTimeout(pullTimer); pullTimer = setTimeout(() => { pullTimer = null; if (g === gen && !pushing) void pull(g); else if (g === gen) again = true; }, 150); }
  };
}

/** Eine Werkstatt öffnen: vollständig laden, mit der lokalen Kopie abgleichen, Live-Kanal starten. */
async function open(id: number, g: number) {
  if (es) { es.close(); es = null; } armed = false; pendingRemote = null; synced.clear(); lastObj = new Map();
  wid = id; setLive({ activeId: id, members: [], invites: [], online: false });
  try { localStorage.setItem(activeKey(userId), String(id)); } catch { /* ignore */ }
  c.setSync({ status: 'lädt', error: undefined, local: undefined, remote: undefined });
  let r: ItemsAnswer;
  try { r = await c.call<ItemsAnswer>(`${base()}/items?since=0`); }
  catch (e) {
    if (g !== gen) return; const err = e as Error & { status?: number };
    if (err.status === 401) { c.signedOut(); return; }
    c.setSync({ status: 'fehler', error: `${err.message} Neuer Versuch folgt automatisch.` });
    if (retry) clearTimeout(retry); retry = setTimeout(() => { retry = null; if (g === gen) void open(id, g); }, 15_000); return;
  }
  if (g !== gen) return;
  rev = r.rev; setLive({ role: r.role }); void loadMembers();
  const remote = fromAnswer(r); const local = items(); const meta = readMeta(); const ws = live.workshops.find((w) => w.id === id);
  if (meta && meta.userId === userId && meta.wid === id) {
    // bekannte Werkstatt auf diesem Gerät: was hier seit dem letzten Abgleich geändert wurde (auch ohne Verbindung), bleibt und wird gesendet
    const mine = new Set<string>();
    for (const [k, v] of local) if (meta.hashes[k] !== c.hash(JSON.stringify(v))) mine.add(k);
    for (const k of Object.keys(meta.hashes)) if (!local.has(k)) mine.add(k);
    const merged: Values = new Map(remote);
    for (const k of mine) { if (local.has(k)) merged.set(k, local.get(k)); else merged.delete(k); }
    apply(merged, mine);
    for (const k of mine) { if (local.has(k)) { if (remote.has(k)) synced.set(k, '\u0000'); else synced.delete(k); } else if (remote.has(k)) synced.set(k, '\u0000'); }
    arm(g); c.setSync({ status: 'bereit', lastSyncAt: new Date().toISOString() });
    if (diff().length) void push(); else saveMeta();
    return;
  }
  // Liegt hier die Kopie einer ANDEREN Werkstatt (oder eines anderen Kontos), gehört der lokale Stand nicht in diese Werkstatt:
  // er wird nie hineingeschrieben, sondern durch den Stand vom Server ersetzt. Nur ohne jede Vorgeschichte gilt er als eigener Stand.
  const foreign = !!meta;
  if (foreign && meta!.userId !== userId && c.hasData(c.snapshot())) c.backupLocal('Kontowechsel');
  const localHas = !foreign && c.hasData(c.snapshot()); const remoteHas = hasContent(remote);
  if (ws?.personal && localHas && remoteHas) {
    const same = remote.size === local.size && [...remote].every(([k, v]) => local.has(k) && JSON.stringify(local.get(k)) === JSON.stringify(v));
    if (!same) { pendingRemote = remote; c.setSync({ status: 'konflikt', error: 'In deinem Konto und in diesem Browser liegen unterschiedliche Stände.', local: count(local), remote: count(remote) }); return; }
  }
  if (ws?.personal && localHas && !remoteHas) { arm(g); await push(); if (g === gen && c.getSync().status === 'bereit') toast('Deine Werkstatt ist jetzt in deinem Konto gespeichert'); return; }
  if (localHas && !ws?.personal) c.backupLocal('Werkstatt gewechselt');
  if (!remote.has(`settings/u${userId}`)) remote.set(`settings/u${userId}`, useStore.getState().settings); // eigene Einstellungen in eine neue Werkstatt mitnehmen
  apply(remote); arm(g); saveMeta();
  c.setSync({ status: 'bereit', lastSyncAt: new Date().toISOString() });
  if (diff().length) void push();
}

export async function loadWorkshops() { const r = await c.call<{ workshops: Workshop[] }>('/workshops'); setLive({ workshops: r.workshops }); return r.workshops; }
export async function loadMembers() { if (!wid) return; try { const r = await c.call<{ members: Member[]; invites: { email: string; role: Role }[]; role: Role }>(`${base()}/members`); setLive({ members: r.members, invites: r.invites, role: r.role }); void loadWorkshops().catch(() => undefined); } catch { /* beim nächsten Mal */ } }

/** Nach der Anmeldung. */
export async function start(uid: number) {
  stop(true); const g = ++gen; userId = uid; setLive({ on: true });
  c.setSync({ status: 'lädt', error: undefined });
  let list: Workshop[];
  try { list = await loadWorkshops(); }
  catch (e) {
    if (g !== gen) return; const err = e as Error & { status?: number }; if (err.status === 401) { c.signedOut(); return; }
    c.setSync({ status: 'fehler', error: `${err.message} Neuer Versuch folgt automatisch.` });
    retry = setTimeout(() => { retry = null; if (g === gen) void start(uid); }, 15_000); return;
  }
  if (g !== gen) return;
  // eine offene Einladung (Link aus der Mail) zuerst annehmen
  const token = (() => { try { return sessionStorage.getItem(INVITE_KEY); } catch { return null; } })();
  let want = Number((() => { try { return localStorage.getItem(activeKey(uid)); } catch { return null; } })()) || 0;
  if (token) {
    try { sessionStorage.removeItem(INVITE_KEY); } catch { /* ignore */ }
    try { const r = await c.call<{ id: number }>('/invites/accept', { json: { token } }); want = r.id; list = await loadWorkshops(); toast('Einladung angenommen.'); }
    catch (e) { toast((e as Error).message || 'Die Einladung konnte nicht angenommen werden.'); }
    if (g !== gen) return;
  }
  const target = list.find((w) => w.id === want) ?? list.find((w) => w.personal) ?? list[0];
  if (!target) { c.setSync({ status: 'fehler', error: 'Keine Werkstatt gefunden.' }); return; }
  await open(target.id, g);
}
export function stop(keepUser = false) {
  gen += 1; if (es) { es.close(); es = null; } if (unsub) { unsub(); unsub = null; }
  for (const t of [timer, retry, pullTimer]) if (t) clearTimeout(t); timer = retry = pullTimer = null;
  armed = false; again = false; pendingRemote = null; synced.clear(); lastObj = new Map(); wid = 0; rev = 0; if (!keepUser) userId = 0;
  setLive({ on: false, workshops: [], activeId: null, role: null, members: [], invites: [], online: false });
}
/** Ungespeichertes jetzt senden (vor Abmelden oder Werkstattwechsel). */
export async function flush() { if (!armed || c.getSync().status === 'konflikt') return; if (timer) { clearTimeout(timer); timer = null; } await push(); }
export async function syncNow() { if (!userId) return; if (!armed && c.getSync().status !== 'konflikt') { await start(userId); return; } await flush(); if (!pushing) await pull(gen); }
/** Konflikt beim ersten Abgleich: den Stand dieses Browsers behalten (ersetzt den Stand im Konto). */
export async function keepLocal() {
  if (!pendingRemote) return; const g = gen; const remote = pendingRemote; pendingRemote = null;
  synced.clear(); for (const k of remote.keys()) synced.set(k, '\u0000'); lastObj = new Map();
  arm(g); await push();
}
/** Konflikt beim ersten Abgleich: den Stand aus dem Konto übernehmen (der Stand des Browsers wird vorher gesichert). */
export function takeRemote() {
  if (!pendingRemote) return; const g = gen; const remote = pendingRemote; pendingRemote = null;
  c.backupLocal('Stand aus dem Konto übernommen'); synced.clear(); apply(remote); arm(g); saveMeta();
  c.setSync({ status: 'bereit', lastSyncAt: new Date().toISOString(), error: undefined, local: undefined, remote: undefined });
  toast('Stand aus dem Konto übernommen. Der vorige Stand dieses Browsers ist gesichert.');
}

// ---- Werkstätten und Mitglieder ----
export async function switchWorkshop(id: number) {
  if (id === wid || !userId) return;
  await flush();
  if (armed && diff().length) { toast('Es gibt noch ungespeicherte Änderungen. Bitte zuerst die Verbindung prüfen.'); return; }
  const g = ++gen; if (unsub) { unsub(); unsub = null; }
  await open(id, g); const w = live.workshops.find((x) => x.id === id); if (w && g === gen) toast(`Werkstatt: ${w.name}`);
}
export async function createWorkshop(name: string) { const r = await c.call<{ id: number }>('/workshops', { json: { name } }); await loadWorkshops(); await switchWorkshop(r.id); }
export async function renameWorkshop(name: string) { await c.call(`${base()}/rename`, { json: { name } }); await loadWorkshops(); }
export async function deleteWorkshop() { await c.call(`${base()}/delete`, { json: {} }); await start(userId); }
export async function invite(email: string, role: Role) { await c.call(`${base()}/invites`, { json: { email, role } }); await loadMembers(); }
export async function revokeInvite(email: string) { await c.call(`${base()}/invites/revoke`, { json: { email } }); await loadMembers(); }
export async function setRole(memberId: number, role: Role) { await c.call(`${base()}/members/${memberId}`, { json: { role } }); await loadMembers(); }
export async function removeMember(memberId: number) { await c.call(`${base()}/members/${memberId}/remove`, { json: {} }); if (memberId === userId) await start(userId); else await loadMembers(); }
/** Link aus der Einladungs-Mail merken; angenommen wird, sobald jemand angemeldet ist. */
export function rememberInvite(token: string) { try { sessionStorage.setItem(INVITE_KEY, token); } catch { /* ignore */ } if (userId) void start(userId); }
export const hasPendingInvite = () => { try { return !!sessionStorage.getItem(INVITE_KEY); } catch { return false; } };
