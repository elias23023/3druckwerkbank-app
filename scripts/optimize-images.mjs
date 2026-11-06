// One-shot image optimisation: assets-src/*.png -> public/img/*
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const out = 'public/img';
await mkdir(out, { recursive: true });

const landscapes = [];
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
  ['insel-projekt-garten', 'assets-src/insel-projekt-garten.png'],
  ['insel-projekt-haushalt', 'assets-src/insel-projekt-haushalt.png'],
  ['insel-projekt-fahrzeug', 'assets-src/insel-projekt-fahrzeug.png'],
  ['insel-projekt-buero', 'assets-src/insel-projekt-buero.png'],
  ['insel-projekt-hobby', 'assets-src/insel-projekt-hobby.png'],
  ['insel-projekt-technik', 'assets-src/insel-projekt-technik.png'],
  ['insel-projekt-deko', 'assets-src/insel-projekt-deko.png'],
  ['insel-projekt-modell', 'assets-src/insel-projekt-modell.png'],
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

