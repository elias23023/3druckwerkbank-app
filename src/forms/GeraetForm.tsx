import { useState } from 'react';
import { useBambu } from '../lib/bambu';
import { useStore } from '../store';
import { Sheet } from '../ui/Sheet';
import { Field, Seg } from '../ui/Glass';
import type { Device, DeviceKind } from '../types';
import { id } from '../lib/format';
import { IPrinter, ILayers, IWrench, ITrash, IPlus, IThermo } from '../ui/Icons';

export const KIND_LABEL: Record<DeviceKind, string> = { drucker: 'Drucker', ams: 'AMS / Materialwechsler', trockner: 'Trockner', werkzeug: 'Werkzeug' };
export const STATUS_BY_KIND: Record<DeviceKind, Device['status'][]> = {
  drucker: ['bereit', 'wartung', 'offline'], ams: ['bereit', 'wartung', 'offline'], trockner: ['bereit', 'trocknet', 'wartung', 'offline'], werkzeug: ['verfügbar', 'im Einsatz', 'fehlt'],
};
export const STATUS_COLOR: Record<string, string> = { bereit: '#4ccf7a', druckt: '#7cc6ff', wartung: '#ffb547', offline: '#8a8f96', trocknet: '#ffbd6b', 'verfügbar': '#4ccf7a', 'im Einsatz': '#ffb547', fehlt: '#ff6b6b' };
export function DeviceIcon({ kind, ...p }: { kind: DeviceKind; width?: number; height?: number; className?: string }) {
  return kind === 'ams' ? <ILayers {...p} /> : kind === 'werkzeug' ? <IWrench {...p} /> : kind === 'trockner' ? <IThermo {...p} /> : <IPrinter {...p} />;
}

const blank = (kind: DeviceKind): Device => ({
  id: id(kind === 'werkzeug' ? 'w' : 'd'), name: '', model: '', kind, status: kind === 'werkzeug' ? 'verfügbar' : 'bereit', location: '', hoursTotal: 0, maintenance: [],
  nozzle: kind === 'drucker' ? '0,4 mm' : undefined, wattage: kind === 'drucker' ? 120 : undefined, slots: kind === 'ams' ? [1, 2, 3, 4].map((index) => ({ index })) : undefined,
});
const PLACEHOLDER: Record<DeviceKind, [string, string, string]> = {
  drucker: ['z. B. X1C', 'z. B. Bambu Lab X1 Carbon', 'z. B. Werkbank links'], ams: ['z. B. AMS 1', 'z. B. Bambu AMS', 'z. B. auf dem Drucker'],
  trockner: ['z. B. Trockner', 'z. B. Sunlu S2', 'z. B. Regal C'], werkzeug: ['z. B. Seitenschneider', 'z. B. Knipex 78 61 125', 'z. B. Schublade 1'],
};

