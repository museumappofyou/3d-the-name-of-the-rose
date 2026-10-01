"""Convert Lyndon Daniels' CC0 horse into a measured stable inhabitant.

Blender 4.5: -b .local/animals/src/riggedHorse.blend --python this.py --
    --textures .local/animals/work/tex_out --out .local/animals/work/horse.glb
The old control rig is replaced: it left mane, tail and eyes unweighted.
Photo textures are prepared by horse_textures.py. No locomotion is claimed.
"""
import bpy, math, os, sys, json
from mathutils import Matrix, Vector, Quaternion

args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
def arg(k,default):return args[args.index(k)+1] if k in args else default
root=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
tex=os.path.abspath(arg('--textures',root+'/.local/animals/work/tex_out'))
out=os.path.abspath(arg('--out',root+'/.local/animals/work/horse.glb'))
keep=['Plane','BezierCurve','BezierCurve.005','Sphere','Sphere.002']
meshes=[bpy.data.objects[n] for n in keep]
for o in meshes:
    mw=o.matrix_world.copy();o.parent=None;o.matrix_world=mw
    for m in list(o.modifiers):o.modifiers.remove(m)
for o in list(bpy.data.objects):
    if o not in meshes:bpy.data.objects.remove(o,do_unlink=True)
scale=1.50/8.29
for o in meshes:
    o.data.transform(Matrix.Translation((0,0,5.0083*scale)) @ Matrix.Scale(scale,4) @ o.matrix_world)
    o.matrix_world=Matrix.Identity(4)
    for p in o.data.polygons:p.use_smooth=True
    for vg in list(o.vertex_groups):o.vertex_groups.remove(vg)

def material(name,filename,normal=None,alpha=False):
    m=bpy.data.materials.new(name);m.use_nodes=True
    n=m.node_tree.nodes;p=n.get('Principled BSDF');p.inputs['Roughness'].default_value=.82
    im=bpy.data.images.load(os.path.join(tex,filename),check_existing=True)
    t=n.new('ShaderNodeTexImage');t.image=im;m.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color'])
    if normal:
        t2=n.new('ShaderNodeTexImage');t2.image=bpy.data.images.load(os.path.join(tex,normal),check_existing=True);t2.image.colorspace_settings.name='Non-Color'
        nm=n.new('ShaderNodeNormalMap');nm.inputs['Strength'].default_value=.7
        m.node_tree.links.new(t2.outputs['Color'],nm.inputs['Color']);m.node_tree.links.new(nm.outputs['Normal'],p.inputs['Normal'])
    if alpha:
        m.node_tree.links.new(t.outputs['Alpha'],p.inputs['Alpha']);m.diffuse_color=(1,1,1,1)
        m.surface_render_method='DITHERED';m.alpha_threshold=.4;m.use_backface_culling=False
    return m
coat=material('horse.coat','horse_coat.jpg','horse_normal.jpg')
hair=material('horse.hair','horse_hair.png',alpha=True)
eye_source=root+'/.local/animals/src/horse_zip/horse/eye_texture.png'
eye_image=bpy.data.images.load(eye_source,check_existing=True);eye_image.scale(128,128);eye_image.filepath_raw=tex+'/horse_eye.png';eye_image.file_format='PNG';eye_image.save()
eye=material('horse.eye','horse_eye.png');eye.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.27
for o in meshes:o.data.materials.clear();o.data.materials.append(coat if o.name=='Plane' else hair if o.name.startswith('Bezier') else eye)

ad=bpy.data.armatures.new('stableHorse');rig=bpy.data.objects.new('stableHorse',ad);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(n,h,t,parent=None):
    b=ad.edit_bones.new(n);b.head=h;b.tail=t
    if parent:b.parent=ad.edit_bones[parent]
    return b
