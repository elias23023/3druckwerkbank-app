// Shared by the tools in scripts/wasser: Playwright, a small file server for the repository, the harness page
// (scripts/wasser/mobil.html), the REAL app with the template injected, and picture helpers (sharp).
// Everything is addressed from the repository root, so the tools run from a fresh clone:  node scripts/wasser/<tool>.mjs
//
//   const s = await session({ engine: 'chromium' | 'webkit' | 'firefox' })
//   const h = await s.harness({ ton: 'klar', scene: 'wetter', nah: false, reduced: false, look: 'vorlage' })   -> h.page, h.errors, h.drops(), h.close()
//   const a = await s.app({ ton: '', reduced: false, look: 'vorlage', zeit: '2026-11-12T17:42:00+01:00' })      -> a.page, a.go(hash), a.sheet(name), a.closeSheet(), a.project(), a.shot(file), a.errors, a.close()
//   await s.close()
// look: 'vorlage' = the template (docs/wasser-look/vorlage), '' = no look (the app as it is), anything else = a folder
//       with an earlier state of the look (look.css + look.js, path from the repository root), e.g. docs/wasser-look/entwurf/nachgebessert
// The real app needs its preview server:  npm run build && npm run preview   (http://localhost:4173; another address: WASSER_APP=...)
// WebKit and Firefox need Playwright's builds of them (on the work machine: source <scratchpad>/judge-phone/env.sh first).
import { createRequire } from 'module'; import fs from 'fs'; import path from 'path'; import http from 'http'; import { fileURLToPath } from 'url';
import sharp from 'sharp';
const require = createRequire(import.meta.url);
export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const VORLAGE = 'docs/wasser-look/vorlage';                 // the template, from the repository root
export const ALT = 'docs/wasser-look/entwurf/nachgebessert';      // the state the owner approved (injected look, rules under .m-shell): what the template is compared with
export const SZENEN = ['start', 'heute', 'projekte', 'material', 'druck', 'wetter', 'archiv', 'innen'];
export const APP = process.env.WASSER_APP || 'http://localhost:4173';
export const pw = (() => { try { return require('/opt/node-tools/node_modules/playwright/index.js'); } catch { return require('playwright'); } })();
export { sharp };
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const PHONE = { width: 390, height: 844 };
export const abs = (p) => (path.isAbsolute(p) ? p : path.join(REPO, p));
export const mkdir = (d) => { fs.mkdirSync(d, { recursive: true }); return d; };

/* ------------------------------------------------------------------ file server: the repository root */
const MIME = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', json: 'application/json', webp: 'image/webp', avif: 'image/avif', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', woff2: 'font/woff2', woff: 'font/woff', mp4: 'video/mp4', md: 'text/plain; charset=utf-8' };
export function serve(root = REPO) {
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((done) => server.close(done)) })));
}

/* ------------------------------------------------------------------ one browser, many pages */
export async function session({ engine = 'chromium' } = {}) {
  const server = await serve(); const browser = await pw[engine].launch();
  return { engine, browser, base: server.url, harness: (o) => openHarness(browser, server.url, engine, o), app: (o) => openApp(browser, engine, o), close: async () => { await browser.close(); await server.close(); } };
}
const listen = (page) => { const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 300))); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); }); return errors; };
const lookQuery = (look) => (look === 'vorlage' ? '' : look ? `&alt=${encodeURIComponent(look)}` : '&ohne=1');
// the boxes of the drop canvases that are shown, in device px of a screenshot: [left, top, right, bottom]
const dropBoxes = (page, scale) => page.evaluate((s) => [...document.querySelectorAll('.w3-drop')].filter((e) => e.getClientRects().length && getComputedStyle(e).visibility === 'visible').map((e) => { const r = e.getBoundingClientRect(); return [Math.floor(r.left * s), Math.floor(r.top * s), Math.ceil(r.right * s), Math.ceil(r.bottom * s)]; }), scale);

