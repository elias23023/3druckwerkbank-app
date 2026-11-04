import { wmo } from '../lib/weather';
/** Lightweight precipitation/cloud overlay so the scene matches the real weather. */
export function WeatherFx({ code, reduced }: { code?: number; reduced: boolean }) {
  if (code === undefined) return null;
  const i = wmo(code).icon;
  if (i === 'regen' || i === 'schauer' || i === 'gewitter') return <div className={`wfx wfx--rain${reduced ? ' wfx--still' : ''}`} aria-hidden />;
  if (i === 'schnee') return <div className={`wfx wfx--snow${reduced ? ' wfx--still' : ''}`} aria-hidden />;
  if (i === 'nebel') return <div className="wfx wfx--fog" aria-hidden />;
  if (i === 'wolke') return <div className="wfx wfx--overcast" aria-hidden />;
  return null;
}
