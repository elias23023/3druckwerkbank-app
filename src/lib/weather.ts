import type { Settings, WeatherData, WeatherDay, WeatherHour } from '../types';

export const WMO: Record<number, { label: string; icon: 'sonne' | 'teils' | 'wolke' | 'nebel' | 'regen' | 'schnee' | 'schauer' | 'gewitter' }> = {
  0: { label: 'Klar', icon: 'sonne' }, 1: { label: 'Überwiegend klar', icon: 'sonne' }, 2: { label: 'Teilweise bewölkt', icon: 'teils' }, 3: { label: 'Bedeckt', icon: 'wolke' },
  45: { label: 'Nebel', icon: 'nebel' }, 48: { label: 'Reifnebel', icon: 'nebel' },
  51: { label: 'Leichter Nieselregen', icon: 'regen' }, 53: { label: 'Nieselregen', icon: 'regen' }, 55: { label: 'Starker Nieselregen', icon: 'regen' },
  56: { label: 'Gefrierender Niesel', icon: 'regen' }, 57: { label: 'Gefrierender Niesel', icon: 'regen' },
  61: { label: 'Leichter Regen', icon: 'regen' }, 63: { label: 'Regen', icon: 'regen' }, 65: { label: 'Starker Regen', icon: 'regen' },
  66: { label: 'Gefrierender Regen', icon: 'regen' }, 67: { label: 'Gefrierender Regen', icon: 'regen' },
  71: { label: 'Leichter Schneefall', icon: 'schnee' }, 73: { label: 'Schneefall', icon: 'schnee' }, 75: { label: 'Starker Schneefall', icon: 'schnee' }, 77: { label: 'Schneegriesel', icon: 'schnee' },
  80: { label: 'Leichte Schauer', icon: 'schauer' }, 81: { label: 'Schauer', icon: 'schauer' }, 82: { label: 'Heftige Schauer', icon: 'schauer' },
  85: { label: 'Schneeschauer', icon: 'schnee' }, 86: { label: 'Starke Schneeschauer', icon: 'schnee' },
  95: { label: 'Gewitter', icon: 'gewitter' }, 96: { label: 'Gewitter mit Hagel', icon: 'gewitter' }, 99: { label: 'Schweres Gewitter', icon: 'gewitter' },
};
export const wmo = (code: number) => WMO[code] ?? { label: 'Unbekannt', icon: 'wolke' as const };

