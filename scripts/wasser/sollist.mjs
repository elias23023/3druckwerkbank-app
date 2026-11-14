// SOLL GEGEN IST: two states of the APP, the same screens, pixel by pixel - phone and desktop, both tones, both workspaces.
// The question it answers: "did my change alter anything I did not mean to alter?" (vergleich.mjs compares two LOOKS in one
// app; this tool compares two APPS, each with the look it has built in.)
//
//   node scripts/wasser/sollist.mjs [handy|desktop|alles] --soll <state> [--ist <state>] [--toene dunkel,klar] [--formate 2000,1920]
//        [--zeiten nacht,tag] [--bereiche demo,echt] [--nur <name parts>] [--erwartet <name parts>] [--out <dir>] [--look eingebaut]
//        [--engine chromium|webkit] [--api node] [--liste]
//
//   <state>   git:<revision>   that commit (git:HEAD, git:feinschliff-basis, git:9c4afa7): its src/ and public/ are exported to a
//                              scratch folder, built there with THIS tree's node_modules and served. Built once per commit
//                              (the folder is printed; delete it when the disk is tight).
//             baum             the working tree as it is NOW, built into a scratch folder (dist/ is not touched) - so an
//                              old dist/ or a preview that was not rebuilt cannot be measured by mistake.
//             an address       http://localhost:4175 - an app that is already served (a preview, the staging site)
//             a folder         a built app (it holds index.html), or a project folder with dist/ in it
//   --soll    what it should look like (required).   --ist  what it looks like (default: baum).
//   handy     390 x 844 @2x: Start, Heute, Projekte, a project, Material, Mehr, Wetter, Archiv (long screens also scrolled to their
//             end), six sheets and forms, the search, a toast; the empty workspace: five screens.
//   desktop   2000 x 993 and 1920 x 1080 (--formate): the eight worlds, eight sheets and forms, the search, a toast; the empty
//             workspace: five worlds.
//   alles     both (default).
//   --toene   both tones (default), each set through the app's own setting "Erscheinungsbild".
//   --zeiten  the app's clock (it stands still): default nacht for "dunkel" and tag for "klar"; --zeiten nacht,tag = every tone at both.
//   --nur     only screens whose name contains one of these parts (names as in the lines of the output: "handy klar start",
//             "desktop 2000 dunkel nacht wetter", "bogen", "leer" = the empty workspace)
//   --erwartet  screens that are MEANT to differ (name parts): listed apart, not counted as a failure. Everything else must be equal.
//   --look    what each side shows: eingebaut (default) = each app with the look it has built in, as it is; a folder or
//             vorlage = that copy of the template in BOTH apps (in place of their built-in look): then only the app differs.
//   --api node   build git: and baum states with VITE_API=node (the Node build) instead of the plain one
//   --liste   only print the names of the screens
//
// How two runs are made equal: reduced motion (the water is one still picture), the clock stands still, made-up weather, the
// pointer parked, the app's cloud banks held (they drift even with reduced motion), no blinking caret; every still is taken
// until the same picture comes twice in a row; a screen that differs is looked at a second and a third time (the page may not
// have settled; the desktop then gets its window nudged by one pixel, which makes the browser raster its layers again).
// Every line: ok / DIFF, the screen, how many pixels differ and by how much (inside the drop canvases counted apart), and the
// box around all of them in CSS px. For every DIFF a picture <out>/<name>-vergleich.png: Soll | Ist | where they differ (red;
// yellow inside drops). At the end the list of the screens that differ. Exit code 1 when a screen differs that is not named in
// --erwartet, when a step failed on one side, or when one side reported a page error the other did not.
// Needs Chromium (or --engine webkit) and, for git: and baum, a few seconds per build. The work machine draws WebGL in
// software: "equal" here means equal on THIS machine in ONE run - both sides are always drawn by the same browser.
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync } from 'child_process';
import { session, serve, diff, strip, args, abs, mkdir, REPO, lookArg, sayLook, fail, TOENE, ENGINES, ZEITEN } from './lib.mjs';
import { openDesktop, WELTEN } from './desktop-lib.mjs';

