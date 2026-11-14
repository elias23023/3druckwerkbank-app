// THE CHANGE OF SCREEN in numbers: what a tap on a tab (phone), a world in the dock (desktop) or a new landscape (desktop, the
// look of the hour) costs the page, and how much of it is the look's scene - the picture the drops bend. Built app, Chromium.
// (Grew out of docs/wasser-look/entwurf/reiterwechsel/messen.mjs and profil.mjs, the record of the finding of 14.11.)
//
//   node scripts/wasser/reiter.mjs handy|desktop|landschaft|profil [--app name=address,...] [--drossel 1,4] [--laeufe 3]
//        [--netz langsam] [--format 2000,1920] [--look eingebaut|ohne|vorlage|<folder>|git:<rev>] [--ohne] [--json <file>]
//
//   handy       390 x 844 @3x, touch: Heute, Projekte, Material, Mehr, Start (first visits), the same five again (second visits)
//   desktop     2000 x 993 and 1920 x 1080 (--format), the dock: Heute, Projekte, Druck, Material, Wetter, Archiv, Start, twice
//   landschaft  desktop 2000 x 993: the clock stands 15 s before the look of the hour changes (13.11., 15:27:45; the made-up
//               weather sets sunset at 16:18, at 15:28 "nachmittag" turns "golden": the landscape goes from herbst-mittag to
//               herbst-abend with the app's 2.5 s crossfade) and the 20 s around it are watched
//   profil      a CPU profile of two tab changes on the phone (each scene seen once before), the look's script being the
//               template (--look vorlage, default) or a commit (--look git:feinschliff-basis), so its functions have their names:
//               time under each function, the largest first
//   --app       the apps, name=address, separated by commas (default: jetzt=WASSER_APP or :4173). Two builds side by side:
//               --app vorher=http://localhost:4180,nachher=http://localhost:4181 (sollist.mjs shows how to build a commit)
//   --drossel   CPU slowdowns of Chromium (1 = as the machine is, 4 = four times slower), each a series of its own
//   --laeufe    runs per app and slowdown, each in a fresh page (the tables give the median and, after the slash, the largest)
//   --netz langsam   the page loads over a slow line (80 ms, 6.4 Mbit/s down) from the first byte: does the first visit of a tab
//               wait for its scene? (the app preloads the scenes of the other tabs in a quiet moment after the start)
//   --ohne      also each app with its look taken out (stylesheet cut, script replaced: lib.mjs, --look ohne) - the floor
//   --look      what each app shows (default eingebaut: the look it has built in; profil: vorlage)
//
// Per change (handy, desktop):
//   Bild      ms from the tap until the new screen has gone out: the begin of the frame AFTER the one in which it was first
//             drawn (two requestAnimationFrame after the button carries aria-current). Work done in that first frame - the
//             drops' own rAF before the paint - counts; work in later frames does not.
//   Aufgabe   the longest task over 50 ms (PerformanceObserver "longtask") in the 1.2 s after the tap; - = none
//   Szene     the most scene work in ONE task: ms in drawImage of an image or bitmap, getImageData, texImage2D, texSubImage2D,
//             generateMipmap, createImageBitmap (wrapped on the prototypes after the page has loaded), summed per long task;
//             also outside long tasks: the total in the 1.2 s (Szene ges.)
//   S>50      long tasks of more than 50 ms of which more than half is scene work ("a long task that belongs to the scene")
//   Tropfen   ms of copying the drops' water into their canvases (drawImage of a canvas) BEFORE the new screen went out; on this
//             machine WebGL runs in software and this copy waits for the shading: it is the cost of the water itself
//   neu       ms until the drops show the new scene (Wasser.info.scene equals the address of the page's scene image; - = the
//             script has no info.scene, or the drops did not get there within 1.2 s)
// The work machine draws WebGL in software and is shared: compare two apps measured in one run, never absolute numbers with
// a phone. Exit code 0 always (a measurement, not a check).
import fs from 'fs';
import { pw, args, fail, lookArg, lookBefore, lookAfter, wetterRoute, APP } from './lib.mjs';

