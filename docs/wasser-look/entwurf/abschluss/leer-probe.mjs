// Spot check of finding F13: when the last task on the phone's Heute leaves, are the leaving row and the empty text ever
// visible together? Samples every animation frame for 1.5 s after the last tick.   node leer-probe.mjs <url>
import { pw, openApp } from '../../../../scripts/wasser/lib.mjs';
const url = process.argv[2];
const b = await pw.chromium.launch();
const a = await openApp(b, 'chromium', { app: url, ton: 'dunkel', zeit: 'tag', wetter: 'klar', reduced: false, scale: 1 });
const p = a.page; await a.go('#/heute', 2000);
const card = p.locator('.m-main .m-card', { hasText: 'Aufgaben' }).first();
const live = card.locator('.m-row[data-gehen]:not(.wa-geht) .check');
let n = await live.count(); console.log('open tasks', n);
while ((n = await live.count()) > 1) { await live.first().tap(); await p.waitForTimeout(900); }
const r = await p.evaluate(() => new Promise((resolve) => {
  const card = [...document.querySelectorAll('.m-main .m-card')].find((c) => /Aufgaben/.test(c.textContent));
  card.querySelector('.m-row[data-gehen]:not(.wa-geht) .check').click();
  const t0 = performance.now(), log = [];
  const op = (el) => { let o = 1; for (let e = el; e && e !== card; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
  const tick = () => {
    const row = card.querySelector('.m-row.wa-geht'); const empty = [...card.querySelectorAll('span.muted.small')].find((s) => /erledigt|Noch keine/.test(s.textContent));
    const er = empty && empty.getBoundingClientRect(), rr = row && row.getBoundingClientRect();
    log.push({ t: Math.round(performance.now() - t0), row: row ? +op(row).toFixed(2) : null, empty: empty ? +op(empty).toFixed(2) : null, emptyTop: er ? Math.round(er.top) : null, rowH: rr ? Math.round(rr.height) : null });
    if (performance.now() - t0 < 1500) requestAnimationFrame(tick); else resolve(log);
  };
  requestAnimationFrame(tick);
}));
const both = r.filter((x) => x.row > 0.05 && x.empty > 0.05);
console.log('frames', r.length, 'both visible', both.length, JSON.stringify(both.slice(0, 5)));
console.log('empty text top over time', JSON.stringify(r.filter((x, i) => i % 3 === 0).map((x) => [x.t, x.row, x.empty, x.emptyTop, x.rowH])));
console.log('errors', a.errors);
await a.close(); await b.close();
