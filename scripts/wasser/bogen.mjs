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
//     glas      a plain-glass button that opens one - desktop: "verwalten" in the head of a panel (world Druck, sheet "Geräte").
//               The phone has none (its ghost buttons navigate, the buttons of its rows act in place): skipped there
//     zeile     a row that opens one - phone: the running print on Start ("Läuft gerade"); desktop: the running print in the
//               left column of Heute
//     suche     the search - phone: the drop "Suche" of the head; desktop: the glass chip "Suche" of the top bar
//   --bewegung  an = motion as it is, aus = reduced motion (the water is one still picture: then the rest pose can be compared
//               pixel for pixel)
//   --app     the apps (default jetzt=WASSER_APP or :4173); two of them (vorher=...,nachher=...) are put side by side in --bild
//
// What is looked at, per case. The stage itself is held still (islands, clouds - not the look; a panel's blur shows them move),
// the app's clock stands. The picture: the element and 26 px around it, without what the open sheet or search panel covers.
// The drop: its own canvas, read pixel by pixel - what it shows before the dimming of the sheet is laid over it - and sampled
// in the page at every frame from just before the tap.
//   REF       the same sheet opened WITHOUT touching anything (element.click(): no pointer, no press, no ring) - the element at
//             rest under the same dimming
//   then the real tap, and pictures about 60, 200, 400, 600, 1000, 1500, 2500 ms after it (a screenshot takes time: the real
//             times are printed, "zeiten", and under the pictures)
//   ruhtNach  ms from the first frame in which the sheet was there to the drop's last change: its answer ends behind the
//             sheet; "steht" = at most 600 ms
//   klingtAus the drop changed at all after the sheet appeared (with motion). A drop frozen in the middle of its answer - the
//             finding - does not
//   Ruhe      600 ms after the tap the script reports no drop behind the sheet still answering (Wasser.info.settling = 0;
//             a script without that count: null)
//   wieRef    with --bewegung aus (the water is one still picture): the drop's canvas at 600 and 2500 ms IS the REF canvas, pixel
//             for pixel. (On the phone a touch lifts before the sheet opens, so even the old script showed the rest pose
//             there; the desktop's mouse rests on the drop and tells them apart)
//   endet     an element that is no drop (plain glass, a row): 600 ms after the tap none of its finite animations or
//             transitions runs and its transform is the one it had at rest
//   bildSteht the picture at 1500 ms = the one at 2500 ms (the ring of light on a card's floor runs out within 1.1 s; nothing
//             holds it); with --bewegung aus also bildWieRef: the pictures at 1000 and 2500 ms = REF. "=" allows 6 of 255
//             (NOISE): the desktop once showed a whole clip 4 of 255 brighter between two stills of a page at rest - a blurred
//             layer rastered anew; a ring or a press differs by tens. bildMax / refMax: the largest difference found
//   lebt      after the sheet closed the drop's canvas changes again within 1 s (with motion)
//   Sprung    the change of the drop's canvas from its last picture behind the sheet to its first after it, against the change
//             between two pictures at rest (mean of |difference| in 0..255; "x 1.4" = 1.4 times a step at rest). A drop that
//             went on with the water time of the page instead of its own would jump by many steps at once. More than 3: fails
//   The tap: phone a finger held 90 ms (DevTools touch events), desktop the mouse resting 0.3 s on it, then held 90 ms
// Each line: ok / FAIL and the numbers. Exit code 1 when a case fails in an app named "jetzt" or "nachher" (an app named
// otherwise, e.g. vorher, is only shown: "anders"). --bild: one strip per case (at rest, REF, the seven pictures, after
// closing), apps one under the other, in --out (default: a scratch folder that is named, kept only with --bild).
import fs from 'fs'; import path from 'path';
import { pw, args, fail, mkdir, outDir, strip, stack, diff, lookBefore, lookAfter, setTheme, tonOf, wetterRoute, zeitOf, APP } from './lib.mjs';

