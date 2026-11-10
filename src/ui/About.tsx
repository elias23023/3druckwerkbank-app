import { useRef, useState } from 'react';
import { useStore } from '../store';
import { Sheet } from './Sheet';
import { Field, Seg } from './Glass';
import { IGear, IInfo, IDownload, IUpload, IRefresh, ITrash, IUser, IPrinter, IWrench } from './Icons';
import { fmtDate, fmtNum } from '../lib/format';
import { searchPlaces, type Place } from '../lib/weather';
import { workspace, WORKSPACE_META, isDemo, storageName } from '../lib/workspace';

function storageBytes(): { total: number; photos: number } {
  try { const raw = localStorage.getItem(storageName) ?? ''; const photos = (raw.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]+/g) ?? []).reduce((a, m) => a + m.length, 0); return { total: raw.length, photos }; } catch { return { total: 0, photos: 0 }; }
}

/** Ort für Wetter, Tageslicht und Solarfenster: suchen und auswählen oder den eigenen Standort übernehmen. */
function OrtFeld() {
  const loc = useStore((s) => s.settings.location); const setLocation = useStore((s) => s.setLocation); const toast = useStore((s) => s.toast);
  const [q, setQ] = useState(''); const [hits, setHits] = useState<Place[] | null>(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const pick = (name: string, lat: number, lon: number, tz: string) => { setLocation({ name, lat, lon, tz }); setHits(null); setQ(''); setErr(''); toast(`Ort für das Wetter: ${name.split(',')[0]}`); };
  const search = async () => {
    if (q.trim().length < 2) return;
    setBusy(true); setErr('');
    try { const r = await searchPlaces(q, AbortSignal.timeout(10_000)); setHits(r); if (r.length === 0) setErr('Kein Ort gefunden. Probiere einen anderen Namen oder die Postleitzahl.'); }
    catch { setHits(null); setErr('Die Ortssuche ist gerade nicht erreichbar.'); }
    finally { setBusy(false); }
  };
  const here = () => {
    if (!navigator.geolocation) { setErr('Dieser Browser gibt keinen Standort frei.'); return; }
    setBusy(true); setErr('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setBusy(false); pick('Mein Standort', Math.round(pos.coords.latitude * 10000) / 10000, Math.round(pos.coords.longitude * 10000) / 10000, Intl.DateTimeFormat().resolvedOptions().timeZone); },
      () => { setBusy(false); setErr('Der Standort wurde nicht freigegeben.'); }, { timeout: 10_000, maximumAge: 600_000 });
  };
  return (
    <Field label="Ort für Wetter, Tageslicht und Solarfenster">
      <div className="row small" style={{ gap: 8 }}><b className="grow ellipsis">{loc.name}</b><span className="xs muted" style={{ flex: 'none' }}>{fmtNum(loc.lat, 2)}° / {fmtNum(loc.lon, 2)}°</span></div>
      <div className="row" style={{ gap: 6 }}>
        <input className="input grow" value={q} maxLength={80} placeholder="Ort oder Postleitzahl suchen" aria-label="Ort suchen" onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void search(); }} />
        <button className="btn btn--sm" disabled={busy || q.trim().length < 2} onClick={() => void search()}>{busy ? 'Suche …' : 'Suchen'}</button>
        <button className="btn btn--sm btn--ghost" disabled={busy} onClick={here} title="Meinen Standort verwenden">Mein Standort</button>
      </div>
      {hits && hits.length ? <div className="list">{hits.map((h, i) => <button key={`${h.lat}-${h.lon}-${i}`} className="item place-hit" onClick={() => pick([h.name, h.detail.split(', ')[0]].filter(Boolean).join(', '), h.lat, h.lon, h.tz)}><b className="small">{h.name}</b><span className="xs muted grow ellipsis">{h.detail}</span></button>)}</div> : null}
      {err ? <span className="pill pill--warn xs" style={{ alignSelf: 'flex-start', whiteSpace: 'normal' }}>{err}</span> : null}
      <span className="xs muted">Quelle: Open-Meteo. Der Ort gilt für diesen Bereich und wird mit dem Konto synchronisiert.</span>
    </Field>
  );
}

