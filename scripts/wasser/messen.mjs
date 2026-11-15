// Motion in numbers. Two measurements:
//
//   node scripts/wasser/messen.mjs ruhe [--ton klar] [--scene start] [--engine chromium|webkit] [--look vorlage|<folder>]
//       (the harness page shows the TEMPLATE; --look auto and eingebaut mean the template there)
//       ALIVE BUT CALM (harness page, phone view @2x): three stills at rest - now, one second later, four seconds later.
//       Per surface (the cards, the tab bar; the drop canvases are left out): how many pixels changed, how many by 4 of 255
//       or more, the mean change and the largest. And the glyph pixels of six kinds of text (painted magenta once to find
//       them): text must never change by 4 or more. (It does change by 1 to 3 of 255 where its ink is see-through or a
//       light passes under it - with a mask of ALL text about 3 % of the glyph pixels within a second; nothing the eye sees.)
//
//   node scripts/wasser/messen.mjs takt [--seite app|mobil] [--hash '#/start'] [--scale 3] [--engine chromium|webkit] [--ton klar] [--look auto|eingebaut|vorlage|<folder>|ohne] [--css '<rules>'] [--mal 1]
//       THE PACE OF THE PAGE: frames a second the page gets, COUPLED to the compositor (a 2 px layer outside every sheet is
//       moved in every frame, so each frame has to wait for the compositor - a page that commits nothing runs its frames
//       freely and hides a compositor that crawls), and water pictures a second. With a look three times: as it is,
//       with the loops at rest paused (--wa-lauf: paused), and without drops (lights only). --css adds one more: the page
//       with those rules laid over it (what does a change buy? e.g. --css '[data-wasser] .m-tabs { backdrop-filter: none }');
//       --mal 3 measures "as it is" and the --css variant three times in turn (single runs of 3 s scatter by a few frames).
//       The work machine renders in software: only the relations between the numbers mean something.
//       --look: head of lib.mjs. Default auto = the look the app has built in (--seite mobil: the template); ohne = the app
//       with its look taken out.
import { session, rgb, args, outDir, lookArg, sayLook, fail, ENGINES, SZENEN } from './lib.mjs';
const a = args({ ton: '', scene: 'start', engine: 'chromium', look: 'auto', seite: 'app', hash: '#/start', scale: '3', out: '', css: '', mal: '1' }, { choices: { engine: ENGINES, ton: ['dunkel', 'klar'], scene: SZENEN, seite: ['app', 'mobil'] } });
const what = a._[0]; if (!['ruhe', 'takt'].includes(what) || a._.length > 1) fail('usage: node scripts/wasser/messen.mjs ruhe|takt [options]  (see the head of this file)', 1);
{ const FOR = { ruhe: ['ton', 'scene', 'engine', 'look', 'out'], takt: ['ton', 'scene', 'engine', 'look', 'seite', 'hash', 'scale', 'css', 'mal'] };   // an option the other mode reads ends the tool too (it would be ignored without a word)
  for (const k of process.argv.slice(2).filter((x) => x.startsWith('--')).map((x) => x.slice(2).split('=')[0])) if (!FOR[what].includes(k)) fail(`--${k} has no effect in "${what}". "${what}" takes: ${FOR[what].map((x) => '--' + x).join(' ')}`); }
const onHarness = what === 'ruhe' || a.seite === 'mobil'; const look = lookArg(a.look, { harness: onHarness }); const s = await session({ engine: a.engine }); const od = outDir(a.out, 'messen'), out = od.dir;   // (--out <dir> keeps the stills of "ruhe")

