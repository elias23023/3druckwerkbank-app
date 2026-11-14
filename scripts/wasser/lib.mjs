// Shared by the tools in scripts/wasser: Playwright, a small file server for the repository, the harness page
// (scripts/wasser/mobil.html), the REAL app at phone size, picture helpers (sharp), the command line.
// Everything is addressed from the repository root, so the tools run from a fresh clone:  node scripts/wasser/<tool>.mjs
//
//   const s = await session({ engine: 'chromium' | 'webkit' | 'firefox' })
//   const h = await s.harness({ ton: 'klar', scene: 'wetter', nah: false, reduced: false, look: 'vorlage' })   -> h.page, h.errors, h.drops(), h.close()
//   const a = await s.app({ ton: 'klar', reduced: false, look: 'auto', zeit: 'tag' })      -> a.page, a.look, a.go(hash), a.sheet(name), a.closeSheet(), a.project(), a.shot(file), a.errors, a.close()
//   await s.close()
//
// WHICH LOOK (option "look" of app() and of openDesktop() in desktop-lib.mjs; the tools' --look):
//   'auto'       (default) the look the app HAS BUILT IN (src/wasser, bundled by the build). A shell that has none (an older
//                state of the app) gets the template injected, as before the look was built in.
//   'eingebaut'  the app exactly as it is built: nothing injected, nothing replaced, whether it has a look or not.
//   'vorlage', a folder (path from the repository root, or absolute), 'git:<revision>'   THAT COPY OF THE TEMPLATE (kern.css,
//                mobil.css, desktop.css, wasser.js), e.g. a copy in which something is being tried, or the template as a
//                commit has it. In a shell without a look it is injected. Where a look is built in it REPLACES the built-in
//                copies: the look's rules are cut out of the app's stylesheet before the page sees it (they are its tail,
//                from the first "[data-wasser" on) and the folder's three stylesheets take their place; the folder's script
//                is defined before the app's bundle runs, so the bundled copy steps back (wasser.js: "if (window.Wasser)
//                return") and the app's own hook starts the folder's script. Never two looks on one page.
//   ''  (--look ohne)   no look: a built-in look is taken out the same way (stylesheet cut, a script that does nothing).
//   a folder with look.css + look.js   an earlier state of the look (docs/wasser-look/entwurf/nachgebessert, the approved
//                reference of vergleich.mjs): injected after a built-in look was taken out.
// Every handle says what it got: a.look = { asked, mode: 'eingebaut' | 'eingespielt' | 'ersetzt' | 'ohne' | 'alt', dir, text }.
// For the harness page 'auto' and 'eingebaut' mean the template (the copies in src/wasser are the template: inSync()).
//
// THE TONE (option "ton": 'dunkel' | 'klar' | 'auto'; '' = 'dunkel'): where the look is built in, the APP chooses the tone
// from its setting "Erscheinungsbild" and the hour. The tools therefore do not touch data-wa-ton there: they write the
// setting into the app's stored state (settings.theme: dunkel -> "dunkel", klar -> "hell") and reload, as if a person had
// chosen it - then "dunkel" is dark by day and "klar" is clear by night. 'auto' leaves the setting alone (the hour decides).
// In a shell without a built-in look the attribute is set directly, both ways.
//
// The real app needs its preview server:  npm run build && npm run preview   (http://localhost:4173; another address: WASSER_APP=...)
// WebKit and Firefox need Playwright's builds of them (on the work machine: source <scratchpad>/judge-phone/env.sh first).
import { createRequire } from 'module'; import fs from 'fs'; import os from 'os'; import path from 'path'; import http from 'http'; import { fileURLToPath } from 'url'; import { execFileSync } from 'child_process';
import sharp from 'sharp';
const require = createRequire(import.meta.url);
export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const VORLAGE = 'docs/wasser-look/vorlage';                 // the template, from the repository root
export const ALT = 'docs/wasser-look/entwurf/nachgebessert';      // the state the owner approved (injected look, rules under .m-shell): what the template is compared with
export const SZENEN = ['start', 'heute', 'projekte', 'material', 'druck', 'wetter', 'archiv', 'innen'];
export const APP = process.env.WASSER_APP || 'http://localhost:4173';
// 13 Nov 2026 in Vienna: sunrise 06:57, sunset 16:18 (what the made-up weather says as well)
export const ZEITEN = { morgen: '2026-11-13T08:40:00+01:00', tag: '2026-11-13T12:40:00+01:00', abend: '2026-11-13T15:50:00+01:00', nacht: '2026-11-13T21:30:00+01:00' };
export const zeitOf = (z) => { const t = +new Date(ZEITEN[z] ?? z); if (!(t > 0)) throw new Error(`zeit: "${z}" is neither ${Object.keys(ZEITEN).join(' | ')} nor an ISO time`); return t; };
export const ENGINES = ['chromium', 'webkit', 'firefox'], TOENE = ['dunkel', 'klar'];
export const pw = (() => { try { return require('/opt/node-tools/node_modules/playwright/index.js'); } catch { return require('playwright'); } })();
export { sharp };
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const PHONE = { width: 390, height: 844 };
export const abs = (p) => (path.isAbsolute(p) ? p : path.join(REPO, p));
export const mkdir = (d) => { fs.mkdirSync(d, { recursive: true }); return d; };
// a look given as 'git:<revision>' (git:HEAD): the template as that commit has it, written to a scratch folder once
const fromGit = {};
export function lookDir(look) {
  if (look === 'vorlage') return abs(VORLAGE);
  if (!/^git:/.test(look)) return abs(look);
  if (!fromGit[look]) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wasser-git-')); for (const f of ['kern.css', 'mobil.css', 'desktop.css', 'wasser.js']) fs.writeFileSync(path.join(dir, f), execFileSync('git', ['show', `${look.slice(4)}:${VORLAGE}/${f}`], { cwd: REPO, maxBuffer: 1 << 26 })); fromGit[look] = dir; }
  return fromGit[look];
}
export const isTemplate = (look) => !!look && fs.existsSync(path.join(lookDir(look), 'kern.css'));   // a copy of the template (not an earlier look.css / look.js)
const urlOf = (dir) => { const rel = path.relative(REPO, dir); return rel.startsWith('..') ? '/@abs' + dir : rel; };   // as the file server below serves it

