#!/usr/bin/env python3
"""Day-1A world derivatives from the browser section export.

    python3 scripts/migration/build_day1a_assets.py

Input : shared/data/export/day1a/ (browser_driver.mjs slice_export.js with
        shared/data/export/day1a_cells.json). The six phase-1 cells in that
        export are only compared with the committed phase-1 raw export (a
        determinism check); their native derivatives are not touched.
Output: native/assets/world/day1a/{cells,collision,props,fields}/,
        new semantic materials in native/assets/world/materials/ (an existing
        material must regenerate byte-identically or the build stops),
        the texture sets they need, and
        shared/data/manifests/world_day1a_derivatives.json.

Spoiler policy (Day-1A is for a reader who has not finished the novel): the
browser's reconstructed track from the kitchen garden through the orchard to
the hidden postern (terrain.js PATHS, "the girl's track", R28) is removed
from the Day-1A trodden-snow mask; the postern's ajar leaf is excluded and
the native scenario overlay seals the opening (see native day1a_world.gd).
"""
import hashlib
import json
import math
import shutil
import struct
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_slice_assets as P1  # noqa: E402  (material/texture recipes shared with phase 1)

ROOT = P1.ROOT
EXP = ROOT / 'shared/data/export/day1a'
EXP1 = ROOT / 'shared/data/export'
GD = P1.GD
OUT = GD / 'assets/world/day1a'
MATS = GD / 'assets/world/materials'
TEX = GD / 'assets/textures'
MANIFEST = ROOT / 'shared/data/manifests/world_day1a_derivatives.json'
PHASE1 = ('ossuary_stair', 'skull_chapel', 'church_interior', 'church_exterior', 'cloister', 'cloister_context')
# cells whose collision the Day-1A walk needs (context shells are visual only)
COLLIDE = ('gate', 'hospice', 'flower_garden', 'west_context')
PX = 0.42
ORIGIN = (330, 290)


def P(px, py):
    return ((px - ORIGIN[0]) * PX, (py - ORIGIN[1]) * PX)


# terrain.js PATHS, last entry: "the girl's track: kitchen garden → orchard →
# round the infirmary's west end → along its blind back to the postern in the
# NW wall (R28)"; erased from its second point on (its first point lies in
# the kitchen garden, where other paths meet), width 1.4 m drawn at 1 and 1.8×
TRACK = [P(200, 218), P(140, 229), P(108, 233), P(98, 226), P(101, 207), P(121, 192), P(144, 176), P(141, 171)]
TRACK_ERASE_M = 1.4 * 1.8 / 2 + 0.45


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def seg_dist(px, pz, a, b):
    dx, dz = b[0] - a[0], b[1] - a[1]
    t = max(0.0, min(1.0, ((px - a[0]) * dx + (pz - a[1]) * dz) / (dx * dx + dz * dz)))
    return math.hypot(px - a[0] - dx * t, pz - a[1] - dz * t)


def erase_track(data, w, h, rect):
    """R channel of the RGBA trodden mask set to 0 near the track."""
    out = bytearray(data)
    rx, rz, size = rect[0], rect[1], rect[2]
    px = size / w
    xs = [p[0] for p in TRACK]
    zs = [p[1] for p in TRACK]
    i0, i1 = int((min(xs) - TRACK_ERASE_M - rx) / px), int((max(xs) + TRACK_ERASE_M - rx) / px) + 1
    j0, j1 = int((min(zs) - TRACK_ERASE_M - rz) / px), int((max(zs) + TRACK_ERASE_M - rz) / px) + 1
    n = 0
    for j in range(max(0, j0), min(h, j1)):
        for i in range(max(0, i0), min(w, i1)):
            x, z = rx + (i + 0.5) * px, rz + (j + 0.5) * px
            if min(seg_dist(x, z, TRACK[k], TRACK[k + 1]) for k in range(len(TRACK) - 1)) < TRACK_ERASE_M:
                k = (j * w + i) * 4
                if out[k]:
                    out[k] = 0
                    n += 1
    return bytes(out), n


