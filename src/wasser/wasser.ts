// Wasser-Look: Anschluss an die App. Der Look selbst sind die Kopien aus docs/wasser-look/vorlage
// (kern.css, mobil.css, desktop.css, wasser-skript.js; neu holen mit node scripts/wasser/uebernehmen.mjs).
// Er gilt nur innerhalb des Elements mit dem Attribut data-wasser.
import './kern.css';
import './mobil.css';
import './desktop.css';
import './einbau.css';
import './wasser-skript.js'; // Nebenwirkung: window.Wasser
import { useEffect } from 'react';

declare global { interface Window { Wasser: { start(o?: Record<string, unknown>): unknown; stop(): unknown; DESKTOP: Record<string, unknown> } } }

/** Startet das Skript des Looks, solange die Komponente steht. Genau einmal je Wurzel verwenden.
 *  `on = false`: Die Wurzel dieses Aufrufs steht gerade nicht (App() ruft den Hook für die Bühne immer auf, auch wenn die
 *  mobile Ansicht gezeigt wird); beim Wechsel stoppt das Aufräumen den einen Look, bevor der andere startet. */
export function useWasser(options?: Record<string, unknown>, on = true) {
  useEffect(() => { if (!on) return; window.Wasser.start(options); return () => { window.Wasser.stop(); }; }, [on]); // eslint-disable-line react-hooks/exhaustive-deps
}
