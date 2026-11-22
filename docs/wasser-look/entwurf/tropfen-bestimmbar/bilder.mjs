// before/after pictures: phone Start, Heute, Projekte; desktop Start, Heute; both tones; reduced motion (one still picture of the water)
import fs from 'fs';
const W = new URL('../../../..', import.meta.url).pathname.replace(/\/$/, '');
const { session, serve, strip } = await import(W + '/scripts/wasser/lib.mjs'); const { openDesktop } = await import(W + '/scripts/wasser/desktop-lib.mjs');
const [vor, nach, out] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const s = await session({}); const sv = [await serve(vor, { app: true }), await serve(nach, { app: true })]; const names = ['vorher', 'nachher'];
const boxes = {};
for (const ton of ['dunkel', 'klar']) { const zeit = ton === 'klar' ? 'tag' : 'nacht';
  for (let i = 0; i < 2; i++) {
    const h = await s.app({ app: sv[i].url, look: 'eingebaut', ton, reduced: true, zeit, wetter: 'klar' });
    for (const w of ['start', 'heute', 'projekte']) { await h.go('#/' + w, 1500); await h.page.screenshot({ path: `${out}/handy-${ton}-${w}-${names[i]}.png` }); boxes[`handy-${ton}-${w}`] = await h.drops({ pad: 4 }); }
    await h.close();
    const d = await openDesktop({ app: sv[i].url, look: 'eingebaut', format: '2000', ton, zeit, uhr: 'steht', reduced: true, browser: s.browser });
    for (const w of ['start', 'heute']) { await d.go(w); await d.page.waitForTimeout(1500); await d.park(); await d.page.screenshot({ path: `${out}/desktop-${ton}-${w}-${names[i]}.png` }); boxes[`desktop-${ton}-${w}`] = await d.page.evaluate(() => [...document.querySelectorAll('.w3-drop')].filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return [Math.floor(r.left - 4), Math.floor(r.top - 4), Math.ceil(r.right + 4), Math.ceil(r.bottom + 4)]; })); }
    await d.close();
  }
}
for (const [k, bx] of Object.entries(boxes)) {
  const l = Math.max(0, Math.min(...bx.map((b) => b[0]))), t = Math.max(0, Math.min(...bx.map((b) => b[1]))), r = Math.max(...bx.map((b) => b[2])), b = Math.max(...bx.map((b) => b[3]));
  // detail: the head row of drops (those in the top 140 px) and the rest
  const desk = k.startsWith('desktop'), top = bx.filter((x) => x[1] < (desk ? 90 : 140)), rest = bx.filter((x) => x[1] >= (desk ? 90 : 140));
  const box = (list) => { const L = Math.max(0, Math.min(...list.map((b) => b[0]))), T = Math.max(0, Math.min(...list.map((b) => b[1]))); return { x: L, y: T, w: Math.max(...list.map((b) => b[2])) - L, h: Math.min(desk ? 300 : 600, Math.max(...list.map((b) => b[3])) - T) }; };
  const details = []; if (top.length) details.push({ ...box(top), factor: desk ? 3 : 2, label: 'Tropfen oben, vergrößert' }); if (rest.length) details.push({ ...box(rest.slice(0, 4)), factor: desk ? 2 : 1, label: 'Tropfen darunter' });
  await strip(['vorher', 'nachher'].map((n) => ({ file: `${out}/${k}-${n}.png`, label: n })), `${out}/${k}-vergleich.png`, { title: k + ' (reduzierte Bewegung)', scale: desk ? 0.45 : 0.5, details });
  console.log(k, bx.length, 'drops');
}
await s.close(); for (const x of sv) await x.close();