export interface Place { name: string; detail: string; lat: number; lon: number; tz: string }
/** Ortssuche über die Geocoding-Schnittstelle von Open-Meteo (Name oder Postleitzahl, kein Schlüssel nötig). */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const p = new URLSearchParams({ name: query.trim(), count: '8', language: 'de', format: 'json' });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${p}`, { signal });
  if (!res.ok) throw new Error(`Ortssuche ${res.status}`);
  const j = await res.json();
  const list: { name?: string; admin1?: string; admin2?: string; country?: string; latitude?: number; longitude?: number; timezone?: string }[] = Array.isArray(j?.results) ? j.results : [];
  return list.filter((r) => typeof r.name === 'string' && typeof r.latitude === 'number' && typeof r.longitude === 'number')
    .map((r) => ({ name: r.name!, detail: [r.admin2 !== r.name ? r.admin2 : undefined, r.admin1, r.country].filter(Boolean).join(', '), lat: Math.round(r.latitude! * 10000) / 10000, lon: Math.round(r.longitude! * 10000) / 10000, tz: r.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone }));
}

export async function fetchWeather(loc: Settings['location'], signal?: AbortSignal): Promise<WeatherData> {
  const p = new URLSearchParams({
    latitude: String(loc.lat), longitude: String(loc.lon), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || loc.tz, forecast_days: '7', // Zeiten immer in der Zeitzone des Geräts, passend zur Uhr der App
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,surface_pressure',
    hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,cloud_cover,shortwave_radiation,is_day,wind_speed_10m,wind_gusts_10m,surface_pressure,uv_index',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,daylight_duration,precipitation_sum,shortwave_radiation_sum,wind_gusts_10m_max,uv_index_max',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${p}`, { signal });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  const j = await res.json();
  const hourly: WeatherHour[] = j.hourly.time.map((t: string, i: number) => ({
    time: t, temp: j.hourly.temperature_2m[i], code: j.hourly.weather_code[i], precipProb: j.hourly.precipitation_probability[i] ?? 0,
    precip: j.hourly.precipitation[i] ?? 0, cloud: j.hourly.cloud_cover[i] ?? 0, ghi: j.hourly.shortwave_radiation[i] ?? 0,
    isDay: j.hourly.is_day[i] === 1, wind: j.hourly.wind_speed_10m[i] ?? 0, gust: j.hourly.wind_gusts_10m?.[i] ?? undefined, pressure: j.hourly.surface_pressure?.[i] ?? undefined, uv: j.hourly.uv_index?.[i] ?? undefined,
  }));
  const daily: WeatherDay[] = j.daily.time.map((d: string, i: number) => ({
    date: d, code: j.daily.weather_code[i], tmax: j.daily.temperature_2m_max[i], tmin: j.daily.temperature_2m_min[i],
    sunrise: j.daily.sunrise[i], sunset: j.daily.sunset[i], daylightSec: j.daily.daylight_duration[i], precipSum: j.daily.precipitation_sum[i] ?? 0,
    ghiSum: j.daily.shortwave_radiation_sum[i] ?? 0, gustMax: j.daily.wind_gusts_10m_max?.[i] ?? undefined, uvMax: j.daily.uv_index_max?.[i] ?? undefined,
  }));
  return {
    current: {
      time: j.current.time, temp: j.current.temperature_2m, feels: j.current.apparent_temperature, humidity: j.current.relative_humidity_2m,
      precip: j.current.precipitation, code: j.current.weather_code, cloud: j.current.cloud_cover, wind: j.current.wind_speed_10m, isDay: j.current.is_day === 1, pressure: j.current.surface_pressure ?? undefined, uv: hourly.find((h) => h.time.slice(0, 13) === String(j.current.time).slice(0, 13))?.uv,
    },
    hourly, daily,
  };
}

/** Simplified PV power estimate in kW from global horizontal irradiance (W/m²). Clearly an estimate. */
export const pvKw = (ghi: number, kwp: number) => Math.max(0, (kwp * ghi) / 1000 * 0.82);
/** Quality of a single hour per plan rule: ≥0.5 kW and ≤60 % rain → geeignet; ≥1 kW gut; ≥2 kW sehr gut. */
export function hourQuality(h: WeatherHour, kwp: number): 'sehr gut' | 'gut' | 'geeignet' | null {
  const kw = pvKw(h.ghi, kwp); if (kw < 0.5 || h.precipProb > 60) return null; return kw >= 2 ? 'sehr gut' : kw >= 1 ? 'gut' : 'geeignet';
}
/** Best n suitable hours in the next 48 h, by PV power. */
export function bestHours(hourly: WeatherHour[], kwp: number, n = 8, from = new Date()): (WeatherHour & { kw: number; q: 'sehr gut' | 'gut' | 'geeignet' })[] {
  const t0 = from.getTime() - 3600_000;
  return hourly.filter((h) => { const t = new Date(h.time).getTime(); return t >= t0 && t <= t0 + 49 * 3600_000; }).map((h) => ({ ...h, kw: pvKw(h.ghi, kwp), q: hourQuality(h, kwp) })).filter((h): h is WeatherHour & { kw: number; q: 'sehr gut' | 'gut' | 'geeignet' } => !!h.q).sort((a, b) => b.kw - a.kw).slice(0, n);
}

export interface Window { start: string; end: string; kwh: number; hours: number }

