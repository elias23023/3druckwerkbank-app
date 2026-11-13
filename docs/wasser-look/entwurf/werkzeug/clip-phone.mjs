// usage: node clip-phone.mjs <look-folder | -> <out-dir> [scene] [extra-query e.g. fallback=1]      (REDUCED=1 in the environment = prefers-reduced-motion)
// PHONE view (390x844). Choreography: idle 2 s, then the tabs "Projekte", "Material", "Start" are tapped (the harness moves class "on" and swaps the scene
// like the real app), then "Bearbeiten" on the first card is pressed. Two passes with the same choreography:
//   pass 1 records phone.mp4 (about 9 s, 780x1688), pass 2 takes the stills p0..p6.png (@2x):
//   p0, p1 = idle 1 s apart; p2 = WHILE the tab "Projekte" is held down; p3 = 450 ms after release; p4 = after "Material"; p5 = back on "Start"; p6 = WHILE the card button is held.
import { createRequire } from 'module'; const require = createRequire(import.meta.url); import fs from 'fs'; import { execFileSync } from 'child_process';
const { chromium } = require('/opt/node-tools/node_modules/playwright/index.js');
const [look, out, scene = 'start', extra = ''] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const lq = look && look !== '-' ? `look=${encodeURIComponent(look)}&` : ''; const vp = { width: 390, height: 844 };
const b = await chromium.launch();
for (const video of [true, false]) {
  const c = await b.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: true, isMobile: true, ...(video ? { recordVideo: { dir: out, size: { width: 780, height: 1688 } } } : {}), reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference' }); const p = await c.newPage();
  await p.goto(`http://localhost:4310/base.html?${lq}scene=${scene}${extra ? '&' + extra : ''}`, { waitUntil: 'load' }); await p.waitForFunction(() => window.__ready === true, null, { timeout: 15000 });
  const snap = (n) => (video ? null : p.screenshot({ path: `${out}/p${n}.png` }));
  const tab = (i) => p.locator('.m-tabs button').nth(i);
  const press = async (loc, hold, during) => { const r = await loc.boundingBox(); await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await p.waitForTimeout(hold); if (during !== undefined) await snap(during); await p.mouse.up(); };
  await p.waitForTimeout(900); await snap(0); await p.waitForTimeout(1000); await snap(1);
  await press(tab(2), 260, 2); await p.waitForTimeout(450); await snap(3); await p.waitForTimeout(900);
  await press(tab(3), 200); await p.waitForTimeout(1100); await snap(4);
  await press(tab(0), 200); await p.waitForTimeout(1200); await snap(5);
  await press(p.locator('.m-main > .m-card .btn:not(.btn--primary):not(.btn--icon)').first(), 380, 6); await p.waitForTimeout(900);
  if (video) { const v = p.video(); await c.close(); const webm = await v.path();
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-c:v', 'libx264', '-crf', '21', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${out}/phone.mp4`]); fs.rmSync(webm, { force: true }); } else await c.close();
}
await b.close(); console.log('ok', out);
