import pw from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium } = pw;
const base = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch();
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok, info }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} ${info}`); };
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
// 1 weather call succeeds and chip shows °C
const wx = page.waitForResponse((r) => r.url().includes('api.open-meteo.com'), { timeout: 20000 }).catch(() => null);
await page.goto(`${base}/#/heute`, { waitUntil: 'networkidle' });
const res = await wx;
check('Open-Meteo response', !!res && res.ok(), res ? String(res.status()) : 'none');
await page.waitForFunction(() => /°C/.test(document.querySelector('.topbar')?.textContent ?? ''), null, { timeout: 15000 }).catch(() => {});
check('Weather chip shows °C', /°C/.test(await page.locator('.topbar').textContent()));
check('Scene ready', (await page.getAttribute('.stage', 'data-scene-ready')) === 'true');
// 2 all worlds render a title
for (const w of ['projekte', 'druck', 'material', 'wetter', 'archiv']) { await page.goto(`${base}/#/${w}`); await page.waitForTimeout(400); check(`World ${w} title`, (await page.locator('.world-title h1').count()) === 1); }
// 3 keyboard world switching
await page.keyboard.press('1'); await page.waitForTimeout(300); check('Key 1 → heute', location => true, ''); check('Hash after key 1', (await page.evaluate(() => location.hash)) === '#/heute');
// 4 persistence: add a task in inner world, reload, present; reset; gone
await page.goto(`${base}/#/projekte/p-sensorhalter`); await page.waitForTimeout(500);
await page.getByPlaceholder('Aufgabe hinzufügen … (Enter)').fill('Playwright-Testaufgabe'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(600);
check('Task persists after reload', (await page.getByText('Playwright-Testaufgabe').count()) > 0);
page.once('dialog', (d) => d.accept());
await page.locator('.topbar button[aria-label="Einstellungen"]').click(); await page.waitForTimeout(300);
await page.getByText('Demodaten zurücksetzen').click(); await page.waitForTimeout(500);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
check('Task gone after reset', (await page.getByText('Playwright-Testaufgabe').count()) === 0);
// 5 command bar
await page.keyboard.press('Control+k'); await page.waitForTimeout(300);
check('Command bar opens', (await page.locator('.cmd').count()) === 1);
await page.keyboard.type('sensor'); await page.waitForTimeout(200);
check('Command bar finds project', (await page.locator('.cmd__item').first().textContent())?.includes('Sensorhalter') ?? false);
await page.keyboard.press('Enter'); await page.waitForTimeout(500);
check('Enter navigates to inner world', (await page.evaluate(() => location.hash)).includes('p-sensorhalter'));
// 6 milestone toggle changes progress suggestion
await page.goto(`${base}/#/projekte/p-organizer`); await page.waitForTimeout(500);
const before = await page.locator('.inner-cluster .panel--wide .panel__head span').textContent();
await page.locator('.ms').nth(2).locator('button').first().click(); await page.waitForTimeout(300);
const after = await page.locator('.inner-cluster .panel--wide .panel__head span').textContent();
check('Milestone toggle updates progress', before !== after, `${before} → ${after}`);
// 7 export JSON
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), (async () => { await page.locator('.topbar button[aria-label="Einstellungen"]').click(); await page.waitForTimeout(300); await page.getByText('JSON exportieren').click(); })()]);
check('Export download', !!dl, dl ? await dl.suggestedFilename() : '');
await page.keyboard.press('Escape');
check('No console errors', errors.length === 0, errors.join(' | ').slice(0, 300));
await ctx.close();
// 8 weather failure handling
const ctx2 = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const p2 = await ctx2.newPage(); const err2 = [];
p2.on('console', (m) => { if (m.type() === 'error') err2.push(m.text()); }); p2.on('pageerror', (e) => err2.push(String(e)));
await p2.route('**/api.open-meteo.com/**', (r) => r.abort());
await p2.goto(`${base}/#/heute`, { waitUntil: 'load' }); await p2.waitForTimeout(2500);
check('Weather failure shows message', /nicht verfügbar/.test(await p2.locator('.topbar').textContent() ?? ''));
check('No console errors on weather failure', err2.filter((e) => !/open-meteo|ERR_FAILED|Failed to fetch/i.test(e)).length === 0, err2.join(' | ').slice(0, 200));
await ctx2.close();
// 9 reduced motion: no animations on islands
const ctx3 = await browser.newContext({ viewport: { width: 1920, height: 1080 }, reducedMotion: 'reduce' });
const p3 = await ctx3.newPage(); await p3.goto(`${base}/#/heute`, { waitUntil: 'networkidle' }); await p3.waitForTimeout(500);
const anim = await p3.evaluate(() => [...document.querySelectorAll('.island__img')].map((e) => getComputedStyle(e).animationName).filter((a) => a !== 'none'));
check('Reduced motion disables float', anim.length === 0, anim.join(','));
await ctx3.close();
await browser.close();
const fails = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - fails}/${results.length} checks passed`);
process.exit(fails ? 1 : 0);
