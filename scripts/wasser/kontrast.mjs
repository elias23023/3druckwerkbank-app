// Can the text be read? WCAG contrast of the computed text colour against the pixels REALLY behind the glyphs (the text is
// made transparent for the ground and magenta to find the glyphs; a text-shadow is not counted). Per probe: the median
// over its glyph pixels, and the worst 5 % of them in brackets. Floor: 4.5 (placeholders 3). Reduced motion: frozen water.
//
//   node scripts/wasser/kontrast.mjs [--look auto|eingebaut|vorlage|<folder>] [--toene dunkel,klar] [--engine chromium|webkit] [--szenen start,wetter,innen] [--app] [--out <dir>]
//
//   without --app   the harness page (it shows the TEMPLATE): titles, counts, rows, number tiles, pills, the ghost button, the
//                   tabs and the labels on drops (on a card: short, small, long, red, amber; and free over the scene), per
//                   scene (all eight: --szenen start,heute,projekte,material,druck,wetter,archiv,innen)
//   --app           the real app as well: sheets, fields, placeholders, options, tabs, search, toast (needs npm run preview)
//
// ONE ELEMENT OF YOUR OWN, without editing this file - in the real app, both tones:
//
//   node scripts/wasser/kontrast.mjs --css '<selector>' [--welt heute] [--bogen einstellungen] [--klick 'Text'] [--art text|platzhalter|wert]
//        [--name 'Merkzettel: Zeile'] [--grenze 4.5] [--desktop [--format 1920] [--zeiten nacht,tag]] [--zeiten tag] [--toene klar]
//
//   --css      what to measure: the first element the selector matches where --welt, --bogen and --klick lead (the same three
//              as in stelle.mjs: a world or a hash; a sheet the tools know by name; then clicks, separated by ">>"). Another
//              than the first: Playwright's ">> nth=2" at the end of the selector.
//   --art      text (default) | platzhalter (the ::placeholder of a field) | wert (the text typed into a field or shown by a select)
//   --grenze   the floor it must reach (default 4.5; platzhalter 3; a title on the desktop should reach 7)
//   --desktop  on the desktop (2000 x 993, by night and by day) instead of the phone. --zeiten: the hours to measure at
//              (morgen tag abend nacht; phone: default the real hour, with a name the clock stands still and there is no weather)
// Exit code 1 when a median falls below its floor, or when --css matched nothing. --out keeps the small pictures that were measured.
// --look: head of lib.mjs. Default auto: the app is measured with the look it has BUILT IN, the harness page with the template.
import fs from 'fs'; import os from 'os'; import path from 'path';
import { session, rgb, args, abs, mkdir, lookArg, sayLook, geheZu, fail, TOENE, ENGINES, SZENEN, ZEITEN } from './lib.mjs';
import { openDesktop } from './desktop-lib.mjs';
const a = args({ look: 'auto', toene: 'dunkel,klar', engine: 'chromium', szenen: 'start,wetter,innen', out: path.join(os.tmpdir(), 'wasser-kontrast'), css: '', welt: '', bogen: '', klick: '', art: 'text', name: '', grenze: '', format: '2000', zeiten: '' },
  { flags: ['app', 'desktop'], choices: { toene: TOENE, engine: ENGINES, szenen: SZENEN, art: ['text', 'platzhalter', 'wert'], zeiten: Object.keys(ZEITEN), format: ['2000', '1920', '<WxH>'] } });
