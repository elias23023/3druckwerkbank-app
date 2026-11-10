import { useState } from 'react';
import { useStore } from '../store';
import { Field } from './Glass';
import { ITrash } from './Icons';
import { useLive, switchWorkshop, createWorkshop, renameWorkshop, deleteWorkshop, invite, revokeInvite, setRole, removeMember, ROLE_LABEL, type Role } from '../lib/live';

/** Gemeinsame Werkstatt im Konto-Panel: Werkstatt wählen oder anlegen, Mitglieder einladen, Rollen vergeben. */
export function WerkstattFeld({ userId }: { userId: number }) {
  const live = useLive(); const toast = useStore((s) => s.toast);
  const [name, setName] = useState(''); const [mail, setMail] = useState(''); const [role, setRoleNew] = useState<Role>('editor'); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const active = live.workshops.find((w) => w.id === live.activeId);
  const run = async (fn: () => Promise<unknown>, done?: string) => { setBusy(true); setErr(''); try { await fn(); if (done) toast(done); } catch (e) { setErr((e as Error).message || 'Das hat nicht geklappt.'); } finally { setBusy(false); } };
  if (!live.on || !active) return null;
  const owner = live.role === 'owner';
  return (
    <>
      <Field label="Werkstatt">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <select className="select grow" value={active.id} disabled={busy} aria-label="Werkstatt wählen" onChange={(e) => void run(() => switchWorkshop(Number(e.target.value)))}>
            {live.workshops.map((w) => <option key={w.id} value={w.id}>{w.name}{w.personal ? ' (persönlich)' : ''} · {ROLE_LABEL[w.role]}{w.members > 1 ? ` · ${w.members} Mitglieder` : ''}</option>)}
          </select>
          <span className={`pill xs ${live.online ? 'pill--ok' : 'pill--warn'}`} title={live.online ? 'Änderungen anderer erscheinen sofort' : 'Keine Live-Verbindung, es wird erneut versucht'}>{live.online ? 'live' : 'getrennt'}</span>
        </div>
        {live.role === 'reader' ? <span className="pill pill--warn xs" style={{ alignSelf: 'flex-start' }}>Du kannst hier nur lesen. Änderungen werden nicht gespeichert.</span> : null}
        <div className="row" style={{ gap: 6 }}>
          <input className="input grow" value={name} maxLength={80} placeholder="Neue gemeinsame Werkstatt, z. B. Vereinswerkstatt" aria-label="Name der neuen Werkstatt" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) void run(async () => { await createWorkshop(name.trim()); setName(''); }, 'Werkstatt angelegt'); }} />
          <button className="btn btn--sm" disabled={busy || !name.trim()} onClick={() => void run(async () => { await createWorkshop(name.trim()); setName(''); }, 'Werkstatt angelegt')}>Anlegen</button>
        </div>
        {owner && !active.personal ? <div className="row xs" style={{ gap: 12 }}><button className="link" type="button" onClick={() => { const n = prompt('Neuer Name der Werkstatt', active.name); if (n && n.trim()) void run(() => renameWorkshop(n.trim()), 'Umbenannt'); }}>Umbenennen</button><button className="link" type="button" onClick={() => { if (confirm(`Werkstatt „${active.name}“ mit allen Inhalten für alle Mitglieder löschen? Das lässt sich nicht rückgängig machen.`)) void run(() => deleteWorkshop(), 'Werkstatt gelöscht'); }}>Werkstatt löschen</button></div> : null}
        <span className="xs muted">{active.personal ? 'Deine persönliche Werkstatt. Für die Zusammenarbeit kannst du Personen einladen oder eine eigene gemeinsame Werkstatt anlegen.' : 'Eine gemeinsame Werkstatt: Alle Mitglieder sehen dieselben Projekte, Rollen, Geräte und Drucke. Einstellungen bleiben persönlich.'}</span>
      </Field>
      <Field label={`Mitglieder (${live.members.length})`}>
        {live.members.map((m) => (
          <div key={m.id} className="row small" style={{ gap: 8 }}>
            <span className="konto-avatar" style={{ width: 26, height: 26, fontSize: 12, flex: 'none' }}>{(m.name || m.email).slice(0, 1).toUpperCase()}</span>
            <div className="col grow" style={{ gap: 0, minWidth: 0 }}><b className="ellipsis">{m.name || m.email}{m.id === userId ? ' (du)' : ''}</b><span className="xs muted ellipsis">{m.email}</span></div>
            {owner && m.role !== 'owner' ? <select className="select" style={{ width: 'auto', padding: '2px 6px', fontSize: 12 }} value={m.role} disabled={busy} aria-label={`Rolle von ${m.email}`} onChange={(e) => void run(() => setRole(m.id, e.target.value as Role))}><option value="editor">Bearbeiter</option><option value="reader">Leser</option></select> : <span className="pill xs">{ROLE_LABEL[m.role]}</span>}
            {owner && m.role !== 'owner' ? <button className="btn btn--icon btn--ghost" style={{ width: 24, height: 24 }} title="Entfernen" aria-label={`${m.email} entfernen`} disabled={busy} onClick={() => { if (confirm(`${m.email} aus der Werkstatt entfernen?`)) void run(() => removeMember(m.id), 'Mitglied entfernt'); }}><ITrash width={12} height={12} /></button> : null}
            {!owner && m.id === userId ? <button className="btn btn--sm btn--ghost" disabled={busy} onClick={() => { if (confirm('Diese Werkstatt verlassen? Du siehst ihre Inhalte dann nicht mehr.')) void run(() => removeMember(m.id), 'Werkstatt verlassen'); }}>Verlassen</button> : null}
          </div>
        ))}
        {live.invites.map((i) => <div key={i.email} className="row small" style={{ gap: 8 }}><span className="pill xs pill--warn">eingeladen</span><span className="grow ellipsis">{i.email}</span><span className="xs muted">{ROLE_LABEL[i.role]}</span><button className="link" type="button" onClick={() => void run(() => revokeInvite(i.email), 'Einladung zurückgezogen')}>zurückziehen</button></div>)}
        {owner ? (
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <input className="input grow" type="email" value={mail} maxLength={190} placeholder="E-Mail der Person" aria-label="E-Mail für die Einladung" onChange={(e) => setMail(e.target.value)} />
            <select className="select" style={{ width: 'auto' }} value={role} aria-label="Rolle" onChange={(e) => setRoleNew(e.target.value as Role)}><option value="editor">Bearbeiter</option><option value="reader">Leser</option></select>
            <button className="btn btn--sm btn--primary" disabled={busy || !/^\S+@\S+\.\S+$/.test(mail.trim())} onClick={() => void run(async () => { await invite(mail.trim(), role); setMail(''); }, 'Einladung verschickt')}>Einladen</button>
          </div>
        ) : null}
        {err ? <span className="pill pill--bad xs" style={{ alignSelf: 'flex-start', whiteSpace: 'normal' }}>{err}</span> : null}
        {owner ? <span className="xs muted">Die Person bekommt einen Link per E-Mail, gültig sieben Tage. Bearbeiter dürfen alles ändern, Leser nur ansehen.</span> : null}
      </Field>
    </>
  );
}
