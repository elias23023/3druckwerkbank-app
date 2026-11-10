import { createRequire } from 'module'; const require = createRequire(import.meta.url);
const { chromium } = require('/opt/node-tools/node_modules/playwright/index.js');
const pw = process.env.WBPW; const base = 'https://antiquewhite-falcon-428175.hostingersite.com';
const out = []; const ok = (n, c, i = '') => { out.push(c); console.log(`${c ? 'OK  ' : 'FAIL'} ${n} ${c ? '' : i}`); };
const b = await chromium.launch();
const mk = async () => { const c = await b.newContext({ viewport: { width: 1920, height: 1080 }, timezoneId: 'Europe/Vienna', locale: 'de-AT' }); const p = await c.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('dialog', (d) => d.accept()); await p.addInitScript(() => { try { localStorage.setItem('3druckwerkbank:bereich', 'echt'); } catch {} }); return { c, p, errs }; };
const api = (p, path, json) => p.evaluate(async ([path, json]) => { const r = await fetch('/api' + path, json === null ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(json) }); return { s: r.status, j: await r.json().catch(() => null) }; }, [path, json ?? null]);
const names = (p, coll = 'devices') => p.evaluate((coll) => (JSON.parse(localStorage.getItem('3druckwerkbank:echt:v1') || '{}').state?.[coll] ?? []).map((d) => d.name ?? d.title), coll);
const waitFor = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await new Promise((r) => setTimeout(r, 300)); } return false; };
const closeSheet = async (p) => { for (let i = 0; i < 3 && await p.locator('.sheet').count(); i++) { await p.locator('.sheet__head button[aria-label="Schließen"]').click(); await p.waitForTimeout(250); } };
const addDevice = async (p, name, kind = 'werkzeug') => { await closeSheet(p); await p.evaluate(() => { location.hash = '#/druck'; }); await p.waitForTimeout(500); await p.locator('.panel-col button', { hasText: 'verwalten' }).first().click(); await p.waitForTimeout(300);
  if (await p.locator('.sheet .tabs button', { hasText: 'Werkzeuge' }).count()) { await p.locator('.sheet .tabs button', { hasText: kind === 'werkzeug' ? 'Werkzeuge' : 'Drucker' }).click(); await p.locator('.sheet__foot button', { hasText: kind === 'werkzeug' ? 'Werkzeug anlegen' : 'Drucker' }).click(); await p.waitForTimeout(300); }
  await p.locator('.sheet input.input').first().fill(name); await p.locator('.sheet__foot button', { hasText: 'Speichern' }).click(); await p.waitForTimeout(400); await closeSheet(p); };
