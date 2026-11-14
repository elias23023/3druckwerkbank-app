// The desktop template, looked at: the REAL app at desktop size with the template injected (nothing is built in).
// Needs the built app:  npm run build && npm run preview   (in a second terminal; "zeigen" only needs the build)
//
//   node scripts/wasser/desktop.mjs zeigen [--port 4320] [--look <folder>]
//        A small server with the built app and the template on top - open it in YOUR browser and use the app:
//        http://localhost:4320 (wide window = desktop template, narrow = mobile template). The tone follows the app's own
//        setting "Erscheinungsbild" (Dunkel -> "dunkel", Hell -> "klar", Automatisch -> the hour); ?ton=klar or ?ton=dunkel
//        fixes it, ?ohne=1 shows the app as it is today, ?weich=aus the template without any blur (to compare on a machine
//        that stutters), ?leben=1.5 more light at rest.
//   node scripts/wasser/desktop.mjs bild <out-dir> [--format 2000|1920] [--ton klar] [--zeit nacht|tag|morgen|abend] [--nur start,heute] [--alles]
//        Stills: the eight worlds; with --alles also sheets, forms, settings, account, search, keyboard focus, a toast and the
//        empty workspace. NN-name.png plus contact sheets uebersicht-N.png.
//   node scripts/wasser/desktop.mjs film <out-dir> [--ton klar] [--nur dock,druck]
//        Motion as filmstrips: a panel at rest, the dock's marker, a button on a panel pressed (ring), the pointer over a row
//        of buttons, the drawer opening, the arrow beside the island pressed (pfeil), the running line of a print (fluss).
//   node scripts/wasser/desktop.mjs kontrast [--toene dunkel,klar] [--zeiten nacht,tag] [--format 2000]
//        WCAG contrast of the texts against the pixels really behind the glyphs (as kontrast.mjs does for the phone).
//   node scripts/wasser/desktop.mjs pruefen [--ton klar] [--format 1920]
//        Checks: few live drops in every world and none free over an island, nothing leaves its place while it is pressed,
//        the arrows beside the island, the dock's marker, the drawer, the search, a toast, the keyboard focus, sleep and
//        waking by the mouse, reduced motion, stop / start - and that no panel, title or island has moved against the app
//        without the look.
//   node scripts/wasser/desktop.mjs takt [--nur heute,wetter] [--sekunden 5]
//        What the look costs: pictures a second and work per picture for today's app, the template, and the template
//        without its lights / drops / blur.
//   node scripts/wasser/desktop.mjs clip <out.mp4> [--ton klar] [--zeit nacht]
//        A tour through the real app (about 80 s on the work machine), recorded through the browser's screencast; at its
//        end the app's setting "Erscheinungsbild: Hell" switches the tone to "klar".
// All take --look vorlage|ohne|<folder> (ohne = today's desktop), --engine chromium|webkit|firefox, --format, --reduced.
import fs from 'fs'; import path from 'path'; import http from 'http';
import { REPO, abs, mkdir, args, strip, sharp, lookDir, isTemplate } from './lib.mjs';
import { openDesktop, WELTEN } from './desktop-lib.mjs';

const a = args({ look: 'vorlage', format: '2000', ton: '', zeit: 'nacht', engine: 'chromium', nur: '', port: '4320', toene: 'dunkel,klar', zeiten: 'nacht,tag' });
const mode = a._[0]; const look = a.look === 'ohne' ? '' : a.look; const want = a.nur ? String(a.nur).split(',') : null; const only = (n) => !want || want.some((w) => n.includes(w));
const open = (o = {}) => openDesktop({ look, format: a.format, ton: a.ton, zeit: a.zeit, engine: a.engine, reduced: !!a.reduced, ...o });
const label = () => `${look ? 'Vorlage Desktop' : 'Desktop heute'}, ${a.format === '2000' ? '2000 x 993' : a.format === '1920' ? '1920 x 1080' : a.format}${look ? ', Ton ' + (a.ton || 'dunkel') : ''}, ${a.zeit}`;

/* ------------------------------------------------------------------ bild */
async function bild(out) {
  mkdir(out); const d = await open(); const p = d.page; const made = []; let n = 0;
  const step = async (name, fn, after) => {
    n++; const id = String(n).padStart(2, '0') + '-' + name; if (!only(name)) return;
    try { await fn(); await d.shot(`${out}/${id}.png`); made.push({ file: `${out}/${id}.png`, label: id }); } catch (e) { console.log('!!', id, String(e).split('\n')[0].slice(0, 160)); }
    try { if (after) await after(); } catch (e) { console.log('!! after', id, String(e).slice(0, 120)); }
  };
  for (const w of WELTEN) await step(w, () => d.welt(w));
  if (a.alles) {
    const weiter = () => d.click(p.locator('.sheet__foot .btn', { hasText: 'Weiter' }), 500);
    await step('bogen-projekt', () => d.sheet('projekt'), () => d.closeSheet());
    await step('bogen-projekt-art', async () => { await d.sheet('projekt'); await p.locator('.sheet .input').first().fill('Halter für die Gießkanne'); await weiter(); });
    await step('bogen-projekt-insel', async () => { await d.click(p.locator('.sheet .tile'), 300); await weiter(); await weiter(); }, () => d.closeSheet());
    await step('bogen-bearbeiten', () => d.sheet('projektBearbeiten'), () => d.closeSheet());
    await step('bogen-einstellungen', async () => { await d.go('heute'); await d.sheet('einstellungen'); }, () => d.closeSheet());
    await step('bogen-konto', () => d.sheet('konto'), () => d.closeSheet());
    await step('bogen-hinweise', () => d.sheet('hinweise'), () => d.closeSheet());
    await step('bogen-bereich', () => d.sheet('bereich'), () => d.closeSheet());
    await step('bogen-geraet', () => d.sheet('geraet'), () => d.closeSheet());
    await step('bogen-geraete', () => d.sheet('geraete'), () => d.closeSheet());
    await step('bogen-rolle', () => d.sheet('rolle'), () => d.closeSheet());
    await step('bogen-feld', async () => { await d.sheet('rolle'); const f = p.locator('.sheet .input').first(); await f.click(); await p.keyboard.type(' Test', { delay: 30 }); }, () => d.closeSheet());
    await step('suche', async () => { await d.go('heute'); await d.search('sens'); }, () => d.closeSearch());
    await step('tastatur', async () => { await d.go('heute'); for (let i = 0; i < 9; i++) await p.keyboard.press('Tab'); });
    await step('hinweis', () => d.toast());
    if (only('leer')) {
      try { await d.bereich('echt'); } catch (e) { console.log('!! bereich', String(e).slice(0, 120)); }
      for (const w of ['start', 'heute', 'projekte', 'druck', 'material']) await step('leer-' + w, () => d.go(w));
    }
  }
  if (d.errors.length) console.log('page errors:', d.errors.slice(0, 6));
  await d.close();
  for (let i = 0; i < made.length; i += 6) await strip(made.slice(i, i + 6), `${out}/uebersicht-${i / 6 + 1}.png`, { title: label(), scale: 0.33, cols: 3, palette: false });
  console.log('ok', out, made.length, 'pictures');
}

