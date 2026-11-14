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
// on the start world the weather stands in the card of the day (.tk), the top bar shows its chip in the other worlds only
await page.waitForFunction(() => /°C/.test(document.querySelector('.tk')?.textContent ?? ''), null, { timeout: 15000 }).catch(() => {});
check('Weather chip shows °C', /°C/.test(await page.locator('.tk').textContent()));
check('Scene ready', (await page.getAttribute('.stage', 'data-scene-ready')) === 'true');
check('Start world shows 6 islands with titles', (await page.locator('.island__label--big b').count()) === 6);
check('Start world has no status cards', (await page.locator('.minicard').count()) === 0);
check('Hints bell has a badge', (await page.locator('.topbar .badge').count()) === 1);
await page.mouse.move(960, 540); await page.mouse.wheel(0, 400); await page.waitForTimeout(600);
check('Wheel on start dives into Heute', (await page.evaluate(() => location.hash)) === '#/heute');
check('Heute portal sits inside the island', (await page.locator('.island--active .portal').count()) === 1);
check('Portal shows the clock and the next light change', await page.evaluate(() => { const c = document.querySelector('.portal__centre b'); const l = document.querySelector('.portal__centre span'); return !!c && /\d{2}:\d{2}/.test(c.textContent || '') && /Sonnen(aufgang|untergang)/.test(l?.textContent || ''); }));
for (const w of ['projekte', 'druck', 'material', 'wetter', 'archiv']) { await page.goto(`${base}/#/${w}`); await page.waitForTimeout(400); check(`World ${w} title`, (await page.locator('.feld-kopf h1').count()) === 1); }
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
// ---- account sheet opens from the top bar (unconfigured install explains itself, configured one shows the login) ----
{
  const c = await browser.newContext(ctxOpts); const pg = await c.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.goto(`${base}/#/start`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
  await pg.locator('.topbar button[aria-label^="Konto"]').click(); await pg.waitForTimeout(300);
  const txt = await pg.locator('.sheet').textContent() ?? '';
  check('Account sheet opens with login or setup hint', /Konto/.test(txt) && (/Mit Google anmelden/.test(txt) || /noch nicht eingerichtet/.test(txt) || /Passwort vergessen/.test(txt)) && errs.length === 0, (txt.slice(0, 80) + ' ' + errs.join('|')).trim());
  await c.close();
}
// ---- workspaces: 'Meine Werkstatt' starts empty and every world renders without errors ----
{
  const c = await browser.newContext(ctxOpts); const pg = await c.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.addInitScript(() => { try { localStorage.setItem('3druckwerkbank:bereich', 'echt'); } catch {} });
  await pg.goto(`${base}/#/start`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(600);
  const chip = await pg.locator('.topbar .ws-chip').textContent() ?? '';
  for (const w of ['heute', 'projekte', 'druck', 'material', 'wetter', 'archiv']) { await pg.goto(`${base}/#/${w}`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(400); }
  const n = await pg.evaluate(() => JSON.parse(localStorage.getItem('3druckwerkbank:echt:v1') || '{}').state?.projects?.length);
  check('Real workspace: chip, empty start, all worlds render', /Meine Werkstatt/.test(chip) && n === 0 && errs.length === 0, `${chip} projects=${n} ${errs.join('|')}`);
  const demo = await pg.evaluate(() => JSON.parse(localStorage.getItem('3druckwerkbank:v1') || '{}').state?.projects?.length ?? -1);
  check('Demo workspace storage untouched by real workspace', demo === -1 || demo > 0, String(demo));
  await c.close();
}
// ---- own devices and tools: create, edit, delete in 'Meine Werkstatt' (starts without any device) ----
{
  const c = await browser.newContext(ctxOpts); const pg = await c.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  pg.on('dialog', (d) => d.accept());
  await pg.addInitScript(() => { try { localStorage.setItem('3druckwerkbank:bereich', 'echt'); } catch {} });
  const devs = () => pg.evaluate(() => JSON.parse(localStorage.getItem('3druckwerkbank:echt:v1') || '{}').state?.devices ?? []);
  await pg.goto(`${base}/#/druck`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
  check('Real workspace starts without devices', (await devs()).length === 0, String((await devs()).length));
  await pg.locator('.ui .panel button', { hasText: 'Drucker anlegen' }).first().click();
  await pg.locator('.sheet input[placeholder="z. B. X1C"]').fill('Mein Drucker');
  await pg.locator('.sheet input[placeholder="z. B. Bambu Lab X1 Carbon"]').fill('Prusa MK4');
  await pg.locator('.sheet__foot button', { hasText: 'Speichern' }).click(); await pg.waitForTimeout(400);
  let d = await devs();
  check('Create own printer', d.length === 1 && d[0].name === 'Mein Drucker' && d[0].kind === 'drucker' && await pg.locator('.panel-col .item', { hasText: 'Mein Drucker' }).count() === 1, JSON.stringify(d.map((x) => x.name)));
  const def = await pg.evaluate(() => JSON.parse(localStorage.getItem('3druckwerkbank:echt:v1')).state.settings.defaultPrinterId);
  check('First printer becomes the default printer', def === d[0].id, String(def));
  await pg.locator('.panel-col .item', { hasText: 'Mein Drucker' }).click(); await pg.waitForTimeout(250);
  await pg.locator('.sheet__foot button', { hasText: 'Bearbeiten' }).click(); await pg.waitForTimeout(250);
  await pg.locator('.sheet input[placeholder="z. B. X1C"]').fill('Werkstattdrucker');
  await pg.locator('.sheet__foot button', { hasText: 'Speichern' }).click(); await pg.waitForTimeout(300);
  d = await devs();
  check('Edit own printer', d.length === 1 && d[0].name === 'Werkstattdrucker' && d[0].model === 'Prusa MK4', JSON.stringify(d.map((x) => x.name)));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  // tool via settings
  await pg.locator('.topbar button[aria-label="Einstellungen"]').click(); await pg.waitForTimeout(250);
  await pg.locator('.sheet button', { hasText: 'Werkzeuge (' }).click(); await pg.waitForTimeout(250);
  await pg.locator('.sheet__foot button', { hasText: 'Werkzeug anlegen' }).click(); await pg.waitForTimeout(250);
  await pg.locator('.sheet input[placeholder="z. B. Seitenschneider"]').fill('Entgrater');
  await pg.locator('.sheet__foot button', { hasText: 'Speichern' }).click(); await pg.waitForTimeout(300);
  d = await devs();
  check('Create own tool', d.length === 2 && d.some((x) => x.kind === 'werkzeug' && x.name === 'Entgrater' && x.status === 'verfügbar') && await pg.locator('.sheet .item', { hasText: 'Entgrater' }).count() === 1, JSON.stringify(d.map((x) => `${x.kind}:${x.name}`)));
  await pg.locator('.sheet .item', { hasText: 'Entgrater' }).locator('button', { hasText: 'Bearbeiten' }).click(); await pg.waitForTimeout(250);
  await pg.locator('.sheet__foot button', { hasText: 'Löschen' }).click(); await pg.waitForTimeout(300);
  d = await devs();
  check('Delete own tool', d.length === 1 && d[0].kind === 'drucker', JSON.stringify(d.map((x) => x.name)));
  await pg.locator('.toast__undo').click(); await pg.waitForTimeout(300);
  d = await devs();
  check('Undo restores the deleted tool', d.length === 2 && d.some((x) => x.name === 'Entgrater') && await pg.locator('.sheet .item', { hasText: 'Entgrater' }).count() === 1, JSON.stringify(d.map((x) => x.name)));
  await pg.locator('.sheet .item', { hasText: 'Entgrater' }).locator('button', { hasText: 'Bearbeiten' }).click(); await pg.waitForTimeout(250);
  await pg.locator('.sheet__foot button', { hasText: 'Löschen' }).click(); await pg.waitForTimeout(300);
  await pg.locator('.sheet .tabs button', { hasText: 'Drucker' }).click(); await pg.waitForTimeout(200);
  await pg.locator('.sheet .item', { hasText: 'Werkstattdrucker' }).locator('button', { hasText: 'Bearbeiten' }).click(); await pg.waitForTimeout(250);
  await pg.locator('.sheet__foot button', { hasText: 'Löschen' }).click(); await pg.waitForTimeout(300);
  d = await devs();
  const def2 = await pg.evaluate(() => JSON.parse(localStorage.getItem('3druckwerkbank:echt:v1')).state.settings.defaultPrinterId ?? null);
  check('Delete own printer (default printer cleared)', d.length === 0 && def2 === null, `${d.length} ${def2}`);
  check('Device management without console errors', errs.length === 0, errs.join(' | '));
  // free choice of the weather location: search (stubbed), pick, forecast is requested for the new coordinates
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  await pg.route('**/geocoding-api.open-meteo.com/**', (r) => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ results: [{ name: 'Linz', admin1: 'Oberösterreich', country: 'Österreich', latitude: 48.30639, longitude: 14.28611, timezone: 'Europe/Vienna' }] }) }));
  const asked = []; pg.on('request', (r) => { if (r.url().includes('api.open-meteo.com/v1/forecast')) asked.push(r.url()); });
  await pg.locator('.topbar button[aria-label="Einstellungen"]').click(); await pg.waitForTimeout(250);
  await pg.locator('.sheet input[aria-label="Ort suchen"]').fill('Linz'); await pg.locator('.sheet button', { hasText: /^Suchen$/ }).click(); await pg.waitForTimeout(500);
  await pg.locator('.sheet .place-hit', { hasText: 'Linz' }).click(); await pg.waitForTimeout(1200);
  const loc = await pg.evaluate(() => JSON.parse(localStorage.getItem('3druckwerkbank:echt:v1')).state.settings.location);
  check('Weather location can be chosen freely', loc.name === 'Linz, Oberösterreich' && loc.lat === 48.3064 && asked.some((u) => u.includes('latitude=48.3064')), `${JSON.stringify(loc)} requests=${asked.length}`);
  await c.close();
}
// ---- demo workspace: tools can be created from a project and are assigned to it ----
{
  const c = await browser.newContext(ctxOpts); const pg = await c.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String(e)));
  await pg.goto(`${base}/#/projekte/p-zahnrad`, { waitUntil: 'networkidle' }); await pg.waitForTimeout(500);
  await pg.locator('.bottom-row .panel', { hasText: 'Werkzeuge' }).locator('button', { hasText: 'Werkzeug zuordnen' }).click(); await pg.waitForTimeout(250);
  await pg.locator('.sheet button', { hasText: 'Neues Werkzeug' }).click(); await pg.waitForTimeout(250);
  await pg.locator('.sheet input[placeholder="z. B. Seitenschneider"]').fill('Zahnradlehre');
  await pg.locator('.sheet__foot button', { hasText: 'Speichern' }).click(); await pg.waitForTimeout(300);
  const st = await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem('3druckwerkbank:v1')).state; const t = s.devices.find((x) => x.name === 'Zahnradlehre'); return { tool: !!t, assigned: !!t && (s.projects.find((p) => p.id === 'p-zahnrad').toolIds ?? []).includes(t.id) }; });
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(250);
  const shown = await pg.locator('.bottom-row .panel', { hasText: 'Werkzeuge' }).locator('text=Zahnradlehre').count();
  check('Tool created from a project is assigned and shown', st.tool && st.assigned && shown === 1 && errs.length === 0, `${JSON.stringify(st)} shown=${shown} ${errs.join('|')}`);
  // a finished estimate never books by itself: the print waits for the result
  await pg.evaluate(() => { const k = '3druckwerkbank:v1'; const j = JSON.parse(localStorage.getItem(k)); const p = j.state.prints.find((x) => x.status === 'läuft'); p.startedAt = new Date(Date.now() - (p.estimatedMinutes + 5) * 60000).toISOString(); localStorage.setItem(k, JSON.stringify(j)); });
  await pg.goto(`${base}/#/druck`, { waitUntil: 'networkidle' }); await pg.reload({ waitUntil: 'networkidle' }); await pg.waitForTimeout(1600);
  const pr = await pg.evaluate(() => { const s = JSON.parse(localStorage.getItem('3druckwerkbank:v1')).state; const p = s.prints.find((x) => x.id === 'pr-1'); return { status: p.status, due: !!p.resultDue, booked: !!p.booked, running: s.prints.filter((x) => x.status === 'läuft').length }; });
  check('Elapsed print waits for the result instead of booking itself', pr.status === 'läuft' && pr.due && !pr.booked && pr.running === 1, JSON.stringify(pr));
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
// mobile shopping list: add, tick, remove, undo
await pm.locator('.m-main input[aria-label="Auf die Einkaufsliste"]').fill('Testfilament Rot'); await pm.keyboard.press('Enter'); await pm.waitForTimeout(250);
const shopRow = pm.locator('.m-main .m-shop', { hasText: 'Testfilament Rot' });
const added = await shopRow.count();
await shopRow.locator('.check').click(); await pm.waitForTimeout(200);
const ticked = await pm.evaluate(() => JSON.parse(localStorage.getItem('3druckwerkbank:v1')).state.shopping.find((x) => x.title === 'Testfilament Rot')?.done);
await shopRow.locator('button[aria-label$="von der Liste entfernen"]').click(); await pm.waitForTimeout(250);
const removed = await pm.locator('.m-main .m-shop', { hasText: 'Testfilament Rot' }).count();
await pm.locator('.toast__undo').click(); await pm.waitForTimeout(250);
const back = await pm.locator('.m-main .m-shop', { hasText: 'Testfilament Rot' }).count();
check('Mobile: shopping list add, tick, remove, undo', added === 1 && ticked === true && removed === 0 && back === 1, `${added} ${ticked} ${removed} ${back}`);
await ctxM.close();
await browser.close();
const fails = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - fails}/${results.length} checks passed`);
process.exit(fails ? 1 : 0);
