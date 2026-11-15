// Last step for islands rendered on white whose foliage lets the background shine through as a cream glow or as white
// specks too small or too warm for cutout-holes.mjs (it only cuts regions of pure white with 40 px and more).
// Inside the boxes listed per file in scripts/cutout-glow.json ([x0, y0, x1, y1], pixels of the sprite in assets-src),
// every light, unsaturated pixel (min channel >= LO, max - min < SAT) becomes transparent by its lightness (fully from
// HI on) and loses its white share. Leaves, wood and rock (saturated or darker) stay. Boxes must not contain real white:
// flowers, lamp light, foam. usage: node scripts/cutout-glow.mjs assets-src/insel-<name>.png ...   (heute, archiv, Nov 2026)
import sharp from 'sharp';
import { readFileSync, renameSync } from 'node:fs';
const BOXES = JSON.parse(readFileSync(new URL('./cutout-glow.json', import.meta.url), 'utf8'));
const LO = 205, HI = 243, SAT = 55, EDGE_LO = 150, EDGE_SAT = 115, RIM_LO = 85, RIM_SAT = 75;
for (const file of process.argv.slice(2)) {
  const boxes = BOXES[file.split('/').pop()] ?? [];
  const { data: px, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width; let n = 0;
  for (const [x0, y0, x1, y1] of boxes) for (let y = Math.max(0, y0); y <= Math.min(info.height - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
    const o = (y * W + x) * 4; if (!px[o + 3]) continue;
    const mn = Math.min(px[o], px[o + 1], px[o + 2]), mx = Math.max(px[o], px[o + 1], px[o + 2]);
    if (mn < LO || mx - mn >= SAT) continue;
    const k = Math.max(0, 1 - (mn - LO) / (HI - LO)); const a = Math.round(px[o + 3] * k); if (a >= px[o + 3]) continue;
    if (k > 0) for (let c = 0; c < 3; c++) px[o + c] = Math.max(0, Math.min(255, Math.round((px[o + c] - 255 * (1 - k)) / k)));
    px[o + 3] = a; n++;
  }
  // fringe: pale pixels left at the rim of the openings (mixed leaf and white) lose their white share too: first the
  // greyish pixels directly at the rim (leaf or bark mixed half with white), then two rounds of pale ones behind them
  for (let round = 0; round < 3; round++) {
    const al = new Uint8Array(W * info.height); for (let i = 0; i < al.length; i++) al[i] = px[i * 4 + 3];
    for (const [x0, y0, x1, y1] of boxes) for (let y = Math.max(1, y0); y <= Math.min(info.height - 2, y1); y++) for (let x = Math.max(1, x0); x <= Math.min(W - 2, x1); x++) {
      const i = y * W + x, o = i * 4; if (al[i] < 128) continue;
      if (al[i - 1] >= 128 && al[i + 1] >= 128 && al[i - W] >= 128 && al[i + W] >= 128) continue;
      const mn = Math.min(px[o], px[o + 1], px[o + 2]), mx = Math.max(px[o], px[o + 1], px[o + 2]);
      const lo = round ? EDGE_LO : RIM_LO; if (mn < lo || mx - mn >= (round ? EDGE_SAT : RIM_SAT)) continue;
      const k = Math.max(0.1, 1 - (mn - lo) / (HI - lo));
      for (let c = 0; c < 3; c++) px[o + c] = Math.max(0, Math.min(255, Math.round((px[o + c] - 255 * (1 - k)) / k)));
      px[o + 3] = Math.round(px[o + 3] * k); n++;
    }
  }
  await sharp(px, { raw: { width: W, height: info.height, channels: 4 } }).png().toFile(file + '.tmp'); renameSync(file + '.tmp', file);
  console.log(file.split('/').pop(), 'boxes', boxes.length, 'px', n);
}
