// Soft leaving: timing, races, reduced motion, keyboard, both workspaces, no look. Prints PASS/FAIL per check.
import { session } from '../../../../scripts/wasser/lib.mjs';
import { openDesktop } from '../../../../scripts/wasser/desktop-lib.mjs';
const res = []; const ok = (name, cond, info = '') => { res.push([cond ? 'PASS' : 'FAIL', name, info]); console.log(cond ? 'PASS' : 'FAIL', name, info); };
const sleep = (p, ms) => p.waitForTimeout(ms);
// watcher in the page: ghost insertions (animationstart of .wa-geht) and removals, with times
const watch = (p) => p.evaluate(() => {
  window.__w = { rm: [], seen: 0, inner: [] };
  // removals of leaving pictures (gehen.ts takes them out with el.remove()): when, and when their own leaving animation ended
  const rm = Element.prototype.remove;
  Element.prototype.remove = function () {
    if (this.classList && this.classList.contains('wa-geht') && this.isConnected) {
      const an = this.getAnimations({ subtree: true }).filter((a) => { const x = a.effect && a.effect.target; return (x === this || (x && x.parentNode === this)) && a.effect.getTiming().iterations !== Infinity && a.startTime != null; });
      const end = an.length ? Math.max(...an.map((a) => a.startTime + a.effect.getComputedTiming().endTime)) : null;
      window.__w.rm.push([this.className, performance.now(), end, an.map((a) => a.animationName).join('+')]);
    }
    return rm.call(this);
  };
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1 && n.classList.contains('wa-geht')) { window.__w.seen++; window.__w.inner.push(n.getAnimations({ subtree: true }).filter((a) => a.effect.getTiming().iterations !== Infinity).map((a) => a.animationName).join(',')); } }).observe(document.body, { childList: true, subtree: true });
  window.__fr = []; const f = (t) => { window.__fr.push(t); if (window.__fr.length > 3000) window.__fr.shift(); requestAnimationFrame(f); }; requestAnimationFrame(f);
});
const gone = async (p) => { const t0 = Date.now(); try { await p.waitForFunction(() => !document.querySelector('.wa-geht'), null, { timeout: 3000 }); } catch {} return [await p.evaluate(() => document.querySelectorAll('.wa-geht').length), Date.now() - t0]; };
const ghosts = (p) => p.evaluate(() => document.querySelectorAll('.wa-geht').length);
const store = (p) => p.evaluate(() => { const k = localStorage.getItem('3druckwerkbank:bereich') === 'echt' ? '3druckwerkbank:echt:v1' : '3druckwerkbank:v1'; const s = JSON.parse(localStorage.getItem(k)).state; return { done: s.tasks.filter((t) => t.done).length, open: s.tasks.filter((t) => !t.done && !t.skipped).length, shop: s.shopping.length }; });
async function timing(p, label) {
  await gone(p); await sleep(p, 100);
  const w = await p.evaluate(() => ({ rm: window.__w.rm, fr: window.__fr }));
  for (const [cls, at, end, names] of w.rm) {
    const name = `${label}: removed within one frame after its leaving animation (${cls.replace(/glass |glass--strong /g, '').trim()})`;
    if (end == null) { ok(name, false, 'no leaving animation found at removal'); continue; }
    const frames = w.fr.filter((t) => t > end && t < at).length;   // frames that began after the animation's end and before the removal
    const near = w.fr.filter((t) => t > end - 400 && t < at + 50); const gaps = near.slice(1).map((t, i) => t - near[i]).sort((x, y) => x - y);
    ok(name, frames <= 1 && at >= end - 2, `${names}: removed ${(at - end).toFixed(1)} ms after its end (frames begun in between: ${frames}; frame interval here: median ${(gaps[gaps.length >> 1] || 0).toFixed(0)} ms)`);
  }
  await p.evaluate(() => { window.__w.rm = []; });
}

