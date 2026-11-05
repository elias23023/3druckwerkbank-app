// Removes the plain white background from AI-generated island renders (flood fill from the corners), feathers the edge,
// un-tints the light fringe and trims. usage: node scripts/cutout-islands.mjs <srcDir>
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const src = process.argv[2];
const names = readdirSync(src).filter((f) => /^(insel|sonnenuhr|zeiger)-.*\.png$/.test(f));
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
  // un-premultiply the white fringe on semi-transparent pixels
  for (let i = 0; i < W * H; i++) { const a = alpha[i] / 255; if (a > 0 && a < 1) { for (let c = 0; c < 3; c++) { const v = px[i * 4 + c]; px[i * 4 + c] = Math.max(0, Math.min(255, (v - 255 * (1 - a)) / a)); } } px[i * 4 + 3] = alpha[i]; }
  const out = await sharp(px, { raw: { width: W, height: H, channels: 4 } }).trim({ threshold: 2 }).png().toBuffer();
  const meta = await sharp(out).metadata();
  await sharp(out).toFile(`assets-src/${f}`);
  console.log(f, meta.width, meta.height);
}
