// The REAL app at a DESKTOP size with the template injected once - the desktop sibling of app() in lib.mjs.
// (The desktop has no harness page: its stage - landscape, islands, panels - cannot be mocked. The tools use the built app.)
// Needs the preview server:  npm run build && npm run preview   (http://localhost:4173; another address: WASSER_APP=...)
//
//   import { openDesktop } from './desktop-lib.mjs'
//   const d = await openDesktop({ look: 'vorlage', format: '2000', ton: 'klar', zeit: 'nacht' })
//   await d.go('heute'); await d.shot('/abs/out.png'); await d.sheet('einstellungen'); await d.closeSheet(); await d.close()
//
// Options
//   look     'vorlage' = the template, '' = no look (the app as it is today), or a folder with another copy of the template
//   format   '2000' = 2000 x 993 (the owner's screen), '1920' = 1920 x 1080, or 'WxH'
//   ton      '' / 'dunkel' | 'klar'
//   zeit     'morgen' | 'tag' | 'abend' | 'nacht' or an ISO time: the app's clock. Only Date is shifted; timers and animations run in
//            real time. The hour chooses the landscape (and, without the look, the app's own light or dark theme).
//   wetter   'klar' | 'bedeckt' | 'regen' | 'nebel' | 'schnee': a made-up answer of the weather service, so panels are full and two
//            runs show the same; 'aus' = the request fails
//   engine   'chromium' | 'webkit' | 'firefox'      reduced  true = prefers-reduced-motion      video  folder for a recording
//   start    options for Wasser.start() on top of Wasser.DESKTOP (e.g. { sleep: 0, webgl: false })
// The look goes in the way scripts/wasser/einspielen.js describes: attribute on the stage, the three stylesheets in one piece,
// the script, start; the app's own theme is held at "dunkel" (the look has light text in both tones).
// Returned: page, errors, format { w, h }, go(world), project(), sheet(name), closeSheet(), search(text), closeSearch(), toast(),
//           bereich('echt'), park(), shot(file, clip), still(), close().
// Worlds: start heute projekte druck material wetter archiv; a project's inner world: project().
// Sheets: einstellungen konto hinweise bereich projekt projektBearbeiten geraet geraetForm geraete rolle druck
import fs from 'fs';
import { pw, APP, abs, lookDir, isTemplate } from './lib.mjs';

export const FORMATE = { '2000': [2000, 993], '1920': [1920, 1080] };
// 13 Nov 2026 in Vienna: sunrise 06:57, sunset 16:18 (what the made-up weather says as well)
export const ZEITEN = { morgen: '2026-11-13T08:40:00+01:00', tag: '2026-11-13T12:40:00+01:00', abend: '2026-11-13T15:50:00+01:00', nacht: '2026-11-13T21:30:00+01:00' };
export const WELTEN = ['start', 'heute', 'projekte', 'innen', 'druck', 'material', 'wetter', 'archiv'];   // 'innen' = the inner world of a project
const CODE = { klar: 1, bedeckt: 3, regen: 61, nebel: 45, schnee: 73 };

