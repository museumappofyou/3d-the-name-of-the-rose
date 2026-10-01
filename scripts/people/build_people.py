# Build the abbey's people: one GLB per designed person, from MakeHuman /
# MPFB bodies with fitted CC0 garments (see docs/ASSETS.md).
#
#   BLENDER_USER_RESOURCES=.local/tools/blender_user \
#   .local/tools/Blender.app/Contents/MacOS/Blender -b --python scripts/people/build_people.py -- \
#       [--only id,id] [--out .local/mh/out]
#
# Needs Blender 4.5 LTS with the MPFB 2.0.17 extension and the MakeHuman asset
# packs listed in scripts/people/cast.json ("packs"), unpacked into MPFB's
# user data directory. Each person of cast.json becomes <out>/<id>.glb:
#   - the body baked to its phenotype and face targets, with the vertices
#     under permanent clothes removed (MakeHuman "delete_verts"), so nothing
#     can show through a sitting or kneeling robe;
#   - garments fitted by MPFB to that body and skinned from it, decimated to
#     a browser budget; hood states as separate meshes (hood_up / hood_down);
#   - the monks' tonsure cut into a short hair mesh (a ring of hair);
#   - plain glTF materials: textures derived here (dark wool from the robe's
#     own fold/weave maps, undyed tunic wool) at 1024 px, shared by name so
#     the packer can deduplicate them across people;
#   - the 53-bone MPFB "game_engine" skeleton, whose bone names match the
#     motion library (scripts/people/build_motions.py).
import bpy, bmesh, sys, os, json, math
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
OUT = os.path.abspath(arg('--out', os.path.join(ROOT, '.local', 'mh', 'out')))
TEX = os.path.join(OUT, 'tex')
ONLY = set(filter(None, (arg('--only', '') or '').split(',')))
os.makedirs(TEX, exist_ok=True)

from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
DATA = LocationService.get_user_data()
CAST = json.load(open(os.path.join(HERE, 'cast.json')))

# ---------------------------------------------------------------- images
def load_px(path, size=None):
    im = bpy.data.images.load(path, check_existing=False)
    if size and (im.size[0] != size or im.size[1] != size):
        im.scale(size, size)
    w, h = im.size
    a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
    bpy.data.images.remove(im)
    return a   # linear? no: Blender keeps byte images' pixels in their file (sRGB) encoding

def save_px(a, name, fmt='JPEG'):
    h, w = a.shape[:2]
    path = os.path.join(TEX, name)
    im = bpy.data.images.new(name, w, h, alpha=(fmt == 'PNG'))
    im.pixels[:] = np.clip(a, 0, 1).ravel()
    im.filepath_raw = path; im.file_format = fmt
    if fmt == 'JPEG': bpy.context.scene.render.image_settings.quality = 88
    im.save()
    bpy.data.images.remove(im)
    return path

def blur(a, r):
    # separable box blur, a few passes ~ gaussian
    out = a.copy()
    for _ in range(3):
        for ax in (0, 1):
            c = np.cumsum(np.pad(out, [(r + 1, r) if i == ax else (0, 0) for i in range(out.ndim)], mode='edge'), axis=ax)
            sl_hi = [slice(None)] * out.ndim; sl_lo = [slice(None)] * out.ndim
            sl_hi[ax] = slice(2 * r + 1, None); sl_lo[ax] = slice(0, -2 * r - 1)
            out = (c[tuple(sl_hi)] - c[tuple(sl_lo)]) / (2 * r + 1)
    return out

def lum(a): return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114

_made = {}
def texture(key, fn):
    """derive a texture once per build (shared across people by file name)"""
    if key not in _made: _made[key] = fn()
    return _made[key]

