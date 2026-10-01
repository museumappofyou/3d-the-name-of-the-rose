# Web textures for Brunellus and the stable horses (see docs/ASSETS.md).
# Source: Lyndon Daniels, "Realtime Rancher's 3D Model Pack" horse (CC0, OpenGameArt),
# 2048² photo-based colour, normal and AO maps. This script
#   1. rasterises the body's UV islands and each texel's 3-D position (uv.json,
#      written by horse_blender.py --dump-uv),
#   2. removes the painted white markings (blaze, four socks, croup flecks) by
#      push-pull inpainting, keeping the hair's high-frequency luminance, so
#      markings can be chosen per horse at runtime (web/src/world/animals.js),
#   3. multiplies in the (range-normalised) ambient-occlusion map,
#   4. dilates the islands over the background so no beige seams bleed in at
#      lower mip levels, and writes 1024² JPEG colour/normal and PNG hair maps.
#   python3 scripts/models/horse_textures.py SRC_DIR UV_JSON OUT_DIR
import json, sys, os
import numpy as np
from PIL import Image

SRC, UVJ, OUT = sys.argv[1:4]
os.makedirs(OUT, exist_ok=True)
N = 2048
col = np.asarray(Image.open(os.path.join(SRC, 'HorseMain2k00.png')).convert('RGB')).astype(np.float32) / 255
ao = np.asarray(Image.open(os.path.join(SRC, 'HorseMain2k00AO00.png')).convert('L')).astype(np.float32)
nrm = np.asarray(Image.open(os.path.join(SRC, 'HorseMain2k00Norm00.png')).convert('RGB')).astype(np.float32) / 255
hair = Image.open(os.path.join(SRC, 'Hair12Main2k.png')).convert('RGBA')

# --- rasterise UV islands with interpolated 3-D position ------------------
polys = json.load(open(UVJ))['Plane']
mask = np.zeros((N, N), bool)
pos = np.zeros((N, N, 3), np.float32)
for p in polys:
    n = len(p) // 2
    uv, xyz = np.array(p[:n], np.float32), np.array(p[n:], np.float32)
    for k in range(1, n - 1):
        tri = [0, k, k + 1]
        P = uv[tri] * [N, N]; P[:, 1] = N - P[:, 1]          # image rows run down
        x0, y0 = np.floor(P.min(0)).astype(int); x1, y1 = np.ceil(P.max(0)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, N - 1), min(y1, N - 1)
        if x1 < x0 or y1 < y0: continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
        (ax, ay), (bx, by), (cx, cy) = P
        d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
        if abs(d) < 1e-9: continue
        l1 = ((by - cy) * (gx - cx) + (cx - bx) * (gy - cy)) / d
        l2 = ((cy - ay) * (gx - cx) + (ax - cx) * (gy - cy)) / d
        l3 = 1 - l1 - l2
        e = -0.02   # a slightly generous edge
        ins = (l1 >= e) & (l2 >= e) & (l3 >= e)
        if not ins.any(): continue
        X = l1[..., None] * xyz[0] + l2[..., None] * xyz[k] + l3[..., None] * xyz[k + 1]
        sl = (slice(y0, y1 + 1), slice(x0, x1 + 1))
        mask[sl] |= ins
        pos[sl][ins] = X[ins]
print('island coverage', mask.mean())

# --- white markings: bright, unsaturated hair above the hooves ------------
lum = col @ np.array([0.299, 0.587, 0.114], np.float32)
sat = col.max(-1) - col.min(-1)
z = pos[..., 2]
hoof = z < 0.095                      # hoof walls and soles keep their photograph
white = mask & ~hoof & (lum > 0.50) & (sat < 0.22)
# grow the marking a little so its soft border goes too
def dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r: out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out
white = dilate(white, 3) & mask & ~hoof
print('marking fraction of islands', white.sum() / mask.sum())