const s = await session(); const inner = [];
const keepInner = async (p) => { try { inner.push(...await p.evaluate(() => window.__w.inner)); } catch {} };
// ================= PHONE, demo
{
  const a = await s.app({ ton: 'dunkel' }); const p = a.page; await watch(p);
  await a.go('#/heute', 1200);
  // timing: sheet
  await a.sheet('einstellungen'); await p.evaluate(() => document.querySelector('.sheet [aria-label="Schließen"]').click()); await timing(p, 'phone sheet');
  // keyboard: focus returns to the opener at once (the gear), Escape twice
  await p.evaluate(() => document.querySelector('.m-head [aria-label="Einstellungen"]').focus()); await p.keyboard.press('Enter'); await sleep(p, 700);
  const opened = await p.evaluate(() => !!document.querySelector('.sheet:not(.wa-geht)'));
  await p.keyboard.press('Escape'); await sleep(p, 30);
  const foc = await p.evaluate(() => [document.activeElement?.getAttribute('aria-label'), document.querySelectorAll('.sheet.wa-geht').length]);
  ok('phone keyboard: Enter opens, Escape closes, focus back on the opener at once (while it leaves)', opened && foc[0] === 'Einstellungen' && foc[1] === 1, JSON.stringify(foc));
  await p.keyboard.press('Escape'); await gone(p);
  ok('phone Escape twice: nothing left, no error', (await ghosts(p)) === 0 && !(await p.evaluate(() => !!document.querySelector('.sheet'))) && a.errors.filter((e) => !/ERR_|Failed to load/.test(e)).length === 0, `hash ${await p.evaluate(() => location.hash)}`);
  await timing(p, 'phone sheet (keyboard)');
  // backdrop tap during leaving
  await a.sheet('einstellungen'); await p.evaluate(() => document.querySelector('.sheet [aria-label="Schließen"]').click()); await sleep(p, 60);
  await p.mouse.click(195, 140); await sleep(p, 700);
  ok('phone backdrop tap during leaving: no ghost left, at most one sheet', (await ghosts(p)) === 0 && (await p.locator('.sheet').count()) <= 1, `sheets ${await p.locator('.sheet').count()}`);
  await p.evaluate(() => document.querySelector('.sheet [aria-label="Schließen"]')?.click()); await sleep(p, 500);
  // open B while A leaves
  await a.sheet('einstellungen'); await p.evaluate(() => document.querySelector('.sheet [aria-label="Schließen"]').click()); await sleep(p, 50);
  await p.evaluate(() => document.querySelector('.m-head [aria-label^="Hinweise"]').click()); await sleep(p, 30);
  const g1 = await ghosts(p); await gone(p); await sleep(p, 900);
  const b = await p.evaluate(() => { const x = document.querySelector('.sheet'); return [document.querySelectorAll('.sheet').length, x?.getAttribute('aria-label'), x?.classList.contains('wa-geht'), getComputedStyle(x).opacity, x?.inert]; });
  ok('phone sheet B opens while A leaves: A is cut at once, B stands', g1 === 0 && b[0] === 1 && b[1] === 'Hinweise' && !b[2] && b[3] === '1' && !b[4], `ghosts right after: ${g1}; ${JSON.stringify(b)}`);
  await p.evaluate(() => document.querySelector('.sheet [aria-label="Schließen"]').click()); await sleep(p, 500); await p.evaluate(() => { window.__w.rm = []; });
  // the row: timing, tick five within a second
  let st0 = await store(p); const rows0 = await p.evaluate(() => document.querySelectorAll('.m-main [data-gehen]:not(.wa-geht) .check').length);
  for (let i = 0; i < 5; i++) { await p.evaluate(() => document.querySelector('.m-main .m-card [data-gehen]:not(.wa-geht) .check').click()); await sleep(p, 170); }
  await gone(p);
  let st1 = await store(p); const rows1 = await p.evaluate(() => document.querySelectorAll('.m-main [data-gehen]:not(.wa-geht) .check').length);
  ok('phone tick five rows within a second: each store action once, no ghost left', st1.done === st0.done + 5 && (await ghosts(p)) === 0 && rows1 === rows0 - 5, `done ${st0.done}->${st1.done}, check rows ${rows0}->${rows1}`);
  await timing(p, 'phone row');
  // change of tab during leaving (row and sheet)
  st0 = await store(p);
  await p.evaluate(() => document.querySelector('.m-main .m-card [data-gehen]:not(.wa-geht) .check').click()); await sleep(p, 40);
  await p.evaluate(() => [...document.querySelectorAll('.m-tabs button')].find((x) => x.textContent.includes('Projekte')).click()); await sleep(p, 600);
  st1 = await store(p);
  ok('phone change of tab while a row leaves', (await ghosts(p)) === 0 && st1.done === st0.done + 1 && (await p.evaluate(() => location.hash)) === '#/projekte');
  await a.sheet('einstellungen'); await p.evaluate(() => document.querySelector('.sheet [aria-label="Schließen"]').click()); await sleep(p, 40);
  await p.evaluate(() => [...document.querySelectorAll('.m-tabs button')].find((x) => x.textContent.includes('Material')).click()); await sleep(p, 30);
  const mid = await ghosts(p); await sleep(p, 600);
  ok('phone change of tab while a sheet leaves: it finishes over the new page, then gone', mid >= 1 && (await ghosts(p)) === 0 && (await p.evaluate(() => location.hash)) === '#/material', `ghosts during: ${mid}`);
  await p.evaluate(() => { window.__w.rm = []; });
  // undo during leaving; the old toast's button is not reachable
  await p.locator('.m-main').evaluate((e) => { e.scrollTop = 99999; }); await sleep(p, 400);
  st0 = await store(p);
  const id = await p.evaluate(() => { const r = document.querySelector('.m-main .m-shop[data-gehen]'); const id = r.getAttribute('data-gehen'); r.querySelector('button[aria-label$="entfernen"]').click(); return id; });
  await sleep(p, 60);
  const mid1 = await store(p);
  const box = await p.evaluate(() => { const b = document.querySelector('.toast:not(.wa-geht) .toast__undo').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; });
  await p.evaluate(() => document.querySelector('.toast:not(.wa-geht) .toast__undo').click()); await sleep(p, 30);
  const after = await p.evaluate((id) => [document.querySelectorAll(`[data-gehen="${id}"]`).length, document.querySelectorAll(`.wa-geht[data-gehen="${id}"]`).length], id);
  const hit = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return [!!e?.closest('.wa-geht'), e?.closest('.toast')?.textContent?.slice(0, 30), document.querySelector('.toast.wa-geht')?.inert, document.querySelector('.toast.wa-geht')?.getAttribute('aria-hidden')]; }, box);
  await sleep(p, 500); const st2 = await store(p);
  ok('phone undo while the row leaves: the row is back once, its leaving picture cut', mid1.shop === st0.shop - 1 && st2.shop === st0.shop && after[0] === 1 && after[1] === 0 && (await ghosts(p)) === 0, `shop ${st0.shop}->${mid1.shop}->${st2.shop}, rows with that id right after undo: ${after[0]} (ghosts ${after[1]})`);
  ok('phone toast replaced: the old one (with its undo) lies under the new one, inert and hidden', !hit[0] && hit[2] === true && hit[3] === 'true', JSON.stringify(hit));
  // workspace change during a leaving sheet: open the workspace sheet, choose the other one (the page reloads)
  await p.evaluate(() => document.querySelector('.m-head .ws-chip').click()); await sleep(p, 700);
  const cards = await p.locator('.sheet .bereich-card').count();
  await p.locator('.sheet .bereich-card button', { hasText: 'wechseln' }).first().click(); await sleep(p, 300);
  await p.waitForSelector('.m-shell', { timeout: 15000 }); await sleep(p, 1500);
  const ws = await p.evaluate(() => localStorage.getItem('3druckwerkbank:bereich'));
  ok('phone change of workspace from its sheet: nothing left over', (await ghosts(p)) === 0 && cards === 2, `workspace now ${ws}`);
  await keepInner(p); console.log('errors phone demo', a.errors);
  // ================= PHONE, echt (empty)
  if (ws !== 'echt') await a.bereich('echt');
  await watch(p); await a.go('#/material', 1000);
  await p.locator('.m-main input[aria-label="Auf die Einkaufsliste"]').fill('Testeintrag'); await p.keyboard.press('Enter'); await sleep(p, 400);
  st0 = await store(p);
  await p.evaluate(() => document.querySelector('.m-main .m-shop button[aria-label$="entfernen"]').click()); await sleep(p, 60);
  const g2 = await ghosts(p); await gone(p);
  st1 = await store(p);
  ok('echt (empty workspace): a removed entry leaves, store once', g2 === 1 && (await ghosts(p)) === 0 && st1.shop === st0.shop - 1, `ghost during ${g2}, shop ${st0.shop}->${st1.shop}`);
  await a.sheet('einstellungen'); await p.evaluate(() => document.querySelector('.sheet [aria-label="Schließen"]').click());
  await timing(p, 'echt phone sheet');
  // reduced motion through the app's own setting
  await a.sheet('einstellungen'); await p.locator('.sheet button', { hasText: /^Reduziert$/ }).first().click(); await sleep(p, 300);
  const motion = await p.evaluate(() => document.documentElement.dataset.motion);
  await p.evaluate(() => { window.__w.seen = 0; document.querySelector('.sheet [aria-label="Schließen"]').click(); });
  await sleep(p, 20);
  const imm = await p.evaluate(() => [document.querySelectorAll('.sheet').length, document.querySelectorAll('.sheet-back').length, window.__w.seen]);
  ok('reduced motion (app setting): the sheet is gone at once, nothing waits', motion === 'reduziert' && imm[0] === 0 && imm[1] === 0 && imm[2] === 0, JSON.stringify(imm));
  await p.locator('.m-main input[aria-label="Auf die Einkaufsliste"]').fill('Zweiter'); await p.keyboard.press('Enter'); await sleep(p, 300);
  await p.evaluate(() => { window.__w.seen = 0; document.querySelector('.m-main .m-shop button[aria-label$="entfernen"]').click(); }); await sleep(p, 20);
  ok('reduced motion (app setting): a removed row is gone at once', (await p.evaluate(() => [document.querySelectorAll('.m-shop').length, window.__w.seen])).join() === '0,0');
  console.log('errors phone echt', a.errors);
  await a.close();
}
// reduced motion through the system setting
{
  const a = await s.app({ ton: 'dunkel', reduced: true }); const p = a.page; await watch(p);
  await a.sheet('einstellungen'); await p.evaluate(() => { window.__w.seen = 0; document.querySelector('.sheet [aria-label="Schließen"]').click(); }); await sleep(p, 20);
  const imm = await p.evaluate(() => [document.querySelectorAll('.sheet').length, window.__w.seen, document.documentElement.dataset.motion]);
  ok('reduced motion (system setting): the sheet is gone at once', imm[0] === 0 && imm[1] === 0, JSON.stringify(imm));
  await a.close();
}
// no look at all: nothing waits
{
  const a = await s.app({ ton: 'dunkel', look: '' }); const p = a.page; await watch(p);
  await a.sheet('einstellungen'); await p.evaluate(() => { window.__w.seen = 0; document.querySelector('.sheet [aria-label="Schließen"]').click(); }); await sleep(p, 20);
  const imm = await p.evaluate(() => [document.querySelectorAll('.sheet').length, window.__w.seen, !!document.querySelector('[data-wasser]'), getComputedStyle(document.documentElement).getPropertyValue('--wa-t-leave')]);
  ok('without the look (look taken out): the sheet is gone at once', imm[0] === 0 && imm[1] === 0, JSON.stringify(imm));
  await a.close();
}
// ================= DESKTOP
for (const format of ['2000', '1920']) {
  const d = await openDesktop({ ton: 'dunkel', zeit: 'tag', format, browser: s.browser }); const p = d.page; await watch(p);
  await d.go('heute');
  await p.evaluate(() => document.querySelector('.topbar [aria-label="Einstellungen"]').focus()); await p.keyboard.press('Enter'); await sleep(p, 900);
  await p.keyboard.press('Escape'); await sleep(p, 30);
  const f = await p.evaluate(() => [document.activeElement?.getAttribute('aria-label'), document.querySelectorAll('.sheet.wa-geht').length, getComputedStyle(document.querySelector('.sheet.wa-geht') || document.body).animationName]);
  await p.keyboard.press('Escape'); await gone(p);
  ok(`desktop ${format}: Escape closes, focus back on the opener, a second Escape does not leave the world`, f[0] === 'Einstellungen' && f[1] === 1 && f[2] === 'wa-fliesst-weg' && (await p.evaluate(() => location.hash)) === '#/heute' && (await ghosts(p)) === 0, `${JSON.stringify(f)} hash ${await p.evaluate(() => location.hash)}`);
  await timing(p, `desktop ${format} drawer`);
  // search: Ctrl+K, Escape
  await d.search('Druck'); await p.keyboard.press('Escape'); await sleep(p, 30);
  const c = await p.evaluate(() => [document.querySelectorAll('.cmd-back.wa-geht').length, getComputedStyle(document.querySelector('.cmd-back.wa-geht > .cmd') || document.body).animationName]);
  await gone(p);
  ok(`desktop ${format}: the search leaves (panel dives), then gone`, c[0] === 1 && c[1] === 'wa-taucht' && (await ghosts(p)) === 0, JSON.stringify(c));
  await timing(p, `desktop ${format} search`);
  // B during A
  await d.sheet('einstellungen'); await p.evaluate(() => document.querySelector('.sheet [aria-label="Schließen"]').click()); await sleep(p, 50);
  await p.evaluate(() => document.querySelector('.topbar [aria-label^="Hinweise"]').click()); await sleep(p, 30);
  const g = await ghosts(p); await gone(p); await sleep(p, 1200);
  const b = await p.evaluate(() => [document.querySelectorAll('.sheet').length, document.querySelector('.sheet')?.getAttribute('aria-label'), getComputedStyle(document.querySelector('.sheet')).opacity]);
  ok(`desktop ${format}: drawer B opens while A leaves`, g === 0 && b[0] === 1 && b[1] === 'Hinweise' && b[2] === '1', JSON.stringify([g, ...b]));
  await d.closeSheet(); await sleep(p, 400); await p.evaluate(() => { window.__w.rm = []; });
  // rows: tick, timing
  const st0 = await store(p); await p.evaluate(() => document.querySelector('.panel .item[data-gehen] .check').click()); await sleep(p, 30);
  const g3 = await ghosts(p); await gone(p); const st1 = await store(p);
  ok(`desktop ${format}: a ticked task leaves, store once`, g3 === 1 && st1.done === st0.done + 1 && (await ghosts(p)) === 0, `ghost ${g3}, done ${st0.done}->${st1.done}`);
  await timing(p, `desktop ${format} row`);
  // world change while the drawer leaves
  await d.sheet('einstellungen'); await p.evaluate(() => document.querySelector('.sheet [aria-label="Schließen"]').click()); await sleep(p, 30);
  await p.evaluate(() => { location.hash = '#/material'; }); await sleep(p, 300); await gone(p);
  ok(`desktop ${format}: change of world while the drawer leaves`, (await ghosts(p)) === 0 && (await p.locator('.sheet').count()) === 0);
  // shopping entry removed on the desktop (world material)
  const sh0 = await store(p); await p.evaluate(() => document.querySelector('.panel label[data-gehen] button[aria-label$="entfernen"]').click()); await sleep(p, 30);
  const g4 = await ghosts(p); await gone(p); const sh1 = await store(p);
  ok(`desktop ${format}: a removed shopping entry leaves`, g4 === 1 && sh1.shop === sh0.shop - 1 && (await ghosts(p)) === 0, `ghost ${g4}, shop ${sh0.shop}->${sh1.shop}`);
  if (format === '2000') {   // the empty workspace on the desktop
    await d.bereich('echt'); await watch(p); await d.go('material');
    await d.sheet('einstellungen'); await p.evaluate(() => document.querySelector('.sheet [aria-label="Schließen"]').click()); await sleep(p, 30);
    const g5 = await ghosts(p); await gone(p);
    await p.locator('.panel input[placeholder^="Auf die Einkaufsliste"]').fill('Testeintrag'); await p.keyboard.press('Enter'); await sleep(p, 400);
    const e0 = await store(p); await p.evaluate(() => document.querySelector('.panel label[data-gehen] button[aria-label$="entfernen"]').click()); await sleep(p, 30);
    const g6 = await ghosts(p); await gone(p); const e1 = await store(p);
    ok('desktop 2000, echt (empty workspace): the drawer and a removed entry leave', g5 === 2 && g6 === 1 && e1.shop === e0.shop - 1 && (await ghosts(p)) === 0, `ghosts ${g5}, ${g6}; shop ${e0.shop}->${e1.shop}`);
    await timing(p, 'desktop echt');
  }
  await keepInner(p); console.log('errors desktop', format, d.errors);
  await d.close();
}
await s.close();
console.log('restarted inside ghosts (finite):', JSON.stringify([...new Set(inner)]).slice(0, 600));
console.log(`\n${res.filter((r) => r[0] === 'PASS').length} passed, ${res.filter((r) => r[0] === 'FAIL').length} failed`);
