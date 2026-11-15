// The phone's background on a change of tab: frames (0 100 200 300 450 600 ms after the tap, both tones), the drops in the
// header during a real change (before: hard switch; now: blend), ten quick changes, reduced motion, a slow network.
import { session, strip, mkdir, serve, abs } from '../../../../scripts/wasser/lib.mjs';
const OUT = process.argv[2]; mkdir(OUT); const VORHER = process.argv[3];
const res = []; const ok = (name, cond, info = '') => { res.push([cond ? 'PASS' : 'FAIL', name, info]); console.log(cond ? 'PASS' : 'FAIL', name, info); };
const sleep = (p, ms) => p.waitForTimeout(ms);
const TIMES = [0, 100, 200, 300, 450, 600];
const tab = (p, name) => p.evaluate((n) => { window.__T0 = performance.now(); [...document.querySelectorAll('.m-tabs button')].find((x) => x.textContent.includes(n)).click(); }, name);

const s = await session();
// ---- frames
for (const ton of ['dunkel', 'klar']) {
  const a = await s.app({ ton, zeit: 'tag' }); const p = a.page;
  await a.go('#/heute', 1500); await sleep(p, 2500);   // (the other tabs' scenes are preloaded 1.2 s after the start)
  await p.evaluate(() => { const real = window.setTimeout; window.__realST = real; window.__held = []; window.setTimeout = function (fn, ms, ...r) { if (ms >= 250 && ms <= 1200) { window.__held.push(fn); return 0; } return real.call(window, fn, ms, ...r); }; });
  const info = await p.evaluate(async () => {
    const pre = new Set(document.getAnimations());
    window.__T0 = document.timeline.currentTime; [...document.querySelectorAll('.m-tabs button')].find((x) => x.textContent.includes('Projekte')).click();   // (document timeline: the fixed clock of the tool fakes performance.now)
    let fade = null;
    for (let i = 0; i < 300 && !fade; i++) { await new Promise((r) => requestAnimationFrame(r)); fade = document.getAnimations().find((a) => a.animationName === 'wa-szene-kommt' && a.startTime != null); }
    const anims = document.getAnimations().filter((a) => !pre.has(a) && a.effect && a.effect.getTiming().iterations !== Infinity);
    anims.forEach((a) => a.pause());
    window.__anims = anims; window.__fade = fade; window.__d = fade ? fade.startTime - window.__T0 : -1;
    // the cards' entrances began at the tap: their times are set from it; the fade began d ms later
    window.__st = new Map(anims.map((a) => [a, a === fade ? 0 : Math.max(0, (a.startTime ?? window.__T0) - window.__T0)]));
    return { d: window.__d, n: anims.length };
  });
  console.log(ton, 'fade began', info.d.toFixed(0), 'ms after the tap;', info.n, 'animations held');
  const frames = [];
  for (const t of TIMES) {
    await p.evaluate((t) => { for (const a of window.__anims) { const off = a === window.__fade ? window.__d : window.__st.get(a); try { a.currentTime = Math.max(0, t - off); } catch {} } }, t);
    await sleep(p, 350);   // the drops draw at their resting pace and read the picture's opacity
    const file = `${OUT}/szene-${ton}-${String(t).padStart(3, '0')}.png`; await p.screenshot({ path: file });
    const st = await p.evaluate(() => ({ imgs: document.querySelectorAll('.m-bg img').length, op: [...document.querySelectorAll('.m-bg img')].map((i) => getComputedStyle(i).opacity).join('/') }));
    frames.push({ file, label: `${t} ms · Bilder ${st.imgs} · Deckkraft ${st.op}` });
  }
  await p.evaluate(() => { window.__anims.forEach((a) => a.play()); window.setTimeout = window.__realST; window.__held.forEach((f) => f()); });
  await sleep(p, 1200);
  const end = await p.evaluate(() => ({ imgs: [...document.querySelectorAll('.m-bg img')].map((i) => i.currentSrc.split('/').pop()), scene: (window.Wasser.info.scene || '').split('/').pop() }));
  ok(`${ton}: after the fade one picture, the drops on it`, end.imgs.length === 1 && /projekte/.test(end.imgs[0]) && end.scene === end.imgs[0], JSON.stringify(end));
  await strip(frames, `${OUT}/streifen-szene-${ton}.png`, { title: `Handy: der Hintergrund blendet über (Heute → Projekte), Ton „${ton}“`, note: `Zeit nach dem Tipp; die Blende begann ${info.d.toFixed(0)} ms nach dem Tipp (Bild aus dem Vorrat). Die Tropfen der Kopfzeile mischen beide Bilder wie die Seite.`, scale: 0.42, captionSize: 15 });
  console.log('errors', ton, a.errors);
  await a.close();
}

// ---- the drops in the header during a real change: before (hard switch) and now (blend)
const servers = [];
const apps = [['jetzt', undefined]];
if (VORHER) { const sv = await serve(abs(VORHER), { app: true }); servers.push(sv); apps.unshift(['vorher', sv.url]); }
for (const [name, app] of apps) {
  const a = await s.app({ ton: 'dunkel', zeit: 'tag', ...(app ? { app } : {}) }); const p = a.page;
  await a.go('#/heute', 1500); await sleep(p, 2500);
  const series = [];
  for (const to of ['Projekte', 'Material', 'Heute']) {
    const r = await p.evaluate(async (to) => {
      const cv = document.querySelector('.m-head .m-ico .w3-drop'); const cx = cv.getContext('2d');
      const lum = () => { const d = cx.getImageData(0, 0, cv.width, cv.height).data; let s = 0, n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; } return n ? s / n : 0; };
      const out = []; let last = null; const t0 = performance.now();
      [...document.querySelectorAll('.m-tabs button')].find((x) => x.textContent.includes(to)).click();
      while (performance.now() - t0 < 1400) { await new Promise((r) => requestAnimationFrame(r)); const v = lum(); if (last === null || Math.abs(v - last) > 0.01) out.push([Math.round(performance.now() - t0), +v.toFixed(2)]); last = v; }
      return out;
    }, to);
    const steps = r.slice(1).map((x, i) => Math.abs(x[1] - r[i][1])); const total = Math.abs(r[r.length - 1][1] - r[0][1]);
    series.push({ to, total: +total.toFixed(1), maxStep: +Math.max(...steps).toFixed(1), pictures: r.length });
    await sleep(p, 600);
  }
  console.log(name, 'header drop, mean brightness of its canvas: change over the tab change, largest step between two of its pictures', JSON.stringify(series));
  await a.close();
}
for (const sv of servers) await sv.close();