/** Best contiguous window of `durationH` hours (within next 48 h) by PV energy. */
export function bestPvWindow(hourly: WeatherHour[], kwp: number, durationH: number, from = new Date()): Window | null {
  const start = hourly.findIndex((h) => new Date(h.time).getTime() >= from.getTime() - 3600_000);
  if (start < 0) return null;
  const slice = hourly.slice(start, start + 48);
  let best: Window | null = null;
  for (let i = 0; i + durationH <= slice.length; i++) {
    const seg = slice.slice(i, i + durationH);
    const kwh = seg.reduce((s, h) => s + pvKw(h.ghi, kwp), 0);
    if (!best || kwh > best.kwh) best = { start: seg[0].time, end: seg[seg.length - 1].time, kwh, hours: durationH };
  }
  return best && best.kwh > 0.2 ? best : null;
}

/** First dry, calm daylight window of at least `minH` hours (for outdoor work). */
export function dryWindow(hourly: WeatherHour[], minH = 3, from = new Date()): Window | null {
  const start = hourly.findIndex((h) => new Date(h.time).getTime() >= from.getTime());
  let run: WeatherHour[] = [];
  for (const h of hourly.slice(Math.max(0, start))) {
    const ok = h.isDay && h.precipProb < 25 && h.precip < 0.1 && h.wind < 25;
    if (ok) run.push(h);
    else {
      if (run.length >= minH) break;
      run = [];
    }
  }
  if (run.length < minH) return null;
  return { start: run[0].time, end: run[run.length - 1].time, kwh: 0, hours: run.length };
}

export function todayDaily(data: WeatherData | undefined, now = new Date()): WeatherDay | undefined {
  if (!data) return undefined;
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return data.daily.find((d) => d.date === key) ?? data.daily[0];
}

export interface WeatherAlert { level: 'warn' | 'info'; title: string; detail: string }
/** Simple rule-based alerts from the forecast (not an official warning service). */
export function weatherAlerts(data: WeatherData, from = new Date()): WeatherAlert[] {
  const out: WeatherAlert[] = [];
  const h = data.hourly.filter((x) => new Date(x.time).getTime() >= from.getTime());
  for (let i = 0; i + 3 <= h.length; i++) { const sum = h[i].precip + h[i + 1].precip + h[i + 2].precip; if (sum >= 5) { out.push({ level: 'warn', title: 'Starkregen möglich', detail: `≈ ${sum.toFixed(1)} mm in 3 h ab ${new Date(h[i].time).toLocaleString('de-AT', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` }); break; } }
  const gust = h.find((x) => (x.gust ?? 0) >= 50); if (gust) out.push({ level: 'warn', title: 'Sturmböen', detail: `bis ${Math.round(gust.gust!)} km/h ${new Date(gust.time).toLocaleString('de-AT', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}` });
  const frost = data.daily.find((d) => d.tmin <= 0); if (frost) out.push({ level: 'info', title: 'Frost', detail: `${frost.tmin.toFixed(0)} °C am ${new Date(frost.date).toLocaleDateString('de-AT', { weekday: 'long' })} – Filament trocken lagern` });
  const uv = data.daily.find((d) => (d.uvMax ?? 0) >= 6); if (uv) out.push({ level: 'info', title: 'Hoher UV-Index', detail: `UV ${uv.uvMax!.toFixed(0)} am ${new Date(uv.date).toLocaleDateString('de-AT', { weekday: 'long' })} – ASA für Außenteile` });
  return out;
}
/** Comfort score 0–100 from temperature and humidity (for the "Wohlfühlfaktor" chip). */
export function comfort(temp: number, humidity: number): number {
  const t = 100 - Math.min(100, Math.abs(temp - 21) * 6); const hum = 100 - Math.min(100, Math.abs(humidity - 45) * 1.6);
  return Math.round(t * 0.65 + hum * 0.35);
}