export function EinstellungenSheet() {
  const s = useStore();
  const st = s.settings;
  const file = useRef<HTMLInputElement>(null); const addFile = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  const [en, setEn] = useState({ wh: '', projectId: '', source: 'messung' as 'messung' | 'schaetzung', note: '' });
  const exportJson = () => { const blob = new Blob([s.exportJson()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `3druckwerkbank-export-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  const trash = s.projects.filter((p) => p.deletedAt);
  const bytes = storageBytes();
  const energy = s.energy ?? [];
  const mats = [...new Set(s.spools.map((x) => x.material))];
  return (
    <Sheet title="Einstellungen" icon={<IGear />} onClose={s.closeSheet} foot={<><button className="btn" onClick={() => s.openSheet({ kind: 'ueber' })}><IInfo width={14} height={14} /> Über diesen Entwurf</button></>}>
      <Field label="Dein Name (max. 40 Zeichen, für die Begrüßung)"><input className="input" maxLength={40} value={st.userName ?? ''} onChange={(e) => s.setSettings({ userName: e.target.value })} placeholder="z. B. Elias" /></Field>
      <Field label="Erscheinungsbild"><Seg value={st.theme} options={[{ v: 'auto', l: 'Automatisch (Tageszeit)' }, { v: 'hell', l: 'Hell' }, { v: 'dunkel', l: 'Dunkel' }]} onChange={(v) => s.setSettings({ theme: v })} /></Field>
      <div className="grid2">
        <Field label="Jahreszeit"><Seg value={st.season ?? 'auto'} options={[{ v: 'auto', l: 'Automatisch' }, { v: 'fruehling', l: 'Frühling' }, { v: 'sommer', l: 'Sommer' }, { v: 'herbst', l: 'Herbst' }, { v: 'winter', l: 'Winter' }]} onChange={(v) => s.setSettings({ season: v })} /></Field>
        <Field label="Bewegung"><Seg value={st.motion} options={[{ v: 'auto', l: 'System' }, { v: 'voll', l: 'Voll' }, { v: 'reduziert', l: 'Reduziert' }]} onChange={(v) => s.setSettings({ motion: v })} /></Field>
        <Field label={`Parallaxe ${Math.round((st.parallax ?? 1) * 100)} %`}><input className="range" type="range" min={0} max={1.5} step={0.1} value={st.parallax ?? 1} onChange={(e) => s.setSettings({ parallax: Number(e.target.value) })} /></Field>
      </div>
      <label className="row small" style={{ cursor: 'pointer' }}><input type="checkbox" checked={st.showQuote} onChange={(e) => s.setSettings({ showQuote: e.target.checked })} /> Spruch des Tages anzeigen (wechselt täglich und nach Tageszeit)</label>
      <Field label="Hinweise"><Seg value={st.notifications ?? 'alle'} options={[{ v: 'alle', l: 'Alle' }, { v: 'wichtig', l: 'Nur wichtige' }, { v: 'aus', l: 'Aus' }]} onChange={(v) => s.setSettings({ notifications: v })} /></Field>
      <div className="grid2">
        <Field label="Standarddrucker"><select className="select" value={st.defaultPrinterId ?? ''} onChange={(e) => s.setSettings({ defaultPrinterId: e.target.value || undefined })}><option value="">{s.devices.some((d) => d.kind === 'drucker') ? '–' : 'noch kein Drucker'}</option>{s.devices.filter((d) => d.kind === 'drucker').map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Bevorzugte Materialien"><div className="seg">{mats.length === 0 ? <span className="xs muted" style={{ padding: '4px 8px' }}>Noch keine Rollen</span> : null}{mats.map((m) => <button key={m} type="button" className={st.preferredMaterials?.includes(m) ? 'on' : ''} onClick={() => s.setSettings({ preferredMaterials: st.preferredMaterials?.includes(m) ? st.preferredMaterials.filter((x) => x !== m) : [...(st.preferredMaterials ?? []), m] })}>{m}</button>)}</div></Field>
      </div>
      <Field label="Geräte & Werkzeuge">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><button className="btn btn--sm" onClick={() => s.openSheet({ kind: 'geraete' })}><IPrinter width={13} height={13} /> Drucker &amp; Geräte ({s.devices.filter((d) => d.kind !== 'werkzeug').length})</button><button className="btn btn--sm" onClick={() => s.openSheet({ kind: 'geraete', tab: 'werkzeuge' })}><IWrench width={13} height={13} /> Werkzeuge ({s.devices.filter((d) => d.kind === 'werkzeug').length})</button><span className="xs muted">Eigene Drucker, AMS, Trockner und Werkzeuge anlegen, bearbeiten und löschen.</span></div>
      </Field>
      <div className="hr" />
      <OrtFeld />
      <div className="grid2">
        <Field label="PV-Anlage (kWp)"><input className="input" type="number" step="0.5" min={0} value={st.pvKwp} onChange={(e) => s.setSettings({ pvKwp: Number(e.target.value) })} /></Field>
        <Field label="Strompreis (€/kWh)"><input className="input" type="number" step="0.01" min={0} value={st.pricePerKwh} onChange={(e) => s.setSettings({ pricePerKwh: Number(e.target.value) })} /></Field>
        <Field label="Druckerleistung (W, für Schätzungen)"><input className="input" type="number" step="10" min={0} value={st.printerWatts} onChange={(e) => s.setSettings({ printerWatts: Number(e.target.value) })} /></Field>
      </div>
      <div className="hr" />
      <Field label="Energie & Kosten – Verbrauchswerte">
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <input className="input" type="number" style={{ width: 90 }} placeholder="Wh" value={en.wh} onChange={(e) => setEn({ ...en, wh: e.target.value })} />
          <select className="select" style={{ width: 'auto' }} value={en.projectId} onChange={(e) => setEn({ ...en, projectId: e.target.value })}><option value="">ohne Projekt</option>{s.projects.filter((p) => !p.deletedAt).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <select className="select" style={{ width: 'auto' }} value={en.source} onChange={(e) => setEn({ ...en, source: e.target.value as 'messung' | 'schaetzung' })}><option value="messung">Messung</option><option value="schaetzung">Schätzung</option></select>
          <input className="input grow" placeholder="Notiz" value={en.note} onChange={(e) => setEn({ ...en, note: e.target.value })} />
          <button className="btn btn--sm" disabled={!Number(en.wh)} onClick={() => { s.addEnergy({ at: new Date().toISOString(), wh: Number(en.wh), projectId: en.projectId || undefined, pricePerKwh: st.pricePerKwh, source: en.source, note: en.note || undefined }); setEn({ ...en, wh: '', note: '' }); }}>Erfassen</button>
        </div>
        {energy.slice(0, 12).map((e) => <div key={e.id} className="row small"><span className="muted" style={{ width: 70 }}>{fmtDate(e.at)}</span><b>{fmtNum(e.wh)} Wh</b><span className={`pill xs ${e.source === 'messung' ? 'pill--ok' : 'pill--warn'}`}>{e.source}</span><span className="muted grow ellipsis">{s.projects.find((p) => p.id === e.projectId)?.name ?? '–'}{e.note ? ` · ${e.note}` : ''}</span><span>{fmtNum((e.wh / 1000) * e.pricePerKwh, 2)} €</span><button className="btn btn--icon btn--ghost" style={{ width: 22, height: 22 }} aria-label="Eintrag löschen" title="Löschen" onClick={() => s.deleteEnergy(e.id)}><ITrash width={11} height={11} /></button></div>)}
        <span className="xs muted">Gesamt: {fmtNum(energy.reduce((a, e) => a + e.wh, 0) / 1000, 2)} kWh · {fmtNum(energy.reduce((a, e) => a + (e.wh / 1000) * e.pricePerKwh, 0), 2)} € (Verbrauch × Preis). Messung und Schätzung bleiben getrennt; fehlende Werte sind keine Nullkosten.</span>
      </Field>
      <div className="hr" />
      <Field label="Bereich">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><span className={`ws-chip ws-chip--${workspace}`}><i className="dot" />{WORKSPACE_META[workspace].label}</span><button className="btn btn--sm" onClick={() => s.openSheet({ kind: 'bereich' })}>Bereich wechseln</button><span className="xs muted">{WORKSPACE_META[workspace].hint}</span></div>
      </Field>
      <Field label="Konto">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}><button className="btn btn--sm" onClick={() => s.openSheet({ kind: 'konto' })}><IUser width={13} height={13} /> Konto &amp; Synchronisation</button><span className="xs muted">Anmelden mit Google oder E-Mail, Daten auf allen Geräten.</span></div>
      </Field>
      <Field label="Daten">
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <button className="btn btn--sm" onClick={exportJson}><IDownload width={13} height={13} /> JSON exportieren</button>
          <button className="btn btn--sm" onClick={() => file.current?.click()}><IUpload width={13} height={13} /> JSON importieren</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; f.text().then((t) => { if (confirm('Import ersetzt alle aktuellen Daten in diesem Browser. Fortfahren?')) { const r = s.importJson(t); setErr(r.ok ? '' : r.error ?? 'Fehler'); } }); e.currentTarget.value = ''; }} />
          <button className="btn btn--sm" title="Fügt die Einträge einer Datei zu deinen Daten hinzu, ohne etwas zu ersetzen" onClick={() => addFile.current?.click()}><IUpload width={13} height={13} /> Aus Datei hinzufügen</button>
          <input ref={addFile} type="file" accept="application/json" aria-label="Aus Datei hinzufügen" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; f.text().then((t) => { const r = s.importJson(t, 'hinzufuegen'); setErr(r.ok ? '' : r.error ?? 'Fehler'); }); e.currentTarget.value = ''; }} />
          <button className="btn btn--sm btn--ghost btn--danger" onClick={() => { if (confirm(isDemo ? 'Alle Daten durch die Demodaten ersetzen?' : 'Wirklich alle Projekte, Rollen, Drucke und Termine in „Meine Werkstatt“ löschen? Deine Geräte, Werkzeuge und Einstellungen bleiben. Bist du angemeldet, wird der leere Stand auch in dein Konto übernommen.')) s.resetDemo(); }}><IRefresh width={13} height={13} /> {isDemo ? 'Demodaten zurücksetzen' : 'Werkstatt leeren'}</button>
        </div>
        {err ? <span className="pill pill--bad xs">{err}</span> : null}
        <span className="xs muted">Speicher: {fmtNum(bytes.total / 1024)} KB von ≈ 5 MB belegt, davon {fmtNum(bytes.photos / 1024)} KB Fotos. {isDemo ? 'Die Beispiel-Werkstatt liegt nur in diesem Browser.' : 'Die Daten liegen in diesem Browser. Bist du angemeldet, zusätzlich in deinem Konto.'}{bytes.total > 4_000_000 ? ' Der Speicher ist fast voll: Fotos entfernen oder exportieren.' : ''}</span>
      </Field>
      <Field label={`Papierkorb (${trash.length})`}>
        {trash.length === 0 ? <span className="xs muted">Leer.</span> : trash.map((p) => <div key={p.id} className="row small"><span className="grow ellipsis">{p.name}</span><span className="xs muted">{fmtDate(p.deletedAt)}</span><button className="btn btn--sm" onClick={() => s.restoreProject(p.id)}>Wiederherstellen</button><button className="btn btn--sm btn--ghost btn--danger" onClick={() => { if (confirm(`„${p.name}“ endgültig löschen? Aufgaben und offene Drucke des Projekts werden entfernt, fertige Drucke bleiben im Eingang erhalten.`)) s.purgeProject(p.id); }}>Endgültig</button></div>)}
      </Field>
    </Sheet>
  );
}

const OK = ['Alle 17 Inselbilder vom Nutzer erzeugt (Welten, Projektwelten, Rahmen für eigene Fotos), einheitlicher heller Stil', 'Acht Projektwelten (Garten, Küche & Haushalt, Fahrzeug, Büro, Hobby, Technik, Deko, Modellbau) als Inselbilder vom Nutzer, werden im Projektformular nach Bereich und Art vorgeschlagen', 'Jahreszeiten: automatisch nach Datum (oder fest in den Einstellungen) färben die Inseln, legen eine Stimmung über die Landschaft, lassen Blütenblätter, Pollen und Glühwürmchen, Laub oder Schneestaub treiben; Startwelt zeigt Jahreszeit und Tage bis zur nächsten, Wetterwelt gibt Werkstatt-Tipps je Jahreszeit', 'Tagesportal auf der Heute-Insel: der gemalte Holzring der Insel, innen durchsichtig, und zeigt am Rand den Sonnenweg von Aufgang bis Untergang, in der Mitte die Uhr und den nächsten Lichtwechsel', 'Mobiler Begleiter: unter 900 px Breite eine eigene einfache Oberfläche mit Reitern Start, Heute, Projekte, Material, Mehr (gleiche Daten, gleiche Formulare); Tablet quer und Desktop zeigen die räumliche Werkstatt', 'Startwelt (Variante B): Uhr, Datum, Begrüßung, Wetter, Spruch, Landschaft nach Tageszeit, Inseln als Orientierung, Scrollen = Erkunden', 'Räumliche Navigation: Welten als große Inseln, aktive Welt vorn, Parallaxe, Wolken unter den Inseln, Tag/Dämmerung/Nacht nach echtem Sonnenstand', 'Echtes Wetter von Open-Meteo: aktuell, 24 h mit Temperaturkurve, 7 Tage, Tageslicht, Luftdruck, UV, Wetter-Hinweise (Regelbasiert), beste 8 Stunden nach PV-Regel des Plans', 'Projekt-Flow in fünf Schritten: Idee, Projektart (11 Arten + eigene), Einsatzbereiche (12 + eigene), Projektwelt (3 Vorschläge, eigenes Bild mit Rahmen), Details; Meilenstein-Vorlagen je Projektart; Lichtmoment im Karussell', 'Projekte-Welt: Karussell, Status an der Insel (Bereit/Blockiert/Geplant), Fortschritt, Chips, Aktuelles im Projekt, Ähnliche Projekte, Filter mit Zählern', 'Innenwelt rund um die Insel: Meilensteine, Versionen (Vergleich), Material, Drucke, Dateien, Aufgaben (mit Checklisten-Vorlagen), Werkzeuge, Bilder/3D/Notizen, Historie; Vollansichten als Seitenpanel', 'Drucke planen, Warteschlange mit Bereit/Blockiert und Wartegrund, Ergebnis Erfolg/Nacharbeit/Fehldruck (Nacharbeit → Aufgabe), Eingang mit Projektvorschlägen (hoch/mittel/niedrig), neues Projekt aus Druck, Ignorieren', 'AMS-Slots mit Füllstand, Statistiken 30 Tage, Energie-Messwerte (Messung ≠ Schätzung), Kalibrierungs-Vorlagen am Gerät', 'Material: Rollen einzeln (vorhanden/reserviert/verfügbar, Verbrauch genau einmal gebucht), Trocknung planen mit Geräteprofilen, Herstellerfarben, Produktkatalog (16) und Materialvergleich, Top-Materialien, Einkaufsliste', 'Archiv: Galerie, Zeitreise, beliebte Tags, Wiederentdecken, Filter (Art, Bereich, Material, Drucker, Jahr), Vorlagen (manuell oder beim Abschluss), Erfahrungen', 'Hinweise-Glocke mit Konflikten (Wartung, Fehlmengen, Fehldruck ohne Folge, leere Rollen, Eingang, fehlendes Werkzeug, Final-Version → Abschluss), Halo an blockierten Inseln', 'Papierkorb mit Wiederherstellen, Export/Import als JSON, Demodaten zurücksetzen, Speicheranzeige, Einstellungen (Name, Thema, Bewegung, Parallaxe, Hinweise, Standarddrucker, Materialien, PV, Strompreis)', 'Suche mit Strg+K über Projekte, Versionen, Aufgaben, Drucke, Rollen, Geräte, Historie; zuletzt genutzt gewichtet', 'Eigene Drucker, AMS, Trockner und Werkzeuge anlegen, bearbeiten und löschen; Wartung mit Fälligkeit planen', 'Rückgängig nach dem Löschen oder Abbrechen (einige Sekunden lang im Hinweis unten)', 'Freie Ortswahl für Wetter, Tageslicht und Solarfenster (Suche nach Ort oder Postleitzahl, eigener Standort)', 'Einkaufsliste auch im mobilen Begleiter', 'Zwei Bereiche: Beispiel-Werkstatt mit Demodaten und „Meine Werkstatt“ mit leerem Start', 'Konto mit Google oder E-Mail und Synchronisation von „Meine Werkstatt“ über den eigenen Webspace (PHP und MySQL bei Hostinger)'];
const DEMO = ['Druckfortschritt (läuft nach der geschätzten Dauer mit, keine Geräteanbindung; das Ergebnis buchst du selbst)', 'Solarstrom und Stromschätzung (Formel kWp × Einstrahlung / 1000 × 0,82), Wetter-Hinweise sind Regeln, keine amtlichen Warnungen', 'Kalendertermine (Beispiele), Dateien und 3D-Modelle (Platzhalter; eigene Fotos werden gespeichert)', 'Projektvorschläge im Eingang (einfacher Namensabgleich)', 'Landschaft wechselt nach echtem Sonnenstand (Morgendämmerung, Sonnenaufgang, Morgen, Mittag, Nachmittag, goldene Stunde, Sonnenuntergang, blaue Stunde, Mondnacht) und bei Nebel, Regen oder bedecktem Himmel nach dem echten Wetter'];
const LATER = ['Persönliche Freigabe, Rollen (Eigentümer/Bearbeiter/Leser), feinerer Offline-Abgleich je Eintrag', 'Entwicklungszweige (V3A/V3B), Merge mit Änderungsbericht, räumliche Zeitreise, Wiederherstellen alter Zustände', 'Lebendige Vorlagen und ähnliche Projekte mit selektiver Übernahme und Konfliktansicht', 'STL/3MF-Betrachter und automatische Renders, Slicer-Import, Druckeranbindung, Kameras, Sensoren, reale PV-Daten, dynamische Stromtarife', 'Natürliche Sprache in der Suche, Werkstattkalender (Woche/Monat), externe Kalender, Push, installierbare App', 'Gerätevorlagen (X2D, A1, AMS 2 Pro, AMS HT), Düsenverwaltung, Diagnose mit Symptomen, Etiketten/QR-Erkennung'];

export function UeberSheet() {
  const s = useStore();
  return (
    <Sheet title="Über diesen Entwurf" icon={<IInfo />} onClose={s.closeSheet} foot={<button className="btn" onClick={() => s.openSheet({ kind: 'einstellungen' })}>Zurück zu den Einstellungen</button>}>
      <p className="small">3Druckwerkbank, Stand November 2026. Die App läuft im Browser; „Meine Werkstatt“ lässt sich über ein Konto auf dem eigenen Webspace synchronisieren. Grundlage: Gesamtprompt, Bildreferenzen und der Gesamtplan (Nachtrag 30.09. + Fachübersicht 25.09.2026).</p>
      <Field label="Funktioniert bereits">{OK.map((x) => <span key={x} className="small">✓ {x}</span>)}</Field>
      <Field label="Nur demonstriert">{DEMO.map((x) => <span key={x} className="small muted">◐ {x}</span>)}</Field>
      <Field label="Kommt später">{LATER.map((x) => <span key={x} className="small faint">○ {x}</span>)}</Field>
      <p className="xs faint">Bilder: neun Landschaften und die Inseln für Heute, Material, Wetter, Archiv und Drucker vom Nutzer per KI erzeugt; Werkstatt-, Elektronik-, Ideeninsel, Rahmenbasis und Landschaft aus den vorhandenen Assets. Wetterdaten: Open-Meteo. Ohne Anmeldung verlassen keine Werkstattdaten diesen Browser.</p>
    </Sheet>
  );
}
