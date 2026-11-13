// Does the template WORK? One pass of checks on the harness page (scripts/wasser/mobil.html), and - with --app - in the
// real app. Each line: ok / FAIL, what was checked, what was found. Exit code 1 when a check fails.
//
//   node scripts/wasser/pruefen.mjs [--engine chromium|webkit] [--ton klar] [--app] [--bild <out.png>]
//
//   1 start        the script starts, draws the drops, reports no error
//   2 Markierung   a tap on a tab starts the bead's flight; a class moved by script too; a second tap during a flight; a bar that was replaced
//   3 Ring         a tap on a button of a card sends one ring and it goes again; a held finger, a drag, a disabled button send none
//   4 Bausteine    every block on elements that are NOT part of the app, by its neutral class alone (the proof that a block
//                  can be put on something new): Becken with light and drops, Mulde, stilles and dichtes Wasser, Lichtlauf,
//                  Markierung, Wahl, Haken, Pegel, Feld, Perle, Bogen, Tropfen-Hinweis, Setzen
//   5 Ruhe         after the sleep time the root carries data-wa-ruht, every loop is paused, no water picture is drawn; a touch wakes all
//   6 reduziert    with reduced motion nothing runs and no light is shown
//   7 stop/start   Wasser.stop() leaves no helper, attribute or listener behind; the bead still moves by CSS; start() brings all back; options are honoured
//   8 ohne WebGL   the plain glass stays, the clock still runs
//   9 App (--app)  a light per card, the page rests behind a sheet, a toast leaves like a drop, stop() cleans up (needs npm run preview)
import { session, args, abs } from './lib.mjs';
const a = args({ engine: 'chromium', ton: '' }); const s = await session({ engine: a.engine }); let fails = 0;
const check = (ok, name, found) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(58)} ${typeof found === 'string' ? found : JSON.stringify(found)}`); };
const noErr = (h, name) => { const e = h.errors.filter((x) => !/open-meteo|Failed to load resource|ERR_|net::/i.test(x)); check(!e.length, `${name}: no page error`, e.length ? e.slice(0, 3) : 'none'); };
const centre = async (p, sel, i = 0) => { const r = await p.locator(sel).nth(i).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
const tap = async (p, sel, i = 0) => { const [x, y] = await centre(p, sel, i); await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up(); };
const flights = (p, sel = '.m-tabs') => p.evaluate((sel) => document.querySelector(sel).getAnimations({ subtree: true }).filter((an) => an.effect && an.effect.pseudoElement === '::before' && !(an instanceof CSSTransition) && !(an instanceof CSSAnimation)).length, sel);
const rings = (p) => p.evaluate(() => document.querySelectorAll('.wa-floor .wa-ring').length);
const CARD_BTN = '.m-main > .m-card .btn:not(.btn--primary):not(.btn--icon):not(.btn--ghost)';

/* 1 - 3: start, marker, ring */
{
  const h = await s.harness({ ton: a.ton, touch: true }); const p = h.page;
  const info = await p.evaluate(() => ({ ...window.Wasser.info, canvases: document.querySelectorAll('.w3-drop').length, on: document.querySelectorAll('[data-w3="on"]').length, root: document.querySelectorAll('[data-wasser]').length }));
  check(info.state === 'gl' && info.drops > 0 && info.on === info.drops, '1 the drops are drawn', { state: info.state, drops: info.drops, on: info.on, level: info.level });
  await tap(p, '.m-tabs button', 2); await p.waitForTimeout(60); check(await flights(p) === 1, '2 tap on a tab: the bead flies', await flights(p)); await p.waitForTimeout(800);
  await p.evaluate(() => { const b = document.querySelectorAll('.m-tabs button'); b[2].className = ''; b[4].className = 'on'; }); await p.waitForTimeout(40);
  check(await flights(p) === 1 && await p.evaluate(() => getComputedStyle(document.querySelector('.m-tabs')).getPropertyValue('--wa-tab').trim()) === '4', '2 class moved by script: the bead flies to child 5', await flights(p)); await p.waitForTimeout(800);
  await tap(p, '.m-tabs button', 0); await p.waitForTimeout(120); await tap(p, '.m-tabs button', 3); await p.waitForTimeout(40); check(await flights(p) === 1, '2 second tap during a flight: one flight, from where the bead is', await flights(p)); await p.waitForTimeout(1000);
  const rest = await p.evaluate(() => getComputedStyle(document.querySelector('.m-tabs'), '::before').translate + ' ' + getComputedStyle(document.querySelector('.m-tabs'), '::before').transform);
  check(await flights(p) === 0 && /matrix\(1, 0, 0, 1, 2\d\d/.test(rest), '2 the bead rests on the fourth tab', rest);
  await p.evaluate(() => { const n = document.querySelector('.m-tabs'), k = n.cloneNode(true); n.replaceWith(k); k.querySelectorAll('button').forEach((bt) => bt.addEventListener('click', () => k.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === bt)))); });
  await tap(p, '.m-tabs button', 1); await p.waitForTimeout(60); check(await flights(p) === 1, '2 a bar that was replaced: its first tap flies', await flights(p)); await p.waitForTimeout(700);

  await tap(p, CARD_BTN); await p.waitForTimeout(150); check(await rings(p) === 1, '3 tap on a card button: one ring', await rings(p));
  await p.evaluate(() => { const card = document.querySelector('.m-main > .m-card'); [...card.children].forEach((ch) => { if (ch.className === 'wa-floor') ch.remove(); else if (ch.className !== 'wa-licht') ch.replaceWith(ch.cloneNode(true)); }); }); await p.waitForTimeout(1800);
  check(await rings(p) === 0, '3 the card re-rendered meanwhile, 1.8 s later: no ring left', await rings(p));
  { const [x, y] = await centre(p, CARD_BTN); await p.mouse.move(x, y); await p.mouse.down(); await p.waitForTimeout(400); check(await rings(p) === 0, '3 finger held down: no ring yet', await rings(p)); await p.mouse.move(x, y - 40, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(150); check(await rings(p) === 0, '3 finger dragged away (40 px): no ring', await rings(p)); }
  await p.evaluate(() => { document.querySelector('.m-main > .m-card .btn--primary').disabled = true; }); await tap(p, '.m-main > .m-card .btn--primary'); await p.waitForTimeout(120); check(await rings(p) === 0, '3 disabled button: no ring', await rings(p));
  noErr(h, '1-3'); await h.close();
}

/* 4: every block by its neutral class alone, on elements the app does not have */
{
  const h = await s.harness({ ton: a.ton }); const p = h.page;
  await p.evaluate(() => {
    const main = document.querySelector('.m-main'); main.querySelectorAll(':scope > .m-card, :scope > .frei, :scope > .m-clock').forEach((el) => el.remove());
    main.insertAdjacentHTML('beforeend', `
      <section class="wa-becken" id="bk" style="padding:16px; display:flex; flex-direction:column; gap:10px">
        <b>Becken (.wa-becken)</b>
        <div class="wa-mulde wa-mulde--tipp" id="mu" style="padding:10px 14px"><b>Mulde (.wa-mulde.wa-mulde--tipp)</b><br><span class="xs muted">gedämpfter Text</span></div>
        <input class="wa-feld" id="f1" placeholder="Feld (.wa-feld)" style="width:100%; padding:10px 12px; font-size:16px">
        <div class="wa-wahl" id="w1" style="display:flex; gap:6px"><button class="on" style="padding:5px 10px; font-size:12px">Wahl</button><button style="padding:5px 10px; font-size:12px">Zwei</button><button style="padding:5px 10px; font-size:12px">Drei</button></div>
        <div style="display:flex; gap:12px; align-items:center"><button class="wa-haken" id="h1" style="width:26px; height:26px; border-radius:50%"></button><button class="wa-haken on" style="width:26px; height:26px; border-radius:50%"></button>
          <div class="wa-pegel" id="p1" style="flex:1; height:6px; border-radius:999px; overflow:hidden"><i style="display:block; height:100%; border-radius:inherit; width: 30%"></i></div>
          <button class="wa-perle" id="pe" style="width:36px; height:36px; color:#fff">×</button></div>
        <div style="display:flex; gap:8px; align-items:center"><button class="wa-tropfen" id="t1" style="padding:10px 14px; font-size:14px">Tropfen (.wa-tropfen)</button><button class="wa-tropfen wa-tropfen--rund" id="t2" style="width:40px; height:40px">+</button><span class="pill pill--on">Etikett</span></div>
      </section>
      <div style="display:flex; gap:10px"><div class="wa-wasser" id="ws" style="padding:12px 16px; flex:1"><b>stilles Wasser</b><br><span class="xs muted">.wa-wasser</span></div>
        <div class="wa-wasser--dicht wa-lichtlauf wa-setzt" id="ll" style="padding:12px 16px; flex:1; border-radius:20px; position:relative"><b>dichtes Wasser</b><br><span class="xs" style="color:var(--wa-ink-2)">.wa-lichtlauf .wa-setzt</span></div></div>
      <nav class="wa-wasser--dicht wa-markierung" id="bar2" style="--wa-bar-tabs:3; border-radius:26px; font-size:12px"><button class="on" style="padding:12px 0; color:#fff">Markierung</button><button style="padding:12px 0; color:#fff">Zwei</button><button style="padding:12px 0; color:#fff">Drei</button></nav>`);
    document.querySelectorAll('#bar2 button').forEach((bt) => bt.addEventListener('click', () => document.querySelectorAll('#bar2 button').forEach((x) => x.classList.toggle('on', x === bt))));
    document.querySelector('[data-wasser]').insertAdjacentHTML('beforeend', `
      <div class="wa-wasser--dicht wa-hinweis" id="hi" style="position:absolute; left:14px; bottom:262px; padding:10px 16px; font-size:13px; z-index:30">Tropfen-Hinweis (.wa-hinweis)</div>
      <aside class="wa-wasser--dicht wa-bogen" id="bo" style="position:absolute; left:0; right:0; bottom:0; height:190px; padding:18px; z-index:20; overflow:hidden"><b>Bogen (.wa-wasser--dicht.wa-bogen)</b><p class="xs muted" style="margin-top:6px">steigt wie eine Welle</p></aside>`);
  });
  const names = (sel, pseudo) => p.evaluate(([sel, pseudo]) => document.querySelector(sel).getAnimations({ subtree: true }).filter((an) => (pseudo ? an.effect && an.effect.pseudoElement === pseudo : !(an.effect && an.effect.pseudoElement))).map((an) => an.animationName || an.transitionProperty || 'waapi').join(','), [sel, pseudo]);
  await p.waitForTimeout(150);
  check(/wa-steigt/.test(await names('#bo')), '4 Bogen rises', await names('#bo')); check(/wa-landet/.test(await names('#hi')), '4 Tropfen-Hinweis lands', await names('#hi')); check(/wa-setzt/.test(await names('#ll')), '4 Setzen', await names('#ll'));
  await p.waitForTimeout(1500);
  const st = await p.evaluate(() => { const g = (sel, prop, ps) => getComputedStyle(document.querySelector(sel), ps || null).getPropertyValue(prop); const run = (el, re) => el.getAnimations({ subtree: true }).filter((an) => re.test(an.animationName || '') && an.playState === 'running').length; const bk = document.querySelector('#bk');
    return { helper: bk.querySelectorAll(':scope > .wa-licht > .wa-boden').length, lights: run(bk, /^wa-(licht|boden)/), lauf: run(document.querySelector('#ll'), /^wa-licht-lauf/), drops: bk.querySelectorAll('[data-w3="on"]').length, blurBk: g('#bk', 'backdrop-filter'), blurWs: g('#ws', 'backdrop-filter'), depth: g('#bk', 'content', '::after') !== 'none', mulde: g('#mu', 'box-shadow') !== 'none', feld: g('#f1', 'border-top-color'), pill: g('#bk .pill', 'box-shadow'), haken: g('#bk .wa-haken.on', 'opacity', '::before'), perle: g('#pe', 'border-radius'), rund: g('#t2', 'border-radius') }; });
  check(st.helper === 1 && st.lights === 3, '4 Becken: a light helper with three running lights', { helper: st.helper, lights: st.lights });
  check(st.lauf === 1, '4 Lichtlauf: one running light', st.lauf); check(st.drops === 2, '4 Tropfen (.wa-tropfen) on a Becken: two live drops', st.drops);
  check(/blur/.test(st.blurBk) && /blur/.test(st.blurWs) && st.depth && st.mulde, '4 Becken, stilles Wasser, Mulde: material', { becken: st.blurBk, depth: st.depth });
  check(st.pill === 'none', '4 Etikett on a Becken is flat', st.pill); check(st.haken === '1', '4 Haken, ticked: its drop is there', st.haken);
  await tap(p, '#t1'); await p.waitForTimeout(150); check(await p.evaluate(() => document.querySelectorAll('#bk .wa-floor .wa-ring').length) === 1, '4 Ring on a Becken from a .wa-tropfen', await rings(p));
  await tap(p, '#bar2 button', 2); await p.waitForTimeout(100); check(await flights(p, '#bar2') === 1, '4 Markierung: a tap, the bead flies', await flights(p, '#bar2'));
  await p.evaluate(() => { const b = document.querySelectorAll('#w1 button'); b[0].classList.remove('on'); b[2].classList.add('on'); }); await p.waitForTimeout(90); check(/waapi/.test(await names('#w1', '::before')), '4 Wahl: the bead flows over', await names('#w1', '::before'));
  await p.evaluate(() => document.querySelector('#h1').classList.add('on')); await p.waitForTimeout(60); check(/transform/.test(await names('#h1', '::before')), '4 Haken fills', await names('#h1', '::before'));
  await p.evaluate(() => { document.querySelector('#p1 i').style.width = '75%'; }); await p.waitForTimeout(90); check(/waapi/.test(await names('#p1')), '4 Pegel runs to its level', await names('#p1'));
  await p.focus('#f1'); await p.waitForTimeout(60); check(/background-size/.test(await names('#f1')), '4 Feld: the waterline runs in', await names('#f1'));
  await p.evaluate(() => document.querySelector('#hi').remove()); await p.waitForTimeout(80); check(await p.evaluate(() => document.querySelectorAll('.wa-hinweis.wa-geht').length) === 1, '4 Tropfen-Hinweis leaves as a copy', '');
  await p.waitForTimeout(900); if (a.bild) await p.screenshot({ path: abs(a.bild) });
  noErr(h, '4'); await h.close();
}

/* 5: sleep (the page starts the script with sleep: 2500) */
{
  const h = await s.harness({ ton: a.ton, query: 'schlaf=2500', settle: 900 }); const p = h.page;
  const state = () => p.evaluate(() => { const an = document.getAnimations().filter((x) => x.effect && x.effect.getComputedTiming().iterations === Infinity); return { ruht: document.querySelector('[data-wasser]').hasAttribute('data-wa-ruht'), running: an.filter((x) => x.playState === 'running').length, paused: an.filter((x) => x.playState === 'paused').length, frames: window.Wasser.info.frames }; });
  const awake = await state(); check(!awake.ruht && awake.running > 0 && awake.paused === 0, '5 awake: the loops run', awake);
  await p.waitForTimeout(5200); const s1 = await state(); await p.waitForTimeout(1200); const s2 = await state();
  check(s1.ruht && s1.running === 0 && s1.paused === awake.running && s2.frames === s1.frames, '5 after the sleep time: attribute set, all loops paused, no water picture', { ...s1, framesLater: s2.frames });
  await p.mouse.move(200, 300); await p.mouse.down(); await p.mouse.up(); await p.waitForTimeout(900); const s3 = await state();
  check(!s3.ruht && s3.paused === 0 && s3.running === awake.running && s3.frames > s2.frames, '5 one touch wakes all', s3);
  noErr(h, '5'); await h.close();
}

/* 6: reduced motion (system setting, then the app's switch) */
{
  const h = await s.harness({ ton: a.ton, reduced: true }); const p = h.page;
  const state = () => p.evaluate(() => ({ animations: document.getAnimations().filter((x) => x.playState === 'running').length, lights: [...document.querySelectorAll('.wa-licht')].filter((e) => getComputedStyle(e).display !== 'none').length, frames: window.Wasser.info.frames, drops: document.querySelectorAll('[data-w3="on"]').length }));
  const r1 = await state(); await p.waitForTimeout(1200); const r2 = await state();
  check(r1.animations === 0 && r1.lights === 0 && r1.drops > 0 && r2.frames === r1.frames, '6 reduced motion: nothing runs, no light, the drops are one still picture', r1);
  await tap(p, '.m-tabs button', 2); await p.waitForTimeout(60); check(await flights(p) === 0, '6 reduced motion: the bead jumps', await flights(p));
  await tap(p, CARD_BTN); await p.waitForTimeout(120); check(await rings(p) === 0, '6 reduced motion: no ring', await rings(p)); await h.close();
  const h2 = await s.harness({ ton: a.ton }); await h2.page.evaluate(() => { document.documentElement.dataset.motion = 'reduziert'; }); await h2.page.waitForTimeout(500);
  const m = await h2.page.evaluate(() => ({ animations: document.getAnimations().filter((x) => x.playState === 'running').length, lights: [...document.querySelectorAll('.wa-licht')].filter((e) => getComputedStyle(e).display !== 'none').length }));
  check(m.animations === 0 && m.lights === 0, '6 the app\'s switch data-motion="reduziert": the same', m); noErr(h2, '6'); await h2.close();
}

/* 7: stop, start again, options */
{
  const h = await s.harness({ ton: a.ton, touch: true }); const p = h.page;
  const left = () => p.evaluate(() => ({ canvases: document.querySelectorAll('.w3-drop').length, on: document.querySelectorAll('[data-w3]').length, lights: document.querySelectorAll('.wa-licht').length, floors: document.querySelectorAll('.wa-floor').length, ruht: document.querySelectorAll('[data-wa-ruht]').length, state: window.Wasser.info.state }));
  const first = await left(); await tap(p, CARD_BTN); await p.waitForTimeout(80);
  await p.evaluate(() => window.Wasser.stop()); await p.waitForTimeout(300); const l = await left();
  check(l.canvases + l.on + l.lights + l.floors + l.ruht === 0 && l.state === 'stopped', '7 stop(): nothing left behind', l);
  await tap(p, CARD_BTN); await p.waitForTimeout(120); check(await rings(p) === 0, '7 after stop(): a tap sends no ring', await rings(p));
  await tap(p, '.m-tabs button', 3); await p.waitForTimeout(700); check(await flights(p) === 0 && await p.evaluate(() => getComputedStyle(document.querySelector('.m-tabs')).getPropertyValue('--wa-tab').trim()) === '3', '7 after stop(): the bead still moves, by CSS alone', '');
  await p.evaluate(() => { window.Wasser.start(); window.Wasser.start(); }); await p.waitForTimeout(1500); const again = await left();
  check(JSON.stringify(again) === JSON.stringify(first), '7 start() twice: one instance, everything is back as it was', again);   // (the page has 18 buttons and 3 cards, six and one of them in the hidden close-up)
  await p.evaluate(() => window.Wasser.start({ drops: '.m-ico', light: '', ringOn: '' })); await p.waitForTimeout(1200); const opt = await left();
  check(opt.canvases === 3 && opt.lights === 0, '7 options: drops ".m-ico" only, no light', opt);
  await tap(p, CARD_BTN); await p.waitForTimeout(120); check(await rings(p) === 0, '7 options: ringOn "" switches the ring off', await rings(p));
  check(await p.evaluate(() => Object.keys(window).filter((k) => /^__w/.test(k)).length) === 0 && await p.evaluate(() => typeof window.Wasser.MOBIL.root) === 'string', '7 one global: window.Wasser', '');
  noErr(h, '7'); await h.close();
}

/* 8: without WebGL */
{
  const h = await s.harness({ ton: a.ton, query: 'fallback=1&schlaf=2000', settle: 600 }); const p = h.page;
  const f = await p.evaluate(() => ({ state: window.Wasser.info.state, on: document.querySelectorAll('[data-w3="on"]').length, glass: getComputedStyle(document.querySelector('.m-main > .m-card .btn:not(.btn--primary)')).backgroundImage !== 'none' }));
  check(/^fallback/.test(f.state) && f.on === 0 && f.glass, '8 without WebGL: plain glass buttons', f);
  await p.waitForTimeout(3200); check(await p.evaluate(() => document.querySelector('[data-wasser]').hasAttribute('data-wa-ruht')), '8 without WebGL: the clock still runs (the water rests)', '');
  noErr(h, '8'); await h.close();
}

/* 9: the real app */
if (a.app) {
  const h = await s.app({ ton: a.ton }); const p = h.page;
  await h.go('#/heute', 1500); const c = await p.evaluate(() => ({ cards: document.querySelectorAll('.m-main > .glass.m-card').length, lights: document.querySelectorAll('.m-main > .glass.m-card > .wa-licht').length, drops: document.querySelectorAll('[data-w3="on"]').length, state: window.Wasser.info.state }));
  check(c.cards > 0 && c.lights === c.cards && c.drops > 0, '9 app: a light helper in every card, drops drawn', c);
  await h.sheet('einstellungen'); await p.waitForTimeout(900);
  const b = await p.evaluate(() => ({ page: getComputedStyle(document.querySelector('.m-main')).getPropertyValue('--wa-lauf').trim(), sheet: getComputedStyle(document.querySelector('.sheet')).getPropertyValue('--wa-lauf').trim(), sheetLight: document.querySelectorAll('.sheet > .wa-licht').length, dropsOnSheet: document.querySelectorAll('.sheet [data-w3="on"]').length }));
  check(b.page === 'paused' && b.sheet === 'running' && b.sheetLight === 1 && b.dropsOnSheet > 0, '9 app: behind a sheet the page rests, the sheet lives', b);
  await p.locator('.sheet__body').evaluate((e) => new Promise((ok) => { const t0 = performance.now(); const f = (now) => { e.scrollTop += 22; if (now - t0 < 420) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); })); const pull = await p.evaluate(() => document.querySelectorAll('[data-wa-zieht]').length); await p.waitForTimeout(700);
  check(pull >= 1 && await p.evaluate(() => document.querySelectorAll('[data-wa-zieht]').length) === 0, '9 app: scrolling the sheet pulls its light, and lets go', pull);
  await h.closeSheet(); await h.sheet('toast'); await p.waitForTimeout(300);
  check(await p.evaluate(() => { const t = document.querySelector('.toast'); return !!t && Math.abs(t.getBoundingClientRect().left + t.getBoundingClientRect().right - innerWidth) < 2; }), '9 app: a toast, centred', '');
  await p.locator('.toast__undo').click(); await p.waitForTimeout(700);
  await p.evaluate(() => window.Wasser.stop()); const l = await p.evaluate(() => document.querySelectorAll('.w3-drop, .wa-licht, .wa-floor, [data-w3], [data-wa-ruht], .wa-geht').length);
  check(l === 0, '9 app: stop() leaves nothing behind', l); noErr(h, '9'); await h.close();
}
await s.close(); console.log(fails ? `\n${fails} check(s) FAILED` : '\nall checks passed'); process.exit(fails ? 1 : 0);
