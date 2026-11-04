import { useState } from 'react';
import { useStore } from '../store';
import { Sheet } from '../ui/Sheet';
import { Field, Seg } from '../ui/Glass';
import { AREAS, PROJECT_TYPES, type LibraryIsland, type Project } from '../types';
import { id, nowIso } from '../lib/format';
import { islandSrc, ISLAND_META } from '../scene/Island';
import { navigate } from '../router';
import { IFlag, ITrash } from '../ui/Icons';

type Draft = Pick<Project, 'name' | 'description' | 'type' | 'areas' | 'tags' | 'priority' | 'difficulty' | 'island' | 'requiredSpools' | 'plannedHours'>;
const blank = (): Draft => ({ name: '', description: '', type: 'Halterung', areas: [], tags: [], priority: 2, difficulty: 2, island: { kind: 'bibliothek', libraryId: 'ideen', frame: { ratio: 'quer', offsetX: 0, offsetY: 0, zoom: 1, style: 'holz' } }, requiredSpools: [], plannedHours: undefined });

export function ProjektForm({ projectId }: { projectId?: string }) {
  const s = useStore();
  const existing = projectId ? s.projects.find((p) => p.id === projectId) : undefined;
  const key = `projekt:${projectId ?? 'neu'}`;
  const [d, setD] = useState<Draft>(() => (s.ui.drafts[key] as Draft) ?? (existing ? { name: existing.name, description: existing.description, type: existing.type, areas: existing.areas, tags: existing.tags, priority: existing.priority, difficulty: existing.difficulty, island: existing.island, requiredSpools: existing.requiredSpools, plannedHours: existing.plannedHours } : blank()));
  const [tagText, setTagText] = useState(d.tags.join(', '));
  const [custom, setCustom] = useState('');
  const upd = (patch: Partial<Draft>) => { const nd = { ...d, ...patch }; setD(nd); s.setDraft(key, nd); };
  const close = () => s.closeSheet();
  const save = () => {
    if (!d.name.trim()) return;
    const tags = tagText.split(',').map((t) => t.trim()).filter(Boolean);
    const p: Project = existing ? { ...existing, ...d, tags } : { ...d, tags, id: id('p'), stage: 'Idee', progress: 0, favorite: false, createdAt: nowIso(), updatedAt: nowIso(), milestones: [{ id: id('ms'), title: 'Idee & Maße', done: false, order: 0 }, { id: id('ms'), title: 'Konstruktion', done: false, order: 1 }, { id: id('ms'), title: 'Testdruck', done: false, order: 2 }, { id: id('ms'), title: 'Finaldruck', done: false, order: 3 }], versions: [], files: [], notes: '', experiences: [], history: [] };
    s.upsertProject(p); s.clearDraft(key); close(); s.toast(existing ? 'Projekt gespeichert' : 'Projekt angelegt');
    if (!existing) navigate({ world: 'projekte', projectId: p.id });
  };
  const onPhoto = (file: File) => {
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const k = Math.min(1, 800 / Math.max(img.width, img.height)); c.width = img.width * k; c.height = img.height * k; c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); upd({ island: { ...d.island, kind: 'eigenes', libraryId: 'rahmen', photoDataUrl: c.toDataURL('image/jpeg', .82) } }); }; img.src = String(r.result); };
    r.readAsDataURL(file);
  };
  const fr = d.island.frame;
  const meta = ISLAND_META.rahmen;

  return (
    <Sheet title={existing ? 'Projekt bearbeiten' : 'Neues Projekt'} icon={<IFlag />} onClose={close}
      foot={<><button className="btn btn--primary" onClick={save} disabled={!d.name.trim()}>{existing ? 'Speichern' : 'Projekt anlegen'}</button><button className="btn" onClick={close}>Abbrechen</button>{existing ? <button className="btn btn--ghost btn--danger" style={{ marginLeft: 'auto' }} onClick={() => { if (confirm(`„${existing.name}“ wirklich löschen?`)) { s.deleteProject(existing.id); close(); navigate({ world: 'projekte' }); } }}><ITrash width={13} height={13} /> Löschen</button> : null}</>}>
      <Field label="Name"><input className="input" value={d.name} onChange={(e) => upd({ name: e.target.value })} placeholder="z. B. Sensorhalter Garten" autoFocus /></Field>
      <Field label="Beschreibung / Idee"><textarea className="textarea" value={d.description} onChange={(e) => upd({ description: e.target.value })} placeholder="Was soll entstehen, wofür, welche Anforderungen?" /></Field>
      <Field label="Projektart"><div className="seg">{PROJECT_TYPES.map((t) => <button key={t} type="button" className={d.type === t ? 'on' : ''} onClick={() => upd({ type: t })}>{t}</button>)}<input className="input" style={{ width: 120, padding: '4px 8px', fontSize: 12 }} placeholder="Eigene Art …" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && custom.trim()) { upd({ type: custom.trim() }); setCustom(''); } }} /></div>{!PROJECT_TYPES.includes(d.type) ? <span className="xs muted">Eigene Art: {d.type}</span> : null}</Field>
      <Field label="Einsatzbereiche"><div className="seg">{AREAS.map((a) => <button key={a} type="button" className={d.areas.includes(a) ? 'on' : ''} onClick={() => upd({ areas: d.areas.includes(a) ? d.areas.filter((x) => x !== a) : [...d.areas, a] })}>{a}</button>)}</div></Field>
      <Field label="Tags (Komma-getrennt)"><input className="input" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Hochbeet, ASA, Außen" /></Field>
      <div className="grid2">
        <Field label="Priorität"><Seg value={String(d.priority) as '1' | '2' | '3'} options={[{ v: '1', l: 'hoch' }, { v: '2', l: 'mittel' }, { v: '3', l: 'niedrig' }]} onChange={(v) => upd({ priority: Number(v) as 1 | 2 | 3 })} /></Field>
        <Field label={`Schwierigkeit ${d.difficulty}/5`}><input className="range" type="range" min={1} max={5} value={d.difficulty} onChange={(e) => upd({ difficulty: Number(e.target.value) as Draft['difficulty'] })} /></Field>
      </div>
      <Field label="Geplanter Zeitaufwand (h)"><input className="input" type="number" min={0} value={d.plannedHours ?? ''} onChange={(e) => upd({ plannedHours: e.target.value ? Number(e.target.value) : undefined })} /></Field>

      <div className="hr" />
      <Field label="Inselmotiv">
        <div className="island-lib">
          {(['werkstatt', 'elektronik', 'ideen', 'rahmen'] as LibraryIsland[]).map((k) => <button key={k} type="button" className={d.island.kind === 'bibliothek' && d.island.libraryId === k ? 'on' : ''} onClick={() => upd({ island: { ...d.island, kind: 'bibliothek', libraryId: k } })}><img src={islandSrc(k, 256)} alt="" />{{ werkstatt: 'Werkstatt', elektronik: 'Elektronik', ideen: 'Ideen', rahmen: 'Leer' }[k]}</button>)}
        </div>
        <label className="btn btn--sm" style={{ alignSelf: 'flex-start', marginTop: 6 }}>Eigenes Bild wählen …<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onPhoto(f); }} /></label>
      </Field>
      {d.island.kind === 'eigenes' && d.island.photoDataUrl ? (
        <>
          <div className="frame-preview">
            <img src={islandSrc('rahmen', 640)} alt="" width={meta.w} height={meta.h} />
            <div style={{ position: 'absolute', left: '50%', top: '30%', transform: 'translate(-50%, -100%)', width: fr.ratio === 'hoch' ? '24%' : fr.ratio === 'quadrat' ? '30%' : '38%', aspectRatio: fr.ratio === 'quer' ? '4/3' : fr.ratio === 'hoch' ? '3/4' : '1/1', padding: '2.5%', background: fr.style === 'holz' ? 'linear-gradient(135deg,#8a5a2b,#5a391a)' : 'linear-gradient(135deg,#b9bec7,#6c737d)', boxShadow: '0 8px 20px rgba(0,0,0,.45)', cursor: 'move' }}
              onPointerDown={(e) => { const sx = e.clientX, sy = e.clientY, ox = fr.offsetX, oy = fr.offsetY; const el = e.currentTarget; el.setPointerCapture(e.pointerId); const mv = (ev: PointerEvent) => upd({ island: { ...d.island, frame: { ...fr, offsetX: ox + (ev.clientX - sx) / 2, offsetY: oy + (ev.clientY - sy) / 2 } } }); const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); }; el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); }}>
              <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#222' }}><img src={d.island.photoDataUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `translate(${fr.offsetX}%, ${fr.offsetY}%) scale(${fr.zoom})` }} /></div>
            </div>
          </div>
          <div className="grid2">
            <Field label="Format"><Seg value={fr.ratio} options={[{ v: 'quer', l: 'Quer' }, { v: 'hoch', l: 'Hoch' }, { v: 'quadrat', l: 'Quadrat' }]} onChange={(v) => upd({ island: { ...d.island, frame: { ...fr, ratio: v } } })} /></Field>
            <Field label="Rahmen"><Seg value={fr.style} options={[{ v: 'holz', l: 'Holz' }, { v: 'metall', l: 'Metall' }]} onChange={(v) => upd({ island: { ...d.island, frame: { ...fr, style: v } } })} /></Field>
          </div>
          <Field label={`Zoom ${fr.zoom.toFixed(2)} · Bild im Rahmen ziehen zum Verschieben`}><input className="range" type="range" min={1} max={3} step={0.05} value={fr.zoom} onChange={(e) => upd({ island: { ...d.island, frame: { ...fr, zoom: Number(e.target.value) } } })} /></Field>
        </>
      ) : null}

      <div className="hr" />
      <Field label="Materialbedarf (g je Rolle)">
        {s.spools.map((sp) => { const r = d.requiredSpools.find((x) => x.spoolId === sp.id); return (
          <div key={sp.id} className="row small"><span className="swatch" style={{ background: sp.colorHex, width: 14, height: 14 }} /><span className="grow ellipsis">{sp.label}</span><input className="input" type="number" min={0} style={{ width: 80, padding: '3px 6px' }} value={r?.grams ?? ''} placeholder="0" onChange={(e) => { const g = Number(e.target.value); upd({ requiredSpools: g > 0 ? (r ? d.requiredSpools.map((x) => (x.spoolId === sp.id ? { ...x, grams: g } : x)) : [...d.requiredSpools, { spoolId: sp.id, grams: g }]) : d.requiredSpools.filter((x) => x.spoolId !== sp.id) }); }} /></div>
        ); })}
      </Field>
    </Sheet>
  );
}