/* ------------------------------------------------------------------ file server: the repository root */
const MIME = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', json: 'application/json', webp: 'image/webp', avif: 'image/avif', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', woff2: 'font/woff2', woff: 'font/woff', mp4: 'video/mp4', md: 'text/plain; charset=utf-8', ico: 'image/x-icon', webmanifest: 'application/manifest+json', txt: 'text/plain; charset=utf-8' };
// serve(root)                      the repository (or any folder) as files, on a free port
// serve(dist, { app: true, port })   a BUILT APP: "/" is its index.html, /api/ answers 404 (there is no account service here)
export function serve(root = REPO, { app = false, port = 0 } = {}) {
  const server = http.createServer((req, res) => {
    let name = decodeURIComponent(new URL(req.url, 'http://x').pathname); const out = name.startsWith('/@abs/');   // /@abs/<absolute path>: a file outside the repository (a copy of the template in a scratch folder)
    if (app && name.startsWith('/api/')) { res.writeHead(404, { 'content-type': 'application/json' }); res.end('{}'); return; }
    if (app && name === '/') name = '/index.html';
    const file = out ? path.normalize(name.slice(5)) : path.join(root, name);
    if ((!out && !file.startsWith(root)) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((ok, no) => { server.once('error', (e) => no(new Error(`cannot listen on port ${port}: ${e.message}`))); server.listen(port, '127.0.0.1', () => ok({ url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((done) => { server.closeAllConnections?.(); server.close(done); }) })); });
}

/* ------------------------------------------------------------------ one browser, many pages */
export async function session({ engine = 'chromium' } = {}) {
  const server = await serve(); const browser = await pw[engine].launch();
  return { engine, browser, base: server.url, harness: (o) => openHarness(browser, server.url, engine, o), app: (o) => openApp(browser, engine, o), close: async () => { await browser.close(); await server.close(); } };
}
const listen = (page) => { const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 300))); page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 300)); }); return errors; };
const lookQuery = (look) => (look === 'vorlage' || look === 'auto' || look === 'eingebaut' ? '' : !look ? '&ohne=1' : isTemplate(look) ? `&vorlage=${encodeURIComponent(urlOf(lookDir(look)))}` : `&alt=${encodeURIComponent(urlOf(lookDir(look)))}`);
// the boxes of the drop canvases that are shown, in device px of a screenshot: [left, top, right, bottom].
// pad (CSS px) widens them; all = also the canvases whose drop is not drawn yet; clip = the part of the page a screenshot shows
const dropBoxes = (page, scale, { pad = 0, all = false, clip = null } = {}) => page.evaluate(([s, pad, all, ox, oy]) => [...document.querySelectorAll('.w3-drop')].filter((e) => e.getClientRects().length && (all || getComputedStyle(e).visibility === 'visible')).map((e) => { const r = e.getBoundingClientRect(); return [Math.floor((r.left - pad - ox) * s), Math.floor((r.top - pad - oy) * s), Math.ceil((r.right + pad - ox) * s), Math.ceil((r.bottom + pad - oy) * s)]; }), [scale, pad, all, clip ? clip.x : 0, clip ? clip.y : 0]);

/* ------------------------------------------------------------------ the harness page (scripts/wasser/mobil.html) */
// options: look ('vorlage'), ton ('' | 'klar'), scene, nah (close-up), reduced, scale, touch (phone emulation), query (more parameters), viewport, video (folder)
export async function openHarness(browser, base, engine, { look = 'vorlage', ton = '', scene = 'start', nah = false, reduced = false, scale = 2, touch = false, query = '', viewport = null, video = null, settle = 1500 } = {}) {
  viewport = viewport || (nah ? { width: 900, height: 620 } : PHONE);
  const context = await browser.newContext({ viewport, deviceScaleFactor: scale, reducedMotion: reduced ? 'reduce' : 'no-preference', ...(touch ? { hasTouch: true, isMobile: engine !== 'firefox' } : {}), ...(touch && engine === 'webkit' ? { userAgent: IPHONE } : {}), ...(video ? { recordVideo: { dir: video, size: viewport } } : {}) });   // (a recording has the size of the page in CSS px, whatever the scale)
  const page = await context.newPage(); const errors = listen(page);
  const url = `${base}/scripts/wasser/mobil.html?scene=${scene}${ton && ton !== 'dunkel' ? '&ton=' + ton : ''}${nah ? '&nah=1' : ''}${lookQuery(look)}${query ? '&' + query : ''}`;
  await page.goto(url, { waitUntil: 'load' }); await page.waitForFunction(() => window.__ready === true, null, { timeout: 20000 }); if (settle) await page.waitForTimeout(settle);
  return { page, context, errors, url, scale, drops: (o) => dropBoxes(page, scale, o), close: async () => { const v = video ? page.video() : null; await context.close(); return v ? v.path() : null; } };
}

