import { useRef, useState } from 'react';
import { useStore } from '../store';
import { Sheet } from './Sheet';
import { Field, Seg } from './Glass';
import { IGear, IInfo, IDownload, IUpload, IRefresh } from './Icons';

export function EinstellungenSheet() {
  const s = useStore();
  const st = s.settings;
  const file = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  const exportJson = () => { const blob = new Blob([s.exportJson()], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `3druckwerkbank-export-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  return (
    <Sheet title="Einstellungen" icon={<IGear />} onClose={s.closeSheet} foot={<><button className="btn" onClick={() => s.openSheet({ kind: 'ueber' })}><IInfo width={14} height={14} /> Über diesen Entwurf</button></>}>
      <Field label="Erscheinungsbild"><Seg value={st.theme} options={[{ v: 'auto', l: 'Automatisch (Tageszeit)' }, { v: 'hell', l: 'Hell' }, { v: 'dunkel', l: 'Dunkel' }]} onChange={(v) => s.setSettings({ theme: v })} /></Field>
      <Field label="Bewegung"><Seg value={st.motion} options={[{ v: 'auto', l: 'Systemeinstellung' }, { v: 'voll', l: 'Voll' }, { v: 'reduziert', l: 'Reduziert' }]} onChange={(v) => s.setSettings({ motion: v })} /></Field>
      <label className="row small" style={{ cursor: 'pointer' }}><input type="checkbox" checked={st.showQuote} onChange={(e) => s.setSettings({ showQuote: e.target.checked })} /> Spruch des Tages auf der Heute-Welt anzeigen</label>
      <div className="hr" />
      <Field label="Ort für Wetter"><input className="input" value={st.location.name} readOnly /><span className="xs muted">Fest auf Weitra eingestellt ({st.location.lat}, {st.location.lon}). Freie Ortswahl folgt in einem späteren Schritt.</span></Field>
      <div className="grid2">
        <Field label="PV-Anlage (kWp)"><input className="input" type="number" step="0.5" min={0} value={st.pvKwp} onChange={(e) => s.setSettings({ pvKwp: Number(e.target.value) })} /></Field>
        <Field label="Strompreis (€/kWh)"><input className="input" type="number" step="0.01" min={0} value={st.pricePerKwh} onChange={(e) => s.setSettings({ pricePerKwh: Number(e.target.value) })} /></Field>
        <Field label="Druckerleistung (W)"><input className="input" type="number" step="10" min={0} value={st.printerWatts} onChange={(e) => s.setSettings({ printerWatts: Number(e.target.value) })} /></Field>
      </div>
      <span className="xs muted">PV- und Stromwerte sind vereinfachte Schätzungen (Globalstrahlung × kWp × 0,8), keine Messwerte.</span>
      <div className="hr" />
      <Field label="Daten">
        <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <button className="btn btn--sm" onClick={exportJson}><IDownload width={13} height={13} /> JSON exportieren</button>
          <button className="btn btn--sm" onClick={() => file.current?.click()}><IUpload width={13} height={13} /> JSON importieren</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; f.text().then((t) => { const r = s.importJson(t); setErr(r.ok ? '' : r.error ?? 'Fehler'); }); e.currentTarget.value = ''; }} />
          <button className="btn btn--sm btn--ghost btn--danger" onClick={() => { if (confirm('Alle Daten durch die Demodaten ersetzen?')) s.resetDemo(); }}><IRefresh width={13} height={13} /> Demodaten zurücksetzen</button>
        </div>
        {err ? <span className="pill pill--bad xs">{err}</span> : null}
        <span className="xs muted">Alle Daten liegen nur in diesem Browser (localStorage). Export sichert sie als Datei.</span>
      </Field>
    </Sheet>
  );
}

const OK = ['Räumliche Navigation zwischen sechs Welten und Projekt-Innenwelt, mit Tiefe, Parallaxe und Übergängen', 'Tag, Dämmerung und Nacht nach echtem Sonnenstand in Weitra', 'Echtes Wetter von Open-Meteo: aktuell, 24 Stunden, 7 Tage, Tageslicht (30-Minuten-Cache)', 'Projekte anlegen, bearbeiten, duplizieren, löschen; eigenes Inselbild mit Rahmen, Format, Ausschnitt und Zoom', 'Meilensteine, Aufgaben (erledigen, überspringen, umordnen), Fortschrittsvorschlag mit manueller Korrektur', 'Versionen mit Status aktuell / beste / final / verworfen und einfachem Vergleich', 'Drucke planen, Warteschlange ordnen, Erfolg / Nacharbeit / Fehldruck buchen; Nacharbeit erzeugt Aufgabe', 'Filamentrollen einzeln mit vorhanden / reserviert / verfügbar; Verbrauch wird genau einmal gebucht', 'Projekt bewusst abschließen → Archivbericht; Archiv als Galerie, Vorlage für neue Projekte', 'Tagesring mit Tageslicht, Solarfenster, Drucken, Aufgaben und Terminen', 'Suche mit Strg+K über Projekte, Aufgaben, Rollen, Geräte und Welten', 'Export / Import als JSON, Demodaten zurücksetzen, reduzierte Bewegung, Hell/Dunkel, Mobil-Layout', 'Speicherung nur in diesem Browser; Formularentwürfe überleben den Weltwechsel'];
const DEMO = ['Druckerstatus und Fortschritt (zeitbasiert simuliert, keine Geräteanbindung)', 'Solarstrom, Stromverbrauch und Kosten (Formel aus Globalstrahlung, keine Messung)', 'Kalendertermine (Beispiele), Wartungsplan, Einkaufsliste', 'Dateien und 3D-Modelle (Platzhalter; eigene Fotos werden gespeichert)', 'Nur vier echte Inselmotive; Heute, Material und Wetter nutzen die Rahmenbasis mit gezeichneten Elementen', 'Wolken, Nebel und Lichtstrahlen sind per CSS erzeugt'];
const LATER = ['Anmeldung, Freigaben, Rechte, Synchronisation über Geräte', 'Papierkorb, Konfliktlösung, Offline-Abgleich', 'STL/3MF-Betrachter, Slicer-Import, Druckeranbindung, Kameras', 'Zeitreise, Entwicklungszweige, Zusammenführen von Versionen', 'Freie Ortswahl, echte PV- und Sensordaten, dynamische Stromtarife', 'Installierbare App, Push-Erinnerungen, Etiketten / QR, Demomodus'];

export function UeberSheet() {
  const s = useStore();
  return (
    <Sheet title="Über diesen Entwurf" icon={<IInfo />} onClose={s.closeSheet} foot={<button className="btn" onClick={() => s.openSheet({ kind: 'einstellungen' })}>Zurück zu den Einstellungen</button>}>
      <p className="small">3Druckwerkbank, Testentwurf vom 4. November 2026. Ein eigenständiger Prototyp ohne Server: alles läuft im Browser.</p>
      <Field label="Funktioniert bereits">{OK.map((x) => <span key={x} className="small">✓ {x}</span>)}</Field>
      <Field label="Nur demonstriert">{DEMO.map((x) => <span key={x} className="small muted">◐ {x}</span>)}</Field>
      <Field label="Kommt später">{LATER.map((x) => <span key={x} className="small faint">○ {x}</span>)}</Field>
      <p className="xs faint">Bilder: vorhandene Assets (Landschaft Tag/Nacht, Werkstatt-, Elektronik-, Ideeninsel, Rahmenbasis). Wetterdaten: Open-Meteo. Keine Daten verlassen diesen Browser.</p>
    </Sheet>
  );
}
