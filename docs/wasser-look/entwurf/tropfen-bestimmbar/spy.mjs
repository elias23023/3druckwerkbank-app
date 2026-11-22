// repro of the 1/255: two builds, the sollist flow for a few phone sheets, with a spy on the WebGL calls of the drops
import fs from 'fs';
const W = new URL('../../../..', import.meta.url).pathname.replace(/\/$/, '');
const { session, serve, diff } = await import(W + '/scripts/wasser/lib.mjs');
const [soll, ist, out, nur = 'neuerolle,geraet,geraete'] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const STILL = '.cloudbank { animation: none !important; } *, *::before, *::after { caret-color: transparent !important; } .island { transition: none !important; will-change: auto !important; }';
const SPY = () => {
  if (window.__spy) return; const S = window.__spy = { log: [], n: 0, frames: 0 };
  const P = WebGLRenderingContext.prototype, draw = P.drawArrays; let names = null;
  const hash = (u8) => { let h = 2166136261; for (let i = 0; i < u8.length; i++) { h ^= u8[i]; h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };
  P.drawArrays = function (...a) {
    const gl = this, prog = gl.getParameter(gl.CURRENT_PROGRAM);
    if (!names) { names = []; const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const nm = gl.getActiveUniform(prog, i).name; names.push([nm, gl.getUniformLocation(prog, nm)]); } }
    const u = {}; for (const [nm, loc] of names) { const v = gl.getUniform(prog, loc); u[nm] = typeof v === 'number' ? v : Array.from(v); }
    const r = draw.apply(gl, a);
    const vp = Array.from(gl.getParameter(gl.VIEWPORT)); const px = new Uint8Array(vp[2] * vp[3] * 4); gl.readPixels(vp[0], vp[1], vp[2], vp[3], gl.RGBA, gl.UNSIGNED_BYTE, px);
    S.log.push({ n: S.n++, t: Math.round(performance.now()), vp, cv: [gl.canvas.width, gl.canvas.height], u, px: hash(px) });
    if (S.log.length > 4000) S.log.splice(0, 2000);
    return r;
  };
};
const drops = (page) => page.evaluate(() => [...document.querySelectorAll('.w3-drop')].filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(), b = e.parentElement; const d = e.getContext('2d').getImageData(0, 0, e.width, e.height).data; let h = 2166136261; for (let i = 0; i < d.length; i++) { h ^= d[i]; h = Math.imul(h, 16777619); } return { box: [r.left, r.top, r.width, r.height], lab: ((b && (b.textContent || b.getAttribute('aria-label'))) || '').trim().slice(0, 30), size: [e.width, e.height], hash: (h >>> 0).toString(16) }; }));
const esc = async (h) => { for (let i = 0; i < 2; i++) if (await h.page.locator('.sheet, .cmd').count()) { await h.page.keyboard.press('Escape'); await h.page.waitForTimeout(350); } };
const SCREENS = { neuerolle: (h) => h.sheet('neuerolle'), geraet: (h) => h.sheet('geraet'),
  geraete: async (h) => { await h.go('#/druck'); await h.page.locator('.m-main [aria-label^="Drucker & Warteschlange"]').first().click(); await h.page.waitForTimeout(900); },
  einstellungen: async (h) => { await h.go('#/start'); await h.sheet('einstellungen'); }, start: (h) => h.go('#/start'), heute: (h) => h.go('#/heute'), projekte: (h) => h.go('#/projekte'), suche: async (h) => { await h.go('#/start'); await h.sheet('suche'); await h.page.keyboard.type('sens'); await h.page.waitForTimeout(600); } };
const fest = async (h, file) => { let last = null; for (let i = 0; i < 5; i++) { const buf = await h.page.screenshot(); if (last && buf.equals(last)) break; last = buf; await h.page.waitForTimeout(i ? 400 : 250); } fs.writeFileSync(file, last); };
const s = await session({}); const closers = [];
const urlOf = async (x) => { if (/^http/.test(x)) return x; const sv = await serve(fs.existsSync(x + '/dist/index.html') ? x + '/dist' : x, { app: true }); closers.push(sv.close); return sv.url; };
const hs = []; for (const st of [soll, ist]) { const h = await s.app({ app: await urlOf(st), look: (process.env.LOOKS ? process.env.LOOKS.split(',')[hs.length] : 'eingebaut'), ton: 'dunkel', reduced: process.env.MOTION ? false : true, zeit: 'nacht', wetter: 'klar' }); await h.page.addStyleTag({ content: STILL }); if (!process.env.NOSPY) await h.page.evaluate(SPY); hs.push(h); }
let bad = 0;
for (const name of nur.split(',')) {
  for (const h of hs) { await esc(h); await SCREENS[name](h); }
  const files = [`${out}/${name}-soll.png`, `${out}/${name}-ist.png`]; for (let i = 0; i < 2; i++) await fest(hs[i], files[i]);
  const dr = [await drops(hs[0].page), await drops(hs[1].page)];
  const d = await diff(files[0], files[1], dr[0].map((x) => [Math.floor(x.box[0] * 2), Math.floor(x.box[1] * 2), Math.ceil((x.box[0] + x.box[2]) * 2), Math.ceil((x.box[1] + x.box[3]) * 2)]), `${out}/${name}-diff.png`);
  const differing = dr[0].map((x, i) => (dr[1][i] && dr[1][i].hash === x.hash ? null : `${x.lab || '?'}@${x.box.map(Math.round).join(',')} ${x.size} ${x.hash}/${dr[1][i] && dr[1][i].hash}`)).filter(Boolean);
  console.log(`${d.inside + d.outside ? 'DIFF' : 'ok  '} ${name}: ${d.outside} outside (max ${d.maxOutside}), ${d.inside} inside (max ${d.maxInside}); drops ${dr[0].length}/${dr[1].length}; canvases that differ: ${differing.length ? differing.join(' | ') : 'none'}`);
  if (d.inside + d.outside || differing.length) bad++;
  if (!process.env.NOSPY) for (let i = 0; i < 2; i++) { const info = await hs[i].page.evaluate(() => ({ log: window.__spy.log, info: JSON.parse(JSON.stringify(window.Wasser.info)) })); fs.writeFileSync(`${out}/${name}-${i ? 'ist' : 'soll'}.json`, JSON.stringify(info)); }
}
for (const h of hs) await h.close(); await s.close(); for (const c of closers) await c();
process.exit(bad ? 1 : 0);
