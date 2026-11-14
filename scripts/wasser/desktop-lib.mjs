// The REAL app at a DESKTOP size - the desktop sibling of app() in lib.mjs.
// (The desktop has no harness page: its stage - landscape, islands, panels - cannot be mocked. The tools use the built app.)
// Needs the preview server:  npm run build && npm run preview   (http://localhost:4173; another address: WASSER_APP=...)
//
//   import { openDesktop } from './desktop-lib.mjs'
//   const d = await openDesktop({ look: 'auto', format: '2000', ton: 'klar', zeit: 'nacht' })
//   await d.go('heute'); await d.shot('/abs/out.png'); await d.sheet('einstellungen'); await d.closeSheet(); await d.close()
//
// Options
//   look     'auto' (default) = the look the app has built in, or - in a stage without one - the template injected;
//            'eingebaut' = the app as it is built; 'vorlage' | a folder | 'git:<rev>' = that copy of the template, injected or IN
//            PLACE OF the built-in copies; '' = no look (a built-in one is taken out). The rules: head of lib.mjs.
//   format   '2000' = 2000 x 993 (the owner's screen), '1920' = 1920 x 1080, or 'WxH'
//   ton      '' / 'dunkel' | 'klar' | 'auto'. With a built-in look the tone is set through the app's own setting "Erscheinungsbild"
//            (stored state, one reload); 'auto' leaves the setting alone: the hour decides
//   zeit     'morgen' | 'tag' | 'abend' | 'nacht' or an ISO time: the app's clock. Only Date is shifted; timers and animations run in
//            real time. The hour chooses the landscape.   uhr  'steht': the clock does not run on from there (two runs show the same minute)
//   wetter   'klar' | 'bedeckt' | 'regen' | 'nebel' | 'schnee': a made-up answer of the weather service, so panels are full and two
//            runs show the same; 'aus' = the request fails
//   engine   'chromium' | 'webkit' | 'firefox'      reduced  true = prefers-reduced-motion      video  folder for a recording
//   start    options for Wasser.start() on top of Wasser.DESKTOP (e.g. { sleep: 0, webgl: false })
//   app      another address than WASSER_APP / :4173        scale  device pixels per CSS pixel (1)
// In a stage WITHOUT a built-in look the look goes in the way scripts/wasser/einspielen.js describes: attribute on the stage,
// start, the app's own theme held at "dunkel" (the look has light text in both tones).
// Returned: page, errors, look { mode, text ... }, format { w, h }, go(world), project(), sheet(name), closeSheet(), search(text),
//           closeSearch(), toast(), bereich('echt'), park(), shot(file, clip), still(), close().
// Worlds: start heute projekte druck material wetter archiv; a project's inner world: project().
// Sheets: einstellungen konto hinweise bereich projekt projektBearbeiten geraet geraetForm geraete rolle druck
import fs from 'fs';
import { pw, APP, abs, ZEITEN, zeitOf, lookBefore, lookAfter, setTheme, tonOf, wetterRoute } from './lib.mjs';
export { ZEITEN };