/* ------------------------------------------------------------------ which look: built in, injected, replaced, none */
// (the rules are in the head of this file)
const rd = (f) => fs.readFileSync(abs(f), 'utf8');
const APP_CSS = /\/assets\/[^/?]+\.css(\?.*)?$/;                   // the stylesheet(s) of the built app
// a script that does nothing, for "no look" in an app whose bundle carries one (its hook calls Wasser.start / reads Wasser.DESKTOP)
const NO_LOOK = 'window.Wasser = { start: function () { return this; }, stop: function () { return this; }, MOBIL: {}, DESKTOP: {}, info: { state: "ohne", frames: 0, drops: 0, level: 0, ms: 0 }, ohne: true };';
// the look's rules inside a built stylesheet: its tail, from the rule that first names "[data-wasser" on (the app's own
// rules never name the attribute). Returns the index where that rule begins - a top-level rule, also when the name stands
// inside an @media block or after ":root[...] " -, -1 = this stylesheet carries no look. Throws when rules of the app
// follow the look: then the order of the build is wrong (docs/Wasser-Look.md, pitfall 44) and no tool may go on.
export function lookStart(css) {
  const at = css.indexOf('[data-wasser'); if (at < 0) return -1;
  let depth = 0, i = 0; for (let k = 0; k < at; k++) { const c = css.charCodeAt(k); if (c === 123) depth++; else if (c === 125) { depth--; if (depth === 0) i = k + 1; } }   // the top-level rule that holds the first mention
  if (/[{}]\s*(\.m-shell|\.stage|\.topbar|\.glass)[\s.{,>:[]|@font-face/.test(css.slice(i))) throw new Error('the look does not come LAST in the built stylesheet: rules of the app follow it and win over it (docs/Wasser-Look.md, pitfall 44; src/wasser/wasser.ts imports the app\'s stylesheets first to prevent this). Nothing was measured.');
  return i;
}
// are the copies in src/wasser the template? (They carry one head line more.) null = there is no src/wasser
export function inSync() {
  const pairs = [['kern.css', 'kern.css'], ['mobil.css', 'mobil.css'], ['desktop.css', 'desktop.css'], ['wasser.js', 'wasser-skript.js']]; const off = [];
  if (!fs.existsSync(abs('src/wasser'))) return null;
  for (const [from, to] of pairs) { const f = abs(`src/wasser/${to}`); if (!fs.existsSync(f) || rd(f).replace(/^\/\* Kopie[^\n]*\n/, '') !== rd(`${VORLAGE}/${from}`)) off.push(to); }
  return off;
}
// --look as the tools take it: 'ohne' = '', a folder must exist. Ends the tool with a message otherwise.
export function lookArg(look, { harness = false } = {}) {
  if (look === 'ohne') return '';
  if (look === true || look === '') fail('--look needs a value: auto | eingebaut | vorlage | ohne | <folder> | git:<revision>');
  if (look === 'auto' || look === 'eingebaut') return harness ? 'vorlage' : look;
  if (look === 'vorlage' || /^git:/.test(look)) { try { lookDir(look); } catch (e) { fail(`--look ${look}: ${String(e.message || e).split('\n')[0]}`); } return look; }
  const dir = lookDir(look); if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) fail(`--look ${look}: there is no such folder (${dir}). Known words: auto | eingebaut | vorlage | ohne | git:<revision>`);
  if (!fs.existsSync(`${dir}/kern.css`) && !fs.existsSync(`${dir}/look.css`)) fail(`--look ${look}: the folder holds neither a copy of the template (kern.css, mobil.css, desktop.css, wasser.js) nor an earlier look (look.css, look.js)`);
  return look;
}
export function fail(text, code = 2) { console.error('!! ' + text); process.exit(code); }
const said = new Set();
// one line per run and kind of look: what was really measured
export function sayLook(h) { if (!h || !h.look || said.has(h.look.text)) return; said.add(h.look.text); console.log('Look: ' + h.look.text); const off = h.look.mode === 'eingebaut' ? inSync() : null; if (off && off.length) console.log(`!! src/wasser differs from the template (${off.join(', ')}): what is built in is NOT the template. node scripts/wasser/uebernehmen.mjs && npm run build`); }

// Step 1, BEFORE the page loads: the stylesheet and the script of the look that was asked for.
//   kind 'mobil' | 'desktop';  returns the state that lookAfter() needs
export async function lookBefore(page, look) {
  const st = { asked: look, bundled: false, served: false, err: null };
  if (look === 'auto' || look === 'eingebaut') return st;
  const tpl = isTemplate(look), dir = look ? lookDir(look) : '';
  if (look && !tpl && !fs.existsSync(`${dir}/look.css`)) throw new Error(`look: ${look} is neither a copy of the template (kern.css) nor an earlier look (look.css)`);
  const css = tpl ? ['kern.css', 'mobil.css', 'desktop.css'].map((f) => rd(`${dir}/${f}`)).join('\n') : '';
  st.unroute = APP_CSS; st.dir = dir; st.tpl = tpl;
  await page.route(APP_CSS, async (route) => {
    try {
      const r = await route.fetch(); let body = await r.text(); const i = lookStart(body);
      if (i >= 0) { st.bundled = true; body = body.slice(0, i); }
      if (css && (i >= 0 || (!st.bundled && /\/index-[^/]*\.css/.test(route.request().url())))) { st.served = true; body += '\n' + css; }   // in one piece with the app's own rules, as its build bundles them (on every load of the page: the tools reload it)
      await route.fulfill({ response: r, body });
    } catch (e) { st.err = e; await route.abort().catch(() => {}); }
  });
  await page.addInitScript({ content: tpl ? rd(`${dir}/wasser.js`) : NO_LOOK });
  return st;
}
// Step 2, when the shell is there (rootSel: '.m-shell' or '.stage'): decide, and say what the page now runs.
//   returns { asked, mode, dir, text, injected (the TOOL has to set the attribute and start), builtIn (the app's own hook runs the look, the app chooses the tone) }
export async function lookAfter(page, st, rootSel) {
  if (st.err) throw st.err;
  const has = await page.evaluate((sel) => { const r = document.querySelector(sel); return { root: !!r && r.hasAttribute('data-wasser'), script: !!window.Wasser && !window.Wasser.ohne }; }, rootSel);
  const look = st.asked, name = (d) => (d === abs(VORLAGE) ? 'the template (docs/wasser-look/vorlage)' : d);
  if (look === 'eingebaut') return { asked: look, mode: has.root ? 'eingebaut' : 'ohne', dir: '', builtIn: has.root, injected: false, text: has.root ? 'built in (the app as it is built, nothing injected)' : 'none: this shell of the app has no look built in, and nothing was injected (--look eingebaut)' };
  if (look === 'auto') return has.root ? { asked: look, mode: 'eingebaut', dir: '', builtIn: true, injected: false, text: 'built in (the app as it is built, nothing injected)' } : null;   // null: this shell has none - the caller takes the template
  if (!look) return { asked: look, mode: 'ohne', dir: '', builtIn: false, injected: false, text: st.bundled ? 'none (the built-in look was taken out: its rules cut from the stylesheet, its script replaced by one that does nothing)' : 'none (the app has no look built in)' };
  if (!st.tpl) return { asked: look, mode: 'alt', dir: st.dir, builtIn: false, injected: true, text: `the earlier look ${st.dir} (look.css, look.js), injected${st.bundled ? ' after the built-in look was taken out' : ''}` };
  if (!st.served) throw new Error(`look: the app's stylesheet was not seen (no request matched ${APP_CSS}), so ${st.dir} could not be put in. Nothing was measured.`);
  if (has.root && !st.bundled) throw new Error('look: the shell carries data-wasser but its stylesheet has no look to replace. Nothing was measured.');
  return has.root ? { asked: look, mode: 'ersetzt', dir: st.dir, builtIn: true, injected: false, text: `${name(st.dir)} IN PLACE OF the built-in copies (the app's own hook runs it)` }
    : { asked: look, mode: 'eingespielt', dir: st.dir, builtIn: false, injected: true, text: `${name(st.dir)}, injected (this shell of the app has no look built in${st.bundled ? '; the look bundled for the other shell was taken out' : ''})` };
}
// The tone through the app's own setting "Erscheinungsbild": written into the stored state, then the page is reloaded.
// Returns true when the page was reloaded. (Storage is frozen between the write and the reload: the app saves its state often.)
export async function setTheme(page, ton) {
  if (ton === 'auto') return false; const theme = ton === 'klar' ? 'hell' : 'dunkel';
  const did = await page.evaluate((theme) => { const k = localStorage.getItem('3druckwerkbank:bereich') === 'echt' ? '3druckwerkbank:echt:v1' : '3druckwerkbank:v1'; const raw = localStorage.getItem(k); if (!raw) return 'none'; const j = JSON.parse(raw); if (!j.state || !j.state.settings) return 'none'; if (j.state.settings.theme === theme) return 'same'; j.state.settings.theme = theme; localStorage.setItem(k, JSON.stringify(j)); Storage.prototype.setItem = function () {}; return 'set'; }, theme);
  if (did === 'none') throw new Error('tone: the app has stored no state yet, its setting "Erscheinungsbild" cannot be set');
  if (did === 'set') await page.reload({ waitUntil: 'networkidle' });
  return did === 'set';
}
export const tonOf = (page) => page.evaluate(() => document.documentElement.getAttribute('data-wa-ton') || 'dunkel');

/* ------------------------------------------------------------------ made-up weather */
// a made-up answer of api.open-meteo.com/v1/forecast for seven days from the app's "today" (local times, Europe/Vienna)
const CODE = { klar: 1, bedeckt: 3, regen: 61, nebel: 45, schnee: 73 };
export function wetterJson(now, kind) {
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
// the weather of a page: 'aus' = the request fails, else a made-up answer (the same on every run)
export async function wetterRoute(page, kind, t0) {
  if (kind === 'aus') return page.route(/open-meteo\.com/, (r) => r.abort());
  if (!(kind in CODE)) throw new Error(`wetter: "${kind}" is none of ${Object.keys(CODE).join(' | ')} | aus`);
  await page.route('**/geocoding-api.open-meteo.com/**', (r) => r.abort());
  return page.route('**/api.open-meteo.com/v1/forecast**', (r) => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(wetterJson(new Date(t0), kind)) }));
}

