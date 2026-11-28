// assets-src/landschaft-<set>-<key>.{png,jpg} (key: daemmerung, morgen, mittag, abend, blau, nacht, regen; see LOOK_PHASE in
// src/scene/looks.ts; <set> = wolken, or a season for the Alpensee) -> public/img/landschaft-<set>-<key>-<width>.{avif,webp}
// Widths: 1280 and 1672 always, 2560 and 3840 only from a source that wide (the sea of clouds; nothing is upscaled).
// usage: node scripts/optimize-landscapes.mjs [<set>]     e.g. wolken; without it every landscape is written again
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const out = 'public/img', only = process.argv[2];
const files = readdirSync('assets-src').filter((f) => /^landschaft-.+\.(png|jpg)$/.test(f) && (!only || f.startsWith(`landschaft-${only}-`)));
for (const f of files) {
  const key = f.replace(/^landschaft-/, '').replace(/\.(png|jpg)$/, '');
  const { width } = await sharp(`assets-src/${f}`).metadata();
  for (const w of [3840, 2560, 1672, 1280]) {
    if (w > 1672 && width < w) continue;
    const r = sharp(`assets-src/${f}`).resize({ width: w, withoutEnlargement: true });
    await r.clone().avif({ quality: w > 1672 ? 50 : 54 }).toFile(`${out}/landschaft-${key}-${w}.avif`);
    await r.clone().webp({ quality: w > 1672 ? 80 : 82 }).toFile(`${out}/landschaft-${key}-${w}.webp`);
  }
  console.log('landscape', key, width);
}
