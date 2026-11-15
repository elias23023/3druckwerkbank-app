import { useStore } from '../store';
import { useNow } from '../lib/time';
import { fmtLongDate, fmtTime, fmtNum } from '../lib/format';
import { IBolt, IGear, ISearch, IUser } from './Icons';
import { useAuth } from '../lib/cloud';
import { workspace, WORKSPACE_META } from '../lib/workspace';
import { WeatherIcon } from './WeatherIcon';
import { wmo } from '../lib/weather';
import logoUrl from '../assets/logo-96.webp';
import { navigate, useRoute } from '../router';
import { useHints } from './Hinweise';

/** The mark of the app: the user's app symbol (island with workbench and printer) as a small rounded tile. The file comes from
 *  scripts/optimize-appicon.mjs and is small enough that Vite inlines it, so it also shows without network. */
export function Logo({ size = 36 }: { size?: number }) {
  return <img className="brand__logo" src={logoUrl} width={size} height={size} alt="" aria-hidden draggable={false} />;
}

export function TopBar() {
  const now = useNow(1000);
  const weather = useStore((s) => s.weather);
  const settings = useStore((s) => s.settings);
  const auth = useAuth(); const session = auth.user; const avatar = session?.avatar ?? undefined;
  const openSheet = useStore((s) => s.openSheet);
  const setCommand = useStore((s) => s.setCommand);
  const hints = useHints();
  const shown = settings.notifications === 'aus' ? [] : settings.notifications === 'wichtig' ? hints.filter((h) => h.level !== 'info') : hints;
  const cur = weather?.data.hourly.length ? weather.data.current : undefined;
  // Start world: clock, date, greeting and weather stand in the card of the day (src/ui/Tageskarte.tsx), so the bar does not repeat them there
  // the loose greeting at the right end („Schön, dass du da bist!“ and the name) is gone: the name is in the greeting of Heute and of the card of the day
  const world = useRoute().world; const onStart = world === 'start';
  return (
    <header className={`topbar${onStart ? ' topbar--start' : ''}`}>
      <button className="brand feld-etikett" onClick={() => navigate({ world: 'start' })} title="Zur Startwelt"><Logo /><div><b>3Druckwerkbank</b><span>Ideen. Machen. Erleben.</span></div></button>
      <button className={`glass chip ws-chip ws-chip--${workspace}`} onClick={() => openSheet({ kind: 'bereich' })} title={WORKSPACE_META[workspace].hint} aria-label={`Bereich: ${WORKSPACE_META[workspace].label}`}><i className="dot" />{WORKSPACE_META[workspace].short}</button>
      <button className="glass chip topbar__search desktop-only" onClick={() => setCommand(true)} aria-label="Suche öffnen (Strg+K)">
        <ISearch /> <span className="muted">Befehl eingeben oder suchen …</span> <kbd className="pill xs" style={{ marginLeft: 'auto' }}>Strg K</kbd>
      </button>
      {/* clock and date on a chip of their own (they stood loose on the sky); in Heute the ring of the island shows the clock, the chip only the date */}
      {onStart ? null : <div className="glass chip topbar__clock">{world === 'heute' ? null : <b>{fmtTime(now)}</b>}<span>{fmtLongDate(now)}</span></div>}
      {onStart ? null : <div className="glass chip" title={weather ? `Open-Meteo, aktualisiert ${fmtTime(weather.fetchedAt)}` : 'Wetter wird geladen'}>
        {cur ? <><WeatherIcon code={cur.code} isDay={cur.isDay} /> <span>{fmtNum(cur.temp)} °C</span><span className="muted small desktop-only">{wmo(cur.code).label}</span></> : weather?.error ? <span className="muted small">Wetter nicht verfügbar</span> : <span className="muted small">Wetter …</span>}
      </div>}
      <button className="glass chip btn--icon" onClick={() => openSheet({ kind: 'hinweise' })} aria-label={`Hinweise (${shown.length})`} style={{ width: 40, height: 40, position: 'relative' }}><IBolt />{shown.length ? <span className="badge">{shown.length}</span> : null}</button>
      <button className="glass chip btn--icon topbar__konto" onClick={() => openSheet({ kind: 'konto' })} aria-label={session ? `Konto: ${session.email}` : 'Konto'} title={session ? session.email : auth.configured ? 'Anmelden' : 'Konto'} style={{ width: 40, height: 40 }}>{avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : session ? <span className="topbar__initial">{(session.name || session.email || 'K').slice(0, 1).toUpperCase()}</span> : <IUser />}</button>
      <button className="glass chip btn--icon" onClick={() => openSheet({ kind: 'einstellungen' })} aria-label="Einstellungen" style={{ width: 40, height: 40 }}><IGear /></button>
    </header>
  );
}
