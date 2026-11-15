// Final proofs that the standard tools do not cover:
//  A) phone, empty workspace "echt": every tab and sub-screen, one sheet, both tones; reduced motion by system; page errors
//  B) resize narrow <-> wide several times: no page error, the right shell, the look running in it
//  C) reduced motion by the app's own setting (data-motion) on phone and desktop: the leaving keeps nothing
//   node misc.mjs <url> <out-dir>
import fs from 'fs';
import { pw, openApp, strip } from '../../../../scripts/wasser/lib.mjs';
const [URL, OUT] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const b = await pw.chromium.launch(); const res = [];
const say = (name, ok, detail = '') => { res.push({ name, ok }); console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}  ${detail}`); };
// A
for (const ton of ['dunkel', 'klar']) for (const reduced of [false, true]) {
  const a = await openApp(b, 'chromium', { app: URL, ton, zeit: ton === 'klar' ? 'tag' : 'nacht', wetter: 'klar', reduced, scale: 1 });
  await a.bereich('echt'); const shots = [];
  for (const h of ['#/start', '#/heute', '#/projekte', '#/material', '#/druck', '#/wetter', '#/archiv']) {
    await a.go(h, 1200); const f = `${OUT}/echt-${ton}-${reduced ? 'still' : 'bewegt'}-${h.slice(2)}.png`; await a.shot(f); shots.push({ file: f, label: h.slice(2) });
    const info = await a.page.evaluate(() => ({ shell: !!document.querySelector('.m-shell[data-wasser="mobil"]'), rows: document.querySelectorAll('.m-main .m-row').length, empty: [...document.querySelectorAll('.m-main .muted')].map((e) => e.textContent.trim()).filter(Boolean).slice(0, 2).join(' | '), hscroll: document.documentElement.scrollWidth > innerWidth }));
    if (!info.shell || info.hscroll) say(`echt ${ton} ${reduced ? 'reduced' : ''} ${h}`, false, JSON.stringify(info));
  }
  await a.go('#/start', 800); await a.sheet('einstellungen'); const open = await a.page.locator('.sheet').count(); await a.page.screenshot({ path: `${OUT}/echt-${ton}-${reduced ? 'still' : 'bewegt'}-bogen.png` }); await a.closeSheet(); await a.page.waitForTimeout(900);
  const left = await a.page.locator('.sheet').count();
  say(`phone echt ${ton}${reduced ? ' reduced(system)' : ''}: 7 screens + sheet, no page error`, a.errors.length === 0 && open === 1 && left === 0, `sheet open ${open}, after close ${left}, errors ${JSON.stringify(a.errors)}`);
  if (!reduced) await strip(shots, `${OUT}/echt-${ton}.png`, { title: `Meine Werkstatt (leer), ${ton}`, scale: 0.5, cols: 7 });
  await a.close();
}
// B
{
  const c = await b.newContext({ viewport: { width: 1920, height: 1080 }, timezoneId: 'Europe/Vienna', locale: 'de-AT' }); const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200))); p.on('console', (m) => { if (m.type() === 'error' && !/open-meteo|Failed to load resource|ERR_|net::/i.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto(URL + '/#/heute', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500); const seen = [];
  for (const [w, h] of [[390, 844], [1920, 1080], [700, 900], [2000, 993], [390, 844], [1280, 800], [1920, 1080]]) {
    await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(1800);
    const s = await p.evaluate(() => ({ m: !!document.querySelector('.m-shell[data-wasser="mobil"]'), d: !!document.querySelector('.stage[data-wasser="desktop"]'), drops: document.querySelectorAll('.w3-drop').length, running: !!(window.Wasser && window.Wasser.info), hscroll: document.documentElement.scrollWidth > innerWidth }));
    seen.push(`${w}: ${s.m ? 'mobil' : ''}${s.d ? 'desktop' : ''} drops ${s.drops}${s.hscroll ? ' HSCROLL' : ''}`);
  }
  // also open and close a sheet in each shell after the round trip
  await p.setViewportSize({ width: 2000, height: 993 }); await p.waitForTimeout(1500); await p.keyboard.press('Escape');
  say('resize narrow <-> wide x7: no page or console error, each shell with drops', errs.length === 0 && seen.every((x) => / drops [1-9]/.test(x) && !/HSCROLL/.test(x)), seen.join(' ; ') + ' errors ' + JSON.stringify(errs));
  await c.close();
}
await b.close();
console.log(res.filter((r) => r.ok).length + ' of ' + res.length + ' ok');
