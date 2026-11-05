// Builds public/img/zeiger-maske.png: an alpha mask of the ring box on the Heute island in which the painted gnomon blade
// is transparent. Edges are snapped per scan line to the dark contour lines of the painting around a rough outline.
// usage: node scripts/blade-mask.mjs [--vis out.png]
import sharp from 'sharp';
const { data, info } = await sharp('assets-src/insel-heute.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const lum = (x, y) => { const i = (y * W + x) * 4; return (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000; };
// rough outline (island px): left edge and right edge as polylines from tip to foot
const LEFT = [[392, 368], [391, 375], [393, 385], [396, 395], [398, 405], [400, 415], [402, 425], [403, 435], [404, 445], [404, 455], [402, 462], [397, 468], [392, 474], [392, 478], [470, 505]];
const RIGHT = [[393, 368], [398, 375], [402, 385], [407, 395], [413, 405], [421, 415], [428, 425], [447, 460], [468, 494], [476, 500], [474, 506], [470, 505]];
const xAt = (poly, y) => { for (let i = 0; i < poly.length - 1; i++) { const [x0, y0] = poly[i], [x1, y1] = poly[i + 1]; if ((y >= y0 && y <= y1) || (y >= y1 && y <= y0)) { if (y1 === y0) return Math.max(x0, x1); return x0 + ((y - y0) * (x1 - x0)) / (y1 - y0); } } return null; };
const snap = (x, y, dir) => { // darkest pixel within ±5 px, prefer closest when similar
  let best = Math.round(x), bl = 1e9; for (let d = -3; d <= 3; d++) { const xx = Math.round(x + d); const l = lum(xx, y) + Math.abs(d) * 6; if (l < bl) { bl = l; best = xx; } } best = Math.max(Math.round(x) - 2, Math.min(Math.round(x) + 2, best)); return best + dir; };
const TOP = 368, BOT = 507;
const rows = [];
for (let y = TOP; y <= BOT; y++) {
  let l = xAt(LEFT, y), r = xAt(RIGHT, y);
  if (l === null || r === null) continue;
  if (y >= 478) { // foot plate: left edge is the plate's lower-left diagonal; right edge the plate end
    l = 392 + ((y - 478) * (470 - 392)) / (505 - 478);
  }
  const ls = y < 474 ? snap(l, y, -1) : Math.round(l) - 1; const rs = y < 497 && y > 400 ? snap(r, y, +1) : Math.round(r) + 1;
  rows.push([y, Math.min(ls, rs), Math.max(ls, rs)]);
}
// median smoothing of edges (3 rows)
const med = (a, b, c) => [a, b, c].sort((p, q) => p - q)[1];
for (let i = 1; i < rows.length - 1; i++) { rows[i][1] = med(rows[i - 1][1], rows[i][1], rows[i + 1][1]); rows[i][2] = med(rows[i - 1][2], rows[i][2], rows[i + 1][2]); }
// tip: taper to a point at the first row
rows[0][1] = Math.round((rows[0][1] + rows[0][2]) / 2) - 1; rows[0][2] = rows[0][1] + 2;
// rasterise into a full-island alpha map (1 = blade)
const blade = new Uint8Array(W * info.height);
for (const [y, l, r] of rows) for (let x = l; x <= r; x++) blade[y * W + x] = 1;
// ring box on the island: left 21.4 %, top 23 %, width 38 % (see .sundial-ring)
const bx = 0.214 * W, by = 0.23 * info.height, bw = 0.38 * W; const S = 2, N = Math.round(bw * S);
const out = Buffer.alloc(N * N * 4);
for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
  const x = bx + i / S, y = by + j / S; // bilinear sample of the blade map
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const v = (xx, yy) => blade[yy * W + xx] ?? 0;
  const b = v(x0, y0) * (1 - fx) * (1 - fy) + v(x0 + 1, y0) * fx * (1 - fy) + v(x0, y0 + 1) * (1 - fx) * fy + v(x0 + 1, y0 + 1) * fx * fy;
  const o = (j * N + i) * 4; out[o] = out[o + 1] = out[o + 2] = 255; out[o + 3] = Math.round(255 * (1 - b));
}
await sharp(out, { raw: { width: N, height: N, channels: 4 } }).png().toFile('public/img/zeiger-maske.png');
console.log('mask', N, 'rows', rows.length, 'tip', rows[0], 'foot', rows[rows.length - 1]);
if (process.argv[2] === '--vis') {
  const x0 = 370, y0 = 355, cw = 125, ch = 165; const vis = Buffer.alloc(cw * ch * 3);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { const i = ((y + y0) * W + x + x0) * 4, o = (y * cw + x) * 3; const m = blade[(y + y0) * W + x + x0]; vis[o] = m ? Math.min(255, data[i] / 2 + 128) : data[i]; vis[o + 1] = m ? data[i + 1] / 3 : data[i + 1]; vis[o + 2] = m ? data[i + 2] / 3 : data[i + 2]; }
  await sharp(vis, { raw: { width: cw, height: ch, channels: 3 } }).resize(cw * 8, ch * 8, { kernel: 'nearest' }).png().toFile(process.argv[3]);
}