// a made-up answer of api.open-meteo.com/v1/forecast for seven days from the app's "today" (local times, Europe/Vienna)
function wetterJson(now, kind) {
  const loc = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Vienna', dateStyle: 'short', timeStyle: 'short' }).format(now);
  const [d0, hm] = loc.split(' '); const [Y, M, D] = d0.split('-').map(Number); const hNow = Number(hm.slice(0, 2));
  const day = (i) => new Date(Date.UTC(Y, M - 1, D + i)).toISOString().slice(0, 10);
  const code = CODE[kind] ?? 1, grey = kind !== 'klar', wet = kind === 'regen' || kind === 'schnee';
  const H = { time: [], temperature_2m: [], precipitation_probability: [], precipitation: [], weather_code: [], cloud_cover: [], shortwave_radiation: [], is_day: [], wind_speed_10m: [], wind_gusts_10m: [], surface_pressure: [], uv_index: [] };
  for (let i = 0; i < 7; i++) for (let h = 0; h < 24; h++) {
    const isDay = h >= 7 && h <= 16, sun = isDay ? Math.sin(Math.PI * (h - 6.95) / 9.35) : 0;
    H.time.push(`${day(i)}T${String(h).padStart(2, '0')}:00`);
    H.temperature_2m.push(Math.round((6 + 4.5 * Math.sin((h - 9) / 24 * 2 * Math.PI) - i * .4 + (kind === 'schnee' ? -7 : 0)) * 10) / 10);
    H.precipitation_probability.push(wet ? 85 : grey ? 25 : 5); H.precipitation.push(wet ? .6 : 0);
    H.weather_code.push(i === 0 ? code : [code, 2, 3, 61, 1, 2][i - 1]); H.cloud_cover.push(grey ? 96 : 14);
    H.shortwave_radiation.push(Math.round(Math.max(0, sun) * (grey ? 110 : 430))); H.is_day.push(isDay ? 1 : 0);
    H.wind_speed_10m.push(9 + (h % 5)); H.wind_gusts_10m.push(21 + (h % 7)); H.surface_pressure.push(1016 - i); H.uv_index.push(Math.round(Math.max(0, sun) * (grey ? .6 : 1.9) * 10) / 10);
  }
  const days = [0, 1, 2, 3, 4, 5, 6];
  return {
    current: { time: `${d0}T${hm.slice(0, 2)}:${String(Math.floor(Number(hm.slice(3)) / 15) * 15).padStart(2, '0')}`, temperature_2m: H.temperature_2m[hNow], relative_humidity_2m: wet ? 91 : 68, apparent_temperature: H.temperature_2m[hNow] - 2, is_day: H.is_day[hNow], precipitation: wet ? .6 : 0, weather_code: code, cloud_cover: grey ? 96 : 14, wind_speed_10m: 11, surface_pressure: 1016 },
    hourly: H,
    daily: { time: days.map(day), weather_code: days.map((i) => (i === 0 ? code : [code, 2, 3, 61, 1, 2][i - 1])), temperature_2m_max: days.map((i) => 10.5 - i * .4), temperature_2m_min: days.map((i) => 1.5 - i * .4), sunrise: days.map((i) => `${day(i)}T06:57`), sunset: days.map((i) => `${day(i)}T16:18`), daylight_duration: days.map(() => 33660), precipitation_sum: days.map((i) => (wet && i === 0 ? 7.2 : i === 4 ? 3.1 : 0)), shortwave_radiation_sum: days.map(() => (grey ? 1.9 : 6.8)), wind_gusts_10m_max: days.map((i) => 27 + i), uv_index_max: days.map(() => (grey ? .6 : 1.9)) },
  };
}

