# Authored task loops for the abbey's people (imported by build_motions.py).
#
# Each task is a function of time returning a pose: where the pelvis is, how
# the spine and head bend, where each hand and foot must be (two-bone IK with
# a pole), how the hand is turned (its palm frame) and how the fingers close.
# The pose is solved analytically for every frame and baked to bone
# rotations, so contacts hold exactly on the reference body: the quill on the
# parchment, the pelvis on the bench, knees and toes on the floor, the paddle
# in the pot. Distances are those of the abbey's furniture
# (src/world/furniture.js, aedificium.js, outbuildings.js):
#   scriptorium desk: bench seat 0.50, 0.75 behind the desk's centre; the
#     sloping top (0.32 rad) carries the parchment at 1.00, 0.71 ahead
#   refectory: bench seat 0.46, board 0.78 high, bowl 0.56 ahead
#   anvil face 0.89, 0.72 ahead; blood vat rim 1.54, surface 1.42
#   manger 0.78; kitchen tables 0.78; lectern book ~1.25 above the pulpit
# Character frame: x = the person's left, "fwd" = where they face (Blender -Y),
# z = up; the origin is on the floor under the pelvis of the slot.
import bpy, math, os
from mathutils import Vector, Matrix, Quaternion

def V(l, f, u): return Vector((l, -f, u))
DESK_BENCH = 0.62      # scriptorium: bench centre to desk centre (furniture.js desk())
LEFT, FWD, UP = Vector((1, 0, 0)), Vector((0, -1, 0)), Vector((0, 0, 1))
def rot(axis, deg): return Quaternion(Vector(axis).normalized(), math.radians(deg))
def ease(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)
def lerp(a, b, t): return a + (b - a) * t
def wave(t, period, phase=0.0): return math.sin(2 * math.pi * (t / period + phase))
def frame(y, x):
    y = y.normalized(); x = (x - y * x.dot(y)).normalized(); z = x.cross(y)
    return Matrix((x, y, z)).transposed()