/* ------------------------------------------------------------------ film */
// Filmstrips: each motion as stills at fixed times, side by side, the time under each. Animations with an end (transitions,
// entrances, the ring, the marker's flight) are paused and set to the time under the still, so a slow machine does not
// matter; the drops (WebGL), the loops at rest and the stage itself keep running in real time.
async function film(out) {
  mkdir(out); const d = await open(); const p = d.page; const T = a.ton === 'klar' ? ' (Ton klar)' : ''; let cur = '', n = 0, frames = [];
  await p.evaluate(() => { const st = window.setTimeout; window.setTimeout = (f, t, ...x) => (t === 1700 ? 0 : st(f, t, ...x)); });   // the ring's own clean-up timer would remove it while we look at it
  const begin = (name) => { cur = name; n = 0; frames = []; };
  const shot = async (label, clip) => { await d.still(); const file = `${out}/${cur}-${n++}.png`; await p.screenshot(clip ? { path: file, clip } : { path: file }); frames.push({ file, label }); };
  const grab = async () => { const names = await p.evaluate(() => { window.__probe = document.getAnimations().filter((x) => (x.playState === 'running' || x.pending) && x.effect && x.effect.getComputedTiming().iterations !== Infinity && !(x.effect.target && x.effect.target.closest && x.effect.target.closest('.stage__bg, .frame')));   // (not the stage's own: leaves, islands)
    for (const x of window.__probe) { try { x.pause(); } catch (e) {} } return [...new Set(window.__probe.map((x) => ((x.effect && x.effect.pseudoElement) || '') + ':' + (x.animationName || x.transitionProperty || 'waapi')))].sort().join('  '); }); console.log(`   ${cur}: ${names || '(no animation)'}`); };
  const seek = async (t) => { await p.evaluate((t) => { (window.__probe || []).forEach((x) => { try { x.pause(); x.currentTime = t; } catch (e) {} }); }, t); await p.waitForTimeout(120); };
  const finish = async () => { await p.evaluate(() => { (window.__probe || []).forEach((x) => { try { x.finish(); } catch (e) {} }); window.__probe = []; }); await p.waitForTimeout(250); };
  const frames3 = () => p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r)))));
  const box = async (sel, pad = 12, nth = 0) => { const b = await p.locator(sel).nth(nth).boundingBox(); const x = Math.max(0, Math.floor(b.x - pad)), y = Math.max(0, Math.floor(b.y - pad)); return { x, y, width: Math.min(d.format.w - x, Math.ceil(b.width + 2 * pad)), height: Math.min(d.format.h - y, Math.ceil(b.height + 2 * pad)) }; };
  const union = (...bs) => { const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y)); return { x, y, width: Math.max(...bs.map((b) => b.x + b.width)) - x, height: Math.max(...bs.map((b) => b.y + b.height)) - y }; };
  const make = (title, note, opt = {}) => strip(frames, `${out}/${cur}.png`, { title: title + T, note, scale: 1, ...opt });
  const swallow = () => p.evaluate(() => window.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); }, { capture: true, once: true }));   // the click would open a sheet: the press and its ring are what we look at

  if (only('ruhe')) {
    begin('ruhe'); await d.go('druck', 3200); await d.park(); const clip = union(await box('.ui > .panel[style*="bottom"]', 14), await box('.dock', 10));
    let t = 0; for (const at of [0, 3000, 6000, 9000, 12000]) { await p.waitForTimeout(Math.max(0, at - t)); const t0 = Date.now(); await shot(`${at / 1000} s`, clip); t = at + (Date.now() - t0); }
    await make('In Ruhe: Licht wandert am Rand des großen Beckens und des Docks', 'Fünf Bilder im Abstand von drei Sekunden. Darunter, was sich gegenüber dem ersten Bild verändert hat: Randlichter, Bodenlicht, die Lauflinie des Drucks, die Perle, der Tropfen (und Laub hinter dem Wasser).', { scale: 0.5, diffGain: 8 });
  }
  if (only('dock')) {
    begin('dock'); await d.go('heute', 2600); await d.park(); const clip = await box('.dock', 18); await shot('vorher', clip);
    await p.locator('.dock button').nth(4).dispatchEvent('click'); await frames3(); await grab();
    for (const t of [70, 150, 240, 340, 460, 700]) { await seek(t); await shot(`${t} ms`, clip); }
    await finish(); await make('Dock: die Perle fließt von „Heute“ zu „Material“', 'Zeit nach dem Klick. Sie streckt sich, läuft voraus und setzt sich.', { cols: 4, scale: 0.8 });
  }
  if (only('druck')) {
    begin('druck'); await d.go('druck', 3000); await d.park(); const whole = await box('.ui > .panel[style*="bottom"]', 14); const clip = { x: whole.x, y: whole.y + Math.round(whole.height * 0.36), width: Math.round(whole.width * 0.6), height: whole.height - Math.round(whole.height * 0.36) }; const b = await p.locator('.panel .btn--primary').first().boundingBox(); const x = b.x + b.width * 0.5, y = b.y + b.height * 0.5;
    await shot('vorher', clip); await p.mouse.move(x, y); await p.waitForTimeout(350); await shot('Zeiger darüber', clip);
    await swallow(); await p.mouse.down(); await p.waitForTimeout(260); await shot('gedrückt', clip); await p.mouse.up(); await frames3(); await grab();
    for (const t of [120, 350, 650, 1000]) { await seek(t); await shot(`${t} ms nach dem Loslassen`, clip); }
    await finish(); await d.closeSheet(); await make('Knopf auf einem Panel gedrückt: EIN Ring läuft über den Boden des Beckens', 'Unter dem Zeiger wird der Tropfen heller, beim Drücken gibt er nach; der Ring startet beim Loslassen, in der Farbe des Wassers.', { cols: 4, scale: 0.9 });
  }
  if (only('zeiger')) {
    begin('zeiger'); await d.go('projekte', 3000); await d.park(); const row = p.locator('.project-hero .btn'); const k = await row.count(); const clip = union(await box('.project-hero .btn', 22, 0), await box('.project-hero .btn', 22, k - 1));
    await shot('Zeiger weg', clip);
    for (let i = 0; i < k; i++) { const b = await row.nth(i).boundingBox(); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 4 }); await p.waitForTimeout(420); await shot(`über Knopf ${i + 1}`, clip); }
    await make('Zeiger über einer Reihe von Knöpfen', 'Der Tropfen unter dem Zeiger gibt einen Hauch nach und wird heller, sonst bewegt sich nichts. (Freie Tropfen: sie brechen die Landschaft.)', { cols: 3, scale: 1.25 });
    begin('zeiger-panel'); await d.go('heute', 3000); await d.park(); const pc = await box('.panel-col--left', 12); await shot('Zeiger weg', pc);
    const it = await p.locator('.panel-col--left .item').nth(1).boundingBox(); await p.mouse.move(it.x + it.width * 0.4, it.y + it.height / 2, { steps: 5 }); await p.waitForTimeout(900); await shot('über einer Zeile, 0,9 s', pc);
    const ck = await p.locator('.panel-col--left .item--click').first().boundingBox(); await p.mouse.move(ck.x + ck.width * 0.5, ck.y + ck.height / 2, { steps: 5 }); await p.waitForTimeout(700); await shot('über einer klickbaren Zeile', pc);
    await make('Zeiger über einem Panel', 'In Ruhe trägt ein Panel sein Randlicht nur gedämpft; unter dem Zeiger wird es voll, und eine klickbare Zeile hellt auf.', { scale: 0.95 });
  }
  if (only('bogen')) {
    begin('bogen'); await d.go('heute', 2600); await d.park(); const w = Math.min(760, d.format.w), clip = { x: d.format.w - w, y: 0, width: w, height: d.format.h };
    await shot('vorher', clip); await p.locator('.topbar [aria-label="Einstellungen"]').dispatchEvent('click'); await frames3(); await grab();
    for (const t of [60, 140, 240, 400, 900]) { await seek(t); await shot(`${t} ms`, clip); }
    await finish(); await d.closeSheet(); await make('Schublade: der Bogen fließt von rechts herein und setzt sich', 'Zeit nach dem Klick auf „Einstellungen“. Die Bühne dahinter bleibt sichtbar: ein leichter Schleier, kein Weichzeichner.', { cols: 6, scale: 0.42 });
  }
  if (only('pfeil')) {   // the arrow beside the island gives way and KEEPS ITS PLACE (the line marks its centre at rest)
    begin('pfeil'); await d.go('projekte', 3000); await d.park(); const nav = p.locator('.carousel-nav').last(), b = await nav.boundingBox(), clip = await box('.carousel-nav', 52, 1);
    await p.evaluate(([x, y, w]) => { const l = document.createElement('i'); l.id = 'wa-probe-linie'; l.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:${w}px;height:1px;background:rgba(255,80,80,.9);z-index:9999;pointer-events:none`; document.body.appendChild(l); }, [clip.x, b.y + b.height / 2, clip.width]);
    await shot('in Ruhe', clip); await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 8, { steps: 4 }); await p.waitForTimeout(450); await shot('Zeiger darüber', clip);
    await swallow(); await p.mouse.down(); await p.waitForTimeout(700); await shot('gedrückt, 0,7 s gehalten', clip); await p.mouse.up(); await p.waitForTimeout(700); await shot('losgelassen', clip);
    await p.evaluate(() => document.getElementById('wa-probe-linie').remove()); await make('Pfeil neben der Insel: er gibt nach und bleibt an seinem Platz', 'Die rote Linie (nur im Bildstreifen) ist seine Mitte in Ruhe: gedrückt wird er kleiner und springt nicht.', { cols: 4, scale: 1.6 });
  }
  if (only('fluss')) {   // the running line of a print: its one loop set to fixed times
    begin('fluss'); await d.go('druck', 3000); await d.park(); const fb = await p.locator('.flow').first().boundingBox(), clip = { x: Math.floor(fb.x - 16), y: Math.floor(fb.y - 44), width: Math.ceil(fb.width + 32), height: 76 };
    for (const t of [0, 1300, 2600, 3900, 5200]) { await p.evaluate((t) => { for (const x of document.querySelector('.flow > i').getAnimations()) { x.pause(); x.currentTime = t; } }, t); await p.waitForTimeout(150); await shot(`${(t / 1000).toFixed(1).replace('.', ',')} s`, clip); }
    await p.evaluate(() => document.querySelector('.flow > i').getAnimations().forEach((x) => x.play())); await make('Die Lauflinie eines laufenden Drucks: ein Lichtschein in einem Röhrchen', 'Eine Runde dauert 6,6 s (heute: ein blauer Streifen in 2,2 s). Sie ruht mit dem Wasser und steht ohne Bewegung.', { cols: 1, scale: 1.3 });
  }
  if (d.errors.length) console.log('page errors:', d.errors.slice(0, 6));
  await d.close(); console.log('ok', out);
}

/* ------------------------------------------------------------------ kontrast */
// WCAG contrast of the computed text colour against the pixels REALLY behind the glyphs (the text is made transparent for the
// ground and magenta to find the glyphs; a text-shadow is not counted) - the method of kontrast.mjs. Per probe: the median over
// its glyph pixels and the worst 5 % of them in brackets. Floor 4.5 (placeholders 3); titles should reach 7. Reduced motion.
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const parseCol = (col) => { const v = (col.match(/[\d.]+/g) || []).map(Number); const f = col.startsWith('color(srgb') ? 255 : 1; return [v[0] * f, v[1] * f, v[2] * f, v.length > 3 ? v[3] : 1]; };
const PROBE_CSS = '.__pt::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important} .__pm::placeholder{color:#ff00ff!important;-webkit-text-fill-color:#ff00ff!important;opacity:1!important} .__vt{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important} .__vm{color:#ff00ff!important;-webkit-text-fill-color:#ff00ff!important;text-shadow:none!important;caret-color:transparent!important} .__vt svg,.__vm svg,.__vt .pill,.__vm .pill,.__vt .badge,.__vm .badge{visibility:hidden!important}';
async function kontrast() {
  const out = mkdir(abs(a.out || path.join((await import('os')).tmpdir(), 'wasser-kontrast-desktop'))); const table = {}; const cols = []; const low = [];
  const raw = async (file) => { const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; };
  for (const ton of String(a.toene).split(',')) for (const zeit of String(a.zeiten).split(',')) {
    const col = `${ton} ${zeit}`; cols.push(col); const d = await openDesktop({ look, format: a.format, ton, zeit, engine: a.engine, reduced: true }); const p = d.page; await p.addStyleTag({ content: PROBE_CSS });
    const probe = async (name, sel, { kind = 'text', text = null, nth = 0, floor = 4.5 } = {}) => {
      if (!only(name)) return;
      try {
        const el = (text ? p.locator(sel, { hasText: text }) : p.locator(sel)).nth(nth); if (!(await el.count())) { console.log('--', col, name, 'not found'); return; }
        await d.park(); await p.waitForTimeout(150);
        const info = await el.evaluate((e, kind) => { const cs = getComputedStyle(e, kind === 'placeholder' ? '::placeholder' : null); const b = e.getBoundingClientRect(); return { color: cs.color, x: b.x, y: b.y, w: b.width, h: b.height }; }, kind);
        const clip = { x: Math.max(0, info.x - 2), y: Math.max(0, info.y - 2), width: Math.min(d.format.w - Math.max(0, info.x - 2), info.w + 4), height: Math.min(d.format.h - Math.max(0, info.y - 2), info.h + 4) };
        const [t, m] = kind === 'placeholder' ? ['__pt', '__pm'] : ['__vt', '__vm']; const f = `${out}/${col}_${name}`.replace(/[^\w/.-]+/g, '-');
        await el.evaluate((e, c) => e.classList.add(c), t); await p.waitForTimeout(140); await p.screenshot({ path: f + '_B.png', clip });
        await el.evaluate((e, c) => { e.classList.remove(c[0]); e.classList.add(c[1]); }, [t, m]); await p.waitForTimeout(140); await p.screenshot({ path: f + '_C.png', clip });
        await el.evaluate((e, c) => e.classList.remove(c), m);
        const B = await raw(f + '_B.png'), C = await raw(f + '_C.png'), [r, g, b, al] = parseCol(info.color), cr = [];
        for (let i = 0; i < B.data.length; i += 3) {
          const dd = Math.hypot(C.data[i] - B.data[i], C.data[i + 1] - B.data[i + 1], C.data[i + 2] - B.data[i + 2]), full = Math.hypot(255 - B.data[i], 0 - B.data[i + 1], 255 - B.data[i + 2]) + 1e-6;
          if (dd / full <= 0.85) continue;                          // not (fully) a glyph pixel
          const l1 = lum(al * r + (1 - al) * B.data[i], al * g + (1 - al) * B.data[i + 1], al * b + (1 - al) * B.data[i + 2]), l2 = lum(B.data[i], B.data[i + 1], B.data[i + 2]);
          cr.push((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
        }
        if (cr.length < 12) { console.log('--', col, name, 'too few glyph pixels'); return; } cr.sort((x, y) => x - y);
        const v = { median: cr[cr.length >> 1], worst: cr[Math.floor(cr.length * 0.05)], floor: kind === 'placeholder' ? 3 : floor };
        (table[name] = table[name] || {})[col] = v; low.push([v.worst, v.median, name, col, v.floor]);
      } catch (e) { console.log('!!', col, name, String(e).split('\n')[0].slice(0, 120)); }
    };
    await d.go('heute');
    await probe('Paneltitel links', '.panel-col--left .panel__head h3', { floor: 7 }); await probe('Paneltitel rechts', '.panel-col--right .panel__head h3', { floor: 7 }); await probe('Paneltitel unten', '.bottom-row .panel__head h3', { floor: 7 }); await probe('Paneltitel unten 4', '.bottom-row .panel__head h3', { nth: 3, floor: 7 });
    await probe('Zeile: Titel', '.panel-col--left .item .col > span, .panel-col--left .item b'); await probe('Zeile: klein gedämpft', '.panel-col--left .item .xs.muted');
    await probe('Text auf offenem Wasser', '.panel-col--right .panel__body .small'); await probe('Klein, blass (offen)', '.panel-col--right .panel .faint'); await probe('Klein, gedämpft (offen)', '.panel-col--right .panel .xs.muted, .panel-col--right .panel .small.muted');
    await probe('Große Zahl', '.panel-col--right .panel__body b'); await probe('Stundenkachel', '.hours-mini > div b'); await probe('Stundenkachel klein', '.hours-mini > div span');
    await probe('Zähler im Titel', '.panel__head .pill'); await probe('Etikett Achtung', '.panel .pill--warn, .panel .pill--bad'); await probe('Etikett Akzent', '.panel .pill--acc');
    await probe('Geist-Knopf im Panel', '.panel__foot .btn--ghost'); await probe('Glasknopf im Panel', '.panel__foot .btn:not(.btn--ghost)');
    await probe('Dock: Welt', '.dock button:not(.on) span'); await probe('Dock: aktive Welt', '.dock button.on span');
    await probe('Kopf: Suche', '.topbar__search .muted'); await probe('Kopf: Wetter', '.topbar .chip:not(.topbar__search):not(.ws-chip):not(.btn--icon) span'); await probe('Kopf: Bereich', '.topbar .ws-chip');
    await d.go('projekte');
    await probe('Filter gewählt (frei)', '.world-title .pills .pill--on'); await probe('Filter andere (frei)', '.world-title .pills .pill:not(.pill--on)'); await probe('Filter-Auswahl (frei)', '.world-title .select', { kind: 'value' });
    await probe('Chip unter der Insel', '.project-hero .chip'); await probe('Tropfen frei: klar', '.project-hero .btn:not(.btn--primary):not(.btn--icon)'); await probe('Tropfen frei: Bernstein', '.project-hero .btn--primary');
    await probe('Paneltitel Projekte', '.side-panel-l .panel__head h3', { floor: 7 }); await probe('Zeile Projekte klein', '.side-panel-l .panel__body .xs');
    await d.go('druck');
    await probe('Hauptpanel: Titel', '.ui > .panel[style*="bottom"] b', { floor: 7 }); await probe('Hauptpanel: gedämpft', '.ui > .panel[style*="bottom"] .muted'); await probe('Hauptpanel: Zahl-Beschriftung', '.ui > .panel[style*="bottom"] .stat span');
    await probe('Tropfen auf Panel: Bernstein', '.panel .btn--primary'); await probe('Reiter im Panel: gewählt', '.panel .tabs button.on'); await probe('Reiter im Panel: andere', '.panel .tabs button:not(.on)'); await probe('Klickbares Etikett', '.panel button.pill');
    await d.go('wetter');
    await probe('Wetterzeichen: Wert', '.wchip b'); await probe('Wetterzeichen: klein', '.wchip span'); await probe('Stunde', '.panel .hour b'); await probe('Tabelle / Tage', '.days > div');
    await d.go('start'); await probe('Inselknopf Öffnen', '.island__cta');
    await d.sheet('projekt'); await p.waitForTimeout(900);
    await probe('Bogen: Titel', '.sheet__head h2', { floor: 7 }); await probe('Feld: Beschriftung', '.sheet .field > label'); await probe('Feld: Platzhalter', '.sheet .input', { kind: 'placeholder' }); await probe('Bogen: Abbrechen', '.sheet__foot .btn--ghost');
    await p.locator('.sheet .input').first().fill('Halter für die Gießkanne'); await p.locator('.sheet .textarea').first().focus(); await p.waitForTimeout(500); await probe('Feld: Text', '.sheet .input', { kind: 'value' }); await d.closeSheet();
    await d.go('heute'); await d.sheet('einstellungen'); await p.waitForTimeout(900);
    await probe('Wahl: gewählt', '.sheet .seg button.on'); await probe('Wahl: andere', '.sheet .seg button:not(.on)'); await probe('Bogen: klein gedämpft', '.sheet .xs.muted'); await probe('Tropfen im Bogen', '.sheet .btn:not(.btn--ghost):not(.btn--primary)'); await d.closeSheet();
    await d.search('sens'); await probe('Suche: Gruppe', '.cmd__group'); await probe('Suche: Treffer klein', '.cmd__item small'); await d.closeSearch();
    await d.toast(); await probe('Hinweis: Text', '.toast > span'); await probe('Hinweis: Rückgängig', '.toast__undo');
    if (d.errors.length) console.log('page errors:', d.errors.slice(0, 4));
    await d.close();
  }
  const cell = (v) => (v ? `${v.median.toFixed(1).padStart(5)} (${v.worst.toFixed(1).padStart(4)})${v.median < v.floor ? '!' : ' '}` : '      -      ');
  const lines = [`${label().split(',')[0]}, ${a.format}: median (worst 5 %)`, ''.padEnd(30) + cols.map((c) => c.padEnd(15)).join(''), ...Object.entries(table).map(([name, row]) => name.padEnd(30) + cols.map((c) => cell(row[c]).padEnd(15)).join(''))];
  low.sort((x, y) => x[0] - y[0]); const under = low.filter((l) => l[1] < l[4]);
  lines.push('', 'lowest worst-5-% values: ' + low.slice(0, 6).map((l) => `${l[0].toFixed(1)} (${l[2]}, ${l[3]})`).join('; '), under.length ? `BELOW THE FLOOR (median; titles 7, text 4.5, placeholders 3): ${under.map((l) => `${l[2]}, ${l[3]}: ${l[1].toFixed(1)}`).join('; ')}` : 'no median below its floor (titles 7, text 4.5, placeholders 3)');
  console.log(lines.join('\n')); fs.writeFileSync(`${out}/kontrast-desktop-${a.engine}${look ? '' : '-ohne'}.txt`, lines.join('\n') + '\n');
}

/* ------------------------------------------------------------------ pruefen */
// Does the desktop template do what it says? Run after every change to desktop.css, to the desktop entries of kern.css or to
// Wasser.DESKTOP. Exit code 1 when a check fails. (Whether the PHONE still looks the same: vergleich.mjs, as before.)
async function pruefen() {
  let bad = 0; const say = (ok, name, info = '') => { if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${info ? '   ' + info : ''}`); };
  const d = await open({ start: { sleep: 0 } }); const p = d.page;
  // 1. every world: the drops are drawn, few of them live, none free over an island; how many surfaces are blurred
  const census = () => p.evaluate(async () => {
    const vis = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && cs.visibility !== 'hidden' && +cs.opacity > .01; };
    const live = [...document.querySelectorAll('[data-w3="on"]')].filter(vis);
    const blur = [...document.querySelectorAll('.stage *')].filter((el) => vis(el) && /blur/.test(getComputedStyle(el).backdropFilter || getComputedStyle(el).webkitBackdropFilter || ''));
    const area = blur.reduce((s, el) => { const r = el.getBoundingClientRect(); return s + r.width * r.height; }, 0);
    // a live drop that lies free over the stage must not have the picture of an island behind it (it bends the landscape only)
    const over = [];
    for (const b of live.filter((el) => !el.closest('.panel, .sheet, .cmd, .dock, .toast'))) {
      const r = b.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
      for (const img of document.querySelectorAll('.island__img')) {
        const q = img.getBoundingClientRect(); if (x < q.left || x > q.right || y < q.top || y > q.bottom || !img.naturalWidth || +getComputedStyle(img.closest('.island')).opacity < .2) continue;
        const c = document.createElement('canvas'); c.width = c.height = 1; const cx = c.getContext('2d'); try { await img.decode(); } catch (e) {}
        cx.drawImage(img, (x - q.left) / q.width * img.naturalWidth, (y - q.top) / q.height * img.naturalHeight, 1, 1, 0, 0, 1, 1);
        if (cx.getImageData(0, 0, 1, 1).data[3] > 40) over.push((b.textContent || b.getAttribute('aria-label') || b.className).trim().slice(0, 24));
      }
    }
    return { state: window.Wasser.info.state, live: live.length, onPanel: live.filter((el) => el.closest('.panel')).length, blurred: blur.length, pct: Math.round(area / (innerWidth * innerHeight) * 100), over, lights: document.querySelectorAll('.wa-licht').length };
  });
  // 1b. pressed: nothing that can be clicked leaves its place. (The press of some blocks is a transform; an element the app
  //     places with a transform of its own - the arrows beside the island - then hops away from under the pointer unless the
  //     shell's rule repeats that place AND is heavy enough to win. No still shows this.) Every clickable element is forced
  //     into :active through the DevTools protocol, so this part runs in Chromium only.
  const CLICK = '.ui button, .ui a, .ui .check, .ui .item--click, .ui select, .ui .gcard, .ui .pill, .ui .chip, .island__cta';
  const cdp = a.engine === 'chromium' ? await d.context.newCDPSession(p) : null; if (cdp) { await cdp.send('DOM.enable'); await cdp.send('CSS.enable'); }
  const hops = async (w) => {
    if (!cdp) return [0, []]; await d.park(); await p.waitForTimeout(300);
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 }); const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: CLICK }); const force = async (st) => { for (const id of nodeIds) await cdp.send('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: st }).catch(() => {}); };
    // (the elements themselves are remembered, not their order: the app re-renders once a second while a print runs)
    const k = await p.evaluate((sel) => { const mid = (e) => { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.height]; }; window.__rest = [...document.querySelectorAll(sel)].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight; }).map((e) => [e, mid(e)]); return window.__rest.length; }, CLICK);
    await force(['active']); await p.waitForTimeout(700);
    const out = await p.evaluate((w) => window.__rest.filter(([e]) => e.isConnected).map(([e, m]) => { const r = e.getBoundingClientRect(); return [Math.hypot(r.left + r.width / 2 - m[0], r.top + r.height / 2 - m[1]), m[2], (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 22)]; }).filter(([dd, h]) => dd > Math.max(3, h * 0.12)).map(([dd, h, name]) => `${w}: „${name}“ ${dd.toFixed(0)} px`), w);
    await force([]); await p.waitForTimeout(300); return [k, out];
  };
  await p.addStyleTag({ content: '.scroll-hint { animation: none !important; }' });   // (the app's own hint "Scrollen zum Erkunden" bobs 6 px by itself: not a hop under the pointer)
  let pressed = 0; const hopped = [];
  for (const w of WELTEN) { await d.welt(w); await p.waitForTimeout(900); const c = await census(); say(c.state === 'gl' && c.live >= 3 && c.live <= 12 && !c.over.length, `Welt ${w.padEnd(9)} Tropfen`, `${c.live} lebend (${c.onPanel} auf einem Panel), ${c.blurred} weichgezeichnete Flächen = ${c.pct} % des Bildschirms, ${c.lights} Lichter${c.over.length ? ', FREI ÜBER EINER INSEL: ' + c.over.join(' | ') : ''}`); const [k, h] = await hops(w); pressed += k; hopped.push(...h); }
  if (cdp) say(!hopped.length && pressed > 100, 'Gedrückt: nichts verlässt seinen Platz', `${pressed} klickbare Elemente in acht Welten${hopped.length ? ', VERSCHOBEN: ' + [...new Set(hopped)].slice(0, 6).join(' | ') : ''}`); else console.log('--   Gedrückt: nichts verlässt seinen Platz   (nicht geprüft: nur in Chromium möglich)');
  // 1c. the arrows beside the island, with a real pointer: held for 0.9 s on its upper half (on a slow machine the hop took up
  //     to half a second to show), the arrow stays under the pointer
  //     and the click pages on; and the shell's own material has arrived (smoke glass - a sign that its rule outweighs the block's)
  { await d.go('projekte', 1800); await d.park(); const nav = p.locator('.carousel-nav').last(), b = await nav.boundingBox(); const first = () => p.evaluate(() => document.querySelector('.project-hero').innerText.split('\n').filter(Boolean)[0]); const t0 = await first();
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2 - 8, { steps: 3 }); await p.waitForTimeout(250); await p.mouse.down(); await p.waitForTimeout(900); const q = await nav.boundingBox(); await p.mouse.up(); await p.waitForTimeout(1300);
    const smoke = await nav.evaluate((e) => /gradient/.test(getComputedStyle(e).backgroundImage)); const dy = Math.abs(q.y + q.height / 2 - b.y - b.height / 2), t1 = await first(); await d.park();
    say(dy < 3 && t1 !== t0 && smoke, 'Projekte: der Pfeil neben der Insel bleibt unter dem Zeiger und blättert', `beim Drücken um ${dy.toFixed(1)} px verschoben, ${t1 !== t0 ? 'blättert' : 'KLICK VERLOREN'}, ${smoke ? 'Rauchglas' : 'OHNE sein Rauchglas (die Regel der Schale verliert gegen den Baustein)'}`); }
  // 2. the dock's marker stands on the active world, for all seven
  let worst = 0; for (let i = 0; i < 7; i++) { await p.locator('.dock button').nth(i).dispatchEvent('click'); await p.waitForTimeout(1100); worst = Math.max(worst, await p.evaluate(() => { const dk = document.querySelector('.dock'), cs = getComputedStyle(dk, '::before'), r = dk.getBoundingClientRect(), on = dk.querySelector('button.on').getBoundingClientRect(); const m = /matrix\(([^)]+)\)/.exec(cs.transform); const tx = m ? parseFloat(m[1].split(',')[4]) : 0; return Math.abs(r.left + parseFloat(cs.left) + tx + parseFloat(cs.width) / 2 - (on.left + on.width / 2)); })); }
  say(worst <= 1.5, 'Dock: die Perle steht auf der aktiven Welt', `größte Abweichung ${worst.toFixed(2)} px bei sieben Welten`);
  // 3. the one large panel of a world is found (it is named by its inline style until the app gives it a class)
  for (const w of ['druck', 'material', 'wetter', 'archiv']) { await d.go(w, 900); const k = await p.evaluate(() => [...document.querySelectorAll('.ui > .glass.panel[style*="bottom:"]')].filter((e) => getComputedStyle(e.querySelector(':scope > .wa-licht > .wa-boden') || e).display === 'block').length); say(k === 1, `Welt ${w.padEnd(9)} ein großes Becken mit Bodenlicht`, `${k} gefunden`); }
  // 4. keyboard: the focus line is the Wasserlinie, never the app's blue ring
  await d.go('heute', 1200); const seen = []; for (let i = 0; i < 24; i++) { await p.keyboard.press('Tab'); seen.push(await p.evaluate(() => { const e = document.activeElement, cs = getComputedStyle(e); return cs.outlineStyle === 'none' ? 'none' : cs.outlineColor; })); }
  const blue = seen.filter((c) => /124, 198, 255/.test(c)).length; say(!blue && seen.some((c) => /255, 255, 255/.test(c)), 'Tastatur: Wasserlinie statt blauem Ring', `${seen.filter((c) => /255, 255, 255/.test(c)).length} von 24 Stationen mit weißer Linie, ${blue} blau`);
  // 5. a sheet: the stage behind it rests, the drawer flows in from the right, nothing scrolls the stage; the search panel is blurred
  await p.keyboard.press('Escape'); await p.locator('.topbar [aria-label="Einstellungen"]').dispatchEvent('click'); await p.waitForTimeout(900);
  const name0 = await p.evaluate(() => getComputedStyle(document.querySelector('.sheet')).animationName); await p.evaluate(() => document.querySelector('.sheet').getAnimations().forEach((x) => x.finish()));   // (the entrance takes 0.62 s; a slow machine may still be in it)
  const sh = await p.evaluate(() => { const s = document.querySelector('.sheet'), st = document.querySelector('.stage'), cs = getComputedStyle(s), r = s.getBoundingClientRect(); return { lauf: getComputedStyle(document.querySelector('.dock')).getPropertyValue('--wa-lauf').trim(), own: getComputedStyle(s).getPropertyValue('--wa-lauf').trim(), scroll: st.scrollLeft, right: innerWidth - r.right, radius: cs.borderBottomRightRadius, behind: [...document.querySelectorAll('.topbar [data-w3="on"]')].length }; });
  sh.name = name0; say(sh.name === 'wa-fliesst' && sh.lauf === 'paused' && sh.own === 'running' && sh.scroll === 0 && Math.abs(sh.right - 14) < 1 && parseFloat(sh.radius) > 20, 'Schublade: fließt von rechts, vier runde Ecken, die Bühne dahinter ruht', JSON.stringify(sh)); await d.closeSheet();
  await d.search('sens'); const cm = await p.evaluate(() => { const c = document.querySelector('.cmd'), cs = getComputedStyle(c), b = getComputedStyle(c.parentElement); return { blur: cs.backdropFilter || cs.webkitBackdropFilter, scrim: b.backdropFilter || b.webkitBackdropFilter || 'none', anim: b.animationName }; }); say(/blur/.test(cm.blur) && !/blur/.test(cm.scrim) && cm.anim === 'none', 'Suche: das Feld ist weichgezeichnet, der Schleier dahinter nicht', JSON.stringify(cm)); await d.closeSearch();
  // 6. a toast stands in the middle
  await d.toast(); const tc = await p.evaluate(() => { const r = document.querySelector('.toast').getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - innerWidth / 2); }); say(tc < 1.5, 'Hinweis: mittig über dem Dock', `${tc.toFixed(1)} px neben der Mitte`);
  // 7. stop() leaves nothing behind, start() brings it back
  const st = await p.evaluate(() => { window.Wasser.stop(); const left = document.querySelectorAll('.w3-drop, .wa-licht, .wa-floor, [data-w3], [data-wa-ruht]').length; window.Wasser.start(window.Wasser.DESKTOP); return left; }); await p.waitForTimeout(1200);
  say(st === 0 && (await census()).live >= 3, 'stop() räumt alles ab, start() bringt es zurück', `${st} Reste`);
  if (d.errors.length) say(false, 'keine Fehler auf der Seite', d.errors.slice(0, 3).join(' | ')); else say(true, 'keine Fehler auf der Seite');
  await d.close();
  // 8. sleep: after the time without touch the water rests; a moving mouse wakes it
  { const s = await open({ start: { sleep: 1500 } }); const q = s.page; await s.go('heute', 800); await q.waitForTimeout(2600); const asleep = await q.evaluate(() => [document.querySelector('.stage').hasAttribute('data-wa-ruht'), getComputedStyle(document.querySelector('.dock')).getPropertyValue('--wa-lauf').trim()]);
    await q.mouse.move(600, 500); await q.mouse.move(640, 520); let awake = true; for (let i = 0; i < 12 && awake; i++) { await q.waitForTimeout(100); awake = await q.evaluate(() => document.querySelector('.stage').hasAttribute('data-wa-ruht')); }   // (up to 1.2 s: the WebKit test build delivers the pointer after about 0.4 s)
    say(asleep[0] && asleep[1] === 'paused' && !awake, 'Ruhe: das Wasser schläft ein, eine bewegte Maus weckt es', `schläft ${asleep[0]} (${asleep[1]}), nach der Mausbewegung schläft ${awake}`); await s.close(); }
  // 9. reduced motion: no lights, nothing eases
  { const s = await open({ reduced: true }); const q = s.page; await s.go('heute', 1200); await q.locator('.topbar [aria-label="Einstellungen"]').dispatchEvent('click'); await q.waitForTimeout(500);
    const r = await q.evaluate(() => ({ lights: [...document.querySelectorAll('.wa-licht')].filter((e) => getComputedStyle(e).display !== 'none').length, sheet: getComputedStyle(document.querySelector('.sheet')).animationName, bead: getComputedStyle(document.querySelector('.dock'), '::before').animationName, panel: getComputedStyle(document.querySelector('.glass.panel')).animationName, running: document.getAnimations().filter((x) => x.effect && x.effect.target && x.effect.target.closest && x.effect.target.closest('.ui') && x.playState === 'running' && !(x.effect.getComputedTiming().duration <= 50)).map((x) => (x.animationName || x.transitionProperty || 'waapi') + '@' + String(x.effect.target.className).slice(0, 30)) }));
    say(r.lights === 0 && r.sheet === 'none' && r.bead === 'none' && r.panel === 'none' && r.running.length === 0, 'Bewegung reduziert: keine Lichter, nichts läuft', JSON.stringify(r)); await s.close(); }
  // 10. nothing has moved: the places of panels, dock, top bar, titles and islands with and without the look (the layout is the app's)
  { const boxes = async (h) => { const o = {}; for (const w of WELTEN) { await h.welt(w); await h.page.waitForTimeout(1600); await h.park(); await h.page.waitForTimeout(300); o[w] = await h.page.evaluate(() => { const r = {}; let i = 0; for (const el of document.querySelectorAll('.panel, .dock, .topbar > *, .world-title, .heute-greet, .project-hero, .project-hero .btn, .island__img, .wchip, .carousel-nav, .hand, .start-clock, .island__cta')) { const b = el.getBoundingClientRect(); r[(i++) + ' ' + String(el.className).split(' ').slice(0, 3).join('.')] = [b.left, b.top, b.width, b.height]; } return r; }); } return o; };
    const A = await open({ look: '', reduced: true }), B = await open({ reduced: true }); const a0 = await boxes(A), b0 = await boxes(B); await A.close(); await B.close(); let maxPos = 0, maxSize = 0, who = '', n = 0;
    for (const w of WELTEN) for (const k of Object.keys(a0[w])) { const x = a0[w][k], y = b0[w][k]; if (!y) { n++; who = who || `${w}: ${k} fehlt`; continue; } if (/dock/.test(k)) continue; const text = /world-title|project-hero$/.test(k);   // (a block of loose text is as wide as its content: a filter select with its arrow is a few px wider - only its place and height count)
      const dp = Math.max(Math.abs(x[0] - y[0]), Math.abs(x[1] - y[1])), ds = Math.max(text ? 0 : Math.abs(x[2] - y[2]), Math.abs(x[3] - y[3])); if (dp > maxPos) { maxPos = dp; who = `${w}: ${k}`; } if (ds > maxSize) maxSize = ds; }
    say(maxPos <= 2 && maxSize <= 3 && !n, 'Nichts ist verrückt: Orte und Größen wie in der App ohne Look', `größte Verschiebung ${maxPos.toFixed(1)} px, größte Größenänderung ${maxSize.toFixed(1)} px (${who}); das Dock ist 21 px breiter (sieben gleich breite Welten) und bleibt mittig`); }
  console.log(bad ? `\n${bad} Prüfung(en) fehlgeschlagen` : '\nalle Prüfungen bestanden'); process.exit(bad ? 1 : 0);
}

