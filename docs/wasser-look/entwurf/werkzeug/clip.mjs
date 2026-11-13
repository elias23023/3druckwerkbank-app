// usage: node clip.mjs <look-folder | -> <out-dir> [scene] [extra-query e.g. fallback=1]
// Records ~7 s of the close-up (?nah=1) incl. two presses, writes nah.mp4 plus still frames t0..t6.png (t3/t4 are taken WHILE a button is pressed).
import { createRequire } from 'module'; const require = createRequire(import.meta.url); import fs from 'fs'; import { execFileSync } from 'child_process';
const { chromium } = require('/opt/node-tools/node_modules/playwright/index.js');
const [look, out, scene = 'start', extra = ''] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const lq = look && look !== '-' ? `look=${encodeURIComponent(look)}&` : ''; const size = { width: 900, height: 620 };
const b = await chromium.launch(); const c = await b.newContext({ viewport: size, deviceScaleFactor: 1, recordVideo: { dir: out, size }, reducedMotion: 'no-preference' }); const p = await c.newPage();
await p.goto(`http://localhost:4310/base.html?${lq}scene=${scene}&nah=1${extra ? '&' + extra : ''}`, { waitUntil: 'load' }); await p.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
const centre = async (sel) => { const r = await p.locator(sel).first().boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
const snap = (n) => p.screenshot({ path: `${out}/t${n}.png` });
await p.waitForTimeout(900); await snap(0); await p.waitForTimeout(900); await snap(1); await p.waitForTimeout(700); await snap(2);
let [x, y] = await centre('.nahbox .frei .btn--primary'); await p.mouse.move(x, y, { steps: 12 }); await p.mouse.down(); await p.waitForTimeout(350); await snap(3); await p.waitForTimeout(350); await p.mouse.up(); await p.waitForTimeout(800);
[x, y] = await centre('.nahbox .m-card .btn:not(.btn--primary)'); await p.mouse.move(x, y, { steps: 14 }); await p.mouse.down(); await p.waitForTimeout(350); await snap(4); await p.waitForTimeout(350); await p.mouse.up(); await p.waitForTimeout(700); await snap(5);
await p.mouse.move(40, 40, { steps: 10 }); await p.waitForTimeout(900); await snap(6);
const v = p.video(); await c.close(); await b.close(); const webm = await v.path();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${out}/nah.mp4`]); fs.rmSync(webm, { force: true });
console.log('ok', out);
