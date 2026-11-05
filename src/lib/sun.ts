/** Solar position (NOAA low-precision algorithm, ±1°). Good enough for shadow direction and length. */
const RAD = Math.PI / 180;

export interface SunPos { elevation: number; azimuth: number }

export function sunPosition(date: Date, lat: number, lon: number): SunPos {
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  const doy = Math.floor((date.getTime() - start) / 86400000) + 1;
  const minutesUtc = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const g = (2 * Math.PI / 365) * (doy - 1 + (minutesUtc / 60 - 12) / 24);
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const tst = minutesUtc + eqtime + 4 * lon;
  const ha = (tst / 4 - 180) * RAD;
  const phi = lat * RAD;
  const cosZen = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(ha);
  const zen = Math.acos(Math.max(-1, Math.min(1, cosZen)));
  const elevation = 90 - zen / RAD;
  // azimuth clockwise from north
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) / RAD + 180;
  return { elevation, azimuth: (az + 360) % 360 };
}

/** Shadow length of a gnomon of height h for a given solar elevation, clamped (long, pale shadows at low sun). */
export function shadowLength(elevationDeg: number, h: number, max: number): number {
  if (elevationDeg <= 0.5) return max;
  return Math.min(max, h / Math.tan(elevationDeg * RAD));
}