const a = args({ app: '', drossel: '1,4', laeufe: '3', netz: '', format: '2000,1920', look: '', json: '' }, { flags: ['ohne'], choices: { netz: ['langsam'], format: ['2000', '1920'] } });
const WAS = ['handy', 'desktop', 'landschaft', 'profil']; const was = a._[0]; if (!WAS.includes(was) || a._.length > 1) fail(`usage: node scripts/wasser/reiter.mjs ${WAS.join('|')} [options]  (see the head of this file)`);
{ const FOR = { handy: ['app', 'drossel', 'laeufe', 'netz', 'ohne', 'look', 'json'], desktop: ['app', 'drossel', 'laeufe', 'format', 'ohne', 'look', 'json'], landschaft: ['app', 'drossel', 'laeufe', 'look', 'json'], profil: ['app', 'drossel', 'look'] };
  for (const k of process.argv.slice(2).filter((x) => x.startsWith('--')).map((x) => x.slice(2).split('=')[0])) if (!FOR[was].includes(k)) fail(`--${k} has no effect in "${was}". "${was}" takes: ${FOR[was].map((x) => '--' + x).join(' ')}`); }
const apps = (a.app || `jetzt=${APP}`).split(',').map((x) => { const i = x.indexOf('='); if (i < 1) fail(`--app ${x}: name=address`); return [x.slice(0, i), x.slice(i + 1).replace(/\/$/, '')]; });
const drossel = a.drossel.split(',').map(Number); if (drossel.some((d) => !(d >= 1))) fail('--drossel: numbers of 1 and more');
const laeufe = Math.max(1, Number(a.laeufe) || 1); const look = lookArg(a.look || (was === 'profil' ? 'vorlage' : 'eingebaut'));
const VIENNA = { timezoneId: 'Europe/Vienna', locale: 'de-AT' };
const med = (xs) => { const v = xs.filter((x) => typeof x === 'number').sort((p, q) => p - q); return v.length ? v[Math.floor((v.length - 1) / 2)] : null; };
const mx = (xs) => { const v = xs.filter((x) => typeof x === 'number'); return v.length ? Math.max(...v) : null; };
const f0 = (x) => (x === null || x === undefined ? '-' : String(Math.round(x)));

