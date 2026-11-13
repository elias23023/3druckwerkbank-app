// Can the text be read? WCAG contrast of the computed text colour against the pixels REALLY behind the glyphs (the text is
// made transparent for the ground and magenta to find the glyphs; a text-shadow is not counted). Per probe: the median
// over its glyph pixels, and the worst 5 % of them in brackets. Floor: 4.5 (placeholders 3). Reduced motion: frozen water.
//
//   node scripts/wasser/kontrast.mjs [--look vorlage|<folder>] [--toene dunkel,klar] [--engine chromium|webkit] [--szenen start,wetter,innen] [--app] [--out <dir>]
//
//   without --app   the harness page: titles, counts, rows, number tiles, pills, the ghost button and the tabs, per scene
//                   (all eight: --szenen start,heute,projekte,material,druck,wetter,archiv,innen)
//   --app           the real app as well: sheets, fields, placeholders, options, tabs, search, toast (needs npm run preview)
// Exit code 1 when a median falls below the floor. --out keeps the small pictures that were measured.
import fs from 'fs'; import os from 'os'; import path from 'path';
import { session, rgb, args, abs, mkdir } from './lib.mjs';
const a = args({ look: 'vorlage', toene: 'dunkel,klar', engine: 'chromium', szenen: 'start,wetter,innen', out: path.join(os.tmpdir(), 'wasser-kontrast') });
const out = mkdir(abs(a.out)); const s = await session({ engine: a.engine }); const table = {}; const cols = []; let low = [];
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const parse = (col) => { const v = (col.match(/[\d.]+/g) || []).map(Number); const f = col.startsWith('color(srgb') ? 255 : 1; return [v[0] * f, v[1] * f, v[2] * f, v.length > 3 ? v[3] : 1]; };
const CSS = '.__pt::placeholder{color:transparent!important;-webkit-text-fill-color:transparent!important} .__pm::placeholder{color:#ff00ff!important;-webkit-text-fill-color:#ff00ff!important;opacity:1!important} .__vt{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;caret-color:transparent!important} .__vm{color:#ff00ff!important;-webkit-text-fill-color:#ff00ff!important;text-shadow:none!important;caret-color:transparent!important} .__vt svg,.__vm svg{visibility:hidden!important}';
async function probe(p, col, name, loc, kind = 'text') {
  try {
    const el = loc.first(); await el.scrollIntoViewIfNeeded({ timeout: 3000 }); await p.waitForTimeout(200);
    const info = await el.evaluate((e, kind) => { const cs = getComputedStyle(e, kind === 'placeholder' ? '::placeholder' : null); const b = e.getBoundingClientRect(); return { color: cs.color, x: b.x, y: b.y, w: b.width, h: b.height }; }, kind);
    const clip = { x: Math.max(0, info.x - 2), y: Math.max(0, info.y - 2), width: Math.min(390 - Math.max(0, info.x - 2), info.w + 4), height: info.h + 4 };
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
    if (cr.length < 12) return; cr.sort((x, y) => x - y);
    const v = { median: cr[cr.length >> 1], worst: cr[Math.floor(cr.length * 0.05)], floor: kind === 'placeholder' ? 3 : 4.5 };
    (table[name] = table[name] || {})[col] = v; low.push([v.worst, v.median, name, col, v.floor]);
  } catch (e) { console.log('!!', col, name, String(e).split('\n')[0].slice(0, 120)); }
}
for (const ton of a.toene.split(',')) {
  for (const scene of a.szenen.split(',')) {
    const col = `${ton} ${scene}`; cols.push(col); const h = await s.harness({ look: a.look, ton, scene, reduced: true }); const p = h.page; await p.addStyleTag({ content: CSS });
    const card = (i) => p.locator('.m-main > .m-card').nth(i);
    await probe(p, col, 'Kartentitel', card(0).locator('h3')); await probe(p, col, 'Kartentitel 2', card(1).locator('h3')); await probe(p, col, 'Zähler', card(0).locator('h3 .cnt')); await probe(p, col, 'Zähler 2', card(1).locator('h3 .cnt'));
    await probe(p, col, 'Zeile: Titel', card(0).locator('.m-row b')); await probe(p, col, 'Zeile: gedämpft', card(0).locator('.m-row .muted')); await probe(p, col, 'Zahl-Kachel', card(1).locator('.m-stat b')); await probe(p, col, 'Kachel: Beschriftung', card(1).locator('.m-stat span'));
    await probe(p, col, 'Etikett gewählt', card(0).locator('.pill').nth(0)); await probe(p, col, 'Etikett grün', card(0).locator('.pill').nth(1)); await probe(p, col, 'Geist-Knopf', card(0).locator('.btn--ghost'));
    await probe(p, col, 'Reiter', p.locator('.m-tabs button span').nth(1)); await probe(p, col, 'Reiter aktiv', p.locator('.m-tabs button.on span'));
    await h.close();
  }
  if (a.app) {
    const col = `${ton} App`; cols.push(col); const h = await s.app({ look: a.look, ton, reduced: true }); const p = h.page; await p.addStyleTag({ content: CSS });
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
const lines = ['median (worst 5 %)'.padEnd(26) + cols.map((c) => c.padEnd(15)).join(''), ...Object.entries(table).map(([name, row]) => name.padEnd(26) + cols.map((c) => cell(row[c]).padEnd(15)).join(''))];
low.sort((x, y) => x[0] - y[0]); const under = low.filter((l) => l[1] < l[4]);
lines.push('', 'lowest worst-5-% values: ' + low.slice(0, 4).map((l) => `${l[0].toFixed(1)} (${l[2]}, ${l[3]})`).join('; '), under.length ? `BELOW THE FLOOR (median): ${under.map((l) => `${l[2]}, ${l[3]}: ${l[1].toFixed(1)}`).join('; ')}` : 'no median below the floor (4.5; placeholders 3)');
console.log(lines.join('\n')); fs.writeFileSync(`${out}/kontrast-${a.engine}.txt`, lines.join('\n') + '\n'); process.exit(under.length ? 1 : 0);