def wool_from_robe(variant):
    """The Donitz robe's albedo is brown sacking with its folds and wear
    painted in. Keep that light/fold variation, re-dye it: black wool for the
    Benedictines (dark grey-brown, not pure black: 14th-c. black dyes on wool
    were browned and uneven), the belt strip as dark leather."""
    def make():
        src = load_px(os.path.join(DATA, 'clothes/donitz_monk_robe/robe_brown__diffuse.png'), 1024)
        L = lum(src[..., :3])
        mask = (src[..., :3].max(-1) > 0.02).astype(np.float32)          # UV islands (the rest is black)
        m = np.maximum(1e-3, (L * mask).sum() / max(1, mask.sum()))
        rel = np.clip(L / m, 0.25, 2.2)
        base = np.array(variant['wool'], np.float32)                       # sRGB 0..1
        out = np.ones_like(src)
        detail = rel ** 0.8
        out[..., :3] = base * detail[..., None]
        # the rope strip at the top of the atlas (v > 0.94, image row near 0 in
        # Blender's bottom-up pixel order = the last rows) -> leather
        h = src.shape[0]
        strip = np.zeros(h, bool); strip[int(h * 0.938):] = True
        leather = np.array(variant.get('belt', [0.20, 0.14, 0.10]), np.float32)
        out[strip, :, :3] = leather * (0.6 + 0.5 * rel[strip, :, None])
        out[..., 3] = 1
        return save_px(out, f"robe_{variant['name']}.jpg")
    return texture('robe:' + variant['name'], make)

def robe_normal():
    def make():
        a = load_px(os.path.join(DATA, 'clothes/donitz_monk_robe/robe__normal_gl.png'), 1024); a[..., 3] = 1
        return save_px(a, 'robe_normal.jpg')
    return texture('robe_n', make)

def tunic_wool(variant):
    """The viking tunic's atlas carries mail and embroidered trims. For a lay
    servant of 1327: coarse undyed or plainly dyed wool, the fold shading of
    the original kept (heavily blurred so the mail pattern goes), a woven
    grain added, no trims."""
    def make():
        src = load_px(os.path.join(DATA, 'clothes/rehmanpolanski_viking_tunic/TUNIC_Viking.png'), 1024)
        L = lum(src[..., :3])
        bg = (src[..., :3].min(-1) > 0.97)
        # blurs that stay inside the UV islands (the white atlas background
        # must not bleed pale halos into the seams), and only the mid-scale
        # fold shading kept: the dark band of the mail skirt and each
        # island's own tone are divided out by the wide blur
        m = (~bg).astype(np.float32)
        mb = lambda x, r: blur(x * m, r) / np.maximum(blur(m, r), 1e-3)
        rel = np.where(bg, 1.0, np.clip(mb(L, 10) / np.maximum(mb(L, 60), 1e-3), 0.86, 1.14) ** 0.7)
        rng = np.random.default_rng(7)
        h, w = L.shape
        yy, xx = np.mgrid[0:h, 0:w]
        weave = 1 + 0.05 * np.sin(xx * 1.9) * np.sin(yy * 2.1) + 0.06 * (blur(rng.random((h, w)).astype(np.float32), 1) - 0.5)
        slub = 1 + 0.10 * (blur(rng.random((h, w)).astype(np.float32), 6) - 0.5) * 4
        base = np.array(variant['wool'], np.float32)
        out = np.ones_like(src)
        out[..., :3] = base * (rel * weave * slub)[..., None]
        return save_px(out, f"tunic_{variant['name']}.jpg")
    return texture('tunic:' + variant['name'], make)

def plain_cloth(path, name, base, r=10, size=1024):
    """any printed garment re-woven as plain cloth: its fold shading kept
    (blurred past its pattern), a coarse grain added, the colour given"""
    def make():
        src = load_px(path, size)
        L = lum(src[..., :3]); a = src[..., 3]
        Lb = blur(L, r)
        rel = np.clip(Lb / max(1e-3, Lb[a > 0.5].mean() if (a > 0.5).any() else Lb.mean()), 0.55, 1.5) ** 0.7
        rng = np.random.default_rng(11); h, w = L.shape
        slub = 1 + 0.4 * (blur(rng.random((h, w)).astype(np.float32), 5) - 0.5)
        out = np.ones_like(src); out[..., :3] = np.array(base, np.float32) * (rel * slub)[..., None]
        return save_px(out, name)
    return texture(name, make)

