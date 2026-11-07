// node scripts/grid.mjs <in.png|webp> <out.jpg> [x0 y0 x1 y1 in percent]  : percent grid overlay (5 % lines, 10 % labelled), optional crop
import sharp from 'sharp';
const [inp, out, x0 = '0', y0 = '0', x1 = '100', y1 = '100'] = process.argv.slice(2);
const base = await sharp(inp).ensureAlpha().png().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = base.info;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">`;
for (let p = 0; p <= 100; p += 5) {
  const x = (w * p) / 100, y = (h * p) / 100, s = p % 10 === 0;
  svg += `<line x1="${x}" y1="0" x2="${x}" y2="${h}" stroke="${s ? '#f0f' : '#0ff'}" stroke-width="${s ? 2 : 1}" opacity=".7"/><line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${s ? '#f0f' : '#0ff'}" stroke-width="${s ? 2 : 1}" opacity=".7"/>`;
  if (s) svg += `<text x="${x + 3}" y="16" font-size="16" fill="#fff">${p}</text><text x="2" y="${y - 3}" font-size="16" fill="#fff">${p}</text>`;
}
svg += '</svg>';
const crop = { left: Math.round((w * +x0) / 100), top: Math.round((h * +y0) / 100), width: Math.round((w * (+x1 - +x0)) / 100), height: Math.round((h * (+y1 - +y0)) / 100) };
const full = await sharp({ create: { width: w, height: h, channels: 4, background: '#223' } }).composite([{ input: base.data }, { input: Buffer.from(svg) }]).png().toBuffer();
await sharp(full).extract(crop).jpeg({ quality: 85 }).toFile(out);
console.log(w, h, crop);
