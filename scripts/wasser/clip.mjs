// A short recording of the look in motion, as MP4 (H.264; needs ffmpeg - without it the WebM of the browser stays).
//
//   node scripts/wasser/clip.mjs <out.mp4> [--seite app|mobil] [--look vorlage|<folder>] [--ton klar] [--engine chromium|webkit] [--scene start] [--crf 26] [--reduced]
//
//   --seite app    (default) the REAL app at phone size, a little over 20 s: at rest, a tab change, a long list scrolled and
//                  let go, a button on a card held down, the form sheet it opens, a field focused and a few letters typed, the
//                  sheet closed, a check ticked, an entry removed (toast). Needs npm run build && npm run preview.
//   --seite mobil  the harness page (scripts/wasser/mobil.html), about 9 s: at rest, three tab taps, a card button held.
// The picture is 390 x 844 (a recording has the size of the page in CSS px). The work machine renders WebGL in software,
// so a recording made there is choppy; the filmstrips (film.mjs) show the fine points.
import fs from 'fs'; import { execFileSync } from 'child_process';
import { session, args, abs, mkdir } from './lib.mjs';
const a = args({ seite: 'app', look: 'vorlage', ton: '', engine: 'chromium', scene: 'start', crf: '26' }); if (!a._[0]) { console.log('usage: node scripts/wasser/clip.mjs <out.mp4> [--seite app|mobil] [--look vorlage|<folder>] [--ton klar] [--engine chromium|webkit]'); process.exit(1); }
const out = abs(a._[0]); const dir = mkdir(out + '.d'); const s = await session({ engine: a.engine }); const t0 = Date.now(); const mark = (m) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(5), m);
let h, p; const wait = (ms) => p.waitForTimeout(ms);
const tap = async (loc, hold = 90) => { const r = await loc.first().boundingBox(); await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await wait(hold); await p.mouse.up(); };
if (a.seite === 'mobil') {
  h = await s.harness({ look: a.look, ton: a.ton, scene: a.scene, touch: true, reduced: !!a.reduced, video: dir, settle: 0 }); p = h.page; const tab = (i) => p.locator('.m-tabs button').nth(i);
  mark('at rest'); await wait(1900); mark('tab Projekte'); await tap(tab(2), 260); await wait(1350); mark('tab Material'); await tap(tab(3), 200); await wait(1100);
  mark('tab Start'); await tap(tab(0), 200); await wait(1200); mark('a card button held'); await tap(p.locator('.m-main > .m-card .btn:not(.btn--primary):not(.btn--icon)'), 380); await wait(1300);
} else {
  h = await s.app({ look: a.look, ton: a.ton, reduced: !!a.reduced, video: dir }); p = h.page;
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
const webm = await h.close(); await s.close();
try {
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-crf', String(a.crf), '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out]);
  fs.rmSync(dir, { recursive: true, force: true }); console.log('ok', out, (fs.statSync(out).size / 1e6).toFixed(2), 'MB');
} catch (e) { const keep = out.replace(/\.mp4$/, '') + '.webm'; fs.renameSync(webm, keep); fs.rmSync(dir, { recursive: true, force: true }); console.log('ffmpeg not available: kept', keep); }
