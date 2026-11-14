// Is the template still the look the owner approved? Renders the reference (an earlier state of the look, injected under
// .m-shell: docs/wasser-look/entwurf/nachgebessert) and the template (docs/wasser-look/vorlage) side by side and compares.
// Run it after EVERY change to the template that is not meant to change the look.
//
//   node scripts/wasser/vergleich.mjs [bilder|app|stile|film|alles] [--engine chromium|webkit] [--toene dunkel,klar] [--alt <folder>] [--neu <folder|vorlage>] [--out <dir>] [--nur <name part>]
//   (--look <folder> is the same as --neu <folder>: the name every other tool has for "another copy of the template")
//
// TWO LOOKS IN ONE APP is what this tool compares (--alt against --neu; each a folder, 'vorlage', 'git:<rev>', or 'eingebaut'
// = the look the app has built in). In the real app each side takes the PLACE of the built-in look (head of lib.mjs), so the
// parts app, stile and film work against an app with the look built in. TWO STATES OF THE APP (two addresses, two commits)
// are compared by sollist.mjs.
//
//   bilder   the harness page with reduced motion (frozen water): all eight scenes and their close-ups, both tones.
//            Pixel by pixel; counted apart: inside the boxes of the drop canvases, and everywhere else.
//   app      the same for the REAL app (preview on :4173, clock standing still): main screens, a project, sheets, search, toast.
//   stile    the computed style of EVERY element, ::before, ::after and ::placeholder (all properties, and the look's
//            custom properties) on the harness page and in the app; with motion, with reduced motion and with the app's
//            switch data-motion="reduziert"; and - Chromium only - of everything that can be tapped or focused while it
//            is pressed and while it has the keyboard focus. Finds what no picture shows (a rule that lost its weight).
//   film     with motion: the filmstrips of film.mjs (tab change, press and ring, scrolling, a sheet, a check and the toast,
//            rest) for both, every animation with an end set to the same times and the loops at rest stopped at the same
//            place. Compares which animations ran and the stills pixel by pixel outside the drops (the water in the drops
//            runs in real time). The strip "scroll" depends on real frame times: small differences there are no defect.
//   alles    all four (default).
// Prints one line per comparison and a summary; exit code 1 when something differs that is not listed in KNOWN below.
// ok = no pixel differs; ok* = pixels differ INSIDE the drop canvases only (never a DIFF: the water lives; and see KNOWN,
// point 4); ok~ = a difference that is known and explained (the strip "scroll"; changed drops of "klar" behind a blur).
// Pictures of what differs: <out>/*-diff.png (red = outside the drops, yellow = inside). Default out: scratch folder in the OS temp dir.
import fs from 'fs'; import os from 'os'; import path from 'path';
import { session, diff, strip, args, mkdir, abs, lookDir, isTemplate, lookArg, sayLook, fail, TOENE, ENGINES, ALT, SZENEN } from './lib.mjs';
import { film, STRIPS } from './film.mjs';
const a = args({ engine: 'chromium', toene: 'dunkel,klar', alt: ALT, neu: 'vorlage', look: '', out: path.join(os.tmpdir(), 'wasser-vergleich'), nur: '' }, { choices: { engine: ENGINES, toene: TOENE } }); if (a.look) a.neu = a.look;
const MODES = ['bilder', 'app', 'stile', 'film', 'alles']; if (a._.length > 1 || (a._[0] && !MODES.includes(a._[0]))) fail(`"${a._.join(' ')}": one of ${MODES.join(' | ')} (nothing = alles)`);
for (const k of ['alt', 'neu']) { a[k] = lookArg(a[k]); if (!a[k] || a[k] === 'auto') fail(`--${k}: a folder, vorlage, git:<revision> or eingebaut`); }
const dirOf = (l) => lookDir(l === 'eingebaut' ? 'vorlage' : l);   // (the files of a look: what is built in are the copies of the template)
const mode = a._[0] || 'alles'; const out = mkdir(abs(a.out)); const TONES = a.toene.split(','); const ZEIT = '2026-11-12T17:42:00+01:00';
const only = (name) => !a.nur || name.includes(a.nur);
const s = await session({ engine: a.engine }); let bad = 0; const lines = []; const say = (t) => { console.log(t); lines.push(t); };

