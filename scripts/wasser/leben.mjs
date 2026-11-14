// HOW MUCH LIFE? One comparison to judge on a phone: the same short walk through the REAL app, recorded once per value of
// the master token --wa-leben (kern.css, part 3), the recordings side by side as phones, labelled, in real time.
//
//   node scripts/wasser/leben.mjs <out> [--werte 1,1.5] [--ton klar] [--look vorlage|<folder>] [--crf 17] [--roh <dir>]
//
// Writes <out>.mp4 (H.264, yuv420p, about 15 s) and <out>.png (the same as a filmstrip, for a reader who cannot play it).
// The walk: 6 s at rest on "Start" - a tap on the tab "Heute" (a screen of rows: the bead flows, the cards arrive, their
// light swings into place) - the list is rolled at 1000 px a second for 0.4 s and stopped dead (the light leans, then
// swings out) - 4 s at rest there. ("Start" itself cannot be scrolled at phone height, so the roll comes after the tab.)
// The first value is labelled "(jetzt)" when it is the built value 1.
// Recorded through the browser's screencast (lib.mjs, cast): Chromium only; needs ffmpeg and the app's preview
// (npm run build && npm run preview). The app's clock stands still and it gets no weather, so the phones differ by the
// life alone. The work machine renders in software: the drops are drawn a little less often than on a phone.
// --roh keeps the single frames (JPEG, with frames.json: file and time of each) for a closer look.
import fs from 'fs'; import os from 'os'; import path from 'path';
import { session, cast, encodeCast, frameAt, strip, stack, sharp, args, abs, mkdir } from './lib.mjs';
const a = args({ werte: '1,1.5', ton: '', look: 'vorlage', crf: '17' }); if (!a._[0]) { console.log('usage: node scripts/wasser/leben.mjs <out> [--werte 1,1.5] [--ton klar] [--look vorlage|<folder>] [--crf 17] [--roh <dir>]'); process.exit(1); }
const out = abs(a._[0]).replace(/\.(mp4|png)$/, ''); const roh = a.roh ? mkdir(abs(a.roh)) : fs.mkdtempSync(path.join(os.tmpdir(), 'wasser-leben-'));
const werte = a.werte.split(','); const de = (v) => String(v).replace('.', ','); const s = await session({ engine: 'chromium' }); const tracks = [];
for (const [i, wert] of werte.entries()) {
  const h = await s.app({ look: a.look, ton: a.ton, zeit: '2026-11-12T17:42:00+01:00' }); const p = h.page; const wait = (ms) => p.waitForTimeout(ms);
  if (wert !== '1') await p.addStyleTag({ content: `[data-wasser] { --wa-leben: ${wert}; }` });   // after the look's own stylesheet: it wins. On the root, where the lights are built from it
  const got = await p.evaluate(() => getComputedStyle(document.querySelector('[data-wasser]')).getPropertyValue('--wa-leben').trim());
  await h.go('#/start', 3000);                                     // the light of the start screen has swung into place
  const cardTops = () => p.evaluate(() => [...document.querySelectorAll('.m-main > .glass.m-card')].map((c) => { const r = c.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; }));
  const boxes = { start: (await cardTops()).find(([, hh]) => hh > 100) };   // the first card of some height on "Start", for the close look of the filmstrip
  const c = await cast(p, `${roh}/leben-${wert}`); await wait(500);
  const now = () => Date.now() / 1000; const t0 = now(); const marks = { ruhe: 0 }; const mark = (n) => { marks[n] = now() - t0; };
  await wait(6000);
  mark('tab'); { const r = await p.locator('.m-tabs button').nth(1).boundingBox(); await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await wait(80); await p.mouse.up(); } await wait(2300);
  mark('rollt'); await p.evaluate(() => new Promise((ok) => { const m = document.querySelector('.m-main'), y = m.scrollTop, t = performance.now(); const f = (n) => { const k = Math.min(400, n - t); m.scrollTop = y + k; if (k < 400) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); }));   // 1000 px a second for 0.4 s, then held
  mark('halt'); boxes.heute = (await cardTops()).find(([top]) => top > 110 && top < 560); await wait(1900);   // (the card whose top rim is in view after the roll)
  mark('ruhe2'); await wait(4300); mark('ende');
  const frames = await c.stop(); const errs = h.errors.filter((e) => !/open-meteo|Failed to load resource|ERR_|net::/i.test(e)); await h.close();
  fs.writeFileSync(`${roh}/leben-${wert}/frames.json`, JSON.stringify({ t0, marks, frames }));
  const n = frames.filter((f) => f.t >= t0 && f.t <= t0 + marks.ende).length;
  console.log(`--wa-leben ${got}: ${n} pictures in ${marks.ende.toFixed(1)} s (${(n / marks.ende).toFixed(1)} a second); marks ${Object.entries(marks).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}${errs.length ? '; errors ' + errs.slice(0, 2).join(' | ') : ''}`);
  tracks.push({ frames, from: t0, to: t0 + marks.ende, marks, boxes, wert, label: `Leben ${de(wert)}${i === 0 && wert === '1' ? ' (jetzt)' : ''}` });
}
await s.close();
const m = tracks[0].marks; const T = a.ton === 'klar' ? ', Ton „klar“' : '';
const captions = [{ from: 0, to: m.tab, text: 'in Ruhe – Start' }, { from: m.tab, to: m.rollt, text: 'Reiter gewechselt: Heute – die Karten kommen an' }, { from: m.rollt, to: m.halt, text: 'Liste wird gerollt' }, { from: m.halt, to: m.ruhe2, text: 'angehalten – das Licht schwingt aus' }, { from: m.ruhe2, to: m.ende + 1, text: 'in Ruhe – Heute' }];
const size = await encodeCast(tracks, out + '.mp4', { crf: +a.crf, captions, title: `Wasser-Look: wie viel Leben?${T}` });
console.log('ok', out + '.mp4', (fs.statSync(out + '.mp4').size / 1e6).toFixed(2), 'MB', `${size.width} x ${size.height}, ${size.seconds.toFixed(1)} s`);

