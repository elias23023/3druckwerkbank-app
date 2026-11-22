// node scripts/optimize-appicon.mjs [--maskable-scale 0.85] [--screenshots http://localhost:4173]
// App symbol for the installable app (PWA): assets-src/app-symbol.png -> public/icons/
//   icon-192.png, icon-512.png                    purpose "any" (rounded corners, transparent outside)
//   icon-maskable-192.png, icon-maskable-512.png  purpose "maskable" (full bleed, the picture scaled to 85 %, its edge pixels continued to the border)
//   apple-touch-icon.png (180, no transparency)
//   favicon-32.png, favicon-16.png                the motif cut closer (SMALL), so printer and island stay readable in a browser tab
//   src/assets/logo-96.webp                       the mark of the app in the interface (Logo in src/ui/TopBar.tsx): same closer cut, rounded tile;
//                                                 kept under 4 kB so Vite inlines it into the script (it then also shows without network)
// Input: square PNG, at least 1024 px, full-bleed background, motif in the centre (made by the user's image AI).
// Without the input file the script renders a PLACEHOLDER: the hexagon logo of the app (Logo in src/ui/TopBar.tsx) on the dark ground of the app.
// --screenshots <base> additionally takes the two screenshots for the install dialog from a running build (demo workshop).
import fs from 'node:fs';
import sharp from 'sharp';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const INPUT = 'assets-src/app-symbol.png';
const OUT = 'public/icons';
const BG = '#0b1220'; // same as theme_color / background_color in public/manifest.webmanifest
const MASKABLE_SCALE = Number(opt('--maskable-scale') ?? 0.85); // share of the canvas the picture keeps in the maskable icons
const S = 1024;
// closer cut for the small sizes: share of the picture kept and its centre (the motif of the symbol of 15 Nov 2026 spans about 13–84 % × 13–90 %)
const SMALL = { side: 0.8, cx: 0.485, cy: 0.515 };
fs.mkdirSync(OUT, { recursive: true });

/** The hexagon logo (same drawing as Logo in src/ui/TopBar.tsx), centred on the dark ground; scale = share of the canvas. */
const placeholder = (scale) => {
  const size = S * scale; const off = (S - size) / 2; const k = size / 64;
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs><linearGradient id="lg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#9fd0ff"/><stop offset="1" stop-color="#3b7fd6"/></linearGradient></defs>
  <rect width="${S}" height="${S}" fill="${BG}"/>
  <g transform="translate(${off} ${off}) scale(${k})">
    <path d="M32 4 58 18v28L32 60 6 46V18z" fill="url(#lg)" opacity=".9"/>
    <path d="M32 12 50 22v20L32 52 14 42V22z" fill="none" stroke="#fff" stroke-width="2.5" opacity=".9"/>
    <path d="M32 12v40M14 22l18 10 18-10" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>
  </g></svg>`)).png().toBuffer();
};

let base; let maskable; let source;
if (fs.existsSync(INPUT)) {
  const meta = await sharp(INPUT).metadata();
  if (Math.abs(meta.width - meta.height) > 2) { console.error(`${INPUT} ist nicht quadratisch (${meta.width}×${meta.height}).`); process.exit(1); }
  if (meta.width < 1024) { console.error(`${INPUT} ist zu klein (${meta.width} px, mindestens 1024).`); process.exit(1); }
  source = `${INPUT} (${meta.width}×${meta.height})`;
  // transparent parts (if any) get the dark ground of the app
  base = await sharp(INPUT).resize(S, S, { fit: 'cover' }).flatten({ background: BG }).png().toBuffer();
  // maskable: launchers cut a circle or a rounded square out of the image. Shrink the picture and continue its own edge pixels outwards (seamless on plain and gradient grounds).
  const inner = Math.round(S * MASKABLE_SCALE);
  if (inner >= S) maskable = base;
  else {
    const pad = Math.round((S - inner) / 2);
    maskable = await sharp(await sharp(base).resize(inner, inner).toBuffer()).extend({ top: pad, bottom: S - inner - pad, left: pad, right: S - inner - pad, extendWith: 'copy' }).png().toBuffer();
  }
} else {
  source = `PLATZHALTER (Sechseck-Logo der App, ${INPUT} fehlt)`;
  base = await placeholder(0.74);
  maskable = await placeholder(0.56); // the hexagon stays inside the safe circle (radius 40 %)
}

const rounded = (size) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#fff"/></svg>`);
const written = [];
const write = async (img, name) => { const info = await img.png({ compressionLevel: 9 }).toFile(`${OUT}/${name}`); written.push(`${OUT}/${name}  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(1)} kB`); };
const any = async (size) => sharp(await sharp(base).resize(size, size).ensureAlpha().toBuffer()).composite([{ input: rounded(size), blend: 'dest-in' }]);

