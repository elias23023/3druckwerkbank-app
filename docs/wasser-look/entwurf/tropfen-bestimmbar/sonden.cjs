// Four probes for the four faults an independent reviewer found in wasser.js on 22.11. (his own probes: rennen3.js, bogen1.js,
// hover.js; these are their cores with a verdict).   WASSER_APP=http://localhost:4610 node sonden.cjs [1,2,3,4]
// Each FAILS on the build before the repair (bf5bd11) and PASSES after it.
const { APP, open, until, go } = require('./common.cjs');
const only = (process.argv[2] || '1,2,3,4').split(','); let failed = 0;
const say = (ok, name, text) => { if (!ok) failed++; console.log(`${ok ? 'PASS' : 'FAIL'} ${name}  ${text}`); };
const shows = (page, t, ms) => until(page, (t) => window.Wasser.info.scene.includes('seite-' + t + '-'), t, ms).then(() => true, () => false);
(async () => {
  if (only.includes('1')) {   // a fetch of a scene that never answers must not hold up the scenes after it
    const s = await open(); const { page } = s; const held = [];
    await page.route(/seite-wetter/, (r) => { if (r.request().resourceType() === 'fetch') held.push(r); else r.continue(); });
    await page.goto(APP + '/#/start', { waitUntil: 'networkidle' }); await until(page, () => window.Wasser.info.scenes >= 5, null, 60000);
    await go(page, '#/wetter'); await until(page, () => window.__fetches && window.__fetches.some((u) => /seite-wetter/.test(u)), null, 20000); await page.waitForTimeout(500);
    await go(page, '#/archiv'); const next = await shows(page, 'archiv', 6000);                    // the scene after the hanging one
    await go(page, '#/wetter'); const second = await shows(page, 'wetter', 14000);               // the hanging one itself: by the second way after FETCH_MAX (8 s)
    for (const r of held) await r.continue().catch(() => {}); await page.waitForTimeout(1500);
    const open_ = await page.evaluate(() => window.__c.bmpNew - window.__c.bmpClose);
    say(next && second && open_ === 0, '1 hanging fetch', `the next scene (Archiv) reaches the drops: ${next}; the hanging scene (Wetter) comes by the second way: ${second}; bitmaps left open after the late answers: ${open_}`);
    await s.browser.close();
  }
  if (only.includes('2')) {   // fail(): textures and context given back
    const s = await open(); const { page } = s;
    await page.goto(APP + '/#/start', { waitUntil: 'networkidle' }); await until(page, () => window.Wasser.info.scenes >= 5, null, 60000);
    const r = await page.evaluate(async () => { const P = WebGLRenderingContext.prototype, d = P.drawArrays; P.drawArrays = function () { throw new Error('probe'); }; window.dispatchEvent(new Event('scroll')); await new Promise((r) => setTimeout(r, 800)); P.drawArrays = d;
      const c = window.__c; await new Promise((r) => setTimeout(r, 500)); return { state: window.Wasser.info.state, tex: c.texNew - c.texDel, lost: window.__gls[0].isContextLost(), drops: document.querySelectorAll('.w3-drop').length }; });
    say(/^fallback/.test(r.state) && r.tex === 0 && r.lost && r.drops === 0, '2 fail()', JSON.stringify(r));
    await s.browser.close();
  }
  if (only.includes('3')) {   // a drop at rest behind a sheet changes its size
    const s = await open(); const { page } = s;
    await page.goto(APP + '/#/start', { waitUntil: 'networkidle' }); await until(page, () => window.Wasser.info.state === 'gl' && window.Wasser.info.frames > 3, null, 60000);
    await page.evaluate(() => document.querySelector('.m-head [aria-label="Einstellungen"]').click()); await until(page, () => window.Wasser.info.resting > 0 && window.Wasser.info.settling === 0, null, 30000);
    const m = () => page.evaluate(() => { const c = document.querySelector('.m-head [aria-label="Suche"] .w3-drop'); return { bitmap: c.width, needed: Math.round(c.getBoundingClientRect().width * devicePixelRatio) }; });
    const a = await m(); await page.evaluate(() => { document.querySelector('.m-head [aria-label="Suche"]').style.width = '70px'; }); await page.waitForTimeout(2500); const b = await m();
    const rest = await page.evaluate(() => window.Wasser.info.resting);
    say(Math.abs(b.bitmap - b.needed) <= 1 && b.bitmap !== a.bitmap && rest > 0, '3 resting drop resized', `before ${JSON.stringify(a)}, wider ${JSON.stringify(b)}, still resting: ${rest}`);
    await s.browser.close();
  }
  if (only.includes('4')) {   // the mouse rests on a drop while its sheet closes: hover pose again
    const s = await open({ w: 1920, h: 1080, mobile: false, reduced: true }); const { page } = s;
    await page.goto(APP + '/#/heute', { waitUntil: 'networkidle' }); await until(page, () => window.Wasser && window.Wasser.info.state === 'gl' && window.Wasser.info.frames >= 1, null, 90000);
    const SEL = '.topbar [aria-label^="Hinweise"]';
    const hash = () => page.evaluate(async (SEL) => { for (let i = 0; i < 6; i++) await new Promise((r) => requestAnimationFrame(r)); await new Promise((r) => setTimeout(r, 600)); const c = document.querySelector(SEL + ' .w3-drop'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 3) h = (h * 31 + d[i]) | 0; return h; }, SEL);
    const b = await page.locator(SEL).boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2;
    await page.mouse.move(600, 600); await hash(); await page.evaluate(() => window.dispatchEvent(new Event('resize')));   // (the first read of a canvas moves it to another kind of memory in Chromium: pictures drawn before and after differ by 1/255 in a few values - read once, draw once, then compare)
    const h0 = await hash(); await page.mouse.move(x, y, { steps: 4 }); const h1 = await hash();
    await page.mouse.down(); await page.mouse.up(); await until(page, () => document.querySelector('.sheet'), null, 20000); const hOpen = await hash();
    await page.keyboard.press('Escape'); await until(page, () => !document.querySelector('.sheet'), null, 20000); const h2 = await hash();
    say(h1 !== h0 && hOpen === h0 && h2 === h1, '4 hover after the sheet', `rest ${h0}, mouse on it ${h1}, sheet open ${hOpen} (rest pose: ${hOpen === h0}), sheet closed with the mouse still on it ${h2} (${h2 === h1 ? 'hover pose' : h2 === h0 ? 'REST pose' : 'another picture'})`);
    await s.browser.close();
  }
  console.log(failed ? `${failed} probe(s) FAILED` : 'all probes passed'); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