class Poser:
    def __init__(self, rig):
        self.rig = rig; self.R = rig.matrix_world.copy()
        self.bones = []
        def rec(b):
            self.bones.append(b.name)
            for c in b.children: rec(c)
        for b in rig.data.bones:
            if not b.parent: rec(b)
        B = rig.data.bones
        self.rest = {b: self.R @ B[b].matrix_local for b in self.bones}
        self.prel = {b: (B[b].parent.matrix_local.inverted() @ B[b].matrix_local) if B[b].parent else B[b].matrix_local for b in self.bones}
        self.parent = {b: B[b].parent.name if B[b].parent else None for b in self.bones}
        self.head = {b: self.rest[b].to_translation() for b in self.bones}
        self.L = lambda a, b: (self.head[b] - self.head[a]).length
        # rest palm frames (forward along the hand, normal out of the palm)
        self.palm = {}
        for s in 'lr':
            f = self.head[f'middle_01_{s}'] - self.head[f'hand_{s}']
            across = self.head[f'index_01_{s}'] - self.head[f'pinky_01_{s}']
            n = across.cross(f) if s == 'r' else f.cross(across)
            self.palm[s] = (f.normalized(), n.normalized())
        # rest foot frames (forward toe, sole normal down)
        self.foot = {s: ((self.head[f'ball_{s}'] - self.head[f'foot_{s}']).normalized(), Vector((0, 0, -1))) for s in 'lr'}
        self.hip_h = self.head['pelvis'].z
        self.prev = {}

    def hand_rot(self, s, fwd, normal):
        f0, n0 = self.palm[s]
        Q = frame(fwd, normal) @ frame(f0, n0).transposed()
        return Q.to_quaternion() @ self.rest[f'hand_{s}'].to_quaternion()

    def foot_rot(self, s, fwd):
        f0, n0 = self.foot[s]
        Q = frame(fwd, Vector((0, 0, -1))) @ frame(f0, n0).transposed()
        return Q.to_quaternion() @ self.rest[f'foot_{s}'].to_quaternion()

    def solve(self, P):
        """P: pelvis (pos, delta quat); spine [deg forward bend per bone];
        twist; head (bow, turn, tilt); hands {s: (target, fwd, normal, pole)};
        feet {s: (target, fwd, pole)}; curl {s: {finger: deg}}; clav {s: (up, fwd) deg}"""
        W, basis, loc = {}, {}, {}
        ik = {}
        for s, h in (P.get('hands') or {}).items():
            if h: ik[f'upperarm_{s}'] = ('arm', s, h)
        for s, h in (P.get('feet') or {}).items():
            if h: ik[f'thigh_{s}'] = ('leg', s, h)
        pending = {}
        sp = P.get('spine', (0, 0, 0)); tw = P.get('twist', (0, 0, 0)); side = P.get('side', (0, 0, 0))
        hb, ht, hl = P.get('head', (0, 0, 0))
        nb = P.get('neck', hb * 0.4)
        pel_d = P.get('pelvis_rot', Quaternion())
        cum = pel_d.copy()
        for b in self.bones:
            par = self.parent[b]
            pW = W[par] if par else self.R
            M0 = pW @ self.prel[b]
            head = M0.to_translation(); r = M0.to_quaternion()
            if b == 'pelvis':
                head = P['pelvis']; r = pel_d @ self.rest[b].to_quaternion()
            elif b in ('spine_01', 'spine_02', 'spine_03'):
                i = int(b[-1]) - 1
                cum = rot(UP, tw[i]) @ rot(FWD, side[i]) @ rot(LEFT, sp[i]) @ cum
                r = cum @ self.rest[b].to_quaternion()
            elif b == 'neck_01':
                cumn = rot(UP, ht * 0.35) @ rot(LEFT, nb) @ cum
                r = cumn @ self.rest[b].to_quaternion()
            elif b == 'head':
                r = rot(UP, ht) @ rot(FWD, hl) @ rot(LEFT, hb) @ cum @ self.rest[b].to_quaternion()
            elif b.startswith('clavicle_'):
                s = b[-1]; up, fw = (P.get('clav') or {}).get(s, (0, 0))
                sg = 1 if s == 'l' else -1
                r = rot(FWD, -sg * up) @ rot(UP, -sg * fw) @ cum @ self.rest[b].to_quaternion()
            elif b in pending:
                r = pending.pop(b)
            elif b in ik:
                kind, s, h = ik[b]
                mid, end = (f'lowerarm_{s}', f'hand_{s}') if kind == 'arm' else (f'calf_{s}', f'foot_{s}')
                L1, L2 = self.L(b, mid), self.L(mid, end)
                T = h[0]; S = head
                d = max(1e-4, min((T - S).length, (L1 + L2) * 0.9995))
                dirv = (T - S).normalized()
                a = (L1 * L1 - L2 * L2 + d * d) / (2 * d); hh = math.sqrt(max(0.0, L1 * L1 - a * a))
                pole = h[-1]; pp = (pole - dirv * pole.dot(dirv)).normalized()
                E = S + dirv * a + pp * hh
                Tt = S + dirv * d
                # upper: aim at the elbow/knee keeping the bend plane (pole) as its secondary
                yu = (E - S).normalized()
                r = self._aim(M0, yu, pp)
                M1 = Matrix.Translation(head) @ r.to_matrix().to_4x4()
                M0m = M1 @ self.prel[mid]
                yl = (Tt - E).normalized()
                pending[mid] = self._aim(M0m, yl, pp)
                if kind == 'arm': pending[end] = self.hand_rot(s, h[1], h[2])
                else: pending[end] = self.foot_rot(s, h[1])
            # fingers
            fn = b.split('_')[0]
            if fn in ('thumb', 'index', 'middle', 'ring', 'pinky') and b[-2] == '_':
                s = b[-1]; seg = int(b.split('_')[1])
                cu = (P.get('curl') or {}).get(s, {})
                # knuckle, middle and end joints close by different amounts
                ang = cu.get(fn, cu.get('all', 0)) * (0.8, 1.0, 0.7)[seg - 1]
                if fn == 'thumb': ang *= 0.5
                if ang:
                    # about the hand's own flexion axis (its forward crossed
                    # with the palm normal), the same for every segment: an axis
                    # taken from the bent segment itself flips past 90 degrees
                    hand_q = W[f'hand_{s}'].to_quaternion(); rq = self.rest[f'hand_{s}'].to_quaternion().inverted()
                    f0, n0 = self.palm[s]
                    ax = (hand_q @ (rq @ f0)).cross(hand_q @ (rq @ n0))
                    if ax.length > 1e-5: r = Quaternion(ax.normalized(), math.radians(ang)) @ r
            W[b] = Matrix.Translation(head) @ r.to_matrix().to_4x4()
            q = M0.to_quaternion().inverted() @ r
            pq = self.prev.get(b)
            if pq is not None and pq.dot(q) < 0: q.negate()
            basis[b] = q
            if b == 'pelvis': loc[b] = M0.inverted() @ head
        self.W = W
        return basis, loc

    def _aim(self, M0, y, pole):
        """rotate the bone frame M0 so its Y points along y, its twist chosen
        so that the bend (toward the pole) happens about its own X axis"""
        x = y.cross(pole)
        if x.length < 1e-6: return (M0.to_quaternion() @ Vector((0, 1, 0))).rotation_difference(y) @ M0.to_quaternion()
        F = frame(y, x)
        # keep the rest's handedness of X relative to the parent frame
        r0 = M0.to_quaternion(); x0 = r0 @ Vector((1, 0, 0))
        if x0.dot(F.col[0].to_3d()) < 0: F = frame(y, -x)
        return F.to_quaternion()

    def key(self, basis, loc, f):
        for b in self.bones:
            pb = self.rig.pose.bones[b]
            pb.rotation_quaternion = basis[b]
            pb.keyframe_insert('rotation_quaternion', frame=f, group=b)
            self.prev[b] = basis[b].copy()
            if b in loc:
                pb.location = loc[b]; pb.keyframe_insert('location', frame=f, group=b)
            elif b == 'pelvis':
                pb.location = (0, 0, 0); pb.keyframe_insert('location', frame=f, group=b)

    def world_of(self, bone): return self.W[bone]

def bake(rig, poser, name, dur, fps, fn, props=None):
    act = bpy.data.actions.new(name)
    rig.animation_data_create(); rig.animation_data.action = act
    poser.prev = {}
    n = int(round(dur * fps))
    PROPS = {}
    for f in range(n + 1):
        t = (f % n) / fps          # the last frame repeats the first: a seamless loop
        P = fn(t)
        basis, loc = poser.solve(P)
        poser.key(basis, loc, f + 1)
        if f == 0 and P.get('mark') is not None: act['mark'] = list(P['mark'])
        if f == 0 and P.get('props'):
            for k, (bone, M) in P['props'].items():
                PROPS[k] = {'bone': bone, 'world': [list(r) for r in M], 'boneWorld': [list(r) for r in poser.W[bone]]}
    act['props'] = str(PROPS)
    act.use_fake_user = True
    return act, PROPS