const a = args({ app: '', toene: 'dunkel,klar', faelle: 'tropfen,glas,zeile,suche', bewegung: 'an,aus', out: '' }, { flags: ['bild'], choices: { toene: ['dunkel', 'klar'], faelle: ['tropfen', 'glas', 'zeile', 'suche'], bewegung: ['an', 'aus'] } });
const WAS = ['handy', 'desktop', 'alles']; const was = a._[0] || 'alles'; if (!WAS.includes(was) || a._.length > 1) fail(`"${a._.join(' ')}": one of ${WAS.join(' | ')} (nothing = alles)`);
const apps = (a.app || `jetzt=${APP}`).split(',').map((x) => { const i = x.indexOf('='); if (i < 1) fail(`--app ${x}: name=address`); return [x.slice(0, i), x.slice(i + 1).replace(/\/$/, '')]; });
const list = (v) => v.split(',').filter(Boolean); const od = outDir(a.out, 'bogen'), out = od.dir;
const TIMES = [60, 200, 400, 600, 1000, 1500, 2500];
const NOISE = 6;   // of 255: what two pictures of the same still page may differ by (a blurred layer rastered anew)

// the cases: where to go, what to tap, how to close
const CASES = {
  handy: {
    tropfen: { hash: '#/start', sel: '.m-head [aria-label="Einstellungen"]', open: '.sheet', cover: '.sheet', close: 'sheet' },
    glas: null,   // (the phone has no plain-glass button that opens a sheet: its ghost buttons navigate, its row buttons act in place)
    zeile: { hash: '#/start', sel: '.m-main .m-row--click', open: '.sheet', cover: '.sheet', close: 'sheet' },
    suche: { hash: '#/start', sel: '.m-head [aria-label="Suche"]', open: '.cmd-back', cover: '.cmd', close: 'escape' },
  },
  desktop: {
    tropfen: { hash: '#/druck', sel: '.panel--haupt .btn--primary', open: '.sheet', cover: '.sheet', close: 'sheet' },
    glas: { hash: '#/druck', sel: '.panel__head .btn', text: 'verwalten', open: '.sheet', cover: '.sheet', close: 'sheet' },
    zeile: { hash: '#/heute', sel: '.panel-col--left .item--click', open: '.sheet', cover: '.sheet', close: 'sheet' },
    suche: { hash: '#/start', sel: '.topbar .topbar__search', open: '.cmd-back', cover: '.cmd', close: 'escape' },
  },
};

const browser = await pw.chromium.launch(); let fails = 0; const strips = {};
const diffMean = (x, y) => { if (!x || !y || x.length !== y.length) return null; let s = 0; for (let i = 0; i < x.length; i++) s += Math.abs(x[i] - y[i]); return s / x.length; };

// held still for the pictures, both sides alike: the stage itself (islands float, clouds drift, leaves fall - none of it is the
// look, and the panels' blur shows it moving), the caret; the app's clock stands (its live numbers stay)
const STILL = '.stage > :not(.ui), .stage > :not(.ui) * { animation-play-state: paused !important; transition: none !important; } .cloudbank { animation: none !important; } *, *::before, *::after { caret-color: transparent !important; }';
async function open(kind, url, ton, reduced) {
  const [w, h] = kind === 'handy' ? [390, 844] : [2000, 993];
  const t0 = zeitOf(ton === 'klar' ? 'tag' : 'nacht');
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, timezoneId: 'Europe/Vienna', locale: 'de-AT', reducedMotion: reduced ? 'reduce' : 'no-preference', ...(kind === 'handy' ? { isMobile: true, hasTouch: true } : {}) });
  const page = await ctx.newPage(); const errors = []; page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));
  await page.clock.setFixedTime(new Date(t0)); await wetterRoute(page, 'klar', t0);
  const root = kind === 'handy' ? '.m-shell' : '.stage';
  const st = await lookBefore(page, 'eingebaut'); await page.goto(url + '/#/start', { waitUntil: 'networkidle' }); await page.waitForSelector(root);
  const got = await lookAfter(page, st, root);
  if (await setTheme(page, ton)) await page.waitForSelector(root);
  if (await tonOf(page) !== ton) throw new Error(`tone ${ton} not set`);
  await page.addStyleTag({ content: STILL });
  await page.waitForTimeout(2500);
  return { page, ctx, errors, look: got.text };
}

