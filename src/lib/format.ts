let counter = 0;
export function id(prefix = 'x'): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
export const nowIso = () => new Date().toISOString();

const dateFmt = new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('de-AT', { hour: '2-digit', minute: '2-digit' });
const dayShort = new Intl.DateTimeFormat('de-AT', { weekday: 'short' });

export const fmtLongDate = (d: Date) => dateFmt.format(d);
export const fmtDate = (iso?: string) => { if (!iso) return '–'; const d = new Date(iso); return Number.isFinite(d.getTime()) ? shortDate.format(d) : '–'; };
export const fmtTime = (iso: string | Date) => timeFmt.format(typeof iso === 'string' ? new Date(iso) : iso);
export const fmtDayShort = (iso: string) => dayShort.format(new Date(iso));
export const fmtNum = (n: number, digits = 0) => new Intl.NumberFormat('de-AT', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
export const fmtEur = (n: number) => new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR' }).format(n);
export const fmtGrams = (g: number) => (g >= 1000 ? `${fmtNum(g / 1000, 2)} kg` : `${fmtNum(g)} g`);
export function fmtDuration(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  if (r === 0) return `${h} h`;
  return `${h} h ${r.toString().padStart(2, '0')} min`;
}
export function relTime(iso: string, now = Date.now()): string {
  const ts = new Date(iso).getTime(); if (!Number.isFinite(ts)) return '–';
  const diff = (ts - now) / 1000;
  const abs = Math.abs(diff);
  const past = diff < 0;
  const f = (n: number, u: string) => (past ? `vor ${n} ${u}` : `in ${n} ${u}`);
  if (abs < 60) return past ? 'gerade eben' : 'gleich';
  if (abs < 3600) return f(Math.round(abs / 60), 'min');
  if (abs < 86400) return f(Math.round(abs / 3600), 'h');
  if (abs < 86400 * 14) { const n = Math.round(abs / 86400); return n === 1 ? (past ? 'gestern' : 'morgen') : f(n, 'Tagen'); }
  return fmtDate(iso);
}
export const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));
export const fold = (s: string) => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
