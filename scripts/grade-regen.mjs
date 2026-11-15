// Grey weather (looks bedeckt, nebel, regen) has no painted image of its own: per season the noon image (03-mittag) is
// graded into an overcast mood - less colour, darker, cooler, flatter contrast and a light haze that is thickest over the
// mountains. Only colour work on the user's own image: nothing is painted, nothing is added.
//   assets-src/landschaft-<season>-mittag.png        -> assets-src/landschaft-<season>-regen.png        (desktop)
// A real rain image from the user would be better; until then this stands in for it.
// usage: node scripts/grade-regen.mjs   (then optimize-landscapes.mjs)
import sharp from 'sharp';
import { existsSync } from 'node:fs';

const SEASONS = ['fruehling', 'sommer', 'herbst', 'winter'];
const HAZE = '178,186,196';   // the colour of the haze: a cool, light grey
const WATERLINE = 0.38;       // about where the shore lies in the desktop images; the haze fades out below it

async function grade(src, out, waterline) {
  const { width, height } = await sharp(src).metadata();
  const haze = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="rgb(${HAZE})" stop-opacity=".3"/><stop offset="${(waterline * 0.85).toFixed(3)}" stop-color="rgb(${HAZE})" stop-opacity=".22"/>
    <stop offset="${(waterline + 0.06).toFixed(3)}" stop-color="rgb(${HAZE})" stop-opacity=".08"/><stop offset="1" stop-color="rgb(${HAZE})" stop-opacity="0"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#h)"/></svg>`);
  const graded = await sharp(src).removeAlpha()
    .modulate({ saturation: 0.4, brightness: 0.76 })              // less colour, less light
    .linear([0.86, 0.88, 0.92], [9, 12, 17])                      // flatter contrast (lifted blacks, lower whites), a touch cooler
    .toBuffer();
  await sharp(graded).composite([{ input: haze }]).png({ compressionLevel: 9 }).toFile(out);
  console.log('regen', out);
}

for (const s of SEASONS) {
  const d = `assets-src/landschaft-${s}-mittag.png`;
  if (existsSync(d)) await grade(d, `assets-src/landschaft-${s}-regen.png`, WATERLINE);
}
