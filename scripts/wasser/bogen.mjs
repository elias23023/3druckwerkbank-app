// BEHIND A SHEET: does what was tapped come to rest when the sheet it opened appears - and live again when the sheet goes?
// (The finding of 14.11.: docs/wasser-look/entwurf/stehenbleiben/BEFUND.md - a tapped drop stood still with its rings for as
// long as the sheet was open. Its first probe, probe.mjs beside the finding, is the record; this is the tool.)
//
//   node scripts/wasser/bogen.mjs [handy|desktop|alles] [--app name=address,...] [--toene dunkel,klar] [--faelle tropfen,glas,zeile,suche]
//        [--bewegung an,aus] [--out <dir>] [--bild]
//
//   handy     390 x 844 @2x;  desktop  2000 x 993 @2x (the pictures are for people)
//   Fälle (cases), each opened by a real pointer (phone: a touch; desktop: the mouse) on
//     tropfen   a live drop that opens a sheet - phone: the gear "Einstellungen" of the head; desktop: "Ergebnis buchen" on the
//               main panel of the world Druck (a primary button on a panel is a live drop), beside the drawer
//     glas      something of plain glass that opens one - phone: the chip of the workshop in the head (sheet "Bereich");
//               desktop: "verwalten" in the head of a panel (world Druck, sheet "Geräte")
//     zeile     a row that opens one - phone: the running print on Start ("Läuft gerade"); desktop: the running print in the
//               left column of Heute
//     suche     the search - phone: the drop "Suche" of the head; desktop: the glass chip "Suche" of the top bar
//   --bewegung  an = motion as it is, aus = reduced motion (the water is one still picture: then the rest pose can be compared
//               pixel for pixel)
//   --app     the apps (default jetzt=WASSER_APP or :4173); two of them (vorher=...,nachher=...) are put side by side in --bild
//
// What is looked at, per case (the picture: the element and 26 px around it; the drop: its own canvas, read pixel by pixel -
// what it shows before the dimming of the sheet is laid over it):
//   REF       the same sheet opened WITHOUT touching anything (element.click(): no pointer, no press, no ring) - the element at
//             rest under the same dimming
//   then the real tap, and pictures 60, 200, 400, 600, 1000, 1500, 2500 ms after it
//   steht     the drop's canvas no longer changes from 600 ms on (600 = 1000 = 2500); for the picture, which also holds the
//             ring of light on the floor of a card (it runs out in 1.1 s, nothing holds it): 1500 = 2500
//   Ruhe      the drop's script reports no drop behind the sheet still answering 600 ms after the tap (Wasser.info.settling = 0;
//             a script without that count: -); with --bewegung aus the canvas at 600 ms is the REF canvas, pixel for pixel,
//             and so is the picture
//   lebt      after the sheet closed the drop's canvas changes again within 1 s (with motion)
//   Sprung    the change of the drop's canvas from its last picture behind the sheet to its first after it, against the change
//             between two pictures at rest (mean of |difference| in 0..255; "x 1.4" = 1.4 times a step at rest). A drop that
//             went on with the water time of the page instead of its own would jump by many steps at once.
// Each line: ok / FAIL and the numbers. Exit code 1 when a case fails in an app named "jetzt" or "nachher" (an app named
// otherwise, e.g. vorher, is only shown). --bild: one strip per case (REF, the seven pictures, after closing), apps one under
// the other, in --out (default: a scratch folder that is named).
import fs from 'fs'; import path from 'path';
import { pw, args, fail, mkdir, outDir, strip, stack, diff, lookBefore, lookAfter, setTheme, tonOf, wetterRoute, zeitOf, APP } from './lib.mjs';

const a = args({ app: '', toene: 'dunkel,klar', faelle: 'tropfen,glas,zeile,suche', bewegung: 'an,aus', out: '' }, { flags: ['bild'], choices: { toene: ['dunkel', 'klar'], faelle: ['tropfen', 'glas', 'zeile', 'suche'], bewegung: ['an', 'aus'] } });
const WAS = ['handy', 'desktop', 'alles']; const was = a._[0] || 'alles'; if (!WAS.includes(was) || a._.length > 1) fail(`"${a._.join(' ')}": one of ${WAS.join(' | ')} (nothing = alles)`);
const apps = (a.app || `jetzt=${APP}`).split(',').map((x) => { const i = x.indexOf('='); if (i < 1) fail(`--app ${x}: name=address`); return [x.slice(0, i), x.slice(i + 1).replace(/\/$/, '')]; });
const list = (v) => v.split(',').filter(Boolean); const od = outDir(a.out, 'bogen'), out = od.dir;
const TIMES = [60, 200, 400, 600, 1000, 1500, 2500];

