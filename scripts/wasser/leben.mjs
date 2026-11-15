// HOW MUCH LIFE? One comparison to judge on a phone: the same short walk through the REAL app, recorded once per value of
// the master token --wa-leben (kern.css, part 3) - or once per copy of the template (--looks) -, the recordings side by side
// as phones, labelled, in real time.
//
//   node scripts/wasser/leben.mjs <out> [--werte 1,1.5] [--ton klar] [--look auto|eingebaut|vorlage|<folder>] [--crf 17] [--roh <dir>]
//        [--looks 'Name=<look>,Name=<look>'] [--weg rundgang|ruhe] [--welt heute] [--sekunden 20] [--titel '...']
//   (--look: head of lib.mjs. Default auto = the look the app has built in.)
//
//   --looks   one recording per look instead of one per value: 'Tempo bisher=git:52dfff3,Tempo neu=vorlage' (each <look> as
//             --look takes it: auto | eingebaut | vorlage | <folder> | git:<revision>; with a look built in, a folder or git:
//             REPLACES it - the mode "ersetzt" of lib.mjs). --werte is then one value (default 1). Each label gets the
//             four lengths of the lights at rest as the page REALLY has them, "(24 / 34 / 40 / 46 s)" - read from the
//             computed style of that recording, so a label can never name the wrong folder without the numbers saying so.
//   --weg     rundgang (default): the walk below.  ruhe: --welt (default start) at rest for --sekunden (default 20): nothing
//             is touched, the water is woken once just before the recording starts (it rests after 30 s without touch).
//
// Writes <out>.mp4 (H.264, yuv420p) and <out>.png (the same as a filmstrip, for a reader who cannot play it).
// The walk (rundgang, about 15 s): 6 s at rest on "Start" - a tap on the tab "Heute" (a screen of rows: the bead flows, the
// cards arrive, their light swings into place) - the list is rolled at 1000 px a second for 0.4 s and stopped dead (the light
// leans, then swings out) - 4 s at rest there. ("Start" itself cannot be scrolled at phone height, so the roll comes after the tab.)
// The first value is labelled "(jetzt)" when it is the built value 1.
// Recorded through the browser's screencast (lib.mjs, cast): Chromium only; needs ffmpeg and the app's preview
// (npm run build && npm run preview). The app's clock stands still and it gets no weather, so the phones differ by the
// life alone. The work machine renders in software: the drops are drawn a little less often than on a phone.
// --roh keeps the single frames (JPEG, with frames.json: file and time of each) for a closer look.
import fs from 'fs'; import os from 'os'; import path from 'path';
import { session, cast, encodeCast, frameAt, strip, stack, sharp, args, abs, mkdir, lookArg, sayLook, fail } from './lib.mjs';
const USAGE = "usage: node scripts/wasser/leben.mjs <out> [--werte 1,1.5] [--ton klar] [--look auto|eingebaut|vorlage|<folder>] [--crf 17] [--roh <dir>] [--looks 'Name=<look>,Name=<look>'] [--weg rundgang|ruhe] [--welt start] [--sekunden 20] [--titel '...']";
const a = args({ werte: '', ton: '', look: 'auto', crf: '17', roh: '', looks: '', weg: 'rundgang', welt: '', sekunden: '', titel: '' },
  { choices: { ton: ['dunkel', 'klar'], weg: ['rundgang', 'ruhe'], welt: ['start', 'heute', 'projekte', 'material', 'druck', 'wetter', 'archiv'] } }); if (a._.length !== 1) fail(USAGE, 1);
if (a.weg !== 'ruhe' && (a.welt || a.sekunden)) fail('--welt and --sekunden belong to --weg ruhe');
const sekunden = a.sekunden === '' ? 20 : +a.sekunden; if (!(sekunden >= 3 && sekunden <= 28)) fail(`--sekunden ${a.sekunden}: 3 to 28 (the water rests after 30 s without touch)`);
const welt = a.welt || 'start';
if (a.looks && a.look !== 'auto') fail('--look and --looks: give the looks in --looks only');
const werteText = a.werte || (a.looks ? '1' : '1,1.5');
if (werteText.split(',').some((v) => !(+v >= 0 && +v <= 2))) fail(`--werte ${werteText}: numbers from 0 to 2, separated by commas`);
if (a.looks && werteText.includes(',')) fail('--looks: one recording per look - give --werte one value only');
// the recordings: [{ look, wert, name }]
const runs = a.looks
  ? a.looks.split(',').map((x) => { const k = x.indexOf('='); if (k < 1) fail(`--looks ${a.looks}: "${x}" is not Name=<look>`); const look = lookArg(x.slice(k + 1).trim()); if (!look) fail('--looks: "ohne" has no lights at rest'); return { look, wert: werteText, name: x.slice(0, k).trim() }; })
  : werteText.split(',').map((wert) => { const look = lookArg(a.look); if (!look) fail('--look ohne: --wa-leben is a value of the look'); return { look, wert, name: '' }; });