const a = args({ soll: '', ist: 'baum', look: 'eingebaut', toene: 'dunkel,klar', formate: '2000,1920', zeiten: '', bereiche: 'demo,echt', nur: '', erwartet: '', out: path.join(os.tmpdir(), 'wasser-sollist'), engine: 'chromium', api: '' },
  { flags: ['liste'], choices: { toene: TOENE, engine: ENGINES, zeiten: Object.keys(ZEITEN), bereiche: ['demo', 'echt'], formate: ['2000', '1920', '<WxH>'], api: ['node'] } });
const WAS = ['handy', 'desktop', 'alles']; const was = a._[0] || 'alles'; if (!WAS.includes(was) || a._.length > 1) fail(`"${a._.join(' ')}": one of ${WAS.join(' | ')} (nothing = alles)`);
if (!a.soll && !a.liste) fail('--soll <state> is missing: git:<revision> | baum | an address | a folder with a built app   (see the head of this file)');
const look = lookArg(a.look); if (look === 'auto') fail('--look auto would give two apps two different looks without saying so: eingebaut (each as built), a folder, vorlage or ohne');
const out = mkdir(abs(a.out)); const parts = (v) => String(v || '').split(',').map((x) => x.trim()).filter(Boolean);
const nur = parts(a.nur), erwartet = parts(a.erwartet); const only = (n) => !nur.length || nur.some((w) => n.includes(w)); const expected = (n) => erwartet.some((w) => n.includes(w));
const STILL = '.cloudbank { animation: none !important; } *, *::before, *::after { caret-color: transparent !important; }';

