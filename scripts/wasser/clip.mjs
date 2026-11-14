// A short recording of the look in motion, as MP4 (H.264; needs ffmpeg - without it the WebM of the browser stays).
//
//   node scripts/wasser/clip.mjs <out.mp4> [--seite app|mobil] [--look auto|eingebaut|vorlage|<folder>] [--ton klar] [--engine chromium|webkit] [--scene start] [--crf 26] [--reduced] [--cast]
//   (--look: head of lib.mjs. Default auto = the look the app has built in; the harness page shows the template.)
//
//   --seite app    (default) the REAL app at phone size, a little over 20 s: at rest, a tab change, a long list scrolled and
//                  let go, a button on a card held down, the form sheet it opens, a field focused and a few letters typed, the
//                  sheet closed, a check ticked, an entry removed (toast). Needs npm run build && npm run preview.
//   --seite mobil  the harness page (scripts/wasser/mobil.html), about 9 s: at rest, three tab taps, a card button held.
//   --cast         record through the browser's own screencast instead of Playwright's video recorder (Chromium only):
//                  every picture as a JPEG with its true time, put together at those times and encoded at --crf (default
//                  then 17). Use it whenever SOFT LIGHT is to be judged - the life at rest, the floor light, the lean while
//                  scrolling: the video recorder is a low-bitrate VP8 stream whose noise is larger than that light (lib.mjs,
//                  "recording through the browser's screencast"). The comparison of two values of --wa-leben side by side
//                  is a tool of its own: leben.mjs.
// The picture is 390 x 844 (a recording has the size of the page in CSS px). The work machine renders WebGL in software,
// so a recording made there is choppy; the filmstrips (film.mjs) show the fine points.
import fs from 'fs'; import { execFileSync } from 'child_process';
import { session, cast, encodeCast, args, abs, mkdir, lookArg, sayLook, fail, ENGINES, SZENEN } from './lib.mjs';
const a = args({ seite: 'app', look: 'auto', ton: '', engine: 'chromium', scene: 'start', crf: '' }, { flags: ['reduced', 'cast'], choices: { seite: ['app', 'mobil'], engine: ENGINES, ton: ['dunkel', 'klar'], scene: SZENEN } }); a.crf = a.crf || (a.cast ? '17' : '26'); if (a.cast && a.engine !== 'chromium') fail('--cast needs --engine chromium'); if (a._.length !== 1) fail('usage: node scripts/wasser/clip.mjs <out.mp4> [--seite app|mobil] [--look auto|eingebaut|vorlage|<folder>] [--ton klar] [--engine chromium|webkit] [--cast]', 1);
const look = lookArg(a.look, { harness: a.seite === 'mobil' }); if (!look) fail('--look ohne: there is no motion of the look to record without the look');
const out = abs(a._[0]); const dir = mkdir(out + '.d'); const s = await session({ engine: a.engine }); const t0 = Date.now(); const mark = (m) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(5), m);
let h, p, rec = null; const wait = (ms) => p.waitForTimeout(ms); const video = a.cast ? null : dir;
const tap = async (loc, hold = 90) => { const r = await loc.first().boundingBox(); await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await wait(hold); await p.mouse.up(); };
if (a.seite === 'mobil') {
  h = await s.harness({ look, ton: a.ton, scene: a.scene, touch: true, reduced: !!a.reduced, video, settle: 0 }); p = h.page; const tab = (i) => p.locator('.m-tabs button').nth(i); if (a.cast) rec = await cast(p, dir);
  mark('at rest'); await wait(1900); mark('tab Projekte'); await tap(tab(2), 260); await wait(1350); mark('tab Material'); await tap(tab(3), 200); await wait(1100);
  mark('tab Start'); await tap(tab(0), 200); await wait(1200); mark('a card button held'); await tap(p.locator('.m-main > .m-card .btn:not(.btn--primary):not(.btn--icon)'), 380); await wait(1300);
} else {
  h = await s.app({ look, ton: a.ton, reduced: !!a.reduced, video }); p = h.page; sayLook(h); if (a.cast) rec = await cast(p, dir);
  // a finger's flick: the list runs dy px in ms, slowing down a little, and is then held (stops at once)
  const flick = (dy, ms) => p.evaluate(([dy, ms]) => new Promise((ok) => { const m = document.querySelector('.m-main'), y = m.scrollTop, t = performance.now(); const f = (now) => { const k = Math.min(1, (now - t) / ms); m.scrollTop = y + dy * (1 - Math.pow(1 - k, 1.6)); if (k < 1) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); }), [dy, ms]);
  mark('at rest on Start'); await wait(3000);
  mark('tab Material'); await tap(p.locator('.m-tabs button').nth(3)); await wait(1700);
  mark('scroll and let go'); await flick(620, 650); await wait(1400); await flick(-260, 420); await wait(1000);
  mark('a button on a card held down'); const neu = p.locator('.m-main .btn', { hasText: 'Neue Rolle' }); await neu.scrollIntoViewIfNeeded(); await wait(900); await tap(neu, 520); await wait(1500);
  mark('a field takes the focus, letters are typed'); await tap(p.locator('.sheet .input')); await wait(450); await p.keyboard.type('PETG Blau', { delay: 95 }); await wait(800);
  mark('the sheet is closed'); await h.closeSheet(); await wait(900);
  mark('to the end of the list'); await flick(2000, 600); await wait(1200);
  mark('a check is ticked'); await tap(p.locator('.m-main .m-shop .check')); await wait(1400);
  mark('an entry is removed: toast'); await tap(p.locator('.m-main .m-shop .btn--icon').last()); await wait(2000);
}
const errs = h.errors.filter((e) => !/open-meteo|Failed to load resource|ERR_|net::/i.test(e)); if (errs.length) console.log('errors', errs.slice(0, 3));
if (rec) {                                                         // the screencast: its pictures at their true times
  const frames = await rec.stop(); await h.close(); await s.close(); const size = await encodeCast([{ frames, from: frames[0].t, to: frames[frames.length - 1].t }], out, { crf: +a.crf });
  console.log('ok', out, (fs.statSync(out).size / 1e6).toFixed(2), 'MB', `${frames.length} pictures in ${size.seconds.toFixed(1)} s (${(frames.length / size.seconds).toFixed(1)} a second)`); process.exit(0);
}
const webm = await h.close(); await s.close();
try {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-crf', String(a.crf), '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out]);
  fs.rmSync(dir, { recursive: true, force: true }); console.log('ok', out, (fs.statSync(out).size / 1e6).toFixed(2), 'MB');
} catch (e) { const keep = out.replace(/\.mp4$/, '') + '.webm'; fs.renameSync(webm, keep); fs.rmSync(dir, { recursive: true, force: true }); console.log('ffmpeg not available: kept', keep); }
