// assets-src/szenen/seite-<key>.png (830x1896, the user's portrait pictures, one per page of the phone view:
// start, heute, projekte, innen, druck, material, wetter, archiv) -> public/img/seite-<key>-{830,540}.webp (never upscaled)
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
for (const f of readdirSync('assets-src/szenen').filter((f) => /^seite-.+\.png$/.test(f))) {
  const key = f.replace(/^seite-/, '').replace(/\.png$/, '');
  for (const w of [830, 540]) await sharp(`assets-src/szenen/${f}`).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(`public/img/seite-${key}-${w}.webp`);
  console.log('seite', key);
}
