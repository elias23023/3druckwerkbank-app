// Does a pressed drop freeze when the sheet it opens appears? Frames of the pressed button before and after the click.
import pw from '/opt/node-tools/node_modules/playwright/index.js';
import fs from 'node:fs';
const base = process.argv[2], out = process.argv[3], kind = process.argv[4] || 'desk', sel = process.argv[5];
fs.mkdirSync(out, { recursive: true });
const b = await pw.chromium.launch();
const ctx = kind === 'desk' ? await b.newContext({ viewport: { width: 2000, height: 993 }, deviceScaleFactor: 1, timezoneId: 'Europe/Vienna', locale: 'de-AT' }) : await b.newContext({ ...pw.devices['iPhone 13'], timezoneId: 'Europe/Vienna', locale: 'de-AT' });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await p.route('**/api.open-meteo.com/**', (r) => r.abort());
await p.goto(base + '/#/' + (process.env.WELT || 'start'), { waitUntil: 'load' }); await p.waitForTimeout(4000);
const btn = p.locator(sel).first();
const box = await btn.boundingBox();
const pad = 26, clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + 2 * pad, height: box.height + 2 * pad };
const shot = async (n) => p.screenshot({ path: `${out}/${kind}-${n}.png`, clip });
const state = async () => p.evaluate((sel) => {
  const el = document.querySelector(sel); const root = document.querySelector('[data-wasser]'); const cs = (e, k) => e ? getComputedStyle(e).getPropertyValue(k).trim() : null;
  return { lauf: cs(el, '--wa-lauf'), rootLauf: cs(root, '--wa-lauf'), w3: el?.getAttribute('data-w3'), cls: el?.className, rest: !!document.querySelector('[data-wa-ruht], .wa-ruht'), attrs: root ? [...root.attributes].map((a) => a.name + '=' + a.value).filter((s) => /wa|wasser/.test(s)) : null, sheet: !!document.querySelector('.sheet, .m-sheet, [role=dialog]'), info: window.Wasser && window.Wasser.info ? JSON.stringify(window.Wasser.info).slice(0, 300) : null };
}, sel);
await shot('0-ruhe'); console.log('vor dem Klick', JSON.stringify(await state()));
await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(600); await shot('1-zeiger-drauf');
if (kind === "desk") { await p.mouse.down(); await p.waitForTimeout(70); await p.mouse.up(); } else { await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); }
for (const t of [60, 200, 500, 1000, 2500, 6000]) { await p.waitForTimeout(t - (globalThis.__last || 0)); globalThis.__last = t; await shot(`2-nach-${String(t).padStart(4, '0')}ms`); }
console.log('nach dem Klick', JSON.stringify(await state()));
// pixel difference between "at rest before" and "6 s after the click" inside the clip
await p.screenshot({ path: `${out}/${kind}-ganz-offen.png` });
console.log('Seitenfehler', errs.length ? errs : 0);
await b.close();
