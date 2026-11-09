import { Component, type ReactNode } from 'react';
import { storageName } from '../lib/workspace';

/** Fängt Darstellungsfehler ab, damit nie nur eine leere Seite bleibt: Daten sichern, neu laden oder den Bereich zurücksetzen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error('3Druckwerkbank:', error); }
  exportRaw = () => {
    try {
      const raw = localStorage.getItem(storageName) ?? '{}';
      const state = JSON.parse(raw).state ?? {};
      const blob = new Blob([JSON.stringify({ version: 1, ...state, ui: undefined, weather: undefined }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `3druckwerkbank-sicherung-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    } catch { alert('Die Daten konnten nicht gelesen werden.'); }
  };
  reset = () => {
    if (!confirm('Diesen Bereich in diesem Browser wirklich zurücksetzen? Vorher am besten die Daten sichern.')) return;
    try { localStorage.setItem(`${storageName}:defekt`, localStorage.getItem(storageName) ?? ''); } catch { /* voller Speicher: dann ohne Kopie */ }
    try { localStorage.removeItem(storageName); } catch { /* ignore */ }
    location.hash = '#/start'; location.reload();
  };
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash">
        <div className="crash__box">
          <h1>Da ist etwas schiefgelaufen</h1>
          <p>Die Werkstatt konnte nicht dargestellt werden. Deine Daten sind noch im Browser gespeichert.</p>
          <div className="crash__row">
            <button onClick={() => { location.hash = '#/start'; location.reload(); }}>Neu laden</button>
            <button onClick={this.exportRaw}>Daten sichern (JSON)</button>
            <button onClick={this.reset}>Bereich zurücksetzen</button>
          </div>
          <pre>{String(this.state.error.message || this.state.error)}</pre>
        </div>
      </div>
    );
  }
}
