// node scripts/optimize-island.mjs <name>...  : assets-src/insel-<name>.png -> public/img/insel-<name>-{1254,640,256}.webp (trimmed); prints ISLAND_META sizes
import sharp from 'sharp';
for (const name of process.argv.slice(2)) {
  const trimmed = sharp(`assets-src/insel-${name}.png`).ensureAlpha().trim({ threshold: 8 });
  const meta = await trimmed.clone().toBuffer({ resolveWithObject: true });
  for (const w of [1254, 640, 256]) await sharp(meta.data).resize({ width: w, withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90 }).toFile(`public/img/insel-${name}-${w}.webp`);
  console.log(`'${name}': { w: ${meta.info.width}, h: ${meta.info.height} },`);
}