if (runs.length < 1) fail(USAGE, 1);
const out = abs(a._[0]).replace(/\.(mp4|png)$/, ''); const roh = a.roh ? mkdir(abs(a.roh)) : fs.mkdtempSync(path.join(os.tmpdir(), 'wasser-leben-'));
const de = (v) => String(v).replace('.', ','); const s = await session({ engine: 'chromium' }); const tracks = [];
const cardTops = (p) => p.evaluate(() => [...document.querySelectorAll('.m-main > .glass.m-card')].map((c) => { const r = c.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)]; }));
for (const [i, run] of runs.entries()) {
  const { wert } = run;
  const h = await s.app({ look: run.look, ton: a.ton, zeit: '2026-11-12T17:42:00+01:00' }); const p = h.page; const wait = (ms) => p.waitForTimeout(ms); sayLook(h);
  if (wert !== '1') await p.addStyleTag({ content: `[data-wasser] { --wa-leben: ${wert}; }` });   // after the look's own stylesheet: it wins. On the root, where the lights are built from it
  const got = await p.evaluate(() => getComputedStyle(document.querySelector('[data-wasser]')).getPropertyValue('--wa-leben').trim());
  // the four lengths of the lights at rest, as this page really has them (the label carries them)
  const laengen = await p.evaluate(() => { const cs = getComputedStyle(document.querySelector('[data-wasser]')); return [1, 2, 3, 4].map((n) => cs.getPropertyValue('--wa-t-ruhe-' + n).trim().replace(/s$/, '')); });
  const dir = `${roh}/leben-${i}`; const now = () => Date.now() / 1000; let t0, marks, boxes, c;
  if (a.weg === 'ruhe') {
    await h.go('#/' + welt, 3000);                                 // the light of the screen has swung into place
    boxes = { start: (await cardTops(p)).find(([top, hh]) => hh > 100 && top > 60) || (await cardTops(p))[0] };
    await p.evaluate(() => window.dispatchEvent(new Event('scroll')));   // wakes the water's clock (wasser.js listens for scroll; nothing moves): 30 s awake from here
    c = await cast(p, dir); await wait(500); t0 = now(); marks = { ruhe: 0 };
    await wait(sekunden * 1000); marks.ende = now() - t0;
  } else {
    await h.go('#/start', 3000);                                   // the light of the start screen has swung into place
    boxes = { start: (await cardTops(p)).find(([, hh]) => hh > 100) };   // the first card of some height on "Start", for the close look of the filmstrip
    c = await cast(p, dir); await wait(500);
    t0 = now(); marks = { ruhe: 0 }; const mark = (n) => { marks[n] = now() - t0; };
    await wait(6000);
    mark('tab'); { const r = await p.locator('.m-tabs button').nth(1).boundingBox(); await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await wait(80); await p.mouse.up(); } await wait(2300);
    mark('rollt'); await p.evaluate(() => new Promise((ok) => { const m = document.querySelector('.m-main'), y = m.scrollTop, t = performance.now(); const f = (n) => { const k = Math.min(400, n - t); m.scrollTop = y + k; if (k < 400) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); }));   // 1000 px a second for 0.4 s, then held
    mark('halt'); boxes.heute = (await cardTops(p)).find(([top]) => top > 110 && top < 560); await wait(1900);   // (the card whose top rim is in view after the roll)
    mark('ruhe2'); await wait(4300); mark('ende');
  }
  const frames = await c.stop(); const errs = h.errors.filter((e) => !/open-meteo|Failed to load resource|ERR_|net::/i.test(e)); await h.close();
  fs.writeFileSync(`${dir}/frames.json`, JSON.stringify({ t0, marks, frames }));
  const n = frames.filter((f) => f.t >= t0 && f.t <= t0 + marks.ende).length;
  const lens = `${laengen.join(' / ')} s`;
  console.log(`${run.name ? run.name + ' = ' + run.look + ': ' : ''}--wa-leben ${got}, lights at rest ${lens}: ${n} pictures in ${marks.ende.toFixed(1)} s (${(n / marks.ende).toFixed(1)} a second); marks ${Object.entries(marks).map(([k, v]) => `${k} ${v.toFixed(2)}`).join(', ')}${errs.length ? '; errors ' + errs.slice(0, 2).join(' | ') : ''}`);
  const label = run.name ? `${run.name} (${de(lens)})` : `Leben ${de(wert)}${i === 0 && wert === '1' ? ' (jetzt)' : ''}`;
  tracks.push({ frames, from: t0, to: t0 + marks.ende, marks, boxes, wert, key: i, label });
}
await s.close();
const m = tracks[0].marks; const T = a.ton === 'klar' ? ', Ton „klar“' : '';
const NAMEN = { start: 'Start', heute: 'Heute', projekte: 'Projekte', material: 'Material', druck: 'Mehr', wetter: 'Wetter', archiv: 'Archiv' };
const title = a.titel || (a.looks ? `Wasser-Look: zwei Stände nebeneinander${T}` : `Wasser-Look: wie viel Leben?${T}`);
const captions = a.weg === 'ruhe'
  ? [{ from: 0, to: m.ende + 1, text: `in Ruhe – ${NAMEN[welt]}, nichts wird berührt (Echtzeit)` }]
  : [{ from: 0, to: m.tab, text: 'in Ruhe – Start' }, { from: m.tab, to: m.rollt, text: 'Reiter gewechselt: Heute – die Karten kommen an' }, { from: m.rollt, to: m.halt, text: 'Liste wird gerollt' }, { from: m.halt, to: m.ruhe2, text: 'angehalten – das Licht schwingt aus' }, { from: m.ruhe2, to: m.ende + 1, text: 'in Ruhe – Heute' }];