def plain(path, name, size=1024, mul=None, sat=None, fmt='JPEG'):
    def make():
        a = load_px(path, size)
        if sat is not None:
            l = lum(a[..., :3])[..., None]; a[..., :3] = l + (a[..., :3] - l) * sat
        if mul is not None: a[..., :3] *= np.array(mul, np.float32)
        if fmt == 'JPEG': a[..., 3] = 1
        return save_px(a, name, fmt)
    return texture(name, make)

# the light and shade of a hair or beard asset kept, its colour replaced by
# the brown or grey that short02 (the first hair of the cast) gives, so a
# person's hair tint (cast.json hairMul) means the same whatever the asset
HAIR_REF = {'brown': (0.295, 0.236, 0.195), 'grey': (0.402, 0.391, 0.383)}
def toned(path, name, grey, size=512):
    def make():
        a = load_px(path, size); m = a[..., 3] > 0.5
        l = lum(a[..., :3]); ml = max(1e-3, float(l[m].mean() if m.any() else l.mean()))
        a[..., :3] = np.clip((l / ml)[..., None] ** 0.8 * np.array(HAIR_REF['grey' if grey else 'brown'], np.float32), 0, 1)
        return save_px(a, name, 'PNG')
    return texture(name, make)

# ---------------------------------------------------------------- materials
def material(name, base=None, normal=None, rough=0.9, spec=0.3, alpha=False, color=(1, 1, 1)):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; P = nt.nodes['Principled BSDF']
    P.inputs['Roughness'].default_value = rough
    P.inputs['Specular IOR Level'].default_value = spec
    P.inputs['Base Color'].default_value = (*color, 1)
    if base:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(base, check_existing=True)
        nt.links.new(t.outputs['Color'], P.inputs['Base Color'])
        if alpha:
            nt.links.new(t.outputs['Alpha'], P.inputs['Alpha'])
            m.surface_render_method = 'DITHERED'
    if normal:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(normal, check_existing=True); t.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(t.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], P.inputs['Normal'])
    return m

# ---------------------------------------------------------------- mesh ops
def bake_shapes(o):
    if not o.data.shape_keys: return
    o.shape_key_add(name='baked', from_mix=True)
    for k in list(o.data.shape_keys.key_blocks)[:-1]: o.shape_key_remove(k)
    o.shape_key_remove(o.data.shape_keys.key_blocks[0])

def apply_mod(o, m):
    bpy.context.view_layer.objects.active = o
    with bpy.context.temp_override(object=o):
        bpy.ops.object.modifier_move_to_index(modifier=m.name, index=0)
        bpy.ops.object.modifier_apply(modifier=m.name)

def decimate(o, tris, symmetric=False):
    n = sum(len(p.vertices) - 2 for p in o.data.polygons)
    if n <= tris: return n
    m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = tris / n; m.use_collapse_triangulate = True
    if symmetric: m.use_symmetry = True; m.symmetry_axis = 'X'
    apply_mod(o, m)
    return sum(len(p.vertices) - 2 for p in o.data.polygons)

def delete_verts(o, pred):
    bm = bmesh.new(); bm.from_mesh(o.data)
    kill = [v for v in bm.verts if pred(v.co)]
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    bm.to_mesh(o.data); bm.free(); o.data.update()
    return len(kill)

def tonsure(hair, body, radius):
    """The corona: the crown shaved in a disc, a ring of hair left. Remove the
    hair shell above a plane round the vertex of the skull."""
    vs = [body.matrix_world @ v.co for v in body.data.vertices]
    top = max(v.z for v in vs)
    head = [v for v in vs if v.z > top - 0.12]
    cx = sum(v.x for v in head) / len(head); cy = sum(v.y for v in head) / len(head)
    cy += 0.015                                       # a little behind the skull's centre (+y is back)
    def dist(co):
        w = hair.matrix_world @ co
        return math.hypot(w.x - cx, (w.y - cy) * 0.92), w.z
    def crown(co):
        d, z = dist(co); return d < radius - 0.008 and z > top - 0.075
    n = delete_verts(hair, crown)
    # the cut feathers out over 2.5 cm (vertex alpha, multiplied into the
    # hair's own alpha by the runtime's alpha test): no hard ring edge
    me = hair.data
    col = me.color_attributes.new('fade', 'FLOAT_COLOR', 'POINT')
    for i, v in enumerate(me.vertices):
        d, z = dist(v.co)
        a = 1.0 if z < top - 0.075 else max(0.0, min(1.0, (d - (radius - 0.008)) / 0.025))
        col.data[i].color = (1.0, 1.0, 1.0, a * a * (3 - 2 * a))
    me.color_attributes.active_color = col
    return n

