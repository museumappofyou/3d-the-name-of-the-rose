# The abbey's motion library, on the MPFB "game_engine" skeleton that every
# person of scripts/people/cast.json wears.
#
#   BLENDER_USER_RESOURCES=.local/tools/blender_user \
#   .local/tools/Blender.app/Contents/MacOS/Blender -b --python scripts/people/build_motions.py -- \
#       --src .local/mh/human_anims_raw.glb [--out .local/mh/out/motions.glb] [--preview dir]
#
# 1. Retargeted recordings. The CC0 clips already used by the abbey
#    (assets/models/human_anims.glb: Quaternius Universal Animation Library
#    and CMU motion capture as retargeted by Mesh2Motion; the meshopt
#    compression removed first, see pack_people.mjs --decompress) are read
#    straight from the glTF (rest pose and curves), and each joint's
#    world-space rotation away from its rest is laid onto the MPFB bone after
#    aligning the two rests by bone direction (the source rests in a T, the
#    target in an A). The pelvis path is scaled by the ratio of hip heights.
# 2. Authored task loops (tasks.py): writing at a desk, eating at a board,
#    kneeling in prayer, sitting on a bench, stirring, kneading, hammering,
#    forking hay, carrying a sack, reading at a lectern. Built with Blender's
#    IK against the real furniture heights of the abbey (desk/bench/table/
#    anvil/vat, from src/world/furniture.js) and baked to plain rotations.
import bpy, sys, os, json, math, struct
import numpy as np
from mathutils import Matrix, Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
def arg(name, default=None): return argv[argv.index(name) + 1] if name in argv else default
SRC = os.path.abspath(arg('--src', os.path.join(ROOT, '.local', 'mh', 'human_anims_raw.glb')))
OUT = os.path.abspath(arg('--out', os.path.join(ROOT, '.local', 'mh', 'out', 'motions.glb')))
PREVIEW = arg('--preview')
FPS = 30

from bl_ext.user_default.mpfb.services.humanservice import HumanService

# the recorded clips kept (source name in human_anims.glb -> name here)
KEEP = {
    'walk': 'walk', 'walkFormal': 'walkFormal', 'walkCarry': 'walkCarry', 'walkHeavy': 'walkHeavy',
    'idle': 'idle', 'idleSubtle': 'idleSubtle', 'foldArms': 'foldArms', 'listen': 'listen', 'talk': 'talk', 'nod': 'nod',
    'sit': 'sitRec', 'sitTalk': 'sitTalkRec', 'kneelWork': 'kneelWork', 'kneel': 'kneelRec', 'harvest': 'harvest',
    'chop': 'chop', 'pickUp': 'pickUp', 'interact': 'interact', 'hunched': 'hunched', 'greet': 'greet',
}

