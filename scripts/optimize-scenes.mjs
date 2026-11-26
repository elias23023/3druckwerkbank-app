// assets-src/szenen/seite-<key>.jpg or .png (the user's portrait pictures 9:20.5, one per page of the phone view: start, heute, projekte,
// innen, druck, material, wetter, archiv; since 26.11. enlarged to 2160x4928, and seite-<key>-nacht.jpg: the same place at night)
// -> public/img/seite-<key>[-nacht]-{1290,830,540}.webp (never upscaled: a narrower source keeps its own width under the larger name)
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
for (const f of readdirSync('assets-src/szenen').filter((f) => /^seite-.+\.(png|jpg)$/.test(f))) {
  const key = f.replace(/^seite-/, '').replace(/\.(png|jpg)$/, '');
  for (const w of [1290, 830, 540]) await sharp(`assets-src/szenen/${f}`).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(`public/img/seite-${key}-${w}.webp`);
  console.log('seite', key);
}
