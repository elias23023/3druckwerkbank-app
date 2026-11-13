// usage: node compose.mjs <out.png> <title> <subtitle> "Label|/abs/path.png|note" ...   -> one row of pictures with captions
import { createRequire } from 'module'; const require = createRequire(import.meta.url); import fs from 'fs';
const { chromium } = require('/opt/node-tools/node_modules/playwright/index.js');
const [out, title, sub, ...items] = process.argv.slice(2);
const cells = items.map((it) => { const [label, file, note = ''] = it.split('|'); const b64 = fs.readFileSync(file).toString('base64'); return `<figure><img src="data:image/png;base64,${b64}"><figcaption><b>${label}</b>${note ? `<span>${note}</span>` : ''}</figcaption></figure>`; }).join('');
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Inter;font-weight:400;src:url(http://localhost:4310/app/node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2)}
@font-face{font-family:Inter;font-weight:600;src:url(http://localhost:4310/app/node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2)}
body{margin:0;background:#0b1220;color:#f4f6fb;font-family:Inter,system-ui,sans-serif;padding:36px 40px 40px;width:max-content}
h1{font-size:30px;margin:0 0 6px;font-weight:600;letter-spacing:-.01em}p{margin:0 0 26px;color:rgba(244,246,251,.72);font-size:17px}
.row{display:flex;gap:28px;align-items:flex-start}figure{margin:0;display:flex;flex-direction:column;gap:12px}
img{height:var(--h);border-radius:22px;display:block;box-shadow:0 20px 60px rgba(0,0,0,.5)}
figcaption{display:flex;flex-direction:column;gap:3px;max-width:var(--w)}figcaption b{font-size:19px;font-weight:600}figcaption span{font-size:15px;color:rgba(244,246,251,.7);line-height:1.35}
</style><h1>${title}</h1><p>${sub}</p><div class="row" style="--h:${process.env.H || 620}px;--w:${process.env.W || 520}px">${cells}</div>`;
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 2 })).newPage();
await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
const el = await p.$('body'); await el.screenshot({ path: out }); await b.close(); console.log('ok', out);
