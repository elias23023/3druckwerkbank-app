// Removes enclosed near-white leftovers (background seen through frames, windows, between posts) from island sprites.
// A region is cut when every pixel is near pure white (min channel >= 247), it is not reachable from the transparent
// background and it has at least MIN px. Edge pixels are feathered. usage: node scripts/cutout-holes.mjs <png> [<png>...]
import sharp from 'sharp';
const MIN = 40;
for (const file of process.argv.slice(2)) {
  const { data: px, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const white = new Uint8Array(N); for (let i = 0; i < N; i++) { const o = i * 4; if (px[o + 3] > 0 && px[o] >= 247 && px[o + 1] >= 247 && px[o + 2] >= 247) white[i] = 1; }
  const seen = new Uint8Array(N); const cut = new Uint8Array(N); let removed = 0, regions = 0;
  const stack = [];
  for (let s = 0; s < N; s++) {
    if (!white[s] || seen[s]) continue;
    const pts = []; let touches = false; stack.push(s); seen[s] = 1;
    while (stack.length) {
      const i = stack.pop(); pts.push(i); const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx;
        if (px[j * 4 + 3] === 0) touches = true; else if (white[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
      }
    }
    if (pts.length >= MIN) { for (const i of pts) cut[i] = 1; removed += pts.length; regions++; }
  }
  // feather: neighbours of cut pixels get alpha from luminance (bright fringe -> more transparent)
  for (let i = 0; i < N; i++) {
    if (cut[i]) { px[i * 4 + 3] = 0; continue; }
    const x = i % W, y = (i / W) | 0; let nb = 0;
    if (x > 0 && cut[i - 1]) nb++; if (x < W - 1 && cut[i + 1]) nb++; if (y > 0 && cut[i - W]) nb++; if (y < H - 1 && cut[i + W]) nb++;
    if (!nb) continue;
    const lum = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3; const a = Math.round(255 - Math.min(255, Math.max(0, (lum - 150) * 2.2)));
    if (a < px[i * 4 + 3]) { const k = a / 255; if (k > 0 && k < 1) for (let c = 0; c < 3; c++) px[i * 4 + c] = Math.max(0, Math.min(255, Math.round((px[i * 4 + c] - 255 * (1 - k)) / k))); px[i * 4 + 3] = a; }
  }
  await sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toFile(file + '.tmp');
  await sharp(file + '.tmp').toFile(file); const { unlinkSync } = await import('node:fs'); unlinkSync(file + '.tmp');
  console.log(file.split('/').pop(), 'regions', regions, 'px', removed);
}