/* ------------------------------------------------------------------ the harness page (scripts/wasser/mobil.html) */
// options: look ('vorlage'), ton ('' | 'klar'), scene, nah (close-up), reduced, scale, touch (phone emulation), query (more parameters), viewport, video (folder)
export async function openHarness(browser, base, engine, { look = 'vorlage', ton = '', scene = 'start', nah = false, reduced = false, scale = 2, touch = false, query = '', viewport = null, video = null, settle = 1500 } = {}) {
  viewport = viewport || (nah ? { width: 900, height: 620 } : PHONE);
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion: reduced ? 'reduce' : 'no-preference', ...(touch ? { hasTouch: true, isMobile: engine !== 'firefox' } : {}), ...(touch && engine === 'webkit' ? { userAgent: IPHONE } : {}), ...(video ? { recordVideo: { dir: video, size: { width: viewport.width * 2, height: viewport.height * 2 } } } : {}) });
  const page = await context.newPage(); const errors = listen(page);
  const url = `${base}/scripts/wasser/mobil.html?scene=${scene}${ton && ton !== 'dunkel' ? '&ton=' + ton : ''}${nah ? '&nah=1' : ''}${lookQuery(look)}${query ? '&' + query : ''}`;
  await page.goto(url, { waitUntil: 'load' }); await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 }); if (settle) await page.waitForTimeout(settle);
  return { page, context, errors, url, scale, drops: () => dropBoxes(page, scale), close: async () => { const v = video ? page.video() : null; await context.close(); return v ? v.path() : null; } };
}

/* ------------------------------------------------------------------ the real app at phone size, the look injected once */
// The app is a single-page app with hash routes, so what is injected stays alive across screens exactly like a built-in look
// would (React mounts and unmounts everything underneath it). A fresh browser opens the "Beispiel" workshop with demo data.
// options: look ('vorlage'), ton, reduced, scale, video (folder), zeit (an ISO time: the app's clock stands still there, so two runs show the same screens)
export async function openApp(browser, engine, { look = 'vorlage', ton = '', reduced = false, scale = 2, video = null, zeit = null, start = {} } = {}) {
  const context = await browser.newContext({ viewport: PHONE, deviceScaleFactor: scale, isMobile: engine !== 'firefox', hasTouch: true, timezoneId: 'Europe/Vienna', locale: 'de-AT', reducedMotion: reduced ? 'reduce' : 'no-preference', ...(engine === 'webkit' ? { userAgent: IPHONE } : {}), ...(video ? { recordVideo: { dir: video, size: { width: 780, height: 1688 } } } : {}) });
  const page = await context.newPage(); const errors = listen(page);
  if (zeit) await page.clock.setFixedTime(new Date(zeit));         // only the clock stands still; timers and animations run
  await page.goto(`${APP}/#/start`, { waitUntil: 'networkidle' }).catch((e) => { throw new Error(`the app is not reachable at ${APP} (npm run build && npm run preview): ${String(e).split('\n')[0]}`); });
  await page.waitForSelector('.m-shell', { timeout: 15000 });
  const rd = (f) => fs.readFileSync(abs(f), 'utf8');
  if (ton && ton !== 'dunkel') await page.evaluate((t) => { document.documentElement.dataset.waTon = t; }, ton);
  if (look === 'vorlage') {
    // what the app will do itself once the look is built in: the attribute on the root, the three stylesheets after its own, the script, start()
    await page.evaluate(() => document.querySelector('.m-shell').setAttribute('data-wasser', 'mobil'));
    for (const f of ['kern.css', 'mobil.css', 'desktop.css']) await page.addStyleTag({ content: rd(`${VORLAGE}/${f}`) });
    await page.addScriptTag({ content: rd(`${VORLAGE}/wasser.js`) });
    await page.evaluate((o) => window.Wasser.start(o), start);
  } else if (look) {
    await page.addStyleTag({ content: rd(`${look}/look.css`) }); await page.addScriptTag({ content: rd(`${look}/look.js`) });
  }
  await page.waitForTimeout(900);
  const go = async (hash, wait = 700) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(wait); };
  const shot = (file) => page.screenshot({ path: file });
  const closeSheet = async () => { const x = page.locator('.sheet .sheet__head button').last(); if (await x.count()) { await x.click(); await page.waitForTimeout(400); } };
  // sheets and overlays of the mobile shell, opened the way a user opens them
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
    if (name === 'haken') return tap('#/heute', page.locator('.m-main .check'));                                             // ticks a task (the row goes, a ring runs; the app shows no toast here)
    if (name === 'toast') { await go('#/material'); await page.locator('.m-main').evaluate((e) => { e.scrollTop = 99999; }); await page.waitForTimeout(400); return tap(null, page.locator('.m-main .m-shop .btn--icon')); }   // removes a shopping entry: a toast with "Rückgängig"
    throw new Error('unknown sheet ' + name);
  };
  const project = async () => { await go('#/projekte'); await page.locator('.m-main .m-row--click').first().click(); await page.waitForTimeout(800); };
  return { page, context, errors, scale, go, shot, sheet, closeSheet, project, drops: () => dropBoxes(page, scale), close: async () => { const v = video ? page.video() : null; await context.close(); return v ? v.path() : null; } };
}

