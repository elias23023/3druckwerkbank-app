// WebKit probe: how long the leaving picture of a closed sheet stays (polled every 250 ms), twice. node webkit-bogen.cjs <url> [webkit|chromium] <picture prefix>
// WebKit on the work machine: source the judge-phone env.sh first (guide section 8.3, NOTIZEN section 8).
const pw = require('/opt/node-tools/node_modules/playwright');
(async () => {
  const URL = process.argv[2]; const eng = process.argv[3] || 'webkit';
  const b = await pw[eng].launch();
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: eng !== 'firefox', hasTouch: true, timezoneId: 'Europe/Vienna', locale: 'de-AT' });
  const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
  await p.goto(URL + '/#/heute', { waitUntil: 'load', timeout: 60000 }); await p.waitForSelector('.m-shell[data-wasser="mobil"]'); await p.waitForTimeout(3000);
  for (let k = 0; k < 2; k++) {
    await p.locator('.m-head [aria-label="Einstellungen"]').tap(); await p.waitForTimeout(1500);
    await p.locator('.sheet:not(.wa-geht) .sheet__head button').last().tap();
    const log = await p.evaluate(() => new Promise((res) => { const t0 = performance.now(), out = []; const f = () => { const g = [...document.querySelectorAll('.wa-geht')].map((e) => e.className.split(' ').slice(0, 2).join('.') + ':' + getComputedStyle(e).opacity.slice(0, 4) + ':' + e.getAnimations().map((a) => a.animationName + '/' + a.playState).join(',')); out.push(Math.round(performance.now() - t0) + 'ms ' + g.join(' | ')); if (!g.length || performance.now() - t0 > 6000) res(out); else setTimeout(f, 250); }; f(); }));
    console.log(eng, 'round', k, log.join('\n  '));
    await p.screenshot({ path: process.argv[4] + '-' + k + '.png' });
  }
  console.log('errors', errs); await b.close();
})();