if (a._.length) fail(`this tool takes no word without "--": ${a._.join(' ')}`); if (!a.css && (a.welt || a.bogen || a.klick || a.desktop || a.name || a.grenze)) fail('--welt, --bogen, --klick, --name, --grenze and --desktop belong to --css <selector> (one element of your own)');
const appLook = lookArg(a.look), hLook = lookArg(a.look, { harness: true }); if (!appLook) fail('--look ohne: this tool measures the look');
const out = mkdir(abs(a.out)); const s = await session({ engine: a.engine }); const table = {}; const cols = []; let low = []; let vw = 390, missing = 0;
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const parse = (col) => { const v = (col.match(/[\d.]+/g) || []).map(Number); const f = col.startsWith('color(srgb') ? 255 : 1; return [v[0] * f, v[1] * f, v[2] * f, v.length > 3 ? v[3] : 1]; };
const CSS = '.__pt::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important} .__pm::placeholder{color:#ff00ff!important;-webkit-text-fill-color:#ff00ff!important;opacity:1!important} .__vt{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important} .__vm{color:#ff00ff!important;-webkit-text-fill-color:#ff00ff!important;text-shadow:none!important;caret-color:transparent!important} .__vt svg,.__vm svg{visibility:hidden!important}';
async function probe(p, col, name, loc, kind = 'text', floor = 0, must = false) {
  try {
    const el = loc.first(); if (must && !(await el.count())) { missing++; console.log('!!', col, name, 'the selector matches nothing here'); return; }
    await el.scrollIntoViewIfNeeded({ timeout: 3000 }); await p.waitForTimeout(200);
    const info = await el.evaluate((e, kind) => { const cs = getComputedStyle(e, kind === 'placeholder' ? '::placeholder' : null); const b = e.getBoundingClientRect(); return { color: cs.color, x: b.x, y: b.y, w: b.width, h: b.height }; }, kind);
    const clip = { x: Math.max(0, info.x - 2), y: Math.max(0, info.y - 2), width: Math.min(vw - Math.max(0, info.x - 2), info.w + 4), height: info.h + 4 };
    const [t, m] = kind === 'placeholder' ? ['__pt', '__pm'] : ['__vt', '__vm']; const f = `${out}/${col}_${name}`.replace(/[^\w/.-]+/g, '-');
    await el.evaluate((e, c) => e.classList.add(c), t); await p.waitForTimeout(120); await p.screenshot({ path: f + '_B.png', clip });
    await el.evaluate((e, c) => { e.classList.remove(c[0]); e.classList.add(c[1]); }, [t, m]); await p.waitForTimeout(120); await p.screenshot({ path: f + '_C.png', clip });
    await el.evaluate((e, c) => e.classList.remove(c), m);
    const B = await rgb(f + '_B.png'), C = await rgb(f + '_C.png'), [r, g, b, al] = parse(info.color), cr = [];
    for (let i = 0; i < B.data.length; i += 3) {
      const d = Math.hypot(C.data[i] - B.data[i], C.data[i + 1] - B.data[i + 1], C.data[i + 2] - B.data[i + 2]), full = Math.hypot(255 - B.data[i], 0 - B.data[i + 1], 255 - B.data[i + 2]) + 1e-6;
      if (d / full <= 0.85) continue;                             // not (fully) a glyph pixel
      const l1 = lum(al * r + (1 - al) * B.data[i], al * g + (1 - al) * B.data[i + 1], al * b + (1 - al) * B.data[i + 2]), l2 = lum(B.data[i], B.data[i + 1], B.data[i + 2]);
      cr.push((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05));
    }
    if (cr.length < 12) { if (must) { missing++; console.log('!!', col, name, `too few glyph pixels (${cr.length}): is there text of the kind --art ${a.art} in it?`); } return; } cr.sort((x, y) => x - y);
    const v = { median: cr[cr.length >> 1], worst: cr[Math.floor(cr.length * 0.05)], floor: floor || (kind === 'placeholder' ? 3 : 4.5) };
    (table[name] = table[name] || {})[col] = v; low.push([v.worst, v.median, name, col, v.floor]);
  } catch (e) { if (must) missing++; console.log('!!', col, name, String(e).split('\n')[0].slice(0, 120)); }
}
if (a.css) {                                                       // one element of your own, in the real app
  const kind = { text: 'text', platzhalter: 'placeholder', wert: 'value' }[a.art], name = a.name || a.css, zeiten = a.zeiten ? a.zeiten.split(',') : a.desktop ? ['nacht', 'tag'] : [''];
  for (const ton of a.toene.split(',')) for (const zeit of zeiten) {
    const col = `${ton}${zeit ? ' ' + zeit : ''}`; cols.push(col);
    const d = a.desktop ? await openDesktop({ look: appLook, format: a.format, ton, zeit, engine: a.engine, reduced: true, browser: s.browser }) : await s.app({ look: appLook, ton, reduced: true, zeit: zeit || null });
    const p = d.page; vw = a.desktop ? d.format.w : 390; sayLook(d); await p.addStyleTag({ content: CSS });
    try { await geheZu(d, a); if (a.desktop) await d.park(); await p.waitForTimeout(800); await probe(p, col, name, p.locator(a.css), kind, +a.grenze || 0, true); } catch (e) { missing++; console.log('!!', col, String(e).split('\n')[0].slice(0, 160)); }
    await d.close();
  }
} else for (const ton of a.toene.split(',')) {
  for (const scene of a.szenen.split(',')) {
    const col = `${ton} ${scene}`; cols.push(col); const h = await s.harness({ look: hLook, ton, scene, reduced: true }); const p = h.page; await p.addStyleTag({ content: CSS });
    const card = (i) => p.locator('.m-main > .m-card:not(.m-today)').nth(i);   // (the cards with titles and buttons; the card of the day is measured apart)
    await probe(p, col, 'Kartentitel', card(0).locator('h3')); await probe(p, col, 'Kartentitel 2', card(1).locator('h3')); await probe(p, col, 'Zähler', card(0).locator('h3 .cnt')); await probe(p, col, 'Zähler 2', card(1).locator('h3 .cnt'));
    await probe(p, col, 'Zeile: Titel', card(0).locator('.m-row b')); await probe(p, col, 'Zeile: gedämpft', card(0).locator('.m-row .muted')); await probe(p, col, 'Zahl-Kachel', card(1).locator('.m-stat b')); await probe(p, col, 'Kachel: Beschriftung', card(1).locator('.m-stat span'));
    await probe(p, col, 'Etikett gewählt', card(0).locator('.pill').nth(0)); await probe(p, col, 'Etikett grün', card(0).locator('.pill').nth(1)); await probe(p, col, 'Geist-Knopf', card(0).locator('.btn--ghost'));
    await probe(p, col, 'Reiter', p.locator('.m-tabs button span').nth(1)); await probe(p, col, 'Reiter aktiv', p.locator('.m-tabs button.on span'));
    // labels on drops (the water under them is the frozen drop; a living drop moves these values by about 0.2). Text labels
    // only: icons are hidden while a probe is measured, so the "+" of a round drop is not covered here
    await probe(p, col, 'Tropfen auf Karte', card(0).locator('.row .btn:not(.btn--primary):not(.btn--sm)')); await probe(p, col, 'Tropfen klein', card(0).locator('.btn--sm:not(.btn--ghost)')); await probe(p, col, 'Tropfen lang', card(1).locator('.row .btn:not(.btn--danger)'));
    await probe(p, col, 'Tropfen rot', card(1).locator('.btn--danger')); await probe(p, col, 'Tropfen bernstein', card(0).locator('.btn--primary')); await probe(p, col, 'Tropfen frei', p.locator('.m-main > .frei .btn:not(.btn--primary):not(.btn--icon)'));
    await h.close();
  }
  if (a.app) {
    const col = `${ton} App`; cols.push(col); const h = await s.app({ look: appLook, ton, reduced: true }); const p = h.page; sayLook(h); await p.addStyleTag({ content: CSS });
    const S = (sel, text) => (text ? p.locator(sel, { hasText: text }) : p.locator(sel));
    await h.sheet('projekt'); await p.waitForTimeout(1000);
    await probe(p, col, 'Bogen: Titel', S('.sheet__head h2')); await probe(p, col, 'Feld: Beschriftung', S('.sheet .field > label')); await probe(p, col, 'Feld: Platzhalter', S('.sheet .input'), 'placeholder'); await probe(p, col, 'Bogen: Abbrechen', S('.sheet__foot .btn--ghost'));
    await p.locator('.sheet .input').first().fill('Halter für die Gießkanne'); await p.locator('.sheet .textarea').first().focus(); await p.waitForTimeout(500); await probe(p, col, 'Feld: Text', S('.sheet .input'), 'value');
    await p.locator('.sheet__foot .btn', { hasText: 'Weiter' }).click(); await p.waitForTimeout(900); await probe(p, col, 'Kachel: Titel', S('.sheet .tile b')); await probe(p, col, 'Kachel: klein', S('.sheet .tile small')); await h.closeSheet();
    await h.sheet('einstellungen'); await p.waitForTimeout(1000);
    await probe(p, col, 'Wahl: gewählt', S('.sheet .seg button.on')); await probe(p, col, 'Wahl: andere', S('.sheet .seg button:not(.on)')); await probe(p, col, 'Bogen: klein gedämpft', S('.sheet .xs.muted')); await probe(p, col, 'Bogen: Text', S('.sheet label.row')); await probe(p, col, 'Auswahlfeld: Text', S('.sheet .select'), 'value'); await h.closeSheet();
    await h.go('#/druck'); await p.locator('.m-main [aria-label^="Drucker & Warteschlange"]').first().click(); await p.waitForTimeout(1200);
    await probe(p, col, 'Reiter im Bogen: gewählt', S('.sheet .tabs button.on')); await probe(p, col, 'Reiter im Bogen: andere', S('.sheet .tabs button:not(.on)')); await probe(p, col, 'Bogenzeile: Titel', S('.sheet .item b')); await probe(p, col, 'Bogenzeile: gedämpft', S('.sheet .item .muted')); await h.closeSheet();
    await h.sheet('hinweise'); await p.waitForTimeout(1000); await probe(p, col, 'Etikett Achtung', S('.sheet .pill.pill--warn')); await probe(p, col, 'Etikett Konflikt', S('.sheet .pill.pill--bad')); await h.closeSheet();
    await h.sheet('suche'); await p.keyboard.type('sens'); await p.waitForTimeout(900); await probe(p, col, 'Suche: Gruppe', S('.cmd__group')); await probe(p, col, 'Suche: Treffer klein', S('.cmd__item small')); await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    await h.go('#/heute'); await p.waitForTimeout(800); await probe(p, col, 'Hakenzeile', S('.m-main .m-row .col > span')); await probe(p, col, 'Hakenzeile: klein', S('.m-main .m-row .xs.muted'));
    await h.go('#/material'); await p.waitForTimeout(800); await probe(p, col, 'Filter gewählt', S('.m-main .pills .pill--on')); await probe(p, col, 'Filter andere', S('.m-main .pills .pill:not(.pill--on)'));
    await h.go('#/druck'); await p.waitForTimeout(800); await p.locator('.m-main').evaluate((e) => { e.scrollTop = 99999; }); await p.waitForTimeout(400); await probe(p, col, 'Fußnote auf der Seite', S('.m-main > .xs, .m-main > p, .m-main > span').last());
    await h.sheet('toast'); await probe(p, col, 'Hinweis: Text', S('.toast > span')); await probe(p, col, 'Hinweis: Rückgängig', S('.toast__undo'));
    await h.close();
  }
}
await s.close();
const cell = (v) => (v ? `${v.median.toFixed(1).padStart(5)} (${v.worst.toFixed(1).padStart(4)})${v.median < v.floor ? '!' : ' '}` : '      -      ');
const wide = Math.max(26, ...Object.keys(table).map((n) => n.length + 2));
const lines = ['median (worst 5 %)'.padEnd(wide) + cols.map((c) => c.padEnd(15)).join(''), ...Object.entries(table).map(([name, row]) => name.padEnd(wide) + cols.map((c) => cell(row[c]).padEnd(15)).join(''))];
low.sort((x, y) => x[0] - y[0]); const under = low.filter((l) => l[1] < l[4]);
lines.push('', 'lowest worst-5-% values: ' + low.slice(0, 4).map((l) => `${l[0].toFixed(1)} (${l[2]}, ${l[3]})`).join('; '), under.length ? `BELOW THE FLOOR (median): ${under.map((l) => `${l[2]}, ${l[3]}: ${l[1].toFixed(1)} (floor ${l[4]})`).join('; ')}` : `no median below the floor (${a.css ? (low[0] ? low[0][4] : '-') : '4.5; placeholders 3'})`);
if (missing) lines.push(`NOT MEASURED in ${missing} of ${cols.length} column(s): see the lines with "!!" above`);
console.log(lines.join('\n')); fs.writeFileSync(`${out}/kontrast-${a.engine}.txt`, lines.join('\n') + '\n'); process.exit(under.length || missing ? 1 : 0);
