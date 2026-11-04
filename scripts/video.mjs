// Records a scripted desktop walkthrough of the live site as WebM (Playwright), then ffmpeg converts it.
// usage: node scripts/video.mjs <baseUrl> <outDir>
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import { mkdir } from 'node:fs/promises';
const { chromium } = pw;
const [base = 'https://snow-salmon-793472.hostingersite.com', outDir = 'video-raw'] = process.argv.slice(2);
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, recordVideo: { dir: outDir, size: { width: 1920, height: 1080 } }, locale: 'de-AT', timezoneId: 'Europe/Vienna' });
const page = await ctx.newPage();
const wait = (ms) => page.waitForTimeout(ms);
// smooth mouse glide for the parallax
const glide = async (x1, y1, x2, y2, ms = 1500) => { const steps = Math.max(10, Math.round(ms / 25)); for (let i = 1; i <= steps; i++) { await page.mouse.move(x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps); await wait(ms / steps); } };
const dock = async (label) => { await page.locator('.dock button', { hasText: label }).click(); await wait(2800); };

await page.goto(`${base}/#/heute`, { waitUntil: 'networkidle' });
await page.waitForSelector('[data-scene-ready="true"]', { timeout: 20000 }).catch(() => {});
await page.mouse.move(960, 540);
await wait(4000);
await glide(960, 540, 300, 300, 2200); await glide(300, 300, 1600, 800, 2600); await glide(1600, 800, 960, 520, 1800);
await wait(800);
// tick a task
const firstCheck = page.locator('.panel', { hasText: 'Heute dran' }).locator('.check').first();
await firstCheck.hover(); await wait(500); await firstCheck.click(); await wait(1800);

// Projekte
await dock('Projekte');
await glide(960, 540, 1200, 450, 1200);
await page.locator('.carousel-nav').last().click(); await wait(1600);
await page.locator('.carousel-nav').last().click(); await wait(1600);
await page.locator('.carousel-nav').first().click(); await wait(1600);
await page.locator('.carousel-nav').first().click(); await wait(1600);
await page.getByRole('button', { name: /Projekt öffnen/ }).click(); await wait(3200);
await glide(1200, 450, 500, 600, 1800);
const cluster = page.locator('.inner-cluster');
await cluster.hover(); await page.mouse.wheel(0, 500); await wait(1400); await page.mouse.wheel(0, 500); await wait(1400); await page.mouse.wheel(0, -1000); await wait(1000);
const ms = page.locator('.ms').nth(4).locator('button').first();
await ms.hover(); await wait(400); await ms.click(); await wait(1800);
await page.locator('.back').click(); await wait(2600);

// 3D-Druck, Material, Wetter, Archiv
await dock('3D-Druck'); await glide(960, 540, 1400, 400, 1800); await glide(1400, 400, 700, 700, 1800);
await dock('Material');
await page.locator('.spool-grid .item').first().click(); await wait(2600);
await page.keyboard.press('Escape'); await wait(900);
await dock('Wetter'); await glide(960, 540, 400, 700, 1600); await glide(400, 700, 1500, 500, 1800);
await dock('Archiv');
await page.locator('.gcard').first().click(); await wait(2600);
await page.keyboard.press('Escape'); await wait(900);

// Command bar
await page.keyboard.press('Control+k'); await wait(900);
await page.keyboard.type('sensor', { delay: 140 }); await wait(1200);
await page.keyboard.press('Enter'); await wait(3000);

// light theme
await page.locator('.topbar button[aria-label="Einstellungen"]').click(); await wait(1200);
await page.getByRole('button', { name: 'Hell' }).click(); await wait(2600);
await page.getByRole('button', { name: /Automatisch/ }).click(); await wait(1200);
await page.keyboard.press('Escape'); await wait(800);

// finish on Heute
await dock('Heute'); await glide(960, 540, 1300, 400, 2000); await glide(1300, 400, 960, 540, 1500);
await wait(2500);

const video = page.video();
await ctx.close();
const path = await video.path();
await browser.close();
console.log(JSON.stringify({ path }));