# ------------------------------------------------------------------ glTF source
def read_glb(path):
    b = open(path, 'rb').read()
    assert b[:4] == b'glTF'
    jl = struct.unpack_from('<I', b, 12)[0]
    J = json.loads(b[20:20 + jl])
    bin_off = 20 + jl + 8
    BIN = b[bin_off:]
    def acc(i):
        a = J['accessors'][i]; bv = J['bufferViews'][a['bufferView']]
        n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}[a['type']]
        dt = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8, 5122: np.int16, 5120: np.int8}[a['componentType']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = bv.get('byteStride', 0)
        cnt = a['count']
        if stride and stride != n * np.dtype(dt).itemsize:
            raw = np.frombuffer(BIN, np.uint8, count=stride * cnt, offset=off).reshape(cnt, stride)[:, :n * np.dtype(dt).itemsize]
            arr = np.frombuffer(raw.tobytes(), dt).reshape(cnt, n).astype(np.float64)
        else:
            arr = np.frombuffer(BIN, dt, count=cnt * n, offset=off).reshape(cnt, n).astype(np.float64)
        if a.get('normalized'):
            arr = arr / {np.int16: 32767.0, np.uint16: 65535.0, np.int8: 127.0, np.uint8: 255.0}[dt]
        return arr
    return J, acc

# glTF is Y-up; Blender Z-up: p_b = C p_g
C = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
Ci = C.inverted()

def trs(t, r, s):
    q = Quaternion((r[3], r[0], r[1], r[2]))
    return Matrix.Translation(Vector(t)) @ q.to_matrix().to_4x4() @ Matrix.Diagonal(Vector((*s, 1)))

class Source:
    def __init__(self, path):
        J, acc = read_glb(path)
        self.J = J; self.nodes = J['nodes']
        self.parent = {}
        for i, n in enumerate(self.nodes):
            for c in n.get('children', []): self.parent[c] = i
        self.byname = {n.get('name'): i for i, n in enumerate(self.nodes)}
        self.rest = [(n.get('translation', [0, 0, 0]), n.get('rotation', [0, 0, 0, 1]), n.get('scale', [1, 1, 1])) for n in self.nodes]
        self.anims = {}
        for a in J.get('animations', []):
            ch = {}
            for c in a['channels']:
                s = a['samplers'][c['sampler']]
                ch[(c['target']['node'], c['target']['path'])] = (acc(s['input'])[:, 0], acc(s['output']), s.get('interpolation', 'LINEAR'))
            dur = max(v[0][-1] for v in ch.values())
            self.anims[a['name']] = (ch, dur)
    def local(self, i, anim=None, t=0.0):
        T, R, S = self.rest[i]
        if anim:
            ch = self.anims[anim][0]
            for path in ('translation', 'rotation', 'scale'):
                k = ch.get((i, path))
                if not k: continue
                x, y, interp = k
                if t <= x[0]: v = y[0]
                elif t >= x[-1]: v = y[-1]
                else:
                    j = int(np.searchsorted(x, t) - 1); f = (t - x[j]) / (x[j + 1] - x[j])
                    if path == 'rotation':
                        qa = Quaternion((y[j][3], *y[j][:3])); qb = Quaternion((y[j + 1][3], *y[j + 1][:3]))
                        q = qa.slerp(qb, f); v = [q.x, q.y, q.z, q.w]
                    else: v = y[j] * (1 - f) + y[j + 1] * f
                if path == 'translation': T = list(v)
                elif path == 'rotation': R = list(v)
                else: S = list(v)
        return trs(T, R, S)
    def world(self, anim=None, t=0.0):
        W = {}
        def w(i):
            if i in W: return W[i]
            m = self.local(i, anim, t)
            if i in self.parent: m = w(self.parent[i]) @ m
            W[i] = m; return m
        return {n.get('name'): C @ w(i) @ Ci for i, n in enumerate(self.nodes)}

def frame(y, x):
    y = y.normalized(); x = (x - y * x.dot(y))
    if x.length < 1e-6: x = Vector((0, 0, 1)) - y * y.z
    x.normalize(); z = x.cross(y)
    return Matrix((x, y, z)).transposed()

SIDES = [('_l', '_r')]
CHILD = {'pelvis': 'spine_01', 'spine_01': 'spine_02', 'spine_02': 'spine_03', 'spine_03': 'neck_01', 'neck_01': 'head'}
LEAF = {'head': 'head_leaf'}
FRAME = {'pelvis': ('spine_01', ('thigh_l', 'thigh_r')), 'spine_03': ('neck_01', ('clavicle_l', 'clavicle_r'))}
for s_ in ('l', 'r'):
    CHILD.update({f'clavicle_{s_}': f'upperarm_{s_}', f'upperarm_{s_}': f'lowerarm_{s_}', f'lowerarm_{s_}': f'hand_{s_}', f'hand_{s_}': f'middle_01_{s_}',
                  f'thigh_{s_}': f'calf_{s_}', f'calf_{s_}': f'foot_{s_}', f'foot_{s_}': f'ball_{s_}'})
    LEAF[f'ball_{s_}'] = f'ball_leaf_{s_}'
    FRAME[f'hand_{s_}'] = (f'middle_01_{s_}', (f'index_01_{s_}', f'pinky_01_{s_}'))
    for arm in ('clavicle', 'upperarm', 'lowerarm'): FRAME[f'{arm}_{s_}'] = (None, (0, -1, 0))
    for fn in ('thumb', 'index', 'middle', 'ring', 'pinky'):
        CHILD[f'{fn}_01_{s_}'] = f'{fn}_02_{s_}'; CHILD[f'{fn}_02_{s_}'] = f'{fn}_03_{s_}'; LEAF[f'{fn}_03_{s_}'] = f'{fn}_04_leaf_{s_}'
        for k in ('01', '02', '03'): FRAME[f'{fn}_{k}_{s_}'] = (None, (0, -1, 0) if fn != 'thumb' else (0, 0, 1))
    FRAME[f'foot_{s_}'] = (f'ball_{s_}', (1, 0, 0))

# ------------------------------------------------------------------ target rig
def reference_rig():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    info = HumanService._create_default_human_info_dict()
    info['phenotype'].update({'gender': 1.0, 'age': 0.62, 'muscle': 0.45, 'weight': 0.48, 'height': 0.5, 'proportions': 0.5})
    info['phenotype']['race'] = {'caucasian': 1.0, 'asian': 0.0, 'african': 0.0}
    info['rig'] = 'game_engine'
    info['clothes'] = ['donitz_monk_robe/donitz_monk_robe.mhclo'] if PREVIEW else []
    info['skin_material_type'] = 'NONE'
    s = HumanService.get_default_deserialization_settings(); s['subdiv_levels'] = 0
    body = HumanService.deserialize_from_dict(info, s)
    rig = body.parent
    rig.name = 'motions'; rig.data.name = 'motions.skel'
    for pb in rig.pose.bones: pb.rotation_mode = 'QUATERNION'
    return rig, body

def order(rig):
    out = []
    def rec(b):
        out.append(b.name)
        for c in b.children: rec(c)
    for b in rig.data.bones:
        if not b.parent: rec(b)
    return out

def retarget(src, rig, name, new_name):
    ch, dur = src.anims[name]
    rest_s = src.world()
    R = rig.matrix_world
    bones = order(rig)
    rest_t = {b: (R @ rig.data.bones[b].matrix_local) for b in bones}
    mapped = {b: b for b in bones if b in rest_s}
    mapped['Root'] = None
    # align the two rests by whole frames built from the joints themselves:
    # primary axis toward the bone's child joint, secondary across the body
    # (left minus right) or across the palm; a direction alone leaves the roll
    # free, and a free roll of the pelvis would swing every child joint
    align = {}
    sj = {b: rest_s[b].to_translation() for b in rest_s}
    def tj(b, tail=False):
        bb = rig.data.bones[b]; return R @ (bb.tail_local if tail else bb.head_local)
    for b in bones:
        if not mapped.get(b): continue
        ch, sec = FRAME.get(b, (None, None))
        if ch is None: ch = CHILD.get(b)
        if ch and ch in sj and ch in rig.data.bones:
            ps, pt = sj[ch] - sj[b], tj(ch) - tj(b)
        else:
            leaf = LEAF.get(b)
            ps = (sj[leaf] - sj[b]) if leaf in sj else rest_s[b].to_3x3() @ Vector((0, 1, 0))
            pt = tj(b, True) - tj(b)
        if sec and isinstance(sec[0], str):
            ss, st = sj[sec[0]] - sj[sec[1]], tj(sec[0]) - tj(sec[1])
        else:
            v = Vector(sec or (1, 0, 0)); ss = st = v
        align[b] = (frame(ps, ss) @ frame(pt, st).transposed()).to_quaternion()
    ps0 = rest_s['pelvis'].to_translation(); pt0 = rest_t['pelvis'].to_translation()
    k = pt0.z / ps0.z
    act = bpy.data.actions.new(new_name)
    rig.animation_data_create(); rig.animation_data.action = act
    n = max(2, int(round(dur * FPS)) + 1)
    for f in range(n):
        t = min(dur, f / FPS)
        ws = src.world(name, t)
        W = {}
        for b in bones:
            bone = rig.data.bones[b]; pb = rig.pose.bones[b]
            prel = (bone.parent.matrix_local.inverted() @ bone.matrix_local) if bone.parent else bone.matrix_local
            parentW = W[bone.parent.name] if bone.parent else R
            if mapped.get(b):
                D = ws[b].to_quaternion() @ rest_s[b].to_quaternion().inverted()
                q = D @ align[b] @ rest_t[b].to_quaternion()
            else:
                q = (parentW @ prel).to_quaternion()
            basis_q = prel.to_quaternion().inverted() @ parentW.to_quaternion().inverted() @ q
            pb.rotation_quaternion = basis_q
            pb.keyframe_insert('rotation_quaternion', frame=f + 1, group=b)
            loc = Vector((0, 0, 0))
            if b == 'pelvis':
                p = ws['pelvis'].to_translation()
                target = Vector((p.x * k, p.y * k, p.z * k))
                M = parentW @ prel
                loc = M.inverted() @ target
                # (M is the rest-frame of the bone in world: the basis location is in it)
                pb.location = loc
                pb.keyframe_insert('location', frame=f + 1, group=b)
            # the world matrix of this bone for its children
            W[b] = parentW @ prel @ Matrix.Translation(loc) @ basis_q.to_matrix().to_4x4()
    return act

# ------------------------------------------------------------------ export
def stash(rig, act):
    tr = rig.animation_data.nla_tracks.new(); tr.name = act.name
    st = tr.strips.new(act.name, 1, act); st.name = act.name
    tr.mute = False
    act.use_fake_user = True

def main():
    src = Source(SRC)
    rig, body = reference_rig()
    info = {'pelvis_h': round((rig.matrix_world @ rig.data.bones['pelvis'].head_local).z, 4), 'clips': {}}
    acts = []
    for a, nn in KEEP.items():
        if '--tasks-only' in argv: break
        if a not in src.anims: print('MISSING', a); continue
        act = retarget(src, rig, a, nn); acts.append(act)
        info['clips'][nn] = {'frames': int(act.frame_range[1]), 'source': a}
    import tasks, ast
    for act in tasks.author(rig, FPS, body):
        acts.append(act); info['clips'][act.name] = {'frames': int(act.frame_range[1]), 'source': 'authored'}
    # held things (quill, spoon, paddle, hammer, tongs, fork, broom): their
    # world placement at the clip's first frame and the holding bone's, in
    # glTF (Y-up) coordinates; the runtime derives the grip from the clip
    # Props are procedural +Y tools at runtime, not glTF-exported meshes.
    # Convert the world frame only; their local +Y shaft stays +Y.
    def g(m): return [list(r) for r in (Ci @ Matrix(m))]
    info['props'] = {}
    for task, pr in ast.literal_eval(rig.get('props', '{}')).items():
        info['props'][task] = {k: (v if k.startswith('_') else {'bone': v['bone'], 'world': g(v['world'])}) for k, v in pr.items()}
    if PREVIEW:
        only = arg('--preview-only')
        tasks.preview(rig, body, [a for a in acts if not only or a.name in only.split(',')], PREVIEW)
    rig.animation_data.action = None
    for act in acts: stash(rig, act)
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True); bpy.context.view_layer.objects.active = rig
    body.hide_set(False)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_yup=True, export_skins=True,
                              export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True,
                              export_frame_step=1, export_def_bones=False, export_anim_single_armature=True,
                              export_optimize_animation_size=True, export_materials='NONE', export_morph=False,
                              export_reset_pose_bones=True)
    json.dump(info, open(OUT.replace('.glb', '.json'), 'w'), indent=1)
    print('MOTIONS', OUT, len(acts))

main()
