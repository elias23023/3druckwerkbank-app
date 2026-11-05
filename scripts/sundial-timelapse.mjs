// Time-lapse of the sundial: pins the browser clock from 06:00 to 23:40 in 20-minute steps and captures a 2x close-up per frame.
// usage: node scripts/sundial-timelapse.mjs <baseUrl> <frameDir>   then: ffmpeg -framerate 12 -i <frameDir>/f-%03d.png ...
import pw from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium } = pw;
const [base, dir] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2, timezoneId: 'Europe/Vienna', locale: 'de-AT' });
const page = await ctx.newPage();
await page.clock.install({ time: new Date('2026-11-05T06:00:00+01:00') });
await page.goto(`${base}/#/heute`, { waitUntil: 'networkidle' }); await page.waitForTimeout(3000);
let i = 0;
for (let m = 6 * 60; m <= 23 * 60 + 40; m += 20) {
  await page.clock.setFixedTime(new Date(`2026-11-05T${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00+01:00`));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${dir}/f-${String(i++).padStart(3, '0')}.png`, clip: { x: 720, y: 380, width: 360, height: 260 } });
}
console.log('frames', i);
await browser.close();
