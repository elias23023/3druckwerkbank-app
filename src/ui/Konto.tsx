import { useState, type FormEvent } from 'react';
import { useStore } from '../store';
import { Sheet } from './Sheet';
import { Field } from './Glass';
import { IUser, IRefresh } from './Icons';
import { cloudConfigured, useSession, useSyncState, signInWithGoogle, signInWithEmail, signUpWithEmail, sendPasswordReset, signOut, syncNow, authMessage } from '../lib/cloud';
import { fmtTime, fmtDate } from '../lib/format';
import { isDemo } from '../lib/workspace';

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.5l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v8.6h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 7.1-10 7.1-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

/**
 * Konto: Anmelden mit Google oder E-Mail, Registrieren, Passwort vergessen; angemeldet: Stand der Synchronisation, jetzt speichern, abmelden.
 * Ohne konfigurierten Supabase-Zugang erklärt das Panel, dass die Daten nur im Browser liegen.
 */
export function KontoSheet() {
  const close = useStore((s) => s.closeSheet);
  const toast = useStore((s) => s.toast);
  const { session } = useSession();
  const sync = useSyncState();
  const [mode, setMode] = useState<'anmelden' | 'registrieren' | 'passwort'>('anmelden');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [info, setInfo] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'anmelden') { const { error } = await signInWithEmail(email.trim(), password); if (error) setErr(authMessage(error.message)); }
      else if (mode === 'registrieren') { const { data, error } = await signUpWithEmail(email.trim(), password); if (error) setErr(authMessage(error.message)); else setInfo(data.session ? 'Konto angelegt und angemeldet.' : 'Konto angelegt. Bitte den Bestätigungslink in deiner E-Mail anklicken, dann anmelden.'); }
      else { const { error } = await sendPasswordReset(email.trim()); if (error) setErr(authMessage(error.message)); else setInfo('Wenn ein Konto zu dieser E-Mail existiert, ist ein Link zum Zurücksetzen unterwegs.'); }
    } finally { setBusy(false); }
  };
  const google = async () => { setErr(''); setBusy(true); const { error } = await signInWithGoogle(); if (error) { setErr(authMessage(error.message)); setBusy(false); } };

  if (!cloudConfigured) {
    return (
      <Sheet title="Konto" icon={<IUser />} onClose={close}>
        <p className="small">Deine Werkstatt liegt derzeit nur in diesem Browser. Mit einem Konto kannst du dich mit Google oder E-Mail anmelden und deine Daten auf allen Geräten nutzen.</p>
        <p className="small muted">Der Konto-Dienst ist für diese Installation noch nicht eingerichtet. Anleitung: <code>docs/Login-Einrichtung.md</code> im Projekt.</p>
      </Sheet>
    );
  }

  if (session) {
    const u = session.user; const name = (u.user_metadata?.full_name as string | undefined) ?? u.email ?? 'Angemeldet';
    const avatar = u.user_metadata?.avatar_url as string | undefined;
    return (
      <Sheet title="Konto" icon={<IUser />} onClose={close} foot={<><button className="btn btn--sm" onClick={() => { void syncNow(); toast('Speichere …'); }}><IRefresh width={13} height={13} /> Jetzt speichern</button><button className="btn btn--sm btn--ghost" style={{ marginLeft: 'auto' }} onClick={async () => { await signOut(); toast('Abgemeldet. Die Daten bleiben in diesem Browser.'); }}>Abmelden</button></>}>
        <div className="konto-user">{avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : <span className="konto-avatar">{name.slice(0, 1).toUpperCase()}</span>}<div className="col" style={{ gap: 2 }}><b className="small">{name}</b><span className="xs muted">{u.email}{u.app_metadata?.provider === 'google' ? ' · Google' : ' · E-Mail'}</span></div></div>
        {isDemo ? <Field label="Synchronisation"><span className="small">Die Beispiel-Werkstatt wird nicht synchronisiert. Wechsle zu „Meine Werkstatt“ (Chip oben links), dort landen deine echten Daten im Konto.</span></Field> : null}
        {isDemo ? null : <Field label="Synchronisation">
          <div className="row small" style={{ gap: 8 }}>
            <i className="dot" style={{ background: sync.status === 'fehler' ? '#ff6b6b' : sync.status === 'bereit' ? '#4ccf7a' : '#ffd36e' }} />
            <span>{sync.status === 'lädt' ? 'Lade deinen Stand …' : sync.status === 'speichert' ? 'Speichere …' : sync.status === 'fehler' ? `Fehler: ${sync.error}` : sync.lastSyncAt ? `Gespeichert, zuletzt ${fmtDate(sync.lastSyncAt)} ${fmtTime(sync.lastSyncAt)}` : 'Bereit'}</span>
          </div>
          <span className="xs muted">Jede Änderung wird kurz danach in deinem Konto gespeichert. Auf einem anderen Gerät genügt dort die Anmeldung, der neueste Stand wird geladen. Eigene Fotos zählen mit; große Fotos machen das Speichern langsamer.</span>
        </Field>}
      </Sheet>
    );
  }

  return (
    <Sheet title="Konto" icon={<IUser />} onClose={close}>
      <p className="small">Melde dich an, um deine Werkstatt auf allen Geräten zu nutzen. Was jetzt in diesem Browser liegt, wird beim ersten Anmelden in dein Konto übernommen.</p>
      <button className="btn konto-google" type="button" onClick={google} disabled={busy}><GoogleMark /> Mit Google anmelden</button>
      <div className="konto-oder"><span>oder mit E-Mail</span></div>
      <form onSubmit={submit} className="col" style={{ gap: 10 }}>
        <Field label="E-Mail"><input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        {mode !== 'passwort' ? <Field label="Passwort"><input className="input" type="password" autoComplete={mode === 'registrieren' ? 'new-password' : 'current-password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></Field> : null}
        {err ? <span className="pill pill--bad xs">{err}</span> : null}
        {info ? <span className="pill xs">{info}</span> : null}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn--primary" type="submit" disabled={busy}>{mode === 'anmelden' ? 'Anmelden' : mode === 'registrieren' ? 'Konto anlegen' : 'Link senden'}</button>
          {mode !== 'anmelden' ? <button className="btn btn--ghost" type="button" onClick={() => { setMode('anmelden'); setErr(''); setInfo(''); }}>Zurück zur Anmeldung</button> : null}
        </div>
      </form>
      {mode === 'anmelden' ? <div className="row xs" style={{ gap: 14, marginTop: 10 }}><button className="link" type="button" onClick={() => { setMode('registrieren'); setErr(''); setInfo(''); }}>Neues Konto anlegen</button><button className="link" type="button" onClick={() => { setMode('passwort'); setErr(''); setInfo(''); }}>Passwort vergessen</button></div> : null}
      <span className="xs faint" style={{ display: 'block', marginTop: 12 }}>Konto und Daten liegen bei Supabase (EU-Region, wenn so eingerichtet). Du kannst dich jederzeit abmelden; die Daten bleiben dann in diesem Browser.</span>
    </Sheet>
  );
}