// ---- ten quick changes; never more than two pictures; always one opaque, loaded picture
{
  const a = await s.app({ ton: 'dunkel' }); const p = a.page; await sleep(p, 2500);
  const r = await p.evaluate(async () => {
    let maxImgs = 0, empty = 0, frames = 0, stop = false;
    const look = () => { if (stop) return; frames++; const im = [...document.querySelectorAll('.m-bg img')]; maxImgs = Math.max(maxImgs, im.length); if (!im.some((i) => i.complete && i.naturalWidth && getComputedStyle(i).opacity === '1')) empty++; requestAnimationFrame(look); };
    requestAnimationFrame(look);
    const order = ['Projekte', 'Material', 'Mehr', 'Start', 'Heute', 'Projekte', 'Mehr', 'Material', 'Start', 'Projekte'];
    for (const n of order) { [...document.querySelectorAll('.m-tabs button')].find((x) => x.textContent.includes(n)).click(); await new Promise((r) => setTimeout(r, 70)); }
    await new Promise((r) => setTimeout(r, 2000)); stop = true;
    return { maxImgs, empty, frames, imgs: [...document.querySelectorAll('.m-bg img')].map((i) => i.currentSrc.split('/').pop()), scene: (window.Wasser.info.scene || '').split('/').pop(), hash: location.hash };
  });
  ok('ten tab changes 70 ms apart: ends on the last tab\'s picture (page and drops), never more than two pictures, never none shown', r.maxImgs <= 2 && r.empty === 0 && r.imgs.length === 1 && /projekte/.test(r.imgs[0]) && r.scene === r.imgs[0], JSON.stringify(r));
  await a.close();
}
// ---- reduced motion (system): a plain cut, never empty
{
  const a = await s.app({ ton: 'dunkel', reduced: true }); const p = a.page; await sleep(p, 2500);
  const r = await p.evaluate(async () => {
    let fades = 0, empty = 0, stop = false, maxImgs = 0;
    document.addEventListener('animationstart', (e) => { if (e.animationName === 'wa-szene-kommt') fades++; }, true);
    const look = () => { if (stop) return; const im = [...document.querySelectorAll('.m-bg img')]; maxImgs = Math.max(maxImgs, im.length); if (!im.some((i) => i.complete && i.naturalWidth && getComputedStyle(i).opacity === '1')) empty++; requestAnimationFrame(look); };
    requestAnimationFrame(look);
    const t0 = performance.now(); [...document.querySelectorAll('.m-tabs button')].find((x) => x.textContent.includes('Projekte')).click();
    let one = 0; while (performance.now() - t0 < 1500) { await new Promise((r) => requestAnimationFrame(r)); const im = document.querySelectorAll('.m-bg img'); if (im.length === 1 && /projekte/.test(im[0].currentSrc) && !one) one = performance.now() - t0; }
    stop = true; return { fades, empty, maxImgs, oneAfter: Math.round(one) };
  });
  ok('reduced motion: no fade, the new picture replaces the old one once loaded, never empty', r.fades === 0 && r.empty === 0 && r.oneAfter > 0, JSON.stringify(r));
  await a.close();
}
// ---- slow network, a scene that is not preloaded (Mehr -> Wetter): the old picture stays until the new one is there
{
  const a = await s.app({ ton: 'dunkel' }); const p = a.page;
  const cdp = await p.context().newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 400 * 1024 / 8, uploadThroughput: 100000 });
  await a.go('#/druck', 800); await sleep(p, 1500);
  const r = await p.evaluate(async () => {
    let empty = 0, maxImgs = 0, stop = false, kommt = 0;
    const look = () => { if (stop) return; const im = [...document.querySelectorAll('.m-bg img')]; maxImgs = Math.max(maxImgs, im.length); if (im.some((i) => i.dataset.szene === 'kommt') && !kommt) kommt = performance.now() - t0; if (!im.some((i) => i.complete && i.naturalWidth && getComputedStyle(i).opacity === '1')) empty++; requestAnimationFrame(look); };
    const t0 = performance.now(); requestAnimationFrame(look); location.hash = '#/wetter';
    await new Promise((r) => setTimeout(r, 15000)); stop = true;
    return { empty, maxImgs, fadeBeganAfter: Math.round(kommt), imgs: [...document.querySelectorAll('.m-bg img')].map((i) => i.currentSrc.split('/').pop()) };
  });
  ok('slow network (400 ms, 400 kbit/s, no cache), a scene not preloaded: the old picture stands until the new one has loaded, then the fade', r.empty === 0 && r.maxImgs <= 2 && r.imgs.length === 1 && /wetter/.test(r.imgs[0]), JSON.stringify(r));
  await a.close();
}
await s.close();
console.log(`\n${res.filter((r) => r[0] === 'PASS').length} passed, ${res.filter((r) => r[0] === 'FAIL').length} failed`);