/* ------------------------------------------------------------------ pictures */
export async function rgb(file) { const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }
// two screenshots pixel by pixel; boxes = areas counted apart ("inside": the drop canvases). Largest difference of the three channels, 0..255.
export async function diff(fileA, fileB, boxes = [], out = null) {
  const a = await rgb(fileA), b = await rgb(fileB);
  if (a.w !== b.w || a.h !== b.h) return { size: `${a.w}x${a.h} against ${b.w}x${b.h}`, outside: -1, inside: -1, maxOutside: 255, maxInside: 255, pixels: a.w * a.h };
  const inside = new Uint8Array(a.w * a.h);
  for (const [l, t, r, bt] of boxes) for (let y = Math.max(0, t); y < Math.min(a.h, bt); y++) inside.fill(1, y * a.w + Math.max(0, l), y * a.w + Math.min(a.w, r));
  let nIn = 0, nOut = 0, mIn = 0, mOut = 0; const pic = out ? Buffer.alloc(a.w * a.h * 3) : null;
  for (let i = 0, p = 0; i < a.w * a.h; i++, p += 3) {
    const d = Math.max(Math.abs(a.data[p] - b.data[p]), Math.abs(a.data[p + 1] - b.data[p + 1]), Math.abs(a.data[p + 2] - b.data[p + 2]));
    if (pic) { const g = (a.data[p] + a.data[p + 1] + a.data[p + 2]) / 12; pic[p] = d ? 255 : g; pic[p + 1] = d ? (inside[i] ? 200 : 0) : g; pic[p + 2] = d ? 0 : g; }   // differences: red outside the drops, yellow inside
    if (!d) continue;
    if (inside[i]) { nIn++; if (d > mIn) mIn = d; } else { nOut++; if (d > mOut) mOut = d; }
  }
  if (pic) await sharp(pic, { raw: { width: a.w, height: a.h, channels: 3 } }).png().toFile(out);
  return { outside: nOut, maxOutside: mOut, inside: nIn, maxInside: mIn, pixels: a.w * a.h };
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// Pictures side by side with a caption under each: a filmstrip, a comparison, a contact sheet.
//   frames  [{ file, label }]            scale   size of each picture in the strip (1 = as it is)      cols  pictures per row (0 = all in one)
//   details [{ x, y, w, h, factor, label }]   one more row per entry: that part of every picture (px of the picture), enlarged
//   diffGain  one more row: the difference of every picture to the first, amplified (black = unchanged)
export async function strip(frames, out, { title = '', note = '', scale = 0.5, cols = 0, details = [], diffGain = 0, gap = 12 } = {}) {
  const pad = 20, INK = '#eef0f4', DIM = '#969aa2', layers = []; let y = pad; const text = [];
  const sized = async (input, box, s) => { let im = sharp(input); if (box) im = im.extract({ left: box.x, top: box.y, width: box.w, height: box.h }); const m = box ? { width: box.w, height: box.h } : await sharp(input).metadata(); const w = Math.max(1, Math.round(m.width * s)), h = Math.max(1, Math.round(m.height * s)); return { buf: await im.resize(w, h, { fit: 'fill' }).png().toBuffer(), w, h }; };
  const rows = [{ label: '', cells: await Promise.all(frames.map((f) => sized(f.file, null, scale))), captions: frames.map((f) => f.label || '') }];
  for (const d of details) rows.push({ label: d.label || 'Ausschnitt, vergrößert', cells: await Promise.all(frames.map((f) => sized(f.file, { x: Math.round(d.x), y: Math.round(d.y), w: Math.round(d.w), h: Math.round(d.h) }, d.factor || 1))) });
  if (diffGain) {
    const base = await rgb(frames[0].file), cells = [];
    for (const f of frames) { const c = await rgb(f.file); const o = Buffer.alloc(c.data.length); for (let i = 0; i < o.length; i++) o[i] = Math.min(255, Math.abs(c.data[i] - base.data[i]) * diffGain); cells.push(await sized(await sharp(o, { raw: { width: c.w, height: c.h, channels: 3 } }).png().toBuffer(), null, scale)); }
    rows.push({ label: `Unterschied zum ersten Bild, ${diffGain}-fach verstärkt (schwarz = unverändert)`, cells });
  }
  const n = frames.length; cols = cols || n; const cw = Math.max(...rows.flatMap((r) => r.cells.map((c) => c.w))), W = pad * 2 + cols * cw + (cols - 1) * gap;
  if (title) { text.push(`<text x="${pad}" y="${y + 24}" font-size="24" font-weight="600" fill="${INK}">${esc(title)}</text>`); y += 40; }
  if (note) { text.push(`<text x="${pad}" y="${y + 16}" font-size="16" fill="${DIM}">${esc(note)}</text>`); y += 28; }
  for (const r of rows) {
    if (r.label) { text.push(`<text x="${pad}" y="${y + 16}" font-size="16" fill="${DIM}">${esc(r.label)}</text>`); y += 26; }
    for (let i = 0; i < n; i += cols) {
      const line = r.cells.slice(i, i + cols), h = Math.max(...line.map((c) => c.h));
      line.forEach((c, j) => { const x = pad + j * (cw + gap) + Math.floor((cw - c.w) / 2); layers.push({ input: c.buf, left: x, top: y }); if (r.captions) text.push(`<text x="${pad + j * (cw + gap) + cw / 2}" y="${y + h + 22}" font-size="18" font-weight="600" text-anchor="middle" fill="${INK}">${esc(r.captions[i + j])}</text>`); });
      y += h + (r.captions ? 36 : 12);
    }
  }
  const H = y + pad - 8, svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Inter, DejaVu Sans, Helvetica, Arial, sans-serif">${text.join('')}</svg>`;
  await sharp({ create: { width: W, height: H, channels: 3, background: '#16171a' } }).composite([...layers, { input: Buffer.from(svg), left: 0, top: 0 }]).png().toFile(out);
  return out;
}
// "--name value" and "--flag" from the command line; everything else stays in ._
export function args(defaults = {}) {
  const o = { ...defaults, _: [] }; const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) { if (a[i].startsWith('--')) { const k = a[i].slice(2); if (i + 1 < a.length && !a[i + 1].startsWith('--')) o[k] = a[++i]; else o[k] = true; } else o._.push(a[i]); }
  return o;
}
