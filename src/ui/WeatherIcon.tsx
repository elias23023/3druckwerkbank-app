import { wmo } from '../lib/weather';
import { IBolt, ICloud, ICloudSun, IFog, IMoon, IRain, ISnow, ISun } from './Icons';

export function WeatherIcon({ code, isDay = true, size = 20 }: { code: number; isDay?: boolean; size?: number }) {
  const i = wmo(code).icon;
  const p = { width: size, height: size };
  if (i === 'sonne') return isDay ? <ISun {...p} style={{ color: '#ffd77a' }} /> : <IMoon {...p} style={{ color: '#dfe9ff' }} />;
  if (i === 'teils') return <ICloudSun {...p} style={{ color: '#ffe6b0' }} />;
  if (i === 'wolke') return <ICloud {...p} />;
  if (i === 'nebel') return <IFog {...p} />;
  if (i === 'regen' || i === 'schauer') return <IRain {...p} style={{ color: '#9fd4ff' }} />;
  if (i === 'schnee') return <ISnow {...p} />;
  return <IBolt {...p} style={{ color: '#ffd77a' }} />;
}