for (const size of [192, 512]) {
  await write(await any(size), `icon-${size}.png`);
  await write(sharp(maskable).resize(size, size).removeAlpha(), `icon-maskable-${size}.png`);
}
await write(sharp(base).resize(180, 180).removeAlpha(), 'apple-touch-icon.png'); // iOS rounds the corners itself and shows transparency as black
const side = Math.round(S * SMALL.side); const cut = { left: Math.max(0, Math.min(S - side, Math.round(S * SMALL.cx - side / 2))), top: Math.max(0, Math.min(S - side, Math.round(S * SMALL.cy - side / 2))), width: side, height: side };
const small = fs.existsSync(INPUT) ? await sharp(base).extract(cut).png().toBuffer() : base;
const anySmall = async (size) => sharp(await sharp(small).resize(size, size, { kernel: 'lanczos3' }).sharpen({ sigma: 0.6 }).ensureAlpha().toBuffer()).composite([{ input: rounded(size), blend: 'dest-in' }]);
for (const size of [32, 16]) await write(await anySmall(size), `favicon-${size}.png`);
{
  const img = await anySmall(96); let q = 90; let buf;
  do { buf = await img.clone().webp({ quality: q, alphaQuality: 100, effort: 6 }).toBuffer(); q -= 4; } while (buf.length > 4000 && q > 40);
  fs.writeFileSync('src/assets/logo-96.webp', buf); written.push(`src/assets/logo-96.webp  96×96  ${(buf.length / 1024).toFixed(1)} kB (Qualität ${q + 4})`);
}

const shotBase = opt('--screenshots');
if (shotBase) {
  // screenshots of the running app (demo workshop) for the richer install dialog of Chromium; fixed time of day and a fixed
  // answer of the weather service (as meteo in scripts/verify.mjs), so the picture is repeatable and never without weather
  // (Open-Meteo answers 429 at times)
  const DAY = '2026-11-14';
  const meteo = (code) => {
    const days = [...Array(7)].map((_, i) => new Date(Date.parse(`${DAY}T00:00:00Z`) + i * 864e5).toISOString().slice(0, 10));
    const hours = days.flatMap((d) => [...Array(24)].map((_, h) => `${d}T${String(h).padStart(2, '0')}:00`)); const n = (v) => hours.map(() => v); const dd = (v) => days.map(() => v);
    return { current: { time: `${DAY}T11:15`, temperature_2m: 7, relative_humidity_2m: 68, apparent_temperature: 5, is_day: 1, precipitation: 0, weather_code: code, cloud_cover: 20, wind_speed_10m: 8, surface_pressure: 1018 },
      hourly: { time: hours, temperature_2m: n(7), precipitation_probability: n(5), precipitation: n(0), weather_code: n(code), cloud_cover: n(20), shortwave_radiation: hours.map((h) => { const x = +h.slice(11, 13); return x >= 8 && x <= 15 ? 260 : 0; }), is_day: hours.map((h) => { const x = +h.slice(11, 13); return x >= 7 && x < 17 ? 1 : 0; }), wind_speed_10m: n(8), wind_gusts_10m: n(15), surface_pressure: n(1018), uv_index: n(1) },
      daily: { time: days, weather_code: dd(code), temperature_2m_max: dd(9), temperature_2m_min: dd(2), sunrise: days.map((d) => `${d}T07:00`), sunset: days.map((d) => `${d}T16:20`), daylight_duration: dd(33600), precipitation_sum: dd(0), shortwave_radiation_sum: dd(6), wind_gusts_10m_max: dd(20), uv_index_max: dd(1) } };
  };
  const { chromium } = (await import('/opt/node-tools/node_modules/playwright/index.js')).default;
  const browser = await chromium.launch();
  for (const [name, viewport, dpr] of [['screenshot-breit.jpg', { width: 1600, height: 900 }, 1], ['screenshot-schmal.jpg', { width: 390, height: 844 }, 2]]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, isMobile: dpr > 1, hasTouch: dpr > 1, timezoneId: 'Europe/Vienna', locale: 'de-AT', serviceWorkers: 'block' });
    await ctx.route('**/api.open-meteo.com/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(meteo(1)) }));
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date(`${DAY}T11:20:00+01:00`) });
    await page.goto(`${shotBase}/#/start`, { waitUntil: 'networkidle' });
    await page.clock.runFor(3000); await page.waitForTimeout(1500);
    const info = await sharp(await page.screenshot()).jpeg({ quality: 82, mozjpeg: true }).toFile(`${OUT}/${name}`);
    written.push(`${OUT}/${name}  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(1)} kB`);
    await ctx.close();
  }
  await browser.close();
}

console.log(`Quelle: ${source}`);
for (const line of written) console.log(line);
console.log('Fertig. Die Kennung des Builds ändert sich mit den Dateien; der Service Worker lädt die neuen Symbole beim nächsten Build.');
