// Probe for the tests of weich(id, gone) in src/ui/gehen.ts (finding of 22.11.): the map of tests must not grow with every thing
// ever shown, and a list without a test must not use the test another list gave the same id.
//
//   node docs/wasser-look/entwurf/gehen/sonde.mjs        (builds its page, sonde/, into a scratch folder; needs no preview)
//
// PASS/FAIL per check, exit code 1 when one fails.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
import { pw, serve, abs } from '../../../../scripts/wasser/lib.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), out = fs.mkdtempSync(path.join(os.tmpdir(), 'gehen-sonde-'));
execFileSync(process.execPath, [abs('node_modules/vite/bin/vite.js'), 'build', path.join(here, 'sonde'), '--logLevel', 'error', '--base', './', '--outDir', out, '--emptyOutDir'], { cwd: abs('.'), stdio: ['ignore', 'inherit', 'inherit'] });
const s = await serve(out, { app: true }); const b = await pw.chromium.launch(); const p = await b.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
let bad = 0; const ok = (name, cond, info = '') => { if (!cond) bad++; console.log(cond ? 'PASS' : 'FAIL', name, typeof info === 'string' ? info : JSON.stringify(info)); };
await p.goto(s.url, { waitUntil: 'networkidle' }); await p.waitForSelector('#teil .zeile');
const stand = () => p.evaluate(() => window.stand());
// what an action leaves one picture later: the leaving pictures per list (ids)
const tu = (fn, id) => p.evaluate(([fn, id]) => new Promise((done) => { window[fn](id); requestAnimationFrame(() => done({ teil: [...document.querySelectorAll('#teil .wa-geht')].map((x) => x.getAttribute('data-gehen')).join(' '), alle: [...document.querySelectorAll('#alle .wa-geht')].map((x) => x.getAttribute('data-gehen')).join(' ') })); }), [fn, id]);
const ruhe = () => p.waitForFunction(() => !document.querySelector('.wa-geht'), null, { timeout: 3000 }).catch(() => {});
const s0 = await stand(); ok('at the start: a test for each of the five rows that have one, 60 ids in the document', s0.tests === 5 && s0.live === 60, s0);
// a row pushed out of the list that shows a part: no picture there
const a = await tu('vor', 'neu'); await ruhe();
ok('pushed out of the part list (its thing is still there): no leaving picture', a.teil === '' && a.alle === '', a);
// the same thing deleted: it stands only in the full list, which has NO test - it must leave softly there (and not ask the test "d5" once had)
const s1 = await stand(); const c = await tu('weg', 'd5'); await ruhe();
ok('the pushed-out thing still has a row (in the full list): its test is kept while a row of its id stands', s1.tests === 6 && s1.live === 61, s1);
ok('deleted from the full list (no test there): a leaving picture', c.alle === 'd5' && c.teil === '', c);
// a row taken out of the list WITHOUT a test while the other list's test for the same id says "not gone": it leaves softly all
// the same (before 22.11. it asked that test and went hard)
const d = await tu('verstecke', 'd2'); await ruhe();
ok('a list without a test does not use the test another list gave the same id', d.alle === 'd2' && d.teil === '' && await p.locator('#teil [data-gehen="d2"]').count() === 1, d);
// deleted from the part list: a picture in both lists
const e = await tu('weg', 'd1'); await ruhe();
ok('deleted (its thing is gone): a leaving picture in both lists', e.teil === 'd1' && e.alle === 'd1', e);
// fifty things deleted one after the other: the map does not grow
const before = await stand();
for (let i = 0; i < 50; i++) { const id = await p.evaluate(() => document.querySelector('#teil [data-gehen]:not(.wa-geht)').getAttribute('data-gehen')); await p.evaluate((id) => window.weg(id), id); await p.waitForTimeout(20); }
await ruhe(); await p.waitForTimeout(100); const after = await stand(); const rows = await p.evaluate(() => [document.querySelectorAll('#teil .zeile').length, document.querySelectorAll('#alle .zeile').length]);
ok('fifty rows deleted: the tests are those of the rows that still stand, nothing else is held', after.tests === rows[0] && after.live === rows[1] && after.ghosts === 0 && before.tests === 5, { before, after, rows });
ok('no error on the page', !errors.length, errors.slice(0, 3));
await b.close(); await s.close(); fs.rmSync(out, { recursive: true, force: true });
console.log(bad ? `\n${bad} check(s) FAILED` : '\nall checks passed'); process.exit(bad ? 1 : 0);
