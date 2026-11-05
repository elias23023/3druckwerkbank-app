// usage: node scripts/shot-season.mjs <baseUrl> <outDir> — Start and Wetter world in all four seasons (settings override via UI)
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium } = pw;
const [base, out] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, timezoneId: 'Europe/Vienna', locale: 'de-AT' });
const page = await ctx.newPage();
await page.clock.install({ time: new Date('2026-11-05T13:30:00+01:00') });
await page.goto(`${base}/#/start`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
for (const s of ['Frühling', 'Sommer', 'Herbst', 'Winter']) {
  await page.locator('.topbar button[aria-label="Einstellungen"]').click(); await page.waitForTimeout(300);
  await page.locator('.sheet .seg button', { hasText: s }).click(); await page.waitForTimeout(200);
  await page.keyboard.press('Escape'); await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/season-${s.toLowerCase().replace('ü', 'ue')}.png` });
}
await page.goto(`${base}/#/wetter`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/season-wetter.png` });
await browser.close();
