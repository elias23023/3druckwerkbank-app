import fs from 'fs';
const W = new URL('../../../..', import.meta.url).pathname.replace(/\/$/, '');
const { strip, rgb } = await import(W + '/scripts/wasser/lib.mjs');
const dir = process.argv[2];
for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('-vorher.png'))) {
  const k = f.replace('-vorher.png', ''), A = `${dir}/${k}-vorher.png`, B = `${dir}/${k}-nachher.png`; const a = await rgb(A), b = await rgb(B);
  // clusters of differing pixels (cells of 16 px, joined when they touch)
  const C = 16, cw = Math.ceil(a.w / C), ch = Math.ceil(a.h / C), cell = new Uint8Array(cw * ch); let n = 0;
  for (let i = 0, p = 0; i < a.w * a.h; i++, p += 3) if (a.data[p] !== b.data[p] || a.data[p + 1] !== b.data[p + 1] || a.data[p + 2] !== b.data[p + 2]) { n++; const x = i % a.w, y = (i - x) / a.w; cell[Math.floor(y / C) * cw + Math.floor(x / C)] = 1; }
  const boxes = []; const seen = new Uint8Array(cw * ch);
  for (let i = 0; i < cw * ch; i++) { if (!cell[i] || seen[i]) continue; const st = [i]; seen[i] = 1; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    while (st.length) { const j = st.pop(), x = j % cw, y = (j - x) / cw; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]]) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= cw || Y >= ch) continue; const q = Y * cw + X; if (cell[q] && !seen[q]) { seen[q] = 1; st.push(q); } } }
    boxes.push([x0 * C, y0 * C, Math.min(a.w, (x1 + 1) * C), Math.min(a.h, (y1 + 1) * C)]); }
  const desk = k.startsWith('desktop'); const details = boxes.slice(0, 6).map((bx, i) => { const m = 12, x = Math.max(0, bx[0] - m), y = Math.max(0, bx[1] - m), w = Math.min(a.w - x, bx[2] - bx[0] + 2 * m), h = Math.min(a.h - y, bx[3] - bx[1] + 2 * m); return { x, y, w, h, factor: Math.min(desk ? 4 : 2, 560 / w), label: `Stelle ${i + 1} (x ${x}, y ${y})` }; });
  await strip([{ file: A, label: 'vorher (laufende Nummer)' }, { file: B, label: 'nachher (Keim aus dem Knopf)' }], `${dir}/${k}-vergleich.png`, { title: `${k}, reduzierte Bewegung: ${n} Bildpunkte anders, ${boxes.length} Stellen`, scale: desk ? 0.3 : 0.36, details });
  console.log(k, n, 'px differ in', boxes.length, 'places', JSON.stringify(boxes));
}
