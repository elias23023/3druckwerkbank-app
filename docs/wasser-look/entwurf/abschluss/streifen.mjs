// Re-make the owner's strips from the raw pictures of bilder.mjs (labels, notes, enlarged detail rows).  node streifen.mjs <bilder-dir> <out-dir>
import fs from 'fs'; import path from 'path';
import { strip, diff, sharp } from '../../../../scripts/wasser/lib.mjs';
const [IN, OUT] = process.argv.slice(2); const R = path.join(IN, 'roh'); fs.mkdirSync(OUT, { recursive: true });
const L = { vor: 'vorher', nach: 'nachher (neu)' };
const NAME = { start: 'Start', heute: 'Heute', projekte: 'Projekte', bogen: 'Bogen „Neues Projekt“' };
const nums = {};
const pair = (pre, k) => [{ file: `${R}/${pre}-${k}-vor.png`, label: L.vor }, { file: `${R}/${pre}-${k}-nach.png`, label: L.nach }];
const N = { start: '1', heute: '2', projekte: '3', bogen: '4' };
for (const k of ['start', 'heute', 'projekte', 'bogen']) {
  const fr = pair('handy-klar-tag', k); nums['handy klar ' + k] = await diff(fr[0].file, fr[1].file);
  const det = k === 'bogen' ? { x: 0, y: 1000, w: 390, h: 420 } : { x: 40, y: 960, w: 390, h: 420 };
  await strip(fr, `${OUT}/${N[k]}-handy-hell-${k}.png`, { title: `Handy, heller Modus, 12:40 – ${NAME[k]}`, note: 'Mehr Landschaft durch das Wasser.', scale: 0.5, captionSize: 22, details: [{ ...det, factor: 1, label: 'Ausschnitt, doppelt so groß (links vorher, rechts nachher)' }] });
}
for (const k of ['start', 'heute', 'projekte']) {
  const fr = pair('handy-dunkel-nacht', k); nums['handy dunkel ' + k] = await diff(fr[0].file, fr[1].file);
}
{ const fr = pair('handy-dunkel-nacht', 'start'); await strip(fr, `${OUT}/5-handy-dunkel-start-unveraendert.png`, { title: 'Handy, dunkler Modus, 21:30 – Start', note: 'Unten: Unterschied 20-fach verstärkt. Schwarz = gleich.', scale: 0.5, diffGain: 20, captionSize: 22 }); }
const BOX = { start: { x: 0, y: 0, w: 1300, h: 760 }, heute: { x: 160, y: 740, w: 1300, h: 760 }, projekte: { x: 160, y: 1240, w: 1300, h: 746 } };
const D = { start: '6', heute: '7', projekte: '8' };
for (const k of ['start', 'heute', 'projekte']) {
  const fr = pair('desktop-klar-tag', k); if (!fs.existsSync(fr[1].file)) continue; nums['desktop klar ' + k] = await diff(fr[0].file, fr[1].file);
  await strip(fr, `${OUT}/${D[k]}-desktop-hell-${k}.png`, { title: `Desktop 2000 × 993, heller Modus, 12:40 – ${NAME[k]}`, note: 'Oben vorher, unten nachher. Panels durchsichtiger, ein weicher Schatten hält die Titel lesbar.', scale: 0.25, cols: 1, captionSize: 22, details: [{ ...BOX[k], factor: 0.5, label: 'Ausschnitt, doppelt so groß (oben vorher, unten nachher)' }] });
}
for (const f of fs.readdirSync(OUT).filter((n) => n.endsWith('.png'))) { await sharp(path.join(OUT, f)).webp({ quality: 86 }).toFile(path.join(OUT, f.replace(/\.png$/, '.webp'))); fs.rmSync(path.join(OUT, f)); }
console.log(JSON.stringify(Object.fromEntries(Object.entries(nums).map(([k, v]) => [k, { px: v.outside + v.inside, max: Math.max(v.maxOutside, v.maxInside) }]))));