/** Gerät oder Werkzeug anlegen und bearbeiten. */
export function GeraetForm({ deviceId, deviceKind, projectId, returnTo }: { deviceId?: string; deviceKind?: DeviceKind; projectId?: string; returnTo?: 'geraete' | 'werkzeuge' }) {
  const s = useStore();
  const existing = deviceId ? s.devices.find((x) => x.id === deviceId) : undefined;
  const [d, setD] = useState<Device>(() => existing ?? blank(deviceKind ?? 'drucker'));
  const printers = s.devices.filter((x) => x.kind === 'drucker' && x.id !== d.id);
  const bambu = useBambu();
  const [isDefault, setIsDefault] = useState(existing ? s.settings.defaultPrinterId === existing.id : s.devices.every((x) => x.kind !== 'drucker'));
  const upd = (p: Partial<Device>) => setD((cur) => ({ ...cur, ...p }));
  const back = () => { if (projectId) s.openSheet({ kind: 'projektDetail', projectId, tab: 'werkzeuge' }); else if (returnTo) s.openSheet({ kind: 'geraete', tab: returnTo }); else if (existing && existing.kind !== 'werkzeug') s.openSheet({ kind: 'geraet', deviceId: existing.id }); else s.closeSheet(); };
  const setKind = (kind: DeviceKind) => setD((cur) => ({ ...blank(kind), id: cur.id, name: cur.name, model: cur.model, location: cur.location, notes: cur.notes }));
  const setSlotCount = (n: number) => { const count = Math.max(1, Math.min(16, Math.round(n) || 1)); upd({ slots: Array.from({ length: count }, (_, i) => (d.slots ?? []).find((sl) => sl.index === i + 1) ?? { index: i + 1 }) }); };
  const name = d.name.trim();
  const save = () => {
    if (!name) return;
    const hours = Number.isFinite(d.hoursTotal) && d.hoursTotal >= 0 ? d.hoursTotal : 0;
    // der Speicher kann sich geändert haben, während das Formular offen war: Belegung, Wartung und Druckstatus kommen frisch aus dem Store
    const fresh = useStore.getState().devices.find((x) => x.id === d.id);
    const slots = d.kind === 'ams' ? (d.slots ?? []).map((sl) => ({ index: sl.index, spoolId: fresh?.slots?.find((x) => x.index === sl.index)?.spoolId })) : undefined;
    s.upsertDevice({ ...d, name, model: d.model.trim(), location: d.location.trim(), hoursTotal: hours, slots, maintenance: fresh?.maintenance ?? d.maintenance, status: fresh?.status === 'druckt' ? 'druckt' : d.status, notes: d.notes?.trim() || undefined, parentId: d.kind === 'ams' ? d.parentId || undefined : undefined });
    if (d.kind === 'drucker') { if (isDefault) s.setSettings({ defaultPrinterId: d.id }); else if (s.settings.defaultPrinterId === d.id) s.setSettings({ defaultPrinterId: undefined }); }
    if (!existing && projectId && d.kind === 'werkzeug') { const pr = useStore.getState().projects.find((x) => x.id === projectId); if (pr) s.setProjectTools(projectId, [...(pr.toolIds ?? []), d.id]); }
    s.toast(existing ? `„${name}“ gespeichert` : `${KIND_LABEL[d.kind].split(' ')[0]} „${name}“ angelegt`);
    back();
  };
  const remove = () => {
    if (!existing) return;
    const waiting = s.prints.filter((p) => p.printerId === existing.id && p.status === 'wartend').length;
    if (!confirm(`„${existing.name}“ wirklich löschen?${waiting ? ` ${waiting} wartende Drucke werden abgebrochen.` : ''}${existing.kind === 'werkzeug' ? ' Das Werkzeug wird auch aus allen Projekten entfernt.' : ''}`)) return;
    const r = s.deleteDevice(existing.id);
    if (!r.ok) { s.toast(r.error ?? 'Löschen nicht möglich'); return; }
    if (projectId) s.openSheet({ kind: 'projektDetail', projectId, tab: 'werkzeuge' }); else if (returnTo) s.openSheet({ kind: 'geraete', tab: returnTo }); else s.closeSheet();
  };
  const ph = PLACEHOLDER[d.kind];
  const statuses = d.status === 'druckt' ? (['druckt'] as Device['status'][]) : STATUS_BY_KIND[d.kind];
  return (
    <Sheet title={existing ? `${existing.name} bearbeiten` : `${KIND_LABEL[d.kind].split(' ')[0]} anlegen`} icon={<DeviceIcon kind={d.kind} />} onClose={s.closeSheet}
      foot={<><button className="btn btn--primary" onClick={save} disabled={!name}>Speichern</button><button className="btn" onClick={back}>Abbrechen</button>{existing ? <button className="btn btn--ghost btn--danger" style={{ marginLeft: 'auto' }} onClick={remove} aria-label="Löschen" title="Löschen"><ITrash width={13} height={13} /> Löschen</button> : null}</>}>
      {!existing ? <Field label="Art"><Seg value={d.kind} options={[{ v: 'drucker', l: 'Drucker' }, { v: 'ams', l: 'AMS' }, { v: 'trockner', l: 'Trockner' }, { v: 'werkzeug', l: 'Werkzeug' }]} onChange={setKind} /></Field> : null}
      <Field label="Name"><input className="input" value={d.name} maxLength={60} onChange={(e) => upd({ name: e.target.value })} placeholder={ph[0]} autoFocus={!existing} onKeyDown={(e) => { if (e.key === 'Enter') save(); }} /></Field>
      <div className="grid2">
        <Field label={d.kind === 'werkzeug' ? 'Typ / Hersteller' : 'Modell'}><input className="input" value={d.model} maxLength={80} onChange={(e) => upd({ model: e.target.value })} placeholder={ph[1]} /></Field>
        <Field label={d.kind === 'werkzeug' ? 'Aufbewahrungsort' : 'Standort'}><input className="input" value={d.location} maxLength={80} onChange={(e) => upd({ location: e.target.value })} placeholder={ph[2]} /></Field>
        <Field label="Status"><select className="select" value={d.status} disabled={d.status === 'druckt'} onChange={(e) => upd({ status: e.target.value as Device['status'] })}>{statuses.map((x) => <option key={x} value={x}>{x}</option>)}</select></Field>
        {d.kind === 'drucker' && (bambu.devices.length > 0 || d.bambuId) ? <Field label="Bambu-Drucker (Live-Stand)"><select className="select" value={d.bambuId ?? ''} onChange={(e) => upd({ bambuId: e.target.value || undefined })}><option value="">nicht verknüpft</option>{d.bambuId && !bambu.devices.some((x) => x.id === d.bambuId) ? <option value={d.bambuId}>verknüpft (gerade nicht erreichbar)</option> : null}{bambu.devices.map((x) => <option key={x.id} value={x.id}>{x.name}{x.model ? ` · ${x.model}` : ''}</option>)}</select></Field> : null}
        {d.kind === 'drucker' ? <Field label="Düse"><input className="input" value={d.nozzle ?? ''} maxLength={40} onChange={(e) => upd({ nozzle: e.target.value || undefined })} placeholder="0,4 mm" /></Field> : null}
        {d.kind === 'drucker' ? <Field label="Leistung im Druck (W)"><input className="input" type="number" min={0} step={10} value={d.wattage ?? ''} onChange={(e) => upd({ wattage: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })} /></Field> : null}
        {d.kind !== 'werkzeug' ? <Field label="Betriebsstunden"><input className="input" type="number" min={0} step={1} value={Number.isFinite(d.hoursTotal) ? Math.round(d.hoursTotal * 10) / 10 : 0} onChange={(e) => upd({ hoursTotal: Math.max(0, Number(e.target.value) || 0) })} /></Field> : null}
        {d.kind === 'ams' ? <Field label="Anzahl Slots"><input className="input" type="number" min={1} max={16} value={d.slots?.length ?? 4} onChange={(e) => setSlotCount(Number(e.target.value))} /></Field> : null}
        {d.kind === 'ams' ? <Field label="Gehört zu Drucker"><select className="select" value={d.parentId ?? ''} onChange={(e) => upd({ parentId: e.target.value || undefined })}><option value="">kein Drucker</option>{printers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field> : null}
      </div>
      {d.kind === 'drucker' ? <label className="row small" style={{ cursor: 'pointer' }}><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} /> Standarddrucker für neue Drucke</label> : null}
      {d.status === 'druckt' ? <span className="xs muted">Der Status wechselt automatisch zurück, sobald das Ergebnis des laufenden Drucks gebucht ist.</span> : null}
      <Field label="Notizen"><textarea className="textarea" value={d.notes ?? ''} maxLength={500} onChange={(e) => upd({ notes: e.target.value })} placeholder={d.kind === 'werkzeug' ? 'z. B. verliehen an …' : 'Besonderheiten, Umbauten, Seriennummer …'} /></Field>
      {existing && d.kind !== 'werkzeug' ? <span className="xs faint">Wartung, AMS-Belegung und letzte Drucke findest du in der Geräteansicht.</span> : null}
    </Sheet>
  );
}