// Deliberate differences between the reference and the template (everything else must be equal):
// 1. two tokens were renamed (--w3-pad, --w3-halo);
// 2. the transitions of the plain glass and of ghost buttons take the look's own --wa-t-fast (0.14 s) instead of the app's
//    --t-fast (0.18 s);
// 3. with no motion wanted every trough says "transition: none" (before: only rows) - where the time is 0 s on both sides
//    there is no transition either way, only the keyword differs (all / none).
// 4. since 14.11. (the corrections after the two checkers; NOTIZEN.md, section 9):
//    - the pull of scrolling is bounded: --wa-zug-weit and --wa-zug-boden are min() expressions (the same lengths at
//      --wa-leben 1), the lean is a clamp() (the same value);
//    - the light of a new sheet swings into place by the transition of the pull instead of a second keyframe animation:
//      the three lights of a helper have one animation less (and the strip "tab" shows transitions where the reference
//      shows the animations wa-schwappt-*; the pictures at the same moments are the same);
//    - the tone token --wa-drop-veil: 1 in "dunkel" (as before), .3 in "klar" - there the drops on cards gather less light,
//      so the pictures of "klar" differ INSIDE those drops (counted apart, never a DIFF) and nowhere else.
// Not a style: the drawing size of a drop's canvas (it follows the governor of the drops, which differs from run to run).
// To check a change of YOUR OWN against the template as it was: --alt git:HEAD (the committed template), or --alt <a copy of
// the folder made before the change>.
const RENAMED = { '--w3-pad': '--wa-drop-pad', '--w3-halo': '--wa-drop-halo' };
const SINCE_1411 = new Set(['--wa-zug-weit', '--wa-zug-boden', '--wa-drop-veil']);   // (these three are left out of the comparison altogether: custom properties are inherited, so EVERY element would differ in them)
const KNOWN = (prop, x, y, key) => (prop === 'transition-duration' && /^0\.18s(, 0\.18s)*$/.test(x[prop] || '') && y[prop] === x[prop].replace(/0\.18s/g, '0.14s'))
  || (prop === 'transition-property' && x['transition-duration'] === '0s' && y['transition-duration'] === '0s')
  || (prop === 'aspect-ratio' && /canvas:\d+\|/.test(key))
  || ((/^animation/.test(prop) || prop === '--wa-schwappt-oben') && /\|wa-(licht|boden)$/.test(key))   // (--wa-schwappt-oben: the helper of a bottom sheet says "no arrival" with this token; before, its animation list left the arrival out)
  || (prop === 'translate' && /\|wa-boden$/.test(key) && /%$/.test(x.width || ''));   // (a floor light that is NOT RENDERED - a card inside display: none, its width is still a percentage: the reference's arrival animation never starts there and stands at its first keyframe)
// the strip "tab": the arrival of the light is named differently on the two sides (see 4.)
const sameMotion = (ref, neu) => { const set = (t) => [...new Set(t.replace(/::before:wa-schwappt-oben/g, '::before:scale').replace(/::after:wa-schwappt-unten/g, '::after:scale').replace(/:wa-schwappt-boden/g, ':translate').split(/\s+\|\s+|\s\s+/).map((v) => v.trim()).filter(Boolean))].sort().join('  '); return set(ref) === set(neu); };