// the cases: where to go, what to tap, how to close
const CASES = {
  handy: {
    tropfen: { hash: '#/start', sel: '.m-head [aria-label="Einstellungen"]', open: '.sheet', close: 'sheet' },
    glas: { hash: '#/start', sel: '.m-head .ws-chip', open: '.sheet', close: 'sheet' },
    zeile: { hash: '#/start', sel: '.m-main .m-row--click', open: '.sheet', close: 'sheet' },
    suche: { hash: '#/start', sel: '.m-head [aria-label="Suche"]', open: '.cmd-back', close: 'escape' },
  },
  desktop: {
    tropfen: { hash: '#/druck', sel: '.panel--haupt .btn--primary', open: '.sheet', close: 'sheet' },
    glas: { hash: '#/druck', sel: '.panel__head .btn', text: 'verwalten', open: '.sheet', close: 'sheet' },
    zeile: { hash: '#/heute', sel: '.panel-col--left .item--click', open: '.sheet', close: 'sheet' },
    suche: { hash: '#/start', sel: '.topbar .topbar__search', open: '.cmd-back', close: 'escape' },
  },
};

const browser = await pw.chromium.launch(); let fails = 0; const strips = {};
const diffMean = (x, y) => { if (!x || !y || x.length !== y.length) return null; let s = 0; for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i]); return s / x.length; };

async function open(kind, url, ton, reduced) {
  const [w, h] = kind === 'handy' ? [390, 844] : [2000, 993];
  const t0 = zeitOf(ton === 'klar' ? 'tag' : 'nacht');
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, timezoneId: 'Europe/Vienna', locale: 'de-AT', reducedMotion: reduced ? 'reduce' : 'no-preference', ...(kind === 'handy' ? { isMobile: true, hasTouch: true } : {}) });
  await ctx.addInitScript((t) => { const R = Date, off = t - R.now(); class D extends R { constructor(...x) { if (x.length) super(...x); else super(R.now() + off); } static now() { return R.now() + off; } } window.Date = D; }, t0);
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await wetterRoute(page, 'klar', t0);
  const root = kind === 'handy' ? '.m-shell' : '.stage';
  const st = await lookBefore(page, 'eingebaut'); await page.goto(url + '/#/start', { waitUntil: 'networkidle' }); await page.waitForSelector(root);
  const got = await lookAfter(page, st, root);
  if (await setTheme(page, ton)) await page.waitForSelector(root);
  if (await tonOf(page) !== ton) throw new Error(`tone ${ton} not set`);
  await page.waitForTimeout(2500);
  return { page, ctx, errors, look: got.text };
}