/* ------------------------------------------------------------------ takt */
// What does the look cost on the desktop stage? Pictures the browser draws a second and the CPU time its GPU process needs
// per picture, for: the app as it is today, the template, the template with its loops at rest paused, without its drops,
// and without any blur. The stage itself never rests (leaves, clouds, islands), so there is always something to draw.
// A machine that renders in software (the work machine) shows only the RELATIONS between the rows. Chromium only.
async function takt() {
  const secs = Number(a.sekunden || 5), welten = want || ['heute', 'wetter'];
  const V = [['die App heute (ohne Look)', '', null], ['Vorlage', look || 'vorlage', null], ['Vorlage, Lichter angehalten', look || 'vorlage', '[data-wasser] { --wa-lauf: paused !important; }'], ['Vorlage, ohne lebende Tropfen', look || 'vorlage', null, { drops: '' }], ['Vorlage, ohne Weichzeichner', look || 'vorlage', '[data-wasser] * { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }']];
  console.log(`${a.format}, ${a.zeit}${a.ton ? ', Ton ' + a.ton : ''}, ${secs} s je Zeile`); console.log('Welt'.padEnd(9) + 'Variante'.padEnd(34) + 'Weichz.  Fläche  Tropfen  Bilder/s  GPU-Prozess ms/Bild  Wasserbild ms');
  for (const w of welten) for (const [name, lk, css, start] of V) {
    const d = await openDesktop({ look: lk, format: a.format, ton: a.ton, zeit: a.zeit, start: start || {} }); const p = d.page; await d.welt(w); if (css) await p.addStyleTag({ content: css }); await d.park(); await p.waitForTimeout(2500);
    const st = await p.evaluate(() => { const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; }; const bl = [...document.querySelectorAll('.stage *')].filter((el) => vis(el) && /blur/.test(getComputedStyle(el).backdropFilter || '')); return { n: bl.length, pct: Math.round(bl.reduce((s, el) => { const r = el.getBoundingClientRect(); return s + r.width * r.height; }, 0) / (innerWidth * innerHeight) * 100), drops: document.querySelectorAll('[data-w3="on"]').length }; });
    const cdp = await d.context.newCDPSession(p), bs = await d.browser.newBrowserCDPSession(); const cpu = async () => { const r = await bs.send('SystemInfo.getProcessInfo'); let g = 0; for (const x of r.processInfo) if (x.type === 'GPU') g += x.cpuTime; return g; };
    const ev = []; cdp.on('Tracing.dataCollected', (x) => ev.push(...x.value)); await cdp.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['disabled-by-default-devtools.timeline.frame', 'cc', 'viz'] } });
    const c0 = await cpu(), t0 = Date.now(); await p.waitForTimeout(secs * 1000); const c1 = await cpu(), dt = (Date.now() - t0) / 1000;
    const done = new Promise((ok) => cdp.once('Tracing.tracingComplete', ok)); await cdp.send('Tracing.end'); await done; const drawn = ev.filter((e) => e.name === 'DrawFrame').length; const ms = lk ? await p.evaluate(() => (window.Wasser && window.Wasser.info.ms) || 0) : 0;
    console.log(w.padEnd(9) + name.padEnd(34) + String(st.n).padStart(5) + (st.pct + ' %').padStart(9) + String(st.drops).padStart(8) + (drawn / dt).toFixed(1).padStart(10) + ((c1 - c0) * 1000 / Math.max(1, drawn)).toFixed(0).padStart(14) + (ms ? ms.toFixed(1) : '-').padStart(18)); await d.close();
  }
}