def crop(data, rec, kind, x0, x1, z0, z1):
    w, h, ch = rec['width'], rec['height'], int(rec['channels'])
    rx, rz, size = rec['rect'][0], rec['rect'][1], rec['rect'][2]
    px = size / w
    i0, i1 = max(0, int((x0 - rx) // px)), min(w - 1, int((x1 - rx) // px) + 1)
    j0, j1 = max(0, int((z0 - rz) // px)), min(h - 1, int((z1 - rz) // px) + 1)
    out = bytearray()
    for j in range(j0, j1 + 1):
        for i in range(i0, i1 + 1):
            k = (j * w + i) * ch
            if kind == 'half':
                out += struct.pack('<f', struct.unpack('<e', data[k * 2:k * 2 + 2])[0])
            else:
                out += bytes([data[k]])
    nw, nh = i1 - i0 + 1, j1 - j0 + 1
    return bytes(out), {'width': nw, 'height': nh, 'rect': [rx + i0 * px, rz + j0 * px, nw * px, nh * px]}


def unpack_trees(glb, out_dir):
    """The browser's tree geometry addresses a texture atlas per vertex
    (aRegion vec4, aTree vec3: snow share, mode, brightness; trees.js
    treeAtlas()). Godot's glTF importer drops such custom attributes, so the
    GLB is unpacked losslessly into one raw buffer per mesh plus the atlas
    images; native/scripts/adapters/world_cells.gd builds ArrayMeshes with
    CUSTOM0/CUSTOM1 and shaders/abbey_tree.gdshader ports the atlas shader.
    Raw layout: u32 vertex count, u32 index count, then float32 position(3),
    normal(3), uv(2), region(4), tree(3) per vertex, then u32 indices."""
    b = glb.read_bytes()
    jl = struct.unpack_from('<I', b, 12)[0]
    j = json.loads(b[20:20 + jl])
    bin_off = 20 + jl + 8
    def acc(i):
        a = j['accessors'][i]
        bv = j['bufferViews'][a['bufferView']]
        n = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        fmt = {5126: 'f', 5123: 'H', 5125: 'I'}[a['componentType']]
        size = struct.calcsize(fmt)
        start = bin_off + bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = bv.get('byteStride', n * size)
        return [struct.unpack_from('<' + fmt * n, b, start + k * stride) for k in range(a['count'])]
    out_dir.mkdir(parents=True, exist_ok=True)
    meshes = {}
    for node in j['nodes']:
        if 'mesh' not in node:
            continue
        prim = j['meshes'][node['mesh']]['primitives'][0]
        A = prim['attributes']
        pos, nrm, uv, reg, tre = acc(A['POSITION']), acc(A['NORMAL']), acc(A['TEXCOORD_0']), acc(A['_AREGION']), acc(A['_ATREE'])
        idx = [v[0] for v in acc(prim['indices'])]
        raw = bytearray(struct.pack('<II', len(pos), len(idx)))
        for k in range(len(pos)):
            raw += struct.pack('<15f', *pos[k], *nrm[k], *uv[k], *reg[k], *tre[k])
        raw += struct.pack(f'<{len(idx)}I', *idx)
        f = out_dir / (node['name'] + '.bin')
        f.write_bytes(bytes(raw))
        meshes[node['name']] = {'file': P1.res_path(f), 'material': prim['material'], 'vertices': len(pos), 'triangles': len(idx) // 3, 'sha256': sha(f)}
    atlases = []
    names = ['wood_map', 'wood_normal', 'conifer_map', 'conifer_normal']
    for mi, m in enumerate(j['materials']):
        rec = {}
        for slot, ti in (('map', m['pbrMetallicRoughness']['baseColorTexture']['index']), ('normal', m['normalTexture']['index'])):
            im = j['images'][j['textures'][ti]['source']]
            bv = j['bufferViews'][im['bufferView']]
            data = b[bin_off + bv.get('byteOffset', 0): bin_off + bv.get('byteOffset', 0) + bv['byteLength']]
            name = names[mi * 2 + (0 if slot == 'map' else 1)]
            f = out_dir / (name + '.png')
            f.write_bytes(data)
            w, h = struct.unpack('>II', data[16:24])
            # colour atlas: sRGB at sampling; normal atlas keeps its alpha (the
            # snow bed), so it is imported as plain linear RGBA, not RGTC
            (Path(str(f) + '.import')).write_text(TREE_TEXTURE_IMPORT.format(src=P1.res_path(f)))
            rec[slot] = {'file': P1.res_path(f), 'size': [w, h], 'sha256': sha(f)}
        rec['alpha_cutoff'] = m.get('alphaCutoff', 0.42)
        atlases.append(rec)
    return meshes, atlases


TREE_TEXTURE_IMPORT = """[remap]

importer="texture"
type="CompressedTexture2D"

[deps]

source_file="{src}"

[params]

compress/mode=2
compress/high_quality=true
compress/lossy_quality=0.7
compress/hdr_compression=1
compress/normal_map=2
compress/channel_pack=0
mipmaps/generate=true
mipmaps/limit=-1
roughness/mode=0
roughness/src_normal=""
process/fix_alpha_border=true
process/premult_alpha=false
process/normal_map_invert_y=false
process/hdr_as_srgb=false
process/hdr_clamp_exposure=false
process/size_limit=0
detect_3d/compress_to=0
"""


def main():
    rep = json.loads((EXP / 'slice_export.report.json').read_text())
    r = rep['result']
    for d in ('cells', 'collision', 'props', 'fields'):
        (OUT / d).mkdir(parents=True, exist_ok=True)
    derivs, determinism = [], {}
    # determinism: the phase-1 cells of this export against the phase-1 export
    for cid in PHASE1:
        for kind in ('cells', 'collision'):
            a, b = EXP / kind / f'{cid}.glb', EXP1 / kind / f'{cid}.glb'
            determinism[f'{kind}/{cid}.glb'] = a.exists() and b.exists() and sha(a) == sha(b)
    cells = []
    for c in r['cells']:
        if c['id'] in PHASE1:
            continue
        src = EXP / 'cells' / f"{c['id']}.glb"
        dst = OUT / 'cells' / f"{c['id']}.glb"
        shutil.copyfile(src, dst)
        derivs.append({'output': str(dst.relative_to(ROOT)), 'sha256': sha(dst), 'source': str(src.relative_to(ROOT)), 'recipe': 'slice_export.js section capture (unchanged copy)'})
        col = []
        if c['id'] in COLLIDE and (EXP / 'collision' / f"{c['id']}.glb").exists():
            cs, cd = EXP / 'collision' / f"{c['id']}.glb", OUT / 'collision' / f"{c['id']}.glb"
            shutil.copyfile(cs, cd)
            derivs.append({'output': str(cd.relative_to(ROOT)), 'sha256': sha(cd), 'source': str(cs.relative_to(ROOT)), 'recipe': 'slice_export.js collision capture (unchanged copy)'})
            col = [x['surface'] for x in c['collision']]
        cells.append({'id': c['id'], 'bounds': c['bounds'], 'triangles': c['census']['tris'], 'census': c['census'], 'rule': c['rule'], 'meshes': c['meshes'], 'collision': col})
    # materials: only the keys the Day-1A cells and trees use
    keys = sorted({m['key'] for c in cells for m in c['meshes']})
    sources = set()
    for k in keys:
        rec = r['materials'][k]
        for slot in ('map', 'normal_map', 'ao_map', 'roughness_map'):
            if rec.get(slot) and rec[slot]['source'].startswith('shared/assets/textures/'):
                sources.add(rec[slot]['source'])
        ov = (rec.get('weathering') or {}).get('overlay_map')
        if ov and ov['source'].startswith('shared/assets/textures/'):
            sources.add(ov['source'])
    # what phase 1 owns is verify-only; everything else is a Day-1A derivative
    w1 = json.loads((ROOT / 'shared/data/manifests/world_derivatives.json').read_text())
    phase1_outputs = {d['output'] for d in w1['derivatives']}
    phase1_keys = set(w1['materials'])
    tex_paths = {}
    for s in sorted(sources):
        srcf = ROOT / s
        dst = TEX / srcf.name
        role = 'normal' if srcf.stem.endswith('_n') else ('albedo' if srcf.stem.endswith('_d') else 'arm')
        if str(dst.relative_to(ROOT)) in phase1_outputs:
            if sha(dst) != sha(srcf):
                raise SystemExit(f'texture {dst} differs from its source {s}')
        else:
            shutil.copyfile(srcf, dst)
            P1.write_texture_import(dst, role)
            derivs.append({'output': str(dst.relative_to(ROOT)), 'sha256': sha(dst), 'source': s, 'source_sha256': sha(srcf), 'licence': 'CC0 1.0 (Poly Haven, shared/assets/credits.json)', 'role': role, 'recipe': 'copy; Godot import VRAM compressed, mipmaps'})
        tex_paths[s] = P1.res_path(dst)
    gen_paths = {}
    for img in r['images']:
        if img['first_key'] not in keys and not any(img['file'] == (r['materials'][k].get(sl) or {}).get('file') for k in keys for sl in ('map', 'normal_map', 'ao_map', 'roughness_map', 'emissive_map', 'alpha_map')):
            continue
        srcf = EXP / img['file']
        dst = OUT / img['file']
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(srcf, dst)
        P1.write_texture_import(dst, 'normal' if 'normal' in img['slot'] else 'albedo')
        gen_paths[img['file']] = P1.res_path(dst)
        derivs.append({'output': str(dst.relative_to(ROOT)), 'sha256': sha(dst), 'source': f"canvas texture of material {img['first_key']} ({img['slot']})", 'recipe': 'HTMLCanvasElement.toBlob PNG in the browser (procedural, project-authored)'})
    mats, unchanged = {}, []
    for k in keys:
        rec = r['materials'][k]
        if rec.get('missing'):
            continue
        t, variant = P1.material_resource(k, rec, tex_paths, gen_paths)
        f = MATS / (k.replace('.', '_') + '.tres')
        text = t.text()
        if k in phase1_keys:
            if f.read_text() != text:
                # an existing phase-1 material must not change silently: its
                # generated canvas images live in the phase-1 export
                p1 = P1.material_resource(k, rec, tex_paths, {g: f'res://assets/world/{g}' for g in gen_paths} | {i['file']: f'res://assets/world/{i["file"]}' for i in r['images']})[0].text()
                if f.read_text() != p1:
                    raise SystemExit(f'material {k} would change: {f}')
            unchanged.append(k)
        else:
            f.write_text(text)
            derivs.append({'output': str(f.relative_to(ROOT)), 'sha256': sha(f), 'source': f'slice_export.js material record {k}', 'recipe': f'build_slice_assets.material_resource ({variant})'})
        mats[k] = {'resource': P1.res_path(f), 'variant': variant}
    # trees
    trees = []
    for t in r['trees']:
        src = EXP / t['file']
        dst = OUT / 'props' / Path(t['file']).name
        if not dst.exists() or sha(dst) != sha(src):
            shutil.copyfile(src, dst)
        trees.append({'group': t['group'], 'file': P1.res_path(dst), 'lods': t['lods'], 'lod_max_m': t['lod_max_m'], 'instances': t['instances'], 'triangles': t['triangles']})
    tf = OUT / 'props' / 'day1_trees.glb'
    tree_meshes, tree_atlases = unpack_trees(tf, OUT / 'props' / 'trees')
    tf.unlink()   # only the unpacked buffers/atlases ship (no unused import)
    for name, m in tree_meshes.items():
        derivs.append({'output': m['file'].replace('res://', 'native/'), 'sha256': m['sha256'], 'source': 'shared/data/export/day1a/props/day1_trees.glb', 'recipe': 'lossless unpack of one tree mesh (position, normal, uv, aRegion, aTree, indices) to raw float32/u32'})
    for a in tree_atlases:
        for slot in ('map', 'normal'):
            derivs.append({'output': a[slot]['file'].replace('res://', 'native/'), 'sha256': a[slot]['sha256'], 'source': 'shared/data/export/day1a/props/day1_trees.glb', 'recipe': 'embedded PNG of the procedural tree atlas (trees.js makeTreeAtlases), unchanged bytes'})
    # fields
    F = r['fields']
    th = F['terrain_height']
    fields = {}
    for key, name in (('file', 'terrain_height.bin'), ('base_file', 'terrain_base.bin')):
        shutil.copyfile(EXP / th[key], OUT / 'fields' / name)
    fields['terrain_height'] = {**{k: th[k] for k in ('x0', 'z0', 'step', 'nx', 'nz', 'sunk_below_base_m')}, 'file': 'res://assets/world/day1a/fields/terrain_height.bin', 'base_file': 'res://assets/world/day1a/fields/terrain_base.bin', 'format': 'float32 LE, row-major (z rows)', 'rule': th['source']}
    shutil.copyfile(EXP / F['walkable']['file'], OUT / 'fields/walkable_u8.bin')
    fields['walkable'] = {'file': 'res://assets/world/day1a/fields/walkable_u8.bin', 'format': F['walkable']['format'], 'rule': F['walkable']['rule']}
    shutil.copyfile(EXP / F['coarse']['file'], OUT / 'fields/coarse_height.bin')
    fields['coarse'] = {**{k: F['coarse'][k] for k in ('x0', 'z0', 'step', 'nx', 'nz', 'disc', 'format', 'source')}, 'file': 'res://assets/world/day1a/fields/coarse_height.bin'}
    shutil.copyfile(EXP / F['far']['file'], OUT / 'fields/far_ring.bin')
    fields['far'] = {**{k: F['far'][k] for k in ('cx', 'cz', 'A', 'radii', 'format', 'source')}, 'file': 'res://assets/world/day1a/fields/far_ring.bin'}
    bx = (th['x0'], th['x0'] + th['step'] * (th['nx'] - 1), th['z0'], th['z0'] + th['step'] * (th['nz'] - 1))
    g, gm = crop((EXP / F['ground']['file']).read_bytes(), F['ground'], 'half', *bx)
    (OUT / 'fields/ground_rf.bin').write_bytes(g)
    fields['ground'] = {**gm, 'file': 'res://assets/world/day1a/fields/ground_rf.bin', 'format': 'float32 LE (Image.FORMAT_RF)', 'source': F['ground']['note']}
    raw = (EXP / F['trodden']['file']).read_bytes()
    erased, n_erased = erase_track(raw, F['trodden']['width'], F['trodden']['height'], F['trodden']['rect'])
    t_, tm = crop(erased, F['trodden'], 'u8', *bx)
    (OUT / 'fields/trodden_l8.bin').write_bytes(t_)
    fields['trodden'] = {**tm, 'file': 'res://assets/world/day1a/fields/trodden_l8.bin', 'format': 'uint8 (Image.FORMAT_L8)', 'source': F['trodden']['note'], 'spoiler_edit': {'erased_texels': n_erased, 'track': [list(map(lambda v: round(v, 3), p)) for p in TRACK], 'radius_m': TRACK_ERASE_M, 'reason': 'Day-1A spoiler policy: the reconstructed track to the hidden postern (terrain.js PATHS, R28) is not shown'}}
    for f in ('terrain_height.bin', 'terrain_base.bin', 'walkable_u8.bin', 'coarse_height.bin', 'far_ring.bin', 'ground_rf.bin', 'trodden_l8.bin'):
        derivs.append({'output': str((OUT / 'fields' / f).relative_to(ROOT)), 'sha256': sha(OUT / 'fields' / f), 'source': 'slice_export.js fields (day1a_cells.json)', 'recipe': 'unchanged copy' if f not in ('ground_rf.bin', 'trodden_l8.bin') else ('cropped; half → float32' if f == 'ground_rf.bin' else 'postern track erased (R channel), cropped')})
    region_doors = [d for d in r['doors']]
    out = {
        'schema_version': 1,
        'generator': 'scripts/migration/build_day1a_assets.py',
        'export_report': {'path': 'shared/data/export/day1a/slice_export.report.json', 'sha256': sha(EXP / 'slice_export.report.json'), 'config': 'shared/data/export/day1a_cells.json', 'config_sha256': sha(ROOT / 'shared/data/export/day1a_cells.json'), 'kit_js_sha256': rep['kit_js_sha256'], 'served_adapter_sha256': rep['served_adapter_sha256']},
        'phase1_determinism': determinism,
        'coordinate_convention': r['coordinate_convention'],
        'snow_cover': r['snow_cover'],
        'cells': cells,
        'materials': mats,
        'materials_shared_with_phase1': unchanged,
        'fields': fields,
        'trees': trees,
        'tree_meshes': tree_meshes,
        'tree_atlases': tree_atlases,
        'emitters': r['emitters'],
        'sound_emitters': r['sound_emitters'],
        'anchors': {k: r['anchors'][k] for k in ('gate', 'hospice', 'road', 'bell_tower')},
        'doors': region_doors,
        'probes': r['probes'],
        'derivatives': derivs,
    }
    MANIFEST.write_text(json.dumps(out, indent=1) + '\n')
    print('cells', [c['id'] for c in cells], 'new materials', len([d for d in derivs if d['output'].endswith('.tres')]), 'shared', len(unchanged), 'trees', len(trees),
          'erased texels', n_erased, 'phase-1 determinism', all(determinism.values()), 'derivatives', len(derivs))


if __name__ == '__main__':
    main()
