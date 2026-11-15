// Frames of soft leaving at fixed times after the removal (0 80 160 240 300 ms): the leaving animations that the removal
// started are paused and set to each time; the app's removal timers (250..700 ms) are held until the last frame, which
// releases them (the real removal). Phone 390x844 @2, desktop 2000x993 @2 (right part).
import { session, strip, mkdir } from '../../../../scripts/wasser/lib.mjs';
import { openDesktop } from '../../../../scripts/wasser/desktop-lib.mjs';
const OUT = process.argv[2]; mkdir(OUT);
const TIMES = [0, 80, 160, 240, 300];

async function hold(page) {
  await page.evaluate(() => { const real = window.setTimeout; window.__realST = real; window.__held = []; window.setTimeout = function (fn, ms, ...r) { if (ms >= 250 && ms <= 700) { window.__held.push(fn); return 0; } return real.call(window, fn, ms, ...r); }; });
}
async function unhold(page) { await page.evaluate(() => { window.setTimeout = window.__realST; }); }
// trigger: a function run in the page; ready: a predicate string evaluated in the page until true
async function capture(page, name, trigger, { clip = null, until = '!!document.querySelector(".wa-geht")' } = {}) {
  await hold(page);
  const n = await page.evaluate(async ([trig, until]) => {
    const pre = new Set(document.getAnimations());
    // eslint-disable-next-line no-new-func
    new Function(trig)();
    const tick = () => new Promise((r) => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
    for (let i = 0; i < 200 && !new Function('return ' + until)(); i++) await tick();
    const anims = document.getAnimations().filter((a) => !pre.has(a) && a.effect && a.effect.getTiming().iterations !== Infinity);
    anims.forEach((a) => a.pause()); window.__anims = anims; return anims.map((a) => a.animationName || 'web');
  }, [trigger, until]);
  const frames = [];
  for (const t of TIMES) {
    const last = t === TIMES[TIMES.length - 1];
    await page.evaluate(([t, last]) => { if (last) { window.__held.forEach((f) => f()); window.__held = []; } window.__anims.forEach((a) => { try { a.currentTime = t; } catch {} }); }, [t, last]);
    await page.waitForTimeout(220);
    const file = `${OUT}/${name}-${String(t).padStart(3, '0')}.png`;
    await page.screenshot({ path: file, ...(clip ? { clip } : {}) });
    frames.push({ file, label: `${t} ms${last ? ' (entfernt)' : ''}` });
  }
  await page.evaluate(() => window.__anims.forEach((a) => a.play()));
  await unhold(page);
  console.log(name, 'animations:', n.join(', '));
  return frames;
}

const s = await session();
const strips = [];
// ---- phone
for (const ton of ['dunkel', 'klar']) {
  const a = await s.app({ ton, zeit: 'tag' }); const p = a.page;
  await a.go('#/heute', 1200);
  await a.sheet('einstellungen');
  const f1 = await capture(p, `handy-bogen-${ton}`, "document.querySelector('.sheet .sheet__head button[aria-label=\"Schließen\"]').click()");
  strips.push(await strip(f1, `${OUT}/streifen-handy-bogen-${ton}.png`, { title: `Handy: ein Bogen schließt (Einstellungen), Ton „${ton}“`, note: 'Zeit nach dem Tipp auf „Schließen“; bei 300 ms ist er entfernt', scale: 0.5 }));
  if (ton === 'dunkel') {
    await a.go('#/heute', 1200);
    const f2 = await capture(p, 'handy-haken', "document.querySelector('.m-main .m-row .check').click()");
    strips.push(await strip(f2, `${OUT}/streifen-handy-haken.png`, { title: 'Handy: eine abgehakte Aufgabe geht (Heute)', note: 'Die Zeile sinkt mit gefülltem Haken, die Zeilen darunter schließen die Lücke', scale: 0.5 }));
    await a.go('#/material', 1200); await p.locator('.m-main').evaluate((e) => { e.scrollTop = 99999; }); await p.waitForTimeout(500);
    const f3 = await capture(p, 'handy-einkauf', "document.querySelector('.m-main .m-shop button[aria-label$=\"entfernen\"]').click()");
    strips.push(await strip(f3, `${OUT}/streifen-handy-einkauf.png`, { title: 'Handy: ein Eintrag der Einkaufsliste wird entfernt (Material)', note: 'Der Eintrag geht, die Liste schließt sich; unten landet der Hinweis mit „Rückgängig“', scale: 0.5 }));
    await p.waitForTimeout(400);
    // a toast replaces a toast: a second entry is removed while the first toast stands
    await p.evaluate(() => document.querySelector('.m-main .m-shop button[aria-label$="entfernen"]').click()); await p.waitForTimeout(700);
    const f4 = await capture(p, 'handy-hinweis', "document.querySelector('.toast .toast__undo').click()", { until: '!!document.querySelector(".toast.wa-geht")' });
    strips.push(await strip(f4, `${OUT}/streifen-handy-hinweis.png`, { title: 'Handy: ein Hinweis ersetzt einen Hinweis („Rückgängig“ getippt)', note: '„Von der Einkaufsliste entfernt“ geht (darunter, nicht erreichbar), „Wiederhergestellt“ landet; der Eintrag ist sofort zurück', scale: 0.5 }));
    for (const ton2 of ['klar']) void ton2;
  }
  console.log('errors', ton, a.errors);
  await a.close();
}
// ---- desktop
for (const ton of ['dunkel']) {
  const d = await openDesktop({ ton, zeit: 'tag', scale: 2, browser: s.browser });
  const p = d.page; const clip = { x: 1300, y: 0, width: 700, height: 993 };
  await d.go('heute'); await d.sheet('einstellungen'); await p.waitForTimeout(900);
  const f5 = await capture(p, 'desktop-schublade', "document.querySelector('.sheet .sheet__head button[aria-label=\"Schließen\"]').click()", { clip });
  strips.push(await strip(f5, `${OUT}/streifen-desktop-schublade.png`, { title: 'Desktop 2000 × 993: die Schublade schließt (Einstellungen, Welt Heute)', note: 'Sie fließt nach rechts hinaus, der Schleier klärt sich; rechter Teil des Bildschirms', scale: 0.4 }));
  await d.go('heute');
  const clip2 = { x: 0, y: 430, width: 700, height: 563 };
  const f6 = await capture(p, 'desktop-haken', "document.querySelector('.panel .item .check').click()", { clip: clip2 });
  strips.push(await strip(f6, `${OUT}/streifen-desktop-haken.png`, { title: 'Desktop 2000 × 993: eine abgehakte Aufgabe geht (Heute)', note: 'linke Spalte', scale: 0.4 }));
  console.log('errors desktop', d.errors);
  await d.close();
}
await s.close();
console.log(strips.join('\n'));