/** Übersicht aller Geräte und Werkzeuge: anlegen, bearbeiten, Status setzen. */
export function GeraeteSheet({ tab: initial }: { tab?: 'geraete' | 'werkzeuge' }) {
  const s = useStore();
  const [tab, setTab] = useState<'geraete' | 'werkzeuge'>(initial ?? 'geraete');
  const machines = s.devices.filter((d) => d.kind !== 'werkzeug').sort((a, b) => ['drucker', 'ams', 'trockner'].indexOf(a.kind) - ['drucker', 'ams', 'trockner'].indexOf(b.kind) || a.name.localeCompare(b.name, 'de'));
  const tools = s.devices.filter((d) => d.kind === 'werkzeug').sort((a, b) => a.name.localeCompare(b.name, 'de'));
  const add = (deviceKind: DeviceKind) => s.openSheet({ kind: 'geraetForm', deviceKind, returnTo: tab });
  return (
    <Sheet title="Geräte & Werkzeuge" icon={<IPrinter />} onClose={s.closeSheet}
      foot={tab === 'geraete' ? <><button className="btn btn--primary" onClick={() => add('drucker')}><IPlus width={13} height={13} /> Drucker</button><button className="btn" onClick={() => add('ams')}><IPlus width={13} height={13} /> AMS</button><button className="btn" onClick={() => add('trockner')}><IPlus width={13} height={13} /> Trockner</button></> : <button className="btn btn--primary" onClick={() => add('werkzeug')}><IPlus width={13} height={13} /> Werkzeug anlegen</button>}>
      <div className="tabs"><button className={tab === 'geraete' ? 'on' : ''} onClick={() => setTab('geraete')}>Drucker &amp; Geräte ({machines.length})</button><button className={tab === 'werkzeuge' ? 'on' : ''} onClick={() => setTab('werkzeuge')}>Werkzeuge ({tools.length})</button></div>
      {tab === 'geraete' ? (
        <div className="list">
          {machines.length === 0 ? <p className="muted small">Noch kein Gerät angelegt. Leg zuerst deinen Drucker an, danach kannst du Drucke planen.</p> : machines.map((d) => (
            <div key={d.id} className="item" style={{ padding: '6px 8px' }}>
              <span className="dot" style={{ background: STATUS_COLOR[d.status] ?? '#8a8f96' }} />
              <button className="grow col dev-row" style={{ gap: 0 }} onClick={() => s.openSheet({ kind: 'geraet', deviceId: d.id })}>
                <span className="row" style={{ gap: 6 }}><b className="small">{d.name}</b><span className="pill xs">{KIND_LABEL[d.kind].split(' ')[0]}</span>{s.settings.defaultPrinterId === d.id ? <span className="pill xs pill--on">Standard</span> : null}</span>
                <span className="xs muted ellipsis">{[d.model, d.location, d.status].filter(Boolean).join(' · ')}</span>
              </button>
              <button className="btn btn--sm btn--ghost" onClick={() => s.openSheet({ kind: 'geraetForm', deviceId: d.id, returnTo: 'geraete' })}>Bearbeiten</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="list">
          {tools.length === 0 ? <p className="muted small">Noch kein Werkzeug angelegt. Werkzeuge kannst du danach in jedem Projekt zuordnen.</p> : tools.map((t) => (
            <div key={t.id} className="item" style={{ padding: '6px 8px' }}>
              <span className="dot" style={{ background: STATUS_COLOR[t.status] ?? '#8a8f96' }} />
              <button className="grow col dev-row" style={{ gap: 0 }} onClick={() => s.openSheet({ kind: 'geraetForm', deviceId: t.id, returnTo: 'werkzeuge' })}>
                <b className="small">{t.name}</b><span className="xs muted ellipsis">{[t.model, t.location, t.notes].filter(Boolean).join(' · ') || 'ohne Angaben'}</span>
              </button>
              <select className="select" style={{ width: 'auto', padding: '2px 6px', fontSize: 12 }} value={t.status} aria-label={`Status ${t.name}`} onChange={(e) => s.setToolStatus(t.id, e.target.value as Device['status'])}>{STATUS_BY_KIND.werkzeug.map((x) => <option key={x} value={x}>{x}</option>)}</select>
              <button className="btn btn--sm btn--ghost" onClick={() => s.openSheet({ kind: 'geraetForm', deviceId: t.id, returnTo: 'werkzeuge' })}>Bearbeiten</button>
            </div>
          ))}
        </div>
      )}
      <span className="xs faint">Eigene Geräte und Werkzeuge gehören zu diesem Bereich und werden mit deinem Konto synchronisiert.</span>
    </Sheet>
  );
}
