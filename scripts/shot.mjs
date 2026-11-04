// usage: node scripts/shot.mjs <url> <out.png> [w] [h] [mobile]
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium, devices } = pw;
const [url, out, w = '1920', h = '1080', mobile] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext(mobile ? { ...devices['iPhone 13'], timezoneId: 'Europe/Vienna', locale: 'de-AT' } : { viewport: { width: +w, height: +h }, deviceScaleFactor: 1, timezoneId: 'Europe/Vienna', locale: 'de-AT' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-scene-ready="true"]', { timeout: 15000 }).catch(() => errors.push('scene not ready'));
await page.waitForTimeout(1200);
await page.screenshot({ path: out, fullPage: !!mobile });
console.log(JSON.stringify({ out, errors }));
await browser.close();
