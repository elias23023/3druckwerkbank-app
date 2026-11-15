// assets-src/szenen/szene-<season>-<key>.png (830x1846, portrait Alpensee: scripts/prepare-alpensee.mjs, grade-regen.mjs)
// -> public/img/szene-<season>-<key>-{830,540}.webp (phone backgrounds, never upscaled)
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
for (const f of readdirSync('assets-src/szenen').filter((f) => /^szene-.+\.png$/.test(f))) {
  const key = f.replace(/^szene-/, '').replace(/\.png$/, '');
  for (const w of [830, 540]) await sharp(`assets-src/szenen/${f}`).resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toFile(`public/img/szene-${key}-${w}.webp`);
  console.log('scene', key);
}