/* ------------------------------------------------------------------ pictures */
async function pair(name, open, steps) {                           // open(look) -> handle; steps = [[label, async (h) => {}], ...]: one screenshot after each step
  const hs = []; for (const look of [a.alt, a.neu]) hs.push(await open(look)); hs.forEach(sayLook);
  for (const [label, fn] of steps) {
    const files = [], boxes = [];
    for (let i = 0; i < 2; i++) { try { await fn(hs[i]); } catch (e) { say(`!! ${name} ${label}: ${String(e).split('\n')[0].slice(0, 140)}`); } files.push(`${out}/${name}${label ? '-' + label : ''}-${i ? 'neu' : 'alt'}.png`); await hs[i].page.screenshot({ path: files[i] }); boxes.push(await hs[i].drops()); }
    let sameBoxes = JSON.stringify(boxes[0]) === JSON.stringify(boxes[1]);
    let d = await diff(files[0], files[1], boxes[1], files[1].replace('-neu.png', '-diff.png')), again = '';
    if (d.outside || d.inside || !sameBoxes) {                     // a second look: on a slow or busy machine a page may not have settled when the first picture was taken (a drop still shows the scene of the screen before)
      for (let i = 0; i < 2; i++) { await hs[i].page.waitForTimeout(2500); await hs[i].page.screenshot({ path: files[i] }); boxes[i] = await hs[i].drops(); }
      sameBoxes = JSON.stringify(boxes[0]) === JSON.stringify(boxes[1]); d = await diff(files[0], files[1], boxes[1], files[1].replace('-neu.png', '-diff.png')); again = '   (second look)';
    }
    const veil = /(^|-)klar/.test(name) && d.inside > 0 && d.maxOutside <= 1;   // KNOWN, point 4: the drops on cards of "klar" differ on purpose - and seen THROUGH A BLUR (behind the scrim of a sheet, under a toast) they spread 1 of 255 beyond their boxes
    const ok = (d.outside === 0 || veil) && sameBoxes; if (!ok) bad++; else if (!d.inside) fs.rmSync(files[1].replace('-neu.png', '-diff.png'), { force: true });
    say(`${ok ? (d.outside ? 'ok~' : d.inside ? 'ok*' : 'ok ') : 'DIFF'} ${(name + (label ? ' ' + label : '')).padEnd(34)} outside the drops ${String(d.outside).padStart(7)} px (largest ${String(d.maxOutside).padStart(3)})   inside ${String(d.inside).padStart(7)} px (largest ${String(d.maxInside).padStart(3)})   drops ${boxes[1].length}${sameBoxes ? '' : ' (BOXES DIFFER: ' + boxes[0].length + ' against ' + boxes[1].length + ')'}   of ${d.pixels}${again}`);
    for (const h of hs) for (const e of h.errors.splice(0)) if (!/open-meteo|Failed to load resource|ERR_|net::/i.test(e)) say(`   page error (${h === hs[0] ? 'alt' : 'neu'}): ${e}`);
  }
  for (const h of hs) await h.close();
}
async function bilder() {
  say(`\n== harness page, reduced motion, ${a.engine} ==`);
  for (const ton of TONES) for (const nah of [false, true]) for (const scene of SZENEN) {
    const name = `${ton}-${scene}${nah ? '-nah' : ''}`; if (!only(name)) continue;
    await pair(name, (look) => s.harness({ look, ton, scene, nah, reduced: true }), [['', async () => {}]]);
  }
}
async function app() {
  say(`\n== real app, reduced motion, clock standing still, ${a.engine} ==`);
  for (const ton of TONES) {
    const name = `app-${ton}`; if (!only(name)) continue;
    await pair(name, (look) => s.app({ look, ton, reduced: true, zeit: ZEIT }), [
      ['start', (h) => h.go('#/start')], ['heute', (h) => h.go('#/heute')], ['projekte', (h) => h.go('#/projekte')], ['projekt', (h) => h.project()],
      ['material', (h) => h.go('#/material')], ['mehr', (h) => h.go('#/druck')], ['wetter', (h) => h.go('#/wetter')], ['archiv', (h) => h.go('#/archiv')],
      ['bogen-projekt', (h) => h.sheet('projekt')], ['bogen-rolle', async (h) => { await h.closeSheet(); await h.sheet('rolle'); }], ['bogen-einstellungen', async (h) => { await h.closeSheet(); await h.sheet('einstellungen'); }],
      ['bogen-konto', async (h) => { await h.closeSheet(); await h.sheet('konto'); }], ['bogen-hinweise', async (h) => { await h.closeSheet(); await h.sheet('hinweise'); }],
      ['suche', async (h) => { await h.closeSheet(); await h.sheet('suche'); await h.page.keyboard.type('sens'); await h.page.waitForTimeout(600); }],
      ['haken', async (h) => { await h.page.keyboard.press('Escape'); await h.page.waitForTimeout(300); await h.sheet('haken'); }], ['hinweis', (h) => h.sheet('toast')],
    ]);
  }
}