/* ------------------------------------------------------------------ the two states */
const CACHE = path.join(os.tmpdir(), 'wasser-sollist-staende'); const closers = [];
const vite = (cwd, outDir) => { try { execFileSync(process.execPath, [abs('node_modules/vite/bin/vite.js'), 'build', '--logLevel', 'error', '--outDir', outDir, '--emptyOutDir'], { cwd, env: { ...process.env, ...(a.api ? { VITE_API: a.api } : {}) }, stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { fail(`the build failed in ${cwd}:\n${String(e.stderr || e.stdout || e).slice(0, 1500)}`, 1); } };
async function stand(spec, label) {
  const served = async (dist, text) => { const s = await serve(dist, { app: true }); closers.push(s.close); return { url: s.url, text }; };
  if (/^https?:\/\//.test(spec)) return { url: spec.replace(/\/$/, ''), text: spec };
  if (spec === 'baum') { const dist = path.join(CACHE, `baum-${process.pid}${a.api ? '-' + a.api : ''}`); vite(REPO, dist); closers.push(() => fs.rmSync(dist, { recursive: true, force: true })); return served(dist, `the working tree, built just now${a.api ? ' (VITE_API=' + a.api + ')' : ''}`); }
  if (/^git:/.test(spec)) {
    let hash; try { hash = execFileSync('git', ['rev-parse', '--verify', `${spec.slice(4)}^{commit}`], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim(); } catch (e) { fail(`--${label} ${spec}: git does not know this revision`); }
    const dir = path.join(CACHE, hash.slice(0, 12) + (a.api ? '-' + a.api : ''));
    if (!fs.existsSync(`${dir}/dist/index.html`)) {
      fs.rmSync(dir, { recursive: true, force: true }); mkdir(dir);
      const files = execFileSync('git', ['ls-tree', '--name-only', hash], { cwd: REPO }).toString().split('\n').filter((f) => /^(src|public|index\.html|package\.json|vite\.config\.[jt]s|tsconfig.*\.json)$/.test(f));
      execFileSync('sh', ['-c', `git archive ${hash} ${files.join(' ')} | tar -x -C "${dir}"`], { cwd: REPO }); fs.symlinkSync(abs('node_modules'), `${dir}/node_modules`); vite(dir, `${dir}/dist`);
    }
    return served(`${dir}/dist`, `${spec} = ${hash.slice(0, 7)}, built in ${dir}`);
  }
  const dir = abs(spec), dist = fs.existsSync(`${dir}/index.html`) && fs.existsSync(`${dir}/assets`) ? dir : fs.existsSync(`${dir}/dist/index.html`) ? `${dir}/dist` : '';
  if (!dist) fail(`--${label} ${spec}: neither git:<revision>, baum, an address, nor a folder with a built app (${dir})`);
  return served(dist, `the built app in ${dist}`);
}

/* ------------------------------------------------------------------ the screens */
const esc = async (h) => { for (let i = 0; i < 2; i++) if (await h.page.locator('.sheet, .cmd').count()) { await h.page.keyboard.press('Escape'); await h.page.waitForTimeout(350); } };
const unten = async (h) => { await h.page.locator('.m-main').evaluate((e) => { e.scrollTop = 99999; }); await h.page.waitForTimeout(500); };
const HANDY = [
  ['start', (h) => h.go('#/start')], ['heute', (h) => h.go('#/heute')], ['heute-unten', async (h) => { await h.go('#/heute'); await unten(h); }], ['projekte', (h) => h.go('#/projekte')],
  ['projekt', (h) => h.project()], ['projekt-unten', async (h) => { await h.project(); await unten(h); }], ['material', (h) => h.go('#/material')], ['material-unten', async (h) => { await h.go('#/material'); await unten(h); }],
  ['mehr', (h) => h.go('#/druck')], ['mehr-unten', async (h) => { await h.go('#/druck'); await unten(h); }], ['wetter', (h) => h.go('#/wetter')], ['archiv', (h) => h.go('#/archiv')],
  ['bogen-projekt', (h) => h.sheet('projekt')], ['bogen-rolle', (h) => h.sheet('rolle')], ['bogen-neuerolle', (h) => h.sheet('neuerolle')], ['bogen-geraet', (h) => h.sheet('geraet')],
  ['bogen-einstellungen', async (h) => { await h.go('#/start'); await h.sheet('einstellungen'); }], ['bogen-konto', async (h) => { await h.go('#/start'); await h.sheet('konto'); }], ['bogen-hinweise', async (h) => { await h.go('#/start'); await h.sheet('hinweise'); }],
  ['suche', async (h) => { await h.go('#/start'); await h.sheet('suche'); await h.page.keyboard.type('sens'); await h.page.waitForTimeout(600); }], ['hinweis', (h) => h.sheet('toast')],
];
const HANDY_LEER = [['leer-start', (h) => h.go('#/start')], ['leer-heute', (h) => h.go('#/heute')], ['leer-projekte', (h) => h.go('#/projekte')], ['leer-material', (h) => h.go('#/material')], ['leer-mehr', (h) => h.go('#/druck')]];
const DESKTOP = [
  ...WELTEN.map((w) => [w, (d) => d.welt(w)]),
  ['bogen-einstellungen', async (d) => { await d.go('heute'); await d.sheet('einstellungen'); }], ['bogen-konto', async (d) => { await d.go('heute'); await d.sheet('konto'); }], ['bogen-hinweise', async (d) => { await d.go('heute'); await d.sheet('hinweise'); }],
  ['bogen-projekt', (d) => d.sheet('projekt')], ['bogen-bearbeiten', (d) => d.sheet('projektBearbeiten')], ['bogen-rolle', (d) => d.sheet('rolle')], ['bogen-geraet', (d) => d.sheet('geraet')], ['bogen-geraete', (d) => d.sheet('geraete')],
  ['suche', async (d) => { await d.go('heute'); await d.search('sens'); }], ['hinweis', (d) => d.toast()],
];
const DESKTOP_LEER = ['start', 'heute', 'projekte', 'druck', 'material'].map((w) => ['leer-' + w, (d) => d.go(w)]);

/* ------------------------------------------------------------------ one pair of pages, screen by screen */
const lines = [], differ = []; let count = 0, failed = 0; const say = (t) => { console.log(t); lines.push(t); };
// a still that stands: the same picture twice in a row (at most five looks)
async function fest(h, file, desk) {
  if (desk) await h.park(); let last = null;
  for (let i = 0; i < 5; i++) { const buf = await h.page.screenshot(); if (last && buf.equals(last)) break; last = buf; await h.page.waitForTimeout(i ? 400 : 250); }
  fs.writeFileSync(file, last);
}
async function pair(group, hs, screens, desk) {
  const scale = desk ? 1 : 2;
  for (const [name, fn] of screens) {
    const full = `${group} ${name}`; if (!only(full)) continue; count++;
    const id = full.replace(/[^\w]+/g, '-'), files = [`${out}/${id}-soll.png`, `${out}/${id}-ist.png`]; let broke = '';
    for (let i = 0; i < 2; i++) { try { await esc(hs[i]); await fn(hs[i]); if (desk) await hs[i].page.waitForTimeout(600); } catch (e) { broke += ` ${i ? 'ist' : 'soll'}: ${String(e).split('\n')[0].slice(0, 110)}`; } }
    const look = async (nudge) => { for (let i = 0; i < 2; i++) { if (nudge && desk) { const v = hs[i].page.viewportSize(); await hs[i].page.setViewportSize({ width: v.width, height: v.height + 1 }); await hs[i].page.waitForTimeout(150); await hs[i].page.setViewportSize(v); await hs[i].page.waitForTimeout(500); } await fest(hs[i], files[i], desk); }
      const boxes = [...await drops(hs[0], scale), ...await drops(hs[1], scale)]; return diff(files[0], files[1], boxes, `${out}/${id}-diff.png`); };
    let d = await look(false), looks = 1;
    while ((d.outside || d.inside) && looks < 3) { await hs[0].page.waitForTimeout(1500); d = await look(looks === 2); looks++; }
    const n = d.outside + d.inside, same = n === 0 && !broke;
    const where = d.box ? `  x ${Math.floor(d.box[0] / scale)}..${Math.ceil(d.box[2] / scale)}, y ${Math.floor(d.box[1] / scale)}..${Math.ceil(d.box[3] / scale)}` : '';
    if (same) { for (const f of [...files, `${out}/${id}-diff.png`]) fs.rmSync(f, { force: true }); }
    else { if (!broke && d.size === undefined) await strip([{ file: files[0], label: 'Soll' }, { file: files[1], label: 'Ist' }, { file: `${out}/${id}-diff.png`, label: 'Unterschied (rot; gelb = in einem Tropfen)' }], `${out}/${id}-vergleich.png`, { title: full, scale: desk ? 0.5 : 0.5 }); differ.push({ full, n, expected: expected(full) && !broke, text: broke ? `STEP FAILED:${broke}` : `${n} px differ (largest ${Math.max(d.maxOutside, d.maxInside)}; ${d.inside} of them inside drops)${where}`, pic: broke ? '' : `${out}/${id}-vergleich.png` }); if (broke) failed++; }
    say(`${same ? 'ok  ' : expected(full) && !broke ? 'diff' : 'DIFF'} ${full.padEnd(44)} ${same ? `equal${looks > 1 ? ` (at the ${looks}. look)` : ''}` : differ[differ.length - 1].text}`);
  }
  // page errors: the same on both sides, or it is a difference
  const errs = hs.map((h) => [...new Set(h.errors.splice(0).filter((e) => !/open-meteo|Failed to load resource|ERR_|net::|favicon/i.test(e)))]);
  if (errs[0].join('|') !== errs[1].join('|')) { failed++; say(`!!   ${group}: page errors differ   soll: ${errs[0].slice(0, 2).join(' | ') || 'none'}   ist: ${errs[1].slice(0, 2).join(' | ') || 'none'}`); }
  else if (errs[0].length) say(`     ${group}: both sides report: ${errs[0].slice(0, 2).join(' | ')}`);
}
const drops = (h, scale) => h.page.evaluate((s) => [...document.querySelectorAll('.w3-drop')].filter((e) => e.getClientRects().length).map((e) => { const r = e.getBoundingClientRect(); return [Math.floor(r.left * s), Math.floor(r.top * s), Math.ceil(r.right * s), Math.ceil(r.bottom * s)]; }), scale);
const zeitenOf = (ton) => (a.zeiten ? parts(a.zeiten) : [ton === 'klar' ? 'tag' : 'nacht']);

if (a.liste) {
  const names = []; for (const ton of parts(a.toene)) for (const zeit of zeitenOf(ton)) {
    if (was !== 'desktop') { if (a.bereiche.includes('demo')) names.push(...HANDY.map(([n]) => `handy ${ton} ${zeit} ${n}`)); if (a.bereiche.includes('echt')) names.push(...HANDY_LEER.map(([n]) => `handy ${ton} ${zeit} ${n}`)); }
    if (was !== 'handy') for (const f of parts(a.formate)) { if (a.bereiche.includes('demo')) names.push(...DESKTOP.map(([n]) => `desktop ${f} ${ton} ${zeit} ${n}`)); if (a.bereiche.includes('echt')) names.push(...DESKTOP_LEER.map(([n]) => `desktop ${f} ${ton} ${zeit} ${n}`)); }
  }
  console.log(names.filter(only).join('\n')); process.exit(0);
}

const soll = await stand(a.soll, 'soll'), ist = await stand(a.ist, 'ist');
say(`Soll: ${soll.text}\nIst:  ${ist.text}\nreduced motion, the clock stands still, made-up weather; pictures of what differs in ${out}`);
const s = await session({ engine: a.engine }); const t0 = Date.now();
try {
  for (const ton of parts(a.toene)) for (const zeit of zeitenOf(ton)) {
    if (was !== 'desktop') {
      const group = `handy ${ton} ${zeit}`;
      if ([...HANDY, ...HANDY_LEER].some(([n]) => only(`${group} ${n}`))) {
        const hs = []; for (const st of [soll, ist]) { const h = await s.app({ app: st.url, look, ton, reduced: true, zeit, wetter: 'klar' }); await h.page.addStyleTag({ content: STILL }); hs.push(h); }
        if (hs[0].look.text === hs[1].look.text) sayLook(hs[0]); else say(`Look (handy)   soll: ${hs[0].look.text}\n               ist:  ${hs[1].look.text}`);
        if (a.bereiche.includes('demo')) await pair(group, hs, HANDY, false);
        if (a.bereiche.includes('echt') && HANDY_LEER.some(([n]) => only(`${group} ${n}`))) { for (const h of hs) { await h.bereich('echt'); await h.page.addStyleTag({ content: STILL }); } await pair(group, hs, HANDY_LEER, false); }
        for (const h of hs) await h.close();
      }
    }
    if (was !== 'handy') for (const format of parts(a.formate)) {
      const group = `desktop ${format} ${ton} ${zeit}`;
      if (![...DESKTOP, ...DESKTOP_LEER].some(([n]) => only(`${group} ${n}`))) continue;
      const hs = []; for (const st of [soll, ist]) { const d = await openDesktop({ app: st.url, look, format, ton, zeit, uhr: 'steht', reduced: true, engine: a.engine, browser: s.browser }); await d.page.addStyleTag({ content: STILL }); hs.push(d); }
      if (hs[0].look.text === hs[1].look.text) sayLook(hs[0]); else say(`Look (desktop) soll: ${hs[0].look.text}\n               ist:  ${hs[1].look.text}`);
      if (a.bereiche.includes('demo')) await pair(group, hs, DESKTOP, true);
      if (a.bereiche.includes('echt') && DESKTOP_LEER.some(([n]) => only(`${group} ${n}`))) { for (const d of hs) { await d.bereich('echt'); await d.page.addStyleTag({ content: STILL }); } await pair(group, hs, DESKTOP_LEER, true); }
      for (const d of hs) await d.close();
    }
  }
} finally { await s.close(); for (const c of closers) await c(); }

const real = differ.filter((d) => !d.expected), exp = differ.filter((d) => d.expected);
say(`\n== Soll gegen Ist: ${count} screens, ${count - differ.length} equal, ${differ.length} differ${exp.length ? ` (${exp.length} of them named in --erwartet)` : ''}; ${((Date.now() - t0) / 60000).toFixed(1)} min ==`);
if (real.length) { say('DIFFER, and were not expected to:'); for (const d of real) say(`  ${d.full.padEnd(44)} ${d.text}${d.pic ? '\n      ' + d.pic : ''}`); }
if (exp.length) { say('differ as expected (--erwartet):'); for (const d of exp) say(`  ${d.full.padEnd(44)} ${d.text}${d.pic ? '\n      ' + d.pic : ''}`); }
if (!count) say('!! no screen matched --nur: --liste prints the names');
fs.writeFileSync(`${out}/sollist.txt`, lines.join('\n') + '\n');
process.exit(real.length || failed || !count ? 1 : 0);
