// The REAL app (vite preview on http://localhost:4173, "Beispiel" workshop with demo data) on a phone-sized screen, with a look injected ONCE.
// The app is a single-page app with hash routes, so the injected look stays alive across screens exactly like a built-in look would
// (React mounts / unmounts everything underneath it).
//   import { openApp } from '<this folder>/real-lib.mjs'
//   const app = await openApp({ look: '/abs/path/to/look-folder' | null, engine: 'chromium' | 'webkit', reduced: false, scale: 2, ton: null | 'klar' })
//   await app.go('#/projekte'); await app.shot('/abs/out.png'); await app.sheet('projekt'); await app.closeSheet(); app.page (Playwright page); app.errors; await app.close()
// For engine 'webkit' run "source <scratchpad>/judge-phone/env.sh" in the same shell command first.
// Routes: #/start #/heute #/projekte #/material #/druck (tab "Mehr") #/wetter #/archiv ; a project: app.project() (opens the first project).
import { createRequire } from 'module'; const require = createRequire(import.meta.url); import fs from 'fs';
const pw = require('/opt/node-tools/node_modules/playwright/index.js');
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
export async function openApp({ look = null, engine = 'chromium', reduced = false, scale = 2, video = null, ton = null } = {}) {
  const rd = (f) => (look && fs.existsSync(`${look}/${f}`) ? fs.readFileSync(`${look}/${f}`, 'utf8') : '');
  const b = await pw[engine].launch();
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale, isMobile: engine !== 'firefox', hasTouch: true, timezoneId: 'Europe/Vienna', locale: 'de-AT', reducedMotion: reduced ? 'reduce' : 'no-preference', ...(engine === 'webkit' ? { userAgent: IPHONE } : {}), ...(video ? { recordVideo: { dir: video, size: { width: 780, height: 1688 } } } : {}) });
  const page = await c.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 300))); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); });
  await page.goto('http://localhost:4173/#/start', { waitUntil: 'networkidle' }); await page.waitForSelector('.m-shell', { timeout: 15000 });
  const defs = rd('defs.html'), css = rd('look.css'), js = rd('look.js');
  if (ton) await page.evaluate((t) => { document.documentElement.dataset.waTon = t; }, ton);   // colour variant, same attribute as base.html?ton=
  if (defs) await page.evaluate((h) => document.body.insertAdjacentHTML('afterbegin', h), defs);
  if (css) await page.addStyleTag({ content: css });
  if (js) await page.addScriptTag({ content: js });
  await page.waitForTimeout(900);
  const go = async (hash, wait = 700) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(wait); };
  const shot = (path) => page.screenshot({ path });
  const closeSheet = async () => { const x = page.locator('.sheet .sheet__head button').last(); if (await x.count()) { await x.click(); await page.waitForTimeout(400); } };
  // sheets and overlays that exist on mobile, opened the way a user opens them
  const sheet = async (name) => {
    const tap = async (hash, loc) => { if (hash) await go(hash); await loc.first().click({ timeout: 4000 }); await page.waitForTimeout(700); };
    if (name === 'konto') return tap(null, page.locator('.m-head [aria-label="Konto"]'));
    if (name === 'einstellungen') return tap(null, page.locator('.m-head [aria-label="Einstellungen"]'));
    if (name === 'hinweise') return tap(null, page.locator('.m-head [aria-label^="Hinweise"]'));
    if (name === 'suche') return tap(null, page.locator('.m-head [aria-label="Suche"]'));
    if (name === 'projekt') return tap('#/projekte', page.locator('.m-main .btn', { hasText: 'Neues Projekt' }));       // form: text fields, selects, pills
    if (name === 'rolle') return tap('#/material', page.locator('.m-main .m-row--click'));                                   // detail of a filament roll
    if (name === 'neuerolle') return tap('#/material', page.locator('.m-main .btn', { hasText: 'Neue Rolle' }));           // form
    if (name === 'geraet') return tap('#/druck', page.locator('.m-main .btn', { hasText: 'Gerät hinzufügen' }));           // form
    if (name === 'toast') return tap('#/heute', page.locator('.m-main .check'));                                             // ticks a task -> toast with "Rückgängig"
    throw new Error('unknown sheet ' + name);
  };
  const project = async () => { await go('#/projekte'); await page.locator('.m-main .m-row--click').first().click(); await page.waitForTimeout(800); };
  const close = async () => { const v = video ? page.video() : null; await c.close(); await b.close(); return v ? v.path() : null; };
  return { page, errors, go, shot, sheet, closeSheet, project, close };
}
