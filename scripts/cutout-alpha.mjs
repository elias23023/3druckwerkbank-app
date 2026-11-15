// For island renders that already come with an alpha channel but with a "veil": the background is not fully transparent
// (alpha 1..6 in patches) and the island not fully solid (alpha about 250). Stretches alpha (LO and below -> 0, HI and
// above -> 255), trims and writes assets-src/<name>. Colours stay untouched. cutout-holes.mjs is not needed afterwards.
// usage: node scripts/cutout-alpha.mjs <srcDir> [--lo 12] [--hi 240]   (used for projekte, druck, material, Nov 2026)
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const args = process.argv.slice(2); const src = args[0];
const opt = (name, d) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : d; };
const LO = opt('--lo', 12), HI = opt('--hi', 240);
for (const f of readdirSync(src).filter((n) => /^insel-.*\.png$/.test(n))) {
  const { data: px, info } = await sharp(`${src}/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let veil = 0, soft = 0;
  for (let i = 3; i < px.length; i += 4) { const a = px[i]; if (a > 0 && a <= LO) veil++; if (a >= HI && a < 255) soft++; px[i] = a <= LO ? 0 : a >= HI ? 255 : Math.round(((a - LO) / (HI - LO)) * 255); }
  const out = await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 2 }).png().toBuffer({ resolveWithObject: true });
  await sharp(out.data).toFile(`assets-src/${f}`);
  console.log(f, out.info.width, out.info.height, 'veil px', veil, 'solid again', soft);
}
