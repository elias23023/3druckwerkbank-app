// assets-src/landschaft-NN-<key>.png -> public/img/landschaft-<key>-{1672,1280}.{avif,webp}
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const out = 'public/img';
const files = readdirSync('assets-src').filter((f) => /^landschaft-\d\d-.+\.png$/.test(f));
for (const f of files) {
  const raw = f.replace(/^landschaft-\d\d-/, '').replace(/\.png$/, '');
  const key = ({ 'goldene-stunde': 'golden', 'blaue-stunde': 'blau', mondnacht: 'nacht' })[raw] ?? raw;
  for (const w of [1672, 1280]) {
    const r = sharp(`assets-src/${f}`).resize({ width: w, withoutEnlargement: true });
    await r.clone().avif({ quality: 54 }).toFile(`${out}/landschaft-${key}-${w}.avif`);
    await r.clone().webp({ quality: 82 }).toFile(`${out}/landschaft-${key}-${w}.webp`);
  }
  console.log('landscape', key);
}
