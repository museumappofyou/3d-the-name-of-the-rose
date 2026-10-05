#!/usr/bin/env python3
"""Turn the browser section export into Godot-ready phase-1 world assets.

    python3 scripts/migration/build_slice_assets.py

Input : shared/data/export/ (scripts/migration/browser/slice_export.js)
Output: native/assets/world/{cells,collision,dynamic,props,generated,
        materials,fields}/, native/assets/textures/ (only the
        Poly Haven sets the slice uses), and
        shared/data/manifests/world_derivatives.json (source/derivative
        hashes, licences, transformation recipe).

Materials are written as text resources from the browser's own material
records: one shared material per semantic key (`church`, `p.cryptStone`...).
Texture import settings are explicit: *_d sRGB albedo, *_n linear OpenGL
normal map (BC5/RGTC), *_a linear ARM (R occlusion, G roughness, B metal),
VRAM compressed with mipmaps. Godot's automatic 3D detection is disabled so
an import never silently changes a channel's meaning.
"""
import hashlib
import json
import shutil
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXP = ROOT / 'shared/data/export'
GD = ROOT / 'native'
OUT = GD / 'assets/world'
TEX = GD / 'assets/textures'
MANIFEST = ROOT / 'shared/data/manifests/world_derivatives.json'


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def res_path(p):
    return 'res://' + str(Path(p).relative_to(GD))


