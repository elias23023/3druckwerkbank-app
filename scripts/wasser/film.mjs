// Motion as pictures: filmstrips from the REAL app at phone size (390 x 844 @2x) - each motion as five to seven stills at
// fixed times, side by side, the time under each still. Motion cannot be judged from one still.
//
//   node scripts/wasser/film.mjs <out-dir> [--look vorlage|<folder>] [--engine chromium|webkit] [--ton klar] [--nur ruhe,tab,...] [--reduced] [--fest]
//
//   ruhe    a screen at rest over 4 s (real time), with the amplified difference to the first still below
//   tab     the marker flows to another tab, the cards of the new screen arrive, their light swings into place
//   druck   a button on a card is held and let go: flare under the drop, then one ring over the floor of the card
//   scroll  a long list is scrolled and let go: the light at the rims leans and swings back
//   bogen   a bottom sheet rises and settles
//   haken   a check is ticked (drop fills, ring), then an entry is removed and the toast lands
// Animations with an end (transitions, entrances, the ring, the marker's flight) are paused and set to the time under
// the still, so a slow test machine does not matter; the drops (WebGL) and the loops at rest keep running in real time.
// --fest makes two runs comparable (vergleich.mjs film uses it): the loops at rest stand at one fixed place, every light
// starts at the same place of its loop, and what runs in real time beside the animations (the app's own timers, the first
// water picture of new drops) gets 400 ms to finish before the stills. --reduced: the strips with reduced motion (a
// proof of stillness).
// Writes <out>/<name>.png (the strip), <out>/<name>-<n>.png (its stills) and returns / prints which animations it found.
// Needs the app's preview (npm run build && npm run preview).
import fs from 'fs'; import { fileURLToPath } from 'url';
import { session, strip, args, mkdir, abs } from './lib.mjs';
export const STRIPS = ['ruhe', 'tab', 'druck', 'scroll', 'bogen', 'haken'];

