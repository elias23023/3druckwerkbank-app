// usage: node shot.mjs <look-folder | -> <out-dir> [extra-query e.g. fallback=1]   -> writes phone-start.png, phone-wetter.png, phone-innen.png, nah-start.png, nah-wetter.png
import { createRequire } from 'module'; const require = createRequire(import.meta.url); import fs from 'fs';
const { chromium } = require('/opt/node-tools/node_modules/playwright/index.js');
const [look, out, extra = ''] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const base = 'http://localhost:4310/base.html'; const lq = look && look !== '-' ? `look=${encodeURIComponent(look)}&` : '';
const b = await chromium.launch();
const shot = async (name, query, viewport, scale) => {
  const c = await b.newContext({ viewport, deviceScaleFactor: scale, reducedMotion: 'no-preference' }); const p = await c.newPage(); const errs = [];
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
  await p.goto(`${base}?${lq}${query}${extra ? '&' + extra : ''}`, { waitUntil: 'load' }); await p.waitForFunction(() => window.__ready === true, null, { timeout: 15000 }); await p.waitForTimeout(1500);
  await p.screenshot({ path: `${out}/${name}.png` }); if (errs.length) console.log(name, 'errors:', errs.slice(0, 3)); await c.close();
};
for (const s of ['start', 'wetter', 'innen']) await shot(`phone-${s}`, `scene=${s}`, { width: 390, height: 844 }, 2);
for (const s of ['start', 'wetter']) await shot(`nah-${s}`, `scene=${s}&nah=1`, { width: 900, height: 620 }, 2);
await b.close(); console.log('ok', out);