TEXTURE_IMPORT = """[remap]

importer="texture"
type="CompressedTexture2D"

[deps]

source_file="{src}"

[params]

compress/mode=2
compress/high_quality=false
compress/lossy_quality=0.7
compress/hdr_compression=1
compress/normal_map={normal}
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


def write_texture_import(png_or_jpg, role):
    imp = Path(str(png_or_jpg) + '.import')
    imp.write_text(TEXTURE_IMPORT.format(src=res_path(png_or_jpg), normal=1 if role == 'normal' else 2))
    return imp


class Tres:
    """Minimal writer for Godot text resources."""

    def __init__(self, type_):
        self.type = type_
        self.ext = []
        self.props = []

    def ext_res(self, kind, path):
        for i, (k, p) in enumerate(self.ext):
            if p == path:
                return f'ExtResource("{i + 1}")'
        self.ext.append((kind, path))
        return f'ExtResource("{len(self.ext)}")'

    def set(self, k, v):
        self.props.append((k, v))

    def text(self):
        out = [f'[gd_resource type="{self.type}" load_steps={len(self.ext) + 1} format=3]', '']
        for i, (k, p) in enumerate(self.ext):
            out.append(f'[ext_resource type="{k}" path="{p}" id="{i + 1}"]')
        if self.ext:
            out.append('')
        out.append('[resource]')
        for k, v in self.props:
            out.append(f'{k} = {v}')
        return '\n'.join(out) + '\n'


def color(hexs, a=1.0):
    h = int(hexs, 16)
    return f'Color({((h >> 16) & 255) / 255:.6f}, {((h >> 8) & 255) / 255:.6f}, {(h & 255) / 255:.6f}, {a:.6f})'


def vec2(v):
    return f'Vector2({float(v[0]):.6f}, {float(v[1]):.6f})'


def vec4(v):
    return f'Vector4({", ".join(f"{float(x):.6f}" for x in v)})'


def material_resource(key, rec, tex_paths, gen_paths):
    textured = any(rec.get(s) for s in ('map', 'normal_map', 'ao_map')) or rec.get('weathering')
    if rec.get('type') == 'MeshBasicMaterial' or not textured:
        t = Tres('StandardMaterial3D')
        t.set('resource_name', f'"{key}"')
        if rec.get('type') == 'MeshBasicMaterial':
            t.set('shading_mode', '0')
            t.set('albedo_color', color(rec['color']))
        else:
            t.set('albedo_color', color(rec['color'], rec.get('opacity', 1.0)))
            t.set('roughness', f"{rec.get('roughness', 1.0):.4f}")
            t.set('metallic', f"{rec.get('metalness', 0.0):.4f}")
            t.set('metallic_specular', '0.5')
            if rec.get('emissive') and rec['emissive'] != '000000' and rec.get('emissive_intensity', 0) > 0:
                t.set('emission_enabled', 'true')
                t.set('emission', color(rec['emissive']))
                t.set('emission_energy_multiplier', f"{rec['emissive_intensity']:.4f}")
            if rec.get('transparent'):
                t.set('transparency', '1')
            if rec.get('side') == 2:
                t.set('cull_mode', '2')
            if rec.get('vertex_colors'):
                t.set('vertex_color_use_as_albedo', 'true')
        return t, 'StandardMaterial3D'
    variant = 'abbey_pbr'
    if rec.get('transparent'):
        variant = 'abbey_pbr_alpha_depth' if rec.get('depth_write') else 'abbey_pbr_alpha'
    elif rec.get('side') == 2:
        variant = 'abbey_pbr_double'
    t = Tres('ShaderMaterial')
    t.set('resource_name', f'"{key}"')
    t.set('render_priority', '0')
    t.set('shader', t.ext_res('Shader', f'res://shaders/{variant}.gdshader'))
    t.set('shader_parameter/albedo_color', color(rec['color']))
    m = rec.get('map')
    tx = m or rec.get('normal_map') or rec.get('ao_map') or {'repeat': [1, 1], 'offset': [0, 0], 'rotation': 0}
    t.set('shader_parameter/uv_repeat', vec2(tx['repeat']))
    t.set('shader_parameter/uv_offset', vec2(tx['offset']))
    t.set('shader_parameter/uv_rotation', f"{tx['rotation']:.6f}")

    def tex_for(slot):
        info = rec.get(slot)
        if not info:
            return None
        if info['source'] == 'canvas':
            return gen_paths.get(info.get('file'))
        return tex_paths.get(info['source'])

    a = tex_for('map')
    t.set('shader_parameter/has_albedo_tex', 'true' if a else 'false')
    if a:
        t.set('shader_parameter/albedo_tex', t.ext_res('Texture2D', a))
    n = tex_for('normal_map')
    t.set('shader_parameter/has_normal_tex', 'true' if n else 'false')
    if n:
        t.set('shader_parameter/normal_tex', t.ext_res('Texture2D', n))
        t.set('shader_parameter/normal_strength', f"{(rec.get('normal_scale') or [1, 1])[0]:.4f}")
    o = tex_for('ao_map') or (tex_for('roughness_map') if rec.get('roughness_map') else None)
    t.set('shader_parameter/has_arm_tex', 'true' if o else 'false')
    if o:
        t.set('shader_parameter/arm_tex', t.ext_res('Texture2D', o))
        t.set('shader_parameter/ao_strength', f"{rec.get('ao_intensity', 1.0) if rec.get('ao_map') else 0.0:.4f}")
    t.set('shader_parameter/roughness_value', f"{rec.get('roughness', 1.0):.4f}")
    t.set('shader_parameter/rough_from_arm', 'true' if rec.get('roughness_map') else 'false')
    t.set('shader_parameter/metallic_value', f"{rec.get('metalness', 0.0):.4f}")
    t.set('shader_parameter/opacity', f"{rec.get('opacity', 1.0):.4f}")
    t.set('shader_parameter/env_intensity', f"{rec.get('env', 1.0):.4f}")
    if rec.get('emissive') and rec['emissive'] != '000000':
        t.set('shader_parameter/emission_color', color(rec['emissive']))
        t.set('shader_parameter/emission_energy', f"{rec.get('emissive_intensity', 0.0):.4f}")
        t.set('shader_parameter/emission_from_albedo_tex', 'true' if rec.get('emissive_map') else 'false')
    w = rec.get('weathering')
    t.set('shader_parameter/weathering', 'true' if w else 'false')
    if w:
        t.set('shader_parameter/wz_a', vec4(w['macro_streak_damp_soot']))
        t.set('shader_parameter/wz_b', vec4(w['lichen_drift_rough_wet']))
        t.set('shader_parameter/wz_c', vec4(w['tile_overlayAmount_overlayScale_cavity']))
        t.set('shader_parameter/tint_a', color(w['tint_a']))
        t.set('shader_parameter/tint_b', color(w['tint_b']))
        t.set('shader_parameter/saturation', f"{w['saturation']:.4f}")
        t.set('shader_parameter/snow_k', f"{w['snow_k']:.4f}")
        t.set('shader_parameter/min_up', f"{w['min_up']:.4f}")
        if w.get('overlay_map'):
            ov = tex_paths.get(w['overlay_map']['source'])
            if ov:
                t.set('shader_parameter/use_overlay', 'true')
                t.set('shader_parameter/overlay_tex', t.ext_res('Texture2D', ov))
    return t, variant


def crop_field(rec, kind, x0, x1, z0, z1):
    data = (EXP / rec['file']).read_bytes()
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


def main():
    rep = json.loads((EXP / 'slice_export.report.json').read_text())
    r = rep['result']
    for d in ('cells', 'collision', 'dynamic', 'props', 'generated', 'materials', 'fields'):
        (OUT / d).mkdir(parents=True, exist_ok=True)
    TEX.mkdir(parents=True, exist_ok=True)
    derivs = []
    # geometry: copied unchanged (Godot imports these GLBs directly)
    for rel in sorted(r['files']):
        if not rel.endswith('.glb'):
            continue
        src = EXP / rel
        dst = OUT / rel
        shutil.copyfile(src, dst)
        derivs.append({'output': str(dst.relative_to(ROOT)), 'sha256': sha(dst), 'source': str(src.relative_to(ROOT)), 'recipe': 'slice_export.js section capture (unchanged copy)'})
    # textures: only the sets the exported materials use, plus the snow set
    sources = set()
    for rec in r['materials'].values():
        for slot in ('map', 'normal_map', 'ao_map', 'roughness_map'):
            if rec.get(slot) and rec[slot]['source'].startswith('shared/assets/textures/'):
                sources.add(rec[slot]['source'])
        ov = (rec.get('weathering') or {}).get('overlay_map')
        if ov and ov['source'].startswith('shared/assets/textures/'):
            sources.add(ov['source'])
    for s in ('snow', 'flag', 'church_stone'):
        for suf in ('d', 'n', 'a'):
            sources.add(f'shared/assets/textures/{s}_{suf}.jpg')
    tex_paths = {}
    for s in sorted(sources):
        src = ROOT / s
        dst = TEX / src.name
        shutil.copyfile(src, dst)
        role = 'normal' if src.stem.endswith('_n') else ('albedo' if src.stem.endswith('_d') else 'arm')
        write_texture_import(dst, role)
        tex_paths[s] = res_path(dst)
        derivs.append({'output': str(dst.relative_to(ROOT)), 'sha256': sha(dst), 'source': s, 'source_sha256': sha(src), 'licence': 'CC0 1.0 (Poly Haven, shared/assets/credits.json)', 'role': role, 'recipe': f'copy; Godot import VRAM compressed, mipmaps, {"normal map (RGTC)" if role == "normal" else "sRGB albedo" if role == "albedo" else "linear ARM: R occlusion, G roughness, B metalness"}'})
    gen_paths = {}
    for img in r['images']:
        src = EXP / img['file']
        dst = OUT / img['file']
        shutil.copyfile(src, dst)
        write_texture_import(dst, 'normal' if 'normal' in img['slot'] else 'albedo')
        gen_paths[img['file']] = res_path(dst)
        derivs.append({'output': str(dst.relative_to(ROOT)), 'sha256': sha(dst), 'source': f"canvas texture of material {img['first_key']} ({img['slot']})", 'recipe': 'HTMLCanvasElement.toBlob PNG in the browser (procedural, project-authored)'})
    # materials
    mats = {}
    for key, rec in sorted(r['materials'].items()):
        if rec.get('missing'):
            continue
        t, variant = material_resource(key, rec, tex_paths, gen_paths)
        f = OUT / 'materials' / (key.replace('.', '_') + '.tres')
        f.write_text(t.text())
        mats[key] = {'resource': res_path(f), 'variant': variant, 'snow': bool((rec.get('weathering') or {}).get('snow_k')), 'weathering': bool(rec.get('weathering'))}
    # fields, cropped to the slice
    F = r['fields']
    th = F['terrain_height']
    shutil.copyfile(EXP / th['file'], OUT / 'fields/terrain_height.bin')
    shutil.copyfile(EXP / th['base_file'], OUT / 'fields/terrain_base.bin')
    fields = {'terrain_height': {**{k: th[k] for k in ('x0', 'z0', 'step', 'nx', 'nz', 'sunk_below_base_m')}, 'file': 'res://assets/world/fields/terrain_height.bin', 'base_file': 'res://assets/world/fields/terrain_base.bin', 'format': 'float32 LE, row-major (z rows)', 'rule': th['source']}}
    bx = (th['x0'], th['x0'] + th['step'] * (th['nx'] - 1), th['z0'], th['z0'] + th['step'] * (th['nz'] - 1))
    g, gm = crop_field(F['ground'], 'half', *bx)
    (OUT / 'fields/ground_rf.bin').write_bytes(g)
    fields['ground'] = {**gm, 'file': 'res://assets/world/fields/ground_rf.bin', 'format': 'float32 LE (Image.FORMAT_RF)', 'source': F['ground']['note']}
    t_, tm = crop_field(F['trodden'], 'u8', *bx)
    (OUT / 'fields/trodden_l8.bin').write_bytes(t_)
    fields['trodden'] = {**tm, 'file': 'res://assets/world/fields/trodden_l8.bin', 'format': 'uint8 (Image.FORMAT_L8)', 'source': F['trodden']['note']}
    for f in ('terrain_height.bin', 'terrain_base.bin', 'ground_rf.bin', 'trodden_l8.bin'):
        derivs.append({'output': str((OUT / 'fields' / f).relative_to(ROOT)), 'sha256': sha(OUT / 'fields' / f), 'source': 'slice_export.js fields', 'recipe': 'cropped to the slice; half → float32 for ground'})
    world = {
        'schema_version': 1,
        'generator': 'scripts/migration/build_slice_assets.py',
        'export_report': {'path': 'shared/data/export/slice_export.report.json', 'sha256': sha(EXP / 'slice_export.report.json'), 'kit_js_sha256': rep['kit_js_sha256'], 'served_adapter_sha256': rep['served_adapter_sha256']},
        'coordinate_convention': r['coordinate_convention'],
        'snow_cover': r['snow_cover'],
        'cells': [{k: c[k] for k in ('id', 'census', 'bounds', 'meshes', 'collision', 'rule')} for c in r['cells']],
        'materials': mats,
        'fields': fields,
        'trees': [{k: t[k] for k in ('mesh', 'source', 'instances', 'triangles')} for t in r['trees']],
        'emitters': r['emitters'],
        'sound_emitters': r['sound_emitters'],
        'excluded_parts': r['excluded'],
        'derivatives': derivs,
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(world, indent=1) + '\n')
    print('cells', [c['id'] for c in r['cells']], 'materials', len(mats), 'textures', len(tex_paths), 'generated', len(gen_paths), 'derivatives', len(derivs))


if __name__ == '__main__':
    main()
