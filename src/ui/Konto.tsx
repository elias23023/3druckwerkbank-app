import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { Sheet } from './Sheet';
import { Field } from './Glass';
import { IUser, IRefresh } from './Icons';
import { useAuth, useSyncState, signInWithEmail, signUpWithEmail, signInWithGoogleCredential, sendPasswordReset, resetPassword, signOut, signOutEverywhere, canSignOutEverywhere, syncNow, takeRemote, renderGoogleButton, readBackup, restoreBackup, type SyncCounts } from '../lib/cloud';
import { fmtTime, fmtDate } from '../lib/format';
import { isDemo } from '../lib/workspace';

/**
 * Konto: Anmelden mit Google oder E-Mail, Registrieren, Passwort vergessen / zurücksetzen; angemeldet: Stand der Synchronisation,
 * Konfliktauflösung, jetzt speichern, abmelden. Backend: /api auf derselben Domain (Hostinger, PHP + MySQL).
 */
const describe = (c?: SyncCounts) => (c ? `${c.projects} Projekte · ${c.spools} Rollen · ${c.devices} Geräte${c.updatedAt ? ` · gespeichert ${fmtDate(c.updatedAt)} ${fmtTime(c.updatedAt)}` : ''}` : 'Stand unbekannt');

export function KontoSheet({ resetToken }: { resetToken?: string }) {
  const close = useStore((s) => s.closeSheet);
  const toast = useStore((s) => s.toast);
  const auth = useAuth();
  const sync = useSyncState();
  const [mode, setMode] = useState<'anmelden' | 'registrieren' | 'passwort' | 'neuesPasswort'>(resetToken ? 'neuesPasswort' : 'anmelden');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [info, setInfo] = useState('');
  const gref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (auth.user || !auth.google || !auth.googleClientId || !gref.current || mode === 'neuesPasswort') return;
    return renderGoogleButton(gref.current, auth.googleClientId, async (credential) => { setErr(''); setBusy(true); try { await signInWithGoogleCredential(credential); toast('Angemeldet'); } catch (e) { setErr((e as Error).message); } finally { setBusy(false); } });
  }, [auth.user, auth.google, auth.googleClientId, mode, toast]);

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'anmelden') { await signInWithEmail(email.trim(), password); toast('Angemeldet'); }
      else if (mode === 'registrieren') { const u = await signUpWithEmail(email.trim(), password); if (u) toast('Konto angelegt'); else { setPassword(''); setInfo('Fast fertig: Wir haben dir eine E-Mail geschickt. Öffne den Link darin, um dein Konto zu bestätigen (gültig eine Stunde). Schau auch im Spam-Ordner nach.'); } }
      else if (mode === 'passwort') { await sendPasswordReset(email.trim()); setInfo('Wenn ein Konto zu dieser E-Mail existiert, ist ein Link zum Zurücksetzen unterwegs (gültig eine Stunde).'); }
      else if (mode === 'neuesPasswort' && resetToken) { await resetPassword(resetToken, password); toast('Neues Passwort gesetzt'); window.location.hash = '#/start'; }
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  if (!auth.ready) return <Sheet title="Konto" icon={<IUser />} onClose={close}><p className="small muted">Verbinde …</p></Sheet>;

  if (!auth.configured) {
    return (
      <Sheet title="Konto" icon={<IUser />} onClose={close}>
        <p className="small">Deine Werkstatt liegt derzeit nur in diesem Browser. Mit einem Konto kannst du dich mit Google oder E-Mail anmelden und deine Daten auf allen Geräten nutzen.</p>
        <p className="small muted">Der Konto-Dienst ist auf diesem Server noch nicht eingerichtet (Anleitung: <code>docs/Login-Einrichtung.md</code>). Lokal im Vorschau-Modus gibt es keinen Server, die Anmeldung geht nur auf 3druckwerkbank.com.</p>
      </Sheet>
    );
  }

  if (auth.user) {
    const u = auth.user; const name = u.name || u.email; const backup = isDemo ? null : readBackup();
    return (
      <Sheet title="Konto" icon={<IUser />} onClose={close} foot={<><button className="btn btn--sm" disabled={isDemo || sync.status === 'konflikt' || sync.status === 'lädt'} onClick={() => { void syncNow(); }}><IRefresh width={13} height={13} /> Jetzt speichern</button><button className="btn btn--sm btn--ghost" style={{ marginLeft: 'auto' }} onClick={async () => { try { await signOut(); toast('Abgemeldet. Die Daten bleiben in diesem Browser.'); } catch { toast('Abmelden nicht möglich: keine Verbindung zum Server.'); } }}>Abmelden</button>{canSignOutEverywhere ? <button className="btn btn--sm btn--ghost" title="Beendet die Anmeldung auf allen Geräten" onClick={async () => { if (!confirm('Auf allen Geräten abmelden? Du musst dich überall neu anmelden.')) return; try { await signOutEverywhere(); toast('Auf allen Geräten abgemeldet.'); } catch { toast('Abmelden nicht möglich: keine Verbindung zum Server.'); } }}>Überall abmelden</button> : null}</>}>
        <div className="konto-user">{u.avatar ? <img src={u.avatar} alt="" referrerPolicy="no-referrer" /> : <span className="konto-avatar">{name.slice(0, 1).toUpperCase()}</span>}<div className="col" style={{ gap: 2 }}><b className="small">{name}</b><span className="xs muted">{u.email}{u.provider === 'google' ? ' · Google' : ' · E-Mail'}</span></div></div>
        {isDemo ? <Field label="Synchronisation"><span className="small">Die Beispiel-Werkstatt wird nicht synchronisiert. Wechsle zu „Meine Werkstatt“ (Chip oben links), dort landen deine echten Daten im Konto.</span></Field> : (
          <Field label="Synchronisation">
            <div className="row small" style={{ gap: 8 }}>
              <i className="dot" style={{ background: sync.status === 'fehler' || sync.status === 'konflikt' ? '#ff6b6b' : sync.status === 'bereit' ? '#4ccf7a' : '#ffd36e' }} />
              <span>{sync.status === 'lädt' ? 'Lade deinen Stand …' : sync.status === 'speichert' ? 'Speichere …' : sync.status === 'fehler' ? `Fehler: ${sync.error}` : sync.status === 'konflikt' ? (sync.error ?? 'Im Konto liegt ein anderer Stand als in diesem Browser.') : sync.lastSyncAt ? `Gespeichert, zuletzt ${fmtDate(sync.lastSyncAt)} ${fmtTime(sync.lastSyncAt)}` : 'Bereit'}</span>
            </div>
            {sync.status === 'konflikt' ? <div className="col" style={{ gap: 8 }}>
              <div className="grid2 small"><div className="konto-side"><b>Dieser Browser</b><span className="xs muted">{describe(sync.local)}</span><button className="btn btn--sm" onClick={() => { if (confirm('Diesen Stand ins Konto schreiben? Der Stand im Konto wird ersetzt.')) void syncNow(true); }}>Diesen Stand behalten</button></div><div className="konto-side"><b>Konto</b><span className="xs muted">{describe(sync.remote)}</span><button className="btn btn--sm" onClick={() => { void takeRemote(); }}>Stand aus dem Konto übernehmen</button></div></div>
              <span className="xs muted">Solange du nicht gewählt hast, wird nichts überschrieben. Beim Übernehmen aus dem Konto wird der Stand dieses Browsers vorher gesichert.</span>
            </div> : null}
            {sync.status === 'fehler' ? <button className="btn btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => { void syncNow(); }}>Noch einmal versuchen</button> : null}
            {backup ? <div className="row xs" style={{ gap: 8, flexWrap: 'wrap' }}><span className="muted">Sicherung vom {fmtDate(backup.at)} {fmtTime(backup.at)} ({backup.reason}).</span><button className="link" type="button" onClick={() => { if (confirm('Die Sicherung zurückholen? Der aktuelle Stand wird dabei selbst gesichert.')) { restoreBackup(); toast('Sicherung wiederhergestellt'); } }}>Wiederherstellen</button></div> : null}
            <span className="xs muted">Jede Änderung wird kurz danach in deinem Konto gespeichert. Auf einem anderen Gerät genügt dort die Anmeldung, der neueste Stand wird geladen. Eigene Fotos zählen mit; große Fotos machen das Speichern langsamer.</span>
          </Field>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet title="Konto" icon={<IUser />} onClose={close}>
      {mode === 'neuesPasswort' ? <p className="small">Wähle ein neues Passwort für dein Konto.</p> : <p className="small">Melde dich an, um deine Werkstatt auf allen Geräten zu nutzen. Ist dein Konto noch leer, wird „Meine Werkstatt“ aus diesem Browser dorthin übernommen. Liegen auf beiden Seiten Daten, entscheidest du, welcher Stand gilt.</p>}
      {mode !== 'neuesPasswort' && auth.google ? <><div ref={gref} className="konto-google-slot" /><div className="konto-oder"><span>oder mit E-Mail</span></div></> : null}
      <form onSubmit={submit} className="col" style={{ gap: 10 }}>
        {mode !== 'neuesPasswort' ? <Field label="E-Mail"><input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field> : null}
        {mode !== 'passwort' ? <Field label={mode === 'neuesPasswort' ? 'Neues Passwort (mindestens 8 Zeichen)' : 'Passwort'}><input className="input" type="password" autoComplete={mode === 'anmelden' ? 'current-password' : 'new-password'} required minLength={mode === 'anmelden' ? 1 : 8} value={password} onChange={(e) => setPassword(e.target.value)} /></Field> : null}
        {err ? <span className="pill pill--bad xs">{err}</span> : null}
        {info ? <span className="pill xs" style={{ whiteSpace: 'normal', borderRadius: 10, lineHeight: 1.4 }}>{info}</span> : null}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--primary" type="submit" disabled={busy}>{mode === 'anmelden' ? 'Anmelden' : mode === 'registrieren' ? 'Konto anlegen' : mode === 'passwort' ? 'Link senden' : 'Passwort setzen'}</button>
          {mode !== 'anmelden' ? <button className="btn btn--ghost" type="button" onClick={() => { setMode('anmelden'); setErr(''); setInfo(''); }}>Zurück zur Anmeldung</button> : null}
        </div>
      </form>
      {mode === 'anmelden' ? <div className="row xs" style={{ gap: 14, marginTop: 10 }}><button className="link" type="button" onClick={() => { setMode('registrieren'); setErr(''); setInfo(''); }}>Neues Konto anlegen</button><button className="link" type="button" onClick={() => { setMode('passwort'); setErr(''); setInfo(''); }}>Passwort vergessen</button></div> : null}
      <span className="xs faint" style={{ display: 'block', marginTop: 12 }}>Konto und Daten liegen auf deinem Hostinger-Server (3druckwerkbank.com), nirgendwo sonst. Du kannst dich jederzeit abmelden; die Daten bleiben dann in diesem Browser.</span>
    </Sheet>
  );
}
