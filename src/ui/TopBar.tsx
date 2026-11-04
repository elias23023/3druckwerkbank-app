import { useStore } from '../store';
import { useNow } from '../lib/time';
import { fmtLongDate, fmtTime, fmtNum } from '../lib/format';
import { IBolt, IGear, ISearch } from './Icons';
import { WeatherIcon } from './WeatherIcon';
import { wmo } from '../lib/weather';
import { navigate } from '../router';
import { useHints } from './Hinweise';

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
  const settings = useStore((s) => s.settings);
  const openSheet = useStore((s) => s.openSheet);
  const setCommand = useStore((s) => s.setCommand);
  const hints = useHints();
  const shown = settings.notifications === 'aus' ? [] : settings.notifications === 'wichtig' ? hints.filter((h) => h.level !== 'info') : hints;
  const cur = weather?.data.hourly.length ? weather.data.current : undefined;
  return (
    <header className="topbar">
      <button className="brand" onClick={() => navigate({ world: 'start' })} title="Zur Startwelt"><Logo /><div><b>3Druckwerkbank</b><span>Ideen. Machen. Erleben.</span></div></button>
      <button className="glass chip topbar__search desktop-only" onClick={() => setCommand(true)} aria-label="Suche öffnen (Strg+K)">
        <ISearch /> <span className="muted">Befehl eingeben oder suchen …</span> <kbd className="pill xs" style={{ marginLeft: 'auto' }}>Strg K</kbd>
      </button>
      <div className="topbar__clock"><b>{fmtTime(now)}</b><span>{fmtLongDate(now)}</span></div>
      <div className="glass chip" title={weather ? `Open-Meteo, aktualisiert ${fmtTime(weather.fetchedAt)}` : 'Wetter wird geladen'}>
        {cur ? <><WeatherIcon code={cur.code} isDay={cur.isDay} /> <span>{fmtNum(cur.temp)} °C</span><span className="muted small desktop-only">{wmo(cur.code).label}</span></> : weather?.error ? <span className="muted small">Wetter nicht verfügbar</span> : <span className="muted small">Wetter …</span>}
      </div>
      <button className="glass chip btn--icon" onClick={() => setCommand(true)} aria-label="Suche" style={{ width: 40, height: 40 }}><ISearch /></button>
      <button className="glass chip btn--icon" onClick={() => openSheet({ kind: 'hinweise' })} aria-label={`Hinweise (${shown.length})`} style={{ width: 40, height: 40, position: 'relative' }}><IBolt />{shown.length ? <span className="badge">{shown.length}</span> : null}</button>
      <button className="glass chip btn--icon" onClick={() => openSheet({ kind: 'einstellungen' })} aria-label="Einstellungen" style={{ width: 40, height: 40 }}><IGear /></button>
      <div className="topbar__user desktop-only"><span className="xs muted">Schön, dass du da bist!</span><b className="small">{settings.userName || 'Werkstatt'}</b></div>
    </header>
  );
}
