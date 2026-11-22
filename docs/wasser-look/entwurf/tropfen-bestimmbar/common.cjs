const pw = require('/opt/node-tools/node_modules/playwright/index.js');
const APP = process.env.WASSER_APP || 'http://localhost:4173';
const INIT = () => {
  const C = window.__c = { texNew: 0, texDel: 0, ctx: 0, lose: 0, bmpNew: 0, bmpClose: 0, add: 0, rem: 0, fetch: 0, raf: 0, live: new Map() };
  const P = WebGLRenderingContext.prototype;
  const ct = P.createTexture, dt = P.deleteTexture;
  P.createTexture = function () { C.texNew++; return ct.apply(this, arguments); };
  P.deleteTexture = function (t) { if (t) C.texDel++; return dt.apply(this, arguments); };
  const gc = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (k) { const r = gc.apply(this, arguments); if (r && /webgl/.test(k) && !this.__seen) { this.__seen = 1; C.ctx++; (window.__gls = window.__gls || []).push(r); } return r; };
  const cib = window.createImageBitmap;
  window.createImageBitmap = function () { return cib.apply(this, arguments).then((b) => { C.bmpNew++; return b; }); };
  const cl = ImageBitmap.prototype.close; ImageBitmap.prototype.close = function () { if (!this.__cl) { this.__cl = 1; C.bmpClose++; } return cl.apply(this, arguments); };
  const key = (t, n, f, o) => { let m = C.live.get(t); if (!m) C.live.set(t, m = new Map()); const cap = !!(o && (o === true || o.capture)); let s = m.get(n + '|' + cap); if (!s) m.set(n + '|' + cap, s = new Set()); return s; };
  const ae = EventTarget.prototype.addEventListener, re = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (n, f, o) { if (f && (this === window || this === document || this === document.documentElement || this === document.body || (window.MediaQueryList && this instanceof MediaQueryList))) { key(this, n, f, o).add(f); } return ae.apply(this, arguments); };
  EventTarget.prototype.removeEventListener = function (n, f, o) { if (f && C.live.has(this)) key(this, n, f, o).delete(f); return re.apply(this, arguments); };
  window.__listeners = () => { let n = 0; const by = {}; C.live.forEach((m, t) => m.forEach((s, k) => { n += s.size; if (s.size) by[(t === window ? 'win' : t === document ? 'doc' : 'other') + ':' + k] = s.size; })); return { n, by }; };
  const f0 = window.fetch; window.fetch = function (u) { C.fetch++; (window.__fetches = window.__fetches || []).push(String(u && u.url || u)); return f0.apply(this, arguments); };
  const r0 = window.requestAnimationFrame; window.requestAnimationFrame = function (f) { C.raf++; return r0.call(window, f); };
};
async function open({ w = 390, h = 844, mobile = true, reduced = false, args = [], init } = {}) {
  const browser = await pw.chromium.launch({ args: ['--enable-precise-memory-info', '--js-flags=--expose-gc', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...args] });
  const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile, reducedMotion: reduced ? 'reduce' : 'no-preference', timezoneId: 'Europe/Vienna', locale: 'de-AT' });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(String(e))); page.on('console', (m) => { if (m.type() === 'error' || /wasser/.test(m.text())) errors.push(m.text()); });
  await context.addInitScript(INIT); if (init) await context.addInitScript(init);
  return { browser, context, page, errors };
}
const info = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.Wasser.info)));
const counts = (page) => page.evaluate(() => { const c = window.__c; const l = window.__listeners(); if (window.gc) window.gc(); return { tex: c.texNew - c.texDel, texNew: c.texNew, ctx: c.ctx, bmpOpen: c.bmpNew - c.bmpClose, bmpNew: c.bmpNew, listeners: l.n, fetch: c.fetch, heapMB: +(performance.memory.usedJSHeapSize / 1048576).toFixed(1), nodes: document.querySelectorAll('*').length, canv: document.querySelectorAll('canvas').length }; });
const go = (page, hash) => page.evaluate((h) => { location.hash = h; }, hash);
const until = (page, fn, arg, timeout = 15000) => page.waitForFunction(fn, arg, { timeout });
module.exports = { pw, APP, open, info, counts, go, until };