/* ------------------------------------------------------------------ the real app at phone size */
// The app is a single-page app with hash routes: what runs in it stays alive across screens (React mounts and unmounts
// everything underneath). A fresh browser opens the "Beispiel" workshop with demo data.
// options: look ('auto': see the head of this file), ton ('dunkel' | 'klar' | 'auto'), reduced, scale, video (folder),
//          zeit (a name - morgen | tag | abend | nacht - or an ISO time: the app's clock STANDS STILL there; timers and animations run),
//          wetter ('aus': the weather request fails - the default with zeit; klar | bedeckt | regen | nebel | schnee: a made-up answer;
//          without zeit and without wetter the app asks the real service), start (options for Wasser.start on top of the shell's own),
//          app (another address than WASSER_APP / :4173)
export async function openApp(browser, engine, { look = 'auto', ton = '', reduced = false, scale = 2, video = null, zeit = null, wetter = null, start = {}, app = APP } = {}) {
  const context = await browser.newContext({ viewport: PHONE, deviceScaleFactor: scale, isMobile: engine !== 'firefox', hasTouch: true, timezoneId: 'Europe/Vienna', locale: 'de-AT', reducedMotion: reduced ? 'reduce' : 'no-preference', ...(engine === 'webkit' ? { userAgent: IPHONE } : {}), ...(video ? { recordVideo: { dir: video, size: PHONE } } : {}) });
  const page = await context.newPage(); const errors = listen(page); ton = ton || 'dunkel';
  if (zeit) await page.clock.setFixedTime(new Date(zeitOf(zeit)));     // only the clock stands still, timers and animations run
  if (zeit || wetter) await wetterRoute(page, wetter || 'aus', zeit ? zeitOf(zeit) : Date.now());   // (real weather comes on one run and not on the next)
  const load = async (fn) => { await fn().catch((e) => { throw new Error(`the app is not reachable at ${app} (npm run build && npm run preview): ${String(e).split('\n')[0]}`); }); await page.waitForSelector('.m-shell', { timeout: 15000 }); };
  let st = await lookBefore(page, look);
  await load(() => page.goto(`${app}/#/start`, { waitUntil: 'networkidle' }));
  let got = await lookAfter(page, st, '.m-shell');
  if (!got) { st = await lookBefore(page, 'vorlage'); await load(() => page.reload({ waitUntil: 'networkidle' })); got = await lookAfter(page, st, '.m-shell'); }   // 'auto' in a shell without a look: the template
  if (got.builtIn) {                                               // the app chooses the tone: tell it through its own setting
    if (await setTheme(page, ton)) await page.waitForSelector('.m-shell', { timeout: 15000 });
    if (ton !== 'auto' && await tonOf(page) !== ton) throw new Error(`tone: the app was told "${ton}" through its setting and shows "${await tonOf(page)}". Nothing was measured.`);
    if (Object.keys(start).length) await page.evaluate((o) => window.Wasser.start(o), start);   // (a second start() replaces the app's own instance)
  } else if (got.injected) {
    if (ton !== 'auto') await page.evaluate((t) => { if (t === 'klar') document.documentElement.dataset.waTon = t; else delete document.documentElement.dataset.waTon; }, ton);
    if (got.mode === 'alt') { await page.addStyleTag({ content: rd(`${got.dir}/look.css`) }); await page.addScriptTag({ content: rd(`${got.dir}/look.js`) }); }
    else { await page.evaluate(() => document.querySelector('.m-shell').setAttribute('data-wasser', 'mobil')); await page.evaluate((o) => window.Wasser.start(o), start); }   // what the app does itself once the look is built in
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
    throw new Error('unknown sheet ' + name + ' (phone: konto einstellungen hinweise suche projekt rolle neuerolle geraet haken toast)');
  };
  const project = async () => { await go('#/projekte'); await page.locator('.m-main .m-row--click').first().click(); await page.waitForTimeout(800); };
  // the other workspace ('echt' = Meine Werkstatt, starts completely empty): the page reloads, look and tone are set again
  const bereich = async (ws) => {
    await page.evaluate((x) => { localStorage.setItem('3druckwerkbank:bereich', x); location.hash = '#/start'; }, ws); await load(() => page.reload({ waitUntil: 'networkidle' }));
    if (got.builtIn) { if (await setTheme(page, ton)) await page.waitForSelector('.m-shell', { timeout: 15000 }); if (Object.keys(start).length) await page.evaluate((o) => window.Wasser.start(o), start); }
    else if (got.injected) { if (ton !== 'auto') await page.evaluate((t) => { if (t === 'klar') document.documentElement.dataset.waTon = t; else delete document.documentElement.dataset.waTon; }, ton); if (got.mode === 'alt') { await page.addStyleTag({ content: rd(`${got.dir}/look.css`) }); await page.addScriptTag({ content: rd(`${got.dir}/look.js`) }); } else { await page.evaluate(() => document.querySelector('.m-shell').setAttribute('data-wasser', 'mobil')); await page.evaluate((o) => window.Wasser.start(o), start); } }
    await page.waitForTimeout(900);
  };
  return { page, context, errors, scale, look: got, ton, go, shot, sheet, closeSheet, project, bereich, drops: (o) => dropBoxes(page, scale, o), close: async () => { const v = video ? page.video() : null; await context.close(); return v ? v.path() : null; } };
}

