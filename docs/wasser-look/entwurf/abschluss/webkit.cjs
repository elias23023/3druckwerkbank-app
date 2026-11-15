// WebKit smoke test of the fine-tuning on the phone (Playwright's WebKit, software GL): soft leaving, the drop behind a sheet,
// the background crossfade, no page errors. Not a substitute for Safari on an iPhone.   node webkit.cjs <url>
const pw = require('/opt/node-tools/node_modules/playwright');
const URL = process.argv[2]; const res = [];
const say = (n, ok, d = '') => { res.push(ok); console.log(`${ok ? 'ok  ' : 'FAIL'} ${n}  ${d}`); };
(async () => {
  const b = await pw.webkit.launch();
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: 'Europe/Vienna', locale: 'de-AT' });
  const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(URL + '/#/heute', { waitUntil: 'load', timeout: 60000 }); await p.waitForSelector('.m-shell[data-wasser="mobil"]'); await p.waitForTimeout(3000);
  // 1. a sheet closes softly: a ghost .wa-geht appears and is gone after the leaving time
  await p.locator('.m-head [aria-label="Einstellungen"]').tap(); await p.waitForTimeout(1500);
  const behind = await p.evaluate(() => ({ settling: window.Wasser.info.settling, resting: window.Wasser.info.resting }));
  say('drop behind the sheet: settled 1.5 s after the tap', behind.settling === 0 && behind.resting > 0, JSON.stringify(behind));
  await p.locator('.sheet .sheet__head button').last().tap();
  const g1 = await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(document.querySelectorAll('.sheet.wa-geht, .sheet-back.wa-geht').length))));
  await p.waitForTimeout(1200); const g2 = await p.evaluate(() => document.querySelectorAll('.wa-geht').length + document.querySelectorAll('.sheet').length);
  say('sheet leaves softly and is gone', g1 > 0 && g2 === 0, `ghosts at once ${g1}, after 1.2 s ${g2}`);
  // 2. a ticked task leaves softly, the store changed at once
  const card = p.locator('.m-main .m-card', { hasText: 'Aufgaben' }).first(); const n0 = await card.locator('.m-row[data-gehen]:not(.wa-geht)').count();
  await card.locator('.m-row[data-gehen]:not(.wa-geht) .check').first().tap();
  const r1 = await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r(document.querySelectorAll('.m-row.wa-geht').length))));
  await p.waitForTimeout(1000); const n1 = await card.locator('.m-row[data-gehen]:not(.wa-geht)').count(); const r2 = await p.locator('.wa-geht').count();
  say('ticked row leaves softly and is gone', r1 === 1 && r2 === 0 && n1 === n0 - 1, `rows ${n0} -> ${n1}, ghost at once ${r1}, after 1 s ${r2}`);
  // 3. tab change: background crossfade ends with one picture, the drops on the new scene
  await p.locator('.m-tabs button', { hasText: 'Material' }).tap(); await p.waitForTimeout(2500);
  const bg = await p.evaluate(() => ({ imgs: document.querySelectorAll('.m-bg img').length, src: (document.querySelector('.m-bg img:last-child') || {}).currentSrc, scene: window.Wasser.info.scene }));
  say('background after the tab change: one picture, drops on it', bg.imgs === 1 && /material/.test(bg.src || '') && /material/.test(bg.scene || ''), JSON.stringify(bg));
  // 4. toast replaced by toast
  await p.locator('.m-main').evaluate((e) => { e.scrollTop = 99999; }); await p.waitForTimeout(600);
  await p.locator('.m-main .m-shop:not(.wa-geht) .btn--icon').first().tap(); await p.waitForTimeout(900);
  await p.locator('.toast__undo').first().tap();
  const t1 = await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => r([...document.querySelectorAll('.toast')].map((t) => t.textContent.trim().slice(0, 30) + (t.classList.contains('wa-geht') ? ' (geht)' : ''))))));
  await p.waitForTimeout(1200); const t2 = await p.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent.trim().slice(0, 30)));
  say('toast replaced softly, old copy gone', t2.length === 1 && /Wiederhergestellt/.test(t2[0]), `at once ${JSON.stringify(t1)}, after 1.2 s ${JSON.stringify(t2)}`);
  say('no page error in WebKit', errs.length === 0, JSON.stringify(errs));
  await b.close(); console.log(res.filter(Boolean).length + ' of ' + res.length + ' ok');
})().catch((e) => { console.log('ERR', String(e).slice(0, 400)); process.exit(1); });
