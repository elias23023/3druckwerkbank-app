// Removes the plain white background from AI-generated island renders (flood fill from the corners), feathers the edge,
// un-tints the light fringe and trims. usage: node scripts/cutout-islands.mjs <srcDir> [--waterfall]
// --waterfall: for islands whose waterfall foam runs into the white background (bottom edge). The flood fill eats the
// foam's lower end there and leaves ragged, hard-ended streaks. With the flag the script finds the waterfall columns
// (solid, light, unsaturated pixels in the lower 40 %), measures per column where the foam ends and fades the foam
// out over FADE px above that end; faded and edge foam keep their own white colour (no un-premultiply), so the fall
// ends in white mist instead of grey outlines. Rock, roots and leaves (dark or saturated) are never faded, and outside
// the waterfall columns the result is the same as without the flag. Prints the detected columns.
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const src = process.argv[2];
const WATERFALL = process.argv.includes('--waterfall');
const names = readdirSync(src).filter((f) => /^(insel|sonnenuhr|zeiger)-.*\.png$/.test(f));
// waterfall mode: length of the fade at the lower end of the foam, soft margin of the zone (px of the source image)
const FADE = 90, ZONE_PAD = 28;
for (const f of names) {
  const img = sharp(`${src}/${f}`).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info; const px = data;
  const bg = new Uint8Array(W * H); const stack = [];
  const isWhite = (i) => px[i * 4] > 232 && px[i * 4 + 1] > 232 && px[i * 4 + 2] > 232;
  for (const i of [0, W - 1, (H - 1) * W, H * W - 1]) stack.push(i);
  while (stack.length) { const i = stack.pop(); if (bg[i] || !isWhite(i)) continue; bg[i] = 1; const x = i % W, y = (i / W) | 0; if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1); if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W); }
  // soft alpha: bg -> 0, edge pixels partially by brightness
  const alpha = Buffer.alloc(W * H);
  for (let i = 0; i < W * H; i++) {
    if (bg[i]) { alpha[i] = 0; continue; }
    const x = i % W, y = (i / W) | 0; let nb = 0;
    if (x > 0 && bg[i - 1]) nb++; if (x < W - 1 && bg[i + 1]) nb++; if (y > 0 && bg[i - W]) nb++; if (y < H - 1 && bg[i + W]) nb++;
    if (nb === 0) { alpha[i] = 255; continue; }
    const lum = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3; alpha[i] = Math.round(255 - Math.min(255, Math.max(0, (lum - 150) * 2.2)));
  }
  const keep = new Uint8Array(W * H);
  if (WATERFALL) {
    const minC = (i) => Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]);
    // zone: the waterfall columns = runs of solid, light, unsaturated pixels (foam) in the lower 40 % of the image; runs
    // whose peak reaches half the strongest one count, so a second fall is kept and white flowers or roots are not
    const col = new Float64Array(W);
    for (let y = Math.floor(H * 0.6); y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x, o = i * 4; const mn = minC(i), mx = Math.max(px[o], px[o + 1], px[o + 2]); if (!bg[i] && mn > 185 && mx - mn < 40) col[x]++; }
    const sm = new Float64Array(W); for (let x = 0; x < W; x++) { let s = 0, n = 0; for (let k = -6; k <= 6; k++) if (x + k >= 0 && x + k < W) { s += col[x + k]; n++; } sm[x] = s / n; }
    const peak = Math.max(...sm); const runs = [];
    for (let x = 0; x < W;) { if (sm[x] < peak * 0.25) { x++; continue; } let e = x; while (e < W && sm[e] >= peak * 0.25) e++; runs.push([x, e - 1, Math.max(...sm.slice(x, e))]); x = e; }
    const zones = runs.filter((r) => r[2] >= peak * 0.5).map((r) => [r[0], r[1]]);
    const wx = new Float64Array(W);
    for (const [a, b] of zones) for (let x = Math.max(0, a - ZONE_PAD); x <= Math.min(W - 1, b + ZONE_PAD); x++) { const d = x < a ? (x - (a - ZONE_PAD)) / ZONE_PAD : x > b ? ((b + ZONE_PAD) - x) / ZONE_PAD : 1; wx[x] = Math.max(wx[x], d); }
    // fade: per column the lower end of the foam (lowest row with 3 foam px in 7), smoothed; above it the foam (light,
    // unsaturated incl. its grey-blue shadows; never brown roots or rock) fades out over FADE px. Faded and edge foam keep
    // their own white colour (no un-premultiply), so the end reads as white mist and not as a grey outline.
    const fy0 = Math.floor(H * 0.6); const yEnd = new Int32Array(W).fill(-1);
    const foamStrict = (i) => { const o = i * 4, mn = minC(i), mx = Math.max(px[o], px[o + 1], px[o + 2]); return !bg[i] && mn > 185 && mx - mn < 40; };
    const foamSoft = (i) => { const o = i * 4, mn = minC(i), mx = Math.max(px[o], px[o + 1], px[o + 2]); return !bg[i] && mn > 110 && mx - mn < 35; };
    for (let x = 0; x < W; x++) { if (wx[x] <= 0) continue; let run = 0; for (let y = fy0; y < H; y++) { run += foamStrict(y * W + x) ? 1 : 0; if (y - 7 >= fy0 && foamStrict((y - 7) * W + x)) run--; if (run >= 3) yEnd[x] = y; } }
    const yEndS = new Int32Array(W).fill(-1); for (let x = 0; x < W; x++) { if (wx[x] <= 0) continue; for (let k = -12; k <= 12; k++) if (x + k >= 0 && x + k < W) yEndS[x] = Math.max(yEndS[x], yEnd[x + k]); }
    for (let x = 0; x < W; x++) {
      if (wx[x] <= 0 || yEndS[x] < 0) continue;
      for (let y = fy0; y < H; y++) {
        const i = y * W + x; if (!foamSoft(i)) continue;
        keep[i] = 1;
        const f = Math.min(1, Math.max(0, (yEndS[x] - y) / FADE)); if (f >= 1) continue;
        const mult = 1 - wx[x] * (1 - Math.pow(f, 1.3)); alpha[i] = Math.round(alpha[i] * mult);
      }
    }
    console.log(f, 'waterfall zones', JSON.stringify(zones));
  }
  // un-premultiply the white fringe on semi-transparent pixels
  for (let i = 0; i < W * H; i++) { const a = alpha[i] / 255; if (a > 0 && a < 1 && !keep[i]) { for (let c = 0; c < 3; c++) { const v = px[i * 4 + c]; px[i * 4 + c] = Math.max(0, Math.min(255, (v - 255 * (1 - a)) / a)); } } px[i * 4 + 3] = alpha[i]; }
  const out = await sharp(px, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 2 }).png().toBuffer();
  const meta = await sharp(out).metadata();
  await sharp(out).toFile(`assets-src/${f}`);
  console.log(f, meta.width, meta.height);
}