async function run(kind, name, url, ton, reduced, key, c) {
  if (!c) { console.log(`--   ${kind} ${name} ${ton} ${key}: no such case on this shell`); return; }
  const o = await open(kind, url, ton, reduced); const p = o.page; const label = `${kind} ${name} ${ton} ${reduced ? 'still' : 'bewegt'} ${key}`;
  await p.evaluate((h) => { location.hash = h; }, c.hash); await p.waitForTimeout(1800);
  if (kind === 'desktop') { await p.mouse.move(3, 990); await p.evaluate(() => { const s = document.querySelector('.stage'); if (s) { s.scrollLeft = 0; s.scrollTop = 0; } }); }
  const loc = c.text ? p.locator(c.sel, { hasText: c.text }).first() : p.locator(c.sel).first();
  if (!(await loc.count()) || !(await loc.boundingBox())) { console.log(`--   ${label}: nothing visible matches ${c.sel} here`); await o.ctx.close(); return; }
  const box = await loc.boundingBox(); const pad = 26;
  const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + 2 * pad, height: box.height + 2 * pad };
  await p.evaluate(([sel, text]) => { const all = [...document.querySelectorAll(sel)]; const el = text ? all.find((e) => e.textContent.includes(text)) : all[0]; el.setAttribute('data-bogen-ziel', ''); }, [c.sel, c.text || '']);
  const canvas = () => p.evaluate(() => { const cv = document.querySelector('[data-bogen-ziel] > .w3-drop'); if (!cv || !cv.width) return null; return Array.from(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data); });
  const state = () => p.evaluate(() => { const el = document.querySelector('[data-bogen-ziel]'), i = window.Wasser && window.Wasser.info; return { transform: el ? getComputedStyle(el).transform : null, running: el ? el.getAnimations({ subtree: true }).filter((x) => x.playState === 'running' && x.effect && x.effect.getComputedTiming().iterations !== Infinity).length : null, settling: i ? i.settling : undefined }; });
  // what covers the clip once the sheet is open (the sheet, the search panel): left out of the picture comparisons, in px of a clip shot
  const cover = () => p.evaluate(([sel, clip]) => { const e = document.querySelector(sel); if (!e) return []; const r = e.getBoundingClientRect(); return [[Math.floor((r.left - clip.x) * 2), Math.floor((r.top - clip.y) * 2), Math.ceil((r.right - clip.x) * 2), Math.ceil((r.bottom - clip.y) * 2)]]; }, [c.cover, clip]);
  const dir = mkdir(path.join(out, label.replace(/ /g, '-'))); const shot = (n) => p.screenshot({ path: `${dir}/${n}.png`, clip });
  const closeIt = async () => { if (c.close === 'escape') await p.keyboard.press('Escape'); else await p.evaluate(() => { const b = [...document.querySelectorAll('.sheet .sheet__head button')].pop(); if (b) b.click(); }); await p.waitForTimeout(900); };
  // a step at rest: two pictures of the drop's canvas
  const r1 = await canvas(); await p.waitForTimeout(250); const r2 = await canvas(); const step = diffMean(r1, r2); const rest = await state();
  await shot('0-ruhe');
  // REF: opened without touching anything
  await p.evaluate(() => document.querySelector('[data-bogen-ziel]').click()); await p.waitForSelector(c.open, { timeout: 4000 }); await p.waitForTimeout(900);
  await shot('1-ref'); const ref = await canvas(); const covered = await cover(); await closeIt();
  // the drop's canvas, sampled in the page at every frame from just before the tap: when did the sheet appear, when did the drop last change?
  await p.evaluate((open) => { const log = window.__bogen = []; const t0 = performance.now(); window.__bogenT0 = t0;
    const hash = () => { const cv = document.querySelector('[data-bogen-ziel] > .w3-drop'); if (!cv || !cv.width) return 0; const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let h = 0; for (let i = 0; i < d.length; i++) h = (h * 31 + d[i]) | 0; return h; };
    const f = () => { const t = performance.now() - t0; log.push([t, hash(), !!document.querySelector(open)]); if (t < 3000) requestAnimationFrame(f); }; requestAnimationFrame(f); }, c.open);
  // the real tap
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  if (kind === 'handy') {   // a finger: down, 90 ms, up (Playwright's tap lasts no time at all - no drop answers that much)
    const cdp = await o.ctx.newCDPSession(p); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cx, y: cy }] }); await p.waitForTimeout(90); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach();
  } else { await p.mouse.move(cx, cy); await p.waitForTimeout(300); await p.mouse.down(); await p.waitForTimeout(90); await p.mouse.up(); }
  const t0 = Date.now(); const cv = {}, took = {}; let st600 = null;
  for (const t of TIMES) { const wait = t - (Date.now() - t0); if (wait > 0) await p.waitForTimeout(wait); took[t] = Date.now() - t0; if (t === 600) st600 = await state(); cv[t] = await canvas(); await shot(`2-${String(t).padStart(4, '0')}`); }
  await p.waitForTimeout(Math.max(0, 3100 - (Date.now() - t0)));
  const log = await p.evaluate(() => window.__bogen);
  const opened = await p.evaluate((s) => !!document.querySelector(s), c.open);
  // close it, and watch the drop wake: its last picture behind the sheet, its first after it, and 1 s later
  const frozen = await canvas();
  if (c.close === 'escape') await p.keyboard.press('Escape'); else await p.evaluate(() => { const b = [...document.querySelectorAll('.sheet .sheet__head button')].pop(); if (b) b.click(); });
  let first = null; const tc = Date.now(); while (Date.now() - tc < 1200) { const x = await canvas(); if (x && frozen && diffMean(x, frozen) > 0) { first = x; break; } await p.waitForTimeout(16); }
  await p.waitForTimeout(1000); const later = await canvas(); await shot('3-danach');
  const drop = !!r1;
  const eq = (x, y) => x && y && diffMean(x, y) === 0;
  const picDiff = async (f1, f2) => { const d = await diff(`${dir}/${f1}.png`, `${dir}/${f2}.png`, covered); return d.outside ? d.maxOutside : 0; };   // largest difference outside what the sheet covers, 0..255
  const res = { opened, drop };
  const iSheet = log.findIndex((x) => x[2]); const tSheet = iSheet >= 0 ? log[iSheet][0] : null;
  let lastChange = null, changes = 0; for (let i = iSheet + 1; iSheet >= 0 && i < log.length; i++) if (log[i][1] !== log[i - 1][1]) { lastChange = log[i][0]; changes++; }
  if (drop) {
    res.ruhtNach = tSheet === null ? null : Math.round(lastChange === null ? 0 : lastChange - tSheet);   // ms from the first frame with the sheet to the drop's last change
    res.steht = res.ruhtNach !== null && res.ruhtNach <= 600;
    res.ruhe = st600 && typeof st600.settling === 'number' ? st600.settling === 0 : null;
    if (!reduced) res.klingtAus = changes > 0;                  // it went on after the sheet appeared (a drop frozen in the middle of its answer does not)
    if (reduced) res.wieRef = eq(cv[600], ref) && eq(cv[2500], ref);
    res.sprung = first && step ? +(diffMean(first, frozen) / step).toFixed(2) : null;
    res.lebt = reduced ? null : !!(later && frozen && diffMean(later, frozen) > 0);
  } else {
    res.endet = st600 ? st600.running === 0 && st600.transform === rest.transform : null;   // its own answer (a transition of :active) has ended, it stands where it stood
  }
  // pictures: up to NOISE of 255 is the browser rastering a blurred layer anew (seen on the desktop over a whole clip at once);
  // a ring or a press differs by tens
  const d1 = await picDiff('2-1500', '2-2500'); res.bildSteht = d1 <= NOISE; res.bildMax = d1;
  if (reduced) { const d2 = Math.max(await picDiff('2-1000', '1-ref'), await picDiff('2-2500', '1-ref')); res.bildWieRef = d2 <= NOISE; res.refMax = d2; }
  res.zeiten = Object.values(took).join('/');
  const must = ['opened', 'steht', 'endet', 'bildSteht', ...(reduced ? ['wieRef', 'bildWieRef'] : ['lebt', 'klingtAus'])].filter((k) => k in res);
  const bad = must.filter((k) => res[k] === false); const sprungBad = drop && !reduced && res.sprung !== null && res.sprung > 3;
  const counts = /^(jetzt|nachher)$/.test(name); const ok = !bad.length && !sprungBad && res.ruhe !== false;
  if (!ok && counts) fails++;
  console.log(`${ok ? 'ok  ' : counts ? 'FAIL' : 'anders'} ${label.padEnd(36)} ${JSON.stringify(res)}${step !== null && drop ? ` step at rest ${step.toFixed(3)}` : ''}`);
  if (o.errors.length) console.log('     page errors:', o.errors.slice(0, 2).join(' | '));
  const frames = [{ file: `${dir}/0-ruhe.png`, label: 'vorher, ruhig' }, { file: `${dir}/1-ref.png`, label: 'REF (ohne Tippen)' }, ...TIMES.map((t) => ({ file: `${dir}/2-${String(t).padStart(4, '0')}.png`, label: `${took[t]} ms` })), { file: `${dir}/3-danach.png`, label: 'zu, +1 s' }];
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