/* ------------------------------------------------------------------ pictures */
export async function rgb(file) { const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }
// two screenshots pixel by pixel; boxes = areas counted apart ("inside": the drop canvases). Largest difference of the three channels, 0..255.
// box = [left, top, right, bottom] around every pixel that differs (px of the picture), null when none does
export async function diff(fileA, fileB, boxes = [], out = null) {
  const a = await rgb(fileA), b = await rgb(fileB);
  if (a.w !== b.w || a.h !== b.h) return { size: `${a.w}x${a.h} against ${b.w}x${b.h}`, outside: -1, inside: -1, maxOutside: 255, maxInside: 255, pixels: a.w * a.h, box: [0, 0, a.w, a.h] };
  const inside = new Uint8Array(a.w * a.h);
  for (const [l, t, r, bt] of boxes) for (let y = Math.max(0, t); y < Math.min(a.h, bt); y++) inside.fill(1, y * a.w + Math.max(0, l), y * a.w + Math.min(a.w, r));
  let nIn = 0, nOut = 0, mIn = 0, mOut = 0, x0 = a.w, y0 = a.h, x1 = -1, y1 = -1; const pic = out ? Buffer.alloc(a.w * a.h * 3) : null;
  for (let i = 0, p = 0; i < a.w * a.h; i++, p += 3) {
    const d = Math.max(Math.abs(a.data[p] - b.data[p]), Math.abs(a.data[p + 1] - b.data[p + 1]), Math.abs(a.data[p + 2] - b.data[p + 2]));
    if (pic) { const g = (a.data[p] + a.data[p + 1] + a.data[p + 2]) / 12; pic[p] = d ? 255 : g; pic[p + 1] = d ? (inside[i] ? 200 : 0) : g; pic[p + 2] = d ? 0 : g; }   // differences: red outside the drops, yellow inside
    if (!d) continue;
    const x = i % a.w, y = (i - x) / a.w; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (inside[i]) { nIn++; if (d > mIn) mIn = d; } else { nOut++; if (d > mOut) mOut = d; }
  }
  if (pic) await sharp(pic, { raw: { width: a.w, height: a.h, channels: 3 } }).png().toFile(out);
  return { outside: nOut, maxOutside: mOut, inside: nIn, maxInside: mIn, pixels: a.w * a.h, box: x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1] };
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
// Pictures side by side with a caption under each: a filmstrip, a comparison, a contact sheet.
//   frames  [{ file, label }]            scale   size of each picture in the strip (1 = as it is)      cols  pictures per row (0 = all in one)
//   details [{ x, y, w, h, factor, label }]   one more row per entry: that part of every picture (px of the picture), enlarged
//   diffGain  one more row: the difference of every picture to the first, amplified (black = unchanged)
//   rowLabels  a line of text above each row of pictures (one entry per row)      captionSize  size of the captions (18)
//   palette  true: a PNG of 256 colours (a third of the size; fine for a strip of small stills, not for judging soft light)
export async function strip(frames, out, { title = '', note = '', scale = 0.5, cols = 0, details = [], diffGain = 0, gap = 12, palette = false, rowLabels = [], captionSize = 18 } = {}) {
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
      if (r.captions && rowLabels[i / cols]) { text.push(`<text x="${pad}" y="${y + 20}" font-size="20" font-weight="600" fill="${INK}">${esc(rowLabels[i / cols])}</text>`); y += 32; }
      const line = r.cells.slice(i, i + cols), h = Math.max(...line.map((c) => c.h));
      line.forEach((c, j) => { const x = pad + j * (cw + gap) + Math.floor((cw - c.w) / 2); layers.push({ input: c.buf, left: x, top: y }); if (r.captions) text.push(`<text x="${pad + j * (cw + gap) + cw / 2}" y="${y + h + captionSize + 4}" font-size="${captionSize}" font-weight="600" text-anchor="middle" fill="${INK}">${esc(r.captions[i + j])}</text>`); });
      y += h + (r.captions ? captionSize + 18 : 12);
    }
  }
  const H = y + pad - 8, svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Inter, DejaVu Sans, Helvetica, Arial, sans-serif">${text.join('')}</svg>`;
  await sharp({ create: { width: W, height: H, channels: 3, background: '#16171a' } }).composite([...layers, { input: Buffer.from(svg), left: 0, top: 0 }]).png(palette ? { palette: true, colours: 256, effort: 10, dither: 1 } : {}).toFile(out);
  return out;
}
/* ------------------------------------------------------------------ recording through the browser's screencast */
// Playwright's video recorder (recordVideo) is a low-bitrate VP8 screencast: its codec noise is larger than the soft light of
// the look (two pictures of a page AT REST differed by 4 of 255 or more on 47 % of their pixels; a light of +10 to +17 of 255
// is swallowed). The browser's own screencast gives every picture it shows as a JPEG with its true time: consecutive
// pictures at rest differ by 4 or more on about 2 % of the pixels - the living drops. Chromium only (DevTools protocol).
//   const c = await cast(page, dir)         starts; frames are 390 x 844 (CSS px, whatever the device scale), about 20 a second here
//   const frames = await c.stop()           [{ file, t }]  t = seconds, the clock of Date.now() / 1000
//   encodeCast(tracks, out, options)        tracks = [{ frames, from, to, label }] - one recording, or several side by side, each cut
//                                           from its own "from" (seconds, same clock) and laid on a common time line at the true times;
//                                           options: fps (25), crf (17), captions [{ from, to, text }] (seconds from the start of the
//                                           clip), title. Needs ffmpeg. Returns the size of the picture.
export async function cast(page, dir, { quality = 95 } = {}) {
  mkdir(dir); const cdp = await page.context().newCDPSession(page); const frames = []; let n = 0;
  cdp.on('Page.screencastFrame', (f) => { const file = `${dir}/f${String(n++).padStart(5, '0')}.jpg`; fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push({ file, t: f.metadata.timestamp }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality, everyNthFrame: 1 });
  return { frames, stop: async () => { await cdp.send('Page.stopScreencast').catch(() => {}); await page.waitForTimeout(250); await cdp.detach().catch(() => {}); return frames; } };
}
// the picture a recording shows at time t (the last frame at or before it)
export const frameAt = (frames, t) => { let f = frames[0]; for (const x of frames) { if (x.t <= t) f = x; else break; } return f; };
export async function encodeCast(tracks, out, { fps = 25, crf = 17, captions = [], title = '', preset = 'slow' } = {}) {
  const dir = mkdir(out + '.d'); const m = await sharp(tracks[0].frames[0].file).metadata(); const w = m.width, h = m.height;
  const labelled = tracks.some((t) => t.label) || !!title || captions.length, pad = labelled ? 20 : 0, top = (title ? 40 : 0) + (tracks.some((t) => t.label) ? 44 : 0) + pad, foot = captions.length ? 52 : pad;
  const even = (v) => v + (v % 2); const W = even(pad + tracks.length * (w + pad)), H = even(top + h + foot), dur = Math.min(...tracks.map((t) => t.to - t.from)), INK = '#eef0f4', DIM = '#a6aab2', FONT = 'font-family="Inter, DejaVu Sans, Helvetica, Arial, sans-serif"';
  // one list per track for ffmpeg's concat reader: each frame with the time it was on the screen
  const lists = tracks.map((t, i) => { const fr = t.frames.filter((f) => f.t > t.from && f.t < t.from + dur), first = frameAt(t.frames, t.from); const seq = [{ file: first.file, t: t.from }, ...fr]; let txt = '';
    seq.forEach((f, k) => { txt += `file '${f.file}'\nduration ${Math.max(0.001, (k + 1 < seq.length ? seq[k + 1].t : t.from + dur) - f.t).toFixed(4)}\n`; }); txt += `file '${seq[seq.length - 1].file}'\n`;   // (the reader needs the last picture once more, or its time is lost)
    const file = `${dir}/track${i}.txt`; fs.writeFileSync(file, txt); return file; });
  const svg = (inner) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" ${FONT}>${inner}</svg>`);
  const bg = `${dir}/bg.png`; await sharp({ create: { width: W, height: H, channels: 3, background: '#16171a' } }).composite(labelled ? [{ input: svg((title ? `<text x="${pad}" y="30" font-size="20" font-weight="600" fill="${INK}">${esc(title)}</text>` : '') + tracks.map((t, i) => (t.label ? `<text x="${pad + i * (w + pad) + w / 2}" y="${top - 14}" font-size="24" font-weight="600" text-anchor="middle" fill="${INK}">${esc(t.label)}</text>` : '')).join('')), left: 0, top: 0 }] : []).png().toFile(bg);
  const caps = []; for (const [i, c] of captions.entries()) { const file = `${dir}/cap${i}.png`; await sharp({ create: { width: W, height: 40, channels: 4, background: { r: 22, g: 23, b: 26, alpha: 1 } } }).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="40" ${FONT}><text x="${W / 2}" y="27" font-size="20" text-anchor="middle" fill="${DIM}">${esc(c.text)}</text></svg>`), left: 0, top: 0 }]).png().toFile(file); caps.push(file); }
  const inputs = ['-loop', '1', '-framerate', String(fps), '-i', bg]; for (const l of lists) inputs.push('-f', 'concat', '-safe', '0', '-i', l); for (const c of caps) inputs.push('-loop', '1', '-framerate', String(fps), '-i', c);
  let graph = '', lastV = '0:v'; tracks.forEach((t, i) => { graph += `[${i + 1}:v]fps=${fps},setpts=PTS-STARTPTS[t${i}];[${lastV}][t${i}]overlay=${pad + i * (w + pad)}:${top}[o${i}];`; lastV = `o${i}`; });
  captions.forEach((c, i) => { graph += `[${lastV}][${tracks.length + 1 + i}:v]overlay=0:${top + h + 8}:enable='between(t,${c.from},${c.to})'[c${i}];`; lastV = `c${i}`; });
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', graph.replace(/;$/, ''), '-map', `[${lastV}]`, '-t', dur.toFixed(3), '-r', String(fps), '-c:v', 'libx264', '-crf', String(crf), '-preset', preset, '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out]);
  fs.rmSync(dir, { recursive: true, force: true }); return { width: W, height: H, seconds: dur, x: tracks.map((t, i) => pad + i * (w + pad)), y: top, w, h };
}
// several pictures one under the other (strips made by strip()), left-aligned
export async function stack(files, out, { palette = false } = {}) {
  const ms = []; for (const f of files) ms.push(await sharp(f).metadata()); let y = 0; const layers = files.map((f, i) => { const l = { input: f, left: 0, top: y }; y += ms[i].height; return l; });
  await sharp({ create: { width: Math.max(...ms.map((m) => m.width)), height: y, channels: 3, background: '#16171a' } }).composite(layers).png(palette ? { palette: true, colours: 256, effort: 10, dither: 1 } : {}).toFile(out); return out;
}
// Go to one spot of the app, as stelle.mjs and kontrast.mjs --css describe it. d = a handle of app() or of openDesktop().
//   welt   a world (start heute projekte druck material wetter archiv), 'innen' (the inner world of a project) or a hash ('#/material')
//   bogen  a sheet the handle can open by name      klick  then click: texts or selectors, several separated by ">>"
export async function geheZu(d, { welt = '', bogen = '', klick = '' } = {}) {
  const p = d.page;
  if (welt === 'innen') await d.project(); else if (welt) await d.go(welt.startsWith('#') ? welt : '#/' + welt);
  if (bogen) await d.sheet(bogen);
  for (const k of String(klick || '').split('>>').map((x) => x.trim()).filter(Boolean)) { await (/^[.#[]/.test(k) ? p.locator(k).first() : p.getByRole('button', { name: k }).or(p.getByRole('link', { name: k })).last()).click({ timeout: 5000 }); await p.waitForTimeout(900); }
}
// The command line: "--name value", "--name=value" and "--flag"; everything else stays in ._
//   defaults  every option the tool knows that takes a value, with its default
//   flags     the options without a value (--app, --reduced ...)
//   choices   { name: [allowed values] } - a list separated by commas is checked word by word
// An option the tool does not know, a misspelt one, a missing value or a value that is not allowed ENDS the tool with a
// message and exit code 2. (Until 14.11. such an option was ignored without a word - and "--loook kopie" checked the template.)
export function args(defaults = {}, { flags = [], choices = {} } = {}) {
  const o = { ...defaults, _: [] }; const a = process.argv.slice(2); const known = [...Object.keys(defaults), ...flags];
  const dist = (x, y) => { const d = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)]); for (let j = 1; j <= y.length; j++) d[0][j] = j; for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1)); return d[x.length][y.length]; };
  const list = () => `This tool knows: ${known.map((k) => '--' + k).join(' ')}`;
  for (let i = 0; i < a.length; i++) {
    if (!a[i].startsWith('--')) { o._.push(a[i]); continue; }
    const eq = a[i].indexOf('='); const k = a[i].slice(2, eq < 0 ? undefined : eq);
    if (!known.includes(k)) { const near = known.filter((n) => dist(n, k) <= 2 || n.startsWith(k) || k.startsWith(n)); fail(`unknown option --${k}${near.length ? ` (did you mean --${near[0]}?)` : ''}. ${list()}`); }
    if (flags.includes(k)) { if (eq >= 0) fail(`--${k} takes no value`); o[k] = true; continue; }
    const v = eq >= 0 ? a[i].slice(eq + 1) : a[i + 1]; if (v === undefined || (eq < 0 && v.startsWith('--') && known.includes(v.slice(2).split('=')[0]))) fail(`--${k} needs a value. ${list()}`);
    if (eq < 0) i++; o[k] = v;
  }
  for (const [k, allowed] of Object.entries(choices)) for (const v of String(o[k] ?? '').split(',')) if (v !== '' && !allowed.includes(v) && !(allowed.includes('<iso>') && +new Date(v) > 0) && !(allowed.includes('<WxH>') && /^\d+x\d+$/.test(v))) fail(`--${k} ${o[k]}: "${v}" is not one of ${allowed.join(' | ')}`);
  return o;
}