async function run(kind, name, url, ton, reduced, key, c) {
  const o = await open(kind, url, ton, reduced); const p = o.page; const label = `${kind} ${name} ${ton} ${reduced ? 'still' : 'bewegt'} ${key}`;
  await p.evaluate((h) => { location.hash = h; }, c.hash); await p.waitForTimeout(1800);
  if (kind === 'desktop') { await p.mouse.move(3, 990); await p.evaluate(() => { const s = document.querySelector('.stage'); if (s) { s.scrollLeft = 0; s.scrollTop = 0; } }); }
  const loc = c.text ? p.locator(c.sel, { hasText: c.text }).first() : p.locator(c.sel).first();
  if (!(await loc.count())) { console.log(`--   ${label}: nothing matches ${c.sel} here`); await o.ctx.close(); return; }
  const box = await loc.boundingBox(); const pad = 26;
  const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + 2 * pad, height: box.height + 2 * pad };
  await p.evaluate(([sel, text]) => { const all = [...document.querySelectorAll(sel)]; const el = text ? all.find((e) => e.textContent.includes(text)) : all[0]; el.setAttribute('data-bogen-ziel', ''); }, [c.sel, c.text || '']);
  const canvas = () => p.evaluate(() => { const cv = document.querySelector('[data-bogen-ziel] > .w3-drop'); if (!cv || !cv.width) return null; return Array.from(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data); });
  const info = () => p.evaluate(() => { const i = window.Wasser && window.Wasser.info; return i ? { settling: i.settling, resting: i.resting } : null; });
  const dir = mkdir(path.join(out, label.replace(/ /g, '-'))); const shot = (n) => p.screenshot({ path: `${dir}/${n}.png`, clip });
  const closeIt = async () => { if (c.close === 'escape') await p.keyboard.press('Escape'); else await p.evaluate(() => { const b = [...document.querySelectorAll('.sheet .sheet__head button')].pop(); if (b) b.click(); }); await p.waitForTimeout(900); };
  // a step at rest: two pictures of the drop's canvas
  const r1 = await canvas(); await p.waitForTimeout(250); const r2 = await canvas(); const step = diffMean(r1, r2);
  await shot('0-ruhe');
  // REF: opened without touching anything
  await p.evaluate(() => document.querySelector('[data-bogen-ziel]').click()); await p.waitForSelector(c.open, { timeout: 4000 }); await p.waitForTimeout(900);
  await shot('1-ref'); const ref = await canvas(); await closeIt();
  // the real tap
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  if (kind === 'handy') await p.touchscreen.tap(cx, cy); else { await p.mouse.move(cx, cy); await p.waitForTimeout(300); await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up(); }
  const t0 = Date.now(); const cv = {}; let inf600 = null;
  for (const t of TIMES) { const wait = t - (Date.now() - t0); if (wait > 0) await p.waitForTimeout(wait); await shot(`2-${String(t).padStart(4, '0')}`); cv[t] = await canvas(); if (t === 600) inf600 = await info(); }
  const opened = await p.evaluate((s) => !!document.querySelector(s), c.open);
  // close it, and watch the drop wake: its last picture behind the sheet, its first after it, and 1 s later
  const frozen = cv[2500];
  if (c.close === 'escape') await p.keyboard.press('Escape'); else await p.evaluate(() => { const b = [...document.querySelectorAll('.sheet .sheet__head button')].pop(); if (b) b.click(); });
  let first = null; const tc = Date.now(); while (Date.now() - tc < 1200) { const x = await canvas(); if (x && frozen && diffMean(x, frozen) > 0) { first = x; break; } await p.waitForTimeout(16); }
  await p.waitForTimeout(1000); const later = await canvas(); await shot('3-danach');
  const drop = !!r1;
  const eq = (x, y) => x && y && diffMean(x, y) === 0;
  const fileEq = async (f1, f2) => fs.readFileSync(`${dir}/${f1}.png`).equals(fs.readFileSync(`${dir}/${f2}.png`)) || (await diff(`${dir}/${f1}.png`, `${dir}/${f2}.png`)).outside === 0;
  const res = { opened, drop };
  if (drop) {
    res.steht = eq(cv[600], cv[1000]) && eq(cv[1000], cv[2500]);
    res.ruhe = inf600 ? inf600.settling === 0 : null;
    if (reduced) res.wieRef = eq(cv[600], ref);
    res.sprung = first && step ? +(diffMean(first, frozen) / step).toFixed(2) : null;
    res.lebt = reduced ? null : !!(later && frozen && diffMean(later, frozen) > 0);
  }
  res.bildSteht = await fileEq('2-1500', '2-2500');
  if (reduced) res.bildWieRef = await fileEq('2-0600', '1-ref') || await fileEq('2-1000', '1-ref');
  const must = ['opened', 'steht', 'bildSteht', ...(reduced ? ['wieRef', 'bildWieRef'] : ['lebt'])].filter((k) => k in res);
  const bad = must.filter((k) => res[k] === false); const sprungBad = drop && !reduced && res.sprung !== null && res.sprung > 3;
  const counts = /^(jetzt|nachher)$/.test(name); const ok = !bad.length && !sprungBad && res.ruhe !== false;
  if (!ok && counts) fails++;
  console.log(`${ok ? 'ok  ' : counts ? 'FAIL' : 'anders'} ${label.padEnd(36)} ${JSON.stringify(res)}${step !== null && drop ? ` step at rest ${step.toFixed(3)}` : ''}`);
  if (o.errors.length) console.log('     page errors:', o.errors.slice(0, 2).join(' | '));
  const frames = [{ file: `${dir}/0-ruhe.png`, label: 'vorher, ruhig' }, { file: `${dir}/1-ref.png`, label: 'REF (ohne Tippen)' }, ...TIMES.map((t) => ({ file: `${dir}/2-${String(t).padStart(4, '0')}.png`, label: `${t} ms` })), { file: `${dir}/3-danach.png`, label: 'zu, +1 s' }];
  (strips[`${kind} ${ton} ${reduced ? 'still' : 'bewegt'} ${key}`] ||= []).push({ name, frames });
  await o.ctx.close();
}

const kinds = was === 'alles' ? ['handy', 'desktop'] : [was];
for (const kind of kinds) for (const ton of list(a.toene)) for (const mot of list(a.bewegung)) for (const key of list(a.faelle)) for (const [name, url] of apps) await run(kind, name, url, ton, mot === 'aus', key, CASES[kind][key]);
if (a.bild) {
  for (const [k, rows] of Object.entries(strips)) {
    const files = []; for (const r of rows) files.push(await strip(r.frames, `${out}/${k.replace(/ /g, '-')}-${r.name}.png`, { title: `${r.name}: ${k}`, scale: k.startsWith('handy') ? 1.5 : 1, captionSize: 14, gap: 8 }));
    await stack(files, `${out}/${k.replace(/ /g, '-')}.png`); for (const f of files) fs.rmSync(f);
  }
  console.log(`pictures: ${out}`);
}
await browser.close();
if (!a.bild) od.keep(false);
console.log(fails ? `\n${fails} case(s) FAILED` : '\nall cases passed');
process.exit(fails ? 1 : 0);
