// Temporary background grading until the user supplies landscapes in the reference style.
// Source: assets-src/landschaft-tag.png -> public/img/landschaft-{tag,abend,nacht}-{1920,1280}.{avif,webp}
// If assets-src/landschaft-abend.png or landschaft-nacht.png exist and are marked as final (FINAL_* env), they are used as-is.
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';

const out = 'public/img';
await mkdir(out, { recursive: true });
const SRC = 'assets-src/landschaft-tag.png';
const W = 1920, H = 1080;
const base = () => sharp(SRC).resize(W, H, { fit: 'cover', position: 'centre' });

const svg = (inner) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${inner}</svg>`);
const linear = (stops, opacity = 1) => svg(`<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient></defs><rect width="100%" height="100%" fill="url(#g)" opacity="${opacity}"/>`);
const radial = (cx, cy, r, stops, opacity = 1) => svg(`<defs><radialGradient id="r" cx="${cx}" cy="${cy}" r="${r}" fx="${cx}" fy="${cy}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient></defs><rect width="100%" height="100%" fill="url(#r)" opacity="${opacity}"/>`);


/** Duotone ramp: warm-tinted and cool-tinted copies of the base, mixed by a vertical alpha mask, then blended over the base. */
async function ramp(baseBuf, warm, cool, maskStops, mix) {
  const warmImg = await sharp(baseBuf).tint(warm).toBuffer();
  const coolImg = await sharp(baseBuf).tint(cool).toBuffer();
  const maskSvg = svg(`<defs><linearGradient id="m" x1="0" y1="0" x2="0" y2="1">${maskStops.map(([o, v]) => `<stop offset="${o}" stop-color="#fff" stop-opacity="${(v / 255).toFixed(3)}"/>`).join('')}</linearGradient></defs><rect width="100%" height="100%" fill="url(#m)"/>`);
  const warmA = await sharp(warmImg).ensureAlpha().composite([{ input: maskSvg, blend: 'dest-in' }]).png().toBuffer();
  const toned = await sharp(coolImg).composite([{ input: warmA, blend: 'over' }]).png().toBuffer();
  const mixSvg = svg(`<rect width="100%" height="100%" fill="#fff" opacity="${mix}"/>`);
  const tonedA = await sharp(toned).ensureAlpha().composite([{ input: mixSvg, blend: 'dest-in' }]).png().toBuffer();
  return sharp(baseBuf).composite([{ input: tonedA, blend: 'over' }]).toBuffer();
}

async function render(name, pipeline, prefix = 'landschaft') {
  const img = await pipeline();
  for (const w of [1920, 1280]) {
    const r = sharp(await img.clone().toBuffer()).resize({ width: w });
    await r.clone().avif({ quality: 52 }).toFile(`${out}/${prefix}-${name}-${w}.avif`);
    await r.clone().webp({ quality: 80 }).toFile(`${out}/${prefix}-${name}-${w}.webp`);
  }
  console.log('rendered', prefix, name);
}

// A user-supplied assets-src/final-landschaft-<look>.png replaces the graded fallback unchanged.
const finalOrGraded = (name, graded) => existsSync(`assets-src/final-landschaft-${name}.png`) ? () => Promise.resolve(sharp(`assets-src/final-landschaft-${name}.png`).resize(W, H, { fit: 'cover' })) : graded;

// ABEND: golden hour. Sun low, right of centre, warm highlights, violet-blue shadows.
await render('abend', finalOrGraded('abend', async () => {
  const b0 = await base().modulate({ brightness: 0.9, saturation: 0.7 }).toBuffer();
  const b = await ramp(b0, { r: 255, g: 168, b: 105 }, { r: 120, g: 125, b: 185 }, [[0, 40], [0.22, 90], [0.36, 230], [0.48, 255], [0.56, 200], [0.7, 120], [1, 90]], 0.72);
  return sharp(b).composite([
    { input: linear([[0, '#4a5a8a'], [0.22, '#8a7a9a'], [0.36, '#e39a62'], [0.46, '#ffbe78'], [0.56, '#c89a80'], [0.75, '#6a6280'], [1, '#2a2a44']], 0.7), blend: 'overlay' },
    { input: linear([[0, '#6a7aa8'], [0.4, '#d98a52'], [0.5, '#e8b080'], [1, '#3a3450']], 0.35), blend: 'soft-light' },
    { input: radial('69%', '37%', '42%', [[0, '#fff3d4'], [0.1, '#ffd38c'], [0.28, '#ffa05a70'], [0.6, '#ff8a4a12'], [1, '#00000000']]), blend: 'screen' },
    { input: radial('69%', '37%', '3.5%', [[0, '#ffffff'], [0.45, '#fff6dc'], [1, '#ffe9b800']]), blend: 'screen' },
    { input: svg(`<defs><radialGradient id="s" cx="69%" cy="52%" r="30%" fx="69%" fy="52%"><stop offset="0" stop-color="#ffc98a" stop-opacity=".55"/><stop offset=".5" stop-color="#ff9a5a" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs><ellipse cx="${W*0.69}" cy="${H*0.6}" rx="${W*0.09}" ry="${H*0.26}" fill="url(#s)"/>`), blend: 'screen' },
    { input: radial('50%', '55%', '82%', [[0, '#00000000'], [0.72, '#00000000'], [1, '#1a1220']], 0.6), blend: 'multiply' },
  ]);
}));

// TAG: soft warm morning light, same sun position but higher and paler.
await render('tag', finalOrGraded('tag', async () => {
  const b = await base().modulate({ brightness: 0.96, saturation: 0.86 }).toBuffer();
  return sharp(b).composite([
    { input: linear([[0, '#6a8ac8'], [0.3, '#e0c8a8'], [0.46, '#ffe8c8'], [0.6, '#c0b8b0'], [1, '#6a7078']], 0.6), blend: 'soft-light' },
    { input: radial('69%', '31%', '36%', [[0, '#fff9ec'], [0.15, '#ffe9c0'], [0.45, '#ffd9a040'], [1, '#00000000']], 0.9), blend: 'screen' },
    { input: radial('50%', '55%', '80%', [[0, '#00000000'], [0.75, '#00000000'], [1, '#1a1a2a']], 0.5), blend: 'multiply' },
  ]);
}));

// NACHT: blue dusk, dark, with a faint warm afterglow at the horizon.
await render('nacht', finalOrGraded('nacht', async () => {
  const b0 = await base().modulate({ brightness: 0.66, saturation: 0.7 }).toBuffer();
  const b = await ramp(b0, { r: 220, g: 150, b: 130 }, { r: 70, g: 85, b: 160 }, [[0, 0], [0.4, 30], [0.5, 200], [0.58, 60], [1, 20]], 0.75);
  return sharp(b).composite([
    { input: linear([[0, '#243a80'], [0.3, '#3a4a90'], [0.44, '#7a6a9a'], [0.5, '#9a7a8a'], [0.6, '#3a4a80'], [1, '#1c2648']]), blend: 'multiply' },
    { input: linear([[0, '#1a2a60'], [0.42, '#5a5a90'], [0.5, '#c08a7a'], [0.58, '#3a4a80'], [1, '#141c3a']], 0.4), blend: 'overlay' },
    { input: radial('69%', '44%', '30%', [[0, '#ffb98a'], [0.25, '#d08a6a70'], [0.6, '#80506020'], [1, '#00000000']], 0.7), blend: 'screen' },
    { input: radial('50%', '55%', '82%', [[0, '#00000000'], [0.72, '#00000000'], [1, '#000010']], 0.6), blend: 'multiply' },
  ]);
}));