// wraps the canvas and WebGL calls of the scene and of the drops, and watches long tasks (installed after the page has loaded:
// the look's script calls these through the prototypes)
const INSTRUMENT = () => {
  if (window.__rw) return; const calls = []; const long = []; window.__rw = { calls, long };
  const wrap = (proto, name, kind) => { const f = proto[name]; if (!f) return; proto[name] = function (...x) { const t = performance.now(); try { return f.apply(this, x); } finally { calls.push({ s: t, d: performance.now() - t, k: typeof kind === 'function' ? kind(x) : kind }); } }; };
  wrap(CanvasRenderingContext2D.prototype, 'drawImage', (x) => (x[0] instanceof HTMLCanvasElement ? 'tropfen' : 'szene'));
  wrap(CanvasRenderingContext2D.prototype, 'getImageData', 'szene');
  for (const n of ['texImage2D', 'texSubImage2D', 'generateMipmap']) wrap(WebGLRenderingContext.prototype, n, 'szene');
  const cib = window.createImageBitmap; if (cib) window.createImageBitmap = function (...x) { const t = performance.now(); try { return cib.apply(this, x); } finally { calls.push({ s: t, d: performance.now() - t, k: 'szene' }); } };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) long.push({ s: e.startTime, d: e.duration }); }).observe({ entryTypes: ['longtask'] });
};
// one change: click the button of a bar whose text is NAME, and watch for MS ms
const CHANGE = ([bar, name, sceneSel, ms]) => new Promise((resolve) => {
  const btn = [...document.querySelectorAll(bar)].find((b) => b.textContent.trim() === name); if (!btn) { resolve({ name, err: 'no button ' + name }); return; }
  const rw = window.__rw; rw.calls.length = 0; const t0 = performance.now(); const o = { name };
  const lastImg = () => { const all = document.querySelectorAll(sceneSel); return all.length ? all[all.length - 1] : null; };
  const mo = new MutationObserver(() => { if (btn.getAttribute('aria-current') === 'page' && o.commit === undefined) { o.commit = performance.now() - t0; mo.disconnect(); o.drops0 = rw.calls.length; requestAnimationFrame(() => requestAnimationFrame((ts2) => { o.bild = ts2 - t0; o.dropsUntil = ts2; })); } });
  mo.observe(btn, { attributes: true, attributeFilter: ['aria-current'] });
  const poll = () => { const i = lastImg(), src = i && (i.currentSrc || i.src), info = window.Wasser && window.Wasser.info; if (o.neu === undefined && o.commit !== undefined && info && info.scene && src && info.scene === src) o.neu = performance.now() - t0; if (performance.now() - t0 < ms) requestAnimationFrame(poll); };
  requestAnimationFrame(poll);
  btn.click();
  setTimeout(() => {
    const calls = rw.calls.slice(), long = rw.long.filter((l) => l.s >= t0 - 1 && l.s < t0 + ms);
    const sum = (k, from, to) => calls.filter((c) => c.k === k && c.s >= from && c.s < to).reduce((x, c) => x + c.d, 0);
    o.aufgabe = long.length ? Math.max(...long.map((l) => l.d)) : 0;
    o.szeneTask = long.length ? Math.max(0, ...long.map((l) => sum('szene', l.s, l.s + l.d))) : 0;
    o.s50 = long.filter((l) => l.d > 50 && sum('szene', l.s, l.s + l.d) > l.d / 2).length;
    o.szeneGes = sum('szene', t0, t0 + ms);
    o.tropfen = o.dropsUntil ? sum('tropfen', t0, o.dropsUntil) : null;
    o.info = window.Wasser && window.Wasser.info ? { scene: window.Wasser.info.scene, scenes: window.Wasser.info.scenes, uploads: window.Wasser.info.uploads, reused: window.Wasser.info.reused } : null;
    resolve(o);
  }, ms);
});

const browser = await pw.chromium.launch();
async function open(url, { kind, lk, format = '2000', netz = '', zeit = 0 }) {
  const [w, h] = kind === 'handy' ? [390, 844] : format === '1920' ? [1920, 1080] : [2000, 993];
  const ctx = await browser.newContext(kind === 'handy' ? { viewport: { width: w, height: h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, ...VIENNA } : { viewport: { width: w, height: h }, deviceScaleFactor: 1, ...VIENNA });
  if (zeit) await ctx.addInitScript((t) => { const R = Date, off = t - R.now(); class D extends R { constructor(...x) { if (x.length) super(...x); else super(R.now() + off); } static now() { return R.now() + off; } } window.Date = D; }, zeit);
  const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page); const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  if (netz) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 6.4e6 / 8, uploadThroughput: 750e3 / 8 });
  await wetterRoute(page, 'klar', zeit || Date.now());
  const root = kind === 'handy' ? '.m-shell' : '.stage';
  const st = await lookBefore(page, lk); await page.goto(url + '/#/start', { waitUntil: 'load' }); await page.waitForSelector(root, { timeout: 20000 });
  const got = await lookAfter(page, st, root); if (!got) throw new Error('lookAfter');
  if (kind !== 'handy') await page.waitForSelector('.stage[data-scene-ready="true"]', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(3500); await page.evaluate(INSTRUMENT);
  return { page, cdp, ctx, errors, look: got.text };
}