/* ------------------------------------------------------------------ computed styles */
// in the page: one line per element and pseudo-element, "path|pseudo" -> all computed properties as one string (kept in the page; only a hash travels)
const PAGE_LIB = `(() => {
  const PSEUDO = ['', '::before', '::after', '::placeholder'];
  const key = (el) => { const p = []; for (let e = el; e && e !== document.documentElement; e = e.parentElement) p.unshift(e.localName + ':' + [...e.parentElement.children].indexOf(e)); return p.join('>'); };
  const hash = (t) => { let h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); } return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36); };
  const tidy = (v) => v.replace(/\\/\\*[^]*?\\*\\//g, ' ').replace(/\\s+/g, ' ').trim();   // a custom property keeps its comments and line breaks: they are no difference
  const one = (el, ps, custom) => { const cs = getComputedStyle(el, ps || null); const o = {}; for (const p of cs) if (p.charCodeAt(1) !== 45) o[p] = cs.getPropertyValue(p); for (const c of custom) { const v = tidy(cs.getPropertyValue(c[0])); if (v) o[c[1]] = v; } return o; };
  const still = () => { window.dispatchEvent(new Event('scroll'));   /* (keeps the water awake: asleep, the root pauses its loops - at a different moment in each page) */
    for (const an of document.getAnimations()) { try { an.finish(); } catch (e) { try { an.pause(); an.currentTime = 0; } catch (e2) {} } } };
  window.__vgl = {
    still,
    all(custom, scope) { still(); const r = {}; const els = scope ? scope : [document.documentElement, ...document.documentElement.querySelectorAll('*')];
      for (const el of els) { if (el.closest && el.closest('head')) continue; const k = key(el) || 'html';
        for (const ps of PSEUDO) { if (ps === '::placeholder' && !/^(input|textarea)$/.test(el.localName)) continue; const o = one(el, ps, custom); if (ps && ps !== '::placeholder' && (o.content === 'none' || o.content === 'normal')) continue; r[k + '|' + ps + '|' + (el.className && el.className.baseVal === undefined ? String(el.className).trim().replace(/\\s+/g, '.') : '')] = hash(JSON.stringify(o)); } }
      return r; },
    get(custom, k) { window.dispatchEvent(new Event('scroll'));   /* (awake, as in all(): the two pages are asked one after the other, one of them may have fallen asleep meanwhile) */
      const [p, ps] = k.split('|'); let el = document.documentElement; if (p !== 'html') for (const part of p.split('>')) { el = el.children[+part.split(':')[1]]; if (!el) return null; } return one(el, ps, custom); },
    near(el) { const r = [el, ...el.querySelectorAll('*')]; for (let e = el.parentElement; e; e = e.parentElement) r.push(e); return r; },
  };
})()`;
const customNames = () => {                                        // every custom property the reference declares: [name in this look, name it is reported under]
  const names = (look) => { const dir = dirOf(look); const css = fs.readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => fs.readFileSync(`${dir}/${f}`, 'utf8')).join('\n'); return new Set(css.match(/--[a-z0-9-]+(?=\s*:)/g) || []); };
  const old = [...names(a.alt)].filter((n) => !SINCE_1411.has(n) || isTemplate(dirOf(a.alt))), now = names(a.neu), neu = a.neu === 'vorlage';   // (against another copy of the template nothing is left out)
  return [old.map((n) => [n, n]), old.map((n) => [neu && RENAMED[n] && now.has(RENAMED[n]) ? RENAMED[n] : n, n])];
};
async function compare(name, pages, custom, scopeSel = null, quietIfEqual = false) {
  const maps = []; for (let i = 0; i < 2; i++) maps.push(await pages[i].evaluate(([c, sel]) => window.__vgl.all(c, sel ? window.__vgl.near(document.querySelector(sel)) : null), [custom[i], scopeSel || null]));
  const keys = new Set([...Object.keys(maps[0]), ...Object.keys(maps[1])]); let n = 0, known = 0; const shown = [];
  for (const k of keys) {
    if (maps[0][k] === maps[1][k]) continue;
    if (maps[0][k] === undefined || maps[1][k] === undefined) { n++; if (shown.length < 12) shown.push(`     only in the ${maps[0][k] === undefined ? 'template' : 'reference'}: ${k}`); continue; }
    const [x, y] = [await pages[0].evaluate(([c, k]) => window.__vgl.get(c, k), [custom[0], k]), await pages[1].evaluate(([c, k]) => window.__vgl.get(c, k), [custom[1], k])];
    const props = [...new Set([...Object.keys(x || {}), ...Object.keys(y || {})])].filter((p) => (x || {})[p] !== (y || {})[p]);
    const real = props.filter((p) => !KNOWN(p, x || {}, y || {}, k));
    if (!real.length) { known++; continue; }
    n++; if (shown.length < 12) shown.push(`     ${k.split('|').slice(1).join(' ')}  <${k.split('|')[0].split('>').slice(-2).join('>')}>\n` + real.slice(0, 6).map((p) => `        ${p}: ${String(x[p]).slice(0, 110)}  ->  ${String(y[p]).slice(0, 110)}`).join('\n'));
  }
  if (n) bad++;
  if (n || !quietIfEqual) say(`${n ? 'DIFF' : 'ok  '} ${name.padEnd(46)} ${String(keys.size).padStart(5)} styles compared, ${n} differ${known ? `, ${known} only in a known way (see KNOWN)` : ''}`);
  for (const t of shown) say(t);
  return n;
}
// everything that can be tapped or focused, tagged so that both pages agree on the order
const TAPPABLE = 'button, a, input, select, textarea, [role="button"], .btn, .pill, .check, .m-row--click, .item--click, .sim-item, .tile, .m-ico, .m-back, .brand, .cmd__item, .link, .toast__undo, .wa-mulde--tipp, .wa-perle, .wa-haken';
async function states(name, pages, custom) {
  if (a.engine !== 'chromium') return;
  const cdp = []; for (const p of pages) { const c = await p.context().newCDPSession(p); await c.send('DOM.enable'); await c.send('CSS.enable'); cdp.push(c); }
  const counts = []; for (const p of pages) counts.push(await p.evaluate((sel) => { let i = 0; for (const el of document.querySelectorAll(sel)) if (el.getClientRects().length) el.setAttribute('data-vgl', i++); return i; }, TAPPABLE));
  if (counts[0] !== counts[1]) { bad++; say(`DIFF ${name}: ${counts[0]} tappable elements in the reference, ${counts[1]} in the template`); return; }
  let differ = 0;
  for (const state of [['active'], ['focus', 'focus-visible']]) {
    for (let i = 0; i < counts[0]; i++) {
      const forced = [[], []];
      if (!(await pages[0].$(`[data-vgl="${i}"]`)) || !(await pages[1].$(`[data-vgl="${i}"]`))) continue;   // gone in the meantime (a toast lives ten seconds)
      for (let k = 0; k < 2; k++) {                                // pressed: the element and its ancestors, as under a real finger
        const { root } = await cdp[k].send('DOM.getDocument', { depth: 0 }); const node = async (sel) => (await cdp[k].send('DOM.querySelector', { nodeId: root.nodeId, selector: sel })).nodeId;
        forced[k].push(await node(`[data-vgl="${i}"]`));
        if (state[0] === 'active') {
          const anc = await pages[k].evaluate((i) => { let n = 0; for (let e = document.querySelector(`[data-vgl="${i}"]`).parentElement; e && e !== document.documentElement; e = e.parentElement) e.setAttribute('data-vgl-a', n++); return n; }, i);
          for (let j = 0; j < anc; j++) forced[k].push(await node(`[data-vgl-a="${j}"]`));
        }
        for (const id of forced[k]) await cdp[k].send('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: state });
      }
      if (await compare(`${name} [${i}] :${state[0]}`, pages, custom, `[data-vgl="${i}"]`, true)) differ++;
      for (let k = 0; k < 2; k++) { for (const id of forced[k]) await cdp[k].send('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: [] }); await pages[k].evaluate(() => document.querySelectorAll('[data-vgl-a]').forEach((e) => e.removeAttribute('data-vgl-a'))); }
    }
  }
  say(`${differ ? 'DIFF' : 'ok  '} ${(name + ' pressed / focused').padEnd(46)} ${counts[0]} elements x 2 states, ${differ} differ`);
  for (const p of pages) await p.evaluate(() => document.querySelectorAll('[data-vgl]').forEach((e) => e.removeAttribute('data-vgl')));
}
async function stile() {
  say(`\n== computed styles, ${a.engine} ==`); const custom = customNames();
  for (const ton of TONES) {
    for (const [label, reduced, motionAttr] of [['motion', false, false], ['reduced motion', true, false], ['data-motion=reduziert', false, true]]) {
      const name = `stile-${ton}`; if (!only(name)) continue;
      for (const nah of [false, true]) {
        const hs = []; for (const look of [a.alt, a.neu]) hs.push(await s.harness({ look, ton, nah, reduced }));
        for (const h of hs) { await h.page.evaluate(PAGE_LIB); if (motionAttr) { await h.page.evaluate(() => { document.documentElement.dataset.motion = 'reduziert'; }); await h.page.waitForTimeout(200); } }
        await compare(`harness ${nah ? 'close-up' : 'phone'} ${ton}, ${label}`, hs.map((h) => h.page), custom);
        if (!motionAttr) await states(`harness ${nah ? 'close-up' : 'phone'} ${ton}, ${label}`, hs.map((h) => h.page), custom);
        for (const h of hs) await h.close();
      }
    }
    for (const [label, reduced] of [['motion', false], ['reduced motion', true]]) {
      const name = `stile-app-${ton}`; if (!only(name)) continue;
      const hs = []; for (const look of [a.alt, a.neu]) hs.push(await s.app({ look, ton, reduced, zeit: ZEIT })); hs.forEach(sayLook);
      for (const h of hs) await h.page.evaluate(PAGE_LIB);
      const screens = [['start', (h) => h.go('#/start')], ['heute', (h) => h.go('#/heute')], ['projekte', (h) => h.go('#/projekte')], ['projekt', (h) => h.project()], ['material', (h) => h.go('#/material')], ['mehr', (h) => h.go('#/druck')],
        ['bogen-projekt', (h) => h.sheet('projekt')], ['bogen-projekt 2', async (h) => { await h.page.locator('.sheet .input').first().fill('Halter'); await h.page.locator('.sheet__foot .btn', { hasText: 'Weiter' }).click(); await h.page.waitForTimeout(700); }],
        ['bogen-einstellungen', async (h) => { await h.closeSheet(); await h.sheet('einstellungen'); }], ['bogen-konto', async (h) => { await h.closeSheet(); await h.sheet('konto'); }], ['bogen-hinweise', async (h) => { await h.closeSheet(); await h.sheet('hinweise'); }],
        ['bogen-neue-rolle', async (h) => { await h.closeSheet(); await h.sheet('neuerolle'); }], ['bogen-geraete', async (h) => { await h.closeSheet(); await h.go('#/druck'); await h.page.locator('.m-main [aria-label^="Drucker & Warteschlange"]').first().click(); await h.page.waitForTimeout(900); }],
        ['suche', async (h) => { await h.closeSheet(); await h.sheet('suche'); await h.page.keyboard.type('sens'); await h.page.waitForTimeout(600); }], ['hinweis', async (h) => { await h.page.keyboard.press('Escape'); await h.page.waitForTimeout(300); await h.sheet('toast'); }]];
      for (const [scr, fn] of screens) {
        for (const h of hs) { try { await fn(h); } catch (e) { say(`!! ${scr}: ${String(e).split('\n')[0].slice(0, 140)}`); } }
        await compare(`app ${scr} ${ton}, ${label}`, hs.map((h) => h.page), custom);
        if (!reduced) await states(`app ${scr} ${ton}, ${label}`, hs.map((h) => h.page), custom);
      }
      for (const h of hs) await h.close();
    }
  }
}

/* ------------------------------------------------------------------ motion */
async function filme() {
  say(`\n== motion: filmstrips of the real app, animations set to fixed times, ${a.engine} ==`);
  for (const ton of TONES) {
    if (!only(`film-${ton}`)) continue;
    const r = []; for (const [i, look] of [a.alt, a.neu].entries()) r.push(await film(s, `${out}/film-${ton}-${i ? 'neu' : 'alt'}`, { look, ton, fest: true, strips: false }));
    for (const name of STRIPS) {
      const same = r[0].found[name] === r[1].found[name] || sameMotion(r[0].found[name], r[1].found[name]); const per = []; let worst = 0;
      for (let i = 0; i < r[0].frames[name].length; i++) {
        const pic = `${out}/film-${ton}-${name}-${i}-diff.png`;
        const d = await diff(r[0].frames[name][i].file, r[1].frames[name][i].file, [...r[0].boxes[name][i], ...r[1].boxes[name][i]], pic); if (!d.outside) fs.rmSync(pic, { force: true });
        per.push(d.outside); worst = Math.max(worst, d.outside);
      }
      const ok = same && worst === 0; if (!ok && !(same && name === 'scroll')) bad++;
      say(`${ok ? 'ok  ' : same && name === 'scroll' ? 'ok~ ' : 'DIFF'} film ${ton} ${name.padEnd(7)} animations ${same ? 'the same' : 'DIFFER'} (${r[1].found[name]})   px that differ outside the drops, per still: ${per.join(', ')}`);
      if (!same) say(`     reference: ${r[0].found[name]}`);
      await strip([...r[0].frames[name].map((f) => ({ file: f.file, label: 'Referenz · ' + f.label })), ...r[1].frames[name].map((f) => ({ file: f.file, label: 'Vorlage · ' + f.label }))], `${out}/film-${ton}-${name}.png`, { cols: r[0].frames[name].length, scale: 0.45, title: `${name} (${ton}): oben die Referenz, unten die Vorlage` });
    }
    for (const x of r) for (const e of x.errors) say(`   page error: ${e}`);
  }
}

if (mode === 'bilder' || mode === 'alles') await bilder();
if (mode === 'app' || mode === 'alles') await app();
if (mode === 'stile' || mode === 'alles') await stile();
if (mode === 'film' || mode === 'alles') await filme();
await s.close();
say(`\n${bad ? bad + ' comparison(s) differ' : 'no difference outside the drops and in no computed style'}  (reference ${a.alt}, engine ${a.engine}; pictures in ${out})`);
fs.writeFileSync(`${out}/vergleich-${mode}-${a.engine}.txt`, lines.join('\n') + '\n');
process.exit(bad ? 1 : 0);