// the filmstrip: the same moments of every recording, one row per value; below, four of them close up at full size
const at = (t, sec) => frameAt(t.frames, t.from + sec).file; const tmp = mkdir(out + '.d');
const moments = [[0.2, 'Start, in Ruhe'], [m.tab - 0.2, `${Math.round(m.tab)} s später`], [m.tab + 0.45, 'Reiter: nach 0,4 s'], [m.rollt + 0.33, 'Liste rollt'], [m.halt + 0.1, 'angehalten: 0,1 s'], [m.ende - 0.2, `Heute, ${Math.round(m.ende - m.ruhe2)} s in Ruhe`]];
const stills = []; for (const t of tracks) for (const [sec, label] of moments) stills.push({ file: at(t, sec), label });
await strip(stills, `${tmp}/a.png`, { title: `Wasser-Look: wie viel Leben?${T}`, note: 'Derselbe Weg durch die App, einmal je Wert von --wa-leben. Die Bewegung selbst zeigt der Film (gleicher Name, .mp4).', scale: 0.42, cols: moments.length, rowLabels: tracks.map((t) => t.label), captionSize: 15 });
const close = [[0.2, 'start', 'Start, in Ruhe'], [m.tab - 0.2, 'start', `${Math.round(m.tab)} s später: das Licht am Rand ist gewandert`], [m.halt + 0.1, 'heute', 'Liste angehalten (0,1 s): das Licht neigt sich'], [m.halt + 1.8, 'heute', '1,7 s später: ausgeschwungen']];
const crops = []; for (const t of tracks) for (const [k, [sec, where, label]] of close.entries()) { const top = Math.max(0, Math.min(844 - 200, (t.boxes[where] || [300])[0] - (where === 'heute' ? 40 : 12))); const file = `${tmp}/c-${t.wert}-${k}.png`; await sharp(at(t, sec)).extract({ left: 0, top, width: 390, height: 200 }).png().toFile(file); crops.push({ file, label }); }
await strip(crops, `${tmp}/b.png`, { note: 'Aus der Nähe (Originalgröße): der obere Rand einer Karte. Die helle Linie wandert in Ruhe am Rand entlang; beim Anhalten reicht ihr Schein kurz tiefer.', scale: 1, cols: close.length, rowLabels: tracks.map((t) => t.label), captionSize: 15 });
await stack([`${tmp}/a.png`, `${tmp}/b.png`], out + '.png', { palette: true }); fs.rmSync(tmp, { recursive: true, force: true });
console.log('ok', out + '.png', (fs.statSync(out + '.png').size / 1e3).toFixed(0), 'KB');
if (!a.roh) fs.rmSync(roh, { recursive: true, force: true });