const rows = [];   // { app, drossel, art, visit, ...change }
const BAR = { handy: '.m-tabs button', desktop: '.dock button' }, SCENE = { handy: '.m-bg img', desktop: '.land img' };
const ORDER = { handy: ['Heute', 'Projekte', 'Material', 'Mehr', 'Start'], desktop: ['Heute', 'Projekte', 'Druck', 'Material', 'Wetter', 'Archiv', 'Start'] };
async function series(kind, name, url, lk, d, extra) {
  for (let run = 0; run < laeufe; run++) {
    const o = await open(url, { kind, lk, ...extra }); if (run === 0 && d === drossel[0]) console.log(`${name}${lk === '' ? ' (ohne Look)' : ''}: ${o.look}`);
    await o.cdp.send('Emulation.setCPUThrottlingRate', { rate: d });
    const order = ORDER[kind];
    for (const [i, tab] of [...order, ...order].entries()) {
      const r = await o.page.evaluate(CHANGE, [BAR[kind], tab, SCENE[kind], 1200]);
      rows.push({ app: name + (lk === '' ? ' ohne Look' : ''), drossel: d, art: kind + (extra.format && kind === 'desktop' ? ' ' + extra.format : ''), visit: i < order.length ? 'erster' : 'zweiter', run, ...r });
      await o.page.waitForTimeout(500);
    }
    if (o.errors.length) console.log('  page errors:', o.errors.slice(0, 3).join(' | '));
    await o.ctx.close();
  }
}
function table() {
  const keys = [...new Set(rows.map((r) => `${r.art}|${r.drossel}|${r.app}|${r.visit}`))];
  console.log('\n' + 'Art'.padEnd(13) + 'CPU'.padEnd(5) + 'App'.padEnd(22) + 'Besuch'.padEnd(9) + 'Bild'.padStart(11) + 'Aufgabe'.padStart(11) + 'Szene'.padStart(10) + 'Szene ges.'.padStart(12) + 'S>50'.padStart(6) + 'Tropfen'.padStart(11) + 'neu'.padStart(11) + '   n');
  for (const k of keys) {
    const [art, d, app, visit] = k.split('|'); const g = rows.filter((r) => `${r.art}|${r.drossel}|${r.app}|${r.visit}` === k && !r.err);
    const col = (f) => `${f0(med(g.map(f)))}/${f0(mx(g.map(f)))}`;
    console.log(art.padEnd(13) + ('x' + d).padEnd(5) + app.padEnd(22) + visit.padEnd(9) + col((r) => r.bild).padStart(11) + col((r) => r.aufgabe).padStart(11) + col((r) => r.szeneTask).padStart(10) + col((r) => r.szeneGes).padStart(12) + String(g.reduce((x, r) => x + r.s50, 0)).padStart(6) + col((r) => r.tropfen).padStart(11) + col((r) => r.neu).padStart(11) + '   ' + g.length);
  }
  console.log('(median/largest over the changes of all runs; ms. S>50: count of long tasks that are mostly scene work, all runs together)');
}