bone('Root',(0,0,0),(0,0,.2))
bone('Body',(0,0,1.1),(0,-.36,1.35),'Root')
bone('Neck',(0,-.38,1.32),(0,-.85,1.48),'Body')
bone('Head',(0,-.86,1.49),(0,-1.40,1.28),'Neck')
bone('Jaw',(0,-1.15,1.29),(0,-1.43,1.16),'Head')
for s in (-1,1):
    suffix='L' if s>0 else 'R'
    bone('Ear'+suffix,(s*.09,-1.22,1.60),(s*.169,-1.329,1.735),'Head')
    bone('Front'+suffix,(s*.235,-.58,1.04),(s*.232,-.435,.57),'Root')
    bone('FrontShin'+suffix,(s*.232,-.435,.57),(s*.245,-.325,.19),'Front'+suffix)
    bone('FrontHoof'+suffix,(s*.245,-.325,.19),(s*.245,-.37,.035),'FrontShin'+suffix)
    bone('Hind'+suffix,(s*.2,.55,1.16),(s*.17,.38,.79),'Root')
    bone('Hock'+suffix,(s*.17,.38,.79),(s*.17,.59,.51),'Hind'+suffix)
    bone('HindShin'+suffix,(s*.17,.59,.51),(s*.18,.49,.19),'Hock'+suffix)
    bone('HindHoof'+suffix,(s*.18,.49,.19),(s*.18,.4,.035),'HindShin'+suffix)
bone('Tail',(0,.8,1.31),(0,.94,.83),'Body')
bone('TailTip',(0,.94,.83),(0,1.03,.22),'Tail')
bpy.ops.object.mode_set(mode='OBJECT')
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
def weights(p,name):
    x,y,z=p;suffix='L' if x>0 else 'R'
    if name.startswith('Sphere'):return {'Head':1}
    if name=='BezierCurve.005':
        q=smooth(.65,.90,z);return {'Tail':q,'TailTip':1-q}
    neck=smooth(-.35,-.78,y);head=smooth(-.83,-1.08,y)
    neck*=smooth(.72,1.12,z);head*=smooth(.91,1.13,z)
    w={'Body':1-neck,'Neck':max(0,neck-head),'Head':head}
    if name=='Plane' and y<-.99 and z>1.58 and abs(x)>.065:
        ear=smooth(1.58,1.67,z);w={n:v*(1-ear) for n,v in w.items()};w['Ear'+suffix]=ear
    if name=='Plane' and y<-1.24:
        jaw=(1-smooth(1.13,1.26,z))*.7;w={n:v*(1-jaw) for n,v in w.items()};w['Jaw']=jaw
    if name=='Plane' and z<1.1 and abs(x)>.075 and y>-.78:
        leg=(1-smooth(.70,1.1,z))*smooth(.075,.14,abs(x))
        front=y<.05
        if front:
            upper=smooth(.48,.65,z);lower=smooth(.13,.24,z)
            lw={'Front'+suffix:upper,'FrontShin'+suffix:(1-upper)*lower,'FrontHoof'+suffix:(1-upper)*(1-lower)}
        else:
            upper=smooth(.69,.86,z);hock=smooth(.42,.57,z);low=smooth(.13,.25,z)
            lw={'Hind'+suffix:upper,'Hock'+suffix:(1-upper)*hock,'HindShin'+suffix:(1-upper)*(1-hock)*low,'HindHoof'+suffix:(1-upper)*(1-hock)*(1-low)}
        w={n:v*(1-leg) for n,v in w.items()}
        for n,v in lw.items():w[n]=v*leg
    w={n:v for n,v in w.items() if v>.001};den=sum(w.values())
    return {n:v/den for n,v in sorted(w.items(),key=lambda nv:-nv[1])[:4]}
for o in meshes:
    groups={b.name:o.vertex_groups.new(name=b.name) for b in ad.bones}
    for v in o.data.vertices:
        w=weights(v.co,o.name);den=sum(w.values())
        for n,vv in w.items():groups[n].add([v.index],vv/den,'REPLACE')
    m=o.modifiers.new('Stable movement','ARMATURE');m.object=rig;o.parent=rig

