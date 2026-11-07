// assets-src/szenen/szene-<key>.png -> public/img/szene-<key>-{1280,640}.webp (mobile backgrounds)
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
for (const f of readdirSync('assets-src/szenen').filter((f) => /^szene-.+\.png$/.test(f))) {
  const key = f.replace(/^szene-/, '').replace(/\.png$/, '');
  for (const w of [1280, 640]) await sharp(`assets-src/szenen/${f}`).resize({ width: w }).webp({ quality: 80 }).toFile(`public/img/szene-${key}-${w}.webp`);
  console.log('scene', key);
}
