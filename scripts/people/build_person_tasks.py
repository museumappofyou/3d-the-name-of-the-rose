"""Bake the task IK against each authored person's own bone lengths.

Blender -b --python scripts/people/build_person_tasks.py -- [--only id,id]
Reads the uncompressed individual GLBs from .local/mh/out. The packer
combines their skeleton-only task clips; body meshes/textures stay shared.
"""
import bpy, os, sys, json, ast
from mathutils import Matrix
HERE=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.abspath(HERE+'/../..');sys.path.insert(0,HERE)
import tasks
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
only=set(args[args.index('--only')+1].split(',')) if '--only' in args else set()
OUT=ROOT+'/.local/mh/out';CAST=json.load(open(HERE+'/cast.json'))
KEEP={'lay':{'stirPot','stirVat','knead','hammer','fork','sweep','standSleeves','kneelPray'},
      'monk':{'write','read','dine','sitBench','kneelPray','kneelBow','standSleeves','standBow','tend'}}
C=Matrix(((1,0,0,0),(0,0,-1,0),(0,1,0,0),(0,0,0,1)));Ci=C.inverted()
metadata={}
path=OUT+'/person_tasks.json'
if os.path.exists(path):metadata=json.load(open(path))
for p in CAST['people']:
    pid=p['id']
    if only and pid not in only:continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=OUT+'/'+pid+'.glb',bone_heuristic='BLENDER')
    rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
    body=next(o for o in bpy.data.objects if o.type=='MESH' and o.name.endswith('.skin'))
    boots=next(o for o in bpy.data.objects if o.type=='MESH' and o.name.endswith('.boots'))
    # Winter boots extend below the anatomical sole; a small heel allowance
    # also accounts for the relaxed, slightly raised toes of a work stance.
    rig['sole_clearance']=max(0,-min((boots.matrix_world @ v.co).z for v in boots.data.vertices))+0.012
    acts=tasks.author(rig,24,body)
    # only the work this dress is scheduled for: lay men do not write or
    # sing the office, brothers do not shoe horses or stir the blood vat;
    # any other clip falls back to the shared, proportion-scaled motion
    keep=KEEP.get(p.get('dress'))
    if keep:
        drop=[a for a in acts if a.name not in keep]
        acts=[a for a in acts if a.name in keep]
        for a in drop: bpy.data.actions.remove(a)
    info={'pelvis':tasks.Poser(rig).hip_h,'soleClearance':rig['sole_clearance'],'props':{},'clips':[a.name for a in acts]}
    for clip,pr in ast.literal_eval(rig.get('props','{}')).items():
        if keep and clip not in keep:continue
        info['props'][clip]={k:(v if k.startswith('_') else {'bone':v['bone'],'world':[list(r) for r in Ci @ Matrix(v['world'])]}) for k,v in pr.items()}
    rig.animation_data.action=None
    for a in acts:
        a.name=pid+':'+a.name
        tr=rig.animation_data.nla_tracks.new();tr.name=a.name;tr.strips.new(a.name,1,a);tr.mute=False
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=OUT+'/'+pid+'.tasks.glb',export_format='GLB',use_selection=True,export_yup=True,
        export_skins=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,
        export_frame_step=1,export_def_bones=False,export_anim_single_armature=True,export_optimize_animation_size=True,
        export_materials='NONE',export_morph=False,export_reset_pose_bones=True)
    metadata[pid]=info
    json.dump(metadata,open(path,'w'),indent=1)
    print('PERSON_TASKS',pid,len(acts),flush=True)
