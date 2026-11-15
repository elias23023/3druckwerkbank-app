// Takes the user's Alpensee set (his own images) into assets-src, nothing is painted:
//   <eingang>/Alpensee-Desktop/<season>/<NN-phase>.png    (1672x941)  -> assets-src/landschaft-<season>-<key>.png (copied as is)
//   (the portrait set Alpensee-Hochformat is not taken any more: since 15.11. the phone shows one picture per page,
//   assets-src/szenen/seite-<key>.png, scripts/optimize-scenes.mjs)
// One retouch, nothing else: herbst/05-blaue-stunde (desktop) has a small pale blob in the sky (about x 1593-1629,
// y 104-125, partly behind a larch top). The sky around it is fitted per channel (plane + curve over the rows); inside a
// feathered ellipse a pixel that is pure veil becomes that sky plus the grain of the real sky 48 px further left in the
// same row, a pixel that is (partly) larch only loses the lift of the veil, weighted by how blue it is - the tree stays.
// Checked at 3x zoom (before | after); the other 23 desktop images are not retouched.
// Then: node scripts/grade-regen.mjs, node scripts/optimize-landscapes.mjs
// usage: node scripts/prepare-alpensee.mjs <eingang-ordner>
import sharp from 'sharp';
import { copyFileSync } from 'node:fs';
import path from 'node:path';

const src = process.argv[2];
if (!src) { console.error('usage: node scripts/prepare-alpensee.mjs <ordner mit Alpensee-Desktop>'); process.exit(1); }
const SEASONS = ['fruehling', 'sommer', 'herbst', 'winter'];
const PHASES = { '01-morgendaemmerung': 'daemmerung', '02-morgen': 'morgen', '03-mittag': 'mittag', '04-abend': 'abend', '05-blaue-stunde': 'blau', '06-nacht': 'nacht' };

