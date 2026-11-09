import { useEffect } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useNow, quoteOfDay, greeting } from '../lib/time';
import { fmtLongDate, fmtTime, fmtNum } from '../lib/format';
import { resolveSeason, SEASON_META, daysUntilNextSeason } from '../lib/season';
import { wmo, bestPvWindow } from '../lib/weather';
import { WeatherIcon } from '../ui/WeatherIcon';
import { navigate } from '../router';
import { IDown } from '../ui/Icons';

/** Start / Hero world – Variante B: clock, date, greeting, weather, quote, landscape and a subtle hint at the worlds below. No lists, no status cards. */
export function Start() {
  const now = useNow(1000);
  const { settings, weather } = useStore(useShallow((s) => ({ settings: s.settings, weather: s.weather })));
  const cur = weather?.data.hourly.length ? weather.data.current : undefined;
  const pv = weather?.data.hourly.length ? bestPvWindow(weather.data.hourly, settings.pvKwp, 3, now) : null;
  // "Scrollen = erkunden": a wheel gesture on the start world dives into Heute.
  useEffect(() => {
    let acc = 0; let armed = true; let last = 0;
    const on = (e: WheelEvent) => { const ui = useStore.getState().ui; if (!armed || ui.sheet || ui.commandOpen) return; if (e.timeStamp - last > 600) acc = 0; last = e.timeStamp; acc += e.deltaY; if (acc > 260) { armed = false; navigate({ world: 'heute' }); } if (acc < 0) acc = 0; };
    window.addEventListener('wheel', on, { passive: true }); return () => window.removeEventListener('wheel', on);
  }, []);
  return (
    <>
      <div className="start-clock">
        <b>{fmtTime(now)}</b>
        <span>{fmtLongDate(now)}</span>
        <span className="start-season">{SEASON_META[resolveSeason(settings.season, now)].label} · noch {daysUntilNextSeason(now)} Tage bis {SEASON_META[resolveSeason(settings.season, now)].next} · {SEASON_META[resolveSeason(settings.season, now)].motto}</span>
        <span style={{ marginTop: 10, fontSize: 'clamp(16px, 1.5cqw, 24px)', color: '#fff' }}>{greeting(now)}{settings.userName ? `, ${settings.userName}` : ''}</span>
        {settings.showQuote ? <p className="quote">„{quoteOfDay(now)}“</p> : null}
      </div>
      <div className="start-weather">
        {cur ? <><WeatherIcon code={cur.code} isDay={cur.isDay} size={40} /><div><b>{fmtNum(cur.temp)} °C</b><span>{wmo(cur.code).label}</span><span>{settings.location.name.split(',')[0]}</span></div><div className="sep" /><div className="motto">{cur.precip > 0 ? 'Drinnen ist heute Werkstatt-Wetter.' : pv ? 'Ein guter Tag für neue Projekte.' : 'Ein ruhiger Tag zum Planen.'}</div></> : <span className="muted small">{weather?.error ? 'Wetter nicht verfügbar' : 'Wetter …'}</span>}
      </div>
      <button className="scroll-hint" onClick={() => navigate({ world: 'heute' })}><span>Scrollen zum Erkunden</span><IDown /></button>
      <div className="hand hand--br">{'Mehr machen –\nmit Ideen, die bleiben.'}</div>
    </>
  );
}
