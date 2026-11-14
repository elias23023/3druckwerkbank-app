import { useEffect } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { useNow } from '../lib/time';
import { bestPvWindow } from '../lib/weather';
import { PanelColumn } from '../ui/Glass';
import { Tageskarte } from '../ui/Tageskarte';
import { navigate } from '../router';
import { IDown } from '../ui/Icons';

/** Start / Hero world: the card of the day (clock, date, greeting, weather, daylight, season, quote), the landscape and a subtle hint at the worlds below. No lists, no status cards. */
export function Start() {
  const now = useNow(1000);
  const { settings, weather } = useStore(useShallow((s) => ({ settings: s.settings, weather: s.weather })));
  const pv = weather?.data.hourly.length ? bestPvWindow(weather.data.hourly, settings.pvKwp, 3, now) : null;
  // "Scrollen = erkunden": a wheel gesture on the start world dives into Heute.
  useEffect(() => {
    let acc = 0; let armed = true; let last = 0;
    const on = (e: WheelEvent) => { const ui = useStore.getState().ui; if (!armed || ui.sheet || ui.commandOpen) return; if (e.timeStamp - last > 600) acc = 0; last = e.timeStamp; acc += e.deltaY; if (acc > 260) { armed = false; navigate({ world: 'heute' }); } if (acc < 0) acc = 0; };
    window.addEventListener('wheel', on, { passive: true }); return () => window.removeEventListener('wheel', on);
  }, []);
  return (
    <>
      {/* The card of the day stands in a column top left; the column ends above the Projekte island (its top edge: 35 % of the stage in both formats). */}
      <PanelColumn side="left" top="7.7%" bottom="66%" width="17cqw">
        <Tageskarte now={now} pvStart={pv?.start} variant="desktop" />
      </PanelColumn>
      <button className="scroll-hint" onClick={() => navigate({ world: 'heute' })}><span>Scrollen zum Erkunden</span><IDown /></button>
      <div className="hand hand--br">{'Mehr machen –\nmit Ideen, die bleiben.'}</div>
    </>
  );
}