/** The one retouch (see above). Returns PNG data. */
async function retouchHerbstBlau(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, c = info.channels;
  const cx = 1611, cy = 114.5, rx = 21, ry = 13;               // the blob
  const x0 = 1560, x1 = 1662, y0 = 78, y1 = 132;                 // the sky around it
  const at = (x, y) => (y * w + x) * c;
  const ell = (x, y) => Math.hypot((x - cx) / rx, (y - cy) / ry);
  const isSky = (o) => data[o + 2] - data[o] > 95 && data[o + 2] > 185;
  const orig = Buffer.from(data); const isSkyOrig = (o) => orig[o + 2] - orig[o] > 95 && orig[o + 2] > 185;
  // 1. sky model per channel: a + b*x + c*y + d*y^2 (least squares over clear sky outside the blob)
  const rows = []; const vals = [[], [], []];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const o = at(x, y); if (ell(x, y) < 1.5 || !isSky(o)) continue;
    const u = (x - cx) / 50, v = (y - cy) / 50; rows.push([1, u, v, v * v]); for (let k = 0; k < 3; k++) vals[k].push(data[o + k]);
  }
  const solve = (A, b) => { // normal equations, 4x4 Gauss
    const n = 4, M = Array.from({ length: n }, () => new Array(n + 1).fill(0));
    A.forEach((r, i) => { for (let p = 0; p < n; p++) { for (let q = 0; q < n; q++) M[p][q] += r[p] * r[q]; M[p][n] += r[p] * b[i]; } });
    for (let p = 0; p < n; p++) { let m = p; for (let q = p + 1; q < n; q++) if (Math.abs(M[q][p]) > Math.abs(M[m][p])) m = q; [M[p], M[m]] = [M[m], M[p]];
      for (let q = 0; q < n; q++) if (q !== p) { const f = M[q][p] / M[p][p]; for (let r = p; r <= n; r++) M[q][r] -= f * M[p][r]; } }
    return M.map((r, i) => r[n] / r[i]);
  };
  const coef = [0, 1, 2].map((k) => solve(rows, vals[k]));
  const sky = (x, y, k) => { const u = (x - cx) / 50, v = (y - cy) / 50; const a = coef[k]; return a[0] + a[1] * u + a[2] * v + a[3] * v * v; };
  // 2. lift of the blob over the sky where a pixel is veil (blue, not tree), smoothed and filled under the tree tips
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, D = [0, 1, 2].map(() => new Float32Array(bw * bh)), Wt = new Float32Array(bw * bh);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const o = at(x, y), i = (y - y0) * bw + (x - x0);
    if (data[o + 2] - data[o] > 55 && data[o + 2] > 170 && ell(x, y) < 1.6) { Wt[i] = 1; for (let k = 0; k < 3; k++) D[k][i] = Math.max(0, data[o + k] - sky(x, y, k)); }
  }
  const sigma = 0.8, rad = 3, g = []; for (let d = -rad; d <= rad; d++) g.push(Math.exp(-(d * d) / (2 * sigma * sigma)));
  const blur = (arr) => { const t = new Float32Array(arr.length), o2 = new Float32Array(arr.length);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { let s = 0; for (let d = -rad; d <= rad; d++) { const xx = Math.min(bw - 1, Math.max(0, x + d)); s += arr[y * bw + xx] * g[d + rad]; } t[y * bw + x] = s; }
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) { let s = 0; for (let d = -rad; d <= rad; d++) { const yy = Math.min(bh - 1, Math.max(0, y + d)); s += t[yy * bw + x] * g[d + rad]; } o2[y * bw + x] = s; }
    return o2; };
  const bWt = blur(Wt), bD = D.map((d) => blur(d.map((v, i) => v * Wt[i])));
  // 3. take the lift away: full on sky, nothing on tree, in between by blueness; feathered ellipse
  let changed = 0, maxDelta = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const r = ell(x, y); if (r >= 1.45) continue;
    const m = r <= 1.1 ? 1 : 1 - (r - 1.1) / 0.35; const mm = m * m * (3 - 2 * m);
    const o = at(x, y), i = (y - y0) * bw + (x - x0); if (bWt[i] < 1e-3) continue;
    const lift = [0, 1, 2].map((k) => bD[k][i] / bWt[i]);
    const veilB = sky(x, y, 2) + lift[2] - (sky(x, y, 0) + lift[0]);  // blueness the veiled sky has here
    const tree = -20; const b = data[o + 2] - data[o];
    const t = Math.min(1, Math.max(0, (veilB - b) / (veilB - tree)));
    // pure veil: the fitted sky plus the grain of the sky 48 px further left in the same row; tree and its rim: only the lift is taken away
    const so = at(x - 48, y), grain = isSkyOrig(so);
    for (let k = 0; k < 3; k++) {
      const target = t < 0.2 ? sky(x, y, k) + (grain ? orig[so + k] - sky(x - 48, y, k) : 0) : data[o + k] - (1 - t) * lift[k];
      const nv = Math.round(Math.min(255, Math.max(0, data[o + k] + mm * (target - data[o + k]))));
      if (nv !== data[o + k]) { maxDelta = Math.max(maxDelta, Math.abs(data[o + k] - nv)); data[o + k] = nv; changed++; }
    }
  }
  console.log(`retouch herbst/05-blaue-stunde: ${changed} channel values changed, max ${maxDelta}`);
  return sharp(data, { raw: { width: info.width, height: info.height, channels: c } }).png({ compressionLevel: 9 }).toBuffer();
}

for (const season of SEASONS) for (const [file, key] of Object.entries(PHASES)) {
  const d = path.join(src, 'Alpensee-Desktop', season, `${file}.png`), out = `assets-src/landschaft-${season}-${key}.png`;
  if (season === 'herbst' && key === 'blau') await sharp(await retouchHerbstBlau(d)).toFile(out); else copyFileSync(d, out);
  console.log(season, key, 'desktop ok');
}
