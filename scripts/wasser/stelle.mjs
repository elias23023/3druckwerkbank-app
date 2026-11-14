// ONE spot of the real app, looked at and read. For an element the other tools do not know (a sheet that is not in their
// lists, something new) and for whoever has no browser window to read "computed" values in: opens the built app at desktop
// or phone size - with the look it has built in, or with a copy of the template in its place -, goes where you say, takes
// ONE picture and prints what a selector matches there - how many elements, inside which shell, and what the look made of the first three.
//
//   node scripts/wasser/stelle.mjs <out.png> [--mobil] [--welt heute] [--bogen einstellungen] [--klick 'Über diesen Entwurf']
//        [--css '.sheet .field'] [--wert transform,water-under] [--nah] [--look auto|eingebaut|vorlage|<folder>|ohne] [--ton klar]
//        [--format 1920] [--zeit tag] [--engine webkit]
//
//   --mobil   phone size (390 x 844 @2x) instead of the desktop (2000 x 993; --format 1920: 1920 x 1080)
//   --welt    start heute projekte druck material wetter archiv, innen (the inner world of a project), or a hash ('#/material')
//   --bogen   a sheet the tools can open by name. Desktop: einstellungen konto hinweise bereich projekt projektBearbeiten
//             geraet geraetForm geraete rolle druck. Phone: konto einstellungen hinweise suche projekt rolle neuerolle geraet
//   --klick   then click: the text of a button or link, or the label of an icon button (its aria-label) - a part of it is
//             enough, the last one in the page that carries it is taken; or a CSS selector that starts with . # or [ (the
//             first match). Several, one after the other: 'Einstellungen >> Über diesen Entwurf'
//   --css     what to read. Per element: tag, classes and data attributes, the shell it lies in (data-wasser), box, background, border (its
//             top edge), shadow, backdrop-filter, radius, padding, position, colour, and whether a live drop is drawn on it.
//             (Chromium does not know -webkit-backdrop-filter: the blur the app's own .glass asks for in the BUILT app shows
//             here as "none"; --engine webkit shows it - docs/Wasser-Look.md, pitfall 16.)
//   --wert    further properties to read, separated by commas; a custom property WITHOUT its two dashes (water-under = --water-under)
//   --nah     the picture shows only the first match of --css, with 24 px around it
//   --zeit   nacht | tag | morgen | abend or an ISO time. Desktop: default nacht. Phone: without it the real hour (with it the
//            clock stands still and there is no weather).   --format: desktop only (2000 | 1920 | WxH).
//   --look   head of lib.mjs. Default auto = the look the app has built in; a folder = that copy of the template in its
//            place; ohne = the app with its look taken out.   --ton auto = what the app's own setting and the hour choose.
// Needs npm run build && npm run preview (another address: WASSER_APP=...).
import path from 'path';
import { session, args, abs, mkdir, lookArg, sayLook, geheZu, fail, ENGINES, ZEITEN } from './lib.mjs';
import { openDesktop } from './desktop-lib.mjs';
const a = args({ look: 'auto', ton: '', format: '2000', zeit: '', engine: 'chromium', welt: '', bogen: '', klick: '', css: '', wert: '' }, { flags: ['mobil', 'nah'], choices: { engine: ENGINES, ton: ['dunkel', 'klar', 'auto'], zeit: [...Object.keys(ZEITEN), '<iso>'], format: ['2000', '1920', '<WxH>'] } });
if (a._.length !== 1) fail('usage: node scripts/wasser/stelle.mjs <out.png> [--mobil] [--welt heute] [--bogen einstellungen] [--klick "Text"] [--css ".selector"]  (see the head of this file)', 1);
const out = abs(a._[0]); mkdir(path.dirname(out)); const look = lookArg(a.look);
const s = a.mobil ? await session({ engine: a.engine }) : null;
const d = a.mobil ? await s.app({ look, ton: a.ton, zeit: a.zeit || null }) : await openDesktop({ look, ton: a.ton, format: a.format, zeit: a.zeit || 'nacht', engine: a.engine });
const p = d.page; let bad = 0; sayLook(d);
try {
  await geheZu(d, a);
  let clip;
  if (a.css) {
    const more = String(a.wert || '').split(',').map((x) => x.trim()).filter(Boolean);
    const found = await p.evaluate(([sel, more]) => { const all = [...document.querySelectorAll(sel)]; return { n: all.length, first: all.slice(0, 3).map((e) => { const c = getComputedStyle(e), r = e.getBoundingClientRect(), root = e.closest('[data-wasser]'); const o = { element: e.tagName.toLowerCase() + [...e.classList].map((x) => '.' + x).join('') + [...e.attributes].filter((x) => x.name.startsWith('data-')).map((x) => ` [${x.name}="${x.value}"]`).join(''), text: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40), shell: root ? 'data-wasser="' + root.getAttribute('data-wasser') + '"' : 'OUTSIDE the look (no data-wasser above it)', box: `${Math.round(r.width)} x ${Math.round(r.height)} at ${Math.round(r.left)}, ${Math.round(r.top)}`, background: c.backgroundColor, 'background-image': c.backgroundImage.slice(0, 100), border: c.borderTopStyle === 'none' ? 'none' : `${c.borderTopWidth} ${c.borderTopStyle} ${c.borderTopColor}`, 'box-shadow': c.boxShadow.slice(0, 100), 'backdrop-filter': c.backdropFilter || c.webkitBackdropFilter || 'none', 'border-radius': c.borderRadius, padding: c.padding, position: c.position, color: c.color, 'live drop': e.dataset.w3 === 'on' ? 'yes' : 'no' }; for (const m of more) o[m] = (c.getPropertyValue(m) || c.getPropertyValue('--' + m)).trim().slice(0, 100) || '(not set)'; return o; }), box: all.length ? (({ left, top, width, height }) => ({ left, top, width, height }))(all[0].getBoundingClientRect()) : null }; }, [a.css, more]);
    console.log(`${a.css}: ${found.n} element(s)${found.n > 3 ? ', the first three:' : ''}`);
    for (const o of found.first) console.log(Object.entries(o).map(([k, v], i) => (i ? '    ' + (k + ':').padEnd(18) : '  ') + v).join('\n'));
    if (a.nah && found.box) { const vw = a.mobil ? 390 : d.format.w, vh = a.mobil ? 844 : d.format.h, x = Math.max(0, found.box.left - 24), y = Math.max(0, found.box.top - 24); clip = { x, y, width: Math.min(vw - x, found.box.width + 48), height: Math.min(vh - y, found.box.height + 48) }; }
  }
  if (!a.mobil) await d.park(); await p.waitForTimeout(750); await p.screenshot({ path: out, ...(clip && clip.width > 0 && clip.height > 0 ? { clip } : {}) });
  const errors = d.errors.filter((x) => !/open-meteo|Failed to load resource|ERR_|net::/i.test(x));
  const ton = await p.evaluate(() => document.documentElement.getAttribute('data-wa-ton') || 'dunkel');
  console.log(`${out}   (${a.mobil ? 'Handy' : 'Desktop ' + a.format}, Look: ${d.look.mode}${d.look.mode === 'ohne' ? '' : ', Ton ' + ton})${errors.length ? '\npage errors: ' + errors.slice(0, 3).join(' | ') : ''}`);
} catch (e) { bad = 1; console.log('!!', String(e).split('\n').slice(0, 3).join(' ')); }
await d.close(); if (s) await s.close(); process.exit(bad);