# ------------------------------------------------------------------ the tasks
MOUTH = Vector((0, 0, 0))
def author(rig, fps, body=None):
    global MOUTH
    P = Poser(rig)
    if body is not None:
        hz = P.head['head'].z
        pts = [body.matrix_world @ v.co for v in body.data.vertices]
        cand = [p for p in pts if hz - 0.07 < p.z < hz + 0.01 and abs(p.x) < 0.012]
        m = min(cand, key=lambda p: p.y)                    # the lips: the foremost point low on the face
        MOUTH = P.rest['head'].inverted() @ (m + Vector((0, 0.01, 0)))
    out, props = [], {}
    hipH = P.hip_h
    thigh = P.L('thigh_l', 'calf_l'); shin = P.L('calf_l', 'foot_l')
    ankle = P.head['foot_l'].z + rig.get('sole_clearance', 0)  # fitted footwear on the floor
    hipx = abs(P.head['thigh_l'].x)

    def seated(seat, t, lean=0.0, feet_fwd=None, edge=0.0):
        """pelvis resting on a seat of height `seat` (the sitting bones a few cm
        below the hip joint), thighs forward, shins down to the floor"""
        ph = seat + 0.085
        pos = V(0, -0.02 + edge, ph)
        ff = (feet_fwd if feet_fwd is not None else thigh * 0.92) + edge
        feet = {s: (V((1 if s == 'l' else -1) * (hipx + 0.03), ff, ankle), FWD + LEFT * (0.08 if s == 'l' else -0.08), FWD) for s in 'lr'}
        return pos, feet

    # --- write: the quill on the parchment ---------------------------------
    # the page: 0.71 ahead at its middle, 1.003 high, sloping down toward the
    # scribe by 0.33 m per metre; lines run from the scribe's left to right
    DB = DESK_BENCH
    def page(u, v):
        """u: 0..1 across a line (left→right), v: 0..1 down the column"""
        lat = 0.09 - 0.22 * u                         # the leaf lies centre-right (furniture.js desk())
        fwd = DB - 0.04 + 0.04 - 0.14 * v            # the page's middle is 0.04 nearer than the desk's
        up = 1.003 - ((DB - 0.04) - fwd) * 0.33 + 0.004
        return V(lat, fwd, up)

    def write(t):
        pos, feet = seated(0.50, t, edge=0.05)
        # a line of script every ~5.2 s: small strokes, then the lift and
        # return; every third line the quill goes to the inkhorn (right)
        line = int(t // 5.2); lt = (t % 5.2) / 5.2
        v = 0.35 + 0.2 * (line % 3)
        dip = line % 3 == 2 and lt > 0.82
        if lt < 0.8:
            u = lt / 0.8
            stroke = 0.006 * wave(t, 0.23) + 0.003 * wave(t, 0.61)
            tip = page(u, v) + V(0, 0, max(0.0, 0.004 * wave(t, 0.46)))
            tip = tip + V(0, stroke, 0)
        else:
            k = (lt - 0.8) / 0.2
            a, b = page(1.0, v), page(0.0, v + 0.06)
            if dip:
                ink = V(-0.58, DB - 0.2, 1.08)
                tip = (a.lerp(ink, ease(k * 2)) if k < 0.5 else ink.lerp(b, ease(k * 2 - 1))) + V(0, 0, 0.05 * math.sin(math.pi * k))
            else:
                tip = a.lerp(b, ease(k)) + V(0, 0, 0.03 * math.sin(math.pi * k))
        # the right hand holds the quill: palm turned down and in, fingers toward the page
        # the hand rests on its outer edge, palm turned in and down; the quill
        # is held a few centimetres above its nib, the shaft back over the knuckle
        hf = (FWD * 0.8 + LEFT * 0.45 - UP * 0.2).normalized()
        hn = (LEFT * 0.75 - UP * 0.65).normalized()
        quill_dir = (FWD * 0.55 - UP * 0.75 + LEFT * 0.2).normalized()     # grip -> nib
        grip_off = hf * 0.085 + hn * 0.03 + hn.cross(hf) * 0.01                 # between thumb and index
        hand_r = tip - quill_dir * 0.035 - grip_off
        # the left hand lies on the leaf (with the penknife, to hold it flat),
        # a little above and left of the line: palm down, fingers forward-right
        lf = (FWD * 0.85 - LEFT * 0.35 - UP * 0.3).normalized()
        ln = (-UP * 0.95 + FWD * 0.3).normalized()
        lk = page(-0.15, v - 0.2) - lf * 0.06 - ln * 0.035
        breath = 0.4 * wave(t, 4.1)
        pose = {
            'pelvis': pos, 'pelvis_rot': rot(LEFT, 4),
            'spine': (3 + breath * 0.3, 4, 5 + breath * 0.5), 'twist': (0, -2, -4),
            'head': (24 + 3 * wave(t, 7.3), -5 + 5 * (0.5 - (lt if lt < 0.8 else 0.5)), 0), 'neck': 12,
            'hands': {'r': (hand_r, hf, hn, V(-1, -0.25, -0.45)), 'l': (lk, lf, ln, V(1, -0.25, -0.45))},
            'feet': feet, 'clav': {'r': (2, 6), 'l': (0, 4)},
            'curl': {'r': {'index': 35, 'middle': 45, 'ring': 60, 'pinky': 65, 'thumb': 20}, 'l': {'all': 25, 'thumb': 10}},
        }
        # the quill, tip on the page, shaft up past the knuckles
        qm = frame(-quill_dir, hn.cross(-quill_dir)).to_4x4(); qm.translation = tip
        pose['props'] = {'quill': ('hand_r', qm)}
        pose['mark'] = tip
        return pose
    a, pr = bake(rig, P, 'write', 15.6, fps, write); out.append(a); props['write'] = pr

    # --- sit: resting on a bench, hands in the lap --------------------------
    def sit(t):
        pos, feet = seated(0.46, t)
        b = wave(t, 4.4)
        lap = V(0, 0.24, 0.46 + 0.20)
        return {
            'pelvis': pos + V(0, 0, 0.003 * b), 'pelvis_rot': rot(LEFT, 3),
            'spine': (2 + 0.6 * b, 2, 1.5 + 0.6 * b), 'head': (10, 2 * wave(t, 11), 0),
            'hands': {'r': (lap + V(-0.06, 0, 0.01), (FWD + LEFT * 0.9).normalized(), (-UP + LEFT * 0.2).normalized(), V(-1, 0.2, -0.3)),
                      'l': (lap + V(0.06, 0.02, 0.035), (FWD - LEFT * 0.9).normalized(), (-UP - LEFT * 0.2).normalized(), V(1, 0.2, -0.3))},
            'feet': feet, 'curl': {'r': {'all': 30}, 'l': {'all': 30}},
        }
    a, _ = bake(rig, P, 'sitBench', 8.8, fps, sit); out.append(a)

    # --- kneel in prayer: both knees on the stone, hands joined -------------
    def kneel(t, bow=0.0):
        knee_f = 0.18
        ph = 0.085 + thigh * math.cos(math.radians(8)) + 0.02     # knees on the floor, thighs near upright
        pos = V(0, knee_f - thigh * math.sin(math.radians(8)) - 0.02, ph)
        feet = {s: (V((1 if s == 'l' else -1) * (hipx + 0.01), knee_f - shin + 0.02, 0.1), (-UP * 0.85 + FWD * 0.5).normalized(), FWD) for s in 'lr'}
        b = wave(t, 4.8)
        ch = V(0, 0.2 + 0.1 * bow, ph + 0.43 - 0.12 * bow)
        return {
            'pelvis': pos + V(0, 0, 0.004 * b), 'pelvis_rot': rot(LEFT, 3 + 6 * bow),
            'spine': (2 + 10 * bow + 0.5 * b, 3 + 14 * bow, 3 + 12 * bow + 0.6 * b), 'head': (20 + 25 * bow, 0, 0), 'neck': 8 + 8 * bow,
            'hands': {'r': (ch + V(-0.015, 0, 0), (UP * 0.9 + FWD * 0.35).normalized(), LEFT, V(-1, 0.2, -0.6)),
                      'l': (ch + V(0.015, 0, 0), (UP * 0.9 + FWD * 0.35).normalized(), -LEFT, V(1, 0.2, -0.6))},
            'feet': feet, 'curl': {'r': {'all': 8, 'thumb': 5}, 'l': {'all': 8, 'thumb': 5}},
        }
    a, _ = bake(rig, P, 'kneelPray', 9.6, fps, lambda t: kneel(t)); out.append(a)
    a, _ = bake(rig, P, 'kneelBow', 9.6, fps, lambda t: kneel(t, 1.0)); out.append(a)

    # ------------------------------------------------------------------
    def standing(t, spread=0.11, bend=4.0, fwd_l=0.02, fwd_r=-0.02, sway=0.0, drop=0.015):
        pos = V(sway, 0.0, hipH - drop)
        feet = {'l': (V(spread, fwd_l, ankle), (FWD + LEFT * 0.12).normalized(), (FWD + UP * 0.1).normalized()),
                'r': (V(-spread, fwd_r, ankle), (FWD - LEFT * 0.12).normalized(), (FWD + UP * 0.1).normalized())}
        return pos, feet

    def grip(s, point, shaft, facing=FWD, over=True):
        """a fist round a shaft at `point`: knuckles toward `facing`, the palm
        across the shaft; returns the wrist target and the hand frame"""
        sh = shaft.normalized()
        f = (facing - sh * facing.dot(sh)).normalized()
        across = sh if over else -sh
        n = across.cross(f) if s == 'r' else f.cross(across)
        wrist = point - f * 0.075 - n * 0.035
        return wrist, f, n

    def pole_frame(tip, toward):
        y = (toward - tip).normalized(); x = y.cross(UP)
        if x.length < 1e-4: x = LEFT
        m = frame(y, x).to_4x4(); m.translation = tip
        return m

    # --- dine: spoon from bowl to mouth, then stillness ---------------------
    def dine(t):
        pos, feet = seated(0.46, t, edge=0.03)
        bowl = V(0, 0.56, 0.78 + 0.03)
        rest_r = V(-0.08, 0.44, 0.80)
        c = t % 9.0
        base = {
            'pelvis': pos, 'pelvis_rot': rot(LEFT, 4), 'spine': (3, 4, 4), 'head': (26, 0, 0), 'neck': 10,
            'feet': feet, 'curl': {'r': {'index': 40, 'middle': 55, 'ring': 65, 'pinky': 70, 'thumb': 25}, 'l': {'all': 22}},
        }
        # where is the mouth now (the spine and head as they will be)
        tmp = dict(base); tmp['hands'] = {}
        P.solve(tmp)
        mouth = P.W['head'] @ MOUTH
        if c < 1.4: k = ease(c / 1.4); tip = rest_r.lerp(bowl, k) + V(0, 0, 0.02 * math.sin(math.pi * k))
        elif c < 2.0: tip = bowl + V(0.015 * math.sin((c - 1.4) * 9), 0, -0.01)
        elif c < 3.3: k = ease((c - 2.0) / 1.3); tip = bowl.lerp(mouth + V(0, 0.03, -0.01), k)
        elif c < 3.9: tip = mouth + V(0, 0.03, -0.01)
        elif c < 5.1: k = ease((c - 3.9) / 1.2); tip = (mouth + V(0, 0.03, -0.01)).lerp(rest_r, k)
        else: tip = rest_r
        lift = 1.0 if 1.9 < c < 4.4 else 0.0
        head_b = 26 - 12 * (ease((c - 2.2) / 0.8) if c < 3.0 else 1 if c < 3.9 else 1 - ease((c - 3.9) / 0.8)) if 2.2 < c < 4.7 else 26
        hf = (FWD * 0.85 + LEFT * 0.35 + UP * 0.3 * lift).normalized()
        hn = (LEFT * 0.6 - UP * 0.7 + FWD * 0.1).normalized() if not lift else (LEFT * 0.8 - UP * 0.2 - FWD * 0.3).normalized()
        sp_dir = (FWD * 0.75 + LEFT * 0.3 - UP * 0.25).normalized() if not lift else (FWD * 0.5 + LEFT * 0.7 + UP * 0.3).normalized()
        grip_off = hf * 0.08 + hn * 0.03
        hand_r = tip - sp_dir * 0.12 - grip_off
        bread = V(0.17, 0.5, 0.8)
        pose = dict(base)
        pose['head'] = (head_b, 0, 0)
        pose['hands'] = {'r': (hand_r, hf, hn, V(-0.6, -0.3, -1)),
                         'l': (bread + V(0, -0.05, 0.035), (FWD * 0.9 - LEFT * 0.3).normalized(), (-UP * 0.9 - LEFT * 0.2).normalized(), V(0.7, -0.3, -1))}
        sm = frame(-sp_dir, LEFT).to_4x4(); sm.translation = tip
        pose['props'] = {'spoon': ('hand_r', sm)}
        return pose

    # --- stir: a paddle round a pot (kitchen) or the blood vat -------------
    def stir(t, blade_c, blade_r, hand_c, period, lean, lower_grip=0.62):
        pos, feet = standing(t, spread=0.16, fwd_l=0.08, fwd_r=-0.06)
        a = 2 * math.pi * t / period
        blade = blade_c + V(blade_r * math.cos(a), blade_r * 0.6 * math.sin(a), 0)
        top = hand_c + V(-0.04 * math.cos(a), -0.04 * math.sin(a), 0.015 * math.sin(a))
        shaft = (top - blade).normalized()
        L = (top - blade).length
        rw, rf, rn = grip('r', top, shaft, FWD - LEFT * 0.4)
        lw, lf, ln = grip('l', blade + shaft * (L * lower_grip), shaft, FWD + LEFT * 0.3)
        return {
            'pelvis': pos + V(0.01 * math.cos(a), -0.012 * math.sin(a), 0), 'pelvis_rot': rot(LEFT, lean * 0.3) @ rot(UP, 3 * math.sin(a)),
            'spine': (lean * 0.3, lean * 0.3 + 2 * math.sin(a), lean * 0.4), 'twist': (0, 3 * math.cos(a), 4 * math.cos(a)),
            'head': (18, 0, 0), 'neck': 8, 'feet': feet,
            'hands': {'r': (rw, rf, rn, V(-0.8, -0.2, -0.6)), 'l': (lw, lf, ln, V(0.8, -0.2, -0.8))},
            'curl': {'r': {'all': 62, 'thumb': 40}, 'l': {'all': 62, 'thumb': 40}},
            'props': {'paddle': ('hand_r', pole_frame(blade, top))},
        }
    a, pr = bake(rig, P, 'stirPot', 3.2, fps, lambda t: stir(t, V(0, 1.08, 1.12), 0.1, V(-0.02, 0.36, 1.36), 3.2, 14)); out.append(a); props['stirPot'] = pr
    # Both fists stay above/outside the thick rim; only the paddle enters it.
    a, pr = bake(rig, P, 'stirVat', 4.0, fps, lambda t: stir(t, V(0, 0.92, 1.0), 0.1, V(0, 0.4, 1.5), 4.0, 10, 0.82)); out.append(a); props['stirVat'] = pr

    # --- knead: the heels of both hands in the dough on the board ----------
    def knead(t):
        pos, feet = standing(t, spread=0.15, fwd_l=0.04, fwd_r=-0.04, drop=0.03)
        c = (t % 2.2) / 2.2
        push = ease(c / 0.45) if c < 0.45 else 1 - ease((c - 0.45) / 0.55)
        d = V(0.0, 0.52 + 0.1 * push, 0.8)
        hf = (FWD * 0.7 - UP * 0.7).normalized()
        return {
            'pelvis': pos + V(0, 0.03 * push, -0.01 * push), 'pelvis_rot': rot(LEFT, 10 + 5 * push),
            'spine': (8 + 3 * push, 8 + 3 * push, 6), 'head': (24, 0, 0), 'neck': 8, 'feet': feet,
            'hands': {'r': (d + V(-0.09, -0.06, 0.05), (hf + LEFT * 0.25).normalized(), (-UP * 0.6 - FWD * 0.6 + LEFT * 0.2).normalized(), V(-1, -0.2, -0.5)),
                      'l': (d + V(0.09, -0.06, 0.05), (hf - LEFT * 0.25).normalized(), (-UP * 0.6 - FWD * 0.6 - LEFT * 0.2).normalized(), V(1, -0.2, -0.5))},
            'curl': {'r': {'all': 25}, 'l': {'all': 25}},
        }
    a, _ = bake(rig, P, 'knead', 4.4, fps, knead); out.append(a)

    # --- hammer: the tongs hold the iron on the anvil, the hammer falls ----
    HITS = {}
    def hammer(t):
        pos, feet = standing(t, spread=0.2, fwd_l=0.16, fwd_r=-0.1, drop=0.04)
        per = 1.05; c = (t % per) / per
        face = V(0.0, 0.72, 0.90)
        work = face + V(0.02, -0.04, 0.02)
        # raise 0 -> 0.62 (slow), strike 0.62 -> 0.7, rest on the work 0.7 -> 1
        up = ease(c / 0.62) if c < 0.62 else 1 - ((c - 0.62) / 0.08) ** 1.5 if c < 0.7 else 0.0
        head = work.lerp(V(-0.16, 0.42, 1.52), up) + V(0, 0, 0.004)
        grip_pt = head + (V(-0.2, -0.1, 0.18) + V(-0.03, -0.2, -0.05) * up).normalized() * 0.3
        shaft = (grip_pt - head).normalized()
        rw, rf, rn = grip('r', grip_pt, shaft, (head - grip_pt).cross(LEFT).normalized() * -1 if up > 0.2 else FWD)
        tong_tip = work + V(0.02, 0, 0)
        tong_end = tong_tip + V(0.26, -0.3, 0.1)
        lw, lf, ln = grip('l', tong_end, (tong_end - tong_tip).normalized(), FWD + UP * 0.3)
        return {
            'pelvis': pos, 'pelvis_rot': rot(LEFT, 10) @ rot(UP, 4),
            'spine': (6, 6 - 4 * up, 5 - 5 * up), 'twist': (0, -4 * up, -6 * up), 'head': (26, 0, 0), 'neck': 8, 'feet': feet,
            'clav': {'r': (8 * up, 4)},
            'hands': {'r': (rw, rf, rn, V(-1, -0.3, -0.6)), 'l': (lw, lf, ln, V(0.8, -0.3, -1))},
            'curl': {'r': {'all': 62, 'thumb': 40}, 'l': {'all': 55, 'thumb': 35}},
            'props': {'hammer': ('hand_r', pole_frame(head, grip_pt)), 'tongs': ('hand_l', pole_frame(tong_tip, tong_end))},
        }
    a, pr = bake(rig, P, 'hammer', 4.2, fps, hammer); out.append(a); props['hammer'] = pr
    props['hammer']['_hits'] = [round(k * 1.05 + 0.7 * 1.05, 3) for k in range(4)]

    # --- fork hay from the floor into the manger ----------------------------
    def fork(t):
        pos, feet = standing(t, spread=0.2, fwd_l=0.14, fwd_r=-0.12, drop=0.05)
        c = (t % 3.6) / 3.6
        low, high = V(-0.25, 0.62, 0.08), V(0.0, 0.66, 1.05)
        if c < 0.3: k = ease(c / 0.3); tines = V(-0.1, 0.9, 0.3).lerp(low, k)
        elif c < 0.62: k = ease((c - 0.3) / 0.32); tines = low.lerp(high, k)
        elif c < 0.72: tines = high + V(0, 0.08 * math.sin((c - 0.62) / 0.1 * math.pi), 0.02)
        else: k = ease((c - 0.72) / 0.28); tines = high.lerp(V(-0.1, 0.9, 0.3), k)
        bend = 30 * (1 - min(1, max(0, (tines.z - 0.08) / 0.9)))
        end = tines + (V(-0.35, -0.9, 0.45) + V(0, 0, 0.4) * (tines.z)).normalized() * 1.25
        shaft = (end - tines).normalized()
        rw, rf, rn = grip('r', end - shaft * 0.05, shaft, FWD - LEFT * 0.3)
        lw, lf, ln = grip('l', tines + shaft * 0.72, shaft, FWD + LEFT * 0.2, over=False)
        return {
            'pelvis': pos + V(0, 0, -0.08 * bend / 30), 'pelvis_rot': rot(LEFT, 6 + bend * 0.6) @ rot(UP, -6),
            'spine': (4 + bend * 0.3, 4 + bend * 0.3, 3), 'twist': (0, -4, -6), 'head': (18 + bend * 0.2, 0, 0), 'feet': feet,
            'hands': {'r': (rw, rf, rn, V(-1, -0.4, -0.6)), 'l': (lw, lf, ln, V(0.6, -0.2, -1))},
            'curl': {'r': {'all': 62, 'thumb': 40}, 'l': {'all': 62, 'thumb': 40}},
            'props': {'fork': ('hand_l', pole_frame(tines, end))},
        }
    a, pr = bake(rig, P, 'fork', 7.2, fps, fork); out.append(a); props['fork'] = pr

    # --- sweep: a broom of twigs over the floor -----------------------------
    def sweep(t):
        pos, feet = standing(t, spread=0.2, fwd_l=0.12, fwd_r=-0.08, drop=0.05)
        c = (t % 1.8) / 1.8
        x = -0.28 + 0.56 * (ease(c / 0.6) if c < 0.6 else 1 - ease((c - 0.6) / 0.4))
        head = V(x, 0.62, 0.05 + (0.04 if c > 0.6 else 0.0))
        end = head + V(-0.25 + 0.1 * x, -0.75, 0.9).normalized() * 1.15
        shaft = (end - head).normalized()
        rw, rf, rn = grip('r', end - shaft * 0.04, shaft, FWD - LEFT * 0.5)
        lw, lf, ln = grip('l', head + shaft * 0.62, shaft, FWD + LEFT * 0.3, over=False)
        return {
            'pelvis': pos + V(0.02 * x, 0, 0), 'pelvis_rot': rot(LEFT, 14) @ rot(UP, 8 * x), 'spine': (8, 8, 5), 'twist': (0, 6 * x, 8 * x),
            'head': (22, 0, 0), 'feet': feet,
            'hands': {'r': (rw, rf, rn, V(-1, -0.3, -0.5)), 'l': (lw, lf, ln, V(0.7, -0.2, -1))},
            'curl': {'r': {'all': 62, 'thumb': 40}, 'l': {'all': 62, 'thumb': 40}},
            'props': {'broom': ('hand_r', pole_frame(head, end))},
        }
    a, pr = bake(rig, P, 'sweep', 3.6, fps, sweep); out.append(a); props['sweep'] = pr

    # --- read at the lectern: hands on the book, a leaf turned now and then -
    def read(t):
        pos, feet = standing(t, spread=0.12)
        c = t % 12.0
        bk = V(0, 0.42, 1.24)
        turn = ease((c - 9.5) / 1.4) if 9.5 < c < 10.9 else 0.0
        arc = math.sin(math.pi * turn)
        rpt = V(-0.16 + 0.3 * turn, 0.39, 1.32 + 0.09 * arc)
        return {
            'pelvis': pos, 'pelvis_rot': rot(LEFT, 3), 'spine': (2, 3, 4), 'head': (22 + 2 * wave(t, 6), 3 * wave(t, 4.1) * (1 - turn), 0), 'neck': 8,
            'feet': feet,
            'hands': {'r': (rpt - (FWD * 0.9 + LEFT * 0.2).normalized() * 0.07 + V(0, 0, 0.03), (FWD * 0.9 + LEFT * 0.2 - UP * 0.3).normalized(), (-UP * 0.8 + FWD * 0.5).normalized(), V(-1, -0.2, -1)),
                      'l': (V(0.17, 0.39, 1.32) - (FWD * 0.9 - LEFT * 0.2).normalized() * 0.07 + V(0, 0, 0.03), (FWD * 0.9 - LEFT * 0.2 - UP * 0.3).normalized(), (-UP * 0.8 + FWD * 0.5).normalized(), V(1, -0.2, -1))},
            'curl': {'r': {'all': 20 + 20 * arc}, 'l': {'all': 18}},
        }
    a, _ = bake(rig, P, 'read', 12.0, fps, read); out.append(a)

    # --- tend: bent to a winter bed, then straightening --------------------
    def tend(t):
        pos, feet = standing(t, spread=0.2, fwd_l=0.1, fwd_r=-0.12, drop=0.02)
        c = t % 10.0
        b = ease(c / 1.8) if c < 1.8 else 1.0 if c < 6.0 else 1 - ease((c - 6.0) / 1.6) if c < 7.6 else 0.0
        hand = V(-0.12, 0.55, 0.16 + 0.03 * wave(t, 1.3)).lerp(V(-0.2, 0.2, 0.95), 1 - b)
        knee = V(0.14, 0.32, 0.5).lerp(V(0.18, 0.12, 0.95), 1 - b)
        return {
            'pelvis': pos + V(0, -0.1 * b, -0.14 * b), 'pelvis_rot': rot(LEFT, 30 * b),
            'spine': (14 * b, 12 * b, 10 * b), 'head': (18 * b - 4 * (1 - b), -6 * (1 - b), 0), 'neck': 6,
            'feet': feet,
            'hands': {'r': (hand, (FWD * 0.6 - UP * 0.8 * b + UP * 0.2).normalized(), (-UP * 0.6 * b + LEFT * 0.8).normalized(), V(-0.8, 0, -0.6)),
                      'l': (knee, (FWD * 0.5 - UP * 0.8).normalized(), (-FWD * 0.7 - LEFT * 0.4).normalized(), V(1, -0.2, -0.4))},
            'curl': {'r': {'all': 35}, 'l': {'all': 40}},
        }
    a, _ = bake(rig, P, 'tend', 10.0, fps, tend); out.append(a)

    # --- stand in choir: hands meeting within the sleeves --------------------
    def sleeves(t, bow=0.0):
        pos, feet = standing(t, spread=0.1)
        b = wave(t, 5.2)
        c = V(0, 0.2, 1.02 - 0.05 * bow)
        return {
            'pelvis': pos + V(0, 0, 0.002 * b), 'pelvis_rot': rot(LEFT, 2 + 4 * bow), 'spine': (1 + 0.4 * b + 5 * bow, 2 + 6 * bow, 2 + 6 * bow + 0.4 * b),
            'head': (12 + 10 * bow + 2 * wave(t, 13), 0, 0), 'neck': 5, 'feet': feet,
            'hands': {'r': (c + V(0.06, 0.0, 0.0), (LEFT * 0.9 + FWD * 0.3).normalized(), (-UP * 0.7 + LEFT * 0.1 - FWD * 0.6).normalized(), V(-1, 0.1, -0.6)),
                      'l': (c + V(-0.06, 0.02, 0.03), (-LEFT * 0.9 + FWD * 0.3).normalized(), (-UP * 0.7 - LEFT * 0.1 - FWD * 0.6).normalized(), V(1, 0.1, -0.6))},
            'curl': {'r': {'all': 30}, 'l': {'all': 30}},
        }
    a, _ = bake(rig, P, 'standSleeves', 10.4, fps, sleeves); out.append(a)
    a, _ = bake(rig, P, 'standBow', 10.4, fps, lambda t: sleeves(t, 1.0)); out.append(a)
    a, pr = bake(rig, P, 'dine', 9.0, fps, dine); out.append(a); props['dine'] = pr
    rig['props'] = str(props)
    return out

# ------------------------------------------------------------------ preview
def _setup_scene():
    sc = bpy.context.scene
    for eng in ('BLENDER_EEVEE_NEXT', 'BLENDER_EEVEE'):
        try: sc.render.engine = eng; break
        except Exception: pass
    sc.render.resolution_x, sc.render.resolution_y = 520, 700
    if not sc.world:
        w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
        w.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.57, 0.6, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 0.6
    if 'sun' not in bpy.data.objects:
        sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
        sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(35))
        bpy.ops.mesh.primitive_plane_add(size=8); fl = bpy.context.active_object; fl.name = 'floor'
        m = bpy.data.materials.new('floor'); m.use_nodes = True; m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.35, 0.33, 0.3, 1); fl.data.materials.append(m)
        cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam; cam.data.lens = 50
    return sc, bpy.data.objects['cam']

