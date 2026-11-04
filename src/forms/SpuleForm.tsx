import { useState } from 'react';
import { useStore, availableGrams } from '../store';
import { Sheet } from '../ui/Sheet';
import { Field, Stack } from '../ui/Glass';
import { COLOR_REFS, DRYING_PROFILES, type Spool } from '../types';
import { id, nowIso, fmtDate, fmtGrams } from '../lib/format';
import { ISpool, ITrash } from '../ui/Icons';

const MATS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'PA', 'PC'];
const blank = (): Spool => ({ id: id('s'), label: '', material: 'PLA', brand: '', colorName: '', colorHex: '#4a90d9', initialGrams: 1000, remainingGrams: 1000, reservedGrams: 0, location: 'Regal A1', price: undefined, openedAt: undefined });

export function SpuleForm({ spoolId }: { spoolId?: string }) {
  const s = useStore();
  const existing = spoolId ? s.spools.find((x) => x.id === spoolId) : undefined;
  const [d, setD] = useState<Spool>(existing ?? blank());
  const [book, setBook] = useState(''); const [note, setNote] = useState(''); const [dry, setDry] = useState(DRYING_PROFILES.find((x) => x.name.startsWith(d.material))?.name ?? DRYING_PROFILES[0].name);
  const upd = (p: Partial<Spool>) => setD({ ...d, ...p });
  const close = () => s.closeSheet();
  const save = () => { if (!d.label.trim()) return; s.upsertSpool({ ...d, label: d.label.trim() }); close(); s.toast('Rolle gespeichert'); };
  const usedBy = s.projects.filter((p) => !p.archivedAt && p.requiredSpools.some((r) => r.spoolId === d.id));
  return (
    <Sheet title={existing ? existing.label : 'Neue Rolle'} icon={<ISpool />} onClose={close}
      foot={<><button className="btn btn--primary" onClick={save} disabled={!d.label.trim()}>Speichern</button><button className="btn" onClick={close}>Abbrechen</button>{existing ? <button className="btn btn--ghost btn--danger" style={{ marginLeft: 'auto' }} onClick={() => { if (confirm('Rolle löschen?')) { s.deleteSpool(existing.id); close(); } }}><ITrash width={13} height={13} /></button> : null}</>}>
      {existing ? (
        <div className="col" style={{ gap: 6 }}>
          <Stack parts={[{ value: availableGrams(existing), color: '#4ccf7a' }, { value: existing.reservedGrams, color: '#ffb547' }, { value: existing.initialGrams - existing.remainingGrams, color: 'rgba(255,255,255,.14)' }]} />
          <div className="row small" style={{ gap: 12 }}><span><span className="dot" style={{ background: '#4ccf7a' }} /> {fmtGrams(availableGrams(existing))} verfügbar</span><span><span className="dot" style={{ background: '#ffb547' }} /> {existing.reservedGrams} g reserviert</span><span className="muted">{existing.initialGrams - existing.remainingGrams} g verbraucht</span></div>
          {usedBy.length ? <span className="xs muted">Eingeplant in: {usedBy.map((p) => p.name).join(', ')}</span> : null}
          <div className="row" style={{ gap: 6 }}>
            <input className="input" type="number" min={1} style={{ width: 90 }} placeholder="Gramm" value={book} onChange={(e) => setBook(e.target.value)} />
            <input className="input grow" placeholder="Wofür? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn btn--sm" disabled={!Number(book)} onClick={() => { s.bookConsumption(existing.id, Number(book), note || undefined); setBook(''); setNote(''); setD({ ...d, remainingGrams: Math.max(0, d.remainingGrams - Number(book)) }); }}>Verbrauch buchen</button>
          </div>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <select className="select" style={{ width: 'auto', padding: '4px 6px', fontSize: 12 }} value={dry} onChange={(e) => setDry(e.target.value)}>{DRYING_PROFILES.map((x) => <option key={x.name} value={x.name}>{x.name} · {x.temp} °C / {x.hours} h</option>)}</select>
            <button className="btn btn--sm" onClick={() => { const pr = DRYING_PROFILES.find((x) => x.name === dry)!; const dryer = s.devices.find((x) => x.kind === 'trockner'); s.addTask({ title: `${existing.label} aus dem Trockner holen (${pr.temp} °C, ${pr.hours} h)`, kind: 'trocknung', deviceId: dryer?.id, due: new Date(Date.now() + pr.hours * 3600_000).toISOString() }); s.upsertSpool({ ...existing, location: dryer?.name ?? 'Trockner' }); setD({ ...d, location: dryer?.name ?? 'Trockner' }); s.toast(`Trocknung geplant: ${pr.temp} °C, ${pr.hours} h`); }}>Trocknung starten</button>
            <button className="btn btn--sm btn--ghost" onClick={() => { s.markDried(existing.id); setD({ ...d, lastDriedAt: nowIso() }); }}>Trocknung erfasst</button>
            <span className="xs muted">{existing.lastDriedAt ? `zuletzt getrocknet ${fmtDate(existing.lastDriedAt)}` : 'noch nie getrocknet'}{DRYING_PROFILES.find((x) => x.name === dry)?.note ? ` · ${DRYING_PROFILES.find((x) => x.name === dry)!.note}` : ''}</span>
          </div>
          <div className="hr" />
        </div>
      ) : null}
      <Field label="Bezeichnung"><input className="input" value={d.label} onChange={(e) => upd({ label: e.target.value })} placeholder="PETG Schwarz #3" autoFocus={!existing} /></Field>
      <div className="grid2">
        <Field label="Material"><select className="select" value={d.material} onChange={(e) => upd({ material: e.target.value })}>{[...new Set([...MATS, d.material])].map((m) => <option key={m}>{m}</option>)}</select></Field>
        <Field label="Marke"><input className="input" value={d.brand} onChange={(e) => upd({ brand: e.target.value })} /></Field>
        <Field label="Farbe"><div className="row"><input type="color" value={d.colorHex} onChange={(e) => upd({ colorHex: e.target.value })} style={{ width: 36, height: 32, border: 0, background: 'none' }} /><input className="input" value={d.colorName} onChange={(e) => upd({ colorName: e.target.value })} placeholder="Farbname" /></div><select className="select" style={{ marginTop: 4, fontSize: 12 }} value="" onChange={(e) => { const c = COLOR_REFS.find((x) => x.hex === e.target.value); if (c) upd({ colorHex: c.hex, colorName: c.name }); }}><option value="">Herstellerfarbe wählen …</option>{COLOR_REFS.map((c) => <option key={c.hex} value={c.hex}>{c.name}</option>)}</select></Field>
        <Field label="Lagerort"><input className="input" value={d.location} onChange={(e) => upd({ location: e.target.value })} /></Field>
        <Field label="Gewicht neu (g)"><input className="input" type="number" value={d.initialGrams} onChange={(e) => upd({ initialGrams: Number(e.target.value) })} /></Field>
        <Field label="Restmenge (g)"><input className="input" type="number" value={d.remainingGrams} onChange={(e) => upd({ remainingGrams: Number(e.target.value) })} /></Field>
        <Field label="Preis (€)"><input className="input" type="number" step="0.1" value={d.price ?? ''} onChange={(e) => upd({ price: e.target.value ? Number(e.target.value) : undefined })} /></Field>
        <Field label="Geöffnet am"><input className="input" type="date" value={d.openedAt ? d.openedAt.slice(0, 10) : ''} onChange={(e) => upd({ openedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })} /></Field>
      </div>
      <Field label="Druckprofil"><input className="input" value={d.profile ?? ''} onChange={(e) => upd({ profile: e.target.value })} placeholder="z. B. PETG 0,2 mm, 240 °C" /></Field>
      <Field label="Eigene Erfahrungen"><textarea className="textarea" value={d.notes ?? ''} onChange={(e) => upd({ notes: e.target.value })} /></Field>
      <Field label="Nachbestell-Link"><input className="input" value={d.reorderUrl ?? ''} onChange={(e) => upd({ reorderUrl: e.target.value })} placeholder="https://…" /></Field>
    </Sheet>
  );
}
