// One-shot image optimisation: assets-src/*.png -> public/img/*
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const out = 'public/img';
await mkdir(out, { recursive: true });

const landscapes = [
  ['landschaft-tag', 'assets-src/landschaft-tag.png'],
  ['landschaft-nacht', 'assets-src/landschaft-abend.png'],
];
const islands = [
  ['insel-werkstatt', 'assets-src/werkstatt-referenz.png'],
  ['insel-elektronik', 'assets-src/elektronik-insel.png'],
  ['insel-ideen', 'assets-src/ideen-insel.png'],
  ['insel-rahmen', 'assets-src/rahmen-inselbasis.png'],
  ['insel-heute', 'assets-src/insel-heute.png'],
  ['insel-material', 'assets-src/insel-material.png'],
  ['insel-wetter', 'assets-src/insel-wetter.png'],
  ['insel-archiv', 'assets-src/insel-archiv.png'],
  ['insel-drucker', 'assets-src/insel-drucker.png'],
];

for (const [name, src] of landscapes) {
  for (const w of [1672, 960]) {
    const base = sharp(src).resize({ width: w, withoutEnlargement: true });
    await base.clone().avif({ quality: 50 }).toFile(`${out}/${name}-${w}.avif`);
    await base.clone().webp({ quality: 78 }).toFile(`${out}/${name}-${w}.webp`);
  }
  console.log('landscape', name);
}
for (const [name, src] of islands) {
  // trim transparent margins first so sprites sit tight
  const trimmed = sharp(src).trim({ threshold: 8 });
  const meta = await trimmed.clone().toBuffer({ resolveWithObject: true });
  for (const w of [1254, 640, 256]) {
    await sharp(meta.data).resize({ width: w, withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90 }).toFile(`${out}/${name}-${w}.webp`);
  }
  console.log('island', name, meta.info.width, meta.info.height);
}

// sundial dial plate (top-down, alpha) -> 640 / 320 px, rotated by CSS on the Heute island
for (const w of [640, 320]) await sharp('assets-src/sonnenuhr-scheibe.png').resize({ width: w, height: w, fit: 'fill' }).webp({ quality: 84 }).toFile(`${out}/sonnenuhr-scheibe-${w}.webp`);
console.log('dial');