// wait for the test variant (direct registration)
const tag = Date.now().toString(36); const mailB = `wb-e-${tag}@example.com`;
const A = await mk(), B = await mk();
await B.p.goto(`${base}/#/start`, { waitUntil: 'networkidle' });
let reg; for (let i = 0; i < 3; i++) { reg = await api(B.p, '/auth/register', { email: mailB, password: pw }); if (reg.j?.user || reg.s !== 429) break; await new Promise((r) => setTimeout(r, 120000)); }
ok('test variant live, B registered', !!reg.j?.user, JSON.stringify(reg.j));
await B.p.reload({ waitUntil: 'networkidle' }); await B.p.waitForTimeout(2500);
// A signs in through the panel
await A.p.goto(`${base}/#/druck`, { waitUntil: 'networkidle' }); await A.p.waitForTimeout(600);
await A.p.locator('.topbar button[aria-label^="Konto"]').click(); await A.p.waitForTimeout(500);
await A.p.locator('.sheet input[type="email"]').first().fill('werkbank-test2@example.com'); await A.p.locator('.sheet input[type="password"]').fill(pw); await A.p.locator('.sheet button[type="submit"]').click();
ok('A sees the workshop section', await waitFor(async () => (await A.p.locator('.sheet select[aria-label="Werkstatt wählen"]').count()) === 1), '');
const wname = 'Team ' + tag;
await A.p.locator('.sheet input[aria-label="Name der neuen Werkstatt"]').fill(wname); await A.p.locator('.sheet button', { hasText: /^Anlegen$/ }).click();
ok('A creates and enters a shared workshop', await waitFor(async () => /Team/.test(await A.p.locator('.sheet select[aria-label="Werkstatt wählen"] option:checked').textContent() ?? '')), '');
ok('A shows the live connection', await waitFor(async () => (await A.p.locator('.sheet .pill', { hasText: /^live$/ }).count()) === 1), '');
const list = await api(A.p, '/workshops'); const W = list.j.workshops.find((w) => w.name === wname)?.id;
await addDevice(A.p, 'Team-Drucker', 'drucker');
ok('A adds a printer, stored per entry on the server', await waitFor(async () => { const r = await api(A.p, `/workshops/${W}/items?since=0`); return r.j?.items?.some((i) => i.coll === 'devices' && i.value?.name === 'Team-Drucker'); }), '');
const inv = await api(A.p, `/workshops/${W}/invites`, { email: mailB, role: 'editor' }); ok('A invites B', inv.s === 200 && !!inv.j?.testToken, JSON.stringify(inv.j));
// B opens the link from the "mail"
await B.p.goto(`${base}/#/einladung/${inv.j.testToken}`, { waitUntil: 'networkidle' });
ok('B accepts through the link and sees the shared printer', await waitFor(async () => (await names(B.p)).includes('Team-Drucker'), 12000), JSON.stringify(await names(B.p)));
ok('A sees B as a member without reloading', await (async () => { await A.p.locator('.topbar button[aria-label^="Konto"]').click(); return waitFor(async () => (await A.p.locator('.sheet .field', { hasText: 'Mitglieder (2)' }).count()) === 1); })(), '');
await closeSheet(A.p);
// live both ways
await addDevice(B.p, 'Zange von B');
ok('B\'s change appears live at A', await waitFor(async () => (await names(A.p)).includes('Zange von B')), JSON.stringify(await names(A.p)));
ok('A\'s screen shows it without reload', await (async () => { await A.p.evaluate(() => { location.hash = '#/druck'; }); await A.p.locator('.panel-col button', { hasText: 'verwalten' }).first().click(); await A.p.locator('.sheet .tabs button', { hasText: 'Werkzeuge' }).click(); const n = await A.p.locator('.sheet .item', { hasText: 'Zange von B' }).count(); await closeSheet(A.p); return n === 1; })(), '');
await addDevice(A.p, 'Feile von A');
ok('A\'s change appears live at B', await waitFor(async () => (await names(B.p)).includes('Feile von A')), JSON.stringify(await names(B.p)));
// same moment, different entries: nothing is lost
await Promise.all([addDevice(A.p, 'Gleichzeitig A'), addDevice(B.p, 'Gleichzeitig B')]);
ok('simultaneous changes to different entries both survive', await waitFor(async () => { const a = await names(A.p), bb = await names(B.p); return ['Gleichzeitig A', 'Gleichzeitig B'].every((n) => a.includes(n) && bb.includes(n)); }, 10000), JSON.stringify([await names(A.p), await names(B.p)]));
// reader
const idB = reg.j.user.id; await api(A.p, `/workshops/${W}/members/${idB}`, { role: 'reader' });
await B.p.waitForTimeout(1500); await addDevice(B.p, 'Darf nicht');
ok('reader\'s change is refused and reverted', await waitFor(async () => !(await names(B.p)).includes('Darf nicht'), 10000) && !(await names(A.p)).includes('Darf nicht'), JSON.stringify(await names(B.p)));
// B back to the personal workshop: own (empty) data, shared data gone from the screen
await closeSheet(B.p); await B.p.locator('.topbar button[aria-label^="Konto"]').click(); await B.p.waitForTimeout(500);
const personalB = await B.p.locator('.sheet select[aria-label="Werkstatt wählen"] option', { hasText: 'persönlich' }).getAttribute('value');
await B.p.locator('.sheet select[aria-label="Werkstatt wählen"]').selectOption(personalB);
ok('B switches to the personal workshop', await waitFor(async () => !(await names(B.p)).includes('Team-Drucker')), JSON.stringify(await names(B.p)));
// A reloads: state comes back from the server, nothing duplicated
await A.p.reload({ waitUntil: 'networkidle' }); await A.p.waitForTimeout(3000);
const after = await names(A.p); ok('after reload A has every entry exactly once', ['Team-Drucker', 'Zange von B', 'Feile von A', 'Gleichzeitig A', 'Gleichzeitig B'].every((n) => after.filter((x) => x === n).length === 1), JSON.stringify(after));
// offline: A changes something without connection, it is sent after reconnecting
await A.c.setOffline(true); await addDevice(A.p, 'Offline von A'); await A.p.waitForTimeout(1500); await A.c.setOffline(false);
await api(A.p, `/workshops/${W}/members/${idB}`, { role: 'editor' });
ok('a change made offline reaches the server after reconnecting', await waitFor(async () => { const r = await api(A.p, `/workshops/${W}/items?since=0`).catch(() => null); return r?.j?.items?.some((i) => i.value?.name === 'Offline von A'); }, 40000), '');
// personal workshop of A gets content; a fresh browser with own local data must be asked which state counts
await closeSheet(A.p); await A.p.locator('.topbar button[aria-label^="Konto"]').click(); await A.p.waitForTimeout(500);
const personalA = await A.p.locator('.sheet select[aria-label="Werkstatt wählen"] option', { hasText: 'persönlich' }).getAttribute('value');
await A.p.locator('.sheet select[aria-label="Werkstatt wählen"]').selectOption(personalA); await A.p.waitForTimeout(2500);
ok('A back in the personal workshop without the shared entries', !(await names(A.p)).includes('Team-Drucker'), JSON.stringify(await names(A.p)));
if (!(await names(A.p)).includes('Privat A')) await addDevice(A.p, 'Privat A'); await A.p.waitForTimeout(2500);
const D = await mk(); await D.p.goto(`${base}/#/druck`, { waitUntil: 'networkidle' }); await D.p.waitForTimeout(600);
await D.p.locator('.ui .panel button', { hasText: 'Drucker anlegen' }).first().click(); await D.p.locator('.sheet input.input').first().fill('Lokal D'); await D.p.locator('.sheet__foot button', { hasText: 'Speichern' }).click(); await D.p.waitForTimeout(400); await closeSheet(D.p);
await D.p.locator('.topbar button[aria-label^="Konto"]').click(); await D.p.waitForTimeout(500);
await D.p.locator('.sheet input[type="email"]').first().fill('werkbank-test2@example.com'); await D.p.locator('.sheet input[type="password"]').fill(pw); await D.p.locator('.sheet button[type="submit"]').click();
ok('first sign-in with data on both sides asks instead of overwriting', await waitFor(async () => (await D.p.locator('.sheet button', { hasText: 'Stand aus dem Konto übernehmen' }).count()) === 1) && (await names(D.p)).includes('Lokal D'), JSON.stringify(await names(D.p)));
await D.p.locator('.sheet button', { hasText: 'Stand aus dem Konto übernehmen' }).click(); await D.p.waitForTimeout(2000);
const bak = await D.p.evaluate(() => { const x = JSON.parse(localStorage.getItem('3druckwerkbank:echt:sicherung') || 'null'); return x ? x.state.devices.map((d) => d.name) : null; });
ok('taking the account state keeps a backup of the browser state', (await names(D.p)).includes('Privat A') && !(await names(D.p)).includes('Lokal D') && !!bak?.includes('Lokal D'), JSON.stringify([await names(D.p), bak]));
A.errs.push(...D.errs);
// cleanup
await api(A.p, `/workshops/${W}/delete`, {});
ok('no page errors', A.errs.length + B.errs.length === 0, [...A.errs, ...B.errs].join(' | ').slice(0, 300));
console.log(`${out.filter(Boolean).length}/${out.length} passed`); await b.close();
