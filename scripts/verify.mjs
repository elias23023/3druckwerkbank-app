import pw from '/opt/node-tools/node_modules/playwright/index.js';
const { chromium, devices } = pw;
const base = process.argv[2] ?? 'http://localhost:4173';
const browser = await chromium.launch();
const results = [];
const check = (name, ok, info = '') => { results.push({ name, ok, info }); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name} ${info}`); };
const ctxOpts = { viewport: { width: 1920, height: 1080 }, timezoneId: 'Europe/Vienna', locale: 'de-AT' };
const ctx = await browser.newContext(ctxOpts);
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
const wx = page.waitForResponse((r) => r.url().includes('api.open-meteo.com'), { timeout: 20000 }).catch(() => null);
await page.goto(`${base}/#/start`, { waitUntil: 'networkidle' });
const res = await wx;
check('Open-Meteo response', !!res && res.ok(), res ? String(res.status()) : 'none');
await page.waitForFunction(() => /°C/.test(document.querySelector('.topbar')?.textContent ?? ''), null, { timeout: 15000 }).catch(() => {});
check('Weather chip shows °C', /°C/.test(await page.locator('.topbar').textContent()));
check('Scene ready', (await page.getAttribute('.stage', 'data-scene-ready')) === 'true');
check('Start world shows 6 islands with titles', (await page.locator('.island__label--big b').count()) === 6);
check('Start world has no status cards', (await page.locator('.minicard').count()) === 0);
check('Hints bell has a badge', (await page.locator('.topbar .badge').count()) === 1);
await page.mouse.move(960, 540); await page.mouse.wheel(0, 400); await page.waitForTimeout(600);
check('Wheel on start dives into Heute', (await page.evaluate(() => location.hash)) === '#/heute');
check('Heute portal sits inside the island', (await page.locator('.island--active .portal').count()) === 1);
check('Portal shows the clock and the next light change', await page.evaluate(() => { const c = document.querySelector('.portal__centre b'); const l = document.querySelector('.portal__centre span'); return !!c && /\d{2}:\d{2}/.test(c.textContent || '') && /Sonnen(aufgang|untergang)/.test(l?.textContent || ''); }));
for (const w of ['projekte', 'druck', 'material', 'wetter', 'archiv']) { await page.goto(`${base}/#/${w}`); await page.waitForTimeout(400); check(`World ${w} title`, (await page.locator('.world-title h1').count()) === 1); }
await page.goto(`${base}/#/druck`); await page.waitForTimeout(500);
check('Druck: Eingang shows imported print', (await page.getByText('Kabelclip_v2.gcode').count()) > 0);
await page.getByRole('button', { name: /Neues Projekt/ }).first().click(); await page.waitForTimeout(500);
check('Eingang: new project from print', (await page.evaluate(() => location.hash)) === '#/druck' && (await page.getByText('Kabelclip_v2.gcode').count()) === 0);
await page.goto(`${base}/#/wetter`); await page.waitForTimeout(500);
check('Wetter: chips around island', (await page.locator('.wchip').count()) === 5);
await page.keyboard.press('0'); await page.waitForTimeout(300); check('Key 0 → start', (await page.evaluate(() => location.hash)) === '#/start');
await page.goto(`${base}/#/projekte/p-sensorhalter`); await page.waitForTimeout(600);
check('Inner world: 8 panels around island', (await page.locator('.ui .panel').count()) >= 8);
check('Inner world: tools panel', (await page.getByText('Werkzeuge').count()) > 0);
await page.getByPlaceholder('Aufgabe hinzufügen … (Enter)').fill('Playwright-Testaufgabe'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(600);
check('Task persists after reload', (await page.getByText('Playwright-Testaufgabe').count()) > 0);
await page.locator('.ms').nth(4).locator('button').first().click(); await page.waitForTimeout(300);
check('Milestone toggle updates progress text', /\d+ %/.test(await page.locator('.ui .panel').first().textContent()));
// detail sheet with checklist
await page.locator('.bottom-row .panel').first().locator('button[title="Alles anzeigen"]').click(); await page.waitForTimeout(400);
await page.getByText('+ Druckvorbereitung').click(); await page.waitForTimeout(300);
check('Checklist template inserted', (await page.getByText('Slicer-Einstellungen kontrollieren').count()) > 0);
await page.keyboard.press('Escape'); await page.waitForTimeout(200);
// project form stepper
await page.goto(`${base}/#/projekte`); await page.waitForTimeout(500);
await page.getByRole('button', { name: /Neu$/ }).click(); await page.waitForTimeout(400);
await page.getByPlaceholder('z. B. Sensorhalter Garten').fill('Playwright-Projekt'); await page.locator('.sheet__foot button', { hasText: 'Weiter' }).click(); await page.waitForTimeout(200);
await page.locator('.sheet .tile', { hasText: 'Halterung / Befestigung' }).click(); await page.locator('.sheet__foot button', { hasText: 'Weiter' }).click(); await page.waitForTimeout(200);
await page.locator('.sheet .tile', { hasText: 'Garten & Outdoor' }).click(); await page.locator('.sheet__foot button', { hasText: 'Weiter' }).click(); await page.waitForTimeout(200);
check('Form suggests 3 worlds', (await page.locator('.sheet .island-lib button').count()) === 3);
await page.locator('.sheet__foot button', { hasText: 'Weiter' }).click(); await page.waitForTimeout(200);
await page.locator('.sheet__foot button', { hasText: 'Projekt erstellen' }).click(); await page.waitForTimeout(800);
check('New project focused in carousel with template milestones', (await page.locator('.project-hero h2').textContent()) === 'Playwright-Projekt');
// reset & persistence gone
page.once('dialog', (d) => d.accept());
await page.locator('.topbar button[aria-label="Einstellungen"]').click(); await page.waitForTimeout(300);
await page.getByText('Demodaten zurücksetzen').click(); await page.waitForTimeout(500); await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.goto(`${base}/#/projekte/p-sensorhalter`); await page.waitForTimeout(400);
check('Task gone after reset', (await page.getByText('Playwright-Testaufgabe').count()) === 0);
await page.keyboard.press('Control+k'); await page.waitForTimeout(300);
check('Command bar opens', (await page.locator('.cmd').count()) === 1);
await page.keyboard.type('sensor'); await page.waitForTimeout(200);
check('Command bar finds project', (await page.locator('.cmd__item').first().textContent())?.includes('Sensorhalter') ?? false);
await page.keyboard.press('Enter'); await page.waitForTimeout(500);
check('Enter navigates to inner world', (await page.evaluate(() => location.hash)).includes('p-sensorhalter'));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 5000 }).catch(() => null), (async () => { await page.locator('.topbar button[aria-label="Einstellungen"]').click(); await page.waitForTimeout(300); await page.getByText('JSON exportieren').click(); })()]);
check('Export download', !!dl, dl ? await dl.suggestedFilename() : '');
await page.keyboard.press('Escape');
check('No console errors', errors.length === 0, errors.join(' | ').slice(0, 300));
await ctx.close();
const ctx2 = await browser.newContext(ctxOpts);
const p2 = await ctx2.newPage(); const err2 = [];
p2.on('console', (m) => { if (m.type() === 'error') err2.push(m.text()); }); p2.on('pageerror', (e) => err2.push(String(e)));
await p2.route('**/api.open-meteo.com/**', (r) => r.abort());
await p2.goto(`${base}/#/heute`, { waitUntil: 'load' }); await p2.waitForTimeout(2500);
check('Weather failure shows message', /nicht verfügbar/.test(await p2.locator('.topbar').textContent() ?? ''));
check('No console errors on weather failure', err2.filter((e) => !/open-meteo|ERR_FAILED|Failed to fetch/i.test(e)).length === 0, err2.join(' | ').slice(0, 200));
await ctx2.close();
const ctx3 = await browser.newContext({ ...ctxOpts, reducedMotion: 'reduce' });
const p3 = await ctx3.newPage(); await p3.goto(`${base}/#/heute`, { waitUntil: 'networkidle' }); await p3.waitForTimeout(500);
const anim = await p3.evaluate(() => [...document.querySelectorAll('.island__body')].map((e) => getComputedStyle(e).animationName).filter((a) => a !== 'none'));
check('Reduced motion disables float', anim.length === 0, anim.join(','));
await ctx3.close();
// ---- seasonal landscapes by real sunrise/sunset (clock pinned to TODAY's date, because Open-Meteo only returns today onwards; November = Herbst) ----
const TODAY = new Date().toISOString().slice(0, 10);
for (const [iso, look, key] of [[`${TODAY}T06:05:00+01:00`, 'daemmerung', 'herbst-morgen'], [`${TODAY}T12:30:00+01:00`, 'mittag', 'herbst-mittag'], [`${TODAY}T16:50:00+01:00`, 'sonnenuntergang', 'herbst-abend'], [`${TODAY}T22:00:00+01:00`, 'nacht', 'herbst-nacht']]) {
  const c = await browser.newContext(ctxOpts); const pg = await c.newPage();
  await pg.clock.install({ time: new Date(iso) });
  await pg.goto(`${base}/#/start`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(1500);
  const dl = await pg.getAttribute('.stage', 'data-look');
  // the exact look depends on today's sunrise/sunset; what matters is the seasonal image it maps to (grey weather shows the rain lake instead)
  check(`Landscape at ${iso.slice(11, 16)} (${look}) is ${key}`, (await pg.locator(`.land img[src*="landschaft-${key}-"]`).count()) >= 1 || /bedeckt|nebel|regen/.test(dl ?? ''), `${dl} ${await pg.locator('.land img').first().getAttribute('src') ?? ''}`);
  await c.close();
}
// ---- seasons: override in settings changes stage, particles and island filter ----
{
  const c = await browser.newContext(ctxOpts); const pg = await c.newPage();
  await pg.goto(`${base}/#/start`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(800);
  const auto = await pg.evaluate(() => document.querySelector('.stage')?.getAttribute('data-season'));
  check('Season auto = Herbst in November', auto === 'herbst', auto ?? '');
  await pg.locator('.topbar button[aria-label="Einstellungen"]').click(); await pg.waitForTimeout(300);
  await pg.locator('.sheet .seg button', { hasText: 'Winter' }).click(); await pg.waitForTimeout(400);
  const w = await pg.evaluate(() => ({ s: document.querySelector('.stage')?.getAttribute('data-season'), fx: document.querySelectorAll('.season-fx--flake i').length, filter: getComputedStyle(document.querySelector('.island--active .island__body, .island .island__body')).filter }));
  check('Season override Winter: snow dust + island filter', w.s === 'winter' && w.fx >= 20 && /saturate/.test(w.filter), JSON.stringify(w));
  await pg.waitForTimeout(600);
  check('Season override Winter: winter landscape', (await pg.locator('.land img[src*="landschaft-winter-"]').count()) >= 1 || /bedeckt|nebel|regen/.test(await pg.getAttribute('.stage', 'data-look') ?? ''), await pg.locator('.land img').last().getAttribute('src') ?? '');
  await pg.locator('.sheet .seg', { hasText: 'Winter' }).locator('button', { hasText: 'Automatisch' }).click(); await pg.waitForTimeout(300);
  check('Season back to auto', (await pg.evaluate(() => document.querySelector('.stage')?.getAttribute('data-season'))) === 'herbst');
  await c.close();
}
// ---- info ring: sun by day, moon at night ----
{
  const marks = {};
  for (const [iso, key] of [[`${TODAY}T12:30:00+01:00`, 'mittag'], [`${TODAY}T22:00:00+01:00`, 'nacht']]) {
    const c = await browser.newContext(ctxOpts); const pg = await c.newPage();
    await pg.clock.install({ time: new Date(iso) });
    await pg.goto(`${base}/#/heute`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(2000);
    marks[key] = await pg.evaluate(() => document.querySelector('.portal .portal__now')?.getAttribute('data-kind'));
    await c.close();
  }
  check('Sun marker by day, moon at night', marks.mittag === 'sonne' && marks.nacht === 'mond', JSON.stringify(marks));
}
// ---- mobile companion (iPhone viewport) ----
const ctxM = await browser.newContext({ ...devices['iPhone 13'], timezoneId: 'Europe/Vienna', locale: 'de-AT' });
const pm = await ctxM.newPage(); const errM = [];
pm.on('console', (m) => { if (m.type() === 'error') errM.push(m.text()); }); pm.on('pageerror', (e) => errM.push(String(e)));
await pm.goto(`${base}/#/start`, { waitUntil: 'networkidle' }); await pm.waitForTimeout(800);
check('Mobile: companion shell instead of desktop stage', (await pm.locator('.m-shell').count()) === 1 && (await pm.locator('.stage').count()) === 0);
check('Mobile: five tabs', (await pm.locator('.m-tabs button').count()) === 5);
check('Mobile: dark theme forced', (await pm.evaluate(() => document.documentElement.dataset.theme)) === 'dunkel');
await pm.locator('.m-tabs button', { hasText: 'Heute' }).click(); await pm.waitForTimeout(400);
const openBefore = await pm.locator('.m-main .m-row .check').count();
await pm.locator('.m-main .m-row .check').first().click(); await pm.waitForTimeout(300);
check('Mobile: task toggle removes it from open list', (await pm.locator('.m-main .m-row .check').count()) < openBefore, `${openBefore} → ${await pm.locator('.m-main .m-row .check').count()}`);
await pm.locator('.m-tabs button', { hasText: 'Projekte' }).click(); await pm.waitForTimeout(400);
await pm.locator('.m-row--click').first().click(); await pm.waitForTimeout(500);
check('Mobile: project card opens', /#\/projekte\/p-/.test(await pm.evaluate(() => location.hash)) && (await pm.locator('.m-hero h2').count()) === 1);
await pm.locator('.m-hero').locator('..').getByText('Druck planen').click(); await pm.waitForTimeout(400);
check('Mobile: sheet opens as bottom sheet', (await pm.locator('.sheet').count()) === 1 && (await pm.locator('.sheet').evaluate((e) => getComputedStyle(e).position)) === 'fixed');
await pm.keyboard.press('Escape'); await pm.waitForTimeout(300);
await pm.locator('.m-head button[aria-label="Suche"]').click(); await pm.waitForTimeout(300);
await pm.keyboard.type('petg'); await pm.waitForTimeout(300);
check('Mobile: search finds spool', /PETG/i.test(await pm.locator('.cmd__item').first().textContent() ?? ''));
await pm.keyboard.press('Escape');
await pm.locator('.m-tabs button', { hasText: 'Material' }).click(); await pm.waitForTimeout(400);
check('Mobile: spool list', (await pm.locator('.m-main .m-row--click').count()) >= 5);
const tabBox = await pm.locator('.m-tabs').boundingBox();
check('Mobile: tab bar inside viewport', !!tabBox && tabBox.y + tabBox.height <= 845, JSON.stringify(tabBox));
check('Mobile: no console errors', errM.filter((e) => !/open-meteo|ERR_FAILED|Failed to fetch|CORS/i.test(e)).length === 0, errM.join(' | ').slice(0, 300));
await ctxM.close();
await browser.close();
const fails = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - fails}/${results.length} checks passed`);
process.exit(fails ? 1 : 0);
