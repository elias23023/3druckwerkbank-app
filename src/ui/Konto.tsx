import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { Sheet } from './Sheet';
import { Field } from './Glass';
import { IUser, IRefresh } from './Icons';
import { useAuth, useSyncState, signInWithEmail, signUpWithEmail, signInWithGoogleCredential, sendPasswordReset, resetPassword, signOut, syncNow, takeRemote, renderGoogleButton } from '../lib/cloud';
import { fmtTime, fmtDate } from '../lib/format';
import { isDemo } from '../lib/workspace';

/**
 * Konto: Anmelden mit Google oder E-Mail, Registrieren, Passwort vergessen / zurücksetzen; angemeldet: Stand der Synchronisation,
 * Konfliktauflösung, jetzt speichern, abmelden. Backend: /api auf derselben Domain (Hostinger, PHP + MySQL).
 */
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
      else if (mode === 'registrieren') { await signUpWithEmail(email.trim(), password); toast('Konto angelegt'); }
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
    const u = auth.user; const name = u.name || u.email;
    return (
      <Sheet title="Konto" icon={<IUser />} onClose={close} foot={<><button className="btn btn--sm" disabled={isDemo} onClick={() => { void syncNow(); toast('Speichere …'); }}><IRefresh width={13} height={13} /> Jetzt speichern</button><button className="btn btn--sm btn--ghost" style={{ marginLeft: 'auto' }} onClick={async () => { await signOut(); toast('Abgemeldet. Die Daten bleiben in diesem Browser.'); }}>Abmelden</button></>}>
        <div className="konto-user">{u.avatar ? <img src={u.avatar} alt="" referrerPolicy="no-referrer" /> : <span className="konto-avatar">{name.slice(0, 1).toUpperCase()}</span>}<div className="col" style={{ gap: 2 }}><b className="small">{name}</b><span className="xs muted">{u.email}{u.provider === 'google' ? ' · Google' : ' · E-Mail'}</span></div></div>
        {isDemo ? <Field label="Synchronisation"><span className="small">Die Beispiel-Werkstatt wird nicht synchronisiert. Wechsle zu „Meine Werkstatt“ (Chip oben links), dort landen deine echten Daten im Konto.</span></Field> : (
          <Field label="Synchronisation">
            <div className="row small" style={{ gap: 8 }}>
              <i className="dot" style={{ background: sync.status === 'fehler' || sync.status === 'konflikt' ? '#ff6b6b' : sync.status === 'bereit' ? '#4ccf7a' : '#ffd36e' }} />
              <span>{sync.status === 'lädt' ? 'Lade deinen Stand …' : sync.status === 'speichert' ? 'Speichere …' : sync.status === 'fehler' ? `Fehler: ${sync.error}` : sync.status === 'konflikt' ? 'Auf einem anderen Gerät gibt es einen neueren Stand.' : sync.lastSyncAt ? `Gespeichert, zuletzt ${fmtDate(sync.lastSyncAt)} ${fmtTime(sync.lastSyncAt)}` : 'Bereit'}</span>
            </div>
            {sync.status === 'konflikt' ? <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}><button className="btn btn--sm" onClick={() => { void takeRemote(); }}>Stand aus dem Konto übernehmen</button><button className="btn btn--sm btn--ghost" onClick={() => { void syncNow(true); }}>Diesen Stand ins Konto schreiben</button></div> : null}
            <span className="xs muted">Jede Änderung wird kurz danach in deinem Konto gespeichert. Auf einem anderen Gerät genügt dort die Anmeldung, der neueste Stand wird geladen. Eigene Fotos zählen mit; große Fotos machen das Speichern langsamer.</span>
          </Field>
        )}
      </Sheet>
    );
  }

  return (
    <Sheet title="Konto" icon={<IUser />} onClose={close}>
      {mode === 'neuesPasswort' ? <p className="small">Wähle ein neues Passwort für dein Konto.</p> : <p className="small">Melde dich an, um deine Werkstatt auf allen Geräten zu nutzen. Was jetzt in „Meine Werkstatt“ liegt, wird beim ersten Anmelden in dein Konto übernommen.</p>}
      {mode !== 'neuesPasswort' && auth.google ? <><div ref={gref} className="konto-google-slot" /><div className="konto-oder"><span>oder mit E-Mail</span></div></> : null}
      <form onSubmit={submit} className="col" style={{ gap: 10 }}>
        {mode !== 'neuesPasswort' ? <Field label="E-Mail"><input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field> : null}
        {mode !== 'passwort' ? <Field label={mode === 'neuesPasswort' ? 'Neues Passwort (mindestens 8 Zeichen)' : 'Passwort'}><input className="input" type="password" autoComplete={mode === 'anmelden' ? 'current-password' : 'new-password'} required minLength={mode === 'anmelden' ? 1 : 8} value={password} onChange={(e) => setPassword(e.target.value)} /></Field> : null}
        {err ? <span className="pill pill--bad xs">{err}</span> : null}
        {info ? <span className="pill xs">{info}</span> : null}
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