export async function openDesktop({ look = 'vorlage', format = '2000', ton = '', zeit = 'nacht', wetter = 'klar', engine = 'chromium', reduced = false, video = null, start = {}, scale = 1, browser = null } = {}) {
  const [w, h] = FORMATE[format] ?? String(format).split('x').map(Number);
  const t0 = +new Date(ZEITEN[zeit] ?? zeit); if (!(t0 > 0)) throw new Error('zeit: ' + zeit);
  const own = !browser; const b = browser || await pw[engine].launch();
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, timezoneId: 'Europe/Vienna', locale: 'de-AT', reducedMotion: reduced ? 'reduce' : 'no-preference', ...(video ? { recordVideo: { dir: video, size: { width: w, height: h } } } : {}) });
  await c.addInitScript((t) => { const R = Date, off = t - R.now(); class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } } window.Date = D; }, t0);
  const page = await c.newPage(); const errors = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300))); page.on('console', (m) => { if (m.type() === 'error' && !/open-meteo|Failed to load resource|ERR_|net::|favicon/i.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  if (wetter === 'aus') await page.route('**/api.open-meteo.com/**', (r) => r.abort());
  else await page.route('**/api.open-meteo.com/v1/forecast**', (r) => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(wetterJson(new Date(t0), wetter)) }));

  const rd = (f) => fs.readFileSync(abs(f), 'utf8');
  const inject = async () => {
    if (!look) return;
    if (!isTemplate(look)) throw new Error('look: not a copy of the template (kern.css is missing): ' + look);
    const dir = lookDir(look);
    await page.evaluate((o) => { window.__wasserVorschau = o; }, { ton: ton && ton !== 'dunkel' ? ton : 'dunkel', start });
    await page.addStyleTag({ content: ['kern.css', 'mobil.css', 'desktop.css'].map((f) => rd(`${dir}/${f}`)).join('\n') });
    await page.addScriptTag({ content: rd(`${dir}/wasser.js`) });
    await page.addScriptTag({ content: rd('scripts/wasser/einspielen.js') });
  };
  const ready = async () => { await page.waitForSelector('.stage[data-scene-ready="true"]', { timeout: 20000 }); await page.evaluate(() => document.fonts.ready); };
  await page.goto(`${APP}/#/start`, { waitUntil: 'networkidle' }).catch((e) => { throw new Error(`the app is not reachable at ${APP} (npm run build && npm run preview): ${String(e).split('\n')[0]}`); });
  await ready(); await inject(); await page.waitForTimeout(900);

  // Playwright scrolls what it clicks "into view", and the stage can be scrolled by 40 px (the landscape is drawn 4 % larger than
  // the screen): after a click everything may stand 40 px to the left. No person can scroll it; the tools put it back.
  const still = () => page.evaluate(() => { const s = document.querySelector('.stage'); if (s) { s.scrollLeft = 0; s.scrollTop = 0; } });
  // the pointer goes to the lower left corner (nothing hovers there) and the stage is told "pointer in the middle": no parallax shift in a still
  const park = async () => { await page.mouse.move(3, h - 3); await page.waitForTimeout(80); await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointermove', { clientX: innerWidth / 2, clientY: innerHeight / 2 }))); await still(); };   // (the wait: WebKit delivers the real move late, after the made-up one)
  const go = async (world, wait = 1500) => { await page.evaluate((x) => { location.hash = x; }, world.startsWith('#') ? world : `#/${world}`); await page.waitForTimeout(wait); await still(); };
  const shot = async (file, clip) => { await park(); await page.waitForTimeout(750); await page.screenshot({ path: file, ...(clip ? { clip } : {}) }); };   // (islands, panels and the landscape ease for up to 2.5 s; a still waits for them)
  const click = async (loc, wait = 800) => { await loc.first().click({ timeout: 5000 }); await page.waitForTimeout(wait); await still(); };
  const project = async () => { await go('projekte'); await click(page.locator('.project-hero .btn--primary'), 1600); };   // "Projekt öffnen" of the project in the middle
  const closeSheet = async () => { const x = page.locator('.sheet .sheet__head button[aria-label="Schließen"]'); if (await x.count()) { await x.click(); await page.waitForTimeout(450); await still(); } };
  const sheet = async (name) => {
    const at = async (world, loc) => { if (world) await go(world); await click(loc); await page.waitForSelector('.sheet', { timeout: 4000 }); };
    if (name === 'einstellungen') return at(null, page.locator('.topbar [aria-label="Einstellungen"]'));
    if (name === 'konto') return at(null, page.locator('.topbar .topbar__konto'));
    if (name === 'hinweise') return at(null, page.locator('.topbar [aria-label^="Hinweise"]'));
    if (name === 'bereich') return at(null, page.locator('.topbar .ws-chip'));
    if (name === 'projekt') return at('projekte', page.locator('.project-hero .btn', { hasText: 'Neu' }));                 // form in steps: fields, tiles, island library
    if (name === 'projektBearbeiten') return at('projekte', page.locator('.project-hero .btn', { hasText: 'Bearbeiten' })); // the whole form on one long sheet
    if (name === 'geraet') return at('druck', page.locator('.panel-col--left .item--click'));                                // detail of a printer
    if (name === 'geraetForm') return at('druck', page.locator('.panel [aria-label="Gerät hinzufügen"]'));
    if (name === 'geraete') return at('druck', page.locator('.panel__head .btn', { hasText: 'verwalten' }));                  // list with tabs
    if (name === 'rolle') return at('material', page.locator('.panel .item--click'));                                         // a filament roll (form)
    if (name === 'druck') return at('heute', page.locator('.panel-col--left .item--click'));                                  // a running print
    throw new Error('unknown sheet ' + name);
  };
  const search = async (text = '') => { await page.keyboard.press('Control+k'); await page.waitForSelector('.cmd', { timeout: 4000 }); if (text) await page.keyboard.type(text, { delay: 40 }); await page.waitForTimeout(500); };
  const closeSearch = async () => { if (await page.locator('.cmd').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(350); } };
  // a real toast with "Rückgängig": a queued print is taken out of the queue in the world "druck" (the app asks with confirm())
  const toast = async () => { await go('druck'); page.once('dialog', (d) => d.accept()); await click(page.locator('.panel [aria-label="Aus Warteschlange entfernen"]'), 500); await page.waitForSelector('.toast', { timeout: 4000 }); };
  // the other workspace ('echt' = Meine Werkstatt, starts completely empty); the page reloads, the look goes in again
  const bereich = async (ws) => { await page.evaluate((x) => { localStorage.setItem('3druckwerkbank:bereich', x); location.hash = '#/start'; location.reload(); }, ws); await page.waitForLoadState('networkidle'); await ready(); await inject(); await page.waitForTimeout(900); };
  const welt = async (name) => (name === 'innen' ? project() : go(name));
  const close = async () => { const v = video ? page.video() : null; await c.close(); if (own) await b.close(); return v ? v.path() : null; };
  return { page, context: c, browser: b, errors, format: { w, h }, go, welt, project, sheet, closeSheet, search, closeSearch, toast, bereich, park, still, shot, click, close };
}
