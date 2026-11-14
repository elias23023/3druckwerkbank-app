// node scripts/optimize-appicon.mjs [--maskable-scale 0.85] [--screenshots http://localhost:4173]
// App symbol for the installable app (PWA): assets-src/app-symbol.png -> public/icons/
//   icon-192.png, icon-512.png                    purpose "any" (rounded corners, transparent outside)
//   icon-maskable-192.png, icon-maskable-512.png  purpose "maskable" (full bleed, the picture scaled to 85 %, its edge pixels continued to the border)
//   apple-touch-icon.png (180, no transparency), favicon-32.png, favicon-16.png
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
for (const size of [32, 16]) await write(await any(size), `favicon-${size}.png`);

const shotBase = opt('--screenshots');
if (shotBase) {
  // screenshots of the running app (demo workshop) for the richer install dialog of Chromium; fixed time of day so the picture is repeatable
  const { chromium } = (await import('/opt/node-tools/node_modules/playwright/index.js')).default;
  const browser = await chromium.launch();
  for (const [name, viewport, dpr] of [['screenshot-breit.jpg', { width: 1920, height: 1080 }, 1], ['screenshot-schmal.jpg', { width: 390, height: 844 }, 2]]) {
    const ctx = await browser.newContext({ viewport, deviceScaleFactor: dpr, isMobile: dpr > 1, hasTouch: dpr > 1, timezoneId: 'Europe/Vienna', locale: 'de-AT', serviceWorkers: 'block' });
    const page = await ctx.newPage();
    await page.clock.install({ time: new Date('2026-11-14T11:20:00+01:00') });
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
