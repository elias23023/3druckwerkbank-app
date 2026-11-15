// Every look in every season must find its pictures: the desktop landscape (landschaft-<season>-<phase>-{1280,1672}.{avif,webp})
// and the phone background (szene-<season>-<phase>-{540,830}.webp). Also lists pictures no look uses any more.
// Runs after the build (package.json "build"); without an argument it checks public/img.
// usage: node scripts/check-hintergruende.mjs [dist]
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { LOOKS, landscapeKey } from '../src/scene/looks.ts';
import { SEASONS } from '../src/lib/season.ts';

const dir = path.join(process.argv[2] ?? 'public', 'img');
const want = new Set();
for (const season of SEASONS) for (const look of LOOKS) {
  const key = landscapeKey(look, season);
  for (const w of [1280, 1672]) for (const ext of ['avif', 'webp']) want.add(`landschaft-${key}-${w}.${ext}`);
  for (const w of [540, 830]) want.add(`szene-${key}-${w}.webp`);
}
const missing = [...want].filter((f) => !existsSync(path.join(dir, f)));
const unused = readdirSync(dir).filter((f) => /^(landschaft|szene)-/.test(f) && !want.has(f));
if (unused.length) console.warn(`check-hintergruende: ${unused.length} Bilder ohne Look: ${unused.join(', ')}`);
if (missing.length) { console.error(`check-hintergruende: ${missing.length} fehlen in ${dir}: ${missing.join(', ')}`); process.exit(1); }
console.log(`check-hintergruende: ${LOOKS.length} Looks x ${SEASONS.length} Jahreszeiten -> ${want.size} Dateien in ${dir} vorhanden`);