def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)

def skirt_weights(o, rig, width=0.15):
    """A long habit is one hanging garment, not two trouser legs: below the
    hips each vertex's thigh and calf weights are shared between the legs by
    its side of the body (fully its own leg at the flanks, half and half on the
    front and back panels), and foot weights are folded into the calf, so the
    skirt swings as a bell when walking, lies across the lap when seated and
    falls between the shins."""
    names = {g.index: g.name for g in o.vertex_groups}
    need = ['thigh_l', 'thigh_r', 'calf_l', 'calf_r']
    for n in need:
        if n not in o.vertex_groups: o.vertex_groups.new(name=n)
    G = {n: o.vertex_groups[n] for n in need}
    hip = (rig.matrix_world @ rig.data.bones['thigh_l'].head_local).z
    changed = 0
    for v in o.data.vertices:
        co = o.matrix_world @ v.co
        if co.z > hip + 0.02: continue
        w = {names[g.group]: g.weight for g in v.groups if g.group in names}
        T = w.get('thigh_l', 0) + w.get('thigh_r', 0)
        C = sum(w.get(k, 0) for k in ('calf_l', 'calf_r', 'foot_l', 'foot_r', 'ball_l', 'ball_r'))
        if T + C < 1e-4: continue
        x = co.x / width
        m = 0.5 + 0.5 * max(-1.0, min(1.0, x)) * (1.5 - 0.5 * abs(max(-1.0, min(1.0, x))))   # smooth, 1 = left
        # near the hips blend gently into the plain leg weights
        k = min(1.0, (hip + 0.02 - co.z) / 0.25)
        own_l = (w.get('thigh_l', 0) / T) if T > 0 else m
        ml = own_l + (m - own_l) * k
        for side, f in (('l', ml), ('r', 1 - ml)):
            G['thigh_' + side].add([v.index], T * f, 'REPLACE')
            G['calf_' + side].add([v.index], C * f, 'REPLACE')
        for k2 in ('foot_l', 'foot_r', 'ball_l', 'ball_r'):
            if k2 in o.vertex_groups: o.vertex_groups[k2].remove([v.index])
        changed += 1
    return changed

KEEP_BONES = ('head', 'neck_01', 'hand_', 'thumb_', 'index_', 'middle_', 'ring_', 'pinky_')
def hide_covered(body, garments, rig, reach=0.07):
    """Remove the flesh a garment covers (garments without MakeHuman delete
    lists: tunic, hose, boots). A vertex goes when rays along its normal and
    two tilted directions all meet cloth within `reach`, and its strongest
    bone is not the head, neck or a hand: the wrists, throat and face stay,
    whatever the pose."""
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get()
    trees = [BVHTree.FromObject(g, dg) for g in garments]
    names = {g.index: g.name for g in body.vertex_groups}
    me = body.data
    def dom(v):
        best, bn = 0, ''
        for g in v.groups:
            if g.weight > best: best, bn = g.weight, names.get(g.group, '')
        return bn
    kill = set()
    for v in me.vertices:
        if dom(v).startswith(KEEP_BONES): continue
        co = v.co; n = v.normal
        t1 = n.orthogonal().normalized(); t2 = n.cross(t1)
        ok = True
        for d in (n, (n + t1 * 0.5).normalized(), (n - t2 * 0.5).normalized()):
            if not any(t.ray_cast(co + d * 0.002, d, reach)[0] is not None for t in trees): ok = False; break
        if ok: kill.add(v.index)
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[bm.verts[i] for i in kill], context='VERTS')
    bm.to_mesh(me); bm.free(); me.update()
    return len(kill)

