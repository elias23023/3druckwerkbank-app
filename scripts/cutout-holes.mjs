// Removes enclosed near-white leftovers (background seen through frames, windows, between posts) from island sprites.
// A region is cut when every pixel is near pure white (min channel >= 247), it is not reachable from the transparent
// background and it has at least MIN px. Edge pixels are feathered. usage: node scripts/cutout-holes.mjs <png> [<png>...]
// Not every such region is background: white objects (printed parts, a caliper), lamp light, glass and waterfall foam look
// the same. scripts/cutout-holes-keep.json lists, per file name, boxes [x0, y0, x1, y1] (pixels of the sprite as the
// cutout left it); a region lying completely inside one of them stays. The boxes were picked by eye for the project
// islands of Nov 2026 and only fit the sprites exactly as cutout-islands.mjs --waterfall produces them (bereich-smarthome
// and bereich-technik with --waterfall --mist; their lowest box keeps the mist below the fall).
// --umfeld (photographic islands, Nov 2026): blown highlights (foam, lamp light, water lilies, white prints) are pure white
// there too, far too many for boxes. With the flag a region is only cut when its surroundings are not light: of the pixels
// 3 to 5 px outside it (other white regions do not count, the transparent background counts as not light), fewer than
// LIGHT_MAX may be light (min channel >= LIGHT). Background seen through leaves, needles, roots, posts or a ring is framed
// by leaf, wood, rock or open background; a highlight by its own bright fall-off. Prints how many it left alone.
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
const MIN = 40, LIGHT = 205, LIGHT_MAX = 0.35;
const UMFELD = process.argv.includes('--umfeld');
const KEEP = JSON.parse(readFileSync(new URL('./cutout-holes-keep.json', import.meta.url), 'utf8'));
for (const file of process.argv.slice(2).filter((f) => !f.startsWith('--'))) {
  const { data: px, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const white = new Uint8Array(N); for (let i = 0; i < N; i++) { const o = i * 4; if (px[o + 3] > 0 && px[o] >= 247 && px[o + 1] >= 247 && px[o + 2] >= 247) white[i] = 1; }
  const keep = KEEP[file.split('/').pop()] ?? []; let kept = 0, bright = 0; const inReg = new Uint8Array(N);
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
    if (pts.length < MIN) continue;
    let x0 = W, y0 = H, x1 = 0, y1 = 0; for (const i of pts) { const x = i % W, y = (i / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (keep.some(([a, b, c, d]) => x0 >= a && y0 >= b && x1 <= c && y1 <= d)) { kept++; continue; }
    if (UMFELD) {
      for (const i of pts) inReg[i] = 1; let n = 0, light = 0;
      for (const i of pts) { const x = i % W, y = (i / W) | 0;
        if (x > 0 && x < W - 1 && y > 0 && y < H - 1 && inReg[i - 1] && inReg[i + 1] && inReg[i - W] && inReg[i + W]) continue;
        for (const d of [3, 5]) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, d], [d, -d], [-d, -d]]) {
          const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (inReg[j] || white[j]) continue; const al = px[j * 4 + 3]; if (al === 0) { n++; continue; } if (al < 200) continue;
          n++; if (Math.min(px[j * 4], px[j * 4 + 1], px[j * 4 + 2]) >= LIGHT) light++; } }
      for (const i of pts) inReg[i] = 0;
      if (n && light / n >= LIGHT_MAX) { bright++; continue; }
    }
    for (const i of pts) cut[i] = 1; removed += pts.length; regions++;
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
  console.log(file.split('/').pop(), 'regions', regions, 'px', removed, 'kept', kept, UMFELD ? `| light surroundings, left alone: ${bright}` : '');
}
