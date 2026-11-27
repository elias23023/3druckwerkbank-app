// Night versions of the main islands, lying exactly over their day pictures in the app.
//
// 1. node scripts/island-nacht.mjs vorlage <outDir> <name>...
//      assets-src/insel-<name>.png (day, cut out) -> <outDir>/insel-<name>.jpg: the island on white in a 3:2 frame with a margin
//      (a picture AI keeps shape and place only when it does not have to fill another format), and <outDir>/rahmen.json
//      (where the island lies in that frame). The AI relights this picture as night, on white, in 3:2.
// 2. node scripts/island-nacht.mjs einbauen <dir> <name>...
//      <dir>/insel-<name>-nacht.png (the AI's picture) + <dir>/rahmen.json -> assets-src/insel-<name>-nacht.png in the day
//      picture's own frame (same size and the same trim as optimize-island.mjs gives the day picture) and public/img/insel-<name>-nacht-{1254,640,256}.webp.
//      Cut out on its own (white from the corners, soft edge, un-tinted fringe); white enclosed by the island (the hole of the
//      ring, gaps in foliage) goes where the DAY picture is open too, so white flowers stay; nothing reaches further out
//      than the day picture's outline plus REACH px (its soft waterfall end is kept that way). Prints how well both agree.
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
const [mode, dir, ...names] = process.argv.slice(2);
const REACH = 7, DRIFT = 5;
if (mode === 'vorlage') {
  mkdirSync(dir, { recursive: true }); const map = {};
  for (const k of names) {
    const m = await sharp(`assets-src/insel-${k}.png`).metadata(); const w = m.width, h = m.height;
    let Wc = Math.ceil(Math.max(w * 1.12, h * 1.12 * 1.5)); Wc += Wc % 2; const Hc = Math.round(Wc / 1.5); const ox = Math.round((Wc - w) / 2), oy = Math.round((Hc - h) / 2);
    map[k] = { w, h, Wc, Hc, ox, oy };
    await sharp({ create: { width: Wc, height: Hc, channels: 3, background: '#ffffff' } }).composite([{ input: await sharp(`assets-src/insel-${k}.png`).png().toBuffer(), left: ox, top: oy }]).jpeg({ quality: 95 }).toFile(`${dir}/insel-${k}.jpg`);
  }
  writeFileSync(`${dir}/rahmen.json`, JSON.stringify(map, null, 1)); console.log(Object.keys(map).join(' '), '->', dir);
} else if (mode === 'einbauen') {
  const map = JSON.parse(readFileSync(`${dir}/rahmen.json`, 'utf8'));
  // max filter (square, radius r) over one channel
  const grow = (src, W, H, r) => { const t = new Uint8Array(W * H), o = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 0; for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < W) { const v = src[y * W + xx]; if (v > m) m = v; } } t[y * W + x] = m; }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let m = 0; for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < H) { const v = t[yy * W + x]; if (v > m) m = v; } } o[y * W + x] = m; }
    return o; };
  for (const k of names) {
    const f = map[k]; const { w, h, Wc: W, Hc: H, ox, oy } = f;
    const { data: px } = await sharp(`${dir}/insel-${k}-nacht.png`).flatten({ background: '#ffffff' }).resize(W, H, { fit: 'fill', kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { data: dayRaw } = await sharp(`assets-src/insel-${k}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // the day picture's alpha and its open area, in the frame
    const dayA = new Uint8Array(W * H); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dayA[(y + oy) * W + x + ox] = dayRaw[(y * w + x) * 4 + 3];
    const dayOpen = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) dayOpen[i] = dayA[i] < 64 ? 255 : 0;
    const openNear = grow(dayOpen, W, H, DRIFT), dayReach = grow(dayA, W, H, REACH);
    const isWhite = (i) => px[i * 4] > 232 && px[i * 4 + 1] > 232 && px[i * 4 + 2] > 232;
    const bg = new Uint8Array(W * H); let stack = [0, W - 1, (H - 1) * W, H * W - 1];
    const fill = (st, mark) => { while (st.length) { const i = st.pop(); if (mark[i] || !isWhite(i)) continue; mark[i] = 1; const x = i % W, y = (i / W) | 0; if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); } };
    fill(stack, bg);
    // enclosed white: a hole where the day picture is open there too
    const seen = new Uint8Array(W * H); let holes = 0, holePx = 0, kept = 0;
    for (let s = 0; s < W * H; s++) {
      if (bg[s] || seen[s] || !isWhite(s)) continue;
      const comp = []; const st = [s];
      while (st.length) { const i = st.pop(); if (seen[i] || bg[i] || !isWhite(i)) continue; seen[i] = 1; comp.push(i); const x = i % W, y = (i / W) | 0; if (x > 0) st.push(i - 1); if (x < W - 1) st.push(i + 1); if (y > 0) st.push(i - W); if (y < H - 1) st.push(i + W); }
      if (comp.length < 10) continue; let open = 0; for (const i of comp) if (openNear[i]) open++;
      if (open / comp.length >= 0.45) { for (const i of comp) bg[i] = 1; holes++; holePx += comp.length; } else kept++;
    }
    const out = Buffer.alloc(w * h * 4); let inter = 0, uni = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y + oy) * W + x + ox, o = (y * w + x) * 4; let a;
      if (bg[i]) a = 0; else {
        let nb = 0; if (bg[i - 1]) nb++; if (bg[i + 1]) nb++; if (bg[i - W]) nb++; if (bg[i + W]) nb++;
        if (nb === 0) a = 255; else { const lum = (px[i * 4] + px[i * 4 + 1] + px[i * 4 + 2]) / 3; a = Math.round(255 - Math.min(255, Math.max(0, (lum - 150) * 2.2))); }
      }
      a = Math.min(a, dayReach[i]);
      let r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
      if (a > 0 && a < 255) { const t = a / 255; r = Math.max(0, Math.min(255, Math.round((r - 255 * (1 - t)) / t))); g = Math.max(0, Math.min(255, Math.round((g - 255 * (1 - t)) / t))); b = Math.max(0, Math.min(255, Math.round((b - 255 * (1 - t)) / t))); }
      out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
      const D = dayA[i] > 128, N = a > 128; if (D && N) inter++; if (D || N) uni++;
    }
    // the same cut as the day picture's own (optimize-island.mjs trims it): both then have the same size in the app
    const { info: ti } = await sharp(`assets-src/insel-${k}.png`).ensureAlpha().trim({ threshold: 8 }).toBuffer({ resolveWithObject: true });
    const box = { left: -(ti.trimOffsetLeft ?? 0), top: -(ti.trimOffsetTop ?? 0), width: ti.width, height: ti.height };
    const png = await sharp(out, { raw: { width: w, height: h, channels: 4 } }).extract(box).png({ compressionLevel: 9 }).toBuffer();
    writeFileSync(`assets-src/insel-${k}-nacht.png`, png);
    for (const width of [1254, 640, 256]) await sharp(png).resize({ width, withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90 }).toFile(`public/img/insel-${k}-nacht-${width}.webp`);
    console.log(k, `${w}x${h}`, 'Deckung mit dem Tagbild', (inter / uni * 100).toFixed(1) + ' %', '| Löcher', holes, `(${holePx} px)`, '| weiße Stellen behalten', kept);
  }
} else { console.error('usage: node scripts/island-nacht.mjs vorlage <outDir> <name>... | einbauen <dir> <name>...'); process.exit(1); }
