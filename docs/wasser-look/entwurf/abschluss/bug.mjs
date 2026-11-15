// The owner's bug: a tapped drop stood still with its rings while its sheet was open. Phone header around the gear,
// before (feinschliff-basis) and after (final), at rest, 1 s and 3 s after the tap; enlarged.
//   node bug.mjs <vorher-url> <nachher-url> <out.png>
import fs from 'fs';
import { pw, openApp, strip, diff } from '../../../../scripts/wasser/lib.mjs';
const [VOR, NACH, OUT] = process.argv.slice(2); const RAW = OUT + '.roh'; fs.mkdirSync(RAW, { recursive: true });
const b = await pw.chromium.launch(); const frames = []; const info = {};
for (const [side, url] of [['vor', VOR], ['nach', NACH]]) {
  const a = await openApp(b, 'chromium', { app: url, ton: 'dunkel', zeit: 'nacht', wetter: 'klar', reduced: false, scale: 2 });
  const p = a.page; await a.go('#/start', 3000);
  const gear = p.locator('.m-head [aria-label="Einstellungen"]'); const g = await gear.boundingBox();
  const clip = { x: Math.max(0, g.x - 70), y: Math.max(0, g.y - 14), width: g.width + 84, height: g.height + 28 };
  const shot = async (k) => { const f = `${RAW}/${side}-${k}.png`; await p.screenshot({ path: f, clip }); return f; };
  // wake the water and let it settle; then the picture at rest
  await p.waitForTimeout(800); const f0 = await shot('ruhe');
  const cdp = await p.context().newCDPSession(p); const pt = [{ x: g.x + g.width / 2, y: g.y + g.height / 2 }];
  const t = Date.now(); await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt }); await p.waitForTimeout(140); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });   // a finger, held 140 ms as a person does (a Playwright tap is instant)
  await p.waitForTimeout(Math.max(0, 1000 - (Date.now() - t))); const f1 = await shot('1s');
  await p.waitForTimeout(Math.max(0, 2000 - (Date.now() - t))); const f2 = await shot('2s');
  await p.waitForTimeout(Math.max(0, 3000 - (Date.now() - t))); const f3 = await shot('3s');
  info[side] = { '1s->2s': await diff(f1, f2), '2s->3s': await diff(f2, f3), resting: await p.evaluate(() => window.Wasser?.info?.resting), settling: await p.evaluate(() => window.Wasser?.info?.settling) };
  frames.push({ file: f0, label: 'vor dem Tippen' }, { file: f1, label: '1 s nach dem Tippen' }, { file: f3, label: '3 s nach dem Tippen' });
  await a.close();
}
await b.close();
console.log(JSON.stringify(info));
await strip(frames, OUT, { title: 'Der Fehler von der echten Seite: Zahnrad antippen, der Bogen „Einstellungen“ geht auf', note: 'Oben bisher: Der Tropfen bleibt mitten im Ring stehen, solange der Bogen offen ist. Unten neu: Er klingt aus und ruht. 3-fach vergrößert.', scale: 1.5, cols: 3, rowLabels: ['bisher (vor dem Feinschliff)', 'neu'], captionSize: 20 });
console.log('done', OUT);
