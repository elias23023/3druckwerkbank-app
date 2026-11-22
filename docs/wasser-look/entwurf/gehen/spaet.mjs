// Soft leaving when the clean-up comes AFTER the removal: gehen.ts rests on React 19 calling a ref's clean-up while the node is
// still in the document. This experiment makes the other order on purpose (spaet/seite.tsx: the same functions, called from a
// passive effect, whose clean-up runs when the node is already out) and shows that the leaving picture still comes, at its old
// place. Beside it the same list the way the app uses it ("frueh"), as the reference.
//
//   node docs/wasser-look/entwurf/gehen/spaet.mjs        (builds the page into a scratch folder; needs no preview)
//
// PASS/FAIL per check, exit code 1 when one fails.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync } from 'child_process'; import { fileURLToPath } from 'url';
import { pw, serve, abs } from '../../../../scripts/wasser/lib.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), out = fs.mkdtempSync(path.join(os.tmpdir(), 'gehen-spaet-'));
execFileSync(process.execPath, [abs('node_modules/vite/bin/vite.js'), 'build', path.join(here, 'spaet'), '--logLevel', 'error', '--base', './', '--outDir', out, '--emptyOutDir'], { cwd: abs('.'), stdio: ['ignore', 'inherit', 'inherit'] });
const s = await serve(out, { app: true }); const b = await pw.chromium.launch(); const p = await b.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
let bad = 0; const ok = (name, cond, info = '') => { if (!cond) bad++; console.log(cond ? 'PASS' : 'FAIL', name, typeof info === 'string' ? info : JSON.stringify(info)); };
await p.goto(s.url, { waitUntil: 'networkidle' }); await p.waitForSelector('#spaet .zeile');
// the state of a list right after rows were taken away (one picture later), and after the leaving time
const nimm = async (art, ...ids) => {
  const jetzt = await p.evaluate(([art, ids]) => new Promise((done) => { window[`weg_${art}`](...ids); requestAnimationFrame(() => { const l = document.getElementById(art);
    done({ reihe: [...l.children].map((x) => x.getAttribute('data-gehen').split('-')[1] + (x.classList.contains('wa-geht--zeile') ? '*' : '')).join(' '), bilder: [...l.querySelectorAll('.wa-geht.wa-geht--zeile')].map((x) => ({ id: x.getAttribute('data-gehen'), h: x.style.getPropertyValue('--wa-geht-h'), inert: x.inert, hidden: x.getAttribute('aria-hidden'), spaet: x.hasAttribute('data-gehen-spaet'), anim: x.getAnimations().map((a) => a.animationName).sort().join('+') })) }); }); }), [art, ids]);
  await p.waitForFunction((art) => !document.querySelector(`#${art} .wa-geht`), art, { timeout: 3000 }).catch(() => {});
  return { ...jetzt, danach: await p.evaluate((art) => [...document.getElementById(art).children].map((x) => x.getAttribute('data-gehen').split('-')[1] + (x.classList.contains('wa-geht') ? '*' : '')).join(' '), art) };
};
const lauf = {};
for (const art of ['frueh', 'spaet']) {
  const a = await nimm(art, `${art}-2`), bb = await nimm(art, `${art}-3`, `${art}-4`), c = await nimm(art, `${art}-5`); lauf[art] = [a, bb, c];
  const gut = (x, reihe, danach, n) => x.reihe === reihe && x.danach === danach && x.bilder.length === n && x.bilder.every((g) => parseFloat(g.h) > 20 && g.inert && g.hidden === 'true' && g.spaet === (art === 'spaet') && /wa-zeile/.test(g.anim));
  ok(`${art}: a row in the middle leaves as a picture at its old place, then it is gone`, gut(a, '1 2* 3 4 5', '1 3 4 5', 1), a);
  ok(`${art}: two neighbours at once: both pictures, in their old order`, gut(bb, '1 3* 4* 5', '1 5', 2), bb);
  ok(`${art}: the last row`, gut(c, '1 5*', '1', 1), c);
  // the sheet: back between its old neighbours
  const sh = await p.evaluate((art) => new Promise((done) => { window[`zu_${art}`](); requestAnimationFrame(() => { const g = document.querySelector('.sheet.wa-geht'); done(g ? { vor: g.previousElementSibling?.id, nach: g.nextElementSibling?.id, inert: g.inert, spaet: g.hasAttribute('data-gehen-spaet'), anim: g.getAnimations().map((x) => x.animationName).join('+') } : null); }); }), art);
  await p.waitForFunction(() => !document.querySelector('.wa-geht'), null, { timeout: 3000 }).catch(() => {});
  ok(`${art}: the sheet leaves as a picture between its old neighbours, then it is gone`, !!sh && sh.vor === `vor-${art}` && sh.nach === `nach-${art}` && sh.inert && sh.spaet === (art === 'spaet') && /wa-sinkt/.test(sh.anim) && (await p.locator('.wa-geht').count()) === 0, sh);
}
const draussen = await p.evaluate(() => window.__draussen);
ok('the experiment is what it claims: every late clean-up found its node already out of the document', draussen.length === 5 && draussen.every(Boolean), draussen);
ok('the late pictures have the height of the early ones', JSON.stringify(lauf.frueh.map((x) => x.bilder.map((g) => g.h))) === JSON.stringify(lauf.spaet.map((x) => x.bilder.map((g) => g.h))), lauf.spaet.map((x) => x.bilder.map((g) => g.h)).flat().join(' '));
ok('no error on the page', !errors.length, errors.slice(0, 3));
await b.close(); await s.close(); fs.rmSync(out, { recursive: true, force: true });
console.log(bad ? `\n${bad} check(s) FAILED` : '\nall checks passed'); process.exit(bad ? 1 : 0);
