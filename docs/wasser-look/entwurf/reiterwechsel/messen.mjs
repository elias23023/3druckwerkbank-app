// Measures the tab change on the phone view: first visit vs repeat, with and without the water look.
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const base = process.argv[2] || 'http://localhost:4176';
const throttle = Number(process.argv[3] || 4);
const browser = await pw.chromium.launch();
async function run(label, { stopWasser = false, slowNet = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (slowNet) await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 1.6e6 / 8 * 4, uploadThroughput: 750e3 / 8 });
  await page.goto(base + '/#/start', { waitUntil: 'load' });
  await page.waitForSelector('.m-tabs button');
  await page.waitForTimeout(2500);
  if (stopWasser) await page.evaluate(() => window.Wasser && window.Wasser.stop());
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  await page.evaluate(() => {
    window.__long = [];
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__long.push({ s: e.startTime, d: e.duration }); }).observe({ entryTypes: ['longtask'] });
  });
  const order = ['Heute', 'Projekte', 'Material', 'Mehr', 'Start', 'Heute', 'Projekte', 'Material', 'Mehr', 'Start'];
  const rows = [];
  for (const [i, name] of order.entries()) {
    const r = await page.evaluate((name) => new Promise((resolve) => {
      const btn = [...document.querySelectorAll('.m-tabs button')].find((b) => b.textContent.trim() === name);
      const t0 = performance.now(); const out = { name };
      btn.click();
      out.sync = performance.now() - t0;                                   // synchronous part of the click (React render if flushed)
      const check = () => {
        if (btn.getAttribute('aria-current') === 'page' && out.dom === undefined) out.dom = performance.now() - t0;
        if (out.dom !== undefined) {
          requestAnimationFrame(() => requestAnimationFrame(() => {
            out.frame = performance.now() - t0;
            const img = document.querySelector('.m-bg img');
            const done = () => { out.img = performance.now() - t0; out.cached = out.img - out.frame < 5; setTimeout(() => { out.long = window.__long.filter((l) => l.s >= t0 - 1).map((l) => Math.round(l.d)); out.canv = document.querySelectorAll('.m-shell canvas').length; resolve(out); }, 900); };
            if (img.complete && img.naturalWidth) done(); else img.addEventListener('load', done, { once: true });
          }));
        } else requestAnimationFrame(check);
      };
      check();
    }), name);
    rows.push({ visit: i < 5 ? 'erster' : 'zweiter', ...r });
    await page.waitForTimeout(600);
  }
  await ctx.close();
  console.log('\n== ' + label + ' (CPU x' + throttle + ') ==');
  for (const r of rows) console.log(`${r.visit.padEnd(8)} ${r.name.padEnd(9)} klick ${r.sync.toFixed(0).padStart(4)} ms | DOM ${r.dom.toFixed(0).padStart(4)} | Bild steht ${r.frame.toFixed(0).padStart(4)} | Szene geladen ${r.img.toFixed(0).padStart(5)} | lange Aufgaben [${r.long.join(',')}] | canvas ${r.canv}`);
  return rows;
}
const a = await run('mit Look');
const b = await run('Look gestoppt', { stopWasser: true });
const c = await run('mit Look, langsames Netz', { slowNet: true });
await browser.close();
