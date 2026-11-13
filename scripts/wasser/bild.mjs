// Stills of the look: the harness page (scripts/wasser/mobil.html) and the REAL app, in both tones.
//
//   node scripts/wasser/bild.mjs <out-dir> [was] [--look vorlage|<folder>|ohne] [--toene dunkel,klar] [--engine chromium|webkit|firefox] [--query fallback=1] [--reduced]
//
//   was = szenen   all eight scenes of the phone view (390 x 844 @2x): <ton>-<scene>.png, and one contact sheet <ton>-szenen.png
//         nah      close-ups of the buttons, free over the scene and on a card: <ton>-nah-<scene>.png (start, wetter, innen)
//         alles    the phone view with a bottom sheet full of the small building blocks (?alles=1): <ton>-alles.png
//         app      the real app, look injected once: main screens, a project, sheets with forms, search, toast:
//                  <ton>-app-<name>.png and a contact sheet <ton>-app.png   (needs npm run build && npm run preview)
//         (nothing) = szenen, nah, alles and app
//   --look ohne    the app as it is today, without the look.
// Look at the pictures themselves; a contact sheet only finds them.
import { session, strip, args, abs, mkdir, SZENEN } from './lib.mjs';
const a = args({ look: 'vorlage', toene: 'dunkel,klar', engine: 'chromium', query: '' }); if (!a._[0]) { console.log('usage: node scripts/wasser/bild.mjs <out-dir> [szenen|nah|alles|app] [--look vorlage|<folder>|ohne] [--toene dunkel,klar] [--engine chromium|webkit|firefox]'); process.exit(1); }
const out = mkdir(abs(a._[0])); const was = a._[1] || ''; const look = a.look === 'ohne' ? '' : a.look; const s = await session({ engine: a.engine }); const reduced = !!a.reduced;
const say = (h, name) => { const e = h.errors.filter((x) => !/open-meteo|Failed to load resource|ERR_|net::/i.test(x)); if (e.length) console.log(name, 'errors:', e.slice(0, 3)); };
for (const ton of a.toene.split(',')) {
  if (!was || was === 'szenen') {
    const frames = [];
    for (const scene of SZENEN) { const h = await s.harness({ look, ton, scene, reduced, query: a.query }); const file = `${out}/${ton}-${scene}.png`; await h.page.screenshot({ path: file }); frames.push({ file, label: scene }); say(h, scene); await h.close(); }
    await strip(frames, `${out}/${ton}-szenen.png`, { title: `Vorlage Mobil, Ton ${ton}: die acht Szenen`, scale: 0.5, cols: 8 });
  }
  if (!was || was === 'nah') for (const scene of ['start', 'wetter', 'innen']) { const h = await s.harness({ look, ton, scene, nah: true, reduced, query: a.query }); await h.page.screenshot({ path: `${out}/${ton}-nah-${scene}.png` }); say(h, 'nah ' + scene); await h.close(); }
  if (!was || was === 'alles') { const h = await s.harness({ look, ton, reduced, query: 'alles=1' + (a.query ? '&' + a.query : ''), settle: 2200 }); await h.page.screenshot({ path: `${out}/${ton}-alles.png` }); say(h, 'alles'); await h.close(); }
  if (!was || was === 'app') {
    const h = await s.app({ look, ton, reduced }); const frames = [];
    const step = async (name, fn) => { try { await fn(); const file = `${out}/${ton}-app-${name}.png`; await h.shot(file); frames.push({ file, label: name }); } catch (e) { console.log('!!', name, String(e).split('\n')[0].slice(0, 140)); } };
    await step('start', () => h.go('#/start')); await step('heute', () => h.go('#/heute')); await step('projekte', () => h.go('#/projekte')); await step('projekt', () => h.project());
    await step('material', () => h.go('#/material')); await step('mehr', () => h.go('#/druck'));
    await step('bogen-projekt', () => h.sheet('projekt')); await h.closeSheet(); await step('bogen-rolle', () => h.sheet('rolle')); await h.closeSheet();
    await step('bogen-einstellungen', () => h.sheet('einstellungen')); await h.closeSheet(); await step('bogen-konto', () => h.sheet('konto')); await h.closeSheet();
    await step('suche', async () => { await h.sheet('suche'); await h.page.keyboard.type('sens'); await h.page.waitForTimeout(600); }); await h.page.keyboard.press('Escape'); await h.page.waitForTimeout(300);
    await step('hinweis', () => h.sheet('toast'));
    await strip(frames, `${out}/${ton}-app.png`, { title: `Vorlage Mobil in der echten App, Ton ${ton}`, scale: 0.5, cols: 6 }); say(h, 'app'); await h.close();
  }
}
await s.close(); console.log('ok', out);
