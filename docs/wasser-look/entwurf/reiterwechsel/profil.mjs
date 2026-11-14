// CPU profile of one tab change with the look: which functions make up the long task?
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const base = process.argv[2] || 'http://localhost:4176';
const browser = await pw.chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await page.goto(base + '/#/start', { waitUntil: 'load' });
await page.waitForSelector('.m-tabs button'); await page.waitForTimeout(2500);
// visit all tabs once so that images are cached
for (const n of ['Heute', 'Projekte', 'Material', 'Mehr', 'Start']) { await page.locator('.m-tabs button', { hasText: n }).click(); await page.waitForTimeout(900); }
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
for (const n of ['Mehr', 'Projekte']) {
  await cdp.send('Profiler.start');
  await page.locator('.m-tabs button', { hasText: n }).click();
  await page.waitForTimeout(450);
  const { profile } = await cdp.send('Profiler.stop');
  const byId = new Map(profile.nodes.map((x) => [x.id, x]));
  const parent = new Map(); for (const x of profile.nodes) for (const c of x.children || []) parent.set(c, x.id);
  const self = new Map(), total = new Map();
  const dt = profile.timeDeltas; 
  profile.samples.forEach((id, i) => {
    const d = (dt[i] || 0) / 1000; const nd = byId.get(id); const k = `${nd.callFrame.functionName || '(anon)'} ${nd.callFrame.url.split('/').pop()}:${nd.callFrame.lineNumber}:${nd.callFrame.columnNumber}`;
    self.set(k, (self.get(k) || 0) + d);
    const seen = new Set(); let cur = id;
    while (cur !== undefined) { const c = byId.get(cur); const kk = `${c.callFrame.functionName || '(anon)'} ${c.callFrame.url.split('/').pop()}:${c.callFrame.lineNumber}:${c.callFrame.columnNumber}`; if (!seen.has(kk)) { seen.add(kk); total.set(kk, (total.get(kk) || 0) + d); } cur = parent.get(cur); }
  });
  const top = (m, n) => [...m.entries()].filter(([k]) => !/^\((idle|program|root)\)/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, n);
  console.log(`\n== ${n}: Eigenzeit (ms) ==`); for (const [k, v] of top(self, 14)) console.log(v.toFixed(1).padStart(7), k);
  console.log(`== ${n}: Gesamtzeit (ms) ==`); for (const [k, v] of top(total, 22)) console.log(v.toFixed(1).padStart(7), k);
  await page.waitForTimeout(600);
}
await browser.close();
