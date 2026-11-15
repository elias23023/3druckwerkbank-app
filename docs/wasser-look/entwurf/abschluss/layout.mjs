// Layout check for the final look: in every desktop world, both formats, night and day, both workspaces:
// is any opaque part of an island or any island label covered by something of the UI (text, panel, glass, button, canvas)?
// Also: is any text cut off at the window edge? Run against two apps (before/after) and print the differences.
//   node docs/wasser-look/entwurf/abschluss/layout.mjs <name>=<url> [<name>=<url>]   -> JSON per app in the OS temp dir, summary on stdout
import fs from 'fs'; import os from 'os'; import path from 'path';
import { openDesktop, WELTEN } from '../../../../scripts/wasser/desktop-lib.mjs';
import { pw } from '../../../../scripts/wasser/lib.mjs';
const apps = process.argv.slice(2).map((a) => a.split('='));
const out = {};
const browser = await pw.chromium.launch();
for (const [name, url] of apps) {
  out[name] = {};
  for (const format of ['2000', '1920']) for (const zeit of ['nacht', 'tag']) for (const ber of ['demo', 'echt']) {
    const d = await openDesktop({ app: url, format, zeit, uhr: 'steht', reduced: true, browser });
    if (ber === 'echt') await d.bereich('echt');
    for (const w of WELTEN) {
      if (ber === 'echt' && w === 'innen') continue;   // no project in the empty workspace
      const key = `${format} ${zeit} ${ber} ${w}`;
      try { if (w === 'innen') await d.project(); else await d.go(w); } catch (e) { out[name][key] = { error: String(e).slice(0, 200) }; continue; }
      await d.page.waitForTimeout(1500); await d.park?.();
      const r = await d.page.evaluate(() => {
        const vis = (el) => { for (let e = el; e && e !== document.body; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05) return false; } return true; };
        const ui = [...document.querySelectorAll('.stage > .ui, .sheet, .cmd-back')];
        // obstacles: text runs and painting boxes inside the UI layer
        const obs = [];
        for (const root of ui) {
          const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
          while ((n = tw.nextNode())) { if (!n.textContent.trim() || !vis(n.parentElement) || n.parentElement.closest('.island')) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const b of rg.getClientRects()) if (b.width > 1 && b.height > 1) obs.push({ k: 'text:' + (n.parentElement.className || n.parentElement.tagName) + ' "' + n.textContent.trim().slice(0, 24) + '"', b }); }
          for (const el of root.querySelectorAll('*')) {
            if (el.closest('.island') || !vis(el)) continue; const s = getComputedStyle(el);
            const paints = (s.backgroundColor && !/rgba\(0, 0, 0, 0\)|transparent/.test(s.backgroundColor)) || s.backgroundImage !== 'none' || (s.backdropFilter && s.backdropFilter !== 'none') || /^(CANVAS|IMG|svg)$/i.test(el.tagName);
            if (!paints) continue; const b = el.getBoundingClientRect(); if (b.width < 2 || b.height < 2) continue;
            obs.push({ k: 'box:' + (typeof el.className === 'string' ? el.className : el.tagName).split(' ').slice(0, 3).join('.'), b });
          }
        }
        // islands: opaque sample points of the picture, and the label's box
        const hits = {}; const islands = [];
        for (const isl of document.querySelectorAll('.island')) {
          if (!vis(isl)) continue; const name = isl.getAttribute('aria-label') || '?';
          const pts = [];
          const img = isl.querySelector('.island__img');
          if (img && img.complete && img.naturalWidth) {
            const q = img.getBoundingClientRect(); const W = 48, H = Math.max(8, Math.round(48 * q.height / q.width)); const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H);
            let a; try { a = x.getImageData(0, 0, W, H).data; } catch { a = null; }
            for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (!a || a[(j * W + i) * 4 + 3] > 200) pts.push({ x: q.left + (i + .5) * q.width / W, y: q.top + (j + .5) * q.height / H, part: 'bild' });
          }
          const lab = isl.querySelector('.island__label');
          if (lab && vis(lab)) { const q = lab.getBoundingClientRect(); for (let j = 0; j < 4; j++) for (let i = 0; i < 8; i++) pts.push({ x: q.left + (i + .5) * q.width / 8, y: q.top + (j + .5) * q.height / 4, part: 'name' }); }
          const inView = pts.filter((p) => p.x >= 0 && p.y >= 0 && p.x <= innerWidth && p.y <= innerHeight);
          islands.push({ name, pts: pts.length, inView: inView.length });
          for (const p of inView) for (const o of obs) if (p.x >= o.b.left && p.x <= o.b.right && p.y >= o.b.top && p.y <= o.b.bottom) { const k = `${name} [${p.part}] <- ${o.k}`; hits[k] = (hits[k] || 0) + 1; }
        }
        // text cut off by the window
        const cut = [];
        for (const root of ui) { const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { if (!n.textContent.trim() || !vis(n.parentElement)) continue; const rg = document.createRange(); rg.selectNodeContents(n); for (const b of rg.getClientRects()) if (b.width > 1 && (b.left < -1 || b.right > innerWidth + 1 || b.bottom > innerHeight + 1 || b.top < -1)) cut.push(n.textContent.trim().slice(0, 30)); } }
        return { hits, islands, cut, hscroll: document.documentElement.scrollWidth > innerWidth };
      });
      out[name][key] = r;
    }
    out[name][`${format} ${zeit} ${ber} errors`] = d.errors.slice();
    await d.close();
  }
  { const f = path.join(os.tmpdir(), `layout-${name}.json`); fs.writeFileSync(f, JSON.stringify(out[name], null, 1)); console.log('written', f); }
}
await browser.close();
const names = Object.keys(out);
for (const key of Object.keys(out[names[0]])) {
  if (key.endsWith('errors')) { const l = names.map((n) => `${n}: ${(out[n][key] || []).length}`).join(' | '); console.log(`${key}: ${l}`); continue; }
  const line = names.map((n) => { const r = out[n][key] || {}; if (r.error) return `${n}: ERROR ${r.error}`; return `${n}: ${Object.keys(r.hits).length} hit kinds, ${r.cut.length} cut, ${r.islands.length} islands`; }).join(' | ');
  console.log(key.padEnd(30), line);
  if (names.length === 2) {
    const [a, b] = names.map((n) => out[n][key]?.hits || {});
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if ((a[k] || 0) !== (b[k] || 0)) console.log('   DIFF', k, `${names[0]}=${a[k] || 0}`, `${names[1]}=${b[k] || 0}`);
    const [ca, cb] = names.map((n) => (out[n][key]?.cut || []).join(' / ')); if (ca !== cb) console.log('   CUT', names[0], ca, '||', names[1], cb);
  }
  for (const n of names) { const r = out[n][key]; if (r && r.hits) for (const [k, v] of Object.entries(r.hits)) if (n === names[names.length - 1]) console.log('   hit', n, k, v); if (r?.cut?.length && n === names[names.length - 1]) console.log('   cut', n, r.cut.join(' / ')); }
}