if (was === 'handy' || was === 'desktop') {
  const formats = was === 'desktop' ? a.format.split(',') : [''];
  for (const fm of formats) for (const d of drossel) for (const [name, url] of apps) {
    await series(was, name, url, look, d, { format: fm, netz: a.netz });
    if (a.ohne) await series(was, name, url, '', d, { format: fm, netz: a.netz });
  }
  table();
} else if (was === 'landschaft') {
  const T = +new Date('2026-11-13T15:27:45+01:00');
  for (const d of drossel) for (const [name, url] of apps) for (let run = 0; run < laeufe; run++) {
    const o = await open(url, { kind: 'desktop', lk: look, zeit: T }); if (!run) console.log(`${name}: ${o.look}`);
    await o.cdp.send('Emulation.setCPUThrottlingRate', { rate: d });
    const r = await o.page.evaluate(() => new Promise((resolve) => {
      const rw = window.__rw; rw.calls.length = 0; const t0 = performance.now(); const first = document.querySelector('.land img:last-child'); const src0 = first && first.currentSrc; let changed = 0, shown = 0;
      const poll = () => { const all = document.querySelectorAll('.land img'), i = all[all.length - 1], s = i && i.currentSrc; if (!changed && s && s !== src0 && i.complete) changed = performance.now(); const info = window.Wasser && window.Wasser.info; if (changed && !shown && info && info.scene === s) shown = performance.now(); if (performance.now() - t0 < 20000) requestAnimationFrame(poll); };
      requestAnimationFrame(poll);
      setTimeout(() => {
        const sum = (from, to) => rw.calls.filter((c) => c.k === 'szene' && c.s >= from && c.s < to).reduce((x, c) => x + c.d, 0); const long = rw.long.filter((l) => l.s >= t0);
        resolve({ von: src0 && src0.split('/').pop(), nach: [...document.querySelectorAll('.land img')].pop().currentSrc.split('/').pop(), szeneGes: sum(t0, t0 + 20000), szeneTask: long.length ? Math.max(0, ...long.map((l) => sum(l.s, l.s + l.d))) : 0, s50: long.filter((l) => l.d > 50 && sum(l.s, l.s + l.d) > l.d / 2).length, aufgabe: long.length ? Math.max(...long.map((l) => l.d)) : 0, lang: long.length, neu: changed && shown ? shown - changed : null });
      }, 20000);
    }));
    console.log(`${name.padEnd(10)} x${d} run ${run + 1}: ${r.von} -> ${r.nach} | Szene ges. ${f0(r.szeneGes)} ms, in einer Aufgabe ${f0(r.szeneTask)} ms, S>50 ${r.s50} | längste Aufgabe ${f0(r.aufgabe)} ms (${r.lang} über 50 ms in 20 s) | Tropfen zeigen die neue Landschaft ${f0(r.neu)} ms nach dem Laden`);
    rows.push({ app: name, drossel: d, ...r });
    await o.ctx.close();
  }
} else if (was === 'profil') {
  for (const [name, url] of apps) {
    const o = await open(url, { kind: 'handy', lk: look }); console.log(`${name}: ${o.look}`);
    for (const t of ORDER.handy) { await o.page.evaluate(CHANGE, [BAR.handy, t, SCENE.handy, 900]); }   // every scene seen once
    await o.cdp.send('Emulation.setCPUThrottlingRate', { rate: drossel[0] });
    await o.cdp.send('Profiler.enable'); await o.cdp.send('Profiler.setSamplingInterval', { interval: 200 });
    for (const t of ['Mehr', 'Projekte']) {
      await o.cdp.send('Profiler.start'); await o.page.evaluate(CHANGE, [BAR.handy, t, SCENE.handy, 450]); const { profile } = await o.cdp.send('Profiler.stop');
      const byId = new Map(profile.nodes.map((x) => [x.id, x])), parent = new Map(); for (const x of profile.nodes) for (const c of x.children || []) parent.set(c, x.id);
      const total = new Map(), key = (n) => `${n.callFrame.functionName || '(anon)'}${n.callFrame.url ? ' ' + n.callFrame.url.split('/').pop() : ''}`;
      profile.samples.forEach((id, i) => { const dt = (profile.timeDeltas[i] || 0) / 1000; const seen = new Set(); for (let c = id; c !== undefined; c = parent.get(c)) { const k = key(byId.get(c)); if (!seen.has(k)) { seen.add(k); total.set(k, (total.get(k) || 0) + dt); } } });
      console.log(`\n== ${name}, ${t}, CPU x${drossel[0]}: time under each function (ms), the 18 largest ==`);
      for (const [k, v] of [...total.entries()].filter(([k]) => !/^\((idle|program|root|garbage collector)\)/.test(k)).sort((p, q) => q[1] - p[1]).slice(0, 18)) console.log(v.toFixed(1).padStart(8), k);
      await o.page.waitForTimeout(600);
    }
    await o.ctx.close();
  }
}
if (a.json) fs.writeFileSync(a.json, JSON.stringify(rows, null, 1));
await browser.close();