export async function film(s, out, { look = 'vorlage', ton = '', reduced = false, fest = false, nur = STRIPS, zeit = '2026-11-12T17:42:00+01:00', strips = true } = {}) {
  mkdir(out); const app = await s.app({ look, ton, reduced, zeit }); const p = app.page; const found = {}; const frames = {}; const boxes = {};
  await p.evaluate(() => { const st = window.setTimeout; window.setTimeout = (f, t, ...a) => (t === 1700 ? 0 : st(f, t, ...a)); });   // the ring's own clean-up timer (RING_LIFE) would remove it while we look at it
  const T = ton === 'klar' ? ' (Ton klar)' : ''; let cur = '', n = 0;
  const begin = (name) => { cur = name; n = 0; frames[name] = []; boxes[name] = []; };
  const shot = async (label, clip) => { const file = `${out}/${cur}-${n++}.png`; await p.screenshot(clip ? { path: file, clip } : { path: file }); frames[cur].push({ file, label }); boxes[cur].push(await app.drops({ pad: 60, all: true, clip })); return file; };   // (the boxes: generous - a drop under a blurred toast or behind a blurred scrim is spread by that blur, 18 px and three times as far)
  if (fest) await p.addStyleTag({ content: '.wa-licht { --wa-phase: 0 !important; }' });   // every light at the same place of its loop (the script hands the places out in the order the sheets appear)
  // the loops at rest, stopped at one fixed place (--fest)
  const freeze = () => (fest ? p.evaluate(() => { for (const a of document.getAnimations()) if (a.effect && a.effect.getComputedTiming().iterations === Infinity) { try { a.pause(); a.currentTime = 4000; } catch (e) {} } }) : null);
  // animations with an end that are running right now
  const grab = async (filter = '') => { const names = await p.evaluate((filter) => {
    window.__probe = document.getAnimations().filter((a) => (a.playState === 'running' || a.pending) && a.effect && a.effect.getComputedTiming().iterations !== Infinity && (!filter || new RegExp(filter).test(a.transitionProperty || a.animationName || 'waapi')));
    return [...new Set(window.__probe.map((a) => ((a.effect && a.effect.pseudoElement) || '') + ':' + (a.animationName || a.transitionProperty || 'waapi')))].sort().join('  ');
  }, filter); found[cur] = (found[cur] ? found[cur] + ' | ' : '') + (names || '(no animation)'); await p.evaluate(() => (window.__probe || []).forEach((a) => { try { a.pause(); } catch (e) {} })); await freeze(); if (fest) await p.waitForTimeout(400); return names; };
  const seek = async (t) => { await p.evaluate((t) => { (window.__probe || []).forEach((a) => { try { a.pause(); a.currentTime = t; } catch (e) {} }); }, t); await p.waitForTimeout(90); };
  const finish = async () => { await p.evaluate(() => { (window.__probe || []).forEach((a) => { try { a.finish(); } catch (e) {} }); window.__probe = []; }); await p.waitForTimeout(200); };
  const detail = (x, y, h, label) => ({ x: Math.max(0, Math.min(780 - 624, Math.round(x * 2))), y: Math.max(0, Math.round(y * 2)), w: 624, h: Math.round(h * 2), factor: 0.75, label });   // 312 px of the screen, as wide as a still of the strip
  const tapNow = (loc) => loc.first().dispatchEvent('click');
  const title = (normal, what) => (reduced ? `Bewegung „Reduziert“ – ${what}: nichts bewegt sich, Zustände wechseln sofort` : normal) + T;
  const make = (name, t, note, opt = {}) => (strips ? strip(frames[name], `${out}/${name}.png`, { title: t, note, scale: 0.6, ...opt }) : null);
  const on = (name) => nur.includes(name);

  if (on('ruhe')) {
    begin('ruhe'); await app.go('#/start', 2600); await freeze();
    let t = 0; for (const at of [0, 1000, 2000, 3000, 4000]) { await p.waitForTimeout(Math.max(0, at - t)); const t0 = Date.now(); await shot(`${at / 1000} s`); t = at + (Date.now() - t0); }
    found.ruhe = await p.evaluate(() => [...new Set(document.getAnimations().filter((a) => a.effect && a.effect.getComputedTiming().iterations === Infinity).map((a) => ((a.effect.pseudoElement) || '') + ':' + (a.animationName || 'waapi')))].sort().join('  ') || '(no animation)');
    await make('ruhe', title('In Ruhe: das Licht wandert am Rand der Becken und der Leiste, die Tropfen fließen', 'in Ruhe'), 'Fünf Bilder im Abstand von einer Sekunde. Darunter, was sich gegenüber dem ersten Bild verändert hat.', { diffGain: 10 });
  }
  if (on('tab')) {
    begin('tab'); await app.go('#/start', 2000); await freeze(); await shot('vorher');   // (2 s: the light of the cards of a new screen has swung into place, --wa-t-swing)
    await tapNow(p.locator('.m-tabs button').nth(2)); await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))); await grab();   // (three frames: the light of the new cards is let go two frames after they appear, and its swing is a transition - "Schwappen")
    for (const t of [80, 200, 350, 550, 1000]) { await seek(t); await shot(`${t} ms`); }
    await finish();
    const tb = await p.locator('.m-tabs').boundingBox(); const c0 = await p.locator('.m-main > .glass.m-card').first().boundingBox();
    await make('tab', title('Reiter gewechselt: die Perle fließt hinüber, die Karten kommen an, ihr Licht schwingt sich ein', 'Reiter gewechselt'), 'Zeit nach dem Tippen auf „Projekte“.',
      { details: [detail(c0.x, c0.y - 6, 60, 'Oberer Rand der neuen Karte: das Licht kommt tief an und schwingt in seine Ruhelage'), detail(tb.x, tb.y - 6, 74, 'Die Leiste: die Perle streckt sich, fließt, setzt sich')] });
  }
  if (on('druck')) {
    // the ring starts when the finger lets go: the button is held for 260 ms, then released in place; the click that would
    // follow is swallowed, so no sheet opens over the card
    begin('druck'); await app.project(); await p.waitForTimeout(1500); await freeze();
    const btn = p.locator('.m-main .m-card .btn:not(.btn--ghost):not(.btn--primary)').first(); const r = await btn.boundingBox(); await shot('vorher');
    await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await p.waitForTimeout(260); await shot('gedrückt');
    await p.evaluate(() => window.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); }, { capture: true, once: true })); await p.mouse.up(); await grab();
    for (const t of [120, 300, 550, 850]) { await seek(t); await shot(`${t} ms`); }
    await finish(); await p.mouse.move(5, 300);
    await make('druck', title('Knopf auf einer Karte angetippt: der Tropfen gibt sofort nach, sein Lichtfleck flammt auf; beim Loslassen läuft ein Ring über den Beckenboden', 'Knopf angetippt'), 'Zweites Bild: der Finger liegt auf dem Knopf. Danach die Zeit seit dem Loslassen.', { details: [detail(r.x - 40, r.y - 95, 210, 'Ausschnitt um den Knopf')] });
  }
  if (on('scroll')) {
    begin('scroll'); await app.go('#/heute', 1500);
    // scroll so far that the seam between the first two cards lies in the middle of the screen
    const A = await p.evaluate(() => { const m = document.querySelector('.m-main'), c = m.querySelectorAll(':scope > .glass.m-card'); m.scrollTop = Math.max(0, c[0].getBoundingClientRect().bottom - 430); return m.scrollTop; }); await p.waitForTimeout(2200);
    await freeze(); await shot('in Ruhe');
    await p.evaluate(() => { document.querySelector('.m-main').scrollTop -= 500; }); await p.waitForTimeout(1900);
    await p.evaluate((A) => new Promise((ok) => { const m = document.querySelector('.m-main'), a = m.scrollTop, t0 = performance.now(); const f = (now) => { const k = Math.min(1, (now - t0) / 380); m.scrollTop = a + (A - a) * k; if (k < 1) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); }), A);
    await p.waitForFunction(() => !document.querySelector('[data-wa-zieht]'), null, { timeout: 4000 }).catch(() => {}); await grab('^(scale|translate)$');
    for (const t of [0, 200, 400, 800, 1200, 1600]) { await seek(t); await shot(t ? `${t} ms` : 'losgelassen'); }   // the swing takes --wa-t-swing, 1.6 s
    await finish();
    // the seam between two cards that is in view: the far (bottom) rim of the upper card and the lit (top) rim of the lower one
    const [bot, top, left, width] = await p.evaluate(() => { const c = [...document.querySelectorAll('.m-main > .glass.m-card')].map((e) => e.getBoundingClientRect()); for (let i = 0; i + 1 < c.length; i++) if (c[i].bottom > 120 && c[i + 1].top < 640) return [c[i].bottom, c[i + 1].top, c[i].left, c[i].width]; return [300, 320, 14, 362]; });
    await make('scroll', title('Liste gerollt und losgelassen: das Licht am Rand neigt sich wie Wasser in einer getragenen Schale und schwingt zurück', 'Liste gerollt'), 'Erstes Bild in Ruhe, dann der Moment des Loslassens (die Liste lief nach oben) und die Zeit danach.',
      { details: [detail(left, top - 4, 54, 'Oberer Rand der unteren Karte: sein Licht reicht tiefer und schwingt zurück'), detail(left + width - 312, bot - 50, 54, 'Unterer Rand der oberen Karte: sein Licht zieht sich zurück und kommt wieder')], diffGain: 8 });
  }
  if (on('bogen')) {
    begin('bogen'); await app.go('#/projekte', 2000); await freeze(); await shot('vorher');
    await tapNow(p.locator('.m-main .btn', { hasText: 'Neues Projekt' })); await grab();
    for (const t of [80, 200, 400, 620, 1100]) { await seek(t); await shot(`${t} ms`); }
    await finish(); await app.closeSheet();
    await make('bogen', title('Ein Bogen steigt wie eine weiche Welle und setzt sich, ein Lichtkamm läuft über seine Oberkante', 'Bogen geöffnet'), 'Zeit nach dem Tippen auf „Neues Projekt“.');
  }
  if (on('haken')) {
    begin('haken'); await app.go('#/material', 1200); await p.locator('.m-main').evaluate((e) => { e.scrollTop = 99999; }); await p.waitForTimeout(1200); await freeze();
    const clip = { x: 0, y: 360, width: 390, height: 484 }; await shot('vorher', clip);
    const chk = p.locator('.m-main .m-shop .check').first(); const r = await chk.boundingBox();
    await p.mouse.move(r.x + r.width / 2, r.y + r.height / 2); await p.mouse.down(); await p.mouse.up(); await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await grab();
    for (const t of [150, 400, 800]) { await seek(t); await shot(`${t} ms`, clip); }
    await finish(); await p.waitForTimeout(300);
    await tapNow(p.locator('.m-main .m-shop .btn--icon').last()); await grab();
    for (const t of [180, 620]) { await seek(t); await shot(`entfernt + ${t} ms`, clip); }
    await finish();
    await make('haken', title('Haken gesetzt: ein Tropfen füllt den Kreis, ein grüner Ring läuft über das Becken. Eintrag entfernt: der Hinweis landet wie ein Tropfen', 'Haken gesetzt, Eintrag entfernt'), 'Einkaufsliste. Zeit nach dem Tippen auf den Haken, dann nach dem Tippen auf den Papierkorb.', { scale: 0.8 });
  }
  const errors = app.errors.filter((e) => !/open-meteo|Failed to load resource|ERR_|net::/i.test(e)); await app.close();
  return { frames, boxes, found, errors };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = args({ look: 'vorlage', engine: 'chromium', ton: '', nur: STRIPS.join(',') }); if (!a._[0]) { console.log('usage: node scripts/wasser/film.mjs <out-dir> [--look vorlage|<folder>] [--engine chromium|webkit] [--ton klar] [--nur ruhe,tab,druck,scroll,bogen,haken] [--reduced] [--fest]'); process.exit(1); }
  const s = await session({ engine: a.engine }); const out = abs(a._[0]);
  const r = await film(s, out, { look: a.look, ton: a.ton, reduced: !!a.reduced, fest: !!a.fest, nur: a.nur.split(',') });
  for (const [name, f] of Object.entries(r.found)) console.log(name.padEnd(7), f);
  if (r.errors.length) console.log('errors', r.errors.slice(0, 4));
  fs.writeFileSync(`${out}/film.txt`, Object.entries(r.found).map(([n, f]) => `${n}: ${f}`).join('\n') + '\n');
  await s.close(); console.log('ok', out);
}
