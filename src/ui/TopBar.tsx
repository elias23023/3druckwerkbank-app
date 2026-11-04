import { useStore } from '../store';
import { useNow } from '../lib/time';
import { fmtLongDate, fmtTime, fmtNum } from '../lib/format';
import { IGear, ISearch } from './Icons';
import { WeatherIcon } from './WeatherIcon';
import { wmo } from '../lib/weather';

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <svg className="brand__logo" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs><linearGradient id="lg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stopColor="#9fd0ff" /><stop offset="1" stopColor="#3b7fd6" /></linearGradient></defs>
      <path d="M32 4 58 18v28L32 60 6 46V18z" fill="url(#lg)" opacity=".9" />
      <path d="M32 12 50 22v20L32 52 14 42V22z" fill="none" stroke="#fff" strokeWidth="2.5" opacity=".9" />
      <path d="M32 12v40M14 22l18 10 18-10" fill="none" stroke="#fff" strokeWidth="2" opacity=".6" />
    </svg>
  );
}

export function TopBar() {
  const now = useNow(1000);
  const weather = useStore((s) => s.weather);
  const openSheet = useStore((s) => s.openSheet);
  const setCommand = useStore((s) => s.setCommand);
  const cur = weather?.data.hourly.length ? weather.data.current : undefined;
  return (
    <header className="topbar">
      <div className="brand"><Logo /><div><b>3Druckwerkbank</b><span>Ideen. Machen. Erleben.</span></div></div>
      <button className="glass chip desktop-only" onClick={() => setCommand(true)} aria-label="Suche öffnen (Strg+K)" style={{ marginLeft: 12, minWidth: 260, justifyContent: 'flex-start', color: 'var(--text-2)' }}>
        <ISearch /> Projekte, Rollen, Aufgaben suchen … <kbd className="pill xs" style={{ marginLeft: 'auto' }}>Strg K</kbd>
      </button>
      <div className="topbar__clock"><b>{fmtTime(now)}</b><span>{fmtLongDate(now)}</span></div>
      <div className="glass chip" title={weather ? `Open-Meteo, aktualisiert ${fmtTime(weather.fetchedAt)}` : 'Wetter wird geladen'}>
        {cur ? <><WeatherIcon code={cur.code} isDay={cur.isDay} /> <span>{fmtNum(cur.temp)} °C</span><span className="muted small desktop-only">{wmo(cur.code).label}</span></> : weather?.error ? <span className="muted small">Wetter nicht verfügbar</span> : <span className="muted small">Wetter …</span>}
      </div>
      <button className="glass chip btn--icon" onClick={() => setCommand(true)} aria-label="Suche" style={{ width: 40, height: 40 }}><ISearch /></button>
      <button className="glass chip btn--icon" onClick={() => openSheet({ kind: 'einstellungen' })} aria-label="Einstellungen" style={{ width: 40, height: 40 }}><IGear /></button>
    </header>
  );
}