def smooth(a):
    """[1 2 1]/4 in both directions: the nearest-neighbour upsample becomes bilinear"""
    a = (np.roll(a, 1, 0) + 2 * a + np.roll(a, -1, 0)) / 4
    return (np.roll(a, 1, 1) + 2 * a + np.roll(a, -1, 1)) / 4

def pushpull(img, known):
    """fill unknown texels from known ones through a weighted image pyramid"""
    levels = [(img * known[..., None], known.astype(np.float32))]
    while levels[-1][1].shape[0] > 4:
        c, w = levels[-1]
        h = c.shape[0] // 2
        c2 = c.reshape(h, 2, h, 2, -1).sum((1, 3)); w2 = w.reshape(h, 2, h, 2).sum((1, 3))
        levels.append((c2, w2))
    c, w = levels[-1]; fill = c / np.maximum(w, 1e-6)[..., None]
    for c, w in reversed(levels[:-1]):
        up = smooth(fill.repeat(2, 0).repeat(2, 1))
        own = c / np.maximum(w, 1e-6)[..., None]
        a = np.clip(w, 0, 1)[..., None]
        fill = own * a + up * (1 - a)
    return fill

known = mask & ~white & ~hoof   # the hoof photographs must not tint the filled socks
filled = pushpull(col, known)
# keep the hair's own fine structure inside the removed marking
def blur(a, r):
    k = np.ones(2 * r + 1, np.float32) / (2 * r + 1)
    a = np.apply_along_axis(lambda v: np.convolve(v, k, 'same'), 0, a)
    return np.apply_along_axis(lambda v: np.convolve(v, k, 'same'), 1, a)
detail = np.clip(lum / np.maximum(blur(lum, 6), 1e-3), 0.7, 1.35) ** 0.6
out = np.where(white[..., None], filled * detail[..., None], col)

# --- ambient occlusion (stored in 0..67 of 255): normalise, soften ---------
aon = np.clip(ao / max(1.0, np.percentile(ao[mask], 99)), 0, 1)
out = np.where(mask[..., None], out * (0.3 + 0.7 * aon[..., None] ** 0.8), out)

# --- dilate islands over the background (mip seams) ------------------------
out = np.where(mask[..., None], out, pushpull(out, mask))
nfill = pushpull(nrm, mask); nrm = np.where(mask[..., None], nrm, nfill)

def save(a, name, q=90, size=1024):
    im = Image.fromarray(np.clip(a * 255 + 0.5, 0, 255).astype(np.uint8))
    im = im.resize((size, size), Image.LANCZOS)
    p = os.path.join(OUT, name)
    im.save(p, quality=q, optimize=True) if name.endswith('.jpg') else im.save(p, optimize=True)
    print(name, os.path.getsize(p) // 1024, 'KB')
save(out, 'horse_coat.jpg', 90)
# normals: renormalise after the resize
n = nrm * 2 - 1; n /= np.maximum(np.linalg.norm(n, axis=-1, keepdims=True), 1e-6)
save(n * 0.5 + 0.5, 'horse_normal.jpg', 92)
h = hair.resize((1024, 1024), Image.LANCZOS)
h.save(os.path.join(OUT, 'horse_hair.png'), optimize=True)
print('horse_hair.png', os.path.getsize(os.path.join(OUT, 'horse_hair.png')) // 1024, 'KB')
# reference: mean linear luminance of the barrel coat (runtime recolouring)
barrel = mask & (z > 0.8) & (z < 1.3) & (np.abs(pos[..., 1]) < 0.3)
lin = np.where(out <= 0.04045, out / 12.92, ((out + 0.055) / 1.055) ** 2.4)
print('barrel mean linear rgb', lin[barrel].mean(0), 'lum', (lin[barrel] @ np.array([0.2126, 0.7152, 0.0722])).mean())
Image.fromarray((white * 255).astype(np.uint8)).resize((512, 512)).save(os.path.join(OUT, 'debug_markings.png'))
Image.fromarray(np.clip(out * 255, 0, 255).astype(np.uint8)).resize((1024, 1024)).save(os.path.join(OUT, 'debug_coat.png'))
