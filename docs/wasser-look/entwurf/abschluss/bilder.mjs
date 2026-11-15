// Pictures for the owner: before (feinschliff-basis) against after (final commit), German labels, deviceScaleFactor 2.
//   node bilder.mjs <vorher-url> <nachher-url> <out-dir>
import fs from 'fs'; import path from 'path';
import { pw, openApp, strip, sharp } from '../../../../scripts/wasser/lib.mjs';
import { openDesktop } from '../../../../scripts/wasser/desktop-lib.mjs';
const [VOR, NACH, OUT] = process.argv.slice(2); const RAW = path.join(OUT, 'roh'); fs.mkdirSync(RAW, { recursive: true });
const only = (process.env.NUR || '').split(',').filter(Boolean); const want = (k) => !only.length || only.includes(k);
const b = await pw.chromium.launch();
const L = { vor: 'vorher (vor dem Feinschliff)', nach: 'nachher (neu)' };
async function phone(ton, zeit, tag) {
  const files = {};
  for (const [side, url] of [['vor', VOR], ['nach', NACH]]) {
    const a = await openApp(b, 'chromium', { app: url, ton, zeit, wetter: 'klar', reduced: true, scale: 2 });
    for (const [k, act] of [['start', () => a.go('#/start', 1500)], ['heute', () => a.go('#/heute', 1500)], ['projekte', () => a.go('#/projekte', 1500)], ['bogen', async () => { await a.sheet('projekt'); await a.page.waitForTimeout(1200); }]]) {
      await act(); await a.page.waitForTimeout(600); const f = `${RAW}/handy-${tag}-${k}-${side}.png`; await a.shot(f); (files[k] ||= {})[side] = f;
      if (k === 'bogen') await a.closeSheet();
    }
    if (a.errors.length) console.log('errors', side, a.errors);
    await a.close();
  }
  return files;
}
const NAME = { start: 'Start', heute: 'Heute', projekte: 'Projekte', bogen: 'Bogen „Neues Projekt“ offen' };
if (want('handy')) {
  const f = await phone('klar', 'tag', 'klar-tag');
  for (const k of Object.keys(f)) await strip([{ file: f[k].vor, label: L.vor }, { file: f[k].nach, label: L.nach }], `${OUT}/handy-klar-${k}.png`, { title: `Handy, heller Modus („klar“), 12:40 Uhr – ${NAME[k]}`, note: 'Durchsichtiger: mehr von der Landschaft durch das Wasser. Bewegung angehalten, damit nur das Wasser verglichen wird.', scale: 0.5, captionSize: 22 });
}
if (want('dunkel')) {
  const f = await phone('dunkel', 'nacht', 'dunkel-nacht');
  await strip([{ file: f.start.vor, label: L.vor }, { file: f.start.nach, label: L.nach }], `${OUT}/handy-dunkel-start-unveraendert.png`, { title: 'Handy, dunkler Modus („dunkel“), 21:30 Uhr – Start', note: 'Untere Reihe: der Unterschied, 20-fach verstärkt. Schwarz heißt: gleich geblieben.', scale: 0.5, diffGain: 20, captionSize: 22 });
  for (const k of ['heute', 'projekte']) await strip([{ file: f[k].vor, label: L.vor }, { file: f[k].nach, label: L.nach }], `${OUT}/handy-dunkel-${k}-unveraendert.png`, { title: `Handy, dunkler Modus – ${NAME[k]}`, note: 'Untere Reihe: Unterschied 20-fach verstärkt.', scale: 0.5, diffGain: 20, captionSize: 22 });
}
if (want('desktop')) {
  const files = {};
  for (const [side, url] of [['vor', VOR], ['nach', NACH]]) {
    const d = await openDesktop({ app: url, format: '2000', ton: 'klar', zeit: 'tag', uhr: 'steht', wetter: 'klar', reduced: true, scale: 2, browser: b });
    for (const k of ['start', 'heute', 'projekte']) { await d.go(k); await d.page.waitForTimeout(2200); await d.park(); await d.page.waitForTimeout(500); const f = `${RAW}/desktop-klar-tag-${k}-${side}.png`; await d.shot(f); (files[k] ||= {})[side] = f; }
    if (d.errors.length) console.log('errors', side, d.errors);
    await d.close();
  }
  for (const k of Object.keys(files)) await strip([{ file: files[k].vor, label: L.vor }, { file: files[k].nach, label: L.nach }], `${OUT}/desktop-klar-${k}.png`, { title: `Desktop 2000 × 993, heller Modus („klar“), 12:40 Uhr – ${NAME[k]}`, note: 'Oben vorher, unten nachher. Die Panels sind durchsichtiger; ein weicher Schatten hält die Titel lesbar.', scale: 0.25, cols: 1, captionSize: 22 });
}
await b.close();
// webp copies for the phone
for (const f of fs.readdirSync(OUT).filter((n) => n.endsWith('.png'))) await sharp(path.join(OUT, f)).webp({ quality: 88 }).toFile(path.join(OUT, f.replace(/\.png$/, '.webp')));
console.log('done', OUT);
