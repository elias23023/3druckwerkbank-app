import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store';
import { Sheet } from '../ui/Sheet';
import { Field, Seg } from '../ui/Glass';
import { AREAS, PROJECT_TYPES, MILESTONE_TEMPLATES, type LibraryIsland, type Project } from '../types';
import { id, nowIso } from '../lib/format';
import { islandSrc, ISLAND_META } from '../scene/Island';
import { navigate } from '../router';
import { IFlag, ITrash, IArrowR, IArrowL } from '../ui/Icons';

type Draft = Pick<Project, 'name' | 'description' | 'type' | 'areas' | 'tags' | 'priority' | 'difficulty' | 'island' | 'requiredSpools' | 'plannedHours' | 'plannedStart' | 'plannedEnd' | 'difficultyReason'> & { printerId?: string; photoDataUrl?: string };
const blank = (): Draft => ({ name: '', description: '', type: '', areas: [], tags: [], priority: 2, difficulty: 2, island: { kind: 'bibliothek', libraryId: 'ideen', frame: { ratio: 'quer', offsetX: 0, offsetY: 0, zoom: 1, style: 'holz' } }, requiredSpools: [], plannedHours: undefined });
const TYPE_HINT: Record<string, string> = { 'Reparatur / Ersatzteil': 'Etwas Kaputtes wieder nutzbar machen', 'Halterung / Befestigung': 'Perfekt angepasst, überall einsetzbar', 'Organizer / Aufbewahrung': 'Ordnung für Schublade und Werkbank', 'Werkzeug / Hilfsmittel': 'Helfer für die Werkstatt', 'Gehäuse / Elektronik': 'Schützen, ordnen, möglich machen', 'Mechanisches Bauteil': 'Zahnräder, Lager, Gelenke', 'Prototyp / Testteil': 'Schnell ausprobieren', 'Deko / Geschenk': 'Schönes für dich und andere', 'Modell / Miniatur': 'Maßstab und Details', 'Experiment / Neue Idee': 'Etwas noch nie Gedrucktes', 'Sonstiges / Universal': 'Passt in keine Schublade' };
const LIB: { id: LibraryIsland; name: string; hint: string; types: string[]; areas: string[] }[] = [
  { id: 'werkstatt', name: 'Werkstatt', hint: 'Werkbank, Drucker, Werkzeuge', types: ['Werkzeug / Hilfsmittel', 'Mechanisches Bauteil', 'Reparatur / Ersatzteil', 'Organizer / Aufbewahrung'], areas: ['Werkstatt', 'Technik & Maschinen'] },
  { id: 'elektronik', name: 'Elektronik', hint: 'Platinen, Gehäuse, Sensoren', types: ['Gehäuse / Elektronik', 'Prototyp / Testteil'], areas: ['Elektronik & Smart Home', 'Prototyping & Entwicklung'] },
  { id: 'ideen', name: 'Ideen', hint: 'Skizzen, Pläne, Neues', types: ['Experiment / Neue Idee', 'Deko / Geschenk', 'Modell / Miniatur', 'Halterung / Befestigung'], areas: ['Hobby & Freizeit', 'Deko & Persönliches', 'Schule / Lernen', 'Haushalt', 'Garten & Outdoor'] },
  { id: 'heute', name: 'Terrasse', hint: 'Ring, Bank, Hütte', types: ['Deko / Geschenk', 'Sonstiges / Universal'], areas: ['Deko & Persönliches', 'Haushalt'] },
  { id: 'projekte', name: 'Werkstatthütte', hint: 'Hütte mit Werkbank und Baum', types: ['Mechanisches Bauteil', 'Werkzeug / Hilfsmittel', 'Organizer / Aufbewahrung'], areas: ['Werkstatt'] },
  { id: 'druck', name: 'Druckwerkstatt', hint: 'Drucker, AMS, Spulen', types: ['Prototyp / Testteil', 'Mechanisches Bauteil'], areas: ['Werkstatt', 'Prototyping & Entwicklung'] },
  { id: 'material', name: 'Materiallager', hint: 'Regal mit Filamentrollen', types: ['Organizer / Aufbewahrung'], areas: ['Werkstatt'] },
  { id: 'wetter', name: 'Wetterstation', hint: 'Kuppel, Wettermast, Wasserfall', types: ['Gehäuse / Elektronik', 'Experiment / Neue Idee'], areas: ['Garten & Outdoor', 'Elektronik & Smart Home', 'Technik & Maschinen'] },
  { id: 'archiv', name: 'Galerie', hint: 'Bibliothek mit Vitrinen', types: ['Deko / Geschenk', 'Modell / Miniatur'], areas: ['Deko & Persönliches', 'Hobby & Freizeit'] },
  { id: 'drucker', name: 'Druckerplatz', hint: 'Drucker auf der Werkbank', types: ['Prototyp / Testteil', 'Mechanisches Bauteil', 'Reparatur / Ersatzteil', 'Werkzeug / Hilfsmittel'], areas: ['Werkstatt', 'Prototyping & Entwicklung'] },
  { id: 'projekt-garten', name: 'Garten', hint: 'Hochbeet, Gewächshaus, Sensor', types: ['Halterung / Befestigung', 'Gehäuse / Elektronik'], areas: ['Garten & Outdoor'] },
  { id: 'projekt-haushalt', name: 'Küche & Haushalt', hint: 'Küchenzeile, Organizer', types: ['Organizer / Aufbewahrung', 'Reparatur / Ersatzteil', 'Halterung / Befestigung'], areas: ['Haushalt'] },
  { id: 'projekt-fahrzeug', name: 'Fahrzeug', hint: 'Garage, Rad, Ersatzteile', types: ['Reparatur / Ersatzteil', 'Halterung / Befestigung', 'Mechanisches Bauteil'], areas: ['Fahrzeug & Mobilität'] },
  { id: 'projekt-buero', name: 'Büro', hint: 'Schreibtisch, Monitorständer', types: ['Organizer / Aufbewahrung', 'Halterung / Befestigung'], areas: ['Büro & Arbeitsplatz', 'Schule / Lernen'] },
  { id: 'projekt-hobby', name: 'Hobby', hint: 'Spiele, Kamera, Gitarre', types: ['Deko / Geschenk', 'Modell / Miniatur', 'Experiment / Neue Idee'], areas: ['Hobby & Freizeit'] },
  { id: 'projekt-technik', name: 'Technik', hint: 'Motor, Getriebe, Schraubstock', types: ['Mechanisches Bauteil', 'Werkzeug / Hilfsmittel', 'Prototyp / Testteil'], areas: ['Technik & Maschinen'] },
  { id: 'projekt-deko', name: 'Deko', hint: 'Vasen, Lampe, Geschenke', types: ['Deko / Geschenk'], areas: ['Deko & Persönliches'] },
  { id: 'projekt-modell', name: 'Modellbau', hint: 'Miniaturen, Lupe, Vitrine', types: ['Modell / Miniatur'], areas: ['Hobby & Freizeit'] },
  { id: 'haus', name: 'Haus & Bauen', hint: 'Alpenhaus mit Gerüst', types: ['Reparatur / Ersatzteil', 'Halterung / Befestigung'], areas: ['Haushalt', 'Garten & Outdoor'] },
  { id: 'vitrine', name: 'Sammlung', hint: 'Offenes Miniaturarchiv', types: ['Modell / Miniatur', 'Deko / Geschenk'], areas: ['Hobby & Freizeit', 'Deko & Persönliches'] },
  { id: 'druckhuette', name: 'Druckhütte', hint: 'Drucker mit Spulen auf Fels', types: ['Prototyp / Testteil', 'Gehäuse / Elektronik'], areas: ['Prototyping & Entwicklung'] },
  { id: 'pergola', name: 'Pergola-Garten', hint: 'Hochbeete, Pergola, Brunnen', types: ['Halterung / Befestigung', 'Deko / Geschenk'], areas: ['Garten & Outdoor'] },
  { id: 'holz', name: 'Holzwerkstatt', hint: 'Hobelbank, Bretter, Sägen', types: ['Werkzeug / Hilfsmittel', 'Mechanisches Bauteil'], areas: ['Werkstatt'] },
  { id: 'it', name: 'Computerstudio', hint: 'Schreibtisch, Monitore, Kuppel', types: ['Gehäuse / Elektronik', 'Organizer / Aufbewahrung'], areas: ['Büro & Arbeitsplatz', 'Elektronik & Smart Home'] },
  { id: 'labor', name: 'Elektroniklabor', hint: 'Oszilloskop, Lötplatz', types: ['Gehäuse / Elektronik', 'Prototyp / Testteil'], areas: ['Elektronik & Smart Home'] },
  { id: 'spulen', name: 'Spulenlager', hint: 'Regal voller Filamentspulen', types: ['Organizer / Aufbewahrung'], areas: ['Werkstatt'] },
  { id: 'solar', name: 'Solarpavillon', hint: 'Solarpanel, Wechselrichter', types: ['Gehäuse / Elektronik', 'Halterung / Befestigung'], areas: ['Elektronik & Smart Home', 'Garten & Outdoor'] },
  { id: 'metall', name: 'Metallwerkstatt', hint: 'Drehbank, Schraubstock', types: ['Mechanisches Bauteil', 'Werkzeug / Hilfsmittel'], areas: ['Technik & Maschinen'] },
  { id: 'atelier', name: 'Atelier', hint: 'Skizzen, Zeichentisch', types: ['Experiment / Neue Idee', 'Deko / Geschenk'], areas: ['Deko & Persönliches', 'Schule / Lernen'] },
  { id: 'observatorium', name: 'Observatorium', hint: 'Kuppel, Wettermast, Teich', types: ['Experiment / Neue Idee', 'Gehäuse / Elektronik'], areas: ['Garten & Outdoor', 'Technik & Maschinen'] },
  { id: 'planung', name: 'Planungsgarten', hint: 'Leuchtring auf der Terrasse', types: ['Sonstiges / Universal'], areas: ['Deko & Persönliches'] },
  { id: 'garten-ring', name: 'Garten mit Ring', hint: 'Bank, Baum, Ring, Hütte', types: ['Sonstiges / Universal'], areas: ['Garten & Outdoor'] },
  { id: 'pavillon', name: 'Werkstatt-Pavillon', hint: 'Hütte mit Eichenpavillon', types: ['Mechanisches Bauteil'], areas: ['Werkstatt'] },
  { id: 'rahmen', name: 'Eigenes Bild', hint: 'Insel mit Holztafel', types: [], areas: [] },
  { id: 'staffelei', name: 'Eigenes Bild', hint: 'Rahmen auf der Staffelei', types: [], areas: [] },
];

