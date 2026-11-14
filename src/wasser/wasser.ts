// Wasser-Look: Anschluss an die App. Der Look selbst sind die Kopien aus docs/wasser-look/vorlage
// (kern.css, mobil.css, desktop.css, wasser-skript.js; neu holen mit node scripts/wasser/uebernehmen.mjs).
// Er gilt nur innerhalb des Elements mit dem Attribut data-wasser.
import './kern.css';
import './mobil.css';
import './desktop.css';
import './wasser-skript.js'; // Nebenwirkung: window.Wasser
import { useEffect } from 'react';

declare global { interface Window { Wasser: { start(o?: Record<string, unknown>): unknown; stop(): unknown } } }

/** Startet das Skript des Looks, solange die Komponente steht. Genau einmal je Wurzel verwenden. */
export function useWasser(options?: Record<string, unknown>) {
  useEffect(() => { window.Wasser.start(options); return () => { window.Wasser.stop(); }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