rig.animation_data_create()
for a in list(bpy.data.actions):bpy.data.actions.remove(a)
fps=12;sc=bpy.context.scene;sc.render.fps=fps
def rotation(pb,axis,angle):
    local=pb.bone.matrix_local.to_3x3().inverted() @ Vector(axis)
    pb.rotation_quaternion=Quaternion(local,angle)
def animate(name,duration,low=0,variant=0):
    action=bpy.data.actions.new(name);rig.animation_data.action=action
    for f in range(round(duration*fps)+1):
        t=f/fps;u=t/duration*math.tau
        for pb in rig.pose.bones:pb.rotation_mode='QUATERNION';pb.rotation_quaternion=Quaternion();pb.scale=(1,1,1)
        # Hooves/leg bones remain in their rest placement. Breathing expands
        # the barrel; small head/ear/tail movements never drag the feet.
        rig.pose.bones['Body'].scale=(1+.005*math.sin(u*3),1,1+.002*math.sin(u*3))
        rotation(rig.pose.bones['Neck'],(1,0,0),low+.015*math.sin(u))
        rotation(rig.pose.bones['Head'],(1,0,0),.01*math.sin(u*2)+low*.22)
        rotation(rig.pose.bones['Head'],(0,0,1),.018*math.sin(u+variant)) if not low else None
        # Add head pitch after yaw, preserving both.
        if not low:rig.pose.bones['Head'].rotation_quaternion @= Quaternion(rig.pose.bones['Head'].bone.matrix_local.to_3x3().inverted() @ Vector((1,0,0)),.01*math.sin(u*2))
        rotation(rig.pose.bones['Jaw'],(1,0,0),.007*(1-math.cos(u*18)) if low else .002*(1-math.cos(u*4)))
        for k in ('L','R'):rotation(rig.pose.bones['Ear'+k],(0,1,0),(.06 if k=='L' else -.04)*math.sin(u*2+variant))
        rotation(rig.pose.bones['Tail'],(0,1,0),.028*math.sin(u));rotation(rig.pose.bones['TailTip'],(0,1,0),.035*math.sin(u-.5))
        for pb in rig.pose.bones:
            pb.keyframe_insert('rotation_quaternion',frame=f+1)
            if pb.name=='Body':pb.keyframe_insert('scale',frame=f+1)
    track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action)
    rig.animation_data.action=None
animate('Idle',12)
animate('Idle_2',16,variant=1.1)
# The nose descends to the actual trough's hay (0.8 m above the stall floor).
animate('Eating',14,low=.33)
animate('Idle_Headlow',18,low=.27)
for tr in rig.animation_data.nla_tracks:tr.mute=False
rig.animation_data.action=None
for pb in rig.pose.bones:pb.rotation_quaternion=Quaternion();pb.scale=(1,1,1)
sc.frame_set(1)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for o in meshes:o.select_set(True)
os.makedirs(os.path.dirname(out),exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out,export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_apply=False,export_yup=True,export_extras=True,export_reset_pose_bones=True,export_force_sampling=True)
report={'source':'Lyndon Daniels, CC0 Realtime Rancher horse (ChadM blend derivative)',
        'withers_m':max(v.co.z for v in meshes[0].data.vertices if -.52<v.co.y<-.25 and abs(v.co.x)<.15),
        'ground_m':min(v.co.z for v in meshes[0].data.vertices),
        'triangles':{o.name:sum(len(p.vertices)-2 for p in o.data.polygons) for o in meshes},
        'bones':len(ad.bones),'clips':['Idle','Idle_2','Eating','Idle_Headlow'],'fps':fps,
        'textures':{'coat':[1024,1024],'normal':[1024,1024],'hair':[1024,1024],'eyes':[128,128]}}
report['total_triangles']=sum(report['triangles'].values())
open(os.path.splitext(out)[0]+'.json','w').write(json.dumps(report,indent=2)+'\n')
bpy.ops.wm.save_as_mainfile(filepath=os.path.splitext(out)[0]+'.blend')
print('HORSE_REPORT',json.dumps(report))