/* ------------------------------------------------------------------ clip */
// A tour through the real app as one film, recorded through the browser's screencast (every picture with its true time; the
// work machine draws only 7 to 9 pictures a second - the film is true to that, not smooth). A drawn pointer shows where the
// mouse is. Chromium only; needs ffmpeg.
async function clip(out) {
  const { execFileSync } = await import('child_process'); const dir = mkdir(out + '.d'); const d = await open({ ton: 'auto' }); const p = d.page, { w, h } = d.format; const wait = (ms) => p.waitForTimeout(ms); const marks = [];
  await p.evaluate(() => { const c = document.createElement('div'); c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;z-index:99999;pointer-events:none;transform:translate(-100px,-100px);background:url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 22 22%27%3E%3Cpath d=%27M3 2l14 8-6.2 1.6L8 18z%27 fill=%27%23fff%27 stroke=%27%23000%27 stroke-width=%271.2%27 stroke-linejoin=%27round%27/%3E%3C/svg%3E")'; document.body.appendChild(c); window.addEventListener('pointermove', (e) => { c.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)`; }, true); });
  const cdp = await d.context.newCDPSession(p); const frames = []; let n = 0;
  cdp.on('Page.screencastFrame', (f) => { const file = `${dir}/f${String(n++).padStart(5, '0')}.jpg`; fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push({ file, t: f.metadata.timestamp }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  let mx = w / 2, my = h / 2;
  const glide = async (x, y, ms = 600) => { const k = Math.max(4, Math.round(ms / 45)); const x0 = mx, y0 = my; for (let i = 1; i <= k; i++) { const s = i / k, e = s * s * (3 - 2 * s); await p.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e); await wait(ms / k); } mx = x; my = y; };
  const to = async (loc, ms = 650, fx = 0.5, fy = 0.5) => { const b = await loc.first().boundingBox(); if (!b) return false; await glide(b.x + b.width * fx, b.y + b.height * fy, ms); return true; };
  const press = async (loc, hold = 130) => { if (!(await to(loc))) return; await wait(250); await p.mouse.down(); await wait(hold); await p.mouse.up(); await d.still(); };
  const mark = (t) => { marks.push(`${((Date.now() - t0) / 1000).toFixed(1).padStart(5)} s  ${t}`); }; const step = async (t, fn) => { mark(t); try { await fn(); } catch (e) { console.log('!!', t, String(e).split('\n')[0].slice(0, 120)); } };
  await d.go('start', 2200); await p.mouse.move(mx, my); await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1600, maxHeight: 1000, everyNthFrame: 1 }); const t0 = Date.now();
  await step('Start in Ruhe; der Zeiger wandert zu einem Tropfen unter einer Insel', async () => { await wait(1500); await to(p.locator('.island__cta').nth(1), 1100); await wait(800); });
  await step('Dock: Heute - die Perle fließt, die Becken kommen an', async () => { await press(p.locator('.dock button', { hasText: 'Heute' })); await wait(2600); });
  await step('Zeiger über einem Panel: sein Randlicht erwacht; eine Aufgabe wird abgehakt (grüner Ring)', async () => { await to(p.locator('.panel-col--left .panel').nth(1), 700, 0.5, 0.3); await wait(900); await press(p.locator('.panel-col--left .check').first()); await wait(1300); });
  await step('Dock: Projekte - freie Tropfen unter der Insel, der Zeiger streicht darüber', async () => { await press(p.locator('.dock button', { hasText: 'Projekte' })); await wait(2400); const b = p.locator('.project-hero .btn'); const k = await b.count(); for (let i = k - 1; i >= 0; i--) { await to(b.nth(i), 320); await wait(220); } });
  await step('Projekt öffnen (Bernstein-Tropfen): die Innenwelt', async () => { await press(p.locator('.project-hero .btn--primary'), 260); await wait(2800); });
  await step('Dock: 3D-Druck - das große Becken; "Ergebnis buchen" gedrückt: Ring, die Schublade fließt herein', async () => { await press(p.locator('.dock button', { hasText: '3D-Druck' })); await wait(2600); await press(p.locator('.panel .btn--primary').first(), 300); await wait(2000); await press(p.locator('.sheet .sheet__head button[aria-label="Schließen"]')); await wait(700); });
  await step('Suche (Strg+K)', async () => { await p.keyboard.press('Control+k'); await wait(600); await p.keyboard.type('sens', { delay: 120 }); await wait(1300); await p.keyboard.press('Escape'); await wait(600); });
  await step('Einstellungen: ein Feld, dann Erscheinungsbild "Hell" - der Ton wechselt zu "klar"', async () => { await press(p.locator('.topbar [aria-label="Einstellungen"]')); await wait(1300); await press(p.locator('.sheet .input').first()); await p.keyboard.type('Elias', { delay: 110 }); await wait(500); await press(p.locator('.sheet .seg').first().locator('button', { hasText: 'Hell' })); await wait(2200); await press(p.locator('.sheet .sheet__head button[aria-label="Schließen"]')); await wait(900); });
  await step('Ton "klar": Wetter, dann Heute', async () => { await press(p.locator('.dock button', { hasText: 'Wetter' })); await wait(3000); await press(p.locator('.dock button', { hasText: 'Heute' })); await wait(3000); });
  mark('Ende'); await cdp.send('Page.stopScreencast').catch(() => {}); await wait(300); const total = (Date.now() - t0) / 1000;
  if (d.errors.length) console.log('page errors:', d.errors.slice(0, 4)); await d.close();
  // every picture for as long as it was on the screen
  let txt = ''; frames.forEach((f, i) => { txt += `file '${f.file}'\nduration ${Math.max(0.001, (i + 1 < frames.length ? frames[i + 1].t : f.t + 0.2) - f.t).toFixed(4)}\n`; }); txt += `file '${frames[frames.length - 1].file}'\n`; fs.writeFileSync(`${dir}/list.txt`, txt);
  for (const crf of [a.crf || 27, 30, 33]) { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', `${dir}/list.txt`, '-vf', 'fps=20,scale=1600:-2:flags=lanczos', '-c:v', 'libx264', '-crf', String(crf), '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out]); if (fs.statSync(out).size < 3.9e6) break; }
  fs.writeFileSync(out.replace(/\.mp4$/, '') + '-ablauf.txt', marks.join('\n') + '\n'); fs.rmSync(dir, { recursive: true, force: true });
  console.log(marks.join('\n')); console.log(`ok ${out}  ${(fs.statSync(out).size / 1e6).toFixed(2)} MB, ${total.toFixed(1)} s, ${frames.length} Bilder (${(frames.length / total).toFixed(1)} je Sekunde)`);
}

