#!/usr/bin/env python3
"""Procedural alpine-lake landscape in the style of the references (golden hour, mist, pines).
Renders assets-src/final-landschaft-{abend,tag,nacht}.png at 2560x1440. No external data, deterministic.
usage: python3 scripts/render-landscape.py [abend|tag|nacht|all]
"""
import sys, math
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

W, H = 2560, 1440
rng = np.random.default_rng(7)

def lerp(a, b, t): return a + (b - a) * t
def smooth(t): return t * t * (3 - 2 * t)

def noise1d(n, octaves=6, persistence=0.55, seed=0, base_scale=1.0):
    r = np.random.default_rng(seed); out = np.zeros(n); amp = 1.0; freq = 1.0; total = 0
    for _ in range(octaves):
        pts = max(2, int(n / 180 * freq * base_scale))
        ctrl = r.random(pts + 1)
        xs = np.linspace(0, pts, n); i = np.floor(xs).astype(int); t = smooth(xs - i)
        i2 = np.minimum(i + 1, pts)
        out += amp * (ctrl[i] * (1 - t) + ctrl[i2] * t); total += amp; amp *= persistence; freq *= 2
    return out / total

def noise2d(h, w, scale=64, octaves=4, seed=0):
    r = np.random.default_rng(seed); out = np.zeros((h, w)); amp = 1; total = 0; s = scale
    for _ in range(octaves):
        gh, gw = max(2, int(h / s)) + 2, max(2, int(w / s)) + 2
        g = r.random((gh, gw))
        ys = np.linspace(0, gh - 1.001, h); xs = np.linspace(0, gw - 1.001, w)
        y0 = np.floor(ys).astype(int); x0 = np.floor(xs).astype(int); ty = smooth(ys - y0)[:, None]; tx = smooth(xs - x0)[None, :]
        a = g[y0][:, x0]; b = g[y0][:, x0 + 1]; c = g[y0 + 1][:, x0]; d = g[y0 + 1][:, x0 + 1]
        out += amp * ((a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty); total += amp; amp *= 0.5; s /= 2
    return out / total

def col(hexs): return np.array([int(hexs[i:i + 2], 16) for i in (1, 3, 5)], dtype=float) / 255

PALETTES = {
    'abend': dict(sky_top='#2e3f7f', sky_mid='#8a6f95', sky_hor='#f3a860', sun='#fff2d0', sun_glow='#ffb86a', sun_pos=(0.69, 0.40), sun_r=0.028,
                  ridges=['#6f6a92', '#5e5a82', '#4c4a70', '#3a3a5a', '#2c2d47', '#22243a'], ridge_warm=['#d9b7a0', '#c9a08a', '#b08a7a', '#8a6f6a', '#6a5a5a', '#4a4248'],
                  mist='#f0c8a8', lake='#4a4a7a', lake_hor='#f0b070', fg='#15161f', fg_rim='#5a3a2a', cloud='#ffd9b8', cloud_shadow='#8a7090', stars=0),
    'tag':   dict(sky_top='#4f86d0', sky_mid='#9cc2ea', sky_hor='#e8eef2', sun='#ffffff', sun_glow='#fff1c8', sun_pos=(0.69, 0.16), sun_r=0.022,
                  ridges=['#8ea2c4', '#7b90b4', '#657a9e', '#4f647f', '#3f526a', '#324155'], ridge_warm=['#eef2f6', '#dde5ec', '#c8d4de', '#9aa9b8', '#73849a', '#5b6b80'],
                  mist='#eef2f6', lake='#5f8fc6', lake_hor='#d6e4ef', fg='#1e3328', fg_rim='#3f6a4f', cloud='#ffffff', cloud_shadow='#aebfd2', stars=0),
    'nacht': dict(sky_top='#05081a', sky_mid='#121a3e', sky_hor='#3a3a62', sun='#ffe1b0', sun_glow='#b07a62', sun_pos=(0.69, 0.47), sun_r=0.012,
                  ridges=['#2a3058', '#232a4c', '#1c2340', '#161c34', '#111628', '#0c101e'], ridge_warm=['#4a4f78', '#3e4468', '#333a5a', '#28304c', '#20263e', '#181c30'],
                  mist='#5a6090', lake='#111a3a', lake_hor='#6a5a7a', fg='#06070f', fg_rim='#1a2240', cloud='#7a86b8', cloud_shadow='#2a3258', stars=1),
}

def render(look):
    P = PALETTES[look]
    yy, xx = np.mgrid[0:H, 0:W]; u = xx / W; v = yy / H
    horizon = 0.58
    # --- sky ---
    t = np.clip(v / horizon, 0, 1)
    sky = np.where((t < 0.55)[..., None], lerp(col(P['sky_top']), col(P['sky_mid']), (t / 0.55)[..., None]), lerp(col(P['sky_mid']), col(P['sky_hor']), ((t - 0.55) / 0.45)[..., None]))
    sx, sy = P['sun_pos']; d = np.sqrt(((u - sx) * (W / H)) ** 2 + (v - sy) ** 2)
    glow = np.exp(-(d / 0.42) ** 2) * 0.55 + np.exp(-(d / 0.14) ** 2) * 0.55
    sky = sky + glow[..., None] * col(P['sun_glow']) * (1.0 if look != 'nacht' else 0.5)
    disc = np.clip(1 - (d - P['sun_r']) / 0.012, 0, 1)
    sky = lerp(sky, col(P['sun']), disc[..., None] * (1 if look != 'nacht' else 0.9))
    if P['stars']:
        st = rng.random((H, W)); mask = (st > 0.9993) & (v < horizon - 0.05); sky[mask] = np.clip(sky[mask] + rng.random((mask.sum(), 1)) * 0.8, 0, 1)
    # clouds (banded, soft)
    cl = noise2d(H, W, scale=260, octaves=5, seed=3); cl2 = noise2d(H, W, scale=90, octaves=3, seed=5)
    band = np.exp(-((v - 0.22) / 0.14) ** 2) * 0.9 + np.exp(-((v - 0.42) / 0.06) ** 2) * 0.6
    cmask = np.clip((cl * 0.75 + cl2 * 0.25 - 0.48) * 4, 0, 1) * band * (v < horizon)
    lit = np.clip(1 - np.abs(u - sx) * 1.2, 0.2, 1)
    ccol = lerp(col(P['cloud_shadow']), col(P['cloud']), lit[..., None])
    sky = lerp(sky, ccol, (cmask * 0.85)[..., None])
    img = sky.copy()
    # --- mountain ridges (far -> near) ---
    nR = len(P['ridges'])
    def gauss_smooth(a, win):
        k = np.exp(-np.linspace(-2, 2, win) ** 2); k /= k.sum(); return np.convolve(np.pad(a, win // 2, mode='edge'), k, mode='same')[win // 2: win // 2 + len(a)]
    for k in range(nR):
        depth = k / (nR - 1)
        base = horizon - 0.33 + depth * 0.25
        amp = 0.14 - depth * 0.06
        prof = noise1d(W, octaves=5, persistence=0.5, seed=11 + k * 3, base_scale=0.5 + k * 0.35)
        prof = base - (prof - 0.4) * amp
        if k < 2:  # a few prominent peaks in the far ranges
            pr = np.random.default_rng(40 + k)
            for _ in range(5 + k * 2):
                cx = pr.random(); wdt = 0.02 + pr.random() * 0.05; hgt = 0.05 + pr.random() * 0.09
                prof -= hgt * np.exp(-((np.linspace(0, 1, W) - cx) / wdt) ** 2)
        fine = noise1d(W, octaves=4, persistence=0.55, seed=70 + k, base_scale=4 + k * 2)
        prof = gauss_smooth(prof, 3) + (fine - 0.5) * (0.03 + 0.012 * depth)
        ridge_y = prof[None, :]
        m = np.clip((v - ridge_y) / 0.003, 0, 1)
        dist = np.clip(v - ridge_y, 0, 1)
        c_sh = col(P['ridges'][k]); c_wm = col(P['ridge_warm'][k])
        slope = gauss_smooth(np.gradient(prof) * W, 41)
        light = np.clip(0.5 - np.sign(sx - 0.5) * slope * 0.012, 0.05, 1)[None, :]
        top_zone = np.exp(-dist / 0.06)
        tex2 = noise2d(H, W, scale=14, octaves=3, seed=30 + k)
        lightmap = light * top_zone * (1 - depth * 0.5) * (0.7 + 0.6 * tex2) + 0.1
        rc = lerp(c_sh, c_wm, np.clip(lightmap, 0, 1)[..., None])
        rc = lerp(rc, c_sh * 0.8, np.clip(dist / 0.3, 0, 1)[..., None])
        tex = noise2d(H, W, scale=90, octaves=4, seed=20 + k); tex2 = noise2d(H, W, scale=14, octaves=3, seed=30 + k)
        stri = noise2d(H, W, scale=3, octaves=1, seed=60 + k)
        rc = rc * (0.88 + 0.2 * tex + 0.14 * (tex2 - 0.5) + 0.08 * (stri - 0.5) * (1 - depth))[..., None]
        if k < 2 and look != 'nacht':
            sn = noise1d(W, octaves=3, seed=50 + k)
            snowline = ridge_y + 0.035 + sn[None, :] * 0.03
            high = np.clip((0.31 - ridge_y) / 0.05, 0, 1)
            snow = np.clip((snowline - v) / 0.015, 0, 1) * high * (0.7 + 0.3 * tex)
            rc = lerp(rc, lerp(np.array([1, 1, 1.0]), col(P['sun_glow']), 0.3), np.clip(snow * 0.85, 0, 1)[..., None])
        fade = (1 - depth) ** 1.8 * (0.3 if look != 'nacht' else 0.25)
        rc = lerp(rc, sky, fade)
        img = lerp(img, rc, m[..., None])
        mist = np.exp(-((v - (ridge_y + 0.05)) / 0.025) ** 2) * m * (0.14 - depth * 0.08)
        img = lerp(img, col(P['mist']), np.clip(mist, 0, 1)[..., None])
    img = np.clip(img, 0, 1); img_land = img.copy()
    # --- lake with reflection ---
    lake_mask = (v >= horizon).astype(float)
    ref = np.flipud(img_land[: int(H * horizon)])
    ref = np.array(Image.fromarray((np.clip(ref, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))) / 255
    rip = noise2d(H, W, scale=6, octaves=2, seed=9)
    lake = np.zeros_like(img); n_ref = ref.shape[0]
    lake[int(H * horizon):int(H * horizon) + n_ref] = ref[: H - int(H * horizon)]
    depthv = np.clip((v - horizon) / (1 - horizon), 0, 1)
    lake = lerp(lake, col(P['lake']), (0.18 + 0.42 * depthv)[..., None])
    glint = np.exp(-((u - sx) / 0.05) ** 2) * (1 - depthv) * (0.9 if look != 'nacht' else 0.5) * (0.6 + 0.4 * rip)
    lake = lerp(lake, col(P['lake_hor']), np.clip(glint, 0, 1)[..., None])
    lake = lake * (0.96 + 0.08 * rip)[..., None]
    img = lerp(img, lake, lake_mask[..., None])
    # shoreline haze
    haze = np.exp(-((v - horizon) / 0.03) ** 2) * 0.3
    img = lerp(img, col(P['mist']), haze[..., None])
    # --- foreground: rocks + pines (left and right), bottom haze ---
    pil = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)); dr = ImageDraw.Draw(pil, 'RGBA')
    fg = tuple(int(c * 255) for c in col(P['fg'])); rim = tuple(int(c * 255) for c in col(P['fg_rim']))
    def pine(x, base_y, h, w):
        pr = np.random.default_rng(int(x) + int(h))
        tiers = 9; right = []; left = []
        for i in range(1, tiers + 1):
            fy = i / tiers; fw = (0.15 + 0.85 * fy ** 1.1) * (0.85 + pr.random() * 0.3)
            y = base_y - h + h * fy; y_in = y - h * 0.045
            right += [(x + w * fw * 0.45, y_in), (x + w * fw / 2, y)]
            left += [(x - w * fw / 2, y), (x - w * fw * 0.45, y_in)]
        pts = [(x, base_y - h)] + right + [(x + w * 0.05, base_y + 6), (x - w * 0.05, base_y + 6)] + list(reversed(left))
        dr.polygon(pts, fill=fg)
        for i in range(2, tiers, 2):
            fy = i / tiers; fw = 0.15 + 0.85 * fy ** 1.1
            dr.line([(x + 2, base_y - h + h * fy - h * 0.03), (x + w * fw * 0.4, base_y - h + h * fy)], fill=rim, width=2)
    # rocky bank
    r = np.random.default_rng(21)
    for side in (0, 1):
        bx = 0 if side == 0 else W
        pts = [(bx, H)]
        for i in range(0, 40):
            x = (i / 39) * W * 0.42; y = H - (H * 0.22) * (1 - (i / 39) ** 1.4) - r.random() * 30
            pts.append((bx + x if side == 0 else bx - x, y))
        pts.append((bx + W * 0.42 if side == 0 else bx - W * 0.42, H))
        dr.polygon(pts, fill=fg)
        for i in range(9):
            x = (0.02 + i * 0.045 + r.random() * 0.02) * W; x = x if side == 0 else W - x
            hgt = H * (0.18 + r.random() * 0.16) * (1 - i * 0.06); wdt = hgt * 0.34
            pine(x, H - H * 0.20 * (1 - (i * 0.045 / 0.42) ** 1.4) + 20, hgt, wdt)
    img = np.array(pil) / 255
    # bottom mist
    bm = np.clip((v - 0.86) / 0.14, 0, 1) ** 1.5 * 0.25
    img = lerp(img, col(P['mist']), bm[..., None])
    # vignette + gentle grain
    vig = 1 - np.clip(np.sqrt(((u - 0.5) * 1.1) ** 2 + ((v - 0.45) * 1.3) ** 2) - 0.55, 0, 1) * 0.6
    img = img * vig[..., None]
    img += (rng.random((H, W, 1)) - 0.5) * 0.012
    # contrast + saturation
    mean = img.mean(axis=2, keepdims=True); img = mean + (img - mean) * 1.25
    img = 0.5 + (img - 0.5) * 1.12
    out = Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8))
    out = out.filter(ImageFilter.GaussianBlur(0.4)).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    return out

if __name__ == '__main__':
    which = sys.argv[1] if len(sys.argv) > 1 else 'all'
    for look in (['abend', 'tag', 'nacht'] if which == 'all' else [which]):
        render(look).save(f'assets-src/final-landschaft-{look}.png')
        print('rendered', look)