if (what === 'ruhe') {
  const h = await s.harness({ look, ton: a.ton, scene: a.scene, touch: true, settle: 3200 }); const p = h.page; const shot = async (n) => { await p.screenshot({ path: `${out}/${n}.png` }); return rgb(`${out}/${n}.png`); };
  // one pass: three stills at rest and what changed between them. The page is longer than a phone, so a kind of text that is
  // not in view (the number tiles of the second card) is measured in a second pass with the list rolled to its end.
  const pass = async (rolled, only) => { const missing = [];
    const t0 = Date.now(); const A = await shot('a'); await p.waitForTimeout(Math.max(0, 1000 - (Date.now() - t0))); const tb = (Date.now() - t0) / 1000; const B = await shot('b');
    await p.waitForTimeout(Math.max(0, 4000 - (Date.now() - t0))); const tc = (Date.now() - t0) / 1000; const C = await shot('c');
    const reg = await p.evaluate((only) => {
      const r = (e) => { const q = e.getBoundingClientRect(); return [q.left, q.top, q.right, q.bottom].map((v) => Math.round(v * 2)); }; const vis = (e) => e.getClientRects().length > 0;
      const all = { 'row title': '.m-main > .m-card .m-row b', 'small muted line in a row': '.m-main > .m-card .m-row .xs.muted', 'card title': '.m-main > .m-card h3', 'count in the title row': '.m-main > .m-card h3 .cnt', 'caption of a number tile': '.m-main > .m-card .m-stat span', 'label of an inactive tab': '.m-tabs button:not(.on) span' };
      const seen = (e) => { const q = e.getBoundingClientRect(); return vis(e) && (!!e.closest('.m-tabs') || (q.top >= 0 && q.bottom <= document.querySelector('.m-tabs').getBoundingClientRect().top)); };   // (in the picture, above the tab bar: the page is longer than a phone)
      const texts = Object.fromEntries(Object.entries(all).filter(([k]) => !only || only.includes(k)));
      const t = {}; for (const [k, sel] of Object.entries(texts)) { const e = [...document.querySelectorAll(sel)].filter(seen)[0]; if (e) { e.setAttribute('data-bw', '1'); t[k] = r(e); } else t[k] = null; }
      return { cards: [...document.querySelectorAll('.m-main > .glass.m-card')].filter(vis).map(r), bar: [r(document.querySelector('.m-tabs'))], drops: [...document.querySelectorAll('.w3-drop')].filter(vis).map(r), texts: t, running: document.getAnimations().filter((x) => x.playState === 'running').length };
    }, only);
    // glyph mask: the same texts in magenta, nothing else touched
    const mask = await p.addStyleTag({ content: '[data-bw]{-webkit-text-fill-color:#f0f!important;color:#f0f!important;text-shadow:none!important}[data-bw] .ico,[data-bw] .btn,[data-bw] .w3-drop{visibility:hidden!important}' }); await p.waitForTimeout(250); const M = await shot('mask');
    const W = A.w, inDrop = new Uint8Array(A.w * A.h); for (const [l, t, r, b] of reg.drops) for (let y = Math.max(0, t); y < Math.min(A.h, b); y++) inDrop.fill(1, y * W + Math.max(0, l), y * W + Math.min(W, r));
    const d = (X, i) => Math.max(Math.abs(X.data[i * 3] - A.data[i * 3]), Math.abs(X.data[i * 3 + 1] - A.data[i * 3 + 1]), Math.abs(X.data[i * 3 + 2] - A.data[i * 3 + 2]));
    const count = (X, boxes, glyph) => { let n = 0, ch = 0, ch4 = 0, sum = 0, max = 0; for (const [l, t, r, b] of boxes) for (let y = Math.max(0, t); y < Math.min(A.h, b); y++) for (let x = Math.max(0, l); x < Math.min(W, r); x++) { const i = y * W + x; if (inDrop[i]) continue; if (glyph && !(M.data[i * 3] > 200 && M.data[i * 3 + 1] < 90 && M.data[i * 3 + 2] > 200)) continue; n++; const v = d(X, i); if (v) { ch++; sum += v; if (v >= 4) ch4++; if (v > max) max = v; } } return { n, ch, ch4, sum, max }; };
    const pc = (x, n) => (n ? (100 * x / n).toFixed(1) + ' %' : '-');
    console.log(`alive but calm${rolled ? ', THE LIST ROLLED TO ITS END' : ''}: ${look || 'no look'}, ton ${a.ton || 'dunkel'}, scene ${a.scene}, ${a.engine}; ${reg.running} animations running; stills ${tb.toFixed(1)} s and ${tc.toFixed(1)} s after the first`);
    for (const [name, boxes] of [['cards', reg.cards], ['tab bar', reg.bar]]) { const b1 = count(B, boxes), c1 = count(C, boxes);
      console.log(`${name.padEnd(8)} outside the drops: after 1 s ${pc(b1.ch, b1.n)} of the pixels changed (${pc(b1.ch4, b1.n)} by 4 or more), mean ${(b1.sum / b1.n).toFixed(2)}, largest ${b1.max}   |   after 4 s ${pc(c1.ch, c1.n)} (${pc(c1.ch4, c1.n)} by 4 or more), largest ${c1.max}`); }
    for (const [name, box] of Object.entries(reg.texts)) { if (!box) { missing.push(name); continue; } const b1 = count(B, [box], true), c1 = count(C, [box], true); console.log(`glyph pixels, ${name.padEnd(26)} ${String(b1.n).padStart(5)} px: changed after 1 s ${b1.ch} (largest ${b1.max}), after 4 s ${c1.ch} (largest ${c1.max})`); }
    await mask.evaluate((n) => n.remove()); await p.evaluate(() => document.querySelectorAll('[data-bw]').forEach((e) => e.removeAttribute('data-bw'))); return missing;
  };
  let missing = await pass(false, null);
  if (missing.length) { await p.locator('.m-main').evaluate((e) => { e.scrollTop = 99999; }); await p.waitForTimeout(3200); missing = await pass(true, missing); }
  for (const name of missing) console.log(`glyph pixels, ${name.padEnd(26)} NOT FOUND on this page`);
  await h.close();
} else if (what === 'takt') {
  const h = a.seite === 'mobil' ? await s.harness({ look, ton: a.ton, scene: a.scene, touch: true, scale: +a.scale }) : await s.app({ look, ton: a.ton, scale: +a.scale }); const p = h.page; if (a.seite !== 'mobil') { sayLook(h); await h.go(a.hash, 2500); }
  const withLook = a.seite === 'mobil' ? !!look : h.look.mode !== 'ohne';   // (a look runs on this page: built in, injected or replaced)
  const meas = (ms) => p.evaluate((ms) => new Promise((ok) => { const t0 = performance.now(); let frames = 0; const f = () => { frames++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else ok(+(frames / (ms / 1000)).toFixed(1)); }; requestAnimationFrame(f); }), ms);
  const tinyOn = () => { const d = document.createElement('i'); d.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;will-change:transform;pointer-events:none;z-index:99'; document.body.appendChild(d); let k = 0; window.__tiny = true; const f = () => { if (!window.__tiny) { d.remove(); return; } d.style.transform = 'translateX(' + (k = 1 - k) + 'px)'; requestAnimationFrame(f); }; requestAnimationFrame(f); };
  const frames = () => p.evaluate(() => (window.Wasser ? window.Wasser.info.frames || 0 : window.__w3 ? window.__w3.frames || 0 : 0));
  const run = async (name, css) => {
    const tag = css ? await p.addStyleTag({ content: css }) : null; await p.evaluate(tinyOn); await p.mouse.move(3, 420); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(1500);
    const f0 = await frames(); const fps = await meas(3000); const f1 = await frames();
    await p.evaluate(() => { window.__tiny = false; }); if (tag) await tag.evaluate((n) => n.remove()); await p.waitForTimeout(200);
    return `${name}: ${fps} (${((f1 - f0) / 3).toFixed(1)} water pictures)`;
  };
  const res = [await run('as it is', '')];
  if (a.css) { for (let i = 0; i < +(a.mal || 1); i++) { res.push(await run('with --css', a.css)); if (i + 1 < +(a.mal || 1)) res.push(await run('as it is', '')); } }
  if (withLook && !a.css) { res.push(await run('lights paused', '[data-wasser], [data-wasser] * { --wa-lauf: paused !important; }')); await p.evaluate(() => window.Wasser.start({ drops: '' })); await p.waitForTimeout(600); res.push(await run('no drops, lights only', '')); }
  console.log(`${a.engine} @${a.scale}x, ${a.seite === 'mobil' ? (look || 'no look') : h.look.mode}, ${a.seite === 'mobil' ? 'harness ' + a.scene : a.hash}${a.ton ? ', ton ' + a.ton : ''} | frames a second, coupled | ${res.join(' | ')}`);
  await h.close();
}
await s.close(); od.keep(false);
