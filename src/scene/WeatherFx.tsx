import { wmo } from '../lib/weather';
import type { Look } from './looks';
/** Lightweight precipitation overlay so the scene matches the real weather (the landscape image carries fog/overcast itself). */
export function WeatherFx({ code, reduced, look }: { code?: number; reduced: boolean; look: Look }) {
  if (code === undefined) return null;
  const i = wmo(code).icon;
  if (look === 'nebel' || look === 'bedeckt') return null;
  if (i === 'regen' || i === 'schauer' || i === 'gewitter') return <div className={`wfx wfx--rain${reduced ? ' wfx--still' : ''}`} aria-hidden />;
  if (i === 'schnee') return <div className={`wfx wfx--snow${reduced ? ' wfx--still' : ''}`} aria-hidden />;
  return null;
}