# ---------------------------------------------------------------- one person
def build(p):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    info = HumanService._create_default_human_info_dict()
    ph = info['phenotype']; ph.update(p['phenotype'])
    ph['race'] = p.get('race', {'caucasian': 1.0, 'asian': 0.0, 'african': 0.0})
    info['targets'] = [{'target': k, 'value': v} for k, v in p.get('targets', {}).items()]
    info['rig'] = 'game_engine'
    info['eyes'] = 'low-poly/low-poly.mhclo'
    info['eyebrows'] = p.get('eyebrows', 'eyebrow001') + '/' + p.get('eyebrows', 'eyebrow001') + '.mhclo'
    info['eyelashes'] = 'eyelashes01/eyelashes01.mhclo'
    if p.get('hair'): info['hair'] = p['hair'] + '/' + p['hair'] + '.mhclo'
    info['clothes'] = [c + '/' + c + '.mhclo' for c in p['clothes'] + list(p.get('hoods', {}).values())]
    info['skin_mhmat'] = p['skin'] + '/' + p['skin'] + '.mhmat'
    info['skin_material_type'] = 'MAKESKIN'
    s = HumanService.get_default_deserialization_settings(); s['subdiv_levels'] = 0
    body = HumanService.deserialize_from_dict(info, s)
    rig = body.parent
    objs = [o for o in bpy.data.objects if o.type == 'MESH']
    by = lambda frag: next((o for o in objs if frag in o.name), None)
    report = {'id': p['id']}

    # the body: baked, helpers and the flesh under permanent clothes removed
    bake_shapes(body)
    for m in [m for m in body.modifiers if m.type == 'MASK']:
        apply_mod(body, m)
    for o in objs:
        if o is not body: bake_shapes(o)
    covering = [o for o in objs if any(k in o.name for k in ('viking_tunic', 'viking_pants', 'wool_pants', 'boots', 'donitz_monk_robe'))
                and not any(k in o.name for k in ('hood',))]
    report['covered_removed'] = hide_covered(body, covering, rig)

    # tonsure (monks and novices), from the short hair's shell
    hair = by(p['hair']) if p.get('hair') else None
    if hair and p.get('tonsure'):
        report['tonsure_removed'] = tonsure(hair, body, p['tonsure'])

    # budgets (triangles)
    B = CAST['budgets']
    for o in objs:
        key = 'skin' if o is body else next((k for k in B if k != 'skin' and k in o.name), None)
        if key: decimate(o, p.get('budget', {}).get(key, B[key]), symmetric=(o is body))

    # the apron is fitted as an underlayer and would only show as slivers
    # through the tunic: lift it clear along its normals (it is skinned
    # afterwards with the rest, so it keeps following the body)
    for o in objs:
        if 'apron' in o.name:
            o.data.update()
            for v in o.data.vertices: v.co += v.normal * 0.02
            report['apron_lift'] = 0.02

    habit = next((o for o in objs if o.name.endswith('donitz_monk_robe')), None)
    if habit: report['skirt_verts'] = skirt_weights(habit, rig)
    for o in objs:
        for f in o.data.polygons: f.use_smooth = True
        if o.data.has_custom_normals:
            with bpy.context.temp_override(object=o): bpy.ops.mesh.customdata_custom_splitnormals_clear()

    # materials
    lay = p.get('dress') == 'lay'
    # a skin folder may also hold normal/specular maps: take the colour map
    pngs = sorted(f for f in os.listdir(os.path.join(DATA, 'skins', p['skin'])) if f.endswith('.png'))
    skin_png = next((f for f in pngs if 'diffuse' in f.lower()), None) or next(f for f in pngs if not any(k in f.lower() for k in ('nrm', 'norm', 'spec', 'bump')))
    skin_tex = plain(os.path.join(DATA, 'skins', p['skin'], skin_png), f"skin_{p['skin']}{'_s' + str(p['skinSat']) if p.get('skinSat') else ''}.jpg", 1024, sat=p.get('skinSat'))
    eye = p.get('eye', {'file': 'brown', 'sat': 0.55, 'mul': [0.8, 0.78, 0.72]})
    eye_tex = plain(os.path.join(DATA, 'eyes/materials', eye['file'] + '_eye.png'), f"eye_{eye['file']}_{p.get('eyeTone','a')}.jpg", 256, mul=eye.get('mul'), sat=eye.get('sat'))
    brow = p.get('eyebrows', 'eyebrow001')
    brow_png = next(f for f in os.listdir(os.path.join(DATA, 'eyebrows', brow)) if f.endswith('.png'))
    brow_tex = plain(os.path.join(DATA, 'eyebrows', brow, brow_png), f"brow_{brow}.png", 256, fmt='PNG', mul=p.get('browMul'))
    lash_dir = os.path.join(DATA, 'eyelashes/eyelashes01'); lash_png = next(f for f in os.listdir(lash_dir) if f.endswith('.png'))
    lash_tex = plain(os.path.join(lash_dir, lash_png), 'lash01.png', 256, fmt='PNG')
    assign = {}
    assign[body.name] = material('skin:' + p['skin'], skin_tex, rough=0.62, spec=0.35)
    assign[by('low-poly').name] = material('eye:' + os.path.basename(eye_tex), eye_tex, rough=0.15, spec=0.5)
    assign[by(brow).name] = material('brow:' + brow, brow_tex, rough=0.8, alpha=True)
    assign[by('eyelashes').name] = material('lash', lash_tex, rough=0.8, alpha=True)
    if hair:
        hdir = os.path.join(DATA, 'hair', p['hair']); hpng = next(f for f in os.listdir(hdir) if f.endswith('.png') and 'norm' not in f.lower())
        # two dyes per hair mesh, brown and grey; each person's own shade is a
        # material tint at runtime (cast.json "tint"), so the file stays small
        grey = (p.get('hairSat') is not None and p['hairSat'] < 0.4)
        if p['hair'] in ('short02', 'cortu_short_messy_hair'):
            htex = plain(os.path.join(hdir, hpng), f"hair_{p['hair']}_{'grey' if grey else 'brown'}.png", 512, fmt='PNG',
                         sat=0.12 if grey else None, mul=[1.6, 1.6, 1.6] if grey else None)
        else: htex = toned(os.path.join(hdir, hpng), f"hairn_{p['hair']}_{'grey' if grey else 'brown'}.png", grey)
        assign[hair.name] = material('hair:' + os.path.basename(htex), htex, rough=0.75, alpha=True)
    for o in objs:
        n = o.name
        if 'donitz_monk_robe' in n:
            v = CAST['wools'][p.get('wool', 'black')]
            assign[n] = material('habit:' + v['name'], wool_from_robe(v), robe_normal(), rough=0.96, spec=0.18)
        elif 'viking_tunic' in n:
            v = CAST['wools'][p.get('tunic', 'undyed')]
            assign[n] = material('tunic:' + v['name'], tunic_wool(v), rough=0.95, spec=0.2)
        elif 'viking_pants' in n or 'wool_pants' in n:
            d = os.path.join(DATA, 'clothes', 'rehmanpolanski_viking_pants' if 'viking' in n else 'toigo_wool_pants'); f = next(x for x in os.listdir(d) if x.lower().endswith('.png') and 'norm' not in x.lower())
            assign[n] = material('hose:' + p.get('hose', 'brown'), plain(os.path.join(d, f), f"hose_{p.get('hose','brown')}.jpg", 512, mul=CAST['hose'][p.get('hose', 'brown')], sat=0.6), rough=0.95, spec=0.2)
        elif 'boots' in n:
            c = next(c for c in p['clothes'] if 'boots' in c); d = os.path.join(DATA, 'clothes', c)
            f = next(x for x in os.listdir(d) if x.lower().endswith('.png') and 'norm' not in x.lower() and 'spec' not in x.lower())
            assign[n] = material('boots:' + c, plain(os.path.join(d, f), f"boots_{c}.jpg", 512, mul=[0.72, 0.66, 0.6], sat=0.7), rough=0.82, spec=0.25)
        elif 'beard' in n or 'moustache' in n:
            # facial hair takes the person's hair shade at runtime (cast.json
            # tint), like the hair: one brown and one grey dye per asset
            c = next(c for c in p['clothes'] if 'beard' in c or 'moustache' in c); d = os.path.join(DATA, 'clothes', c)
            f = next(x for x in os.listdir(d) if x.lower().endswith('.png') and not any(k in x.lower() for k in ('norm', '_hn.', '_h.', '_s.', 'spec')))
            grey = (p.get('hairSat') is not None and p['hairSat'] < 0.4)
            btex = toned(os.path.join(d, f), f"beardn_{c}_{'grey' if grey else 'brown'}.png", grey)
            assign[n] = material('beard:' + os.path.basename(btex), btex, rough=0.8, alpha=True)
        elif 'apron' in n:
            d = os.path.join(DATA, 'clothes', 'elvs_ladies_apron'); f = next(x for x in os.listdir(d) if x.lower().endswith('.png') and 'norm' not in x.lower())
            tone = p.get('apronTone', 'linen')
            assign[n] = material('apron:' + tone, plain_cloth(os.path.join(d, f), f'apron_{tone}.jpg', CAST['aprons'][tone], 8, 512), rough=0.92 if tone == 'linen' else 0.7, spec=0.2 if tone == 'linen' else 0.35)
    for o in objs:
        if o.name in assign:
            o.data.materials.clear(); o.data.materials.append(assign[o.name])

    # names the runtime reads (the rig's children)
    role = {}
    for o in objs:
        n = o.name
        role[n] = ('skin' if o is body else 'eyes' if 'low-poly' in n else 'brows' if brow in n else 'lashes' if 'eyelashes' in n
                   else 'hair' if hair and o is hair else 'hood_up' if n.endswith('donitz_monk_robe_hood') else 'hood_down' if 'hood_off' in n
                   else 'habit' if 'donitz_monk_robe' in n else 'tunic' if 'tunic' in n else 'hose' if 'pants' in n else 'boots' if 'boots' in n
                   else 'apron' if 'apron' in n else 'beard' if ('beard' in n or 'moustache' in n) else n)
    for o in objs: o.name = p['id'] + '.' + role[o.name]; o.data.name = o.name
    rig.name = p['id']; rig.data.name = p['id'] + '.skel'
    report['tris'] = {o.name.split('.')[-1]: tris(o) for o in objs}
    report['tris_total'] = sum(report['tris'].values())
    # the rest height of the pelvis and the eye, for the runtime
    pb = rig.data.bones['pelvis']; hb = rig.data.bones['head']
    report['pelvis_h'] = round((rig.matrix_world @ pb.head_local).z, 4)
    report['head_h'] = round((rig.matrix_world @ hb.head_local).z, 4)
    report['height'] = round(max((body.matrix_world @ v.co).z for v in body.data.vertices), 4)

    for o in objs:
        if o is hair: continue
        for c in list(o.data.color_attributes): o.data.color_attributes.remove(c)
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    path = os.path.join(OUT, p['id'] + '.glb')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=True, export_apply=False,
                              export_skins=True, export_animations=False, export_morph=True, export_morph_normal=False,
                              export_materials='EXPORT', export_image_format='AUTO', export_jpeg_quality=88,
                              export_texcoords=True, export_normals=True, export_tangents=False, export_def_bones=False,
                              export_vertex_color='ACTIVE')
    if '--blend' in argv: bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, p['id'] + '.blend'))
    report['bytes'] = os.path.getsize(path)
    return report

reports = []
for p in CAST['people']:
    if ONLY and p['id'] not in ONLY: continue
    r = build(p); reports.append(r); print('BUILT', json.dumps(r))
old = {}
rp = os.path.join(OUT, 'report.json')
if os.path.exists(rp): old = {r['id']: r for r in json.load(open(rp))}
for r in reports: old[r['id']] = r
json.dump(list(old.values()), open(rp, 'w'), indent=1)
