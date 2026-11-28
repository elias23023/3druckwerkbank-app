// node scripts/optimize-island.mjs [--quelle <px>] <name>...
//   assets-src/insel-<name>.png -> public/img/insel-<name>-{1254,640,256}.webp (trimmed); prints ISLAND_META sizes.
//   A source of 2048 px and more also gives insel-<name>-2048.webp (for large and sharp screens); such islands go into
//   GROSS_INSELN (src/scene/Island.tsx), which adds the file to the srcset.
//   --quelle <px>: first shrinks the (trimmed) source itself to that width. For pictures of 3000 px and more, which would put
//   15 to 20 MB each into git: cut out at full size, then shrink once (the six photographic main islands: --quelle 2048).
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
const args = process.argv.slice(2); let quelle = 0;
const qi = args.indexOf('--quelle'); if (qi >= 0) { quelle = +args[qi + 1]; args.splice(qi, 2); }
for (const name of args) {
  const file = `assets-src/insel-${name}.png`;
  let meta = await sharp(file).ensureAlpha().trim({ threshold: 8 }).toBuffer({ resolveWithObject: true });
  if (quelle && meta.info.width > quelle) {
    meta = await sharp(meta.data).resize({ width: quelle, kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer({ resolveWithObject: true });
    writeFileSync(file, meta.data);
  }
  const widths = meta.info.width >= 2048 ? [2048, 1254, 640, 256] : [1254, 640, 256];
  for (const w of widths) await sharp(meta.data).resize({ width: w, withoutEnlargement: true }).webp({ quality: w === 2048 ? 84 : 82, alphaQuality: 90 }).toFile(`public/img/insel-${name}-${w}.webp`);
  console.log(`'${name}': { w: ${meta.info.width}, h: ${meta.info.height} },${widths.length === 4 ? '   // + 2048' : ''}`);
}