def furniture():
    """the desk, bench and board of the abbey, for checking contacts"""
    if 'desk' in bpy.data.objects: return
    def box(name, w, h, d, x, f, z, rx=0):
        bpy.ops.mesh.primitive_cube_add(size=1); o = bpy.context.active_object; o.name = name
        o.scale = (w, d, h); o.location = V(x, f, z) + Vector((0, 0, h / 2)); o.rotation_euler = (rx, 0, 0)
        return o
    box('bench', 1.2, 0.05, 0.32, 0, 0, 0.45)
    top = box('desk', 1.35, 0.045, 0.62, 0, DESK_BENCH - 0.02, 0.93, -0.32)
    box('page', 0.57, 0.004, 0.34, -0.03, DESK_BENCH - 0.04, 0.99, -0.32)
    box('lip', 1.35, 0.08, 0.05, 0, DESK_BENCH - 0.29, 0.9)

def shoot(path, angle_deg, target=(0, 0, 0.9), dist=3.2, up=0.1):
    sc, cam = _setup_scene()
    a = math.radians(angle_deg); t = Vector(target)
    cam.location = (t.x + math.sin(a) * dist, t.y - math.cos(a) * dist, t.z + up)
    cam.rotation_euler = (t - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

def show_props(rig, props):
    import ast
    for task, pr in props.items():
        for k, d in pr.items():
            if k.startswith('_'): continue
            name = 'prop_' + task + '_' + k
            if name in bpy.data.objects: continue
            bpy.ops.mesh.primitive_cylinder_add(radius=0.004, depth=0.2, location=(0, 0, 0))
            o = bpy.context.active_object; o.name = name
            o.data.transform(Matrix.Rotation(-math.pi / 2, 4, 'X'))  # along +Y
            o.data.transform(Matrix.Translation((0, 0.1, 0)))       # the rod runs from the tip (origin) along +Y
            bw = Matrix(d['boneWorld']); pw = Matrix(d['world'])
            # parent to the bone: object matrix = bone pose matrix (tail-relative in Blender) ...
            o.parent = rig; o.parent_type = 'BONE'; o.parent_bone = d['bone']
            pb = rig.pose.bones[d['bone']]
            o.matrix_parent_inverse = Matrix.Identity(4)
            # a bone-parented child sits at the bone's tail: offset by the bone length along Y
            L = pb.bone.length
            o.matrix_basis = Matrix.Translation((0, -L, 0)) @ bw.inverted() @ pw
            o['task'] = task

def preview(rig, body, acts, out, frames=None, angles=(35, 90)):
    os.makedirs(out, exist_ok=True)
    sc = bpy.context.scene
    furniture()
    import ast
    show_props(rig, ast.literal_eval(rig.get('props', '{}')))
    for act in acts:
        if frames and act.name not in frames: continue
        rig.animation_data.action = act
        for o in bpy.data.objects:
            if o.name.startswith('prop_'): o.hide_render = o.get('task') != act.name
        f0, f1 = act.frame_range
        for fi in (frames or {}).get(act.name, [int(f0), int((f0 + f1) / 2)]):
            sc.frame_set(fi)
            for ang in angles:
                shoot(os.path.join(out, f'{act.name}_{fi}_{ang}.png'), ang)
            if act.name in ('write', 'dine', 'stirPot', 'stirVat', 'hammer', 'knead', 'read', 'fork', 'sweep'):
                h = rig.matrix_world @ rig.pose.bones['hand_r'].head
                if 'desk' in bpy.data.objects: bpy.data.objects['desk'].hide_render = True
                if act.get('mark') and fi == int(f0):
                    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.006, location=Vector(act['mark'])); bpy.context.active_object.name = 'mark_' + act.name
                shoot(os.path.join(out, f'{act.name}_{fi}_close.png'), 60, target=tuple(h), dist=0.7, up=0.2)
                shoot(os.path.join(out, f'{act.name}_{fi}_close2.png'), -30, target=tuple(h), dist=0.7, up=0.35)
                shoot(os.path.join(out, f'{act.name}_{fi}_upper.png'), -90, target=(0, -0.3, 1.0), dist=1.8, up=0.1)
                shoot(os.path.join(out, f'{act.name}_{fi}_front.png'), 25, target=(0, -0.3, 1.0), dist=1.6, up=0.3)
                if 'desk' in bpy.data.objects: bpy.data.objects['desk'].hide_render = False