export const FORMATE = { '2000': [2000, 993], '1920': [1920, 1080] };
export const WELTEN = ['start', 'heute', 'projekte', 'innen', 'druck', 'material', 'wetter', 'archiv'];   // 'innen' = the inner world of a project
export async function openDesktop({ look = 'auto', format = '2000', ton = '', zeit = 'nacht', uhr = 'laeuft', wetter = 'klar', engine = 'chromium', reduced = false, video = null, start = {}, scale = 1, browser = null, app = APP } = {}) {
  const [w, h] = FORMATE[format] ?? String(format).split('x').map(Number); if (!(w > 0 && h > 0)) throw new Error('format: ' + format);
  const t0 = zeitOf(zeit); ton = ton || 'dunkel';
  const own = !browser; const b = browser || await pw[engine].launch();
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: scale, timezoneId: 'Europe/Vienna', locale: 'de-AT', reducedMotion: reduced ? 'reduce' : 'no-preference', ...(video ? { recordVideo: { dir: video, size: { width: w, height: h } } } : {}) });
  if (uhr !== 'steht') await c.addInitScript((t) => { const R = Date, off = t - R.now(); class D extends R { constructor(...a) { if (a.length) super(...a); else super(R.now() + off); } static now() { return R.now() + off; } } window.Date = D; }, t0);
  const page = await c.newPage(); const errors = [];
  if (uhr === 'steht') await page.clock.setFixedTime(new Date(t0));
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 300))); page.on('console', (m) => { if (m.type() === 'error' && !/open-meteo|Failed to load resource|ERR_|net::|favicon/i.test(m.text())) errors.push('console: ' + m.text().slice(0, 300)); });
  await wetterRoute(page, wetter, t0);

  const rd = (f) => fs.readFileSync(abs(f), 'utf8');
  const ready = async () => { await page.waitForSelector('.stage[data-scene-ready="true"]', { timeout: 20000 }); await page.evaluate(() => document.fonts.ready); };
  const load = async (fn) => { await fn().catch((e) => { throw new Error(`the app is not reachable at ${app} (npm run build && npm run preview): ${String(e).split('\n')[0]}`); }); await ready(); };
  let st = await lookBefore(page, look);
  await load(() => page.goto(`${app}/#/start`, { waitUntil: 'networkidle' }));
  let got = await lookAfter(page, st, '.stage');
  if (!got) { st = await lookBefore(page, 'vorlage'); await load(() => page.reload({ waitUntil: 'networkidle' })); got = await lookAfter(page, st, '.stage'); }   // 'auto' in a stage without a look: the template
  if (got.mode === 'alt') throw new Error('look: an earlier look (look.css, look.js) is a look of the phone only');
  // look and tone after every (re)load of the page
  const inject = async () => {
    if (got.builtIn) {                                             // the app runs the look and chooses the tone: tell it through its own setting
      if (await setTheme(page, ton)) await ready();
      if (ton !== 'auto' && await tonOf(page) !== ton) throw new Error(`tone: the app was told "${ton}" through its setting and shows "${await tonOf(page)}". Nothing was measured.`);
      if (Object.keys(start).length) await page.evaluate((o) => window.Wasser.start({ ...window.Wasser.DESKTOP, ...o }), start);   // (a second start() replaces the app's own instance)
    } else if (got.injected) {
      await page.evaluate((o) => { window.__wasserVorschau = o; }, { ton, start });   // ('auto': the tone follows the app's setting "Erscheinungsbild", as in "zeigen")
      await page.addScriptTag({ content: rd('scripts/wasser/einspielen.js') });
    }
  };
  await inject(); await page.waitForTimeout(900);

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
    throw new Error('unknown sheet ' + name + ' (desktop: einstellungen konto hinweise bereich projekt projektBearbeiten geraet geraetForm geraete rolle druck)');
  };
  const search = async (text = '') => { await page.keyboard.press('Control+k'); await page.waitForSelector('.cmd', { timeout: 4000 }); if (text) await page.keyboard.type(text, { delay: 40 }); await page.waitForTimeout(500); };
  const closeSearch = async () => { if (await page.locator('.cmd').count()) { await page.keyboard.press('Escape'); await page.waitForTimeout(350); } };
  // a real toast with "Rückgängig": a queued print is taken out of the queue in the world "druck" (the app asks with confirm())
  const toast = async () => { await go('druck'); page.once('dialog', (d) => d.accept()); await click(page.locator('.panel [aria-label="Aus Warteschlange entfernen"]'), 500); await page.waitForSelector('.toast', { timeout: 4000 }); };
  // the other workspace ('echt' = Meine Werkstatt, starts completely empty); the page reloads, look and tone are set again
  const bereich = async (ws) => { await page.evaluate((x) => { localStorage.setItem('3druckwerkbank:bereich', x); location.hash = '#/start'; }, ws); await load(() => page.reload({ waitUntil: 'networkidle' })); await inject(); await page.waitForTimeout(900); };
  const welt = async (name) => (name === 'innen' ? project() : go(name));
  const close = async () => { const v = video ? page.video() : null; await c.close(); if (own) await b.close(); return v ? v.path() : null; };
  return { page, context: c, browser: b, errors, look: got, ton, format: { w, h }, go, welt, project, sheet, closeSheet, search, closeSearch, toast, bereich, park, still, shot, click, close };
}
