// Film for the owner: soft leaving on the phone, before | after, CDP screencast (no recordVideo).
//   node gehen-film.mjs <vorher-url> <nachher-url> <out.mp4>
import fs from 'fs'; import path from 'path';
import { pw, openApp, encodeCast, frameAt, mkdir } from '../../../../scripts/wasser/lib.mjs';
const [VOR, NACH, OUT] = process.argv.slice(2); const TMP = OUT + '.frames';
const b = await pw.chromium.launch();
async function record(url, dir) {
  const a = await openApp(b, 'chromium', { app: url, ton: 'klar', zeit: 'tag', wetter: 'klar', reduced: false, scale: 2 });
  const p = a.page; await a.go('#/heute', 2500);
  mkdir(dir); const cdp = await p.context().newCDPSession(p); const frames = []; let n = 0;
  cdp.on('Page.screencastFrame', (f) => { const file = `${dir}/f${String(n++).padStart(5, '0')}.jpg`; fs.writeFileSync(file, Buffer.from(f.data, 'base64')); frames.push({ file, t: f.metadata.timestamp }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
  await p.waitForTimeout(400); const t0 = frames.length ? frames[0].t : Date.now() / 1000; const marks = {};
  const mark = (k) => { marks[k] = Date.now() / 1000; };
  await p.waitForTimeout(600);
  mark('gear'); await p.locator('.m-head [aria-label="Einstellungen"]').tap(); await p.waitForTimeout(1800);
  mark('close'); await p.locator('.sheet .sheet__head button').last().tap(); await p.waitForTimeout(1700);
  mark('tick'); await p.locator('.m-main .check').first().tap(); await p.waitForTimeout(2000);
  mark('tab'); await p.locator('.m-tabs button', { hasText: 'Material' }).tap(); await p.waitForTimeout(1400);
  await p.locator('.m-main').evaluate((e) => e.scrollTo({ top: 99999, behavior: 'smooth' })); await p.waitForTimeout(1200);
  mark('remove'); await p.locator('.m-main .m-shop:not(.wa-geht) .btn--icon').first().tap(); await p.waitForTimeout(1800);
  mark('undo'); await p.locator('.toast__undo').first().tap(); await p.waitForTimeout(2000);
  mark('end');
  await cdp.send('Page.stopScreencast').catch(() => {}); await p.waitForTimeout(250);
  const errs = a.errors.slice(); await a.close();
  return { frames, t0, marks, errs };
}
const vor = await record(VOR, TMP + '/vor'), nach = await record(NACH, TMP + '/nach');
await b.close();
console.log('frames', vor.frames.length, nach.frames.length, 'errors', vor.errs, nach.errs);
// each track starts at its "gear" mark minus 0.8 s; the captions follow the after-recording's marks
const from = (r) => r.marks.gear - 0.8;
const rel = (k) => nach.marks[k] - from(nach);
const captions = [
  { from: 0, to: rel('close'), text: 'Einstellungen öffnen …' },
  { from: rel('close'), to: rel('tick'), text: '… und schließen: der Bogen sinkt weich hinaus' },
  { from: rel('tick'), to: rel('tab'), text: 'Aufgabe abhaken: die Zeile geht, die Lücke schließt sich' },
  { from: rel('tab'), to: rel('remove'), text: 'Reiter „Material“: der Hintergrund blendet über' },
  { from: rel('remove'), to: rel('undo'), text: 'Eintrag entfernen: Zeile geht, Hinweis kommt' },
  { from: rel('undo'), to: rel('end'), text: '„Rückgängig“: der neue Hinweis ersetzt den alten weich' },
];
const dur = Math.min(vor.marks.end - from(vor), nach.marks.end - from(nach));
const r = await encodeCast([{ frames: vor.frames, from: from(vor), to: from(vor) + dur, label: 'vorher' }, { frames: nach.frames, from: from(nach), to: from(nach) + dur, label: 'nachher (neu)' }], OUT, { fps: 30, crf: 20, captions, title: 'Weiches Gehen am Handy (heller Modus, Arbeitsrechner ohne Grafikchip)' });
console.log(JSON.stringify(r), 'marks vor', JSON.stringify(Object.fromEntries(Object.entries(vor.marks).map(([k, v]) => [k, +(v - from(vor)).toFixed(2)]))), 'nach', JSON.stringify(Object.fromEntries(Object.entries(nach.marks).map(([k, v]) => [k, +(v - from(nach)).toFixed(2)]))));