/* ------------------------------------------------------------------ zeigen */
// The built app (dist/) with the template on top, for the owner's own browser. Nothing is written anywhere.
const MIME = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', json: 'application/json', webp: 'image/webp', avif: 'image/avif', png: 'image/png', jpg: 'image/jpeg', svg: 'image/svg+xml', woff2: 'font/woff2', woff: 'font/woff', ico: 'image/x-icon', webmanifest: 'application/manifest+json' };
function zeigen() {
  const dist = abs('dist'); if (!fs.existsSync(`${dist}/index.html`)) { console.log('dist/ fehlt: zuerst "npm run build"'); process.exit(1); }
  const dir = lookDir(look || 'vorlage'); if (!isTemplate(look || 'vorlage')) { console.log(`--look ${look}: keine Kopie der Vorlage (kern.css fehlt)`); process.exit(1); }   // (--look <folder>: another copy of the template; "ohne" is ?ohne=1 in the address)
  const own = { 'kern.css': `${dir}/kern.css`, 'mobil.css': `${dir}/mobil.css`, 'desktop.css': `${dir}/desktop.css`, 'wasser.js': `${dir}/wasser.js`, 'einspielen.js': 'scripts/wasser/einspielen.js' };
  // the look goes in after the app's own stylesheets; "ohne" and "ton" are read from the address in the page itself
  const tags = `<script>(function(){var q=new URLSearchParams(location.search);if(q.has('ohne'))return;window.__wasserVorschau={ton:q.get('ton')||'auto'};
    document.write('<link rel="stylesheet" href="/__wasser/kern.css"><link rel="stylesheet" href="/__wasser/mobil.css"><link rel="stylesheet" href="/__wasser/desktop.css">'+(q.get('weich')==='aus'?'<style>[data-wasser] *{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}</style>':'')+(q.get('leben')?'<style>[data-wasser]{--wa-leben:'+parseFloat(q.get('leben'))+'}</style>':'')+'<script src="/__wasser/wasser.js"><\\/script><script src="/__wasser/einspielen.js"><\\/script>');})();</script>`;
  http.createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const send = (file, type) => { res.writeHead(200, { 'content-type': type || MIME[path.extname(file).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' }); fs.createReadStream(file).pipe(res); };
    if (name.startsWith('/__wasser/')) { const f = own[name.slice(10)]; if (f) return send(abs(f)); res.writeHead(404); return res.end(); }
    const file = path.join(dist, name);
    if (file.startsWith(dist) && fs.existsSync(file) && fs.statSync(file).isFile() && name !== '/index.html') return send(file);
    if (name.startsWith('/api/')) { res.writeHead(404, { 'content-type': 'application/json' }); return res.end('{}'); }   // (no account service in the preview)
    res.writeHead(200, { 'content-type': MIME.html, 'cache-control': 'no-store' }); res.end(fs.readFileSync(`${dist}/index.html`, 'utf8').replace('</body>', tags + '</body>'));
  }).listen(Number(a.port), () => console.log(`Vorschau der Vorlage in der gebauten App:  http://localhost:${a.port}\n  breites Fenster = Desktop, schmales (unter 900 px) = Handy\n  ?ton=klar  ?ton=dunkel  (sonst folgt der Ton der Einstellung "Erscheinungsbild")   ?ohne=1 = die App wie heute\n  ?weich=aus = ohne Weichzeichner (zum Vergleich, falls es ruckelt)   ?leben=1.5 = mehr Licht in Ruhe (0 bis 2)\n  Strg+C beendet.`));
}

if (mode === 'bild' && a._[1]) await bild(abs(a._[1]));
else if (mode === 'kontrast') await kontrast();
else if (mode === 'pruefen') await pruefen();
else if (mode === 'clip' && a._[1]) await clip(abs(a._[1]));
else if (mode === 'takt') await takt();
else if (mode === 'film' && a._[1]) await film(abs(a._[1]));
else if (mode === 'zeigen') zeigen();
else { const head = fs.readFileSync(new URL(import.meta.url), 'utf8').split('\n'); console.log(head.slice(0, head.findIndex((l) => !l.startsWith('//'))).map((l) => l.slice(3)).join('\n')); process.exit(mode ? 1 : 0); }
