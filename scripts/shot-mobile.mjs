// usage: node scripts/shot-mobile.mjs <baseUrl> <outDir>  — iPhone screenshots of the mobile companion
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium, devices } = pw;
const [base, outDir] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], timezoneId: 'Europe/Vienna', locale: 'de-AT' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
const shots = [['#/start', 'm1-start'], ['#/heute', 'm2-heute'], ['#/projekte', 'm3-projekte'], ['#/projekte/p-sensorhalter', 'm4-projekt'], ['#/material', 'm5-material'], ['#/druck', 'm6-mehr']];
for (const [hash, name] of shots) {
  await page.goto(base + hash, { waitUntil: 'networkidle' });
  await page.waitForSelector('.m-tabs', { timeout: 15000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${outDir}/${name}.png` });
}
console.log(JSON.stringify({ errors }));
await browser.close();