const size = await encodeCast(tracks, out + '.mp4', { crf: +a.crf, captions, title });
console.log('ok', out + '.mp4', (fs.statSync(out + '.mp4').size / 1e6).toFixed(2), 'MB', `${size.width} x ${size.height}, ${size.seconds.toFixed(1)} s`);

// the filmstrip: the same moments of every recording, one row per recording; below, four of them close up at full size
const at = (t, sec) => frameAt(t.frames, t.from + sec).file; const tmp = mkdir(out + '.d');
const end = Math.min(...tracks.map((t) => t.marks.ende));
const moments = a.weg === 'ruhe'
  ? [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) => { const sec = Math.max(0.2, Math.min(end - 0.2, f * end)); return [sec, `${de(sec.toFixed(1))} s`]; })
  : [[0.2, 'Start, in Ruhe'], [m.tab - 0.2, `${Math.round(m.tab)} s später`], [m.tab + 0.45, 'Reiter: nach 0,4 s'], [m.rollt + 0.33, 'Liste rollt'], [m.halt + 0.1, 'angehalten: 0,1 s'], [m.ende - 0.2, `Heute, ${Math.round(m.ende - m.ruhe2)} s in Ruhe`]];
const note = a.looks ? 'Derselbe Weg durch die App, einmal je Stand. Die Bewegung selbst zeigt der Film (gleicher Name, .mp4).' : 'Derselbe Weg durch die App, einmal je Wert von --wa-leben. Die Bewegung selbst zeigt der Film (gleicher Name, .mp4).';
const stills = []; for (const t of tracks) for (const [sec, label] of moments) stills.push({ file: at(t, sec), label });
await strip(stills, `${tmp}/a.png`, { title, note, scale: 0.42, cols: moments.length, rowLabels: tracks.map((t) => t.label), captionSize: 15 });
const close = a.weg === 'ruhe'
  ? [0, 1 / 3, 2 / 3, 1].map((f, k) => { const sec = Math.max(0.2, Math.min(end - 0.2, f * end)); return [sec, 'start', k ? `${de(sec.toFixed(1))} s: das Licht am Rand ist gewandert` : 'am Anfang']; })
  : [[0.2, 'start', 'Start, in Ruhe'], [m.tab - 0.2, 'start', `${Math.round(m.tab)} s später: das Licht am Rand ist gewandert`], [m.halt + 0.1, 'heute', 'Liste angehalten (0,1 s): das Licht neigt sich'], [m.halt + 1.8, 'heute', '1,7 s später: ausgeschwungen']];
const crops = []; for (const t of tracks) for (const [k, [sec, where, label]] of close.entries()) { const top = Math.max(0, Math.min(844 - 200, (t.boxes[where] || [300])[0] - (where === 'heute' ? 40 : 12))); const file = `${tmp}/c-${t.key}-${k}.png`; await sharp(at(t, sec)).extract({ left: 0, top, width: 390, height: 200 }).png().toFile(file); crops.push({ file, label }); }
await strip(crops, `${tmp}/b.png`, { note: 'Aus der Nähe (Originalgröße): der obere Rand einer Karte. Die helle Linie wandert in Ruhe am Rand entlang' + (a.weg === 'ruhe' ? '.' : '; beim Anhalten reicht ihr Schein kurz tiefer.'), scale: 1, cols: close.length, rowLabels: tracks.map((t) => t.label), captionSize: 15 });
await stack([`${tmp}/a.png`, `${tmp}/b.png`], out + '.png', { palette: true }); fs.rmSync(tmp, { recursive: true, force: true });
console.log('ok', out + '.png', (fs.statSync(out + '.png').size / 1e3).toFixed(0), 'KB');
if (!a.roh) fs.rmSync(roh, { recursive: true, force: true });