export function ProjektForm({ projectId }: { projectId?: string }) {
  const s = useStore();
  const existing = projectId ? s.projects.find((p) => p.id === projectId) : undefined;
  const key = `projekt:${projectId ?? 'neu'}`;
  const [d, setD] = useState<Draft>(() => (existing ? undefined : (s.ui.drafts[key] as Draft | undefined)) ?? (existing ? { name: existing.name, description: existing.description, type: existing.type, areas: existing.areas, tags: existing.tags, priority: existing.priority, difficulty: existing.difficulty, island: existing.island, requiredSpools: existing.requiredSpools, plannedHours: existing.plannedHours, plannedStart: existing.plannedStart, plannedEnd: existing.plannedEnd, difficultyReason: existing.difficultyReason } : blank()));
  const [step, setStep] = useState(existing ? 5 : 1);
  const [tagText, setTagText] = useState(d.tags.join(', '));
  const [custom, setCustom] = useState(''); const [customArea, setCustomArea] = useState(''); const [showAll, setShowAll] = useState(false); const [showMore, setShowMore] = useState(false);
  // Entwurf nur für neue Projekte merken (ohne Fotos, zeitversetzt): beim Bearbeiten gelten immer die aktuellen Werte des Projekts
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (draftTimer.current) clearTimeout(draftTimer.current); }, []);
  const upd = (patch: Partial<Draft>) => { const nd = { ...d, ...patch }; setD(nd); if (existing) return; if (draftTimer.current) clearTimeout(draftTimer.current); draftTimer.current = setTimeout(() => useStore.getState().setDraft(key, { ...nd, photoDataUrl: undefined, island: { ...nd.island, photoDataUrl: undefined, kind: nd.island.photoDataUrl ? 'bibliothek' : nd.island.kind } }), 500); };
  const close = () => s.closeSheet();
  const suggested = useMemo(() => {
    const score = (l: typeof LIB[number]) => (l.types.includes(d.type) ? 2 : 0) + l.areas.filter((a) => d.areas.includes(a)).length;
    const used = new Map<string, number>(); s.projects.forEach((p) => used.set(p.island.libraryId, (used.get(p.island.libraryId) ?? 0) + 1));
    return [...LIB].filter((l) => l.id !== 'rahmen' && l.id !== 'staffelei').sort((a, b) => score(b) - score(a) || (used.get(b.id) ?? 0) - (used.get(a.id) ?? 0)).slice(0, 3);
  }, [d.type, d.areas, s.projects]);
  const suggestedTags = useMemo(() => { const t = new Set<string>(); if (d.areas.includes('Garten & Outdoor')) { t.add('wetterfest'); t.add('ASA'); } if (d.type === 'Gehäuse / Elektronik') { t.add('Gehäuse'); t.add('PETG'); } if (d.type === 'Halterung / Befestigung') t.add('Wandmontage'); if (d.type === 'Reparatur / Ersatzteil') t.add('Ersatzteil'); return [...t].filter((x) => !d.tags.includes(x)); }, [d.areas, d.type, d.tags]);
  const save = () => {
    if (!d.name.trim()) return;
    const tags = tagText.split(',').map((t) => t.trim()).filter(Boolean);
    const { printerId, photoDataUrl, ...rest } = d; void printerId;
    const tmpl = MILESTONE_TEMPLATES[d.type] ?? MILESTONE_TEMPLATES.default;
    const files = photoDataUrl ? [{ id: id('f'), name: 'Idee.jpg', kind: 'skizze' as const, createdAt: nowIso(), dataUrl: photoDataUrl }] : [];
    const p: Project = existing ? { ...existing, ...rest, tags } : { ...rest, tags, type: d.type || 'Sonstiges / Universal', id: id('p'), stage: 'Idee', progress: 0, favorite: false, createdAt: nowIso(), updatedAt: nowIso(), milestones: tmpl.map((t, i) => ({ id: id('ms'), title: t, done: false, order: i })), versions: [], files, notes: '', experiences: [], history: [] };
    if (draftTimer.current) { clearTimeout(draftTimer.current); draftTimer.current = null; }
    s.upsertProject(p); s.clearDraft(key); close(); s.toast(existing ? 'Projekt gespeichert' : `Projekt „${p.name}“ angelegt`);
    if (!existing) { navigate({ world: 'projekte' }); s.spotlight(p.id); }
  };
  const readPhoto = (file: File, cb: (url: string) => void) => { const r = new FileReader(); r.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const k = Math.min(1, 800 / Math.max(img.width, img.height)); c.width = img.width * k; c.height = img.height * k; c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); cb(c.toDataURL('image/jpeg', .82)); }; img.src = String(r.result); }; r.readAsDataURL(file); };
  const fr = d.island.frame; const easel = d.island.libraryId === 'staffelei'; const meta = ISLAND_META[easel ? 'staffelei' : 'rahmen'];
  const canNext = step === 1 ? !!d.name.trim() : step === 2 ? !!d.type : true;
  const titles = ['Idee', 'Projektart', 'Einsatzbereiche', 'Projektwelt', 'Details'];

  return (
    <Sheet title={existing ? 'Projekt bearbeiten' : `Neues Projekt · ${titles[step - 1]}`} icon={<IFlag />} onClose={close}
      foot={<>
        {!existing && step > 1 ? <button className="btn" onClick={() => setStep(step - 1)}><IArrowL width={14} height={14} /> Zurück</button> : null}
        {step < 5 ? <button className="btn btn--primary" disabled={!canNext} onClick={() => setStep(step + 1)}>Weiter <IArrowR width={14} height={14} /></button> : <button className="btn btn--primary" onClick={save} disabled={!d.name.trim()}>{existing ? 'Speichern' : 'Projekt erstellen'}</button>}
        <button className="btn btn--ghost" onClick={close}>Abbrechen</button>
        {existing ? <button className="btn btn--ghost btn--danger" style={{ marginLeft: 'auto' }} onClick={() => { if (confirm(`„${existing.name}“ in den Papierkorb verschieben?`)) { s.deleteProject(existing.id); close(); navigate({ world: 'projekte' }); } }}><ITrash width={13} height={13} /> Löschen</button> : null}
      </>}>
      {!existing ? <div className="steps">{titles.map((t, i) => <span key={t} className={i < step ? 'on' : ''} title={t} />)}</div> : null}

      {(step === 1 || existing) ? (
        <>
          <Field label="Projektname *"><input className="input" value={d.name} onChange={(e) => upd({ name: e.target.value })} placeholder="z. B. Sensorhalter Garten" autoFocus={!existing} /></Field>
          <Field label="Kurze Beschreibung"><textarea className="textarea" value={d.description} onChange={(e) => upd({ description: e.target.value })} placeholder="Was soll entstehen, wofür, welche Anforderungen?" /></Field>
          {!existing ? <Field label="Foto, Screenshot oder Skizze (optional)"><div className="row"><label className="btn btn--sm">Bild wählen …<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) readPhoto(f, (u) => upd({ photoDataUrl: u })); }} /></label>{d.photoDataUrl ? <img src={d.photoDataUrl} alt="" style={{ height: 48, borderRadius: 8 }} /> : null}</div></Field> : null}
        </>
      ) : null}

      {(step === 2 || existing) ? (
        <Field label="Projektart (genau eine)">
          <div className="tiles">{(showAll ? PROJECT_TYPES : PROJECT_TYPES.slice(0, 6)).map((t) => <button key={t} type="button" className={`tile${d.type === t ? ' on' : ''}`} onClick={() => upd({ type: t })}><b>{t}</b><small>{TYPE_HINT[t]}</small></button>)}</div>
          <div className="row" style={{ gap: 6 }}>{!showAll ? <button className="btn btn--sm btn--ghost" onClick={() => setShowAll(true)}>Weitere Arten</button> : null}<input className="input" style={{ flex: 1, padding: '5px 8px', fontSize: 12 }} placeholder="Eigene Projektart … (Enter)" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && custom.trim()) { upd({ type: custom.trim() }); setCustom(''); } }} /></div>
          {d.type && !PROJECT_TYPES.includes(d.type) ? <span className="pill pill--acc xs" style={{ alignSelf: 'flex-start' }}>Eigene Art: {d.type}</span> : null}
        </Field>
      ) : null}

      {(step === 3 || existing) ? (
        <Field label="Einsatzbereiche (mehrere möglich)">
          <div className="tiles">{AREAS.slice(0, showMore ? AREAS.length : 6).map((a) => <button key={a} type="button" className={`tile${d.areas.includes(a) ? ' on' : ''}`} onClick={() => upd({ areas: d.areas.includes(a) ? d.areas.filter((x) => x !== a) : [...d.areas, a] })}><b>{a}</b></button>)}</div>
          <div className="row" style={{ gap: 6 }}>{!showMore ? <button className="btn btn--sm btn--ghost" onClick={() => setShowMore(true)}>Weitere Bereiche</button> : null}<input className="input" style={{ flex: 1, padding: '5px 8px', fontSize: 12 }} placeholder="Eigener Bereich … (Enter)" value={customArea} onChange={(e) => setCustomArea(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && customArea.trim()) { upd({ areas: [...d.areas, customArea.trim()] }); setCustomArea(''); } }} /></div>
          {d.areas.filter((a) => !AREAS.includes(a)).map((a) => <span key={a} className="pill pill--acc xs" style={{ alignSelf: 'flex-start' }}>Eigener Bereich: {a}</span>)}
        </Field>
      ) : null}

      {(step === 4 || existing) ? (
        <>
          <Field label={existing ? 'Projektwelt' : 'Vorgeschlagene Projektwelten'}>
            <div className="island-lib">
              {(existing ? LIB.filter((l) => l.id !== 'rahmen' && l.id !== 'staffelei') : suggested).map((l) => <button key={l.id} type="button" className={d.island.kind === 'bibliothek' && d.island.libraryId === l.id ? 'on' : ''} onClick={() => upd({ island: { ...d.island, kind: 'bibliothek', libraryId: l.id } })}><img src={islandSrc(l.id, 256)} alt="" />{l.name}<small className="xs muted">{l.hint}</small></button>)}
              <label className={`${d.island.kind === 'eigenes' ? 'on' : ''}`} style={{ cursor: 'pointer' }}><img src={islandSrc('rahmen', 256)} alt="" />Eigenes Bild<input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) readPhoto(f, (u) => upd({ island: { ...d.island, kind: 'eigenes', libraryId: d.island.libraryId === 'staffelei' ? 'staffelei' : 'rahmen', photoDataUrl: u } })); }} /></label>
            </div>
            <span className="xs faint">Vorschläge nach Projektart und Bereich. Individuell generierte Welten folgen später.</span>
          </Field>
          {d.island.kind === 'eigenes' && d.island.photoDataUrl ? (
            <>
              <Field label="Rahmen-Insel"><Seg value={easel ? 'staffelei' : 'rahmen'} options={[{ v: 'rahmen', l: 'Holztafel' }, { v: 'staffelei', l: 'Staffelei' }]} onChange={(v) => upd({ island: { ...d.island, libraryId: v } })} /></Field>
              <div className="frame-preview">
                <img src={islandSrc(easel ? 'staffelei' : 'rahmen', 640)} alt="" width={meta.w} height={meta.h} />
                <div style={easel ? { position: 'absolute', left: '28%', top: '21.5%', width: '44%', height: '32%', background: '#1a1a1a', cursor: 'move' } : { position: 'absolute', left: '51.5%', top: '21%', transform: 'translate(-50%, -50%)', width: fr.ratio === 'hoch' ? '21%' : fr.ratio === 'quadrat' ? '28%' : '44%', aspectRatio: fr.ratio === 'quer' ? '4/3' : fr.ratio === 'hoch' ? '3/4' : '1/1', padding: '2.5%', background: fr.style === 'holz' ? 'linear-gradient(135deg,#8a5a2b,#5a391a)' : 'linear-gradient(135deg,#b9bec7,#6c737d)', boxShadow: '0 8px 20px rgba(0,0,0,.45)', cursor: 'move' }}
                  onPointerDown={(e) => { const sx = e.clientX, sy = e.clientY, ox = fr.offsetX, oy = fr.offsetY; const el = e.currentTarget; el.setPointerCapture(e.pointerId); const mv = (ev: PointerEvent) => upd({ island: { ...d.island, frame: { ...fr, offsetX: ox + (ev.clientX - sx) / 2, offsetY: oy + (ev.clientY - sy) / 2 } } }); const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); }; el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); }}>
                  <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#222' }}><img src={d.island.photoDataUrl} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `translate(${fr.offsetX}%, ${fr.offsetY}%) scale(${fr.zoom})` }} /></div>
                </div>
              </div>
              {easel ? null : <div className="grid2">
                <Field label="Format"><Seg value={fr.ratio} options={[{ v: 'quer', l: 'Quer' }, { v: 'hoch', l: 'Hoch' }, { v: 'quadrat', l: 'Quadrat' }]} onChange={(v) => upd({ island: { ...d.island, frame: { ...fr, ratio: v } } })} /></Field>
                <Field label="Rahmen"><Seg value={fr.style} options={[{ v: 'holz', l: 'Holz' }, { v: 'metall', l: 'Metall' }]} onChange={(v) => upd({ island: { ...d.island, frame: { ...fr, style: v } } })} /></Field>
              </div>}
              <Field label={`Zoom ${fr.zoom.toFixed(2)} · Bild im Rahmen ziehen zum Verschieben`}><input className="range" type="range" min={1} max={3} step={0.05} value={fr.zoom} onChange={(e) => upd({ island: { ...d.island, frame: { ...fr, zoom: Number(e.target.value) } } })} /></Field>
            </>
          ) : null}
        </>
      ) : null}

      {(step === 5 || existing) ? (
        <>
          <div className="grid2">
            <Field label="Tags (Komma-getrennt)"><input className="input" value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="PETG, wetterfest, Wandmontage" /></Field>
          </div>
          {suggestedTags.length ? <div className="row small" style={{ gap: 6, flexWrap: 'wrap' }}><span className="muted xs">Vorschläge:</span>{suggestedTags.map((t) => <button key={t} className="pill xs" onClick={() => { const nt = [...tagText.split(',').map((x) => x.trim()).filter(Boolean), t]; setTagText(nt.join(', ')); upd({ tags: nt }); }}>+ {t}</button>)}</div> : null}
          <Field label="Materialbedarf (g je Rolle)">
            {s.spools.map((sp) => { const r = d.requiredSpools.find((x) => x.spoolId === sp.id); return (
              <div key={sp.id} className="row small"><span className="swatch" style={{ background: sp.colorHex, width: 14, height: 14 }} /><span className="grow ellipsis">{sp.label}</span><input className="input" type="number" min={0} style={{ width: 80, padding: '3px 6px' }} value={r?.grams ?? ''} placeholder="0" onChange={(e) => { const g = Number(e.target.value); upd({ requiredSpools: g > 0 ? (r ? d.requiredSpools.map((x) => (x.spoolId === sp.id ? { ...x, grams: g } : x)) : [...d.requiredSpools, { spoolId: sp.id, grams: g }]) : d.requiredSpools.filter((x) => x.spoolId !== sp.id) }); }} /></div>
            ); })}
          </Field>
          <details>
            <summary className="small muted" style={{ cursor: 'pointer' }}>Weitere Details (Priorität, Schwierigkeit, Termine)</summary>
            <div className="col" style={{ gap: 10, marginTop: 8 }}>
              <div className="grid2">
                <Field label="Priorität"><Seg value={String(d.priority) as '1' | '2' | '3'} options={[{ v: '1', l: 'hoch' }, { v: '2', l: 'mittel' }, { v: '3', l: 'niedrig' }]} onChange={(v) => upd({ priority: Number(v) as 1 | 2 | 3 })} /></Field>
                <Field label={`Schwierigkeit: ${['Sehr leicht', 'Leicht', 'Mittel', 'Schwer', 'Sehr schwer'][d.difficulty - 1]}`}><input className="range" type="range" min={1} max={5} value={d.difficulty} onChange={(e) => upd({ difficulty: Number(e.target.value) as Draft['difficulty'] })} /></Field>
              </div>
              <Field label="Begründung der Schwierigkeit"><input className="input" value={d.difficultyReason ?? ''} onChange={(e) => upd({ difficultyReason: e.target.value })} placeholder="z. B. Toleranzen, Nacharbeit, Material" /></Field>
              <div className="grid3">
                <Field label="Geplanter Start"><input className="input" type="date" value={d.plannedStart?.slice(0, 10) ?? ''} onChange={(e) => upd({ plannedStart: e.target.value ? new Date(e.target.value).toISOString() : undefined })} /></Field>
                <Field label="Endtermin"><input className="input" type="date" value={d.plannedEnd?.slice(0, 10) ?? ''} onChange={(e) => upd({ plannedEnd: e.target.value ? new Date(e.target.value).toISOString() : undefined })} /></Field>
                <Field label="Geplante Druckdauer (h)"><input className="input" type="number" min={0} value={d.plannedHours ?? ''} onChange={(e) => upd({ plannedHours: e.target.value ? Number(e.target.value) : undefined })} /></Field>
              </div>
            </div>
          </details>
          {!existing ? <span className="xs faint">Meilensteine werden passend zur Projektart vorgeschlagen: {(MILESTONE_TEMPLATES[d.type] ?? MILESTONE_TEMPLATES.default).join(' → ')}</span> : null}
        </>
      ) : null}
    </Sheet>
  );
}
